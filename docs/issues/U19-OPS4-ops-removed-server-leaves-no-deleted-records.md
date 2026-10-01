# A preprint server removed under Hosted Servers leaves no deleted records for OAI-PMH harvesters

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; OPS 3.3 writes no deleted records at all)
- **Introduced** `pkp/ops#170` for `pkp/pkp-lib#6685` · [7f9865b625](https://github.com/pkp/ops/commit/7f9865b62587eb716794898f1aa8fde2924cfa91) · 2021-08-15 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#ops4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A Site Administrator removes a preprint server under Administration ›
"Hosted Servers". Every OPS site tells OAI-PMH harvesters that it keeps
a deleted record for each item it withdraws. This is not a setting: the
site-wide Identify always answers "persistent". A removed journal or
press does leave deleted records. A removed server leaves none: at the
site-wide OAI-PMH address its preprints are simply gone. GetRecord
answers "No matching identifier in this repository" and the lists
answer "No matching records in this repository".

Harvesters are never told that the preprints were withdrawn, so their
indexes keep listing them. It happens on any OPS site whenever a server
with posted preprints is removed, whether the site hosts one server or
several.

## Impact

- **Lost.** The deleted records of every preprint the removed server
  had posted. Nothing can be recovered afterwards: the preprints are
  deleted with the server, so no deleted record can be rebuilt for a
  server already removed.
- **Who.** A Site Administrator removing a preprint server that has
  posted preprints, and every harvester of the site. Removing a server
  is rare.
- **Way round.** Before pressing "Remove", untick "Enable this preprint
  server to appear publicly on the site" under the server's "Edit" and
  save. This writes a deleted record for each posted preprint, and those
  records survive the removal.

Medium: a secondary output (the OAI-PMH deleted records) is wrong for
every preprint of the removed server, silently, but only in the rarely
met state of a server being removed, and there is a way round on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, "Public Knowledge Preprint Server", with its 17
  posted preprints (2, 3, 5 to 19). Nothing else.

Steps:

1. Signed out, open the site-wide OAI-PMH address
   `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   It lists 17 identifiers, `oai:ops.localhost:preprint/2` to
   `oai:ops.localhost:preprint/19` (the repository identifier is the
   install's `[oai] repository_id`).
2. Open
   `/index.php/index/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ops.localhost:preprint/2`
   ("The Facets Of Job Satisfaction…"). It answers the live record.
3. Sign in as `admin`. Open Administration › "Hosted Servers".
4. On the row "Public Knowledge Preprint Server" (`publicknowledge`),
   open the row's arrow and press "Remove".
5. The "Confirm" window asks "Are you sure you want to permanently
   delete Public Knowledge Preprint Server and all of its contents?".
   Press "OK". The row goes.
6. Sign out and open the address of step 1 again.
7. Open the address of step 2 again.

**Expected.** Step 6 lists the 17 identifiers of step 1, each with a
deleted header; step 7 answers that header and no metadata:

```xml
<header status="deleted">
  <identifier>oai:ops.localhost:preprint/2</identifier>
  …
</header>
```

**Observed.** Step 6 answers

```xml
<error code="noRecordsMatch">No matching records in this repository</error>
```

and step 7

```xml
<error code="idDoesNotExist">No matching identifier in this repository</error>
```

The same steps on OJS ("Hosted Journals", `article/1` and `article/17`)
and OMP ("Hosted Presses", `publicationFormat/2` and `/3`) list every
item as a deleted record after the removal.

## Cause

OPS's `APP\services\ContextService` (`classes/services/ContextService.php`)
has a `beforeDeleteContext()` handler that writes a deleted record
(tombstone) for every posted preprint through
`PreprintTombstoneManager::insertTombstonesByContext()`, while the server
still exists. But its constructor never registers it:

```php
Hook::add('Context::add', [$this, 'afterAddContext']);
Hook::add('Context::edit', [$this, 'afterEditContext']);
Hook::add('Context::delete', [$this, 'afterDeleteContext']);
Hook::add('Context::validate', [$this, 'validateContext']);
```

`PKPContextService::delete()` calls `Hook::call('Context::delete::before')`
before it deletes the server, and nothing in OPS listens to it, so the
handler never runs. `afterDeleteContext()` then deletes the sections and
the submissions, and no tombstone is ever written. OJS and OMP register
`Context::delete::before` in the same constructor, which is why their
removed journals and presses keep their deleted records.

The handler arrived unregistered with OPS's tombstone support
([7f9865b625](https://github.com/pkp/ops/commit/7f9865b62587eb716794898f1aa8fde2924cfa91)),
a port of OJS's
[c7826abc31](https://github.com/pkp/ojs/commit/c7826abc3130563cc7af1f2446ed80c8c2d7c693) for
`pkp/pkp-lib#6625`. That commit added the OJS method together with its
`Hook::add` line; the port copied the method and the enable/disable part
of `afterEditContext()`, but not the registration line.

Reach:

- The enable/disable path is not affected: unticking "Enable this
  preprint server to appear publicly on the site" writes the deleted
  records through `afterEditContext()` (seen on screen), and they
  survive a later removal (seen on screen).
- The genre deletion added to `beforeDeleteContext()` by
  [19ec925231](https://github.com/pkp/ops/commit/19ec925231b29d62908fcb249c60312a2c3a323a) for
  `pkp/pkp-lib#8129` never runs either. Nothing is lost there:
  `PKPContextService::delete()` deletes the genres itself a few lines
  after the hook, once it has deleted the announcement types, review
  assignments and user groups (checked in the code).
- The other handlers of the class are all registered (checked in the
  code).

## Proposed fix

Register the handler in OPS's `ContextService` constructor, as OJS and
OMP do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/fix.diff)):

```diff
         Hook::add('Context::add', [$this, 'afterAddContext']);
         Hook::add('Context::edit', [$this, 'afterEditContext']);
+        Hook::add('Context::delete::before', [$this, 'beforeDeleteContext']);
         Hook::add('Context::delete', [$this, 'afterDeleteContext']);
         Hook::add('Context::validate', [$this, 'validateContext']);
```

The fix was tried on OPS `main`. After "Remove", the site-wide list
showed the 17 preprints as deleted records, and GetRecord answered
preprint 2's deleted header. A second check first withdrew preprint 2
("Unpost"), which gave it a deleted record, and then removed the
server. Preprint 2 was still listed once, not twice, and no preprint
had more than one stored tombstone. The removal answered normally, with
no server error.

Once the hook is registered, the genre lines in `beforeDeleteContext()`
do the same work that `PKPContextService::delete()` does a moment
later. They are harmless, and the recommendation is to keep them in
this change, because OJS's and OMP's `beforeDeleteContext()` carry the
same lines. If they are dropped, it should be in all three apps at once,
as a separate clean-up.

- **Alternatives.** Writing the tombstones in `afterDeleteContext()`
  instead: the server is already deleted there, and
  `insertPreprintTombstone()` needs it for the set spec, so the "before"
  hook is the right place. Moving tombstone writing into pkp-lib's
  `PKPContextService::delete()`: each app has its own tombstone manager,
  and OJS and OMP already handle this in their own service, so it would
  be a larger change for no gain.
- **What goes with it.** The diff applies as written to `stable-3_5_0` and `stable-3_4_0`. A test:
  remove a server with a posted preprint and check its deleted record
  at the site-wide OAI-PMH address.

Small: one line in one class, following the pattern OJS and OMP already
use, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/walk.js),
  run on installs freshly loaded from the default dataset with
  `node bin/probe.js all shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5); OJS and OMP take the
  same steps as the control. It also counts the stored rows in
  `data_object_tombstones`: 0 before and after on OPS, 2 after on OJS
  and OMP.
- Check with a preprint withdrawn first:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/neighbour.js)
  ("Unpost" on OPS submission 2, then "Remove"), run on `main` with the
  fix and without it. Without the fix, preprint 2 is the only deleted
  record left after the removal. With the fix, all 17 preprints are
  listed as deleted records, each one once.
- Way round:
  [wayround.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/wayround.js)
  (untick the "Enable" box, "Save", then "Remove"), OPS `main` without
  the fix: 17 deleted records before and after the removal.
- Walked: `main` and 3.5, OJS, OMP and OPS, PostgreSQL, datasets
  pkp/datasets 38ab955 (2026-09-30). 3.5 matched main. The fault does
  not depend on the database.
- Tips: OPS `main`
  [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
  (pkp-lib 3dc90c81a6), 3.5
  [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994)
  (pkp-lib a9c76aed62), 3.4
  [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
  (pkp-lib df13621c2d), 3.3
  [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09);
  the OJS control on `main` bade233f73 and 3.5 92b9a16b48, the OMP
  control on `main` 3b0ecf794 and 3.5 3081c9b00.
- Deleted Record Policy: pkp-lib `classes/oai/OAI.php` writes
  `<deletedRecord>persistent</deletedRecord>` into every Identify
  answer, with no setting (`config.TEMPLATE.inc.php`'s `[oai]` section
  has none). The walk's Identify read on OPS answered `persistent`.
- Code reads: `classes/services/ContextService.php` on 3.5 and 3.4 has
  the same four `Hook::add` lines and the unregistered
  `beforeDeleteContext()`; pkp-lib's `PKPContextService::delete()` calls
  `Context::delete::before` on both. On 3.3,
  `classes/services/ContextService.inc.php` has no tombstone code, and
  nothing in OPS 3.3 writes tombstones (`ArticleTombstoneManager.inc.php`
  is a leftover no class calls), so a removed server leaves no deleted
  records there for want of the whole feature, not this fault. The fix
  diff checked with `git apply --check` on 3.5 and with `patch
  --dry-run` on 3.4's file.
- Introduced: `git log -S"Context::delete::before"` on OPS's
  `ContextService` finds no commit, so the line was never there;
  `git log -S"beforeDeleteContext"` finds 7f9865b625, merged as
  `pkp/ops#170` (2021-08-16).
- Upstream search (2026-10-01): pkp/pkp-lib and pkp/ops, by "tombstone"
  with server, delete and OPS, "remove preprint server OAI",
  `beforeDeleteContext`, `Context::delete::before` and
  `PreprintTombstoneManager`. `pkp/pkp-lib#8736` concerns undefined calls
  in OJS's `ContextService`, not this.
