# @baklavajs/renderer-vue API Reference

## Overview

`@baklavajs/renderer-vue` provides Vue 3 components and utilities for rendering interactive node-based editors. This package offers a complete visual editing experience with drag-and-drop functionality, context menus, toolbars, and customizable themes.

## Installation

```bash
npm install @baklavajs/renderer-vue
# or
yarn add @baklavajs/renderer-vue
```

## Basic Usage

```vue
<template>
  <div style="width: 100%; height: 100vh;">
    <BaklavaEditor :view-model="baklava" />
  </div>
</template>

<script setup lang="ts">
import { BaklavaEditor, useBaklava } from '@baklavajs/renderer-vue';
import '@baklavajs/themes/dist/syrup-dark.css';

const baklava = useBaklava();
</script>
```

## Core Components

### BaklavaEditor

The main editor component that renders the node-based interface.

```vue
<template>
  <BaklavaEditor 
    :view-model="baklava" 
    :settings="customSettings"
    @node-selected="handleNodeSelected"
  />
</template>
```

#### Props

- **`view-model: IViewModel`** (required) - The view model instance from `useBaklava()`
- **`settings: Partial<IViewSettings>`** (optional) - Custom settings to override defaults

#### Events

- **`node-selected`** - Emitted when a node is selected
- **`connection-created`** - Emitted when a connection is created
- **`graph-changed`** - Emitted when the graph structure changes

---

## Composables

### useBaklava()

Main composable for creating and managing the editor view model.

```typescript
const baklava = useBaklava();
```

#### Returns

```typescript
interface IViewModel {
  editor: Editor;                          // Core editor instance
  commandHandler: ICommandHandler;        // Command system handler
  history: IHistoryManager;               // Undo/redo history
  settings: IViewSettings;                // Editor settings
  events: IViewModelEvents;               // View model events
  displayPlugin: IDisplayPlugin;          // Display plugin interface
}
```

#### Usage

```typescript
const baklava = useBaklava();

// Access editor
baklava.editor.registerNodeType(MyNode);

// Access settings
baklava.settings.useStraightConnections = true;

// Execute commands
baklava.commandHandler.executeCommand("DELETE_NODES", { nodes: selectedNodes });
```

### useViewModel()

Composable for accessing the view model in child components.

```typescript
const viewModel = useViewModel();
```

### useGraph()

Composable for working with the current graph.

```typescript
const { graph, switchGraph } = useGraph();
```

### useTransform()

Composable for managing pan and zoom transformations.

```typescript
const { transform, setTransform, zoomToFit } = useTransform();
```

---

## Command System

The renderer uses a comprehensive command system for all editor operations.

### Built-in Commands

#### Node Commands

- **`CREATE_NODE`** - Create a new node
- **`DELETE_NODES`** - Delete selected nodes
- **`DUPLICATE_NODES`** - Duplicate selected nodes
- **`SELECT_NODE`** - Select a node
- **`DESELECT_NODE`** - Deselect a node
- **`SELECT_ALL_NODES`** - Select all nodes
- **`DESELECT_ALL_NODES`** - Deselect all nodes

#### Connection Commands

- **`CREATE_CONNECTION`** - Create a connection between interfaces
- **`DELETE_CONNECTION`** - Delete a connection
- **`DELETE_REROUTE_POINT`** - Delete a reroute point

#### Graph Commands

- **`UNDO`** - Undo last operation
- **`REDO`** - Redo last operation
- **`CLEAR_SELECTION`** - Clear all selections
- **`FIT_TO_SCREEN`** - Zoom to fit all nodes
- **`ZOOM_IN`** - Zoom in
- **`ZOOM_OUT`** - Zoom out
- **`RESET_ZOOM`** - Reset zoom to default

#### Subgraph Commands

- **`CREATE_SUBGRAPH`** - Create subgraph from selection
- **`SAVE_SUBGRAPH`** - Save current subgraph
- **`SWITCH_TO_MAIN_GRAPH`** - Switch to main graph

### Command Execution

```typescript
// Execute a command
const result = baklava.commandHandler.executeCommand("DELETE_NODES", {
  nodes: [node1, node2]
});

// Check if command can execute
const canExecute = baklava.commandHandler.canExecute("UNDO");

// Register custom command
baklava.commandHandler.registerCommand("CUSTOM_COMMAND", {
  execute: (context) => {
    // Command implementation
  },
  canExecute: (context) => {
    return true;
  }
});
```

### Custom Commands

```typescript
interface ICommand<Returns = any, Arguments extends Array<any> = []> {
  execute(...args: Arguments): Returns;
  canExecute(...args: Arguments): boolean;
}

// Register custom command
baklava.commandHandler.registerCommand("ANALYZE_GRAPH", {
  execute: (context) => {
    const analysis = {
      nodeCount: baklava.editor.graph.nodes.length,
      connectionCount: baklava.editor.graph.connections.length
    };
    return analysis;
  },
  canExecute: (context) => {
    return baklava.editor.graph.nodes.length > 0;
  }
});
```

---

## Settings Configuration

### IViewSettings

Comprehensive settings interface for customizing the editor appearance and behavior.

```typescript
interface IViewSettings {
  useStraightConnections: boolean;          // Use straight lines instead of curves
  enableMinimap: boolean;                  // Show minimap
  displayValueOnHover: boolean;            // Show values on port hover
  
  toolbar: {
    enabled: boolean;
    commands: ToolbarCommand[];
    subgraphCommands: ToolbarCommand[];
  };
  
  palette: {
    enabled: boolean;
  };
  
  sidebar: {
    enabled: boolean;
    width: number;
    resizable: boolean;
  };
  
  nodes: {
    minWidth: number;
    maxWidth: number;
    defaultWidth: number;
    resizable: boolean;
    reverseY: boolean;
  };
  
  contextMenu: {
    enabled: boolean;
    additionalItems: ContextMenuItem[];
  };
  
  zoomToFit: {
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
  };
}
```

### Custom Settings Example

```typescript
const customSettings = {
  useStraightConnections: true,
  enableMinimap: true,
  toolbar: {
    enabled: true,
    commands: ["UNDO", "REDO", "DELETE_NODES", "FIT_TO_SCREEN"]
  },
  nodes: {
    defaultWidth: 250,
    resizable: true
  },
  contextMenu: {
    additionalItems: [
      { label: "Custom Action", command: "CUSTOM_COMMAND" },
      { isDivider: true },
      {
        label: "Submenu",
        submenu: [
          { label: "Option 1", command: "OPTION_1" },
          { label: "Option 2", command: "OPTION_2" }
        ]
      }
    ]
  }
};
```

---

## Interface Types

### Node Interfaces

Pre-built interface components for common data types:

#### NumberInterface
```typescript
import { NumberInterface } from '@baklavajs/renderer-vue';

const node = defineNode({
  type: "MathNode",
  inputs: {
    value: () => new NumberInterface("Value", 0)
  }
});
```

#### TextInputInterface
```typescript
import { TextInputInterface } from '@baklavajs/renderer-vue';

const node = defineNode({
  type: "TextNode",
  inputs: {
    text: () => new TextInputInterface("Text", "")
  }
});
```

#### SelectInterface
```typescript
import { SelectInterface } from '@baklavajs/renderer-vue';

const node = defineNode({
  type: "ChoiceNode",
  inputs: {
    option: () => new SelectInterface("Option", "a", ["a", "b", "c"])
  }
});
```

#### CheckboxInterface
```typescript
import { CheckboxInterface } from '@baklavajs/renderer-vue';

const node = defineNode({
  type: "ToggleNode",
  inputs: {
    enabled: () => new CheckboxInterface("Enabled", false)
  }
});
```

#### SliderInterface
```typescript
import { SliderInterface } from '@baklavajs/renderer-vue';

const node = defineNode({
  type: "RangeNode",
  inputs: {
    value: () => new SliderInterface("Value", 50, { min: 0, max: 100 })
  }
});
```

### Custom Interface Components

```typescript
// Create custom interface component
const CustomInterface = defineComponent({
  props: ['interface', 'value'],
  setup(props) {
    const updateValue = (newValue: string) => {
      props.interface.setValue(newValue);
    };
    
    return () => h('input', {
      value: props.value,
      onInput: (e) => updateValue(e.target.value),
      class: 'custom-interface'
    });
  }
});

// Register custom component
baklava.settings.customComponents.set("CustomInterface", CustomInterface);
```

---

## System Clipboard

Built-in system clipboard functionality for copying and pasting nodes using native browser APIs.

```typescript
import { useBaklava } from '@baklavajs/renderer-vue';

// Get view model and clipboard instance
const baklava = useBaklava();

// Copy selected nodes (Ctrl+C or through commands)
baklava.commandHandler.executeCommand("COPY");

// Paste from clipboard (Ctrl+V or through commands)
await baklava.commandHandler.executeCommand("PASTE");

// Check clipboard state (best effort)
console.log(baklava.clipboard.isEmpty);
```

### Clipboard API

Access the clipboard instance from the Baklava view model.

```typescript
import { useBaklava } from '@baklavajs/renderer-vue';

const baklava = useBaklava();
const clipboard = baklava.clipboard;

// Access clipboard state
console.log(clipboard.isEmpty); // boolean
```

---

## History Management

Built-in undo/redo functionality with command history.

```typescript
// Access history
const history = baklava.history;

// Undo
history.undo();

// Redo
history.redo();

// Check state
console.log(history.canUndo); // true/false
console.log(history.canRedo); // true/false

// Clear history
history.clear();
```

---

## Sidebar Integration

Display custom information in the sidebar.

```typescript
import { displayInSidebar } from '@baklavajs/renderer-vue';

// Register sidebar component
const NodeInfoComponent = defineComponent({
  props: ['node'],
  setup(props) {
    return () => h('div', [
      h('h3', 'Node Information'),
      h('p', `Type: ${props.node.type}`),
      h('p', `ID: ${props.node.id}`)
    ]);
  }
});

// Register for specific node type
displayInSidebar("MyNode", NodeInfoComponent);
```

---

## Vue Component Architecture

### Component Hierarchy

```
BaklavaEditor (Root)
├── Sidebar
├── Toolbar
├── Palette
├── GraphView
│   ├── ConnectionLayer
│   ├── NodeLayer
│   │   ├── NodeComponent
│   │   └── InterfaceComponent
│   └── SelectionBox
└── ContextMenu
```

### Custom Node Renderers

```typescript
// Create custom node component
const CustomNodeRenderer = defineComponent({
  props: ['node', 'selected'],
  setup(props) {
    return () => h('div', {
      class: ['custom-node', { selected: props.selected }],
      style: {
        backgroundColor: props.node.titleBackgroundColor
      }
    }, [
      h('div', { class: 'node-header' }, props.node.title),
      h('div', { class: 'node-content' }, 'Custom content')
    ]);
  }
});

// Register custom renderer
baklava.settings.customComponents.set("CustomNode", CustomNodeRenderer);
```

---

## Events and Hooks

### View Model Events

```typescript
interface IViewModelEvents {
  nodeSelected: BaklavaEvent<AbstractNode, IViewModel>;
  nodeDeselected: BaklavaEvent<AbstractNode, IViewModel>;
  connectionCreated: BaklavaEvent<Connection, IViewModel>;
  graphChanged: BaklavaEvent<void, IViewModel>;
}
```

### Event Subscription

```typescript
// Subscribe to events
baklava.events.nodeSelected.subscribe((node) => {
  console.log('Node selected:', node.type);
});

// Unsubscribe when done
const unsubscribe = baklava.events.nodeSelected.subscribe(handler);
// Later: unsubscribe();
```

---

## Performance Optimization

### Virtual Rendering

The renderer uses virtual rendering techniques for optimal performance:

- **Node Virtualization**: Only visible nodes are rendered
- **Connection Caching**: Connection paths are cached for better performance
- **Event Delegation**: Events are handled at the graph level
- **Lazy Loading**: Components are loaded on demand

### Best Practices

1. **Use Transactions**: Group multiple operations to reduce re-renders
2. **Debounce Events**: Use debouncing for frequent events like value changes
3. **Optimize Components**: Use `v-memo` for expensive components
4. **Memory Management**: Clean up event listeners and subscriptions

```typescript
// Use transactions for batch operations
baklava.editor.graph.transaction(() => {
  graph.addNode(node1);
  graph.addNode(node2);
  graph.addConnection(node1.outputs.output, node2.inputs.input);
});
```

---

## Type Definitions

### IViewModel

```typescript
interface IViewModel {
  editor: Editor;
  commandHandler: ICommandHandler;
  history: IHistoryManager;
  settings: IViewSettings;
  events: IViewModelEvents;
  displayPlugin: IDisplayPlugin;
}
```

### ICommandHandler

```typescript
interface ICommandHandler {
  executeCommand<T extends keyof ICommandRegistry>(
    command: T,
    ...args: Parameters<ICommandRegistry[T]>
  ): ReturnType<ICommandRegistry[T]>;
  canExecute<T extends keyof ICommandRegistry>(command: T): boolean;
  registerCommand<T extends string>(
    command: T,
    implementation: ICommand<any, any[]>
  ): void;
}
```

### IHistoryManager

```typescript
interface IHistoryManager {
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
  clear(): void;
}
```

## Theming and Styling

### CSS Custom Properties

```css
.baklava-view {
  --node-background: #2d3748;
  --node-border: #4a5568;
  --node-title-background: #1a202c;
  --node-title-text: #ffffff;
  --connection-color: #4299e1;
  --grid-color: #2d3748;
  --selection-color: rgba(66, 153, 225, 0.3);
}
```

### Theme Integration

```typescript
import '@baklavajs/themes/dist/syrup-dark.css';
// or
import '@baklavajs/themes/dist/classic.css';
```

## Browser Compatibility

- Modern browsers with ES2019+ support
- Vue 3.0+
- TypeScript 4.5+

## Migration from v1

See the [migration guide](../migration.md) for detailed upgrade instructions.