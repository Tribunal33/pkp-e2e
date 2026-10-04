# Authors suggesting a reviewer read "mention is there are any potential conflict of interest" for "if there are any potential conflicts"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (OPS has no reviewer suggestions)
  - 3.5: OJS, OMP (OPS has no reviewer suggestions)
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code; no reviewer suggestions)
- **Introduced** `pkp/pkp-lib#10497` for `pkp/pkp-lib#4787` · [08d4cf9c89](https://github.com/pkp/pkp-lib/commit/08d4cf9c89dbf559f3a3becb5af86f13d48fb849) · 2025-02-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U31 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a11)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An author who suggests a reviewer on the submission form's "Reviewer
Suggestions" step opens "Add Reviewer Suggestion" and reads, under
"Reasons for suggesting reviewer": "Please share why you are
recommending this reviewer and mention is there are any potential
conflict of interest." It should say "mention if there are any
potential conflicts of interest".

The same help shows when the author presses "Edit" on a suggestion
already in that step's list. The German and Slovenian translations carry
slips of their own.

## Impact

- **Lost**: nothing; the window works and the reason saves.
- **Who**: authors suggesting reviewers, with the interface in English,
  on a journal or press that has turned on "Reviewer Suggestion at
  Submission" (it is off by default).
- **Way round**: none needed; the meaning is clear.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`,
  "Journal of Public Knowledge"); the same on OMP `main` (press
  `publicknowledge`, "Public Knowledge Press").
- "Reviewer Suggestion at Submission" is off in the dataset; steps 1-3
  turn it on.

Steps:

1. Sign in as `rvaca` (Journal manager; Press manager on OMP).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`), tab
   "Review", side tab "Setup".
3. Tick "Allow authors to suggest potential reviewers at submission
   process" and press "Save".
4. Sign out and sign in as the author `ccorino` (OJS) or `aclark` (OMP).
5. Open "New Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u31q3 Reviewer suggestions", choose the section
   "Articles" (OJS) and English, tick the requirements and privacy
   boxes, and press "Begin Submission".
6. Press "Continue" until "Reviewer Suggestions" is the current step
   (after "For the Editors"). [3.5: the form opens on "Details", then
   "Upload Files".]
7. Press "Add Reviewer Suggestion" and read the help under "Reasons for
   suggesting reviewer".

**Expected**: "Please share why you are recommending this reviewer and
mention if there are any potential conflicts of interest."

**Observed**:

```
Please share why you are recommending this reviewer and mention is there are any potential conflict of interest.
```

## Cause

The help is the description of the `suggestionReason` field that
`PKP\components\forms\submission\ReviewerSuggestionsForm` builds (line
68): `__('reviewerSuggestion.suggestionReason.description')`. The
English string in `lib/pkp/locale/en/submission.po` (line 3208 on
`main`) reads "mention is there are any potential conflict of
interest": "is there" where "if there" was meant, and "conflict" where
"any … conflicts" needs the plural. It came in with the feature
(`pkp/pkp-lib#4787`) and has not changed since.

Reach:

- The form is the one window behind "Add Reviewer Suggestion" and
  behind "Edit" on a suggestion already listed in the wizard's
  "Reviewer Suggestions" step, so both show it. The wizard is the only
  place it opens: writes are refused once the submission is complete.
- OPS has no reviewer suggestions: its context schema has no
  `reviewerSuggestionEnabled` and the wizard has no such step (checked
  on screen and in the code).
- No other English string in pkp-lib, the apps or ui-library reads "is
  there are" (checked in the code).
- Translations: 30 locales translate the key in
  `lib/pkp/locale/*/submission.po`; all 30 were read, in the code. The
  same text is on `stable-3_5_0`.
  - Slovenian has a slip of its own: "omenite, če je obstaja potencialen
    konflikt interesov" puts two verbs side by side ("je", "obstaja"),
    the same shape as the English "is there are". It should read "če
    obstaja".
  - German is a mistranslation: "erwähnen Sie, dass es potenzielle
    Interessenkonflikte gibt" asks the author to state that conflicts
    exist. It should read "erwähnen Sie, ob es … gibt" ("whether").
  - Arabic ("مع الإشارة إلى وجود تضارب مصالح محتمل", "noting the
    existence of a potential conflict of interest") may lean the same
    way as German; a native reader should judge it.
  - French (Canada) and Finnish say "mention any potential conflict"
    (French says "whether"); the other locales ask whether there is a
    conflict.

## Proposed fix

Correct the English string
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-reason-help-is-there/fix.diff);
its paths start at the app root, so `git apply -p3` in a pkp-lib clone):

```diff
--- a/lib/pkp/locale/en/submission.po
+++ b/lib/pkp/locale/en/submission.po
@@ -3205,7 +3205,7 @@
 msgstr "Reasons for suggesting reviewer"
 
 msgid "reviewerSuggestion.suggestionReason.description"
-msgstr "Please share why you are recommending this reviewer and mention is there are any potential conflict of interest."
+msgstr "Please share why you are recommending this reviewer and mention if there are any potential conflicts of interest."
 
 msgid "submission.localeNotSupported"
 msgstr "The language of the submission ({$language}) is not one of the supported submission languages. You can still edit the submission details but new submissions are not currently accepted with this language."
```

Tried on `main`, OJS and OMP: step 7 then shows the corrected help. The
window's other boxes (their labels, and the French boxes) read the same
with the fix in and out.

**Alternatives**:

- "… and mention any potential conflict of interest.": shorter, same
  meaning. The team's choice.

**What goes with it**:

- The key stays the same, so no template, API or plugin is touched.
- Translations: the English fix goes in the PR; the Slovenian and
  German corrections (Reach), and a look at Arabic, are recommended
  through Weblate, which writes PKP's non-English `.po` files (their
  `X-Generator: Weblate` header). A hand edit of those files in the
  same PR would bypass the translators' own tool. How PKP's Weblate flags a changed
  English source was not checked.
- 3.5: the diff applies as written to `stable-3_5_0` (line 2537, an
  offset patch finds).
- Guard: an e2e check of the window's help text (a **Planned** item in
  spec U31).

This is a proposal; the team decides.

Small: one English string in pkp-lib.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/walk.js) with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/lib.js),
  shared with the report on the default reviewer-suggestion guidance,
  on an install freshly loaded from the default dataset:
  `WALK_MODE=reason node bin/probe.js all shared/playwright/checks/issues/reviewer-suggestion-guidance-misspells-valuable/walk.js`
  takes steps 1-7 (the default mode takes them on the way).
  `WALK_MODE=nb11` reads every box's label and help in "Add Reviewer
  Suggestion", which were compared with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). OPS: no
  "Review" tab under Settings › Workflow, and the submission form's
  steps are Upload Files, Details, Contributors, For Readers, Review. No
  request failed and no page script failed.
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
- Not driven: 3.4 and 3.3; the "Edit" window on a listed suggestion
  (the same form, read in the code); the translations (read in the
  code).
