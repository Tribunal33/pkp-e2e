---
name: web-feeds
status: verified
---

# Web feeds {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A web feed lets a reader follow a journal without visiting it: a feed
reader subscribed to one of the journal's three feed addresses (Atom, RSS
2.0 and RSS 1.0) picks up each newly published article with its title,
authors, abstract and a link to its page. The feeds come from the "Web
Feed Plugin", which every new journal has enabled. A Journal Manager
chooses in the plugin's "Settings" window which articles the feeds carry
and on which pages the journal advertises them to browsers, and can place
the plugin's "Latest publications" box, one link per feed, in the sidebar
of the journal's public pages. On a journal the announcements also have
a feed of their own {OJS}, which [Announcements](U12-announcements.md)
describes; a press and a preprint server install no announcement feed.
The issue-based choices exist on a journal only, since a press and a
preprint server have no issues. <sup>a</sup>

## Actors & permissions

"Whoever opens the Settings pages" means the manager-level roles with
"Permit changes to Settings", as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them, and the Site Administrator working in the journal; every
other role has no "Settings" in the side menu and gets the access-denied
page at a Settings address. Readers need no account, and a feed reader
signs in as nobody. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Read the feeds** (Rules 2–10) | • any visitor, signed in or not, and any feed reader, while "Web Feed Plugin" is enabled in the journal (Rule 1); signed in or not, the feed is the same<br>• on a journal that requires sign-in to view the site, or that is not enabled publicly, a signed-out visitor is sent to Login instead (Rule 13) <sup>b</sup> <sup>td1</sup> <sup>td12</sup> |
| **See the "Latest publications" box and follow its links** (Rule 11) | • any visitor, on every public page of the journal that has a sidebar, while the box is placed and the plugin enabled <sup>e</sup> <sup>td10</sup> |
| **Place the box in the sidebar** | • whoever opens the Settings pages, on Settings › Website › "Appearance" › "Setup", "Sidebar", where the box is listed as "Web Feed Plugin"; [Appearance & theming](U10-appearance-and-theming.md) (Rules 23–25) owns the list <sup>e</sup> |
| **Enable or disable "Web Feed Plugin"** (Rules 1, 14) | • whoever opens the Settings pages, with the plugin's box on Settings › Website › "Plugins" › "Installed Plugins", under "Generic Plugins"; *Plugins management* owns the list, its confirmations and its messages <sup>b</sup> |
| **Open the plugin's "Settings" window and save it** (Rule 16) | • whoever opens the Settings pages, from "Settings" among the plugin row's actions, which is offered only while the plugin is enabled (Rule 14a) <sup>b</sup> <sup>td15</sup> |
| **Enable the plugin and place its box on the site's own pages** (Rule 18) | • the Site Administrator, on Administration › "Site Settings" › "Plugins" and the site's "Appearance" › "Setup", tabs that show while the site hosts two or more journals; the site's row offers no "Settings" window <sup>h</sup> <sup>td16</sup> |

## Fields & validation

**The three feeds.** Each feed is one address; the box of Rule 11 links to
all three. A browser shows the Atom and RSS 2.0 feeds as a page of
marked-up text with no tab title, and downloads the RSS 1.0 feed as a
file, "rss.rdf"; a feed reader shows each feed's items as a list.
`{journal address}` is the journal's home page address, such as
`https://example.org/index.php/journal`. <sup>c</sup>

| Feed | Box link (its image's text) | Address |
|------|-----------------------------|---------|
| Atom | "Atom logo" | {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom <sup>td1</sup> |
| RSS 2.0 | "RSS2 logo" | {journal address}/gateway/plugin/WebFeedGatewayPlugin/rss2 <sup>td1</sup> |
| RSS 1.0 | "RSS1 logo" | {journal address}/gateway/plugin/WebFeedGatewayPlugin/rss <sup>td1</sup> |

**What the feed says about the journal** (Rule 8), the same in the three
feeds unless a cell says otherwise: <sup>c</sup> <sup>td7</sup>

| Part | Content |
|------|---------|
| Title | the journal's name <sup>td7</sup> |
| Link | the journal's home page <sup>td7</sup> |
| Description | "Journal Summary" (Settings › Journal › "Masthead"), tags written out [A6](#a6); if empty, Settings › Distribution › "Search Indexing" › "Description" <sup>td7</sup> |
| Date (Atom and RSS 2.0) | the last change of the first item listed; with "Display items in current published issue." {OJS}, the current issue's publication date <sup>td7</sup> |
| Contact (Atom and RSS 2.0) | the "Principal Contact" name and email address; RSS 2.0 adds the "Technical Support Contact" email and name when one is set <sup>td7</sup> |
| Language (RSS 2.0 and RSS 1.0) | the code of the interface language the feed was read in, such as "en" (Rule 10) <sup>td7</sup> |
| Copyright (RSS 2.0 and RSS 1.0) | the journal's "License Terms" (Settings › Distribution › "License"), when set, with its paragraph tags written out ⚠ [A6](#a6) <sup>td7</sup> |
| Publisher and ISSN (RSS 1.0) | the journal's "Publisher" {OJS} or the press's "Press Publisher Name", each from its "Masthead" tab, and on a preprint server the word "Array" where the server's name belongs ⚠ [OPS1](#ops1); then the journal's name again, and {OJS} the print ISSN or, without one, the online ISSN <sup>td7</sup> |

**What each item carries** (Rule 7), one item per published article:
<sup>c</sup> <sup>td6</sup>

| Part | Atom | RSS 2.0 | RSS 1.0 |
|------|------|---------|---------|
| Title | the current version's title | the same | the same <sup>td6</sup> |
| Link | the article's page (*Article landing page & reading*; a book's page on a press) | the same | the same <sup>td6</sup> |
| Authors | one name per contributor | one line naming the contributors with "Include this contributor when identifying authors in lists of publications." ticked, each followed by their role in brackets, separated by ";" | one name per contributor <sup>td6</sup> |
| Summary | the abstract as saved, after Rule 9's identifier lines when "Include identifiers…" is ticked; no summary when both are empty | the same | the same <sup>td6</sup> |
| Date | the current version's publication date and time, such as "2024-03-05T00:00:00+00:00", and the last change | the same date, written as "Tue, 05 Mar 2024 00:00:00 +0000" | the same date, written as "2024-03-05" <sup>td6</sup> |
| Subject terms | the section (series on a press), categories, keywords, subjects and disciplines, one term each, whatever "Include identifiers…" says; each keyword, subject and discipline reads "Array" ⚠ [A7](#a7) | the same | the same <sup>td6</sup> |
| Rights | "Copyright (c) {copyright year} {copyright holder}" | the same line and the license address | the same, plus pages {OJS} and DOI when set <sup>td6</sup> |

**The "Web Feed Plugin" settings window** (Settings › Website › "Plugins"
› "Installed Plugins" › "Generic Plugins": the arrow beside "Web Feed
Plugin" opens the row's actions, "Settings" among them). The window is
titled "Web Feed Plugin", opens with the plugin's description ("This
plugin produces RSS/Atom web syndication feeds." and, on the next line,
"The plugin also includes a sidebar block which enables you to display
the feed links on your application's sidebar"), under which a heading
"Settings" carries the controls below, and closes with "Cancel" and
"OK", above "Required fields are marked with an asterisk: *" although no
control carries one. <sup>d</sup> <sup>td15</sup>

"Cancel" closes the window at once and saves nothing. After a change, the
window's "×" asks "The data on this form has changed. Do you wish to
continue without saving?", and leaving the page raises the browser's own
leave question; a window closed or left this way saves nothing either.
<sup>td15</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Where the feed links are advertised, round buttons: "Display web feed links on all application pages."; "Display web feed links on homepage and issue pages only." {OJS} or "Display web feed links on homepage only." (a press, a preprint server); "Display web feed links on issue pages only." {OJS} | one is always chosen | A new journal arrives with the homepage choice. Decides the discovery links of Rule 12 only <sup>td15</sup> |
| Which articles, round buttons {OJS}: "Display items in current published issue."; "Display a fixed number of the most recent publications." | one is always chosen | A new journal arrives with the second chosen [A5](#a5). Rules 4 and 5 <sup>td15</sup> |
| "Number of publications to display" | yes on a press and a preprint server; on a journal while "Display a fixed number of the most recent publications." is chosen | A box for a whole number above zero; a new journal arrives with 30. Which values "OK" refuses and which it keeps is Rule 16 <sup>td15</sup> |
| "Include identifiers (ISBN, keywords, categories, etc.) in the feed summary?" | no | A tick box, unticked on a new journal. Rule 9 <sup>td15</sup> |

## Rules & state

1. **On from the start.** Every new journal, press and preprint server
   has "Web Feed Plugin" enabled, with "Settings" in its row, so its three
   feeds answer at once. Its box is placed nowhere until a manager places
   it (Rule 11). <sup>a</sup> <sup>td1</sup>
2. **Three formats, one list.** The Atom, RSS 2.0 and RSS 1.0 feeds carry
   the same items, in the same order wherever Rules 4 and 5a fix one; they
   differ only in the parts the Fields tables list. <sup>c</sup>
   <sup>td2</sup>
3. **Published articles of this journal only.** A feed lists the
   journal's published articles (on a preprint server its posted
   preprints, on a press its published books). A submission still in the
   workflow, an article scheduled in an issue that is not yet published
   {OJS}, an unpublished one and another journal's articles never appear.
   A newly published article is in the feeds at their next load, as long
   as its place falls within the number of Rule 4 (on a press and a
   preprint server it can fall outside, Rule 4a [A8](#a8)); an
   unpublished one is gone from them. <sup>f</sup> <sup>td2</sup>
4. **The most recently changed first, up to the number.** With "Display a
   fixed number of the most recent publications." chosen (always, on a
   press and a preprint server), a feed lists at most "Number of
   publications to display" articles, 30 on a new journal. It orders them
   by their last change, the most recent first, not by publication date,
   and cuts the list after the number. <sup>f</sup> <sup>td3</sup>
   - 4a. On a journal, publishing counts as a change: an article just
     published, or published again, comes first. On a press and a
     preprint server it does not ⚠ [A8](#a8): an item published now (for
     the first time, in a new version, or again after "Unpublish") keeps
     the place of its last change before publishing, so with more items
     than the number it can stay below the cut and out of all three
     feeds. <sup>td2</sup>
5. **The current issue** {OJS}. With "Display items in current published
   issue." chosen, a feed lists the published articles of the journal's
   current issue, however many there are; "Number of publications to
   display" is not used. With no published issue it lists nothing (Rule
   6). <sup>f</sup> <sup>td4</sup>
   - 5a. Within a section, the feed keeps the order an editor gave the
     articles with "Order" on the issue's "Table of Contents" ([→ the table
     of contents](U50-issues.md#issue-toc)). Articles of different
     sections, and articles nobody has ordered, come in no fixed order
     against each other, which need not match the issue's page and can
     change between loads. <sup>f</sup> <sup>td4</sup>
   - 5b. An article of the current issue whose newer version was
     published with "Don't Assign To An Issue" ([Publish schedule &
     versions](U49-publish-schedule-and-versions.md), its Rule 5) stays
     in the three feeds, under the newer version's title, as it stays on
     the issue's page ⚠ [→ Issues A17](U50-issues.md#a17). An article
     published with no issue at all never appears. <sup>f</sup>
     <sup>td4</sup>
6. **Nothing to list.** A journal with nothing published has an Atom and
   an RSS 1.0 feed with the journal's parts and no item. Its RSS 2.0
   address shows a blank page with no tab title instead of a feed: the
   app fails ⚠ [A1](#a1). <sup>f</sup> <sup>td5</sup>
7. **What an item shows.** Each item carries the parts of the Fields
   table "What each item carries", taken from the article's current
   version. Its link opens the article's page on a journal and a preprint
   server, and the book's page on a press. <sup>c</sup> <sup>td6</sup>
8. **What the channel shows.** The feed's own title, link, description
   and dates are the Fields table "What the feed says about the journal";
   they follow the journal's settings at the next load. <sup>c</sup>
   <sup>td7</sup>
9. **"Include identifiers…".** Ticked, each item's summary opens with one
   line per kind of term the article has, "Section: {section}" ("Series:
   {series}" on a press), "Categories: {categories}", "Keywords:
   {keywords}", "Subjects: {subjects}" and "Disciplines: {disciplines}",
   terms separated by ", " (each keyword, subject and discipline reads
   "Array" [A7](#a7)), then an empty line and the abstract. Unticked, the
   summary is the abstract alone. <sup>g</sup> <sup>td8</sup>
   - 9a. A book outside a series with no terms has no such line, so its
     summary opens with the empty line.
   - 9b. An ISBN never appears, although the label names it ⚠ [A3](#a3).
10. **The interface language.** A feed speaks the interface language it
    is read in: read after switching the journal's pages to French (or
    through a French address), the titles, abstracts and the section and
    term labels are the French ones where the article has them, and the
    language code reads "fr-CA". <sup>c</sup> <sup>td9</sup>
11. **The box.** Placed through "Sidebar", the plugin's box shows on
    every public page of the journal that has a sidebar, under the
    heading "Latest publications", with three logo links whose images
    read "Atom logo", "RSS2 logo" and "RSS1 logo", each leading to its
    feed (the Fields table "The three feeds"). The box shows the same links
    whatever the journal has published, and on every page whatever the
    window's "Display web feed links…" choice says (Rule 12).
    <sup>e</sup> <sup>td10</sup>
12. **Discovery links.** A browser or a feed reader given a page's
    address can offer the journal's feeds from links in the page's hidden
    header; a tester sees them in the page's source, one per feed. The
    window's first choice decides which pages carry them: ⚠ [A4](#a4)
    <sup>e</sup> <sup>td11</sup>

    | Choice | Pages whose header carries the three feed links |
    |---|---|
    | "…on all application pages." | every public page of the journal <sup>td11</sup> |
    | "…on homepage and issue pages only." {OJS} (the choice of a new journal) | the home page, the "Archive" and each issue's page <sup>td11</sup> |
    | "…on homepage only." (a press, a preprint server; the choice of a new one) | the home page <sup>td11</sup> |
    | "…on issue pages only." {OJS} | the "Archive" and each issue's page <sup>td11</sup> |

13. **A journal closed to visitors.** On a journal whose "Site Access
    Options" require visitors to register and log in (Settings bullet 7),
    or that is not enabled publicly (Settings bullet 8), a signed-out
    visitor or feed reader asking for a feed is sent to Login; signed in,
    the feed shows as Rule 3 says. <sup>b</sup> <sup>td12</sup>
14. **The plugin disabled.** With "Web Feed Plugin" disabled in the
    journal, every feed address answers "404 Not Found", the box leaves
    the sidebar and the "Sidebar" list ([Appearance &
    theming](U10-appearance-and-theming.md), Rule 25, owns how it comes
    back), and no page carries discovery links. Enabled again, all of it
    returns, and the window keeps its earlier settings. <sup>a</sup>
    <sup>td13</sup>
    - 14a. Disabled, the plugin's row offers no "Settings" window: the row
      loses its arrow, except for the Site Administrator, whose arrow
      opens only "Delete" and "Upgrade". <sup>td13</sup>
15. **Other feed addresses.** The feeds sit under the journal's gateway
    address, {journal address}/gateway. That address alone lands on the
    journal's home page. A plugin name after it that is not an enabled
    feed plugin of the journal answers "404 Not Found". After the Web Feed
    plugin's name, a feed name other than "atom", "rss2" or "rss" in lower
    case, or no feed name, shows a blank page with no tab title: the app
    fails ⚠ [A2](#a2). <sup>c</sup> <sup>td14</sup>
    - 15a. On a journal the same gateway address also serves the LOCKSS
      and CLOCKSS pages, once they are ticked on Settings › Distribution ›
      "Archiving" (a new journal has both unticked); *Archiving &
      preservation* describes them. <sup>td14</sup>
16. **Saving the window.** "OK" saves every setting of the window
    together and closes it with "Your changes have been saved."; the feeds
    and the discovery links follow at their next load. <sup>d</sup>
    <sup>td15</sup>
    - 16a. **Refused numbers.** "OK" checks "Number of publications to
      display" on a press and a preprint server always, and on a journal
      while "Display a fixed number of the most recent publications." is
      chosen. It refuses an empty box, a space, zero, a negative number
      and a value that does not start with a digit ("abc").
    - 16b. **What a refusal shows.** The window stays open, "Errors
      occurred processing this form" and "Please enter a positive integer
      for recent published items." show above the plugin's description,
      the same message replaces the box's label, and the box is emptied.
      Nothing is saved, the other controls' changes included. "OK" pressed
      again on the emptied box is stopped at once with "This field is
      required." under the box.
    - 16c. **Kept numbers.** A value that starts with a whole number above
      zero keeps that number: "3abc" reopens as "3", and "2.5" as "2".
      There is no upper limit ("1000000" is kept).
    - 16d. {OJS} With "Display items in current published issue." chosen,
      the box is not checked: any value is saved, and an empty or
      non-numeric box reopens as "0".
17. **A new journal's list choice** {OJS}. A new journal's window arrives
    with "Display a fixed number of the most recent publications." chosen
    and the feeds list the 30 most recently changed articles (Rule 4),
    although the plugin's own default is the current issue ⚠ [A5](#a5).
    <sup>d</sup> <sup>td15</sup>
18. **The site's own pages.** On a site hosting two or more journals the
    Site Administrator can enable "Web Feed Plugin" for the site itself
    and place its box in the site's "Sidebar". The site has no feed of its
    own: each of the box's links on the site's home page leads back to the
    site's home page. The site's row offers no "Settings" window, whether
    the plugin is enabled there or not: its arrow opens only "Delete" and
    "Upgrade". <sup>h</sup> <sup>td16</sup>

## Side effects

- Saving the "Settings" window shows "Your changes have been saved." to
  the manager who saved it (Rule 16). No email, notification or
  submission log entry comes from the feeds, the box or the window.
  Enabling and disabling the plugin are *Plugins management*'s, with its
  messages. <sup>d</sup> <sup>td15</sup>

## Settings that modify behavior

1. **"Web Feed Plugin"** (Settings › Website › "Plugins" › "Installed
   Plugins" › "Generic Plugins"; default enabled). Enabled: the feeds,
   the box and the discovery links (Rules 1–12). Disabled: the feed
   addresses answer "404 Not Found", and the box, the discovery links
   and the "Settings" action are gone (Rules 14, 14a). *Plugins management*
   owns enabling and disabling. <sup>a</sup>
2. **"Display web feed links on…"** (the plugin's "Settings" window;
   default "…on homepage and issue pages only." {OJS}, "…on homepage
   only." on a press and a preprint server). Each choice sets the pages
   whose header carries the discovery links (Rule 12); the box is not
   affected (Rule 11). <sup>e</sup>
3. **"Display items in current published issue." / "Display a fixed
   number of the most recent publications."** {OJS} (the same window;
   a new journal arrives with the second, [A5](#a5)). The first lists the
   current issue's articles and ignores the number (Rule 5); the second
   lists the most recently changed articles up to the number (Rule 4).
   <sup>f</sup>
4. **"Number of publications to display"** (the same window; default
   30). The most articles a feed lists under the fixed-number choice
   (Rule 4). <sup>f</sup>
5. **"Include identifiers (ISBN, keywords, categories, etc.) in the feed
   summary?"** (the same window; default unticked). Ticked: each summary
   opens with the article's section and term lines (Rule 9). Unticked:
   the abstract alone. <sup>g</sup>
6. **"Sidebar"** (Settings › Website › "Appearance" › "Setup"; default
   no block). "Web Feed Plugin" ticked places the box of Rule 11 on every
   public page. [Appearance & theming](U10-appearance-and-theming.md)
   owns the list. <sup>e</sup>
7. **"Users must be registered and log in to view the journal site."**
   ("…view the press site." on a press, "…view the server site." on a
   preprint server)
   (Settings › Users & Roles › "Site Access Options"; default unticked).
   Ticked: a signed-out visitor or feed reader asking for a feed is sent
   to Login (Rule 13). *Roles configuration* owns the option. <sup>b</sup>
8. **"Enable this journal to appear publicly on the site"**
   (Administration › Hosted Journals, the journal's "Edit"; ticked on
   every new journal). Unticked: the same as bullet 7 for a signed-out
   visitor (Rule 13). *Hosted journals* owns it. <sup>b</sup>
9. **The journal's own texts**: "Journal Summary", the search indexing
   "Description", the principal and technical support contacts, "License
   Terms", "Publisher" {OJS} ("Press Publisher Name" on a press) and the
   ISSNs {OJS} (Settings › Journal and Settings › Distribution; empty on
   a new journal but for the principal contact).
   Each fills its part of the feed's channel when set (Rule 8).
   [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
   owns the Masthead and Contact tabs. <sup>c</sup>

## Cross-feature interactions

- [Announcements](U12-announcements.md) owns the announcement feed {OJS}:
  its own plugin, "Announcement Feed Plugin", its own box and its own
  addresses under the same gateway address. Nothing is shared with the
  article feeds but the gateway address.
- [Appearance & theming](U10-appearance-and-theming.md) owns the
  "Sidebar" list and what happens to a placed box whose plugin is
  disabled (Rules 23–25); this spec owns what the box shows (Rule 11).
- *Plugins management* owns the "Installed Plugins" list, enabling and
  disabling a plugin and the messages of both (Rule 14).
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns who opens the Settings pages and the texts the channel shows
  (Rule 8).
- [Article landing page & reading](U13-article-landing-page-and-reading.md)
  owns the page an item's link opens on a journal and a preprint server;
  *Monograph landing page* owns a book's page.
- [Publish schedule & versions](U49-publish-schedule-and-versions.md)
  owns publishing, scheduling and unpublishing, which put an article in
  a feed and take it out (Rule 3); [Issues](U50-issues.md) owns which
  issue is current and the order of its table of contents (Rules 5, 5a).
- [Sections](U17-sections.md), [Categories](U16-categories.md) and
  [Publication metadata](U40-publication-metadata.md) own the section,
  categories, keywords, subjects and disciplines an item names (Rules 7,
  9).
- *Roles configuration* and *Hosted journals* own the two access settings
  of Rule 13.
- [Archiving & preservation](U67-archiving-preservation.md) {OJS} owns the LOCKSS and CLOCKSS pages
  under the same gateway address (Rule 15).
- *Languages & locales* owns the interface languages a feed can be read
  in (Rule 10).

## Canonical scenarios

Every scenario runs on a scratch journal, press or preprint server with
throwaway accounts, its feeds read by a visitor, signed out, in a second
browser; the accounts, their passwords and the tooling recipe are in the
footnote. <sup>s</sup>

1. **The three feeds of a journal with a published article** {OJS OMP OPS}

   Given: a visitor, signed out, on a scratch journal "Sea Letters" whose
   "Web Feed Plugin" nobody has touched, where the Author Ada Author's
   article "Tidal Patterns", with the abstract "Tides follow the moon.",
   is published with the date 2024-03-05, her "Draft Study" is submitted
   and still in the workflow and, on a journal, her "Future Tides" is
   scheduled in the unpublished issue Vol. 1 No. 2 (2026); and a second
   scratch journal where the article "Elsewhere" is published.

   - **The Atom feed**: open {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom,
     {journal address} being the address of the journal's home page: the
     browser shows a page of marked-up text with no tab title. The feed's
     title is "Sea Letters" and its link the journal's home page; it holds
     one item, "Tidal Patterns", whose link is the article's page, whose
     author is "Ada Author", whose summary is "Tides follow the moon."
     and whose publication date reads "2024-03-05T00:00:00+00:00" (Rules
     1, 7, 8; Fields, the three tables).
   - **The RSS 2.0 feed**: open the same address ending in "/rss2" in
     place of "/atom": a page of marked-up text again, holding the same
     one item; its authors line reads "Ada Author (Author)", its date
     "Tue, 05 Mar 2024 00:00:00 +0000", and the feed's language "en"
     (Rule 2; Fields, the three tables).
   - **The RSS 1.0 feed**: open the address ending in "/rss": the browser
     downloads the file "rss.rdf", which holds the same item, dated
     "2024-03-05", and the language "en" (Rule 2; Fields, the three
     tables).
   - **Not in the feeds**: none of the three holds "Draft Study",
     "Future Tides" {OJS} or "Elsewhere" (Rule 3).
   - **The item's link**: follow the link of the Atom feed's item: it
     opens the article's page of "Tidal Patterns" (on a press, the
     book's page) (Rule 7).
   - **Other gateway addresses**: open {journal address}/gateway: the
     journal's home page opens. Open
     {journal address}/gateway/plugin/NoSuchPlugin/atom: the page answers
     "404 Not Found" (Rule 15).
   - **Control**: the second journal's Atom feed, at its own address,
     holds "Elsewhere" (Rule 3). <sup>s</sup>

2. **The feeds follow publishing** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal where the article "Tidal Patterns", dated
   2024-03-05, and then the article "Coral Reefs" were published.

   - **Before**: the visitor opens
     {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom
     ({journal address} being the address of the journal's home page)
     and the same address ending in "/rss2" and in "/rss" in place of
     "/atom": each feed lists "Coral Reefs", then "Tidal Patterns" (Rules
     2, 3, 4).
   - **Unpublished**: Journal Manager: open "Tidal Patterns" in its
     workflow and unpublish it, as [Publish schedule &
     versions](U49-publish-schedule-and-versions.md) scenario 3 does. The
     visitor reloads the three feeds: each lists "Coral Reefs" alone
     (Rule 3).
   - **Published again**: publish "Tidal Patterns" again, as that spec's
     scenario 10 does. The visitor reloads the three feeds: each lists
     "Tidal Patterns" again; on a journal it now stands first, above
     "Coral Reefs" (Rules 3, 4a; on a press and a preprint server
     [A8](#a8)).
   - **A second version**: create a new version of "Tidal Patterns", as
     that spec's scenario 4 does; on the new version's "Title & Abstract"
     page change "Title" to "Tidal Patterns Revisited" and press "Save";
     then publish the new version, as that spec's scenario 5 does. The
     visitor reloads the three feeds: the item reads "Tidal Patterns
     Revisited" in place of "Tidal Patterns", and its date is the new
     version's publication date, no longer 2024-03-05 (Rule 7; Fields,
     "What each item carries").
   - **Control**: "Coral Reefs" stays in the three feeds throughout (Rule
     3). <sup>s</sup>

3. **The "Latest publications" box, and the plugin switched off** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal where the article "Tidal Patterns" is published
   and the plugin's "Number of publications to display" is saved at 5.

   - **Placed**: open Settings › Website › "Appearance" › "Setup":
     "Sidebar" lists "Web Feed Plugin", unticked. Tick it and press
     "Save" ([Appearance & theming](U10-appearance-and-theming.md) owns
     the list) (Settings bullet 6).
   - **The box**: the visitor reloads the journal's home page: the
     sidebar holds a box headed "Latest publications", with three logo
     links whose images read "Atom logo", "RSS2 logo" and "RSS1 logo";
     the same box shows on "About the Journal" and on the article's page
     of "Tidal Patterns" (Rule 11).
   - **Its links**: press "Atom logo": the Atom feed shows as a page of
     marked-up text listing "Tidal Patterns". Go back and press "RSS2
     logo": the RSS 2.0 feed shows the same way. Go back and press "RSS1
     logo": the browser downloads the file "rss.rdf" (Rule 11; Fields,
     "The three feeds").
   - **Switched off**: Journal Manager: open Settings › Website ›
     "Plugins" › "Installed Plugins", untick "Web Feed Plugin" under
     "Generic Plugins" and confirm: its row has no arrow (Rule 14a). The
     visitor reloads the home page: it has no "Latest publications" box,
     and its source carries no feed link. Each of the three feed
     addresses, {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom
     ({journal address} being the address of the journal's home page)
     and the same address ending in "/rss2" and in "/rss", answers "404
     Not Found". Open "Appearance" › "Setup": "Sidebar" no longer lists
     "Web Feed Plugin"; leave the tab unsaved (Rule 14; Settings bullet
     1).
   - **Switched on again**: tick "Web Feed Plugin" on "Installed
     Plugins": its arrow opens "Settings" again, and that window reads 5
     in "Number of publications to display". The visitor reloads the home
     page: the "Latest publications" box is back, the page's hidden header
     carries the three feed links again, and the Atom feed lists "Tidal
     Patterns" (Rules 12, 14).
   - **Control**: before the first "Save", the visitor's home page had no
     "Latest publications" box, while its source already carried the three
     feed links (Rules 1, 12). <sup>s</sup>

4. **Where the feeds are advertised** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal where the article "Tidal Patterns" is published,
   on a journal in the published issue Vol. 1 No. 1 (2024).

   - **The plugin's window**: open Settings › Website › "Plugins" ›
     "Installed Plugins": under "Generic Plugins", "Web Feed Plugin" is
     ticked. Press the arrow beside it, then "Settings": a window titled
     "Web Feed Plugin" opens with "This plugin produces RSS/Atom web
     syndication feeds." and, under a heading "Settings", "Display web
     feed links on homepage and issue pages only." chosen ("Display web
     feed links on homepage only." on a press and a preprint server),
     {OJS} "Display a fixed number of the most recent publications."
     chosen [A5](#a5), 30 in "Number of publications to display",
     "Include identifiers (ISBN, keywords, categories, etc.) in the feed
     summary?" unticked, and the buttons "Cancel" and "OK" (Rules 1, 17;
     Fields, the settings window).
   - **A new journal's discovery links**: the visitor opens the journal's
     home page and views its source: it carries three feed links, one per
     feed; on a journal the "Archive" page and the page of Vol. 1 No. 1
     carry them too (Rule 12).
   - **"…on all application pages."**: Journal Manager: choose "Display
     web feed links on all application pages." and press "OK": the window
     closes and "Your changes have been saved." shows (Rule 16; Side
     effects). The visitor opens "About the Journal" and the article's
     page of "Tidal Patterns": each page's source now carries the three
     feed links (Rule 12; Settings bullet 2).
   - **"…on issue pages only."** {OJS}: reopen the window, choose
     "Display web feed links on issue pages only." and press "OK". The
     visitor reloads the home page: its source carries no feed link; the
     "Archive" page and the page of Vol. 1 No. 1 still carry the three
     (Rule 12; Settings bullet 2).
   - **Control**: before the first "OK", the source of "About the
     Journal" and of the article's page carried no feed link (Rule 12).
     <sup>s</sup>

5. **Which articles, and how many** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal where the articles "Alpha", "Beta" and "Gamma"
   were published in that order, dated 2024-03-03, 2024-03-02 and
   2024-03-01, "Gamma" in the categories "Cat One" and "Cat Two" and with
   the abstract "Currents turn at dusk.", and, on a journal, "Alpha" and
   "Beta" in the published issue Vol. 1 No. 1 (2024) and "Gamma" in no
   issue.

   - **The most recently changed first**: the visitor opens
     {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom
     ({journal address} being the address of the journal's home page)
     and the same address ending in "/rss2" and in "/rss" in place of
     "/atom": each feed lists "Gamma", "Beta" and "Alpha", in that order,
     although "Alpha" carries the latest date; "Gamma" carries "Cat One"
     and "Cat Two" among its subject terms, and its summary is "Currents
     turn at dusk." (Rules 2, 4; Fields, "What each item carries").
   - **"Include identifiers…" ticked**: Journal Manager: open Settings ›
     Website › "Plugins" › "Installed Plugins", press the arrow beside
     "Web Feed Plugin", then "Settings"; tick "Include identifiers (ISBN,
     keywords, categories, etc.) in the feed summary?" and press "OK":
     "Your changes have been saved." shows. The visitor reloads the three
     feeds: "Gamma"'s summary opens with the line "Section: Articles"
     ("Section: Preprints" on a preprint server; on a press, whose book is
     in no series, no such line) and the line "Categories: Cat One, Cat
     Two", then an empty line and "Currents turn at dusk." (Rule 9;
     Settings bullet 5).
   - **A number below the count**: reopen the window, type 2 in "Number of
     publications to display" in place of 30 and press "OK": "Your changes
     have been saved." shows. The visitor reloads the three feeds: each
     lists "Gamma" and "Beta", and no "Alpha" (Rule 4; Settings bullet 4).
   - **"Display items in current published issue."** {OJS}: reopen the
     window, choose "Display items in current published issue.", empty
     "Number of publications to display" and press "OK": "Your changes
     have been saved." shows; reopened, the box reads 0 (Rule 16d). The
     visitor opens the page of Vol. 1 No. 1: it lists "Alpha" and "Beta".
     The visitor reloads the three feeds: each lists the same two, in
     either order, and no "Gamma" (Rules 5, 5a; Settings bullet 3).
   - **Control**: before "Include identifiers…" was ticked, "Gamma"'s
     summary carried no "Categories:" line (Rule 9). <sup>s</sup>

6. **The window's number box, "Cancel" and leaving unsaved** {OJS OMP OPS}

   Given: Journal Manager, on a scratch journal whose "Web Feed Plugin"
   window nobody has saved.

   - **"Cancel"**: open Settings › Website › "Plugins" › "Installed
     Plugins", press the arrow beside "Web Feed Plugin", then "Settings".
     Choose "Display web feed links on all application pages.", type 5 in
     "Number of publications to display" in place of 30, tick "Include
     identifiers (ISBN, keywords, categories, etc.) in the feed summary?"
     and press "Cancel": the window closes, with no question. Reopen it:
     "Display web feed links on homepage and issue pages only." ("Display
     web feed links on homepage only." on a press and a preprint server)
     is chosen, the box reads 30 and "Include identifiers…" is unticked
     (Fields, the settings window).
   - **"×" after a change**: replace 30 with 5 and press the window's
     "×": it asks "The data on this form has changed. Do you wish to
     continue without saving?". Accept: the window closes; reopened, the
     box reads 30 (Fields, the settings window).
   - **Leaving the page**: replace 30 with 5 and reload the page: the
     browser asks whether to leave it. Leave, then reopen the window: the
     box reads 30 (Fields, the settings window).
   - **A refused number**: tick "Include identifiers…", replace 30 with
     "abc" and press "OK": the window stays open; "Errors occurred
     processing this form" and "Please enter a positive integer for
     recent published items." show above the plugin's description, the
     same message stands in place of the box's label, and the box is
     empty. Press "OK" again: "This field is required." shows under the
     box (Rules 16a, 16b).
   - **The other refused values**: type "0" and press "OK", then "-3",
     then one space: each is refused the same way, the box emptied each
     time (Rule 16a).
   - **Kept numbers**: press "Cancel" and reopen the window. Replace 30
     with "3abc" and press "OK": the window closes with "Your changes have
     been saved."; reopened, the box reads 3. Do the same with "2.5": it
     reads 2; and with "1000000": it reads 1000000 (Rule 16c).
   - **Control**: reopened after the refusals and "Cancel", the window
     read 30 in the box, with "Include identifiers…" unticked, so nothing
     had been saved (Rule 16b). <sup>s</sup>

7. **A journal with nothing published, and the feed's description** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal "Quiet Waters" with nothing published, whose
   principal contact is Pat Contact, pat.contact@example.org, and whose
   Settings › Journal › "Masthead" tab already has its initials, "QW",
   and a Country.

   - **The Atom feed**: the visitor opens
     {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom
     ({journal address} being the address of the journal's home page):
     the feed's title is "Quiet Waters", its link the journal's home page,
     its author "Pat Contact" with "pat.contact@example.org", and it holds
     no item (Rules 6, 8; Fields, "What the feed says about the journal").
   - **The RSS 1.0 feed**: open the same address ending in "/rss" in
     place of "/atom": the browser downloads the file "rss.rdf", titled
     "Quiet Waters" and holding no item (Rule 6). The RSS 2.0 address is
     not read here [A1](#a1).
   - **The search indexing "Description"**: Journal Manager: open
     Settings › Distribution › "Search Indexing", type "Letters about
     still water." in "Description" and press "Save". The visitor reloads
     the Atom feed: its description reads "Letters about still water."
     (Rule 8; Settings bullet 9).
   - **"Journal Summary"**: open Settings › Journal › "Masthead", type "A
     journal of quiet seas." in "Journal Summary" and press "Save". The
     visitor reloads the Atom feed: its description now reads
     "`<p>A journal of quiet seas.</p>`" in place of the search indexing
     text [A6](#a6) (Rule 8; Settings bullet 9).
   - **Control**: at the first read, before either save, the Atom feed's
     description was empty (Settings bullet 9). <sup>s</sup>

8. **A journal closed to visitors** {OJS OMP OPS}

   Given: a visitor, signed out, and a Reader, on a scratch journal where
   "Users must be registered and log in to view the journal site." ("…view
   the press site." on a press, "…view the server site." on a preprint
   server) is ticked on Settings › Users & Roles › "Site Access Options"
   and the article "Tidal Patterns" is published; and a second scratch
   journal without that option, where the article "Open Study" is
   published.

   - **Signed out**: open
     {journal address}/gateway/plugin/WebFeedGatewayPlugin/atom
     ({journal address} being the address of the journal's home page):
     the Login page opens in place of the feed; the same with the address
     ending in "/rss2" and in "/rss" (Rule 13; Settings bullet 7).
   - **Signed in**: sign in there as the Reader and open the three
     addresses again: each shows its feed, listing "Tidal Patterns"
     (Rules 3, 13).
   - **Control**: before the sign-in, the second journal's Atom feed, at
     its own address, showed and listed "Open Study" (Rule 13).
     <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - {OMP OPS} an item published, for the first time or again, after later-submitted items were published: first in the three feeds, and alone in them with "Number of publications to display" at 1 ([A8](#a8); Rule 4a): the guard the issue report proposes, once fixed
  - a feed address with a feed name that does not exist ("ATOM", "atom.xml", "json") or with none answering "404 Not Found" ([A2](#a2); Rule 15): the guard the issue report proposes, once fixed
  - "Include identifiers…" ticked: the label names what the summary then carries (the section or series, categories, keywords, subjects, disciplines) and no ISBN ([A3](#a3); Rule 9b): the guard the issue report proposes, once fixed
- **Rarely met**:
  - {OJS} "Display items in current published issue." on a journal with
    no published issue, its Atom and RSS 1.0 feeds holding no item (Rules
    5, 6): a journal lists its current issue before any issue is out only
    while it is being set up, not in an ordinary week
- **Nothing new to test**:
  - a feed read in French, its titles, abstracts and term labels in
    French and its language code "fr-CA" (Rule 10)
  - the Site Administrator's "Web Feed Plugin" on the site's own pages:
    its box, whose links lead back to the site's home page, and the
    site's row without "Settings" (Actors row 6; Rule 18)
  - {OMP} "Include identifiers…" ticked on a book outside a series with
    no terms, its summary opening with the empty line (Rule 9a)
  - {OJS} the current-issue feed after the issue's articles were ordered
    with "Order" on its "Table of Contents", listing each section's
    articles in that order (Rule 5a)
  - the Editor, the Production Editor and the Site Administrator in the
    journal (Actors rows 3–5): the same "Sidebar", "Installed Plugins"
    row and settings window as scenarios 3 to 6's Journal Manager
  - the Site Administrator's row of the disabled plugin, whose arrow
    opens only "Delete" and "Upgrade" (Rule 14a): no "Settings", as
    scenario 3's row without an arrow
  - a signed-in reader on an open journal (Actors row 1): the same feed
    as scenario 1's signed-out visitor, as scenario 8's Reader reads it
  - "Enable this journal to appear publicly on the site" unticked
    (Settings bullet 8; Rule 13): the same Login page as scenario 8's
    signed-out visitor meets
- **Register carries it**:
  - A1 (the RSS 2.0 feed of a journal with nothing to list; Rule 6;
    scenario 7 passes it)
  - A2 (a feed name other than "atom", "rss2" or "rss", or none; Rule 15)
  - A3 (the ISBN the "Include identifiers…" label names; Rule 9b)
  - A7 (keywords, subjects and disciplines reading "Array"; the item
    table; Rule 9)
  - A8 {OMP OPS} (an item published again, or in a new version, with more
    items than the number; Rule 4a; scenario 2 passes it)
  - OPS1 (the RSS 1.0 feed's publisher on a preprint server; the channel
    table)
  - A4 (the box on every page whatever the "Display web feed links…"
    choice; Rules 11, 12)
  - A5 {OJS} (a new journal's list choice; Rule 17; scenario 4 reads it)
  - A6 (the "License Terms" in the copyright line, with their paragraph
    tags; the channel table)
- **Owned by another feature**:
  - enabling and disabling "Web Feed Plugin" on "Installed Plugins", its
    confirmation and its messages (Actors row 4; *Plugins management*)
  - the Section Editor, the Assistant, the Author, the Reviewer and the
    Reader kept out of the Settings pages, so out of the window and
    "Sidebar" (Actors preamble; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - {OJS} the LOCKSS and CLOCKSS pages under the gateway address (Rule
    15a; [Archiving & preservation](U67-archiving-preservation.md))
  - {OJS} an article of the current issue whose newer version was
    published with "Don't Assign To An Issue", still in the three feeds
    under its newer title (Rule 5b; *[Issues](U50-issues.md)*, its
    register's A17)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | The RSS 2.0 feed of a journal with nothing to list shows a blank page, the app failing, instead of an empty feed | 🐞 | user-visible · crash: server | — |
| [A2](#a2) | A web feed address with a mistyped or missing feed name shows a blank page instead of "404 Not Found" | 🐞 | low · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A3](#a3) | The web feed setting "Include identifiers (ISBN, …)" names an ISBN, and no feed ever carries one | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | Every keyword, subject and discipline reads "Array" in the feeds | 🐞 | user-visible | — |
| [A8](#a8) | A press's or preprint server's web feeds list items by when they were submitted, and leave out one published late {OMP OPS} | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OPS1](#ops1) | A preprint server's RSS 1.0 feed names its publisher "Array" | 🐞 | minor | — |
| [A4](#a4) | "Display web feed links on…" moves only the hidden discovery links; the visible box shows on every page | ❓ | minor | — |
| [A5](#a5) | A new journal's feeds list the most recent articles, while the plugin's own default is the current issue {OJS} | ❓ | latent | — |
| [A6](#a6) | The feeds' copyright line shows the "License Terms" with their paragraph tags written out | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — The RSS 2.0 feed of an empty journal does not open** · 🐞 · user-visible · crash: server.
A reader who presses "RSS2 logo" on a journal with nothing published yet
(or, on a journal listing its current issue, with no published issue)
expects a feed with no items, as the Atom and RSS 1.0 links give. The
address shows a blank page with no tab title instead: the app fails with
a server error. A feed reader that subscribes early gets an error rather
than a feed it can check later.
Since: 2026-06-27 · Basis: probe, 2026-09-25. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A web feed address with a mistyped or missing feed name shows a blank page instead of "404 Not Found"** · 🐞 · low · crash: server.
The application fails on the server when a visitor or a feed reader
opens a web feed address of a journal, press or preprint server with a
feed name that does not exist, or with none: the browser shows a blank
page with no tab title. The feed names are "atom", "rss2" and "rss" in
lower case, so a mistyped subscription such as "ATOM" or "atom.xml"
fails this way.

They expect "404 Not Found": the same kind of address with a plugin name
that does not exist answers that. On 3.3 the address led to the home
page; since 3.4 the application fails.

Nothing is lost: the three feeds work at their own addresses, and the
feed links the pages offer lead to those. Each such visit adds a server
error to the log. "Web Feed Plugin" is on by default.
Basis: probe, 2026-10-02. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The web feed setting "Include identifiers (ISBN, …)" names an ISBN, and no feed ever carries one** · 🐞 · low.
A manager ticks "Include identifiers (ISBN, keywords, categories, etc.)
in the feed summary?" in the Web Feed Plugin's settings, expecting each
item's summary to name its ISBN, the identifier the label lists first.
The summary names the section (the series on a press), categories,
keywords, subjects and disciplines only.

The label is what is wrong: the option was never written to add an
ISBN, and no app's feeds have ever carried one. A journal and a preprint
server have no ISBN at all. A press does, saved on a book's publication
format and shown on the book's page, and its feeds leave it out too.
Basis: probe, 2026-10-02. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The display choice does not move the box** · ❓ · minor.
A manager who chooses "Display web feed links on homepage only." (or
"…on issue pages only.") expects the feed links to show there only. The
choice moves only the hidden discovery links; the "Latest publications"
box, the feed links a reader sees, stays on every page it is placed on.
Question: should the choice also decide where the box shows, as the
announcement feed's choice does, or should its label say it concerns the
links a browser discovers? Lean: ✅ as built, with a clearer label: the
box has not followed this choice since at least 2015, and the "Sidebar"
list is where a manager decides where the box goes.
Basis: probe, 2026-09-25. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A new journal lists recent articles, not the current issue** {OJS} · ❓ · latent.
The plugin ships "Display items in current published issue." as its
default, yet a new journal's feeds list the 30 most recently changed
articles and its window shows "Display a fixed number of the most recent
publications." chosen, because the default is stored in a form the
plugin cannot read back. Screen and feed agree, so no reader sees a
contradiction.
Question: which is a new journal's intended default? Lean: the recent
list, which every journal has had since the default was written in 2010,
with the shipped default corrected to match.
Basis: probe, 2026-09-25. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The copyright line shows the "License Terms" with their tags** · ❓ · minor.
A manager saves "License Terms" on Settings › Distribution › "License"
expecting the RSS 2.0 and RSS 1.0 feeds' copyright line to read that
text. It reads the text with its paragraph tags written out,
"`<p>{license terms}</p>`", in a part a feed reader treats as plain text. The description taken from "Journal Summary" carries the same tags.
Question: should the feed drop the formatting of "License Terms" from its
copyright line? Lean: 🐞 for the copyright line, where the tags have no
use; the description is a part a feed may carry formatted.
Basis: probe, 2026-09-25. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Every keyword, subject and discipline reads "Array"** · 🐞 · user-visible.
A reader expects each item of a feed to name the article's keywords,
subjects and disciplines among its subject terms and, with "Include
identifiers…" ticked, in its summary. Each of them reads "Array"
instead, in all three feeds and in every interface language ("Keywords:
Array, Array"; in French "Mots-clés: Array"), whether the terms came with
the article or were typed on its "Metadata" page. The section, the
series and the categories read correctly.
Since: 2025-02-13 · Basis: probe, 2026-09-25. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A press's or preprint server's web feeds list items by when they were submitted, and leave out one published late** {OMP OPS} · 🐞 · medium.
A press publishes a book and expects its web feeds, "the most recent
publications", to list it first. The feeds place it by the date it was
submitted instead: publishing does not move an item, and neither does
an editorial decision, a new version, or "Unpublish" and "Publish". A
book is in the wrong place whenever a book submitted after it was
published before it. A preprint server does the same.

With more published items than "Number of publications to display" (30
unless changed), a book or preprint with that many later submissions
already published stays below the cut and out of all three feeds: a
new version of an older item, or a first publication that took long.
Subscribers never learn of it, and nothing an editor can do to a
published item moves it.

"Web Feed Plugin" is on by default. On `main` a journal's feeds do move
a published article to the top, through a change of its own that the
fix would move into the shared code. On 3.5 and 3.4 a journal's feeds
have the same fault unless "Display items in current published issue."
was chosen.
Basis: probe, 2026-10-02. <sup>f-a8</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The RSS 1.0 feed names the server's publisher "Array"** · 🐞 · minor.
A reader of a preprint server's RSS 1.0 feed expects the server's name
as the feed's publisher, the way a journal's feed names its "Publisher"
and a press's its "Press Publisher Name". It reads "Array".
Since: 2025-09-09 · Basis: probe, 2026-09-25. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips: ojs `d9b567efec`, omp
`187f0f40d`, ops `61cd158ce3`. The plugin is an app-side copy in each
app, `plugins/generic/webFeed`, a submodule of `pkp/webFeed` at the same
commit `7436935` in all three (the trees are byte-identical, `diff -r`);
its only app switch is `WebFeedPlugin::hasIssues()` (the application name
contains "ojs"). Every claim was driven on the three apps' test installs on
2026-09-25 and 2026-09-26, in Chromium, on scratch journals, presses and
preprint servers made for the check; the `td` notes record what was seen.

<a id="fn-a"></a>
**a** — `WebFeedPlugin extends GenericPlugin`; `register()` registers, only when `getEnabled($mainContextId)`, `WebFeedBlockPlugin` (category `blocks`) and `WebFeedGatewayPlugin` (category `gateways`) and calls `setupTemplateLinks()`. `getContextSpecificPluginSettingsFile()` returns `settings.xml` (`enabled` true, `displayPage` `homepage`, `displayItems` `issue` typed `bool`, `recentItems` 30, `includeIdentifiers` false), which `PluginSettingsDAO::installSettings()` writes for every new context. `getActions()` adds the `settings` `LinkAction` (`manager.plugins.settings` "Settings", an `AjaxModal` titled with `getDisplayName()`) only while enabled. Display name `plugins.generic.webfeed.displayName` "Web Feed Plugin" (the block and the gateway report the same name). Disabled, the gateway is not registered and `GatewayHandler::__construct()` throws `NotFoundHttpException` for `op == 'plugin'` with an unknown plugin name. Live-probed 2026-09-25 (Purpose; Rule 1): note td1. Live-probed 2026-09-26 (Purpose), all three apps, two runs: a new context made with no plugin setting listed "Web Feed Plugin" ticked under "Generic Plugins"; OJS listed "Announcement Feed Plugin" as a row of its own, unticked on a new journal, while a press and a preprint server with announcements on listed no such row and answered "404 Not Found" at `…/gateway/plugin/AnnouncementFeedGatewayPlugin/atom`.

<a id="fn-b"></a>
**b** — Settings access: `ManagementHandler` / `PluginGridHandler` with `CanAccessSettingsPolicy` (the Journal identity spec's note on settings access). Feeds: `APP\pages\gateway\GatewayHandler` in each app (OJS ops `index`, `lockss`, `clockss`, `plugin`; OMP and OPS `index`, `plugin`), no `authorize()` override, so `PKPHandler::authorize()` adds `RestrictedSiteAccessPolicy` (login exemptions `user`, `login`, `help`, `header`, `sidebar`, `payment`, `invitation`; `gateway` is not one), and `PKPPageRouter::route()` sends a signed-out request for a disabled context to `login` unless the page is `login` or `invitation`. The gateway plugin's `getPolicies()` is the empty default. Live-probed 2026-09-25 (Actors preamble, rows 1, 3–5), all three apps, one account per permission level on a scratch context: the Journal (Press, Preprint Server) Manager, the Editor and the Production Editor (OJS, OMP) and the Site Administrator opened Settings › Website; the Section Editor, an assistant (the Copyeditor; on OPS an Editorial Board Member), the Reviewer (OJS, OMP), the Author, the Reader and an Editor whose role had "Permit changes to Settings" unticked got "The current role does not have access to this operation."; a signed-out visitor got Login. Rule 13: note td12.

<a id="fn-c"></a>
**c** — `WebFeedGatewayPlugin::fetch()`: returns false (the handler then redirects to the context's `index`) with no context or the plugin disabled; `FEED_MIME_TYPE` `atom` `application/atom+xml`, `rss` `application/rdf+xml`, `rss2` `application/rss+xml`; anything else throws `Exception('Invalid feed format')`. Templates `atom.tpl`, `rss2.tpl`, `rss.tpl`. Channel: `$context->getLocalizedName()`; link `{url context=…}`; description `getLocalizedDescription()` else `getLocalizedData('searchDescription')` (`PKPSearchIndexingForm`, `common.description` "Description"); Atom `<updated>` and RSS 2.0 `<pubDate>` from `$latestDate`; Atom `<author>` `contactName` / `contactEmail`; RSS 2.0 `<managingEditor>` `contactEmail (contactName)`, `<webMaster>` `supportEmail` with `(supportName)` printed when `contactName` is set (both contacts are required on the Contact tab, so the name always prints); `<language>` and `<dc:language>` `LocaleConversion::toBcp47(Locale::getLocale())`; `<copyright>` / `<prism:copyright>` `licenseTerms` through `escape:"html"` (A6); RSS 1.0 `<dc:publisher>` from `publisherInstitution` (OJS), `publisher` (OMP) and `getData('name')` (OPS), the per-language array of the server's name (OPS1), `<prism:issn>` `printIssn` else `onlineIssn`. Item: link `{url page=$publicationPage op=$publicationOp path=urlPath|default:submissionId}` with `article/view` (OJS), `catalog/book` (OMP), `preprint/view` (OPS); title `getLocalizedTitle()` of `getCurrentPublication()`; Atom `<author><name>` and RSS 1.0 `<dc:creator>` `getFullName(false)` per author; RSS 2.0 one `<dc:creator>` `getAuthorString($userGroups)`, whose truthy argument filters to `includeInBrowse` authors and prints "Name (Role, Role)" joined by `common.semicolonListSeparator` "; "; `<summary>` / `<description>` only when an abstract or `includeIdentifiers`; subject terms as Atom `<category>`, RSS 2.0 `<category domain>` and RSS 1.0 `<dc:subject>` for every identifier regardless of `includeIdentifiers`; dates Atom `date_format:"Y-m-d\TH:i:sP"` (`PKPTemplateManager::smartyDateFormat()`, Carbon `translatedFormat`), RSS 2.0 `DATE_RSS|date:(datePublished|strtotime)`, RSS 1.0 `date_format:"Y-m-d"`; rights `submission.copyrightStatement` "Copyright (c) {$copyrightYear} {$copyrightHolder}", RSS adds `licenseUrl` and a `<cc:license>` resource when the license is Creative Commons and (OJS, OPS) the access status is open; RSS 1.0 `prism:startingPage`, `endingPage`, `doi`. Language: the feed renders in the request's locale (pkp/webFeed "Use UI Language in Web Feeds", 2024). Live-probed 2026-09-25 (the three feeds; Rules 2, 7, 8, 10): notes td1, td2, td6, td7, td9. The Atom, RSS 2.0 and RSS 1.0 addresses answer `application/atom+xml`, `application/rss+xml` and `application/rdf+xml`; Chromium shows the first two as text and saves the third as `rss.rdf`, from the address and from "RSS1 logo" alike. On a context with more than one interface language, `{journal address}/gateway/…` answers 302 to `{journal address}/en/gateway/…`, the language of the visit; the box's links carry the language already. Live-probed 2026-09-26 (Rule 15): note td14.

<a id="fn-d"></a>
**d** — `WebFeedPlugin::manage()` with `verb=settings`: `SettingsForm` (`FormValidatorPost`, `FormValidatorCSRF`); `readInputData()` empties `recentItems` when `(int)` of it is not above zero and adds a `required` check (`plugins.generic.webfeed.settings.recentItemsRequired`) when `!hasIssues()` or `displayItems === 'recent'`; `execute()` writes `displayPage` string, `displayItems` string, `recentItems` int, `includeIdentifiers` bool; on success `createTrivialNotification()` (`common.changesSaved` "Your changes have been saved."). Template `settingsForm.tpl`: `plugins.generic.webfeed.description` (with a `<br>`), heading `plugins.generic.webfeed.settings` "Settings", radios `displayPage` `all` / `homepage` (`settings.homepageAndIssues` on OJS, `settings.homepage` otherwise) / `issue` (OJS), radios `displayItems` `issue` / `recent` (OJS), text `recentItems` (`settings.recentArticles` "Number of publications to display"), checkbox `includeIdentifiers`, `{fbvFormButtons}` (default `common.ok` "OK" and `common.cancel` "Cancel") and `common.requiredField`. The radios are checked through the `compare` modifier (`==`), so the stored `true` of a new journal's `displayItems` equals both "issue" and "recent" and both radios carry `checked`, of which a browser keeps the last. Live-probed 2026-09-25 (the window; Rules 16, 17): note td15.

<a id="fn-e"></a>
**e** — Box: `WebFeedBlockPlugin extends BlockPlugin` with no `getContents()` override, so `PKPTemplateManager::displaySidebar()` prints `templates/block.tpl` wherever the context's `sidebar` lists `WebFeedBlockPlugin`: `div.block_web_feed`, heading `plugins.generic.webfeed.blockTitle` "Latest publications", three links `gateway/plugin/WebFeedGatewayPlugin/{atom,rss2,rss}` with images `lib/pkp/templates/images/{atom,rss20_logo,rss10_logo}.svg` and alt texts `plugins.generic.webfeed.{atom,rss2,rss1}.altText`. Discovery links: `setupTemplateLinks()` hooks `TemplateManager::display` for page requests with a context and adds three `<link rel="alternate">` headers with the contexts `frontend` (`all`), `frontend-index` and `frontend-issue` (`homepage`) or `frontend-issue` (`issue`), resolved by `PKPTemplateManager::getResourcesByContext()` against the requested page (`index` for the home page, `issue` for `issue/archive` and `issue/view`). Before the plugin left the OJS tree (pkp/pkp-lib#8770, 2023-03-14), `WebFeedBlockPlugin::getContents()` checked only that a current issue existed (since 2015), never `displayPage`. Live-probed 2026-09-25 (Actors rows 2–3; Rules 11, 12): notes td10, td11.

<a id="fn-f"></a>
**f** — `fetch()`: `Repo::submission()->getCollector() ->filterByContextIds([$context])->filterByStatus([STATUS_PUBLISHED]) ->limit($recentItems)->orderBy(ORDERBY_LAST_MODIFIED, DESC)`, where `$recentItems` is `abs((int) recentItems)` or `DEFAULT_RECENT_ITEMS` 30; on OJS with `displayItems === 'issue'`, `filterByIssueIds([current published issue ?? 0])`, which keeps a submission when any of its publications carries the issue's id (`APP\submission\Collector::getQueryBuilder()`, a subquery on `publications.issue_id`; read 2026-09-29, ojs `9d9f116f38`), so an article whose current version was published with no issue stays and its item takes that version's title (Rule 5b; the Issues spec's A17, same filter), no limit, `orderBy(ORDERBY_SEQUENCE, ASC)` (`ORDER BY po.seq` alone, not by section), and `$latestDate` the issue's `datePublished`; the issue's "Table of Contents" "Order" writes each article's publication `seq` from 1 within its section (`OrderCategoryGridItemsFeature`, `TocGridHandler::setDataElementInCategorySequence()`), scheduling leaves it 0, so articles never ordered tie and PostgreSQL returns the tie in the rows' order on disk, which later writes change; the issue's page (`Repo::submission()->getInSections()`, published and scheduled, the same sort, grouped by section) is a different query and can break the tie otherwise (Rule 5a); otherwise `$latestDate` is the first submission's `lastModified`, null for an empty list. RSS 2.0 channel `<pubDate>` is `{capture}{$latestDate|strtotime}{/capture}` then `DATE_RSS|date:$latestDate`: with nothing listed the capture is the empty string and PHP's `date()` throws `TypeError` (checked with the CLI: `date(DATE_RSS, "")` → "must be of type ?int, string given"); Atom's `<updated>` gets the current time from Carbon for null. Scheduled OJS articles carry `STATUS_SCHEDULED` and are left out. Publishing, unpublishing and publishing again move the submission's `lastModified` on OJS and leave it where it was on OMP and OPS (A8). Live-probed 2026-09-25 (Rules 3–6): notes td2–td5.

<a id="fn-g"></a>
**g** — `WebFeedGatewayPlugin::getIdentifiers()`: `section.section` ("Section" on OJS and OPS, "Series" on OMP) with the section's title, `category.category` "Categories", `common.keywords` "Keywords", `common.subjects` "Subjects", `search.discipline` "Disciplines", each with the current publication's localized values; the templates print `{label}: {values joined by ", "}<br />` per identifier and one more `<br />` before the abstract. No ISBN, publication format or DOI is read. Label `plugins.generic.webfeed.settings.includeIdentifiers`. Keywords, subjects and disciplines arrive as vocabulary entries, not words (A7). Live-probed 2026-09-25 (Rule 9): note td8.

<a id="fn-h"></a>
**h** — Site level: the plugin's `getEnabled()` falls back to the request's context id, 0 on the site's pages, and the site's own `sidebar` is read by `displaySidebar()` when there is no context. With no context, `fetch()` returns false and `GatewayHandler::plugin()` redirects to the site's `index`. `setupTemplateLinks()` adds nothing without a context. The Site Settings tabs show on a multi-journal site (*Site settings*). Live-probed 2026-09-26 (Actors row 6; Rule 18): note td16.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-25 (Actors row 1; Rule 1; the address table), all three apps: on a new scratch journal, press and preprint server made with no plugin setting, "Web Feed Plugin" was ticked under "Generic Plugins", listed after "TinyMCE Plugin", with "Settings" among its row's actions, and the three addresses answered 200 at once, signed out. Signed in as the context's Reader, the Atom and RSS 2.0 documents were identical to the signed-out ones.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-25 (Rules 2, 3, 4a), all three apps: every read gave the same titles in the same order in the three feeds. A submitted item, a scheduled one (OJS into an unpublished issue; OMP and OPS dated 2030-01-01) and another context's items were absent; "Unpublish" on the workflow screen removed an item at the next read, and the submitted one published on screen came first in the three feeds at the next read. With 31 published items and the number at 30, the item left out, unpublished and published again on screen, came first on OJS and stayed out on OMP and OPS, twice each (A8). The documents also carry parts no table lists: the generator and, in RSS 2.0, `guid`, `ttl` and `docs`.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-25 (Rule 4), all three apps: "Older" published with 2024-06-01 and then "Newer-dated" with 2024-01-01: "Newer-dated" came first in the three feeds; "Number of publications to display" set to 1 and "OK" left "Newer-dated" alone. With 31 published items at the default, each feed listed 30, the earliest-changed one left out.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-25, two runs (Rule 5), OJS: with "Display items in current published issue." chosen, a published issue of three articles in two sections, none ordered with "Order", gave the three in the order the issue's table of contents showed them, which Rule 5a leaves to chance; with "Number of publications to display" at 1, both articles of the issue were listed and the articles outside it were not. With no published issue, Atom and RSS 1.0 had no item and RSS 2.0 answered 500 (A1). The windows of a press and a preprint server offer no such choice. Test run 2026-09-26 (Rule 5a; scenario 5), OJS: once, the page of Vol. 1 No. 1 listed "Alpha", "Beta" and the three feeds "Beta", "Alpha"; with the two articles' rows swapped on disk between the page's read and the feeds' read, the feeds listed them in the other order in 4 runs of 4, and the either-order read passed 4 of 4. Live-probed 2026-09-29, two runs (Rule 5b), OJS, on a scratch journal with "Display items in current published issue." and the published, current issue Vol. 1 No. 1 (2025) holding articles A, B and C, and article D published with no issue: before any new version the Atom, RSS 2.0 and RSS 1.0 feeds listed A, B and C under their first titles and never D. As the Journal Manager, a retitled new version of A was published with "Don't Assign To An Issue" (the window read "…This will be published immediately without any issue association…") and one of B keeping "Assign To Current/Back Issue" and the issue; the three feeds then listed A and B under their new titles, linking to the same article pages, C under its first title, and still no D, as the issue's page did (after a reload too). The order of the three differed between the runs and, once, from the issue's page (Rule 5a).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-25, two runs per app, and again 2026-09-26 (Rule 6; A1), all three apps: on a new scratch context with nothing published, Atom and RSS 1.0 carried the context's parts and no item, and RSS 2.0 answered 500 with an empty body and an empty tab title. `publicknowledge` is not empty on a used test install: its feeds listed 18 (OJS), 28 (OMP) and 17 (OPS) items, the suites' published items.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-25 (Rule 7; the item table), all three apps, on an article with two contributors added on screen, "Bela Unlisted" with "Include this contributor when identifying authors in lists of publications." unticked (the box arrives ticked) and "Cara Listed" ticked: Atom and RSS 1.0 named every contributor, RSS 2.0 read "Ada Author (Author); Cara Listed (Author)". The link opened `article/view/{id}` (OJS), `catalog/book/{id}` (OMP) and `preprint/view/{id}` (OPS), headed by the title. A second version retitled but not published left the first title in the feeds; once published, the new title showed and the item's date moved from 2024-03-05 to the second version's publication date. With no abstract and "Include identifiers…" unticked the item had no summary. The summary carried the abstract as saved: a seeded plain abstract read as it was, one saved as `<p>…</p>` kept its tags, escaped, in the three feeds. Rights read "Copyright (c) {year} {journal name}", RSS 2.0 and RSS 1.0 adding the licence address when a licence was chosen before publishing, RSS 1.0 the pages (12–34, OJS) and the DOI once DOIs were on. Every keyword, subject and discipline read "Array" (A7).

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-25 (Rule 8; the channel table), all three apps, each text set on screen and the feeds read after each save: the title was the context's name, the link its home page; the description was empty on a new context, filled by the search indexing "Description" alone, and replaced by "Journal Summary" ("Press Summary", "Server Summary") once saved; Atom named the principal contact and address, RSS 2.0 added the technical support contact after the Contact tab's save; the language read "en"; the copyright parts appeared once "License Terms" was saved, with its tags (A6). RSS 1.0's publisher read OJS's "Publisher", OMP's "Press Publisher Name" and, on OPS, "Array" (OPS1); its ISSN was the online ISSN until a print ISSN was saved (OJS); the Masthead tabs of a press and a server have no ISSN field, and their feeds carry none.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-25 (Rule 9; A3), all three apps: ticked and "OK", each summary opened "Section: Articles" ("Series: K1 Series" on a press), "Categories: Cat One, Cat Two", "Keywords: Array, Array", "Subjects: Array" and "Disciplines: Array", then an empty line and the abstract; a book outside any series with no terms opened with the empty line (OMP). No ISBN line appeared with an ISBN-13 saved on the book's publication format. Unticked, the abstract alone.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-25 (Rule 10), all three apps: with the public pages switched to French, the box read "Dernières publications" with "Logo Atom", "Logo RSS2" and "Logo RSS1"; its Atom link opened `…/fr_CA/gateway/plugin/WebFeedGatewayPlugin/atom` with the French title and abstract and the labels "Rubrique" (OJS), "Séries" (OMP), "Série" (OPS), "Catégories", "Mots-clés", "Sujets" and "Discipline(s)"; RSS 2.0's language read "fr-CA". The French address typed directly gave the same. Parts with no French text fell back to English.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-25 (Actors rows 2–3; Rule 11), all three apps: ticked in "Sidebar" and saved, the box showed, signed out, on every public page visited (OJS: home, About, Archive, an issue, the current issue, article pages, Search, Login; OMP: home, About, Catalog, a book, Search, Login; OPS: home, About, a preprint, Search, Login), on a context with nothing published as well, and at every "Display web feed links…" choice. Pressing "Atom logo" and "RSS2 logo" showed the feed as text; "RSS1 logo" downloaded `rss.rdf`.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-25 (Rule 12), all three apps, each choice read after "OK": three `<link rel="alternate">` feed links (Atom, RSS 1.0, RSS 2.0) exactly on the pages of the table; a new context's own choice put them on the OJS home, Archive and issue pages, and on the OMP and OPS home page only.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-25 (Rule 13; Settings bullets 7, 8), all three apps: signed out, a restricted journal's feed landed on `…/login?source=…/gateway/plugin/WebFeedGatewayPlugin/atom`, and a journal not enabled publicly on `…/login` with no return address; signed in as the context's Reader, the three feeds showed the published item on both. The "Site Access Options" box read "…view the journal site.", "…view the press site." and "…view the server site.".

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-25 (Rules 14, 14a; Settings bullet 1), all three apps, with the box placed and "…on all application pages." chosen: disabling asked "Are you sure you want to disable this plugin?"; then the three addresses answered "404 Not Found", no page showed the box or a discovery link, "Sidebar" no longer offered "Web Feed Plugin", a manager's row had no arrow, and the Site Administrator's arrow opened "Delete" and "Upgrade" only. Enabled again: "Settings" back in the row, "Web Feed Plugin" ticked in "Sidebar", the box and the discovery links on every page, the feeds with their items, and the window with its earlier settings.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-26, two runs (Rule 15; A2), all three apps, signed out, as the journal's Reader and as the Site Administrator: `{journal address}/gateway`, `…/gateway/` and `…/gateway/index` answered 302 to the home page; `…/gateway/plugin/NoSuchPlugin/atom`, the gateway's name in lower case, `WebFeedBlockPlugin`, no plugin name, an unknown page after the gateway and, on a press and a server, the announcement gateway answered "404 Not Found" with an empty tab title; the unknown feed names of A2 answered 500 (note f-a2). Rule 15a, OJS: a new journal had "LOCKSS" and "CLOCKSS" unticked on Settings › Distribution › "Archiving", and `{journal address}/gateway/lockss` and `/gateway/clockss` then landed on the home page; ticked, they showed "LOCKSS Publisher Manifest" and "CLOCKSS Publisher Manifest". A press and a server answered "404 Not Found" at both addresses.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-25 (Actors row 5; the window; Rules 16, 17), all three apps: the window as described, with a new context's choices, 30 and the box unticked. "Cancel" after changes to a round button, the number and the box: the window reopened unchanged, no question asked. "×" after a change asked "The data on this form has changed. Do you wish to continue without saving?"; leaving the page raised the browser's leave question; nothing was saved. "abc", "0", "-3", a space and an empty box were refused as Rule 16b says, the other controls' changes unsaved; after a refusal, "OK" on the emptied box showed "This field is required." without reaching the server. "3abc" reopened as "3", "2.5" as "2" (also after a reload), "1000000" as "1000000", each stored as a whole number. OJS, "Display items in current published issue." chosen: an empty box and "abc" were saved and reopened as "0". The Site Administrator's "OK" saved the same way.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-25 (read) and 2026-09-26 (driven, two runs) (Actors row 6; Rule 18), all three apps, on test installs hosting many journals, as the Site Administrator: Administration › "Site Settings" › "Plugins" listed "Web Feed Plugin" unticked under "Generic Plugins", and a Journal Manager at the Administration address got the access-denied page. Ticked, it answered "The plugin "Web Feed Plugin" has been enabled.", and the site's "Sidebar" offered "Web Feed Plugin" beside "Language Toggle Block"; placed, the box showed on the site's home page, and each of its links, pressed as the Site Administrator and signed out, landed on the site's home page. The site's row offered "Delete" and "Upgrade" only, ticked or not. The site's home page carried no discovery links. `/index.php/index/gateway/plugin/WebFeedGatewayPlugin/atom` answered "404 Not Found" while the site's plugin was off; on, any feed name, `json` included, redirected to the site's home page, so the site shows no A2 failure. Both changes were undone. A site with one journal has no "Plugins" or "Appearance" tab, so that end was not reached.

<a id="fn-s"></a>
**s** — Seeding for the scenarios. Each scenario runs on its own scratch context from `POST scenarios/context` (`docs/process/scenarios.md`), with throwaway `users[]` (password: the username twice, `docs/process/users.md`): an `author` who submits every article (in scenario 1 `givenName` "Ada", `familyName` "Author"), a `manager` (the Journal Manager, Press Manager or Preprint Server Manager) in scenarios 2 to 7, a `reader` in scenario 8, and a signed-out visitor in a second browser context. Articles come from `POST scenarios/submission` by the `author`, published with `published: true` and `datePublished`; articles published one after another in the seed change in that order, which is the order the recent list follows (Rule 4; note td3). Categories come from the context's `categories[]` and the version's `categories` (paths; a press takes `categories` only); on OJS an issue from `issues[]` and the submission's `issue`, and a scheduled article from `published: true` into an issue seeded unpublished. Only scenario 3 passes `plugins`; everywhere else the plugin is as a new context has it (`docs/process/seed-facts.md`), and the box is never seeded (`sidebar`): scenario 3 places it on screen. Scenario 1: context `name` "Sea Letters"; "Tidal Patterns" (`abstract` "Tides follow the moon.", `datePublished` `2024-03-05`, published) and "Draft Study" (`submitted: true`, not published); on OJS `issues: [{volume: 1, number: 2, year: 2026}]` and "Future Tides" `published: true` with that `issue`; a second context with "Elsewhere" published. Scenario 2: "Tidal Patterns" (`datePublished` `2024-03-05`) and then "Coral Reefs", both published; the unpublish, the second publish and the new version are the screens' (no key makes a second version). Scenario 3: `plugins: {webfeedplugin: {enabled: true, settings: {recentItems: 5}}}` and no `sidebar`; "Tidal Patterns" published. Scenario 4: "Tidal Patterns" published, on OJS with `issue` into `issues: [{volume: 1, number: 1, year: 2024, published: true}]`. Scenario 5: `categories: [{path: 'cat-one', title: 'Cat One'}, {path: 'cat-two', title: 'Cat Two'}]`; "Alpha", "Beta" and "Gamma" seeded and published in that order with `datePublished` `2024-03-03`, `2024-03-02` and `2024-03-01`, "Gamma" with `abstract` "Currents turn at dusk." and `categories: ['cat-one', 'cat-two']`; on OJS the published issue Vol. 1 No. 1 (2024) as in scenario 4 and `issue` on "Alpha" and "Beta" only, "Gamma" published at once without one; the new context's own section ("Articles"; "Preprints" on a server) is the one the "Section:" line names, and a scratch press has no series. Scenario 6: nothing published. Scenario 7: context `name` "Quiet Waters", `acronym` "QW" and a Country (a scratch context has neither, and its "Masthead" tab refuses "Save" until both are filled, `docs/process/seed-facts.md`; no key sets a Country yet, `country` in `docs/process/scenarios.md`, so the suites pick one on that tab before its "Save"), `contactName` "Pat Contact" and `contactEmail` "pat.contact@example.org"; nothing published (`publicknowledge` collects the suites' published items on a used test install, so the empty reads never use it). Scenario 8: `restrictSiteAccess: true`, "Tidal Patterns" published, a `reader`; a second context without the key with "Open Study" published. The mail catcher is not read: nothing is emailed (Side effects). Live-probed 2026-09-25 and 2026-09-26: the recipe built these contexts on the three apps, and seeded plugin settings are stored with the types the window's "OK" stores. Test run 2026-09-26 (scenario 7), all three apps: on a scratch journal seeded with its initials alone, the "Masthead" tab kept "Save" grayed out, showing "Please correct one error." and "Go to Country: This field is required." with "Country" marked required; with "Canada" picked there first, the "Journal Summary" save went through and the suites passed.

<a id="fn-f-a1"></a>
**f-a1** — Note f: `rss2.tpl` channel `<pubDate>` with a null `$latestDate`. Introduced by pkp/webFeed `8d18563` "Use a valid date format in rss2 pubDate" (2026-06-27), which replaced `date_format:$smarty.const.DATE_RSS` (Carbon, which reads null as now) with `strtotime` then PHP `date()`. The item `<pubDate>` is safe, since a published item always has a date. Live-probed 2026-09-25, two runs per app, and again 2026-09-26 (Rule 6; A1): on a new scratch context with nothing published, and on OJS with "Display items in current published issue." and no published issue, the RSS 2.0 address answered 500 with an empty body and an empty tab title, the server logging "TypeError: date(): Argument #2 ($timestamp) must be of type ?int, string given" from `rss2.tpl`; the box's "RSS2 logo" leads to the same address. Written up for the team in `docs/reports/2026-09-26-webfeed-rss2-empty-feed-fails.md`.

<a id="fn-f-a2"></a>
**f-a2** — Note c: `fetch()` throws `Exception('Invalid feed format')` for a type outside `FEED_MIME_TYPE`, including none; an unknown plugin name throws `NotFoundHttpException` in the handler's constructor instead. Live-probed 2026-09-26, two runs per app, signed out, as the journal's Reader and as the Site Administrator (Rule 15; A2): `…/WebFeedGatewayPlugin/json`, `…/WebFeedGatewayPlugin`, `…/WebFeedGatewayPlugin/`, `…/ATOM`, `…/atom.xml` and `…/WebFeedGatewayPlugin?type=atom` answered 500 with an empty body and an empty tab title; `…/atom/extra` served the Atom feed.
Issue report: [docs/issues/U18-A2-unknown-feed-name-blank-page.md](../issues/U18-A2-unknown-feed-name-blank-page.md), filed as [pkp-e2e#537](https://github.com/jardakotesovec/pkp-e2e/issues/537).

<a id="fn-f-a3"></a>
**f-a3** — Note g. The label key is `plugins.generic.webfeed.settings.includeIdentifiers`; OMP keeps ISBNs on publication formats' identification codes, which `getIdentifiers()` never reads. Live-probed 2026-09-25 (A3), OMP: with an "ISBN-13 (15)" code, 9780306406157, saved on the book's publication format, the ticked summary carried no ISBN line; the label read the same on the three apps.
Issue report: [docs/issues/U18-A3-web-feed-identifiers-label-names-isbn.md](../issues/U18-A3-web-feed-identifiers-label-names-isbn.md), filed as [pkp-e2e#538](https://github.com/jardakotesovec/pkp-e2e/issues/538).

<a id="fn-f-a4"></a>
**f-a4** — Note e: the block has not read `displayPage` since at least `edd1785a0d` (2015-11-16, OJS tree); OJS's announcement feed block (`AnnouncementFeedBlockPlugin`) does read its own `displayPage`, as the Announcements spec's feed rule states. Live-probed 2026-09-25 (A4), all three apps: at "…homepage only." and "…issue pages only." the box still showed on the About, article, Search and Login pages, which carried no discovery link.

<a id="fn-f-a5"></a>
**f-a5** — Note d: `settings.xml` declares `displayItems` with `type="bool"` and value `issue` (since OJS `4f709fb952`, 2010-07-07, "Configure web feed plugin by default"); `DAO::convertToDB()` casts it to `1`, read back as `true`, so `fetch()`'s `$displayItems === 'issue'` is false and the feed takes the recent list. Live-probed 2026-09-25 (A5; Rule 17): new contexts on the three apps stored `displayItems` as `1` typed `bool`; the OJS window arrived on "Display a fixed number…", and a journal with 31 published articles whose window was never opened listed 30 in each feed, the earliest-changed one left out. The window's first "OK" rewrites `displayItems` as the text the chosen button sends (OJS "recent"; OMP and OPS, whose window has no such choice, an empty value), so a journal whose window was ever saved no longer carries the unreadable default; nothing on screen changes.

<a id="fn-f-a6"></a>
**f-a6** — Note c: the channel's copyright prints `licenseTerms`, and its description `description` or `searchDescription`, through `escape:"html"`, so the rich-text editor's `<p>` arrives as `&lt;p&gt;`. Atom declares its `<subtitle>` `type="html"`; RSS 2.0 `<copyright>` and RSS 1.0 `<prism:copyright>` are plain-text elements. Live-probed 2026-09-25 (A6), all three apps: after "License Terms" and "Journal Summary" were saved on screen, the copyright parts and the description read "<p>…</p>".

<a id="fn-f-a7"></a>
**f-a7** — Note g: `keywords`, `subjects` and `disciplines` became lists of vocabulary entries (a `name` with an optional `source` and `identifier`) in pkp/pkp-lib `90918476a2` "Controlled vocabulary support (#10833)" (2025-02-13); `getIdentifiers()` still passes them on as words, and the templates print each entry as "Array". Live-probed 2026-09-25 (A7), all three apps: seeded terms and, on OMP, terms typed on the "Metadata" page read "Array" as Atom `<category term>`, RSS 2.0 `<category>` and RSS 1.0 `<dc:subject>`, and in the ticked summary; read in French, "Mots-clés: Array". Written up for the team in `docs/reports/2026-09-26-webfeed-terms-read-array.md`.

<a id="fn-f-a8"></a>
**f-a8** — Note f: the recent list is ordered by the submission's `lastModified`, which publishing moves on OJS and not on OMP or OPS. Live-probed 2026-09-25, two runs per app (A8; Rule 4a): with 31 published items and the number at 30, the item left out ("Cap 01") was unpublished and published again on its workflow screen; at the next read it came first in the three feeds on OJS, and stayed out on OMP and OPS, its stored `lastModified` unchanged.
Issue report: [docs/issues/U18-A8-published-item-not-moved-up-feeds.md](../issues/U18-A8-published-item-not-moved-up-feeds.md), filed as [pkp-e2e#539](https://github.com/jardakotesovec/pkp-e2e/issues/539).

<a id="fn-f-ops1"></a>
**f-ops1** — Note c: pkp/webFeed `85a7d80` "pkp/pkp-lib#11795 fix publisher metadata for omp and ops" (2025-09-09) passes `$context->getData('name')`, the per-language array of the server's name, to `rss.tpl`, which prints it as "Array"; OJS's `publisherInstitution` and OMP's `publisher` are plain text. Live-probed 2026-09-25 (OPS1): on a new server, after its Masthead save and read in French alike, `<dc:publisher>` read "Array"; OJS showed its "Publisher", OMP its "Press Publisher Name". Written up for the team in `docs/reports/2026-09-26-webfeed-ops-publisher-array.md`.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The "Latest publications" box and its three links | the sidebar of the journal's public pages, once placed | AFFR-094 |
| The three feeds and the gateway address {OJS} (the LOCKSS and CLOCKSS pages are [Archiving & preservation](U67-archiving-preservation.md)'s) | {journal address}/gateway, …/gateway/plugin/WebFeedGatewayPlugin/{atom,rss2,rss} | ROUTE-037 |
| The three feeds and the gateway address {OMP} | the same addresses on a press | ROUTE-059 |
| The three feeds and the gateway address {OPS} | the same addresses on a preprint server | ROUTE-076 |
| "Web Feed Plugin": its row, its "Settings" window, its discovery links | Settings › Website › "Plugins" › "Installed Plugins" › "Generic Plugins" | PLUG-030 |

## Reference — code anchors

- Plugin (app-side copies, identical): `ojs|omp|ops/plugins/generic/webFeed/{WebFeedPlugin,WebFeedBlockPlugin,WebFeedGatewayPlugin,SettingsForm}.php` · `settings.xml` · `templates/{atom,rss2,rss,block,settingsForm}.tpl` · `locale/en/locale.po`
- Gateway: `ojs/pages/gateway/{index,GatewayHandler}.php` (with `lockss`, `clockss`) · `omp/pages/gateway/{index,GatewayHandler}.php` · `ops/pages/gateway/{index,GatewayHandler}.php` · `lib/pkp/classes/plugins/GatewayPlugin.php`
- Rendering: `lib/pkp/classes/template/PKPTemplateManager.php` (`displaySidebar()`, `addHeader()`, `getResourcesByContext()`, `smartyDateFormat()`, the `date` and `strtotime` modifiers) · `lib/pkp/classes/plugins/{BlockPlugin,PluginRegistry,PluginSettingsDAO}.php` · `lib/pkp/classes/db/DAO.php::convertToDB()`
- Access: `lib/pkp/classes/handler/PKPHandler.php::authorize()` · `lib/pkp/classes/security/authorization/RestrictedSiteAccessPolicy.php` · `lib/pkp/classes/core/PKPPageRouter.php::route()`
- Data: `lib/pkp/classes/submission/Collector.php` (`filterByStatus`, `ORDERBY_LAST_MODIFIED`, `ORDERBY_SEQUENCE`) · `lib/pkp/classes/publication/PKPPublication.php::getAuthorString()`
- Locale: `lib/pkp/locale/en/{common,manager,submission}.po` · `ojs|omp|ops/locale/en/locale.po` (`section.section`)
