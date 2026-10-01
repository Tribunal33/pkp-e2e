# Preprint lists never show a preprint's DOI, though the preprint's own page does

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; DOIs still come from the DOI plugin there)
- **Introduced** `pkp/ops` branch `i7014_dois` (no PR) for `pkp/pkp-lib#7014` · [baf9653198](https://github.com/pkp/ops/commit/baf9653198b503cb3c53346443e9ae4f90da8cff) · 2022-01-10 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OPS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Each preprint's entry in a preprint server's lists has a "DOI:" line,
meant to show the preprint's DOI as a link. It never appears, even for a
preprint whose own page shows "DOI:". Readers browsing the lists see no
DOI; the preprint's own page still shows it.

The lists are the home page's "Latest preprints", "Archives", section
and category pages, and search results. It applies to every server that
assigns DOIs to its preprints and uses OPS's own list template, as the
default theme does.

## Impact

- **Lost.** No data. Up to 3.3, the home page's "Latest preprints" and
  "Archives" showed each preprint's DOI; since 3.4 they do not, and no
  message or log line tells the server's managers. Section, category
  and search pages never showed it.
- **Who.** Readers of any preprint server that assigns DOIs, on every
  preprint list. A theme with its own copy of the list template may
  differ.
- **Way round.** Open the preprint.

Low: one field is missing from the lists, and the preprints themselves
show it. It would be higher if a list were the only place the DOI
showed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, "Public Knowledge Preprint Server". DOIs are on
  there for preprints ("Items with DOIs": "Preprints"). No DOI prefix is
  set, and no preprint has a DOI, so steps 2 to 4 set a prefix and
  assign one DOI.

Steps:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Go to Settings › Distribution › "DOIs" › "Setup". Type `10.1234` in
   "DOI Prefix" and press "Save".
3. Open "DOIs" in the left menu. On the "Preprints" list, tick preprint
   2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study
   Of Construct Equivalence".
4. Choose "Bulk Actions" › "Assign DOIs", then confirm with "Assign
   DOIs".
5. Sign out, and open the preprint's page
   (`/index.php/publicknowledge/preprint/view/2`).
6. Press "Archives" in the main menu, and find the preprint in the list.

**Expected.** Step 5 shows "DOI: https://doi.org/10.1234/…". In step 6
the preprint's summary has the same line, as a link, under the author
line.

**Observed.** Step 5 shows `DOI: https://doi.org/10.1234/vqjss964`. In
step 6 the summary has no DOI line:

```
The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence
Catherine Kwantes (Author); Urho Kekkonen (Author)
employees survey
Downloads: 0 - Submitted 2026-09-30 - Posted 2026-09-30
PDF
```

## Cause

The summary still looks for the DOI through DOI plugins, which no
longer exist.
[`templates/frontend/objects/preprint_summary.tpl`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/templates/frontend/objects/preprint_summary.tpl#L61-L79)
builds its "DOI:" line inside `{foreach from=$pubIdPlugins …}`. It keeps
only a plugin whose `getPubIdType()` is `'doi'`, then asks that plugin
for the resolving URL. Until 3.3, `plugins/pubIds/doi` was such a
plugin.

`pkp/pkp-lib#7014` made DOIs part of the core. In OPS,
[baf9653198](https://github.com/pkp/ops/commit/baf9653198b503cb3c53346443e9ae4f90da8cff)
removed the DOI plugin and moved the preprint page
(`preprint_details.tpl`) to the publication's `doiObject`. In the
summary it changed only the label's locale key, and left the loop.

OPS now ships no `pubIds` plugin. So `$pubIdPlugins` (which
`IndexHandler` and `PreprintsHandler` load) holds no plugin of type
`doi`, the loop body never runs, and the line is never written. The
preprint page reads `$publication->getData('doiObject')` (through
`PreprintHandler::view()`) and is unaffected.

Reach:

- Every list that includes `preprint_summary.tpl` (code): the home
  page's "Latest preprints" (`indexServer.tpl`), "Archives"
  (`preprints.tpl`), section pages (`sections.tpl`), category pages
  (`catalogCategory.tpl`) and search results (`search.tpl`). "Archives"
  was walked. The section, category and search pages do not assign
  `$pubIdPlugins` at all, on any version.
- OJS and OMP (code): their list summaries (`article_summary.tpl`,
  `monograph_summary.tpl`) have no DOI line. OJS's issue page and the
  three apps' item pages read `doiObject`.
- The other `$pubIdPlugins` loops (OPS `preprint_details.tpl`, OJS
  `article_details.tpl` and `issue_toc.tpl`, the Google Scholar plugin)
  skip DOIs or handle them through `doiObject` or `getDoi()`. They read
  plugins only for other identifiers such as URNs, and are correct.
- No stored data is wrong.

## Proposed fix

Read the current version's `doiObject` in the summary. The preprint
page made the same change in baf9653198, and OJS's `issue_toc.tpl` reads
an issue's DOI the same way. The replacement block, in full (the version
to apply is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-summary-doi-never-shown/fix.diff),
which also re-indents the `div.doi` block one level):

```diff
-		{* DOI (requires plugin) *}
-		{foreach from=$pubIdPlugins item=pubIdPlugin}
-			{if $pubIdPlugin->getPubIdType() != 'doi'}
-				{continue}
-			{/if}
-			{assign var=pubId value=$preprint->getCurrentPublication()->getStoredPubId($pubIdPlugin->getPubIdType())}
-			{if $pubId}
-				{assign var="doiUrl" value=$pubIdPlugin->getResolvingURL($currentServer->getId(), $pubId)|escape}
-				<div class="doi">
-						{capture assign=translatedDOI}{translate key="doi.readerDisplayName"}{/capture}
-						{translate key="semicolon" label=$translatedDOI}
-					<span class="value">
-						<a href="{$doiUrl}">
-							{$doiUrl}
-						</a>
-					</span>
-				</div>
-			{/if}
-		{/foreach}
+		{* DOI *}
+		{assign var=doiObject value=$preprint->getCurrentPublication()->getData('doiObject')}
+		{if $doiObject}
+			{assign var="doiUrl" value=$doiObject->getData('resolvingUrl')|escape}
+			<div class="doi">
+				{capture assign=translatedDOI}{translate key="doi.readerDisplayName"}{/capture}
+				{translate key="semicolon" label=$translatedDOI}
+				<span class="value">
+					<a href="{$doiUrl}">
+						{$doiUrl}
+					</a>
+				</span>
+			</div>
+		{/if}
```

How this was settled:

- **Where the rule lives.** The summary template is the only place that
  writes the line, and it is OPS's own. No handler change is needed:
  every list passes the preprint, and the publication carries its
  `doiObject` (`lib/pkp` `publication/DAO::fromRow()`).
- **How the code base does it.** baf9653198 moved the preprint page from
  this same loop to `doiObject`. OJS's `issue_toc.tpl` and OMP's
  `monograph_full.tpl` read DOIs the same way.
- **Every instance.** This is the only `$pubIdPlugins` loop left in the
  three apps that looks for a DOI (Cause, reach).
- **What the refactor was for.** Making DOIs core, with a DOI object per
  item. The fix finishes that move for the summary.
- **What it touches.** The DOI line now shows on every list, including
  the section, category and search pages that never had it. The markup
  (`div.doi`, the label, the link) is unchanged, so themes that style it
  need nothing new. Like the preprint page, the line shows whenever the
  version has a stored DOI: by the code, neither page checks whether
  "DOIs" or "Items with DOIs" › "Preprints" is still ticked in Settings ›
  Distribution › "DOIs", or which registration agency, if any, is
  chosen. One case differs from the
  preprint page: with "DOI Versioning" on, when the current version is a
  minor version without a DOI of its own, the preprint page borrows the
  DOI of a sibling minor version (`Repo::publication()->getMinorVersionsDoi()`)
  and the summary does not. A minor version normally copies its
  parent's DOI (`Repository::version()`), so this is an edge case; it is
  left out to keep database queries out of a list template.
- **The guard.** The U13 spec's preprint list scenario, extended with a
  preprint that has a DOI, would fail on a missing "DOI:" line.

Tried on `main`: with the diff applied, step 6 read
`DOI: https://doi.org/10.1234/6gdhcq65` (a link) in the preprint's
summary. Preprint 15, "Yam diseases and its management in Nigeria",
which has no DOI, showed no DOI line with the fix in or out, on
"Archives" and on the home page.

**Alternatives**

- Put the DOI URL on each preprint in the handlers: five handlers
  instead of one template, for the same result.
- Call `getStoredPubId('doi')` on the publication and build the URL in
  the template: it repeats `Doi::getResolvingUrl()`, which `doiObject`
  already carries as `resolvingUrl`.
- Drop the line: it would make the 3.4 loss permanent, and the markup
  and label are still there for it.

**What goes with it**

- Optionally, drop `pubIdPlugins` from `IndexHandler` and
  `PreprintsHandler`. No core template reads it after the fix, but a
  third-party theme may.
- Backport: `stable-3_5_0` and `stable-3_4_0` take the diff as written
  (it applies with a one-line offset). `stable-3_3_0` needs nothing.

Small: one block in one OPS template, tried, with no data to repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/preprint-summary-doi-never-shown/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-summary-doi-never-shown/walk.js)
  takes the Steps on OPS. It also reads the neighbour preprint 15 on
  "Archives" and the home page's "Latest preprints". Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ops shared/playwright/checks/issues/preprint-summary-doi-never-shown/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). For the fix check,
  apply `fix.diff` beside it to the OPS root first.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  38ab955 (2026-09-30); 3.5 gave the same result. No request failed and
  no script error showed. A database plays no part (a template).
- The home page is not a step: it lists ten preprints, and the
  dataset's preprints share one posting date, so which ten is not fixed.
- Tips: OPS `main` c8af945bb7, its `lib/pkp` 3dc90c81a6. OPS
  `stable-3_5_0` cf4fce69bd, its `lib/pkp` a9c76aed62. OPS
  `stable-3_4_0` acd8ae704b. OPS `stable-3_3_0` c5532e2161, its
  `lib/pkp` d446601ebe.
- Code reads, on each branch: OPS `preprint_summary.tpl` (the loop),
  `plugins/pubIds/` (a `doi` plugin on 3.3 only) and every handler under
  `pages/` and `lib/pkp/pages/` that assigns `pubIdPlugins` (the home
  page, "Archives" and the preprint page only). 3.4 also:
  `preprint_details.tpl`, and a dry run of the diff. `main` also:
  `PreprintHandler::view()`, `lib/pkp` `publication/DAO::fromRow()` and
  `publication/Repository::version()`.
- Introduced: `git blame` on the loop gives 7a99d23d47 (2020-02-28),
  written for the DOI plugin; baf9653198 removed the plugin and left the
  loop. It reached `main` in a branch merge, so there is no PR.
- Upstream: pkp/pkp-lib and pkp/ops issues and PRs, by symptom words
  and by `preprint_summary` and `pubIdPlugins`. Read and not this fault:
  `pkp/pkp-lib#8027` (DOI versioning for OPS), `pkp/ops#1315` (identity
  metadata).
- Not driven: 3.4 and 3.3 (code only); the section, category and search
  pages (code only); OJS and OMP (no DOI line in their list summaries).
- Unverified: third-party OPS themes that override
  `preprint_summary.tpl`; none were read.
