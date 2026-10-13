# A contributor's affiliations on an article, book or preprint page read "First Univ , Second Univ"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; one affiliation per contributor)
  - 3.3: none (code; one affiliation per contributor)
- **Introduced** `pkp/ojs#4639`, `pkp/omp#1819` and `pkp/ops#856` for `pkp/pkp-lib#7135` · [8eaab56f56](https://github.com/pkp/ojs/commit/8eaab56f567ad1daa21261deb2bfab4b65576d52), [17f2661a46](https://github.com/pkp/omp/commit/17f2661a46cb67cabe295071223d64a81e8e42b5), [99b51ba3d4](https://github.com/pkp/ops/commit/99b51ba3d4c8e93e73659c898553fbfef51665dc) · 2025-02-06 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U41 [A27](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a27)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a published article's, book's or preprint's page, a contributor
with two or more affiliations has them joined with a space before each
comma: "University of Tehran , Second Institute" where "University of
Tehran, Second Institute" is expected.

Every affiliation is shown; only the punctuation of the public byline
is wrong, on every item where a contributor has more than one
affiliation. Nothing outside the page carries the space: the citation
tags and the exports list each affiliation on its own.

## Impact

- **Lost**: nothing; the byline reads with a stray space.
- **Who**: readers of the article, book, chapter and preprint pages in
  each app's default theme, and in any theme that does not ship its own
  copy of the page template. On a press, a book or chapter with five or
  more contributors shows no affiliations in its credits at all,
  [a separate fault](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A1-book-page-long-credits-dangling-comma.md),
  so there only those with fewer show this one.
- **Way round**: none in the settings. A site can override the page
  template in a child theme, which needs a developer.

Low: a punctuation slip on a public page; readers get every
affiliation, and nothing stored or exported is wrong.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, freshly loaded.
Each app's dataset has a published item with one contributor who has
one affiliation. The items are published, so they are not on
`dbarnes`'s dashboard lists; the steps open them by their address.

- OJS submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a
  hospital in Isfahan, Iran": "Vajiheh Karbasizaed", "University of
  Tehran"; its page `/index.php/publicknowledge/article/view/17`.
- OMP submission 5, "Bomb Canada and Other Unkind Remarks in the
  American Media": "Chantal Allan", "University of Southern
  California"; `/index.php/publicknowledge/catalog/book/5`.
- OPS submission 6, "Developing efficacy beliefs in the classroom":
  "Domatilia Sokoloff", "University College Cork";
  `/index.php/publicknowledge/preprint/view/6`.

Steps:

1. Sign in as `dbarnes`.
2. Open the submission by its address:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`.
3. In the side menu, under "Publication" ("Preprint" on a preprint
   server), open "Contributors". The page warns "Warning: This version
   has been published. Editing it may impact the published content."
4. Press "Edit" on the contributor. Under "Affiliations", type "Second
   Institute u41h13j", choose that typed text in the list (the entry
   without the ROR mark), press "Add", then "Save".
5. Open the item's page (the header's "View", or the address above).

**Expected**: the contributor's affiliations read "University of
Tehran, Second Institute u41h13j" (OMP "University of Southern
California, …", OPS "University College Cork, …").

**Observed**: they read

```
University of Tehran , Second Institute u41h13j
```

and the page's markup is
`<span>University of Tehran</span> , <span>Second Institute u41h13j</span>`.
The same on the book page ("University of Southern California , Second
Institute u41h13j") and the preprint page ("University College Cork ,
Second Institute u41h13j").

## Cause

The affiliations loop of each app's page template prints the separator
on a template line of its own, at the start of every affiliation after
the first:

```smarty
{foreach from=$author->getAffiliations() item="affiliation"}
	{if $affiliation->getLocalizedName() || $affiliation->getRor()}
		{if $renderedAffiliation}{translate key="common.commaListSeparator"}{/if}
		{if $affiliation->getLocalizedName()}<span>{$affiliation->getLocalizedName()|escape}</span>{/if}
		{if $affiliation->getRor()}<a href="{$affiliation->getRor()|escape}">{$rorIdIcon}</a>{/if}
		{assign var="renderedAffiliation" value=true}
	{/if}
{/foreach}
```

Between one affiliation's last tag and the next affiliation's separator
the template holds line breaks and tabs. Smarty prints them as they
are, and the browser draws them as one space, so the space lands
before ", ".

The files are OJS `templates/frontend/objects/article_details.tpl`
(line 121), OMP `templates/frontend/components/authors.tpl` (line 45)
and OPS `templates/frontend/objects/preprint_details.tpl` (line 139).
The separator has stood on its own line since the loop was written for
multiple affiliations (`pkp/pkp-lib#7135`). `pkp/pkp-lib#12886` (OJS
7b57fe02ed, 2026-06-12) later moved it to the start of each entry, to
skip empty affiliations, and kept the line of its own.

Reach:

- The article, book and preprint pages above (walked), and OMP's
  chapter page, which includes the same `authors.tpl`
  (`templates/frontend/objects/chapter.tpl` line 62; read in the
  code). Third-party themes with their own copy of these templates
  were not read.
- After an affiliation picked from the registry, the output is the
  name, the ROR mark, then the space and the comma ("University of
  Ljubljana [ROR] , First Univ"), by the same loop (read in the code).
- Not reached: the "Author Biographies" label, which joins the names in
  PHP (`getLocalizedAffiliationNamesAsString(null, ', ')`); the
  contributor roles and keywords on the same pages; the Google Scholar
  tags, one per affiliation; and the exports, which write one element
  per affiliation, or, for DOAJ, a string joined in PHP.

## Proposed fix

Wrap the affiliations loop in `{strip}`, as OMP's `authors.tpl` already
does for its list of five or more contributors (lines 96-97: "strip
removes excess white-space which creates gaps between separators"), and
keep the gap between a name and its ROR mark with an explicit space
before the link. The same two-line change in each app's template,
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/fix-ojs.diff)
(OMP and OPS:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/fix-ops.diff)):

```diff
--- a/templates/frontend/objects/article_details.tpl
+++ b/templates/frontend/objects/article_details.tpl
@@ -115,15 +115,17 @@
 							</span>
 							{if count($author->getAffiliations()) > 0}
 								<span class="affiliation">
+									{strip}
 									{assign var="renderedAffiliation" value=false}
 									{foreach from=$author->getAffiliations() item="affiliation"}
 										{if $affiliation->getLocalizedName() || $affiliation->getRor()}
 											{if $renderedAffiliation}{translate key="common.commaListSeparator"}{/if}
 											{if $affiliation->getLocalizedName()}<span>{$affiliation->getLocalizedName()|escape}</span>{/if}
-											{if $affiliation->getRor()}<a href="{$affiliation->getRor()|escape}">{$rorIdIcon}</a>{/if}
+											{if $affiliation->getRor()} <a href="{$affiliation->getRor()|escape}">{$rorIdIcon}</a>{/if}
 											{assign var="renderedAffiliation" value=true}
 										{/if}
 									{/foreach}
+									{/strip}
 								</span>
 							{/if}
 							<span class="contributor_roles">
```

`{strip}` removes only whitespace that spans a line break in the
template's own text; the separator's ", " and the ROR icon are output,
not template text, so they stay. Without the explicit space the ROR
mark would touch the name, since the default theme's styles give the
link no margin.

Tried on OJS, OMP and OPS `main`: the Steps then read "University of
Tehran, Second Institute u41h13j" (likewise on the book and preprint
pages), with the markup
`<span>University of Tehran</span>, <span>Second Institute u41h13j</span>`.
Pages whose contributors have one affiliation each (OJS submission 1,
OMP 14, OPS 7) read the same with the fix in and out, their contributor
roles and keywords included.

**Alternatives**:

- Print the separator at the end of each entry, as the keywords do.
  That needs to know whether a later affiliation will be printed, which
  the empty-affiliation check of `pkp/pkp-lib#12886` makes awkward.
- Build the line in PHP (a joined string with the ROR links). Larger,
  and it moves markup out of the template that themes override.

**What goes with it**:

- No data repair and no API change.
- Backport: 3.5 needs its own diffs, since the line after the loop
  differs there (3.5 has no contributor roles):
  [fix-ojs-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/fix-ojs-3_5.diff),
  [fix-omp-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/fix-omp-3_5.diff),
  [fix-ops-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/fix-ops-3_5.diff)
  pass `git apply --check` on the `stable-3_5_0` tips (not walked). 3.4
  and 3.3 need nothing.
- OPS's contributor-roles loop just below opens `{strip}` twice
  (`preprint_details.tpl` lines 149 and 154; the second should be
  `{/strip}`), so strip mode runs on to the CRediT roles' `{/strip}`.
  It does not touch the affiliations loop or this fix; the OPS PR could
  correct it in passing.
- The ROR link on the same line also lacks an accessible name
  ([U41 A9's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A9-ror-logo-link-unnamed.md));
  a fix for both touches that one line.
- Guard: a check that a contributor's two affiliations read "First,
  Second" on the article, book, chapter and preprint pages.

Medium: two lines, but in a template of each of three application
repositories, each its own PR.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliations-space-before-comma/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps and reads the
  affiliations line as shown and as served; its `neighbour` mode reads
  the one-affiliation pages. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliations-space-before-comma/walk.js [steps|neighbour]`.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL
  18, with pkp/datasets 384e28b (2026-10-12).
- Tips: `main` OJS 7c6fba2064, OMP eb93813147, OPS 1bc3f78888 (lib/pkp
  f4c2578c94 in all three); `stable-3_5_0` OJS 5fc74d6213, OMP
  486cbf9eb0, OPS 399c4ebca3. On 3.5 the separator line is at OJS line
  121, OMP 44 and OPS 138.
- 3.4 and 3.3, read in the code: OJS `upstream/stable-3_4_0` daf0ca971d
  and `stable-3_3_0` d7d9dd14ec `article_details.tpl`, OPS acd8ae704b
  and c5532e2161 `preprint_details.tpl`, print one
  `getLocalizedData('affiliation')`; OMP 0aec65441f `authors.tpl` prints
  one `getLocalizedAffiliation()` (3.3's 8e72fc8836 has no
  `authors.tpl`; `monograph_full.tpl` prints one). No list, no
  separator.
- Introduced: `git log -S'getAffiliations()'` on each template gives
  the three `#7135` commits in the header, each the first
  multiple-affiliations loop, with the separator on its own line.
- Not walked: an affiliation picked from the registry, the chapter
  page, the 3.5 diffs, third-party themes.
