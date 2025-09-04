# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BaklavaJS is a visual node editor for the web built with TypeScript and Vue 3. It provides a comprehensive graph editing system with strong emphasis on extensibility and type safety. The project follows a modular architecture with multiple packages that can be used independently or together.

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
```

### Vue Renderer Development
```bash
# Start development server for playground
yarn playground

# or directly in renderer-vue package
cd packages/renderer-vue && yarn dev
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

## Architecture Overview

### Monorepo Structure

This project uses Lerna to manage a monorepo with the following packages:

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
- `Editor` class - Main editor controller managing graphs and nodes
- `Graph` class - Container for nodes and connections
- `Node` base class - Extendable node implementations
- `NodeInterface` class - Input/output connection points
- `Connection` class - Links between node interfaces

**Execution Engines:**
- `DependencyEngine` - Topological sorting with dependency resolution
- `ForwardEngine` - Simple forward execution model
- `BaseEngine` - Abstract base for custom engine implementations

**Vue Renderer:**
- Vue 3 Composition API throughout
- Component-based architecture for nodes and interfaces
- Built-in commands (undo/redo, copy/paste, zoom, etc.)
- Cross-tab clipboard functionality using localStorage
- Subgraph support with nested editing

**Type System:**
- Interface types with validation rules
- Automatic type conversion between compatible types
- Extensible type definitions

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

## Key Development Patterns

### Node Creation
```typescript
import { defineNode, NumberInterface, NodeInterface } from "@baklavajs/core";

export const MathNode = defineNode({
  type: "MathNode",
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

### Vue Component Integration
```typescript
import { useBaklava } from "@baklavajs/renderer-vue";

const baklava = useBaklava();
baklava.editor.registerNodeType(MathNode);
```

### Command System
The renderer uses a comprehensive command system for editor operations:
- Undo/redo with history management
- Copy/paste with cross-tab support
- Node manipulation commands
- Graph navigation commands

## Testing Strategy

- **Jest** for unit testing across all packages
- **Coverage reports** generated in `coverage/` directories
- **Test location**: Each package has its own `test/` directory
- **Example nodes** in test files for integration testing

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

## Important File Locations

- **Package entry points**: `packages/*/src/index.ts`
- **Vue components**: `packages/renderer-vue/src/components/`
- **Theme styles**: `packages/themes/src/`
- **Test files**: `packages/*/test/`
- **Documentation**: `docs/`
- **Electron config**: `electron/`