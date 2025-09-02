<template>
    <div
        ref="el"
        tabindex="-1"
        class="baklava-editor"
        :class="{
            'baklava-ignore-mouse': !!temporaryConnection.temporaryConnection.value || panZoom.dragging.value,
            '--temporary-connection': !!temporaryConnection.temporaryConnection.value,
            '--start-selection-box': selectionBox.startSelection,
        }"
        @pointermove.self="onPointerMove"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @wheel.self="panZoom.onMouseWheel"
        @keydown="keyDown"
        @keyup="keyUp"
        @contextmenu.self="contextMenu.open"
    >
        <slot name="background">
            <Background />
        </slot>

        <slot name="toolbar">
            <Toolbar v-if="viewModel.settings.toolbar.enabled" />
        </slot>

        <slot name="palette">
            <NodePalette v-if="viewModel.settings.palette.enabled" />
        </slot>

        <!-- Render comment nodes behind connections -->
        <div class="node-container" :style="nodeContainerStyle">
            <transition-group name="fade">
                <!-- Comment nodes only -->
                <template v-for="node in commentNodes" :key="node.id + counter.toString()">
                    <slot
                        name="node"
                        :node="node"
                        :selected="selectedNodes.includes(node)"
                        :dragging="isDraggingNode(node)"
                        @select="selectNode(node)"
                        @start-drag="startDrag"
                    >
                        <Node
                            :node="node"
                            :selected="selectedNodes.includes(node)"
                            :dragging="isDraggingNode(node)"
                            @select="selectNode(node)"
                            @start-drag="startDrag"
                        />
                    </slot>
                </template>
            </transition-group>
        </div>

        <svg class="connections-container">
            <g v-for="connection in connections" :key="connection.id + counter.toString()">
                <slot name="connection" :connection="connection">
                    <ConnectionWrapper :connection="connection" />
                </slot>
            </g>
            <slot name="temporaryConnection" :temporary-connection="temporaryConnection.temporaryConnection.value">
                <TemporaryConnection
                    v-if="temporaryConnection.temporaryConnection.value"
                    :connection="temporaryConnection.temporaryConnection.value"
                />
            </slot>
        </svg>

        <!-- Render normal nodes above connections -->
        <div class="node-container" :style="nodeContainerStyle">
            <transition-group name="fade">
                <template v-for="node in normalNodes" :key="node.id + counter.toString()">
                    <slot
                        name="node"
                        :node="node"
                        :selected="selectedNodes.includes(node)"
                        :dragging="isDraggingNode(node)"
                        @select="selectNode(node)"
                        @start-drag="startDrag"
                    >
                        <Node
                            :node="node"
                            :selected="selectedNodes.includes(node)"
                            :dragging="isDraggingNode(node)"
                            @select="selectNode(node)"
                            @start-drag="startDrag"
                        />
                    </slot>
                </template>
            </transition-group>
        </div>

        <slot name="sidebar">
            <Sidebar v-if="viewModel.settings.sidebar.enabled" />
        </slot>

        <slot name="minimap">
            <Minimap v-if="viewModel.settings.enableMinimap" />
        </slot>

        <!-- Canvas Search Bar -->
        <div
            v-if="viewModel.search.visible"
            class="baklava-canvas-search"
            @keydown.escape.stop.prevent="viewModel.commandHandler.executeCommand('CLOSE_CANVAS_SEARCH', true)"
        >
            <input
                ref="searchInputEl"
                v-model="viewModel.search.query"
                type="text"
                placeholder="在画布中搜索...（标题/类型/接口名）"
                class="baklava-input baklava-canvas-search__input"
                @keydown.shift.enter.prevent="viewModel.search.prev()"
                @keydown.enter.prevent="viewModel.search.next()"
            />
            <span class="baklava-canvas-search__count">{{ viewModel.search.total ? viewModel.search.index + 1 : 0 }}/{{ viewModel.search.total }}</span>
            <button class="baklava-canvas-search__btn" title="上一个 (Shift+Enter)" @click="viewModel.search.prev()">↑</button>
            <button class="baklava-canvas-search__btn" title="下一个 (Enter)" @click="viewModel.search.next()">↓</button>
            <button class="baklava-canvas-search__btn --close" title="关闭 (Esc)" @click="viewModel.commandHandler.executeCommand('CLOSE_CANVAS_SEARCH', true)">×</button>
        </div>

        <slot name="contextMenu" :context-menu="contextMenu">
            <ContextMenu
                v-if="viewModel.settings.contextMenu.enabled"
                v-model="contextMenu.show.value"
                :items="contextMenu.items.value"
                :x="contextMenu.x.value"
                :y="contextMenu.y.value"
                @click="contextMenu.onClick"
            />
        </slot>

        <div v-if="selectionBox.isSelecting" class="selection-box" :style="selectionBox.getStyles()" />
    </div>
</template>

<script setup lang="ts">
import { computed, provide, Ref, ref, toRef, onMounted, watch } from "vue";

import { AbstractNode } from "@baklavajs/core";
import { IBaklavaViewModel } from "../viewModel";
import { providePlugin, useDragMove } from "../utility";
import { usePanZoom } from "./panZoom";
import { provideTemporaryConnection } from "./temporaryConnection";
import { useContextMenu } from "./contextMenu";
import { useSelectionBox } from "./selectionBox";

import Background from "./Background.vue";
import Node from "../node/Node.vue";
import ConnectionWrapper from "../connection/ConnectionWrapper.vue";
import TemporaryConnection from "../connection/TemporaryConnection.vue";
import Sidebar from "../sidebar/Sidebar.vue";
import Minimap from "../components/Minimap.vue";
import NodePalette from "../nodepalette/NodePalette.vue";
import Toolbar from "../toolbar/Toolbar.vue";
import ContextMenu from "../contextmenu/ContextMenu.vue";

const props = defineProps<{ viewModel: IBaklavaViewModel }>();

const token = Symbol("EditorToken");

const viewModelRef = toRef(props, "viewModel") as unknown as Ref<IBaklavaViewModel>;
providePlugin(viewModelRef);

const el = ref<HTMLElement | null>(null);
provide("editorEl", el);

const selectedConnectionId = ref<string | null>(null);
const selectConnection = (connectionId: string) => {
    selectedConnectionId.value = connectionId;
};
const unselectConnection = () => {
    selectedConnectionId.value = null;
};
provide("connectionSelection", {
    selectedConnectionId,
    selectConnection,
    unselectConnection,
});

const nodes = computed(() => props.viewModel.displayedGraph.nodes);
const dragMoves = computed(() => props.viewModel.displayedGraph.nodes.map((n) => useDragMove(toRef(n, "position"))));
const connections = computed(() => props.viewModel.displayedGraph.connections);
const selectedNodes = computed(() => props.viewModel.displayedGraph.selectedNodes);

// Split nodes into comment and normal nodes for correct layering
const commentNodes = computed(() => nodes.value.filter((n) => n.type === "CommentNode"));
const normalNodes = computed(() => nodes.value.filter((n) => n.type !== "CommentNode"));

// Helper to get dragging state by node
const isDraggingNode = (node: AbstractNode) => {
    const idx = nodes.value.indexOf(node);
    return dragMoves.value[idx]?.dragging.value;
};

const panZoom = usePanZoom();
const temporaryConnection = provideTemporaryConnection();
const contextMenu = useContextMenu(viewModelRef);
const selectionBox = useSelectionBox(el);

const nodeContainerStyle = computed(() => ({
    ...panZoom.styles.value,
}));

// Reason: https://github.com/newcat/baklavajs/issues/54
const counter = ref(0);
props.viewModel.editor.hooks.load.subscribe(token, (s) => {
    counter.value++;
    return s;
});

const onPointerMove = (ev: PointerEvent) => {
    panZoom.onPointerMove(ev);
    temporaryConnection.onMouseMove(ev);
};

const onPointerDown = (ev: PointerEvent) => {
    if (ev.button === 0) {
        if (selectionBox.onPointerDown(ev)) {
            return;
        }

        if (ev.target === el.value) {
            unselectAllNodes();
            panZoom.onPointerDown(ev);
        }
        temporaryConnection.onMouseDown();
    }
};

const onPointerUp = (ev: PointerEvent) => {
    panZoom.onPointerUp(ev);
    temporaryConnection.onMouseUp();
};

const keyDown = (ev: KeyboardEvent) => {
    if (ev.key === "Tab") {
        ev.preventDefault();
    }
    props.viewModel.commandHandler.handleKeyDown(ev);
};

const keyUp = (ev: KeyboardEvent) => {
    props.viewModel.commandHandler.handleKeyUp(ev);
};

const selectNode = (node: AbstractNode) => {
    if (!["Control", "Shift"].some((k) => props.viewModel.commandHandler.pressedKeys.includes(k))) {
        unselectAllNodes();
    }
    props.viewModel.displayedGraph.selectedNodes.push(node);
};

const unselectAllNodes = () => {
    props.viewModel.displayedGraph.selectedNodes = [];
};

const startDrag = (ev: PointerEvent) => {
    for (const selectedNode of props.viewModel.displayedGraph.selectedNodes) {
        const idx = nodes.value.indexOf(selectedNode);
        const dragMove = dragMoves.value[idx];
        dragMove.onPointerDown(ev);

        document.addEventListener("pointermove", dragMove.onPointerMove);
    }

    document.addEventListener("pointerup", stopDrag);
};

const stopDrag = () => {
    for (const selectedNode of props.viewModel.displayedGraph.selectedNodes) {
        const idx = nodes.value.indexOf(selectedNode);
        const dragMove = dragMoves.value[idx];
        dragMove.onPointerUp();

        document.removeEventListener("pointermove", dragMove.onPointerMove);
    }

    document.removeEventListener("pointerup", stopDrag);
};

const searchInputEl = ref<HTMLInputElement | null>(null);

onMounted(() => {
    // autofocus when opening search
    watch(
        () => viewModelRef.value.search.visible,
        (v) => {
            if (v) {
                // next tick like
                setTimeout(() => searchInputEl.value?.focus(), 0);
            }
        },
        { immediate: false },
    );
});
</script>

<style scoped>
.baklava-canvas-search {
    position: absolute;
    top: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--baklava-toolbar-background, rgba(27,32,44,0.85));
    color: var(--baklava-toolbar-foreground, #fff);
    border-radius: var(--baklava-control-border-radius, 6px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    border: 1px solid color-mix(in srgb, var(--baklava-toolbar-foreground, #fff) 10%, transparent);
    z-index: 1000;
}
.baklava-canvas-search__input {
    width: 220px;
    padding: 6px 8px;
    background: var(--baklava-control-color-background, #2c2c2c);
    color: var(--baklava-control-color-foreground, #fff);
    border: 1px solid color-mix(in srgb, var(--baklava-control-color-foreground, #fff) 12%, transparent);
    border-radius: var(--baklava-control-border-radius, 4px);
    outline: none;
}
.baklava-canvas-search__input:focus {
    border-color: var(--baklava-control-color-primary, #5379b5);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--baklava-control-color-primary, #5379b5) 25%, transparent);
}
.baklava-canvas-search__btn {
    border: 1px solid color-mix(in srgb, var(--baklava-control-color-foreground, #fff) 12%, transparent);
    background: var(--baklava-control-color-background, #2c2c2c);
    color: var(--baklava-control-color-foreground, #fff);
    padding: 4px 6px;
    border-radius: var(--baklava-control-border-radius, 4px);
    cursor: pointer;
}
.baklava-canvas-search__btn:hover { background: var(--baklava-control-color-hover, #4c4c4c); }
.baklava-canvas-search__btn.--close { background: color-mix(in srgb, var(--baklava-control-color-error, #d00000) 25%, transparent); border-color: transparent; }
.baklava-canvas-search__count { font-size: 12px; opacity: 0.9; }

/* Node highlight */
:global(.baklava-node.--search-match) { outline: 2px dashed #3fa7ff; outline-offset: 2px; }
:global(.baklava-node.--search-active-match) { outline: 2px solid #3fa7ff; box-shadow: 0 0 0 3px rgba(63,167,255,0.35); }
</style>
