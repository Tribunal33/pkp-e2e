# Works get unfinished DOIs ("10.1234/", "10.1234/jpkjpk.%p") under "None", or a custom pattern whose value a work lacks

- **Severity** high
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; an empty or unfilled suffix was refused)
- **Introduced** `pkp/pkp-lib#7014` · [75f5c71339](https://github.com/pkp/pkp-lib/commit/75f5c713391f663bef74c309242ff38d40e10c74) · 2022-02-15 · Erik Hanson (ewhanson)
- **Upstream** `pkp/pkp-lib#3317` reported the leftover symbol and was closed in 2021, when 3.3 refused such DOIs; the "None" half was never reported. `pkp/pkp-lib#12603` (open, an empty pattern box) is covered on OJS only
- **Tracked in** spec U45 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a2), [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager sets "DOI Format" to "None - Suffixes must be entered manually
on the DOI management page and will not be generated automatically".
Yet "Assign DOIs" on the DOIs page, and the automatic assignment chosen
under "Automatic DOI Assignment", still give each work the prefix and a
bare "/": every work gets the same "10.1234/". Under "Custom pattern", a
work that lacks a value the pattern names keeps the symbol in its DOI:
"%j.%p" on an article without page numbers gives "10.1234/jpkjpk.%p".

The DOIs page reports "Items successfully assigned new DOIs", and the
work's public page shows the DOI ("DOI: https://doi.org/10.1234/").

On a journal with "Peer Review" ticked, every publicly shown completed
review gets "10.1234/" under "Custom pattern" as well as under "None".

## Impact

- **Lost.** A correct public record. The work's page links a DOI that
  resolves nowhere or holds "%p" or "%x". The same DOI goes into the
  page's citation tags, "How to cite" and OAI-PMH. A "%" DOI would also
  be sent to Crossref, and both kinds to DataCite (code, not walked).
- **Who.** Readers who follow or cite the DOI, and indexers that harvest
  it. On the editorial side: managers of a journal, press or preprint
  server on "None", where every work is hit, or on "Custom pattern" with
  a symbol some works have no value for, where those works are hit.
- **Way round.** Type each DOI by hand over the wrong one. Under "None",
  "Never" under "Automatic DOI Assignment" stops new ones. Under "Custom
  pattern", fill the missing value, empty the work's DOI box and press
  "Save", then "Assign DOIs" again: Assign never replaces an existing
  DOI. Nothing on screen points to any of this.

High: once a work is published, its broken DOI reaches readers and
indexers with no message to the manager, in a setup that is not the
default. It would be critical if an agency registers the "%" DOIs, since
a registered DOI cannot be withdrawn. It would be medium if the wrong DOI
stayed on the site.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its `publicknowledge` journal (press, preprint server) has
  DOIs on for "Articles" ("Monographs", "Preprints"), "DOI Format"
  "Default", no "DOI Prefix", and no work has a DOI yet.
- No other setup; `dbarnes` can change the settings.

The works used, all from the dataset. No dataset work has a Publisher
ID, so only OJS shows a work whose value is filled:

| App | "None" | "Custom pattern" | Pattern (symbols) |
|---|---|---|---|
| OJS | 17 "Antimicrobial, heavy metal resistance and plasmid profile…" (published), 15 "Yam diseases and its management in Nigeria" | 1 "Signalling Theory Dividends" ("Pages" 71-98), 5 "Genetic transformation of forest trees" (no "Pages") | `%j.%p` (journal initials, page numbers) |
| OMP | 5 "Bomb Canada and Other Unkind Remarks in the American Media" (published), 4 "How Canadians Communicate…" | 14 "From Bricks to Brains…", 7 "Accessible Elements…" | `%p.%x` (press initials, Publisher ID) |
| OPS | 2 "The Facets Of Job Satisfaction…" (published), 5 "Investigating the Shared Background Required for Argument…" | 8 "Hansen & Pinto: Reason Reclaimed", 9 "Signalling Theory Dividends: A Review…" | `%j.%x` (server initials, Publisher ID) |

"None":
1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "DOIs" › "Setup".
3. Type "10.1234" in "DOI Prefix".
4. Choose "None - Suffixes must be entered manually on the DOI
   management page and will not be generated automatically" under "DOI
   Format", and press "Save".
5. Open "DOIs" in the side menu.
6. Tick the two "None" works, choose "Bulk Actions" › "Assign DOIs" and
   press "Assign DOIs" in the window.
7. Expand each of the two rows and read its DOI.
8. Open the published work's page (`/index.php/publicknowledge/article/view/17`,
   `…/catalog/book/5`, `…/preprint/view/2`) and read its "DOI" line.

"Custom pattern":
9. Back on Settings › Distribution › "DOIs" › "Setup", choose "Custom
   pattern - (not recommended)" under "DOI Format", type the pattern
   above in the "Submissions" box under "Custom DOI Suffix Pattern", and
   press "Save".
10. On "DOIs", tick the two "Custom pattern" works, choose "Bulk
    Actions" › "Assign DOIs" and press "Assign DOIs".
11. Expand each of the two rows and read its DOI.

**Expected:** under "None" no DOI is made, as the option says; "Assign
DOIs" says why nothing was assigned, and the work's page has no DOI
line. Under "Custom pattern" a work that lacks the value gets no DOI and
the manager is told; a work that has it gets its DOI.

**Observed:** step 6 shows "Items successfully assigned new DOIs". Both
rows read `10.1234/`, "Unregistered". The work's page reads:

```
DOI: https://doi.org/10.1234/
```

Step 10 shows "Items successfully assigned new DOIs" too. The works
without the value read `10.1234/jpkjpk.%p` (OJS 5), `10.1234/jpk.%x`
(OMP 7 and 14) and `10.1234/jpkpkp.%x` (OPS 8 and 9), all "Unregistered".
The "Assign DOIs" request answered `200 {"failedDoiActions":[]}` each
time.

OJS 1, which has "Pages", gets `10.1234/jpkjpk.71-98`.

## Cause

pkp-lib `PKP\doi\Repository::mintAndStoreDoi()`
(`classes/doi/Repository.php`, line 448 on `main`) joins the context's
prefix, "/" and whatever suffix it is handed, and stores the result with
`add()`. It checks the prefix but never the suffix. Every made DOI goes
through it: the apps' `mintPublicationDoi()`, `mintGalleyDoi()`,
`mintIssueDoi()` (OJS), `mintChapterDoi()`, `mintPublicationFormatDoi()`,
`mintSubmissionFileDoi()` (OMP), and pkp-lib's `mintDoi()` for peer
reviews and author responses (OJS).

Two kinds of suffix reach it that make no DOI:
- **Empty.** Under "None" (`SUFFIX_MANUAL`, `customId`), each app's
  `generateSuffixPattern()` returns `''`. `mintDoi()` passes `''` as the
  suffix for every format but "Default".
- **Holding a symbol.** Under "Custom pattern", each app's
  `PubIdPlugin::generateCustomPattern()` replaces a symbol only when the
  item has its value, and otherwise leaves it as typed. Examples: OJS
  `%p` page numbers, and `%x` the Publisher ID in all three apps.

Up to 3.3, `PKPPubIdPlugin::canBeAssigned()` refused a DOI whose suffix
was empty or still held `%`. The 3.4 rewrite (`pkp/pkp-lib#7014`) moved
DOI making from the DOI plugin into `Repository` and did not carry that
check over. `canBeAssigned()` is still in pkp-lib `main`, but nothing on
the DOI path calls it.

The rewrite's own `Repository::validate()` would refuse a `%` ("The DOI
contains invalid characters."). It would also refuse the second work's
`10.1234/` as a duplicate of the first. But only a DOI typed on the DOIs
page goes through it.

Reach:

- "Assign DOIs" on the DOIs page (`PKPDoiController::assignSubmissionDois()` →
  `Repo::submission()->createDois()`): walked on the three apps.
- The automatic assignment (read in the code). Two listeners call
  `Repo::submission()->createDois()`: `AssignDOIs` (copyediting or
  production) and OPS `AssignDOIsOnSubmission`. `VersionDois` (publication)
  calls `Repo::publication()->createDois()`, which is a separate method
  in OMP and OPS. All of them reach the same `mint*Doi()` methods.
- Galleys, issues (OJS), chapters, formats and files (OMP) go through the
  same method (read in the code). A symbol the app never fills for a
  kind stays in every DOI of that kind:
  - OJS `%f` (file ID) in the galley box, since `generateSuffixPattern()`
    passes no file;
  - `%a` (article ID) or `%p` in the OJS issue box;
  - OMP `%c` (chapter ID) in the "Publication Formats" box.
- Peer reviews (OJS `main`, which alone has peer-review DOIs), read in
  the code, not walked. With "Peer Review" ticked, `createDois()` takes
  each completed review whose "Publicly Show Reviewer Comments" is on,
  and `mintDoi()` gives it `10.1234/` under "None" and under "Custom
  pattern".
- Beyond the page (read in the code, not walked):
  - Readers and indexers: the stored DOI goes into Google Scholar's
    `citation_doi` tag (three apps), the Dublin Core `DC.Identifier.DOI`
    tag (OJS, OMP), "How to cite" (three apps), OAI-PMH `oai_dc` (three
    apps), and OJS's JATS and MARC records.
  - Crossref: the export validates against `crossref5.4.0.xsd`, whose
    `doi_t` requires at least one character after "/". It refuses
    `10.1234/` but accepts `10.1234/jpkjpk.%p`, which would be sent.
  - DataCite: the kernel-4 XSD stopped checking a DOI's form in 4.2, so
    both kinds would be sent. What the agencies answer was not checked.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unfinished-doi-assigned/fix.diff):
- Steps 6 and 10 open "DOI Updates Failed", with the new message for
  each work that got no DOI.
- Those works read "Needs DOI", and the work's page has no DOI line.
- OJS 1 still gets `10.1234/jpkjpk.71-98`.
- "Default", a pattern every work fills (`%j.%a`, `%p.%m`: the initials
  and the work's ID) and a DOI typed by hand under "None" behave the
  same with the fix in and out.

Recommended: refuse the suffix in the one writer, `mintAndStoreDoi()`,
by the rule `canBeAssigned()` already states for the other identifiers:

```php
// An empty suffix ("None": suffixes are entered by hand) or one still holding a
// pattern symbol nothing filled ("%p" without pages) is no DOI: refuse it, as
// PKPPubIdPlugin::canBeAssigned() does for the other public identifiers
if ($doiSuffix === '' || str_contains($doiSuffix, '%')) {
    throw new DoiException(DoiException::SUFFIX_NOT_GENERATED);
}
```

The diff also adds `DoiException::SUFFIX_NOT_GENERATED` and its English
message (`doi.exceptions.suffixNotGenerated`, beside
`doi.exceptions.missingPrefix`).

The writer is the right layer. Every caller already handles a
`DoiException`: "Assign DOIs" lists it in "DOI Updates Failed", and the
automatic listeners ignore the failures `createDois()` returns, as they
do for a missing prefix. So the fix covers:
- the three apps and every kind;
- peer reviews;
- any plugin that calls a `mint*Doi()` method.

It also refuses an empty pattern box (`pkp/pkp-lib#12603`'s case) on
OJS. There, an empty box reaches the writer as `''`, which the fix now
refuses. On `main` the Setup tab refuses such a box for a ticked kind,
so only a box saved before that check can still be empty. On OMP and
OPS an empty box fails earlier, because their `generateCustomPattern()`
takes a `string` and gets `null`, and the fix does not reach that.

**Alternatives:**

- Skipping `createDois()` under "None": it leaves the pattern case, and
  needs the same guard in the three listeners and in "Assign DOIs".
- Calling `validate()` from `mintAndStoreDoi()`: it would refuse
  duplicates, but not the first `10.1234/`. It is worth adding on top
  if duplicate made DOIs (a pattern of `%j` alone) should fail too.
- Returning nothing from `generateCustomPattern()` when a symbol is
  left: three copies, one per app, and "None" still needs its own
  guard.
- Refusing such patterns at "Save": whether a symbol fills depends on
  the work, so the save cannot know.

**What goes with it:**

- Stored data: DOIs already made as `<prefix>/` or with `%` stay until
  someone types over them. An upgrade could clear the ones never
  deposited and unlink their items; deposited or registered ones need
  the manager. Which to clear is a product decision, so the repair is
  not in the tried diff.
- Peer reviews: under "Custom pattern" they get no DOI instead of
  `10.1234/`. This matches `mintDoi()`'s own comment ("Only the default
  pattern or manual entry of DOIs is supported for reviews").
- API: `POST …/api/v1/dois/submissions/assignDois` answers 400 with
  `failedDoiActions` for such works, the shape it already uses for
  other failures.
- The message names no work. "Assign DOIs" on many works repeats the
  same sentence once per work, which matters for a bulk action. The
  `mint*Doi()` methods already pass titles to other exceptions, so
  passing them on is a small change for the team to decide.
- A filled value that itself holds `%` (a Publisher ID typed with one)
  is refused with a message that blames the pattern. That is rare, and
  such a DOI is one `validate()` would refuse anyway.
- Backport: applies as written to 3.5 and 3.4 (pkp-lib only, line
  offsets).
- Guard: a pkp-lib unit test that `mintAndStoreDoi()` refuses `''` and
  a suffix holding `%`.

Medium: the code is a few lines in one shared method and a locale key,
but the stored repair needs a decision first.

## Evidence

- Kept script that takes the Steps on each app, on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unfinished-doi-assigned/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unfinished-doi-assigned/walk.js`.
  `WALK=neighbour` in front runs the neighbour check: "Default", a
  filled pattern and a DOI typed by hand under "None", on other works
  (OJS 6, 9 and 3; OMP 11, 13 and 1; OPS 10, 11 and 12). The script also
  reads the stored `dois` rows.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/unfinished-doi-assigned/fix.diff ojs omp ops`,
  then walk.js and the neighbour check, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/unfinished-doi-assigned/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6);
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). Same Steps and the same values.
  - No request answered a server error and no page script failed.
- 3.5, by code too: `mintAndStoreDoi()` and the three apps'
  `generateSuffixPattern()` as on `main`. There is no `mintDoi()`:
  peer-review DOIs came to `main` in pkp-lib 231d428cdd (2026-01-27).
- 3.4, by code:
  - pkp-lib `stable-3_4_0` at df13621c2d: `mintAndStoreDoi()` the same;
  - OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b
    (`upstream/stable-3_4_0`): `generateSuffixPattern()` returns `''`
    for `SUFFIX_MANUAL`, and `generateCustomPattern()` leaves unfilled
    symbols;
  - 75f5c71339 is an ancestor of pkp-lib `stable-3_4_0`.
- 3.3, by code:
  - pkp-lib `stable-3_3_0` at d446601ebe: `PKPPubIdPlugin::canBeAssigned()`.
  - OJS 9fdb9bcf9a: `PubIdPlugin::getPubId()` returns null for an empty
    suffix. In 3.3, `customId` used the suffix typed on each work, so
    an empty one gave no DOI.
  - The publication's DOI was assigned through ui-library `FieldPubId`,
    which shows `missingPartsLabel` while the pattern holds an unfilled
    symbol.
  - OMP 8e72fc883 and OPS c5532e2161 share that pkp-lib.
- Beyond the page, by code on `main`:
  - Crossref: `plugins/generic/crossref/filter/filterConfig.xml`
    (`xml::schema(…crossref5.4.0.xsd)`, validated in
    `XMLTypeDescription::checkType()` unless the export passes
    `noValidation`), and `common5.4.0.xsd` `doi_t`
    (`10\.[0-9]{4,9}/.{1,200}`).
  - DataCite: `plugins/generic/datacite/filter/filterConfig.xml`
    (kernel-4 `metadata.xsd`, whose 4.2 note reads "don't check format
    of DOI").
  - Readers and indexers: `GoogleScholarPlugin`, `DublinCoreMetaPlugin`,
    `CitationStyleLanguagePlugin`, the `dc11` adapters, and OJS
    `jatsTemplate` and `OAIMetadataFormat_MARC21`.
- Introduced: `git blame` on the `mintAndStoreDoi()` lines in pkp-lib
  `main` gives 75f5c71339 (authored 2021-06-08, committed 2022-02-15) for
  the join and `add()`. 8258b18274 (`pkp/pkp-lib#7522`) and 90376f9bcb
  (`pkp/pkp-lib#7523`) changed only the signature and the prefix
  exception. The apps' halves of the same rewrite are OJS
  [81664e1421](https://github.com/pkp/ojs/commit/81664e142122e18afc5333eb9602d3e1ea48b2a3),
  OMP [440b0394cb](https://github.com/pkp/omp/commit/440b0394cb051e53fb3c16d83d2f3a9e50a85190)
  and OPS [baf9653198](https://github.com/pkp/ops/commit/baf9653198b503cb3c53346443e9ae4f90da8cff),
  all 2022-02-15. GitHub lists no PR for 75f5c71339; the rewrite's PR,
  `pkp/pkp-lib#7350`, was closed without a merge.
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library.
  - `pkp/pkp-lib#3317` reports `%p` and `%x` DOIs on journals' pages.
    It was closed 2021-12-09 with "OJS does not automatically assign a
    DOI when a variable can not be substituted", which held for 3.3.
  - `pkp/pkp-lib#12603` (open, OJS 3.4.0-10): a 500 at copyediting with
    an empty "Submissions" box.
  - `pkp/pkp-lib#12637` (closed): the save-time check for an empty box.
- Not driven:
  - the automatic assignment (read in the code);
  - galleys, issues, chapters, formats, files, peer reviews and author
    responses;
  - an export or deposit of such a DOI, and the citation tags, "How to
    cite" and OAI-PMH;
  - the 3.4 and 3.3 installs.
  - MySQL not checked (nothing here depends on the database).
