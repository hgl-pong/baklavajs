import { reactive, ref } from "vue";

// 定义 IReroutePoint 接口以避免循环导入
export interface IReroutePoint {
  id: string;
  x: number;
  y: number;
  connectionId: string;
  segmentIndex: number;
}
import { v4 as uuidv4 } from "uuid";
import type { Graph } from "@baklavajs/core";

export interface IRerouteService {
  reroutePoints: IReroutePoint[];
  addReroutePoint: (connectionId: string, x: number, y: number, segmentIndex: number) => IReroutePoint;
  removeReroutePoint: (id: string) => void;
  updateReroutePointPosition: (id: string, x: number, y: number) => void;
  getReroutePointsForConnection: (connectionId: string) => IReroutePoint[];
  clearReroutePointsForConnection: (connectionId: string) => void;
  syncWithCoreModel: () => void;
}

export function createRerouteService(graph?: Graph): IRerouteService {
  const reroutePoints = reactive<IReroutePoint[]>([]);
  
  const addReroutePoint = (connectionId: string, x: number, y: number, segmentIndex: number): IReroutePoint => {
    // Check if we have access to the core connection model
    if (graph) {
      const connection = graph.connections.find(c => c.id === connectionId);
      if (connection) {
        // Use core connection model
        const coreReroutePoint = connection.addReroutePoint(x, y);
        
        // Create UI wrapper
        const newPoint: IReroutePoint = {
          id: coreReroutePoint.id,
          x,
          y,
          connectionId,
          segmentIndex,
        };
        
        // Add to reactive array for UI
        reroutePoints.push(newPoint);
        return newPoint;
      }
    }
    
    // Fallback to old behavior for backward compatibility
    const newPoint: IReroutePoint = {
      id: uuidv4(),
      x,
      y,
      connectionId,
      segmentIndex,
    };
    
    // 按 segmentIndex 排序插入
    const insertIndex = reroutePoints.findIndex(
      (point: IReroutePoint) => point.connectionId === connectionId && point.segmentIndex > segmentIndex
    );
    
    if (insertIndex === -1) {
      reroutePoints.push(newPoint);
    } else {
      reroutePoints.splice(insertIndex, 0, newPoint);
    }
    
    // 更新后续点的 segmentIndex
    reroutePoints
      .filter((point: IReroutePoint) => point.connectionId === connectionId && point.segmentIndex >= segmentIndex && point.id !== newPoint.id)
      .forEach((point: IReroutePoint) => {
        point.segmentIndex += 1;
      });
    
    return newPoint;
  };
  
  const removeReroutePoint = (id: string) => {
    const pointIndex = reroutePoints.findIndex((point: IReroutePoint) => point.id === id);
    if (pointIndex === -1) return;
    
    const removedPoint = reroutePoints[pointIndex];
    
    // Check if we have access to the core connection model
    if (graph) {
      const connection = graph.connections.find(c => c.id === removedPoint.connectionId);
      if (connection) {
        // Remove from core connection model
        connection.removeReroutePoint(id);
      }
    }
    
    reroutePoints.splice(pointIndex, 1);
    
    // 更新后续点的 segmentIndex
    reroutePoints
      .filter((point: IReroutePoint) => point.connectionId === removedPoint.connectionId && point.segmentIndex > removedPoint.segmentIndex)
      .forEach((point: IReroutePoint) => {
        point.segmentIndex -= 1;
      });
  };
  
  const updateReroutePointPosition = (id: string, x: number, y: number) => {
    const point = reroutePoints.find((point: IReroutePoint) => point.id === id);
    if (point) {
      point.x = x;
      point.y = y;
      
      // Check if we have access to the core connection model
      if (graph) {
        const connection = graph.connections.find(c => c.id === point.connectionId);
        if (connection) {
          // Update core connection model
          connection.updateReroutePoint(id, x, y);
        }
      }
    }
  };
  
  const getReroutePointsForConnection = (connectionId: string): IReroutePoint[] => {
    // Check if we have access to the core connection model
    if (graph) {
      const connection = graph.connections.find(c => c.id === connectionId);
      if (connection) {
        // Use core connection model as primary source
        const coreReroutePoints = connection.getReroutePoints();
        
        // Convert to IReroutePoint format with segmentIndex
        return coreReroutePoints.map((rp, index) => ({
          id: rp.id,
          x: rp.x,
          y: rp.y,
          connectionId,
          segmentIndex: index,
        }));
      }
    }
    
    // Fallback to reactive array for backward compatibility
    return reroutePoints
      .filter((point: IReroutePoint) => point.connectionId === connectionId)
      .sort((a: IReroutePoint, b: IReroutePoint) => a.segmentIndex - b.segmentIndex);
  };
  
  const clearReroutePointsForConnection = (connectionId: string) => {
    // Check if we have access to the core connection model
    if (graph) {
      const connection = graph.connections.find(c => c.id === connectionId);
      if (connection) {
        // Clear from core connection model
        connection.clearReroutePoints();
      }
    }
    
    // Clear from reactive array
    for (let i = reroutePoints.length - 1; i >= 0; i--) {
      if (reroutePoints[i].connectionId === connectionId) {
        reroutePoints.splice(i, 1);
      }
    }
  };

  const syncWithCoreModel = () => {
    if (!graph) return;
    
    // Clear existing reactive array
    reroutePoints.length = 0;
    
    // Load all reroute points from core model
    for (const connection of graph.connections) {
      const coreReroutePoints = connection.getReroutePoints();
      for (let i = 0; i < coreReroutePoints.length; i++) {
        const rp = coreReroutePoints[i];
        reroutePoints.push({
          id: rp.id,
          x: rp.x,
          y: rp.y,
          connectionId: connection.id,
          segmentIndex: i,
        });
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
    syncWithCoreModel,
  };
}

// 全局重路由点选择状态管理
export function createRerouteSelection() {
  const selectedRerouteIds = ref<string[]>([]);
  
  const selectReroute = (id: string) => {
    if (!selectedRerouteIds.value.includes(id)) {
      selectedRerouteIds.value.push(id);
    }
  };
  
  const unselectReroute = (id: string) => {
    const index = selectedRerouteIds.value.indexOf(id);
    if (index > -1) {
      selectedRerouteIds.value.splice(index, 1);
    }
  };
  
  const toggleRerouteSelection = (id: string, isCtrlPressed: boolean = false) => {
    if (isCtrlPressed) {
      // Ctrl 键按下时，切换选择状态
      const index = selectedRerouteIds.value.indexOf(id);
      if (index > -1) {
        selectedRerouteIds.value.splice(index, 1);
      } else {
        selectedRerouteIds.value.push(id);
      }
    } else {
      // 否则只选择当前点
      selectedRerouteIds.value = [id];
    }
  };
  
  const clearRerouteSelection = () => {
    selectedRerouteIds.value = [];
  };
  
  const isRerouteSelected = (id: string) => {
    return selectedRerouteIds.value.includes(id);
  };
  
  return {
    selectedRerouteIds,
    selectReroute,
    unselectReroute,
    toggleRerouteSelection,
    clearRerouteSelection,
    isRerouteSelected,
  };
}