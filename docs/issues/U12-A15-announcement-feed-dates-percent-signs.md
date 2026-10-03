# A journal's Atom and RSS 1.0 announcement feeds write every date with "%" signs ("%2026-%10-%03UTC%UTC%275")

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS (OMP and OPS have no announcement feed)
  - 3.5: OJS
  - 3.4: OJS (code; from 3.4.0-8)
  - 3.3: none (code; Smarty's own date modifier)
- **Introduced** the templates' date patterns never changed; replacing Smarty's `date_format` modifier broke them: `pkp/pkp-lib#9303`, on 3.4 [d6b045e](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879) (PR `pkp/pkp-lib#10352`, first in 3.4.0-8), on `main` [22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5) (first in 3.5.0 rc2) · 2024-09-06 · Alec Smecher (asmecher). A later OJS change, `pkp/ojs#4433` for `pkp/pkp-lib#10328` ([5d5b768](https://github.com/pkp/ojs/commit/5d5b768be96decc4233765b0b56029a98c5e88d0), 2024-10-01, Vitalii Bezsheiko, Vitaliy-1), moved three of the four lines to `->format()` with the same patterns.
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U12 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a15)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A visitor who subscribes to a journal's announcements in the Atom or the
RSS 1.0 feed gets dates that are not dates. For an announcement posted
on 3 October 2026 at 16:27:47 UTC, the Atom feed's "updated" date and
each entry's "updated" and "published" dates read
"%2026-%10-%03UTC%UTC%275", where "2026-10-03T16:27:47+00:00" is
expected; each RSS 1.0 item's date reads "%2026-%10-%03" for
"2026-10-03".

In the Atom value "UTC" is the time zone's name standing where the time
should be, and "275" the day of the year: the time of day is gone. A
common feed reader library keeps the feed but drops every one of these
dates, and the W3C feed validator rejects the Atom feed. The RSS 2.0 feed
of the same journal carries the dates correctly.

It needs the "Announcement Feed Plugin", which is off on a new journal.

## Impact

- **Lost.** When each announcement was posted, and when the Atom feed
  last changed, for every reader of the two feeds. Nobody is told.
- **Who.** Every subscriber to a journal's Atom or RSS 1.0 announcement
  feed, and any site that shows those feeds.
- **Way round.** The subscriber uses the RSS 2.0 feed, whose logo link
  sits beside the other two in the plugin's sidebar box. The journal has
  no setting that changes the dates.

Medium: every item of a public output is wrong in its dates (two per
Atom entry, one per RSS 1.0 item, and the Atom feed's own), silently,
and the RSS 2.0 feed is a way round. Atom's `<updated>` is required, so
the Atom feed is not valid Atom; the reader library tried still shows
the announcements, without dates, so the feed keeps its purpose. That
matches the MARC field 008 report's medium
([U19-A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A15-oai-marc-008-date-percent-signs.md)).
It would be high if common readers refused the feed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: the journal `publicknowledge`.
  Announcements are off there, the "Announcement Feed Plugin" is
  disabled and the journal has no announcements.

Signed in as `rvaca` (journal manager):

1. Settings › Website › Setup › "Announcements": tick "Enable
   announcements", press "Save".
2. Settings › Website › "Plugins": tick "Announcement Feed Plugin".
3. Side menu "Announcements" › "Add Announcement": title "u12r4 dated",
   "Save".

Signed out:

4. Open `/index.php/publicknowledge/gateway/plugin/AnnouncementFeedGatewayPlugin/atom`
   and read the page source: the feed's `<updated>` and the entry's
   `<updated>` and `<published>`.
5. Open the same address ending in `rss` (the browser downloads it; open
   the file) and read the item's `<dc:date>`.
6. Open the same address ending in `rss2` and read the channel's and the
   item's `<pubDate>`.

**Expected.** The time "u12r4 dated" was posted, in the form each format
asks for: in Atom, RFC 3339 (`2026-10-03T16:27:47+00:00`); in RSS 1.0, a
W3C date (`2026-10-03`).

**Observed.** After step 4, in the feed's head and in the entry alike:

```
<updated>%2026-%10-%03UTC%UTC%275</updated>
…
<updated>%2026-%10-%03UTC%UTC%275</updated>
<published>%2026-%10-%03UTC%UTC%275</published>
```

After step 5:

```
<dc:date>%2026-%10-%03</dc:date>
```

Control: step 6 shows the dates correctly (`Sat, 03 Oct 2026 16:27:47 +0000` for the channel and the item).

## Cause

The two templates give PHP's date formatting a pattern written in the
old `strftime()` form. In `plugins/generic/announcementFeed/templates/atom.tpl`:

```smarty
<updated>{$dateUpdated|date_format:"%Y-%m-%dT%T%z"|regex_replace:"/00$/":":00"}</updated>
…
<updated>{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}</updated>
…
<published>{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}</published>
```

and in `rss.tpl`:

```smarty
<dc:date>{$announcement->datePosted->format("%Y-%m-%d")}</dc:date>
```

In a `date()` pattern "%" is not a pattern letter and is printed as it
stands; "Y", "m" and "d" print the year, month and day; "T" prints the
time zone's abbreviation ("UTC") and "z" the day of the year counted
from 0 ("275"). So `%Y-%m-%dT%T%z` gives `%2026-%10-%03UTC%UTC%275`, and
the `regex_replace` meant to turn `+0000` into `+00:00` finds nothing.

The patterns were right for Smarty's own `date_format` modifier, which
sent a pattern holding "%" to `strftime()`.
[22c0390](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5)
(for `pkp/pkp-lib#9303`, so that dates follow the reader's language)
registered `PKPTemplateManager::smartyDateFormat()` in its place, which
calls Carbon's `translatedFormat()` and takes `date()` patterns only; the
templates were not changed with it. Three weeks later `pkp/ojs#4433`
([5d5b768](https://github.com/pkp/ojs/commit/5d5b768be96decc4233765b0b56029a98c5e88d0),
for `pkp/pkp-lib#10328`) moved the entries' dates from the modifier to
Carbon's `format()` on the new model's `datePosted`, keeping the
patterns, which `format()` reads the same way.

Reach:

- RSS 2.0 prints its dates with PHP's `DATE_RSS` and is right (walked).
- The Atom feed's own date comes from the plugin's stored `dateUpdated`
  setting when the journal has no current announcement; it goes through
  the same pattern (walked on a journal with no announcement).
- The same mistake, a `strftime()` pattern handed to Carbon, is in other
  templates, each reported or tracked apart: the "Endnote/Zotero/Mendeley
  (RIS)" citation download
  ([U13-A8-ris-download-dates-percent-signs.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-A8-ris-download-dates-percent-signs.md)),
  MARC field 008 in OAI-PMH
  ([U19-A15-oai-marc-008-date-percent-signs.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A15-oai-marc-008-date-percent-signs.md)),
  and the COUNTER report's `Created` attribute
  (`plugins/reports/counter/templates/reportxml.tpl` and `sushixml.tpl`,
  in the code). The RIS report's fix changes the three date patterns
  of the citation plugin's `ris.blade`, and the MARC report's the field
  008 line of the two MARC templates; neither touches the announcement
  feed.

## Proposed fix

Write the four patterns in `date()` form, the way the web feed plugin's
templates already do (`date_format:"Y-m-d\TH:i:sP"` in its `atom.tpl`,
`date_format:"Y-m-d"` in its `rss.tpl`), and drop the `regex_replace`,
since "P" already prints the offset with a colon. A proposal; the team
decides.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-feed-dates-percent-signs/fix.diff)
(against the OJS root):

```diff
--- a/plugins/generic/announcementFeed/templates/atom.tpl
-	<updated>{$dateUpdated|date_format:"%Y-%m-%dT%T%z"|regex_replace:"/00$/":":00"}</updated>
+	<updated>{$dateUpdated|date_format:"Y-m-d\TH:i:sP"}</updated>
…
-		<updated>{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}</updated>
+		<updated>{$announcement->datePosted->format("Y-m-d\TH:i:sP")}</updated>
…
-		<published>{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}</published>
+		<published>{$announcement->datePosted->format("Y-m-d\TH:i:sP")}</published>
--- a/plugins/generic/announcementFeed/templates/rss.tpl
-		<dc:date>{$announcement->datePosted->format("%Y-%m-%d")}</dc:date>
+		<dc:date>{$announcement->datePosted->format("Y-m-d")}</dc:date>
```

Tried on OJS `main`: the Atom dates read `2026-10-03T17:06:21+00:00`
and the RSS 1.0 date `2026-10-03`; the RSS 2.0 feed was the same as
without the fix. On a journal with no current announcement the Atom
feed's own date was read on two requests, because the first stores
`Carbon::now()` and the second reads that stored string back, so both
kinds of value reach the modifier: `2026-10-03T17:06:37+00:00` both
times with the fix, `%2026-%10-%03UTC%UTC%275` without it.

The change keeps what `pkp/pkp-lib#9303` and `pkp/pkp-lib#10328` were
for: the values are digits, so the reader's language does not change
them, and the dates stay Carbon objects.

**Alternatives**

- Make `PKPTemplateManager::smartyDateFormat()` translate a `strftime()`
  pattern first, as `PKPString::convertStrftimeFormat()` does for the
  configured date formats. The entries' dates call Carbon's `format()`
  directly, so no shared layer reaches them. For the feed's own date,
  the conversion table has no `%T` or `%z`, so "%" signs would stay, and
  the literal "T" after `%d` would still print the zone's name.

**What goes with it**

- 3.4 (from 3.4.0-8): the four lines there go through the modifier
  (`$announcement->getDatetimePosted()|date_format:"%Y-%m-%dT%T%z"`,
  `getDatePosted()|date_format:"%Y-%m-%d"`), so the backport changes
  the patterns alone. Not tried there.
- Guard: an e2e scenario in this repository's announcements spec (the
  Atom and RSS 1.0 feeds' dates parse as dates), or a plugin test that
  renders the two templates and checks the date elements.

Small: four patterns in two templates of one OJS plugin, in the form the
web feed plugin uses, with no data repair.

## Evidence

- Kept script that takes the Steps on OJS, on installs freshly loaded
  from PKP's default test dataset (pkp/datasets 566bb1f, 2026-10-03, the
  `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/announcement-feed-dates-percent-signs/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-feed-dates-percent-signs/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/announcement-feed-dates-percent-signs/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each feed in
  the browser and reads its raw XML in the same session. With `NB=1` in
  front it runs the journal-with-no-announcement check instead: the
  three feeds of the journal with no announcement, the Atom feed twice.
- Walked on `main` (OJS ff004d0973, lib/pkp 987776cd04) and on
  `stable-3_5_0` (OJS c1cee76b95, lib/pkp 771474347e), where the dates
  read the same as on `main` (`%2026-%10-%03UTC%UTC%275`,
  `%2026-%10-%03`). The walks ran on PostgreSQL; the fault does not
  depend on the database.
- Feed readers: Python's feedparser 6.0.14 (the library behind many
  aggregators) given an Atom and an RSS 1.0 document with the walked
  values keeps both feeds without an error flag (`bozo` false) and
  returns no date for the feed or any entry (`updated_parsed`,
  `published_parsed` None); with the fixed values it returns
  2026-10-03 17:06:21 UTC and 2026-10-03. The W3C feed validator
  (validator.w3.org/feed, raw input) rejects the Atom document:
  "updated must be an RFC-3339 date-time", "published must be an
  RFC-3339 date-time". Desktop and web readers were not tried.
- The plugin is off in the default test dataset (walked) and on a newly
  created journal (checked 2026-09-17).
- Code read on `main`: the plugin's `atom.tpl`, `rss.tpl`, `rss2.tpl`
  and `AnnouncementFeedGatewayPlugin::fetch()`; lib/pkp
  `PKPTemplateManager::smartyDateFormat()` and its registration as
  `date_format`; `PKPString::getStrftimeConversion()`; the web feed
  plugin's `atom.tpl` and `rss.tpl`; a search of OJS's and lib/pkp's
  templates for `date_format:"…%…"` and `format("%…")`. 3.5: the plugin
  directory is the same as on `main`, and `smartyDateFormat()` the same
  Carbon call.
- 3.4 (code): OJS `upstream/stable-3_4_0` (d68934d0d1) has the four
  patterns, all through `date_format`; lib/pkp `origin/stable-3_4_0`
  (767353f4fe) registers `smartyDateFormat()` from d6b045e, whose first
  tag is `3_4_0-8`.
- 3.3 (code): OJS `upstream/stable-3_3_0` (ac77c9fb35) has the same four
  patterns through `date_format`; lib/pkp `origin/stable-3_3_0`
  (ac3fa73402) registers no `date_format` modifier, so Smarty's own sends
  the "%" pattern to `strftime()`.
- Introduced: `git blame` on the feed's `<updated>` line gives the 2008
  import (the pattern is that old); `git log -S smartyDateFormat` in
  lib/pkp gives 22c0390 on `main` (first tag `3_5_0rc2`; no pull request
  found) and d6b045e on `stable-3_4_0` (merged by `pkp/pkp-lib#10352`,
  whose commits are titled `pkp/pkp-lib#9303`; first tag `3_4_0-8`). `git blame` on the entries' lines and
  on `rss.tpl`'s gives 5d5b768, whose parent had
  `getAttribute('datePosted')|date_format:"%Y-%m-%dT%T%z"`; GitHub's
  `commits/<sha>/pulls` gives `pkp/ojs#4433`, merged 2024-10-01.
- Tracker search, 2026-10-03, pkp/pkp-lib and pkp/ojs, issues and PRs,
  and the date pattern across the pkp organisation. Nothing about these
  dates; `pkp/pkp-lib#10966` is a different fault in
  `smartyDateFormat()`.
- Not driven: a server time zone other than UTC.
