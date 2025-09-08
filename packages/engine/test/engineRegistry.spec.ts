import { Editor } from "@baklavajs/core";
import { engineRegistryInstance, EngineRegistry } from "../src/engineRegistry";
import { DependencyEngine } from "../src/dependencyEngine";
import { ForwardEngine } from "../src/forwardEngine";

describe("Engine Registry", () => {
    let editor: Editor;

    beforeEach(() => {
        editor = new Editor();
    });

    afterEach(() => {
        // Clean up any engine instances
        engineRegistryInstance.clearCache();
    });

    test("should be a singleton", () => {
        const instance1 = EngineRegistry.getInstance();
        const instance2 = EngineRegistry.getInstance();
        expect(instance1).toBe(instance2);
    });

    test("should have built-in engines registered", () => {
        const availableTypes = engineRegistryInstance.getAvailableEngineTypes();
        expect(availableTypes).toContain("dependency");
        expect(availableTypes).toContain("forward");
    });

    test("should create dependency engine instance", () => {
        const engine = engineRegistryInstance.createEngine("dependency", editor);
        expect(engine).toBeDefined();
        expect(engine).toBeInstanceOf(DependencyEngine);
    });

    test("should create forward engine instance", () => {
        const engine = engineRegistryInstance.createEngine("forward", editor);
        expect(engine).toBeDefined();
        expect(engine).toBeInstanceOf(ForwardEngine);
    });

    test("should throw error for unknown engine type", () => {
        expect(() => {
            engineRegistryInstance.createEngine("unknown", editor);
        }).toThrow("Engine type 'unknown' is not registered");
    });

    test("should cache engine instances", () => {
        const engine1 = engineRegistryInstance.createEngine("dependency", editor);
        const engine2 = engineRegistryInstance.createEngine("dependency", editor);
        expect(engine1).toBe(engine2); // Same instance due to caching
    });

    test("should not cache when useCache is false", () => {
        const engine1 = engineRegistryInstance.createEngine("dependency", editor, false);
        const engine2 = engineRegistryInstance.createEngine("dependency", editor, false);
        expect(engine1).not.toBe(engine2); // Different instances
    });

    test("should get engine information", () => {
        const info = engineRegistryInstance.getEngineInfo("dependency");
        expect(info).toBeDefined();
        expect(info?.name).toBe("Dependency Engine");
        expect(info?.description).toContain("topological sorting");
    });

    test("should return all engine information", () => {
        const allInfo = engineRegistryInstance.getAllEngineInfo();
        expect(allInfo.size).toBeGreaterThanOrEqual(2);
        expect(allInfo.has("dependency")).toBe(true);
        expect(allInfo.has("forward")).toBe(true);
    });

    test("should get default engine type", () => {
        const defaultType = engineRegistryInstance.getDefaultEngineType();
        expect(["dependency", "forward"]).toContain(defaultType);
    });

    test("should set default engine type", () => {
        engineRegistryInstance.setDefaultEngineType("forward");
        const defaultType = engineRegistryInstance.getDefaultEngineType();
        expect(defaultType).toBe("forward");
    });

    test("should throw when setting invalid default engine type", () => {
        expect(() => {
            engineRegistryInstance.setDefaultEngineType("invalid");
        }).toThrow("Cannot set default engine type to unregistered type 'invalid'");
    });

    test("should check if engine type exists", () => {
        expect(engineRegistryInstance.hasEngineType("dependency")).toBe(true);
        expect(engineRegistryInstance.hasEngineType("forward")).toBe(true);
        expect(engineRegistryInstance.hasEngineType("invalid")).toBe(false);
    });

    test("should remove from cache", () => {
        const engine1 = engineRegistryInstance.createEngine("dependency", editor);
        engineRegistryInstance.removeFromCache("dependency", editor);
        const engine2 = engineRegistryInstance.createEngine("dependency", editor);
        expect(engine1).not.toBe(engine2); // Different instances after cache removal
    });

    test("should clear cache", () => {
        const engine1 = engineRegistryInstance.createEngine("dependency", editor);
        engineRegistryInstance.clearCache();
        const engine2 = engineRegistryInstance.createEngine("dependency", editor);
        expect(engine1).not.toBe(engine2); // Different instances after cache clear
    });
});

// Basic engine functionality tests - engines have their own interfaces
describe("Engine Basic Functionality", () => {
    let editor: Editor;
    let dependencyEngine: any;
    let forwardEngine: any;

    beforeEach(() => {
        editor = new Editor();
        dependencyEngine = engineRegistryInstance.createEngine("dependency", editor);
        forwardEngine = engineRegistryInstance.createEngine("forward", editor);
    });

    test("should have basic engine methods", () => {
        // Dependency Engine methods
        expect(typeof dependencyEngine.start).toBe("function");
        expect(typeof dependencyEngine.stop).toBe("function");
        expect(typeof dependencyEngine.pause).toBe("function");
        expect(typeof dependencyEngine.resume).toBe("function");
        expect(typeof dependencyEngine.runOnce).toBe("function");
        
        // Forward Engine methods  
        expect(typeof forwardEngine.start).toBe("function");
        expect(typeof forwardEngine.stop).toBe("function");
        expect(typeof forwardEngine.pause).toBe("function");
        expect(typeof forwardEngine.resume).toBe("function");
        expect(typeof forwardEngine.runOnce).toBe("function");
    });

    test("should manage engine status", () => {
        // Test basic status management
        expect(dependencyEngine.status).toBeDefined();
        expect(forwardEngine.status).toBeDefined();
        
        dependencyEngine.start();
        expect(["Idle", "Running"]).toContain(dependencyEngine.status);
        
        forwardEngine.start();
        expect(["Idle", "Running"]).toContain(forwardEngine.status);
    });
});