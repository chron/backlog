import { describe, expect, it } from "vitest";
import { isMapNodeAvailable, mapEdges, mapNodes } from "./content";

describe("authored act map", () => {
  it("has valid forward edges and explicit node coordinates", () => {
    const nodesById = new Map(mapNodes.map((node) => [node.id, node]));

    for (const node of mapNodes) {
      expect(node.position.x).toBeGreaterThan(0);
      expect(node.position.x).toBeLessThan(100);
      expect(node.position.y).toBeGreaterThan(0);
      expect(node.position.y).toBeLessThan(100);
    }

    for (const edge of mapEdges) {
      const from = nodesById.get(edge.fromNodeId);
      const to = nodesById.get(edge.toNodeId);
      expect(from, `${edge.fromNodeId} should exist`).toBeDefined();
      expect(to, `${edge.toNodeId} should exist`).toBeDefined();
      expect(to?.position.y).toBeGreaterThan(from?.position.y ?? Number.POSITIVE_INFINITY);
    }
  });

  it("offers only roots initially and only direct children after a choice", () => {
    const availableFrom = (currentNodeId: string | null, completedNodeIds: readonly string[]) =>
      mapNodes
        .filter((node) => isMapNodeAvailable(node, currentNodeId, completedNodeIds))
        .map((node) => node.id);

    expect(availableFrom(null, [])).toEqual(["cycle-1"]);
    expect(availableFrom("cycle-1", ["cycle-1"])).toEqual(["event-1", "shop-1"]);
    expect(availableFrom("event-1", ["cycle-1", "event-1"])).toEqual(["cycle-2"]);
    expect(availableFrom("cycle-2", ["cycle-1", "event-1", "cycle-2"])).toEqual([
      "event-2",
      "shop-2",
    ]);
  });
});
