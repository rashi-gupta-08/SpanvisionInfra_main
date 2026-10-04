import test from "node:test";
import assert from "node:assert/strict";
import { resolveCanvasTone } from "./canvasBackground.ts";
import { normalizeUserSettings, patchUserSettings } from "./userSettings.ts";

test("new profiles use mono while legacy themes and explicit canvas choices survive", () => {
  const fresh = normalizeUserSettings(null);
  assert.equal(resolveCanvasTone(fresh.preferences.canvasBackground, fresh.preferences.theme), "mono");
  const legacy = normalizeUserSettings({ preferences: { theme: "openaec", canvasBackground: "light" } });
  assert.equal(legacy.preferences.theme, "openaec");
  assert.equal(resolveCanvasTone(legacy.preferences.canvasBackground, "spanvision-mono"), "light");
  assert.equal(resolveCanvasTone("auto", "light"), "light");
  assert.equal(resolveCanvasTone("mono", "light"), "mono");
  const changed = patchUserSettings(legacy, { canvasBackground: "mono" });
  assert.equal(changed.preferences.canvasBackground, "mono");
  assert.equal(legacy.preferences.canvasBackground, "light");
});
