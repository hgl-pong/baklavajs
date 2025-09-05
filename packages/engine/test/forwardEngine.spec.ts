import { Editor } from "@baklavajs/core";
import { ForwardEngine } from "../src/forwardEngine";
import { TestNode } from "./testNode";

describe("ForwardEngine", () => {
    it("works on a simple graph", async () => {
        const e = new Editor();
        const n1 = new TestNode();
        const n2 = new TestNode();
        const n3 = new TestNode();
        [n1, n2, n3].forEach((n) => e.graph.addNode(n));
        e.graph.addConnection(n1.outputs.c, n2.inputs.a);
        e.graph.addConnection(n1.outputs.c, n2.inputs.b);
        e.graph.addConnection(n1.outputs.d, n3.inputs.a);
        e.graph.addConnection(n1.outputs.d, n3.inputs.b);
        n1.inputs.a.value = 10;
        n1.inputs.b.value = 5;
        const engine = new ForwardEngine(e);
        const result = (await engine.runOnce(undefined, n1, undefined))!;
        expect(result.size).toEqual(3);
        expect(Object.fromEntries(result.get(n1.id)!.entries())).toEqual({ c: 15, d: 5 });
        expect(Object.fromEntries(result.get(n2.id)!.entries())).toEqual({ c: 30, d: 0 });
        expect(Object.fromEntries(result.get(n3.id)!.entries())).toEqual({ c: 10, d: 0 });
    });

    it("handles initial data transmission with runGraph", async () => {
        const e = new Editor();
        const n1 = new TestNode();
        const n2 = new TestNode();
        [n1, n2].forEach((n) => e.graph.addNode(n));
        e.graph.addConnection(n1.outputs.c, n2.inputs.a);
        e.graph.addConnection(n1.outputs.c, n2.inputs.b); // Connect n2's b input as well
        
        // Set up input values through the inputs map instead of directly on node interfaces
        const inputs = new Map<string, any>();
        inputs.set(n1.inputs.a.id, 20); // Provide initial value for n1 input A
        inputs.set(n1.inputs.b.id, 10); // Provide initial value for n1 input B
        
        const engine = new ForwardEngine(e);
        const result = await engine.runGraph(e.graph, inputs, undefined);
        
        expect(result.size).toEqual(2);
        expect(Object.fromEntries(result.get(n1.id)!.entries())).toEqual({ c: 30, d: 10 });
        expect(Object.fromEntries(result.get(n2.id)!.entries())).toEqual({ c: 60, d: 0 });
    });
});
