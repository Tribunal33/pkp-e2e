# Searching "Find Template" for the word "discussion" or "task" opens an "Error" window when adding or editing a discussion

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Find Template" in the discussion window)
  - 3.4: none (code; no "Find Template" in the discussion window)
  - 3.3: none (code; no "Find Template" in the discussion window)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [b3b882b](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4) · 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** U37 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the "Add" or "Edit" window of a task or discussion, a "Find Template"
search fails on the server when it includes one of the words
"discussion", "discussions", "task" or "tasks" as a separate word,
alone or with other words. A window "Error" opens with a programming
error and "OK", and the template list reads "No items found.". Even a
template's full name, "Discussion (Production)", fails this way.

These words are meant to narrow the list to one kind of template.
Every template the application installs is a discussion, and a manager
can add task templates in Settings, so "task" is the one search that
would list only those.

Only `main` has tasks, discussion templates and this search; no
released version does, so the fault would ship with the next release
unless fixed.

## Impact

- **Lost**: nothing is stored wrong. The person loses the search and
  sees a programming error instead of a message.
- **Who**: everyone who may open "Add" or "Edit" in a stage's "Tasks &
  Discussions" panel: managers, editors, assistants and authors, each
  seeing the templates not restricted away from their role.
- **Way round**: search by another word of the template's name (the
  stage's name, "Production", works), or clear the box and press the
  template in the list, which holds 2 to 6 installed templates per
  stage.

Low: nothing is lost and the template still gets chosen, from a short
list or with another word, though the obvious words fail with an error
window. It would be medium on a context with many templates of its own,
where searching is how one is found and "task" is the only way to list
the task templates.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. Nothing else is needed. The
  dataset holds only the installed templates, all of them discussions;
  it adds no task template.

The submission at Production used below: OJS submission 5, "Genetic
transformation of forest trees"; OMP submission 4, "How Canadians
Communicate: Contexts of Canadian Popular Culture"; OPS submission 1,
"The influence of lactation on the quantity and quality of cashmere
production".

1. Sign in as `dbarnes`.
2. Open the submission above from "Submissions" and choose "Production"
   in its menu.
3. In "Production Tasks & Discussions", press "Add".
4. In "Find Template", under "Templates to get you started!", type
   `discussion` and press Enter.
5. Press "OK". Clear the box, type `Discussion (Production)` and press
   Enter.
6. Press "OK". Clear the box, type `task` and press Enter.

**Expected**: step 4 lists every template of the stage, since all are
discussions:

- OJS: "Galleys Complete", "Ready for Production", "Assign Editor",
  "Discussion (Production)"
- OMP: "Index Completed", "Index Requested", "Galleys Complete", "Ready
  for Production", "Assign Editor", "Discussion (Production)"
- OPS: "Assign Editor", "Discussion (Production)"

Step 5 lists "Discussion (Production)". Step 6 reads "No items found.",
since the dataset holds no task template. No error.

**Observed**: steps 4, 5 and 6 each open this window, and the list
under it reads "No items found.":

```
Error
Call to undefined method PKP\core\SettingsBuilder::filterByType()
OK
```

The search request answers 500:

```
GET /index.php/publicknowledge/api/v1/editTaskTemplates?stageId=5&search=discussion&offset=0&count=9999&perPage=9999
500 {"error":"Call to undefined method PKP\\core\\SettingsBuilder::filterByType()"}
```

The server log:

```
production.ERROR: Call to undefined method PKP\core\SettingsBuilder::filterByType() {"exception":"[object] (BadMethodCallException(code: 0): …
#2 …/lib/pkp/classes/editorialTask/Template.php(293): Illuminate\Database\Eloquent\Builder->__call('filterByType', Array)
```

Control: `Production` and Enter narrows the list to the templates whose
name or text includes the word, and the box's clear control brings the
whole list back.

## Cause

`GET /api/v1/editTaskTemplates?search=…`
(`PKPEditTaskTemplateController::getMany()`) applies the search with
`Template::scopeWithSearch()` in `lib/pkp/classes/editorialTask/Template.php`.
That scope splits the search on spaces, maps the words `task(s)` and
`discussion(s)` (whole words, any case) to a template type, and applies
it with:

```php
if ($typeFilter !== null) {
    $query->filterByType($typeFilter);
}
```

`Template` has no `filterByType` scope. Its type scope is
`scopeWithType()`. The Eloquent builder finds no method or scope of that
name and throws `BadMethodCallException`, which the API answers as a
500 carrying the exception's message; the window shows that message. A
search without these words never reaches the call.

The search worked on `main` before b3b882b. `pkp/pkp-lib#11885`
(960b169) wrote the call while the scope was `scopeFilterByType()`, and
the window's search has sent `search` since ui-library 185571a9
(2026-01-21). b3b882b, the migration of the discussion-related email
templates to task templates (`pkp/pkp-lib#12593`, merged by PR
`pkp/pkp-lib#12842`), renamed the model's scopes from `filterBy…` /
`by…` to `with…` (`withContextId`, `withStageId`, `withInclude`,
`withType`, `withTitleLike`, `withSearch`) and updated the controller's
calls, but not this call inside `scopeWithSearch()` itself.

Reach:

- The "Add" and "Edit" windows build the same form
  (`useDiscussionManagerForm.js`), whose template list
  (`DiscussionManagerTemplates.vue`, `useDiscussionManagerTemplates.js`)
  sends the search, so both fail. Checked in the code; "Add" walked.
- Settings › Workflow › "Tasks and Discussions" lists templates through
  the same API without `search`, so it is not affected. Checked in the
  code.
- No other caller in `lib/pkp`, OJS, OMP or OPS uses the old scope
  names on `Template`; the remaining `filterByStageId()` and
  `byContextId()` calls are on the review assignment collector and the
  invitation model, which define them. Checked in the code.

## Proposed fix

A proposal; the team decides. Call the scope by its current name in `Template::scopeWithSearch()`:

```diff
         if ($typeFilter !== null) {
-            $query->filterByType($typeFilter);
+            $query->withType($typeFilter);
         }
```

The change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/find-template-discussion-task-error/fix.diff),
against the app root. It keeps what both changes meant: the type words
still narrow the list to one kind of template (`pkp/pkp-lib#11885`),
so a task template whose name includes "discussion" is not found by
that word, and the scope keeps its `with…` name (`pkp/pkp-lib#12593`).

The fix was tried on `main` in all three apps, and the Steps end as
Expected. A search by "Production" and the clear control give the same
lists as without the fix.

**Alternatives:**

- Add back a `scopeFilterByType()` alias: two names for one scope, which
  the rename set out to remove.
- Drop the keyword mapping: loses the type filter the search was built
  with.

**What goes with it:**

- The guard: a unit test asserting that building
  `Template::query()->withSearch('discussion')` does not throw and binds
  `type = 1` (`->toSql()` and `->getBindings()`). The exception is
  thrown while the query is built, so no rows need seeding. No test
  exists under `tests/classes` for `editorialTask` yet.
- No data repair, API or hook change.

Small: a one-line rename in one shared model, following the scope name
the model already uses, plus a unit test that needs no data.

## Evidence

- Walk script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/find-template-discussion-task-error/walk.js)
  takes Steps 1 to 6, the control and the clear control on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  2026-09-30; PostgreSQL), in OJS, OMP and OPS:
  `node bin/probe.js all shared/playwright/checks/issues/find-template-discussion-task-error/walk.js`.
  The fix was applied with `node bin/try-fix.js apply …/fix.diff ojs omp ops`
  and the same script walked again.
- Branch heads walked (`main`): OJS bade233f73 (2026-09-30), `lib/pkp`
  2e377d27fc; OMP 3b0ecf794 (2026-09-29) and OPS c8af945bb7
  (2026-09-29), `lib/pkp` 3dc90c81a6; `lib/ui-library` 280f98c5 in all
  three. `Template.php` is the same in all three `lib/pkp` checkouts.
- The dataset's templates, read in its database: type 1 (discussion)
  only, at Production 4 on OJS, 6 on OMP and 2 on OPS; 2 per stage at
  the other stages that have any. `Repository::installTaskTemplates()`
  installs every template as a discussion. A manager adds a task
  template in Settings › Workflow › "Tasks and Discussions" by ticking
  "Enter task information" (`useTaskTemplateManagerForm.js`).
- Roles: the API admits the Author role (`PKPEditTaskTemplateController`),
  and the spec's live probe of 2026-09-23
  ([U37 td3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a4))
  saw the same "Error" window for a journal manager, a section editor,
  a copyeditor and an author. This walk took the Steps as `dbarnes` only.
- "Edit" not walked: the window builds the same form as "Add" (code
  above), and the spec's Rule 10c records the template list in it.
- 3.5, read in the code (`stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00,
  OPS cf4fce69bd, `lib/pkp` a9c76aed62, `lib/ui-library` 1a7a4750):
  `lib/pkp` has no `classes/editorialTask` and no `editTaskTemplates`
  API. The "Add discussion" form (`QueryForm`, `queryForm.tpl`) offers a
  message drop-down, with no search. Not walked, since the Steps cannot
  be taken there.
- 3.4 and 3.3, read in the code (`lib/pkp` `origin/stable-3_4_0`
  df13621c2d, `origin/stable-3_3_0` d446601ebe): no `classes/editorialTask`;
  the discussion form is `QueryForm` with the same drop-down on 3.4.
- Trace: `git blame` on line 293 gives 960b169 (2025-11-06). `git log -L`
  on `scopeWithType()` gives b3b882b (authored 2026-06-01, committed
  2026-08-21), whose message names only `pkp/pkp-lib#12593`; github.com's
  branch_commits page for b3b882b names `pkp/pkp-lib#12842`, "Migration
  for discussion-related templates" (merged into `main` 2026-08-21), as
  the PR that brought it in. ui-library `git log -S searchPhrase` gives
  185571a9 for the window's search.
- Upstream searched in pkp/pkp-lib (filterByType, "Find Template", task
  template search, editTaskTemplates, scopeWithSearch), pkp/ui-library
  ("Find Template", "task template") and pkp/ojs ("Find Template", "task
  template" search).
- MySQL not checked; the fault is in PHP before any query runs.
