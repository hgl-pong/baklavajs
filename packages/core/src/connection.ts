import { v4 as uuidv4 } from "uuid";
import { BaklavaEvent, IBaklavaEventEmitter } from "@baklavajs/events";
import type { NodeInterface } from "./nodeInterface";

export interface IConnection {
    id: string;
    from: NodeInterface;
    to: NodeInterface;
}

export interface IConnectionState extends Record<string, any> {
    /** id of the connection */
    id: string;
    /** id of the source interface */
    from: string;
    /** id of the target interface */
    to: string;
    /** reroute points for the connection */
    reroutePoints?: Array<{
        id: string;
        x: number;
        y: number;
    }>;
}

export class Connection implements IConnection, IBaklavaEventEmitter {
    public id: string;
    public from: NodeInterface;
    public to: NodeInterface;
    public destructed = false;
    public reroutePoints: Array<{
        id: string;
        x: number;
        y: number;
    }> = [];

    public events = {
        destruct: new BaklavaEvent<void, Connection>(this),
    } as const;

    public constructor(from: NodeInterface, to: NodeInterface) {
        if (!from || !to) {
            throw new Error("Cannot initialize connection with null/undefined for 'from' or 'to' values");
        }

        this.id = uuidv4();
        this.from = from;
        this.to = to;

        this.from.connectionCount++;
        this.to.connectionCount++;
    }

    public destruct(): void {
        this.events.destruct.emit();
        this.from.connectionCount--;
        this.to.connectionCount--;
        this.destructed = true;
    }

    /**
     * Add a reroute point to the connection
     * @param x X coordinate
     * @param y Y coordinate
     * @param id Optional ID (will be generated if not provided)
     * @returns The created reroute point
     */
    public addReroutePoint(x: number, y: number, id?: string): { id: string; x: number; y: number } {
        const reroutePoint = {
            id: id || `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x,
            y,
        };
        this.reroutePoints.push(reroutePoint);
        return reroutePoint;
    }

    /**
     * Remove a reroute point from the connection
     * @param id ID of the reroute point to remove
     * @returns True if the point was found and removed, false otherwise
     */
    public removeReroutePoint(id: string): boolean {
        const index = this.reroutePoints.findIndex(point => point.id === id);
        if (index !== -1) {
            this.reroutePoints.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Update a reroute point's position
     * @param id ID of the reroute point to update
     * @param x New X coordinate
     * @param y New Y coordinate
     * @returns True if the point was found and updated, false otherwise
     */
    public updateReroutePoint(id: string, x: number, y: number): boolean {
        const point = this.reroutePoints.find(point => point.id === id);
        if (point) {
            point.x = x;
            point.y = y;
            return true;
        }
        return false;
    }

    /**
     * Clear all reroute points from the connection
     */
    public clearReroutePoints(): void {
        this.reroutePoints.length = 0;
    }

    /**
     * Get all reroute points for the connection
     * @returns Array of reroute points
     */
    public getReroutePoints(): Array<{ id: string; x: number; y: number }> {
        return [...this.reroutePoints];
    }
}

/**
 * This class is used for calculation purposes only.
 * It won't alter any state of the connected nodes
 */
export class DummyConnection implements IConnection {
    public id: string;
    public from: NodeInterface;
    public to: NodeInterface;

    public constructor(from: NodeInterface, to: NodeInterface) {
        if (!from || !to) {
            throw new Error("Cannot initialize connection with null/undefined for 'from' or 'to' values");
        }

        this.id = uuidv4();
        this.from = from;
        this.to = to;
    }
}
