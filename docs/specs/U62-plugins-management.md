---
name: plugins-management
status: verified
---

# Plugins management

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Much of what a journal offers beyond its core comes as plugins: sidebar
blocks, themes, metadata formats, identifier and export tools,
indexing tags, analytics. The people who run a journal switch the
installed plugins on and off for their journal on Settings › Website ›
"Plugins", and open each plugin's own settings from there. The Site
Administrator does the same for the site's own pages, and adds, upgrades
and removes plugins for the whole installation, either by uploading a
plugin package or by installing one from PKP's Plugin Gallery. What a
plugin does once it is on belongs to the feature it serves; this spec
covers the lists, the switching and the installing. <sup>a</sup>

## Actors & permissions

"Whoever opens the Settings pages" means the manager-level roles that
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
lists (the Journal Manager, and on a journal or press the Editor and the
Production Editor), plus the Site Administrator; every other role gets
the access-denied page there. The Site Administrator holds a Journal
Manager role in every journal of the test installs. A **site-wide
plugin** is one that acts for the whole installation at once (Rule 6);
every other plugin is switched on per journal.

| Action | Who may, and when |
|--------|--------------------|
| **Open a journal's "Plugins" tab** (Rules 1, 3) | • whoever opens the Settings pages, on Settings › Website › "Plugins"<br>• Site Administrator, also through Administration › "Hosted Journals" › "Settings wizard" › "Plugins" (Rule 3) <sup>a</sup> |
| **Open the site's "Plugins" tab** (Rule 2) | • Site Administrator alone, while the installation hosts no journal, or two or more <sup>b</sup> <sup>s</sup> |
| **Tick or untick a journal's plugin** (Rules 8–11) | • whoever opens the Settings pages, on the plugins of that journal<br>• a Site Administrator with no manager-level role in the journal: the rows show, but ticking or unticking a journal plugin is refused ⚠ [A6](#a6), and nothing on screen says so ⚠ [A9](#a9) <sup>a</sup> <sup>td19</sup> |
| **See and switch site-wide plugins in a journal's list** (Rule 6) | • Site Administrator alone; on a press only while the installation hosts one press [OMP1](#omp1)<br>• every other role: the rows are not listed <sup>d</sup> <sup>td3</sup> |
| **Tick or untick a plugin on the site's list** (Rules 11, 14) | • Site Administrator alone <sup>a</sup> |
| **Use a plugin's own links** (such as "Settings"; Rules 13, 14) | • on a journal plugin: whoever opens the Settings pages, a Site Administrator with a manager-level role there included<br>• on a site-wide plugin: Site Administrator alone <sup>a</sup> <sup>td8</sup> |
| **Delete a plugin** (Rule 21) | • Site Administrator alone, on every list, whatever the install policy (Settings bullet 1) <sup>a</sup> <sup>q</sup> |
| **Upload a new plugin, or upgrade one by upload** (Rules 15–20) | • Site Administrator alone, while the install policy is "on" (Settings bullet 1)<br>• every other role: no "Upload A New Plugin" and no "Upgrade" <sup>a</sup> <sup>q</sup> <sup>td1</sup> |
| **Browse the Plugin Gallery and open a plugin's details** (Rules 22–25) | • whoever opens a "Plugins" tab, on every install policy <sup>a</sup> <sup>o</sup> <sup>q</sup> |
| **Install or upgrade from the Plugin Gallery** (Rule 26) | • Site Administrator alone, while the install policy allows it (Settings bullet 1)<br>• every other role: the plugin's status sentence instead of a button <sup>p</sup> <sup>q</sup> |

## Fields & validation

**"Installed Plugins"** (Rules 4–14), top to bottom:

| Part (UI label) | What it shows |
|-----------------|---------------|
| filter | hidden until "Search" at the list's top right is pressed: a drop-down reading "All Categories" (or one category's name), a text box and a "Search" button; after each search it is hidden again (Rule 7) |
| "Plugins" | the list's title; at its right "Search", which opens the filter, and for the Site Administrator "Upload A New Plugin" (Rule 15) |
| "Name", "Description", "Enabled" | the column headings |
| category headings | one per category, in the app's order below, with no count (Rule 4) |
| plugin rows | the plugin's name, its description, and a box in "Enabled"; an arrow at the start of a row that has links (Rule 13) |

The category headings, in list order: <sup>c</sup> <sup>td2</sup>

| App | Headings |
|-----|----------|
| journal, preprint server | "Metadata Plugins", "Block Plugins", "Gateway Plugins", "Generic Plugins", "Import/Export Plugins", "OAI Metadata Format Plugins", "Payment Plugins", "Public Identifier Plugins", "Report Plugins", "Theme Plugins" |
| press | "Metadata Plugins", "Public Identifier Plugins", "Block Plugins", "Generic Plugins", "Gateway Plugins", "Theme Plugins", "Import/Export Plugins", "OAI Metadata Format Plugins", "Payment Plugins", "Report Plugins" [OMP2](#omp2) |

**"Upload A New Plugin" and "Upgrade Plugin"** (Rules 15–19), each a
window of the same name:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Select plugin file" | Yes (marked with an asterisk; "Required fields are marked with an asterisk: *" under the window's "Save") | "Upload File" opens the computer's file picker, or a file is dropped on "Drag and drop a file here to begin upload"; once a file is up the button reads "Change File". The package must be a ".tar.gz" archive holding the plugin's "version.xml", in a folder or at the archive's root (Rules 16, 17) <sup>k</sup> <sup>td10</sup> <sup>td11</sup> |

**"Plugin Gallery"** (Rules 22–26), top to bottom: a filter (a
drop-down reading "All Categories", a text box, and "Search"); the list
titled "Plugin Gallery" with the columns "Name" (each name a link to the
plugin's details), "Description" and "Status". "Status" reads "Up to
date", "Can be upgraded", "Newer than available version", "Not
Available", or nothing for a plugin not installed. <sup>o</sup>

**A gallery plugin's details** (Rule 25), a window headed with the
plugin's name, top to bottom: the status sentence or the "Install" /
"Upgrade" button; the plugin's badges, each with its line ("Official":
"This plugin is developed and maintained by the Public Knowledge
Project team."; "Reviewed": "This plugin has been reviewed and approved
by the Public Knowledge Project team."; "Partner": "This plugin is
provided by one of our development partners."); for an installed plugin
"Installed version: {version}"; "v{version} released on {date}" and the
release's notes; the maintainer's name (a mail link when an address is
given) and institution; the plugin's home page as a link opening a new
tab; the description and, when given, the installation instructions.
None of these is shown for a plugin with no compatible version.
<sup>p</sup>

## Rules & state

**Where the lists are**

1. <a id="journal-plugins-tab"></a> **A journal's "Plugins" tab.**
   Settings › Website › "Plugins" holds two tabs, "Installed Plugins"
   (open first) and "Plugin Gallery". Both lists load as the Website page
   opens, whichever tab is showing. Pressing either tab adds its name to
   the page's address ("#installedPlugins", "#pluginGallery"); a reload
   of that address, or the address typed, opens "Appearance" instead
   (Journal identity & about pages,
   [A7](U07-journal-identity-and-about-pages.md#a7)). An address ending
   in "#plugins" opens "Installed Plugins", and one ending in
   "#plugins/pluginGallery" the gallery tab. <sup>b</sup> <sup>td1</sup>
2. **The site's "Plugins" tab.** Administration › "Site Settings" ›
   "Plugins" holds the same two tabs for the site itself. The tab exists
   only while the installation hosts no journal or two or more
   ([Site settings](U60-site-settings.md#site-settings-tabs), Rules 1–2).
   Once "Plugin Gallery" has been pressed, a reload opens "Site Setup"
   instead (Site settings, [A7](U60-site-settings.md#a7)); a reload while
   the address ends in "#plugins", as it does on arriving at the tab,
   opens "Installed Plugins" again. <sup>b</sup>
3. **The Settings Wizard's "Plugins" tab.** Administration › "Hosted
   Journals" › a journal's "Settings wizard" › "Plugins" holds the tabs
   "Installed Plugins" and "Plugin Gallery" for that journal: the same
   list as the journal's own tab, and what is ticked in one shows ticked
   in the other. The two tabs add "#installed" and "#gallery" to the
   address, and a reload of it opens the wizard's first tab ("Journal
   Settings"; "Setup" on a press, "Server Settings" on a preprint server)
   instead, as on Settings › Website (Rule 1). *Hosted journals* owns the
   wizard. <sup>b</sup> <sup>td20</sup>

**The installed plugins list**

4. **What it lists.** Every plugin installed on the server, under its
   category heading (Fields). A category with no plugin keeps its
   heading, with "No Items" under it: "Gateway Plugins" on every app,
   and on a preprint server also "Payment Plugins", "Public Identifier
   Plugins" and "Report Plugins". The site's list is the same.
   <sup>c</sup> <sup>td2</sup>
5. **Installed for all, switched on per journal.** A plugin is installed
   once for the whole installation, so every journal's list and the
   site's list name the same plugins; whether it is on is kept
   separately for each journal and for the site (Rule 11). <sup>c</sup>
   <sup>h</sup>
6. **Site-wide plugins.** "Usage event", which records what readers
   view and download for the statistics, is site-wide: it acts for every
   journal at once. In a journal's list it shows to the Site
   Administrator alone, under "Generic Plugins", ticked, with a box that
   cannot be pressed (Rule 10); on a press only while the installation
   hosts one press [OMP1](#omp1). "Custom Block Manager" is each
   journal's own ([Custom pages & blocks](U09-custom-pages-and-blocks.md),
   Rule 27); on the site's list it counts as site-wide only for its own
   link (Rule 14).
   <sup>d</sup> <sup>td3</sup>
7. **Searching.** "Search" at the list's top right opens the filter
   (Fields). Text typed in the box and "Search" (or Enter) leave only the
   plugins whose name contains the text, in any case, and keep every
   heading, with "No Items" under those left empty. A category chosen in
   the drop-down and "Search" leave that heading alone; with text typed
   too, it reads "No Items" when none of its plugins matches. "All
   Categories" with an empty box lists everything again. <sup>e</sup>
   <sup>td4</sup>

**Switching a plugin on and off**

8. <a id="enable-plugin"></a> **Ticking.** Ticking a plugin's box asks
   nothing: the notice "The plugin "{plugin name}" has been enabled."
   shows at the top right and the box stays ticked after a reload. What
   the plugin then adds is its own feature's (Cross-feature
   interactions). <sup>f</sup> <sup>td6</sup>
9. <a id="disable-plugin"></a> **Unticking.** Unticking a box opens a
   window headed "Disable", reading "Are you sure you want to disable
   this plugin?", with "OK" and "Cancel". "OK" shows the notice "The
   plugin "{plugin name}" has been disabled." and the box stays unticked
   after a reload; "Cancel" closes the window with the box still ticked
   and nothing changed. <sup>f</sup> <sup>td21</sup>
10. **Boxes that cannot be pressed.** A plugin the application always
    runs shows a ticked box that cannot be pressed, for every role: the
    metadata, import/export and report plugins,
    "TinyMCE Plugin" (the text editor), "Usage event", and under "OAI
    Metadata Format Plugins" "DC Metadata Format", "MARC" {OJS} and
    "MARC21" {OJS}. <sup>g</sup> <sup>td5</sup>
11. **Each journal and the site separately.** Ticking or unticking a
    plugin in one journal changes nothing in another journal or on the
    site's list, and the site's list changes no journal: the site's
    ticks serve the site's own pages. "Usage event" alone has one state
    for all (Rule 6). <sup>h</sup>
    <sup>td6</sup>
12. **The theme in use.** The "Theme Plugins" row of the theme a journal
    uses (a fresh journal uses "Default Theme") can be unticked like any
    other plugin ⚠ [A8](#a8). The journal's public pages then show with
    no styling at all, except a journal's home page, which comes up blank
    (on a press and a preprint server the home page shows unstyled like
    the rest) ⚠ [OJS1](#ojs1). <sup>i</sup> <sup>td7</sup>

**A plugin's links**

13. <a id="plugin-links"></a> **The arrow and its links.** Pressing the
    arrow at the start of a row opens a line of links under it and
    pressing it again closes it. The links are the plugin's own, such as
    "Settings", "Import/Export Data", which opens the plugin's page under
    Tools, and "Reports", which downloads the report as a CSV file (on
    "COUNTER Reports" it opens that report's Statistics page instead; a
    preprint server has no report plugin). Many show only while the
    plugin is on, and what each opens is described by the feature the
    plugin serves.
    For the Site Administrator the line ends with "Delete" (Rule 21) and
    "Upgrade" (Rule 18). A row with no link has no arrow. <sup>j</sup>
    <sup>td8</sup>
14. **Links on the site's list.** On the site's list only "Custom Block
    Manager" carries a link of its own, "Manage Custom Blocks", and only
    while it is ticked there (it arrives unticked); "Usage event" and
    every other row offer the Site Administrator "Delete" and "Upgrade"
    alone. The site's list offers every installed plugin,
    including those that serve only journals: ticking one there reports
    it enabled and changes nothing for the site (Custom pages & blocks
    records this for "Static Pages Plugin",
    [A8](U09-custom-pages-and-blocks.md#a8)). <sup>j</sup> <sup>td9</sup>

**Adding, upgrading and deleting plugins**

15. **"Upload A New Plugin".** The link opens a window headed "Upload A
    New Plugin" with the file field of the Fields table, "Cancel" and
    "Save"; the window gives no line saying what file it wants
    ⚠ [A2](#a2), while "Upgrade Plugin" opens with "This form allows you
    to upgrade a plugin.  Please ensure the plugin is compressed as a
    .tar.gz file." In both, "Cancel" and the window's "Close" close it
    with nothing installed. <sup>k</sup> <sup>td10</sup>
16. **A new plugin installed.** "Save" with a plugin package installs it
    for the whole installation: the window closes, the notice
    "Successfully installed version {version}" shows, and the plugin is
    listed under its category in every journal's list and the site's,
    unticked unless the plugin arrives switched on. <sup>k</sup>
    <sup>td16</sup>
17. **Upload refused.** Each of these closes the window, shows its
    notice at the top right and installs nothing: <sup>l</sup>
    - the same plugin already installed at the same or a newer version:
      "Plugin already installed and up-to-date."; at an older version:
      "Plugin already exists, but is newer than installed version.
      Please upgrade instead" <sup>td12</sup>
    - an archive with no "version.xml" at its root or in a folder at its
      root: "The uploaded plugin archive does not contain a folder that
      corresponds to the plugin name."; a "version.xml" file that does
      not name a plugin: "version.xml in plugin directory contains
      invalid data." <sup>td13</sup>
    - a file that is not a ".tar.gz" archive: a message that names the
      uploaded file's path on the server ⚠ [A10](#a10), "Cannot create
      phar '{path}',
      file extension (or combination) not recognised or the directory
      does not exist"; for a text file named ".tar.gz", "internal
      corruption of phar "{path}" (__HALT_COMPILER(); not found)"
      <sup>td14</sup>

    "Save" with no file chosen is refused differently: the window stays
    open, the red notice "Please ensure a file was selected for upload."
    shows at the top right, and nothing is installed. <sup>l</sup>
    <sup>td11</sup>
18. **"Upgrade".** A row's "Upgrade" opens the "Upgrade Plugin" window.
    "Save" with a newer version of the same plugin replaces it: the
    notice "Successfully upgraded to version {version}" shows and the row
    keeps its box as it was. <sup>m</sup> <sup>td16</sup>
19. **Upgrade refused.** Each of these shows its notice and leaves the
    plugin as it was: another category's plugin "The uploaded plugin
    does not fit the category of the upgraded plugin."; another plugin
    of the same category "The version.xml in the uploaded plugin
    contains a plugin name that does not fit the name of the upgraded
    plugin."; the same or an older version "Plugin already installed,
    and is newer than the version available in the gallery."
    ⚠ [A3](#a3). <sup>m</sup> <sup>td15</sup>
20. **A failed upgrade.** When a newer version is accepted but its own
    installation step fails, the notice reads "Upgrade failed.
    {error}", and the plugin's old files are gone as well as the new
    ones: its row leaves every journal's list and the site's at once
    ⚠ [A5](#a5). <sup>m</sup>
21. <a id="delete-plugin"></a> **"Delete".** A row's "Delete" opens a
    window headed "Delete", reading "Are you sure you wish to delete
    this plugin from the system?", with "OK" and "Cancel". "OK" removes
    the plugin's files from the server: the notice "Plugin "{plugin
    name}" successfuly deleted" shows ⚠ [A7](#a7), and the plugin leaves
    every journal's list and the site's. "Cancel" changes nothing.
    "Delete" is offered on every row, those of Rule 10 and the theme in
    use included ⚠ [A4](#a4). <sup>n</sup> <sup>td16</sup> <sup>td17</sup>

    When the server cannot remove the files, the notice reads "Plugin
    "{plugin name}" could not be deleted from the file system. This may
    be a permissions problem. Please make sure that the web server is
    able to write to the plugins directory (including subdirectories)
    but don't forget to secure it again later." and the plugin stays.
    <sup>t</sup>

**The Plugin Gallery**

22. **What it lists.** The gallery is PKP's list of plugins, read from
    PKP's site; the "Plugin Gallery" tab lists each plugin that has a
    version for this application's version, with its summary and status
    (Fields). This rule, Rules 24–26, the gallery's parts of Fields and
    Actors rows 9–10 are read from the code, since the test installs
    never reach PKP's site: there the tab shows only "Loading" (Rule 23).
    <sup>o</sup>
23. **Without a connection.** When the installation cannot reach PKP's
    site, the gallery's list fails: the tab shows "Loading" with a
    spinner that never ends, and no list or message ⚠ [A1](#a1). The
    failure comes with every opening of Settings › Website, of Site
    Settings and of the Settings Wizard, since the gallery loads with
    them (Rule 1); "Installed Plugins" works as usual meanwhile.
    <sup>td18</sup>
24. **Searching the gallery.** The category drop-down and "Search" leave
    that category's plugins; typed text leaves the plugins whose entry
    (name, summary, description, maintainer and the rest) contains it,
    in any case. <sup>o</sup>
25. **A plugin's details.** Pressing a plugin's name opens its details
    (Fields). The status sentence is one of: "The plugin has not yet
    been installed.", "Plugin already installed, but can be updated to a
    newer version.", "Plugin already installed and up-to-date.", "Plugin
    already installed, and is newer than the version available in the
    gallery.", "There is currently no compatible version of this plugin
    available."; under an install policy that forbids the step, "Plugin
    installs through the Plugin Gallery are disabled by the Site
    Administrator." or "Plugin upgrades through the Plugin Gallery are
    disabled by the Site Administrator." <sup>p</sup>
26. **Installing from the gallery.** For the Site Administrator, a
    plugin not yet installed shows "Install" and an older installed one
    "Upgrade" in place of the sentence. Pressing it asks "Are you sure
    you wish to install this plugin?" (or "…upgrade this plugin?"); "OK"
    downloads the package from PKP, checks it against the gallery's
    checksum, installs it for the whole installation, and reloads the
    page on the "Plugins" tab with the notice "Successfully installed
    version {version}" or "Successfully upgraded to version {version}",
    or with the reason it failed. From a journal's list or the Settings
    Wizard the page that reloads is that journal's Settings › Website;
    from the site's list, Site Settings. <sup>p</sup>

## Side effects

- Every step of this spec answers with a notice to the person who took
  it, at the top right (Rules 8, 9, 16–21, 26); none sends an email,
  adds a Tasks entry or writes a submission's activity log. <sup>r</sup>
- Uploading, upgrading, installing from the gallery and deleting change
  the whole installation: every journal's list and the site's show the
  result at their next load (Rules 5, 16, 18, 21). <sup>k</sup>
  <sup>n</sup>
- When the installation's audit logging is on ("log_audit" under "logs"
  in the configuration file; off by default and on the test installs),
  each switch, install, upgrade and deletion is written to the server's
  own log, which no screen shows. <sup>u</sup>

## Settings that modify behavior

The first two are lines of the installation's configuration file under
"security", read by the server and changed on no screen. Administration
› "View System Information" lists the first under "security" by the
name in quotes, where "on" reads "1"; the second has no row there
([System administration & jobs](U61-system-administration.md), Rule 7).

1. **The install policy** ("allow_plugin_install"; "on"). "on": "Upload
   A New Plugin", each row's "Upgrade", and the gallery's "Install" and
   "Upgrade". "gallery_only": no "Upload A New Plugin" and no row
   "Upgrade"; the gallery's "Install" and "Upgrade" stay.
   "upgrade_only": the gallery's "Upgrade" alone. "off", or any value
   not in this list: none of them. On every value the "Plugin Gallery"
   tab and "Delete" stay (Rules 15–26). <sup>q</sup>
2. **The gallery's source** ("plugin_gallery_urls"; left out of the
   file, which reads PKP's own list). Another list of addresses: the
   gallery reads those lists instead, and a plugin named in two lists
   shows once (Rule 22). <sup>o</sup> <sup>q</sup>
3. **The number of journals** (*Site settings*). With exactly one
   journal, Site Settings has no "Plugins" tab (Rule 2).
4. **"Permit changes to Settings"** (a manager-level role's "Edit" on
   Settings › Users & Roles › "Roles"; ticked).
   Unticked: that role no longer opens the Settings pages and so no
   "Plugins" tab
   ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)).
   The Journal Manager's row has no "Edit", and a preprint server has no
   other manager-level role, so there the box cannot be reached.
   <sup>a</sup>

## Cross-feature interactions

- [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
  owns who opens the Settings pages and the access-denied page the other
  roles get.
- [Site settings](U60-site-settings.md) owns the Site Settings page, its
  tabs and when its "Plugins" tab shows; *Hosted journals* owns the
  Settings Wizard; [System administration & jobs](U61-system-administration.md)
  owns the page listing the configuration file.
- Each plugin's own feature owns what the plugin does and its row's own
  links: [Custom pages & blocks](U09-custom-pages-and-blocks.md) ("Static
  Pages Plugin" {OJS OMP}, "Custom Block Manager"), [Appearance & theming](U10-appearance-and-theming.md)
  (themes and block plugins), [Announcements](U12-announcements.md)
  ("Announcement Feed Plugin" {OJS}), [Article landing page & reading](U13-article-landing-page-and-reading.md)
  (the viewers, and "Citation Style Language", which adds "How to Cite"),
  [Web feeds](U18-web-feeds.md), [OAI-PMH](U19-oai-pmh.md)
  (the OAI formats and "DRIVER" {OJS}), [Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)
  (the indexing tags and "Google Analytics Plugin"), [Identifiers](U44-identifiers.md)
  (the URN plugin {OJS OMP}), [DOIs](U45-dois.md) (the registration
  agency plugins {OJS OPS}),
  [JATS & body text](U48-jats-and-body-text.md) ("JATS Template Plugin" {OJS}),
  *Import & export* (the import/export plugins) and *Statistics — usage*
  (the report plugins and "Usage event").
- This spec owns the lists, the "Enabled" box with its window and
  notices, the arrow with "Delete" and "Upgrade", "Upload A New Plugin"
  and the Plugin Gallery.

## Canonical scenarios

Every scenario runs on a scratch journal with throwaway accounts, signed
in as its Journal Manager or as the Site Administrator (a ready
account); scenarios 3 to 5 change the whole installation, so they run
one at a time and put back what they changed. <sup>sc</sup>

1. **A journal's installed plugins**

   Given: Journal Manager of a scratch journal, whose "Web Feed Plugin"
   is ticked with a "Settings" link (a new journal's state).

   - **The tab**: open Settings › Website › "Plugins": two tabs,
     "Installed Plugins" (open) and "Plugin Gallery" (not pressed here,
     [A1](#a1)). The list is titled "Plugins", with "Search" alone at
     its right, and has the columns "Name", "Description" and "Enabled"
     (Rule 1; Fields).
   - **The headings**: the category headings read, top to bottom,
     "Metadata Plugins", "Block Plugins", "Gateway Plugins", "Generic
     Plugins", "Import/Export Plugins", "OAI Metadata Format Plugins",
     "Payment Plugins", "Public Identifier Plugins", "Report Plugins",
     "Theme Plugins" (on a press "Metadata Plugins", "Public Identifier
     Plugins", "Block Plugins", "Generic Plugins", "Gateway Plugins",
     "Theme Plugins", "Import/Export Plugins", "OAI Metadata Format
     Plugins", "Payment Plugins", "Report Plugins" [OMP2](#omp2)), none
     followed by a number. "Gateway Plugins" reads "No Items", and on a
     preprint server so do "Payment Plugins", "Public Identifier
     Plugins" and "Report Plugins". "Generic Plugins" has no "Usage
     event" row (Rules 4, 6; Actors row 4).
   - **Boxes that cannot be pressed**: the "TinyMCE Plugin" row and
     every row under "Metadata Plugins" and "Import/Export Plugins" show
     a ticked box that cannot be pressed (Rule 10).
   - **The arrow**: press the arrow at the start of the "Web Feed
     Plugin" row: a line of links opens under the row, with "Settings".
     Press the arrow again: the line closes (Rule 13).
   - **Searching by text**: press "Search" at the list's top right: a
     drop-down reading "All Categories", a text box and a "Search"
     button show above the list. Type feed in the box and press
     "Search": only rows whose name contains "feed" remain, "Web Feed
     Plugin" among them; every heading stays, with "No Items" under
     those left empty, and the filter is hidden again (Rule 7; Fields).
   - **Capitals and Enter**: press "Search", clear the box, type FEED
     and press Enter: the same rows remain (Rule 7).
   - **Searching by category**: press "Search", clear the box, choose
     "Block Plugins" in the drop-down and press "Search": the "Block
     Plugins" heading alone remains, with its rows. Press "Search", type
     Quokka in the box with the drop-down still reading "Block Plugins",
     and press "Search": "Block Plugins" reads "No Items". Press
     "Search", choose "All Categories", clear the box and press
     "Search": every heading and row is back (Rule 7).
   - **Control**: open the "Web Feed Plugin" arrow again: its line holds
     no "Delete" and no "Upgrade", and the list's title has no "Upload
     A New Plugin" at its right (Actors rows 7, 8). <sup>sc</sup>

2. **Switching a journal's plugin on and off**

   Given: Journal Manager of a scratch journal, on its Settings ›
   Website › "Plugins", with a second scratch journal and the Site
   Administrator signed in in a second browser, and "Google Analytics
   Plugin" unticked in both journals and on the site's list (a new
   journal's and a new installation's state).

   - **Ticking**: tick the "Google Analytics Plugin" box: nothing asks
     first, and the notice "The plugin "Google Analytics Plugin" has
     been enabled." shows at the top right. Reload the page: the box is
     ticked (Rule 8).
   - **The second journal and the site**: the Site Administrator opens
     the second scratch journal's Settings › Website › "Plugins": the
     "Google Analytics Plugin" box is unticked. They open Administration
     › "Site Settings" › "Plugins": the box is unticked there too
     (Rule 11).
   - **Unticking**: back as the Journal Manager, untick the box: a
     window headed "Disable" reads "Are you sure you want to disable
     this plugin?", with "OK" and "Cancel". Press "OK": the notice "The
     plugin "Google Analytics Plugin" has been disabled." shows. Reload
     the page: the box is unticked (Rule 9).
   - **Control**: tick the box again (the enabled notice shows), untick
     it and press "Cancel" in the "Disable" window: the window closes
     with the box still ticked, and after a reload it is still ticked
     (Rule 9). <sup>sc</sup>

3. **The site's plugins**

   Given: Site Administrator, on an installation hosting the seeded
   journal and a scratch journal, with "Google Analytics Plugin"
   unticked on the site's list and in the scratch journal and "Custom
   Block Manager" unticked on the site's list (a new installation's and
   a new journal's state).

   - **The tab**: open Administration › "Site Settings" › "Plugins":
     two tabs, "Installed Plugins" (open) and "Plugin Gallery" (not
     pressed here, [A1](#a1)). The list is titled "Plugins", with
     "Search" and "Upload A New Plugin" at its right, and "Gateway
     Plugins" reads "No Items" (Rules 2, 4).
   - **"Usage event"**: its row shows a ticked box that cannot be
     pressed; its arrow opens a line with "Delete" and "Upgrade" alone
     (Rules 10, 14).
   - **"Custom Block Manager", ticked**: its arrow opens "Delete" and
     "Upgrade" alone. Tick its box: the notice "The plugin "Custom Block
     Manager" has been enabled." shows at the top right, and its arrow
     now opens "Manage Custom Blocks", then "Delete" and "Upgrade"
     (Rules 8, 13, 14).
   - **"Custom Block Manager", unticked again**: untick its box and
     press "OK" in the "Disable" window: the notice "The plugin "Custom
     Block Manager" has been disabled." shows, and its arrow opens
     "Delete" and "Upgrade" alone again (Rules 9, 14).
   - **"Google Analytics Plugin"**: tick its box: the notice "The plugin
     "Google Analytics Plugin" has been enabled." shows. Reload the
     page: the box is ticked (Rule 8).
   - **Control**: open the scratch journal's Settings › Website ›
     "Plugins": the "Google Analytics Plugin" box is unticked (Rule 11).
     <sup>sc</sup>

4. **A new plugin uploaded**

   Given: Site Administrator, on a scratch journal's Settings › Website
   › "Plugins", on an installation hosting two or more journals, whose
   "Web Feed Plugin" is ticked with a "Settings" link (a new journal's
   state), with the scratch journal's Journal Manager signed in in a
   second browser and, as files on the computer, packages of two generic plugins of
   the scenario's own: "Harbour Test Plugin" at version 1.0.0.0 and at
   1.0.1.0, which arrives unticked, and "Harbour Root Plugin" at 1.0.0.0,
   which arrives switched on, with its files at the archive's root;
   plus an archive holding a folder with no "version.xml" and one whose
   "version.xml" names no plugin.

   - **The Site Administrator's list**: "Upload A New Plugin" stands
     beside "Search" at the right of the "Plugins" title. Under "Generic
     Plugins" the "Usage event" row shows a ticked box that cannot be
     pressed; on a press the row is not listed, since the installation
     hosts two or more presses [OMP1](#omp1). The "Web Feed Plugin"
     arrow opens "Settings", then "Delete" and "Upgrade" (Rules 6, 13;
     Actors rows 4, 6, 7, 8).
   - **"Upload A New Plugin", "Cancel"**: press "Upload A New Plugin":
     a window headed "Upload A New Plugin" shows "Select plugin file"
     marked with an asterisk, "Drag and drop a file here to begin
     upload", "Upload File", "Cancel" and "Save", with "Required fields
     are marked with an asterisk: *" under "Save", and no line saying
     what file it wants ⚠ [A2](#a2). Press "Cancel": the window closes
     and the list is as it was (Rule 15; Fields).
   - **No file chosen**: press "Upload A New Plugin" again and "Save":
     the window stays open, and the red notice "Please ensure a file was
     selected for upload." shows at the top right (Rule 17).
   - **The new plugin**: in the same window press "Upload File" and
     choose the "Harbour Test Plugin" 1.0.0.0 package: the button reads
     "Change File". Press "Save": the window closes, the notice
     "Successfully installed version 1.0.0.0" shows, and "Harbour Test
     Plugin" is listed under "Generic Plugins", unticked (Rule 16).
   - **Every list**: open Administration › "Site Settings" › "Plugins":
     "Harbour Test Plugin" is listed under "Generic Plugins", unticked.
     Open Administration › "Hosted Journals" › the scratch journal's
     "Settings wizard" › "Plugins": the tabs read "Installed Plugins"
     and "Plugin Gallery", and "Harbour Test Plugin" is listed there,
     unticked (Rules 3, 16; Side effects bullet 2).
   - **Already installed**: back on the scratch journal's list, upload
     the "Harbour Test Plugin" 1.0.0.0 package again: the window closes
     and the notice "Plugin already installed and up-to-date." shows.
     Upload the 1.0.1.0 package: the notice reads "Plugin already
     exists, but is newer than installed version. Please upgrade
     instead". "Harbour Test Plugin" is still listed once, unticked
     (Rule 17).
   - **Not a plugin package**: upload the archive with no "version.xml":
     the window closes and the notice reads "The uploaded plugin archive
     does not contain a folder that corresponds to the plugin name.".
     Upload the one whose "version.xml" names no plugin: "version.xml in
     plugin directory contains invalid data." No row is added (Rule 17).
   - **Files at the archive's root**: upload the "Harbour Root Plugin"
     package: the notice "Successfully installed version 1.0.0.0" shows,
     and "Harbour Root Plugin" is listed under "Generic Plugins", ticked
     (Rule 16; Fields).
   - **Control**: the Journal Manager reloads the scratch journal's
     Settings › Website › "Plugins": "Harbour Test Plugin" is listed
     unticked and "Harbour Root Plugin" ticked, and the list's title has
     no "Upload A New Plugin" at its right (Side effects bullet 2;
     Actors row 8). <sup>sc</sup>

5. **A plugin upgraded, then deleted**

   Given: Site Administrator, on a scratch journal's Settings › Website
   › "Plugins", where the scenario's own "Harbour Test Plugin" is
   installed at version 1.0.0.0 and ticked, with, as files on the
   computer, its package at 1.0.1.0, a package of a block plugin of the
   scenario's own, "Harbour Block Plugin", and one of another generic
   plugin of its own, "Harbour Other Plugin".

   - **"Upgrade Plugin"**: press the "Harbour Test Plugin" arrow: its
     line ends with "Delete" and "Upgrade". Press "Upgrade": a window
     headed "Upgrade Plugin" reads "This form allows you to upgrade a
     plugin.  Please ensure the plugin is compressed as a .tar.gz
     file." above "Select plugin file". Press the window's "Close": the
     window closes with the row as it was (Rules 15, 18).
   - **Another category's plugin**: open the row's "Upgrade" again, press
     "Upload File" in the window, choose the "Harbour Block Plugin" package and press "Save":
     the notice "The uploaded plugin does not fit the category of the
     upgraded plugin." shows, and the row is still ticked (Rule 19).
   - **Another plugin**: open the row's "Upgrade" again and "Save" the
     "Harbour Other Plugin" package the same way: the notice reads "The version.xml in the uploaded plugin
     contains a plugin name that does not fit the name of the upgraded
     plugin.", and the row is still ticked (Rule 19).
   - **The newer version**: open the row's "Upgrade" again and "Save"
     the "Harbour Test Plugin" 1.0.1.0 package the same way: the notice "Successfully upgraded to version
     1.0.1.0" shows, and the row is still ticked (Rule 18).
   - **"Delete", "Cancel"**: press "Delete" in the row's arrow: a window
     headed "Delete" reads "Are you sure you wish to delete this plugin
     from the system?", with "OK" and "Cancel". Press "Cancel": the
     window closes and the row is still listed (Rule 21).
   - **"Delete", "OK"**: press "Delete" again and "OK": the notice
     "Plugin "Harbour Test Plugin" successfuly deleted" shows ⚠
     [A7](#a7), and the row leaves the list (Rule 21).
   - **The site's list**: open Administration › "Site Settings" ›
     "Plugins": "Generic Plugins" has no "Harbour Test Plugin" row
     (Rule 21; Side effects bullet 2).
   - **Control**: reload the scratch journal's Settings › Website ›
     "Plugins": "Generic Plugins" still has no "Harbour Test Plugin" row
     (Rule 21). <sup>sc</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A9 (issue reports
    `docs/issues/U62-A9-plugin-switch-refusal-raw-key.md` and
    `docs/issues/U62-A9-refused-confirmation-window-keeps-spinning.md`): a Site Administrator without a manager role ticks and unticks a journal's plugin; the alert gives the reason in words and the "Disable" window closes
  - the guard for A1 (issue report
    `docs/issues/U62-A1-plugin-gallery-offline-stays-loading.md`): "Plugin Gallery" on an installation that cannot reach PKP's site shows an empty list, with no server error
  - the guard for A5 (issue report
    `docs/issues/U62-A5-failed-upgrade-removes-plugin.md`): an upgrade through a row's "Upgrade" whose own upgrade step fails leaves the old version listed, ticked and working
  - the guard for OJS1 (issue report
    `docs/issues/U62-OJS1-theme-off-journal-home-page-blank.md`): a journal's home page with its theme unticked answers 200 and shows its current issue
- **Nothing new to test**:
  - a tick made in the Settings Wizard's "Plugins" tab showing on the
    journal's own list, and the reverse (Rule 3)
  - a plugin's other own links: "Import/Export Data" opening the
    plugin's page under Tools, "Reports" downloading a CSV file,
    "COUNTER Reports" opening its Statistics page (Rule 13)
  - a row with no link of its own, which has no arrow (Rule 13)
  - a package dropped on "Drag and drop a file here to begin upload"
    instead of chosen with "Upload File" (Fields)
  - the Editor and the Production Editor {OJS OMP}, offered the Journal
    Manager's list and boxes of scenarios 1 and 2 (Actors rows 1, 3)
- **Register carries it**:
  - A1 (the "Plugin Gallery" tab stuck on "Loading"; Rule 23; scenarios
    1 and 3 pass the tab)
  - A2 (the upload window's missing line; Rule 15; scenario 4 marks it)
  - A3 (an upgrade refused for the same or an older version, blaming
    the gallery; Rule 19)
  - A4 ("Delete" on the rows whose box cannot be pressed and on the
    theme in use; Rule 21)
  - A5 (a failed upgrade removing the plugin; Rule 20)
  - A6 and A9 (a Site Administrator with no manager-level role in the
    journal, whose ticks are refused with no message; Actors row 3)
  - A7 (the Delete notice's spelling; Rule 21; scenario 5 marks it)
  - A8 and OJS1 (the theme in use unticked, and a journal's home page
    coming up blank; Rule 12)
  - A10 (a file that is not a ".tar.gz" archive, refused in the
    server's own words; Rule 17)
- **No seed**:
  - browsing the Plugin Gallery, searching it and opening a plugin's
    details, since the test installs never reach PKP's site (Actors
    row 9; Rules 22, 24, 25)
  - installing or upgrading from the Plugin Gallery, for the same
    reason (Actors row 10; Rule 26)
  - the gallery's statuses: up to date, can be upgraded, newer, not
    available, not installed (Rule 25; Fields)
  - the install policy "gallery_only", a line of the configuration file
    every test shares (Settings bullet 1)
  - the install policy "upgrade_only", the same (Settings bullet 1)
  - the install policy "off", or an unknown value, the same (Settings
    bullet 1)
  - another gallery source, the same (Settings bullet 2)
  - audit logging on, the same, and no screen shows the log (Side
    effects bullet 3)
  - "Delete" when the server cannot remove the plugin's files (Rule 21)
  - the site's "Plugins" tab on an installation hosting no journal,
    since the seeded journal cannot be removed (Actors row 2; Rule 2)
- **Owned by another feature**:
  - the Section Editor and every other role refused at the Settings
    pages (Actors row 1;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenario 2)
  - "Permit changes to Settings" unticked {OJS OMP} (Settings bullet 4;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenario 11)
  - an installation with one journal, whose Site Settings have no
    "Plugins" tab (Settings bullet 3; *[Site settings](U60-site-settings.md)*)
  - a reload after pressing an inner tab, which opens the page's first
    tab (Rules 1–3; *Journal identity & about pages*, its
    [A7](U07-journal-identity-and-about-pages.md#a7); *Site settings*,
    its [A7](U60-site-settings.md#a7); *Hosted journals*)
  - a plugin that serves only journals, ticked on the site's list
    (Rule 14; *[Custom pages & blocks](U09-custom-pages-and-blocks.md)*,
    its [A8](U09-custom-pages-and-blocks.md#a8))

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed
unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | The "Plugin Gallery" tab stays on "Loading" forever when the server cannot reach PKP's website | 🐞 | low · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | "Upload A New Plugin" window never says which kind of file to choose | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A3](#a3) | Plugins: "Upgrade" with the installed or an older version blames "the version available in the gallery" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A5](#a5) | Plugins: an upgrade whose database step fails deletes the plugin, old version included, from every journal | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | Deleting a plugin: the notice that confirms it reads "successfuly deleted" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A9](#a9) | A refused tick or untick is explained by a raw code, and "Disable" stays open with its spinner | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A10](#a10) | Uploading a file that is not a plugin package shows PHP's archive error with a server path | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OJS1](#ojs1) | With its theme switched off, a journal's home page comes up blank for every visitor | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A4](#a4) | "Delete" is offered on plugins nobody can switch off, and on the theme in use | ❓ | minor | — |
| [A6](#a6) | A Site Administrator with no manager role in a journal cannot switch its plugins | ❓ | minor | — |
| [A8](#a8) | The theme a journal uses can be switched off | ❓ | user-visible | — |
| [OMP1](#omp1) | A press's list shows site-wide plugins to the Site Administrator only on a one-press installation | ✅ | invisible | — |
| [OMP2](#omp2) | A press lists the category headings in another order | ✅ | invisible | — |

### All apps

<a id="a1"></a>
**A1 — The "Plugin Gallery" tab stays on "Loading" forever when the server cannot reach PKP's website** · 🐞 · low · crash: server.
A journal manager or the site administrator opens "Plugins" and
presses "Plugin Gallery". When the server cannot connect to PKP's
website, the application fails on the server. The tab shows "Loading"
with a spinner that never ends, and no list or message. They expect an
empty list or a message that PKP's site cannot be reached.
"Installed Plugins" works as usual, and plugins can still be installed
from a downloaded package. But nobody is told that the gallery cannot be
reached, so the user may keep waiting or reloading. Settings › Website,
Site Settings and the Settings Wizard request the gallery's list as they
load, even when nobody presses "Plugin Gallery", so the server fails and
logs an error on every opening of these pages.
Every installation without outbound access to PKP's site meets it. During
an outage of PKP's site, an installation that normally reaches it meets
it too, once its cached copy of the list (kept for a day) has expired.
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Upload A New Plugin" window never says which kind of file to choose** · 🐞 · low.
The "Upload A New Plugin" window should open with "This form allows you
to upload and install a new plugin.  Please ensure the plugin is
compressed as a .tar.gz file.", as "Upgrade Plugin" opens with its own
line. Instead it shows the file field alone, so nothing tells the
administrator which kind of file to choose.
The plugin still installs when the right file is chosen. An administrator
who picks another kind of file only learns it was wrong from the refusal
after "Save".
Basis: probe, 2026-10-02. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Plugins: "Upgrade" with the installed or an older version blames "the version available in the gallery"** · 🐞 · low.
A Site Administrator who uploads, under a plugin's "Upgrade", the
version already installed or an older one is refused with "Plugin
already installed, and is newer than the version available in the
gallery." The sentence is wrong twice. It names a gallery, though the
file was uploaded from the computer. And at the same version, the
installed plugin is not newer.
The refusal itself is right: nothing changes, and only the reason
misleads.
Basis: probe, 2026-10-02. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Delete" on plugins nobody can switch off** · ❓ · minor.
The Site Administrator is offered "Delete" on every row, including the
rows whose box cannot be pressed ("TinyMCE Plugin", "Usage event", the
metadata and OAI formats) and the theme a journal uses; one "OK" removes
the plugin's files for the whole installation.
Question: should "Delete" be offered on a plugin the application needs,
or on a theme in use? Lean: no; hide it on the rows of Rule 10 and
refuse it for a theme any journal or the site uses, since the list
itself marks those plugins as not optional.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — Plugins: an upgrade whose database step fails deletes the plugin, old version included, from every journal** · 🐞 · medium.
When a Site Administrator upgrades a plugin and the new version's own
upgrade step fails (a database change that does not fit the install),
the notice says "Upgrade failed." but does not say that the plugin is
gone. The old version's files are deleted along with the new ones, and
the plugin leaves every journal's plugin list at once and stops working
everywhere.
The installation still records the old version as installed and
enabled. Uploading that same old version through "Upload A New Plugin"
brings the plugin back, but only if the administrator still has its
package. Until then, each request to the site writes an error to the
server's log.
Basis: probe, 2026-10-02. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Without a manager role, the Site Administrator cannot switch a journal's plugins** · ❓ · minor.
The Settings Wizard is the Site Administrator's way into any journal's
plugins, and a Site Administrator is offered every row there; but one
who holds no manager-level role in that journal is refused when ticking
or unticking the journal's own plugins ([A9](#a9)), and the rows'
arrows offer "Delete" and "Upgrade" but none of the plugin's own links,
such as "Settings". On a journal, Settings › Website also opens by its
address, with the same refused boxes; on a press and a preprint server
it answers the access-denied page (Journal identity & about pages,
[A1](U07-journal-identity-and-about-pages.md#a1)). The test installs
enrol the Site Administrator as a manager in every journal; an
installation that does not meets this at once.
Question: should a Site Administrator act on a journal's plugins
without a role there? Lean: yes, as the wizard's other tabs let them;
otherwise the rows should not offer the box.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Deleting a plugin: the notice that confirms it reads "successfuly deleted"** · 🐞 · low.
After a Site Administrator deletes a plugin from a "Plugins" list
("Delete", then "OK"), the notice that confirms it reads
`Plugin "<name>" successfuly deleted`, with "successfully" misspelt.
The plugin is deleted as asked: nothing is lost, only the wording. Only
the English text is misspelt.
Basis: probe, 2026-10-02. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The theme in use can be switched off** · ❓ · user-visible.
The list accepts unticking the theme a journal uses, with the ordinary
"Disable" window and the notice "The plugin "Default Theme" has been
disabled."; the journal's public pages then show with no styling (on a
journal the home page fails outright, [OJS1](#ojs1)), and Settings ›
Website › "Appearance" › "Theme" offers an empty list. Ticked again,
the pages are styled again.
Question: should the list refuse to disable the theme in use? Lean:
yes; refuse with a line pointing to Settings › Website › "Appearance" ›
"Theme", where another theme is chosen first.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A refused tick or untick is explained by a raw code, and "Disable" stays open with its spinner** · 🐞 · low.
A Site Administrator with no manager-level role in a journal who ticks
or unticks one of its plugins (A6) is refused, as the rule says, but
the browser's alert reads "##user.authorization.pluginLevel##" on a
journal and a preprint server instead of a reason; a press says "You
do not have sufficient privileges to manage this plugin.". After a
refused untick and the alert closed, the "Disable" window stays open
with a spinner that never stops (on 3.5 with "OK" and "Cancel"
disabled); Escape closes it, and on main so does "Cancel". After a
reload both boxes are as before. Expected: the refusal in words, and
the window closed.
Basis: probe, 2026-10-02. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — Uploading a file that is not a plugin package shows PHP's archive error with a server path** · 🐞 · low.
When the Site Administrator uploads a file that is not a plugin package
through "Upload A New Plugin", the upload should be refused with a
sentence saying the file is not a plugin package. Instead the notice is
a message from the server's archive handling that names the full path
of the uploaded file on the server, such as "Cannot create phar
'/home/e2e/pkp-e2e/checkouts/files/ojs-test-ds4/temp/txtCwku8e', file
extension (or combination) not recognised or the directory does not
exist".
Nothing is installed, but the message does not tell the administrator
what was wrong with the file or what to upload instead.
Basis: probe, 2026-10-02. <sup>f-a10</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — With its theme switched off, a journal's home page comes up blank for every visitor** · 🐞 · medium · crash: server.
After the theme a journal uses is unticked in the Plugins list, the
journal's home page should show its content unstyled, as its other pages
do. Instead the server fails and the page comes up blank, so readers who
arrive at the journal see nothing. On a press and a preprint server the
home page shows unstyled like the rest.
The journal manager is told only that the plugin was disabled, and the
page stays blank until the theme is ticked again. The same blank page
follows when the theme chosen for the journal cannot be loaded, as when
its folder is gone.
Basis: probe, 2026-10-02. <sup>f-ojs1</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Site-wide plugins in a press's list only on a one-press installation** · ✅ · invisible.
On a press, the Site Administrator's list shows the site-wide plugins
("Usage event") only while the installation hosts one press; with two
or more presses they are left out. A journal's and a preprint server's
list always show them to the Site Administrator. The row cannot be
changed in any case (Rule 10), so nothing is lost.
Basis: probe. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — Category headings in another order** · ✅ · invisible.
A press lists "Public Identifier Plugins" second and "Theme Plugins"
sixth (Fields); a journal and a preprint server keep the order of their
own application.
Basis: probe. <sup>f-omp2</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-27 on checkouts ojs `3162c105bf`, omp `72a01a026`, ops
`e9f6f4f550`, lib/pkp `1ad4a14bb`. The journal list is
`APP\controllers\grid\settings\plugins\SettingsPluginGridHandler`, the
site list `PKP\controllers\grid\admin\plugins\AdminPluginGridHandler`,
both on `PKP\controllers\grid\plugins\PluginGridHandler`; the gallery is
`PKP\controllers\grid\plugins\PluginGalleryGridHandler` on both.
Subclass chain (multi-app rule 8): OJS and OPS `SettingsPluginGridHandler`
are byte-identical; OMP's differs only by the one-press test (OMP1).
`AdminPluginGridHandler`, `PluginGridHandler`, `PluginGridRow`,
`PluginGridCellProvider`, the gallery classes, `UploadPluginForm` and
`PluginHelper` live in lib/pkp alone. Every body claim was live-probed
2026-09-27 on the three apps' test installs, except where a note below
says it is read from the code.

<a id="fn-a"></a>
**a** — Roles. `SettingsPluginGridHandler::__construct()` assigns
`[ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER]` to `manage` plus the parent's
`enable`, `disable`, `manage`, `fetchGrid`, `fetchCategory`, `fetchRow`;
`PluginGridHandler::__construct()` gives `uploadPlugin`, `upgradePlugin`,
`deletePlugin`, `saveUploadPlugin`, `uploadPluginFile` to
`ROLE_ID_SITE_ADMIN` alone. `SettingsPluginGridHandler::authorize()`
adds `CanAccessSettingsPolicy` (a site admin group, or a manager group
with `permitSettings`) and, for a request naming a plugin,
`PluginAccessPolicy`: `enable`/`disable`/`manage` in
`ACCESS_MODE_MANAGE`, where a manager passes only for a plugin that is
not site-wide and a site admin only for a site-wide one
(`PluginLevelRequiredPolicy`), the two combined permit-overrides; every
other op in `ACCESS_MODE_ADMIN`, site admin only.
`UserRolesRequiredPolicy` collects the user's groups of the context and
of the site, so inside a journal the Site Administrator carries both
roles. `AdminPluginGridHandler` assigns `ROLE_ID_SITE_ADMIN` alone; a
request with a `verb` is `ACCESS_MODE_MANAGE` (site-wide plugins only),
`enable`/`disable` are `ACCESS_MODE_ADMIN` (any plugin).
`PluginGridRow::_canEdit()` gives a plugin's own links
(`Plugin::getActions()`) to `ROLE_ID_SITE_ADMIN` on a site-wide plugin
and to `ROLE_ID_MANAGER` on any other; "Delete" and "Upgrade" are added
when the user roles hold `ROLE_ID_SITE_ADMIN` ("Upgrade" also needs
`PluginHelper::isUploadAllowed()`); `PluginGridHandler::initialize()`
adds "Upload A New Plugin" under the same two conditions.
`PluginGalleryGridHandler` assigns `fetchGrid`, `fetchRow`, `viewPlugin`
to manager and site admin, `installPlugin`, `upgradePlugin` to site
admin, behind `CanAccessSettingsPolicy`. Seen 2026-09-24 in passing on
the three apps, during the Custom pages & blocks claim check: the Site
Administrator's rows carry "Delete" and "Upgrade", a Journal Manager's
do not. Scratch contexts enrol the Site Administrator as a manager
(`ContextFactory`; seed-facts). Live-probed 2026-09-27 (Actors rows
1–8; three apps, a scratch journal holding every permission level):
the Journal Manager, the Editor and the Production Editor (OJS, OMP) and
the Site Administrator open Settings › Website › "Plugins"; the Section
Editor, the assistant-level roles, the Reviewer, the Author and the
Reader land on `user/authorizationDenied`; only the Site
Administrator's rows carry "Delete" and "Upgrade", on the journal
lists, the site's list and the wizard's, and only their list header
"Upload A New Plugin". The install policy was "on" throughout (fn-q).
Settings bullet 4, live-probed the same day: an Editor whose role has
"Permit changes to Settings" unticked got the access-denied page at
Settings › Website (OJS, OMP); on OPS the "Roles" list's "Preprint
Server manager" row has no arrow, and no other manager-level role is
listed.

<a id="fn-b"></a>
**b** — Where the lists are. `lib/pkp/templates/management/website.tpl`,
tab `plugins` with `installedPlugins` (`SettingsPluginGridHandler`
`fetchGrid`) and, inside `{if $canSeePluginGallery}`, `pluginGallery`
(`PluginGalleryGridHandler` `fetchGrid`), each through
`{load_url_in_div}`, which requests on page load;
`ManagementHandler::website()` assigns `canSeePluginGallery =
PluginHelper::isGalleryAllowed()`, always true.
`lib/pkp/templates/admin/settings.tpl` tab `plugins`
(`installedPlugins` → `AdminPluginGridHandler`, `pluginGallery` →
`PluginGalleryGridHandler`) inside
`{if $componentAvailability['sitePlugins']}`;
`AdminHandler::siteSettingsAvailability()` sets `sitePlugins` to
`getCount() !== 1`. `lib/pkp/templates/admin/contextSettings.tpl` tab
`plugins` with `installed` and `gallery`, both built with
`context=$editContext->getPath()`; `AdminHandler::wizard()` assigns
`canSeePluginGallery`. Labels: `common.plugins` "Plugins",
`manager.plugins.installed` "Installed Plugins",
`manager.plugins.pluginGallery` "Plugin Gallery". Seed-facts: a fleet
with `publicknowledge` alone shows no site "Plugins" tab. Live-probed
2026-09-27 (Rules 1–3; three apps): both `fetch-grid` requests go out
before the "Plugins" tab is pressed; with one context Site Settings
shows "Site Setup" alone, with several it adds "Appearance",
"Announcements" and "Plugins". Pressing an inner tab writes
`#installedPlugins` / `#pluginGallery` (wizard `#installed` /
`#gallery`); a reload or a typed copy of that address opened the first
tab, `#plugins` reopened "Installed Plugins" (Website and Site
Settings), `#plugins/pluginGallery` the gallery tab. On Site Settings a
reload after "Plugin Gallery" (address `#pluginGallery`) opened "Site
Setup". The wizard's top tabs read "Journal Settings" / "Setup" (OMP) /
"Server Settings" (OPS), then "Plugins"; a tick made in the wizard
showed on the journal's Website list, and the reverse.

<a id="fn-c"></a>
**c** — The list. `PluginGridHandler::loadData()` returns
`PluginRegistry::getCategories()` (the app's
`Application::getPluginCategories()`: OJS and OPS `metadata, blocks,
gateways, generic, importexport, oaiMetadataFormats, paymethod, pubIds,
reports, themes`; OMP `metadata, pubIds, blocks, generic, gateways,
themes, importexport, oaiMetadataFormats, paymethod, reports`);
`loadCategoryData()` loads each category, leaves out
`getHideManagement()` plugins, `ksort`s by the plugin's registry name,
and inserts a version row for a plugin found on disk without one.
`PluginCategoryGridRow::getCategoryLabel()` →
`plugins.categories.<category>` ("Metadata Plugins", "Block Plugins",
"Gateway Plugins", "Generic Plugins", "Import/Export Plugins", "OAI
Metadata Format Plugins", "Payment Plugins", "Public Identifier
Plugins", "Report Plugins", "Theme Plugins"); an empty category shows
`grid.noItems` "No Items".
Columns `common.name` "Name", `common.description` "Description"
(HTML), `common.enabled` "Enabled"; title `common.plugins`. OPS has no
`plugins/paymethod`, `plugins/pubIds` or `plugins/reports` folder, and
no app ships a plugin under `plugins/gateways`; seed-facts records the
OPS "Public Identifier Plugins" heading with no rows (2026-09-24).
Live-probed 2026-09-27 (Rules 4, 5; three apps, journal and site
lists): no heading carries a count on screen; the empty headings as
Rule 4 lists them. The Site Administrator's journal list and the
site's list name the same plugins, id by id (OJS 46, OPS 17; OMP's site
list adds "Usage event", OMP1).

<a id="fn-d"></a>
**d** — Site-wide plugins. `Plugin::isSitePlugin()` is false; overrides:
`PKPUsageEventPlugin::isSitePlugin()` true (display name
`plugins.generic.usageEvent.displayName` "Usage event"; `getEnabled()`
true, `getCanEnable()`/`getCanDisable()` false), and
`CustomBlockManagerPlugin::isSitePlugin()` true only when the request
has no context. `SettingsPluginGridHandler::loadCategoryData()` keeps
site-wide plugins only when the user roles hold `ROLE_ID_SITE_ADMIN`;
OMP adds `$singlePress` (`PressDAO::getAll()` yields one press) to that
test. The scenario API refuses `usageeventplugin` as site-wide
(scenarios.md `plugins`). Live-probed 2026-09-27 (Rule 6; Actors row
4): "Usage event" under "Generic Plugins", ticked and locked, in the
Site Administrator's journal lists and absent from the managers' (OJS,
OPS; OMP on a one-press install only); "Custom Block Manager" tickable
in every journal list and listed unticked on the site's.

<a id="fn-e"></a>
**e** — Search. `pluginGridFilter.tpl`: a `select` `category` (from
`renderFilter()`: `grid.plugin.allCategories` "All Categories" plus
each category label) and a `text` `pluginName`, button `common.search`
"Search". `getFilterSelectionData()`; `loadData()` narrows to the chosen
category; `loadCategoryData()` keeps plugins whose `getDisplayName()`
contains the text (`stristr`). The filter sits behind a "Search" link
(`.pkp_linkaction_search`) in the list's header. Live-probed 2026-09-27
(Rule 7): td4.

<a id="fn-f"></a>
**f** — Switching. `PluginGridCellProvider::getCellActions()` on the
`enabled` column: enabled and `getCanDisable()` → `disable` as a
`RemoteActionConfirmationModal` (text `grid.plugin.disable` "Are you
sure you want to disable this plugin?", title `common.disable`
"Disable"); disabled and `getCanEnable()` → `enable` as a plain
`AjaxAction`. `PluginGridHandler::enable()`/`disable()`:
`Plugin::setEnabled()`, an `AuditLog` line, then
`createTrivialNotification()` with `NOTIFICATION_TYPE_PLUGIN_ENABLED`
/ `_DISABLED`, whose messages are `common.pluginEnabled` "The plugin
"{$pluginName}" has been enabled." and `common.pluginDisabled` "The
plugin "{$pluginName}" has been disabled."; the grid refreshes the row
(`DataChangedEvent`). Live-probed 2026-09-25, OJS, during the JATS &
body text claim check: the Journal Manager and the Editor ticked and
unticked "JATS Template Plugin" with these notices and the "Disable"
window's "OK" and "Cancel". The same window and notices are recorded as
verified by Web feeds, OAI-PMH and Search-engine metadata & analytics
on the three apps. Live-probed 2026-09-27 (Rules 8, 9; three apps):
td6, td21; the Editor (OJS, OMP) ticked the same way.

<a id="fn-g"></a>
**g** — Locked boxes. `Plugin::getEnabled()` true and
`getCanEnable()`/`getCanDisable()` false for plugins not built on
`LazyLoadPlugin`: `MetadataPlugin`, `OAIMetadataFormatPlugin` (DC,
MARC, MARC21; OJS `OAIMetadataFormatPlugin_JATS` overrides),
`ImportExportPlugin`, `ReportPlugin`. `TinyMCEPlugin::getCanDisable()`
false (display name `plugins.generic.tinymce.name` "TinyMCE Plugin").
`PluginGridCellProvider::getTemplateVarsFromRowColumn()` sets
`disabled` from those; `selectStatusCell.tpl` renders
`disabled="disabled"`. OAI-PMH records DC, MARC and MARC21 as ticked and
not pressable. Live-probed 2026-09-27 (Rule 10): td5.

<a id="fn-h"></a>
**h** — Per journal. `LazyLoadPlugin::getEnabled()`/`setEnabled()`
read and write the `enabled` setting for `getCurrentContextId()` (the
request's journal, or 0 on the site), or for 0 when `isSitePlugin()`.
Seed-facts: "Google Analytics Plugin" unticked on `publicknowledge`,
scratch contexts and the site's list (2026-09-24). Live-probed
2026-09-27 (Rules 5, 11): td6.

<a id="fn-i"></a>
**i** — Themes. `ThemePlugin` extends `LazyLoadPlugin` without
overriding `getCanDisable()`; `ThemePlugin::register()` initialises a
theme only when `isActive()` (the context's or site's
`themePluginPath`), and the template manager loads
`PluginRegistry::loadCategory('themes', true)`, enabled themes only.
`PluginGridHandler::disable()` checks nothing about the active theme.
Display name `plugins.themes.default.name` "Default Theme". OJS's
`IndexHandler` reads an option of the active theme, which is missing
then (OJS1). Live-probed 2026-09-27 (Rule 12): td7.

<a id="fn-j"></a>
**j** — Row links. `PluginGridRow::initialize()` adds
`Plugin::getActions()` when `_canEdit()` (fn-a), then `delete` and
`upgrade` (`grid.action.upgrade` "Upgrade") for the Site
Administrator. `gridRow.tpl` draws the `show_extras` arrow (screen-reader
text `grid.settings` "Settings") only when the row has actions, and the
actions in a `row_controls` line under the row. Examples of a plugin's
own links: `ImportExportPlugin::getActions()` (`manager.importExport`
"Import/Export Data", to Tools), `ReportPlugin::getActions()`
(`manager.statistics.reports` "Reports", while enabled);
`CustomBlockManagerPlugin` adds "Manage Custom Blocks" while enabled.
Live-probed 2026-09-27 (Rules 13, 14; three apps): td8, td9; "Reports"
downloaded `articles-…csv`, `reviews-…csv` and `subscriptions-…csv`
(OJS) and `monographs-…csv`, `reviews-…csv` (OMP), while "COUNTER
Reports" opened `stats/reports/report?pluginName=CounterReportPlugin`,
headed "COUNTER Reports"; "Native XML Plugin"'s "Import/Export Data"
opened its page under Tools. Seen
2026-09-26, OJS, during the harness parity drive for the JATS metadata
format: the row's arrow gave "Settings", "Delete", "Upgrade" to the
Site Administrator. Custom pages & blocks records "Static Pages Plugin"
on the site's list (its A8).

<a id="fn-k"></a>
**k** — Upload. `PluginGridHandler::uploadPlugin()` →
`_showUploadPluginForm(PLUGIN_ACTION_UPLOAD)`; `upgradePlugin()` →
`PLUGIN_ACTION_UPGRADE`; modal titles `manager.plugins.upload` "Upload
A New Plugin" and `manager.plugins.upgrade` "Upgrade Plugin".
`uploadPluginForm.tpl` prints `manager.plugins.uploadDescription` only
when `$function == 'install'` and `manager.plugins.upgradeDescription`
when `'upgrade'`; the constants are `'upload'` and `'upgrade'`. Field
`manager.plugins.uploadPluginDir` "Select plugin file" (required), the
`fileUploadContainer.tpl` widget (`common.upload.dragFile`,
`common.upload.addFile` "Upload File", `common.upload.changeFile`
"Change File"), `common.save`, `common.requiredField`.
`uploadPluginFile()` stores a temporary file; `saveUploadPlugin()` runs
`UploadPluginForm::execute()`, which calls
`PluginHelper::installPlugin()` or `upgradePlugin()` and shows a
trivial success or error notification with the exception's message,
then returns a `DataChangedEvent`. `installPlugin()` unpacks with
`PharData` into a random temporary folder, needs a folder holding
`version.xml` (`VersionCheck::getValidPluginVersionInfo()`), copies it to
`plugins/<category>/<product>` and runs its `install.xml` (or
`defaultPluginInstall.xml`); success message
`manager.plugins.installSuccessful` "Successfully installed version
{$versionNumber}". The window's buttons are `common.cancel` "Cancel" (a
link) and "Save". Live-probed 2026-09-27 (Rules 15, 16): td10, td16.

<a id="fn-l"></a>
**l** — Upload refusals, in `PluginHelper::installPlugin()` and
`extractPlugin()`: installed and folder present →
`manager.plugins.pleaseUpgrade` when the installed version is older,
`manager.plugins.installedVersionNewest` "Plugin already installed and
up-to-date." otherwise; no folder with `version.xml` →
`manager.plugins.invalidPluginArchive`; a `version.xml` whose type is
not `plugins.<category>` or whose names fail the check →
`manager.plugins.versionFileInvalid`. A file `PharData` cannot open
throws its own `UnexpectedValueException`, shown as the notice (A10).
`extractPlugin()` looks through the unpacked folder's entries, the
folder itself (`.`) included, so a `version.xml` at the archive's root
passes. `UploadPluginForm` validates `temporaryFileId` as required
(`manager.plugins.uploadFailed` "Please ensure a file was selected for
upload."): "Save" with no file sends the form, and the failed
validation reaches the screen as a red notice while the window stays
open. Live-probed 2026-09-27 (Rule 17; three apps): td11–td14; an
archive whose entries are `version.xml`, the plugin's class file and
`index.php` at its root installed with "Successfully installed version
1.0.0.0".

<a id="fn-m"></a>
**m** — Upgrade. `PluginHelper::upgradePlugin()`: category mismatch →
`manager.plugins.wrongCategory`; product mismatch →
`manager.plugins.wrongName`; not installed →
`manager.plugins.pleaseInstall`; `compare() >= 0` →
`manager.plugins.installedVersionNewer` ("…newer than the version
available in the gallery."). Then `rmtree()` of
`plugins/<category>/<plugin>`, `copyDir()` of the new folder, and the
new `upgrade.xml` through `Upgrade::execute()`; on any `Throwable` the
catch `rmtree()`s the destination again and rethrows
(`manager.plugins.upgradeFailed` "Upgrade failed. {$errorString}").
Success: `manager.plugins.upgradeSuccessful` "Successfully upgraded to
version {$versionString}". The `enabled` setting is untouched.
Live-probed 2026-09-27 (Rules 18–20; three apps): td15, td16, f-a5.

<a id="fn-n"></a>
**n** — Delete. `PluginGridRow` adds `delete` as a
`RemoteActionConfirmationModal` (`manager.plugins.deleteConfirm`, title
`common.delete` "Delete"). `PluginGridHandler::deletePlugin()`: with a
current version row, `rmtree()` of `plugins/<category>/<product>` and
of `lib/pkp/plugins/<category>/<product>`; folders still present →
error notification `manager.plugins.deleteError`; else
`VersionDAO::disableVersion()`, an `AuditLog` line and success
`manager.plugins.deleteSuccess` "Plugin "{$pluginName}" successfuly
deleted"; no version row → `manager.plugins.doesNotExist`. Nothing
checks `getCanDisable()`, the active theme or the install policy.
Live-probed 2026-09-27 (Rule 21): td16, td17.

<a id="fn-o"></a>
**o** — Gallery. `PluginGalleryDAO::getNewestCompatible()` reads each
address of `plugin_gallery_urls` (default
`PLUGIN_GALLERY_XML_URL` `https://pkp.sfu.ca/ojs/xml/plugins.xml`,
queried with the application's name and version), keeps the newest
compatible release per plugin keyed `category/product` (so a plugin in
two lists shows once), filters by category and by the text anywhere in
the serialised plugin. `getExternalDocument()` catches every failure
and returns null (cached through `Cache::remember()` for a day, which
does not store null); `_getDocument()` then calls
`DOMDocument::loadXML()` with an empty string, which throws a
`ValueError` ("Argument #1 ($source) must not be empty") that
`PluginGalleryGridHandler::loadData()` does not catch (it catches
`GuzzleHttp\Exception\TransferException` only). The test installs'
`config.test.inc.php` routes outbound HTTP to a dead proxy
(`http://127.0.0.1:9`), so the gallery's list never loads there (A1):
Rules 22 and 24, the gallery's filter, list and columns in Fields,
Actors row 9 past the tab itself, and Settings bullet 2 are read from
the code. The tab itself was live-probed 2026-09-27 as the second inner
tab of all three screens, three apps. Filter `pluginGalleryGridFilter.tpl`
(`category`, `pluginText`, "Search"). Columns: `common.name` with a
`moreInformation` link (`viewPlugin`), `common.description` (the
summary), `common.status` from
`PluginGalleryGridCellProvider`: `manager.plugins.installedVersionNewer.short`
"Newer than available version", `…Older.short` "Can be upgraded",
`…Newest.short` "Up to date", `manager.plugins.noCompatibleVersion.short`
"Not Available", nothing for `PLUGIN_GALLERY_STATE_AVAILABLE`.

<a id="fn-p"></a>
**p** — Details and install. `PluginGalleryGridHandler::viewPlugin()`
picks the status key per `GalleryPlugin::getCurrentStatus()` and, for a
site admin (`Validation::isSiteAdmin()`) with an allowed step, an
`installPlugin` `RemoteActionConfirmationModal` (`grid.action.install`
"Install" / `grid.action.upgrade` "Upgrade";
`manager.plugins.installConfirm` / `upgradeConfirm`); `viewPlugin.tpl`
shows the button for `older`/`notinstalled` and otherwise the status
sentence, then certifications, `manager.plugins.pluginGallery.installed`,
`…version`, the release description, maintainer, homepage
(`target="_blank"`), description and installation instructions, the
release part omitted for `incompatible`. `installPlugin()` refuses by
exception when the policy forbids the step, redirects without acting on
a bad CSRF token, downloads `getReleasePackage()` through the app's HTTP
client, compares `md5_file()` with `getReleaseMD5()`, then
`PluginHelper::installPlugin()`/`upgradePlugin()` with
`$gallerySource = true`, notifies success or the exception's message,
and redirects to `management/settings/website#plugins` when the request
has a context, else `admin/settings#plugins`. Read from the code (Rules
25, 26; Actors row 10; the details window in Fields): the gallery's
list never loads on the test installs (fn-o), so no name can be
pressed. Live-probed 2026-09-27: the address
`…/management/settings/website#plugins` typed opens "Plugins" ›
"Installed Plugins", where Rule 26's reload lands.

<a id="fn-q"></a>
**q** — Install policy. `PluginHelper::getInstallMode()` reads
`security.allow_plugin_install` (default `on`; a boolean maps to
`on`/`off`; an unknown string fails closed to `off`);
`getCapabilities()`: `canSeeGallery` always true; `on` → upload, gallery
install, gallery upgrade; `gallery_only` → gallery install and upgrade;
`upgrade_only` → gallery upgrade; `off` → none. `isUploadAllowed()`
gates "Upload A New Plugin", the row "Upgrade" and
`installPlugin()`/`upgradePlugin()` when not from the gallery;
`isGalleryInstallAllowed()`/`isGalleryUpgradeAllowed()` gate the
gallery. `config.TEMPLATE.inc.php` (three apps) documents the four
values under `[security]` and leaves `plugin_gallery_urls` commented;
the test installs run `on`. Live-probed 2026-09-27 (Settings bullet 1
at "on", preamble; three apps): "Upload A New Plugin" and the rows'
"Upgrade" and "Delete" for the Site Administrator alone on every list,
the "Plugin Gallery" tab for every role that opens "Plugins"; View
System Information shows the row "allow_plugin_install" "1" and no
`plugin_gallery_urls` row. The other values are read from the code:
the configuration is shared by every test and no drive changes it.

<a id="fn-r"></a>
**r** — Notices. Every message of this spec is a
`createTrivialNotification()` to the acting user (toast). Live-probed
2026-09-27 (Side effects bullet 1; three apps): ticking and unticking
"Google Analytics Plugin" gave the two notices at the top right, the
second under the first; the mail catcher received nothing, the
header's Tasks and the context's `notifications` rows stayed empty,
and no `event_log` row was written.

<a id="fn-s"></a>
**s** — The site's tab with no journal. Read from the code
(`AdminHandler::siteSettingsAvailability()`, fn-b): the test installs
always host the seeded journal, which cannot be removed, so only the
one-journal and many-journal ends were live-probed 2026-09-27 (three
apps).

<a id="fn-t"></a>
**t** — A deletion that fails. Read from the code (fn-n):
`deletePlugin()` checks the folders are gone after `rmtree()`. Reaching
it needs a plugin folder the web server cannot remove; every "OK" of
the 2026-09-27 drive removed the folder. It settles with an uploaded
scratch plugin whose folder is made unwritable before "OK".

<a id="fn-u"></a>
**u** — The server's log. Read from the code, since no screen shows
the log: `AuditLog::log()` returns at once unless `[logs] log_audit`
is on, and otherwise records `PLUGIN_ENABLE`, `PLUGIN_DISABLE`,
`PLUGIN_INSTALL`, `PLUGIN_UPGRADE`, `PLUGIN_UNINSTALL` to the server's
log channel. `config.TEMPLATE.inc.php` and the test installs'
configuration leave `log_audit` commented out (off).

<a id="fn-sc"></a>
**sc** — Scenarios. Each scratch journal comes from `POST
scenarios/context` with a throwaway `manager` (scenario 2's second
journal with its own); the Site Administrator is `admin` (password
`admin`), enrolled as a manager in every scratch context, so a scratch
journal and `publicknowledge` make the "two or more" of Rule 2 and of
OMP1. Seed-facts: "Google Analytics Plugin" arrives unticked on every
scratch context and on the site's list, "Custom Block Manager"
unticked on the site's list, "Web Feed Plugin" ticked with "Settings"
in its row. Scenarios 1 and 2 run with the rest of the suite; 3 ticks
plugins on the site's list, which every test shares, and 4 and 5 put
plugin folders into the checkout that every fleet of the app serves, so
these three run alone (`@solo`) and put back what they changed: 3
unticks the site's "Google Analytics Plugin" after its control, 4
deletes its two plugins (through the row's "Delete" or the tooling), 5
deletes its own through the scenario. The packages are built by the
test from files kept with the tests, the way
`shared/playwright/checks/U62/K2/pkg.js` builds its scratch plugins
(`u62k2test` at three versions, `u62k2on` packed at the archive's root
with `getEnabled()` answering true, `nover`, `badtype`), renamed for
the scenarios; the block plugin and "Harbour Other Plugin" of scenario
5 are built the same way. Scenario 5's given, "Harbour Test Plugin" at
1.0.0.0 installed and ticked, is an upload through "Upload A New
Plugin" and a tick on the scratch journal's list (or `plugins:
{<plugin>: {enabled: true}}` once installed) before the scenario
starts. Live-probed 2026-09-27: on each scratch context Users & Roles
lists `admin` as "Journal manager" ("Press manager", "Preprint Server
manager"), and "Google Analytics Plugin" arrives unticked.

<a id="fn-f-a1"></a>
**f-a1** — Live-probed 2026-09-27 (Rule 23; three apps): `GET
…/grid/plugins/plugin-gallery-grid/fetch-grid` answered 500 with an
empty body once per load of Settings › Website, of Administration ›
Site Settings and of the Settings Wizard, whichever tab showed, on
reload and on each typed address; pressing the gallery tab sent
nothing more. The server log reads `Uncaught ValueError:
DOMDocument::loadXML(): Argument #1 ($source) must not be empty`, from
`PluginGalleryDAO`, reached from `PluginGalleryGridHandler::loadData()`.
Seen before on the same installs during other features' drives,
2026-09-04, 2026-09-06, 2026-09-24, 2026-09-25 and 2026-09-27 (system
administration). Mechanism fn-o.
Issue report: [pkp-e2e#510](https://github.com/jardakotesovec/pkp-e2e/issues/510) ([docs/issues/U62-A1-plugin-gallery-offline-stays-loading.md](../issues/U62-A1-plugin-gallery-offline-stays-loading.md)).

<a id="fn-f-a2"></a>
**f-a2** — fn-k: the template tests `'install'`, the action is
`'upload'`. Live-probed 2026-09-27: td10.
Issue report: [pkp-e2e#505](https://github.com/jardakotesovec/pkp-e2e/issues/505) ([docs/issues/U62-A2-upload-plugin-window-no-file-line.md](../issues/U62-A2-upload-plugin-window-no-file-line.md)).

<a id="fn-f-a3"></a>
**f-a3** — fn-m: `upgradePlugin()` reuses
`manager.plugins.installedVersionNewer`, written for the gallery.
Live-probed 2026-09-27: td15.
Issue report: [pkp-e2e#508](https://github.com/jardakotesovec/pkp-e2e/issues/508) ([docs/issues/U62-A3-upgrade-refusal-blames-gallery.md](../issues/U62-A3-upgrade-refusal-blames-gallery.md)).

<a id="fn-f-a4"></a>
**f-a4** — fn-n: `deletePlugin()` and `PluginGridRow` check the role
alone. Live-probed 2026-09-27: td17.

<a id="fn-f-a5"></a>
**f-a5** — fn-m: the `catch` of `PluginHelper::upgradePlugin()` removes
the destination after the old folder was removed; the version row of
the old version stays current. Live-probed 2026-09-27 (three apps) with
a scratch plugin at 1.0.1.0 and a 1.0.2.0 package whose own
`upgrade.xml` fails on purpose (`<code function="abort">`): amber
notice "Upgrade failed. ##…##" (the package's message is not a locale
key), the row gone at once from the journal lists and the site's, the
folder `plugins/generic/<plugin>` gone while the versions table kept
1.0.1.0 current. 1.0.0.0 through "Upload A New Plugin" then gave the
downgrade notice; 1.0.1.0 gave "Successfully installed version
1.0.1.0", ticked again where it had been ticked.
Issue report: [pkp-e2e#509](https://github.com/jardakotesovec/pkp-e2e/issues/509) ([docs/issues/U62-A5-failed-upgrade-removes-plugin.md](../issues/U62-A5-failed-upgrade-removes-plugin.md)).

<a id="fn-f-a6"></a>
**f-a6** — fn-a: in `ACCESS_MODE_MANAGE` the site admin branch of
`PluginAccessPolicy` requires a site-wide plugin, and `_canEdit()`
requires `ROLE_ID_MANAGER` for a journal plugin. Seed-facts records how
the state is built (the Site Administrator's manager role ended on the
journal's Users & Roles) and that the Settings Wizard stays open to such
an administrator. Live-probed 2026-09-27: td19.

<a id="fn-f-a7"></a>
**f-a7** — `lib/pkp/locale/en/manager.po`
`manager.plugins.deleteSuccess`. Live-probed 2026-09-27: td16.
Issue report: [pkp-e2e#507](https://github.com/jardakotesovec/pkp-e2e/issues/507) ([docs/issues/U62-A7-plugin-delete-notice-misspelt.md](../issues/U62-A7-plugin-delete-notice-misspelt.md)).

<a id="fn-f-a8"></a>
**f-a8** — fn-i. Live-probed 2026-09-27: td7.

<a id="fn-f-a9"></a>
**f-a9** — fn-a: the site admin branch of `PluginAccessPolicy` refuses
a journal plugin. Live-probed 2026-09-27 (three apps; OJS in two runs):
td19. The server answers the `enable` and `disable` requests with
`status:false` and a message the screen never shows:
"##user.authorization.pluginLevel##" (an untranslated key) on a journal
and a preprint server, "You do not have sufficient privileges to manage
this plugin." on a press.
Issue report: [docs/issues/U62-A9-plugin-switch-refusal-raw-key.md](../issues/U62-A9-plugin-switch-refusal-raw-key.md).
Issue report: [docs/issues/U62-A9-refused-confirmation-window-keeps-spinning.md](../issues/U62-A9-refused-confirmation-window-keeps-spinning.md).

<a id="fn-f-a10"></a>
**f-a10** — fn-l: `PharData`'s own exception message reaches the
notice. Live-probed 2026-09-27: td14.
Issue report: [pkp-e2e#506](https://github.com/jardakotesovec/pkp-e2e/issues/506) ([docs/issues/U62-A10-upload-plugin-not-archive-server-message.md](../issues/U62-A10-upload-plugin-not-archive-server-message.md)).

<a id="fn-f-ojs1"></a>
**f-ojs1** — fn-i. Live-probed 2026-09-27 (OJS, two runs): with
"Default Theme" unticked, `GET /index.php/<journal>` answered 500 with
an empty page; server log `Call to a member function getOption() on
null` in `IndexHandler`. OMP's and OPS's home pages, and OJS's "About
the Journal" and login pages, showed unstyled.
Issue report: [pkp-e2e#504](https://github.com/jardakotesovec/pkp-e2e/issues/504) ([docs/issues/U62-OJS1-theme-off-journal-home-page-blank.md](../issues/U62-OJS1-theme-off-journal-home-page-blank.md)).

<a id="fn-f-omp1"></a>
**f-omp1** — fn-d. The one-press test predates the 2022 controller
renames (`git log -S singlePress` stops at `efe071fb2`, 2022-07-28), so
it reads as long-standing intent (multi-app rule 6). Live-probed
2026-09-27 at both ends: present on a one-press install, absent with
seven presses; OJS and OPS lists show the row with seven and six
contexts.

<a id="fn-f-omp2"></a>
**f-omp2** — fn-c: OMP `Application::getPluginCategories()`.
Live-probed 2026-09-27: td2.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27, three apps: as a scratch journal's
Journal Manager, Settings › Website › "Plugins" showed "Installed
Plugins" (open) and "Plugin Gallery", the title "Plugins" with "Search"
alone at its right, and the columns "Name", "Description", "Enabled";
the Site Administrator's header added "Upload A New Plugin".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27, three apps, as the Journal Manager
and on the site's list: the headings in the orders of the Fields
table, none followed by a number; "No Items" under "Gateway Plugins"
everywhere and, on a preprint server, under "Payment Plugins",
"Public Identifier Plugins" and "Report Plugins".

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27: "Usage event" under "Generic
Plugins", ticked, its box not pressable, in the Site Administrator's
list and absent from the Journal Manager's (OJS, OPS); on OMP present
on a one-press install, absent with seven presses (OMP1).

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27, three apps: the filter is hidden on
arrival and after each search. "feed" left "Announcement Feed Plugin"
and "Web Feed Plugin" (OJS), "Web Feed Plugin" (OMP, OPS), every other
heading reading "No Items"; "FEED" the same, and Enter searched too; a
text matching nothing left every heading with "No Items"; "Block
Plugins" left that heading alone, and with "feed" too it read "No
Items"; "All Categories" with the box empty brought every row back.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27, three apps: ticked and locked, the
same for the Journal Manager and the Site Administrator: "Dublin Core
1.1 metadata", "TinyMCE Plugin", "Usage event" (Site Administrator),
the import/export and report plugins, and the OAI formats (OJS "DC
Metadata Format", "MARC", "MARC21"; OMP and OPS "DC Metadata Format").
No unticked box is locked (OJS's "JATS Metadata Format" arrives
unticked and can be pressed); a click on a locked box does nothing.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27, three apps, scratch journals X and
Y: X's Journal Manager ticked "Google Analytics Plugin": the notice
"The plugin "Google Analytics Plugin" has been enabled." at the top
right, ticked after a reload; Y's row and the site's stayed unticked.
Ticked on the site's list, X stayed ticked and Y unticked after a
reload; the site's tick was put back.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27, three apps: "Default Theme" unticked
with the "Disable" window's "OK" gave "The plugin "Default Theme" has
been disabled."; "Appearance" › "Theme" then offered an empty "Theme"
list and "Save"; the public pages showed unstyled (browser default
font, no style sheet) and OJS's home page failed (f-ojs1); ticked
again, the home page was styled again.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27, three apps: for the Journal Manager,
the Editor and the Production Editor (OJS, OMP), "Web Feed Plugin"'s
arrow opened "Settings" and closed on a second press, and the row lost
its arrow while unticked; "Google Scholar Indexing Plugin" had none.
The Site Administrator had an arrow on every row: "Settings", "Delete",
"Upgrade" on "Web Feed Plugin".

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27, three apps, on Administration › Site
Settings › "Plugins": every row's arrow gave "Delete" and "Upgrade";
"Usage event" listed, ticked and locked, with no link of its own;
"Custom Block Manager", ticked, added "Manage Custom Blocks", gone again
once unticked. Ticking "Web Feed Plugin" and "Static Pages Plugin"
(OJS, OMP) there gave the enabled notice and left the site's front page
as it was; each was unticked again.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27, three apps, on the journal list, the
site's list and the wizard's: "Upload A New Plugin" with no line above
"Select plugin file"; "Upgrade Plugin" with its line; the asterisk,
"Drag and drop a file here to begin upload", "Upload File", and after
a file is up its name and "Change File"; "Cancel" and "Close" close
each window with no row changed. Dropping a file was not driven:
automation cannot start the uploader by a drop.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27, three apps: "Save" with no file
sent the form once; the window stayed open, the red notice "Please
ensure a file was selected for upload." showed at the top right, and
no row changed.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27, three apps: "Web Feed Plugin"
packed unchanged, and a scratch plugin at 1.0.0.0 while 1.0.1.0 was
installed, gave "Plugin already installed and up-to-date."; the
scratch plugin at 1.0.1.0 while 1.0.0.0 was installed gave "Plugin
already exists, but is newer than installed version. Please upgrade
instead". Each closed the window with an amber notice; no row and no
folder changed.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27, three apps: a folder with no
"version.xml" gave "The uploaded plugin archive does not contain a
folder that corresponds to the plugin name."; a "version.xml" of type
`core.…` gave "version.xml in plugin directory contains invalid
data."

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-27, three apps: a plain text file gave
"Cannot create phar '…', file extension (or combination) not
recognised or the directory does not exist", with the server path of
the uploaded temporary file; a text file named ".tar.gz" gave
"internal corruption of phar "…" (__HALT_COMPILER(); not found)" with
a system temporary path. The window closed and nothing was installed.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-27, three apps, with the Web Feed
package (installed version equal to the package's) and a scratch
plugin: under a row's own "Upgrade", the same and an older version gave
"Plugin already installed, and is newer than the version available in
the gallery."; under "Google Scholar Indexing Plugin" "The version.xml
in the uploaded plugin contains a plugin name that does not fit the
name of the upgraded plugin."; under "Browse Block" "The uploaded
plugin does not fit the category of the upgraded plugin." Each closed
the window with an amber notice and left every box as it was.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-27, three apps, with a scratch generic
plugin: 1.0.0.0 gave "Successfully installed version 1.0.0.0" (green,
top right), the row under "Generic Plugins", unticked, on every
journal's list, the wizard's and the site's; one whose code reports
itself enabled arrived ticked. 1.0.1.0 under "Upgrade" gave
"Successfully upgraded to version 1.0.1.0", each list keeping its box.
"Delete": the window as Rule 21 quotes it; "Cancel" sent nothing; "OK"
gave "Plugin "U62 K2 Test Plugin" successfuly deleted", the row gone
at once and after a reload from every journal's list and the site's,
the folder removed.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-27, three apps: the Site
Administrator's arrow offers "Delete" on "TinyMCE Plugin", "Usage
event" (where listed), "Default Theme" and the locked metadata and OAI
rows (not pressed).

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-27, three apps, as the Journal Manager,
the Editor and the Production Editor (OJS, OMP) on Settings › Website
and as the Site Administrator there, on Site Settings and in the
Settings Wizard: "Plugin Gallery" held only "Loading" with a spinner,
still there 10 s later; no notice, no "Error" window. "Installed
Plugins" listed the same rows before and after. A Section Editor's
Settings › Website is the access-denied page, with no gallery request.
Mechanism fn-o, failure f-a1.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-27, three apps (OJS in two runs), on a
scratch journal whose Site Administrator's manager role was ended on
Users & Roles: in the Settings Wizard the rows showed; ticking
"Google Analytics Plugin" left it unticked with no notice; unticking a
ticked plugin and "OK" left the "Disable" window open with its spinner,
still open 3 s later; after a reload both as before. "Web Feed
Plugin"'s arrow gave "Delete" and "Upgrade" alone. Settings › Website
typed opened on OJS, with no "Error" window and the same refusals, and
was the access-denied page on OMP and OPS.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-27, three apps: the wizard's "Plugins"
held "Installed Plugins" and "Plugin Gallery"; "Google Analytics
Plugin" ticked there showed ticked on the journal's Website list, and
unticked there showed unticked in the wizard.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-27, three apps: unticking "Web Feed
Plugin" and "Cancel" left the box ticked, with no notice and no
request, ticked after a reload; "OK" gave "The plugin "Web Feed
Plugin" has been disabled.", unticked after a reload.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Journal "Installed Plugins" list: enable/disable box | Settings › Website › "Plugins" › "Installed Plugins" (`management/settings/website#plugins`); grid `grid.settings.plugins.SettingsPluginGridHandler` | AFFM-044, GRID-077 (OJS), GRID-095 (OMP), GRID-104 (OPS) |
| A plugin's own row links | the row arrow | AFFM-045 |
| Row "Delete" | the row arrow, Site Administrator | AFFM-046 |
| Row "Upgrade" | the row arrow, Site Administrator | AFFM-047 |
| "Upload A New Plugin" | the list's top right, Site Administrator | AFFM-048 |
| Plugin Gallery filter | "Plugin Gallery" tab; grid `grid.plugins.PluginGalleryGridHandler` | AFFM-049, GRID-041 |
| Gallery plugin details | a name in the gallery (`viewPlugin`) | AFFM-050 |
| Gallery "Install" / "Upgrade" | the details window, Site Administrator (`installPlugin`, `upgradePlugin`) | AFFM-051 |
| Settings Wizard "Plugins" tab | Administration › "Hosted Journals" › "Settings wizard" › "Plugins" (`admin/wizard/{id}`) | AFFM-202 |
| Site "Installed Plugins" | Administration › "Site Settings" › "Plugins" (`admin/settings#plugins`); grid `grid.admin.plugins.AdminPluginGridHandler` | AFFM-228, GRID-006 |
| Site "Plugin Gallery" | the same tab's "Plugin Gallery" | AFFM-229 |
| "The plugin … has been enabled." / "… disabled." notices | after a tick or an untick | NOTIF-009, NOTIF-010 |
| Install policy and gallery source | configuration file `[security]` `allow_plugin_install`, `plugin_gallery_urls` (owned by Login & sessions) | SET-052 |

## Reference — code anchors

- Grids: `lib/pkp/classes/controllers/grid/plugins/PluginGridHandler.php`;
  `<app>/controllers/grid/settings/plugins/SettingsPluginGridHandler.php`;
  `lib/pkp/controllers/grid/admin/plugins/AdminPluginGridHandler.php`;
  `lib/pkp/controllers/grid/plugins/{PluginGridRow,PluginGridCellProvider,PluginCategoryGridRow,PluginGalleryGridHandler,PluginGalleryGridCellProvider}.php`;
  `lib/pkp/controllers/grid/plugins/form/UploadPluginForm.php`.
- Policies: `lib/pkp/classes/security/authorization/PluginAccessPolicy.php`,
  `internal/PluginRequiredPolicy.php`, `internal/PluginLevelRequiredPolicy.php`,
  `CanAccessSettingsPolicy.php`, `UserRolesRequiredPolicy.php`.
- Plugins: `lib/pkp/classes/plugins/{Plugin,LazyLoadPlugin,ThemePlugin,ImportExportPlugin,ReportPlugin,PluginHelper,PluginGalleryDAO,GalleryPlugin,PluginRegistry}.php`;
  `lib/pkp/classes/site/VersionCheck.php`;
  `lib/pkp/plugins/generic/usageEvent/PKPUsageEventPlugin.php`;
  `<app>/plugins/generic/{customBlockManager,tinymce}`;
  `<app>/classes/core/Application.php` (`getPluginCategories()`).
- Pages and templates: `lib/pkp/pages/management/ManagementHandler.php`
  (`website()`), `lib/pkp/pages/admin/AdminHandler.php` (`settings()`,
  `wizard()`, `siteSettingsAvailability()`);
  `lib/pkp/templates/management/website.tpl`,
  `lib/pkp/templates/admin/{settings,contextSettings}.tpl`,
  `lib/pkp/templates/controllers/grid/plugins/{pluginGridFilter,pluginGalleryGridFilter,viewPlugin}.tpl`,
  `lib/pkp/templates/controllers/grid/plugins/form/uploadPluginForm.tpl`,
  `lib/pkp/templates/controllers/grid/gridRow.tpl`,
  `lib/pkp/templates/controllers/fileUploadContainer.tpl`.
- Configuration: `<app>/config.TEMPLATE.inc.php` `[security]`.
- Locale: `lib/pkp/locale/en/{manager,grid,common}.po` (`manager.plugins.*`,
  `grid.plugin.*`, `common.pluginEnabled`, `common.pluginDisabled`,
  `plugins.categories.*`); no app locale overrides these keys.
