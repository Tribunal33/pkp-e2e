# After "Resend Review Request", the activity log prints "{$submissionid}" where the submission's number belongs

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; no "Resend Review Request")
- **Introduced** `pkp/pkp-lib#8242` for `pkp/pkp-lib#4789` · [79daa4200a](https://github.com/pkp/pkp-lib/commit/79daa4200a7d8e49ddc9060bb74d771b07b9d580) · 2022-09-08 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A37](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a37)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After "Resend Review Request" on a declined row, the submission's
activity log gains "Resent the request to review in round 1 to
{reviewer} for submission {$submissionid}.", with the placeholder
printed literally where the submission's number belongs. The lines of
the same log about the assignment and the decline print the number.

"Resend Review Request" is offered only on a declined row. Only the
log line is affected: the email the reviewer receives is a different
text, which names the submission by its title. 34 of the translated
languages print the same placeholder, among them French, the default
test dataset's second language.

The fix is a one-placeholder correction of this text in each language
file that has the typo.

## Impact

- **Lost**: nothing. The resend works, and the line still says who was
  asked again and in which round. The submission's number is in the
  heading of the workflow window the log opens from.
- **Who**: editors reading the "Activity Log" of a submission where a
  declined request was resent, on a journal or a press.
- **Way round**: none needed.

Low: a raw placeholder in a log line, where nothing is lost and the
resend is done.

## Steps to reproduce

Preconditions: the default dataset, OJS `main`. OMP is the same with the
names given in brackets. Nothing else.

1. Sign in as `phudson` and open the review request for submission 12,
   "Sodium butyrate improves growth performance of weaned piglets during
   the first period after weaning"
   (`/index.php/publicknowledge/en/reviewer/submission/12`) [OMP:
   submission 17, "Open Development: Networked Innovations in
   International Development"].
2. Press "Decline Review Request", then the window's "Decline Review
   Request".
3. Sign in as `dbarnes` and open submission 12 from "Assigned to me"
   [OMP: submission 17 from "Active submissions", since no editor is
   assigned to it]. Paul Hudson's row in "Reviewers" reads "Request
   Declined".
4. On that row, open "More Actions" › "Resend Review Request", and press
   the window's "Resend Review Request". The row reads "Request Resent".
5. Press "Activity Log".

**Expected**: the newest line reads "Resent the request to review in
round 1 to Paul Hudson for submission 12." [OMP: 17].

**Observed**: the newest line reads (OMP the same, with Paul Hudson):

```
Resent the request to review in round 1 to Paul Hudson for submission {$submissionid}.
```

Control: two rows below it, under the line for the email the resend
sent, the decline line prints the number: "The round 1 review assigned
to Paul Hudson for submission 12 has been declined." [OMP: 17].

## Cause

The English text of `log.review.reviewerResendRequest` (lib/pkp
`locale/en/submission.po`, line 2317) names the placeholder
`{$submissionid}`, in lower case:

```
msgid "log.review.reviewerResendRequest"
msgstr "Resent the request to review in round {$round} to {$reviewerName} for submission {$submissionid}."
```

The writer, `ResendRequestReviewerForm::execute()` (lib/pkp
`controllers/grid/users/reviewer/form/ResendRequestReviewerForm.php`,
line 162), stores the number as `submissionId`, as every other review
log entry does. The Activity Log's grid
(`EventLogGridCellProvider`) shows each entry through
`EventLogEntry::getTranslatedMessage()` (lib/pkp
`classes/log/event/EventLogEntry.php`, line 169), which passes the
stored values to the translation, and placeholder names are
case-sensitive. So `{$submissionid}` finds no value and is printed as
it stands.

The text came with the resend feature in 79daa4200a. Pull request
`pkp/pkp-lib#13081` (for `pkp/pkp-lib#13059`) corrected the English text
to `{$submissionId}` in its third commit, 85ed7e6578. A later commit of
the same pull request, 5cc1683e43, restored the earlier English texts so
that the other languages would not be marked for re-translation, and
restored this typo with them.

Reach:

- 54 `submission.po` files in lib/pkp `locale/` carry the line, English
  included. Of the 35 non-English ones that translate it, 34 copied
  `{$submissionid}`, French (`fr_CA`) among them; Serbian Latin
  (`sr_Latn`) reads `{$submissionId}` and prints the number. The other
  18 leave it untranslated and show the English text.
- Polish also has `{$submissionid}` in three more review lines:
  `log.review.reviewCleared`, `log.review.reviewReinstated` and
  `log.review.reviewConfirmed`. Their writers store `submissionId` too.
- No other English text in lib/pkp, OJS or OMP holds
  `{$submissionid}`.

## Proposed fix

Write the placeholder as the writer stores it, `{$submissionId}`, in
the English text and in each translation that copied the typo
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resend-request-log-raw-submission-placeholder/fix.diff),
lib/pkp only, the same for OJS and OMP):

```diff
 msgid "log.review.reviewerResendRequest"
-msgstr "Resent the request to review in round {$round} to {$reviewerName} for submission {$submissionid}."
+msgstr "Resent the request to review in round {$round} to {$reviewerName} for submission {$submissionId}."
```

The diff makes the same change in the 34 translations and in Polish's
three other lines (38 lines in 35 files). The sentence is built each
time the log is shown, so the corrected text also repairs the lines
already logged.

Tried on `main`, on the journal and the press. With the diff applied,
the walk's newest line read "Resent the request to review in round 1 to
Paul Hudson for submission 12." [OMP: 17]. The Activity Log of a
submission whose lines already printed the number (OJS 7, OMP 12) read
the same twelve lines with the fix in and out.

How this was settled:

- **Where the rule lives.** In the text, since the writer stores the
  same key as every other review log writer.
- **How the code base does it.** The neighbouring review lines
  (`log.review.reviewReinstated`, `log.review.reviewConfirmed`) read
  `{$submissionId}`.
- **What it touches.** The log's sentence only: no API field, hook or
  stored row changes.
- **Backport.** 3.5 and 3.4 have the same text and writer, but each
  branch needs its own diff: on 3.5 `git apply` refuses the Polish hunk
  (GNU `patch` takes it only with fuzz), and 3.4 has the typo in 26
  files, several of them with other context and some languages missing.
- **The guard.** An e2e step that reads the line after a resend (a
  Planned item in spec U27). A unit check that each `{$…}` in a log
  text is a key its writer stores would catch the whole class.

**Alternatives**

- Store a `submissionid` copy in the writer: it would make the line
  print, but it makes the data fit a typo and keeps the typo in 35
  files.
- Fix the English text only: marks the translations for re-translation
  and leaves 34 of them printing the placeholder, which is what the
  restoring commit tried to avoid.

**What goes with it**

- The fix edits the translations' placeholders in the repository, as
  85ed7e6578 and 5cc1683e43 edited `.po` files there; the translators'
  wording is kept. Whether Weblate's next sync keeps such an edit is for
  the team to confirm.

Small: one placeholder in each language file, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/resend-request-log-raw-submission-placeholder/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resend-request-log-raw-submission-placeholder/walk.js)
  (helpers in
  [`../reviewer-response-erases-reminder-history/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/lib.js))
  takes the Steps on a journal and a press loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/resend-request-log-raw-submission-placeholder/walk.js`;
  with `WALK_MODE=neighbour` it reads the Activity Log of OJS submission
  7 [OMP: 12], for the fix trial.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, PostgreSQL, the
  default datasets of pkp/datasets e8dafbc (2026-10-02).
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c (lib/pkp cf3f984335); 3.4 OJS d68934d0d1,
  OMP 0aec65441f (lib/pkp 767353f4fe); 3.3 OJS ac77c9fb35, OMP
  8e72fc8836 (lib/pkp ac3fa73402).
- Locale counts on main: 71 folders in lib/pkp `locale/`; 54
  `submission.po` files with the key; 12 `submission.po` files without
  it and 5 folders without a `submission.po`, all falling back to
  English.
- 3.4 (code): `locale/en/submission.po` holds the same text, and
  `ResendRequestReviewerForm::execute()` logs `submissionId`
  (line 115).
- 3.3 (code): lib/pkp has no `ResendRequestReviewerForm` and no
  `log.review.reviewerResendRequest`; the resend came in 3.4 with
  `pkp/pkp-lib#4789`.
- Introduced: `git log -S'{$submissionid}' -- locale/en_US/submission.po`
  in lib/pkp gives 79daa4200a, which added the line under `en_US`; on
  `locale/en/submission.po` the same search gives 4ad3d52ba2 (the
  `.po` files merge of `pkp/pkp-lib#8598`), 85ed7e6578 and 5cc1683e43. The
  GitHub API names `pkp/pkp-lib#8242` for 79daa4200a and
  `pkp/pkp-lib#13081` for the other two.
- The reviewer's email: `emails.reviewResendRequest.body` names
  `{$submissionTitle}` and no number; its text was not read on screen.
