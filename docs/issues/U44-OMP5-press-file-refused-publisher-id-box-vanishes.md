# On a press file's "Identifiers" tab, a refused Publisher ID makes the box disappear

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#765` for `pkp/pkp-lib#5430` · [fde7f3c8b](https://github.com/pkp/omp/commit/fde7f3c8b1b12209049c48776840eb6982f47ffa) · 2020-02-17 (merged 2020-02-20) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press manager opens a book file from the submission's Publication ›
"Publication Formats" list, in its "Edit a file" window, and types a
Publisher ID on the "Identifiers" tab that the tab refuses: digits only,
a "/", a value like "12-34", or one already in use. On "Save" the tab
shows the reason, but the "Publisher ID" box is gone: only the message,
"Cancel" and "Save" are left.

Nothing is lost, since the refused value was not saved. To try another
value the manager must close the "Edit a file" window and open its
"Identifiers" tab again.

It affects presses that tick "Enable for Files" under "Publisher ID",
which is off by default.

## Impact

- **Lost**: nothing.
- **Who**: press managers and editors, each time the "Edit a file"
  window's "Identifiers" tab refuses a value.
- **Way round**: reopen the "Edit a file" window.

Low: a re-drawn tab misses its box, and the task gets done after
reopening the window.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (or `stable-3_5_0`): submission
  5, "Bomb Canada and Other Unkind Remarks in the American Media", has
  the publication format "PDF" holding the file "epilogue.pdf", and
  every box under "Publisher ID" is unticked (the dataset's default).

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Files" and press "Save". This is
   what gives the file's "Edit a file" window its "Identifiers" tab.
3. Open submission 5 and, under Publication, "Publication Formats".
4. Under "PDF", press the arrow of "epilogue.pdf", then "Edit". The
   window "Edit a file" opens.
5. Open the "Identifiers" tab, type "12345" in "Publisher ID" and press
   "Save".

**Expected.** The tab shows the refusal above the "Publisher ID" box,
which still holds "12345", so another value can be typed.

**Observed.** The tab shows only:

```
Errors occurred processing this form
The public identifier '12345' must not be a number.
Cancel   Save
```

The "Publisher ID" box is gone. The save request answers 200 with the
re-drawn tab.

Control: on the same page, the format's own "Identifiers" tab (the
"PDF" row's arrow › "Edit", with "Enable for Publication Formats"
ticked) refuses "12345" with the same message and keeps the box with
"12345".

## Cause

OMP's `ManageFileApiHandler` (`controllers/api/file/ManageFileApiHandler.php`)
builds the tab with OMP's own `PublicIdentifiersForm` in `identifiers()`,
but with pkp-lib's base `PKPPublicIdentifiersForm` in
`updateIdentifiers()` and `clearPubId()`. Only OMP's subclass assigns
`enablePublisherId` to the template (in `fetch()`, from the press's
"Enable for Files" setting), and OMP's
`templates/controllers/tab/pubIds/form/publicIdentifiersForm.tpl` draws
the box only `{if $enablePublisherId}`. When `updateIdentifiers()`
refuses and re-draws the form, the base class leaves the variable unset,
so the box is left out.

fde7f3c8b (`pkp/pkp-lib#5430`, which split the publisher ID from the URL
path) added that `{if $enablePublisherId}` and switched `identifiers()`
to the subclass, but left the other two methods on the base form.

Reach:

- `clearPubId()` ("Clear" of a file's URN) builds the same base form
  but draws nothing, so it shows no symptom (code).
- OJS's twin, `ManageFileApiHandler` in OJS, and OMP's
  `ChapterGridHandler` and `PublicationFormatGridHandler` use the
  app's `PublicIdentifiersForm` in every method (code), so their tabs
  re-draw the box after a refusal (the format's tab on screen).

## Proposed fix

Use OMP's `PublicIdentifiersForm` in `updateIdentifiers()` and
`clearPubId()` too, as `identifiers()` and OJS's twin handler do, and
drop the unused import
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-refused-publisher-id-box-vanishes/fix.diff)):

```diff
-use PKP\controllers\tab\pubIds\form\PKPPublicIdentifiersForm;
@@ updateIdentifiers()
-        $form = new PKPPublicIdentifiersForm($submissionFile, $stageId);
+        $form = new PublicIdentifiersForm($submissionFile, $stageId);
@@ clearPubId()
-        $form = new PKPPublicIdentifiersForm($submissionFile, $stageId);
+        $form = new PublicIdentifiersForm($submissionFile, $stageId);
```

OMP's subclass adds three things: `fetch()` assigns `enablePublisherId`;
`execute()` calls the parent and then saves a chapter, a branch skipped
for a file; `getAssocType()` returns the chapter type for a chapter and
otherwise defers to the parent. So for a file the change alters nothing
but the re-drawn tab.

Tried on `main`: with the fix in, step 5 shows the refusal above the
box, which holds "12345"; a valid value in the same walk still saves and
closes the window.

**Alternatives**

- Assign `enablePublisherId` in the base form: pkp-lib cannot know each
  app's setting values ("file", "issue", …), which is why the apps
  subclass it.
- Drop the `{if}` in the template: the box would show on tabs where the
  press has not turned publisher IDs on.

**What goes with it**

- No API, hook or stored data change.
- Backport: the diff applies to 3.5 and 3.4 as written; 3.3 has the same
  two calls in `ManageFileApiHandler.inc.php` with `import()`.
- Guard: an e2e scenario in pkp-e2e's spec U44: a refused value on a
  press file's "Identifiers" tab keeps the box.

Small: two class names in one handler, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/walk.js)
  of the companion report on the Publisher ID never kept. Its OMP part
  takes this report's steps 1 to 4, saves a valid value, and then takes
  this report's step 5 (its own step 7). Run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The same script with `control` as
  its argument takes the control on the format's tab. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-file-refused-publisher-id-box-vanishes/fix.diff omp`.
- The control on the format's tab was walked on OMP `main` only.
- Tips: `main` OMP 3b0ecf794 (pkp-lib 3dc90c81a6); `stable-3_5_0` OMP
  9c5e24246 (pkp-lib cf3f984335); `stable-3_4_0` OMP 0aec65441;
  `stable-3_3_0` OMP 8e72fc883.
- 3.5 (walked), 3.4 and 3.3 (code): read OMP
  `controllers/api/file/ManageFileApiHandler.php` (3.3: `.inc.php`) and
  `templates/controllers/tab/pubIds/form/publicIdentifiersForm.tpl`. All
  four branches build `PKPPublicIdentifiersForm` in `updateIdentifiers()`
  and `clearPubId()` and gate the box on `$enablePublisherId`.
- Introduced: `git log -L` on `updateIdentifiers()` and `git log -S`
  on the template's `enablePublisherId` both lead to fde7f3c8b, whose
  diff changes `identifiers()` to the app form and adds the template's
  `{if}`. PR from GitHub's `commits/<sha>/pulls`.
- Not driven: the file's URN "Clear" (`clearPubId()`), code only.
