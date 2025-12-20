import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Simple mocks for Nuxt composables used in useWebSocket
vi.stubGlobal("useState", (key: string, init: any) => ({
  value: init ? init() : undefined,
}));
vi.stubGlobal("useDeviceId", () => ({
  updateSessionId: vi.fn(),
  saveReconnectInfo: vi.fn(),
  clearReconnectInfo: vi.fn(),
  getReconnectInfo: vi.fn(),
}));

// Mock global WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: any[] = [];
  public readyState: number = MockWebSocket.CONNECTING;
  public url: string;
  public onopen: any = null;
  public onclose: any = null;
  public onmessage: any = null;
  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // stay CONNECTING until test triggers onopen
  }
  send() {}
  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
}

vi.stubGlobal("WebSocket", MockWebSocket as any);

import { useWebSocket } from "../app/composables/useWebSocket";

describe("useWebSocket", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  it("does not create a new socket when already CONNECTING", () => {
    const ws = useWebSocket();
    // simulate a connecting socket
    ws.ws.value = { readyState: MockWebSocket.CONNECTING };

    ws.connect();
    expect(MockWebSocket.instances.length).toBe(0);
  });

  it("updates device session on reconnect_success", () => {
    const ws = useWebSocket();

    // connect (creates mock instance)
    ws.connect();
    expect(MockWebSocket.instances.length).toBe(1);

    const inst = MockWebSocket.instances[0];
    // simulate open
    inst.readyState = MockWebSocket.OPEN;
    if (inst.onopen) inst.onopen();

    // simulate server message reconnect_success
    const msg = {
      type: "reconnect_success",
      payload: {
        room: {},
        player: { id: "P_TEST", name: "Tester", isHost: false },
      },
    };

    const deviceIdMock = vi.mocked((global as any).useDeviceId());

    // trigger onmessage
    if (inst.onmessage) inst.onmessage({ data: JSON.stringify(msg) });

    // Expect updateSessionId called with reconnected player id
    expect(deviceIdMock.updateSessionId).toHaveBeenCalledWith("P_TEST");
    expect(ws.playerId.value).toBe("P_TEST");
  });
});
