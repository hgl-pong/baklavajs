# @baklavajs/events API Reference

## Overview

`@baklavajs/events` provides the foundational event system and hook infrastructure for BaklavaJS. This package enables reactive programming patterns, plugin systems, and extensible architectures throughout the BaklavaJS ecosystem.

## Installation

```bash
npm install @baklavajs/events
# or
yarn add @baklavajs/events
```

## Core Concepts

### Events

Events enable publish-subscribe communication between components. Listeners can subscribe to events and react when they are emitted.

### Hooks

Hooks provide a way to intercept and modify data flow through the system. They support both sequential and parallel execution patterns.

### Proxies

Proxies enable event and hook aggregation across multiple instances, allowing centralized subscription to distributed events.

---

## Event System

### BaklavaEvent<T, E>

Standard event class for one-to-many communication.

```typescript
import { BaklavaEvent } from '@baklavajs/events';

class MyEmitter {
    public events = {
        dataChanged: new BaklavaEvent<string, MyEmitter>(this),
        itemAdded: new BaklavaEvent<number, MyEmitter>(this)
    };
}

const emitter = new MyEmitter();

// Subscribe to event
emitter.events.dataChanged.subscribe((data, emitter) => {
    console.log('Data changed:', data);
});

// Emit event
emitter.events.dataChanged.emit('new value');
```

#### Constructor

```typescript
new BaklavaEvent<T, E>(entity: E)
```

**Parameters:**
- `entity` - The entity that owns this event

#### Methods

##### `emit(data: T): void`

Emit the event to all subscribers.

**Parameters:**
- `data` - Data to pass to subscribers

##### `subscribe(listener: EventListener<T, E>): () => void`

Subscribe to the event.

**Parameters:**
- `listener` - Function to call when event is emitted

**Returns:** Unsubscribe function

##### `unsubscribe(listener: EventListener<T, E>): void`

Unsubscribe a specific listener.

### PreventableBaklavaEvent<T, E>

Event that allows listeners to prevent the default action.

```typescript
class MyEmitter {
    public events = {
        beforeDelete: new PreventableBaklavaEvent<string, MyEmitter>(this)
    };
}

const emitter = new MyEmitter();

// Subscribe with prevention capability
emitter.events.beforeDelete.subscribe((itemId, prevent, emitter) => {
    if (itemId === 'protected') {
        prevent(); // Prevent the deletion
    }
});

// Emit event
const result = emitter.events.beforeDelete.emit('item1');
if (result.prevented) {
    console.log('Deletion was prevented');
}
```

#### Methods

##### `emit(data: T): { prevented: boolean }`

Emit the event, allowing listeners to prevent it.

**Returns:** Object indicating if the event was prevented

---

## Hook System

### SequentialHook<I, E, O>

Hook that executes subscribers sequentially, passing the output of each as input to the next.

```typescript
import { SequentialHook } from '@baklavajs/events';

class MyProcessor {
    public hooks = {
        processData: new SequentialHook<string, MyProcessor, string>(this)
    };
    
    public process(input: string): string {
        return this.hooks.processData.execute(input);
    }
}

const processor = new MyProcessor();

// Add hooks to transform data
processor.hooks.processData.subscribe((data) => data.toUpperCase());
processor.hooks.processData.subscribe((data => data + '!'));

const result = processor.process('hello'); // "HELLO!"
```

#### Constructor

```typescript
new SequentialHook<I, E, O>(entity: E)
```

#### Methods

##### `execute(data: I): O`

Execute all hooks sequentially.

**Parameters:**
- `data` - Initial data to process

**Returns:** Final processed data

### ParallelHook<I, O, E>

Hook that executes all subscribers in parallel and returns all results.

```typescript
class MyValidator {
    public hooks = {
        validate: new ParallelHook<string, boolean[], MyValidator>(this)
    };
    
    public validate(data: string): boolean[] {
        return this.hooks.validate.execute(data);
    }
}

const validator = new MyValidator();

// Add multiple validation rules
validator.hooks.validate.subscribe((data) => data.length > 0);
validator.hooks.validate.subscribe((data) => !data.includes('invalid'));

const results = validator.validate('test'); // [true, true]
```

#### Methods

##### `execute(data: I): O[]`

Execute all hooks in parallel.

**Returns:** Array of results from all hooks

### DynamicSequentialHook<I, E, O>

Similar to SequentialHook but allows passing a different entity for each execution.

```typescript
class MultiProcessor {
    public hooks = {
        process: new DynamicSequentialHook<string, MyProcessor, string>()
    };
    
    public process(data: string, processor: MyProcessor): string {
        return this.hooks.process.execute(data, processor);
    }
}
```

---

## Proxy System

### createProxy<T>()

Create a proxy that aggregates events and hooks from multiple targets.

```typescript
import { createProxy } from '@baklavajs/events';

class Graph {
    public events = {
        nodeAdded: new BaklavaEvent<Node, Graph>(this),
        connectionAdded: new BaklavaEvent<Connection, Graph>(this)
    };
}

// Create proxy for multiple graphs
const graphEvents = createProxy<Graph['events']>();

const graph1 = new Graph();
const graph2 = new Graph();

// Add graphs to proxy
graphEvents.addTarget(graph1.events);
graphEvents.addTarget(graph2.events);

// Subscribe to events from all graphs
graphEvents.nodeAdded.subscribe((node, graph) => {
    console.log(`Node added to graph ${graph.id}:`, node.type);
});
```

#### Methods

##### `addTarget(target: T): void`

Add a target to the proxy.

##### `removeTarget(target: T): void`

Remove a target from the proxy.

##### `destroy(): void`

Clean up the proxy and all subscriptions.

---

## Type Definitions

### EventListener<T, E>

```typescript
type EventListener<T, E> = (data: T, entity: E) => any;
```

### PreventableEventListener<T, E>

```typescript
type PreventableEventListener<T, E> = (data: T, prevent: () => void, entity: E) => any;
```

### HookTap<I, O, E>

```typescript
type HookTap<I, O, E> = (i: I, entity: E) => O;
```

### IBaklavaEventEmitter

```typescript
interface IBaklavaEventEmitter {
    events: Record<string, BaklavaEvent<any, any> | PreventableBaklavaEvent<any, any>>;
}
```

### IBaklavaTapable

```typescript
interface IBaklavaTapable {
    hooks: Record<string, Subscribable<HookTap<any, any, any>>>;
}
```

---

## Usage Patterns

### Event-driven Architecture

```typescript
class NodeEditor {
    public events = {
        nodeCreated: new BaklavaEvent<Node, NodeEditor>(this),
        nodeDeleted: new BaklavaEvent<Node, NodeEditor>(this),
        connectionMade: new BaklavaEvent<Connection, NodeEditor>(this)
    };
    
    public createNode(type: string): Node {
        const node = new Node(type);
        this.events.nodeCreated.emit(node);
        return node;
    }
}

// Usage
const editor = new NodeEditor();

// Multiple subscribers can react to events
editor.events.nodeCreated.subscribe((node) => {
    console.log('Node created:', node.type);
});

editor.events.nodeCreated.subscribe((node) => {
    // Initialize node with default values
    node.initialize();
});
```

### Plugin System with Hooks

```typescript
class DataProcessor {
    public hooks = {
        beforeProcess: new SequentialHook<any, DataProcessor, any>(this),
        afterProcess: new SequentialHook<any, DataProcessor, any>(this),
        validate: new ParallelHook<any, boolean[], DataProcessor>(this)
    };
    
    public process(data: any): any {
        // Validation phase
        const validationResults = this.hooks.validate.execute(data);
        if (!validationResults.every(result => result)) {
            throw new Error('Validation failed');
        }
        
        // Pre-processing
        let processedData = this.hooks.beforeProcess.execute(data);
        
        // Main processing
        processedData = this.doProcess(processedData);
        
        // Post-processing
        processedData = this.hooks.afterProcess.execute(processedData);
        
        return processedData;
    }
}

// Plugin registration
const processor = new DataProcessor();

// Add validation plugin
processor.hooks.validate.subscribe((data) => {
    return data !== null && data !== undefined;
});

// Add transformation plugin
processor.hooks.beforeProcess.subscribe((data) => {
    return { ...data, timestamp: Date.now() };
});
```

### Event Aggregation with Proxies

```typescript
class MultiGraphEditor {
    private graphEvents = createProxy<Graph['events']>();
    private graphs: Set<Graph> = new Set();
    
    public addGraph(graph: Graph): void {
        this.graphs.add(graph);
        this.graphEvents.addTarget(graph.events);
    }
    
    public removeGraph(graph: Graph): void {
        this.graphs.delete(graph);
        this.graphEvents.removeTarget(graph.events);
    }
    
    public get events() {
        return this.graphEvents;
    }
}

// Usage
const editor = new MultiGraphEditor();

// Subscribe to events from all graphs
editor.events.nodeAdded.subscribe((node, graph) => {
    console.log(`Node added to graph ${graph.id}`);
});

// Add graphs
editor.addGraph(graph1);
editor.addGraph(graph2);
```

---

## Best Practices

### Event Management

1. **Clean Up Subscriptions**: Always unsubscribe when components are destroyed

```typescript
class MyComponent {
    private unsubscribe: () => void;
    
    constructor(private emitter: MyEmitter) {
        this.unsubscribe = emitter.events.dataChanged.subscribe(this.handleDataChange);
    }
    
    public destroy(): void {
        this.unsubscribe();
    }
}
```

2. **Use Preventable Events for Validation**: Use preventable events when you need to validate actions before they occur

```typescript
// Good: Allow validation
emitter.events.beforeDelete.subscribe((item, prevent) => {
    if (item.isProtected) {
        prevent();
    }
});

// Bad: No validation capability
emitter.events.itemDeleted.subscribe((item) => {
    // Too late to prevent
});
```

### Hook Management

1. **Order Matters**: Be aware of execution order in sequential hooks

```typescript
// This hook runs first
processor.hooks.beforeProcess.subscribe((data) => {
    return { ...data, stage: 'pre-processing' };
});

// This hook runs second, receives modified data
processor.hooks.beforeProcess.subscribe((data) => {
    console.log(data.stage); // 'pre-processing'
    return data;
});
```

2. **Use Parallel Hooks for Independent Operations**: Use parallel hooks when operations don't depend on each other

```typescript
// Good: Independent validations
validator.hooks.validate.subscribe((data) => data.length > 0);
validator.hooks.validate.subscribe((data) => data.includes('@'));

// Bad: Dependent operations in parallel
processor.hooks.process.subscribe((data) => data.toUpperCase());
processor.hooks.process.subscribe((data) => data + '!'); // Order not guaranteed
```

### Performance Considerations

1. **Minimize Event Emissions**: Batch operations when possible

```typescript
// Bad: Emit for each item
items.forEach(item => emitter.events.itemAdded.emit(item));

// Good: Emit once with all items
emitter.events.itemsAdded.emit(items);
```

2. **Use Proxies Wisely**: Proxies add overhead, use them only when needed

```typescript
// Good: Direct subscription for single target
target.events.someEvent.subscribe(handler);

// Good: Proxy for multiple targets
proxy.events.someEvent.subscribe(handler);

// Bad: Proxy for single target (unnecessary overhead)
proxy.events.someEvent.subscribe(handler);
```

3. **Clean Up Proxies**: Destroy proxies when no longer needed

```typescript
class MyManager {
    private proxy = createProxy<Events>();
    
    public destroy(): void {
        this.proxy.destroy();
    }
}
```

---

## Error Handling

### Event Errors

```typescript
// Wrap event handlers in try-catch
emitter.events.someEvent.subscribe((data) => {
    try {
        // Handle event
    } catch (error) {
        console.error('Event handler error:', error);
    }
});
```

### Hook Errors

```typescript
// Sequential hooks will stop on first error
try {
    const result = processor.hooks.process.execute(data);
} catch (error) {
    console.error('Hook processing error:', error);
}

// Parallel hooks collect all results, including errors
const results = validator.hooks.validate.execute(data);
results.forEach((result, index) => {
    if (result instanceof Error) {
        console.error(`Hook ${index} error:`, result);
    }
});
```

---

## Integration with BaklavaJS

The events system is used throughout BaklavaJS:

### Editor Events

```typescript
editor.events.registerNodeType.subscribe(({ type, options }) => {
    console.log('Node type registered:', type);
});

editor.events.loaded.subscribe(() => {
    console.log('Editor state loaded');
});
```

### Graph Events

```typescript
graph.events.addNode.subscribe((node) => {
    console.log('Node added:', node.type);
});

graph.events.beforeAddConnection.subscribe(({ from, to }, prevent) => {
    if (!isValidConnection(from, to)) {
        prevent();
    }
});
```

### Node Events

```typescript
node.events.titleChanged.subscribe((newTitle) => {
    console.log('Node title changed:', newTitle);
});

node.events.update.subscribe(({ type, name, intf }) => {
    console.log(`Interface ${name} value changed`);
});
```

### Engine Hooks

```typescript
engine.hooks.transferData.tap('MyPlugin', (value, connection) => {
    // Transform data as it flows through connections
    return transformValue(value);
});
```

This comprehensive event system provides the foundation for BaklavaJS's reactive architecture, enabling powerful plugin systems and extensible functionality.