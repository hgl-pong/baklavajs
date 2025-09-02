import { computed, reactive, Ref, ref } from "vue";
import { AbstractNode, Graph } from "@baklavajs/core";
import { ICommand, ICommandHandler } from "./commands";

export const CANVAS_SEARCH_COMMAND = "CANVAS_SEARCH";
export const CANVAS_SEARCH_NEXT_COMMAND = "CANVAS_SEARCH_NEXT";
export const CANVAS_SEARCH_PREVIOUS_COMMAND = "CANVAS_SEARCH_PREVIOUS";
export const CANVAS_SEARCH_CLOSE_COMMAND = "CANVAS_SEARCH_CLOSE";

export type CanvasSearchCommand = ICommand<void>;
export type CanvasSearchNextCommand = ICommand<void>;
export type CanvasSearchPreviousCommand = ICommand<void>;
export type CanvasSearchCloseCommand = ICommand<void>;

export interface ICanvasSearch {
    isVisible: boolean;
    searchQuery: string;
    searchResults: any[];
    currentResultIndex: number;
    hasResults: boolean;
    currentResult: any | null;
    updateSearchQuery: (query: string) => void;
    openSearch: () => void;
    closeSearch: () => void;
    nextResult: () => void;
    previousResult: () => void;
}

export interface SearchResult {
    node: AbstractNode;
    matchType: 'title' | 'type' | 'id';
    matchText: string;
}

export function useCanvasSearch(
    displayedGraph: Ref<Graph>,
    commandHandler: ICommandHandler,
): ICanvasSearch {
    const isVisible = ref(false);
    const searchQuery = ref("");
    const searchResults = ref<any[]>([]);
    const currentResultIndex = ref(-1);

    const hasResults = computed(() => searchResults.value.length > 0);
    const currentResult = computed(() => {
        if (currentResultIndex.value >= 0 && currentResultIndex.value < searchResults.value.length) {
            return searchResults.value[currentResultIndex.value];
        }
        return null;
    });

    const performSearch = (query: string) => {
        if (!query.trim()) {
            searchResults.value = [];
            currentResultIndex.value = -1;
            return;
        }

        const lowerQuery = query.toLowerCase();
        const results = [];

        for (const node of displayedGraph.value.nodes) {
            // 搜索节点标题
            if (node.title.toLowerCase().includes(lowerQuery)) {
                results.push(node as AbstractNode);
                continue;
            }

            // 搜索节点类型
            if (node.type.toLowerCase().includes(lowerQuery)) {
                results.push(node as AbstractNode);
                continue;
            }

            // 搜索节点ID
            if (node.id.toLowerCase().includes(lowerQuery)) {
                results.push(node as AbstractNode);
                continue;
            }
        }

        searchResults.value = results;
        currentResultIndex.value = results.length > 0 ? 0 : -1;
        
        // 高亮第一个结果
        if (results.length > 0) {
            highlightResult(results[0]);
        }
    };

    const highlightResult = (node: any) => {
        // 清除之前的选择
        displayedGraph.value.selectedNodes = [];
        // 选中当前结果节点
        displayedGraph.value.selectedNodes.push(node);
        
        // 滚动到节点位置（如果需要的话）
        // 这里可以添加滚动到节点的逻辑
    };

    const openSearch = () => {
        isVisible.value = true;
        searchQuery.value = "";
        searchResults.value = [];
        currentResultIndex.value = -1;
    };

    const closeSearch = () => {
        isVisible.value = false;
        searchQuery.value = "";
        searchResults.value = [];
        currentResultIndex.value = -1;
        // 清除选择
        displayedGraph.value.selectedNodes = [];
    };

    const nextResult = () => {
        if (searchResults.value.length === 0) return;
        
        currentResultIndex.value = (currentResultIndex.value + 1) % searchResults.value.length;
        highlightResult(searchResults.value[currentResultIndex.value]);
    };

    const previousResult = () => {
        if (searchResults.value.length === 0) return;
        
        currentResultIndex.value = currentResultIndex.value <= 0 
            ? searchResults.value.length - 1 
            : currentResultIndex.value - 1;
        highlightResult(searchResults.value[currentResultIndex.value]);
    };

    // 监听搜索查询变化
    const updateSearchQuery = (query: string) => {
        searchQuery.value = query;
        performSearch(query);
    };

    const canvasSearch: ICanvasSearch = reactive({
        isVisible,
        searchQuery,
        searchResults,
        currentResultIndex,
        hasResults,
        currentResult,
        updateSearchQuery,
        openSearch,
        closeSearch,
        nextResult,
        previousResult,
    });

    // 注册命令
    commandHandler.registerCommand(CANVAS_SEARCH_COMMAND, {
        canExecute: () => true,
        execute: () => {
            openSearch();
        },
    });

    commandHandler.registerCommand(CANVAS_SEARCH_NEXT_COMMAND, {
        canExecute: () => hasResults.value,
        execute: () => {
            nextResult();
        },
    });

    commandHandler.registerCommand(CANVAS_SEARCH_PREVIOUS_COMMAND, {
        canExecute: () => hasResults.value,
        execute: () => {
            previousResult();
        },
    });

    commandHandler.registerCommand(CANVAS_SEARCH_CLOSE_COMMAND, {
        canExecute: () => isVisible.value,
        execute: () => {
            closeSearch();
        },
    });

    // 注册快捷键
    commandHandler.registerHotkey(["Control+Shift+f"], CANVAS_SEARCH_COMMAND);
    commandHandler.registerHotkey(["Escape"], CANVAS_SEARCH_CLOSE_COMMAND);
    commandHandler.registerHotkey(["F3"], CANVAS_SEARCH_NEXT_COMMAND);
    commandHandler.registerHotkey(["Shift+F3"], CANVAS_SEARCH_PREVIOUS_COMMAND);

    return canvasSearch;
}