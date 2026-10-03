# A format file's History records a revoked proof approval as a sign-off, the same as the approval

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** commit with no pull request or issue · [09a406a0ff](https://github.com/pkp/omp/commit/09a406a0ffec6ac933e6f640360aeb9d927eaebd) · 2015-10-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a book's "Publication Formats" page, "Approve Proof" and "Revoke
Proof Approval" on a format's file each add the same two lines to the
file's "More Information" › "History": 'The metadata for file "<file
name>" was edited by <username>.' and '"<full name>" (<username>) has
signed off on the signoff for "<file name>."'.

Each line names the person who pressed "OK" and carries the date. Only
the verb is wrong, so a revoke can be told from an approval only by the
order of the pairs.

## Impact

- **Lost.** No data or work. The History names who acted and when, but
  calls every revoke a sign-off.
- **Who.** Press managers and editors who approve and revoke proofs, and
  anyone who later reads the file's History to see what happened.
- **Way round.** The approval itself works, and the row's "Approved" or
  "Awaiting Approval" shows the state now. A file starts unapproved and
  the pairs alternate, so a reader can work out which pair was the
  revoke by counting.

Low: the task gets done and only the wording of a history line is
wrong. A press that relies on the History as its record of who
withdrew an approval would rate it higher.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
  Book 4, "How Canadians Communicate: Contexts of Canadian Popular
  Culture", is in Production with `dbarnes` assigned. Its one format,
  "PDF", is remotely hosted and takes no files, so the steps add a
  format.
- A PDF on hand named `u73h-proof.pdf`.

Steps:

1. Sign in as `dbarnes` (the Press editor).
2. On the dashboard, press "View" on book 4.
3. In the side menu choose "Publication" › "Publication Formats".
4. Press "Add publication format", type the name "PDF u73h" and press
   "OK".
5. In the "PDF u73h" row press "Change File". Choose the component "Book
   Manuscript", upload `u73h-proof.pdf`, then "Continue", "Continue" and
   "Complete". The file is listed under "PDF u73h" and reads "Awaiting
   Approval".
6. Press the arrow before `u73h-proof.pdf`, then "More Information".
   Open the "History" tab, read it, and press "Close".
7. Press the file's "Awaiting Approval". In the "Approve Proof" window
   press "OK". The file reads "Approved".
8. Open "More Information" › "History" again, read it, and close it.
9. Press the file's "Approved". In the "Revoke Proof Approval" window
   press "OK". The file reads "Awaiting Approval".
10. Open "More Information" › "History" again and read it.

**Expected.** Step 8 adds a line saying that `dbarnes` approved the
proof `u73h-proof.pdf`. Step 10 adds a line saying that he revoked that
approval.

**Observed.** Steps 8 and 10 each add the same two lines:

```
Daniel Barnes | The metadata for file "u73h-proof.pdf" was edited by dbarnes.
Daniel Barnes | "Daniel Barnes" (dbarnes) has signed off on the signoff for "u73h-proof.pdf."
```

After step 10 the History holds both pairs above the two upload lines,
and nothing in it says that the approval was revoked.

## Cause

OMP's `PublicationFormatGridHandler::setProofFileCompletion()` handles
both windows. The link that opens it passes the new state
(`'approval' => !$submissionFile->getData('viewable')` in
`PublicationFormatGridCellProvider::getCellActions()`). The handler saves
the file with `viewable` set to that state, then writes one log entry
whatever the state is
([line 618](https://github.com/pkp/omp/blob/3b0ecf794c/controllers/grid/catalogEntry/PublicationFormatGridHandler.php#L618)):

```php
'eventType' => SubmissionFileEventLogEntry::SUBMISSION_LOG_FILE_SIGNOFF_SIGNOFF,
...
'message' => 'submission.event.signoffSignoff',
```

`submission.event.signoffSignoff` ('"{$userFullName}" ({$username}) has
signed off on the signoff for "{$filename}."') dates from the time when
file sign-offs could only be given. 09a406a0ff added the approval as a
switch you can turn on and off ("Fix proof file approval process") and
kept the old sign-off line for both directions. The neighbouring
actions in the same class already pick their event type and their line
by the new state: `setApproved()` writes `…_PUBLICATION_FORMAT_PUBLISH`
with `submission.event.publicationFormatPublished` or `…_UNPUBLISH` with
`…Unpublished`, and `setAvailable()` does the same for
`…MadeAvailable` and `…MadeUnavailable`.

The first of the two lines is not part of the fault. The handler saves
the file through `Repo::submissionFile()->edit()`, which writes
`submission.event.fileEdited` for any change to a file. That is the same
line the file's "Edit" › "Save" writes.

Reach:

- The book's Activity Log gets only that generic line, for an approval
  and for a revoke alike (read in the code and in the stored rows), so
  it cannot tell the two apart either.
- Only OMP: OJS and OPS have no publication formats, and
  `SUBMISSION_LOG_FILE_SIGNOFF_SIGNOFF` and `signoffSignoff` have this
  one writer in all three apps and their pkp-lib (read in the code).
- Lines already stored stay as they are: a stored entry does not record
  which way the switch went, so the fix proposes no repair.

## Proposed fix

Choose the message by the state just saved, as `setApproved()` and
`setAvailable()` do, and add two OMP locale keys beside the format
events
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/proof-approval-revoke-logged-as-sign-off/fix.diff)):

```diff
-                'message' => 'submission.event.signoffSignoff',
+                'message' => $submissionFile->getData('viewable') ? 'submission.event.proofApproved' : 'submission.event.proofApprovalRevoked',
```

```
msgid "submission.event.proofApproved"
msgstr "\"{$userFullName}\" ({$username}) approved the proof \"{$filename}\"."

msgid "submission.event.proofApprovalRevoked"
msgstr "\"{$userFullName}\" ({$username}) revoked the approval of the proof \"{$filename}\"."
```

The new keys go in OMP, beside the format events, because only OMP
writes them. pkp-lib's unused `submission.event.proofsApproved` ('"{$userFullName}"
({$username}) has approved the proofs for "{$publicationFormatName}."')
does not fit: it names a format, not a file, has no revoke partner, and
would make the fix a change in two repositories.

Tried on OMP `main`: with the diff applied, step 8 added '"Daniel
Barnes" (dbarnes) approved the proof "u73h-proof.pdf".' and step 10
'"Daniel Barnes" (dbarnes) revoked the approval of the proof
"u73h-proof.pdf".', each beside the unchanged "metadata … was edited"
line.

**Alternatives**

- A separate event type for the revoke, as the neighbouring actions
  have. This needs a new constant in pkp-lib's
  `SubmissionFileEventLogEntry`, so two repositories, and no code reads
  the file event's type, so the message alone is enough. Whoever takes
  this needs a value nobody uses: `SUBMISSION_LOG_FILE_SIGNOFF_SIGNOFF`'s
  0x50000007 is shared with `PKPSubmissionEventLogEntry::SUBMISSION_LOG_TASK_FILE_UPLOADED`,
  which `TaskResource` compares by value (harmless today, since task
  entries are scoped to a task).
- Also write the new line to the book's Activity Log, and save the file
  with `edit(..., false)` so that the generic "metadata … was edited"
  line goes. That changes what the Activity Log shows for every approval,
  which is a product choice and not needed for this fault.
- Rewording `signoffSignoff` to cover both directions would leave one
  line for two actions.

**What goes with it**

- The new keys reach the other languages through the usual translation
  flow. `signoffSignoff` stays: stored rows keep the key and are
  translated when shown (`EventLogEntry::getTranslatedMessage()`), so
  every approval logged before the fix still needs it.
- Guard: an e2e check that approves and revokes a format file and reads
  the two History lines.
- Backport: `stable-3_5_0` and `stable-3_4_0` have the same handler and
  the same `locale/en/submission.po`. The changed line is the same
  there, but the hunk's context differs (no `impersonatedUserId`), so
  the diff needs a fresh context. `stable-3_3_0` logs through
  `SubmissionFileLog::logEvent()` with the parameters `name` and
  `file`, so its keys would use `{$name}` and `{$file}` and go in
  `locale/en_US/submission.po`.

Small: one line in one OMP handler and two locale strings, following
the pattern beside it, plus a test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/proof-approval-revoke-logged-as-sign-off/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/proof-approval-revoke-logged-as-sign-off/walk.js)
  takes steps 1 to 10. Run it on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/proof-approval-revoke-logged-as-sign-off/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/proof-approval-revoke-logged-as-sign-off/fix.diff omp`,
  then reverted.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL. Nothing here
  depends on the database. Datasets: pkp/datasets 566bb1f (2026-10-03).
  No request failed and no
  script error was logged on either line.
- The stored `event_log` rows after the walk on `main`: per press of
  "OK", one `submission.event.fileEdited` on the file and one on the
  book, and one `submission.event.signoffSignoff` (type `0x50000007`) on
  the file only, as the code writes them.
- Tips: OMP `main` 3b0ecf794c (pkp-lib 3dc90c81a6), `stable-3_5_0`
  9c5e24246c (pkp-lib cf3f984335), `stable-3_4_0` 0aec65441 (pkp-lib
  767353f4fe), `stable-3_3_0` 8e72fc883 (pkp-lib ac3fa73402).
- Code reads:
  - `PublicationFormatGridHandler::setProofFileCompletion()` on each
    branch: the single `signoffSignoff` line at 618 on `main`, 614 on
    3.5, 615 on 3.4, and on 3.3 the `SubmissionFileLog::logEvent()` call
    at line 552 of `PublicationFormatGridHandler.inc.php`. 3.3 also
    saves through `Services::get('submissionFile')->edit()`, which writes
    the "metadata … was edited" line too
    (`PKPSubmissionFileService::edit()`).
  - `submission.event.signoffSignoff` in pkp-lib's `locale/en/submission.po`
    (`en_US` on 3.3). `PublicationFormatGridCellProvider::getCellActions()`
    (the `approval` parameter), `setApproved()` and `setAvailable()` on
    `main`. `Repository::edit()` in pkp-lib's `classes/submissionFile`.
  - A search of OJS, OMP and OPS on `main` (with their pkp-lib) for
    `SUBMISSION_LOG_FILE_SIGNOFF_SIGNOFF`, `signoffSignoff` and
    `proofsApproved`: the one writer above for the first two, none for
    `proofsApproved`.
- Introduced: `git log -S` on `SUBMISSION_LOG_FILE_SIGNOFF_SIGNOFF` in
  OMP. 6fa86b62fe (2023, `pkp/pkp-lib#8933`, the event-log refactor)
  rewrote the call into today's shape. 09a406a0ff added
  `setApproval()`, a two-way approval, with this line. Before it the
  line was written by the one-way file sign-off (`SIGNOFF_SIGNOFF`
  signoffs, moved to pkp-lib in 56e7ae0c9, 2013).
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched for "proof
  approval log", "revoke proof approval", "Approve Proof", "Revoke
  Proof Approval", "signed off on the signoff", "signoffSignoff" and
  `setProofFileCompletion`. The candidates read (`pkp/pkp-lib#797`, a
  broken approval window, and `pkp/pkp-lib#2219`, too many clicks to
  approve) are other faults.
