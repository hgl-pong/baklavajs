<script setup>
import ApiLink from "../components/ApiLink.vue";
</script>

# Reroute Points

Reroute points allow users to add intermediate waypoints to connections, enabling more flexible and organized visual layouts in node graphs. This feature is particularly useful for complex graphs where connections might overlap or need to follow specific paths.

## Overview

Reroute points are interactive control points that can be added to any connection between nodes. They allow users to:

- **Customize connection paths**: Create custom routing for connections to avoid overlaps
- **Improve readability**: Make complex graphs more organized and easier to follow
- **Interactive manipulation**: Drag and drop reroute points to adjust connection paths in real-time

## Core Components

### Connection Class (Core)

The <ApiLink type="classes" module="@baklavajs/core" name="Connection">Connection</ApiLink> class in the core package provides the fundamental reroute point functionality:

```ts
class Connection {
    // Array to store reroute points
    public reroutePoints: Array<{
        id: string;
        x: number;
        y: number;
    }> = [];

    // Add a new reroute point
    addReroutePoint(x: number, y: number, id?: string): { id: string; x: number; y: number }
    
    // Remove a reroute point by ID
    removeReroutePoint(id: string): boolean
    
    // Update reroute point position
    updateReroutePoint(id: string, x: number, y: number): boolean
    
    // Get all reroute points
    getReroutePoints(): Array<{ id: string; x: number; y: number }>
    
    // Clear all reroute points
    clearReroutePoints(): void
}
```

### ReroutePoint Component (Vue Renderer)

The `ReroutePoint.vue` component handles the visual representation and user interaction:

```ts
interface IReroutePoint {
    id: string;
    x: number;
    y: number;
    connectionId: string;
    segmentIndex: number; // Position along the connection
}
```

### Reroute Service

The `rerouteService.ts` provides a reactive service layer that bridges the core model with the Vue renderer:

```ts
interface IRerouteService {
    reroutePoints: IReroutePoint[];
    addReroutePoint: (connectionId: string, x: number, y: number, segmentIndex: number) => IReroutePoint;
    removeReroutePoint: (id: string) => void;
    updateReroutePointPosition: (id: string, x: number, y: number) => void;
    getReroutePointsForConnection: (connectionId: string) => IReroutePoint[];
    clearReroutePointsForConnection: (connectionId: string) => void;
    syncWithCoreModel: () => void;
}
```

## User Interactions

### Adding Reroute Points

Users can add reroute points by **double-clicking** on any connection line. The system will:

1. Calculate the click position in editor coordinates
2. Create a new reroute point at that location
3. Automatically select the newly created point
4. Update the connection path to include the new point

### Manipulating Reroute Points

Once created, reroute points support several interactions:

- **Drag and Drop**: Click and drag to reposition the point
- **Selection**: Click to select/deselect a reroute point
- **Visual Feedback**: Hover effects and selection highlighting
- **Deletion**: Press `Delete` key when a reroute point is selected

### Visual States

Reroute points have different visual states:

- **Default**: Small circular dot with subtle styling
- **Hover**: Enhanced shadow and increased stroke width
- **Selected**: Highlighted with selection color and thicker stroke
- **Dragging**: Reduced opacity and "grabbing" cursor

## Implementation Details

### Coordinate Systems

The reroute point system handles two coordinate systems:

- **Editor Space**: Original coordinates relative to the editor canvas
- **SVG Space**: Transformed coordinates accounting for panning and scaling

```ts
// Transform from editor space to SVG space
const tx = (x + graph.panning.x) * graph.scaling;
const ty = (y + graph.panning.y) * graph.scaling;
```

### Path Generation

Connections with reroute points generate paths that include all intermediate points:

```ts
// Build path with reroute points
const points = [
    [startX, startY],
    ...reroutePoints.map(point => [point.x, point.y]),
    [endX, endY]
];

// Generate SVG path (straight or curved)
if (useStraightConnections) {
    return points.map((point, i) => 
        i === 0 ? `M ${point[0]} ${point[1]}` : `L ${point[0]} ${point[1]}`
    ).join(' ');
} else {
    // Generate smooth curves between points
    // ... curve generation logic
}
```

### State Management

The system uses Vue's reactivity system for state management:

- **Selection State**: Global reroute point selection tracking
- **Reactive Arrays**: Automatic UI updates when reroute points change
- **Core Synchronization**: Bidirectional sync between core model and UI layer

## Commands and Shortcuts

### Delete Command

The system registers a delete command for removing selected reroute points:

```ts
// Register delete command
handler.registerCommand(DELETE_REROUTE_POINT_COMMAND, {
    canExecute: () => selectedRerouteId.value !== null,
    execute() {
        const selectedId = selectedRerouteId.value;
        if (selectedId) {
            rerouteService.removeReroutePoint(selectedId);
            rerouteSelection.unselectReroute();
        }
    },
});

// Register keyboard shortcut
handler.registerHotkey(["Delete"], DELETE_REROUTE_POINT_COMMAND);
```

## Styling and Customization

Reroute points can be customized through CSS variables and classes:

```css
/* Hover effects */
.baklava-reroute-point:hover .__reroute-dot {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    stroke-width: 3;
}

/* Selection state */
.baklava-reroute-point.--selected .__reroute-dot {
    stroke: var(--baklava-node-color-selected);
    stroke-width: 3;
}

/* Dragging state */
.baklava-reroute-point.--dragging .__reroute-dot {
    cursor: grabbing;
    opacity: 0.8;
}
```

## Best Practices

### Performance Considerations

- Reroute points are rendered as SVG elements for optimal performance
- Event handling uses pointer events for better touch device support
- Coordinate transformations are computed reactively to minimize calculations

### User Experience

- Double-click to add provides intuitive interaction
- Visual feedback during all interactions
- Automatic cleanup when connections are removed
- Keyboard shortcuts for power users

### Integration

When integrating reroute points:

1. Ensure the reroute service is properly initialized with the graph instance
2. Provide the reroute selection context to child components
3. Register the delete command in your command handler
4. Include reroute point styling in your theme

## Example Usage

```vue
<template>
    <BaklavaEditor :view-model="baklava">
        <!-- Reroute points are automatically included in ConnectionView -->
    </BaklavaEditor>
</template>

<script setup>
import { useBaklava } from "@baklavajs/renderer-vue";
import { Editor } from "@baklavajs/core";

const editor = new Editor();
const baklava = useBaklava(editor);

// Reroute points work automatically with the default setup
// No additional configuration required
</script>
```

Reroute points enhance the visual editor's flexibility and usability, making it easier to create clean, organized node graphs even in complex scenarios.