# Affiliations and funders picked from the ROR search are saved without a name when the server cannot reach ROR

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (affiliations; 3.5 has no funders)
  - 3.4: none (code; no ROR search)
  - 3.3: none (code; no ROR search)
- **Introduced** `pkp/pkp-lib#13019` for `pkp/pkp-lib#13018` · [cde76e6bd8](https://github.com/pkp/pkp-lib/commit/cde76e6bd8c367f1661f080bfa945d6164af0a5b) · 2026-07-09 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a5), spec U43 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

An editor or author picks an organisation from the ROR search, as a
contributor's affiliation or as a funder. If the journal's own server
cannot reach ROR, pressing "Add" (or picking the funder) shows "An
unexpected error has occurred. Please reload the page and try again."
The entry is added anyway and "Save" succeeds, but it is stored with a
ROR ID and no name.

The contributor form then flags the row in red ("The primary language
English is required") and offers no box for a name. The Funders list and
the published page show a bare ROR logo where the institution or funder
name should be.

The name is read from the install's local copy of the ROR registry,
which the install downloads once and then refreshes monthly. On a server
without outside internet access that copy is empty, so every pick ends
like this. On a connected server it happens only for an organisation
missing from the copy, and only while ROR cannot be reached or answers
"too many requests".

## Impact

- **Lost:** the name is missing, not destroyed: it reappears on every
  screen once the local copy gains the organisation (read in the code).
  On a server that never reaches ROR, that never happens. A Crossref
  deposit made while the name is missing leaves the affiliation out,
  ROR ID included, and stays so until the DOI is deposited again (read
  in the code).
- **Who:** editors and authors adding a ROR affiliation or funder, in
  the workflow or the submission wizard, when the server cannot fetch
  that organisation from ROR and its local copy lacks it.
- **Way round:** remove the entry and choose the typed-name option
  instead, which has no ROR link.

Medium: published pages show a nameless institution or funder, but there
is a way round on screen, and on a connected server the name comes back
by itself. Servers without internet access keep it missing for good.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- The server cannot reach `api.ror.org`, but the browser can. In
  `config.inc.php`, section `[proxy]`, set
  `http_proxy = "http://127.0.0.1:9"` and
  `https_proxy = "http://127.0.0.1:9"` (a port nothing listens on).
- The two organisations the steps pick are missing from the install's
  ROR cache. The default dataset's cache holds the whole registry,
  because the dataset was built on a connected server. Remove these two,
  as a server that could not download the registry would lack them:

  ```sql
  -- Simon Fraser University; Social Sciences and Humanities Research Council.
  -- Their ror_settings rows are deleted with them (ON DELETE CASCADE).
  DELETE FROM rors WHERE ror IN ('https://ror.org/0213rcc28', 'https://ror.org/04j5jqy92');
  ```

The steps use OJS submission 17, "Antimicrobial, heavy metal resistance
and plasmid profile of coliforms isolated from nosocomial infections in
a hospital in Isfahan, Iran", and its contributor Vajiheh Karbasizaed.
OMP uses submission 14, "From Bricks to Brains: The Embodied Cognitive
Science of LEGO Robots" (Michael Dawson). OPS uses submission 2, "The
Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct
Equivalence" (Catherine Kwantes). All three are published and have one
version.

1. Sign in as `dbarnes`.
2. Open submission 17's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
3. Press "Create New Version", choose "Minor Revision" under "Revision
   Significance" and press "Confirm". [3.5: press "Create New Version"
   in the publication page's header, then "Yes".]
4. Under the new version, open "Contributors" and press "Edit" on
   Vajiheh Karbasizaed.
5. Under "Affiliations", type `Simon Fraser University` into the search
   box. Choose the suggestion "Simon Fraser University Canada" that
   carries the ROR logo, not the first option, which is the typed text.
6. Press "Add".
7. Press "OK" on the window that opens, then press "Save".
8. Press "Edit" on Vajiheh Karbasizaed again and read the
   "Affiliations" table. Press "Close".
9. Open "Funding" and press "Add Funder". Type `Social Sciences and
   Humanities Research Council` and choose the suggestion "Social
   Sciences and Humanities Research Council Canada" that carries the ROR
   logo (`https://ror.org/04j5jqy92`). "Social Science Research Council"
   is a different organisation, still in the cache. [3.5: there is no
   "Funding" page; skip steps 9 and 10.]
10. Press "OK" on the window that opens, then press "Save" and read the
    "Funders" table.
11. Press "Publish". In "Review Publishing Details" press "Confirm",
    then "Publish" in the confirmation. [OMP: "Publish", then
    "Publish". OPS: "Post", then "Post". 3.5 asks in one window,
    "Schedule For Publication" (OPS: "Post the preprint").]
12. Open the article page
    (`/index.php/publicknowledge/en/article/view/17`; OMP:
    `/catalog/book/14`; OPS: `/preprint/view/2`).

**Expected:** no entry is saved without a name. Either the affiliation
and the funder keep "Simon Fraser University" and "Social Sciences and
Humanities Research Council" on every screen and on the article page, or
the user is told plainly that the organisation cannot be taken from ROR
right now.

**Observed:** step 6 opens a window:

```
Error
An unexpected error has occurred. Please reload the page and try again.
```

The request behind it answers:

```
POST /index.php/publicknowledge/api/v1/rors/
404 {"ror":["The ror you requested was not found."]}
```

The row "Simon Fraser University https://ror.org/0213rcc28" is added
anyway, and "Save" answers 200. The saved contributor returns the
affiliation as `{"ror":"https://ror.org/0213rcc28","name":{"en":"","fr_CA":""}}`.
In step 8 the row reads "The primary language English is required" in
red, followed only by the ROR link. Step 9 opens the same "Error" window
after the same 404. The funder saves (200, `"name":[]`), and its row in
the "Funders" table is a ROR logo with no text. On the article page the
author line reads "University of Tehran ," followed by a ROR logo that
links to `https://ror.org/0213rcc28` and has no text. Under "Funders"
the one entry is a ROR logo with no text. The server logs no error.

A control: the same picks of organisations the cache holds (University
of Ljubljana, Natural Sciences and Engineering Research Council of
Canada) save with their names, with the server still offline.

## Cause

A ROR-backed affiliation or funder gets its name from the install's ROR
cache (the `rors` and `ror_settings` tables), not from its own row. When
an affiliation is saved, `Affiliation\Repository::saveAffiliations()`
(`classes/affiliation/Repository.php`, line 244) drops the name the
form sends whenever a ROR ID is set:

```php
if ($affiliation->getRor() !== null) {
    $affiliation->setName(null);
}
```

`PKPFunderController::add()` and `edit()` do the same for funders
(`api/v1/funders/PKPFunderController.php`, lines 175 and 228:
`'name' => $ror ? [] : (…)`). The name the form sends for a pick is the
ROR record's display name, which `FieldAffiliations.vue`
(`handleAddToNewAffiliationForm()`) and `FieldFunder.vue` fill into the
form's primary language only. On display, the name is looked up in the
cache: the affiliation DAO attaches the cached record
(`affiliation\DAO::fromRow()`), and `Affiliation::getAffiliationName()`
and `getLocalizedName()` read the name from it. A funder's name comes
from `Funder::name()`, which maps the cached record's names. With no
cached record, both come back empty.

Before cde76e6bd8, the cache always held a picked organisation. On
"Add" (and on a funder pick), the browser posts the ROR record it got
from the search to `POST /api/v1/rors`, and `PKPRorController::addOrEdit()`
stored that record. cde76e6bd8 (`pkp/pkp-lib#13018`) stopped trusting
the posted record, so that no caller can write made-up names into the
shared cache. `addOrEdit()` now fetches the record from
`https://api.ror.org/v2/organizations/{id}` itself and answers 404 when
that fetch fails (lines 226–244). Two later commits for the same issue,
56581e0d67 and 20433e7edb, added 429 answers: 20 lookups a minute per
user, 40 per five minutes per install, and ror.org's own 429 passed
through (`rorApiRateLimitedResponse()`). The save code was not changed
with any of them, so a ROR ID is still saved whether or not the server
could fetch its record.

`FieldAffiliations.vue` and `FieldFunder.vue` send the cache request as
a side effect. `useFetch` shows the generic network error for its 404 or
429, while the row is already in the form and the save goes ahead.

Reach:

- The workflow's "Contributors": walked, all three apps, `main` and
  3.5. The submission wizard's "Contributors" step uses the same
  `ContributorForm` (code).
- The workflow's "Funding" page: walked, all three apps, `main`. The
  wizard's funders section uses the same `FunderEditForm` and API
  (code).
- The published article, book and preprint pages: walked.
- The Crossref deposit (OJS, OPS): `appendAffiliationsNode()` skips an
  affiliation whose name is empty, so its ROR ID is left out too. The
  funder assertion keeps the ROR ID (code).
- The REST API: a client that posts a ROR ID the cache lacks gets the
  same nameless row (code).
- Native XML import: an `<affiliation>` is linked to a ROR ID only when
  the cache holds a record with that name, and is otherwise saved as a
  typed name (`NativeXmlPKPAuthorFilter`, line 141). A `<rorAffiliation>`
  brings a ROR ID with no name, so it is nameless when the cache lacks
  it (code).

## Proposed fix

Save a ROR ID only once the server holds its record. When it does not,
keep the pick as a typed name without the ROR ID, and tell the user so
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/registry-pick-saves-nameless/fix.diff)):

- `Affiliation\Repository::saveAffiliations()`: when the cache holds the
  ROR record, drop the name as now. When it does not and a name was
  sent, drop the ROR ID and keep the name. When no name was sent, leave
  the row as it is (the `<rorAffiliation>` import).
- `PKPFunderController::add()` and `edit()`: the same rule, in one
  helper, `getRorAndName()`.
- `FieldAffiliations.vue` and `FieldFunder.vue`: when the cache request
  fails, turn the new row into a typed-name row, as the server will save
  it, and say so in place of the generic error. The new string,
  `user.affiliations.error.rorNotFetched` in `locale/en/user.po`: "The
  details of this organization could not be fetched from ROR, so it has
  been added by its name only, without a ROR ID. To link it to ROR,
  remove it and choose it again later."

```diff
             if ($affiliation->getRor() !== null) {
-                $affiliation->setName(null);
+                if (Repo::ror()->getByRor($affiliation->getRor()) !== null) {
+                    $affiliation->setName(null);
+                } elseif (!empty(array_filter((array) $affiliation->getName()))) {
+                    $affiliation->setRor(null);
+                }
             }
```

This keeps the rule of cde76e6bd8: a name shown beside a ROR link comes
only from `api.ror.org`, never from a client. A pick the server cannot
check becomes what the user could have typed, a name with no ROR link.
The native importer already decides this way for `<affiliation>`: it
links a ROR ID only when the cache holds the organisation, and keeps a
typed name otherwise. The kept name is the ROR display name in the
primary language only, the same as a typed name.

Tried on `main` in all three apps. In the walk, "Add" and the funder
pick showed "ROR API Error" with the new message. "Simon Fraser
University" and "Social Sciences and Humanities Research Council" were
stored as typed names without a ROR ID, listed on reopening and printed
on the article page with no ROR link. As a neighbour check, picks of
organisations the cache holds (University of Ljubljana, Natural Sciences
and Engineering Research Council of Canada) behaved the same with the
fix in and out: saved with their ROR IDs and shown with the registry's
names. The server half alone (an API client posting an uncached ROR ID)
was read in the code, not driven: the screens convert the row first.

**Alternatives:**

- Refuse the pick, with a clear message, when the server cannot fetch
  the record. Dropped: on a server without internet access no ROR pick
  could ever be added, the user would have to retype the name, and the
  API would need a new refusal for posted ROR IDs the cache lacks,
  which existing nameless rows would then fail on every re-save.
- Store the user's name beside the ROR ID, as a fallback while the
  cache lacks the record. Dropped: any client could show a name of its
  choosing beside a real ROR link and deposit it to Crossref, which is
  what `pkp/pkp-lib#13018` closed.
- Store the ROR ID marked as unverified. This needs a new column and
  display and export rules for it.
- Store the posted record in the cache again. This reopens
  `pkp/pkp-lib#13018`.

**What goes with it:**

- Unit tests: `saveAffiliations()` with an uncached ROR ID and a name
  keeps the name and drops the ROR ID; with a cached one it drops the
  name; with no name it keeps the ROR ID. The same for the funder API.
- No data repair is possible: affected rows store no name. They show
  the name once the cache gains the organisation.
- 3.5 backport: the affiliation, locale and `FieldAffiliations.vue`
  hunks apply there (the same lines on `stable-3_5_0`).
- Left out: a `<rorAffiliation>` import of an organisation the cache
  lacks carries no name to keep.

Medium: two pkp-lib classes and a locale string, two ui-library
components, in two repos, with unit tests.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/registry-pick-saves-nameless/walk.js)
  (helpers in `lib.js` beside it). It runs on an install freshly loaded
  with the default dataset whose `[proxy]` points at a dead port, and
  its first part takes the two organisations out of the cache.
  `MODE=neighbour` runs the neighbour check on the unchanged dataset
  (OJS submission 7, OMP 1, OPS 1) and reads the stored rows from the
  database.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) on
  PostgreSQL, with pkp/datasets 566bb1f (2026-10-03). The fault does
  not depend on the database. The browser's ROR search reached
  `api.ror.org` itself.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335),
  lib/ui-library d4e01883.
- 3.5 code: `addOrEdit()` has the same server-side fetch (backport
  3d831ba3cc, PR `pkp/pkp-lib#13020`, merged 2026-07-11),
  `saveAffiliations()` the same name drop, and `FieldAffiliations.vue`
  the same request. There are no funders (no `api/v1/funders`). No
  release has it yet: OJS 3.5.0-5 (2026-06-30) ships pkp-lib 8b5f0fdc8d,
  six commits behind 3d831ba3cc.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402 (apps: OJS d68934d0d1 / ac77c9fb35, OMP
  0aec65441 / 8e72fc883, OPS acd8ae704b / c5532e2161). Neither has
  `api/v1/rors`, a `rors` table or `classes/affiliation`. An
  affiliation is a plain multilingual `affiliation` string in
  `schemas/author.json`, and there are no core funders.
- Introduced: `git blame` on `addOrEdit()`'s fetch gives cde76e6bd8
  (PR `pkp/pkp-lib#13019`, merged 2026-07-10). Its diff replaces the
  upsert of the posted record with the fetch from `api.ror.org`. The
  name drop it exposed is older: `saveAffiliations()` since d7c67a46fe
  (`pkp/pkp-lib#7135`, 2025-01-31) and the funder API since d50c812aaf
  (`pkp/pkp-lib#12392`, 2026-07-06). Both were harmless while every
  pick cached the posted record.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library were searched by
  symptom words (ROR affiliation or funder name empty or missing, ROR
  offline or unreachable, "unexpected error" on an affiliation) and by
  `PKPRorController`, `saveAffiliations` and `getAffiliationName`.
- Read in the code, not walked: the 429 routes; an empty cache after an
  install that cannot download the registry (`install.xml` runs
  `Installer::updateRorRegistryDataset()`, which ignores the task's
  failure).
