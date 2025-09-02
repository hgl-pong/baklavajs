<template>
    <div class="baklava-node-palette" @contextmenu.stop.prevent="">
        <div class="baklava-node-palette__search">
            <input
                ref="searchInput"
                v-model="searchQuery"
                type="text"
                placeholder="搜索节点..."
                class="baklava-node-palette__search-input"
                @keydown.escape="clearSearch"
                @keydown.enter.prevent="focusFirstResult"
            />
            <button
                v-if="searchQuery"
                @click="clearSearch"
                class="baklava-node-palette__search-clear"
                title="清空搜索"
            >
                ×
            </button>
        </div>
        <section v-for="c in filteredCategories" :key="c.name">
            <h1 v-if="c.name !== 'default'">
                {{ c.name }}
            </h1>
            <PaletteEntry
                v-for="(ni, nt) in c.nodeTypes"
                :key="nt"
                :type="nt"
                :title="ni.title"
                :search-query="searchQuery"
                @pointerdown="onDragStart(nt, ni)"
            />
        </section>
        <div v-if="filteredCategories.length === 0 && searchQuery" class="baklava-node-palette__no-results">
            未找到匹配的节点
        </div>
    </div>
    <transition name="fade">
        <div v-if="draggedNode" class="baklava-dragged-node" :style="draggedNodeStyles">
            <PaletteEntry :type="draggedNode.type" :title="draggedNode.nodeInformation.title" />
        </div>
    </transition>
</template>

<script setup lang="ts">
import { computed, CSSProperties, inject, Ref, ref, reactive, onMounted, onUnmounted, nextTick } from "vue";
import { usePointer } from "@vueuse/core";
import { AbstractNode, INodeTypeInformation } from "@baklavajs/core";
import PaletteEntry from "./PaletteEntry.vue";
import { useViewModel, useTransform, useNodeCategories } from "../utility";

interface IDraggedNode {
    type: string;
    nodeInformation: INodeTypeInformation;
}

const { viewModel } = useViewModel();
const { x: mouseX, y: mouseY } = usePointer();
const { transform } = useTransform();
const categories = useNodeCategories(viewModel);

const searchQuery = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

const filteredCategories = computed(() => {
    if (!searchQuery.value.trim()) {
        return categories.value;
    }

    const query = searchQuery.value.toLowerCase().trim();
    const filtered = [];

    for (const category of categories.value) {
        const filteredNodeTypes: Record<string, INodeTypeInformation> = {};
        
        for (const [nodeType, nodeInfo] of Object.entries(category.nodeTypes)) {
            const titleMatch = nodeInfo.title.toLowerCase().includes(query);
            const typeMatch = nodeType.toLowerCase().includes(query);
            
            if (titleMatch || typeMatch) {
                filteredNodeTypes[nodeType] = nodeInfo;
            }
        }
        
        if (Object.keys(filteredNodeTypes).length > 0) {
            filtered.push({
                name: category.name,
                nodeTypes: filteredNodeTypes
            });
        }
    }

    return filtered;
});

const clearSearch = () => {
    searchQuery.value = "";
    searchInput.value?.focus();
};

const focusFirstResult = () => {
    // 当按下回车键时，可以在这里添加选择第一个搜索结果的逻辑
    // 目前只是简单地保持焦点在搜索框
    searchInput.value?.blur();
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
    // If canvas search is open, do not hijack shortcuts here
    if (viewModel.value.search?.visible) {
        return;
    }
    // Ctrl+F 或 Cmd+F 聚焦搜索框
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        searchInput.value?.focus();
        searchInput.value?.select();
    }
    // 按下 / 键也可以聚焦搜索框（类似GitHub等网站）
    else if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const activeElement = document.activeElement;
        // 只有当焦点不在输入框时才响应
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
            event.preventDefault();
            searchInput.value?.focus();
        }
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleGlobalKeydown);
});

const editorEl = inject<Ref<HTMLElement | null>>("editorEl");

const draggedNode = ref<IDraggedNode | null>(null);

const draggedNodeStyles = computed<CSSProperties>(() => {
    if (!draggedNode.value || !editorEl?.value) {
        return {};
    }
    const { left, top } = editorEl.value.getBoundingClientRect();
    return {
        top: `${mouseY.value - top}px`,
        left: `${mouseX.value - left}px`,
    };
});

const onDragStart = (type: string, nodeInformation: INodeTypeInformation) => {
    draggedNode.value = {
        type,
        nodeInformation,
    };

    const onDragEnd = () => {
        const instance = reactive(new nodeInformation.type()) as AbstractNode;
        viewModel.value.displayedGraph.addNode(instance);

        const rect = editorEl!.value!.getBoundingClientRect();
        const [x, y] = transform(mouseX.value - rect.left, mouseY.value - rect.top);
        instance.position.x = x;
        instance.position.y = y;

        draggedNode.value = null;
        document.removeEventListener("pointerup", onDragEnd);
    };
    document.addEventListener("pointerup", onDragEnd);
};
</script>
