# Submission wizard refuses a plain language summary over the word limit, then hangs on "Saving"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OPS
  - 3.5: none (no plain language summary)
  - 3.4: none (code; no plain language summary)
  - 3.3: none (code; no plain language summary)
- **Introduced** `pkp/ojs#5067` and `pkp/ops#1086` for `pkp/pkp-lib#11540` · [cf6117cfe4](https://github.com/pkp/ojs/commit/cf6117cfe4daa01c53fd17d09226153c08b6713b), [6158ab4407](https://github.com/pkp/ops/commit/6158ab440790204cae78964b574880f834578d66) · 2025-08-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An author whose plain language summary is longer than the section's
word limit cannot save the "Details" step of the submission wizard, and
the page's own script then fails in the browser. When the step is
saved, an "Error" dialog reads "An unexpected error has occurred.
Please reload the page and try again." without naming the field. The
footer then shows "Saving" for good, and on "Review" "Checking your
submission" never clears, so "Submit" stays disabled.

Everything typed on "Details" in that visit is lost, the summary and
the abstract included. While typing, the summary's box does mark its
count with a warning sign ("Word Count: 20/10"). The abstract's box
shows the same sign for the same limit, but an abstract over it is
saved and flagged on "Review" instead.

## Impact

- **Lost:** the title, keywords, abstract and summary typed on
  "Details" in that visit. Nothing tells the author they were not
  saved: the dialog says only to reload.
- **Who:** authors on a journal or preprint server that asks for a
  plain language summary (Settings › Workflow › "Submission" ›
  "Metadata") and gives a section a "Word Count" (the section's form,
  "Limit abstract word counts for this section (0 for no limit)").
  Both are off by default, and the section's form names only the
  abstract, so a manager who sets it does not know it also limits the
  summary.
- **Way round:** reload, type the lost text again, and keep the
  summary within the count its box shows. The box's warning sign comes
  back as soon as the summary is over the limit again, which is how
  the author can tell what to shorten.

Medium: the author cannot submit until they reload and loses one
step's text, but the box marks the summary as over the limit before
and after the failure, so there is a way round on screen. It would be
high if nothing on screen pointed to the summary.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main` (OPS `main`
the same, with the differences in brackets).

Setting up:

1. Sign in as `rvaca`.
2. Settings › Workflow › "Submission" › "Metadata": tick "Enable plain
   language summary metadata", choose "Ask the author to provide a
   plain language summary during submission.", and press "Save".
3. Settings › Journal [Server] › "Sections": open the "Articles"
   ["Preprints"] row's "Edit".
4. Type `10` in "Word Count" and press "Save".
5. Sign out.

Submitting:

6. Sign in as `ccorino`.
7. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`).
8. Title `u21w31 Plain language summary over the limit`, Section
   "Articles" [no choice offered], tick "Yes, my submission meets all of
   these requirements." and the privacy box, then press "Begin
   Submission".
9. On "Upload Files", press "Continue".
10. On "Details", type twenty words in "Plain Language Summary"
    (`one two three … twenty`). The box shows a warning sign and "Word
    Count: 20/10".
11. Press "Continue".
12. An "Error" dialog opens; press its "OK".
13. Press "Continue" until "Review" [on "For Readers", choose "This
    preprint has not been published elsewhere."].
14. Reload the page [answer "No, discard unsaved changes"] and open
    "Details".

**Expected:** the summary is saved, as an abstract over the limit is.
"Review" lists the summary under "Details" with "The plain language
summary is too long. It should be 10 words or less. It is currently 20
words long.", and "Submit" stays disabled until it is shortened. After
the reload "Details" shows the summary.

**Observed:** at step 11 the wizard moves on to "Contributors", and the
save behind it answers 400:

```
PUT /index.php/publicknowledge/api/v1/submissions/21/publications/22
400 {"plainLanguageSummary":{"en":["The plain language summary is too long. It should be 10 words or less. It is currently 20 words long."]}}
```

The dialog of step 12 reads:

```
An unexpected error has occurred. Please reload the page and try again.
```

The footer reads "Reconnecting". About four seconds after the 400 the
page's script fails:

```
Cannot read properties of undefined (reading 'url')
```

After "OK" the footer reads "Saving" and does not change again; no
further save is sent. On "Review", "Checking your submission" stays on
screen, "Plain Language Summary" reads "None provided", and "Submit" is
disabled. After the reload "Details" shows the summary empty. An
abstract typed at step 10 beside the summary is empty too. On OPS the
reload first opens an "Unsaved Changes" dialog ("We found unsaved
changes from 8 seconds ago. … Would you like to restore those changes
now?"); on OJS it does not.

Control: `dbarnes` opens a submission already submitted in the
"Articles" ["Preprints"] section, submission 4 [1], Publication ›
"Title & Abstract", types the same summary and presses "Save". It is
refused with "The plain language summary is too long. It should be 10
words or less. It is currently 20 words long." under the box, as
intended.

## Cause

In OJS `classes/publication/Repository.php`, `Repository::validate()`
checks the section's word limit on `plainLanguageSummary` (lines
100–115) on every save of the publication, including the saves the
wizard makes while the submission is in progress.

The checks of a section's settings are meant to wait for the submit.
The abstract's word-limit check sits inside
`if ($section && !$submission->getData('submissionProgress'))` (line
66, "Only validate section settings for completed submissions"). While
the submission is in progress, the wizard saves what the author types.
`Repository::validateSubmit()` (`classes/submission/Repository.php`)
then reports both limits on "Review": the abstract's and the summary's.

cf6117cfe4 ("Missing validations for PLS") added the summary's check to
`validate()` and to `validateSubmit()`. In `validate()` it put the
check after the `submissionProgress` block instead of inside it. OPS
has the same code (lines 98–113, guard on line 64), from 6158ab4407.

The wizard then hangs because of how it handles a refused save, a
fault of its own in ui-library. The save sends the whole of the
"Details" form (title, keywords, abstract, summary), so the refusal
drops all of it. The page then counts itself disconnected and tries to
send again with nothing left to send, and that attempt throws. The
flags it leaves set keep the footer on "Saving" and stop the "Review"
check from running.

Reach:

- "Continue" from "Details" (walked, OJS and OPS). The wizard's timed
  save sends the same request (code).
- OMP: a series has no word limit, and OMP has no such check (code).

## Proposed fix

A proposal; the team decides. In OJS and OPS, move the summary's
word-limit check inside the `submissionProgress` guard of
`Repository::validate()`, beside the abstract's. The wizard then saves
the summary, and the limit still holds on "Review" (through
`validateSubmit()`) and on every save once the submission is
submitted. Inside the guard `$section` is known to exist. Outside it,
the block calls `$section->getData('wordCount')` with no null check, so
a save with a missing or invalid section fails with a fatal error
instead of returning the `sectionId` error; the move fixes that too.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-language-summary-over-limit-hangs-wizard/fix.diff)
(OJS) and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-language-summary-over-limit-hangs-wizard/fix-ops.diff)
(OPS) move the block, in short:

```diff
                     }
                 }
             }
-        }
 
-        if (isset($props['plainLanguageSummary'])) {
-            // Check the word count on plain language summary
+            if (isset($props['plainLanguageSummary'])) {
+                // Check the word count on plain language summary, like the abstract's above
 ...
                 }
             }
         }
```

Tried on OJS and OPS `main`: at step 11 the save answers 200 and the
footer reads "Last saved 0 seconds ago". "Review" lists the summary
with the word-limit message and keeps "Submit" disabled, and after the
reload "Details" shows the summary. The control still refuses the
summary, with the fix and without it.

**Alternatives:**

- Keep refusing in the wizard and show the server's message under the
  box on "Details". That puts two rules on one limit: the abstract is
  saved and the summary is not. It also keeps the unguarded
  `$section->getData()`.
- Move both checks to pkp-lib. That is a larger change: OMP has no word
  limit, and the abstract's check lives in each app's repository.

**What goes with it:**

- No data repair: a refused summary was never stored.
- The wizard's hang on a refused save is a separate fix in ui-library.
  It has to change the autosave mixin's `onError` in `_sendAutosave()`
  (`src/mixins/autosave.js` line 253), which marks the page
  disconnected before `SubmissionWizardPage.vue` `autosaveErrored()`
  runs; `autosaveErrored()` lets only status 0 and 500 through
  unchanged.
- Other checks of the same kind: the title check in pkp-lib's parent
  `PKPPublication\Repository::validate()` (line 187) waits for the
  submit, as the abstract's does. The same parent's check for a
  required summary (line 229) runs on in-progress saves too, but the
  wizard always sends the summary's box, even empty, so it does not
  refuse the wizard's saves. The fix leaves it as it is.
- Guard: an e2e case in U21 (a summary over the section's limit on
  "Details", then "Review"). OJS and OPS have no unit tests for
  `Repository::validate()`, so a unit test means new scaffolding (a
  context, a section and a submission).

Medium: in each app the change is one block moved inside an existing
condition, but it is two app repos (OJS and OPS), and its test is an
e2e case or new unit-test scaffolding.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-language-summary-over-limit-hangs-wizard/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/plain-language-summary-over-limit-hangs-wizard/walk.js`
  (OMP is skipped; `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With
  no `PHASE` it takes steps 1–14 and then the control; `ABSTRACT=1`
  also types an abstract at step 10 and reads it after the reload;
  `PHASE=neighbour` takes steps 1–5 and the control only.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/plain-language-summary-over-limit-hangs-wizard/fix.diff ojs`
  and `… apply …/fix-ops.diff ops`, the script with no `PHASE`, then
  `node bin/try-fix.js revert ojs ops`. Without the fix,
  `PHASE=neighbour` showed the same refusal.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), on `main` (OJS, OPS) and `stable-3_5_0`. On
  3.5, step 2 finds no "Plain Language Summary" item under "Metadata",
  on OJS and OPS.
- Not driven: the wizard's timed save (the code sends the same
  request through `_sendAutosave()`); "Yes" in OPS's "Unsaved Changes"
  dialog. The title and keywords being lost with the summary is read
  in the code: the wizard's "Details" form (`Details`, a
  `TitleAbstractForm`) holds them with the abstract and summary and
  sends them in one save. Unverified: why OPS opens the "Unsaved
  Changes" dialog and OJS does not.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
    both with ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5, 3.4 and 3.3: pkp-lib's `schemas/publication.json` has no
    `plainLanguageSummary`. In OJS and OPS,
    `classes/publication/Repository.php` (3.5, 3.4) checks only the
    abstract's word limit, inside the same guard, and
    `classes/services/PublicationService.inc.php` (3.3) checks only the
    abstract's.
  - `main`, the hang: in ui-library `src/mixins/autosave.js`,
    `_sendAutosave()`'s `onError` (line 253) sets `isDisconnected`
    and puts the refused save back into the browser's store. Then
    `SubmissionWizardPage.vue` `autosaveErrored()` (line 357) removes
    it again (any status but 0, 500 and 403) and opens the dialog.
    `_runReconnect()` (line 215) calls
    `_sendAutosave(this._getNextAutosave())` 4 s later with nothing to
    send. `_sendAutosave()` sets `isAutosaving` and its pending flag
    (line 242) and throws on `payload.url` (line 283), so neither is
    cleared. `validate()` (line 801) waits on both before the "Review"
    check, and `canSubmit` reads them.
  - `main`, the setting: OJS `SectionForm` saves "Word Count"
    (`wordCount`) as the section's abstract word count;
    `SubmissionHandler::getDetailsForm()` passes it to the "Details"
    form as the word limit of the abstract's and the summary's boxes
    (`TitleAbstractForm`, lines 81 and 111). ui-library's
    `FieldRichTextarea` shows the "Error" icon beside the count once
    it is over the limit.
- Kind and Introduced: the plain language summary came to `main` with
  `pkp/pkp-lib#11540` (first PR `pkp/pkp-lib#11570`, 2025-08-13) with
  no word limit. The limit came with cf6117cfe4 and 6158ab4407,
  `git blame` on OJS lines 100–115 and OPS lines 98–113. These are the
  app halves of the issue's "Missing validations for PLS" pull requests
  `pkp/ojs#5067` and `pkp/ops#1086`. The pkp-lib half, `pkp/pkp-lib#11741`,
  added the shared `HasWordCountValidation` trait and its messages.
  GitHub shows the two app PRs closed, not merged: the commits reached
  `main` through a merge commit (OJS c075bba90e, 2025-09-11). The
  summary's limit has refused the wizard's save since it was added, and
  no release has the summary, so it never worked.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/ops and pkp/ui-library
  for "plain language summary" with "word", "wizard" and "too long";
  for `plainLanguageSummary` and `validateWordCount`; and for "wizard"
  with "unexpected error", "autosave" and "Reconnecting". Only
  `pkp/pkp-lib#11540` and its PRs came up. Its comments mention the
  word limit only to explain why OMP has none.
- MySQL not checked; the fault does not depend on the database.
