# The activity log's copyright-agreement entry opens with a raw "{$filename}" placeholder instead of the author's name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no copyright-agreement entry)
- **Introduced** `pkp/pkp-lib#9070` for `pkp/pkp-lib#9067` · [276ba73d4a](https://github.com/pkp/pkp-lib/commit/276ba73d4ae1c5767bb8c1f04d75b3a03c17e1c8) · 2023-06-06 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When an author completes a submission with the copyright box ticked, the
activity log's agreement entry opens with a raw placeholder: "{$filename}
(ccorino) agreed to the copyright terms for submission.", with the
author's username in the brackets where their name should come first.

It shows on every journal, press or preprint server that sets a
copyright notice, since only then does the last step of the submission
form ask authors to agree. The sentence is built each time the log is
shown, so a corrected text also repairs the entries already stored.

## Impact

- **Lost.** Nothing: the entry is stored, and its "User" column and the
  username in brackets name who agreed.
- **Who.** Editors and managers reading a submission's "Activity Log", on
  every submission completed with a copyright notice set. The sentence
  appears nowhere else.
- **Way round.** None needed.

Low: a raw placeholder in a log sentence.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (context `publicknowledge`).
  The dataset sets no copyright notice, so step 2 sets one.

Steps (journal shown; the press and the preprint server differ where
bracketed):

1. Sign in as `dbarnes`.
2. Go to Settings › Workflow › "Submission" › "Author Guidance", type
   "Authors keep the copyright." in "Copyright Notice" and press "Save".
3. Sign out, and sign in as `ccorino` [press: `aclark`].
4. Open "New Submission" (`/index.php/publicknowledge/en/submission`).
   Type the title "Copyright log check", choose the section "Articles"
   [preprint server: "Preprints"; press: no section], choose English,
   tick both boxes and press "Begin Submission".
5. Press "Continue" through every step:
   - on "Upload Files", upload the article file [press: a manuscript
     file; preprint server: add a PDF galley];
   - on "Details", type an abstract (the journal's "Articles" and the
     preprint server's "Preprints" require one; the press does not);
   - [press: on "For the Editors", choose the series "Library &
     Information Studies"; preprint server: on "For Readers", answer the
     relation question].
6. On "Review", tick "Yes, I agree to the copyright statement.", press
   "Submit", then "Submit" in the confirmation. "Submission complete"
   appears.
7. Sign out, and sign in as `dbarnes`. Open the new submission's
   workflow and press "Activity Log".

**Expected.** The entry names the person who agreed:

```
2026-10-01   Carlo Corino   Carlo Corino (ccorino) agreed to the copyright terms for submission.
```

**Observed.**

```
2026-10-01   Carlo Corino   {$filename} (ccorino) agreed to the copyright terms for submission.
```

The press shows "{$filename} (aclark) agreed to the copyright terms for
submission."; the preprint server shows the same line as the journal.
The same log's "Article submitted" entry ("Initial submission
completed." on the press, "Preprint submitted" on the preprint server)
and its file entries ("Revision "article.pdf" was uploaded for file
46.") render normally.

## Cause

The English text of `submission.event.copyrightAgreed`
([`locale/en/submission.po` line 889](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/locale/en/submission.po#L888-L889))
is `{$filename} ({$username}) agreed to the copyright terms for
submission.`. The only writer of the entry,
`PKPSubmissionController::submit()`
([lines 906–922](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/api/v1/submissions/PKPSubmissionController.php#L906-L922)),
stores `username`, `userFullName` and `copyrightNotice`, and no
`filename`. The entry keeps the locale key and these parameters, and
`EventLogEntry::getTranslatedMessage()` builds the sentence when the log
is shown. `LocaleBundle::_format()` replaces only the placeholders it is
given a value for, so `{$username}` is filled and `{$filename}` stays as
typed.

The placeholder came in with 276ba73d4a, which renamed the event log's
placeholders in every `submission.po` to match the names the data is
stored under (`pkp/pkp-lib#9067`). It rightly turned `{$name}` into
`{$userFullName}` in the participant entries and into `{$filename}` in
the file entries, but also gave the copyright entry `{$filename}`. That
entry stores the name as `userFullName`: its stored key had been renamed
from `name` three weeks earlier (13653090ce, `pkp/pkp-lib#8933`), and the
3.4 upgrade moves older entries to the same key
(`I8933_EventLogLocalized::mapSettings()`).

Reach:

- Every copyright-confirmed submission on all three apps, in every
  language whose text uses `{$filename}` (35 files) or the earlier
  `{$name}` (`az`, `mk`, `pl`); `vi` has lost the placeholder
  altogether (`{username}) đã đồng ý …`). Walked: OJS, OMP and OPS in
  English on `main` and 3.5.
- Entries already stored hold the name under `userFullName`, so the
  corrected text shows it for them too (code; the sentence is not
  stored).
- No other screen: the key has this one writer, and
  `getTranslatedMessage()` has one caller, the activity log's grid
  (`EventLogGridCellProvider`) (code).

## Proposed fix

Put `{$userFullName}` in the copyright entry's text in every
`submission.po` that holds `{$filename}` or `{$name}` there
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyright-agreed-log-raw-placeholder/fix.diff),
pkp-lib only, the same for the three apps):

```diff
 msgid "submission.event.copyrightAgreed"
-msgstr "{$filename} ({$username}) agreed to the copyright terms for submission."
+msgstr "{$userFullName} ({$username}) agreed to the copyright terms for submission."
```

The diff makes the same one-placeholder change in the other 37
languages' files.

How this was settled:

- **Where the rule lives.** In the text: the writer and the 3.4 upgrade
  both store the name as `userFullName`. Storing a `filename` copy of the
  name instead would make the data fit a typo.
- **How the code base does it.** `submission.event.participantAdded`
  and `participantRemoved` read `{$userFullName} ({$username})`; the fix
  copies them.
- **Every instance.** A sweep of every `'message' => '…'` event-log
  writer in pkp-lib and OJS against its English text's placeholders
  found two more mismatches, left out as other entries:
  `log.review.reviewerResendRequest` reads `{$submissionid}` where the
  writer stores `submissionId`, and the task entries
  (`submission.event.task.created`, `.started`, `.notePosted`) read
  `{$userGroupName}` where the writer stores `userGroupNames`. Neither
  was driven.
- **What it touches.** The log's sentence only: no API field, hook or
  stored row changes, and no data needs repairing. It applies as written
  to 3.5 and 3.4.

Tried on `main`, on the three apps. With the diff applied, the walk read
"Carlo Corino (ccorino) agreed to the copyright terms for submission." on
the journal and the preprint server and "Arthur Clark (aclark) …" on the
press. The file entries, which keep their own `{$filename}`, read
"Revision "article.pdf" was uploaded for file 46." with the fix in and
out.

**Alternatives**

- Drop the name from the sentence ("{$username} agreed …"): loses the
  name the entry already stores, which the participant entries show.

**What goes with it**

- On `main`, `userFullName` has been a per-language property since
  173bde9155 (`pkp/pkp-lib#12821`), and the participant entries store
  `$user->getFullNames()`. The copyright writer still stores the single
  string `getFullName()`, which `PKPSchemaService::sanitize()` turns into
  an array and saves under the locale `0`. It reads back as a plain
  string, so the name shows, but storing `getFullNames()` in
  `PKPSubmissionController::submit()` would match the schema. Tried with
  the text change on `main`: the same sentences, the name stored under
  `en`. On 3.5 and 3.4 the property is a plain string, so the change is
  `main`'s alone.
- Weblate carries the translated texts; the fix edits their
  placeholders in the repository, as 276ba73d4a did, and the
  translators keep their wording. `vi`'s text needs a translator.

Small: one placeholder in each language file, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/copyright-agreed-log-raw-placeholder/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyright-agreed-log-raw-placeholder/walk.js)
  takes the Steps on the three apps and reads the stored entry; it also
  reads the file-upload entry as a control. It runs with
  `node bin/probe.js all shared/playwright/checks/issues/copyright-agreed-log-raw-placeholder/walk.js`
  on an install freshly loaded from the default dataset.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  27f1204 (2026-10-01). No request failed and no script error showed.
- Differences from the Steps: the script types the title "u21ir34
  copyright walk" and the notice "Authors keep the copyright. u21ir34",
  types an abstract on the press too, and ticks every box on "Review".
- Branch heads walked or read: `main` OJS 4408b94def (`lib/pkp`
  f5bd392a69), OMP 3b0ecf794 and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6).
  `stable-3_5_0` OJS 18d097d94e, OMP b24879c3d, OPS 3f0919468c
  (`lib/pkp` 1fb843f491). pkp-lib `stable-3_4_0` df13621c2d,
  `stable-3_3_0` d446601ebe.
- Code reads beyond the Cause: `EntityDAO::fromRow()` (a setting with an
  empty locale, `0` included, loads as a plain value) and
  `DataObject::setData()`, which is why entries stored under locale `0`
  on `main`, or with no locale on 3.4 and 3.5, show the name once the
  text is corrected. On `stable-3_4_0` the writer is
  `api/v1/submissions/PKPSubmissionHandler.php`, with the same text. On
  `stable-3_3_0` there is no `copyrightAgreed` key and no copyright event
  (`git grep`).
- Introduced: before 276ba73d4a the text read `{$name}`, wrong since
  13653090ce; the entry came in as 6d2a7ad3a2 (`pkp/pkp-lib#8351`,
  2023-02-08) with `name` stored and `{$name}` in the text.
- Not driven: an install upgraded from 3.3 or 3.4 (code only).
