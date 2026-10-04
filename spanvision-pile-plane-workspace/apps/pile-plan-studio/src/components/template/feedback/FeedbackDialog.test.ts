import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("FeedbackDialog product target", () => {
  it("downloads feedback without opening an upstream issue", () => {
    const source = readFileSync(resolve(import.meta.dirname, "FeedbackDialog.tsx"), "utf8");

    assert.match(source, /Pile-Plane-Workspace-feedback\.md/);
    assert.doesNotMatch(source, /github\.com|GITHUB_OWNER|openExternal/);
    assert.doesNotMatch(source, /OpenAEC-style-book/);
  });

  it("allows every non-empty feedback message", () => {
    const source = readFileSync(resolve(import.meta.dirname, "FeedbackDialog.tsx"), "utf8");

    assert.match(source, /const MIN_CHARS = 1;/);
    assert.match(source, /message\.trim\(\)\.length >= MIN_CHARS/);
  });
});
