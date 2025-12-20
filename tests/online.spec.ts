import { describe, it, expect, vi, beforeEach } from "vitest";
import { shallowMount } from "@vue/test-utils";

// Mock composables used by the component
const onSpy = vi.fn();
const offSpy = vi.fn();
const sendSpy = vi.fn();
vi.stubGlobal("useWebSocket", () => ({
  on: onSpy,
  off: offSpy,
  send: sendSpy,
  connect: vi.fn(),
  isConnected: { value: false },
  roomState: { value: null },
}));

vi.stubGlobal("useI18n", () => ({ t: (k: string) => k }));
vi.stubGlobal("useRouter", () => ({ push: vi.fn(), replace: vi.fn() }));
vi.stubGlobal("useRoute", () => ({ query: {} }));
vi.stubGlobal("useDynamicConfig", () => ({ settings: { value: {} } }));
vi.stubGlobal("useHistory", () => ({ addRecord: vi.fn() }));
vi.stubGlobal("useClipboard", () => ({ copyToClipboard: async () => true }));
vi.stubGlobal("useShareImage", () => ({ generateResultImage: vi.fn() }));

// Import component after stubbing globals so module initialization uses mocks
const Online = (await import("../app/pages/online.vue")).default;

describe("Online page", () => {
  beforeEach(() => {
    onSpy.mockClear();
    offSpy.mockClear();
  });

  it("registers and removes event handlers on mount/unmount", () => {
    const wrapper = shallowMount(Online);

    // Expect handler registration on mount
    expect(onSpy).toHaveBeenCalled();

    wrapper.unmount();

    // Expect off called to remove handlers
    expect(offSpy).toHaveBeenCalled();
  });

  it("handles draw_performed from server and uses server-provided names", () => {
    const wrapper = shallowMount(Online);

    // find the handler registered for drawPerformed
    const drawHandlerCall = onSpy.mock.calls.find(
      (c) => c[0] === "drawPerformed",
    );
    expect(drawHandlerCall).toBeTruthy();

    const handler = drawHandlerCall![1];

    // simulate server payload (room has no revealed results yet)
    const resultPayload = ({
      order: 1,
      drawerId: 3,
      giftOwnerId: 4,
      drawerName: "Alice",
      giftOwnerName: "Bob",
      isRevealed: false,
    }(
      // set initial roomState to match server's draw_performed payload (no revealed results)
      wrapper.vm as any,
    ).roomState = {
      value: {
        players: [
          { participantId: 3, name: "Alice" },
          { participantId: 4, name: "Bob" },
        ],
        results: [],
      },
    });

    // call handler (animation should start)
    handler(resultPayload);

    // assert drawInProgress set and animation data prepared
    expect((wrapper.vm as any).drawInProgress.value).toBe(true);
    expect((wrapper.vm as any).resultGiftOwner).toBe("Bob");

    // results list should NOT contain the unrevealed result yet
    expect(
      ((wrapper.vm as any).roomState.value.results as any).some(
        (r: any) => r.order === (resultPayload as any).order,
      ),
    ).toBe(false);
    expect(
      ((wrapper.vm as any).formattedResults as any).value.some(
        (r: any) => r.order === (resultPayload as any).order,
      ),
    )
      .toBe(false)
      (
        // simulate animation end and expect confirm_reveal to be sent
        wrapper.vm as any,
      )
      .onAnimationEnd();
    expect(sendSpy).toHaveBeenCalledWith({
      type: "confirm_reveal",
      payload: { order: (resultPayload as any).order },
    });

    // find resultRevealed handler and invoke with server payload
    const revealedCall = onSpy.mock.calls.find(
      (c) => c[0] === "resultRevealed",
    );
    expect(revealedCall).toBeTruthy();
    const revealedHandler = revealedCall![1];
    const revealedPayload = {
      room: {
        results: [
          {
            order: (resultPayload as any).order,
            isRevealed: true,
            drawerName: "Alice",
            giftOwnerName: "Bob",
          },
        ],
        players: [],
      },
      result: {
        order: (resultPayload as any).order,
        isRevealed: true,
        drawerName: "Alice",
        giftOwnerName: "Bob",
      },
    };
    revealedHandler(revealedPayload);

    // drawInProgress should be cleared after server announces reveal
    expect((wrapper.vm as any).drawInProgress.value).toBe(false);
    expect(
      ((wrapper.vm as any).formattedResults as any).value.some(
        (r: any) => r.order === (resultPayload as any).order,
      ),
    ).toBe(true);
  });
});
