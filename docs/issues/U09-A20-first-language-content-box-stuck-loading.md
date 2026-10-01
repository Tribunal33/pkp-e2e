# With two form languages, the first language's "Content" box can stay under a "Loading..." spinner for good

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no loading spinner there)
  - 3.3: none (code; no loading spinner there)
- **Introduced** `pkp/pkp-lib#10773` for `pkp/pkp-lib#9366` · [1165ce9aff](https://github.com/pkp/pkp-lib/commit/1165ce9affb75b913ff6847bc12a2504a8b7b1d3) · 2025-01-27 · Blesilda Ramirez (blesildaramirez)
- **Upstream** none found for the spinner (2026-10-01). `pkp/pkp-lib#13180` (open) is a review form whose save fails with the same script error; its open PRs `pkp/pkp-lib#13381` (main) and `pkp/pkp-lib#13380` (3.5) make the second of this report's two changes, not the one that removes the spinner
- **Tracked in** spec U09 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal whose form languages are English and French, a manager
opens the custom block window ("Add Block") or the "Custom Page" item
window. Each has a "Content" box per language. Now and then the page's
script fails as the window opens, and a "Loading..." spinner covers the
"Content" box of the first form language (here English) for as long as
the window is open. That box takes no click, and typing already begun
stops reaching it. Nothing says why.

The manager loses the "Content" box of that window, and any letters
typed before the spinner came. Reloading the page and opening the
window again gets round it in the usual case: the fault is a race, and
a fresh load normally comes out in the safe order.

It happens only when the second language's box is slow to start. In
pkp-e2e's test runs it came up once on its own, in a full suite run on
a loaded machine. Run 35 times per app without anything holding the
second box back, the same tests passed every time.

## Impact

- **Lost**: the window's "Content" box, until the page is reloaded,
  and the letters typed before the spinner came. The French box opens
  only from the English one, so it is out of reach too. Nothing already
  saved is touched.
- **Who**: whoever edits custom blocks or "Custom Page" items on a
  journal (press, server) with a second form language, in a browser
  other than Firefox, when the computer is busy enough.
- **Way round**: reload the page and open the window again.

Medium: the box fails without a word, though reloading gets round it.
It would be low if reloading and reopening counts as the task getting
done, since nothing saved is lost. It would be high if the bad order
were common, but it was seen once, on a loaded machine.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. Its journal (press, server)
  `publicknowledge` has English and French as form languages already.
- A way to make the French box start late every time, as a busy
  computer sometimes does. This snippet, pasted into the browser's
  console (Chrome), holds the start-up of every French formatted-text
  box opened afterwards by 3 seconds. It changes nothing else:

```js
(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (type === 'load' && this instanceof HTMLIFrameElement && /-fr_CA-/.test(this.id) && typeof fn === 'function') {
      const frame = this;
      return add.call(this, type, (event) => {
        const late = new Proxy(event, {get: (e, k) => (k === 'composedPath' ? () => [frame]
          : k === 'target' || k === 'currentTarget' ? frame
          : typeof e[k] === 'function' ? e[k].bind(e) : e[k])});
        setTimeout(() => fn.call(frame, late), 3000);
      }, opts);
    }
    return add.call(this, type, fn, opts);
  };
})();
```

The custom block window:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), the journal editor
   (press editor, preprint server manager).
2. Open Settings › Website › "Plugins" › "Installed Plugins". Under
   "Generic Plugins", tick "Custom Block Manager".
3. Open the browser's console and paste the snippet. Stay on the page.
4. Press the "Custom Block Manager" row's arrow, then "Manage Custom
   Blocks".
5. Press "Add Block". Wait about 3 seconds, until the French box has
   loaded.
6. Click into the English "Content" box and type "Welcome".

The "Custom Page" item window:

7. Reload the page and paste the snippet again.
8. On the same page, press the "Setup" tab, then "Navigation". Use the
   tabs, not the side menu: the side menu loads the page anew, and the
   snippet is lost.
9. Under "Navigation Menu Items", press "Add item".
10. Under "Navigation Menu Type", choose "Custom Page". Wait about 3
    seconds from the window's opening, until the French box has loaded.
11. Click into the English "Content" box and type "Welcome".

**Expected**: once the French box has loaded, the English box shows its
writing area, as it does without the snippet. The click puts the cursor
there and "Welcome" is typed into it.

**Observed**: in both windows, a "Loading..." spinner covers the
English "Content" box and is still there 10 seconds later. The click
lands on the spinner, and nothing is typed. The browser's console shows
this error twice for each window:

```
TypeError: Cannot read properties of undefined (reading 'serialize')
```

## Cause

pkp-lib's `SiteHandler.prototype.triggerTinyMCESetup()`
(`lib/pkp/js/controllers/SiteHandler.js`, lines 312–317) gives every
TinyMCE editor of a jQuery form a `deactivate` handler that shows a
placeholder when the editor is empty. It calls
`tinyMCEObject.target.getContent()` without asking whether the editor
is ready. `getContent()` ends in `editor.serializer.serialize()`, and
an editor has no `serializer` until its frame's `load` event has run
TinyMCE's `contentBodyLoaded()`. Before that, the call throws.

The race is between two events. `Handler.prototype.initializeTinyMCE()`
renders one editor per language box, English first, in one loop.
`EditorManager.add()` makes each new editor the active one without
sending events, so the French editor is the active one from the start.
Each editor's frame loads from `srcdoc`, and its `load` event runs
`contentBodyLoaded()`, which builds the `serializer` and then fetches
the editor's content style sheets from the server. When the English
style sheets have arrived, `initEditor()` sets `initialized = true`
and calls `editor.focus(true)`, which calls
`EditorManager.setActive()`. That sends `deactivate` to the French
editor.

In the usual order this is safe. The French frame's `load` needs no
request, so it runs long before the English style sheets come back
from the server, and the French editor has its `serializer` when
`deactivate` reaches it. The handler throws only when the French
frame's `load` has not run by then: the browser's main thread was busy
enough to hold it back past the style sheets' round trip to the
server.

TinyMCE does not catch the error. The uncaught error aborts the rest
of `initEditor()` and the promise callback in `contentBodyLoaded()`
that called it, so `cancelProgress()` is never reached. The timer
`startProgress()` started when the style sheets were requested fires
500 ms later and shows the throbber ("Loading...", `aria-busy="true"`)
over the box, and nothing hides it again.

`MultilingualInputHandler.prototype.isIncomplete_()`
(`lib/pkp/js/controllers/form/MultilingualInputHandler.js`, line 176),
run on a 500 ms timer when the window opens, calls `getContent()` on
every language's editor the same way. That is the second error in the
console. It runs outside the editor's start-up, so it does not cause
the spinner.

TinyMCE 6.7 added the throbber timer to every editor's start-up. Under
TinyMCE 5 and 4 (3.4 and 3.3) a throbber shows only when collaborative
editing is set up, so the same error would leave no spinner. pkp-lib
moved from TinyMCE 5.10 to 7.6 in 1165ce9aff.

Reach:

- The custom block window and the "Custom Page" item window: walked,
  on the three apps.
- The static page window (OJS, OMP), the section window (OMP's series
  window), the review form windows, and OJS's issue and subscription
  windows: each has a formatted-text box in two languages in a jQuery
  form, so the same race applies (read in the code, not driven).
- A third form language: the deactivated editor is always the last one
  rendered, so any earlier box can stick when the last box starts late
  (read in the code).
- Firefox: TinyMCE writes the frame's document at once instead of
  waiting for `load` (`setupIframeBody()`, TINY-8916), so the French
  editor is ready before any style sheet arrives (read in the code).
- The Vue forms' formatted-text boxes (ui-library
  `FieldRichTextarea.vue`): no such handler (read in the code).

## Proposed fix

Skip an editor that is not ready, in the two places that read one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/first-language-content-box-stuck-loading/fix.diff),
paths relative to the app root):

```diff
--- a/lib/pkp/js/controllers/SiteHandler.js
+++ b/lib/pkp/js/controllers/SiteHandler.js
 		tinyMCEObject.on('deactivate', function(tinyMCEObject) {
+			// An editor still being set up has no serializer and no placeholder
+			// yet; TinyMCE deactivates it when an earlier editor finishes first.
+			if (!tinyMCEObject.target.initialized) {
+				return;
+			}
 			// Show the placholder when the editor is deactivated
 			if (!tinyMCEObject.target.getContent().length) {
--- a/lib/pkp/js/controllers/form/MultilingualInputHandler.js
+++ b/lib/pkp/js/controllers/form/MultilingualInputHandler.js
-				var id = $(this).attr('id'),
-						tinymce;
-
-				$inputs.push($(this));
-				tinymce = tinyMCE.EditorManager.get(/** @type {string} */(
-						$(this).attr('id')));
-				if (tinymce.getContent()) {
+				// An editor still being set up has no serializer; read the textarea.
+				var $textarea = $(this),
+						editor = tinyMCE.EditorManager.get(/** @type {string} */(
+								$textarea.attr('id'))),
+						content = editor && editor.initialized ?
+								editor.getContent() : $textarea.val();
+
+				$inputs.push($textarea);
+				if (content) {
```

The `deactivate` guard removes the spinner. `initialized` is set later
than the `serializer`, so the guard also skips an editor that has its
`serializer` but not its placeholder yet. That loses nothing: the
placeholder is added in the same handler's `init` listener, after
`initialized` is set. The `isIncomplete_()` change is the same as in
the open PRs for `pkp/pkp-lib#13180`, so either can land first.

Tried on `main` on the three apps. With the fix, both windows took the
click and held "Welcome", with no script error. To check that the
language indicator beside "Content" still works, the same windows were
opened without the snippet, English was typed and the box left. The
indicator read "incomplete" (`localizationIncomplete`) with and without
the fix. It read the same with the fix and the snippet.

**Alternatives**

- Create the editors one after another, each after the previous one's
  `init`. That changes the start-up of every jQuery form for a fault
  one handler causes.
- Hide the throbber in a `try`/`finally` around TinyMCE's start-up.
  That is library code, and the script error would remain.

**What goes with it**

- Other places: `AdvancedReviewerSearchHandler` calls `getContent()` in
  an `activate` handler. `activate` reaches an editor only once it has
  focus, so after its set-up; left out. `FormHandler`'s save calls
  `tinyMCE.EditorManager.triggerSave()`, which is `pkp/pkp-lib#13180`'s
  case.
- Backport: on `stable-3_5_0` both files hold the same lines. 3.4 and
  3.3 hold them too and could take the change, but show no spinner
  there (Cause).
- Guard: an e2e test that opens the block window with the French box
  held and types into the English box (planned in pkp-e2e's spec U09).

Small: two guards in two pkp-lib scripts.

## Evidence

- The kept script walks the Steps, then the same two windows without
  the snippet (the control, and the check of the language indicator):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/first-language-content-box-stuck-loading/walk.js),
  with its helpers and the snippet in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/first-language-content-box-stuck-loading/lib.js)
  beside it. On an install freshly loaded from the default dataset,
  from a pkp-e2e checkout (`<feature>` names the set of test installs,
  `<id>` the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/first-language-content-box-stuck-loading/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/first-language-content-box-stuck-loading/fix.diff ojs omp ops`.
  The script pastes the snippet after the page has loaded, and for the
  second window it loads Settings › Website at "Setup" › "Navigation"
  directly, which is the same as steps 7 and 8.
- The walks ran in Chromium. Datasets: pkp/datasets c657990 (2026-10-01). The test installs serve
  the legacy scripts unminified (`enable_minified = Off`, the dataset's
  own setting), so the fix was tried without a rebuild.
- Branch tips. `main`: OJS 68615b5a32, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib 25562b0e1a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  3517e640f2, OMP c7b45f88e, OPS 8eaf899468; pkp-lib b1981810da (OJS)
  and 1fb843f491 (OMP, OPS). 3.4: OJS 75cc2d488b, pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35, pkp-lib f6ab331645. The two pkp-lib scripts are
  the same on the three apps of each line.
- Code reads. `main` and 3.5: `SiteHandler.js` (`triggerTinyMCESetup()`,
  the TinyMCE settings with `init_instance_callback`),
  `MultilingualInputHandler.js` (`isIncomplete_()`, its 500 ms timer),
  `Handler.js` (`initializeTinyMCE()`), `FormHandler.js`,
  `AdvancedReviewerSearchHandler.js`, and TinyMCE 7.9.3 as composer
  installs it (`createIframe()`, `setupIframeBody()`,
  `contentBodyLoaded()`, `initEditor()`, `startProgress()`,
  `getContent()`, `EditorManager.add()` and `setActive()`). The templates of the
  windows in Reach. 3.4 and 3.3: the same two pkp-lib scripts (the same
  handler and the same `isIncomplete_()`), `composer.lock` (TinyMCE
  5.10.9 and 4.9.11), and TinyMCE's own source at those tags
  (`InitContentBody.ts`: `initEditor()` calls `focus(true)` the same
  way, and only the collaborative-editing path sets a progress state);
  `startProgress()` first appears at tag 6.7.0.
- Introduced: `git blame` on the handler gives 3f5f8361f0 (2014, the
  move to TinyMCE 4); the spinner needs the throbber timer, which came
  with the TinyMCE 7 upgrade in 1165ce9aff (on `main` and 3.5).
- The order without the snippet: the steps were not walked that way.
  In pkp-e2e's own test runs it came up once unforced, in a full OPS
  suite run on a loaded machine: the block window's English box stayed
  under the spinner about three minutes, until the test gave up. Without
  the hold, the custom pages and blocks tests passed 35 of 35 runs per
  app.
- Not driven: the other windows in Reach; Firefox and Safari; saving
  or "Cancel" in a stuck window; reopening the window without a
  reload; a third form language; the fix on 3.5, 3.4 and 3.3.
