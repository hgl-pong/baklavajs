import { Ref } from "vue";
import type { ICommand, ICommandHandler } from "../commands";
import type { IRerouteService } from "./rerouteService";

export const DELETE_REROUTE_POINT_COMMAND = "DELETE_REROUTE_POINT";
export type DeleteReroutePointCommand = ICommand<void>;

export function registerDeleteReroutePointCommand(
    rerouteService: IRerouteService,
    rerouteSelection: { selectedRerouteId: Ref<string | null>; unselectReroute: () => void },
    handler: ICommandHandler
) {
    handler.registerCommand(DELETE_REROUTE_POINT_COMMAND, {
        canExecute: () => rerouteSelection.selectedRerouteId.value !== null,
        execute() {
            const selectedId = rerouteSelection.selectedRerouteId.value;
            if (selectedId) {
                rerouteService.removeReroutePoint(selectedId);
                rerouteSelection.unselectReroute();
            }
        },
    });
    handler.registerHotkey(["Delete"], DELETE_REROUTE_POINT_COMMAND);
}