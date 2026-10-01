# URN settings: a press that ticks only "Chapters" or "Files" is told to choose the objects

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** "Files": `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f4](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana); "Chapters": `pkp/omp#498` for `pkp/pkp-lib#1692` · [83dd274b](https://github.com/pkp/omp/commit/83dd274bc17a7313d396d4b02962248fa742bcc4) · 2018-02-07 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A Press manager who ticks only "Chapters", only "Files", or only those
two under "Press Content" in the URN plugin's settings window cannot
save it. "Save" is refused with "Please choose the objects URNs should
be assigned to.", though objects are chosen.

Nothing is lost. Ticking "Monographs" or "Publication Formats" as well
lets the save through, so the press still gets its chapter or file
URNs, at the cost of a warning each time a book is published.

## Impact

- **Lost.** The manager's time: the settings stay as they were until
  another box is ticked.
- **Who.** A Press manager who turns on the bundled URN plugin (off by
  default) to give URNs to chapters or files only, such as a press whose
  edited volumes carry a URN per chapter. No report of it was found
  in PKP's trackers.
- **Way round.** Tick "Monographs" as well, and leave the book's own
  URN unassigned. The book's "Identifiers" page then shows a URN box
  with an "Assign" button, which can be ignored. Each time a book
  version is published, the confirmation window adds a row for the
  book marked with a warning sign and "Unassigned"; it warns but does
  not stop the publishing, and it comes back on every publish.
  "Publication Formats" also gets past the refusal, but adds such a row
  for every format of every book.

Low: a narrow setting is refused with a misleading message, and one
more tick saves it. It would be medium if ticking "Monographs" gave
books a URN without anyone pressing "Assign"; it does not.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. The URN plugin is off in the
  dataset; turning it on is part of the steps.

Steps:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Website, tab "Plugins".
3. In the "URN" row, tick the box to enable the plugin.

Chapters only:

4. Open the row's "Settings". The window "URN" opens.
5. Under "Press Content", tick "Chapters" only ("Monographs",
   "Publication Formats" and "Files" stay unticked).
6. "URN Prefix": `urn:nbn:de:0000-`. "URN Suffix": leave "Use default
   patterns." selected.
7. "Namespace": "urn:nbn:de"; "Resolver URL": `https://nbn-resolving.de/`.
8. "Save".

Files only: close the refused window, then take steps 4–8 again with
"Files" the only box ticked at step 5.

Chapters and Files: close the window, then steps 4–8 with "Chapters"
and "Files" ticked.

**Expected:** each "Save" closes the window with "Your changes have
been saved.", and reopening "Settings" shows the boxes as they were
saved.

**Observed:** each "Save" is refused. The window stays open, and its
top reads:

```
Errors occurred processing this form:
Please choose the objects URNs should be assigned to.
```

Control: steps 4–8 with "Monographs" and "Chapters" ticked save, with
"Your changes have been saved.", and reopen with both ticked. With no
box ticked, "Save" is refused with the same message, rightly.

## Cause

`URNSettingsForm::__construct()` in OMP
(`plugins/pubIds/urn/classes/form/URNSettingsForm.php`, line 71) checks
that at least one kind is ticked with the OJS plugin's three names:

```php
return $form->getData('enableIssueURN') || $form->getData('enablePublicationURN') || $form->getData('enableRepresentationURN');
```

A press has no "Issues", so `enableIssueURN` is always empty. The
press's window offers four boxes, and the form saves four settings
(`_getFormFields()`: `enablePublicationURN`, `enableChapterURN`,
`enableRepresentationURN`, `enableSubmissionFileURN`). The plugin itself treats
each kind on its own: `URNPubIdPlugin::isObjectTypeEnabled()` reads
`enable{$type}URN`, so a chapter or a file gets URNs whatever the other
boxes say.

The OMP plugin was written from the OJS one (825986f4) with the OJS
check as it was, and "Files" was never counted. When chapters gained
public identifiers (83dd274b), "Chapters" was added to the window, the
saved fields and its pattern check, but not to this check.

Reach:

- OJS: its check names its own three kinds, which are all of its boxes
  (checked in the code; the OJS window was not driven for this).
- The plugin's other per-type code in OMP reads all four settings, for
  example `URNPubIdPlugin::addPublishFormNotice()` (checked in the code).
- OMP 3.3's DOI plugin (`plugins/pubIds/doi/classes/form/DOISettingsForm.inc.php`)
  has the same gap for "Chapters": its `doiObjects` check names
  publication, representation and file, but not `enableChapterDoi`
  (checked in the code, not driven). That plugin is gone since 3.4,
  where DOI settings moved to a shared form with no such hand-written
  list.

## Proposed fix

Count every kind the press's window offers (tried on `main`):
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/fix.diff).

```diff
-        $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'urnObjects', 'required', 'plugins.pubIds.urn.manager.settings.urnObjectsRequired', function ($enableIssueURN) use ($form) {
-            return $form->getData('enableIssueURN') || $form->getData('enablePublicationURN') || $form->getData('enableRepresentationURN');
+        $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'urnObjects', 'required', 'plugins.pubIds.urn.manager.settings.urnObjectsRequired', function () use ($form) {
+            return $form->getData('enablePublicationURN')
+                || $form->getData('enableChapterURN')
+                || $form->getData('enableRepresentationURN')
+                || $form->getData('enableSubmissionFileURN');
         }));
```

It names the same four settings as the form's `_getFormFields()` and
the plugin's `addPublishFormNotice()`, and drops the journal-only name
and the misleading closure parameter. Tried: the three refused choices
then save, while no box ticked is still refused and "Monographs" or
"Publication Formats" alone still save.

**Alternatives:**

- Build the check from the plugin's `getPubObjectTypes()` (`enable{$type}URN`
  for each type), as `isObjectTypeEnabled()` reads them: it would follow
  any future kind, but it is more code for four fixed boxes, and OJS's
  twin would need the same change to stay alike.

**What goes with it:**

- No stored data changes. Presses that ticked an extra kind to get past
  the check keep their settings until they change them.
- The diff applies as written to `stable-3_5_0`, and to `stable-3_4_0`
  at a one-line offset. On `stable-3_3_0` the same edit goes in
  `URNSettingsForm.inc.php` (`FormValidatorCustom` without the
  namespace). The 3.3 DOI plugin's "Chapters" gap (Cause) is a separate
  one-line edit there if the team backports.
- A guard: a check in pkp-e2e's
  [identifiers spec](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md)
  scenario "Configure the URN plugin" that saves a press's window with
  "Chapters" alone. A unit test in the app would have to build the form
  with a plugin object and a request, and the URN plugin has no
  `tests/` folder yet.

Small: one condition in one file, no data or API change.

## Evidence

- Kept scripts, in
  [urn-settings-chapters-files-alone-refused/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js)
    takes the Steps for the three groups and the control, on a fresh
    load of the default dataset:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/neighbour.js)
    saves with no box ticked, "Monographs" alone and "Publication
    Formats" alone; the same with the fix in and out.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-settings-chapters-files-alone-refused/fix.diff omp`,
    then both scripts, each on a fresh load, then
    `node bin/try-fix.js revert omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): OMP `main` and `stable-3_5_0`,
  every step. The fault is a form check, so the database plays no part.
- 3.4 and 3.3 were read in the code: OMP's `URNSettingsForm` on
  `stable-3_4_0` (`.php`, line 72) and `stable-3_3_0` (`.inc.php`,
  line 62) hold the same check and save the same four settings; 3.3's
  `DOISettingsForm.inc.php` for the DOI sibling.
- Tips: `main` OMP 3b0ecf794 (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  3081c9b00 (lib/pkp a9c76aed62); `stable-3_4_0` OMP 0aec65441;
  `stable-3_3_0` OMP 8e72fc883.
- Introduced: `git blame` on line 71 lands on 01088072a8 (PSR-12
  formatting), then 8cadd091c (`pkp/pkp-lib#5208`, renaming
  `enableSubmissionURN` to `enablePublicationURN`); neither changed
  which kinds the check names.
- Read in the code, not driven (main): the way round. The plugin is off
  by default, since it ships no `settings.xml` to turn it on for a new
  press. `URNPubIdPlugin::addPublicationFormFields()` adds the book's
  URN box while "Monographs" is ticked. `addPublishFormNotice()` adds a
  read-only table (a `FieldHTML`, no error) to the publish
  confirmation, with an `fa-exclamation-triangle` icon and "Unassigned"
  for each ticked object without a stored URN: one row for the book,
  one per format with "Publication Formats". The plugin stores a URN
  only on "Assign" (no publish hook), and the book page and Dublin
  Core tags read only stored URNs.
