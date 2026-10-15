# Crossref receives a title or subtitle typed with "&" or an italic word as the codes `&amp;` and `<i>…</i>`

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; plain-text "Title" and "Subtitle" boxes)
- **Introduced** `pkp/crossref-ojs#25` and `pkp/crossref-ops#22` for `pkp/pkp-lib#2564` · [a1a8d53](https://github.com/pkp/crossref-ojs/commit/a1a8d53754171df2eb40c7e582b731e96ef3e4c8) and [1211f41](https://github.com/pkp/crossref-ops/commit/1211f411995fe30e4d8da22961bfd0bf30172d9d) · 2023-02-16 · Touhidur Rahman (touhidurabir); the "&" escaped twice (`&amp;amp;` in the file) since `pkp/crossref-ojs#49` and `pkp/crossref-ops#39` for `pkp/pkp-lib#9959` · [56a573f](https://github.com/pkp/crossref-ojs/commit/56a573f6f085fd30d66d00d7a038635f72b4da7c) and [9ceff74](https://github.com/pkp/crossref-ops/commit/9ceff74577db4298f7683668efe80d9a33d37575) · 2024-05-22 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U45 [A30](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a30)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A title saved in the "Title" box as "hkrb forest trees & *shrubs*",
with the subtitle "rocks & sand", goes into the Crossref file escaped
twice: the file holds `hkrb forest trees &amp;amp; &lt;i&gt;shrubs&lt;/i&gt;`
and `rocks &amp;amp; sand`. Crossref therefore receives the text
`hkrb forest trees &amp; <i>shrubs</i>` and `rocks &amp; sand`: the
characters "&amp;" and "<i>" in the title, instead of an "&" and an
italic word.

The "Title" and "Subtitle" boxes save every typed "&" as `&amp;`, so
any title or subtitle with an "&" is hit, not only a formatted one.
"Export DOIs" and every deposit send the same file. The work's own page
shows the title right, and the file passes Crossref's schema check, so
nothing warns the manager.

## Impact

- **Lost:** a correct title and subtitle in the work's Crossref record,
  which indexes, reference managers and citation matching read.
- **Who:** every journal and preprint server that registers DOIs with
  Crossref, for each work whose "Title" or "Subtitle" holds an "&" or a
  formatted word (an italic species name, a superscript), or whose
  "Prefix" holds an apostrophe or an "&". Formatting has gone out this
  way since OJS and OPS 3.4.0 (2023), an "&" since 3.4.0-6 (July 2024).
  A press sends nothing to a registration agency, so OMP is not
  affected. The work's other fields go out without codes (abstract,
  contributor names, affiliations, references), except an "&" in a
  journal's funding statement, which is sent with Crossmark or DOI
  versioning on and is escaped twice the same way (by the code).
- **Way round:** none that keeps the title; only retyping it without
  "&" and without formatting. A record already sent stays wrong until
  the work is deposited again after a fix, and nothing redeposits it on
  its own: "Deposit All" and the automatic deposit take only
  "Unregistered", "Error" and "Needs Sync" DOIs, so a manager has to
  tick each registered work on the DOIs page and press "Deposit DOIs".

High rather than critical. What goes out to Crossref is wrong, silently,
for every work whose title or subtitle holds an "&" or formatting, on
every deposit since 2023, and the wrong records pile up there. But that
is a share of the titles, not most of them (how large was not counted:
species names and "&" are common in some fields and rare in others),
and the DOI, its link and the rest of each record are right. It would
be critical if most titles were hit.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OPS the same, with the
  differences in brackets).
- The install reaches crossref.org: "Export DOIs" checks the file
  against Crossref's schema, which it fetches from there. Without it the
  export shows an "Error" window, "An XML validation error occurred and
  the XML could not be exported.", and nothing downloads.
- The dataset has DOIs on with no prefix and no registration agency,
  so the steps turn on the Crossref plugin and choose it.
- The dataset holds no title saved from the "Title" box with "&" or
  italics, so the steps save one.

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": type `10.1234` in "DOI
   Prefix" and press "Save".
4. "Registration": choose "Crossref" under "Registration Agency", type
   `Public Knowledge Project` in "Depositor name" and
   `dbarnes@mailinator.com` in "Depositor email", and press "Save".
5. Open submission 5, "Genetic transformation of forest trees", then
   "Publication" › "Title & Abstract". [OPS: submission 1, "The
   influence of lactation on the quantity and quality of cashmere
   production", "Preprint" › "Title & Abstract".]
6. In "Title", replace the text with `hkrb forest trees & shrubs`,
   select "shrubs" and press Ctrl+I. Press "Save".
7. In "Subtitle", type `rocks & sand`. Press "Save".
8. Press "Publish". In the window, choose "Assign To Current/Back
   Issue" with "Vol. 1 No. 2 (2014)", press "Confirm", then "Publish".
   [3.5: "Issue" › "Assign to Issue", choose "Vol. 1 No. 2 (2014)",
   "Save", then "Schedule For Publication" and "Publish". OPS: press
   "Post" and confirm "Post".]
9. Open "DOIs" in the side menu, tick the row numbered 5 [OPS: 1], and
   choose "Bulk Actions" › "Assign DOIs", then confirm.
10. Tick the row again, choose "Bulk Actions" › "Export DOIs" and confirm
    "Export DOIs". Open the downloaded file in a text editor and read
    its `<titles>`.

**Expected:** the "&" escaped once, as XML requires, and the italic
word as Crossref's face markup, which its schema accepts in `<title>`
and `<subtitle>`:

```xml
<titles>
  <title>hkrb forest trees &amp; <i>shrubs</i></title>
  <subtitle>rocks &amp; sand</subtitle>
</titles>
```

**Observed:** the file as written, escaped twice:

```xml
<titles>
  <title>hkrb forest trees &amp;amp; &lt;i&gt;shrubs&lt;/i&gt;</title>
  <subtitle>rocks &amp;amp; sand</subtitle>
</titles>
```

The saves stored the title as `hkrb forest trees &amp; <i>shrubs</i>`
and the subtitle as `rocks &amp; sand`. [OPS: the same `<title>`; its
`<subtitle>` holds the title again, a separate fault:
[U45 OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-OPS7-preprint-crossref-subtitle-repeats-title.md).]

A title stored with a bare "&" goes out right: publish OJS submission 9,
"Hansen & Pinto: Reason Reclaimed", as in step 8 (OPS submission 8 is
already posted), and take steps 9 and 10 for it. The file reads
`<title>Hansen &amp; Pinto: Reason Reclaimed</title>`; the dataset
stores that title with a bare "&", where the "Title" box saves
`&amp;`.

## Cause

A publication's title and subtitle are HTML. Since `pkp/pkp-lib#2564`
the "Title" and "Subtitle" boxes are `FieldRichText`
([`TitleAbstractForm.php` lines 63 and 69](https://github.com/pkp/pkp-lib/blob/b17fadae59156c99746754a740caf75b753e0aa1/classes/components/forms/publication/TitleAbstractForm.php#L63-L69),
and the title in the submission wizard, `StartSubmission.php` line 84).
They save the tags `security.allowed_title_html` in `config.inc.php`
allows (by default `b,i,u,sup,sub`), and write "&", "<" and ">" as
`&amp;`, `&lt;` and `&gt;`.
`PKPPublication::getLocalizedTitle($locale, 'html')` returns that HTML,
with the plain-text "Prefix" run through `htmlspecialchars()`
([lines 154–158](https://github.com/pkp/pkp-lib/blob/b17fadae59156c99746754a740caf75b753e0aa1/classes/publication/PKPPublication.php#L154-L158)),
and `getLocalizedSubTitle($locale, 'html')` returns the stored subtitle.

The Crossref filters write that HTML as text.
`ArticleCrossrefXmlFilter::createJournalArticleNode()` in OJS's Crossref
plugin
([lines 184–188](https://github.com/pkp/crossref-ojs/blob/a49e612525733236223a74631131b2297b5b3d42/filter/ArticleCrossrefXmlFilter.php#L184-L188))
and `PreprintCrossrefXmlFilter::createPostedContentNode()` in OPS's
([lines 177–181](https://github.com/pkp/crossref-ops/blob/8e82eda7ccd0ddb0711a6073850f14c4ebbe8680/filter/PreprintCrossrefXmlFilter.php#L177-L181))
do:

```php
$node->appendChild($doc->createTextNode($publication->getLocalizedTitle($lang, 'html')));
```

`createTextNode()` takes its argument as text and escapes it when the
file is written: the tag `<i>` is written `&lt;i&gt;` and the entity
`&amp;` is written `&amp;amp;`. The intent of the title change was the
opposite: the review of `pkp/crossref-ojs#25` asked that a title
holding markup be sent as `<title>E=mc<sup>2</sup></title>`, which
Crossref's face markup allows.

The fault came in two steps. `pkp/pkp-lib#2564` switched the filters to
the HTML form and passed it as `createElementNS()`'s value. That keeps
an entity as it is but escapes "<" and ">", so from then on an italic
word reached Crossref as `<i>…</i>` text, while "&" came out right.
`pkp/pkp-lib#9959` then moved both lines to `createTextNode()`, because
a title stored with a bare "&" (from before titles were HTML, as in the
dataset) broke the XML. That fixed the bare "&" and escaped every
`&amp;` the "Title" box writes a second time.

Reach:

- Every Crossref file a journal or server builds for a work takes these
  lines: "Export DOIs", "Deposit DOIs", "Deposit All" and the automatic
  deposit (`CrossrefExportPlugin::exportAndDeposit()` and
  `exportAsDownload()` both call `exportXML()` with the submission
  filter).
- OJS writes one `<titles>` block per language the title holds, each
  through the same lines.
- A "Prefix" with an apostrophe or "&" goes out the same way (`L'` is
  written `L&amp;#039;`), since `getLocalizedTitle()` turns it into
  HTML first.
- Not affected: a peer review's DOI record (its title is built from the
  text form, `PeerReviewCrossrefXmlFilter`, line 246), the DataCite
  file (the text form, `DataciteXmlFilter`, line 564), and the other
  fields of the Crossref file: the abstract (line 493 writes
  `htmlspecialchars(html_entity_decode(strip_tags($abstract)))` as
  `createElementNS()`'s value, so "&" is right and the formatting is
  dropped), contributor names, affiliations and references (plain-text
  boxes). Checked in the code.
- The funding statement (OJS, line 888, sent with Crossmark or DOI
  versioning on) is a formatted box written as
  `htmlspecialchars(strip_tags(…))` into `createElementNS()`'s value,
  so its stored `&amp;` is escaped twice as well. Checked in the code,
  not walked; another line with another fix (decode before escaping),
  left out of this report.
- The same mistake, the HTML title passed to `createTextNode()`, is in
  OJS's PubMed export (`ArticlePubMedXmlFilter`, lines 91 and 93;
  checked in the code, not walked). It is another plugin and another
  format; this report leaves it out.
- The DOIs page's rows
  ([U45 A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A24-doi-row-title-formatting-codes.md))
  and the Highlights list
  ([U11 A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U11-A3-highlights-list-title-html-codes.md))
  print the same stored HTML as text, each with a fix of its own.

## Proposed fix

A proposal for the team to decide: write the stored HTML into
`<title>` and `<subtitle>` as Crossref's face markup. A helper,
`appendFaceMarkup()`, parses the HTML with `DOMDocument::loadHTML()`
and walks it:

- `<b>`, `<i>`, `<u>`, `<sup>` and `<sub>` become the same elements in
  the Crossref namespace, and `<strong>` and `<em>` become `<b>` and
  `<i>` (Crossref accepts both forms; one is kept);
- any other tag a site's `allowed_title_html` lets through (a `<span>`,
  an `<a>`) is dropped and its text kept;
- text, its entities decoded by the parser, is written as text.

The title and subtitle lines call it:

```diff
-            $node->appendChild($doc->createTextNode($publication->getLocalizedTitle($lang, 'html')));
+            $this->appendFaceMarkup($doc, $node, $publication->getLocalizedTitle($lang, 'html'));
```

In OJS the helper goes into the plugin's `CrossrefFilterBuilder` trait,
which the article filter gets through `IssueCrossrefXmlFilter`; OPS's
filter has no trait and gets the two methods itself. One diff per app
root:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/fix-ops.diff).
The OPS diff's subtitle line passes `$subtitle`, where today it passes
`getLocalizedTitle($subtitle, 'html')`, so it also fixes
[U45 OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-OPS7-preprint-crossref-subtitle-repeats-title.md),
the subtitle element holding the title.

This keeps what `pkp/pkp-lib#2564` was for, the formatting reaching
Crossref, and what `pkp/pkp-lib#9959` was for: a bare "&" from an older
title is parsed as text and written as `&amp;`. It follows the way
OJS's JATS template plugin already turns stored HTML into XML markup
(`JatsHelper::htmlToJatsContent()`: decode the entities, keep the
inline tags the target format has).

Tried on `main` (OJS and OPS): the Steps then show the Expected on both
apps, and the file passes Crossref's 5.4.0 schema. Neighbour check,
with the fix in and out on both apps:

- The dataset's "Hansen & Pinto: Reason Reclaimed" and a plain
  published title (OJS 17, OPS 2) give the same file with the fix in
  and out, apart from the DOI each fresh dataset draws.
- A title typed as `hkrb a <b> c plain` ("plain" in italics) with the
  "Prefix" `L'` is written `<title>L' hkrb a &lt;b&gt; c
  <i>plain</i></title>` with the fix: the typed angle brackets stay
  text, the italic word becomes markup and the apostrophe reads right.
  Without it the file holds `L&amp;#039; hkrb a &amp;lt;b&amp;gt; c
  &lt;i&gt;plain&lt;/i&gt;`.

**Alternatives:**

- Take the text form (`getLocalizedTitle($lang)`, no `'html'`) into
  `createTextNode()`, as the DataCite and peer-review records do. One
  word per line, and the "&" reads right, but the italics are dropped
  where Crossref keeps them.
- Strip the tags and decode the entities inline, as the abstract line
  does: the same result as the text form, written out four times.
- Reuse `JatsHelper`: it lives in another plugin and maps the tags to
  JATS names (`<italic>`), which Crossref does not accept in a title.

**What goes with it:**

- No migration: the stored titles are right. Records already at
  Crossref are corrected by depositing each affected work again
  ("Deposit DOIs" on the DOIs page; see Impact). The release notes
  could say so.
- Backport: the four lines are the same on the plugins' `stable-3_5_0`
  and `stable-3_4_0` branches, but the diffs do not apply whole there.
  OJS's plugin has no `CrossrefFilterBuilder` trait on either branch,
  so the two methods go into `IssueCrossrefXmlFilter` instead; the
  article filter's hunk applies. In OPS's filter the `use` lines
  differ on both branches, and on 3.4 the title lines read
  `$submission->getLocale()` and already pass `$subtitle` (3.4 has no
  OPS7), so those hunks go in by hand. Each app then takes a submodule
  update.
- A guard: a unit test that exports a publication whose title is
  `a &amp; <i>b</i>` and asserts the `<title>` element's children.
  crossref-ojs has a `tests/` folder (`JournalMetadataNodeTest.php`) to
  add it to; crossref-ops has none, so its test needs that set up
  first. The U45 e2e scenario reading the Crossref file is a Planned
  item in the spec.

Medium: a small change, but in two plugin repositories, followed by a
submodule update in OJS and in OPS, and a unit-test setup in
crossref-ops.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/walk.js),
  with `read.php` (the file "Export DOIs" builds, read with the Crossref
  plugin's own `exportXML()` and submission filter, validation off) and
  `validate.php` (Crossref's 5.4.0 schema from crossref.org, in a plain
  PHP process) beside it. Run it on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/walk.js [neighbour]`;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Apply the fix with
  `node bin/try-fix.js apply shared/playwright/checks/issues/crossref-title-ampersand-italic-codes/fix-<app>.diff <app>`.
- The test installs cannot reach crossref.org, so step 10's "Export
  DOIs" answered 400 with the "Error" window "An XML validation error
  occurred and the XML could not be exported. Failed to locate the main
  schema resource at 'https://www.crossref.org/schemas/crossref5.4.0.xsd'."
  instead of a download, on OJS and OPS. The file of the Observed is the
  one `read.php` built for the same work right after; `validate.php`
  then found it valid against Crossref's schema, so an install that
  reaches crossref.org exports it.
- Walked on OJS and OPS, `main` and `stable-3_5_0`, on PostgreSQL. The
  fault does not depend on the database. Datasets: pkp/datasets 7912e09
  (2026-10-14).
- The OPS diff was tried a second time after its subtitle line was
  changed to pass `$subtitle`: the Steps and the neighbour check gave
  the results under Proposed fix.
- The backport notes come from `patch --dry-run` of the two diffs on
  the plugins' 3.5 and 3.4 files.
- Not driven: "Deposit DOIs", "Deposit All" and the automatic deposit
  (the same `exportXML()` call, read in the code); a title in a second
  language; formatting other than italics; the funding statement; 3.4
  and 3.3; the PubMed export.
- Unverified: how Crossref's own pages and API show a record deposited
  with these codes, and that a new deposit replaces it (Crossref's
  documented rule for a redeposit with a newer timestamp; not tried).
  The test installs reach no agency.
- The redeposit rule on the DOIs page: `doi\DAO::getAllDepositableSubmissionIds()`
  (OJS, line 122 and 139) takes DOIs in "Unregistered", "Error" and
  "Needs Sync" only; read in the code.
- Code reads:
  - `main`: the other fields' lines of `ArticleCrossrefXmlFilter`
    (abstract 493, contributors 373–433, references 690–786, funding
    statement 888) and `PreprintCrossrefXmlFilter` (abstract 193);
    `FieldRichText`'s `validElements` from `allowed_title_html`
    (`FieldRichText.php` line 65); the funding statement's
    `FieldRichTextarea` (`PKPFundingStatementForm.php` line 40).
  - `main`, 3.5 and 3.4: the title and subtitle lines of
    `ArticleCrossrefXmlFilter` (crossref-ojs) and
    `PreprintCrossrefXmlFilter` (crossref-ops), the same
    `createTextNode(…'html')` on each; `getLocalizedTitle()`'s `'html'`
    case and the `FieldRichText` title and subtitle in pkp-lib.
  - 3.3: OJS's and OPS's `plugins/importexport/crossref` filters write
    `htmlspecialchars($publication->getLocalizedTitle($locale))` as
    `createElementNS()`'s value, which is right for the plain text the
    3.3 "Title" and "Subtitle" boxes (`FieldText`,
    `PKPTitleAbstractForm.inc.php`) store.
  - Crossref's `crossref5.4.0.xsd`: `title` and `subtitle` are mixed
    content of the `face_markup` group (`b`, `i`, `em`, `strong`, `u`,
    `ovl`, `sup`, `sub`, `scp`, `tt`, `font`), in the Crossref
    namespace (`common5.4.0.xsd`).
- The trace: `git blame` on the title line of `ArticleCrossrefXmlFilter`
  gives 56a573f (2024-05-22, `pkp/crossref-ojs#49` for
  `pkp/pkp-lib#9959`), the same change as 9ceff74 in crossref-ops
  (`pkp/crossref-ops#39`); `pkp/pkp-lib#9959` ("Crossref export xml
  validation error: & in title not escaped") was a bare "&" breaking
  the export. Before it, a1a8d53 and 1211f41 (`pkp/crossref-ojs#25`,
  `pkp/crossref-ops#22`, merged 2023-02-16) passed
  `getLocalizedTitle(…, 'html')` as `createElementNS()`'s value; the
  review comment quoted under Cause is asmecher's, 2023-02-07. `pkp/pkp-lib#9959` was backported to
  crossref-ojs `stable-3_4_0` (`pkp/crossref-ojs#48`, `#50`) and
  crossref-ops (`#38`, `#40`), and reached OJS and OPS in tag
  `3_4_0-6` (2024-07-19; the submodule updates ece20740f9 and
  cfa10774fb, 2024-05-22). PHP's `createElement()` with a value
  keeps `&amp;` as an entity and escapes `<`; with `createTextNode()`
  both are escaped (checked with PHP 8.3).
- The kind: defect, since the formatting never reached Crossref right;
  an "&" alone did, from 3.4.0 to 3.4.0-5.
- Upstream search (2026-10-15): pkp/pkp-lib, pkp/crossref-ojs,
  pkp/crossref-ops, pkp/ojs, pkp/ops and pkp/ui-library, issues and
  PRs, open and closed, by the symptom's words (crossref, title, amp,
  italic, html tags, subtitle, escaped, face markup, `&amp;amp;`) and
  by `createTextNode`. Read: `pkp/pkp-lib#9959` (the change above),
  `pkp/crossref-ojs#26` (an empty title after a Native XML import, a
  different fault) and `pkp/pkp-lib#10996` (characters XML does not
  allow, a different fault). No hit is about a Crossref title carrying
  the codes.
- The branch tips the walks and code reads used:
  - **`main`:** OJS 378eced941 (crossref-ojs a49e612), OPS 2ece50497f
    (crossref-ops 8e82eda), pkp-lib b17fadae59 on both.
  - **`stable-3_5_0`:** OJS ca763c91cd (crossref-ojs 97a9311), OPS
    44aec6e131 (crossref-ops 20f5409), pkp-lib 4045d9241e.
  - **`stable-3_4_0`** (code): OJS daf0ca971d (crossref-ojs f073a20),
    OPS acd8ae704b (crossref-ops 50cef72), pkp-lib 55c8e406b3.
  - **`stable-3_3_0`** (code): OJS d7d9dd14ec, OPS c5532e2161, pkp-lib
    5e84acd11b.
