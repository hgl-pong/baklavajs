import { defineNode } from "@baklavajs/core";
import { TextareaInputInterface } from "../src";

export default defineNode({
    type: "CommentNode",
    title: "Comment",
    titleBackgroundColor: "#fff3b8",
    titleForegroundColor: "#2c2c2c",
    inputs: {
        content: () => new TextareaInputInterface("Content", "").setPort(false).setComponent(null),
    },
    onCreate() {
        // Set a default size for the comment node
        (this as any).width = 200;
        (this as any).height = 150;
    }
});
