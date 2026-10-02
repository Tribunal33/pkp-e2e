# Requiring a plain language summary blocks editors' Publication saves, journal publishing and authors' wizard saves

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no plain language summary setting)
  - 3.4: none (code; no plain language summary setting)
  - 3.3: none (code; no plain language summary setting)
- **Introduced** `pkp/pkp-lib#11741` for `pkp/pkp-lib#11540` · [0b283f407b](https://github.com/pkp/pkp-lib/commit/0b283f407bd9e10bd6ccd4059a97edc6062be2fa) · 2025-09-12 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U21 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a20), spec U40 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a1), spec U49 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ojs1)
- **Checked** 2026-10-01 (journal publishing again 2026-10-02), each branch's tip (the commits in Evidence)

## Summary

When a journal, press or preprint server sets the plain language
summary to "Require", the server refuses every save made from a form
that has no summary field, even when the submission already holds a
summary. Editors cannot save the Metadata, Permissions & Disclosure,
Data or Identifiers pages, or the issue, catalog or preprint entry
page; only "Title & Abstract" saves. The refusal names a raw field,
"plainLanguageSummary", which is not on the page.

A journal cannot schedule or publish any article, even one that holds
a summary, while a press and a preprint server still publish. The
publishing panel's "Confirm" names nothing: a passing notice counts
"1 error(s)", and a second, blank copy of the panel opens over the
first.

In the submission wizard, the title typed on the start page is lost
without any message. Three more saves are refused, each with an
"Error" dialog that leaves the wizard stuck on "Saving" until the page
is reloaded, and the refused text is lost:

- the "Details" step saved while the summary is still empty;
- the "References" box, whenever it is saved;
- on a preprint server, the "Relation status" answer.

An author who types the title again, the abstract and the summary on
"Details" before its first save, and leaves "References" empty, can
still submit, but without references and, on a preprint server,
without a relation status.

## Impact

- **Lost:** the author's start-page title, silently; their references
  and (preprint server) relation status, after a dialog that does not
  say why. The editor's changes on the Publication pages above. A
  journal's publishing.
- **Who:** every author and editor on a journal, press or server whose
  manager chose "Require the author to provide a plain language
  summary…" (Settings › Workflow › Submission › Metadata), on every
  submission, every time.
- **Way round:** authors can submit as above, without references.
  Editors have none in the workflow: saving a summary on "Title &
  Abstract" first does not unblock the other pages or publishing.
  Setting the summary back to "Ask" makes every save work again, but
  drops the requirement the journal chose.

High: a journal cannot publish, with no way round short of dropping
the requirement, in an ordinary setup that is not the default. It
would be critical if the setting were the default.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS, OMP, OPS).

Setting:

1. Sign in as `dbarnes`.
2. Settings › Workflow › "Submission" › "Metadata": tick "Enable plain
   language summary metadata", choose "Require the author to provide a
   plain language summary before accepting their submission.", "Save".

Publication pages (as `dbarnes`):

3. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" [OMP: 3, "The
   Political Economy of Workplace Injury in Canada"; OPS: 1, "The
   influence of lactation on the quantity and quality of cashmere
   production"].
4. Publication › "Metadata": change nothing, press "Save".
5. "Title & Abstract": type a summary into "Plain Language Summary",
   "Save".
6. "Metadata", "Save" again.
7. "Permissions & Disclosure", "Save".

Publishing (OJS, as `dbarnes`):

8. Open submission 5, "Genetic transformation of forest trees"
   (Production), "Title & Abstract", "Schedule For Publication".
9. In "Review Publishing Details": "Version of Record (VoR)", "Major
   Revision", "Assign To Current/Back Issue", "Vol. 1 No. 2 (2014)",
   "Confirm".
10. "Cancel" the panel; "Title & Abstract": type a summary into "Plain
    Language Summary", "Save"; "Schedule For Publication" again, the
    same choices as in step 9, "Confirm".

Submission wizard (as the author `ccorino` [OMP: `aclark`]):

11. "New Submission": type the title "u21ir24 wizard submission", tick
    the checklist and privacy boxes, "Begin Submission".
12. "Upload Files": add a file (OJS "Article Text", OMP "Book
    Manuscript", OPS "Add File" with the label "PDF" and "Preprint
    Text"), "Continue".
13. "Details": leave "Plain Language Summary" empty, type an abstract
    [OMP: no abstract], "Continue".
14. Reload the page. "Continue" on to "Review" [OPS: on "For Readers",
    answer "Relation status" with "This preprint has not been published
    elsewhere."].
15. Reload the page, back to "Details": type a summary into "Plain
    Language Summary" and two lines into "References", "Continue".
16. OPS only: reload; "For Readers": "This preprint has not been
    published elsewhere.", "Continue".
17. Reload; read "Details" (and on OPS "For Readers") back.

Getting the submission in (as the same author, a new submission):

18. "New Submission": the title, the boxes, "Begin Submission"; add a
    file as in step 12, "Continue".
19. "Details": type the title again, an abstract [OMP: none] and a
    summary, leave "References" empty, "Continue".
20. "Continue" on to "Review" [OPS: answer "Relation status" as in step
    14, then reload the page], "Submit", and "Submit" in the
    confirmation.

**Expected:** every save shows "Saved" or moves the wizard on. The
summary is required only where it is typed ("Title & Abstract", the
wizard's "Details"), and in the wizard its absence blocks "Submit".
Steps 9 and 10 open "Are you sure you want to publish this?".

**Observed:**

- Steps 4, 6 and 7 are refused on all three apps, before and after the
  summary is stored in step 5 (which saves):

  ```
  Please correct one error. Go to plainLanguageSummary: This field is required. Jump to next error
  ```

  ```
  PUT /index.php/publicknowledge/api/v1/submissions/4/publications/5
  400 {"plainLanguageSummary":{"en":["This field is required."]}}
  ```

- Step 9 is refused with the same answer. A second "Review Publishing
  Details" panel opens over the first, its "Publication Stage" and
  "Revision Significance" empty; nothing in either panel is marked, and
  a passing notice reads "The form was not saved because 1 error(s)
  were encountered. Please correct these errors and try again." One
  "Cancel" closes both.
- Step 10: the summary saves ("Saved"); the second "Confirm" is refused
  exactly as in step 9.
- Step 11: the start page's title save answers the same 400. The wizard
  opens with "21 / Corino" in its header, and "Review" later shows
  "Title: None provided" with "This field is required."
- Step 13: the step's save answers the same 400. The wizard moves on to
  "Contributors", opens "Error: An unexpected error has occurred.
  Please reload the page and try again.", and its footer goes from
  "Reconnecting" to "Saving" for good, with the page script error
  `Cannot read properties of undefined (reading 'url')` (that hang
  follows any refused wizard save, and is reported apart).
- Step 14 (OJS, OMP): "Review" lists the title, the abstract and "Plain
  Language Summary" as "This field is required.", and "Submit" is
  disabled. On OPS the "Relation status" save answers the same 400 with
  the same dialog and hang, and "Review" stays on "Checking your
  submission".
- Step 15: the summary's save answers 200, the references' save the
  same 400, with the same dialog and hang. Step 16 (OPS): the same 400
  as in step 14.
- Step 17: the summary is kept; "References" is empty, and on OPS no
  relation status is chosen.
- Steps 18–20: the start page's title is refused again; the "Details"
  save answers 200 and the next steps save (OPS: the relation answer is
  refused as in step 14, and after the reload "Review" shows no
  problem). "Submit" is enabled and "Submission complete" shows.

## Cause

`PKP\publication\Repository::validate()` (pkp-lib
`classes/publication/Repository.php`, lines 229–236) adds this rule:

```php
// validate the requirement of Plain language summary
$validator->after(function ($validator) use ($props, $context, $primaryLocale) {
    if ($context->getData('plainLanguageSummary') === Context::METADATA_REQUIRE) {
        if (empty($props['plainLanguageSummary']) || !isset($props['plainLanguageSummary'][$primaryLocale])) {
            $validator->errors()->add('plainLanguageSummary.' . $primaryLocale, __('validator.required'));
        }
    }
});
```

`$props` is the request body of one save. The rule asks every save to
include the summary, so it refuses any form that does not hold the
field, whatever the publication already holds. That is unlike how
`validate()` treats every other required property: on an edit,
`ValidatorFactory::required()` refuses a property only when the save
sends it empty, and the title rule a few lines above falls back to the
stored value and is skipped while the submission is in progress.

The rule came in with `pkp/pkp-lib#11741` ("Missing validations for
PLS"). It followed a QA note on `pkp/pkp-lib#11540` that a required
summary did not block a submission or an empty summary on "Title &
Abstract". The same PR added the check that does block submitting,
`Submission\Repository::validateSubmit()`, which reads the stored
summary.

Reach: `validate()` runs on every publication write through
`PKPSubmissionController::editPublication()`, `changeVersion()` and
`addPublication()`.

- Publication pages (`editPublication`): Metadata and Permissions &
  Disclosure on all three apps (on screen); Data, Identifiers, the
  issue entry (OJS), Catalog Entry (OMP) and the preprint entry (OPS)
  send forms without the summary too (code). Only "Title & Abstract"
  sends it. Contributors and Galleys save through their own endpoints
  and are not touched (code).
- OJS publishing: the "Review Publishing Details" panel saves the issue
  and status through `editPublication` before publishing, so a stored
  summary does not help (on screen). The refusal is then shown on no
  field, since the panel has no summary field and is built with
  `showErrorFooter: false`; and `useWorkflowVersionForm()` (ui-library
  `src/pages/workflow/composables/useWorkflowVersionForm.js`) calls the
  panel's `onSubmitFn` whether or not the save succeeded, which reopens
  the panel, blank, while the version still has no stage (on screen;
  the reopening is a fault of its own, which any refused save of that
  panel would show). OMP and OPS publish through `…/publish`, which does
  not call `validate()` (code).
- The submission wizard (`editPublication`): the start page's title,
  the "Details" step without the summary, the "References" box, and the
  OPS "Relation status" (on screen, the three apps; OPS for the last).
  When a journal asks for extra metadata on "For the Editors" (such as
  coverage), that step's form saves without the summary and is refused
  too (code).
- The version form (`changeVersion`, `PUT …/publications/{id}/version`):
  its request carries only the version fields, so choosing a version
  stage there is refused (code). "Create New Version" uses
  `versionPublication()`, which does not validate, and works (on
  screen, OJS).
- REST API clients and plugins editing a publication: refused unless
  they send the summary (code).
- Stored data: none is wrong. A refused save stores nothing.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/fix.diff)
applied to OJS, OMP and OPS. With it, the Steps show Expected: steps 4,
6, 7 and 9 save (and step 9 publishes: "Status: Published"), and every
wizard save in steps 11 to 16 answers 200, with the title and
references read back. The requirement still holds: "Review" lists
"Plain Language Summary" as required with "Submit" disabled, and
"Title & Abstract" with the summary emptied is refused ("Go to Plain Language Summary: This field
is required.") with the fix in and out. The guard added to
`ValidatorFactory::required()` (the second hunk) is read in the code
only: no screen creates a publication through `addPublication()`.

Recommended: treat the required summary as a required property in
`validate()`, through `ValidatorFactory::required()`, once the
submission has been submitted, and drop the closure.

```diff
--- a/lib/pkp/classes/publication/Repository.php
+++ b/lib/pkp/classes/publication/Repository.php
@@ -160,10 +160,20 @@
             $this->getErrorMessageOverrides(),
         );
 
+        $requiredProps = $this->schemaService->getRequiredProps($this->dao->schema);
+
+        // A plain language summary the context requires is required like the schema's
+        // required props once the submission has been submitted: an edit is refused when
+        // it empties the summary, not when it leaves the summary out. While the submission
+        // is in progress, Submission\Repository::validateSubmit() requires it at submission.
+        if ($context->getData('plainLanguageSummary') === Context::METADATA_REQUIRE && !$submission->getData('submissionProgress')) {
+            $requiredProps[] = 'plainLanguageSummary';
+        }
+
         ValidatorFactory::required(
             $validator,
             $publication,
-            $this->schemaService->getRequiredProps($this->dao->schema),
+            $requiredProps,
             $this->schemaService->getMultilingualProps($this->dao->schema),
             $allowedLocales,
             $primaryLocale
@@ -225,15 +235,6 @@
                 }
             });
         }
-
-        // validate the requirement of Plain language summary
-        $validator->after(function ($validator) use ($props, $context, $primaryLocale) {
-            if ($context->getData('plainLanguageSummary') === Context::METADATA_REQUIRE) {
-                if (empty($props['plainLanguageSummary']) || !isset($props['plainLanguageSummary'][$primaryLocale])) {
-                    $validator->errors()->add('plainLanguageSummary.' . $primaryLocale, __('validator.required'));
-                }
-            }
-        });
 
         // If a new file has been uploaded, check that the temporary file exists and
         // the current user owns it
--- a/lib/pkp/classes/validation/ValidatorFactory.php
+++ b/lib/pkp/classes/validation/ValidatorFactory.php
@@ -198,7 +198,7 @@
                 // required in the primary locale
                 if (in_array($requiredProp, $multilingualProps)) {
                     if (is_null($object)) {
-                        if (self::isEmpty($props[$requiredProp]) || self::isEmpty($props[$requiredProp][$primaryLocale])) {
+                        if (self::isEmpty($props[$requiredProp] ?? null) || self::isEmpty($props[$requiredProp][$primaryLocale] ?? null)) {
                             $validator->errors()->add($requiredProp . '.' . $primaryLocale, __('validator.required'));
                         }
                     } else {
```

The rule lives in the shared repository, so one change covers every
page, the wizard, the three apps and API clients. It reuses the
mechanism the schema's required properties already go through. The
`submissionProgress` gate is the one the title rule uses. While the
submission is in progress, the summary check that `pkp/pkp-lib#11741`
added to `validateSubmit()` keeps the requirement, as that method does
for the other "Require the author…" items through
`Context::getRequiredMetadata()`.

The second hunk is needed because the summary becomes the first
multilingual required property of a publication (the schema requires
only `submissionId` and `version`). On a new object,
`ValidatorFactory::required()` reads `$props[$requiredProp]` without a
default, so an `addPublication()` on a submitted submission that leaves
out the summary would raise PHP's "Undefined array key" warning before
adding the "This field is required." error. With `?? null` it adds the
error alone, for every caller of `required()`.

**Alternatives:**

- Fall back to the stored summary, as the title rule does
  (`$props[…] ?? $publication->getData(…)`): every older publication
  without a summary would still refuse every save until someone writes
  one, and the wizard would still refuse its saves before the summary
  is typed.
- Delete the closure and rely on `validateSubmit()` alone, as for
  keywords and the other required items: simpler, but an API client
  could then empty the summary of a submitted publication, which the
  PR set out to refuse.
- Make every form send the summary: it touches many forms in three
  apps and still refuses API clients.

**What goes with it:**

- API: a publication write without the summary is accepted again. One
  that empties it on a submitted submission is still refused (400). With
  more than one submission language the message becomes "You must
  complete this field in {language}.", as for other required fields.
  The `Publication::validate` hook is unchanged.
- Publishing: `validatePublish()` does not check the summary. With the
  fix, a submitted publication without one (from before the setting
  was turned on) can be scheduled and published on a journal, as a
  press and a preprint server can today. That matches the setting's
  wording ("…before accepting their submission"). Requiring a summary
  at publishing too would be a product decision and a check in
  `validatePublish()`; the fix does not need it.
- The panel's reopening after a refused "Confirm" (Cause) is not
  covered: with the fix this refusal no longer reaches it, but the
  ui-library call stays for any other refusal of that panel.
- Guard: a unit test of `Repo::publication()->validate()` in pkp-lib
  (beside `tests/classes/publication/PublicationTest.php`) with the
  context at "require": an edit without the summary passes, an edit
  emptying it fails, a submission in progress passes. In pkp-e2e, a
  Planned scenario in Publication metadata and Submission wizard for a
  journal that requires the summary.

Small: a few lines in one method, using the mechanism the method
already has, and a unit test.

## Evidence

- Kept script that takes the Steps on the three apps, on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 27f1204,
  2026-10-01, the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/lib.js),
  run with `PROBE_FEATURE=issues-ir24 PROBE_AGENT=ir24 node bin/probe.js all shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/walk.js`
  (steps 18–20 with `WALK_GROUPS=submit` in front). Steps 11 and 18
  open the start page by its address
  (`/index.php/publicknowledge/submission`).
- The fix was tried by applying `fix.diff` to the three checkouts and
  taking steps 1–9 and 11–17 again (the second hunk was added
  afterwards, from the code).
- Journal publishing (steps 1, 2 and 8–10, OJS), walked again
  2026-10-02 on a fresh load of pkp/datasets e8dafbc (2026-10-02) at
  OJS b84f8e2e44, pkp-lib ddd8ab243a, ui-library 64d67363 (3.5: OJS
  091fb65453, pkp-lib cf3f984335, ui-library d4e0188353):
  [`shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/publish-confirm.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/publish-confirm.js),
  run with `PROBE_FEATURE=issues-v4 PROBE_AGENT=v4 node bin/probe.js ojs shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/publish-confirm.js`
  (`WALK_MODE=neighbour` for the emptied-summary check). In step 10 the
  script opens the workflow again before typing the summary, because
  its editor did not take input after the panels closed although the
  page showed the box. The two stacked panels are counted by their
  "Review Publishing Details" headings. With `fix.diff` applied to OJS
  the first "Confirm" opened "Are you sure you want to publish this?"
  and "Publish" ended on "Status: Published"; "Title & Abstract" with
  the summary emptied was refused on the page with the fix in and out.
  3.5, walked: the "Metadata" tab offers no plain language summary item.
- Branch tips. main: OJS 4408b94def, its pkp-lib f5bd392a69 and
  ui-library 64d673631; OMP 3b0ecf794c and OPS c8af945bb7, both with
  pkp-lib 3dc90c81a6 and ui-library 280f98c57 (`Repository.php` is
  identical in the two pkp-lib commits). 3.5: OJS 18d097d94e, OMP
  b24879c3db, OPS 3f0919468c, pkp-lib 1fb843f491, ui-library 7a3c244b8.
  3.4: OJS 9571d8fde7, OMP 0aec65441f, OPS acd8ae704b, pkp-lib
  df13621c2d. 3.3: OJS 9fdb9bcf9a, OMP 8e72fc8836, OPS c5532e2161,
  pkp-lib d446601ebe. Walks ran on PostgreSQL.
- 3.5, walked: step 2's "Metadata" tab lists no plain language summary
  item on any app, so the later steps cannot be taken; neither the
  app nor its pkp-lib mentions `plainLanguageSummary`. 3.4 and 3.3
  (code): `git grep plainLanguageSummary` finds nothing in the apps'
  `upstream/stable-3_4_0` / `stable-3_3_0` or in pkp-lib's
  `origin/stable-3_4_0` / `stable-3_3_0`. The setting came with
  `pkp/pkp-lib#11570` (2025-08-13), on main only.
- Introduced: `git blame` on lines 229–236 and `git log -L` give
  0b283f407b alone; GitHub names its PR, `pkp/pkp-lib#11741`, by
  touhidurabir. Kind: between `pkp/pkp-lib#11570` and that commit,
  `validate()` had no summary rule, so these saves were not refused
  (code; not walked on that older code).
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library for "plain language summary", "plain language"
  required, "lay summary", `plainLanguageSummary`, "Go to
  plainLanguageSummary" and the PRs of `pkp/pkp-lib#11540`. Only the
  feature's own issue and PRs (`pkp/pkp-lib#11540`, `#11570`, `#11741`,
  `#12674`) and unrelated issues came up; none reports this refusal.
  Again 2026-10-02 for journal publishing: "plain language summary"
  with publish and with schedule, "Review Publishing Details" (pkp-lib,
  ui-library), `onSubmitFn` (ui-library); only `pkp/pkp-lib#12409`
  (the panel shown again for an already staged version) came up, a
  different fault.
- Not driven: Data, Identifiers and the issue, catalog and preprint
  entry pages; the version form's `changeVersion`; OMP and OPS
  publishing; a journal asking for "Coverage" on "For the Editors".
  These are read in the code (Cause).
- Unverified: the OPS "Relation status" read back as unchosen after a
  reload even when its save answered 200 with the fix, which is a
  separate known fault of that step (Preprint relations A10); the
  fix's effect there rests on the 200.
