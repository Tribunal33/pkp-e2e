# Book page: a publication format's URN is labelled "other::urn" and is not linked

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; a format's DOI too)
- **Introduced** `pkp/omp#152` for `pkp/pkp-lib#836` · [891fda6cec](https://github.com/pkp/omp/commit/891fda6cecc33886602a20ce8f7bcfcbf2bb1e4f) · 2015-10-28 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Under an approved, available publication format on a press's book page,
the format's URN is shown under the label "other::urn" and as plain
text. A journal's article page labels a URN "URN" and links it to the
resolver, which is what readers expect.

It shows wherever the URN plugin is on with "Publication Formats" ticked
and a format has an assigned URN. On 3.3, a format's DOI is shown the
same way, under the label "doi" and unlinked, wherever the DOI plugin
assigns DOIs to publication formats.

## Impact

- **Lost**: nothing stored; readers get no link to the resolver and read
  a code as the label.
- **Who**: every visitor to the book page of a press that assigns URNs
  to publication formats (the URN plugin is off by default); on 3.3 also
  of a press that assigns DOIs to them.
- **Way round**: a reader can copy the identifier into a resolver; the
  press has no setting that changes the label or adds the link.

Low: the identifier shown is correct; only its label and link are wrong.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`. Submission 14, "From Bricks
  to Brains: The Embodied Cognitive Science of LEGO Robots", is
  published with one publication format, "PDF", which reads "Approved"
  and "Available". The steps switch on the URN plugin, which the dataset
  leaves off.

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's "Settings": tick "Publication Formats"; "URN Prefix"
   `urn:nbn:de:0000-`; leave "Use default patterns." selected;
   "Namespace" `urn:nbn:de`; "Resolver URL" `https://nbn-resolving.de/`;
   "Save".
4. Open submission 14, Publication › "Publication Formats"; on the "PDF"
   row, the arrow › "Edit".
5. The "Identifiers" tab shows the preview "urn:nbn:de:0000-jpk.14.3":
   tick "Assign the URN to this publication format", "Save".
6. Sign out and open the book page,
   `/index.php/publicknowledge/catalog/book/14`.
7. Read the format details under the book's other details.

**Expected:** the URN is labelled "URN" and shown as a link whose text
and target are the resolver address followed by the URN,
`https://nbn-resolving.de/urn:nbn:de:0000-jpk.14.3`.

**Observed:** the label reads `other::urn` and the value
`urn:nbn:de:0000-jpk.14.3`, as plain text with no link.

## Cause

`templates/frontend/objects/monograph_full.tpl`, the "PubIDs" loop
inside each publication format (OMP `main` lines 579–592, from its
`{foreach}` to its `{/foreach}`), prints the pub-id plugin's storage key
as the row's heading and the stored value as text:

```smarty
<h2 class="label">
	{$pubIdType}
</h2>
<div class="value">
	{$storedPubId|escape}
</div>
```

`$pubIdType` is `$pubIdPlugin->getPubIdType()`, which for the URN plugin
is `other::urn`, the key under which the value is stored
(`pub-id::other::urn`). It is not meant for readers: every pub-id plugin
also offers `getPubIdDisplayType()` ("URN") and
`getResolvingURL($contextId, $pubId)` (the press's resolver setting
followed by the URN; the URN settings form requires the resolver). The
other reader templates use those two: OJS `article_details.tpl` and
`issue_toc.tpl`, and OPS `preprint_details.tpl`.

The label line was written in 891fda6cec, the restyled book page (2015).
A typo in its condition (`$storePubId`) kept the block empty until
edcfd47ef (`pkp/omp#259`, 2016-04-04) fixed the name; from then on the
book page labelled a format's DOI "doi". The URN plugin (825986f47,
2016) added the key `other::urn`.

In 2017, 749f84f7db moved the loop from a list of type keys to the
plugin objects. The display name and the resolver were then within the
template's reach, but the label stayed the key.

Reach:
- The only reader template that labels a pub id with its storage key
  (searched in the code: every `templates/` and `plugins/` `.tpl` in
  OJS, OMP and OPS, and `lib/pkp/templates`).
- 3.3: the DOI plugin is still a pub-id plugin there, so a format's DOI
  goes through the same loop and reads "doi", unlinked (code).
- Out of scope, a separate fault: a switched-off URN plugin still
  reaches the loop, and its stored URNs stay on the book page (walked:
  with the plugin off, book 14 still showed the row). OMP's URN plugin
  descriptor marks the plugin as always loaded, so the "enabled only"
  list `CatalogBookHandler` reads still holds it; that fault has its
  own report,
  [U24-OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U24-OMP3-press-identifiers-page-stays-after-plugin-off.md).
  After the fix below, such a row reads "URN" with a link.
- Not this fault: the monograph's own URN and chapter URNs, which the
  book page does not show at all (U44
  [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp3)).

## Proposed fix

Label the row with the plugin's display name and link the value to its
resolving address, as the journal's article page does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-format-urn-code-label/fix.diff),
against OMP `main`):

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
+											<a href="{$resolvingUrl|escape}">
+												{$resolvingUrl|escape}
+											</a>
 										</div>
 									</div>
 								{/if}
```

This follows `article_details.tpl` with two differences. The article
page falls back to the bare identifier when there is no resolving
address, which cannot happen here: the URN plugin requires its resolver,
and 3.3's DOI plugin has a fixed one. And the article page's link
carries `id="pub-id::<type>"`, which would repeat on a book page that
lists several formats. Tried on OMP `main`: the book page read "URN"
with the link `https://nbn-resolving.de/urn:nbn:de:0000-jpk.14.3`, and a
book whose format has no URN still showed no format details, as before.

**Alternatives:**
- Change `getPubIdType()` to "URN": no, it is the storage key used by the
  database, the REST API and the export plugins.
- A locale key per type in the template: the plugins already carry the
  display name, and a new pub-id plugin would need a template change.

**What goes with it:**
- No stored data changes; no API or hook changes.
- Themes that carry their own copy of `monograph_full.tpl` keep the old
  label until they take the change (which ones do was not checked).
- Backport: the diff applies to 3.5, 3.4 and 3.3 with only a line
  offset; on 3.3 it also gives a format's DOI the label "DOI" and a link.
- Guard: an e2e check that the book page labels a format's URN "URN"
  and links it to the resolver.

Small: a few lines in one template, with no data or API change.

## Evidence

- Walk script, kept in this repo:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-format-urn-code-label/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/book-page-format-urn-code-label/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). `WALK=neighbour` in front runs the
  check that the fix reaches no further: after steps 1–5, the URN plugin
  switched off, then the book pages of submissions 14 and 5 (5's "PDF"
  is approved and available, with no URN). With and without the fix,
  book 5 showed no format details; book 14 still showed its row (the
  switched-off plugin, Cause), as "other::urn" in plain text without the
  fix and as "URN" with the link with it. The fix was tried with an
  `{else}` fallback to the bare identifier, since dropped as unreachable.
  Neither the fault nor the fix depends on the database.
- Tips: `main` OMP 3b0ecf794 (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  9c5e24246 (lib/pkp cf3f984335); `stable-3_4_0` OMP 0aec65441 (lib/pkp
  32b0f4b4af); `stable-3_3_0` OMP 8e72fc883 (lib/pkp f6ab331645).
- 3.4 and 3.3 (code): `monograph_full.tpl` has the same loop with
  `{$pubIdType}` (from `{foreach}` to `{/foreach}`: 3.5 and 3.4 lines
  530–543, 3.3 lines 605–618); the URN plugin (`URNPubIdPlugin.php` on
  3.4, `.inc.php` on 3.3) returns `other::urn` and "URN" on both. On 3.3,
  `plugins/pubIds/doi` returns `doi` and "DOI" and assigns format DOIs
  (`enableRepresentationDoi`), and the format block has no DOI line of
  its own.
- Introduced: `git blame` on line 585 gives 749f84f7db (2017-02-27,
  `pkp/pkp-lib#1815`, Alec Smecher); blame at its parent gives
  891fda6cec (`pkp/omp#152`), which wrote the label line; edcfd47ef
  (`pkp/omp#259`) only corrected the condition's variable name.
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library, issues and
  PRs, for `"other::urn"`, "URN publication format book page", "URN
  publication format label", "URN label book page", "URN book page",
  "URN not linked resolver", `getPubIdDisplayType` and "monograph_full
  pubIdType". `pkp/pkp-lib#958` (closed 2016) is about the identifier
  block showing when empty, not its label.
