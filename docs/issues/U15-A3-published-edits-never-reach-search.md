# Search never finds the corrected title, abstract or added contributor of an already published article

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (contributors only)
  - 3.4: none (code; a published version cannot be edited)
  - 3.3: none (code; a published version cannot be edited)
- **Introduced** `pkp/pkp-lib#11578` for `pkp/pkp-lib#8920` · [b44cf27793](https://github.com/pkp/pkp-lib/commit/b44cf2779332947932c22bc3e3131d2c1ab09f1e) · 2025-08-01 · Alec Smecher (asmecher); contributors: since `pkp/pkp-lib#11225` (3.5, [315d04e935](https://github.com/pkp/pkp-lib/commit/315d04e93508960079f7057b4f90fdc183f3cc85), 2025-05-01) and `pkp/pkp-lib#11431` (`main`, [9b866bac4d](https://github.com/pkp/pkp-lib/commit/9b866bac4d9b0607a3a80ba240977e7990cf6f7a), 2025-11-09) for `pkp/pkp-lib#10263` · Hafsa-Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-03); `pkp/pkp-lib#8435` (open) is related: it asks where the change event should be fired, not why nothing hears it
- **Tracked in** spec U15 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who corrects the title or abstract of an article that is
already published, or adds a contributor to it, sees the change on the
article page, but the Search page never finds the article by the new
words. It still finds it by the old ones, and then lists it under the
new title.

Nothing tells the editor: the save says "Saved". The new words become
searchable only when the version is unpublished and published again, a
new version is published, or the administrator rebuilds the search
index from the command line.

## Impact

- **Lost**: readers cannot find a corrected item by its corrected
  words, or by the name of a contributor added, renamed or removed
  after publication.
- **Who**: today, 3.5 sites, for a contributor's name only (a title or
  abstract correction is found there). Once `main` ships as 3.6, every
  journal, press and server that corrects published metadata (a typo
  in a title, a missing co-author), for title, abstract and
  contributors alike, whichever search driver the site uses (the
  default database search or OpenSearch).
- **Way round**: "Unpublish" and "Publish" again (OPS "Unpost" and
  "Post"), which takes the item off the site until it is published
  again; or "Create New Version" and publish it, which adds a version
  readers see on the item's page; or `php tools/rebuildSearchIndex.php`
  on the server.

Medium, rated on `main` as it will ship in 3.6: a way round exists on
screen, but the stale entry is silent and stays until someone
republishes. It would be high if a correction could not be pushed to
search at all; the 3.5 half alone, contributor names only, would not
rate higher.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, context `publicknowledge`.
- The published item the steps edit, already in the dataset: OJS
  article 17 "Antimicrobial, heavy metal resistance and plasmid profile
  of coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran" (OMP: book 14 "From Bricks to Brains: The Embodied
  Cognitive Science of LEGO Robots", old word "Bricks"; OPS: preprint 12
  "Sodium butyrate improves growth performance of weaned piglets during
  the first period after weaning", old word "Sodium").

1. Signed out, open "Search" in the site header, type `Antimicrobial`
   and press "Search": the article is listed. `u15btitle` gives "No
   Results".
2. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`
   (OMP 14, OPS 12), the address a dashboard row's "View" opens. On OPS
   `dbarnes` is assigned to no submission, so his "Assigned to me" view
   is empty there; the address works for him as a manager.
3. Open Publication (OPS: Preprint) › "Title & Abstract". The page
   reads "Warning: This version has been published. Editing it may
   impact the published content."
4. In "Title", replace "Antimicrobial" with `u15btitle`. At the end of
   "Abstract", type ` u15babstract`. Press "Save": "Saved".
5. Open Publication (OPS: Preprint) › "Contributors" › "Add Contributor". Type "Given
   Name" `Nova`, "Family Name" `U15bcontrib`, "Email"
   `u15bcontrib@mailinator.com`, choose "Country" "Canada", tick
   "Author" and press "Save". The list shows "Nova U15bcontrib".
6. Sign out and open the article's page: it shows the new title and
   "Nova U15bcontrib".
7. On "Search", search for `u15btitle`, then `u15babstract`, then
   `U15bcontrib`.

**Expected**: each of the three words lists the article, as publishing
it does once the site's background jobs have run.

**Observed**: each search answers "No Results" (OMP: `No titles were
found which matched your search for "u15btitle".`), and still does
after several more page loads. `Antimicrobial` still lists the
article, under its new title "u15btitle, heavy metal resistance and
plasmid profile of coliforms isolated from nosocomial infections in a
hospital in Isfahan, Iran".

On OPS, the old word "Sodium", which the edit removed from the title
and which appears nowhere else in the preprint's record, still lists
it under "u15btitle butyrate improves growth performance…". On 3.5 the same steps
find the article by `u15btitle` and `u15babstract`, and only
`U15bcontrib` answers "No Results".

## Cause

On `main` the search index (`submissions_fulltext`, written by
`PKP\jobs\submissions\UpdateSubmissionSearchJob`) is refreshed only by
`PKP\observers\listeners\UpdateSubmissionInSearchIndex`, which listens
to `PublicationPublished` and `PublicationUnpublished` and nothing
else. The database search driver matches the typed words against the
title, abstract and contributor names stored in that table, while each
hit's title and authors in the results list, and the item's page, are
read from the publication itself. So an edit shows everywhere except
in what search matches.

Editing a published version does announce itself:
`PKPSubmissionController::editPublication()` fires
`PKP\observers\events\MetadataChanged` after
`Repo::publication()->edit()`. On 3.5 that event reaches
`MetadataChangedListener`, which queues `MetadataChangedJob`, and the
job calls `submissionMetadataChanged()` on the app's search index. On
`main`, b44cf27793 (the Laravel Scout rewrite for `pkp/pkp-lib#8920`)
deleted that listener and job as dead code and gave
`UpdateSubmissionInSearchIndex` no handler for `MetadataChanged`, so the
event now reaches nothing. The edit-published change for
`pkp/pkp-lib#10263` reached `main` later (9b866bac4d, merged
2025-11-09) with its `MetadataChanged` call, written for a listener
`main` no longer had. This half is the regression: it works on 3.5.

Contributors are a second gap, on both lines: `addContributor()`,
`editContributor()` and `deleteContributor()` in
`PKPSubmissionController` change the published version's authors and
fire no event at all. Until `pkp/pkp-lib#10263` a published version's
contributors could not be changed, so nothing needed one. This half is
a defect rather than a regression: it has never worked since
contributors became editable after publication.

Reach (each read in the code, not walked):
- Editing a contributor's name or deleting a contributor goes through
  the same controller, without an event.
- `PKPManageFileApiHandler::saveMetadata()`, the scheduled-publication
  task `PublishSubmissions` and OJS's `IssueGridHandler` also fire
  `MetadataChanged`, equally unheard on `main`; the last two publish
  first, so their items are indexed through `PublicationPublished`
  anyway.
- A Native XML import fires `BatchMetadataChanged` for the imported
  submissions (`NativeXmlSubmissionFilter::process()`); b44cf27793
  deleted its listener too, and the import stores a publication's
  "published" status directly rather than through `publish()`, so
  imported published items reach the index only through a rebuild.
  The proposed fix leaves this out (see "What goes with it").
- Keywords, subjects, sections and the published date are matched
  against the live publication, not the index, so editing them shows in
  search at once (`DatabaseEngine::buildQuery()`).
- A galley added or replaced after publication fires no event either;
  its text is covered by
  [U15-A11-galley-text-never-searched.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U15-A11-galley-text-never-searched.md)
  (galley text is not indexed at all on `main`), not by this report.

## Proposed fix

Proposed (the team decides): give the listener that owns the index a
handler for `MetadataChanged`,
and make the three contributor endpoints fire that event, as
`editPublication()` already does:

```diff
--- a/lib/pkp/classes/observers/listeners/UpdateSubmissionInSearchIndex.php
+++ b/lib/pkp/classes/observers/listeners/UpdateSubmissionInSearchIndex.php
+    public function handleMetadataChanged(MetadataChanged $event)
+    {
+        // The event may carry the submission as it was read before the change.
+        $submission = Repo::submission()->get($event->submission->getId());
+        if ($submission) {
+            app(\Laravel\Scout\EngineManager::class)->engine()->update(collect([$submission]));
+        }
+    }
--- a/lib/pkp/api/v1/submissions/PKPSubmissionController.php
+++ b/lib/pkp/api/v1/submissions/PKPSubmissionController.php
         $newId = Repo::author()->add($author);           // addContributor()
+        event(new MetadataChanged($submission));
         Repo::author()->delete($author);                   // deleteContributor()
+        event(new MetadataChanged($submission));
         $author = Repo::author()->get($author->getId());   // editContributor()
+        event(new MetadataChanged($submission));
```

The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-edits-never-reach-search/fix.diff),
against the app root. What wires the handler is its name and type: PKP's
`EventServiceProvider` registers no subscribers and instead discovers
every public `handle*` method in `lib/pkp/classes/observers/listeners/`
by the class of its first parameter, so `handleMetadataChanged(MetadataChanged $event)`
is heard without touching the class's `subscribe()` (which nothing
calls). The event fires in `addContributor()` right after
`Repo::author()->add()`, so it also fires when the affiliations that
follow are refused with a 400 after the author is already stored. The
handler calls the same engine `update()` the publish handlers do, so it
serves the database driver and OpenSearch alike, and every existing
`MetadataChanged` caller (and any plugin that fires it) is covered at
once.

Tried on `main`, all three apps: the steps' three words then find the
item, OPS's old word "Sodium" no longer does, and a title edited on an
unpublished submission (OJS 4, OMP 3, OPS 1) still finds nothing, with
the fix in and out.

**Alternatives**:
- Fire the event from `Author\Repository::add()`, `edit()` and
  `delete()` instead of the controller, as the open
  `pkp/pkp-lib#13104` does for `last_modified` on 3.5: it would cover
  every writer, but creating a new version copies every author through
  `add()` and would queue one refresh per author.
- Call the engine directly in each controller method: four copies of
  what one handler does, and plugins that fire `MetadataChanged` stay
  unheard.
- Bring back 3.5's `MetadataChangedListener` and job: they call the
  search index classes the rewrite removed.

**What goes with it**:
- The discovered listener list is cached for a day
  (`EventServiceProvider::MAX_CACHE_LIFETIME`), so a deployed fix is
  heard only after `php lib/pkp/tools/events.php clear` (or the cache's
  expiry). The trial installs were reloaded after the fix was applied,
  which empties their cache.
- `DatabaseEngine::update()` deletes the item's index rows during the
  request and only then queues `UpdateSubmissionSearchJob`, so after
  each save the item is out of search until the job has run, as after
  a publish today. On the walked installs, whose jobs run on web
  requests, the rows were back before the next page; on a site whose
  jobs run from a worker or cron, the gap lasts until the worker picks
  the job up.
- A scheduled publication (`PublishSubmissions`) and OJS's "Publish
  Issue" fire `PublicationPublished` and then `MetadataChanged`, so they
  now queue two refreshes per item; harmless, but the second is wasted.
- Unpublished submissions get their index rows refreshed on each save
  too (the job indexes every version, as at publication); search still
  leaves them out, since it requires a published version.
- Left out: `BatchMetadataChanged` from a Native XML import. A
  `handleBatchMetadataChanged(BatchMetadataChanged $event)` beside the
  new handler, updating the submissions in `$event->submissionIds`,
  would cover it; it is not in the diff and was not tried.
- No data repair on `main`: it is unreleased, and the upgrade to 3.6
  rebuilds the index (`rebuildSearchIndex` in `dbscripts/xml/upgrade.xml`).
- Backport to 3.5: only the three contributor lines, since 3.5's own
  listener already handles the event; entries left stale by earlier
  contributor edits need `php tools/rebuildSearchIndex.php`.
- Guard: a pkp-lib unit test that fires `MetadataChanged` with
  `Queue::fake()` and asserts `UpdateSubmissionSearchJob` is queued,
  beside `tests/jobs/submissions/UpdateSubmissionSearchJobTest.php`;
  and an e2e check in U15 that edits a published title and searches
  for the new word.

Small: a few lines in two pkp-lib files following an existing
pattern, with a unit test; tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-edits-never-reach-search/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on OJS 17, OMP 14 and
  OPS 12 and records each search, the index rows and the job queue;
  `NB=1` runs the unpublished-submission check alone. Run it from the
  pkp-e2e repo on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/published-edits-never-reach-search/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  each install freshly loaded from pkp/datasets e8dafbc (2026-10-02),
  whose configuration runs the job runner on web requests. On `main`
  no job was queued by the save or the contributor add and the item's
  `submissions_fulltext` row kept its old title and authors to the end
  of the walk; with the fix, the row held the new title, abstract word
  and contributor right after the edits. A first version of the diff
  also added a `subscribe()` entry, which nothing calls; the diff as
  linked, without it and with the `addContributor()` event moved up,
  was walked again on OPS with the same outcome.
- On 3.5 the old word of OJS ("antimicrobial") and OMP ("bricks") stays
  in the index because each also appears in the item's abstract; OPS's
  "Sodium" does not, which is why the control uses it.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, lib/pkp ac3fa73402. The two changed
  files are identical in the three `main` checkouts.
- Code reads beyond the Cause: on `main`, `OpenSearchEngine::update()`
  (it indexes the current publication of the model it is given, hence
  the re-read in the handler) and `EventServiceProvider` (discovery and
  its cache); on 3.5, `MetadataChangedListener`, `MetadataChangedJob`,
  `ArticleSearchIndex` / `MonographSearchIndex::submissionMetadataChanged()`
  and the contributor endpoints (no event); on 3.4,
  `PKPSubmissionHandler::editPublication()` and the contributor
  endpoints answer `api.publication.403.cantEditPublished` for a
  published version, and `Author\Repository::validate()` refuses it
  (`author.editPublishedDisabled`); on 3.3, the same refusal in
  `PKPSubmissionHandler.inc.php` and `AuthorGridHandler.inc.php`.
- Introduced: b44cf27793 is pull request `pkp/pkp-lib#11578`; its
  commits "Remove dead job/listener code" deleted
  `MetadataChangedListener`, `BatchMetadataChangedListener`,
  `MetadataChangedJob` and `BatchMetadataChangedJob`, and it rewrote
  `UpdateSubmissionInSearchIndex` with the two publish events only.
  The contributor half
  traces to the refusals removed by 315d04e935 (pull request
  `pkp/pkp-lib#11225` on `stable-3_5_0`) and 9b866bac4d on `main`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops searched for the
  symptom (search index after editing a published title, index not
  updated, old title) and for `MetadataChanged` and
  `UpdateSubmissionInSearchIndex`. `pkp/pkp-lib#8435` asks to clarify
  where `MetadataChanged` is fired; its last comment (2025-10-03) notes
  the event survives the rewrite. `pkp/pkp-lib#13104` (draft pull
  request on `stable-3_5_0`) adds author change events for
  `last_modified`, not for search.
- Not checked: MySQL (the fault does not depend on the database); the
  OpenSearch engine (not driven; the fix calls the same `update()` the
  publish listener does); editing or deleting a contributor and the
  scheduled-publication path were not walked; 3.4 and 3.3 not walked.
