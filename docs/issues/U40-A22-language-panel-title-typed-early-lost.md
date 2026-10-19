# Change Submission Language: on a slow link, a title typed the moment the Title box appears is wiped

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no Change Submission Language panel)
  - 3.3: none (code; no Change Submission Language panel)
- **Introduced** not traced; present since at least [80f1467d6e](https://github.com/pkp/pkp-lib/commit/80f1467d6ef2da5976c8e8bc7210e9e944c40f58) (2024-09-18), which added the panel and its Title box, shown only once a new language is picked
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U40 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a22)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In "Change Submission Language For", the Title box (and on a journal or
preprint server the Abstract box) appears only once the new language is
picked, and then takes a moment to load. An editor who starts typing
the title within half a second of the box appearing sees the first
letters in the box. The box then turns pale and takes no more keys, and
once it has loaded it is empty.

Confirm is then refused with "This field is required." under Title, and
nothing is stored.

It needs a link on which the box takes more than half a second to load,
such as a mobile link with half a second of delay, and typing that
starts within that half second. Keys typed later are not shown at all
while the box is pale. On an ordinary link the box has loaded before the
first key.

## Impact

- **Lost**: the first letters of the title, shown and then wiped.
- **Who**: editors and managers changing a submission's language on a
  journal, press or preprint server with more than one submission
  language, on a slow link, who type within half a second of picking.
- **Way round**: type the title again once the box has loaded.

Low: a few typed letters are wiped in plain view and the change still
goes through. It would be medium if the wiped text could reach Confirm
unnoticed.

## Steps to reproduce

Preconditions:
- PKP's default test dataset, `main` (OJS, OMP, OPS); `publicknowledge`
  has English and French (Canada) as submission languages.
- Chrome or Chromium with DevTools open, Network › throttling set to
  "Slow 4G" (1.6 Mbit/s, 562.5 ms latency) or slower. The box's style
  sheets then take more than half a second to arrive. "Disable cache"
  need not be ticked on an install served by PHP's built-in server,
  which sends no cache headers, so the browser fetches the sheets again
  for each new box. On a server that sends `Last-Modified` or `ETag`
  (Apache), tick it so they do not come from the browser's cache.
- The submission (unpublished, one version): OJS submission 4, "Computer
  Skill Requirements for New and Existing Teachers: Implications for
  Policy and Practice"; OMP submission 3, "The Political Economy of
  Workplace Injury in Canada"; OPS submission 1, "The influence of
  lactation on the quantity and quality of cashmere production".

Steps:
1. Sign in as `dbarnes`.
2. Open the submission (dashboard › "View", or
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
3. In the side menu, open "Title & Abstract". It reads "Current
   Submission Language: English" with "Change" after it.
4. Click "Change", and wait until the submission's title shows under
   the panel heading "Change Submission Language For".
5. In DevTools › Network, choose the throttling profile.
6. Pick "French (Canada)". A "Title" box appears (OJS and OPS: also
   "Abstract").
7. Within half a second of the Title box appearing, click into it and
   type "Titre h19w".
8. Set throttling back to "No throttling", and wait until the box has
   loaded: it is no longer pale, and a click into it shows its
   "Formatting" button.
9. Read the Title box. OJS and OPS: type "Résumé h19w." into the
   Abstract box.
10. Click "Confirm".

**Expected:** "Titre h19w" stays in the Title box, or the box takes no
keys until it has loaded. With the title in the box, Confirm makes
French (Canada) the submission language with the title "Titre h19w".

**Observed:** typed at an ordinary pace from a quarter of a second
after the pick, "Titre" showed in the box. At half a second the
box turned pale and the rest of the keys were not taken. Once loaded,
the box was empty. Confirm sent no request; the panel showed "This
field is required." under Title and "Please correct one error." with
"Go to Title: This field is required." The submission language stayed
English and no French title was stored. The Abstract box behaves the
same.

Control: a click into the box a second or more after the pick, while
it was still loading, landed on the pale cover. The box
showed nothing typed. Typed after the box had loaded, the title was
kept, and Confirm changed the language and stored it.

## Cause

The panel's Title and Abstract fields belong to a group shown only when
a language other than the current one is picked
(`ChangeSubmissionLanguageMetadataForm`, `showWhen` on `locale`), so the
pick mounts their rich-text boxes: `FieldRichText`, which extends
`FieldRichTextarea` in
`lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue`. That
component renders TinyMCE through `@tinymce/tinymce-vue`'s `<Editor>`
with nothing that holds input back while the editor starts.

TinyMCE 7 makes the editor's body editable first and only then loads
the content style sheets (`contentBodyLoaded()` sets
`body.contentEditable = 'true'`, then `loadContentCss(editor).then(…)`).
Half a second into that wait, `startProgress()` turns on TinyMCE's
loading cover (the theme's throbber), which takes focus from the body.
Keys typed before then land in the body.

When the sheets arrive, `initEditorWithInitialContent()` runs
`editor.load({initial: true})`, which loads the empty `<textarea>`
tinymce-vue rendered and so blanks the body. tinymce-vue's `init`
handler then sets the field's value from the model. Nothing typed
earlier reached the model, which is bound to the editor's
`change`/`input` events only from initialization on.

Reach:
- Every Vue rich-text box has the same half second from its mount
  (checked in the code): `FieldRichTextarea`, `FieldRichText`, and
  `FieldPreparedContent`, whose template renders a `FieldRichTextarea`.
  It shows where a box is mounted by a click (a group a choice reveals,
  a side panel) and the user types at once; a box present with the page
  has usually loaded before anyone types. Only this panel was walked.
- The legacy forms' TinyMCE boxes (`SiteHandler.js`) start the same way
  (checked in the code, not walked).

## Proposed fix

Keep each Vue rich-text box disabled until its editor has initialized,
in the shared `FieldRichTextarea`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-panel-title-typed-early-lost/fix.diff),
against each app's `lib/ui-library` on `main`):

```diff
 				:init="compiledInit"
+				:disabled="!isEditorReady"
+				@init="isEditorReady = true"
 				@focus="focus"
 …
 			isFocused: false,
+			isEditorReady: false,
 			wordCount: 0,
```

From tinymce-vue 6.2.0 the `disabled` prop is passed as TinyMCE's
`disabled` option, so `contentBodyLoaded()` leaves the body
uneditable. The `@init` handler sets `isEditorReady` during
initialization. On Vue's next update, tinymce-vue's `disabled` watcher
calls `options.set('disabled', false)`, and TinyMCE makes the body
editable a moment later. One change covers `FieldRichText`,
`FieldPreparedContent` and every form that uses them, through
tinymce-vue's own prop rather than TinyMCE's start-up.

The `compiledInit.init_instance_callback` that makes the "Formatting"
button appear fires its `focus`/`blur` while the editor is still
disabled. In the trial the button still appeared on a click into the
loaded box, on all three apps.

Tried on `main` on all three apps. Under the same throttled steps the
Title box showed nothing typed while loading and was editable once
loaded; Confirm was refused for the empty Title as before. Typed after
loading, the title was kept, sent and stored, with the fix and without
it. Every editor of the Title & Abstract page itself was editable with
the fix in. Whether the page's boxes look disabled for a moment while
the page loads was not checked.

**Alternatives:**
- Keep what was typed: copy the body's text over the initial content
  when the editor initializes. It saves the keys, but has to tell typed
  text from the start content and fights both TinyMCE's and
  tinymce-vue's initial loads.
- Fix it in this panel only (render the group from the start, or wait
  for the editors before showing it): leaves every other box that is
  mounted by a click with the same half second.
- Report it to TinyMCE (the body editable before its content is
  loaded): worth doing, but not a fix the team controls.

**What goes with it:**
- No stored data, API or hook changes.
- The tinymce-vue floor goes to `^6.2.0` in ui-library's `package.json`,
  and its `package-lock.json`, which holds 6.1.0 on `main`, is bumped
  with it. The apps' lockfiles already hold 6.3.0; their `package.json`
  floors (`^6.1.0`) go up the same way. In 6.1.0 the prop only sets
  read-only mode, which TinyMCE applies after the body is already
  editable, so the fix does nothing there. `stable-3_5_0` holds 6.1.0,
  so a backport needs the same bump.
- Legacy forms: add `disabled: true` to `tinymceParams` in
  `SiteHandler.js`, and clear it with `options.set('disabled', false)`
  inside the existing `triggerTinyMCEInitialized`, which is forced as
  the `init_instance_callback` and must not be replaced.
- Guard: ui-library has no component-mount test setup (no
  `@vue/test-utils`, no DOM environment for vitest), so a unit test of
  `FieldRichTextarea` needs new dev dependencies. An e2e check is the
  cheaper guard: hold the panel's style-sheet requests back, pick the
  language, and assert that the Title box takes no keys until its
  editor has initialized.

Small: one component and the tinymce-vue floor in ui-library, plus the
floors in the apps.

## Evidence

- Walk script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-panel-title-typed-early-lost/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-panel-title-typed-early-lost/lib.js)),
  run with
  `node bin/probe.js all shared/playwright/checks/issues/language-panel-title-typed-early-lost/walk.js`
  on installs freshly loaded from the default dataset (pkp/datasets
  eaf024c5, 2026-10-18, PostgreSQL, served by PHP's built-in server).
  It applies throttling through the Chrome DevTools protocol
  (`Network.emulateNetworkConditions`, the call DevTools' menu makes)
  and types from the keyboard. `MODE=nb` types once the box has loaded
  and checks that the page's own Title & Abstract editors take keys;
  `MODE=window` times the typing (below). The fault does not depend on
  the database.
- Walked on OJS, OMP and OPS on `main` and 3.5, the same on all six,
  at 8 kbit/s: the Title box appeared about 0.1 s after the pick, with
  its body editable and the editor not initialized. Typing began about
  0.15 to 0.2 s after the pick and ended within 0.25 s (10 ms a key).
  The box showed the whole text, and was empty once it had loaded after
  throttling was off.
- The half second (`MODE=window`, OJS `main`, one panel opening per
  case, closed with "Cancel"; keys 60 ms apart):
  - Typing from about 0.25 s after the pick (the box appeared at
    about 0.08 s), at 8 kbit/s, on
    DevTools' "3G" (400 kbit/s, 2000 ms latency) with and without
    "Disable cache", and on "Slow 4G" without cache: "Titre" (Title)
    or "Résum" (Abstract) showed; the loading cover was on by the last
    key; the box was empty once loaded.
  - A click 1 s or 3 s after the pick (8 kbit/s; "3G" without
    cache): the click landed on the cover, focus went to its spinner
    element, and nothing typed showed or remained.
  - Every case fetched the editors' sheets (`content_oneline.css`,
    `content.css`, `mailables/style.css`) from the network with status
    200, cache enabled or not. On "Slow 4G" they took 0.5 to 1.0 s, so
    the box was still loading when the cover came on.
- Fix trial: applied to all three apps' `lib/ui-library` (JavaScript
  rebuilt), then the walk and `MODE=nb`; reverted, then `MODE=nb` again.
  No request failed and no page script failed in any walk.
- Tips: `main` OJS 6b4323ced7, OMP 5777025be, OPS f048e747b4 (lib/pkp
  042726ebf6, lib/ui-library 99abe252; TinyMCE 7.9.3, tinymce-vue 6.3.0
  in the app lockfiles, 6.1.0 in ui-library's); `stable-3_5_0` OJS
  007c2cd0d6, OMP 2d575f250, OPS e737a9e465 (lib/pkp 092ec34b0f,
  lib/ui-library 2576e00a; TinyMCE 7.9.3, tinymce-vue 6.1.0);
  `stable-3_4_0` OJS 0012bd1022, OMP e30fa7e38, OPS 0f1e21a117 (lib/pkp
  a71d6bd2ca, lib/ui-library ee684b34); `stable-3_3_0` OJS d7d9dd14ec,
  OMP 8e72fc883, OPS c5532e2161 (lib/pkp 5e84acd11b, lib/ui-library
  96959f9e).
- Code reads: `FieldRichTextarea.vue`, `FieldRichText.vue` and
  `FieldPreparedContent.vue` on `main` and 3.5; TinyMCE's
  `contentBodyLoaded()`, `startProgress()`, `loadContentCss()` and
  `initEditorWithInitialContent()` in `tinymce.js`, and the silver
  theme's throbber (`setup$7`, `toggleThrobber()`); tinymce-vue's
  `Editor.js` and `Utils.js` (`initEditor()`, `bindModelHandlers()`)
  in 6.3.0 and 6.1.0; `SiteHandler.js` (`initializeTinyMCE`,
  `triggerTinyMCEInitialized`); the panel's store and
  `ChangeSubmissionLanguageMetadataForm` (`showWhen`). 3.4 and 3.3: no
  `ChangeSubmissionLanguage*` file in pkp-lib or ui-library.
- Introduced: `git blame` on the `<Editor>` element gives its props back
  to 7496b3c2c4 (`pkp/pkp-lib#3594`, 2018-10-23, the first Vue forms),
  under TinyMCE 4 and an older tinymce-vue, whose start-up was not read.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched by the symptom and by `FieldRichTextarea`/TinyMCE start-up;
  `pkp/pkp-lib#13180` (a review form's `getContent()` throwing on
  editors still starting) and `pkp/pkp-lib#13489` (editors stuck under
  the loading cover) are other faults of TinyMCE's start-up, not this
  one.
- Unverified: a server that sends cache headers (Apache), where the
  sheets may come from the browser's cache and the box load before the
  first key; the legacy forms' boxes and the other Vue boxes mounted by
  a click (not walked); whether the fix shows the page's boxes as
  disabled for a moment while the page loads.
