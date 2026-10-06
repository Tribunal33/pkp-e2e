# An edited announcement type keeps its old name in the Announcement Types table until a reload

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; the journal's tab only, no site tab)
- **Introduced** `pkp/pkp-lib#6342` for `pkp/pkp-lib#6264` · [5d3d79cae2](https://github.com/pkp/pkp-lib/commit/5d3d79cae2bce90229d8f9b0756560d69ea6309b) · 2020-11-06 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#6798` (closed without a fix for "Edit"): it reported the same 500 after "Remove", which the change for `pkp/pkp-lib#6791` mended by redrawing the whole table before the issue closed; "Edit" kept the row refresh
- **Tracked in** spec U12 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who edits an announcement type reads "Announcement type
edited." and expects the table to show the new name. The table still
shows the old name, on the journal's tab and the site's alike; the new
name appears on the next load of the page. The browser's own traffic
shows the table's row refresh failing with a server error after every
edit.

The name is saved, only the table is stale until a reload. The site's
tab (Administration › Site Settings › Announcements) is the Site
Administrator's, on a site with two or more journals, presses or
servers.

## Impact

- **Lost.** Nothing: the name is saved, only the table is stale until
  a reload, and no message says the refresh failed.
- **Who.** Every Journal Manager (Press Manager, Manager) who renames a
  type on the Announcements page's "Announcement Types" tab, and the
  Site Administrator on the site's tab, on every edit.
- **Way round.** Reload the page.

Low: a display fault with no loss, which a reload clears. It would be
medium if the stale row led a manager to a wrong action, which it does
not: a second "Edit" opens the saved name.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same,
  their words in brackets).
- The site's tab exists only on a site with two or more journals
  (presses, servers), so step 8 creates a second one.

The journal's tab:

1. Sign in as `rvaca` and open Settings › Website › "Setup" ›
   "Announcements"; tick "Enable announcements" and press "Save".
2. Open the Announcements page
   (`/index.php/publicknowledge/en/management/settings/announcements`),
   tab "Announcement Types".
3. Press "Add Announcement Type", type "u12r6 Conference" in "Name" and
   press "Save".
4. On the "u12r6 Conference" row press the "Settings" arrow, then
   "Edit"; change "Name" to "u12r6 Conference 2027" and press "Save".
5. Read the table, then reload the page and open "Announcement Types".

The site's tab:

6. Sign out and sign in as `admin`.
7. Open Administration › Hosted Journals (Hosted Presses; Hosted
   Servers) and press "Create Journal" ("Create Press"; "Create
   Server").
8. Fill in "u12r6 Second Journal" as the name, "U12R6" as the initials,
   a contact name and email, "Canada", "u12r6second" as the path, tick
   English and "Enable this journal to appear publicly on the site"
   (press; the server's own words), and press "Save".
9. Open Administration › Site Settings › "Announcements" › "Settings",
   tick "Enable announcements" and press "Save".
10. Open the side tab "Announcement Types", press "Add Announcement
    Type", type "u12r6 Site type" and press "Save".
11. On its row press the "Settings" arrow, then "Edit"; change "Name" to
    "u12r6 Site type renamed" and press "Save".
12. Read the table, then reload the page and open "Announcements" ›
    "Announcement Types".

**Expected.** After step 4 and step 11 the notice "Announcement type
edited." shows and the row reads the new name at once.

**Observed.** In step 4 the window closes and "Announcement type
edited." shows, but the row still reads "u12r6 Conference", also three
seconds later. After the reload in step 5 it reads "u12r6 Conference
2027". Steps 11 and 12 give the same on the site's tab: "u12r6 Site
type" until the reload, then "u12r6 Site type renamed". The table's row
refresh answers 500 after each edit; the server log:

```
[500]: GET /index.php/publicknowledge/$$$call$$$/grid/announcements/announcement-type-grid/fetch-row?rowId=1 - Uncaught Error: Cannot use object of type Generator as array in …/lib/pkp/classes/controllers/grid/GridHandler.php:944
[500]: GET /index.php/index/$$$call$$$/grid/announcements/announcement-type-grid/fetch-row?rowId=2 - Uncaught Error: Cannot use object of type Generator as array in …/lib/pkp/classes/controllers/grid/GridHandler.php:944
```

With PHP assertions on (`zend.assertions=1`, common in development) the
500 comes instead from the `assert(is_array($elements))` at
`GridHandler.php:943`, and the table ends stale the same way (code
read). Adding a type (step 3) shows the new row at once, since an add redraws
the whole table.

## Cause

`GridHandler::setGridDataElements()` (lib/pkp
`classes/controllers/grid/GridHandler.php`, lines 403–412) stores what a
grid's `loadData()` returns as the grid's data. It converts collections,
a `DAOResultFactory` and an `ItemIterator` to arrays keyed by id, but
keeps anything else that is iterable as it is:

```php
$data instanceof ItemIterator => $data->toArray(),
is_iterable($data) => $data,
```

The rest of the grid treats its data as an array. `getRowDataElement()`
(line 944) looks a row up with `isset($elements[$rowId])`, after an
`assert(is_array($elements))`; `hasGridDataElements()` counts it, and
`PagingFeature` walks it with `reset()`, `key()` and `end()`.

`AnnouncementTypeGridHandler::loadData()` returns
`AnnouncementTypeDAO::getByContextId()`, a `Generator` that yields each
type under its id. Rendering the whole table walks it once, which
works. After "Edit" › "Save", `updateAnnouncementType()` answers
`DAO::getDataChangedEvent($announcementTypeId)`, so the page asks
`fetch-row?rowId=<id>` for that row alone. `fetchRow()` reaches
`getRowDataElement()`, and `isset()` on the `Generator` throws "Cannot
use object of type Generator as array". The page keeps the old row. Past
that point `fetchRow()` would fail a second time: `getRowsSequence()`
runs `array_keys()` on the same data, which a generator is not either.

5d3d79cae2 ("Introduce Generators to normal use cases instead of
DAOResultFactory", part of the ADODB removal) made both changes: it
turned `getByAssoc()` (now `getByContextId()`) from a `DAOResultFactory`
into a generator, and it replaced the grid's `is_array($data)` with
`is_iterable($data)`, removing the comment that explained the arrays:
`We go to arrays for all types of iterators because iterators cannot be
re-used, see #6498.` Before it, the grid received a `DAOResultFactory`
and converted it to an array keyed by id (`toAssociativeArray()`), and
"Edit" already asked for the one row (code read, not walked).

Reach:

- "Remove" hit the same error until 252fe51eca (`pkp/pkp-lib#6791`,
  2021), which made it redraw the whole table instead of one row; "Edit"
  kept the row refresh.
- A scan of every `loadData()` in lib/pkp and the three apps found no
  other grid that returns a generator or another bare iterator; the
  others return arrays, collections, a `DAOResultFactory` or a
  `VirtualArrayIterator` (code read). A plugin's grid that returns one
  would fail the same way.
- `CategoryGridHandler::setGridCategoryDataElements()` keeps the
  comment and the old rule: it converts an array, a `DAOResultFactory`,
  an `ItemIterator` and a `LazyCollection` and asserts false on
  anything else, a generator included.
- Not this fault, other causes of stale grid rows:
  [U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md)
  and
  [U53-A13-A17-users-grid-roles-admin-empty-ended-listed.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A13-A17-users-grid-roles-admin-empty-ended-listed.md).
- OMP's "Representatives" grid also answers 500 on its row refresh, but
  there `CategoryGridHandler::getRowDataElement()` finds a category
  under the new row's id, a different mechanism.

## Proposed fix

Convert any other iterator to an array, keys kept, in
`GridHandler::setGridDataElements()`, where the grid's data is stored,
so every grid holds an array as the rest of the class expects,
`getRowDataElement()` and `getRowsSequence()` included. This restores
the rule the grid kept before 5d3d79cae2, which
`CategoryGridHandler::setGridCategoryDataElements()` still keeps (only
arrays are stored; a `LazyCollection` goes through
`iterator_to_array()`), and the way `UserGridHandler` keeps its rows
(`iterator_to_array($iterator, true)`).
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edited-announcement-type-keeps-old-name/fix.diff):

```diff
+use Traversable;
 ...
             $data instanceof ItemIterator => $data->toArray(),
-            is_iterable($data) => $data,
+            is_array($data) => $data,
+            // A generator (or any other iterator) can be walked once only, and the grid
+            // reads its data by row id (fetchRow) and more than once per request
+            $data instanceof Traversable => iterator_to_array($data, true),
             default => [],
```

The fix was tried on OJS, OMP and OPS `main`, and the Steps then gave
the Expected on both tabs: the row refresh answered 200 and the row read
the new name at once. A neighbour check renamed the first component on
Settings › Workflow › "Submission" › "Components" (a grid whose data is
a `DAOResultFactory`) and named it back, and removed an announcement
type: each row showed its change at once, alike with the fix in and
out.

**Alternatives**

- Return `iterator_to_array(…, true)` from
  `AnnouncementTypeGridHandler::loadData()`. It mends this table only
  and leaves the next grid that returns a generator to fail the same
  way.
- Answer `DAO::getDataChangedEvent()` without an id from
  `updateAnnouncementType()`, as `pkp/pkp-lib#6791` did for "Remove".
  The whole table is redrawn and the error is hidden, not fixed.

**What goes with it**

- The DAO keeps its generator, which is what 5d3d79cae2 was for; only
  the grid copies it, and a grid renders every row anyway.
- No data repair, no API or hook change: the `setGridDataElements` hook
  still sees what `loadData()` returned.
- Backport: 3.5 takes the diff as it stands. 3.4 and 3.3 write the
  rule as an `if`/`elseif` chain ending in `else { assert(false); }`:
  there `is_iterable()` becomes `is_array()`, and an
  `iterator_to_array($data, true)` branch goes after the `ItemIterator`
  one, before the `else`. In 3.4 the `is_iterable()` branch is second,
  after `Enumerable`, and the file has no `use Traversable`, so the
  branch tests `$data instanceof \Traversable`. In 3.3 the
  `is_iterable()` branch comes first in the chain and the file has no
  namespace, so `Traversable` needs no prefix.
- A guard: the e2e scenario that an edited type shows its new name at
  once on the journal's tab and the site's (spec U12 scenario 3).

Small: one branch in the shared grid handler, and an e2e check.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edited-announcement-type-keeps-old-name/walk.js),
  with its helpers in `lib.js` beside it; `neighbour` as its argument
  runs the neighbour check (a component renamed and named back, an
  announcement type added and removed). In a pkp-e2e checkout, on an install freshly
  loaded from the default dataset (`<feature>` is that install's fleet
  name in the pkp-e2e harness, `<id>` any short name for the output
  folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/edited-announcement-type-keeps-old-name/walk.js`
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Dataset: pkp/datasets
  566bb1f (2026-10-03). Tips: `main` ojs ff004d0973, omp 3b0ecf794c, ops
  c8af945bb7, lib/pkp 987776cd04 (ojs) and 3dc90c81a6 (omp, ops; the
  files read are the same); `stable-3_5_0` ojs c1cee76b95, omp
  9c5e24246c, ops 38b61882d3, lib/pkp 771474347e (ojs) and cf3f984335
  (omp, ops); `stable-3_4_0` lib/pkp 767353f4fe; `stable-3_3_0` lib/pkp
  ac3fa73402.
- 3.5: the walk gave the same 500 at the same line, on both tabs.
- 3.4 code: `AnnouncementTypeGridHandler::loadData()` returns the
  generator of `AnnouncementTypeDAO::getByContextId()`,
  `GridHandler::setGridDataElements()` keeps it under `is_iterable()`,
  and `getRowDataElement()` indexes it; `updateAnnouncementType()`
  answers a data-changed event with the type's id. The site's tab
  exists there too (`templates/admin/settings.tpl`).
- 3.3 code (`.inc.php` files): the same, with `getByAssoc()` as the
  generator; the site's announcements came later (`pkp/pkp-lib#9253`),
  so only the journal's (press's, server's) tab has the table.
- Introduced: `git log -S 'is_iterable($data)'` on `GridHandler` gives
  5d3d79cae2, which also turned the type DAO's `DAOResultFactory` into a
  generator; 20b2f238e8 (`pkp/pkp-lib#6748`, 2021) later keyed the
  generator by type id.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, by the symptom's words
  (announcement type, edit, name, grid) and by "Cannot use object of
  type Generator as array", `getRowDataElement`,
  `AnnouncementTypeGridHandler` and `setGridDataElements`. Found
  `pkp/pkp-lib#6798` (above). `pkp/pkp-lib#12826` ("Remove grid code",
  open) lists this grid's files among those to retire and does not
  mention this fault, though retiring the grids would remove it.
