---
name: catalog-browse
status: verified
---

# Catalog browse {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Readers find a press's books by browsing its catalog. The **catalog
page** (the header's "Catalog") lists every published book, the featured
ones first; each **series** has a page of its own with its books and its
new releases; the **"New Releases"** page lists the books the press marks
as new; and the press's home page can carry a "Featured" and a "New
Releases" list. The sidebar's "Browse" block and the press's menu items
lead to these pages. Every list shows each book as the same **book
summary**: its cover, title, authors and date, leading to the book's own
page. Which books are featured or new, in what order, and in which series
is decided on the press's Catalog page (*[Catalog
management](U70-catalog-management.md)*); the book's own page is
*Monograph landing page*'s; a category's page is
[Categories](U16-categories.md)'s, which this spec covers only where a
press's differs (Rule 14). <sup>a</sup>

A journal and a preprint server do not install the catalog. A journal
lists its published work by issue in its archive
([Issues](U50-issues.md#archive)), and a preprint server in its
"Archives" list ([Sections](U17-sections.md#archives)). On both, the
catalog page's, the "New Releases" page's and a series page's addresses
answer a not-found page, and the Navigation tab offers no "Catalog", "New
Releases" or "Series" menu item type
([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
its item types table). <sup>b</sup> <sup>td1</sup>

## Actors & permissions

The pages are public: a visitor needs no account, and a signed-in user,
whatever their roles in the press, sees the same pages with the same
books. The pages offer nothing to change. <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the catalog page, a series' page, the "New Releases" page and the home page's lists** | • any visitor, signed out or signed in<br>• while the press requires visitors to sign in (Settings bullet 8) or is not enabled publicly (Settings bullet 9), a signed-out visitor who opens any of them gets the Login page <sup>c</sup> <sup>td13</sup> |
| **Decide which books these pages show and how** (featured, new release, series, cover, order) | • the roles [Catalog management](U70-catalog-management.md) names in its Actors & permissions <sup>c</sup> |
| **Change the settings of "Settings that modify behavior"** | • whoever opens the Settings pages ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)); the "Browse Block" "Settings" from Settings › Website › "Plugins" ([Plugins management](U62-plugins-management.md#plugin-links)); "Enable this press to appear publicly on the site" the Site Administrator <sup>c</sup> |

## Fields & validation

Every page below opens with the header and the trail of
[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
(its Rules 15 and 23) and, while blocks are placed, the sidebar.

**The catalog page.** The header's "Catalog"; the press's address
followed by "catalog". The browser tab reads "Catalog | {press name}". Top
to bottom: <sup>d</sup>

| Part | Shows | Rules |
|------|-------|-------|
| Trail | "Home / Catalog" | — <sup>d</sup> |
| Heading | "Catalog" | — <sup>d</sup> |
| Count | "{n} Titles": the published books of the whole catalog, over all pages; one book reads "1 Titles" ⚠ [A1](#a1) | Rule 3 <sup>d</sup> |
| "Series:" | links to the press's series, separated by commas | Rule 6 <sup>d</sup> |
| The list | a book summary per book, with no heading over it; with no book, the heading "All Books" and "No titles have been published yet." | Rules 3, 4 <sup>d</sup> |
| Page links | "Previous", "{start}-{end} of {total}", "Next" | Rule 5 <sup>d</sup> |

**A series' page.** The press's address followed by "catalog/series/"
and the series' path ([Sections](U17-sections.md#omp-series), its Rule
10a). Top to bottom: <sup>e</sup>

| Part | Shows | Rules |
|------|-------|-------|
| Trail | "Home / {series}"; today "Home /" with an empty last step [A3](#a3) | Rule 9 <sup>e</sup> |
| Heading | the series' name; today empty [A3](#a3) | Rule 9 <sup>e</sup> |
| Count | "{n} Titles": the series' published books, over all pages [A1](#a1) | Rule 7 <sup>e</sup> |
| Picture | the series' "Cover Image", as a small copy | Rule 9 <sup>e</sup> |
| Description | the series' "Description"; today not shown [A3](#a3) | Rule 9 <sup>e</sup> |
| "Online ISSN", "Print ISSN" | each followed by the series' number, when set; today not shown [A3](#a3) | Rule 9 <sup>e</sup> |
| "New Releases" | a heading and the series' new releases, on the first page only | Rule 8 <sup>e</sup> |
| "All Books" | a heading and the series' books; with no book, "No titles have been published yet." under it | Rule 7 <sup>e</sup> |
| Page links | as on the catalog page | Rule 7 <sup>e</sup> |

**The "New Releases" page.** The press's address followed by
"catalog/newReleases". The browser tab reads "New Releases | {press
name}". Top to bottom: <sup>f</sup>

| Part | Shows | Rules |
|------|-------|-------|
| Trail | "Home / New Releases" | — <sup>f</sup> |
| Heading | "New Releases" | — <sup>f</sup> |
| Count | "{n} Titles": the books listed [A1](#a1) | Rule 10 <sup>f</sup> |
| The list | a book summary per new release, with no heading over it; with none, "No new releases are available at this time." | Rule 10 <sup>f</sup> |

<a id="book-summary"></a>
**The book summary.** How every list of this spec shows one book, and so
do the home page's lists and a press's category pages (Rule 11). Top to
bottom: <sup>g</sup>

| Part | Shows | Rules |
|------|-------|-------|
| Cover | the small copy of the current version's "Cover Image" ([Catalog management](U70-catalog-management.md), its Rule 13f), or the default picture when it has none; a link to the book's page. A screen reader hears the cover's "Alternate text" as the link's name, and nothing when the box is empty or the book has no cover ⚠ [A2](#a2) | Rule 11 <sup>g</sup> |
| Series position | the version's "Series Position", when set ([Catalog management](U70-catalog-management.md), its Rule 13b) | — <sup>g</sup> |
| Title | the version's title and subtitle, a link to the book's page | Rule 11 <sup>g</sup> |
| Authors | the author line of [Contributors & affiliations](U41-contributors-and-affiliations.md) (its Rules 8 and 15): each contributor ticked for publication lists, with their roles in brackets, separated by semicolons | — <sup>g</sup> |
| Date | the version's publication date, in the press's "Date" format ([Appearance & theming](U10-appearance-and-theming.md), its Rule 31) | — <sup>g</sup> |

**The "Browse" block's catalog lines.** The press's "Browse" block
([Categories](U16-categories.md), its Rule 15) may carry, above its
categories, a link "New Releases" and, below them, the line "Series" with
the series as links under it (Rule 12). <sup>h</sup>

## Rules & state

**Reaching the pages**

1. **What leads there.** <sup>m</sup>
   - The header's "Catalog", on every press as it arrives (the "Catalog"
     menu item of [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
     its Rule 2), opens the catalog page.
   - A series' page is reached from the catalog's "Series:" links (Rule
     6), the "Browse" block (Rule 12), a "Series" menu item (Rule 13) and
     the series' name on the page of any of its books (*Monograph landing
     page*).
   - The "New Releases" page is reached from the "Browse" block and a
     "New Releases" menu item (Rule 13). A new press offers neither: its
     "Browse" block is enabled but not placed in the sidebar and its menus
     hold no "New Releases" item, so only the page's address leads there.
     <sup>td6</sup>
2. **An unknown series.** A series address whose path no series of the
   press has, or with no path at all, opens the catalog page with no
   message, as a series' old address does once its path is changed
   ([Sections](U17-sections.md#omp-series), its Rule 10a). <sup>m</sup>
   - 2a. The catalog's old search address, the press's address followed
     by "catalog/results", answers a not-found page ⚠ [A9](#a9).
     <sup>td11</sup>

**The catalog page**

3. **What it lists.** The press's published books: the same books the
   Catalog page of [Catalog management](U70-catalog-management.md) lists
   with no filter (its Rule 1), so neither a scheduled book nor an
   unpublished one. Nor is a book whose only published version is an
   "Author Original" (a version added on the book's workflow with "Create
   New Version" and the "Publication Stage" "Author Original (AO)"); the
   count leaves it out too. Each book shows as its book summary. With no published book the
   count reads "0 Titles", and "All Books" and "No titles have been
   published yet." stand in place of the list. <sup>d</sup> <sup>td2</sup>
4. **The order.** The books featured in the whole catalog come first, in
   the order "Order Features" saved ([Catalog management](U70-catalog-management.md),
   its Rules 6a and 10c). On a window 1200 pixels wide or wider, each
   featured book takes a whole row, while the others stand two to a row
   (a narrower window: Rule 11). The rest follow in the press's "Order
   of monographs" (Settings bullet 1), newest first by publication date
   on a new press. The two "Series position" choices
   compare the positions as text, so "Book 10" comes between "Book 1" and
   "Book 2" ⚠ [A6](#a6). <sup>i</sup> <sup>td3</sup> <sup>td10</sup>
5. **Page links.** With more books than the press's "Items per page"
   (Settings bullet 4), the list pages as the listing pages of
   [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
   do (its Rule 24): the second page's address ends in "catalog/page/2",
   and "Previous" on it leads back to the catalog page. The count covers
   the whole catalog, and the featured books fill the first page before
   any other book. A page number typed past the last page opens a page
   with no books ⚠ [A10](#a10). <sup>j</sup>
6. **The "Series:" links.** While "Show Series" is ticked (Settings bullet
   3) and at least two series of the press hold a published book, the
   catalog page shows "Series:" and a link to each series holding one,
   named with its prefix, in the order of Settings › Press › "Series"
   ([Sections](U17-sections.md#order)). With one such series, or none, the
   line is absent. A series with no published book is never listed; an
   inactive one holding a book is listed [A5](#a5). <sup>d</sup>
   <sup>td4</sup>
   - 6a. Any published version counts as a published book here. A series
     whose only book has only its "Author Original" published stays
     listed, although the catalog leaves that book out (Rule 3) and the
     series' page reads "0 Titles" and "No titles have been published
     yet." [A5](#a5). <sup>td2</sup>

**A series' page**

7. **What it lists.** Under "All Books", the published books placed in
   the series (the "Series" of their Catalog Entry page, [Catalog
   management](U70-catalog-management.md), its Rule 13a). The books
   featured in the series ("Featured in series" on the Catalog page) come
   first, in their saved order, each taking a whole row on a wide window;
   the rest follow newest first by publication date, whatever the
   series' "Order of monographs" says [A3](#a3). With more books than
   "Items per page" the list pages as the catalog does (Rule 5), the
   second page at the series' address followed by "/2"; a page number
   typed past the last page opens a page with no books [A10](#a10). With
   no published book the page shows "0 Titles", "All Books" and "No
   titles have been published yet.", and no "New Releases". <sup>e</sup>
   <sup>td5</sup>
8. **The series' "New Releases".** On the first page of a series holding
   a published book, a "New Releases" list stands above "All Books": the
   series' published books ticked "New release in series" on the Catalog
   page, newest first by publication date. It lists every such book,
   whatever "Items per page" says, so a series' first page can show more
   books than that number. A book there is also listed under "All
   Books". Absent when the series has no new release, and on every later
   page. <sup>e</sup> <sup>td5</sup>
9. **The series' own details.** The series' name is meant to head the
   page, end the trail and open the browser tab's title ("{series} |
   {press name}"), with its "Description" and its "Online ISSN" and
   "Print ISSN" under the picture. Today the heading and the trail's last
   step are empty, the tab reads "| {press name}", and neither the
   description nor the ISSNs show ⚠ [A3](#a3). The series' "Cover Image"
   shows above the list as a small copy. It has no text alternative for a
   screen reader: that would be the series' name, lost with the rest
   [A3](#a3). It is not a link, and nothing on the page leads to its full
   size ⚠ [A4](#a4). <sup>e</sup>

**The "New Releases" page**

10. **What it lists.** The press's published books ticked "New release"
    on the Catalog page with no filter ([Catalog
    management](U70-catalog-management.md), its Rule 7), newest first by
    publication date, all on one page whatever "Items per page" says; a
    featured book gets no place of its own here. With none, the count
    reads "0 Titles" and "No new releases are available at this time."
    stands in place of the list. <sup>f</sup> <sup>td6</sup>

**The book summary**

11. **Where it shows and where it leads.** The catalog page, a series'
    page, the "New Releases" page, a press's category pages
    ([Categories](U16-categories.md)) and the home page's "Featured" and
    "New Releases" lists ([Appearance & theming](U10-appearance-and-theming.md),
    its Rules 12 and 17) show each book as its summary (Fields). On a
    window 1200 pixels wide or wider, the home page's lists stand two to
    a row, featured books included. On a window 800 pixels wide every
    book on the catalog page and on both home lists takes a whole row. The cover and
    the title both open the book's page, at its "URL Path" when one is saved and at
    its number otherwise (*Monograph landing page*). <sup>g</sup> <sup>td3</sup>

**The "Browse" block**

12. **Its catalog lines.** While the "Browse" block is placed in the
    sidebar (Settings bullet 6), its "Settings" decide two lines (Settings
    bullet 7): <sup>h</sup> <sup>td7</sup>
    - "New releases" ticked: the first line is the link "New Releases",
      to the "New Releases" page.
    - "Series" ticked: after the categories, the line "Series" and under
      it a link to each active series of the press, named with its
      prefix, in the series' order, whether or not the series holds a
      published book. An inactive series is left out, although its page
      and the catalog's "Series:" links still offer it ⚠ [A5](#a5). On a
      series' page the block marks that series' link: grayed, with a grey
      bar at its left. With no series the line is left out; while every
      series is inactive, the line "Series" shows with nothing under it
      ⚠ [A11](#a11).

**Menu items**

13. **"Catalog", "New Releases" and "Series" items.** Added on the
    Navigation tab ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
    its Rule 14 and item types table), a "Catalog" item opens the catalog
    page, a "New Releases" item the "New Releases" page, and a "Series"
    item the page of the series chosen in it. A "Series" item follows the
    series' path when it changes, and leaves the header's menu once the
    series is deleted; an inactive series' item stays. <sup>k</sup>
    <sup>td8</sup>
    - 13a. On the Navigation tab a deleted series' item stays, still
      assigned to its menu with no warning. Its "Edit" window opens on
      the first remaining series, and closing that window untouched asks
      "The data on this form has changed. Do you wish to continue without
      saving?" ⚠ [A12](#a12).

**A press's category page**

14. **Where a press's category page differs.** [Categories](U16-categories.md)
    owns the page (its Rules 8–13); on a press it differs this way:
    <sup>l</sup> <sup>td9</sup>
    - The books featured anywhere on the press come first ([Catalog
      management](U70-catalog-management.md#a10), its A10), but none is
      set apart: every book stands two to a row. The page has no "New
      Releases" list, whatever is ticked "New release in category"
      ⚠ [A7](#a7).
    - Only the first page of books shows ([Appearance &
      theming](U10-appearance-and-theming.md#omp2), its OMP2).
    - A server failure of the first category page opened after the
      catalog page is recorded in [Categories](U16-categories.md#omp5)
      (its OMP5), with the servers it occurs on.

**In French**

15. **The press's pages in French.** With French as the interface
    language, the catalog page, a series' page, the "New Releases" page
    and the home page's lists show raw text codes in place of the count,
    "All Books", "New Releases", "Featured" and the empty-list messages
    ⚠ [A8](#a8). While placed, the "Browse" block shows codes in place of
    its heading "Browse" and its lines "Categories" and "Series"
    [A8](#a8). "Catalogue" in the trail and heading, "Séries", the page
    links and the block's "Nouveautés" are translated. <sup>td12</sup>

## Side effects

- **Opening the catalog page** counts as a visit to the press, and
  **opening a series' page** as a visit to the series
  ([Usage statistics](U64-usage-statistics.md), its Rule 1 and
  [OMP1](U64-usage-statistics.md#omp1)). The "New Releases" page counts
  nothing. No page of this spec sends an email or changes anything.
  <sup>p</sup>

## Settings that modify behavior

1. **"Order of monographs"** of the press (Settings › Website ›
   "Appearance" › "Setup"; no choice marked on a new press, which lists
   by publication date, newest first). Another choice orders the catalog
   page's books after the featured ones (Rule 4) [A6](#a6). <sup>i</sup>
2. **A series' "Order of monographs"** (Settings › Press › "Series" › the
   series' window; "Title (A-Z)" on a new series). Meant to order the
   series' page; the page ignores it (Rule 7) [A3](#a3). <sup>e</sup>
3. **"Show Series"** (Settings › Website › "Appearance" › "Theme", "Add
   list of links to all of the press's series on the catalog page";
   unticked). Ticked: the catalog page's "Series:" links (Rule 6).
   <sup>o</sup>
4. **"Items per page"** (Settings › Website › "Setup" › "Lists"; 25).
   The number of books a page of the catalog and of a series' page shows
   (Rules 5, 7); a series' "New Releases" list (Rule 8) and the "New
   Releases" page (Rule 10) ignore it.
   <sup>j</sup>
5. **"Featured Books", "New Releases"** (Settings › Website ›
   "Appearance" › "Setup"; both unticked). Ticked: the home page's
   "Featured" and "New Releases" lists ([Appearance &
   theming](U10-appearance-and-theming.md), its Rules 12 and 17), whose
   books show as summaries (Rule 11). <sup>n</sup>
6. **"Sidebar"** (Settings › Website › "Appearance" › "Setup"; no block
   placed; "Browse Block" is enabled on a new press and offered there).
   "Browse Block" ticked: the block and its catalog lines show on every
   public page (Rule 12). <sup>h</sup>
7. **The "Browse Block" "Settings"** (Settings › Website › "Plugins",
   the "Browse Block" row's "Settings", group "Browse Possibilities";
   "New releases", "Categories" and "Series" all ticked). "New releases"
   unticked: no "New Releases" link; "Series" unticked: no "Series" line
   (Rule 12); "Categories": [Categories](U16-categories.md), its Settings
   bullet 8. <sup>h</sup>
8. **"Users must be registered and log in to view the press site."**
   (Settings › Users & Roles › "Site Access Options"; unticked). Ticked:
   a signed-out visitor who opens any page of this spec gets the Login
   page (Actors row 1; [Journal identity & about
   pages](U07-journal-identity-and-about-pages.md), its Rule 22).
   <sup>c</sup>
9. **"Enable this press to appear publicly on the site"**
   (Administration › Hosted Presses › the press's "Edit"; ticked on every
   press a test install creates). Unticked: a signed-out visitor gets the
   Login page (Actors row 1). <sup>c</sup>
10. **"Cover Image Max Width", "Cover Image Max Height"** (Settings ›
    Website › "Appearance" › "Advanced"; 106 and 100). The size of the
    covers' small copies in the summaries ([Catalog
    management](U70-catalog-management.md), its Settings bullet 4).
    <sup>g</sup>
11. **"Date"** (Settings › Website › "Setup" › "Date & Time"). The
    summaries' date ([Appearance & theming](U10-appearance-and-theming.md),
    its Rule 31). <sup>g</sup>
12. **A series' inactive box** (Settings › Press › "Series" › the series'
    window, "Mark this series as inactive and do not allow new submissions
    to be made to it."; unticked). Ticked: the "Browse" block leaves the
    series out; its page and the "Series:" links do not (Rules 6, 12)
    [A5](#a5). <sup>h</sup>
13. **A contributor's "Include this contributor when identifying authors
    in lists of publications."** (the contributor's window in the
    workflow; ticked). Unticked: the contributor is left out of the
    summary's author line ([Contributors &
    affiliations](U41-contributors-and-affiliations.md), its Rule 8).
    <sup>g</sup>

## Cross-feature interactions

- [Catalog management](U70-catalog-management.md): which books are in
  the catalog, featured or new releases, their featured order, their
  series, series position, cover and URL Path (Rules 3, 4, 7, 8, 10).
  This spec owns the reader pages those choices show on.
- [Sections](U17-sections.md): a series' fields, its path, order and
  inactive box; its [OMP9](U17-sections.md#omp9) holds the full record
  of a series' page losing its details ([A3](#a3) here).
- [Categories](U16-categories.md): a category's page, and the "Browse"
  block's categories; this spec owns only a press's differences (Rule
  14) and the block's "New Releases" and "Series" lines (Rule 12).
- [Appearance & theming](U10-appearance-and-theming.md): the home page's
  parts and whether its two book lists show, "Show Series", "Items per
  page", the date formats, the sidebar (Settings bullets 3–6, 11).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md):
  the header, trails, page links and the menu item types (Rules 1, 5,
  13).
- [Contributors & affiliations](U41-contributors-and-affiliations.md):
  the author line of the summaries.
- [Usage statistics](U64-usage-statistics.md): the visits these pages
  count.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md):
  a press closed to signed-out visitors (Settings bullets 8, 9).
- [Issues](U50-issues.md#archive) and [Sections](U17-sections.md#archives):
  a journal's archive and a preprint server's "Archives", the
  counterparts of the catalog.
- [Monograph landing page](U69-monograph-landing-page.md): the book's page the summaries
  open, and the series link on it.

## Canonical scenarios

Scenario 7 runs on the seeded journal and preprint server with a ready
account, and scenarios 6 and 7 end on the seeded press; the others run
on scratch presses with throwaway accounts, because the seeded press's
catalog holds what earlier runs published. <sup>s</sup>

1. **The catalog page, the featured book first**

   Given: a visitor signed out, on a scratch press named "Harbour Press"
   with "Featured Books" and "New Releases" ticked, holding six books of
   the Author Nova Reed: "Alpha", "Beta" and "Gamma", published on
   2024-01-10, 2024-02-10 and 2024-03-10, "Beta" with the URL Path
   beta-book, "Beta" and "Gamma" new releases; "Delta", published on
   2023-12-10 and featured in the whole catalog; "Epsilon", scheduled
   for 2031-01-10; and "Zeta", not yet published.

   - **The header's "Catalog"**: the visitor opens the press's home page
     and presses "Catalog" in the header: the browser tab reads "Catalog
     | Harbour Press", the trail "Home / Catalog", the heading "Catalog"
     and the count "4 Titles" (Rules 1, 3; Fields, the catalog page).
   - **The featured book first**: on a window 1200 pixels wide, "Delta"
     comes first, on a row of its own, although it is the oldest;
     "Gamma", "Beta" and "Alpha" follow, newest first by publication
     date, two to a row (Rule 4).
   - **A book summary**: "Gamma" shows, top to bottom, the default
     picture as its cover, the title "Gamma", the author line "Nova Reed
     (Author)" and the date "March 10, 2024" (Fields, the book summary).
   - **Where a summary leads**: press "Gamma"'s cover: the book's page
     opens, at an address ending in the book's number. Go back and press
     "Beta"'s title: the book's page opens, at an address ending in
     beta-book (Rule 11).
   - **The home page's lists**: open the press's home page: a list
     headed "Featured" holds "Delta", and a list headed "New Releases"
     holds "Gamma" and "Beta" side by side, each book shown as the same
     summary (Rule 11; Settings bullet 5).
   - **A window 800 pixels wide**: narrow the window to 800 pixels:
     every book of the home page's two lists takes a whole row. Press
     "Catalog": every book there takes a whole row too (Rule 11).
   - **Control**: the catalog page lists neither "Epsilon", scheduled,
     nor "Zeta", not yet published, and its count "4 Titles" leaves both
     out (Rule 3). <sup>s</sup>

2. **The "New Releases" page**

   Given: a visitor signed out, on a scratch press named "Lantern Press"
   whose "Items per page" is 2, holding four published books: "Alpha",
   "Beta" and "Gamma", published on 2024-01-10, 2024-02-10 and
   2024-03-10, all three new releases and "Alpha" also featured in the
   whole catalog; and "Delta", published on 2024-04-10 and not a new
   release.

   - **The page**: the visitor opens the press's address followed by
     "catalog/newReleases": the browser tab reads "New Releases | Lantern
     Press", the trail "Home / New Releases", the heading "New Releases"
     and the count "3 Titles" (Rule 1; Fields, the "New Releases" page).
   - **The list**: "Gamma", "Beta" and "Alpha", newest first by
     publication date, all three on this one page although "Items per
     page" is 2 (Rule 10; Settings bullet 4).
   - **A featured book**: "Alpha", featured in the whole catalog, keeps
     its place by date, last (Rule 10).
   - **The catalog page**: press "Catalog" in the header: the count
     reads "4 Titles", and the list opens with "Alpha", the featured
     book, then "Delta" (Rules 3, 4).
   - **Control**: "Delta", not a new release, is not on the "New
     Releases" page (Rule 10). <sup>s</sup>

3. **A series' page, over two pages**

   Given: a visitor signed out, on a scratch press whose "Items per
   page" is 2, with the series "History" holding four published books:
   "Coastal Towns" (published 2024-01-10, "Series Position" Book 1),
   "River Histories" (2024-02-10), "Old Mills" (2024-03-10) and
   "Harbour Walls" (2024-04-10); "Coastal Towns" and then "River
   Histories" featured in the series, in that order; "Coastal Towns",
   "Old Mills" and "Harbour Walls" new releases in the series.

   - **The first page**: the visitor opens the press's address followed
     by "catalog/series/history": the count reads "4 Titles" (Rule 7;
     Fields, a series' page).
   - **The series' "New Releases"**: under the heading "New Releases"
     stand "Harbour Walls", "Old Mills" and "Coastal Towns", newest first
     by publication date: three books, although "Items per page" is 2
     (Rule 8; Settings bullet 4).
   - **"All Books"**: under the heading "All Books" stand "Coastal
     Towns", then "River Histories", the books featured in the series in
     their saved order, although "River Histories" is the newer; on a
     window 1200 pixels wide each takes a row of its own. "Coastal Towns"
     shows "Book 1" above its title. The page links read "1-2 of 4" and
     "Next" (Rule 7; Fields, the book summary).
   - **The second page**: press "Next": the address ends in
     "catalog/series/history/2"; the count still reads "4 Titles", no
     "New Releases" list shows, and under "All Books" stand "Harbour
     Walls", then "Old Mills", newest first. The page links read
     "Previous" and "3-4 of 4" (Rules 7, 8).
   - **"Previous"**: press "Previous": the series' first page is back,
     at the address ending in "catalog/series/history" (Rule 7).
   - **An unknown series**: open the press's address followed by
     "catalog/series/histories", then followed by "catalog/series": each
     opens the catalog page, headed "Catalog", with no message (Rule 2).
   - **Control**: open the press's address followed by
     "catalog/newReleases": it reads "0 Titles" and "No new releases are
     available at this time.", because the three books are new releases
     in the series only, none ticked "New release" with no filter (Rule
     10). <sup>s</sup>

4. **The catalog in the press's order, over three pages**

   Given: a visitor signed out, on a scratch press whose "Order of
   monographs" is "Title (A-Z)" and whose "Items per page" is 2, with
   five published books: "Oak" and "Elm", featured in the whole catalog
   in that order, and "Ash", "Birch" and "Maple", published on
   2024-05-10, 2024-01-10 and 2024-03-10.

   - **The first page**: the visitor presses "Catalog" in the header:
     the count reads "5 Titles", the list holds "Oak", then "Elm", the
     featured books filling the page, and the page links read "1-2 of 5"
     and "Next" (Rules 4, 5; Fields, the catalog page).
   - **The second page**: press "Next": the address ends in
     "catalog/page/2"; the count still reads "5 Titles", the list holds
     "Ash", then "Birch", and the page links read "Previous", "3-4 of 5"
     and "Next" (Rule 5).
   - **The third page**: press "Next": the list holds "Maple" alone, and
     the page links read "Previous" and "5-5 of 5" (Rule 5).
   - **"Previous"**: press "Previous" twice: the second page, then the
     catalog page, at the press's address followed by "catalog" (Rule
     5).
   - **Control**: "Birch" comes before "Maple", although "Maple" is the
     newer: the press's order, by title, sets the books after the
     featured ones, not the publication date (Rule 4; Settings bullet
     1). <sup>s</sup>

5. **Series links on the catalog page and in the "Browse" block**

   Given: a visitor signed out, on a scratch press with "Show Series"
   ticked and the "Browse" block placed in the sidebar, whose series
   "History" and "Poetry" each hold one published book and whose series
   "Drama" holds none; and a second scratch press with "Show Series"
   ticked and the "Browse" block placed with "New releases" and "Series"
   unticked in its "Settings", whose one series "Essays" holds a
   published book.

   - **The "Series:" links**: the visitor presses "Catalog" in the
     header: the page shows "Series:" with the links "History" and
     "Poetry", separated by a comma, and no "Drama" (Rule 6; Settings
     bullet 3).
   - **A "Series:" link**: press "History": the series' page opens, at
     the press's address followed by "catalog/series/history", with its
     book under "All Books" (Rules 1, 7).
   - **The "Browse" block**: the sidebar's "Browse" block shows the link
     "New Releases", then the line "Series" with a link to each of
     "Drama", "History" and "Poetry", "Drama" included although it holds
     no book (Rule 12; Settings bullet 6).
   - **The current series**: on the "History" page, the block's
     "History" link is grayed, with a grey bar at its left; the "Drama"
     and "Poetry" links are not (Rule 12).
   - **A series with no book**: press the block's "Drama": the series'
     page reads "0 Titles", "All Books" and "No titles have been
     published yet.", with no "New Releases" list (Rule 7).
   - **The block's "New Releases"**: press the block's "New Releases":
     the page headed "New Releases" opens (Rules 1, 12).
   - **One series with a book**: on the second press, the visitor
     presses "Catalog": no "Series:" line shows, only one series holding
     a published book (Rule 6).
   - **Control**: on the second press, the "Browse" block shows neither
     the "New Releases" link nor the "Series" line (Rule 12; Settings
     bullet 7). <sup>s</sup>

6. **A press closed to signed-out visitors, with nothing published yet**

   Given: a Reader and a visitor signed out, on a scratch press with
   "Users must be registered and log in to view the press site." ticked,
   the series "History" and no published book.

   - **Signed out**: the visitor opens the press's address followed by
     "catalog", then followed by "catalog/series/history", then followed
     by "catalog/newReleases": each time the Login page opens (Actors row
     1; Settings bullet 8).
   - **The Reader signed in**: the Reader signs in on the press's Login
     page and opens the press's address followed by "catalog": the
     catalog page opens, with the trail "Home / Catalog", the heading
     "Catalog", the count "0 Titles", and "All Books" and "No titles have
     been published yet." in place of the list. The series' address and
     the "New Releases" address open their pages too, not the Login page
     (Actors row 1; Rule 3).
   - **Control**: the visitor, still signed out, opens the seeded press's
     address followed by "catalog": its catalog page opens, headed
     "Catalog", with no Login page, the seeded press having "Users must
     be registered…" unticked (Settings bullet 8). <sup>s</sup>

7. **No catalog on a journal or a preprint server** {OJS OPS}

   Given: Journal Manager (Preprint Server Manager) and a visitor signed
   out, on the seeded journal (the seeded preprint server).

   - **The catalog's addresses**: the visitor opens the journal's (the
     server's) address followed by "catalog", then "catalog/newReleases",
     then "catalog/series/monographs": each answers a not-found page. The
     Journal Manager (Preprint Server Manager), signed in, gets the same
     (Purpose, the absence paragraph).
   - **The Navigation tab**: the Journal Manager (Preprint Server
     Manager) opens Settings › Website › "Setup" › "Navigation" and
     presses "Add item": the "Navigation Menu Type" list offers no
     "Catalog", "New Releases" or "Series" (Purpose, the absence
     paragraph).
   - **Control**: on the seeded press, the visitor opens the same three
     addresses: the catalog page, headed "Catalog", the "Monographs"
     series' page, with its "All Books" heading, and the page headed "New
     Releases". On that press the Press Manager opens Settings ›
     Website › "Setup" › "Navigation" and presses "Add item": the
     "Navigation Menu Type" list offers "Catalog", "New Releases" and
     "Series" (Rules 1, 13). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - a signed-in user of any role, shown the same pages with the same
    books as the signed-out visitor (Actors row 1)
  - a press not enabled publicly, whose signed-out visitor gets the
    same Login page as scenario 6's (Actors row 1; Settings bullet 9)
- **Register carries it**:
  - A1 ("1 Titles" for a single book; Fields)
  - A2 (the cover link's name for a screen reader; Fields, the book
    summary)
  - A3 (a series' missing name, description and ISSNs, its picture's
    text alternative, and its ignored "Order of monographs"; Rules 7, 9;
    Settings bullet 2)
  - A4 (a series' picture with no link to its full size; Rule 9)
  - A5 (an inactive series, left out of the "Browse" block and still on
    its page and the "Series:" links; Rules 6, 12; Settings bullet 12)
  - A6 (the "Series position" orders comparing text; Rule 4; Settings
    bullet 1)
  - A7 (a press's category page, its featured books not set apart and
    no "New Releases"; Rule 14)
  - A8 (the press's pages and the "Browse" block in French; Rule 15)
  - A9 (the catalog's old search address; Rule 2a)
  - A10 (a page number typed past the last page; Rules 5, 7)
  - A11 (every series inactive, the block's "Series" line with nothing
    under it; Rule 12)
- **No seed**:
  - a book whose only published version is an "Author Original": off
    the catalog, its series still among the "Series:" links (Rules 3,
    6a; A5)
  - a series with a "Cover Image": its picture above the list (Rule 9)
  - a "Catalog", "New Releases" or "Series" menu item of the press's
    own; a "Series" item after its series' path changes or the series is
    deleted, and the deleted series' item left on the Navigation tab
    (Rules 13, 13a; A12)
- **Owned by another feature**:
  - the roles that decide what the pages show (Actors row 2;
    *[Catalog management](U70-catalog-management.md)*)
  - the roles that change the settings (Actors row 3;
    [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access),
    [Plugins management](U62-plugins-management.md#plugin-links))
  - a press's category page opened right after the catalog page (Rule
    14; [Categories](U16-categories.md#omp5), its OMP5)
  - a cover set, its small copy and its size (Fields, the book summary;
    Settings bullet 10; [Catalog management](U70-catalog-management.md),
    scenario 5)
  - the "Date" format (Settings bullet 11; [Appearance &
    theming](U10-appearance-and-theming.md), scenario 7)
  - a contributor left out of publication lists (Settings bullet 13;
    [Contributors & affiliations](U41-contributors-and-affiliations.md),
    scenario 7)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | One book reads "1 Titles" on the catalog, series and "New Releases" pages | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | Every book summary's cover is a link a screen reader cannot name | 🐞 | minor | — |
| [A3](#a3) | A series' page shows no name, description or ISSN, and ignores the series' order | 🐞 | user-visible | — |
| [A4](#a4) | A series' picture does not lead to its full size | 🐞 | minor | — |
| [A7](#a7) | A press's category page sets no featured book apart and never lists new releases | 🐞 | user-visible | — |
| [A8](#a8) | In French the catalog pages and the "Browse" block show raw text codes | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A9](#a9) | The catalog's old search address answers a not-found page | 🐞 | invisible | — |
| [A11](#a11) | With every series inactive, the "Browse" block shows the line "Series" with nothing under it | 🐞 | minor | — |
| [A5](#a5) | The "Browse" block and the catalog's "Series:" links disagree about inactive and empty series | ❓ | minor | — |
| [A6](#a6) | "Series position" orders compare the positions as text | ❓ | minor | — |
| [A10](#a10) | A page typed past the last one shows the full count above "No titles have been published yet." | ❓ | minor | — |
| [A12](#a12) | A deleted series' menu item stays on the Navigation tab, its window showing another series | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — "1 Titles"** · 🐞 · low.
A catalog page, series' page or "New Releases" page with one book reads
"1 Titles" where "1 Title" is expected. A press's category page does the
same ([Categories](U16-categories.md#a19), its A19).
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The cover link has no name** · 🐞 · minor.
Each book summary holds two links to the book's page, its cover and its
title. The cover's link is named only by the cover's "Alternate text",
which is empty until a manager types one, so a screen reader announces a
link with no name before every title, on every list of summaries: the
catalog page, a series' page, the "New Releases" page, a category's page
and both home lists. A book with no "Cover Image" shows the default
picture, whose link has no name either, and its Catalog Entry page offers
no "Alternate text" box until an image is uploaded. Expected: a cover
link named after the book, or one a screen reader skips.
Basis: probe, 2026-09-27. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A series' page loses its details and its order** · 🐞 · user-visible.
Every series' page has an empty heading and trail step and a tab title
reading "| {press name}", shows neither the series' description nor its
ISSNs in any interface language, gives its picture no text alternative,
and lists its books newest first whatever the series' "Order of
monographs" says. [Sections](U17-sections.md#omp9) holds the full entry
(its OMP9).
Since: 2026-08-26 (one month) · Basis: probe, 2026-09-27. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The series picture is not a link** · 🐞 · minor.
The picture on a series' page is meant to open the full-size image; it is
not a link, and nothing on the page leads to the full size, which answers
only at its typed address. A category's picture is not a link either
([Categories](U16-categories.md#a6), its A6); on a press it does not
even show ([Categories](U16-categories.md#omp1), its OMP1).
Basis: probe, 2026-09-25. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The two series lists disagree** · ❓ · minor.
The "Browse" block lists every active series, even one with no published
book (whose page then reads "0 Titles"), and leaves out an inactive one.
The catalog's "Series:" links list only the series holding a published
book, an inactive one included, and an inactive series' page opens like
any other. Any published version counts there: a series whose only book
has only its "Author Original" published stays among the links while its
page reads "0 Titles". A reader therefore meets a different set of series
in each place.
Question: should an inactive series still be offered to readers, and
should a series with no published book be?
Lean: offer an inactive series everywhere and an empty one nowhere; the
box only closes the series to new submissions ("…do not allow new
submissions to be made to it."), and an empty page helps no reader.
Basis: probe, 2026-09-27. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — "Series position" orders compare text** · ❓ · minor.
With "Order of monographs" on "Series position (lowest first)", books
whose "Series Position" reads "Book 1", "Book 2", "Book 3" and "Book 10"
are listed "Book 1", "Book 10", "Book 2", "Book 3": the free-text
positions are compared letter by letter. "Series position (highest
first)" gives the reverse. A featured book stays first under both. A
book with no "Series Position", such as one outside any series, comes
last under "(lowest first)" and first after the featured books under
"(highest first)".
Question: should the numbers inside a position compare by value?
Lean: yes; the field's own examples ("Book 2, Volume 2") invite exactly
the numbered positions this order mixes up.
Basis: probe, 2026-09-27. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A press's category page sets no featured book apart and lists no new releases** · 🐞 · user-visible.
On the catalog and series pages a featured book takes a whole row, and a
series' page lists its new releases above its books. A press's category
page puts the featured books first but draws them like the rest, and
never shows a
"New Releases" list, although the Catalog page offers "New release in
category" and the page's design still holds the list. Expected: the
category's featured books set apart and its new releases listed, as on a
series' page. The same move left the page without page links
([Appearance & theming](U10-appearance-and-theming.md#omp2), its OMP2)
and its order is recorded in [Catalog management](U70-catalog-management.md#a10)
(its A10). It worked until the page moved into the code the three apps
share, in December 2018: a regression.
Since: 2018-12-17 (eight years) · Basis: probe, 2026-09-27; its start, commit. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The catalog pages and the "Browse" block in French show raw text codes** · 🐞 · medium.
With French as the interface language, the count reads
"##catalog.browseTitles##", and "All Books", "New Releases", "Featured",
"No titles have been published yet." and "No new releases are available
at this time." are replaced by codes of the same kind. The placed
"Browse" block reads "##plugins.block.browse##",
"##plugins.block.browse.category##" and "##plugins.block.browse.series##"
in place of "Browse", "Categories" and "Series". "Catalogue", "Séries",
the page links and the block's "Nouveautés" are translated.
Expected: French throughout.
Basis: probe, 2026-10-02. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The catalog's old search address answers a not-found page** · 🐞 · invisible.
Until January 2026 the press's address followed by "catalog/results"
forwarded to the Search page, an address kept since 2020 for old links.
The forwarding was removed, but the address is still listed among the
catalog's pages, so it now answers a not-found page. No page links to it.
Expected: the leftover removed, or the forwarding kept.
Since: 2026-01-14 · Basis: probe, 2026-09-27; its start, commit. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A page past the last one shows the full count and no books** · ❓ · minor.
A catalog or series' page typed past the last one opens with the full
count, "All Books" and "No titles have been published yet.", and no page
link back. On a catalog of five books at "Items per page" 2,
"catalog/page/4" reads "5 Titles" over that message; a series' address
followed by "/99" does the same with the series' count.
"catalog/page/1" and a page that is not a number answer a not-found page
instead.
Question: should a page past the last one show the last page, or answer
a not-found page?
Lean: 🐞; the message contradicts the count above it.
Basis: probe, 2026-09-27. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — An empty "Series" line in the "Browse" block** · 🐞 · minor.
While every series of the press is inactive, the placed "Browse" block
still shows the line "Series", with nothing under it. Expected: the line
left out, as it is on a press with no series.
Basis: probe, 2026-09-27. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A deleted series' menu item stays on the Navigation tab** · ❓ · minor.
Once its series is deleted, a "Series" menu item leaves the header, but
Settings › Website › "Setup" › "Navigation" still lists it, assigned to
its menu, with no warning. Its "Edit" window opens with "Select Series"
on the first remaining series, a series nobody chose for it.
Question: should the item leave the Navigation tab with its series, or
stay there marked as pointing at a deleted series?
Lean: 🐞; either way, the window should not offer another series as the
item's own.
Basis: probe, 2026-09-27. <sup>f-a12</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — OMP `pages/catalog/index.php` dispatches `index`, `page`,
`category`, `fullSize`, `newReleases`, `series`, `thumbnail` and `results`
to `APP\pages\catalog\CatalogHandler` (extends lib/pkp
`PKP\pages\catalog\PKPCatalogHandler`, which adds only
`ContextRequiredPolicy`) and `book`, `download`, `view` to
`CatalogBookHandler` (*Monograph landing page*). Templates: OMP
`templates/frontend/pages/catalog.tpl`, `catalogSeries.tpl`,
`catalogNewReleases.tpl`, `catalogCategory.tpl`, `index.tpl`,
`components/monographList.tpl`, `objects/monograph_summary.tpl`. Code
read 2026-09-27 on the checkouts omp `72a01a026`, ojs `3162c105b`, ops
`e9f6f4f55` (lib/pkp `1ad4a14bb2`).

<a id="fn-b"></a>
**b** — OJS and OPS `pages/catalog/index.php` return `PKPCatalogHandler`
for `category`, `fullSize` and `thumbnail` only (OPS also under
`pages/preprints`), so `catalog`, `catalog/newReleases` and
`catalog/series/…` leave the page router with no handler
(`PKPPageRouter::route()` throws `NotFoundHttpException`). The menu item
types `NMI_TYPE_CATALOG`, `NMI_TYPE_NEW_RELEASE`, `NMI_TYPE_SERIES`,
`NMI_TYPE_CATEGORY` are added by OMP `APP\services\NavigationMenuService`
alone. A context not enabled publicly sends a signed-out visitor to its
Login page before any address is looked up, these included (live-probed
2026-09-27 on OJS and OPS; signed in, or on a context closed by "Users
must be registered…", the same addresses answer the bare "404 Not Found").

<a id="fn-c"></a>
**c** — No page of `CatalogHandler` adds a role assignment; `PKPHandler`
adds `RestrictedSiteAccessPolicy` for a context with `restrictSiteAccess`
(the Login page for a signed-out visitor; `catalog` is not among its
exempt pages), and `PKPPageRouter::route()` sends a signed-out visitor of
a context that is not enabled to its Login page. The templates read no
user or role. Journal identity & about pages (its Rule 22) covers both
settings. A press closed by "Users must be registered…" sends the visitor
to `{press}/login?source=<the page>`; a press not enabled publicly sends
them to `{press}/login` with no source (live-probed 2026-09-27; OJS and
OPS do the same on their home pages).

<a id="fn-d"></a>
**d** — `CatalogHandler::page()`: `filterByContextIds`,
`filterByStatus([STATUS_PUBLISHED])`, `orderBy(catalogSortOption or
datePublished-DESC)`, `orderByFeatured()`; `contextSeries` from the
section collector `withPublished(true)` (a series with a published
publication), in `seq` order, inactive ones kept. `catalog.tpl`: header
`pageTitle="navigation.catalog"` "Catalog", trail `currentTitleKey`,
`<h1>` "Catalog", `catalog.browseTitles` "{$numTitles} Titles", the series
nav `{if $activeTheme->getOption('showCatalogSeriesListing') &&
$contextSeries|@count > 1}` with `<h2>` `series.series` "Series" plus ":"
and links `catalog/series/{path}` named `getLocalizedTitle()` (prefix,
space, title) joined by `common.commaListSeparator`; with no book
`catalog.category.heading` "All Books" and `catalog.noTitles` "No titles
have been published yet."; else `monographList.tpl` with `featured` and no
`titleKey`, then `pagination.tpl`.

<a id="fn-e"></a>
**e** — `CatalogHandler::series()`: `Repo::section()->getByPath()`, else
`$request->redirect(null, 'catalog')`; order from `getSortOption()` (lost,
[Sections](U17-sections.md#omp9) fn f-omp9), `filterBySeriesIds`,
`orderByFeatured()` (features of `ASSOC_TYPE_SERIES`); page from the
second path part; `NewReleaseDAO::getMonographsByAssoc(ASSOC_TYPE_SERIES)`
only when `$page === 1`. `catalogSeries.tpl`: header
`pageTitleTranslated=$series->getLocalizedTitle()`, trail
`breadcrumbs_catalog.tpl` `type="series"`, `<h1>` the title, count, `.cover`
a `div` carrying `href` to `catalog/fullSize?type=series&id={id}` around an
`<img>` from `catalog/thumbnail?type=series&id={id}` (alt the title,
default "null"), the description, `catalog.manage.series.onlineIssn`
"Online ISSN" and `printIssn` "Print ISSN"; with no book "All Books" and
"No titles have been published yet."; else `monographList.tpl` with
`titleKey="catalog.newReleases"` "New Releases" when the list is not
empty, then with `featured` and `titleKey="catalog.category.heading"`
"All Books", then `pagination.tpl` (`catalog/series/{path}/{page}`).
Live-probed 2026-09-25 by the Sections spec (its note td5, f-omp9): a
series' page listed its book with "1 Titles", showed the cover from
`catalog/thumbnail?type=series`, an empty heading and trail step, no
description or ISSN, the tab "| {press name}", the books newest first
under each of the six orders; an old path opened the page headed
"Catalog" with no notice. Seen again 2026-09-27 (Catalog management's
claim check and its OMP suite run): still so, each opening logging the
PHP warning "Undefined property: stdClass::$section_id".

<a id="fn-f"></a>
**f** — `CatalogHandler::newReleases()`:
`NewReleaseDAO::getMonographsByAssoc(ASSOC_TYPE_PRESS, pressId)`
(published submissions only, `ORDER BY p.date_published DESC` of the
current publication), no paging, no usage event. `catalogNewReleases.tpl`:
header `pageTitle="catalog.newReleases"`, trail
`currentTitleKey="catalog.newReleases"`, `<h1>` "New Releases", count
`numTitles=$publishedSubmissions|@count`, with none `catalog.noTitlesNew`
"No new releases are available at this time.", else `monographList.tpl`
with no `featured` and no `titleKey`. Live-probed 2026-09-27 by Catalog
management (its scenarios 2 and 3): the page listed the ticked books
newest first by publication date, whatever the featured order. Live-probed
2026-09-27 (Rule 10): `catalog/newReleases/2` shows the same page as
`catalog/newReleases`; the page has no pages.

<a id="fn-g"></a>
**g** — `monograph_summary.tpl`: `<a class="cover">` to
`catalog/book/{bestId}` (the URL Path when set) around an `<img>` from
`Publication::getLocalizedCoverImageThumbnailUrl()` (the public file's
small copy, or `templates/images/book-default_t.png`) with
`alt="{$coverImage.altText|default:''}"`; `seriesPosition`; the title
`getLocalizedFullTitle(null, 'html')` in a heading, linked the same way;
`getAuthorString(true)` (contributors with `includeInBrowse`, "{name}
({roles})" joined by `common.semicolonListSeparator`);
`datePublished|date_format:$dateFormatLong`. `monographList.tpl` renders a
book whose id is a key of `$featured` on its own, the others in `.row`
pairs; the default theme's `components.less` gives
`.obj_monograph_summary` `width: 50%` and `.is_featured` `width: 100%` at
`@screen-lg-desktop` and wider.

<a id="fn-h"></a>
**h** — OMP `plugins/blocks/browse/BrowseBlockPlugin::getContents()`:
settings `browseNewReleases`, `browseSeries` (every series of the press
from the section collector, `seq` order), `browseCategories`; the
selected series from the requested op `series` and its first argument.
`templates/block.tpl`: `plugins.block.browse` "Browse", `{if
$browseNewReleases}` a link `catalog/newReleases` `navigation.newReleases`
"New Releases", the categories, `{if $browseSeries}` the line
`plugins.block.browse.series` "Series" and per series `{if
!$browseSeriesItem->getIsInactive()}` a link named
`getLocalizedTitle()`, class `current` on the selected one (the default
theme's `sidebar.less`: a 4px left border, the light text colour).
`templates/settingsForm.tpl`: `plugins.block.browse.settings.title`
"Browse Possibilities", boxes `plugins.block.browse.newReleases` "New
releases", `.category` "Categories", `.series` "Series". The series
window's box: OMP `seriesForm.tpl` "Mark this series as inactive and do
not allow new submissions to be made to it.". With only inactive
series `$browseSeries` is not empty, so the "Series" line prints with
nothing under it ([A11](#a11)). Seen 2026-09-25 by the Categories spec (its
claim check K5): a new press's block "Settings" arrive with the three
boxes ticked, and the placed block of a press with no category and no
series shows "Browse" and "New Releases" only.

<a id="fn-i"></a>
**i** — `CatalogHandler::page()`: `catalogSortOption` or
`datePublished-DESC`; OMP `APP\submission\Collector::getQueryBuilder()`
with `orderByFeatured` joins `features` of `ASSOC_TYPE_PRESS` and puts the
rows with a `seq` first, by `seq` ascending; `ORDERBY_SERIES_POSITION`
`reorder()`s by `po.series_position`, a text column, in the chosen
direction. lib/pkp `Collector` orders `title` by the page-language title
(else the submission-language one) and `datePublished` by the current
publication's date.

<a id="fn-j"></a>
**j** — `CatalogHandler::_setupPaginationTemplate()`: `showingStart`,
`showingEnd`, `total`, `nextPage`, `prevPage`; `catalog.tpl` sends page 1
back to `catalog` and later pages to `catalog/page/{n}`; `page()` answers
a not-found page for `page/1`, a missing or non-number page. Count:
`itemsPerPage` of the press, else the configuration's
`[interface] items_per_page`. Live-probed 2026-09-23 by Navigation menus
& site chrome (its note v, Rule 24): at "Items per page" 1 with three
books the catalog read "1-1 of 3 Next", "Previous 2-2 of 3 Next",
"Previous 3-3 of 3", and "Next" and "Previous" moved a page. A series'
page over one page: note td5.

<a id="fn-k"></a>
**k** — OMP `NavigationMenuService::getMenuItemTypesCallback()` offers
"Series" (`navigation.navigationMenus.series.generic`, "Link to a
series.") only while the press has a series;
`getDisplayStatusCallback()` loads the item's stored series id with
`Repo::section()->get()` and links `catalog/series/{current path}`, or
hides the item when the series is gone; `NMI_TYPE_CATALOG` links
`catalog`, `NMI_TYPE_NEW_RELEASE` ("New Releases", "Link to your New
Releases.") `catalog/newReleases`. The inactive flag is not read. The
3.5.0 migration `I10511_RemoveSeriesMenuItems` removed items whose series
no longer existed.

<a id="fn-l"></a>
**l** — lib/pkp `PKPCatalogHandler::category()` (shared, inherited by
OMP) assigns `category`, `parentCategory`, `subcategories`, `results`
(the search builder, `orderBy('featured')` on OMP), `query`,
`searchContext`, `orderBy`, `orderDir`; OMP `catalogCategory.tpl` also
reads `$featuredMonographIds`, `$newReleasesMonographs`, `$prevPage`,
`$nextPage`, `$showingStart`, `$showingEnd` and `$total`, none assigned,
so `monographList.tpl` gets no `featured`, the "New Releases" list is
skipped, and `pagination.tpl` prints nothing.

<a id="fn-m"></a>
**m** — OMP `pages/catalog/index.php` (the ops above);
`CatalogHandler::series()` redirects to `catalog` when `getByPath()`
finds nothing (`$args[0]` missing reads as no path). The header's
"Catalog" is the installed `NMI_TYPE_CATALOG` item of the "Primary
Navigation Menu". A new press's "Sidebar" places no block (the Appearance
spec's Settings bullet 13), and its menus hold no `NMI_TYPE_NEW_RELEASE`
item.

<a id="fn-n"></a>
**n** — OMP `APP\pages\index\IndexHandler::_displayPressIndexPage()`:
`displayNewReleases` →
`NewReleaseDAO::getMonographsByAssoc(ASSOC_TYPE_PRESS)`;
`displayFeaturedBooks` →
`FeatureDAO::getSequencesByAssoc(ASSOC_TYPE_PRESS)` in `seq` order.
`index.tpl` includes `monographList.tpl` with `titleKey`
`catalog.featured` "Featured" and `catalog.newReleases` "New Releases",
and no `featured`. Live-probed 2026-09-24 by Appearance & theming (its
note td4): both boxes unticked on a new press; ticked, "Featured" and "New
Releases" listed the flagged books, "Save Order" on the catalog reordering
"Featured" alone.

<a id="fn-o"></a>
**o** — OMP `plugins/themes/default/DefaultThemePlugin.php` option
`showCatalogSeriesListing`, label
`plugins.themes.default.option.showCatalogSeriesListing.label` "Show
Series", its box "Add list of links to all of the press's series on the
catalog page", default false. Seen 2026-09-24 by Appearance & theming
(its claim check K1): the catalog's series links listed only series
holding a published book.

<a id="fn-p"></a>
**p** — `CatalogHandler::page()` fires `UsageEvent` with
`ASSOC_TYPE_PRESS`, `series()` with `ASSOC_TYPE_SERIES`; `newReleases()`
fires none.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (the absence paragraph): on OJS and OPS the
addresses followed by "catalog", "catalog/newReleases" and
"catalog/series/monographs" answer status 404 with a bare "404 Not
Found" page with no header, signed out and as the Journal Manager
(Preprint Server Manager); Settings › Website › "Setup" › "Navigation" ›
"Add item" offers no "Catalog", "New Releases", "Series" or "Category".
The seeded press opens all three.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Rule 3), two runs: of a book
published on screen, one seeded with a publication date in 2031
(scheduled), one published then unpublished and a second published one,
the catalog listed the two published books, "2 Titles", as did the
Catalog page; the press's manager and Reader saw the same. On a press a
book's first "Publish" assigns "Version of Record 1.0" with no stage to
choose; an "Author Original"-only book comes from "Create New Version" ›
"Publication Stage" "Author Original (AO)", that version's "Publish",
then "Unpublish" on the Version of Record. Such a book left the catalog
and the Catalog page and was not counted. A press with no published book
showed "Home / Catalog", "Catalog", "0 Titles", "All Books", "No titles
have been published yet." and no page links.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Rules 4, 11), two runs: at 1280 and
at 1200 pixels each catalog-featured book took an 860-pixel row of its
own while the other books stood 430 pixels side by side; at 1280 pixels
the home page's "Featured" and "New Releases" lists stood two to a row,
the featured book included; at 800 pixels every book on the catalog and
on both home lists took a whole row.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Rule 6): with "Show Series" ticked,
"Alpha" (prefix "The") and "Beta" each holding a published book and
"Gamma" none, the line read "Series: Beta, The Alpha"; reordering Settings
› Press › "Series" turned it to "The Alpha, Beta" and back. Gamma never
showed. "Beta" marked inactive stayed listed and its page opened with its
book. With one series holding a book, or no series, the line was absent; a
series holding only a scheduled or an unpublished book was not listed. A
second probe the same day saw the same threshold on two more presses
("Series: One, Two"; no line with one).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rules 7, 8): at "Items per page" 1,
a series of three books showed "3 Titles" on every page. Page 1 showed
"New Releases" (the two ticked, newest first) and then "All Books", with
the featured book alone on a full-width row. "Next" led to `…/{path}/2`
and `/3`, which have no "New Releases", and "Previous" on page 2 led
back to the series' address. Two books featured in a series kept their
saved order at both positions. An empty series showed "0 Titles", "All
Books" and "No titles have been published yet.". The series' order
("Title (A-Z)", then "Publication date (oldest first)" saved) left the
books newest first.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Rules 1, 10): at "Items per
page" 1, three new releases were listed on one page, newest first, with
no page links; the catalog-featured one took no row of its own. An
unpublished book dropped out. Once the boxes were unticked the page read
"0 Titles" and "No new releases are available at this time.", right
after and after a reload. On a new press the "Browse" block was enabled
but unticked under "Sidebar", the menus held no "New Releases" item, and
no link on the home, catalog or About page or in the header led to the
page. On a press with the block placed and a "New Releases" menu item,
both led there.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 12): with the block
placed, its lines read top to bottom "New Releases", "Categories" with
the categories, then "Series" with each active series, one with no book
included ("0 Titles" on its page), named with its prefix, in the Series
tab's order at both ends of a reorder. An inactive series was left out
while its page still opened. On a series' page the block marked that
series' link: grey text and a 4-pixel grey bar at its left, the other
links blue. Unticking "New releases" or "Series" in the block's
"Settings" dropped the link or the line on the home page and on a
series' page. With every series inactive, made so from the Series tab's
box and, in a second run, from the series window, the line "Series"
showed with nothing under it; with no series it was left out. The OJS
and OPS blocks carry only "Browse" and "Categories".

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 13), two presses: "Add
item" offered "Catalog", "New Releases" and "Series" (with "Select
Series"); placed in "Primary Navigation Menu", the three opened the
catalog page, the "New Releases" page and the series' page. After the
series' "Path" changed, the item led to the new path; an inactive
series' item stayed in the header; a deleted series' item left the
header but stayed on the Navigation tab ([A12](#a12)). A new press's
"Primary Navigation Menu" already holds "Catalog".

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Rule 14): at 1280 pixels, a
category holding a book featured in the category, one featured in its
series only and one featured in the catalog only listed those three
first, every book 430 pixels wide, two to a row, and no "New Releases"
heading, although another book was ticked "New release in category". On
the same press the catalog set its featured books on rows of their own
and a series' page showed "New Releases". At "Items per page" 2 with
three books the page read "3 Titles", showed two and had no page links;
a typed second page showed the same first page. The seeded press's
home, "Catalog", then a category page, twice, loaded each time on the
Mac test machines (PHP 8.4), where Categories' OMP5 (PHP 8.3 with
OPcache) is not expected; whether it recurs on this spec's pages there
is unsettled.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27 (Rule 4; A6), two runs: "Series
position (lowest first)" listed "Book 1", "Book 10", "Book 2", "Book 3",
then the book with no position; "(highest first)" the reverse, the book
with no position first after the featured one. The featured book led
under all six choices. "Title (A-Z)" and "Title (Z-A)" ordered the rest
by title, "Publication date (oldest first)" by date.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 (Rule 2a; A9): the seeded press's
"catalog/results" and "catalog/results?query=book" both answer the bare
"404 Not Found" page.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (Rule 15; A8), two runs, OJS and OPS
as controls: in French (`/fr_CA/`) the count read
"##catalog.browseTitles##" on the catalog, series, "New Releases" and
category pages; "All Books" "##catalog.category.heading##"; "New
Releases" "##catalog.newReleases##" on a series' list, the home list and
the "New Releases" page's tab, trail and heading; "Featured"
"##catalog.featured##"; the empty messages "##catalog.noTitles##" and
"##catalog.noTitlesNew##". "Catalogue" (tab, trail "Accueil /
Catalogue", heading), the page links ("1-1 de 2 Suivant", "Précédent
2-2 de 2") and "Séries:" were translated. The placed block read
"##plugins.block.browse##", "##plugins.block.browse.category##",
"##plugins.block.browse.series##" and "Nouveautés"; the OJS and OPS
blocks read "Parcourir" and "Catégories". No ISSN line showed in English
or French.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27 (Actors row 1; Settings bullet 8): with
the box ticked, a signed-out visitor opening the catalog page, the series'
page and the "New Releases" page (and the home page, a later catalog page,
a book's page) lands on the Login page; the press's Reader, its manager
and a signed-in user with no role there open each one.

<a id="fn-s"></a>
**s** — Scenario seeding. Scenario 7 runs on `publicknowledge` of OJS
and OPS as `manager.maya` (the Journal Manager, the Preprint Server
Manager), its control on OMP `publicknowledge` signed out and as
`manager.maya` (the Press Manager); scenario 6's control opens OMP
`publicknowledge`'s `catalog` signed out; passwords as
`docs/process/users.md` gives them. Every other scenario builds its own
scratch press (two in scenario 5) through `POST scenarios/context` with
throwaway `users[]` (password: the username twice): an `author` (the
books' submitter) in scenarios 1 to 5, scenario 1's with `givenName`
Nova and `familyName` Reed, and a `reader` in scenario 6. Press keys:
scenario 1 `name: 'Harbour Press'`, `displayFeaturedBooks: true`,
`displayNewReleases: true`; scenario 2 `name: 'Lantern Press'`;
scenarios 2, 3 and 4 `itemsPerPage: 2`; scenario 4 `catalogSortOption:
'title-ASC'`; scenario 3 `series: [{path: 'history', title:
'History'}]`; scenario 5 `themeOptions: {showCatalogSeriesListing:
true}`, `sidebar: ['browseblockplugin']` and `series` `history`,
`poetry`, `drama` (titled "History", "Poetry", "Drama"), its second
press the same two keys with `series: [{path: 'essays', title:
'Essays'}]` and `plugins: {browseblockplugin: {enabled: true,
settings: {browseNewReleases: false, browseSeries: false}}}`; scenario 6
`restrictSiteAccess: true` and `series: [{path: 'history', title:
'History'}]`. Books come from `POST scenarios/submission` with
`title`, the author as `submitter`, `published: true` and
`datePublished` where a date is named (the others take the day of the
run). Scenario 1: "Beta" `urlPath: 'beta-book'`; "Delta" `featured:
[{in: 'catalog'}]`; "Beta" and "Gamma" `newRelease: [{in: 'catalog'}]`;
"Epsilon" `published: true` with `datePublished: '2031-01-10'`, which
schedules it; "Zeta" without `published`. Scenario 2: "Alpha",
"Beta", "Gamma" `newRelease: [{in: 'catalog'}]`, "Alpha" also
`featured: [{in: 'catalog'}]`. Scenario 3: every book `series:
'history'`; "Coastal Towns" `seriesPosition: 'Book 1'`; "Coastal
Towns", then "River Histories", `featured: [{in: 'series', path:
'history', position: n}]` with n = 1, 2, seeded in that order;
"Coastal Towns", "Old Mills" and "Harbour Walls" `newRelease: [{in:
'series', path: 'history'}]`. Scenario 4: "Oak", then "Elm",
`featured: [{in: 'catalog', position: n}]` with n = 1, 2, seeded in
that order. Scenario 5: each book `series` its series' path. The
window is the browser's viewport: 1280 pixels wide where a scenario
reads 1200 or wider, 800 where it names 800. The visitor is a browser
with no session. The pages: the catalog `{press}/catalog` and
`{press}/catalog/page/{n}`, a series' page
`{press}/catalog/series/{path}[/{n}]`, "New Releases"
`{press}/catalog/newReleases`, a book's page `{press}/catalog/book/{id
or URL Path}`.

<a id="fn-f-a1"></a>
**f-a1** — `catalog.browseTitles` "{$numTitles} Titles" has no singular
form (OMP `locale/en/submission.po`); the catalog, series and "New
Releases" templates all use it. Seen 2026-09-25 by the Sections spec
(its note td5): a series' page read "1 Titles".
Issue report: [pkp-e2e#587](https://github.com/jardakotesovec/pkp-e2e/issues/587) ([docs/issues/U16-A19-one-item-reads-1-items.md](../issues/U16-A19-one-item-reads-1-items.md)), shared with [Categories A19](U16-categories.md#a19).

<a id="fn-f-a2"></a>
**f-a2** — Note g: the cover `<a>` holds only the `<img>`, whose
`alt` defaults to empty; a book with no cover gets
`templates/images/book-default_t.png` with an empty `alt`. Seen
2026-09-24 by Appearance & theming (its claim check K2) on a press's home
page and catalog, and live-probed 2026-09-27 on the catalog, a
series' page, "New Releases", a category's page and both home lists: the
cover links with no alternate text, a cover-less book's included, had no
name; with "Alternate text" "Cover of C2" typed on the Catalog Entry
page, the link was named "Cover of C2". The Catalog Entry page shows the
"Alternate text" box only once an image is uploaded.

<a id="fn-f-a3"></a>
**f-a3** — [Sections](U17-sections.md#omp9) fn f-omp9: OMP
`classes/section/DAO.php` `getByPath()` builds the series from
`$row->section_id`, so its settings (title, prefix, description, ISSNs,
`sortOption`) are lost; the id, path, image and inactive flag survive, so
the lists, the featured order and the new releases still work. Seen
2026-09-27 (Catalog management's claim check K3 and OMP suite run): the
heading and last trail step empty, the tab "| {press name}", the warning
logged on each opening. Live-probed 2026-09-27 again, on four presses: the
ISSNs 0378-5955 and 2049-3630 saved and re-read in the series window, and
no ISSN line on the page in English or French; the picture's `alt` a blank
space, which a screen reader names nothing. The "Since" date is read from
the code's history: the last change to `classes/section/DAO.php`,
`4c2b5d77b` "pkp/pkp-lib#13003 Port batch loading to OMP" (2026-08-26).

<a id="fn-f-a4"></a>
**f-a4** — Note e: the `.cover` wrapper is a `div` with an `href`, which
browsers do not follow. Seen 2026-09-25 by the Sections spec (its
f-omp9): the wrapper a `div` carrying an `href` rather than a link.

<a id="fn-f-a5"></a>
**f-a5** — Notes d and h: the catalog's series list is the section
collector `withPublished(true)` with no inactive filter; the block's is
every series with the inactive ones skipped in the template. Live-probed
2026-09-27 (three probes): the placed block listed an active series with
no book ("0 Titles") and dropped a series once its inactive box was saved;
the catalog's "Series:" kept the inactive one and never listed the empty
one; the inactive series' page opened as before. A series whose only book
had only its "Author Original" published stayed on "Series:" while its
page read "0 Titles" (two runs; the collector's `withPublished(true)`
counts any published publication).

<a id="fn-f-a6"></a>
**f-a6** — Note i: `publications.series_position` is text; the order is
the database's text order. Live-probed 2026-09-27 (note td10): "Book 1",
"Book 10", "Book 2", "Book 3" lowest first, the reverse highest first, the
featured book first under both. The book with no position came last and
first: the PostgreSQL test database's placement of empty values (a MySQL
install was not driven).

<a id="fn-f-a7"></a>
**f-a7** — Note l. OMP `38a6184f5` "pkp/pkp-lib#4158 Share catalog
management in pkp-lib" (2018-12-17) removed OMP's own
`CatalogHandler::category()`, which assigned `featuredMonographIds`
(`ASSOC_TYPE_CATEGORY`) and `newReleasesMonographs`; the shared handler
never did, and lib/pkp `ce23e18e83` "pkp/pkp-lib#8920 Convert catalog
handler to search toolset" (2026-01-09) dropped its paging variables.
Live-probed 2026-09-27 (note td9): no featured book set apart
and no "New Releases" list while the Catalog page offered "New release
in category". The expectation, the start date and the 2018 history are
read from the code and its history.

<a id="fn-f-a8"></a>
**f-a8** — OMP `locale/fr_CA/locale.po` and `submission.po` hold empty
strings for `catalog.browseTitles`, `catalog.category.heading`,
`catalog.noTitles`, `catalog.noTitlesNew`, `catalog.newReleases`,
`catalog.featured`, `catalog.manage.series.onlineIssn` and `printIssn` (no
ISSN line shows in any language, [A3](#a3)); `navigation.catalog`
"Catalogue", `navigation.newReleases` "Nouveautés", `series.series`
"Séries", `help.previous`, `help.next` and `common.pagination` are
translated. lib/pkp `Locale::translate()` prints "##{key}##" for a key
with no text. The browse block's
`plugins/blocks/browse/locale/fr_CA/locale.po` holds no strings (its `fr`
file does), hence the block's codes. The Categories spec saw
"##catalog.browseTitles##" and "##catalog.category.heading##" on a press's
category page in French (2026-09-25, its A15). Live-probed 2026-09-27
(note td12). The empty strings and the expectation are read from the code.
Re-walked 2026-10-02 on main and stable-3_5_0 (codes on both; 3.4 and 3.3 the same empty entries by code). Issue report: [pkp-e2e#291](https://github.com/jardakotesovec/pkp-e2e/issues/291) ([docs/issues/U69-A15-omp-french-book-page-raw-keys.md](../issues/U69-A15-omp-french-book-page-raw-keys.md)), shared with [Categories A15](U16-categories.md#a15).

<a id="fn-f-a9"></a>
**f-a9** — OMP `4d4f2c519` "Clean up old code" (2026-01-14) removed
`CatalogHandler::results()` ("@deprecated Since OMP 3.2.1, use
pages/search instead", a redirect to `search`); `pages/catalog/index.php`
still lists `results`, and `PKPPageRouter::route()` answers
`NotFoundHttpException` for an op the handler lacks. Live-probed
2026-09-27 (note td11): both addresses answer the bare 404 page.

<a id="fn-f-a10"></a>
**f-a10** — Note j: `page()` refuses page 1 and a missing or non-number
page, but not a number past the last; `series()` reads its page from the
second path part the same way. Live-probed 2026-09-27 (the catalog in two
runs, a series' page in one): "catalog/page/4" at "Items per page" 2 with
five books read "5 Titles", "All Books" and "No titles have been published
yet." with no page links (an empty press's "catalog/page/2" read "0
Titles" the same way); a series of three read "3 Titles" the same way at
"…/99"; "catalog/page/1", "/page/0", "/page/abc" and "/page" answered 404.

<a id="fn-f-a11"></a>
**f-a11** — Note h: the block prints the line while the press has any
series and skips each inactive one under it. Live-probed 2026-09-27, two
runs: a press whose only series was made inactive from the Series tab's
box, and one made so from the series window, showed "Browse", "New
Releases", "Series"; a press with no series showed "Browse", "New
Releases".

<a id="fn-f-a12"></a>
**f-a12** — Note k: `getDisplayStatusCallback()` hides the item from the
public menu once `Repo::section()->get()` finds no series; the item and
its assignment stay stored. The 3.5.0 migration
`I10511_RemoveSeriesMenuItems` removed such items once. Live-probed
2026-09-27 on two presses: after the delete ("Are you sure you wish to
delete this item? This action cannot be undone.", OK) the item was still
listed under "Navigation Menu Items" and among "Primary Navigation Menu"'s
assigned items, with no warning mark; its "Edit" window showed "Select
Series" on the first remaining series ("Alpha", "Keep"), and closing it
untouched asked "The data on this form has changed. Do you wish to
continue without saving?".

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The catalog page, its later pages | header "Catalog"; `{press}/catalog`, `{press}/catalog/page/{n}` | AFFR-070, ROUTE-056 (`index`, `page`) |
| A series' page | `{press}/catalog/series/{path}[/{n}]` | AFFR-073, ROUTE-056 (`series`) |
| The series' picture | `{press}/catalog/thumbnail?type=series&id={id}`, `…/fullSize?type=series&id={id}` | ROUTE-056 (`thumbnail`, `fullSize`; the category type is *Categories*') |
| The "New Releases" page | `{press}/catalog/newReleases` | AFFR-074, ROUTE-056 (`newReleases`) |
| The book summary | every list above, the home page's lists, a press's category pages | AFFR-071 |
| The home page's "Featured" and "New Releases" | `{press}/index`, while "Featured Books" / "New Releases" are ticked | AFFR-026 |
| The "Browse" block's "New Releases" and "Series" lines, its "Settings" | the sidebar; Settings › Website › "Plugins" › "Browse Block" › "Settings" | AFFR-087; PLUG-001 (its series links: Rule 12, A5; the block itself: *Categories*) |
| A press's category page, its differences | `{press}/catalog/category/{path}` | AFFR-072 (its OMP rows; the page: *Categories*) |
| "Catalog", "New Releases", "Series" menu items | Settings › Website › "Setup" › "Navigation" | NMI types (the item window: *Navigation menus & site chrome*) |
| The old search address | `{press}/catalog/results` | ROUTE-056 (`results`, A9) |
| The monograph cover server | `$$$call$$$/submission/cover/cover`, `…/thumbnail` | GRID-099: no page, template or script requests it; the summaries and the book's page use the public files' small copies (note g). Dead-code candidate in `docs/tracking/UNASSIGNED.md` |

## Reference — code anchors

- Pages: OMP `pages/catalog/index.php`, `pages/catalog/CatalogHandler.php`;
  lib/pkp `pages/catalog/PKPCatalogHandler.php`; OMP
  `pages/index/IndexHandler.php` (`_displayPressIndexPage()`).
- Templates: OMP `templates/frontend/pages/catalog.tpl`,
  `catalogSeries.tpl`, `catalogNewReleases.tpl`, `catalogCategory.tpl`,
  `index.tpl`; `templates/frontend/components/monographList.tpl`;
  `templates/frontend/objects/monograph_summary.tpl`; lib/pkp
  `templates/frontend/components/breadcrumbs_catalog.tpl`,
  `pagination.tpl`.
- Lists and order: OMP `classes/submission/Collector.php`
  (`orderByFeatured()`, `filterBySeriesIds()`), `classes/press/FeatureDAO.php`,
  `classes/press/NewReleaseDAO.php`, `classes/section/DAO.php`
  (`getByPath()`); lib/pkp `classes/section/Collector.php`
  (`withPublished()`), `classes/submission/Collector.php`.
- Covers: OMP `classes/publication/Publication.php`
  (`getLocalizedCoverImageThumbnailUrl()`); unused:
  `controllers/submission/CoverHandler.php`,
  `templates/controllers/monographList/coverImage.tpl`.
- Browse block: OMP `plugins/blocks/browse/BrowseBlockPlugin.php`,
  `BrowseBlockSettingsForm.php`, `templates/block.tpl`,
  `templates/settingsForm.tpl`.
- Menu items: OMP `classes/services/NavigationMenuService.php`,
  `templates/controllers/grid/navigationMenus/seriesNMIType.tpl`.
- Theme: OMP `plugins/themes/default/DefaultThemePlugin.php`
  (`showCatalogSeriesListing`), `styles/components.less`,
  `styles/sidebar.less`.
- Strings: OMP `locale/en/locale.po` (`catalog.*`, `navigation.catalog`,
  `navigation.newReleases`, `navigation.navigationMenus.*`,
  `series.series`), `locale/en/submission.po` (`catalog.browseTitles`),
  `plugins/blocks/browse/locale/en/locale.po`.
