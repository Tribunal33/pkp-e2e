# The Activity Log's copyright-agreement line shows "{$filename}" where the submitter's name belongs

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no copyright-agreement line)
- **Introduced** `pkp/pkp-lib#8941` for `pkp/pkp-lib#8933` · [13653090ce](https://github.com/pkp/pkp-lib/commit/13653090ce48072081ca249544e3ec468b53ddee) · 2023-05-17 (merged 2023-06-02) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a submitter (the user who ticks the copyright box and submits,
normally the author) completes a submission, the Activity Log's
agreement line opens with a raw placeholder where the submitter's name
belongs: "{$filename} (ccorino) agreed to the copyright terms for
submission." instead of "Carlo Corino (ccorino) agreed …".

The copyright box, and so this line, exists only in a journal, press or
server whose manager has set a Copyright Notice under Settings ›
Workflow.

## Impact

- **Lost:** nothing. The agreement and the notice agreed to are stored,
  and the line's "User" column names the submitter; only the line's
  text is garbled.
- **Who:** editors and managers reading a submission's Activity Log, on
  every copyright-confirmed submission, in every interface language.
- **Way round:** none needed. The lines already in the log read
  correctly once the string is fixed.

Low: the fault is in the wording of a line only staff read, and the
fact it should state sits in the column beside it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- The journal has a Copyright Notice. The dataset has none, and the
  wizard asks for the copyright agreement only when one is set, so
  steps 1–3 set it as the manager (OMP the press's, OPS the server's).

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Workflow, the "Submission" tab, its "Author Guidance"
   side tab.
3. In "Copyright Notice", type "Authors keep the copyright of their
   work." and press "Save"; "Saved" shows.
4. Log out. Sign in as the author `ccorino` (OMP: `aclark`).
5. Start a new submission (`/index.php/publicknowledge/en/submission`):
   title "u21w42 Copyright Agreed", section "Articles" (OMP: series
   "Library & Information Studies"; OPS: "Preprints"), language English,
   tick every box, "Begin Submission".
6. "Upload Files": upload a PDF (OPS: "Add File", label "PDF").
   "Continue" through "Details" (an abstract), "Contributors" and "For
   the Editors" (OPS: "For Readers") to "Review".
7. On "Review", under "Copyright", tick "Yes, I agree to the copyright
   statement.", press "Submit" and "Submit" in the dialog: "Submission
   complete".
8. Log out. Sign in as `dbarnes` and open the new submission's workflow
   (its ID is in the wizard's address, `?id=21` on OJS).
9. Press "Activity Log" in the header and read the "History" tab.

**Expected:** among the lines by Carlo Corino (OMP: Arthur Clark),
"Article submitted" (OMP "Initial submission completed.", OPS "Preprint
submitted") and

```
Carlo Corino (ccorino) agreed to the copyright terms for submission.
```

**Observed:**

```
{$filename} (ccorino) agreed to the copyright terms for submission.
```

(OMP: "{$filename} (aclark) agreed to the copyright terms for
submission."). The "User" column of that line reads "Carlo Corino"
(OMP "Arthur Clark").

## Cause

`PKPSubmissionController::submit()` (lib/pkp
`api/v1/submissions/PKPSubmissionController.php`, the
`confirmCopyright` branch) logs the agreement with the message key
`submission.event.copyrightAgreed` and stores `username`,
`userFullName` and `copyrightNotice` with it.
`EventLogEntry::getTranslatedMessage()` passes the stored values to the
string as parameters. The string asks for a value the entry never
stores (lib/pkp `locale/en/submission.po`):

```
msgid "submission.event.copyrightAgreed"
msgstr "{$filename} ({$username}) agreed to the copyright terms for submission."
```

so `{$filename}` stays in the text.

How it got there. The line came with `pkp/pkp-lib#8351` (3.4.0 RC1),
when the writer stored `name` and the string asked for `{$name}`. The
event-log refactor of `pkp/pkp-lib#8933`
([13653090ce](https://github.com/pkp/pkp-lib/commit/13653090ce48072081ca249544e3ec468b53ddee))
renamed the stored value to `userFullName`, in the writer and in the
upgrade's `I8933_EventLogLocalized::mapSettings()` (`0x10000009`:
`name` → `userFullName`), but left the string asking for `{$name}`.
Four days after that change was merged, `pkp/pkp-lib#9070`
([276ba73d4a](https://github.com/pkp/pkp-lib/commit/276ba73d4ae1c5767bb8c1f04d75b3a03c17e1c8),
for `pkp/pkp-lib#9067`) rewrote the event strings' placeholders to the
new names, in English and every translation. It gave the
`submission.event.participantAdded` and `participantRemoved` strings
`{$userFullName}`, and this string `{$filename}`, the name the file
event strings use.

Reach:

- Every entry of this type, new or old: entries written since 3.4.0 and
  the upgraded ones all store `userFullName` (checked in the code). So
  the string is the only wrong part, and fixing it corrects the lines
  already in the log (checked on screen with the fix).
- Every language: 35 of the 66 lib/pkp `submission.po` files carry
  `{$filename}` there, az, mk and pl still `{$name}`, and vi has a broken
  "{username})" opening (checked in the code). French (fr_CA, the
  dataset's second language) carries `{$filename}`.
- No other string renamed in `pkp/pkp-lib#9070` is wrong: the
  participant and file event strings got the names their writers store
  (checked in the code). Two other log lines print a placeholder,
  "{$submissionid}" on a resent review request and "{$formatName}" on a
  press's publication-format lines; they have other causes and are
  reported separately.

## Proposed fix

A proposal; the team decides. Ask for the stored name in the string: `{$userFullName}` in place of
`{$filename}` in lib/pkp `locale/en/submission.po`, and the same rename
in every translation of `submission.event.copyrightAgreed` (`{$name}`
in az, mk and pl; in vi the string today starts "{username})", which
becomes `{$userFullName} ({$username})`):

```diff
 msgid "submission.event.copyrightAgreed"
-msgstr "{$filename} ({$username}) agreed to the copyright terms for submission."
+msgstr "{$userFullName} ({$username}) agreed to the copyright terms for submission."
```

The whole change, 39 locale files, is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyright-agreed-line-raw-placeholder/fix.diff).
It was
tried on OJS, OMP and OPS: the line read "Carlo Corino (ccorino) agreed
to the copyright terms for submission." (OMP "Arthur Clark (aclark)
…"), and every other line of the same History read as before.

**Alternatives:**

- Store a `filename` value in the writer: there is no file. That would
  make the string fit a wrong name and leave the stored entries as they
  are.
- Fix only `en` and leave the translations to Weblate: the other
  languages would keep printing the placeholder until each translator
  noticed. `pkp/pkp-lib#9070`, which made this mistake, renamed the
  placeholders in every locale too.

**What goes with it:**

- No data repair (see Reach).
- The 15 locales with an empty translation of this string fall back to
  English, so the English change already fixes them.
- Backport: the same string with the same text on `stable-3_5_0` and
  `stable-3_4_0`. The diff's context lines differ per branch, so the
  rename is redone there rather than the diff applied.
- Test: a pkp-lib unit test that each `submission.event.*` string's
  placeholders are among the values its writer stores; pkp-e2e's
  submission-wizard scenario can assert this line's text once fixed.

Small: one placeholder in one string, a mechanical rename across its
translations.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyright-agreed-line-raw-placeholder/walk.js)
  takes the Steps: 1–3 and 8–9 itself, the wizard (4–7) through the
  shared `../editorial-role-submitter-no-acknowledgement/submit.js`. It
  also reads the stored entry from the database. It runs on an install
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/copyright-agreed-line-raw-placeholder/walk.js`
  (3.5: `PKP_E2E_LINE=stable-3_5_0` in front). The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/copyright-agreed-line-raw-placeholder/fix.diff ojs omp ops`,
  the walk again, then `revert` with the same arguments.
- Stored entry (main, OJS): `event_type` 268435465,
  `submission.event.copyrightAgreed`, settings `copyrightNotice`,
  `userFullName=Carlo Corino`, `username=ccorino`; the same shape on OMP
  and OPS and on 3.5.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  the default dataset of pkp/datasets 38ab955 (2026-09-30). No request
  failed and no page script error was recorded. The database plays no
  part in a missing placeholder; MySQL not checked.
- Tips: `main` OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7, their
  lib/pkp 2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS; the same
  `submission.po`); `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00, OPS
  cf4fce69bd, lib/pkp a9c76aed62; lib/pkp `stable-3_4_0` df13621c2d and
  OJS `stable-3_4_0` 9571d8fde7; lib/pkp `stable-3_3_0` d446601ebe.
- Code reads: 3.5 and 3.4, lib/pkp `locale/en/submission.po` (the same
  `{$filename}` string), the writer (`PKPSubmissionController` on 3.5,
  `PKPSubmissionHandler` on 3.4, both storing `userFullName`) and
  `EventLogEntry::getTranslatedMessage()` (3.4 passes the stored values
  the same way). `13653090ce` and `276ba73d4a` are on `stable-3_4_0`.
  3.3: no copyright-agreement log entry (the agreement is a required box
  on `PKPSubmissionSubmitStep1Form` and nothing is logged), so nothing
  to show.
- Introduced: `git blame` on the string lands on 276ba73d4a, which
  changed `{$name}` to `{$filename}`. The string and its writer first
  disagreed at 13653090ce, which renamed the stored `name` to
  `userFullName` while the string kept `{$name}`. Before that, the
  3.4.0 release candidates RC1–RC3 (lib/pkp 7c4f010e2a, 0ae9cd873b,
  797041e3fe) stored `name` for a `{$name}` string. 3.4.0-0 (lib/pkp
  32f8c1635f) shipped both 13653090ce and 276ba73d4a.
- Upstream search (2026-10-01, pkp/pkp-lib, pkp/ojs, pkp/ui-library):
  "copyright agreed", "agreed to the copyright terms",
  `copyrightAgreed`, "activity log copyright", "{$filename}", "event
  log variables locale". `pkp/pkp-lib#11997` (open) is about the file
  lines of logs upgraded from 3.2/3.3 showing "{$filename}" or a blank
  file name in some languages. That is another value, `filename` stored
  per language, not this line's missing name. `pkp/pkp-lib#9072`
  (closed, PR `pkp/pkp-lib#9087`) was a later locale-wide rename of
  other event strings and does not touch this one; the line went wrong
  in `pkp/pkp-lib#9070` for `pkp/pkp-lib#9067`.
- Not driven: 3.4 and 3.3 (code only); a French interface (the French
  string carries the same `{$filename}`, read in the code).
