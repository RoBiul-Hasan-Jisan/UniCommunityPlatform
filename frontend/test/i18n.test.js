import test from "node:test";
import assert from "node:assert/strict";
import { DICTIONARY, translate } from "../lib/translations.js";

test("every English key has a Bangla translation", () => {
  const missing = Object.keys(DICTIONARY.en).filter((k) => !DICTIONARY.bn[k]);
  assert.deepEqual(missing, []);
});

test("translate falls back to English, then to the key", () => {
  assert.equal(translate("bn", "nav.home"), "হোম");
  assert.equal(translate("fr", "nav.home"), "Home");
  assert.equal(translate("en", "does.not.exist"), "does.not.exist");
});
