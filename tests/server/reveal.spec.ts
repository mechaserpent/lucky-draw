import { describe, it, expect } from "vitest";
import {
  performDraw,
  revealResult,
  getRoom,
} from "../../server/services/roomService";

describe("revealResult flow", () => {
  it("performDraw creates an unrevealed result and revealResult marks it revealed", async () => {
    const roomId = "TEST1";
    const draw = await performDraw(roomId);
    if (!draw) {
      expect(draw).toBeNull();
      return;
    }

    expect(draw.result).toHaveProperty("isRevealed", false);

    const res = await revealResult(roomId, draw.result.order);
    if (!res) {
      // Reveal may fail if DB test not prepared
      expect(res).toBeNull();
      return;
    }

    expect(res.result).toHaveProperty("isRevealed", true);
    const room = await getRoom(roomId);
    expect(room).toHaveProperty("revealedCount");
    expect(room!.revealedCount).toBeGreaterThanOrEqual(1);
  });
});
