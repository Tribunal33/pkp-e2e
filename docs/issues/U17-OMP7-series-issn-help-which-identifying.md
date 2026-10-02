# The ISSN help in a press's series window reads "which identifying"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#231` for `pkp/pkp-lib#1212` · [37ae194f74](https://github.com/pkp/omp/commit/37ae194f7492f7c768331c4acabcef5605475a6c) · 2016-03-08 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [OMP7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A press manager adding or editing a series reads, above the "Online
ISSN" and "Print ISSN" boxes: "The ISSN (International Standard Serial
Number) is an eight-digit number which identifying periodical
publications including electronic serials." It should read "which
identifies".

The other interface languages' texts do not have the slip.

## Impact

- **Lost**: nothing; the sentence is still understood.
- **Who**: a press manager, each time they open a series' "Add Series"
  or "Edit" window.
- **Way round**: none needed.

Low: a grammar slip in help text, with no effect on what is saved.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded. Nothing
  else. The `stable-3_5_0` dataset takes the same steps.

1. Sign in as `rvaca` (password `rvacarvaca`), the Press manager.
2. Go to Settings › Press and open the "Series" tab.
3. Press "Add Series".
4. Read the paragraph under "ISSN", above "Online ISSN" and "Print
   ISSN".
5. Press "Cancel", then open the arrow beside "Library & Information
   Studies", press "Edit" and read the same paragraph.

**Expected:** "The ISSN (International Standard Serial Number) is an
eight-digit number which identifies periodical publications including
electronic serials. A number can be obtained from the ISSN International
Centre."

**Observed:** in both windows (steps 4 and 5):

```
The ISSN (International Standard Serial Number) is an eight-digit number which identifying periodical publications including electronic serials. A number can be obtained from the ISSN International Centre.
```

## Cause

The English text of `manager.setup.issnDescription` in OMP
`locale/en/manager.po` (lines 957–960) has "which identifying" where
the sentence needs a finite verb; until 2016 it read "which identifies".
OMP's series form shows it as the
description of the ISSN section
(`templates/controllers/grid/settings/series/form/seriesForm.tpl`,
line 86).

37ae194f74 ("pkp/pkp-lib#1212 Tidy strings and forms in Press >
Settings") shortened the message, and in cutting "as such," changed
"identifies" to "identifying".

Reach (checked in the code):

- The key is used by the series form alone; OMP, its pkp-lib and its
  plugins have no other use of it.
- OJS and OPS have no such message ("eight-digit" appears in none of
  their English locale files or their pkp-lib's).
- The other strings 37ae194f74 rewrote read correctly.

## Proposed fix

Change the verb in OMP's English message:

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -955,7 +955,7 @@
 msgid "manager.setup.issnDescription"
 msgstr ""
 "The ISSN (International Standard Serial Number) is an eight-digit number "
-"which identifying periodical publications including electronic serials. A "
+"which identifies periodical publications including electronic serials. A "
 "number can be obtained from the <a href=\"https://www.issn.org\" target=\""
 "_blank\">ISSN International Centre</a>."
 
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-issn-help-which-identifying/fix.diff).
Tried on `main`: both windows read "which identifies". The paragraph's
link "ISSN International Centre" still went to https://www.issn.org in
a new tab, and the help under "Order of monographs" was unchanged, with
the fix in and out.

This is a proposal; the team decides.

**Alternatives**:

- Restore the pre-2016 sentence ("…which identifies periodical
  publications as such, including electronic serials."): the 2016 change
  meant to shorten the help, and "as such" adds nothing a manager needs.

**What goes with it**:

- Translations keep their own text under the same key; none changes.
- Backport: the hunk applies to `stable-3_5_0` and `stable-3_4_0`; on
  `stable-3_3_0` the message is one line in `locale/en_US/manager.po`.
- Test: none in the app's repo; an e2e check in spec U17 (a **Planned**
  item) can read the paragraph.

Small: one word in one English message, with no code change.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/series-issn-help-which-identifying/walk.js)
  takes the Steps and records the paragraph under "ISSN" in the "Add
  Series" window and in "Library & Information Studies"' "Edit" window.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js omp shared/playwright/checks/issues/series-issn-help-which-identifying/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `WALK=neighbour` in front reads, in the "Add
    Series" window, the paragraph's link "ISSN International Centre" (its
    address and target) and the help under "Order of monographs".
- Walks: OMP on `main` and `stable-3_5_0`, on PostgreSQL; datasets from
  pkp/datasets c657990 (2026-10-01). No request failed on the server and
  no page script failed. OJS and OPS have no series window.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/series-issn-help-which-identifying/fix.diff omp`,
  the walk and the neighbour check each on a freshly loaded dataset,
  then reverted.
- Not driven: 3.4 and 3.3; other interface languages (read in the
  locale files). MySQL not checked (the fault does not depend on the
  database).
- Tips:
  - **`main`:** OMP 3b0ecf794.
  - **`stable-3_5_0`:** OMP 9c5e24246.
  - **`stable-3_4_0`:** OMP 0aec65441.
  - **`stable-3_3_0`:** OMP 8e72fc883.
- Code reads:
  - `main` and 3.5: `manager.setup.issnDescription` in
    `locale/en/manager.po` and its use in `seriesForm.tpl`; `git grep`
    for "which identifying" over OMP, and for "eight-digit" over the
    English locale files of OJS, OMP, OPS and their pkp-lib.
  - 3.4 (`locale/en/manager.po`) and 3.3 (`locale/en_US/manager.po`):
    the same English text, used by the same `seriesForm.tpl` section.
- The trace: `git blame` (b1e0d94ad6, 2022 rewrap; 21fae1d76c, 2019 XML to PO), then `git log -S "which identifying"` → 37ae194f74.
- Upstream searches (2026-10-02, pkp/pkp-lib, pkp/omp, pkp/ui-library): "which identifying", "ISSN typo", `issnDescription`; no match.
