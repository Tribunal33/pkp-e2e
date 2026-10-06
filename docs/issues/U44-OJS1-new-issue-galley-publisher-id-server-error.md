# A new issue galley with a Publisher ID is not saved: "Save" stays greyed with no message

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS (every release, 3.5.0rc2 to 3.5.0-5)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** no PR · [3e76f6d8ae](https://github.com/pkp/ojs/commit/3e76f6d8aeea4fc7b487cb3f0167a4035f653e18) ("Coding standards") · 2024-06-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#ojs1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Journal Manager adds a galley to an issue and types a Publisher ID in
"Create Issue Galley". On "Save" the request fails on the server. The
window stays open with a spinner beside a greyed "Save", no message
appears, and the galley is not added.

The upload and the typed fields are lost when the window is cancelled.
There is a way round: save the galley without a Publisher ID, then open
its "Edit" and add the Publisher ID there, which works. Nothing on screen
points to it.

It happens only on journals that turned on publisher IDs for issue
galleys, and on every new issue galley with a Publisher ID there.

## Impact

- **Lost**: the galley the manager tried to add, with its uploaded file
  and typed fields. No one is told why: the window just stops.
- **Who**: Journal Managers and editors who add issue galleys (a
  full-issue PDF) on a journal with "Enable for Issue Galleys" ticked
  under "Publisher ID". The box is off by default.
- **Way round**: save without a Publisher ID, then type it in the
  galley's "Edit" window. It works on screen, but nothing suggests it.

Medium: adding an issue galley with a Publisher ID always fails with a
server error and no message, but only where publisher IDs for issue
galleys are on, and a two-step way round on screen gets the galley saved
with its Publisher ID. It would be high if the way round did not exist.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`): the
  journal `publicknowledge` has "Vol. 2 No. 1 (2015)" under "Future
  Issues", with no issue galleys, and every box under "Publisher ID" is
  unticked.
- Any PDF file on your computer.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Issue Galleys" and press "Save".
3. Open Issues (`/index.php/publicknowledge/manageIssues`), "Future
   Issues". On "Vol. 2 No. 1 (2015)" press the row's arrow, then "Edit".
4. Open the "Issue Galleys" tab and press "Create Issue Galley".
5. Upload the PDF under "Issue Galley", type "PDF" in "Galley Label" and
   "u44a-1" in "Publisher ID".
6. Press "Save".

**Expected.** The window closes and "PDF" joins the list, with "u44a-1"
under "Publisher ID".

**Observed.** The window stays open with a spinner beside a greyed
"Save", and no message appears. The save request answers 500 with an
empty body (with `display_errors` off; with it on, the body carries the
same error), and the server log reads:

```
PHP Fatal error:  Uncaught TypeError: APP\issue\IssueGalleyDAO::pubIdExists(): Argument #3 ($excludeGalleyId) must be of type int, null given, called in …/classes/journal/JournalDAO.php on line 128 and defined in …/classes/issue/IssueGalleyDAO.php:69
```

After "Cancel" the list still reads "No Items".

Control: the same galley with "Publisher ID" left empty saves. Its
"Edit" then takes "u44a-1" and saves, and the list shows it.

## Cause

`IssueGalleyForm::validate()` (OJS,
`controllers/grid/issues/form/IssueGalleyForm.php`, line 118) checks that
the typed Publisher ID is not already used by another issue galley of the
journal. It calls `JournalDAO::anyPubIdExists()` with the ID of the
galley to leave out of the check, and passes `null` for a new galley:

```php
$journalDao->anyPubIdExists($journal->getId(), 'publisher-id', $publicGalleyId, Application::ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley ? $this->_issueGalley->getId() : null, true)
```

`anyPubIdExists()` documents that ID as an `int` with `0` as its
default, meaning "leave nothing out", and hands it on to
`IssueGalleyDAO::pubIdExists()`. Until 2024 that method took the ID
untyped and cast it with `(int)`, so `null` became `0` and the check
worked. 3e76f6d8ae ("Coding standards") declared its parameters
(`int $excludeGalleyId`) and dropped the casts. Since then a new galley's
`null` raises a `TypeError` before any query runs. The form's
`validate()` never returns, so the grid's `update()` answers 500, and
the legacy form shows nothing.

Reach:

- every new issue galley with a Publisher ID, including one that should
  be refused as a duplicate: the duplicate check never runs for a new
  galley (seen on screen). A value of digits only is refused first, with
  the usual notice, so it never reaches the call (seen on screen);
- an existing galley passes its own ID and saves (seen on screen);
- the other callers of `anyPubIdExists()` and `pubIdExists()` always
  pass a stored object's ID: `PKPPublicIdentifiersForm::validate()` on
  the "Identifiers" tabs, the one caller of OMP's `PressDAO` and OPS's
  `ServerDAO` twins of `anyPubIdExists()`; `PKPPubIdPlugin::checkDuplicate()`;
  OJS's `PubIdPlugin::checkDuplicate()` (the issue DAO); and OMP's
  `PubIdPlugin::checkDuplicate()` (`classes/plugins/PubIdPlugin.php`, the
  chapter DAO) (read in the code). OMP and OPS have no issue galleys.

## Proposed fix

Pass `0` for a new galley, the "leave nothing out" value that
`anyPubIdExists()` already uses as its default, and that
`anyPubIdExists()` sends to the DAOs of the other object types when it
checks them all
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-issue-galley-publisher-id-server-error/fix.diff)):

```diff
-            } elseif ($journalDao->anyPubIdExists($journal->getId(), 'publisher-id', $publicGalleyId, Application::ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley ? $this->_issueGalley->getId() : null, true)) {
+            } elseif ($journalDao->anyPubIdExists($journal->getId(), 'publisher-id', $publicGalleyId, Application::ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley?->getId() ?? 0, true)) {
```

The fix belongs in the form. It is the one caller that breaks the
documented `int` contract; every other caller passes a stored ID. It
keeps the purpose of 3e76f6d8ae, typed DAO methods.

Tried on `main`: with the fix in, step 6 saves and the list shows "PDF"
with "u44a-1". A second walk checks how far the fix reaches, with the fix
in and out. In both, an existing galley's Publisher ID saves, saves again
unchanged (its own value is not counted as a duplicate), and a new
galley's "12345" is refused as a number. With the fix in, a new galley
with "u44a-1" already in use is refused with "The public identifier
'u44a-1' already exists for another object of the same type. …", and a
new galley with "u44a-2" saves. Without the fix, both of those answer
500.

**Alternatives**

- Accept `?int` in `IssueGalleyDAO::pubIdExists()`: `anyPubIdExists()`
  documents and defaults `$assocId` as an `int` and sends it to every
  DAO, so the caller passing `null` is the one at fault; loosening one
  DAO leaves that contract broken for the next one.
- Coerce `$assocId` with `(int)` in `JournalDAO::anyPubIdExists()`: this
  hides a wrong argument instead of fixing it. OMP's and OPS's twins
  would need the same change.

**What goes with it**

- No API or plugin hook change, and no stored data to repair: the failed
  saves stored nothing.
- Backport: the diff applies to 3.5 as written. 3.4 and 3.3 do not need
  it.
- Guard: an e2e scenario on the issue galley form ("Create Issue Galley"
  with a Publisher ID saves, and a duplicate is refused), in pkp-e2e's
  spec U44.

Small: one argument in one form, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-issue-galley-publisher-id-server-error/walk.js)
  (helpers in `lib.js` beside it and in the U50 A11 walk's `lib.js`), run
  with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/new-issue-galley-publisher-id-server-error/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The same script with `neighbour` as
  its argument takes the second walk on a fresh load.
- Walked on `main` and `stable-3_5_0`, OJS, with the same observation on
  both. OMP and OPS have no issue galleys.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a); `stable-3_5_0` OJS
  091fb65453 (pkp-lib cf3f984335); `stable-3_4_0` OJS 75cc2d488b
  (pkp-lib 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib
  f6ab331645).
- 3.5 (walked), 3.4 and 3.3 (code): read
  `controllers/grid/issues/form/IssueGalleyForm.php` (3.3: `.inc.php`)
  `validate()`, `classes/journal/JournalDAO.php` (3.3: `.inc.php`)
  `anyPubIdExists()` and `classes/issue/IssueGalleyDAO.php` (3.3:
  `.inc.php`) `pubIdExists()`. All four branches pass `null` from the
  form; only 3.5 has the typed parameter.
- Introduced: `git blame` on `IssueGalleyDAO.php` line 69 gives
  3e76f6d8ae, whose diff replaces `pubIdExists($pubIdType, $pubId,
  $galleyId, $journalId)` and its `(int)` casts with the typed signature.
  GitHub lists no PR for the commit. Every 3.5 tag (3_5_0rc2, 3_5_0-0
  to 3_5_0-5) contains it; `stable-3_4_0` does not. The form's `null` is older: blame gives 55639fd811 (2023, a
  namespace change), and 3.3 has the same `null`.
- Upstream: searched pkp/pkp-lib and pkp/ojs, issues and PRs, for
  "issue galley publisher id", "create issue galley error", "issue
  galley TypeError", "Create Issue Galley", `IssueGalleyForm`,
  `pubIdExists`, `anyPubIdExists` and `excludeGalleyId`, and
  pkp/ui-library for "issue galley publisher". `pkp/pkp-lib#10821` (its
  PRs `pkp/pkp-lib#10826` and `pkp/ojs#4613` fixed other faults in
  `anyPubIdExists()` and `pubIdExists()`), `pkp/pkp-lib#12912` (a long
  galley label with the same endless spinner) and `pkp/pkp-lib#6405` (a
  2020 `seq` error on the same save) are other faults.
- Not driven: the "Identifiers" tabs and pub-ID plugins named under
  Cause's reach (code only).
