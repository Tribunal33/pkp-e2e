# In the submission wizard, a plain language summary over the word limit is refused with an unexplained "Error"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OPS
  - 3.5: none (no plain language summary setting)
  - 3.4: none (code; no plain language summary setting)
  - 3.3: none (code; no plain language summary setting)
- **Introduced** [cf6117cfe4](https://github.com/pkp/ojs/commit/cf6117cfe4daa01c53fd17d09226153c08b6713b) (OJS) and [6158ab4407](https://github.com/pkp/ops/commit/6158ab440790204cae78964b574880f834578d66) (OPS), the app side of `pkp/pkp-lib#11741`, for `pkp/pkp-lib#11540` · 2025-08-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In a section with an abstract word limit, an author whose plain language
summary runs over that limit cannot save the "Details" step. When they
press "Continue", the wizard opens an "Error" dialog that names no field
("An unexpected error has occurred. Please reload the page and try
again."). Every change on "Details" since its last save is lost, the
abstract included. The wizard's script then fails in the browser, and
the wizard stays on "Saving" until the page is reloaded.

The only hint is a small warning mark beside "Word Count: 20/10" under
the summary. An abstract over the same limit gets the same mark, but it
is saved, and "Review" says what to fix ("The abstract is too long…")
before "Submit" is allowed.

The limit applying to the summary is intended. The fault is that a save
of a submission still in progress is refused. Editing the summary after
submission is not affected: the editors' form refuses a long summary and
names the field.

## Impact

- **Lost**: every change on "Details" since its last save (title,
  keywords, abstract, summary). In a new submission that is the whole
  step.
- **Who**: authors on a journal or preprint server that has turned on
  the plain language summary (off by default), in a section with a word
  limit. The section's limit is set for the abstract and applies to the
  summary too, so a summary about as long as the abstract meets it.
- **Way round**: shorten the summary below the limit, reload as the
  dialog says, and type the step again. The author has to work out from
  the warning mark that the summary is the problem.

Medium: the author loses the step and is misled, but a reload and a
shorter summary get them through, and it needs a non-default setup. It
would be high if the summary were on by default.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS, OPS).
- As `dbarnes`: Settings › Workflow › "Submission" › "Metadata",
  "Plain Language Summary": tick "Enable plain language summary
  metadata", choose "Ask the author to provide a plain language summary
  during submission.", "Save".
- As `dbarnes`: Settings › Journal › "Sections" [OPS: Settings › Server ›
  "Sections"], the row "Articles" [OPS: "Preprints"], its arrow, "Edit",
  "Word Count" `10`, "Save". (The dataset's "Articles" holds 500 and
  "Preprints" none; 10 keeps the typing short.)

Summary over the limit:

1. Sign in as `ccorino`.
2. "Make a Submission": title "u21ir26 summary over the limit", section
   "Articles" (OJS), tick the requirements and privacy boxes, "Begin
   Submission".
3. "Upload Files": "Continue".
4. "Details": type "u21ir26 abstract of eight words within the limit."
   in "Abstract" and this 20-word text in "Plain Language Summary":
   "u21ir26 this plain language summary runs past the section word limit
   of ten words so the server refuses it today."
5. "Continue".
6. "OK" in the dialog. Without reloading, press "Continue" on
   "Contributors" and on "For the Editors" to reach "Review".

Abstract over the limit (control), as `ccorino`:

7. "Make a Submission" as in step 2, title "u21ir26 abstract over the
   limit"; "Upload Files": "Continue".
8. "Details": this 20-word text in "Abstract": "u21ir26 this abstract
   runs past the section word limit of ten words and the review check
   reports it to authors.", and "u21ir26 short summary." in "Plain
   Language Summary".
9. "Continue" on to "Review".

**Expected**: step 5 saves the step (the footer reads "Last saved …"),
as step 9 does for the abstract. On "Review", just above "Plain Language
Summary", reads "The plain language summary is too long. It should be
10 words or less. It is currently 20 words long.", and "Submit" stays
disabled until the summary is shortened.

**Observed**: in step 4, the summary's box reads "Word Count: 20/10"
with a warning mark, and the form shows no message. Step 5's save is
refused, the wizard still moves on to "Contributors", and the dialog
opens:

```
PUT /index.php/publicknowledge/api/v1/submissions/21/publications/22  → 400
{"plainLanguageSummary":{"en":["The plain language summary is too long. It should be 10 words or less. It is currently 20 words long."]}}

Error
An unexpected error has occurred. Please reload the page and try again.
```

The footer shows "Reconnecting". 4.2 seconds after the refusal the
browser logs the script error `Cannot read properties of undefined
(reading 'url')`, and from then on the footer reads "Saving". In step 6
the "Continue" presses still move the wizard on. On "Review",
"Checking your submission" never clears, "Abstract" and "Plain Language
Summary" read "None provided", and both "Save for Later" buttons and
"Submit" are disabled.

Control: step 9's save is answered 200. On "Review", just above
"Abstract", reads "The abstract is too long. It should be 10 words or
less. It is currently 20 words long.", and "Submit" is disabled.

## Cause

The limit on the summary is meant: `pkp/pkp-lib#11540` asked for it,
and `APP\submission\Repository::validateSubmit()` enforces it at
submission, beside the abstract's (OJS
`classes/submission/Repository.php` lines 71–96, OPS lines 50–75). Its
message is the one Expected quotes. What is wrong is that the same limit
also refuses the wizard's saves.

`APP\publication\Repository::validate()` in OJS
(`classes/publication/Repository.php`, lines 100–115) and in OPS (the
same method, lines 98–113) checks the summary's word count on every
save that sends it:

```php
if (isset($props['plainLanguageSummary'])) {
    // Check the word count on plain language summary
    $wordCountLimit = $section->getData('wordCount');
    if ($wordCountLimit) {
        $plainLanguageSummaryErrors = $this->validateWordCount(
```

The abstract's word count, a few lines above, sits inside
`if ($section && !$submission->getData('submissionProgress'))` (OJS line
66, OPS line 64), commented "Only validate section settings for
completed submissions". The summary's check was placed after that block
closes, so it also runs while the submission is in progress.

The wizard cannot show a refused save's field errors. ui-library
`SubmissionWizardPage.vue` `autosaveErrored()` handles any status but 0
and 500 by dropping the refused save from the browser's store and
calling `this.ajaxErrorCallback({})`. The response's errors are never
read. So the author sees the generic dialog, and the step's changes are
gone.

Reach:

- The wizard's "Details" save by "Continue" (on screen, OJS and OPS).
  The timer save sends the same form, so it is refused the same way
  (code).
- The hang after the refusal has its own report,
  [U21-A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A19-wizard-refused-save-hangs-saving.md).
  Fixing it stops the hang, but this refusal and its unexplained dialog
  remain.
- pkp-lib's check for a required summary, on the same save path, is a
  separate fault with its own report,
  [U21-A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md).
- Editors' "Title & Abstract" on a submitted submission: a long summary
  is refused with "Go to Plain Language Summary: The plain language
  summary is too long. …". That is right, and the fix keeps it (on
  screen, OJS submission 4, OPS submission 1).
- REST API clients editing a submission still in progress: refused when
  the summary is over the limit (code).
- A publication with no section: the check calls `getData()` on a null
  `$section`, outside the block's `$section &&` guard. No screen reaches
  this (code; unverified).
- Stored data: none is wrong. A refused save stores nothing.

## Proposed fix

A proposal, tried on `main`: move the summary's check inside the block
that already holds the abstract's, so on save it runs only once the
submission is submitted. The limit stays enforced at submission
(`validateSubmit()`) and on every later edit. OJS's diff is below; OPS
needs the same move, in
[`fix-ops.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-over-word-limit-refused/fix-ops.diff)
(its hunk starts at line 93).

[`fix-ojs.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-over-word-limit-refused/fix-ojs.diff):

```diff
--- a/classes/publication/Repository.php
+++ b/classes/publication/Repository.php
@@ -95,21 +95,21 @@
                     }
                 }
             }
-        }
 
-        if (isset($props['plainLanguageSummary'])) {
-            // Check the word count on plain language summary
-            $wordCountLimit = $section->getData('wordCount');
-            if ($wordCountLimit) {
-                $plainLanguageSummaryErrors = $this->validateWordCount(
-                    $context,
-                    $submission,
-                    $wordCountLimit,
-                    'publication.plainLanguageSummary.wordCountLong',
-                    $props['plainLanguageSummary'],
-                );
-                if (count($plainLanguageSummaryErrors)) {
-                    $errors['plainLanguageSummary'] = $plainLanguageSummaryErrors;
+            // Check the word count on the plain language summary
+            if (isset($props['plainLanguageSummary'])) {
+                $wordCountLimit = $section->getData('wordCount');
+                if ($wordCountLimit) {
+                    $plainLanguageSummaryErrors = $this->validateWordCount(
+                        $context,
+                        $submission,
+                        $wordCountLimit,
+                        'publication.plainLanguageSummary.wordCountLong',
+                        $props['plainLanguageSummary']
+                    );
+                    if (count($plainLanguageSummaryErrors)) {
+                        $errors['plainLanguageSummary'] = $plainLanguageSummaryErrors;
+                    }
                 }
             }
         }
```

With the fix in, the Steps show Expected on OJS and OPS: step 5 answers
200, no dialog opens and no script error is logged. On the editors'
"Title & Abstract" of a submitted submission, a 20-word summary and a
20-word abstract are each still refused with their field named, and both
short save, with the fix in and out. The move also puts the check behind
the block's `$section &&` guard.

**Alternatives**:

- Show the response's field errors in the wizard (in `autosaveErrored()`):
  the dialog would name the summary, but "Details" would still be refused
  whole, so the abstract and title typed with it would still be lost.
  The wizard reports problems on "Review" by design.
- Block "Continue" in the browser while the count is over: the abstract
  is not blocked that way, and the server would still refuse API
  clients.

**What goes with it**:

- API: an edit of an in-progress submission with a summary over the
  limit is accepted, as one with a long abstract already is.
  `PUT …/submit` still refuses it. No plugin hook changes.
- Guard: an e2e scenario in which an author's summary over the section's
  limit is saved on "Details" and reported on "Review". A unit test
  would be new scaffolding: neither app tests its publication
  Repository, and `validate()` needs a context, a section with a word
  limit and a submission in progress from the database.

Small: one block moved in one method of each app, and the e2e scenario.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-over-word-limit-refused/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-over-word-limit-refused/lib.js),
  on an install freshly loaded from PKP's default test dataset:
  `ONLY=ojs,ops PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/plain-summary-over-word-limit-refused/walk.js`.
  The fix was tried by applying the two diffs to the app checkouts and
  running the script again.
- Database: PostgreSQL. The word count is PHP's (`PKPString::getWordCount()`),
  so the database plays no part.
- Tips walked. main: OJS 4408b94def (pkp-lib f5bd392a69, ui-library
  64d67363), OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library 280f98c5).
  3.5: OJS 18d097d94e, OPS 3f0919468c (pkp-lib 1fb843f491, ui-library
  7a3c244b). pkp/datasets 27f1204 (2026-10-01).
- 3.5, walked: the "Metadata" tab of Settings › Workflow › "Submission"
  lists no plain language summary item on OJS or OPS, so the steps stop
  at the first precondition. `git grep plainLanguageSummary` finds
  nothing in those apps' `classes` or in pkp-lib 1fb843f491.
- 3.4 and 3.3 (code): `git grep plainLanguageSummary` finds nothing in
  OJS `upstream/stable-3_4_0` 9571d8fde7 and `stable-3_3_0` 9fdb9bcf9a,
  OPS acd8ae704b and c5532e2161, or pkp-lib `origin/stable-3_4_0`
  df13621c2d and `stable-3_3_0` d446601ebe.
- OMP (code, `main` 3b0ecf794): no word-count check in its publication
  or submission Repository, and no word limit on the series form.
- Introduced: `git log -S plainLanguageSummary` on both apps'
  `classes/publication/Repository.php` and
  `classes/submission/Repository.php` gives cf6117cfe4 (OJS) and
  6158ab4407 (OPS) alone. Before them neither file checked the summary.
  The change was reviewed as `pkp/ojs#5067` and `pkp/ops#1086`, which
  were closed unmerged on 2025-09-12, when `pkp/pkp-lib#11741` was
  merged; the same change reached `main` as those two commits.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library issues and PRs for "plain language summary" with
  "word" and "limit", "plain language" wizard error, `wordCountLong`,
  `validateWordCount`. Only `pkp/pkp-lib#11540`, `pkp/pkp-lib#11711`
  (release notes) and `pkp/pkp-lib#11741` came up; none reports this
  refusal.
- Not driven: the timer save, and the reload after the hang.
