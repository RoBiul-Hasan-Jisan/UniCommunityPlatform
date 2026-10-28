import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";

const v = await import("../src/validators/index.js");
const { validate, escapeRegex } = await import("../src/middleware/validate.js");

test("createPostSchema trims content and rejects empty / oversized posts", () => {
  assert.equal(v.createPostSchema.parse({ content: "  hello  " }).content, "hello");
  assert.equal(v.createPostSchema.safeParse({ content: "   " }).success, false);
  assert.equal(v.createPostSchema.safeParse({ content: "x".repeat(5001) }).success, false);
  assert.equal(v.createPostSchema.safeParse({ content: "hi", category: "NotACategory" }).success, false);
});

test("images must be https URLs, max 4", () => {
  assert.equal(v.createPostSchema.safeParse({ content: "a", images: ["http://x.com/a.png"] }).success, false);
  assert.equal(v.createPostSchema.safeParse({ content: "a", images: ["https://x.com/a.png"] }).success, true);
  assert.equal(v.createPostSchema.safeParse({ content: "a", images: Array(5).fill("https://x.com/a.png") }).success, false);
});

test("message needs text or an attachment", () => {
  assert.equal(v.sendMessageSchema.safeParse({ text: "   " }).success, false);
  assert.equal(v.sendMessageSchema.safeParse({ text: "hi" }).success, true);
  assert.equal(v.sendMessageSchema.safeParse({ attachmentUrl: "https://x.com/a.png" }).success, true);
});

test("objectId and role allow-lists", () => {
  assert.equal(v.startConversationSchema.safeParse({ userId: "507f1f77bcf86cd799439011" }).success, true);
  assert.equal(v.startConversationSchema.safeParse({ userId: "nope" }).success, false);
  assert.equal(v.startConversationSchema.safeParse({ userId: { $ne: null } }).success, false);
  // "admin" can never be requested at registration
  assert.equal(v.registerSchema.safeParse({ idToken: "x".repeat(20), role: "admin" }).success, false);
});

test("report target types match the model", () => {
  assert.equal(v.reportSchema.safeParse({ targetType: "post", targetId: "507f1f77bcf86cd799439011", reason: "spam" }).success, true);
  assert.equal(v.reportSchema.safeParse({ targetType: "Post", targetId: "507f1f77bcf86cd799439011", reason: "spam" }).success, false);
});

test("profile update only accepts known, well-typed fields", () => {
  const parsed = v.updateProfileSchema.parse({ about: "hi", role: "admin", isDemo: true });
  assert.equal(parsed.role, undefined); // unknown keys are stripped, so role can't be escalated
  assert.equal(parsed.isDemo, undefined);
  assert.equal(v.updateProfileSchema.safeParse({ skills: "not-an-array" }).success, false);
  assert.equal(v.updateProfileSchema.safeParse({ avatarUrl: "javascript:alert(1)" }).success, false);
});

test("validate() middleware replies 400 with a readable message", () => {
  const mw = validate(v.createPostSchema);
  let status, body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; } };
  mw({ body: { content: "" } }, res, () => assert.fail("should not call next"));
  assert.equal(status, 400);
  assert.match(body.error, /content/);
});

test("escapeRegex neutralises regex metacharacters", () => {
  const rx = new RegExp(escapeRegex("a.*(b"), "i");
  assert.ok(rx.test("xx a.*(b yy"));
  assert.ok(!rx.test("aXXXb"));
});
