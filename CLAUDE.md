# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BaklavaJS is a visual node editor for the web built with TypeScript and Vue 3. It provides a comprehensive graph editing system with strong emphasis on extensibility and type safety. The project follows a modular architecture with multiple packages that can be used independently or together.

### Key Features
- **Visual Node Editor**: Drag-and-drop interface for creating node-based graphs
- **Extensible Architecture**: Plugin-based system for custom nodes and interfaces
- **Type Safety**: Full TypeScript support with interface type checking
- **Multiple Execution Engines**: Dependency-based and forward execution models
- **Vue 3 Integration**: Modern reactive UI components with Composition API
- **Cross-Platform**: Web-based with Electron desktop app support
- **Theme System**: Customizable appearance with CSS variables
- **Real-time Collaboration**: Cross-tab clipboard and synchronization features

## Development Commands

### Core Development
```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests across all packages
yarn test

# Lint TypeScript and Vue files
yarn lint

# Clean build artifacts
yarn clean

# Generate TypeDoc API documentation
yarn generate-api-docs

# Run single test file (specific package)
cd packages/core && yarn test -- test/graph.spec.ts

# Run tests in watch mode
cd packages/core && yarn test --watch

# Check TypeScript compilation
cd packages/core && npx tsc --noEmit
```

### Vue Renderer Development
```bash
# Start development server for playground
yarn playground

# Start Vite dev server with hot reload
cd packages/renderer-vue && yarn dev

# Build Vue renderer
cd packages/renderer-vue && yarn build

# Build for Electron
cd packages/renderer-vue && yarn build:electron
```

### Electron App Development
```bash
# Development mode
yarn electron:dev

# Build Electron app
yarn build:electron

# Package Electron for distribution
yarn electron:dist
```

### Documentation
```bash
# Development server for docs
yarn docs:dev

# Build documentation site
yarn docs:build
```

### Package-Specific Development
```bash
# Build individual package
cd packages/core && yarn build

# Test individual package  
cd packages/core && yarn test

# Lint individual package
cd packages/core && yarn lint
```

## Architecture Overview

### Monorepo Structure

This project uses Lerna + Nx to manage a monorepo with the following packages:

| Package | Description | Key Dependencies |
|---------|-------------|------------------|
| `@baklavajs/events` | Event system foundation | None |
| `@baklavajs/core` | Core logic (editor, graph, nodes, connections) | `@baklavajs/events` |
| `@baklavajs/engine` | Execution engines (dependency, forward) | `@baklavajs/core`, `@baklavajs/events` |
| `@baklavajs/interface-types` | Type system and conversions | `@baklavajs/core` |
| `@baklavajs/renderer-vue` | Vue 3 UI components and editor | `@baklavajs/core`, `@baklavajs/events` |
| `@baklavajs/themes` | SCSS themes | None |
| `baklavajs` | Full bundle with all packages | All other packages |

### Core Technical Components

**Editor System:**
- `Editor` class (`packages/core/src/editor.ts`) - Main editor controller managing graphs and nodes
- `Graph` class (`packages/core/src/graph.ts`) - Container for nodes and connections with transaction support
- `Node` base class (`packages/core/src/node.ts`) - Extendable node implementations with event system
- `NodeInterface` class (`packages/core/src/nodeInterface.ts`) - Input/output connection points with value management
- `Connection` class (`packages/core/src/connection.ts`) - Links between node interfaces with routing

**Event System:**
- `BaklavaEvent` and `PreventableBaklavaEvent` (`packages/events/src/`) - Event foundation classes
- `SequentialHook` - Ordered hook execution system
- Node lifecycle events (create, place, destroy, update)
- Interface events (add, remove, value change)
- Graph transaction events for undo/redo support

**Execution Engines:**
- `DependencyEngine` (`packages/engine/src/DependencyEngine.ts`) - Topological sorting with dependency resolution
- `ForwardEngine` (`packages/engine/src/ForwardEngine.ts`) - Simple forward execution model
- `BaseEngine` (`packages/engine/src/BaseEngine.ts`) - Abstract base for custom engine implementations
- `EngineRegistry` (`packages/engine/src/EngineRegistry.ts`) - Multi-engine management system

**Vue Renderer:**
- Vue 3 Composition API throughout (`packages/renderer-vue/src/`)
- Component-based architecture for nodes and interfaces
- Built-in commands (undo/redo, copy/paste, zoom, etc.)
- Cross-tab clipboard functionality using localStorage
- Subgraph support with nested editing
- Context menu system with extensible items

**Type System:**
- `InterfaceType` base class (`packages/interface-types/src/`)
- Type validation and conversion rules
- Automatic type conversion between compatible types
- Extensible type definitions with custom validators
- Type compatibility checking for connections

**Node Color System:**
- `NODE_TYPE_COLORS` preset system (`packages/core/src/nodeColors.ts`)
- Automatic color assignment by node type
- Dynamic color application in palette and runtime
- User-customizable colors with persistence

### Package Build Process

Each package follows a consistent build pattern:
```json
{
  "build": "rimraf dist && yarn run build:esm && yarn run build:cjs && yarn run build:declaration"
}
```

Build outputs:
- `dist/esm/` - ES modules (ESM)
- `dist/cjs/` - CommonJS modules
- `dist/*.d.ts` - TypeScript declaration files

The Vue renderer uses Vite instead of tsc:
```json
{
  "build": "rimraf dist && vue-tsc --noEmit && vite build"
}
```

## Nx Workspace Integration

The project uses Nx for intelligent task orchestration:

```bash
# Run build with Nx caching
npx nx run-many --target=build

# Run tests with Nx caching  
npx nx run-many --target=test

# View project graph
npx nx graph
```

## Key Development Patterns

### Node Creation Patterns

**Standard Nodes (defineNode):**
```typescript
import { defineNode, NumberInterface, NodeInterface } from "@baklavajs/core";

export const MathNode = defineNode({
  type: "MathNode",
  title: "Math Operation", // Optional custom title
  titleBackgroundColor: "#007bff", // Optional: specify custom color
  titleForegroundColor: "#ffffff",
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
    // Called when node instance is created
    this.width = 150; // Set default width
  },
  onPlaced() {
    // Called when node is added to graph
  },
  onDestroy() {
    // Called when node is removed from graph
  }
});
```

**Dynamic Nodes (defineDynamicNode):**
```typescript
import { defineDynamicNode, SelectInterface } from "@baklavajs/core";

export const DynamicMathNode = defineDynamicNode({
  type: "DynamicMathNode",
  inputs: {
    operation: () => new SelectInterface("Operation", "add", ["add", "subtract", "multiply"])
  },
  outputs: {},
  onUpdate(inputs) {
    // Dynamically generate interfaces based on inputs
    return {
      inputs: {
        a: () => new NumberInterface("A", 0),
        b: () => new NumberInterface("B", 0)
      },
      outputs: {
        result: () => new NumberInterface("Result", 0)
      }
    };
  },
  calculate({ a, b, operation }) {
    switch (operation) {
      case "add": return { result: a + b };
      case "subtract": return { result: a - b };
      case "multiply": return { result: a * b };
      default: return { result: 0 };
    }
  }
});
```

**Class-based Nodes:**
```typescript
import { Node } from "@baklavajs/core";
import { NumberInterface } from "@baklavajs/core";

class CustomMathNode extends Node {
  public type = "CustomMathNode";
  public inputs = {
    a: new NumberInterface("A", 0),
    b: new NumberInterface("B", 0)
  };
  public outputs = {
    result: new NumberInterface("Result", 0)
  };

  constructor() {
    super();
    this.initializeIo();
    this.title = "Custom Math";
    this.titleBackgroundColor = "#28a745";
    this.titleForegroundColor = "#ffffff";
  }

  calculate() {
    return { result: this.inputs.a.value + this.inputs.b.value };
  }
}
```

### Node Color System
Nodes automatically receive default colors based on their type from the color preset system. Custom colors can be specified in the node definition or omitted to use automatic assignment.

**Color Preset System:**
```typescript
// packages/core/src/nodeColors.ts
export const NODE_TYPE_COLORS: Record<string, NodeColorPreset> = {
  'MathNode': { backgroundColor: '#007bff', foregroundColor: '#ffffff' },
  'TestNode': { backgroundColor: '#28a745', foregroundColor: '#ffffff' },
  // ... more presets
  'default': { backgroundColor: '#5379b5', foregroundColor: '#ffffff' }
};
```

### Vue Component Integration
```typescript
import { useBaklava } from "@baklavajs/renderer-vue";

const baklava = useBaklava();

// Register nodes with categories for organization
baklava.editor.registerNodeType(MathNode, { category: "Math" });
baklava.editor.registerNodeType(TestNode, { category: "Tests" });
baklava.editor.registerNodeType(OutputNode, { category: "Outputs" });

// Register custom node renderers
baklava.settings.customComponents.set("CustomNode", CustomNodeRenderer);
```

### Interface Types System
```typescript
import { InterfaceType, stringType, numberType } from "@baklavajs/interface-types";
import { setType } from "@baklavajs/interface-types";

// Create custom interface types
const customType = new InterfaceType("custom", {
  validate: (value) => typeof value === "string" && value.length > 0,
  convert: (value, fromType) => {
    if (fromType === numberType) {
      return value.toString();
    }
    return value;
  }
});

// Apply types to interfaces
export const TypedNode = defineNode({
  type: "TypedNode",
  inputs: {
    text: () => new TextInputInterface("Text", "").use(setType, stringType),
    number: () => new NumberInterface("Number", 0).use(setType, numberType)
  },
  // ...
});
```

### Command System
The renderer uses a comprehensive command system for editor operations:

**Built-in Commands:**
- Undo/redo with history management
- Copy/paste with cross-tab support
- Node manipulation commands (create, delete, duplicate)
- Graph navigation commands (zoom, pan, fit-to-screen)

**Custom Commands:**
```typescript
// Register custom commands
baklava.commandHandler.registerCommand("CUSTOM_COMMAND", {
  execute: (context) => {
    // Command implementation
  },
  canExecute: (context) => {
    // Return true if command can execute
    return true;
  }
});

// Execute commands
baklava.commandHandler.executeCommand("CUSTOM_COMMAND", context);
```

**Context Menu Integration:**
```typescript
baklava.settings.contextMenu.additionalItems = [
  { isDivider: true },
  { label: "Custom Action", command: "CUSTOM_COMMAND" },
  {
    label: "Submenu",
    submenu: [
      { label: "Subitem 1", command: "SUBCOMMAND_1" },
      { label: "Subitem 2", command: "SUBCOMMAND_2" }
    ]
  }
];
```

## Testing Strategy

### Testing Framework
- **Jest** for unit testing across all packages
- **Coverage reports** generated in `coverage/` directories
- **Test location**: Each package has its own `test/` directory
- **Example nodes** in test files for integration testing

### Test Structure
```
packages/
├── core/
│   └── test/
│       ├── graph.spec.ts          # Graph functionality tests
│       ├── node.spec.ts           # Node lifecycle tests
│       ├── connection.spec.ts     # Connection system tests
│       └── editor.spec.ts         # Editor functionality tests
├── engine/
│   └── test/
│       ├── dependency-engine.spec.ts  # Dependency engine tests
│       └── forward-engine.spec.ts     # Forward engine tests
└── renderer-vue/
    └── test/
        ├── components.spec.ts     # Vue component tests
        └── commands.spec.ts       # Command system tests
```

### Test Patterns
**Node Testing:**
```typescript
import { MathNode } from "../src/TestNodes";
import { DependencyEngine } from "@baklavajs/engine";

describe("MathNode", () => {
  let engine: DependencyEngine;
  let node: InstanceType<typeof MathNode>;

  beforeEach(() => {
    engine = new DependencyEngine();
    node = new MathNode();
  });

  test("should calculate sum correctly", () => {
    node.inputs.a.value = 5;
    node.inputs.b.value = 3;
    const result = node.calculate!({ a: 5, b: 3 });
    expect(result.result).toBe(8);
  });

  test("should integrate with engine", async () => {
    const graph = new Graph();
    graph.addNode(node);
    const results = await engine.execute(graph);
    expect(results.get(node.id)).toEqual({ result: 0 }); // default values
  });
});
```

**Vue Component Testing:**
```typescript
import { mount } from "@vue/test-utils";
import { NodeComponent } from "../src/components/Node.vue";
import { createTestNode } from "./testUtils";

describe("NodeComponent", () => {
  test("should render node with correct title", () => {
    const node = createTestNode({ title: "Test Node" });
    const wrapper = mount(NodeComponent, {
      props: { node, selected: false }
    });
    expect(wrapper.find(".__title-label").text()).toBe("Test Node");
  });

  test("should emit select event when clicked", async () => {
    const node = createTestNode();
    const wrapper = mount(NodeComponent, {
      props: { node, selected: false }
    });
    await wrapper.find(".baklava-node").trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
  });
});
```

### Test Commands
```bash
# Run all tests with coverage
yarn test --coverage

# Run specific package tests
cd packages/core && yarn test

# Run specific test file
cd packages/core && yarn test -- test/graph.spec.ts

# Run tests in watch mode for development
cd packages/core && yarn test --watch

# Run tests with verbose output
yarn test --verbose

# Debug tests with breakpoint
cd packages/core && node --inspect-brk node_modules/.bin/jest --runInBand

# Update test snapshots
yarn test --updateSnapshot

# Run tests matching a pattern
yarn test --testNamePattern="should calculate"
```

### Test Utilities
**Mock Node Creation:**
```typescript
// test/testUtils.ts
import { defineNode, NodeInterface } from "@baklavajs/core";

export function createTestNode(options?: Partial<{
  title: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}>) {
  return defineNode({
    type: "TestNode",
    title: options?.title || "Test Node",
    inputs: options?.inputs || {
      input: () => new NodeInterface("Input", 0)
    },
    outputs: options?.outputs || {
      output: () => new NodeInterface("Output", 0)
    },
    calculate({ input }) {
      return { output: input };
    }
  });
}
```

**Engine Testing Helpers:**
```typescript
// test/engineUtils.ts
import { Graph } from "@baklavajs/core";
import { DependencyEngine } from "@baklavajs/engine";

export async function executeTestGraph(nodeSetup: (graph: Graph) => Promise<void>) {
  const graph = new Graph();
  await nodeSetup(graph);
  const engine = new DependencyEngine();
  return await engine.execute(graph);
}
```

## Configuration Files

### TypeScript
- Root `tsconfig.json` for common settings
- Package-specific `tsconfig.build.json` for build compilation
- Strict mode enabled with ES2019 target

### ESLint
- Flat configuration with TypeScript and Vue support
- Custom rules for BaklavaJS patterns
- Prettier integration for code formatting

### TypeDoc
- API documentation generation from TypeScript comments
- Markdown output in `docs/public/api/`
- Automatic module documentation

## Special Features

### Cross-Tab Clipboard
Nodes can be copied in one browser tab and pasted in another using localStorage synchronization. The implementation is in `packages/renderer-vue/src/globalClipboard.ts`.

### Subgraph Support
Complex node networks can be encapsulated as subgraphs with dedicated input/output nodes. Implementation in `packages/renderer-vue/src/graph/subgraph*`.

### Dynamic Nodes
Nodes can be dynamically generated based on configuration, enabling flexible node creation patterns.

### Theme System
CSS variable-based theming with pre-built themes (classic, syrup-dark) in `packages/themes/`.

## Electron Integration

The project includes Electron app support with:
- Main process in `electron/main.cjs`
- Preload scripts for secure API exposure
- Builder configuration for cross-platform distribution
- Development and production build modes

## CI/CD Pipeline

GitHub Actions workflows provide:
- **Build validation** on every push
- **Test execution** across all packages
- **Automatic linting** with ESLint
- **Node.js 18** environment

## Debugging & Troubleshooting

### Common Issues

1. **TypeScript compilation errors**: Run `npx tsc --noEmit` in individual packages
2. **Vue component issues**: Check Vue devtools in browser
3. **Build failures**: Clean and rebuild with `yarn clean && yarn build`
4. **Test failures**: Run tests individually to isolate issues

### Debug Commands
```bash
# Debug TypeScript compilation
cd packages/core && npx tsc --noEmit --extendedDiagnostics

# Debug Jest tests
cd packages/core && node --inspect-brk node_modules/.bin/jest --runInBand

# Analyze bundle size
cd packages/renderer-vue && yarn build && npx vite-bundle-analyzer
```

## Code Search Patterns

### Find Node Definitions
```bash
rg "defineNode" --type ts
```

### Find Interface Usage  
```bash
rg "NumberInterface" --type ts
```

### Find Vue Components
```bash
rg "defineComponent" --type vue
```

### Find Event Handlers
```bash
rg "on.*Event" --type ts
```

## Important File Locations

- **Package entry points**: `packages/*/src/index.ts`
- **Vue components**: `packages/renderer-vue/src/components/`
- **Theme styles**: `packages/themes/src/`
- **Test files**: `packages/*/test/`
- **Documentation**: `docs/`
- **Electron config**: `electron/`
- **API documentation**: `docs/public/api/`
- **Build outputs**: `packages/*/dist/`
- **Coverage reports**: `packages/*/coverage/`

## Development Workflow Tips

1. **Start with core package**: Most changes begin in `@baklavajs/core`
2. **Test changes incrementally**: Use package-specific test commands
3. **Use Vite dev server**: For rapid UI development with hot reload
4. **Check TypeScript types**: Always run `npx tsc --noEmit` after changes
5. **Follow existing patterns**: Mimic code style and architecture patterns
6. **Update documentation**: Include JSDoc comments for new APIs

## Debugging Tools and Techniques

### Browser DevTools
**Vue DevTools:**
- Install Vue DevTools browser extension
- Inspect component hierarchy and reactive state
- Monitor component performance and re-renders
- Debug event handling and prop changes

**Performance Profiling:**
```javascript
// Use performance.mark() to measure execution time
performance.mark('node-calculation-start');
node.calculate(inputs);
performance.mark('node-calculation-end');
performance.measure('node-calculation', 'node-calculation-start', 'node-calculation-end');
```

**Memory Profiling:**
```javascript
// Monitor memory usage
const memoryUsage = process.memoryUsage();
console.log(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
```

### Debug Utilities
**Logging Helper:**
```typescript
// packages/core/src/debug.ts
export class DebugLogger {
  private static instance: DebugLogger;
  private logs: Array<{ timestamp: Date; message: string; data?: any }> = [];

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  log(message: string, data?: any) {
    const entry = {
      timestamp: new Date(),
      message,
      data
    };
    this.logs.push(entry);
    console.log(`[${entry.timestamp.toISOString()}] ${message}`, data || '');
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

// Usage in nodes
const logger = DebugLogger.getInstance();
logger.log('Node calculation started', { inputs });
```

**State Inspector:**
```typescript
// Development utility to inspect node state
export function inspectNode(node: AbstractNode) {
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    inputs: Object.entries(node.inputs).map(([key, intf]) => ({
      key,
      value: intf.value,
      connections: intf.connections.length
    })),
    outputs: Object.entries(node.outputs).map(([key, intf]) => ({
      key,
      value: intf.value,
      connections: intf.connections.length
    })),
    position: (node as any).position,
    selected: (node as any).selected
  };
}
```

### Common Debug Scenarios
**Node Not Calculating:**
```typescript
// Debug calculation issues
const debugNode = (node: AbstractNode) => {
  console.log('Node state:', inspectNode(node));
  
  // Check if node has calculate method
  if (!node.calculate) {
    console.error('Node missing calculate method');
    return;
  }
  
  // Test calculation with current inputs
  const inputs = Object.fromEntries(
    Object.entries(node.inputs).map(([key, intf]) => [key, intf.value])
  );
  
  try {
    const result = node.calculate(inputs, { globalValues: {}, engine: null });
    console.log('Calculation result:', result);
  } catch (error) {
    console.error('Calculation error:', error);
  }
};
```

**Connection Issues:**
```typescript
// Debug connection problems
const debugConnections = (graph: Graph) => {
  graph.connections.forEach(conn => {
    console.log('Connection:', {
      from: `${conn.from.nodeId}.${conn.from.name}`,
      to: `${conn.to.nodeId}.${conn.to.name}`,
      value: conn.from.value
    });
  });
  
  // Check for unconnected interfaces
  graph.nodes.forEach(node => {
    Object.entries(node.inputs).forEach(([key, intf]) => {
      if (intf.connections.length === 0) {
        console.log(`Unconnected input: ${node.type}.${key}`);
      }
    });
  });
};
```

## Extension Points and Customization

### Custom Interface Types
```typescript
// Create custom interface with validation
export class EmailInterface extends NodeInterface<string> {
  constructor(name: string, value: string) {
    super(name, value);
    this.addValidator((value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Invalid email format');
      }
      return value;
    });
  }
}
```

### Custom Commands
```typescript
// Extend command system
export const GraphAnalysisCommand = {
  name: "ANALYZE_GRAPH",
  execute: (context: { graph: Graph }) => {
    const analysis = {
      nodeCount: context.graph.nodes.length,
      connectionCount: context.graph.connections.length,
      isolatedNodes: context.graph.nodes.filter(node => 
        Object.values(node.inputs).every(intf => intf.connections.length === 0) &&
        Object.values(node.outputs).every(intf => intf.connections.length === 0)
      ).length
    };
    console.log('Graph analysis:', analysis);
    return analysis;
  }
};
```

### Custom Renderers
```typescript
// Create custom node renderer
export const AdvancedNodeRenderer = defineComponent({
  props: ['node', 'selected'],
  setup(props) {
    const nodeRef = ref<HTMLElement>();
    
    // Custom animations and interactions
    onMounted(() => {
      if (nodeRef.value) {
        // Initialize custom behavior
      }
    });
    
    return () => h('div', {
      ref: nodeRef,
      class: ['advanced-node', { selected: props.selected }],
      style: {
        backgroundColor: props.node.titleBackgroundColor,
        color: props.node.titleForegroundColor
      }
    }, [
      h('div', { class: 'node-content' }, props.node.title)
    ]);
  }
});
```

## Contribution Guidelines

### Code Style
- **TypeScript**: Use strict mode, prefer const/let, explicit return types
- **Vue 3**: Use Composition API, <script setup> syntax
- **Naming**: PascalCase for components, camelCase for variables and functions
- **Comments**: JSDoc for public APIs, inline comments for complex logic

### Pull Request Process
1. **Create feature branch**: `git checkout -b feature/your-feature-name`
2. **Make changes**: Follow existing patterns and conventions
3. **Add tests**: Ensure adequate test coverage
4. **Update documentation**: Add JSDoc comments and update CLAUDE.md if needed
5. **Run full test suite**: `yarn test` and `yarn lint`
6. **Submit PR**: Clear description of changes and testing performed

### Testing Requirements
- **Unit tests**: For all new functionality
- **Integration tests**: For complex interactions
- **Visual tests**: For UI changes
- **Performance tests**: For performance-sensitive changes
- **Cross-browser testing**: For renderer changes

### Release Process
1. **Update version numbers**: Use `yarn version` for consistent versioning
2. **Update changelog**: Document all changes
3. **Create release tag**: `git tag v2.x.x`
4. **Publish packages**: `yarn publish` or CI/CD pipeline
5. **Update documentation**: Ensure docs are up to date


## Performance Optimization

### Graph Performance
**Large Graph Optimization:**
- **Virtual Rendering**: Implement virtual scrolling for node lists in palette
- **Lazy Loading**: Load nodes and interfaces on demand
- **Batch Operations**: Group multiple operations to reduce re-renders
- **Memory Management**: Clean up unused nodes and connections

**Node Performance:**
```typescript
// Implement caching for expensive calculations
class CachedCalculationNode extends Node {
  private cache = new Map<string, any>();
  private cacheKey = "";

  calculate(inputs: any) {
    const key = JSON.stringify(inputs);
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const result = this.expensiveCalculation(inputs);
    this.cache.set(key, result);
    return result;
  }

  private expensiveCalculation(inputs: any) {
    // Complex calculation logic
    return { result: inputs.value * 2 };
  }

  // Clear cache when inputs change
  onPlaced() {
    this.events.update.subscribe(this, () => {
      this.cache.clear();
    });
  }
}
```

**Event System Optimization:**
```typescript
// Batch multiple events to reduce re-renders
graph.transaction(() => {
  graph.addNode(node1);
  graph.addNode(node2);
  graph.connect(node1.outputs.output, node2.inputs.input);
}); // Single update at the end
```

### Vue Component Optimization
**Component Memoization:**
```vue
<template>
  <div class="baklava-node" v-memo="[node.id, selected, node.title]">
    <!-- Node content -->
  </div>
</template>
```

**Computed Property Optimization:**
```typescript
// Use computed properties with caching
const processedData = computed(() => {
  return expensiveDataTransformation(props.node.data);
}, { 
  // Add custom caching strategy
  equals: (a, b) => JSON.stringify(a) === JSON.stringify(b)
});
```

### Memory Management
**Cleanup Patterns:**
```typescript
class ResourceIntensiveNode extends Node {
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
  }
}
```

## Best Practices

### Node Development
**Consistent Naming:**
- Use PascalCase for node types (e.g., `MathOperationNode`)
- Use camelCase for interface names (e.g., `inputValue`)
- Use descriptive names for clarity

**Error Handling:**
```typescript
export const SafeMathNode = defineNode({
  type: "SafeMathNode",
  inputs: {
    a: () => new NumberInterface("A", 0),
    b: () => new NumberInterface("B", 0)
  },
  outputs: {
    result: () => new NodeInterface("Result", 0),
    error: () => new NodeInterface("Error", "")
  },
  calculate({ a, b }) {
    try {
      if (typeof a !== 'number' || typeof b !== 'number') {
        throw new Error("Invalid input types");
      }
      return { 
        result: a + b,
        error: "" 
      };
    } catch (err) {
      return { 
        result: 0,
        error: err.message 
      };
    }
  }
});
```

**Input Validation:**
```typescript
export const ValidatedNode = defineNode({
  type: "ValidatedNode",
  inputs: {
    text: () => new TextInputInterface("Text", "")
      .use(setType, stringType)
      .use(setValidator, (value) => {
        if (value.length > 100) {
          throw new Error("Text too long");
        }
        return value;
      })
  },
  // ...
});
```

### Vue Component Development
**Prop Validation:**
```typescript
const props = defineProps({
  node: {
    type: Object as PropType<AbstractNode>,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
});
```

**Event Handling:**
```typescript
// Use proper event delegation
const handleNodeClick = (event: MouseEvent) => {
  event.stopPropagation();
  emit('select', props.node);
};

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
```

## Common Issues and Solutions

### TypeScript Issues
**Generic Type Constraints:**
```typescript
// Problem: Generic types in node definitions
export const GenericNode = defineNode({
  type: "GenericNode",
  inputs: {
    value: () => new NodeInterface<T>("Value", defaultValue)
  },
  // Solution: Use type assertion or generic wrapper
});
```

**Interface Type Compatibility:**
```typescript
// Problem: Type mismatches between interfaces
const result = node.inputs.number.value + node.inputs.string.value;

// Solution: Use proper type conversion
const numValue = interfaceTypes.convert(node.inputs.string.value, stringType, numberType);
const result = node.inputs.number.value + numValue;
```

### Performance Issues
**Large Graph Rendering:**
```typescript
// Problem: UI freezes with large graphs
// Solution: Implement virtualization and debouncing
const debouncedUpdate = debounce(() => {
  updateNodePositions();
}, 16); // 60fps
```

**Memory Leaks:**
```typescript
// Problem: Memory not released when nodes are removed
// Solution: Proper cleanup in onDestroy
onDestroy() {
  this.subscriptions.forEach(sub => sub.unsubscribe());
  this.timers.forEach(timer => clearTimeout(timer));
}
```

### Event System Issues
**Event Bubbling:**
```typescript
// Problem: Events firing multiple times
// Solution: Use proper event stopping
const handleClick = (event: MouseEvent) => {
  event.stopPropagation();
  // Handle click
};
```

**Async Event Handling:**
```typescript
// Problem: Async operations in event handlers
// Solution: Use proper async patterns
const asyncEventHandler = async () => {
  try {
    const result = await asyncOperation();
    this.events.someEvent.emit(result);
  } catch (error) {
    console.error('Async operation failed:', error);
  }
};
```

## Node Registration System

### Registration Pattern
Nodes are registered with the editor using categories:
```typescript
editor.registerNodeType(TestNode, { category: "Tests" });
editor.registerNodeType(OutputNode, { category: "Outputs" });
editor.registerNodeType(MathNode); // No category = default category
```

### Node Categories
- Categories organize nodes in the palette interface
- Default category is used when no category is specified
- Custom categories can be created for better organization

### Node Types
The system supports multiple node definition patterns:
- **defineNode**: Standard node definition with static interfaces
- **defineDynamicNode**: Nodes with dynamically generated interfaces
- **Class-based nodes**: Traditional class inheritance approach

---

## Summary

This comprehensive documentation provides the foundation for understanding and contributing to the BaklavaJS codebase. The project's modular architecture, extensive type safety, and flexible plugin system make it a powerful platform for building visual node-based applications.

Key takeaways for developers:
- **Start with the core package** for most feature development
- **Follow the established patterns** for node creation and Vue integration
- **Leverage the testing framework** to ensure code quality
- **Use the debugging tools** provided for efficient development
- **Contribute back** following the guidelines and best practices

The codebase is designed to be extensible and maintainable, with clear separation of concerns between the core logic, rendering, and various plugin systems. Regular contributions and improvements help keep the project growing and evolving.