# A book representative switched between "Agent" and "Supplier" is listed under both groups until the page is reloaded

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** [7218a8698](https://github.com/pkp/omp/commit/7218a8698eccc03520b8b74f63f0cf699966a6f6) · 2012-08-01 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor opens a supplier on a book's "Marketing" › "Representatives"
page, switches it to "Agent", picks an agent role and presses "OK".
"Representative edited." appears and the representative is listed
under "Agents" with its new role, but it is also still listed under
"Suppliers" with its old role.

The change is saved correctly, and a reload removes the extra row.
Until then the extra row acts on the same representative: its "Edit"
opens the representative as it now is, and its "Delete" deletes it,
while the row itself stays on the page.

The table redrew the whole list after each save until a 2012 change
made it redraw one row in one group, which missed this case.

## Impact

- **Lost**: nothing; the representative is stored once, with its new
  type and role.
- **Who**: press managers and press editors on any book, and series
  editors and assistants on the books they are assigned to, when they
  change a representative's type.
- **Way round**: reload the page.

Low: the table misleads until a reload, and using the extra row
changes nothing it should not (tried: "Edit" and "Delete" act on the
representative as stored).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), OMP.
  Submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is in Production and has no representatives.

Setting up: steps 3 and 4 add an agent first, only so that the
supplier added later is listed without a reload. On an install where
no representative exists yet, the first one added is not listed until
a reload, which is a separate fault.

1. Sign in as `dbarnes`.
2. Open submission 4 and choose "Marketing" › "Representatives" in the
   side menu.
3. Press "Add Representative", click "Agent", choose "Sales agent (08)"
   under "Role", type `Beta Agency` in "Name" and press "OK".
4. Reload the page.

A supplier switched to an agent:

5. Press "Add Representative". Under "Role", in the right-hand list of
   supplier roles, choose "Distributor to end-customers (12)". Type
   `Alpha Books` in "Name", click "Agent", then "Supplier", and press
   "OK". (The two clicks are needed for a supplier to save: a separate
   fault, linked in Evidence.)
6. Press the arrow before "Alpha Books" under "Suppliers", then "Edit".
7. Click "Agent", choose "Non-exclusive sales agent (06)" under "Role"
   and press "OK".
8. Reload the page.

**Expected**: after step 7, "Alpha Books" is listed under "Agents"
reading "Non-exclusive sales agent (06)", and "Suppliers" reads "No
Items".

**Observed**: step 7 shows "Representative edited.". "Agents" lists
"Beta Agency" ("Sales agent (08)") and "Alpha Books" ("Non-exclusive
sales agent (06)"). "Suppliers" still lists "Alpha Books" reading
"Distributor to end-customers (12)". After step 8, "Alpha Books" is
listed only under "Agents", and "Suppliers" reads "No Items".

Using the extra row instead of step 8:

- Its "Edit" opens the window on "Agent" with "Non-exclusive sales
  agent (06)". A new name and "OK" update the row under "Agents"; the
  row under "Suppliers" keeps the old name and role.
- Its "Delete" › "OK" shows "Representative removed." and deletes
  "Alpha Books": the row under "Agents" goes, the row under "Suppliers"
  stays until a reload.

Control: an agent edited without a change of type (a new role and
name) is redrawn in place, once.

## Cause

`RepresentativesGridHandler::updateRepresentative()` (OMP,
`controllers/grid/catalogEntry/RepresentativesGridHandler.php`) answers
a save with `DAO::getDataChangedEvent($representativeId, (int)
$representative->getIsSupplier())`, asking the page to redraw one row
inside one category. `RepresentativeForm::execute()` has changed that
same object, so the value sent is the new type's. The category id is
really the key of the category in `loadData()`'s array; it matches
`(int) getIsSupplier()` only because `loadData()` lists agents (0)
before suppliers (1).

The page's `CategoryGridHandler.js` keys a row by its category
(`…-category-<category>-row-<id>`). So the row fetched for "Agents"
has an id that is not on the page yet, and it is added there. Nothing
asks the page to remove the row under "Suppliers". A delete from that
row later sends the representative's current category (agents), so
the stale row is not removed then either.

`7218a8698` ("Fixed category grids to return the correct data changed
event and refresh categories", 2012) changed this answer from
`DAO::getDataChangedEvent()`, a redraw of the whole table, to the
single-row refresh, in both `updateRepresentative()` and
`deleteRepresentative()`. That redraws one row instead of the table,
but misses the one case where the row changes category.

Reach:

- A supplier switched to an agent (checked on screen); an agent
  switched to a supplier takes the same path (code).
- An edit that keeps the type, an add and a delete each touch one
  category and are redrawn right (checked on screen).

## Proposed fix

When an existing representative's type changes, answer with a redraw
of the whole table, as before `7218a8698`; keep the single-row refresh
otherwise:
[fix-type-change.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/representative-window-refuses-supplier/fix-type-change.diff).

```diff
         $representative = $representativeDao->getById($representativeId, $monograph->getId());
+        // The form's execute() changes this object, so keep the type it had
+        $wasSupplier = $representative ? (bool) $representative->getIsSupplier() : null;
 …
+            // A representative whose type changed moves to the other category; a refresh
+            // of its row in the new category would leave it in the old one too
+            if ($wasSupplier !== null && $wasSupplier !== (bool) $representative->getIsSupplier()) {
+                return DAO::getDataChangedEvent();
+            }
+
             // Prepare the grid row data
             $row = $this->getRowInstance();
```

A `dataChanged` event with no id is how most legacy tables ask for a
full redraw, and the table has two short groups. The return comes
after the "Representative edited." notice is created and before the
grid row the method builds, which neither return uses; that unused row
code could be removed in the same change.

Tried on `main`: after step 7 "Alpha Books" is listed only under
"Agents". An agent added, edited without a type change and deleted is
still redrawn as one row, with the fix and without it.

**Alternatives**:

- Send two events, one per category: each starts its own row fetch,
  and `CategoryGridHandler.js` keeps one `currentCategoryId_` for both
  answers, so whichever answer comes second is looked up in the wrong
  group.
- Refresh both categories in `CategoryGridHandler.js` whenever a row's
  category differs from the page's: a change to the shared table code
  for one handler's case.

**What goes with it**:

- Backport: the handler is the same on 3.5, and the diff applies there
  and on 3.4 as written (`patch --dry-run`); 3.3 has the same return in
  `RepresentativesGridHandler.inc.php`.
- A test: switch a supplier to an agent and check both groups before a
  reload.

Small: a few lines in one OMP handler, following the grids' own
full-redraw event.

## Evidence

- The kept script, which takes steps 1 to 8 on an install freshly
  loaded from the default dataset (after the steps of the A12 report,
  linked below) and records each save's answer and both groups:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js).
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Its step 7
  answers `{"name":"dataChanged","data":{"0":"2","parentElementId":"0"}}`.
  Another run of the same script uses the extra row ("Edit", then
  "Delete"); it was walked on `main` only.
- Chromium on PostgreSQL. Datasets: pkp/datasets e8dafbc (2026-10-02).
- Branch tips. `main`: OMP 3b0ecf794, pkp-lib 3dc90c81a6. 3.5: OMP
  9c5e24246, pkp-lib cf3f984335. 3.4: OMP 0aec65441, pkp-lib
  767353f4fe. 3.3: OMP 8e72fc883, pkp-lib ac3fa73402.
- Code reads for 3.4 and 3.3: `updateRepresentative()` returns the same
  single-row event after `RepresentativeForm::execute()` has changed
  the same object, and `CategoryGridHandler.js` keys rows by category
  in the same way.
- Introduced: `git log -S` on the return line gives 7218a8698. The
  commit has no pull request; its message names the old tracker's bug
  7394.
- The supplier's way round in step 5:
  [U74-A12-representative-window-refuses-supplier.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U74-A12-representative-window-refuses-supplier.md).
- MySQL not checked (nothing here depends on the database).
