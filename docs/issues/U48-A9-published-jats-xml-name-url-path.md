# An article's JATS XML download runs its URL path into "publication", and earlier downloaders keep the old file name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no public "JATS XML" download)
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/pkp-lib#12286` for `pkp/pkp-lib#10405` and `pkp/pkp-lib#10436` · [5f5066e1f6](https://github.com/pkp/pkp-lib/commit/5f5066e1f614408977d1e63d707bf4ca1420cb3a) (the name) and [1aab069980](https://github.com/pkp/pkp-lib/commit/1aab069980d6058fc6bc0e13b43e080d0c0e218b) (the ETag) · 2026-02-13 and 2026-03-19 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The file a reader saves from the article page's "JATS XML" link is
named "submission-{n}-publication-{m}-jats.xml" when the version has no
URL path. With a URL path such as "my-article", it is named
"my-articlepublication-{m}-jats.xml", with no separator.

When the editor sets, changes or clears the URL path, a reader whose
browser already holds the file gets it again under its earlier name,
while a first-time visitor gets the new one. The browser reuses its
cached copy, and the server's check of that copy looks at the XML's
content only, so the file name a returning reader gets changes only
once the XML itself changes.

The file's content is right in every case. The editor's "Download" on
the "JATS XML" page names its file differently and is not affected.

## Impact

- **Lost**: nothing; only the saved file's name is wrong.
- **Who**: readers of a journal that ticks "Make available with
  publication" (off by default), on articles with a URL path. The stale
  name reaches only readers who downloaded the file before the editor
  set, changed or cleared the path.
- **Way round**: none needed; the reader can rename the file.

Low: only a file name.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`.
- Three browsers: the editor's, and two readers' (B and C) that are not
  signed in.

1. Sign in as `dbarnes` and open submission 17, "Antimicrobial, heavy
   metal resistance and plasmid profile of coliforms isolated from
   nosocomial infections in a hospital in Isfahan, Iran" (published).
2. Publication, "JATS XML": press "Download", then "Upload" and choose
   the file just saved ("jats-18-<date>-<time>.xml").
3. Tick "Make available with publication", then "Confirm".
4. Reader B: open the article page,
   `/index.php/publicknowledge/article/view/17`, and press "JATS XML": the
   file is saved as "submission-17-publication-18-jats.xml".
5. Editor: the published version's "Issue" page: set "URL Path" to
   "u48r7-article" and press "Save".
6. Reader C: open the article page and press "JATS XML".
7. Reader B: open the article page again and press "JATS XML".

**Expected**: both readers save "u48r7-article-publication-18-jats.xml".

**Observed**: reader C saves "u48r7-articlepublication-18-jats.xml":

```
HTTP/1.1 200 OK
Content-Disposition: attachment; filename="u48r7-articlepublication-18-jats.xml"
Cache-Control: no-cache, public
ETag: "6190949a0eb9486e2781b65ca05db1d3"
```

Reader B's browser asks with that ETag, the server answers
`304 Not Modified`, and the browser saves the same XML as
"submission-17-publication-18-jats.xml" again.

Clearing the path again (an empty "URL Path", "Save") stores no path,
and a new reader then gets "submission-17-publication-18-jats.xml".

## Cause

`PKPJatsController::publicDownload()` (lib/pkp
`api/v1/jats/PKPJatsController.php`) builds the name as

```php
$urlPath = ($publication->getData('urlPath') ?? ("submission-{$submission->getBestId()}-")) . "publication-{$publication->getId()}";
$filename = $urlPath . '-jats.xml';
```

The hyphen before "publication-" sits inside the fallback, so a URL path
runs straight into it.

The answer carries `Cache-Control: public, no-cache` and an ETag that is
`md5($jatsContent)`, the XML alone (1aab069980, which replaced a 24-hour
`max-age` so that browsers revalidate). A browser that kept the file asks
again with `If-None-Match`; while the XML is unchanged the controller
answers `304 Not Modified` with only `ETag` and `Cache-Control`, and the
browser reuses its stored response, `Content-Disposition` included. The
name depends on the URL path, which the ETag does not cover, so a path
change that leaves the XML as it is keeps the old name for every
returning reader.

Reach:
- The stale name, with an uploaded JATS file: walked (the steps).
- The stale name, with the generated XML. That XML gives the article's
  address in `<self-uri>`, so a path change should change the XML and
  its ETag. But the server keeps the first XML it served for up to 24
  hours
  ([U48-A8-published-jats-xml-stays-old-after-edit.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A8-published-jats-xml-stays-old-after-edit.md)),
  so today the XML stays the same and the old name stays too: walked.
- No other controller in OJS or pkp-lib answers 304 or sets an ETag,
  and the other `urlPath ?? id` expressions build address segments, not
  names: read in the code.

## Proposed fix

In `publicDownload()`, put the hyphen after whichever prefix is used,
and include the name in the ETag, so that a changed name is never
answered "not modified"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-xml-name-url-path/fix.diff)):

```diff
-        $urlPath = ($publication->getData('urlPath') ?? ("submission-{$submission->getBestId()}-")) . "publication-{$publication->getId()}";
-        $filename = $urlPath . '-jats.xml';
+        $prefix = $publication->getData('urlPath') ?: "submission-{$submission->getBestId()}";
+        $filename = "{$prefix}-publication-{$publication->getId()}-jats.xml";
 
-        // ETag for conditional request support
-        $etag = '"' . md5($jatsContent) . '"';
+        // ETag for conditional request support. The file name is part of what the
+        // browser keeps from a 200, and a 304 does not carry it, so it is in the tag.
+        $etag = '"' . md5($filename . $jatsContent) . '"';
```

`?:` in place of `??`: the screens store a cleared path as null
(walked), where both agree; `?:` also keeps an empty string, should
one be stored, from producing a name starting "-publication-".

Tried on `main`: with it, readers B and C both saved
"u48r7-article-publication-18-jats.xml" (B's request answered 200). In
the control run, with the fix and without it alike, a version without a
URL path kept "submission-17-publication-18-jats.xml", and a reader
downloading twice with nothing changed was answered 304.

**Alternatives**:
- Send `Content-Disposition` with the 304 as well. RFC 9111 §4.3.4 has a
  cache replace its stored header fields with those a 304 carries, so
  this should work too (not tried). The ETag fix is still preferred: an
  ETag names one representation, and a file under another name is
  another one, so no cache, shared or private, can be told "not
  modified" for it, whatever it does with a 304's headers.
- Always name the file "submission-{n}-publication-{m}-jats.xml": no
  path in the name, so neither fault, but it drops what 5f5066e1f6
  chose; a product call.

**What goes with it**:
- No data repair. Each reader's next download after the change is a
  full one, since every ETag changes once.
- A unit or API test in pkp-lib on the name with and without a URL path,
  and on a 200 after a path change; the e2e guard planned in U48.

Small: two lines in one method, tried. A proposal; the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-xml-name-url-path/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-xml-stays-old-after-edit/lib.js))
  takes steps 1–7 on an install freshly loaded from the default dataset
  and reads the server's own status line for each download (a 304 shows
  in the browser as the cached 200); `WALK=nb` is the control run (no
  URL path, a second download with nothing changed), `WALK=clear` sets
  and clears the path and reads what is stored:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/published-jats-xml-name-url-path/walk.js`.
- Walked on OJS `main`, PostgreSQL; the fault does not depend on the
  database. Dataset: pkp/datasets e8dafbc (2026-10-02). A first walk
  without step 2's upload (the generated XML) showed the same two names
  and the same 304. After clearing, `publications.url_path` is null.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a); `stable-3_5_0` OJS
  091fb65453 (lib/pkp cf3f984335); `stable-3_4_0` OJS 75cc2d488b (lib/pkp
  6f96165c90); `stable-3_3_0` OJS ac77c9fb35 (lib/pkp 4156e50233).
- Introduced: `git blame` on the two lines gives 1f8d75314b for the name
  (it replaced the ids with `getBestId()` and `getId()`; the hyphen was
  already inside the fallback in 5f5066e1f6) and 1aab069980 for the
  ETag; `commits/<sha>/pulls` gives `pkp/pkp-lib#12286` (merged
  2026-03-25). The ETag's purpose is quoted from touhidurabir's comment
  on `pkp/pkp-lib#10436` (2026-05-08).
- 3.5: `PKPJatsController` has `get`, `add` and `delete` only, and OJS's
  `article_details.tpl` and `ArticleHandler` offer no JATS link. 3.4 and
  3.3: no `jats` file in OJS, its lib/pkp or its plugins.
- Searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by symptom words and
  by `publicDownload` and the ETag.
- Unverified: browsers other than Chromium (the walk's).
