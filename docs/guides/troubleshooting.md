# Troubleshooting and Performance Guide

This guide provides comprehensive troubleshooting strategies and performance optimization techniques for BaklavaJS applications. Learn how to identify and resolve common issues, debug complex problems, and optimize performance for large-scale node graphs.

## Table of Contents

- [Common Issues and Solutions](#common-issues-and-solutions)
- [Performance Optimization](#performance-optimization)
- [Debugging Techniques](#debugging-techniques)
- [Memory Management](#memory-management)
- [Large Graph Optimization](#large-graph-optimization)
- [Browser Compatibility](#browser-compatibility)
- [Development Tools](#development-tools)
- [Production Deployment](#production-deployment)

## Common Issues and Solutions

### Node Calculation Issues

**Problem: Nodes not calculating or producing incorrect results**

```typescript
// Debug node calculation issues
const debugNodeCalculation = (node: AbstractNode) => {
    console.log('Node Calculation Debug:', {
        nodeId: node.id,
        nodeType: node.type,
        hasCalculateMethod: typeof node.calculate === 'function',
        inputs: Object.entries(node.inputs).map(([key, intf]) => ({
            key,
            value: intf.value,
            connections: intf.connections.length,
            hasValue: intf.value !== undefined
        })),
        outputs: Object.entries(node.outputs).map(([key, intf]) => ({
            key,
            value: intf.value,
            connections: intf.connections.length
        }))
    });
    
    // Test calculation with current inputs
    if (node.calculate) {
        try {
            const inputs = Object.fromEntries(
                Object.entries(node.inputs).map(([key, intf]) => [key, intf.value])
            );
            
            console.log('Testing calculation with inputs:', inputs);
            const result = node.calculate(inputs, { globalValues: {}, engine: null });
            console.log('Calculation result:', result);
            
            // Check if result structure matches outputs
            const outputKeys = Object.keys(node.outputs);
            const resultKeys = Object.keys(result);
            const missingOutputs = outputKeys.filter(key => !resultKeys.includes(key));
            const extraOutputs = resultKeys.filter(key => !outputKeys.includes(key));
            
            if (missingOutputs.length > 0) {
                console.warn('Missing outputs in calculation result:', missingOutputs);
            }
            
            if (extraOutputs.length > 0) {
                console.warn('Extra outputs in calculation result:', extraOutputs);
            }
            
        } catch (error) {
            console.error('Calculation error:', error);
            console.error('Error stack:', error.stack);
        }
    }
};

// Usage
const problematicNode = editor.graph.nodes.find(n => n.id === 'problem-node-id');
if (problematicNode) {
    debugNodeCalculation(problematicNode);
}
```

**Solution: Ensure proper node implementation**

```typescript
// Correct node implementation pattern
export const ProperNode = defineNode({
    type: "ProperNode",
    inputs: {
        input1: () => new NumberInterface("Input 1", 0),
        input2: () => new NumberInterface("Input 2", 0)
    },
    outputs: {
        result: () => new NumberInterface("Result", 0)
    },
    calculate({ input1, input2 }) {
        // Input validation
        if (typeof input1 !== 'number' || typeof input2 !== 'number') {
            console.warn('Invalid input types:', { input1, input2 });
            return { result: 0 };
        }
        
        // Calculation with error handling
        try {
            const result = input1 + input2;
            return { result };
        } catch (error) {
            console.error('Calculation failed:', error);
            return { result: 0 };
        }
    }
});
```

### Connection Issues

**Problem: Connections not working or values not propagating**

```typescript
// Debug connection issues
const debugConnections = (graph: Graph) => {
    console.log('Connection Debug:');
    
    // Check all connections
    graph.connections.forEach(conn => {
        const fromNode = graph.nodes.find(n => n.id === conn.from.nodeId);
        const toNode = graph.nodes.find(n => n.id === conn.to.nodeId);
        
        console.log('Connection:', {
            id: conn.id,
            from: `${conn.from.nodeId}.${conn.from.name}`,
            to: `${conn.to.nodeId}.${conn.to.name}`,
            fromNodeExists: !!fromNode,
            toNodeExists: !!toNode,
            fromInterfaceExists: fromNode ? !!fromNode.outputs[conn.from.name] : false,
            toInterfaceExists: toNode ? !!toNode.inputs[conn.to.name] : false,
            fromValue: fromNode?.outputs[conn.from.name]?.value,
            toValue: toNode?.inputs[conn.to.name]?.value
        });
    });
    
    // Check for unconnected interfaces
    graph.nodes.forEach(node => {
        Object.entries(node.inputs).forEach(([key, intf]) => {
            if (intf.connections.length === 0) {
                console.log(`Unconnected input: ${node.type}.${key} (value: ${intf.value})`);
            }
        });
    });
};

// Check for connection cycles
const hasConnectionCycles = (graph: Graph): boolean => {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (nodeId: string): boolean => {
        if (recursionStack.has(nodeId)) {
            return true;
        }
        
        if (visited.has(nodeId)) {
            return false;
        }
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node) {
            for (const [key, intf] of Object.entries(node.inputs)) {
                for (const conn of intf.connections) {
                    if (hasCycle(conn.from.nodeId)) {
                        return true;
                    }
                }
            }
        }
        
        recursionStack.delete(nodeId);
        return false;
    };
    
    return graph.nodes.some(node => hasCycle(node.id));
};
```

**Solution: Proper connection management**

```typescript
// Safe connection creation
const createSafeConnection = (
    fromNode: AbstractNode,
    fromInterface: string,
    toNode: AbstractNode,
    toInterface: string
): boolean => {
    // Validate interfaces exist
    if (!fromNode.outputs[fromInterface]) {
        console.error(`Source interface ${fromInterface} not found on node ${fromNode.type}`);
        return false;
    }
    
    if (!toNode.inputs[toInterface]) {
        console.error(`Target interface ${toInterface} not found on node ${toNode.type}`);
        return false;
    }
    
    // Check type compatibility
    const fromType = fromNode.outputs[fromInterface].type;
    const toType = toNode.inputs[toInterface].type;
    
    if (!areTypesCompatible(fromType, toType)) {
        console.error(`Type mismatch: ${fromType} -> ${toType}`);
        return false;
    }
    
    // Check for cycles
    const testGraph = new Graph();
    testGraph.nodes = [...editor.graph.nodes];
    testGraph.connections = [...editor.graph.connections];
    
    const testConnection = new Connection(
        { nodeId: fromNode.id, name: fromInterface },
        { nodeId: toNode.id, name: toInterface }
    );
    
    testGraph.connections.push(testConnection);
    
    if (hasConnectionCycles(testGraph)) {
        console.error('Connection would create cycle');
        return false;
    }
    
    // Create connection
    editor.graph.connect(fromNode.outputs[fromInterface], toNode.inputs[toInterface]);
    return true;
};
```

### Memory Leaks

**Problem: Memory usage growing over time**

```typescript
// Memory monitoring
class MemoryMonitor {
    private samples: Array<{ timestamp: number; memory: number }> = [];
    private maxSamples = 100;
    
    startMonitoring() {
        this.takeSample();
        setInterval(() => this.takeSample(), 5000);
    }
    
    private takeSample() {
        const memory = performance.memory ? 
            performance.memory.usedJSHeapSize : 
            this.estimateMemoryUsage();
        
        this.samples.push({
            timestamp: Date.now(),
            memory
        });
        
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
        
        this.checkForLeaks();
    }
    
    private estimateMemoryUsage(): number {
        // Estimate memory usage based on graph size
        const nodeCount = editor.graph.nodes.length;
        const connectionCount = editor.graph.connections.length;
        return nodeCount * 1000 + connectionCount * 100; // Rough estimate
    }
    
    private checkForLeaks() {
        if (this.samples.length < 10) return;
        
        const recent = this.samples.slice(-5);
        const older = this.samples.slice(-10, -5);
        
        const recentAvg = recent.reduce((sum, s) => sum + s.memory, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.memory, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.2) { // 20% increase
            console.warn('Potential memory leak detected');
            this.analyzeMemoryUsage();
        }
    }
    
    private analyzeMemoryUsage() {
        console.log('Memory Analysis:');
        console.log('Node count:', editor.graph.nodes.length);
        console.log('Connection count:', editor.graph.connections.length);
        
        // Check for orphaned nodes
        const connectedNodeIds = new Set<string>();
        editor.graph.connections.forEach(conn => {
            connectedNodeIds.add(conn.from.nodeId);
            connectedNodeIds.add(conn.to.nodeId);
        });
        
        const orphanedNodes = editor.graph.nodes.filter(node => 
            !connectedNodeIds.has(node.id)
        );
        
        if (orphanedNodes.length > 0) {
            console.warn('Found orphaned nodes:', orphanedNodes.length);
        }
    }
}

// Proper cleanup for custom nodes
class CleanupNode extends Node {
    private intervalId?: number;
    private eventListeners: (() => void)[] = [];
    
    onPlaced() {
        // Set up resources
        this.intervalId = setInterval(() => {
            // Periodic task
        }, 1000);
        
        const unsubscribe = this.events.update.subscribe(this, this.handleUpdate);
        this.eventListeners.push(unsubscribe);
    }
    
    onDestroy() {
        // Clean up resources
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        this.eventListeners.forEach(unsubscribe => unsubscribe());
        this.eventListeners = [];
        
        // Clear any cached data
        if ((this as any).cache) {
            (this as any).cache.clear();
        }
    }
}
```

## Performance Optimization

### Graph Optimization

**Virtual Scrolling for Large Graphs**

```typescript
class VirtualGraphRenderer {
    private container: HTMLElement;
    private viewport = { x: 0, y: 0, width: 0, height: 0 };
    private nodePool = new Map<string, HTMLElement>();
    private visibleNodes = new Set<string>();
    private renderDistance = 2000; // pixels
    
    constructor(container: HTMLElement) {
        this.container = container;
        this.setupIntersectionObserver();
        this.setupViewportTracking();
    }
    
    private setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const nodeId = entry.target.getAttribute('data-node-id');
                if (!nodeId) return;
                
                if (entry.isIntersecting) {
                    this.visibleNodes.add(nodeId);
                    this.renderNode(nodeId);
                } else {
                    this.visibleNodes.delete(nodeId);
                    this.hideNode(nodeId);
                }
            });
        }, {
            root: this.container,
            threshold: 0.1
        });
    }
    
    private setupViewportTracking() {
        const updateViewport = () => {
            const rect = this.container.getBoundingClientRect();
            this.viewport = {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            };
            this.updateVisibleNodes();
        };
        
        window.addEventListener('scroll', updateViewport);
        window.addEventListener('resize', updateViewport);
        updateViewport();
    }
    
    private updateVisibleNodes() {
        const editor = (window as any).baklavaEditor;
        if (!editor) return;
        
        editor.graph.nodes.forEach(node => {
            const nodePos = (node as any).position || { x: 0, y: 0 };
            const distance = Math.sqrt(
                Math.pow(nodePos.x - this.viewport.x, 2) +
                Math.pow(nodePos.y - this.viewport.y, 2)
            );
            
            const isVisible = distance < this.renderDistance;
            
            if (isVisible && !this.visibleNodes.has(node.id)) {
                this.visibleNodes.add(node.id);
                this.renderNode(node.id);
            } else if (!isVisible && this.visibleNodes.has(node.id)) {
                this.visibleNodes.delete(node.id);
                this.hideNode(node.id);
            }
        });
    }
    
    private renderNode(nodeId: string) {
        if (this.nodePool.has(nodeId)) {
            const element = this.nodePool.get(nodeId)!;
            element.style.display = 'block';
            return;
        }
        
        const element = document.createElement('div');
        element.setAttribute('data-node-id', nodeId);
        element.className = 'virtual-node';
        element.style.position = 'absolute';
        
        // Lazy load node content
        this.loadNodeContent(nodeId, element);
        
        this.container.appendChild(element);
        this.nodePool.set(nodeId, element);
    }
    
    private hideNode(nodeId: string) {
        const element = this.nodePool.get(nodeId);
        if (element) {
            element.style.display = 'none';
        }
    }
    
    private async loadNodeContent(nodeId: string, element: HTMLElement) {
        try {
            // Simulate async loading
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const editor = (window as any).baklavaEditor;
            const node = editor.graph.nodes.find(n => n.id === nodeId);
            
            if (node) {
                element.innerHTML = `
                    <div class="node-content">
                        <h3>${node.title}</h3>
                        <div class="node-interfaces">
                            ${this.renderInterfaces(node.inputs, 'inputs')}
                            ${this.renderInterfaces(node.outputs, 'outputs')}
                        </div>
                    </div>
                `;
                
                const position = (node as any).position || { x: 0, y: 0 };
                element.style.left = `${position.x}px`;
                element.style.top = `${position.y}px`;
            }
        } catch (error) {
            console.error(`Error loading node ${nodeId}:`, error);
            element.innerHTML = '<div class="node-error">Error</div>';
        }
    }
    
    private renderInterfaces(interfaces: any, type: string): string {
        return Object.entries(interfaces).map(([key, intf]) => `
            <div class="interface ${type}">
                <span class="interface-name">${intf.name || key}</span>
                <span class="interface-value">${intf.value}</span>
            </div>
        `).join('');
    }
}
```

**Batch Operations**

```typescript
// Batch multiple operations to reduce re-renders
class BatchOperationManager {
    private batch: (() => void)[] = [];
    private timeoutId?: number;
    private delay = 16; // 60fps
    
    schedule(operation: () => void) {
        this.batch.push(operation);
        
        if (!this.timeoutId) {
            this.timeoutId = setTimeout(() => {
                this.flush();
            }, this.delay);
        }
    }
    
    private flush() {
        if (this.batch.length === 0) return;
        
        const operations = [...this.batch];
        this.batch = [];
        this.timeoutId = undefined;
        
        // Execute all operations in a single batch
        this.executeBatch(operations);
    }
    
    private executeBatch(operations: (() => void)[]) {
        // For Vue components, use nextTick to batch DOM updates
        if (typeof window !== 'undefined' && (window as any).Vue) {
            (window as any).Vue.nextTick(() => {
                operations.forEach(op => op());
            });
        } else {
            operations.forEach(op => op());
        }
    }
    
    forceFlush() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        this.flush();
    }
}

// Usage with graph operations
const batchManager = new BatchOperationManager();

const addMultipleNodes = (nodes: AbstractNode[]) => {
    nodes.forEach(node => {
        batchManager.schedule(() => {
            editor.graph.addNode(node);
        });
    });
};
```

### Node Performance Optimization

**Memoization for Expensive Calculations**

```typescript
class MemoizedNode extends Node {
    private cache = new Map<string, any>();
    private cacheKeys = new Set<string>();
    private maxCacheSize = 100;
    
    calculate(inputs: any, context: any) {
        const cacheKey = JSON.stringify(inputs);
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const result = this.expensiveCalculation(inputs, context);
        
        // Cache management
        this.cache.set(cacheKey, result);
        this.cacheKeys.add(cacheKey);
        
        if (this.cacheKeys.size > this.maxCacheSize) {
            // Remove oldest cache entry
            const oldestKey = this.cacheKeys.values().next().value;
            this.cache.delete(oldestKey);
            this.cacheKeys.delete(oldestKey);
        }
        
        return result;
    }
    
    private expensiveCalculation(inputs: any, context: any): any {
        // Expensive calculation logic
        return { result: inputs.value * 2 };
    }
    
    // Clear cache when inputs change
    onPlaced() {
        this.events.update.subscribe(this, () => {
            this.cache.clear();
            this.cacheKeys.clear();
        });
    }
}
```

**Lazy Loading for Node Data**

```typescript
class LazyLoadNode extends Node {
    private loadedData: any = null;
    private loading = false;
    private loadPromise?: Promise<any>;
    
    async calculate(inputs: any, context: any) {
        // Load data on demand
        if (!this.loadedData && !this.loading) {
            this.loading = true;
            this.loadPromise = this.loadNodeData();
            
            try {
                this.loadedData = await this.loadPromise;
            } catch (error) {
                console.error('Failed to load node data:', error);
                this.loadedData = { defaultValue: 0 };
            } finally {
                this.loading = false;
            }
        }
        
        if (this.loading) {
            // Return default value while loading
            return { result: 0 };
        }
        
        // Use loaded data for calculation
        return { result: inputs.value * this.loadedData.multiplier };
    }
    
    private async loadNodeData(): Promise<any> {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ multiplier: 2 });
            }, 1000);
        });
    }
}
```

## Debugging Techniques

### Advanced Debugging Tools

```typescript
class DebugTools {
    private editor: Editor;
    private debugPanel: HTMLElement;
    
    constructor(editor: Editor) {
        this.editor = editor;
        this.createDebugPanel();
        this.setupEventListeners();
    }
    
    private createDebugPanel() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.className = 'baklava-debug-panel';
        this.debugPanel.innerHTML = `
            <div class="debug-header">
                <h3>BaklavaJS Debug Tools</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h4>Graph Statistics</h4>
                    <div class="stats-content"></div>
                </div>
                <div class="debug-section">
                    <h4>Performance Metrics</h4>
                    <div class="performance-content"></div>
                </div>
                <div class="debug-section">
                    <h4>Event Log</h4>
                    <div class="event-log"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.debugPanel);
        this.setupPanelEvents();
    }
    
    private setupPanelEvents() {
        const closeBtn = this.debugPanel.querySelector('.close-btn');
        closeBtn?.addEventListener('click', () => {
            this.debugPanel.style.display = 'none';
        });
    }
    
    private setupEventListeners() {
        // Monitor graph changes
        this.editor.events.addNode.subscribe(this, (event) => {
            this.logEvent('Node Added', { node: event.node });
            this.updateStats();
        });
        
        this.editor.events.removeNode.subscribe(this, (event) => {
            this.logEvent('Node Removed', { node: event.node });
            this.updateStats();
        });
        
        this.editor.events.addConnection.subscribe(this, (event) => {
            this.logEvent('Connection Added', { connection: event.connection });
            this.updateStats();
        });
        
        // Monitor performance
        this.setupPerformanceMonitoring();
    }
    
    private setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.updatePerformance({ fps });
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        measureFPS();
    }
    
    private updateStats() {
        const statsContent = this.debugPanel.querySelector('.stats-content');
        if (!statsContent) return;
        
        const stats = {
            nodes: this.editor.graph.nodes.length,
            connections: this.editor.graph.connections.length,
            selectedNodes: this.editor.graph.selectedNodes.length,
            memory: performance.memory ? 
                `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                'N/A'
        };
        
        statsContent.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Nodes:</span>
                <span class="stat-value">${stats.nodes}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Connections:</span>
                <span class="stat-value">${stats.connections}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Selected:</span>
                <span class="stat-value">${stats.selectedNodes}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Memory:</span>
                <span class="stat-value">${stats.memory}</span>
            </div>
        `;
    }
    
    private updatePerformance(metrics: { fps: number }) {
        const performanceContent = this.debugPanel.querySelector('.performance-content');
        if (!performanceContent) return;
        
        performanceContent.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">FPS:</span>
                <span class="metric-value ${metrics.fps < 30 ? 'warning' : ''}">${metrics.fps}</span>
            </div>
        `;
    }
    
    private logEvent(type: string, data: any) {
        const eventLog = this.debugPanel.querySelector('.event-log');
        if (!eventLog) return;
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-type">${type}</span>
            <span class="log-data">${JSON.stringify(data)}</span>
        `;
        
        eventLog.insertBefore(logEntry, eventLog.firstChild);
        
        // Keep only last 50 entries
        while (eventLog.children.length > 50) {
            eventLog.removeChild(eventLog.lastChild!);
        }
    }
    
    show() {
        this.debugPanel.style.display = 'block';
    }
    
    hide() {
        this.debugPanel.style.display = 'none';
    }
}
```

### Performance Profiling

```typescript
class PerformanceProfiler {
    private measurements = new Map<string, number[]>();
    private activeMeasures = new Map<string, number>();
    
    start(name: string) {
        this.activeMeasures.set(name, performance.now());
    }
    
    end(name: string) {
        const startTime = this.activeMeasures.get(name);
        if (!startTime) return;
        
        const duration = performance.now() - startTime;
        this.activeMeasures.delete(name);
        
        if (!this.measurements.has(name)) {
            this.measurements.set(name, []);
        }
        
        this.measurements.get(name)!.push(duration);
    }
    
    getStats(name: string) {
        const measurements = this.measurements.get(name) || [];
        if (measurements.length === 0) return null;
        
        const sorted = [...measurements].sort((a, b) => a - b);
        const sum = measurements.reduce((a, b) => a + b, 0);
        const mean = sum / measurements.length;
        
        return {
            count: measurements.length,
            mean,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)]
        };
    }
    
    getReport() {
        const report: any = {};
        
        for (const [name, _] of this.measurements) {
            report[name] = this.getStats(name);
        }
        
        return report;
    }
    
    reset() {
        this.measurements.clear();
        this.activeMeasures.clear();
    }
}

// Usage
const profiler = new PerformanceProfiler();

// Profile node calculations
const profiledCalculate = (node: AbstractNode, originalCalculate: Function) => {
    return function(inputs: any, context: any) {
        const key = `${node.type}_calculate`;
        profiler.start(key);
        
        try {
            return originalCalculate.call(this, inputs, context);
        } finally {
            profiler.end(key);
        }
    };
};

// Apply profiling to all nodes
editor.graph.nodes.forEach(node => {
    if (node.calculate) {
        node.calculate = profiledCalculate(node, node.calculate);
    }
});
```

## Memory Management

### Memory Optimization Strategies

```typescript
class MemoryOptimizer {
    private editor: Editor;
    private weakReferences = new WeakMap<object, string>();
    private cleanupCallbacks = new Set<() => void>();
    
    constructor(editor: Editor) {
        this.editor = editor;
        this.setupOptimizations();
    }
    
    private setupOptimizations() {
        // Optimize event listeners
        this.optimizeEventListeners();
        
        // Clean up unused nodes
        this.setupNodeCleanup();
        
        // Optimize large arrays
        this.optimizeDataStructures();
    }
    
    private optimizeEventListeners() {
        // Track event listeners for cleanup
        const originalSubscribe = BaklavaEvent.prototype.subscribe;
        
        BaklavaEvent.prototype.subscribe = function(entity: any, callback: Function) {
            const subscription = originalSubscribe.call(this, entity, callback);
            
            // Track subscription for cleanup
            const cleanup = () => {
                this.unsubscribe(entity);
            };
            
            // Add to cleanup set
            if (typeof window !== 'undefined') {
                (window as any).baklavaCleanupCallbacks?.add(cleanup);
            }
            
            return subscription;
        };
    }
    
    private setupNodeCleanup() {
        // Clean up nodes that are no longer needed
        setInterval(() => {
            this.cleanupUnusedNodes();
        }, 30000); // Every 30 seconds
    }
    
    private cleanupUnusedNodes() {
        const connectedNodes = new Set<string>();
        
        // Find all connected nodes
        this.editor.graph.connections.forEach(conn => {
            connectedNodes.add(conn.from.nodeId);
            connectedNodes.add(conn.to.nodeId);
        });
        
        // Remove unconnected nodes that haven't been used recently
        const nodesToRemove = this.editor.graph.nodes.filter(node => {
            return !connectedNodes.has(node.id) && 
                   !this.editor.graph.selectedNodes.includes(node) &&
                   this.isNodeOld(node);
        });
        
        nodesToRemove.forEach(node => {
            this.editor.graph.removeNode(node);
        });
    }
    
    private isNodeOld(node: AbstractNode): boolean {
        // Check if node hasn't been updated recently
        const lastUpdate = (node as any).lastUpdate || 0;
        return Date.now() - lastUpdate > 60000; // 1 minute
    }
    
    private optimizeDataStructures() {
        // Use object pools for frequently created/destroyed objects
        this.setupObjectPools();
    }
    
    private setupObjectPools() {
        // Pool for connection objects
        const connectionPool: Connection[] = [];
        
        const originalConnection = Connection;
        (window as any).PooledConnection = class extends originalConnection {
            static create(from: any, to: any): Connection {
                if (connectionPool.length > 0) {
                    const conn = connectionPool.pop()!;
                    conn.from = from;
                    conn.to = to;
                    return conn;
                }
                return new originalConnection(from, to);
            }
            
            static release(conn: Connection) {
                if (connectionPool.length < 100) {
                    connectionPool.push(conn);
                }
            }
        };
    }
}
```

### Garbage Collection Optimization

```typescript
class GarbageCollectionOptimizer {
    private gcThreshold = 50 * 1024 * 1024; // 50MB
    private lastGcTime = 0;
    private gcInterval = 30000; // 30 seconds
    
    optimize() {
        if (this.shouldForceGC()) {
            this.forceGarbageCollection();
        }
    }
    
    private shouldForceGC(): boolean {
        if (!performance.memory) return false;
        
        const usedHeap = performance.memory.usedJSHeapSize;
        const now = Date.now();
        
        return usedHeap > this.gcThreshold && 
               (now - this.lastGcTime) > this.gcInterval;
    }
    
    private forceGarbageCollection() {
        // Clear caches
        this.clearCaches();
        
        // Clean up DOM elements
        this.cleanupDOM();
        
        // Trigger garbage collection if available
        if ((window as any).gc) {
            (window as any).gc();
        }
        
        this.lastGcTime = Date.now();
    }
    
    private clearCaches() {
        // Clear node calculation caches
        this.editor.graph.nodes.forEach(node => {
            if ((node as any).cache) {
                (node as any).cache.clear();
            }
        });
        
        // Clear other caches
        if ((window as any).baklavaCache) {
            (window as any).baklavaCache.clear();
        }
    }
    
    private cleanupDOM() {
        // Remove hidden DOM elements
        const hiddenElements = document.querySelectorAll('.baklava-node[style*="display: none"]');
        hiddenElements.forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }
}
```

## Large Graph Optimization

### Graph Partitioning

```typescript
class GraphPartitioner {
    private editor: Editor;
    private partitions: Graph[] = [];
    
    constructor(editor: Editor) {
        this.editor = editor;
        this.partitionGraph();
    }
    
    private partitionGraph() {
        const nodes = this.editor.graph.nodes;
        const connections = this.editor.graph.connections;
        
        // Simple partitioning based on connectivity
        const visited = new Set<string>();
        const partitions: AbstractNode[][] = [];
        
        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const partition = this.findConnectedComponent(node, visited);
                partitions.push(partition);
            }
        });
        
        // Create partition graphs
        this.partitions = partitions.map(partition => {
            const partitionGraph = new Graph();
            const partitionNodeIds = new Set(partition.map(n => n.id));
            
            // Add nodes to partition
            partition.forEach(node => {
                partitionGraph.addNode(node);
            });
            
            // Add connections within partition
            connections.forEach(conn => {
                if (partitionNodeIds.has(conn.from.nodeId) && 
                    partitionNodeIds.has(conn.to.nodeId)) {
                    partitionGraph.addConnection(conn);
                }
            });
            
            return partitionGraph;
        });
    }
    
    private findConnectedComponent(startNode: AbstractNode, visited: Set<string>): AbstractNode[] {
        const component: AbstractNode[] = [];
        const stack = [startNode];
        
        while (stack.length > 0) {
            const node = stack.pop()!;
            
            if (visited.has(node.id)) continue;
            
            visited.add(node.id);
            component.push(node);
            
            // Find connected nodes
            Object.entries(node.inputs).forEach(([key, intf]) => {
                intf.connections.forEach(conn => {
                    const connectedNode = this.editor.graph.nodes.find(n => 
                        n.id === conn.from.nodeId
                    );
                    if (connectedNode && !visited.has(connectedNode.id)) {
                        stack.push(connectedNode);
                    }
                });
            });
            
            Object.entries(node.outputs).forEach(([key, intf]) => {
                intf.connections.forEach(conn => {
                    const connectedNode = this.editor.graph.nodes.find(n => 
                        n.id === conn.to.nodeId
                    );
                    if (connectedNode && !visited.has(connectedNode.id)) {
                        stack.push(connectedNode);
                    }
                });
            });
        }
        
        return component;
    }
    
    getPartitions(): Graph[] {
        return this.partitions;
    }
}
```

### Level of Detail (LOD) Rendering

```typescript
class LODRenderer {
    private editor: Editor;
    private detailLevels = new Map<string, number>();
    
    constructor(editor: Editor) {
        this.editor = editor;
        this.setupLOD();
    }
    
    private setupLOD() {
        const updateLOD = () => {
            this.updateDetailLevels();
        };
        
        window.addEventListener('scroll', updateLOD);
        window.addEventListener('resize', updateLOD);
        
        // Initial update
        updateLOD();
    }
    
    private updateDetailLevels() {
        const viewport = this.getViewport();
        
        this.editor.graph.nodes.forEach(node => {
            const nodePos = (node as any).position || { x: 0, y: 0 };
            const distance = this.getDistanceToViewport(nodePos, viewport);
            
            let detailLevel;
            if (distance < 500) {
                detailLevel = 3; // High detail
            } else if (distance < 1000) {
                detailLevel = 2; // Medium detail
            } else if (distance < 2000) {
                detailLevel = 1; // Low detail
            } else {
                detailLevel = 0; // Minimal detail
            }
            
            this.detailLevels.set(node.id, detailLevel);
            this.updateNodeRendering(node, detailLevel);
        });
    }
    
    private getViewport() {
        return {
            x: window.scrollX,
            y: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
    
    private getDistanceToViewport(nodePos: { x: number; y: number }, viewport: any) {
        const centerX = viewport.x + viewport.width / 2;
        const centerY = viewport.y + viewport.height / 2;
        
        return Math.sqrt(
            Math.pow(nodePos.x - centerX, 2) + 
            Math.pow(nodePos.y - centerY, 2)
        );
    }
    
    private updateNodeRendering(node: AbstractNode, detailLevel: number) {
        const element = document.querySelector(`[data-node-id="${node.id}"]`);
        if (!element) return;
        
        // Update CSS classes based on detail level
        element.className = `baklava-node lod-${detailLevel}`;
        
        // Update content based on detail level
        const contentElement = element.querySelector('.node-content');
        if (contentElement) {
            switch (detailLevel) {
                case 0:
                    contentElement.innerHTML = `<div class="node-title">${node.title}</div>`;
                    break;
                case 1:
                    contentElement.innerHTML = `
                        <div class="node-title">${node.title}</div>
                        <div class="node-summary">${Object.keys(node.inputs).length} inputs</div>
                    `;
                    break;
                case 2:
                    contentElement.innerHTML = `
                        <div class="node-title">${node.title}</div>
                        <div class="node-interfaces-mini">
                            ${this.renderMiniInterfaces(node.inputs)}
                            ${this.renderMiniInterfaces(node.outputs)}
                        </div>
                    `;
                    break;
                case 3:
                    contentElement.innerHTML = `
                        <div class="node-title">${node.title}</div>
                        <div class="node-interfaces">
                            ${this.renderFullInterfaces(node.inputs)}
                            ${this.renderFullInterfaces(node.outputs)}
                        </div>
                    `;
                    break;
            }
        }
    }
    
    private renderMiniInterfaces(interfaces: any): string {
        return `<div class="mini-interfaces">${Object.keys(interfaces).length}</div>`;
    }
    
    private renderFullInterfaces(interfaces: any): string {
        return Object.entries(interfaces).map(([key, intf]) => `
            <div class="interface">
                <span class="interface-name">${intf.name || key}</span>
                <span class="interface-value">${intf.value}</span>
            </div>
        `).join('');
    }
}
```

## Browser Compatibility

### Cross-Browser Issues

```typescript
class BrowserCompatibility {
    private static instance: BrowserCompatibility;
    private features: Map<string, boolean> = new Map();
    
    constructor() {
        this.detectFeatures();
    }
    
    static getInstance(): BrowserCompatibility {
        if (!BrowserCompatibility.instance) {
            BrowserCompatibility.instance = new BrowserCompatibility();
        }
        return BrowserCompatibility.instance;
    }
    
    private detectFeatures() {
        // Detect browser features
        this.features.set('IntersectionObserver', 'IntersectionObserver' in window);
        this.features.set('WeakMap', 'WeakMap' in window);
        this.features.set('WeakSet', 'WeakSet' in window);
        this.features.set('performance', 'performance' in window);
        this.features.set('requestAnimationFrame', 'requestAnimationFrame' in window);
        this.features.set('Map', 'Map' in window);
        this.features.set('Set', 'Set' in window);
        
        // Detect CSS features
        const testElement = document.createElement('div');
        this.features.set('flexbox', CSS.supports('display', 'flex'));
        this.features.set('grid', CSS.supports('display', 'grid'));
        this.features.set('transform', CSS.supports('transform', 'translate(0, 0)'));
        this.features.set('willChange', CSS.supports('will-change', 'transform'));
    }
    
    hasFeature(feature: string): boolean {
        return this.features.get(feature) || false;
    }
    
    getPolyfills(): string[] {
        const polyfills: string[] = [];
        
        if (!this.hasFeature('IntersectionObserver')) {
            polyfills.push('intersection-observer');
        }
        
        if (!this.hasFeature('WeakMap')) {
            polyfills.push('weakmap-polyfill');
        }
        
        return polyfills;
    }
    
    applyCompatibilityFixes() {
        // Apply browser-specific fixes
        this.applyEventListenersFix();
        this.applyRenderingFixes();
        this.applyPerformanceFixes();
    }
    
    private applyEventListenersFix() {
        // Fix for passive event listeners
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        
        EventTarget.prototype.addEventListener = function(
            type: string,
            listener: any,
            options?: any
        ) {
            if (type === 'wheel' || type === 'touchmove') {
                if (typeof options === 'boolean') {
                    options = { passive: true };
                } else if (typeof options === 'object') {
                    options.passive = true;
                }
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
    }
    
    private applyRenderingFixes() {
        // Fix for rendering issues in certain browsers
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            // Safari-specific rendering fixes
            document.documentElement.classList.add('safari');
        }
        
        if (userAgent.includes('firefox')) {
            // Firefox-specific rendering fixes
            document.documentElement.classList.add('firefox');
        }
    }
    
    private applyPerformanceFixes() {
        // Fix for performance issues in older browsers
        if (!this.hasFeature('requestAnimationFrame')) {
            // Fallback for browsers without requestAnimationFrame
            (window as any).requestAnimationFrame = (callback: Function) => {
                return setTimeout(callback, 16);
            };
        }
    }
}
```

## Development Tools

### Developer Console

```typescript
class DeveloperConsole {
    private console: HTMLElement;
    private logEntries: Array<{ level: string; message: string; timestamp: number }> = [];
    private maxEntries = 100;
    
    constructor() {
        this.createConsole();
        this.setupConsoleAPI();
    }
    
    private createConsole() {
        this.console = document.createElement('div');
        this.console.className = 'baklava-dev-console';
        this.console.innerHTML = `
            <div class="console-header">
                <h3>Developer Console</h3>
                <div class="console-controls">
                    <button class="clear-btn">Clear</button>
                    <button class="close-btn">×</button>
                </div>
            </div>
            <div class="console-output"></div>
            <div class="console-input">
                <input type="text" placeholder="Enter command..." />
                <button class="execute-btn">Execute</button>
            </div>
        `;
        
        document.body.appendChild(this.console);
        this.setupConsoleEvents();
    }
    
    private setupConsoleEvents() {
        const clearBtn = this.console.querySelector('.clear-btn');
        const closeBtn = this.console.querySelector('.close-btn');
        const executeBtn = this.console.querySelector('.execute-btn');
        const input = this.console.querySelector('input') as HTMLInputElement;
        
        clearBtn?.addEventListener('click', () => this.clear());
        closeBtn?.addEventListener('click', () => this.hide());
        executeBtn?.addEventListener('click', () => this.executeCommand(input.value));
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(input.value);
            }
        });
    }
    
    private setupConsoleAPI() {
        // Add console commands
        (window as any).baklavaConsole = {
            log: (message: string) => this.log('info', message),
            warn: (message: string) => this.log('warn', message),
            error: (message: string) => this.log('error', message),
            clear: () => this.clear(),
            show: () => this.show(),
            hide: () => this.hide(),
            help: () => this.showHelp()
        };
    }
    
    private log(level: string, message: string) {
        const entry = {
            level,
            message,
            timestamp: Date.now()
        };
        
        this.logEntries.push(entry);
        
        if (this.logEntries.length > this.maxEntries) {
            this.logEntries.shift();
        }
        
        this.render();
    }
    
    private render() {
        const output = this.console.querySelector('.console-output');
        if (!output) return;
        
        output.innerHTML = this.logEntries.map(entry => `
            <div class="console-entry ${entry.level}">
                <span class="console-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span class="console-message">${entry.message}</span>
            </div>
        `).join('');
        
        output.scrollTop = output.scrollHeight;
    }
    
    private executeCommand(command: string) {
        try {
            const result = eval(command);
            this.log('info', `> ${command}`);
            if (result !== undefined) {
                this.log('info', String(result));
            }
        } catch (error) {
            this.log('error', `Error: ${error.message}`);
        }
        
        // Clear input
        const input = this.console.querySelector('input') as HTMLInputElement;
        if (input) {
            input.value = '';
        }
    }
    
    private showHelp() {
        const help = `
Available commands:
- log(message) - Log info message
- warn(message) - Log warning
- error(message) - Log error
- clear() - Clear console
- show() - Show console
- hide() - Hide console
- help() - Show this help

Special commands:
- editor.graph.nodes - Show all nodes
- editor.graph.connections - Show all connections
- editor.graph.selectedNodes - Show selected nodes
        `;
        this.log('info', help);
    }
    
    show() {
        this.console.style.display = 'block';
    }
    
    hide() {
        this.console.style.display = 'none';
    }
    
    clear() {
        this.logEntries = [];
        this.render();
    }
}
```

## Production Deployment

### Build Optimization

```typescript
// Build configuration for production
const productionConfig = {
    // Optimize bundle size
    optimization: {
        splitChunks: {
            chunks: 'all',
            minSize: 30000,
            maxSize: 244000,
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        },
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                        drop_debugger: true
                    }
                }
            })
        ]
    },
    
    // Environment-specific configuration
    plugins: [
        new DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production'),
            'process.env.DEBUG': 'false'
        }),
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false
        })
    ],
    
    // Performance budget
    performance: {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
        hints: 'warning'
    }
};
```

### Error Monitoring

```typescript
class ErrorMonitor {
    private errors: Array<{ error: Error; context: any; timestamp: number }> = [];
    private maxErrors = 100;
    
    constructor() {
        this.setupErrorHandlers();
    }
    
    private setupErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.handleError(event.error, {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: 'unhandledrejection'
            });
        });
        
        // BaklavaJS-specific error handlers
        this.setupBaklavaErrorHandlers();
    }
    
    private setupBaklavaErrorHandlers() {
        const editor = (window as any).baklavaEditor;
        if (!editor) return;
        
        // Monitor node calculation errors
        editor.events.nodeError.subscribe(this, (event) => {
            this.handleError(new Error(event.error), {
                nodeId: event.nodeId,
                type: 'node-calculation'
            });
        });
        
        // Monitor engine errors
        editor.events.engineError.subscribe(this, (event) => {
            this.handleError(new Error(event.error), {
                type: 'engine-error'
            });
        });
    }
    
    private handleError(error: Error, context: any) {
        const errorEntry = {
            error,
            context,
            timestamp: Date.now()
        };
        
        this.errors.push(errorEntry);
        
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Send to error tracking service
        this.sendToErrorService(errorEntry);
        
        // Log to console
        console.error('BaklavaJS Error:', error, context);
    }
    
    private async sendToErrorService(errorEntry: any) {
        // Send error to external monitoring service
        try {
            await fetch('/api/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: errorEntry.error.message,
                    stack: errorEntry.error.stack,
                    context: errorEntry.context,
                    timestamp: errorEntry.timestamp,
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (err) {
            console.error('Failed to send error to service:', err);
        }
    }
    
    getErrors() {
        return this.errors;
    }
    
    clearErrors() {
        this.errors = [];
    }
}
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
    private metrics = new Map<string, number[]>();
    private thresholds = new Map<string, number>();
    
    constructor() {
        this.setupMonitoring();
        this.setThresholds();
    }
    
    private setThresholds() {
        this.thresholds.set('nodeCalculation', 100); // 100ms
        this.thresholds.set('graphExecution', 1000); // 1s
        this.thresholds.set('renderTime', 16); // 16ms (60fps)
        this.thresholds.set('memoryUsage', 50 * 1024 * 1024); // 50MB
    }
    
    private setupMonitoring() {
        // Monitor node calculations
        this.monitorNodeCalculations();
        
        // Monitor graph execution
        this.monitorGraphExecution();
        
        // Monitor rendering performance
        this.monitorRendering();
        
        // Monitor memory usage
        this.monitorMemory();
    }
    
    private monitorNodeCalculations() {
        const editor = (window as any).baklavaEditor;
        if (!editor) return;
        
        editor.events.beforeNodeCalculation.subscribe(this, (event) => {
            event.startTime = performance.now();
        });
        
        editor.events.afterNodeCalculation.subscribe(this, (event) => {
            const duration = performance.now() - event.startTime;
            this.recordMetric('nodeCalculation', duration);
            
            if (duration > this.thresholds.get('nodeCalculation')!) {
                console.warn(`Slow node calculation: ${event.nodeId} took ${duration}ms`);
            }
        });
    }
    
    private monitorGraphExecution() {
        const editor = (window as any).baklavaEditor;
        if (!editor) return;
        
        editor.events.beforeGraphExecution.subscribe(this, (event) => {
            event.startTime = performance.now();
        });
        
        editor.events.afterGraphExecution.subscribe(this, (event) => {
            const duration = performance.now() - event.startTime;
            this.recordMetric('graphExecution', duration);
            
            if (duration > this.thresholds.get('graphExecution')!) {
                console.warn(`Slow graph execution: ${duration}ms`);
            }
        });
    }
    
    private monitorRendering() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFrame = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const avgFrameTime = (currentTime - lastTime) / frameCount;
                this.recordMetric('renderTime', avgFrameTime);
                
                if (avgFrameTime > this.thresholds.get('renderTime')!) {
                    console.warn(`Slow rendering: ${avgFrameTime}ms per frame`);
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFrame);
        };
        
        measureFrame();
    }
    
    private monitorMemory() {
        setInterval(() => {
            if (performance.memory) {
                const usedHeap = performance.memory.usedJSHeapSize;
                this.recordMetric('memoryUsage', usedHeap);
                
                if (usedHeap > this.thresholds.get('memoryUsage')!) {
                    console.warn(`High memory usage: ${Math.round(usedHeap / 1024 / 1024)}MB`);
                }
            }
        }, 5000);
    }
    
    private recordMetric(name: string, value: number) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        
        const values = this.metrics.get(name)!;
        values.push(value);
        
        // Keep only last 100 values
        if (values.length > 100) {
            values.shift();
        }
    }
    
    getMetrics() {
        const result: any = {};
        
        for (const [name, values] of this.metrics) {
            if (values.length === 0) continue;
            
            const sorted = [...values].sort((a, b) => a - b);
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / values.length;
            
            result[name] = {
                count: values.length,
                mean,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                median: sorted[Math.floor(sorted.length / 2)],
                p95: sorted[Math.floor(sorted.length * 0.95)],
                threshold: this.thresholds.get(name)
            };
        }
        
        return result;
    }
}
```

This comprehensive troubleshooting and performance guide provides developers with the tools and techniques needed to identify, debug, and optimize BaklavaJS applications for production environments.