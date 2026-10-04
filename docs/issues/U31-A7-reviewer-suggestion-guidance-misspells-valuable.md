# The default reviewer-suggestion guidance authors read on submission misspells "valuable" as "valueable"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code; no reviewer suggestions)
- **Introduced** `pkp/pkp-lib#10497` for `pkp/pkp-lib#4787` · [08d4cf9c89](https://github.com/pkp/pkp-lib/commit/08d4cf9c89dbf559f3a3becb5af86f13d48fb849) · 2025-02-26 · Touhidur Rahman (touhidurabir)
- **Upstream** `pkp/pkp-lib#13420` (open, 3.6 milestone, no PR), which reports this misspelling and a missing "the" in the "Reviewer Suggestion at Submission" setting's description; the fix here covers both
- **Tracked in** spec U31 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On the submission form's "Reviewer Suggestions" step, the text above
the list says "This can help streamline the review process and provide
valueable input for the editorial team." The text is the journal's
"For Reviewer Suggestion" guidance (Settings › Workflow › "Submission" ›
"Author Guidance"), which every journal and press gets by default. Only
the English text is misspelt.

Each journal and press holds its own copy of the text, made when it was
created or upgraded to 3.5. Correcting the default reaches only those
created afterwards: existing ones keep the misspelt copy until a manager
edits the box.

## Impact

- **Lost**: nothing; authors can suggest reviewers as usual.
- **Who**: authors submitting in English to a journal or press that has
  turned on "Reviewer Suggestion at Submission" (it is off by default)
  and kept the default guidance; managers see the same text in the
  "For Reviewer Suggestion" box.
- **Way round**: a manager edits the box and saves.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`,
  "Journal of Public Knowledge"); the same on OMP `main` (press
  `publicknowledge`, "Public Knowledge Press").
- "Reviewer Suggestion at Submission" is off in the dataset; steps 1-3
  turn it on.

The journal's guidance and the author's step:

1. Sign in as `rvaca` (Journal manager; Press manager on OMP).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`), tab
   "Review", side tab "Setup".
3. Tick "Allow authors to suggest potential reviewers at submission
   process" and press "Save".
4. Open the tab "Submission", side tab "Author Guidance", and read the
   last box, "For Reviewer Suggestion".
5. Sign out and sign in as the author `ccorino` (OJS) or `aclark` (OMP).
6. Open "New Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u31q3 Reviewer suggestions", choose the section
   "Articles" (OJS) and English, tick the requirements and privacy
   boxes, and press "Begin Submission".
7. Press "Continue" until "Reviewer Suggestions" is the current step
   (after "For the Editors"). [3.5: the form opens on "Details", then
   "Upload Files".]
8. Read the text above the "Reviewer Suggestions" list.

A journal created now (the default itself):

9. Sign in as `admin` and open Administration › Hosted Journals (Hosted
   Presses on OMP) › "Create Journal" ("Create Press"): name "u31q3
   Journal", initials "U31Q3", a contact name and email, country, path
   `u31q3`, English as its language, enabled; press "Save".
10. Open the new journal's Settings › Workflow › "Submission" › "Author
    Guidance" and read the "For Reviewer Suggestion" box.

**Expected**: at steps 4, 8 and 10, "This can help streamline the review
process and provide valuable input for the editorial team."

**Observed**: at steps 4, 8 and 10 alike:

```
When submitting, you have the option to suggest several potential reviewers. This can help streamline the review process and provide valueable input for the editorial team. Please choose reviewers who are expert in your field and have no conflict of interest with your work. This feature aims to enhance the review process and support a more efficient experience for both authors and editorial team.
```

## Cause

The text is the context setting `reviewerSuggestionsHelp`, which the
step shows as its description
(`PKPSubmissionHandler::getReviewerSuggestionsStep()`, line 739, the
context's `getLocalizedData('reviewerSuggestionsHelp')`). Its default is
the locale key `default.submission.step.reviewerSuggestions` in
`lib/pkp/locale/en/default.po` (line 210 on `main`), which reads
"provide valueable input". It came in with the feature
(`pkp/pkp-lib#4787`) and has not changed since.

The default is copied into the setting, not read live:

- A new journal or press gets it from the context schema's
  `defaultLocaleKey` (`schemas/context.json` in OJS and OMP), through
  `PKPContextService::add()` and `PKPSchemaService::setDefaults()`.
- The 3.5 upgrade (`I4787_AddReviewSuggestionHelp`, on
  `I7191_InstallSubmissionHelpDefaults`) wrote it into every existing
  context, once per language the context supports.

So every journal and press created or upgraded so far holds the
misspelling as its own text, and correcting the string reaches only
those created afterwards.

Reach:

- OPS has no reviewer suggestions: its context schema has neither the
  setting nor `reviewerSuggestionEnabled`, and neither the box nor the
  step shows (checked on screen and in the code).
- No other English string in pkp-lib, the apps or ui-library reads
  "valueable" (checked in the code).
- Only `locale/en` carries "valueable"; no translation of the key
  does (checked in the code).
- `pkp/pkp-lib#13420` reports this misspelling (part 1) and a missing
  "the" (part 2) in the description of the "Reviewer Suggestion at
  Submission" setting on Settings › Workflow › "Review" › "Setup":
  `manager.setup.reviewOptions.reviewerSuggestionEnabled.description`
  in `lib/pkp/locale/en/manager.po` (line 1361 on `main`), "…provide
  valuable input for editorial team." That string is read live through
  `__()` (`PKPReviewSetupForm`, line 204), so its fix reaches every
  journal and press at once.

## Proposed fix

Correct the English default text, and in the same change the
setting's description that `pkp/pkp-lib#13420` also names, so the fix
closes that issue
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/fix.diff);
its paths start at the app root, so `git apply -p3` in a pkp-lib clone):

```diff
--- a/lib/pkp/locale/en/default.po
+++ b/lib/pkp/locale/en/default.po
@@ -207,8 +207,8 @@
 msgid "default.submission.step.reviewerSuggestions"
 msgstr ""
 "<p>When submitting, you have the option to suggest several potential reviewers. "
-"This can help streamline the review process and provide valueable input "
+"This can help streamline the review process and provide valuable input "
 "for the editorial team. Please choose reviewers who are expert in your field "
 "and have no conflict of interest with your work. This feature aims to enhance "
 "the review process and support a more efficient experience for both authors "
-"and editorial team.</p>"
+"and the editorial team.</p>"
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
@@ -1358,7 +1358,7 @@
 msgstr "Reviewer Suggestion at Submission"
 
 msgid "manager.setup.reviewOptions.reviewerSuggestionEnabled.description"
-msgstr "Author can suggest several potential reviewers before completing the submission which can streamline the review process and provide valuable input for editorial team."
+msgstr "Author can suggest several potential reviewers before completing the submission which can streamline the review process and provide valuable input for the editorial team."
 
 msgid "manager.setup.reviewOptions.reviewerSuggestionEnabled.label"
 msgstr "Allow authors to suggest potential reviewers at submission process"
```

The default text's last sentence also gains a "the" ("for both authors
and the editorial team"): this report's own choice, not part of
`pkp/pkp-lib#13420`.

Tried on `main`, OJS and OMP: a journal (press) created after the
change (steps 9-10) gets "provide valuable input" and "both authors and
the editorial team", and the description under "Reviewer Suggestion at
Submission" (step 2) reads "…valuable input for the editorial team." on
the existing journal. Its nine other "Author Guidance" boxes read the
same with the fix in and out, and the existing journal's stored
guidance keeps "valueable" (What goes with it).

**Alternatives**:

- Also an upgrade step that replaces the text in contexts that still
  hold the old default word for word. It would correct the journals and
  presses that exist today, but it rewrites a setting the journal owns,
  pkp-lib's upgrade steps have no precedent for correcting a default
  text, and it would make the fix medium. Not recommended for one
  letter; a manager can correct the box.

**What goes with it**:

- The key stays the same, so no template, API or plugin is touched.
- Existing journals and presses keep the misspelt guidance until a
  manager edits the box (see Cause); the setting's description is
  corrected everywhere at once.
- 3.5: the diff applies to `stable-3_5_0` (`default.po` at the same
  lines, `manager.po` 10 lines higher).
- Guard: an e2e check of the default guidance on the step (a **Planned**
  item in spec U31).

This is a proposal; the team decides.

Small: two English strings in pkp-lib, with no data repair. The
upgrade step under Alternatives is left as an option, so it is not
counted.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/walk.js) with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/walk.js`
  (steps 1-10, with the A11 report's window read on the way).
  `WALK_MODE=new` takes steps 9-10 alone; `WALK_MODE=nb7` reads the
  dataset journal's "Reviewer Suggestion at Submission" description and
  stored "For Reviewer Suggestion" text, and every "Author Guidance"
  box's text on a journal (press) created on screen, which were compared
  with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). OPS: no
  "Review" tab under Settings › Workflow, no "For Reviewer Suggestion"
  box, and the submission form's steps are Upload Files, Details,
  Contributors, For Readers, Review. No request failed and no page
  script failed.
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04), `stable-3_5_0`
  c1cee76b95 (`lib/pkp` 771474347e); OMP `main` 3b0ecf794 (`lib/pkp`
  3dc90c81a6), `stable-3_5_0` 9c5e24246 (`lib/pkp` cf3f984335); OPS
  `main` c8af945bb7 (`lib/pkp` 3dc90c81a6), `stable-3_5_0` 38b61882d3
  (`lib/pkp` cf3f984335).
- 3.4 and 3.3, read in the code: no `reviewerSuggestion` setting in the
  apps' `schemas/context.json` (OJS d68934d0d1 and ac77c9fb35, OMP
  0aec65441 and 8e72fc883, OPS acd8ae704b and c5532e2161) nor anywhere
  in pkp-lib's classes, schemas and English locale (`stable-3_4_0`
  767353f4fe, `stable-3_3_0` ac3fa73402), so neither has reviewer
  suggestions.
- 3.5, read in the code as well as walked: the same string on the same
  key, from the same commit, and the same form or schema default.
- Not driven: 3.4 and 3.3; an upgrade to 3.5 (the migration read in the
  code); a context's French copy of the text (its own translation, read
  in the code).
