<script setup>
import ApiLink from "../components/ApiLink.vue";
</script>

# Commands

Commands are an abstraction to allow for extension of actions in Baklava. You can do everything related to commands using the <ApiLink type="interfaces" module="@baklavajs/renderer-vue" name="ICommandHandler"><code>commandHandler</code></ApiLink>

## Executing existing commands

You can invoke an existing command by its name:

```ts
import { Commands } from "@baklavajs/renderer-vue";

viewModel.commandHandler.executeCommand<Commands.UndoCommand>(Commands.UNDO_COMMAND);
```

## Creating new commands

Let's say you want to create a command that deletes the node with a given id and returns its node type. You can create the command like this:

```ts
import type { ICommandHandler, ICommand } from "../commands";

// first type argument is the return value of the command
// second type argument are the inputs to the command
type MyCommand = ICommand<string, [id: string]>;
viewModel.commandHandler.registerCommand<MyCommand>("MyCommand", {
    canExecute: (id) => !!viewModel.displayedGraph.findNodeById(id),
    execute: (id) => {
        const node = viewModel.displayedGraph.findNodeById(id)!;
        viewModel.displayedGraph.removeNode(node);
        return node.type;
    },
});

// for invoking this command:
viewModel.commandHandler.executeCommand<MyCommand>("MyCommand", true, "myNodeId");
```

## Built-in Commands

Baklava provides several built-in commands for common operations:

### Selection Commands

- **SELECT_ALL_NODES_COMMAND**: Selects all nodes in the current graph
  - Hotkey: `Ctrl + A`
  - Can execute: Only when there are nodes in the graph

### Search Commands

- **OPEN_CANVAS_SEARCH_COMMAND**: Opens the canvas search interface
- **CLOSE_CANVAS_SEARCH_COMMAND**: Closes the canvas search interface  
- **FIND_NEXT_MATCH_COMMAND**: Navigates to the next search result
- **FIND_PREV_MATCH_COMMAND**: Navigates to the previous search result

### Usage Example

```ts
import { Commands } from "@baklavajs/renderer-vue";

// Select all nodes
viewModel.commandHandler.executeCommand(Commands.SELECT_ALL_NODES_COMMAND);

// Open search
viewModel.commandHandler.executeCommand(Commands.OPEN_CANVAS_SEARCH_COMMAND);
```

For more details about search and selection features, see the [Search and Selection](./search-and-selection.md) documentation.
```
