---
name: usage-statistics
status: verified
---

# Statistics — usage

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal wants to know how its published work is read: how often each
article's page is opened, how often its files are downloaded, how often
the journal's home page and (on a journal) each issue are visited, and
from where. The installation records every reader visit as it happens and
turns the records into figures once a day. The Journal Manager, the
Editor and the Section Editor read the figures on the editorial side menu's
"Statistics" pages, narrow them by date, section or search, and download
them as spreadsheets; libraries and publishers' partners get the same
figures in the industry-standard COUNTER format, as files from the
"Counter R5" page or by machine from the journal's SUSHI address (SUSHI is
the COUNTER protocol for fetching reports automatically). The Site
Administrator decides what the whole installation collects and keeps, and
each journal may collect less. <sup>a</sup>

## Actors & permissions

The **statistics roles** are the manager-level roles (Journal Manager,
Editor, Production Editor), the Section Editor, the Guest Editor {OJS} and
the Site Administrator. They see the figures of every published article of
the journal, whether they are assigned to it or not; no statistics page
narrows the list by assignment. The Site Administrator holds a Journal
Manager role in every journal of the test installs. "Whoever opens the
Settings pages" is defined in
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access).

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Articles", "Journal", "Issues" {OJS} and "Counter R5" pages** (Rules 6–15, 19) | • the statistics roles, from the side menu's "Statistics" group or by the page's address<br>• every other role of the journal (Author, Reviewer, Reader, the assistant-level roles): the access-denied page<br>• signed out: the Login page <sup>b</sup> |
| **Download a spreadsheet of the figures** (Rules 16–18) | • whoever opens the page, from its "Download Report" <sup>i</sup> |
| **Download a COUNTER report on "Counter R5"** (Rules 19–22) | • the manager-level roles and the Site Administrator<br>• Section Editor, Guest Editor {OJS}: while the journal's COUNTER statistics are public (Rule 23, the default); while they are restricted the page opens an "Error" window reading "The current role does not have access to this operation." ("OK") over a list reading "No items found.", and once they are public again the list returns ⚠ [A5](#a5) <sup>l</sup> <sup>n</sup> <sup>td6</sup> |
| **Fetch COUNTER reports from the journal's SUSHI address** (Rule 23) | • anyone, signed out included, while the journal's COUNTER statistics are public (the default)<br>• the manager-level roles and the Site Administrator alone, while they are restricted <sup>n</sup> |
| **Open "COUNTER Reports"** {OJS} (Rule 25) | • whoever opens Statistics › "Reports" (*Statistics — editorial activity & reports*), from that page's "COUNTER Reports" link <sup>p</sup> |
| **Change what the installation collects** (Administration › Site Settings › "Statistics", Rule 26) | • Site Administrator alone <sup>q</sup> |
| **Change what the journal collects** (Settings › Distribution › "Statistics", Rules 27–30) | • whoever opens the Settings pages, while the tab shows (Rule 27) <sup>r</sup> |

## Fields & validation

**"Articles" page** (Statistics › "Articles"; heading "Articles"), top to
bottom: <sup>f</sup>

| Part (UI label) | What it shows |
|-----------------|---------------|
| heading row | "Articles"; at the right the date range (Rule 7) and "Filters" where the journal has filters (Rule 11) |
| chart | the visits over the range (Rule 10), with "Abstracts" / "Files" and "Daily" / "Monthly" above it; on a press the first button reads "Catalog Entries" [OMP2](#omp2) |
| "Article Details" | the table's title; at its right "{n} of {total} articles" and "Download Report" |
| columns | "Title" (with the search box, Rule 13), "Abstract Views", "File Views", "PDF", "HTML", "Other", "JATS" {OJS} (while "JATS Template Plugin" is on, Settings bullet 10), "Total" |
| rows | one per article (Rule 12); below them page numbers when there are more than 30 |

**"Journal" page** (Statistics › "Journal"), top to bottom: "Journal" with
the date range; the chart with "Daily" / "Monthly"; the table "Views",
with an information icon "About journal statistics" whose text (in the
table below) shows only while the mouse pointer rests on it ⚠
[A7](#a7); "Download Report" at its right, the columns "Title" and "Total", and one row: the journal's name,
linking to its home page in a new tab, and the total over the range.
<sup>g</sup>

The "Articles" and "Journal" pages use each app's own words:
<sup>f</sup> <sup>g</sup>

| Where | Journal | Press | Preprint server |
|-------|---------|-------|-----------------|
| side menu entries | "Articles", "Journal" | "Monographs", "Press" | "Preprints", "Server" |
| "Articles" page: browser tab title | "Article Stats" | "Monograph Stats" | "Preprint Stats" |
| "Articles" page: heading | "Articles" | "Monographs" | "Preprints" |
| "Articles" page: table title | "Article Details" | "Monograph Details" | "Preprint Details" |
| "Articles" page: count line | "{n} of {total} articles" | "{n} of {total} monographs" | "{n} of {total} preprints" |
| "Articles" page: empty table | "No articles were found with usage statistics matching these parameters." | "No monographs were found with usage statistics matching these parameters." | "No preprints were found with usage statistics matching these parameters." |
| "Journal" page: heading | "Journal" | "Press" | "Server" |
| "Journal" page: information icon | "About journal statistics": "Number of visitors viewing the journal's index page." | "About press statistics": "Number of visitors viewing the press's and catalog's index page." | "About server statistics": "Number of visitors viewing the server's index page." |

**"Issues" page** {OJS} (Statistics › "Issues"), top to bottom: "Issues"
with the date range; the chart with "Views" / "Downloads" and "Daily" /
"Monthly"; the table "Views and Downloads" with an information icon
"About issue statistics" (on hover: "Views: Number of visitors viewing
the issue's table of contents. Downloads: Number of downloads of the
issue galley, if one exists." [A7](#a7)), "{n} of {total} issues" and
"Download Report"; the columns "Issue" (with the search box "Search issue title, volume and
number"), "Views", "Downloads", "Total"; one row per issue with visits in
the range, its identification ("Vol. 1 No. 2 (2014)") linking to the
issue page; "No issues were found with usage statistics matching these
parameters." when there is none. <sup>h</sup>

<a id="date-range-fields"></a>
**The date range** (on every page above): the current range as text
("{first date} — {last date}", or "All dates") and a calendar button. The
button opens a list of the page's preset ranges and, under "Custom Range",
two boxes joined by "—" (an emptied box shows "YYYY-MM-DD") and "Apply".
Besides choosing a preset (Rule 7) or a range "Apply" accepts, the list
closes when the calendar button is pressed again, on a click anywhere
outside it, or when the keyboard focus leaves it, the last two within
about a second. Escape does nothing, with the focus on the button or in
a box ⚠ [A12](#a12). <sup>c</sup>

| Custom Range input | Result |
|--------------------|--------|
| a box not in the shape YYYY-MM-DD ("2026-9-1") | "The date format is not valid. Enter each date in the format YYYY-MM-DD." |
| a date that does not exist ("2026-02-30") | "One of the dates entered does not exist." |
| the first date after the second | "The start date must be before the end date." |
| a first date before 2001-01-01 | "The start date may not be earlier than 2001-01-01." |
| a second date after yesterday | "The end date may not be later than {yesterday's date}." |
| two valid dates | the list closes and the page shows that range |

A refused range leaves the page as it was, with the message under
"Apply" until the next "Apply". Only "Apply" applies a Custom Range:
Enter in a box does nothing (the list stays open, no message).
<sup>c</sup>

The two boxes hold the dates the page opened on ("{the day 31 days
ago}", "{yesterday}") and keep them when a preset is chosen: after "Last
90 days" or "All dates" they still show that first range, and "Apply"
pressed without typing puts the page back on it ⚠ [A13](#a13). Dates
typed and not applied stay in the boxes when the list is closed and
opened again, while the page keeps its range; leaving the page with
them asks no question. <sup>c</sup>

<a id="download-window"></a>
**The "Download" window** (opened by "Download Report", from the right),
top to bottom: <sup>i</sup>

| Page | Description line | Parameter table | Report panels (heading · line · button) |
|------|------------------|-----------------|------------------------------------------|
| "Articles" | "Download a CSV/Excel spreadsheet with usage statistics for articles matching the following parameters." | "Date Range" · the range ("{first date} to {last date}", or "All dates"); one row per filter heading ("Sections" · "All Sections" and "Issues" · "All Issues", or the chosen names joined by ", "); "Search Phrase" · the phrase, while one is applied | "Articles" · "The number of abstract views and file downloads for each article." · "Download Articles"<br>"Files" · "The number of downloads for each file." · "Download Files"<br>"Timeline" · "The number of views for each day." (or "downloads", "month" as the chart shows) · "Download Timeline"<br>"Geographic" (Rule 18), with an information icon "About Geolocation" (on hover: "Geolocation provided by DB-IP" [A7](#a7)) · "The number of views and downloads for each city, region or country." · "Download Geographic" |
| "Journal" | "Download a CSV/Excel spreadsheet with usage statistics for this journal matching the following parameters." | "Date Range" | "Journal" · "The number of journal's index page views." · "Download Journal"<br>"Timeline" · as above · "Download Timeline" |
| "Issues" {OJS} | "Download a CSV/Excel spreadsheet with usage statistics for issues matching the following parameters." | "Date Range"; "Search Phrase" while one is applied | "Issues" · "The number of TOC views and issue galley downloads for each issue." · "Download Issues"<br>"Timeline" · as above · "Download Timeline" |

On a press and a preprint server the windows name their own items:
<sup>i</sup>

| Part | Press | Preprint server |
|------|-------|-----------------|
| "Articles" window: description line | "Download a CSV/Excel spreadsheet with usage statistics for monographs matching the following parameters." | "Download a CSV/Excel spreadsheet with usage statistics for preprints matching the following parameters." |
| "Articles" window: filter rows | "Series" · "All Series", while the press has a series | "Sections" · "All Sections", while the server offers "Filters" (Rule 11) |
| "Articles" window: first panel | "Monographs" · "The number of abstract views and file downloads for each monograph." · "Download Monographs" | "Preprints" · "The number of abstract views and file downloads for each preprint." · "Download Preprints" |
| "Journal" window: description line | "Download a CSV/Excel spreadsheet with usage statistics for this press matching the following parameters." | "Download a CSV/Excel spreadsheet with usage statistics for this server matching the following parameters." |
| "Journal" window: panel | "Press" · "The number of press's and catalog's index page views." · "Download Press" | "Server" · "The number of server's index page views." · "Download Server" |

**The downloaded spreadsheets** (CSV files). Each starts with the
parameter lines of the window ("Date Range", one line per filter heading,
"Search Phrase" while applied; the timeline adds "Timeline Type" ("Views"
or "Downloads") and "Timeline Interval" ("Day" or "Month")), then an
empty line, then a line of column names and one line per row. A search
phrase holding double quotes breaks its "Search Phrase" line ⚠
[A8](#a8). No file starts with a byte-order mark, the invisible first
character that tells some spreadsheet programs the text is UTF-8 ⚠
[A9](#a9). <sup>i</sup>

| Report | Columns |
|--------|---------|
| "Download Articles" | "ID", "Title", "Authors", "Date Published" ("Date Posted" on a preprint server), "Total", "Abstract Views", "File Views", "PDF", "HTML", "Other", and "JATS" {OJS} as on the page |
| "Download Files" | "Article ID", "Article Title" ("Monograph ID", "Book Title" on a press; "Preprint ID", "Preprint Title" on a preprint server), "File ID", "File Name", "Type" ("Primary File" or "Supplementary File"), "File Views" |
| "Download Timeline" | "Date", "Label", "Total": one line per day or month of the range |
| "Download Geographic" | "Country", or "Region" and "Country", or "City", "Region" and "Country" (Rule 18); then "Total" and "Unique". Countries and regions are written by name ("Canada", "British Columbia"); a part the visit did not record reads "unknown" ("unknown,Ontario,Canada") |
| "Download Journal" | "ID", "Title", "Total" |
| "Download Issues" {OJS} | "ID", "Issue identification", "Total", "Views", "Downloads" |

**"Counter R5" page** (Statistics › "Counter R5"; heading "Counter R5
Reports"), top to bottom: the line "See COUNTER 5.0.3 documentation for
more information about each report." (the link opens COUNTER's site in a
new tab); the warning of Rule 21 while it applies; the list "Counter R5
Reports", one row per report reading "{name} ({ID})" with "Edit": <sup>l</sup>

| App | Reports, in list order |
|-----|------------------------|
| journal | "Platform Master Report (PR)", "Platform Usage (PR_P1)", "Title Master Report (TR)", "Journal Usage by Access Type (TR_J3)", "Item Master Report (IR)", "Journal Article Requests (IR_A1)" |
| press | "Platform Master Report (PR)", "Platform Usage (PR_P1)", "Title Master Report (TR)", "Book Usage by Access Type (TR_B3)" |
| preprint server | "Platform Master Report (PR)", "Platform Usage (PR_P1)", "Item Master Report (IR)" |

**"Report Settings" window** ("Edit" on a report; the title is the same
for every report), top to bottom, then "Download": <sup>l</sup>

| Field (UI label) | Reports | Required? | Rules |
|------------------|---------|-----------|-------|
| "Start Date" | all | yes | under it "Date should be in format YYYY-MM-DD or YYYY-MM. Earliest possible date is {date}."; filled with that date (Rule 21) |
| "End Date" | all | yes | under it "Date should be in format YYYY-MM-DD or YYYY-MM. Last possible date is {date}."; filled with that date (Rule 21) |
| "Customer ID" | all | yes | a list: "The World" (chosen) and each of the journal's institutions (Rule 24) |
| "Metric Type" | PR, TR, IR | yes, unmarked | four boxes, all ticked: "Total_Item_Investigations", "Unique_Item_Investigations", "Total_Item_Requests", "Unique_Item_Requests"; on a press two more, "Unique_Title_Investigations" and "Unique_Title_Requests". It carries no "*" mark, unlike "Start Date", "End Date" and "Customer ID", yet "Download" with every box unticked is refused <sup>td10</sup> |
| "Attributes To Show" | PR, TR, IR | no | boxes, none ticked: PR "Data_Type", "Access_Method"; TR adds "Section_Type", "Access_Type", "YOP"; IR "Article_Version", "Authors", "Access_Method", "Access_Type", "Data_Type", "Publication_Date", "YOP" |
| "Year Of Publication" | TR, IR | no | under it "A list or range of years of publication to return in response in format of yyyy\|yyyy\|yyyy-yyyy." |
| "Submission ID" | IR | no | the number of one of the journal's submissions |
| "Include Parent Details" | IR {OJS} | no | one box, unticked |
| "Exclude Monthly Details" | PR, TR, IR | no | one box, unticked: ticked, the file gives one total per row instead of a column per month |

"Download" refusals appear under the field they concern, and no file
arrives: <sup>l</sup> <sup>td5</sup>

  - a start before the earliest possible date, or an end after the last
    possible date: the date-range messages of the Custom Range table, with
    the date inside a raw code (the *earliest-date message* and the
    *last-date message*) ⚠ [A3](#a3);
  - a date not in the shape YYYY-MM-DD or YYYY-MM ("2026/07/01"): "The date
    format is not valid.", with the earliest-date message under it;
  - a date in that shape that does not exist ("2026-13-01"): the
    earliest-date message alone;
  - an emptied date box: "This field is required.", and nothing is sent;
  - a start after the end: "The start date must be before the end date."
    under both dates;
  - a "Submission ID" that is not one of the journal's submissions: "The
    submission ID does not exist.";
  - a "Year Of Publication" in another shape ("1999-"): "YOP format is not
    valid.";
  - "Metric Type" with every box unticked: "This field is required." under
    the boxes.

A refusal also shows "Please correct {n} errors." in the window, and,
all but the emptied date box, the notice "The form was not saved
because {n} error(s) were encountered. Please correct these errors and
try again." on the page, although this window saves nothing. The
window's "Close" drops any change without a question: "Edit" again
shows the fields as first filled. <sup>td5</sup>

**"COUNTER Reports" page** {OJS}: see Rule 25.

**Administration › Site Settings › "Site Setup" › "Statistics"**, top to
bottom, then "Save": <sup>q</sup>

| Group · field (UI label) | Choices, install default first | Rules |
|--------------------------|--------------------------------|-------|
| "Data Collection" ("Configure what kind of usage statistics should be collected.") · "Geographical Statistics" | radios: "Do not collect any geographical data", "Collect the visitor's country", "Collect the visitor's country and region", "Collect the visitor's country, region and city" | under it "Select the type of geographical usage statistics that can be collected by journals on this site. …" ("…collected by presses on this site. …" on a press, "…collected by servers on this site. …" on a preprint server) (Settings bullet 1) |
| "Data Collection" · "Institutional Statistics" | one box, "Enable institutional statistics", unticked | under it "…if you would like journals on this site to be able to collect usage statistics by institution. …" ("…presses on this site…", "…servers on this site…") (Settings bullet 2) |
| "Data Storage" ("Configure what usage statistics should be stored on the server.") · "Monthly or Daily Statistics" | radios: "Only track monthly statistics", "Track daily and monthly statistics" | Settings bullet 3 |
| "Data Storage" · "Compress Logs" | radios: "Leave the log files in place", "Compress the log files" | its line names the server folder the processed log files are moved to (Settings bullet 4) |
| "Sushi Protocol" · "Public API" | radios: "Make the COUNTER SUSHI statistics publicly available", "Restrict access to the COUNTER SUSHI statistics API to managers and admins" | Settings bullet 5 |
| "Sushi Protocol" · "Platform" | one box, "Use the site as the platform for all journals." ("…for all presses." on a press, "…for all servers." on a preprint server), unticked | its description reads, in every app, "By default, the journal will be designated as the platform for all statistics. However, if all of the journals on this site are published, owned or operated by the same provider, you may wish to designate the site as the platform." (Settings bullet 6) |
| "Sushi Protocol" · "Platform ID" | a text box, shown only while "Platform" is ticked, not marked required | required then: saved empty, "A platform ID must be required when the site will be identified as the SUSHI platform."; at most 17 characters of letters, digits, "_", "." and "/", otherwise "This is not formatted correctly."; a refusal also shows "Please correct one error." with a "Go to Platform ID" link, and nothing is stored. "Platform" unticked and saved with an ID in the box keeps the ID, shown filled on the next tick; only emptying the box first removes it <sup>td12</sup> |

**Settings › Distribution › "Statistics"** (Rule 27), top to bottom, then
"Save": <sup>r</sup>

| Field (UI label) | Shown while | Choices, default | Rules |
|------------------|-------------|------------------|-------|
| "Geographical Statistics" | the site collects geographical data | radios from "Do not collect any geographical data" up to the site's level; the site's level chosen | Rule 28, Settings bullet 7 |
| "Institutional Statistics" | the site's "Enable institutional statistics" is ticked | one box, "Enable institutional statistics", unticked | Rule 29, Settings bullet 8 |
| "Public API" | the site's "Public API" is "Make the COUNTER SUSHI statistics publicly available" | one box, "Make the COUNTER SUSHI statistics publicly available", ticked; under it "Whether or not to restrict access to the API endpoints for COUNTER SUSHI statistics. If unchecked, the API will only be accessible to users with admin or manager roles." | Rule 30, Settings bullet 9 |

## Rules & state

**What is counted**

1. **Visits that count.** A visit counts when a reader, signed in or not,
   opens one of these: <sup>j</sup>

   | The reader opens | Counted as | Shown on |
   |------------------|------------|----------|
   | the journal's home page (on a press also the catalog page) | a journal view | "Journal" |
   | an article's page, any of its versions | an abstract view | "Articles": "Abstract Views" (the chart's switch reads "Catalog Entries" on a press) |
   | a galley's file, downloaded or viewed in the page (HTML) | a file view, sorted by the file's format into "PDF", "HTML" or "Other" | "Articles": "File Views" and its three parts; "Download Files" as "Primary File" |
   | a galley's file whose component is a supplementary one or not a document (an image, a data set) | a file view of type "Supplementary File" | "Download Files" alone |
   | the article's "JATS XML" {OJS} | a JATS view, while "JATS Template Plugin" is on | "Articles": "JATS" |
   | an issue's table of contents {OJS} | an issue view | "Issues": "Views" |
   | an issue galley's file {OJS} | an issue download | "Issues": "Downloads" |
   | a series page {OMP} | a series view | no page [OMP1](#omp1) |

   An article's "Total" is its abstract views plus its file views (plus
   its JATS views {OJS}). Only published items are counted, so the pages
   list published articles and issues alone. On a press, a book's PDF or
   "Appendix" file fails to open from the book page, so neither is ever
   counted ⚠ [OMP3](#omp3). <sup>j</sup>
2. **The day's visits appear the next day.** Visits are written to a log
   as they happen. Once a day the routine task "Usage statistics file
   loader task" turns every finished day's log into figures, work no
   screen shows; the current day's log waits for the next run.
   <sup>j</sup> <sup>w</sup>
   So the figures never include today, and no range ends after yesterday (Rule 8). <sup>c</sup>
3. **What is left out.** A visit from a browser that asks not to be
   tracked ("Do Not Track") is not recorded, nor a visit to an
   unpublished version or issue; a Global Privacy Control signal alone
   does not stop the recording. <sup>j</sup>
   - 3a. The daily processing drops a known robot's visit, and counts the
     same visitor opening the same item again within 30 seconds once
     ⚠ [OJS2](#ojs2); no screen shows either. <sup>w</sup>
4. **Where a visit came from.** While the journal collects geographical
   data (Rule 28), each visit also records the visitor's country (region,
   city) from a location database that the routine task "Update DB-IP city
   lite database" refreshes monthly; no screen of a test install shows it
   (Rule 5). <sup>j</sup> <sup>w</sup>
   - 4a. While the journal collects institutional statistics (Rule 29), a
     visit from an address inside one of the journal's institutions' IP
     ranges is credited to that institution (Rule 22). <sup>t</sup>
5. **Test installs process nothing.** The test installs run no routine
   task and have no location database, so every figure is zero and every
   table empty unless a scenario seeds figures, and a visit made on
   screen records no place. <sup>k</sup>

**The Statistics pages**

6. **The pages.** The side menu's "Statistics" group opens "Articles",
   "Issues" {OJS}, "Journal" and "Counter R5" (and "Editorial Activity",
   "Users" and "Reports", which belong to *Statistics — editorial activity
   & reports*); which roles see the group is
   [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)'s.
   On a press and a preprint server the entries carry the app's own
   names (Fields). Each page has its own address. In the French
   interface of a press and a preprint server, several of these pages'
   labels and the site's "Statistiques" tab show raw codes, and on a
   journal the "JATS" column heading reads "##stats.jats##" ⚠
   [A6](#a6). <sup>b</sup> <sup>v</sup> <sup>td8</sup>
7. <a id="date-range"></a>**The date range.** Every page opens on "Last 30
   days": from 31 days ago to yesterday. The calendar button (Fields) lists
   "Last 30 days", "Last 90 days", "Last 12 months" and "All dates";
   choosing one closes the list, and the chart and the table (back on its
   first page) show the new range. "Editorial Activity" (Rule 6) offers
   its own presets; its list closes the same way (Fields), Escape doing
   nothing. <sup>c</sup>
8. **Custom Range.** Two dates typed and "Apply" set any range from
   2001-01-01 to yesterday; the refusals are the Fields table's. <sup>c</sup>
   - 8a. With one box left empty, "Apply" is refused with the earliest or
     latest date message instead of giving an open-ended range, although
     the control has the wording for one ("Since {date}", "Until {date}")
     ⚠ [A2](#a2). <sup>td2</sup>
9. **"All dates".** On "Articles" the range starts at the journal's first
   publication; on "Journal" and "Issues" at 2001-01-01. On a journal with
   no published article yet, "All dates" on "Articles" opens one "Error"
   window reading "api.stats.400.wrongDateFormat" with "OK". Behind it
   the range reads "All dates" and "Monthly" is pressed, but the chart
   still shows the previous range, and the table reads "No articles were
   found with usage statistics matching these parameters." ⚠ [A1](#a1).
   <sup>f</sup> <sup>td1</sup>
10. **The chart.** The chart always shows the whole range, one point per
    day or per month, flat at zero where there were no visits. On
    "Articles" "Abstracts" (on arrival) shows abstract views and "Files"
    file views; on "Issues" "Views" (on arrival) and "Downloads"; on
    "Journal" there is no such choice. "Daily" can be pressed only while
    the range spans fewer than 91 days. "Monthly" cannot be pressed while
    the range spans fewer than 91 days and starts 31 days or less before
    yesterday. When the pressed one stops being available the other is
    pressed. So a page opens with "Daily" pressed and "Monthly" greyed; on
    "Last 90 days" both can be pressed; on "Last 12 months" and "All
    dates" "Monthly" is pressed and "Daily" greyed. <sup>d</sup>
    <sup>td3</sup>
11. <a id="filters"></a>**Filters.** "Articles" offers "Filters" where the
    journal has something to filter by: on a journal always, with the
    headings "Sections" (every section) and "Issues" (every published
    issue; a journal with none shows the heading alone); on a press "Series", only while the press has a series
    [OMP2](#omp2); on a preprint server "Sections", only while it has two
    or more sections [OPS1](#ops1). "Filters" opens a panel headed
    "Filters" beside the table. Pressing a name narrows the chart and the
    table to the articles in it; several names under one heading add up;
    names under two headings must both hold. Pressing the name again, or
    its "×" ("Clear filter: {name}"), drops it. Pressing "Filters" again
    closes the panel and drops every chosen name. <sup>e</sup>
    <sup>td14</sup>
12. **The "Articles" table.** It lists each published article with at
    least one abstract or file view in the range (within the filters and
    the search), most-viewed first, 30 to a page: the short author list in
    bold, then the title, linking to the published article in a new tab,
    and its figures over the range. Pressing the "Total" heading reverses
    the order, and pressing it again restores it; no other heading sorts.
    "{n} of {total} articles" counts the rows on the page and the articles
    in all. With no row the table reads "No articles were found with usage
    statistics matching these parameters." A press's and a preprint
    server's wording of both lines is in Fields. <sup>f</sup>
13. **Search.** The box in the "Title" heading ("Search by title, author
    and ID") applies on Enter: the chart and the table narrow to the
    published articles whose title, author or ID match. The "×" in the box
    ("Clear search phrase") removes it. Typing without Enter changes
    nothing. On "Issues" {OJS} the box matches words of an issue's
    title, a four-digit year, and the volume and number only as written
    on screen ("Vol. 7", "No. 4", "Vol. 7 No. 3"); "7" alone finds
    nothing ⚠ [OJS3](#ojs3). <sup>f</sup> <sup>h</sup> <sup>td15</sup>
14. **The "Journal" page.** Its one row is the journal's own: the total of
    home-page visits in the range. <sup>g</sup>
15. **The "Issues" page** {OJS} works as "Articles" does, for published
    issues: most-visited first, "Total" reverses the order, 30 to a page,
    no filters. <sup>h</sup>
16. <a id="download-report"></a>**Downloading.** "Download Report" opens
    the "Download" window (Fields). Pressing a report's button downloads a
    CSV file and closes the window. The file holds the page's current
    range, filters and search, and every row, not only the page on
    screen; "Download Issues" {OJS} alone holds only the first 30 issues
    in the table's order ⚠ [OJS4](#ojs4). The file opens with the
    window's parameter lines and an empty line. <sup>i</sup>
    <sup>td9</sup>
17. **File names.** The file is named "stats_" followed by the report
    ("submissions", "files", "submissions_timeline", "countries",
    "regions", "cities", "context", "context_timeline", "issues",
    "issues_timeline") and the date and time of the download in UTC, as
    "stats_context_2026-09-27T11-39_13.csv". The press and the preprint
    server also use "context". <sup>i</sup> <sup>td9</sup>
18. **"Geographic".** The "Download" window of "Articles" offers the
    "Geographic" panel only while the journal collects geographical data
    (Rule 28); the file lists one line per country, per region and
    country, or per city, region and country, as deep as the journal's
    level, with the total and the unique visits. <sup>i</sup> <sup>s</sup>

**"Counter R5" and the SUSHI address**

19. **The report list.** "Counter R5" lists the app's COUNTER reports
    (Fields); "Edit" opens the "Report Settings" window for that report.
    <sup>l</sup>
20. **Downloading a COUNTER report.** "Download" in "Report Settings"
    downloads the report as a file named "counterReport.tsv" whose values
    are comma-separated ⚠ [A11](#a11): first the header lines
    ("Report_Name", "Report_ID", "Release", "Institution_Name",
    "Institution_ID", "Metric_Types", "Report_Filters",
    "Report_Attributes", "Exceptions", "Reporting_Period", "Created",
    "Created_By"), an empty line, then the table. A requested date inside
    a month is widened to the whole month and the "Exceptions" line says
    so. The refusals are the Fields list's. On a journal, "Journal
    Article Requests (IR_A1)" lists rows its "Metric_Types" line leaves
    out ⚠ [OJS5](#ojs5). <sup>l</sup> <sup>td5</sup>
21. **No COUNTER figures yet.** COUNTER figures exist only for whole
    months after the installation (or after the journal's first
    publication, if later): the earliest possible date is the first day
    of the month after that date, the last possible date is the last day
    of the previous month. While the earliest is not before the last, the
    page shows the warning "There are no COUNTER R5 usage statistics
    available yet." and "Download" with the dates as filled is refused,
    "The start date must be before the end date." under both dates. An
    installation stays in this state until the first day of the second
    calendar month after it was installed. <sup>m</sup> <sup>td4</sup>
22. **"Customer ID".** "The World" gives the figures of every visitor.
    The list names the journal's institutions whether or not
    institutional statistics are collected. An institution with no visits
    credited to it gets a file that names it on its "Institution_Name"
    and "Institution_ID" lines, whose "Exceptions" line reads "3030:No
    Usage Available for Requested Dates(…)", and whose table holds its
    column names alone. <sup>l</sup> <sup>t</sup>
    - 22a. An institution with visits credited to it (Rule 4a) gets only
      those visits; no screen of a test install shows it, since nothing
      turns their log into figures (Rule 5). <sup>w</sup>
23. **The SUSHI address.** The same reports, a service status and a
    customer lookup are served to harvesting systems at the journal's
    SUSHI address (each address is in the footnote), public unless
    restricted (Rule 30); who may fetch is Actors row 4. Opened in a
    browser, a served service status reads "Service_Active":true and a
    served report list names the reports of "Counter R5"; a refusal
    reads "You are not authorized to access the requested resource."
    signed out, "The current role does not have access to this
    operation." signed in. Restricted, a Section Editor's "Counter R5"
    fails (Actors row 3) [A5](#a5). <sup>n</sup>
24. **The platform.** A COUNTER report names the journal as the platform
    providing the figures (its "Created_By" line and "Platform" column).
    With the site's "Platform" ticked and a "Platform ID", every
    journal's reports name the site there by its "Site Name", and the
    Platform ID replaces the journal's path in the identifiers; a site
    without a "Site Name" (every fresh install) keeps the journal's name
    there. <sup>o</sup>

**The older COUNTER page** {OJS}

25. **"COUNTER Reports".** Statistics › "Reports" lists "COUNTER Reports",
    which opens a page headed "COUNTER Reports": the line "The COUNTER
    plugin allows reporting on journal activity, using the COUNTER
    standard. …", "COUNTER Release 4.1", and one line per report,
    "Journal Report 1:" and "Article Report 1:", each followed by a link
    per year that has file views. "Counter R5" is the current way to
    COUNTER figures; this page is the older release that remains ⚠
    [OJS1](#ojs1). <sup>p</sup> <sup>td11</sup>
    - 25a. A year's link downloads that year's report as an XML file
      named with today's date, not the year's ("counter-4.1-JR1-{today}.xml",
      "counter-4.1-AR1-{today}.xml"); inside, the report's name is a
      cut-off code path ⚠ [OJS6](#ojs6). A year without figures has no
      link: its report address typed by hand returns to the page with no
      notice, and "The report parameters were invalid." shows on the
      next editorial page opened. <sup>p</sup> <sup>td11</sup>

**Settings tabs**

26. **The site's tab.** Administration › Site Settings › "Site Setup" ›
    "Statistics" holds the Fields table's three groups; "Save" stores
    them for every journal of the installation. "Platform ID" shows while
    "Platform" is ticked and is then required (Fields). A malformed ID
    left in the box when "Platform" is unticked still refuses "Save",
    with the box hidden ⚠ [A10](#a10). <sup>q</sup> <sup>td12</sup>
27. **The journal's tab.** Settings › Distribution › "Statistics" shows
    while the site collects geographical data, or has "Enable
    institutional statistics" ticked, or keeps "Public API" public (the
    default). So an installation at its defaults shows the tab with
    "Public API" alone, ticked; with the site's "Public API" restricted
    and nothing else collected the tab is not there. Each field shows
    under the site condition of the Fields table. "Save" stores the
    journal's choices. <sup>r</sup> <sup>td13</sup>
28. **Geographical level.** A journal can collect no deeper than the
    site: its radios run from "Do not collect any geographical data" to
    the site's level, and a shallower choice is the level the journal
    collects at. "Do not collect any geographical data" does not hold:
    right after "Save" the tab shows it chosen with "Saved", but reopened
    it shows the site's level chosen, and the journal keeps collecting at
    the site's level, "Geographic" included ⚠ [A4](#a4). <sup>s</sup>
    <sup>td7</sup>
29. **Institutional statistics** are collected for a journal only while
    the site's and the journal's "Enable institutional statistics" are
    both ticked; the journal's box shows once the site's is ticked. With
    both ticked the side menu gains "Institutions" ([Institutions](U66-institutions.md) owns
    the list). <sup>t</sup>
30. **Public API.** The journal's "Public API" box, unticked and saved,
    restricts that journal's SUSHI address (Rule 23). The site's "Public
    API" set to restrict does so for every journal and removes the
    journal's box. <sup>n</sup> <sup>r</sup>

## Side effects

- Every download is a file the browser saves; nothing is stored or sent.
- Reader visits are written to the day's log on the server as they
  happen (Rule 2); the daily routine task moves each processed log to an
  archive folder, compressed while "Compress Logs" says so, and its work
  shows as waiting jobs on Administration › "View Jobs" while it runs
  ([System administration](U61-system-administration.md)); no screen of
  a test install shows this. <sup>j</sup> <sup>w</sup>
- "Save" on either Statistics tab stores the choices; they change what is
  collected from the next visit on, never the figures already kept. A
  change left unsaved survives a switch of tabs and is dropped without a
  question when the page is left. <sup>q</sup> <sup>r</sup>

## Settings that modify behavior

1. **"Geographical Statistics"** (Administration › Site Settings ›
   "Statistics"; "Do not collect any geographical data"). A country,
   region or city level: the journal's tab gains "Geographical
   Statistics" (Rule 27), the journal collects at that level or a
   shallower one it chooses (Rule 28), and the "Download" window of
   "Articles" gains "Geographic" (Rule 18).
2. **"Enable institutional statistics"** (the same tab; unticked).
   Ticked: the journal's tab gains its own box (Rule 29).
3. **"Monthly or Daily Statistics"** (the same tab; "Only track monthly statistics"). <sup>q</sup>
   "Track daily and monthly statistics" keeps the day-by-day COUNTER and
   geographical records of months before the last one, which are
   otherwise folded into monthly totals; no screen shows the difference.
   <sup>w</sup>
4. **"Compress Logs"** (the same tab; "Leave the log files in place"). <sup>q</sup>
   "Compress the log files" compresses each processed log file on the
   server; no screen shows the difference. <sup>w</sup>
5. **"Public API"** (the same tab; "Make the COUNTER SUSHI statistics
   publicly available"). "Restrict access to the COUNTER SUSHI statistics
   API to managers and admins": every journal's SUSHI address is
   restricted, and the journal's "Public API" box goes (Rules 23, 30).
6. **"Platform"** (the same tab; unticked). Ticked, with a "Platform ID":
   COUNTER reports name the site as their platform, by its "Site Name"
   (Rule 24).
7. **"Geographical Statistics"** (Settings › Distribution › "Statistics";
   the site's level). A shallower level: the journal collects and
   "Geographic" reports at that level (Rules 18, 28).
8. **"Enable institutional statistics"** (the same tab; unticked).
   Ticked, with the site's ticked: visits are credited to the journal's
   institutions and the side menu shows "Institutions" (Rule 29).
9. **"Public API"** (the same tab; ticked). Unticked: the journal's
   SUSHI address is restricted (Actors row 4; Rule 23).
10. **"JATS Template Plugin"** {OJS} (*JATS & body text*, on Settings ›
    Website › "Plugins"; on). Off: "Articles" and its "Download
    Articles" file lose the "JATS" column, "Total" leaves JATS views out,
    and an article viewed only as JATS drops from the table. Ticked
    again, the same figures return. <sup>u</sup>

## Cross-feature interactions

- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the side menu's "Statistics" group and who sees each entry; this
  spec owns the pages the entries open.
- *Statistics — editorial activity & reports* owns "Editorial Activity",
  "Users" and "Reports". "Editorial Activity" uses this spec's
  [date range](#date-range) (with its own presets) and
  [filters](#filters); "Users"' "Export" opens its own "Export to
  Excel/CSV" window, and no page there has "Download Report". Its
  "Reports" page lists "COUNTER Reports" {OJS}, whose page is Rule 25.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
  owns who opens the Settings pages and the Distribution tabs; this spec
  owns the "Statistics" tab.
- [Site settings](U60-site-settings.md#site-settings-tabs) owns the Site
  Settings tabs and when each shows; this spec owns the "Statistics" tab.
- [System administration](U61-system-administration.md) owns the Jobs
  pages, the routine tasks' timetable and the report email of a task
  that ends in error (its scenarios use "Update DB-IP city lite
  database"); this spec owns what the two statistics tasks do (Rules 2,
  4).
- [Plugins management](U62-plugins-management.md#plugin-links) owns the
  "Usage event" row (site-wide, always on) and the report plugins'
  "Reports" link; the visits "Usage event" records are Rule 1's.
- [Article landing page & reading](U13-article-landing-page-and-reading.md)
  owns the "Downloads" chart on an article's page, and
  [Appearance & theming](U10-appearance-and-theming.md) the option that
  shows it; the downloads it charts are Rule 1's file views. <sup>x</sup>
- [Institutions](U66-institutions.md) owns the institution list and its IP ranges that Rules
  4, 22 and 29 use.
- [JATS & body text](U48-jats-and-body-text.md) owns "JATS Template
  Plugin" and the "JATS XML" page (Settings bullet 10).

## Canonical scenarios

Scenarios 1 and 2 run on the seeded journal with ready accounts; every
other scenario runs on scratch journals with throwaway accounts and
seeded reader visits. <sup>sc</sup>

1. **The Statistics pages before any figures**

   Given: the seeded journal's Journal Manager, on a journal whose
   readers' visits have never been turned into figures.

   - **The side menu**: the "Statistics" group lists "Articles",
     "Issues" {OJS}, "Journal" and "Counter R5" ("Monographs" and
     "Press" on a press, "Preprints" and "Server" on a preprint server)
     (Rule 6; Fields).
   - **"Articles"**: press "Articles": the browser tab reads "Article
     Stats" ("Monograph Stats", "Preprint Stats"), the heading "Articles"
     ("Monographs", "Preprints"), and the date range beside it reads
     "{the day 31 days ago} — {yesterday}". Above the chart "Abstracts"
     ("Catalog Entries" on a press [OMP2](#omp2)) and "Daily" are
     pressed and "Monthly" is greyed; the chart is flat at zero. The
     table "Article Details" ("Monograph Details", "Preprint Details")
     reads "0 of 0 articles" ("monographs", "preprints"), has the
     columns "Title", "Abstract Views", "File Views", "PDF", "HTML",
     "Other", "JATS" {OJS} and "Total", and reads "No articles were
     found with usage statistics matching these parameters."
     ("No monographs…", "No preprints…") (Rules 5, 7, 10, 12; Fields).
   - **"Filters"**: on a journal press "Filters": a panel headed
     "Filters" opens beside the table, listing each of the journal's
     sections under "Sections" and each published issue under "Issues".
     On a press, which has series, the panel lists each series under
     "Series" [OMP2](#omp2). A preprint server with its one section
     shows no "Filters" [OPS1](#ops1) (Rule 11).
   - **The "Download" window**: press "Download Report": a window opens
     from the right, reading "Download a CSV/Excel spreadsheet with usage
     statistics for articles matching the following parameters."
     ("…for monographs…", "…for preprints…"), then "Date Range" · "{the
     day 31 days ago} to {yesterday}", on a journal "Sections" · "All
     Sections" and "Issues" · "All Issues", on a press "Series" · "All
     Series", on a preprint server no filter row, and the panels
     "Articles" ("Monographs", "Preprints"), "Files" and "Timeline", with
     the buttons "Download Articles" ("Download Monographs", "Download
     Preprints"), "Download Files" and "Download Timeline" (Fields).
   - **"Journal"**: press "Journal" ("Press", "Server") in the side menu:
     the heading "Journal" ("Press", "Server"), the chart with "Daily"
     and "Monthly", and the table "Views" with "Download Report" and one
     row: "Journal of Public Knowledge" ("Public Knowledge Press",
     "Public Knowledge Preprint Server"), linking to the journal's home
     page in a new tab, with the total 0. Resting the mouse pointer on
     the information icon "About journal statistics" ("About press
     statistics", "About server statistics") shows "Number of visitors
     viewing the journal's index page." ("Number of visitors viewing the
     press's and catalog's index page.", "Number of visitors viewing the
     server's index page.") (Rules 5, 14; Fields).
   - **"Issues"** {OJS}: press "Issues": the heading "Issues", the chart
     with "Views" and "Downloads", and the table "Views and Downloads",
     reading "No issues were found with usage statistics matching these
     parameters." (Rules 5, 15; Fields).
   - **"Counter R5"**: press "Counter R5": the heading "Counter R5
     Reports", the line "See COUNTER 5.0.3 documentation for more
     information about each report.", and the list "Counter R5 Reports",
     each row with "Edit": on a journal "Platform Master Report (PR)",
     "Platform Usage (PR_P1)", "Title Master Report (TR)", "Journal Usage
     by Access Type (TR_J3)", "Item Master Report (IR)", "Journal Article
     Requests (IR_A1)"; on a press "Platform Master Report (PR)",
     "Platform Usage (PR_P1)", "Title Master Report (TR)", "Book Usage by
     Access Type (TR_B3)"; on a preprint server "Platform Master Report
     (PR)", "Platform Usage (PR_P1)", "Item Master Report (IR)" (Rule 19;
     Fields).
   - **Control**: the "Download" window of "Articles" has no "Geographic"
     panel, since the installation collects no geographical data by
     default (Rule 18; Settings bullet 1). <sup>sc</sup>

2. **Roles kept off the Statistics pages**

   Given: the seeded journal's Section Editor, Author, Reviewer (on a
   journal and a press), Reader and Copyeditor (Editorial Board Member on
   a preprint server), each signed in in turn, and the addresses of
   "Articles", "Issues" {OJS}, "Journal" and "Counter R5" as the Journal
   Manager's browser shows them.

   - **Section Editor**: each of the addresses opens its page (Actors
     row 1).
   - **Author, Reviewer, Reader and Copyeditor**: each gets the
     access-denied page at every address (Actors row 1).
   - **Signed out**: open the "Articles" address in a browser where
     nobody is signed in: the Login page shows (Actors row 1).
   - **Control**: the Journal Manager opens the same addresses: each
     page opens (Actors row 1). <sup>sc</sup>

3. **Reading the figures on "Articles"**

   Given: Journal Manager and a Section Editor assigned to nothing, of a
   scratch journal with the sections "Articles" and "Reviews" {OJS OPS}
   and, on a journal, the published issues "Vol. 1 No. 1 (2024)" and
   "Vol. 1 No. 2 (2024)", holding four published works: "Axolotl limb
   memory" (section "Articles", issue No. 1), read yesterday with 10
   abstract views, 4 downloads of its PDF file and 2 of its HTML file;
   "Quokka survey" ("Reviews", No. 2), read ten days ago with 3 abstract
   views and 1 download of its PDF file; "Okapi field notes"
   ("Articles", No. 2), read five days ago with 6 abstract views; and
   "Wombat notes" ("Articles", No. 1), read 200 days ago with 7 abstract
   views.

   - **The table**: open Statistics › "Articles" ("Monographs",
     "Preprints"): "3 of 3 articles" ("monographs", "preprints") and,
     most-viewed first, "Axolotl limb memory" with "Abstract Views" 10,
     "File Views" 6, "PDF" 4, "HTML" 2, "Other" 0 and "Total" 16; "Okapi
     field notes" 6, 0, 0, 0, 0, 6; "Quokka survey" 3, 1, 1, 0, 0, 4.
     Each row shows its author list in bold, then its title (Rules 1,
     12).
   - **"Total"**: press the "Total" heading: the order reverses,
     "Quokka survey" first. Press it again: "Axolotl limb memory" is
     first again. Press the "Abstract Views" heading: the order does not
     change (Rule 12).
   - **The chart**: with "Abstracts" ("Catalog Entries" on a press)
     pressed, the chart shows one point per day, at zero except 10
     yesterday, 6 five days ago and 3 ten days ago. Press "Files": 6
     yesterday, 1 ten days ago, zero elsewhere (Rules 10, 12).
   - **The title link**: press "Axolotl limb memory": its published
     page opens in a new tab (Rule 12).
   - **Search**: type Quokka in the box "Search by title, author and ID"
     without pressing Enter: nothing changes. Press Enter: the table
     lists "Quokka survey" alone, "1 of 1 articles", and the chart shows
     only its 3 abstract views. Press the box's "×" ("Clear search
     phrase"): the three rows return. Type zzzz and press Enter: "0 of 0
     articles", "No articles were found with usage statistics matching
     these parameters." and a chart flat at zero. Clear the box again
     (Rule 13).
   - **Filters** {OJS OPS}: press "Filters" and, under "Sections",
     "Reviews": the table lists "Quokka survey" alone. Press "Articles"
     too: all three rows. Press the "×" of "Reviews" ("Clear filter:
     Reviews"): "Axolotl limb memory" and "Okapi field notes". On a
     journal press "Vol. 1 No. 2 (2024)" under "Issues": "Okapi field
     notes" alone; press "Vol. 1 No. 2 (2024)" again: both return. Press
     "Filters": the panel closes and the three rows return (Rule 11). A
     scratch press has no series, so "Monographs" shows no "Filters"
     [OMP2](#omp2).
   - **Section Editor**: the Section Editor opens Statistics ›
     "Articles": the same three rows with the same figures (Actors
     preamble).
   - **Control**: "Wombat notes", read only 200 days ago, has no row
     (Rule 12). <sup>sc</sup>

4. **Choosing the date range**

   Given: Journal Manager of a scratch journal whose one work, "Axolotl
   limb memory", was published on 2024-03-05 and read with 2 abstract
   views yesterday, 4 forty-five days ago and 8 two hundred days ago,
   and whose home page was visited 2 times yesterday, 3 ten days ago, 4
   forty-five days ago and once 400 days ago.

   - **On arrival**: open Statistics › "Articles": the range reads "{the
     day 31 days ago} — {yesterday}", "Daily" is pressed and "Monthly"
     greyed, and "Axolotl limb memory" reads "Total" 2 (Rules 7, 10).
   - **The presets**: press the calendar button: the list offers "Last
     30 days", "Last 90 days", "Last 12 months" and "All dates", and
     under "Custom Range" two boxes and "Apply". Choose "Last 90 days":
     the list closes, "Total" reads 6, and "Daily" and "Monthly" can
     both be pressed. Choose "Last 12 months": "Total" 14, "Monthly"
     pressed and "Daily" greyed (Rules 7, 10; Fields).
   - **"All dates" on "Articles"**: choose "All dates": the range reads
     "All dates", "Total" 14, "Monthly" pressed and "Daily" greyed, and
     the chart runs by month from March 2024, the journal's first
     publication (Rules 9, 10).
   - **A Custom Range**: open the list, replace the dates in the two
     boxes with the date 50 days ago and the date 40 days ago, each as
     YYYY-MM-DD, and press "Apply": the list closes, the range reads "{the day 50 days ago} —
     {the day 40 days ago}", "Total" reads 4, and "Daily" and "Monthly"
     can both be pressed (Rules 8, 10).
   - **Refused ranges**: open the list and, replacing both boxes' dates
     and pressing "Apply" after each pair, type 2026-9-1 and yesterday's
     date: "The date format is not
     valid. Enter each date in the format YYYY-MM-DD."; 2026-02-30 and
     yesterday's date: "One of the dates entered does not exist."; the
     date 10 days ago and the date 20 days ago: "The start date must be
     before the end date."; 2000-12-31 and yesterday's date: "The start
     date may not be earlier than 2001-01-01."; the date 40 days ago and
     today's date: "The end date may not be later than {yesterday's
     date}.". Each message shows under "Apply" while the range still
     reads "{the day 50 days ago} — {the day 40 days ago}" and "Total"
     still 4 (Rule 8; Fields).
   - **"Journal"**: open Statistics › "Journal" ("Press", "Server"): the
     journal's row reads 5. Choose "Last 90 days": 9; "Last 12 months":
     9; "All dates": 10, the chart running by month from January 2001
     (Rules 9, 14).
   - **Control**: on "Articles", replace the date in the first box of
     "Custom Range" with the date 50 days ago and press Enter: the list stays open, no
     message shows and the range does not change (Fields). <sup>sc</sup>

5. **Downloading the spreadsheets**

   Given: Journal Manager of a scratch journal with the sections
   "Articles" and "Reviews" {OJS OPS}, holding three published works:
   "Axolotl limb memory" ("Articles"), read yesterday with 10 abstract
   views, 4 downloads of its PDF file, 2 of its HTML file and 1 of its
   supplementary file (a data set; on a press an appendix); "Quokka
   survey" ("Reviews"), read ten days ago with 3 abstract views and 1
   download of its PDF file; and "Wombat notes" ("Articles"), read 200
   days ago with 7 abstract views; the journal's home page visited 3
   times yesterday.

   - **The window of "Articles"**: open Statistics › "Articles" and
     press "Download Report": the window reads "Date Range" · "{the day
     31 days ago} to {yesterday}", on a journal "Sections" · "All
     Sections" and "Issues" · "All Issues", on a preprint server
     "Sections" · "All Sections", on a press no filter row, and offers
     "Download Articles" ("Download Monographs", "Download Preprints"),
     "Download Files" and "Download Timeline" (Fields).
   - **"Download Articles"**: press it: the window closes and a file
     whose name starts "stats_submissions_" followed by the date and time
     in UTC downloads. It opens with the line "Date Range" and the range,
     one line per filter row of the window, an empty line, and the
     column line "ID", "Title", "Authors", "Date Published" ("Date
     Posted" on a preprint server), "Total", "Abstract Views", "File
     Views", "PDF", "HTML", "Other", "JATS" {OJS}; then "Axolotl limb
     memory" with "Total" 16 and "File Views" 6, and "Quokka survey" with
     4 and 1 (Rules 1, 16, 17; Fields).
   - **"Download Files"**: press "Download Report", then "Download
     Files": a file "stats_files_…" whose column line reads "Article ID",
     "Article Title" ("Monograph ID", "Book Title" on a press; "Preprint
     ID", "Preprint Title" on a preprint server), "File ID", "File
     Name", "Type", "File Views", with one line per file: Axolotl's PDF
     file 4 and its HTML file 2, both "Primary File"; its supplementary
     file 1, "Supplementary File"; Quokka's PDF file 1, "Primary File".
     The page's "File Views" for "Axolotl limb memory" still reads 6
     (Rules 1, 16, 17; Fields).
   - **"Download Timeline"**: press "Files" above the chart, then
     "Download Report": the "Timeline" panel reads "The number of
     downloads for each day.". Press "Download Timeline": a file
     "stats_submissions_timeline_…" whose parameter lines add "Timeline
     Type" "Downloads" and "Timeline Interval" "Day", with the column
     line "Date", "Label", "Total" and one line per day of the range,
     yesterday's at 6 (Rules 16, 17; Fields).
   - **Search and filters in the file**: type Quokka in the search box
     and press Enter, then press "Download Report": the window adds
     "Search Phrase" · "Quokka". "Download Articles" (the window's first
     button) gives a file with
     the line "Search Phrase" "Quokka" and one article, "Quokka survey".
     Clear the search. On a journal and a preprint server press
     "Filters" and "Reviews": the window's "Sections" row reads
     "Reviews", and "Download Articles" gives a file with "Sections"
     "Reviews" and "Quokka survey" alone (Rule 16; Fields).
   - **The window of "Journal"**: open Statistics › "Journal" ("Press",
     "Server") and press "Download Report": the window reads "Download a
     CSV/Excel spreadsheet with usage statistics for this journal
     matching the following parameters." ("…for this press…", "…for
     this server…"), "Date Range" alone, and the panels "Journal" ("The
     number of journal's index page views.", "Download Journal"; on a
     press "Press", "The number of press's and catalog's index page
     views.", "Download Press"; on a preprint server "Server", "The
     number of server's index page views.", "Download Server") and
     "Timeline". Press "Download Journal" ("Download Press", "Download
     Server"): a file "stats_context_…" with the line "Date Range", an
     empty line, the column line "ID", "Title", "Total" and one line with
     the journal's name and 3. "Download Timeline" gives
     "stats_context_timeline_…" with one line per day (Rules 14, 16, 17;
     Fields).
   - **Control**: no file from "Articles" names "Wombat notes", read
     only outside the range (Rule 16). <sup>sc</sup>

6. **More than one page of articles**

   Given: Journal Manager of a scratch journal holding 31 published
   works, each read yesterday: "Axolotl limb memory" with 5 abstract
   views, each of the other 30 with 1.

   - **Page 1**: open Statistics › "Articles": the table reads "30 of 31
     articles" ("monographs", "preprints"), lists 30 rows with "Axolotl
     limb memory" first, and shows the page numbers "1" and "2" below
     the rows (Rule 12; Fields).
   - **Page 2**: press "2": one row, and "1 of 31 articles" (Rule 12).
   - **The file**: press "Download Report", then "Download Articles"
     ("Download Monographs", "Download Preprints"): the file holds 31
     article lines, not only the page on screen (Rule 16).
   - **Control**: choose "Last 90 days" from page 2: the table is back
     on its first page, with "Axolotl limb memory" first and "30 of 31
     articles" (Rule 7). <sup>sc</sup>

7. **Where the visits came from**

   Given: Journal Manager of a scratch journal on an installation whose
   "Geographical Statistics" reads "Collect the visitor's country,
   region and city", holding the published work "Axolotl limb memory",
   read yesterday with 3 abstract views from Vancouver, British
   Columbia, Canada and 2 from Ontario, Canada with no city recorded.

   - **The journal's tab**: open Settings › Distribution › "Statistics":
     "Geographical Statistics" offers "Do not collect any geographical
     data", "Collect the visitor's country", "Collect the visitor's
     country and region" and "Collect the visitor's country, region and
     city", the last chosen, above "Public API" (Rules 27, 28; Fields).
   - **"Geographic"**: open Statistics › "Articles" and press "Download
     Report": the window gains the panel "Geographic", with the
     information icon "About Geolocation", the line "The number of views
     and downloads for each city, region or country." and "Download
     Geographic". Press it: a file "stats_cities_…" whose column line
     reads "City", "Region", "Country", "Total", "Unique", with a line
     for Vancouver, British Columbia, Canada at "Total" 3 and a line
     "unknown,Ontario,Canada" at 2 (Rules 17, 18; Fields; Settings
     bullet 1).
   - **The region level**: on the journal's tab choose "Collect the
     visitor's country and region" and press "Save". Reopen the tab: that
     radio is chosen. On "Articles", "Download Report" › "Download
     Geographic" now gives "stats_regions_…",
     with the columns "Region", "Country", "Total", "Unique" and the
     lines British Columbia, Canada at 3 and Ontario, Canada at 2
     (Rules 17, 18, 28; Settings bullet 7).
   - **The country level**: choose "Collect the visitor's country" and
     "Save": "Download Report" › "Download Geographic" gives
     "stats_countries_…", with the
     columns "Country", "Total", "Unique" and one line, Canada at 5
     (Rules 17, 18, 28; Settings bullet 7).
   - **Control**: the "Download" window of "Journal" offers "Journal"
     and "Timeline" and no "Geographic" (Fields). <sup>sc</sup>

8. **COUNTER reports on "Counter R5"**

   Given: the Site Administrator, and the Journal Manager and a Section
   Editor of scratch journal A, on an installation whose "Site Name" is
   "Okapi Site" and which was installed on the first day of the fourth
   month before this one (on 2026-09-27: installed 2026-05-01); A holds
   the work "Axolotl limb memory", published on 2025-01-15 and read on
   the 10th of each of the last two months with 4 abstract views and 2
   downloads of its PDF file, and on a journal the institution "Okapi
   Institute", to which no visit is credited; scratch journal B, of the
   same Journal Manager, holds one work published today.

   - **The report settings**: on A open Statistics › "Counter R5" and
     press "Edit" on "Platform Master Report (PR)": the window "Report
     Settings" opens with "Start Date" filled with the first day of the
     third month before this one (2026-06-01 in the example) and under
     it "Date should be in format YYYY-MM-DD or YYYY-MM. Earliest
     possible date is {that date}."; "End Date" filled with the last day
     of last month (2026-08-31) and "…Last possible date is {that
     date}."; "Customer ID" with "The World" chosen, and "Okapi
     Institute" in its list on a journal; "Metric Type" with
     "Total_Item_Investigations", "Unique_Item_Investigations",
     "Total_Item_Requests" and "Unique_Item_Requests" ticked (on a press
     also "Unique_Title_Investigations" and "Unique_Title_Requests");
     "Attributes To Show" with "Data_Type" and "Access_Method" unticked;
     "Exclude Monthly Details" unticked; then "Download" (Rules 19, 21,
     22; Fields).
   - **Downloading**: press "Download": a file "counterReport.tsv"
     downloads [A11](#a11), opening with the lines "Report_Name",
     "Report_ID", "Release", "Institution_Name", "Institution_ID",
     "Metric_Types", "Report_Filters", "Report_Attributes",
     "Exceptions", "Reporting_Period", "Created", "Created_By", then an
     empty line and the table. Its "Created_By" line and its "Platform"
     column name journal A (Rules 20, 24).
   - **A date inside a month**: "Edit" on the same report, type the 14th
     of the first offered month in "Start Date" (2026-06-14) and press
     "Download": the file's "Reporting_Period" starts on the first of
     that month, and its "Exceptions" line reports the widened dates
     (Rule 20).
   - **"Exclude Monthly Details"**: "Edit" again, tick "Exclude Monthly
     Details" and press "Download": the file gives one total per row
     instead of a column per month (Fields).
   - **Another report's fields**: "Edit" on "Item Master Report (IR)"
     {OJS OPS}: the window adds, under "Attributes To Show",
     "Article_Version", "Authors", "Access_Method", "Access_Type",
     "Data_Type", "Publication_Date" and "YOP", all unticked; "Year Of
     Publication" with the line "A list or range of years of
     publication to return in response in format of
     yyyy|yyyy|yyyy-yyyy."; "Submission ID"; and on a journal "Include
     Parent Details", unticked (Fields).
   - **Refusals**: on the "Report Settings" of "Platform Master Report
     (PR)", with the dates as filled, change one thing at a time and
     press "Download": "Start Date" 2026/07/01 gives "The date format is
     not valid." under it; an emptied "End Date" gives "This field is
     required."; the "End Date" in "Start Date" and the "Start Date" in
     "End Date" give "The start date must be before the end date." under
     both; every "Metric Type" box unticked gives "This field is
     required." under the boxes. On "Item Master Report (IR)" {OJS OPS},
     "Submission ID" 999999 gives "The submission ID does not exist.";
     on "Title Master Report (TR)" {OJS OMP}, "Year Of Publication"
     1999- gives "YOP format is not valid.". Each refusal also shows
     "Please correct {n} errors." in the window and, all but the emptied
     "End Date", the notice "The form was not saved because {n} error(s)
     were encountered. …" on the page, and no file arrives (Fields).
   - **"Close"**: change "Start Date" and untick a "Metric Type" box,
     press "Close": no question is asked. "Edit" again: the fields read
     as first filled (Fields).
   - **"Customer ID"** {OJS}: choose "Okapi Institute" and press
     "Download": the file names "Okapi Institute" on its
     "Institution_Name" and "Institution_ID" lines, its "Exceptions" line
     reads "3030:No Usage Available for Requested Dates(…)", and its
     table holds its column names alone (Rule 22).
   - **Section Editor**: the Section Editor opens A's "Counter R5": the
     same list; "Edit" on "Platform Master Report (PR)" and "Download"
     bring the same file (Actors row 3).
   - **No COUNTER figures yet**: the Journal Manager opens B's "Counter
     R5": the page shows "There are no COUNTER R5 usage statistics
     available yet.". "Edit" on "Platform Master Report (PR)": "Start
     Date" holds the first day of next month and "End Date" the last day
     of last month. "Download" is refused with "The start date must be
     before the end date." under both dates, and no file arrives
     (Rule 21).
   - **The site as the platform**: the Site Administrator opens
     Administration › Site Settings › "Site Setup" › "Statistics", ticks
     "Platform", types OKAPIPLAT in "Platform ID" and presses "Save". The
     Journal Manager downloads A's "Platform Master Report (PR)" again:
     its "Created_By" line and "Platform" column name "Okapi Site"
     (Rule 24; Settings bullet 6).
   - **Control**: A's "Counter R5" shows no "There are no COUNTER R5
     usage statistics available yet." (Rule 21). <sup>sc</sup>

9. **Restricting a journal's SUSHI address**

   Given: Journal Manager and a Section Editor of a scratch journal, a
   browser where nobody is signed in, and the journal's SUSHI service
   status and report list addresses (Rule 23).

   - **The journal's tab**: open Settings › Distribution › "Statistics":
     the tab holds "Public API" alone, its box "Make the COUNTER SUSHI
     statistics publicly available" ticked, with the line "Whether or
     not to restrict access to the API endpoints for COUNTER SUSHI
     statistics. …" (Rule 27; Fields).
   - **Public**: signed out, open the service status and the report
     list: "Service_Active":true and the "Counter R5" reports, both
     served (Actors row 4; Rule 23).
   - **Restricting**: untick "Make the COUNTER SUSHI statistics publicly
     available" and press "Save". Reopen the tab: the box is unticked
     (Rule 30; Side effects bullet 3).
   - **Who may fetch now**: the report list, signed out: "You are not
     authorized to access the requested resource."; in the Section
     Editor's signed-in browser: "The current role does not have access
     to this operation."; in the Journal Manager's: served (Actors row 4;
     Rule 23). The Section Editor's "Counter R5" is not opened here ⚠
     [A5](#a5).
   - **Public again**: tick the box again and press "Save": signed out,
     the report list is served again (Rule 30).
   - **Control**: before "Public again", signed out, open the seeded
     journal's report list: it is served, since only the scratch journal
     was restricted (Rule 30). <sup>sc</sup>

10. **The installation's statistics settings**

    Given: the Site Administrator and a scratch journal.

    - **The tab at install**: open Administration › Site Settings › "Site
      Setup" › "Statistics": "Data Collection" with "Geographical
      Statistics" at "Do not collect any geographical data" and
      "Institutional Statistics" with "Enable institutional statistics"
      unticked; "Data Storage" with "Only track monthly statistics" and
      "Leave the log files in place"; "Sushi Protocol" with "Make the
      COUNTER SUSHI statistics publicly available" and "Platform"
      unticked, and no "Platform ID" box; then "Save" (Fields).
    - **"Platform ID"**: tick "Platform": the box "Platform ID" shows,
      not marked required. Press "Save": "A platform ID must be required
      when the site will be identified as the SUSHI platform." shows
      under it, and the tab shows "Please correct one error." with a "Go
      to Platform ID" link. Type has space (two words) and press "Save":
      "This is not formatted correctly."; the same for the 18 characters
      K5_plat.id/1234567. Type the 17 characters K5_plat.id/123456 and
      press "Save": no message shows under the box. Untick "Platform",
      press "Save" and
      tick "Platform" again: the box shows K5_plat.id/123456. Empty the
      box, untick "Platform" and press "Save" (Rule 26; Fields; Settings
      bullet 6).
    - **Collecting more, restricting the API**: choose "Collect the
      visitor's country", tick "Enable institutional statistics", choose
      "Restrict access to the COUNTER SUSHI statistics API to managers
      and admins" and press "Save". Reopen the tab: "Collect the
      visitor's country" is chosen and "Enable institutional statistics"
      is ticked (Rule 26).
    - **The journal's tab**: open the scratch journal's Settings ›
      Distribution › "Statistics": "Geographical Statistics" offers "Do
      not collect any geographical data" and "Collect the visitor's
      country", the second chosen; "Institutional Statistics" holds
      "Enable institutional statistics", unticked; there is no "Public
      API" (Rules 27–30; Settings bullets 1, 2, 5).
    - **The journal's pages**: Statistics › "Articles" › "Download
      Report" offers "Geographic". Signed out, the scratch journal's
      report list is refused (Rules 18, 23; Settings
      bullets 1, 5).
    - **Nothing collected**: back on the site's tab choose "Do not
      collect any geographical data", untick "Enable institutional
      statistics" and press "Save": the scratch journal's Settings ›
      Distribution has no "Statistics" tab (Rule 27).
    - **Control**: choose "Make the COUNTER SUSHI statistics publicly
      available" and press "Save": the scratch journal's Settings ›
      Distribution shows "Statistics" again, with "Public API" alone,
      ticked (Rule 27). <sup>sc</sup>

11. **The "Issues" page** {OJS}

    Given: Journal Manager of a scratch journal with three published
    issues: "Vol. 7 No. 3 (2020)", with an issue galley, its table of
    contents viewed 5 times yesterday and its galley's file downloaded 2
    times; "Vol. 8 No. 4 (2021)", its table of contents viewed 3 times
    ten days ago; and "Vol. 1 No. 1 (2019)", its table of contents
    viewed once 200 days ago.

    - **The table**: open Statistics › "Issues": "2 of 2 issues" and,
      most-visited first, "Vol. 7 No. 3 (2020)" with "Views" 5,
      "Downloads" 2 and "Total" 7, then "Vol. 8 No. 4 (2021)" with 3, 0
      and 3. Press "Vol. 7 No. 3 (2020)": its issue page opens (Rules 1,
      15; Fields).
    - **"Total"**: press the "Total" heading: "Vol. 8 No. 4 (2021)" comes
      first; press it again: "Vol. 7 No. 3 (2020)" is first again (Rule
      15).
    - **The chart**: "Views" is pressed: 5 yesterday, 3 ten days ago.
      Press "Downloads": 2 yesterday, zero elsewhere. Press "Views"
      again (Rule 10).
    - **Search**: in the box "Search issue title, volume and number"
      type each of the following and press Enter, pressing "×" between
      them: 2021 finds "Vol. 8 No. 4 (2021)" alone; Vol. 8 and No. 4
      each find "Vol. 8 No. 4 (2021)" alone; Vol. 7 No. 3 finds "Vol. 7
      No. 3 (2020)" alone. A bare 7 is not typed here ⚠ [OJS3](#ojs3)
      (Rule 13).
    - **The download**: press "Download Report": the window reads
      "Download a CSV/Excel spreadsheet with usage statistics for issues
      matching the following parameters.", "Date Range", and the panels
      "Issues" ("The number of TOC views and issue galley downloads for
      each issue.", "Download Issues") and "Timeline". Press "Download
      Issues": a file "stats_issues_…" with the column line "ID", "Issue
      identification", "Total", "Views", "Downloads" and the two issues'
      lines, 7 and 3. "Download Timeline" gives "stats_issues_timeline_…"
      with "Timeline Type" "Views" and "Timeline Interval" "Day"
      (Rules 16, 17; Fields).
    - **Control**: "Vol. 1 No. 1 (2019)" has no row; choose "All dates":
      it joins with "Total" 1 (Rules 9, 15). <sup>sc</sup>

12. **The COUNTER Release 4 reports** {OJS}

    Given: Journal Manager of a scratch journal holding a published work
    whose PDF file was downloaded on 2024-05-10 and on 2025-05-10.

    - **The page**: open Statistics › "Reports" and press "COUNTER
      Reports": a page headed "COUNTER Reports" reads "The COUNTER plugin
      allows reporting on journal activity, using the COUNTER standard.
      …", then "COUNTER Release 4.1", then "Journal Report 1:" and
      "Article Report 1:", each followed by the links "2024" and "2025"
      (Actors row 5; Rule 25) [OJS1](#ojs1).
    - **A year's file**: press "2025" after "Journal Report 1:": an XML
      file named "counter-4.1-JR1-{today's date}.xml" downloads; "2024"
      after "Article Report 1:" gives "counter-4.1-AR1-{today's
      date}.xml" (Rule 25a) [OJS6](#ojs6).
    - **Control**: no report line has a "2023" link, a year without file
      views (Rule 25). <sup>sc</sup>

13. **JATS views and "JATS Template Plugin"** {OJS}

    Given: Journal Manager of a scratch journal holding two published
    works with a public "JATS XML" page: "Axolotl limb memory", read
    yesterday with 2 abstract views and 3 JATS views, and "Kea notes",
    read yesterday with 2 JATS views alone.

    - **The "JATS" column**: open Statistics › "Articles": "Axolotl limb
      memory" reads "Abstract Views" 2, "JATS" 3 and "Total" 5; "Kea
      notes" "JATS" 2 and "Total" 2 (Rules 1, 12).
    - **The plugin off**: on Settings › Website › "Plugins" untick "JATS
      Template Plugin" and confirm ([Plugins
      management](U62-plugins-management.md)). "Articles" has no "JATS"
      column, "Axolotl limb memory" reads "Total" 2, and "Kea notes" has
      no row. "Download Articles" gives a file without a "JATS" column
      (Settings bullet 10).
    - **The plugin on again**: tick "JATS Template Plugin": "Articles"
      shows the "JATS" column and both rows with their first figures
      again (Settings bullet 10).
    - **Control**: "Axolotl limb memory" reads "Abstract Views" 2
      throughout (Rule 1). <sup>sc</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — variants:
  - the site as the COUNTER platform on an installation without a "Site
    Name", whose reports keep the journal's name (Rule 24)
  - a change left unsaved on either "Statistics" tab, dropped without a
    question when the page is left (Side effects bullet 3)
  - a "COUNTER Reports" year address typed by hand for a year without
    figures, and the notice it leaves on the next editorial page {OJS}
    (Rule 25a)
  - the "Issues" filter heading of a journal with no published issue
    {OJS} (Rule 11)
  - the date range list closed without choosing a range (the calendar
    button pressed again, a click outside it, the focus leaving it), and
    typed dates kept in the boxes while not applied (Fields "The date
    range")
- **Nothing new to test**:
  - the Editor, the Production Editor, the Guest Editor {OJS} and the
    Site Administrator on the Statistics pages, which show them the
    Journal Manager's and the Section Editor's figures (Actors preamble
    and row 1)
  - the site's "Track daily and monthly statistics" and "Compress the
    log files", which change nothing a screen shows (Settings bullets 3,
    4)
- **Register carries it**:
  - A1 ("All dates" on "Articles" of a journal with nothing published;
    Rule 9)
  - A2 (a Custom Range with one box empty; Rule 8a)
  - A3 ("Report Settings" dates outside the earliest and last possible
    dates, and a date that does not exist; Fields)
  - A4 (the journal's "Do not collect any geographical data"; Rule 28)
  - A5 (the Section Editor's "Counter R5" while the journal's COUNTER
    statistics are restricted; Actors row 3; scenario 9 marks it)
  - A6 (the French interface; Rule 6)
  - A7 (the information icons from the keyboard; Fields)
  - A8 (a search phrase with double quotes in the spreadsheets; Fields)
  - A9 (the byte-order mark; Fields)
  - A10 (a malformed Platform ID behind an unticked "Platform"; Rule 26)
  - A11 (the comma-separated "counterReport.tsv"; Rule 20; scenario 8
    marks it)
  - A12 (Escape on the date range list; Fields)
  - A13 (the "Custom Range" boxes after a preset, and "Apply" on them;
    Fields)
  - OJS1 (the Release 4 page beside "Counter R5"; Rule 25; scenario 12
    marks it)
  - OJS2 (one HTML galley view writing three visits; Rule 3a)
  - OJS3 (the "Issues" search by a bare volume or number; Rule 13;
    scenario 11 marks it)
  - OJS4 (more than 30 issues in "Download Issues"; Rule 16)
  - OJS5 (the investigation rows of "Journal Article Requests (IR_A1)";
    Rule 20)
  - OJS6 (the report name inside the Release 4 file; Rule 25a; scenario
    12 marks it)
  - OMP3 (a book's PDF or "Appendix" file opened from the book page;
    Rule 1)
- **No seed**:
  - visits turned into figures the next day, with known robots and
    repeats within 30 seconds dropped (Rules 1–3a), since no test
    install runs the daily processing
  - visits credited to an institution (Rules 4a, 22a), since seeded
    visits come from an address outside every institution
  - an institution under "Customer ID" on a press and a preprint server
    {OMP OPS} (Rule 22), since the tooling adds institutions to a
    journal alone
  - the press's "Series" filter narrowing the figures {OMP} (Rule 11),
    since a scratch press has no series and the seeded press no figures
  - the "Issues" search by a word of an issue's title {OJS} (Rule 13),
    since the tooling gives an issue no title
- **Owned by another feature**:
  - the journal's "Enable institutional statistics" ticked, and the
    side menu's "Institutions" (Rule 29; Settings bullet 8;
    [Institutions](U66-institutions.md))

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed
unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | "All dates" on "Articles" of a journal with nothing published opens an "Error" window reading a raw code, and the chart stays on the previous range | 🐞 | user-visible | — |
| [A3](#a3) | "Counter R5" date refusals show a raw code with the date inside it | 🐞 | minor | — |
| [A4](#a4) | A journal's "Do not collect any geographical data" is not kept; it collects at the site's level | 🐞 | user-visible | — |
| [A5](#a5) | A Section Editor's "Counter R5" opens an "Error" window over an empty list while the journal's COUNTER statistics are restricted | 🐞 | minor | — |
| [A6](#a6) | French interface: raw codes on the statistics screens of a press and a preprint server, and one column heading on a journal | 🐞 | minor | — |
| [A7](#a7) | The information icons show their text on mouse hover only; the keyboard never reaches them | 🐞 | minor | — |
| [A8](#a8) | A search phrase with double quotes breaks the spreadsheet's "Search Phrase" line | 🐞 | minor | — |
| [A10](#a10) | A malformed Platform ID behind an unticked "Platform" refuses every save of the site's tab | 🐞 | minor | — |
| [A11](#a11) | The COUNTER report downloads as "counterReport.tsv" but is comma-separated | 🐞 | minor | — |
| [OJS4](#ojs4) | "Download Issues" holds at most 30 issues, although the page counts more | 🐞 | user-visible | — |
| [OJS5](#ojs5) | "Journal Article Requests (IR_A1)" lists investigation rows its header leaves out | 🐞 | minor | — |
| [OJS6](#ojs6) | The COUNTER Release 4 file names its report by a cut-off code path | 🐞 | minor | — |
| [OMP3](#omp3) | A book's PDF or "Appendix" file fails to open, so its visit is never counted | 🐞 | user-visible · crash: both | — |
| [A2](#a2) | Custom Range refuses an open-ended range | ❓ | minor | — |
| [A9](#a9) | The downloaded spreadsheets carry no byte-order mark | ❓ | minor | — |
| [A12](#a12) | The date range list does not close on Escape | ❓ | minor | — |
| [A13](#a13) | After a preset, the "Custom Range" boxes still show the page's first range, and "Apply" on them undoes the preset | ❓ | minor | — |
| [OJS1](#ojs1) | A journal still offers the retired COUNTER Release 4 reports beside "Counter R5" | ❓ | minor | — |
| [OJS2](#ojs2) | One view of an HTML galley writes three visits to the day's log | ❓ | latent | — |
| [OJS3](#ojs3) | The "Issues" search finds no issue by a bare volume or number | ❓ | minor | — |
| [OMP1](#omp1) | A press counts series-page visits that no page shows | ✅ | invisible | — |
| [OMP2](#omp2) | A press offers "Filters" only while it has a series, and names abstract views "Catalog Entries" | ✅ | minor | — |
| [OPS1](#ops1) | A preprint server offers "Filters" only with two or more sections | ✅ | minor | — |

### All apps

<a id="a1"></a>
**A1 — "All dates" fails on a journal with nothing published** · 🐞 · user-visible.
On "Articles" of a journal that has not published an article yet,
choosing "All dates" should show the empty table for the whole range.
Instead one "Error" window opens reading the raw code
"api.stats.400.wrongDateFormat" with "OK"; behind it the range reads
"All dates" and "Monthly" is pressed, but the chart still shows the
previous range.
Basis: probe, 2026-09-27. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Custom Range refuses an open-ended range** · ❓ · minor.
Typing only one date in "Custom Range" and pressing "Apply" is refused
with "The start date may not be earlier than 2001-01-01." (start box
empty) or "The end date may not be later than {yesterday}." (end box
empty), yet the control carries the wording "Since {date}" and "Until
{date}" for such a range and treats an empty box as valid in its other
checks.
Question: should one empty box mean "from the earliest" or "to
yesterday"? Lean: yes; the wording exists for it, and the refusal
message blames a date the user did not type.
Basis: probe, 2026-09-27. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — COUNTER date refusals show a raw code** · 🐞 · minor.
In "Report Settings", a "Start Date" before the earliest possible date is
refused with "The start date may not be earlier than
##validation.values.begin_date.2026-10-01##." and an "End Date" after
the last possible date with "The end date may not be later than
##validation.values.end_date.2026-08-31##.": the date the user needs is
buried in an untranslated code, although the field's own line states it
plainly.
Basis: probe, 2026-09-27. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A journal cannot stop collecting geographical data** · 🐞 · user-visible.
With the site collecting geographical data, a Journal Manager who
chooses "Do not collect any geographical data" on Settings › Distribution
› "Statistics" and saves sees "Saved" with the choice still shown, but
reopened the tab has the site's level chosen again, and the journal
keeps collecting at the site's level: the "Download" window of
"Articles" still offers "Geographic", whose file reports at the site's
level (cities, at a city-level site). Expected: the choice holds and
nothing geographical is collected, as it does for the shallower levels.
Basis: probe, 2026-09-27. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A Section Editor's "Counter R5" fails while restricted** · 🐞 · minor.
The side menu offers "Counter R5" to the Section Editor. While the
journal's COUNTER statistics are restricted (either "Public API"), the
page opens an "Error" window reading "The current role does not have
access to this operation." with "OK", over a list reading "No items
found.". Expected: the page either lists the reports for the Section
Editor or is not offered.
Basis: probe, 2026-09-27. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Raw codes in the French statistics screens** · 🐞 · minor.
With the interface in French, Administration › Site Settings ›
"Statistiques" on a press and a preprint server shows the raw codes
"##admin.settings.statistics.geo.description##",
"##admin.settings.statistics.institutions.description##" and
"##admin.settings.statistics.sushi.public.description##" in place of the
three descriptions; a journal shows French text. The press's and the
server's statistics pages show raw codes in their browser tab titles,
headings, table titles, count lines, chart buttons and both "Download"
windows. A journal's pages are translated except the "JATS" column
heading of "Articles", which reads "##stats.jats##".
Basis: probe, 2026-09-27. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The information icons cannot be read from the keyboard** · 🐞 · minor.
The statistics pages explain their figures in information icons ("About
journal statistics", "About issue statistics", "About Geolocation")
whose text shows only while the mouse pointer rests on them. Pressing an
icon does nothing and Tab skips it, so a keyboard user never reads the
text. Expected: the text can be reached from the keyboard.
Basis: probe, 2026-09-27. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A quoted search phrase breaks the spreadsheet** · 🐞 · minor.
With the search phrase "Quoted" (typed with its double quotes) applied
on "Articles", every downloaded file's line reads
`"Search Phrase",""Quoted""`: the phrase's own quotes are not doubled,
so a spreadsheet program reads a broken cell. The rows below escape the
same quotes correctly. Expected: `"Search Phrase","""Quoted"""`.
Basis: probe, 2026-09-27. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — No byte-order mark in the spreadsheets** · ❓ · minor.
No downloaded statistics spreadsheet starts with a byte-order mark, so a
spreadsheet program that relies on it to recognise UTF-8 may show
accented titles and names garbled.
Question: should the files start with a byte-order mark? Lean: yes
(🐞); the server's own spreadsheet code means to add one, and it goes
missing on the way to the file.
Basis: probe, 2026-09-27. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A hidden, malformed Platform ID blocks the site's tab** · 🐞 · minor.
With "Platform" ticked, a malformed ID typed ("bad id!") and "Platform"
then unticked, "Save" on Administration › Site Settings › "Statistics"
is refused with "Please correct one error." and "Go to Platform ID: This
is not formatted correctly." while the "Platform ID" box is hidden, and
nothing is stored. The Site Administrator must tick "Platform" again to
see and fix the box. Expected: a hidden ID is ignored, or the box stays
visible with its error.
Basis: probe, 2026-09-27. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The COUNTER ".tsv" file is comma-separated** · 🐞 · minor.
"Download" in "Report Settings" saves "counterReport.tsv", a name that
promises tab-separated values, but its lines are comma-separated with
quoted text, so a spreadsheet program opening it as tab-separated shows
each line in one column. Expected: tab-separated values, as the name
says and as COUNTER's tabular reports have them.
Basis: probe, 2026-09-27. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The date range list does not close on Escape** · ❓ · minor.
With the date range's list open, pressing Escape leaves it open, whether
the focus is on the calendar button or in a "Custom Range" box; only the
calendar button pressed again, a click outside the list or the focus
leaving it closes it.
Question: should Escape close the list? Lean: yes; Escape is the usual
way out of a pop-up list for a keyboard user, and the calendar button
does not tell a screen reader whether the list is open either.
Basis: probe, 2026-09-29. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The Custom Range boxes do not follow the chosen range** · ❓ · minor.
The "Custom Range" boxes hold the dates the page opened on and keep them
after a preset is chosen: after "Last 90 days" or "All dates" they still
show "{the day 31 days ago}" and "{yesterday}", and "Apply" pressed
without typing puts the page back on that first range, undoing the
preset.
Question: should the boxes show the range the page shows? Lean: yes;
fill them with the page's range (empty for "All dates"), so that "Apply"
never changes the range unasked.
Basis: probe, 2026-09-29. <sup>f-a13</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — The retired COUNTER Release 4 reports remain** · ❓ · minor.
Statistics › "Reports" still lists "COUNTER Reports", the COUNTER Release
4.1 page (Rule 25), beside "Counter R5", which serves the current release.
Question: should the Release 4 page stay offered? Lean: retire it; COUNTER
Release 4 has been superseded, and two COUNTER pages invite the wrong one.
Basis: probe, 2026-09-27. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — One HTML galley view writes three visits** · ❓ · latent.
On a journal, one view of an HTML galley writes three file-view lines
for the same file in the same second to the day's usage log; a press and
a preprint server write one. The 30-second rule (Rule 3a) should count
them once, but no screen of a test install shows the processed figure.
Question: does one HTML view count once? Lean: yes, harmless; the three
lines fall inside the 30 seconds.
Basis: probe, 2026-09-27. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — The "Issues" search ignores a bare volume or number** · ❓ · minor.
The "Issues" search box reads "Search issue title, volume and number",
yet "7" or "4" alone finds nothing ("0 of 0 issues"); only the forms the
issue's identification shows ("Vol. 7", "No. 4", "Vol. 7 No. 3") find
the issue.
Question: should a bare volume or number find the issue? Lean: yes; the
box's own label promises it.
Basis: probe, 2026-09-27. <sup>f-ojs3</sup>

<a id="ojs4"></a>
**OJS4 — "Download Issues" stops at 30 issues** · 🐞 · user-visible.
With more than 30 issues visited in the range, the "Issues" page reads
"30 of 31 issues" and pages on, but "Download Issues" lists only the
first 30 in the table's order; "Download Articles" and "Download Files"
list every row. Expected: every issue.
Basis: probe, 2026-09-27. <sup>f-ojs4</sup>

<a id="ojs5"></a>
**OJS5 — "Journal Article Requests (IR_A1)" lists investigations** · 🐞 · minor.
The report's "Metric_Types" line reads
"Total_Item_Requests;Unique_Item_Requests", but its table also has
"Total_Item_Investigations" and "Unique_Item_Investigations" rows for
each article. Expected: requests only, as the header says and as COUNTER
defines the report.
Basis: probe, 2026-09-27. <sup>f-ojs5</sup>

<a id="ojs6"></a>
**OJS6 — The Release 4 file names its report by a code path** · 🐞 · minor.
The XML file a "COUNTER Reports" year link downloads gives its report a
name that is a cut-off internal code path instead of "Journal Report 1"
or "Article Report 1", so a system reading the file gets a meaningless
report name. Expected: the report's name.
Basis: probe, 2026-09-27. <sup>f-ojs6</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Series-page visits are counted and shown nowhere** · ✅ · invisible.
A press counts visits to each series page alongside its books, but no
Statistics page or report shows series figures.
Basis: probe, 2026-09-27. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — Filters by series; "Catalog Entries"** · ✅ · minor.
A press's "Articles" page ("Monographs") filters by "Series" and offers
"Filters" only while the press has a series; its chart names abstract
views "Catalog Entries". A different parameter on the same machinery.
Basis: probe, 2026-09-27. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A book's PDF or "Appendix" file is never counted** · 🐞 · user-visible · crash: both.
On a press, a reader who opens a book's PDF from the book page gets a
viewer that stays empty, and one who opens its "Appendix" file gets a
blank page: the app fails, so no file view is recorded. An HTML file
opens and is counted. The failure itself is [Search engine metadata &
analytics' OMP6](U20-search-engine-metadata-and-analytics.md#omp6).
Basis: probe, 2026-09-27. <sup>f-omp3</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Filters only with two sections** · ✅ · minor.
A preprint server's "Articles" page ("Preprints") offers "Filters" only
while the server has two or more sections, so a server with its one
default section has none.
Basis: probe, 2026-09-27. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Code read 2026-09-27 at ojs `3162c105bf`, omp `72a01a026`, ops
`e9f6f4f550`, lib/pkp `1ad4a14bb2` and the same ui-library in all three.
Pages: `PKP\pages\stats\PKPStatsHandler` (`publications()`, `context()`,
`counterR5()`), OJS `APP\pages\stats\StatsHandler::issues()`; data:
`PKPStatsPublicationController`, `PKPStatsContextController`, OJS
`StatsIssueController`, `PKPStatsSushiController` and each app's
`StatsSushiController`; recording and processing: fn-j. lib/pkp and the
ui-library are the same commit in the three apps; the app subclasses
differ only where this spec marks an app. Live-probed 2026-09-27
(Purpose), three apps, on scratch journals: visits to the home page, a
work's page, a file and (OJS) an issue each wrote a line to the day's
usage log; the statistics roles opened every page with seeded figures;
"Counter R5" listed 6, 4 and 3 reports; the SUSHI address answered
signed out while public; the site's tab reads "Each journal may
configure this setting differently, but a journal can never collect more
detailed records than what is configured here." ("press", "server").

<a id="fn-b"></a>
**b** — `PKPStatsHandler::__construct()` assigns `[ROLE_ID_SITE_ADMIN,
ROLE_ID_MANAGER, ROLE_ID_SUB_EDITOR]` to `editorial`, `publications`,
`context`, `users`, `reports`, `counterR5`; OJS `StatsHandler` adds
`issues` for the same three; `authorize()` adds `ContextAccessPolicy`.
The API controllers above use the same three roles as route middleware.
Default groups (`registry/userGroups.xml`): Journal manager, Journal
editor and Production editor are `0x10`; Section editor and (OJS) Guest
editor `0x11`; OPS's Moderator is the sub-editor slot (GLOSSARY Part
II). `PKPStatsPublicationController::getMany()` filters by
`contextIds` alone, never by assignment. Addresses (side menu,
`PKPTemplateManager::setupBackendPage()`; OJS `TemplateManager` inserts
the issues line after the publications line):
`{journal}/stats/publications/publications`,
`/stats/issues/issues` {OJS}, `/stats/context/context`,
`/stats/counterR5/counterR5`, `/stats/reports`. Browser titles:
`stats.publicationStats` "Article Stats" ("Monograph Stats", "Preprint
Stats"), `stats.contextStats` "Journal Stats" ("Press Stats", "Server
Stats"), `stats.issueStats` "Issue Stats", `manager.statistics.counterR5Reports`
"Counter R5 Reports". Headings: `common.publications` "Articles"
("Monographs", "Preprints"), `context.context` "Journal" ("Press",
"Server"), `issue.issues` "Issues". Live-probed 2026-09-27 (Actors
preamble and row 1; Rule 6), three apps, on scratch journals with a
throwaway account per role: every statistics role (OJS Journal manager,
Journal editor, Production editor, Section editor, Guest editor; OMP
Press manager, Press editor, Production editor, Series editor; OPS
Preprint Server manager, Moderator) and `admin` saw the same rows,
including a work in a section the Section Editor is not assigned to;
`admin` holds "Journal manager" ("Press manager", "Preprint Server
manager") in each journal's Users list. The group lists "Articles",
"Issues" {OJS}, "Journal", "Editorial Activity", "Users" and "Counter
R5", plus "Reports" for the manager-level roles and `admin`. Every other
role (Copyeditor, Author, Reviewer, Reader, OJS Subscription Manager,
OMP Volume editor, OPS Editorial Board Member) landed on
`{journal}/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`
("The current role does not have access to this operation.") for every
Statistics address; signed out, on `{journal}/login?source={address}`.
OMP and OPS answer `stats/issues/issues` with "404 Not Found".

<a id="fn-c"></a>
**c** — `ui-library/src/components/DateRange/DateRange.vue`:
`currentRange` ("Since {$date}", "Until {$date}", "All dates", or
`{start} — {end}`); `applyCustomRange()` checks in order
`validateFormat()` (`^\d{4}-\d{2}-\d{2}$`), `validateDateExists()`
(luxon `fromISO`), `validateRange()` (empty boxes pass),
`validateDateStartMin()`, `validateDateEndMax()`; the last two compare
`parseInt` of the box, so an empty box is NaN and fails (A2).
`dateStartMin` is `PKPStatisticsHelper::STATISTICS_EARLIEST_DATE`
(2001-01-01) and `dateEndMax` yesterday (`PKPStatsComponent::getConfig()`).
Presets from `PKPStatsHandler::publications()`, `context()` and OJS
`issues()`: `stats.dateRange.last30Days` (from 31 days ago to
yesterday), `last90Days` (91 days ago), `last12Months`, `allDates`
(both dates empty); "Editorial Activity" has its own presets in
`editorial()`. `StatsPage.vue` watches `dateStart`/`dateEnd`: back to
offset 0 and a new fetch. Messages `stats.dateRange.*`. Live-probed
2026-09-27 (Fields "The date range"; Rules 2, 7, 8), three apps, on
"Articles", "Journal" and "Issues" {OJS}: the calendar button is named
"Change date range"; arrival on "2026-08-27 — 2026-09-26" (31 chart
points); "Last 90 days" from 2026-06-28 and "Last 12 months" from
2025-09-27; a preset chosen from page 2 lands on page 1. Every Custom
Range message verbatim ("2026-9-1", "2026-02-30", the dates reversed,
"2000-12-31", today as the end); a refusal sent no request and left the
range, rows and chart as they were, its message staying through closing
and reopening the list; Enter in a box sent nothing and left the list
open; 2001-01-01 to yesterday was accepted (309 monthly points). After a
day of visits made on screen the figures were unchanged and the range
still ended yesterday. "Editorial Activity" offers "Last 90 days", "Year
to date", "Last year" and "Last two years". Live-probed 2026-09-29
(Fields "The date range"; Rule 7; A12, A13), three apps, two runs, on
"Articles", "Journal" and "Issues" {OJS} of scratch journals as the
Journal Manager and the Section Editor (Series Editor, Moderator), and
on "Editorial Activity" as the Journal Manager: Escape with the focus on
"Change date range" or in the "From" box left the list open; the button
again closed it from either place; a click on the page heading and
Shift+Tab off the button closed it, from the button at once or within
1.6 s, from a box after about a second; a preset closed it. The range
text never changed. "Editorial Activity" behaved the same (Escape
nothing, the button again and a click on a blank spot closing). The
boxes held "2026-08-29" and "2026-09-28" on arrival
("2026-06-30"–"2026-09-28" on "Editorial Activity") and kept them after
"Last 90 days" (page "2026-06-30 — 2026-09-28") and "All dates"; "Apply"
untouched then brought the page back to "2026-08-29 — 2026-09-28".
2025-01-01 and 2025-02-01 typed, then the button pressed, left the
range as it was and showed again on reopening; leaving the page with
them raised no question or browser dialog, and Back reopened on "Last
30 days" with the list closed; after "Last 12 months" a reload reopened
on "Last 30 days". `DateRange.vue` has no key handler and closes the list
only when the toggle loses focus (a 10 ms timer, or a 1 s poll while the
focus is inside the list); its button carries no expanded state for
assistive technology.

<a id="fn-d"></a>
**d** — `StatsPublicationsPage.vue` (extended by `StatsContextPage.vue`
and `StatsIssuesPage.vue`): `chartData` is null only for an empty
timeline, and the server fills every day or month of the range with 0
(`PKPStatsServiceTrait::getTimeline()`, `getEmptyTimelineIntervals()`),
so the chart always shows. `isDailyIntervalEnabled`: days between
`dateStart` and `dateEnd` < 91; `isMonthlyIntervalEnabled`: true without
both dates or when daily is off, else days between `dateStart` and
`dateEndMax` > 31; watchers switch `timelineInterval` to the other value.
Initial `timelineInterval` `day`, `timelineType` `abstract` (OJS issues
`toc`). Labels `stats.publications.abstracts` "Abstracts" (OMP "Catalog
Entries"), `submission.files` "Files", `stats.views`, `stats.downloads`,
`stats.daily`, `stats.monthly`. The chart is a canvas; the hidden table
beside it (captions "Total abstract views by date", "Total file views by
date", "Total views by date", "Total downloads by date"; OMP's first
"Total catalog views by date") holds the same points and is what a test
can read. Live-probed 2026-09-27 (Rule 10): td3.

<a id="fn-e"></a>
**e** — `StatsPage.vue`: `toggleSidebar()` clears `activeFilters` when
closing; `addFilter()`/`removeFilter()` keep a list per parameter; the
API applies one parameter's values as "any of" and the section and issue
parameters together (`pkpSectionIds`; OJS
`StatsPublicationService::getAppSpecificFilters()` `issueIds`).
`Filter.vue`: the name toggles, the "×" reads `common.filterRemove`
"Clear filter: {$filterTitle}". Filter sets: OJS
`StatsHandler::addSectionFilters()` always adds `section.sections` with
every section of `getSectionList()` and, on the publications page,
`issue.issues` with the published issues by `getIssueIdentification()`;
OMP adds `series.series` only when the press has a series; OPS adds
sections only when `SubmissionsListPanel::getSectionFilters()` returns
two or more. The button reads `common.filter` "Filters"; the window's
rows `stats.downloadReport.allFilters` "All {$filter}". Live-probed
2026-09-27 (Rule 11): td14.

<a id="fn-f"></a>
**f** — `PKPStatsPublicationController::getMany()`: `count` 30 from the
page (at most 100), `orderDirection` DESC by default; the list is
`PKPStatsPublicationService::getTotals()` and `getCount()`: submissions
with metrics of the abstract and primary-file kinds (JATS too while
`isJatsPluginAvailable()`) in the range. Row values `getItemForJSON()`
(`galleyViews` = pdf + html + other); the page's `setItems()` adds
`total` = abstract + galley + jats. Only the total column
`allows-sorting`; `setOrderBy()` flips `orderDirection`. Search:
`Search.vue` emits on Enter or the clear button (`common.clearSearch`);
`_processSearchPhrase()` keeps published submissions matched by the
collector's `searchPhrase()`; no match answers an empty list.
`stats.publications.details`, `stats.publications.countOfTotal`,
`stats.publications.none`, `stats.searchSubmissionDescription`. Columns
`PKPStatsHandler::getTableColumns()`, OJS override adds `stats.jats`.
Row link `publication.urlPublished`, `target="_blank"`. "All dates":
`_processAllowedParams()` sets `dateStart` to
`getDateBoundaries()->min_date_published`, null when nothing is
published; `_validateStatDates()`'s `date_format:Y-m-d` then fails, and
`validateParams()` throws `new \Exception('api.stats.400.wrongDateFormat',
400)`, whose message (a locale key, never translated) the JSON `error`
carries to `ajaxErrorCallback()`'s "Error" dialog; the timeline request
fails the same way (A1). Live-probed 2026-09-27 (Fields "Articles" page
and the per-app table; Rules 9, 12, 13), three apps: the headings, table
titles, count lines and empty-table lines per app as the Fields table;
OMP's first chart button "Catalog Entries" while its table and file head
the column "Abstract Views". 31 works with visits: "30 of 31 articles",
"Previous 1 2 Next", page 2 "1 of 31". Rows most-viewed first (20, 6,
1), a work without views in the range absent; the author list bold; the
title opens `article/view/{id}` (OMP `catalog/book/{id}`, OPS
`preprint/view/{id}`) in a new tab; "Total" pressed three times gave
ascending, descending, ascending; no other heading sorts. "All dates" on
a journal first published 2024-03-05 started the chart at "March 2024".
Search: td15.

<a id="fn-g"></a>
**g** — `PKPStatsContextController::get()` (total from
`contextStats->getTotal()`, no default start, so the service's
2001-01-01); `StatsContextPage.vue::setItems()` one row with the
context's name and `url`. `stats.context.tooltip.label`/`.text`, app
locale overrides for the press and the server. Live-probed 2026-09-27
(Fields "Journal" page; Rule 14), three apps: home-page visits seeded 1,
10, 45 and 400 days ago gave 5 at "Last 30 days", 9 at "Last 90 days"
and "Last 12 months", 10 at "All dates", identical for the Journal
Manager, the Section Editor and `admin`; the row opened the home page in
a new tab; the icon's label and hover text per app as the Fields table.

<a id="fn-h"></a>
**h** — OJS `StatsHandler::issues()` (columns `issue.issue`,
`stats.views`, `stats.downloads`, `stats.total` on `totalViews`),
`templates/stats/issues.tpl`, `StatsIssuesPage.vue`,
`api/v1/stats/issues/StatsIssueController` (`_processSearchPhrase()`:
published issues, the collector's `searchPhrase()`), `stats.issues.*`.
Live-probed 2026-09-27 (Fields "Issues" page; Rule 15), OJS: 31 issues
with visits read "30 of 31 issues", page 2 "1 of 31 issues";
most-visited first, "Total" reversing (`orderDirection=ASC`); no
"Filters"; a published issue without visits never listed, an older one
joining at "All dates"; the empty-table line for 2010-01-01 — 2010-01-31
and for a search matching nothing ("0 of 0 issues"); the search box's
placeholder and label both "Search issue title, volume and number";
"Downloads" refetches the chart; each row opens `issue/view/{id}` in a
new tab. The OMP and OPS side menus have no "Issues".

<a id="fn-i"></a>
**i** — `StatsPublicationsPage.vue::downloadReport()`: name
`['stats', getReportFileNamePart(type), new
Date().toISOString().slice(0, -5).replace(':', '-')].join('_') + '.csv'`
(UTC, only the first colon replaced; the browser saves the second as
"_"); the preamble rows are prepended in
the browser (`dateRangeRow`, one `filtersRow` per filter set,
`searchPhraseRow`, and for the timeline `timelineTypeRow` and
`timelineIntervalRow`) to the server's CSV; `getReportParams()` sends no
`count`/`offset`, so every row; `complete` calls
`closeDownloadReportModal()`. Windows `PublicationsDownloadReportModal.vue`,
`ContextDownloadReportModal.vue`, `IssueDownloadReportModal.vue`; the
geographic panel `v-if="geoReportType"`, set by
`PKPStatsHandler::publications()` from `Context::getEnableGeoUsageStats()`
(`countries`, `regions`, `cities`). CSV columns
`_getSubmissionReportColumnNames()`, `_getFileReportColumnNames()`
(`common.publication` + " " + `common.id`, `submission.title` "Article
Title", "Book Title", "Preprint Title"), `getTimelineReportColumnNames()`,
`_getGeoReportColumnNames()`, `_getContextReportColumnNames()`, OJS
issues `editor.issues.issueIdentification`. Timeline line
`stats.timeline.downloadReport.description` "The number of {$type} for
each {$interval}." with `submission.views`/`submission.downloads` and
`common.day`/`common.month`, lowercased. Live-probed 2026-09-27 (Actors
row 2; Fields "Download" window and spreadsheets; Rules 16–18), three
apps: td9; every statistics role got the same "Download Articles" file
and the window closed itself; the window's close control is a back
arrow named "Close". 32 works gave 32 lines while the page showed 30;
"Download Files" 34 lines, a "Data Set" file as "Supplementary File";
the timeline 31 lines at "Last 30 days", 91 at "Last 90 days", one per
month from "2001-01" at "All dates" on "Journal". The site at country,
region and city level gave `stats_countries_…`, `stats_regions_…` and
`stats_cities_…`; at "Do not collect any geographical data" no panel.
The file follows the page's range, filters, search, chart choice and
order. A title with quotes and a comma was escaped as `"K3 ""Quoted"",
Rich Work"`; "Authors" held family names. The press's and the server's
window lines and "Download Files" columns as the Fields tables.

<a id="fn-j"></a>
**j** — Visits are `UsageEvent`s fired by the page handlers: OJS
`IndexHandler` (journal), `ArticleHandler::view()` (submission) and
`download()` (a galley's own file: `ASSOC_TYPE_SUBMISSION_FILE`, or
`ASSOC_TYPE_SUBMISSION_FILE_COUNTER_OTHER` when the file's genre is not
of the document category, or is supplementary or dependent),
`IssueHandler` (issue, issue galley), `HtmlArticleGalleyPlugin`,
`LensGalleyPlugin`, `PKPJatsController`; OMP `IndexHandler` and
`CatalogHandler` (press, on the home and catalog pages; series),
`CatalogBookHandler` (book, chapter, format file),
`HtmlMonographFilePlugin`; OPS `IndexHandler`, `PreprintHandler`.
`LogUsageEvent` skips Do-Not-Track requests and unpublished publications
and issues, and appends to `usage_events_YYYYMMDD.log` in
`{files_dir}/usageStats/usageEventLogs`. `APP\tasks\UsageStatsLoader`
("Usage statistics file loader task", `Scheduler` `->daily()`):
`autoStage()` skips the current day's file, `isDateValid()` sends back
logs dated before the COUNTER R5 start (fn-m); the jobs
`ProcessUsageStatsLogFile` (drops `Core::isUserAgentBot()`),
`RemoveDoubleClicks` (`COUNTER_DOUBLE_CLICK_TIME_FILTER_SECONDS` 30),
`CompileUniqueInvestigations`, `CompileUniqueRequests`,
`CompileContextMetrics`, `CompileSubmissionMetrics`, OJS
`CompileIssueMetrics`, OMP `CompileSeriesMetrics`,
`CompileSubmissionGeoDailyMetrics`, `CompileCounterSubmissionDailyMetrics`,
`CompileCounterSubmissionInstitutionDailyMetrics`,
`CompileUsageStatsFromTemporaryRecords`,
`DeleteUsageStatsTemporaryRecords`, `ArchiveUsageStatsLogFile`
(compressed while `compressStatsLogs`), then `CompileMonthlyMetrics`
(removes the COUNTER and geographical daily rows of months before last
month unless `keepDailyUsageStats`). `PKP\task\UpdateIPGeoDB` runs
monthly on the 10th; its report email is titled "Update DB-IP city lite
database - {id} - Error" on a test install. The "Usage event" plugin
(`UsageEventPlugin`, site-wide, cannot be disabled) keeps the older
hook-based event for other plugins. Live-probed 2026-09-27 (Rules 1, 3),
three apps, in the day's usage log of scratch journals: a signed-out
visit and a signed-in Reader's visit to the same work each wrote a line;
the home page (and OMP's catalog page) a journal line (assoc type 256,
OMP 512); a work's page and an earlier version's `…/version/{id}` page
an abstract line (1048585); a PDF and an HTML galley a file line of
their format (515); a "Data Set" galley a supplementary line (531),
listed as "Supplementary File" and left out of "File Views"; OJS's
"JATS XML" link a JATS line (262); OJS's table of contents and "Issue
PDF" issue lines (259, 261); OMP's series page a series line (530). A
request with `DNT: 1` wrote nothing; one with `Sec-GPC: 1` alone wrote a
line. The Journal Manager opened the unpublished work's page and (OJS)
the unpublished issue's table of contents by address, and neither wrote
a line. The seeded Totals read 9 on OJS (5 abstract, 3 file, 1 JATS)
and 8 on OMP and OPS; an unpublished work was never listed. OMP's PDF
and "Appendix" files wrote nothing (OMP3).

<a id="fn-k"></a>
**k** — No routine task runs on a test install; figures come only from
the scenarios' `usage[]` keys on the context, issue and submission
scenarios (scenarios.md), and the test installs have no location
database ("Update DB-IP city lite database" ends in error at its
download). Live-probed 2026-09-27, three apps: `publicknowledge`, never
seeded, read the empty-table line on "Articles" and one row at 0 on
"Journal"; the scratch journals showed exactly their seeds; at the
install's "Do not collect any geographical data" every visit made on
screen recorded no place.

<a id="fn-l"></a>
**l** — `PKPStatsHandler::counterR5()`; `CounterReportsPage.vue`;
`CounterReportsListPanel.vue` (list from `stats/sushi/reports`, row
"{Report_Name} ({Report_ID})", `common.edit`; every window titled
`manager.statistics.counterR5Report.settings`);
`CounterReportsEditModal.vue` (`getReportParams()`, `Accept:
text/tab-separated-values`, blob `counterReport.tsv`; a COUNTER error
body becomes a warning notice "{Code}: {Message} ({Data})").
`PKPCounterReportForm` (submit `common.download`), each app's
`CounterReportForm::setReportFields()`, fields
`CounterR5Report::getCommonReportSettingsFormFields()` plus each
report's `getReportSettingsFormFields()` (`classes/sushi/*` per app; OMP
PR and TR add the two title metrics). List
`PKPStatsSushiController::getReportList()` plus the app overrides.
Refusals `PKPStatsSushiController::_validateUserInput()`: begin/end
`regex:/^\d{4}-\d{2}(-\d{2})?$/`, `after_or_equal` earliest,
`before_or_equal` last and each other, `item_id` `in:` the journal's
submission IDs, `yop` regex, `metric_type` required for PR, TR, IR; the
custom messages are `__()` of keys whose `{$date}` parameter is not
given (A3). Customer ID options: "The World" and `Repo::institution()`
of the context. TSV header `CounterR5Report::getTSVReportHeader()`;
`checkDate()` adds exception 1 "Wrong Requested Dates" for mid-month
dates. Live-probed 2026-09-27 (Actors row 3; Fields "Counter R5" page
and "Report Settings"; Rules 19, 20, 22), three apps: the page, its
link to COUNTER's 5.0.3 reports page (a new tab) and the list rows as
the Fields tables; every "Edit" titled "Report Settings", each report's
fields as the table ("Include Parent Details" on OJS's IR only;
"Journal Usage by Access Type (TR_J3)", "Journal Article Requests
(IR_A1)", "Book Usage by Access Type (TR_B3)" and "Platform Usage
(PR_P1)" show the three "all" fields alone); "Exclude Monthly Details"
ticked gave only `Reporting_Period_Total` and
`Exclude_Monthly_Details=True`. The Section Editor's "Edit" opens the
same window as the manager's, and on a fresh install its "Download" got
the same refusal (Rule 21). With the site's COUNTER start date set to
2026-05-01 in the test database: "2026-07-14" to "2026-08-20" was
widened to 2026-07-01 – 2026-08-31 with `Exceptions,"1:Wrong Requested
Dates(…)"`, and YYYY-MM dates gave whole months with no exception; an
institution with no credited visits gave `Institution_Name`,
`Institution_ID` `{journal path}:{id}`, `Exceptions` "3030:No Usage
Available for Requested Dates(No usage available for requested dates.
Request was for 2026-06-01 to 2026-08-31.)" and the column row alone.
The list named the journal's institutions with the site's institutional
statistics off and on. Refusals: td5.

<a id="fn-m"></a>
**m** — `CounterR5Report::getEarliestDate()`: the first day of the month
after the later of `PKPStatsSushiService::getEarliestDate()` (the site's
`counterR5StartDate`, set only by an upgrade from 3.3, else the
installation date of the first version from 3.4.0 on,
`VersionDAO::getInstallationDate(3400)`) and the context's first
`date_published`; `getLastDate()`: the last day of the previous month;
`usageNotPossible` = last ≤ earliest. Example: installed 2026-08-15 →
earliest 2026-09-01; on 2026-09-27 the last is 2026-08-31, so the
warning shows; from 2026-10-01 the last is 2026-09-30 and it goes.
A fleet reset recently is in this state. Live-probed 2026-09-27 (Rule
21): td4.

<a id="fn-n"></a>
**n** — The service status is `{journal}/api/v1/stats/sushi/status`,
the report list `{journal}/api/v1/stats/sushi/reports`; a signed-in
role's request carries its session, as its browser does.
`PKPStatsSushiController::isPublic()`: restricted when the
site's `isSushiApiPublic` is false or the context's is false (both
default true in `site.json` and `context.json`); public → middleware
`has.context` and `PublicAccessPolicy`; restricted → `has.user` and
`roleAuthorizer([ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER])`. Routes under
`{journal}/api/v1/stats/sushi/`: `status`, `members`, `reports`,
`reports/pr`, `reports/pr_p1`, plus OJS `tr`, `tr_j3`, `ir`, `ir_a1`,
OMP `tr`, `tr_b3`, OPS `ir`. Live-probed 2026-09-27 (Actors rows 3–4;
Rules 23, 30; Settings bullets 5, 9), three apps, by direct requests to
`status`, `members`, `reports` and `reports/pr` (the Frame's one
exception): public, signed out and every role got 200 (`status`
`{"Description":"COUNTER Usage Reports for …","Service_Active":true}`;
`members?customer_id=0` "The World"; `reports/pr` without a customer a
COUNTER 400 1030 "Missing customer_id."). The journal's box unticked and
saved, or the site's "Public API" restricted: signed out 401 "You are
not authorized to access the requested resource."; Reader, Author,
assistant, Section Editor and Guest Editor 401 "The current role does
not have access to this operation."; Editor, Journal Manager and
`admin` 200. With one journal's box unticked another journal stayed
public; with the site restricted a journal's managers got 401 from a
journal where they hold no role, and the journals' tabs lost the box.

<a id="fn-o"></a>
**o** — `CounterR5Report::setPlatform()`: the context's name in its
primary locale and its path; with the site's `isSiteSushiPlatform`, the
site's title (when it has one) and `sushiPlatformID`. Used in the
`Created_By` header and the `Platform` column (PR
`getTSVColumnNames()`). Live-probed 2026-09-27 (Rule 24; Settings bullet
6), three apps, PR downloads: by default `Created_By` and the "Platform"
column named the journal; "Platform" ticked with a Platform ID
(`K4PLAT`, `K5PLAT`) on a site with no title still named the journal;
with a site title ("K5 Site Name") both named the site, and
`Proprietary_ID` read `K4PLAT:{id}`.

<a id="fn-p"></a>
**p** — OJS `plugins/reports/counter/CounterReportPlugin.php`:
`getCurrentRelease()` "4.1"; `display()` with `type=fetch`, `release`,
`report`, `year` streams `counter-{release}-{report}-{Ymd}.xml`, errors
`plugins.reports.counter.error.*` as a notification; `_getYears()` the
years with primary-file metrics. `templates/index.tpl` (report titles
`plugins.reports.counter.{jr1,ar1}.title`, `krsort()` puts JR1 first).
`ReportPlugin::getEnabled()` is always true, so the plugin is always on
"Reports" (`lib/pkp/templates/stats/reports.tpl`), reached as
`stats/reports/report?pluginName=CounterReportPlugin`. Its `version.xml`
dates from 2015-01-11. OMP and OPS ship no such plugin. Live-probed
2026-09-27 (Actors row 5; Rule 25): td11.

<a id="fn-q"></a>
**q** — `PKPSiteStatisticsForm` (groups `collection`, `storage`,
`sushi`; `sushiPlatformID` `showWhen: isSiteSushiPlatform`), rendered by
`lib/pkp/templates/admin/settings.tpl` under
`componentAvailability['statistics']` (always on); saves `PUT
index/api/v1/site`. Refusals: `PKPSiteService::validate()`'s after-hook
(`admin.settings.statistics.sushiPlatform.sushiPlatformID.required`) and
the schema's `regex:#^[a-zA-Z0-9._/]{1,17}$#`. "Compress Logs"'s line
prints the archive folder (`admin.settings.statistics.compressStatsLogs.description`,
`{$path}`). OMP and OPS override the "journals" wording of the
geographical, institutional and "Public API" descriptions and of the
"Platform" box, not of the "Platform" description. The side tab's
placement is U60's (Rule 1 table). Live-probed 2026-09-27 (Actors row 6;
Fields site tab; Rule 26; Settings bullets 1–6), three apps, as
`admin`: the three groups in order and one "Save"; each field's install
choice and wording per app as the Fields table; "Compress Logs"'s line
reads "…moved to {files folder}/usageStats/archive once they have been
processed."; one "Save" of "Collect the visitor's country", "Enable
institutional statistics", "Track daily and monthly statistics" and
"Compress the log files" stored all four and reopened with them, and
every journal's tab then showed the fields of Rule 27; put back and
reopened at the install values. A Journal Manager or Editor typing
`index/admin/settings` lands on the access-denied page. "Platform ID":
td12. Every Site Settings load also answers a server error for the
Plugin Gallery list (Plugins management A1), unrelated to this tab.

<a id="fn-r"></a>
**r** — `ManagementHandler::distribution()`: `$displayStatisticsTab` =
site geographical level not `disabled`, or site
`enableInstitutionUsageStats`, or site `isSushiApiPublic` null or true;
`lib/pkp/templates/management/distribution.tpl` tab `statistics`
(`manager.setup.statistics`). `PKPContextStatisticsForm` adds each field
under the site condition; saves `PUT {journal}/api/v1/contexts/{id}`.
seed-facts: the journal's institutional box appears once the site's is
ticked and arrives unticked (U08 claim check K2-10, 2026-09-24).
Live-probed 2026-09-27 (Actors row 7; Fields journal tab; Rule 27; Side
effects bullet 3), three apps: td13. The Journal Manager, Journal
Editor {OJS OMP}, Production Editor and `admin` see the same fields; the
Section Editor, Guest Editor, Author and Reader typing the Distribution
address land on the access-denied page. The journal's "Public API"
unticked and saved showed "Saved" and read unticked after a reload, and
the "Articles" figures before and after were identical. A change left
unsaved on either tab (the site's "Compress the log files", the
journal's box) survived a switch to another tab and back; leaving the
page asked nothing, and the tab reopened without it.

<a id="fn-s"></a>
**s** — `Context::getEnableGeoUsageStats()`: the site's value when it is
null or `disabled`; the context's value when the site's value starts
with it; otherwise the site's. `disabled` never starts `country…`, so a
journal set to it gets the site's level (A4).
`PKPContextStatisticsForm` offers the options up to the site's value and
chooses the context's value only when it is such a prefix. The context
schema's default is `disabled`. Live-probed 2026-09-27 (Rules 18, 28;
Settings bullets 1, 7): td7.

<a id="fn-t"></a>
**t** — `Context::isInstitutionStatsEnabled()` (the site's box on and the
context's not false; the context's schema default is false, so both are
needed); credited by `CompileCounterSubmissionInstitutionDailyMetrics`
from the institutions' IP ranges. The "Institutions" menu entry is
`PKPTemplateManager`'s, U08 Settings bullet 10. Live-probed 2026-09-27
(Rules 4a, 29; Settings bullets 2, 8), three apps, with an institution
"K5 Localhost Institute" whose IP range holds the visitor's address,
each case read in the visit's line of the day's usage log: the site's
box ticked and the journal's as created (unticked), no institution and
no "Institutions" in the side menu; both ticked, that institution, and
"Institutions" at once on the same page and after reopening; the
journal's unticked again, none and the entry gone; the journal's ticked
and the site's unticked, none, the entry gone and the journal's box no
longer shown while its stored value stays on.

<a id="fn-u"></a>
**u** — `PKPStatsPublicationService::isJatsPluginAvailable()` (generic
`jatstemplateplugin` enabled); OJS `StatsHandler::getTableColumns()`;
only OJS ships the plugin. seed-facts: the plugin arrives ticked and
Statistics › "Articles" carries "JATS" (U48 claim check K2, 2026-09-25).
Live-probed 2026-09-27 (Settings bullet 10), OJS scratch journal: with
the plugin on, a work viewed as abstract and JATS read JATS 3, Total 5,
and a JATS-only work JATS 2, Total 2; off (after "Are you sure you want
to disable this plugin?"), the column left the page and the file, the
first work read Total 2 and the second left the table; on again, both
rows and their figures returned. Whether a JATS view is recorded while
the plugin is off needs the daily processing (Rule 5).

<a id="fn-v"></a>
**v** — OMP's and OPS's `locale/fr_CA` files hold empty strings for
`admin.settings.statistics.{geo,institutions,sushi.public}.description`,
`stats.publicationStats`, `stats.contextStats`,
`stats.publications.{abstracts,details,none,countOfTotal}`,
`stats.publications.downloadReport.*`,
`stats.publications.totalAbstractViews.timelineInterval`,
`stats.publications.totalGalleyViews.timelineInterval` and
`stats.context.{tooltip,downloadReport}.*`; OMP also
`common.publications`. OJS's are translated, except that its French
"Articles" heads the JATS column "##stats.jats##". Seen 2026-09-26 (U60
claim check K2): Administration › Site Settings › "Statistiques" on a
press and a preprint server showed the three
`##admin.settings.statistics…##` codes. Live-probed 2026-09-27 (Rule 6;
A6): td8.

<a id="fn-w"></a>
**w** — No screen of a test install shows these, because nothing turns
the day's log into figures there (Rule 5): the daily processing and
what it drops or merges (Rules 2, 3a), the place a visit records (Rule
4), what an institution's report counts (Rule 22a), the log archive and
its jobs on "View Jobs" (Side effects bullet 2), and what "Track daily
and monthly statistics" and "Compress the log files" change (Settings
bullets 3–4). They are read from the code (fn-j, fn-t). Live-probed
2026-09-27, three apps, the recording half in the day's usage log: each
visit's line was written within the second; a visit with a known
robot's browser name ("Googlebot") and a reload within seconds were
written like any other; at the install's "Do not collect any
geographical data" no line recorded a place; the seed's processed logs
lay uncompressed in the archive folder at the "Compress Logs" default.
The two storage settings were saved and reopened at both ends (fn-q).

<a id="fn-x"></a>
**x** — Live-probed 2026-09-27 (Cross-feature interactions, the
"Downloads" chart), three apps, with the chart shown as bars: a work
first published 2026-07-01 charted August 3 and September 3, total 6,
equal to its "File Views" on "Articles" at "Last 90 days" (PDF 5, HTML
1), its "Supplementary File" downloads left out; a work published on
the day of the probe charted 0 while "Articles" showed 3 file views. The
chart counts PDF, HTML and Other file views from the work's first
publication date on, by month.

<a id="fn-sc"></a>
**sc** — Scenarios. Scenarios 1 to 10 run on OJS, OMP and OPS, 11 to 13
on OJS. Scenarios 1 and 2 read `publicknowledge`, whose usage is never
seeded (fn-k): scenario 1 as `manager.maya`; scenario 2 with
`sectioneditor.ana`, `author.alex`, `reviewer.julia` (OJS, OMP),
`reader.rosa`, `copyeditor.carla` (OPS `assistant.rita`, Editorial Board
Member) and `manager.maya` for its control, each with the username twice
as password (`docs/process/users.md`); its addresses are
`{journal}/stats/publications/publications`, `/stats/issues/issues`
{OJS}, `/stats/context/context` and `/stats/counterR5/counterR5` (fn-b),
and its signed-out visitor is a fresh browser context. Every other
scenario builds its journals with `POST scenarios/context` and a
throwaway `manager` (plus a `sectionEditor` with no section in scenarios
3, 8 and 9), and its works with `POST scenarios/submission`
`published: true` and `datePublished` before every visit day (a work
published today shows no past visit at "All dates", seed-facts), with
`galleys[]` on OJS and OPS and `publicationFormats[]` with `genre:
'Book Manuscript'` on OMP; the visits are `usage[]` entries (`daysAgo`
or `date`, `abstractViews`, `fileViews` in the order of the files,
`jatsViews`), the home-page visits the context's `usage[]`, an issue's
the `issues[].usage[]` entry (`views`, `galleyDownloads`). The names in
the scenarios ("Axolotl limb memory", "Okapi Institute"…) stand for the
test's tag-prefixed throwaways. Scenario 3: `sections[]` "Articles" (the
renamed default) and "Reviews" on OJS and OPS, OJS `issues[]` both
`published` in 2024 with each work's `issue`. Scenario 4: the work's
`datePublished` 2024-03-05. Scenario 5: as scenario 3 without the
issues, "Axolotl limb memory" with a third galley of `genre: 'Data Set'`
(OMP a format whose file has no `genre`, an "Appendix"). Scenario 6: 31
works, seeded in parallel. Scenarios 7, 8 and 10 change the
installation, so they run `@solo` and put it back in a `finally`
(scenarios.md `POST site`): scenario 7 sets `enableGeoUsageStats:
'country+region+city'` before seeding the places (`country: 'CA',
region: 'BC', city: 'Vancouver'` and `country: 'CA', region: 'ON'`);
scenario 8 sets `counterR5StartDate` to the first day of the fourth
month back and `title` "Okapi Site", puts back `counterR5StartDate:
null` and `title: ""`, and empties the "Platform ID" box, unticks
"Platform" and saves on the site's tab (no `POST site` key covers the
platform); its OJS journal A has `institutions[]` "Okapi Institute" with
an IP range no seeded visit uses (the key is OJS's alone), journal B
one work `published` with today's `datePublished`; scenario 10 puts back
the three statistics keys. Scenario 9 fetches
`{journal}/api/v1/stats/sushi/status` and `…/sushi/reports` by direct
request, the Frame's one exception (fn-n): signed out from a fresh
request context, the Section Editor and the Journal Manager with their
sessions; its journal's box is saved on screen, since no scenario key
sets it. Scenario 11: OJS `issues[]` with `published`, `volume`,
`number`, `year`, the first with a `galleys[]` entry, each with its
`usage[]`. Scenario 12: one work
`datePublished` 2024-01-15 with a PDF galley and `usage[]` `date`
entries. Scenario 13: `jats: {file, makePublic: true}` on both works,
`jatsViews` in `usage[]`; the plugin is switched off and on again on
screen and left on. Live-probed 2026-09-27 (the preamble): a scratch
journal took throwaway accounts, seeded figures and its own statistics
settings.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (Rule 9; A1), three apps, as the Journal
Manager of a scratch journal with nothing published: "All dates" on
"Articles" opened one "Error" window reading
"api.stats.400.wrongDateFormat" with "OK"; behind it the range read "All
dates" with "Monthly" pressed, the chart kept the previous range's 31
daily points, and the table read the empty-table line; the list request
and the two monthly chart requests answered 400. Controls: a scratch
journal with published works opened no window and filled the table;
"All dates" on "Journal" of the journal with nothing published opened no
window and started at January 2001. `publicknowledge` has published
items on a used fleet: its "All dates" opened no window.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Rule 8a; A2), three apps: the first box
empty with the end ten days before yesterday, "The start date may not
be earlier than 2001-01-01."; a start date with the second box empty,
"The end date may not be later than 2026-09-26."; both empty, the start
message; no "Since" or "Until" text ever showed. An empty start with
"2026-9-1" as the end got the format message: the empty box passes the
format check.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Rule 10), three apps, on "Articles"
(and "Journal" for "Last 30 days" and "Last 12 months"): on arrival
"Daily" pressed, "Monthly" greyed; "Last 90 days" both pressable; "Last
12 months" and "All dates" "Monthly" pressed, "Daily" greyed; Custom
Range 2025-01-01 to 2025-01-20 "Daily" pressed, "Monthly" pressable; 91
days to yesterday "Daily" greyed, "Monthly" pressed; a start 31 days
before yesterday "Monthly" greyed, 32 days both pressable. "Monthly"
pressed on "Last 90 days", then "Last 30 days", left "Daily" pressed.
"Files" shows file views (caption "Total file views by date"); on
"Issues" "Views" is pressed on arrival.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Rule 21), three apps: the fleet was
installed that day (Administration › "System Information": "Current
version: 3.6.0.0 (September 27, 2026 - 09:25 AM)"); "Counter R5" on
`publicknowledge` showed the warning and the list rows of the Fields
table; "Edit" on "Platform Master Report (PR)" opened "Report Settings"
with "Start Date" 2026-10-01 and "End Date" 2026-08-31 and their lines;
"Download" was refused (400) with "The start date must be before the end
date." under both dates, and no file arrived. With the site's COUNTER
start date set to 2026-05-01 in the test database, a journal first
published 2025-03-01 got the earliest date 2026-06-01 and no warning,
and one first published 2026-08-10 got 2026-09-01 and kept the warning.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Fields "Download" refusals; A3), three
apps: "Start Date" "2001-01", "The start date may not be earlier than
##validation.values.begin_date.2026-10-01##."; "End Date" "2099-01",
"The end date may not be later than
##validation.values.end_date.2026-08-31##." (the same shape with the
live dates when only one box was wrong); "2026/07/01", the format
message with the earliest-date message under it; "2026-13-01", the
earliest-date message alone; an emptied date box, "This field is
required." and no request; "Year Of Publication" "1999-", "YOP format
is not valid.", while "2020|2021-2022" drew no message; "Submission ID"
999999, or another journal's submission, "The submission ID does not
exist."; the start after the end, the order message under both dates.
Each refusal also showed "Please correct {n} errors." with "Go to …"
links, and each one the server answered the page notice "The form was
not saved because {n} error(s) were encountered. …"; the emptied box,
refused before any request, showed no page notice. "Close" after
changing "Start Date" and a "Metric Type" box asked nothing, and "Edit"
again showed the first values.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Actors row 3; Rule 23; A5), three apps,
on scratch journals: the Journal Manager unticked Settings › Distribution
› "Statistics" › "Public API" and saved; the Section Editor and Guest
Editor {OJS} (the Series Editor, the Moderator) then opened "Counter
R5": the list request answered 401, and an "Error" window reading "The
current role does not have access to this operation." with "OK" opened
over a list reading "No items found."; the manager-level roles and
`admin` listed every report. The same with the site's "Public API"
restricted. With the box ticked again the Section Editor's list
returned.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rules 18, 28; A4), three apps: with the
site at "Collect the visitor's country", a scratch journal's tab offered
"Do not collect any geographical data" and "Collect the visitor's
country" (chosen); "Do not collect …" and "Save" showed "Saved" with it
still chosen, but reopened the tab had "Collect the visitor's country"
chosen, and "Articles" › "Download Report" offered "Geographic", whose
file was `stats_countries_…`. With the site at city level, the journal's
"Do not collect …" reopened at the city level with a `stats_cities_…`
file, while its "Collect the visitor's country" held after reopening
and gave `stats_countries_…`. Control: a journal never saved showed the
site's level chosen and "Geographic".

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 6; A6), three apps, in French:
OMP's "Monographs" page showed "##stats.publicationStats##" (browser
tab), "##common.publications##" (heading and window panel),
"##stats.publications.details##", "##stats.publications.countOfTotal##",
"##stats.publications.abstracts##" (chart button) and
"##stats.publications.totalAbstractViews.timelineInterval##", and its
window "##stats.publications.downloadReport.description##",
"##stats.publications.downloadReport.downloadSubmissions.description##"
and "##stats.publications.downloadReport.downloadSubmissions##"; the
"Press" page "##stats.contextStats##", "##stats.context.tooltip.label##"
and its window's three `##stats.context.downloadReport…##` codes. OPS the
same, except its heading "Prépublications". The site's "Statistiques"
tab showed the three codes on OMP and OPS, French text on OJS. OJS's
pages and windows were French except the "JATS" column heading,
"##stats.jats##".

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Rules 16, 17), three apps, as
`manager.maya` on `publicknowledge` at "Last 30 days": "Download
Articles" saved `stats_submissions_2026-09-27T11-42_56.csv` and the
window closed; its first lines were `"Date Range","2026-08-27 to
2026-09-26"`, `"Sections","All Sections"`, `"Issues","All Issues"`, an
empty line, then the column line. After "Files", "Download Timeline"
gave `"Timeline Type","Downloads"`, `"Timeline Interval","Day"`, an
empty line, `Date,Label,Total` and 31 day lines at 0. "Download Journal"
saved `stats_context_2026-09-27T11-43_00.csv`: `"Date
Range","2026-08-27 to 2026-09-26"`, an empty line, `ID,Title,Total`,
`1,"Journal of Public Knowledge",0`. OMP the same with "Series" · "All
Series", OPS with no filter line. On a scratch journal all ten report
names occurred, the time in each name being the download's in UTC.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27 ("Report Settings" "Metric Type"), three
apps: every "Metric Type" box unticked on "Platform Master Report (PR)"
and "Download": the request was sent and refused (400), with "This field
is required." under "Metric Type"; the field carries no "*" while
"Start Date", "End Date" and "Customer ID" read "* Required".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 (Actors row 5; Rule 25; OJS1, OJS6),
OJS: Statistics › "Reports" lists "Articles Report", "Subscriptions
Report", "Review Report" and "COUNTER Reports"; the page as Rule 25,
the line continuing "These reports alone do not make a journal COUNTER
compliant. …"; on a scratch journal with file views in 2025 and 2026
each report line was followed by "2025 2026", on `publicknowledge` by
no link. A year link saved `counter-4.1-JR1-20260927.xml` (and
`…-AR1-…`). The report address typed with 2001 returned to the page with
no notice, and "The report parameters were invalid." showed on the next
editorial page opened, not on the reader side (two runs). The Section
Editor gets the same page; a Reader typing its address gets "The
current role does not have access to this operation.". OMP and OPS:
"Reports" lists no "COUNTER Reports" (OMP "Monograph Report" and
"Review Report"), and the typed plugin address answers "404 Not Found".

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (Fields "Platform ID"; Rule 26; A10),
three apps, as `admin`: no "Platform ID" box until "Platform" is ticked,
and then none marked required; "Save" empty was refused (400) with the
required message under the box and "Please correct one error." on the
form; "has space" and the 18 characters `K5_plat.id/1234567` were refused
with "This is not formatted correctly."; the 17 characters
`K5_plat.id/123456` saved ("Saved") and reopened ticked with the ID.
Unticked and saved with an ID in the box, the ID stayed stored and
showed filled on the next tick. Unticked and saved at the end, the tab
was back at its defaults.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27 (Rule 27), three apps: `publicknowledge`'s
Distribution tabs list "Statistics" with "Public API" alone, ticked. On
a scratch journal, one site condition at a time: install values,
"Public API" alone; the site's "Public API" restricted and nothing else
collected, no "Statistics" tab (the tabs "License", "DOIs", "Search
Indexing", "Payments" {OJS OMP}, "Access" {OJS OPS}, "Archiving"
{OJS}); restricted with a country level, "Geographical Statistics"
alone; restricted with institutional statistics, "Institutional
Statistics" alone; everything on, all three. "Save" stored the journal's
choices, read right after "Saved" and after reopening.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-27 (Rule 11; OMP2, OPS1), three apps: a
scratch journal's "Filters" opened a panel headed "Filters" with
"Sections" ("Articles", "Reviews") and "Issues" ("Vol. 1 No. 1 (2025)",
"Vol. 1 No. 2 (2026)"); one name narrowed the table and the chart, two
under "Sections" added up, "Articles" with "Vol. 1 No. 2 (2026)" gave
the one article in both; the "×" ("Clear filter: Reviews") and the name
pressed again dropped a name; "Filters" again closed the panel and
dropped every name. The window read "Sections · Articles", then
"Sections · Articles, Reviews", "Issues · Vol. 1 No. 2 (2026)", and
"All Sections" / "All Issues" after the panel closed. A journal with
nothing published showed "Issues" with no name under it.
`publicknowledge` OJS: "Articles", "Reviews"; "Vol. 1 No. 2 (2014)". A
press showed no "Filters" without a series and "Series" ("Series One",
"Series Two") with two (`publicknowledge`: "Monographs", "Textbooks"); a
preprint server showed "Sections" with two sections and no "Filters"
with one, `publicknowledge` included.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-27 (Rule 13; OJS3), three apps: typing
"Gamma" without Enter changed nothing and sent no request; Enter
narrowed the table and the chart, and the window gained "Search Phrase
· Gamma"; "Clear search phrase" emptied the box, restored the rows and
removed the window's row; an author's name and an ID found their
article; "zzzz" gave "0 of 0 articles", the empty-table line, a zero
chart and "Search Phrase · zzzz". "Issues" {OJS}, with issues 7/3
(2020, "Winter Special") and 8/4 (2021): "Winter", "2021", "Vol. 8",
"No. 4", "Vol. 7 No. 3" and "Vol. 8 No. 4 (2021)" found their issue;
"7" and "4" found nothing ("0 of 0 issues").

<a id="fn-f-a1"></a>
**f-a1** — fn-f (the null start date and the untranslated key).
Live-probed 2026-09-27: td1.

<a id="fn-f-a2"></a>
**f-a2** — fn-c (`validateDateStartMin()`/`validateDateEndMax()` on an
empty box). Live-probed 2026-09-27: td2.

<a id="fn-f-a3"></a>
**f-a3** — fn-l: `_validateUserInput()` maps
`begin_date.after_or_equal` to `__('stats.dateRange.invalidStartDateMin')`
and `end_date.before_or_equal` to `__('stats.dateRange.invalidEndDateMax')`
without `['date' => …]`; on screen the date lands inside an
untranslated code. Live-probed 2026-09-27: td5.

<a id="fn-f-a4"></a>
**f-a4** — fn-s. Live-probed 2026-09-27: td7.

<a id="fn-f-a5"></a>
**f-a5** — fn-n (restricted: site admin and manager roles alone) against
fn-b (`counterR5` open to `ROLE_ID_SUB_EDITOR`); the list's fetch is
`CounterReportsListPanel.vue`'s, and its 401 reaches the "Error" window
through `ajaxErrorCallback()`. Live-probed 2026-09-27: td6.

<a id="fn-f-a6"></a>
**f-a6** — fn-v. Live-probed 2026-09-27: td8.

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-27, three apps: the icons (`.tooltipButton`)
are spans with no role, out of the tab order (`tabindex="-1"`); pressing
one did nothing, and Shift+Tab from "Download Report" landed on "Daily".
Hovering showed each text.

<a id="fn-f-a8"></a>
**f-a8** — Live-probed 2026-09-27, three apps: with `"Quoted"` applied on
"Articles", "Download Articles", "Download Files" and "Download
Timeline" each read `"Search Phrase",""Quoted""`; the server's rows
escaped a title holding the same quotes as `"K3 ""Quoted"", Rich
Work"`. The parameter lines are joined as plain strings in the browser
(`StatsPublicationsPage.vue::downloadReport()`: `searchPhraseRow`,
`dateRangeRow`, `filtersRow`), so a filter name holding a quote would
break its line the same way (by the code, not driven).

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-27, three apps: neither the server's answer to
the page (its first byte a line break) nor the saved file (its first
bytes `"Date Ra`) starts with a byte-order mark, while the server's CSV
writer adds one "to enforce the UTF-8 format" before the page prepends
its parameter lines. Opening a "Download Articles" file that holds an
accented title in Excel would settle the question.

<a id="fn-f-a10"></a>
**f-a10** — Live-probed 2026-09-27, three apps, as `admin`: "Platform"
ticked, "bad id!" typed, "Platform" unticked, "Save": 400, "Please
correct one error." with "Go to Platform ID: This is not formatted
correctly.", the box hidden, and the stored ID unchanged. The box is
only hidden (`showWhen`, fn-q), so its value is still checked on
"Save".

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-27, three apps: 63 downloaded files over
every report, none holding a tab (`Report_Name,"Platform Master
Report"`, `Platform,Metric_Type,Reporting_Period_Total,Jun-2026,…`). The
page asks for `Accept: text/tab-separated-values` and names the file
`counterReport.tsv` (fn-l); the answer is `text/csv` with
`Content-Disposition: attachment; filename=user-report-2026-09-27.csv`,
which the page ignores.

<a id="fn-f-a12"></a>
**f-a12** — fn-c (`DateRange.vue`: no key handler, the list closes on
the toggle's blur). Live-probed 2026-09-29, three apps, two runs, both
levels, every page with the control, "Editorial Activity" included: the
list stayed open after Escape on the button and in a box. The accessible
tree shows `button "Change date range"` with no expanded state.

<a id="fn-f-a13"></a>
**f-a13** — fn-c: `DateRange.vue` copies `dateStart`/`dateEnd` into the
boxes (`localDateStart`, `localDateEnd`) once, in `mounted()`, and
`selectOption()` never updates them. Live-probed 2026-09-29, three apps, two runs,
the Journal Manager and the Section Editor on "Articles", "Journal" and
"Issues" {OJS}: after "Last 90 days" the boxes read 2026-08-29 and
2026-09-28 while the page read "2026-06-30 — 2026-09-28", and "Apply"
untouched set "2026-08-29 — 2026-09-28"; after "All dates" the boxes
read the same arrival dates.

<a id="fn-f-ojs1"></a>
**f-ojs1** — fn-p. Live-probed 2026-09-27: td11; the side menu offers
"Counter R5" at the same time.

<a id="fn-f-ojs2"></a>
**f-ojs2** — Live-probed 2026-09-27, in the day's usage log of scratch journals:
one view of an HTML galley wrote three file-view lines of type HTML for
the same file in the same second on OJS, one on OMP and OPS. The
30-second rule is `RemoveDoubleClicks` (fn-j); a test install never runs
it (Rule 5).

<a id="fn-f-ojs3"></a>
**f-ojs3** — fn-h (`_processSearchPhrase()` matches the collector's
`searchPhrase()` against the issue's stored fields, not its bare
numbers). Live-probed 2026-09-27: td15.

<a id="fn-f-ojs4"></a>
**f-ojs4** — Live-probed 2026-09-27 (two runs, as the Journal Manager and
the Section Editor): with 31 issues in range the file held 30 lines,
dropping No. 2 in the default order and No. 1 in the reversed one.
`StatsIssueController::getMany()` defaults `count` to 30 and the
download sends no `count` (fn-i), while the article list has no default
count.

<a id="fn-f-ojs5"></a>
**f-ojs5** — Live-probed 2026-09-27 (two runs): the IR_A1 file's
`Metric_Types` line and its `Total_Item_Investigations` and
`Unique_Item_Investigations` rows per article. OJS
`classes/sushi/IR_A1.php` (fn-l).

<a id="fn-f-ojs6"></a>
**f-ojs6** — Live-probed 2026-09-27 (three runs):
`<Report … Name="eports\counter\classes\reports\CounterReportJR1"
Title="Journal Report 1">` (AR1 likewise); `<ItemPlatform>` reads "Open
Journal Systems". fn-p.

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `CatalogHandler` fires the series event and
`CompileSeriesMetrics` stores it; no stats page, API or report of OMP
reads series metrics. Live-probed 2026-09-27: a visit to
`catalog/series/{path}` is logged as a series event (assoc type 530),
and no Statistics page, COUNTER report (PR, PR_P1, TR, TR_B3) or
"Reports" entry ("Monograph Report", "Review Report") offers series
figures.

<a id="fn-f-omp2"></a>
**f-omp2** — fn-e (OMP `StatsHandler::addSectionFilters()`), fn-d (OMP
`stats.publications.abstracts`). Live-probed 2026-09-27: td14.

<a id="fn-f-omp3"></a>
**f-omp3** — Live-probed 2026-09-27, OMP scratch press, signed out:
`catalog/view/{book}/{format}/{file}` answered 500 for the "Appendix"
file (a blank page); the PDF's view page opened with an empty viewer,
its `catalog/download/{book}/{format}/{file}?inline=1` answering 500
and the page's script failing with "PDFJS is not defined" and
"UnexpectedResponseException". Neither wrote a line to the day's usage
log; the HTML format wrote one. The same failure is U20's OMP6.

<a id="fn-f-ops1"></a>
**f-ops1** — fn-e (OPS `StatsHandler::addSectionFilters()`,
`count($sectionFilters) < 2`). Live-probed 2026-09-27: td14.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Statistics pages handler | `{journal}/stats/…`; `PKPStatsHandler`, app `StatsHandler` | ROUTE-026, ROUTE-050 (OJS), ROUTE-069 (OMP), ROUTE-085 (OPS) |
| "Articles" page: date range, filters, chart toggles, "Download Report", search, sort, pages | Statistics › "Articles" (`stats/publications/publications`) | VUE-025, AFFU-254, AFFU-255, AFFU-256 (OJS OPS), AFFU-257 (OMP), AFFU-258 (OJS), AFFU-259..264 |
| "Articles" "Download" window: articles, files, timeline, geographic | "Download Report" | VUE-079, AFFU-265..268 |
| "Journal" page and its "Download" window | Statistics › "Journal" (`stats/context/context`) | VUE-026, VUE-077, AFFU-271..274 |
| "Issues" page and its "Download" window {OJS} | Statistics › "Issues" (`stats/issues/issues`) | VUE-027, VUE-078, AFFU-275..282 |
| "Counter R5" page, "Edit", "Report Settings", "Download" | Statistics › "Counter R5" (`stats/counterR5/counterR5`) | VUE-002, VUE-074, AFFU-284..288 |
| Publication statistics API | `api/v1/stats/publications` | API-038 |
| Journal statistics API | `api/v1/stats/contexts` | API-036 |
| Issue statistics API {OJS} | `api/v1/stats/issues` | API-056 |
| COUNTER SUSHI address | `api/v1/stats/sushi` | API-039, API-055 (OJS), API-060 (OMP), API-064 (OPS) |
| "COUNTER Reports" (Release 4) {OJS} | Statistics › "Reports" › "COUNTER Reports" | PLUG-045 |
| Journal "Statistics" tab | Settings › Distribution › "Statistics" (`management/settings/distribution#statistics`) | AFFM-095 |
| Site "Statistics" tab | Administration › Site Settings › "Site Setup" › "Statistics" | AFFM-221 |
| Visit recording | every public page a visit counts on (Rule 1) | PLUG-029 |
| Daily processing routine task and its jobs | "Usage statistics file loader task" | JOB-060, JOB-048, JOB-021..026, JOB-035..044 (JOB-037 OJS, JOB-038 OMP) |
| Location database refresh | routine task "Update DB-IP city lite database" | JOB-056 |

## Reference — code anchors

- Pages: `lib/pkp/pages/stats/PKPStatsHandler.php`;
  `<app>/pages/stats/StatsHandler.php`;
  `lib/pkp/templates/stats/{publications,context,counterReports}.tpl`;
  OJS `templates/stats/issues.tpl`;
  `lib/pkp/classes/components/{PKPStatsComponent,PKPStatsPublicationPage,PKPStatsContextPage}.php`;
  OJS `classes/components/StatsIssuePage.php`.
- Vue: `ui-library/src/components/Container/{StatsPage,StatsPublicationsPage,StatsContextPage,StatsIssuesPage}.vue`;
  `ui-library/src/pages/{statsPublications/PublicationsDownloadReportModal,statsContext/ContextDownloadReportModal,statsIssues/IssueDownloadReportModal}.vue`;
  `ui-library/src/pages/counter/{CounterReportsPage,components/CounterReportsListPanel,components/CounterReportsEditModal}.vue`;
  `ui-library/src/components/{DateRange/DateRange,Filter/Filter,Search/Search,Chart/LineChart}.vue`;
  `ui-library/src/mixins/ajaxError.js`.
- API: `lib/pkp/api/v1/stats/{publications/PKPStatsPublicationController,contexts/PKPStatsContextController,sushi/PKPStatsSushiController}.php`;
  `<app>/api/v1/stats/{publications/StatsPublicationController,sushi/StatsSushiController}.php`;
  OJS `api/v1/stats/issues/StatsIssueController.php`;
  `lib/pkp/classes/core/PKPBaseController.php` (`_validateStatDates()`).
- Services: `lib/pkp/classes/services/{PKPStatsPublicationService,PKPStatsContextService,PKPStatsSushiService,PKPStatsGeoService,PKPStatsServiceTrait}.php`;
  `<app>/classes/services/StatsPublicationService.php`; OJS
  `classes/services/StatsIssueService.php`;
  `lib/pkp/classes/statistics/PKPStatisticsHelper.php`.
- COUNTER: `lib/pkp/classes/sushi/CounterR5Report.php`;
  `<app>/classes/sushi/*.php`;
  `lib/pkp/classes/components/forms/counter/PKPCounterReportForm.php`;
  `<app>/classes/components/forms/counter/CounterReportForm.php`; OJS
  `plugins/reports/counter/`.
- Recording and processing: `lib/pkp/classes/observers/events/UsageEvent.php`,
  `lib/pkp/classes/observers/listeners/LogUsageEvent.php`;
  `lib/pkp/plugins/generic/usageEvent/PKPUsageEventPlugin.php`,
  `<app>/plugins/generic/usageEvent/UsageEventPlugin.php`;
  `lib/pkp/classes/task/{PKPUsageStatsLoader,UpdateIPGeoDB}.php`,
  `<app>/classes/tasks/UsageStatsLoader.php`;
  `lib/pkp/jobs/statistics/*.php`, `<app>/jobs/statistics/*.php`.
- Settings: `lib/pkp/classes/components/forms/site/PKPSiteStatisticsForm.php`,
  `lib/pkp/classes/components/forms/context/PKPContextStatisticsForm.php`;
  `lib/pkp/pages/admin/AdminHandler.php` (`settings()`),
  `lib/pkp/pages/management/ManagementHandler.php` (`distribution()`);
  `lib/pkp/templates/admin/settings.tpl`,
  `lib/pkp/templates/management/distribution.tpl`;
  `lib/pkp/classes/context/Context.php`
  (`getEnableGeoUsageStats()`, `isInstitutionStatsEnabled()`);
  `lib/pkp/classes/services/PKPSiteService.php`;
  `lib/pkp/schemas/{site,context}.json`.
- Locale: `lib/pkp/locale/en/{manager,admin,common,api}.po` (`stats.*`,
  `manager.statistics.*`, `manager.settings.statistics.*`,
  `admin.settings.statistics.*`, `api.stats.400.*`, `sushi.*`); each
  app's `locale/en/{manager,admin}.po` overrides the journal-worded keys
  (`stats.publications.*`, `stats.context.*`, `stats.issues.*` OJS,
  `sushi.reports.*`).
