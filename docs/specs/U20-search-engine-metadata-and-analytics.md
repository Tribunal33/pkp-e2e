---
name: search-engine-metadata-and-analytics
status: verified
---

# Search-engine metadata & analytics {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal wants outside services to find its published work and to
measure who reads it. Search engines and scholarly indexes such as
Google and Google Scholar learn about a journal by reading its public
pages, and the application helps them in three ways. The **sitemap** is
a machine-readable list of the journal's public pages, at an address a
manager submits to a search engine. The **search-engine tags** are
lines in each page's hidden header (the part of the page a browser does
not display; a tester reads it in the browser's page source): a short
description of the journal on its home page, any tags the Journal
Manager adds by hand to every public page of the journal, and, on each
published article's page, the bibliographic tags that "Google Scholar Indexing Plugin" and
"Dublin Core Indexing Plugin" write. **Analytics** is Google's tracking
script: with "Google Analytics Plugin" enabled and an "Account number"
saved, every public page of the journal loads it. The Journal Manager
sets this up on Settings › Distribution › "Search Indexing" and in the
three plugins; the Site Administrator can fill the same "Search
Indexing" form from the journal's Settings Wizard. Readers see none of
it on the page itself, unless "Custom Tags" holds text that is not a tag
(Rule 10) or "Description" holds markup (Rule 9): that text shows as a
line at the top of the page. <sup>a</sup>

OPS does not install "Dublin Core Indexing Plugin": a preprint server's
Settings › Website › "Plugins" lists no such plugin, and its preprint
pages carry no Dublin Core tags. Everything below marked {OJS OMP} is
absent there; the sitemap, the other tags and analytics work on a
preprint server as on a journal. <sup>a</sup> <sup>q1</sup>

## Actors & permissions

"Whoever opens the Settings pages" means the manager-level roles with
"Permit changes to Settings", as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them, and the Site Administrator working in the journal. On a
press or a preprint server the Site Administrator opens them only while
holding a manager-level role there; without one, a Settings address
answers the access-denied page, a defect [Journal identity & about
pages](U07-journal-identity-and-about-pages.md#a1) records. The Settings
Wizard's "Search Indexing" tab works for the Site Administrator either
way. Every other role gets the access-denied page ("The current role does
not have access to this operation.") at a Settings address. Search
engines, indexes and visitors need no account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Read the sitemap** (Rules 1–5) | • any visitor, signed in or not, and any search engine<br>• on a journal that requires sign-in to view the site, or that is not enabled publicly, a signed-out visitor is sent to Login instead (Rule 6) <sup>e</sup> <sup>q8</sup> |
| **Receive a page's search-engine tags and the analytics script** (Rules 7–19) | • whoever can open the page: the tags and the script come with it, and the page's own feature decides who may open it <sup>g</sup> |
| **Edit and save the "Search Indexing" tab** (Settings › Distribution; Rule 24) | • whoever opens the Settings pages; nobody else <sup>b</sup> <sup>c</sup> |
| **Edit and save the same form from the Settings Wizard** (Administration › "Hosted Journals", the journal's row arrow › "Settings wizard", first tab "Journal Settings" ("Setup" on a press, "Server Settings" on a preprint server) › side tab "Search Indexing"; Rule 24) | • the Site Administrator alone <sup>b</sup> <sup>q25</sup> |
| **Enable or disable the three plugins** (Rules 15, 18, 21) | • whoever opens the Settings pages, with each plugin's box on Settings › Website › "Plugins" › "Installed Plugins" under "Generic Plugins"<br>• the Site Administrator, also from the Settings Wizard's "Plugins" tab<br>*Plugins management* owns the list, its confirmations and its messages <sup>a</sup> |
| **Open "Google Analytics Plugin"'s "Settings" window and save it** (Rule 20) | • whoever opens the Settings pages, from "Settings" among the plugin row's actions, offered only while the plugin is enabled<br>• the Site Administrator, also from the Settings Wizard's "Plugins" tab, where the arrow of the enabled plugin's row offers "Settings", "Delete" and "Upgrade"; "Settings" opens the same window, showing the journal's number <sup>d</sup> <sup>q22</sup> |
| **Tick "Google Analytics Plugin" on the site's own Plugins list** (Rule 22) | • the Site Administrator, on Administration › "Site Settings" › "Plugins", a tab that shows while the site hosts two or more journals; the box can be ticked, but no page changes and the row offers no "Settings" ⚠ [A3](#a3) <sup>d</sup> <sup>q24</sup> |

## Fields & validation

**The "Search Indexing" tab** (Settings › Distribution; the Settings
Wizard's side tab of the same name shows the same form). Under the
heading "Search Indexing" the form reads "Help search engines like
Google discover and display your site. You are encouraged to submit
your sitemap.", the word "sitemap" a link that opens the journal's
sitemap (Rule 1) in a new browser tab. Below are two boxes and "Save".
The form saves and reports as every Settings tab does ([Journal
identity & about pages](U07-journal-identity-and-about-pages.md),
"Fields & validation" and Rule 5): <sup>c</sup> <sup>q25</sup>

- "Save" shows "Saved" beside the button. <sup>q25</sup>
- With a second form language, pressing that language's button above
  the form ("French") shows its boxes, "Description in French" and
  "Custom Tags in French". <sup>q25</sup>
- A change typed and not saved stays while moving to another tab of
  Distribution, and is dropped without a question once the page is
  left. <sup>q25</sup>

Nothing typed is refused: empty boxes, a text of any length, quote
marks, markup, or plain words in "Custom Tags" are each saved as typed,
with "Saved". <sup>c</sup> <sup>q25</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Description" | no | One line of text per language, empty on a new journal. Its help icon reads "Provide a brief description (50-300 characters) of the journal which search engines can display when listing the journal in search results." ("…of the press…", "…of the server…"). The length is advice: a 20- or a 400-character text is saved as typed, and the home page's tag holds all of it. Rule 9 <sup>c</sup> <sup>q11</sup> |
| "Custom Tags" | no | A box of several lines per language, empty on a new journal. Its help icon reads "Add custom HTML tags, also known as meta tags, that you would like to be inserted in the head of every page. Consult a technical advisor before adding tags here." Nothing checks what is typed. Rule 10 <sup>c</sup> <sup>q12</sup> |

**The three plugins**, each a row under "Generic Plugins" on Settings ›
Website › "Plugins" › "Installed Plugins" (and on the Settings Wizard's
"Plugins" tab), with its description beside its name: <sup>a</sup>
<sup>q1</sup> <sup>q20</sup>

| Plugin | Description in the list | On a new journal | Apps |
|--------|-------------------------|------------------|------|
| "Dublin Core Indexing Plugin" | "This plugin embeds Dublin Core meta tags in article views for indexing purposes." ("…in monograph views…" on a press) | enabled | OJS OMP <sup>q1</sup> |
| "Google Scholar Indexing Plugin" | "This plugin enables indexing of published content in Google Scholar." | enabled | OJS OMP OPS <sup>q1</sup> |
| "Google Analytics Plugin" | "Integrate OJS with Google Analytics, Google's web site traffic analysis application. …", on a press and a preprint server too ⚠ [A2](#a2) | disabled | OJS OMP OPS <sup>q20</sup> |

**The "Google Analytics Plugin" settings window** (the arrow beside the
plugin's row opens its actions, "Settings" among them, while the plugin
is enabled). The window is titled "Google Analytics Plugin" and opens
with two paragraphs, the first beginning "With this plugin enabled
Google Analytics may be used to collect and analyze web site usage and
traffic.", the second naming a "'Check Status' function" that no screen
offers [A2](#a2). Under them sits the one box, then "Cancel" and "OK",
above "Required fields are marked with an asterisk: *". <sup>d</sup>
<sup>q22</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Account number" | yes | Empty on a new journal; no asterisk marks it. "OK" on an empty box is refused with "This field is required." under the box, and nothing is sent; a box holding only spaces is refused with "Please enter an account number." in the same place and "Errors occurred processing this form" at the top of the window. Either way the window stays open and nothing is saved. A number pasted as Google's snippet writes it, `'G-TEST12345';`, is kept as `G-TEST12345`; `UA-12345-1` and a 252-character value reopen as typed. A value that holds no number once saved, such as `'';`, closes the window as a save does and reopens empty, and no page carries the script. Rules 19, 20 <sup>d</sup> <sup>q22</sup> |

**What the sitemap lists** (Rule 2), in this order. `{journal
address}` is the journal's home page address, such as
`https://example.org/index.php/journal`. <sup>e</sup> <sup>q2</sup>

| Entry | When it is listed | Apps |
|-------|-------------------|------|
| the home page | always | OJS OMP OPS <sup>q2</sup> |
| "Register" | unless the journal's "User Registration" is "The Journal Manager will register all user accounts. …" (Rule 3) | OJS OMP OPS <sup>q5</sup> |
| "Login" | always | OJS OMP OPS <sup>q2</sup> |
| "Announcements", then each announcement's page | while "Enable announcements" is ticked (Rule 3); an expired announcement too [A5](#a5) | OJS OMP OPS <sup>q5</sup> |
| "About the Journal" | while its text is not empty (Rule 3) | OJS OMP OPS <sup>q5</sup> |
| the "Submissions" page of About | always | OJS OMP OPS <sup>q2</sup> |
| "Contact" | always (Rule 3) | OJS OMP OPS <sup>q5</sup> |
| each "Custom Page" item's page | always (Rule 3) | OJS OMP OPS <sup>q5</sup> |
| "Search" | always; a press lists no Search page ⚠ [A4](#a4) | OJS OPS <sup>q2</sup> |
| "Current" and "Archive" | unless "Publishing Mode" says the journal does not publish online (Rule 2b) | OJS <sup>q4</sup> |
| each published issue's page | the same (Rule 2b); no article or galley page is ever listed (Rule 2a) [OJS2](#ojs2) | OJS <sup>q2</sup> <sup>q3</sup> |
| "Catalog", then each published book's page, followed by its chapters' pages and its files' pages | always; a chapter while "Show this chapter on its own page…" is ticked for it; a file while its format is approved and available and the file is open access or priced; from "Create New Version" until that version is published, the new version's chapters instead (Rule 2c) [OMP4](#omp4) | OMP <sup>q2</sup> |
| "New Releases", each series' page, each category's page | always; no category page on a journal or a preprint server [A4](#a4) | OMP <sup>q2</sup> |
| each posted preprint's page | always | OPS <sup>q2</sup> <sup>q6</sup> |

**What "Google Scholar Indexing Plugin" writes** on a published item's
page (Rule 12). Each line is a tag named as below whose content is the
value described. <sup>h</sup> <sup>q14</sup>

| Tag | Its content | Apps |
|-----|-------------|------|
| "gs_meta_revision" | "1.1" | OJS OMP OPS <sup>q14</sup> |
| "citation_journal_title" | the journal's name in its primary language | OJS <sup>q14</sup> |
| "citation_journal_abbrev" | "Journal Abbreviation", or without one "Journal initials", in the primary language | OJS <sup>q14</sup> |
| "citation_issn" | the "Online ISSN", or without one the "Print ISSN"; on a press the online ISSN of the book's series, when it has one | OJS OMP <sup>q14</sup> |
| "citation_publisher" | the press's or the server's name in its primary language | OMP OPS <sup>q14</sup> |
| "citation_author", "citation_author_institution" | one "citation_author" per contributor, in the list's order, with the full name in the submission's language (the given name alone when the family name was not entered in that language ⚠ [A6](#a6)); after each, one "citation_author_institution" per affiliation | OJS OMP OPS <sup>q14</sup> |
| "citation_title" | the title with its subtitle, in the submission's language | OJS OMP OPS <sup>q14</sup> |
| "citation_language" | the submission language's code, such as "en" | OJS OMP OPS <sup>q14</sup> |
| "citation_date" | the publication date, written "2024/03/05", unless the article's issue has a year that differs from it: then that year | OJS <sup>q14</sup> |
| "citation_online_date" | the date posted, written "2024/03/05" | OPS <sup>q14</sup> |
| "citation_publication_date" | the publication date, written "2024-03-05" | OMP <sup>q14</sup> |
| "citation_volume", "citation_issue" | the issue's volume and number, each while the issue shows it | OJS <sup>q14</sup> |
| "citation_firstpage", "citation_lastpage" | the first and last page of "Pages"; with no pages, "Article Number" as the first page | OJS <sup>q14</sup> |
| "citation_doi" | the DOI, when the version has one | OJS OMP OPS <sup>q14</sup> |
| "citation_urn" | the URN ([Identifiers](U44-identifiers.md), Side effects) | OJS <sup>q14</sup> |
| "citation_abstract_html_url" | the item page's own address, with no language in it | OJS OPS <sup>q14</sup> |
| "citation_abstract" | the abstract in the submission's language, its formatting removed; an "&" arrives as "&amp;" ⚠ [A7](#a7) | OJS OMP OPS <sup>q14</sup> |
| "citation_keywords" | one per subject, then one per keyword, in the submission's language | OJS OMP OPS <sup>q14</sup> |
| "citation_isbn" | each ISBN of the formats whose files are the whole book | OMP <sup>q14</sup> |
| "citation_pdf_url" | for each PDF galley, its download address; on a press, for a PDF file of the book ⚠ [OMP2](#omp2) | OJS OMP OPS <sup>q14</sup> |
| "citation_fulltext_html_url" | for each HTML galley, its view address (on a preprint with a "URL Path", an address that ends on "404 Not Found" ⚠ [OPS1](#ops1)); on a press, for the last file of the book that is not a PDF, whatever its type ⚠ [OMP1](#omp1) | OJS OMP OPS <sup>q14</sup> |
| "citation_reference" | one per reference of the version | OJS OMP OPS <sup>q14</sup> |

**What "Dublin Core Indexing Plugin" writes** {OJS OMP} on a published
item's page (Rule 12), after a link naming the Dublin Core schema.
"Per language" means one tag for each language the version has a value
in. <sup>i</sup> <sup>q14</sup>

| Tag | Its content | Apps |
|-----|-------------|------|
| "DC.Contributor.Sponsor" | each "Supporting Agencies" term, per language | OJS OMP <sup>q14</sup> |
| "DC.Coverage" | "Coverage", per language | OJS OMP <sup>q14</sup> |
| "DC.Creator.PersonalName" | one per contributor, with the full name in the submission's language, as "citation_author" [A6](#a6) | OJS OMP <sup>q14</sup> |
| "DC.Date.created" | the publication date, written "2024-03-05" | OJS OMP <sup>q14</sup> |
| "DC.Date.dateSubmitted" | the day the submission was submitted | OJS OMP <sup>q14</sup> |
| "DC.Date.issued" | the issue's publication date | OJS <sup>q14</sup> |
| "DC.Date.modified" | the day of the version's last change | OJS OMP <sup>q14</sup> |
| "DC.Description" | the abstract, per language, its formatting removed; an "&" arrives as "&amp;" [A7](#a7) | OJS OMP <sup>q14</sup> |
| "DC.Format" | for each galley with a file, the file's type, such as "application/pdf" | OJS <sup>q14</sup> |
| "DC.Identifier" | the item's "URL Path", or without one its number | OJS OMP <sup>q14</sup> |
| "DC.Identifier.pageNumber", "DC.Identifier.articleNumber" | "Pages" and "Article Number", when set | OJS <sup>q14</sup> |
| "DC.Identifier.DOI" | the DOI, when the version has one | OJS OMP <sup>q14</sup> |
| "DC.Identifier.URN" | the URN ([Identifiers](U44-identifiers.md), Side effects) | OJS OMP <sup>q14</sup> |
| "DC.Identifier.URI" | the item page's own address, with no language in it | OJS OMP <sup>q14</sup> |
| "DC.Language" | the submission language's code | OJS OMP <sup>q14</sup> |
| "DC.Rights" | "Copyright (c) {copyright year} {copyright holder}" when both are set, worded in the interface language (Rule 14); a second one with the license address, when set | OJS OMP <sup>q14</sup> |
| "DC.Source" | the journal's name in its primary language | OJS OMP <sup>q14</sup> |
| "DC.Source.ISSN" | the "Online ISSN", or without one the "Print ISSN" | OJS <sup>q14</sup> |
| "DC.Source.Issue", "DC.Source.Volume" | the issue's number and volume, each while the issue shows it | OJS <sup>q14</sup> |
| "DC.Source.URI" | the journal's home page address ⚠ [OJS1](#ojs1) | OJS OMP <sup>q14</sup> |
| "DC.Subject" | one per subject and one per keyword, per language | OJS OMP <sup>q14</sup> |
| "DC.Title", "DC.Title.Alternative" | the title with its subtitle in the submission's language; one alternative per other language the title has | OJS OMP <sup>q14</sup> |
| "DC.Type" | "Text.Serial.Journal" on a journal, "Text.Book" on a press; then "Type", per language | OJS OMP <sup>q14</sup> |
| "DC.Type.articleType" | the title of the article's section | OJS <sup>q14</sup> |

## Rules & state

### The sitemap

1. **Its address.** Every journal has a sitemap at {journal
   address}/sitemap, from the day it is created, with nothing to
   enable. A browser shows it as a page of marked-up text: a list of
   entries, each holding one address and nothing else (no date, no
   priority). The only link to it on any screen is the word "sitemap" on
   the "Search Indexing" tab (Fields). <sup>e</sup> <sup>q2</sup>
2. **Published work only.** The sitemap lists the pages of the Fields
   table "What the sitemap lists". Of the journal's work it lists only
   what is published: a submission still in the workflow, an article
   scheduled in an issue that is not yet published {OJS}, an unpublished
   one and another journal's work never appear. A newly published book
   or preprint is listed at the next load; an unpublished one is gone
   from it. <sup>e</sup> <sup>q2</sup>
   - 2a. {OJS} No article is listed. The sitemap lists each published
     issue's page and no article or galley page, whether the article
     sits in a published issue or was published with "Don't Assign To An
     Issue", so publishing or unpublishing an article leaves the sitemap
     as it was ⚠ [OJS2](#ojs2). <sup>q3</sup>
   - 2b. {OJS} With "Publishing Mode" set to "OJS will not be used to
     publish the journal's contents online." the sitemap lists no
     "Current", "Archive" or issue page. <sup>q4</sup>
   - 2c. {OMP} From "Create New Version" on a published book until that
     version is published, the book's chapter entries are the new
     version's chapter pages, which answer "404 Not Found", in place of
     the published ones; its file entries do not change ⚠
     [OMP4](#omp4). <sup>q2</sup>
3. **Entries other settings decide.** <sup>e</sup> <sup>q5</sup>
   - "Register" leaves the list while "User Registration" is set to "The
     Journal Manager will register all user accounts. …".
   - "Announcements" and one entry per announcement, an expired one
     included, join it while "Enable announcements" is ticked ⚠
     [A5](#a5).
   - "About the Journal" is listed while its text is not empty.
   - "Contact" is always listed: every journal has a principal contact,
     since Settings › Journal › "Contact" refuses to save an empty "Name"
     ("This field is required."), and a typed "Mailing Address" changes
     nothing.
   - Every "Custom Page" item of the journal's Navigation is listed,
     whether or not a menu shows it.
4. **The addresses.** A book's entry, and its chapters' and files',
   use its "URL Path" when one is set; a preprint's entry uses its
   number even then, an address that leads on to the preprint's page.
   On a journal with two
   or more interface languages, every address carries the language the
   sitemap was read in (such as "/en/" after the journal's address), and
   no other language's addresses are listed. <sup>e</sup> <sup>q6</sup>
5. **The site's index.** The site's own address {site address}/index/sitemap
   (`{site address}` being the part before the journal's path, such as
   `https://example.org/index.php`) lists the sitemap address of every
   journal enabled publicly on the site, one entry each; a journal not
   enabled is left out. A journal that requires visitors to register and
   log in stays in the index, although its own sitemap sends a
   signed-out reader to Login (Rule 6). <sup>e</sup> <sup>q7</sup>
6. **A journal closed to visitors.** On a journal whose "Site Access
   Options" require visitors to register and log in, or that is not
   enabled publicly, a signed-out visitor or search engine asking for
   the sitemap is sent to Login; the journal's own Reader or manager,
   signed in, gets the sitemap as Rule 2 says. <sup>e</sup> <sup>q8</sup>

### Tags on the journal's pages

7. **The software's name.** Every page, public and editorial, the
   site's own pages included, carries a "generator" tag naming the
   software and its version, such as "Open Journal Systems 3.6.0.0"
   ("Open Monograph Press …", "Open Preprint Systems …"). <sup>g</sup>
   <sup>q9</sup>
8. **Other languages of a page.** On a journal with two or more
   interface languages, every public page carries one "alternate" link
   per language, each pointing to the same page in that language without
   the part of its address after "?" (a search results page's links lead
   to the empty search page), and an "x-default" link to the page's
   address with no language in it. With one interface language there are
   none. The site's own pages carry the same links for the site's
   languages. <sup>g</sup> <sup>q10</sup>
9. **"Description".** The journal's home page, and no other page,
   carries a "description" tag holding the "Description" in the
   interface language the page is read in, or the primary language's
   text when that language's box is empty. With "Description" empty in
   every language there is no such tag. A description holding a double
   quote mark is cut at that mark, and one holding markup such as `<b>`
   ends the tag at the first ">" and shows the rest as text above the
   home page's header ⚠ [A1](#a1). <sup>g</sup> <sup>q11</sup>
10. **"Custom Tags".** Whatever is typed in "Custom Tags" is written,
    exactly as typed, into the hidden header of every public page of the
    journal, in the interface language's box or the primary language's
    as for Rule 9. The editorial pages and the site's own pages never
    carry it. Text that is not a tag is not hidden: a browser shows it
    as a line of text at the top of every public page of the journal,
    above the header. Every line after that text in the hidden header,
    the alternate-language links of Rule 8 and the theme's style sheets
    among them, then belongs to the page itself instead of its hidden
    header (the browser's element inspector shows them in the page's
    body). <sup>g</sup> <sup>q12</sup>
11. **A journal not enabled publicly.** While a journal is not enabled
    publicly, every page of it, public and editorial, carries a "robots"
    tag reading "noindex,nofollow", which asks search engines to leave
    it out. <sup>g</sup> <sup>q13</sup>

### Tags on a published item's page

12. **Where the bibliographic tags go.** While "Google Scholar Indexing
    Plugin" is enabled, the landing page of each published article (on
    a preprint server each posted preprint, on a press each published
    book and each chapter page) carries the tags of the Fields table
    "What "Google Scholar Indexing Plugin" writes"; while "Dublin Core
    Indexing Plugin" is enabled {OJS OMP}, it also carries those of
    "What "Dublin Core Indexing Plugin" writes". The tags describe the
    item's current version and follow a change to it at the next load.
    Each plugin writes its tags whether or not the other is enabled. On
    a press, every book file address the tags name answers a server
    error instead of the file ⚠ [OMP6](#omp6).
    <sup>h</sup> <sup>i</sup> <sup>q14</sup>
13. **Earlier versions and galleys.** The page of an earlier version
    (its link in the item page's "Versions" list) carries neither
    plugin's tags; it carries a "robots" tag reading "noindex" and a
    "canonical" link to the current version's page instead. A galley's
    view page {OJS OPS} carries no plugin tag, and an earlier version's
    galley page carries the "robots" tag too. On a press, an earlier
    version's file page (a format's link on that version's page)
    carries no tag at all: no Dublin Core tag and no "robots" tag.
    <sup>j</sup> <sup>q15</sup>
14. **Languages of the tags.** The tags speak the version's submission
    language, whatever the interface language, except "DC.Rights", whose
    copyright sentence follows the interface language: "Copyright (c)
    {copyright year} {copyright holder}" in English, "© {copyright holder}
    {copyright year}" in French. Dublin Core also writes the abstract,
    the subjects and keywords, the supporting agencies,
    "Coverage", "Type" and the other titles in each further language the
    version has them in; Google Scholar writes the submission language's
    only. The "Disciplines", "Rights" and "Source" boxes of the version's
    "Metadata" page appear in no tag ("DC.Rights" carries the copyright
    and the license instead).
    <sup>h</sup> <sup>i</sup> <sup>q16</sup>
15. **A plugin disabled.** Unticking any of the three plugins first
    asks, in a window headed "Disable", "Are you sure you want to disable
    this plugin?"; "OK" shows "The plugin "{plugin name}" has been
    disabled.". Ticking asks nothing and shows "The plugin "{plugin
    name}" has been enabled.". With either indexing plugin disabled, its
    tags leave every page at the next load and the other plugin's stay;
    enabled again, they return. <sup>a</sup> <sup>q17</sup>
16. **A chapter's page** {OMP}. A chapter page's tags name the chapter:
    its title, its contributors, its abstract, and its publication date
    while the book gives chapters dates of their own (a chapter with no
    date of its own takes the book's). Dublin Core gives the chapter's
    DOI, Google Scholar the book's. "DC.Identifier" and
    "DC.Identifier.URI" still give the book's (its "URL Path" and its
    page's address), and "DC.Type" reads "Text.Book". Keywords, subjects
    and references are the book's. Google Scholar lists the chapter's
    files in place of the book's. <sup>h</sup> <sup>i</sup>
    <sup>q18</sup>
17. **A file's view page** {OMP}. The page a book file's link opens
    ({journal address}/catalog/view/ and the book's, format's and file's
    numbers) carries the Dublin Core tags alone, describing the file:
    <sup>i</sup> <sup>q19</sup>
    - "DC.Identifier" reads the book's "URL Path" (or its number), the
      format's number and the file's number, joined by "/";
    - "DC.Identifier.URI" is {journal address}/catalog/book/ followed by
      the same three parts, an address that shows the book's page, not
      the file's ⚠ [OMP5](#omp5);
    - "DC.Identifier.ISBN" gives each ISBN of the file's format,
      "DC.Identifier.pageNumber" the pages (a chapter's, on a chapter's
      file) and "DC.Source.ISSN" the series' online ISSN;
    - "DC.Type" reads "Text.Chapter" whether or not the file belongs to a
      chapter ⚠ [OMP3](#omp3).

### Analytics

18. **Off on a new journal.** "Google Analytics Plugin" arrives disabled
    on every new journal, and no page carries Google's script.
    <sup>a</sup> <sup>q20</sup>
19. **On, with an account number.** While the plugin is enabled and an
    "Account number" is saved, every public page of the journal carries
    Google's tracking script with that number: the page source holds
    "https://www.googletagmanager.com/gtag/js?id=" and the number. A
    visitor sees nothing different; the browser requests that address,
    and Google's script, once loaded, reports the visit with a request
    to google-analytics.com carrying the number. The editorial
    pages and the site's own pages never carry it. Enabled
    with no number saved, no page carries it. <sup>k</sup> <sup>q21</sup>
20. **The settings window.** "Settings" is offered only while the plugin
    is enabled. "OK" with a number saves it and closes the window with
    no message; "OK" on an empty box, or on one holding only spaces, is
    refused (Fields). "Cancel" closes the window without a question and
    saves nothing. With a change typed, the window's close button first
    asks "The data on this form has changed. Do you wish to continue
    without saving?", and leaving the page raises the browser's own
    leave-page question; either way nothing is saved. <sup>d</sup>
    <sup>q22</sup>
21. **Disabled again.** Disabling the plugin (with the question of Rule
    15) takes the script off every page at the next load and takes
    "Settings" from its row; the number is kept, and the window shows
    it again once the plugin is enabled.
    <sup>d</sup> <sup>q23</sup>
22. **The site's own pages.** The Site Administrator can tick "Google
    Analytics Plugin" on Administration › "Site Settings" › "Plugins"
    ("The plugin "Google Analytics Plugin" has been enabled.", still
    ticked after a reload), but the site's pages never carry the script,
    and the row's arrow offers only "Delete" and "Upgrade", ticked or
    not: no number can be given for the site ⚠ [A3](#a3). <sup>d</sup>
    <sup>k</sup> <sup>q24</sup>
23. **Its texts.** The plugin's description in the list and its window
    are the same in the three apps and speak of OJS and of a "'Check
    Status' function" (Fields) [A2](#a2). <sup>d</sup>

### Saving the form

24. **"Save".** "Save" on the "Search Indexing" tab stores "Description"
    and "Custom Tags" together and shows "Saved"; the public pages follow
    at their next load (Rules 9, 10). The Settings Wizard's tab edits
    the same journal: a save in either shows in the other at its next
    load. <sup>c</sup> <sup>q25</sup>

## Side effects

- Saving "Search Indexing" shows "Saved" to whoever saved it (Rule 24);
  saving the Google Analytics window shows nothing (Rule 20). No email,
  notification or submission log entry comes from the sitemap, the tags,
  the form or the plugins. Enabling and disabling a plugin show the
  messages of Rule 15, which *Plugins management* owns. <sup>c</sup>
  <sup>q25</sup>
- **Visits reported to Google.** While "Google Analytics Plugin" is on
  with an "Account number" (Rule 19), every visit to a public page of the
  journal makes the visitor's browser request Google's script from
  www.googletagmanager.com, which reports the visit to google-analytics.com
  under that number. <sup>k</sup> <sup>q21</sup>
- **The "Description" elsewhere.** The web feeds' description falls back
  to it ([Web feeds](U18-web-feeds.md)), and so does the announcement
  feed {OJS} ([Announcements](U12-announcements.md)). The LOCKSS and
  CLOCKSS pages {OJS} show it as their "Description" row while the
  matching box is ticked on Settings › Distribution › "Archiving" ›
  "LOCKSS and CLOCKSS"; unticked, their address opens the journal's home
  page ([Archiving & preservation](U67-archiving-preservation.md)). <sup>c</sup>

## Settings that modify behavior

1. **"Description"** (Settings › Distribution › "Search Indexing", or the
   Settings Wizard's tab; default empty). Set: the home page's
   "description" tag (Rule 9). Empty: no such tag. <sup>c</sup>
2. **"Custom Tags"** (the same tab; default empty). Set: written into
   every public page's hidden header (Rule 10). Empty: nothing.
   <sup>c</sup>
3. **"Dublin Core Indexing Plugin"** {OJS OMP} (Settings › Website ›
   "Plugins" › "Installed Plugins" › "Generic Plugins"; default enabled).
   Enabled: the Dublin Core tags (Rules 12, 16, 17). Disabled: none
   (Rule 15). *Plugins management* owns enabling and disabling.
   <sup>a</sup>
4. **"Google Scholar Indexing Plugin"** (the same list; default enabled).
   Enabled: the Google Scholar tags (Rules 12, 16). Disabled: none (Rule
   15). <sup>a</sup>
5. **"Google Analytics Plugin"** (the same list; default disabled).
   Enabled with an "Account number": the tracking script on every public
   page (Rule 19). Disabled: no script, no "Settings" (Rule 21).
   <sup>a</sup>
6. **"Account number"** (the plugin's "Settings" window; default empty).
   Set, with the plugin enabled: the script carries it (Rule 19). Empty,
   or saved with no number in it: no script (Fields).
   <sup>d</sup>
7. **"Users must be registered and log in to view the journal site."**
   ("…view the press site.", "…view the server site.") (Settings › Users
   & Roles › "Site Access Options"; default unticked). Ticked: a
   signed-out visitor asking for the sitemap is sent to Login (Rule 6).
   [Roles configuration](U54-roles-configuration.md) owns the option.
   <sup>e</sup>
8. **"Enable this journal to appear publicly on the site"** ("Enable
   this press to appear publicly on the site", "Enable this preprint
   server to appear publicly on the site") (Administration › "Hosted Journals", the journal's "Edit"; ticked on
   every new journal). Unticked: the journal leaves the site's index
   (Rule 5), a signed-out visitor is sent to Login (Rule 6), and every
   page carries "noindex,nofollow" (Rule 11). *Hosted journals* owns it.
   <sup>e</sup> <sup>g</sup>
9. **"Enable announcements"** (Settings › Website › "Setup" ›
   "Announcements"; default unticked). Ticked: the sitemap lists
   "Announcements" and each announcement (Rule 3).
   [Announcements](U12-announcements.md) owns it. <sup>e</sup>
10. **"User Registration"** (Settings › Users & Roles › "Site Access
    Options"; default "Visitors can register a user account with the
    journal."). "The Journal Manager will register all user accounts. …"
    ("The Press Manager…", "The Server Manager…"): "Register" leaves the
    sitemap (Rule 3). [Roles configuration](U54-roles-configuration.md)
    owns it. <sup>e</sup>
11. **"About the Journal"** (Settings › Journal › "Masthead"; empty on a
    new journal). Set: "About the Journal" joins the sitemap (Rule 3).
    "Contact" is listed whatever the "Contact" tab holds. [Journal
    identity & about pages](U07-journal-identity-and-about-pages.md) owns
    them. <sup>e</sup>
12. **"Custom Page" items** (Settings › Website › "Setup" ›
    "Navigation"; none on a new journal). Each adds its page to the
    sitemap (Rule 3). [Custom pages & blocks](U09-custom-pages-and-blocks.md)
    owns them. <sup>e</sup>
13. **"Publishing Mode"** {OJS} (Settings › Distribution › "Access";
    behaves as open access on a new journal). "OJS will not be used to
    publish the journal's contents online.": no issue or article in the
    sitemap (Rule 2b). [Subscriptions & open access
    control](U51-subscriptions.md) owns it. <sup>e</sup>
14. **The journal's interface languages** (Settings › Website › "Setup"
    › "Languages"; one on a new journal, two on the seeded one). Two or
    more: the sitemap's addresses carry the language (Rule 4) and every
    public page carries the alternate links (Rule 8). *Languages &
    locales* owns them. <sup>e</sup> <sup>g</sup>
15. **"Show this chapter on its own page and link to that page from the
    book's table of contents."** {OMP} (a chapter's window on the
    workflow's "Chapters" page; default unticked). Ticked: the chapter's
    page is listed in the sitemap (Fields) and carries its tags (Rule
    16). *Monograph landing page* owns chapter pages. <sup>e</sup>

## Cross-feature interactions

- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns who opens the Settings pages, how a Settings tab saves, and the
  About pages and texts the sitemap lists (Rule 3).
- *Hosted journals* owns the Settings Wizard, whose "Search Indexing"
  and "Plugins" tabs serve this feature (Actors rows 4–6), and whether
  a journal is enabled publicly (Rules 5, 6, 11).
- *Plugins management* owns the "Installed Plugins" list, enabling and
  disabling, and the plugin rows' actions (Rules 15, 18, 21).
- [Identifiers](U44-identifiers.md) owns the URN a page's
  "DC.Identifier.URN" and "citation_urn" tags carry.
- [Article landing page & reading](U13-article-landing-page-and-reading.md)
  owns the article and preprint pages the tags ride on, and the
  addresses of a preprint with a "URL Path" (OPS1); *Monograph landing
  page* owns the book, chapter and file pages and the file downloads
  (OMP6); [Galleys](U46-galleys.md) owns the galley pages (Rule 13).
- [Publication metadata](U40-publication-metadata.md),
  [Contributors & affiliations](U41-contributors-and-affiliations.md) and
  [Citations & references](U42-citations-and-references.md) own the
  values the tags carry (Fields); *DOIs* owns the DOI.
- [Publish, schedule & versions](U49-publish-schedule-and-versions.md)
  owns publishing and versions, which put an item in the sitemap and
  decide its current version (Rules 2, 12, 13); [Issues](U50-issues.md)
  owns issues and what they show (Rule 2a).
- [Web feeds](U18-web-feeds.md), [Announcements](U12-announcements.md)
  and [Archiving & preservation](U67-archiving-preservation.md) reuse the "Description" (Side effects).
- [Search](U15-search.md) owns the Search page the sitemap lists; this
  spec's "Search Indexing" concerns outside search engines, not the
  journal's own search.
- *OAI-PMH* is the other channel through which outside services read the
  journal's metadata; nothing is shared with the tags or the sitemap.
- *Languages & locales* owns the interface languages (Rules 4, 8).

## Canonical scenarios

The scenarios run on scratch journals, presses and preprint servers with
throwaway accounts, a visitor reading the sitemap and the pages' source
signed out in a second browser; scenario 4 reads the seeded journal,
which has two interface languages, and scenario 5 also signs in the
Site Administrator's ready account. The accounts, their passwords and
the tooling recipe are in the footnote. <sup>s</sup>

1. **A new journal's sitemap** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal with nothing published, as it was created.

   - **The "sitemap" link**: open Settings › Distribution › "Search
     Indexing": under the heading "Search Indexing" the form reads "Help
     search engines like Google discover and display your site. You are
     encouraged to submit your sitemap.". Press the word "sitemap": the
     journal's sitemap opens in a new browser tab (Rule 1; Fields, the
     "Search Indexing" tab).
   - **The sitemap**: the visitor opens {journal address}/sitemap,
     {journal address} being the address of the journal's home page: the
     browser shows a page of marked-up text, a list of entries, each
     holding one address and nothing else, with no date and no priority
     (Rule 1).
   - **Its entries**: the list holds, in this order, the home page,
     "Register", "Login", the "Submissions" page of About and "Contact";
     then, on a journal, "Search", "Current" and "Archive"; on a press
     "Catalog" and "New Releases" [A4](#a4); on a preprint server
     "Search" (Rules 2, 3; Fields, "What the sitemap lists").
   - **Control**: the list holds no "About the Journal" entry, since a
     new journal's "About the Journal" text is empty (Rule 3; Settings
     bullet 11). <sup>s</sup>

2. **Published work and announcements in the sitemap** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal with "Enable announcements" ticked and the
   announcement "Call for Papers", where the Author Ada Author's article
   "Tidal Patterns" is published (on a journal in the published issue
   Vol. 1 No. 1 (2024); on a press with the publication format "PDF",
   approved and available, holding an open-access PDF file, the press
   having the category "Cat One"), her "Draft Study" is submitted and
   still in the workflow and, on a journal, her "Future Tides" is
   scheduled in the unpublished issue Vol. 1 No. 2 (2026); and a second
   scratch journal where the article "Elsewhere" is published, on a
   journal in its own published issue Vol. 1 No. 1 (2024).

   - **Announcements**: the visitor opens {journal address}/sitemap,
     {journal address} being the address of the journal's home page:
     after "Login" it lists "Announcements", then the page of "Call for
     Papers". Follow that entry: it opens the announcement "Call for
     Papers" (Rule 3; Settings bullet 9).
   - **Published work**: on a journal, the page of Vol. 1 No. 1 follows
     "Archive" (Rule 2a; [OJS2](#ojs2)). On a press, the book's page of
     "Tidal Patterns" follows "Catalog", followed by the page of its
     "PDF" file, and the page of "Cat One" follows "New Releases". On a
     preprint server, the last entry opens the preprint's page of "Tidal
     Patterns" (Rules 2, 4; Fields, "What the sitemap lists").
   - **Not in the sitemap**: no entry opens "Draft Study", none is the
     page of Vol. 1 No. 2 {OJS}, and no address lies under the second
     journal's address (Rule 2).
   - **Unpublished** {OMP OPS}: Journal Manager: open "Tidal Patterns" in
     its workflow and unpublish it, as [Publish, schedule &
     versions](U49-publish-schedule-and-versions.md) scenario 3 does
     ("Unpost" on a preprint server). The visitor reloads the sitemap:
     the entries of "Tidal Patterns" are gone (Rule 2).
   - **Published again** {OMP OPS}: publish "Tidal Patterns" again, as
     that spec's scenario 10 does. The visitor reloads the sitemap: the
     entry of its page is back (Rule 2).
   - **Control**: the second journal's own sitemap, at its own address,
     lists, on a press and a preprint server, the page of "Elsewhere",
     and on a journal the page of its own Vol. 1 No. 1 (Rule 2).
     <sup>s</sup>

3. **The site's index, and journals closed to visitors** {OJS OMP OPS}

   Given: a visitor, signed out, on a site hosting three scratch journals:
   "Open Waters", open to all; "Members Only", whose Settings › Users &
   Roles › "Site Access Options" have "Users must be registered and log
   in to view the journal site." ("…view the press site.", "…view the
   server site.") ticked, and its Reader; and "Hidden Bay", whose "Enable
   this journal to appear publicly on the site" (Administration ›
   "Hosted Journals", the journal's "Edit") is unticked, and its Journal
   Manager.

   - **The site's index**: open {site address}/index/sitemap, {site
     address} being the part of a journal's address before the journal's
     path (such as https://example.org/index.php): a page of marked-up
     text lists one sitemap address per journal enabled publicly, those
     of "Open Waters" and "Members Only" among them, and none for "Hidden
     Bay" (Rule 5; Settings bullets 7, 8).
   - **A journal that requires sign-in**: open "Members Only"'s sitemap,
     its home page's address followed by "/sitemap": the visitor lands on
     Login (Rule 6; Settings bullet 7).
   - **Its Reader**: sign in there as the Reader of "Members Only" and
     open its sitemap again: the sitemap shows, the journal's home page
     its first entry (Rule 6).
   - **A journal not enabled publicly**: sign out and open "Hidden Bay"'s
     sitemap: the visitor lands on Login, and that page's source carries
     a "robots" tag reading "noindex,nofollow" (Rules 6, 11; Settings
     bullet 8).
   - **Its Journal Manager**: sign in as the Journal Manager of "Hidden
     Bay" and open its sitemap: the sitemap shows, the home page first.
     The source of the journal's home page and of the Dashboard each
     carry the "robots" tag reading "noindex,nofollow" (Rules 6, 11).
   - **Control**: signed out, "Open Waters"'s sitemap opens, the home
     page its first entry (Rules 1, 6). <sup>s</sup>

4. **Two interface languages, and the software's name** {OJS OMP OPS}

   Given: a visitor, signed out, on the seeded journal, whose interface
   languages are English and French, and on a scratch journal with
   English alone.

   - **The English sitemap**: open {journal address}/en/sitemap,
     {journal address} being the address of the seeded journal's home
     page with no language in it: every address listed carries "/en/"
     after the journal's address, and none carries "/fr_CA/" (Rule 4;
     Settings bullet 14).
   - **The French sitemap**: open {journal address}/fr_CA/sitemap: every
     address listed carries "/fr_CA/", and none carries "/en/" (Rule 4).
   - **The alternate links**: open the home page in English,
     {journal address}/en, and view its source: it carries one
     "alternate" link per language, English and French, each pointing to
     the home page in that language, and an "x-default" link to the home
     page's address with no language in it. The source of "About the
     Journal" carries the same three, each pointing to "About the
     Journal" (Rule 8; Settings bullet 14).
   - **The software's name**: the home page's source also carries a
     "generator" tag naming the software and its version, such as "Open
     Journal Systems 3.6.0.0" ("Open Monograph Press …", "Open Preprint
     Systems …"); so do the source of the journal's Login page and of the
     site's home page (Rule 7).
   - **Control**: the scratch journal's home page carries no "alternate"
     link in its source (Rule 8). <sup>s</sup>

5. **"Description" and "Custom Tags" on the journal's pages** {OJS OMP OPS}

   Given: Journal Manager, the Site Administrator, and a visitor, signed
   out, in a second browser, on a scratch journal with English alone
   where the article "Tidal Patterns" is published.

   - **The tab**: open Settings › Distribution › "Search Indexing":
     "Description" and "Custom Tags" are empty, and the help icon of
     "Description" reads "Provide a brief description (50-300 characters)
     of the journal which search engines can display when listing the
     journal in search results." ("…of the press…", "…of the server…")
     (Fields).
   - **Saved**: type "Letters about still water." in "Description"; in
     "Custom Tags" type `<meta name="u20-check" content="custom">` and,
     on a second line, "Plain words"; press "Save": "Saved" shows beside
     the button (Rule 24; Fields).
   - **The home page**: the visitor opens the journal's home page and
     views its source: the hidden header carries a "description" tag
     holding "Letters about still water." and the tag
     `<meta name="u20-check" content="custom">` as typed. On the page
     itself, "Plain words" shows as a line of text at the top, above the
     header, and the browser's element inspector shows the theme's style
     sheets, which follow it in the source, in the page's body instead
     of its hidden header (Rules 9, 10; Settings bullets 1, 2).
   - **Other public pages**: the article's page of "Tidal Patterns" and
     "About the Journal" each carry the "u20-check" tag in their source
     and show "Plain words" at the top, and carry no "description" tag
     (Rules 9, 10).
   - **Pages without them**: Journal Manager: the Dashboard's source
     carries neither the "u20-check" tag nor "Plain words". The visitor
     opens the site's home page, the part of the journal's address
     before the journal's path: its source carries neither of them (Rule
     10).
   - **The Settings Wizard**: Site Administrator: open Administration ›
     "Hosted Journals", press the arrow on the journal's row, then
     "Settings wizard"; on the first tab, "Journal Settings" ("Setup" on
     a press, "Server Settings" on a preprint server), open the side tab
     "Search Indexing": "Description" reads "Letters about still water.".
     Replace it with "Notes on moving water." and press "Save": "Saved"
     shows. Journal Manager: reload Settings › Distribution › "Search
     Indexing": "Description" reads "Notes on moving water.". The visitor
     reloads the home page: its "description" tag holds "Notes on moving
     water." (Rule 24; Actors row 4).
   - **Emptied**: Journal Manager: empty both boxes and press "Save":
     "Saved" shows. The visitor reloads the home page: its source carries
     no "description" tag and no "u20-check" tag, and the page shows no
     "Plain words" (Settings bullets 1, 2).
   - **Control**: before the first "Save", the home page's source carried
     no "description" tag (Rule 9). <sup>s</sup>

6. **The indexing plugins' tags on a published article** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal "Sea Letters" with the initials "SL", whose
   plugins nobody has touched, where the Author Ada Author's article
   "Tidal Patterns", in English, with the abstract "Tides follow the
   moon." and two references, is published with the date 2024-03-05: on
   a journal in the section "Articles" and the published issue Vol. 1
   No. 1 (2024); on a journal and a preprint server with the keyword
   "tides" and a "PDF" galley holding a PDF file; on a press with the
   publication format "PDF", approved and available, holding an
   open-access PDF file.

   - **Google Scholar's tags**: the visitor opens the article's page of
     "Tidal Patterns" and views its source. The hidden header carries
     "gs_meta_revision" "1.1", "citation_title" "Tidal Patterns",
     "citation_author" "Ada Author", "citation_language" "en",
     "citation_abstract" "Tides follow the moon." and two
     "citation_reference" tags. On a journal it also carries
     "citation_journal_title" "Sea Letters", "citation_journal_abbrev"
     "SL", "citation_date" "2024/03/05", "citation_volume" "1" and
     "citation_issue" "1"; on a press and a preprint server
     "citation_publisher" "Sea Letters"; on a press
     "citation_publication_date" "2024-03-05" and one "citation_pdf_url";
     on a preprint server "citation_online_date" "2024/03/05". On a
     journal and a preprint server it carries "citation_keywords"
     "tides", "citation_abstract_html_url" holding the page's own
     address, and one "citation_pdf_url", for the "PDF" galley (Rule 12;
     Fields, "What "Google Scholar Indexing Plugin" writes").
   - **Dublin Core's tags** {OJS OMP}: the same source carries a link
     naming the Dublin Core schema, then "DC.Title" "Tidal Patterns",
     "DC.Creator.PersonalName" "Ada Author", "DC.Date.created"
     "2024-03-05", "DC.Description" "Tides follow the moon.",
     "DC.Source" "Sea Letters" and "DC.Type" "Text.Serial.Journal"
     ("Text.Book" on a press). On a journal it also carries
     "DC.Source.Volume" "1", "DC.Source.Issue" "1", "DC.Subject" "tides",
     "DC.Format" "application/pdf" and "DC.Type.articleType" "Articles"
     (Rule 12; Fields, "What "Dublin Core Indexing Plugin" writes").
   - **No Dublin Core** {OPS}: Journal Manager: open Settings › Website ›
     "Plugins" › "Installed Plugins": "Generic Plugins" lists "Google
     Scholar Indexing Plugin" and no "Dublin Core Indexing Plugin". The
     preprint's page carries its "citation_" tags and no "DC." tag and no
     Dublin Core schema link (Purpose, the absence paragraph).
   - **The book's file page** {OMP}: on the book's page, press the "PDF"
     format's link: the file's page opens [OMP6](#omp6); its source
     carries "DC." tags and no "citation_" tag, and its "DC.Identifier"
     reads the three numbers at the end of the page's address, the
     book's, the format's and the file's, joined by "/" (Rule 17;
     [OMP3](#omp3), [OMP5](#omp5)).
   - **Dublin Core off** {OJS OMP}: Journal Manager: on Settings ›
     Website › "Plugins" › "Installed Plugins", untick "Dublin Core
     Indexing Plugin": a window headed "Disable" asks "Are you sure you
     want to disable this plugin?". Press "OK": "The plugin "Dublin Core
     Indexing Plugin" has been disabled." shows. The visitor reloads the
     article's page: its source carries no "DC." tag, and the "citation_"
     tags stay; on a press the file's page carries no "DC." tag either
     (Rule 15; Settings bullet 3).
   - **Dublin Core on again** {OJS OMP}: tick "Dublin Core Indexing
     Plugin": nothing is asked, and "The plugin "Dublin Core Indexing
     Plugin" has been enabled." shows. The visitor reloads the article's
     page: the "DC." tags are back (Rule 15).
   - **Google Scholar off**: untick "Google Scholar Indexing Plugin" and
     press "OK" in the "Disable" window: "The plugin "Google Scholar
     Indexing Plugin" has been disabled." shows. The visitor reloads the
     article's page: its source carries no "gs_meta_revision" and no
     "citation_" tag, and on a journal and a press the "DC." tags stay
     (Rule 15; Settings bullet 4).
   - **Google Scholar on again**: tick "Google Scholar Indexing Plugin":
     "The plugin "Google Scholar Indexing Plugin" has been enabled."
     shows. The visitor reloads the article's page: the Google Scholar
     tags are back (Rule 15).
   - **Control**: before the first change, "Generic Plugins" listed
     "Google Scholar Indexing Plugin" ticked, on a journal and a press
     "Dublin Core Indexing Plugin" ticked too, and "Google Analytics
     Plugin" unticked (Fields, the three plugins). <sup>s</sup>

7. **An earlier version's page** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal where the article "Tidal Patterns" is published,
   on a press with the publication format "PDF", approved and available,
   holding an open-access PDF file.

   - **A new version**: Journal Manager: create a new version of "Tidal
     Patterns", as [Publish, schedule &
     versions](U49-publish-schedule-and-versions.md) scenario 4 does; on
     the new version's "Title & Abstract" page change "Title" to "Tidal
     Patterns Revisited" and press "Save"; then publish the new version,
     as that spec's scenario 5 does.
   - **The current page**: the visitor opens the article's page and
     views its source: "citation_title" reads "Tidal Patterns
     Revisited", and so does "DC.Title" on a journal and a press (Rule
     12).
   - **The earlier version's page**: on the article's page, press the
     first version's link under "Versions": its source carries no
     "citation_" tag and no "DC." tag, a
     "robots" tag reading "noindex", and a "canonical" link to the
     current version's page (Rule 13).
   - **The earlier version's file page** {OMP}: on the first version's
     page, press the "PDF" format's link: its source carries no "DC." tag
     and no "robots" tag (Rule 13).
   - **Control**: before the new version was published, the article's
     page carried "citation_title" "Tidal Patterns" (Rule 12).
     <sup>s</sup>

8. **"Google Analytics Plugin": the number and the script** {OJS OMP OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal where the article "Tidal Patterns" is published
   and whose "Google Analytics Plugin" nobody has touched.

   - **Off on a new journal**: open Settings › Website › "Plugins" ›
     "Installed Plugins": under "Generic Plugins", "Google Analytics
     Plugin" is unticked and its row offers no "Settings"; on a journal
     its description reads "Integrate OJS with Google Analytics, Google's
     web site traffic analysis application. …" [A2](#a2). The visitor
     opens the journal's home page: its source holds no
     "googletagmanager" (Rules 18, 20).
   - **Enabled**: tick "Google Analytics Plugin": "The plugin "Google
     Analytics Plugin" has been enabled." shows (Rule 15).
   - **The window**: press the arrow beside the plugin's row, then
     "Settings": a window titled "Google Analytics Plugin" opens, its
     first paragraph beginning "With this plugin enabled Google Analytics
     may be used to collect and analyze web site usage and traffic.",
     then the box "Account number", empty and with no asterisk, then
     "Cancel" and "OK", above "Required fields are marked with an
     asterisk: *" (Fields).
   - **An empty number**: press "OK": "This field is required." shows
     under the box, and the window stays open (Fields; Rule 20).
   - **"Cancel"**: type "G-CANCELLED1" and press "Cancel": the window
     closes with no question. Reopen it: the box is empty (Rule 20).
   - **A number saved**: type `'G-TEST12345';`, as Google's snippet
     writes it, and press "OK": the window closes with no message.
     Reopen it: the box reads `G-TEST12345`; press "Cancel" (Fields;
     Rule 20).
   - **The script**: the visitor reloads the home page, then opens the
     article's page of "Tidal Patterns": each looks as before, and each
     source holds "https://www.googletagmanager.com/gtag/js?id=" and
     "G-TEST12345"; the browser requests
     "https://www.googletagmanager.com/gtag/js?id=G-TEST12345" (Rule 19;
     Side effects).
   - **Pages without it**: Journal Manager: the source of the Dashboard
     and of Settings › Website holds no "googletagmanager"; nor does the
     site's home page, the part of the journal's address before the
     journal's path, which the visitor opens (Rule 19).
   - **Disabled again**: untick "Google Analytics Plugin": the "Disable"
     window asks "Are you sure you want to disable this plugin?". Press
     "OK": "The plugin "Google Analytics Plugin" has been disabled."
     shows, and the row offers no "Settings". The visitor reloads the
     home page: its source holds no "googletagmanager" (Rules 15, 21).
   - **Enabled again**: tick "Google Analytics Plugin", press the arrow
     beside its row, then "Settings": the box reads `G-TEST12345`. The
     visitor reloads the home page: its source holds the script's
     address with "G-TEST12345" again (Rules 19, 21).
   - **Control**: after the first tick and before a number was saved,
     the visitor's home page, reloaded, still held no "googletagmanager"
     (Rule 19). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - A1 (a "Description" with a double quote mark: the journal's home page carries the whole text in its description tag; Rule 9)
  - OMP1 {OMP} (a book with an EPUB format and an HTML format: the book page's "citation_fulltext_html_url" names the HTML file alone; Fields, "citation_fulltext_html_url")
  - OMP2 {OMP} (a book with two PDF files for the whole book and no ISBN: one "citation_pdf_url" per file; Fields, "citation_pdf_url")
  - A5 (an expired announcement: the sitemap lists the unexpired one alone; Rule 3)
  - A2 (the Plugins list's "Google Analytics Plugin" description on a press and a preprint server, and its "Settings" window's paragraphs, naming no other application and no missing function; scenario 8)
  - A7 (an abstract holding "&" and "<": "citation_abstract" and "DC.Description" carry the symbols, not their HTML entities; Fields, "citation_abstract")
  - OMP3 {OMP} (book 14's pages: "DC.Type" "Text.Book" on the book's page and a whole-book file's view page, "Text.Chapter" on a chapter's page and a chapter file's view page; Rule 17)
  - OMP4 {OMP} (a published book with a chapter page and "Create New Version", then the new version published: the sitemap lists the chapter page at the address the book's page links to, and it opens; Rule 2c)
- **Rarely met**:
  - "User Registration" set to "The Journal Manager will register all
    user accounts. …", which takes "Register" out of the sitemap
    (Settings bullet 10; Rule 3): a journal closes registration once,
    when it is set up, not in an ordinary week
  - {OJS} "Publishing Mode" set to "OJS will not be used to publish the
    journal's contents online.", which takes "Current", "Archive" and
    the issue pages out of the sitemap (Settings bullet 13; Rule 2b): a
    journal that does not publish online is rare, and chooses so once
- **Nothing new to test**:
  - {OPS} a preprint with a "URL Path", listed in the sitemap by its
    number (Rule 4)
  - a version's other languages in the Dublin Core tags, and "DC.Rights"
    read on a French page (Rule 14)
  - "Description" and "Custom Tags" in a second form language, and a
    page read in a language whose box is empty (Fields; Rules 9, 10)
  - {OJS OPS} a galley's view page, which carries no plugin tag (Rule
    13)
  - the alternate links of a search results page, and of the site's own
    pages (Rule 8)
  - "About the Journal" text set, which adds its entry to the sitemap
    (Settings bullet 11; Rule 3)
  - a "Custom Page" item, which adds its page to the sitemap (Settings
    bullet 12; Rule 3)
  - the Google Analytics window's close button, and leaving the page,
    with a change typed (Rule 20)
  - a box of spaces, or a value with no number in it, in "Account
    number" (Fields)
  - the Editor and the Production Editor on the "Search Indexing" tab
    (Actors row 3): the same tab as scenario 5's Journal Manager
  - the Site Administrator's Google Analytics window from the Settings
    Wizard's "Plugins" tab (Actors row 6): the same window, showing the
    journal's number, as scenario 8's
- **Register carries it**:
  - A1 (a "Description" with a double quote mark or with markup; Rule 9)
  - A3 (the Site Administrator ticking "Google Analytics Plugin" on the
    site's own Plugins list; Actors row 7; Rule 22)
  - A5 (an expired announcement in the sitemap; Rule 3)
  - A6 (a contributor whose names are not entered in the submission's
    language; Fields, "citation_author")
  - A7 (an "&" in the abstract; Fields, "citation_abstract")
  - OJS1 {OJS} ("DC.Source.URI"; Fields)
  - OJS2 {OJS} (published articles, in an issue or without one, missing
    from the sitemap; Rule 2a; scenario 2 passes it)
  - OMP1, OMP2 {OMP} (a book's files that are not PDFs, and a second
    PDF; Fields, "citation_fulltext_html_url", "citation_pdf_url")
  - OMP4 {OMP} (a new version of a published book: the chapter entries;
    Rule 2c)
  - OMP6 {OMP} (following a book file address the tags give; Rule 12;
    scenario 6 passes it)
  - OPS1 {OPS} (a preprint with a "URL Path": the HTML full-text tag;
    Fields, "citation_fulltext_html_url")
- **No seed**:
  - {OMP} a chapter with its own page, in the sitemap and with its own
    tags, the book's identifiers and "Text.Book" among them, and a
    series' page (Fields, "What the sitemap lists"; Rule 16)
  - {OMP} the ISBNs of a format (Fields, "citation_isbn"; Rule 17)
  - the DOI tags (Fields, "citation_doi", "DC.Identifier.DOI")
  - "Pages", "Coverage", "Type" and the copyright and license tags
    (Fields, the two tag tables)
  - the visit Google's script reports to google-analytics.com once it
    has loaded (Rule 19; Side effects): a test browser never reaches
    Google, so no Google script runs in it
- **Owned by another feature**:
  - the roles without the Settings pages at the tab's address (Actors
    preamble; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - {OMP OPS} the Site Administrator without a manager-level role at the
    tab's address (Actors preamble; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md#a1)*, its register)
  - leaving the "Search Indexing" tab with a change unsaved (Fields;
    *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, Rule 5)
  - {OJS} the LOCKSS and CLOCKSS pages' "Description" row (Side effects;
    [Archiving & preservation](U67-archiving-preservation.md))

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | Search engines get the home page's "Description" cut at its first double quote mark | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A2](#a2) | "Google Analytics Plugin" tells a press and a preprint server it integrates OJS, and points every manager to a "Check Status" function that does not exist | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A5](#a5) | The sitemap lists expired announcements, whose entries lead to the Announcements list | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A6](#a6) | A contributor whose names are not entered in the submission's language is announced by the given name alone | 🐞 | minor | — |
| [A7](#a7) | Reference managers and indexes get an abstract's "&" and "<" as "&amp;" and "&lt;" | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [OJS1](#ojs1) | "DC.Source.URI" points to an address that does not exist instead of the journal's home page | 🐞 | minor | — |
| [OJS2](#ojs2) | A journal's sitemap lists no article at all, only the issues' pages | 🐞 | user-visible | — |
| [OMP1](#omp1) | A book page tells Google Scholar its EPUB, or any file that is not a PDF, is HTML full text | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [OMP2](#omp2) | A book with two PDF files for the whole book announces only one of them to Google Scholar | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [OMP3](#omp3) | A press's chapter pages tell indexes they are books, and whole-book file pages that they are chapters | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [OMP4](#omp4) | After "Create New Version", a press's sitemap lists the book's chapter pages at addresses that answer "404 Not Found" | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [OMP5](#omp5) | A book file's page names the book's page as its own address | 🐞 | minor | — |
| [OMP6](#omp6) | Every book file address the tags give fails with a server error instead of the file | 🐞 | critical · crash: both | issues (claude), 2026-10-01 — re-verified |
| [OPS1](#ops1) | A preprint with a "URL Path" announces an HTML full-text address that ends on "404 Not Found" | 🐞 | high | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | The site's own "Google Analytics Plugin" box can be ticked but changes nothing | ❓ | minor | — |
| [A4](#a4) | The three apps' sitemaps list different kinds of listing pages: only a press lists its categories, and a press omits its Search page | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — Search engines get the home page's "Description" cut at its first double quote mark** · 🐞 · medium.
A manager who types a "Description" on Settings › Distribution ›
"Search Indexing" expects search engines to receive the whole text
from the journal's home page. When the text holds an ordinary straight
double quote mark (`"`), the home page's description tag ends at that
mark, and the words after it are dropped from the description. The
form says "Saved" and nothing on the page changes, so the cut goes
unnoticed.

The box is plain text with no formatting editor, but markup can be
typed into it by hand. Typing a description that ends
`"public access to <i>science</i>".` also puts the text
`science"." />` at the top of the home page, above the header.

It applies to the "Description" in every language, on the journal's
(press's, server's) own home page, the one page that carries the tag.
The site's index page never carries it.
Basis: probe, 2026-10-03. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Google Analytics Plugin" tells a press and a preprint server it integrates OJS, and points every manager to a "Check Status" function that does not exist** · 🐞 · low.
On a press and a preprint server, the description of "Google Analytics
Plugin" in the Plugins list reads "Integrate OJS with Google Analytics,
…", naming the journal software.

On all three apps, the plugin's "Settings" window warns that "the 'Check
Status' function may not accurately report whether it has detected the
required tracking code". No screen of the app has such a function. The
sentence was written for OJS 2 in 2008, about a link in Google
Analytics' own interface of that time, and carried into the shared
plugin in 2016.

The plugin ships with all three apps and is listed under "Generic
Plugins" on every install, disabled by default, so every manager who
sets it up reads both texts. Most translations repeat them: 33 of the
38 name OJS in the description.
Basis: probe, 2026-10-03. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The site's Google Analytics box does nothing** · ❓ · minor.
A Site Administrator who ticks "Google Analytics Plugin" on the site's
own Plugins tab gets "The plugin "Google Analytics Plugin" has been
enabled." and the box stays ticked, but nothing changes: the site's
pages never carry the script, and the row offers no "Settings" in which
to give a number (Rule 22).
Question: should the site's Plugins list offer "Google Analytics Plugin"
at all? Lean: no; leave it off that list (or give the site a number and
its pages the script), since a box that is accepted and does nothing
leads the administrator to believe the site's pages are measured.
Basis: probe, 2026-09-26. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The sitemaps list different listing pages** · ❓ · minor.
Every app has a Search page and category pages, but a journal's and a
preprint server's sitemaps list the Search page and no category page,
while a press's lists its category pages and no Search page; a preprint
server's also leaves out its list of preprints.
Question: should every sitemap list each public listing page its app
has? Lean: yes, the Search page and the category pages in all three
apps, since search engines reach the listed works through them; the
difference follows no product reason.
Basis: probe, 2026-09-26. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The sitemap lists expired announcements, whose entries lead to the Announcements list** · 🐞 · low.
A journal with announcements switched on expects its sitemap to list
the announcements a visitor can read. The sitemap lists every
announcement the journal has, including those whose expiry date has
passed. Following an expired announcement's entry does not open the
announcement: the app sends the visitor or search engine on to the
"Announcements" list, which no longer shows it.

It shows once an announcement's expiry date has passed, and the
entries grow by one with each announcement that expires.
Basis: probe, 2026-10-03. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Author tags give the given name alone in another language** · 🐞 · minor.
An author whose names are entered in English submits an item in French.
The item's page shows "Ada Author", but "citation_author" and
"DC.Creator.PersonalName" read "Ada": the tags take the name in the
submission's language alone, and in French the contributor has a given
name but no family name. Indexes receive the author without a family
name.
Basis: probe, 2026-09-26. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Reference managers and indexes get an abstract's "&" and "<" as "&amp;" and "&lt;"** · 🐞 · medium.
An editor types an abstract that holds an "&" or a "<", such as "Soil &
water quality improved (P<0.01).". The item's page shows it as typed.
The copy of the abstract that the page gives reference managers and
indexes, in the "citation_abstract" tag (and "DC.Description" on a
journal and a press), reads "Soil &amp; water quality improved
(P&lt;0.01).".

A reader who saves the item to a reference manager such as Zotero gets
the abstract with "&amp;" and "&lt;" in it.

On a press, the book page and each book file's page carry the same
wrong abstract.
Basis: probe, 2026-10-03. <sup>f-a7</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — "DC.Source.URI" points nowhere** · 🐞 · minor.
An index reading an article page's "DC.Source.URI" expects the journal's
home page address. It gets the journal's address with the journal's
path repeated after it, such as
`https://example.org/index.php/journal/journal`, which answers "404 Not
Found". A press's tag gives its home page correctly.
Since: 2024-04-16 · Basis: probe, 2026-09-26. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — A journal's sitemap lists no article** · 🐞 · user-visible.
A journal expects its sitemap to list each published article and its
galleys under their issue. It lists each published issue's page and
nothing under it, whether the article sits in a published issue or was
published with "Don't Assign To An Issue", so search engines learn of
articles only by following the issue and archive pages' links. The
sitemap listed them until February 2026: a regression, not a choice.
Since: 2026-02-17 · Basis: probe, 2026-09-26. <sup>f-ojs2</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A book page tells Google Scholar its EPUB, or any file that is not a PDF, is HTML full text** · 🐞 · medium.
A press offers a book as an EPUB, or as any other file that is neither a
PDF nor HTML. Its book page then tells Google Scholar that this file is
the book's full text in HTML: the "citation_fulltext_html_url" tag names
the EPUB's download address. A chapter's page does the same with the
chapter's files.

When the book also has a real HTML file, only one of the two gets the
tag: the file uploaded first. If the press uploaded the EPUB first, its
HTML full text is left out. Nothing on screen shows this. The only way
round is to make the EPUB format "Not Available", which also takes the
EPUB away from readers.

It applies to any format marked "Available" whose file has its terms
set, on any press where the Google Scholar plugin is on, as it is by
default.
Basis: probe, 2026-10-03. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — A book with two PDF files for the whole book announces only one of them to Google Scholar** · 🐞 · low.
A book that offers two PDF files for the whole book, in one publication
format or in two, announces only one of them to Google Scholar. The
book page carries a single "citation_pdf_url" tag, for the file
uploaded first. The same holds for two HTML files, and for two files of
one kind on a chapter's page.

The page itself offers both files to readers, so only the search index
misses one. The press is not told.

It happens when the formats carry no ISBN, as in PKP's own test data.
When every such format carries an ISBN, both files are announced.
Basis: probe, 2026-10-03. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A press's chapter pages tell indexes they are books, and whole-book file pages that they are chapters** · 🐞 · low.
On a press, the Dublin Core tag "DC.Type" does not follow what a page
describes. A chapter's own page reads "Text.Book", although its title,
author and abstract tags are the chapter's. The view page of a file for
the whole book, not assigned to a chapter, reads "Text.Chapter",
although its tags describe the book. That is the in-browser page the
book page's file link opens, not the download.

The book's page ("Text.Book") and a chapter file's view page
("Text.Chapter") are right. Readers see nothing wrong, and the press is
not told. "Dublin Core Indexing Plugin" writes these tags and is enabled
on every new press.
Basis: probe, 2026-10-03. <sup>f-omp3</sup>

<a id="omp4"></a>
**OMP4 — After "Create New Version", a press's sitemap lists the book's chapter pages at addresses that answer "404 Not Found"** · 🐞 · medium.
A press that starts a new version of a published book expects its
sitemap to go on listing the book's chapter pages at the addresses the
book's page links to. From "Create New Version" on, the sitemap lists
each chapter page at another address, which answers "404 Not Found".
The address the book's page links to still opens the chapter. It is no
longer in the sitemap.

Each version keeps its own copy of a chapter, and the sitemap writes
the copy's number, while a chapter page is addressed by the chapter's
number in the book's first version. So the listed address matches no
chapter page, before the new version is published and after.

The book's own entry and its file entries stay right.
Basis: probe, 2026-10-03. <sup>f-omp4</sup>

<a id="omp5"></a>
**OMP5 — A book file's page names the book's page as its address** · 🐞 · minor.
An index reading a book file's page expects "DC.Identifier.URI" to be
that page's own address. It is an address under "catalog/book" that
shows the book's page, with the book's own tags, so the file's page is
never named (Rule 17).
Basis: probe, 2026-09-26. <sup>f-omp5</sup>

<a id="omp6"></a>
**OMP6 — Every book file address in the tags fails** · 🐞 · critical · crash: both.
Google Scholar following a book or chapter page's "citation_pdf_url" or
"citation_fulltext_html_url" expects the file. The address answers a
server error instead: the app fails, as it does for a reader opening
any book file, whose view page shows an empty viewer. *Monograph landing
page* owns the file downloads.
Basis: probe, 2026-10-01. <sup>f-omp6</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint with a "URL Path" announces an HTML address that ends on "404 Not Found"** · 🐞 · high.
On a preprint with a "URL Path", "citation_fulltext_html_url" names the
HTML galley's address, which leads on to the preprint's download
address with the galley dropped and ends on "404 Not Found", as the
page's own "HTML" link does; without a "URL Path" the same address
serves the file. [Article landing page &
reading](U13-article-landing-page-and-reading.md#ops2) records the
address fault.
Basis: probe, 2026-10-01. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 at the checkouts' tips: ojs `d9b567efec`, omp
`187f0f40d`, ops `61cd158ce3`. Every claim was then driven on the three
apps on 2026-09-26, on scratch journals, presses and preprint servers
with throwaway accounts and read-only on `publicknowledge`; the `q` notes
record what the screens showed. Every opening of Settings › Website, the
Settings Wizard or Administration › "Site Settings" also answered 500 on
`GET $$$call$$$/grid/plugins/plugin-gallery-grid/fetch-grid`: the Plugin
Gallery's failure, *Plugins management*'s, not this feature's. The three
plugins are app-side copies in `plugins/generic/`; `googleAnalytics` is
byte-identical in the three apps (`diff -r`, locale files included),
`googleScholar` differs between OJS and OPS only by the OJS article
number branch, and OMP's `googleScholar` and `dublinCoreMeta` are
OMP's own code.

<a id="fn-a"></a>
**a** — Plugins: `DublinCoreMetaPlugin` (OJS, OMP), `GoogleScholarPlugin` (three apps), `GoogleAnalyticsPlugin` (three apps), each `extends GenericPlugin`, category `generic`. Display names `plugins.generic.dublinCoreMeta.name` "Dublin Core Indexing Plugin", `plugins.generic.googleScholar.name` "Google Scholar Indexing Plugin", `plugins.generic.googleAnalytics.displayName` "Google Analytics Plugin"; descriptions `plugins.generic.dublinCoreMeta.description` (OJS "…in article views…", OMP "…in monograph views…"), `plugins.generic.googleScholar.description`, `plugins.generic.googleAnalytics.description` ("Integrate OJS with Google Analytics…" in the three apps' `locale/en/locale.po`). The two indexing plugins declare `getContextSpecificPluginSettingsFile()` → `settings.xml` (`enabled` bool true), which `PluginSettingsDAO::installSettings()` writes for every new context; `googleAnalytics` has no settings file (`version.xml` `lazy-load` 1), so a new context has no `enabled` row. Each registers its hooks only when `getEnabled($mainContextId)`. OPS has no `plugins/generic/dublinCoreMeta`. Seed facts (2026-09-24): a preprint server ships no "Dublin Core Indexing Plugin"; the two indexing plugins arrive ticked on `publicknowledge` and every scratch context. Live-probed 2026-09-26 (Purpose; the plugins table; Rules 15, 18): notes q1, q17, q20.

<a id="fn-b"></a>
**b** — Settings access: `ManagementHandler::distribution()` behind `CanAccessSettingsPolicy` (the Journal identity spec's settings-access note). Settings Wizard: `AdminHandler::wizard()` (site admin only, `admin/contextSettings.tpl`), which builds the same `PKPSearchIndexingForm` against `contexts/{id}` of the chosen context and shows it on the side tab `indexing` (`manager.setup.searchEngineIndexing`) under the top tab `manager.setup` ("Journal Settings", OMP "Setup", OPS "Server Settings"); its "Plugins" tab loads `SettingsPluginGridHandler` for that context. The Appearance-and-theming spec (Rule 34) records the wizard's path and tabs. Live-probed 2026-09-26 (Actors preamble, rows 3–6): notes q22, q25.

<a id="fn-c"></a>
**c** — `PKP\components\forms\context\PKPSearchIndexingForm` (id `searchIndexing`, method PUT to the context API): group `search` labelled `manager.setup.searchEngineIndexing` "Search Indexing" with description `manager.setup.searchEngineIndexing.description` "Help search engines like Google discover and display your site. You are encouraged to submit your <a href="{$sitemapUrl}" target="_blank">sitemap</a>." (app locale files; `$sitemapUrl` is `$router->url($request, $context->getPath(), 'sitemap')`); `FieldText searchDescription` (`common.description` "Description", tooltip `manager.setup.searchDescription.description`, app locale, "journal" / "press" / "server"), `FieldTextarea customHeaders` (`manager.distribution.customHeaders` "Custom Tags", tooltip `manager.distribution.customHeaders.description`), both `isMultilingual`. Schema `lib/pkp/schemas/context.json`: both multilingual strings, `nullable`, no length or content rule. Tab: `lib/pkp/templates/management/distribution.tpl` (OPS `templates/management/distribution.tpl`, the same tab) `<tab id="indexing">`. Consumers of `searchDescription` besides Rule 9: the webFeed templates, OJS `announcementFeed` templates, OJS `templates/gateway/lockss.tpl` and `clockss.tpl`. `manager.setup.searchEngineIndexing.success` (OMP) is read by no code. Live-probed 2026-09-26 (Fields, the tab; Rules 9, 10, 24; Side effects): notes q11, q12, q25. Live-probed 2026-09-26 (Side effects), OJS: with "Letters about still water." saved, the LOCKSS and CLOCKSS pages showed it as their "Description" row once their boxes on Settings › Distribution › "Archiving" › "LOCKSS and CLOCKSS" were ticked and saved; before that both addresses landed on the journal's home page. The web feeds (RSS 2.0, Atom) and the OJS announcement feed carried the "Description" while "Journal Summary" was empty, falling back to English on a French read.

<a id="fn-d"></a>
**d** — `GoogleAnalyticsPlugin::getActions()` adds the `settings` `LinkAction` (`manager.plugins.settings` "Settings", `AjaxModal` titled `getDisplayName()`) only while `getEnabled()`. `manage()` with `verb=settings` builds `GoogleAnalyticsSettingsForm($this, $context->getId())`, with `$context = $request->getContext()`; on the site's Plugins tab no "Settings" was offered at all (A3, note f-a3). The form: `settingsForm.tpl` with `plugins.generic.googleAnalytics.manager.settings.description` (two paragraphs, the second on the "'Check Status' function"), `fbvElement type="text" id="googleAnalyticsSiteId"` labelled `…settings.googleAnalyticsSiteId` "Account number" with no `required` flag (the box carries the class `required`, which the page's own form check reads: an empty box is refused in the browser with "This field is required." and nothing is sent, while a box of spaces passes it and meets the server's check), `{fbvFormButtons}` ("OK", "Cancel") and `common.requiredField`; checks `FormValidator` required (`…googleAnalyticsSiteIdRequired` "Please enter an account number."), `FormValidatorPost`, `FormValidatorCSRF`; `execute()` tidies the value before storing it (note q22), and a value left with nothing is stored empty, which `registerScript()` treats as no number. On success `manage()` returns `JSONMessage(true)` with no `createTrivialNotification()`, unlike the Web Feed plugin's window. Live-probed 2026-09-26 (Actors rows 5, 6; the window; Rules 20, 21; Setting 6): notes q22, q23.

<a id="fn-e"></a>
**e** — `PKP\pages\sitemap\PKPSitemapHandler::index()` (no `authorize()` override, so `PKPHandler::authorize()` applies the site-access checks, and `PKPPageRouter::route()` those for a context that is not enabled, Rule 6): with no context `_createSitemapIndex()` lists `$request->url($context->getPath(), 'sitemap')` for `getContextDAO()->getAll(true)` (enabled contexts); with a context `_createContextSitemap()`, served `application/xml`, `Content-Disposition: inline; filename=sitemap.xml`, each entry `_createUrlTree()` with `loc` only. Shared entries in order: context home; `user/register` unless `disableUserReg`; `login`; `announcement` and `announcement/view/{id}` for every announcement of the context (`Announcement::withContextIds`, no date filter) when `enableAnnouncements`; `about` when `about` is not empty; `about/submissions`; `about/contact` when `mailingAddress` or `contactName`; `{path}` for each `NavigationMenuItem::NMI_TYPE_CUSTOM` item. Subclasses (`APP\pages\sitemap\SitemapHandler`, each overriding `_createContextSitemap()` and calling the parent first): OJS adds `search`, and unless `publishingMode == PUBLISHING_MODE_NONE` `issue/current`, `issue/archive`, then per published issue (`ORDERBY_PUBLISHED_ISSUES`) `issue/view/{id}`, its submissions `filterByIssueIds()` + `filterByLatestPublished(true)` as `article/view/{bestId}` and each current-publication galley `article/view/{bestId}/{bestGalleyId}`, then hook `SitemapHandler::createJournalSitemap`; OMP adds `catalog`, each `STATUS_PUBLISHED` book `catalog/book/{bestId}`, its chapters with `isPageEnabled()` `catalog/book/{bestId}/chapter/{id}`, files of approved (`getApprovedByPublicationId`) and available formats with a direct sales price not null `catalog/view/{bestId}/{formatBestId}/{fileBestId}`, then `catalog/newReleases`, each series `catalog/series/{path}` and each category `catalog/category/{path}`, hook `…createPressSitemap`; OPS adds `search` and each `STATUS_PUBLISHED` preprint `preprint/view/{submissionId}` (the number, not `getBestId()`), hook `…createServerSitemap`. `$request->url()` leaves `urlLocaleForPage` null, so `PKPPageRouter::url()` inserts the request's locale for a context with more than one locale (`_getLocaleForUrl()`). Chapter box `publication.chapter.hasLandingPage`. Registration labels `manager.setup.userRegistration`, `…enableUserRegistration`, `…disableUserRegistration` (app locale files). Live-probed 2026-09-26 (Rules 1–6): notes q2–q8.

<a id="fn-g"></a>
**g** — `PKPTemplateManager::initialize()` (`Application::isInstalled()`): `addHeader('searchDescription', '<meta name="description" content="' . $currentContext->getLocalizedData('searchDescription') . '" />')` when the requested page is `''` or `index` and the text is not empty, with no escaping (A1); `addHeader('generator', …)` with contexts `frontend` and `backend`, `__($application->getNameKey())` ("Open Journal Systems", "Open Monograph Press", "Open Preprint Systems") and `getCurrentVersion()->getVersionString(false)` (3.6.0.0 at these tips); `addHeader('customHeaders', $currentContext->getLocalizedData('customHeaders'))` when a context is set; with more than one of the context's (else the site's) supported locales, `language-{locale}` `<link rel='alternate' hreflang='…'>` per locale and `language-xdefault` (`urlLocaleForPage: ''`); with a context that is not enabled, `noindex` `<meta name="robots" content="noindex,nofollow" />` for `frontend` and `backend`. `addHeader()` defaults to the `frontend` context; `frontend/components/headerHead.tpl` prints `{load_header context="frontend"}`, `layouts/backend.tpl` `{load_header context="backend"}`. `getLocalizedData()` falls back through `getBestLocalizedData()` (the requested locale, then the primary one, then the first). Live-probed 2026-09-26 (Rules 7–11): notes q9–q13.

<a id="fn-h"></a>
**h** — Google Scholar: OJS and OPS `GoogleScholarPlugin::submissionView()` on `ArticleHandler::view` and `PreprintHandler::view` (the landing page only, with no galley), returning early when the second request argument is `version`; tags as the Fields table, from `$submission->getCurrentPublication()` and its `locale`: `citation_journal_title`, `citation_journal_abbrev` (`abbreviation`, else `acronym`, primary locale), `citation_issn` (`onlineIssn`, `printIssn`, `issn`) for `ojs2`; `citation_publisher` for `ops`; `citation_author` / `citation_author_institution` per `getAffiliations()` name; `citation_title` `getLocalizedFullTitle($publicationLocale)`; `citation_language`; OJS `citation_date` (`Y/m/d` of `datePublished` unless the issue's year differs, else the issue year, else the issue's date), `citation_volume` / `citation_issue` by `getShowVolume()` / `getShowNumber()`, `citation_firstpage` / `citation_lastpage` from `getStartingPage()` / `getEndingPage()` when `pages`, else `articleNumber` as first page (OJS only); OPS `citation_online_date`; `citation_doi`; `citation_{pubIdType}` per `pubIdPlugins`; `citation_abstract_html_url` (`urlPath ?? id`, `urlLocaleForPage: ''`); `citation_abstract`; `citation_keywords` for `subjects` then `keywords` of the publication locale; per galley file `citation_pdf_url` (`application/pdf`, `…/download/{id}/{galley}`) or `citation_fulltext_html_url` (`text/html`, `…/view/{id}/{galley}`); `citation_reference` per `citations` (hook `GoogleScholarPlugin::references`). OMP `GoogleScholarPlugin::monographView()` on `CatalogBookHandler::book` (book and chapter pages), skipping any request whose arguments contain `version`: `citation_title` (chapter's on a chapter page), `citation_language`, `citation_publication_date` (`Y-m-d`; the chapter's date when `getEnableChapterPublicationDates()`), authors (`chapterAuthors` on a chapter page) with institutions, `citation_abstract`, `citation_doi` (the publication's), keywords, then for each of `availableFiles` matched to its format: on the book page files with no chapter, `citation_isbn` per identification code `02`/`15`, and `_setFileUrl()`; on a chapter page that chapter's files; then `citation_publisher`, `citation_issn` (series online ISSN), `citation_reference`. `_setFileUrl()` switches on the mimetype with `case 'application/pdf'` and `case 'text/xml' or 'text/html'`, which PHP reads as `case true`, so every other mimetype takes the second branch (OMP1); it receives `$i` by value, so the header names `googleScholarPdfUrl{$i}` / `googleScholarHtmlUrl{$i}` repeat when no ISBN moved `$i`, and `addHeader()` keeps the last (OMP2). OMP writes no `citation_{pubIdType}` tag (the Identifiers spec, "citation_urn" absent on a book page). Live-probed 2026-09-26 (Rules 12, 14, 16; the Google Scholar table): notes q14, q16, q18.

<a id="fn-i"></a>
**i** — Dublin Core: OJS `DublinCoreMetaPlugin::articleView()` on `ArticleHandler::view` (skipping `version` requests): `schema.DC` link; `DC.Contributor.Sponsor` (`supportingAgencies` per locale), `DC.Coverage`, `DC.Creator.PersonalName` (`getFullName(false, false, $publicationLocale)`), `DC.Date.created` (`datePublished`), `DC.Date.dateSubmitted`, `DC.Date.issued` (issue's `getDatePublished()`), `DC.Date.modified` (`lastModified`), `DC.Description` (abstract per locale, `strip_tags`), `DC.Format` (galley file mimetype), `DC.Identifier` (`urlPath` else id), `DC.Identifier.pageNumber`, `DC.Identifier.articleNumber`, `DC.Identifier.DOI`, `DC.Identifier.{pubIdType}`, `DC.Identifier.URI`, `DC.Language` (`rfc5646`), `DC.Rights` (`submission.copyrightStatement` "Copyright (c) {$copyrightYear} {$copyrightHolder}" when both, and `licenseUrl`), `DC.Source` (name, primary locale), `DC.Source.ISSN`, `DC.Source.Issue` / `DC.Source.Volume`, `DC.Source.URI` (OJS1), `DC.Subject` (subjects, keywords per locale), `DC.Title`, `DC.Title.Alternative`, `DC.Type` `Text.Serial.Journal` and `type` per locale, `DC.Type.articleType` (section title, primary locale). No tag reads `disciplines`, `rights` or `source`. OMP `monographView()` on `CatalogBookHandler::book` (book and chapter pages): the same set without the issue, format, pages, article number, ISSN and article-type tags, chapter values on a chapter page (`chapterAuthors`, chapter abstract, chapter DOI and pub IDs, chapter title), `DC.Source.URI` `url(…, ROUTE_PAGE, $press->getPath())`, `DC.Type` `Text.Book`. OMP `monographFileView()` on `CatalogBookHandler::view` (the inline viewer path of `CatalogBookHandler::download(…, true)`, reached before `PdfJsViewerPlugin`, which registers `Hook::SEQUENCE_LATE`): skips a format of another publication; `DC.Identifier` `{bestId}/{formatId}/{fileId}`, `DC.Identifier.pageNumber` (chapter's or publication's `pages`), `DC.Identifier.DOI` (file, chapter, publication), `DC.Identifier.ISBN` per format code `02`/`15`, `DC.Identifier.URI` `catalog/book/{bestId}/{formatId}/{fileId}`, `DC.Language` scheme `ISO639-1`, `DC.Source.ISSN` (series online ISSN), `DC.Type` `Text.Chapter` always (OMP3). Live-probed 2026-09-26 (Rules 12, 14, 16, 17; the Dublin Core table): notes q14, q16, q18, q19.

<a id="fn-j"></a>
**j** — Versions: OJS `ArticleHandler::view()` and OPS `PreprintHandler::view()`, on the landing branch, add `noindex` `<meta name="robots" content="noindex">` and `canonical` `<link rel="canonical" href="{current page}">` when the requested publication is not the current one, before the plugins' hook; on the galley branch they add `noindex` alone. OMP `CatalogBookHandler::book()` does the same for an earlier version. The plugins' own `version` check returns before writing any tag. Live-probed 2026-09-26 (Rule 13): note q15.

<a id="fn-k"></a>
**k** — `GoogleAnalyticsPlugin::register()` hooks `TemplateManager::display` (not under maintenance); `registerScript()` returns with no context, a router other than the page router, or an empty `googleAnalyticsSiteId`; otherwise `addJavaScript('googleanalytics', …)`, whose default context is `frontend`: a loader that inserts `https://www.googletagmanager.com/gtag/js?id=` + the stored number and calls `gtag('config', …)`. The site's pages have no context, so they never carry it. Live-probed 2026-09-26 (Rules 19, 22; Side effects): notes q21, q24.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-26 (Purpose, the absence paragraph; the plugins table), all three apps, on a new scratch context of each, as its manager: under "Generic Plugins" OJS and OMP listed "Dublin Core Indexing Plugin" ticked (OJS "…in article views…", OMP "…in monograph views…"); every app listed "Google Scholar Indexing Plugin" ticked and "Google Analytics Plugin" unticked, with the descriptions the table quotes; OPS listed no Dublin Core row. Signed out, a posted preprint's page source held no "DC." tag and no Dublin Core schema link, and seven "citation_" tags; an OJS article page held 17 "DC." tags, an OMP book page 13.

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-26 (Rules 1, 2, 2c; the sitemap table), all three apps, signed out: `{journal address}/sitemap` answered `application/xml`, shown inline, Chromium printing "This XML file does not appear to have any style information associated with it. The document tree is shown below." above the tree; each entry held its address alone; the entries came in the table's order on every read, on contexts made with nothing enabled too. A submitted item, a scheduled one and a second context's item never appeared. On a press and a preprint server "Unpublish" ("Unpost") on the workflow removed the item at the next load and publishing again restored it; on a journal publishing, unpublishing and republishing an article changed nothing (OJS2). A scan of 14 other editorial, administration and public pages found no other link to the sitemap. OMP: a chapter with "Show this chapter on its own page…" ticked was listed and an unticked one was not; "Not Available" on the format, or "Not Available" in the file's terms, removed the file's entry and "Available" or "Open Access" restored it (the priced end not driven); a file still "Awaiting Approval" on its own row was listed. After "Create New Version" on a published book the entry `catalog/book/sea-study/chapter/1` gave way to `…/chapter/3`, which answered "404 Not Found", while the book read "Status: Unpublished" for the new version (OMP4). The seeded press listed "New Releases", both series and all seven categories; the seeded journal and server, holding the same categories, listed none. OPS listed both posted preprints and not the submitted or scheduled one.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-26 (Rule 2a; OJS2), OJS: on a scratch journal with a published issue holding two published articles and a third article published with "Don't Assign To An Issue" ("This will be published immediately without any issue association."), the sitemap listed the issue's page (`issue/view/7`) and none of the three articles or their galleys, while the issue page linked the articles and their galleys; the same on two other scratch journals and on `publicknowledge`.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-26 (Rule 2b; Settings bullet 13), OJS: Settings › Distribution › "Access" offered "The journal will provide open access to its contents.", "The journal will require subscriptions to access some or all of its contents." and "OJS will not be used to publish the journal's contents online.", none selected on a new journal; the third saved removed "Current", "Archive" and the issue's page at the next load, and the first restored them.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-26 (Rule 3; Settings bullets 9–12; A5), all three apps, the sitemap read signed out after each save: "Enable announcements" ticked with a current announcement and one that expired on 2020-01-31 listed "Announcements" and both, the expired one's address landing on the "Announcements" list; unticked, all three left. "The Journal Manager will register all user accounts. …" removed "Register", and "Visitors can register…" restored it. A text saved in "About the Journal" added its entry, and the text emptied and saved removed it. A "Custom Page" item placed in no menu was listed after "Contact", and its page opened. "Contact" was listed on every context; Settings › Journal › "Contact" with "Name" emptied refused "Save" with "This field is required." and "Please correct one error.", sending nothing, and a "Mailing Address" saved left the sitemap unchanged.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-26 (Rule 4), OMP and OPS: with "URL Path" `sea-study` saved on a book and the book published, its entry and its chapter's and file's entries used `sea-study`; a preprint with the same "URL Path" was listed by its number (`preprint/view/5`), which led on to `preprint/view/sea-study`. A journal lists no article (OJS2). On `publicknowledge` (English and French), all three apps: `{journal address}/en/sitemap` listed only "/en/" addresses and `/fr_CA/sitemap` only "/fr_CA/" ones; the address with no language led to the visit's language; a one-language scratch context's addresses carried none.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-26 (Rule 5; Settings bullet 8), all three apps: `{site address}/index/sitemap` (served as `sitemap_index.xml`) listed one sitemap address per enabled context and left out a context not enabled; after the Site Administrator unticked "Enable this journal to appear publicly on the site" ("Enable this press…", "Enable this preprint server…") on "Hosted Journals" › "Edit" and saved, that context's entry left at the next load. A context with "Users must be registered and log in to view the journal site." saved stayed listed.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-26 (Actors row 1; Rule 6; Settings bullet 7), all three apps: with "Users must be registered and log in to view the journal site." ("…view the press site.", "…view the server site.") ticked on screen, a signed-out read of the sitemap landed on Login with a return address, and on a context not enabled publicly on Login without one; signed in as the closed context's own Reader, and as the not-enabled context's own manager or Reader, the sitemap showed as Rule 2 says.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-26 (Rule 7), all three apps: "Open Journal Systems 3.6.0.0", "Open Monograph Press 3.6.0.0" and "Open Preprint Systems 3.6.0.0" on the home, item, list, About, Login and Search pages, the Dashboard, a workflow page, Settings, the site's home and Login pages and Administration.

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-26 (Rule 8; Settings bullet 14), all three apps: on `publicknowledge` and on a two-language scratch context, English and French reads of every public page carried "en", "fr-CA" and "x-default" links, each to the same page in that language, "x-default" without a language; a search results page (`…/en/search/search?query=water`) linked `…/en/search/search`, `…/fr_CA/search/search` and `…/search/search`. A one-language context and the editorial pages carried none; the site's home and Login pages carried "fr-CA", "en" and "x-default".

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-26 (Fields, "Description"; Rule 9; A1), all three apps: the help text as quoted. "Letters about still water." saved gave `<meta name="description" content="Letters about still water." />` on the home page (`{journal address}/en` and `…/en/index`) and on no About, item, list, Login or Search page; read in French with the French box empty, the English text; with a French text saved, each language its own; emptied in both, no tag. A 20- and a 400-character text each gave "Saved", the tag holding all 400 characters. `The "Sea" journal` saved and reloaded as typed; the tag read `content="The "Sea" journal"`, which the browser took as "The " with the stray attributes `sea"` and `journal"`, nothing visible; `The "Sea" <b>journal</b> & more` showed `journal & more" />` above the home page's header.

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-26 (Fields, "Custom Tags"; Rule 10), all three apps: `<meta name="u20-check" content="custom">` and, on a second line, "Plain words", saved ("Saved"; the same after a reload), were printed in the hidden header of every public page read (home, About, item, list, Login, Search) and of no editorial page, Administration page, or site home or Login page. "Plain words" showed as the first line at the top left of each public page, above the header; the three alternate links and four theme style sheets that follow it in the page source sat in the page's body in the element inspector, and back in the hidden header once the box was emptied. Read in French with the French box empty, the pages printed the English box; with a French box saved, the French pages printed only the French one.

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-26 (Rule 11; Settings bullet 8), all three apps: with "Enable this journal to appear publicly on the site" unticked by the Site Administrator, the context's manager read `<meta name="robots" content="noindex,nofollow" />` on the home, item, Dashboard and Settings pages, and the Login page a signed-out visitor was sent to carried it too; ticked again, the tag was gone at the next load; an enabled context never carried it.

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-26 (Rule 12; the two tag tables; A6, A7, OMP1, OMP2, OMP6, OPS1), all three apps, signed out (the same tags as the context's Reader and manager), on scratch contexts in English and French: an item with a title and subtitle, two contributors with three affiliations, a marked-up abstract holding "&", subjects, keywords, two references, "Coverage" and "Type", a licence and a DOI prefix set before publishing, "URL Path" `sea-study`; on OJS "Pages" 12-20 in a published issue Vol. 3 No. 7 (2024); on OMP the formats "PDF", "PDF Two", "HTML", "Notes" (a Markdown file) and "Chapter PDF". Every row of the tables held as stated, at both ends where a row names a condition: ISSN none, print or online; "Journal Abbreviation" or initials; volume and number shown or hidden on the issue's "Issue Data"; "Pages" or "Article Number"; a DOI or none; an ISBN-13 on "PDF" or none; the issue's year against the publication date. "DC.Source.URI" read `{journal address}/{journal path}` on OJS, answering 404, and the press's home page on OMP. "citation_urn" and "DC.Identifier.URN" appeared after "Assign" on the item's Identifiers page. The published version's abstract, edited under "Warning: This version has been published. Editing it may impact the published content.", reached "citation_abstract" and "DC.Description" at the next load. An item submitted in French by an author whose names were entered in English: the page showed "Ada Author", both author tags "Ada" (A6). The abstract "The sea & its tides" read `content="The sea &amp;amp; its tides…"` (A7). OMP, no ISBN: one "citation_pdf_url" (the "PDF Two" file) and one "citation_fulltext_html_url" (the Markdown file); with an ISBN-13 on "PDF" alone, still one "citation_pdf_url" (OMP1, OMP2); every file address the tags named answered 500, the server logging "Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization" (OMP6). OPS, on the preprint with a "URL Path": `preprint/view/sea-study/{galley}` redirected to `preprint/download/{number}/{galley}` and then to `preprint/download/sea-study`, the galley dropped, answering "404 Not Found"; without a "URL Path" the same links served the file (OPS1). OJS and OPS PDF addresses answered the file.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-26 (Rule 13), all three apps: after "Create New Version", a changed title and a publish, the first version's page (`…/version/{id}`, the id its link under "Versions" carries: 14 on OJS and OMP, 13 on OPS) carried no "citation_" or "DC." tag, a "robots" tag "noindex" and a "canonical" link to the current page (with the language in it); the current galley pages {OJS OPS} carried no plugin tag, the earlier version's galley pages the "robots" tag alone. OMP: the earlier version's file pages carried no tag at all; the Markdown file's earlier page and every download answered 500 (OMP6). The current version opened at its own `…/version/{id}` address (18 on OJS and OMP, 17 on OPS) carried no plugin tag, "robots" or "canonical"; no page links to that address. On OPS, an earlier version opened by number on a preprint with a "URL Path" ended on "404 Not Found", the fault [Article landing page & reading](U13-article-landing-page-and-reading.md#ops2) records.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-26 (Rule 14), all three apps: English and French interfaces gave the same tags, except "DC.Rights", which read "Copyright (c) {year} {journal name}" in English and "© {journal name} {year}" in French (OJS, OMP); Dublin Core wrote the abstract, subjects, keywords, supporting agencies, "Coverage", "Type" and the other title in French too, Google Scholar the submission language's only; an item submitted in French spoke French in either interface. A discipline ("marine science"), a "Rights" and a "Source" value appeared in no tag.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-26 (Rule 15; Settings bullets 3, 4), all three apps: unticking asked, in a window headed "Disable", "Are you sure you want to disable this plugin?" (OK, Cancel), then showed "The plugin "…" has been disabled."; ticking asked nothing and showed "…has been enabled.". "Dublin Core Indexing Plugin" off: its tags and the schema link left the article, book, chapter and file pages at the next load and the Google Scholar tags stayed; with "Google Scholar Indexing Plugin" off, the reverse; both on again, every tag returned, in the same counts. OPS: Google Scholar alone, both ends.

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-26 (Rule 16; Settings bullet 15), OMP: on "Chapter One Tides" (its own page ticked, with its own abstract, contributor and file), the chapter's title, its contributor with his two affiliations and its abstract; "2023-11-02" in both date tags with chapter dates on, the book's "2024-03-05" with them off, and a chapter with no date of its own the book's; "citation_doi" the book's, "DC.Identifier.DOI" the chapter's; "DC.Identifier" and "DC.Identifier.URI" the book's and "DC.Type" "Text.Book"; keywords, subjects and references the book's; "citation_pdf_url" the chapter's own file and none of the book's. Saved unticked, the book page listed the chapter without a link and its address answered "404 Not Found"; ticked, the chapter's page carried its tags.

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-26 (Rule 17; OMP3, OMP5), OMP: every file page opened from the book page carried Dublin Core tags alone: "DC.Identifier" `sea-study/13/14`, "DC.Identifier.URI" `…/catalog/book/sea-study/13/14`, which opened the book's page with the book's own tags; "DC.Identifier.ISBN" "9780306406157" on the "PDF" file's page once saved; "DC.Identifier.pageNumber" "5-9" on the chapter's file and none on the whole-book files; "DC.Source.ISSN" the series' online ISSN; "DC.Type" "Text.Chapter" on every file page, while the book page read "Text.Book". The pages' viewer showed no file, the download answering 500 and the page script failing with "PDFJS is not defined" (OMP6). "DC.Language" used the scheme "ISO639-1" there and "rfc5646" on the book page.

<a id="fn-q20"></a>
**q20** — Live-probed 2026-09-26 (Rule 18), all three apps: "Google Analytics Plugin" unticked on a new context, on `publicknowledge` and on the site's own Plugins list, its description as the plugins table quotes; the home, item and Login pages and the Dashboard held no "googletagmanager".

<a id="fn-q21"></a>
**q21** — Live-probed 2026-09-26 (Rule 19; Side effects), all three apps: ticked with no number saved, no page carried the script. With `G-TEST12345` saved, the home, item, Login, About, list, Search and Register pages carried the loader with "https://www.googletagmanager.com/gtag/js?id=" and the number, signed out, as the Reader and as the manager; the visible text of the page was unchanged; the browser requested `https://www.googletagmanager.com/gtag/js?id=G-TEST12345` and then `https://region1.google-analytics.com/g/collect?…tid=G-TEST12345…`. No script on the Dashboard, Settings, a workflow page, the statistics page, the user's profile, Administration, the site's home and Login pages, or another context's home page.

<a id="fn-q22"></a>
**q22** — Live-probed 2026-09-26, two runs (Actors rows 5, 6; the window; Rule 20; Setting 6), all three apps: unticked, the row had no actions; ticked, its arrow offered "Settings", which opened the window as described, "Account number" with no asterisk. "OK" on the empty box: "This field is required." under the box and no request sent; on a box of spaces: "Please enter an account number." in the same place and "Errors occurred processing this form" at the window's top; the window stayed open and nothing was stored either way. `'G-TEST12345';` and "OK": the window closed with no message and reopened, also after a reload, as `G-TEST12345`; `UA-12345-1` and a 252-character value were stored as typed; `'';` closed the window and reopened empty, with no script on any page. `G-CANCELLED1` and "Cancel": no question, nothing stored. The window's close button after a change asked "The data on this form has changed. Do you wish to continue without saving?", and leaving the page raised the browser's leave question; nothing stored. The Site Administrator on the Settings Wizard's "Plugins" tab got "Settings", "Delete" and "Upgrade" on the ticked row, and "Settings" opened the window showing `G-TEST12345`.

<a id="fn-q23"></a>
**q23** — Live-probed 2026-09-26 (Rule 21), all three apps: unticking asked the question of Rule 15 and then showed "The plugin "Google Analytics Plugin" has been disabled."; the row lost its arrow and "Settings", at once and after a reload; the home and item pages lost the script at the next load; ticked again, "Settings" showed `G-TEST12345` and the script returned.

<a id="fn-q24"></a>
**q24** — Live-probed 2026-09-26, two runs (Actors row 7; Rule 22; A3), all three apps, on sites hosting 12 contexts (a site with one journal was not reached): Administration › "Site Settings" showed "Plugins", with "Google Analytics Plugin" unticked under "Generic Plugins"; ticking it answered "The plugin "Google Analytics Plugin" has been enabled." and it stayed ticked after a reload; its arrow offered "Delete" and "Upgrade" only, ticked or not; the site's home page carried no script, for the Site Administrator and signed out. Restored to unticked, every row's box as before.

<a id="fn-q25"></a>
**q25** — Live-probed 2026-09-26 (Actors preamble, rows 3, 4; Fields, the tab; Rule 24; Side effects), all three apps: the heading, text and help texts as quoted, the "sitemap" link opening `{journal address}/en/sitemap` in a new tab. Distribution's tabs: OJS "License", "DOIs", "Search Indexing", "Payments", "Statistics", "Access", "Archiving"; OMP the first five; OPS "License", "DOIs", "Search Indexing", "Access", "Statistics". Every save showed "Saving" and then "Saved", one save storing both boxes; empty boxes, quote marks, markup and plain words were saved as typed. With English and French, "French" and "English" buttons sat above the form, "French" showing "Description in French" and "Custom Tags in French", each field reading "0/2 languages completed". A change typed and not saved survived a switch to another Distribution tab and back, and was dropped with no question on leaving or reloading the page. The Settings Wizard (Administration › "Hosted Journals", the row's arrow › "Settings wizard"; top tabs "Journal Settings" / "Setup" / "Server Settings", "Plugins", "Users"; side tab "Search Indexing") arrived with the journal's values; its "Save" gave "Saved", and the journal's own tab and home page showed the change. The journal's manager got the access-denied page at the wizard's address. At the tab's address the Site Administrator, the Journal Manager and the Editor (OJS, OMP) opened it; the Section Editor, an assistant, the Reviewer, the Author and the Reader got "The current role does not have access to this operation"; signed out, Login. A Site Administrator whose manager role was removed (the Reader role kept) opened the tab on OJS and got the access-denied page on OMP and OPS, while the wizard's "Save" worked on all three. No email reached the mail catcher, and no notification or activity-log entry followed a save.

<a id="fn-s"></a>
**s** — Seeding for the scenarios. Each scenario runs on OJS, OMP and OPS, on scratch contexts of its own from `POST scenarios/context` (`docs/process/scenarios.md`), with throwaway `users[]` (password: the username twice, `docs/process/users.md`): a `manager` (the Journal Manager, Press Manager or Preprint Server Manager) in scenarios 1, 2 and 5 to 8, an `author` (`givenName` "Ada", `familyName` "Author") who submits every item, and in scenario 3 a `reader` and a `manager`; the Site Administrator of scenario 5 is the installer's `admin` (password `admin`), whom every scratch context enrols as a manager; the visitor is a second browser context, signed out. Items come from `POST scenarios/submission` by the `author`, `published: true`. No scenario passes `plugins`: every context has its plugins as a new context has them (`docs/process/seed-facts.md`: the two indexing plugins ticked, no Dublin Core row on a preprint server, "Google Analytics Plugin" unticked), and scenarios 6 and 8 change them on screen; "Description", "Custom Tags" and the Google Analytics window are typed on their own screens. Scenario 1: the context alone (a scratch context's "About the Journal" text is empty and its principal contact is "Site Admin", seed-facts). Scenario 2: `enableAnnouncements: true` with `announcements: [{title: "Call for Papers"}]`; "Tidal Patterns" published and "Draft Study" `submitted: true`; on OJS `issues: [{volume: 1, number: 1, year: 2024, published: true}, {volume: 1, number: 2, year: 2026}]`, "Tidal Patterns" with `issue` Vol. 1 No. 1, and "Future Tides" `published: true` with `issue` Vol. 1 No. 2, which leaves it scheduled; on OMP `categories: [{path: "cat-one", title: "Cat One"}]` and, on "Tidal Patterns", `publicationFormats: [{name: "PDF", file: "article.pdf"}]`, which the key builds approved and available with its file open access; a second context with "Elsewhere" published (on OJS into its own `issues: [{volume: 1, number: 1, year: 2024, published: true}]`); the unpublish and the second publish are the screens'. Scenario 3: three contexts, `name` "Open Waters", "Members Only" with `restrictSiteAccess: true` and the `reader`, and "Hidden Bay" with `context.enabled: false` and the `manager`. Scenario 4: `publicknowledge`, read signed out (English and French are its interface languages, seed-facts), and a scratch context with its primary language alone. Scenario 5: a scratch context with its primary language alone and "Tidal Patterns" published. Scenario 6: `context` `name` "Sea Letters", `acronym` "SL"; "Tidal Patterns" with `abstract` "Tides follow the moon.", `citationsRaw` of two lines and `datePublished` `2024-03-05`, in the context's own first section ("Articles" on a journal); on OJS and OPS `keywords: ["tides"]` and `galleys: [{label: "PDF", file: "article.pdf"}]` (OPS `preprint.pdf`), on OJS with `issue` into `issues: [{volume: 1, number: 1, year: 2024, published: true}]`; on OMP `publicationFormats: [{name: "PDF", file: "article.pdf"}]` (a press refuses `keywords`). Scenario 7: "Tidal Patterns" published, on OMP with the "PDF" format of scenario 6; no key makes a second version, so the new version is the screens' ("Create New Version"). Scenario 8: "Tidal Patterns" published. The mail catcher is not read: nothing is emailed (Side effects).

<a id="fn-f-a1"></a>
**f-a1** — Note g: the "description" tag is built by string concatenation with no `htmlspecialchars()`, unlike every plugin tag (which escape their content); the context API's `PKPSchemaService::sanitize()` casts to string and strips nothing. A double quote therefore closes the attribute, and a ">" closes the tag, the rest printing as page text. Live-probed 2026-09-26, all three apps: note q11.
Issue report: [docs/issues/U20-A1-home-page-description-cut-at-quote-mark.md](../issues/U20-A1-home-page-description-cut-at-quote-mark.md), filed as [pkp-e2e#663](https://github.com/jardakotesovec/pkp-e2e/issues/663).

<a id="fn-f-a2"></a>
**f-a2** — Notes a, d: `plugins.generic.googleAnalytics.description` and `…manager.settings.description` in `plugins/generic/googleAnalytics/locale/en/locale.po`, identical in the three apps (a shared plugin tree); no code or template offers a "Check Status" action. The `…authorAccount*` strings of the same file are read by no code. Live-probed 2026-09-26, all three apps: notes q1, q20, q22 (the two texts as quoted).
Issue report: [docs/issues/U20-A2-analytics-plugin-texts-name-ojs-and-check-status.md](../issues/U20-A2-analytics-plugin-texts-name-ojs-and-check-status.md), filed as [pkp-e2e#667](https://github.com/jardakotesovec/pkp-e2e/issues/667).

<a id="fn-f-a3"></a>
**f-a3** — Note d: `getEnabled()` of a lazy-load plugin reads the site's own `enabled` row on the site's Plugins tab, so the box keeps its tick; `registerScript()` returns with no context, so the site's pages never carry the script (note k). The draft's reading of the code, that the ticked site row would offer "Settings" and its window fail for want of a journal, did not hold on screen: no "Settings" was offered, so no window opened. Live-probed 2026-09-26, two runs, all three apps: note q24.

<a id="fn-f-a4"></a>
**f-a4** — Note e: each app's `SitemapHandler` adds its own listing pages (OJS `search`, `issue/current`, `issue/archive`; OMP `catalog`, `catalog/newReleases`, series and category pages; OPS `search`). Live-probed 2026-09-26, all three apps: the journal's `catalog/category/applied-science`, the server's `preprints/category/applied-science` and its `preprints` list (headed "Archives") opened and were listed by no sitemap; `{press address}/search` opened "Search" and was not listed; the press listed its series and categories. Note q2.

<a id="fn-f-a5"></a>
**f-a5** — Note e: the announcement entries come from `Announcement::withContextIds` with no date filter, while the announcement's own page sends an expired announcement's reader to the list. Live-probed 2026-09-26, all three apps: note q5.
Issue report: [docs/issues/U20-A5-sitemap-lists-expired-announcements.md](../issues/U20-A5-sitemap-lists-expired-announcements.md), filed as [pkp-e2e#666](https://github.com/jardakotesovec/pkp-e2e/issues/666).

<a id="fn-f-a6"></a>
**f-a6** — Notes h, i: `citation_author` and `DC.Creator.PersonalName` read `getFullName(false, false, $publicationLocale)`, the name in the submission language only, with no fallback; the item's page falls back to the other language. The contributor copied from the submitting author holds the given name in the submission language and not the family name. Live-probed 2026-09-26, all three apps (Dublin Core on OJS and OMP), in either interface language: note q14.

<a id="fn-f-a7"></a>
**f-a7** — Notes h, i: the tags print `htmlspecialchars(strip_tags($abstract))`, and the stored abstract already holds "&" as `&amp;`, so it is escaped a second time. Live-probed 2026-09-26, all three apps (Dublin Core on OJS and OMP, and on a book file's page): note q14.
Issue report: [docs/issues/U20-A7-abstract-symbols-reach-search-tags-as-codes.md](../issues/U20-A7-abstract-symbols-reach-search-tags-as-codes.md), filed as [pkp-e2e#668](https://github.com/jardakotesovec/pkp-e2e/issues/668).

<a id="fn-f-ojs1"></a>
**f-ojs1** — Note i: OJS `DublinCoreMetaPlugin` builds `DC.Source.URI` with `$request->getDispatcher()->url($request, ROUTE_PAGE, null, $journal->getPath(), urlLocaleForPage: '')`, the journal's path in the handler slot, so the address is `{journal address}/{journal path}`. Before commit `2c65b53000` "Show locale in url in multilingual contexts" (2024-04-16) it was `$request->url($journal->getPath())`, the home page; OMP's copy passes the path as the context. Live-probed 2026-09-26: the tag read `…/index.php/{path}/{path}` and answered 404; OMP's named the press's home page, 200 (note q14). Written up for the team in `docs/reports/2026-09-26-ojs-dc-source-uri-404.md`.

<a id="fn-f-ojs2"></a>
**f-ojs2** — Note e: OJS `SitemapHandler::_createContextSitemap()` reaches articles only through the published issues, with `filterByIssueIds([$issue->getId()])` and, since ojs `da7c68874e` "pkp/pkp-lib#12245 Review and fix use of PKPSubmission::STATUS_..." (2026-02-17), `filterByLatestPublished(true)` in place of `filterByStatus([Submission::STATUS_PUBLISHED])`; the two filters together keep no article of a published issue. `stable-3_5_0`'s `SitemapHandler` still filters by status (code read, not driven). The "Don't Assign To An Issue" publish (the Publish, schedule & versions spec, Rule 15 and its issue table) leaves the article outside every issue, so the sitemap never reached it, before the change or after. Live-probed 2026-09-26: note q3. Written up for the team in `docs/reports/2026-09-26-ojs-sitemap-lists-no-article.md`.

<a id="fn-f-omp1"></a>
**f-omp1** — Note h: `case 'text/xml' or 'text/html':` evaluates to `case true:`, which `switch` matches for any mimetype that is not `application/pdf`; the header name `googleScholarHtmlUrl{$i}` repeats as for OMP2, so the last such file wins. Live-probed 2026-09-26: the "HTML" file (`text/html`) got no tag and the "Notes" file (`text/markdown`) the one "citation_fulltext_html_url" (note q14).
Issue report: [docs/issues/U20-OMP1-book-epub-announced-as-html.md](../issues/U20-OMP1-book-epub-announced-as-html.md), filed as [pkp-e2e#664](https://github.com/jardakotesovec/pkp-e2e/issues/664).

<a id="fn-f-omp2"></a>
**f-omp2** — Note h: `_setFileUrl()` takes `$i` by value; with no identification code between two files, both write the header `googleScholarPdfUrl0`, and `addHeader()` keeps the second; an ISBN on the first format moves `$i` only after that format's file. Live-probed 2026-09-26: one "citation_pdf_url", the "PDF Two" file's, with no ISBN and with an ISBN-13 on "PDF" alone (note q14).
Issue report: [docs/issues/U20-OMP2-book-page-announces-one-pdf.md](../issues/U20-OMP2-book-page-announces-one-pdf.md), filed as [pkp-e2e#665](https://github.com/jardakotesovec/pkp-e2e/issues/665).

<a id="fn-f-omp3"></a>
**f-omp3** — Note i: `monographFileView()` always adds `DC.Type` `Text.Chapter`, while `monographView()` adds `Text.Book`. Live-probed 2026-09-26: note q19.
Issue report: [docs/issues/U20-OMP3-book-file-page-type-chapter.md](../issues/U20-OMP3-book-file-page-type-chapter.md), filed as [pkp-e2e#669](https://github.com/jardakotesovec/pkp-e2e/issues/669).

<a id="fn-f-omp4"></a>
**f-omp4** — Note e: OMP's `SitemapHandler` takes a book's chapters from `getLatestPublication()` and its formats from `getCurrentPublication()`, so an unpublished new version's chapters replace the published ones. Live-probed 2026-09-26: note q2.
Issue report: [docs/issues/U20-OMP4-sitemap-new-version-chapter-pages-404.md](../issues/U20-OMP4-sitemap-new-version-chapter-pages-404.md).

<a id="fn-f-omp5"></a>
**f-omp5** — Note i: `monographFileView()` builds `DC.Identifier.URI` as `catalog/book/{bestId}/{formatId}/{fileId}`, an address `CatalogBookHandler::book()` answers with the book's page, where the file view is `catalog/view/…`. Live-probed 2026-09-26: note q19.

<a id="fn-f-omp6"></a>
**f-omp6** — Every `GET {press address}/catalog/download/{book}/{format}/{file}`, with or without `?inline=1`, current or earlier version, answered 500, the server logging "Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization"; the file's view page failed in the browser with "PDFJS is not defined" and "UnexpectedResponseException". The failure is in the book file download, which *Monograph landing page* owns; the tags merely name its addresses. Live-probed 2026-09-26: notes q14, q15, q19.
Issue report: [pkp-e2e#282](https://github.com/jardakotesovec/pkp-e2e/issues/282) ([docs/issues/U69-A9-book-file-open-download-fails.md](../issues/U69-A9-book-file-open-download-fails.md)).

<a id="fn-f-ops1"></a>
**f-ops1** — Note h: OPS `citation_fulltext_html_url` names `preprint/view/{bestId}/{galleyBestId}`; with a "URL Path" set, the redirect to the download address drops the galley. Live-probed 2026-09-26: note q14.
Issue report: [pkp-e2e#203](https://github.com/jardakotesovec/pkp-e2e/issues/203) ([docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md](../issues/U13-OPS2-OPS3-ops-number-address-url-path.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Search Indexing" tab | Settings › Distribution › "Search Indexing" | AFFM-093 |
| The Settings Wizard's "Search Indexing" side tab | Administration › "Hosted Journals" › "Settings wizard" › first tab › "Search Indexing" | AFFM-200 |
| The journal's sitemap and the site's index (shared entries) | {journal address}/sitemap · {site address}/index/sitemap | ROUTE-025 |
| The journal's sitemap {OJS} | issues, articles, galleys, Search | ROUTE-049 |
| The press's sitemap {OMP} | catalog, books, chapters, files, series, categories | ROUTE-068 |
| The preprint server's sitemap {OPS} | Search, preprints | ROUTE-084 |
| "Dublin Core Indexing Plugin" {OJS OMP}: its row and its tags | Settings › Website › "Plugins" › "Installed Plugins" › "Generic Plugins"; article, book, chapter and file pages | PLUG-014 |
| "Google Analytics Plugin": its row, its "Settings" window, its script | the same list; every public page | PLUG-015 |
| "Google Scholar Indexing Plugin": its row and its tags | the same list; article, preprint, book and chapter pages | PLUG-016 |

## Reference — code anchors

- Form and tabs: `lib/pkp/classes/components/forms/context/PKPSearchIndexingForm.php` · `lib/pkp/pages/management/ManagementHandler.php::distribution()` · `lib/pkp/pages/admin/AdminHandler.php::wizard()` · `lib/pkp/templates/management/distribution.tpl` · `ops/templates/management/distribution.tpl` · `lib/pkp/templates/admin/contextSettings.tpl` · `lib/pkp/schemas/context.json` (`searchDescription`, `customHeaders`)
- Sitemap: `lib/pkp/pages/sitemap/PKPSitemapHandler.php` · `ojs|omp|ops/pages/sitemap/{index,SitemapHandler}.php`
- Head tags: `lib/pkp/classes/template/PKPTemplateManager.php` (`initialize()`, `addHeader()`, `addJavaScript()`) · `lib/pkp/templates/frontend/components/headerHead.tpl` · `lib/pkp/templates/layouts/backend.tpl`
- Versions: `ojs/pages/article/ArticleHandler.php::view()` · `ops/pages/preprint/PreprintHandler.php::view()` · `omp/pages/catalog/CatalogBookHandler.php` (`book()`, `download()`)
- Plugins: `ojs|omp/plugins/generic/dublinCoreMeta/{DublinCoreMetaPlugin.php,settings.xml}` · `ojs|omp|ops/plugins/generic/googleScholar/{GoogleScholarPlugin.php,settings.xml}` · `ojs|omp|ops/plugins/generic/googleAnalytics/{GoogleAnalyticsPlugin,GoogleAnalyticsSettingsForm}.php` · `templates/settingsForm.tpl` · each plugin's `locale/en/locale.po`
- Access: `lib/pkp/classes/handler/PKPHandler.php::authorize()` · `lib/pkp/classes/security/authorization/RestrictedSiteAccessPolicy.php` · `lib/pkp/classes/core/PKPPageRouter.php` (`route()`, `url()`)
- Locale: `ojs|omp|ops/locale/en/manager.po` (`manager.setup.searchEngineIndexing*`, `manager.setup.searchDescription.description`, registration labels) · `lib/pkp/locale/en/{manager,common,submission}.po`
