# A preprint server's RSS 1.0 feed names its publisher "Array"

Model: claude-opus-5-5.

Regression. OPS at `61cd158ce3` (lib/pkp `76a315591b`; the Web Feed
plugin at `7436935`); introduced by pkp/webFeed#14 (`85a7d80`,
2025-09-09, merged 2025-09-15). stable-3_5_0: shows it too (by code) at
ops `225e25475e` (the plugin at `cd16aa3`, which carries the same change
as `2d71f68`). Tracked in spec U18 register OPS1. Temporary: delete once
acted on.

## Summary

Since September 2025, the RSS 1.0 feed of every preprint server gives its
publisher as the word "Array" instead of the server's name. A journal's
feed names the journal's "Publisher" and a press's its "Press Publisher
Name"; only the preprint server's is wrong.

## Impact

Every reader of a preprint server's RSS 1.0 feed meets it, on every load,
on every server: the feed's publisher field, which a feed reader or an
aggregator that indexes the feed shows as the source, reads "Array". The
Atom and RSS 2.0 feeds carry no publisher and are unaffected, and the
server's own pages are right. Nothing is lost, and there is no setting on
screen that changes the value. Minor: one field of one of the three feed
formats, but on every preprint server.

## Steps to reproduce

Preconditions:

- A fresh OPS install with its default languages.
- A new preprint server named "Sea Letters".
- Its "Latest publications" box placed: Settings › Website ›
  "Appearance" › "Setup", "Sidebar", "Web Feed Plugin".

1. Signed out, open the server's home page,
   `http://{host}/index.php/{server}`.
2. In the sidebar box "Latest publications", press "RSS1 logo". The
   browser downloads `rss.rdf`
   (`…/gateway/plugin/WebFeedGatewayPlugin/rss`).
3. Open the downloaded file in a text editor.

**Expected:** the channel's publisher is the server's name, "Sea Letters".

**Observed:** the channel reads:

```xml
<title>Sea Letters</title>
…
<dc:publisher>Array</dc:publisher>
…
<prism:publicationName>Sea Letters</prism:publicationName>
```

The value is the same after the server's "Masthead" is saved and when the
feed is read in French. Control: on a journal the same element carries the
"Publisher" typed on Settings › Journal › "Masthead", and on a press the
"Press Publisher Name"; with neither set the element is left out.

## Cause

`WebFeedGatewayPlugin::fetch()` (lines 122–126):

```php
'publisher' => match ($applicationIdentifier) {
    'ojs' => $context->getData('publisherInstitution'),
    'omp' => $context->getData('publisher'),
    'ops' => $context->getData('name'),
},
```

`publisherInstitution` and `publisher` are plain strings, but a context's
`name` is multilingual: `getData('name')` returns the per-language array
(`['en' => 'Sea Letters', …]`). `rss.tpl` prints it as
`{$publisher|strip|escape:"html"}`, and PHP turns the array into the word
"Array". Before `85a7d80` the template read `publisherInstitution` for
every app, which a server does not have, so the element was left out;
the change, made for pkp/pkp-lib#11795 (the press's publisher in exports),
added the server's name without choosing a language.

## Proposed fix

A proposal; the team decides.

1. Read the name in the visitor's language:
   `'ops' => $context->getLocalizedName(),`. One line; the feed is already
   rendered in the request's language.
2. Or leave the publisher out for a server
   (`'ops' => null`), as before `85a7d80`, if the server's name is not
   meant as its publisher; `prism:publicationName` carries the name
   already. One line; the feed then has no publisher at all.
3. Either way, apply it to `stable-3_5_0`, which carries the same code.

## Evidence

- Re-drive for this report, 2026-09-26, OPS probe server (8250), kept
  script `shared/playwright/checks/U18/reports/rep.js`
  (`PROBE_FEATURE=U18 PROBE_AGENT=rep PHASES=seed,ops1 node bin/probe.js ops shared/playwright/checks/U18/reports/rep.js`).
  Scratch server `u18reprep5w0n58e` ("Sea Letters u18reprep5w0n58", box
  placed through the seed's `sidebar`). Snapshots in `.reports/U18/rep/`:
  `a1-01-home-ops` (+ `.png`, the box and its "RSS1 logo" link) and
  `ops1-01-rss-logo-ops.json` (download `rss.rdf`, 200,
  `application/rdf+xml`, the document in `body`, `dc:publisher`
  "Array"). The same element in the second scratch server
  `u18reprep5w0n58k`: `a7-06-rss-after-ops.json`. The OJS and OMP RSS 1.0
  feeds of scratch contexts with no publisher set
  (`a1-04-rss-logo-{ojs,omp}`) carry no `dc:publisher`.
- Claim check chunk K1 (`.reports/U18/cc-K1.md`, K1-3), 2026-09-25:
  `.reports/U18/ccK1/f-10-fresh-signed-out-rss-ops`,
  `c-13-support-license-rss-ops` (after the Masthead save) and
  `r-06-fr-address-rss-ops` (French), `dc:publisher` "Array" in each; the
  controls `c-06-summary-publisher-online-issn-rss-ojs` (OJS "Publisher")
  and `c-06-summary-publisher-online-issn-rss-omp` (OMP "Press Publisher
  Name"). Also
  footnotes c and f-ops1 of `docs/specs/U18-web-feeds.md`.
- The introducing change: `85a7d80` (Kaitlin Newson, 2025-09-09),
  "pkp/pkp-lib#11795 fix publisher metadata for omp and ops", merged by
  pkp/webFeed#14 (`0f99530`, 2025-09-15). Its diff adds the `publisher`
  match above and switches `rss.tpl` from `publisherInstitution` to
  `$publisher`.
- stable-3_5_0, by code only: `checkouts/stable-3_5_0/ops/plugins/generic/webFeed`
  at `cd16aa3` carries the same change as `2d71f68` (same title and date);
  `WebFeedGatewayPlugin.php` lines 122–126 and `rss.tpl` read the same.
  Not driven.
- The before side was not driven; it rests on the pre-change template.
