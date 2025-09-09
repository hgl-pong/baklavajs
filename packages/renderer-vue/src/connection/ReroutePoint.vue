<template>
  <g
    ref="reroutePointRef"
    class="baklava-reroute-point"
    :class="{ '--selected': isSelected, '--dragging': isDragging }"
  >
    <circle
      class="__reroute-dot"
      :cx="tx"
      :cy="ty"
      :r="6"
      :fill="dotFill"
      stroke="white"
      stroke-width="2"
      style="cursor: grab; transition: transform 0.2s ease; pointer-events: all; touch-action: none;"
      @pointerdown="onPointerDown"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    />
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, ref, inject, watch, onUnmounted } from "vue";
import { useDragMove, useGraph } from "../utility";
import type { IReroutePoint } from "./rerouteService";

export default defineComponent({
  props: {
    reroutePoint: {
      type: Object as () => IReroutePoint,
      required: true,
    },
  },
  emits: ["update:position", "select", "unselect", "delete"],
  setup(props, { emit }) {
    const reroutePointRef = ref<SVGGElement>();
    const isDragging = ref(false);
    const isHovered = ref(false);

    const { graph } = useGraph();
    
    // 注入选择状态管理
    const rerouteSelection = inject<{
      selectedRerouteIds: any;
      selectReroute: (id: string) => void;
      unselectReroute: (id: string) => void;
      toggleRerouteSelection: (id: string, isCtrlPressed: boolean) => void;
      clearRerouteSelection: () => void;
      isRerouteSelected: (id: string) => boolean;
    }>("rerouteSelection");
    
    const isSelected = computed(() => 
      rerouteSelection?.isRerouteSelected?.(props.reroutePoint.id) || false
    );
    
    // 原始坐标（编辑器空间）
    const x = computed(() => props.reroutePoint.x);
    const y = computed(() => props.reroutePoint.y);

    // 变换后的坐标（SVG 空间）
    const tx = computed(() => (x.value + graph.value.panning.x) * graph.value.scaling);
    const ty = computed(() => (y.value + graph.value.panning.y) * graph.value.scaling);
    
    // 创建一个响应式的位置对象用于拖拽（编辑器空间）
    const position = ref({ x: props.reroutePoint.x, y: props.reroutePoint.y });
    const dragMove = useDragMove(position);

    // 监听位置变化并发出更新事件
    watch(position, (newPos) => {
      if (isDragging.value) {
        emit("update:position", { id: props.reroutePoint.id, x: newPos.x, y: newPos.y });
      }
    }, { deep: true });
    
    // 监听 props 变化更新内部位置
    watch(() => [props.reroutePoint.x, props.reroutePoint.y], ([newX, newY]) => {
      if (!isDragging.value) {
        position.value.x = newX;
        position.value.y = newY;
      }
    });

    let cleanupDocListeners: (() => void) | null = null;
    
    const onPointerDown = (ev: PointerEvent) => {
      // 阻止事件影响到画布的其他交互（如平移/选择框）
      ev.stopPropagation();
      ev.preventDefault();

      // 检查是否按下了 Ctrl 键
      const isCtrlPressed = ev.ctrlKey || ev.metaKey;
      
      // 使用新的多选系统
      rerouteSelection?.toggleRerouteSelection(props.reroutePoint.id, isCtrlPressed);
      
      // 发出选择事件供父组件处理
      if (isSelected.value) {
        emit("unselect", props.reroutePoint.id);
      } else {
        emit("select", props.reroutePoint.id);
      }
      
      // 开始拖拽
      isDragging.value = true;
      
      // 触发拖拽开始（记录起点和初始位置）
      dragMove.onPointerDown(ev);

      const handlePointerMove = (e: PointerEvent) => {
        // 如果当前 reroute point 被选中，则处理拖拽
        if (isSelected.value) {
          dragMove.onPointerMove(e);
        }
      };
      
      const handlePointerUp = (e: PointerEvent) => {
        // 结束拖拽
        isDragging.value = false;
        dragMove.onPointerUp();
        // 清理监听
        cleanupDocListeners?.();
        cleanupDocListeners = null;
      };

      // 绑定文档级事件，确保拖动流畅
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp, { once: true });
      document.addEventListener("pointercancel", handlePointerUp, { once: true });

      cleanupDocListeners = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerUp);
      };
    };
    
    const onPointerEnter = () => {
      isHovered.value = true;
    };
    
    const onPointerLeave = () => {
      isHovered.value = false;
    };

    onUnmounted(() => {
      // 若组件卸载时仍在拖拽，清理事件
      cleanupDocListeners?.();
      cleanupDocListeners = null;
    });

    const dotFill = computed(() => getComputedStyle(document.documentElement).getPropertyValue("--baklava-node-interface-port-color") || "#3b82f6");
    
    return {
      reroutePointRef,
      isDragging,
      isSelected,
      x,
      y,
      tx,
      ty,
      onPointerDown,
      onPointerEnter,
      onPointerLeave,
      dotFill,
    };
  },
});
</script>

<style scoped>
/* Hover & Selected states for SVG circle */
.baklava-reroute-point:hover .__reroute-dot {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  stroke-width: 3;
}

.baklava-reroute-point.--selected .__reroute-dot {
  stroke: var(--baklava-node-color-selected);
  stroke-width: 3;
}

.baklava-reroute-point.--dragging .__reroute-dot {
  cursor: grabbing;
  opacity: 0.8;
}
</style>