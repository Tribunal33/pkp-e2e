# An article's generated JATS XML gives its HTML galley as one paragraph with the tags as text

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS (released in 3.5.0-4)
  - 3.4: none (code; paragraphs kept)
  - 3.3: none (code; paragraphs kept)
- **Introduced** [3a725b2](https://github.com/pkp/jatsTemplate/commit/3a725b2062095c714282fa49b4f47d9e9912ca1c) (pkp/jatsTemplate, no PR) · 2026-02-18 · Alec Smecher (asmecher); on 3.5 as [41818f1](https://github.com/pkp/jatsTemplate/commit/41818f13e393925069aed8352bf17acf00236ce3), first in OJS 3.5.0-4
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an article has an HTML galley, the JATS XML that OJS generates for
it holds the galley's whole text in one paragraph. The galley's
paragraph tags appear in that paragraph as literal text, headings run
into the text, emphasis is dropped, and an "&" in the galley reads
`&amp;` in the text.

Editors see this on the version's "JATS XML" page. Readers and indexes
get it only where the journal publishes the generated XML: when an
editor ticks "Make available with publication" for the version (`main`
only), or when the journal turns on the OAI-PMH JATS format and the
article has no JATS file of its own among its galleys or production
files. Both are off by default, and nothing on screen says the body is
broken.

## Impact

- **Lost.** The article's full text in the generated JATS XML: its
  paragraphs, headings and inline markup.
- **Who.** Editors on every article with an HTML galley; readers,
  indexes and harvesters only for articles whose generated XML the
  journal publishes by one of the two routes above.
- **Way round.** A JATS file made outside OJS: uploaded on the
  version's "JATS XML" page it replaces the page's XML and the public
  link's; for OAI-PMH it has to be a galley or a production-ready file.

Medium: a secondary output is wrong for every article with an HTML
galley, silently, wherever the journal publishes it; it is not high
because both publishing routes are off by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
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
2. Open submission 5, "Genetic transformation of forest trees" (in
   Production, no galleys).
3. In the side menu, under "Publication", choose "Galleys". Press "Add
   galley", type "HTML" as the Galley Label and press "Save". In the
   upload window choose "Article Text", upload `u48r8-body.html`, press
   "Continue", "Continue", "Complete".
4. In the side menu choose "JATS XML".

**Expected.** Under the line "This JATS file is generated automatically
by the submission metadata", the XML's `<body>` holds the galley's text
as separate paragraphs, with no HTML tags shown as text:

```xml
<body>
  <p>Introduction</p>
  <p>First paragraph of the u48r8 article, with <italic>emphasis</italic>.</p>
  <p>Second paragraph: salt &amp; pepper.</p>
</body>
```

**Observed.** One paragraph, with the galley's `<p>` tags written out
as text, the heading run in, the emphasis gone, and "salt & pepper"
written `salt &amp;amp; pepper` (which reads `salt &amp; pepper`):

```xml
<body>
    <p>
Introduction
&lt;p&gt;First paragraph of the u48r8 article, with emphasis.&lt;/p&gt;
&lt;p&gt;Second paragraph: salt &amp;amp; pepper.&lt;/p&gt;
</p>
  </body>
```

## Cause

`ArticleBody::create()` in the JATS Template plugin
(`plugins/generic/jatsTemplate/classes/ArticleBody.php`) builds the
body. For an HTML galley it runs HTMLPurifier with only `p` allowed,
which leaves the galley's text with its `<p>…</p>` tags and its "&"
written `&amp;`. That HTML is then put in the XML as if it were plain
text:

```php
$bodyElement->appendChild($this->createElement('p', htmlspecialchars($text, ENT_IGNORE)));
```

`DOMDocument::createElement()` does not escape its value; it reads the
entity references in it. So it undoes the `htmlspecialchars()`, and the
`<p>` holds one text node with the purified HTML exactly as it was:
`<p>First paragraph…</p>`, `salt &amp; pepper`. On output the
serializer escapes that text once, which writes the tags as `&lt;p&gt;`
and the purifier's `&amp;` as `&amp;amp;`. For the plain text the other
galley types give (`SearchFileParser`) the same line is right, and it
was written for them.

3a725b2 ("HTML galley extracted text is never used") moved the line out
of the plain-text branch so that an HTML galley's text would reach the
body at all: since the plugin's DOM rewrite, `pkp/jatsTemplate#29`
(49bcd86, 2023), an HTML galley had given an empty `<body/>`. The 3.4
plugin, which builds the XML as a string, wrote the purified `<p>`
elements into `<body>` as elements.

Reach:

- The "JATS XML" page of every version and its "Download", while no
  JATS file is uploaded (`PKP\jats\Repository::createDefaultJatsContent()`;
  walked).
- The article page's "JATS XML" link (`main`), shown and served only
  while the version's `jatsPublicVisibility` ("Make available with
  publication", default off) is set (`ArticleHandler`,
  `PKPJatsController::publicDownload()`; code).
- OAI-PMH `jats` records, when the oaiJats plugin is enabled (off on a
  new journal). `OAIMetadataFormat_JATS::findJats()` takes a JATS XML
  galley or production-ready file first; without one, or with its
  "forceJatsTemplate" setting on, the record carries this generated
  body (code).
- OMP and OPS do not ship the plugin (code).

## Proposed fix

A proposal; the team decides. Recommended: convert an HTML galley's
text with `JatsHelper::htmlToJatsElement(…, allowParagraphs: true)`,
the plugin's HTML-to-JATS conversion that the abstract, the author
biographies and the notes already use (the open peer reviews use the
same conversion through `htmlToJatsContent()`), and keep the plain-text
line for the other galley types. Let the purifier keep the inline tags
the helper maps to JATS, so emphasis and lists survive
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-body-html-markup-as-text/fix.diff)):

```diff
-                    $config->set('HTML.Allowed', 'p');
+                    // Paragraphs, and the inline markup JatsHelper maps to JATS
+                    $config->set('HTML.Allowed', 'p,br,i,em,b,strong,u,sup,sub,a[href],ul,ol,li');
 …
                 $text = $purifier->purify(file_get_contents(Config::getVar('files', 'files_dir') . '/' . $filepath));
+                $isHtml = true;
             } else {
+                $isHtml = false;
 …
+        if ($isHtml) {
+            // The galley's paragraphs become JATS paragraphs, as for every other HTML field
+            $bodyNode = JatsHelper::htmlToJatsElement($this, 'body', $text, allowParagraphs: true);
+            if (!$bodyNode) {
+                return null;
+            }
+            $this->appendChild($bodyNode);
+            return $this->documentElement;
+        }
+
+        // Plain text extracted from another galley type
         $bodyElement = $this->appendChild($this->createElement('body'));
```

The helper decodes the purifier's entities before escaping (so "&" is
written `&amp;` once), turns each `<p>` into a JATS `<p>`, makes text
outside a paragraph (the heading) a paragraph of its own, and returns
null for a galley with no text, which keeps `<body>` out as before.

The fix was tried on `main`: the walk then showed the Expected body
exactly as written above. A plain-text galley's body was the same with
the fix and without it: one paragraph, with "&" and "<" written `&amp;` and `&lt;`.

**Alternatives**

- Keep `HTML.Allowed` at `p`: the paragraphs come out right, but
  emphasis and lists are lost, which the helper can carry.
- Map headings to `<sec><title>`: closer to the article's structure, but
  it needs a section model the helper does not have; it can follow.
- Restore the 3.4 approach (append the purified string as XML): it
  repeats the double-escaping the helper was written to avoid
  (`pkp/pkp-lib#12946`).

**What goes with it**

- Links: with `a[href]` allowed, a link in the galley becomes an
  `<ext-link>` with the same target, so a relative link to one of the
  galley's own files keeps a relative target that means nothing outside
  OJS. We suggest the purifier keep only absolute `http`, `https` and
  `mailto` links (a relative one reduced to its text), or leaving
  `a[href]` out of the list; not tried, as the walk's file has no link.
- Backport: 3.5 needs its own patch. Its `ArticleBody::create()` creates
  `<body>` before the loop and always returns it (an empty `<body/>`
  when there is no text; non-nullable return type), and its
  `JatsHelper::htmlToJatsElement()` returns a non-nullable node, keeps
  no `br`, `ul`, `ol` or `li` (so the widened list would run list items
  together) and has no paragraph normalization (text before the first
  paragraph would wrap the paragraphs in one `<p>`). The 3.5 patch keeps
  the purifier to `p` and the inline tags, and either brings
  `normalizeParagraphs()` along or splits the purified text on its `<p>`
  tags itself.
- No data repair: the generated XML is not stored (the published copy
  is cached for a day at most).
- Guard: a case in `tests/functional/ArticleBodyTest.php` with an HTML
  galley (today's test covers only "no parseable file"), and an e2e
  check in U48 that reads the body's paragraphs (a Planned item).

Small: one method in the plugin, using the helper the plugin already
uses for its other HTML fields, with a unit test.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets e8dafbc,
  the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/jats-body-html-markup-as-text/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-body-html-markup-as-text/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/jats-body-html-markup-as-text/walk.js`
  (`WALK=nb` for the plain-text control: a "TXT" galley on submission
  9). It reads the XML the "JATS XML" page fetched (`GET
  …/submissions/5/publications/6/jats`, 200) and the text the page
  shows; the two agreed.
- Branch tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (2026-10-01), jatsTemplate dfcb4ee; OJS `stable-3_5_0` 091fb65453
  (2026-10-01), jatsTemplate f529e34; OJS `stable-3_4_0` 75cc2d488b and
  `stable-3_3_0` ac77c9fb35 (2026-10-01); jatsTemplate `stable-3_4_0`
  157c7d0 (2025-01-27) and `stable-3_3_0` b9a4a85 (2025-01-14).
- 3.5 (walked, and read): the same Steps gave the same body as on
  `main`. The OJS 3.5.0-4 tag (2026-04-10) is the first whose
  jatsTemplate pointer holds 41818f1 (it points at it); 3.5.0-3 does
  not, so 3.5.0-0 to 3.5.0-3 give an HTML galley an empty `<body/>`.
- 3.4 and 3.3 (code): OJS does not bundle the plugin on either line
  (no `plugins/generic/jatsTemplate` in their `.gitmodules`); it comes
  from the Plugin Gallery. Its `stable-3_4_0` and `stable-3_3_0`
  branches build the XML as a string in `JatsTemplatePlugin::toXml()`
  and write the purified HTML into `<body>` as markup
  (`$response .= "\t<body>$text</body>\n"`), so the paragraphs stay
  paragraphs. The plugin serves OAI-PMH only there.
- Defaults (code and the dataset): the JATS Template plugin's
  `settings.xml` enables it for a new journal; oaiJats ships no
  `settings.xml` and `getEnabled()` reads an `enabled` setting no
  install writes (the dataset has none); `jatsPublicVisibility` defaults
  to `false` in `lib/pkp/schemas/publication.json`.
- Introduced: `git blame` on the `createElement('p', htmlspecialchars(…))`
  line points to be30f06 (`pkp/jatsTemplate#110`, 2026-07-08), which only
  moved it below the loop. In be30f06's parent the line already applies
  to every galley type, since 3a725b2 (committed to `main` without a PR).
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/jatsTemplate, pkp/ojs,
  pkp/oaiJats and pkp/ui-library, by the symptom's words and by
  `ArticleBody`. `pkp/pkp-lib#12946` (closed) fixed double-escaping in
  the shared helper and the empty `<body/>`, not this line.
- Not driven: OAI-PMH `jats` records and the article page's "JATS XML"
  link (read in the code, as Reach says).
- Unverified: what the purifier does with a relative link (What goes
  with it), not walked.
