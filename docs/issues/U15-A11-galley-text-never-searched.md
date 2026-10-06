# A reader's search never finds a word that appears only in an article's or book's full text

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11578` for `pkp/pkp-lib#8920` · [b44cf27793](https://github.com/pkp/pkp-lib/commit/b44cf2779332947932c22bc3e3131d2c1ab09f1e) · 2025-08-01 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reader who searches for a word that appears only in the text of an
article's galley gets "No Results", however long after the article was
published, while a word from the same article's title finds it. The
same happens with a book's publication format on a press and a
preprint's galley on a preprint server.

The site is built to search the text of plain-text, HTML and XML
galleys. On this code none of that text reaches the search index, so
search covers only titles, abstracts and contributor names, and the
empty result looks like an honest "no match".

`main` is the coming 3.6 release. A site that upgrades to it from 3.5,
where full-text search works, loses it, because the upgrade rebuilds the
index without the galley text.

## Impact

- **Lost**: finding an item by a word of its full text. Nobody is told.
- **Who**: every reader of every journal, press and preprint server that
  uses the database search driver, which is the default (the OpenSearch
  driver has the same fault). It affects items with a plain-text, HTML or
  XML galley. A stock install indexes no PDF, PostScript or Word galleys,
  since the converters they need are commented out in the shipped
  configuration file. On a site where the administrator has configured
  one, those galleys are affected too.
- **Way round**: a word from the title, the abstract or a contributor's
  name. There is none for a phrase from the body, and rebuilding the
  index does not help, since the rebuild uses the same code.

Medium: the Search page still finds items by their metadata. On a stock
install it loses only the text of HTML, plain-text and XML galleys,
because PDF galleys are not indexed there anyway. It would be high on
sites that configure a PDF converter, where the text of every galley is
lost.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- Queued jobs run, since the search index is filled by a queued job
  after publishing. The dataset's configuration runs them on web
  requests (`job_runner = On`). With the job runner off, run
  `php lib/pkp/tools/jobs.php run` before searching, or neither word
  finds the item.
- A file `u15a-galley.html`: a short HTML page whose text holds the
  made-up word "zanthorpe", which no title, abstract or name on the site
  holds
  ([the one the walk used](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-text-never-searched/u15a-galley.html)).

On a journal (OJS):

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees"
   (Production).
3. In the side menu, under the publication, open "Galleys" and press
   "Add galley". Type "HTML" as the label and press "Save".
4. In "Upload a File Ready for Publication", choose "Article Text", the
   file `u15a-galley.html`, then "Continue", "Continue" and "Complete".
5. Press "Schedule For Publication". In "Review Publishing Details" keep
   the defaults, choose "Assign To Current/Back Issue" and "Vol. 1 No. 2
   (2014)", and press "Confirm"; then press "Publish".
6. Sign out. On the journal's home page press "Search" in the header,
   type "zanthorpe" and press "Search".
7. Search for "Genetic" the same way.

On a press (OMP), with submission 4, "How Canadians Communicate:
Contexts of Canadian Popular Culture" (Production):

1. Sign in as `dbarnes` and open submission 4.
2. Open "Publication Formats", press "Add publication format", name it
   "HTML" and press "OK".
3. On the new format press "Change File". Choose "Book Manuscript" and
   the file, then press "Continue", "Continue" and "Complete".
4. On the uploaded file press "Set Terms", choose "Open Access" and press
   "Save".
5. On the format press "Not Available" and confirm with "OK".
6. Press "Publish", then "Publish" in the window.
7. Sign out and search for "zanthorpe", then for "Canadians", as on the
   journal.

On a preprint server (OPS), the journal's steps with submission 1, "The
influence of lactation on the quantity and quality of cashmere
production" (Production). The file's component is "Preprint Text", step 5
is "Post" and then "Post", and step 7 searches "lactation".

**Expected:** "zanthorpe" lists the item, as the title word does.

**Observed:** "zanthorpe" answers "No Results" on the journal and the
preprint server, and "No titles were found which matched your search
for "zanthorpe"." on the press. The title word lists the item on all
three ("1 - 1 of 1 items"; "2 Titles" on the press, which also lists
"Bomb Canada and Other Unkind Remarks in the American Media"). After the
publish, the press's server log has:

```
Call to undefined method APP\publicationFormat\PublicationFormat::getLocale()
```

The same steps on 3.5 list the item for "zanthorpe" on all three.

## Cause

Since `pkp/pkp-lib#11578` the database search driver fills its index
in `PKP\jobs\submissions\UpdateSubmissionSearchJob::handle()`
(`lib/pkp/jobs/submissions/UpdateSubmissionSearchJob.php`). It writes one
`submissions_fulltext` row per publication and language: the title,
abstract and contributors, and `body`, the text of that publication's
galleys. The change set out to replace the search framework; the job
still collects galley text, so the gap is not by design. The galley
files are looked up by the publication's own id (line 68):

```php
->filterByAssoc(Application::ASSOC_TYPE_REPRESENTATION, [$publication->getId()])
```

A galley file is stored with `assoc_type` = representation and
`assoc_id` = the galley's id (`publication_galleys.galley_id`, on a press
`publication_formats.publication_format_id`), never the publication's.
So the query asks for the files of whichever galley has the same id as
the publication. Usually there is none, no parser runs and `body` stays
empty. In the walk the journal's new galley had id 4 on publication 6,
and the server's had id 21 on publication 1. Both bodies were empty.

On a press the format's text stays out of the index even when the
format's id equals the publication's id, because of a second fault on
the same path. Line 83 keys the text by `$galley->getLocale()`, a method
of `PKP\galley\Galley` that the press's `PublicationFormat` does not
have. The job's `catch (\Throwable)` catches the `Error`, writes it to
the log and skips the file. In the walk the book's new format had id 4
on publication 4, so the file was found and this second fault kept the
text out. In the fix trial's control run, another book got a format
first, so the new format had id 5 and the first fault kept the text out.

Before the new driver, `ArticleSearchIndex::submissionFilesChanged()`
and its OMP and OPS twins read every proof file by the submission's id.
That is why 3.5 finds the galley's words.

The same fault reaches:

- the OpenSearch driver: `PKP\search\engines\OpenSearchEngine::update()`
  has the same lookup and the same `getLocale()` call, for the current
  publication (code);
- every type the parsers take (`SearchFileParser::fromFileType()`: plain
  text; HTML; XML, JATS among them; XHTML), and PDF, PostScript and Word
  where a converter is configured, since no file reaches a parser (code;
  HTML walked);
- the `body` parameter of the Search page's address, which no form
  control sets and which limits the search to galley text: it reads the
  same empty column (code);
- a site upgrading from 3.5: the 3.6 upgrade ends with
  `Installer::rebuildSearchIndex()` (`dbscripts/xml/upgrade.xml`), which
  queues the same job for every submission (code);
- another item's text: the publication with id N indexes the files of
  galley N, whichever submission that galley belongs to, so that other
  item's words would find this one (code; not met in the walks).

## Proposed fix

Look the files up by the publication's galley ids, the way the code base
already walks a publication's galleys and their files
(`PubIdPlugin::clearIssueObjectsPubIds()` in OJS:
`getRepresentationDAO()->getByPublicationId()`, then
`filterByAssoc(ASSOC_TYPE_REPRESENTATION, [$representation->getId()])`).
Take the language from the galley's `locale` data, falling back to the
submission's language for a press's format, which has none. The same
change goes into both drivers
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-text-never-searched/fix.diff)
has both files). In the job:

```diff
-            // Index all galleys
+            // Index all galleys (a press's publication formats); their files are attached to the galley, not to the publication
+            $galleyIds = array_map(
+                fn ($galley) => $galley->getId(),
+                array_values(Application::getRepresentationDAO()->getByPublicationId($publication->getId()))
+            );
             $submissionFiles = Repo::submissionFile()
                 ->getCollector()
-                ->filterByAssoc(Application::ASSOC_TYPE_REPRESENTATION, [$publication->getId()])
+                ->filterByAssoc(Application::ASSOC_TYPE_REPRESENTATION, $galleyIds)
                 ->filterByFileStages([SubmissionFile::SUBMISSION_FILE_PROOF])
                 ->getMany();

             foreach ($submissionFiles as $submissionFile) {
                 $galley = Application::getRepresentationDAO()->getById($submissionFile->getData('assocId'));
+                // A publication format has no language of its own: use the submission's
+                $locale = $galley->getData('locale') ?: $submission->getData('locale');
 ...
-                            $bodies[$galley->getLocale()] = ($bodies[$galley->getLocale()] ?? '') . $buffer;
+                            $bodies[$locale] = ($bodies[$locale] ?? '') . $buffer;
```

An empty id list gives the collector `whereIn(… , [])`, so a publication
without galleys finds no files. The fix was tried with the database
driver on all three apps. With it, the steps list the item for
"zanthorpe" (one result, the item itself). A word placed in a galley of
another, unpublished item stays "No Results" with the fix in and out.

**Alternatives:**

- Read every proof file of the submission, as 3.5 did. Each
  publication's row would then carry every version's galley text, which
  the per-publication rows of the new index were made to avoid.
- Give `PublicationFormat` a `getLocale()`. That fixes only the press's
  half and invents a language that formats do not have.

**What goes with it:**

- Stored data: the rows built so far lack their bodies. The 3.6 upgrade
  rebuilds the index, so sites upgrading from a release need nothing
  more. A site already running `main` runs
  `php tools/rebuildSearchIndex.php` once. Like the upgrade's rebuild,
  the tool only queues the jobs, so the text arrives once the queue has
  run.
- Every version's galleys are indexed, unpublished draft versions
  included, as their titles and abstracts already are. Whether
  unpublished drafts belong in the index at all is a separate open
  question.
- No change to the REST API or plugin hooks.
- Guard: a unit test of `UpdateSubmissionSearchJob` with a galley whose
  id differs from its publication's, on a journal and on a press, and
  an e2e scenario in U15: a word that is only in a published HTML galley
  is found once the queue has run.

Small: the same few lines in two pkp-lib files, following a pattern the
code base already uses, with a unit test; tried on the three apps.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-text-never-searched/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-text-never-searched/lib.js),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset`
  with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/galley-text-never-searched/walk.js`.
  It reads the `jobs` table until the queue is empty before searching,
  and records the item's `submissions_fulltext` rows (3.5: its keyword
  index rows) and its galleys' file ids beside the screens. `WALK=nb` is
  the control run of the fix trial: a galley with the word "merriwake"
  first goes on an item left unpublished (OJS 6, OMP 7, OPS 4), then the
  steps run.
- The fix was tried on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/galley-text-never-searched/fix.diff ojs omp ops`,
  then the walk and `WALK=nb`, then
  `node bin/try-fix.js revert …/fix.diff ojs omp ops`, with `WALK=nb`
  run again after the revert. With the fix, the item's row had a
  98-character body holding "zanthorpe" on all three. The OpenSearch
  half of the diff was not run (no OpenSearch server).
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). Code read: the job and
    `OpenSearchEngine::update()`, identical in both lib/pkp tips;
    `PKP\galley\Galley::getLocale()` and OMP's `PublicationFormat`;
    `SearchFileParser::fromFileType()`;
    `SubmissionFile\Collector::getQueryBuilder()` (the assoc filter);
    `Installer::rebuildSearchIndex()`, `dbscripts/xml/upgrade.xml` and
    `DatabaseEngine::update()` (it deletes the rows and dispatches the
    job); the `[search]` section of `config.TEMPLATE.inc.php`, identical
    in the three apps, where every `index[…]` converter line is
    commented out.
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (lib/pkp cf3f984335), the same steps (OJS assigns
    the issue on the "Issue" page's "Assign to Issue" first; there is no
    "Review Publishing Details"). Code read: `ArticleSearchIndex`,
    `MonographSearchIndex`, `PreprintSearchIndex::submissionFilesChanged()`
    (proof files by submission id); the galley file went into the
    keyword index as a galley-file object.
  - stable-3_4_0 (code): OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    lib/pkp 767353f4fe: the same `submissionFilesChanged()` by
    submission id in the three apps.
  - stable-3_3_0 (code): OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    lib/pkp ac3fa73402: `submissionFilesChanged()` through
    `Services::get('submissionFile')->getMany(['submissionIds' …,
    'fileStages' => [SUBMISSION_FILE_PROOF]])` (OPS in
    `ArticleSearchIndex.inc.php`).
  - MySQL not checked; the fault is in the lookup, not the database.
- Introduced: `git blame` on lines 66 to 83 of the job names
  b44cf27793. The job's earlier lines date from the jobs refactor of
  `pkp/pkp-lib#4622`. `e212f125a8` (`pkp/pkp-lib#11712`) later fixed the
  parse loop's undefined `static::MINIMUM_DATA_LENGTH` and changed
  `error_log($e)` to `error_log($e->getMessage())`, the line that writes
  the log message quoted in Observed.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops were searched by
  the symptom's words and the Cause's class names, with no match.
  `pkp/pkp-lib#7628` (2022, the old engine) and `pkp/containers#27` (a
  3.5 image's commented-out PDF converter) are other faults.
