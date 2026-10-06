# A new or older article version's JATS XML carries the current version's galley text, not its own

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; no JATS XML per version)
  - 3.3: none (code; no JATS XML per version)
- **Introduced** `pkp/jatsTemplate#42` for `pkp/pkp-lib#7505` · [0d7993a](https://github.com/pkp/jatsTemplate/commit/0d7993a309d7def0896aac41ad0de52bd7325257) · 2023-12-07 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On an article with more than one version, the JATS XML that OJS
generates for a version takes its full text (the `<body>`) from the
galleys of the article's current version: the latest published one.
It does not use the galleys of the version whose "JATS XML" page is
open. The rest of the XML is that version's own.

So while a new version is being prepared, its XML shows the published
version's galley text, or no text when that version has only PDF
galleys. Once the new version is published, the older version's XML
shows the new version's text, though it never had it.

Editors see this on the version's "JATS XML" page and in its
"Download". Readers get it only from an older version's "JATS XML" link
on the article page, which shows only when an editor ticked "Make
available with publication" for that version (off by default; `main`
only). Nothing on screen says the text belongs to another version.

## Impact

- **Lost.** A correct full text in the generated XML of every version
  but the current one. A public download of an older version that
  borrows a body is also counted as a full-text request for that
  version in the usage statistics.
- **Who.** Editors preparing or checking a new version of an article
  with an HTML galley. Readers only for an older version with "Make
  available with publication" ticked. Nothing in OJS deposits or
  exports the generated XML of a version, and OAI-PMH describes the
  current version only.
- **Way round.** "Upload" a JATS file made outside OJS on the version's
  "JATS XML" page.

Low: by default the wrong text shows only on editors' screens and in a
file nothing in OJS sends on; it would be medium where journals publish
older versions' generated XML.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  Submission 1, "Signalling Theory Dividends", has a published version
  1.0 with a "PDF" galley and an unpublished version 1.1 with a "PDF
  Version 2" galley.
- No PDF text extractor: `index[application/pdf]` under `[search]` in
  `config.inc.php` left commented out, as it is by default. With one,
  a PDF galley gives text too, and the Expected and Observed below
  change accordingly.
- An HTML file `u48r8-body.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>u48r8 galley page title</title></head>
<body>
<h1>Introduction</h1>
<p>First paragraph of the u48r8 article, with <em>emphasis</em>.</p>
<p>Second paragraph: salt &amp; pepper.</p>
</body>
</html>
```

1. Sign in as `dbarnes`.
2. Open submission 1, "Signalling Theory Dividends". The workflow opens
   on its unpublished version 1.1. [3.5: the versions are numbered 1
   and 2; version 2 stands for 1.1 below. The side menu shows the pages
   of one version at a time. "All Versions" picks which; it opens on
   version 2.]
3. In the side menu, under "Publication", "Version of Record 1.1",
   choose "Galleys". Press "Add galley", type "HTML" as the Galley Label
   and press "Save". In the upload window choose "Article Text", upload
   `u48r8-body.html`, press "Continue", "Continue", "Complete".
4. Under "Version of Record 1.1" choose "JATS XML".
5. Publish version 1.1: press "Publish", keep what "Review Publishing
   Details" preselects and press "Confirm", then "Publish". [3.5:
   "Publish", then the window's own "Publish".]
6. Under "Version of Record 1.0" choose "JATS XML". [3.5: "All
   Versions" › "Version 1: …", then "JATS XML".]

**Expected.** At step 4, version 1.1's XML has a `<body>` with the HTML
galley's text. At step 6, version 1.0's XML has no `<body>`, as before
step 5: its only galley is the PDF, which gives no text without a PDF
text extractor.

**Observed.** At step 4, version 1.1's XML has no `<body>` at all: its
text was looked for in version 1.0's PDF galley. At step 6, version
1.0's XML carries version 1.1's HTML galley text (flattened into one
paragraph by a separate fault,
[U48-A7-jats-body-html-markup-as-text.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A7-jats-body-html-markup-as-text.md)):

```xml
<body>
    <p>
Introduction
&lt;p&gt;First paragraph of the u48r8 article, with emphasis.&lt;/p&gt;
&lt;p&gt;Second paragraph: salt &amp;amp; pepper.&lt;/p&gt;
</p>
  </body>
```

Control: after step 5, version 1.1's own "JATS XML" carries the same
body, since it is now the current version.

## Cause

`ArticleBody::create()` in the JATS Template plugin
(`plugins/generic/jatsTemplate/classes/ArticleBody.php`) reads the
galleys from the submission's current publication:

```php
$galleys = $submission->getCurrentPublication()->getData('galleys');
```

`Article::convertSubmission()` is given the version the XML is for
(`PKP\jats\Repository::createDefaultJatsContent()` passes the
publication of the page, the download or the public link), and hands
it to `ArticleFront::create()`, `ArticleBack::create()` and
`PeerReview::create()`, but calls `$articleBody->create($submission)`
without it. The current publication is the latest published version, or
the latest version while none is published.

It came in with `pkp/jatsTemplate#42` (0d7993a, for `pkp/pkp-lib#7505`,
JATS files per publication), which made `$publication` a parameter of
`convertSubmission()` and passed it to the front for the first time;
the back already took it. The body was left reading the current
version. Before, the plugin built XML only for OAI-PMH, always for the
current version.

Reach:

- The "JATS XML" page and "Download" of every version but the current
  one (walked).
- The article page's "JATS XML" link of an older published version,
  shown and served only while its `jatsPublicVisibility` ("Make
  available with publication", default off, `main` only) is set; the
  same `getPublicJatsContent()` path (code; not walked).
  `PKPJatsController::publicDownload()` records a COUNTER usage event
  only when the XML has a `<body>`, so such a download counts as a
  full-text request for the older version (code).
- In the same XML, the galley links (`self-uri`) are the open version's
  own (`ArticleFront` reads `$publication->getData('galleys')`), so the
  file names one version's galleys and another's text (code).
- OAI-PMH records describe the current version only
  (`Article::convertOAIToXml()`), so they are right (code).
- No deposit or export in OJS reads the generated XML: Crossref,
  DataCite, DOAJ, PubMed and the native export do not call
  `Repo::jats()` or the plugin (code). PKP PN is not bundled and was not
  read.
- OMP and OPS do not ship the plugin (code).

## Proposed fix

A proposal; the team decides. Recommended: pass the publication to
`ArticleBody::create()` as the front and back get it, falling back to
the current publication when a caller gives none
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-body-from-current-version-galleys/fix.diff)):

```diff
--- a/plugins/generic/jatsTemplate/classes/Article.php
-        $articleBodyNode = $articleBody->create($submission);
+        $articleBodyNode = $articleBody->create($submission, $publication);
--- a/plugins/generic/jatsTemplate/classes/ArticleBody.php
 use APP\facades\Repo;
+use APP\publication\Publication;
 use APP\submission\Submission;
 …
-    public function create(Submission $submission): ?DOMNode
+    public function create(Submission $submission, ?Publication $publication = null): ?DOMNode
     {
-        $galleys = $submission->getCurrentPublication()->getData('galleys');
+        $galleys = ($publication ?? $submission->getCurrentPublication())->getData('galleys');
```

The fix was tried on `main`: version 1.1's XML then held the HTML
galley's body at step 4, and version 1.0's had none at step 6, as
Expected. The single-version control (submission 5 with an HTML galley)
kept its body with the fix and without it.

**Alternatives**

- Make `$publication` required in `ArticleBody::create()`: cleaner, but
  breaks a caller outside the plugin that passes the submission alone,
  which the optional parameter keeps working.

**What goes with it**

- Other places with the same fault: none. `ArticleBody` is the
  plugin's only reader of `getCurrentPublication()` on the per-version
  path; `convertOAIToXml()` uses it on purpose for OAI-PMH.
- Backport: 3.5 needs its own small patch. There the call is
  `$articleElement->appendChild($this->importNode($articleBody->create($submission), true));`
  in `Article::convertSubmission()`, `create()` returns a non-nullable
  `\DOMNode`, and `ArticleBody.php` lacks the `Publication` import; the
  patch passes `$publication` in that call and adds the parameter and
  the import.
- No data repair: the generated XML is not stored (the published copy
  is cached for a day at most).
- Guard: a case in `tests/functional/ArticleBodyTest.php` (or
  `ArticleTest.php`) with a submission whose current publication's
  galleys differ from the given publication's, and an e2e check in U48
  on a second version's XML (a Planned item).

Small: a parameter, its import and one call in the plugin, following
how the front and back already receive the publication, with a unit
test.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets e8dafbc,
  the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/jats-body-from-current-version-galleys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-body-from-current-version-galleys/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/jats-body-from-current-version-galleys/walk.js`
  (`WALK=nb` for the single-version control). It reads the XML each
  "JATS XML" page fetched and the text the page shows; the two agreed.
  The pages fetched `GET …/submissions/1/publications/2/jats` at step 4
  (version 1.1), `…/publications/1/jats` at step 6 (version 1.0) and
  `…/publications/2/jats` again for the control, each answering 200.
- Branch tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (2026-10-01), jatsTemplate dfcb4ee; OJS `stable-3_5_0` 091fb65453
  (2026-10-01), jatsTemplate f529e34; OJS `stable-3_4_0` 75cc2d488b and
  `stable-3_3_0` ac77c9fb35 (2026-10-01); jatsTemplate `stable-3_4_0`
  157c7d0 (2025-01-27) and `stable-3_3_0` b9a4a85 (2025-01-14).
- 3.5 (walked, and read): the same Steps with the brackets'
  differences. Step 4 showed an empty `<body/>` (the 3.5 class always
  writes the element), and at step 6 version 1's XML carried version
  2's HTML text, as on `main`. 3.5's `ArticleBody::create()` has the same
  `getCurrentPublication()` line, and 0d7993a is in every OJS 3.5.0
  release (the plugin's `3_5_0-0` tag holds it). 3.5 has no "Make
  available with publication" and no public "JATS XML" link, so there
  only editors see the XML.
- 3.4 and 3.3 (code): OJS does not bundle the plugin on either line (no
  `plugins/generic/jatsTemplate` in their `.gitmodules`), and neither
  line's pkp-lib has a JATS repository or a "JATS XML" page. The Plugin
  Gallery plugin's `stable-3_4_0` and `stable-3_3_0` branches build XML
  for OAI-PMH only (`JatsTemplatePlugin::toXml()`), wholly from
  `getCurrentPublication()`, so no version gets another's text.
- Introduced: `git blame` on the `getCurrentPublication()` line points
  to f8814e0 (2025-01-13, dropped a `->toArray()`), then 0f42241
  (2024-12-16), which replaced the deprecated `$submission->getGalleys()`
  (also the current version's galleys) used since the DOM rewrite
  49bcd86 (2023). The line's meaning never changed.
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/jatsTemplate, pkp/ojs,
  pkp/oaiJats and pkp/ui-library, by the symptom's words and by
  `ArticleBody` and `getCurrentPublication`.
- Unverified: none.
