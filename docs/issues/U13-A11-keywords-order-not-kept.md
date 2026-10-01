# Keywords on an article, book or preprint page can appear in another order than the editor typed

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the keywords are read `ORDER BY seq`)
  - 3.3: none (code; the keywords are read `ORDER BY seq`)
- **Introduced** `pkp/pkp-lib#10324` for `pkp/pkp-lib#10292` · [025a6fc](https://github.com/pkp/pkp-lib/commit/025a6fc71ade25af6dfd75ba27a0be82e22db6c9) · 2025-01-04 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Keywords typed "tide" then "current" can show on the article's, book's
or preprint's page as "Keywords: current, tide", and in a preprint
server's lists as "current" then "tide". The editor expects the order
they typed.

The app saves the order and never reads it back, so the page shows the
keywords in whatever order the database returns them. Once they show in
another order, the next save of the publication stores that order, and
the typed order is kept nowhere. Nothing tells the editor.

On a freshly installed site the typed order holds; it turns only after
the database has stored the rows of one list out of order, which an
editor cannot see coming. Subjects, disciplines and supporting agencies
are stored and read the same way.

## Impact

- **Lost**: the order the editor chose, on the public page and in the
  editing form. After one more save it cannot be recovered.
- **Who**: readers of an item with two or more keywords, and its editor.
  In these walks the order never turned by screen actions alone, on
  either version; it took a database row written out of order.
- **Way round**: remove the keywords and type them again on Publication
  › "Metadata". The order can turn again later.

Low: no keyword is lost and the task gets done; only the order is wrong,
and only in a database state that ordinary use reaches rarely (Cause,
"How a site gets there"). It would be medium if an index were shown to
rely on the order.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` on PostgreSQL, freshly loaded.
  "Keywords" is enabled in the dataset.
- One state is set in the database, between steps 4 and 5, because no
  screen reaches it on demand: the "tide" row stored after the "current"
  row. The statement below changes no value; in PostgreSQL an update
  writes the row again at another place. `<id>` is the submission of
  step 2: 17 on OJS, 14 on OMP, 5 on OPS.

  ```sql
  UPDATE controlled_vocab_entries SET seq = seq
   WHERE controlled_vocab_entry_id = (
     SELECT e.controlled_vocab_entry_id
       FROM submissions su
       JOIN controlled_vocabs cv ON cv.assoc_type = 1048588
        AND cv.assoc_id = su.current_publication_id
        AND cv.symbolic = 'submissionKeyword'
       JOIN controlled_vocab_entries e ON e.controlled_vocab_id = cv.controlled_vocab_id
       JOIN controlled_vocab_entry_settings s ON s.controlled_vocab_entry_id = e.controlled_vocab_entry_id
      WHERE su.submission_id = <id> AND s.setting_name = 'name' AND s.setting_value = 'tide');
  ```

Typing:

1. Sign in as `dbarnes`.
2. Open the submission:
   - OJS: 17, "Antimicrobial, heavy metal resistance and plasmid profile
     of coliforms isolated from nosocomial infections in a hospital in
     Isfahan, Iran";
   - OMP: 14, "From Bricks to Brains: The Embodied Cognitive Science of
     LEGO Robots", which already has the keyword "Psychology";
   - OPS: 5, "Investigating the Shared Background Required for Argument:
     A Critique of Fogelin's Thesis on Deep Disagreement".
3. Publication › "Metadata" (OPS: Preprint › "Metadata"): under
   "Keywords" type "tide", Enter, "current", Enter. Press "French
   (Canada)" and under the French "Keywords" type "marée", Enter,
   "courant", Enter. Press "Save".
4. Open the public page, `/index.php/publicknowledge/en/article/view/17`
   (OMP `…/en/catalog/book/14`, OPS `…/en/preprint/view/5`). It reads
   "Keywords: tide, current" (OMP "Keywords: Psychology, tide, current").

Run the statement above. Then:

5. Reload the public page and read "Keywords:".
6. Back in the submission, open Publication › "Metadata", read the
   keywords, and press "Save" without changing anything.
7. Read the stored order:
   `SELECT e.seq, s.setting_value FROM controlled_vocab_entries e JOIN controlled_vocab_entry_settings s USING (controlled_vocab_entry_id) WHERE s.setting_value IN ('Psychology', 'tide', 'current') ORDER BY e.controlled_vocab_id, e.seq;`
   ("Psychology" matches on OMP only, where no other book has it).

**Expected**: nothing changes, since the statement changes no value.
Step 5 reads "Keywords: tide, current" (OMP "Keywords: Psychology, tide,
current"), the form at step 6 shows "tide" before "current", and step 7
gives `1|tide`, `2|current` (OMP `1|Psychology`, `2|tide`, `3|current`).

**Observed**: step 5 reads "Keywords: current, tide" (OMP "Keywords:
Psychology, current, tide"). On OPS the "Preprints" list also shows the
preprint with "current tide", where it showed "tide current" before the
statement. At step 6 the form shows "current" before "tide" and the save
answers 200. Step 7 then gives the turned order as the stored one:

```
1|current        (OMP: 1|Psychology
2|tide                 2|current
                       3|tide)
```

Control: the French page (`…/fr_CA/…`) reads "Mots-clés : marée,
courant" at every step, its rows not having moved; and between the
statement and step 6 the stored `seq` was still 1 for "tide" and 2 for
"current" while the page already read "current, tide".

## Cause

`PKP\controlledVocab\Repository::insertBySymbolic()` stores each entry
with a `seq`, counted 1, 2, … per language in the order the form sent.
Nothing that reads a publication's keywords uses that column. On `main`
there are two such reads:

- The public page and everything else built from the publication object
  read through `PKP\publication\DAO::fromRow()`
  (`lib/pkp/classes/publication/DAO.php`, line 198):
  `ControlledVocabEntry::query()->withWhereHas(…)->get()`, no `orderBy`.
- The Publication › "Metadata" form reads through
  `PKPMetadataForm::getVocabEntryData()` →
  `Repository::getBySymbolic()`
  (`lib/pkp/classes/controlledVocab/Repository.php`, line 59), no
  `orderBy` either.

On 3.5 both go through `getBySymbolic()`: `DAO::setControlledVocab()`
calls it for the publication object.

Without an `ORDER BY` the database returns the rows as its plan finds
them. On the dataset PostgreSQL scans `controlled_vocab_entries` in the
order the rows lie in the table.

The wrong order then becomes the stored one, by either read:

- "Save" on the "Metadata" form sends `keywords` in the order the form
  showed them, and `insertBySymbolic()` numbers them in that order.
- A save that does not send the keywords (another Publication form,
  publish, unpublish: `Repo::publication()->edit()`, `publish()`,
  `unpublish()` → `DAO::update()`) deletes the entries and inserts them
  again from the publication object, in the order `fromRow()` read them.
  `DAO::insert()` does the same for a new version, which copies the
  turned order (code).

It worked until `pkp/pkp-lib#10324` replaced the controlled vocabulary
DAOs with Eloquent models. The removed
`ControlledVocabEntryDAO::getByControlledVocabId()`, behind
`SubmissionKeywordDAO::getKeywords()` and its three siblings, ended in
`ORDER BY seq`; the new `getBySymbolic()` did not. `pkp/pkp-lib#13003`
(c82f51d, 2026-08-19) then gave `main` the batch read in `fromRow()`,
again without an order.

How a site gets there (PostgreSQL; reasoning from the code and the
database's rules, not measured):

- An `UPDATE` of a row writes a new row version elsewhere, which is what
  the Steps use. The app never updates a keyword row: the only update of
  `controlled_vocab_entries` is `Repository::resequence()`, reached for
  reviewing interests alone. Keyword rows are only deleted and inserted.
- So in ordinary use a list's rows get out of order only when a save's
  inserts land in space freed by earlier deletes, the later keyword on
  an earlier page of the table than the one before it. That needs a
  table of more than one page (some 150 entries) and deleted rows the
  database has already cleaned up.
- The other route is the query plan: a plan that does not scan the table
  in order returns another order with no row moved.
- A table rewrite or a dump and restore copies the rows in the order
  they lie in, so it neither turns a list nor puts one right.

Reach:

- The "Keywords:" line of a journal's, a press's and a preprint server's
  public page, and a preprint server's lists (on screen).
- The Publication › "Metadata" form's keywords (on screen); its
  subjects, disciplines and supporting agencies (code).
- The page's meta tags (`GoogleScholarPlugin`, `DublinCoreMetaPlugin`),
  OAI-PMH Dublin Core (`Dc11SchemaArticleAdapter`), JATS
  (`jatsTemplate`), the PubMed export and the REST API take the
  keywords from the publication object, so they carry the same order;
  the native XML export reads through `getBySymbolic()` (code, OJS; not
  walked).
- OJS's "Recommend Similar Articles" plugin calls `getBySymbolic()` for
  a search phrase, where the order does not matter (code).
- Stored data: a publication saved after its keywords turned, and every
  version made from it, holds the turned order in `seq`.
- Not an instance: `Repository::resequence()` reads through Eloquent's
  `each()`, which orders by the primary key; `MetadataProperty.php`
  (line 426) looks up one entry by name with `first()`; the suggestion
  lists (`PKPVocabController`, `PKPInterestController`) have no order to
  keep.

## Proposed fix

Read the entries in their stored order in both reads: an `orderBySeq`
scope on `ControlledVocabEntry`, following `DataCitation`'s
`scopeOrderBySeq()` and `Funder`'s ordered scope, used in
`DAO::fromRow()` (the page) and in `Repository::getBySymbolic()` (the
form, and all of 3.5).

The scope's second `orderBy`, on the primary key, is needed in ordinary
data: `seq` restarts at 1 for each language, so "tide" and "marée" both
hold 1, and the primary key keeps such ties in insertion order.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keywords-order-not-kept/fix.diff):

```diff
--- a/lib/pkp/classes/controlledVocab/ControlledVocabEntry.php
+++ b/lib/pkp/classes/controlledVocab/ControlledVocabEntry.php
@@ -116,6 +116,14 @@
     }
 
     /**
+     * Scope a query to return entries in their stored order
+     */
+    public function scopeOrderBySeq(Builder $query): Builder
+    {
+        return $query->orderBy('seq')->orderBy($this->primaryKey);
+    }
+
+    /**
      * Scope a query to only include entries for a specific controlled vocab id
      */
--- a/lib/pkp/classes/controlledVocab/Repository.php
+++ b/lib/pkp/classes/controlledVocab/Repository.php
@@ -62,6 +62,7 @@
             ->when(!empty($locales), fn ($query) => $query->withLocales($locales))
+            ->orderBySeq()
             ->get()
--- a/lib/pkp/classes/publication/DAO.php
+++ b/lib/pkp/classes/publication/DAO.php
@@ -197,6 +197,7 @@
         $cache->controlledVocabs ??= ControlledVocabEntry::query()
             ->withWhereHas('controlledVocab', fn ($query) => …)
+            ->orderBySeq()
             ->get()
```

Tried on OJS, OMP and OPS `main`, with keywords in two languages: after
the statement the page still reads "Keywords: tide, current", the form
shows "tide" before "current", and the save at step 6 stores `seq` 1 for
"tide". The French page reads "Mots-clés : marée, courant" throughout,
OPS's "Preprints" list (several preprints' keywords in one query) keeps
"tide current", and the "Keywords:" lines of the dataset items the Steps
do not touch read the same with the fix in and out.

**Alternatives**

- Sort in PHP after the read (`sortBy('seq')`): works, but the table has
  an index on (`controlled_vocab_id`, `seq`) and the code base orders
  such lists in the query.
- Order the `ControlledVocab::controlledVocabEntries()` relation: neither
  read goes through it.

**What goes with it**

- Backport to 3.5: by the code, not tried, the scope and the
  `getBySymbolic()` line are enough there, since 3.5's `DAO` reads
  through `getBySymbolic()`.
- No repair of stored data is possible: where a save has stored a turned
  order, the typed one is gone and the editor retypes it. A list not
  saved since it turned still holds the typed `seq` and shows right once
  the fix is in.
- The guard: a unit test that creates two entries of one vocabulary
  with `seq` against their primary-key order (the first created with
  `seq` 2, the second with 1) and expects them by `seq` from
  `getBySymbolic()` and from `Repo::publication()->get()`. It fails
  without the fix on every database. This spec's scenarios then assert
  the typed order instead of accepting either.

Small: one scope and two one-line calls in pkp-lib, and a unit test.

## Evidence

- Kept script that takes the Steps on OJS, OMP and OPS, on installs
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/keywords-order-not-kept/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keywords-order-not-kept/walk.js),
  run with `PROBE_FEATURE=issues-ir25 PROBE_AGENT=ir25 node bin/probe.js all shared/playwright/checks/issues/keywords-order-not-kept/walk.js`.
  It runs the precondition's statement and step 7's read through `psql`,
  and records the entries' `seq` and place in the table (`ctid`) after
  steps 3 and 6 and after the statement. The neighbour check is in the
  same script: the "Keywords:" line of dataset items it does not touch
  (OJS article 1, OMP book 5, OPS preprints 14 and 11, up to ten
  keywords), the French page, and OPS's "Preprints" list, which reads
  every listed preprint's keywords in one query.
- Walked on `main` (OJS bade233f73 with pkp-lib 2e377d27fc; OMP
  3b0ecf794 and OPS c8af945bb7 with pkp-lib 3dc90c81a6) and on
  `stable-3_5_0` (OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd, pkp-lib
  a9c76aed62): the same lines at every step on both. No request answered
  an error and no page script failed.
- PostgreSQL walked; MySQL not checked. InnoDB reads such rows through
  an index, the primary key or (`controlled_vocab_id`, `seq`), and
  either would return them in an order that hides the fault: a guess,
  unverified.
- The turned order was not seen unforced on either version in these
  walks. This spec's register notes it unforced on long-running
  PostgreSQL test databases (OPS and OJS, 2026-09-25 and 26).
- The plan on the dataset: `Hash Join … Seq Scan on
  controlled_vocab_entries` (`EXPLAIN` of the query `fromRow()` builds,
  for one publication).
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/keywords-order-not-kept/fix.diff ojs omp ops`,
  then the script as above; then reverted. Not tried on 3.5.
- Code reads on `main`: `publication/DAO.php` (`fromRow()`, `insert()`,
  `update()`, `saveControlledVocab()`), `publication/Repository.php`
  (`edit()`, `publish()`, `unpublish()`),
  `controlledVocab/Repository.php`, `ControlledVocabEntry.php`,
  `ControlledVocab.php` (`enumerate()`, which does order by `seq`),
  `PKPMetadataForm.php`, `core/SettingsBuilder.php`, the plugins Reach
  names, and a search of `lib/pkp` and OJS for every
  `ControlledVocabEntry::`, `getBySymbolic(` and
  `controlled_vocab_entries` use. On `stable-3_5_0`:
  `publication/DAO.php` (`setControlledVocab()`) and
  `controlledVocab/Repository.php`.
- 3.4 and 3.3 (code): pkp-lib `stable-3_4_0` (df13621c2d) and
  `stable-3_3_0` (d446601ebe), `SubmissionKeywordDAO::getKeywords()` →
  `ControlledVocabEntryDAO::getByControlledVocabId()`. Not walked there.
- The trace: `git blame` on `getBySymbolic()`'s query gives 025a6fc,
  whose diff removes the `ORDER BY seq` reads and which is an ancestor
  of `stable-3_5_0`; blame on `fromRow()`'s query gives c82f51d.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ops, issues
  and pull requests, open and closed, for keywords and their order
  (order, reordered, shuffled, preserved, sequence), "controlled vocab
  seq order", `getBySymbolic` and `ControlledVocabEntry orderBy`.
  `pkp/pkp-lib#7114` (duplicate values stored) is another problem.
  pkp/omp and pkp/ui-library were not searched (the search allowance ran
  out); neither holds the code involved.
- Unverified: subjects, disciplines and supporting agencies, the meta
  tags, OAI-PMH, exports and REST API, and publish, unpublish or a new
  version as the save that stores a turned order, were read in the code,
  not walked. "How a site gets there" is reasoning; how often a
  production database turns a list was not measured.
