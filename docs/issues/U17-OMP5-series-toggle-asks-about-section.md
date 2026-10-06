# A press manager deactivating or reactivating a series is asked about a "section"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#851` for `pkp/pkp-lib#5702` · [dad0d4b316](https://github.com/pkp/omp/commit/dad0d4b3169de63c31337adf0764cddf77b558cf) · 2020-07-22 · Salman Murad (salmanm2003)
- **Upstream** `pkp/pkp-lib#12461` (closed, fixed in `pkp/omp#2308`), covering only the box in a series' edit window, not this question in the series list
- **Tracked in** spec U17 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press manager presses a series' "Inactive" box on Settings › Press ›
"Series". The window asks "Are you sure you wish to deactivate this
section?". When the series is already inactive, it asks "Are you sure
you wish to activate this section?". Every other screen of a press says
"series".

"OK" deactivates or reactivates the series as asked. The question asks
about a "section" in every interface language, in French a "rubrique",
since none of OMP's 34 languages gives these questions a press's
wording.

## Impact

- **Lost**: nothing; only the word is wrong. The series is deactivated
  or reactivated as asked, and "Your changes have been saved." shows.
- **Who**: every press manager who deactivates or reactivates a series
  from the "Series" list, in every press.
- **Way round**: not needed, since the action is right.

Low: a wrong word in a confirmation whose outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  has five active series, "History" among them.

Steps:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Press
   (`/index.php/publicknowledge/en/management/settings/context`) and
   press the "Series" tab.
3. In the "History" row, press the "Inactive" box.
4. Read the window headed "Confirm", then press "OK".
5. Press the "Inactive" box of "History" again (it is now ticked).
6. Read the window headed "Confirm", then press "OK".

**Expected**: step 4 asks "Are you sure you wish to deactivate this
series?" and step 6 asks "Are you sure you wish to activate this
series?".

**Observed**: step 4 asks "Are you sure you wish to deactivate this
section?". "OK" ticks the box and "Your changes have been saved." shows.
Step 6 asks "Are you sure you wish to activate this section?", and "OK"
unticks the box with the same notice.

Control: the same setting in the series' edit window (the row's arrow,
then "Edit") reads "Mark this series as inactive and do not allow new
submissions to be made to it."

## Cause

OMP's `SeriesGridCellProvider::getCellActions()`
(`controllers/grid/settings/series/SeriesGridCellProvider.php`, lines 64
and 82) builds the two `RemoteActionConfirmationModal`s with pkp-lib's
journal keys `manager.sections.confirmActivateSection` and
`manager.sections.confirmDeactivateSection`. pkp-lib's
`locale/en/manager.po` gives them their journal text ("…this
section?"). None of OMP's 34 locale files overrides the two keys, and
OMP has no keys of its own for these two questions. So a press shows
the journal's sentence.

The cell provider and its two actions came in dad0d4b316 (`pkp/omp#851`,
"Ability to disable submissions"), which copied OJS's section toggle for
series. It added series wording for its own error message
(`manager.series.confirmDeactivateSeries.error`, since removed) but
reused the section keys for the questions. Later changes to the lines
were only formatting and namespacing.

`pkp/pkp-lib#12461` (2026) fixed the same mismatch in the series' edit window:
`pkp/omp#2308` gave that window's box an OMP key,
`manager.series.form.deactivateSeries`, and left the list's questions as
they were.

Reach:

- Only these two lines in OMP use the two keys. OJS and OPS use them for
  sections, where the text is right (code).
- Every interface language shows pkp-lib's journal sentence in that
  language (no OMP locale overrides the keys; code). Walked in French:
  "Êtes-vous certain-e de vouloir désactiver cette rubrique ?".
- The other section keys a press's series screens borrow from pkp-lib
  read neutrally: "Editorial Assignments", "Assign {name} as {role}"
  (code).

## Proposed fix

Give the two keys a press's text in OMP's `locale/en/manager.po`, next
to `manager.sections.alertDelete`. That key is already OMP's
series-worded text under a `manager.sections.*` name
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-toggle-asks-about-section/fix.diff)):

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -110,6 +110,12 @@
 
 msgid "manager.sections.alertDelete"
 msgstr "Before this series can be deleted, you must move associated submissions with this series to other series."
+
+msgid "manager.sections.confirmDeactivateSection"
+msgstr "Are you sure you wish to deactivate this series?"
+
+msgid "manager.sections.confirmActivateSection"
+msgstr "Are you sure you wish to activate this series?"
 
 msgid "manager.payment.generalOptions"
 msgstr "General Options"
```

OMP's locale wins over pkp-lib's for the same key, the way OMP already
words 34 pkp-lib keys for a press (`user.role.editors`,
`submission.metadata` and others). No PHP changes. A language that has
not yet translated the two OMP entries keeps today's pkp-lib text rather
than a raw code. Tried on OMP: the walk now reads "…deactivate this
series?" and "…activate this series?". As a check that the fix reaches
no further, the French question and the row's "Delete" window read the
same with the fix in and out.

**Alternatives**:

- New keys `manager.series.confirmDeactivateSeries` and
  `manager.series.confirmActivateSeries`, with `getCellActions()`
  pointed at them, as `pkp/omp#2308` did for the window's box. This is
  clearer in the code. But PKP does not fall back to English for a key a
  language lacks (`Locale::translate()` returns `##key##`), so every
  language without the new keys would show a raw code in place of the
  question until it is translated. That is what the window's box does
  now in French: on 3.5's French interface it reads
  "##manager.series.form.deactivateSeries##".
- Change pkp-lib's text to a neutral "…this item?": this would lose the
  word on journals and servers, where it is right.

**What goes with it**:

- Translations: the fix overrides the keys in English only. Each other
  language keeps pkp-lib's journal sentence until its OMP translation
  adds the two entries through Weblate, as for any new OMP text.
- Backport: the diff applies as written to OMP `stable-3_5_0` (the same
  anchor at line 111), and to `stable-3_4_0` only with an offset
  (`manager.sections.alertDelete` sits at line 105 there). On
  `stable-3_3_0`, add the same two entries to `locale/en_US/manager.po`,
  which has no `manager.sections.alertDelete`.
- Guard: the U17 spec's press scenario ("Every series inactive") reads
  the question, so it would catch a return of the section wording. A
  Planned item there would cover it.

This is a proposal; the team decides.

Small: two entries in one OMP locale file, no code change.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-toggle-asks-about-section/walk.js)
  takes the steps and the control as `rvaca` on OMP. Journals and
  servers have no series list, so it skips them. `WALK=neighbour` runs
  only the checks the fix must leave unchanged: the French interface's
  question on the first row (answered "Annuler") and the "History" row's
  "Delete" window (answered "Cancel"). Neither check changes data. Run
  it on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/series-toggle-asks-about-section/walk.js`.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/series-toggle-asks-about-section/fix.diff omp`,
  followed by the script and its `WALK=neighbour` mode, then
  `node bin/try-fix.js revert …` and the `WALK=neighbour` mode again.
- Walked on OMP `main` and `stable-3_5_0` on 2026-10-02, on PostgreSQL.
  Dataset: pkp/datasets c657990 (2026-10-01). No server error and no
  script error was recorded. A series' edit window in French on 3.5 was opened
  once more for the box's raw code quoted under Alternatives. `main`
  has the same files: no `manager.series.form.deactivateSeries` in OMP's
  `locale/fr_CA/manager.po` (code).
- Branch tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OMP 9c5e24246 (lib/pkp cf3f984335); OMP
  `stable-3_4_0` 0aec65441 with pkp-lib 32b0f4b4af; OMP `stable-3_3_0`
  8e72fc883 with pkp-lib f6ab331645.
- Code reads:
  - 3.5: `SeriesGridCellProvider.php` uses the same keys (lines 64 and
    82). Only lib/pkp's `locale/en/manager.po` defines them (line
    1424).
  - 3.4: the same in `SeriesGridCellProvider.php` (lines 64 and 81),
    with the section texts in pkp-lib's `locale/en/manager.po` (line
    1375). OMP's file has neither key.
  - 3.3: `SeriesGridCellProvider.inc.php`, lines 53 and 70. pkp-lib's
    `locale/en_US/manager.po` gives the section texts (line 871).
    dad0d4b316 is on the branch.
- Trace: `git blame` on lines 64 and 82 gives 01088072a8 (the PSR-12
  reformatting). The history of the file (`git log --follow`) and
  `git log -S confirmDeactivateSection` lead to dad0d4b316, which
  created the file with these keys. The GitHub API's
  `commits/<sha>/pulls` names `pkp/omp#851` (merged 2020-08-27).
- Tracker search (2026-10-02; pkp/pkp-lib, pkp/omp, pkp/ui-library) by
  the symptom's words, the two keys and the class: only
  `pkp/pkp-lib#12461` concerned this wording, and its fix
  (ed8cbdb6d in OMP) covered only the window's box.
- Not walked: other interface languages than English and French.
- MySQL not checked; nothing here depends on the database.
