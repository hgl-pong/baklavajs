<template>
    <div class="baklava-node-wrapper" :style="styles">
        <!-- Node Comment -->
        <div v-if="!editingComment && node.comment && node.comment.trim()" class="__comment" @dblclick="startEditingComment">
            {{ node.comment }}
        </div>
        <div v-if="editingComment" class="__comment-edit">
            <input
                ref="commentInputEl"
                v-model="tempComment"
                type="text"
                class="baklava-input"
                placeholder="Enter comment..."
                @blur="doneEditingComment"
                @keydown.enter="doneEditingComment"
                @keydown.escape="cancelEditingComment"
            />
        </div>
        
        <div
            :id="node.id"
            ref="el"
            class="baklava-node"
            :class="classes"
            :data-node-type="node.type"
            @pointerdown="select"
        >
            <div v-if="viewModel.settings.nodes.resizable" class="__resize-handle" @mousedown="startResize" />

        <slot name="title">
            <div class="__title" @pointerdown.self.stop="startDrag" @contextmenu.prevent="openContextMenu">
                <template v-if="!renaming">
                    <div class="__title-label">
                        {{ node.title }}
                    </div>
                    <div class="__menu">
                        <vertical-dots class="--clickable" @click="openContextMenu" />
                        <context-menu
                            v-model="showContextMenu"
                            :items="contextMenuItems"
                            :position="{ x: 0, y: 0 }"
                            @click="onContextMenuClick"
                        />
                    </div>
                </template>
                <template v-else>
                    <input
                        ref="renameInputEl"
                        v-model="tempName"
                        type="text"
                        class="baklava-input"
                        @blur="doneRenaming"
                        @keydown.enter="doneRenaming"
                        @keydown.escape="() => (renaming = false)"
                    />
                </template>
            </div>
        </slot>

        <slot name="content">
            <div class="__content" :class="classesContent">
                <div class="__inputs">
                    <node-interface v-for="ni in displayedInputs" :key="ni.id" :node="node" :intf="ni" />
                </div>
                <div class="__outputs">
                    <node-interface v-for="ni in displayedOutputs" :key="ni.id" :node="node" :intf="ni" />
                </div>
            </div>
        </slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUpdated, onMounted, onBeforeUnmount } from "vue";
import { AbstractNode, GRAPH_NODE_TYPE_PREFIX, IGraphNode } from "@baklavajs/core";
import { useGraph, useViewModel } from "../utility";
// cspell:ignore intf baklavajs

import { ContextMenu } from "../contextmenu";
import VerticalDots from "../icons/VerticalDots.vue";
import NodeInterface from "./NodeInterface.vue";
const props = withDefaults(
    defineProps<{
        node: AbstractNode & { comment?: string };
        selected?: boolean;
        dragging?: boolean;
    }>(),
    { selected: false },
);

const emit = defineEmits<{
    (e: "select"): void;
    (e: "start-drag", ev: PointerEvent): void;
}>();

const { viewModel } = useViewModel();
const { graph, switchGraph } = useGraph();

const el = ref<HTMLElement | null>(null);
const renaming = ref(false);
const tempName = ref("");
const renameInputEl = ref<HTMLInputElement | null>(null);
const editingComment = ref(false);
const tempComment = ref("");
const commentInputEl = ref<HTMLInputElement | null>(null);
const isResizing = ref(false);
let resizeStartWidth = 0;
let resizeStartMouseX = 0;

const showContextMenu = ref(false);
const contextMenuItems = computed(() => {
    const items = [
        { value: "rename", label: "Rename" },
        { value: "editComment", label: "Edit Comment" },
        { value: "delete", label: "Delete" },
    ];

    if (props.node.type.startsWith(GRAPH_NODE_TYPE_PREFIX)) {
        items.push({ value: "editSubgraph", label: "Edit Subgraph" });
    }

    return items;
});

const classes = computed(() => ({
    "--selected": props.selected,
    "--dragging": props.dragging,
    "--two-column": !!(props.node as any).twoColumn,
}));

const classesContent = computed(() => ({
    "--reverse-y": (props.node as any).reverseY ?? viewModel.value.settings.nodes.reverseY,
}));

const styles = computed(() => ({
    top: `${(props.node as any).position?.y ?? 0}px`,
    left: `${(props.node as any).position?.x ?? 0}px`,
    width: `${(props.node as any).width ?? viewModel.value.settings.nodes.defaultWidth}px`,
    "--width": `${(props.node as any).width ?? viewModel.value.settings.nodes.defaultWidth}px`,
    position: "absolute" as const,
}));

const displayedInputs = computed(() => Object.values((props.node as any).inputs).filter((ni: any) => !ni.hidden) as any[]);
const displayedOutputs = computed(() => Object.values((props.node as any).outputs).filter((ni: any) => !ni.hidden) as any[]);

const select = () => {
    emit("select");
};

const startDrag = (ev: PointerEvent) => {
    if (!props.selected) {
        select();
    }

    emit("start-drag", ev);
};

const openContextMenu = () => {
    showContextMenu.value = true;
};

const onContextMenuClick = async (action: string) => {
    switch (action) {
        case "delete":
            graph.value.removeNode(props.node as any);
            break;
        case "rename":
            tempName.value = (props.node as any).title;
            renaming.value = true;
            await nextTick();
            renameInputEl.value?.focus();
            break;
        case "editComment":
            tempComment.value = (props.node as any).comment || "";
            editingComment.value = true;
            await nextTick();
            commentInputEl.value?.focus();
            break;
        case "editSubgraph":
            switchGraph((props.node as AbstractNode & IGraphNode).template);
            break;
    }
};

const doneRenaming = () => {
    (props.node as any).title = tempName.value;
    renaming.value = false;
};

const startEditingComment = async () => {
    tempComment.value = (props.node as any).comment || "";
    editingComment.value = true;
    await nextTick();
    commentInputEl.value?.focus();
};

const doneEditingComment = () => {
    (props.node as any).comment = tempComment.value;
    editingComment.value = false;
};

const cancelEditingComment = () => {
    editingComment.value = false;
};

const onRender = () => {
    if (el.value) {
        viewModel.value.hooks.renderNode.execute({ node: props.node as any, el: el.value });
    }
};

const startResize = (ev: MouseEvent) => {
    isResizing.value = true;
    resizeStartWidth = (props.node as any).width;
    resizeStartMouseX = ev.clientX;
    ev.preventDefault();
};

const doResize = (ev: MouseEvent) => {
    if (!isResizing.value) return;
    const deltaX = ev.clientX - resizeStartMouseX;
    const newWidth = resizeStartWidth + deltaX / graph.value.scaling;
    const minWidth = viewModel.value.settings.nodes.minWidth;
    const maxWidth = viewModel.value.settings.nodes.maxWidth;
    (props.node as any).width = Math.max(minWidth, Math.min(maxWidth, newWidth));
};

const stopResize = () => {
    isResizing.value = false;
};

onMounted(() => {
    onRender();

    window.addEventListener("mousemove", doResize);
    window.addEventListener("mouseup", stopResize);
});
onUpdated(onRender);

onBeforeUnmount(() => {
    window.removeEventListener("mousemove", doResize);
    window.removeEventListener("mouseup", stopResize);
});
</script>

<style scoped>
.baklava-node-wrapper {
    position: absolute;
    display: block;
    overflow: visible;
}

.__comment {
    background: var(--baklava-node-comment-background, rgba(255, 255, 255, 0.9));
    color: var(--baklava-node-comment-foreground, #333);
    padding: 0.4em 0.6em;
    font-size: 0.75em;
    border-radius: 8px;
    word-wrap: break-word;
    white-space: pre-wrap;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: absolute;
    top: -2.5em;
    left: 0;
    width: fit-content;
    min-width: 100px;
    max-width: calc(var(--width) * 1.2);
    box-sizing: border-box;
    z-index: 10;
    pointer-events: auto;
    cursor: pointer;
}

/* Ensure ports are always above the comment bubble for interactions */
:deep(.baklava-node-interface > .__port) {
    position: absolute;
    z-index: 20;
    pointer-events: auto;
}

.__comment-edit {
    padding: 0.4em 0.6em;
    background: var(--baklava-node-comment-background, rgba(255, 255, 255, 0.9));
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: absolute;
    top: -2.5em;
    left: 0;
    width: fit-content;
    min-width: 150px;
    max-width: calc(var(--width) * 1.2);
    box-sizing: border-box;
    z-index: 11;
    pointer-events: auto;
}

.__comment-edit .baklava-input {
    width: 100%;
    background: transparent;
    border: none;
    color: var(--baklava-node-comment-foreground, #333);
    font-size: 0.75em;
    padding: 0;
    outline: none;
}
</style>
