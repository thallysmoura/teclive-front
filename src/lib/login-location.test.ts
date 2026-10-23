import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { requestLoginLocation } from "./login-location";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
afterEach(() => {
  for (const [key, descriptor] of [["window", originalWindow], ["navigator", originalNavigator]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
function setup(getCurrentPosition?: (...args: unknown[]) => void, secure = true) {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: secure } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { geolocation: getCurrentPosition ? { getCurrentPosition } : undefined } });
}
test("shares only the browser-provided location after a successful request", async () => {
  setup((success) => (success as (value: unknown) => void)({ coords: { latitude: -3.1, longitude: -60.02, accuracy: 25 } }));
  assert.deepEqual(await requestLoginLocation(), { locationStatus: "shared", location: { latitude: -3.1, longitude: -60.02, accuracy: 25 } });
});
test("denial never blocks login or includes coordinates", async () => {
  setup((_success, failure) => (failure as (value: unknown) => void)({ code: 1 }));
  assert.deepEqual(await requestLoginLocation(), { locationStatus: "denied" });
});
test("unsupported, insecure and failing geolocation remain optional", async () => {
  setup();
  assert.deepEqual(await requestLoginLocation(), { locationStatus: "unavailable" });
  setup(() => { throw new Error("browser failure"); });
  assert.deepEqual(await requestLoginLocation(), { locationStatus: "unavailable" });
  setup(() => { throw new Error("should not be called"); }, false);
  assert.deepEqual(await requestLoginLocation(), { locationStatus: "unavailable" });
});
test("an unanswered permission prompt does not wait indefinitely", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  setup(() => {});
  const result = requestLoginLocation();
  context.mock.timers.tick(8500);
  assert.deepEqual(await result, { locationStatus: "unavailable" });
});
