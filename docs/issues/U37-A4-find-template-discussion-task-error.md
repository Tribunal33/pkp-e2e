# When adding a task or discussion, a "Find Template" search for "discussion" or "task" opens an "Error" window

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no task and discussion templates)
  - 3.4: none (code; no task and discussion templates)
  - 3.3: none (code; no task and discussion templates)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4) · committed 2026-06-01, merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The application fails on the server when someone adding a task or a
discussion searches the templates for "discussion", "discussions",
"task" or "tasks", alone or with other words, even a template's full
name such as "Discussion (Production)". A window "Error" opens over the
"Add" window with a PHP error message, and the template list reads "No
items found.".

So typing "discussion" or "task" does not filter the list to only
discussions or only tasks, although each template button starts with
its kind ("DISCUSSION - …", "TASK - …"). After "OK" the "Add" window
stays open; its list reads "No items found." until the next search, and
a search by another word lists templates again.

## Impact

- **Lost**: nothing is stored or sent wrong. The person gets an error
  instead of the templates they searched for.
- **Who**: anyone adding a task or discussion (editors, section editors,
  assistants, authors) who types one of the four words into "Find
  Template". A new install ships only discussion templates, at most six
  per stage; managers can add task and discussion templates of their
  own in Settings › Workflow › "Tasks and Discussions", and those
  appear with "TASK - …" or "DISCUSSION - …".
- **Way round**: search by another word of the template's name, or
  clear the search box to get the whole list back and pick the template
  from it.

Low: the template is still found and used. A stage with so many
templates that the list is no longer practical to read would make the
search necessary and raise it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 5, "Genetic transformation of forest trees", in Production.
  On a new install its stage offers four templates, all of them discussions:
  "Discussion (Production)", "Assign Editor", "Ready for Production" and
  "Galleys Complete". [Press: submission 4, "How Canadians Communicate:
  Contexts of Canadian Popular Culture", with "Index Requested" and
  "Index Completed" besides. Preprint server: submission 1, "The
  influence of lactation on the quantity and quality of cashmere
  production", with "Discussion (Production)" and "Assign Editor".]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   5 at its "Production" stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`)
   [press: submission 4; preprint server: submission 1].
2. Under "Production Tasks & Discussions" press "Add".
3. Under "Templates to get you started!", type `discussion` in "Find
   Template" and press Enter.
4. Press "OK" if a window opens. Type `Discussion (Production)` instead
   and press Enter.
5. Press "OK" if a window opens. Type `task` instead and press Enter.

**Expected:** step 3 lists the stage's discussion templates, here all of
them ("DISCUSSION - Galleys Complete", "DISCUSSION - Ready for
Production", "DISCUSSION - Assign Editor", "DISCUSSION - Discussion
(Production)" on the journal). Step 4 lists "DISCUSSION - Discussion
(Production)". Step 5 reads "No items found.", since the stage has no
task template.

**Observed:** each Enter opens a window over the "Add" window:

```
Error
Call to undefined method PKP\core\SettingsBuilder::filterByType()
OK
```

Behind it the template list reads "No items found.". Each Enter sends
the search twice, and both answer 500:

```
GET /index.php/publicknowledge/api/v1/editTaskTemplates?stageId=5&search=discussion&offset=0&count=9999&perPage=9999   500
```

The server log:

```
production.ERROR: Call to undefined method PKP\core\SettingsBuilder::filterByType() {"exception":"[object] (BadMethodCallException(code: 0): Call to undefined method PKP\\core\\SettingsBuilder::filterByType() at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Support/Traits/ForwardsCalls.php:67)
```

A search without those words works: `Galleys` [preprint server:
`Assign`] answers 200 and lists the templates whose name or text holds
it.

## Cause

`Template::scopeWithSearch()`
(`lib/pkp/classes/editorialTask/Template.php`) takes the words "task",
"tasks", "discussion" and "discussions" out of the phrase and turns them
into a type filter, so that the words select one kind of template. It
applies the filter with `$query->filterByType($typeFilter)` (line 293).
The model has no `filterByType` scope: its type scope is
`scopeWithType()`. The Eloquent builder finds no scope by that name and
throws `BadMethodCallException`, and `GET editTaskTemplates` answers
500.

The line was right when it was written: `pkp/pkp-lib#11885` (960b1695e1,
2025-11-06) added the type words, and the scope was then named
`scopeFilterByType()`. b3b882bec9 (`pkp/pkp-lib#12593`) renamed the
model's scopes (`scopeByContextId` to `scopeWithContextId`, and the
`filterBy…` ones to `withStageId`, `withInclude`, `withType`,
`withTitleLike`, `withSearch`) and updated the callers in
`PKPEditTaskTemplateController::getMany()`, but not this call inside
the model. On `main` the type words worked from 2026-01-21, when the
"Find Template" box arrived (`pkp/ui-library#765`), until the rename
was merged on 2026-08-21: the last `main` commit before the merge
(30a2572a7a) has both the call and `scopeFilterByType()` (read in the
code, not driven on screen).

Reach:

- The "Find Template" box of the "Add" and "Edit" windows
  (ui-library `useDiscussionManagerTemplates.js`) is the only screen that
  sends `search`; Settings › Workflow › "Tasks and Discussions" lists
  templates without it. Checked in the code; the "Add" window driven on
  screen.
- Every stage and every role that may open the window sends the same
  request. Driven on screen as `dbarnes` on the Production stage.

## Proposed fix

Call the scope by its current name
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/find-template-discussion-task-error/fix.diff)):

```diff
         if ($typeFilter !== null) {
-            $query->filterByType($typeFilter);
+            $query->withType($typeFilter);
         }
```

The type rule lives in the model's own scope, which the controller
already uses for the `type` parameter (`$collector->withType($type)`), so
the search now filters the same way.

Tried on OJS, OMP and OPS `main` with the Steps: `discussion` listed
every discussion template, `Discussion (Production)` that one template,
and `task` read "No items found.", all answering 200. A second check
added a task template in Settings: `task` then listed only it,
`discussion` only the discussion templates, `discussion editor` the
discussion templates holding "editor", and searches without the four
words gave the same lists with the fix in and out.

**Alternatives**

- Add a `scopeFilterByType()` alias: it brings back the naming the
  rename removed, and two names for one scope.
- Write `$query->where('type', $typeFilter)` inline: it repeats the
  scope instead of using it.

**What goes with it**

- Every instance: no caller of a scope the rename touched is left on
  the old name in pkp-lib, OJS, OMP or OPS (the remaining
  `filterByStageId()` calls are on the review assignment collector, and
  the `byContextId()` calls on the invitation model, each with its own
  method).
- Left out, a separate fault: `scopeWithTitleLike()` still reads a
  `title` column, which no `main` install has. A new install's
  `SubmissionsMigration` does not create it, and the upgrade's
  `I12593_EmailToTaskTemplates` drops it (titles moved to the settings
  table, `pkp/pkp-lib#12593`). So `GET editTaskTemplates?title=…` would
  fail on every `main` install. No screen sends `title`, and no such
  request was made.
- No data repair.
- Guard: a pkp-lib test of `Template::withSearch()` with "task",
  "discussion" and a mixed phrase, and an e2e scenario in pkp-e2e's
  spec U37.

Small: one line in one pkp-lib class, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/find-template-discussion-task-error/walk.js)
  takes the Steps on each app (plus the `Galleys`/`Assign` search);
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/find-template-discussion-task-error/neighbour.js)
  is the second check: as `rvaca`, Settings › Workflow › "Tasks and
  Discussions" › "Production Stage" › "Add template", a template named
  "u37r1 task template" with "Enter task information" ticked, then the
  searches named in the fix. On an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/find-template-discussion-task-error/walk.js`.
- Driven on screen on OJS, OMP and OPS `main`, on PostgreSQL; the fault
  does not depend on the database. Dataset: pkp/datasets c657990
  (2026-10-01).
- Not driven: `stable-3_5_0`, which has no "Find Template" in its
  discussions panel (below); the `title` parameter.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `Template.php` is the same in
  the three. `stable-3_5_0`: OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP
  c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491), lib/ui-library
  d4e01883. `stable-3_4_0`: OJS 75cc2d488b, pkp-lib 32b0f4b4af,
  ui-library ee684b34. `stable-3_3_0`: OJS ac77c9fb35, pkp-lib
  f6ab331645, ui-library 96959f9e.
- Code reads: on `main`, `Template` (`scopeWithSearch()`,
  `scopeWithType()`, `scopeWithTitleLike()`),
  `PKPEditTaskTemplateController::getMany()`, `SubmissionsMigration`
  and `I12593_EmailToTaskTemplates` (the `title` column), and
  ui-library's `useDiscussionManagerTemplates.js` and
  `DiscussionManagerTemplates.vue`; pkp-lib 30a2572a7a for `main` before
  the rename. On `stable-3_5_0`: no `classes/editorialTask` and no
  `editTaskTemplates` API in lib/pkp, and ui-library's
  `DiscussionManager.vue` is the only file of its folder, with no
  template search. On `stable-3_4_0` and `stable-3_3_0`: no
  `editorialTask` or `editTaskTemplates` in pkp-lib and no
  `DiscussionManager` in ui-library. b3b882bec9 is not on
  `stable-3_5_0`.
- The trace: `git blame` on line 293 gives 960b1695e1 (Hafsa-Naeem,
  `pkp/pkp-lib#11885`), written against `scopeFilterByType()`.
- Upstream searches (2026-10-02), pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by "Find Template" with task or discussion, task
  template search error, editTaskTemplates search, filterByType,
  scopeWithSearch, "undefined method" SettingsBuilder. Related but not
  this fault: `pkp/pkp-lib#11885` (the search endpoint, closed),
  `pkp/ui-library#765` (the template search in the window, closed),
  `pkp/pkp-lib#11825` (the tasks and discussions screens, open; its
  checklist asks that templates can be searched).
