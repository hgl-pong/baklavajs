import { reactive, ref } from "vue";
import type { IReroutePoint } from "./ReroutePoint.vue";
import { v4 as uuidv4 } from "uuid";

export interface IRerouteService {
  reroutePoints: IReroutePoint[];
  addReroutePoint: (connectionId: string, x: number, y: number, segmentIndex: number) => IReroutePoint;
  removeReroutePoint: (id: string) => void;
  updateReroutePointPosition: (id: string, x: number, y: number) => void;
  getReroutePointsForConnection: (connectionId: string) => IReroutePoint[];
  clearReroutePointsForConnection: (connectionId: string) => void;
}

export function createRerouteService(): IRerouteService {
  const reroutePoints = reactive<IReroutePoint[]>([]);
  
  const addReroutePoint = (connectionId: string, x: number, y: number, segmentIndex: number): IReroutePoint => {
    const newPoint: IReroutePoint = {
      id: uuidv4(),
      x,
      y,
      connectionId,
      segmentIndex,
    };
    
    // 按 segmentIndex 排序插入
    const insertIndex = reroutePoints.findIndex(
      (point) => point.connectionId === connectionId && point.segmentIndex > segmentIndex
    );
    
    if (insertIndex === -1) {
      reroutePoints.push(newPoint);
    } else {
      reroutePoints.splice(insertIndex, 0, newPoint);
    }
    
    // 更新后续点的 segmentIndex
    reroutePoints
      .filter((point) => point.connectionId === connectionId && point.segmentIndex >= segmentIndex && point.id !== newPoint.id)
      .forEach((point) => {
        point.segmentIndex += 1;
      });
    
    return newPoint;
  };
  
  const removeReroutePoint = (id: string) => {
    const pointIndex = reroutePoints.findIndex((point) => point.id === id);
    if (pointIndex === -1) return;
    
    const removedPoint = reroutePoints[pointIndex];
    reroutePoints.splice(pointIndex, 1);
    
    // 更新后续点的 segmentIndex
    reroutePoints
      .filter((point) => point.connectionId === removedPoint.connectionId && point.segmentIndex > removedPoint.segmentIndex)
      .forEach((point) => {
        point.segmentIndex -= 1;
      });
  };
  
  const updateReroutePointPosition = (id: string, x: number, y: number) => {
    const point = reroutePoints.find((point) => point.id === id);
    if (point) {
      point.x = x;
      point.y = y;
    }
  };
  
  const getReroutePointsForConnection = (connectionId: string): IReroutePoint[] => {
    return reroutePoints
      .filter((point) => point.connectionId === connectionId)
      .sort((a, b) => a.segmentIndex - b.segmentIndex);
  };
  
  const clearReroutePointsForConnection = (connectionId: string) => {
    for (let i = reroutePoints.length - 1; i >= 0; i--) {
      if (reroutePoints[i].connectionId === connectionId) {
        reroutePoints.splice(i, 1);
      }
    }
  };
  
  return {
    reroutePoints,
    addReroutePoint,
    removeReroutePoint,
    updateReroutePointPosition,
    getReroutePointsForConnection,
    clearReroutePointsForConnection,
  };
}

// 全局重路由点选择状态管理
export function createRerouteSelection() {
  const selectedRerouteId = ref<string | null>(null);
  
  const selectReroute = (id: string) => {
    selectedRerouteId.value = id;
  };
  
  const unselectReroute = () => {
    selectedRerouteId.value = null;
  };
  
  return {
    selectedRerouteId,
    selectReroute,
    unselectReroute,
  };
}