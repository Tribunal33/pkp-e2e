# On an article, book or preprint page, screen readers announce the ROR logo beside an affiliation or funder as an unnamed link

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (affiliations only; no funders)
  - 3.4: none (code; no ROR affiliations in core)
  - 3.3: none (code; no ROR affiliations in core)
- **Introduced** `pkp/ojs#2912` for `pkp/pkp-lib#5912` · [40a20117b9](https://github.com/pkp/ojs/commit/40a20117b9600a3612778eed5d5237cbccb15b7f) · 2020-11-26 · Dulip Withanage (withanage); the same link moved into core on the three apps with `pkp/pkp-lib#7135` (2025)
- **Upstream** `pkp/pkp-lib#12597` (open): the same missing label, reported for OPS affiliations. This report widens it to OJS, OMP and funders, and leaves that issue's other requests (a larger click area, the name as the link) to it.
- **Tracked in** spec U41 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a published article's, book's or preprint's page, each affiliation and
funder picked from the Research Organization Registry has a small ROR logo
beside its name. The logo is a link to the organisation's registry record,
but the link has no text and no label. A screen reader announces it as
a link with no name, with nothing to say what it leads to.

Usually the organisation's name is printed beside the logo, so only the
link's purpose is hidden. When the organisation was saved without a name
(pkp-e2e [#754](https://github.com/jardakotesovec/pkp-e2e/issues/754)),
the logo stands alone, and a screen-reader user meets only this unnamed
link.

The link is in the three apps' own page templates, which the default
theme uses. On a press, it shows only on books with fewer than five
contributors. With five or more, the book page lists names only, with no
logos.

## Impact

- **Lost.** Nothing that the page text does not carry. This fails WCAG
  2.4.4 "Link Purpose" and 1.1.1 "Non-text Content" (level A). When the
  name is missing (#754), a screen-reader user cannot learn the
  organisation's identity from the link either.
- **Who.** Screen-reader users reading a published item's page.
- **Way round.** None needed while the name is printed. Without it,
  following the link opens the registry record.

Low: a missing label on a link whose organisation is named in the text
beside it. In the nameless case, the lost name is #754's fault, rated
there. This link adds only that a screen reader cannot read out the
address either.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). The
  dataset's copy of the ROR registry holds the organisations the steps
  pick, so they save with their names.
- The browser can reach `api.ror.org`: the registry suggestions in
  steps 5 and 6 come from the browser calling it directly.
- A way to read a link's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the link, then Elements ›
  Accessibility › "Computed Properties" › "Name").

The steps use OJS submission 17, "Antimicrobial, heavy metal resistance
and plasmid profile of coliforms isolated from nosocomial infections in
a hospital in Isfahan, Iran", and its contributor Vajiheh Karbasizaed.
OMP uses submission 14, "From Bricks to Brains: The Embodied Cognitive
Science of LEGO Robots" (Michael Dawson). It has three contributors, so
the book page lists each with their affiliations. OPS uses submission 2,
"The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
Construct Equivalence" (Catherine Kwantes). All three are published and
have one version.

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 17's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
3. Press "Create New Version", choose "Minor Revision" under "Revision
   Significance" and press "Confirm". [3.5: press "Create New Version"
   in the publication page's header, then "Yes".]
4. Under the new version, open "Contributors" and press "Edit" on
   Vajiheh Karbasizaed.
5. Under "Affiliations", type `University of Ljubljana` into the search
   box and choose the suggestion "University of Ljubljana Slovenia" that
   carries the ROR logo. Press "Add", then "Save".
6. Open "Funding" and press "Add Funder". Type `Natural Sciences and
   Engineering Research Council of Canada`, choose the suggestion that
   carries the ROR logo, and press "Save". [3.5: there is no "Funding"
   page; skip this step.]
7. Press "Publish". In "Review Publishing Details" press "Confirm",
   then "Publish" in the confirmation. [OMP: "Publish", then "Publish".
   OPS: "Post", then "Post". 3.5 asks in one window.]
8. Open the article page
   (`/index.php/publicknowledge/en/article/view/17`; OMP:
   `/catalog/book/14`; OPS: `/preprint/view/2`). Read the accessible
   name of the ROR logo after "University of Ljubljana" and of the one
   after the funder's name under "Funders".

**Expected:** each logo link has a name that says where it leads, such
as "ROR record for University of Ljubljana".

**Observed:** both links have an empty accessible name, on the three
apps (3.5: the affiliation's link only). The browser's accessibility
tree on OJS:

```
- text: Vajiheh Karbasizaed University of Tehran , University of Ljubljana
- link:
  - /url: https://ror.org/05njb9z20
  - img
```

The funder's link is the same, pointing to
`https://ror.org/01h531d29`. Each link holds only the inline ROR logo,
which has no title and no label. Nothing fails on the server or in the
browser.

## Cause

The landing-page templates print the registry link with the logo as its
only content, and nothing names it:

```smarty
{if $affiliation->getRor()}<a href="{$affiliation->getRor()|escape}">{$rorIdIcon}</a>{/if}
```

`$rorIdIcon` is the content of lib/pkp `templates/images/ror.svg`, read
into the template by the app's page handler (OJS
`ArticleHandler::view()`, OMP `CatalogBookHandler::book()`, OPS
`PreprintHandler::view()`). The file is the registry's own logo
artwork. It has no `<title>` and no `aria-label`, so the link gets no
name from its content.

The same unnamed link, each checked in the code:

- OJS `templates/frontend/objects/article_details.tpl`: the affiliation
  and the funder.
- OPS `templates/frontend/objects/preprint_details.tpl`: the affiliation
  and the funder.
- OMP `templates/frontend/components/authors.tpl`: the affiliation, on
  the book page and the chapter page. With five or more contributors
  the template prints names only, with no link.
- OMP `templates/frontend/objects/monograph_full.tpl`: the funder.
- The editorial side has the same pattern in ui-library: the logo link
  beside the name in the contributor form's "Affiliations" table
  (`FieldAffiliations.vue`) and in the funder panel
  (`FieldFunder.vue`). Each sits next to a second link that shows the
  ROR address as text.

When an affiliation or funder has no name in any language (#754), the
template prints the logo link alone.

The ORCID iD link beside a contributor does not have the problem: its
text is the iD itself. The ORCID icon-only links on the masthead pages
carry an `aria-label` (`pkp/pkp-lib#10392`).

## Proposed fix

Give each landing-page ROR link a translated `aria-label` that names the
organisation. This follows `pkp/pkp-lib#10392`, which labelled the
masthead's icon-only ORCID link with "View {$name} ORCID profile". It
also matches the wording of the newer `common.orcidProfileFor`
("ORCID profile for …"). In pkp-lib, add one key:

```po
msgid "common.rorRecordFor"
msgstr "ROR record for {$name}"
```

Then use it in the six links in the three apps:

```smarty
{if $affiliation->getRor()}<a href="{$affiliation->getRor()|escape}" aria-label="{translate|escape key="common.rorRecordFor" name=$affiliation->getLocalizedName()|default:$affiliation->getRor()}">{$rorIdIcon}</a>{/if}
...
{if $funder->ror}<a href="{$funder->ror|escape}" aria-label="{translate|escape key="common.rorRecordFor" name=$funder->getLocalizedData('name')|default:$funder->ror}">{$rorIdIcon}</a>{/if}
```

`getLocalizedName()` and `getLocalizedData()` already fall back from the
reader's language to any language that has a name. So `default` fires
only when there is no name at all (#754), and the label then reads, for example, "ROR
record for https://ror.org/0213rcc28".

The diffs are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ror-logo-link-unnamed/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ror-logo-link-unnamed/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ror-logo-link-unnamed/fix-ops.diff).
Each carries the same pkp-lib locale change.

The fix was tried on `main` on the three apps. With it, the steps' links
read "ROR record for University of Ljubljana" and "ROR record for
Natural Sciences and Engineering Research Council of Canada". The
nameless case was read in the code, not walked.

**Alternatives:**

- A `<title>` or `role="img" aria-label="ROR"` inside `ror.svg`. This is
  one file in pkp-lib, and it would also reach other themes that print
  `$rorIdIcon` inside a link. But the name would say "ROR" only, in
  every language, and not which organisation the link is for. It can go
  in as well as the recommended fix.
- Making the organisation's name the link, as `pkp/pkp-lib#12597`
  suggests. That changes how the page looks, which is a design call.
  The label is needed in any case while the logo is a link.

**What goes with it:**

- Translations. The key is added in English, as pkp-lib adds new keys.
  pkp-lib does not fall back to English for a missing key: a page in a
  language whose `common.po` lacks it reads the label as
  `##common.rorRecordFor##` until translators add it. The ORCID link's
  key from `pkp/pkp-lib#10392`, `common.editorialHistory.page.orcidLink`,
  is in 35 of the 71 locales today.
- Left out: the editorial logo links (ui-library `FieldAffiliations.vue`,
  `FieldFunder.vue`). They need the same kind of label in another
  repository.
- Themes outside the three apps that copied this markup need the same
  change. None were checked.
- No stored data, API or plugin hook changes.
- Backport to 3.5 applies to the affiliation links. There the key goes elsewhere in `common.po`, since 3.5 has
  no `common.orcidProfileFor` to place it after.
- Guard: an e2e check on a published page that every `a[href^="https://ror.org/"]`
  has a non-empty accessible name, in the spec's landing-page scenario.

Medium: one new key in pkp-lib and one-line template changes in the
three apps make four repositories, though each change is mechanical.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ror-logo-link-unnamed/walk.js).
  It runs on an install freshly loaded with the default dataset and
  reads each ROR link's name from Playwright's accessibility snapshot:
  `node bin/probe.js all shared/playwright/checks/issues/ror-logo-link-unnamed/walk.js`.
  A control run reads the same pages on a freshly loaded dataset, which
  has no ROR link. Those pages were the same with and without the fix.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) on
  PostgreSQL, with pkp/datasets 566bb1f (2026-10-03).
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
  `ror.svg` is byte-identical in all four lib/pkp commits.
- 3.5 code: the same affiliation markup in the three templates, the
  same `ror.svg`, and `$rorIdIcon` assigned by the same three handlers.
- 3.4 and 3.3 (code): apps `stable-3_4_0` OJS d68934d0d1, OMP
  0aec65441f, OPS acd8ae704b; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161; lib/pkp 767353f4fe and ac3fa73402.
  - Core assigns no `$rorIdIcon`, the author schema has no ROR field,
    and lib/pkp has no `ror.svg`.
  - OJS `article_details.tpl` on both branches holds
    `<a href="{$author->getData('rorId')|escape}">{$rorIdIcon}</a>`.
    Core never sets either value, so only a separately installed ROR
    plugin shows that link, and labelling it is that plugin's concern.
    No such plugin was checked.
  - OMP and OPS have no ROR markup.
- Introduced: `git blame` on OJS's affiliation line gives 7b57fe02ed
  (`pkp/pkp-lib#12886`, re-indent only). Before it is 8eaab56f56
  (`pkp/ojs#4639` for `pkp/pkp-lib#7135`, 2025-02-05, bozana), which
  moved the 2020 link to the new affiliation objects. `git log -S` on
  `{$rorIdIcon}` gives the 2020 merge 40a20117b9 of `pkp/ojs#2912`
  ("ROR Id support for default template", for `pkp/pkp-lib#5912`). OPS
  99b51ba3d4 (`pkp/ops#856`) and OMP 17f2661a4 (`pkp/omp#1819`) added
  the markup with `pkp/pkp-lib#7135`. The funder lines came with
  `pkp/pkp-lib#12392`: OJS f396c7da65 (`pkp/ojs#5378`), OPS c873b8d0be,
  OMP e2c27be06f.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library. Only `pkp/pkp-lib#12597` matches. It has no
  comments and no linked pull request.
- Unverified: a non-English page with the fix in was not walked. The
  raw key there is read from the code (`PKP\i18n\Locale::translate()`
  has no English fallback). Screen readers other than the browser's
  accessibility tree were not used.
