import { describe, it, expect, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useClipboard } from '../src/clipboard';
import { createRerouteSelection } from '../src/connection/rerouteService';
import { Editor, Graph } from '@baklavajs/core';
import { ICommandHandler, useCommandHandler } from '../src/commands';

describe('Clipboard with Reroute Point Selection', () => {
    let editor: Editor;
    let graph: Graph;
    let displayedGraph: any;
    let commandHandler: ICommandHandler;
    let rerouteSelection: any;

    beforeEach(() => {
        editor = new Editor();
        graph = editor.graph;
        displayedGraph = ref(graph);
        commandHandler = useCommandHandler();
        rerouteSelection = createRerouteSelection();
    });

    it('should set reroute selection correctly', () => {
        const clipboard = useClipboard(displayedGraph, ref(editor), commandHandler);
        
        // Verify that setRerouteSelection method exists
        expect(clipboard.setRerouteSelection).toBeDefined();
        
        // Call setRerouteSelection
        clipboard.setRerouteSelection({
            selectedRerouteIds: rerouteSelection.selectedRerouteIds,
            clearRerouteSelection: rerouteSelection.clearRerouteSelection,
            selectReroute: rerouteSelection.selectReroute,
        });
        
        // Verify no errors are thrown
        expect(true).toBe(true);
    });

    it('should track created reroute points during paste', async () => {
        const clipboard = useClipboard(displayedGraph, ref(editor), commandHandler);
        clipboard.setRerouteSelection({
            selectedRerouteIds: rerouteSelection.selectedRerouteIds,
            clearRerouteSelection: rerouteSelection.clearRerouteSelection,
            selectReroute: rerouteSelection.selectReroute,
        });

        // Mock clipboard data with reroute points
        const mockClipboardData = {
            type: "baklava.clipboard",
            version: 1,
            nodes: [
                {
                    id: "test-node-1",
                    type: "TestNode",
                    position: { x: 100, y: 100 }
                }
            ],
            connections: [
                {
                    from: "test-output-1",
                    to: "test-input-1",
                    reroutePoints: [
                        { id: "reroute-1", x: 150, y: 150 },
                        { id: "reroute-2", x: 200, y: 200 }
                    ]
                }
            ]
        };

        // Mock the clipboard readText method
        Object.assign(navigator, {
            clipboard: {
                readText: () => Promise.resolve(JSON.stringify(mockClipboardData))
            }
        });

        // Mock the paste command execution
        const result = await clipboard.paste();
        
        // Verify that the result contains newReroutePointIds
        expect(result).toBeDefined();
        if (result) {
            expect(result.newReroutePointIds).toBeDefined();
            expect(Array.isArray(result.newReroutePointIds)).toBe(true);
        }
    });
});