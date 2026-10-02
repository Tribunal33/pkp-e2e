---
name: article-landing-page-and-reading
status: verified
---

# Article landing page & reading {OJS OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every published article has a public page of its own, its **landing
page**: the page a reader reaches from an issue's table of contents, the
home page, a category page, a search result, a link someone shared or
the article's address typed by hand. It shows what the article is (title,
contributors, abstract, keywords, dates and versions, references, how to
cite it) and lists the article's galleys, the files a reader opens: a PDF
opens in a reader page, a journal's HTML full text in a reader page of its
own, anything else downloads. This spec describes that
page, its addresses and versions, the galley readers, the "How to Cite"
block and its settings, the extra blocks a journal can switch on, the
open peer reviews a journal marks public (which the page never shows), and the
short summary of an article that the listing pages print. On a preprint
server the page is the preprint's page, and "Published" reads "Posted".
<sup>a</sup>

Several blocks on the page are described by the feature that fills them:
the contributors and their biographies
([Contributors & affiliations](U41-contributors-and-affiliations.md)),
the "License", "Data Availability Statement" and "Funding Statement"
blocks ([Publication metadata](U40-publication-metadata.md)), "Funders"
([Funding](U43-funding.md)), a journal's "URN"
([Identifiers](U44-identifiers.md)), a journal's comments blocks
([Reader comments & moderation](U14-reader-comments-and-moderation.md)),
a journal's "JATS XML" link (*JATS & Body Text*) and a journal's
Crossmark button and "Cited by" block (*DOIs*). A press's book page is a separate feature, *Monograph landing
page*. <sup>a</sup>

## Actors & permissions

The page is public: a **visitor** needs no account, and signing in, as a
Reader or in any other role, changes nothing in a published version's
page content except the comments blocks
([Reader comments & moderation](U14-reader-comments-and-moderation.md)).
A journal that requires visitors to sign in ("Users must be registered
and log in to view the journal site."; "…to view the server site." on a
preprint server) or that the Site Administrator has not enabled sends a
signed-out visitor who opens an article's page or a galley's address to
the Login page; a signed-in Reader of the journal reads it. Both settings
are described in
[Journal identity & about pages](U07-journal-identity-and-about-pages.md)
(its Settings bullets 7 and 8). On a journal that sells subscriptions,
what a visitor may open is *Subscriptions & open access control*'s.
<sup>b</sup> <sup>q1</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Read a published version's page** (the current version, or an older one at its own address) | • anyone, signed in or not (Rules 1, 2) <sup>b</sup> <sup>q1</sup> |
| **Open an unpublished version's page** | • the Journal Manager, the Site Administrator and a Section Editor assigned to the submission, whose workflow offers "Preview" ([Workflow screen & stage access](U24-workflow-screen-and-stage-access.md), Rule 6), under the preview notice (Rule 4)<br>• the submission's Author, by typing the page's address; the Author's workflow offers no "Preview"<br>• a visitor, a Reader and a Reviewer get the "404 Not Found" page (Rule 3) <sup>b</sup> <sup>q3</sup> |
| **Open or download a galley** | • anyone who may read the page, on a journal whose content is open and on every preprint server (Rules 10, 11)<br>• on a journal with subscriptions, *Subscriptions & open access control* decides <sup>b</sup> |
| **Show the citation in another format; download a citation** | • anyone who may read the page, while the "Citation Style Language" plugin is on (Rule 15) ⚠ [OJS1](#ojs1) <sup>h</sup> |
| **Configure "How to Cite" and the journal's extra blocks** (the plugins' "Settings" windows, the chart choice) | • whoever opens the Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)), on Settings › Website › "Plugins" and "Appearance" (Rules 16, 17, 19, 20) <sup>i</sup> |
| **Comment on the article** {OJS} | • described in [Reader comments & moderation](U14-reader-comments-and-moderation.md) |

## Fields & validation

<a id="page"></a>
**The landing page.** Two columns: the main column with the article's
text, and beside it a narrower column with the files and the details. A
part appears only when the version has something to put in it (Rule 6).
Top to bottom, the main column holds: <sup>c</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Breadcrumb** | — | Journal: "Home / Archives / {issue} / {section}", the issue left out for an article in no issue; preprint server: "Home / {section}" ("Home / Preprints" on the seeded server). "Home", "Archives" and the issue are links. <sup>c</sup> |
| **Notices** | — | The preview notice (Rule 4) or the older-version notice (Rule 5). |
| **Label line** {OPS} | — | Above the title: "Preprint / {date} ({version name})" (Rule 9). |
| **Title**, **subtitle** | — | The version's title as the page heading, its subtitle under it. <sup>c</sup> |
| **Contributors** | — | The contributor list described in [Contributors & affiliations](U41-contributors-and-affiliations.md), its Rule 14. |
| **"DOI:"** | — | The version's DOI as its full address ("https://doi.org/…"), a link. Which DOI an older version shows, and how a version gets one, is *DOIs*'. <sup>c</sup> |
| **"Keywords:"** | — | The version's keywords in the interface language, joined by commas, as plain text. They come in no fixed order, not always the order they were typed in ⚠ [A11](#a11). The label is a raw code on a preprint server's French page [OPS7](#ops7). <sup>c</sup> |
| **"Abstract"** | — | The abstract, as formatted in the editor. <sup>c</sup> |
| **"Plain Language Summary"** | — | The plain language summary, under its own heading. <sup>c</sup> |
| **"Downloads"** | — | The chart of Rule 17, only when the theme is set to show one. |
| **"Author Biography"** / **"Author Biographies"** | — | Described in [Contributors & affiliations](U41-contributors-and-affiliations.md), its Rule 14. |
| **"References"** | — | Rule 18. |
| **"Comments on this publication"** {OJS} | — | Described in [Reader comments & moderation](U14-reader-comments-and-moderation.md). |
| **Recommendations** {OJS} | — | Under the article, the lists of Rule 20 when their plugins are on; neither list ever appears [OJS4](#ojs4) [OJS10](#ojs10). <sup>n</sup> |

The side column, top to bottom on a journal: <sup>c</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Cover image** | — | The version's cover image. On a journal, an article with no cover image of its own in an issue with a cover shows the issue's cover instead, as a link to the issue's page. <sup>c</sup> <sup>q6</sup> |
| **Galley links** | — | The main galleys (Rule 10). |
| **"JATS XML"** {OJS} | — | A link to the article's JATS XML, while it is public (*JATS & Body Text*). |
| **Additional files** | — | The galleys of supplementary components (Rule 10). |
| **"Published"** ("Posted") | — | The date line of Rule 7. |
| **"Versions"** | — | The list of Rule 8. |
| **"Data Availability Statement"**, **"Funding Statement"** | — | Described in [Publication metadata](U40-publication-metadata.md), its Rule 15. |
| **"Issue"** {OJS} | — | The issue's name ("Vol. 1 No. 2 (2014)"), a link to the issue's page. <sup>c</sup> |
| **"Section"** {OJS} | — | The section's name, plain text. <sup>c</sup> |
| **"Categories"** | — | The version's categories, each a link to that category's page. A preprint server names a subcategory "{parent} > {subcategory}"; a journal prints the subcategory's own name. <sup>c</sup> <sup>q6</sup> |
| **"Article Number"** {OJS} | — | The version's article number, plain text. <sup>c</sup> |
| **"Funders"** | — | Described in [Funding](U43-funding.md), its Rule 9. |
| **"Comments"** {OJS} | — | Described in [Reader comments & moderation](U14-reader-comments-and-moderation.md). |
| **"URN"** {OJS} | — | Described in [Identifiers](U44-identifiers.md), its Rule 21. |
| **"License"** | — | Described in [Publication metadata](U40-publication-metadata.md), its Rule 15. |
| **"How to Cite"** | — | Rule 15, at the foot of the column. On a preprint server it sits right after "Categories", above the statements. <sup>q6</sup> |
| **Publication Facts** {OJS} | — | The panel of Rule 19, which never appears [OJS5](#ojs5). <sup>q6</sup> |
| **"Cited by"** {OJS} | — | Described in [DOIs](U45-dois.md#cited-by), its Rule 42a; the column's last block, after the Crossmark button. |

On a preprint server the side column runs: cover image, galley links,
additional files, "Posted", "Versions", "Categories", "How to Cite", "Data
Availability Statement", "Funding Statement", "Funders", "License". <sup>c</sup>

**The PDF reader page.** Opened from a PDF galley (Rule 11). A bar across
the top holds a return arrow, the version's title and a "Download" button;
under it the PDF fills the page in a viewer with its own page, zoom, search
and print controls, a sidebar of page thumbnails, drawing and highlighting
tools ("Highlight", "Text", "Draw", "Add or edit images") and a "Save"
that downloads the file. On an older version's galley an outdated-version
notice sits between the bar and the viewer (Rule 12). The browser tab
reads "View of {title}"; on a French page a journal's reads "Vue de
{title}" and a preprint server's "##article.pageTitle##" ⚠ [OPS8](#ops8).
<sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Return arrow** | — | An arrow with no visible text. A screen reader reads "Return to Issue Details" for a journal article in an issue ⚠ [OJS6](#ojs6), "Return to Article Details" for one in no issue, and "##article.return##" on a preprint server ⚠ [OPS5](#ops5). Opens the article's page. <sup>d</sup> |
| **Title** | — | The galley's version's title, a link to the article's page. <sup>d</sup> |
| **"Download"** | — | Downloads the PDF under its file name. A screen reader reads "Download PDF". <sup>d</sup> |

**The HTML reader page** {OJS}. Opened from an HTML galley (Rule 11): the
same bar with the return arrow ("Return to Article Details") and the
title, no "Download", and the HTML full text filling the page under it.
The title is the current version's, even on an older version's galley.
<sup>e</sup> <sup>q9</sup>

<a id="how-to-cite"></a>
**The "How to Cite" block.** Shown while the "Citation Style Language"
plugin is on (Settings bullet 4). <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **"How to Cite"** | — | The heading, then the citation of the shown version in the journal's primary format (APA until a manager chooses another, Rule 16). <sup>h</sup> |
| **"More Citation Formats"** | — | A button that opens a list of the formats the journal offers: "ABNT", "ACM", "ACS", "AMA", "APA", "Chicago", "Harvard", "IEEE", "MLA", "Turabian", "Vancouver" on a new journal (Rule 15a). With none offered it opens nothing (Rule 16, [A9](#a9)). <sup>h</sup> |
| **"Download Citation"** | — | Under the formats, inside the same list, while at least one download format is on: "Endnote/Zotero/Mendeley (RIS)" and "BibTeX" on a new journal (Rule 15b). <sup>h</sup> |

**The "Citation Style Language" settings window.** Settings › Website ›
"Plugins" › "Installed Plugins", the "Citation Style Language" row's
"Settings" (the row offers it only while the plugin is on). <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Primary Citation Format** | No | "Select which citation format you would like to display by default on your article landing page." One choice per format, as listed above. On a new journal none is chosen and the page uses APA. <sup>i</sup> <sup>q12</sup> |
| **Additional Citation Formats** | No | "Select which additional formats you'd like to offer your readers." A box per format, all ticked on a new journal. <sup>i</sup> |
| **Downloadable Formats** | No | "Select which downloadable formats you'd like to offer your readers. Downloadable formats are typically used for importing into third-party bibliography management software, like EndNote or Zotero." The two download formats, both ticked on a new journal. <sup>i</sup> |
| **Publisher Location** | No | Under 'Some citation formats request the geographic location of the publisher, such as "London, U.K.".' Any text; empty on a new journal. <sup>i</sup> |
| **OK** / **Cancel** | — | "OK" stores all four, closes the window and shows "Your changes have been saved."; "Cancel" stores nothing and asks nothing. The window's "Close" after a change asks "The data on this form has changed. Do you wish to continue without saving?", and leaving the page asks the browser's "Leave site?"; nothing is stored either way. <sup>i</sup> <sup>q12</sup> |

**The "Publication Facts Label plugin" settings window** {OJS}. The
plugin row's "Settings". It opens with the warning "Funding Plugin Not
Present" ⚠ [OJS2](#ojs2), then these fields. Its "OK", "Cancel" and
"Close" behave as the "Citation Style Language" window's. When "OK" is
refused, the window stays open with the message, but its fields show the
values saved before: whatever was just typed or ticked is gone
⚠ [OJS7](#ojs7). <sup>k</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Society name or acronym**, **URL** | No | Under "Journal Information". Meant for the panel's "Society" row, the name linked to the address [OJS5](#ojs5). An address that is not a web address is refused in the window with "Please enter a valid URL." under the box, and nothing is saved. <sup>k</sup> <sup>q15</sup> |
| **Start Date** | No | Under "Exclude by Date": articles submitted before it are meant to get no panel (Rule 19). A date picker (year-month-day); letters cannot be typed. An impossible date such as "2026-99-99" is not refused: "OK" shows "Your changes have been saved." and stores no start date, and the box is empty when the window reopens ⚠ [OJS8](#ojs8). <sup>k</sup> |
| **Directory of Open Access Journals**, **Google Scholar**, **Latindex**, **MEDLINE** | No | Under "Automated Listing of Indexes in the PFL". Each ticked index is meant to be listed under the panel's "Indexed in". The journal's listing in DOAJ, Latindex and MEDLINE is checked against the index on "OK"; a listing the check cannot confirm is refused, in a notice and not beside the box, with "The journal's indexing in {index} could not be verified. Ensure that your journal is indexed and the appropriate ISSN is configured in Journal Settings." <sup>k</sup> <sup>q15</sup> |
| **Scopus** and **Web of Science** "URL" | No | Under "Manual Listing of Indexes in the PFL", each with its steps. A Scopus address must have the form of a Scopus source page, a Web of Science address must start with the Master Journal List's address; otherwise "The Scopus URL you entered is not correct. Please read the instructions and try again." ("The Web of Science URL you entered is not correct. Please read the instructions and try again."). <sup>k</sup> <sup>q15</sup> |

<a id="summary"></a>
**The article summary.** How the listing pages show one article: an
issue's table of contents (*Issues*), a journal's "Latest Publications"
and a preprint server's "Latest preprints" on the home page
([Appearance & theming](U10-appearance-and-theming.md), Rules 13 and 16),
a preprint server's "Archives" page (the main menu's "Archives") and
section pages (*Sections*), category
pages (*Categories*) and search results ([Search](U15-search.md), Rule 6).
Top to bottom: <sup>j</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Cover image** | — | The current version's cover image, a link to the article's page (Rule 22). <sup>j</sup> |
| **Title** | — | Title and subtitle, a link to the article's page. <sup>j</sup> |
| **Authors** | — | The author line described in [Contributors & affiliations](U41-contributors-and-affiliations.md), its Rule 15, left out in an issue's table of contents when the section omits author names {OJS} (Settings bullet 10). <sup>j</sup> |
| **Pages** {OJS} | — | The version's pages, when set. <sup>j</sup> |
| **"DOI:"** {OPS} | — | Meant to show the preprint's DOI as a link; never shows ⚠ [OPS6](#ops6). <sup>j</sup> |
| **Keywords** {OPS} | — | The current version's keywords, one after another, in no fixed order [A11](#a11). <sup>j</sup> |
| **Details line** {OPS} | — | "Downloads: {count} - Submitted {date} - Posted {date}", then " - Versions: {count}" once more than one version is posted. <sup>j</sup> |
| **Date** {OJS} | — | The publication date, on search results only. <sup>j</sup> |
| **Galley links** | — | As on the landing page (Rule 10), except on search results and category pages, which leave them out (Rule 22). |

## Rules & state

1. **The page's address.** The article's page lives at the journal's
   address followed by "article/view/" ("preprint/view/") and the
   article's number, or its **URL Path** once one is set on the Publication
   Settings page (a preprint server's "Preprint entry" page;
   [Publish, schedule & versions](U49-publish-schedule-and-versions.md)).
   With a URL Path set, an address that uses the number forwards to the
   URL Path one, keeping any galley or version part that followed the
   number ⚠ [OPS2](#ops2). <sup>f</sup> <sup>q2</sup>
2. **Which version the page shows.** The article's address shows the
   **current version**: the most recently published one. Each older
   published version has an address of its own, reached from the
   "Versions" list (Rule 8): the article's address followed by
   "/version/" and an id the "Versions" link carries, not the version's
   number ("…/version/68" for "Version of Record 1.0"). The current
   version's own such address opens the same page as the article's
   address. A version address naming an id the article has no published
   version under (a mistyped one, or another article's version) answers
   the "404 Not Found" page on a preprint server; on a journal it fails
   with a server error
   ([→ Publish, schedule & versions, OJS3](U49-publish-schedule-and-versions.md#ojs3)).
   <sup>f</sup> <sup>q2</sup>
3. **Nothing published, no page.** While an article has no published
   version (a scheduled article included), its address answers the "404
   Not Found" page to a visitor and a Reader. So does the own address
   of a version not yet published (a new version's "Preview" opens it,
   Rule 4) or no longer published (Rule 7b), and a number or URL Path
   matching no article of the journal. <sup>f</sup> <sup>q3</sup>
   <sup>g</sup>
4. **The preview.** An unpublished version's page opens for those
   Actors row 2 names under the notice "This is a preview and has not
   been published. View submission". It looks as it will once published,
   except that it has no "Published" ("Posted") line and no "Versions"
   list. On a preprint server the label line names the preview day and
   the version's name as it stands ("Preprint / 2026-09-25 (Author
   Original 1.2)"). "View submission" opens the submission's workflow on
   its current stage for those whose workflow offers "Preview"; the
   submission's Author gets the access-denied page instead ("The current
   role does not have access to this operation.") ⚠ [A5](#a5). On a
   preprint server, previewing a new version while an
   earlier one is posted adds the older-version notice of Rule 5 under
   it ⚠ [OPS1](#ops1).
   <sup>f</sup> <sup>q3</sup>
5. **An older version's notice.** An older version's page opens with
   "This is an outdated version published on {date}. Read the most recent
   version.", the date being that version's own; "most recent version"
   opens the article's address. The page is headed with the older
   version's title, but the browser tab reads the current version's
   title ⚠ [A6](#a6).
   <sup>f</sup> <sup>q4</sup>
6. **Empty parts are left out.** Every part of the page's tables appears
   only when the version has something to put in it: an article with only
   a title, one contributor and an abstract shows the breadcrumb, the
   title, the contributor, "Abstract", "Published" and "Versions", on a
   journal also "Section" (and "Issue", with the issue's cover, when it is
   in an issue that has one), and no other heading. The preprint page's
   "References" heading is the exception (Rule 18).
   <sup>c</sup> <sup>q6</sup>
7. **The date line.** Under "Published" ("Posted"): the first
   version's page, its date; a later version's, "{first date} —
   Updated on {its own date}". The first date is the earliest of the
   article's versions, published or not (Rule 7b); while a version is
   prepared, its creation day (Rule 7a).
   <sup>g</sup> <sup>q5</sup>
   - 7a. **A version being prepared.** Creating it rewrites every
     published version's line: versions of 2026-09-01 and 2026-09-24,
     then one created 2026-09-25, give "Published 2026-09-25 — Updated
     on 2026-09-24" on the current page and "Published 2026-09-25 —
     Updated on 2026-09-01" on the first's
     ([→ Publish, schedule & versions, A6](U49-publish-schedule-and-versions.md#a6)).
   - 7b. **An unpublished first version.** The first version goes
     offline while a later one stays published by "Unpublish"
     ("Unpost") on that version, or on a journal by the issue's "Remove"
     on an article whose second version was published with "Don't Assign
     To An Issue" ([→ Issues, A18](U50-issues.md#a18)). With versions
     published 2024-03-01 and 2026-09-28, the page reads "Published
     2024-03-01 — Updated on 2026-09-28" ("Posted 2024-03-03 — Updated
     on 2026-09-28" for a preprint first posted 2024-03-03). Yet
     "Versions" lists only "2026-09-28 (Version of Record 1.1)"
     ("2026-09-28 (Author Original 1.1)"), and the first
     version's own address answers the "404 Not Found" page
     ⚠ [A12](#a12). <sup>g</sup>
8. **The "Versions" list.** Every published version, the newest first,
   each as "{date} ({version name})": "2026-09-24 (Version of Record
   1.0)", on a preprint server "2026-09-24 (Author Original 1.0)". The
   version shown is plain text; the current version links to the
   article's address and each older one to its own address (Rule 2). A
   version not yet published, or unpublished since, is not listed. On a French page the version
   name reads "##publication.versionStage.display##" ⚠ [A1](#a1).
   <sup>g</sup> <sup>q5</sup>
9. **The label line** {OPS}. Above the title, "Preprint / {date} ({version
   name})" names the shown version, its date and its name as in the
   "Versions" list ([A1](#a1) in French). <sup>g</sup>
10. **The galley links.** The side column lists the shown version's
    galleys, in the order of the "Galleys" page
    ([→ Galleys, ordering](U46-galleys.md#order)), in two lists: first
    the **main galleys**, the remote galleys and those whose file is of a
    main component ("Article Text", "Preprint Text"); then (after a
    journal's "JATS XML" link) the **additional files**, those whose file
    is of a supplementary component ("Data Set", "Other" and the rest,
    Settings bullet 11). A galley whose file's component has since been
    made a dependent one (Settings › Workflow › Submission › "Components",
    the component's "These are dependent files…" box; "Image", "HTML
    Stylesheet" and "Multimedia" are, and the galley upload offers none of
    them), or that has neither a file nor a remote address, is not
    listed. The two lists carry no visible heading; a
    screen reader reads "Downloads" and "Additional Files". <sup>e</sup>
    <sup>q7</sup>
    - 10a. **The link text.** Each link reads the galley's label. When the
      galley's language is not the language the page is shown in, the
      language follows in brackets: "HTML (French (Canada))" on an English
      page, "PDF (anglais)" on a French one. <sup>e</sup>
    - 10b. **The link address.** The article's address followed by the
      galley's URL Path, or its number when it has none; on an older
      version's page, the version's own address followed by the same.
      <sup>e</sup>
11. **Opening a galley.** What a galley link does depends on the file:
    <sup>d</sup> <sup>e</sup> <sup>q8</sup>
    - a PDF opens the PDF reader page (Fields), while "PDF.JS PDF Viewer"
      is on (Settings bullet 1);
    - an HTML file {OJS} opens the HTML reader page (Fields), while "HTML
      Article Galley" is on (Settings bullet 2);
    - an XML file {OJS} opens the journal's page with the article laid out
      by the eLife Lens reader, while "eLife Lens Article Viewer" is on
      (Settings bullet 3); the page's own script fails as it loads, so
      formulas cannot be typeset ⚠ [OJS9](#ojs9);
    - any other file, or one whose reader is switched off, downloads under
      its file name, and the browser stays on the article's page. On a
      preprint server an HTML or XML galley always downloads [OPS4](#ops4);
    - a remote galley takes the browser to its remote address.
12. **The readers and older versions.** The return arrow and the title of
    a reader page open the article's address, whichever version the
    galley belongs to. An older version's galley opens its reader under
    the notice "This is an outdated version published on {date}. Read the
    most recent version.", the date written like "2026-09-25" in the PDF
    reader and like "September 25, 2026" in the HTML reader {OJS}. A new,
    unpublished version's "PDF" pressed on its preview (Rule 4) opens the
    PDF reader under the same notice, though that version is the next
    one, with the date blank: "This is an outdated version published on .
    Read the most recent version." ⚠ [A13](#a13). An older version's
    PDF reader shows no document ("0 of 0" in an empty viewer, no
    message), and its "Download" gets no file: the browser stays on the
    reader page ⚠ [A2](#a2).
    <sup>d</sup> <sup>e</sup> <sup>q9</sup>
13. **Galley addresses.** {OJS} The number address of a galley that has a
    URL Path forwards to its URL Path address; on a preprint server it
    answers the "404 Not Found" page ⚠ [OPS3](#ops3). A galley address
    without a version part that names a galley of an older version only
    (a URL Path changed since) opens the article's page. A galley address
    that names no galley of the article answers the "404 Not Found" page.
    <sup>f</sup> <sup>q10</sup>
14. **The "Keywords:", "DOI:" and category lines follow the shown
    version.** An older version's page shows that version's keywords and
    categories; its DOI line is *DOIs*' rule. <sup>c</sup>
15. **"How to Cite".** The block (Fields) cites the shown version: its
    title, its contributors and the journal's name (on a preprint server
    the server's name, which "APA" prints as "In {server name}"). Where
    the format prints them it adds the journal's abbreviation ("ACS",
    "AMA", "IEEE" and "Vancouver"; the journal's acronym when no
    abbreviation is set), the issue and the pages {OJS}, the shown
    version's date, and the article's address, which "ABNT" ⚠ [A14](#a14)
    and "ACM" leave out on a journal and "ACM" on a preprint server. An older
    version's page cites that version's title and date with the article's
    own address. On a later version published ("posted") on another day
    than the first, "APA" adds "(Original work published {year})"; on the
    first version's day it adds nothing. "ABNT" runs a preprint's title
    into the server's name and joins the month to the year ⚠ [A7](#a7). <sup>h</sup> <sup>q11</sup>
    - 15a. **Another format.** "More Citation Formats" opens and closes the
      list; choosing a format replaces the citation in place with that
      format's and closes the list, without leaving the page. A reload
      shows the primary format again.
    - 15b. **A download.** "Endnote/Zotero/Mendeley (RIS)" or "BibTeX"
      downloads the citation as a file named after the first 60
      characters of the version's title, each space written "+", ending
      ".ris" or ".bib". The RIS file's dates carry a stray "%" ⚠ [A8](#a8).
    - 15c. **An article outside a published issue** {OJS}. On an article
      published with no issue, or published at once into an issue not yet
      published, the primary citation shows. The other formats and the
      downloads work for the Journal Manager and for a Section Editor or
      Copyeditor assigned to the article; for a visitor, a Reader, the
      Author and an unassigned Section Editor a format changes nothing and
      a download opens a blank page (signed out) or the "404 Not Found"
      page (signed in) [OJS1](#ojs1).
16. **The "How to Cite" settings.** After "OK" (Fields), every article's
    page follows at once: <sup>i</sup> <sup>q12</sup>
    - the chosen "Primary Citation Format" is the citation shown first;
      on a journal an "IEEE" citation shown first opens with its number
      "[1]" ("[1]A. Author, …"), which the same format chosen under "More
      Citation Formats" and a preprint server's page leave out
      ⚠ [OJS11](#ojs11);
    - "More Citation Formats" lists the ticked "Additional Citation
      Formats" alone; with none ticked the button stays and opens nothing
      ⚠ [A9](#a9);
    - "Download Citation" lists the ticked "Downloadable Formats" alone,
      disappearing with its heading when none is ticked;
    - "Publisher Location" is printed only where a format prints a
      publisher's place: no on-screen format prints it for a journal
      article; for a preprint "ABNT", "ACS", "Chicago", "Harvard", "IEEE",
      "Turabian" and "Vancouver" do. The "BibTeX" file carries it on both,
      the RIS file does not.
17. **The "Downloads" chart.** While "Usage statistics display options"
    (Settings bullet 6) is on a chart, the main column carries a section
    headed "Downloads" with a bar or a line chart of the article's
    downloads by month. An article with no downloads yet shows an empty
    chart; the sentence "Download data is not yet available." never
    appears ⚠ [A3](#a3). What counts as a download is *Statistics —
    usage*'s. <sup>l</sup>
<a id="references"></a>
18. **The "References" block.** A section headed "References" lists the
    shown version's references, one paragraph each, in list order, with
    each web address in a reference turned into a link that opens in a
    new tab. It shows each reference's own text, never the structured
    details, and appears whenever the version has references, even after
    the journal switched the References setting off. On a preprint server
    a preprint with no references shows the heading with nothing under it
    ([→ Citations & references, A20](U42-citations-and-references.md#a20)).
    A trailing "." or "," is left out of a link, but an address written
    inside parentheses takes the closing ")" into its link ⚠ [A10](#a10).
    How references are
    captured, and why data citations never show here, is
    [Citations & references](U42-citations-and-references.md)' (its A11).
    <sup>m</sup>
19. **The Publication Facts Label** {OJS}. While the "Publication Facts
    Label plugin" is on (Settings bullet 7), the side column is meant to
    carry, at its foot, a panel titled "Publication Facts" comparing the
    article with the journal's other articles: "Peer reviewers", "Data
    availability", "External funding", "Competing interests", then for
    the journal "Articles accepted", "Days to publication", "Indexed in",
    "Editorial team list", "Society" and "Publisher". An article in a
    section marked "Will not be peer-reviewed", or submitted before the
    plugin's "Start Date", is meant to get none. The panel never appears:
    every article's page opens normally without it ⚠ [OJS5](#ojs5). On a
    French (Canada) page, and on a page in any other language the plugin
    has no labels of its own for (60 of the 78 languages OJS offers), the
    panel would not show at all ⚠ [OJS3](#ojs3). <sup>k</sup>
    <sup>q13</sup>
20. **Recommendations** {OJS}. Under the article:
    <sup>n</sup> <sup>q14</sup>
    - 20a. **"Most read articles by the same author(s)"**, while "Recommend
      Articles by Author" is on (Settings bullet 8): meant to list the
      journal's other published articles by a contributor of the same
      name, the most read first, ten a page. The list never appears: the
      page of an article whose contributor has another published article
      in the journal opens normally without it ⚠ [OJS4](#ojs4). With no
      such article there is no list either, as intended.
    - 20b. **"Similar Articles"**, while "Recommend Similar Articles" is on
      (Settings bullet 9): meant to list the journal's other published
      articles that hold every word of the article's keywords, ten a page,
      followed by "You may also start an advanced similarity search for
      this article.", whose link runs that search on the Search page. An
      article that shares only one of two keywords would be left out
      ⚠ [OJS13](#ojs13). The list never appears, even for an article whose
      keywords a dozen published articles share ⚠ [OJS10](#ojs10). An
      article with no keywords, or no match, gets no list either, as
      intended.
21. **The page in another language.** Every label on the page follows the
    interface language the visitor chose, except on a preprint server's
    French page, whose keywords label reads "##preprint.subject## :"
    where the English page reads "Keywords:" ⚠ [OPS7](#ops7) (and the
    version names of Rule 8). The article's own texts show in that
    language where the version has them. The contributor list, with the role under each
    name, is described in
    [Contributors & affiliations](U41-contributors-and-affiliations.md).
    <sup>c</sup> <sup>q5</sup>
22. **The article summary** (Fields). The title and cover open the
    article's address, except where the summary's text lies over the
    cover, on a screen 768 px wide or wider: on a preprint server's lists
    the author line, keywords and details line cover a band from just
    under the title to just under the "Downloads" line (about the middle
    half of a square cover), on a journal's lists the author line covers
    its own row; a press there opens nothing ⚠ [OPS9](#ops9).
    On search results and category pages the summary leaves out the
    galleys. An issue's table of contents, the home page's "Current Issue"
    included, lists only the main galleys. A journal's "Latest
    Publications" holds only the articles outside a published issue
    (published with no issue, or into an issue not yet published;
    [Appearance & theming](U10-appearance-and-theming.md), its Rule 13),
    so an article in a published issue is listed under that issue
    instead. "Latest Publications" too lists only the main galleys while
    the home page also shows the current issue ("Include the current
    issue's table of contents" under the theme's "Journal Content
    Organization"). Without it,
    and on a preprint server's lists,
    every galley of the current version is shown, one with no file
    included, whose link answers the "404 Not Found" page ⚠ [A4](#a4).
    <sup>j</sup> <sup>q7</sup>
23. **Open peer review** {OJS}. The page carries no reviews. An "Open"
    review can be made public: "Publicly Show Reviewer Comments" ticked
    in the reviewer row's "Edit" before "Mark as Complete", whose dialog
    then adds "This review will be made publicly visible alongside the
    article."
    ([→ Reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review),
    its Rule 14a). Once the article is published, its page shows neither
    that review's comments, nor the reviewer's name, nor any review
    heading, to a visitor, a Reader or the Journal Manager. The page reads
    as for an article whose review was left private ⚠ [OJS12](#ojs12).
    <sup>p</sup>

A preprint server can also mark a preprint as published elsewhere, with a
notice above the title; that notice belongs to *Preprint relations*
{OPS}. <sup>a</sup>

## Side effects

- **Usage statistics.** Each opening of an article's page and each galley
  download or reader opening is recorded for the journal's usage
  statistics (*Statistics — usage*), which the "Downloads" chart and the
  preprint summary's "Downloads: {count}" read once the statistics are
  processed; the test installs never process them. <sup>l</sup>
- **No email, no notice.** Reading the page, opening a galley or
  downloading a citation sends no email and leaves no notice. <sup>b</sup>
- **The citation settings.** "OK" in the "Citation Style Language"
  settings window shows "Your changes have been saved." and changes every
  article's page of the journal at once (Rule 16). <sup>i</sup>

## Settings that modify behavior

1. **"PDF.JS PDF Viewer"** (Settings › Website › "Plugins" › "Installed
   Plugins", "Generic Plugins"). On for a new journal and preprint
   server: a PDF galley opens the PDF reader page (Rule 11). Off: it
   downloads. <sup>o</sup> <sup>q16</sup>
2. **{OJS} "HTML Article Galley"** (same list). On for a new journal: an
   HTML galley opens the HTML reader page. Off: it downloads (Rule 11). A
   preprint server has no such plugin. <sup>o</sup>
3. **{OJS} "eLife Lens Article Viewer"** (same list). On for a new
   journal: an XML galley opens in the Lens reader. Off: it downloads
   (Rule 11). A preprint server has no such plugin. <sup>o</sup>
4. **"Citation Style Language"** (same list). Off for a new journal and
   preprint server: no "How to Cite" block. On: the block of Rule 15, and
   the plugin row's "Settings". Ticking the row shows "The plugin
   "Citation Style Language" has been enabled."; unticking asks "Are you
   sure you want to disable this plugin?" ("OK" / "Cancel"), then shows
   "The plugin "Citation Style Language" has been disabled.". The
   plugin's settings are kept while it is off: ticked again, the window
   and the block return as they were left. <sup>o</sup> <sup>i</sup>
5. **The "Citation Style Language" "Settings" window** (bullet 4's
   "Settings"). On a new journal: no primary format chosen (APA shown),
   every additional format and both download formats ticked, no publisher
   location. Each field's effect: Rule 16. <sup>i</sup>
6. **"Usage statistics display options"** (Settings › Website ›
   "Appearance" › "Theme",
   [Appearance & theming](U10-appearance-and-theming.md), its Rule 9). "Do
   not display submission usage statistics chart for reader." on a new
   journal: no chart. "Use bar type of the chart for usage statistics
   display." or "Use line type of the chart for usage statistics
   display.": the "Downloads" section of Rule 17. <sup>l</sup>
7. **{OJS} "Publication Facts Label plugin"** (same list as bullet 1). Off
   for a new journal: no panel. On: the panel of Rule 19 (never shown
   [OJS5](#ojs5)), and its "Settings" window (Fields). A section's "Will
   not be peer-reviewed" (Settings › Journal › "Sections", *Sections*),
   unticked on the seeded sections and on a new journal's "Articles", is
   meant to keep the panel off its articles. <sup>o</sup> <sup>k</sup>
8. **{OJS} "Recommend Articles by Author"** (same list). Off for a new
   journal. On: Rule 20a (the list never shown [OJS4](#ojs4)).
   <sup>o</sup>
9. **{OJS} "Recommend Similar Articles"** (same list). Off for a new
   journal. On: Rule 20b (the list never shown [OJS10](#ojs10)).
   <sup>o</sup>
10. **{OJS} A section's "Omit author names for section items from issues'
    table of contents."** (Settings › Journal › "Sections", *Sections*).
    Unticked on the seeded sections and on a new section: the article
    summary carries the author line. Ticked: an issue's table of
    contents, and the home page's "Current Issue", list the section's
    articles without it; "Latest Publications", category pages and search
    results still show it (Fields, the article summary). A preprint
    server's section form has no such box. <sup>j</sup>
11. **A component's "These are supplementary files, such as data sets and
    research materials, and will be displayed separately from the main
    publication files."** (Settings › Workflow › Submission ›
    "Components", the component row's "Settings" › "Edit"). Ticked on a new journal for
    "Research Instrument", "Research Materials", "Research Results",
    "Transcripts", "Data Analysis", "Data Set", "Source Texts",
    "Multimedia" and "Other"; a galley of such a component is listed under
    the additional files (Rule 10). "Multimedia" is also a dependent
    component, which the galley upload never offers. <sup>e</sup>
12. **Settings other features describe.** The journal's publishing mode,
    subscriptions and article access (*Subscriptions & open access
    control*), "Enable Public Comments"
    ([Reader comments & moderation](U14-reader-comments-and-moderation.md)),
    a version's public JATS XML (*JATS & Body Text*), the DOI settings and
    the Crossref plugin (*DOIs*), and the URN plugin
    ([Identifiers](U44-identifiers.md)) each add or gate a part of this
    page; their rules are there.

## Cross-feature interactions

- **[Contributors & affiliations](U41-contributors-and-affiliations.md)**:
  the contributor list, the author biographies (its Rule 14) and the
  summary's author line (its Rule 15).
- **[Publication metadata](U40-publication-metadata.md)**: the "License",
  "Data Availability Statement" and "Funding Statement" blocks (its Rule
  15); this spec shows the keywords, abstract and plain language summary.
- **[Citations & references](U42-citations-and-references.md)**: captures
  the references the "References" block shows (Rule 18); its A20 is the
  preprint page's empty heading.
- **[Funding](U43-funding.md)**: the "Funders" block (its Rule 9).
- **[Identifiers](U44-identifiers.md)**: a journal's "URN" block (its
  Rule 21).
- **[Galleys](U46-galleys.md)**: builds the galleys, their labels,
  languages, URL Paths and order; this spec shows them to readers
  (Rules 10 to 13).
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  publishing, scheduling, "Create New Version", the version names, and the
  "URL Path" and "Cover Image" fields of the Publication Settings page,
  and "Unpublish" ("Unpost") (Rule 7b); its A6 and OJS3 are about this
  page (Rules 7a, 2).
- **[Issues](U50-issues.md)**: the issue's table of contents that lists
  articles, and its "Remove", which can unpublish an article's first
  version (its A18; Rule 7b).
- **[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)**:
  "Publicly Show Reviewer Comments" and "Mark as Complete", whose
  promise that a review will be shown with the article this page does
  not keep (its Rule 14a; Rule 23).
- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)**:
  the workflow header's "View" and "Preview", which open this page (its
  Rule 6).
- **[Reader comments & moderation](U14-reader-comments-and-moderation.md)**:
  the comments blocks on a journal's page.
- **[Search](U15-search.md)**, **[Appearance & theming](U10-appearance-and-theming.md)**:
  the search results and the home page lists that print the article
  summary; the theme's chart choice.
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md)**:
  the journal abbreviation some citation formats print; a journal closed
  to signed-out visitors.
- [Monograph landing page](U69-monograph-landing-page.md): the press's counterpart.
- [DOIs](U45-dois.md): the DOI line, the Crossmark button and "Cited by".
- [Sections](U17-sections.md), [Categories](U16-categories.md): the section pages and
  category pages that list articles.
- [Subscriptions & open access control](U51-subscriptions.md): who may open a
  galley on a journal with subscriptions, and the journal's publishing
  mode.
- [JATS & Body Text](U48-jats-and-body-text.md): the "JATS XML" link.
- [Statistics — usage](U64-usage-statistics.md): the counts behind the chart and the
  preprint summary.
- [Plugins management](U62-plugins-management.md): the Plugins list where the plugins
  of Settings bullets 1 to 4 and 7 to 9 are switched.

## Canonical scenarios

Every scenario reads articles published for it. Scenarios 1 and 4 run on
the seeded journal (preprint server), scenario 4 with ready accounts; the
others run on scratch journals (preprint servers) with throwaway
accounts. The accounts, their passwords and the tooling recipe are in the
footnote. <sup>s</sup>

1. **A published article's page**

   Given: a visitor, signed out, and two articles published on the
   seeded journal (preprint server): "Tidal Patterns in Coastal Waters",
   in the issue "Vol. 1 No. 2 (2014)" and the section "Articles" (the
   section "Preprints" on a preprint server), with the subtitle "A field
   study", the keywords "tide" and "current", an abstract, the plain
   language summary "How tides move along a coast.", a cover image, the
   category "Engineering" (a subcategory of "Applied Science"), on a
   journal the article number "e42", the two references "Smith, J.
   (2020). Ridge data. https://example.org/ridge." and "Jones, K. (2021).
   Coastal survey.", and a galley "PDF"; and "Harbour Notes", in no
   issue, with only a title, one contributor and an abstract.

   - **The main column**: open "Tidal Patterns in Coastal Waters" at
     {journal address}/article/view/{number} ("preprint/view/" on a
     preprint server; {number} is the article's number). The breadcrumb
     reads "Home / Archives / Vol. 1 No. 2 (2014) / Articles", with
     "Home", "Archives" and "Vol. 1 No. 2 (2014)" as links ("Home /
     Preprints" on a preprint server). On a preprint server a label line
     above the title reads "Preprint / " followed by the date and the
     version name of the "Versions" entry in the side column. The page is
     headed "Tidal Patterns in Coastal Waters", with "A field study"
     under it; below the contributors come "Keywords: tide, current" or
     "Keywords: current, tide" (either order passes, [A11](#a11)) as
     plain text, "Abstract" with the abstract, and "Plain Language
     Summary" with "How tides move along a coast." (Fields, the landing
     page; Rules 6, 9).
   - **"References"**: further down, a section headed "References" lists
     "Smith, J. (2020). Ridge data. https://example.org/ridge." and
     "Jones, K. (2021). Coastal survey." as two paragraphs, in that
     order. "https://example.org/ridge" is a link that opens in a new
     tab, and the final "." is not part of it (Rule 18).
   - **The side column**: top to bottom it shows the cover image, the
     galley link "PDF", "Published" ("Posted" on a preprint server) over
     a date, and "Versions" with one entry, "{that date} (Version of
     Record 1.0)" ("Author Original 1.0" on a preprint server), as plain
     text; on a journal then "Issue" with "Vol. 1 No. 2 (2014)" as a link
     and "Section" with "Articles" as plain text; then "Categories" with
     "Engineering" as a link ("Applied Science > Engineering" on a
     preprint server); and on a journal "Article Number" with "e42" as
     plain text (Fields, the side column; Rule 8).
   - **The links in the side column**: on a journal, press "Vol. 1 No. 2
     (2014)" under "Issue": the issue's page opens. Back on the article,
     press the category under "Categories": that category's page opens
     (Fields, the side column).
   - **An article with little in it**: open "Harbour Notes": the page
     shows the breadcrumb ("Home / Archives / Articles" on a journal, the
     issue left out), the title, the contributor, "Abstract", "Published"
     ("Posted") and "Versions", on a journal also "Section", and no other
     heading; a preprint server also shows the "References" heading
     (Rule 6; Fields, "Breadcrumb").
   - **Control**: "Harbour Notes" shows no "Keywords:", no "Plain Language
     Summary", no "Categories" and no cover image, all of which "Tidal
     Patterns in Coastal Waters" shows (Rule 6). <sup>s</sup>

2. **Opening each galley**

   Given: a visitor, signed out, on a scratch journal (preprint server)
   at its install settings, with two published articles: "Tidal
   Patterns", carrying the galleys "PDF" (the file "article.pdf", with
   the URL Path "pdf"), "HTML" (the file "article.html"), on a journal
   "XML" (the file "article.xml"), "Remote" (hosted at
   "https://example.org/paper") and "Data" (the file "notes.md", of the
   component "Data Set"), the files on a preprint server being
   "preprint.pdf", "preprint.html" and "not-an-image.txt"; and "Harbour
   Currents", with the URL Path "harbour-currents" and a galley "PDF" of
   its own, with no URL Path.

   - **The two lists**: open "Tidal Patterns" at {journal
     address}/article/view/{number} ("preprint/view/" on a preprint
     server): the side column lists "PDF", "HTML", on a journal "XML",
     and "Remote" in one list, then "Data" alone in a second list below
     it. Neither list has a visible heading; a screen reader reads
     "Downloads" over the first and "Additional Files" over the second.
     The "PDF" link's address is the article's address followed by
     "/pdf", the "HTML" link's the article's address followed by "/" and
     a number (Rules 10, 10b).
   - **The PDF reader**: press "PDF": the PDF reader page opens. A bar
     across the top holds an arrow, the title "Tidal Patterns" and a
     "Download" button, which a screen reader reads "Download PDF"; under
     it the PDF fills the page in a viewer with its own page, zoom,
     search and print controls. The browser tab reads "View of Tidal
     Patterns". Press "Download": "article.pdf" ("preprint.pdf")
     downloads. Press the title: the article's page opens. Go back and
     press the arrow: the article's page opens again (Fields, the PDF
     reader page; Rules 11, 12).
   - **The HTML galley**: on a journal, press "HTML": the HTML reader
     page opens, with the same bar holding the arrow, which a screen
     reader reads "Return to Article Details", and the title, no
     "Download", and the HTML full text under it; press the arrow: the
     article's page opens. On a preprint server "HTML" downloads
     "preprint.html" and the browser stays on the preprint's page
     ([OPS4](#ops4)) (Fields, the HTML reader page; Rule 11).
   - **The XML galley** {OJS}: press "XML": a page of the journal opens
     with the article of "article.xml" laid out by the eLife Lens reader,
     its text showing ([OJS9](#ojs9)) (Rule 11).
   - **A file with no reader**: press "Data": "notes.md"
     ("not-an-image.txt") downloads, and the browser stays on the
     article's page (Rule 11).
   - **The remote galley**: press "Remote": the browser goes to
     "https://example.org/paper" (Rule 11).
   - **No such galley**: type the article's address followed by
     "/nosuchgalley": the "404 Not Found" page (Rule 13).
   - **An article's URL Path**: type {journal address}/article/view/{number}
     with "Harbour Currents"'s number ("preprint/view/" on a preprint
     server): the browser lands on {journal
     address}/article/view/harbour-currents, that article's page. On a
     journal, its "PDF" link's address reads {journal
     address}/article/view/harbour-currents/ followed by a number; type
     {journal address}/article/view/{number}/ followed by that number:
     the browser lands on the "PDF" link's address, and the PDF reader
     page opens ([OPS2](#ops2)) (Rule 1).
   - **Control**: "Tidal Patterns", which has no URL Path, stays at its
     number address (Rule 1). <sup>s</sup>

3. **An older version beside the current one**

   Given: a visitor, signed out, on a scratch journal (preprint server)
   with "Citation Style Language" on, and an article published twice,
   both times today ({today} below, the day the scenario runs): its
   first version, titled "Tidal Patterns", on a journal in the published
   issue "Vol. 1 No. 1 (2026)", and its current version, titled "Tidal
   Patterns Revised"; each version carries a galley "PDF" and, on a
   journal, a galley "HTML".

   - **The current version's page**: open the article's address: the
     page is headed "Tidal Patterns Revised", and under "Published"
     ("Posted") reads "{today} — Updated on {today}". "Versions" lists
     two entries, the newest first: the current version's as plain
     text, then "{today} (Version of Record 1.0)" ("Author Original 1.0"
     on a preprint server) as a link. On a preprint server the label
     line above the title reads "Preprint / " followed by the date and
     name of the current version's entry. The "APA" citation under "How
     to Cite" names "Tidal Patterns Revised" (Rules 7, 8, 9, 15).
   - **The older version's page**: press "{today} (Version of Record
     1.0)": the address is the article's address followed by "/version/"
     and a number, and the page opens under "This is an outdated version
     published on {today}. Read the most recent version.", headed "Tidal
     Patterns". In "Versions" that entry is now plain text and the
     current version's a link. The "PDF" link's address begins with this
     page's address. "How to Cite" cites "Tidal Patterns" with the
     article's own address, which has no "/version/" in it (Rules 2, 5,
     8, 10b, 15).
   - **"most recent version"**: press "most recent version" in the
     notice: the article's address opens, headed "Tidal Patterns
     Revised" (Rule 5).
   - **The older version's PDF reader**: go back to the older version's
     page and press "PDF": the PDF reader page shows the title "Tidal
     Patterns" and, between the bar and the viewer, "This is an outdated
     version published on {today}. Read the most recent version.", the
     date written like "2026-09-25" ([A2](#a2)). Press the arrow: the
     article's address opens (Rule 12; Fields, the PDF reader page).
   - **The older version's HTML reader** {OJS}: on the older version's
     page press "HTML": the HTML reader page shows the same notice with
     the date written like "September 25, 2026", and its bar reads the
     current version's title, "Tidal Patterns Revised". Press the title:
     the article's address opens (Rule 12; Fields, the HTML reader page).
   - **A version that does not exist** {OPS}: type the article's address
     followed by "/version/999999": the "404 Not Found" page. A journal
     fails there with a server error instead
     ([→ Publish, schedule & versions, OJS3](U49-publish-schedule-and-versions.md#ojs3))
     (Rule 2).
   - **The home page's summary** {OPS}: on the preprint server's home
     page, the preprint's summary under "Latest preprints" ends its
     details line with " - Versions: 2" (Fields, the article summary).
   - **Control**: the article's address shows no "This is an outdated
     version…" notice (Rule 5). <sup>s</sup>

4. **An unpublished article: the preview, and "404 Not Found" for
   everyone else**

   Given: the Journal Manager, the Author, the Reader and a visitor,
   signed out, on the seeded journal (preprint server), with the
   Author's article "Tidal Draft" submitted and in Production, never
   published ({number} below is its number), and, on a journal, an
   article scheduled into the unpublished issue "Vol. 2 No. 1 (2015)".

   - **The visitor**: open {journal address}/article/view/{number}
     ("preprint/view/" on a preprint server): the "404 Not Found" page.
     On a journal the scheduled article's address answers the same, and
     so, on both, does {journal address}/article/view/no-such-article
     (Rule 3; Actors row 2).
   - **The Reader**: signed in, the Reader opens the same addresses:
     "404 Not Found" each time (Rule 3; Actors row 2).
   - **The Journal Manager's "Preview"**: open "Tidal Draft" from the
     Dashboard and press "Preview" in the workflow's header: the
     article's page opens under "This is a preview and has not been
     published. View submission", headed "Tidal Draft", with no
     "Published" ("Posted") line and no "Versions" list (Rule 4; Actors
     row 2).
   - **"View submission"**: press "View submission": the article's
     workflow opens on its current stage, Production (Rule 4).
   - **The Author**: signed in, the Author opens "Tidal Draft" with
     "View" on My Submissions: its workflow offers no "Preview". The
     Author types the article's address: the same preview opens, under
     the same notice ([A5](#a5)) (Actors row 2; Rule 4).
   - **Control**: the address the Journal Manager's "Preview" opened is
     {journal address}/article/view/{number}, the address that answered
     "404 Not Found" to the visitor and the Reader (Rules 3, 4).
     <sup>s</sup>

5. **A journal closed to visitors**

   Given: a visitor, signed out, and two scratch journals (preprint
   servers), each with a Reader and a published article "Tidal
   Patterns" carrying a galley "PDF" with the URL Path "pdf": one that
   the Site Administrator has not enabled, and one that requires
   visitors to sign in ("Users must be registered and log in to view the
   journal site." ticked; "…to view the server site." on a preprint
   server).

   - **The journal not enabled**: the visitor opens the article's
     address: the Login page. The visitor opens the article's address
     followed by "/pdf", the galley's address: the Login page again
     (Actors, opening paragraph; Rule 10b).
   - **Its Reader**: the journal's Reader signs in and opens the
     article's address: the page headed "Tidal Patterns"; "PDF" opens
     the PDF reader page (Actors, opening paragraph; Rule 11).
   - **The journal that requires sign-in**: the visitor opens the same
     two addresses on the second journal: the Login page each time. That
     journal's Reader signs in and opens the article's address: the page
     headed "Tidal Patterns"; "PDF" opens the PDF reader page (Actors,
     opening paragraph).
   - **Control**: on each journal the Reader reads the article at the
     address that sent the visitor to Login (Actors, opening paragraph).
     <sup>s</sup>

6. **"How to Cite": another format, a download and the settings window**

   Given: the Journal Manager, and a visitor, signed out, in a second
   browser, on a scratch journal named "Coastal Review" (a scratch
   preprint server named "Coastal Preprints") with "Citation Style
   Language" on and its "Settings" window never saved, and the article
   "Tidal Patterns in Coastal Waters" published there, on a journal in
   the published issue "Vol. 1 No. 1 (2026)".

   - **The citation**: the visitor opens the article's page: the side
     column (at its foot on a journal) shows "How to Cite" over an "APA"
     citation naming "Tidal Patterns in Coastal Waters", "Coastal
     Review" ("In Coastal Preprints" on a preprint server) and the
     article's address (Fields, "How to Cite"; Rule 15).
   - **"More Citation Formats"**: press it: a list opens with "ABNT",
     "ACM", "ACS", "AMA", "APA", "Chicago", "Harvard", "IEEE", "MLA",
     "Turabian" and "Vancouver", and under them "Download Citation" with
     "Endnote/Zotero/Mendeley (RIS)" and "BibTeX". Press "More Citation
     Formats" again: the list closes (Rule 15a).
   - **Another format**: press "More Citation Formats" and choose "IEEE":
     the citation changes in place to another text, the list closes and
     the browser's address stays the same; note the IEEE text. Reload
     the page: the "APA" citation shows again (Rule 15a).
   - **A download**: press "More Citation Formats" and "BibTeX": the
     file "Tidal+Patterns+in+Coastal+Waters.bib" downloads. Press "More
     Citation Formats" and "Endnote/Zotero/Mendeley (RIS)": the file
     "Tidal+Patterns+in+Coastal+Waters.ris" downloads ([A8](#a8))
     (Rule 15b).
   - **No email**: the mail catcher holds no email to the journal's
     accounts from the visitor's steps (Side effects).
   - **The settings window**: the Journal Manager opens Settings ›
     Website › "Plugins" › "Installed Plugins" and presses the "Citation
     Style Language" row's "Settings": "Primary Citation Format" has no
     format chosen, every box under "Additional Citation Formats" is
     ticked, both boxes under "Downloadable Formats" are ticked and
     "Publisher Location" is empty (Fields, the settings window;
     Settings bullet 5).
   - **"Cancel"**: choose "IEEE" under "Primary Citation Format" and press
     "Cancel": the window closes without a question. Press "Settings"
     again: no format is chosen (Fields, "OK / Cancel").
   - **"Close" after a change**: choose "IEEE" and press the window's
     "Close": it asks "The data on this form has changed. Do you wish to
     continue without saving?"; confirm it. Press "Settings" again: no
     format is chosen (Fields, "OK / Cancel").
   - **"OK"**: choose "IEEE", untick every "Additional Citation Formats"
     box but "MLA", untick "Endnote/Zotero/Mendeley (RIS)", type "London,
     U.K." in "Publisher Location" and press "OK": the window closes and
     "Your changes have been saved." shows (Fields, "OK / Cancel"; Side
     effects).
   - **The visitor's page after "OK"**: the visitor reloads the article's
     page: "How to Cite" shows the IEEE citation noted earlier, on a
     journal with "[1]" before it ([OJS11](#ojs11)), on a preprint
     server now with "London, U.K." in it. "More Citation
     Formats" lists "MLA" alone, and "Download Citation" "BibTeX" alone.
     On a journal neither the IEEE nor the "MLA" citation prints
     "London, U.K."; on both, the "BibTeX" file carries it (Rule 16).
   - **Switching the plugin off**: the Journal Manager unticks the
     "Citation Style Language" row: it asks "Are you sure you want to
     disable this plugin?"; press "OK": "The plugin "Citation Style
     Language" has been disabled." shows and the row offers no
     "Settings". The visitor reloads the article's page: it has no "How
     to Cite" (Settings bullet 4; Fields, the settings window).
   - **Switching it on again**: the Journal Manager ticks the row: "The
     plugin "Citation Style Language" has been enabled." shows. The
     visitor reloads: "How to Cite" shows the IEEE citation again
     (Settings bullet 4).
   - **Control**: "More Citation Formats" still lists "MLA" alone: the
     settings were kept while the plugin was off (Settings bullet 4).
     <sup>s</sup>

7. **The PDF viewer switched off, and the downloads chart**

   Given: a visitor, signed out, on a scratch journal (preprint server)
   with "PDF.JS PDF Viewer" off and "Usage statistics display options"
   set to "Use bar type of the chart for usage statistics display.", and
   a published article "Tidal Patterns" carrying a galley "PDF" (the
   file "article.pdf"; "preprint.pdf" on a preprint server).

   - **"PDF" with the viewer off**: open the article's page and press
     "PDF": "article.pdf" ("preprint.pdf") downloads, and the browser
     stays on the article's page (Settings bullet 1; Rule 11).
   - **The "Downloads" chart**: the main column carries a section headed
     "Downloads" with an empty chart, since the test install never
     counts the downloads ([A3](#a3)) (Rule 17; Side effects).
   - **Control**: the seeded journal, at the install default "Do not
     display submission usage statistics chart for reader.", shows no
     "Downloads" section on scenario 1's article pages (Settings
     bullet 6). <sup>s</sup>

8. **The page in French**

   Given: a visitor, signed out, on a scratch journal (preprint server)
   with French (Canada) among its interface and submission languages,
   and a published article titled "Tidal Patterns" in English and
   "Motifs des marées" in French, with an abstract in each language,
   the keyword "tide" in English and "marée" in French, and two
   galleys: "PDF" in English and "HTML" in French (Canada).

   - **The English page**: open {journal address}/en/article/view/{number}
     ("preprint/view/" on a preprint server): the page is headed "Tidal
     Patterns", its keywords read "Keywords: tide", and the galley links
     read "PDF" and "HTML (French (Canada))" (Rules 10a, 21).
   - **The French page**: open {journal
     address}/fr_CA/article/view/{number}: the page is headed "Motifs des
     marées", with the French abstract under its heading; on a journal
     the keywords read "Mots-clés : marée" ([OPS7](#ops7)); the galley
     links read "PDF (anglais)" and "HTML" (Rules 10a, 21).
   - **The French PDF reader** {OJS}: press "PDF (anglais)": the
     browser tab reads "Vue de Motifs des marées" ([OPS8](#ops8))
     (Fields, the PDF reader page).
   - **Control**: open {journal address}/en/article/view/{number} again:
     the page is headed "Tidal Patterns", and its galley links read "PDF"
     and "HTML (French (Canada))" once more (Rule 21). <sup>s</sup>

9. **The article summary on a journal's lists** {OJS}

   Given: a visitor, signed out, on a scratch journal whose home page
   shows the current issue ("Include the current issue's table of
   contents" ticked under the theme's "Journal Content Organization"),
   with the category "Oceans" and the published
   issue "Vol. 1 No. 1 (2026)", which has a cover image; two articles are
   published in that issue: "Tidal Patterns", with the subtitle "A field
   study", a cover image of its own, the category "Oceans" and the
   galleys "PDF" (of the component "Article Text") and "Data" (of the
   component "Data Set"), and "Harbour Currents", with no cover image of
   its own.

   - **The issue's cover on an article's page**: open "Harbour
     Currents": the side column shows the issue's cover image as a link;
     press it: the issue's page opens (Fields, the side column, "Cover
     image").
   - **The issue's table of contents**: on the issue's page, "Tidal
     Patterns" is listed with its own cover image, the title "Tidal
     Patterns" with "A field study", the author line and the galley link
     "PDF", with no "Data". Press the title: the article's page opens. Go
     back and press the middle of the cover image: the article's page
     opens again (Fields, the article summary; Rule 22).
   - **"Current Issue"**: press "Home" in the breadcrumb: on the home
     page "Tidal Patterns" is listed under "Current Issue" with "PDF" and
     no "Data" (Rule 22).
   - **A category page**: on the article's page press "Oceans" under
     "Categories": the category's page lists "Tidal Patterns" with its
     title and cover image and no galley link (Rule 22).
   - **Control**: the article's own page lists "PDF" and, in a second
     list below it, "Data" (Rule 10). <sup>s</sup>

10. **The preprint summary on a preprint server's lists** {OPS}

    Given: a visitor, signed out, on a scratch preprint server with the
    category "Oceans", and a preprint posted once today ({today} below),
    "Tidal Patterns", with the subtitle "A field study", a cover image,
    the keywords "tide" and "current", the category "Oceans" and a
    galley "PDF".

    - **"Latest preprints"**: open the server's home page: "Tidal
      Patterns" is listed under "Latest preprints" with its cover image,
      the title with "A field study", the author line, the keywords
      "tide" and "current" in either order ([A11](#a11)), the line "Downloads: 0 - Submitted {today} -
      Posted {today}" and the galley link "PDF" ([OPS6](#ops6)). Press
      the title: the preprint's page opens (Fields, the article summary;
      Rule 22; Side effects).
    - **"Archives"**: press "Archives" in the main menu: the "Archives"
      page lists the same summary (Fields, the article summary).
    - **A category page**: on the preprint's page press "Oceans" under
      "Categories": the category's page lists "Tidal Patterns" with no
      galley link (Rule 22).
    - **Control**: the details line ends at "Posted {today}", with no " -
      Versions:" part, the preprint having one version posted (Fields,
      the article summary). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for OPS2 and OPS3 (Rule 1, Rule 13; issue report
    `docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md`): on a preprint server, a
    preprint with a URL Path, its non-PDF galley link downloading the
    file, and its ID addresses with a galley and a version part
    forwarding to the URL Path address with that part kept
  - the guard for OJS1 (Rule 15c; issue report
    `docs/issues/U13-OJS1-citation-formats-fail-outside-published-issue.md`):
    a reader on an article published with no issue, and on one
    published at once into an unpublished issue, signed out and signed
    in, gets another citation format and a download {OJS}
  - the guard for OPS7 and OPS8 (Rule 21; issue report
    `docs/issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md`): a preprint's
    page and its PDF reader shown in French, with no `##` code in the
    keywords label or the browser tab {OPS}
  - the guard for OJS4 (Rule 20a; issue report
    `docs/issues/U13-OJS4-recommend-by-author-list-never-shown.md`):
    with "Recommend Articles by Author" on, two published articles by one
    contributor, one of them outside an issue, each listing the other
    under "Most read articles by the same author(s)" {OJS}
  - the guard for OPS1 (Rule 4, Rule 5; issue report
    `docs/issues/U13-OPS1-new-version-preview-called-outdated.md`): a new
    version's preview showing the preview notice alone, and an older
    posted version's page keeping the outdated notice {OPS}
  - the guard for OJS5 (Rule 19; issue report
    `docs/issues/U13-OJS5-publication-facts-panel-never-shown.md`):
    an article page with "Publication Facts Label plugin" on, loading the
    plugin's script and showing the "Publication Facts" panel {OJS}
  - the guard for OPS6 (Rule 22; issue report
    `docs/issues/U13-OPS6-preprint-summary-doi-never-shown.md`): a
    preprint with a DOI, its entry in "Archives" showing the "DOI:" line
    {OPS}
  - the guard for OJS10 (Rule 20b; issue report
    `docs/issues/U13-OJS10-similar-articles-list-never-shown.md`):
    with "Recommend Similar Articles" on, an article page listing the
    published articles that share its keywords, one in an issue and one
    outside any issue, and leaving out a scheduled one {OJS}
  - the guard for OPS9 (Rule 22; issue report
    `docs/issues/U13-OPS9-preprint-summary-cover-middle-dead.md`): on a
    preprint server's "Archives" and a journal's issue page, a click at
    the cover's centre and at the author line's row opening the item
  - the guard for OJS12 (Rule 23; issue report
    `docs/issues/U13-OJS12-public-review-never-shown.md`): a
    confirmed review marked "Publicly Show Reviewer Comments" shown on
    the published article's page, a private or unconfirmed one not {OJS}
  - the guard for A2 (scenario 3; issue report
    `docs/issues/U13-A2-older-version-pdf-reader-empty.md`): an
    older version's PDF reader page showing the document, and its
    "Download" saving the file, on a journal and a preprint server
  - the guard for OJS9 (Rule 11; issue report
    `docs/issues/U13-OJS9-lens-formulas-not-typeset.md`): an
    XML galley with a TeX formula opened in the Lens reader, the formula
    typeset and no page script error {OJS}
  - the guard for A5 (Rule 4, scenario 4; issue report
    `docs/issues/U13-A5-author-view-submission-access-denied.md`):
    the Author's "View submission" on a preview opening their
    submission, and an editor's still opening the editorial workflow
  - the guard for OJS2 (Fields, the settings window; issue report
    `docs/issues/U13-OJS2-publication-facts-settings-funding-warning.md`):
    the "Publication Facts Label plugin" settings window opening with no
    funding warning while funder metadata is on, and naming the setting
    when it is off {OJS}
  - the guard for A6 (Rule 5; issue report
    `docs/issues/U13-A6-older-version-tab-current-title.md`): an
    older version's page, published under another title than the current
    one, with the browser tab reading the older version's title
  - the guard for OJS7 (Fields, the settings window; issue report
    `docs/issues/U13-OJS7-publication-facts-settings-refused-save-resets.md`):
    a refused "OK" in the "Publication Facts Label plugin" settings
    keeping every value typed in the window {OJS}
  - the guard for A1 (Rule 21, scenario 8; issue report
    `docs/issues/U13-A1-french-version-name-raw-key.md`): a page shown
    in French naming each version with its numbers and no
    "##publication.versionStage.display##"
  - the guard for OJS8 (Fields, the settings window; issue report
    `docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md`):
    a date that does not exist typed into the "Publication Facts Label
    plugin" "Start Date" refused with a message, nothing saved {OJS}
  - the guard for A4 (Rule 22; issue report
    `docs/issues/U13-A4-listing-offers-galley-without-file.md`): a
    preprint server's lists, and a journal's "Latest Publications" shown
    without the current issue, leaving out a galley with no file and the
    additional files
  - the guard for OJS3 (Rule 19, Rule 21; issue report
    `docs/issues/U13-OJS3-publication-facts-panel-missing-without-label-file.md`):
    an article page shown in French (Canada) with the "Publication Facts"
    panel and its labels {OJS}
  - the guard for OJS6 (Fields, the PDF reader page; issue report
    `docs/issues/U13-OJS6-pdf-reader-return-arrow-names-issue.md`): the PDF
    reader's return arrow announced "Return to Article Details" on an
    article in an issue, and "Return to Issue Details" on an issue galley
    {OJS}
  - the guard for OPS5 (Fields, the PDF reader page; issue report
    `docs/issues/U13-OPS5-preprint-pdf-reader-return-arrow-raw-key.md`): the PDF
    reader's return arrow on a preprint server announced with a text,
    not "##article.return##" {OPS}
  - the guard for A7 (Rules 15, 15b; issue report
    `docs/issues/U13-A7-abnt-citation-runs-text-together.md`): the "ABNT"
    citation of a preprint and of an article, with a full stop between
    title and server and a space between month and year
  - the guard for A10 (Fields, "References"; issue report
    `docs/issues/U13-A10-reference-link-takes-closing-parenthesis.md`):
    a reference whose address is closed by a parenthesis, "(https://doi.org/…).",
    linked without the ")"
  - the guard for A8 (Rule 15b; issue report
    `docs/issues/U13-A8-ris-download-dates-percent-signs.md`): the
    "Endnote/Zotero/Mendeley (RIS)" download's "PY" and "Y2" lines with
    no "%"
  - the guard for A9 (Rule 16; issue report
    `docs/issues/U13-A9-more-citation-formats-opens-nothing.md`): with no
    "Additional Citation Formats" ticked, "More Citation Formats" opening
    the ticked "Downloadable Formats", and no button when nothing is
    ticked
  - the guard for A11 (Fields "Keywords:"; issue report
    `docs/issues/U13-A11-keywords-order-not-kept.md`): keywords shown in
    the order typed on the page and in the "Metadata" form (a unit test
    in pkp-lib reads entries stored with `seq` against primary-key order)
  - the guard for A13 (Rule 12; issue report
    `docs/issues/U13-OPS1-new-version-preview-called-outdated.md` names
    it, its fix does not reach it), written once A13 is fixed: a new
    version's "PDF" pressed on its preview opening the PDF reader with
    no outdated notice, while an older published version's reader keeps
    it
- **Rarely met**:
  - a galley whose component was made a dependent one after the galley
    was built, which the page no longer lists (Rule 10; Settings
    bullet 11)
- **Nothing new to test**:
  - a section's "Omit author names for section items from issues' table
    of contents." ticked {OJS}: the table of contents and "Current
    Issue" without the author line, the other lists with it (Settings
    bullet 10)
  - "HTML Article Galley" off {OJS}: an HTML galley downloads (Settings
    bullet 2; Rule 11)
  - "eLife Lens Article Viewer" off {OJS}: an XML galley downloads
    (Settings bullet 3; Rule 11)
  - the number address of a galley that has a URL Path, forwarding to
    the URL Path address {OJS}; the page shows no such galley's number
    (Rule 13)
  - the current version at its own version address, the same page as
    the article's address; no link on the page carries the current
    version's id (Rules 2, 8)
  - the "Publication Facts Label plugin" settings window {OJS}: the
    society, the start date and the indexes (Fields, the settings
    window; Settings bullet 7)
  - "Usage statistics display options" set to "Use line type of the
    chart for usage statistics display.": the "Downloads" section with a
    line chart; scenario 7 reads the bar chart (Settings bullet 6;
    Rule 17)
  - an article outside a published issue under a journal's "Latest
    Publications" {OJS}, its main galleys only while the home page also
    shows the current issue; scenario 9 reads the same filter under
    "Current Issue" (Rule 22)
  - a later version published ("posted") on another day than the
    first, whose "APA" citation adds "(Original work published
    {year})"; scenario 3's two versions share a day (Rule 15)
  - a signed-in Reader on a published article's page, the page the
    visitor of scenario 1 reads (Actors, opening paragraph; Actors
    row 1)
  - a component's supplementary box changed, the listing scenario 2's
    "Data" galley already shows (Settings bullet 11; Rule 10)
- **Register carries it**:
  - A5 (the Author's "View submission" on the preview; Rule 4;
    scenario 4 passes it)
  - OPS1 (a preprint server's preview of a new version with both
    notices; Rule 4)
  - A13 (the PDF reader opened from a new version's preview, under the
    outdated notice; Rule 12)
  - OJS1 (other citation formats and downloads outside a published
    issue, by who is signed in {OJS}; Rule 15c)
  - A7 and A8 (the "ABNT" citation and the RIS file's dates; Rules 15,
    15b)
  - A14 (the "ABNT" citation's initials, and a journal's without the
    address or access date; Rule 15)
  - A9 (no "Additional Citation Formats" ticked, "More Citation
    Formats" opening nothing; Rule 16)
  - OJS11 (the number "[1]" before a journal's IEEE citation shown
    first {OJS}; Rule 16; scenario 6 passes it)
  - A6 (an older version's browser tab; Rule 5)
  - A2 (an older version's PDF reader showing no document, its
    "Download" getting no file; Rule 12; scenario 3 passes it)
  - OJS9 (the Lens page's failing script {OJS}; Rule 11)
  - OJS6 and OPS5 (the PDF reader's return arrow read to screen
    readers; Fields, the PDF reader page)
  - OPS8 (the PDF reader's browser tab on a preprint server's French
    page; Fields, the PDF reader page)
  - OPS2 (a preprint with a URL Path losing the galley or version part
    of its number address; Rule 1)
  - OPS3 (a galley's number address answering "404 Not Found" on a
    preprint server; Rule 13)
  - A10 (an address in parentheses in a reference; Rule 18)
  - A11 (keywords shown in another order than typed; Fields, the
    landing page and the article summary; scenarios 1 and 10 accept
    either order)
  - A1 and OPS7 (the version names on a French page, and the
    preprint's French keywords label; Rules 8, 9, 21)
  - A4 (a galley with no file, and the additional files, in a preprint
    server's lists and in a journal's "Latest Publications" without the
    current issue; Rule 22)
  - OPS9 (a press on the cover where the summary's text lies over it,
    in a preprint server's lists and a journal's; Rule 22)
  - OPS6 (the preprint summary's "DOI:" line; Fields, the article
    summary)
  - A3 (the empty chart without "Download data is not yet
    available."; Rule 17)
  - OJS5 ("Publication Facts Label plugin" on, and a section marked
    "Will not be peer-reviewed", with no panel either way {OJS};
    Rule 19; Settings bullet 7)
  - OJS7 and OJS8 (the Publication Facts settings window after a
    refused "OK", and an impossible "Start Date" {OJS}; Fields, the
    settings window)
  - OJS2 and OJS3 (the Publication Facts settings window's warning, and
    the panel missing on a French (Canada) page {OJS}; Fields, the
    settings window; Rule 19)
  - OJS4 ("Recommend Articles by Author" on {OJS}; Rule 20a; Settings
    bullet 8)
  - OJS10 ("Recommend Similar Articles" on {OJS}; Rule 20b; Settings
    bullet 9)
  - OJS13 (an article sharing only some of the keywords, left out of
    "Similar Articles" {OJS}; Rule 20b)
  - A12 (a first version unpublished while a later one stays
    published, still dating the page; Rules 3, 7b, 8)
  - OJS12 (an "Open" review marked public, absent from the published
    article's page {OJS}; Rule 23)
- **No seed**:
  - the "DOI:" line of a version with a DOI (Fields, the landing page;
    Rule 14)
- **Owned by another feature**:
  - a visitor opening a galley on a journal with subscriptions (Actors
    row 3; *Subscriptions & open access control*)
  - commenting on the article {OJS} (Actors row 6;
    [Reader comments & moderation](U14-reader-comments-and-moderation.md),
    scenario 8)
  - a journal's version address naming no version of the article, which
    fails with a server error (Rule 2;
    [Publish, schedule & versions](U49-publish-schedule-and-versions.md#ojs3),
    its OJS3)
  - a new version being prepared, rewriting the date line (Rule 7a;
    [Publish, schedule & versions](U49-publish-schedule-and-versions.md#a6),
    its A6)
  - the issue's "Remove" unpublishing an article's first version {OJS}
    (Rule 7b; [Issues](U50-issues.md#a18), its A18)
  - the empty "References" heading on a preprint page with no
    references (Rule 18;
    [Citations & references](U42-citations-and-references.md#a20), its
    A20)
  - which articles a journal's "Latest Publications" holds {OJS}
    (Rule 22; [Appearance & theming](U10-appearance-and-theming.md),
    scenario 9)
  - usage recorded for each page opening and download (Side effects;
    *Statistics — usage*)
  - the publishing mode, subscriptions, public comments, a public JATS
    XML, DOIs and URN (Settings bullet 12; the features it names)
  - a press's book page, this page's counterpart on a press (Purpose;
    *Monograph landing page*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24; additions
2026-09-28 and 2026-10-02), unreviewed unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | In French, readers and editors see a raw translation key in place of every version's name and number | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A2](#a2) | An older version's PDF opens a reader with no document, and its "Download" gets no file | 🐞 | high · crash: script | issues (claude), 2026-10-01 — re-verified |
| [A4](#a4) | Preprint lists and a journal's "Latest Publications" show additional files and link a galley with no file ("404 Not Found") | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A5](#a5) | An author previewing their unpublished article, book or preprint gets "access denied" from "View submission" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A6](#a6) | An older version's browser tab reads the current version's title | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A7](#a7) | "ABNT" citation runs a preprint's title into the server's name and prints the date as "30 Sept.2026" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A8](#a8) | "Endnote/Zotero/Mendeley (RIS)" citation download writes its dates with "%" signs ("PY  - %2026/%09/%30") | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A9](#a9) | "More Citation Formats" opens nothing when no additional citation format is offered, so readers cannot reach the citation downloads | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A10](#a10) | A reference's web address written in parentheses becomes a link that includes the closing ")" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | Keywords on an article, book or preprint page can appear in another order than the editor typed | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A13](#a13) | The PDF reader opened from a new version's preview says "This is an outdated version published on ." | 🐞 | low | — |
| [OJS1](#ojs1) | Readers get no other citation format or citation download on an article published outside a published issue | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OJS2](#ojs2) | Publication Facts Label settings always warn "Funding Plugin Not Present", for a plugin that no longer exists | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OJS3](#ojs3) | In French (Canada) and every other language without its own labels, article pages show no "Publication Facts" panel | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OJS4](#ojs4) | With "Recommend Articles by Author" on, article pages never show "Most read articles by the same author(s)" | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OJS5](#ojs5) | With the Publication Facts Label plugin on, no article page shows the "Publication Facts" panel | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OJS6](#ojs6) | On a journal article's PDF reader, the return arrow is announced "Return to Issue Details" but opens the article | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OJS7](#ojs7) | A refused "OK" in the Publication Facts Label settings shows the saved values again, dropping every change just made | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OJS8](#ojs8) | A typed date that does not exist is saved as another date, or not at all, with no message | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OJS9](#ojs9) | Readers opening an XML galley in the Lens reader see its TeX formulas as blanks | 🐞 | medium · crash: script | issues (claude), 2026-10-01 — re-verified |
| [OJS10](#ojs10) | With "Recommend Similar Articles" on, article pages never show "Similar Articles" | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OJS12](#ojs12) | A review marked "Publicly Show Reviewer Comments" never shows on the published article's page | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OPS1](#ops1) | Previewing a new version adds "This is an outdated version published on {the preview day}." | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS2](#ops2) | A preprint with a URL Path loses the galley or version part of its ID address; its HTML and other non-PDF downloads answer "404 Not Found" | 🐞 | high | issues (claude), 2026-10-01 — re-verified |
| [OPS3](#ops3) | A galley's ID address answers "404 Not Found" once the galley has a URL Path | 🐞 | high | issues (claude), 2026-10-01 — re-verified |
| [OPS5](#ops5) | On a preprint server's PDF reader, the return arrow is announced as the code "##article.return##" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS6](#ops6) | Preprint lists never show a preprint's DOI, though the preprint's own page does | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS7](#ops7) | On a French preprint page the keywords label reads "##preprint.subject## :" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS8](#ops8) | On a French page the PDF reader's browser tab reads "##article.pageTitle##" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS9](#ops9) | A click on a cover beside its summary text opens nothing, in a journal's issue page and a server's lists | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | An article with no downloads shows an empty chart instead of "Download data is not yet available." | ❓ | minor | — |
| [A12](#a12) | Once the first version is unpublished, the page still opens its date line with that version's date | ❓ | minor | — |
| [A14](#a14) | The "ABNT" citation shortens given names to initials and, on a journal, prints no address or access date | ❓ | minor | — |
| [OJS11](#ojs11) | The IEEE citation shown first opens with the number "[1]" | ❓ | minor | — |
| [OJS13](#ojs13) | "Similar Articles" would leave out an article that shares only some of the keywords | ❓ | latent | — |
| [OPS4](#ops4) | A preprint server has no HTML or XML reader: those galleys download | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — In French, readers and editors see a raw translation key in place of every version's name and number** · 🐞 · low.
On an article, book or preprint page shown in French, the "Versions"
list names every version with a raw translation key,
"##publication.versionStage.display##": two versions posted the same day
read "2026-09-30 (##publication.versionStage.display##)" twice. The
English page reads "2026-09-30 (Author Original 2.0)" and "2026-09-30
(Author Original 1.0)". A preprint's line above its title shows the same
key, and so does the editor's workflow, whose "Publication" menu lists
one entry per version.
Nothing is lost and every link still opens its version, but neither a
reader nor an editor can tell the versions apart by name or number in
French. The release before listed them by number in French ("2026-09-30
(2)").
French (Canada) was walked. By the code, every language but English
shows the key. The text behind it is only the pattern "stage
major.minor", which holds no word. New texts are offered to translators
once the release branch opens, so this one would reach them before the
release, and each language shows the key until its translators copy the
pattern. The proposed fix builds the name in code instead, so the
numbers show in every language at once. After it a French reader sees
"2026-09-30 (##publication.versionStage.authorOriginal## 2.0)": the
stage name stays a raw key until it is translated.
Basis: probe, 2026-10-01. <sup>[f-a1](#fn-f-a1)</sup>

<a id="a2"></a>
**A2 — An older version's PDF opens a reader with no document, and its "Download" gets no file** · 🐞 · high · crash: script.
An older version's page lists that version's galleys. Its PDF link
opens the PDF reader page with the outdated-version notice, but the
viewer shows no document: an empty page reading "0 of 0", with no
message. The reader page's "Download" gets no file either, and the
browser stays on the reader page.
A reader who wants the version they cite cannot read or download its
PDF, and the page offers no other link to it. The older version's
other galleys (HTML, other files) still open. An editor who previews a
new, unpublished version gets the same empty viewer for its PDF.
It happens on every article or preprint with more than one version
while the "PDF.JS PDF Viewer" plugin is on, as it is by default. A
press's books are not affected: their PDF reader asks for the file of
the version shown.
When the galley's URL Path is the same in both versions, the older
version's PDF reader page shows the current version's file under the
outdated notice; the two are the same file only until an editor
replaces the current galley's file ([→ Galleys, A4](U46-galleys.md#a4)).
Basis: probe, 2026-10-01. <sup>[f-a2](#fn-f-a2)</sup>

<a id="a3"></a>
**A3 — No sentence for an article without downloads** · ❓ · minor.
With a chart chosen, an article nobody has downloaded yet shows the
"Downloads" heading over an empty chart. The page carries the sentence
"Download data is not yet available." for that case, but it never
appears.
Question: should an article with no downloads show the sentence instead
of an empty chart? Lean: yes; the sentence exists for exactly this case.
Basis: probe, 2026-09-25. <sup>[f-a3](#fn-f-a3)</sup>

<a id="a4"></a>
**A4 — Preprint lists and a journal's "Latest Publications" show additional files and link a galley with no file ("404 Not Found")** · 🐞 · low.
An article's or preprint's own page offers its main galleys, sets its
additional files (a data set, a research instrument) apart under
"Additional Files", and leaves out a galley that has no file. An
issue's table of contents offers the main galleys only. A preprint
server's lists, and a journal's "Latest Publications" when the home
page does not also show the current issue's table of contents, offer
every galley instead: the additional files as if they were the article
itself, and the galley with no file as a link that answers "404 Not
Found".
A galley has no file when an editor presses "Add galley", saves the
label and then cancels the upload window. A galley at a separate
website is not this case: it has an address, and its link works.
Both symptoms come from one missing filter, and one fix covers both.
Every file stays reachable from the item's own page. On a journal the
list in question, "Latest Publications", exists on `main` only. A
journal with no issue shows it that way with no setting touched; a
journal with issues does once a manager turns it on and takes the
current issue's table of contents off the home page.
Basis: probe, 2026-10-01. <sup>[f-a4](#fn-f-a4)</sup>

<a id="a5"></a>
**A5 — An author previewing their unpublished article, book or preprint gets "access denied" from "View submission"** · 🐞 · low.
An author who opens the page of their own article, book or preprint
before it is published sees it under "This is a preview and has not
been published. View submission". Pressing "View submission" opens a
page reading "The current role does not have access to this
operation." instead of their submission.
The author reaches the submission from "My Submissions" instead.
Editors and managers pressing the same link land on the submission's
workflow.
Basis: probe, 2026-10-01. <sup>[f-a5](#fn-f-a5)</sup>

<a id="a6"></a>
**A6 — An older version's browser tab names the current version** · 🐞 · low.
An older version's page is headed with that version's title, but the
browser tab, and a bookmark made from it, reads the current version's
title. On a journal, the page that shows an older version's HTML galley
has the same fault. A reader who bookmarks the version they cite gets a
bookmark named after another version. The fault shows only when a later
version was published under a different title.
Basis: probe, 2026-10-01. <sup>[f-a6](#fn-f-a6)</sup>

<a id="a7"></a>
**A7 — "ABNT" citation runs a preprint's title into the server's name and prints the date as "30 Sept.2026"** · 🐞 · low.
In the "ABNT" format under "How to Cite", a preprint's title and the
preprint server's name are printed with no space or full stop between
them, and on a journal and a preprint server alike the date runs the
month into the year ("30 Sept.2026"). A reader who copies the citation
has to repair it by hand. The citation was punctuated correctly until
the plugin's "ABNT" style file was replaced in May 2026.
On a preprint server whose plugin settings have "Publisher Location"
filled in, the citation also runs the server's name into the place
("Public Knowledge Preprint ServerLondon, U.K."). A journal's citation
does not print the place and is not affected by this part.
It needs the "Citation Style Language" plugin, which is off on a new
journal or server until a manager turns it on, and a reader who picks
"ABNT" under "More Citation Formats", or "ABNT" set as the primary
format. The other ten formats, the two citation downloads and a press's
"ABNT" citation of a book are not affected.
Basis: probe, 2026-10-01. <sup>[f-a7](#fn-f-a7)</sup>

<a id="a8"></a>
**A8 — "Endnote/Zotero/Mendeley (RIS)" citation download writes its dates with "%" signs ("PY  - %2026/%09/%30")** · 🐞 · low.
On a journal, a preprint server and a press, the
"Endnote/Zotero/Mendeley (RIS)" file a reader downloads from the "How to
Cite" block writes its dates with a "%" before the year, the month and
the day. An article's and a preprint's file reads
"PY  - %2026/%09/%30" and "Y2  - %2026/%10/%01", and a book's
"PY  - %2026". The reader expects "2026/09/30" and "2026".
The file's publication date and access date are therefore not in the
form the RIS format asks for. The "BibTeX" download of the same page
carries the year correctly.
It needs the "Citation Style Language" plugin turned on. Every RIS
download is affected, whatever the item.
Basis: probe, 2026-10-01. <sup>[f-a8](#fn-f-a8)</sup>

<a id="a9"></a>
**A9 — "More Citation Formats" opens nothing when no additional citation format is offered, so readers cannot reach the citation downloads** · 🐞 · low.
When a manager unticks every "Additional Citation Formats" box in the
"Citation Style Language" settings and leaves the "Downloadable Formats"
ticked, the "How to Cite" block of an article's, a preprint's or a
book's page still shows "More Citation Formats", but pressing it opens
nothing. The reader expects a list with "Download Citation",
"Endnote/Zotero/Mendeley (RIS)" and "BibTeX", and cannot download the
citation.
The page's script attaches the button's handler only when the list
holds at least one format link. With the downloads unticked as well,
the button is still shown and still opens nothing.
Basis: probe, 2026-10-01. <sup>[f-a9](#fn-f-a9)</sup>

<a id="a10"></a>
**A10 — A reference's web address written in parentheses becomes a link that includes the closing ")"** · 🐞 · low.
Under "References" on an article's, preprint's or book's page, a web
address followed directly by ")" becomes a link whose address and text
end in ")". A reference that gives its DOI address in parentheses,
"(https://doi.org/10.1234/u13ir23).", is the usual case: its link leads
to "https://doi.org/10.1234/u13ir23)", which does not exist.
The reader expects the link to stop before the ")", as it does before a
"." or "," after an address.
It shows wherever a reference closes a parenthesis right after an
address, also when the ")" is followed by ".", "," or ";". A ";" or
":" right after an address is taken into the link in the same way.
Basis: probe, 2026-10-01. <sup>[f-a10](#fn-f-a10)</sup>

<a id="a11"></a>
**A11 — Keywords on an article, book or preprint page can appear in another order than the editor typed** · 🐞 · low.
Keywords typed "tide" then "current" can show on the article's, book's
or preprint's page as "Keywords: current, tide", and in a preprint
server's lists as "current" then "tide". The editor expects the order
they typed.
The app saves the order and never reads it back, so the page shows the
keywords in whatever order the database returns them. Once they show in
another order, the next save of the publication stores that order, and
the typed order is kept nowhere. Nothing tells the editor.
On a freshly installed site the typed order holds; it turns only after
the database has stored the rows of one list out of order, which an
editor cannot see coming. Subjects, disciplines and supporting agencies
are stored and read the same way.
The keywords are typed as described in
[Publication metadata](U40-publication-metadata.md), its Rule 7.
Basis: probe, 2026-10-01. <sup>[f-a11](#fn-f-a11)</sup>

<a id="a12"></a>
**A12 — An unpublished first version still dates the article** · ❓ · minor.
Once an article's first version is unpublished while a later one stays
published, the page still opens its "Published" ("Posted") line with the
unpublished version's date: "Published 2024-03-01 — Updated on
2026-09-28". Yet "Versions" no longer lists that version and its own
address answers the "404 Not Found" page. A reader is given a first
publication date for a version they cannot find. The line takes its
first date from every version, published or not, which is also why a
draft rewrites it
([→ Publish, schedule & versions, A6](U49-publish-schedule-and-versions.md#a6)).
Question: should the line date the article from its published versions
only? Lean: yes (🐞); "Versions" and the version's own address already
treat the version as gone.
Basis: probe, 2026-09-28. <sup>[f-a12](#fn-f-a12)</sup>

<a id="a13"></a>
**A13 — The PDF reader opened from a new version's preview says "This is an outdated version published on ."** · 🐞 · low.
On the preview of a new, unpublished version of a published article or
a posted preprint, pressing "PDF" opens the PDF reader page under "This
is an outdated version published on . Read the most recent version.",
the notice an older version's reader carries, with the date left blank
because the new version has none. The version is not outdated: it is
the next one, and "most recent version" opens the published version's
page. The editor or author checking the new version is told it is
outdated; readers never see the preview.
On a journal the preview page itself shows the preview notice alone; on
a preprint server it carries the outdated notice too ([OPS1](#ops1)).
Basis: probe, 2026-10-01. <sup>[f-a13](#fn-f-a13)</sup>

<a id="a14"></a>
**A14 — The "ABNT" citation shortens given names to initials and, on a journal, prints no address or access date** · ❓ · minor.
Since the plugin's "ABNT" style file was replaced in May 2026 (the same
change as [A7](#a7)), "ABNT" writes each author's given names as
initials ("KWANTES, C.; KEKKONEN, U."), and a journal article's citation
ends at the date, with neither the article's address nor the "Acesso
em" (accessed on) date: "KARBASIZAED, V. {title}. Journal of Public
Knowledge, v. 1, n. 2, 30 Sept.2026." A preprint's still ends
"Disponível em: {address}. Acesso em: {day of the visit}". The file it
replaced followed the 2018 edition of the Brazilian standard, which
writes full given names and the address and access date; the new one
follows the 2002 edition.
Question: is "ABNT" meant to follow the 2002 edition? Lean: no (🐞); a
refresh of every style file swapped in a different style that shared the
old file's name, and nothing chose it.
Basis: probe, 2026-10-01. <sup>[f-a14](#fn-f-a14)</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — Readers get no other citation format or citation download on an article published outside a published issue** · 🐞 · medium · crash: server.
On an article published outside a published issue, the app fails on
the server when a visitor who is not signed in uses "How to Cite":
choosing a format under "More Citation Formats" leaves the citation
unchanged with no message, and the "BibTeX" and
"Endnote/Zotero/Mendeley (RIS)" downloads open a blank page.
This happens on an article published with no issue (the journal's
continuous publication), or published at once into an issue that is
not yet published ("Assign To Future Issue and Publish Immediately").
A signed-in Reader, the article's Author or a Section Editor not
assigned to the article gets the same unchanged citation, and the
downloads show "404 Not Found". A Journal Manager, and a Section Editor
or Copyeditor assigned to the article, get the other formats and the
files. On an article in a published issue all of it works, for
everyone.
It needs the "Citation Style Language" plugin turned on. No released
version can publish an article outside a published issue, so only
journals on the coming release meet it.
Basis: probe, 2026-10-01. <sup>[f-ojs1](#fn-f-ojs1)</sup>

<a id="ojs2"></a>
**OJS2 — Publication Facts Label settings always warn "Funding Plugin Not Present", for a plugin that no longer exists** · 🐞 · low.
A journal manager who opens the "Publication Facts Label plugin"
settings window always finds it headed "Funding Plugin Not Present",
which tells them to install and enable the Funding plugin from the
Plugin Gallery. That plugin is gone: funders are now part of the
journal's own metadata (the "Funders" setting), and the plugin's
"Publication Facts" panel on article pages takes its "External funding"
row from that setting.
The settings still save, but the manager is sent looking for a plugin
that cannot be installed, and the warning never goes away. The warning
also ignores the "Funders" setting. A journal that turns funder metadata
off, which leaves the panel with no funding data, sees the same warning
and is not told to turn the setting back on.
Only journals on the coming release meet it, once they turn the plugin
on (it is off by default). On 3.5 the panel still uses the Funding
plugin, so the warning there is true.
Basis: probe, 2026-10-01. <sup>[f-ojs2](#fn-f-ojs2)</sup>

<a id="ojs3"></a>
**OJS3 — In French (Canada) and every other language without its own labels, article pages show no "Publication Facts" panel** · 🐞 · medium.
With "Publication Facts Label plugin" on, an article page read in French
(Canada) shows no Publication Facts panel, and nothing says so. The same
page in English shows it.
It is one problem with two cases. The panel takes its labels from one
file per language and stays empty when the page's language has no file
of its own:
- French (Canada) and Spanish (Mexico): the labels exist under the base
  language ("fr", "es"), and the page does not look there.
- 58 more of the 78 languages OJS ships, German, Dutch and Arabic among
  them: the plugin has no labels at all.
With the proposed fix a reader of the first case sees the panel with the
base language's labels. A reader of the second sees it with English
labels, or still no panel if the team keeps to no English fallback.
On `main` this is hidden while the panel never shows ([OJS5](#ojs5)).
Basis: probe, 2026-10-01. <sup>[f-ojs3](#fn-f-ojs3)</sup>

<a id="ojs4"></a>
**OJS4 — With "Recommend Articles by Author" on, article pages never show "Most read articles by the same author(s)"** · 🐞 · medium · crash: server.
With "Recommend Articles by Author" on (it is off on a new journal),
the page of an article whose contributor has another published article
in the journal opens normally, but without "Most read articles by the
same author(s)".
The app fails on the server as it builds that list: the plugin's error
is caught and logged, and the page is served without the list.
Since: 2025-08-01 (the search rebuild) · Basis: probe, 2026-10-01. <sup>[f-ojs4](#fn-f-ojs4)</sup>

<a id="ojs5"></a>
**OJS5 — With the Publication Facts Label plugin on, no article page shows the "Publication Facts" panel** · 🐞 · medium · crash: server.
With "Publication Facts Label plugin" on, no article page shows the
Publication Facts panel, in any language. The page opens normally
without it: the plugin fails on the server on every article page, and
the page is served without its output.
A journal that switches the plugin on and fills in its settings shows
readers nothing, and nobody is told. The authors' competing-interests
statements, which the plugin adds under their names, are missing too,
also on the articles meant to go without the panel (in a section marked
"Will not be peer-reviewed", or submitted before the plugin's "Start
Date").
Basis: probe, 2026-10-01. <sup>[f-ojs5](#fn-f-ojs5)</sup>

<a id="ojs6"></a>
**OJS6 — On a journal article's PDF reader, the return arrow is announced "Return to Issue Details" but opens the article** · 🐞 · low.
On a journal article in an issue, a screen reader announces the PDF
reader's return arrow as "Return to Issue Details", but pressing it
opens the article's page. The destination is right and the label is
wrong: the arrow should announce "Return to Article Details", as it does
for an article in no issue and as the HTML reader's arrow always does.
The arrow announced "Return to Article Details" on these pages until a
2024 change to the reader. The arrow has no visible text and no hover
tooltip, so only screen-reader users meet the wording.
The reader is the page of the "PDF.JS PDF Viewer" plugin, which is on by
default in every journal.
Basis: probe, 2026-10-01. <sup>[f-ojs6](#fn-f-ojs6)</sup>

<a id="ojs7"></a>
**OJS7 — A refused "OK" in the Publication Facts Label settings shows the saved values again, dropping every change just made** · 🐞 · low.
A journal manager fills in the "Publication Facts Label plugin" settings
window and presses "OK". When the save is refused (a Scopus or Web of
Science address in the wrong form, an index listing that cannot be
verified), the window stays open with the message, but every field
shows the value saved before: the address just typed, a box just ticked
and every other change made in the window are gone.
The stored settings are untouched. The manager has to enter everything
again, with the refused field corrected. A manager who corrects only
the refused field and presses "OK" again gets "Your changes have been
saved." while the other changes are left out.
It happens at every refused "OK", on any journal with the plugin on. A
refusal does not need a mistake: an index listing is also refused when
the index's server cannot be reached.
Basis: probe, 2026-10-01. <sup>[f-ojs7](#fn-f-ojs7)</sup>

<a id="ojs8"></a>
**OJS8 — A typed date that does not exist is saved as another date, or not at all, with no message** · 🐞 · medium.
An editor or manager types a date that does not exist into a date box
and presses "OK": "2030-02-30" as a review's "Review Due Date", or
"2026-99-99" as the "Start Date" in the Publication Facts Label
settings. The window closes as after any save, with no message, but
what is stored is another date ("2030-02-03"), the date that was there
before, or no date. They expect the date to be refused.
For a review, the reviewer is emailed the wrong due date and the
reminders follow it. A date picked in the calendar, or a real date
typed, is saved correctly.
It was seen in a review's "Edit" window and in the Publication Facts
Label settings. By the code it is the same in every window whose date
box opens a calendar: adding a reviewer, an issue's data and access, a
subscription, a book chapter. A preprint server has no such window.
Basis: probe, 2026-10-01. <sup>[f-ojs8](#fn-f-ojs8)</sup>

<a id="ojs9"></a>
**OJS9 — Readers opening an XML galley in the Lens reader see its TeX formulas as blanks** · 🐞 · medium · crash: script.
When a reader opens an article's XML galley, the eLife Lens reader lays
the article out, but the page's own script fails as it finishes, and the
article's formulas written in TeX never appear. A display formula leaves
only its number, such as "(1)", and an inline one leaves a gap in its
sentence. Formulas written in MathML still show, and so does the rest of
the article.
Readers lose the article's mathematics, and nothing tells them anything
is missing.
It concerns journals that publish JATS XML galleys whose formulas are in
TeX. "eLife Lens Article Viewer" is on for a new journal.
Basis: probe, 2026-10-01. <sup>[f-ojs9](#fn-f-ojs9)</sup>

<a id="ojs10"></a>
**OJS10 — With "Recommend Similar Articles" on, article pages never show "Similar Articles"** · 🐞 · medium.
With the "Recommend Similar Articles" plugin on (it is off on a new
journal), no article page shows "Similar Articles", even when another published
article in the journal carries exactly the same keywords. The page opens
normally, with no list and no message.
Readers lose the list that leads from an article to related ones in the
journal, and the journal has nothing to set that brings it back. It
happens on every article, whether it sits in a published issue or was
published without one.
Basis: probe, 2026-10-01. <sup>[f-ojs10](#fn-f-ojs10)</sup>

<a id="ojs11"></a>
**OJS11 — The IEEE citation shown first carries its number** · ❓ · minor.
With "IEEE" as the "Primary Citation Format", a journal article's "How
to Cite" opens with "[1]" run into the author ("[1]A. Author, “Tidal
Patterns in Coastal Waters”, …"). The same citation chosen under "More
Citation Formats" reads "A. Author, “Tidal Patterns in Coastal Waters”,
…", and a preprint server's page shows no number either way. A reader
who copies the citation shown first copies the number too.
Question: should the citation shown first carry the number? Lean: no;
the chosen format and the preprint page show none: the app hides the
number everywhere else.
Basis: test run, 2026-09-25. <sup>[f-ojs11](#fn-f-ojs11)</sup>

<a id="ojs12"></a>
**OJS12 — A review marked "Publicly Show Reviewer Comments" never shows on the published article's page** · 🐞 · medium.
An editor ticks "Publicly Show Reviewer Comments" on a review and
presses "Mark as Complete", whose dialog says "This review will be made
publicly visible alongside the article." Once the article is published,
its page shows no review at all: no comments, no reviewer's name, no
review heading, for a visitor or for the editor.
The journal believes its reviews are public, and nobody learns that
readers never see them. No setting puts the review on the page.
It concerns journals that publish reviews: the editor ticks the box on
each review, or the journal ticks it for every new review under
Settings › Workflow › Review › Setup ("Make reviewer comments publicly
visible with published content"), which is off until a journal turns it
on.
Basis: probe, 2026-10-01. <sup>[f-ojs12](#fn-f-ojs12)</sup>

<a id="ojs13"></a>
**OJS13 — "Similar Articles" would leave out an article that shares only some of the keywords** · ❓ · latent.
Once "Similar Articles" shows again ([OJS10](#ojs10)), it lists only
the articles that hold every word of the article's keywords: under an
article with the keywords "Professional Development" and "Social
Transformation", an article with both is listed and one with only
"Social Transformation" is not. On 3.5 an article sharing any one
keyword is listed. The narrowing came with a change to how the
editorial search matches words, not with a change to this list. While
the list never shows, no reader meets it.
Question: should an article that shares some of the keywords count as
similar? Lean: yes (🐞); the list was built to match any one word, and
3.5 still does.
Since: 2026-07-30 (the search change) · Basis: probe, 2026-10-01. <sup>[f-ojs13](#fn-f-ojs13)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preview of a new version also calls itself outdated** · 🐞 · low.
Previewing a new, unposted version of a posted preprint shows "This is
a preview and has not been published. View submission" and under it
"This is an outdated version published on {today's date}. Read the most
recent version." The version has no publication date, so the line
prints the day of the preview. The version is not outdated; it is the
next one, and "most recent version" leads to the posted version's page.
A journal shows the preview notice alone. The editor or author checking
the new version is told it is outdated and was published today; readers
never see the line.
Basis: probe, 2026-10-01. <sup>[f-ops1](#fn-f-ops1)</sup>

<a id="ops2"></a>
**OPS2 — A URL Path cuts the rest of an ID address** · 🐞 · high.
Once a preprint has a URL Path, an address that uses its ID forwards to
the URL Path address but drops what came after the ID: a galley's ID
address opens the preprint's page, and version 1.0's address shows the
current version's page with no "outdated version" notice (or answers
"404 Not Found" when the version's ID matches none of the preprint's
galley IDs), so a reader following a citation of 1.0 reads 2.0 without
being told. Every galley that downloads rather than opening in a reader
(an HTML file, any other non-PDF file; a PDF too when the "PDF.JS PDF
Viewer" plugin is off) passes through such an address, so on that
preprint those galley links answer "404 Not Found" instead of the file.
A PDF opens in its reader, whose "Download" works. A journal keeps the
rest of the address.
Basis: probe, 2026-10-01. <sup>[f-ops2](#fn-f-ops2)</sup>

<a id="ops3"></a>
**OPS3 — A galley's ID address stops working** · 🐞 · high.
Once a galley has a URL Path, its old ID address answers "404 Not
Found", so a link shared before the URL Path was set breaks. A journal
forwards the ID address to the URL Path address.
Basis: probe, 2026-10-01. <sup>[f-ops3](#fn-f-ops3)</sup>

<a id="ops4"></a>
**OPS4 — No HTML or XML reader on a preprint server** · ✅ · —.
A preprint server installs neither "HTML Article Galley" nor "eLife Lens
Article Viewer", so an HTML or XML galley downloads where a journal shows
it in a reader. Intended: the application ships that way.
Basis: probe, 2026-09-25. <sup>[f-ops4](#fn-f-ops4)</sup>

<a id="ops5"></a>
**OPS5 — On a preprint server's PDF reader, the return arrow is announced as the code "##article.return##"** · 🐞 · low.
The return arrow at the top left of the PDF reader page has no visible
text; on a preprint server a screen reader announces it as the code
"##article.return##". On a journal the same arrow is announced "Return
to Issue Details" or "Return to Article Details".
A blind reader cannot tell where the arrow leads. The arrow works and
opens the preprint's page. It has no hover tooltip, so sighted readers
never see the code.
The code is announced on every preprint's PDF, in every language the
server offers, English included. OPS's language files lack the
`article.return` text that the PDF viewer template, shared with OJS,
reads; the fix is in OPS.
Basis: probe, 2026-10-01. <sup>[f-ops5](#fn-f-ops5)</sup>

<a id="ops6"></a>
**OPS6 — Preprint lists never show a preprint's DOI, though the preprint's own page does** · 🐞 · low.
Each preprint's entry in a preprint server's lists has a "DOI:" line,
meant to show the preprint's DOI as a link. It never appears, even for a
preprint whose own page shows "DOI:". Readers browsing the lists see no
DOI; the preprint's own page still shows it.
The lists are the home page's "Latest preprints", "Archives", section
and category pages, and search results. It applies to every server that
assigns DOIs to its preprints and uses OPS's own list template, as the
default theme does.
Basis: probe, 2026-10-01. <sup>[f-ops6](#fn-f-ops6)</sup>

<a id="ops7"></a>
**OPS7 — The keywords label is a raw code in French** · 🐞 · low.
A preprint page shown in French labels its keywords "##preprint.subject##
:" ("##preprint.subject## : employees, survey") where the English page
reads "Keywords:" and a journal's French page "Mots-clés :". A French
reader sees a code where the label should be; the keywords themselves
show. French (Canada) was walked; French (France), Spanish, Catalan,
Finnish, Norwegian Bokmål, Portuguese and Turkish show the same code
by the code.
Basis: probe, 2026-10-01. <sup>[f-ops7](#fn-f-ops7)</sup>

<a id="ops8"></a>
**OPS8 — The French PDF reader's browser tab reads a raw code** · 🐞 · low.
On a page shown in French, the PDF reader's browser tab reads
"##article.pageTitle##" where a journal's reads "Vue de {title}" and
the English page "View of {title}". The tab, and a bookmark made from it,
does not name the preprint. French (Canada) was walked; French (France),
Spanish, Catalan, Finnish, Norwegian Bokmål, Portuguese and Turkish show
the same code by the code.
Basis: probe, 2026-10-01. <sup>[f-ops8](#fn-f-ops8)</sup>

<a id="ops9"></a>
**OPS9 — A click on a cover beside its summary text opens nothing, in a journal's issue page and a server's lists** · 🐞 · low.
On a preprint server's lists ("Archives", the home page's "Latest
preprints", section, category and search pages), a preprint's cover
image sits to the right of its author line, keywords and "Downloads …
Posted" line. On a screen 768 px wide or wider, a click or tap on the
cover beside those lines does nothing. The dead band runs from just
under the title to just under the "Downloads" line; on a square cover
that is about the middle half. Above and below the band the cover opens
the preprint.
A journal's issue page and its other article lists do the same in the
row of the author line, about an eighth of a square cover's height.
The title and the rest of the cover still open the page, so readers get
there with a second click.
Basis: probe, 2026-10-01. <sup>[f-ops9](#fn-f-ops9)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-24 at the checkouts' tips (`checkouts/ojs`,
`checkouts/ops`, each with its `lib/pkp`; `checkouts/omp` for the
counterpart only). The two apps' landing pages are app-side copies
(RUNBOOK multi-app rule 7), so every shared claim here needed a probe on
both. Every claim was then driven between 2026-09-24 and 2026-09-25 on
scratch journals and preprint servers, signed out and as the roles each
note names, with a scratch press as the read-only control for the claims
a press does not share; notes q1 to q16 held the author's open questions
before the drive and now record what the screens showed.

<a id="fn-a"></a>
**a** — The page: OJS `templates/frontend/pages/article.tpl` with
`templates/frontend/objects/article_details.tpl`, served by
`pages/article/ArticleHandler.php`; OPS `templates/frontend/pages/preprint.tpl`
with `templates/frontend/objects/preprint_details.tpl`, served by
`pages/preprint/PreprintHandler.php`. No lib/pkp class is shared between
the two handlers. The blocks other features describe are rendered by the
same templates (contributors, statements, funders, pubIds, license) or
added by plugins through `Templates::Article::Details` (Crossref's
Crossmark button, `CrossrefPlugin::displayCrossmarkButton()`). OPS's
relation notice: `preprint_details.tpl`, `relationStatus ==
PUBLICATION_RELATION_PUBLISHED`, texts `publication.relation.published`
"This preprint has been published elsewhere." and
`publication.relation.vorDoi` "DOI of the published preprint";
left to *Preprint relations*. OMP's book page is
`pages/catalog/CatalogBookHandler`
with `monograph_full.tpl`, the counterpart feature.
Live-probed 2026-09-25 (Purpose), OJS and OPS: a published article's
page was reached from an issue's table of contents, the home page, a
category page, search results and its typed address; its PDF opened the
reader page and a text galley downloaded; the preprint page read
"Posted". The comments blocks showed on a journal only (none on a
preprint page with public comments on). After "Make available with
publication" on the JATS XML page, "JATS XML" sat in the journal's side
column between the main galleys and the additional files; a preprint
server has no JATS XML page. With Crossref chosen and its "Enable
participation in Crossmark…" ticked on Distribution › DOIs ›
"Registration", the Crossmark button showed last in the journal's side
column, after "URN"; a preprint server's Crossref "Registration" tab has
no Crossmark box. The relation notice read "This preprint has been
published elsewhere. DOI of the published preprint
https://doi.org/10.1234/elsewhere" above the label line. OMP control: a
published book has no article page (its number under `article/view/`
answered "404 Not Found"); its page is `catalog/book/{id}`.

<a id="fn-b"></a>
**b** — Access: `ArticleHandler::initialize()` answers
`NotFoundHttpException` when no submission matches, and when the requested
publication is not `STATUS_PUBLISHED` and the user is absent or fails
`Repo::submission()->canPreview()`; `ArticleHandler::authorize()` adds
`OjsJournalMustPublishPolicy` ("This journal does not publish its content
online." under publishing mode none) and galley access runs through
`ArticleHandler::userCanViewGalley()` (subscriptions, purchases, the
journal's article-access restriction: *Subscriptions & open access
control*). OPS: `PreprintHandler::initialize()`, `OpsServerMustPublishPolicy`,
`PreprintHandler::userCanViewGalley()` (published, or `canPreview()`). The
page's only per-user content is the comments component
(`UserCommentComponent`, `enablePublicComments`). `view()` and
`download()` send no mail; they fire `UsageEvent` only. The closed
journal: `manager.setup.restrictSiteAccess` "Users must be registered
and log in to view the journal site." (OPS "…to view the server site.")
and the context's enabled flag.
Live-probed 2026-09-25 (Actors preamble, rows 2–6; Side effects), OJS
and OPS: with "Users must be registered…" ticked, a signed-out visitor
typing a published article's address or its galley's address landed on
Login, and the journal's Reader read the page; with the journal
un-enabled by the Site Administrator ("Enable this journal to appear
publicly on the site"), the visitor landed on Login and the Reader still
read the article. The Journal Manager, the Site Administrator and the
assigned Section Editor (Moderator) opened an unpublished article's
preview, their workflow offering "Preview"; the submission's Author
opened it by typing the address, the Author's workflow offering none; a
visitor, the Reader and a Reviewer (OJS) got "404 Not Found". Signed out
and as the Reader, "PDF" opened the reader and its "Download" saved the
file; "More Citation Formats" › "MLA" replaced the citation and
"BibTeX" downloaded. The Journal Manager reached Settings › Website ›
"Plugins"; the Section Editor (Moderator), the Author and the Reader got
the access-denied page there. Reading the page, a format, a citation
download, the PDF reader and its "Download" left the mail catcher's
counts for the manager, the author, the section editor and the Reader,
and the manager's and the author's "Tasks" counts, unchanged.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-25 (Actors preamble, row 1), OJS and OPS:
a published article with a PDF galley, its current and its older
version, read signed out and as Reader, Author, Reviewer (OJS),
Assistant, Section Editor (Moderator), Journal Manager and Site
Administrator: headings, links and notices were identical at every
level. With public comments on, the journal's page differed only in the
comments blocks ("Log in to comment" signed out; "What do you think
about this publication? Type your comments here." and "Submit" signed
in); a preprint server's page, and a press's book page (the control),
differed in nothing.

<a id="fn-c"></a>
**c** — Parts of the page, `article_details.tpl` / `preprint_details.tpl`
in template order. Breadcrumb `frontend/components/breadcrumbs_article.tpl`
(`common.homepageNavigationLabel` "Home", `navigation.archives`
"Archives", the issue's `getIssueIdentification()`, the section title)
and `breadcrumbs_preprint.tpl` ("Home", the section title);
`navigation.breadcrumbSeparator` "/". DOI: `doi.readerDisplayName` "DOI"
through `semicolon` "{$label}: ", link `doiObject->getData('resolvingUrl')`;
the object is the publication's own, else a minor version's under DOI
versioning, else the current version's (`ArticleHandler::view()`,
`PreprintHandler::view()`). Keywords: OJS `article.subject`, OPS
`preprint.subject`, both "Keywords", `getLocalizedData('keywords')`
joined by `common.commaListSeparator`; OPS's `locale/fr_CA/locale.po`
holds `preprint.subject` with an empty translation (OPS7). Abstract: OJS
`article.abstract`, OPS `common.abstract`, both "Abstract".
`submission.plainLanguageSummary` "Plain Language Summary". Cover:
`publication.coverImage`, else (OJS only) the issue's cover linked to
`issue/view/{bestIssueId}`. Issue block (OJS): `issue.issue` "Issue",
`section.section` "Section", `category.category` "Categories" (lib/pkp),
`submission.articleNumber` "Article Number". Categories: OJS
`Repo::category()->getCollector()->filterByPublicationIds()`, each
`getLocalizedTitle()`, linked to `catalog/category/{path}`; OPS builds
"{parent} > {title}" in `PreprintHandler::view()`, linked to
`preprints/category/{path}` under `category.categories` "Categories" (app
key). Every part is wrapped in an `{if}` on its data, the "References"
part on OPS excepted (note m). Localized texts come from
`getLocalizedData()`, which reads the visitor's locale first.
Live-probed 2026-09-25 (Fields, the landing page; Rules 6, 14, 21), OJS
and OPS: the breadcrumb read "Home / Archives / Vol. 1 No. 2 (2014) /
Articles" ("Home / Archives / Articles" with no issue), the section
plain and the rest links, and "Home / Preprints" with "Home" the only
link on the preprint server; the title with "Full subtitle" under it,
the browser tab reading "{title}: {subtitle} | {journal}"; once a DOI
prefix was set on screen, "DOI: https://doi.org/10.1234/…" as a link;
"Keywords: alpha, beta" as plain text; the abstract, the plain language
summary and "References" with their headings. An article with a title,
one contributor and an abstract showed the title, "Abstract",
"Published", "Versions" and on a journal "Section" (plus "Issue" and the
issue's cover in an issue with one); on a preprint server the title,
"Abstract", "References", "Posted" and "Versions". An older version's
page showed "Keywords: vone" and "Arts" where the current one showed
"Keywords: vtwo", "Arts" and "Science". On a journal's French page every
label was French ("Accueil", "Mots-clés :", "Résumé", "Publié",
"Versions", "Numéro", "Rubrique", "Catégories", and "Téléchargements"
for screen readers), the article's French title, abstract, keyword and
category names shown, English where the version had no French; the
preprint page's keywords label read "##preprint.subject## :".

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-25 (Fields, the side column; Rule 6), OJS
and OPS: a minimal article and one filled as far as the Publication
pages allow, both published. The journal's side column ran: its own
cover image (not a link), "PDF", "Data", "Published", "Versions", "Data
Availability Statement", "Funding Statement", "Issue" ("Vol. 1 No. 2
(2014)", a link), "Section" (plain), "Categories", "Article Number"
("e42", plain), "Funders", "Comments", "URN", "License", "How to Cite";
the preprint server's: cover, "PDF", "Data", "Posted", "Versions",
"Categories", "How to Cite", "Data Availability Statement", "Funding
Statement", "Funders", "License". "Categories" read "Physics" and
"Science" on the journal, "Science > Physics" and "Science" on the
server, each a link that landed on the category page. An article with no
cover of its own, in an issue with a cover, showed the issue's cover as
a link to the issue's page. With "Publication Facts Label plugin" and
"Citation Style Language" both on, "How to Cite" was last and no
Publication Facts panel appeared (OJS5).

<a id="fn-d"></a>
**d** — PDF reader: `plugins/generic/pdfJsViewer/PdfJsViewerPlugin.php`
(the OJS and OPS files are identical, diffed), `submissionCallback()` on
`ArticleHandler::view::galley` and `PreprintHandler::view::galley` for a
galley whose file type is `application/pdf`; `templates/display.tpl`
(identical): return link to `parentUrl` (the article's unversioned view)
with screen-reader text `issue.return` "Return to Issue Details" whenever
the page has an issue, else `article.return` "Return to Article Details"
(both OJS app keys; OPS has neither, OPS5; OJS6), title link,
`common.download` "Download" with `common.downloadPdf` "Download PDF"
for screen readers, the pdf.js viewer in an iframe titled
`submission.representationOfTitle` "{$representation} of {$title}"; the
outdated notice `submission.outdatedVersion` when `!isLatestPublication`;
browser title `article.pageTitle` "View of {$title}", which OPS's French
locale lacks (OPS8).
Live-probed 2026-09-25 (Fields, the PDF reader page; Rules 11, 12), OJS
and OPS: the viewer offered "Toggle Sidebar", "Find in Document",
"Previous Page", "Next Page", "Page", "Zoom Out", "Zoom In", "Zoom",
"Highlight", "Text", "Draw", "Add or edit images", "Print", "Save" and
"Tools"; "Download" saved `article.pdf` / `preprint.pdf`, the browser
staying on the reader, and a screen reader read it "Download PDF"
("Télécharger le PDF" in French). The arrow's hidden text read "Return
to Issue Details" on a journal article in an issue (French "Retourner
aux renseignements sur le numéro"), "Return to Article Details" on one
in no issue, "##article.return##" on the preprint server, and pressing it
opened the article's unversioned page (two runs on the journal). The
browser tab read "View of {title}" in English on both, "Vue de {title}"
on the journal's French page and "##article.pageTitle##" on the
server's. The page has no heading; the title is a link in the bar.

<a id="fn-e"></a>
**e** — Galley lists: `ArticleHandler::view()` / `PreprintHandler::view()`
skip a galley with neither `urlRemote` nor a file, put remote galleys and
files of `GenreDAO::getPrimaryByContextId()` (enabled, not dependent, not
supplementary) in `primaryGalleys`, files of
`GenreDAO::getBySupplementaryAndContextId(true)` in `supplementaryGalleys`,
and drop the rest; screen-reader headings `submission.downloads`
"Downloads" and `submission.additionalFiles` "Additional Files". Default
components and their flags: `registry/genres.xml` (both apps). Link text
`Galley::getGalleyLabel()`, which appends " ({language name})" when the
galley's locale is not the UI locale. Link addresses:
`frontend/objects/galley_link.tpl` (app copies): OJS `publication.urlPath`
or the article number, then `getBestGalleyId()`, and
`{bestId}/version/{publicationId}/{galley}` for a publication other than
the current one; OPS the same through `getBestId()`. HTML reader (OJS
only): `plugins/generic/htmlArticleGalley/HtmlArticleGalleyPlugin.php`
for `text/html`, `templates/display.tpl` (return link `article.return`,
title from `$article->getCurrentPublication()`, iframe on the `download`
op with `inline=true`, versioned for an older publication, notice dated
with `dateFormatLong`); `articleDownloadCallback()` serves the HTML
(cached a day for signed-out readers). Lens (OJS only):
`plugins/generic/lensGalley/LensGalleyPlugin.php` for `application/xml`
and `text/xml`, `templates/articleGalley.tpl` inside the journal's
`frontend/components/header.tpl`; its `display.tpl` loads MathJax 3 from
a public CDN (OJS9). Anything else: no plugin claims the hook, `view()`
redirects to the `download` op and `PKPFileService::download()` sends
the file with `Content-Disposition: attachment`. Remote:
`redirectUrl(urlRemote)` in `view()` and `download()`.
Live-probed 2026-09-25 (Rules 10, 10a, 10b; Settings bullet 11), OJS and
OPS: on an English page the lists read "PDF", "HTML (French (Canada))",
"Remote", then "Data", "Notes"; on a French page "PDF (anglais)", "Data
(anglais)", "Remote (anglais)" and plain "HTML" for the French galley.
Addresses: `…/view/{number}/{galley number}`, `…/view/{number}/pdf` for
a galley URL Path, `…/view/probe-path/{galley number}` for an article
URL Path, `…/view/{number}/version/{id}/{galley}` on an older version's
page. On a new journal and server Settings › Workflow › Submission ›
"Components" ("Article Components", "Preprint Components") showed the
supplementary box ticked for the nine components listed, and "These are
dependent files…" ticked for "Multimedia", "Image" and "HTML
Stylesheet"; the galley upload offered none of the three. The window's
"Close" after a change asked "The data on this form has changed. Do you
wish to continue without saving?"; "Save" closed it with no notice.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-25 (Rules 10, 22; A4), OJS and OPS: an
article with "PDF" of "Article Text" ("Preprint Text"), "Data" of "Data
Set", "Notes" of "Other", a French "HTML", a remote galley, and "Draft"
added on the "Galleys" page with its upload closed before a file was
chosen (its row read "Draft English"); an "Image" galley could not be
made (above). Signed out and as the Reader, the page listed "PDF",
"HTML (French (Canada))" and "Remote", then "Data" and "Notes", in the
"Galleys" page's order; "Draft" nowhere; screen-reader headings
"Downloads" and "Additional Files" ("Téléchargements", "Fichiers
supplémentaires"). With "Data Set" no longer supplementary, "Data" moved
to the main list; made dependent, it left the page. Listings: on the
journal the issue's table of contents, the home page's "Current Issue"
and, beside it, "Latest Publications" showed the main galleys only; with
"Include the current issue's table of contents" unticked, "Latest
Publications" showed "PDF", "Data", "Remote" and "Draft", and "Draft"
answered "404 Not Found"; ticked again, the main galleys only. The
server's "Latest preprints" and "Archives" showed every galley, "Draft"
included, answering "404 Not Found".

<a id="fn-f"></a>
**f** — Addresses: `ArticleHandler::initialize()`: a digit-only path is
looked up by number, anything else by `Repo::submission()->getByUrlPath()`;
when `getBestId()` differs from the requested path it redirects to
`[$currentUrlPath, ...$args]`; a `version` sub-path picks the publication
by its id, and an unknown id leaves the typed `Publication $publication`
property unassigned, which fails (the versions spec's OJS3); the galley
is matched by `getBestGalleyId()`, a digit-only galley path matching a
galley's number redirects to its best id, a galley found only in another
published publication redirects to the article's view, and anything else
is `NotFoundHttpException`. OPS `PreprintHandler::initialize()`: the
redirect builds `$newArgs = $args; $newArgs[0] = $currentUrlPath;` after
the path was shifted off `$args` (OPS2); no digit-only galley redirect
(OPS3); `$publication` is untyped, so an unknown version is a plain
`NotFoundHttpException`. Notices: `submission.viewingPreview` "This is a
preview and has not been published. <a href="{$url}">View
submission</a>" with `url` → `dashboard/editorial?workflowSubmissionId={id}`
(A5); `submission.outdatedVersion` "This is an outdated version
published on {$datePublished}. Read the <a
href="{$urlRecentVersion}">most recent version</a>." OJS chains the two
with `{elseif}`; OPS tests them separately (OPS1). An older
publication's page also gets `<meta name="robots" content="noindex">`
and a canonical link to the current version. Live-probed 2026-09-25
(Rules 1–5, 13): notes q2, q3, q4 and q10 record what the addresses
opened.

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-25 (Rules 1, 2; OPS2), OJS and OPS: an
article with an older published version, "URL Path" typed "probe-path"
on the new version's "Publication Settings" ("Preprint entry") page and
saved, then published. Signed out: the number address forwarded to
`…/view/probe-path`; the number followed by a galley's number opened
`…/view/probe-path/{galley}`'s PDF reader on the journal and the
preprint's page on the server; followed by `/version/{older id}` it
opened `…/view/probe-path/version/{id}` with the outdated notice on the
journal, and "404 Not Found" at `…/view/probe-path/{id}` on the server.
The versions' own addresses carried the ids of the "Versions" links
(`…/article/view/60/version/68` for "Version of Record 1.0", `…/preprint/view/43/version/45`
for "Author Original 1.0"); the current version's own such address
opened the plain page with no notice. `/version/999999`, and another
article's version id, answered a blank server error page on the journal
and "404 Not Found" on the server. The field reads "URL Path" on both,
its help "Set a custom URL for this publication, or leave blank to use
the default." (OJS) and "An optional path to use in the URL instead of
the ID." (OPS).

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-25 (Rules 3, 4; A5; OPS1), OJS and OPS:
signed out, as the Reader and as a Reviewer (OJS), an unpublished
article's address, a scheduled one's (OJS), a draft third version's own
address (the one its "Preview" opened for the Journal Manager), an
unknown number, an unknown URL Path and another journal's article
number each answered "404 Not Found" (OMP control: an
unpublished book's address alike). The Journal Manager's "Preview"
opened the page under "This is a preview and has not been published.
View submission", with no "Published" line and no "Versions" list;
"View submission" opened the submission's workflow on its current
stage. The Author, typing the address, got the same preview; the
Author's "View submission" landed on "The current role does not have
access to this operation.". On the server, a new version previewed after
"Create New Version" on a posted preprint showed that notice and under it
"This is an outdated version published on 2026-09-25. Read the most
recent version.", the day of the preview, and the label line "Preprint /
2026-09-25 (Author Original 1.2)"; the journal showed the preview notice
alone. A scheduled article seeded as published sits at the Submission
stage, whose workflow offers no "Preview"; the manager still opened its
preview by the address.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-25 (Rule 5; A6), OJS and OPS: an article
with a first version backdated to 2026-09-01 and a second one published.
Signed out, the older version's page (from "Versions") read "This is an
outdated version published on 2026-09-01. Read the most recent
version.", and "most recent version" opened the article's address. The
older page was headed with its own title while the browser tab read the
current version's title and the journal's name (two runs on the
journal).

<a id="fn-g"></a>
**g** — Dates and versions: `firstPublication` is the publication with the
earliest `datePublished` among all of the submission's publications
(`ArticleHandler::view()`, `PreprintHandler::view()`); `submissions.published`
"Published" (OJS app) / "Posted" (OPS app); `submission.updatedOn`
"{$datePublished} — Updated on {$dateUpdated}"; `submission.versions`
"Versions"; entries `submission.versionIdentity` "{$datePublished}
({$version})" over `array_reverse(getPublishedPublications())`, the shown
one unlinked, the current one to the plain address, others to
`version/{id}`. The version name is `Repo::publication()->getVersionString()`
→ `PublicationVersionInfo::__toString()` → `publication.versionStage.display`
"{$stage} {$majorNumbering}.{$minorNumbering}", which `lib/pkp/locale/fr_CA`
lacks (A1). OPS label line: `common.publication` "Preprint",
`navigation.breadcrumbSeparator`, the same `submission.versionIdentity`.
Live-probed 2026-09-25 (Rules 7–9), OJS and OPS: one version read
"Published 2026-09-01"; two read "Published 2026-09-01 — Updated on
2026-09-24" ("Posted 2026-09-01 — Updated on 2026-09-25" on the server).
"Versions" listed "2026-09-24 (Version of Record 1.1)" then "2026-09-01
(Version of Record 1.0)" ("Author Original …" on the server), the shown
one plain, the current one linked to the plain address and the older to
its own; a draft third version created 2026-09-25 was not listed, but
the current page's line then read "Published 2026-09-25 — Updated on
2026-09-24" and the older one's "Published 2026-09-25 — Updated on
2026-09-01" ("Posted 2026-09-25 — Updated on 2026-09-25" and "Posted
2026-09-25 — Updated on 2026-09-01" on the server; the versions spec's
A6). The label line read
"Preprint / 2026-09-25 (Author Original 1.1)" on the current page and
"Preprint / 2026-09-01 (Author Original 1.0)" on the older one.
Live-probed 2026-09-28 (Rules 3, 7, 7b, 8; A12), OJS and OPS, two runs
on scratch contexts, signed out: a first version seeded published on
2024-03-01 (OJS, in an issue) or 2024-03-03 (OJS and OPS), then a
second created and published on 2026-09-28 (on OJS once with "Don't
Assign To An Issue", once keeping the issue). Before, one version read
"Published 2024-03-01" ("Posted 2024-03-03"); with both published the
line read "Published 2024-03-01 — Updated on 2026-09-28" and "Versions"
listed "2026-09-28 (Version of Record 1.1)" and "2024-03-01 (Version of
Record 1.0)" ("Author Original …" on the server), the first version's
own address answering 200 under the older-version notice. The first
version was then unpublished, on OJS by the issue's "Table of Contents"
› "Remove" (answered `status:true`) and by its own "Unpublish", on OPS
by "Unpost" (200 each; the version's controls then read "Preview",
"Publish" ("Post")). The unpublished publication kept its
`datePublished` (the versions spec's Rule 9) and `firstPublication`
still picked it: the line read "Published 2024-03-01 — Updated on
2026-09-28" ("…2024-03-03…" for the article first published that day,
OPS "Posted 2024-03-03 — Updated on 2026-09-28") at once and after a reload, "Versions" listed only
"2026-09-28 (Version of Record 1.1)" ("Author Original 1.1"), and
`article/view/{id}/version/{v1}` (`preprint/view/{id}/version/{v1}`)
answered 404. No request failed.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-25 (Rules 8, 9, 21; A1; OPS7), OJS and OPS,
French opened through the language's own address: the "Versions" list
read "2026-09-24 (##publication.versionStage.display##)", the label line
"Prépublication / 2026-09-25 (##publication.versionStage.display##)"
(a press's book page the same key, the control). The labels turned
French on the journal and the article's French title, abstract and
keyword showed where the version had them; the preprint's keywords
label read "##preprint.subject## : francais". The role under each
contributor's name read "Author" on both apps' French pages; the role's
French name on the scratch journals was not checked, and the list is
*Contributors & affiliations*'.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-25 (Rule 11; Settings bullets 1–3; OPS4;
OJS9), OJS and OPS, signed out: "PDF" opened the PDF reader; "HTML"
opened the HTML reader on the journal and downloaded `preprint.html` on
the server, the browser staying on the preprint's page (also for the
French "/html-fr" galley pressed from the French page); an XML galley
opened the journal's page laid out by Lens ("Abstract", "Main Text",
"Introduction", "Contents", "Info"), its script failing as it loaded
("Cannot read properties of undefined (reading 'Queue')"), and
downloaded `article.xml` on the server; `notes.md` / `not-an-image.txt`
downloaded with the browser on the article's page; the remote galley
landed on its remote address. With "PDF.JS PDF Viewer", "HTML Article
Galley" or "eLife Lens Article Viewer" unticked, its galley downloaded.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-25 (Rule 12; A2), OJS and OPS, an article
with a PDF and (journal) an HTML galley in both versions, the second
version's title ending " second": the older version's readers showed
"This is an outdated version published on 2026-09-25. Read the most
recent version." ("September 25, 2026" in the HTML reader); the arrow
and the title opened the article's unversioned page; the PDF reader's
title was the older version's, the HTML reader's the current one's with
the older version's file in its frame. The older PDF reader showed "0 of
0" in an empty viewer with no message (the viewer's file request
answered "not found", twice per visit) and its "Download" got no file.
With the galley's URL Path "pdf" kept into the new version, the older
reader showed the document; after "Change File" on the new version's
galley it showed the replacement file; with the copy's URL Path changed
and a new galley "New" given "pdf" and a file of its own, it showed
nothing again (two runs per app).

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-25 (Rule 13; OPS3), OJS and OPS, signed
out: a PDF galley with URL Path "pdf" typed at its number address
forwarded to `…/pdf` on the journal and answered "404 Not Found" on the
server; "/nosuchgalley" answered "404 Not Found" on both; after "pdf"
was changed to "pdfnew" on a new version, `…/pdf` opened the article's
page on both, and so did an older galley's number without a version
part.

<a id="fn-h"></a>
**h** — "How to Cite": `plugins/generic/citationStyleLanguage/CitationStyleLanguagePlugin.php`
(OJS and OPS copies identical outside the vendored CSL data): `register()`
hooks `ArticleHandler::view` and `PreprintHandler::view` to
`getTemplateData()`, and `Templates::Article::Details` to
`addCitationMarkup()`, which appends `templates/citation-block.blade` at
the end of the OJS side column; OPS prints its own copy inline in
`preprint_details.tpl` (`{if $citation}`). Styles: `getCitationStyles()`
defaults with APA `isPrimary`, titles `plugins.generic.citationStyleLanguage.style.*`
("ABNT", "ACM", "ACS", "AMA", "APA", "Chicago", "Harvard", "IEEE", "MLA",
"Turabian", "Vancouver"); downloads `getCitationDownloads()` ("Endnote/Zotero/Mendeley
(RIS)", "BibTeX"). Headings `submission.howToCite` "How to Cite",
`submission.howToCite.citationFormats` "More Citation Formats",
`submission.howToCite.downloadCitation` "Download Citation". The format
links carry `data-json-href`; `js/articleCitation.js` fetches it and
replaces `#citationOutput`, restoring the old citation silently when the
fetch fails. `getCitation()` builds title, `container-title` (journal
name), `container-title-short` (abbreviation, else acronym), volume and
issue, section, pages, article number, authors, URL, DOI, `issued` (the
shown version's date) and `original-date` (the first version's, set only
when its `datePublished` differs from the shown version's, so two
versions of one day never print it). On a preprint server
`getTemplateData()` reads `$issue` and `$chapter`, which only the journal
and press branches set, and the compiled citation template reads
`container-title-short`, which a preprint's citation data lacks: each
rendering logs PHP warnings ("Undefined variable $issue", "Undefined
variable $chapter", "Undefined property: stdClass::$container-title-short"),
with no effect on the page (test run 2026-09-25, the OPS server log).
`downloadCitation()` names the file `urlencode(substr(title, 0, 60))` plus
the format's extension; `templates/citation-styles/ris.blade` formats
its dates with strftime patterns (`'%Y/%m/%d'`) through
`Carbon::format()`, which prints the "%" (A8). The "Citation Style
Language" plugin is off on a new context (seed facts, all three apps,
2026-09-23).
Live-probed 2026-09-25 (Fields, "How to Cite"; Rules 15, 15a, 15b), OJS
and OPS: off on a new context there was no block; on, the APA citation
of the shown version under "How to Cite". "More Citation Formats"
toggled a list of the eleven formats, with "Download Citation",
"Endnote/Zotero/Mendeley (RIS)" and "BibTeX" under them; each format
replaced the citation in place with one request, the address unchanged
and the list closing; a reload showed APA again. The citations carried
the title, the contributors, the name, the issue "1(1)" and pages
"12-34" (journal), the date and the address as Rule 15 says; the
downloads came as files named after the first 60 characters of the title
with "+" for spaces, starting "TY  - JOUR" and "@article{…". An older
version's citation named its own title and "September 1, 2026" where
the current one's read "September 25, 2026". OMP control: the same list
on a book page. Test run 2026-09-25 (Rule 15), OJS and OPS: with both
versions published the same day, the current version's "APA" citation
read "Author, A. (2026). Tidal Patterns Revised. {journal}, 1(1).
{address}" ("… In {server name}. {address}" on the server), with no
"(Original work published …)".

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-25 (Rules 15, 15c; A7; A8; OJS1), OJS and
OPS, with the plugin on: on an article in a published issue and a posted
preprint, "MLA" replaced the citation and a reload restored APA;
"BibTeX" downloaded a ".bib" named after the title. "ABNT" printed a
preprint's title and the server's name back to back and the date "24
Sept.2026" on both apps; the RIS file's "PY" and "Y2" lines read
"%2026/%09/%01" and "%2026/%09/%25". On a journal article published with
no issue, and on one published with "Assign To Future Issue and Publish
Immediately": signed out, a format left the citation unchanged and a
download opened a blank page; as the Reader, the Author and an
unassigned Section Editor, the citation stayed and the downloads showed
"404 Not Found"; as the Journal Manager, an assigned Section Editor and
an assigned Copyeditor, both worked. On the preprint server every role
got every format and download (OMP control: a published book's "MLA"
and "BibTeX" worked signed out).

<a id="fn-i"></a>
**i** — Settings window: `CitationStyleLanguageSettingsForm.php` with
`templates/settings.tpl`; labels `plugins.generic.citationStyleLanguage.settings.citationFormatsPrimary`
"Primary Citation Format" and its description, `…citationFormats`
"Additional Citation Formats", `…citationDownloads` "Downloadable
Formats", `…publisherLocation` "Publisher Location"; `execute()` stores
the four settings and posts `common.changesSaved` "Your changes have been
saved."; the row's "Settings" (`manager.plugins.settings`) comes from
`getActions()` only while the plugin is enabled. With no
`primaryCitationStyle` stored the form checks no radio and
`getPrimaryStyleName()` falls back to APA. Who reaches Settings › Website:
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access).
Live-probed 2026-09-25 (Fields, the settings window; Rule 16; Side
effects; Settings bullets 4, 5), OJS and OPS, with a press as the
control: the row's arrow and "Settings" showed only while the plugin was
ticked; the window, titled "Citation Style Language", opened with no
primary format chosen, all eleven additional formats and both download
formats ticked and "Publisher Location" empty, its buttons "Cancel" and
"OK". "OK" closed it with "Your changes have been saved."; "Cancel"
after changes to all four fields stored nothing and asked nothing; the
window's "Close" after a change asked "The data on this form has
changed. Do you wish to continue without saving?", leaving the page
asked "Leave site?", and the window reopened unchanged. Ticking the
plugin showed "The plugin "Citation Style Language" has been enabled."
(also on the press); unticking asked "Are you sure you want to disable
this plugin?" and then showed "…has been disabled."; ticked again, the
window and the block came back with IEEE, one format and "London, U.K."
as left. The press's window reads "…on your book landing page.".

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-25 (Rule 16; A9), OJS and OPS: "IEEE"
chosen, every additional format but "MLA" and the "BibTeX" box unticked,
"London, U.K." typed, "OK": every published article showed IEEE first at
once, the list offered "MLA" alone and "Download Citation" "Endnote/Zotero/Mendeley
(RIS)" alone. "London, U.K." appeared in no on-screen format of a journal
article, and in "ABNT", "ACS", "Chicago", "Harvard", "IEEE", "Turabian"
and "Vancouver" for a preprint ("… London, U.K., Sept. 24 …" in IEEE);
the "BibTeX" file carried `place={London, U.K.}` on both, the RIS file
nothing. Both download formats unticked: "Download Citation" left with
its label. Every additional format unticked: "More Citation Formats"
still showed, both downloads were in the page, and pressing it twice
left the list closed.

<a id="fn-l"></a>
**l** — Chart: `article_details.tpl` / `preprint_details.tpl` print the
section when `$activeTheme->getOption('displayStats') != 'none'`,
calling `ThemePlugin::displayUsageStatsGraph()`; heading
`plugins.themes.default.displayStats.downloads` "Downloads", hidden text
`…displayStats.noStats` "Download data is not yet available.", removed by
`lib/pkp/js/usage-stats-chart.js` on `usageStatsChartLoaded.pkp` whatever
the data. `UsageEvent` fires in `view()` for the page and in
`download()` for a galley's own file.
Live-probed 2026-09-25 (Rule 17; Side effects; Settings bullet 6; A3),
all three apps: "Usage statistics display options" offered the three
choices, "Do not display…" ticked on a new context; bar and line each
added a section headed "Downloads" after the abstract with that chart,
nothing plotted over the current year's months, and the sentence was
gone once the chart drew; "Do not display…" again removed the section.
Each page opening wrote one usage event and each PDF reader opening and
"Download" one file event to the install's usage log; nothing processed
them, the chart stayed empty and the server's home read "Downloads: 0".

<a id="fn-m"></a>
**m** — References: OJS `{if count($parsedCitations) || (string)
$publication->getData('citationsRaw')}`; OPS drops the `(string)` cast and
tests the value `PublicationDAO::fromRow()` sets, an object that is always
true, hence the empty heading ([Citations & references](U42-citations-and-references.md),
its A20). Each citation prints `Citation::getRawCitationWithLinks()`,
whose pattern links an address up to the next space or bracket and trims
only a trailing "." or "," (A10), and calls
`Templates::Article::Details::Reference`
(`Templates::Preprint::Details::Reference`), where the Crossref plugin adds
reference DOIs (*DOIs*). The citations spec's Rule 27 describes the same
block with its own probes; the block's rules live here from this spec on.
Live-probed 2026-09-25 (Rule 18; A10), OJS and OPS: five references
showed under "References" in the main column, one paragraph each, in
list order, as typed ("Smith & Jones (2020). Values < 5 and > 3
matter."); each https or ftp address was a link opening a new tab, a
trailing "." or "," outside it, and "(ftp://files.example.org/ridge/data.csv)"
linked with its ")". A context with the References box unticked on its
Metadata settings still showed an article's references. An article with
none showed no heading on the journal and an empty "References" heading
on the server.

<a id="fn-k"></a>
**k** — Publication Facts Label: `plugins/generic/pflPlugin/PflPlugin.php`
(OJS only), `displayArticlePfl()` on `Templates::Article::Details`, left
out when `$section->getMetaReviewed()` is false (the section form's
`manager.sections.submissionReview` "Will not be peer-reviewed", stored
inverted; the seed sets `metaReviewed` true) or when the setting
`dateStart` is after the article's `dateSubmitted`; `templates/pfl.tpl`
mounts `<publication-facts-label>` and fetches labels from
`pfl/locale/{locale}.json` (`en.json`: "Publication Facts", "Peer
reviewers", "Data availability", "External funding", "Competing
interests", "Articles accepted", "Days to publication", "Indexed in",
"Editorial team list", "Society", "Publisher"). On this build the
plugin's hooks use two constants it does not import (`STATUS_PUBLISHED`,
`STYLE_SEQUENCE_LAST`), so both fail on every article page (OJS5).
Settings: `PflSettingsForm.php` with `templates/settings.tpl`; DOAJ,
Latindex and MEDLINE are checked by outbound requests on the online
ISSN, `academicSocietyUrl` by `FormValidatorUrl`, `scopusUrl` against
`^https://www.scopus.com/sourceid/[0-9]+$`, `wosUrl` against
`^https://mjl.clarivate.com`, `dateStart` by `strtotime()`; the warning
block shows when `PluginRegistry::getPlugin('generic', 'FundingPlugin')`
is absent or disabled.
Live-probed 2026-09-25 (Fields, the settings window; Settings bullet 7;
OJS2), OJS: the plugin row showed "Settings" only while ticked; the
window, titled "Publication Facts Label plugin", opened every time with
"Funding Plugin Not Present" and "The Funding plugin is not present and
enabled. In order for funding data to be presented by the Publication
Facts Label, this plugin will need to be installed and enabled, and
provided with the relevant data for each submission. Check the Plugin
Gallery for this plugin.", then "Journal Information", "Exclude by
Date", "Journal's Index Listings", "Automated Listing of Indexes in the
PFL" and "Manual Listing of Indexes in the PFL"; its buttons "Cancel"
and "OK", its "Close" after a change asking the same question as the
citation window. "Will not be peer-reviewed" was unticked on a new
journal's "Articles". The Plugin Gallery could not be searched: its list
answers a server error on the test installs.

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-25 (Rule 19; OJS3; OJS5), OJS: with the
plugin on, no article page showed the panel, signed out or as the
Reader, after a full valid save, with "Start Date" 2099-01-01 or
2020-01-01, with "Will not be peer-reviewed" ticked or unticked, and on
the French page, which fetched no label file either. Each page answered
normally; the server log recorded the plugin failing in both its hooks.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-25 (Fields, the settings window; OJS7;
OJS8), OJS: "not a url" and "http://nodot" in the society "URL" were
refused in the window with "Please enter a valid URL." and no save was
sent; a valid name and address saved and came back. "Start Date" took
"2099-01-01" and "2020-01-01" typed key by key; "notadate" left the box
empty; "2026-99-99" stayed in the box, "OK" showed "Your changes have
been saved." and the box was empty on reopening. Ticking "Directory of
Open Access Journals", "Latindex" or "MEDLINE" was refused with the
"could not be verified" notice, with and without an online ISSN
("0378-5955", saved on Settings › Journal › "Masthead", which refuses
"Save" until "Country" is chosen), the three together in one notice;
"Google Scholar" alone saved. "https://example.org/x" in the Scopus
"URL" and "https://example.org/y" in the Web of Science one were refused
with their messages, in a notice and in the window;
"https://www.scopus.com/sourceid/12345" and
"https://mjl.clarivate.com/search-results?issn=0378-5955" saved. After
each refusal the window showed the saved values: the stored Scopus
address in place of the typed one, "Directory of Open Access Journals"
unticked again. "Cancel" after a change stored nothing.

<a id="fn-n"></a>
**n** — Recommendations: `plugins/generic/recommendByAuthor/RecommendByAuthorPlugin.php::callbackTemplateArticlePageFooter()`
on `Templates::Article::Footer::PageFooter` builds a paginator over
`APP\search\SubmissionSearchResult::newCollection()`, whose items carry
`submission`, `currentPublication`, `context`, `section`, `issue`;
`templates/articleFooter.tpl` reads `publishedSubmission` and `journal`,
keys the collection has not carried since the search rebuild (OJS4). Ten a
page (`RECOMMEND_BY_AUTHOR_PLUGIN_COUNT`), heading
`plugins.generic.recommendByAuthor.heading` "Most read articles by the
same author(s)". `plugins/generic/recommendBySimilarity/RecommendBySimilarityPlugin.php::buildTemplate()`
searches the article's keywords (`Repo::controlledVocab()->getBySymbolic()`)
through the submission collector's `searchPhrase()`, ten a page, heading
"Similar Articles", `…advancedSearchIntro` "You may also
{$advancedSearchLink} for this article." with `…advancedSearch` "start an
advanced similarity search". It joins the keyword entries into the
phrase without taking their names, and its query keeps only articles
outside a published issue, so an article in a published issue is never a
candidate (OJS10). The search index is filled by queued jobs, which the
test installs run only on demand (seed facts; [Search](U15-search.md)).
Live-probed 2026-09-25 (Rule 20; Fields, "Recommendations"): neither
list appeared on any page, so where the lists sit under the article
rests on the hook's name; note q14.

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-25 (Rule 20; Settings bullets 8, 9; OJS4;
OJS10), OJS: with "Recommend Articles by Author" on, the pages of two
articles by the same contributor, of an article whose contributor has
ten others and of an article whose contributor has none all opened
normally, signed out, as the Reader and as the Journal Manager, with no
"Most read articles by the same author(s)"; the server log recorded
"Call to a member function getCurrentPublication() on null" for each
page whose contributor has another article, nothing for the other; with
the plugin off the page opened the same. With "Recommend Similar
Articles" on, an article whose two keywords twelve other published
articles share showed no "Similar Articles", before and after the queued
jobs ran, signed out and as the Reader; nothing was logged. On a new
journal both plugins were listed unticked; ticking each showed "The
plugin "…" has been enabled.", with no "Settings" on their rows.

<a id="fn-j"></a>
**j** — Summary: OJS `templates/frontend/objects/article_summary.tpl`,
included by `issue_toc.tpl`, `latest_article.tpl` (the home page,
`indexJournal.tpl`), `catalogCategory.tpl` (`hideGalleys=true`) and
`search.tpl` (`showDatePublished=true hideGalleys=true`); OPS
`templates/frontend/objects/preprint_summary.tpl`, included by
`indexServer.tpl`, `preprints.tpl`, `sections.tpl`, `catalogCategory.tpl`
and `search.tpl` (the last two `hideGalleys=true`). Author line: shown
when the section's `hideAuthor` is off and the publication's
`hideAuthor` is the default, or the publication forces it; the
per-publication switch has no control on any form. The section's box
is read by the issue's table of contents only. The main-galley filter
runs only where `primaryGenreIds` is assigned, which
`IssueHandler::setupIssueTemplate()` does, for the issue's page and for
the home page, `IndexHandler` calling it while the home page shows the
current issue; "Latest Publications" on the same page inherits it (A4).
"Latest Publications" reads `Submission\Collector::filterByLatestPublished()`
(OJS `classes/submission/Collector.php`), which keeps only current
publications whose `issue_id` is null or whose issue is unpublished
(the appearance spec's Rule 13 and OJS3). OPS DOI line: a
loop over `$pubIdPlugins` for type `doi`; DOIs are no `pubIds` plugin,
and OPS ships no `plugins/pubIds` at all (OPS6). OPS details:
`publication.galley.downloads` "Downloads: {$downloads}",
`submission.dates` "Submitted {$submitted} - Posted {$published}",
`submission.numberOfVersions` "Versions: {$numberOfVersions}". Section
option `manager.sections.hideTocAuthor` "Omit author names for section
items from issues' table of contents.".
Live-probed 2026-09-25 (Fields, the article summary; Rule 22; Settings
bullet 10; OPS6; OPS9), OJS and OPS, signed out, as the Reader and as
the Journal Manager: summaries on the journal's issue table of contents,
"Current Issue", "Latest Publications", category page and search
results, and on the server's "Latest preprints", "Archives" (the main
menu's "Archives", headed "Archives"), section and category pages and
search results. The cover and the title (with "Alpha subtitle") linked
to the article's address and opened it when pressed; the author line
read "Ann Author (Author)"; "12-34" under an article with pages (OJS);
the preprint's keywords "kfive", "alpha", only the current version's;
"Downloads: 0 - Submitted 2026-09-25 - Posted 2026-09-25", then " -
Versions: 2" for a preprint with two versions; the date "2026-09-25" on
the journal's search results only; no galleys on search and category
pages; no DOI line on any preprint summary although the preprint's page
showed "DOI:". On the server's home and "Archives" lists the keyword row
lay across the middle of the cover, where a press opened nothing, while
the top and the bottom opened the preprint (two runs). "Omit author
names…" was unticked on the seeded "Articles" and "Reviews" and on a new
section; ticked and saved, it removed the author line from the issue's
table of contents and "Current Issue" only. A preprint server's section
form has no such box. Test run 2026-09-25 (Rule 22), OJS: with both of a
journal's articles published in its current, published issue and
"Latest Publications" chosen in the theme, the home page showed the
categories and "Current Issue", listing both articles, and no "Latest
Publications" section.

<a id="fn-p"></a>
**p** — Open peer review: `ArticleHandler::view()` builds an
`OpenReviewComponent` and passes its locale keys, icons, constants and
`openReviewConfig` to the page, but no OJS template mounts the
open-review display, so the page never calls the `peerReviews` API.
"Publicly Show Reviewer Comments" is the review assignment's public
visibility; the journal's default comes from its review settings.
Live-probed 2026-09-28 (Rule 23; OJS12), OJS, two runs, on a scratch
journal whose review type is "Open" and whose public visibility
default is off: two articles in review, each with one submitted Open
review whose "For author and editor" comment carried a unique text. On
the first the Journal Manager ticked the box in the reviewer row's
"More Actions" › "Edit" (saved 200, ticked on reopen), then "Read
Review" › "Mark as Complete": the dialog read "Mark this review as
complete? This review will be made publicly visible alongside the
article. You can still modify this review after marking it as
complete. You will have the opportunity to thank the reviewer in the
next step.", `…/reviewAssignments/{id}/consider` answered 200 and the
row read "Complete". On the second the box stayed unticked and the
dialog lacked the "publicly visible" sentence. Both were accepted and
published with no issue (200). Each page, read signed out (also after a
reload), as the journal's Reader and as the Journal Manager, read the
title, the author, "Abstract", "Published 2026-09-28", "Versions
2026-09-28 (Version of Record 1.0)" and "Section Articles", nothing
else; neither review's text was in the page, its source or the
journal's home page, and the page made no `/peerReviews` request. The
source carries only the display's locale strings ("Full Review", "Cite
this peer review report:", "Read Review", "Hide Review"). Controls: a
posted preprint's page showed no review words and the server's workflow
has no review stage; a press's book page seeded with a completed public
Open review showed none either (the *Monograph landing page*'s
surface). No request failed.

<a id="fn-o"></a>
**o** — Plugin defaults: `settings.xml` with `enabled` true in
`plugins/generic/pdfJsViewer`, `htmlArticleGalley` and `lensGalley`,
installed for each new context; `citationStyleLanguage`, `pflPlugin`,
`recommendByAuthor` and `recommendBySimilarity` declare none and stay off.
OPS's `plugins/generic` holds `pdfJsViewer` and `citationStyleLanguage`
and none of the other five. Display names: `plugins.generic.pdfJsViewer.name`
"PDF.JS PDF Viewer", `…htmlArticleGalley.displayName` "HTML Article
Galley", `…lensGalley.displayName` "eLife Lens Article Viewer",
`…citationStyleLanguage.displayName` "Citation Style Language",
`…pfl.displayName` "Publication Facts Label plugin",
`…recommendByAuthor.displayName` "Recommend Articles by Author",
`…recommendBySimilarity.displayName` "Recommend Similar Articles".
Live-probed 2026-09-25 (Settings bullets 1–4, 7–9): the defaults held on
a new journal and server, note q16.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-25 (Settings bullets 1–4, 7–9; OPS4), OJS
and OPS, a new scratch journal and server, Settings › Website ›
"Plugins" › "Installed Plugins", "Generic Plugins": the journal listed
"PDF.JS PDF Viewer", "HTML Article Galley" and "eLife Lens Article
Viewer" ticked, "Citation Style Language", "Publication Facts Label
plugin", "Recommend Articles by Author" and "Recommend Similar Articles"
unticked; the server "PDF.JS PDF Viewer" ticked, "Citation Style
Language" unticked and none of the other five. Unticking asked "Are you
sure you want to disable this plugin?" and showed "The plugin "…" has
been disabled."; a PDF galley then downloaded. A press (the control)
lists "PDF.js PDF Viewer" and "HTML Monograph File" and none of the
three journal-only rows.

<a id="fn-s"></a>
**s** — Scenario seeding. The seeded journal and server
(`publicknowledge`) carry no published item (seed facts), so every
scenario publishes its own articles through `POST scenarios/submission`
(`published: true`, submitter the context's author); galleys come from
`galleys[]` (`{label, file}`, `{label, urlRemote}`, with `locale`,
`urlPath` and `genre` where a scenario names them), the display values
from the version keys (`subtitle`, `plainLanguageSummary`, `keywords`,
`categories`, `coverImage` with the fixture `profile-image-400.png`,
OJS `articleNumber`, `urlPath`) and the references from `citationsRaw`.
Fixtures: `article.pdf`, `article.html`, `article.xml`, `notes.md` on
OJS; `preprint.pdf`, `preprint.html`, `not-an-image.txt` on OPS. In the
scenarios {journal address} is the context's address, {number} the
submission's id and {today} the day of the run, written as the pages
write it. Scenarios 1 and 4 run on `publicknowledge`: scenario 1 signed
out, submitter `author.alex`, its first article with OJS `section:
'ART'`, `issue: {volume: 1, number: 2, year: 2014}` and `categories: ['eng']`
(the leaf path; the seed refuses the full path), its second with no `issue` (an article in no
issue); scenario 4 with the ready accounts `manager.maya`, `author.alex`
(the submitter) and `reader.rosa`, passwords as users.md gives them, the
unpublished article carried to Production by OJS `decisions:
['sendExternalReview', 'accept', 'sendToProduction']` (a submitted
preprint already sits there) and the scheduled one by `published: true`
with `issue: {volume: 2, number: 1, year: 2015}` (seed facts). The
others run on their own scratch context from `POST scenarios/context`,
with throwaway `users[]` (password: the username twice): `manager` and
`author` everywhere, `reader` in scenario 5; OJS contexts that need a
published issue seed `issues: [{volume: 1, number: 1, year: 2026,
published: true}]` and publish into it with `issue`. Per scenario:
scenario 2 at the context's defaults; scenario 3 with `plugins:
{citationstylelanguageplugin: {enabled: true}}`, its second version
made on screen as `manager`, since no key makes one ("Create New
Version", the title changed on "Title & Abstract", then "Publish":
[Publish, schedule & versions](U49-publish-schedule-and-versions.md),
scenarios 4 and 5); scenario 5 with `context.enabled: false` for the
first context and `restrictSiteAccess: true` ("Users must be
registered…") for the second; scenario 6 with `context.name` "Coastal
Review" ("Coastal Preprints") and the same `plugins` entry, the
visitor's steps read against the mail catcher (Mailpit,
`http://127.0.0.1:8025`) scoped by the context's addresses; scenario 7
with `plugins: {pdfjsviewerplugin: {enabled: false}}` and `themeOptions:
{displayStats: 'bar'}`; scenario 8 with `context.supportedLocales` and
`supportedSubmissionLocales` `['en', 'fr_CA']`, the title, abstract and
`keywords` as locale maps and the "HTML" galley at `locale: 'fr_CA'`
(a `/fr_CA/` address switches the session to French, seed facts, so the
English page is read first and the control opens `/en/` again);
scenario 9 (OJS) with `categories: [{path: 'oceans', title: 'Oceans'}]`,
the issue's `coverImage`, and `themeOptions: {journalContentOrganization:
[1, 2, 3]}` (the categories, "Latest Publications" and "Current
Issue"); scenario 10 (OPS) with the same `categories`. Scenarios 9
(OJS) and 10 (OPS) run in each app's serial project: a category page
lists what the search index holds, which only the queued jobs the test
runs fill. "Omit author
names…", a contributor's Bio Statement (after "Country" is picked), the
URN "Assign", the public JATS XML and the Crossmark box are set on
screen; the upload and the seed refuse "Image" and "HTML Stylesheet"
galleys, and no key sets a version's DOI. Live-probed 2026-09-25: the
seeded journal's home page showed "Current Issue" and no "Latest
Publications"; a scratch journal seeded with the option showed the
categories, "Latest Publications" and "Current Issue". "Latest
Publications" is absent while no article sits outside a published issue,
so scenario 9's home page, whose two articles are in the issue, has
none (note j).

<a id="fn-f-a1"></a>
**f-a1** — Note g: `publication.versionStage.display` and the version
stage keys are missing from `lib/pkp/locale/fr_CA`. First seen 2026-09-24
in passing during the appearance spec's claim check (a press's book page
also labels its date "##catalog.published##", the monograph page's
business); live-probed 2026-09-25 on both apps and the press (note q5),
the date printed "2026-09-24" in French as in English.
Issue report: [pkp-e2e#228](https://github.com/jardakotesovec/pkp-e2e/issues/228) ([docs/issues/U13-A1-french-version-name-raw-key.md](../issues/U13-A1-french-version-name-raw-key.md)).

<a id="fn-f-a2"></a>
**f-a2** — `PdfJsViewerPlugin::submissionCallback()` builds `pdfUrl` from
`[$submission->getBestId(), $galley->getBestGalleyId(), $galley->getFile()->getId()]`
with no `version` part; `ArticleHandler::initialize()` (and OPS's) then
looks the galley up in the current publication, finds it in an older
published one only, and redirects to the unversioned `download` op with
no galley, which answers `NotFoundHttpException`; pdf.js then logs
"MissingPDFException" in the page. The reader's "Download" link carries
the same address with a `download` attribute, so the browser saves
nothing and stays. A copied galley with the same URL Path resolves in
the current publication instead, and serves the file the copy shares
with the published galley ([Galleys](U46-galleys.md), its A4: "Change
File" on the new version's galley changes the published version's
file). The HTML and Lens readers build versioned addresses. Live-probed
2026-09-25, note q9 (two runs on the journal, one on the server).
Issue report: [pkp-e2e#219](https://github.com/jardakotesovec/pkp-e2e/issues/219) ([docs/issues/U13-A2-older-version-pdf-reader-empty.md](../issues/U13-A2-older-version-pdf-reader-empty.md)).

<a id="fn-f-a3"></a>
**f-a3** — Note l: `usage-stats-chart.js` removes the sentence as soon
as a chart is drawn, data or none. Live-probed 2026-09-25 (note l),
all three apps, as first seen 2026-09-24 during the appearance spec's
claim check: an empty chart and no sentence.

<a id="fn-f-a4"></a>
**f-a4** — Note j: the summaries skip non-main galleys only when
`primaryGenreIds` is set (the issue's table of contents, and a journal's
home page while it shows the current issue); elsewhere every galley of
the current publication is linked, one with no file too, whose
`download` finds no `submissionFileId` and answers
`NotFoundHttpException`. Live-probed 2026-09-25, note q7.
Issue report: [pkp-e2e#235](https://github.com/jardakotesovec/pkp-e2e/issues/235) ([docs/issues/U13-A4-listing-offers-galley-without-file.md](../issues/U13-A4-listing-offers-galley-without-file.md)).

<a id="fn-f-a5"></a>
**f-a5** — Note f: the notice's link is always
`dashboard/editorial?workflowSubmissionId={id}`, which the Author's role
may not open; the Author landed on
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`.
Live-probed 2026-09-25, note q3, both apps.
Issue report: [pkp-e2e#222](https://github.com/jardakotesovec/pkp-e2e/issues/222) ([docs/issues/U13-A5-author-view-submission-access-denied.md](../issues/U13-A5-author-view-submission-access-denied.md)).

<a id="fn-f-a6"></a>
**f-a6** — `article.tpl` / `preprint.tpl` pass
`getCurrentPublication()->getLocalizedFullTitle()` to the header as the
page title, whichever publication the page shows. Live-probed
2026-09-25, note q4, both apps.
Issue report: [pkp-e2e#226](https://github.com/jardakotesovec/pkp-e2e/issues/226) ([docs/issues/U13-A6-older-version-tab-current-title.md](../issues/U13-A6-older-version-tab-current-title.md)).

<a id="fn-f-a7"></a>
**f-a7** — The "ABNT" answer for a preprint reads
`<b>{title}</b><b>{server name}</b>, 24 Sept.2026`; the journal's ABNT
citation has the same "Sept.2026". Both come from the vendored CSL style
and its locale. Live-probed 2026-09-25, note q11.
Issue report: [pkp-e2e#241](https://github.com/jardakotesovec/pkp-e2e/issues/241) ([docs/issues/U13-A7-abnt-citation-runs-text-together.md](../issues/U13-A7-abnt-citation-runs-text-together.md)).

<a id="fn-f-a8"></a>
**f-a8** — Note h: `ris.blade`'s `PY` and `Y2` lines (the version's
date and the day of access) pass strftime patterns to
`Carbon::format()`. Live-probed 2026-09-25, note q11, both apps.
The same mistake, a `strftime()` pattern handed to Carbon, sits in
templates of plugins only OJS ships, each registered where its screen
is: the MARC field 008 of the OAI-PMH records
([OAI-PMH, A15](U19-oai-pmh.md#a15)) and the announcement feeds' Atom
and RSS 1.0 dates ([Announcements, A15](U12-announcements.md#a15)), both
seen on screen; and the COUNTER report's `Created` attribute
(`reportxml.tpl`, `sushixml.tpl`; code, not driven). Read 2026-10-01
for the issue report.
Issue report: [pkp-e2e#244](https://github.com/jardakotesovec/pkp-e2e/issues/244) ([docs/issues/U13-A8-ris-download-dates-percent-signs.md](../issues/U13-A8-ris-download-dates-percent-signs.md)).

<a id="fn-f-a9"></a>
**f-a9** — With no format ticked, the list holds only the downloads and
the button's toggle does not open it (`aria-expanded` stays "false").
Live-probed 2026-09-25, note q12, both apps.
Issue report: [pkp-e2e#246](https://github.com/jardakotesovec/pkp-e2e/issues/246) ([docs/issues/U13-A9-more-citation-formats-opens-nothing.md](../issues/U13-A9-more-citation-formats-opens-nothing.md)).

<a id="fn-f-a10"></a>
**f-a10** — Note m: the link pattern stops at spaces and square or
angle brackets, not at a parenthesis. Live-probed 2026-09-25, note m,
both apps.
Issue report: [pkp-e2e#243](https://github.com/jardakotesovec/pkp-e2e/issues/243) ([docs/issues/U13-A10-reference-link-takes-closing-parenthesis.md](../issues/U13-A10-reference-link-takes-closing-parenthesis.md)).

<a id="fn-f-a11"></a>
**f-a11** — Note c: `PKP\publication\DAO::fromRow()` reads the keyword
entries (with the subjects, disciplines and supporting agencies) with
no `orderBy`; the `seq` that `controlledVocab\Repository::insertBySymbolic()`
writes 1, 2, … is never read. The order returned follows the query plan
(a hash on the entries gives the reverse of the rows' order on disk, a
hash on the vocabularies the disk order) and the rows' place on disk.
Every publication save (`DAO::update()` → `saveControlledVocab()`),
publishing and scheduling included, deletes the entries and writes them
again in the order just read. Seen on OPS test runs 2026-09-25 (twice)
and 2026-09-26 (scenarios 1 and 10): keywords seeded "tide", "current"
read "Keywords: current, tide"; in the OJS test database on 2026-09-26
the same seed's keywords were stored "current" first after the seed's
publish on four runs, in the typed order on later ones. Probed
2026-09-26, OJS and OPS: moving one keyword's row on disk turned
scenario 1's line to "current, tide" on four runs of four; four plain
"Save"s on Publication › Metadata kept "alpha, beta, gamma".
Issue report: [pkp-e2e#247](https://github.com/jardakotesovec/pkp-e2e/issues/247) ([docs/issues/U13-A11-keywords-order-not-kept.md](../issues/U13-A11-keywords-order-not-kept.md)).

<a id="fn-f-a12"></a>
**f-a12** — Note g: `firstPublication` is the earliest `datePublished`
among all of the submission's publications, whatever their status, and
an unpublish keeps the date (the versions spec's Rule 9); the same pick
is behind the versions spec's A6. Live-probed 2026-09-28, note g, OJS
and OPS, two runs.

<a id="fn-f-a13"></a>
**f-a13** — Note d: `PdfJsViewerPlugin` (identical in OJS and OPS)
decides the outdated notice from `isLatestPublication` alone, with no
test for a preview; a new, unpublished version is never the current one
while an older version is published, so its preview's reader gets the
notice, dated with the version's own empty `datePublished`. OJS's HTML
reader (`htmlArticleGalley`) decides the same way (code, not driven).
Walked 2026-10-01 on PKP's default test data, `main` and 3.5, from the
first galley link of a preview: OPS's PDF reader, for a new version made
with "Create New Version", read "This is an outdated version published
on . Read the most recent version."; OJS's, for the unpublished version
1.1 that the test data ships with a date of its own, read that date.
Left out of the fix in OPS1's issue report:
[pkp-e2e#209](https://github.com/jardakotesovec/pkp-e2e/issues/209) ([docs/issues/U13-OPS1-new-version-preview-called-outdated.md](../issues/U13-OPS1-new-version-preview-called-outdated.md)).

<a id="fn-f-a14"></a>
**f-a14** — Note h: `citation-styles/associacao-brasileira-de-normas-tecnicas.csl`
was replaced whole in May 2026 (`pkp/citationStyleLanguage#165`, on
3.5 `#164`), which refreshed every style from the CSL styles
repository's `v1.0.1` branch and took that repository's file of the same
name, a different style (NBR 6023:2002). The plugin had shipped the
"Universidade de São Paulo - Escola de Comunicações e Artes - ABNT"
style (NBR 6023:2018), chosen in `pkp/citationStyleLanguage#73`; its
3.4 branch still ships it. Walked 2026-10-01 on PKP's default test
data, OJS and OPS `main` and 3.5: a preprint's "ABNT" read "KWANTES,
C.; KEKKONEN, U. The Facets Of Job Satisfaction: … Disponível em:
{address}. Acesso em: 1 oct. 2026", a journal article's "KARBASIZAED,
V. Antimicrobial, heavy metal resistance … Journal of Public
Knowledge, v. 1, n. 2, 30 Sept.2026.". The earlier file's output rests
on the plugin's history and was not walked. Raised for the team in A7's
issue report:
[pkp-e2e#241](https://github.com/jardakotesovec/pkp-e2e/issues/241) ([docs/issues/U13-A7-abnt-citation-runs-text-together.md](../issues/U13-A7-abnt-citation-runs-text-together.md)).

<a id="fn-f-ojs1"></a>
**f-ojs1** — `CitationStyleLanguagePlugin::getTemplateData()` passes
`issueId` only when `ArticleHandler` has an issue;
`pages/CitationStyleLanguageHandler::isUnpublished()` counts an OJS
article as unpublished when no issue is passed or the issue is not
published, and `canUserAccess()` then admits managers, site
administrators and assigned sub-editors or assistants only. A signed-in
reader's `get` and `download` requests answer `NotFoundHttpException`;
a signed-out visitor's fail with a server error, the log reading
`TypeError` `CitationStyleLanguageHandler::canUserAccess(): Argument #2
($userRoles) must be of type array, null given`. `articleCitation.js`
swallows the failed fetch. On OPS a posted preprint's formats and
downloads work for every role. Live-probed 2026-09-25, note q11.
Issue report: [pkp-e2e#205](https://github.com/jardakotesovec/pkp-e2e/issues/205) ([docs/issues/U13-OJS1-citation-formats-fail-outside-published-issue.md](../issues/U13-OJS1-citation-formats-fail-outside-published-issue.md)).

<a id="fn-f-ojs2"></a>
**f-ojs2** — `PflSettingsForm::fetch()` assigns `fundingPluginPresent`
from `PluginRegistry::getPlugin('generic', 'FundingPlugin')`; no such
plugin ships (funders are core metadata, [Funding](U43-funding.md)), so
`templates/settings.tpl` always prints
`plugins.generic.pflPlugin.fundingPluginMissing` and its description,
while `displayArticlePfl()` reads the context's `funders` setting.
Live-probed 2026-09-25 (note k): the warning on every opening; the
Plugin Gallery could not be searched on the test installs.
Issue report: [pkp-e2e#225](https://github.com/jardakotesovec/pkp-e2e/issues/225) ([docs/issues/U13-OJS2-publication-facts-settings-funding-warning.md](../issues/U13-OJS2-publication-facts-settings-funding-warning.md)).

<a id="fn-f-ojs3"></a>
**f-ojs3** — `templates/pfl.tpl` fetches `pfl/locale/` + `Locale::getLocale()`
+ `.json`; the folder holds `fr.json` and no `fr_CA.json`, and the fetch's
failure only logs "PFL: failed to load translations" to the console.
Live-probed 2026-09-25 (note q13): the French page showed no panel and
fetched no label file, the same as the English page. Walked 2026-10-01
on PKP's default test data, OJS 3.5 and `main` with OJS5's fix applied:
the English page showed the panel and the French (Canada) page none.
The folder holds 18 label files, and 60 of the 78 languages OJS ships
have none of their own: `fr_CA` and `es_MX`, whose labels sit under the
base language (`fr`, `es`), which the fetch never tries, and 58 more
with no labels at all (code).
Issue report: [pkp-e2e#236](https://github.com/jardakotesovec/pkp-e2e/issues/236) ([docs/issues/U13-OJS3-publication-facts-panel-missing-without-label-file.md](../issues/U13-OJS3-publication-facts-panel-missing-without-label-file.md)).

<a id="fn-f-ojs4"></a>
**f-ojs4** — Note n. The search results' shape changed with pkp-lib's
Laravel Scout rebuild (pkp/pkp-lib#8920, merged 2025-08-01), which
removed the `publishedSubmission` / `journal` keys the plugin's template
still reads; `$submission->getCurrentPublication()` on a null fails in
`articleFooter.tpl`. The app catches the error inside the hook, logs
"Plugin …RecommendByAuthorPlugin failed to handle the hook
Templates::Article::Footer::PageFooter" and serves the page without the
list. Live-probed 2026-09-25, note q14.
Issue report: [pkp-e2e#208](https://github.com/jardakotesovec/pkp-e2e/issues/208) ([docs/issues/U13-OJS4-recommend-by-author-list-never-shown.md](../issues/U13-OJS4-recommend-by-author-list-never-shown.md)).

<a id="fn-f-ojs5"></a>
**f-ojs5** — Note k: `Undefined constant
"APP\plugins\generic\pflPlugin\STATUS_PUBLISHED"` (`PflPlugin.php`, in
the side-column hook `Templates::Article::Details`) and `Undefined
constant "…\STYLE_SEQUENCE_LAST"` (in the `TemplateManager::display`
hook), each caught and logged as "Plugin …PflPlugin failed to handle the
hook …" on every article page, which still answers normally.
Live-probed 2026-09-25, notes q6 and q13.
Issue report: [pkp-e2e#211](https://github.com/jardakotesovec/pkp-e2e/issues/211) ([docs/issues/U13-OJS5-publication-facts-panel-never-shown.md](../issues/U13-OJS5-publication-facts-panel-never-shown.md)).

<a id="fn-f-ojs6"></a>
**f-ojs6** — Note d: `display.tpl` picks `issue.return` whenever the page
has an issue, though its link is the article's `parentUrl`. Live-probed
2026-09-25 (note d), two runs.
Issue report: [pkp-e2e#239](https://github.com/jardakotesovec/pkp-e2e/issues/239) ([docs/issues/U13-OJS6-pdf-reader-return-arrow-names-issue.md](../issues/U13-OJS6-pdf-reader-return-arrow-names-issue.md)).

<a id="fn-f-ojs7"></a>
**f-ojs7** — Live-probed 2026-09-25, note q15: after a refused "OK" the
window reloaded its fields from the saved settings.
Issue report: [pkp-e2e#227](https://github.com/jardakotesovec/pkp-e2e/issues/227) ([docs/issues/U13-OJS7-publication-facts-settings-refused-save-resets.md](../issues/U13-OJS7-publication-facts-settings-refused-save-resets.md)).

<a id="fn-f-ojs8"></a>
**f-ojs8** — The date picker writes a hidden field that the form
stores, filled only as keys are typed; with "2026-99-99" the save
stored an empty start date and no refusal from the `strtotime()` check
(note k) appeared. Live-probed 2026-09-25, note q15.
Issue report: [pkp-e2e#230](https://github.com/jardakotesovec/pkp-e2e/issues/230) ([docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md](../issues/U13-OJS8-impossible-typed-date-saved-wrong.md)).

<a id="fn-f-ojs9"></a>
**f-ojs9** — Note e: `lensGalley`'s `display.tpl` loads MathJax 3.2.2,
while `lib/lens/lens.js` calls the MathJax 2 interface
`MathJax.Hub.Queue`; the page logs "Cannot read properties of undefined
(reading 'Queue')" on every XML galley. The test fixture has no formula,
so the typesetting loss follows from the code. Live-probed 2026-09-25,
note q8, two runs.
Issue report: [pkp-e2e#221](https://github.com/jardakotesovec/pkp-e2e/issues/221) ([docs/issues/U13-OJS9-lens-formulas-not-typeset.md](../issues/U13-OJS9-lens-formulas-not-typeset.md)).

<a id="fn-f-ojs10"></a>
**f-ojs10** — Note n: the search phrase is built from the keyword
entries without their names ("Array Array"), and the query filters to
articles outside a published issue; nothing is logged.
Live-probed 2026-09-25, note q14.
Issue report: [pkp-e2e#215](https://github.com/jardakotesovec/pkp-e2e/issues/215) ([docs/issues/U13-OJS10-similar-articles-list-never-shown.md](../issues/U13-OJS10-similar-articles-list-never-shown.md)).

<a id="fn-f-ojs11"></a>
**f-ojs11** — Note h: CSL numbers each IEEE entry in a
`csl-left-margin` block, which the theme's and the plugin's styles hide
("Hide the bibliography number produced by some CSL styles"). OJS's
`citation-block.blade` prints the primary citation through
`ViewHelper::sanitizeHtml()`, which drops that wrapper, so "[1]" shows as
text; OPS's `preprint_details.tpl` prints `{$citation}` as it is, and the
format chosen from the list is inserted with its wrapper on both. Other
numbered formats would carry the same number; only IEEE was read. Test
run 2026-09-25, OJS: the primary citation read "[1]A. Author, “Tidal
Patterns in Coastal Waters”, Coastal Review, vol. 1, no. 1, Sept. 2026,
Accessed: Sept. 25, 2026. Available: {address}" where the chosen IEEE
citation had read the same without "[1]"; a separate drive the same
day read "[1]" before the journal's primary IEEE citation and
none before the preprint server's.

<a id="fn-f-ojs12"></a>
**f-ojs12** — Note p: the open-review display is prepared but never
mounted on the article page. Live-probed 2026-09-28, note p, OJS, two
runs, with an unticked review as the control.
Issue report: [pkp-e2e#218](https://github.com/jardakotesovec/pkp-e2e/issues/218) ([docs/issues/U13-OJS12-public-review-never-shown.md](../issues/U13-OJS12-public-review-never-shown.md)).

<a id="fn-f-ojs13"></a>
**f-ojs13** — Note n: pkp-lib 4155f5be39 (`pkp/pkp-lib#13106` for
`pkp/pkp-lib#13080`, 2026-07-30, the editorial search's relevance) made
the submission collector's `searchPhrase()` require every word of the
phrase; before, any one word matched (`pkp/pkp-lib#8710`, which moved
this plugin onto the collector with an "OR" search to bring more
results). 3.5's collector ORs the words and orders by the number
matched (code). Walked 2026-10-01 on PKP's default test data, OJS
`main` with OJS10's fix applied: under article 1 ("Professional
Development", "Social Transformation"), article 5 with both keywords was
listed and article 15 with only "Social Transformation" was not. Left
out of the fix in OJS10's issue report:
[pkp-e2e#215](https://github.com/jardakotesovec/pkp-e2e/issues/215) ([docs/issues/U13-OJS10-similar-articles-list-never-shown.md](../issues/U13-OJS10-similar-articles-list-never-shown.md)).

<a id="fn-f-ops1"></a>
**f-ops1** — Note f: `preprint_details.tpl` shows the outdated notice
whenever the shown publication is not the current one, previews
included; the date it names is the day of the preview, the unpublished
version having no publication date of its own. Live-probed 2026-09-25,
note q3.
Issue report: [pkp-e2e#209](https://github.com/jardakotesovec/pkp-e2e/issues/209) ([docs/issues/U13-OPS1-new-version-preview-called-outdated.md](../issues/U13-OPS1-new-version-preview-called-outdated.md)).

<a id="fn-f-ops2"></a>
**f-ops2** — Note f: `PreprintHandler::initialize()` overwrites the first
remaining argument (the galley or "version") with the URL Path; and
`PreprintHandler::view()` redirects a galley with no reader to
`download` with `$preprint->getId()`, the number, so every such download
passes through the broken redirect and ends at a `download` with no
galley. Live-probed 2026-09-25 (note q2): on the URL-Path preprint the
HTML link went from `…/view/probe-path/{galley}` to
`…/download/{number}/{galley}` to `…/download/probe-path`, "404 Not
Found", while the PDF opened its reader.
Issue report: [pkp-e2e#203](https://github.com/jardakotesovec/pkp-e2e/issues/203) ([docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md](../issues/U13-OPS2-OPS3-ops-number-address-url-path.md)).

<a id="fn-f-ops3"></a>
**f-ops3** — Note f: OJS's `elseif (ctype_digit($galleyId) && $galley->getId() == $galleyId)`
redirect has no OPS counterpart. Live-probed 2026-09-25, note q10.
Issue report: [pkp-e2e#203](https://github.com/jardakotesovec/pkp-e2e/issues/203) ([docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md](../issues/U13-OPS2-OPS3-ops-number-address-url-path.md)).

<a id="fn-f-ops4"></a>
**f-ops4** — Note o: OPS ships neither plugin; its HTML galleys take the
download path of note e. Live-probed 2026-09-25, notes q8 and q16.

<a id="fn-f-ops5"></a>
**f-ops5** — Note d: OPS's locale files (app and lib/pkp) have neither
`article.return` nor `issue.return`, so the screen-reader text renders as
the key in `##` marks. Live-probed 2026-09-25 (note d), also on the
French page.
Issue report: [pkp-e2e#240](https://github.com/jardakotesovec/pkp-e2e/issues/240) ([docs/issues/U13-OPS5-preprint-pdf-reader-return-arrow-raw-key.md](../issues/U13-OPS5-preprint-pdf-reader-return-arrow-raw-key.md)).

<a id="fn-f-ops6"></a>
**f-ops6** — Note j. The landing page's own "DOI:" line reads the
publication's DOI object instead and is unaffected. Live-probed
2026-09-25, note j.
Issue report: [pkp-e2e#212](https://github.com/jardakotesovec/pkp-e2e/issues/212) ([docs/issues/U13-OPS6-preprint-summary-doi-never-shown.md](../issues/U13-OPS6-preprint-summary-doi-never-shown.md)).

<a id="fn-f-ops7"></a>
**f-ops7** — Note c: `preprint.subject` has an empty translation in
OPS's `locale/fr_CA/locale.po`. Live-probed 2026-09-25, note q5.
Issue report: [pkp-e2e#207](https://github.com/jardakotesovec/pkp-e2e/issues/207) ([docs/issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md](../issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md)).

<a id="fn-f-ops8"></a>
**f-ops8** — Note d: `article.pageTitle` is absent from OPS's French
locale. Live-probed 2026-09-25, note d.
Issue report: [pkp-e2e#207](https://github.com/jardakotesovec/pkp-e2e/issues/207) ([docs/issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md](../issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md)).

<a id="fn-f-ops9"></a>
**f-ops9** — Note j: the element at the cover's centre is the keyword
list laid over it. Live-probed 2026-09-25, note j, two runs. Both
default themes float the summary's cover beside its text block, which
has `position: relative` and so is painted over the cover in every row
it fills (OPS `preprint_summary.less`, OJS `article_summary.less` and
`issue_toc.less`); from tablet width the cover floats beside the text.
Walked 2026-10-01 on PKP's default test data, OJS and OPS `main` and
3.5, 1280 × 900, a 400 × 400 px cover shown 200 px tall: on the server's
"Archives" only the top 40 px and the bottom 62 px of the cover's middle
opened the preprint, the rest of the band (beside the author line, the
keywords and the details line) opened nothing; on the journal's current
issue page the author line's row, 25 px, opened nothing and the cover's
middle opened the article. A press's catalog has no such band.
Issue report: [pkp-e2e#216](https://github.com/jardakotesovec/pkp-e2e/issues/216) ([docs/issues/U13-OPS9-preprint-summary-cover-middle-dead.md](../issues/U13-OPS9-preprint-summary-cover-middle-dead.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Article summary in listings (OJS): cover, title, authors, pages, date, galley links | issue table of contents, home "Latest Publications", category and search pages | AFFR-046 |
| Preprint summary in listings (OPS): cover, title, authors, DOI line, keywords, details line, galley links | server home "Latest preprints", "Archives", section, category and search pages | AFFR-081 |
| Galley link (label, language, versioned address; a journal's subscription marks per *Subscriptions & open access control*) | landing page side column; listings | AFFR-047 |
| PDF reader page | a PDF galley's link | AFFR-048 · PLUG-022 |
| HTML reader page {OJS} | an HTML galley's link | AFFR-049 · PLUG-017 |
| Lens XML reader {OJS} | an XML galley's link | AFFR-050 · PLUG-020 |
| Preview and older-version notices | an unpublished version's "Preview"; an older version's address | AFFR-052 |
| Contributors on the page (rules in *Contributors & affiliations*) | landing page main column | AFFR-053 |
| "DOI:" line | landing page main column | AFFR-054 |
| "Keywords:", "Abstract", "Plain Language Summary" | landing page main column | AFFR-055 |
| "Downloads" chart (statistics semantics in *Statistics — usage*) | landing page main column, with a chart chosen | AFFR-056 |
| "References" block | landing page main column | AFFR-057 |
| Galley lists: main galleys and additional files | landing page side column | AFFR-059 |
| "Published" line and "Versions" list | landing page side column | AFFR-061 |
| "Issue", "Section", "Categories", "Article Number", issue cover {OJS} | landing page side column | AFFR-062 |
| "How to Cite" block, formats and downloads; its settings window | landing page; Settings › Website › "Plugins" | AFFR-066 · PLUG-008 |
| Publication Facts panel and its settings window {OJS} | landing page side column; Settings › Website › "Plugins" | AFFR-067 · PLUG-023 |
| "Most read articles by the same author(s)", "Similar Articles" {OJS} | under the article | AFFR-068 · PLUG-025 · PLUG-026 |
| Preprint page top matter: label line, "Categories", inline "How to Cite" {OPS} (the relation notice cited from *Preprint relations*) | preprint page | AFFR-082 |
| Article page and galley access: view, download, and the legacy file and supplementary-file addresses that forward to download {OJS} | article addresses | ROUTE-033 |
| Preprint page and galley access: view, download {OPS} | preprint addresses | ROUTE-080 |

## Reference — code anchors

- OJS `pages/article/ArticleHandler.php` (`initialize()`, `view()`, `download()`, `viewFile()`, `downloadSuppFile()`, `userCanViewGalley()`) · OPS `pages/preprint/PreprintHandler.php` (`initialize()`, `view()`, `download()`, `userCanViewGalley()`)
- OJS `classes/security/authorization/OjsJournalMustPublishPolicy.php` · OPS `classes/security/authorization/OpsServerMustPublishPolicy.php` · `lib/pkp/classes/submission/Repository.php::canPreview()`
- OJS `templates/frontend/pages/article.tpl`, `templates/frontend/objects/article_details.tpl`, `article_summary.tpl`, `galley_link.tpl`, `latest_article.tpl`, `templates/frontend/components/breadcrumbs_article.tpl`
- OPS `templates/frontend/pages/preprint.tpl`, `templates/frontend/objects/preprint_details.tpl`, `preprint_summary.tpl`, `galley_link.tpl`, `templates/frontend/components/breadcrumbs_preprint.tpl`
- `lib/pkp/classes/galley/Galley.php` (`getBestGalleyId()`, `getGalleyLabel()`, `isPdfGalley()`) · `lib/pkp/classes/submission/GenreDAO.php` (`getPrimaryByContextId()`, `getBySupplementaryAndContextId()`) · `registry/genres.xml`
- `lib/pkp/classes/publication/Repository.php::getVersionString()` · `lib/pkp/classes/publication/helpers/PublicationVersionInfo.php` · `lib/pkp/classes/publication/DAO.php::fromRow()`
- `lib/pkp/classes/plugins/ThemePlugin.php::displayUsageStatsGraph()` · `lib/pkp/js/usage-stats-chart.js`
- `lib/pkp/classes/services/PKPFileService.php::download()`
- `plugins/generic/pdfJsViewer/` (`PdfJsViewerPlugin.php`, `templates/display.tpl`) — OJS and OPS
- `plugins/generic/htmlArticleGalley/` (`HtmlArticleGalleyPlugin.php`, `classes/HtmlGalleyHelper.php`, `templates/display.tpl`) — OJS
- `plugins/generic/lensGalley/` (`LensGalleyPlugin.php`, `templates/articleGalley.tpl`, `display.tpl`) — OJS
- `plugins/generic/citationStyleLanguage/` (`CitationStyleLanguagePlugin.php`, `CitationStyleLanguageSettingsForm.php`, `pages/CitationStyleLanguageHandler.php`, `templates/citation-block.blade`, `templates/settings.tpl`, `js/articleCitation.js`) — OJS and OPS
- `plugins/generic/pflPlugin/` (`PflPlugin.php`, `PflSettingsForm.php`, `templates/pfl.tpl`, `templates/settings.tpl`, `pfl/locale/`) — OJS
- `plugins/generic/recommendByAuthor/` (`RecommendByAuthorPlugin.php`, `templates/articleFooter.tpl`) · `plugins/generic/recommendBySimilarity/` — OJS · `classes/search/SubmissionSearchResult.php` and `lib/pkp/classes/search/SubmissionSearchResult.php::newCollection()`
- `lib/pkp/classes/components/OpenReviewComponent.php` · `lib/pkp/api/v1/peerReviews/`: the article page prepares its configuration, but no template mounts the open-review display (Rule 23, OJS12; dead-code note in UNASSIGNED, API-030)
- Locale: OJS `locale/en/locale.po` (`article.subject`, `article.abstract`, `article.return`, `common.publication`, `submissions.published`, `issue.issue`, `section.section`, `submission.articleNumber`), OPS `locale/en/locale.po` (`preprint.subject`, `common.publication`, `submissions.published`, `category.categories`, `submission.dates`, `submission.numberOfVersions`, `publication.galley.downloads`, `publication.relation.*`), `lib/pkp/locale/en/{submission,common,reader}.po`, `plugins/themes/default/locale/en/locale.po`, each plugin's `locale/en/locale.po`
