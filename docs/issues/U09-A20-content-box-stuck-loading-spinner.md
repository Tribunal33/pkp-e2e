# In the custom page or custom block window, a "Content" box can stay covered by a "Loading..." spinner

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#4578`, `pkp/omp#1809`, `pkp/ops#845` for `pkp/pkp-lib#9366` · [553ade67fc](https://github.com/pkp/ojs/commit/553ade67fc0706e8d496b8cd9c312a9d374049dc) (OJS; OMP [82a096b9e](https://github.com/pkp/omp/commit/82a096b9e57d62bd54489898b2b7b1b5d9fb8e13), OPS [94a29e5ea0](https://github.com/pkp/ops/commit/94a29e5ea0e9f8f8c691ed1588ef3654f5928556)) · 2025-01-13 · Blesilda Ramirez (blesildaramirez): the move to TinyMCE 7, under which an older pkp-lib error leaves the spinner (Cause)
- **Upstream** `pkp/pkp-lib#13180` (open; PR `pkp/pkp-lib#13381`, not yet in main), which fixes a related read in `MultilingualInputHandler.isIncomplete_()` but not the `deactivate` handler that leaves the spinner
- **Tracked in** spec U09 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a20)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager of a journal, press or server with two or more form languages
(English and French, say) opens the "Custom Page" item window or the
custom block window. Each has one "Content" box per language. When the
manager's browser is slow to set up the French box, the page's
JavaScript fails and a "Loading..." spinner covers the English box for
as long as the window stays open. The box takes no click, and nothing
typed reaches it.

The rest of the window still works and saves: only what the manager
meant to write in that one box is missed, and closing the window and
opening it again gives a working box. The slow set-up is rare: it needs
the manager's browser to be heavily loaded.

## Impact

- **Lost**: only the keys typed into the covered box once the spinner
  shows. The window's other boxes save as usual ("Title", "Path"), and
  nothing already saved changes.
- **Who**: whoever edits custom pages, or custom blocks (with the
  "Custom Block Manager" plugin on), on Settings › Website, on a context
  with two or more form languages. It needs the manager's browser, not
  the server, to be slow: in 11 windows opened without forcing the order,
  none stuck, even with the browser's CPU slowed 20 times.
- **Way round**: close the window and open it again, or save and reopen
  the item to fill that box. No message explains the spinner.

Low: nothing saved is lost or wrong, the rest of the window saves, and
reopening it gives a working box; the order that triggers it was not
seen in ordinary use on screen. It would be medium if it proved common
on slow machines, since the box then fails with no explanation.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Its
  `publicknowledge` context already has English and French as "Forms"
  languages.
- Chrome. The fault needs the French "Content" box to finish setting up
  after the English one, which a heavily loaded browser does now and
  then. To see it every time, open the developer tools' Console before
  step 3 and paste this snippet. It delays by 3 seconds the `load` event
  of the French box's editing frame (its `id` holds `-fr_CA-`), and
  changes nothing else:

  ```js
  (() => { const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (type === 'load' && this instanceof HTMLIFrameElement && /-fr_CA-/.test(this.id) && typeof fn === 'function') {
        const frame = this;
        return add.call(this, type, function (e) {
          const late = new Proxy(e, {get: (t, k) => k === 'composedPath' ? () => [frame] : (k === 'target' || k === 'currentTarget') ? frame : typeof t[k] === 'function' ? t[k].bind(t) : t[k]});
          setTimeout(() => fn.call(frame, late), 3000);
        }, opts);
      }
      return add.call(this, type, fn, opts);
    }; })();
  ```

The "Custom Page" item window:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Setup" › "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. Under "Navigation Menu Items", press "Add item".
4. In "Navigation Menu Type", choose "Custom Page".
5. Wait 5 seconds, until the English "Content" box's button bar (bold,
   italic, …) is shown. With the snippet the spinner is already over the
   box by then.
6. Click into the English "Content" box and type "Hello".
7. Type "u09a20 page" into the English "Title" box and "u09a20-page" into
   "Path", then press "Save".

The custom block window:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins" › "Installed Plugins" and tick
   "Enabled" on "Custom Block Manager" (off in the dataset). Paste the
   snippet now.
3. Open the row's arrow, then "Manage Custom Blocks", then "Add Block".
4. Wait 5 seconds, until the English "Content" box's button bar is shown.
5. Click into the English "Content" box and type "Hello".

**Expected**: the English box takes the click and holds "Hello", as it
does when the French box finishes first.

**Observed**: a "Loading..." spinner covers the English "Content" box
and stays there. The click lands on the spinner, not the box, and
nothing is typed:

```html
<div aria-busy="true" class="tox-throbber">
  <div tabindex="0" aria-label="Loading..." class="tox-throbber__busy-spinner">…</div>
```

The browser logs this error twice as the window opens:

```
TypeError: Cannot read properties of undefined (reading 'serialize')
```

In the item window, "Save" (step 7) closes the window and lists "u09a20
page". It is saved with its title and path and an empty "Content".

## Cause

pkp's older (jQuery) forms create one TinyMCE editor per language box,
the first form language first
(`lib/pkp/js/classes/Handler.js::initializeTinyMCE()`,
`tinyMCE.EditorManager.createEditor(id, settings).render()`). TinyMCE's
`EditorManager.add()` makes each new editor the active one without
sending `activate` or `deactivate`. So while the boxes set up, the last
language's editor is the active one.

When an earlier editor (English) finishes first, TinyMCE's `initEditor()`
sets `initialized = true`, then calls `editor.focus(true)`. That calls
`EditorManager.setActive()`, which sends `deactivate` to the still-active
French editor. pkp's `deactivate` handler, which shows pkp's own
placeholder (`lib/pkp/js/controllers/SiteHandler.js::triggerTinyMCESetup()`,
lines 312–317 on main, 306–311 on 3.5), calls
`tinyMCEObject.target.getContent()` on it. The French editor has no
`serializer` yet, so `getContentFromBody()` throws.

TinyMCE's event dispatch does not catch the error. The throw unwinds
`initEditor()` and the `loadContentCss(editor).then(...)` callback that
called it, so `cancelProgress()` never runs. TinyMCE 7's start-up
spinner (`startProgress()`, shown after 500 ms) then stays. The rest of
`initEditor()` is skipped too, including `init_instance_callback`. That
callback fires the `tinyMCEInitialized` event, on which
`FormHandler.tinyMCEInitHandler_` binds the box's save-on-blur and
validation.

With three or more languages the same holds: the first box to finish is
covered when the last language's box has not finished yet. Every box
after it deactivates an editor that has loaded, so at most one box per
window is covered.

The second logged error comes from
`lib/pkp/js/controllers/form/MultilingualInputHandler.js::isIncomplete_()`
(lines 169–179). It is called once 500 ms after the field is set up (and
again whenever the language popover closes), and it calls `getContent()`
on every language's editor, so it throws if the French editor is still
loading then. It does not cause the spinner: it only leaves the field's
language marker unset. This is the read `pkp/pkp-lib#13180` reports.

The `deactivate` handler has read the content of the editor being
deactivated since pkp added placeholders in 2014 (`pkp/pkp-lib#63`,
[ccc4bbcc20](https://github.com/pkp/pkp-lib/commit/ccc4bbcc20c2d17699b5571febb3a31f0ef4a322);
`.target.getContent()` since TinyMCE 4, `pkp/pkp-lib#254`,
[3f5f8361f0](https://github.com/pkp/pkp-lib/commit/3f5f8361f0f23efdc8137696d98fb2fef8e2a92e)).
TinyMCE 4 and 5 (3.3 and 3.4) throw at the same place, but they start an
editor without a spinner, so the box stays usable there. TinyMCE 7.0
added the start-up spinner.

Reach:

- The "Custom Page" item window, and the custom block window with
  "Custom Block Manager" on: seen on screen, three apps, `main` and 3.5.
- The same handler serves every older-form box with one editor per
  language (templates read, not seen on screen): the static page window
  (OJS, OMP, with "Static Pages" on), review forms and their items, the
  section window's policy (OJS, OPS) and the series window (OMP), OMP's
  chapter window, OJS's issue window and subscription types and policy,
  and a user's biography and signature.
- The Vue forms' boxes
  (`lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue`)
  register no such handler.
- Stored data: none.

## Proposed fix

Make both handlers skip an editor that has not finished setting up.
TinyMCE sets `initialized` once an editor can be read.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/content-box-stuck-loading-spinner/fix.diff)
applies to the app root on main, and on 3.5 with a 6-line offset in
`SiteHandler.js`:

```diff
--- a/lib/pkp/js/controllers/SiteHandler.js
+++ b/lib/pkp/js/controllers/SiteHandler.js
 		tinyMCEObject.on('deactivate', function(tinyMCEObject) {
+			// An editor still loading has no content to read yet (TinyMCE makes
+			// each new editor the active one, so the first editor of a form to
+			// finish loading deactivates one that has not); its 'init' handler
+			// above sets the placeholder once it has loaded.
+			if (!tinyMCEObject.target.initialized) {
+				return;
+			}
 			// Show the placholder when the editor is deactivated
 			if (!tinyMCEObject.target.getContent().length) {
--- a/lib/pkp/js/controllers/form/MultilingualInputHandler.js
+++ b/lib/pkp/js/controllers/form/MultilingualInputHandler.js
 			$popover.find('textarea').each(function() {
-				var id = $(this).attr('id'),
-						tinymce;
+				// An editor still loading has no content to read yet: its
+				// textarea holds the value it will load.
+				var $textarea = $(this),
+						editor = tinyMCE.EditorManager.get(/** @type {string} */(
+								$textarea.attr('id'))),
+						content = editor && editor.initialized ?
+								editor.getContent() : $textarea.val();
 
-				$inputs.push($(this));
-				tinymce = tinyMCE.EditorManager.get(/** @type {string} */(
-						$(this).attr('id')));
-				if (tinymce.getContent()) {
+				$inputs.push($textarea);
+				if (content) {
 					valuesCount++;
 				}
```

The second hunk is the change `pkp/pkp-lib#13381` proposes; with it the
page logs no error.

- **Where the rule lives**: `triggerTinyMCESetup()` is pkp's shared
  set-up for every older-form editor, and `isIncomplete_()` is the shared
  multilingual field handler, so one guard each covers every window.
- **Every instance**: `lib/pkp/js`, the apps' `js/` and plugins, and
  `lib/ui-library/src`, searched for `getContent` and TinyMCE event
  handlers. The `init` handler in `SiteHandler.js` runs after
  `initialized` is set. The `activate` handler in
  `AdvancedReviewerSearchHandler.js` fires on an editor taking the focus,
  which has loaded. The `pkpWordcount` plugin reads on its own editor's
  events. All three are left as they are.
- **Intent kept**: the placeholder still hides and shows. An editor that
  is still loading gets its placeholder from the `init` handler.
- **What it touches**: two handlers in the browser; no REST API, plugin
  hook or stored data. Each app commits its rebuilt `js/pkp.min.js`
  (`lib/pkp/tools/buildjs.sh`), as it does for every pkp-lib JavaScript
  change (`pkp/pkp-lib#12903`). On 3.4 and 3.3 the same guard would
  remove the script error; there is no spinner there to fix.
- **Tried**: with the fix in, the English box took the click and held
  "Hello" in both windows on all three apps, with no page error. The
  "Content" field's language marker still read incomplete with one
  language filled and complete with both, as without the fix.

**Alternatives**:

- `pkp/pkp-lib#13381` alone: it removes the `isIncomplete_()` error but
  leaves the `deactivate` handler's throw, which is the one that stops
  the editor's start-up.
- A `try`/`catch` around the handler's read: it would also hide any
  other fault there, where the flag names exactly what is wrong.
- Dropping pkp's own placeholder (the `init`, `activate` and `deactivate`
  handlers) for TinyMCE's `placeholder` option: a larger change of look
  and behaviour, not tried.

Small: a few lines in two pkp-lib files and the usual `js/pkp.min.js`
rebuild; no test harness for the older JavaScript handlers exists, so
the guard is an end-to-end check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/content-box-stuck-loading-spinner/walk.js)
  takes the Steps with the snippet on each app, each window in a fresh
  browser (`save` adds step 7; `control`, `cpu=20` and `neighbour` run
  without the snippet):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/content-box-stuck-loading-spinner/walk.js [save|control|cpu=20|neighbour]`.
- Fix tried on `main`, three apps:
  `node bin/try-fix.js apply shared/playwright/checks/issues/content-box-stuck-loading-spinner/fix.diff ojs omp ops`,
  then the script with and without `neighbour`, then `revert`. The test
  installs load pkp's JavaScript from source (`enable_minified = Off`),
  so no rebuild was needed.
- Tips: `main` OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7 (lib/pkp
  2e377d27fc on OJS, 3dc90c81a6 on OMP and OPS; the two changed files are
  byte-identical there); `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00, OPS
  cf4fce69bd (lib/pkp a9c76aed62: `MultilingualInputHandler.js` identical,
  `SiteHandler.js` 6 lines shorter above the handler); `stable-3_4_0` OJS
  9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp df13621c2d);
  `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161 (lib/pkp
  d446601ebe). Dataset: pkp/datasets 38ab955 (2026-09-30), PostgreSQL.
- Code read on `main` and 3.5: the backend pages run the apps' npm
  TinyMCE (7.9.3 on `main`, 7.7.1 on 3.5), bundled into `js/build.js`,
  not lib/pkp's composer copy. In it: `EditorManager.add()`,
  `setActive()`, `initEditor()`, `startProgress()`/`cancelProgress()`
  around `loadContentCss().then()`, and `getContentFromBody()`.
- 3.4 (code): lib/pkp `stable-3_4_0` `SiteHandler.js` lines 294–299 and
  `MultilingualInputHandler.js` line 176 have the same reads, and the
  apps' `package.json` has `"tinymce": "^5.10.0"`. In TinyMCE 5.10.9,
  `add()` sets `activeEditor`, `initEditor()` runs in the same order, and
  `getContent` reads `editor.serializer`. Outside the collaboration (RTC)
  path, start-up is
  `loadContentCss(editor).then(() => initEditorWithInitialContent(editor))`
  with no progress state, so the throw leaves the same error and no
  spinner.
- 3.3 (code): lib/pkp `stable-3_3_0` has the same handler (lines
  294–299) and the same `isIncomplete_()` read; the apps have
  `"tinymce": "^4.9.11"`, whose `initEditor()` runs in the same order
  with no start-up spinner. TinyMCE 6.1.0, the apps' version between 5
  and 7, has none either; `startProgress()` first appears in 7.0.0.
- Not checked: the other windows under Reach, on screen; 3.4 and 3.3 on
  screen; whether the French box can still be reached while the English
  one is covered; browsers other than Chromium.
- Unverified: whether pkp's own placeholder is visible on any current
  screen, since TinyMCE's (`data-mce-placeholder`) is set on these boxes.
