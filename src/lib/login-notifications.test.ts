import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { requestLoginNotifications } from "./login-notifications";

const original = Object.getOwnPropertyDescriptor(globalThis, "window");
afterEach(() => { if (original) Object.defineProperty(globalThis, "window", original); else Reflect.deleteProperty(globalThis, "window"); });
function setup(permission: NotificationPermission = "default", request = async (): Promise<NotificationPermission> => "granted", storage = new Map<string, string>()) {
  let calls = 0;
  const window = { isSecureContext: true, Notification: { permission, requestPermission: () => { calls++; return request(); } }, localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  return { calls: () => calls, window, storage };
}
test("requests natively during the click and only once across page reloads", async () => {
  const first = setup();
  const result = requestLoginNotifications();
  assert.equal(first.calls(), 1);
  assert.equal(await result, "granted");
  await requestLoginNotifications();
  assert.equal(first.calls(), 1);
  const reloaded = setup("default", async () => "granted", first.storage);
  await requestLoginNotifications();
  assert.equal(reloaded.calls(), 0);
});
test("does not ask again after an existing grant or denial", async () => {
  for (const permission of ["granted", "denied"] as const) {
    const state = setup(permission);
    assert.equal(await requestLoginNotifications(), permission);
    assert.equal(state.calls(), 0);
  }
});
test("dismissal, rejection and blocked storage never block login", async () => {
  setup("default", async () => "default");
  assert.equal(await requestLoginNotifications(), "default");
  const failed = setup("default", async () => { throw new Error("blocked"); });
  failed.window.localStorage.getItem = () => { throw new Error("storage blocked"); };
  failed.window.localStorage.setItem = () => { throw new Error("storage blocked"); };
  assert.equal(await requestLoginNotifications(), "default");
  await requestLoginNotifications();
  assert.equal(failed.calls(), 1);
});
test("does not wait indefinitely for an unanswered permission prompt", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  setup("default", () => new Promise(() => {}));
  const result = requestLoginNotifications();
  context.mock.timers.tick(8500);
  assert.equal(await result, "default");
});
test("unsupported browsers and insecure contexts do not request permission", async () => {
  const state = setup();
  state.window.isSecureContext = false;
  assert.equal(await requestLoginNotifications(), "unsupported");
  assert.equal(state.calls(), 0);
  Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: true } });
  assert.equal(await requestLoginNotifications(), "unsupported");
});
