# A DOI refused on the DOIs page gets only "Some DOI(s) could not be updated", never the reason

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** [6eecffda15](https://github.com/pkp/ui-library/commit/6eecffda159acb76e0278570132cbe6d08e93bc2) for `pkp/pkp-lib#7014` · 2021-12-16 · Erik Hanson (ewhanson)
- **Upstream** `pkp/pkp-lib#9714` (open), the same fault reported on OJS 3.4 for a wrongly formatted DOI; this report adds the two other refusals, OMP and OPS, 3.5 and `main`, the cause and a tried fix
- **Tracked in** spec U45 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager types a DOI into a box on the DOIs page and presses "Save". When
the server refuses the DOI, the notice reads only "Some DOI(s) could not be
updated" and the box returns to its old value.

The server sends its reason with the refusal: "This is not formatted
correctly.", "The DOI contains invalid characters." or "The given DOI
suffix is already in use for another published item. Please enter a unique
DOI suffix for each item.". The page never shows it, so a mistyped DOI
cannot be told from one that another work already has.

The way round is to try other values until one is accepted.

## Impact

- **Lost.** The reason for the refusal, nothing else: no wrong DOI is
  stored.
- **Who.** A manager or editor who types or pastes a DOI by hand: a full
  `https://doi.org/…` address, a DOI with a space, or a DOI that another
  work already has.
- **Way round.** Retype until accepted. For a DOI that a work of another
  journal on the same server has, guessing does not help: the check covers
  every journal, and this manager has no screen that shows the other
  journal's DOIs.

Low: the refusal is right and the manager is told of it; only its reason
is missing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main`. The steps name OJS; square brackets
  give OMP and OPS. Its journal, press and server have DOIs on with only
  "Articles" ("Monographs", "Preprints") ticked under "Items with DOIs",
  so an expanded work shows one box, and no work has a DOI.

1. Sign in as `dbarnes`.
2. Side menu "DOIs".
3. Expand submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran" ("Show more details about 17") [OMP:
   submission 5, "Bomb Canada and Other Unkind Remarks in the American
   Media"; OPS: submission 2, "The Facets Of Job Satisfaction: A
   Nine-Nation Comparative Study Of Construct Equivalence"]. Press "Edit",
   type `10.1234/u45ir10` in the "Article" box ["Monograph"; "Preprint"],
   press "Save". "DOI(s) successfully updated" shows.
4. Expand submission 5, "Genetic transformation of forest trees" [OMP:
   submission 14, "From Bricks to Brains: The Embodied Cognitive Science of
   LEGO Robots"; OPS: submission 5, "Investigating the Shared Background
   Required for Argument: A Critique of Fogelin's Thesis on Deep
   Disagreement"]. Press "Edit", type `abc` in its "Article" box
   ["Monograph"; "Preprint"], press "Save".
5. Press "Edit", type `10.1234/a b` in the same box, press "Save".
6. Press "Edit", type `10.1234/u45ir10` (the DOI of step 3) in the same
   box, press "Save".

**Expected.** Each refusal names the box and gives the server's sentence:
"This is not formatted correctly." (step 4), "The DOI contains invalid
characters." (step 5), "The given DOI suffix is already in use for another
published item. Please enter a unique DOI suffix for each item." (step 6).

**Observed.** Steps 4, 5 and 6 each show only the notice "Some DOI(s)
could not be updated" at the top right, and the box is empty again. No
window opens. The answer to each "Save" holds the reason:

```
POST …/api/v1/dois   400  {"doi":["This is not formatted correctly."]}
POST …/api/v1/dois   400  {"doi":["The DOI contains invalid characters."]}
POST …/api/v1/dois   400  {"doi":["The given DOI suffix is already in use for another published item. Please enter a unique DOI suffix for each item."]}
```

`10.1234/u45ir10-y` typed into the same box is accepted: "DOI(s)
successfully updated".

## Cause

`DoiListItem.vue` (ui-library `src/components/ListPanel/doi/DoiListItem.vue`)
sends one request per changed box from `saveDois()`. Each request's
`error` handler is `postUpdatedDoiError(response, itemUid)` (line 710),
which sets `isSuccess = false` for the box and never reads `response`.
When every request has answered, `postUpdatedDoiComplete()` (line 722)
emits the fixed notice `manager.dois.update.partialFailure` if any box
failed, and `updateMutableDois()` puts the old values back.

The answer holds the reason. `PKPDoiController::add()` and `edit()` (lib/pkp
`api/v1/dois/PKPDoiController.php`, lines 231–234 and 278–280) return the
errors of `Repo::doi()->validate()` with status 400, keyed by field:
`{"doi": ["…"]}`.

The duplicate rule covers the whole server. `Repo::doi()->isDuplicate()`
(lib/pkp `classes/doi/Repository.php`, line 106) searches by the DOI alone,
without `filterByContextIds()`, so a DOI of any journal on the server
counts.

Reach:

- All four requests of a save share the handler: the new DOI (`POST
  dois`), its link to the item (`PUT _dois/…/{id}`), a changed DOI (`PUT
  dois/{id}`) and an emptied one (`DELETE dois/{id}`). Driven on screen:
  `POST dois`. The other three were read in the code only.
- The "DOIs for all versions" window saves through the same `saveDois()`.
  Driven on OPS: a duplicate typed there gets the same notice.
- Every kind of row uses the component (galleys, issues, peer reviews,
  chapters, formats, files). Driven on screen: the work's own row on each
  app.

## Proposed fix

Keep the answer's messages in `postUpdatedDoiError()` and show them when
the save completes, in the "DOI Updates Failed" window the bulk actions
already use (`DoiFailedActionDialogBody.vue`: "Some DOI(s) could not be
updated" over one line per failure), in place of the notice:

```diff
 		postUpdatedDoiError(response, itemUid) {
 			let items = {...this.itemsToUpdate};
 			items[itemUid].isSuccess = false;
+			items[itemUid].errorMessages = this.getErrorMessages(response);
 			this.itemsToUpdate = items;
 		},
```

A new `getErrorMessages()` takes the answer's `errorMessage` or `error`
when it has one, otherwise every field's validation messages, and falls
back to `common.unknownError`. `postUpdatedDoiComplete()` builds one line
per message, "{row label} ({value typed}): {message}", and opens the
window. The whole diff, against the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-edit-refusal-no-reason/fix.diff).
It needs no new string and no server change.

Tried on `main` on the three apps. With the fix in, steps 4 to 6 opened
"DOI Updates Failed" reading, on a journal, "Article (abc): This is not
formatted correctly.", "Article (10.1234/a b): The DOI contains invalid
characters." and "Article (10.1234/u45ir10): The given DOI suffix is
already in use for another published item. Please enter a unique DOI
suffix for each item.". With the fix in and out, the accepted saves showed
"DOI(s) successfully updated" and no window.

Tried in the "DOIs for all versions" window too, on OPS (submission 3,
two versions): a duplicate typed into the first version's "Preprint" box
opened "DOI Updates Failed" over the side window, and after "OK" the side
window was still open with the box back at its old value.

**Alternatives:**

- Show the message under the refused box and leave the box editable, as a
  form field does. It is the best for the manager, but the box has no
  error display, and `postUpdatedDoiComplete()` would have to stop leaving
  the edit mode and restoring the old values.
- Keep the notice and add the window: no test changes, but "Some DOI(s)
  could not be updated" then shows twice, in the notice and in the window.
- Put the reason into the notice: a notice expires after five seconds,
  too short for the duplicate message.

**What goes with it:**

- OPS's `cypress/tests/integration/Doi.cy.js` (lines 146–150) waits for
  "Some DOI(s) could not be updated" in the notices after a duplicate DOI
  in the versions window. It must look for the window instead and press
  "OK" before it goes on, since its next steps work in the side window
  under it.
- In the versions window the line does not say which version was refused:
  every version's row has the same label ("Preprint"). The row object has
  `versionNumber`, which the line can take if the team wants it; not in
  the diff.
- Backport: the diff applies as written to `stable-3_5_0` (`patch
  --dry-run`; not walked there). 3.4 has no `DoiFailedActionDialogBody.vue`
  (its `failedDoiActions` dialog is built inline in `DoiListPanel.vue`),
  so a backport there needs its own dialog.

Medium: the change itself is about forty lines in one ui-library
component, but OPS's Cypress test fails without its own change, so the fix
spans two repos.

## Evidence

- Kept script, which takes the Steps through the screens and then the
  accepted value:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-edit-refusal-no-reason/walk.js)
  (helpers in `../bulk-action-refusal-no-message/lib.js`). Run it on an
  install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/doi-edit-refusal-no-reason/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `WALK=versions` with
  `ops` for the versions window).
- The fix: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the same
  walks, then `node bin/try-fix.js revert …/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30).
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    (lib/pkp [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)),
    each with ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with lib/pkp a9c76aed62 and ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca):
    the same three answers and the same notice (the Steps; the versions
    window was not driven there). `postUpdatedDoiError()` (line 724) is
    the same.
- Code reads, not walked:
  - 3.4: ui-library `stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f):
    `postUpdatedDoiError()` (line 728) sets only the flag and
    `postUpdatedDoiComplete()` emits `manager.dois.update.partialFailure`
    (line 764). lib/pkp `stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747):
    `PKPDoiHandler` returns the `validate()` errors with status 400 (lines
    239–242, 280–282). The three apps share the component.
  - 3.3: ui-library `stable-3_3_0`
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708)
    has no `ListPanel/doi`, and lib/pkp
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072)
    no `api/v1/dois`.
- Introduced: GitHub links 6eecffda15 to no PR, so the header names the
  commit; `pkp/ui-library#165` has the issue's title.
- Upstream: `pkp/pkp-lib#13421` (open) is about `isDuplicate()` itself,
  another fault. No other match in pkp/pkp-lib, pkp/ojs or pkp/ui-library
  (2026-10-01).
- Unverified: a duplicate held by another journal was not driven (the
  dataset has one journal); the cross-journal reach is the code read under
  Cause.
