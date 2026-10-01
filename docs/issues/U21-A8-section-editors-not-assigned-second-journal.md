# On every journal, press or server but the install's first, a section's configured editors are never assigned

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12221` for `pkp/pkp-lib#12197` · [8a9c145806](https://github.com/pkp/pkp-lib/commit/8a9c14580699690fc2ba5b23e9fd5bcf02fb2b32) · 2026-01-26 · Hafsa-Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal can name editors under a section's "Editorial Assignments", and
a press under a series', so that they are assigned to every new submission.
On any journal, press or server created after the install's first one,
this assigns nobody. The submission arrives with no editor, the
configured editor is never emailed and never sees it, and the managers
get the "needs an editor" alert instead.

The submission is not lost, but on such a journal every submission waits
until a manager assigns the editor by hand. On the install's first journal
the same setup works, which hides the fault from a quick check.

## Impact

- **Lost**: the automatic assignment of the configured editors, and the
  email that tells them.
- **Who**: every author, and every configured editor, of a section,
  series or preprint section with editors under "Editorial Assignments",
  on every journal, press or server of an install apart from the first
  one created.
- **Way round**: the managers get "A new submission needs an editor to be
  assigned" (an email and a task), and one of them assigns the editor from
  the submission's "Participants" › "Assign".

Medium: the task fails, but there is a way round on screen.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same, with the words
  in brackets).
- A second journal, which the dataset lacks; the steps create it.

Second journal:

1. Sign in as `admin`. Administration › "Hosted Journals" ["Hosted
   Presses", "Hosted Servers"] › "Create Journal".
2. Title "Second Journal u21ir25", initials, contact name and email,
   country, path `u21ir25`, English as language and primary language,
   tick "Enable this journal to appear publicly on the site", "Save".
3. The "Settings wizard" opens. On its "Users" tab press "Search", tick
   "Include users with no roles in this journal.", search `dbuskins`. On
   David Buskins's row: "Edit User", tick "Section editor" ["Series
   editor", "Moderator"], "OK".
4. The same for `ccorino` [OMP: `aclark`]: tick "Author", "OK".
5. Open the new journal's Settings › Journal › "Sections"
   (`/index.php/u21ir25/management/settings/context`). On "Articles"
   [OPS: "Preprints"]: "Edit", tick "Assign David Buskins as Section
   editor" under "Editorial Assignments", "Save". [OMP: "Series" › "Add
   Series", title "u21ir25 Series", path `u21ir25s`, tick "Assign David
   Buskins as Series editor", "Save".]
6. Sign out. Sign in as `ccorino` [`aclark`] and open
   `/index.php/u21ir25/en/submission`. Type a title (the journal has one
   section, "Articles", so the page offers no section choice; OPS the
   same with "Preprints"; OMP: leave "Monograph: Authors are associated
   with the book as a whole." chosen), tick the two boxes, "Begin
   Submission". Upload a file, type an
   abstract [OMP: on "For the Editors" choose the series "u21ir25 Series";
   OPS: on "For Readers" choose "This preprint has not been published
   elsewhere."], "Submit", and confirm with "Submit".
7. Sign out. Sign in as `admin` and open the submission from the new
   journal's Dashboard. Read "Participants".
8. Read the mail of `dbuskins@mailinator.com` and
   `pkpadmin@mailinator.com`.

Control, on the dataset's own journal:

9. As `ccorino` [`aclark`], submit the same way to `publicknowledge`,
   choosing the section "Articles" on the start page [OMP: the series
   "Library & Information Studies" on "For the Editors"; OPS: the server
   has one section, "Preprints", so there is no choice]. The dataset already lists editors under these sections'
   "Editorial Assignments".
10. As `admin`, open that submission and read "Participants".

**Expected.** Step 7 lists "David Buskins" as "Section editor" ("Series
editor", "Moderator") beside the author. On OJS and OMP David Buskins gets
"You have been assigned as an editor on a submission to Second Journal
u21ir25". A preprint server sends this email to nobody, because it goes
only to editors who work at the submission stage, and a moderator works
at the production stage only. No "needs an editor" email goes out.

**Observed.** Step 7 lists the author alone:

```
PARTICIPANTS
Assign
CC
Carlo Corino
Author
```

David Buskins gets no email, and `admin`, the journal's manager, gets
`A new submission needs an editor to be assigned: "<title>"`. The same on
OMP (Arthur Clark alone) and OPS (Carlo Corino alone).

The control assigns as configured: OJS lists Daniel Barnes (Journal
editor), David Buskins and Stephanie Berardo (Section editor); OMP David
Buskins (Series editor); OPS David Buskins and Stephanie Berardo
(Moderator). David Buskins gets "You have been assigned as an editor on a
submission to Journal of Public Knowledge" (OJS; OMP likewise), and no
"needs an editor" email goes out.

## Cause

`SubEditorsDAO::assignEditors()` (lib/pkp
`classes/context/SubEditorsDAO.php`, line 211) reads the context's user
group ids from the keys of a collection:

```php
$userGroups = UserGroup::query()
    ->withContextIds([$submission->getData('contextId')])
    ->get();

$userGroupIds = $userGroups->keys();
```

It then keeps only the configured assignments whose `userGroupId` is in
`$userGroupIds`. An Eloquent `get()` returns a list keyed 0, 1, 2…, so
`$userGroupIds` holds positions, not ids. An assignment survives only when
its group's id happens to be smaller than the number of groups in the
context. On the install's first context the ids start at 2, so its
editorial groups pass. A later context's groups all have ids above that
count, so every assignment is dropped. The listener `AssignEditors` then
sees no assigned editor and alerts the managers.

The line was written in 2022 for the old user group collector, whose
`getMany()` yielded each group under its id. The line was still correct
after the Eloquent refactor (`pkp/pkp-lib#10506`), because `SettingsBuilder`, which
loads every model with a settings table, keyed its result by the primary
key (`$this->query->get()->keyBy($primaryKey)` in
`getModelWithSettings()`). 8a9c145806 (`pkp/pkp-lib#12197`) removed that
keying so that eager loads which return several rows per id keep them
all. Since then a `UserGroup` collection is keyed by position, and this
line has been wrong. `stable-3_5_0` still keys by id, which is why 3.5
assigns correctly.

Reach:

- The section path and the category path both go through this filter,
  so category "Editorial Assignments" fail the same way (code read, not
  driven).
- Any editorial role whose id is not smaller than the context's group
  count is dropped on the first context too, for example a role created later
  under Users & Roles › "Roles" (code read, not driven).
- No stored data is wrong. The configured assignments stay in
  `subeditor_submission_group`; they are only not applied.
- Other callers that treat a settings-backed collection as id-keyed: the
  masthead pages had the same fault (`pkp/pkp-lib#13218`, fixed in
  0d4d08f58f). A scan of lib/pkp and the three apps for `->keys()`,
  `->get($id)`, `->has()` or `[$id]` on such a collection after `get()`
  finds this line and one other, `UpdateAuthorStageAssignments::handle()`
  (`$userGroups->get($stageAssignment->userGroupId)`). That listener now
  does nothing, but `RestrictAuthorAssignment` does the same job on the
  same event correctly: after each submission made by following the Steps,
  the author's `can_change_metadata` matched their group's setting.

## Proposed fix

Key the collection by id where it is built, as the masthead fix did
(`Repository::getSortedMastheadUserGroups()` ends in `->keyBy('id')`).
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editors-not-assigned-second-journal/fix.diff):

```diff
         $userGroups = UserGroup::query()
             ->withContextIds([$submission->getData('contextId')])
-            ->get();
+            ->get()
+            ->keyBy('id');
 
         $userGroupIds = $userGroups->keys();
```

`$userGroupIds` then holds the ids, and the later
`$userGroups->first(fn … $userGroup->id == $assignment->userGroupId)`
still works (it could become `$userGroups->get($assignment->userGroupId)`).
The fix was tried on OJS, OMP and OPS `main`: the Steps then gave the
Expected on all three. As a negative control, a second journal whose
section names no editor under "Editorial Assignments", while David
Buskins holds the Section editor role there, still assigned nobody and
still alerted the managers, with and without the fix.

**Alternatives**

- Restore the id keying in `SettingsBuilder::getModelWithSettings()` for
  results with one row per id, as 6bcbd5c080 briefly did. That would mend
  every caller at once, but it makes settings-backed models behave
  differently from plain Eloquent ones, which is the assumption that
  broke here, and pkp-lib already chose to fix the masthead at its caller.
- `$userGroupIds = $userGroups->pluck('id')` fixes the filter just as
  well; `keyBy('id')` also keeps the collection usable by id below.

**What goes with it**

- A test. lib/pkp has no test of `SubEditorsDAO` and no fixture that
  builds a context with its user groups: `DatabaseTestCase` only backs up
  and restores the tables a test names. A unit test therefore needs one,
  a `DatabaseTestCase` that creates a second context (with the default
  user groups the context service installs), a section with a
  `subeditor_submission_group` row, a sub-editor holding that group and
  a submitted submission, then checks `assignEditors()` returns that
  user and builds the stage assignment; the method also reads the request
  and sends mail, which the test must stub. The cheaper guard is the e2e
  scenario "Editors learn of the new submission" run on a context other
  than the first (spec U21, Rule 11), which this report's Steps already
  take.
- `UpdateAuthorStageAssignments` is left out of the fix: it duplicates
  `RestrictAuthorAssignment`, so the right change there is to remove it,
  which is a separate clean-up.
- No data repair and no API change.

Medium: the fix is one line, but its unit test needs a new fixture for a
second context with its user groups.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editors-not-assigned-second-journal/walk.js),
  with its helpers in `lib.js` beside it; the negative control is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editors-not-assigned-second-journal/neighbour.js).
  On an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editors-not-assigned-second-journal/walk.js`
- Taken on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets 27f1204
  (2026-10-01).
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  18d097d94e, OMP b24879c3d, OPS 3f0919468c (lib/pkp 1fb843f491);
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b (lib/pkp
  df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS
  c5532e2161 (lib/pkp d446601ebe).
- Code reads:
  - `main`: `SubEditorsDAO::assignEditors()`, the `AssignEditors`,
    `UpdateAuthorStageAssignments` and `RestrictAuthorAssignment`
    listeners, `PKPSectionForm` (which roles "Editorial Assignments"
    offers), `SettingsBuilder::getModelWithSettings()` with `git log -L`
    (6bcbd5c080, then 8a9c145806, both in `pkp/pkp-lib#12221`, merged
    2026-01-28), `Repository::getSortedMastheadUserGroups()`, and
    `lib/pkp/tests` for an existing context fixture (none). A PHP check
    on the loaded installs printed the second journal's `UserGroup`
    collection keys: `[20, …, 37]` on 3.5, `[0, …, 17]` on `main`.
  - 3.4: `assignEditors()` takes `$userGroups` from the collector
    (`getMany()`, keyed by id), so the filter holds.
  - 3.3: `PKPSubmissionSubmitStep4Form::execute()` assigns each
    configured sub-editor through `getByUserId()` in the submission's
    context, with no such filter.
- Upstream searches (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ops, by the symptom ("section editor not assigned automatically",
  "editorial assignments", "series editor", "moderator") and by
  `assignEditors`, `SubEditorsDAO`, `SettingsBuilder` and "keyed by
  index".
- Unverified: MySQL; the `stable-3_4_0` and `stable-3_3_0` lines were read
  in the code only.
