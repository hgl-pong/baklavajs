import { reactive, Ref, ref, watch, computed } from "vue";
import type { Graph, AbstractNode } from "@baklavajs/core";
import type { ICommand, ICommandHandler } from "../commands";
import type { IBaklavaViewModel } from "../viewModel";
import { ZOOM_TO_FIT_NODES_COMMAND, type ZoomToFitNodesCommand } from "../zoomToFit";

export const OPEN_CANVAS_SEARCH_COMMAND = "OPEN_CANVAS_SEARCH";
export const CLOSE_CANVAS_SEARCH_COMMAND = "CLOSE_CANVAS_SEARCH";
export const FIND_NEXT_MATCH_COMMAND = "FIND_NEXT_MATCH";
export const FIND_PREV_MATCH_COMMAND = "FIND_PREV_MATCH";

export type OpenCanvasSearchCommand = ICommand<void>;
export type CloseCanvasSearchCommand = ICommand<void>;
export type FindNextMatchCommand = ICommand<void>;
export type FindPrevMatchCommand = ICommand<void>;

export interface ICanvasSearchState {
    visible: boolean;
    query: string;
    total: number;
    index: number; // 0-based index into matches
    open: () => void;
    close: () => void;
    next: () => void;
    prev: () => void;
}

export function registerCanvasSearch(
    displayedGraph: Ref<Graph>,
    handler: ICommandHandler,
    hooks: IBaklavaViewModel["hooks"],
): ICanvasSearchState {
    const visible = ref(false);
    const query = ref("");
    const index = ref(0);
    const previousSelection = ref<AbstractNode[] | null>(null);

    const matches = computed<AbstractNode[]>(() => {
        const q = query.value.trim().toLowerCase();
        if (!q) return [];
        const nodes = displayedGraph.value?.nodes ?? [];
        return nodes.filter((n) => {
            const title = (n.title ?? "").toString().toLowerCase();
            const type = (n.type ?? "").toString().toLowerCase();
            if (title.includes(q) || type.includes(q)) return true;
            // Also search interface names
            const inputs = Object.values(n.inputs ?? {});
            const outputs = Object.values(n.outputs ?? {});
            return (
                inputs.some((i) => (i.name ?? "").toString().toLowerCase().includes(q)) ||
                outputs.some((o) => (o.name ?? "").toString().toLowerCase().includes(q))
            );
        });
    });

    const total = computed(() => matches.value.length);

    // Highlight matches by toggling a CSS class via render hook
    const token = Symbol("CanvasSearchToken");
    const updateNodeHighlight = (node: AbstractNode, el: HTMLElement) => {
        const isMatch = matches.value.includes(node);
        if (isMatch) {
            el.classList.add("--search-match");
        } else {
            el.classList.remove("--search-match");
        }
        const isActive = isMatch && matches.value[index.value] === node && visible.value;
        if (isActive) {
            el.classList.add("--search-active-match");
        } else {
            el.classList.remove("--search-active-match");
        }
    };

    // Subscribe to render hook to keep classes in sync
    hooks.renderNode.subscribe(token, ({ node, el }): { node: AbstractNode; el: HTMLElement } => {
        updateNodeHighlight(node, el);
        return { node, el };
    });

    // When query, matches, index, or visibility changes, update rendered nodes via re-render hint
    watch([matches, index, visible], () => {
        // Force update classes by re-executing hook for currently rendered nodes
        // Update all nodes to both add and remove classes correctly
        const nodes = displayedGraph.value?.nodes ?? [];
        nodes.forEach((n) => {
            const el = document.getElementById(n.id);
            if (el) updateNodeHighlight(n, el as HTMLElement);
        });
    });

    const focusMatch = (idx: number) => {
        if (matches.value.length === 0) return;
        const i = ((idx % matches.value.length) + matches.value.length) % matches.value.length;
        index.value = i;
        const node = matches.value[i];
        handler.executeCommand<ZoomToFitNodesCommand>(ZOOM_TO_FIT_NODES_COMMAND, true, [node]);
        // Also select the node
        const graph = displayedGraph.value;
        graph.selectedNodes = [node];
        // Ensure classes reflect active match
        const el = document.getElementById(node.id);
        if (el) updateNodeHighlight(node, el as HTMLElement);
    };

    const open = () => {
        visible.value = true;
        // snapshot current selection so we can restore on close
        if (previousSelection.value === null) {
            const graph = displayedGraph.value;
            previousSelection.value = [...(graph?.selectedNodes ?? [])];
        }
        // Keep current index within bounds
        if (index.value >= matches.value.length) index.value = 0;
        // Do not auto-zoom on open; wait for Enter/Next
    };

    const close = () => {
        // restore previous selection if available
        const graph = displayedGraph.value;
        if (previousSelection.value) {
            graph.selectedNodes = previousSelection.value as AbstractNode[];
        }
        previousSelection.value = null;

        // reset query and index
        query.value = "";
        index.value = 0;
        visible.value = false;

        // Clear highlights explicitly
        const nodes = displayedGraph.value?.nodes ?? [];
        nodes.forEach((n) => {
            const el = document.getElementById(n.id);
            if (el) {
                el.classList.remove("--search-match");
                el.classList.remove("--search-active-match");
            }
        });
    };

    const next = () => {
        if (matches.value.length === 0) return;
        focusMatch(index.value + 1);
    };

    const prev = () => {
        if (matches.value.length === 0) return;
        focusMatch(index.value - 1);
    };

    handler.registerCommand<OpenCanvasSearchCommand>(OPEN_CANVAS_SEARCH_COMMAND, {
        canExecute: () => true,
        execute: open,
    });
    handler.registerCommand<CloseCanvasSearchCommand>(CLOSE_CANVAS_SEARCH_COMMAND, {
        canExecute: () => visible.value,
        execute: close,
    });
    handler.registerCommand<FindNextMatchCommand>(FIND_NEXT_MATCH_COMMAND, {
        canExecute: () => matches.value.length > 0,
        execute: next,
    });
    handler.registerCommand<FindPrevMatchCommand>(FIND_PREV_MATCH_COMMAND, {
        canExecute: () => matches.value.length > 0,
        execute: prev,
    });

    // Ctrl+F opens search; prevent default and stop propagation to avoid conflicts
    handler.registerHotkey(["Control", "f"], OPEN_CANVAS_SEARCH_COMMAND, {
        preventDefault: true,
        stopPropagation: true,
    });

    return reactive({
        get visible() {
            return visible.value;
        },
        set visible(v: boolean) {
            visible.value = v;
        },
        get query() {
            return query.value;
        },
        set query(v: string) {
            query.value = v;
            // reset index when query changes
            index.value = 0;
        },
        get total() {
            return total.value;
        },
        get index() {
            return index.value;
        },
        set index(v: number) {
            focusMatch(v);
        },
        open,
        close,
        next,
        prev,
    });
}