import type { Editor } from "./editor";
import { IEnhancedEngine, EngineInfo, EngineConfig, IEngineRegistry } from "./enhanced-engine";

export interface EngineFactory {
    (editor: Editor): IEnhancedEngine<any>;
}

export interface EngineRegistryEntry {
    engineInfo: EngineInfo;
    factory: EngineFactory;
}

/**
 * Engine registry for managing multiple engine types
 */
export class EngineRegistry implements IEngineRegistry {
    private engines: Map<string, EngineRegistryEntry> = new Map();
    private defaultEngineType: string = "dependency";

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
            engineInfo: {
                ...engineInfo,
                type: engineType,
                defaultConfig: {
                    autoStart: true,
                    maxParallelExecutions: 1,
                    enablePerformanceMonitoring: false,
                    enableErrorReporting: false,
                    executionTimeout: 0,
                    enableCaching: false,
                    cacheSizeLimit: 100,
                    validateOutputs: true,
                    ...engineInfo.defaultConfig
                }
            },
            factory
        });
    }

    /**
     * Create a new engine instance
     * @param engineType Engine type identifier
     * @param editor Editor instance
     */
    public createEngine(engineType: string, editor: Editor): IEnhancedEngine<any> {
        const entry = this.engines.get(engineType);
        if (!entry) {
            throw new Error(`Engine type '${engineType}' is not registered`);
        }

        const engine = entry.factory(editor);
        return engine;
    }

    /**
     * Get available engine types
     */
    public getAvailableEngineTypes(): string[] {
        return Array.from(this.engines.keys());
    }

    /**
     * Get engine information
     * @param engineType Engine type identifier
     */
    public getEngineInfo(engineType: string): EngineInfo | undefined {
        const entry = this.engines.get(engineType);
        return entry?.engineInfo;
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
     * Get default engine type
     */
    public getDefaultEngineType(): string {
        return this.defaultEngineType;
    }

    /**
     * Check if engine type is registered
     * @param engineType Engine type identifier
     */
    public hasEngineType(engineType: string): boolean {
        return this.engines.has(engineType);
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
    }

    /**
     * Get all registered engine information
     */
    public getAllEngineInfo(): Map<string, EngineInfo> {
        const result = new Map<string, EngineInfo>();
        this.engines.forEach((entry, engineType) => {
            result.set(engineType, entry.engineInfo);
        });
        return result;
    }

    /**
     * Clear all registered engine types
     */
    public clear(): void {
        this.engines.clear();
        this.defaultEngineType = "dependency";
    }
}

// Export a singleton instance for global access
export const engineRegistry = new EngineRegistry();