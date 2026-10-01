# A journal's editor assignment email tells editors to select "Send to Review", a button that reads "Send for Review"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the button read "Send to Review" and the email named no button)
- **Introduced** `pkp/ojs#3279` and `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [63bef92fa3](https://github.com/pkp/ojs/commit/63bef92fa3961354c3f996fbe353cd7ec9605e82), [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 (merged 2022-02-24) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ojs1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a submission arrives, the journal emails each editor assigned to
it "You have been assigned as an editor on a submission to {journal
name}". The email asks the editor to forward the submission to review
"by selecting "Send to Review"", but the Submission stage's button
reads "Send for Review", and no button reads "Send to Review". The
"Assign Editor" message offered under "Participants" on the Submission
stage carries the same sentence.

The English letter names the wrong button, and so does the Mongolian
one, which gives the label in English; the other translations checked
name their own button. Each journal keeps its own copy of the letter, so
correcting the text reaches existing journals only through an upgrade
step that rewrites those copies.

## Impact

- **Lost.** Nothing: the button's real label differs by one word, so
  the editor recognises it and sends the submission for review.
- **Who.** Editors and section editors who read their email in English
  or Mongolian: those a section assigns automatically to each new
  submission, and those an editor assigns on the Submission stage with
  the "Assign Editor" message.
- **Way round.** None needed. A journal manager can correct the wording
  under Settings › Workflow › Emails.

Low: a wording slip that misleads no one about what to do.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP `main` is the control). The
  journal's section "Articles" lists Daniel Barnes (`dbarnes`), David
  Buskins (`dbuskins`) and Stephanie Berardo (`sberardo`) under
  "Editorial Assignments", so the journal assigns all three to every new
  submission in that section and emails each of them. Nothing else is
  needed.

The automatic email:

1. Sign in as `ccorino` (an author).
2. Open "New Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u35w40 Editor email wording", choose the section
   "Articles", leave "Submission Language" at "English", tick the two
   "Yes, …" boxes and press "Begin Submission".
3. On "Upload Files" upload any PDF and choose "Article Text".
4. Press "Continue" to "Details", type an abstract, and press "Continue"
   through to "Review".
5. Press "Submit", then "Submit" in the confirmation. The page reads
   "Submission complete".
6. Open the email "You have been assigned as an editor on a submission
   to Journal of Public Knowledge" sent to dbuskins@mailinator.com.
7. Sign out, sign in as `dbuskins` and open the email's link to the
   submission.

The "Assign Editor" message:

8. Sign out, sign in as `dbarnes` and open submission 4, "Computer
   Skill Requirements for New and Existing Teachers: Implications for
   Policy and Practice" (Submission stage).
9. Under "Participants" press "Assign", choose "Section editor", search
   "Inoue", choose Minoti Inoue and choose the message "Assign Editor".
   Read the message, then press "Cancel".

**Expected.** The email (step 6) and the message (step 9) ask the editor
to forward the submission "by selecting "Send for Review"", the label of
the button the link (step 7) shows.

**Observed.** The email and the "Assign Editor" message both read:

> If you find the submission to be relevant for Journal of Public
> Knowledge, please forward the submission to the review stage by
> selecting "Send to Review" and then assign reviewers by clicking "Add
> Reviewer".

The link opens the submission on its Submission stage, whose buttons are
"Send for Review", "Accept and Skip Review" and "Decline Submission".

Control: on a press, the same steps give "…by selecting "Send to
Internal Review"…", and the Submission stage shows a "Send to Internal
Review" button. There `aclark` submits into the series "Library &
Information Studies" (editor `dbuskins`), leaving the work type as it
is, and chooses "Book Manuscript" for the file; the message step uses
submission 3 and "Series editor".

## Cause

OJS's English text for the letter, `emails.editorAssign.body`, names
the button "Send to Review"
([`locale/en/emails.po` lines 114–115](https://github.com/pkp/ojs/blob/bade233f73/locale/en/emails.po#L114-L115)):

```
"<p>If you find the submission to be relevant for {$contextName}, please forward the submission to the review stage by "
"selecting \"Send to Review\" and then assign reviewers by clicking \"Add Reviewer\".</p>"
```

The button's label is pkp-lib's `editor.submission.decision.sendExternalReview`,
"Send for Review"
([`locale/en/submission.po` lines 1890–1891](https://github.com/pkp/pkp-lib/blob/2e377d27fc/locale/en/submission.po#L1890-L1891));
OJS does not override it. The sentence was right when it was written:
OJS then had its own `editor.submission.decision.sendExternalReview`,
"Send to Review". The editorial decisions rework for
`pkp/pkp-lib#7265` deleted OJS's key and added pkp-lib's with the new
wording, and left the letter as it was.

The letter is stored, not read from the file on each send. The install
copies it into `email_templates_default_data`, and a journal's own edit
goes into `email_templates_settings`. So a corrected `.po` reaches only
new installs and languages installed afterwards.

Reach:

- The automatic email: the `EDITOR_ASSIGN` template
  ([`registry/emailTemplates.xml` line 21](https://github.com/pkp/ojs/blob/bade233f73/registry/emailTemplates.xml#L21)),
  sent by `EditorAssigned`. Checked on screen.
- The "Assign Editor" message on the Submission stage. On `main` it is
  the `EDITOR_ASSIGN_SUBMISSION` task template, whose description is the
  same text
  ([`registry/taskTemplates.xml` line 18](https://github.com/pkp/ojs/blob/bade233f73/registry/taskTemplates.xml#L18)),
  stored in `edit_task_template_settings`. On 3.4 and 3.5 it is the
  `EDITOR_ASSIGN_SUBMISSION` email template with the same body. Checked
  on screen (`main`, 3.5).
- Mongolian: the letter is translated, but gives the label in English
  in brackets, "Хяналт руу илгээх" (Send to Review)
  ([`locale/mn/emails.po` lines 112–113](https://github.com/pkp/ojs/blob/bade233f73/locale/mn/emails.po#L112-L113)).
  The button's key has no Mongolian translation, so the button shows the
  English "Send for Review". Checked in the code.
- The other languages: French (Canada), German, Spanish and Brazilian
  Portuguese name their own button ("Envoyer en évaluation", "In die
  Begutachtung schicken", "Enviar a revisión", "Enviar para
  Avaliação"); checked in the code.
- "Add Reviewer" and "decline the submission" in the same letter match
  their buttons ("Add Reviewer", "Decline Submission"); checked in the
  code. No other English text in OJS or pkp-lib names "Send to Review"
  (ui-library's Storybook mock of this letter does; no install shows it).
- OMP's letter names "Send to Internal Review", its button's label. OPS's
  letter names no button.
- The [A15 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A15-assign-editor-email-two-footers.md)
  proposes a new `emails.editorAssignSubmission.body` copied from this
  letter. That copy still says "Send to Review" and needs the corrected
  label too.

## Proposed fix

Correct the label in the English and Mongolian letters, and repair the
stored copies in an upgrade migration that reuses pkp-lib's
`I13128_FixEmailUrlLinks::replace()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/fix.diff)):

```diff
--- a/locale/en/emails.po
+++ b/locale/en/emails.po
@@ -112,7 +112,7 @@
 "<p><b>Abstract</b></p>"
 "{$submissionAbstract}"
 "<p>If you find the submission to be relevant for {$contextName}, please forward the submission to the review stage by "
-"selecting \"Send to Review\" and then assign reviewers by clicking \"Add Reviewer\".</p>"
+"selecting \"Send for Review\" and then assign reviewers by clicking \"Add Reviewer\".</p>"
```

`locale/mn/emails.po` gets the same change inside its brackets, "(Send
for Review)".

The migration, `APP\migration\upgrade\v3_6_0\EditorAssignSendForReview`
(a working name, to be renamed after the pkp issue number), extends
`PKP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks` to reuse its
`replace()`. That method rewrites a template's default body in
`email_templates_default_data` and a journal's own edit in
`email_templates_settings`, using PHP's `str_replace()` on bodies that
hold the search text. The migration overrides `down()`, so a downgrade
does not undo I13128's own changes. It makes two replacements:

- `"Send to Review"` to `"Send for Review"`, the quoted English label,
  in any language that stores it.
- `(Send to Review)` to `(Send for Review)`, in Mongolian only.

Each replacement is applied twice:

- To `EDITOR_ASSIGN`, through `replace()`.
- To the description of the `EDITOR_ASSIGN_SUBMISSION` task template,
  through a short query of its own. `replace()` covers email templates
  only, and on `main` this letter is a task template.

A body that no longer holds the old label is left alone, so a second
run changes nothing.

The migration is registered in `dbscripts/xml/upgrade.xml`'s
`3.3.0.0`–`3.5.9.9` block, the block that upgrades a released install
to 3.6, where every migration new on `main` is registered. It comes
after `I12593_EmailToTaskTemplates` for a reason. I12593 copies the
"Assign Editor" letter (`EDITOR_ASSIGN_SUBMISSION`, a journal's edit
included) into the task templates. It then deletes the journal's
email-template copy. After it has run, the only live copies are the
`EDITOR_ASSIGN` rows and the task-template descriptions, and those are
what the migration repairs. I12593 leaves the old
`EDITOR_ASSIGN_SUBMISSION` rows in `email_templates_default_data` behind
on an upgraded install. Nothing reads them, and `main`'s
`registry/emailTemplates.xml` no longer defines the key, so the
migration does not touch them. An install already at 3.6.0.0 (a
development install of `main`) does not run this block, so it gets
neither this migration nor any other recent `main` migration.

An earlier version of this fix was tried on OJS `main`. It made the same
`.po` change, and its migration used SQL `REPLACE()` in place of
`replace()`. It was run directly on a freshly loaded dataset rather than
through the upgrade. The email and the "Assign Editor" message then read
"…by selecting "Send for Review"…". Settings › Workflow › Emails ›
"Editor Assigned (Auto)" showed the corrected English body and the
French body unchanged. This version of the fix, with `replace()`, the
Mongolian change and the registration as described, was not tried.

**Alternatives**

- Rename the button back to "Send to Review": the label is pkp-lib's,
  shared with the apps and translated everywhere; the letter is the one
  text out of step.
- Change only the `.po` files: two lines, but every existing journal
  keeps sending the old wording until a manager reloads the language's
  defaults, which also resets other settings.

**What goes with it**

- Backport the `.po` lines and the `EDITOR_ASSIGN` and
  `EDITOR_ASSIGN_SUBMISSION` email-template replacements to 3.5, in its
  `3.5.0.0`–`3.5.0.99` block, as I13128 was for 3.5.0-5. Leave out the
  task-template part, which 3.5 does not have. On 3.4 the same goes in a
  new `3.4.0.0`–`3.4.0.11` block for the next point release, following
  that branch's `3.4.0.0`–`3.4.0.10` block.
- A test: an e2e check that the letter names a button the Submission
  stage shows.

Medium: the text fix is two lines, but each journal keeps its own copy
of the letter, so existing journals need the upgrade migration.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/walk.js),
  run on an install loaded with the default dataset with
  `node bin/probe.js all shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/walk.js`.
  It takes the Steps on OJS and OMP and skips OPS, which has no review
  stage. Walked on `main` and 3.5.
- The trial of the earlier fix: before its migration, the dataset held
  the old label in `EDITOR_ASSIGN`'s English default body and in task
  template 6's (`EDITOR_ASSIGN_SUBMISSION`) English description. After
  it, both held "Send for Review", and the French rows and the
  `EDITOR_ASSIGN_REVIEW` rows were unchanged. The French check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/neighbour.js).
  The migration was run with
  [migrate.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/migrate.php).
- Tips: OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73)
  (lib/pkp [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc)),
  OMP `main` [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794)
  (lib/pkp [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6));
  OJS `stable-3_5_0` [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48)
  (lib/pkp [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)),
  OMP `stable-3_5_0` [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00);
  OJS `stable-3_4_0` [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7)
  (lib/pkp [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d));
  OJS `stable-3_3_0` [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a)
  (lib/pkp [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)).
  The default datasets from pkp/datasets 38ab955 (2026-09-30), on
  PostgreSQL. The recommended migration does its rewriting in PHP, so it
  does not depend on the database.
- 3.4 (code): `upstream/stable-3_4_0:locale/en/emails.po` line 114 has
  the same sentence, `registry/emailTemplates.xml` lines 21 and 69 the
  same two templates, and `origin/stable-3_4_0:locale/en/submission.po`
  in lib/pkp labels the button "Send for Review".
- 3.3 (code): `upstream/stable-3_3_0:locale/en_US/editor.po` line 123
  labels the button "Send to Review", and
  `locale/en_US/emails.po`'s `emails.editorAssign.body` (lines 197–206)
  names no button.
- Introduced: `git blame` on `emails.po` lines 114–115 gives
  [32739a3f3f](https://github.com/pkp/ojs/commit/32739a3f3fc8a2d6ce3fda6692b5fd534fa10a3a)
  (`pkp/ojs#3248` for `pkp/pkp-lib#7264`, 2021-11-23, Vitaliy Bezsheiko
  (Vitaliy-1)), which wrote the sentence while OJS's
  `editor.submission.decision.sendExternalReview` still read "Send to
  Review" (`locale/en_US/editor.po`, since 2015). The later
  [63bef92fa3](https://github.com/pkp/ojs/commit/63bef92fa3961354c3f996fbe353cd7ec9605e82)
  deleted that key and
  [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa)
  added pkp-lib's "Send for Review", in the same PRs; `git log -S`
  finds no other change to either string.
- Trackers searched (pkp/pkp-lib, pkp/ojs, pkp/ui-library, issues and
  PRs, open and closed) for "Send to Review", "Send for Review" with
  email, `editorAssign`, `EDITOR_ASSIGN` and "Editor Assigned". The
  nearest, `pkp/pkp-lib#8423`, is about where the template is used, not
  its wording.
- Unverified: the recommended fix as written (see Proposed fix), the
  Mongolian replacement, and the repair of a journal's own edit of the
  letter (the dataset has none).
