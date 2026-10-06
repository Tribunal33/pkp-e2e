# Journal and preprint server listings still name contributors unticked from "Publication Lists"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OMP, OPS (code; OMP's catalog filters from 3.4 on)
- **Introduced** `pkp/pkp-lib#5025` for `pkp/pkp-lib#2072` · [718ad72e59](https://github.com/pkp/pkp-lib/commit/718ad72e597285d2899932efbd1d87635b90efe7) · 2019-06-26 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#7016` (open), reporting the OJS table of contents; its fix PRs `pkp/pkp-lib#7622` and `pkp/ojs#3275` (open since 2022) no longer apply to main, and no PR covers OPS
- **Tracked in** spec U41 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who unticks "Include this contributor when identifying authors
in lists of publications." on a contributor expects that contributor to
be left out of the author line wherever the item is listed. The
contributor list's "Preview" shows the contributor left out of its
"Publication Lists" row. On a journal and a preprint server, though, the
issue's table of contents, the preprint archive and the search results
still name the contributor. Only a press's catalog and search results
leave them out.

The box saves, the Preview agrees with it, and only the public lists
ignore it. The item's own page credits every contributor whatever the
box says, as intended.

## Impact

- **Lost**: the editor's choice of whom a listing's author line names.
  A contributor kept out of the byline (a translator, a data curator) is
  listed beside the authors on every table of contents, archive and
  search result, and nobody is told. Only these public lists are wrong:
  the metadata sent out (OAI-PMH, Crossref and DOAJ deposits, "How to
  cite", the Atom and RSS 1.0 feeds) names every contributor whatever
  the box says, since no exporter reads it (code).
- **Who**: editors of journals and preprint servers who untick the box,
  and the readers of those lists. The box arrives ticked, so only the
  items where an editor unticked it are affected.
- **Way round**: none on screen. Omitting author names from a section's
  table of contents hides everyone, and deleting the contributor also
  takes their credit off the item's page.

Medium: the setting has one job and fails at it silently on two of the
three applications, though only in one field of the public lists and
only on the items where an editor unticked it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP and OPS `main`. Nothing else is
  needed: each holds a published item with more than one contributor.

Journal (OJS):

1. Sign in as `dbarnes`.
2. Open submission 1, "Signalling Theory Dividends". The workflow opens
   on its unpublished version 1.1.
3. Open "Contributors" under the version.
4. On "Nicolas Riouf", press "Edit". Under "Publication Lists" untick
   "Include this contributor when identifying authors in lists of
   publications." and press "Save".
5. Press "Preview" and read the "Publication Lists" row; close the
   window.
6. Press "Publish". In "Review Publishing Details" leave the choices as
   they are and press "Confirm", then "Publish".
7. Sign out and open the journal's current issue, Vol. 1 No. 2 (2014)
   (`/index.php/publicknowledge/issue/current`).
8. Search for "Signalling".

Server (OPS): the same on submission 2, "The Facets Of Job Satisfaction:
A Nine-Nation Comparative Study Of Construct Equivalence", with these
differences: before step 3 press "Unpost" and confirm with "Unpost"; at
step 4 untick "Urho Kekkonen"; at step 6 press "Post" and "Post"; at
step 7 open "Preprints" (`/index.php/publicknowledge/preprints`); at
step 8 search for "Facets".

[3.5: step 6 is a single "Publish" confirm, without "Review Publishing
Details". The author lines group names under one role, so the Observed
line reads "Alan Mwandenga Version 2, Amina Mansour, Nicolas Riouf
(Author)".]

**Expected**: the listing and the search result leave the unticked
contributor out, as the Preview's "Publication Lists" row does:

```
Signalling Theory Dividends
Alan Mwandenga Version 2 (Author); Amina Mansour (Author)
```

**Observed**: the Preview reads as expected, and the table of contents
and the search result name all three:

```
Signalling Theory Dividends
Alan Mwandenga Version 2 (Author); Amina Mansour (Author); Nicolas Riouf (Author)
```

On OPS the archive and the search result read "Catherine Kwantes
(Author); Urho Kekkonen (Author)" against the Preview's "Catherine
Kwantes (Author)". No request failed and no message showed.

Control: the same steps on OMP's submission 14, "From Bricks to Brains:
The Embodied Cognitive Science of LEGO Robots" ("Unpublish" first,
"Michael Wilson" unticked, "Publish", then "Catalog" and a search for
"Bricks"), show "Michael Dawson (Author); Brian Dupuis (Author)" in
both lists, as expected.

## Cause

The box stores `includeInBrowse` on the contributor. The schema
(`lib/pkp/schemas/author.json`) defines it as "Whether or not to include
this contributor in author lists when the publication appears in search
results, tables of content and catalog entries." The author line is
filtered by `PKPPublication::getAuthorString($includeInBrowseOnly =
false)`, and only callers that pass `true` get the filter. (The author
`Collector` also has `filterByIncludeInBrowse()`, which nothing calls.)

OJS's `templates/frontend/objects/article_summary.tpl` (line 67) and
OPS's `templates/frontend/objects/preprint_summary.tpl` (line 57) print
`getAuthorString()` with no argument. Each is the summary every listing
of its app includes:

- on OJS, the issue table of contents, the home page's latest articles
  (`latest_article.tpl`) and current issue (`issue_toc.tpl`), category
  pages and search results;
- on OPS, the home page, "Preprints", section and category pages and
  search results.

OMP's `monograph_summary.tpl` passes `true`, so its listings filter.

The OJS template has made the same call since 2015, and it filtered
until 2019. Before then, `Submission::getAuthorString()` read
`getAuthors(true)`, as it had since pkp-lib
[9f4799c94b](https://github.com/pkp/pkp-lib/commit/9f4799c94b2f5770b0b88e598bda306572e0e777)
(2014, the change that added the box). pkp-lib
[718ad72e59](https://github.com/pkp/pkp-lib/commit/718ad72e597285d2899932efbd1d87635b90efe7)
(2019, the publication entity behind versioning) made that method a
pass-through to the new `Publication::getAuthorString()`, which had no
filter.

The filter came back to `Publication::getAuthorString()` in pkp-lib
[e12acef014](https://github.com/pkp/pkp-lib/commit/e12acef014b14c212da63a96e8d4d11adb4c9d3e) (2021,
`pkp/pkp-lib#6850`), and OMP's template was given `true` in
`pkp/pkp-lib#8426` (2023). The OJS and OPS templates never were. So
this is a regression for OJS, whose table of contents honored the box
through 3.1 (code). OPS was created after the 2019 change and never
honored it.

Reach:

- OJS issue table of contents and search results, OPS archive and search
  results: walked. The other listings above use the same template: code.
- The contributor list's "Preview" filters (walked). So does the REST
  API's `authorsStringIncludeInBrowse` (code).
- The RSS 2.0 feed (`pkp/webFeed`, one plugin shared by the three apps)
  leaves the contributor out on `main` only by accident: `rss2.tpl`
  passes a leftover `$userGroups` collection, which the current
  signature reads as the filter flag. On 3.5 it names everyone (code).
- Themes that override `article_summary.tpl` or `preprint_summary.tpl`
  carry their own call: not checked.

## Proposed fix

Pass `true` in the two summary templates, as OMP's
`monograph_summary.tpl` already does
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-lists-tick-ignored/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-lists-tick-ignored/fix-ops.diff)):

```diff
--- a/templates/frontend/objects/article_summary.tpl
+++ b/templates/frontend/objects/article_summary.tpl
@@ -64,7 +64,7 @@
 	<div class="meta">
 		{if $showAuthor}
 		<div class="authors">
-			{$publication->getAuthorString()|escape}
+			{$publication->getAuthorString(true)|escape}
 		</div>
 		{/if}
 
```

```diff
--- a/templates/frontend/objects/preprint_summary.tpl
+++ b/templates/frontend/objects/preprint_summary.tpl
@@ -54,7 +54,7 @@
 
 		{if $showAuthor}
 		<div class="authors">
-			{$preprint->getCurrentPublication()->getAuthorString()|escape}
+			{$preprint->getCurrentPublication()->getAuthorString(true)|escape}
 		</div>
 		{/if}
 
```

The summary template is where each app decides that an author line
belongs to a listing, so that is where the flag goes. Tried on OJS and
OPS `main`: the walk then showed the Expected lines on the table of
contents, the archive and both searches. With nothing unticked, every
author line of the issue's table of contents and the preprint archive
read the same with the fix in and out.

**Alternatives**

- Filter by default in `getAuthorString()`: no. Its other callers want
  everyone: the copyright holder (`Submission::_getContextLicenseFieldValue()`,
  `PKPPublicationLicenseForm`) and `authorsString`, which the REST API
  returns in both its summary and full maps.
- Rebase the open PRs `pkp/pkp-lib#7622` and `pkp/ojs#3275`: they edit
  `.inc.php` files since renamed and a three-argument signature `main`
  no longer has, and they leave OPS out.

**What goes with it**

- RSS 2.0, in `pkp/webFeed`: pass `true` in `rss2.tpl` (both calls,
  line 74 and 75) so the call says what it does; no behavior change on
  `main`. `WebFeedGatewayPlugin::fetch()` then has no reader left for
  `$userGroups`, so its query (line 99) and the `userGroups` template
  variable (line 136) go too. Not tried, since there is nothing to see
  on screen.
- Backport: on 3.5 and 3.4 the call is
  `getAuthorString($authorUserGroups, true)`, the shape OMP's template
  has there. 3.3 is not one argument: its
  `PKPPublication::getAuthorString($userGroups)` has no flag, and OMP's
  `getAuthorOrEditorString()` reads `getAuthors(true)` only to collect
  role names. A 3.3 fix needs a pkp-lib signature change, which
  `pkp/pkp-lib#7619` and `pkp/ojs#3273` drafted; whether 3.3 gets it is
  the team's call.
- Whether the Atom and RSS 1.0 feeds should honor the box is a product
  question, left out here.
- Themes overriding the two templates need the same argument; a release
  note says so.
- Test: the e2e scenario "Keep a contributor out of publication lists"
  in pkp-e2e's U41 spec, asserting the omission on all three apps.

Small: two one-argument template changes in OJS and OPS, plus the
one-file tidy-up in `pkp/webFeed`, each following OMP's existing call,
with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-lists-tick-ignored/walk.js)
  (with `lib.js` beside it), run with
  `node bin/probe.js all shared/playwright/checks/issues/publication-lists-tick-ignored/walk.js`
  on installs freshly loaded from the default dataset (pkp/datasets
  566bb1f, 2026-10-03), PostgreSQL. Nothing here depends on the
  database.
- `main` walked: OJS [ff004d0973](https://github.com/pkp/ojs/commit/ff004d097321cd5ae94ba8ce1659cc5230226720)
  (pkp-lib [987776cd04](https://github.com/pkp/pkp-lib/commit/987776cd043efac8c4a1693560a6d7737d174210)),
  OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
  and OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
  (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8));
  webFeed [7436935862](https://github.com/pkp/webFeed/commit/74369358620959a1fafdccc19887bfbad43a1569)
  in all three.
- 3.5 walked: OJS [c1cee76b95](https://github.com/pkp/ojs/commit/c1cee76b95463dd6fba7d2db93d9115bd9640d05)
  (pkp-lib [771474347e](https://github.com/pkp/pkp-lib/commit/771474347eaba57d6ab1c04d85f7bf17f57b159d)),
  OMP [9c5e24246c](https://github.com/pkp/omp/commit/9c5e24246cbb18e7fdb261be7ddceffdc406ecc9)
  and OPS [38b61882d3](https://github.com/pkp/ops/commit/38b61882d3a2396f08e56e2c622ff654fbe48c44)
  (pkp-lib [cf3f984335](https://github.com/pkp/pkp-lib/commit/cf3f984335381e5794227e8079e56065052e2537)).
  Code read: `PKPPublication::getAuthorString(\Traversable $userGroups,
  $includeInBrowseOnly = false)` and the three summary templates.
- 3.4 (code): OJS [d68934d0d1](https://github.com/pkp/ojs/commit/d68934d0d1f8542c4856351f7a11bbc8b3d860d0),
  OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
  OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
  pkp-lib [767353f4fe](https://github.com/pkp/pkp-lib/commit/767353f4fee3078decec6eb95d7de1a0fc58d67c):
  the same three template calls and the same method as 3.5.
- 3.3 (code): OJS [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b),
  OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
  OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
  pkp-lib [ac3fa73402](https://github.com/pkp/pkp-lib/commit/ac3fa73402dedfc174d4861d280e7666c1f66218):
  `article_summary.tpl` and `preprint_summary.tpl` call the deprecated
  `Submission::getAuthorString()`, which passes every author to
  `PKPPublication::getAuthorString($userGroups)`; `monograph_summary.tpl`
  calls `getAuthorOrEditorString()`, which does the same.
- Metadata reach (code, `main`): `includeInBrowse` is read only by
  `PKPPublication::getAuthorString()`, the publication schema map, the
  unused `Collector` filter and the native XML import/export. No OAI-PMH
  format, Crossref, DOAJ, Citation Style Language, Google Scholar or
  Atom/RSS 1.0 template reads it.
- Trace: `git log -L` on `article_summary.tpl`'s call names OJS
  5f92a4da25 (2025, contributor roles; it dropped the user-groups
  argument), b53172242c (2023, `pkp/pkp-lib#8426`), 7d49f3fbf7 (2019,
  escaping), a1a2888421 (2015, `pkp/pkp-lib#836`) and 7b726d89f6 (2015,
  the first version), the same call throughout. In pkp-lib, `git log
  -S'getAuthors(true)'` and `-S'getAuthorString('` on
  `PKPSubmission.inc.php` lead to 718ad72e59 (`pkp/pkp-lib#5025`), and
  `-S'includeInBrowseOnly'` on the publication class to e12acef014.
  OMP's `true` came in OMP 050463467; OPS's `preprint_summary.tpl` dates
  from OPS 11f39599b0 (2019-09-08).
- Upstream (2026-10-03): `pkp/pkp-lib#7016` (2021, "getAuthorString no
  longer respects browse inclusion in some places") names
  `article_summary.tpl` and `rss2.tpl` in its discussion. pkp/ops,
  pkp/ui-library and pkp/webFeed hold nothing on it.
- Not driven: the other listings (same template); the feeds (code here;
  pkp-e2e's U18 spec drove them on 2026-09-25); third-party themes.
