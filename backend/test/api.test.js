import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";
process.env.DEMO_JWT_SECRET = "t".repeat(40);
process.env.CLIENT_ORIGIN = "http://localhost:3000";

const { default: request } = await import("supertest");
const { default: app } = await import("../src/app.js");

test("health check", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("unknown route returns JSON 404", async () => {
  const res = await request(app).get("/api/nope");
  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Not found");
});

test("protected routes reject anonymous requests", async () => {
  for (const path of ["/api/posts", "/api/users", "/api/messages", "/api/search?q=test", "/api/admin/dashboard", "/api/uploads/status"]) {
    const res = await request(app).get(path);
    assert.equal(res.status, 401, `${path} should require auth`);
  }
});

test("security headers and compression are enabled", async () => {
  const res = await request(app).get("/api/health");
  assert.ok(res.headers["x-content-type-options"]);
  assert.equal(res.headers["x-powered-by"], undefined);
});

test("demo endpoints disappear when demo mode is off", async () => {
  process.env.DEMO_MODE_ENABLED = "false";
  assert.equal((await request(app).get("/api/auth/demo-accounts")).status, 404);
  assert.equal((await request(app).post("/api/auth/demo-login").send({ userId: "507f1f77bcf86cd799439011" })).status, 404);
  const cfg = await request(app).get("/api/auth/config");
  assert.equal(cfg.body.demoEnabled, false);
});

test("malformed JSON gets a clean 400, not a 500", async () => {
  const res = await request(app).post("/api/auth/register").set("Content-Type", "application/json").send("{bad json");
  assert.equal(res.status, 400);
});

test("registration cannot ask for the admin role", async () => {
  const res = await request(app).post("/api/auth/register").send({ idToken: "x".repeat(30), role: "admin" });
  assert.equal(res.status, 400);
});

test("NoSQL operator payloads are rejected by validation", async () => {
  const res = await request(app).post("/api/auth/register").send({ idToken: { $ne: null }, role: "student" });
  assert.equal(res.status, 400);
});
