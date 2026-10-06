# A press's or preprint server's web feeds list items by when they were submitted, and leave out one published late

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the feeds sort otherwise, and publishing moves the submission's last-change date)
- **Introduced** `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr), which stopped publishing from moving the submission's date; the feeds began to sort by that date with `pkp/ops#351` for `pkp/pkp-lib#7623` and `pkp/ojs#3821` for `pkp/pkp-lib#8731` (Jonas Raoni Soares da Silva, jonasraoni)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U18 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U18-web-feeds.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press publishes a book and expects its web feeds, "the most recent
publications", to list it first. The feeds place it by the date it was
submitted instead: publishing does not move an item, and neither does
an editorial decision, a new version, or "Unpublish" and "Publish". A
book is in the wrong place whenever a book submitted after it was
published before it. A preprint server does the same.

With more published items than "Number of publications to display" (30
unless changed), a book or preprint with that many later submissions
already published stays below the cut and out of all three feeds: a
new version of an older item, or a first publication that took long.
Subscribers never learn of it, and nothing an editor can do to a
published item moves it.

"Web Feed Plugin" is on by default. On `main` a journal's feeds do move
a published article to the top, through a change of its own that the
fix would move into the shared code. On 3.5 and 3.4 a journal's feeds
have the same fault unless "Display items in current published issue."
was chosen.

## Impact

- **Lost**: the announcement of an item below the cut, and the order of
  the others. The feed's own "updated" date does not move either.
- **Who**: every press and preprint server, and on 3.5 and 3.4 every
  journal that did not choose the current issue for its feeds. Wrongly
  placed: any item published after an item that was submitted later.
  Left out: an item with as many later-submitted items already published
  as the number allows, so new versions of older items above all.
- **Way round**: none. No action on a published item moves the date
  (code). A larger "Number of publications to display" keeps the item in
  the feeds, in its place by submission.

Medium: a public output is silently wrong with no way round. The order
is wrong often, but an item is left out only behind 30 later
submissions, and it stays on the site itself.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`, context `publicknowledge`
  (OPS `main` for a preprint server). "Web Feed Plugin" is on and
  "Number of publications to display" is 30, so nothing is created. The
  dataset's items were published in the order they were submitted, so
  the steps publish one again.
- OMP has two published books: submission 14, "From Bricks to Brains:
  The Embodied Cognitive Science of LEGO Robots", and submission 5,
  "Bomb Canada and Other Unkind Remarks in the American Media". OPS has
  17 posted preprints; the steps use submission 2, "The Facets Of Job
  Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence".

Steps:

1. Signed out, open
   `/index.php/publicknowledge/gateway/plugin/WebFeedGatewayPlugin/atom`
   (the same for `/rss2` and `/rss`). OMP lists "From Bricks to Brains…"
   first and "Bomb Canada…" second; OPS lists "The Facets Of Job
   Satisfaction…" last of 17.
2. Sign in as `dbarnes`, open submission 5 (OPS 2), press "Unpublish"
   (OPS "Unpost") and confirm with the same button.
3. Open submission 5 (OPS 2) again and, in its workflow, "Publication"
   (OPS "Preprint") › "Title & Abstract". Press "Publish" (OPS "Post")
   in that page's header, and in the window that opens press "Publish"
   (OPS "Post") again.
   [OJS on 3.5, instead of steps 2 and 3: open submission 1,
   "Signalling Theory Dividends", the second of two articles in the
   feeds. Its workflow opens on version 1.1, which waits unpublished.
   On "Publication" › "Title & Abstract" press "Publish" and confirm
   with "Publish".]
4. Open the three feeds again.
5. Open Settings › Website › "Plugins", and in the "Web Feed Plugin"
   row open "Settings". Type `1` in "Number of publications to
   display" and press "OK". [OJS: also choose "Display a fixed number of
   the most recent publications." The dataset has neither choice made
   and its feeds already list recent publications, so the fault does not
   need it; the window was not saved without it.]
6. Open the three feeds again.

**Expected**: in step 4 the item just published is the first item of
each feed. In step 6 each feed holds that item alone.

**Observed**: in step 4 the three feeds list the items in the order of
step 1: "Bomb Canada…" second (OPS: "The Facets Of Job Satisfaction…"
last of 17), and the feed's own date (`<updated>` in the Atom feed) has
the same value as in step 1. In step 6 each feed holds one item, the other
book, "From Bricks to Brains…" (OPS: "Finocchiaro: Arguments About
Arguments"): the item published a minute before is in none of them.

A first publication (OPS `main`, on a freshly loaded dataset):
submission 1, "The influence of lactation on the quantity and quality of
cashmere production", was submitted before all 17 posted preprints and
never posted. As `dbarnes`, open it, "Preprint" › "Title & Abstract",
press "Post" and confirm with "Post". Expected: it is the first item of
each feed. Observed: it is the last of 18 in each, below "The Facets Of
Job Satisfaction…", and the feed's own date has not moved.

Control: on OJS `main` the same publish of submission 1's version 1.1
puts the article first in step 4 and alone in step 6.

## Cause

The feeds sort on a date that publishing does not write.
`WebFeedGatewayPlugin::fetch()` (pkp/webFeed) lists the published
submissions with
`->limit($recentItems)->orderBy(Collector::ORDERBY_LAST_MODIFIED, Collector::ORDER_DIR_DESC)`,
which is `ORDER BY s.last_modified` on the `submissions` table, and
takes the feed's own date from the first row.

`PKP\publication\Repository::publish()` calls `stampModified()` on the
publication only. The "Publish" button's API call runs
`publish($publication, false)`, which skips
`PKP\submission\Repository::updateStatus()` inside it, and the
controller calls `updateStatus()` and `updateCurrentPublication()`
afterwards. `updateStatus()` ends in `$this->dao->update($submission)`
without a stamp, and `updateCurrentPublication()` does the same when the
current publication changed. On `main` the `PublicationPublished` event
then records a "move to done" decision (`ApplyDoneWorkflowStage`), and a
decision writes the stage with a plain DAO update too
(`DecisionType::runAdditionalActions()`).

What does move `submissions.last_modified` is short:
`Repo::submission()->add()` and `edit()`, whose only callers in the apps
are the submission API's create, edit, "save for later" and submit, all
used by the submission wizard; the reviewer grid's cancel and reinstate
forms; and the native import, at import. So after "Submit" the date
stays, and in the dataset it equals `date_submitted` for every item,
published ones included. Creating a version does not stamp the
submission either.

Until 3.3 `PKPSubmissionService::updateStatus()` passed the new status
to `edit()`, which stamped the submission, so publishing moved the date.
[f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa)
replaced that with the plain DAO update. The feeds then moved onto the
column: OPS's from "date published" to "last modified" in
[d9b0e7e196](https://github.com/pkp/ops/commit/d9b0e7e196a8452b4cef2adb5b0b7dbb82c92391)
("Fixed ordering"), OJS's in
[1636274fbc](https://github.com/pkp/ojs/commit/1636274fbc9adba456577b3dbddbb16d2d26a95b).
OMP's feed sorted by date published in 3.3 and took the new sort when
the three apps moved to the shared plugin.

OJS `main` no longer shows it because
[4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761)
(`pkp/pkp-lib#12922`, OAI records per version) added a `publish()`
override to `APP\publication\Repository` that stamps the submission once
the publication is live. OMP's `publish()` override does not stamp,
OPS has no override, and on 3.5 no app stamps.

Reach:

- The three feeds of a press and a preprint server. Driven on screen:
  an item published again, and on OPS a first publication. Read in the
  code: a new version, and OMP's first publication, which go through
  the same `publish()`.
- On 3.5 a journal's feeds too (driven on screen: a new version).
- A journal whose feeds list the current issue is not touched: that
  list is sorted by the table of contents (code).
- The OAI datestamp of a press and a preprint server reads the same
  column and stays put after "Unpublish" and "Publish":
  [U19-A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A18-oai-datestamp-stays-after-edit-republish.md),
  which proposes a fix in the OAI queries.
- The REST API's `orderBy=lastModified` on submissions sorts on the
  same column (code).
- Items that become published without `publish()`: the native import
  stamps the submission as it creates it, and OMP's CSV import through
  `Repo::submission()->add()`, so both carry the moment of the import
  (code). QuickSubmit is not in the checkouts and was not looked at.
- Stored data: `submissions.last_modified` of an item published on 3.4
  or later is its submission date (or a later reviewer cancel or
  reinstate), not its publication.

## Proposed fix

Stamp the submission where every app publishes, in
`PKP\publication\Repository::publish()` (pkp-lib), once the publication
is live. It is the block OJS `main` carries in its own override, moved
to the shared class:

```diff
             Repo::submission()->updateCurrentPublication($submission);
             $submission = Repo::submission()->get($submission->getId());
         }
 
+        // A version going live is a change to the submission: stamp it, so that everything
+        // that reads submissions by their last change (the web feeds, OAI) sees it.
+        if ($newPublication->getData('status') === Publication::STATUS_PUBLISHED) {
+            $submission->stampModified();
+            Repo::submission()->dao->update($submission);
+        }
+
         $msg = ($newPublication->getData('status') === Publication::STATUS_SCHEDULED) ? 'publication.event.scheduled' : 'publication.event.published';
```

The full diff, relative to the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-item-not-moved-up-feeds/fix.diff).
It keeps the sort the plugin chose. A publication that is only
scheduled is stamped when it goes live: the `PublishSubmissions` task (a
future date) and OJS's issue grid (an issue being published) call
`publish()` again then. The stamp survives what follows it in the
request, the `PublicationPublished` event with its done-stage decision
and the controller's `updateStatus()`, since each reads the submission
afresh (code, and the stored date in the walk with the fix).

Tried on `main` on the three apps. With the fix, on OMP and OPS the item
is first in the three feeds in step 4 and alone in them in step 6, and
the feed's own date is the moment of the publish; OJS reads as before.
A second check, unpublishing the feeds' first item, behaved the same
with and without the fix: the feeds lose the item and the others keep
their order and their stored dates.

**Alternatives**

- Sort the feeds by date published again
  (`Collector::ORDERBY_DATE_PUBLISHED`), in the plugin. That column is a
  date without a time, so items of one day have no order; an item
  published again keeps its first date; and the plugin left that sort on
  purpose ("Fixed ordering").
- Stamp in `PKP\submission\Repository::updateStatus()`, where 3.3 did.
  It would move the date on every status change of every submission
  (declined, scheduled), which is what the comment in OJS's override
  avoids.
- Copy OJS's override into OMP and OPS: three copies of one rule.

**What goes with it**

- OJS's override then stamps a second time in `publish()`; that block
  can go. Its stamps in `unpublish()` and `delete()` serve the OAI
  deleted records and stay.
- On a press and a preprint server the OAI datestamp of an item moves
  when it is published, the publish-again half of U19-A18 (not walked
  with this fix). The edit of a published version, that report's other
  half, is not covered.
- Publishing an issue stamps every article of it in the same second,
  and the feed has no second sort key, so their order among themselves
  in a recent-publications feed is not fixed. OJS `main` already behaves
  so; on a 3.5 or 3.4 backport it is new for journals.
- No data repair: the items already published keep their order until
  they are published again.
- Backport: on `stable-3_5_0` and `stable-3_4_0` the block goes at the
  same point of `publish()`, after the status update; the lines around
  it differ there, so the diff does not apply as it stands (code; not
  tried there). On those versions it fixes a journal's feeds too.
- Guard: an e2e scenario in spec U18 in which an item published again
  with more items than the number comes first in the three feeds (a
  **Planned** item), or a test of `publish()` in pkp-lib that reads the
  submission's `lastModified` before and after.

Medium, as a proposal for the team to decide: a few lines in pkp-lib
and the duplicate to take out of OJS, with a test; it also changes when
`lastModified` moves for the OAI lists and API clients of a press and a
preprint server.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-item-not-moved-up-feeds/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-item-not-moved-up-feeds/lib.js);
  with `neighbour` as its argument it walks what the fix must leave
  alone, and with `first` the first publication on OPS. On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/published-item-not-moved-up-feeds/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/published-item-not-moved-up-feeds/fix.diff ojs omp ops`.
  The script reads each feed without a session and, beside it,
  `submissions.last_modified` of every published item.
- Walked on PostgreSQL, datasets pkp/datasets e8dafbc (2026-10-02); the
  fault does not depend on the database.
- Walked on `main` and 3.5, the three apps, as `dbarnes`. The stored
  date of the item did not move through steps 2 and 3 on OMP and OPS
  (OMP `main`: `2026-10-02 11:37:13` before and after), and on OJS 3.5
  it stayed at `2026-10-02 11:30:18` when version 1.1 was published; on
  OJS `main` it moved to the moment of the publish. On OJS the
  walk takes the bracketed step (version 1.1 of submission 1) on both
  lines, since the dataset's other published article is already first.
- The first publication was walked on OPS `main` (the script's `first`
  argument): the preprint's stored date stayed at its `date_submitted`,
  `2026-10-02 11:28:26`, while its publication's moved to the moment of
  the post.
- Not driven: a first publication on OMP and a new version on OMP and
  OPS (read in the code; in the datasets looked at, OMP and OPS `main` and
  OJS 3.5, each item's stored date equals its `date_submitted`, with
  its decisions and first publication after it); saving the plugin's window on OJS with neither list
  choice made; a feed with more than 30 items at the default
  number (the number was lowered to 1 instead); the fix on 3.5; the OAI
  lists with the fix.
- Code reads. main: `WebFeedGatewayPlugin::fetch()`,
  `PKP\submission\Collector` (`ORDERBY_LAST_MODIFIED`),
  `PKP\publication\Repository::publish()`, `unpublish()` and
  `version()`, `PKP\submission\Repository::updateStatus()`,
  `updateCurrentPublication()` and `edit()`, each app's
  `APP\publication\Repository`, every caller of `Repo::publication()->publish()` in the apps (the
  publish API, OJS's issue grid, the `PublishSubmissions` task, OMP's
  catalog API; the test tooling's `PKPSubmissionScenarioBuilder` apart),
  every caller of `Repo::submission()->edit()` and of `stampModified()`
  on a submission, `ApplyDoneWorkflowStage`,
  `DecisionType::runAdditionalActions()`, the native import's
  `NativeXmlSubmissionFilter` and OMP's `CSVImportExportPlugin`. 3.5: the same
  files; no app's `publish()` stamps the submission. 3.4 (`git show
  upstream/stable-3_4_0:…`, lib/pkp `origin/stable-3_4_0`): the plugin
  (pkp/webFeed d786885) sorts by `ORDERBY_LAST_MODIFIED`,
  `updateStatus()` ends in the plain DAO update, no `publish()` stamps
  the submission. 3.3: `PKPSubmissionService::updateStatus()` passes a
  changed status to `edit()`, which calls `stampModified()`; OPS's feed
  sorts by `lastModified`, OMP's by `ORDERBY_DATE_PUBLISHED`, and OJS's
  passes no sort, so it lists by date submitted (not looked at
  further).
- Introduced: `git blame` on the sort line in pkp/webFeed gives its
  initial commit e2bb67cd4e (`pkp/webFeed#1`, 2023-03-14), which moved
  the plugin out of the apps; `git log -S"ORDERBY_LAST_MODIFIED"` in the
  apps finds d9b0e7e196 (OPS, 2022-09-23, PR `pkp/ops#351`) and
  1636274fbc (OJS, 2023-03-08, PR `pkp/ojs#3821`). The stamp's removal
  is the commit that first holds "Use the DAO instead of the Repository"
  in `updateStatus()`, f75706ba57 (PR `pkp/pkp-lib#7631`).
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ops, pkp/webFeed): feed
  order published, web feed lastModified, feed recent publications
  missing, feed new release, `stampModified` publish, `last_modified`
  submission publish, `ORDERBY_LAST_MODIFIED`. Read and not the same
  fault: `pkp/pkp-lib#12958` (open; the OAI datestamp not moving on a
  metadata change, the subject of U19-A18), `pkp/pkp-lib#12922` (closed;
  its discussion is where OJS's stamp on publish was proposed, for OAI),
  `pkp/pkp-lib#6674` (open; a request for tests of the feeds and OAI).
- Tips: OJS `main` b84f8e2e44 with lib/pkp ddd8ab243a; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  webFeed 7436935 in all three. `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3, each with lib/pkp cf3f984335 and webFeed
  cd16aa3. `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 32b0f4b4af. `stable-3_3_0`: OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, lib/pkp f6ab331645.
