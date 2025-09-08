// TODO: Implementation complete - TypeScript and ESLint validation enabled
import { AbstractNode, Graph, INodeUpdateEventData, CalculationResult, IConnection } from "@baklavajs/core";
import { BaseEngine } from "./baseEngine";

interface ForwardEngineCalculationData {
    __forwardEngineInputs?: Map<string, any>;
}

interface TargetNodeProcessingContext {
    node: AbstractNode;
    connections: IConnection[];
    inputData: Record<string, any>;
}

export class ForwardEngine<CalculationData = any> extends BaseEngine<
    CalculationData,
    [startingNode: AbstractNode, nodeUpdateEvent: INodeUpdateEventData | undefined]
> {
    public override async runGraph(
        graph: Graph,
        inputs: Map<string, any>,
        calculationData: CalculationData,
    ): Promise<CalculationResult> {
        // For ForwardEngine, we need to find the starting nodes (nodes with no inputs or unconnected inputs)
        const startingNodes = graph.nodes.filter(
            (node) => 
                Object.values(node.inputs).every(intf => intf.connectionCount === 0) &&
                node.calculate
        );

        // If no starting nodes found, use the first node that has calculate method
        if (startingNodes.length === 0) {
            const firstCalculableNode = graph.nodes.find(node => node.calculate);
            if (firstCalculableNode) {
                startingNodes.push(firstCalculableNode);
            }
        }

        const result = new Map<string, Map<string, any>>();
        
        // Execute calculation for each starting node with the provided inputs
        for (const node of startingNodes) {
            const nodeResult = await this.execute({
                ...calculationData,
                __forwardEngineInputs: inputs
            } as unknown as CalculationData, node, undefined);
            for (const [nodeId, values] of nodeResult) {
                result.set(nodeId, values);
            }
        }

        return result;
    }

    protected override async execute(
        calculationData: CalculationData,
        startingNode: AbstractNode,
        data?: INodeUpdateEventData,
    ): Promise<CalculationResult> {
        const nodesToCalculate: Array<{ node: AbstractNode; inputData: Record<string, any> }> = [];
        const result = new Map<string, Map<string, any>>();

        if (startingNode.calculate) {
            // Get input data with initial values, using the inputs from calculationData if provided
            let inputsFromData: Map<string, any> | undefined;
            try {
                inputsFromData = (calculationData as unknown as ForwardEngineCalculationData).__forwardEngineInputs;
                if (!(inputsFromData instanceof Map)) {
                    inputsFromData = new Map<string, any>();
                }
            } catch (e) {
                inputsFromData = new Map<string, any>();
            }
            const inputData = this.getDataForNode(startingNode, inputsFromData);
            if (data) {
                inputData[data.name] = data.intf.value;
            }
            nodesToCalculate.push({
                node: startingNode,
                inputData,
            });
        }

        while (nodesToCalculate.length > 0) {
            const { node, inputData } = nodesToCalculate.shift()!;

            const r = await node.calculate!(inputData, {
                engine: this,
                globalValues: calculationData,
            });
            this.validateNodeCalculationOutput(node, r);
            result.set(node.id, new Map(Object.entries(r)));

            const graph = node.graph;
            if (!graph) {
                throw new Error(`Can't run engine on node that is not in graph (nodeId: ${node.id})`);
            }

            const nodeOutputInterfaces = Object.values(node.outputs);
            const outgoingConnections = graph.connections.filter((c) => nodeOutputInterfaces.includes(c.from));

            // Map to accumulate input data for target nodes from multiple connections
            const targetNodeInputs = new Map<string, Record<string, any>>();

            for (const c of outgoingConnections) {
                const nodeId = c.to.nodeId;
                const targetNode = nodeId && graph.findNodeById(nodeId);
                if (!nodeId || !targetNode || !targetNode.calculate) {
                    continue;
                }
                
                const inputEntry = Object.entries(targetNode.inputs).find(([, v]) => v.id === c.to.id);
                const outputEntry = Object.entries(node.outputs).find(([, v]) => v.id === c.from.id);
                if (!inputEntry || !outputEntry) {
                    continue;
                }
                const [inputKey] = inputEntry;
                const [outputKey] = outputEntry;
                
                // Initialize target node data if not present
                if (!targetNodeInputs.has(nodeId)) {
                    targetNodeInputs.set(nodeId, { ...this.getDataForNode(targetNode) });
                }
                
                // Accumulate input data from multiple connections
                const targetInputData = targetNodeInputs.get(nodeId);
                if (targetInputData) {
                    targetInputData[inputKey] = r[outputKey];
                }
            }

            // After processing all connections, push target nodes to calculation queue
            for (const [nodeId, inputData] of targetNodeInputs) {
                const targetNode = graph.findNodeById(nodeId);
                if (targetNode) {
                    nodesToCalculate.push({
                        node: targetNode,
                        inputData,
                    });
                }
            }
        }

        return result;
    }

    protected override onChange(
        recalculateOrder: boolean,
        updatedNode?: AbstractNode,
        data?: INodeUpdateEventData,
    ): void {
        this.recalculateOrder = recalculateOrder || this.recalculateOrder;
        if (updatedNode && data) {
            void this.calculateWithoutData(updatedNode, data);
        }
    }

    /** Get the current value of all input interfaces of the given node */
    private getDataForNode(node: AbstractNode, inputs?: Map<string, any> | null): Record<string, any> {
        const values: Record<string, any> = {};
        Object.entries(node.inputs).forEach(([k, intf]) => {
            // If inputs map is provided and contains this interface's value, use it
            // Otherwise fall back to the interface's current value
            if (inputs && inputs.has && inputs.has(intf.id)) {
                values[k] = inputs.get(intf.id);
            } else {
                values[k] = intf.value;
            }
        });
        return values;
    }

    /**
     * Get input values for the graph - similar to DependencyEngine but for ForwardEngine context
     */
    public getInputValues(graph: Graph): Map<string, any> {
        const inputValues = new Map<string, any>();
        for (const node of graph.nodes) {
            Object.values(node.inputs).forEach((intf) => {
                if (intf.connectionCount === 0) {
                    inputValues.set(intf.id, intf.value);
                }
            });
            if (!node.calculate) {
                Object.values(node.outputs).forEach((intf) => {
                    inputValues.set(intf.id, intf.value);
                });
            }
        }
        return inputValues;
    }
}