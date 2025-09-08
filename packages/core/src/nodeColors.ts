/**
 * Default color presets for different node types
 * This provides a consistent color scheme for different node categories
 */

export interface NodeColorPreset {
    backgroundColor: string;
    foregroundColor: string;
}

export const NODE_TYPE_COLORS: Record<string, NodeColorPreset> = {
    // Math and computation nodes
    'MathNode': {
        backgroundColor: '#007bff',
        foregroundColor: '#ffffff'
    },
    'TestNode': {
        backgroundColor: '#28a745',
        foregroundColor: '#ffffff'
    },
    'OutputNode': {
        backgroundColor: '#dc3545',
        foregroundColor: '#ffffff'
    },
    'CommentNode': {
        backgroundColor: '#fff3b8',
        foregroundColor: '#2c2c2c'
    },
    'BuilderTestNode': {
        backgroundColor: '#fd7e14',
        foregroundColor: '#ffffff'
    },
    'AdvancedNode': {
        backgroundColor: '#6f42c1',
        foregroundColor: '#ffffff'
    },
    'DynamicNode': {
        backgroundColor: '#6610f2',
        foregroundColor: '#ffffff'
    },
    'InterfaceTestNode': {
        backgroundColor: '#fd7e14',
        foregroundColor: '#ffffff'
    },
    'SelectTestNode': {
        backgroundColor: '#20c997',
        foregroundColor: '#ffffff'
    },
    'SidebarNode': {
        backgroundColor: '#17a2b8',
        foregroundColor: '#ffffff'
    },
    'UpdateTestNode': {
        backgroundColor: '#ffc107',
        foregroundColor: '#000000'
    },
    'MultiInputNode': {
        backgroundColor: '#6c757d',
        foregroundColor: '#ffffff'
    },
    'dialog': {
        backgroundColor: '#d63384',
        foregroundColor: '#ffffff'
    },
    'ReactiveOutputTest': {
        backgroundColor: '#7950f2',
        foregroundColor: '#ffffff'
    },
    
    // Default fallback for unknown node types
    'default': {
        backgroundColor: '#5379b5',
        foregroundColor: '#ffffff'
    }
};

/**
 * Get default color for a node type
 * @param nodeType The type of the node
 * @returns Color preset for the node type
 */
export function getDefaultNodeColor(nodeType: string): NodeColorPreset {
    return NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS['default'];
}

/**
 * Get all available color presets
 * @returns Array of color presets for UI display
 */
export function getAllColorPresets(): Array<{name: string, value: NodeColorPreset}> {
    return Object.entries(NODE_TYPE_COLORS)
        .filter(([key]) => key !== 'default')
        .map(([name, value]) => ({ name, value }));
}