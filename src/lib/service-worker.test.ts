import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const added: string[] = [];
  const removed: string[] = [];
  const offline = new Response("offline");
  let failure = false;
  const self = { location: { origin: "https://eugestor.test" }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  runInNewContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), {
    self, URL, Response,
    fetch: async () => { if (failure) throw new Error("offline"); return new Response("network"); },
    caches: {
      open: async () => ({ addAll: async (urls: string[]) => { added.push(...urls); } }),
      match: async (request: string) => request === "/offline.html" ? offline : undefined,
      keys: async () => ["eugestor-public-v0", "eugestor-public-v1", "other-app"],
      delete: async (key: string) => { removed.push(key); return true; },
    },
  });
  async function lifecycle(name: string) {
    let pending: Promise<unknown> | undefined;
    handlers[name]({ waitUntil: (value: Promise<unknown>) => { pending = value; } });
    await pending;
  }
  function request(path: string, options: { method?: string; mode?: string; destination?: string } = {}) {
    let response: Promise<Response> | undefined;
    handlers.fetch({ request: { url: new URL(path, self.location.origin).href, method: "GET", mode: "cors", destination: "", ...options }, respondWith: (value: Promise<Response>) => { response = value; } });
    return response;
  }
  return { added, removed, lifecycle, request, offline: () => { failure = true; } };
}

test("precache contains only public assets and activation preserves other caches", async () => {
  const sw = worker();
  await sw.lifecycle("install");
  assert.ok(sw.added.includes("/offline.html"));
  assert.ok(sw.added.every((url) => url === "/offline.html" || url.startsWith("/pwa/")));
  await sw.lifecycle("activate");
  assert.deepEqual(sw.removed, ["eugestor-public-v0"]);
});

test("authenticated pages use network and fall back to generic offline content", async () => {
  const sw = worker();
  assert.equal(await (await sw.request("/access-control", { mode: "navigate", destination: "document" }))?.text(), "network");
  sw.offline();
  assert.equal(await (await sw.request("/access-control", { mode: "navigate", destination: "document" }))?.text(), "offline");
});

test("does not intercept API, mutations, Next payloads or external iframe requests", () => {
  const sw = worker();
  for (const path of ["/api/users", "/auth/me", "/home?_rsc=test", "https://api.eugestor.test/users"]) assert.equal(sw.request(path), undefined);
  assert.equal(sw.request("/home", { method: "POST", mode: "navigate", destination: "document" }), undefined);
  assert.equal(sw.request("https://external.test/", { mode: "navigate", destination: "iframe" }), undefined);
});
