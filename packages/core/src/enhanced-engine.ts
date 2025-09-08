import { Graph } from "./graph";
import type { Editor } from "./editor";
import type { AbstractNode } from "./node";
import { BaklavaEvent, PreventableBaklavaEvent } from "@baklavajs/events";
import { IEngine, CalculationResult as CoreCalculationResult } from "./engine";

// Re-export the core CalculationResult for compatibility
export type CalculationResult = CoreCalculationResult;

/**
 * Enhanced engine status enum with additional states
 */
export enum EngineStatus {
    /** The engine is currently running a calculation */
    Running = "Running",
    /** The engine is not currently running a calculation but will do so when the graph changes */
    Idle = "Idle",
    /** The engine is temporarily paused */
    Paused = "Paused",
    /** The engine is not running */
    Stopped = "Stopped",
    /** The engine encountered an error during execution */
    Error = "Error",
    /** The engine is initializing */
    Initializing = "Initializing"
}

/**
 * Engine event types for enhanced event system
 */
export enum EngineEventType {
    /** Emitted when engine status changes */
    StatusChange = "statusChange",
    /** Emitted before engine starts running */
    BeforeRun = "beforeRun",
    /** Emitted after engine completes running */
    AfterRun = "afterRun",
    /** Emitted before a node is calculated */
    BeforeNodeCalculation = "beforeNodeCalculation",
    /** Emitted after a node has been calculated */
    AfterNodeCalculation = "afterNodeCalculation",
    /** Emitted when an error occurs during execution */
    Error = "error",
    /** Emitted when performance metrics are updated */
    MetricsUpdate = "metricsUpdate",
    /** Emitted when configuration changes */
    ConfigChange = "configChange"
}

/**
 * Event handler function type
 */
export type EngineEventHandler<T = any> = (data: T) => void;

/**
 * Performance metrics for engine execution
 */
export interface EngineMetrics {
    /** Total execution time in milliseconds */
    executionTime: number;
    /** Number of nodes processed */
    nodesProcessed: number;
    /** Memory usage in bytes */
    memoryUsage: number;
    /** Peak memory usage during execution */
    peakMemoryUsage: number;
    /** Number of connections processed */
    connectionsProcessed: number;
    /** Execution throughput (nodes per second) */
    throughput: number;
    /** Timestamp of last execution */
    lastExecutionTime: Date;
    /** Error count */
    errorCount: number;
    /** Average execution time per node */
    averageNodeTime: number;
}

/**
 * Engine configuration options
 */
export interface EngineConfig {
    /** Whether to enable auto-start on graph changes */
    autoStart: boolean;
    /** Maximum number of parallel executions */
    maxParallelExecutions: number;
    /** Whether to enable performance monitoring */
    enablePerformanceMonitoring: boolean;
    /** Whether to enable error reporting */
    enableErrorReporting: boolean;
    /** Execution timeout in milliseconds */
    executionTimeout: number;
    /** Whether to enable caching */
    enableCaching: boolean;
    /** Cache size limit */
    cacheSizeLimit: number;
    /** Whether to validate node outputs */
    validateOutputs: boolean;
}

/**
 * Information about an engine type
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
    /** Default configuration */
    defaultConfig: Partial<EngineConfig>;
}

/**
 * Event data for before node calculation
 */
export interface BeforeNodeCalculationEventData {
    /** The node that is about to be calculated */
    node: AbstractNode;
    /** Values for the node's input interfaces */
    inputValues: Record<string, any>;
}

/**
 * Event data for after node calculation
 */
export interface AfterNodeCalculationEventData {
    /** The node that has just been calculated */
    node: AbstractNode;
    /** Output values of the node's calculate method */
    outputValues: Record<string, any>;
}

/**
 * Enhanced IEngine interface with lifecycle management, events, and metrics
 */
export interface IEnhancedEngine<CalculationData> extends IEngine<CalculationData> {
    /**
     * Engine status
     */
    readonly status: EngineStatus;
    
    /**
     * Engine events
     */
    events: {
        /** Emitted when engine status changes */
        statusChange: BaklavaEvent<EngineStatus, IEnhancedEngine<CalculationData>>;
        /** Emitted before engine starts running */
        beforeRun: PreventableBaklavaEvent<CalculationData, IEnhancedEngine<CalculationData>>;
        /** Emitted after engine completes running */
        afterRun: BaklavaEvent<CalculationResult, IEnhancedEngine<CalculationData>>;
        /** Emitted before a node is calculated */
        beforeNodeCalculation: BaklavaEvent<BeforeNodeCalculationEventData, IEnhancedEngine<CalculationData>>;
        /** Emitted after a node has been calculated */
        afterNodeCalculation: BaklavaEvent<AfterNodeCalculationEventData, IEnhancedEngine<CalculationData>>;
    };

    /**
     * Start the engine. After started, it will run every time the graph is changed.
     */
    start(): void;

    /**
     * Stop the engine
     */
    stop(): void;

    /**
     * Temporarily pause the engine
     */
    pause(): void;

    /**
     * Resume the engine from paused state
     */
    resume(): void;

    /**
     * Check if the engine is currently running
     */
    isRunning(): boolean;

    /**
     * Get current engine status
     */
    getStatus(): EngineStatus;

    /**
     * Register event listener
     * @param eventType Event type to listen for
     * @param handler Event handler function
     */
    on(eventType: EngineEventType, handler: EngineEventHandler): void;

    /**
     * Remove event listener
     * @param eventType Event type to remove listener from
     * @param handler Event handler function to remove
     */
    off(eventType: EngineEventType, handler: EngineEventHandler): void;

    /**
     * Get performance metrics
     */
    getMetrics(): EngineMetrics;

    /**
     * Configure engine settings
     * @param config Configuration object
     */
    configure(config: Partial<EngineConfig>): void;

    /**
     * Get current configuration
     */
    getConfig(): EngineConfig;

    /**
     * Reset engine to initial state
     */
    reset(): void;

    /**
     * Get engine information
     */
    getEngineInfo(): EngineInfo;
}

/**
 * Engine registry interface for managing multiple engine types
 */
export interface IEngineRegistry {
    /**
     * Register a new engine type
     * @param engineType Engine type identifier
     * @param engineInfo Engine information
     * @param factory Engine factory function
     */
    registerEngineType(
        engineType: string,
        engineInfo: EngineInfo,
        factory: (editor: Editor) => IEnhancedEngine<any>
    ): void;

    /**
     * Create a new engine instance
     * @param engineType Engine type identifier
     * @param editor Editor instance
     */
    createEngine(engineType: string, editor: Editor): IEnhancedEngine<any>;

    /**
     * Get available engine types
     */
    getAvailableEngineTypes(): string[];

    /**
     * Get engine information
     * @param engineType Engine type identifier
     */
    getEngineInfo(engineType: string): EngineInfo | undefined;

    /**
     * Set default engine type
     * @param engineType Engine type identifier
     */
    setDefaultEngineType(engineType: string): void;

    /**
     * Get default engine type
     */
    getDefaultEngineType(): string;

    /**
     * Check if engine type is registered
     * @param engineType Engine type identifier
     */
    hasEngineType(engineType: string): boolean;

    /**
     * Remove engine type from registry
     * @param engineType Engine type identifier
     */
    unregisterEngineType(engineType: string): void;
}