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

### Test Commands
```bash
# Run tests with coverage
yarn test --coverage

# Run specific test file
cd packages/core && yarn test -- test/graph.spec.ts

# Run tests in watch mode
cd packages/core && yarn test --watch

# Debug tests
cd packages/core && node --inspect-brk node_modules/.bin/jest --runInBand
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

## Performance Considerations

- **Graph size**: Large graphs may require optimization
- **Node complexity**: Complex nodes should implement caching
- **Event system**: Use event batching for performance-critical operations
- **Rendering**: Vue components should be optimized with `v-memo` where appropriate