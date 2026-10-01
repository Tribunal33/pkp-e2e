# Searching the DOIs page by a DOI misses some DOIs on each app, and fails on a preprint server

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no search by DOI)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/ojs#4563`, `pkp/omp#1790` and `pkp/ops#830` (with `pkp/pkp-lib#10724`) for `pkp/pkp-lib#10178` · [75a588738e](https://github.com/pkp/ojs/commit/75a588738e93f383bc6ba23f657631898d3a9641), [7bba9c555e](https://github.com/pkp/omp/commit/7bba9c555ec228100ced41d931c54f12956efcd0), [0524b00d58](https://github.com/pkp/ops/commit/0524b00d58eab7ea82659acfc5f06b84e1e665a4) · 2024-12-24 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager types a DOI, or its start, into the search box of the DOIs page
and presses Enter, expecting the items that carry it. What the search finds
depends on the app and on the kinds ticked under "Items with DOIs"
(Settings › Distribution › "DOIs"). Each app starts with only the works'
own kind ticked:

- A journal ("Articles") finds an article by its DOI. Once "Article
  galleys" is ticked, a galley's DOI is never found.
- A press ("Monographs") finds nothing for any DOI. The book's own DOI is
  the one kind it never finds. Once chapters, formats or files are ticked,
  their DOIs are found.
- A preprint server ("Preprints") fails on the server at every DOI search.
  An "Error" window opens and the list stays unfiltered. Once "Preprint
  galleys" is ticked, the error stops, but no DOI is ever found.

Where the search misses, the list reads "No items found.", so the manager
is led to believe that no item carries the DOI. The editorial dashboard's
"Search submissions" gives the same results, the error included.

## Impact

- **Lost.** Nothing is stored wrong; the lookup fails, and nothing says
  why.
- **Who.** Managers and editors who look an item up by its DOI, for
  example from a reader's report or a registration agency's message, on
  the DOIs page and on the editorial dashboard's "Search submissions": on
  every press and preprint server that uses DOIs, at every DOI search; on
  a journal, only for galley DOIs once those are ticked.
- **Way round.** Search by the title or an author's name, or scroll the
  list and expand the rows.

Medium: there is a way round on screen and nothing is lost. It would be
high if managers relied on an empty result to decide that a DOI is still
unused.

## Steps to reproduce

Preconditions: PKP's default test dataset, `main`. It has DOIs on, only
the works' own kind ticked under "Items with DOIs" ("Articles",
"Monographs", "Preprints"), no DOI prefix, and no DOI assigned.

The steps use two of the dataset's items per app, A and B, and a second
kind of DOI:

| | A | B | Second kind |
|---|---|---|---|
| OJS | 5, "Genetic transformation of forest trees" | 17, "Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran" | "Article galleys, such as a published PDF" |
| OMP | 5, "Bomb Canada and Other Unkind Remarks in the American Media" | 14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots" | "Publication Formats" |
| OPS | 5, "Investigating the Shared Background Required for Argument: A Critique of Fogelin's Thesis on Deep Disagreement" | 2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence" | "Preprint galleys, such as a published PDF" |

1. Sign in as `dbarnes`.
2. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save".
3. Side menu "DOIs": tick A, then "Bulk Actions" › "Assign DOIs", and
   confirm with "Assign DOIs".
4. Press the arrow button at the right end of A's row and note A's DOI
   (for example `10.1234/1s1dhb11`; the suffix is generated).
5. Type A's DOI whole into the list's "Search" box and press Enter.
6. Side menu "Editor Dashboard": type A's DOI whole into "Search
   submissions" and press Enter.
7. "Setup": tick the second kind, "Save".
8. "DOIs": tick B, then "Bulk Actions" › "Assign DOIs" › "Assign DOIs".
9. Press the arrow button at the right end of B's row and note the DOI of
   its "PDF" galley (OJS, OPS) or of its "Format / PDF" (OMP).
10. "Search": that DOI whole, Enter.
11. "Search": `10.1234/`, Enter.

**Expected.** Steps 5 and 6 list A alone ("Search Results (1)" on the
dashboard), step 10 lists B alone, and step 11 lists A and B, on all three
apps.

**Observed.**

| Step | OJS | OMP | OPS |
|---|---|---|---|
| 5, DOIs page, A's own DOI | A | "No items found." | "Error" window; the list stays unfiltered (all 19 preprints) |
| 6, dashboard, A's own DOI | "Search Results (1)", A | "Search Results (0)" | "Error" window; "Search Results (0)" |
| 10, B's galley or format DOI | "No items found." | B | "No items found." |
| 11, `10.1234/` | A and B | B only | "No items found." |

On OPS, the list requests of steps 5 and 6 answer 500, and the server log
reads:

```
PDOException(code: 42601): SQLSTATE[42601]: Syntax error: 7 ERROR:  SELECT * with no tables specified is not valid
```

As a control, a title word ("Antimicrobial", "Bricks", "Facets") finds B
on all three apps.

## Cause

A phrase that starts with digits and a dot is read as a DOI
(`Doi::beginsWithDoiPrefixPattern()`, called from lib/pkp
`classes/submission/Collector.php` `getQueryBuilder()`, line 481). The
collector then calls each app's `addFilterByAssociatedDoiIdsToQuery()`
(line 792), which limits the result to the submissions with a DOI of a
ticked kind that starts with the phrase. The method is meant to build one
sub-query: a base query that matches nothing,
`selectRaw('NULL AS submission_id')->whereRaw('1 = 0')`, so that the
result is empty when no kind is ticked, plus one `union` per ticked kind.

The first kind written in the method is not added as a union. Its
`when()` builds on the base query itself
(`$q->select('p.submission_id')->from(…)`). `select()` replaces the
base's columns but keeps its `where 1 = 0`, so while that kind is ticked
its DOIs can never match. While it is unticked, the base stays alone and
the unions after it work. Which kind is written first differs per app:

- OJS `classes/submission/Collector.php` lines 299–306: the galleys. A
  journal in its starting setup ("Articles" only) is therefore not
  affected. Articles, peer reviews and author responses (lines 307–333)
  are unions and are found.
- OMP `classes/submission/Collector.php` lines 239–246: "Monographs",
  which is ticked from the start, so the book's own DOI is never found.
  Chapters, formats and files are unions and are found.
- OPS `classes/submission/Collector.php` lines 146–160: the galleys, as on
  OJS. But the base statement (line 149, with its comment at 146–148) is
  on the outer submissions query instead of the sub-query. Its `1 = 0`
  empties every DOI search, and its `NULL AS submission_id` is added to
  the outer columns. With "Preprint galleys" unticked (the starting
  setup), the sub-query has no select or table of its own, only the
  "Preprints" union. It compiles to
  `(select *) union (select … from publications …)`, which PostgreSQL
  refuses, so the request fails with a 500.

Reach:

- The DOIs page's search: walked on all three apps. Its list is
  `GET /api/v1/submissions` (OJS `pages/dois/DoisHandler.php` line 50),
  so the REST API's `searchPhrase` was walked with it.
- The editorial dashboard's "Search submissions"
  (`PKPBackendSubmissionsController`, the same collector): walked in the
  starting setup, as in step 6.
- The search on Statistics › Articles / Monographs / Preprints
  (`PKPStatsPublicationController::_processSearchPhrase()`): the same
  collector, code read, not walked.
- The OJS "Issues" tab searches through `APP\issue\Collector`, which has
  no union and is not affected (code).

## Proposed fix

In each app's `addFilterByAssociatedDoiIdsToQuery()`, add every ticked
kind as its own `union` on top of the base query, which then stays alone
as the always-empty first `select`. That is the pattern the methods
already use for every kind after the first. OJS:

```diff
             $query->selectRaw('NULL AS submission_id')->whereRaw('1 = 0');
             $query->when($context->isDoiTypeEnabled(Repo::doi()::TYPE_REPRESENTATION), function (Builder $q) {
-                $q->select('p.submission_id')
-                    ->from('publication_galleys AS g')
-                    ->join('dois AS d', 'g.doi_id', '=', 'd.doi_id')
-                    ->join('publications AS p', 'g.publication_id', '=', 'p.publication_id')
-                    ->whereLike('d.doi', "{$this->searchPhrase}%");
+                $q->union(function (Builder $q) {
+                    $q->select('p.submission_id')
+                        ->from('publication_galleys AS g')
+                        ->join('dois AS d', 'g.doi_id', '=', 'd.doi_id')
+                        ->join('publications AS p', 'g.publication_id', '=', 'p.publication_id')
+                        ->whereLike('d.doi', "{$this->searchPhrase}%");
+                });
             })
```

OMP makes the same change to its "Monographs" branch. OPS also moves its
base statement, with its comment, from the outer query to the top of the
sub-query, and wraps its galleys branch the same way. In all three, the
diffs replace the base query's comment ("Does two things: …") with one
that says why every kind must be a union. The full diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-search-finds-different-sets/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-search-finds-different-sets/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-search-finds-different-sets/fix-ops.diff).

Tried on `main` (PostgreSQL): with the fix in, the Steps showed the
Expected on all three apps, the dashboard search included. The control
searches whose results the fix must leave alone gave the same answers with
the fix in and out: a title word still found B, `10.9999/` found nothing,
and B's galley or format DOI found nothing once its kind was unticked
again.

**Alternatives:**

- Move the method into lib/pkp, with each app giving only its kinds'
  tables. That removes the three copies that went wrong in three ways, but
  it is a refactor of a protected hook that plugins may override. Worth
  it later, not needed for this fix.
- An `orWhereIn('s.submission_id', …)` per kind inside one `where()`, the
  shape the keyword search in the same collector uses. It works equally
  well, but it is a larger rewrite of the three methods than the union
  fix.

**What goes with it:**

- Nothing is stored, so no data repair is needed, and the REST API's
  parameters do not change.
- MySQL and MariaDB not checked. After the fix, every DOI search starts
  with `select NULL AS submission_id where 1 = 0`: a `where` with no
  table. Whether MySQL and MariaDB accept that was not checked. The
  unfixed code already sends the same shape (the base query and one
  union) on every journal in its starting setup. If it is not portable,
  the base query can read from a table (`->from('submissions')` before
  the `whereRaw`) with no other change; that form was not tried.
- Guard: no app has a test of the submission collector. The method reads
  the context from the request (`Application::get()->getRequest()->getContext()`),
  not from the collector's context IDs, and `PKPRequest::getContext()`
  asks the request's router. So a test takes `PKPTestCase::mockRequest()`,
  sets on it a Mockery partial of its router whose `getContext()` returns
  a context mock answering `isDoiTypeEnabled()` for the kinds under test
  (`lib/pkp/tests/jobs/doi/DepositSubmissionTest.php` builds such a
  context mock), and runs the collector on the test database. It checks a
  DOI of each kind with that kind ticked, with no kind ticked, and with the
  first-written kind ticked alone.
- Backport: the three diffs apply to `stable-3_5_0` as they are, with line
  offsets only.

Medium: three repos, each with its own change and its own test.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-search-finds-different-sets/walk.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/doi-search-finds-different-sets/walk.js`.
  `NEIGHBOUR=1` adds the title-word, other-prefix and unticked-kind checks
  and the dashboard search (step 6), which it takes after step 11, once
  the second kind is unticked again, so with the same "Items with DOIs" as
  step 5; `PKP_E2E_LINE=stable-3_5_0` in front runs it
  on 3.5. Besides the screen, it reads each list request's answer
  (`itemsMax` and the item ids) and the stored `dois` rows (read only).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply …/fix-<app>.diff <app>` for each app, walk.js
  with `NEIGHBOUR=1` on all three, then `node bin/try-fix.js revert` for
  each. walk.js with `NEIGHBOUR=1` ran without the fix too.
- Walked 2026-10-01 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, with no
  upgrade needed:
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp 2e377d27fc), OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    (lib/pkp 3dc90c81a6): as Observed.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    lib/pkp a9c76aed62: steps 1–5 and 7–11 as Observed on main, the OPS 500
    included. The code is the same: OJS lines 140–147, OMP 198–205, OPS
    113–124.
- Code reads, not walked:
  - 3.4: `upstream/stable-3_4_0` of OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece)
    and OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    lib/pkp `origin/stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
    The DOIs page exists, but the submission collector has no
    `addFilterByAssociatedDoiIdsToQuery()`, and `Doi` has no
    `beginsWithDoiPrefixPattern()`. A search phrase goes to the keyword
    search over titles, abstracts and names, and none of the `#10178`
    commits are on the branch.
  - 3.3: `upstream/stable-3_3_0` of OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2)
    and OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    lib/pkp [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
    DOIs come from the DOI pubIds plugin
    (`plugins/pubIds/doi`); there is no DOIs page and no submission
    collector.
- Introduced: `git blame` on each app's method lands on the commits in the
  header, each of which added the whole method. They are the app halves of
  `pkp/pkp-lib#10178`, merged 2025-01-06 with `pkp/pkp-lib#10724` (lib/pkp
  [c4ee9c75b2](https://github.com/pkp/pkp-lib/commit/c4ee9c75b2317a34d32b8e56f9a5eb4e2d761377),
  which added `beginsWithDoiPrefixPattern()` and the hook). OJS
  [30e82d3876](https://github.com/pkp/ojs/commit/30e82d3876ae9d2fe6625f0334ca961a21e4cca4) (`pkp/pkp-lib#11332`,
  peer-review DOIs) later added unions after the galleys branch, without
  changing it.
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs, open and closed: "search DOI", "DOI
  search manager", "DOI search no items", `addFilterByAssociatedDoiIdsToQuery`.
  Only the feature itself (`pkp/pkp-lib#10178`, closed, and its four PRs)
  came up, and its discussion reports no fault.
- Not checked: MySQL and MariaDB (see Proposed fix, "What goes with it").
  On MySQL the OPS sub-query `(select *) union …` would be expected to
  fail too, but this is unverified.
- Unverified: the Statistics search was read in the code only; the
  dashboard search on 3.5 and with the second kind ticked was not walked.
