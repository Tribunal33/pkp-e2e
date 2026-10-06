# A press's book page with five or more contributors shows "Name, ;" in place of every affiliation

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#1819` for `pkp/pkp-lib#7135` · [17f2661a46](https://github.com/pkp/omp/commit/17f2661a46cb67cabe295071223d64a81e8e42b5) · 2025-02-06 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a1) (the book page half; the workflow and wizard half is [its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A1-contributor-rows-no-affiliation.md))
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's book page, five or more contributors are not listed one
block each. They are listed in one compact byline, each meant to read
"Name, Affiliation". In that byline every affiliation is missing: a
contributor with an affiliation shows as "Name, ;", so the line reads
"Dietmar Kennepohl, ; Terry Anderson, ; …".

Readers of the book page do not see any contributor's institution, and
the press has no setting to avoid it. Only the display is wrong: the
affiliations are stored, and the book's other outputs (its metadata
tags for indexes, its ONIX export, the "Author Biographies" labels on
the same page) still carry them. The fix is one word in one template.

## Impact

- **Lost**: the affiliations in the book page's byline, with a stray
  comma in their place. Nothing stored is lost.
- **Who**: readers of a press's catalog, wherever a page lists five or
  more names: a book's contributors, a chapter page's authors, or an
  edited volume's volume editors (its chapter authors do not count).
  This holds in OMP's default theme, and in any theme that does not
  ship its own `frontend/components/authors.tpl`.
- **Way round**: none on screen. Removing contributors' affiliations
  only trades the comma for a bare name.

Medium: a public page shows a wrong field for some books, silently.

## Steps to reproduce

Preconditions: PKP's default test dataset for OMP `main`. Its
submission 7, "Accessible Elements: Teaching Science Online and at a
Distance", is in Copyediting with five contributors, each with an
affiliation. Nothing else is needed.

1. Sign in as `dbarnes`.
2. From "Active submissions", open submission 7 "Accessible Elements:
   Teaching Science Online and at a Distance".
3. Press "Preview" in the header of the submission's workflow.

**Expected**: the book page's credits read "Dietmar Kennepohl,
Athabasca University; Terry Anderson, University of Calgary; Paul
Gorsky, University of Alberta; Gale Parchoma, Athabasca University;
Stuart Palmer, University of Alberta".

**Observed**: the credits read

```
Dietmar Kennepohl, ; Terry Anderson, ; Paul Gorsky, ; Gale Parchoma, ; Stuart Palmer,
```

Control: the published book 14, "From Bricks to Brains: The Embodied
Cognitive Science of LEGO Robots", has three contributors, and its page
lists each in its own block with its affiliation ("Michael Dawson",
"University of Alberta", …).

## Cause

`templates/frontend/components/authors.tpl`, in the branch for five or
more contributors, captures the affiliation names into
`$authorAffiliations` and then passes `$authorAffiliation`, a variable
that is never assigned, to the `submission.authorWithAffiliation` text
("{$name}, {$affiliation}"):

```smarty
{capture assign="authorAffiliations"}<span class="value">{$author->getLocalizedAffiliationNamesAsString(null, ', ')|escape}</span>{/capture}
{translate key="submission.authorWithAffiliation" name=$authorName affiliation=$authorAffiliation}
```

So `{$affiliation}` is empty, and the comma from the text is left
before the `submission.authorListSeparator` ("; ").

`pkp/omp#1819` (multiple affiliations, `pkp/pkp-lib#7135`) renamed the
capture from `authorAffiliation` to `authorAffiliations` on the line
above. The `translate` call kept the old name. The same PR made the same
rename in `monograph_full.tpl` and `chapter.tpl` (the "Author
Biographies" labels), and there it changed both lines. Smarty does not
complain about an unassigned variable, so nothing failed.

Reach:

- The book page and its "Preview" (walked).
- The chapter page, which includes the same template with the
  chapter's authors, when a chapter has five or more (code).
- An edited volume's book page, which passes its volume editors to the
  same branch, when it has five or more (code).
- No other place: a search of the three apps' templates and plugins for
  `affiliation=$authorAffiliation` finds only this line. OJS and OPS
  have no five-or-more branch, and their `authorWithAffiliation` call
  passes the right variable.
- Themes: the template is OMP's own frontend template. The default
  theme, the only one OMP ships, uses it, as does any theme that does
  not override `frontend/components/authors.tpl`.
- Not reached: the stored affiliations, the Google Scholar meta tags
  (`GoogleScholarPlugin` loops `getAffiliations()`), the ONIX export
  (`MonographONIX30XmlFilter` likewise) and the "Author Biographies"
  labels (`monograph_full.tpl`, which passes the right variable).

## Proposed fix

Pass the variable the line above captures, as `monograph_full.tpl` and
`chapter.tpl` already do for the same text.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-long-credits-dangling-comma/fix.diff):

```diff
--- a/templates/frontend/components/authors.tpl
+++ b/templates/frontend/components/authors.tpl
@@ -102,7 +102,7 @@
 						{capture assign="authorName"}<span class="label">{$author->getFullName()|escape}</span>{/capture}
 					{/if}
 					{capture assign="authorAffiliations"}<span class="value">{$author->getLocalizedAffiliationNamesAsString(null, ', ')|escape}</span>{/capture}
-					{translate key="submission.authorWithAffiliation" name=$authorName affiliation=$authorAffiliation}
+					{translate key="submission.authorWithAffiliation" name=$authorName affiliation=$authorAffiliations}
 				{else}
 					<span class="label">{$author->getFullName()|escape}</span>
 				{/if}
```

Tried on OMP `main`: the credits read "Dietmar Kennepohl, Athabasca
University; Terry Anderson, University of Calgary; …" for all five,
and book 14's page was unchanged. A sixth contributor added to
submission 7 without an affiliation still showed as a bare name with
no comma, with the fix in and out.

**Alternatives**:

- Rename the capture back to `authorAffiliation`. That works too, but
  `monograph_full.tpl` and `chapter.tpl` use the plural, and the value
  can hold several affiliations.

**What goes with it**:

- No data repair.
- Backport: the same diff applies to `stable-3_5_0` (line 79 there)
  with an offset. 3.4 and 3.3 need nothing.
- Guard: a check on a book page with five or more contributors that
  each affiliation is shown.

Small: one variable name in one template.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-long-credits-dangling-comma/walk.js),
  which takes the Steps and the control and reads the credits block
  (`.item.authors`) as text and markup. `MODE=neighbour` adds the sixth
  contributor without an affiliation first.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL, with
  pkp/datasets 566bb1f (2026-10-03). On 3.5, `authors.tpl` lines 78
  and 79 hold the same capture and call.
- Tips: `main` OMP 3b0ecf794c; `stable-3_5_0` OMP 9c5e24246c.
- 3.4 (code): OMP `stable-3_4_0` 0aec65441f `authors.tpl` captures
  `authorAffiliation` and passes `$authorAffiliation` (lines 65, 66),
  so the affiliation is filled. 3.3 (code): OMP `stable-3_3_0`
  8e72fc8836 has no `authors.tpl`; `monograph_full.tpl` holds the
  five-or-more branch and captures and passes `$authorAffiliation`
  (lines 147, 148).
- Introduced: `git blame` on the `translate` line gives 4c8262e2ac
  (2021-11-11), written when the capture had that name. 17f2661a46
  (authored by Bozana Bokan, 2025-01-30) renamed the capture and left
  the `translate` line.
- Upstream: `pkp/pkp-lib#7621` (closed, 2021) is about HTML shown in
  this same compact byline, an escaping fault fixed then: a different
  fault.
- Not driven: the chapter page and the edited volume with five or more
  names (code reads above); a published book (the "Preview" renders the
  same template for the same publication); third-party themes.
