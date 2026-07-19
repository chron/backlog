import { describe, expect, it } from "vitest";
import { taskBoardLayoutClass } from "./CycleScreen";

describe("Cycle Task board layout", () => {
  it("preserves dedicated layouts for one through four Tasks", () => {
    expect([1, 2, 3, 4].map(taskBoardLayoutClass)).toEqual(["1", "2", "3", "4"]);
  });

  it("uses the compact board for five Tasks and temporary sixth Tasks", () => {
    expect(taskBoardLayoutClass(5)).toBe("compact");
    expect(taskBoardLayoutClass(6)).toBe("compact");
  });
});
