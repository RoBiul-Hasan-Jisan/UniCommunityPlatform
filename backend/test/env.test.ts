import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";

const env = await import("../src/config/env.js");

function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] === undefined) delete process.env[k]; else process.env[k] = vars[k]; }
  try { return fn(); } finally { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
}

test("demo mode defaults ON in development and OFF in production", () => {
  withEnv({ NODE_ENV: "development", DEMO_MODE_ENABLED: undefined }, () => assert.equal(env.isDemoEnabled(), true));
  withEnv({ NODE_ENV: "production", DEMO_MODE_ENABLED: undefined }, () => assert.equal(env.isDemoEnabled(), false));
  withEnv({ NODE_ENV: "production", DEMO_MODE_ENABLED: "true" }, () => assert.equal(env.isDemoEnabled(), true));
  withEnv({ NODE_ENV: "development", DEMO_MODE_ENABLED: "false" }, () => assert.equal(env.isDemoEnabled(), false));
});

test("production refuses weak or missing secrets", () => {
  withEnv({ NODE_ENV: "production", MONGODB_URI: "mongodb://x", DEMO_JWT_SECRET: "short", CLIENT_ORIGIN: "https://a.b" }, () => {
    assert.ok(env.validateEnv().errors.some((e) => /DEMO_JWT_SECRET/.test(e)));
  });
  withEnv({ NODE_ENV: "production", MONGODB_URI: "mongodb://x", DEMO_JWT_SECRET: "k".repeat(48) + "Z9", CLIENT_ORIGIN: undefined }, () => {
    assert.ok(env.validateEnv().errors.some((e) => /CLIENT_ORIGIN/.test(e)));
  });
  withEnv({ NODE_ENV: "development", MONGODB_URI: undefined, DEMO_JWT_SECRET: "x" }, () => {
    assert.ok(env.validateEnv().errors.some((e) => /MONGODB_URI/.test(e)));
  });
});

test("university email domains", () => {
  withEnv({ UNIVERSITY_EMAIL_DOMAINS: "uni.edu, @college.ac.bd" }, () => {
    assert.equal(env.isUniversityEmail("a@uni.edu"), true);
    assert.equal(env.isUniversityEmail("a@cs.uni.edu"), true);
    assert.equal(env.isUniversityEmail("a@notuni.edu"), false);
    assert.equal(env.isUniversityEmail("a@college.ac.bd"), true);
  });
  withEnv({ UNIVERSITY_EMAIL_DOMAINS: undefined }, () => assert.equal(env.isUniversityEmail("a@uni.edu"), false));
});
