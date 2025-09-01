<template>
    <path 
        class="baklava-connection" 
        :class="classes" 
        :d="d" 
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @click="onClick"
    />
</template>

<script lang="ts">
import { computed, defineComponent, inject, ref } from "vue";
import { TemporaryConnectionState } from "./connection";
import { useGraph, useViewModel } from "../utility";

export default defineComponent({
    props: {
        connectionId: {
            type: String,
            required: false,
            default: null,
        },
        x1: {
            type: Number,
            required: true,
        },
        y1: {
            type: Number,
            required: true,
        },
        x2: {
            type: Number,
            required: true,
        },
        y2: {
            type: Number,
            required: true,
        },
        state: {
            type: Number as () => TemporaryConnectionState,
            default: TemporaryConnectionState.NONE,
        },
        isTemporary: {
            type: Boolean,
            default: false,
        },
    },
    setup(props) {
        const { viewModel } = useViewModel();
        const { graph } = useGraph();
        
        const isHovered = ref(false);
        const isClicked = ref(false);
        
        // 使用全局连接线选中状态管理
        const connectionSelection = inject<{
            selectedConnectionId: any;
            selectConnection: (id: string) => void;
            unselectConnection: () => void;
        }>("connectionSelection");
        
        if (!connectionSelection) {
            throw new Error("connectionSelection not provided");
        }
        
        // 计算当前连接线是否被选中
        const isSelected = computed(() => 
            props.connectionId && connectionSelection.selectedConnectionId.value === props.connectionId
        );

        const transform = (x: number, y: number) => {
            const tx = (x + graph.value.panning.x) * graph.value.scaling;
            const ty = (y + graph.value.panning.y) * graph.value.scaling;
            return [tx, ty];
        };

        const d = computed(() => {
            const [tx1, ty1] = transform(props.x1, props.y1);
            const [tx2, ty2] = transform(props.x2, props.y2);
            if (viewModel.value.settings.useStraightConnections) {
                return `M ${tx1} ${ty1} L ${tx2} ${ty2}`;
            } else {
                const dx = 0.3 * Math.abs(tx1 - tx2);
                return `M ${tx1} ${ty1} C ${tx1 + dx} ${ty1}, ${tx2 - dx} ${ty2}, ${tx2} ${ty2}`;
            }
        });

        const classes = computed(() => ({
            "--temporary": props.isTemporary,
            "--allowed": props.state === TemporaryConnectionState.ALLOWED,
            "--forbidden": props.state === TemporaryConnectionState.FORBIDDEN,
            "--hovered": isHovered.value && !isSelected.value,
            "--clicked": isClicked.value,
            "--selected": isSelected.value,
        }));
        
        const onMouseEnter = () => {
            isHovered.value = true;
        };
        
        const onMouseLeave = () => {
            isHovered.value = false;
        };
        
        const onClick = () => {
            // 触发点击动画（在选中逻辑之前，确保动画只在当前连接线上生效）
            isClicked.value = true;
            setTimeout(() => {
                isClicked.value = false;
            }, 600); // Match animation duration
            
            // 实现互斥选中逻辑 (仅对非临时连接有效)
            if (props.connectionId) {
                if (isSelected.value) {
                    // 如果当前已选中，则取消选中
                    connectionSelection.unselectConnection();
                } else {
                    // 如果当前未选中，则选中当前连接线（自动取消其他连接线的选中状态）
                    connectionSelection.selectConnection(props.connectionId);
                }
            }
        };



        return { d, classes, onMouseEnter, onMouseLeave, onClick };
    },
});
</script>
