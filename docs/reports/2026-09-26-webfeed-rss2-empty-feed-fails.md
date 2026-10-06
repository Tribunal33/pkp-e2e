# A journal, press or preprint server with nothing published yet cannot be followed through its RSS 2.0 feed: the link shows a blank page

Model: claude-opus-5-5.

Regression. OJS at `d9b567efec`, OMP at `187f0f40d`, OPS at `61cd158ce3`
(lib/pkp `76a315591b`; the Web Feed plugin at `7436935`); introduced by
pkp/webFeed#19 (`8d18563`, 2026-06-27, merged 2026-07-02).
stable-3_5_0: shows it too (by code) at ojs `a3dc3b54ff`, omp `f77b23709`,
ops `225e25475e` (the plugin at `cd16aa3`, which carries the same change as
`2780559`). Tracked in spec U18 register A1. Temporary: delete once acted
on.

## Summary

Since late June 2026, the RSS 2.0 feed of a journal, press or preprint
server with nothing published yet fails on the server. A visitor who
presses "RSS2 logo" in the "Latest publications" box gets a blank page with
no tab title, where the Atom and RSS 1.0 links give a feed with no items. A
journal that lists its current issue in its feeds meets the same failure
for as long as it has no published issue, even with articles published.

## Impact

Any visitor or feed reader that follows the RSS 2.0 link of a new journal,
press or preprint server meets it, on every load, until the first item is
published. A journal whose feed is set to "Display items in current
published issue." meets it until its first issue is published, however
many articles it publishes outside an issue. The visitor sees an empty
page with no message. A feed reader that subscribes early gets a server
error instead of an empty feed it would check again later, and may refuse
the subscription. Nothing is lost, and the Atom and RSS 1.0 links work
meanwhile. The journal's staff get no warning. Minor: it lasts only until
the first publication (or the first issue), and two of the three feed
links work in the meantime.

## Steps to reproduce

Preconditions:

- A fresh OJS, OMP or OPS install with its default languages.
- A new journal (press, preprint server) named "Sea Letters", with
  nothing published.
- Its "Latest publications" box placed: Settings › Website ›
  "Appearance" › "Setup", "Sidebar", "Web Feed Plugin".

1. Signed out, open the journal's home page,
   `http://{host}/index.php/{journal}`. The sidebar shows "Latest
   publications" with three links, "Atom logo", "RSS2 logo" and "RSS1
   logo".
2. Press "RSS2 logo". The address is
   `http://{host}/index.php/{journal}/gateway/plugin/WebFeedGatewayPlugin/rss2`.
3. Go back and press "Atom logo".

**Expected:** step 2 shows an RSS 2.0 document for "Sea Letters" with no
items, as step 3 does in Atom.

**Observed:** step 2 shows a blank page with an empty tab title. The server
answers 500 with an empty body (sent as `application/rss+xml`) and logs:

```
PHP Fatal error:  Uncaught TypeError: date(): Argument #2 ($timestamp) must be of type ?int, string given in …/cache/t_compile/…rss2.tpl.php:69
```

Step 3 shows the Atom feed of "Sea Letters" with no entry, its `<updated>`
the time of the request. "RSS1 logo" downloads `rss.rdf`, a channel with
no items. The three apps behave the same.

The current-issue case, OJS only: in a journal "Tide Notes" with one
article published outside any issue and no published issue, sign in as
the Journal Manager, open Settings › Website › "Plugins", expand "Web Feed
Plugin", press "Settings", choose "Display items in current published
issue." and press "OK" ("Your changes have been saved."). Signed out, the
Atom feed then has no entry, and the RSS 2.0 address answers 500 with the
same log line.

## Cause

`templates/rss2.tpl`, the channel's `<pubDate>` (lines 42–43):

```smarty
{capture assign="latestDate"}{$latestDate|strtotime}{/capture}
<pubDate>{$smarty.const.DATE_RSS|date:$latestDate}</pubDate>
```

`WebFeedGatewayPlugin::fetch()` sets `$latestDate` to the current issue's
publication date or, failing that, to the first listed submission's
`lastModified`. With nothing to list both are missing and `$latestDate`
is `null`. `strtotime(null)` gives `false`, `{capture}` turns that into the
empty string, and `date(DATE_RSS, '')` throws the `TypeError`, which ends
the response with a 500 after the content type was set. Before `8d18563`
the line was `{$latestDate|date_format:$smarty.const.DATE_RSS}`, whose
Smarty/Carbon formatter reads `null` as now; the Atom template still uses
`date_format` for its `<updated>`, which is why Atom answers. The item
`<pubDate>` uses the same pattern, but a listed item always has a
publication date.

## Proposed fix

A proposal; the team decides.

1. Print the channel `<pubDate>` only when there is a date:
   `{if $latestDate}…{/if}` around the two lines. `<pubDate>` is optional
   in RSS 2.0. One template, no other effect.
2. Or give the feed a date in the plugin, as Atom effectively does:
   `$latestDate ??= Core::getCurrentDate();` after the fallback in
   `fetch()`. It keeps every channel dated, and costs one line; it also
   covers the Atom and RSS 1.0 templates should they move off
   `date_format`.
3. Either way, apply it to `stable-3_5_0` as well, which carries the same
   template.

## Evidence

- Re-drive for this report, 2026-09-26, on the main fleet's probe servers
  (8050/8150/8250), kept script
  `shared/playwright/checks/U18/reports/rep.js`
  (`PROBE_FEATURE=U18 PROBE_AGENT=rep node bin/probe.js <ojs|omp|ops> shared/playwright/checks/U18/reports/rep.js`,
  phases `seed,a1,a1issue`). Scratch contexts, box placed through the
  seed's `sidebar`: OJS `u18reprepg67rtae`, OMP `u18reprepbvp0oue`, OPS
  `u18reprep5w0n58e` ("Sea Letters …"). Snapshots in `.reports/U18/rep/`:
  - `a1-01-home-*` (+ `.png`): the box "Latest publications", its three
    links and their hrefs.
  - `a1-02-rss2-logo-*` (+ `.png`): the click on "RSS2 logo", status 500,
    `application/rss+xml`, body length 0, tab title empty, page text
    empty; the log lines in `rep-facts-*.json` key `a1-02-server-log`
    (01:13:11 OPS, 01:13:59 OJS, 01:15:21 OMP).
  - `a1-03-atom-logo-*`: Atom 200, no entry, `<updated>` the request
    time; `a1-04-rss-logo-*`: `rss.rdf` downloaded, no item.
  - OJS current-issue case, context `u18reprepg67rtak` (one article
    published without an issue): `a1i-01-current-issue-{filled,after-ok}-ojs`
    (the window, "Your changes have been saved."), `a1i-02-atom-ojs` (no
    entry), `a1i-03-rss2-ojs` (500) and the log line under
    `a1i-03-server-log`.
  - Run records `run-ojs-011352.json`, `run-omp-011506.json`,
    `run-ops-011306.json`: each rss2 500 is in `crashes`. The other
    `crashes` entries are the Plugin Gallery's
    `plugin-gallery-grid/fetch-grid` 500 on Settings › Website, a known
    separate defect (U62).
- Claim check chunk K1 (`.reports/U18/cc-K1.md`, K1-9, the A1 section),
  2026-09-25, two runs per app: `.reports/U18/ccK1/f-10-fresh-signed-out-rss2-*`
  and `u-05-no-published-issue-rss2-ojs`. Also footnote f-a1 and note td5
  of `docs/specs/U18-web-feeds.md`.
- The introducing change: `git blame` on
  `checkouts/<app>/plugins/generic/webFeed/templates/rss2.tpl` gives lines
  42–43 to `8d18563` (Antti-Jussi Nygård, 2026-06-27), merged by
  pkp/webFeed#19 (`115c9c5`, 2026-07-02); its diff replaces
  `date_format:$smarty.const.DATE_RSS` with `strtotime` and `date`.
- stable-3_5_0, by code only: `checkouts/stable-3_5_0/<app>/plugins/generic/webFeed`
  at `cd16aa3` carries the same change as `2780559` ("Use a valid date
  format in rss2 pubDate", 2026-06-27); its `rss2.tpl` and
  `WebFeedGatewayPlugin::fetch()` read the same. Not driven.
- The before side was not driven; it rests on the pre-change line.
- Unverified: whether a feed reader refuses the subscription (no feed
  reader on the fleet).
