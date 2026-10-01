---
name: monograph-landing-page
status: verified
---

# Monograph landing page {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every published book of a press has a public page of its own, the
**book's page**: the page a reader reaches from the catalog, a series or
category page, a search result, the home page's lists, a link someone
shared or the book's address typed by hand. It shows what the book is
(title, contributors, synopsis, keywords, dates and versions, series,
categories, references, how to cite it), its **table of contents** (the
chapters of the shown version), and the files readers get: each
publication format the press made available, as a link to a remote copy
or to its files. A free file opens in a view page of its own (a PDF in a
PDF viewer, an HTML file in an HTML page) or is meant to download
[A9](#a9); a file for sale leads a signed-in reader to the press's
payment page. A chapter whose "Chapter Page" box is
ticked gets a **chapter page** of its own, reached from the table of
contents. This spec describes the book's page, the chapter pages, their
addresses and versions, the two view pages, the purchase of a file up to
the payment page, and the "How to Cite" block and "Downloads" chart as a
press shows them. <sup>a</sup>

Several blocks on the page are described by the feature that fills them:
the contributors and their biographies
([Contributors & affiliations](U41-contributors-and-affiliations.md)),
the "License", copyright, "Data Availability Statement" and "Funding
Statement" blocks ([Publication metadata](U40-publication-metadata.md)),
"Funders" ([Funding](U43-funding.md)), the "DOI:" lines
([DOIs](U45-dois.md)), a format's URN
([Identifiers](U44-identifiers.md)), the "References" block's content
([Citations & references](U42-citations-and-references.md)), the images
of an HTML file ([Media files](U47-media-files.md)) and the page's
metadata for search engines
([Search engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)).
What a press builds for this page is built elsewhere: the formats, their
files and terms in
[Publication formats & proof terms](U73-publication-formats-proof-terms.md),
the chapter list in [Chapters & work type](U72-chapters-work-type.md), the
catalog entry (cover, series, categories, URL Path) in
[Catalog management](U70-catalog-management.md). The payment page itself
and the press's payment settings are
[Payments & APCs](U52-payments-and-apcs.md)'. <sup>a</sup>

A journal and a preprint server do not install the book's page. Their
published item's page is the article's (the preprint's) page of
[Article landing page & reading](U13-article-landing-page-and-reading.md),
which has galleys in place of publication formats, no table of contents
and no chapter pages. A journal that sells articles marks with its price
the galley links of an article published in an issue whose "Access
status" is "Subscription" ("Requires Subscription or Fee PDF (USD 5)",
[Subscriptions](U51-subscriptions.md)); a preprint server sells nothing.
On both, the journal's (server's) address followed by "catalog/book/"
and a number answers the "404 Not Found" page. <sup>b</sup> <sup>td1</sup>

## Actors & permissions

The pages are public: a **visitor** needs no account, and signing in, as
a Reader or in any other role, changes nothing in a published version's
pages. A press that requires visitors to sign in ("Users must be
registered and log in to view the press site.") or that the Site
Administrator has not enabled ("Enable this press to appear publicly on
the site") sends a signed-out visitor who opens any address of this spec
to the Login page ([Journal identity & about
pages](U07-journal-identity-and-about-pages.md), its Rule 22). "The
assistant roles" below are the press's Copyeditor, Designer, Funding
coordinator, Indexer, Layout Editor, Marketing and sales coordinator,
Proofreader and Editorial Board Member. <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Read a published book's page and its chapter pages** (the current version, or an older one at its own address) | • anyone, signed in or not (Rules 1–4) <sup>c</sup> |
| **Open an unpublished version's page** (the preview) | • the Press manager, Press editor, Production editor, Series editor and the assistant roles, whether or not they are assigned to the book, and the Site Administrator, under the preview notice, and its chapter pages too (Rule 5); the workflow's "Preview" opens it for those it is offered to ([Workflow screen & stage access](U24-workflow-screen-and-stage-access.md), its Rule 6)<br>• the book's Author, by typing the page's address<br>• anyone else gets the "404 Not Found" page (Rule 3): a visitor, a Reader, a Reviewer, and an Author, Volume editor, Chapter Author or Translator of the press who is not on the book<br>• a submission its author never finished answers "404 Not Found" to everyone, the Press manager, the Site Administrator and its own Author included <sup>c</sup> <sup>td5</sup> |
| **Open a free file** ("Open Access" terms) | • anyone who may read the page (Rule 13); today only an HTML file opens [A9](#a9)<br>• on a press with "Users must be registered and log in to view open access content." ticked (Settings bullet 6): signed-in users only; a visitor who presses a free file's link gets the Login page first, and once signed in there the file's view page <sup>j</sup> <sup>td13</sup> |
| **Buy a file for sale** ("Direct Sales" terms) | • a signed-in user, whatever the role (the press's own staff and the Site Administrator too), on a press whose payment method is set up and that has a currency (Rule 14)<br>• a visitor gets the Login page first, and once signed in there not the payment page but the press's home page (a Reader) or the Dashboard (a Press manager) [A18](#a18) <sup>k</sup> <sup>td14</sup> |
| **Receive the "Manual Payment Notification"** | • the press's principal contact, when a buyer presses "Send notification of payment" (Side effects) <sup>q</sup> |
| **Show the citation in another format; download a citation** | • anyone who may read the page, while the "Citation Style Language" plugin is on (Rule 19)<br>• on a preview, the Press manager, Press editor, Production editor, the Site Administrator and a Series editor or assistant role assigned to the book; for the book's Author, and for a Series editor or assistant role not assigned to it, another format changes nothing and a download opens the "404 Not Found" page ⚠ [A21](#a21) <sup>m</sup> <sup>td18</sup> |
| **Change the settings of "Settings that modify behavior"** | • whoever opens the Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)), on Settings › Website › "Plugins" ([Plugins management](U62-plugins-management.md#plugin-links)), "Appearance" and Settings › Distribution › "Payments"; "Enable this press to appear publicly on the site" the Site Administrator <sup>r</sup> |
| **Decide what the pages show** (formats, files and terms, chapters, catalog entry, contributors) | • the roles the building features name: [Publication formats & proof terms](U73-publication-formats-proof-terms.md), [Chapters & work type](U72-chapters-work-type.md), [Catalog management](U70-catalog-management.md), [Contributors & affiliations](U41-contributors-and-affiliations.md) |

## Fields & validation

The book's page, the chapter page and the payment page carry the press's
header and footer ([Navigation menus & site
chrome](U08-navigation-menus-and-site-chrome.md)) and, while blocks are
placed, the sidebar; the two view pages carry none of these, only their
own bar. The book's page and the chapter page have no trail ("Home / …")
above the title; the payment page has "Home / Manual Fee Payment". A part
appears only when the version has something to put in it (Rule 7),
except the "References" heading and the copyright line. <sup>d</sup>

<a id="book-page"></a>
**The book's page.** The browser tab reads "{title} | {press name}", or
"{title}: {subtitle} | {press name}" when the version has a subtitle, the
title being the current version's even on an older version's page
⚠ [A5](#a5). Two columns: the main column with the book's text, and
beside it a narrower column with the cover, the files and the details.
Top to bottom, the main column holds: <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Notices** | — | The preview notice (Rule 5), the older-version notice (Rule 6), or both, the preview notice first. |
| **Title**, **subtitle** | — | The shown version's title and subtitle as the page heading. <sup>d</sup> |
| **Contributors** | — | The contributor list described in [Contributors & affiliations](U41-contributors-and-affiliations.md), its Rule 14 (the compact line of five or more, [OMP1](U41-contributors-and-affiliations.md#omp1); an Edited Volume's volume editors, [OMP2](U41-contributors-and-affiliations.md#omp2)). |
| **"DOI:"** | — | The version's DOI, described in [DOIs](U45-dois.md), its Rule 43. |
| **"Keywords:"** | — | The version's keywords in the interface language, joined by commas, as plain text, in no fixed order ([→ Article landing page & reading, A11](U13-article-landing-page-and-reading.md#a11)). <sup>d</sup> |
| **"Synopsis"** | — | The version's abstract, as formatted in the editor. <sup>d</sup> |
| **"Plain Language Summary"** | — | The plain language summary, under its own heading. <sup>d</sup> |
| **Table of contents** | — | The chapters of Rule 10, with no visible heading (a screen reader reads "Chapters"). |
| **"Downloads"** | — | The chart of Rule 20, only when the theme is set to show one. |
| **"Author Biography"** / **"Author Biographies"** | — | Described in [Contributors & affiliations](U41-contributors-and-affiliations.md), its Rule 14. |
| **"References"** | — | The version's references, as on an article's page ([→ the "References" block](U13-article-landing-page-and-reading.md#references)); a book with no references shows the heading with nothing under it ([→ Citations & references, A20](U42-citations-and-references.md#a20)). |

The side column, top to bottom: <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Cover** | — | The small copy of the version's "Cover Image" ([Catalog management](U70-catalog-management.md), its Rule 13f), or the press's default book picture when it has none. Not a link; a screen reader hears the cover's "Alternate text". <sup>d</sup> <sup>td24</sup> |
| **Files** | — | The remote formats and the files of Rule 11, with no visible heading (a screen reader reads "Downloads"). |
| **"Published"** ("Forthcoming") | — | The date line of Rule 8. |
| **"Versions"** | — | The list of Rule 9. |
| **"Series"** | — | The series' name with its prefix, a link to the series' page ([Catalog browse](U68-catalog-browse.md), Rule 1); under it "Online ISSN" and "Print ISSN", each with the series' number, when set ([Sections](U17-sections.md#omp-series)). <sup>d</sup> |
| **"Categories"** | — | The version's categories, each a link to the category's page ([Categories](U16-categories.md)). <sup>d</sup> |
| **"Data Availability Statement"**, **"Funding Statement"** | — | Described in [Publication metadata](U40-publication-metadata.md), its Rule 15. |
| **Copyright line**, **"License"** | — | Described in [Publication metadata](U40-publication-metadata.md) ([OMP1](U40-publication-metadata.md#omp1), [OMP5](U40-publication-metadata.md#omp5)). |
| **Format details** | — | One block per approved, available format that has something to show (Rule 12); a plain file format gets none. |
| **"How to Cite"** | — | Rule 19, at the foot of the column. |

A version with funders also shows "Funders" in the side column
([Funding](U43-funding.md), its Rule 9).

<a id="chapter-page"></a>
**The chapter page.** Opened from a chapter's title in the table of
contents (Rule 15). The browser tab reads "{chapter title} | {press
name}", or "{chapter title}: {subtitle} | {press name}" when the chapter
has a subtitle ("Tides: Low and high | …"). Main column, top to bottom:
<sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Notice** | — | The older-version notice of Rule 18. |
| **Title**, **subtitle** | — | The chapter's title and subtitle as the page heading. <sup>e</sup> |
| **Chapter authors** | — | The chapter's authors, each shown as the book page's contributor list shows a contributor ([Contributors & affiliations](U41-contributors-and-affiliations.md), its Rule 14); an Edited Volume's chapter shows its own authors, never the volume editors. <sup>e</sup> |
| **"DOI:"** | — | The chapter's DOI as a link ([DOIs](U45-dois.md)). <sup>e</sup> |
| **"Synopsis"** | — | The chapter's own abstract, when it has one. <sup>e</sup> |
| **"Author Biography"** / **"Author Biographies"** | — | The chapter authors' Bio Statements, as on the book's page. <sup>e</sup> |

Side column, top to bottom: <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Cover** | — | The same cover picture as the book version's page, here a link to that page. <sup>e</sup> |
| **Files** | — | The chapter's files, as the book page's side column lists files (Rule 11); no remote format. <sup>e</sup> |
| **"Volume"** | — | The book version's title, a link to its book page. <sup>e</sup> |
| **"Pages"** | — | The chapter's "Pages", when set. <sup>e</sup> |
| **"Published"** ("Forthcoming") | — | The chapter's date line (Rule 16). |
| **"Versions"** | — | The chapter's list of Rule 17, only when the book has more than one published version. |
| **"Series"**, **"Categories"** | — | As on the book's page. <sup>e</sup> |
| **Copyright line**, **"License"** | — | The book version's copyright line; the chapter's own "License URL" when it has one ([Chapters & work type](U72-chapters-work-type.md), its Rule 12), the version's otherwise, as a Creative Commons badge for a known license or a link reading "License". <sup>e</sup> |
| **"How to Cite"** | — | The chapter's citation (Rule 19). |

<a id="pdf-view"></a>
**The PDF view page.** Opened from a free PDF file while "PDF.js PDF
Viewer" is on (Rule 13). The browser tab reads "{format name} view of the
file {file name}" ("PDF view of the file article.pdf"). A bar across the
top holds, left to right: <sup>f</sup> <sup>td22</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Return arrow** | — | An arrow with no visible text; a screen reader reads "Return to view details about {title}", the title of the file's version (an older version's own title on its file). Opens the book's current page. <sup>f</sup> |
| **File name** | — | The file's name, plain text. <sup>f</sup> |
| **"Download"** | — | Meant to download the PDF; a screen reader reads "Download Download PDF". Pressed today, the page stays as it is and the browser's download of a file named "{file number}.html" fails; the address opened on its own shows an empty error page [A9](#a9). <sup>f</sup> |

Under the bar the PDF viewer fills the page, with its own page, zoom,
search, print and download controls. On an older version's file an
outdated-version notice sits between the bar and the viewer (Rule 13a).
The viewer never shows the PDF today: under its toolbar (page count "of
0") a red bar reads "Unexpected server response." with "More
Information" and "Close", and the viewer's own "Download" saves nothing
[A9](#a9). <sup>f</sup>

<a id="html-view"></a>
**The HTML view page.** Opened from a free HTML file while "HTML
Monograph File" is on (Rule 13). The browser tab reads as the PDF view
page's ("HTML view of the file {file name}"). A bar across the top holds
only a return arrow, which opens the book's page and whose name for a
screen reader is a raw code, "##monograph.return##" ⚠ [A10](#a10), and
the title of the file's version as a link that opens the book's current
page; there is no "Download". Under the bar the HTML file fills the
page, with its images ([Media files](U47-media-files.md), its Rule 5);
on an older version's file the outdated-version notice (Rule 13a) sits
between them. <sup>f</sup>
<sup>td21</sup>

**The payment page.** A buyer's "Purchase" link leads to the payment page
of the press's method. With "Manual Fee Payment" it is headed "Manual
Fee Payment" and reads, top to bottom: the press's "Manual Payment
Instructions"; "Title" with the file's name and "Fee" with the file's
price and the press's currency code in brackets ("25.00 (USD)"), both
values in bold; then "Send notification of payment" as an underlined
link, not a button. A journal's page puts the instructions under
"Title" and "Fee" and shows the link as a button
([Payments & APCs](U52-payments-and-apcs.md#manual-page)). <sup>k</sup> <sup>td14</sup>

## Rules & state

**Reaching the page**

1. **What leads there.** The book summaries of the catalog, a series'
   page, "New Releases", a category's page and the home page's lists
   ([→ book summary](U68-catalog-browse.md#book-summary)); a search
   result ([Search](U15-search.md)); the Catalog page's "View Entry"
   ([Catalog management](U70-catalog-management.md)); the workflow
   header's "View" and "Preview" ([Workflow screen & stage
   access](U24-workflow-screen-and-stage-access.md), its Rule 6); and, on
   a chapter page, the cover and "Volume" (Rule 18). <sup>g</sup>
2. **The page's address.** The press's address followed by
   "catalog/book/" and the book's number, or its **URL Path** once one is
   saved on the "Catalog Entry" page ([Catalog
   management](U70-catalog-management.md)). With a URL Path saved, the
   press's own links use it, except a chapter page's cover and "Volume",
   which use the book's number; the number address still opens the same
   page without changing the address. An address with a URL Path the
   book used before is meant to forward to the current one; today it
   shows a server error page ⚠ [A16](#a16). <sup>g</sup> <sup>td2</sup>
3. **Nothing published, no page.** A book is published once a Version of
   Record of it is published. Until then its address answers the "404 Not
   Found" page to a visitor and to a Reader, and so does the address of
   any of its versions. A scheduled book answers the same until its date.
   A book whose only published version is an "Author Original" (a version
   added with "Create New Version" and the "Publication Stage" "Author
   Original (AO)") answers the same to a visitor and a Reader, as the
   catalog leaves it out
   too ([Catalog browse](U68-catalog-browse.md), its Rule 3), while the
   Press manager and the Site Administrator who type its address get its
   page with no preview notice ⚠ [A2](#a2). <sup>g</sup> <sup>td3</sup>
   - 3a. **An address that names no book.** A number or URL Path that no
     book of the press has sends a visitor to the Login page, and a
     signed-in user to an error page with no heading, its browser tab
     "| {press name}", reading "An invalid published submission was
     specified.". An unpublished book's address answers "404 Not Found"
     instead ⚠ [A1](#a1). <sup>g</sup> <sup>td4</sup>

**Versions**

4. **Which version the page shows.** The book's address shows the
   **current version**, the latest published one. Each older published
   version has an address of its own, reached from the "Versions" list
   (Rule 9): the book's address followed by "/version/" and an id the
   link carries, not the version's number. A version address that names
   an unpublished version of the book answers the "404 Not Found" page to
   a visitor; one whose id names no version of the book fails with a
   server error page ⚠ [A3](#a3). <sup>g</sup> <sup>td6</sup>
5. **The preview.** An unpublished version's page opens for those Actors
   row 2 names under the notice "This is a preview and has not been
   published. View submission". It looks as it will once published,
   except for its dates: a version with no date saved has no "Published"
   line and no "Versions" list; one with a date saved has the line
   ("Forthcoming" for a date after today, Rule 8) and a "Versions"
   heading listing only the book's published versions, none on a book
   never published. <sup>g</sup> <sup>td7</sup>
   - 5a. **"View submission".** It opens the book's workflow for those
     whose workflow offers "Preview". The book's Author gets the
     access-denied page instead, as on an article's preview
     ([→ Article landing page & reading, A5](U13-article-landing-page-and-reading.md#a5)),
     and a Series editor or assistant role not assigned to the book gets
     the Submissions page behind an "Error" window reading "The current
     role does not have access to this operation." with "OK".
   - 5b. **Chapter pages and new versions.** The unpublished book's
     chapter pages open for the same people, without the preview notice
     ⚠ [A17](#a17). A new version being prepared for a published book,
     opened at its version address, carries the older-version notice of
     Rule 6 under the preview notice, dated today ⚠ [A4](#a4).
6. **An older version's notice.** An older version's page opens with
   "This is an outdated version published on {date}. Read the most recent
   version.", the date being that version's own, in the press's short
   date format; "most recent version" opens the book's address. The page
   is headed with the older version's title, but the browser tab reads
   the current version's title [A5](#a5). <sup>g</sup> <sup>td8</sup>
7. **Empty parts are left out.** Every part of the page's tables appears
   only when the version has something to put in it, except the
   "References" heading and the copyright line. A book with a title, one
   contributor, an abstract and no chapter, format, series or category
   shows the title, the contributor, "Synopsis", the "References" heading
   with nothing under it, the cover (the default picture), "Published"
   and "Versions" and the copyright line "Copyright (c) {year} {press
   name}", and no other heading. <sup>d</sup> <sup>td24</sup>
8. **The date line.** Under "Published": the first version's page, its
   date; a later version's, "{first version's date} — Updated on {this
   version's date}", both in the press's long date format ([Appearance &
   theming](U10-appearance-and-theming.md), its Rule 31), such as "March
   5, 2024". A shown version dated after today, which only a preview
   shows, reads "Forthcoming" in place of "Published". <sup>h</sup>
   <sup>td9</sup>
   - 8a. **The first date.** It is the earliest date any version of the
     book carries, published or not, and a version with no date yet, such
     as one just made with "Create New Version", counts as today: while
     it exists, every version's line reads "{today} — Updated on {that
     version's date}"
     ([→ Publish, schedule & versions, A6](U49-publish-schedule-and-versions.md#a6)).
9. **The "Versions" list.** Every published version, the newest first,
   each as "{date} ({version name})" in the short date format:
   "2024-03-05 (Version of Record 1.0)". The list shows with a single
   version too. The version shown is plain text; the current version
   links to the book's address and each older one to its own address
   (Rule 4). A version not yet published, or unpublished since, is not
   listed. <sup>h</sup> <sup>td23</sup>

**Contents, formats and files**

10. **The table of contents.** The shown version's chapters, in the
    order they were added on its Chapters page ([Chapters & work
    type](U72-chapters-work-type.md)), each with: <sup>i</sup> <sup>td10</sup>
    - its title and subtitle, a link to its chapter page when the
      chapter has one (Rule 15), plain text otherwise; on an older
      version's page it opens that version's chapter page only where Rule
      15a allows [A19](#a19);
    - its authors' names, joined by commas. The line is meant to be left
      out when the chapter's authors are the book's, but it is shown for
      every chapter that has authors ⚠ [A6](#a6);
    - its DOI as "DOI: https://doi.org/…", a link ([DOIs](U45-dois.md));
    - the files of the chapter (a format file ticked in the chapter's
      "Files"), as links grouped by format in the order of the
      Publication Formats page, which moves a format to the end of its
      list when it is saved
      ([→ Publication formats & proof terms, A14](U73-publication-formats-proof-terms.md#a14)),
      each link as Rule 11 words it.
11. **The files and remote formats.** The side column lists the formats
    of the shown version that read "Available" ([Publication formats &
    proof terms](U73-publication-formats-proof-terms.md), its Side
    effects), in the order of the Publication Formats page (Rule 10):
    <sup>i</sup>
    - a remote format as a link reading the format's name, which opens
      its remote address in a new tab;
    - each file with "Open Access" or "Direct Sales" terms that no chapter
      holds, under its format. A file a chapter holds is listed under
      that chapter only (Rule 10). A file set "Not Available", or with no
      terms, is not listed, and a format with no listed file and no
      remote address shows nothing here.
    - 11a. **The link text.** A format with one listed file shows one
      link reading the format's name, such as "PDF". A "Direct Sales"
      file on a press with a currency reads "{price} Purchase {format}
      ({price} {currency code})", the price as typed in the file's terms:
      "25.00 Purchase PDF (25.00 USD)", the price twice ⚠ [A7](#a7). On a
      press with no currency it reads the format's name alone, like a
      free file
      ([→ Publication formats & proof terms, A9](U73-publication-formats-proof-terms.md#a9)).
    - 11b. **A format with several files.** The format's name, then for
      each file its name followed by a link reading the file's name
      again. The link never shows a price, so a file for sale there looks
      like a free one until it is pressed ⚠ [A8](#a8). <sup>td11</sup>
    - 11c. **The link address.** The press's address followed by
      "catalog/view/", the book's URL Path or number, the format's URL
      Path or number and the file's number; on an older version's page
      "version/" and the version's id follow the book's part.
12. **A format's details.** Each available format that also reads
    "Approved" gets a block in the side column, in format order, holding
    what the format has of: <sup>p</sup> <sup>td12</sup>
    - its name as a small heading, only when the version has more than
      one available format (a screen reader reads "Details about the
      available publication format: {format}", or "Details about this
      monograph" for a single format);
    - each identification code, its type's name with its code as the
      label ("ISBN-13 (15)") and the code under it;
    - each publication date, its role's name with its code as the label
      ("Publication date (01)") and the date under it, written
      2024-03-05; a date entered in the "Date Format" the date's window
      preselects, "YYYYMMDD (H)", adds "Hijri Calendar" under it;
    - its URN ([Identifiers](U44-identifiers.md), its
      [OMP2](U44-identifiers.md#omp2)) and its DOI as "DOI:" and a link
      ([DOIs](U45-dois.md), its Rule 43);
    - for a physical format, "Physical Dimensions" with its width, height
      and thickness joined by " x ", each with its unit.
    A format with none of these gets no block. A format that reads
    "Awaiting Approval" gets none, while its files and remote link are
    listed all the same (Rule 11).

**Opening and buying files**

13. **Opening a free file.** What a free file's link does depends on the
    file: <sup>j</sup> <sup>td13</sup>
    - a PDF opens the PDF view page (Fields) while "PDF.js PDF Viewer"
      is on (Settings bullet 1);
    - an HTML file opens the HTML view page (Fields) while "HTML
      Monograph File" is on (Settings bullet 2); off, the link shows a
      blank page ([→ Media files, OMP1](U47-media-files.md#omp1));
    - any other file, or a PDF with the viewer off, is meant to download
      under its file name.
    - 13a. **An older version's file.** Its view page carries the notice
      "This is an outdated version published on {date}. Read the most
      recent version.", the date written year-month-day ("2026-09-28"),
      whose link opens the book's current page.
    - 13b. **What opens today.** No book file can be read or saved: the
      PDF view page opens, but its viewer never shows the PDF and its
      "Download" saves nothing, and any link that downloads (an EPUB, a
      supplementary file, a PDF with the viewer off) opens a blank error
      page. Only an HTML file shows ⚠ [A9](#a9).
    - 13c. **Sign-in for free files.** On a press with "Users must be
      registered and log in to view open access content." ticked
      (Settings bullet 6), a visitor who presses a free file's link gets
      the Login page first, and once signed in there the file's view
      page.
14. **Buying a file for sale.** A "Direct Sales" file's link, on a press
    whose payment method is set up (Settings bullet 9): <sup>k</sup> <sup>td14</sup>
    - pressed by a visitor, leads to the Login page, which says nothing
      of the purchase (only "Required fields are marked with an
      asterisk: *" above the form). Once signed in there, the buyer does
      not reach the payment page: a Reader lands on the press's home
      page, a Press manager on the Dashboard's list headed "Assigned to
      me" ⚠ [A18](#a18);
    - pressed by a signed-in user, whatever the role (the press's own
      staff and the Site Administrator too), opens the payment page at
      once. With "Manual Fee Payment", "Send notification of payment"
      emails the press (Side effects) and shows "Payment Notification"
      with "Payment notification sent" and "Continue" ([Payments &
      APCs](U52-payments-and-apcs.md), its Rule 10); "Continue" leads
      back to the file's link, which opens the payment page again. A
      press has no list of payments.
      No screen records a manual payment, so a buyer who paid by hand
      never gets the file ⚠ [A11](#a11).
    - with "Paypal Fee Payment", the link opens that method's payment
      page ([Payments & APCs](U52-payments-and-apcs.md), its Rule 9); on
      a press with only its "Account Name" filled (no "Client ID" or
      "Secret"), a page with no heading reading "A transaction error
      occurred. Please contact the press manager for details.".
    - 14a. **Where the purchase stops.** On a press with no currency, or
      whose method is not set up (no "Manual Payment Instructions", no
      PayPal "Account Name"), a signed-in user who presses the link is
      sent to the catalog page with no message
      ([→ Publication formats & proof terms, A9](U73-publication-formats-proof-terms.md#a9)).
    - 14b. **"Enable" is not read.** Whether the press's "Payments" tab
      has "Enable" ticked changes nothing here: with it unticked and the
      currency and method kept, the file is still sold ⚠ [A12](#a12).
      <sup>td15</sup>

**Chapter pages**

15. **Which chapters get a page.** A chapter whose "Chapter Page" box is
    ticked, or that has a DOI ([Chapters & work
    type](U72-chapters-work-type.md), its Rule 10), has a page at the
    book's address followed by "/chapter/" and the chapter's number. The
    number stays the same in every version that carries the chapter.
    The address of a chapter without its page, or of a chapter the shown
    version does not carry, answers the "404 Not Found" page. <sup>l</sup>
    - 15a. **An older version's chapter page.** Its address is
      "…/version/{id}/chapter/{number}". It opens only on a press whose
      "DOI Versioning" reads "Yes" (Settings bullet 15); on any other
      press it shows a server error page ⚠ [A19](#a19).
16. **The chapter's date line.** Under "Published", on a book whose
    "Publication Dates" reads "Each chapter may have its own publication
    date." (Settings bullet 11), the chapter's own "Date Published" when
    it has one; otherwise the version's date. A later version of the
    chapter reads "{first date} — Updated on {this date}", the first date
    being the chapter's in the first version that carries it; with the
    chapters' own dates, a new version copies the chapter's "Date
    Published", so the line repeats that date ⚠ [A20](#a20). A chapter new
    in a later version reads that version's date alone. <sup>l</sup>
    - 16a. **"Forthcoming".** The heading reads "Forthcoming" when the
      version's date lies after today. The chapter page compares the two
      dates as written in the press's short date format, so under a
      day-first format ("d/m/Y") a chapter published on 31/12/2024 and
      read on 28/09/2026 is headed "Forthcoming", and a chapter of a book
      scheduled for 15/01/2027 is headed "Published" ⚠ [A13](#a13).
      <sup>td16</sup>
17. **The chapter's "Versions" list.** Shown only when the book has more
    than one published version: every published version, newest first,
    as on the book's page. A version that carries the chapter links to
    the chapter's page in that version (the shown one plain text; an
    older one's link, Rule 15a); the oldest of them, when older versions
    exist, adds " — Chapter created". A version without the chapter is
    plain text; after the chapter's creation it reads "{date} ({version
    name}) — Without this chapter". <sup>l</sup> <sup>td17</sup>
18. **The chapter page's links.** The cover and "Volume" open the book's
    page in the shown version. On an older version's chapter page (Rule
    15a) the notice "This is an outdated version published on {date}.
    Read the most recent version." leads to the chapter's current page
    when the current version carries the chapter, and to the book's page
    otherwise. <sup>l</sup>

**Around the page**

19. **"How to Cite".** While the "Citation Style Language" plugin is on
    (Settings bullet 3), the book's page and every chapter page end their
    side column with the "How to Cite" block, whose parts, formats,
    downloads and settings window are those of an article's page
    ([→ How to Cite](U13-article-landing-page-and-reading.md#how-to-cite),
    its Rules 15a, 15b and 16). <sup>m</sup> <sup>td18</sup>
    - 19a. **A book's citation.** On the book's page it cites the shown
      version as a book: its authors (a contributor whose role is "Volume
      editor" as an editor, one whose role is "Translator" as a
      translator), its title, its series position, which "APA" prints as
      "(Vols. 3)" ⚠ [A22](#a22) and "MLA" leaves out (the series' title
      reaches only the "BibTeX" and "RIS" files), the press as
      publisher, the version's date, and the book's DOI link or, without
      a DOI, its address. A book with no contributor (one a Press
      manager submitted without an entry for themselves) is cited from
      its title.
    - 19b. **A chapter's citation.** On a chapter page it cites the
      chapter: its authors, its title, "In" the book's contributors (on a
      Monograph its authors, left out when they are the chapter's own; on
      an Edited Volume its volume editors "(Ed.)" and translators
      "(Trans.)", then any contributor with the "Author" role), the
      book's title, its series position and the chapter's pages ("(Vols.
      3, pp. 1-20)"), the press, and the chapter's DOI link or, without
      a DOI, its address. On a later version the "APA" citation adds
      "(Original work published {year})", the book's first year, even for
      a chapter that version added ⚠ [A14](#a14).
20. **The "Downloads" chart.** While "Usage statistics display options"
    (Settings bullet 5) is on a chart, the book's page carries a section
    headed "Downloads" with a bar or a line chart of the book's
    downloads by month, as an article's page does
    ([Article landing page & reading](U13-article-landing-page-and-reading.md),
    its Rule 17, and its [A3](U13-article-landing-page-and-reading.md#a3)).
    A chapter page has no chart. <sup>n</sup> <sup>td19</sup>
    - 20a. **Months and files.** The chart shows the last twelve months.
      When the book has downloads from earlier months, a button "All
      time" under it widens the chart to every month from January of the
      first year with downloads, and then reads "Last 12 months".
      Downloads of a supplementary component's file, such as "Appendix",
      are not charted ([Usage statistics](U64-usage-statistics.md), its
      Rule 1).
21. **The pages in French.** With French as the interface language, raw
    codes stand in place of several labels ⚠ [A15](#a15): <sup>o</sup> <sup>td20</sup>
    - on the book's and the chapter's page: "Published"
      ("##catalog.published##"), "Forthcoming", "Categories", every
      "DOI:", "Online ISSN", "Print ISSN", "Plain Language Summary"
      ("##submission.plainLanguageSummary##"), the chart's "Downloads"
      ("##plugins.themes.default.displayStats.downloads##"), the format
      details' screen-reader heading
      ("##monograph.publicationFormatDetails##"), and the chapter page's
      "Volume" and "Pages";
    - in "Versions": each version's name, as "{date}
      (##publication.versionStage.display##)" with the date in the
      press's short format ("2026-09-28
      (##publication.versionStage.display##)"); on a chapter page, the
      chapter's first version adds "##submission.chapterCreated##" with
      no space, and a version without the chapter reads
      "##submission.withoutChapter##" alone, with no date or version
      name;
    - on a file's view page: the browser tab
      ("##catalog.viewableFile.title##") and the return arrow's name
      ("##catalog.viewableFile.return##");
    - a priced file's link reads "25.00 Achat (25.00 USD)", without the
      format's name.
    - 21a. **What is translated.** "Synopsis", "Versions", "Séries",
      "Mots-clés :" and the notices.

## Side effects

- **Usage statistics.** Each opening of a book's page counts as a view of
  the book, and each opening of a chapter page as a view of the chapter
  ([Usage statistics](U64-usage-statistics.md), its Rule 1). A file
  opened or downloaded is meant to count as a file view; today none is
  counted ([→ Usage statistics, OMP3](U64-usage-statistics.md#omp3)).
  <sup>q</sup>
- **"Manual Payment Notification"** (Rule 14). "Send notification of
  payment" emails the press's principal contact from the buyer's name and
  address, subject "Manual Payment Notification": "A manual payment needs
  to be processed for the press {press name} and the user {buyer's name}
  (username "{username}"). The item being paid for is "{file name}". The
  cost is {price} ({currency code}). This email was generated by the Open
  Monograph Press Manual Payment plugin." The price is written as typed
  in the file's terms ("The cost is 25 (USD)."), where the payment page
  shows "25.00 (USD)". Pressing it again sends it again. The email and
  its missing row in "Manage Emails" are [Payments &
  APCs](U52-payments-and-apcs.md)' (its Side effects). <sup>q</sup> <sup>td25</sup>
- **No other email, no notice.** Reading the pages, opening a file,
  reaching the payment page or downloading a citation sends no email and
  leaves no notice. <sup>q</sup>

## Settings that modify behavior

1. **"PDF.js PDF Viewer"** (Settings › Website › "Plugins" › "Installed
   Plugins", "Generic Plugins"). On for a new press: a free PDF opens the PDF view page (Rule
   13). Off: its link is meant to download the file; today it shows a
   blank error page [A9](#a9). <sup>r</sup>
2. **"HTML Monograph File"** (same list). On for a new press: a free HTML
   file opens the HTML view page. Off: its link shows a blank page (Rule
   13; [Media files](U47-media-files.md), its Settings bullet 6). <sup>r</sup>
3. **"Citation Style Language"** (same list). Off for a new press: no
   "How to Cite" block. On: the block of Rule 19 on the book's page and
   the chapter pages, and the plugin row's "Settings" ([Article landing
   page & reading](U13-article-landing-page-and-reading.md), its Settings
   bullet 4). <sup>r</sup>
4. **The "Citation Style Language" "Settings" window** (bullet 3's
   "Settings"). On a new press: no primary format chosen (APA shown),
   every additional format and both download formats ticked, no
   publisher location. Each field's effect: [Article landing page &
   reading](U13-article-landing-page-and-reading.md), its Rule 16. <sup>m</sup>
5. **"Usage statistics display options"** (Settings › Website ›
   "Appearance" › "Theme", [Appearance &
   theming](U10-appearance-and-theming.md), its Rule 9). "Do not display
   submission usage statistics chart for reader." on a new press: no
   chart. A bar or line choice: the "Downloads" section of Rule 20.
   <sup>n</sup>
6. **"Users must be registered and log in to view open access content."**
   (Settings › Users & Roles › "Site Access Options", under "View
   Monograph Content"; unticked). Ticked: a visitor who presses a free
   file's link gets the Login page first, and once signed in there the
   file's view page (Actors row 3; Rule 13c); the pages themselves stay
   open. <sup>j</sup> <sup>r</sup>
7. **"Users must be registered and log in to view the press site."**
   (same tab; unticked). Ticked: a visitor who opens any address of this
   spec gets the Login page (Actors; [Journal identity & about
   pages](U07-journal-identity-and-about-pages.md), its Rule 22). <sup>c</sup>
8. **"Enable this press to appear publicly on the site"** (Administration
   › Hosted Presses › the press's "Edit"; ticked on every press a test
   install creates). Unticked: a visitor gets the Login page (Actors).
   <sup>c</sup>
9. **"Currency" and "Payment Plugins"** (Settings › Distribution ›
   "Payments", [→ Payments tab](U52-payments-and-apcs.md#payments-tab);
   the tab shows these fields only while its "Enable" is ticked). A new
   press has no currency and "Manual Fee Payment" chosen without
   instructions. With a currency saved, a "Direct Sales" file's link
   shows its price (Rule 11a). With a currency and "Manual Payment
   Instructions" holding text, the link leads to the payment page; with
   "Paypal Fee Payment" and only its "Account Name", to a transaction
   error page (Rule 14). Without instructions or an "Account Name", a
   signed-in buyer is sent to the catalog page (Rule 14a). <sup>k</sup>
10. **"Enable"** (the same tab; unticked on a new press). Neither end
    changes these pages (Rule 14b) [A12](#a12). <sup>k</sup>
11. **"Publication Dates"** (per book: the editorial view's "Marketing" ›
    "Publication Dates", [Chapters & work
    type](U72-chapters-work-type.md), its Settings bullet 1). Neither
    option saved on a new book, which works as "All chapters will use
    the publication date of the monograph.": a chapter page shows the
    version's date. "Each chapter may have its own publication date.":
    the chapter's own date when it has one (Rule 16). <sup>l</sup>
12. **"Chapter Page"** (per chapter: its window's "Show this chapter on
    its own page and link to that page from the book's table of
    contents.", [Chapters & work type](U72-chapters-work-type.md), its
    Rule 10). Unticked on a new chapter: the title is plain text and the
    chapter has no page. Ticked, or the chapter has a DOI: the title
    links to its page (Rules 10, 15). On a chapter with a DOI the box
    stays enabled under "(This chapter will always be shown on its own
    page because it has a DOI.)"; unticked and saved, it reopens ticked
    and the chapter keeps its page and link. <sup>l</sup>
13. **"Date" and "Date (Short)"** (Settings › Website › "Setup" › "Date &
    Time", [Appearance & theming](U10-appearance-and-theming.md), its
    Rule 31). The long format writes the date lines (Rules 8, 16), the
    short one the "Versions" lists and the book page's notices (Rules 6,
    9); a day-first short format heads published chapters "Forthcoming"
    and scheduled ones "Published" [A13](#a13). <sup>h</sup>
14. **Settings other features describe.** The work type, whose Edited
    Volume credits its volume editors
    ([Contributors & affiliations](U41-contributors-and-affiliations.md#omp2));
    the DOI settings for monographs, chapters and publication formats
    ([DOIs](U45-dois.md)); the URN plugin
    ([Identifiers](U44-identifiers.md)); the press's and the version's
    license ([Publication metadata](U40-publication-metadata.md)) and the
    cover sizes ([Catalog management](U70-catalog-management.md)) each
    add, gate or shape a part of these pages; their rules are there. Two
    such settings change nothing here: a format's "Publisher ID" shows
    nowhere on these pages ([Identifiers](U44-identifiers.md), its Rule
    21), and a contributor with "Include this contributor when
    identifying authors in lists of publications." unticked is still
    credited on the book's page, while the catalog's listing leaves them
    out ([Contributors & affiliations](U41-contributors-and-affiliations.md),
    its Rule 8). <sup>d</sup>
15. **"DOI Versioning"** (Settings › Distribution › "DOIs" › "Setup",
    [DOIs](U45-dois.md), its Rules 11 and 12). "No" on a new press: an
    older version's chapter page shows a server error page [A19](#a19).
    "Yes": it opens (Rules 15a, 17, 18). <sup>l</sup>

## Cross-feature interactions

- [Publication formats & proof terms](U73-publication-formats-proof-terms.md):
  builds the formats, their files, terms, approval, availability and URL
  Paths this page lists (Rules 11, 12); its A9 is the priced file on a
  press with no payment method (Rules 11a, 14a), its A14 the format order
  that shifts when a format is saved (Rules 10, 11).
- [Chapters & work type](U72-chapters-work-type.md): the chapter list,
  "Chapter Page", chapter authors, files, dates and licenses the table of
  contents and the chapter pages show (Rules 10, 15–18).
- [Catalog management](U70-catalog-management.md) and
  [Catalog browse](U68-catalog-browse.md): the catalog entry (cover,
  series, categories, URL Path), "View Entry", and the book summaries
  that lead here (Rules 1, 2).
- [Payments & APCs](U52-payments-and-apcs.md): the "Payments" tab, the
  payment page, "Send notification of payment" and its email (Rule 14;
  Side effects).
- [Contributors & affiliations](U41-contributors-and-affiliations.md):
  the contributor list, the biographies and an Edited Volume's credits.
- [Publication metadata](U40-publication-metadata.md),
  [Funding](U43-funding.md), [Citations & references](U42-citations-and-references.md),
  [DOIs](U45-dois.md), [Identifiers](U44-identifiers.md): the blocks and
  lines of the Fields tables they describe; DOIs' "DOI Versioning" also
  decides whether an older version's chapter page opens (Settings bullet
  15).
- [Media files](U47-media-files.md): the images an HTML file shows, and
  its OMP1 (the HTML plugin off).
- [Search engine metadata & analytics](U20-search-engine-metadata-and-analytics.md):
  the tags of the book's page, the chapter pages and the file pages (its
  Rules 16, 17; its OMP6 is the failing file address, [A9](#a9) here).
- [Usage statistics](U64-usage-statistics.md): the views these pages
  count, and its OMP3 (files never counted).
- [Publish, schedule & versions](U49-publish-schedule-and-versions.md):
  publishing, scheduling, "Create New Version", the version names, and its
  A6 (the date line rewritten by a new version).
- [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md):
  the header's "View" and "Preview" that open this page.
- [Article landing page & reading](U13-article-landing-page-and-reading.md):
  the journal's and preprint server's counterpart, and the home of the
  "How to Cite" block, its settings window and the "Downloads" chart.
- [Subscriptions](U51-subscriptions.md): a journal's priced galley link
  (the absence paragraph).
- [Appearance & theming](U10-appearance-and-theming.md): the date formats
  and the chart choice.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md):
  a press closed to signed-out visitors (Settings bullets 7, 8).
- [Plugins management](U62-plugins-management.md): the Plugins list where
  the plugins of Settings bullets 1–3 are switched.
- [Sections](U17-sections.md), [Categories](U16-categories.md): the series
  and category pages the side column links to.

## Canonical scenarios

Scenarios 1 to 9 read books published for them on scratch presses with
throwaway accounts, because the seeded press's catalog holds what earlier
runs published, and scenario 10 runs on a scratch journal and a scratch
preprint server. The accounts, their passwords, the mail catcher and the
tooling recipe are in the footnote. <sup>s</sup>

1. **A published book's page**

   Given: a visitor, on a scratch press, and its published Monograph
   "Shorelines", subtitle "Essays on the Coast", URL Path "shorelines",
   by Ada Quill and Lee Marsh, with an abstract, the keywords alpha and
   beta gamma, a plain language summary, the series "Monographs", the
   category "History", the date 2024-03-05, no chapter, and three
   approved, available formats: "PDF" holding article.pdf on "Open
   Access", "Online" at the remote address https://example.org/shorelines,
   and the physical "Paperback", with no file, the "ISBN-13 (15)" code
   978-951-98548-9-2, a "Publication date (01)" of 20240305 in the "Date
   Format" its window preselects, a width of 130 and a height of 200.

   - **The address**: open the press's address followed by
     "catalog/book/shorelines": the book's page opens under the press's
     header, with no trail ("Home / …") above the title, and the browser
     tab reads "Shorelines: Essays on the Coast | {press name}" (Rule 2;
     Fields, the book's page).
   - **The main column**: top to bottom, with no notice above them: the
     heading "Shorelines" with "Essays on the Coast"; Ada Quill and Lee
     Marsh; "Keywords:" followed by alpha and beta gamma joined by a
     comma, in either order; "Synopsis" over the abstract; "Plain
     Language Summary" over the summary; and the "References" heading
     with nothing under it. There is no "Downloads" chart, the press
     being on "Do not display submission usage statistics chart for
     reader." (Fields, the book's page; Rule 7; Settings bullet 5).
   - **The side column**: top to bottom: the press's default book
     picture, not a link; the links "PDF" and "Online", in either order,
     and none for "Paperback", which holds no file; "Published" with
     "March 5, 2024"; "Versions" with "2024-03-05 (Version of Record
     1.0)" as plain text; "Series" with "Monographs", a link to the
     series' page; "Categories" with "History", a link to the category's
     page; a copyright line; and "Paperback"'s details. There is no "How
     to Cite", the "Citation Style Language" plugin being off on a new
     press (Fields, the book's page; Rules 8, 9, 11; Settings bullet 3).
   - **"Paperback"'s details**: the block is headed "Paperback", the
     book having more than one available format, and holds "ISBN-13
     (15)" with 978-951-98548-9-2 under it, "Publication date (01)" with
     2024-03-05 and "Hijri Calendar" under it, and "Physical Dimensions"
     with 130 and 200, each followed by its unit, joined by " x ". "PDF"
     and "Online" have no block (Rule 12).
   - **"Online"**: press it: https://example.org/shorelines opens in a
     new tab (Rule 11).
   - **"PDF"'s address**: the link's address is the press's address
     followed by "catalog/view/shorelines/", then the format's and the
     file's numbers (Rules 2, 11c).
   - **The number address**: open the press's address followed by
     "catalog/book/" and the book's number: the same page opens, and the
     address stays as typed (Rule 2).
   - **Control**: a second published book of the press, "Bare", with
     only a title, the contributor Ada Quill and an abstract, shows the
     title, Ada Quill, "Synopsis", the "References" heading with nothing
     under it, the default book picture, "Published", "Versions" and the
     copyright line "Copyright (c) {year} {press name}", and no other
     heading (Rule 7). <sup>s</sup>

2. **The table of contents, a chapter's page and the "Downloads" chart**

   Given: a visitor, on a scratch press that gives chapters DOIs and
   shows the downloads chart as bars, and two of its books, published
   on 2024-03-05 and both by Ada Quill and Lee Marsh: "Coastlines", its
   "Publication Dates" left as a new book has it, with the formats
   "PDF" holding article.pdf and "Chapter PDF" holding replacement.pdf,
   both on "Open Access", and the chapters "Tides", subtitle "Low and
   high", by Lee Marsh, with its page, a DOI, the synopsis "How the sea
   rises and falls.", the pages 1-20 and replacement.pdf, then
   "Harbours", with no author, no page and no DOI; and "Reef Notes", on
   "Each chapter may have its own publication date.", with the chapters
   "Reef", its "Date Published" 2024-06-01, and "Lagoon", with no date
   of its own, both with their pages.

   - **The table of contents**: open "Coastlines"' page: the main column
     lists the chapters in the order they were added: "Tides" with "Low
     and high", a link, followed by "Lee Marsh", by "DOI:
     https://doi.org/" and the chapter's DOI as a link, and by a link
     "Chapter PDF"; then "Harbours" as plain text (Rule 10).
   - **The side column's files**: they list "PDF" and no "Chapter PDF",
     a file a chapter holds being listed under that chapter only
     (Rule 11).
   - **"Downloads"**: the main column holds a section headed "Downloads"
     with a bar chart of the book's downloads by month, over the last
     twelve months (Rules 20, 20a).
   - **"Tides"' page**: press "Tides": the address is "Coastlines"'
     address followed by "/chapter/" and the chapter's number, and the
     browser tab reads "Tides: Low and high | {press name}". The main
     column holds, with no notice above them, the heading "Tides" with
     "Low and high", Lee Marsh, "DOI:" with the chapter's DOI as a link,
     and "Synopsis" over "How the sea rises and falls."; the side column
     holds the default book picture as a link to the book's page, the
     link "Chapter PDF" and no other file, "Volume" with "Coastlines" as
     a link, "Pages" with 1-20, and "Published" with "March 5, 2024",
     the version's date, and no "Versions". The page has no "Downloads"
     chart (Fields, the
     chapter page; Rules 15, 16, 17, 20; Settings bullet 11).
   - **"Volume"**: press "Coastlines" under "Volume": "Coastlines"' page
     opens (Rule 18).
   - **Chapters with their own dates**: open "Reef Notes"' page and
     press "Reef": its "Published" reads "June 1, 2024". Back on the
     book's page, press "Lagoon": its "Published" reads "March 5, 2024",
     the version's date (Rule 16; Settings bullet 11).
   - **Control**: "Coastlines"' address followed by "/chapter/" and
     the number the tooling reports for "Harbours" opens the "404 Not
     Found" page (Rule 15). <sup>s</sup>

3. **Opening a free PDF and a free HTML file**

   Given: a visitor, on a scratch press, and its published book
   "Shorelines" with the formats "PDF" holding article.pdf and "HTML"
   holding article.html, both on "Open Access".

   - **"PDF"**: on the book's page press "PDF": the PDF view page opens
     without the press's header, footer or sidebar, its browser tab
     reading "PDF view of the file article.pdf". The bar across the top
     holds, left to right, an arrow with no visible text, which a screen
     reader reads "Return to view details about Shorelines", article.pdf
     as plain text, and "Download", which a screen reader reads
     "Download Download PDF". The PDF viewer fills the page under the
     bar; what it shows, and what either "Download" does, is
     [A9](#a9), neither a pass nor a fail here (Rule 13; Fields, the
     PDF view page).
   - **The return arrow**: press it: the book's page opens (Fields, the
     PDF view page).
   - **"HTML"**: press "HTML": the HTML view page opens without the
     press's header, footer or sidebar, its browser tab reading "HTML
     view of the file article.html". Its bar holds only a return arrow,
     whose name for a screen reader is [A10](#a10), neither a pass nor
     a fail here, and "Shorelines" as a link, with no "Download"; under
     the bar the HTML file's text fills the page (Rule 13; Fields, the
     HTML view page).
   - **The title**: press "Shorelines": the book's page opens (Fields,
     the HTML view page).
   - **Control**: the mail catcher holds no email after the two files
     were opened (Side effects, "No other email, no notice").
     <sup>s</sup>

4. **A file for sale bought with "Manual Fee Payment"**

   Given: a Reader and a visitor, on a scratch press that sells in US
   dollars with "Manual Fee Payment" and its "Manual Payment
   Instructions" filled, and its published book "Shorelines" with the
   format "PDF" holding article.pdf on "Direct Sales" at a price typed
   as 25.

   - **The link**: signed out, open the book's page: article.pdf's link
     reads "Purchase PDF (25 USD)" after the price; the bare price
     before it is [A7](#a7), neither a pass nor a fail here (Rule 11a).
   - **The payment page**: Reader: sign in, open the book's page and
     press the link: the payment page opens with the press's header and
     footer and the trail "Home / Manual Fee Payment", headed "Manual
     Fee Payment", with "Title" article.pdf and "Fee" "25.00 (USD)". The
     mail catcher holds no email yet (Rule 14; Fields, the payment page;
     Side effects, "No other email, no notice").
   - **"Send notification of payment"**: press it: the page shows
     "Payment Notification" with "Payment notification sent" and
     "Continue" (Rule 14).
   - **The press's principal contact**: the mail catcher holds one email
     to the principal contact, from the Reader's name and address,
     subject "Manual Payment Notification", reading "A manual payment
     needs to be processed for the press {press name} and the user
     {Reader's name} (username "{Reader's username}"). The item being
     paid for is "article.pdf". The cost is 25 (USD). This email was
     generated by the Open Monograph Press Manual Payment plugin." (Actors
     row 5; Side effects, "Manual Payment Notification").
   - **"Continue"**: press it: the payment page opens again, with "Fee"
     "25.00 (USD)" (Rule 14).
   - **Control**: the Reader signs out and presses the link again: the
     Login page opens, not the payment page, and where signing in there
     lands is [A18](#a18), neither a pass nor a fail here (Actors row 4;
     Rule 14). <sup>s</sup>

5. **An unpublished book: the preview, and "404 Not Found" for everyone else**

   Given: Press manager, the Author, a Reader, an External Reviewer,
   another Author of the press who is not on the book, and a visitor,
   on a scratch press with the Author's book "Draft Tides" in
   Production, never published and with no date saved, the Author's
   second submission left unfinished in the wizard, and the published
   book "Shorelines".

   - **The Press manager's preview**: Press manager: open "Draft Tides"'
     workflow and press "Preview" in its header: the book's page opens
     under the notice "This is a preview and has not been published.
     View submission", with no "Published" line and no "Versions" list
     (Actors row 2; Rule 5).
   - **"View submission"**: press it: "Draft Tides"' workflow opens
     (Rule 5a).
   - **The Author**: Author: type the book's address, the press's
     address followed by "catalog/book/" and the book's number: the page
     opens under the same notice (Actors row 2).
   - **Everyone else**: the visitor, signed out, then the Reader, the
     External Reviewer and the other Author, each signed in in turn,
     open the same address: each gets the "404 Not Found" page (Actors
     row 2; Rule 3).
   - **The unfinished submission**: its address, the press's address
     followed by "catalog/book/" and its number, opens the "404 Not
     Found" page for the Press manager and for the Author (Actors row 2).
   - **Control**: the visitor opens "Shorelines"' page, which shows no
     preview notice (Rules 3, 5). <sup>s</sup>

6. **An older version beside the current one**

   Given: a visitor, on a scratch press, and its book first published on
   2024-03-05 as "Tides" (Version of Record 1.0), then published again
   today as a second version retitled "Tides Revised".

   - **The current page**: open the book's address: it is headed "Tides
     Revised"; "Published" reads "March 5, 2024 — Updated on {today}",
     {today} being today's date written like the first; "Versions"
     lists, newest first, the second version as today's date written
     year-month-day and its version name in brackets, in plain text, and
     "2024-03-05 (Version of Record 1.0)" as a link (Rules 4, 8, 9).
   - **The older version**: press "2024-03-05 (Version of Record 1.0)":
     the address is the book's address followed by "/version/" and an
     id; the page opens under "This is an outdated version published on
     2024-03-05. Read the most recent version." and is headed "Tides",
     while which title its browser tab names is [A5](#a5), neither a
     pass nor a fail here; "Published" reads "March 5, 2024"; in
     "Versions" the first version is plain text and the second a link to
     the book's address (Rules 4, 6, 8, 9).
   - **"most recent version"**: press it: the book's address opens,
     headed "Tides Revised" (Rule 6).
   - **Control**: the current version's page carries no outdated-version
     notice (Rule 6). <sup>s</sup>

7. **An older version's chapter pages, on a press with "DOI Versioning" "Yes"**

   Given: a visitor, on a scratch press whose "DOI Versioning" reads
   "Yes", and its book "Coastlines", first published on 2024-03-05 with
   the chapters "Tides" and "Coda", then published again today as a
   second version from which "Coda" was removed and to which "Harbours"
   was added, every chapter with its page.

   - **"Tides" now**: open the book's page and press "Tides": its
     "Versions" lists, newest first, the second version, today's date
     written year-month-day and its version name in brackets, as plain
     text, and "2024-03-05 (Version of Record 1.0)" as a link (Rule 17).
   - **"Tides" in the first version**: press "2024-03-05 (Version of
     Record 1.0)": the address is the book's address followed by
     "/version/", an id, "/chapter/" and the same chapter number as
     before, and the page opens under "This is an outdated version
     published on {date}. Read the most recent version.", {date} being
     the first version's. Press "Coastlines" under "Volume": the first
     version's book page opens, under its own outdated-version notice.
     Go back and press "most recent version": "Tides"' current page
     opens (Rules 15, 15a, 18).
   - **"Harbours"**: on the book's page press "Harbours": its "Versions"
     lists the second version followed by " — Chapter created", as plain
     text, and "2024-03-05 (Version of Record 1.0)" as plain text
     (Rule 17).
   - **"Coda" in the first version**: on the book's page press
     "2024-03-05 (Version of Record 1.0)" under "Versions", then "Coda"
     in that page's table of contents: "Coda"'s page opens under the
     outdated-version notice, and its "Versions" lists the second
     version, today's date written year-month-day and its version name
     in brackets, followed by " — Without this chapter", as plain text,
     and "2024-03-05 (Version of Record 1.0)" as plain text. Press "most
     recent version": the book's current page opens (Rules 10, 17, 18).
   - **Control**: the book's address followed by "/chapter/" and
     "Coda"'s number opens the "404 Not Found" page, the current version
     not carrying "Coda" (Rule 15). <sup>s</sup>

8. **"How to Cite" on a book and a chapter**

   Given: a visitor, on a scratch press with the "Citation Style
   Language" plugin on and DOIs switched off, and its published
   Monograph "Shorelines" by Ada Quill and Lee Marsh, dated 2024-03-05,
   in no series, with the chapter "Tides" by Lee Marsh, on the pages
   1-20, with its page.

   - **The book's citation**: open the book's page: its side column ends
     with "How to Cite", citing the book in "APA" with the authors Quill
     and Marsh, the title "Shorelines", the press's name as publisher,
     the version's date and the book's address, the press's address
     followed by "catalog/book/" and the book's number (Rules 19, 19a;
     Settings bullet 4).
   - **Another format**: choose "MLA" among the block's other formats
     ([→ How to Cite](U13-article-landing-page-and-reading.md#how-to-cite)):
     the citation's text changes, still naming Quill, Marsh and
     "Shorelines" (Actors row 6; Rule 19).
   - **A download**: choose the "BibTeX" download in the same list: the
     browser saves a file (Actors row 6; Rule 19).
   - **The chapter's citation**: press "Tides" in the table of contents:
     the chapter page's side column ends with "How to Cite", citing
     Marsh, "Tides", "In" Quill and Marsh, "Shorelines", the pages 1-20,
     the press's name and the chapter's address, the book's address
     followed by "/chapter/" and the chapter's number (Rule 19b).
   - **Control**: on a new press, where the plugin is off, a published
     book's page has no "How to Cite" (Settings bullet 3). <sup>s</sup>

9. **Free files for signed-in users only**

   Given: a Reader and a visitor, on a scratch press with "Users must be
   registered and log in to view open access content." ticked, and its
   published book "Shorelines" with the format "PDF" holding article.pdf
   on "Open Access".

   - **The page**: signed out, open the book's page: it opens, with the
     link "PDF" (Settings bullet 6).
   - **"PDF"**: press it: the Login page opens (Rule 13c).
   - **Signed in there**: sign in as the Reader on that Login page: the
     PDF view page of article.pdf opens (Actors row 3; Rule 13c).
   - **Control**: back on the book's page, pressing "PDF" again opens the
     PDF view page with no Login page (Actors row 3). <sup>s</sup>

10. **No book's page on a journal or a preprint server** {OJS OPS}

    Given: a visitor, on a scratch journal that requires subscriptions
    and charges 5 US dollars for "Purchase Article", with an article
    carrying the galley "PDF" published in the journal's one published
    issue, whose "Access status" is "Subscription", and on a scratch
    preprint server with a posted preprint carrying the galley "PDF".

    - **The journal**: open the journal's address followed by
      "catalog/book/" and the article's number: the "404 Not Found" page
      opens. The article's page lists its galley, whose link reads
      "Requires Subscription or Fee PDF (USD 5)", and no table of
      contents (Purpose, the absence paragraph).
    - **The preprint server**: open the server's address followed by
      "catalog/book/" and the preprint's number: the "404 Not Found" page
      opens. The preprint's page lists its galley "PDF", with no price,
      and no table of contents (Purpose, the absence paragraph).
    - **Control**: on a scratch press, the press's address followed by
      "catalog/book/" and a published book's number opens the book's
      page (Rule 2). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A4 (Rule 5, Rule 6; issue report
    `docs/issues/U13-OPS1-new-version-preview-called-outdated.md`): a new
    version's preview showing the preview notice alone, and an older
    published version's page keeping the outdated notice
  - the Login page a file for sale leads a visitor to, saying nothing of
    the purchase (Rule 14)
  - the payment page's order, the press's instructions first, and
    "Send notification of payment" as an underlined link (Fields, the
    payment page)
- **Nothing new to test**:
  - an unassigned Series editor or assistant role opening the preview
    (Actors row 2)
  - "View submission" on a preview for the book's Author (the
    access-denied page) and for an unassigned Series editor or
    assistant role (the "Error" window) (Rule 5a)
  - a dated preview: its date line and a "Versions" heading listing only
    the published versions (Rule 5)
  - a scheduled version's preview headed "Forthcoming" (Rule 8)
  - an older version's file on a view page, under the outdated-version
    notice (Rule 13a)
  - another citation format or a citation download on a preview, by a
    role assigned to the book (Actors row 6)
  - a version with no date yet starting every date line with today
    (Rule 8a)
  - "All time" and "Last 12 months" on a book with downloads older than
    twelve months (Rule 20a)
  - a book with no contributor cited from its title (Rule 19a)
  - a signed-in Reader, or any other role, reading a published book's
    pages, which read as they do for a visitor (Actors row 1;
    scenarios 1, 2)
  - the press's staff, the Site Administrator and every other signed-in
    role pressing a file for sale, offered the payment page as the
    Reader is (Actors row 4; Rule 14; scenario 4)
- **Register carries it**:
  - A1 (an address that names no book; Rule 3a)
  - A2 (a book published only as an "Author Original"; Rule 3)
  - A3 (a version address that names no version; Rule 4)
  - A4 (a new version's preview under both notices; Rule 5b)
  - A5 (an older version's browser tab; Rule 6; scenario 6 passes it)
  - A6 (a chapter whose authors are the book's still shows its author
    line; Rule 10)
  - A7 (a priced file's link shows its price twice; Rule 11a; scenario
    4 passes it)
  - A8 (a format with several files; Rule 11b)
  - A9 (a free file's download, the PDF view page's viewer and
    "Download", and "PDF.js PDF Viewer" off; Rule 13b; Settings bullet
    1; scenario 3 passes it)
  - A10 (the HTML view page's return arrow; Fields, the HTML view page;
    scenario 3 passes it)
  - A11 (a manual purchase never completed; Rule 14)
  - A12 ("Enable" unticked on a press that sells; Rule 14b; Settings
    bullet 10)
  - A13 (a day-first short date heading a chapter "Forthcoming" or
    "Published"; Rule 16a)
  - A14 (a later version's "Original work published" on a chapter that
    version added; Rule 19b)
  - A15 (the pages in French; Rule 21)
  - A16 (a book's earlier URL Path; Rule 2)
  - A17 (an unpublished book's chapter page without the preview notice;
    Rule 5b)
  - A18 (where a visitor who signs in to buy lands; Rule 14; scenario 4
    passes it)
  - A19 (an older version's chapter page on a press with "DOI
    Versioning" "No"; Rule 15a)
  - A20 (a later version's chapter with its own date; Rule 16)
  - A21 (the book's Author or an unassigned role using a preview's
    citation; Actors row 6)
  - A22 ("APA"'s "(Vols. 3)" for a series position; Rules 19a, 19b)
- **No seed**:
  - chapters dragged into a new order on the Chapters page (Rule 10)
  - a purchase completed through PayPal (Rule 14)
- **Owned by another feature**:
  - the Settings pages and the plugin switches (Actors row 7;
    *[Plugins management](U62-plugins-management.md)*, scenario 2)
  - building the formats, the chapters, the catalog entry and the
    contributors (Actors row 8; *[Publication formats & proof
    terms](U73-publication-formats-proof-terms.md)*, *[Chapters & work
    type](U72-chapters-work-type.md)*, *[Catalog
    management](U70-catalog-management.md)*, *[Contributors &
    affiliations](U41-contributors-and-affiliations.md)*)
  - "Paypal Fee Payment" with only its "Account Name": the transaction
    error page (Rule 14; Settings bullet 9; *[Payments &
    APCs](U52-payments-and-apcs.md)*)
  - a file for sale on a press with no currency or no method set up
    (Rule 14a; *[Publication formats & proof
    terms](U73-publication-formats-proof-terms.md)*, scenario 6)
  - the "Citation Style Language" "Settings" window's choices (Settings
    bullet 4; *[Article landing page &
    reading](U13-article-landing-page-and-reading.md)*, scenario 6)
  - "HTML Monograph File" off (Settings bullet 2; *[Media
    files](U47-media-files.md)*, its OMP1)
  - "Users must be registered and log in to view the press site."
    ticked, or the press not enabled (Settings bullets 7, 8; *[Journal
    identity & about pages](U07-journal-identity-and-about-pages.md)*)
  - "Chapter Page" unticked on a chapter with a DOI (Settings bullet 12;
    *[Chapters & work type](U72-chapters-work-type.md)*, scenario 9)
  - the date formats (Settings bullet 13; *[Appearance &
    theming](U10-appearance-and-theming.md)*, scenario 7)
  - an Edited Volume's credits, the DOIs, URNs, licenses and cover sizes
    (Settings bullet 14; *[Contributors &
    affiliations](U41-contributors-and-affiliations.md)*, scenario 10;
    *[DOIs](U45-dois.md)*; *[Identifiers](U44-identifiers.md)*;
    *[Publication metadata](U40-publication-metadata.md)*; *[Catalog
    management](U70-catalog-management.md)*, scenario 5)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A8](#a8) | In a format with several files, a file for sale shows no price | 🐞 | user-visible | — |
| [A9](#a9) | No book file can be read or saved: every download fails | 🐞 | user-visible · crash: both | — |
| [A15](#a15) | The book's and chapter pages show raw codes in French | 🐞 | user-visible | — |
| [A16](#a16) | A book's earlier URL Path shows a server error page | 🐞 | user-visible · crash: server | — |
| [A19](#a19) | An older version's chapter page shows a server error page | 🐞 | user-visible · crash: server | — |
| [A1](#a1) | An address that names no book asks visitors to sign in | 🐞 | minor | — |
| [A3](#a3) | A version address that names no version fails with a server error | 🐞 | minor · crash: server | — |
| [A4](#a4) | A new version's preview also calls itself outdated, dated today | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A5](#a5) | An older version's browser tab names the current version | 🐞 | minor | — |
| [A6](#a6) | The table of contents repeats the book's authors under every chapter | 🐞 | minor | — |
| [A7](#a7) | A priced file's link shows its price twice | 🐞 | minor | — |
| [A10](#a10) | The HTML view page's return arrow is named by a raw code | 🐞 | minor | — |
| [A12](#a12) | Unticking payments "Enable" does not stop a press selling files | 🐞 | minor | — |
| [A13](#a13) | Under a day-first date format a chapter page mixes up "Published" and "Forthcoming" | 🐞 | minor | — |
| [A17](#a17) | An unpublished book's chapter page carries no preview notice | 🐞 | minor | — |
| [A18](#a18) | A visitor who signs in to buy a file never reaches the payment page | 🐞 | minor | — |
| [A20](#a20) | A later version's chapter repeats its own date | 🐞 | minor | — |
| [A11](#a11) | A buyer who pays by hand never gets the file | ❓ | user-visible | — |
| [A2](#a2) | A book published only as an Author Original has no page | ❓ | minor | — |
| [A21](#a21) | On a preview, "How to Cite" works only for the roles assigned to the book | ❓ | minor | — |
| [A22](#a22) | "APA" prints a series position as a number of volumes | ❓ | minor | — |
| [A14](#a14) | A chapter new in a later version is cited as older than it is | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — An address that names no book asks visitors to sign in** · 🐞 · minor.
A visitor who opens a book address with a number or URL Path the press
does not have gets the Login page, and a signed-in user an error page
with no heading, its browser tab "| {press name}", reading "An invalid
published submission was specified.". An unpublished book's address
answers "404 Not Found", as an article's unknown address does on a
journal. A mistyped or stale link thus asks the visitor to sign in for
something that does not exist.
Basis: probe, 2026-09-28. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A book published only as an Author Original has no page** · ❓ · minor.
A book whose only published version is an "Author Original" answers "404
Not Found" to readers, and the catalog leaves it out, although the
workflow shows that version "Status: Published". The Press manager and
the Site Administrator who type the book's address get its page as if
published, with no preview notice, "Published {Version of Record date} —
Updated on {Author Original date}" and "Versions" "{date} (Author
Original 1.0)"; the workflow, which shows the Version of Record "Status:
Unpublished", offers them neither "View" nor "Preview".
Question: should a published Author Original make the book public on a
press? Lean: intended; only a Version of Record puts a book in the catalog,
but the workflow could say so.
Basis: probe, 2026-09-28. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A version address that names no version fails with a server error** · 🐞 · minor · crash: server.
A book's address followed by "/version/" and an id that is none of the
book's versions (a mistyped number, another book's version, or letters
such as "abc") shows a blank server error page instead of "404 Not
Found", to visitors, Readers, the Press manager and the Site
Administrator alike: the app fails.
Basis: probe, 2026-09-28. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A new version's preview also calls itself outdated** · 🐞 · low.
Previewing a new, unpublished version of a published book shows the
preview notice and, under it, "This is an outdated version published on
{today's date}. Read the most recent version." The version has no
publication date, so the line prints the day of the preview; it is the
newest version there is, and "most recent version" leads to the
published version's page. A journal shows the preview notice alone. The
editor or author checking the new version is told it is outdated and
was published today; readers never see the line.
Basis: probe, 2026-10-01. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — An older version's browser tab names the current version** · 🐞 · minor.
An older version's page is headed with that version's title, but its
browser tab (and a bookmark made from it) reads the current version's
title.
Basis: probe, 2026-09-28. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The table of contents repeats the book's authors under every chapter** · 🐞 · minor.
A chapter's author line is meant to be left out when the chapter's
authors are the book's. It is shown under every chapter that has
authors: a single-author book lists that author under each of its
chapters.
Basis: probe, 2026-09-28. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A priced file's link shows its price twice** · 🐞 · minor.
The link of a file for sale reads "25.00 Purchase PDF (25.00 USD)": the
bare price, then the sentence with the price again.
Basis: probe, 2026-09-28. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — In a format with several files, a file for sale shows no price** · 🐞 · user-visible.
A format with more than one listed file shows each file's name twice, as
text and as a link, and the link of a file for sale reads only its name:
no price and no "Purchase". The reader cannot tell it from a free file
until the link leads to the Login or payment page.
Basis: probe, 2026-09-28. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — No book file can be read or saved** · 🐞 · user-visible · crash: both.
Every free file of a published book fails. A PDF's link opens the PDF view
page, but the page's own script fails: the viewer shows a red "Unexpected
server response." bar instead of the PDF, and neither the bar's
"Download" nor the viewer's own saves anything. Any file that downloads
(an EPUB, a supplementary file, a PDF with the viewer off) opens a blank
error page: the app fails. Only an HTML file shows. Readers of a press
can open no book, in any interface language, and search engines
following the page's file addresses get the same failure.
Worked until the download began reporting the version to the usage statistics, a change read from the code's history: a regression.
Since: 2026-08-26 (a month), a date read from the code's history · Basis: probe, 2026-09-28. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The HTML view page's return arrow is named by a raw code** · 🐞 · minor.
The return arrow of the HTML view page has no visible text, and a screen
reader announces it as "##monograph.return##".
Basis: probe, 2026-09-28. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — A buyer who pays by hand never gets the file** · ❓ · user-visible.
With "Manual Fee Payment", a buyer's "Send notification of payment" emails
the press, and "Continue" leads back to the payment page. A press has no
list of payments, and no menu leads to one.
No screen records a manual payment, so the file stays for sale to that buyer however they paid.
Question: should a press be able to record a manual payment, or should
"Manual Fee Payment" be withheld from direct sales? Lean: record it; the
method's own description says the manager records receipt.
Basis: probe, 2026-09-28. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — Unticking payments "Enable" does not stop a press selling files** · 🐞 · minor.
A press that unticks "Enable" on its "Payments" tab, keeping its currency
and method, still shows priced files with "Purchase" and still takes
buyers to the payment page. The box reads as the switch for payments.
Basis: probe, 2026-09-28. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — Under a day-first date format a chapter page mixes up "Published" and "Forthcoming"** · 🐞 · minor.
A chapter page compares the version's date with today as written in the
press's short date format. Under a day-first format such as "d/m/Y", a
chapter published on 31/12/2024 and read on 28/09/2026 is headed
"Forthcoming". The other way round, a chapter of a book scheduled for
15/01/2027 reads "Published" in the Press manager's preview while its
book's page reads "Forthcoming". The heading follows the version's date,
never the chapter's own. The book's page compares the dates correctly.
Basis: probe, 2026-09-28. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A chapter new in a later version is cited as older than it is** · ❓ · minor.
On a later version of a book, a chapter's "APA" citation adds "(Original
work published {year})", the book's first year, even for a chapter that
version added: "Harbours", added in 2026, is cited "(2026). Harbours. …
(Original work published 2024)".
Question: should a chapter's citation date from its own first version?
Lean: yes, a defect; the chapter did not exist in that year.
Basis: probe, 2026-09-28. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — The book's and chapter pages show raw codes in French** · 🐞 · user-visible.
With French as the interface language, "Published", "Forthcoming",
"Categories", "DOI:", "Online ISSN", "Print ISSN", "Plain Language
Summary", the chart's "Downloads", "Volume", "Pages", the format details'
screen-reader heading and a file view page's browser tab and return arrow
show as raw codes such as "##catalog.published##". Every version name
reads "{date} (##publication.versionStage.display##)", as on an
article's page ([→ Article landing page & reading, A1](U13-article-landing-page-and-reading.md#a1));
a chapter's first version runs "##submission.chapterCreated##" on to it,
and a version without the chapter reads "##submission.withoutChapter##"
with no date or name. A priced file's link drops the format's name
("Achat (25.00 USD)").
Basis: probe, 2026-09-28. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — A book's earlier URL Path shows a server error page** · 🐞 · user-visible · crash: server.
After a book's URL Path changes (a later version saved a new one), the
address with the old path shows a blank server error page instead of
the book: bookmarks, shared links and search engines' links to it break.
A URL Path saved on a new, unpublished version does the same at once,
to visitors and to the Press manager, until that version is published.
The app fails.
Since: 2024-06-26 (two years) · Basis: probe, 2026-09-28. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — An unpublished book's chapter page carries no preview notice** · 🐞 · minor.
Those who may preview a book open its chapter pages without the notice
"This is a preview and has not been published. View submission" that the
book's page carries, and with a date saved the chapter page reads
"Published {date}", so nothing tells the editor the page is not public.
Basis: probe, 2026-09-28. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — A visitor who signs in to buy a file never reaches the payment page** · 🐞 · minor.
A visitor who presses a priced file's link gets the Login page; after
signing in there, a Reader lands on the press's home page and a Press
manager on the Dashboard's list headed "Assigned to me", instead of the
payment page, and the buyer must find the book and press the link
again. A free file's Login page returns to the file (Rule 13c).
Basis: probe, 2026-09-29. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — An older version's chapter page shows a server error page** · 🐞 · user-visible · crash: server.
On a press whose "DOI Versioning" reads "No" (a new press's default), an
older version's chapter page shows a blank server error page, whether
its address is typed or pressed in the older version's table of
contents or in a chapter's "Versions" list; the current version's
chapter pages open. The app fails.
Basis: probe, 2026-09-28. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — A later version's chapter repeats its own date** · 🐞 · minor.
On a book whose chapters carry their own dates, a new version copies the
chapter's "Date Published", so the chapter page reads "June 1, 2024 —
Updated on June 1, 2024" and never shows the new version's date.
Basis: probe, 2026-09-28. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — On a preview, "How to Cite" works only for the roles assigned to the book** · ❓ · minor.
On an unpublished book's preview, the book's Author and a Series editor
or assistant role not assigned to the book see the citation, but
choosing another format leaves it unchanged and a download opens the
"404 Not Found" page. The Press manager and the roles assigned to the
book get the other format and the file.
Question: should everyone who may preview a book use its citation
formats? Lean: yes, a defect; the block is offered to them, as on an
article's page ([→ Article landing page & reading, OJS1](U13-article-landing-page-and-reading.md#ojs1)).
Basis: probe, 2026-09-28. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — "APA" prints a series position as a number of volumes** · ❓ · minor.
A book at position 3 of its series is cited in "APA" as "Tides (Vols.
3)", which reads as a work in three volumes, and its chapters as "(Vols.
3, pp. 1-20)"; the series' title shows only in the "BibTeX" and "RIS"
files.
Question: should "APA" print a series position as one? Lean: yes, a
defect; a place in a series is not a count of volumes.
Basis: probe, 2026-09-28. <sup>f-a22</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — OMP `pages/catalog/CatalogBookHandler.php` (ops `book`, `view`, `download`) renders `templates/frontend/pages/book.tpl`, which includes `frontend/objects/monograph_full.tpl` (the book) or `frontend/objects/chapter.tpl` (`$isChapterRequest`). Files: `frontend/components/publicationFormats.tpl` and `downloadLink.tpl`; contributors: `frontend/components/authors.tpl`. Viewers: `plugins/generic/pdfJsViewer` (hooks `CatalogBookHandler::view`, `::download`, late) and `plugins/generic/htmlMonographFile` (the same hooks). How to cite: `plugins/generic/citationStyleLanguage` on `CatalogBookHandler::book`, `Templates::Catalog::Book::Details`, `Templates::Catalog::Chapter::Details`. Purchase: the fall-through of `CatalogBookHandler::download()` into `OMPPaymentManager`, and `pages/payment/PaymentHandler::plugin()` for a method's callback. Code read on checkout omp `3cd59e944` (lib/pkp `17a1f01fed`), 2026-09-28. The OMP default theme overrides none of these templates. ui-library's `PkpCite` is mounted by no template (UNASSIGNED item 30 records it for the article page); the legacy CSL block is the only one. Live-probed 2026-09-28 (Purpose): on scratch presses the home page's two lists, the catalog, a series page, a category page, "New Releases" and a search each lead to the book; the book's page, a chapter page, both view pages and the payment page as the sections above describe.

<a id="fn-b"></a>
**b** — OJS and OPS `pages/catalog/index.php` route only `category`, `fullSize` and `thumbnail` to `CatalogHandler`; neither app has `CatalogBookHandler`, `pages/payment` exists in OJS only (its own payment types), OPS has no payment code. Live-probed 2026-09-28 (the absence paragraph): on a scratch journal requiring subscriptions with a "Purchase Article" fee of 5 USD, an article published in its one published issue showed a galley link reading "Requires Subscription or Fee PDF (USD 5)"; pressed signed out it led to Login ("Subscription or article purchase required to access item."), pressed by a Reader to "Manual Fee Payment" ("Fee" "5.00 (USD)"). A scratch server's preprint page showed its galleys, no table of contents, no chapter pages and nothing for sale.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-28 (the absence paragraph): on the seeded journal and preprint server, `catalog/book/1`, `catalog/book/1/chapter/1`, `catalog/view/1/1/1`, `catalog/download/1/1/1` and `catalog/book/{a published item's number}` answered "404 Not Found", signed out and as the Journal Manager (Server Manager). Control: on the seeded press `catalog/book/1` sent a visitor to Login and gave the Press manager "An invalid published submission was specified." (Rule 3a).

<a id="fn-c"></a>
**c** — `CatalogBookHandler::authorize()` adds `ContextRequiredPolicy` and `OmpPublishedSubmissionAccessPolicy` (whose `OmpPublishedSubmissionRequiredPolicy` resolves the number or URL Path and checks nothing about status); `PKPHandler::authorize()` adds `RestrictedSiteAccessPolicy` for `restrictSiteAccess` and a press not enabled. `book()` throws not found when the submission is not `STATUS_PUBLISHED` and the user is absent or `Repo::submission()->canPreview()` is false; `canPreview()` passes any user holding `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT` or `ROLE_ID_SUBSCRIPTION_MANAGER` in the press (`_roleCanPreview()`, assignment not read) and any user with an Author stage assignment on the book; an incomplete submission is never previewable. Role names from OMP `locale/en/default.po` and lib/pkp `locale/en/default.po`. Live-probed 2026-09-28 (Actors preamble, rows 1, 7, 8; Settings bullets 7, 8): a published book's page and its chapter page read the same for a visitor and 23 signed-in accounts (every role of a new press, assigned and not, the book's Author, both kinds of Reviewer, the Site Administrator). Settings › Users & Roles › "Roles" on a new press listed 19 roles, eight of them at "Assistant", the eight the preamble names. On a press requiring sign-in, and on one created not enabled, a signed-out visitor who opened the book, a version, a chapter page, a file's view or download address, a priced file or the press home landed on Login; that press's signed-in Reader read the pages. "Enable this press to appear publicly on the site" sits only in the Site Administrator's Hosted Presses › "Edit" window (the journal's and server's box likewise).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-28 (Actors row 2; Rule 5): on scratch presses with an unpublished book in Production, the book's page opened under the preview notice for the Press manager, Press editor, Production editor, an assigned and an unassigned Series editor, an assigned and an unassigned Copyeditor, the other seven assistant roles (unassigned), the book's Author and the Site Administrator. A visitor, a Reader, an External and an Internal Reviewer, and another Author, a Volume editor, a Chapter Author and a Translator not on the book got "404 Not Found"; a submission its author never finished answered "404 Not Found" to every role. The workflow offered "Preview" to the Press manager and the assigned Series editor, and the book's Author neither "Preview" nor "View". The book's chapter page opened for every previewing role without a notice, reading "Published March 5, 2024" (A17).

<a id="fn-d"></a>
**d** — `monograph_full.tpl`: title `getLocalizedFullTitle(null, 'html')`; `authors.tpl`; `.item.doi` (`doi.readerDisplayName` "DOI:"); `.item.keywords` (`common.keywords` through `semicolon` "{$label}: ", joined by `common.commaListSeparator`); `.item.abstract` (`submission.synopsis` "Synopsis", OMP `locale/en/submission.po`; always rendered); plain language summary; `.item.chapters` (heading `pkp_screen_reader` `submission.chapters`); hook `Templates::Catalog::Book::Main`; the chart; `.item.author_bios`; `.item.references` when `citations` or `citationsRaw` (the empty heading: note of U42's A20). Side column: `.item.cover` (`getLocalizedCoverImageThumbnailUrl()`, falling back to `templates/images/book-default_t.png`; `alt` from the cover's `altText`); `.item.files` (`submission.downloads`, screen reader only); `.item.date_published` with `.sub_item.versions`; `.item.series` (`series.series`, `catalog.manage.series.onlineIssn` / `printIssn`) linking `catalog/series/{path}`; `.item.categories` (`catalog.categories`) linking `catalog/category/{path}`; data availability, funding statement, funders, copyright (`submission.copyrightStatement`), license; `.item.publication_format` blocks; hook `Templates::Catalog::Book::Details`. `book.tpl` sets `pageTitle` from `getCurrentPublication()->getLocalizedFullTitle()` (book) or the chapter's full title; `headerHead.tpl` appends " | {context name}". No template of the page includes `breadcrumbs.tpl`. Live-probed 2026-09-28 (Fields intro, the book's page): tabs "K2 Minimal Book | {press name}" and, with a subtitle, "K2 Full Book: A Subtitle | {press name}"; the two columns side by side at 1280 px; the parts in the tables' order; the view pages without header, footer or sidebar, the payment page with them and the trail "Home / Manual Fee Payment". Keywords typed "alpha", "beta gamma" (stored in that order) read "alpha, beta gamma" in three runs and "beta gamma, alpha" in one. A format with no code, date, identifier or physical box got no details block. Settings bullet 14: a format's Publisher ID "pid-k3", saved and read back, appeared nowhere in the book page's HTML; a contributor unticked from "Include this contributor when identifying authors in lists of publications." on a new version was still listed under "Authors", while the catalog's line named only the other author; an Edited Volume's new version credited its volume editor "(ed)"; a press license saved on screen showed on a book published after it and not on one published before; a 400 × 400 cover showed as a 100 × 100 copy.

<a id="fn-td24"></a>
**td24** — Live-probed 2026-09-28 (Rule 7; Fields, Cover): the bare book showed the screen-reader "Authors" heading, "Synopsis", an empty "References", the default book picture (not a link, empty alternate text), "Published", "Versions" and "Copyright (c) 2024 {press name}", and no other heading. A cover saved with "Alternate text" showed its small copy with that text, not a link.

<a id="fn-e"></a>
**e** — `chapter.tpl`: notice as note l; title `$chapter->getLocalizedFullTitle()`; `authors.tpl` with `$chapterAuthors` (the edited-volume swap needs `!$isChapterRequest`); DOI from `$chapterDoiObject` (the chapter's, or a sibling version's per `CatalogBookHandler`); abstract only when set; hook `Templates::Catalog::Chapter::Main`; bios of the chapter authors; side: cover wrapped in a link to `catalog/book/{id}` (current) or `…/{bestId}/version/{pid}`; the chapter's files through `publicationFormats.tpl` with `$isChapterRequest` (remote formats skipped); `.item.monograph` with `chapter.volume` "Volume" and `chapter.pages` "Pages" (OMP `locale/en/submission.po`); date and versions (note l); series, categories, copyright; license from the chapter's `licenseUrl` or the publication's, the CC badge from `getCCLicenseBadge()` of the chapter's URL when set; hook `Templates::Catalog::Chapter::Details`. Live-probed 2026-09-28 (Fields, the chapter page): tab "Tides: Low and high | {press name}"; the parts in the tables' order; an Edited Volume's chapter listed its own authors; "Pages 1-20"; the chapter's own "License URL" as a Creative Commons badge, an unknown one as a link reading "License"; the cover and "Volume" linked `…/catalog/book/{number}` (older version `…/version/{id}`), a number even with a URL Path saved. On a book with no cover the cover link had no name for a screen reader, seen in one run; what it reads with a cover is not settled.

<a id="fn-f"></a>
**f** — OMP `plugins/generic/pdfJsViewer/templates/display.tpl`: `<title>` `catalog.viewableFile.title` "{$type} view of the file {$title}" (format name, file name); `.return` link to `catalog/book/{bestId}` with screen-reader text `catalog.viewableFile.return` "Return to view details about {$monographTitle}"; `.title` a plain `span` with the file's name (OJS's template links the title instead); `.download` to `$downloadUrl` (`catalog/download/…?inline=1`) with `common.download` and `common.downloadPdf`; an inline script calling `PDFJS.getDocument()` against pdf.js 2.6.347, whose build defines no `PDFJS` global; the viewer iframe `pdf.js/web/viewer.html?file={downloadUrl}`; the outdated notice with `filePublication`'s raw `datePublished` when `!$isLatestPublication`. `plugins/generic/htmlMonographFile/templates/display.tpl`: the same `<title>`; `.return` with screen-reader text `monograph.return`, a key no locale file of OMP, lib/pkp or the plugin defines; `.title` linking `catalog/book/{bestId}/{formatBestId}/{fileBestId}`, an address `book()` reads as the current book page; the iframe loads `$downloadUrl`, which the plugin's `downloadCallback()` answers with the file's HTML (`HtmlGalleyHelper::getHTMLContents()`, media resolved) before `CatalogBookHandler::download()` reaches its failing line. Live-probed 2026-09-28: see td22 and td21. OJS and OPS galley PDFs render in their viewer and download as "article.pdf" and "preprint.pdf".

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-28 (Fields, the PDF view page; A9): tab "PDF view of the file article.pdf" ("Free view of the file article.pdf" for a format named "Free"); the bar, left to right, the return arrow ("Return to view details about {title}", the older version's title on an older file, opening the current page), the file name as plain text, "Download" named "Download Download PDF". Pressing "Download" left the page as it was, and the browser's download of "192.html" was cancelled; the address alone answered 500 with an empty page. The viewer's toolbar read "of 0" pages under a red bar "Unexpected server response." ("More Information" adds "Unexpected server response (500) while retrieving PDF …"); its own "Download" started "document.pdf" and failed.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-28 (Fields, the HTML view page; A10): tab "HTML view of the file article.html"; the bar holds only the return arrow (named "##monograph.return##", opening the book's page) and the title link (the file's version title, opening the current page), no "Download"; the HTML showed with its image. On an older version's file the notice read "This is an outdated version published on 2026-09-28. Read the most recent version.". The fixture's `article.css` answered 404.

<a id="fn-g"></a>
**g** — `CatalogBookHandler::book()`: `version/{publicationId}` picks that publication from the submission's publications into the typed property `public Publication $publication` (no default), so an id matching none leaves it uninitialized and the following `!$this->publication` throws "must not be accessed before initialization" (a server error); an unpublished publication without `canPreview()` throws not found; a non-numeric first argument that is not the version's `urlPath` and has no sub-path is meant to redirect to the current `urlPath` (or id), but passes a string path to `PKPRequest::redirect()`, which takes `?array $path` since lib/pkp bee9547b49 (2024-06-26), so the redirect throws a TypeError, a server error (A16); a numeric one is never redirected. The URL Path resolves through `Repo::submission()->getByUrlPath()`. An unknown number or path fails `OmpPublishedSubmissionRequiredPolicy` with `user.authorization.invalidPublishedSubmission` "An invalid published submission was specified." (OMP `locale/en/locale.po`), and `PKPPageRouter::handleAuthorizationFailure()` sends a signed-out user to Login and a signed-in one to `user/authorizationDenied`. Submission status: `Repo::submission()->getStatusByPublications()` returns published only for a published publication whose `versionStage` is the final stage (Version of Record); the current publication is the last published one in version order (`getCurrentPublicationIdByPublications()`). Notices: `submission.viewingPreview` (link `dashboard/editorial?workflowSubmissionId={id}`) when the shown publication is not published, and `submission.outdatedVersion` whenever it is not the current publication, with `datePublished|date_format:$dateFormatShort`. Incidentals: the URL Path (U70 claim check K5, 2026-09-27: `catalog/book/{path}` opens, catalog links use the path, `catalog/book/{id}` still opens); the Author Original only (U68 claim check K2, 2026-09-27: the book's page answered 404); the unknown number (U16 claim check K4, 2026-09-25: `catalog/book/999999` landed a visitor on Login). Live-probed 2026-09-28: see td2–td8.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-28 (Rules 1, 2; A16): every link that leads to the book (the catalog, series and category pages, "New Releases", both home-page lists, a search result, "View Entry") used its URL Path "harbour"; the workflow's "View" and "Preview" opened the page in the same tab. `…/catalog/book/{number}` opened the page and kept the address. After a new version saved "harbour-2" and was published, `…/catalog/book/harbour` answered 500 with a blank page to a visitor, while `…/harbour/version/{id}` still opened; while "harbour-2" sat on the unpublished version, `…/catalog/book/harbour-2` answered the same to a visitor and the Press manager. The chapter page's cover and "Volume" linked `…/catalog/book/{number}`.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-28 (Rule 3; A2): "404 Not Found" for a visitor and a Reader at an unpublished book in Production and its version address, a book scheduled for 2031-01-10 and its version address, and a book whose only published version is "Author Original 1.0" (made on screen) at its book address and both version addresses; the catalog listed none of them. The Press manager and the Site Administrator got the Author Original book's page with no notice.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-28 (Rule 3a; A1): signed out, `catalog/book/999999`, `…/no-such-path`, `…/0` and `…/999999/version/1` landed on Login; the seeded Reader got `user/authorizationDenied` reading "An invalid published submission was specified.", with no heading and the tab "| Public Knowledge Press". OJS `article/view/999999` and OPS `preprint/view/999999` answered "404 Not Found" to both.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-28 (Rule 4; A3): older versions at `…/version/{publication id}`, the ids the "Versions" links carry; a new unpublished version's address answered 404 to a visitor and a Reader; `version/999999`, another book's version id and `version/abc` answered 500 with a blank page to a visitor, a Reader, the Press manager and the Site Administrator.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-28 (Rule 5; A4): with no date saved the preview had no "Published" and no "Versions"; with a date saved, "Published" and the date ("Forthcoming" for 2031-01-10) and a "Versions" heading over an empty list. "View submission" (`dashboard/editorial?workflowSubmissionId={id}`) took the Press manager and the Site Administrator to the workflow, gave the book's Author the access-denied page, and an unassigned Series editor and Copyeditor the Submissions page behind an "Error" window. A new version's preview showed both notices, the second "…published on 2026-09-28.", the new version's date being empty.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-28 (Rule 6; A5): the older version "Tides" opened from "Versions" read "This is an outdated version published on 2024-03-05. Read the most recent version." ("…05-03-2024." after "Date (Short)" d-m-Y); heading "Tides", tab "Tides Revised | …"; "most recent version" opened the book's address.

<a id="fn-h"></a>
**h** — `monograph_full.tpl` `.item.date_published`: the label is `catalog.forthcoming` "Forthcoming" when the publication's `datePublished` (as `Y-m-d`) is after today's, `catalog.published` "Published" otherwise (pkp-lib#10169 fixed the comparison here); `$firstPublication` is computed in `book()` by reducing every publication of the submission (published or not) to the earliest `datePublished` (a publication without a date compares as earliest); the value is `submission.updatedOn` "{$datePublished} — Updated on {$dateUpdated}" with `$dateFormatLong` otherwise the first date alone. Versions: `array_reverse($monograph->getPublishedPublications())`, each `submission.versionIdentity` "{$datePublished} ({$version})" with `$dateFormatShort` and `versionString`; the list sits inside the date block, so a publication without a date shows neither. Seed fact (scenarios.md, `datePublished`): OMP shows "March 5, 2024" and "2024-03-05 (Version of Record 1.0)". A publication without a date prints as today: lib/pkp `PKPTemplateManager::smartyDateFormat()` formats it through `new Carbon(null)` (22c03902e1, 2024-09-06). Live-probed 2026-09-28: see td9, td23.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-28 (Rule 8): one version "March 5, 2024"; a second one published on the day "March 5, 2024 — Updated on September 28, 2026", "September 28 2026 — …" after the long format "F j Y" was chosen; the Press manager's preview of a book scheduled for 2031-01-10 "Forthcoming" "January 10, 2031". Right after "Create New Version" the live page read "September 28, 2026 — Updated on March 5, 2024", and with an unpublished third version "September 28, 2026 — Updated on September 28, 2026".

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-28 (Rule 9): one version: "Versions" with "2024-03-05 (Version of Record 1.0)" in plain text; two: newest first, the shown one plain, the current one linking to the book's address, the older to `…/version/{id}`; a third, unpublished version and a second one unpublished again were not listed; "28-09-2026 (Version of Record 1.1)" after a short-format change.

<a id="fn-i"></a>
**i** — Table of contents: `monograph_full.tpl` `.item.chapters` over `ChapterDAO::getByPublicationId()` (the chapter list's `seq`); the title link when `isPageEnabled()`, to `catalog/book/{bestId}/chapter/{sourceChapterId}` or `…/version/{pid}/chapter/{sourceChapterId}`; the authors line when `$authorString != $chapter->getAuthorNamesAsString()`, where `$authorString` is `Publication::getAuthorString()` ("{name} ({roles})" joined by "; ") and the chapter's is the bare names joined by ", ", so the two never match; the chapter's DOI `doiObject` (or a sibling version's); chapter files `pluck_files by="chapter"`, then per `$publicationFormats` `by="publicationFormat"`, the link through `downloadLink.tpl`. Side column: `CatalogBookHandler::book()` keeps formats with `getIsAvailable()` (remote ones also in `remotePublicationFormats`) and files whose `directSalesPrice` is not null in an available format (`availableFiles`); `publicationFormats.tpl` prints a remote format (`urlRemote`, `target="_blank"`, not on a chapter page), a single file as `pub_format_single`, several as the format's name then per file `span.name` and a `downloadLink.tpl` with `useFilename=true`. `downloadLink.tpl`: with `useFilename` the file's name alone; otherwise, when `getDirectSalesPrice()` and `$currency`, the bare price followed by `payment.directSales.purchase` "Purchase {$format} ({$amount} {$currency})" (OMP `locale/en/locale.po`), else the format's name; the address `catalog/view/{bookBestId}/{formatBestId}/{fileBestId}` or with `version/{pid}` when the publication is not the current one. Incidental (U73 claim check K3, 2026-09-28): "25.00 Purchase PDF (25.00 USD)"; a two-file format listed "replacement.pdf", "article.pdf" where a one-file format read "PDF". Live-probed 2026-09-28: see td10, td11; the side column listed a press's formats in the Publication Formats page's order, and after a format was set "Not Available", or its approval revoked, the page and the side column both moved it last. Only the seeded chapter order was read; a new order dragged on the Chapters page was not reached.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-28 (Rule 10; A6): "Tides" (page ticked, subtitle "Low and high") a link to `…/chapter/{n}`, "Harbours" and "Coda" plain text; a single-author book showed its author under each chapter with authors, a two-contributor book's chapter credited to both "Ada Author, Lee Second", a chapter with no authors no name; each chapter's file links under the chapter only, none in the side column; the chapter's DOI "DOI: https://doi.org/10.1234/…" as a link.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-28 (Rule 11b; A8): format "Two" read "Two", "replacement.pdf" with a link "replacement.pdf", "article.pdf" with a link "article.pdf"; the priced file's link had no price and no "Purchase", and led a visitor to Login and a Reader to "Manual Fee Payment" ("Fee" "25.00 (USD)"); the free one opened its view page.

<a id="fn-p"></a>
**p** — `monograph_full.tpl` `.item.publication_format`, per available format `{if $publicationFormat->getIsApproved()}`, skipped when it has no identification codes, no publication dates, no stored public identifier or DOI and is not physical; the heading `monograph.publicationFormatDetails` "Details about the available publication format: {$format}" (screen reader) plus the visible `.item_heading` name when `count($publicationFormats) > 1`, else `monograph.miscellaneousDetails` "Details about this monograph"; codes `IdentificationCode::getNameForONIXCode()` (ONIX list 5) and value; dates `PublicationDate::getNameForONIXCode()` and `getReadableDates()` (a range joined by an em dash; "Hijri Calendar" under a Hijri date); public identifiers labelled with the plugin's raw `getPubIdType()` (U44's OMP2); the format's DOI with `doi.readerDisplayName`; `monograph.publicationFormat.productDimensions` "Physical Dimensions" with `getDimensions()` (width, height, thickness each followed by its unit code, joined by `monograph.publicationFormat.productDimensionsSeparator` " x "). Seed-facts (U44 claim check K4, 2026-09-24): the block shows only once the format reads "Approved" and "Available". Live-probed 2026-09-28: see td12; a date seeded without a format read "2024-03-05" with "Hijri Calendar" under it, one in "YYYYMMDD" "2024-03-05" alone; the URN block read "other::urn" with the URN as plain text, the DOI line "DOI:" with a link.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-28 (Rule 12): one block, for "Paperback", with the visible heading "Paperback" and the screen-reader heading "Details about the available publication format: Paperback", the labels "ISBN-13 (15)" and "Publication date (01)", "Physical Dimensions" "130mm x 200mm" ("150mm x 230mm x 20mm" with a thickness); "PDF" (approved, nothing else) no block; a single available format "Details about this monograph". "Paperback" set "Awaiting Approval": its block gone, its and a remote format's links still listed.

<a id="fn-j"></a>
**j** — `CatalogBookHandler::view()` calls `download(…, true)`. `download()` answers not found for a format that is missing, not available or remote, a publication not published or not the format's, a file not of the format or with a null `directSalesPrice`; a dependent file of an HTML file and a publication's media file are served early. For a free file (`directSalesPrice === '0'`) or one the user has paid (`OMPCompletedPaymentDAO::hasPaidPurchaseFile()`): a signed-out user on a press with `restrictMonographAccess` is sent to Login (`Validation::redirectLogin()`); `view` offers the file to `CatalogBookHandler::view` (pdfJsViewer takes `application/pdf`, htmlMonographFile `text/html`); then `CatalogBookHandler::download` (htmlMonographFile serves `text/html`; pdfJsViewer only sets `inline`); otherwise the usage event is built with `publication: $this->publication`, a typed property `download()` never sets, so every such download throws "Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization" before `app()->get('file')->download()`. `restrictMonographAccess` is OMP `UserAccessForm`'s `manager.setup.restrictMonographAccess` "Users must be registered and log in to view open access content." (OMP `locale/en/manager.po`). Seed-facts (2026-09-28, U73 claim check K3, K4; U54 claim check K1, K4): every `catalog/download/…` answers 500, the view page logs "PDFJS is not defined"; U47 claim check K2 (2026-09-24): with "HTML Monograph File" off an HTML file answered 500 with a blank page. Live-probed 2026-09-28: see td13.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-28 (Actors row 3; Rule 13; A9): signed out, "PDF" opened the PDF view page, "HTML" the HTML view page, an EPUB or a "notes.md" file's link a blank page (500); with "PDF.js PDF Viewer" or "HTML Monograph File" switched off by the Press manager, their links answered 500 with a blank page; the same on a chapter page's file link and for a signed-in Reader. On a press with "…view open access content." ticked, "PDF" sent a visitor to `login?source=/index.php/{press}/catalog/view/…`, and signing in there as a Reader landed on the PDF view page. An older version's file carried "This is an outdated version published on 2026-09-28. …" on both view pages, whose link opened the current page, while the book's date line read "September 28, 2026"; a changed short date format was not tried on the view pages.

<a id="fn-k"></a>
**k** — Fall-through of `CatalogBookHandler::download()` for a priced, unpaid file: no user → redirect to Login with `source` the file's `view` address; `OMPPaymentManager::isConfigured()` (the chosen plugin's `isConfigured()`, the manual plugin needing `manualInstructions`, PayPal `accountName`, and the context's `currency`) false → redirect to `catalog`; otherwise `createQueuedPayment(PAYMENT_TYPE_PURCHASE_FILE, …)` with `setRequestUrl()` `catalog/view/{submissionId}/{formatId}/{fileId}`, `queuePayment()` and the plugin's payment form. `paymentsEnabled` is read by no OMP code but the form's `showWhen`. Manual plugin (`plugins/paymethod/manual`): `paymentForm.tpl` ("Manual Fee Payment", "Title" `getPaymentName()` = the file's name, "Fee" `%.2f` with the currency code, `plugins.paymethod.manual.sendNotificationOfPayment`); `handle()` op `notify` sends `ManualPaymentNotify` and shows `message.tpl` with "Payment Notification", "Payment notification sent" and `common.continue` to the queued payment's request URL. `OMPPaymentManager::fulfillQueuedPayment()` writes the completed payment that `hasPaidPurchaseFile()` reads, reached from PayPal's return through `pages/payment/PaymentHandler::plugin()`; OMP has no `pages/payments`, and nothing in OMP completes a manual payment (Payments & APCs, its note b). The settings form: `PKPPaymentSettingsForm`. Live-probed 2026-09-28: see td14, td15. With "Paypal Fee Payment" and only "Account Name" saved ("Client ID" and "Secret" empty), a Reader's priced link opened a page with the tab "| {press name}", no heading and "A transaction error occurred. Please contact the press manager for details.", and the browser made no outside request; being sent on to PayPal, and a paid file opening free afterwards, need a live PayPal account a test install does not reach. The "Payments" tab on a new press showed "Enable" alone. The Press manager, a Series editor, a Copyeditor, a Reviewer, an Author, a Reader and the Site Administrator each got "Manual Fee Payment" from the priced link.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-28 (Actors rows 4, 5; Rule 14; Fields, the payment page; A18): the link read "25 Purchase PDF (25 USD)" (price typed "25"). Signed out it led to Login, and signing in there as a Reader landed on the press's home page, for "PDF" and for a several-file format's priced file. The Reader's payment page: "Manual Fee Payment", the press's instructions, "Title" "article.pdf", "Fee" "25.00 (USD)"; "Send notification of payment" led to "Payment Notification", "Payment notification sent" and "Continue", and "Continue" to the payment page again. No "Payments" in the Press manager's menu; `{press}/payments` answered 404. A press with no currency: link "PDF", to the catalog; USD without instructions: "25 Purchase PDF (25 USD)", to the catalog. Live-probed 2026-09-29, two runs, a press with USD, "Manual Fee Payment" and instructions (Actors row 4; Rule 14; Fields, the payment page; A18): signed out, the link led to `login?source=http://…/catalog/view/{id}/{format}/{file}`, a Login page with only "Required fields are marked with an asterisk: *" above the form; signing in there as a Reader landed on `{press}/index`, as the Press manager on `dashboard/editorial`, headed "Assigned to me (0)", tab "Submissions"; the Reader, signed in, pressing the link again got the payment page at once. That page: "Home / Manual Fee Payment", "Manual Fee Payment", the instructions, then a borderless table with "Title" and "Fee" and their values in bold, then "Send notification of payment" as an underlined text link (`paymentForm.tpl`); a journal's page, same run, showed a bordered table with the labels in bold, the instructions under it and the link styled as a button, and its Login page read "Subscription or article purchase required to access item. …".

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-28 (Rule 14b; A12): "Enable" unticked and saved ("Saved"); after a reload the tab showed "Enable" alone; the Reader's and a visitor's link still read "25 Purchase PDF (25 USD)", and it still opened "Manual Fee Payment".

<a id="fn-l"></a>
**l** — `CatalogBookHandler::setChapter()` finds the chapter by `getBySourceChapterId()` within the shown publication (not found otherwise); `book()` answers not found when `!isPageEnabled()` (`Chapter::isPageEnabled()` true for the stored flag or a DOI). Dates: `$datePublished` is the chapter's `datePublished` when `getEnableChapterPublicationDates()` and set, else the publication's; `$firstDatePublished` from `getChaptersFirstPublishedDate()` (the source chapter's publication, with the chapter's own date under the same rule). `chapter.tpl` labels "Forthcoming" when `$publication->getData('datePublished')|date_format:$dateFormatShort > $smarty.now|date_format:$dateFormatShort`, a string comparison in the press's short format. Versions only when `count(getPublishedPublications()) > 1`; `$chapterPublicationIds` are the publications whose copy of the chapter has its page; suffixes `submission.chapterCreated` " — Chapter created" and `submission.withoutChapter` "{$name} — Without this chapter" (OMP `locale/en/submission.po`). The notice links to `catalog/book/{bestId}/chapter/{sourceChapterId}` when the current publication is among `$chapterPublicationIds`, else to the book. The older-version chapter page throws in `ChapterDAO::getCurrentPublicationChapterDoi()` (`count()` on an integer, called from `CatalogBookHandler.php` line 189) unless the press has DOI versioning on (A19). Live-probed 2026-09-28: see td16, td17; "Tides" is `/chapter/61` in both versions; an unticked chapter, a removed one, an unknown number, another book's chapter number and an unpublished book's chapter (for a visitor) answered 404. On a published chapter with a DOI, "Chapter Page" unticked and saved reopened ticked and the page stayed.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-28 (Rule 16a; A13): under "d/m/Y" a 2024-12-31 book's chapter read "Forthcoming", its book "Published"; a 2024-03-05 book's chapter "Published"; a chapter of a book scheduled for 2027-01-15 "Published" in the Press manager's preview, its book "Forthcoming". Under the default format that scheduled chapter read "Forthcoming", and a visitor got 404. With "Each chapter may have its own publication date." a chapter dated 2024-06-01 read "June 1, 2024", one without its own date the version's "December 31, 2024"; "All chapters…" gave both the version's date.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-28 (Rules 15a, 16, 17, 18; A19, A20), on a press with "DOI Versioning" "Yes": "Tides"' current "Versions" read "2026-09-28 (Version of Record 1.1)" plain and "2024-03-05 (Version of Record 1.0)" as a link; "Harbours" (added in version 2) "2026-09-28 (Version of Record 1.1) — Chapter created" and version 1 plain; "Coda" (removed in version 2), at its older address, "2026-09-28 (Version of Record 1.1) — Without this chapter". The older chapter page's notice led to "Tides"' current page, and for "Coda" to the book's; its cover and "Volume" to `…/version/{id}`. On a press left at "No" the older chapter address answered 500 with a blank page, typed and from "Versions". With chapter dates, "Tides"' current page read "June 1, 2024 — Updated on June 1, 2024"; without, "Reef" "March 5, 2024 — Updated on September 28, 2026"; "Harbours" "September 28, 2026".

<a id="fn-m"></a>
**m** — `CitationStyleLanguagePlugin::getTemplateData()` (OMP branch: submission, publication, chapter from the hook), `getCitation()` with `setDocumentType()`: a book (`type` book, `setBookAuthors()` mapping the contributor role identifiers EDITOR, TRANSLATOR, AUTHOR, `addSeriesInformation()` collection title, `seriesPosition` as volume and the series editors, `publisher` the press's name, `serialNumber` from approved formats' codes, `URL` `catalog/book/{urlPath or id}`); a chapter (`type` chapter, chapter authors as author and the book's as container-author, dropped when equal, `container-title` the book's title, pages, URL with `/chapter/{sourceChapterId}`). `citation-block.blade` with `submission.howToCite` and the formats list as on an article. `pages/CitationStyleLanguageHandler::setupRequest()` lets an unpublished submission through only for managers, the Site Administrator and assigned sub-editors or assistants (`canUserAccess()`). A book with no contributor has no author to cite and opens with its title. Live-probed 2026-09-28: see td18.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-28 (Actors row 6; Rule 19; A14, A21, A22): APA "Quillfeather, A., & Second, B. (2024). Tides (Vols. 3). K5 Press …. {address}"; MLA without the series; BibTeX "series={Monographs}", "volume={3}", RIS "T3 - Monographs"; an Edited Volume "Quillfeather, A. (2024). Edited Book (L. Editor, Ed.; T. Translator, Trans.)."; a chapter "Quillfeather, A. (2024). Tides: Low and high. In A. Quillfeather & B. Second, K5 Chapter Book (Vols. 3, pp. 1-20)."; an Edited Volume's chapter "In L. Editor (Ed.), & T. Translator (Trans.), Edited Book (pp. 1-10)"; a DOI link ends the citation where there is one; a download is named after the book's title, on a chapter page too ("Tides.bib"). A later version's chapter "Harbours", added in 2026: "(2026). Harbours. … (Original work published 2024)". A book a Press manager submitted without a contributor: "Manager Book. (2024). {press name}. {address}". On a preview, "MLA" changed the text and "BibTeX" downloaded for the Press manager, Press editor, Production editor, the Site Administrator and an assigned Series editor and Copyeditor; for the book's Author and an unassigned Series editor and Copyeditor the format's request answered 404 and "BibTeX" opened "404 Not Found".

<a id="fn-n"></a>
**n** — `monograph_full.tpl` `.item.downloads_chart` when the active theme's `displayStats` is not `none`, `displayUsageStatsGraph($monograph->getId())`, the canvas and `.usageStatsUnavailable` ("Download data is not yet available.") as on an article; `chapter.tpl` has no chart. Live-probed 2026-09-28: see td19.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-28 (Rule 20; Settings bullet 5): with "bar", a book without downloads showed "Downloads" with a bar chart of zeros from January, and never "Download data is not yet available."; "line" drew a line chart; a chapter page had no chart. A book with downloads in July 2025 and September 2026 showed twelve months and "All time", which widened the chart to 21 months from "Jan 2025" and then read "Last 12 months". Seeded downloads, 2 and 1 of the "Book Manuscript" PDF and 5 of an "Appendix" file, charted 3. The OJS and OPS pages drew their zeros the same way.

<a id="fn-o"></a>
**o** — OMP `locale/fr_CA`: empty `msgstr` for `submission.plainLanguageSummary`, `plugins.themes.default.displayStats.downloads`, `catalog.published`, `catalog.forthcoming`, `catalog.categories`, `catalog.manage.series.onlineIssn`, `catalog.manage.series.printIssn`, `catalog.viewableFile.title`, `catalog.viewableFile.return`, `doi.readerDisplayName`, `chapter.volume`, `chapter.pages`, `submission.chapterCreated`, `submission.withoutChapter`, `submission.editorName`, `submission.authorListSeparator`, `monograph.publicationFormatDetails`; `payment.directSales.purchase` reads "Achat ({$amount} {$currency})" with no format. Translated: `submission.synopsis` "Synopsis", `series.series` "Séries", lib/pkp's `submission.versions`, `common.keywords`, `submission.outdatedVersion`, `submission.viewingPreview`. Incidental (U10 claim check K1, 2026-09-24): "24.09.2026 (##publication.versionStage.display##)" and "##catalog.published##" on a press's book page, under a short date format other than the default. Live-probed 2026-09-28: see td20.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-28 (Rule 21; A15): a new press offers no language choice in its header; the French pages were opened with "fr_CA" in the address. The raw codes Rule 21 lists; "2026-09-28 (##publication.versionStage.display##)##submission.chapterCreated##" and "##submission.withoutChapter##" alone; "25.00 Achat (25.00 USD)"; "Ceci est une version obsolète publiée le 2024-03-05. Consulter la version la plus récente." and "Ceci est un aperçu et n'a pas été publié. Afficher la soumission" translated; the English pages showed no raw code. The French file view page failed as in English (A9). The OJS and OPS French item pages read "2026-09-28 (##publication.versionStage.display##)" too.

<a id="fn-q"></a>
**q** — `CatalogBookHandler::book()` fires `UsageEvent` with `ASSOC_TYPE_SUBMISSION` for the book's page and `ASSOC_TYPE_CHAPTER` for a chapter page; the file download's event is the failing line of note j. `ManualPaymentNotify` (template key `MANUAL_PAYMENT_NOTIFICATION`, installed by the plugin's `emailTemplates.xml`) is sent from the user to the press's `contactEmail`/`contactName`, subject and body from `plugins/paymethod/manual/locale/en/emails.po` in the press's primary language. No other mail or notification is raised by these handlers. Live-probed 2026-09-28: see td25; the day's usage log gained one book line per book page opened and one chapter line per chapter page, and none for a file pressed ("PDF", "HTML", another file), where OJS and OPS log one per galley view and download.

<a id="fn-td25"></a>
**td25** — Live-probed 2026-09-28 (Side effects): from "Rae Reader" at the buyer's address to "Pat Contact", the principal contact, no copy; subject "Manual Payment Notification"; the body as quoted, with the press's name, the buyer's name and username, "article.pdf" and "The cost is 25 (USD)." (the payment page "25.00 (USD)"); a second press sent a second message. "Manage Emails" has no row for it (33 rows; "Payment" finds "No items found."). The Reader's reading, file opening, citation download and payment page moved no mailbox and showed no notice.

<a id="fn-r"></a>
**r** — Plugin defaults: `plugins/generic/pdfJsViewer/settings.xml` and `plugins/generic/htmlMonographFile/settings.xml` install `enabled` true per press; the Citation Style Language plugin declares none (off). Display names: "PDF.js PDF Viewer", "HTML Monograph File", "Citation Style Language" (each plugin's `locale/en/locale.po`). Seed-facts (U13 claim check K2, 2026-09-25): "PDF.js PDF Viewer" and "HTML Monograph File" arrive ticked on a press; the Citation Style Language plugin is off on a scratch context (U07 claim check K2, 2026-09-23). "View Monograph Content" group: seed-facts note of U48 claim check K2, 2026-09-25. Live-probed 2026-09-28 (Settings bullets 1–3, 6; Actors row 7): on a new press "PDF.js PDF Viewer" and "HTML Monograph File" arrive ticked and "Citation Style Language" unticked; unticking a plugin asks "Are you sure you want to disable this plugin?"; the Press manager and the Press editor open "Plugins", "Appearance" and "Payments", and a Series editor gets "The current role does not have access to this operation." there; "…view open access content." sits under "View Monograph Content", unticked on a new press.

<a id="fn-s"></a>
**s** — Scenario seeding. Every press, journal and server is a scratch
context from `POST scenarios/context` with throwaway `users[]` (passwords
the username twice, `docs/process/users.md`): a `manager` (Press manager),
an `author` (the books' submitter, `givenName: 'Ada', familyName:
'Quill'`, so that her own contributor entry reads "Ada Quill") and, where
a scenario names them, a `reader` (Reader), a `reviewer` (External
Reviewer) and a second `author2` (Author); the visitor is signed out.
Every book is a scratch submission from `POST scenarios/submission` with
`author` as `submitter`, `submitted: true`, `decisions:
['skipExternalReview', 'sendToProduction']`, `published: true` and
`datePublished: '2024-03-05'`; "Lee Marsh" is `contributors: [{givenName:
'Lee', familyName: 'Marsh', email: 'lee.marsh@mail.test'}]`, named by that
address in `chapters[].authors`. Formats seed through
`publicationFormats[]` (approved and available, a file on "Open Access"
unless `price` is given), chapters through `chapters[]`.
Scenario 1: the press with `series: [{path: 'monographs', title:
'Monographs'}]` and `categories: [{path: 'history', title: 'History'}]`;
the book with `subtitle`, `abstract`, `keywords: ['alpha', 'beta gamma']`,
`plainLanguageSummary`, `series: 'monographs'`, `categories: ['history']`,
`urlPath: 'shorelines'` and `publicationFormats: [{name: 'PDF', file:
'article.pdf'}, {name: 'Online', urlRemote:
'https://example.org/shorelines'}, {name: 'Paperback', physical: true,
identificationCodes: [{type: 'ISBN-13 (15)', value:
'978-951-98548-9-2'}], publicationDates: [{role: 'Publication date (01)',
date: '20240305'}], metadata: {productComposition: 'Single-component
retail product (00)', width: 130, height: 200}}]` (no `dateFormat`, so the
window's preselected "YYYYMMDD (H)"); "Bare" with `title`, `abstract`
and no other key. Scenario 2: the press with `enabledDoiTypes:
['publication', 'chapter']`, `doiPrefix: '10.1234'` and `themeOptions:
{displayStats: 'bar'}`; "Coastlines" with the two formats (`{name: 'PDF',
file: 'article.pdf'}`, `{name: 'Chapter PDF', file: 'replacement.pdf'}`)
and `chapters: [{title: 'Tides', subtitle: 'Low and high', abstract: 'How
the sea rises and falls.', pages: '1-20', page: true, authors: [Lee
Marsh], files: ['publicationFormats.1']}, {title: 'Harbours'}]`, the
publish making a DOI for the chapter with its page alone, and the
response's `chapters[].id` being the number a chapter's address takes
("Tides" seeded as 53 opened at `…/chapter/53`), which the control uses
for "Harbours"; "Reef Notes"
with `enableChapterPublicationDates: true` and `chapters: [{title: 'Reef',
datePublished: '2024-06-01', page: true}, {title: 'Lagoon', page:
true}]`. Scenario 3: `[{name: 'PDF', file: 'article.pdf'}, {name: 'HTML',
file: 'article.html'}]`. Scenario 4: the press with `payments: {currency:
'USD', paymentPluginName: 'ManualPayment', manualInstructions: '…'}` and
`context.contactName` / `contactEmail` for the principal contact;
`[{name: 'PDF', file: 'article.pdf', price: '25'}]`; the "Manual Payment
Notification" is sent at once, not queued, so the mail catcher is read
with no job queue run (test run 2026-09-28). Scenario 5: "Draft Tides" without
`published` (it rests in Production), the unfinished submission with
`submitted: false`, "Shorelines" published; the other Author is `author2`.
Scenarios 6 and 7: the first version seeded as above ("Tides"; "Coastlines"
with `chapters: [{title: 'Tides', page: true}, {title: 'Coda', page:
true}]`), then, as `manager`, "Create New Version"
(`PublicationPages.createNewVersion`), for scenario 6 the title changed
to "Tides Revised" on "Title & Abstract", for scenario 7 "Coda" deleted
and "Harbours" added with "Chapter Page" ticked on the version's Chapters
page, and the version published on screen that day; scenario 7's press
with `doiPrefix: '10.1234'` and `doiVersioning: true`. Scenario 8: the
press with `enableDois: false` and `plugins: {citationstylelanguageplugin:
{enabled: true}}`; `chapters: [{title: 'Tides', pages: '1-20', page:
true, authors: [Lee Marsh]}]`; its control on a scratch press with no
`plugins` key. Scenario 9: the press with `restrictMonographAccess:
true`. Scenario 10: OJS with `publishingMode: 'subscription'` and
`payments: {currency: 'USD', paymentPluginName: 'ManualPayment',
manualInstructions: '…', purchaseArticleFee: 5}` and `issues: [{volume:
1, number: 1, year: 2026, published: true}]` (an issue made under the
subscription mode takes "Subscription" access, which is what puts the
price on the galley link; with no issue the article's galleys carry no
price, `ArticleHandler` requiring a subscription only through an issue;
test run 2026-09-28, as U69 claim check K1 seeded it),
the article `published: true` into that issue (the submission's `issue`)
with `galleys: [{label: 'PDF', file: 'article.pdf'}]`;
OPS with the preprint `published: true` and `galleys: [{label: 'PDF',
file: 'preprint.pdf'}]`; the control on an OMP scratch press.
Live-probed 2026-09-28: `publicationFormats[]` (with `price`,
`urlRemote`, `physical`, `identificationCodes[]`, `publicationDates[]`,
`metadata`), `chapters[]` with `page` and `files`, `series`,
`categories`, `urlPath`, `datePublished`, `contributors[]`, and the
press's `payments`, `plugins`, `themeOptions`, `restrictMonographAccess`
and `doiVersioning` each seeded the state it names; a second version was
made on screen with "Create New Version".

<a id="fn-f-a1"></a>
**f-a1** — Note g (policy failure → Login or `user/authorizationDenied`). An unpublished book's address is refused later, in `book()`, with not found. Live-probed 2026-09-28, signed out and signed in (td4).

<a id="fn-f-a2"></a>
**f-a2** — Note g (`getStatusByPublications()` needs a published Version of Record); `canPreview()` lets the Press manager and the Site Administrator in, and the shown publication is published, so no preview notice prints. Live-probed 2026-09-28 (td3): the book's page answered 404 to a visitor and a Reader and opened as published for the Press manager and the Site Administrator; the workflow showed the Author Original "Status: Published", the Version of Record "Status: Unpublished", and neither "View" nor "Preview". The catalog's leaving it out is Catalog browse's Rule 3.

<a id="fn-f-a3"></a>
**f-a3** — Note g: the uninitialized typed property `CatalogBookHandler::$publication` when `version/{id}` matches no publication of the submission; the log reads "Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization" (`CatalogBookHandler.php` line 122). The typed property dates from omp `29fa88508` (2025-03-20). Live-probed 2026-09-28 (td6): 500 for every id tried and every role.

<a id="fn-f-a4"></a>
**f-a4** — `monograph_full.tpl` prints `submission.viewingPreview` for any unpublished publication and `submission.outdatedVersion` for any publication that is not the current one, with that publication's empty `datePublished`, which prints as today (note h). Live-probed 2026-09-28 (td7).
Issue report: [docs/issues/U13-OPS1-new-version-preview-called-outdated.md](../issues/U13-OPS1-new-version-preview-called-outdated.md).

<a id="fn-f-a5"></a>
**f-a5** — `book.tpl` builds the page title from `getCurrentPublication()`. The same holds on an article's page (Article landing page & reading, its A6). Live-probed 2026-09-28 (td8).

<a id="fn-f-a6"></a>
**f-a6** — Note i: `$authorString` carries the role names in brackets, the chapter's string does not; since the credits gained role names the check never matches. Live-probed 2026-09-28 (td10).

<a id="fn-f-a7"></a>
**f-a7** — `downloadLink.tpl` prints `{$downloadFile->getDirectSalesPrice()}` before `payment.directSales.purchase`, which carries the amount again. Seen 2026-09-28 (U73 claim check K3). Live-probed 2026-09-28: a price typed "25" reads "25 Purchase PDF (25 USD)", so the number shows as typed.

<a id="fn-f-a8"></a>
**f-a8** — `publicationFormats.tpl` prints `span.name` and then `downloadLink.tpl` with `useFilename=true`, which skips the price branch. The two-file listing by file name seen 2026-09-28 (U73 claim check K3). Live-probed 2026-09-28 (td11): the priced file among two.

<a id="fn-f-a9"></a>
**f-a9** — Note j: every free-file download reaches the `UsageEvent` built with the never-set `$this->publication`; `view` of a PDF shows the pdfJsViewer page, whose inline `PDFJS` script fails and whose viewer loads the failing download. The typed property dates from omp `29fa88508` (2025-03-20, pkp/pkp-lib#10671); the event's `publication: $this->publication` argument from omp `591d7a0e7` (2026-08-26, pkp/pkp-lib#12311, "pass publication to usage event"), which set it in `book()` but not in `download()`. Live-probed 2026-09-26 (U20 claim check), 2026-09-27 (U64), 2026-09-28 (U73 claim check K3, K4, three runs): `GET {press}/catalog/download/{book}/{format}/{file}`, with and without `?inline=1`, current or older version, answered 500 with the log line above; the view page logged "PDFJS is not defined" and "UnexpectedResponseException". Live-probed 2026-09-28 (td13, td22; two runs of each drive): 22 download 500s and 9 view 500s across the runs, "PDFJS is not defined" and "UnexpectedResponseException" on every PDF view page; the bar's "Download" and the viewer's both cancelled; the French view page (`{press}/fr_CA/catalog/download/…?inline=1`) the same. The same failure is recorded where it shows elsewhere: Search engine metadata & analytics' OMP6, Usage statistics' OMP3, Media files' OMP1 (HTML plugin off).

<a id="fn-f-a10"></a>
**f-a10** — Note f: `monograph.return` is defined in no locale file of OMP, lib/pkp or the plugin. Live-probed 2026-09-28 (td21).

<a id="fn-f-a11"></a>
**f-a11** — Note k. The manual plugin's own description reads "The manager will manually record receipt of a user's payment (outside of this software)."; nothing in OMP calls `fulfillQueuedPayment()` for a manual payment. The OMP purchase path dates from the early direct-sales work, and the missing record may be long-standing, hence ❓. Live-probed 2026-09-28 (td14): "Continue" led back to the payment page and the Reader's link stayed priced; the Press manager's menu has no "Payments", and `{press}/payments` and `{press}/management/settings/payments` answered 404, where OJS's `{journal}/payments` opens its payment lists and OPS has none.

<a id="fn-f-a12"></a>
**f-a12** — Note k: `paymentsEnabled` is read only by the form's `showWhen`; `OMPPaymentManager::isConfigured()` ignores it, where OJS's payment paths check it. Live-probed 2026-09-28 (td15).

<a id="fn-f-a13"></a>
**f-a13** — Note l: `chapter.tpl` compares `date_format:$dateFormatShort` strings, where `monograph_full.tpl` compares `Y-m-d` (pkp-lib#10169 fixed only the book page). Live-probed 2026-09-28 (td16): both directions.

<a id="fn-f-a14"></a>
**f-a14** — Note m: `getCitation()` sets the CSL `original-date` from `$submission->getOriginalPublication()` whenever its date differs from the shown version's, for a chapter as for the book, and the APA style prints it as "Original work published {year}". Live-probed 2026-09-28 (td18).

<a id="fn-f-a15"></a>
**f-a15** — Note o. Seen 2026-09-24 (U10 claim check K1): the version names and "Published". Live-probed 2026-09-28 (td20): every label Rule 21 lists.

<a id="fn-f-a16"></a>
**f-a16** — Note g: the forward to the current URL Path passes a string to `PKPRequest::redirect()`, whose path argument is `?array` since lib/pkp bee9547b49 (2024-06-26); the log reads "Uncaught TypeError: PKP\core\PKPRequest::redirect(): Argument #4 ($path) must be of type ?array, string given, called in pages/catalog/CatalogBookHandler.php on line 132". Live-probed 2026-09-28 (td2): `{press}/catalog/book/harbour` and `…/harbour-2` answered 500. A regression: the forward worked before that change.

<a id="fn-f-a17"></a>
**f-a17** — `chapter.tpl` prints only `submission.outdatedVersion`; `submission.viewingPreview` is in `monograph_full.tpl` alone. Live-probed 2026-09-28 (td5): the chapter page read "… Volume K1 Unpublished Book Published March 5, 2024 How to Cite …" with no notice for every previewing role.

<a id="fn-f-a18"></a>
**f-a18** — Note k: `CatalogBookHandler::download()` sends a signed-out buyer to Login with `source` built by `$request->url()`, a full address, and `LoginHandler::signIn()` follows only a `source` starting with "/", so `_redirectAfterLogin()` (its dashboard branch needs an empty `source`) falls back to `PKPPageRouter::getHomeUrl()`, the user's home by role: the press's index for a Reader, `dashboard/editorial` for a manager, sub-editor or assistant role, `dashboard/reviewAssignments` for a Reviewer, `dashboard/mySubmissions` for an Author (the last two untried); a free file's Login (`Validation::redirectLogin()`) carries a path. Live-probed 2026-09-28 (td13, td14): the priced file's Login address carried `source=http%3A%2F%2F…`, the free file's `source=%2Findex.php%2F…`. Live-probed 2026-09-29 (td14): the Press manager's sign-in went to `dashboard/editorial`.

<a id="fn-f-a19"></a>
**f-a19** — Note l. Live-probed 2026-09-28 (td17): 500 at `{press}/catalog/book/{id}/version/{id}/chapter/{n}`, typed, from the older version's table of contents and from "Versions", with the book named by number or URL Path, on every press left at "DOI Versioning" "No"; the same page opened on a press seeded with it "Yes".

<a id="fn-f-a20"></a>
**f-a20** — Note l: a new version copies each chapter with its `datePublished`, and the first date is the source chapter's. Live-probed 2026-09-28 (td17).

<a id="fn-f-a21"></a>
**f-a21** — Note m: `CitationStyleLanguageHandler::setupRequest()` lets an unpublished submission through only for managers, the Site Administrator and assigned sub-editors or assistants, while the block itself shows to everyone `canPreview()` admits. Live-probed 2026-09-28 (td18).

<a id="fn-f-a22"></a>
**f-a22** — Note m: `seriesPosition` is passed as the CSL `volume`, which the APA style prints as "(Vols. {n})". Live-probed 2026-09-28 (td18).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The book's page, current and older versions | `{press}/catalog/book/{id or urlPath}`, `…/version/{publicationId}` | ROUTE-055 (op `book`), AFFR-075, AFFR-052, AFFR-053, AFFR-054, AFFR-055, AFFR-057, AFFR-061 |
| A chapter page | `{press}/catalog/book/{id}/chapter/{sourceChapterId}`, `…/version/{publicationId}/chapter/{sourceChapterId}` | ROUTE-055, AFFR-077 |
| The file links, remote formats and purchase links | `{press}/catalog/view/{book}/{format}/{file}`, `…/view/{book}/version/{pid}/{format}/{file}` | ROUTE-055 (op `view`), AFFR-076 |
| A file download | `{press}/catalog/download/{book}/{format}/{file}[?inline=1]` | ROUTE-055 (op `download`) |
| The PDF view page | `catalog/view/…` for a PDF, plugin "PDF.js PDF Viewer" | PLUG-022, AFFR-048 |
| The HTML view page | `catalog/view/…` for an HTML file, plugin "HTML Monograph File" | PLUG-018, AFFR-051 |
| "How to Cite" | the block on both pages; `{press}/citationstylelanguage/get/{style}`, `…/download/{ris|bibtex}` | PLUG-008, AFFR-066 |
| The "Downloads" chart | the book's page, theme option `displayStats` | AFFR-056 |
| The payment page and the payment method's callback | the purchase link's fall-through; `{press}/payment/plugin/{PaymentPlugin}/…` | ROUTE-065 |
| The payments settings (owned by Payments & APCs) | Settings › Distribution › "Payments" | AFFM-094 |
| "Manual Payment Notification" (owned by Payments & APCs) | the manual plugin's "Send notification of payment" | MAIL-075 |
| The cover server (owned by Catalog browse; unused by this page) | `$$$call$$$/submission/cover/cover`, `…/thumbnail` | GRID-099 |

## Reference — code anchors

- Handler: OMP `pages/catalog/CatalogBookHandler.php` (`book()`, `view()`, `download()`, `setChapter()`, `setChapterPublicationIds()`, `getSourceChapter()`, `getChaptersFirstPublishedDate()`); `classes/security/authorization/OmpPublishedSubmissionAccessPolicy.php`, `OmpPublishedSubmissionRequiredPolicy.php`; lib/pkp `classes/submission/Repository.php` (`canPreview()`, `getStatusByPublications()`, `getCurrentPublicationIdByPublications()`); lib/pkp `classes/core/PKPPageRouter.php` (`handleAuthorizationFailure()`).
- Templates: OMP `templates/frontend/pages/book.tpl`, `templates/frontend/objects/monograph_full.tpl`, `templates/frontend/objects/chapter.tpl`, `templates/frontend/components/authors.tpl`, `publicationFormats.tpl`, `downloadLink.tpl`; lib/pkp `templates/frontend/components/headerHead.tpl`.
- Models: OMP `classes/publication/Publication.php` (`getLocalizedCoverImageThumbnailUrl()`), `classes/monograph/Chapter.php` (`isPageEnabled()`, `getAuthorNamesAsString()`), `classes/publicationFormat/PublicationFormat.php` (`getDimensions()`), `IdentificationCode.php`, `PublicationDate.php`; lib/pkp `classes/publication/PKPPublication.php` (`getAuthorString()`).
- Viewers: OMP `plugins/generic/pdfJsViewer/PdfJsViewerPlugin.php`, `templates/display.tpl`; `plugins/generic/htmlMonographFile/HtmlMonographFilePlugin.php`, `templates/display.tpl`, `classes/HtmlGalleyHelper.php`.
- Citation: `plugins/generic/citationStyleLanguage/CitationStyleLanguagePlugin.php` (`getTemplateData()`, `getCitation()`, `setBookAuthors()`, `setBookChapterAuthors()`, `addSeriesInformation()`), `pages/CitationStyleLanguageHandler.php`, `templates/citation-block.blade`, `templates/citation-styles/ris.blade`.
- Payments: OMP `classes/payment/omp/OMPPaymentManager.php`, `classes/payment/omp/OMPCompletedPaymentDAO.php`, `pages/payment/PaymentHandler.php`, `plugins/paymethod/manual/ManualPaymentPlugin.php`, `templates/paymentForm.tpl`, `mailables/ManualPaymentNotify.php`, `plugins/paymethod/paypal/PaypalPaymentPlugin.php`; lib/pkp `classes/payment/PaymentManager.php`, `classes/components/forms/context/PKPPaymentSettingsForm.php`; OMP `classes/components/forms/context/UserAccessForm.php` (`restrictMonographAccess`).
- Locale: OMP `locale/en/locale.po`, `submission.po`, `manager.po` and `locale/fr_CA/*`; lib/pkp `locale/en/submission.po`.
