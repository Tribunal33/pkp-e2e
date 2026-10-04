# The help under "For Reviewer Suggestion" in Author Guidance asks about contributors, not suggested reviewers

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; feature absent)
  - 3.3: none (code; feature absent)
- **Introduced** `pkp/pkp-lib#10497` for `pkp/pkp-lib#4787` · [08d4cf9c89](https://github.com/pkp/pkp-lib/commit/08d4cf9c89dbf559f3a3becb5af86f13d48fb849) · 2025-02-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

In Settings › Workflow › "Submission" › "Author Guidance", the help
under "For Reviewer Suggestion" reads "The following is shown to authors
during the reviewer suggestions step. Provide a brief explanation of
what information the author should provide about themselves, co-authors,
and any other contributors." The second sentence is copied from the
"Contributors" box. A manager expects guidance about suggesting
reviewers.

A manager who follows the help may write guidance about contributors
into the box. Authors then read that guidance on the submission form's
"Reviewer Suggestions" step, where they are asked to suggest reviewers.

## Impact

- **Lost**: no data. Authors who suggest reviewers can be given the
  wrong guidance, if a manager wrote what the help asks for.
- **Who**: managers of a journal or press who edit "Author Guidance".
  The box is on that form whatever the review settings say. Authors read
  its text only when "Reviewer Suggestion at Submission" (Settings ›
  Workflow › "Review" › "Setup") is on. The French and Spanish help
  repeat the copied sentence; the German help asks about the suggested
  reviewers.
- **Way round**: the box comes filled with a default text that says
  what it is for ("When submitting, you have the option to suggest
  several potential reviewers. …"), on a new journal and on one upgraded
  to 3.5 alike. Once a manager has replaced that text, nothing on the
  form says what the box is for.

Low: only the help is wrong, and the box's default text shows its
purpose until a manager replaces it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`,
  "Journal of Public Knowledge"); the same on OMP `main` (press
  `publicknowledge`). Nothing to create.

Steps:

1. Sign in as `rvaca` (Journal manager; Press manager on OMP).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`).
3. On the "Submission" tab, select the side tab "Author Guidance".
4. Read the help under the "Contributors" box.
5. Scroll to the last box on the form, "For Reviewer Suggestion" (after
   "Copyright Notice"), and read its help and its own text.

**Expected**: the help under "For Reviewer Suggestion" says what to
write for authors who suggest reviewers (whom to suggest, what to give
about each one), in line with the box's own text.

**Observed**: the help under "For Reviewer Suggestion" reads

```
The following is shown to authors during the reviewer suggestions step. Provide a brief explanation of what information the author should provide about themselves, co-authors, and any other contributors.
```

and the help under "Contributors" (step 4) reads

```
The following is shown to authors during the contributors step. Provide a brief explanation of what information the author should provide about themselves, co-authors, and any other contributors.
```

The box itself holds "When submitting, you have the option to suggest
several potential reviewers. This can help streamline the review process
and provide valueable input for the editorial team. Please choose
reviewers who are expert in your field and have no conflict of interest
with your work. …"

## Cause

The help is the locale string
`manager.setup.workflow.reviewerSuggestionsHelp.description` in
`lib/pkp/locale/en/manager.po` (line 1410 on `main`), which
`SubmissionGuidanceSettings::addReviewSuggestionGuidanceDetail()` sets as
the description of the `reviewerSuggestionsHelp` field. Its second
sentence is the second sentence of
`manager.setup.workflow.contributorsHelp.description`, three lines
above, word for word. The string was modelled on the "Contributors"
help, and only its first sentence was changed to name the step.

The box's default text is `default.submission.step.reviewerSuggestions`
(`lib/pkp/locale/en/default.po`). The context schema's
`defaultLocaleKey` writes it into a new context, and the 3.5 upgrade
(`I4787_AddReviewSuggestionHelp`) writes it into every existing context
in each of its languages. `PKPSubmissionHandler::getReviewerSuggestionsStep()`
shows the stored text as the step's description, and the step is added
only when `reviewerSuggestionEnabled` is on.

Reach:

- The form adds the box only when the context schema has
  `reviewerSuggestionEnabled`: OJS and OMP have it, OPS does not, so a
  preprint server has no such box (checked on screen).
- The nine other boxes on "Author Guidance" ("Author Guidelines",
  "Before you begin", "Submission Checklist", "Upload Files",
  "Contributors", "Details", "For the Editors", "Review and Submit",
  "Copyright Notice") keep their own helps. None of the six other step
  helps (`beginSubmissionHelp`, `uploadFilesHelp`, `contributorsHelp`,
  `detailsHelp`, `forTheEditorsHelp`, `reviewHelp`) repeats another, and
  no other help string in pkp-lib's or the apps' English locale files
  does either (checked in the code).
- Translations: 30 locales in `lib/pkp/locale/*/manager.po` translate
  the string. `fr_CA` (seen on screen) and `es` repeat the contributors
  sentence; `de` asks what authors should give about the suggested
  reviewers (read in the code). The others were not read.

## Proposed fix

Rewrite the English string so its second sentence is about suggesting
reviewers, in the shape of the sibling helps (the "Details" and "For the
Editors" helps name what the step asks of the author)
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-help-describes-contributors/fix.diff);
its paths start at the app root, so `git apply -p3` in a pkp-lib clone):

```diff
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
@@ -1407,7 +1407,7 @@
 msgstr "The following is shown to authors during the contributors step. Provide a brief explanation of what information the author should provide about themselves, co-authors, and any other contributors."
 
 msgid "manager.setup.workflow.reviewerSuggestionsHelp.description"
-msgstr "The following is shown to authors during the reviewer suggestions step. Provide a brief explanation of what information the author should provide about themselves, co-authors, and any other contributors."
+msgstr "The following is shown to authors during the reviewer suggestions step, when they are invited to suggest potential reviewers. Provide a brief explanation of who would make a suitable reviewer and what information the author should provide about each one."
 
 msgid "manager.setup.workflow.detailsHelp.description"
 msgstr "The following is shown to authors during the details step, when they are asked to provide the title, abstract, and other key information about their submission."
```

The wording is a proposal; any sentence that tells the manager to
explain whom to suggest and what to give about each reviewer will do.

Tried on `main`, applied to all three apps: on OJS and OMP the steps
then show the new help under "For Reviewer Suggestion". The other boxes'
English helps and the French "For Reviewer Suggestion" and "Contributors"
helps read the same with the fix in and out.

**Alternatives**:

- Drop the second sentence, leaving only "The following is shown to
  authors during the reviewer suggestions step.": correct, but less
  helpful than its siblings.

**What goes with it**:

- The key stays the same, so no template, API, plugin or stored data is
  touched.
- `fr_CA`, `es` and any other translation that copied the sentence need
  the same correction from the translators.
- 3.5: the diff applies as written to `stable-3_5_0` (10 lines higher).
- Guard: an e2e check that each help on "Author Guidance" names its
  own step and repeats no other help (a **Planned** item in spec U58).

Small: one English string in pkp-lib.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-help-describes-contributors/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-help-describes-contributors/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/reviewer-suggestion-help-describes-contributors/walk.js`.
  With `WALK_MODE=nb` it reads every other box's label and help in
  English and the French "For Reviewer Suggestion" and "Contributors"
  helps, which were compared with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). No request
  failed and no page script failed.
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04), `stable-3_5_0`
  c1cee76b95 (`lib/pkp` 771474347e); OMP `main` 3b0ecf794 (`lib/pkp`
  3dc90c81a6), `stable-3_5_0` 9c5e24246 (`lib/pkp` cf3f984335); OPS
  `main` c8af945bb7 (`lib/pkp` 3dc90c81a6), `stable-3_5_0` 38b61882d3
  (`lib/pkp` cf3f984335).
- 3.4 and 3.3, read in the code: no `reviewerSuggestion` setting in the
  apps' `schemas/context.json` nor anywhere in pkp-lib's classes,
  schemas and English locale on `stable-3_4_0` and `stable-3_3_0`, so
  neither has reviewer suggestions.
- Not driven: 3.4 and 3.3; the submission form's "Reviewer Suggestions"
  step (its text is the box's, read in the code); an upgrade to 3.5
  (the migration read in the code).
