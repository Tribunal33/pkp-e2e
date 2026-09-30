# PubMed and validated DOAJ exports end in a "Validation errors:" page when OJS cannot reach NLM's or DOAJ's site

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** PubMed: [e48d991cb6](https://github.com/pkp/ojs/commit/e48d991cb67a3cf3c73ec6846fce89c95b701c7b) for `pkp/pkp-lib#2101` · 2017-03-20 · Alec Smecher (asmecher); DOAJ: `pkp/ojs#1003` for `pkp/pkp-lib#1604` · [b8755d99a2](https://github.com/pkp/ojs/commit/b8755d99a2d6c286df9f057763ff0673e78d6796) · 2016-08-27 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#5682` (closed without a fix for this: the 2020 fix updated the language list's namespace and kept the import from DOAJ's site; comments from 2024 report this error on 3.3.0-13, unanswered), covering DOAJ only
- **Tracked in** spec U63 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs4), [OJS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs7)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal manager exports to PubMed ("Export Articles" or "Export Issues"
in the PubMed XML Export Plugin) or to DOAJ ("Export" in the DOAJ Export
Plugin, with "Validate XML before the export and registration." ticked,
as it opens) while OJS cannot reach NLM's or DOAJ's website. The request
ends in a server error (an uncaught exception, status 500), and the
browser shows a bare page headed "Validation errors:". No file downloads.
Where the connection is refused, the page comes back at once. Where a
firewall drops the connection without answering, it comes back after
about a minute.

The page says that PubMed's or DOAJ's description of the file format
could not be loaded, and then prints the XML that would have been
exported. Nothing in that XML is wrong. Every PubMed export fails this
way, and the PubMed tool has no way to skip the check. The DOAJ file
downloads once the validation box is unticked.

It happens where OJS's web server has no outbound access to those sites,
where PHP's remote file access (`allow_url_fopen`) is off, and while
either site is down.

## Impact

- **Lost:** the export file. Nothing stored is lost, but the page reads
  as if the journal's metadata were invalid, which sends the manager
  looking for a fault that is not there.
- **Who:** managers of journals that send metadata to PubMed or DOAJ,
  on a server that is firewalled or shared with remote file access off.
  The reports behind `pkp/pkp-lib#1955` and `pkp/pkp-lib#5682` came from
  such installations.
- **Way round:** DOAJ: untick "Validate XML before the export and
  registration." (the file is then not checked). PubMed: none on
  screen. Where the server must go through a proxy, naming that proxy
  under `[proxy]` in `config.inc.php` gets both checks through (read
  in the code). DOAJ's web "Register" does not use this check.

Medium: exports to PubMed and DOAJ fail, with no way round on screen for
PubMed, but only on installations that cannot reach those sites. It
would be high if most installations were in that state.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (`publicknowledge`, "Journal of
  Public Knowledge"; "DOAJ Plugin" is on there).
- OJS cannot reach dtd.nlm.nih.gov or www.doaj.org. On a test install,
  set `http_proxy` and `https_proxy` under `[proxy]` in `config.inc.php`
  to an address where nothing answers (`"http://127.0.0.1:9"`). This
  stands in for a server without outbound access.

PubMed:

1. Sign in as `rvaca` (Journal manager).
2. Side menu "Tools"; on "Import/Export", press "PubMed XML Export
   Plugin".
3. Open the "Export Articles" tab and tick "Signalling Theory
   Dividends".
4. Press "Export Articles".
5. Go back to the tool (the browser's Back button), open the "Export
   Issues" tab and tick "Vol. 1 No. 2 (2014)".
6. Press "Export Issues".

DOAJ:

7. Side menu "Tools"; on "Import/Export", press "DOAJ Export Plugin".
8. Open the "Articles" tab and tick "Signalling Theory Dividends". Leave
   "Validate XML before the export and registration." ticked, as it
   opens.
9. Press "Export".

**Expected:** steps 4 and 6 download the PubMed file
(`pubmed-<date>-articles-1.xml`, `pubmed-<date>-issues-1.xml`), and step
9 downloads the DOAJ file (`doaj-<date>-articles-1.xml`).

**Observed:** each press leaves the tool for a page headed "Validation
errors:", then "Invalid XML:" and the exported XML, and nothing
downloads. Each page came back within the second of the press. Steps 4
and 6 read:

```
Could not load the external subset "https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd"
```

Step 9 reads, the second line three times:

```
element decl. 'language', attribute 'type': The QName value '{http://www.doaj.org/schemas/iso_639-2b/1.1}LanguageCodeType' does not resolve to a(n) type definition.
attribute decl. 'language', attribute 'type': The QName value '{http://www.doaj.org/schemas/iso_639-2b/1.1}LanguageCodeType' does not resolve to a(n) simple type definition.
```

Steps 4 and 9 answer 500. Step 6 answers 200 with the same page. The
server log has the same uncaught error for all three:

```
PHP Fatal error:  Uncaught Exception: Could not convert selected objects. in lib/pkp/classes/plugins/ImportExportPlugin.php:249
```

## Cause

The PubMed export filter declares its output type as `xml::dtd`
(`plugins/importexport/pubmed/filter/filterConfig.xml`), so
`Filter::execute()` checks each file through
`XMLTypeDescription::checkType()`, which calls `DOMDocument::validate()`.
That loads the DTD the file's DOCTYPE names,
`https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd`
(`ArticlePubMedXmlFilter::process()`), and the 25 modules and entity
sets it pulls in, over the network at every export. When they cannot be
loaded, libxml reports "Could not load the external subset", and
`PubMedExportPlugin::exportSubmissions()` and `exportIssues()` treat
that as a validation error.

The DOAJ plugin ships its own schema (`xml::schema(plugins/generic/doaj/doajArticles.xsd)`),
but that schema imports its language list from
`http://www.doaj.org/static/doaj/iso_639-2b.xsd`
(`plugins/generic/doaj/doajArticles.xsd` line 8). When the import cannot
be loaded, libxml skips it, the schema does not compile ("The QName
value … does not resolve"), `schemaValidate()` fails, and
`PubObjectsExportPlugin::exportXML()` passes those errors on.

Both then call `ImportExportPlugin::displayXMLValidationErrors()`, which
prints the page and throws "Could not convert selected objects.". On
the web nothing catches it. The check of a file against its format thus
depends on a third-party site at export time, and a format that cannot
be loaded is reported as a fault in the file.

The remote copies also change under the plugins. DOAJ changed the
language list at the same address in 2020, which broke every OJS's
validated DOAJ export (`pkp/pkp-lib#5682`). The PubMed file declares
`-//NLM//DTD PubMed 2.8//EN`, but NLM publishes no separate 2.8 file:
the DTD at that address is headed "PubMed Journal Article DTD Version
3.0", and NLM's "XML Help for PubMed Data Providers" gives the DOCTYPE as
`-//NLM//DTD PubMed 3.0//EN` at the same address. So the export has in
fact been checked against version 3.0.

Reach:

- PubMed "Export Articles" and "Export Issues" on the web: reproduced
  in the browser.
- PubMed command line, `articles`: the same two methods, but
  `executeCLI()` catches the exception and prints the errors and
  "Could not convert selected objects.", and writes no file (read in
  the code).
- PubMed command line, `issue`: `executeCLI()` passes Issue objects to
  `exportIssues(array $issueIds)`, which hands each to
  `Repo::section()->getByIssueId(int $issueId)`. That throws a
  `TypeError`, which `catch (Exception $e)` does not catch, before any
  check runs. This is a separate fault, not covered here (read in the
  code).
- DOAJ "Export" with the box ticked: reproduced in the browser. The
  "Publications" tab (DOI versioning on) goes through the same
  `exportXML()` (read in the code).
- DOAJ command line, `export` and `register`:
  `PubObjectsExportPlugin::executeCLICommand()` calls `exportXML()`
  without the no-validation flag, so the command line always checks the
  file and has no way round offline; nothing catches the exception
  there (read in the code). The fix covers it.
- DOAJ web "Register": `DOAJExportPlugin::executeExportAction()` sends
  JSON through the `DOAJRegister` job, with no XML check, so this fault
  does not touch it. Offline it cannot reach DOAJ's API anyway (read in
  the code).
- A server that reaches the sites but runs PHP with `allow_url_fopen`
  off fails the same way, since libxml's loads go through PHP's stream
  wrappers (checked with PHP's command line).
- The `[proxy]` setting: `PKPContainer::settingProxyForStreamContext()`
  passes it to libxml (`libxml_set_streams_context()`, since
  `pkp/pkp-lib#3391`), and the walk's loads did go to the configured
  address. So a server that must use a proxy gets both checks through
  once `[proxy]` names it (read in the code, not walked with a working
  proxy). Deposits go through Guzzle (`PKPApplication::getHttpClient()`),
  which reads the same setting.
- The wait: a refused connection fails at once. A dropped one waits for
  PHP's `default_socket_timeout`, 60 s by default, per export (measured
  with PHP's command line).
- Crossref (OJS, OPS) and DataCite (OJS) validate against schemas on
  crossref.org and schema.datacite.org the same way, so their exports
  with "Validate XML …" ticked fail the same way offline (read in the
  code). OMP validates against no remote schema.

## Proposed fix

A proposal, tried on `main` ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/fix.diff)).

Recommended: validate against copies of the two formats shipped with
OJS. OJS already does this for the JATS DTD (`dtd/jats/1.2/`, added for
`pkp/pkp-lib#13223`, whose test helper validates "so that validation
resolves the DTD and its modules locally instead of over the network"),
and for the DOAJ, Native and users schemas themselves.

- PubMed: add NLM's `PubMed.dtd` and the 25 files it loads (MathML 3
  modules, ISO entity sets, `pubmedchars/ISOchars.ent`), 288 KB, under
  `dtd/pubmed/3.0/` with NLM's layout. Declare the version the file is,
  `-//NLM//DTD PubMed 3.0//EN`, as NLM's help page does; the system
  identifier stays NLM's address. In `PubMedExportPlugin`, run the filter
  with a libxml entity loader that maps that address to the local copy.
  The identifiers become constants on `ArticlePubMedXmlFilter`.

  ```diff
  -        $submissionXml = $exportFilter->execute($submissions, true);
  +        $submissionXml = $this->executeExportFilter($exportFilter, $submissions);
  …
  +    protected function executeExportFilter(ArticlePubMedXmlFilter $exportFilter, array $submissions): ?DOMDocument
  +    {
  +        $previousLoader = libxml_get_external_entity_loader();
  +        libxml_set_external_entity_loader(
  +            fn (?string $publicId, ?string $systemId, array $context) =>
  +                $systemId === ArticlePubMedXmlFilter::DTD_SYSTEM_ID
  +                    ? Core::getBaseDir() . '/' . ArticlePubMedXmlFilter::DTD_LOCAL_PATH
  +                    : ($previousLoader ? $previousLoader($publicId, $systemId, $context) : $systemId)
  +        );
  +        try {
  +            return $exportFilter->execute($submissions, true);
  +        } finally {
  +            libxml_set_external_entity_loader($previousLoader);
  +        }
  +    }
  ```

- DOAJ: add DOAJ's `iso_639-2b.xsd` (32 KB) beside `doajArticles.xsd`
  and import it by its relative path:

  ```diff
   <xs:import namespace="http://www.doaj.org/schemas/iso_639-2b/1.1"
  -       schemaLocation="http://www.doaj.org/static/doaj/iso_639-2b.xsd">
  +       schemaLocation="iso_639-2b.xsd">
  ```

The loader is scoped to the PubMed filter call. Only that plugin
validates against a DTD (`xml::dtd` has no other user), and the mapping
belongs to its format. Pinned copies also keep the check from changing
when NLM or DOAJ change the files at those addresses.

Tried on OJS, with OJS still unable to reach either site. With the fix,
the three exports of the Steps download their files, the PubMed ones
declaring `-//NLM//DTD PubMed 3.0//EN` at NLM's address. The check still
refuses a file the DTD rejects: "Export Articles" with nothing ticked
gives "Element ArticleSet content does not follow the DTD, expecting
(Article)+, got" with the fix, and "Could not load the external subset
…" without it. From PHP's command line with remote access off, the
patched DOAJ schema accepts the exported file and refuses the same file
with the language "xxx".

**Alternatives:**

- Treat a format that cannot be loaded as "not checked" and download
  with a notice. This keeps the network dependence, gives up the check
  whenever it cannot run, and needs load errors told apart from
  validation errors, which libxml reports alike.
- Give the PubMed tool the "Validate XML …" box that `pkp/pkp-lib#1955`
  gave the other export tools. That is a way round, but the default
  still fails offline. It could come with the fix as an option.
- Validate a copy whose DOCTYPE points at the local file, as the JATS
  test helper does. The `xml::dtd` output type is saved in the filter
  group rows, so validating that way needs a migration.
- Ship Crossref's and DataCite's schemas too: left out. Crossref's
  schema set is large and the team preferred not to copy it
  (`pkp/pkp-lib#1955`), those tools have the box as a way round, and an
  installation that deposits to Crossref or DataCite must reach their
  sites anyway.

**What goes with it:**

- The exported PubMed file's DOCTYPE changes from `2.8` to `3.0`, the
  identifier NLM documents for the file at that address.
- The shipped files keep their headers. The MathML modules carry the W3C
  notice that allows copying; the team checks NLM's and DOAJ's terms as
  it did for the JATS DTD. A new PubMed DTD version becomes a new
  directory, as for JATS.
- Backport: 3.5 (PHP 8.2) takes the change as written, with DOAJ under
  `plugins/importexport/doaj/`. 3.4 requires PHP 8.0.2, which has no
  `libxml_get_external_entity_loader()`, so the loader is reset with
  `libxml_set_external_entity_loader(null)`. 3.3 requires PHP 7.3, which
  has no arrow functions either; there, in
  `PubMedExportPlugin.inc.php`:

  ```php
  $localDtd = Core::getBaseDir() . '/dtd/pubmed/3.0/PubMed.dtd';
  libxml_set_external_entity_loader(function ($publicId, $systemId, $context) use ($localDtd) {
      return $systemId === 'https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd' ? $localDtd : $systemId;
  });
  try {
      $submissionXml = $exportFilter->execute($submissions, true);
  } finally {
      libxml_set_external_entity_loader(null);
  }
  ```

- Not changed: a file that really fails its format still gets the
  "Validation errors:" page with a server error, because
  `displayXMLValidationErrors()` throws after printing. That is a
  separate question.
- Guard: an OJS unit test that runs the PubMed and DOAJ export filters
  with remote loading refused and expects a valid file; or an e2e check
  in pkp-e2e's import/export spec on an install that cannot reach
  either site.

Medium: a few lines in two plugins, plus 27 third-party format files
that the team reviews for terms and version.

## Evidence

- Kept script, which takes the Steps on OJS through the screens on a
  fresh load of the default dataset, the DOAJ export with the box
  unticked, and "Export Articles" with nothing ticked:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/walk.js),
  run with
  `PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63ojs4 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front).
- The fix, tried 2026-09-30 on the main tips below with
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/trial.sh)
  (`node bin/try-fix.js apply` / `revert`, the walk with the fix, the
  nothing-ticked export again without it). The DTD files are NLM's as
  served at `https://dtd.nlm.nih.gov/ncbi/pubmed/in/` on 2026-09-30, the
  set libxml loads to validate a PubMed file; the XSD is DOAJ's as served
  at `http://www.doaj.org/static/doaj/iso_639-2b.xsd` that day.
- Walked 2026-09-30 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `ojs/main/pgsql` and
  `ojs/stable-3_5_0/pgsql`: main OJS bade233f73 (lib/pkp 2e377d27fc),
  stable-3_5_0 OJS 92b9a16b48 (lib/pkp a9c76aed62). Both showed the
  Observed above, with the same statuses.
- DTD version: the Internet Archive holds three copies of NLM's
  `PubMed.dtd` (2021-03, 2021-09, 2021-11), all headed "Version 3.0";
  today's file is the 2021-11 one byte for byte. NLM's help page
  (NBK3828, archived 2025-09-29) gives
  `<!DOCTYPE ArticleSet PUBLIC "-//NLM//DTD PubMed 3.0//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd">`.
- PHP command-line checks (PHP 8.3, libxml 2.15.2), outside the app:
  with network access, validating a PubMed DOCTYPE loads NLM's DTD and
  reports only the file's own errors; with `-d allow_url_fopen=0`, it
  reports "Could not load the external subset …"; through a proxy
  address that drops traffic, it reports the same after 60.1 s.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7, pkp-lib at df13621c2d.
  `ArticlePubMedXmlFilter.php` declares the same DOCTYPE (line 59, the
  `pkp/pkp-lib#4325` update was backported), the filter's output type
  is `xml::dtd`, `plugins/importexport/doaj/doajArticles.xsd` imports the
  same remote list, and `XMLTypeDescription.php` and
  `displayXMLValidationErrors()` are as on main.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at d446601ebe.
  The same four places, in `.inc.php` files, as on 3.4.
- Introduced: the remote dependence has been there since each check was
  written. PubMed: `outputType="xml::dtd"` came with the plugin's
  rewrite in e48d991cb6; the DOCTYPE then named
  `http://www.ncbi.nlm.nih.gov/entrez/query/static/PubMed.dtd`, and
  a37b1c8473 (`pkp/pkp-lib#4325`, 2025) moved it to today's address
  (`git log -L` on the DOCTYPE line). DOAJ: the import's `schemaLocation`
  line is from b8755d99a2 (`pkp/ojs#1003`), the namespace line from
  bcb9d5b767 (`pkp/pkp-lib#5682`).
- Upstream searched 2026-09-30 (pkp/pkp-lib, pkp/ojs, pkp/ui-library).
  Related but not this fault: `pkp/pkp-lib#1955` (the "Validate XML …"
  box, for exports behind a proxy or with `allow_url_fopen` off),
  `pkp/pkp-lib#3391` (proxy support for these loads),
  `pkp/pkp-lib#10251` (PubMed export of an unpublished article fails the
  DTD).
- Not driven: Crossref and DataCite exports, the command-line exports,
  the DOAJ "Publications" tab, an installation behind a working proxy or
  one that reaches both sites, MySQL.
