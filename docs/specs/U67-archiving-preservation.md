---
name: archiving-preservation
status: verified
---

# Archiving & preservation {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal wants its published issues kept safe for the long term, even if
the journal itself goes offline. Preservation networks do this by
collecting copies of the journal's content and storing them at
participating libraries: LOCKSS, CLOCKSS and the PKP Preservation Network
(PN). The Journal Manager takes part from Settings › Distribution ›
"Archiving". Ticking "LOCKSS" or "CLOCKSS" there and saving opens a
public page for that network, its **publisher manifest**: a plain page at
a fixed address of the journal that lists the journal's issues year by
year and states that the network may collect, preserve and serve them.
The network's own software reads that page; readers never need it. The
PN side tab only explains how to join the PKP Preservation Network,
because the plugin that does the work is not part of the install.
<sup>a</sup>

OMP and OPS do not install archiving: a press's and a preprint server's
Settings › Distribution has no "Archiving" tab, and the LOCKSS and CLOCKSS
addresses of a press or a preprint server, and of the site itself, answer
"404 Not Found".
<sup>a</sup> <sup>m</sup>

## Actors & permissions

"Whoever opens the Settings pages" means the manager-level roles with
"Permit changes to Settings", as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them, and the Site Administrator working in the journal; every
other role has no "Settings" in the side menu and gets the access-denied
page at a Settings address. The manifest pages need no account; the
preservation network's software reads them signed in as nobody.
<sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Archiving" tab and its two side tabs** (Settings › Distribution; Rules 1, 2) | • whoever opens the Settings pages; nobody else <sup>b</sup> |
| **Tick or untick "LOCKSS" and "CLOCKSS" and save** (Rule 3) | • whoever opens the Settings pages; nobody else <sup>b</sup> <sup>e</sup> |
| **Turn the PKP Preservation Network on** (Rule 2) | • nobody on an install without the PN plugin: the side tab offers no control<br>• with the plugin installed and enabled, whoever opens the Settings pages, through the tab's box (Rule 2a) [A3](#a3) <sup>c</sup> <sup>d</sup> |
| **Read the journal's LOCKSS or CLOCKSS page** (Rules 5–12) | • any visitor, signed in or not, while the matching box is ticked and saved; unticked, the address lands everyone on the journal's home page, managers included (Rule 5)<br>• on a journal that requires sign-in to view the site, or that is not enabled publicly, a signed-out visitor is sent to the Login page instead; the journal's Reader, its Journal Manager and the Site Administrator, signed in, read the page (Rule 14) [A4](#a4) <sup>g</sup> <sup>k</sup> <sup>t9</sup> |
| **Read the site's LOCKSS or CLOCKSS list** (Rule 13) | • any visitor, signed in or not <sup>j</sup> <sup>t7</sup> |

## Fields & validation

**The "Archiving" tab** (side menu "Settings" › "Distribution", the page
headed "Distribution Settings", top tab "Archiving"). It holds two side
tabs, "PKP Preservation Network (PN)" and "LOCKSS and CLOCKSS", in that
order, and opens on the first: the boxes are reached by pressing "LOCKSS
and CLOCKSS". <sup>a</sup>

**"PKP Preservation Network (PN)"** carries no field: under the heading
"PKP Preservation Network (PN)" it reads "The PKP Preservation Network
(PN) provides free preservation services for any OJS journal that meets
a few basic criteria. To archive your journal in the PN, ask your
administrator to install the PKP|PN Plugin from the Plugin Gallery.", and
nothing on the tab can be pressed, not even "Save" (Rule 2). <sup>c</sup>
<sup>t1</sup>

**"LOCKSS and CLOCKSS"** holds two boxes, each under its own heading, and
"Save" below them. The form saves and reports as every Settings tab does
([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Rule 5): "Save" shows "Saved" beside the button. Nothing is refused:
either box may be ticked alone, both or neither. <sup>e</sup> <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "LOCKSS": "Enable LOCKSS to store and distribute journal content at participating libraries via a LOCKSS Publisher Manifest page." | no | Unticked on a new journal. "Publisher Manifest" is a link to the journal's LOCKSS page (Rule 4). Ticked and saved, the page opens (Rules 5, 6) <sup>e</sup> |
| "CLOCKSS": "Enable CLOCKSS to store and distribute journal content at participating libraries via a CLOCKSS Publisher Manifest page." | no | Unticked on a new journal. "Publisher Manifest" is a link to the journal's CLOCKSS page (Rule 4). Ticked and saved, the page opens (Rules 5, 12) <sup>e</sup> |

<a id="manifest-page"></a>
**The LOCKSS page** (`{journal address}/gateway/lockss`, where
`{journal address}` is the journal's home page address, such as
`https://example.org/index.php/journal`). It sits inside the journal's
public header and footer, and the browser tab reads "LOCKSS Publisher
Manifest" followed by the journal's name. The page shows no title of its
own: it opens on the year links, then the heading "Archive of Published
Issues: {year}". Its own words are English whatever the interface
language; some of the values in its table are not (Rule 11). From the
top: <sup>i</sup> <sup>t8</sup>

| Part | What it shows | When |
|------|---------------|------|
| Year links | "<< Previous" and "Next >>", separated by "\|"; each a link, or plain text, not a link, where there is no year to go to (Rule 8) | always <sup>i</sup> |
| "Archive of Published Issues: {year}" | the year shown (Rule 7), then a list of that year's issues, each by its name ([→ issue name](U50-issues.md#issue-name)) and linking to its issue page (Rule 9) | always <sup>i</sup> |
| "Front Matter" | "Front Matter associated with this Archival Unit includes:", then three links: "About the Journal", "Submission Guidelines" and "Contact Information", which open the journal's "About the Journal", "Submissions" and "Contact" pages ([Journal identity & about pages](U07-journal-identity-and-about-pages.md)) | always <sup>i</sup> |
| "Metadata" | "Metadata associated with this Archival Unit includes:", then a two-column table, rows below | always <sup>i</sup> |
| row "Journal URL" | the journal's home page address, as a link to it; on a journal with more than one interface language the address ends in the language the page is read in, such as `…/journal/en` or `…/journal/fr_CA` | always <sup>i</sup> <sup>t6</sup> |
| row "Title" | the journal's name | always <sup>i</sup> |
| row "Publisher" | the "Publisher" of Settings › Journal › "Masthead" | while it is set (Settings bullet 5) <sup>i</sup> |
| row "Description" | the "Description" of Settings › Distribution › "Search Indexing" | while it is set (Settings bullet 6) <sup>i</sup> |
| row "ISSN" | the "Online ISSN" of the Masthead; without one, the "Print ISSN" | while either is set (Settings bullet 5) <sup>i</sup> |
| row "Language(s)" | each of the journal's interface languages by name with its code in brackets, such as "English (en)", one per line; the names are in the language the page is read in (Rule 11) | always (Settings bullet 8) <sup>t6</sup> |
| row "Publisher Email" | the principal contact's "Email address" of Settings › Journal › "Contact", as a link that starts an email to it | always: the "Contact" tab refuses to save without that address (Settings bullet 10) <sup>t12</sup> |
| row "Copyright" | the journal's "License Terms" (Settings › Distribution › "License") ⚠ [A1](#a1) | while the journal has a "Copyright Notice" (Settings bullet 7) <sup>t10</sup> |
| row "Rights" | on a new journal, "This journal provides immediate open access to its content on the principle that making research freely available to the public supports a greater global exchange of knowledge.", a text no settings screen shows or changes ⚠ [A2](#a2) | while that text is not empty <sup>t11</sup> |
| Closing lines | the LOCKSS logo, a link to lockss.org, then "LOCKSS system has permission to collect, preserve, and serve this Archival Unit."; then the PKP logo, a link to pkp.sfu.ca, and "Open Journal Systems was developed by the Public Knowledge Project." | always <sup>i</sup> |

**The CLOCKSS page** (`{journal address}/gateway/clockss`) is the same
page with "CLOCKSS" for "LOCKSS" in the tab title and the year links, and
with the differences of Rule 12. <sup>i</sup>

## Rules & state

**The settings**

1. **Where it lives.** The "Archiving" top tab of Settings ›
   Distribution holds the two side tabs of the Fields section, in that
   order. It shows on every journal. <sup>a</sup>
2. **The PN side tab is information only.** The tab explains the PKP
   Preservation Network and asks the reader to have the "PKP|PN Plugin"
   installed from the Plugin Gallery, which [Plugins management](U62-plugins-management.md)
   describes. The plugin is not part of the install, so the tab offers
   nothing to press. <sup>c</sup> <sup>t1</sup>
   - 2a. **With the plugin installed and enabled** (never on the test
     installs), the tab instead reads "The PKP Preservation Network (PN)
     provides free preservation services for any OJS journal that meets
     a few basic criteria.", then "View the plugin settings to accept the
     terms of use for the PKP PN.", "plugin settings" opening the
     plugin's settings, then a ticked box "Enable the PKP PN plugin".
     Unticking the box disables the plugin at once, without "Save". An installed plugin that is disabled brings back the
     text of Rule 2, so the tab never offers to enable it ⚠ [A3](#a3).
     <sup>d</sup>
3. **Saving the LOCKSS and CLOCKSS tab.** "Save" stores both boxes
   together and shows "Saved". A tick that is not saved changes nothing
   and follows Rule 5 of [Journal identity & about
   pages](U07-journal-identity-and-about-pages.md) (kept while moving
   between tabs, gone without a warning once the page is left or
   reloaded). <sup>e</sup> <sup>f</sup>
4. **The "Publisher Manifest" links.** Each box's label carries a link to
   its network's page of this journal. The link is there ticked or not.
   Pressing it opens a new browser tab and leaves the Settings page as it
   was: the new tab shows the network's page once the box is saved
   ticked, and the journal's home page before that (Rule 5). <sup>e</sup>
   <sup>t2</sup>

**The manifest pages**

5. **Unticked, no page.** While "LOCKSS" is not saved ticked, the LOCKSS
   address lands on the journal's home page, with no message, for every
   visitor, signed in or not, a Journal Manager included; the same holds
   for "CLOCKSS" and its address. Unticking a saved box brings this back
   at the next visit. <sup>g</sup> <sup>n</sup>
6. **Ticked, the page.** Once the box is saved ticked, the address shows
   the page of the Fields section to every visitor who may read it
   (Actors row 4). No menu, block or public page of the journal links
   to it; only the Settings link of Rule 4 and the site's list of Rule
   13 do. <sup>g</sup> <sup>n</sup>
7. **Which year the page shows.** The page shows one year at a time. By
   default it is the newest year of the journal's published issues, the
   year the issue itself carries ([→ issue data](U50-issues.md#issue-data)),
   not the day it was published. Adding `?year={year}` to the address
   shows that year when the journal has a published issue of that year;
   a value that starts with such a year, such as `2015abc`, counts as
   that year, and any other value shows the default year. <sup>h</sup>
   <sup>t4</sup>
8. **Moving between years.** "Next >>" opens the next older year that
   has a published issue and "<< Previous" the next newer one. On the
   newest year "<< Previous" is plain text, not a link, and on the
   oldest year "Next >>" is. <sup>h</sup> <sup>t4</sup>
   - 8a. **Nothing published yet.** On a journal with no published issue
     the heading reads "Archive of Published Issues:" with no year, the
     list under it is empty, and both year links are plain text.
     <sup>h</sup> <sup>t5</sup>
9. **The issue list.** Under the heading the page lists the issues of
   the year shown, each by its name as the issue page names it
   ([→ issue name](U50-issues.md#issue-name)), each linking to that
   issue's page. <sup>h</sup> <sup>i</sup>
10. **The metadata table follows the settings.** Each conditional row of
    the table in the Fields section shows while its setting holds a value
    and is left out otherwise; a change to the setting shows at the
    page's next load. <sup>i</sup>
11. **English on purpose, values in the page's language.** The page's
    own words (headings, link labels, row labels, closing lines, the
    browser tab's "LOCKSS Publisher Manifest") are English in every
    interface language. The header's own words, its skip links and
    "Search" ("Rechercher" in French), follow the interface language, and
    so does the footer's one link, the OJS logo, which a screen reader
    reads in French as "À propos de ce système de publication, plateforme
    et processus par OJS/PKP.". The journal's menu items in the header
    follow their own language rule ([Navigation menus & site
    chrome](U08-navigation-menus-and-site-chrome.md), its Rule 12): on a
    journal with French ticked under "UI" alone they stay "Current",
    "Archives", "About", "Register" and "Login". The table's values
    follow the interface language too, as on any page. Read in French,
    for example: <sup>l</sup> <sup>t6</sup>
    - "Language(s)" names the languages in French, such as "anglais
      (en)" and "français (fr_CA)";
    - "Rights" shows the French text, "Cette revue fournit le libre
      accès immédiat…";
    - "Journal URL" ends in "/fr_CA".
12. **The CLOCKSS page differs in three places.** Its tab title reads
    "CLOCKSS Publisher Manifest", it shows no LOCKSS logo, and its closing
    line reads "CLOCKSS system has permission to ingest, preserve, and
    serve this Archival Unit.". Everything else, the year rules
    included, is the LOCKSS page's. <sup>i</sup>
13. **The site's list.** The site has its own LOCKSS address,
    `{site address}/gateway/lockss`, where `{site address}` is the
    site's home page address, such as `https://example.org/index.php/index`.
    It shows the heading "Archive of Published Issues" and one link per
    journal of the site that is enabled publicly and has "LOCKSS" saved
    ticked, by the journal's name, opening that journal's LOCKSS page;
    then the same closing lines. A journal that requires sign-in is
    listed too, and its link sends a signed-out visitor to its Login page
    (Rule 14) [A4](#a4). `{site address}/gateway/clockss` does the same
    for "CLOCKSS". <sup>j</sup> <sup>t7</sup>
14. **Closed journals.** On a journal that requires sign-in to view the
    site, or that is not enabled publicly, a signed-out visitor who opens
    the LOCKSS or CLOCKSS address lands on the Login page instead,
    ticked or not ⚠ [A4](#a4). [Roles
    configuration](U54-roles-configuration.md) and [Hosted
    journals](U59-hosted-journals.md) own the two settings (Settings
    bullets 3, 4). <sup>k</sup> <sup>t9</sup>

## Side effects

- **Nothing leaves the app.** Saving "LOCKSS" or "CLOCKSS" sends no email,
  raises no task or notification and writes no activity log entry; its
  effects are the manifest page (Rules 5, 6) and the journal's line on
  the site's list (Rule 13). <sup>f</sup>
- **Nothing is sent to a network.** Ticking a box does not register the
  journal with LOCKSS or CLOCKSS: the network finds the page only when
  its own software is pointed at the address. <sup>f</sup>

## Settings that modify behavior

1. **"LOCKSS"** (Settings › Distribution › "Archiving" › "LOCKSS and
   CLOCKSS"; unticked on a new journal). Unticked: the LOCKSS address
   lands on the home page (Rule 5) and the journal is left off the
   site's list. Ticked and saved: the LOCKSS page shows (Rules 6–11) and
   the site's list names the journal (Rule 13). <sup>e</sup> <sup>g</sup>
2. **"CLOCKSS"** (the same tab; unticked on a new journal). The same for
   the CLOCKSS address, page and list (Rules 5, 12, 13). <sup>e</sup>
   <sup>g</sup>
3. **"Users must be registered and log in to view the journal site."**
   (Settings › Users & Roles › "Site Access Options"; [Roles
   configuration](U54-roles-configuration.md); unticked on a new journal). Ticked: a signed-out
   visitor at either address lands on the Login page (Rule 14), and the
   site's list still names the journal (Rule 13) [A4](#a4). <sup>j</sup>
   <sup>k</sup>
4. **"Enable this journal to appear publicly on the site"** (Administration
   › "Hosted Journals", the journal's "Edit"; [Hosted
   journals](U59-hosted-journals.md); ticked on the test installs'
   journals). Unticked: a signed-out visitor at either address lands on
   the Login page (Rule 14), and the site's list leaves the journal out
   (Rule 13). <sup>j</sup> <sup>k</sup>
5. **"Publisher", "Online ISSN", "Print ISSN"** (Settings › Journal ›
   "Masthead"; [Journal identity & about pages](U07-journal-identity-and-about-pages.md); empty on a new journal).
   Set: the "Publisher" and "ISSN" rows show (Fields, the page's table);
   with both ISSNs set the row shows the online one. <sup>i</sup>
6. **"Description"** (Settings › Distribution › "Search Indexing";
   [Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md);
   empty on a new journal). Set: the "Description" row shows its text.
   <sup>i</sup>
7. **"Copyright Notice"** (Settings › Workflow › Submission › "Author
   Guidance"; [Submission intake
   configuration](U58-submission-intake-configuration.md); empty on a new
   journal). Set: the "Copyright" row shows, holding the "License Terms"
   of Settings › Distribution › "License" ([Publication
   metadata](U40-publication-metadata.md)), not the notice [A1](#a1).
   <sup>i</sup>
8. **The interface languages** (Settings › Website › "Setup" ›
   "Languages", the "UI" column; [Languages &
   locales](U57-languages-and-locales.md)). Each language with "UI"
   ticked is one line of the "Language(s)" row; with more than one, the
   "Journal URL" row ends in the language the page is read in. <sup>i</sup>
   <sup>t6</sup>
9. **The PN plugin** (not installed on a new install; [Plugins
   management](U62-plugins-management.md)). Installed and enabled, the PN side tab offers its box
   (Rule 2a). <sup>c</sup> <sup>d</sup>
10. **The principal contact's "Email address"** (Settings › Journal ›
    "Contact"; [Journal identity & about
    pages](U07-journal-identity-and-about-pages.md); required, and set on
    a new journal). The "Publisher Email" row shows it, and a saved change shows
    at the page's next load (Rule 10). <sup>i</sup> <sup>t12</sup>

## Cross-feature interactions

- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns who opens the Settings pages, how a Settings tab saves (its Rule
  5), the Masthead and Contact fields the table prints, and the three
  About pages the "Front Matter" links open.
- [Issues](U50-issues.md) owns an issue's name, year and page (Rules 7,
  9).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the header and footer the manifest pages sit in, and the language
  of the header's menu items (Rule 11).
- [Web feeds](U18-web-feeds.md) owns the journal's other gateway
  addresses (its Rule 15); this spec owns the LOCKSS and CLOCKSS ones.
- [Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md),
  [Submission intake configuration](U58-submission-intake-configuration.md),
  [Publication metadata](U40-publication-metadata.md) and [Languages &
  locales](U57-languages-and-locales.md) own the settings the table
  prints (Settings bullets 6–8).
- [Roles configuration](U54-roles-configuration.md) and [Hosted journals](U59-hosted-journals.md) own
  the two access settings of Rule 14.
- [Subscriptions & open access control](U51-subscriptions.md) owns the "Access" tab beside
  "Archiving" on Settings › Distribution.
- [Plugins management](U62-plugins-management.md) owns the Plugin Gallery and installing plugins
  (Rule 2).

## Canonical scenarios

Scenarios 1 to 3 run on scratch journals with throwaway accounts, since
each ticks or needs a box the seeded journal keeps unticked; scenario 4
reads the seeded press and preprint server with a ready account, and
a scratch journal. The accounts, their passwords and the tooling recipe
are in the footnote.
<sup>s</sup>

1. **"LOCKSS" and "CLOCKSS" turned on, then "LOCKSS" turned off**

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal "Tide Records" whose one interface language is
   English, whose principal contact's "Email address" is
   "tide.contact@example.org", with the published issue Vol. 1 No. 1
   (2020) and nothing ever saved on its "Archiving" tab.

   - **The "Archiving" tab**: Journal Manager: note the "Tasks" count in
     the header, open Settings › Distribution, the page headed
     "Distribution Settings", and press the
     top tab "Archiving": it opens on the side tab "PKP Preservation
     Network (PN)", which reads, under the heading "PKP Preservation
     Network (PN)", "The PKP Preservation Network (PN) provides free
     preservation services for any OJS journal that meets a few basic
     criteria. To archive your journal in the PN, ask your administrator
     to install the PKP|PN Plugin from the Plugin Gallery."; nothing on
     it can be pressed, not even "Save". Press the side tab "LOCKSS and
     CLOCKSS": under the heading "LOCKSS" sits the unticked box "Enable
     LOCKSS to store and distribute journal content at participating
     libraries via a LOCKSS Publisher Manifest page.", under "CLOCKSS"
     the unticked box with the same sentence naming CLOCKSS, and "Save"
     below them (Rules 1, 2; Fields, the "Archiving" tab).
   - **The addresses while unticked**: the visitor opens
     {journal address}/gateway/lockss, {journal address} being the
     address of the journal's home page: the journal's home page opens,
     with no message. {journal address}/gateway/clockss does the same
     (Rule 5; Settings bullets 1, 2).
   - **"Publisher Manifest" before the save**: Journal Manager: press
     "Publisher Manifest" in the "LOCKSS" box's sentence: a new browser
     tab opens on the journal's home page, and the Settings page stays as
     it was. Close the new tab, tick "LOCKSS" without pressing "Save" and
     press "Publisher Manifest" again: the new tab again shows the
     journal's home page (Rules 3, 4, 5).
   - **"LOCKSS" saved**: close the new tab and press "Save": "Saved"
     shows beside the button. Press "Publisher Manifest" in the "LOCKSS"
     box's sentence: the new tab shows the journal's LOCKSS page (Rules
     3, 4).
   - **The LOCKSS page**: the visitor opens
     {journal address}/gateway/lockss: the browser tab reads "LOCKSS
     Publisher Manifest" followed by "Tide Records", the page sits inside
     the journal's header and footer, and it has no title of its own. It
     opens on the year links "<< Previous" and "Next >>", separated by
     "|", both plain text, not links, since the journal published in
     one year only; then comes the heading "Archive of Published Issues:
     2020" over one issue, "Vol. 1 No. 1 (2020)", a link that opens that
     issue's page (Rules 6–9; Fields, the LOCKSS page).
   - **"Front Matter" and "Metadata"**: under "Front Matter" the page
     reads "Front Matter associated with this Archival Unit includes:",
     then the links "About the Journal", "Submission Guidelines" and
     "Contact Information"; "Submission Guidelines" opens the journal's
     "Submissions" page. Under "Metadata" it reads "Metadata associated
     with this Archival Unit includes:", then a table of five rows, in
     this order: "Journal URL", the journal's home page address, as a
     link to it; "Title", "Tide Records"; "Language(s)", "English (en)";
     "Publisher Email", "tide.contact@example.org", as a link; and
     "Rights", "This journal provides immediate open access to its
     content on the principle that making research freely available to
     the public supports a greater global exchange of knowledge."
     [A2](#a2). There is no "Publisher", "Description", "ISSN" or
     "Copyright" row (Rule 10; Fields, the page's table; Settings bullets
     5–7).
   - **The closing lines**: below the table come the LOCKSS logo, a link
     to lockss.org, and "LOCKSS system has permission to collect,
     preserve, and serve this Archival Unit."; then the PKP logo, a link
     to pkp.sfu.ca, and "Open Journal Systems was developed by the Public
     Knowledge Project." (Fields, the page's table).
   - **The site's lists**: the visitor opens {site address}/gateway/lockss,
     {site address} being the address of the site's home page: under the
     heading "Archive of Published Issues" the list holds the link "Tide
     Records", which opens the journal's LOCKSS page. The list at
     {site address}/gateway/clockss does not hold "Tide Records" (Rule
     13; Settings bullet 1).
   - **"CLOCKSS" still unticked**: the visitor's
     {journal address}/gateway/clockss still opens the journal's home
     page (Rule 5).
   - **"CLOCKSS" saved too**: Journal Manager: tick "CLOCKSS" and press
     "Save": "Saved" shows beside the button (Rule 3).
   - **The CLOCKSS page**: the visitor opens
     {journal address}/gateway/clockss: the browser tab reads "CLOCKSS
     Publisher Manifest" followed by "Tide Records"; the year links, the
     heading, the issue, "Front Matter" and the table read as on the
     LOCKSS page; there is no LOCKSS logo, and the closing line reads
     "CLOCKSS system has permission to ingest, preserve, and serve this
     Archival Unit.", followed by the PKP logo and its line. The list at
     {site address}/gateway/clockss now holds "Tide Records" (Rules 12,
     13; Settings bullet 2).
   - **Nothing sent**: no email arrived in the mail catcher from the two
     saves, and the Journal Manager's "Tasks" count is the one noted at
     the start (Side effects).
   - **"LOCKSS" unticked again**: Journal Manager: untick "LOCKSS" and
     press "Save": "Saved" shows beside the button. The visitor opens
     {journal address}/gateway/lockss: the journal's home page opens
     again, with no message; the list at {site address}/gateway/lockss
     no longer holds "Tide Records" (Rules 5, 13; Settings bullet 1).
   - **Control**: {journal address}/gateway/clockss still shows the
     CLOCKSS page (Rule 5; Fields, "LOCKSS and CLOCKSS"). <sup>s</sup>

2. **A journal with issues in several years and two languages**

   Given: a visitor, signed out, on a scratch journal "Coastal Years"
   with "LOCKSS" saved ticked, English and French (Canada) as its
   interface languages, "Coastal House" as "Publisher", "0378-5955" as
   "Online ISSN" and "2049-3630" as "Print ISSN" on its "Masthead" tab,
   and the issues Vol. 1 No. 1 (2011), Vol. 2 No. 1 (2014), Vol. 3 No. 1
   (2015), Vol. 4 No. 1 (2016) and Vol. 4 No. 2 (2016), all published
   today; and on a second scratch journal, "Empty Shelf", with "LOCKSS"
   saved ticked and no published issue.

   - **The newest year**: open {journal address}/gateway/lockss,
     {journal address} being the address of "Coastal Years"'s home page:
     the heading reads "Archive of Published Issues: 2016", the year the
     issues carry, not the year they were published, over "Vol. 4 No. 1
     (2016)" and "Vol. 4 No. 2 (2016)" and no other issue; "<< Previous"
     is plain text, not a link, and "Next >>" is a link (Rules 7–9).
   - **"Next >>" to the oldest year**: press "Next >>": the heading reads
     "Archive of Published Issues: 2015", over "Vol. 3 No. 1 (2015)".
     Press it again: "Archive of Published Issues: 2014", over "Vol. 2
     No. 1 (2014)". Press it again: "Archive of Published Issues: 2011",
     over "Vol. 1 No. 1 (2011)", where "Next >>" is plain text and "<<
     Previous" a link (Rule 8).
   - **"<< Previous" back**: press "<< Previous": the heading reads
     "Archive of Published Issues: 2014"; press it again: "Archive of
     Published Issues: 2015" (Rule 8).
   - **A year in the address**: open {journal address}/gateway/lockss?year=2015:
     the heading reads "Archive of Published Issues: 2015". Open the
     same address with "?year=2013", a year with no published issue: it
     reads "Archive of Published Issues: 2016". Open it with
     "?year=2015abc": it reads "Archive of Published Issues: 2015" (Rule
     7).
   - **The optional rows**: the "Metadata" table holds the row
     "Publisher", reading "Coastal House", and the row "ISSN", reading
     "0378-5955", the online ISSN (Fields, the page's table; Settings
     bullet 5).
   - **Two languages**: the row "Language(s)" holds two lines, "English
     (en)" and the name of French followed by "(fr_CA)", and "Journal
     URL" ends in "/en" (Fields, the page's table; Settings bullet 8).
   - **Read in French**: open {journal address}/fr_CA/gateway/lockss: the
     headings, row labels, link labels, closing lines and the browser
     tab's "LOCKSS Publisher Manifest" stay English, while the header's
     search link reads "Rechercher", with no "Search", and the OJS logo in
     the footer, a link, is read by a screen reader as "À propos de ce
     système de publication, plateforme et processus par OJS/PKP.";
     "Language(s)" reads "anglais (en)"
     and "français (fr_CA)", "Rights" reads "Cette revue fournit le libre
     accès immédiat…", and "Journal URL" ends in "/fr_CA" (Rule 11).
   - **Nothing published**: open "Empty Shelf"'s
     {journal address}/gateway/lockss: the heading reads "Archive of
     Published Issues:" with no year, the list under it is empty, and
     "<< Previous" and "Next >>" are both plain text (Rule 8a).
   - **Control**: "Empty Shelf"'s "Metadata" table has no "Publisher" row
     and no "ISSN" row (Rule 10; Settings bullet 5). <sup>s</sup>

3. **Journals closed to signed-out visitors**

   Given: a visitor, signed out, and throwaway accounts, on three scratch
   journals, each with "LOCKSS" and "CLOCKSS" saved ticked and the
   published issue Vol. 1 No. 1 (2020): "Closed Shore", where "Users must
   be registered and log in to view the journal site." is ticked, with a
   Reader; "Hidden Bay", where "Enable this journal to appear publicly on
   the site" is unticked, with a Journal Manager; and "Open Coast", open
   to everyone.

   - **Sign-in required, signed out**: the visitor opens "Closed
     Shore"'s {journal address}/gateway/lockss, {journal address} being
     the address of the journal's home page: the journal's Login page
     opens instead. {journal address}/gateway/clockss does the same
     (Rule 14; Settings bullet 3) [A4](#a4).
   - **The Reader of "Closed Shore"**: Reader: sign in to "Closed Shore"
     and open the same two addresses: the LOCKSS page and the CLOCKSS
     page show, each headed "Archive of Published Issues: 2020" (Actors
     row 4).
   - **The site's list and "Closed Shore"**: the visitor opens
     {site address}/gateway/lockss, {site address} being the address of
     the site's home page: the list holds "Closed Shore", and its link
     leads to that journal's Login page (Rule 13; Settings bullet 3)
     [A4](#a4).
   - **Not enabled publicly, signed out**: the visitor opens "Hidden
     Bay"'s {journal address}/gateway/lockss and
     {journal address}/gateway/clockss: each opens the journal's Login
     page instead. Neither the list at {site address}/gateway/lockss nor
     the one at {site address}/gateway/clockss holds "Hidden Bay" (Rules
     13, 14; Settings bullet 4).
   - **The Journal Manager of "Hidden Bay"**: Journal Manager: sign in to
     "Hidden Bay" and open the same two addresses: the LOCKSS page and
     the CLOCKSS page show, each headed "Archive of Published Issues:
     2020" (Actors row 4).
   - **Control**: the visitor, signed out, opens "Open Coast"'s
     {journal address}/gateway/lockss: the LOCKSS page shows, headed
     "Archive of Published Issues: 2020", and the list at
     {site address}/gateway/lockss holds "Open Coast" (Rules 6, 13).
     <sup>s</sup>

4. **No archiving on a press or a preprint server** {OMP OPS}

   Given: Press Manager (Preprint Server Manager) on the seeded press or
   preprint server, a visitor, signed out, in a second browser, and a
   Journal Manager on an OJS scratch journal.

   - **Settings › Distribution**: Press Manager: open Settings ›
     Distribution: none of its top tabs is "Archiving" (the absence
     paragraph).
   - **The press's addresses**: the visitor opens
     {press address}/gateway/lockss, {press address} being the address
     of the press's or preprint server's home page: the page answers "404
     Not Found". {press address}/gateway/clockss does the same (the
     absence paragraph).
   - **The site's addresses**: the visitor opens
     {site address}/gateway/lockss and {site address}/gateway/clockss,
     {site address} being the address of the site's home page: each
     answers "404 Not Found" (the absence paragraph).
   - **Control**: the Journal Manager's Settings › Distribution holds
     the top tab "Archiving", {journal address}/gateway/lockss opens the
     journal's home page, and the OJS install's
     {site address}/gateway/lockss shows the heading "Archive of
     Published Issues" (Rules 1, 5, 13). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a journal with License Terms and no Copyright Notice showing the
    "Copyright" row with the License Terms on the LOCKSS and CLOCKSS
    pages ([A1](#a1)): the guard the issue report proposes
  - a journal's LOCKSS and CLOCKSS pages with no "Rights" row, on an
    open access journal and on one that requires subscriptions
    ([A2](#a2)): the guard the issue report proposes
  - the PN plugin installed, disabled and then enabled, the side tab
    offering the "Enable the PKP PN plugin" box unticked and then
    ticked ([A3](#a3)): the guard the issue report proposes, once a
    test install can carry the plugin
- **Nothing new to test**:
  - "Description" set on Settings › Distribution › "Search Indexing",
    its text in the "Description" row (Settings bullet 6; Rule 10)
  - the principal contact's "Email address" changed and saved on
    Settings › Journal › "Contact", the "Publisher Email" row following
    at the page's next load (Settings bullet 10; Rule 10)
  - the Site Administrator working in the journal (Actors rows 1, 2):
    the same "Archiving" tab, boxes and "Save" as scenario 1's Journal
    Manager
- **Register carries it**:
  - A1 (a "Copyright Notice" set, the "Copyright" row holding the
    "License Terms"; Settings bullet 7)
  - A2 (a subscription journal's "Rights" row still reading the open
    access text; Fields, row "Rights"; scenario 1 reads the row)
  - A3 (the PN plugin installed, disabled or enabled, the side tab asking
    for it to be installed; Rule 2a)
- **No seed**:
  - the PN plugin installed and enabled, the side tab offering "Enable
    the PKP PN plugin" (Rule 2a; Settings bullet 9)
- **Owned by another feature**:
  - the roles without "Settings" in the side menu, refused at Settings ›
    Distribution (Actors preamble and row 1; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - a tick not saved, kept while moving between tabs and gone on leaving
    or reloading the page (Rule 3; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, its Rule 5)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | LOCKSS and CLOCKSS pages show the "Copyright" row only when an unrelated Copyright Notice is set | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A2](#a2) | LOCKSS and CLOCKSS pages of a subscription journal say it provides immediate open access | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A3](#a3) | Archiving settings tell managers to install the PKP|PN plugin when it is already installed | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A4](#a4) | On a journal that requires sign-in, the manifest pages send the preservation network to the Login page | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — LOCKSS and CLOCKSS pages show the "Copyright" row only when an unrelated Copyright Notice is set** · 🐞 · low.
On a journal with LOCKSS or CLOCKSS switched on, the journal's LOCKSS
and CLOCKSS pages have a "Copyright" row that prints the journal's
License Terms (Settings › Distribution › "License"). The row appears
only while a "Copyright Notice" is saved on Settings › Workflow ›
Submission › "Author Guidance", a separate text that submitting authors
agree to.
So a journal with License Terms and no Copyright Notice gets no
"Copyright" row on either page. A journal with a Copyright Notice and no
License Terms gets a "Copyright" row with nothing in it. The Copyright
Notice's own text appears on neither page.
Preservation goes on either way. The archiving software both networks
use crawls from the page's links to the issues and reads nothing in its
table, and LOCKSS accepts the journal by the permission sentence at the
foot of the page, which is always there.
The same fault: [Submission intake configuration](U58-submission-intake-configuration.md#ojs1).
Since: 2019-01-16, a date read from the code's history · Basis: probe, 2026-10-04. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — LOCKSS and CLOCKSS pages of a subscription journal say it provides immediate open access** · 🐞 · low.
On a journal with LOCKSS or CLOCKSS switched on, the journal's LOCKSS
and CLOCKSS pages, public addresses anyone can open, end their
"Metadata" table with a "Rights" row: "This journal provides immediate
open access to its content on the principle that making research freely
available to the public supports a greater global exchange of
knowledge." Every new journal receives this text. No settings screen
shows it or lets anyone edit it; ticking a language for forms, or "Reload
defaults", only writes the default back.
So a journal that requires subscriptions still tells the preservation
networks it provides immediate open access. The Masthead screen tells
journals to put their access policy in "About the Journal", but the row
never shows that text.
Preservation goes on either way: the networks' software reads nothing
in the table. The proposed fix removes the row.
Since: 2016-05-12, a date read from the code's history · Basis: probe, 2026-10-04. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Archiving settings tell managers to install the PKP|PN plugin when it is already installed** · 🐞 · medium.
A site administrator installs the PKP|PN plugin, and the Journal Manager
opens Settings › Distribution › "Archiving" › "PKP Preservation Network
(PN)". The tab still says "To archive your journal in the PN, ask your
administrator to install the PKP|PN Plugin from the Plugin Gallery." It
shows no "Enable the PKP PN plugin" box, whether the plugin is enabled in
the journal or not.
So the tab never offers what it was built for: the switch for the plugin
and the link to accept the network's terms of use.
Both states fail with every release of the plugin that the Plugin
Gallery offers for OJS 3.4 and 3.5. With the 3.3 release, only the
disabled plugin reads as not installed.
Since: 2019-12-11, a date read from the code's history · Basis: probe, 2026-10-04. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — A journal that requires sign-in cannot be archived** · ❓ · minor.
A manager of a journal with "Users must be registered and log in to view
the journal site." ticked who ticks "LOCKSS" expects the network to
collect the journal. The network's software is signed out, so the
address sends it to the Login page like any signed-out visitor. The
site's LOCKSS and CLOCKSS lists still name the journal, and their link
leads the network to the same Login page. Nothing on the "Archiving" tab
says so.
Question: should the manifest pages stay open to the network on a journal that requires sign-in, or should the tab warn that such a journal cannot be collected? No screen settles this; it is a product ruling.
Lean: ✅ as built, plus a warning on the tab, a judgment no screen settles: a sign-in-only journal has chosen to show nothing to signed-out visitors,
and its issue pages, which the manifest links to, send a signed-out visitor to the Login page too.
Basis: probe, 2026-09-28. <sup>[f-a4](#fn-a4)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-28 on ojs `9d9f116f38` (lib/pkp `fab29cfeca`, ui-library `19802b78`), omp `480045c32`, ops `5da5bc48ad`.

<a id="fn-a"></a>
**a** — `APP\pages\management\SettingsHandler::distribution()` (OJS) registers a `Template::Settings::distribution` hook that appends `templates/management/additionalDistributionTabs.tpl` to lib/pkp's `templates/management/distribution.tpl`: top tabs `access` (`manager.distribution.access` "Access", `AccessForm`, owned by the subscriptions spec) and `archive` (`manager.website.archiving` "Archiving"), the latter a side-tab set `pln` (`manager.setup.plnPluginArchiving` "PKP Preservation Network (PN)", component `archivePn`) and `lockss` (`manager.setup.otherLockss` "LOCKSS and CLOCKSS", `ArchivingLockssForm::FORM_ARCHIVING_LOCKSS`), then `{call_hook name="Template::Settings::distribution::archiving"}`, which no plugin of the three installs uses. Page heading `manager.distribution.title` "Distribution Settings". OMP's `SettingsHandler` adds no distribution hook and OMP has no `templates/management/distribution.tpl` override; OPS's `templates/management/distribution.tpl` has `license`, `dois`, `indexing`, `access`, `statistics` and no archiving tab. Gateway: OJS `pages/gateway/index.php` routes `index`, `lockss`, `clockss`, `plugin`; OMP's routes `index`, `plugin` only (so `lockss` gets no handler: `PKPPageRouter::route()` throws `NotFoundHttpException`); OPS's `index.php` lists `lockss` and `clockss` but its `GatewayHandler` has no such methods, so the same 404 (see the dead-code note in UNASSIGNED). Live-probed 2026-09-28 (Purpose; the absence paragraph; Fields, the "Archiving" tab; Rule 1): on the seeded journal and on every scratch journal, Settings › Distribution, headed "Distribution Settings", showed the top tabs "License, DOIs, Search Indexing, Payments, Statistics, Access, Archiving"; "Archiving" opened on "PKP Preservation Network (PN)", also from an address ending `#archive`, with "LOCKSS and CLOCKSS" second, for each of the four roles that reach it. On the seeded and a scratch press the tabs read "License, DOIs, Search Indexing, Payments, Statistics", on the seeded and a scratch preprint server "License, DOIs, Search Indexing, Access, Statistics", and `#archive` opened "License"; the press's and server's `gateway/lockss` and `gateway/clockss`, and the site's `index.php/index/gateway/lockss` and `…/clockss`, answered "404 Not Found" signed out, as `manager.maya` and as `reader.rosa`. With both boxes ticked, no public page of the journal or of the site linked to either address (note g).

<a id="fn-b"></a>
**b** — `SettingsHandler` (OJS) grants `settings` (the `distribution` op) to `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER`; lib/pkp `ManagementHandler::authorize()` adds the "Permit changes to Settings" check the settings-access anchor describes. The form posts `PUT {journal}/api/v1/contexts/{id}` (`getContextApiUrl()`), the context API's edit, which the same roles pass. Live-probed 2026-09-28 (Actors): on a scratch journal the Journal Manager, the Editor, the Production Editor and the Site Administrator (enrolled through the test API) had "Settings" › "Journal, Website, Workflow, Distribution, Users & Roles" in the side menu, opened both side tabs, and each saved "LOCKSS" ticked, then unticked ("Saved", kept after a reload); a manager-level role without "Permit changes to Settings", the Section Editor, the Copyeditor, the Author, the Reviewer and the Reader had no "Settings" and got "The current role does not have access to this operation." at `…/management/settings/distribution`; signed out, that address showed the Login page. The manifest pages opened signed out (note g).

<a id="fn-c"></a>
**c** — `SettingsHandler::distribution()`: `PluginRegistry::getPlugin('generic', 'plnplugin')` is null on a stock install (no `plugins/generic/pln` in the ojs tree or its submodules), so `archivePn` is a `FormComponent('archivePn', 'PUT', 'dummy', …)` whose one page has `'submitButton' => null` and whose one field is a `FieldHTML` `pn` with label `manager.setup.plnPluginArchiving` and description `manager.setup.plnPluginNotInstalled` ("The PKP Preservation Network (PN) provides free preservation services for any OJS journal that meets a few basic criteria. To archive your journal in the PN, ask your administrator to install the PKP|PN Plugin from the Plugin Gallery."). ui-library `FormPage.vue`'s footer (`hasFooter`) renders only with a submit, previous or cancel button, so no "Save"; `FieldHtml.vue` prints the label as the heading and the description as HTML. Live-probed 2026-09-28 (Fields, the PN side tab; Rule 2; Actors row 3): for the Journal Manager, the Editor, the Production Editor and the Site Administrator the panel read the text above under its heading, with no button, link, box or "Save"; "Plugin Gallery" is plain text. The form holds a hidden submit input that cannot be pressed.

<a id="fn-d"></a>
**d** — With the plugin registered: `APP\components\forms\FieldArchivingPn` (component `field-archiving-pn`, ui-library `Form/fields/FieldArchivingPn.vue`) with label "PKP Preservation Network (PN)", description `manager.setup.plnDescription`, terms `manager.setup.plnSettingsDescription` ("View the <button>plugin settings</button> to accept the terms of use for the PKP PN.", shown while ticked), one option `manager.setup.plnPluginEnable` "Enable the PKP PN plugin", `value => (bool) $plnPlugin` (always true when the branch runs). Changing the box posts to `grid.settings.plugins.SettingsPluginGridHandler` `enable` / `disable` at once, with `common.pluginEnabled` / `common.pluginDisabled` as the messages; the button opens the plugin's `manage?verb=settings`. `PluginRegistry::getPlugin()` returns only registered plugins, and `Dispatcher` loads generic plugins with `PluginRegistry::loadCategory('generic', true)` (enabled only), so an installed but disabled plugin falls to the `FieldHTML` branch (A3). No screen of the test installs reaches this branch: none carries the PN plugin, and the Plugin Gallery cannot install one there (its list fails with a server error, a known Plugins management finding).

<a id="fn-e"></a>
**e** — `APP\components\forms\context\ArchivingLockssForm` (id `archivingLockss`, method PUT): `FieldOptions` `enableLockss` (label `manager.setup.lockssTitle` "LOCKSS", one option `manager.setup.lockssEnable` with `{$lockssUrl}` = `gateway/lockss` of the journal) and `enableClockss` (`manager.setup.clockssTitle` "CLOCKSS", `manager.setup.clockssEnable`, `gateway/clockss`); both values `(bool) $context->getData(...)`. The option labels are HTML (`<a href="{$lockssUrl}" target="_blank">Publisher Manifest</a>`) rendered through `v-strip-unsafe-html` in `FieldOptions.vue`. Schema: lib/pkp `schemas/context.json` `enableLockss`, `enableClockss` boolean, nullable, no default (a new journal has no row: unticked). The field descriptions (`manager.setup.lockssLicenseDescription`, `…clockss…`) were removed on main by ojs `d8a46d1bcd` (2026-03-18, pkp/pkp-lib#6682); stable-3_5_0 still shows them. Live-probed 2026-09-28 (Fields, the LOCKSS and CLOCKSS tab; Rules 3, 4): the boxes' accessible names are the two sentences, both unticked on a new journal and on the seeded journal; one "Save" posted both values together (`POST {journal}/api/v1/contexts/{id}`, `X-Http-Method-Override: PUT`, `enableLockss=true&enableClockss=false` and each other pair, 200) and showed "Saved" beside the button with no page notice, for LOCKSS alone, CLOCKSS alone, both, neither and an unchanged save; a reload showed what was saved. Each "Publisher Manifest" link (`target="_blank"`) opened a new browser tab and the Settings page stayed as it was. An unsaved tick survived switching to the PN side tab and to "Access" and back, and was gone after leaving the page or reloading, with no dialog either time.

<a id="fn-f"></a>
**f** — The save is the context API's `edit` (lib/pkp `PKPContextController::edit()` → `Repo`/`PKPContextService::edit()`): no mailable, notification or submission log entry is involved, and nothing calls out to LOCKSS or CLOCKSS. Besides `GatewayHandler` and its templates, no code of OJS or lib/pkp reads `enableLockss` / `enableClockss`. Live-probed 2026-09-28 (Side effects): across ticks, unticks, both and neither, twice, the mail catcher received nothing, the header's "Tasks" count and list stayed as seeded, and the published article's "Activity Log & Notes" listed only the seed's entries; the browser made no request to any host but the install. The site's lists gained and lost the journal with its box (note j). Whether the server itself contacts a network rests on the code facts above.

<a id="fn-g"></a>
**g** — `APP\pages\gateway\GatewayHandler::lockss()` / `clockss()` (OJS): with a context whose `enableLockss` (`enableClockss`) is falsy, `$request->redirect(null, 'index')`, the journal's home page, before any role check beyond the handler's own (none). No template of OJS or lib/pkp links to `gateway/lockss` or `gateway/clockss` except `templates/gateway/{lockss,clockss}.tpl` themselves and the form labels of note e. Live-probed 2026-09-28 (Rules 5, 6; Actors row 4): unticked, both addresses answered 302 to `{journal}/index` with no notice, signed out and as a Reader, an Author, a Reviewer, a Section Editor, the Journal Manager, the Site Administrator and an account with no role in the journal, on scratch journals and on the seeded one; unticking a saved box brought the redirect back at the next visit. Saved ticked, every one of them read both pages. Signed out, no link to either address on the journal's home, About, Submissions, Contact, Editorial Masthead, privacy, archive, current issue, issue, article, search, information, sitemap, Login or Register pages, nor on the site's home page; as the Journal Manager, none on the dashboard, the five Settings pages, Issues or Statistics but the two "Publisher Manifest" links. The site's lists link to the journal pages (note j).

<a id="fn-h"></a>
**h** — `GatewayHandler::lockss()` / `clockss()`: `Repo::issue()->getYearsIssuesPublished()` (`APP\issue\DAO::getYearsIssuesPublished()`: `i.year` of published issues, grouped, `ORDER BY i.year DESC`); `year` request value used only when it is in that list, else `max()`; `$prevYear = get($key - 1)` (the newer year, the list being descending), `$nextYear = get($key + 1)`; with no published issue `$year` is null and neither link is set. The list comes from `GatewayHandler::getPublishedIssuesByNumber($contextId, null, null, $year)` (collector `filterByContextIds()`, `filterByYears()` when `$year` is set). `clockss()` assigns `issues` twice when no year is given, with the same result. `showInfo` is assigned and no template reads it. Live-probed 2026-09-28: notes t4 and t5. The `year` value is read through `(int)` before the list is checked, so `2015abc`, `2015.9` and ` 2015` read as 2015.

<a id="fn-i"></a>
**i** — `templates/gateway/lockss.tpl` / `clockss.tpl` (OJS), not localized by design (their header comment): `pageTitleTranslated` "LOCKSS Publisher Manifest" / "CLOCKSS Publisher Manifest" through `frontend/components/header.tpl`; the year links (`&lt;&lt; Previous` / `Next &gt;&gt;`, `span.disabled` when null); `<h3>Archive of Published Issues: {$year}</h3>`; issues by `Issue::getIssueIdentification()` linking `issue/view/{getBestIssueId()}`; "Front Matter" links `about`, `about/submissions`, `about/contact`; "Metadata" table rows: "Journal URL", "Title" (`getLocalizedName()`), "Publisher" if `publisherInstitution`, "Description" if `searchDescription`, "ISSN" `onlineIssn` else `printIssn`, "Language(s)" from `Context::getSupportedLocaleNames()` as `{name} ({code})`, "Publisher Email" if `contactEmail` (`{mailto … encode="hex"}`), "Copyright" if `copyrightNotice` printing `licenseTerms|nl2br` (A1), "Rights" if `openAccessPolicy` (`|nl2br`, A2). Closing: lockss.tpl has `templates/images/lockss.gif` linking https://www.lockss.org/ and "LOCKSS system has permission to collect, preserve, and serve this Archival Unit."; clockss.tpl has no image and "CLOCKSS system has permission to ingest, preserve, and serve this Archival Unit."; both end with `lib/pkp/templates/images/pkp.gif` linking https://pkp.sfu.ca/ and "Open Journal Systems was developed by the Public Knowledge Project.". clockss.tpl reads three settings through the older `getSetting()` / `getLocalizedSetting()`, same values. Live-probed 2026-09-28 (Fields, the page; Rules 9, 10, 12): signed out, the page had h3 headings only; the issue links opened `issue/view/{id}` headed "Vol. 1 No. 1 (2020)"; a year with two issues listed "Vol. 4 No. 1 (2016)" and "Vol. 4 No. 2 (2016)"; an issue saved with a Title and "Number" unticked (Issues › Back Issues › the issue › "Issue Data") was listed as "Vol. 3 (2015): K2 Special Issue", as its issue page's heading reads. The "Front Matter" links opened pages headed "About the Journal", "Submissions" and "Contact". "Publisher" ("K2 Publisher House"), "Description" and "ISSN" appeared at the first load after their save and left once emptied and saved: the print ISSN alone showed "2049-3630", both showed the online "0378-5955"; a "Description" typed and not saved never showed. The two logos loaded, linking https://www.lockss.org/ and https://pkp.sfu.ca/. The CLOCKSS page's rows equalled the LOCKSS page's in every state; it differed only in the tab title, the missing LOCKSS logo and the closing line.

<a id="fn-j"></a>
**j** — `GatewayHandler::lockss()` / `clockss()` with no context (the site's `index` path): `JournalDAO::getAll(true)` (enabled journals) assigned as `journals`; the template's `{if $journals}` branch prints "Archive of Published Issues" and one `<li>` per journal whose `enableLockss` (`enableClockss`) is set, linking its `gateway/lockss` (`clockss`), then the closing lines. `$journals` is a result object, so the branch runs with an empty list too. Live-probed 2026-09-28 (Rule 13; Actors row 5): `{site address}/gateway/lockss` redirected to the address with the site's language (`/index.php/index/en/gateway/lockss`), tab "LOCKSS Publisher Manifest", heading "Archive of Published Issues", one link per journal saved ticked and enabled publicly, a journal requiring sign-in included; journals unticked, CLOCKSS-only or not enabled publicly were left out; following an entry opened that journal's page. The list was the same signed out, as `reader.rosa`, as an account with no role and as the Site Administrator; a journal the Site Administrator then unticked under Administration › Hosted Journals › "Edit" dropped off at the next load. The list with no journal ticked was not reached (every test install carried journals ticked by other runs); with none, the template prints the heading over an empty list, since `$journals` is a result object.

<a id="fn-k"></a>
**k** — lib/pkp `PKPHandler::authorize()` adds `RestrictedSiteAccessPolicy`, whose login exemptions (`user`, `login`, `help`, `header`, `sidebar`, `payment`, `invitation`) do not include `gateway`, so with `restrictSiteAccess` a signed-out request is sent to the Login page; `PKPPageRouter::route()` sends a signed-out request for a context that is not enabled to `login` (only `login` and `invitation` pass). Live-probed 2026-09-28 (Rule 14; Actors row 4): on a journal requiring sign-in, ticked or not, signed out both addresses answered 302 to `{journal}/login?source=…gateway%2Flockss` (…`clockss`), a Login page that carries the manifest as its return address; on a journal not enabled publicly, seeded so or unticked on screen under Administration › Hosted Journals, to `{journal}/login` with no `source`, so that Login page carries no return address (the Login page's own behaviour, Hosted journals' territory). Signed in, the journal's Reader, its Journal Manager and the Site Administrator read both pages of the ticked journals and landed on the home page of the unticked ones (Rule 5). A signed-out visitor at an issue page of the journal requiring sign-in went to Login too.

<a id="fn-l"></a>
**l** — The templates' own header comment: "This page is not localized in order to provide a consistent interface to LOCKSS across all OJS installations. It is not meant to be accessed by humans." Every label in them is literal English; only the header and footer includes are localized. Live-probed 2026-09-28: note t6.

<a id="fn-m"></a>
**m** — Live-probed 2026-09-28 (absence paragraph; Rule 5), after a first probe on 2026-09-26: a new journal had "LOCKSS" and "CLOCKSS" unticked on Settings › Distribution › "Archiving", and `{journal address}/gateway/lockss` and `/gateway/clockss` landed on the home page; a press and a preprint server answered "404 Not Found" at both addresses (the web-feeds claim check, recorded in seed-facts); on 2026-09-28 the site's own addresses answered "404 Not Found" on OMP and OPS too (note a).

<a id="fn-n"></a>
**n** — Live-probed 2026-09-28 (Rules 5, 6), after a first probe on 2026-09-26: ticked, the two addresses showed "LOCKSS Publisher Manifest" and "CLOCKSS Publisher Manifest"; unticked, they landed on the home page (the web-feeds claim check, its Rule 15a); note g for the 2026-09-28 reading.

<a id="fn-t1"></a>
**t1** — Live-probed 2026-09-28 (Fields, the PN side tab; Rule 2): as the Journal Manager, Settings › Distribution › "Archiving" › "PKP Preservation Network (PN)" showed that heading, the paragraph exactly as quoted, and no button, link, box or "Save" (note c).

<a id="fn-t2"></a>
**t2** — Live-probed 2026-09-28 (Rule 4): on scratch journals, each "Publisher Manifest" link opened a new browser tab and left the Settings page as it was. The new tab showed the journal's home page while the link's own box was unticked, ticked and not saved, or unticked with the other box saved ticked, and after saving neither; it showed the network's page once its box was saved ticked, alone or with the other.

<a id="fn-t4"></a>
**t4** — Live-probed 2026-09-28 (Rules 7, 8): signed out, on a scratch journal with published issues of 2011, 2014 (published 2019-06-01), 2015 and 2016 (two issues), the heading read "Archive of Published Issues: 2016", "<< Previous" plain text and "Next >>" a link. "Next >>" went 2015, 2014, 2011 and was plain text at 2011; "<< Previous" came back 2014, 2015, 2016; the same on the CLOCKSS page. The plain-text ends are `span.disabled` in the page's own text colour, not grey. A one-year journal showed both as plain text. `?year=2015` and `?year=2011` showed those years; `2013`, `2017`, `2019`, `2026`, `abc`, empty, `-2015` and `0` showed 2016; `2015abc`, `2015.9` and `%202015` showed 2015.

<a id="fn-t5"></a>
**t5** — Live-probed 2026-09-28 (Rule 8a): signed out, on a scratch journal with no published issue, both pages read "Archive of Published Issues:" with no year over an empty list, both year links plain text; `?year=2020` changed nothing.

<a id="fn-t6"></a>
**t6** — Live-probed 2026-09-28 (Fields, rows "Language(s)" and "Journal URL"; Rule 11; Settings bullet 8): signed out, on a scratch journal with English and French (Canada) as interface languages, "Language(s)" read "English (en)" and "French (fr_CA)" on two lines and "Journal URL" ended in `/en`. At `/fr_CA/gateway/lockss` the headings, row labels, link labels, closing lines and the tab title stayed English, while the header's skip links and search link turned French ("Aller directement au contenu principal", …, "Rechercher") and its menu items stayed "Current Archives About … Register Login" (French ticked under "UI" alone, no "Forms" languages), "Language(s)" read "anglais (en)" and "français (fr_CA)", "Rights" read "Cette revue fournit le libre accès immédiat…" and "Journal URL" ended in `/fr_CA`. A one-language journal showed "English (en)" alone and a Journal URL with no language. The "Languages" grid of Settings › Website › "Setup" has the columns "Locale", "Code", "Primary locale", "UI", "Forms"; unticking French under "UI" (one click, no confirmation) left "English (en)" alone, and `/fr_CA/gateway/lockss` then redirected to `/gateway/lockss`. Test run 2026-09-28 (Rule 11; scenario 2): signed out, at `{journal address}/fr_CA/gateway/lockss` the header held the link "Rechercher" and no link "Search"; the footer's logo link was named "À propos de ce système de publication, plateforme et processus par OJS/PKP." and not "More information about the publishing system, Platform and Workflow by OJS/PKP."; `html[lang]` was `fr-CA`.

<a id="fn-t7"></a>
**t7** — Live-probed 2026-09-28 (Rule 13): note j.

<a id="fn-t8"></a>
**t8** — Live-probed 2026-09-28 (Fields, the page): signed out, the browser tab read "LOCKSS Publisher Manifest | {journal name}" ("CLOCKSS Publisher Manifest | …" on the other page), inside the journal's header (its name, "Current", "Archives", "About", "Search", "Register", "Login") and footer; the page's first line is the year links and its first heading "Archive of Published Issues: {year}", with no page title above them.

<a id="fn-t9"></a>
**t9** — Live-probed 2026-09-28 (Rule 14; Actors row 4; A4): note k.

<a id="fn-t10"></a>
**t10** — Live-probed 2026-09-28 (Fields, row "Copyright"; A1): note f-a1.

<a id="fn-t11"></a>
**t11** — Live-probed 2026-09-28 (Fields, row "Rights"; A2): note f-a2.

<a id="fn-t12"></a>
**t12** — Live-probed 2026-09-28 (Fields, row "Publisher Email"; Settings bullet 10): a new scratch journal's row showed its principal contact's address (`admin@mail.test`) as a hex-encoded `mailto:` link; an address changed and saved on "Contact" showed at the next load; emptying "Email address" was refused with "This field is required." and the row stayed. Pressing the link left the page as it was (the test browser has no mail program).

<a id="fn-s"></a>
**s** — Seeding for the scenarios. Scenarios 1 to 3 each run on their own scratch journals from `POST scenarios/context` (`docs/process/scenarios.md`), with throwaway `users[]` (password: the username twice, `docs/process/users.md`) and the visitor, signed out, in a second browser context; issues come from `issues[]` with `published: true`, which publishes them today, and the saved boxes from `enableLockss` / `enableClockss`. Scenario 1: context `name` "Tide Records", `contactName` "Tide Contact", `contactEmail` "tide.contact@example.org", English alone (no `supportedLocales`), a `manager`, `issues: [{volume: 1, number: 1, year: 2020, published: true}]`, and neither box key, so the tab is a new journal's; the mail catcher is read for mail that arrived from the saves. Scenario 2: "Coastal Years" with `context.supportedLocales` `['en', 'fr_CA']`, so the journal is created with French as an interface language and its French "Rights" text is the default one (note f-a2), `publisherInstitution` "Coastal House", `onlineIssn` "0378-5955", `printIssn` "2049-3630", `enableLockss: true`, and `issues` 1/1 (2011), 2/1 (2014), 3/1 (2015), 4/1 (2016) and 4/2 (2016), all `published: true`; "Empty Shelf" with `enableLockss: true` and no `issues`. Scenario 3: each journal with `enableLockss: true`, `enableClockss: true` and the published 2020 issue; "Closed Shore" with `restrictSiteAccess: true` and a `reader`, "Hidden Bay" with `context.enabled: false` and a `manager`, "Open Coast" with neither key. Scenario 4: the seeded `publicknowledge` press and preprint server as `manager.maya`, the addresses read signed out; its control runs on a scratch journal of the OJS install with a throwaway `manager`, so in the OJS suite (a CI job installs one app). The site's lists are shared by every journal of the install, other runs' included, so the scenarios read them for their own journals' names only. Live-probed 2026-09-28 (the preamble): the seeded journal's Archiving tab had both boxes unticked (read as `manager.maya`) and both addresses landed on its home page, signed out and signed in; the seeded press and preprint server, and their sites, answered "404 Not Found" at both addresses. A save on screen of a scratch journal's Masthead or Hosted Journals "Edit" needs `context.acronym` and `country`, and of its Contact tab a technical support contact.

<a id="fn-a1"></a>
**f-a1** — `templates/gateway/lockss.tpl` and `clockss.tpl`: `{if $journal->getLocalizedData('copyrightNotice')}` wraps the row whose value is `{$journal->getLocalizedData('licenseTerms')|nl2br}`. Before ojs `fdff6af2e5` (2019-01-16, pkp/pkp-lib#1908 "fix CLOCKSS and LOCKSS manifest display issues") the row was printed unconditionally with the license terms; that commit added the `copyrightNotice` condition. Live-probed 2026-09-28 on both pages: "License Terms" alone gave no "Copyright" row; with a "Copyright Notice" added, the row showed the License Terms text; with the License Terms emptied and the notice kept, the row showed with nothing in it.
Issue report: [pkp-e2e#822](https://github.com/jardakotesovec/pkp-e2e/issues/822) ([docs/issues/U58-OJS1-archiving-pages-copyright-row-license-terms.md](../issues/U58-OJS1-archiving-pages-copyright-row-license-terms.md)).

<a id="fn-a2"></a>
**f-a2** — `openAccessPolicy` is in lib/pkp `schemas/context.json` with `defaultLocaleKey` `default.contextSettings.openAccessPolicy` (ojs `locale/en/default.po`), filled in at journal creation by `PKPContextService::add()` → `PKPSchemaService::setDefaults()`. The two manifest templates are its only readers in OJS, lib/pkp and ui-library; no form edits it, and `PKPContextService::restoreLocaleDefaults()` writes the default back when a language is ticked for forms or submissions or its defaults are reloaded. The "Open Access Policy" field was retired before 3.0 in the settings consolidation (lib/pkp `96737f1130`, ojs `6482428c54`, 2016, pkp/pkp-lib#1397), and the 3.1.0 upgrade moved old values into "About the Journal" and deleted the setting (ojs `1b3e4f625c`). Live-probed 2026-09-28: the row read the sentence on a new journal and on a journal seeded with "Publishing Mode" subscription (its "Access" tab on "The journal will require subscriptions…"); no tab or side tab of Settings › Journal, Website, Workflow, Distribution or Users & Roles held it, as text, a box's value or a rich-text box, and neither did the About page. The "About the Journal" help on Settings › Journal › "Masthead" reads "…This could include your open access policy, the focus and scope of the journal, copyright notice, sponsorship disclosure, history of the journal, a privacy statement, and inclusion in any LOCKSS or CLOCKSS archival system." On a journal created with French as an interface language, the French page shows the French default text (Rule 11).
Issue report: [pkp-e2e#918](https://github.com/jardakotesovec/pkp-e2e/issues/918) ([docs/issues/U67-A2-archiving-pages-rights-row-says-open-access.md](../issues/U67-A2-archiving-pages-rights-row-says-open-access.md)).

<a id="fn-a3"></a>
**f-a3** — Note d. OJS `SettingsHandler::distribution()` decides with `PluginRegistry::getPlugin('generic', 'plnplugin')`. A disabled plugin is never registered (generic plugins load enabled-only at dispatch), and an enabled release for 3.4 or 3.5 registers as `PlnPlugin` (its own `getName()` since pkp/pln 12a26eb993, 3.0.0.0), which the case-sensitive lookup misses; the 3.3 release is named `plnplugin`, so there only the disabled plugin fails. The test installs carry no PN plugin: the issue report's walk installed pln 4.0.1.0 with the installer's `installPluginVersion.php` from outside the app folder and enabled it as `LazyLoadPlugin::setEnabled()` writes it; on `main` and 3.5 the tab showed the install text in both states.
Issue report: [pkp-e2e#917](https://github.com/jardakotesovec/pkp-e2e/issues/917) ([docs/issues/U67-A3-pn-tab-asks-to-install-installed-plugin.md](../issues/U67-A3-pn-tab-asks-to-install-installed-plugin.md)).

<a id="fn-a4"></a>
**f-a4** — Note k. The manifest's issue links lead to `issue/view/{id}`, under the same policy. Live-probed 2026-09-28: on a journal requiring sign-in with both boxes saved ticked, both addresses sent a signed-out visitor to Login; the site's lists named the journal and their links led to the same Login page; the journal's "LOCKSS and CLOCKSS" tab showed the two boxes and "Save" and no warning; its issue page sent a signed-out visitor to Login.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Archiving" › "PKP Preservation Network (PN)" | Settings › Distribution › "Archiving" (side tab `pln`) | AFFM-097 |
| "Archiving" › "LOCKSS and CLOCKSS" | Settings › Distribution › "Archiving" (side tab `lockss`) | AFFM-098 |
| The journal's LOCKSS and CLOCKSS pages (the gateway's `lockss` and `clockss` ops; the gateway's other ops are the web-feeds spec's) | {journal address}/gateway/lockss, …/gateway/clockss | ROUTE-037 |
| The site's LOCKSS and CLOCKSS lists | {site address}/gateway/lockss, …/gateway/clockss | ROUTE-037 |

## Reference — code anchors

- Settings page: `ojs/pages/management/SettingsHandler.php::distribution()` · `ojs/templates/management/additionalDistributionTabs.tpl` · `lib/pkp/templates/management/distribution.tpl` · `ojs/classes/components/forms/context/ArchivingLockssForm.php` · `ojs/classes/components/forms/FieldArchivingPn.php` · `lib/pkp/classes/components/forms/{FormComponent,FieldHTML,FieldOptions}.php`
- ui-library: `src/components/Form/fields/{FieldArchivingPn,FieldHtml,FieldOptions}.vue` · `src/components/Form/FormPage.vue`
- Manifest pages: `ojs/pages/gateway/{index,GatewayHandler}.php` (`lockss()`, `clockss()`, `getPublishedIssuesByNumber()`) · `ojs/templates/gateway/{lockss,clockss}.tpl` · `ojs/classes/issue/{DAO,Collector}.php` (`getYearsIssuesPublished()`) · `ojs/templates/images/lockss.gif` · `lib/pkp/templates/images/pkp.gif`
- Absence: `omp/pages/gateway/index.php` · `ops/pages/gateway/{index,GatewayHandler}.php` · `ops/templates/management/distribution.tpl`
- Settings data: `lib/pkp/schemas/context.json` (`enableLockss`, `enableClockss`, `openAccessPolicy`, `licenseTerms`, `copyrightNotice`, `searchDescription`) · `ojs/schemas/context.json` (`publisherInstitution`, `onlineIssn`, `printIssn`, `lockssLicense`, `clockssLicense`)
- Access: `lib/pkp/classes/handler/PKPHandler.php::authorize()` · `lib/pkp/classes/security/authorization/RestrictedSiteAccessPolicy.php` · `lib/pkp/classes/core/PKPPageRouter.php::route()` · `lib/pkp/classes/plugins/PluginRegistry.php` · `lib/pkp/classes/core/Dispatcher.php`
- Locale: `ojs/locale/en/manager.po` (`manager.website.archiving`, `manager.setup.plnPluginArchiving`, `manager.setup.plnPluginNotInstalled`, `manager.setup.plnDescription`, `manager.setup.plnSettingsDescription`, `manager.setup.plnPluginEnable`, `manager.setup.otherLockss`, `manager.setup.lockssTitle`, `manager.setup.lockssEnable`, `manager.setup.clockssTitle`, `manager.setup.clockssEnable`, `manager.distribution.access`) · `ojs/locale/en/default.po` (`default.contextSettings.openAccessPolicy`) · `lib/pkp/locale/en/manager.po` (`manager.distribution.title`)
