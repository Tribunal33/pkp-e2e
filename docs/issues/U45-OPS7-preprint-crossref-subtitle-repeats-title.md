# A preprint server's Crossref file repeats the preprint's title where its subtitle belongs

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; 3.4's copy of the change, `pkp/crossref-ops#40`, passes the subtitle)
  - 3.3: none (code)
- **Introduced** `pkp/crossref-ops#39` for `pkp/pkp-lib#9959` · [9ceff74](https://github.com/pkp/crossref-ops/commit/9ceff74577db4298f7683668efe80d9a33d37575) · 2024-05-22 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U45 [OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ops7)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A preprint's "Subtitle" is missing from the Crossref file, its title
standing in its place: for "The influence of lactation on the quantity
and quality of cashmere production" with the subtitle "hkrb a plain
subtitle", the file's `<subtitle>` reads "The influence of lactation on
the quantity and quality of cashmere production".

"Export DOIs" and every deposit send the same file, and it passes
Crossref's schema check, so nothing warns the manager. A preprint
without a subtitle gets no `<subtitle>` in the file.

## Impact

- **Lost:** the subtitle in the preprint's Crossref record, which
  indexes and reference managers read.
- **Who:** every preprint server that registers DOIs with Crossref, for
  each preprint with a "Subtitle", once it is deposited or exported.
  Since OPS 3.5.0 (June 2025).
- **Way round:** only at the subtitle's cost. Clearing the "Subtitle"
  box, or moving its text into "Title", stops the title being repeated,
  but the preprint then has no subtitle of its own, on its page and in
  every other export (by the code; not walked).
- **After a fix:** a record already sent stays wrong until the preprint
  is deposited again, and nothing does that on its own: "Deposit All"
  and the automatic deposit take only "Unregistered", "Error" and
  "Needs Sync" DOIs, so a manager has to tick each registered preprint
  on the DOIs page and press "Deposit DOIs".

Medium: one field of the record is wrong, silently, for every preprint
with a subtitle, while its title, DOI and link are right, and the way
round costs the subtitle. It would be high if the title itself went out
wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`.
- The install reaches crossref.org: "Export DOIs" checks the file
  against Crossref's schema, which it fetches from there. Without it the
  export shows an "Error" window, "An XML validation error occurred and
  the XML could not be exported.", and nothing downloads.
- The dataset has DOIs on with no prefix and no registration agency,
  so the steps turn on the Crossref plugin and choose it.
- No preprint in the dataset has a subtitle, so the steps type one.

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": type `10.1234` in "DOI
   Prefix" and press "Save".
4. "Registration": choose "Crossref" under "Registration Agency", type
   `Public Knowledge Project` in "Depositor name" and
   `dbarnes@mailinator.com` in "Depositor email", and press "Save".
5. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production", then "Preprint" › "Title &
   Abstract".
6. In "Subtitle", type `hkrb a plain subtitle` and press "Save".
7. Press "Post" and confirm "Post".
8. Open "DOIs" in the side menu, tick the row numbered 1, and choose
   "Bulk Actions" › "Assign DOIs", then confirm.
9. Tick the row again, choose "Bulk Actions" › "Export DOIs" and confirm
   "Export DOIs". Open the downloaded file and read its `<titles>`.

**Expected:**

```xml
<titles>
  <title>The influence of lactation on the quantity and quality of cashmere production</title>
  <subtitle>hkrb a plain subtitle</subtitle>
</titles>
```

**Observed:**

```xml
<titles>
  <title>The influence of lactation on the quantity and quality of cashmere production</title>
  <subtitle>The influence of lactation on the quantity and quality of cashmere production</subtitle>
</titles>
```

This file was not downloaded at step 9. The test install the steps
were walked on cannot fetch Crossref's schema, so its "Export DOIs"
showed the "Error" window instead; the file above is the one the
export builds, read through the Crossref plugin's own `exportXML()`
right after (Evidence).

The save stored the subtitle `hkrb a plain subtitle`, and the
workflow's heading reads "The influence of lactation on the quantity
and quality of cashmere production: hkrb a plain subtitle". A journal
is the control: the same steps on OJS submission 5 ("Publication" ›
"Title & Abstract", then "Publish" into "Vol. 1 No. 2 (2014)") give
`<subtitle>hkrb a plain subtitle</subtitle>`.

## Cause

`PreprintCrossrefXmlFilter::createPostedContentNode()` in OPS's
Crossref plugin reads the subtitle and then passes it to the title
getter as if it were a language
([line 181](https://github.com/pkp/crossref-ops/blob/8e82eda7ccd0ddb0711a6073850f14c4ebbe8680/filter/PreprintCrossrefXmlFilter.php#L179-L182)):

```php
if ($subtitle = $publication->getLocalizedSubTitle($submission->getData('locale'), 'html')) {
    $titlesNode->appendChild($node = $doc->createElementNS($deployment->getNamespace(), 'subtitle'));
    $node->appendChild($doc->createTextNode($publication->getLocalizedTitle($subtitle, 'html')));
}
```

`getLocalizedTitle($preferredLocale)` looks the title up through
`DataObject::getLocalizedData()` under the locale it is given. No title
is stored under the subtitle's text, so `getBestLocalizedData()` falls
back to the publication's own language
(`PKPPublication::getDefaultLocale()`), and the element gets the title,
with its "Prefix", in the preprint's language.

The line came in with `pkp/pkp-lib#9959`, which moved the title and
subtitle to `createTextNode()` so that a bare "&" would not break the
XML. Before it, the subtitle line wrote `$subtitle` itself. The same
change for `stable-3_4_0` (`pkp/crossref-ops#40`) passes `$subtitle`;
the one for `main` (`pkp/crossref-ops#39`) wrapped it in the title
getter, and `stable-3_5_0` took it from `main`.

Reach:

- OPS writes one `posted_content` record per posted version with a DOI,
  each through this line, so every such record of a preprint with a
  subtitle is hit (checked in the code; walked on a single version).
- OJS's `ArticleCrossrefXmlFilter` writes `$subtitle` itself (walked:
  the journal control above). OMP sends nothing to a registration
  agency. No other `getLocalized…(…$subtitle…)` call was found in the
  three apps' Crossref and DataCite filters.
- The subtitle that does reach the file after this fix still carries
  "&" and formatting as codes, the fault of
  [U45 A30](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A30-crossref-title-ampersand-italic-codes.md).

## Proposed fix

A proposal for the team to decide: pass the subtitle itself, as the
3.4 branch and OJS's filter do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-crossref-subtitle-repeats-title/fix.diff)):

```diff
-            $node->appendChild($doc->createTextNode($publication->getLocalizedTitle($subtitle, 'html')));
+            $node->appendChild($doc->createTextNode($subtitle));
```

A30's
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/fix-ops.diff)
rewrites the same line, in its `appendFaceMarkup($doc, $node,
$subtitle)` form, so landing it fixes this report too. The two diffs do
not apply one after the other: whichever lands second drops its hunk
for this line, since the other already carries the change.

Tried on `main`: the Steps then show the Expected, `<subtitle>hkrb a
plain subtitle</subtitle>`, and the file passes Crossref's 5.4.0
schema; nothing else in the file changes. Preprints without a subtitle
are not touched: for two posted ones (submissions 8 and 2) the file is
the same with and without the fix, with no `<subtitle>`, apart from the
random DOI suffix each fresh dataset load draws.

**Alternatives:**

- None.

**What goes with it:**

- No migration: the stored subtitles are right. Records already at
  Crossref are corrected by depositing each affected preprint again
  (see Impact).
- Backport: the diff applies to crossref-ops `stable-3_5_0` as it is;
  `stable-3_4_0` does not need it. OPS then takes a submodule update.
- A guard: a unit test exporting a publication with a subtitle and
  asserting `<subtitle>`. crossref-ops has no `tests/` folder yet, so
  it needs one set up; the U45 e2e scenario reading the Crossref file
  is a Planned item in the spec.

Small: one line in crossref-ops, followed by OPS's submodule update.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-crossref-subtitle-repeats-title/walk.js).
  It reads the file the export builds with A30's
  [read.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/read.php)
  (the Crossref plugin's own `exportXML()` and submission filter,
  validation off) and checks it with A30's `validate.php` (Crossref's
  5.4.0 schema from crossref.org, in a plain PHP process). Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-crossref-subtitle-repeats-title/walk.js [neighbour]`
  (`ojs` for the journal control); `PKP_E2E_LINE=stable-3_5_0` in
  front for 3.5. Apply the fix with
  `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-crossref-subtitle-repeats-title/fix.diff ops`.
- The test installs cannot reach crossref.org, so step 9's "Export
  DOIs" answered 400 with the "Error" window "An XML validation error
  occurred and the XML could not be exported. Failed to locate the main
  schema resource at 'https://www.crossref.org/schemas/crossref5.4.0.xsd'."
  instead of a download. The file of the Observed is the one `read.php`
  built for the same preprint right after; `validate.php` found it valid
  against Crossref's schema, so an install that reaches crossref.org
  exports it.
- Walked on OPS (and OJS as the control) on `main`, and OPS on
  `stable-3_5_0`, on PostgreSQL. The fault does not depend on the
  database. Datasets: pkp/datasets 7912e09 (2026-10-14).
- Not driven: "Deposit DOIs", "Deposit All" and the automatic deposit
  (the same `exportXML()` call, read in the code); a preprint with more
  than one posted version; a "Prefix"; 3.4 and 3.3.
- Unverified: how Crossref shows a record deposited this way, and that
  a new deposit replaces it (Crossref's documented rule for a
  redeposit; not tried). The test installs reach no agency.
- Code reads:
  - `main` and 3.5: the subtitle line of `PreprintCrossrefXmlFilter`
    (line 181 on `main`, 264 on 3.5); pkp-lib's
    `DataObject::getLocalizedData()` (line 71) and the `LocalizedData`
    trait's `getBestLocalizedData()` and `getLocalePrecedence()` (a
    given locale replaces the interface language; then
    `PKPPublication::getDefaultLocale()`, the context's and the site's
    primary locale).
  - 3.4: the subtitle line of crossref-ops `stable-3_4_0`; 3.3: OPS's
    `plugins/importexport/crossref` filter, which writes
    `htmlspecialchars($subtitle)` as the element's value.
  - OJS `ArticleCrossrefXmlFilter` line 188 (the control).
  - OPS `APP\doi\DAO::getAllDepositableSubmissionIds()`, line 71:
    "Deposit All" and the automatic deposit take "Unregistered",
    "Error" and "Needs Sync" DOIs only.
- `patch --dry-run` of fix.diff on crossref-ops `stable-3_5_0`: applies
  (offset 83 lines).
- The trace: `git log -L` on the subtitle line gives 9ceff74
  (2024-05-22, `pkp/crossref-ops#39` for `pkp/pkp-lib#9959`), which
  replaced `createElementNS(…, 'subtitle', $subtitle)` with the title
  getter; before it, b697c0a and 1211f41 wrote `$subtitle`. OPS's tag
  `3_5_0-0` (2025-06-16) is the first release that carries 9ceff74.
- Upstream search (2026-10-15): pkp/pkp-lib, pkp/crossref-ops, pkp/ops
  and pkp/ui-library, issues and PRs, open and closed, by crossref,
  subtitle, preprint, title, deposit and by `getLocalizedTitle`. Read:
  `pkp/pkp-lib#5017` ("Submission subtitle not being stored in
  CrossRef", OJS 3.1, closed 2019: a different, older fault) and
  `pkp/pkp-lib#10135` (text-form decoding in the title getters, a
  different change). No hit is about a preprint's subtitle holding its
  title.
- The branch tips the walks and code reads used:
  - **`main`:** OPS 2ece50497f (crossref-ops 8e82eda), OJS 378eced941
    (crossref-ojs a49e612), pkp-lib b17fadae59.
  - **`stable-3_5_0`:** OPS 44aec6e131 (crossref-ops 20f5409), pkp-lib
    4045d9241e.
  - **`stable-3_4_0`** (code): OPS acd8ae704b (crossref-ops 50cef72).
  - **`stable-3_3_0`** (code): OPS c5532e2161.
