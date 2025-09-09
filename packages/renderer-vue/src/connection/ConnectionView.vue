<template>
  <g>
    <!-- 渲染连接线路径 -->
    <path 
        class="baklava-connection" 
        :class="classes" 
        :d="d" 
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @click="onClick"
        @dblclick="onDoubleClick"
    />
    
    <!-- 渲染重路由点（位于同一 SVG 中） -->
    <g v-if="reroutePoints.length > 0">
      <ReroutePoint
        v-for="point in reroutePoints"
        :key="point.id"
        :reroute-point="point"
        @update:position="updateReroutePointPosition"
        @select="selectReroutePoint"
        @unselect="unselectReroutePoint"
        @delete="deleteReroutePoint"
      />
    </g>
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, inject, ref } from "vue";
import { TemporaryConnectionState } from "./connection";
import { useGraph, useViewModel } from "../utility";
import ReroutePoint from "./ReroutePoint.vue";
import type { IReroutePoint } from "./rerouteService";
import type { IRerouteService } from "./rerouteService";

export default defineComponent({
    components: {
        ReroutePoint,
    },
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
        
        // 注入服务
        const rerouteService = inject<IRerouteService>("rerouteService");
        const connectionSelection = inject<{
            selectedConnectionId: any;
            selectConnection: (id: string) => void;
            unselectConnection: () => void;
        }>("connectionSelection");
        const rerouteSelection = inject<{
            selectedRerouteId: any;
            selectReroute: (id: string) => void;
            unselectReroute: () => void;
        }>("rerouteSelection");
        
        if (!connectionSelection) {
            throw new Error("connectionSelection not provided");
        }
        
        // 计算当前连接线是否被选中
        const isSelected = computed(() => 
            props.connectionId && connectionSelection.selectedConnectionId.value === props.connectionId
        );
        
        // 获取当前连接的重路由点
        const reroutePoints = computed(() => {
            if (!props.connectionId || !rerouteService) return [];
            return rerouteService.getReroutePointsForConnection(props.connectionId);
        });

        const transform = (x: number, y: number) => {
            const tx = (x + graph.value.panning.x) * graph.value.scaling;
            const ty = (y + graph.value.panning.y) * graph.value.scaling;
            return [tx, ty];
        };

        const d = computed(() => {
            const [tx1, ty1] = transform(props.x1, props.y1);
            const [tx2, ty2] = transform(props.x2, props.y2);
            
            // 如果没有重路由点，使用原始逻辑
            if (reroutePoints.value.length === 0) {
                if (viewModel.value.settings.useStraightConnections) {
                    return `M ${tx1} ${ty1} L ${tx2} ${ty2}`;
                } else {
                    const dx = 0.3 * Math.abs(tx1 - tx2);
                    return `M ${tx1} ${ty1} C ${tx1 + dx} ${ty1}, ${tx2 - dx} ${ty2}, ${tx2} ${ty2}`;
                }
            }
            
            // 构建包含重路由点的路径
            const points = [
                [tx1, ty1],
                ...reroutePoints.value.map(point => transform(point.x, point.y)),
                [tx2, ty2]
            ];
            
            if (viewModel.value.settings.useStraightConnections) {
                // 直线连接
                let path = `M ${points[0][0]} ${points[0][1]}`;
                for (let i = 1; i < points.length; i++) {
                    path += ` L ${points[i][0]} ${points[i][1]}`;
                }
                return path;
            } else {
                // 贝塞尔曲线连接
                let path = `M ${points[0][0]} ${points[0][1]}`;
                for (let i = 1; i < points.length; i++) {
                    const [x1, y1] = points[i - 1];
                    const [x2, y2] = points[i];
                    const dx = 0.3 * Math.abs(x1 - x2);
                    path += ` C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                }
                return path;
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
            
            // 取消重路由点选择
            if (rerouteSelection) {
                rerouteSelection.unselectReroute();
            }
        };



        const onDoubleClick = (event: MouseEvent) => {
            // 双击添加重路由点
            if (!props.connectionId || !rerouteService) return;
            
            event.preventDefault();
            event.stopPropagation();
            
            // 获取 SVG 容器的边界
            const svgElement = (event.target as SVGElement).closest('svg');
            if (!svgElement) return;
            
            const rect = svgElement.getBoundingClientRect();
            const x = (event.clientX - rect.left) / graph.value.scaling - graph.value.panning.x;
            const y = (event.clientY - rect.top) / graph.value.scaling - graph.value.panning.y;
            
            // 计算应该插入的段索引（简化版本，插入到末尾）
            const segmentIndex = reroutePoints.value.length;
            
            // 添加重路由点
            const newPoint = rerouteService.addReroutePoint(props.connectionId, x, y, segmentIndex);
            
            // 选中新创建的重路由点
            if (rerouteSelection) {
                rerouteSelection.selectReroute(newPoint.id);
            }
        };
        
        const updateReroutePointPosition = (data: { id: string; x: number; y: number }) => {
            if (rerouteService) {
                rerouteService.updateReroutePointPosition(data.id, data.x, data.y);
            }
        };
        
        const selectReroutePoint = (id: string) => {
            if (rerouteSelection) {
                rerouteSelection.selectReroute(id);
            }
            // 取消连接线选择
            connectionSelection.unselectConnection();
        };
        
        const unselectReroutePoint = () => {
            if (rerouteSelection) {
                rerouteSelection.unselectReroute();
            }
        };
        
        const deleteReroutePoint = (id: string) => {
            if (rerouteService) {
                rerouteService.removeReroutePoint(id);
            }
        };

        return { 
            d, 
            classes, 
            reroutePoints,
            onMouseEnter, 
            onMouseLeave, 
            onClick, 
            onDoubleClick,
            updateReroutePointPosition,
            selectReroutePoint,
            unselectReroutePoint,
            deleteReroutePoint
        };
    },
});
</script>
