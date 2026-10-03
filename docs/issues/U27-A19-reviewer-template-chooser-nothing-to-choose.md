# "Add Reviewer" shows a message chooser with one option, "Review Request", on every add

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#8407` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) · 2022-11-03 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a19)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When an editor picks a reviewer in the "Add Reviewer" window, the
request form shows "Choose a predefined message to use, or fill out
the form below." over a drop-down whose only option is "Review
Request". The chooser is meant for journals and presses that have
written their own versions of the review request email (a manager adds
them as extra templates of the "Review Request" email, under Settings ›
Workflow › Emails). Without such templates, the default, it should not
appear, yet it does on every add.

Nothing is lost: the letter is filled from "Review Request" and sent as
usual. Where templates have been added, the chooser lists them and
works. The other two ways to add a reviewer, "Create New Reviewer" and
"Enroll Existing User", show no chooser in this case.

## Impact

- **Lost**: nothing.
- **Who**: every editor adding a reviewer through the reviewer search,
  on every journal and press that has added no request templates.
- **Way round**: none needed; the drop-down can be ignored.

Low: a control with nothing to choose on a common screen, while every
add sends the right request.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Its "Review Request" email has no added templates. Nothing else is
  needed.

1. Sign in as `dbarnes`.
2. Open submission 12, "Sodium butyrate improves growth performance of
   weaned piglets during the first period after weaning" (Review,
   round 1).
3. Under "Reviewers", press "Add Reviewer".
4. In "Locate a Reviewer", type "McCrae", press Enter, and press
   "Select Reviewer" on "Aisla McCrae".
5. Read the form under "Selected Reviewer".

[On a press: the same as `dbarnes` on submission 9, "Enabling
Openness: The future of the information society in Latin America and
the Caribbean" (Internal Review, round 1).]

**Expected:** no message chooser, since no request templates have been
added; the letter under "Email to be sent to reviewer" holds the
"Review Request" text.

**Observed:** the chooser, with "Review Request" as its only option
(selected), above the letter, which holds the "Review Request" text.

With a template added to "Review Request" (Settings › Workflow › Emails
› "Add and edit templates" › "Review Request" › "Add Template"), the
chooser lists "Review Request" and the added template, as it should.

## Cause

`ReviewerForm::fetch()`
(`lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php`)
draws the chooser when the form's template list holds more than one
entry (`'hasCustomTemplates' => (count($templates) > 1)`). The base
form lists "Review Request" and its added templates, so the test means
"templates have been added". But the reviewer search's form,
`AdvancedSearchReviewerForm::getEmailTemplates()`, also lists "Review
Request Subsequent": which of the two defaults fits is known only once
the editor picks a reviewer. The window's script
(`AdvancedReviewerSearchHandler.js`, `handleReviewerAssign_()`) then
takes "Review Request Subsequent" for a reviewer who completed, or was
thanked for, a review in the round just before, and "Review Request"
for anyone else, fills the letter from it and removes the other
default from the drop-down. With two defaults in the list the test
always passes, and after the removal one option is left.

The test took this shape in 1a7fbb216f (`pkp/pkp-lib#8407`, for
`pkp/pkp-lib#5716`, the "Manage Emails" rework, 2022). Until then the
base form set `hasCustomTemplates` while it built its own list, so
"Review Request Subsequent", which the reviewer search appends
afterwards, was never counted. The rework moved the count to after the
append.

Reach:

- The reviewer search's form on OJS and OMP, every round (walked on
  round 1).
- "Create New Reviewer" and "Enroll Existing User" use the base list
  and draw no chooser when no templates are added (code).
- OPS: no review stage.

## Proposed fix

Leave the two default request templates out of the test
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/fix.diff)):

```diff
         $templates = $this->getEmailTemplates();
 
+        // The default request templates are no choice: the reviewer search offers both
+        // and keeps the one that fits the chosen reviewer. Show the chooser only when
+        // templates have been added to choose from.
+        $addedTemplates = array_diff_key($templates, array_flip([
+            ReviewRequest::getEmailTemplateKey(),
+            ReviewRequestSubsequent::getEmailTemplateKey(),
+        ]));
+
         $templateMgr->assign([
-            'hasCustomTemplates' => (count($templates) > 1),
+            'hasCustomTemplates' => !empty($addedTemplates),
```

(with `use PKP\mail\mailables\ReviewRequestSubsequent;`). Without the
chooser the form posts its hidden `template` field, and the window's
script already sets that field to the default it picked
(`$templateInput.val(templateKey)`), so a reviewer of the round just
before still gets "Review Request Subsequent". Tried on `main`, OJS and
OMP: no chooser, and the "Review Request" letter; with a template
added, the chooser lists "Review Request" and the added template.

**Alternatives**

- Hide the drop-down in the window's script when one option is left
  after the removal: it works, but leaves the server's test meaning
  something other than its name.
- Let each form name its own default templates (a method the reviewer
  search overrides): cleaner if more defaults appear, more code for
  two known keys today.

**What goes with it**

- No data to repair; no API or hook changes.
- Backport: `stable-3_5_0` and `stable-3_4_0` carry the same test, list
  and script; the diff applies to both.
- Guard: a step in the U27 e2e spec's add scenario that reads no
  chooser on a default install, and the chooser with an added template.

Small: one condition in one shared form class.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/lib.js),
  run on an install loaded from the default dataset (pkp/datasets
  e8dafbc, 2026-10-02; PostgreSQL):
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/walk.js`
  (`K6_MODE=nb` first adds the template "Short request u27k6").
- Walked on `main` and `stable-3_5_0`, OJS and OMP. The dataset's
  `email_templates` table holds no row for either request email.
- Fix trial on `main`, OJS and OMP: the Steps and the added-template
  check. The added-template check without the fix was taken on
  `stable-3_5_0`, whose form, test and script are the same as
  `main`'s: the walk on `main` failed while adding the template, in the
  test tool, before the form was read.
- Not walked: an add in a second round (the script's choice of "Review
  Request Subsequent" was read in the code only).
- Branch tips. `main`: OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794 (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246 (lib/pkp cf3f984335).
  `stable-3_4_0`: lib/pkp 767353f4fe. `stable-3_3_0`: lib/pkp
  ac3fa73402.
- Code read on 3.3: `ReviewerForm.inc.php` lists one default per round
  (`_getMailTemplateKey()`) plus custom templates, and
  `reviewerFormFooter.tpl` draws the chooser only when the list holds
  more than one.
- Introduced: blame on the test gives 1a7fbb216f; its parent,
  3873de4a00, set `hasCustomTemplates` inside the base form's
  `getEmailTemplateKeys()`.
