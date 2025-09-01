import { defineNode } from "@baklavajs/core";
import { TextareaInputInterface } from "../src";

export default defineNode({
    type: "CommentNode",
    title: "Comment",
    inputs: {
        content: () => new TextareaInputInterface("Content", "").setPort(false).setComponent(null),
    },
    onCreate() {
        // Set a default size for the comment node
        (this as any).width = 200;
        (this as any).height = 150;
    }
});
