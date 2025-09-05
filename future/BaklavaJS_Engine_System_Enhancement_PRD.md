# BaklavaJS Engine System Enhancement - PRD文档

## 项目概述

### 目标
构建一个可扩展、高性能的引擎系统，支持多种执行策略和自定义引擎，提升BaklavaJS的计算能力和灵活性。

### 版本计划
- **v2.8**：基础引擎接口扩展和ForwardEngine完成
- **v2.9**：插件化架构和性能监控
- **v3.0**：完整生态系统和高级功能

## 1. 现状分析

### 当前架构问题

**IEngine接口局限性：**
- 仅包含`runGraph`和`getInputValues`两个方法
- 缺乏生命周期管理方法
- 缺少事件和钩子系统
- 不支持自定义引擎注册

**ForwardEngine未完成项：**
- 多连接处理问题（TODO注释）
- 初始数据传输机制缺失
- 执行流程未优化
- 类型安全性不足

**架构缺失：**
- 统一的引擎管理系统
- 性能监控接口
- 插件化支持机制

## 2. 接口设计

### 增强的IEngine接口
```typescript
export interface IEngine<CalculationData = any> {
    // 核心执行
    runGraph(graph: Graph, inputs: Map<string, any>, calculationData: CalculationData): Promise<CalculationResult>;
    getInputValues(graph: Graph): Map<string, any>;
    
    // 生命周期管理
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    
    // 状态查询
    getStatus(): EngineStatus;
    isRunning(): boolean;
    
    // 事件系统
    on(event: EngineEventType, callback: EngineEventHandler): void;
    off(event: EngineEventType, callback: EngineEventHandler): void;
    
    // 性能监控
    getMetrics(): EngineMetrics;
    
    // 配置管理
    configure(config: EngineConfig): void;
    getConfig(): EngineConfig;
}
```

### 引擎注册表接口
```typescript
export interface EngineRegistry {
    registerEngineType<T extends IEngine>(type: string, constructor: new (editor: Editor) => T): void;
    createEngine<T extends IEngine>(type: string, editor: Editor): T;
    getAvailableEngineTypes(): string[];
    getEngineInfo(type: string): EngineInfo;
    setDefaultEngineType(type: string): void;
    getDefaultEngineType(): string;
}
```

## 3. ForwardEngine完整实现

### 多连接处理解决方案
```typescript
private async processOutputConnections(
    node: AbstractNode,
    graph: Graph,
    outputData: Record<string, any>,
    inputs: Map<string, any>,
    calculationData: CalculationData,
    result: CalculationResult,
): Promise<void> {
    const outgoingConnections = graph.connections.filter(c => 
        Object.values(node.outputs).includes(c.from)
    );
    
    // 按目标节点分组处理多连接
    const connectionsByTarget = new Map<AbstractNode, IConnection[]>();
    
    for (const connection of outgoingConnections) {
        const targetNode = graph.findNodeById(connection.to.nodeId);
        if (!targetNode) continue;
        
        if (!connectionsByTarget.has(targetNode)) {
            connectionsByTarget.set(targetNode, []);
        }
        connectionsByTarget.get(targetNode)!.push(connection);
    }
    
    // 处理每个目标节点的所有连接
    for (const [targetNode, connections] of connectionsByTarget) {
        await this.processTargetNodeConnections(
            targetNode,
            connections,
            outputData,
            inputs,
            calculationData,
            result
        );
    }
}
```

### 初始数据传输机制
```typescript
protected override async execute(
    calculationData: CalculationData,
    startingNode?: AbstractNode,
    initialData?: Map<string, any>,
): Promise<CalculationResult> {
    const inputs = this.getInputValues(this.editor.graph);
    
    // 合并初始数据
    if (initialData) {
        initialData.forEach((value, key) => {
            inputs.set(key, value);
        });
    }
    
    return await this.runGraph(
        this.editor.graph,
        inputs,
        calculationData
    );
}
```

## 4. 架构改进

### 引擎管理器
```typescript
export class EngineManager {
    private engines = new Map<string, IEngine>();
    private defaultEngineType = "dependency";
    
    createEngine<T extends IEngine>(type: string): T {
        const constructor = this.getEngineConstructor(type);
        const engine = new constructor(this.editor);
        this.engines.set(type, engine);
        return engine as T;
    }
    
    startAll(): void {
        this.engines.forEach(engine => engine.start());
    }
    
    stopAll(): void {
        this.engines.forEach(engine => engine.stop());
    }
}
```

### 插件系统架构
```typescript
export interface EnginePlugin {
    name: string;
    version: string;
    
    beforeEngineStart?(engine: IEngine): void;
    afterEngineStart?(engine: IEngine): void;
    beforeNodeCalculation?(context: PluginContext): void;
    afterNodeCalculation?(context: PluginContext): void;
    
    hooks?: Record<string, HookFunction>;
}
```

## 5. 实施路线图

### 阶段1：接口重构（2周）
- [ ] 增强IEngine接口
- [ ] 创建引擎注册表
- [ ] 标准化执行上下文

### 阶段2：ForwardEngine完善（1周）
- [ ] 实现多连接处理
- [ ] 添加初始数据传输
- [ ] 优化执行流程

### 阶段3：插件系统（2周）
- [ ] 设计插件接口
- [ ] 实现插件引擎
- [ ] 提供示例插件

### 阶段4：性能监控（1周）
- [ ] 实现监控接口
- [ ] 添加监控界面
- [ ] 优化建议生成

## 6. 测试计划

### 单元测试
- 引擎接口功能验证
- ForwardEngine多连接场景
- 插件系统集成

### 性能测试
- 大规模节点图性能
- 内存使用检测
- 并发执行稳定性

### 集成测试
- 现有编辑器兼容性
- 多引擎切换测试
- 向后兼容性验证

## 7. 向后兼容性

### API兼容性
- 保持现有IEngine接口不变
- 新增方法为可选
- 提供迁移指南

### 行为兼容性
- DependencyEngine行为完全保持
- 现有配置格式支持
- 旧版本插件适配层

## 8. 成功指标

### 性能指标
- ForwardEngine比DependencyEngine快30%
- 内存使用减少20%
- 执行时间稳定性提升

### 功能指标
- 支持至少3种自定义引擎
- 插件系统可用性
- 监控功能完整性

### 质量指标
- 99.9%测试用例通过率
- 无重大回归问题
- 文档完整度100%

## 9. 风险评估

### 技术风险
1. **性能影响**：通过性能监控和缓存优化缓解
2. **API变更破坏性**：保持向后兼容，分阶段发布
3. **插件系统复杂性**：提供详细文档和示例

### 项目风险
1. **时间延误**：采用敏捷开发，分阶段交付
2. **资源不足**：优先核心功能，逐步扩展
3. **质量风险**：加强测试和代码审查

## 10. 附录

### 相关文件位置
- `packages/core/src/engine.ts` - 核心引擎接口
- `packages/engine/src/forwardEngine.ts` - ForwardEngine实现
- `packages/engine/src/baseEngine.ts` - 引擎基类
- `packages/engine/src/dependencyEngine.ts` - 依赖引擎

### 开发指南
1. 遵循现有代码风格和模式
2. 优先解决TODO注释问题
3. 确保向后兼容性
4. 提供完整的测试用例

### 发布计划
- **v2.8.0**：基础引擎增强
- **v2.8.1**：ForwardEngine完成
- **v2.9.0**：插件系统发布
- **v3.0.0**：完整生态系统

---

**文档版本：** 1.0.0  
**最后更新：** 2025-09-05  
**负责人：** Engine Development Team