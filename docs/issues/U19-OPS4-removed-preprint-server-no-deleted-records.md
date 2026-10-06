# Removing a preprint server leaves no deleted records for its posted preprints at the site-wide OAI address

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; a preprint server writes no deleted records there)
- **Introduced** `pkp/ops#170` for `pkp/pkp-lib#6685` · [7f9865b625](https://github.com/pkp/ops/commit/7f9865b62587eb716794898f1aa8fde2924cfa91) · 2021-08-15 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#ops4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Site Administrator removes a preprint server under Administration ›
Hosted Servers. The installation's Identify answer declares its
"Deleted Record Policy" as "persistent", so a harvester of the
site-wide OAI address expects each posted preprint of that server to
come back as a deleted record, as a removed journal's or press's
records do. Instead GetRecord answers "No matching identifier in this
repository", and ListRecords and ListIdentifiers no longer name the
preprints.

The removed server's own OAI address is gone with it, so the site-wide
address is the only place its deleted records could be read. It was
checked on an installation that keeps another preprint server;
removing an installation's only server was not checked.

## Impact

- **Lost:** the notice that the removed server's posted preprints are
  gone. Services that harvested them from the site-wide address keep
  them, with links that no longer open, and nothing tells anyone.
- **Who:** harvesters of the site-wide address, after a Site
  Administrator removes a preprint server that holds posted preprints.
- **Way round:** before the removal, yes: untick "Enable this preprint
  server to appear publicly on the site" on the server (Hosted Servers
  › "Edit") and save, then remove it. The deleted records are written
  at the save and stay after the removal. After a removal without that
  step, none.

Medium: a public record is wrong, silently, with no way round once it
has happened. What keeps it from high is the reach: removing a server
is a rare administrative action and it touches only that server's
posted preprints.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server "Public
  Knowledge Preprint Server" (`publicknowledge`), which stays in place,
  and its posted preprint 19, "Finocchiaro: Arguments About Arguments".
- A second server, made in steps 2 to 4 because the steps remove one:
  "Second Server u19ops4" (path `u19ops4`) holding one posted preprint,
  a copy of preprint 19.

Steps:

1. Sign in as `admin`.
2. Administration › "Hosted Servers" › "Create Server": name "Second
   Server u19ops4", initials "U19OPS4", a contact name, the email
   `u19ops4@mailinator.com`, country "Canada", path `u19ops4`; under
   "Languages" tick "English" and under "Primary locale" choose
   "English" (both groups are required); tick "Enable this preprint
   server to appear publicly on the site"; then "Save".
3. In `publicknowledge`, Tools › "Native XML Plugin" › "Export
   Preprints": tick "Finocchiaro: Arguments About Arguments", press
   "Export Preprints", then "Download Exported File".
4. In `u19ops4`, Tools › "Native XML Plugin" › "Import": upload the
   file and press "Import". The result names the copy: `Submission "20"
   - "Finocchiaro: Arguments About Arguments"`.
5. Open `/index.php/index/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ops.localhost:preprint/20`.
   It shows the record, with the set `u19ops4:PRE`. `ops.localhost` is
   the dataset's repository identifier (`repository_id` in
   `config.inc.php`).
6. Administration › "Hosted Servers": the arrow beside "Second Server
   u19ops4" › "Remove". Answer "Are you sure you want to permanently
   delete Second Server u19ops4 and all of its contents?" with "OK".
7. Open the address of step 5 again.
8. Open `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`,
   then `/index.php/index/oai?verb=Identify`.

**Expected.** Step 7 shows the record's header (`oai:ops.localhost:preprint/20`,
set `u19ops4:PRE`) with "This record has been deleted." Step 8 lists
the identifier as a deleted record after the 17 records of
`publicknowledge`, in keeping with Identify's "Deleted Record Policy":
"persistent".

**Observed.** Step 7:

```
OAI Error(s)
The request could not be completed due to the following error or errors.
Error Code	idDoesNotExist
No matching identifier in this repository
```

Step 8 lists the 17 records of `publicknowledge` and nothing for
preprint 20, while Identify still reads "Deleted Record Policy
persistent".

Control: the same steps on a journal (article 17 of the OJS dataset,
copied as article 21) and on a press (book 5 of the OMP dataset, whose
copy's identifier is `oai:omp.localhost:publicationFormat/4`) show
"This record has been deleted." in step 7 and the deleted record in
step 8.

## Cause

`PKPContextService::delete()` (`lib/pkp/classes/services/PKPContextService.php`,
line 696) calls the hook `Context::delete::before` so that each
application can write the deleted records while the context and its
submissions still exist. OPS has the method for it,
`APP\services\ContextService::beforeDeleteContext()`, which calls
`PreprintTombstoneManager::insertTombstonesByContext()`. But the
constructor of OPS's `ContextService` (`classes/services/ContextService.php`,
lines 45 to 48) registers `Context::add`, `Context::edit`,
`Context::delete` and `Context::validate` only. Nothing registers
`beforeDeleteContext()`, so it never runs.

The removal then goes on to `afterDeleteContext()`, which deletes the
server's submissions, and no row is left in `data_object_tombstones`
for them. The OAI interface reads deleted records from that table only.

The method came with `pkp/ops#170` (for `pkp/pkp-lib#6685`, "OPS should
support tombstones for deleted content"), which copied it from OJS
without the `Hook::add()` line that OJS and OMP have beside it
(`Hook::add('Context::delete::before', …)` in each one's
`ContextService` constructor).

It never worked on a preprint server: before that change OPS wrote no
deleted record for any action, and no earlier version of its
`ContextService` registers `Context::delete::before`. Hence a defect
and not a regression.

Reach:

- `PKPContextService::delete()` has two callers: "Remove" under Hosted
  Servers (`ContextGridHandler::deleteContext()`, walked) and the REST
  API's `DELETE /contexts/{id}` (`PKPContextController::delete()`,
  code), which no screen sends. Both miss the deleted records.
- The other half of `beforeDeleteContext()`,
  `GenreDAO::deleteByContextId()`, is not missed:
  `PKPContextService::delete()` deletes the genres itself (code, and
  the `genres` table read after the walk).
- A server made no longer public (the "Enable this preprint server to
  appear publicly on the site" box unticked) goes through
  `afterEditContext()`, which is registered, and its deleted records
  stay when the server is removed afterwards (walked).
- Unposting a preprint goes through `Repository::updateStatus()`, not
  this hook (code).

## Proposed fix

Register the method, as OJS and OMP do, in the constructor of
`classes/services/ContextService.php` in OPS
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/fix.diff)):

```diff
         Hook::add('Context::add', [$this, 'afterAddContext']);
         Hook::add('Context::edit', [$this, 'afterEditContext']);
+        Hook::add('Context::delete::before', [$this, 'beforeDeleteContext']);
         Hook::add('Context::delete', [$this, 'afterDeleteContext']);
         Hook::add('Context::validate', [$this, 'validateContext']);
```

Tried on OPS `main`: step 7 shows the deleted record of
`oai:ops.localhost:preprint/20` (set `u19ops4:PRE`) and step 8 lists it
after the 17 live records. Three nearby behaviours were checked with
and without the fix and are the same: a preprint of the removed server
that was never posted still answers "No matching identifier in this
repository"; the list of `publicknowledge` is the same before and after
the removal; and "Remove" still answers 200 and the server's row leaves
the table.

**Alternatives**

- Moving the registration of the four hooks into `PKPContextService`
  so that no application can leave one out: a wider change to three
  applications for a one-line omission.

**What goes with it**

- No data repair: the preprints of a server already removed are gone
  and their identifiers cannot be rebuilt.
- Every instance: the five hook methods of OPS's `ContextService` were
  compared with its `Hook::add()` lines, and this is the only one not
  registered.
- The genre deletion runs twice with the fix in: `beforeDeleteContext()`
  calls `GenreDAO::deleteByContextId()`, and `PKPContextService::delete()`
  calls it again a few lines on. The second call finds no genre and
  deletes nothing, as on OJS and OMP, whose methods hold the same call.
  It can stay; dropping it from the three methods is a clean-up of its
  own.
- Backport: the same line applies to 3.5 and 3.4 as written. 3.3 needs
  none: a preprint server writes no deleted records there at all.
- Guard: the e2e scenario for a removed context in spec U19 (a Planned
  item), run on OPS as on OJS and OMP.

Small: one line, and a test.

## Evidence

- Kept script that takes the Steps on OPS, and on OJS and OMP as the
  control, each on an install freshly loaded from PKP's default test
  dataset (pkp/datasets 2c84c3c, 2026-10-01, the `main` and
  `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/walk.js),
  run with `PROBE_FEATURE=issues-ops4 PROBE_AGENT=ops4 node bin/probe.js all shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Where the walk differs from the Steps: step 2 gives the server's name
  as the contact name; step 5 takes the identifier from the site-wide
  ListIdentifiers answer (the entry with the set `u19ops4:PRE`) rather
  than from the import result; and between steps 4 and 5 it copies an
  unposted preprint (preprint 1 of the dataset, copied as 21) into
  `u19ops4` the same way, for the fix's neighbour check. It also reads
  the `data_object_tombstones` and `genres` tables after step 8: no
  tombstone row on OPS, one on OJS and on OMP; no `genres` row of the
  removed context on any of the three.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/removed-preprint-server-no-deleted-records/fix.diff ops`,
  then `walk.js` on OPS as above on a freshly loaded dataset, then
  `node bin/try-fix.js revert` with the same arguments. With the fix,
  `data_object_tombstones` holds one row after the removal
  (`oai:ops.localhost:preprint/20`, `u19ops4:PRE`) and none for the
  unposted copy.
- The way round, walked on OPS `main` with `disable` after the script's
  path in the same command: between steps 5 and 6, Hosted Servers ›
  "Edit" on "Second Server u19ops4", the "Enable this preprint server
  to appear publicly on the site" box unticked, "Save" (200). GetRecord
  of `oai:ops.localhost:preprint/20` showed the deleted record at once,
  and again after the removal; step 8 listed it after the 17 live
  records, and the unposted copy still answered "No matching identifier
  in this repository".
- main walked at OPS c8af945bb7 (lib/pkp 3dc90c81a6), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6), OJS 06fd981b01 (lib/pkp 2e377d27fc); 3.5 at
  OPS 3f0919468c, OMP b24879c3db, OJS 18d097d94e (lib/pkp 1fb843f491).
  On 3.5 the three apps answered as on main. On OJS 3.5 an article in
  no issue is not listed, so step 5 named no identifier there and the
  walk took it from the deleted record step 8 listed. Code on 3.5:
  the same four `Hook::add()` lines and the same unregistered
  `beforeDeleteContext()` in OPS's `classes/services/ContextService.php`.
- 3.4, code (OPS acd8ae704b, lib/pkp df13621c2d): the same four
  `Hook::add()` lines (45 to 48) and the same `beforeDeleteContext()`
  (line 145); `PKPContextService::delete()` calls
  `Context::delete::before` (line 640).
- 3.3, code (OPS c5532e2161, lib/pkp d446601ebe): `pkp/ops#170` is not
  on the branch. `ContextService.inc.php` registers the same four hooks
  and has no `beforeDeleteContext()`; `classes/article/ArticleTombstoneManager.inc.php`
  exists and nothing calls it, so no action on a 3.3 preprint server
  writes a deleted record (the gap `pkp/pkp-lib#6685` closed in 3.4).
- Introduced: `git log -S"beforeDeleteContext" -- classes/services/` in
  OPS names 7f9865b625 alone; its diff adds the method and no
  `Hook::add()` line; github.com names its PR as `pkp/ops#170`.
- Upstream search (pkp/pkp-lib, pkp/ops; issues and PRs, open and
  closed): "tombstone OPS", "tombstone delete context", "deleted record
  preprint server OAI", `beforeDeleteContext`, `PreprintTombstoneManager`,
  `Context::delete::before`. `pkp/pkp-lib#6685` (closed) is the feature
  itself; `pkp/pkp-lib#8736` (closed) is a server error in OJS's
  `beforeDeleteContext()` and `afterDeleteContext()`, another fault.
- The walks ran on PostgreSQL; nothing in the cause depends on the
  database.
- Not driven: 3.4 and 3.3 (code only). The server's own address after
  the removal answers 404 on the three apps, so only the site-wide
  address can serve the deleted records.
- Left out: at the site-wide address, `set=u19ops4` answers "No
  matching records in this repository" after the removal on OJS, and
  on OPS with the fix, since the set of a removed context is no longer
  resolved; the deleted record is reached by GetRecord and by the
  unfiltered lists.
- Not checked: removing an installation's only preprint server (what
  the site-wide address answers with no server left).
