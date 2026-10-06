# A press's reviewer removal and cancel emails print "{$journalName}" where the press's name belongs

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2442` for `pkp/pkp-lib#12903` · [b21b505875](https://github.com/pkp/omp/commit/b21b505875510e6c684b6862803b970021f33521) · merged 2026-08-27 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#omp3), spec U34 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U34-editorial-decision-recording.md#omp1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press, the emails a reviewer receives when an editor removes them
("Unassign Reviewer"), cancels their review ("Cancel Reviewer") or
cancels the review round ("Cancel Review Round") print "{$journalName}"
literally where the press's name belongs: "…you have been removed from
the reviewer assignment for "{title}" in {$journalName}." and "Thank
you for agreeing to review "{title}" for {$journalName}." A journal's
reviewers read the journal's name in the same sentences.

"Cancel Reviewer" and "Cancel Review Round" both send the "Review
Cancel" template, and "Unassign Reviewer" sends "Reviewer Unassign", so
the two templates carry the fault for all three actions.

## Impact

- **Lost**: the press's name, and the press looks careless to its
  reviewers. In the "Unassign Reviewer" and "Cancel Reviewer" windows
  the editor can spot "{$journalName}" in an otherwise filled message.
  On the "Cancel Review Round" page it looks like the reviewer's-name
  placeholder beside it, which is filled when the email goes out, so
  nothing tells the editor it will stay as typed.
- **Who**: every reviewer removed or cancelled on any press when the
  email is in English, as long as the editor sends the message without
  editing it. No other language of OMP uses "{$journalName}" in "Review
  Cancel", and none has a text of its own for "Reviewer Unassign".
- **Way round**: the editor edits "{$journalName}" out of the message
  before sending; or a manager edits "Reviewer Unassign" and "Review
  Cancel" under Settings › Workflow › Emails once.

Low: wording in an email whose message still arrives and reads right
apart from the press's name.

## Steps to reproduce

Preconditions:

- The default dataset of OMP `main` (pkp/datasets `omp/main`), whose
  stored default email templates come from the current `emails.po`, as
  after any install or upgrade to `main`. A dump older than
  b21b505875 does not show the fault. Nothing is created before the
  steps.
- A mail catcher the install sends to, to read the mailboxes of Lisset
  Von (`lvon@mailinator.com`) and Rajek Sharif
  (`rsharif@mailinator.com`).

1. Sign in as `dbarnes`.
2. Open submission 18, "Transformative Impact of AI Tools on Modern
   Education: Opportunities, Challenges, and Future Directions"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=18`).
   It opens on External Review, Round 1, with nine reviewers who have
   not answered.

"Unassign Reviewer" and "Cancel Review Round":

3. In "Reviewers", on Lisset Von's row, open "More Actions" and choose
   "Unassign Reviewer". Read the message in the window.
4. Press "Unassign Reviewer".
5. Open the newest email to `lvon@mailinator.com`.
6. Back on the submission, press "Cancel Review Round".
7. On "Notify Authors" press "Continue"; on "Notify Reviewers" read the
   message, leave the page as it comes and press "Record Decision".
8. Open the newest email to `rsharif@mailinator.com`.

"Cancel Reviewer", on a freshly loaded dataset (steps 6 and 7 cancel
Rajek Sharif's request):

9. Sign in as `dbarnes` and open submission 18 as in step 2.
10. In "Reviewers", on Rajek Sharif's row, open "More Actions" ›
    "Log Response", choose "Reviewer has accepted the invitation to
    review" and press "Log Response". The row reads "Request Accepted".
11. On the same row, "More Actions" › "Cancel Reviewer"; leave the
    window as it comes and press "Cancel Reviewer".
12. Open the newest email to `rsharif@mailinator.com`.

**Expected.** The press's name where the texts name the press: step 5
"…removed from the reviewer assignment for "Transformative Impact of AI
Tools …" in Public Knowledge Press.", steps 8 and 12 "Thank you for
agreeing to review "Transformative Impact of AI Tools …" for Public
Knowledge Press." and "…thank you again for your support of Public
Knowledge Press."

**Observed.** Step 3: the window's message is filled, the reviewer's
name and the title included, and ends its first paragraph "in
{$journalName}.". Step 5: the email carries that text as shown:

```
Dear Lisset Von,
We are writing to let you know that you have been removed from the reviewer assignment for "Transformative Impact of AI Tools on Modern Education: Opportunities, Challenges, and Future Directions" in {$journalName}.
```

Step 7: "Notify Reviewers" shows the message with the title filled in
and "{$JOURNALNAME}" where the press's name belongs, set out the same
way as "{$RECIPIENTNAME}", the reviewer's name, which is filled in for
each reviewer when the email is sent. On a journal this page shows
"Journal of Public Knowledge" in that place. Step 8:

```
Dear Rajek Sharif,
Thank you for agreeing to review "Transformative Impact of AI Tools on Modern Education: Opportunities, Challenges, and Future Directions" for {$journalName}. […]
We hope to have the opportunity to work with you in the future and thank you again for your support of {$journalName}.
```

Step 11 shows "Reviewer cancelled."; step 12's email, "Your review for
"…" has been cancelled", has the same two "{$journalName}" as step 8.

Control, on a journal: the same steps on OJS `main`, submission 20 (the
same title), print "Journal of Public Knowledge" in each place.

## Cause

OMP's `locale/en/emails.po` names `{$journalName}` in the two texts that
`pkp/omp#2442` added for `pkp/pkp-lib#12903`: `emails.reviewerUnassign.body`
(once) and the rewritten `emails.reviewCancel.body` (twice). The variable
for a context's name in an email is `{$contextName}`; no mailable has a
`journalName`.

On a journal the same text works only because OJS renames it on the way
into the database: `APP\emailTemplate\DAO::variablesToRename()` maps
`journalName` to `contextName`, and `installEmailTemplateLocaleData()`
applies the map through `renameApplicationVariables()` when it stores a
template. OMP's map renames only the
`press*` names (`pressName` to `contextName` and so on), so the press
stores `{$journalName}` as typed and nothing fills it. The texts were
written once for both apps; on 3.5 OMP's "Review Cancel" text named
`{$contextName}`.

Reach:

- Every install on `main`: both default templates are stored from this
  file at install, and on upgrade by
  `I12903_ReviewerUnassignEmailTemplate`, in
  `email_templates_default_data`, which has no context column, so the
  stored default serves every press of the install. An install that
  already holds the text keeps it until the two templates are
  reinstalled; a press whose manager edited a template keeps its own
  copy either way. Read in the code, and in the dataset's
  `email_templates_default_data`.
- OMP's other languages: no other `emails.po` of OMP names
  `{$journalName}`, and none has a text for "Reviewer Unassign"
  (searched).
- Left out, the same mistake in translations: pkp-lib's `fr_CA` text of
  `emails.editorialReminder.body` and several `nb_NO` texts (`reviewAck`,
  `decision.notifyReviewers`, `editorDecision*` among them) name
  `{$journalName}`, so a press or a preprint server prints it in those
  languages; they came in through translations and are on 3.5 too (the
  `fr_CA` one on 3.4 as well). Read in the code.

## Proposed fix

Name the variable every app fills, `{$contextName}`, in the three places
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-reviewer-notices-journal-placeholder/fix.diff),
against the OMP root):

```diff
--- a/locale/en/emails.po
+++ b/locale/en/emails.po
-"<p>Thank you for agreeing to review \"{$submissionTitle}\" for {$journalName}. We sincerely appreciate […]</p>"
+"<p>Thank you for agreeing to review \"{$submissionTitle}\" for {$contextName}. We sincerely appreciate […]</p>"
-"<p>We hope to have the opportunity to work with you in the future and thank you again for your support of {$journalName}.</p>"
+"<p>We hope to have the opportunity to work with you in the future and thank you again for your support of {$contextName}.</p>"
-"<p>We are writing to let you know that you have been removed from the reviewer assignment for \"{$submissionTitle}\" in {$journalName}.</p>"
+"<p>We are writing to let you know that you have been removed from the reviewer assignment for \"{$submissionTitle}\" in {$contextName}.</p>"
```

`{$contextName}` is what OMP's own texts use (its "Reinstate" text in
the same file), and it keeps the wording `pkp/pkp-lib#12903` wanted.

Tried on `main`: with the diff in and the two default templates
reinstalled on the test install
(`lib/pkp/tools/installEmailTemplate.php REVIEW_CANCEL en` and
`REVIEWER_UNASSIGN en`, the step an install or the upgrade takes),
step 3's window and the emails of steps 5, 8 and 12 all read "Public
Knowledge Press". The "Reinstate Reviewer" email ("Can you still review
something for Public Knowledge Press?"), run as a control, is the same
as without the diff.

**Alternatives**

- Add `journalName` to OMP's `variablesToRename()`: it hides this text
  and any other copied from OJS, but keeps a journal word in OMP's
  sources. Not recommended as the fix.

**What goes with it**

- Stored data: no repair proposed. `main` is unreleased; installs
  upgraded from 3.5 run `I12903_ReviewerUnassignEmailTemplate`, which
  stores the corrected text. Development and test installs already on
  `main` keep the old text until the two default templates are
  reinstalled, as above.
- OJS: its copies of the three sentences (OJS `locale/en/emails.po`,
  lines 215, 217 and 226) are worth changing to `{$contextName}` too, as
  a commit of their own: they work today only through OJS's rename, and
  one variable in both apps keeps the next copy safe. Nothing changes
  for a journal, and this fault does not need it.
- The pkp-lib translations in Cause go to the translators (Weblate),
  not into this change.
- A test: a unit test that reads each app's and pkp-lib's `emails.po`
  and refuses a variable the template's mailable does not describe
  (`getDataDescriptions()`). It would fail today on the `fr_CA` and
  `nb_NO` translations left to Weblate, so it starts with those
  messages on an allow-list, emptied as the translations are fixed.

Small: three words in one file, no data repair, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unassign-notice-cancel-subject/walk.js)
  (helpers in its `lib.js`), run in pkp-e2e's harness with
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/unassign-notice-cancel-subject/walk.js`
  for steps 1 to 8 and the journal's control; with `PHASE=nb` it takes
  steps 9 to 12, then "Reinstate Reviewer". The fix was tried by
  applying `fix.diff` to the OMP checkout, reinstalling the two default
  templates and walking again on a freshly loaded dataset.
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, each on PKP's
  default dataset (pkp/datasets e8dafbc, 2026-10-02), PostgreSQL, as
  `dbarnes`. Mail was read in the test install's mail catcher
  (Mailpit). No request failed and the server logged no error.
- Tips, `main`: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS c1cee76b95, OMP 9c5e24246c
  (lib/pkp cf3f984335). `stable-3_4_0`: OMP 0aec65441f (lib/pkp
  767353f4fe). `stable-3_3_0`: OMP 8e72fc8836 (lib/pkp ac3fa73402).
- 3.5, walked, steps 1 to 12: one template serves the three actions
  there ("Request for Review Cancelled"), and its text names "Public
  Knowledge Press". The script reads 3.5's single removal form, which
  "Cancel Reviewer" opens there under its own label.
  3.4 and 3.3, code: OMP's `emails.reviewCancel.body`
  (`locale/en/emails.po`, `locale/en_US/emails.po` on 3.3) names
  `{$contextName}` and there is no `reviewerUnassign` text.
- Upstream: read and not this fault, `pkp/pkp-lib#9158` (open; old
  variable names left in stored templates after upgrades).
- Not driven: the French interface; a press whose templates were edited
  by a manager; the pkp-lib translations named in Cause; MySQL.
