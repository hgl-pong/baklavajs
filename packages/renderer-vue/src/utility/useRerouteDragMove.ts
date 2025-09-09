import { Ref, ref, computed } from "vue";
import { useGraph } from "./useGraph";

interface IPosition {
    x: number;
    y: number;
}

export function useRerouteDragMove(rerouteService: { reroutePoints: any[]; updateReroutePointPosition: (id: string, x: number, y: number) => void }, selectedRerouteIds: Ref<string[]>) {
    const { graph } = useGraph();
    const draggingStartPoint = ref<IPosition | null>(null);
    const draggingStartPositions = ref<Map<string, IPosition>>(new Map());

    const dragging = computed(() => !!draggingStartPoint.value);

    const onPointerDown = (ev: PointerEvent) => {
        draggingStartPoint.value = {
            x: ev.pageX,
            y: ev.pageY,
        };
        
        // 记录所有选中的 reroute point 的初始位置
        draggingStartPositions.value.clear();
        selectedRerouteIds.value.forEach(id => {
            const reroutePoint = rerouteService.reroutePoints.find((rp: any) => rp.id === id);
            if (reroutePoint) {
                draggingStartPositions.value.set(id, {
                    x: reroutePoint.x,
                    y: reroutePoint.y
                });
            }
        });
    };

    const onPointerMove = (ev: PointerEvent) => {
        if (draggingStartPoint.value) {
            const dx = ev.pageX - draggingStartPoint.value.x;
            const dy = ev.pageY - draggingStartPoint.value.y;
            
            // 更新所有选中的 reroute point 位置
            selectedRerouteIds.value.forEach(id => {
                const startPos = draggingStartPositions.value.get(id);
                if (startPos) {
                    const newX = startPos.x + dx / graph.value.scaling;
                    const newY = startPos.y + dy / graph.value.scaling;
                    rerouteService.updateReroutePointPosition(id, newX, newY);
                }
            });
        }
    };

    const onPointerUp = () => {
        draggingStartPoint.value = null;
        draggingStartPositions.value.clear();
    };

    return { dragging, onPointerDown, onPointerMove, onPointerUp };
}