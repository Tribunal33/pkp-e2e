# Editor's "Schedule Only" publishes the article at once when the journal has no published issue

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none (no issue assignment choices)
  - 3.4: none (code; no issue assignment choices)
  - 3.3: none (code; no issue assignment choices)
- **Introduced** `pkp/ojs#5039` with `pkp/ui-library#683` for `pkp/pkp-lib#9295` · [1fb080776e](https://github.com/pkp/ojs/commit/1fb080776ef774c6c31e12e2450de0c29c4183c8) · 2025-08-06 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U49 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ojs2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal with no published issue, only one or more future issues,
an editor's first pick of "Assign To Future Issue and Schedule Only" in
"Review Publishing Details" is taken as "Publish Immediately". The
first pick is the first choice made after the panel opens, since it
opens with no choice checked. The confirmation window then offers
"Publish", and confirming publishes the article at once instead of
scheduling it for the issue. Changing the choice a second time before
"Confirm" works.

On Publication Settings the same first pick, saved, comes back as
"Assign To Future Issue and Publish Immediately". A save there for
another field, such as "Pages", on a version with no issue choice yet,
records "Don't Assign To An Issue", which nobody chose.

## Impact

- **Lost.** A correct public record. The article's own page goes live
  to every visitor, dated the day of the mistake, while it sits in an
  issue that is still unpublished, so no public table of contents lists
  it. The Publication Settings saves lose the intended choice before
  publishing: the next untouched "Confirm" publishes at once, into the
  issue or with none. A version that already has an issue choice saved
  keeps it on a "Pages" save; only a version with no choice yet loses
  it.
- **Who.** Editors and Journal Managers on a journal that has no
  published issue, typically a new journal preparing its first issue.
- **Way round.** The window says "published immediately" before the
  editor confirms. Cancelling and picking another choice, then
  "Schedule Only" again, schedules correctly, but nothing on screen says
  this is needed. An article published by mistake has to be unpublished
  by hand.

Medium: publishing, a core task, gives the wrong result, but only in a
rarely met state, and the window's text shows it before the editor
confirms. It would be high if the window promised scheduling, or if a
save dropped an issue choice already made.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Its journal
  `publicknowledge` has "Vol. 1 No. 2 (2014)" published and "Vol. 2
  No. 1 (2015)" as a future issue.
- The journal must have no published issue: step 4 unpublishes "Vol. 1
  No. 2 (2014)", which leaves both issues future ones.

Control, while the journal has a published issue:

1. Sign in as `dbarnes`.
2. Open submission 15, "Yam diseases and its management in Nigeria",
   "Title & Abstract", then "Schedule For Publication".
3. In "Review Publishing Details" choose Publication Stage "Version of
   Record" and Revision Significance "Major", then "Assign To Future
   Issue and Schedule Only", Issue "Vol. 2 No. 1 (2015)", and
   "Confirm". The window reads "This will be published when Vol. 2
   No. 1 (2015) is published. Are you sure you want to schedule this
   for publication?" with "Schedule For Publication". Press "Cancel".

Make the journal's only published issue a future one:

4. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Unpublish Issue" ›
   "OK".

The panel's first pick:

5. Open submission 5, "Genetic transformation of forest trees", "Title &
   Abstract", then "Schedule For Publication". No "Issue Assignment"
   choice is checked.
6. Choose "Version of Record", "Major", then "Assign To Future Issue and
   Schedule Only" and Issue "Vol. 2 No. 1 (2015)", and "Confirm".
7. Press the window's button.

A "Schedule Only" saved on Publication Settings:

8. Open submission 6, "Investigating the Shared Background Required for
   Argument: A Critique of Fogelin's Thesis on Deep Disagreement",
   "Publication Settings".
9. Choose "Assign To Future Issue and Schedule Only", Issue "Vol. 2
   No. 1 (2015)", and "Save". Reload the page.
10. "Title & Abstract", "Schedule For Publication", "Version of Record",
    "Major", "Confirm".

A save for another field:

11. Open submission 9, "Hansen & Pinto: Reason Reclaimed", "Publication
    Settings". No "Issue Assignment" choice is checked.
12. Type "1-10" in "Pages" and "Save". Reload the page.
13. "Title & Abstract", "Schedule For Publication", "Version of Record",
    "Major", "Confirm".

**Expected.** Step 6's window reads, as in step 3, "This will be
published when Vol. 2 No. 1 (2015) is published." with "Schedule For
Publication", and step 7 leaves "Status: Scheduled". After step 9
"Assign To Future Issue and Schedule Only" stays checked, and step 10's
window offers scheduling. Step 12 leaves the issue choice unmade, or
asks for one, as the same save does on a journal with a published issue
("Go to Issue: This field is required.").

**Observed.** Step 6's window:

```
All publication requirements have been met. This will be published immediately as continuous publication even though it is assigned to Vol. 2 No. 1 (2015) which is not published yet. Are you sure you want to publish this?
```

with the button "Publish"; step 7 leaves "Status: Published". After
step 9's "Saved", and after the reload, "Assign To Future Issue and
Publish Immediately" is checked; step 10's panel opens with it checked
and the window is step 6's again, with "Publish". Step 12 reads
"Saved", and the page, the reload and step 13's panel show "Don't Assign
To An Issue" checked; step 13's window reads "This will be published
immediately without any issue association." with "Publish".

## Cause

`IssueAssignment::defaultAssignment()`
([classes/issue/enums/IssueAssignment.php](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/issue/enums/IssueAssignment.php#L117-L128))
returns `CURRENT_BACK_ISSUES_PUBLISHED` whenever the journal has any
issue, published or not. `getAvailableAssignmentOption()` in the same
enum offers "Assign To Current/Back Issue" only when a published issue
exists. So on a journal whose issues are all unpublished, the default
names an option the form does not offer.

`Repository::getIssueAssignmentStatus()`
([classes/publication/Repository.php](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/publication/Repository.php#L410-L463))
returns that default for a version that was never published and has no
issue. So `GET …/publications/{id}/issueAssignmentStatus` answers
`{"assignmentType": 4, "status": 6}` (6 is `STATUS_READY_TO_PUBLISH`).
A version with an issue, or with a ready or scheduled status, gets an
assignment deduced from what is stored, which is always offered; that
is why a saved choice survives a later save.

ui-library's `useWorkflowPublicationFormIssue.js`
([lines 137-212](https://github.com/pkp/ui-library/blob/64d673631817f14826a048a462e56d9ee0168b44/src/pages/workflow/composables/useWorkflowPublicationFormIssue.js#L137-L212))
writes that answer into the form: the `assignment` field gets 4 and the
hidden `status` gets 6. No radio carries 4, so nothing shows checked,
`currentAssignmentOption` stays empty, and the `isInitialDataLoad` flag
is never cleared. The editor's first pick then takes the initial-load
branch, which keeps the hidden status. "Confirm" and "Save" send
`status: 6` with the chosen issue, which means publish now. A second
pick takes the other branch and writes the pick's status.

A save with no pick sends `assignment=4`. The issue select's `showWhen`
lists only the offered options (2 and 3), so 4 hides it and its required
check is skipped. The server stores `status: 6` with no issue, and
`getIssueAssignmentStatus()` reads that back as "Don't Assign To An
Issue".

Reach:

- "Review Publishing Details" (the version form in publish mode) and
  Publication Settings: both use the composable; walked.
- Journals with a published issue: the default is offered and
  preselected, so every pick writes its status; walked (steps 2-3).
- Journals with no issue at all: the default is "Don't Assign To An
  Issue", which is offered; read in the code.
- Declined versions also get `defaultAssignment()`; read in the code,
  not walked.
- Stored data: steps 6 and 9 store `STATUS_READY_TO_PUBLISH` with the
  future issue, and step 12 stores it with no issue. Neither can be
  told apart from the same choice made on purpose, so no repair is
  possible.

## Proposed fix

Make `defaultAssignment()` return an option the journal is offered:
"Assign To Current/Back Issue" when a published issue exists, "Assign
To Future Issue and Schedule Only" when only future issues exist, "Don't
Assign To An Issue" otherwise. The query follows
`getAvailableAssignmentOption()`, which already filters by
`filterByPublished()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issue-schedule-only-publishes-now/fix.diff)):

```diff
-        $issueExists = Repo::issue()
+        $issueExists = fn (bool $published): bool => Repo::issue()
             ->getCollector()
             ->filterByContextIds([$context->getId()])
+            ->filterByPublished($published)
             ->getQueryBuilder()
             ->exists();
 
-        return $issueExists
-            ? static::CURRENT_BACK_ISSUES_PUBLISHED
-            : static::NO_ISSUE;
+        return match (true) {
+            $issueExists(true) => static::CURRENT_BACK_ISSUES_PUBLISHED,
+            $issueExists(false) => static::FUTURE_ISSUE_SCHEDULED,
+            default => static::NO_ISSUE,
+        };
```

The preselected choice then shows, the form's initial load is cleared
when the panel opens, and every pick writes its own status, as on a
journal with a published issue. "Schedule Only" is proposed as the
future-issue default for two reasons. First, it is what choosing a
future issue did on 3.5, which schedules into an unpublished issue.
Second, like the Current/Back default, it leaves the issue empty, so a
save is refused until an issue is chosen.

Tried on `main`. With the fix, step 5's panel opens with "Assign To
Future Issue and Schedule Only" checked, step 6's window offers
"Schedule For Publication", and step 7 leaves "Status: Scheduled". Step
9's choice stays checked after the save and the reload. Step 12's save
is refused with "Go to Issue: This field is required." until an issue
is chosen. On the journal with its published issue, step 3's panel and
the same "Pages" save behave alike with and without the fix.

**Alternatives.**

- Default to "Assign To Future Issue and Publish Immediately": fixes the
  same fault, but preselects publishing now on a journal that schedules
  into issues. Which default fits is the team's call; the fix works
  with either.
- A guard in the composable that ignores an assignment not among the
  options and clears `isInitialDataLoad` on the first pick: covers the
  two forms but leaves the API answering an option it does not offer.
  Worth adding as well if the team wants the form robust to it.

**What goes with it.**

- Test: OJS has no unit tests of this enum, and the method queries
  `Repo::issue()`, so a unit test needs a database with issues. The
  simpler guard is the e2e scenario "Where no issue is published" in
  U49's scheduling scenario (Planned): first pick of "Schedule Only" on
  a journal with only a future issue ends in "Status: Scheduled". A
  DB-backed PHPUnit test of `defaultAssignment()` for the three journal
  states is the alternative, if the team wants one in OJS.

Small: one method in one OJS file, and the test.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issue-schedule-only-publishes-now/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issue-schedule-only-publishes-now/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/future-issue-schedule-only-publishes-now/walk.js [walk|neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` is the
  fix trial's check on the journal with its published issue. The script
  also reads each save's request: step 6's "Confirm" and step 9 send
  `status: 6` with `issueId: 2`, step 12 sends `assignment=4` and
  `status: 6` with no issue. No server error or page script error in
  any run.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
    (lib/pkp ddd8ab243a, lib/ui-library 64d6736318).
  - 3.5: OJS [091fb65453](https://github.com/pkp/ojs/commit/091fb654532931902904df6e3712a151baf72dc6)
    (lib/pkp cf3f984335, lib/ui-library d4e0188353). Only the surface
    was walked: submission 5's "Schedule For Publication" opens "Select
    an issue to schedule for publication" with an issue list and no
    assignment choices, so the Steps cannot be taken. In the code,
    `Repository::setStatusOnPublish()` schedules into an unpublished
    issue and publishes otherwise.
- Code reads:
  - `main`: `IssueAssignment` (every method),
    `Repository::getIssueAssignmentStatus()`,
    `SubmissionController::getIssueAssignmentStatus()`,
    `IssueController` (`assignmentOptions`), and in ui-library
    `useWorkflowPublicationFormIssue.js` with its two callers
    (`WorkflowPublicationForm.vue`, `useWorkflowVersionForm.js`).
    `defaultAssignment()` has no other caller. For Impact:
    `ArticleHandler` serves any published version to every visitor,
    and `IssueHandler` and `SitemapHandler` list published issues
    only.
  - 3.4 (code): OJS `upstream/stable-3_4_0`
    [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315):
    no `IssueAssignment`; `AssignToIssueForm` picks an issue and
    `Repository::setStatusOnPublish()` schedules into an unpublished one.
  - 3.3 (code): OJS `upstream/stable-3_3_0`
    [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b):
    `AssignToIssueForm`, and
    `PublicationService::publishPublicationBefore()` sets
    `STATUS_SCHEDULED` for an unpublished issue.
- Introduced: the composable's initial-load handling is blamed whole on
  ui-library
  [be23860556](https://github.com/pkp/ui-library/commit/be23860556943edc3bc9180282e3377e784fded9)
  (`pkp/ui-library#683`), merged with the OJS change.
- Upstream: searched 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, by the symptom's words and by
  `IssueAssignment`, `defaultAssignment` and
  `useWorkflowPublicationFormIssue`. Closest, and not this fault:
  `pkp/pkp-lib#6150` (no issue menu after unscheduling, open).
- Not driven: a journal whose first issue is created new (the Steps
  unpublish the dataset's issue instead; the default reads only whether
  a published issue exists); a declined version; a "Pages" save on a
  version with a choice already saved (read in
  `getIssueAssignmentStatus()`); whether the published article shows in
  OAI-PMH or search; MySQL and MariaDB.
