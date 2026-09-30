# A journal's MARC records and its Atom and RSS 1.0 announcement feeds print dates with stray "%" signs

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; since 3.4.0-8)
  - 3.3: none (code; Smarty's own `date_format` still reads a `%` pattern)
- **Introduced** committed without a pull request, for `pkp/pkp-lib#9303` · [22c03902e1](https://github.com/pkp/pkp-lib/commit/22c03902e1404e8c0bf8766d25d069fa6d9151d5) · 2024-09-06 · Alec Smecher (asmecher); on 3.4 the same change as [d6b045eb39](https://github.com/pkp/pkp-lib/commit/d6b045eb39e2a782bfc0150d8f1e8f4addabc879), pull request `pkp/pkp-lib#10352`, first released in 3.4.0-8
- **Upstream** `pkp/pkp-lib#8768` (closed as completed on 2025-06-24; it asked for every template date written with `%` to be converted, and the MARC and announcement feed templates were left)
- **Tracked in** spec U19 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a15), spec U12 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Two of the dates a journal gives out to machines come out with a "%"
sign before each part:

- A harvester that takes the journal's articles in MARC (`marcxml` or
  `oai_marc`) from its OAI-PMH interface expects field 008 to open with
  the publication date, such as "260930 2026" for 30 September 2026.
  Every record carries "%26%09%30 %2026" in its place.
- A visitor who subscribes to the journal's announcement feed gets
  "%2026-%09-%30UTC%UTC%272" as every date of the Atom feed (the time
  part is garbled the same way), and "%2026-%09-%30" as each
  announcement's date in the RSS 1.0 feed.

Nobody is told. No setting or form lets the journal correct these
dates. The article page and its Dublin Core record show the right date.

## Impact

- **Lost.** Correct public records. Field 008 is fixed-length and read by
  position, so the four extra characters also move the language code
  that follows the date out of its place. The Atom and RSS 1.0 dates are
  not dates in the form those formats require, so a feed reader cannot
  date or order the announcements by them. No harvester or feed reader
  was tried against these records and feeds.
- **Who.** Every OJS journal: every published article's MARC record.
  And every announcement of a journal that turns the announcement feed
  on; a new journal starts with it off. Atom is the first of the three
  links in the feed's sidebar block, and the first feed the journal's
  pages announce to browsers and feed readers.
- **Way round.** None for MARC. For the announcements, the RSS 2.0 feed's
  dates are right, so a subscriber can switch to it. OJS builds the
  records and feeds on each request, so nothing wrong is stored in OJS,
  but harvesters keep the wrong field until they harvest the records
  again.

Medium: a field of two secondary outputs is wrong for every item,
silently. A harvester or feed reader seen to refuse the records or the
feed because of it would raise it to high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Its published articles are
  1, "Signalling Theory Dividends", and 17, "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms isolated from nosocomial
  infections in a hospital in Isfahan, Iran". Both were published on the
  day the dataset was built (2026-09-30 for the one walked).
- The dataset has no announcements, announcements are off and the
  "Announcement Feed Plugin" is not enabled, so the feed steps turn all
  three on as the journal manager `rvaca`.

MARC records (no one signs in):

1. Open article 1, "Signalling Theory Dividends"
   (`/index.php/publicknowledge/article/view/1`), and read its
   "Published" date.
2. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=marcxml`.
   The browser shows each record under "Unknown Metadata Format" as XML.
   Read each record's `<controlfield tag="008" >` line (the page's form;
   the browser's "View Page Source" shows the raw answer quoted under
   Observed).
3. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_marc`
   and read each record's `<fixfield id="008" >` line the same way.

Announcement feeds:

4. Sign in as `rvaca`. On Settings › Website › "Plugins", tick
   "Announcement Feed Plugin".
5. On Settings › Website › "Setup" › "Announcements", tick "Enable
   announcements" and press "Save".
6. Open "Announcements"
   (`/index.php/publicknowledge/management/settings/announcements`),
   press "Add Announcement", type the "Title" "u19w15 feed check" and a
   "Short Description", and press "Save".
7. Sign out. Open the Atom feed,
   `/index.php/publicknowledge/gateway/plugin/AnnouncementFeedGatewayPlugin/atom`,
   and read its `<updated>` and the entry's `<updated>` and `<published>`.
8. Open the RSS 1.0 feed (the same address ending in `/rss`) and read
   the item's `<dc:date>`.
9. Open the RSS 2.0 feed (ending in `/rss2`) and read `<pubDate>`.

**Expected.** Field 008 of both records opens with the publication date,
year, month and day in two digits each, then the year in four:
`260930 2026` for "Published 2026-09-30". The Atom dates read like
`2026-09-30T23:17:23+00:00`, and the RSS 1.0 date reads `2026-09-30`.

**Observed.** Step 1 shows "Published 2026-09-30". In steps 2 and 3,
both records of both formats read the same (the raw answer; the page
shows the same value with its spaces collapsed):

```xml
<controlfield tag="008">"%26%09%30 %2026                        eng  "</controlfield>
<fixfield id="008">"%26%09%30 %2026                        eng  "</fixfield>
```

In steps 7 and 8, for the announcement saved at 23:17 UTC on 2026-09-30:

```xml
<updated>%2026-%09-%30UTC%UTC%272</updated>      <!-- Atom: the feed's, and the entry's -->
<published>%2026-%09-%30UTC%UTC%272</published>  <!-- Atom: the entry's -->
<dc:date>%2026-%09-%30</dc:date>                 <!-- RSS 1.0 -->
```

The Dublin Core record of the same articles (`metadataPrefix=oai_dc`)
gives `<dc:date>2026-09-30</dc:date>`, and in step 9 the RSS 2.0 feed
gives `<pubDate>Wed, 30 Sep 2026 23:17:23 +0000</pubDate>`.

## Cause

Four OJS templates still write dates in `strftime()` syntax, and every
formatter they reach now reads PHP `date()` syntax. In `date()` syntax
`%` is a literal character and the letters are the date parts: `y`, `m`,
`d`, `Y` are the year, month and day, `T` the time zone's abbreviation
and `z` the day of the year. So `"%y%m%d %Y"` gives `%26%09%30 %2026`, and
`"%Y-%m-%dT%T%z"` gives `%2026-%09-%30UTC%UTC%272`.

The four templates:

- The two MARC templates, field 008 (ojs
  `plugins/oaiMetadataFormats/marc/templates/record.tpl`
  [line 14](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/oaiMetadataFormats/marc/templates/record.tpl#L14),
  `marcxml/templates/record.tpl`
  [line 16](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/oaiMetadataFormats/marcxml/templates/record.tpl#L16)):
  `{$publication->getData('datePublished')|strtotime|date_format:"%y%m%d %Y"}`.
- The announcement feed's Atom template
  (`plugins/generic/announcementFeed/templates/atom.tpl`): the feed's
  own date,
  [line 16](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/announcementFeed/templates/atom.tpl#L16),
  `{$dateUpdated|date_format:"%Y-%m-%dT%T%z"|regex_replace:"/00$/":":00"}`,
  and each entry's dates,
  [lines 41 and 53](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/announcementFeed/templates/atom.tpl#L41-L53),
  `{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}`.
- The announcement feed's RSS 1.0 template, each item's date (`rss.tpl`
  [line 52](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/announcementFeed/templates/rss.tpl#L52)):
  `{$announcement->datePosted->format("%Y-%m-%d")}`.

Smarty's own `date_format` modifier used `strftime()` whenever the
format holds a `%` (`smarty_modifier_date_format()`, the `'auto'`
formatter), which is what these templates were written for. Since
22c03902e1, pkp-lib registers its own `date_format`
([`PKPTemplateManager` line 384](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/template/PKPTemplateManager.php#L384)).
That modifier, `smartyDateFormat()`
([lines 2422–2425](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/template/PKPTemplateManager.php#L2422-L2425)),
formats with Carbon's `translatedFormat()`, which reads `date()`
syntax. It accepts Smarty's `$formatter` argument and ignores it. The
change was for `pkp/pkp-lib#9303`, which asked for dates shown in the
reader's language.

The feed entries' dates also went through `date_format` at first. Then
pkp-lib
[070aa6f77b](https://github.com/pkp/pkp-lib/commit/070aa6f77b2b14e31b9089b5f82a48e8ba11c329)
(`pkp/pkp-lib#10382`, for `pkp/pkp-lib#10328`, 2024-09-30) cast the
announcement's `datePosted` to a Carbon date. The next day, ojs
[5d5b768be9](https://github.com/pkp/ojs/commit/5d5b768be96decc4233765b0b56029a98c5e88d0)
(`pkp/ojs#4433`) changed the feed templates to call Carbon's `format()`
on `datePosted`, keeping the `%` pattern. Carbon's `format()` reads
`date()` syntax too.

`pkp/pkp-lib#8768` set out to convert the templates' remaining `%`
formats. The web feed plugin's templates were converted in
[f30f86f597](https://github.com/pkp/ojs/commit/f30f86f5978e816d3f9d09ae361a7b3d4d96f229)
(`pkp/pkp-lib#8731`). These four were not.

In the PHP code only, one more thing: the MARC line hands the modifier a
Unix timestamp (`|strtotime`), which Carbon reads in UTC. So on a server
whose `time_zone` is east of UTC, once the `%` signs are gone, the date
comes out a day early (Evidence).

Other places with the same fault, from a search of every `.tpl` and
`.php` file in OJS, OMP, OPS and their `lib/pkp` for a `%` pattern
given to `date_format`, the `date` modifier, `format()` or
`translatedFormat()`:

- The MARC records (`marcxml`, `oai_marc`), every record with a
  publication date: shown on screen, covered by the fix.
- The Atom template (3 dates) and the RSS 1.0 template (1 date): shown
  on screen, covered by the fix. The RSS 2.0 template (`rss2.tpl`, lines
  27–28 and 42–43) writes
  `{capture assign="dateUpdated"}{$dateUpdated|strtotime}{/capture}`
  and then `{$smarty.const.DATE_RSS|date:$dateUpdated}`, which is right:
  shown on screen.
- The COUNTER plugin's `reportxml.tpl` and `sushixml.tpl` use
  `"%Y-%m-%dT%H:%M:%SZ"`, but no code renders them: code, left out.
- `PflPlugin` formats a `DateInterval` with `'%a'`, where `%` is the
  right syntax: code, not an instance.
- OMP and OPS have no MARC formats (`ListRecords` answers
  `cannotDisseminateFormat` for both, shown on screen) and no
  announcement feed plugin. No other template in the three apps or their
  `lib/pkp` uses a `%` pattern: code.
- Third-party themes and plugins that still use `%` patterns print dates
  the same way: not checked.

## Proposed fix

A proposal; the team decides. Write the four templates' dates in
`date()` syntax, and give the MARC line the stored date string rather
than a timestamp
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-008-percent-signs/fix.diff)):

```diff
--- a/plugins/oaiMetadataFormats/marc/templates/record.tpl
+++ b/plugins/oaiMetadataFormats/marc/templates/record.tpl
-		<fixfield id="008">"{$publication->getData('datePublished')|strtotime|date_format:"%y%m%d %Y"}                        eng  "</fixfield>
+		<fixfield id="008">"{$publication->getData('datePublished')|date_format:"ymd Y"}                        eng  "</fixfield>
--- a/plugins/oaiMetadataFormats/marcxml/templates/record.tpl
+++ b/plugins/oaiMetadataFormats/marcxml/templates/record.tpl
-		<controlfield tag="008">"{$publication->getData('datePublished')|strtotime|date_format:"%y%m%d %Y"}                        eng  "</controlfield>
+		<controlfield tag="008">"{$publication->getData('datePublished')|date_format:"ymd Y"}                        eng  "</controlfield>
--- a/plugins/generic/announcementFeed/templates/atom.tpl
+++ b/plugins/generic/announcementFeed/templates/atom.tpl
-	<updated>{$dateUpdated|date_format:"%Y-%m-%dT%T%z"|regex_replace:"/00$/":":00"}</updated>
+	<updated>{$dateUpdated|date_format:"Y-m-d\TH:i:sP"}</updated>
-		<updated>{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}</updated>
+		<updated>{$announcement->datePosted->format("Y-m-d\TH:i:sP")}</updated>
-		<published>{$announcement->datePosted->format("%Y-%m-%dT%T%z")|regex_replace:"/00$/":":00"}</published>
+		<published>{$announcement->datePosted->format("Y-m-d\TH:i:sP")}</published>
--- a/plugins/generic/announcementFeed/templates/rss.tpl
+++ b/plugins/generic/announcementFeed/templates/rss.tpl
-		<dc:date>{$announcement->datePosted->format("%Y-%m-%d")}</dc:date>
+		<dc:date>{$announcement->datePosted->format("Y-m-d")}</dc:date>
```

The formats follow the web feed plugin's templates: its `atom.tpl`
writes `date_format:"Y-m-d\TH:i:sP"`
([line 17](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/webFeed/templates/atom.tpl#L17)),
and its `rss.tpl` passes `datePublished` straight to
`date_format:"Y-m-d"` with no `strtotime`
([lines 109–110](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/webFeed/templates/rss.tpl#L109-L110)).
Dropping `|strtotime` from the MARC line follows that pattern on its
own. It also means Carbon reads the stored date in the server's time
zone, so the day-early date east of UTC cannot happen.

`P` already writes the offset as `+00:00`, which Atom requires. So the
diff removes the `regex_replace` that turned `strftime()`'s `+0000` into
`+00:00`: on `P`'s output it would give `+00::00`. The fix keeps what
22c03902e1 was for: the modifier still formats through Carbon.

Tried on `main`. With the fix in, both MARC records read
`"260930 2026                        eng  "` in both formats. The Atom
feed and its entry read `2026-09-30T23:26:14+00:00`, and the RSS 1.0 item
reads `2026-09-30`. A before-and-after comparison of what the fix must
leave alone (every other field of both MARC formats, the Dublin Core
dates, the article page's "Published" date, and the three feeds with
their dates masked) found no change, and the RSS 2.0 dates kept their
form.

**Alternatives**

- Convert `%` patterns inside `smartyDateFormat()` with
  `PKPString::convertStrftimeFormat()`, as pkp-lib already does for the
  configured date formats. This would also cover third-party templates,
  but not the feed entries, which call Carbon's `format()` directly. It
  also gives new life to the `strftime()` syntax that `#8768` set out to
  drop, through a helper whose docblock says to remove it after an LTS
  ([`PKPString` lines 292–300](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPString.php#L292-L300)).
  With `deprecation_warnings` on, the helper throws, so the MARC records
  and the Atom feed would become server errors.
- Write `"ymd Y"` and keep `|strtotime`: this removes the `%` signs but
  leaves the MARC line unlike the web feed's, and the date a day early
  east of UTC.

**What goes with it**

- Left out on purpose, as a separate change: the same MARC line wraps
  the value in literal `"` quotes, so field 008 is 42 characters where
  MARC 21 defines 40 fixed positions and every position is one off, and
  position 06 (type of date) stays a blank, which MARC 21 does not
  define. Both date from at least
  [824cda1a29](https://github.com/pkp/ojs/commit/824cda1a2932760f4dbe14250e685eab83c74f9e)
  (2015), are not reported separately, and are not in fix.diff. The team
  may prefer one pull request for the whole line.
- The COUNTER templates could take the same change, or be deleted, since
  nothing renders them.
- Backport: 3.5 has the same six lines and takes the diff as written. On
  3.4 the MARC lines read `$article->getDatePublished()|strtotime|…`;
  `|strtotime` goes there too. The 3.4 feed entries still go through
  `date_format`
  (`{$announcement->getDatetimePosted()|date_format:"%Y-%m-%dT%T%z"|…}`,
  `{$announcement->getDatePosted()|date_format:"%Y-%m-%d"}`) and take the
  same formats. The 3.4 changes were not tried.
- A test that reads 008 of a MARC record and the dates of the Atom and
  RSS 1.0 feeds would have caught it.

Small: a format change on six lines in four templates of one
repository, tried.

## Evidence

- Kept scripts, each run on an install freshly loaded from the default
  dataset:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-008-percent-signs/walk.js)
  (steps 1–3; on OMP and OPS it confirms that both formats are refused)
  and
  [`feed.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-008-percent-signs/feed.js)
  (steps 4–9), with
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-marc-008-percent-signs/neighbour.js)
  for the comparison. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-marc-008-percent-signs/walk.js`
  (the same for the other two).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, pkp/datasets
  38ab955 (2026-09-30).
- Tips: `main` ojs `bade233f73`, lib/pkp `2e377d27fc`; `stable-3_5_0`
  ojs `92b9a16b48`, lib/pkp `a9c76aed62`; `stable-3_4_0` ojs
  `9571d8fde7`, lib/pkp `df13621c2d`; `stable-3_3_0` ojs `9fdb9bcf9a`,
  lib/pkp `d446601ebe`.
- Code read on 3.4 and 3.3: the four templates and lib/pkp's
  `PKPTemplateManager` (`.inc.php` on 3.3, which registers no
  `date_format`).
- The day-early MARC date, in PHP with the Carbon that OJS bundles, from
  the ojs root:

  ```bash
  php -r 'require "lib/pkp/lib/vendor/autoload.php";
    foreach (["UTC", "Europe/Prague", "America/Vancouver"] as $tz) {
      date_default_timezone_set($tz);
      echo $tz, " ", (new \Carbon\Carbon(strtotime("2026-09-30")))->translatedFormat("ymd Y"),
        " / ", (new \Carbon\Carbon("2026-09-30"))->translatedFormat("ymd Y"), "\n";
    }'
  ```

  From the timestamp, `Europe/Prague` gives `260929 2026`, and `UTC` and
  `America/Vancouver` give `260930 2026`. From the date string, all three
  give `260930 2026`. The test install runs on UTC and its configuration was left as the
  dataset ships it, so this was not shown on an install.
- The default state of the announcement feed: the default dataset's
  journal has the plugin off. Its `settings.xml` says `enabled` true, but
  the plugin does not name that file (`getContextSpecificPluginSettingsFile()`),
  unlike the web feed plugin, so a new journal does not take it.
- Upstream search (2026-10-01), pkp/pkp-lib and pkp/ojs issues and PRs:
  "MARC 008", "marcxml date", "marcxml", "oai marc", "date_format
  strftime", "smartyDateFormat", "announcement feed date",
  "announcementFeed", "atom feed updated date", "atom updated", "rss
  dc:date". `#10966` (a `null` format from a theme) is another fault of
  the same override; `#10783`, `#9828` and `#8339` are other
  announcement feed failures.
- Unverified: no harvester or feed reader was tried against the records
  or feeds; whether harvesters in use ask OJS for MARC was not looked
  into; third-party templates were not checked.
