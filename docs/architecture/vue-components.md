# Vue Component Architecture

## Overview

The BaklavaJS Vue renderer uses a sophisticated component architecture built on Vue 3's Composition API. This architecture provides a flexible, performant, and extensible foundation for creating interactive node-based editors.

## Core Architecture Principles

### 1. Composition API
All components use Vue 3's Composition API for better logic reuse and type safety.

### 2. Reactive State Management
Leverages Vue's reactivity system for real-time updates and efficient rendering.

### 3. Component Composition
Uses slot-based composition for maximum flexibility and customization.

### 4. Event-Driven Communication
Components communicate through events and the central event system.

### 5. Performance Optimization
Implements virtual rendering, memoization, and efficient update strategies.

---

## Component Hierarchy

### Root Level Components

```
BaklavaEditor (Root)
├── Background
├── Toolbar
├── NodePalette
├── Sidebar
├── Minimap
├── GraphView
│   ├── ConnectionsContainer
│   │   ├── ConnectionWrapper
│   │   ├── ConnectionView
│   │   ├── ReroutePoint
│   │   └── TemporaryConnection
│   └── NodeContainer
│       ├── Node
│       │   ├── NodeInterface
│       │   └── (Interface Components)
│       └── SelectionBox
└── ContextMenu
```

### Detailed Component Breakdown

#### BaklavaEditor (Root Component)

**Purpose**: Main editor container and coordinator

**Key Responsibilities**:
- Coordinate all child components
- Handle global mouse/keyboard events
- Manage selection state
- Coordinate drag operations
- Provide slots for customization

**Architecture Pattern**: Container Component with Slots

```vue
<template>
    <div class="baklava-editor" @pointermove="onPointerMove">
        <slot name="background">
            <Background />
        </slot>
        
        <slot name="toolbar">
            <Toolbar v-if="viewModel.settings.toolbar.enabled" />
        </slot>
        
        <slot name="palette">
            <NodePalette v-if="viewModel.settings.palette.enabled" />
        </slot>
        
        <!-- Connection and node layers -->
        <svg class="connections-container">
            <ConnectionWrapper v-for="conn in connections" :key="conn.id" />
        </svg>
        
        <div class="node-container">
            <Node v-for="node in nodes" :key="node.id" />
        </div>
    </div>
</template>
```

#### Node Component

**Purpose**: Render individual nodes with interfaces and interactions

**Key Features**:
- Drag and drop functionality
- Interface management
- Context menu integration
- Title editing and color customization
- Comment support

**State Management**:
```typescript
const { node, selected, dragging } = toRefs(props);
const { viewModel } = useViewModel();

// Local state
const renaming = ref(false);
const showContextMenu = ref(false);
const editingComment = ref(false);
```

**Event Handling**:
```typescript
const select = () => {
    viewModel.commandHandler.executeCommand("SELECT_NODE", { node: node.value });
};

const startDrag = (evt: PointerEvent) => {
    emit('start-drag', evt);
};
```

#### NodeInterface Component

**Purpose**: Render individual node interfaces with type-specific components

**Dynamic Component Loading**:
```typescript
const component = computed(() => {
    const intf = props.intf;
    const componentName = intf.componentName || 'TextInterface';
    return viewModel.settings.customComponents.get(componentName) || 
           interfaceComponents[componentName] || 
           TextInterface;
});
```

**Interface Types**:
- `TextInterface` - Read-only text display
- `TextInputInterface` - Text input field
- `NumberInterface` - Numeric input with validation
- `SelectInterface` - Dropdown selection
- `CheckboxInterface` - Boolean toggle
- `SliderInterface` - Range slider
- `ButtonInterface` - Clickable button
- `TextareaInputInterface` - Multi-line text input

#### Connection Components

**ConnectionWrapper**: Manages connection lifecycle and interactions
**ConnectionView**: Renders the visual connection path
**ReroutePoint**: Handles connection rerouting points
**TemporaryConnection**: Shows connection during creation

**Path Calculation**:
```typescript
const path = computed(() => {
    const { from, to, reroutePoints } = connection.value;
    const start = portCoordinates.getPortCoordinates(from);
    const end = portCoordinates.getPortCoordinates(to);
    
    return calculateConnectionPath(start, end, reroutePoints);
});
```

---

## State Management Architecture

### View Model Pattern

The editor uses a centralized view model that coordinates between different parts of the system:

```typescript
interface IViewModel {
    editor: Editor;                          // Core editor instance
    commandHandler: ICommandHandler;        // Command system
    history: IHistoryManager;               // Undo/redo system
    settings: IViewSettings;                // Editor configuration
    events: IViewModelEvents;               // View-specific events
    displayPlugin: IDisplayPlugin;          // Display utilities
}
```

### Reactive State

Components use Vue's reactivity system for efficient state management:

```typescript
// Global reactive state
const selectedNodes = ref<AbstractNode[]>([]);
const connections = ref<Connection[]>([]);
const transform = ref({ x: 0, y: 0, scale: 1 });

// Computed properties
const visibleNodes = computed(() => 
    nodes.value.filter(node => isInViewport(node, transform.value))
);
```

### State Synchronization

```typescript
// Sync with core editor
watch(() => editor.graph.nodes, (newNodes) => {
    nodes.value = newNodes;
}, { deep: true });
```

---

## Event Communication Architecture

### Component Events

Components emit events for user interactions:

```typescript
// Node events
emit('select', node);
emit('start-drag', event);
emit('interface-click', interface);

// Editor events
emit('node-selected', node);
emit('connection-created', connection);
```

### Global Event System

Integration with the core event system:

```typescript
// Subscribe to editor events
editor.events.addNode.subscribe((node) => {
    // Update component state
});

// Emit view-specific events
viewModel.events.nodeSelected.emit(node);
```

### Command Pattern

User actions are executed through the command system:

```typescript
const executeCommand = (command: string, payload: any) => {
    viewModel.commandHandler.executeCommand(command, payload);
};
```

---

## Performance Optimization Strategies

### 1. Virtual Rendering

Only render visible components:

```typescript
const visibleNodes = computed(() => {
    const viewport = getViewport(transform.value);
    return nodes.value.filter(node => 
        isInViewport(node.position, viewport)
    );
});
```

### 2. Memoization

Cache expensive computations:

```typescript
const nodePath = useMemo(() => 
    calculateNodePath(node.value, connections.value),
    [node.value.id, connections.value.length]
);
```

### 3. Efficient Updates

Use Vue's reactivity system efficiently:

```typescript
// Good: Computed properties
const filteredNodes = computed(() => 
    nodes.value.filter(n => n.type === 'custom')
);

// Avoid: Manual filtering in template
// v-for="node in nodes.filter(n => n.type === 'custom')"
```

### 4. Event Delegation

Handle events at the container level:

```typescript
// Editor level event handling
const onPointerMove = (evt: PointerEvent) => {
    if (isDragging.value) {
        handleDrag(evt);
    } else if (isConnecting.value) {
        handleConnection(evt);
    }
};
```

### 5. Lazy Loading

Load components on demand:

```typescript
const Minimap = defineAsyncComponent(() => 
    import('./components/Minimap.vue')
);
```

---

## Plugin Architecture

### Custom Components

Register custom node and interface components:

```typescript
// Custom node renderer
const CustomNode = defineComponent({
    props: ['node', 'selected'],
    setup(props) {
        return () => h('div', {
            class: ['custom-node', { selected: props.selected }]
        }, props.node.title);
    }
});

// Register with view model
viewModel.settings.customComponents.set('CustomNode', CustomNode);
```

### Custom Interface Components

```typescript
// Custom interface component
const ColorPickerInterface = defineComponent({
    props: ['intf', 'value'],
    setup(props) {
        const color = ref(props.value);
        
        return () => h('input', {
            type: 'color',
            value: color.value,
            onInput: (e) => {
                color.value = e.target.value;
                props.intf.setValue(color.value);
            }
        });
    }
});

// Register interface type
viewModel.settings.customComponents.set('ColorPicker', ColorPickerInterface);
```

### Hook System

Extend functionality through hooks:

```typescript
// View model hooks
viewModel.hooks.renderInterface.tap('MyPlugin', ({ intf, el }) => {
    el.setAttribute('data-custom-type', intf.type);
    return { intf, el };
});
```

---

## Component Lifecycle Management

### 1. Mounting and Initialization

```typescript
onMounted(() => {
    // Initialize DOM references
    el.value = refElement;
    
    // Set up event listeners
    window.addEventListener('resize', handleResize);
    
    // Initialize plugins
    initializePlugins();
});
```

### 2. Update Handling

```typescript
watch(() => props.node, (newNode, oldNode) => {
    if (newNode !== oldNode) {
        // Handle node change
        resetState();
    }
}, { immediate: true });
```

### 3. Cleanup

```typescript
onUnmounted(() => {
    // Remove event listeners
    window.removeEventListener('resize', handleResize);
    
    // Clean up subscriptions
    subscriptions.forEach(unsubscribe => unsubscribe());
    
    // Release resources
    cleanupResources();
});
```

---

## Theming and Styling Architecture

### CSS Custom Properties

Theme-based styling using CSS variables:

```css
.baklava-editor {
    --node-background: #2d3748;
    --node-border: #4a5568;
    --node-title-background: #1a202c;
    --connection-color: #4299e1;
    --selection-color: rgba(66, 153, 225, 0.3);
}
```

### Dynamic Theming

```typescript
const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    Object.entries(theme.variables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
};
```

### Component-Specific Styling

Scoped styles with CSS modules or scoped CSS:

```vue
<style scoped>
.baklava-node {
    /* Node-specific styles */
}

.__title {
    /* Title-specific styles */
}
</style>
```

---

## Testing Architecture

### Component Testing

```typescript
import { mount } from '@vue/test-utils';
import { Node } from '@/node/Node.vue';

describe('Node', () => {
    it('renders node with correct title', () => {
        const node = createTestNode({ title: 'Test Node' });
        const wrapper = mount(Node, {
            props: { node, selected: false }
        });
        expect(wrapper.find('.__title-label').text()).toBe('Test Node');
    });
    
    it('emits select event when clicked', async () => {
        const node = createTestNode();
        const wrapper = mount(Node, {
            props: { node, selected: false }
        });
        await wrapper.find('.baklava-node').trigger('click');
        expect(wrapper.emitted('select')).toBeTruthy();
    });
});
```

### Integration Testing

```typescript
describe('Editor Integration', () => {
    it('handles node creation and connection', async () => {
        const viewModel = createTestViewModel();
        const wrapper = mount(BaklavaEditor, {
            props: { viewModel }
        });
        
        // Create node
        await wrapper.vm.createNode('TestNode');
        
        // Verify node was created
        expect(viewModel.editor.graph.nodes.length).toBe(1);
    });
});
```

---

## Best Practices

### 1. Component Design

- **Single Responsibility**: Each component should have one clear purpose
- **Props Down, Events Up**: Follow unidirectional data flow
- **Slot-Based Composition**: Use slots for flexibility and customization
- **Type Safety**: Use TypeScript for prop and event definitions

### 2. Performance

- **Memoization**: Use computed properties for expensive calculations
- **Virtual Scrolling**: Implement for large lists
- **Efficient Updates**: Minimize re-renders with proper key management
- **Lazy Loading**: Load components and resources on demand

### 3. State Management

- **Local State**: Keep component-specific state local
- **Global State**: Use view model for shared state
- **Reactivity**: Leverage Vue's reactivity system effectively
- **Immutability**: Treat state as immutable for predictable updates

### 4. Error Handling

- **Graceful Degradation**: Handle errors without breaking the UI
- **User Feedback**: Provide clear error messages
- **Logging**: Log errors for debugging
- **Recovery**: Implement recovery mechanisms where possible

This comprehensive Vue component architecture provides a solid foundation for building extensible, performant node-based editors with BaklavaJS.