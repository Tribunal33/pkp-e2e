# Works get unfinished DOIs ("10.1234/", "10.1234/jpkjpk.%p") under "DOI Format" "None", or a custom pattern naming a value the work lacks

- **Severity** high
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; an empty or unfilled suffix was refused)
- **Introduced** `pkp/pkp-lib#7014` · [75f5c71339](https://github.com/pkp/pkp-lib/commit/75f5c713391f663bef74c309242ff38d40e10c74) · 2022-02-15 · Erik Hanson (ewhanson)
- **Upstream** `pkp/pkp-lib#3317` reported the leftover symbol and was closed in 2021, when 3.3 refused such DOIs; the "None" half was never reported. `pkp/pkp-lib#12603` (a server error from an empty pattern box) was closed 2026-10-09 as a duplicate of `pkp/pkp-lib#12637`, which is fixed
- **Tracked in** spec U45 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a2), [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a9)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-12: checked again after `pkp/pkp-lib#13460` (merged
2026-10-09) reworked the automatic assignment; the Steps give the same
DOIs. New here: a journal's issue gets the same DOI when it is
published, whatever "Automatic DOI Assignment" says (steps 12 to 16),
so "Never" is no way round for issues.

## Summary

A manager sets "DOI Format" to "None - Suffixes must be entered manually
on the DOI management page and will not be generated automatically".
Yet "Assign DOIs" on the DOIs page still gives each work the prefix and
a bare "/": every work gets the same "10.1234/". A journal's issue gets
it when the issue is published, even with "Automatic DOI Assignment" on
"Never". Under "Custom pattern", a work that lacks a value the pattern
names keeps the symbol in its DOI: "%j.%p" on an article without page
numbers gives "10.1234/jpkjpk.%p".

The DOIs page reports "Items successfully assigned new DOIs", and the
work's public page shows the DOI ("DOI: https://doi.org/10.1234/").

By the code, the automatic assignment makes the same DOIs with nobody
pressing anything, under "Upon reaching the copyediting stage" (the
choice an install starts with) and "Upon publication". Only
"Immediately, when an item is created" (new on `main`) is safe: it
cannot be saved with "None" or "Custom pattern".

Also by the code, on OJS `main` with "Peer Review" ticked under "Items
with DOIs": when an article gets its DOIs, each of its reviews that is
shown publicly and that an editor has confirmed ("Mark as Complete", or
a decision's "Notify Reviewers" email) gets "10.1234/", under "Custom
pattern" as well as under "None".

## Impact

- **Lost.** A correct public record. The work's or issue's page links a
  DOI that resolves nowhere or holds "%p" or "%x". By the code, the same
  DOI goes into the page's citation tags, "How to cite" and OAI-PMH, and
  a deposit carries it: the Crossref export refuses the bare "10.1234/"
  but sends a "%" DOI, and the DataCite export sends both. What an
  agency answers was not tried: a test install has no agency account.
- **Who.** Readers who follow or cite the DOI, and indexers that harvest
  it. On the editorial side, managers of a journal, press or preprint
  server:
  - on "None": every work, and every issue of a journal with "Issues"
    ticked. By the code, the galleys, chapters, publication formats and
    files of a ticked kind too;
  - on "Custom pattern": the works that lack a value the pattern names.
- **Way round.** Type each DOI by hand over the wrong one. "Never" under
  "Automatic DOI Assignment" stops the automatic ones for works (by the
  code), but not for a journal's issues, and "Assign DOIs" still makes
  them. Under "Custom pattern", fill the missing value, empty the work's
  DOI box and press "Save", then "Assign DOIs" again: Assign never
  replaces an existing DOI. Nothing on screen points to any of this.

High: a published work's or issue's broken DOI reaches readers and
indexers behind a success message, in a setup that is not the default.
It would be critical if an agency registers a "%" DOI, since a
registered DOI cannot be withdrawn; only a live agency account can show
that.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its `publicknowledge` journal (press, preprint server) has
  DOIs on for "Articles" ("Monographs", "Preprints"), "DOI Format"
  "Default", no "DOI Prefix", and no work has a DOI yet.
- No other setup; `dbarnes` can change the settings.

The works used, all from the dataset. No dataset work has a Publisher
ID, so on OMP and OPS neither work fills its pattern; OJS 1 fills its
own, with "Pages":

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

An issue (OJS), on a freshly loaded dataset, signed in as `dbarnes`:
12. On Settings › Distribution › "DOIs" › "Setup", type "10.1234" in
    "DOI Prefix", tick "Issues" under "Items with DOIs", choose "None -
    …" under "DOI Format" and "Never" under "Automatic DOI Assignment",
    and press "Save".
13. Open the Issues page (`/index.php/publicknowledge/manageIssues`),
    "Future Issues".
14. On "Vol. 2 No. 1 (2015)", press "Publish Issue", then "OK".
15. Open "DOIs" › "Issues", expand "Vol. 2 No. 1 (2015)" and read its
    DOI.
16. Tick "Vol. 1 No. 2 (2014)", choose "Bulk Actions" › "Assign DOIs"
    and press "Assign DOIs"; expand the row and read its DOI.

**Expected:** under "None" no DOI is made, as the option says; "Assign
DOIs" says why nothing was assigned, and the work's page has no DOI
line. Under "Custom pattern" a work that lacks the value gets no DOI and
the manager is told; a work that has it gets its DOI. An issue published
under "Never" gets no DOI.

**Observed:** step 6 shows "Items successfully assigned new DOIs". Both
rows read `10.1234/`, "Unregistered" [3.5: the expanded row shows no
status; the row's own label reads "Unregistered" for the published work
and "Unpublished" for the other]. The work's page reads:

```
DOI: https://doi.org/10.1234/
```

Step 10 shows "Items successfully assigned new DOIs" too. The works
without the value read `10.1234/jpkjpk.%p` (OJS 5), `10.1234/jpk.%x`
(OMP 7 and 14) and `10.1234/jpkpkp.%x` (OPS 8 and 9), all "Unregistered".
The "Assign DOIs" request answered `200 {"failedDoiActions":[]}` each
time.

OJS 1, which has "Pages", gets `10.1234/jpkjpk.71-98`.

Step 15: the issue published in step 14 reads `10.1234/`,
"Unregistered", though "Automatic DOI Assignment" is "Never". Step 16
shows "Items successfully assigned new DOIs", and the second issue reads
`10.1234/` too. The published issue's page
(`/index.php/publicknowledge/issue/view/2`) links
`https://doi.org/10.1234/`.

## Cause

pkp-lib `PKP\doi\Repository::mintAndStoreDoi()`
(`classes/doi/Repository.php`, line 483 on `main`) joins the context's
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

- "Assign DOIs" on the DOIs page, walked:
  - for works, on the three apps:
    `PKPDoiController::assignSubmissionDois()` →
    `Repo::submission()->createDois()`;
  - for issues, on OJS: `DoiController::assignIssueDois()` →
    `Repo::issue()->createDoi()`.
- An issue's first publication (OJS), walked.
  `IssueGridHandler::publishIssue()` calls `Repo::issue()->createDoi()`,
  which asks only whether "Issues" is ticked and whether the issue has a
  DOI. It never reads "Automatic DOI Assignment", so "Never" does not
  stop it.
- The automatic assignment for works (read in the code, `main`). None of
  these looks at "DOI Format", and all reach the same `mint*Doi()`
  methods:
  - a decision that moves the work into Copyediting or Production,
    under "Upon reaching the copyediting stage": `AssignDOIs::handle()` →
    `Repo::submission()->createDois()`;
  - a preprint's final "Submit", under "Upon reaching the production
    stage": OPS `AssignDOIsOnSubmission`, the same call;
  - publication, under every choice but "Never":
    `AssignDOIs::handlePublished()` → `Repo::publication()->createDois()`.
    It took over from `VersionDois`, which `pkp/pkp-lib#13460` deleted
    and 3.5 still has;
  - a new version of a work already at Copyediting or later, under the
    copyediting choice: `AssignDOIs::handleVersioned()`, the same call.

  In OMP and OPS the submission's and the publication's `createDois()`
  are separate methods; in OJS the first calls the second.
- Not reached: "Immediately, when an item is created" (`main`). The
  paths of that choice ask `Repo::doi()->assignOnItemCreation()`, which
  answers yes only under "Default". Publication (`handlePublished()`,
  `publishIssue()`) runs under it too and asks nothing. What keeps it
  safe is `PKPContextService::validate()`, which refuses to save the
  choice with another format.
- Galleys, issues (OJS), chapters, formats and files (OMP) go through the
  same method (read in the code). A symbol the app never fills for a
  kind stays in every DOI of that kind:
  - OJS `%f` (file ID) in the galley box, since `generateSuffixPattern()`
    passes no file;
  - `%a` (article ID) or `%p` in the OJS issue box;
  - OMP `%c` (chapter ID) in the "Publication Formats" box.
- Peer reviews (OJS `main`, which alone has peer-review DOIs), read in
  the code, not walked. With "Peer Review" ticked, `createDois()` takes
  each review an editor has confirmed (`date_considered` or
  `date_acknowledged` is set) whose "Publicly Show Reviewer Comments" is
  on (`getCompletedReviewAssignments()`). `mintDoi()` gives it
  `10.1234/` under "None" and under "Custom pattern". Author responses
  go the same way in the code, but their tick is commented out of the
  Setup form ("not currently supported"), so no screen turns them on.
- Where the stored DOI goes besides the work's page (read in the code,
  not tried):
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
- Steps 6, 10 and 16 open "DOI Updates Failed", with the new message for
  each work or issue that got no DOI.
- Those works read "Needs DOI", and the work's page has no DOI line.
- The issue published in step 14 reads "Needs DOI", and its page has no
  DOI link.
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
`doi.exceptions.missingPrefix`):

```
A DOI was not created: under the DOI Format "None" each DOI is entered on the DOI management page, and a custom pattern needs every value it names (such as page numbers or a publisher ID).
```

It is one sentence for both cases because the writer sees only the
suffix. An empty one does not always mean "None": a review under "Custom
pattern" and an empty pattern box on OJS arrive empty too. A message per
case means reading "DOI Format" in the writer and a second key, which is
the team's call.

Every caller already handles a `DoiException`: "Assign DOIs" lists it in
"DOI Updates Failed", and the automatic paths (`AssignDOIs`' handlers,
OPS `AssignDOIsOnSubmission`, `publishIssue()`) ignore the failures
`createDois()` and `createDoi()` return, as they do for a missing
prefix. So the fix covers:
- the three apps and every kind;
- peer reviews;
- any plugin that calls a `mint*Doi()` method.

It also refuses an empty pattern box on OJS, which reaches the writer as
`''` (the case of `pkp/pkp-lib#12603`). On `main` the Setup tab already
refuses such a box for a ticked kind, so only a box saved before that
check can still be empty. On OMP and OPS an empty box fails earlier,
because their `generateCustomPattern()` takes a `string` and gets
`null`, and the fix does not reach that.

**Alternatives:**

- Skipping `createDois()` under "None", the way `assignOnItemCreation()`
  keeps "Immediately…" to "Default": it leaves the pattern case, and
  needs the same guard in every automatic path and in "Assign DOIs".
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
- Peer reviews (OJS `main`; by the code, not tried): under "Custom
  pattern" a review gets no DOI instead of `10.1234/`. That matches
  `mintDoi()`'s comment ("Only the default pattern or manual entry of
  DOIs is supported for reviews") and the Setup form's "Custom pattern
  not supported". But the refusal comes back as a failure. For a work
  with such a review, every "Assign DOIs" would open "DOI Updates
  Failed" although the article got its DOI, with a message that does not
  fit. The team's choice, neither in the tried diff:
  - OJS `createDois()` takes reviews only under "Default", so no failure
    is listed; or
  - `mintDoi()` throws a message of its own.
- API: `POST …/api/v1/dois/submissions/assignDois` answers 400 with
  `failedDoiActions` for such works, the shape it already uses for
  other failures.
- The message names no work, so "Assign DOIs" on many works repeats one
  sentence per work. Naming the work means passing its titles into
  `mintAndStoreDoi()` or a catch and rethrow in each app's `mint*Doi()`:
  either takes the change into the three apps, and `mintDoi()` has no
  item to name. Not in the tried diff.
- A filled value that itself holds `%` (a Publisher ID typed with one)
  is refused with a message that blames the pattern. That is rare, and
  such a DOI is one `validate()` would refuse anyway.
- Backport: the tried diff applies as written to 3.5 and 3.4 (pkp-lib
  only, line offsets). The peer-review choice is `main` only.
- Guard: `mintAndStoreDoi()` is protected and `PKP\doi\Repository`
  abstract, so the test goes through an app's repository. An OJS test
  that `Repo::doi()->mintPublicationDoi()` throws under "None", and
  under `%j.%p` on a publication without pages.

Medium: the code is a few lines in one shared method and a locale key,
but the stored repair and the peer-review answer each need a decision
first.

## Evidence

- Kept script that takes the Steps on each app, on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unfinished-doi-assigned/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unfinished-doi-assigned/walk.js`.
  `WALK=issue` in front takes steps 12 to 16 (OJS only, on a fresh
  dataset). `WALK=neighbour` in front is the control run for the fix,
  the cases it must leave alone: "Default", a filled pattern and a DOI
  typed by hand under "None", on other works (OJS 6, 9 and 3; OMP 11, 13
  and 1; OPS 10, 11 and 12). The script also reads the stored `dois`
  rows.
- The fix, tried 2026-10-12 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/unfinished-doi-assigned/fix.diff ojs omp ops`,
  then walk.js and the control run, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/unfinished-doi-assigned/fix.diff ojs omp ops`.
  The control run was also taken without the fix, and the issue steps
  with it in a second apply on OJS alone.
- Walked 2026-10-12 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [fac2371](https://github.com/pkp/datasets/commit/fac23716137c760359271218bc335a421061f115)
  (2026-10-11), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS d0b69b108d (lib/pkp 1ec9023e8a), OMP eb4c30aa3c and OPS
    8d04ca333c (lib/pkp 58c7f454ff);
  - stable-3_5_0: OJS c90dfdb577 (lib/pkp f4f8fcdbc0), OMP 486cbf9eb0
    and OPS 399c4ebca3 (lib/pkp 8094f06bf5). Same Steps and the same
    DOIs. The 3.5 expanded row has no "Status" column, so there the
    script read each DOI's status from its stored row (unregistered).
  - Steps 12 to 16 on OJS, both lines. Without the fix, the published
    issue's page was read by opening its address on the same installs
    after the walk; the script reads it from now on, and did in the
    fix's trial.
  - No request answered a server error and no page script failed.
  - No deposit was tried: the installs have no agency account.
- The issue paths, by code: `IssueGridHandler::publishIssue()` (line 567
  on `main`, 563 on 3.5, 555 on 3.4), `APP\issue\Repository::createDoi()`
  and `DoiController::assignIssueDois()` (3.4: `DoiHandler`).
- The default choice: `doiCreationTime` defaults to
  `copyEditCreationTime` in each app's `schemas/context.json` (`main`
  and 3.5), and the default dataset has it.
- The automatic paths, by code on `main` (pkp-lib 1ec9023e8a;
  `doi/Repository.php` and `AssignDOIs.php` are identical at
  58c7f454ff):
  - `classes/observers/listeners/AssignDOIs.php` (`handle()`,
    `handleSubmitted()`, `handlePublished()`, `handleVersioned()`,
    `handleDecline()`) and OPS `AssignDOIsOnSubmission`;
  - `Repo::doi()->assignOnItemCreation()` and its callers: the galley
    and review-assignment repositories, OMP
    `Repo::publication()->createDoisOnCreation()`, OJS `IssueForm`;
  - `PKPContextService::validate()`, which refuses "Immediately…" with
    another format;
  - `PKP\publication\Repository::getCompletedReviewAssignments()`
    (`filterByIsConfirmedByEditor(true)`, `filterByIsPubliclyVisible(true)`).
  - `pkp/pkp-lib#13460` is merge commit 51dc842b93; its commits
    8f74b72119 and 58c7f454ff name `pkp/pkp-lib#13447`. The review
    filter came with 90c296e8d1 (`pkp/pkp-lib#13450`) and 4802240c56,
    2026-10-07.
  - Author responses: OJS `DoiSetupSettingsForm` (the option is
    commented out).
- 3.5, by code too: `mintAndStoreDoi()` (line 374) and the three apps'
  `generateSuffixPattern()` as on `main`. `AssignDOIs::handle()`, OPS
  `AssignDOIsOnSubmission` and `VersionDois::handlePublishedEvent()` call
  `Repo::submission()->createDois()` without looking at "DOI Format".
  There is no `mintDoi()` and no "Immediately…" choice: peer-review DOIs
  came to `main` in pkp-lib 231d428cdd (2026-01-27).
- 3.4, by code:
  - pkp-lib `stable-3_4_0` at 55c8e406b3: `mintAndStoreDoi()` the same;
  - OJS daf0ca971d, OMP 0aec65441f, OPS acd8ae704b
    (`upstream/stable-3_4_0`): `generateSuffixPattern()` returns `''`
    for `SUFFIX_MANUAL`, and `generateCustomPattern()` leaves unfilled
    symbols;
  - 75f5c71339 is an ancestor of pkp-lib `stable-3_4_0`.
- 3.3, by code:
  - pkp-lib `stable-3_3_0` at 5e84acd11b: `PKPPubIdPlugin::canBeAssigned()`.
  - OJS d7d9dd14ec: `PubIdPlugin::getPubId()` returns null for an empty
    suffix. In 3.3, `customId` used the suffix typed on each work, so
    an empty one gave no DOI.
  - The publication's DOI was assigned through ui-library `FieldPubId`
    (`stable-3_3_0` at 96959f9ed4), which shows `missingPartsLabel`
    while the pattern holds an unfilled symbol.
  - OMP 8e72fc8836 and OPS c5532e2161 share that pkp-lib.
- Beyond the page, by code on `main` (read 2026-10-01, not read again
  on 2026-10-12):
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
  and pkp/ui-library; pkp/pkp-lib searched again 2026-10-12, nothing
  new.
  - `pkp/pkp-lib#3317` reports `%p` and `%x` DOIs on journals' pages.
    It was closed 2021-12-09 with "OJS does not automatically assign a
    DOI when a variable can not be substituted", which held for 3.3.
  - `pkp/pkp-lib#12603` (OJS 3.4.0-10): a 500 at copyediting with an
    empty "Submissions" box. Its GitHub page names `pkp/pkp-lib#12637`
    as the issue it duplicates.
  - `pkp/pkp-lib#12637` (closed as completed): the save-time check for
    an empty box.
- Not driven:
  - the automatic assignment for works (read in the code);
  - galleys, chapters, formats, files, peer reviews and author
    responses;
  - an export or deposit of such a DOI, and the citation tags, "How to
    cite" and OAI-PMH;
  - the 3.4 and 3.3 installs.
  - MySQL not checked (nothing here depends on the database).
