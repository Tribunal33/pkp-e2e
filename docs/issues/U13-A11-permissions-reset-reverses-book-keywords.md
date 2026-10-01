# "Reset Monograph Permissions" puts every book's keywords in reverse order, and the order typed is lost

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none (each list read by its own query)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#13003` · [d90c8eac9d](https://github.com/pkp/pkp-lib/commit/d90c8eac9d36492b08e609530337518327ae659b) · 2026-08-19 · Alec Smecher (asmecher), on top of `pkp/pkp-lib#10324` for `pkp/pkp-lib#10292` · [025a6fc71a](https://github.com/pkp/pkp-lib/commit/025a6fc71ade25af6dfd75ba27a0be82e22db6c9) · 2025-01-04 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A press manager uses "Tools" › "Permissions" › "Reset Monograph
Permissions" to refresh every book's copyright and licence. Afterwards
every book's keywords are in reverse order: "Canadian Studies,
Communication & Cultural Studies, Political & International Studies"
becomes "Political & International Studies, Communication & Cultural
Studies, Canadian Studies". This shows on the book page and in the
editors' "Metadata" form, and nothing says the order changed.

The reversed order is now the stored one. The typed order can only be
had back by retyping each book's keywords.

This is on the unreleased `main` only. The app reads the keyword lists
back without sorting them by their saved position, so the order depends
on how the database returns the rows. On the default dataset the press
is hit and journals and preprint servers are not, including when an
issue is published.

## Impact

- **Lost**: the typed order of the keywords of every book in the press,
  published or not. All the terms are kept.
- **Who**: a press manager who presses the reset, a tool used rarely
  (after a change of licence policy), and then every reader of a book
  page.
- **Way round**: none but retyping.

Low: no term is lost, the reset does its job, and no index or service is
known to rely on the keywords' order. It would be medium if a routine
action (publishing, an issue's publication) were shown to reverse the
lists too. On the default datasets none did.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, on PostgreSQL.
- Statistics on the two vocabulary tables, as an install in use has
  them. Autovacuum never analyzes `controlled_vocab_entries` on a fresh
  load (22 rows, under its 50-row threshold), so run:

  ```sql
  ANALYZE controlled_vocabs, controlled_vocab_entries;
  ```

  To check that the install has the plan that reverses the lists, the
  query `fromRow()` runs for a batch of all the press's publications
  should show `Hash` over `controlled_vocab_entries`:

  ```sql
  EXPLAIN SELECT * FROM controlled_vocab_entries WHERE EXISTS (
    SELECT * FROM controlled_vocabs
    WHERE controlled_vocab_entries.controlled_vocab_id = controlled_vocabs.controlled_vocab_id
      AND symbolic IN ('submissionKeyword','submissionSubject','submissionDiscipline','submissionAgency')
      AND assoc_type = 1048588
      AND assoc_id IN (SELECT publication_id FROM publications));
  ```

Steps:

1. Open submission 5, "Bomb Canada and Other Unkind Remarks in the
   American Media" (`/index.php/publicknowledge/catalog/book/5`), and
   read "Keywords:".
2. Sign in as `dbarnes`.
3. Go to "Tools" › "Permissions" and press "Reset Monograph
   Permissions". Press OK in the browser's confirm box ("Are you sure
   you wish to reset permissions data already attached to monographs?").
4. Open the book page from step 1 again and read "Keywords:".
5. Open the book's workflow, "Publication" › "Metadata", and read the
   "Keywords" field.

**Expected**: steps 4 and 5 show the order from step 1:

```
Keywords: Canadian Studies, Communication & Cultural Studies, Political & International Studies
```

**Observed**: the book page reads

```
Keywords: Political & International Studies, Communication & Cultural Studies, Canadian Studies
```

The "Metadata" form shows the same reversed order. The reset's request
answers 200 and the page shows no error.

Control: the same reset kept the order on OJS ("Reset Article
Permissions", submission 1) and OPS ("Reset Preprint Permissions",
submission 11). So did publishing an OJS issue: submissions 4, 8, 11 and
14 scheduled into "Vol. 2 No. 1 (2015)", then "Publish Issue". Plain
"Save"s on "Metadata" kept the order on all three apps.

## Cause

`PKP\publication\DAO::fromRow()` reads the keywords, subjects,
disciplines and supporting agencies of every publication in the batch it
is loading with one query (`lib/pkp/classes/publication/DAO.php`, the
`$cache->controlledVocabs` query, lines 198 to 202). The query has no
`orderBy`, so the entries come back in whatever order the database's
plan produces. The `seq` column, which
`controlledVocab\Repository::insertBySymbolic()` writes as 1, 2, … in
the order typed, is never read. `Repository::getBySymbolic()`, which
fills the "Metadata" form and the native XML export, has no order
either.

On the press's tables, PostgreSQL joins with a hash table built on
`controlled_vocab_entries`. The entries of one vocabulary all land in
the same bucket. The join returns them in the reverse of the order it
read them from the table, so each list comes back reversed. On the journal's and the server's tables it
builds the hash table on `controlled_vocabs` instead. The entries then
come back in the order they lie on disk, which is the order typed.

`Repository::resetPermissions()` (`lib/pkp/classes/submission/Repository.php`,
lines 770 to 787) loads every submission of the context in one
collector. `submission\DAO::fromRow()` loads all their publications in
one batch, so the vocabulary read covers every publication at once. The
method then calls `Repo::publication()->edit()` on each publication.
`DAO::update()` → `saveControlledVocab()` → `insertBySymbolic()` deletes
the entries and writes them again with `seq` in the order just read.

d90c8eac9d (`pkp/pkp-lib#13003`, batch loading) made this one query for
the whole batch. Before it, `fromRow()` read each list through
`getBySymbolic()`, as 3.5 still does. 025a6fc71a (`pkp/pkp-lib#10292`)
had already dropped the `ORDER BY seq` that
`ControlledVocabEntryDAO::getByControlledVocabId()` used in 3.4. On
3.5, each query reads one list. PostgreSQL then hashes the one matching
vocabulary row and returns the list in the order it lies on disk, so
the order holds there.

Reach:

- Every book saved by the reset: books 3, 4, 5, 6, 9, 10, 12 and 17 on
  the dataset each have two or more keywords, and all are stored
  reversed afterwards. Subjects, disciplines and supporting agencies go
  through the same query and save. The dataset holds none with two
  terms, so this is from the code.
- The book page's `citation_keywords` tags and OAI-PMH's `dc:subject`
  read the stored list, so they carry the reversed order too (code).
- Other actions that save publications read in a batch:
  - OJS `IssueGridHandler::publishIssue()`, line 626. On the dataset
    it kept the order (walked).
  - `unpublishIssue()`, lines 728 to 729, and `deleteIssue()`, line
    385 (code).
  - The `PublishSubmissions` scheduled task in all three apps, which
    publishes every scheduled submission of a context from one
    collector (code).
  - Publication edits on a submission with several versions, whose
    versions are one batch (code).

  Each one reverses the lists when the batch is large enough for
  PostgreSQL to hash `controlled_vocab_entries`. On OMP's dataset that
  took the whole press: with 12 publications, `EXPLAIN` shows the
  other plan.
- A long-used install is unlikely to get the reversing plan. In a
  synthetic database of 5,000 publications, PostgreSQL read a single
  list through the `(controlled_vocab_id, seq)` index, which is in typed
  order. It read batches of 20 and 200 publications by hashing
  `controlled_vocabs` instead, which returns the entries in disk order.
  Small presses and journals are the ones at risk.
- MySQL not checked.

## Proposed fix

Order both reads by `seq`, as `ControlledVocab::enumerate()` already
does (`->orderBy('e.seq')`) and as the data citations do in the same
`fromRow()` (`->orderBySeq()`). This is the
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keywords-lose-typed-order/fix.diff),
in full:

```diff
--- a/lib/pkp/classes/controlledVocab/Repository.php
+++ b/lib/pkp/classes/controlledVocab/Repository.php
@@ -62,6 +62,7 @@
                 fn ($query) => $query->withSymbolics([$symbolic])->withAssoc($assocType, $assocId)
             )
             ->when(!empty($locales), fn ($query) => $query->withLocales($locales))
+            ->orderBy('seq')
             ->get()
             ->each(function ($entry) use (&$result, $asEntryData) {
                 foreach ($entry->name as $locale => $value) {
--- a/lib/pkp/classes/publication/DAO.php
+++ b/lib/pkp/classes/publication/DAO.php
@@ -197,6 +197,7 @@
 
         $cache->controlledVocabs ??= ControlledVocabEntry::query()
             ->withWhereHas('controlledVocab', fn ($query) => $query->withSymbolics([ControlledVocab::CONTROLLED_VOCAB_SUBMISSION_KEYWORD, ControlledVocab::CONTROLLED_VOCAB_SUBMISSION_SUBJECT, ControlledVocab::CONTROLLED_VOCAB_SUBMISSION_DISCIPLINE, ControlledVocab::CONTROLLED_VOCAB_SUBMISSION_AGENCY])->withAssoc(Application::ASSOC_TYPE_PUBLICATION, $ids))
+            ->orderBy('seq')
             ->get()
             ->collect()
             ->groupBy(fn ($cve) => $cve->controlledVocab->assocId, true);
```

`seq` is unique within one list for each language, and `fromRow()`
groups the entries by publication, vocabulary and language. One global
order on `seq` therefore gives each list its own order. Both queries
filter through `EXISTS` subqueries, so `seq` is not ambiguous.

The fix was tried on `main` on OJS, OMP and OPS. With it, the OMP reset
kept the order of step 1 on the book page and in the form, and OJS and
OPS were unchanged. An order the editor changes on purpose is still
kept, with or without the fix: the editor removes the first keyword,
types it again and saves, and it shows last.

**Alternatives:**

- A global scope ordering `ControlledVocabEntry` by `seq`. It would add
  `ORDER BY` to every query on the entries, counts and deletes
  included, to serve the two reads whose order is shown.
- Read the vocabularies one publication at a time again, as 3.5 does.
  That gives up what `pkp/pkp-lib#13003` batches for, and the order
  would still come from the disk.
- Stop `resetPermissions()` from rewriting the vocabularies. The issue
  actions and the scheduled task would still save what the batch read
  returned.

**What goes with it:**

- Reviewer interests (`user\interest\Repository::getInterestsForUser()`)
  are read without an order too. They need no change: the entries are
  shared by every user, `resequence()` numbers them site-wide by ID, and
  no user's own order is stored. 3.4's `InterestDAO` did not order them
  either.
- Backport to 3.5: optional. The `getBySymbolic()` line applies there
  as it stands, but 3.5 reads one list per query and keeps the order on
  disk.
- Test: a pkp-lib unit test that writes a list with
  `insertBySymbolic()`, swaps two entries' `seq`, and expects
  `getBySymbolic()` and a batch of two publications from the
  publication collector to return the lists in `seq` order.

Small: one line in each of two pkp-lib reads, following the pattern of
`enumerate()`, and a unit test.

## Evidence

- Walk script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keywords-lose-typed-order/walk.js),
  on installs freshly loaded from PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30; PostgreSQL):
  `node bin/probe.js all shared/playwright/checks/issues/keywords-lose-typed-order/walk.js`
  runs the `ANALYZE` and the Steps. Its argument `issue` takes the OJS
  issue control. The fix was applied with
  `node bin/try-fix.js apply …/fix.diff ojs omp ops`.
- The reset reversed OMP's lists on three walks, each on a fresh load.
  Two of them ran after autovacuum had analyzed `controlled_vocabs`,
  and one ran after the `ANALYZE`. A reset seconds after the load,
  before either, kept the order.
- Branch heads walked: OJS `main` bade233f73 (pkp-lib 2e377d27fc), OMP
  `main` 3b0ecf794 and OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6). The
  two files are identical in both pkp-lib heads.
- 3.5, walked with the same script on the 3.5 dataset after the
  `ANALYZE`: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd, pkp-lib
  a9c76aed62. The order held on all three. OMP's batch query there has
  the same reversing plan, but `DAO::setControlledVocab()` reads each
  list through `getBySymbolic()`, whose plan hashes the one vocabulary
  row.
- 3.4, read in the code: OJS `upstream/stable-3_4_0` 9571d8fde7, pkp-lib
  `origin/stable-3_4_0` df13621c2d. `SubmissionKeywordDAO::getKeywords()`
  reads through `ControlledVocabEntryDAO::getByControlledVocabId()`,
  `… ORDER BY seq`.
- 3.3, read in the code: OJS `upstream/stable-3_3_0` 9fdb9bcf9a, pkp-lib
  `origin/stable-3_3_0` d446601ebe. It has the same pair of DAOs, with
  `ORDER BY seq`.
- Introduced: `git log -S` on the `fromRow()` query gives d90c8eac9d.
  The GitHub API names no pull request for it, and it is not among the
  commits of `pkp/pkp-lib#13179` or `pkp/pkp-lib#13240`.
- The long-used install: two tables with the same columns and indexes,
  holding 5,000 publications' vocabularies with four keywords each, in
  a scratch database after `ANALYZE`, read with `EXPLAIN`. Unverified
  on a real install.
- Upstream searched in pkp/pkp-lib, pkp/omp, pkp/ojs and pkp/ui-library
  (keywords order, keyword order changed, keywords reversed, keywords
  sequence, controlled vocab order, reset permissions keywords,
  `getBySymbolic`).
- Not walked: OJS "Unpublish Issue" and deleting an issue, and the
  scheduled task.
