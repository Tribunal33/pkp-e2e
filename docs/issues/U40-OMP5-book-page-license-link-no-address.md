# Book page: with press License Terms and no book license, a "License" link reloads the page

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#1975` for `pkp/pkp-lib#10921` · [b3f1d8bc47](https://github.com/pkp/omp/commit/b3f1d8bc47f3ffdc68a28a12ff020d469762d392) · 2025-05-02 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U40 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#omp5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When a press has set License Terms (Settings › Distribution ›
"License") and a book has no License URL of its own, the book page's
"License" block shows a link labelled "License" above the terms.
Clicking it reloads the book page. A journal and a preprint server show
the heading and the terms alone in that case.

A reader meets it on the page of every book without its own License
URL, once the press has terms.

## Impact

- **Lost**: nothing; a reader who clicks "License" expecting the
  license's text gets the same page back.
- **Who**: any reader of such a book page; on a press that sets terms
  and never chooses a license, that is every book.
- **Way round**: for a book already published, an editor unpublishes
  it, sets "License URL" on "Permissions & Disclosure" and publishes it
  again. Choosing a press license does not reach those books: a book
  takes the press license only when it is published without one.

Low: the terms are shown in full; the only fault is a link with no
target.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, press `publicknowledge`. The
  press has no default license and no License Terms. Its published book
  14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", carries no License URL.

1. Sign in as `dbarnes`.
2. Open "Settings" › "Distribution", the "License" tab
   (`/index.php/publicknowledge/en/management/settings/distribution`).
3. Leave "License" with no choice made. In "License Terms" type "Books
   of this press may be shared for teaching." and press "Save". "Saved"
   shows.
4. Sign out and open book 14's page
   (`/index.php/publicknowledge/en/catalog/book/14`).
5. In the side column's "License" block, click the "License" link.

**Expected:** the "License" block holds its heading and the License
Terms paragraph alone.

**Observed:** a link labelled "License" with an empty address sits
between the heading and the terms; clicking it reloads book 14's page.

```html
<div class="item license">
  <h2 class="label"> License </h2>
  <a href=""> License </a>
  <p>Books of this press may be shared for teaching.</p>
</div>
```

Control: the same steps on OJS (article 17) and OPS (preprint 2) give
the heading and the terms paragraph, with no link.

## Cause

OMP's `templates/frontend/objects/monograph_full.tpl` (lines 475–489 on
`main`) opens the "License" block when the press has License Terms or
the publication has a License URL. Inside it, anything that is not a
Creative Commons badge prints a link to the License URL:

```smarty
{if $currentContext->getLocalizedData('licenseTerms') || $publication->getData('licenseUrl')}
	<div class="item license">
		<h2 class="label">{translate key="submission.license"}</h2>
		{if $ccLicenseBadge}
			{$ccLicenseBadge}
		{else}
			<a href="{$publication->getData('licenseUrl')|escape}">
				{translate key="submission.license"}
			</a>
		{/if}
		{$currentContext->getLocalizedData('licenseTerms')}
	</div>
{/if}
```

`CatalogBookHandler::book()` passes the book's empty License URL to
`getCCLicenseBadge()`, which returns null, so with terms and no URL the
`{else}` prints `<a href="">`.

Before b3f1d8bc47 the block opened only on a License URL, so the
`{else}` always had an address to print. That change added the terms,
answering the second paragraph of `pkp/pkp-lib#10921` (whose title is
about the Press Summary): License Terms "should be [shown] to match the
behaviour in OJS". It widened the outer condition but left the inner
`{else}` unguarded. OJS's `article_details.tpl` and OPS's
`preprint_details.tpl` print the badge or the link only inside
`{if $publication->getData('licenseUrl')}`.

A book's own License URL is empty when it was published before the
press chose a license: lib/pkp's `Repository::publish()`
(`classes/publication/Repository.php` line 629) copies the press license
into a publication only when it is published without one.

Other places that print a License URL link (searched for `licenseUrl` in
every `.tpl` of OMP, its plugins and `lib/pkp/templates`):
- OMP's chapter page (`chapter.tpl`) opens its "License" block only when
  the chapter or the book has a License URL, so its links always have an
  address.
- No other template prints one.

## Proposed fix

Print the link only when there is a License URL
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-license-link-no-address/fix.diff),
against OMP `main`):

```diff
 					{if $ccLicenseBadge}
 						{$ccLicenseBadge}
-					{else}
+					{elseif $publication->getData('licenseUrl')}
 						<a href="{$publication->getData('licenseUrl')|escape}">
 							{translate key="submission.license"}
 						</a>
```

This keeps what b3f1d8bc47 was for: the terms still show, and the block
now matches the article page with terms and no license. Tried on OMP
`main`: book 14's "License" block then held the heading and the terms alone, and
a book with a License URL kept its link or its Creative Commons badge,
unchanged.

**Alternatives:**
- Copy OJS's nesting (an inner `{if licenseUrl}` around the badge and
  the link): the same result with one more level of nesting.
- Put the outer condition back to License URL only (a revert): the
  terms would disappear again from the book page.

**What goes with it:**
- No stored data, API or hook changes.
- Themes that carry their own copy of `monograph_full.tpl` keep the
  empty link until they take the change (which ones do was not checked).
- Backport: the diff applies as written to 3.5, 3.4 and 3.3, with a
  line offset only.
- Guard: an e2e check that a book page with License Terms and no license
  shows no link in its "License" block.

Small: one condition in one template, and an e2e check.

## Evidence

- Walk script, kept in this repo:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-license-link-no-address/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-license-link-no-address/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/book-page-license-link-no-address/walk.js`
  on installs freshly loaded from the default dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL).
- Neighbour check (`WALK=neighbour`, OMP only), run with and without the
  fix. After steps 1–3 it unpublishes book 14 and sets its License URL
  on "Permissions & Disclosure", first to
  `https://example.org/u40r4-license` and then to
  `https://creativecommons.org/licenses/by/4.0/`. After each change it
  reads the editor's preview of the book page. Both times, with and
  without the fix, the page showed the "License" link to that address,
  then the badge and its sentence with no other link, each followed by
  the terms. Neither the fault nor the fix depends on the database.
- Walked on OJS, OMP and OPS on `main` and 3.5. No request failed and
  no page script failed.
- Tips: `main` OMP 3b0ecf794 (lib/pkp 3dc90c81a6), OJS ff004d0973
  (lib/pkp 987776cd04), OPS c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OMP 9c5e24246 (lib/pkp cf3f984335), OJS c1cee76b95
  (lib/pkp 771474347e), OPS 38b61882d3 (lib/pkp cf3f984335);
  `stable-3_4_0` OMP 0aec65441, OJS d68934d0d1, OPS acd8ae704b (lib/pkp
  767353f4fe); `stable-3_3_0` OMP 8e72fc883, OJS ac77c9fb35, OPS
  c5532e2161 (lib/pkp ac3fa73402).
- 3.5 (walked and read), 3.4 and 3.3 (code): `monograph_full.tpl` has the
  same block (3.5 and 3.4 lines 426–440, 3.3 lines 504–518, condition
  to `{/if}`). The 2025 change was backported to those branches, which
  is why they show it: `pkp/omp#1974` (3.5, beec4007e),
  `pkp/omp#1976` (3.4, 5e274a2bb) and `pkp/omp#1977` (3.3, 97eae109d).
  `CatalogBookHandler` (`.inc.php` on 3.3) assigns `ccLicenseBadge` from
  the License URL on each. OJS `article_details.tpl` and OPS
  `preprint_details.tpl` guard the link with `{if
  $publication->getData('licenseUrl')}` on 3.4 and 3.3 too.
- Introduced: `git blame` on the outer condition (line 475) gives
  b3f1d8bc47, merged in `pkp/omp#1975`. The `{else}` (lines 480–486)
  dates from 2016; until b3f1d8bc47 it always had an address to print,
  because the block opened only on a License URL.
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library, issues and
  PRs, for "license link empty monograph", "license terms" monograph,
  "license link", "monograph_full license" and "License link book page
  href". `pkp/pkp-lib#10921` (closed) is the issue the introducing change
  fixed; `pkp/pkp-lib#1818` (closed, 2016) asked for a badge in place of
  a "Licensing" link, a different matter.
