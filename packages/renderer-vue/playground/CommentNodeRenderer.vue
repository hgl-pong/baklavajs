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
        
        <div class="__header" @pointerdown.self.stop="startDrag">
            <div class="__header-label">
                {{ node.title }}
            </div>
        </div>
        
        <div class="__content" @dblclick.stop="enableEdit">
            <div v-if="!isEditing" class="comment-display" @pointerdown.stop>
                <span v-if="content && content.length" class="comment-text">{{ content }}</span>
                <span v-else class="comment-placeholder">双击编辑注释…</span>
            </div>
            <textarea 
                v-else
                ref="textareaEl"
                v-model="content" 
                class="baklava-input comment-textarea"
                placeholder="在此输入注释…"
                @pointerdown.stop
                @blur="stopEditing"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, toRef, StyleValue, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { AbstractNode } from "@baklavajs/core";
import { useDragMove, useViewModel } from "../src";

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
        const textareaEl = ref<HTMLTextAreaElement | null>(null);
        
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
        
        const startDrag = (ev: PointerEvent) => {
            if (!props.selected) {
                select();
            }
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
                textareaEl.value?.focus();
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

        return { el, viewModel, classes, styles, content, isEditing, textareaEl, select, startDrag, startResize, onRender, enableEdit, stopEditing };
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

        & > .__header-label {
            pointer-events: none;
            font-weight: 600;
            letter-spacing: 0.2px;
            font-size: 12px;
        }
    }
    
    & > .__content {
        padding: 0.6em;
        height: calc(100% - 2.1em); /* Subtract header height */
        box-sizing: border-box;
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

.comment-display {
    width: 100%;
    height: 100%;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--baklava-node-color-foreground);
}

.comment-placeholder {
    color: var(--baklava-control-color-disabled-foreground);
    opacity: 0.7;
}

.comment-textarea {
    width: 100%;
    height: 100%;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
    padding: 0;
    box-sizing: border-box;
    font-family: inherit;
    font-size: 14px;
    color: var(--baklava-node-color-foreground);
    
    &::placeholder {
        color: var(--baklava-control-color-disabled-foreground);
        opacity: 0.7;
    }
    
    &:focus {
        outline: none;
    }
}
</style>
