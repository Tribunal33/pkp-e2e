# Adding an issue galley with a Publisher ID hangs on "Save" and adds nothing

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** [3e76f6d8ae](https://github.com/pkp/ojs/commit/3e76f6d8aeea4fc7b487cb3f0167a4035f653e18) ("Coding standards", pushed without a PR) · 2024-06-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U44 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#ojs1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who uploads a new issue galley and types a Publisher ID that
is not only digits expects the galley to be added. The save fails on
the server: the window stays open with a spinner beside a greyed
"Save" and no message, and the galley is not added (the list still
reads "No Items"). "Cancel" still closes the window.

A value of digits alone is refused with a message, by the form's own
rule; every other value makes the save fail. There is a way round on
screen, which nothing points to. It happens only in a journal that has
turned on Publisher IDs for issue galleys, which is off by default.

## Impact

- **Lost.** The new issue galley: its upload and the typed label and
  Publisher ID are gone once the window is cancelled. Nothing is stored
  wrong, and no message says what went wrong.
- **Who.** A journal manager or editor on an issue's "Issue Galleys"
  tab, every time they add a galley with a Publisher ID that is not
  only digits, in a journal with "Enable for Issue Galleys" ticked (off
  by default).
- **Way round.** Save the new galley with "Publisher ID" empty, then
  "Edit" it and type the Publisher ID. Nothing gets worse with time.

Medium: adding the galley fails with no message, but a way round
exists on screen. It would be higher if many journals used Publisher
IDs on issue galleys.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Its issue
  "Vol. 2 No. 1 (2015)" is unpublished and has no galleys, and
  Publisher IDs are off for every kind of item.
- Any small PDF file.

1. Sign in as `dbarnes` (the Journal editor, who may change Settings).
2. Open Settings › Workflow › "Submission" › "Metadata".
3. Under "Publisher ID", tick "Enable for Issue Galleys" and press
   "Save".
4. Open Issues › "Future Issues", open the row "Vol. 2 No. 1 (2015)"
   with its arrow, and press "Edit".
5. Open the "Issue Galleys" tab (the list reads "No Items") and press
   "Create Issue Galley".
6. Upload the PDF, type `PDF` in "Label" and `u44r1-pdf` in "Publisher
   ID".
7. Press "Save".
8. Press "Cancel".

**Expected:** at step 7 the window closes and the "Issue Galleys" list
shows "PDF" with `u44r1-pdf` in its "Publisher ID" column.

**Observed:** at step 7 the window stays open with a spinner beside a
greyed "Save"; no message shows, in the window or as a notice. The save
request returned 500:

```
POST /index.php/publicknowledge/$$$call$$$/grid/issue-galleys/issue-galley-grid/update?issueId=2&issueGalleyId=   500
```

The server log:

```
PHP Fatal error:  Uncaught TypeError: APP\issue\IssueGalleyDAO::pubIdExists(): Argument #3 ($excludeGalleyId) must be of type int, null given, called in …/classes/journal/JournalDAO.php on line 128 and defined in …/classes/issue/IssueGalleyDAO.php:69
```

After step 8 the list still reads "No Items", also after closing and
reopening the issue.

The same galley saved with "Publisher ID" empty is added, and "Edit" on
it with `u44r1-pdf` typed saves and shows the value in the column.

## Cause

`IssueGalleyForm::validate()` (OJS
`controllers/grid/issues/form/IssueGalleyForm.php`, line 118) checks
that the typed Publisher ID is not already used by another issue galley
of the journal. It calls `JournalDAO::anyPubIdExists(…,
ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley ?
$this->_issueGalley->getId() : null, true)`, so a new galley, which has
no ID yet, passes `null` as the ID to leave out of the check.

`anyPubIdExists()` hands that value on unchanged to
`IssueGalleyDAO::pubIdExists(string $pubIdType, string $pubId, int
$excludeGalleyId, int $journalId)` (`classes/issue/IssueGalleyDAO.php`,
line 69). The `int` parameter refuses `null` with a `TypeError`, which
the request answers as a server error before the form can save or
report anything.

The `null` has been passed since before 3.3. Until 3e76f6d8ae the DAO
method had no parameter types and cast the value itself (`(int)
$galleyId`), so `null` became `0` and the query's `galley_id <> 0` left
out no galley. 3e76f6d8ae ("Coding standards") typed the parameters, as
the `PKPPubIdPluginDAO::pubIdExists()` interface types them for the
other DAOs, and dropped the cast, so the one caller that passes `null`
now fails.

Reach:

- The duplicate check for a new issue galley: it can no longer refuse a
  value another issue galley holds, since the save fails first (seen
  on screen).
- An existing issue galley passes its own ID and is unaffected: its
  Publisher ID saves, re-saves, and is refused when another galley has
  it (seen on screen).
- The other callers of `anyPubIdExists()` and `pubIdExists()`
  (`PKPPublicIdentifiersForm::validate()`,
  `PKPPubIdPlugin::checkDuplicate()` and the OJS and OMP
  `PubIdPlugin::checkDuplicate()`) all pass the ID of an object that
  already exists (read in the code). OMP's `PressDAO` and OPS's
  `ServerDAO` copies of `anyPubIdExists()` have no caller that passes
  `null`, and those apps have no issue galleys.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-issue-galley-publisher-id-save-error/fix.diff):
step 7 then saves and the list shows "PDF" with `u44r1-pdf`. A second
new galley with the same value is refused with "The public identifier
'u44r1-pdf' already exists for another object of the same type. Please
choose unique identifiers for the objects of the same type within your
journal.", as it was before the fault, and an existing galley's save
is unchanged.

Recommended: pass `0` for a new galley in `IssueGalleyForm::validate()`,
the value that means "leave nothing out" in `anyPubIdExists()` (its
default `$assocId = 0`, and the `$excludedId = 0` it passes for the
other kinds of item).

```diff
-            } elseif ($journalDao->anyPubIdExists($journal->getId(), 'publisher-id', $publicGalleyId, Application::ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley ? $this->_issueGalley->getId() : null, true)) {
+            } elseif ($journalDao->anyPubIdExists($journal->getId(), 'publisher-id', $publicGalleyId, Application::ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley?->getId() ?? 0, true)) {
```

Every `pubIdExists()` takes an `int` ID to leave out: the
`PKPPubIdPluginDAO` interface's, and `IssueGalleyDAO`'s, which does not
implement the interface but has the same signature. This form is the
only caller that breaks it, so the fix goes to that
caller and keeps the stricter types 3e76f6d8ae introduced.

**Alternatives:**

- `(int) $assocId` in `JournalDAO::anyPubIdExists()`, restoring the
  dropped cast one level up: it would also absorb a future `null`, but
  it hides the contract break the types were added to expose, and
  OMP's and OPS's copies of the method would stay as they are.
- `?int $excludeGalleyId` on `IssueGalleyDAO::pubIdExists()`: it
  departs from the signature every other `pubIdExists()` shares.

**What goes with it:**

- No change to the REST API, a plugin hook or stored data.
- Backport: it applies as written to `stable-3_5_0`, which has the same
  line; 3.4 and 3.3 do not have the fault.
- Guard: an e2e scenario in U44 that adds an issue galley with a
  Publisher ID and then a second one with the same value.

Small: one line in one form, passing the `0` that
`JournalDAO::anyPubIdExists()` already uses for "leave nothing out",
and an e2e scenario.

## Evidence

- Kept script that takes the Steps, then the empty-ID save and its
  "Edit", in the browser on an install loaded from PKP's default test
  dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-issue-galley-publisher-id-save-error/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/new-issue-galley-publisher-id-save-error/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says). `PHASE=neighbour` in front runs the checks of what the
  fix must leave alone: an existing galley's re-save of its own value
  and its refusal of another galley's, and a second new galley with the
  same value.
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/new-issue-galley-publisher-id-save-error/fix.diff ojs`,
  then walk.js and `PHASE=neighbour` walk.js, each on a freshly loaded
  dataset, then `node bin/try-fix.js revert ojs`. With the fix out, the
  second new galley's save answered 500.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc);
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), the same
    Observed, the same log line.
  - The fault does not depend on the database: the `TypeError` is
    raised before any query. MySQL not checked.
- 3.5, code: OJS 92b9a16b48, `IssueGalleyForm.php`, `JournalDAO.php`,
  `IssueGalleyDAO.php`; 3e76f6d8ae is in every 3.5 release (`3_5_0-0` on).
- 3.4, code: OJS `stable-3_4_0` at 9571d8fde7 (no 3e76f6d8ae),
  `IssueGalleyForm.php` and `IssueGalleyDAO.php`.
- 3.3, code: OJS `stable-3_3_0` at 9fdb9bcf9a, `IssueGalleyForm.inc.php`
  and `IssueGalleyDAO.inc.php`.
- Introduced: `git blame` on `IssueGalleyDAO.php` line 69 (3e76f6d8ae; the
  GitHub API lists no PR for it) and on `IssueGalleyForm.php` line 118
  (55639fd811, 2023, a namespace change).
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs and pkp/ui-library
  (issue galley publisher ID, issue galley error, `IssueGalleyForm`,
  `IssueGalleyDAO`, `pubIdExists`, `anyPubIdExists`,
  `excludeGalleyId`): nothing about this fault. `pkp/ojs#4613` (for
  `pkp/pkp-lib#10821`) fixed other callers of `pubIdExists()` in the
  URN plugin and left this one.
- Not driven: OMP and OPS, which have no issue galleys.
