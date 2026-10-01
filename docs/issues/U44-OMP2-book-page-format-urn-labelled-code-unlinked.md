# Book page: a publication format's URN is headed "other::urn" and shown as plain text, not linked

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; a format's DOI also shows under the code "doi")
- **Introduced** `pkp/omp#152` · [891fda6c](https://github.com/pkp/omp/commit/891fda6cecc33886602a20ce8f7bcfcbf2bb1e4f) · 2015-10-28 · Nate Wright (NateWr). The heading copies the type code from the 2012 format template ([4540e895](https://github.com/pkp/omp/commit/4540e8951e1dfca0f37e200dc83a7839752fe2f1)).
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Readers of a press's book page see a publication format's URN under
the heading "other::urn". That heading is the system's internal code
for a URN. The URN itself is plain text, not a link. On a journal, an
article's URN is headed "URN" and links to the resolver address.

The URN shown is right, so readers can copy it into a resolver by
hand, but they cannot follow it. The fix is one block in one template.

It shows only on a press that uses the URN plugin with "Publication
Formats" ticked and has assigned a format's URN. The book page shows
no other URN to compare with: chapter URNs appear on no reader page,
and whether the book's own URN should appear is an open question of
its own.

## Impact

- **Lost.** Nothing is stored wrong; the page's heading and link are.
- **Who.** Readers of a press that assigns URNs to its publication
  formats, on every such book page. OMP ships only its default theme,
  which uses this core template. The URN plugin is off by default.
- **Way round.** None for the press: no setting changes the heading or
  adds the link, short of a theme with its own copy of the template.

Low: a wrong heading and a missing link where the URN shown is right.
It would be medium if the URN itself were missing or wrong.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. Submission 14, "From Bricks to
  Brains: The Embodied Cognitive Science of LEGO Robots", is published,
  and its one publication format, "PDF", is approved and available.
  The URN plugin is off in the dataset; turning it on is part of the
  steps.

Setting up the URN plugin:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Website, tab "Plugins". In the "URN" row, tick the
   box to enable the plugin.
3. Open the row's "Settings". In the window "URN", under "Press
   Content", tick "Publication Formats".
4. "URN Prefix": `urn:nbn:de:0000-`. "URN Suffix": leave "Use default
   patterns." selected. "Namespace": "urn:nbn:de". "Resolver URL":
   `https://nbn-resolving.de/`. "Save".

Assigning the format's URN:

5. Sign in as `dbarnes` (Press editor) and open submission 14.
6. Open Publication › "Publication Formats". In the row "PDF", open the
   arrow, then "Edit".
7. Open the tab "Identifiers". Under "URN" it previews
   `urn:nbn:de:0000-jpk.14.3`, and the box "Assign the URN to this
   publication format" is ticked. "Save".

Reading the book page:

8. Sign out, and open the book page of submission 14
   (`/index.php/publicknowledge/en/catalog/book/14`).
9. Look at the last block of the details column, under the format's
   information.

**Expected:** the heading "URN" over a link whose text and target are
the resolver address followed by the URN,
`https://nbn-resolving.de/urn:nbn:de:0000-jpk.14.3`, as a journal's
article page shows an article's URN.

**Observed:** the block reads

```
other::urn
urn:nbn:de:0000-jpk.14.3
```

with "other::urn" as the block's heading and the URN as plain text.
The page holds no link to the resolver.

## Cause

OMP's `templates/frontend/objects/monograph_full.tpl` prints, for each
approved format, one block per public-identifier plugin that has a
stored value (lines 579–592). The block's heading is `{$pubIdType}`
(line 585), the plugin's `getPubIdType()`. That is the identifier's
storage key, `other::urn` for the URN plugin (the settings are named
`pub-id::other::urn`), not a name for readers. The value is printed as
`{$storedPubId|escape}` (line 588), with no link.

Every public-identifier plugin also gives a reader's name and a link:
`PKPPubIdPlugin` declares `getPubIdDisplayType()` and
`getResolvingURL()` as abstract, and `URNPubIdPlugin` answers "URN" and
the "Resolver URL" setting followed by the URN. The journal and
preprint pages use both: OJS's `article_details.tpl` (lines 521–542)
and `issue_toc.tpl`, and OPS's `preprint_details.tpl`, head the block
with `getPubIdDisplayType()` and link `getResolvingURL()`. OMP's book
page is the one reader page that does not.

The heading has been the type code since identifiers first reached the
book page; Evidence gives the trace.

Reach:

- Any other public-identifier plugin a press installs shows its type
  code the same way (checked in the code). The URN plugin is the only
  one OMP ships from 3.4 on.
- DOIs, from 3.4 on: DOIs are part of the application, not a plugin,
  and the book page shows the book's, each chapter's and each format's
  DOI in blocks of their own, headed "DOI" and linked (checked in the
  code on 3.4, 3.5 and `main`).
- DOIs on 3.3: the DOI plugin is still a public-identifier plugin, so a
  format's DOI shows in this same block under the code "doi" and is not
  linked (checked in the code, not driven). The book's and chapters'
  DOI blocks on the same page are headed "DOI" and linked.
- Other URNs: neither `monograph_full.tpl` nor the chapter page
  (`chapter.tpl`) reads a chapter's URN, and nothing reads the book's
  own URN, which the spec holds as an open question (checked in the
  code).
- Themes: OMP ships only `plugins/themes/default`, which has no
  templates of its own, so the core template is the only copy in OMP.

## Proposed fix

Head the block with the plugin's `getPubIdDisplayType()` and link the
value through `getResolvingURL()`, as the OJS and OPS templates do
(tried on `main`):
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-format-urn-labelled-code-unlinked/fix.diff).

```diff
 								{if $storedPubId != ''}
+									{assign var=resolvingUrl value=$pubIdPlugin->getResolvingURL($currentContext->getId(), $storedPubId)}
 									<div class="sub_item pubid {$publicationFormat->getId()|escape}">
 										<h2 class="label">
-											{$pubIdType}
+											{$pubIdPlugin->getPubIdDisplayType()|escape}
 										</h2>
 										<div class="value">
-											{$storedPubId|escape}
+											{if $resolvingUrl}
+												<a href="{$resolvingUrl|escape}">
+													{$resolvingUrl|escape}
+												</a>
+											{else}
+												{$storedPubId|escape}
+											{/if}
 										</div>
 									</div>
```

It uses only the two methods every public-identifier plugin must
implement, so it serves any such plugin, and it keeps the plain value
for a plugin that returns no address. The link has no `id`, unlike the
article page's, because a book page can list several formats. With the
fix in, the Steps show the Expected, and the rest of the book page is
unchanged (Evidence).

**Alternatives:**

- Hard-code a "URN" heading and the resolver for `other::urn`: it would
  fix the URN only, where the plugin methods serve every plugin.
- A locale key for the heading: the plugin already supplies its name,
  and the article page uses that name too.

**What goes with it:**

- No data or API change. A third-party theme with its own copy of
  `monograph_full.tpl` keeps the old heading until it takes the change.
- Backport: the diff applies unchanged to `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0` (`patch` finds the block at another
  line). On 3.3 it is meant to fix the format's DOI as well: the same
  lines head it "DOI" and link it to `https://doi.org/`, as the page's
  book and chapter DOI blocks already are.
- A guard: a check in pkp-e2e's
  [identifiers spec](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md)
  that reads the book page's heading and link after a format's URN is
  assigned. Templates have no unit tests in the app.

Small: one block of one template, following the OJS and OPS templates.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-format-urn-labelled-code-unlinked/walk.js)
  takes steps 1–9 on a fresh load of the default dataset and reads,
  signed out, every identifier block under the book page's formats
  (heading, value, link):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-format-urn-labelled-code-unlinked/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With `PHASE=neighbour`
  in front, the same script only reads, signed out, the book pages of
  submission 5 (whose format has no URN) and submission 14 (after the
  Steps), to check what the fix must leave alone.
- The fix was tried with `node bin/try-fix.js apply
  shared/playwright/checks/issues/book-page-format-urn-labelled-code-unlinked/fix.diff omp`,
  then `walk.js` on a fresh load and `PHASE=neighbour`, then
  `node bin/try-fix.js revert omp`. With the fix in, step 9 showed "URN"
  over the link `https://nbn-resolving.de/urn:nbn:de:0000-jpk.14.3`.
  Everything else on both book pages read the same with the fix in and
  out, and submission 5's page showed no identifier block either way.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): OMP `main` and `stable-3_5_0`,
  every step, with the same result. OJS and OPS have no publication formats; their
  article and preprint pages were read in the code, not driven for this
  report.
- 3.4 and 3.3 were read in the code: OMP's `monograph_full.tpl` on
  `upstream/stable-3_4_0` (lines 530–543) and `upstream/stable-3_3_0`
  (lines 605–618) hold the same block; the URN plugin on both answers
  `getPubIdDisplayType()` "URN" and `getResolvingURL()` from
  "Resolver URL"; on 3.3 the DOI plugin (`DOIPubIdPlugin.inc.php`,
  type `doi`) feeds the same loop, and `PKPTemplateManager` assigns
  `currentContext`. On 3.4, 3.5 and `main` the book, chapter and format
  DOIs come from each object's `doiObject` in blocks of their own, and
  `plugins/pubIds` holds only `urn`. The chapter page `chapter.tpl` and
  the default theme (no `templates/` folder) were read on `main`. The
  fix's dry run (`patch --dry-run`) applies to each branch's template
  with an offset (3.5 and 3.4 at line 531, 3.3 at line 606).
- Tips: `main` OMP 3b0ecf794 (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  3081c9b00 (lib/pkp a9c76aed62); `stable-3_4_0` OMP 0aec65441 (lib/pkp
  df13621c2d); `stable-3_3_0` OMP 8e72fc883 (lib/pkp d446601ebe).
- Introduced: `git blame` on line 585 lands on 749f84f7 (2017,
  `pkp/pkp-lib#1815`), which switched the loop from type names to
  plugin objects and kept `{$pubIdType}` as the heading. `git log -S`
  traces that heading to 891fda6c (`pkp/omp#152`, the 2015 book-page
  redesign), which moved it into `monograph_full.tpl`. Before the
  redesign, 4540e895 (2012, Jason Nugent, "port DOI plugin and pubId
  framework from OJS to OMP") printed `pub-id::{$pubIdType}:` in
  `templates/catalog/book/bookPublicationFormatInfo.tpl`. 891fda6c
  tested a misspelt `$storePubId`, so the block did not render until
  edcfd47e (`pkp/omp#259`, Bozana Bokan, 2016-04-04) fixed the name;
  from then a format's DOI was headed "doi". The URN plugin arrived in
  OMP with 825986f4 (`pkp/omp#306` for `pkp/pkp-lib#1527`, 2016-07-12),
  and with it "other::urn".
- Upstream: pkp/pkp-lib searched for "other::urn", "URN book page
  label", "URN publication format", "URN link resolver", "URN OMP book
  page", "getPubIdDisplayType", "monograph_full pubIdType" and
  "publication format identifier label book page"; pkp/omp for
  "other::urn", "URN", "pubIdType", "monograph_full pubid" and "book
  page identifier"; pkp/ui-library for "URN". `pkp/pkp-lib#958`
  (closed, 2015–2016) shaped the book page's identifier display and
  describes the intended look as "DOI: http://dx.doi.org/…", but did
  not change the heading. `pkp/pkp-lib#10926` (URNs missing from an OJS
  table of contents) is another matter.
- Unverified: how the page reads with a third-party public-identifier
  plugin, or with a theme other than the default one.
