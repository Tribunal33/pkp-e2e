# PubMed and validated DOAJ exports fail when the server cannot reach NLM's or DOAJ's website

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** PubMed: `pkp/pkp-lib#2101` · [e48d991cb6](https://github.com/pkp/ojs/commit/e48d991cb67a3cf3c73ec6846fce89c95b701c7b) · 2017-03-20 · Alec Smecher (asmecher), no PR; DOAJ: `pkp/ojs#1003` for `pkp/pkp-lib#1604` · [b8755d99a2](https://github.com/pkp/ojs/commit/b8755d99a2d6c286df9f057763ff0673e78d6796) · 2016-08-27 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#8918` (open), the same fault reported for the Crossref export when PHP's `allow_url_fopen` is off; `pkp/pkp-lib#5682` (closed), whose comments from 2023 and 2024 report the DOAJ message below on 3.3
- **Tracked in** spec U63 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs4), [OJS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal whose server cannot reach other websites, every PubMed
export ("Export Articles" and "Export Issues" in the PubMed XML Export
Plugin) fails with a server error. So does every DOAJ "Export" made
with "Validate XML before the export and registration." ticked, which
it is by default. Instead of a file, the manager gets a plain page
headed "Validation errors:", followed by the file's text; behind it the
server logs a fatal error (the request answers with an error code, the
issue export with an ordinary one).

The page blames the file, but the file is valid. Before each export, the installation downloads the rules
the file is checked against, PubMed's from NLM's website and DOAJ's
list of language codes from DOAJ's website, and here it cannot. The PubMed tool has no way to turn the check off,
so no PubMed file can be had; the DOAJ file downloads once the box is
unticked. The fix is to ship those outside files with the two tools.

It happens on servers without outbound web access (a firewall, a closed
network, or a proxy the server needs but the installation's settings do
not name) and on servers where PHP's `allow_url_fopen` setting is off.
It happens on every installation while either website is down.

## Impact

- **Lost**: the PubMed file, which a journal indexed in PubMed uploads
  to NLM, and the manager's time. The page says the file is invalid,
  so the manager may look for a fault in the articles' details that is
  not there.
- **Who**: journal managers and editors on a server that cannot fetch
  from NLM's or DOAJ's websites. DOAJ "Register" and the automatic
  deposit are not affected: they run no check.
- **Way round**: for DOAJ, untick the box. For PubMed an administrator
  must open the server's access to NLM's website or set up the
  installation's proxy.

Medium: the PubMed export fails with no way round, but only on servers
that cannot fetch from the outside, which is not the default setup.
Frequent outages of NLM's or DOAJ's websites, or many installations
with `allow_url_fopen` off, would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Issue "Vol. 1 No. 2 (2014)"
  is published and holds "Signalling Theory Dividends" (submission 1);
  "DOAJ Plugin" is on.
- The server cannot reach other websites. In `config.inc.php`, under
  `[proxy]`, set `http_proxy = "http://127.0.0.1:9"` and
  `https_proxy = "http://127.0.0.1:9"`. Nothing listens on that port,
  so the server is cut off from other websites the way a firewall cuts
  it off.

PubMed:

1. Sign in as `dbarnes`.
2. Open Tools › "Import/Export" › "PubMed XML Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/PubMedExportPlugin`).
3. Open the "Export Articles" tab, tick "Signalling Theory Dividends"
   and press "Export Articles".
4. Open the tool again, open "Export Issues", tick "Vol. 1 No. 2
   (2014)" and press "Export Issues".

DOAJ:

5. Open Tools › "Import/Export" › "DOAJ Export Plugin" and its
   "Articles" tab.
6. Tick "Signalling Theory Dividends". Leave "Validate XML before the
   export and registration." ticked, as the page opens it, and press
   "Export".
7. Open the tool again, tick the article, untick "Validate XML before
   the export and registration." and press "Export".

**Expected**: steps 3, 4 and 6 download the PubMed file of the article,
the PubMed file of the issue and the DOAJ file of the article, checked
against DTD and schema files that come with the installation. Step 7 downloads the
DOAJ file unchecked.

**Observed**: steps 3 and 4 leave the tool for this page, with no
download:

```
Validation errors:
Could not load the external subset "https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd"
Invalid XML:
<?xml version="1.0"?>
<!DOCTYPE ArticleSet PUBLIC "-//NLM//DTD PubMed 2.8//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd">
<ArticleSet>
  <Article>
  …
```

Step 3's request answers 500, step 4's 200; the server log reads, for
both:

```
PHP Warning:  DOMDocument::validate(https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd): Failed to open stream: Connection refused in lib/pkp/classes/xslt/XMLTypeDescription.php on line 134
Exception: Filter output validation failed, expected "dtd", but found "object" in lib/pkp/classes/filter/Filter.php:471
PHP Fatal error:  Uncaught Exception: Could not convert selected objects. in lib/pkp/classes/plugins/ImportExportPlugin.php:249
```

Step 6 leaves for the same page, answered with 500, no download:

```
Validation errors:
element decl. 'language', attribute 'type': The QName value '{http://www.doaj.org/schemas/iso_639-2b/1.1}LanguageCodeType' does not resolve to a(n) type definition.
attribute decl. 'language', attribute 'type': The QName value '{http://www.doaj.org/schemas/iso_639-2b/1.1}LanguageCodeType' does not resolve to a(n) simple type definition.
…
Invalid XML:
<?xml version="1.0" encoding="utf-8"?>
<records …>
```

with `DOMDocument::schemaValidate(http://www.doaj.org/static/doaj/iso_639-2b.xsd): Failed to open stream: Connection refused` in the log.
Step 7 downloads `doaj-<date>-articles-1.xml`. The three file texts
the pages show pass the same checks on a machine that reaches both
websites (Evidence).

## Cause

PubMed: `ArticlePubMedXmlFilter::process()` gives the document the
DOCTYPE `-//NLM//DTD PubMed 2.8//EN`
`https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd`, and the filter
group declares `outputType="xml::dtd"`
(`plugins/importexport/pubmed/filter/filterConfig.xml`). So
`Filter::execute()` checks the output through
`XMLTypeDescription::checkType()`, which calls
`DOMDocument::validate()` (line 134). libxml then loads the DTD from
its system ID: `PubMed.dtd` and the 25 files it pulls in (the MathML 3
DTD and the ISO entity sets), all from NLM's website, through PHP's
streams. When that fails, libxml records "Could not load the external
subset". `PubMedExportPlugin::exportSubmissions()` and
`exportIssues()` collect libxml's errors and pass them to
`ImportExportPlugin::displayXMLValidationErrors()`. That method prints
the page and throws "Could not convert selected objects.", which
nothing catches.

DOAJ: the filter group names a schema the plugin holds,
`xml::schema(plugins/generic/doaj/doajArticles.xsd)`. That schema
imports the ISO 639-2b language list from
`schemaLocation="http://www.doaj.org/static/doaj/iso_639-2b.xsd"`
(line 8). When `schemaValidate()` cannot load the import, it skips it.
The schema's `language` declarations then name a type that does not
exist, so every file fails. `PubObjectsExportPlugin::exportXML()` sends
the errors (ojs `classes/plugins/PubObjectsExportPlugin.php`) to the
same `displayXMLValidationErrors()`.

The rule broken: a check the installation runs before handing over a
file should not depend on a third party's website at that moment. The
other formats the apps check are kept with the code: `native.xsd`, the
users tool's `pkp-users.xsd`, and OMP's ONIX schema, which includes its
code lists by relative path. The remote copy has failed every
installation before: in 2020 DOAJ changed `iso_639-2b.xsd` in place,
and every validated DOAJ export failed until a release updated the
schema (`pkp/pkp-lib#5682`).

The PubMed check came with the 2017 rewrite of the tool into a filter
(e48d991cb6). The DOAJ schema has imported the language list from a
website since the plugin began (2008), and the 2016 rewrite
(b8755d99a2) made the export validate against it.

Reach:

- The PubMed command-line export (`tools/importExport.php
  PubMedExportPlugin`) calls the same `exportSubmissions()` and
  `exportIssues()` (code).
- DOAJ "Register" and the automatic deposit send JSON and run no check,
  so they are not affected (code).
- The Crossref and DataCite exports name the agency's schema by web
  address (`https://www.crossref.org/schemas/crossref5.4.0.xsd`, which
  imports further files, and
  `http://schema.datacite.org/meta/kernel-4/metadata.xsd`). Their
  "Export DOIs" and deposits check the file the same way, so they fail
  on the same servers with "An XML validation error occurred and the
  XML could not be exported." (code).
- With PHP's `allow_url_fopen` off, both checks fail the same way on a
  server that does reach the websites ("https:// wrapper is disabled in
  the server configuration by allow_url_fopen=0"; a command-line
  check).
- Where the websites answer, each PubMed export downloads the 26 files
  again, which took about 15 s from the test machine (a command-line
  check).
- Nothing is stored, so no data needs repair.

## Proposed fix

A proposal: keep the format files with the plugins and check against
those copies.

- **PubMed**: copy NLM's DTD set (26 files, about 290 KB, from
  `https://dtd.nlm.nih.gov/ncbi/pubmed/in/`) into
  `plugins/importexport/pubmed/dtd/` with its folder layout:
  `PubMed.dtd`, `mathml-in-pubmed.mod`, `mathml3.dtd`,
  `mathml3-qname1.mod`, `mathml/mmlextra.ent`, `mathml/mmlalias.ent`,
  `pubmedchars/ISOchars.ent`, eight ISO 8879 entity sets in `iso8879/`
  (`isobox`, `isocyr1`, `isocyr2`, `isodia`, `isolat1`, `isolat2`,
  `isonum`, `isopub`) and eleven ISO 9573-13 sets in `iso9573-13/`
  (`isoamsa`, `isoamsb`, `isoamsc`, `isoamsn`, `isoamso`, `isoamsr`,
  `isogrk3`, `isomfrk`, `isomopf`, `isomscr`, `isotech`). Then
  override `execute()` in `ArticlePubMedXmlFilter` so that libxml finds
  NLM's addresses in that folder while the filter runs. The exported
  file still names NLM's DTD in its DOCTYPE, as before.
- **DOAJ**: copy `iso_639-2b.xsd` beside `doajArticles.xsd` and point
  the import at it by relative path, as OMP's ONIX schema does.

The code part of
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/fix.diff)
(the rest adds the 27 copied files):

```diff
 class ArticlePubMedXmlFilter extends PersistableFilter
 {
+    /** Where NLM serves the PubMed DTD that the document type names; a copy ships in the plugin's dtd/ folder. */
+    public const PUBMED_DTD_BASE_URL = 'https://dtd.nlm.nih.gov/ncbi/pubmed/in/';
+
+    public function &execute(&$input, bool $returnErrors = false)
+    {
+        $localDtdDir = dirname(__DIR__) . '/dtd/';
+        libxml_set_external_entity_loader(function (?string $publicId, ?string $systemId, array $context) use ($localDtdDir) {
+            return $systemId !== null && str_starts_with($systemId, self::PUBMED_DTD_BASE_URL)
+                ? $localDtdDir . substr($systemId, strlen(self::PUBMED_DTD_BASE_URL))
+                : $systemId;
+        });
+        try {
+            $output = &parent::execute($input, $returnErrors);
+        } finally {
+            libxml_set_external_entity_loader(null);
+        }
+        return $output;
+    }
…
-        $dtd = $implementation->createDocumentType('ArticleSet', '-//NLM//DTD PubMed 2.8//EN', 'https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd');
+        $dtd = $implementation->createDocumentType('ArticleSet', '-//NLM//DTD PubMed 2.8//EN', self::PUBMED_DTD_BASE_URL . 'PubMed.dtd');
--- a/plugins/generic/doaj/doajArticles.xsd
+++ b/plugins/generic/doaj/doajArticles.xsd
  <xs:import namespace="http://www.doaj.org/schemas/iso_639-2b/1.1"
-       schemaLocation="http://www.doaj.org/static/doaj/iso_639-2b.xsd">
+       schemaLocation="iso_639-2b.xsd">
```

The fix sits in the plugins because each plugin owns its format.
`XMLTypeDescription` only checks against what it is given, and it
already handles local schemas. The loader maps only NLM's address and
is cleared when the filter returns. Clearing it puts back libxml's
default loader rather than any loader set before; nothing in ojs or
lib/pkp sets one today, so no other XML loading changes. On `main`
(PHP 8.2 and later) the override could save the previous loader with
`libxml_get_external_entity_loader()` and restore it; that variant was
not tried. The check itself stays: the 2016 and 2017 rewrites added it
on purpose, to catch invalid files before they leave.

Tried on `main` on a server that reaches no other website. Steps 3, 4
and 6 downloaded their files, and the DOAJ file was identical to step
7's. "Export Articles" with nothing ticked produces an empty
`<ArticleSet/>`, which the DTD does not allow; it was still refused,
now with the DTD's own message
"Element ArticleSet content does not follow the DTD, expecting
(Article)+, got" instead of "Could not load the external subset". The
copied DOAJ schema also refuses a made-up language code (a
command-line check).

**Alternatives**:

- Skip the check, with a warning in the log, when the format cannot be
  loaded. That is one change in `XMLTypeDescription::checkType()` and
  would cover Crossref and DataCite too. But it sends unchecked files,
  and every export still waits on the network: behind a firewall that
  drops connections rather than refusing them, each fetch waits for its
  timeout.
- Give PubMed a "Validate XML" box like DOAJ's (the way round
  `pkp/pkp-lib#1955` added for the DOI exports). That is a way round,
  not a fix: the manager still meets the failure first.
- Drop PubMed's check (`xml::*`). Invalid files would then go to NLM
  unnoticed.

**What goes with it**:

- Crossref and DataCite are left out. Their schema sets are larger
  (Crossref 5.4.0 imports further schemas, among them JATS and W3C's
  MathML 3), and their
  deposits need the agency's website anyway. Their "Export DOIs"
  download would gain from the same change in a follow-up;
  `pkp/pkp-lib#8918` tracks it.
- A note beside the copies naming their source and date, so they are
  refreshed when NLM or DOAJ revise them.
- The licences need the team's check before the copies ship. The MathML
  files carry W3C's notice (use, copy and distribute with the notice
  kept), the ISO entity sets ISO's (copying allowed with the notice
  kept, for use with conforming SGML systems). `PubMed.dtd`,
  `mathml-in-pubmed.mod`, `pubmedchars/ISOchars.ent`, the two `mathml/`
  files and DOAJ's `iso_639-2b.xsd` carry no notice at all, so whether
  they may ship under the apps' GPL is not known from the files.
  `doajArticles.xsd`, also DOAJ's and also without a notice, already
  ships with OJS.
- A test: a PubMed and a DOAJ export with remote loading blocked, for
  example a unit test that installs a libxml entity loader refusing
  `http` and `https`.
- Backport: the same files apply to 3.5 with the DOAJ plugin under
  `plugins/importexport/doaj/`, and to 3.4 likewise. On 3.4 and 3.3
  the override must drop the `bool` type: their `Filter::execute()` is
  `&execute(&$input, $returnErrors = false)` (lib/pkp `stable-3_4_0`
  `classes/filter/Filter.php` line 469, `stable-3_3_0`
  `Filter.inc.php` line 426), and the typed override would be a fatal
  error when the class loads. 3.3 also needs `.inc.php` file names and
  `strpos()` in place of `str_starts_with()` for PHP 7.

Medium: one repository, but two plugins, 27 copied format files whose
licences need checking, a libxml loader the code base has not used
before, and a test.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/lib.js),
  run after `npm run fleet-prep -- --feature issues-ir10 --dataset 2 --reset`
  with
  `PROBE_FEATURE=issues-ir10 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/walk.js`.
  `neighbour` as an argument adds "Export Articles" with nothing ticked;
  `neighbour-only` runs that alone. The test install's `[proxy]` is the
  dead port of the Preconditions.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/fix.diff ojs`,
  then walk.js with `neighbour`, then
  `node bin/try-fix.js revert …/fix.diff ojs` and walk.js with
  `neighbour-only`. The DTD set and `iso_639-2b.xsd` in the diff were
  downloaded from NLM's and DOAJ's websites on 2026-10-01. The licence
  notices quoted under "What goes with it" were read in those copies:
  `mathml3.dtd` lines 31–40, `mathml3-qname1.mod` line 9, the ISO
  entity sets' lines 15–18; the other six files have none. The
  diff's `libxml_set_external_entity_loader(null)` and the restoring
  variant: only the first was tried.
- Where the websites answer:
  [online-check.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-needs-outside-sites/online-check.php),
  run from the OJS root on a machine without a proxy
  (`php online-check.php pubmed <file>`, `php online-check.php doaj <file> [<schema>]`)
  on the file texts the pages showed. Both PubMed files were valid,
  about 15 s each, 26 remote files; the DOAJ file was valid, with one
  remote file. Against the copied schema, the DOAJ file was valid with
  no remote file, and the same file with `<language>xxx</language>` was
  refused ("[facet 'enumeration'] The value 'xxx' is not an element of
  the set …").
- `allow_url_fopen`: `php -d allow_url_fopen=0` running
  `DOMDocument::validate()` on the PubMed file and
  `schemaValidate('plugins/generic/doaj/doajArticles.xsd')` on the DOAJ
  file, both on a machine that reaches the websites: both false,
  "https:// wrapper is disabled in the server configuration by
  allow_url_fopen=0" (and "http://" for DOAJ).
- Walked 2026-10-01 on PostgreSQL 15, PHP 8.4 (libxml 2.9.13), the
  built-in PHP server, each install freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc).
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), the same steps
    and the same pages; the DOAJ plugin sits in
    `plugins/importexport/doaj/` there, with the same
    `doajArticles.xsd` import, PubMed DOCTYPE and
    `XMLTypeDescription` lines 134 and 141.
- 3.4, by code, ojs `stable-3_4_0` at 9571d8fde7 (lib/pkp df13621c2d):
  `ArticlePubMedXmlFilter.php` line 59 has the same DOCTYPE,
  `filterConfig.xml` has `xml::dtd`, `PubMedExportPlugin.php` sends the
  libxml errors to `displayXMLValidationErrors()`, `doajArticles.xsd`
  line 8 has the same import, and `XMLTypeDescription.php` calls
  `validate()` and `schemaValidate()` (lines 134 and 141).
- 3.3, by code, ojs `stable-3_3_0` at 9fdb9bcf9a (lib/pkp d446601ebe):
  the same in `ArticlePubMedXmlFilter.inc.php` line 61,
  `PubMedExportPlugin.inc.php`, `doajArticles.xsd` line 8 and
  `XMLTypeDescription.inc.php` lines 129 and 134. The comments on
  `pkp/pkp-lib#5682` from 2023 (3.3.0-14) and 2024 (3.3.0-13) quote
  step 6's message.
- Introduced: `git blame` on the DOCTYPE line gives a37b1c8473 (2025,
  `pkp/pkp-lib#4325`), which changed the address from
  `http://www.ncbi.nlm.nih.gov/entrez/query/static/PubMed.dtd` to NLM's
  current one. `xml::dtd` in `filterConfig.xml` dates from e48d991cb6
  ("initial commit of pubmed export rewrite", no PR on GitHub). The
  DOAJ import's `schemaLocation` line dates from b8755d99a2, which
  moved it from `http://www.it.ojp.gov/jxdm/iso_639-2b/1.0/iso_639-2b.xsd`
  and added the filter that validates against the schema. The remote
  import itself goes back to
  [f02516b633](https://github.com/pkp/ojs/commit/f02516b633131c41881ea7b6049a168d18ce769b)
  (2008, the plugin's first version).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library, issues and PRs,
  searched by the symptom's words and by `XMLTypeDescription`,
  `schemaValidate` and `allow_url_fopen`. `pkp/pkp-lib#3391` (closed) made the check use the installation's
  `[proxy]`; `pkp/pkp-lib#1955` (closed) added the "Validate XML" box
  to the DOI exports as a way round.
- Unverified:
  - why step 4's request answered 200 while the server logged the same
    fatal error; its page is longer, so the headers had probably gone
    out already;
  - how long an export waits behind a firewall that drops connections
    instead of refusing them (only a refused connection was tried);
  - a web server other than PHP's built-in one;
  - the Crossref and DataCite exports, read in the code only here.
