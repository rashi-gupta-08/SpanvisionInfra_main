<script>
  import { _ } from "svelte-i18n";
  import ProfileLibrary from "./ProfileLibrary.svelte";
  import ProfileCanvas from "./ProfileCanvas.svelte";
  import ProfileParams from "./ProfileParams.svelte";
  import ProfileToolbar from "./ProfileToolbar.svelte";
  import { profileEditor, editorProfile } from "../../stores/profileEditor.js";

  let leftWidth = 260;
  let mobilePanel = null;

  // Start met leeg nieuw profiel
  if (!$editorProfile) {
    profileEditor.newProfile();
  }
</script>

<div class="profile-editor-view" class:show-library={mobilePanel === "library"} class:show-params={mobilePanel === "params"}>
  <div class="profile-mobile-controls">
    <button aria-expanded={mobilePanel === "library"} onclick={() => mobilePanel = mobilePanel === "library" ? null : "library"}>{$_("profileEditor.library")}</button>
    <button aria-expanded={mobilePanel === "params"} onclick={() => mobilePanel = mobilePanel === "params" ? null : "params"}>{$_("shell.properties")}</button>
    <button onclick={() => mobilePanel = null}>{$_("shell.canvas")}</button>
  </div>
  <div class="pe-sidebar" style="width:{leftWidth}px">
    <ProfileLibrary />
  </div>

  <div class="pe-canvas-area">
    <ProfileToolbar />
    <ProfileCanvas />
  </div>

  <div class="pe-params">
    <ProfileParams />
  </div>
</div>

<style>
  .profile-editor-view {
    display: flex;
    flex: 1;
    overflow: hidden;
    background: var(--bg-surface);
  }

  .pe-sidebar {
    flex-shrink: 0;
    border-right: var(--border-default);
    overflow-y: auto;
    background: var(--bg-surface);
  }

  .pe-canvas-area {
    flex: 1;
    min-width: 0;
    position: relative;
    overflow: hidden;
    background: var(--editor-bg, var(--bg-surface-alt));
  }

  .pe-params {
    width: 280px;
    flex-shrink: 0;
    border-left: var(--border-default);
    overflow-y: auto;
    background: var(--bg-surface);
  }
  .profile-mobile-controls { display: none; }
  @media (max-width: 1023px) {
    .profile-editor-view { position: relative; padding-top: 48px; min-width: 0; }
    .profile-mobile-controls { display: flex; position: absolute; top: 0; left: 0; right: 0; gap: 4px; padding: 4px 8px; height: 48px; border-bottom: var(--border-default); }
    .profile-mobile-controls button { padding: 8px 12px; border: var(--border-default); border-radius: 4px; }
    .pe-sidebar, .pe-params { display: none; }
    .show-library .pe-sidebar, .show-params .pe-params { display: block; position: absolute; z-index: 10; top: 48px; bottom: 0; width: min(300px, calc(100% - 32px)) !important; box-shadow: var(--shadow-lg); }
    .show-library .pe-sidebar { left: 0; } .show-params .pe-params { right: 0; }
  }
</style>
