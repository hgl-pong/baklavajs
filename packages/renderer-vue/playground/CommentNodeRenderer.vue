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
        
        <div class="__title" @pointerdown.self.stop="startDrag">
            <div class="__title-label">
                {{ node.title }}
            </div>
        </div>
        
        <div class="__content">
            <textarea 
                v-model="content" 
                class="baklava-input comment-textarea"
                placeholder="Enter your comment..."
                @pointerdown.stop
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
        
        onMounted(() => {
            onRender();
            window.addEventListener("mousemove", doResize);
            window.addEventListener("mouseup", stopResize);
        });
        
        onBeforeUnmount(() => {
            window.removeEventListener("mousemove", doResize);
            window.removeEventListener("mouseup", stopResize);
        });

        return { el, viewModel, classes, styles, content, select, startDrag, startResize, onRender };
    },
});
</script>

<style scoped>
.baklava-comment-node {
    /* Override node background for comment nodes */
    background: var(--baklava-node-color-background);
    /* Comment nodes should always stay behind other nodes */
    z-index: 0 !important;
    
    /* Comment-specific styling */
    &.--selected {
        border-color: var(--baklava-node-color-selected);
    }
    
    & > .__title {
        background: var(--baklava-node-title-color-background);
        color: var(--baklava-node-title-color-foreground);
        padding: 0.4em 0.75em;
        border-radius: var(--baklava-node-border-radius) var(--baklava-node-border-radius) 0 0;
        cursor: grab;
        
        & > .__title-label {
            pointer-events: none;
            font-weight: 500;
        }
    }
    
    & > .__content {
        padding: 0.75em;
        height: calc(100% - 2.5em); /* Subtract title height */
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
