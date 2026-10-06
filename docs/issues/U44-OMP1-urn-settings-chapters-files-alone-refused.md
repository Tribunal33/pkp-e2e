# A press cannot save URN settings with only "Chapters" or "Files" ticked

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#306` for `pkp/pkp-lib#1527` (files) · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana); `pkp/omp#498` for `pkp/pkp-lib#1692` (chapters) · [83dd274bc1](https://github.com/pkp/omp/commit/83dd274bc17a7313d396d4b02962248fa742bcc4) · 2018-02-07 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press manager who ticks only "Chapters", only "Files", or only those
two under "Press Content" in the URN plugin's settings window cannot
save. "Save" keeps the window open with "Please choose the objects URNs
should be assigned to." Ticking "Monographs" or "Publication Formats"
as well lets the save through.

On a journal, any one of "Issues", "Articles" or "Galleys" ticked
alone saves. Preprint servers have no URN plugin.

## Impact

- **Who**: a press manager setting up URNs for chapters or files only,
  once, when configuring the plugin. A press already holding "Chapters"
  or "Files" alone keeps it, but cannot save any other change in the
  window (a prefix, a pattern) until it ticks one more kind.
- **Way round**: also tick "Monographs" or "Publication Formats" and
  never assign those URNs. Publishing does not assign a URN to anything;
  an editor assigns each one on the item's "Identifiers" tab. The cost
  is clutter: every monograph's (or format's) identifiers screen shows
  an empty URN field, and the publish window's URN table shows a
  warning-marked "Unassigned" row for each such item on every
  publication. The row is information only; nothing has to be clicked
  past.

Low: the press gets chapter and file URNs with that clutter. It would
be medium if the extra kind's URNs were assigned without an editor
asking.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP. The "URN" plugin is off in
  the dataset.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins".
3. Under "Public Identifier Plugins", tick "Enabled" on the "URN" row.
4. Click the "URN" row's arrow, then "Settings". The "URN" window opens
   with nothing ticked under "Press Content".
5. Under "Press Content", tick "Chapters" only.
6. Fill "URN Prefix" with `urn:nbn:de:0000-`, choose `urn:nbn:de` as
   "Namespace", fill "Resolver URL" with `https://nbn-resolving.de/`,
   and click "Save".
7. If the window has closed, open it again as in step 4. Untick
   "Chapters", tick "Files", and click "Save".
8. If the window has closed, open it again as in step 4. Tick
   "Chapters" again, so that "Chapters" and "Files" are ticked, and
   click "Save".

**Expected**: each "Save" closes the window with "Your changes have
been saved.", and on reopening the window the ticked boxes are still
ticked.

**Observed**: steps 6, 7 and 8 each keep the window open, the boxes as
ticked and the other fields as filled, with this at the top:

```
Errors occurred processing this form:
Please choose the objects URNs should be assigned to.
```

Ticking "Publication Formats" as well and clicking "Save" closes the
window with "Your changes have been saved."; on a journal, "Galleys"
alone under "Journal Content" saves.

## Cause

`URNSettingsForm::__construct()` in OMP's
`plugins/pubIds/urn/classes/form/URNSettingsForm.php` adds the
`urnObjects` check, which requires at least one kind to be ticked:

```php
return $form->getData('enableIssueURN') || $form->getData('enablePublicationURN') || $form->getData('enableRepresentationURN');
```

The press window has four boxes, `enablePublicationURN` ("Monographs"),
`enableChapterURN` ("Chapters"), `enableRepresentationURN` ("Publication
Formats") and `enableSubmissionFileURN` ("Files"), and no issue box. The
check names a box the press form never has and leaves out two that it
does, so "Chapters" and "Files" never count.

The line is OJS's check, copied when the plugin came to OMP in
825986f471 with the "Files" box already in the window. 83dd274bc1 then
added the "Chapters" box and its pattern check but not this line, and
8cadd091c3 (`pkp/omp#721`, publications) renamed the monograph key and
left the rest. The four per-kind pattern checks below it in the same
constructor already name all four of OMP's kinds.

Reach:

- Every press: the only path to the URN settings is this window
  (walked on `main` and 3.5).
- Nothing reads the refused combination elsewhere: the plugin's
  per-kind switch, `URNPubIdPlugin::isObjectTypeEnabled()`, reads each
  `enable{Kind}URN` on its own, and `addPublishFormNotice()` already
  handles chapter-only and file-only setups (code).
- OJS: its check names its own three boxes ("Issues", "Articles",
  "Galleys"), and "Galleys" alone saves (code and screen). OPS has no
  URN plugin.

## Proposed fix

Name OMP's four kinds in the check
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/fix.diff)):

```diff
-            return $form->getData('enableIssueURN') || $form->getData('enablePublicationURN') || $form->getData('enableRepresentationURN');
+            return $form->getData('enablePublicationURN') || $form->getData('enableChapterURN') || $form->getData('enableRepresentationURN') || $form->getData('enableSubmissionFileURN');
```

The rule lives in OMP's own form, the one place it is checked. The list matches the four `enable…URN` keys of the form's own
`_getFormFields()`, as the pattern checks already do. Tried on OMP
`main`: "Chapters" alone, "Files" alone and both now
save and stay ticked on reopening; "Save" with nothing ticked is still
refused with the same message, and "Monographs" alone still saves, as
it does without the fix.

**Alternatives**:

- Build the list from `_getFormFields()`: no
  other pub-id form does it, and four names in one line are easy to keep
  in step.
- Keep `enableIssueURN` in the list: nothing in OMP sets it, so it only
  misleads the next reader.

**What goes with it**:

- No stored data to repair: a refused save stores nothing.
- Backport: the diff applies as it stands on `stable-3_5_0` and
  `stable-3_4_0` (`URNSettingsForm.php`). On `stable-3_3_0` the same
  line sits in `URNSettingsForm.inc.php`, tab-indented, beside the
  unnamespaced `FormValidatorCustom`, so the diff does not apply there
  and the one-line change is made by hand.
- Guard: an e2e scenario that saves the press window with "Chapters"
  alone and with "Files" alone (a Planned item in spec U44).

Small: one line in OMP's plugin form, and an e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all
  shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js`
  on an install reset to the default dataset (its header gives the reset
  and the 3.5 commands). It takes Steps 1 to 8 and the control on OMP,
  and the "Galleys" control on OJS. `WALK=neighbour` saves with nothing
  ticked and with "Monographs" alone; the fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, the steps and the
  neighbour walked with the fix in, the neighbour again with it out,
  then reverted.
- Walked on `main` and `stable-3_5_0`, OMP and OJS, on PostgreSQL, the
  default dataset from pkp/datasets c657990 (2026-10-01). No server
  error and no page script error came with any save. MySQL not checked
  (the check reads posted values only).
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6), OJS `main`
  b84f8e2e44; OMP `stable-3_5_0` 9c5e24246c (lib/pkp cf3f984335), OJS
  `stable-3_5_0` 091fb65453; OMP `stable-3_4_0` 0aec65441f;
  OMP `stable-3_3_0` 8e72fc8836.
- Code reads: `URNSettingsForm.php` and `templates/settingsForm.tpl` of
  OMP on `main` and 3.5 (the check and the four boxes); on
  `stable-3_4_0` the same check at `URNSettingsForm.php` line 72 and
  the four boxes in `settingsForm.tpl`; on `stable-3_3_0` the same
  check at `URNSettingsForm.inc.php` line 62 and the same four boxes.
  OJS's form on `main` (three boxes, all in the check). The way round's
  cost, OMP `main`: `URNPubIdPlugin::register()` hooks no publish step;
  `PKPPubIdPluginHelper::execute()`/`assignPubId()` store a URN only
  when the item's assign box is ticked; `addPublishFormNotice()` adds an
  information-only table with an "Unassigned" row per enabled item
  without a URN.
- Trace: `git blame` on the check's line gives 01088072a8 (PSR-12
  reformat) and 86f2daa114 (`pkp/pkp-lib#6901`, namespaces); `git log -S` gives 8cadd091c3
  (`enableSubmissionURN` renamed to `enablePublicationURN`) and
  825986f471, where the check first appears with `enableIssueURN`
  beside a "Files" box. `git log -S enableChapterURN` gives 83dd274bc1
  as the commit that added the "Chapters" box.
- Upstream search 2026-10-02, pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs: "URN chapters files settings", "objects URNs should
  be assigned", "Please choose the objects", "URN press chapters only",
  "URN settings", "URN chapter", "urnObjects", "URNSettingsForm", "URN
  plugin OMP". The nearest, `pkp/pkp-lib#8811` (the window's failing
  request on PHP warnings) and `pkp/pkp-lib#8940` (the plugin's 3.4
  port), are other faults.
- Unverified: none.
