# A bulk action the server refuses on the DOIs page closes its window and shows no message

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; an "Error" window shows the reason)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/ui-library#286` for `pkp/pkp-lib#8919` · [7f13651e91](https://github.com/pkp/ui-library/commit/7f13651e9137170ee513e98c61b2cf8127796168) · 2023-10-02 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** `pkp/pkp-lib#13415` (open), covering more: a list of DOI problems met on 3.5, one of which is this fault ("Export DOIs" closes with no download and no message); this report adds the cause and a tried fix for that one item
- **Tracked in** spec U45 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager confirms a bulk action on the DOIs page and the server refuses
the request. The confirmation window closes, the list reloads with nothing
ticked, and no "Error" window says that the action was refused or why.

The case a manager meets is "Deposit DOIs" or "Export DOIs" with an
unpublished work among the ticked ones. The DOIs list shows unpublished
works beside published ones, so "Select All" ticks them. The server then
refuses the whole selection: nothing is deposited or exported, for the
published works either. The same silence follows any action confirmed with
nothing ticked, and an "Export DOIs" whose file does not pass the
registration agency's format check.

For an unpublished work the way round is to untick it and run the action
again, once the manager has guessed that this is the reason.

## Impact

- **Lost.** The deposit or the export of every ticked work, and any word
  that it did not happen. After a deposit the badges stay as they were;
  after an export no file downloads.
- **Who.** A manager or editor of a journal or preprint server with a
  registration agency, who ticks a page of works that holds an unpublished
  one. A press meets it only with nothing ticked.
- **Way round.** Untick every work whose badge reads "Unpublished" and
  repeat; the deposit then goes through. For an export file that fails the
  format check the page offers none: it names neither the work nor the
  fault.

Medium: the action fails for all ticked works and can be taken for done,
but the unchanged badges show that it was not, and unticking the
unpublished works gets it done. The rating rests on that case; the failed
format check was seen here only on an install without outside access
(Cause, Reach).

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the steps name OJS; square brackets
  give OPS). Its journal, press and server have DOIs on with only
  "Articles" ("Monographs", "Preprints") ticked, no prefix and no
  registration agency, so the DOIs page has the one tab "Articles"
  ("Monographs", "Preprints").

Nothing ticked (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Side menu "DOIs". The "Articles" tab is open.
3. Tick nothing. "Bulk Actions" › "Mark DOIs Unregistered". The window
   asks "You are about to mark DOI metadata records for 0 item(s) as
   unregistered. Are you sure you want to mark these records as
   unregistered?".
4. Press "Mark DOIs Unregistered".

An unpublished work among the ticked ones (OJS, OPS; a press has no
registration agency):

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save".
4. "Registration": "Registration Agency" "Crossref", "Depositor name"
   `Public Knowledge Project`, "Depositor email" `dbarnes@mailinator.com`,
   "Save".
5. Side menu "DOIs". Tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran" (published) [OPS: submission
   2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
   Construct Equivalence"]. "Bulk Actions" › "Assign DOIs" › "Assign DOIs".
   Its badge reads "Unregistered": it is published and has a DOI, so
   neither action below can refuse it.
6. Tick submission 17 and submission 5, "Genetic transformation of forest
   trees", whose badge reads "Unpublished" [OPS: 2 and submission 1, "The
   influence of lactation on the quantity and quality of cashmere
   production"]. "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs".
7. Tick the same two. "Bulk Actions" › "Export DOIs" › "Export DOIs".
8. Tick submission 17 [2] alone. "Bulk Actions" › "Deposit DOIs" ›
   "Deposit DOIs".

**Expected.** In step 4 of the first path and steps 6 and 7 of the second,
the confirmation gives way to an "Error" window with the server's reason
and "OK": "No valid publication objects were included with the request."
with nothing ticked, "One or more invalid publication objects were
included with the request." in steps 6 and 7.

**Observed.** Each time the window closes, the list reloads with nothing
ticked, and no window or notice follows. After steps 6 and 7 the two works
still read "Unregistered" and "Unpublished", and nothing downloads. The
answers hold the reason the page does not show:

```
PUT …/api/v1/dois/submissions/markUnregistered   404  {"error":"No valid publication objects were included with the request."}
PUT …/api/v1/dois/submissions/deposit            400  {"error":"One or more invalid publication objects were included with the request."}
PUT …/api/v1/dois/submissions/export             400  {"error":"One or more invalid publication objects were included with the request."}
```

Step 8, without the unpublished work, is accepted: "Items successfully
submitted for deposit", and the badge reads "Submitted".

## Cause

Each bulk action of `DoiListPanel.vue` (ui-library
`src/components/ListPanel/doi/DoiListPanel.vue`) sends its request from
the confirmation's button and ends with `complete: () =>
this.onBulkActionComplete(closeDialog)`. Four of the seven actions
("Deposit DOIs", "Export DOIs", "Mark DOIs Unregistered", "Deposit All")
have `error: (response) => this.ajaxErrorCallback(response)`. The other
three ("Mark DOIs Registered", "Mark DOIs Needs Sync", "Assign DOIs") first
look for `failedDoiActions` in the answer and call `ajaxErrorCallback()`
only when it is absent.

`ajaxErrorCallback()` (`src/mixins/ajaxError.js`) opens the "Error" window
with the answer's `error` text. `onBulkActionComplete()` (line 824) then
calls `closeDialog()`, which is meant for the confirmation.

The modal store keeps a single dialog (`src/stores/modalStore.js`:
`openDialog()`, line 33, overwrites `dialogProps`; `closeDialog()` clears
it). The `close` function a dialog passes to its button's callback ends in
that `closeDialog()`, and the store does not know which dialog asked. jQuery
runs `error` before `complete`. So the "Error" window replaces the
confirmation, and the confirmation's `close` then closes the "Error"
window, in the same tick, before it is drawn.

On 3.4 the dialogs had names: `onBulkActionComplete()` called
`this.$modal.hide('bulkActions')`, which left the `ajaxError` dialog open.
The Vue 3 migration replaced the named modals with the single dialog and
passed the confirmation's `close` to `onBulkActionComplete()`.

"DOI Updates Failed" still shows because the three handlers that find
`failedDoiActions` only store the list. The watcher that opens that window
runs after `error` and `complete` have both returned.

Reach:

- Every answer that reaches `ajaxErrorCallback()` is lost, on all seven
  actions. Walked: "Mark DOIs Unregistered" with nothing ticked, "Deposit
  DOIs" and "Export DOIs" with an unpublished work. Code read: "The
  requested resource was not found." ("Assign DOIs" with nothing ticked),
  "A DOI prefix is required to generate DOIs.", the other actions with
  nothing ticked.
- "Export DOIs" refuses a second kind of work: a published one without a
  DOI (`getExportableDOIsSubmissionIds()`, lib/pkp
  `classes/publication/DAO.php` line 506, asks for a published publication
  with a DOI), with the same answer (code read; step 5 keeps it out of
  the Steps). "Deposit DOIs" refuses only unpublished works.
- The export file's format check. `PubObjectsExportPlugin::exportXML()`
  validates the file against the agency's schema (Crossref's
  `crossref5.4.0.xsd`, DataCite's `metadata.xsd`, fetched from the agency's
  site), and any error makes `exportSubmissions()` answer 400 "An XML
  validation error occurred and the XML could not be exported.". That
  happens when a work's metadata gives a file the schema refuses, or when
  the server cannot fetch the schema. Walked in the second form only: the
  test install has no outside access, so "Export DOIs" on submission 17
  alone got that answer and closed without a word. The first form is the
  one `pkp/pkp-lib#13415` reports from a production journal; it was not
  reproduced here.
- "Deposit DOI(s)" in an expanded work's agency box calls the same
  `openBulkDeposit()`, and a journal's "Issues" tab uses the same component
  with the issue endpoints (code read).
- "Mark DOIs Unregistered" can get a `failedDoiActions` answer
  (`markSubmissionsUnregistered()`, for an id from another context), which
  its handler has no branch for. No screen sends such an id.
- `SubmissionsListItem.vue` `deleteSubmission()` has the same pair
  (`error: this.ajaxErrorCallback`, `closeDialog()` in `complete`). The
  pages that use `SubmissionsListPanel` on `main` (the native, PubMed and
  ONIX 3.0 import/export tools) give it their own item template, so that
  delete is not on any screen (code read).
- The other list panels (institutions, announcements, highlights,
  contributors) call `close()` only in `success`, so their "Error" window
  stays.

## Proposed fix

Close the confirmation only when the request succeeded, as the other list
panels do. After a failed request the "Error" window has already taken the
confirmation's place. `onBulkActionComplete()` takes jQuery's `textStatus`
from each action's `complete`:

```diff
-					complete: () => this.onBulkActionComplete(closeDialog),
+					complete: (jqXHR, textStatus) =>
+						this.onBulkActionComplete(closeDialog, textStatus),
```

```diff
-		onBulkActionComplete(closeDialog) {
-			closeDialog();
+		onBulkActionComplete(closeDialog, textStatus) {
+			// Only one dialog is open at a time: after a failed request the error
+			// dialog has taken the confirmation's place and must stay open.
+			if (textStatus === 'success') {
+				closeDialog();
+			}
 			this.get();
 			this.selected = [];
```

The diff, against the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/bulk-action-refusal-no-message/fix.diff).

Tried on `main` on the three apps. With the fix in, each refused step
opened "Error" with the Expected text, and the export of submission 17
alone opened "Error" with "An XML validation error occurred and the XML
could not be exported.". With the fix in and out, "Assign DOIs", the
accepted deposit of step 8 and a "Mark DOIs Unregistered" on one work
closed their window and showed their success notice, and "Mark DOIs
Registered" with an unpublished work opened "DOI Updates Failed".

**Alternatives:**

- Close the confirmation in each action's `success`, the exact shape of
  the other list panels. It also holds if an endpoint later answers 204,
  where `textStatus` is `nocontent` and the tried diff would leave the
  confirmation open; today every success answer here is a 200 with JSON.
  It is seven edits instead of one rule.
- Make `modalStore.closeDialog()` close only the dialog that asked: it
  would cover every screen, but it changes a store every page uses for a
  mistake found in this panel.

**What goes with it:**

- The list still reloads and the ticks are still cleared behind the
  "Error" window, as today. Keeping the ticks after a refusal would let the
  manager see what was selected; that is a product choice, not in the diff.
- "Mark DOIs Unregistered" with a `failedDoiActions` answer would show
  "Error" with the unknown-error text, since that answer has no `error`.
  Giving `openBulkMarkUnregistered()` the branch its three siblings have
  is advised; it is not in the diff and was not tried.
- `SubmissionsListItem.vue` `deleteSubmission()` can take the same change.
  It is not in the diff.
- A request that gets no answer at all (status 0) leaves the confirmation
  open, as on the other list panels; today it closes.
- Backport: the diff applies as written to `stable-3_5_0` (`patch
  --dry-run`); it was not walked there.
- Test: a Cypress step in the apps' `Doi.cy.js`, or the e2e scenario in
  the pkp-e2e U45 spec: a refused "Deposit DOIs" shows the "Error" window.
- [pkp-e2e#223](https://github.com/jardakotesovec/pkp-e2e/issues/223)
  proposes that "Deposit DOIs" refuse a published work without a DOI. That
  refusal is shown only once this fix is in.

Small: a few lines in one ui-library component.

## Evidence

- Kept script, which takes the Steps through the screens, then the export
  of submission 17 alone and two neighbour actions:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/bulk-action-refusal-no-message/walk.js)
  (helpers in `lib.js` beside it). Run it on an install loaded from the
  default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/bulk-action-refusal-no-message/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes both paths in
  one sign-in.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the same
  walk, then `node bin/try-fix.js revert …/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30).
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
    Walked with an earlier form of the Steps, without step 5 and step 8:
    the same three answers and no window. There
    `onBulkActionComplete(closeDialog)` (line 819) and the single dialog
    of `modalStore.js` are the same, and `exportSubmissions()` asks only
    for a published work.
- Code reads, not walked:
  - 3.4: ui-library `stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f):
    `onBulkActionComplete()` calls `this.$modal.hide('bulkActions')` and
    `ajaxErrorCallback()` opens a dialog named `ajaxError`
    (vue-js-modal). lib/pkp `stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747):
    `PKPDoiHandler` refuses with `withJsonError()`, whose `errorMessage`
    that dialog shows.
  - 3.3: ui-library `stable-3_3_0`
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708)
    has no `ListPanel/doi`, and lib/pkp
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072)
    no `api/v1/dois`.
- Introduced: `git blame` on `closeDialog();` in `onBulkActionComplete()`
  gives 7f13651e91. At that commit `mixins/dialogProvider.js` already kept
  one `pkpDialogProps` for the page; the single dialog moved into
  `modalStore.js` later (c991ce12d, 2024-01-11) unchanged in this respect.
- Upstream: `pkp/pkp-lib#13415`'s addendum has an "Export DOIs" where the
  "confirmation window goes away, no download", and a comment adds that
  users cannot see an XML validation error. No other match in pkp/pkp-lib,
  pkp/ojs or pkp/ui-library (2026-10-01).
- Unverified: what the page does after a server error (500) on the three
  actions that test `response.responseJSON` for `failedDoiActions`; an
  answer without a JSON body was not driven. The export file's failure on
  an install that can reach the agency's site.
