# An author's revision summary can carry a script that runs in the editor's browser when "Insert Content" opens

- **Severity** high
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP
  - 3.5: none (no Summary of Changes field)
  - 3.4: none (code; no Summary of Changes field)
  - 3.3: none (code; no Summary of Changes field)
- **Introduced** `pkp/ui-library#885` for `pkp/pkp-lib#12584` · [881503b4f9](https://github.com/pkp/ui-library/commit/881503b4f986ddc06a50553a0726bd0cf3347758) · 2026-05-28 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U49 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#a11)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author asked for revisions uploads a revised file and writes a
"Summary of Changes (Amendment Notice)" for it. Later a Journal or Press
Manager or Editor presses "Insert Content" on a version's own Summary of
Changes box to reuse that text. They expect the panel to list each saved
summary as text. Instead, a summary holding markup that carries a script
(an image tag with an error handler, for one) runs that script in their
browser, under their sign-in, the moment the panel opens.

Nothing on screen gives it away: the panel lists the summary's text as
usual, or "No saved summaries found for this submission's review
revisions." when the summary holds nothing else. The script can do
whatever the editor's account can do.

Typing or pasting markup into the author's box is not enough: the box
strips it. But the server stores whatever summary the box's save request
carries, so the author can send that request again from their own
signed-in browser with the markup added.

## Impact

- **Lost**: control of the editor's or manager's session. The author's
  script acts with that account's sign-in, silently.
- **Who**: the editor who presses "Insert Content" on a submission whose
  author stored such a summary. The button sits on the Summary of
  Changes box of every version: on "Publication Settings" in a journal,
  on "Catalog Entry" in a press, and in a journal's "Review Publishing
  Details" panel on the way to publishing. Those are the Journal or Press
  Manager's and the Editor's pages (the roles that may publish), and any
  other role the page lets edit the publication. Editors press it to
  carry an author's revision note into the version's amendment notice.
  The author can plant the summary once the editor has requested
  revisions in a review round.
- **Way round**: none that protects the editor, who cannot tell which
  submission holds such a summary. Never pressing "Insert Content"
  avoids it, and the summary stays stored on the file.

High: any author asked for revisions can take over, unseen, the session
of the manager or editor who later reuses their summary.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, OJS. Submission 13
"Hydrologic Connectivity in the Edwards Aquifer between San Marcos
Springs and Barton Springs during 2009 Drought Conditions" is in Review,
round 1, with revisions requested from its author `lkumiega`. [OMP: book
16 "A Designer's Log: Case Studies in Instructional Design", author
`mpower`. The dataset holds no book with revisions requested, so first
sign in as `dbarnes`, open book 16 from "Submissions", press "Request
Revisions", keep "Revisions will not be subject to a new round of peer
reviews.", "Next", "Continue", "Record Decision", and sign out.]

1. Sign in as `lkumiega` and open submission 13 from "My Submissions".
2. Press "Upload revisions", choose the component "Article Text" [OMP:
   "Book Manuscript"] and any file.
3. Press "Continue". On "2. Review Details", type `Fixed figure 2.` in
   "Summary of Changes (Amendment Notice)". Press "Continue", then
   "Complete".
4. In the same signed-in browser, send step 3's save request once more,
   with only the summary changed. The second "Continue" of step 3 sent
   it: in the browser's developer tools, the Network tab lists it as a
   `POST` to `…/$$$call$$$/api/file/manage-file-api/save-metadata?…`.
   Copy that request's address as the Network tab shows it; it carries
   the new file's `submissionFileId`. Here it was
   `/index.php/publicknowledge/$$$call$$$/api/file/manage-file-api/save-metadata?submissionId=13&submissionFileId=46&fileStage=15&stageId=3&reviewRoundId=null`
   (the upload window itself sends the round as the word `null`). [OMP:
   `submissionId=16`, its own `submissionFileId`, the same `fileStage=15`
   and `stageId=3`.] Then, in the console, with that address:

   ```js
   const body = new FormData();
   body.append('csrfToken', pkp.currentUser.csrfToken);
   body.append('name[en]', '<the file name, as step 3 sent it>');
   body.append('summaryOfChanges', `<p>Fixed figure 2.<img src="x" onerror="alert('hkk11: this ran in ' + document.title)"></p>`);
   await fetch('<the address copied above>', {method: 'POST', body});
   ```

   The answer is `200` with `{"status":true,"content":"",…}`.
5. Sign out. Sign in as `dbarnes` and open submission 13 from
   "Submissions".
6. In the side menu, under "Publication", open "Publication Settings"
   [OMP: "Catalog Entry"].
7. Click into the English "Summary of Changes (Amendment Notice)" box and
   press "Insert Content" in its toolbar.

**Expected**: the "Insert Content" panel lists "Fixed figure 2." with
"Review (Round 1) • 2026-10-15 • <the file name>" under it, and nothing
runs.

**Observed**: as the panel opens, the browser shows the alert
`hkk11: this ran in Submissions | Journal of Public Knowledge` [OMP:
`… | Public Knowledge Press`]. The panel then lists "Fixed figure 2."
as usual. Pressing its "Insert" adds the summary to the box without the
handler (the box holds `<p>Fixed figure 2.<img src="x"
data-mce-src="x"></p>`), and nothing more runs. On the journal,
"Save" pressed straight after "Insert" sends and stores `<p>Fixed figure
2.<img src="x"></p>`: the handler does not reach the version. (The page
refuses that save with "This field is required." under "Issue" until an
issue choice is made; the walk picked "Don't Assign To An Issue" before
step 7.)

Through the screens alone the author's box keeps such markup out: typed
into step 3 it is stored as text (`&lt;img …&gt;`) and listed literally;
pasted as HTML it is stored as `<p><img src="x"></p>`, without the
handler. In both cases nothing runs.

## Cause

`InsertSummaryOfChangesModal.vue` (ui-library) lists the summaries the
submission's review revision files carry, read from the submission files
API, and shows each as plain text. It makes that text in
`htmlToPlainText()`:

```js
function htmlToPlainText(html) {
	const div = document.createElement('div');
	div.innerHTML = html || '';
	return (div.textContent || '').trim();
}
```

The `div` belongs to the page's own document, so assigning to its
`innerHTML` builds live elements: an `<img>` starts loading at once and
its `onerror` runs in the page, with the editor's session, whether or
not the `div` is ever attached. The summary is HTML an author wrote, so
it must be parsed where nothing runs.

The stored value is the author's as sent:
`SubmissionFilesMetadataForm::execute()` (pkp-lib) saves
`summaryOfChanges` from the request on a review revision file, and the
submission file schema only asks for a string. That is how the code base
treats rich text throughout: stored as entered, cleaned where it is
shown (`strip_unsafe_html` in templates, `v-strip-unsafe-html` in the
Vue pages).

Reach:

- The component is used by the Summary of Changes box on OJS's
  "Publication Settings" and OMP's "Catalog Entry"
  (`WorkflowPublicationForm.vue`) and in the journal's "Review
  Publishing Details" panel (`useWorkflowVersionForm.js`, not on OPS).
  "Publication Settings" and "Catalog Entry" were walked; the panel
  shares the code (code).
- OMP also lists internal review revisions (`isOMP()` adds that file
  stage): the same path (code).
- The other readers of a file's `summaryOfChanges` on `main` are safe:
  `FileManagerCellType.vue` reads only whether there is one, and the
  file's details form loads it into TinyMCE, which sanitizes it (code).
- "Insert" hands the raw summary to the version's form
  (`insert()` calls `onInsert(item.summary)`, which `setValue()`s it),
  but the box's TinyMCE cleans it and the form takes back the cleaned
  value: "Save" straight after "Insert" sent and stored the summary
  without the handler (walked on OJS). Only the `<img src="x">` itself
  reaches the version's summary.
- `usePkpCiteStore.js` `copyToClipboard()` (the reader page's "Cite",
  `main` only) reads the formatted citation's text the same way, through
  a `div`'s `innerHTML`. Its input is the citation the server formats,
  not raw user text; whether that can carry an active element was not
  checked (code).

## Proposed fix

Parse the summary in the reader, in a document of its own. A document made by
`DOMParser` has no browsing context: it runs no handlers and loads no
images, and its `textContent` is the same text
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revision-summary-markup-runs-on-insert-content/fix.diff)):

```diff
+// The summary is HTML an author saved. Parse it in a document of its own, which
+// runs no handlers and loads nothing, never into an element of this page.
 function htmlToPlainText(html) {
-	const div = document.createElement('div');
-	div.innerHTML = html || '';
-	return (div.textContent || '').trim();
+	const doc = new DOMParser().parseFromString(html || '', 'text/html');
+	return (doc.body.textContent || '').trim();
 }
```

Tried on `main` in OJS and OMP with the Steps as written: the panel
listed "Fixed figure 2." and nothing ran. An ordinary summary made bold
in the author's box was listed as "Fixed Figure 2." and inserted with
its bold, the same with the fix in and out.

**Alternatives**

- Run the summary through ui-library's `sanitizeHtml()` (DOMPurify, the
  `v-strip-unsafe-html` directive's helper) before the `div`: no handler
  runs, but the `div` still loads every image the author names, which
  tells the author when and from where the editor opened the panel.
- Clean `summaryOfChanges` on save in `SubmissionFilesMetadataForm`:
  covers this reader only for summaries saved after the change, and the
  REST API's file edit would need the same; the code base does not clean
  rich text on input elsewhere.

**What goes with it**

- No stored data to repair: once the reader parses inertly, a stored
  summary with markup is harmless and lists as its text, and "Insert"
  already reaches the version's summary cleaned (Cause, reach).
- No backport: no released version has the component.
- A unit test beside the component (ui-library runs vitest): a summary
  holding `<img src="x" onerror="…">` and text gives the text and runs
  nothing.
- `usePkpCiteStore.js` `copyToClipboard()` can take the same change if
  its citation can carry markup (Cause, reach).

Small: three lines in one ui-library component, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revision-summary-markup-runs-on-insert-content/walk.js)
  with its `lib.js`, run on installs freshly loaded from PKP's default
  test dataset (pkp/datasets 7912e09, 2026-10-14), PostgreSQL:
  `WALK=request node bin/probe.js ojs,omp shared/playwright/checks/issues/revision-summary-markup-runs-on-insert-content/walk.js`.
  For step 4 the script resends the request step 3 sent, with the
  wizard's own fields (`csrfToken`, `name[en]`, `summaryOfChanges`); the
  stored value was read in `submission_file_settings`. `THEN_SAVE=1` (OJS)
  presses "Save" straight after "Insert" and reads what the save sent,
  what the API answered and what `publication_settings` holds. Without
  `WALK` the script takes the screens-only path (the summary typed, then
  a second upload with it pasted as HTML), which stores no handler and
  raises no alert on either app. No server error or page script error in
  any run.
- Fix tried: `node bin/try-fix.js apply <fix.diff> ojs omp` (it rebuilds
  the JavaScript), then the walk above on a fresh load; "Insert" gave
  the same box as without the fix. Neighbour: `WALK=nb` (the author's
  summary typed and made bold through the screens), with the fix in and
  out: the box held `<p><strong>Fixed Figure 2.</strong></p>` both
  times.
- OPS walked on `main`: preprint 3's "Preprint entry" has two Summary of
  Changes boxes (English, French) and no "Insert Content".
- 3.5 walked (the same script on `stable-3_5_0`, OJS, OMP, OPS): the
  author's "Review Details" step has no "Summary of Changes" box, and
  the editor's "Issue", "Catalog Entry" and preprint entry pages have
  none and no "Insert Content". The 3.5 checkouts' `lib/pkp` and
  `lib/ui-library` hold no `summaryOfChanges` and no
  `InsertSummaryOfChanges` component.
- 3.4 and 3.3 read in the code: no `summaryOfChanges` in `lib/pkp` or
  `lib/ui-library` on `stable-3_4_0` and `stable-3_3_0`.
- Introduced: `git blame` on `htmlToPlainText()` in
  `InsertSummaryOfChangesModal.vue` gives 881503b4f9, the file's first
  commit; the GitHub API names its PR `pkp/ui-library#885`. The file's
  only later commit, 8a1d89ef (`pkp/pkp-lib#12584`, the summary made a
  single value), left the function as it was.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library
  by the symptom's words and by `htmlToPlainText` and
  `InsertSummaryOfChanges`, and read `pkp/pkp-lib#12584` and its
  follow-ups (`#12623`, `#12624`, `#13048`): none is this fault.
- The author's box is TinyMCE 7.9.3 (`addFieldRichTextArea`, toolbar
  bold, italic, superscript, subscript and link), whose
  `xss_sanitization` is on by default.
- Branch tips: `main` OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f
  (each lib/pkp b17fadae59, ui-library 47b565cb); `stable-3_5_0` OJS
  ca763c91cd, OMP a70bbb9c4, OPS 44aec6e131 (lib/pkp 4045d9241e,
  ui-library 2576e00a); `stable-3_4_0` OJS daf0ca971d, OMP 0aec65441,
  OPS acd8ae704b (lib/pkp 55c8e406b3, ui-library ee684b34);
  `stable-3_3_0` OJS d7d9dd14ec, OMP 8e72fc883, OPS c5532e2161 (lib/pkp
  5e84acd11b, ui-library 96959f9e).
- Unverified: the "Review Publishing Details" panel's box (the same
  component, not walked); "Insert" then "Save" on OMP's "Catalog Entry"
  (walked on OJS only).
