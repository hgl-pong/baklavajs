<template>
    <div 
        :id="node.id" 
        ref="el"
        class="baklava-node baklava-comment-node" 
        :class="classes"
        :style="styles" 
        :data-node-type="node.type"
        @pointerdown="select"
    >
        <div v-if="viewModel.settings.nodes.resizable" class="__resize-handle" @mousedown="startResize" />
        
        <div class="__header" @pointerdown.self.stop="startDrag" @dblclick.stop="enableEdit">
            <div v-if="!isEditing" class="__header-label" @pointerdown.stop>
                <span v-if="content && content.length" class="comment-text">{{ content }}</span>
                <span v-else class="comment-placeholder">双击编辑注释…</span>
            </div>
            <input 
                v-else
                ref="inputEl"
                v-model="content" 
                class="baklava-input comment-input"
                placeholder="在此输入注释…"
                @pointerdown.stop
                @blur="stopEditing"
                @keydown.enter="stopEditing"
            />
        </div>
        
        <div class="__content">
            <!-- 普通节点容器区域，支持嵌套节点 -->
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef, StyleValue, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { AbstractNode } from "@baklavajs/core";
import { useDragMove, useViewModel, useGraph } from "../src";

export default defineComponent({
    props: {
        node: {
            type: Object as () => AbstractNode,
            required: true,
        },
        selected: {
            type: Boolean,
            default: false,
        },
        dragging: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["select", "start-drag"],
    setup(props, { emit }) {
        const { viewModel } = useViewModel();
        const { graph } = useGraph();
        const dragMove = useDragMove(toRef(props.node, "position"));
        
        const el = ref<HTMLElement | null>(null);
        const isResizing = ref(false);
        let resizeStartWidth = 0;
        let resizeStartHeight = 0;
        let resizeStartMouseX = 0;
        let resizeStartMouseY = 0;
        
        // Get the content input interface
        const contentInput = computed(() => props.node.inputs?.content);
        
        // Create a ref for the content value
        const content = ref(contentInput.value?.value || "");
        const isEditing = ref(false);
        const inputEl = ref<HTMLInputElement | null>(null);
        
        // Watch for changes in the content input and update the ref
        watch(contentInput, (newVal) => {
            if (newVal) {
                content.value = newVal.value || "";
            }
        });
        
        // Watch for changes in the ref and update the content input
        watch(content, (newVal) => {
            if (contentInput.value) {
                contentInput.value.value = newVal;
            }
        }, { immediate: true });
        
        // 监听comment节点位置变化，同步移动内部节点
        let lastPosition = { x: props.node.position?.x ?? 0, y: props.node.position?.y ?? 0 };
        watch(() => ({ x: props.node.position?.x ?? 0, y: props.node.position?.y ?? 0 }), (newPos) => {
            if (dragStartPositions.size > 0) {
                const deltaX = newPos.x - lastPosition.x;
                const deltaY = newPos.y - lastPosition.y;
                
                // 移动comment节点内的所有节点
                 dragStartPositions.forEach((startPos, nodeId) => {
                     const node = graph.value.nodes.find(n => n.id === nodeId);
                     if (node && node.position) {
                         node.position.x = startPos.x + (newPos.x - commentStartPosition.x);
                         node.position.y = startPos.y + (newPos.y - commentStartPosition.y);
                     }
                 });
            }
            lastPosition = { ...newPos };
        }, { deep: true });
         
         // 监听拖动状态，拖动结束时清理位置记录
         watch(() => props.dragging, (isDragging) => {
             if (!isDragging && dragStartPositions.size > 0) {
                 // 拖动结束，清理位置记录
                 dragStartPositions.clear();
             }
         });

        const classes = computed(() => ({
            "--selected": props.selected,
            "--dragging": props.dragging,
        }));
        
        const styles = computed<StyleValue>(() => ({
            "top": `${props.node.position?.y ?? 0}px`,
            "left": `${props.node.position?.x ?? 0}px`,
            "--width": `${(props.node as any).width || 200}px`,
            "height": `${(props.node as any).height || 150}px`,
        }));

        const select = () => {
            emit("select");
        };
        
        // 获取comment节点范围内的其他节点
        const getNodesInCommentArea = () => {
            const commentRect = {
                x: props.node.position?.x ?? 0,
                y: props.node.position?.y ?? 0,
                width: (props.node as any).width || 200,
                height: (props.node as any).height || 150
            };
            
            return graph.value.nodes.filter(node => {
                if (node.id === props.node.id || node.type === "CommentNode") {
                    return false; // 排除自己和其他comment节点
                }
                
                const nodeRect = {
                    x: node.position?.x ?? 0,
                    y: node.position?.y ?? 0,
                    width: (node as any).width || viewModel.value.settings.nodes.defaultWidth || 200,
                    height: 100 // 估算节点高度
                };
                
                // 检查节点是否在comment区域内
                return nodeRect.x >= commentRect.x && 
                       nodeRect.y >= commentRect.y && 
                       nodeRect.x + nodeRect.width <= commentRect.x + commentRect.width && 
                       nodeRect.y + nodeRect.height <= commentRect.y + commentRect.height;
            });
        };
        
        // 存储拖动开始时的节点位置
        let dragStartPositions: Map<string, { x: number; y: number }> = new Map();
        let commentStartPosition = { x: 0, y: 0 };
        
        const startDrag = (ev: PointerEvent) => {
            if (!props.selected) {
                select();
            }
            
            // 记录comment节点的初始位置
            commentStartPosition = {
                x: props.node.position?.x ?? 0,
                y: props.node.position?.y ?? 0
            };
            
            // 记录comment节点内所有节点的初始位置
            const nodesInArea = getNodesInCommentArea();
            dragStartPositions.clear();
            nodesInArea.forEach(node => {
                dragStartPositions.set(node.id, {
                    x: node.position?.x ?? 0,
                    y: node.position?.y ?? 0
                });
            });
            
            emit("start-drag", ev);
        };
        
        const startResize = (ev: MouseEvent) => {
            isResizing.value = true;
            resizeStartWidth = (props.node as any).width || 200;
            resizeStartHeight = (props.node as any).height || 150;
            resizeStartMouseX = ev.clientX;
            resizeStartMouseY = ev.clientY;
            ev.preventDefault();
        };
        
        const doResize = (ev: MouseEvent) => {
            if (!isResizing.value) return;
            const deltaX = ev.clientX - resizeStartMouseX;
            const deltaY = ev.clientY - resizeStartMouseY;
            const newWidth = resizeStartWidth + deltaX / (viewModel.value.displayedGraph.scaling || 1);
            const newHeight = resizeStartHeight + deltaY / (viewModel.value.displayedGraph.scaling || 1);
            const minWidth = 100;
            const minHeight = 50;
            (props.node as any).width = Math.max(minWidth, newWidth);
            (props.node as any).height = Math.max(minHeight, newHeight);
        };
        
        const stopResize = () => {
            isResizing.value = false;
        };
        
        const onRender = () => {
            if (el.value) {
                viewModel.value.hooks.renderNode.execute({ node: props.node, el: el.value });
            }
        };
        
        const enableEdit = () => {
            isEditing.value = true;
            nextTick(() => {
                inputEl.value?.focus();
                inputEl.value?.select();
            });
        };
        const stopEditing = () => {
            isEditing.value = false;
        };
        
        onMounted(() => {
            onRender();
            window.addEventListener("mousemove", doResize);
            window.addEventListener("mouseup", stopResize);
        });
        
        onBeforeUnmount(() => {
            window.removeEventListener("mousemove", doResize);
            window.removeEventListener("mouseup", stopResize);
        });

        return { el, viewModel, classes, styles, content, isEditing, inputEl, select, startDrag, startResize, onRender, enableEdit, stopEditing };
    },
});
</script>

<style scoped>
.baklava-comment-node {
    /* Give comment nodes their own distinct look */
    background: var(--baklava-comment-color-background);
    border: 1px solid var(--baklava-comment-color-border);
    border-radius: 8px;
    box-shadow: none;
    /* Comment nodes should always stay behind other nodes */
    z-index: 0 !important;
    
    &.--selected {
        border-color: var(--baklava-comment-color-border-selected, var(--baklava-comment-color-border));
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--baklava-comment-color-border) 20%, transparent) inset;
    }
    
    & > .__header {
        background: var(--baklava-comment-title-color-background);
        color: var(--baklava-comment-title-color-foreground);
        padding: 0.35em 0.6em;
        border-radius: 6px 6px 0 0;
        cursor: grab;
        user-select: none;
        min-height: 1.8em;
        display: flex;
        align-items: center;

        & > .__header-label {
            pointer-events: none;
            font-weight: 600;
            letter-spacing: 0.2px;
            font-size: 12px;
            flex: 1;
            
            & .comment-text {
                color: var(--baklava-comment-title-color-foreground);
            }
            
            & .comment-placeholder {
                color: var(--baklava-control-color-disabled-foreground);
                opacity: 0.7;
                font-style: italic;
            }
        }
    }
    
    & > .__content {
        padding: 0.6em;
        height: calc(100% - 2.8em); /* Subtract header height */
        box-sizing: border-box;
        /* 普通节点容器样式，支持嵌套节点 */
        background: transparent;
        border-radius: 0 0 6px 6px;
    }
    
    & .__resize-handle {
        position: absolute;
        right: -5px;
        bottom: -5px;
        width: 15px;
        height: 15px;
        cursor: nw-resize;
        
        &::after {
            content: "";
            position: absolute;
            bottom: 5px;
            right: 5px;
            width: 8px;
            height: 8px;
            opacity: 0;
            transition: opacity var(--baklava-visual-transition);
            background: linear-gradient(
                -45deg,
                transparent 30%,
                var(--baklava-node-color-resize-handle) 30%,
                var(--baklava-node-color-resize-handle) 40%,
                transparent 40%,
                transparent 60%,
                var(--baklava-node-color-resize-handle) 60%,
                var(--baklava-node-color-resize-handle) 70%,
                transparent 70%
            );
        }
    }
    
    &:hover .__resize-handle::after {
        opacity: 1;
    }
}

.comment-input {
    width: 100%;
    border: none;
    outline: none;
    background: rgba(255, 255, 255, 0.1);
    padding: 0.2em 0.4em;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: var(--baklava-comment-title-color-foreground);
    border-radius: 3px;
    
    &::placeholder {
        color: var(--baklava-control-color-disabled-foreground);
        opacity: 0.7;
        font-style: italic;
    }
    
    &:focus {
        outline: none;
        background: rgba(255, 255, 255, 0.2);
    }
}
</style>
