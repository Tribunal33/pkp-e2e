# An article page tells indexers its journal lives at an address that answers "404 Not Found"

Model: claude-opus-5-5.

Regression. OJS at `d9b567efec` (lib/pkp `76a315591b`); introduced by
pkp/ojs#4146 (`2c65b53000`, 2024-04-16, merged 2024-04-25; pkp/pkp-lib#699
"Show locale in url in multilingual contexts"). stable-3_5_0: shows it
too (by code) at ojs `a3dc3b54ff`. Tracked in spec U20 register OJS1.
Temporary: delete once acted on.

## Summary

Every article page carries, for indexers that read Dublin Core, the
address of the journal it belongs to ("DC.Source.URI"). Since April 2024
that address repeats the journal's path, such as
`https://example.org/index.php/journal/journal`, and opens a bare "404
Not Found" page instead of the journal's home page.

## Impact

No reader sees it: the value sits in the page's header, where indexing
services and harvesters that read Dublin Core pick it up. Every article
of every journal with the "Dublin Core Indexing Plugin" on (it is on for
a new journal) announces its journal's home page wrongly, so an index
that links an article back to its journal, or groups articles by that
address, gets a dead link or a journal address that matches no other
record. Nothing is lost on the journal's own pages, and there is no
workaround on screen short of turning the plugin off. A press's book
pages give the press's home page correctly. Minor: a wrong link in
metadata for machines, on every article, silently, since 2024.

## Steps to reproduce

Preconditions:

- A fresh OJS install with its default languages.
- A journal "Tide Notes" (the "Dublin Core Indexing Plugin" ticked under
  Settings › Website › "Plugins", as it is for a new journal) with a
  published issue "Vol. 1 No. 1 (2025)" and in it a published article
  "Tidal Patterns".

1. Signed out, open the journal's home page and press "Tidal Patterns".
2. Open the page's source (the browser's "View Page Source") and find
   `DC.Source.URI`.
3. Open the address it names.

**Expected:** in step 2 the tag names the journal's home page,
`http://{host}/index.php/{journal}`, and in step 3 that page opens.

**Observed:** in step 2, beside the correct article address:

```html
<meta name="DC.Identifier.URI" content="http://{host}/index.php/{journal}/article/view/21">
<meta name="DC.Source" content="Tide Notes">
<meta name="DC.Source.URI" content="http://{host}/index.php/{journal}/{journal}">
```

In step 3 the server answers 404 with a page that holds only the heading
"404 Not Found" (no journal header, an empty tab title). The server logs
the request as `[404]` and nothing else. Control: the journal's home page
`http://{host}/index.php/{journal}` answers 200 ("Tide Notes").

## Cause

`APP\plugins\generic\dublinCoreMeta\DublinCoreMetaPlugin::articleView()`
(line 188):

```php
$templateMgr->addHeader('dublinCoreSourceUri', '<meta name="DC.Source.URI" content="' . $request->getDispatcher()->url($request, PKPApplication::ROUTE_PAGE, null, $journal->getPath(), urlLocaleForPage: '') . '"/>');
```

`Dispatcher::url()` takes `($request, $shortcut, $newContext, $handler,
…)`, so the journal's path lands in the handler slot, after the current
journal: `{journal}/{journal}`, a page handler that does not exist.
Commit `2c65b53000` rewrote the call from
`$request->url($journal->getPath())`, where the path was the context
argument and the address was the home page. OMP's copy of the plugin
passes the press's path as `$newContext` and is correct.

## Proposed fix

A proposal; the team decides.

1. Move the path to the context slot, as OMP does:
   `$request->getDispatcher()->url($request, PKPApplication::ROUTE_PAGE, $journal->getPath(), urlLocaleForPage: '')`.
   One line; not tried.
2. Apply the same to `stable-3_5_0`, which carries the same line.

## Evidence

- Re-drive for this report, 2026-09-26, on the main fleet's OJS probe
  server (8050), kept script `shared/playwright/checks/U20/reports/rep.js`
  (`PROBE_FEATURE=U20 PROBE_AGENT=rep node bin/probe.js ojs shared/playwright/checks/U20/reports/rep.js`,
  phases `seed,ojs1`). Scratch journal "Tide Notes u20reprepkyb7mb"
  (`u20reprepkyb7mb`), seeded through the harness; the article is
  submission 21 in issue 19. Snapshots in `.reports/U20/rep/`:
  `ojs1-01-article-page-ojs` (+ `.png`), `ojs1-03-source-uri-opened-ojs`
  (+ `.png`, the bare "404 Not Found"), `rep-facts-ojs.json`
  (`ojs1-02-source`: the tags quoted above; `ojs1-03-source-uri-opened`:
  404, empty title; `ojs1-04-home-control`: 200). The run record
  `run-ojs-071853.json` holds that one 404 and its console line "Failed
  to load resource: the server responded with a status of 404 (Not
  Found)", nothing else; the probe server's log shows `[404]: GET
  /index.php/u20reprepkyb7mb/u20reprepkyb7mb` and no error.
- Claim check K3 (`.reports/U20/cc-K3.md`, lines 99 and 137), 2026-09-26:
  `.reports/U20/ccK3/k3-029-read-01-rich-landing-ojs` and
  `k3-facts-ojs.json` (`read.follow`: `DC.Source.URI`
  `…/index.php/u20k3cck3pum875m/u20k3cck3pum875m`, 404); OMP's tag named
  the press's home page, 200 (`k3-038-read-01-rich-landing-omp`).
  Footnotes i, q14 and f-ojs1 of
  `docs/specs/U20-search-engine-metadata-and-analytics.md`.
- The introducing change: `git show 2c65b53000 -- plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`
  in `checkouts/ojs` (jyhein, 2024-04-16), brought in by merge
  `072fea3a70` "Merge pull request #4146 from jyhein/f699" (2024-04-25);
  no later commit touches the line.
- stable-3_5_0, by code only: `checkouts/stable-3_5_0/ojs` at
  `a3dc3b54ff` contains `2c65b53000` and carries the same line (184).
  Not driven.
- The before side was not driven; it rests on the diff.
