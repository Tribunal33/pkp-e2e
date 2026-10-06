# Hosted Journals: closing the "Edit" or "Create Journal" window right after it opens makes the page's script fail

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2c4](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An uncaught JavaScript error is written to the browser's console, and
the page works on, when the Site Administrator opens a row's "Edit"
window, or the "Create Journal" ("Create Press", "Create Server")
window, on Administration › "Hosted Journals" and presses "Close"
within about 0.4 s of the form showing. The window closes as asked,
nothing on screen shows the error or changes, and nothing is lost.

A window left open longer closes without the error. Only the journal
form's windows have it, because "Path" there is the only field with an
address shown in front of it.

## Impact

- **Lost**: nothing; the next window opens and works.
- **Who**: Site Administrators who close the journal form's window
  within about 0.4 s of its form showing, which few people do by hand.
  An automated test that closes the window at once meets it every time:
  pkp-e2e's own suite did. Whether PKP's Cypress tests close this
  window that fast was not checked.
- **Way round**: none is needed on screen. A test can wait a second
  before "Close".

Low. It would be medium if the error left the page or the next window
unusable; a window opened right after it worked and closed normally.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; a press or a server shows
  the same with "Hosted Presses" / "Create Press" or "Hosted Servers" /
  "Create Server").
- The browser's developer console open, since nothing else shows the
  error.

Steps 4 and 6 need a "Close" within about 0.4 s of the form showing,
which is faster than a hand reliably manages. Two ways to get it: run
the kept script (Evidence), or paste this into the console just before
step 3 (and again before step 5). It presses the window's "Close"
button the moment the form's "Path" box appears, so steps 4 and 6
happen by themselves:

```js
new MutationObserver((m, o) => {
  const box = document.querySelector('#context-urlPath-control');
  if (!box) return;
  o.disconnect();
  [...box.closest('[role="dialog"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close').click();
}).observe(document.body, {childList: true, subtree: true});
```

Steps:

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals"
   (`/index.php/index/en/admin/contexts`).
3. Press the arrow at the start of the "Journal of Public Knowledge"
   row and choose "Edit".
4. As soon as the form shows in the window, press the "Close" button at
   the window's top.
5. Press "Create Journal".
6. As soon as the form shows, press "Close".
7. Press the row's arrow again, choose "Edit", wait two seconds, then
   press "Close".

**Expected**: each window closes and the console stays empty.

**Observed**: at steps 4 and 6 the window closes, and the console then
shows an uncaught error, once per close, about 0.7 s after the form showed:

```
TypeError: Cannot read properties of null (reading 'clientWidth')
    at /js/build.js?v=3.6.0.0:483:24593
```

Nothing on the page changes. At step 7 the window closes and the
console stays empty.

How late a "Close" still raises it was timed on `main`: pressed 0.18
to 0.28 s after the form showed, it raised the error; pressed 0.38 s
after or later, it did not.

## Cause

ui-library's `FieldText.vue` starts a timer in `mounted()`
(`lib/ui-library/src/components/Form/fields/FieldText.vue`, lines
175 to 213): `setTimeout(…, 700)`. When the field has a `prefix`, the
timer's callback reads `this.$refs.prefix.clientWidth` and
`offsetLeft` to push the typed text right of the prefix. The comment
above it says why it waits: the prefix's width changed shortly after
mount in at least one case, so the measuring is delayed.

Nothing cancels that timer, and the callback does not check that the
field is still there. Once the form has been unmounted, Vue has emptied
the component's refs, so `this.$refs.prefix` is `null` and the read
throws. The callback runs from a timer, outside Vue's error handling,
so the error is uncaught.

The journal form's "Path" is the one field that has a prefix:
`PKPContextForm` (`lib/pkp/classes/components/forms/context/PKPContextForm.php`,
line 97) passes the site's address as the `prefix` of `urlPath`.

The "Edit" and "Create Journal" windows are where that form can be
unmounted before the timer runs. The form is a Vue app of its own
(`templates/admin/editContext.tpl`, `pkp.registry.init('editContext', …)`),
and both windows name it in `closeCleanVueInstances`
(`ContextGridRow.php` line 57, `ContextGridHandler.php` line 92).
"Close" reaches `ModalHandler.prototype.modalClose`
(`lib/pkp/js/controllers/modal/ModalHandler.js`, lines 183 to 205),
which waits 300 ms and then calls `unmount()` on that app. So the read
fails when "Close" comes less than 700 − 300 ms, about 0.4 s, after the
form mounted, which is what the timed closes showed.

Reach:

- The "Edit" and "Create Journal" windows on Hosted Journals, Presses
  and Servers (walked on `main` and 3.5, all three apps).
- The Settings Wizard's "Journal" tab holds the same form on a page of
  its own. Leaving a page discards its timers, so no error follows
  there. This is concluded from the code; leaving that page early was
  not tried.
- No other form passes `prefix` to a text field: a search of pkp-lib,
  OJS, OMP and OPS on `main` for the field's `prefix` option finds
  `PKPContextForm` only (the publication form's "Prefix" is a field
  named `prefix`, and the pub id field is another component with no
  timer). A plugin's form that used the option in a window would meet
  the same error (code).
- 3.4 and 3.3 have the same timer, the same unguarded read and the
  same 300 ms wait in `modalClose`, which calls `$destroy()` on the
  form's Vue 2 instance, so the same 0.4 s applies. The message would
  name `undefined` rather than `null` (code, not walked).

## Proposed fix

Keep the timer's id and cancel it when the field is unmounted:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-form-quick-close-script-error/fix.diff)
(paths from the app root; `git apply -p3` from a ui-library checkout).

```diff
--- a/lib/ui-library/src/components/Form/fields/FieldText.vue
+++ b/lib/ui-library/src/components/Form/fields/FieldText.vue
@@ -129,6 +129,7 @@
 			inputStyles: {},
 			isDisabled: false,
 			prefixStyles: {},
+			prefixTimer: null,
 		};
 	},
 	computed: {
@@ -173,7 +174,7 @@
 		 * take longer on slower machines.
 		 */
 		this.$nextTick(() => {
-			setTimeout(() => {
+			this.prefixTimer = setTimeout(() => {
 				if (this.prefix) {
 					this.inputStyles = {
 						direction: 'ltr',
@@ -216,6 +217,11 @@
 		if (this.optIntoEdit || this.disabled) {
 			this.isDisabled = true;
 		}
+	},
+	beforeUnmount() {
+		// The form can be removed (a window closed) before the prefix is
+		// measured; the timer would then read refs that are gone.
+		clearTimeout(this.prefixTimer);
 	},
 	methods: {
 		/**
```

The code base already does this: `FormPage.vue` declares
`recentSaveInterval: null` in `data()` and clears it in `unmounted()`,
and `citationManagerStore.js` clears its reload interval in
`onUnmounted`. `FieldText` extends `FieldBase`, which has a
`beforeUnmount()` of its own; Vue runs both.

The two nested `$nextTick` reads inside the callback stay unguarded.
They run within a tick or two of the timer firing, so a field would
have to be unmounted in that instant to reach them; that is not
reachable in practice, and the diff leaves them alone.

Tried on `main`, all three apps. With the fix applied, steps 4 and 6
close the window and the console stays empty. A window left open still
works as before: the "Path" box takes its padding from the address in
front of it (162 px in the "Edit" window, 144 px on the Settings
Wizard's "Journal" tab, the same as without the fix), and a late
"Close" raises nothing.

**Alternatives**:

- A check in the callback (`if (this.prefix && this.$refs.prefix)`).
  It stops the error too, but leaves a timer running for a field that
  is gone.
- Laying the prefix out with CSS (a flex row) or a `ResizeObserver`
  instead of measuring after a guessed delay. It would retire the
  timer, but it is a redesign of the field, not a fix for this error.

**What goes with it**:

- No data repair. No API, hook or other screen changes: only an
  unmounted field stops measuring.
- Backport: the diff applies to 3.5 as it stands (the same lines). On
  3.4 and 3.3, which run Vue 2, the hook is `beforeDestroy()`.
- Guard: a unit test in ui-library that mounts `FieldText` with a
  `prefix`, unmounts it and runs the timers (Vitest's fake timers)
  without an error; or the e2e scenario for the "Edit" window (spec
  U59, scenario 3), which closes the window at once, failing on any
  page error.

Small: one component, and a unit test.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-form-quick-close-script-error/walk.js),
  helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-form-quick-close-script-error/lib.js).
  Run it from a pkp-e2e checkout on an install freshly loaded from the
  default dataset (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/journal-form-quick-close-script-error/walk.js [neighbour|timing]`.
  Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The word
  `neighbour` after the path runs the check of the working cases
  instead (a window left open, and the Settings Wizard's "Journal"
  tab); `timing` presses "Close" 150 to 650 ms after the form shows,
  then tries the console snippet of the Steps.
- The walks ran in Chromium on PostgreSQL and saved nothing. Datasets:
  pkp/datasets c657990 (2026-10-01). In the Steps' walk the script
  pressed "Close" 36 to 64 ms after the "Path" box showed, and the
  error came 597 to 641 ms after the press, on every app, on `main` and
  3.5 (on 3.5 at `/js/build.js?v=3.5.0.5:1:744458` on OJS). At step 7
  it waited for the "Path" box to take its padding instead of two
  seconds.
- The timing run, on `main` only, all three apps: "Close" 182 to
  283 ms after the "Path" box showed raised the error; 381 ms and later
  (up to 692 ms) did not. 3.5 was not timed; its `modalClose` has the
  same 300 ms wait and `unmount()`. How fast a person can be was not
  timed by hand.
- Only the "Close" button was walked. A click outside the window and
  Escape were not tried.
- The console snippet was tried on "Edit" on `main`, all three apps:
  the window closed and the error followed. It was not tried on "Create
  Journal".
- pkp-e2e's suite met the error in its Hosted Journals scenarios, on
  every "Close" its tests pressed right after a window opened (traced
  runs of 2026-09-28).
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d6736318 (OJS) and 280f98c570 (OMP, OPS), `FieldText.vue` the same
  in both. 3.5: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib
  cf3f984335; ui-library d4e0188353. 3.4: OJS 75cc2d488b, OMP
  0aec65441f, OPS acd8ae704b; pkp-lib 32b0f4b4af; ui-library ee684b34.
  3.3: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161; pkp-lib
  f6ab331645; ui-library 96959f9e.
- Code reads. `main` and 3.5: `FieldText.vue` (`mounted()`, the
  template's `ref="prefix"`), `FieldBase.vue` (`beforeUnmount`),
  `FieldPubId.vue`, `PKPContextForm.php`, `ModalHandler.js`
  (`modalClose`), `ContextGridRow.php` and `ContextGridHandler.php`
  (`['editContext']`), `templates/admin/editContext.tpl`, ui-library
  `modalStore.js` (`closeSideModalById`, which calls `modalClose`),
  `FormPage.vue` and `citationManagerStore.js` (the clean-up pattern).
  3.4 and 3.3: `FieldText.vue` (the same `setTimeout(…, 700)` and three
  `$refs.prefix.clientWidth` reads, no `beforeDestroy`),
  `PKPContextForm` (`prefix`), `ModalHandler.js` (`modalClose`),
  `ContextGridHandler` and `ContextGridRow` (`['editContext']`),
  `templates/admin/editContext.tpl`, `VueRegistry.js`.
- Unverified: 3.4 and 3.3 were not walked. That Vue 2 clears a
  destroyed component's refs is taken from Vue 2's documented
  behaviour, not read in those branches' installed Vue.
- Introduced: `git blame` on the `setTimeout` line gives 7496b3c2c4,
  the commit that added the file, which already had the 700 ms timer
  and the unguarded `$refs.prefix` reads; the GitHub API's
  `commits/<sha>/pulls` gives `pkp/ui-library#20`.
- Upstream: searched pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and
  pkp/ops for `clientWidth`, the error's text, `FieldText` with
  `prefix`, `setTimeout` and `unmounted`, `refs.prefix`, a script error
  on closing the hosted journals window, and the path box's prefix
  padding. Nothing matched.
