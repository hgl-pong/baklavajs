import { Ref } from "vue";
import type { ICommand, ICommandHandler } from "../commands";
import type { IRerouteService } from "./rerouteService";

export const DELETE_REROUTE_POINT_COMMAND = "DELETE_REROUTE_POINT";
export type DeleteReroutePointCommand = ICommand<void>;

export function registerDeleteReroutePointCommand(
    rerouteService: IRerouteService,
    rerouteSelection: { selectedRerouteIds: Ref<string[]>; clearRerouteSelection: () => void },
    handler: ICommandHandler
) {
    handler.registerCommand(DELETE_REROUTE_POINT_COMMAND, {
        canExecute: () => rerouteSelection.selectedRerouteIds.value.length > 0,
        execute() {
            const selectedIds = rerouteSelection.selectedRerouteIds.value;
            if (selectedIds.length > 0) {
                // 删除所有选中的 reroute point
                selectedIds.forEach(id => {
                    rerouteService.removeReroutePoint(id);
                });
                rerouteSelection.clearRerouteSelection();
            }
        },
    });
    handler.registerHotkey(["Delete"], DELETE_REROUTE_POINT_COMMAND);
}