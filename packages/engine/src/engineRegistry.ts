import { Editor } from "@baklavajs/core";
import { ForwardEngine } from "./forwardEngine";
import { DependencyEngine } from "./dependencyEngine";

/**
 * Engine factory function type
 */
export type EngineFactory = (editor: Editor) => any;

/**
 * Engine information interface
 */
export interface EngineInfo {
    /** Unique engine type identifier */
    type: string;
    /** Human-readable engine name */
    name: string;
    /** Engine description */
    description: string;
    /** Engine version */
    version: string;
    /** Supported features */
    features: string[];
}

/**
 * Engine registry implementation for BaklavaJS engine package
 * This provides a centralized registry for managing engine types and instances
 */
export class EngineRegistry {
    private static instance: EngineRegistry;
    private engines: Map<string, { info: EngineInfo; factory: EngineFactory }> = new Map();
    private instanceCache: Map<string, any> = new Map();
    private defaultEngineType: string = "dependency";

    private constructor() {
        // Private constructor for singleton pattern
        this.registerBuiltInEngines();
    }

    /**
     * Get the singleton instance of EngineRegistry
     */
    public static getInstance(): EngineRegistry {
        if (!EngineRegistry.instance) {
            EngineRegistry.instance = new EngineRegistry();
        }
        return EngineRegistry.instance;
    }

    /**
     * Register built-in engines with the global registry
     */
    private registerBuiltInEngines(): void {
        // Register Dependency Engine
        const dependencyEngineInfo: EngineInfo = {
            type: "dependency",
            name: "Dependency Engine",
            description: "Standard topological sorting engine that executes nodes in dependency order",
            version: "1.0.0",
            features: [
                "topological-sorting",
                "dependency-resolution",
                "cycle-detection",
                "auto-recalculation"
            ]
        };

        const dependencyEngineFactory: EngineFactory = (editor: Editor) => new DependencyEngine(editor);

        // Register Forward Engine
        const forwardEngineInfo: EngineInfo = {
            type: "forward",
            name: "Forward Engine",
            description: "Forward execution engine that processes nodes in forward propagation order",
            version: "1.0.0",
            features: [
                "forward-propagation",
                "event-driven",
                "incremental-calculation",
                "selective-execution"
            ]
        };

        const forwardEngineFactory: EngineFactory = (editor: Editor) => new ForwardEngine(editor);

        try {
            this.registerEngineType("dependency", dependencyEngineInfo, dependencyEngineFactory);
            this.registerEngineType("forward", forwardEngineInfo, forwardEngineFactory);
            
            console.log("BaklavaJS engines registered successfully");
        } catch (error) {
            console.warn("Failed to register engines:", error);
        }
    }

    /**
     * Register a new engine type
     * @param engineType Engine type identifier
     * @param engineInfo Engine information
     * @param factory Engine factory function
     */
    public registerEngineType(
        engineType: string,
        engineInfo: EngineInfo,
        factory: EngineFactory
    ): void {
        if (this.engines.has(engineType)) {
            throw new Error(`Engine type '${engineType}' is already registered`);
        }

        this.engines.set(engineType, {
            info: engineInfo,
            factory
        });
    }

    /**
     * Get all available engine types
     */
    public getAvailableEngineTypes(): string[] {
        return Array.from(this.engines.keys());
    }

    /**
     * Check if an engine type is registered
     * @param engineType Engine type identifier
     */
    public hasEngineType(engineType: string): boolean {
        return this.engines.has(engineType);
    }

    /**
     * Get engine information
     * @param engineType Engine type identifier
     */
    public getEngineInfo(engineType: string): EngineInfo | undefined {
        const entry = this.engines.get(engineType);
        return entry?.info;
    }

    /**
     * Get engine information for all registered engines
     */
    public getAllEngineInfo(): Map<string, EngineInfo> {
        const result = new Map<string, EngineInfo>();
        this.engines.forEach((entry, engineType) => {
            result.set(engineType, entry.info);
        });
        return result;
    }

    /**
     * Create a new engine instance
     * @param engineType Engine type identifier
     * @param editor Editor instance
     * @param useCache Whether to use instance caching (default: true)
     */
    public createEngine(engineType: string, editor: Editor, useCache: boolean = true): any {
        const cacheKey = `${engineType}:${editor.graph?.id || 'no-graph'}`;
        
        if (useCache && this.instanceCache.has(cacheKey)) {
            return this.instanceCache.get(cacheKey);
        }

        const entry = this.engines.get(engineType);
        if (!entry) {
            throw new Error(`Engine type '${engineType}' is not registered`);
        }

        try {
            const engine = entry.factory(editor);
            
            if (useCache) {
                this.instanceCache.set(cacheKey, engine);
            }
            
            return engine;
        } catch (error) {
            console.error(`Failed to create engine of type '${engineType}':`, error);
            throw error;
        }
    }

    /**
     * Remove engine instance from cache
     * @param engineType Engine type identifier
     * @param editor Editor instance
     */
    public removeFromCache(engineType: string, editor: Editor): void {
        const cacheKey = `${engineType}:${editor.graph?.id || 'no-graph'}`;
        this.instanceCache.delete(cacheKey);
    }

    /**
     * Clear all cached engine instances
     */
    public clearCache(): void {
        this.instanceCache.clear();
    }

    /**
     * Get default engine type
     */
    public getDefaultEngineType(): string {
        return this.defaultEngineType;
    }

    /**
     * Set default engine type
     * @param engineType Engine type identifier
     */
    public setDefaultEngineType(engineType: string): void {
        if (!this.engines.has(engineType)) {
            throw new Error(`Cannot set default engine type to unregistered type '${engineType}'`);
        }
        this.defaultEngineType = engineType;
    }

    /**
     * Create engine using default engine type
     * @param editor Editor instance
     * @param useCache Whether to use instance caching (default: true)
     */
    public createDefaultEngine(editor: Editor, useCache: boolean = true): any {
        return this.createEngine(this.defaultEngineType, editor, useCache);
    }

    /**
     * Remove engine type from registry
     * @param engineType Engine type identifier
     */
    public unregisterEngineType(engineType: string): void {
        if (!this.engines.has(engineType)) {
            throw new Error(`Cannot unregister unregistered engine type '${engineType}'`);
        }
        this.engines.delete(engineType);
        
        // Reset default engine type if it was the one being unregistered
        if (this.defaultEngineType === engineType) {
            const availableTypes = this.getAvailableEngineTypes();
            this.defaultEngineType = availableTypes.length > 0 ? availableTypes[0] : "dependency";
        }

        // Remove all cached instances of this engine type
        Array.from(this.instanceCache.keys())
            .filter(key => key.startsWith(`${engineType}:`))
            .forEach(key => this.instanceCache.delete(key));
    }

    /**
     * Clear all registered engine types and cached instances
     */
    public clear(): void {
        this.engines.clear();
        this.instanceCache.clear();
        this.defaultEngineType = "dependency";
        this.registerBuiltInEngines(); // Re-register built-in engines
    }

    /**
     * Get number of registered engine types
     */
    public getEngineCount(): number {
        return this.engines.size;
    }

    /**
     * Get number of cached engine instances
     */
    public getCacheSize(): number {
        return this.instanceCache.size;
    }
}

// Export global singleton instance
export const engineRegistryInstance = EngineRegistry.getInstance();