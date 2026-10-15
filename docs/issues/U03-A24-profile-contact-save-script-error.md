# The Profile page's Contact tab sometimes logs a script error on opening or saving; the save still works

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; TinyMCE 5 builds each box at once)
  - 3.3: none (code; TinyMCE 4 builds each box at once)
- **Introduced** `pkp/pkp-lib#10773` and `pkp/ui-library#477` for `pkp/pkp-lib#9366` · [1165ce9aff](https://github.com/pkp/pkp-lib/commit/1165ce9affb75b913ff6847bc12a2504a8b7b1d3), [b4c4d1ca7a](https://github.com/pkp/ui-library/commit/b4c4d1ca7a3cb56cd6c24224b24cc4918c2b25d6) · 2025-01-27 · Blesilda Ramirez (blesildaramirez)
- **Upstream** `pkp/pkp-lib#13180` (open, fix in PR `pkp/pkp-lib#13381`, not yet in main; `pkp/pkp-lib#13380` for 3.5, with the 3.5 bundle rebuilds `pkp/ojs#5855`, `pkp/omp#2469`, `pkp/ops#1410`), reported on a review form; the same change fixes this tab
- **Tracked in** spec U03 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a24)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When the Profile page's Contact tab opens, and again after its "Save"
or the "Cancel" of an email-change request, the page's own script
sometimes fails in the browser. The save and the cancel still go
through, every box takes typing, and nothing on screen says anything
went wrong.

It happens when one language box of the "Signature" field is slow to
start, as on a loaded browser or computer: never in 96 ordinary saves on
the default dataset, now and then on a busier test install. Only sites
with two or more languages meet it; one language has no language marker
and logs nothing.

What is lost is the globe beside "Signature", which tells whether the
signature is filled in every language: after the failure it may show
the wrong state.

## Impact

- **Lost**: nothing the user typed. The Signature field's language
  marker may show the wrong state until the tab is opened again, and the
  browser's console records an error.
- **Who**: any signed-in user on the Contact tab, journal-level or
  site-wide, of a site with two or more languages, when a Signature box
  starts late.
- **Way round**: none needed for the task. Opening the tab again usually
  sets the marker right.

Low, as only a marker is affected. It would rise if the error were shown
to stop a save, as `pkp/pkp-lib#13180` reports for a review form.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (OMP and OPS the same). Its
  site and its journal (press, server) `publicknowledge` have English
  and French, so the Contact tab's "Signature" field has a box per
  language. `dbarnes` has no signature stored in either language.
- Chrome, and a way to make the French box start late every time, as a
  busy computer sometimes does. This snippet, pasted into the browser's
  console, holds the start-up of every French formatted-text box opened
  afterwards by 3 seconds. It changes nothing else:

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

The error:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open the user menu › "Edit Profile". The "Identity" tab shows.
3. Open the browser's console and paste the snippet. Stay on the page.
4. Press the "Contact" tab. Wait about 4 seconds.
5. Replace "Email address" with "dbarnes.h15d@mailinator.com" and press
   "Save". Wait about 4 seconds.
6. Press "Cancel" on the notice "You have requested a change of your
   email to …". Wait about 4 seconds.

The language marker:

7. Reload the page, which drops the snippet, and press "Contact".
8. Type "Daniel Barnes h15d" into the English "Signature" box and press
   "Save". The globe at the box's top right marks the field as missing a
   language.
9. Click the English box; the French box opens under it. Type "Daniel
   Barnes h15d (fr)" into the French box and press "Save". The globe
   turns green.
10. Paste the snippet into the console again and press "Save".

**Expected**: no error in the console at any step. After step 10 the
globe stays green: both languages are filled.

**Observed**: at steps 4, 5 and 6, once each:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'serialize')
    at Object.getContent (js/build.js)
    …
    at HTMLTextAreaElement.<anonymous> (lib/pkp/js/controllers/form/MultilingualInputHandler.js:176:17)
    at jQuery.each (js/build/jquery/jquery.js)
```

The rest works: "Your changes have been saved." and the request's
notice show at step 5, the old address is back at step 6, and the
three formatted-text boxes take typing. After step 10 the same error
appears and the globe is grey, as for an empty field. Without the
snippet, no step logs an error.

## Cause

`MultilingualInputHandler` (`lib/pkp/js/controllers/form/MultilingualInputHandler.js`)
sets the language marker of a multilingual field in a jQuery form, and
only when the form has two or more languages (`templates/form/textarea.tpl`).
Its constructor calls `isIncomplete_()` on a 500 ms timer, and
`hidePopover_()` calls it again when the field's boxes lose the focus.
For a field with
formatted-text boxes, `isIncomplete_()` asks TinyMCE for each language's
editor and calls `getContent()` on it (line 176) without asking whether
the editor is ready:

```js
tinymce = tinyMCE.EditorManager.get(/** @type {string} */(
		$(this).attr('id')));
if (tinymce.getContent()) {
```

`getContent()` ends in `editor.serializer.serialize()`, and TinyMCE 7
creates `serializer` only when the editor's frame has loaded
(`contentBodyLoaded()`). Before that, `getBody()` already answers with
the empty frame's body, so `getContent()` goes on and throws
"Cannot read properties of undefined (reading 'serialize')". A frame
loads from `srcdoc`, which is quick on an idle computer; when the
browser is busy and a box's frame has not loaded 500 ms after the form
was built, the timer throws. The throw ends the loop before the marker
is set: from the timer the field keeps no marker; from
`hidePopover_()` it keeps the one it had. The Contact form is rebuilt
from the server's answer after "Save" and after "Cancel", so each of
them starts the timer again.

TinyMCE 4 and 5 write each editor's frame at once, in the same call that
creates it, and build `serializer` straight after, so an editor that
exists always has one. The upgrade to TinyMCE 7 (Introduced) opened the
gap.

Reach:

- Every jQuery form with a multilingual formatted-text field runs the
  same timer: the site-wide Profile page's Contact tab (seen there
  without the snippet), the review form windows (the save in `pkp/pkp-lib#13180`),
  the custom block and "Custom Page" item windows, the static page
  window, and OJS's issue and subscription windows. Read in the code,
  not driven, apart from the Contact tab.
- Firefox: TinyMCE writes the frame's document at once instead of
  waiting for `load` (`setupIframeBody()`, TINY-8916), so the editor is
  ready before the timer (read in the code).
- The Vue forms' formatted-text boxes (ui-library `FieldRichTextarea.vue`)
  have no such marker code (read in the code).
- A second listener throws the same message on the same tab:
  `SiteHandler`'s `deactivate` handler, which leaves a box stuck under
  "Loading...". That one is `pkp/pkp-lib#13489`, fixed in pkp-lib by
  `pkp/pkp-lib#13490` (main, `689e7ec1a5`) and `pkp/pkp-lib#13491`
  (3.5); it is not part of this report. The main tips walked here carry
  lib/pkp `b17fadae59`, which predates `689e7ec1a5`, so their
  `SiteHandler.js` still has the unchecked call (line 314).

## Proposed fix

Review and merge `pkp/pkp-lib#13381` (main) and `pkp/pkp-lib#13380`
(3.5), and rebuild each app's `js/pkp.min.js`. Both PRs change only
`MultilingualInputHandler.prototype.isIncomplete_()`, with the change
below: an editor that is not ready yet (`initialized` false, the check
`pkp/pkp-lib#13490` added to `SiteHandler` and TinyMCE's own `save()`
makes) is read from its textarea, which still holds the value the
server sent. The function is shared by every form, so the PRs fix the
Contact tab as well as the review form they were written for. This
report's
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/profile-contact-save-script-error/fix.diff)
is the same logic and was tried; only the comment differs from the PRs.

```diff
 			$popover.find('textarea').each(function() {
-				var id = $(this).attr('id'),
-						tinymce;
+				// An editor still starting up has no serializer yet, and
+				// getContent() throws: read its textarea, which holds the same value.
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
 			});
```

Tried on `main` in OJS, OMP and OPS with the unminified scripts: with
the snippet, steps 4 to 6 log no error, and after step 10 the globe
stays green. Without the snippet, steps 8 and 9 mark the field as before
(missing a language, then complete).

The textarea holds raw HTML, so a stored `<p></p>` would count as filled
where `getContent()` gives an empty string. This form stores an emptied
box as an empty string (seen after step 8, the French value), so the
marker is not affected.

**Alternatives**:

- Skip an editor that is not ready: the marker would then count a filled
  language as empty and show "missing a language" wrongly.
- Run the check from each editor's `init` event instead of a timer:
  right, but a larger change than the marker needs.

**What goes with it**:

- The bundle rebuilds: the 3.5 app PRs `pkp/ojs#5855`, `pkp/omp#2469`
  and `pkp/ops#1410` rebuild `js/pkp.min.js` with #13380. They were
  opened on 2026-09-23 on older pointers, so each needs rebasing onto
  today's 3.5 tip. On main there is no rebuild: `pkp/ojs#5856` only bumps
  the submodule, and OMP and OPS have no PR. Installs with
  `enable_minified = On` (3.5's default, the release packages) run the
  bundle, not the source.
- No other caller reads an editor before it is ready: the `deactivate`
  handler has the `initialized` check since `689e7ec1a5`; the `init` and
  `activate` listeners (`SiteHandler`, `AdvancedReviewerSearchHandler`)
  run on a ready editor, because `EditorManager.add()` makes a new
  editor the active one without sending it `activate`.
- A regression test: an e2e check of the Contact tab with the French box
  held, expecting no page error and the marker set.

Small: the change is written and under review; merging it and the main
bundle rebuilds remain.

## Evidence

- Kept script:
  `shared/playwright/checks/issues/profile-contact-save-script-error/walk.js`
  (helpers in `lib.js` beside it, which reuse the "Create Journal" helper
  of `checks/issues/section-editors-not-assigned-second-journal/lib.js`).
  `npm run fleet-prep -- --feature issues-h15d --dataset 1 --reset`, then
  `PROBE_FEATURE=issues-h15d PROBE_AGENT=h15d node bin/probe.js all
  shared/playwright/checks/issues/profile-contact-save-script-error/walk.js`
  takes steps 1–6; `MODE=nb` takes steps 7–10; `MODE=natural` takes six
  saves and six "Cancel"s with nothing held at the site level (as
  `admin`, after a second journal made in Administration) and six at the
  journal level (as `dbarnes`); `MODE=marker` takes steps 8 and 10 alone.
  3.5: `PKP_E2E_LINE=stable-3_5_0` in front.
- Walked 2026-10-15 on PostgreSQL, the dataset loaded from pkp/datasets
  `7912e09` (2026-10-14):
  - main (enable_minified Off, the dataset's own setting): steps 1–6 log
    one error each at 4, 5 and 6 in OJS, OMP and OPS, every frame in
    `MultilingualInputHandler.js:176`; steps 7–10: the globe "missing a
    language", then green, then unset with the error, in all three.
  - 3.5 (enable_minified On, the dataset's own setting): steps 1–6 the
    same in all three, the frame in `js/pkp.min.js`
    (`tinyMCE.EditorManager.get(…).getContent()`). Steps 8 and 10 on
    OJS: the marker set, then unset with the error.
  - Without the snippet: no error in 96 saves and cancels on the default
    dataset (72 on main across the three apps, 24 more on OJS with
    enable_minified On). On the campaign's own installs, the register
    entry's drive (`checks/U03/SW3/sw3.js`, phase `email`) showed it in
    two of three apps, twice; the stack traces named this report's
    handler (OJS) and the `deactivate` handler (OJS, OPS). Further drives
    there showed nothing.
  - The script types the Profile address instead of using the user menu
    (step 2), and starts steps 7–10 with a fresh sign-in, not a reload.
- The fix was tried with the unminified scripts; no bundle was rebuilt.
- Tips: main OJS `378eced941`, OMP `f4836d4fba`, OPS `2ece50497f`, each
  with lib/pkp `b17fadae59` and lib/ui-library `47b565cb42`; 3.5 OJS
  `ca763c91cd`, OMP `a70bbb9c4d`, OPS `44aec6e131`, each with lib/pkp
  `4045d9241e` and lib/ui-library `2576e00afd`. The committed
  `js/pkp.min.js` on main dates from 2026-08-27 in each app.
- Code reads: `isIncomplete_()` is the same in lib/pkp on main, 3.5,
  `stable-3_4_0` (`55c8e406b3`) and `stable-3_3_0` (`5e84acd11b`). TinyMCE
  on main and 3.5: 7.9 (ui-library `package.json`; pkp-lib's vendor copy
  7.9.3, `createIframe()` / `setupIframeBody()` / `contentBodyLoaded()`).
  On 3.4, TinyMCE 5.10.9 (`init$1()` calls `initContentBody()` right
  after `createIframe()`, which writes the frame with `doc.write`); on
  3.3, TinyMCE 4.9.11, the same order. The line itself is 5ca66b6627
  (2016, `pkp/pkp-lib#1565`).
- Upstream PRs read 2026-10-15: #13381 and #13380 each change only
  `js/controllers/form/MultilingualInputHandler.js` (+9 −7, one commit,
  open, unmerged); the app PRs named above are open, the stable-3_4_0
  ones closed unmerged.
- Not driven: Firefox; the other jQuery forms of the Cause's reach; 3.4
  and 3.3; MySQL not checked (nothing here depends on the database).
- Unverified: how often a real browser on a real server meets it; the
  counts above come from the test servers (single-threaded `php -S`) on
  a shared machine.
