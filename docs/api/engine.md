# @baklavajs/engine API Reference

## Overview

`@baklavajs/engine` provides execution engines for running calculations on BaklavaJS graphs. This package includes multiple engine implementations with different execution strategies and a centralized registry for managing engine types.

## Installation

```bash
npm install @baklavajs/engine
# or
yarn add @baklavajs/engine
```

## Engine Types

### DependencyEngine

The standard execution engine that uses topological sorting to determine node execution order based on dependencies.

```typescript
import { DependencyEngine } from '@baklavajs/engine';

const engine = new DependencyEngine(editor);
engine.start();
```

#### Features

- **Topological Sorting**: Automatically determines execution order based on node dependencies
- **Cycle Detection**: Prevents infinite loops by detecting circular dependencies
- **Auto-recalculation**: Automatically recalculates when graph changes
- **Dependency Resolution**: Ensures nodes execute only when their dependencies are satisfied

#### Methods

##### `constructor(editor: Editor)`

Create a new DependencyEngine instance.

##### `start(): void`

Start the engine and begin monitoring graph changes.

##### `stop(): void`

Stop the engine and stop monitoring changes.

##### `async execute(calculationData: CalculationData): Promise<CalculationResult>`

Execute the entire graph with provided calculation data.

**Parameters:**
- `calculationData` - Global data passed to all nodes

**Returns:** Map of node IDs to their calculation results

##### `async runGraph(graph: Graph, inputs: Map<string, any>, calculationData: CalculationData): Promise<CalculationResult>`

Execute a specific graph with provided inputs.

**Parameters:**
- `graph` - Graph to execute
- `inputs` - Input values for unconnected interfaces
- `calculationData` - Global calculation data

##### `getInputValues(graph: Graph): Map<string, any>`

Get current values for all unconnected input interfaces.

#### Events

- **`beforeNodeCalculation`** - Emitted before each node calculation
- **`afterNodeCalculation`** - Emitted after each node calculation
- **`beforeExecution`** - Emitted before graph execution starts
- **`afterExecution`** - Emitted after graph execution completes

---

### ForwardEngine

A forward execution engine that processes nodes in propagation order from starting nodes.

```typescript
import { ForwardEngine } from '@baklavajs/engine';

const engine = new ForwardEngine(editor);
engine.start();
```

#### Features

- **Forward Propagation**: Executes nodes starting from input nodes and propagating forward
- **Event-Driven**: Can be triggered by specific node updates
- **Incremental Calculation**: Only recalculates affected parts of the graph
- **Selective Execution**: Can execute specific paths through the graph

#### Methods

##### `constructor(editor: Editor)`

Create a new ForwardEngine instance.

##### `async execute(calculationData: CalculationData, startingNode: AbstractNode, nodeUpdateEvent?: INodeUpdateEventData): Promise<CalculationResult>`

Execute graph starting from a specific node.

**Parameters:**
- `calculationData` - Global calculation data
- `startingNode` - Node to start execution from
- `nodeUpdateEvent` - Optional event that triggered the execution

##### `async runGraph(graph: Graph, inputs: Map<string, any>, calculationData: CalculationData): Promise<CalculationResult>`

Execute a graph with provided inputs, automatically determining starting nodes.

#### Usage Patterns

```typescript
// Execute entire graph
const result = await engine.runGraph(graph, inputs, calculationData);

// Execute from specific node on value change
engine.on('nodeUpdate', async (node, event) => {
    const result = await engine.execute(calculationData, node, event);
});
```

---

### EngineRegistry

Centralized registry for managing different engine types and instances.

```typescript
import { engineRegistryInstance } from '@baklavajs/engine';

// Get available engine types
const types = engineRegistryInstance.getAvailableEngineTypes();

// Create engine instance
const engine = engineRegistryInstance.createEngine('dependency', editor);
```

#### Methods

##### `static getInstance(): EngineRegistry`

Get the singleton instance of EngineRegistry.

##### `registerEngineType(engineType: string, engineInfo: EngineInfo, factory: EngineFactory): void`

Register a new engine type.

**Parameters:**
- `engineType` - Unique identifier for the engine type
- `engineInfo` - Engine metadata including name, description, features
- `factory` - Function that creates engine instances

```typescript
engineRegistryInstance.registerEngineType('custom', {
    type: 'custom',
    name: 'Custom Engine',
    description: 'My custom execution engine',
    version: '1.0.0',
    features: ['custom-feature-1', 'custom-feature-2']
}, (editor) => new CustomEngine(editor));
```

##### `createEngine(engineType: string, editor: Editor, useCache: boolean = true): any`

Create an engine instance of the specified type.

##### `getAvailableEngineTypes(): string[]`

Get all registered engine type identifiers.

##### `getEngineInfo(engineType: string): EngineInfo | undefined`

Get metadata for a specific engine type.

##### `setDefaultEngineType(engineType: string): void`

Set the default engine type.

##### `createDefaultEngine(editor: Editor): any`

Create an engine instance using the default type.

---

## BaseEngine

Abstract base class that all engines extend. Provides common functionality and lifecycle management.

```typescript
import { BaseEngine } from '@baklavajs/engine';

class CustomEngine extends BaseEngine<CalculationData, []> {
    protected async execute(calculationData: CalculationData): Promise<CalculationResult> {
        // Custom execution logic
        return new Map();
    }
    
    protected onChange(recalculateOrder: boolean): void {
        // Handle graph changes
    }
}
```

### Abstract Methods

##### `protected abstract execute(calculationData: CalculationData, ...args: Args): Promise<CalculationResult>`

Execute the engine logic. Must be implemented by subclasses.

##### `protected abstract onChange(recalculateOrder: boolean, ...args: Args): void`

Handle graph structure changes. Must be implemented by subclasses.

### Protected Methods

##### `start(): void`

Start monitoring graph changes.

##### `stop(): void`

Stop monitoring graph changes.

##### `async calculateWithoutData(...args: Args): Promise<CalculationResult>`

Execute calculation without providing calculation data.

##### `validateNodeCalculationOutput(node: AbstractNode, output: any): void`

Validate that node calculation output matches expected interface structure.

### Hooks

##### `transferData: SequentialHook<any, Connection, BaseEngine<any, any[]>>`

Hook for transforming data as it flows through connections.

```typescript
engine.hooks.transferData.tap("MyPlugin", (value, connection) => {
    // Transform data as it passes through connection
    return transformValue(value);
});
```

---

## Utility Functions

### `allowMultipleConnections<T>(intf: NodeInterface<T>): void`

Enable multiple connections on a node interface.

```typescript
import { allowMultipleConnections } from '@baklavajs/engine';

const inputInterface = new NodeInterface("Inputs", []);
allowMultipleConnections(inputInterface);
```

## Type Definitions

### EngineInfo

```typescript
interface EngineInfo {
    type: string;           // Unique engine type identifier
    name: string;           // Human-readable engine name
    description: string;    // Engine description
    version: string;        // Engine version
    features: string[];     // List of supported features
}
```

### EngineFactory

```typescript
type EngineFactory = (editor: Editor) => any;
```

### CalculationResult

```typescript
type CalculationResult = Map<string, Map<string, any>>;
```

Map of node IDs to their output values.

### CalculationContext

```typescript
interface CalculationContext<G = any, E extends IEngine<G> = IEngine<G>> {
    globalValues: G;
    engine: E;
}
```

## Best Practices

### Engine Selection

**Use DependencyEngine when:**
- You need to execute the entire graph
- Dependencies between nodes are complex
- You need automatic recalculation on changes
- Cycle detection is important

**Use ForwardEngine when:**
- You need incremental updates
- Performance is critical for large graphs
- You want to execute specific paths
- Event-driven execution is preferred

### Custom Engine Development

```typescript
class CustomEngine extends BaseEngine<MyData, []> {
    
    protected async execute(calculationData: MyData): Promise<CalculationResult> {
        const result = new Map();
        
        // Custom execution logic
        for (const node of this.orderedNodes) {
            const inputs = this.getNodeInputs(node);
            const outputs = await node.calculate(inputs, {
                globalValues: calculationData,
                engine: this
            });
            result.set(node.id, new Map(Object.entries(outputs)));
        }
        
        return result;
    }
    
    protected onChange(recalculateOrder: boolean): void {
        if (recalculateOrder) {
            this.reorderNodes();
        }
        this.scheduleExecution();
    }
}
```

### Engine Registration

```typescript
// Register custom engine
engineRegistryInstance.registerEngineType('custom', {
    type: 'custom',
    name: 'Custom Processing Engine',
    description: 'Specialized engine for custom processing',
    version: '1.0.0',
    features: ['parallel-execution', 'caching', 'optimization']
}, (editor) => new CustomEngine(editor));

// Use custom engine
const engine = engineRegistryInstance.createEngine('custom', editor);
```

## Performance Considerations

1. **Engine Caching**: Use the engine registry's caching for better performance
2. **Incremental Updates**: Use ForwardEngine for large graphs with frequent updates
3. **Dependency Management**: DependencyEngine handles complex dependencies automatically
4. **Memory Management**: Stop engines when not in use to free resources
5. **Hook Optimization**: Use efficient transfer data hooks to minimize overhead

## Error Handling

Engines provide comprehensive error handling:

- **Cycle Detection**: DependencyEngine prevents infinite loops
- **Validation**: Node outputs are validated against interface definitions
- **Graceful Degradation**: Failed calculations don't stop entire execution
- **Event Notifications**: Errors are emitted through the event system

## Examples

### Basic DependencyEngine Usage

```typescript
import { Editor } from '@baklavajs/core';
import { DependencyEngine } from '@baklavajs/engine';

const editor = new Editor();
const engine = new DependencyEngine(editor);

// Start monitoring
engine.start();

// Execute with custom data
const result = await engine.execute({ 
    globalConfig: { precision: 2 } 
});

// Stop when done
engine.stop();
```

### ForwardEngine with Selective Execution

```typescript
import { ForwardEngine } from '@baklavajs/engine';

const engine = new ForwardEngine(editor);
engine.start();

// Execute from specific node
const startNode = graph.findNodeById('node1');
const result = await engine.execute({}, startNode);
```

### Custom Engine Registration

```typescript
class ParallelEngine extends BaseEngine {
    protected async execute(calculationData: any): Promise<CalculationResult> {
        // Parallel execution logic
        return new Map();
    }
}

// Register custom engine
engineRegistryInstance.registerEngineType('parallel', {
    type: 'parallel',
    name: 'Parallel Engine',
    description: 'Executes nodes in parallel where possible',
    version: '1.0.0',
    features: ['parallel-execution', 'worker-threads']
}, (editor) => new ParallelEngine(editor));
```