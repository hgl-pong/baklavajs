import { reactive, Ref, ref } from "vue";
import Ajv from "ajv";
import { v4 as uuidv4 } from "uuid";
import { AbstractNode, INodeState, IConnectionState, Connection, NodeInterface, Editor, Graph } from "@baklavajs/core";
import {
    CommitTransactionCommand,
    COMMIT_TRANSACTION_COMMAND,
    StartTransactionCommand,
    START_TRANSACTION_COMMAND,
} from "./history";
import { ICommand, ICommandHandler } from "./commands";

export const COPY_COMMAND = "COPY";
export const PASTE_COMMAND = "PASTE";

export type CopyCommand = ICommand<void>;
export type PasteCommand = ICommand<void>;

export interface IClipboard {
    isEmpty: boolean;
}

// Clipboard payload schema (permissive on node/connection shapes for compatibility)
const ajv = new Ajv({ allErrors: true, strict: false });
const clipboardSchema = {
    type: "object",
    required: ["type", "version", "nodes", "connections"],
    additionalProperties: true,
    properties: {
        type: { const: "baklava.clipboard" },
        version: { type: "integer", minimum: 1 },
        nodes: {
            type: "array",
            items: {
                type: "object",
                required: ["id", "type"],
                additionalProperties: true,
                properties: {
                    id: { type: "string" },
                    type: { type: "string" },
                    position: {
                        type: "object",
                        required: ["x", "y"],
                        additionalProperties: true,
                        properties: { x: { type: "number" }, y: { type: "number" } },
                    },
                },
            },
        },
        connections: {
            type: "array",
            items: {
                type: "object",
                required: ["from", "to"],
                additionalProperties: true,
                properties: {
                    id: { type: "string" },
                    from: { type: "string" },
                    to: { type: "string" },
                    reroutePoints: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["x", "y"],
                            additionalProperties: false,
                            properties: {
                                id: { type: "string" },
                                x: { type: "number" },
                                y: { type: "number" },
                            },
                        },
                    },
                },
            },
        },
    },
} as const;
const validateClipboard = ajv.compile(clipboardSchema);

export function useClipboard(
    displayedGraph: Ref<Graph>,
    editor: Ref<Editor>,
    commandHandler: ICommandHandler,
): IClipboard {
    const token = Symbol("ClipboardToken");

    // We cannot reliably know system clipboard state; track locally as best-effort
    const isEmpty = ref(true);

    const copy = () => {
        // find all connections from and to the selected nodes
        const interfacesOfSelectedNodes = displayedGraph.value.selectedNodes.flatMap((n) => [
            ...Object.values(n.inputs),
            ...Object.values(n.outputs),
        ]);

        const connections = displayedGraph.value.connections
            .filter(
                (conn) => interfacesOfSelectedNodes.includes(conn.from) || interfacesOfSelectedNodes.includes(conn.to),
            )
            .map((conn) => {
                const base: Partial<IConnectionState> = { from: conn.from.id, to: conn.to.id };
                const rps = (conn as any).getReroutePoints?.() ?? (conn as any).reroutePoints;
                if (Array.isArray(rps) && rps.length > 0) {
                    base.reroutePoints = rps.map((p: any) => ({ id: p.id, x: p.x, y: p.y }));
                }
                return base as IConnectionState;
            });

        const nodes = displayedGraph.value.selectedNodes.map((n) => n.save());

        const payload = {
            type: "baklava.clipboard",
            version: 1,
            nodes,
            connections,
        };

        // validate but don't block copy if it fails; we still try to write
        try {
            validateClipboard(payload);
        } catch {
            // ignore
        }

        try {
            // write to system clipboard as text
            void navigator.clipboard
                ?.writeText(JSON.stringify(payload))
                .then(() => {
                    isEmpty.value = false;
                })
                .catch(() => {
                    // swallow; user may be in insecure context
                });
        } catch {
            // ignore
        }
    };

    const findInterface = (
        nodes: AbstractNode[],
        id: string,
        io?: "input" | "output",
    ): NodeInterface<any> | undefined => {
        for (const n of nodes) {
            let intf: NodeInterface<any> | undefined;
            if (!io || io === "input") {
                intf = Object.values(n.inputs).find((intf) => intf.id === id);
            }
            if (!intf && (!io || io === "output")) {
                intf = Object.values(n.outputs).find((intf) => intf.id === id);
            }
            if (intf) {
                return intf;
            }
        }
        return undefined;
    };

    const paste = async () => {
        let text = "";
        try {
            text = await navigator.clipboard?.readText();
        } catch {
            // Cannot read clipboard (permissions or context). Abort.
            return;
        }
        if (!text) {
            return;
        }

        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            return; // not JSON we understand
        }

        if (!validateClipboard(data)) {
            return; // invalid structure
        }

        const parsedNodeBuffer = data.nodes as INodeState<any, any>[];
        const parsedConnectionBuffer = data.connections as IConnectionState[];

        const idmap = new Map<string, string>();
        const newNodes: AbstractNode[] = [];
        const newConnections: Connection[] = [];
        const graph = displayedGraph.value;

        commandHandler.executeCommand<StartTransactionCommand>(START_TRANSACTION_COMMAND);

        for (const oldNode of parsedNodeBuffer) {
            const nodeType = editor.value.nodeTypes.get(oldNode.type);
            if (!nodeType) {
                console.warn(`Node type ${oldNode.type} not registered`);
                commandHandler.executeCommand<CommitTransactionCommand>(COMMIT_TRANSACTION_COMMAND);
                return;
            }
            const copiedNode = new nodeType.type();
            const generatedId = copiedNode.id;
            newNodes.push(copiedNode);

            copiedNode.hooks.beforeLoad.subscribe(token, (nodeState) => {
                const ns = nodeState as any;
                if (ns.position) {
                    ns.position.x += 100;
                    ns.position.y += 100;
                }
                copiedNode.hooks.beforeLoad.unsubscribe(token);
                return ns;
            });

            graph.addNode(copiedNode);
            copiedNode.load({ ...oldNode, id: generatedId });
            copiedNode.id = generatedId;
            idmap.set(oldNode.id, generatedId);

            for (const intf of Object.values(copiedNode.inputs)) {
                const newIntfId = uuidv4();
                idmap.set(intf.id, newIntfId);
                intf.id = newIntfId;
            }
            for (const intf of Object.values(copiedNode.outputs)) {
                const newIntfId = uuidv4();
                idmap.set(intf.id, newIntfId);
                intf.id = newIntfId;
            }
        }

        for (const c of parsedConnectionBuffer) {
            const fromIntf = findInterface(newNodes, idmap.get(c.from)!, "output");
            const toIntf = findInterface(newNodes, idmap.get(c.to)!, "input");
            if (!fromIntf || !toIntf) {
                continue;
            }
            const newConnection = graph.addConnection(fromIntf, toIntf);
            if (newConnection) {
                // restore reroute points if any
                if (Array.isArray((c as any).reroutePoints)) {
                    for (const rp of (c as any).reroutePoints) {
                        newConnection.addReroutePoint(rp.x, rp.y, rp.id);
                    }
                }
                newConnections.push(newConnection);
            }
        }

        // select all new nodes
        displayedGraph.value.selectedNodes = newNodes;

        commandHandler.executeCommand<CommitTransactionCommand>(COMMIT_TRANSACTION_COMMAND);

        isEmpty.value = false;

        return {
            newNodes,
            newConnections,
        };
    };

    commandHandler.registerCommand(COPY_COMMAND, {
        canExecute: () => displayedGraph.value.selectedNodes.length > 0,
        execute: copy,
    });
    commandHandler.registerHotkey(["Control", "c"], COPY_COMMAND);
    commandHandler.registerCommand(PASTE_COMMAND, {
        // We cannot reliably know system clipboard state, allow execution and handle errors inside
        canExecute: () => true,
        execute: paste,
    });
    commandHandler.registerHotkey(["Control", "v"], PASTE_COMMAND);

    return reactive({ isEmpty });
}
