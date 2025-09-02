import { Ref } from "vue";
import { Graph } from "@baklavajs/core";
import type { ICommand, ICommandHandler } from "../commands";

export const SELECT_ALL_NODES_COMMAND = "SELECT_ALL_NODES";
export type SelectAllNodesCommand = ICommand<void>;

export function registerSelectAllNodesCommand(displayedGraph: Ref<Graph>, handler: ICommandHandler) {
    handler.registerCommand(SELECT_ALL_NODES_COMMAND, {
        canExecute: () => displayedGraph.value.nodes.length > 0,
        execute() {
            // Select all nodes in the current graph
            displayedGraph.value.selectedNodes = [...displayedGraph.value.nodes];
        },
    });
    handler.registerHotkey(["Control", "a"], SELECT_ALL_NODES_COMMAND, {
        preventDefault: true,
        stopPropagation: true,
    });
}