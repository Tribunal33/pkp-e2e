# An issue's saved section order changes when a manager reorders the journal's sections

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; every section's place stored at the first move)
- **Introduced** `pkp/ojs#5097` for `pkp/pkp-lib#11752` · [ac032b9760](https://github.com/pkp/ojs/commit/ac032b9760b1f3f8fa72810887d7b9d1639f3f72) · 2025-08-29 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U50 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a21)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Journal Manager who orders an issue's sections with "Order" on its
"Table of Contents" tab expects that order to stay the issue's own. But
"Done" stores a place for the issue only for the sections whose
position changed; the others go on following the journal's section
order.

So when someone later reorders the journal's sections on Settings ›
Journal › "Sections", the issue's sections can come out in a third
order, neither the one saved for the issue nor the journal's new one.
It shows on the issue's tab and on its page, a published issue's page
included, and nobody is told.

This reaches most issues of three or more sections ordered since OJS
3.4.0-10 and 3.5.0-2, many of them at once. Issues last ordered before
those releases keep their order. Ordering an issue again restores it
until the next reordering of the journal's sections.

## Impact

- **Lost**: the section order an editor saved for an issue, on its
  public page and its tab. Nobody is told, and no screen lists the
  issues that changed: a manager finds them only by opening each one.
- **Who**: readers of an issue ordered since 3.4.0-10 or 3.5.0-2 whose
  save left a section in its old position. That is most orders of three
  or more sections: moving one section leaves the sections above it in
  place. With two sections any move changes both, so both are stored.
  Such an issue changes at a journal reordering that changes the place
  of a section it left unstored (moving that section, or another one
  across it); a reordering elsewhere in the list leaves it alone.
- **Way round**: open each affected issue and order it again. It stays
  exposed to the next reordering of the journal's sections.

Medium: one reordering of the journal's sections can silently change
the table of contents of many published issues, but journals rarely
reorder their sections once set up, no content is lost, and each order
can be set again on screen. A screen-only way round keeps it below high.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, OJS. The journal
`publicknowledge` has the sections "Articles" and "Reviews", in that
order. Its published, current issue "Vol. 1 No. 2 (2014)" holds
submissions 1 and 17, both in "Articles". Submissions 5 ("Genetic
transformation of forest trees") and 6 ("Investigating the Shared
Background Required for Argument: A Critique of Fogelin's Thesis on
Deep Disagreement") are in Production. The issue needs articles in
three sections, so steps 2 to 5 add a third section and publish
submissions 5 and 6 into the issue.

Setting up the issue:

1. Sign in as `dbarnes`.
2. Settings › Journal › "Sections" › "Create Section". Title "Essays
   hkk20", Abbreviation "ESh20", "Save". The list reads Articles,
   Reviews, Essays hkk20.
3. Open submission 5. Under "Publication", open "Publication Settings".
   "Issue Assignment": "Assign To Current/Back Issue"; "Issue": "Vol. 1
   No. 2 (2014)"; "Section": "Reviews". Press "Save". [3.5: the page is
   "Issue". Press "Assign to Issue", choose "Vol. 1 No. 2 (2014)",
   "Save"; then "Section": "Reviews", "Save".]
4. Press "Schedule For Publication" at the top. In "Review Publishing
   Details" set "Publication Stage" to "Version of Record (VoR)" and
   "Revision Significance" to "Major Revision", and press "Confirm".
   The window reads "All publication requirements have been met. This
   will be published immediately in Vol. 1 No. 2 (2014). Are you sure
   you want to publish this?". Press "Publish". [3.5: "Schedule For
   Publication" opens that question at once.]
5. Open submission 6 and repeat steps 3 and 4 with "Section": "Essays
   hkk20".

Ordering the issue:

6. Issues › "Back Issues". On "Vol. 1 No. 2 (2014)": the arrow, "Edit".
   The "Table of Contents" tab lists the sections Articles, Reviews,
   Essays hkk20.
7. Press "Order". Drag the "Reviews" heading below the last article of
   the list. Press "Done". The tab reads Articles, Essays hkk20,
   Reviews, and so does the issue's page (Archives › "Vol. 1 No. 2
   (2014)").

Reordering the journal's sections:

8. Settings › Journal › "Sections" › "Order". Drag "Reviews" above
   "Articles", then "Essays hkk20" above "Articles". Press "Done". The
   list reads Reviews, Essays hkk20, Articles.

What the issue shows:

9. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit", tab "Table
   of Contents".
10. Archives › "Vol. 1 No. 2 (2014)".

**Expected.** The issue keeps the order saved in step 7, on the tab and
on its page:

```
Articles
Essays hkk20
Reviews
```

**Observed.** The tab and the page both read:

```
Essays hkk20
Articles
Reviews
```

"Articles" and "Reviews" share one place number after step 8, so their
order is left to the database: another install (MySQL, for one) may
show Essays hkk20, Reviews, Articles. Either way "Essays hkk20" comes
first, which is neither the saved order nor the journal's.

## Cause

The issue's section order is the table `custom_section_orders`, one place
number per section for the issue. `section/DAO::getByIssueId()`
(`classes/section/DAO.php`) sorts the issue's sections by
`COALESCE(o.seq, s.seq)`: the issue's own place when one is stored, else
the section's place in the journal (`sections.seq`). The tab
(`TocGridHandler::loadData()`), the issue's page
(`IssueHandler::setupIssueTemplate()`) and the issue's REST `sections`
read it.

"Done" is saved by `OrderCategoryGridItemsFeature::saveSequence()` (lib/pkp
`classes/controllers/grid/feature/`). For each section it computes the
new place (the first section's current place plus the new position) and
calls `setDataElementSequence()` only when that differs from
`TocGridHandler::getDataElementSequence()`. For a section with no stored
place, that method returns the journal's place. So a section the drag
left where it was gets no row, and goes on taking the journal's place.
In step 7 "Essays hkk20" (1) and "Reviews" (2) are stored and "Articles"
is not. After step 8 "Articles" takes the journal's new place, 2, the
same number as "Reviews", and "Essays hkk20" sorts first. The sort has
no tie-breaker, so which of "Articles" and "Reviews" comes next is the
database's choice.

`TocGridHandler::setDataElementSequence()` stores only the one section
it is given. Through 3.3 it first stored a place for every section of
the issue (`SectionDAO::setDefaultCustomSectionOrders()`). The move to
the section repository (c5b014ab89, `pkp/pkp-lib#7128`, 2023) dropped
that, and bddeb94033 in the same work made `getByIssueId()` rewrite
every section's place each time an issue with a saved order was listed,
which kept the rows complete. ac032b9760 (`pkp/pkp-lib#11752`, 2025)
removed that rewrite, because writing while reading raced and could lose
the order. Since then nothing stores the places of the sections a
"Done" does not move. Issues whose rows were completed by the old
rewrite keep a place for every section and are not affected.

Reach:

- The issue's "Table of Contents" tab and its page: walked.
- The issue's `sections` in the REST API (`issue/maps/Schema.php`), the
  native XML export (`IssueNativeXmlFilter`) and the PubMed export read
  the same `getByIssueId()`: code read.
- Not this fault: an article added later in a section that has no
  place in the issue takes the journal's place among the issue's own
  numbers until the issue is ordered again (code read; the 3.3 form of
  that gap was `pkp/pkp-lib#6828`).
- "Back Issues" (`BackIssueGridHandler`) saves its order the same way,
  with a fallback place for an issue that has no row. A move stores one
  row (`APP\issue\DAO::moveCustomIssueOrder()`), and
  `resequenceCustomIssueOrders()` fills the table only when an issue is
  added, saved or deleted. Whether that leaves a like gap between saves
  is not checked here.

## Proposed fix

Store a place for every section of the issue as soon as one section's
place is saved, in `TocGridHandler::setDataElementSequence()` (OJS
`controllers/grid/toc/TocGridHandler.php`). A section with no stored
place gets the journal's place, which is the value the save compared it
with, so the order shown at the save does not change and the issue no
longer depends on the journal's section order
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-section-order-changes-with-journal/fix.diff)):

```diff
     public function setDataElementSequence($request, $sectionId, $gridDataElement, $newSequence)
     {
         $issue = $this->getAuthorizedContextObject(Application::ASSOC_TYPE_ISSUE);
+        // Once a section is moved, store a place for every section of the issue. A section
+        // the save leaves where it was has no place stored yet and would go on following
+        // the journal's section order, so reordering the journal's sections would change it.
+        foreach ($this->getGridDataElements($request) as $id => $section) {
+            if (Repo::section()->getCustomSectionOrder($issue->getId(), $id) === null) {
+                Repo::section()->upsertCustomSectionOrder($issue->getId(), $id, $section->getSequence());
+            }
+        }
         Repo::section()->upsertCustomSectionOrder($issue->getId(), $sectionId, $newSequence);
     }
```

This is what 3.3 did with `setDefaultCustomSectionOrders()`. It writes
only when "Done" saves a move, so it keeps the intent of
`pkp/pkp-lib#11752`, nothing written while an issue is read; that issue
itself suggested doing the work on save ("apply the cleanup on a
different place (e.g. upon saving the sorting)"). The journal's place
(a float in `PKPSection`) goes into an `int` parameter, which is safe
while `sections.seq` holds whole numbers, as the "Sections" save and
`resequence()` write. A section added to an ordered issue later
(`pkp/pkp-lib#6828`) gets its place stored at the next move too.

Tried on OJS `main`: with the fix, step 7 stores a place for all three
sections and the tab and page read as Expected after step 8; an issue
whose "Done" moved nothing still follows the journal's new order, with
the fix and without it.

**Alternatives**:

- Always save every section in `OrderCategoryGridItemsFeature`: changes
  the shared grid feature for every category grid, to fix a fallback
  only this grid has.
- Bring back the rewrite in `getByIssueId()`: reverts
  `pkp/pkp-lib#11752` and its race.
- Add a tie-breaker to the sort: makes the order stable, but still not
  the saved one.

**What goes with it**:

- Stored data: issues saved since the change hold places for some of
  their sections only. They show the right order until the journal's
  sections are reordered, and the next "Done" that moves a section
  completes them. Their intended order cannot be told from the rows, so
  no repair is proposed.
- Backport: the method is the same on `stable-3_5_0` and
  `stable-3_4_0`; the diff applies there as written.
- Test: an end-to-end check that orders an issue leaving one section in
  place, reorders the journal's sections and reads the issue's page.

Small: a few lines in one method, restoring what 3.3 did, with no data
repair.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-section-order-changes-with-journal/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/issue-section-order-changes-with-journal/walk.js`
  (`MODE=nb` for the control case below). It also reads `sections.seq`
  and the issue's `custom_section_orders` rows after each stage: after
  step 7 on `main` and on `stable-3_5_0` the issue held Essays hkk20 1
  and Reviews 2 and no row for Articles; after step 8 the journal held
  Reviews 0, Essays hkk20 1, Articles 2.
- The fix trial, OJS `main` with
  [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-section-order-changes-with-journal/fix.diff)
  applied: step 7 stored Articles 0, Essays hkk20 1, Reviews 2, and the
  Expected was read twice on the tab and twice on the page. The control
  case (`MODE=nb`: the same setup, then "Order" and "Done" with nothing
  moved in step 7) read Reviews, Essays hkk20, Articles on the tab and
  the page after step 8, with the fix in and out, and stored no row for
  the issue either way.
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL, the default
  dataset from pkp/datasets 7912e09 (2026-10-14). No request answered
  400 or more and no page error was recorded. MySQL not checked: which of
  two sections sharing a place number comes first is the database's
  choice.
- Tips: `main` ojs 378eced941, lib/pkp b17fadae59; `stable-3_5_0` ojs
  ca763c91cd, lib/pkp 4045d9241e; `stable-3_4_0` (`upstream/stable-3_4_0`
  of the app, lib/pkp `origin/stable-3_4_0`) ojs daf0ca971d, lib/pkp
  55c8e406b3; `stable-3_3_0` ojs d7d9dd14ec, lib/pkp 5e84acd11b (both
  app tips of 2026-10-09).
- Code reads: 3.5's `TocGridHandler` section methods are the same as
  `main`'s, and its `getByIssueId()` has no rewrite (c11ceb4cab, the
  backport). 3.4's `TocGridHandler::setDataElementSequence()` stores the
  one section, its `getByIssueId()` has no rewrite (75cf986b4a, merged
  with `pkp/ojs#5072`), and lib/pkp's `OrderCategoryGridItemsFeature`
  compares as on `main`. 3.3's `TocGridHandler::setDataElementSequence()`
  calls `setDefaultCustomSectionOrders()` when the issue has no row, and
  updates or inserts the moved section. Releases: the 3.4 backport is in
  tags 3_4_0-10 and later, the 3.5 one in 3_5_0-2 and later; before it,
  `getByIssueId()` rewrote every section's row whenever the issue was
  listed (bddeb94033), so issues saved then hold complete rows.
- Introduced: the comparison in
  `OrderCategoryGridItemsFeature::saveSequence()` (2012) and the
  fallback in `TocGridHandler::getDataElementSequence()` (2013) were
  harmless while every section had a row. `git log -S
  setDefaultCustomSectionOrders` gives c5b014ab89 (`pkp/ojs#3741`,
  2023-01-18) as the removal; bddeb94033 (2023-02-20) added the rewrite
  in `getByIssueId()` before any release; `git log` on
  `classes/section/DAO.php` gives ac032b9760 (`pkp/ojs#5097`, merged
  2025-09-16) as its removal.
- Upstream search (2026-10-15), issues and PRs in pkp/pkp-lib, pkp/ojs
  and pkp/ui-library. Nearest, not the same fault: `pkp/pkp-lib#11752`
  (closed; the race the introducing change fixed), `pkp/pkp-lib#6828`
  (closed; a section added after the issue was ordered, 3.3) and
  `pkp/pkp-lib#2376` (closed; QuickSubmit and sections added later,
  3.0).
