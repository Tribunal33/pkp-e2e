# Readers download an article's old JATS XML for up to a day after the editor corrects or publishes it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no public "JATS XML" download)
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/pkp-lib#12286` for `pkp/pkp-lib#10405` and `pkp/pkp-lib#10436` · [5f5066e1f6](https://github.com/pkp/pkp-lib/commit/5f5066e1f614408977d1e63d707bf4ca1420cb3a) · 2026-02-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After an editor corrects a published version's title, the "JATS XML"
page shows the corrected XML, but the article page's "JATS XML" link
keeps serving the XML from before the edit for up to 24 hours. The link
serves a copy of the XML kept on the server, the published copy, and it
is the first download after a change that fills it.

Publishing does not refresh it either. When the editor or author
downloads "JATS XML" from "Preview" before publishing, readers get that
preview's XML for up to 24 hours after publication: no change made after
the preview reaches them, and a version that had no publication date at
the preview has none in the file. An edit of the metadata, and
publishing, should refresh the published copy, as an upload or a change
of the tick box does.

Only journals that tick "Make available with publication", which is off
by default, are affected.

## Impact

- **Lost**: a correct public record for up to a day. Every reader and
  harvester that downloads the article's JATS XML in that time gets the
  metadata as it was before the correction (title, abstract, references,
  licence, the article's own address), and a harvest keeps it.
- **Who**: readers of a journal that serves its generated JATS XML,
  after any correction of a published article's metadata, and after
  publishing an article whose JATS XML the editor or author opened from
  "Preview". A journal that uploaded its own JATS file is not affected:
  readers get that file, which an edit does not change.
- **Way round**: on the "JATS XML" page, untick "Make available with
  publication", "Confirm", tick it again and "Confirm"; nothing on
  screen says it is needed.

Medium: readers and indexes silently get the uncorrected record for a
day; it would be high if the copy never refreshed by itself.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`.
- Two browsers: the editor's, and a reader's that is not signed in.

Editing a published article:
1. Sign in as `dbarnes` and open submission 17, "Antimicrobial, heavy
   metal resistance and plasmid profile of coliforms isolated from
   nosocomial infections in a hospital in Isfahan, Iran" (published).
2. Publication, "JATS XML": tick "Make available with publication",
   then "Confirm".
3. Reader: open the article page,
   `/index.php/publicknowledge/article/view/17`, and press "JATS XML".
   The file's `<article-title>` reads "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran".
4. Editor: "Title & Abstract": set "Title" to "Antimicrobial resistance in
   hospital coliforms (u48r7)" and press "Save".
5. Editor: "JATS XML": the XML on the page holds the new title.
6. Reader: reload the article page (it shows the new title) and press
   "JATS XML".

**Expected**: the file holds the new title, as the "JATS XML" page and
the article page do.

**Observed**: the file is byte-identical to the one step 3 saved
(`<article-title>` "Antimicrobial, heavy metal resistance and plasmid
profile of coliforms isolated from nosocomial infections in a hospital in
Isfahan, Iran"), with the same ETag:

```
HTTP/1.1 200 OK
Content-Disposition: attachment; filename="submission-17-publication-18-jats.xml"
Cache-Control: no-cache, public
ETag: "6190949a0eb9486e2781b65ca05db1d3"
```

Publishing after a preview:
7. Editor: open submission 1, "Signalling Theory Dividends". It opens on
   version 1.1, which is not published. "JATS XML": tick "Make available
   with publication", then "Confirm".
8. Editor: press "Preview" in the header, and on the preview press "JATS
   XML". The file downloads.
9. Editor: back in the workflow, "Title & Abstract" of version 1.1: set
   "Title" to "Signalling Theory Dividends (u48r7)" and press "Save" (its
   "Prefix" stays "The").
10. Editor: "Publish", "Confirm" in "Review Publishing Details", then
    "Publish" ("This will be published immediately in Vol. 1 No. 2
    (2014).").
11. Reader: open the article page (`…/article/view/1`), which shows
    "The Signalling Theory Dividends (u48r7)", and press "JATS XML".

**Expected**: the XML of the published version, with the new title, as
the "JATS XML" page shows it.

**Observed**: the file is byte-identical to the preview's from step 8
(ETag `"dc3a6045f6e83a05176b9f3b3d1a6777"`). Its `<article-title>` reads
"The The Signalling Theory Dividends Version 2": the dataset gives
version 1.1 the prefix "The" and a title that itself begins "The", as
they stood at the preview. The dataset's version 1.1 already holds a
publication date, so this preview's file carries a `<pub-date>` too.

Control: with an uploaded JATS file, readers get that file before and
after a title edit, as they should.

## Cause

`PKP\jats\Repository::getPublicJatsContent()` (lib/pkp
`classes/jats/Repository.php`), which the article page's download
(`PKPJatsController::publicDownload()`) calls, keeps the XML it builds in
the application cache for 24 hours
(`Cache::remember("jats-public-content-{$publicationId}", JATS_FILE_CACHE_LIFETIME, …)`).
The key names only the publication, and only `addJatsFile()`, `delete()`
and the controller's `setVisibility()` forget it. The generated XML is
built from the publication's metadata, but `Repo::publication()->edit()`,
`publish()` and `unpublish()` change that metadata without touching the
entry. So the first download after any change fixes what readers get for
the next day.

The preview counts as that first download: on an unpublished version
`publicDownload()` lets a user who may preview through and reads the same
cache entry, so the preview's XML is what the published version serves.

The cache came with the public download in 5f5066e1f6
(`pkp/pkp-lib#12286`), to keep anonymous downloads from loading the
server, as `pkp/pkp-lib#10436` asked ("wrapping the response in a simple
`Cache::remember` call that lasts for 24 hours"). The PR's later commit
1aab069980 added the ETag and `no-cache`, with the comment "This ensures
browsers always get fresh content while server-side Cache::remember()
(24h) still provides DDOS protection"; the browsers get what the server
holds, and the server's copy is the stale one.

Reach:
- Every field saved through `Repo::publication()->edit()` that the
  generated XML carries: the title (walked); the abstract, keywords,
  references, licence and dates (read in the code).
- The URL path, which the XML gives as the article's address in
  `<self-uri>`: the published copy keeps the old address. Because the
  XML does not change, a returning reader also keeps the file's old
  name (walked; see
  [U48-A9-published-jats-xml-name-url-path.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A9-published-jats-xml-name-url-path.md)).
- Publishing after any download of the version's XML, the preview
  included (walked).
- Unpublishing: afterwards a signed-out reader is refused, so a stale
  entry reaches only those who may preview, until the version is
  published again (read in the code).
- Data the XML takes from other records (contributors through
  `Repo::author()`, galleys, the issue, the section, the journal's
  settings) goes stale the same way: none of their writers clears the
  entry (read in the code).

## Proposed fix

Make the cache key follow the publication's last modification, so that
every change that stamps the publication (`edit()`, `publish()` and
`unpublish()` each call `stampModified()`) starts a fresh copy. The
public download already holds the publication, so it passes its
`lastModified` in, and a cache hit costs no extra query; only
`clearPublicJatsCache(int)`, called on upload and delete, looks the
publication up
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-xml-stays-old-after-edit/fix.diff)):

```diff
-        $jatsContent = Repo::jats()->getPublicJatsContent($publication->getId(), $submission->getId());
+        $jatsContent = Repo::jats()->getPublicJatsContent($publication->getId(), $submission->getId(), $publication->getData('lastModified'));
```

```diff
-    public function getPublicJatsContent(int $publicationId, int $submissionId): ?string
+    public function getPublicJatsContent(int $publicationId, int $submissionId, ?string $lastModified = null): ?string
     {
-        $cacheKey = $this->getPublicJatsCacheKey($publicationId);
+        $cacheKey = $this->getPublicJatsCacheKey($publicationId, $lastModified);
 …
-    protected function getPublicJatsCacheKey(int $publicationId): string
+    protected function getPublicJatsCacheKey(int $publicationId, ?string $lastModified = null): string
     {
-        return "jats-public-content-{$publicationId}";
+        $lastModified ??= Repo::publication()->get($publicationId)?->getData('lastModified');
+        return "jats-public-content-{$publicationId}-" . md5((string) $lastModified);
     }
```

Tried on `main`: with it, the reader in step 6 got the new title and the
reader in step 11 the published version's XML with its new title. In the
control run, with the fix and without it alike, an uploaded file was
still served before and after a title edit (a returning reader answered
304), and the unpublished version's JATS address was still refused to a
signed-out reader.

The fix keeps the 24-hour cache and covers every writer that stamps the
publication from the one place that owns the cache. With it,
`setVisibility()`'s own `clearPublicJatsCache()` call becomes redundant:
its `edit()` already moves the key.

**Alternatives**:
- Forget the entry from `Repo::publication()->edit()`, `publish()` and
  `unpublish()`, as `NavigationMenuDAO` does for its menus: three call
  sites in the shared publication repository, and every new writer must
  remember a fourth.
- Skip the cache for unpublished versions: closes the preview case only.
- A shorter lifetime: shrinks the window without closing it.

**What goes with it**:
- `lastModified` has one-second resolution. A download in the same
  second as an edit, after the stamp is taken but before the row is
  written, can cache the old XML under the new key until the next
  change or the day's end. Keying on a hash of the XML's inputs would
  close that, at the cost of building them on every request.
- No data repair: entries under the old key expire within a day.
- Left out: contributors, galleys, the issue, the section and the
  journal's settings do not stamp the publication, so their changes
  still wait out the day. Covering them means a `clearPublicJatsCache()`
  call from each of those writers; the team may judge a day acceptable
  there.
- A unit test in pkp-lib: `getPublicJatsContent()` returns the new title
  after `Repo::publication()->edit()`, and the published version's XML
  after `publish()`; and the e2e guard planned in U48.

Small: a few lines in one class and one call, tried, and a unit test.
A proposal; the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-xml-stays-old-after-edit/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/published-jats-xml-stays-old-after-edit/lib.js))
  takes steps 1–11 on an install freshly loaded from the default
  dataset; `WALK=nb` is the control run (an uploaded file, then a title
  edit; the unpublished version's address as a signed-out reader):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/published-jats-xml-stays-old-after-edit/walk.js`.
- Walked on OJS `main`, PostgreSQL, the dataset's own cache settings
  (the file cache); the fault does not depend on the database. Dataset:
  pkp/datasets e8dafbc (2026-10-02). The walk took step 6 in a new
  browser that never downloaded the file, so the stale file came from
  the server's copy and not the browser's; the step 3 browser gives the
  same result, since the server answers it with the same ETag.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a); `stable-3_5_0` OJS
  091fb65453 (lib/pkp cf3f984335); `stable-3_4_0` OJS 75cc2d488b (lib/pkp
  6f96165c90); `stable-3_3_0` OJS ac77c9fb35 (lib/pkp 4156e50233).
- Introduced: `git log -S"jats-public-content"` and `git blame` on
  `getPublicJatsContent()` give 5f5066e1f6, which added the public
  download, the cache and its three clearing calls together;
  `commits/<sha>/pulls` gives `pkp/pkp-lib#12286` (merged 2026-03-25).
  The intent is quoted from `pkp/pkp-lib#10436` (asmecher, 2026-01-30)
  and from 1aab069980's code comment (its commit message has no body).
- 3.5: `PKPJatsController` has `get`, `add` and `delete` only, and OJS's
  `article_details.tpl` and `ArticleHandler` offer no JATS link. 3.4 and
  3.3: no `jats` file in OJS, its lib/pkp or its plugins.
- Searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by symptom words and
  by `getPublicJatsContent` and `clearPublicJatsCache`.
- Unverified: the 24-hour end of the window (read in the code, not
  waited out).
