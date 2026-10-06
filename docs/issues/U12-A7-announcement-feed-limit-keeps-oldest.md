# A journal's announcement feeds with "Limit feed to" set carry the oldest announcements, never the newest

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS (OMP and OPS have no announcement feed)
  - 3.5: OJS
  - 3.4: none (code; the feed is sorted newest first)
  - 3.3: none (code; the feed is sorted newest first)
- **Introduced** `pkp/ojs#4433` for `pkp/pkp-lib#10328` · [e9fbcb1](https://github.com/pkp/ojs/commit/e9fbcb14362dded768faab4331ca2f49289b8ec7) · 2024-09-10 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#11551` (closed with a fix for the Announcements page, the home page, the management list and the API; the issue names the feed plugin, which the fix left out)
- **Tracked in** spec U12 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager who sets the announcement feed plugin's "Limit feed to
2 most recent announcements." expects the feeds to carry the two newest
announcements. The Atom, RSS 2.0 and RSS 1.0 feeds carry the two oldest
current announcements instead, and the RSS 2.0 feed gives the oldest
one's time as its own date.

An announcement with no expiry date stays current for ever, and the
expiry date is optional and empty unless the manager fills it. So once
the journal has as many announcements without one as the limit, the
feeds are frozen: no new announcement reaches them again, and nobody is told.
Emptying the limit brings every current announcement back, the newest
last.

It needs the "Announcement Feed Plugin", which is off on a new journal,
and a number saved in "Limit feed to", which is empty until a manager
sets it.

## Impact

- **Lost.** Every announcement posted after the feed filled up with
  announcements that have no expiry date: subscribers and the sites
  that read the feed never get them.
- **Who.** Every subscriber to the announcement feeds of a journal whose
  manager enabled the plugin and set "Limit feed to".
- **Way round.** The manager empties "Limit feed to", or gives the old
  announcements an expiry date. Nothing on screen tells the manager
  that either is needed.

Medium: the feed stops carrying news for good, but only on a journal
that has made two choices away from the default (the plugin on, a limit
set), and emptying the limit on screen restores it. The silence is what
puts it at medium: shown as an error, the manager would empty the limit
at once and lose nothing more, which is low. It would be high if the
plugin were on and a limit set on most journals; how many journals set
a limit was not looked at.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: the journal `publicknowledge`.
  Announcements are off there, the "Announcement Feed Plugin" is
  disabled and the journal has no announcements.

Setting up, signed in as `rvaca` (journal manager):

1. Settings › Website › Setup › "Announcements": tick "Enable
   announcements", press "Save".
2. Settings › Website › "Plugins": tick "Announcement Feed Plugin".
3. Side menu "Announcements" › "Add Announcement": title "u12r4 first",
   "Save".
4. A few seconds later, "Add Announcement": "u12r4 second", "Save".
5. A few seconds later, "Add Announcement": "u12r4 third", "Save". The
   list reads "u12r4 third", "u12r4 second", "u12r4 first".
6. Settings › Website › "Plugins", the arrow beside "Announcement Feed
   Plugin" › "Settings": type `2` in "Limit feed to … most recent
   announcements.", press "OK".

Signed out:

7. Open `/index.php/publicknowledge/gateway/plugin/AnnouncementFeedGatewayPlugin/rss2`
   and read the page source.
8. Open the same address ending in `atom`, then in `rss` (the browser
   downloads this one; open the file).

**Expected.** Each feed carries "u12r4 third" and "u12r4 second", and
the RSS 2.0 channel's `<pubDate>` is the time "u12r4 third" was posted.

**Observed.** Each feed carries "u12r4 first" and "u12r4 second", in that
order. The RSS 2.0 feed, with "u12r4 third" posted at 16:26:50:

```
<pubDate>Sat, 03 Oct 2026 16:26:43 +0000</pubDate>
…
<title>u12r4 first</title> … <pubDate>Sat, 03 Oct 2026 16:26:43 +0000</pubDate>
<title>u12r4 second</title> … <pubDate>Sat, 03 Oct 2026 16:26:47 +0000</pubDate>
```

Control: before step 6 the three feeds carry all three announcements,
oldest first, and the RSS 2.0 channel's `<pubDate>` is already "u12r4
first"'s time. The public Announcements page lists the three newest
first.

## Cause

`AnnouncementFeedGatewayPlugin::fetch()`
(`plugins/generic/announcementFeed/AnnouncementFeedGatewayPlugin.php`,
line 133) asks for the journal's current announcements with no order,
then cuts the list to the limit:

```php
$announcements = Announcement::withContextIds([$journal->getId()])->withActiveByDate();
$recentItems = (int) $this->_parentPlugin->getSetting($journal->getId(), 'recentItems');
if ($recentItems > 0) {
    $announcements->limit($recentItems);
}
$announcements = $announcements->get();
```

Without `ORDER BY` the database returns the rows in the order it reads
them, which for announcements added one after another is the order they
were added. `LIMIT` then keeps the oldest. `scopeWithActiveByDate()`
keeps an announcement whose `date_expire` is null
(`->orWhereNull('date_expire')`), so the oldest ones without an expiry
date keep their places for good. A few lines further down,
under the comment "Get date of most recent announcement", the plugin
takes `$announcements->first()->datePosted` as the feed's own date, so
that is the oldest announcement's time, with or without a limit.

In 3.4 the feed reads through `Repo::announcement()->getCollector()`,
whose query always sorts by `date_posted` descending, then by
`announcement_id`; that sort was the fix for `pkp/pkp-lib#9226` (3.4.0-4), the same fault found when
3.4 first refactored the feed. `pkp/ojs#4433`
([e9fbcb1](https://github.com/pkp/ojs/commit/e9fbcb14362dded768faab4331ca2f49289b8ec7)),
which moved announcements to an Eloquent model for `pkp/pkp-lib#10328`,
replaced the Collector with the model's query and its scopes, which have
no order. `pkp/pkp-lib#11551` later restored the newest-first order for
the Announcements page, the home page, the management list and the
API, each with `->orderBy(Announcement::CREATED_AT, 'desc')`; the feed,
which lives in OJS, kept no order.

Reach:

- The three feeds, Atom, RSS 2.0 and RSS 1.0, with a limit (walked).
- The feed's own date, Atom's `<updated>` and RSS 2.0's channel
  `<pubDate>`, with or without a limit: the oldest current
  announcement's time (walked on RSS 2.0; Atom's dates are unreadable
  for another reason,
  [U12-A15-announcement-feed-dates-percent-signs.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U12-A15-announcement-feed-dates-percent-signs.md)).
  The plugin also stores that time as its `dateUpdated` setting, which
  the feed shows only when it has no announcement.
- Every other place that lists announcements sorts them: the
  Announcements page, the home page block, the management and admin
  lists and the API (in the code). The sitemap lists their addresses
  only.

## Proposed fix

Sort the feed's query newest first, as the Announcements page and the
home page do, with the 3.4 Collector's tie-break by id. A proposal; the
team decides.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-feed-limit-keeps-oldest/fix.diff)
(against the OJS root):

```diff
-        $announcements = Announcement::withContextIds([$journal->getId()])->withActiveByDate();
+        $announcements = Announcement::withContextIds([$journal->getId()])
+            ->withActiveByDate()
+            ->orderBy(Announcement::CREATED_AT, 'desc')
+            ->orderBy('announcement_id', 'desc');
```

Tried on OJS `main`, the fix gives the Steps' Expected. Without a
limit, and with a fourth announcement that expired in 2020, the feeds
list the same three current announcements with the fix as without it,
newest first instead of oldest first, the expired one in neither; the
public Announcements page is unchanged.

The date order is the pattern `pkp/pkp-lib#11551` used in
`AnnouncementHandler::index()` and `PKPIndexHandler::_setupAnnouncements()`.
The tie-break by id, which those callers do not have, is the 3.4
Collector's: with a limit, it decides which of two announcements posted
in the same second stays in the feed.

**Alternatives**

- A default order on the `Announcement` model (a global scope). It would
  cover a future caller too, but it changes every query on the model,
  deletes and counts included, and `pkp/pkp-lib#11551` chose an explicit
  order at each caller instead.
- Sort the fetched collection in PHP. It would still cut the list to
  the oldest first.

**What goes with it**

- No stored data changes. The plugin's `dateUpdated` setting moves
  forward again on the next feed request.
- Guard: an e2e scenario in this repository's announcements spec (with
  "Limit feed to" set, the feeds carry the newest announcements), or a
  plugin test that renders the feed with more announcements than the
  limit.

Small: one line in one OJS plugin, following the order the other
announcement lists use, with no data repair.

## Evidence

- Kept script that takes the Steps on OJS, on installs freshly loaded
  from PKP's default test dataset (pkp/datasets 566bb1f, 2026-10-03, the
  `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/announcement-feed-limit-keeps-oldest/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-feed-limit-keeps-oldest/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/announcement-feed-limit-keeps-oldest/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It reads each feed's
  raw XML in the browser's own session and also reads the three feeds
  before the limit is set. With `NB=1` in front it checks instead a
  journal with three current announcements and one that expired on
  2020-01-31, and no limit: the feeds must list the three and not the
  expired one, and the Announcements page the same three.
- Walked on `main` (OJS ff004d0973, lib/pkp 987776cd04) and on
  `stable-3_5_0` (OJS c1cee76b95, lib/pkp 771474347e), where the feeds
  read the same as on `main`. The three announcements had no expiry
  date and stayed in the unlimited feeds. The walks ran on PostgreSQL;
  MySQL not checked (the order of rows read without `ORDER BY` is the
  database's).
- The fix was applied to the OJS checkout for one run of the script and
  one with `NB=1`, then the `NB=1` run was repeated without it.
- The plugin is off in the default test dataset (walked) and on a newly
  created journal (checked 2026-09-17).
- Code read on `main`: `AnnouncementFeedGatewayPlugin::fetch()`; lib/pkp
  `classes/announcement/Announcement.php` (`scopeWithContextIds()`,
  `scopeWithActiveByDate()`, no default order); every
  `Announcement::` query in lib/pkp and OJS (`AnnouncementHandler`,
  `PKPIndexHandler`, `ManagementHandler`, `AdminHandler`,
  `PKPAnnouncementController`, `PKPSitemapHandler`). 3.5: the plugin
  directory is the same as on `main`.
- 3.4 (code): OJS `upstream/stable-3_4_0` (d68934d0d1) reads through
  `Repo::announcement()->getCollector()->filterByContextIds()->filterByActive()`,
  and lib/pkp `origin/stable-3_4_0` (767353f4fe) `Collector::getQueryBuilder()`
  always applies `orderByDesc('a.date_posted')` before the limit, then
  its configurable order (`date_posted`, then `announcement_id`,
  descending by default).
- 3.3 (code): OJS `upstream/stable-3_3_0` (ac77c9fb35) calls
  `AnnouncementDAO::getAnnouncementsNotExpiredByAssocId()`, and lib/pkp
  `origin/stable-3_3_0` (ac3fa73402) has `ORDER BY date_posted DESC` in it.
- Introduced: `git blame` on the query line gives e9fbcb1; its parent
  reads through the Collector. GitHub's `commits/<sha>/pulls` gives
  `pkp/ojs#4433` ("pkp/pkp-lib#10328 eloquent announcements", merged
  2024-10-01). The `pkp/pkp-lib#11551` commits (0f32edf, 29a33c8, afa5509,
  aabc5c0, 2ae905c, c30ef3b) are all in lib/pkp; none touches OJS.
- Tracker search, 2026-10-03, pkp/pkp-lib and pkp/ojs, issues and PRs.
  `pkp/pkp-lib#11551`
  (3.5.0-1) lists `AnnouncementFeedGatewayPlugin.php` among the places
  to add an order. `pkp/pkp-lib#9226` ("Announcement feed plugin
  incorrect sorting", from `pkp/pkp-lib#8288`) is the same fault in
  3.4.0, fixed in 3.4.0-4 by the Collector's default order
  (`pkp/ojs#4082`, `pkp/ojs#4086`).
- Not driven: a journal in another language.
