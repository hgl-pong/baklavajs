# Event System Architecture

## Overview

The BaklavaJS event system provides a robust, scalable foundation for reactive programming and communication between components. Built on the `@baklavajs/events` package, this system enables loose coupling, plugin architecture, and real-time updates throughout the application.

## Core Architecture

### Event Flow

```
Emitter → Event → Listeners → Actions
    ↓
Event Data → Processing → Side Effects
```

### Key Components

1. **Event Emitters**: Objects that can emit events
2. **Event Listeners**: Functions that respond to events
3. **Event Bus**: Centralized event distribution
4. **Proxies**: Event aggregation and broadcasting
5. **Hooks**: Data transformation pipeline

---

## Event Types

### BaklavaEvent<T, E>

Standard one-to-many event communication.

```typescript
class NodeEditor {
    public events = {
        nodeCreated: new BaklavaEvent<Node, NodeEditor>(this),
        nodeDeleted: new BaklavaEvent<Node, NodeEditor>(this)
    };
}
```

**Characteristics:**
- Multiple listeners can subscribe
- All listeners receive the same data
- No prevention mechanism
- Execution order follows subscription order

### PreventableBaklavaEvent<T, E>

Events that can be prevented by listeners.

```typescript
class Graph {
    public events = {
        beforeAddConnection: new PreventableBaklavaEvent<ConnectionData, Graph>(this)
    };
}
```

**Characteristics:**
- Listeners can prevent the default action
- Execution stops at first prevention
- Returns prevention status
- Used for validation and authorization

---

## Event System Implementation

### Subscribable Base Class

```typescript
abstract class Subscribable<T> {
    private listeners: Set<T> = new Set();
    private proxies: Map<symbol, () => Iterable<T>> = new Map();
    
    public subscribe(listener: T): () => void {
        this.listeners.add(listener);
        return () => this.unsubscribe(listener);
    }
    
    public unsubscribe(listener: T): void {
        this.listeners.delete(listener);
    }
    
    public registerProxy(token: symbol, getListeners: () => Iterable<T>): void {
        this.proxies.set(token, getListeners);
    }
    
    public unregisterProxy(token: symbol): void {
        this.proxies.delete(token);
    }
    
    protected getAllListeners(): Iterable<T> {
        return [
            ...this.listeners,
            ...Array.from(this.proxies.values()).flatMap(getListeners)
        ];
    }
}
```

### Event Emission Process

```typescript
// BaklavaEvent.emit()
public emit(data: T): void {
    for (const listener of this.getAllListeners()) {
        listener(data, this.entity);
    }
}

// PreventableBaklavaEvent.emit()
public emit(data: T): { prevented: boolean } {
    let prevented = false;
    const prevent = () => { prevented = true; };
    
    for (const listener of this.getAllListeners()) {
        listener(data, prevent, this.entity);
        if (prevented) {
            return { prevented: true };
        }
    }
    
    return { prevented: false };
}
```

---

## Hook System Architecture

### SequentialHook<I, E, O>

Data transformation pipeline where output becomes input for next hook.

```typescript
class SequentialHook<I, E, O> {
    private listeners: Set<HookTap<I, O, E>> = new Set();
    
    public execute(data: I): O {
        let currentValue: O = data as O;
        
        for (const callback of this.listeners) {
            currentValue = callback(currentValue, this.entity);
        }
        
        return currentValue;
    }
}
```

**Execution Flow:**
```
Input → Hook1 → Hook2 → Hook3 → Output
```

### ParallelHook<I, O, E>

Execute multiple hooks simultaneously and collect all results.

```typescript
class ParallelHook<I, O, E> {
    public execute(data: I): O[] {
        const results: O[] = [];
        
        for (const callback of this.listeners) {
            results.push(callback(data, this.entity));
        }
        
        return results;
    }
}
```

**Execution Flow:**
```
Input → Hook1 → Result1
     → Hook2 → Result2
     → Hook3 → Result3
```

---

## Proxy System Architecture

### Event Proxy

```typescript
function createProxy<T extends Record<string, Subscribable<any>>>(): T & ISubscribableProxy<T> {
    const listeners: Map<string, Subscribable<any>> = new Map();
    const targets: Set<T> = new Set();
    
    return new Proxy({
        addTarget(target: T): void {
            targets.add(target);
            for (const [key, subscribable] of Object.entries(target)) {
                if (subscribable instanceof Subscribable) {
                    subscribable.registerProxy(token, () => 
                        listeners.get(key)?.getAllListeners() || []
                    );
                }
            }
        },
        
        removeTarget(target: T): void {
            targets.delete(target);
            // Remove proxy registration
        }
    }, {
        get(target, key: string) {
            if (!listeners.has(key)) {
                listeners.set(key, new Subscribable());
            }
            return listeners.get(key);
        }
    });
}
```

### Proxy Event Flow

```
Target1.Event → Proxy.Event → Listener
Target2.Event → Proxy.Event → Listener
Target3.Event → Proxy.Event → Listener
```

---

## Event System in BaklavaJS

### Editor Events

```typescript
class Editor {
    public events = {
        loaded: new BaklavaEvent<void, Editor>(this),
        registerNodeType: new BaklavaEvent<IAddNodeTypeEventData, Editor>(this),
        unregisterNodeType: new BaklavaEvent<string, Editor>(this),
        addGraphTemplate: new BaklavaEvent<GraphTemplate, Editor>(this),
        removeGraphTemplate: new BaklavaEvent<GraphTemplate, Editor>(this)
    };
    
    // Proxy events for all graphs
    public graphEvents = createProxy<Graph["events"]>();
    public nodeEvents = createProxy<AbstractNode["events"]>();
    public connectionEvents = createProxy<Connection["events"]>();
}
```

### Graph Events

```typescript
class Graph {
    public events = {
        addNode: new BaklavaEvent<AbstractNode, Graph>(this),
        removeNode: new BaklavaEvent<AbstractNode, Graph>(this),
        addConnection: new BaklavaEvent<Connection, Graph>(this),
        removeConnection: new BaklavaEvent<Connection, Graph>(this),
        checkConnection: new PreventableBaklavaEvent<IAddConnectionEventData, Graph>(this)
    };
    
    // Node and connection events
    public nodeEvents = createProxy<AbstractNode["events"]>();
    public connectionEvents = createProxy<Connection["events"]>();
}
```

### Node Events

```typescript
class AbstractNode {
    public events = {
        loaded: new BaklavaEvent<AbstractNode, AbstractNode>(this),
        addInput: new BaklavaEvent<NodeInterface, AbstractNode>(this),
        removeInput: new BaklavaEvent<NodeInterface, AbstractNode>(this),
        addOutput: new BaklavaEvent<NodeInterface, AbstractNode>(this),
        removeOutput: new BaklavaEvent<NodeInterface, AbstractNode>(this),
        titleChanged: new BaklavaEvent<string, AbstractNode>(this),
        update: new BaklavaEvent<INodeUpdateEventData, AbstractNode>(this)
    };
}
```

---

## Event Patterns

### 1. Publisher-Subscriber Pattern

```typescript
// Publisher
class EventEmitter {
    public events = {
        dataChanged: new BaklavaEvent<Data, EventEmitter>(this)
    };
    
    public updateData(data: Data): void {
        // Update internal state
        this.events.dataChanged.emit(data);
    }
}

// Subscriber
class DataConsumer {
    constructor(private emitter: EventEmitter) {
        this.emitter.events.dataChanged.subscribe(this.handleDataChange);
    }
    
    private handleDataChange(data: Data): void {
        // React to data changes
    }
}
```

### 2. Observer Pattern

```typescript
class ObservableNode {
    private observers: Set<NodeObserver> = new Set();
    
    public addObserver(observer: NodeObserver): void {
        this.observers.add(observer);
    }
    
    public removeObserver(observer: NodeObserver): void {
        this.observers.delete(observer);
    }
    
    public notifyObservers(event: NodeEvent): void {
        this.observers.forEach(observer => observer.onNodeEvent(event));
    }
}
```

### 3. Event Aggregation Pattern

```typescript
class EventAggregator {
    private eventBus = createProxy<Record<string, BaklavaEvent<any, any>>>();
    
    public addSource(source: EventSource): void {
        this.eventBus.addTarget(source.events);
    }
    
    public subscribe<T>(eventType: string, handler: (data: T) => void): () => void {
        return this.eventBus[eventType].subscribe(handler);
    }
}
```

### 4. Command Pattern with Events

```typescript
class CommandManager {
    public events = {
        beforeExecute: new PreventableBaklavaEvent<Command, CommandManager>(this),
        afterExecute: new BaklavaEvent<CommandResult, CommandManager>(this)
    };
    
    public async execute(command: Command): Promise<CommandResult> {
        const preventResult = this.events.beforeExecute.emit(command);
        if (preventResult.prevented) {
            throw new Error('Command execution prevented');
        }
        
        const result = await command.execute();
        
        this.events.afterExecute.emit(result);
        return result;
    }
}
```

---

## Performance Optimization

### 1. Event Debouncing

```typescript
class DebouncedEventEmitter {
    private debounceTimers: Map<string, number> = new Map();
    
    public emitDebounced(eventType: string, data: any, delay: number = 100): void {
        const timerId = this.debounceTimers.get(eventType);
        if (timerId) {
            clearTimeout(timerId);
        }
        
        const newTimerId = setTimeout(() => {
            this.events[eventType].emit(data);
            this.debounceTimers.delete(eventType);
        }, delay);
        
        this.debounceTimers.set(eventType, newTimerId);
    }
}
```

### 2. Event Batching

```typescript
class BatchEventEmitter {
    private eventQueue: Array<{ type: string; data: any }> = [];
    private batchTimer: number | null = null;
    
    public batchEmit(type: string, data: any): void {
        this.eventQueue.push({ type, data });
        
        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.flushBatch();
            }, 16); // ~60fps
        }
    }
    
    private flushBatch(): void {
        const batch = [...this.eventQueue];
        this.eventQueue = [];
        this.batchTimer = null;
        
        this.events.batchProcessed.emit(batch);
    }
}
```

### 3. Lazy Event Initialization

```typescript
class LazyEventEmitter {
    private events: Record<string, BaklavaEvent<any, any>> = {};
    
    public getEvent<T>(type: string): BaklavaEvent<T, this> {
        if (!this.events[type]) {
            this.events[type] = new BaklavaEvent<T, this>(this);
        }
        return this.events[type];
    }
}
```

### 4. Memory Management

```typescript
class ManagedEventEmitter {
    private subscriptions: Array<() => void> = [];
    
    public subscribe<T>(event: BaklavaEvent<T, any>, handler: (data: T) => void): void {
        const unsubscribe = event.subscribe(handler);
        this.subscriptions.push(unsubscribe);
    }
    
    public destroy(): void {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions = [];
    }
}
```

---

## Debugging and Monitoring

### Event Logger

```typescript
class EventLogger {
    public static logEvent<T, E>(event: BaklavaEvent<T, E>, data: T): void {
        console.log(`[${new Date().toISOString()}] Event: ${event.constructor.name}`, {
            entityType: event.entity.constructor.name,
            data: data
        });
    }
    
    public static wrapEvent<T, E>(event: BaklavaEvent<T, E>): BaklavaEvent<T, E> {
        const originalEmit = event.emit.bind(event);
        event.emit = (data: T) => {
            this.logEvent(event, data);
            return originalEmit(data);
        };
        return event;
    }
}
```

### Performance Monitor

```typescript
class EventPerformanceMonitor {
    private metrics: Map<string, Array<number>> = new Map();
    
    public monitorEvent<T, E>(event: BaklavaEvent<T, E>): void {
        const originalEmit = event.emit.bind(event);
        event.emit = (data: T) => {
            const startTime = performance.now();
            const result = originalEmit(data);
            const duration = performance.now() - startTime;
            
            const eventType = event.constructor.name;
            if (!this.metrics.has(eventType)) {
                this.metrics.set(eventType, []);
            }
            this.metrics.get(eventType)!.push(duration);
            
            return result;
        };
    }
    
    public getMetrics(eventType: string): { avg: number; max: number; min: number } {
        const durations = this.metrics.get(eventType) || [];
        if (durations.length === 0) return { avg: 0, max: 0, min: 0 };
        
        return {
            avg: durations.reduce((a, b) => a + b) / durations.length,
            max: Math.max(...durations),
            min: Math.min(...durations)
        };
    }
}
```

---

## Best Practices

### 1. Event Naming

```typescript
// Use clear, descriptive names
public events = {
    // Good: Specific and clear
    nodeCreated: new BaklavaEvent<Node, Editor>(this),
    connectionValidationFailed: new BaklavaEvent<ValidationError, Graph>(this),
    
    // Avoid: Vague or ambiguous
    somethingHappened: new BaklavaEvent<any, any>(this),
    event: new BaklavaEvent<void, any>(this)
};
```

### 2. Event Data Design

```typescript
// Good: Structured, typed event data
interface NodeCreatedEvent {
    node: Node;
    position: { x: number; y: number };
    source: 'user' | 'programmatic';
}

// Avoid: Unstructured data
events.nodeCreated.emit({ n: node, p: pos, s: 'user' });
```

### 3. Subscription Management

```typescript
class Component {
    private subscriptions: Array<() => void> = [];
    
    constructor(private emitter: EventEmitter) {
        this.subscriptions.push(
            emitter.events.dataChanged.subscribe(this.handleDataChange),
            emitter.events.stateChanged.subscribe(this.handleStateChange)
        );
    }
    
    public destroy(): void {
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions = [];
    }
}
```

### 4. Error Handling in Events

```typescript
// Wrap event handlers to prevent cascading failures
emitter.events.someEvent.subscribe((data) => {
    try {
        // Handle event
    } catch (error) {
        console.error('Event handler error:', error);
        // Optionally emit error event
        emitter.events.error.emit({ error, eventData: data });
    }
});
```

---

## Advanced Patterns

### 1. Event Sourcing

```typescript
class EventSourcedStore {
    private eventLog: Array<{ type: string; data: any; timestamp: number }> = [];
    private state: any;
    
    public applyEvent(type: string, data: any): void {
        const event = { type, data, timestamp: Date.now() };
        this.eventLog.push(event);
        this.state = this.reduceEvent(this.state, event);
        this.events.stateChanged.emit(this.state);
    }
    
    public replayEvents(): void {
        this.state = this.getInitialState();
        for (const event of this.eventLog) {
            this.state = this.reduceEvent(this.state, event);
        }
    }
}
```

### 2. Reactive Event Streams

```typescript
class EventStream<T> {
    private source: Observable<T>;
    
    constructor(event: BaklavaEvent<T, any>) {
        this.source = new Observable(subscriber => {
            const unsubscribe = event.subscribe((data) => {
                subscriber.next(data);
            });
            return () => unsubscribe();
        });
    }
    
    public map<U>(transform: (data: T) => U): EventStream<U> {
        return new EventStream(new BaklavaEvent<U, any>(this.source.entity));
    }
    
    public filter(predicate: (data: T) => boolean): EventStream<T> {
        return new EventStream(new BaklavaEvent<T, any>(this.source.entity));
    }
}
```

The event system architecture provides a powerful, flexible foundation for building reactive, extensible applications with BaklavaJS. By understanding these patterns and best practices, you can create robust, maintainable node-based applications.