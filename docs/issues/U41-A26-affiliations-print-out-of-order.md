# On an article, book or preprint page with several contributors, a contributor's affiliations print in reverse order

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none; OMP and OPS walked, OJS read in the code
  - 3.4: none (code; one affiliation per contributor)
  - 3.3: none (code; one affiliation per contributor)
- **Introduced** `pkp/pkp-lib#13003`, pushed to `main` without a PR · [5f62747939](https://github.com/pkp/pkp-lib/commit/5f627479391ae83503b970e4430cf99fd72efe6e) (one query for all contributors) and [a91a65ee20](https://github.com/pkp/pkp-lib/commit/a91a65ee20892ffe6cb109df28f10db8864952ed) (its joins) · 2026-08-27 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U41 [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a26)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a published item with several contributors, a contributor's
affiliations print on the article, book or preprint page in the reverse
of the order the contributor's "Edit" window lists them: the
institution added last comes first. Nobody is told, and the form has
no control to set the order.

The reversed order also reaches the page's Google Scholar tags, the
REST API and, by the code, the DOI deposits (Crossref, DataCite), the
JATS and MARC records served over OAI-PMH, and the DOAJ, PubMed, ONIX
and native XML exports. Every affiliation is still there.

It shows on PostgreSQL, on PKP's test dataset from three contributors
on a journal and by four on a press or a preprint server, and a page
that shows it shows it on every load. It is on `main` only, so it ships
in the next release if left alone.

## Impact

- **Lost**: the order of a contributor's affiliations in the public
  record: the item page, its citation tags, the REST API and the
  exports and deposits.
- **Who**: readers, indexes and DOI agencies, for published items where
  a contributor has two or more affiliations and the item has enough
  contributors. Editors and authors do not see it in the workflow.
- **Way round**: none. Entering the affiliations in reverse would print
  right only while the database keeps reversing them.

Low: every affiliation is shown and deposited, only in the wrong order.
A journal whose authors must name a particular institution first (an
employer's or a funder's rule) would put it at medium, the more so
because a deposit already sent keeps the wrong order after a fix.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded into
  **PostgreSQL** (the walks ran on PostgreSQL 18.6, with the tables not
  ANALYZEd after the load). MySQL was not tried: without an `ORDER BY`
  its order depends on MySQL's own plan, so a MySQL install that keeps
  the order does not prove the fault absent.
- Each app has a published item with several contributors, the first
  of whom has one affiliation:
  - OJS submission 1, "Signalling Theory Dividends", its published
    version 1.0 (version 1.1 is unpublished): "Alan Mwandenga"
    ("University of Cape Town"), "Amina Mansour", "Nicolas Riouf"; page
    `/index.php/publicknowledge/article/view/1`.
  - OMP submission 14, "From Bricks to Brains: The Embodied Cognitive
    Science of LEGO Robots": "Michael Dawson" ("University of Alberta")
    and two others; page `/index.php/publicknowledge/catalog/book/14`.
  - OPS submission 7, "Developing efficacy beliefs in the classroom":
    "Elinor Ostrom" ("Indiana University") and "Frank van Laerhoven";
    page `/index.php/publicknowledge/preprint/view/7`.

Steps:

1. Sign in as `dbarnes`.
2. Open the submission by its address
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
3. In the side menu, under "Publication" ("Preprint" on a preprint
   server), open "Contributors"; on OJS, first press "Version of Record
   1.0" and open its "Contributors". The page warns "Warning: This
   version has been published. Editing it may impact the published
   content."
4. Press "Edit" on the first contributor. Under "Affiliations", type
   "Second Institute u41h13j", choose that typed text in the list (the
   entry without the ROR mark), press "Add", then "Save".
5. OMP and OPS only (OJS's three contributors are enough): press "Add
   Contributor", choose "Person", type the given name "Lea", the family
   name "u41h13j", the email `lea.u41h13j@mailinator.com`, choose the
   country "Canada", tick "Author", press "Save". On OPS add a second
   one the same way ("Max", `max.u41h13j@mailinator.com`), so both items
   have four contributors.
6. Open the item's page (the header's "View", or the address above).
7. Back on "Contributors", press "Edit" on the first contributor and
   read "Affiliations".

**Expected**: the page lists the first contributor's affiliations in
the order "Edit" does: "University of Cape Town, Second Institute
u41h13j" (OMP "University of Alberta, …", OPS "Indiana University,
…").

**Observed**: the page reads

```
Alan Mwandenga
Second Institute u41h13j , University of Cape Town
```

(OMP "Second Institute u41h13j , University of Alberta", OPS "Second
Institute u41h13j , Indiana University"; the space before the comma is
[a separate fault](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A27-affiliations-space-before-comma.md)).
A reload reads the same. The page's `citation_author_institution` tags
and that contributor's `affiliations` in the publication the workflow
page loads (`GET /api/v1/submissions/<id>/publications/<publicationId>`)
are in the same reversed order. "Edit" at step 7 lists "University of
Cape Town" first.

## Cause

`PKP\affiliation\Collector::getQueryBuilder()` (lib/pkp
`classes/affiliation/Collector.php`) names no order, so a contributor's
affiliations come in whatever order the database's plan returns the
rows. The loads of the other lists whose order a person sets are
ordered: `PKP\author\Collector` sorts contributors by `seq` and
`author_id`, and the submission DAO's batched load of funders
(`PKP\submission\DAO::fromRow()`) calls `Funder::scopeOrderBySeq()`
(`seq`, then `funder_id`).

Two commits of `pkp/pkp-lib#13003` (reader performance) made that gap
visible:

- 5f62747939 made `PKP\author\DAO::fromRow()` load the affiliations of
  all of a publication's contributors in one query
  (`Repo::affiliation()->getByAuthorIds($ids)`, a
  `whereIn('a.author_id', …)`) and group them by contributor in PHP,
  keeping the rows' order.
- a91a65ee20 joined `authors`, `publications` and `submissions` into
  that query, to read the submission's language without loading the
  contributor again.

On PostgreSQL the planner picks the join plan from the number of
contributor ids in the list. Each hash join hands back the rows of its
hashed side that have the same `author_id` in the reverse of the order
it read them, so an odd number of hash joins reverses a contributor's
affiliations and an even number cancels out. On the OJS test install
(tables not ANALYZEd):

```sql
EXPLAIN (COSTS OFF)
SELECT a.*, s.locale AS submission_locale
FROM author_affiliations AS a
JOIN authors AS au ON a.author_id = au.author_id
JOIN publications AS p ON au.publication_id = p.publication_id
JOIN submissions AS s ON p.submission_id = s.submission_id
WHERE a.author_id IN (1, 2, 4);   -- then IN (1, 2)
```

```
IN (1, 2, 4): three hash joins, order reversed
Hash Join (s.submission_id = p.submission_id)
  -> Hash -> Hash Join (p.publication_id = au.publication_id)
       -> Hash -> Hash Join (au.author_id = a.author_id)
            -> Hash -> Seq Scan on author_affiliations a

IN (1, 2): two hash joins and a nested loop, order kept
Hash Join (s.submission_id = p.submission_id)
  -> Hash -> Nested Loop
       -> Hash Join (au.author_id = a.author_id)
            -> Hash -> Seq Scan on author_affiliations a
       -> Index Scan using publications_pkey on publications p
```

With `ORDER BY a.author_affiliation_id` both return the rows as
stored. The plan stays the same from load to load; a change in the
contributor count or in the tables' statistics can change it. "Edit"
loads one contributor (`GET …/contributors/{id}`), a list of one id,
which keeps the stored order.

Reach:

- The item page's affiliation line, which loops
  `$author->getAffiliations()` in the page template (walked), and the
  "Author Biographies" label, which prints
  `getLocalizedAffiliationNamesAsString(null, ', ')` (code).
- The Google Scholar tags (`citation_author_institution`) and the REST
  API's publication (walked).
- By the code, the exports that read `$publication->getData('authors')`
  and loop `getAffiliations()`: the Crossref and DataCite deposits, the
  JATS template (also what OAI-PMH serves as JATS), PubMed, ONIX,
  native XML and the MARC and MARCXML OAI formats; DOAJ joins the names
  through `getLocalizedAffiliationNamesAsString()`. OAI-PMH's Dublin
  Core carries no affiliations.
- "Create New Version" copies the contributors from the publication's
  loaded list (`PKP\publication\Repository::version()`), and
  `PKP\author\DAO::insert()` stores their affiliations in the order it
  meets them, so by the code a new version made from a reversed list
  stores them reversed, and its own "Edit" lists them that way (not
  walked).
- The rows "Edit" stores are in the order added: the form appends a new
  affiliation, and `Repository::saveAffiliations()` updates the
  existing rows and inserts the new one, so its id is the highest.

## Proposed fix

Order the collector's query by the affiliation's id, which is the
order the affiliations were added in.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-print-out-of-order/fix.diff):

```diff
--- a/lib/pkp/classes/affiliation/Collector.php
+++ b/lib/pkp/classes/affiliation/Collector.php
@@ -114,6 +114,9 @@
             $qb->whereIn('a.author_id', $this->authorIds);
         }
 
+        // Affiliations are listed in the order they were added
+        $qb->orderBy('a.author_affiliation_id');
+
         // Add app-specific query statements
         Hook::call('Affiliation::Collector', [&$qb, $this]);
```

The collector is the one reader of `author_affiliations` lists, so
the page, the tags, the API, the exports and a new version's copy all
follow. It keeps both purposes of `#13003`: one query per publication,
and the submission's language from the join.

Tried on OJS, OMP and OPS `main`: after the Steps each page, its tags
and the workflow's load of the publication listed the first
contributor's affiliations in the order added. Pages whose contributors
have one affiliation each read the same with the fix in and out, each
contributor with their own institution and in the contributors' order.

**Alternatives**:

- Sort in `PKP\author\DAO::fromRow()` after grouping. That covers the
  batched load only, and leaves every other caller of the collector on
  the plan's order.
- Drop the joins of a91a65ee20. That brings back the per-contributor
  language lookups the change removed, and still names no order.
- A `seq` column and a control to order affiliations. A product
  decision and a schema change; the id order is what the form shows
  today.

**What goes with it**:

- The CRediT roles are loaded the same way, in the same
  `PKP\author\DAO::fromRow()`:
  `creditContributorRole\Repository::getCreditRolesGroupedByContributorIds()`
  is a `whereIn` with a join and no order, so a contributor's CRediT
  roles may print reversed too (code, not walked; not in this diff). I
  recommend ordering that query in the same PR, after a check that it
  shows; the team decides.
- No data repair: no release carries the batched query. Only installs
  that run `main` can hold a new version made since 2026-08-27 with
  reversed rows (by the code).
- Backport: none needed (3.5 is not affected).
- Guard: a unit test of `getByAuthorIds()` over several contributors,
  each with two affiliations, or a check that a page with four
  contributors lists a contributor's affiliations as "Edit" does.

Small: one line in the shared collector, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-print-out-of-order/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps (on OJS it also
  added one contributor at step 5) and reads, beside them, the
  publication the workflow page loads, the page's
  `citation_author_institution` tags and the stored rows
  (`author_affiliations` by id). Its `nb` mode (the neighbour check)
  reads the same three pages, unchanged, against the stored rows. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliations-print-out-of-order/walk.js [steps|nb]`.
- Walked on `main`, OJS, OMP and OPS, on PostgreSQL 18.6, with
  pkp/datasets 384e28b (2026-10-12). MySQL not tried.
- 3.5: the Steps walked on OMP and OPS `stable-3_5_0` (the published
  version is editable there too, under the same warning) kept the order
  added. OJS is read in the code, because 3.5's side menu has no
  version entries for step 3: 3.5's lib/pkp (OJS f4f8fcdbc0, OMP and
  OPS 8094f06bf5, the same `Collector`) reads `author_affiliations`
  alone, one contributor at a time (`PKP\author\DAO::fromRow()` calls
  `getByAuthorId()`), with no join and no order, which returns the
  table's stored order.
- Tips: `main` OJS 7c6fba2064, OMP eb93813147, OPS 1bc3f78888 (lib/pkp
  f4c2578c94 in all three); `stable-3_5_0` OJS 5fc74d6213, OMP
  486cbf9eb0, OPS 399c4ebca3.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 55c8e406b3 and
  `stable-3_3_0` 5e84acd11b have no `classes/affiliation/`, and their
  `schemas/author.json` holds one multilingual `affiliation` string.
- Introduced: `git blame` on `getQueryBuilder()` gives d7c67a46fe
  (`pkp/pkp-lib#7135`, 2025) for the query without an order, and the
  two `#13003` commits for the `whereIn` and the joins; both are on
  `main`'s first-parent line.
- Upstream: `pkp/pkp-lib#13003` (open) is the performance work, and
  names no ordering of affiliations.
- Not driven: an affiliation picked from the registry, "Create New
  Version", the exports and the CRediT roles (code only, as above).
