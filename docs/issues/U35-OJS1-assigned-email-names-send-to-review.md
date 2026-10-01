# A journal's "Editor Assigned" email tells the editor to select "Send to Review"; the button reads "Send for Review"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS (a journal installed on 3.4 or later)
  - 3.5: OJS (the same)
  - 3.4: OJS (code; the same)
  - 3.3: none (code; the email names no button)
- **Introduced** `pkp/ojs#3279` and `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [63bef92fa3](https://github.com/pkp/ojs/commit/63bef92fa3961354c3f996fbe353cd7ec9605e82) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ojs1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When an author submits to a journal, each editor assigned automatically
through the section's "Editorial Assignments" gets the email "You have
been assigned as an editor on a submission to {journal name}". Its English
text asks them to forward the submission "by selecting "Send to Review"".
No button has that name: the Submission stage's button reads "Send for
Review".

The editor still finds the button, since it is the only one about review
on that stage. A journal manager can correct the sentence under Settings ›
Workflow › Emails › "Editor Assigned (Auto)".

The reach is narrow. Only journals installed on 3.4 or later hold the
sentence; a journal upgraded from 3.3 still sends the older letter, which
names no button. A press's email names its own button correctly, and a
preprint server's email names none. The French text is right; the other
translations were not checked.

## Impact

- **Lost**: nothing; the task gets done.
- **Who**: the editors a journal assigns automatically to a new
  submission, when the email goes out in English, on a journal installed
  on 3.4 or later.
- **Way round**: none needed to act; the manager can edit the email's
  text.

Low: wording only. Nothing would raise it.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Its section "Articles" already names
  Daniel Barnes, David Buskins and Stephanie Berardo under "Editorial
  Assignments", so a new submission to it is assigned to them.
- A mail catcher (Mailpit, for one) listening on `localhost:1025`, where
  the dataset's `config.inc.php` sends its mail.

1. Sign in as `rvaca`. Open Settings › Workflow › "Emails" › "Add and
   edit templates"
   (`/index.php/publicknowledge/en/management/settings/manageEmails`),
   search "Editor Assigned (Auto)" and press its "Edit". Read "Body",
   close the window and sign out.
2. Sign in as `ccorino` and open "New Submission"
   (`/index.php/publicknowledge/en/submission`). Type a title, choose the
   section "Articles" and "English" under "Submission Language", tick
   "Yes, my submission meets all of these requirements." and "Yes, I agree
   to have my data collected and stored…", then "Begin Submission".
3. On "Upload Files" press "Add File", upload any PDF and choose
   "Article Text", then "Continue". On "Details" type an abstract, then
   "Continue". "Contributors" and "For the Editors" need nothing: press
   "Continue" on each. On "Review" press "Submit" and confirm with
   "Submit". Sign out.
4. In the mail catcher, open the message to `dbarnes@mailinator.com` with
   the subject "You have been assigned as an editor on a submission to
   Journal of Public Knowledge".
5. Sign in as `dbarnes`, open the email's link to the submission, and read
   the buttons of the Submission stage.

**Expected.** The email names the button as the screen shows it: "…by
selecting "Send for Review"…".

**Observed.** The email's text in step 1 and the email received in step 4
both say:

```
If you find the submission to be relevant for Journal of Public Knowledge,
please forward the submission to the review stage by selecting "Send to
Review" and then assign reviewers by clicking "Add Reviewer".
```

(step 1 shows `{$contextName}` for the journal's name). Step 5 offers
"Send for Review", "Accept and Skip Review" and "Decline Submission". No
button reads "Send to Review".

Control: the same five steps on the default dataset of OMP differ in three
things. The author is `aclark`. In step 3 the file is a "Book Manuscript",
and the wizard step "For the Editors" needs the series "Library &
Information Studies" chosen, which assigns David Buskins. Steps 4 and 5
are `dbuskins`'s. The press's email says "by selecting "Send to Internal
Review"", and the stage offers a button "Send to Internal Review".

## Cause

The email's English text is OJS's `emails.editorAssign.body`
(`locale/en/emails.po`, line 115):

```
"selecting \"Send to Review\" and then assign reviewers by clicking \"Add Reviewer\".</p>"
```

The button is the decision's label, `editor.submission.decision.sendExternalReview`,
which lib/pkp's `locale/en/submission.po` defines as "Send for Review".
OJS's locale does not override it.

The sentence and the label matched only on the development branch, for
three months, and never in a release, which is why this is a defect and
not a regression. `pkp/ojs#3248` (for `pkp/pkp-lib#7264`, November 2021)
wrote the sentence while OJS's own locale still defined the label as
"Send to Review". `pkp/pkp-lib#7265` (the decision screens, merged
2022-02-24) then removed OJS's label and added "Send for Review" to
lib/pkp, with "Sent for Review" for the completed decision. The email's
sentence was not changed with it.

The text is copied into the database when the journal is installed
(`email_templates_default_data`, by
`PKP\emailTemplate\DAO::installEmailTemplateLocaleData()`), and the email
is sent from that copy. No upgrade refreshes it: the 3.4 upgrade's
`InstallEmailTemplates` installs only keys that have no row yet, and
`EDITOR_ASSIGN` is not in its list. Two things follow (code read):

- A journal upgraded from 3.3 keeps 3.3's "Editorial Assignment" letter
  as this email, which names no button. Only "Reload Locale" for English
  (`Locale::installLocale()`) replaces it with today's text.
- A change to the locale file reaches new installs, and journals already
  installed keep their stored copy.

Reach:

- The same locale text is the predefined message "Assign Editor" that the
  Submission stage's "Assign" and "Notify" windows offer. It is a second
  stored copy, and unlike the first, a journal upgraded from 3.3 has it
  too (`I5716_EmailTemplateAssignments` installs it on that upgrade). On
  3.5 and 3.4 it is the email template `EDITOR_ASSIGN_SUBMISSION`. On
  `main` it is a task template (`registry/taskTemplates.xml`, stored in
  `edit_task_template_settings`). The OJS `main` dataset and the OJS
  `stable-3_5_0` dataset each hold "Send to Review" in that copy (read in
  the database, not on screen).
- A journal that edited "Editor Assigned (Auto)" has its own copy of the
  text, with the phrase unless it removed it. A template the journal added
  beside it has its own key and text (code read).
- OMP: its `emails.editorAssign.body` names "Send to Internal Review",
  which is its button (walked). OPS: "Moderator Assigned (Auto)" names no
  button (code read), and a preprint server never sends it (the report
  "A preprint server never emails its moderators that a new preprint was
  assigned to them", spec U35 OPS3).
- The French text (`fr_CA`) names "Envoyer en évaluation", which is the
  French label of the button (code read). The Mongolian text quotes
  "(Send to Review)" in English beside its translation. The other
  translations were not compared with their labels.
- "Add Reviewer", the second name the sentence quotes, is the label of
  the Review stage's button (`editor.submission.addReviewer`, code read).
  `emails.editorAssignReview.body` of OJS and OMP quotes the same name.
- One more English email names a button, and it is left out of this
  report: OJS's `emails.editorAssignProduction.body` (line 142) says
  "clicking the **Schedule for Publication** button", and the label
  `editor.submission.schedulePublication` reads "Schedule For
  Publication". The name is right and only a capital differs, so it is
  not this fault; the same change could align it. No other English email
  of OJS, OMP, OPS or lib/pkp quotes a button's name (a search of the
  four `emails.po` files for quoted and bold names).

## Proposed fix

Change the word in the email's text. The button's wording stays:
`pkp/pkp-lib#7265` chose "Send for Review" for the button, its log line
and the completed decision.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assigned-email-names-send-to-review/fix.diff),
against the OJS root:

```diff
--- a/locale/en/emails.po
+++ b/locale/en/emails.po
-"selecting \"Send to Review\" and then assign reviewers by clicking \"Add Reviewer\".</p>"
+"selecting \"Send for Review\" and then assign reviewers by clicking \"Add Reviewer\".</p>"
```

This fixes new installs, both the automatic email and the predefined
message "Assign Editor", which read the same string. Journals already
installed keep their stored copy and correct it on screen if they care
to. For a wording fault that is enough, and it leaves every text a
journal edited alone.

The fix was tried on OJS `main`. With
`php lib/pkp/tools/installEmailTemplate.php EDITOR_ASSIGN en` run after
it, which stores the text as a new install does, the Steps showed the
Expected: the template and the received email both say "Send for
Review", which is a button of the stage. A press's email and buttons and
every other stored email text were unchanged.

**Alternatives**

- Rename the button back to "Send to Review". That undoes a wording the
  decision screens use consistently ("Send for Review", "Sent for
  Review").
- Leave the button's name out of the sentence ("forward the submission to
  the review stage and then assign reviewers"). It cannot go stale again,
  but it changes more of a source string every translation follows.

**What goes with it**

- Optional, a repair of the stored copies on upgrade:
  [stored-copy.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assigned-email-names-send-to-review/stored-copy.diff)
  adds an OJS upgrade migration that reuses `replace()` of lib/pkp's
  `I13128_FixEmailUrlLinks`, for `EDITOR_ASSIGN` and
  `EDITOR_ASSIGN_SUBMISSION`, English only. It replaces the exact phrase
  `selecting "Send to Review"` in the default text and in a journal's
  edited copy of these two keys, not in a template the journal added
  under another key. It defines its own `down()`, which puts the phrase
  back; without one it would inherit the parent's, which undoes the
  parent's replacements in other emails.
- That migration sits before `I12593_EmailToTaskTemplates` in
  `upgrade.xml`, because `I12593` moves `EDITOR_ASSIGN_SUBMISSION` into
  the task templates, where `replace()` does not look. An install already
  on `main` (a development install; 3.6 is not released) keeps the old
  phrase in its task template.
- What was tried of it, on OJS `main`: `up()` changed the stored
  `EDITOR_ASSIGN` text, a second `up()` changed nothing more, and
  `down()` restored it. The `EDITOR_ASSIGN_SUBMISSION` line and the
  position before `I12593` were not tried: they act only on an upgrade
  from 3.5.
- A backport: the locale line applies to 3.5 and 3.4 as it stands. The
  migration, if wanted on 3.5, goes under `v3_5_0` into that branch's
  current `upgrade.xml` block and stays in `main`'s 3.6.0 block, as
  `I13128_FixEmailUrlLinks` does.
- The changed source string goes to the translators through Weblate.
- A test to go with the fix: scenario 8 of spec U35 in pkp-e2e ("The
  automatic 'Editor Assigned (Auto)' email") already reads the email, and
  can assert that the name it quotes is a button of the stage. A unit
  test cannot see a mismatch between two locale strings.

Small: one word in one locale string, with no data repair in the
recommended fix. The optional migration would make it medium.

## Evidence

- The kept script takes the Steps on OJS, and on OMP as the control, and
  reports each button name the email quotes and whether the stage shows a
  button of that name:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assigned-email-names-send-to-review/walk.js),
  with its helpers in `lib.js` beside it:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/assigned-email-names-send-to-review/walk.js`
- Taken on OJS and OMP `main` and `stable-3_5_0`, on PostgreSQL; nothing
  here depends on the database. Datasets: pkp/datasets c657990
  (2026-10-01), all fresh installs of their branch.
- The optional migration was run with
  [run-migration.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assigned-email-names-send-to-review/run-migration.php),
  which calls its `up()` or `down()` on a loaded dataset. A full upgrade
  from 3.5 was not run.
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 4fca1027f4, OMP c7b45f88e
  (lib/pkp 1fb843f491); `stable-3_4_0` OJS 9571d8fde7 (lib/pkp
  df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a (lib/pkp d446601ebe).
- Code reads:
  - `main`: OJS `locale/en/emails.po` (`emails.editorAssign.body`),
    lib/pkp `locale/en/submission.po`
    (`editor.submission.decision.sendExternalReview`), OJS
    `registry/emailTemplates.xml` and `registry/taskTemplates.xml` (the
    two users of the text), `PKP\emailTemplate\DAO::installEmailTemplates()`
    and `installEmailTemplateLocaleData()`, the 3.6 upgrade's
    `InstallEmailTemplates` (it installs missing keys only), OMP's and
    OPS's `emails.editorAssign.body`, OJS's and lib/pkp's `fr_CA` strings.
  - Which installs hold the sentence: lib/pkp's and OJS's
    `v3_4_0\InstallEmailTemplates` (a key list without `EDITOR_ASSIGN`,
    and a skip for a key already stored), `I7264_UpdateEmailTemplates`
    (renames the old letter's variables), `I5716_EmailTemplateAssignments`
    (installs `EDITOR_ASSIGN_SUBMISSION`),
    `emailTemplate\Repository::restoreDefaults()` (deletes edited copies,
    does not refresh the defaults) and `Locale::installLocale()`.
  - Introduced: OJS 32739a3f3f (2021-11-23, `pkp/ojs#3248`) wrote the
    sentence; OJS 63bef92fa3 removed OJS's
    `editor.submission.decision.sendExternalReview` ("Send to Review") and
    lib/pkp f75706ba57 added the key as "Send for Review", both written
    2022-01-18 and merged 2022-02-24.
  - 3.5 and 3.4: the same line in OJS's `locale/en/emails.po` and the
    same label in lib/pkp, with no OJS override.
  - 3.3: `emails.editorAssign.body` is the "Editorial Assignment" letter,
    which quotes no button, and OJS's label is "Send to Review".
- Upstream searches (2026-10-01): pkp/pkp-lib and pkp/ojs for "Send to
  Review", "Send for Review" with email, "Editor Assigned" email wording,
  and `EDITOR_ASSIGN` with "Send to Review".
- Unverified: a journal upgraded from 3.3 was not walked, so "it keeps
  the old letter" rests on the code read; whether the screen's "Schedule
  For Publication" button reads as its label was not looked at.
