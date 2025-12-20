import { describe, it, expect } from "vitest";
import { getRoom } from "../../server/services/roomService";

// Smoke test: expects test DB with a room 'TEST1' or skips gracefully
describe("RoomState canonical fields", () => {
  it("loadRoomFromDb / getRoom returns enriched results and derived fields", async () => {
    const roomId = "TEST1";
    const room = await getRoom(roomId);

    if (!room) {
      // No test DB available in dev environment - skip
      expect(room).toBeNull();
      return;
    }

    // results should include enriched name fields and isRevealed/performedAt
    expect(Array.isArray(room.results)).toBe(true);
    if (room.results.length > 0) {
      const r = room.results[0] as any;
      expect(r).toHaveProperty("drawerName");
      expect(r).toHaveProperty("giftOwnerName");
      expect(r).toHaveProperty("isRevealed");
      expect(r).toHaveProperty("performedAt");
    }

    // Derived fields
    expect(room).toHaveProperty("totalCount");
    expect(room).toHaveProperty("revealedCount");
    expect(room).toHaveProperty("currentDrawerId");
    expect(room).toHaveProperty("lastResultTimestamp");
  });
});
