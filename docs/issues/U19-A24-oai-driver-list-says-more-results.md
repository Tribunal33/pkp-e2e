# On 3.5 a journal's `driver` OAI list stops after a hundred records; on every version it offers "Resume" when complete

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS (the false "Resume" only)
  - 3.5: OJS (the false "Resume", and the list cut short)
  - 3.4: OJS (code; both)
  - 3.3: OJS (code; both)
- **Introduced** no PR; the plugin's first commit · [d29ac627a3](https://github.com/pkp/ojs/commit/d29ac627a337fcc0feb759578da1a37606ac2a2e) · 2011-10-13 · Bozana Bokan (bozana). The cut after a hundred records: `pkp/ojs#2905` for `pkp/pkp-lib#6264` · [56fd4a3a3f](https://github.com/pkp/ojs/commit/56fd4a3a3f642d6ce0a965a0d6215843e7878022) · 2020-10-14 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a24)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "DRIVER" plugin adds the set `driver` to a journal's OAI address.
On 3.5, a harvester that lists the records of that set on a journal
with more than a hundred of them gets the first hundred and no
"Resume": the other records are never listed.

On every version, the set's list also goes wrong as soon as the journal
has a record outside the set (an article that is not open access, or a
deleted record made while the plugin was off). The answer then says
"There are more results." when it holds every member, with a
"completeListSize" that counts the journal's whole list. "Resume"
returns records the harvester already has when a member follows in the
journal's list, and the error "No matching records in this repository"
when none does.

Both come from one cause: the plugin takes one part of the journal's
whole list and only then drops the records outside the set, so its
count of what remains is wrong. On `main` the count is too high, which
gives the false "Resume" and loses nothing in the lists walked. From
3.3 to 3.5 a 2020 change made the count too low, which ends the list
early; a 2026 rewrite on `main` undid that.

## Impact

- **Lost:** on 3.5, the records of the set after the first hundred, in
  ListRecords. On `main`, nothing in the lists walked: the harvester
  gets a repeated record or an error as its last answer.
- **Who:** services that harvest a journal by its `driver` set; the
  plugin is off by default. On 3.5, every such journal with more than a
  hundred open-access articles. On `main`, every such journal with a
  record outside the set.
- **Way round:** none for the set. The journal's list without the set
  is complete, but it also holds what the set leaves out.

Medium: on 3.5 the `driver` set silently loses every record after its
first hundred, in a setup that is not the default, while the journal's
list without the set stays complete. The false "Resume" alone, which is
all `main` shows, would be low. It would be high if a service that
harvests by this set is shown to have no use for the whole list.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OJS `stable-3_5_0` for the
  first group). Its journal `publicknowledge` is open access and has
  two published articles, 1 and 17, each with a galley, in "Vol. 1 No. 2
  (2014)". "DRIVER" is off.

The list cut short (3.5):

1. Sign in as `admin`.
2. Tools › "Import/Export" › "Native XML Plugin" › "Export Articles":
   tick submission 17, press "Export Articles", then "Download Exported
   File".
3. In a text editor, repeat the file's `<article …>…</article>` element
   until it holds 34, and put them inside one
   `<articles xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca native.xsd">`
   … `</articles>` element. (34 copies keep the file under PHP's default
   upload limit of 2 MB.)
4. Tools › "Import/Export" › "Native XML Plugin" › "Import": upload the
   file and press "Import". Do this three times. Each time the results
   read "The import completed successfully" and name 34 submissions.
   The journal now has 104 published articles, each with a galley.
5. Settings › Website › "Plugins" › "Installed Plugins": under "Generic
   Plugins" tick "DRIVER".
6. Open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver`.

**Expected.** A hundred records and "Resume", which lists the other
four. The same address without `&set=driver` does exactly that
(completeListSize 104).

**Observed.** On 3.5: a hundred records and no "Resume". The answer has
no resumptionToken, and the four other records are never listed. On
`main` the set lists all 104, in two parts.

The false "Resume" (every version), on a freshly loaded dataset; steps
2 to 6 above are not needed:

7. Sign in as `admin`. From the dashboard open submission 5, "Genetic
   transformation of forest trees" (in Production), and under
   "Publication" open "Title & Abstract". Press "Schedule For
   Publication". In "Review Publishing Details" choose "Publication
   Stage" "Version of Record (VoR)", "Revision Significance" "Major
   Revision", "Assign To Current/Back Issue" and the issue "Vol. 1
   No. 2 (2014)"; press "Confirm", then "Publish". [3.5: under
   "Publication" open "Issue", press "Assign to Issue", choose "Vol. 1
   No. 2 (2014)", "Save"; then "Schedule For Publication" and
   "Publish".]
8. Press "Unpublish" and confirm with "Unpublish". "DRIVER" is off, so
   the deleted record this leaves is not in the set.
9. Tick "DRIVER" (step 5) and open the address of step 6.
10. Press "Resume".

**Expected.** Step 9 lists `article/1` and `article/17` and the list
ends there: no "There are more results.", no "Resume".

**Observed.** The journal's list is in submission order: `article/1`,
the deleted record of `article/5`, `article/17`. Step 9 lists the two
members and says "There are more results." with "Resume"; the answer
ends with

```
<resumptionToken expirationDate="…" completeListSize="3" cursor="0">…</resumptionToken>
```

Two records were returned, so step 10 starts at the third row and
lists `article/17` again; then the list ends. ListIdentifiers with
`set=driver` does the same. [3.5: step 9 lists the two records and
ends; the fault shows in step 12.]

When no member follows:

11. Untick "DRIVER" and answer "OK", so that the next deleted record is
    outside the set too. Open submission 17, press "Unpublish" and
    confirm. Tick "DRIVER" again.
12. Open the address of step 6, then press "Resume".

**Expected.** `article/1` and the end of the list.

**Observed.** `article/1` and "There are more results."
(completeListSize 3; on 3.5, 2). "Resume" answers

```
Error Code   noRecordsMatch
No matching records in this repository
```

## Cause

`DRIVERDAO::getDRIVERRecordsOrIdentifiers()`
(`plugins/generic/driver/DRIVERDAO.php`) answers `set=driver` in place
of the journal's own list (`DRIVERPlugin::recordsOrIdentifiers()`, on
the hooks `JournalOAI::records` and `JournalOAI::identifiers`). It
takes one part of the journal's whole list and then drops the records
that are not in the set. On `main`:

```php
$query = $this->getRecordsRecordSetQuery($setIds, $from, $until, null);
$total = $query->getCountForPagination();
$results = $query->offset($offset)->limit($limit)->get();

foreach ($results as $row) {
    $record = $this->$funcName((array) $row);
    if (in_array('driver', $record->sets)) {
        $records[] = $record;
    }
}
```

`$total` counts every record of the journal, and `$offset` and `$limit`
count rows of the whole list. The caller, `PKP\oai\OAI::listRecords()`
and `listIdentifiers()`, counts in records returned: it adds their
number to the offset and offers a resumption token while that sum is
below `$total`. With one record outside the set, the sum stays below
the total after the first part, and the next part starts at a row the
first part already covered. Whether a record is in the set is decided
in PHP (`DRIVERPlugin::isDRIVERRecord()`), which is why the query
cannot select the members. The plugin has paged this way since its
first commit (`$total = $result->RecordCount()`).

From 3.3 to 3.5 the total is counted in a loop instead, since the
removal of ADODB
([56fd4a3a3f](https://github.com/pkp/ojs/commit/56fd4a3a3f642d6ce0a965a0d6215843e7878022)):

```php
$total = 0;
for ($i = 0; $i < $offset; $i++) {
    if ($result->next()) {
        $total++;
    } // FIXME: This is inefficient
}
for ($count = 0; $count < $limit && $result->current(); $count++ && $total++) {
```

The first loop adds nothing, since `next()` returns nothing, and
`$count++ && $total++` skips the first row. So `$total` is the number
of rows of this one part minus one, never more than 99. A token is
offered only while the members returned so far are fewer than that. A
first part with 99 or 100 members ends the list at once, and no list
gets past the part in which its members reach 99. This part of the
fault is a regression of 3.3.0. `main` lost the loop in
[4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761)
(`pkp/pkp-lib#12922`, 2026), which went back to counting the whole
list.

Reach:

- ListRecords and ListIdentifiers with `set=driver`, with and without
  `from` and `until` (walked). A part holds 100 records or 500
  identifiers, so on 3.5 ListIdentifiers is cut after 500 (code).
- On `main`, each part advances by its number of members, so a journal
  with records outside the set in every part repeats rows part after
  part (walked for one record, step 10). The list ends cleanly only if
  the members returned reach the total; otherwise it ends with a part
  that holds no member, which `listRecords()` answers as "No matching
  records in this repository" (walked, step 12).
- On `main`, a part whose hundred rows hold no member gives that error
  even when members follow in later rows, and those are then never
  listed (code; not walked). A journal that sells subscriptions, with a
  hundred articles in a row that are not open access, is such a case.
- The journal's list without the set, `set=<journal>` and the section
  sets do not pass through this method (walked).

## Proposed fix

Recommended, tried on `main` and on 3.5: page over the members. The
method walks the journal's list once, keeps the rows that are in the
set, and counts the offset, the limit and the total in members, which
is what `listRecords()` expects
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-list-says-more-results/fix.diff)
for `main`,
[fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-list-says-more-results/fix-stable-3_5_0.diff)
for 3.5):

```php
$total = 0;
foreach ($this->getRecordsRecordSetQuery($setIds, $from, $until, null)->get() as $row) {
    $row = (array) $row;
    $identifier = $this->returnIdentifierFromRow($row);
    if (!in_array('driver', $identifier->sets)) {
        continue;
    }
    if ($total >= $offset && count($records) < $limit) {
        $records[] = $funcName == 'returnIdentifierFromRow' ? $identifier : $this->$funcName($row);
    }
    $total++;
}
return $records;
```

Tried on `main` and on 3.5: with 104 members the set lists a hundred,
then four after "Resume" (completeListSize 104); steps 9 and 12 list
the members and end, with no "Resume"; ListIdentifiers the same. The
list without a set, `set=publicknowledge`, and the set with `from` and
`until` answer as before.

What it costs: the membership test runs on the hook
`OAIDAO::_returnIdentifierFromRow` (`DRIVERPlugin::addSet()` →
`isDRIVERRecord()`), which loads the journal, the submission, its
current publication and the issue for every live row. Today that runs
for the rows of one part; with the fix it runs for every row of the
journal on every request for a part, and a second time for the rows
returned as full records. Not measured; a timing on a journal of a few
thousand articles, and `->lazy()` in place of `->get()`, belong to the
fix.

**Alternatives**

- Stop once the part is filled and one more member is found, and
  report the total as "at least one more": cheaper for the early
  parts, but the last parts still read the whole list, and
  "completeListSize" is then wrong on every part but the last. Not
  recommended: it saves only the rows that follow the part and keeps
  a wrong number in the answer.
- Store the membership (a `driver` setting on the publication, as the
  deleted records have), so that the query selects the members and
  pages by itself: the only way to make a part cost one part. It needs
  the setting kept current whenever the journal's, the issue's or the
  article's access changes, and an upgrade step. Worth it only if the
  timing above is bad.
- On the stable branches only, put the row count back (`$total =
  count($rows)`): three lines, and the cut is gone, but 3.5 then shows
  the false "Resume" in lists that end correctly today (step 9). Not
  tried.
- Select the members in the query: not possible as the plugin stands,
  since membership is read in PHP.

**What goes with it**

- Backport: this is where the records are lost. 3.5 and 3.4 take
  fix-stable-3_5_0.diff (their methods are `_getRecordsRecordSetQuery()`,
  `_returnRecordFromRow()`, `_returnIdentifierFromRow()`). 3.3 is not
  the same change: its `_getRecordsRecordSet()` returns the generator
  of `retrieve()`, so the loop runs over that, with no `->get()`. The
  old method also built full records for ListIdentifiers, ignoring
  `$funcName`; the fix ends that.
- The three "DRIVER" reports change the same two files. This one stands
  alone (`DRIVERDAO.php`) and should go first or with the fix for
  [U19 A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A23-oai-driver-set-lists-article-without-galley.md),
  which puts articles with no galley outside the set and so makes more
  journals show the false "Resume" until this fix is in. The A23 and
  [U19 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A11-oai-driver-set-misses-deleted-record-of-article-in-no-issue.md)
  diffs touch the same lines of `DRIVERPlugin.php`; one PR for the
  three is the simplest.
- Guard: OJS has no test of the plugin. A DAO test with database
  fixtures (a journal with members and non-members, the method asked
  for each part) would have caught it; pkp-e2e's OAI-PMH scenario 10
  can cover the false "Resume" end to end.

Medium: one method in one file, but its paging is rewritten, its cost
on a large journal has to be timed first, the test needs fixtures, and
3.3 needs its own version.

## Evidence

- Kept scripts that take the Steps through the screens on an install
  loaded from PKP's default test dataset, with their helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-set-lists-article-without-galley/lib.js):
  [large.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-list-says-more-results/large.js)
  (steps 1 to 6) and
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-driver-list-says-more-results/walk.js)
  (steps 7 to 12), each run after
  `npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset` with
  `PROBE_FEATURE=issues-a23 PROBE_AGENT=a24 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-list-says-more-results/walk.js`
  (or `large.js`; `PKP_E2E_LINE=stable-3_5_0` in front of both for 3.5).
  They read each OAI address as a harvester does, without a session,
  following every resumption token. walk.js also reads the list without
  a set, `set=publicknowledge`, ListIdentifiers and the set with `from`
  and `until` after steps 10 and 12. large.js makes the file of step 3
  from the export.
- The fixes, tried 2026-10-01 on the tips below with
  `node bin/try-fix.js apply <diff> ojs` (`PKP_E2E_LINE=stable-3_5_0` in
  front for 3.5), both scripts, then `node bin/try-fix.js revert`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`). MySQL not checked;
  the count is made in PHP.
  - main: OJS 06fd981b01 (lib/pkp 2e377d27fc).
  - stable-3_5_0: OJS 18d097d94e (lib/pkp 1fb843f491), both scripts.
    The list of step 6 without the set was read on 3.5 by typing the
    address after the walk. Code read:
    `plugins/generic/driver/DRIVERDAO.php`, the loops quoted above.
  - 3.4 (code): OJS `stable-3_4_0` 9571d8fde7,
    `plugins/generic/driver/DRIVERDAO.php`: the same loops as 3.5.
  - 3.3 (code): OJS `stable-3_3_0` 9fdb9bcf9a,
    `plugins/generic/driver/DRIVERDAO.inc.php`: the same loops, over
    the generator `retrieve()` returns.
- "Version of Record (VoR)" and "Major Revision" are the options as the
  walk read them on the screen.
- In the browser view of step 10 the last part still says "There are
  more results.", and its "Resume" answers "The requested
  resumptionToken is invalid or has expired". That is the browser
  view's own fault on every list
  ([U19 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A4-oai-browser-last-part-says-more-results.md));
  a harvester sees the list end there.
- Introduced: `git log -S` on `$total = $result->RecordCount();` and on
  `$count++ && $total++` in `plugins/generic/driver/`; 56fd4a3a3f is on
  `stable-3_3_0`, `stable-3_4_0` and `stable-3_5_0`.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/ojs, issues and PRs,
  open and closed: "DRIVER plugin oai", "driver oai resumption",
  "driver completeListSize", "DRIVERDAO", "DRIVERPlugin".
  `pkp/pkp-lib#10830` (closed with a fix, 2025) is another fault in the
  same method: the set listing no records at all on 3.4.
- Not driven: on `main`, a hundred rows with no member followed by
  members (read in `lib/pkp/classes/oai/OAI.php`); more than 500
  identifiers on 3.5; a 3.5 list with records outside the set among its
  first hundred rows; a journal other than the installation's first,
  whose lists also carry the first journal's deleted records
  ([U19 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A1-oai-own-address-loses-deleted-records.md)).
- Unverified: which services harvest by this set today and whether
  they can use the journal's whole list; how a harvester treats a
  repeated record or "noRecordsMatch" as the last answer of a list; the
  cost of the fix on a journal with thousands of records.
