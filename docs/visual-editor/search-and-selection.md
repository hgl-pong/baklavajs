<script setup>
import ApiLink from "../components/ApiLink.vue";
</script>

# 搜索和选择功能

本文档介绍了Baklava编辑器中的搜索和选择功能，这些功能可以帮助用户更高效地管理和操作节点。

## 全选功能 (Select All)

### 概述
全选功能允许用户一次性选择画布上的所有节点，方便进行批量操作。

### 使用方法
- **快捷键**: `Ctrl + A`
- **命令**: `SELECT_ALL_NODES_COMMAND`

### 实现细节
全选功能通过 `selectAllNodes.command.ts` 实现：

```ts
import { Ref } from "vue";
import { Graph } from "@baklavajs/core";
import type { ICommand, ICommandHandler } from "../commands";

export const SELECT_ALL_NODES_COMMAND = "SELECT_ALL_NODES";
export type SelectAllNodesCommand = ICommand<void>;

export function registerSelectAllNodesCommand(displayedGraph: Ref<Graph>, handler: ICommandHandler) {
    handler.registerCommand(SELECT_ALL_NODES_COMMAND, {
        canExecute: () => displayedGraph.value.nodes.length > 0,
        execute() {
            // Select all nodes in the current graph
            displayedGraph.value.selectedNodes = [...displayedGraph.value.nodes];
        },
    });
    handler.registerHotkey(["Control", "a"], SELECT_ALL_NODES_COMMAND, {
        preventDefault: true,
        stopPropagation: true,
    });
}
```

### 功能特点
- 只有当画布上存在节点时才能执行
- 支持键盘快捷键操作
- 自动阻止默认浏览器行为

## 画布搜索功能 (Canvas Search)

### 概述
画布搜索功能允许用户在当前图形中快速查找节点，支持按节点标题、类型和接口名称进行搜索。

### 使用方法
- **打开搜索**: `OPEN_CANVAS_SEARCH_COMMAND`
- **关闭搜索**: `CLOSE_CANVAS_SEARCH_COMMAND`
- **下一个结果**: `FIND_NEXT_MATCH_COMMAND`
- **上一个结果**: `FIND_PREV_MATCH_COMMAND`

### 搜索范围
搜索功能支持以下内容的匹配：
1. **节点标题** (Node Title)
2. **节点类型** (Node Type)
3. **输入接口名称** (Input Interface Names)
4. **输出接口名称** (Output Interface Names)

### 实现细节

#### 搜索状态管理
```ts
export interface ICanvasSearchState {
    visible: boolean;     // 搜索框是否可见
    query: string;        // 搜索查询字符串
    total: number;        // 搜索结果总数
    index: number;        // 当前结果索引（从0开始）
    open: () => void;     // 打开搜索
    close: () => void;    // 关闭搜索
    next: () => void;     // 下一个结果
    prev: () => void;     // 上一个结果
}
```

#### 搜索算法
搜索功能使用计算属性实时过滤节点：

```ts
const matches = computed<AbstractNode[]>(() => {
    const q = query.value.trim().toLowerCase();
    if (!q) return [];
    const nodes = displayedGraph.value?.nodes ?? [];
    return nodes.filter((n) => {
        const title = (n.title ?? "").toString().toLowerCase();
        const type = (n.type ?? "").toString().toLowerCase();
        if (title.includes(q) || type.includes(q)) return true;
        // Also search interface names
        const inputs = Object.values(n.inputs ?? {});
        const outputs = Object.values(n.outputs ?? {});
        return (
            inputs.some((i) => (i.name ?? "").toString().toLowerCase().includes(q)) ||
            outputs.some((o) => (o.name ?? "").toString().toLowerCase().includes(q))
        );
    });
});
```

### 功能特点
- **实时搜索**: 输入时即时显示结果
- **多字段匹配**: 支持标题、类型、接口名称搜索
- **结果导航**: 支持在搜索结果间快速切换
- **视觉反馈**: 高亮显示当前匹配的节点
- **状态保持**: 记住之前的选择状态

## 节点面板搜索 (Node Palette Search)

### 概述
节点面板搜索功能允许用户在节点面板中快速查找可用的节点类型，提高节点添加的效率。

### 实现位置
该功能主要在以下文件中实现：
- `packages/renderer-vue/src/nodepalette/NodePalette.vue`
- `packages/renderer-vue/src/nodepalette/PaletteEntry.vue`

### 功能特点
- **即时过滤**: 输入搜索词时实时过滤节点列表
- **模糊匹配**: 支持部分匹配和模糊搜索
- **分类保持**: 搜索时保持节点的分类结构

## 小地图功能 (Minimap)

### 概述
小地图功能为用户提供了整个画布的缩略视图，方便在大型图形中进行导航和定位。

### 实现位置
- `packages/renderer-vue/src/editor/Editor.vue`
- `packages/themes/src/classic/components/minimap.scss`

### 功能特点
- **实时更新**: 画布变化时小地图同步更新
- **交互导航**: 点击小地图可快速跳转到对应区域
- **视口指示**: 显示当前可见区域的位置
- **样式自定义**: 支持通过CSS自定义外观

## 注释节点功能 (Comment Node)

### 概述
注释节点功能允许用户在图形中添加文本注释，用于文档说明和标注。

### 实现位置
- `packages/renderer-vue/playground/CommentNodeRenderer.vue`
- 主题样式文件中的相关变量

### 功能特点
- **富文本支持**: 支持多行文本和基本格式
- **视觉区分**: 与普通节点有明显的视觉区别
- **主题适配**: 支持不同主题的样式适配

## 分组功能 (Group)

### 概述
分组功能允许用户将相关的节点组织在一起，提高图形的可读性和组织性。

### 实现位置
- `packages/renderer-vue/playground/CommentNodeRenderer.vue`
- 相关的测试文件

### 功能特点
- **视觉分组**: 为相关节点提供视觉上的分组
- **层次管理**: 支持分组的层次结构
- **交互操作**: 支持分组的选择、移动等操作

## 使用示例

### 注册搜索功能
```ts
import { registerCanvasSearch } from "@baklavajs/renderer-vue";

// 在视图模型中注册搜索功能
const searchState = registerCanvasSearch(
    displayedGraph,
    commandHandler,
    hooks
);

// 使用搜索功能
searchState.open();  // 打开搜索
searchState.close(); // 关闭搜索
```

### 注册全选功能
```ts
import { registerSelectAllNodesCommand } from "@baklavajs/renderer-vue";

// 注册全选命令
registerSelectAllNodesCommand(displayedGraph, commandHandler);

// 执行全选
commandHandler.executeCommand(SELECT_ALL_NODES_COMMAND);
```

## 相关命令列表

| 命令名称 | 功能描述 | 快捷键 |
|---------|---------|--------|
| `SELECT_ALL_NODES_COMMAND` | 选择所有节点 | Ctrl+A |
| `OPEN_CANVAS_SEARCH_COMMAND` | 打开画布搜索 | - |
| `CLOSE_CANVAS_SEARCH_COMMAND` | 关闭画布搜索 | - |
| `FIND_NEXT_MATCH_COMMAND` | 下一个搜索结果 | - |
| `FIND_PREV_MATCH_COMMAND` | 上一个搜索结果 | - |

## 注意事项

1. **性能考虑**: 在大型图形中使用搜索功能时，建议限制搜索结果的数量以保持良好的性能。

2. **键盘快捷键**: 确保快捷键不与浏览器或其他应用程序的快捷键冲突。

3. **主题兼容性**: 使用自定义主题时，确保新功能的样式与主题保持一致。

4. **扩展性**: 这些功能都是基于命令系统实现的，可以根据需要进行扩展和自定义。