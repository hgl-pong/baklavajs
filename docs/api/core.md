# @baklavajs/core API Reference

## Overview

`@baklavajs/core` is the foundational package of BaklavaJS, providing the core functionality for creating and managing node-based graphs. This package contains the essential building blocks including the Editor, Graph, Node, and Connection classes.

## Installation

```bash
npm install @baklavajs/core
# or
yarn add @baklavajs/core
```

## Core Classes

### Editor

The main controller class that manages the entire node editor system.

```typescript
import { Editor } from '@baklavajs/core';

const editor = new Editor();
```

#### Properties

- **`graph: Graph`** - The root graph instance
- **`graphs: ReadonlySet<Graph>`** - Set of all graphs including subgraphs
- **`nodeTypes: ReadonlyMap<string, INodeTypeInformation>`** - Registered node types
- **`graphTemplates: ReadonlyArray<GraphTemplate>`** - Available graph templates
- **`loading: boolean`** - Whether the editor is currently loading

#### Events

- **`loaded`** - Emitted when editor finishes loading
- **`registerNodeType`** - Emitted when a node type is registered
- **`unregisterNodeType`** - Emitted when a node type is unregistered
- **`addGraphTemplate`** - Emitted when a graph template is added
- **`removeGraphTemplate`** - Emitted when a graph template is removed

#### Methods

##### `registerNodeType(type: AbstractNodeConstructor, options?: IRegisterNodeTypeOptions): void`

Register a new node type with the editor.

```typescript
editor.registerNodeType(MyNode, { 
    category: "Math", 
    title: "Custom Calculator" 
});
```

**Parameters:**
- `type` - Node constructor class
- `options` - Optional configuration including category and title

##### `unregisterNodeType(type: AbstractNodeConstructor | string): void`

Remove a node type from the editor. This will also remove all existing nodes of this type.

##### `addGraphTemplate(template: GraphTemplate): void`

Add a graph template for creating subgraphs.

##### `removeGraphTemplate(template: GraphTemplate): void`

Remove a graph template and all associated subgraph nodes.

##### `load(state: IEditorState): string[]`

Load a saved editor state.

**Returns:** Array of warning messages (empty if successful)

##### `save(): IEditorState`

Save the current editor state.

**Returns:** Serialized editor state

---

### Graph

Container for nodes and connections with transaction support.

```typescript
const graph = editor.graph; // Access the root graph
```

#### Properties

- **`id: string`** - Unique identifier for the graph
- **`nodes: ReadonlyArray<AbstractNode>`** - All nodes in the graph
- **`connections: ReadonlyArray<Connection>`** - All connections in the graph
- **`inputs: IGraphInterface[]`** - Graph input interfaces
- **`outputs: IGraphInterface[]`** - Graph output interfaces
- **`loading: boolean`** - Whether the graph is currently loading
- **`destroying: boolean`** - Whether the graph is being destroyed

#### Events

- **`addNode`** - Emitted when a node is added
- **`removeNode`** - Emitted when a node is removed
- **`addConnection`** - Emitted when a connection is created
- **`removeConnection`** - Emitted when a connection is removed
- **`checkConnection`** - Emitted when validating a connection

#### Methods

##### `addNode<T extends AbstractNode>(node: T): T | undefined`

Add a node to the graph.

```typescript
const node = new MyNode();
const addedNode = graph.addNode(node);
```

**Returns:** The added node or undefined if prevented

##### `removeNode(node: AbstractNode): void`

Remove a node and all its connections from the graph.

##### `addConnection(from: NodeInterface, to: NodeInterface): Connection | undefined`

Create a connection between two node interfaces.

```typescript
const connection = graph.addNode(node1.outputs.output, node2.inputs.input);
```

**Returns:** The created connection or undefined if invalid

##### `removeConnection(connection: Connection): void`

Remove a connection from the graph.

##### `checkConnection(from: NodeInterface, to: NodeInterface): CheckConnectionResult`

Validate if a connection between two interfaces is allowed.

**Returns:** Connection validation result

##### `findNodeById(id: string): AbstractNode | undefined`

Find a node by its ID.

##### `findNodeInterface(id: string): NodeInterface<any> | undefined`

Find a node interface by its ID.

##### `load(state: IGraphState): string[]`

Load a saved graph state.

##### `save(): IGraphState`

Save the current graph state.

##### `transaction<T>(fn: () => T): T`

Execute multiple operations as a single transaction (reduces event emissions).

```typescript
graph.transaction(() => {
    graph.addNode(node1);
    graph.addNode(node2);
    graph.addConnection(node1.outputs.output, node2.inputs.input);
});
```

---

### AbstractNode

Base class for all node types. Provides core functionality and lifecycle management.

```typescript
import { AbstractNode, NodeInterface } from '@baklavajs/core';

class MyNode extends AbstractNode {
    public type = "MyNode";
    public inputs = { input: new NodeInterface("Input", 0) };
    public outputs = { output: new NodeInterface("Output", 0) };
    
    public calculate(inputs: { input: number }) {
        return { output: inputs.input * 2 };
    }
}
```

#### Properties

- **`type: string`** - Unique type identifier (abstract)
- **`id: string`** - Unique instance identifier
- **`title: string`** - Display name of the node
- **`comment: string`** - Node description/comment
- **`titleBackgroundColor: string`** - Custom title background color
- **`titleForegroundColor: string`** - Custom title foreground color
- **`inputs: Record<string, NodeInterface<any>>`** - Input interfaces
- **`outputs: Record<string, NodeInterface<any>>`** - Output interfaces
- **`graph?: Graph`** - Graph instance the node belongs to

#### Events

- **`loaded`** - Emitted when node state is loaded
- **`addInput`** - Emitted when an input interface is added
- **`removeInput`** - Emitted when an input interface is removed
- **`addOutput`** - Emitted when an output interface is added
- **`removeOutput`** - Emitted when an output interface is removed
- **`titleChanged`** - Emitted when node title changes
- **`update`** - Emitted when node interface values change

#### Methods

##### `calculate(inputs: I, context: CalculationContext): CalculateFunctionReturnType<O>`

Main calculation method for the node. Override this to implement node logic.

```typescript
public calculate(inputs: { a: number, b: number }) {
    return { result: inputs.a + inputs.b };
}
```

**Parameters:**
- `inputs` - Values from connected input interfaces
- `context` - Calculation context with global values and engine reference

**Returns:** Output values or Promise for async operations

##### `onPlaced(): void`

Called when the node is added to a graph. Override for initialization logic.

##### `onDestroy(): void`

Called when the node is removed from a graph. Override for cleanup logic.

##### `load(state: INodeState): void`

Load node state from saved data.

##### `save(): INodeState`

Save current node state.

---

### Node

Generic typed base class extending AbstractNode with strongly-typed inputs and outputs.

```typescript
interface MyNodeInputs {
    a: number;
    b: number;
}

interface MyNodeOutputs {
    result: number;
}

class MyNode extends Node<MyNodeInputs, MyNodeOutputs> {
    public type = "MyNode";
    public inputs = {
        a: new NodeInterface("A", 0),
        b: new NodeInterface("B", 0)
    };
    public outputs = {
        result: new NodeInterface("Result", 0)
    };
    
    public calculate(inputs: MyNodeInputs) {
        return { result: inputs.a + inputs.b };
    }
}
```

---

### NodeInterface

Represents an input or output connection point on a node.

```typescript
const inputInterface = new NodeInterface("Input", defaultValue);
```

#### Constructor

```typescript
new NodeInterface<T>(name: string, value: T)
```

**Parameters:**
- `name` - Display name of the interface
- `value` - Default value for the interface

#### Properties

- **`id: string`** - Unique identifier
- **`name: string`** - Display name
- **`value: T`** - Current value
- **`isInput: boolean`** - Whether this is an input interface
- **`nodeId: string`** - ID of the parent node
- **`connections: Connection[]`** - Connected connections
- **`connectionCount: number`** - Number of connections

#### Events

- **`setValue`** - Emitted when interface value changes

#### Methods

##### `setValue(value: T, emitEvent: boolean = true): void`

Set the interface value.

##### `addConnection(connection: Connection): void`

Add a connection to this interface.

##### `removeConnection(connection: Connection): void`

Remove a connection from this interface.

##### `load(state: INodeInterfaceState): void`

Load interface state.

##### `save(): INodeInterfaceState`

Save interface state.

---

### Connection

Represents a connection between two node interfaces.

#### Properties

- **`id: string`** - Unique identifier
- **`from: NodeInterface`** - Source interface (output)
- **`to: NodeInterface`** - Target interface (input)
- **`reroutePoints: IReroutePoint[]`** - Optional reroute points for visual routing

#### Methods

##### `destruct(): void`

Clean up connection resources.

---

### Utility Functions

#### `defineNode(options: DefineNodeOptions): AbstractNodeConstructor`

Helper function to define nodes using object syntax.

```typescript
const MathNode = defineNode({
    type: "MathNode",
    title: "Math Operation",
    inputs: {
        a: () => new NumberInterface("A", 0),
        b: () => new NumberInterface("B", 0)
    },
    outputs: {
        result: () => new NodeInterface("Result", 0)
    },
    calculate({ a, b }) {
        return { result: a + b };
    }
});
```

#### `defineDynamicNode(options: DefineDynamicNodeOptions): AbstractNodeConstructor`

Create nodes with dynamically generated interfaces based on configuration.

## Type Definitions

### IEditorState

```typescript
interface IEditorState {
    graph: IGraphState;
    graphTemplates: IGraphTemplateState[];
}
```

### IGraphState

```typescript
interface IGraphState {
    id: string;
    nodes: Array<INodeState<unknown, unknown>>;
    connections: IConnectionState[];
    inputs: Readonly<IGraphInterface[]>;
    outputs: Readonly<IGraphInterface[]>;
}
```

### INodeState

```typescript
interface INodeState<I, O> {
    type: string;
    title: string;
    id: string;
    comment?: string;
    width?: number;
    height?: number;
    titleBackgroundColor?: string;
    titleForegroundColor?: string;
    inputs: NodeInterfaceDefinitionStates<I>;
    outputs: NodeInterfaceDefinitionStates<O>;
}
```

### CalculationContext

```typescript
interface CalculationContext<G = any, E extends IEngine<G> = IEngine<G>> {
    globalValues: G;
    engine: E;
}
```

## Best Practices

1. **Node Creation**: Use `defineNode` for simple nodes, extend `Node` class for complex logic
2. **Event Handling**: Subscribe to events for reactive updates, but remember to unsubscribe
3. **State Management**: Use transactions for batch operations to improve performance
4. **Type Safety**: Leverage TypeScript generics for strongly-typed node interfaces
5. **Resource Cleanup**: Implement `onDestroy()` for proper resource management

## Error Handling

The core package provides comprehensive error handling through:

- **Event prevention**: Many operations can be prevented by event handlers
- **Validation**: Connection validation prevents invalid graph structures
- **Loading warnings**: Non-critical issues during state loading are collected as warnings
- **Type safety**: TypeScript interfaces provide compile-time type checking

## Performance Considerations

- Use `graph.transaction()` for bulk operations
- Minimize event subscriptions in performance-critical code
- Clean up unused event listeners to prevent memory leaks
- Consider lazy loading for large graphs