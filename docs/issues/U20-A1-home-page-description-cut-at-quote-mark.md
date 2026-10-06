# Search engines get the home page's "Description" cut at its first double quote mark

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#1586` for `pkp/pkp-lib#1468` · [3ebecf512d](https://github.com/pkp/pkp-lib/commit/3ebecf512dd40d6701505c29122e17b122942939) · 2016-06-30 · PR by Alec Smecher (asmecher), commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager who types a "Description" on Settings › Distribution ›
"Search Indexing" expects search engines to receive the whole text
from the journal's home page. When the text holds an ordinary straight
double quote mark (`"`), the home page's description tag ends at that
mark, and the words after it are dropped from the description. The
form says "Saved" and nothing on the page changes, so the cut goes
unnoticed.

The box is plain text with no formatting editor, but markup can be
typed into it by hand. Typing a description that ends
`"public access to <i>science</i>".` also puts the text
`science"." />` at the top of the home page, above the header.

It applies to the "Description" in every language, on the journal's
(press's, server's) own home page, the one page that carries the tag.
The site's index page never carries it.

## Impact

- **Lost**: the description's words from the first `"` on, for search
  engines, silently; with markup typed after the mark, a line of stray
  characters on the public home page.
- **Who**: the description is written by the Site Administrator and by
  managers and editors whose role has "Permit changes to Settings", as
  the default manager-level roles do. Every visitor and search engine
  that reads the home page meets the result. Straight quote marks are
  an ordinary way to quote a name or a phrase.
- **Way round**: typographic quote marks (“ ”) or none.

Medium: a public output (the home page's search description) is wrong
in one field, silently, but only for a description holding a straight
double quote mark, with an easy way round; it would be high if any
description were cut, whatever its text.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same way). Its
  journal `publicknowledge` already holds an English "Description":
  "The Journal of Public Knowledge is a peer-reviewed quarterly
  publication on the subject of public access to science." (OMP:
  "Public Knowledge Press is a publisher dedicated to the subject of
  public access to science."; OPS: "The Public Knowledge Preprint
  Server is a preprint service on the subject of public access to
  science.").

Quote marks:

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "Search Indexing".
3. In "Description", put the last words in double quote marks: `… on
   the subject of "public access to science".` Press "Save": "Saved"
   shows.
4. Open the journal's home page (`/index.php/publicknowledge/en`) and
   view the page source, or the element inspector's
   `<meta name="description">`.

Quote marks and markup:

5. Back on "Search Indexing", put the last word in italics markup as
   well: `… on the subject of "public access to <i>science</i>".` Press
   "Save".
6. Open the home page again.

**Expected**: the tag carries the whole text, its marks escaped, and a
browser reads it as typed; nothing shows above the header:

```html
<meta name="description" content="The Journal of Public Knowledge is a peer-reviewed quarterly publication on the subject of &quot;public access to science&quot;." />
```

**Observed**: after step 3 the page source reads:

```html
<meta name="description" content="The Journal of Public Knowledge is a peer-reviewed quarterly publication on the subject of "public access to science"." />
```

The browser reads the description as "The Journal of Public Knowledge
is a peer-reviewed quarterly publication on the subject of ", with the
stray attributes `public`, `access`, `to` and `science"."`. Nothing
shows on the page. After step 6 the tag ends at `<i>`'s `>`
(attributes `public`, `access`, `to`, `<i`), the page opens with the
text `science"." />` above the header (the default theme), and the browser places the rest
of the page's head (the theme's style sheets among them) in the body.

The dataset's own description, without a quote mark, reaches the tag
whole. So does markup with no quote mark before it (`… public access to
<i>science</i> & society.`), which stays inside the attribute.

## Cause

`PKPTemplateManager::initialize()` (pkp-lib,
`classes/template/PKPTemplateManager.php`, line 326 on `main`) builds the
tag by string concatenation and hands it to `addHeader()`:

```php
$this->addHeader('searchDescription', '<meta name="description" content="' . $currentContext->getLocalizedData('searchDescription') . '" />');
```

`addHeader()` only stores the string in `_htmlHeaders`;
`smartyLoadHeader()` (`{load_header}`, called with `context="frontend"`
from the shared `templates/frontend/components/headerHead.tpl`) prints
the stored strings joined as they are, without escaping. The tag is
added only when the request has a context and its page is `''` or
`index`, so it is the context's home page alone.

The value is plain text from a `FieldText` (`PKPSearchIndexingForm`),
stored as typed, so it has to be escaped where it enters HTML. Nothing
escapes it: a `"` closes the `content` attribute, and a `>` after that
closes the tag, which leaves the rest as text in the head, where the
browser ends the head and starts the body.

Up to OJS 2.4 the tag was written by a template that escaped it:
`<meta name="description" content="{$metaSearchDescription|escape}" />`
in `templates/common/header.tpl`. During 3.0's development it moved,
still escaped, into `templates/frontend/components/headerHead.tpl`,
inside `{if $requestedOp == 'index' && $metaSearchDescription != ''}`.
The theme API overhaul (`pkp/pkp-lib#1468`, 3ebecf512d, merged before
3.0.0 was released) moved the head's tags into `addHeader()` calls
built in PHP so themes and plugins can manage them, and dropped the
`|escape` on the way. So every 3.x release has the fault.

The same fault elsewhere, each checked in the code:

- Every other `addHeader()` call in pkp-lib and the three apps that
  writes stored text escapes it with `htmlspecialchars()` (the Google
  Scholar and Dublin Core plugins, every `content` attribute); the rest
  print URLs or values the app makes itself.
- The other readers of the same setting escape it: the LOCKSS and
  CLOCKSS pages (`|escape`, OJS) and the web feeds' channel
  description (`|strip|escape:"html"`, the three apps).
- "Custom Tags" is meant to be printed raw and is not part of this
  fault.
- Stored data is not wrong: the text is kept as typed, so fixing the
  output fixes every existing description.

## Proposed fix

Escape the value where the tag is built, as every plugin tag beside it
does. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-description-cut-at-quote-mark/fix.diff),
one line in pkp-lib, written against the app root (`git apply -p3`
in a pkp-lib clone).

```diff
-                    $this->addHeader('searchDescription', '<meta name="description" content="' . $currentContext->getLocalizedData('searchDescription') . '" />');
+                    $this->addHeader('searchDescription', '<meta name="description" content="' . htmlspecialchars($currentContext->getLocalizedData('searchDescription')) . '" />');
```

Tried on the three apps' `main`: steps 4 and 6 now show the Expected
tag, the browser reads the whole text with its marks and markup, and
nothing shows above the header. With the fix in and out, a description
with markup and "&" but no quote mark (`… public access to
<i>science</i> & society.`) reads the same in the browser; the fix
changes only how the page source writes it (`&lt;i&gt;`, `&amp;`).

**Alternatives**

- Escape inside `addHeader()`: it receives whole tags, so it cannot
  tell markup from text; each caller has to escape its own values.
- `htmlspecialchars(strip_tags(…))`, as the plugins do for abstracts:
  the "Description" is plain text, not rich text, so removing what a
  manager typed is a product choice rather than part of this fix.

**What goes with it**

- Data: a manager who worked round the fault by typing `&quot;` would
  see those characters in the description afterwards.
- Backport: `stable-3_5_0` has the same line (275), `stable-3_4_0` too
  (271), and the diff applies with the offset. `stable-3_3_0` has it in
  `PKPTemplateManager.inc.php` (221), the same change by hand.
- Guard: an e2e check in pkp-e2e's U20 spec that saves a
  "Description" with a double quote mark and reads the home page's
  tag.

Small: one function call in one line of pkp-lib, following the pattern
of the plugin tags beside it, tried on the three apps.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-description-cut-at-quote-mark/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/home-page-description-cut-at-quote-mark/walk.js`
  (`NB=1` in front runs the neighbour check alone: markup and "&"
  without a quote mark). It reads the tag three ways: the line as the
  server sent it, the text the browser reads, and text the browser put
  straight in the body.
- The fix, tried 2026-10-03 on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/home-page-description-cut-at-quote-mark/fix.diff ojs omp ops`.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    (lib/pkp cf3f984335), OPS 38b61882d3 (lib/pkp cf3f984335).
  - All on the default theme, which each dataset uses. Other themes not
    checked: one that prints its head through `{load_header
    context="frontend"}`, as the shared `headerHead.tpl` does, gets the
    same tag; where the stray text shows depends on its markup.
- 3.4, by code: pkp-lib `stable-3_4_0` at 767353f4fe (the three apps'
  `lib/pkp`), apps at OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b; read
  `classes/template/PKPTemplateManager.php` (the same concatenation), `classes/components/forms/context/PKPSearchIndexingForm.php`
  (the same `FieldText`) and `templates/frontend/components/headerHead.tpl`
  (`{load_header context="frontend"}`).
- 3.3, by code: pkp-lib `stable-3_3_0` at ac3fa73402, apps at OJS
  ac77c9fb35, OMP 8e72fc883, OPS c5532e2161; read
  `classes/template/PKPTemplateManager.inc.php` (the same
  concatenation), `PKPSearchIndexingForm.inc.php` and
  `headerHead.tpl`.
- Introduced: `git blame` on line 326 gives 809130814759 (2025-02-06,
  `pkp/pkp-lib#10894`, which only turned `">` into `" />`); blame at its
  parent gives e3f570bc37 (2021, `pkp/pkp-lib#5678`, PSR-12 formatting);
  `git log
  -S` on the concatenation reaches 5f3be929e6 (2018, `getLocalizedSetting`
  to `getLocalizedData`) and 3ebecf512d, which added it and removed
  the escaped tag from `templates/frontend/components/headerHead.tpl`.
  The GitHub API names `pkp/pkp-lib#1586` for 3ebecf512d, opened by
  asmecher from his branch and holding commits by NateWr and asmecher.
  GitHub's compare of 3ebecf512d with acb6329991 (the pkp-lib commit
  OJS's `ojs-3_0_0-0` tag pins) puts 3ebecf512d in 3.0.0; pkp-lib's
  `ojs-stable-2_4_8` has the escaped tag in `templates/common/header.tpl`.
- Not driven: the French "Description" (the dataset holds only an
  English one; the code reads every language the same way), the
  Settings Wizard's "Search Indexing" tab (the same form), and how a
  given search engine displays the cut text. MySQL not checked; the
  fault does not depend on the database.
- Upstream search 2026-10-03: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, by phrases such as "meta
  description quote", "searchDescription" and "htmlspecialchars
  addHeader". `pkp/pkp-lib#1109` (closed) discusses which pages carry
  the tag, not its escaping.
