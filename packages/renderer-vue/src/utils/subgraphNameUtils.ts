/**
 * Subgraph naming utilities
 */

/**
 * Validates a subgraph name
 * @param name The name to validate
 * @param existingNames Array of existing names to check for duplicates
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSubgraphName(
    name: string,
    existingNames: string[] = []
): { isValid: boolean; error?: string } {
    const trimmedName = name.trim();
    
    // Check if name is empty
    if (!trimmedName) {
        return { isValid: false, error: "Name cannot be empty" };
    }
    
    // Check length
    if (trimmedName.length > 50) {
        return { isValid: false, error: "Name cannot exceed 50 characters" };
    }
    
    // Check for valid characters (letters, numbers, Chinese characters, underscore, hyphen, space)
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/.test(trimmedName)) {
        return { isValid: false, error: "Name can only contain letters, numbers, Chinese characters, underscores, hyphens and spaces" };
    }
    
    // Check for duplicates
    if (existingNames.includes(trimmedName)) {
        return { isValid: false, error: "This name already exists" };
    }
    
    return { isValid: true };
}

/**
 * Generates a default subgraph name
 * @param existingNames Array of existing names to avoid duplicates
 * @param baseName Base name to use (default: "Subgraph")
 * @returns A unique default name
 */
export function generateDefaultSubgraphName(
    existingNames: string[] = [],
    baseName: string = "Subgraph"
): string {
    let counter = 1;
    let candidateName = baseName;
    
    // If base name doesn't exist, return it
    if (!existingNames.includes(candidateName)) {
        return candidateName;
    }
    
    // Find the next available name with counter
    while (existingNames.includes(candidateName)) {
        candidateName = `${baseName} ${counter}`;
        counter++;
    }
    
    return candidateName;
}

/**
 * Sanitizes a subgraph name by removing invalid characters
 * @param name The name to sanitize
 * @returns Sanitized name
 */
export function sanitizeSubgraphName(name: string): string {
    return name
        .trim()
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_\-\s]/g, '') // Remove invalid characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .substring(0, 50); // Limit length
}

/**
 * Gets all existing subgraph names from the editor
 * @param editor The BaklavaJS editor instance
 * @returns Array of existing subgraph names
 */
export function getExistingSubgraphNames(editor: any): string[] {
    if (!editor || !editor.graphTemplates) {
        return [];
    }
    
    return editor.graphTemplates
        .map((template: any) => template.name)
        .filter((name: string) => name && name.trim());
}

/**
 * Creates a unique subgraph name based on selected nodes
 * @param selectedNodes Array of selected nodes
 * @param existingNames Array of existing names
 * @returns A suggested name based on node types or default name
 */
export function suggestSubgraphName(
    selectedNodes: any[] = [],
    existingNames: string[] = []
): string {
    if (selectedNodes.length === 0) {
        return generateDefaultSubgraphName(existingNames);
    }
    
    // Try to create a name based on node types
    const nodeTypes = selectedNodes
        .map(node => node.type || node.title)
        .filter(type => type)
        .slice(0, 2); // Take first 2 types
    
    if (nodeTypes.length > 0) {
        const baseName = nodeTypes.join('_');
        const sanitizedName = sanitizeSubgraphName(baseName);
        
        if (sanitizedName && !existingNames.includes(sanitizedName)) {
            return sanitizedName;
        }
        
        // If suggested name exists, add counter
        return generateDefaultSubgraphName(existingNames, sanitizedName || "Subgraph");
    }
    
    return generateDefaultSubgraphName(existingNames);
}