# After a refused Publisher ID, a format file's "Identifiers" tab loses its Publisher ID box

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#765` for `pkp/pkp-lib#5430` · [fde7f3c8b1](https://github.com/pkp/omp/commit/fde7f3c8b1b12209049c48776840eb6982f47ffa) · 2020-02-17 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U44 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp5), with [A Publisher ID typed for a publication format's file is dropped on "Save", with no message](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OMP5-press-file-publisher-id-not-kept.md)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A press editor types a Publisher ID that the "Identifiers" tab of a
publication format's file (a format file) refuses: digits alone, a "/",
or a value like "12-34". The refusal message shows, but the "Publisher
ID" box disappears from the tab, leaving only the message, "Cancel" and
"Save", so the value cannot be corrected where it was typed.

Even an accepted value is not saved on this tab today
([A Publisher ID typed for a publication format's file is dropped on "Save", with no message](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OMP5-press-file-publisher-id-not-kept.md)).
This fault is independent of that one: it shows today and still shows
with that report's fix in. Its own fix is in the file window's
server-side handler.

It happens only in a press that has ticked "Enable for Files" under
Publisher ID, which is off by default.

## Impact

- **Lost.** Nothing: the refused value was not going to be saved, and
  nothing stored changes.
- **Who.** Press managers, editors and the production staff on a format
  file's "Edit a file" › "Identifiers", after each refused value.
- **Way round.** "Cancel", then the file's "Edit" › "Identifiers" again,
  which shows the box. "Cancel" closes the whole window, so edits not yet
  saved on its "Edit Metadata" tab go too; each tab has its own "Save",
  so nothing already saved is lost.

Low: the tab misleads after a refusal, but the task can be done by
reopening the window.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Its
  submission 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", has a publication format "PDF" holding six files, among
  them "chapter1.pdf". Publisher IDs are off for every kind of item.

Setup:
1. Sign in as `rvaca` (Press manager).
2. Open Settings › Workflow › "Submission" › "Metadata".
3. Under "Publisher ID", tick "Enable for Files" and "Enable for
   Publication Formats" (the second only for the comparison below), and
   press "Save".
4. Sign out.

A refused value:
5. Sign in as `dbarnes` (Press editor).
6. Open submission 14, then "Publication Formats" in its Publication
   area.
7. Under "PDF", open the file row "chapter1.pdf" with its arrow and
   press "Edit". The window "Edit a file" opens.
8. Open "Identifiers": it shows an empty "Publisher ID" box.
9. Type `12345` and press "Save".

**Expected:** the window stays open; the tab reads "Errors occurred
processing this form" and "The public identifier '12345' must not be a
number.", and the "Publisher ID" box still holds `12345` to be
corrected.

**Observed:** the window stays open and the tab reads:

```
Errors occurred processing this form
The public identifier '12345' must not be a number.
Cancel  Save
```

The "Publisher ID" box is gone. No request failed and no error was
logged.

For comparison, open the "PDF" format row's own arrow (not a file row),
press "Edit", then "Identifiers": the same `12345` is refused with the
same message and the box stays, holding `12345`.

## Cause

OMP's `ManageFileApiHandler` (`controllers/api/file/ManageFileApiHandler.php`)
builds the tab with OMP's `PublicIdentifiersForm` in `identifiers()`
(line 80), but builds it with lib/pkp's base `PKPPublicIdentifiersForm`
in `updateIdentifiers()` (line 97) and `clearPubId()` (line 119). When
the save is refused, `updateIdentifiers()` renders the tab again with
`$form->fetch()`. Only OMP's `PublicIdentifiersForm::fetch()` assigns
`enablePublisherId` from the press's "Publisher ID" settings; the base
form never does, so the guard `{if $enablePublisherId}` in OMP's own
`templates/controllers/tab/pubIds/form/publicIdentifiersForm.tpl`
(line 56) leaves the box out.

fde7f3c8b1 (`pkp/pkp-lib#5430`, splitting the publisher ID from the URL
path) made the box optional per kind of item: it added that guard to the
template and the `fetch()` that sets it to OMP's form, and switched
`identifiers()` to OMP's form. It left `updateIdentifiers()` and
`clearPubId()` on the base form, which until then had rendered the box
unconditionally.

Reach:

- A refused URN suffix on the same tab, with the URN plugin on for
  files, also renders the tab without the box (read in the code).
- A successful save is unaffected: it closes the window without
  rendering the tab (seen on screen). `clearPubId()` renders nothing, so
  its base form has no visible effect (read in the code).
- Every other handler builds the tab with the app's form in all its
  operations: OMP's `ChapterGridHandler` and `PublicationFormatGridHandler`,
  OJS's and OPS's `ManageFileApiHandler` and galley grid handlers, and
  OJS's `IssueGridHandler` (read in the code; the format's tab seen on
  screen).

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-publisher-id-box-gone-after-refusal/fix.diff):
step 9 then shows the message with the box still holding `12345`. The
format's own tab refuses and keeps its box as before, and with "Enable
for Files" unticked the file's window still has no "Identifiers" tab.

Recommended: build the form with OMP's `PublicIdentifiersForm` in
`updateIdentifiers()` and `clearPubId()`, as `identifiers()` already
does, and remove the base form's now unused
`use PKP\controllers\tab\pubIds\form\PKPPublicIdentifiersForm;`. Three
changed lines:

```diff
-use PKP\controllers\tab\pubIds\form\PKPPublicIdentifiersForm;
…
-        $form = new PKPPublicIdentifiersForm($submissionFile, $stageId);
+        $form = new PublicIdentifiersForm($submissionFile, $stageId);
```

OMP's form differs from the base form only in `fetch()` (the
`enablePublisherId` flag), `execute()` (an extra save for chapters) and
`getAssocType()` (chapters), so for a file nothing changes but the
rendered box.

**Alternatives:**

- Assigning `enablePublisherId` in lib/pkp's `PKPPublicIdentifiersForm::fetch()`:
  the flag depends on each app's kinds of item, which the app forms own.

**What goes with it:**

- No change to the REST API, a plugin hook or stored data.
- Backport: the same three lines on OMP `stable-3_5_0` and
  `stable-3_4_0`; on `stable-3_3_0` the same change in
  `ManageFileApiHandler.inc.php`, with its `import()` of
  `controllers.tab.pubIds.form.PublicIdentifiersForm` in place of the
  base form's.
- Guard: an e2e scenario that types a refused value on a format file's
  tab and finds the box still there with the value.

Small: three lines in one OMP handler.

## Evidence

- Kept script that takes the Steps in the browser on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-publisher-id-not-kept/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/press-file-publisher-id-not-kept/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front). It
  differs from the Steps in one way: before typing `12345` it saves a
  valid value and reopens the tab. The code shows this makes no
  difference: the refusal path renders the base form, which never
  assigns `enablePublisherId`, whatever came before. `PHASE=neighbour`
  in front runs the comparison (with "Enable for Publication Formats"
  ticked) and the file's window with "Enable for Files" unticked.
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-file-publisher-id-box-gone-after-refusal/fix.diff omp`,
  then walk.js and `PHASE=neighbour` walk.js, each on a freshly loaded
  dataset, then `node bin/try-fix.js revert omp`. With the companion
  report's fix applied alone, step 9 still lost the box.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `omp/main/pgsql` and `omp/stable-3_5_0/pgsql`, no upgrade
  needed:
  - main: OMP 3b0ecf794 (lib/pkp 3dc90c81a6);
  - stable-3_5_0: OMP 3081c9b00 (lib/pkp a9c76aed62), the same
    Observed.
- 3.5, code: OMP 3081c9b00, `ManageFileApiHandler.php` (lines 80, 97,
  119 as on `main`; the `use` line at 24) and OMP's
  `publicIdentifiersForm.tpl`.
- 3.4, code: OMP `stable-3_4_0` at 0aec65441: the same handler lines
  (the `use` line at 25), the same template guard and form `fetch()`.
- 3.3, code: OMP `stable-3_3_0` at 8e72fc883: `ManageFileApiHandler.inc.php`
  builds `PublicIdentifiersForm` in `identifiers()` (line 64) and
  `PKPPublicIdentifiersForm` in `updateIdentifiers()` (line 79) and
  `clearPubId()` (line 99); the template has the guard (line 55).
  fde7f3c8b1 is in every release from `3_2_0-0` on.
- "Cancel" and the window: lib/pkp `js/controllers/form/FormHandler.js`
  (`cancelForm()` closes the window; each tab's form saves on its own).
- Introduced: `git log -S'enablePublisherId'` on OMP's form and
  template, and `-S'new PKPPublicIdentifiersForm'` on the handler: the
  base form dates from 773825db3 (2016, `pkp/pkp-lib#1527`), when the
  box was always shown; fde7f3c8b1 (`pkp/omp#765`, merged 2020-02-20)
  added the guard and switched only `identifiers()`.
- Not driven: OJS and OPS, whose file handlers already use their app
  form and offer no Publisher ID for files; the URN suffix refusal on a
  file's tab (read in the code).
