# Development Guide and Best Practices

## Overview

This guide provides comprehensive best practices and development patterns for building applications with BaklavaJS. Following these guidelines will help you create maintainable, performant, and extensible node-based applications.

## Project Structure

### Recommended Directory Structure

```
src/
├── nodes/                    # Custom node definitions
│   ├── math/
│   │   ├── AddNode.ts
│   │   ├── MultiplyNode.ts
│   │   └── index.ts
│   ├── data/
│   │   ├── FilterNode.ts
│   │   ├── TransformNode.ts
│   │   └── index.ts
│   └── index.ts
├── interfaces/              # Custom interface types
│   ├── VectorInterface.ts
│   ├── ColorInterface.ts
│   └── index.ts
├── engines/                # Custom execution engines
│   ├── ParallelEngine.ts
│   └── index.ts
├── plugins/                # Custom plugins and extensions
│   ├── ValidationPlugin.ts
│   ├── ExportPlugin.ts
│   └── index.ts
├── utils/                  # Utility functions
│   ├── graphUtils.ts
│   ├── nodeUtils.ts
│   └── index.ts
├── types/                  # TypeScript type definitions
│   ├── customTypes.ts
│   └── index.ts
├── components/             # Vue components
│   ├── CustomNodeRenderer.vue
│   └── CustomInterface.vue
└── main.ts                 # Application entry point
```

### Module Organization

```typescript
// nodes/index.ts
export * from './math';
export * from './data';

// nodes/math/index.ts
export { AddNode } from './AddNode';
export { MultiplyNode } from './MultiplyNode';
```

---

## Node Development Patterns

### 1. Node Definition Patterns

#### defineNode Pattern (Recommended for simple nodes)

```typescript
// nodes/math/AddNode.ts
import { defineNode, NodeInterface, NumberInterface } from '@baklavajs/core';

export const AddNode = defineNode({
    type: "AddNode",
    title: "Add",
    inputs: {
        a: () => new NumberInterface("A", 0),
        b: () => new NumberInterface("B", 0)
    },
    outputs: {
        result: () => new NodeInterface("Result", 0)
    },
    calculate({ a, b }) {
        return { result: a + b };
    },
    onCreate() {
        // Initialize node properties
        this.width = 150;
    },
    onPlaced() {
        // Called when node is added to graph
        console.log('Add node placed');
    },
    onDestroy() {
        // Cleanup resources
    }
});
```

#### Class-based Pattern (Recommended for complex nodes)

```typescript
// nodes/data/FilterNode.ts
import { Node, NodeInterface, CalculationContext } from '@baklavajs/core';

interface FilterInputs {
    data: any[];
    predicate: (item: any) => boolean;
}

interface FilterOutputs {
    filtered: any[];
    count: number;
}

export class FilterNode extends Node<FilterInputs, FilterOutputs> {
    public type = "FilterNode";
    public title = "Filter";
    
    public inputs = {
        data: new NodeInterface("Data", []),
        predicate: new NodeInterface("Predicate", (item: any) => true)
    };
    
    public outputs = {
        filtered: new NodeInterface("Filtered", []),
        count: new NodeInterface("Count", 0)
    };
    
    public calculate(inputs: FilterInputs, context: CalculationContext): FilterOutputs {
        const filtered = inputs.data.filter(inputs.predicate);
        return {
            filtered,
            count: filtered.length
        };
    }
    
    public onPlaced(): void {
        this.title = `Filter ${this.id.slice(0, 4)}`;
    }
}
```

#### Dynamic Node Pattern (For nodes with configurable interfaces)

```typescript
// nodes/data/TransformNode.ts
import { defineDynamicNode, NodeInterface, SelectInterface } from '@baklavajs/core';

interface TransformConfig {
    operation: string;
    fields: string[];
}

export const TransformNode = defineDynamicNode({
    type: "TransformNode",
    inputs: {
        data: () => new NodeInterface("Data", []),
        operation: () => new SelectInterface("Operation", "map", ["map", "filter", "reduce"])
    },
    outputs: {},
    onUpdate(inputs) {
        // Dynamically generate interfaces based on configuration
        const outputs: Record<string, () => NodeInterface> = {};
        
        if (inputs.operation === "map") {
            outputs.result = () => new NodeInterface("Result", []);
        } else if (inputs.operation === "filter") {
            outputs.filtered = () => new NodeInterface("Filtered", []);
            outputs.count = () => new NodeInterface("Count", 0);
        }
        
        return { inputs: {}, outputs };
    },
    calculate(inputs, context) {
        // Dynamic calculation logic
        const { data, operation } = inputs;
        
        switch (operation) {
            case "map":
                return { result: data };
            case "filter":
                return { filtered: data, count: data.length };
            default:
                return {};
        }
    }
});
```

### 2. Node Interface Patterns

#### Typed Interfaces

```typescript
import { NodeInterface, setType } from '@baklavajs/interface-types';
import { stringType, numberType } from './types';

export const TypedNode = defineNode({
    type: "TypedNode",
    inputs: {
        text: () => new NodeInterface("Text", "").use(setType, stringType),
        number: () => new NodeInterface("Number", 0).use(setType, numberType)
    },
    outputs: {
        result: () => new NodeInterface("Result", 0).use(setType, numberType)
    },
    calculate({ text, number }) {
        const numValue = parseFloat(text) || 0;
        return { result: numValue + number };
    }
});
```

#### Validated Interfaces

```typescript
export const ValidatedNode = defineNode({
    type: "ValidatedNode",
    inputs: {
        email: () => new NodeInterface("Email", "")
            .use(setType, stringType)
            .use(setValidator, (value: string) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    throw new Error('Invalid email format');
                }
                return value;
            })
    },
    outputs: {
        isValid: () => new NodeInterface("Is Valid", false)
    },
    calculate({ email }) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        return { isValid };
    }
});
```

### 3. Node Lifecycle Management

#### Resource Management

```typescript
export class ResourceIntensiveNode extends Node {
    private intervalId?: number;
    private eventListeners: Array<() => void> = [];
    
    public onPlaced(): void {
        // Set up resources
        this.intervalId = setInterval(() => {
            // Periodic task
            this.updateValue();
        }, 1000);
        
        // Subscribe to events
        const unsubscribe = this.events.update.subscribe(this, this.handleUpdate);
        this.eventListeners.push(unsubscribe);
    }
    
    public onDestroy(): void {
        // Clean up resources
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        
        // Unsubscribe from events
        this.eventListeners.forEach(unsubscribe => unsubscribe());
        this.eventListeners = [];
    }
    
    private updateValue(): void {
        // Update node logic
    }
    
    private handleUpdate(): void {
        // Handle updates
    }
}
```

---

## Type System Best Practices

### 1. Interface Type Definition

```typescript
// types/index.ts
import { NodeInterfaceType } from '@baklavajs/interface-types';

// Define custom types
export const vectorType = new NodeInterfaceType<{ x: number; y: number }>('vector');
export const colorType = new NodeInterfaceType<{ r: number; g: number; b: number }>('color');
export const matrixType = new NodeInterfaceType<number[][]>('matrix');

// Add conversions
vectorType.addConversion(colorType, (vector) => ({
    r: Math.round(vector.x * 255),
    g: Math.round(vector.y * 255),
    b: 128
}));

colorType.addConversion(vectorType, (color) => ({
    x: color.r / 255,
    y: color.g / 255
}));
```

### 2. Type Safety Patterns

#### Strict Typing

```typescript
interface MathNodeInputs {
    a: number;
    b: number;
    operation: 'add' | 'subtract' | 'multiply' | 'divide';
}

interface MathNodeOutputs {
    result: number;
    error?: string;
}

export class MathNode extends Node<MathNodeInputs, MathNodeOutputs> {
    public calculate(inputs: MathNodeInputs): MathNodeOutputs {
        const { a, b, operation } = inputs;
        
        try {
            let result: number;
            switch (operation) {
                case 'add':
                    result = a + b;
                    break;
                case 'subtract':
                    result = a - b;
                    break;
                case 'multiply':
                    result = a * b;
                    break;
                case 'divide':
                    if (b === 0) throw new Error('Division by zero');
                    result = a / b;
                    break;
                default:
                    throw new Error('Unknown operation');
            }
            return { result };
        } catch (error) {
            return { 
                result: 0, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
}
```

#### Runtime Validation

```typescript
export const ValidatedNode = defineNode({
    type: "ValidatedNode",
    inputs: {
        age: () => new NumberInterface("Age", 0)
            .use(setType, numberType)
            .use(setValidator, (value: number) => {
                if (!Number.isInteger(value)) {
                    throw new Error('Age must be an integer');
                }
                if (value < 0 || value > 150) {
                    throw new Error('Age must be between 0 and 150');
                }
                return value;
            })
    },
    outputs: {
        isValid: () => new NodeInterface("Is Valid", false)
    }
});
```

---

## Vue Component Development

### 1. Custom Node Renderers

```vue
<!-- components/CustomNodeRenderer.vue -->
<template>
    <div class="custom-node" :class="classes" :style="styles">
        <div class="node-header" @mousedown="startDrag">
            <h3>{{ node.title }}</h3>
            <div class="node-status" :class="statusClass"></div>
        </div>
        
        <div class="node-content">
            <div class="node-inputs">
                <div v-for="(intf, key) in node.inputs" :key="key" class="node-interface">
                    <span class="interface-label">{{ intf.name }}</span>
                    <slot :name="`input-${key}`" :intf="intf">
                        <component :is="getInterfaceComponent(intf)" :intf="intf" />
                    </slot>
                </div>
            </div>
            
            <div class="node-outputs">
                <div v-for="(intf, key) in node.outputs" :key="key" class="node-interface">
                    <span class="interface-label">{{ intf.name }}</span>
                    <span class="interface-value">{{ formatValue(intf.value) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AbstractNode } from '@baklavajs/core';
import { useViewModel } from '@baklavajs/renderer-vue';

const props = defineProps<{
    node: AbstractNode;
    selected: boolean;
}>();

const emit = defineEmits<{
    select: [node: AbstractNode];
    'start-drag': [event: PointerEvent];
}>();

const viewModel = useViewModel();

const classes = computed(() => ({
    'selected': props.selected,
    'has-error': hasError.value,
    'processing': isProcessing.value
}));

const styles = computed(() => ({
    backgroundColor: props.node.titleBackgroundColor,
    color: props.node.titleForegroundColor
}));

const getInterfaceComponent = (intf: any) => {
    return viewModel.settings.customComponents.get(intf.componentName) || 'TextInterface';
};

const startDrag = (event: PointerEvent) => {
    emit('start-drag', event);
};
</script>

<style scoped>
.custom-node {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
}

.custom-node.selected {
    box-shadow: 0 0 0 2px #4299e1;
}

.node-header {
    padding: 8px 12px;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
}
</style>
```

### 2. Custom Interface Components

```vue
<!-- components/ColorPickerInterface.vue -->
<template>
    <div class="color-picker-interface">
        <input 
            type="color" 
            :value="displayValue" 
            @input="onColorChange"
            class="color-input"
        />
        <input 
            type="text" 
            :value="hexValue" 
            @input="onTextChange"
            class="text-input"
            placeholder="#000000"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NodeInterface } from '@baklavajs/core';

interface ColorValue {
    r: number;
    g: number;
    b: number;
    a?: number;
}

const props = defineProps<{
    intf: NodeInterface<ColorValue>;
}>();

const emit = defineEmits<{
    'value-change': [value: ColorValue];
}>();

const displayValue = computed(() => {
    const color = props.intf.value;
    if (!color) return '#000000';
    return `#${componentToHex(color.r)}${componentToHex(color.g)}${componentToHex(color.b)}`;
});

const hexValue = computed(() => displayValue.value);

const onColorChange = (event: Event) => {
    const hex = (event.target as HTMLInputElement).value;
    const color = hexToRgb(hex);
    if (color) {
        props.intf.setValue(color);
        emit('value-change', color);
    }
};

const onTextChange = (event: Event) => {
    const hex = (event.target as HTMLInputElement).value;
    const color = hexToRgb(hex);
    if (color) {
        props.intf.setValue(color);
        emit('value-change', color);
    }
};

const componentToHex = (c: number): string => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
};

const hexToRgb = (hex: string): ColorValue | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};
</script>

<style scoped>
.color-picker-interface {
    display: flex;
    align-items: center;
    gap: 8px;
}

.color-input {
    width: 40px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.text-input {
    flex: 1;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
}
</style>
```

---

## Performance Optimization

### 1. Node Performance

#### Calculation Caching

```typescript
export class CachedCalculationNode extends Node {
    private cache = new Map<string, any>();
    private cacheKey = '';
    
    public calculate(inputs: any): any {
        const key = JSON.stringify(inputs);
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        const result = this.expensiveCalculation(inputs);
        this.cache.set(key, result);
        return result;
    }
    
    private expensiveCalculation(inputs: any): any {
        // Expensive calculation logic
        return { result: inputs.value * 2 };
    }
    
    public onPlaced(): void {
        // Clear cache when inputs change
        this.events.update.subscribe(this, () => {
            this.cache.clear();
        });
    }
}
```

#### Lazy Loading

```typescript
export class LazyNode extends Node {
    private loaded = false;
    private data: any = null;
    
    public async calculate(inputs: any): Promise<any> {
        if (!this.loaded) {
            this.data = await this.loadData();
            this.loaded = true;
        }
        return this.processData(this.data, inputs);
    }
    
    private async loadData(): Promise<any> {
        // Load data from external source
        return fetchExternalData();
    }
    
    private processData(data: any, inputs: any): any {
        // Process loaded data
        return { result: data.value + inputs.value };
    }
}
```

### 2. Graph Performance

#### Batch Operations

```typescript
// Use transactions for batch operations
const performBatchOperations = (graph: Graph, nodes: AbstractNode[]) => {
    graph.transaction(() => {
        nodes.forEach(node => {
            graph.addNode(node);
        });
        
        // Add connections between nodes
        for (let i = 0; i < nodes.length - 1; i++) {
            graph.addConnection(
                nodes[i].outputs.output,
                nodes[i + 1].inputs.input
            );
        }
    });
};
```

#### Virtual Rendering

```typescript
// Only render visible nodes
const visibleNodes = computed(() => {
    const viewport = getCurrentViewport();
    return allNodes.value.filter(node => 
        isNodeInViewport(node, viewport)
    );
});
```

### 3. Memory Management

#### Resource Cleanup

```typescript
export class ResourceManager {
    private resources: Set<any> = new Set();
    
    public addResource(resource: any): void {
        this.resources.add(resource);
    }
    
    public removeResource(resource: any): void {
        this.resources.delete(resource);
    }
    
    public cleanup(): void {
        this.resources.forEach(resource => {
            if (typeof resource.destroy === 'function') {
                resource.destroy();
            } else if (typeof resource.close === 'function') {
                resource.close();
            }
        });
        this.resources.clear();
    }
}
```

---

## Error Handling and Debugging

### 1. Node Error Handling

```typescript
export class SafeMathNode extends Node {
    public calculate(inputs: { a: number; b: number }): { result: number; error?: string } {
        try {
            if (typeof inputs.a !== 'number' || typeof inputs.b !== 'number') {
                throw new Error('Invalid input types');
            }
            
            const result = inputs.a + inputs.b;
            
            if (!Number.isFinite(result)) {
                throw new Error('Invalid result');
            }
            
            return { result };
        } catch (error) {
            console.error('Math node calculation error:', error);
            return { 
                result: 0, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
}
```

### 2. Debug Utilities

```typescript
// utils/debug.ts
export class DebugLogger {
    private static instance: DebugLogger;
    private logs: Array<{ timestamp: Date; message: string; data?: any }> = [];
    
    static getInstance(): DebugLogger {
        if (!DebugLogger.instance) {
            DebugLogger.instance = new DebugLogger();
        }
        return DebugLogger.instance;
    }
    
    public log(message: string, data?: any): void {
        const entry = {
            timestamp: new Date(),
            message,
            data
        };
        this.logs.push(entry);
        console.log(`[${entry.timestamp.toISOString()}] ${message}`, data || '');
    }
    
    public getLogs(): Array<{ timestamp: Date; message: string; data?: any }> {
        return this.logs;
    }
    
    public clear(): void {
        this.logs = [];
    }
}

// Usage in nodes
const logger = DebugLogger.getInstance();
logger.log('Node calculation started', { inputs });
```

### 3. State Validation

```typescript
export const validateNodeState = (node: AbstractNode): string[] => {
    const errors: string[] = [];
    
    // Validate required properties
    if (!node.type) {
        errors.push('Node type is required');
    }
    
    // Validate interface structure
    Object.entries(node.inputs).forEach(([key, intf]) => {
        if (!intf.name) {
            errors.push(`Input interface ${key} missing name`);
        }
    });
    
    // Validate connections
    Object.values(node.inputs).forEach(intf => {
        if (intf.connections.length > 1 && !intf.allowMultipleConnections) {
            errors.push(`Interface ${intf.name} has multiple connections but doesn't allow it`);
        }
    });
    
    return errors;
};
```

---

## Testing Strategies

### 1. Unit Testing Nodes

```typescript
// tests/nodes/MathNode.test.ts
import { MathNode } from '../../src/nodes/MathNode';
import { DependencyEngine } from '@baklavajs/engine';

describe('MathNode', () => {
    let node: MathNode;
    let engine: DependencyEngine;
    
    beforeEach(() => {
        node = new MathNode();
        engine = new DependencyEngine();
    });
    
    test('should add two numbers correctly', () => {
        node.inputs.a.value = 5;
        node.inputs.b.value = 3;
        const result = node.calculate!({ a: 5, b: 3 });
        expect(result.result).toBe(8);
    });
    
    test('should handle division by zero', () => {
        node.inputs.a.value = 10;
        node.inputs.b.value = 0;
        node.inputs.operation.value = 'divide';
        const result = node.calculate!({ a: 10, b: 0, operation: 'divide' });
        expect(result.error).toBe('Division by zero');
    });
    
    test('should integrate with engine', async () => {
        const graph = new Graph();
        graph.addNode(node);
        const results = await engine.execute(graph);
        expect(results.get(node.id)).toEqual({ result: 0 });
    });
});
```

### 2. Integration Testing

```typescript
// tests/integration/GraphExecution.test.ts
import { Editor } from '@baklavajs/core';
import { DependencyEngine } from '@baklavajs/engine';
import { MathNode, FilterNode } from '../src/nodes';

describe('Graph Execution Integration', () => {
    let editor: Editor;
    let engine: DependencyEngine;
    
    beforeEach(() => {
        editor = new Editor();
        engine = new DependencyEngine(editor);
        engine.start();
    });
    
    test('should execute complex graph correctly', async () => {
        // Create nodes
        const mathNode = new MathNode();
        const filterNode = new FilterNode();
        
        // Add to graph
        editor.graph.addNode(mathNode);
        editor.graph.addNode(filterNode);
        
        // Connect nodes
        editor.graph.addConnection(
            mathNode.outputs.result,
            filterNode.inputs.data
        );
        
        // Set input values
        mathNode.inputs.a.value = 10;
        mathNode.inputs.b.value = 5;
        
        // Execute
        const results = await engine.execute(editor.graph);
        
        // Verify results
        expect(results.get(mathNode.id)?.get('result')).toBe(15);
        expect(results.get(filterNode.id)).toBeDefined();
    });
});
```

### 3. Vue Component Testing

```typescript
// tests/components/CustomNodeRenderer.test.ts
import { mount } from '@vue/test-utils';
import { createTestNode } from '../utils/testUtils';
import CustomNodeRenderer from '../../src/components/CustomNodeRenderer.vue';

describe('CustomNodeRenderer', () => {
    test('should render node with correct title', () => {
        const node = createTestNode({ title: 'Test Node' });
        const wrapper = mount(CustomNodeRenderer, {
            props: { node, selected: false }
        });
        expect(wrapper.find('h3').text()).toBe('Test Node');
    });
    
    test('should emit select event when clicked', async () => {
        const node = createTestNode();
        const wrapper = mount(CustomNodeRenderer, {
            props: { node, selected: false }
        });
        await wrapper.find('.custom-node').trigger('click');
        expect(wrapper.emitted('select')).toBeTruthy();
    });
});
```

---

## Deployment and Production

### 1. Build Optimization

```json
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'baklavajs-core': ['@baklavajs/core'],
                    'baklavajs-renderer': ['@baklavajs/renderer-vue'],
                    'baklavajs-engine': ['@baklavajs/engine']
                }
            }
        }
    }
});
```

### 2. Performance Monitoring

```typescript
// utils/performance.ts
export class PerformanceMonitor {
    private metrics: Map<string, number[]> = new Map();
    
    public measure<T>(name: string, fn: () => T): T {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(duration);
        
        return result;
    }
    
    public getMetrics(name: string): { avg: number; max: number; min: number } {
        const values = this.metrics.get(name) || [];
        if (values.length === 0) return { avg: 0, max: 0, min: 0 };
        
        return {
            avg: values.reduce((a, b) => a + b) / values.length,
            max: Math.max(...values),
            min: Math.min(...values)
        };
    }
}
```

### 3. Error Tracking

```typescript
// utils/errorTracking.ts
export class ErrorTracker {
    private errors: Array<{ timestamp: Date; error: Error; context?: any }> = [];
    
    public trackError(error: Error, context?: any): void {
        const entry = {
            timestamp: new Date(),
            error,
            context
        };
        this.errors.push(entry);
        
        // Send to error tracking service
        if (typeof window !== 'undefined' && window.navigator.onLine) {
            this.sendToErrorService(entry);
        }
    }
    
    public getErrors(): Array<{ timestamp: Date; error: Error; context?: any }> {
        return this.errors;
    }
    
    private sendToErrorService(entry: any): void {
        // Implement error service integration
        console.log('Error tracked:', entry);
    }
}
```

---

## Conclusion

Following these best practices will help you build robust, maintainable, and performant applications with BaklavaJS. The key principles to remember are:

1. **Type Safety**: Leverage TypeScript and the interface type system
2. **Performance**: Use caching, lazy loading, and efficient algorithms
3. **Error Handling**: Implement comprehensive error handling and recovery
4. **Testing**: Write thorough unit and integration tests
5. **Modularity**: Keep code organized and modular
6. **Documentation**: Document your code and APIs for maintainability

By adhering to these guidelines, you'll create applications that are not only functional but also scalable and maintainable in the long term.