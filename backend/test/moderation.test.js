import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";

const { checkContent, extractHashtags } = await import("../src/utils/moderation.js");

test("normal text passes", () => {
  assert.equal(checkContent("Hello everyone, workshop on Friday!"), null);
});

test("configured blocked words are matched as whole words only", () => {
  process.env.BLOCKED_WORDS = "badword,worse";
  assert.ok(checkContent("this is a BadWord here"));
  assert.equal(checkContent("badwordsmith is a name"), null); // no false positive inside a longer word
  delete process.env.BLOCKED_WORDS;
});

test("spam heuristics", () => {
  assert.ok(checkContent(Array(8).fill("https://spam.example/x").join(" ")));
  assert.ok(checkContent("a".repeat(30)));
  assert.ok(checkContent("BUY NOW CHEAP THINGS BUY NOW CHEAP THINGS BUY NOW CHEAP THINGS"));
  assert.equal(checkContent("OK"), null);
});

test("hashtag extraction", () => {
  assert.deepEqual(extractHashtags("Loving #React and #web_dev! #react"), ["react", "web_dev"]);
  assert.deepEqual(extractHashtags("no tags, price is 5#"), []);
});
