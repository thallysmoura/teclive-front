import { test } from "node:test";
import assert from "node:assert/strict";
import { restorePresenceSession } from "./api";

test("presence recovery retries temporary server failures instead of declaring logout", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await assert.rejects(restorePresenceSession());
});

test("presence recovery retries a temporary refresh failure", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => new Response(null, { status: url.endsWith("/auth/refresh") ? 503 : 401 }));
  await assert.rejects(restorePresenceSession());
});

test("presence recovery recognizes a definitively expired session", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  assert.equal(await restorePresenceSession(), false);
});

test("concurrent presence recoveries share a single token refresh", async (t) => {
  let refreshed = false;
  let refreshes = 0;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      await new Promise<void>((resolve) => setImmediate(resolve));
      refreshed = true;
      return Response.json({ user: { id: "ana" } });
    }
    return refreshed ? Response.json({ id: "ana" }) : new Response(null, { status: 401 });
  });
  assert.deepEqual(await Promise.all([restorePresenceSession(), restorePresenceSession()]), [true, true]);
  assert.equal(refreshes, 1);
});
