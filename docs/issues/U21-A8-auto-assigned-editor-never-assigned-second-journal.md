# Editors set to be assigned automatically by a section are never assigned on a second journal

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12221` for `pkp/pkp-lib#12197` · [8a9c145806](https://github.com/pkp/pkp-lib/commit/8a9c14580699690fc2ba5b23e9fd5bcf02fb2b32) · 2026-01-26 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A section configured to assign editorial users automatically
("Editorial Assignments" on the section form) assigns nobody on any
journal but the one created first on the install (the one with the
lowest id). The submission
arrives with no editor, the configured editor is never emailed and
never sees it, and the managers get the needs-an-editor alert instead.

The managers can assign the editor by hand from the submission's
"Participants". The editor is then emailed only if the manager writes
or picks a message in that window; the automatic "You have been
assigned as an editor" email is not sent.

It affects journals, presses and preprint servers, sections and series
alike, on the development branch (`main`) only: the released versions
(3.5, 3.4 and 3.3) assign as configured.

## Impact

- **Lost:** the automatic assignment the journal set up, and the
  editor's "You have been assigned as an editor on a submission to
  {journal}" email. Nothing says that the configured assignment failed:
  the managers' alert reads like the one for a section with no editors.
- **Who:** authors submitting to a section with editors set under
  "Editorial Assignments", on every journal of an install but the one
  created first, and the editors set there.
- **Way round:** the managers get "A new submission needs an editor to
  be assigned" and a task, and can assign the editor by hand from
  "Participants".

Medium: the configured assignment fails on every journal but the first,
with no sign that it was configured, but the managers are alerted and
can assign the editor on screen; it would be high if nobody were told.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: one journal, `publicknowledge`
  (OJS; for OMP and OPS replace "journal" by press or server, and use
  the words in brackets). There, `dbuskins` is assigned automatically by
  the section "Articles" [OMP: the series "Library & Information
  Studies"; OPS: the section "Preprints"].

As the site administrator:

1. Sign in as `admin`.
2. Administration › "Hosted Journals" › "Create Journal": Journal title
   "u21w33 Second Journal", initials "U21W33", contact "u21w33 Contact",
   u21w33@mailinator.com, country Canada, path `u21w33`, language
   English (primary), "Enable this journal to appear publicly on the
   site" ticked; "Save".
3. Administration › "Hosted Journals" › the `u21w33` row's arrow ›
   "Settings wizard" › "Users": "Search" for `dbuskins` with "Include
   users with no roles in this journal." ticked; the row's "Edit User";
   tick "Section editor" ["Series editor"; "Moderator"]; "OK".
4. Open the u21w33 journal's Settings › Journal › "Sections": the
   "Articles" row's "Edit" [OPS "Preprints"; OMP: "Series" › "Add
   Series", title "u21w33 Series", path `u21w33`]. Under "Editorial
   Assignments" tick "Assign David Buskins as Section editor" ["… as
   Series editor"; "… as Moderator"]; "Save". The row's "Editors" cell
   reads "David Buskins".

As an author:

5. Sign in as `ccorino` [OMP `aclark`]. Profile › "Roles" › "Register
   with other journals": under "u21w33 Second Journal" tick "Author";
   "Save".
6. Open u21w33's "Make a Submission": title "u21w33 Tide Tables", tick
   the checklist and privacy boxes, "Begin Submission". Upload a PDF as
   "Article Text" [OPS: a "PDF" galley], type an abstract, and
   "Continue" through the steps [OMP: on "For the Editors", choose the
   series "u21w33 Series"]. On "Review", "Submit", and "Submit" again in
   the confirmation.

As the editor:

7. Read the mailboxes of dbuskins@mailinator.com and
   pkpadmin@mailinator.com (`admin` is the new journal's only manager).
8. Sign in as `dbuskins`, open u21w33's Dashboard, then the submission
   (`/index.php/u21w33/en/dashboard/editorial?workflowSubmissionId=<id>`).

**Expected:** dbuskins receives "You have been assigned as an editor on
a submission to u21w33 Second Journal" [OPS: no email; a preprint
server sends none to an assigned Moderator,
[OPS10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#ops10)].
The submission is under "Assigned to me" and its "Participants" list
"David Buskins". No "needs an editor" email goes to `admin`.

**Observed** (OJS, OMP and OPS): dbuskins receives nothing, and `admin`
receives:

```
A new submission needs an editor to be assigned: "u21w33 Tide Tables"
```

dbuskins's Dashboard reads "Assigned to me (0)", and opening the
submission shows an "Error" dialog, "The current role does not have
access to this operation." The administrator's view of the submission's
participants lists only the author:

```
PARTICIPANTS
Carlo Corino
Author
```

Control: steps 6–8 on `publicknowledge` (its section or series named in
the preconditions, submission language "English", title "u21w33 Control
Tides") assign dbuskins, who gets the email [OPS: none] and sees the
submission under "Assigned to me".

## Cause

`SubEditorsDAO::assignEditors()` (pkp-lib
`classes/context/SubEditorsDAO.php`, line 211) keeps only the
configured assignments whose user group belongs to the submission's
context. It builds that list of group ids from the keys of the context's
user groups:

```php
$userGroups = UserGroup::query()
    ->withContextIds([$submission->getData('contextId')])
    ->get();

$userGroupIds = $userGroups->keys();
```

The keys are not the group ids. `UserGroup` is an Eloquent model, and
an Eloquent collection is keyed by position, 0 to n−1 for a context with
n groups. So an assignment is kept only when its group's id is below the
number of groups in that context.

On an install, the journal created first (the lowest context id) gets
the group ids that come right after the site administrator's group: 2–19
for OJS's 18 groups. Its editorial groups fall below 18 and are kept;
only its last groups (on OJS, Subscription Manager and Editorial Board
Member), which no section offers, would fail. Every later journal's
groups are numbered after the first's (20–37 on the second journal), so
every assignment there is dropped, `assignEditors()` returns no user,
and the `AssignEditors` listener sends the needs-an-editor alert. A group
added to the first journal later fails there too, since its id is above
the count, and on an install whose first journal was deleted no journal
assigns.

The line came from the refactor to Eloquent (`pkp/pkp-lib#10519` for
`pkp/pkp-lib#10506`, 714d5d5aa4, 2024-10-15). It worked then because
`SettingsBuilder::getModelWithSettings()`, which loads every model that
keeps settings, keyed its rows by primary key
(`$this->query->get()->keyBy($primaryKey)`). The fix for
`pkp/pkp-lib#12197` dropped that keying on purpose, so that a query
returning one model several times (a `belongsToMany` eager load) keeps
every row. 6bcbd5c080 kept the keying only when no model appeared twice
in the result, and 8a9c145806 removed it altogether. Since then every
such collection is keyed by position, and the `keys()` line reads
positions.

Reach:

- Section (or series) assignments and category assignments: the two
  `getBySubmissionGroupIds()` calls in `assignEditors()` feed the same
  filter (code).
- No stored data is wrong: the configured editors are kept, only the
  assignment at submission time is skipped.
- `UpdateAuthorStageAssignments::handle()` (pkp-lib
  `classes/observers/listeners/UpdateAuthorStageAssignments.php`, line
  50) looks up author groups the same way
  (`$userGroups->get($stageAssignment->userGroupId)` on a collection
  keyed by position) and so finds none, on every journal. It has no
  visible effect: `RestrictAuthorAssignment::handle()` listens to the
  same `SubmissionSubmitted` event, loads each author assignment's group
  with `UserGroup::findById()` and sets the same `canChangeMetadata`
  value (code). It is left out of the fix; the team may want to delete
  the duplicate listener.

## Proposed fix

A proposal; the team decides. Read the group ids from the models, not from the collection's keys
(excerpt of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/auto-assigned-editor-never-assigned-second-journal/fix.diff)):

```diff
--- a/lib/pkp/classes/context/SubEditorsDAO.php
+++ b/lib/pkp/classes/context/SubEditorsDAO.php
@@ -208,7 +208,8 @@
             ->withContextIds([$submission->getData('contextId')])
             ->get();
 
-        $userGroupIds = $userGroups->keys();
+        // An Eloquent collection is keyed by position, not by user group id
+        $userGroupIds = $userGroups->pluck('id');
```

It follows how the code base already reads Eloquent user groups:
`pluck('id')` in `ReportForm` and `PKPEditTaskTemplateController`. It
keeps what `pkp/pkp-lib#12197` was for, since `SettingsBuilder` is left
alone.

Tried on `main` with OJS, OMP and OPS: the walk then showed the Expected
on all three (dbuskins assigned and, on OJS and OMP, emailed; no "needs
an editor" email), and the `publicknowledge` control did not change. A
section with no editors ticked still sent the submission in unassigned
and alerted the manager, with the fix and without it.

**Alternatives:**

- Restore `keyBy($primaryKey)` in `SettingsBuilder` when no model
  appears twice (the 6bcbd5c080 state): it would mend this caller and
  any other that relies on the old keys, but it brings back a collection
  whose keys depend on whether the query returned a model twice, a
  behaviour no other Eloquent model has. Not recommended.
- Drop the context filter in `assignEditors()`: the section form only
  offers the context's own groups, but the filter guards against
  assignments left over from a group moved or deleted; not worth losing.

**What goes with it:**

- No data repair for the configuration. Submissions already made on
  `main` to a journal other than the first since 8a9c145806 have no
  automatic editors; no release has them, so no upgrade step is
  proposed.
- A unit test of `SubEditorsDAO::assignEditors()` with a context whose
  group ids do not start at 1, or the e2e scenario here (U21 "Editors
  learn of the new submission", run on a second journal).
- Optionally, delete `UpdateAuthorStageAssignments` as a duplicate of
  `RestrictAuthorAssignment` (see Reach).

Small: one line in pkp-lib following a pattern the code already uses,
and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/auto-assigned-editor-never-assigned-second-journal/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/auto-assigned-editor-never-assigned-second-journal/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1–8
  and then the control. With `CONTROL=0` in front it skips the control;
  with `NEIGHBOUR=1` in front it leaves step 4's box unticked, the check
  that a section with no editors still alerts the managers. It also
  reads the submission's stage assignments and the section's configured
  editors from the database.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/auto-assigned-editor-never-assigned-second-journal/fix.diff ojs omp ops`,
  the script, then the script with `NEIGHBOUR=1 CONTROL=0` in front,
  then `node bin/try-fix.js revert ojs omp ops`; the second walk was
  also taken without the fix.
- The script's mailbox read lists every message to the address since
  the walk started. The machine's other test installs mail the same
  `dbuskins` address, so only the messages that name the u21w33 context
  or submission count.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), on `main` and `stable-3_5_0`, OJS, OMP and OPS.
  The steps were the same on both lines.
- Not driven: category assignments; a manager's assignment by hand
  (that it emails the editor only the message typed or picked in the
  window is read in `PKPStageParticipantNotifyForm::execute()`, which
  sends only when the optional "Message" is filled, and
  `AddParticipantForm::isMessageRequired()`, which returns false);
  `UpdateAuthorStageAssignments` and `RestrictAuthorAssignment`, read in
  the code only (both found as listeners of `SubmissionSubmitted` by the
  event discovery of `lib/pkp/classes/observers/listeners`). MySQL not
  checked; the fault does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - `main` and 3.5: `SubEditorsDAO::assignEditors()` has the same body
    on both, with the `keys()` line at 211 on `main` and 212 on 3.5. Run
    through the app's own command-line bootstrap on the walked OJS
    installs, `UserGroup::query()->withContextIds([n])->get()->keys()`
    gives positions on `main` (`0…17` for context 1, whose ids are
    2–19) and the ids on 3.5 (`20…37` for context 2). 3.5's `SettingsBuilder::getModelWithSettings()`
    still has `->keyBy($primaryKey)` (line 333); `main`'s has not.
  - 3.4: pkp-lib `classes/context/SubEditorsDAO.php` builds
    `$userGroups` with `Repo::userGroup()->getCollector()->getMany()`,
    and `userGroup/DAO::getMany()` yields `user_group_id => model`, so
    `keys()` gives the ids.
  - 3.3: pkp-lib `PKPSubmissionSubmitStep4Form::execute()` assigns the
    section's and categories' sub editors from
    `SubEditorsDAO::getBySubmissionGroupId()` and each editor's groups
    in the submission's context, with no list of group ids to filter
    by.
  - Every instance: a search of pkp-lib, OJS, OMP and OPS for
    collections of the models that keep settings (`UserGroup`,
    `Announcement`, `EditorialTask`, `Template`, `ControlledVocabEntry`,
    `UserComment`, `ContributorRole`, `Funder`, `DataCitation`,
    `ReviewerSuggestion`, `AuthorResponse`, `ReviewerRecommendation`)
    read by `keys()`, `get($id)`, `[$id]`, `has()` or `only()` found
    the `SubEditorsDAO` and `UpdateAuthorStageAssignments` lines; the callers of
    `Repo::userGroup()->getUserGroupsByStage()` read `$userGroup->id`.
    A collection handed on through other helpers was not traced.
- Kind and Introduced: `git blame` on line 211 gives e79fc21e20
  (Nate Wright, 2022-10-18), when the list still came from the user
  group collector keyed by id; 714d5d5aa4 (`pkp/pkp-lib#10519`, the
  Eloquent refactor) switched the query and relied on
  `SettingsBuilder`'s keying. `git log -L` on
  `getModelWithSettings()` shows that keying made conditional in
  6bcbd5c080 and removed in 8a9c145806, both in `pkp/pkp-lib#12221`
  (merged 2026-01-28), which the GitHub API names for both commits.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library by the symptom's words and by `assignEditors`,
  `SubEditorsDAO` and `SettingsBuilder keyBy`.
