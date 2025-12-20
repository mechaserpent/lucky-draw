// Test setup: ensure basic globals and environment are present
// jsdom should provide window/location by default; set a predictable host
if (typeof window !== "undefined" && window.location) {
  try {
    // ensure host and protocol present
    (window.location as any).protocol = window.location.protocol || "http:";
    (window.location as any).host = window.location.host || "localhost";
    (window.location as any).hostname = window.location.hostname || "localhost";
  } catch (e) {
    // ignore
  }
}

// Provide a noop console.debug if missing
if (!(console as any).debug) (console as any).debug = () => {};
