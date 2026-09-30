# OAI-PMH offers a deleted section's set, but asking for it lists nothing

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/ojs#1344` for `pkp/pkp-lib#2407` · [a9ad0fe883](https://github.com/pkp/ojs/commit/a9ad0fe8837f009182d01f2eddf4a38066ec2b1a) · 2017-03-31 · Alec Smecher (asmecher): it made the query match deleted records to the section's live id, where the 2011 code skipped that filter for a section that no longer exists (read in the code, not run). The request has answered with an empty list since `pkp/ojs#1414` for `pkp/pkp-lib#2569` · [c39ec8385e](https://github.com/pkp/ojs/commit/c39ec8385e4640ad616016dca6471586bc393afa) · 2017-06-06 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When an editor withdraws an article or preprint ("Unpublish", on OPS
"Unpost"), OAI-PMH lists a deleted record for it, filed under its
section's set. If a manager then deletes that section, ListSets keeps
offering the section's set, but asking for the set answers "No matching
records in this repository", at the journal's address and the site-wide
one.

A harvester that collects that section's set is never told the item
was withdrawn, and gets no error. Nothing a journal can change on screen
prevents it.

It takes a section deleted after one of its items was withdrawn. OMP
has the same pattern in its series sets, hidden today by two other
faults (checked in the code).

## Impact

- **Lost.** The notice that an item was withdrawn, for harvesters that
  collect by section set. Their index keeps listing the withdrawn item,
  which may be a retraction.
- **Who.** Indexes and aggregators that harvest a journal's or server's
  sections one set at a time, once a manager has deleted a section that
  held a withdrawn item. That state is rare.
- **Way round.** None for the journal. A harvester that reads the
  journal's own set, or no set, does receive the deleted record, but
  nothing tells a section-set harvester to switch.

Medium: the fault happens only in a rarely met state, but in that state
a withdrawal notice is lost without any error, and a withdrawn item can
stay listed in an index that harvests by section.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OPS in brackets; the same on
  `stable-3_5_0`, with the differences in brackets).
- Nothing else: the section the steps delete is created in step 1.

1. Sign in as `dbarnes`. Go to Settings › Journal › "Sections" [OPS:
   Settings › Server › "Sections"] and press "Create Section". Type
   "Section Title" `Commentary u19w17` and "Abbreviation" `COM` [OPS:
   also "Section URL Path" `commentary-u19w17`], then "Save".
2. Open submission 5, "Genetic transformation of forest trees" [OPS:
   submission 1, "The influence of lactation on the quantity and quality
   of cashmere production"], and its Publication › "Publication
   Settings" page [OPS: Preprint › "Preprint entry"; OJS 3.5:
   Publication › "Issue"]. Choose "Assign To Current/Back Issue" and
   the issue "Vol. 1 No. 2 (2014)" [OPS: no issue; OJS 3.5: the issue
   is chosen in step 3], and "Section" `Commentary u19w17`. Press "Save".
3. Press "Schedule For Publication" [OPS: "Post"] and confirm with
   "Publish" [OPS: "Post"]. The dialog reads "This will be published
   immediately in Vol. 1 No. 2 (2014)." [OJS 3.5: first the window
   "Select an issue to schedule for publication", where "Vol. 1 No. 2
   (2014)" is chosen and saved.]
4. Press "Unpublish" [OPS: "Unpost"] and confirm it.
5. Back on "Publication Settings" [OPS: "Preprint entry"; OJS 3.5:
   "Issue"], set "Section" to "Articles" [OPS: "Preprints"] and press
   "Save". The new section now holds nothing.
6. Go to Settings › Journal › "Sections", open the row
   `Commentary u19w17`, press "Delete" and answer "OK" to "Are you sure
   you want to permanently delete this section?". The row goes.
7. Signed out, open `/index.php/publicknowledge/oai?verb=ListSets`.
8. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
9. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:COM`
   (and the same with `verb=ListRecords`).
10. Open the same at the site-wide address,
    `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:COM`.

**Expected.** Step 7 lists the set `publicknowledge:COM`, "Commentary
u19w17". Steps 9 and 10 list the deleted record of article 5 [OPS:
preprint 1], the one step 8 shows in that set.

**Observed.** Steps 7 and 8 are as expected. ListSets lists
`publicknowledge:COM` named "Commentary u19w17", and the unfiltered list
holds the deleted record in that set:

```xml
<header status="deleted">
    <identifier>oai:ojs2.localhost:article/5</identifier>
    <datestamp>2026-09-30T23:23:58Z</datestamp>
    <setSpec>publicknowledge:COM</setSpec>
</header>
```

Steps 9 and 10, ListIdentifiers and ListRecords alike, at both
addresses, answer:

```xml
<request verb="ListIdentifiers" metadataPrefix="oai_dc" set="publicknowledge:COM">…</request>
<error code="noRecordsMatch">No matching records in this repository</error>
```

A section that still exists keeps its deleted records in its set: after
"Unpublish" on submission 17, `set=publicknowledge:ART` lists
`article/17` as deleted.

## Cause

`JournalOAI::records()` and `identifiers()` turn the `set` argument into
ids with `setSpecToSectionId()`, which calls
`APP\oai\ojs\OAIDAO::getSetJournalSectionId()`
(`classes/oai/ojs/OAIDAO.php`, line 156). That method looks the
abbreviation up among the journal's live sections and, when none
matches, returns the section id `0` (line 170).

`OAIDAO::getRecordsRecordSetQuery()` then builds the list. Its
deleted-records branch keeps a tombstone only if it joins
`data_object_tombstone_oai_set_objects` for that section id (lines
438–446):

```php
->when(isset($sectionId), function ($query) use ($sectionId) {
    return $query->join('data_object_tombstone_oai_set_objects AS tsos', function ($join) use ($sectionId) {
        $join->on('tsos.tombstone_id', '=', 'dot.tombstone_id');
        $join->where('tsos.assoc_type', '=', Application::ASSOC_TYPE_SECTION);
        $join->where('tsos.assoc_id', '=', (int) $sectionId);
```

A deleted section has no live row, so the join asks for section `0` and
drops every tombstone. Yet each tombstone stores the set it belongs to
(`dot.set_spec`). ListSets offers the set from that stored value
(`DataObjectTombstoneDAO::getSets()`, called from `getJournalSets()`),
the record's header names it
(`PKPOAIDAO::doCommonOAIFromRowOperations()`), and the same branch
already compares it with the requested set (lines 455–456). The stored
set is the one that should decide. The join on the live section's id
adds a second test that a deleted section can never pass.

When tombstones arrived in 2011
([a4500f4ddd](https://github.com/pkp/ojs/commit/a4500f4ddd2fda2224322d96549e892e0e04830a)),
the query skipped the section filter when the section id was 0
(`isset($sectionId) && $sectionId != 0`) and relied on the stored set.
The 2012 rewrite kept the section as a `LEFT JOIN`, which filtered
nothing. `pkp/ojs#1344` (removing the mutex work-around) made both joins
inner joins on the live ids. It bound the section's value only when the
id was not 0, while the SQL kept the placeholder, so a deleted
section's set sent a query with a placeholder and no value for it.
`pkp/ojs#1414` bound the `0`, and since then the request answers "No
matching records". OPS inherited the code from OJS.

Reach:

- ListIdentifiers and ListRecords, at the journal's or server's address
  and the site-wide one (checked on screen, OJS and OPS, `main` and
  3.5).
- OPS: `APP\oai\ops\OAIDAO::getSetServerSectionId()` (line 135; the 0 at
  line 146) and the same join in `getRecordsRecordSetQuery()` (lines
  272–281) (checked on screen).
- A section whose abbreviation changed after a withdrawal is hit the same
  way: its tombstones keep the old set, which ListSets lists, and the old
  abbreviation matches no live section (code only).
- Live records are not involved: a section cannot be deleted while
  submissions are in it (`SectionGridHandler::deleteSection()`,
  `Repo::section()->isEmpty()`).
- OMP has the same design in the series join of
  `APP\oai\omp\OAIDAO::getRecordsRecordSetQuery()` (line 257). Two other
  faults hide it today (code only). That join asks for series 1 whatever
  the set, because Laravel's `when()` passes the condition's `true` into
  the closure (register entry
  [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a1)).
  And a series set that names no live series lists all the press's live
  records (register entry
  [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp3)).
- The DRIVER set (`DRIVERDAO`) passes the journal only and is not
  affected (code).

## Proposed fix

Choose a set's deleted records by the set their tombstone stores, and
drop the join on the live section. Everywhere the query has a section
id, it also has the `set` it came from, and the branch already filters
`dot.set_spec` by that set. In `APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()`:

```diff
-            ->when(isset($sectionId), function ($query) use ($sectionId) {
-                return $query->join('data_object_tombstone_oai_set_objects AS tsos', function ($join) use ($sectionId) {
-                    $join->on('tsos.tombstone_id', '=', 'dot.tombstone_id');
-                    $join->where('tsos.assoc_type', '=', Application::ASSOC_TYPE_SECTION);
-                    $join->where('tsos.assoc_id', '=', (int) $sectionId);
-                })->addSelect(['tsos.assoc_id']);
-            }, function ($query) {
-                return $query->addSelect([DB::raw('NULL AS assoc_id')]);
-            })
+            // A deleted record belongs to the set its tombstone stores (dot.set_spec,
+            // filtered below), which is also the set its header names. It is not
+            // matched by the live section's id: a section deleted or renamed since
+            // has none, and its set would list nothing.
+            ->addSelect([DB::raw('NULL AS assoc_id')])
```

The same goes in `APP\oai\ops\OAIDAO::getRecordsRecordSetQuery()`
(`NULL AS section_id`). The diffs are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ojs.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ops.diff).
The journal join stays, so a set of another journal still lists nothing.

The fix was tried on `main`, OJS and OPS. With it, steps 9 and 10 list
`article/5` [OPS `preprint/1`] as deleted, in `publicknowledge:COM`. A
set that never existed (`publicknowledge:NOPE`) still answers "No
matching records". A live section's set lists its own deleted record
(`article/17` in `publicknowledge:ART`) and no other section's. These
reads were the same with the fix in and out.

**Alternatives**

- Skip the join only when the section id is 0 (`->when($sectionId, …)`,
  as in 2011). This fixes the deleted section, but not a reused
  abbreviation. If a new section later takes the old section's
  abbreviation, the lookup finds the new section's id, and the join
  still drops the old section's deleted records.
- Look up the old section's id through the tombstones in
  `getSetJournalSectionId()`. This is more code, and it goes wrong for a
  renamed section. The old set would resolve to the renamed section's
  id, so the live branch would list that section's current records under
  the old set, while their headers name the new one.
- Stop listing such sets in ListSets. Their deleted records would then
  have no set a harvester can ask for, although their headers name one.

**What goes with it**

- No data repair: the tombstones already store their set, and they are
  listed as soon as the fix is in.
- API and hooks: the method is public, and only a set request changes.
  The tombstone rows' section column becomes `NULL`, and nothing reads it
  for a tombstone (`doCommonOAIFromRowOperations()` reads only the
  identifier, the set and the date).
- OMP: once the two OMP faults in the Cause are fixed, its series join
  (`classes/oai/omp/OAIDAO.php`, line 257) should go the same way. It is
  left out here because the fixes for those faults rewrite that code.
- Next to this change, the set filter's `orWhere()` is not grouped, so a
  section's set ignores `from` and `until` for its deleted records
  (register entry
  [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a20)).
  That is a separate fault, and this fix leaves it as it is. Both change
  the same few lines, so they should land in an agreed order.
- Backport: 3.5 and 3.4 have the same Laravel code, so the same removal
  applies there, with different surrounding lines. On 3.3 the query is
  raw SQL (`classes/oai/ojs/OAIDAO.inc.php`): remove the
  `JOIN … tsos` clause (line 269) and the second
  `if (isset($sectionId)) $params[] = (int) $sectionId;` (line 229). The
  column must stay, because the query is a `UNION` of two 8-column
  halves: `' . (isset($sectionId)? 'tsos.assoc_id' : 'NULL') . ' AS
  section_id` (line 262) becomes `NULL AS section_id`.
- Test: a unit test of `getRecordsRecordSetQuery()` with a tombstone
  whose section is gone.

Medium: the change and its test go into two app repos, OJS and OPS.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js),
  run on OJS and OPS installs freshly loaded from the default dataset
  with
  `ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It also reads the
  stored tombstone (`set_spec=publicknowledge:COM`, set objects journal 1
  and the deleted section's id).
- Neighbour check:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/neighbour.js)
  ("Unpublish" on OJS submission 17, "Unpost" on OPS submission 2, then
  the live section's set, the other section's, an unknown set and the
  context's set), on `main` with the fix in and out.
- Walked: `main` and 3.5, OJS and OPS, PostgreSQL, datasets pkp/datasets
  38ab955 (2026-09-30). 3.5 matched main. The fault does not depend on
  the database.
- Tips: OJS `main`
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
  3.5 [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  3.4 [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
  3.3 [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144);
  OPS `main`
  [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
  3.5 [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
  3.4 [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
  3.3 [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09).
- Code reads on 3.4 and 3.3: `classes/oai/{ojs,ops}/OAIDAO.php` on 3.4
  and `classes/oai/ojs/OAIDAO.inc.php` on 3.3 (OPS 3.3 keeps the `ojs`
  path). Both lines also list the tombstone sets in ListSets
  (`DataObjectTombstoneDAO::getSets()`).
- Introduced: traced with `git log -G tsos` on the OJS file. Both 2017
  commits are also in OPS's history. That the 2011–2017 code listed a
  deleted section's deleted records was read in the code, not run. The
  2017 failure between `pkp/ojs#1344` and `pkp/ojs#1414` (a query with an
  unbound placeholder) was not run either.
- Unverified: which indexes harvest OJS or OPS by section set, and
  whether a given index drops an item only on a deleted record.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ops, issues and PRs, open
  and closed): "OAI deleted section set", "OAI tombstone set
  noRecordsMatch", "OAI ListSets deleted section", "OAI set records
  deleted", "OAI setSpec tombstone", `getSetJournalSectionId`,
  `data_object_tombstone_oai_set_objects`. The nearest are
  `pkp/pkp-lib#13144` (ListSets fails when a section has no
  abbreviation), `pkp/pkp-lib#4790` (OMP's ListSets repeats a set when
  tombstones are present) and `pkp/pkp-lib#2566` (a journal's address
  showed every journal's deleted records). None is this fault.
