---
name: editorial-statistics
status: verified
---

# Statistics — editorial activity & reports

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal's editors want to know how the editorial work is going: how
many submissions arrive, how many are accepted, declined and published,
how long authors wait for a decision, and how many people hold each role.
Three pages of the editorial side menu's "Statistics" group answer that:
"Editorial Activity" shows the submission figures over a date range the
editor picks, "Users" counts the journal's accounts by role and exports
them as a spreadsheet, and "Reports" downloads ready-made spreadsheets of
the journal's submissions, reviews and (on a journal) subscriptions; a
preprint server's "Reports" lists none [OPS3](#ops3). Once a month the
installation also emails the journal's editors the previous month's
figures with the full table attached. The readers'
visits and downloads, shown on the same "Statistics" group, are
[Statistics — usage](U64-usage-statistics.md)'s. <sup>a</sup>

## Actors & permissions

The **statistics roles** are those of
[Statistics — usage](U64-usage-statistics.md): the manager-level roles
(Journal Manager, Editor, Production Editor), the Section Editor, the
Guest Editor {OJS} and the Site Administrator. Each "Editorial
Activity" and "Users" figure covers the whole journal for every viewer,
assigned to a submission or not. The Site Administrator holds a
Journal Manager role in every journal of the test installs. A role is
*current* while it has started and not ended (a role ended on Settings ›
Users & Roles is no longer current). <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open "Editorial Activity" and "Users"** (Rules 1–15) | • the statistics roles, from the side menu's "Statistics" group or by the page's address<br>• every other role of the journal (Author, Reviewer, Reader, the assistant-level roles, the Subscription Manager {OJS}), and an account with no current role in the journal (its roles ended, or held in another journal only): the access-denied page, "The current role does not have access to this operation."<br>• signed out: the Login page <sup>b</sup> |
| **Export the journal's users to a spreadsheet** (Rules 16–17) | • whoever opens "Users", from its "Export" <sup>j</sup> |
| **Open "Reports" and download a report** (Rules 18–23) | • the manager-level roles and the Site Administrator, from the side menu's "Reports", or from a report's "Reports" link on Settings › Website › "Plugins", group "Report Plugins" ([Plugins management](U62-plugins-management.md#plugin-links)), which downloads that report at once ("COUNTER Reports" {OJS} opens its page); who sees "Reports" in the side menu is [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)'s<br>• Author, Reviewer, Reader, the assistant-level roles, the Subscription Manager {OJS}: the access-denied page<br>• signed out: the Login page <sup>b</sup> <sup>k</sup> |
| **Receive the monthly statistics email** (Rules 24–28) | • every account holding a current manager-level role, Section Editor role or Guest Editor role {OJS} in the journal (the Site Administrator through its Journal Manager role), while the journal sends the email (Settings bullet 1) and the account has not switched it off (Rule 28); a disabled account gets nothing <sup>p</sup> |
| **Turn the monthly email off for the whole journal** (Settings bullet 1) | • whoever opens the Settings pages, on Settings › Workflow › "Emails" ([Emails management](U56-emails-management.md)) <sup>r</sup> |
| **Stop receiving it** (Rule 28; Settings bullet 2) | • each recipient for themself, on Profile › "Notifications" or through the email's "Unsubscribe" link, which stops the email alone (Rule 28; [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)) <sup>r</sup> |

## Fields & validation

**"Editorial Activity"** (Statistics › "Editorial Activity"; the browser
tab reads "Editorial Activity"), top to bottom. No visible heading names
the page. <sup>c</sup> <sup>td1</sup>

| Part (UI label) | What it shows |
|-----------------|---------------|
| chart {OJS OMP} | a ring chart of the active submissions, one coloured segment per stage that has any (with none, no ring is drawn and every number reads 0); beside it the total, a large number over "Active Submissions", then one number per stage with the stage's name under it (Rule 2) |
| "Trends" | the table's heading; at its right the date range (Rule 3) and "Filters" where the journal has filters (Rule 4) |
| columns | "Name", the date range as "{first date} — {last date}" (for example "2026-06-29 — 2026-09-27"), "Total" |
| rows | the rows below, always all of them, in this order (Rule 5) |

The chart's stages are the app's own: <sup>d</sup>

| App | Stages, in order |
|-----|------------------|
| journal | "Submission", "Review", "Copyediting", "Production" |
| press | "Submission", "Internal Review", "External Review", "Copyediting", "Production" |
| preprint server | no chart [OPS1](#ops1) |

The "Trends" rows of a journal and a press. A *sub-row* belongs to the
row above it that it names as its group (Rule 12). What each row counts
is Rule 6. <sup>f</sup>

| Row (UI label) | Sub-row of | Figures read as | Information icon |
|----------------|-----------|-----------------|------------------|
| "Submissions Received" | — | a count; "Total" with a yearly average (Rule 8) | — |
| "Submissions Accepted" | — | a count; "Total" with a yearly average | — |
| "Submissions Declined" | — | a count; "Total" with a yearly average | — |
| "Submissions Declined (Desk Reject)" | "Submissions Declined" | a count; "Total" with a yearly average | — |
| "Submissions Declined (After Review)" | "Submissions Declined" | a count; "Total" with a yearly average | — |
| "Submissions Published" | — | a count; "Total" with a yearly average | — |
| "Other Submissions" | — | a count | yes |
| "Submissions In Progress" | "Other Submissions" | a count | — |
| "Imported Submissions" | "Other Submissions" | a count | — |
| "Days to First Editorial Decision" | — | a number of days (Rule 10) | yes |
| "Days to Accept" | "Days to First Editorial Decision" | a number of days | — |
| "Days to Reject" | "Days to First Editorial Decision" | a number of days | — |
| "Acceptance Rate" | — | a whole percentage, "50%" (Rule 9) | yes |
| "Rejection Rate" | — | a whole percentage | yes |
| "Desk Reject Rate" | "Rejection Rate" | a whole percentage | — |
| "After Review Reject Rate" | "Rejection Rate" | a whole percentage | — |

A preprint server's table has four rows: "Submissions Received",
"Submissions Declined", "Submissions Published" and "Other Submissions"
[OPS2](#ops2). <sup>f</sup>

The information icons (Rule 11) carry these texts; each icon is named
"Description for {row name}" for a screen reader. <sup>c</sup>

| Row | Text |
|-----|------|
| "Days to First Editorial Decision" | "The number of days it takes for most submissions to receive the first editorial decision, such as desk rejection or send for review. These figures indicate that 80% of submissions reach the decision within the given number of days. This statistic attempts to describe when the majority of authors submitting to your journal can expect a decision." (the same "your journal" on a press ⚠ [OMP2](#omp2)) |
| "Acceptance Rate" and "Rejection Rate" | "The percentage for the selected date range is calculated for submissions that were submitted during this date range and have received a final decision. For example, consider the case where ten submissions were made during this date range. Four were accepted, four were rejected and two are still awaiting a final decision. The acceptance rate will be 50% (4 of 8 submissions) because the two submissions that have not reached a final decision are not counted." |
| "Other Submissions" | "This includes submissions that are not counted in other totals, such as those that are still in progress and those that appear to have been imported." |

**"Users"** (Statistics › "Users"; the browser tab reads "User
Statistics"), top to bottom: the heading "Registered users" with
"Export" at its right, then a table with the columns "Name" and "Total",
one row per line below. Each row's name is the app's own: <sup>i</sup>

| Row | Journal | Press | Preprint server |
|-----|---------|-------|-----------------|
| all accounts | "All Users" | "All Users" | "All Users" |
| site administrators | "Site Administrator" | "Site Administrator" | "Site Administrator" |
| manager level | "Journal Manager" | "Press Manager" | "Manager" |
| sub-editor level | "Section Editor" | "Series Editor" | "Moderator" |
| assistant level | "Assistant" | "Assistant" | "Assistant" |
| author level | "Author" | "Author" | "Author" |
| reviewer level | "Reviewer" | "Reviewer" | "Reviewer" |
| reader level | "Reader" | "Reader" | "Reader" |
| subscription managers | "Subscription Manager" | — | — |

**The "Export to Excel/CSV" window** (opened by "Export"; it slides in
from the right and covers the page but the edge of the side menu;
closed by the arrow at its top left, which a screen reader names
"Close", or by Escape), top to bottom: <sup>j</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "User Group" | no | under it "Select the users to be exported to an Excel/CSV file."; one box per role of the journal, named as on Settings › Users & Roles › "Roles", every box ticked when the window first opens (then as last left, Rule 16). Unticking every box is not refused; the file then lists no account (Rule 17) |
| "Export" | — | the window's only button (Rule 17) |

**The exported file** ("user-report-{today's date}.csv", as
"user-report-2026-09-28.csv"): a byte-order mark (the invisible first
character that tells spreadsheet programs the text is UTF-8), a line of
column names, then one line per account. The columns: "ID", "Given
Name", "Family Name", the email column, "Phone", "Country", "Mailing
Address", "Date registered", "Updated", then one column per role of the
journal, named as the window's boxes, reading "Yes" where the account
holds that role now and "No" where it does not. "Date registered" gives
the date and time, as "2026-09-28 05:27:26"; "Phone", "Country",
"Mailing Address" and "Updated" are empty where the account has nothing
there. The email column holds the account's email address and is
headed "Email address" on some installs and "Email" on others, with no
setting behind the difference (the same split as the contributor
form's email field, [Contributors & affiliations](U41-contributors-and-affiliations.md#a19)).
<sup>j</sup>

**"Reports"** (Statistics › "Reports"; heading "Reports"), top to
bottom: the line "The system generates reports that track the details
associated with site usage and submissions over a given period of time.
Reports are generated in CSV format which requires a spreadsheet
application to view.", then one link per report the installation
offers, in an order that differs from one installation to another,
with no setting behind it: <sup>k</sup>

| App | Links |
|-----|-------|
| journal | "COUNTER Reports", "Review Report", "Articles Report", "Subscriptions Report" |
| press | "Monograph Report", "Review Report" |
| preprint server | none: the page ends after the line [OPS3](#ops3) |

**The report files.** Every file starts with a byte-order mark, then a
line of column names, then one line per item. "COUNTER Reports" {OJS}
opens a page instead (Rule 19). The email columns are headed as the
users export's email column is: where that reads "Email", "Email
address (Author n)" below reads "Email (Author n)", "Email address
(Editor n)" reads "Email (Editor n)" and "Email address" reads
"Email". <sup>l</sup> <sup>m</sup> <sup>n</sup>
<sup>o</sup>

| Report | File name | One line per | Columns, in order |
|--------|-----------|--------------|-------------------|
| "Articles Report" {OJS} | "articles-{journal initials}-{date}.csv", as "articles-JPK-20260928.csv" | submission of the journal, drafts included (Rule 20) | "Submission ID", "Title", "Abstract"; for each author n, "Given Name (Author n)", "Family Name (Author n)", "ORCID iD (Author n)", "Country (Author n)", "Affiliation (Author n)", "Email address (Author n)", "Homepage URL (Author n)", "Bio Statement (e.g., department and rank) (Author n)"; "Section title", "Language", "Coverage", "Rights", "Source", "Subjects", "Type", "Disciplines", "Keywords", "Supporting Agencies", "Status", "URL", "DOI", "Date submitted", "Last modified", "First published"; for each editor n, "Given Name (Editor n)", "Family Name (Editor n)", "ORCID iD (Editor n)", "Email address (Editor n)", then for each decision d of that editor "Editor Decision d  (Editor n)" and "Date decided d  (Editor n)", each with two spaces before "(Editor n)". "Country (Author n)" holds the two-letter country code, as "DE" |
| "Monograph Report" {OMP} | "monographs-{press initials}-{date}.csv", as "monographs-PKP-20260928.csv" | book of the press, drafts included (Rule 23) | "ID", "Title", "Abstract", "Series", "Series Position", "Language", "Coverage Information", "Rights", "Source", "Subjects", "Type", "Disciplines", "Keywords", "Supporting Agencies", "Status", "URL", "Online ISSN", "Print ISSN", "DOI", "Categories", "Identifiers", "Date submitted", "Last modified", "First published"; then "Articles Report"'s author, editor and decision column names, the decision pair with one space: "Editor Decision d (Editor n)", "Date decided d (Editor n)" |
| "Review Report" {OJS OMP} | "reviews-{date}.csv" | review assignment of the journal, every round, declined and cancelled ones included (Rule 21) | "Stage", "Round", "Submission Title", "Submission ID", "Reviewer", "Given Name", "Family Name", "ORCID iD", "Country", "Affiliation", "Email address", "Reviewing interests", "Date Assigned", "Date Notified", "Date Confirmed", "Date Completed", "Date Acknowledged", "Consideration", "Date Reminded", "Response Due Date", "Response Overdue Days", "Review Due Date", "Review Overdue Days", "Declined", "Cancelled", "Recommendation", "Comments On Submission" |
| "Subscriptions Report" {OJS} | "subscriptions-{date}.csv" | subscription of the journal, in two blocks (Rule 22) | the line "Individual Subscriptions", then "ID", "Status", "Type", "Format", "Start", "End", "Membership", "Reference Number", "Notes", "Name", "Mailing Address", "Country", "Email address", "Phone"; an empty line; the line "Institutional Subscriptions", then the first nine of those and "Institution Name", "Institution Mailing Address", "Domain", "IP Ranges", "Contact Name", "Mailing Address", "Country", "Email address", "Phone". "Country" holds the country's name, as "Canada" |

"{date}" in a report's name is today's date written without dashes.
"{journal initials}" ("{press initials}") is the initials with every
character but letters, digits and spaces left out, so "J-PK" gives
"articles-JPK-20260928.csv"; a journal without initials gets
"articles--20260928.csv".

**The monthly statistics email** (Rules 24–27), as the installation
ships it; its text can be changed on Settings › Workflow › "Emails" ›
"Manage Emails" › "Statistics Report Notification"
([Emails management](U56-emails-management.md)). <sup>p</sup>

| Part | Journal | Press | Preprint server |
|------|---------|-------|-----------------|
| From | the journal's principal contact | the same | the same |
| Subject | "Editorial activity for {month}, {year}" | "Editorial activity for {month}, {year}" | "Preprint Server activity for {month}, {year}" |
| Opening | "{recipient's name}," then "Your journal health report for {month}, {year} is now available. Your key stats for this month are below." | "Your press health report…" | "Your preprint health report…" |
| Figures | "New submissions this month: {n}", "Declined submissions this month: {n}", "Accepted submissions this month: {n}", "Total submissions in the system: {n}" | the same | the same, "Accepted submissions this month:" left blank ⚠ [OPS4](#ops4) |
| Closing | "Login to the journal to view more detailed editorial trends and published article stats. A full copy of this month's editorial trends is attached." | "Login to the the press to view more detailed editorial trends and published book stats. …" ⚠ [A11](#a11) | "Login to the the preprint server to view more detailed trends and posted preprint stats. A full copy of this month's trends is attached." |
| Links | "editorial trends" opens "Editorial Activity"; "published article stats" opens Statistics › "Articles" | "editorial trends" opens "Editorial Activity"; "published book stats" opens "Monographs" | "trends" opens "Editorial Activity"; "posted preprint stats" opens "Preprints" |
| Signature and footer | "Sincerely," and the journal's signature, then the unsubscribe footer of [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md) | the same | the same |
| Attachment | "editorial-report.csv" (Rule 26) | the same | the same |

"{month}" is the previous month's name in the journal's primary
language ("August"), "{year}" its year. On a journal whose primary
language is French (Canada) the whole email is in French, subject
"Activité éditoriale pour août 2026"; on a press or preprint server in
French only the month's name and the footer are, the rest staying in
English ⚠ [A13](#a13). On a French journal, press or preprint server
the links' addresses carry the English language code "en" ⚠
[A10](#a10).

## Rules & state

**The Editorial Activity page**

1. **The page.** Statistics › "Editorial Activity" opens the page with
   the chart {OJS OMP} and the "Trends" table (Fields). Its figures are
   read when the page opens; there is nothing to save. <sup>c</sup>
2. **The active submissions chart** {OJS OMP}. It counts the journal's
   submissions that are still in the workflow, each under the stage it
   is in now: not declined, not published or scheduled, not a draft and
   not imported (Rule 6a). The large number is their total. The chart
   always covers the whole journal as it is today: the date range and
   the filters do not change it. A preprint server shows no chart
   [OPS1](#ops1). <sup>d</sup>
3. <a id="editorial-date-range"></a>**The date range.** The page opens on
   "Last 90 days", from 91 days ago to yesterday. The date range works as
   on [Statistics — usage](U64-usage-statistics.md#date-range), with the
   same "Custom Range" and refusals
   ([Fields](U64-usage-statistics.md#date-range-fields)); this page's
   presets are: <sup>c</sup>

   | Preset | From | To |
   |--------|------|----|
   | "Last 90 days" | 91 days ago | yesterday |
   | "Year to date" | 1 January of this year | yesterday |
   | "Last year" | 1 January of last year | 31 December of last year |
   | "Last two years" | 1 January two years ago | 31 December of last year |

   There is no "All dates". Choosing a range renames the middle column
   "{first date} — {last date}" and recounts it; the "Total" column
   keeps its figures.
4. **Filters.** "Filters" shows under the same conditions as on the
   "Articles" page of
   [Statistics — usage](U64-usage-statistics.md#filters), whose panel,
   choosing of names and dropping of them this page shares (that
   spec's [OMP2](U64-usage-statistics.md#omp2) and
   [OPS1](U64-usage-statistics.md#ops1)). <sup>e</sup>
   - 4a. On a journal always, with the heading "Sections" (every
     section, an inactive one included; no "Issues" heading here); on a
     press "Series" (inactive ones included), only while the press has
     a series; on a preprint server "Sections", only while it has two
     or more sections, an inactive one counted.
   - 4b. Chosen names narrow both columns of "Trends" to the
     submissions in them; the chart stays as it is (Rule 2).
     <a id="current-version"></a>A submission counts under the section
     (series) of its *current version*: for a published item, the
     published version until a newer version is published, then the
     newer one's.
   - 4c. Pressing "Filters" again closes the panel and drops every
     chosen name. The closed panel's heading and names are still read
     out by a screen reader ⚠ [A4](#a4).
5. **The "Trends" table.** Its rows are always the Fields table's, in
   that order, whatever the figures; no heading sorts, and the page has
   no download (the monthly email's attachment, Rule 26, is the
   spreadsheet of these figures). While a new range or filter is being
   counted a spinner shows beside "Trends". <sup>c</sup>
6. **What each row counts.** Over all time in "Total", and within the
   range in the middle column (Rule 7): <sup>f</sup>

   | Row | Counts |
   |-----|--------|
   | "Submissions Received" | submissions sent through the wizard's final "Submit"; drafts and imported submissions are left out |
   | "Submissions Accepted" | submissions with an "Accept Submission", "Accept and Skip Review" or "Send To Production" decision that are not declined now |
   | "Submissions Declined" | submissions declined now: the sum of the two rows under it |
   | "Submissions Declined (Desk Reject)" | declined now with the Submission stage's "Decline Submission" |
   | "Submissions Declined (After Review)" | declined now with the Review stage's "Decline Submission" |
   | "Submissions Published" | submissions published now, dated by their first publication |
   | "Other Submissions" | the sum of the two rows under it |
   | "Submissions In Progress" | drafts: submissions started in the wizard and never submitted |
   | "Imported Submissions" | imported submissions (Rule 6a) |

   - 6a. <a id="imported"></a>A submission whose submission date is
     later than its first publication date *appears to have been
     imported* (it was published before it ever entered the workflow):
     it counts only under "Imported Submissions" and nowhere else, the
     chart included. <sup>f</sup> <sup>td2</sup>
   - 6b. A count follows the submission's status today. A declined
     submission reinstated with "Revert Decline" leaves "Submissions
     Declined" and its sub-row; an accepted submission declined later
     leaves "Submissions Accepted" and joins "Submissions Declined".
     <sup>f</sup>
7. **The date-range column.** Each row reads its own date against the
   range: a received, in-progress or imported submission its submission
   date; an accepted or declined one the date of that decision; a
   published one its first publication date; the days and rate rows the
   submission date (Rules 9, 10). <sup>f</sup>
   - 7a. Submissions received on the range's last day are left out of
     "Submissions Received", "Imported Submissions" and "Other
     Submissions" ⚠ [A1](#a1), while decisions and publications on that
     day count.
   - 7b. A draft carries the moment it was started as its submission
     date. No range reaches today, so drafts started today read 0 in
     this column under every range, while "Total" counts every draft;
     whether a draft started within the range counts here is open ⚠
     [A3](#a3).
8. **Yearly averages.** In the "Total" column, the six count rows that
   the Fields table marks read "{count} ({average}/year)", as "12
   (4/year)". The average is the number of that row's events in a span
   of calendar years divided by the number of years in the span,
   rounded to a whole number (0.5 shows as 1). The span runs from the
   year after the row's first event to the year of its latest one, or
   to last year when the latest is this year. <sup>g</sup> <sup>td3</sup>
   - 8a. With an empty span no average shows: a row whose activity
     started last year, or whose events all fall in one year before
     this one, as "Submissions Declined (After Review)" reading "1" when
     its one decline was two years ago. A count of 0 shows no average.
   - 8b. A journal whose activity all falls in this year shows
     "(0/year)" after every count above 0, as "3 (0/year)" ⚠ [A2](#a2).
   - 8c. The filters apply to the average; the date range does not.
9. **Rates.** In "Total", "Acceptance Rate" is the accepted submissions
   as a share of the submissions received, "Rejection Rate" the declined
   ones, and its sub-rows the desk and after-review ones. In the middle
   column the share is taken over the submissions received in the range
   that have been accepted or declined, as the icon's text explains
   (Fields). With nothing to divide by the rate reads "0%". Since the
   range's last day is left out of "Submissions Received" (Rule 7a), a
   range ending on the day its submissions arrived reads "0%" for every
   rate, although it counts their declines [A1](#a1). <sup>h</sup>
   <sup>td3</sup>
10. **Days to a decision.** "Days to First Editorial Decision" is the
    number of days within which 80% of the submissions got their first
    decision of any kind; "Days to Accept" and "Days to Reject" the same
    for the first accepting and the first declining decision. Only
    submissions that have such a decision count; the middle column takes
    those received in the range. With none, the row reads 0. <sup>h</sup>
    <sup>td3</sup>
11. **The information icons.** The icon after "Other Submissions", "Days
    to First Editorial Decision", "Acceptance Rate" and "Rejection Rate"
    shows its text (Fields) while the mouse pointer rests on it; the
    keyboard never reaches it ⚠ [A5](#a5). <sup>c</sup> <sup>td4</sup>
12. **Sub-rows.** A sub-row stands indented under its group: its name
    starts a little further right than every other row's ("Days to
    Accept" under "Days to First Editorial Decision"). <sup>c</sup>
    <sup>td5</sup>
13. **The apps' own counting.** A press also counts an Internal Review
    "Accept Submission" as accepted, and its "Days to Reject" counts an
    Internal Review "Decline Submission", but "Submissions Declined"
    leaves that decline out ⚠ [OMP1](#omp1). A preprint server counts
    under "Submissions Declined" every declined preprint, since its one
    stage has one "Decline" [OPS2](#ops2). <sup>f</sup> <sup>td6</sup>

**The Users page**

14. **The counts.** "All Users" counts the accounts holding at least one
    current role in the journal. Each other row counts the accounts
    holding at least one current role of that permission level, as the
    Roles tab of Settings › Users & Roles sets it
    ([Roles configuration](U54-roles-configuration.md#level-boxes)): an
    account with two roles counts once in "All Users" and once in each
    level's row. So "Journal Manager" also counts every Editor and
    Production Editor ⚠ [A7](#a7), "Section Editor" every Guest Editor
    {OJS}, and "Assistant" every assistant-level role. "Site
    Administrator" always reads 0, the site administrator included ⚠
    [A6](#a6). <sup>i</sup> <sup>td7</sup>
15. **Who is left out.** A disabled account and a role that has ended are
    not counted. The page has no date range and no filter: it shows the
    counts of the moment it opens. <sup>i</sup> <sup>td7</sup>
16. **The export window.** "Export" opens "Export to Excel/CSV"
    (Fields). The first time after the page loads, every role's box is
    ticked; after that the window opens with the boxes as last left,
    whether it was closed or used to export, until the page is left or
    reloaded. The arrow (or Escape) closes it and nothing is downloaded.
    Leaving the page with the window open and boxes changed asks
    nothing; coming back, the page shows with the window closed.
    <sup>j</sup> <sup>td8</sup>
17. **Exporting.** "Export" in the window downloads the file (Fields)
    and closes the window. The file lists every account holding a
    current role among the ticked ones, each once, disabled accounts
    left out; its role columns name every role of the journal, ticked or
    not. With every box unticked the window still exports, and the file
    holds the column names alone. <sup>j</sup> <sup>td8</sup>

**The Reports page**

18. **The list.** "Reports" lists one link per report the installation
    offers (Fields). The reports cannot be switched off (their boxes on
    Settings › Website › "Plugins" cannot be pressed,
    [Plugins management](U62-plugins-management.md)), so every journal
    of an installation lists the same links. A preprint server offers no
    report, so its page shows the line and nothing to press ⚠
    [OPS3](#ops3). <sup>k</sup> <sup>td9</sup>
19. **Downloading.** Pressing a report's link downloads its file at once
    (Fields) and the page stays as it was; there is nothing to choose
    first. "COUNTER Reports" {OJS} opens the older COUNTER page instead,
    which [Statistics — usage](U64-usage-statistics.md) describes (its
    Rule 25). A report address naming no report lands on a "404 Not
    Found" page ⚠ [A8](#a8). <sup>k</sup> <sup>td9</sup>
20. **"Articles Report"** {OJS}. One line per submission of the journal,
    drafts included, each read from its
    [current version](#current-version) (Rule 4b). <sup>l</sup>
    <sup>td10</sup>
    - 20a. The author columns repeat for as many authors as the
      submission with the most has; a submission with fewer leaves the
      rest empty.
    - 20b. The editor columns list the Journal Managers, Editors,
      Production Editors, Section Editors and Guest Editors assigned to
      the submission, each with the decisions they recorded on it, oldest
      first. A decision recorded by someone not assigned to the submission
      appears nowhere ⚠ [A12](#a12). A decision the report has no name
      for leaves its cell empty ⚠ [OJS3](#ojs3).
    - 20c. "Status" is the stage's name ("Submission", "Review",
      "Copyediting", "Production") while the submission is in the
      workflow, otherwise "Published", "Declined" or "Scheduled". "URL"
      opens the submission from the Dashboard.
    - 20d. "Supporting Agencies" is always empty ⚠ [OJS1](#ojs1), and a
      title holding "&" reads "&amp;" ⚠ [OJS2](#ojs2).
    - 20e. Cancelling a review round removes the decisions recorded in
      that round, "New Review Round" included, from the file, and the
      cancellation itself is not listed.
21. **"Review Report"** {OJS OMP}. One line per review assignment of
    the journal, ordered by submission title (the lines of one
    submission in no set order). <sup>m</sup> <sup>td11</sup>
    - 21a. "Stage" is the review stage's name ("Review"; on a press
      "Internal Review" or "External Review"). "Reviewer" is the
      reviewer's username. "Declined" and "Cancelled" read "Yes" or
      "No". "Recommendation" is the reviewer's recommendation on a
      journal and empty on a press.
    - 21b. "Consideration" reads "Never" while no editor has opened the
      review, and is empty once an editor has read it without
      confirming; "Considered" once an editor confirms it ("Mark as
      Complete"), "Unconsidered" after "Revert Decision", and
      "Reconsidered" once confirmed again.
    - 21c. "Response Overdue Days" counts the days past the response due
      date of a request nobody answered; "Review Overdue Days" the days
      past the review due date of an accepted review not yet submitted,
      a cancelled one included. The count starts at the end of the due
      day.
    - 21d. "Comments On Submission" holds the reviewer's comments as
      stored, with their paragraph markup ("<p>…</p>"); a reviewer's
      comments from every round are joined with "; " on each of that
      reviewer's lines. For a review form it holds each question
      followed by the answer in web markup ("<blockquote>…</blockquote>",
      "&" written "&amp;").
22. **"Subscriptions Report"** {OJS}. The individual subscriptions
    first, then the institutional ones, each block with its own column
    names (Fields). An individual subscriber without a country is listed
    with an empty "Country". An institutional subscription whose contact
    has no country makes the download fail: no file arrives, the browser
    tab is left blank and no message shows ⚠ [OJS4](#ojs4). <sup>n</sup>
    <sup>td12</sup>
23. **"Monograph Report"** {OMP}. One line per book of the press, drafts
    included, with the "Articles Report" rules for authors, editors,
    decisions and "Status" (Rule 20; "Status" uses the press's stages).
    Its author and decision columns are counted over every press of the
    installation, not this one alone ⚠ [OMP3](#omp3); its editor
    columns follow this press's books. A reverted Internal Review
    decline is named "Decline Submission" ⚠ [OMP4](#omp4). "Categories"
    and "Identifiers" put one entry per line inside their cell.
    <sup>o</sup> <sup>td13</sup>

**The monthly statistics email**

24. <a id="monthly-email"></a>**When and to whom.** On the first day of each month (a timetable no screen shows),
    the installation's routine task "Editorial Report Notification"
    goes through every journal that sends the email (Settings bullet 1)
    and sends each recipient (Actors row 4) the email of Fields, one per
    recipient, covering the previous calendar month from its first day
    to its last.
    No screen starts the task or shows when it runs. <sup>p</sup>
    <sup>td14</sup>
25. **What it says.** The lines "New submissions this month",
    "Declined submissions this month" and "Accepted submissions this
    month" give the previous month's "Submissions Received",
    "Submissions Declined" and "Submissions Accepted" (Rule 6); "Total
    submissions in the system" is "Submissions Received" over all time.
    Unlike "Editorial Activity" over the same month, the email counts
    the submissions received on the month's last day [A1](#a1).
    <sup>p</sup> <sup>td14</sup>
26. **The attachment.** "editorial-report.csv" starts with a byte-order
    mark and holds three blocks separated by empty lines: <sup>p</sup>
    <sup>td14</sup>
    - "Active Submissions", "Total", then one line per stage with its
      count; these counts cover every journal of the installation, not
      this one ⚠ [A9](#a9); on a press whose primary language is French
      the External Review line is named by a raw code ⚠ [OMP5](#omp5);
    - "Trends", "{month}, {year}", "Total", then one line per "Trends"
      row with the month's figure and the all-time figure; rates are
      written as fractions ("0.5") and totals carry no yearly average;
    - "Users", "Total", then the "Users" page's rows (Rule 14).
27. **The Tasks entry.** Each recipient who has not switched the
    notification off (Rule 28) also finds a Tasks panel entry
    reading "This is a kind reminder for you to check your publication's
    health through the editorial report.". Pressing it opens "Editorial
    Activity" and marks it read: the Tasks bell counts one fewer. It
    stays in the panel; every month adds another. <sup>q</sup> <sup>td15</sup>
28. **Opting out.** On Profile › "Notifications", group "Editors", the
    row "Statistics report summary." decides it for that journal:
    "Enable these types of notifications." unticked stops both the
    email and the Tasks entry; "Do not send me an email for these types
    of notifications." ticked stops the email alone. <sup>r</sup>
    <sup>td16</sup>
    - 28a. The email's "Unsubscribe" link opens the Unsubscribe page
      ([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)),
      which lists every email of Profile › "Notifications", "Statistics
      report summary." among them, all ticked. Its "Unsubscribe" ("You
      have been unsubscribed") leaves that row at "Do not send me an
      email for these types of notifications." ticked, so the email
      stops and the Tasks entry keeps coming.

## Side effects

- Opening the pages, choosing a range and choosing filters change
  nothing. Every download is a file the browser saves; nothing is stored
  and nothing is sent. <sup>c</sup> <sup>k</sup>
- The export window stores nothing: which boxes were ticked is not kept
  once the page is left. <sup>j</sup>
- The monthly task sends one email per recipient and journal and adds
  one Tasks entry per recipient (Rules 24, 27); it runs as waiting jobs
  on Administration › "View Jobs" while it works
  ([System administration & jobs](U61-system-administration.md)).
  <sup>p</sup> <sup>q</sup>

## Settings that modify behavior

1. **"Editorial statistics"** (Settings › Workflow › "Emails", group
   "For Editors"; *[Emails management](U56-emails-management.md)*; "Send
   a monthly email to editors."). "Do not send the email to editors.":
   the journal sends no monthly email and makes no Tasks entry
   (Rules 24, 27), and Profile › "Notifications" loses its "Statistics
   report summary." row; switched back on, the row returns. An account
   that saved its Profile › "Notifications" tab meanwhile finds the row
   unticked and gets neither the email nor the Tasks entry ⚠
   [A14](#a14). <sup>r</sup>
2. **"Statistics report summary."** (Profile › "Notifications", group
   "Editors", per account and journal; *[Notifications center & email
   preferences](U05-notifications-center-and-email-preferences.md)*;
   "Enable these types of notifications." ticked, "Do not send me an
   email for these types of notifications." unticked). "Enable…"
   unticked: that account gets neither the email nor the Tasks entry;
   "Do not send me an email…" ticked: the Tasks entry without the email
   (Rule 28). <sup>r</sup>

## Cross-feature interactions

- [Statistics — usage](U64-usage-statistics.md) owns the date range
  control, the "Filters" panel and the "COUNTER Reports" page {OJS};
  this spec owns the presets of "Editorial Activity" and what its
  filters narrow (Rules 3, 4, 19).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the side menu's "Statistics" group and which roles see each
  entry; this spec owns the pages "Editorial Activity", "Users" and
  "Reports" open.
- [Plugins management](U62-plugins-management.md#plugin-links) owns the
  "Report Plugins" list and each report's "Reports" link; the file that
  link downloads is Rules 20–23's.
- [Emails management](U56-emails-management.md) owns the "Editorial
  statistics" choice and the "Statistics Report Notification" email's
  editable text; this spec owns when the email is sent, to whom and
  with which figures (Rules 24–26).
- [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)
  owns Profile › "Notifications", the Unsubscribe page, the email
  footer and the Tasks panel; this spec owns the email and the entry
  the monthly task raises (Rules 27, 28).
- [Submissions dashboard (editorial)](U23-submissions-dashboard.md) owns
  the other monthly email to editors, the one behind the Profile row
  "Weekly email of outstanding tasks".
- [System administration & jobs](U61-system-administration.md) owns the
  routine tasks' timetable and the Jobs pages.
- [Users management](U53-users-management.md) and
  [Roles configuration](U54-roles-configuration.md) own the accounts,
  roles and permission levels "Users" counts; this spec owns the
  counting (Rules 14, 15).
- [Editorial decision recording](U34-editorial-decision-recording.md),
  [Internal Review stage](U71-internal-review-stage.md) and
  [Publish, schedule & versions](U49-publish-schedule-and-versions.md)
  own the decisions and publishing that "Trends" counts;
  [Import & export](U63-import-export.md) owns the imports that Rule 6a
  sets apart; [Subscriptions](U51-subscriptions.md) owns the
  subscriptions "Subscriptions Report" lists.

## Canonical scenarios

Scenario 1 also signs in with the seeded journal's Journal Manager;
every scenario runs on scratch journals with throwaway accounts and
seeded submissions, since the seeded journal's figures change with every
other suite's run. <sup>sc</sup>

1. **Roles kept off the editorial statistics pages**

   Given: a scratch journal with no submission and the throwaway
   accounts of its Journal Manager, an Author, a Reviewer (on a journal
   and a press), a Reader, a Copyeditor (an Editorial Board Member on a
   preprint server), a Subscription Manager {OJS} and a Reader whose
   role has ended, beside the seeded journal's Journal Manager, who holds
   no role in the scratch journal, and the addresses of "Editorial
   Activity", "Users" and "Reports" as the scratch journal's Journal
   Manager's browser shows them.

   - **Author, Reviewer, Reader, Copyeditor and Subscription Manager
     {OJS}**: each, signed in, opens the three addresses and lands on
     the access-denied page, "The current role does not have access to
     this operation." (Actors rows 1, 3).
   - **The Reader whose role ended and the seeded journal's Journal
     Manager**: each, signed in, opens the addresses of "Editorial
     Activity" and "Users": the same access-denied page (Actors row 1).
   - **Signed out**: open each of the three addresses in a browser where
     nobody is signed in: the Login page shows (Actors rows 1, 3).
   - **Control**: the scratch journal's Journal Manager opens the three
     addresses: each page opens. "Editorial Activity" draws no ring and
     its chart's total and every stage's number read 0 {OJS OMP}
     (Fields; Rule 2), and "Reports" shows its heading "Reports". <sup>sc</sup>

2. **Counting and exporting the journal's users**

   Given: Journal Manager and a Section Editor of a scratch journal
   whose other accounts are Nova, an Author who is also a Reader; Otto,
   an Author; Cora, a Copyeditor (an Editorial Board Member on a
   preprint server); Pia, an Author whose account is disabled; and
   Quinn, a Reader whose role has ended.

   - **"Users"**: open Statistics › "Users": the browser tab reads "User
     Statistics", the heading "Registered users" has "Export" at its
     right, and the table's columns are "Name" and "Total". Its rows
     read, in this order: "All Users" 6 (the Journal Manager, the
     Section Editor, Nova, Otto, Cora and the Site Administrator, who
     holds a Journal Manager role in the journal); "Site Administrator"
     [A6](#a6); "Journal Manager" 2 ("Press Manager", "Manager"; the
     Journal Manager and the Site Administrator); "Section Editor" 1;
     "Assistant" 1; "Author" 2; "Reviewer" 0; "Reader" 1; "Subscription
     Manager" 0 {OJS}. Pia and Quinn are counted nowhere (Rules 14, 15;
     Fields).
   - **The export window**: press "Export": the window "Export to
     Excel/CSV" slides in from the right, reading "User Group", then
     "Select the users to be exported to an Excel/CSV file.", then one
     box per role of the journal, every one ticked, then "Export"
     (Rule 16; Fields).
   - **Every role exported**: press the window's "Export": the window
     closes and "user-report-{today's date as YYYY-MM-DD}.csv"
     downloads. The file starts with a byte-order mark, then the column
     names "ID", "Given Name", "Family Name", "Email address" ("Email"
     on some installs; Fields), "Phone", "Country", "Mailing Address",
     "Date registered", "Updated" and one per role of the journal,
     named as the window's boxes, then one line
     each for the Journal Manager, the Section Editor, Nova, Otto, Cora
     and the Site Administrator, and none for Pia or Quinn. Nova's line
     reads "Yes" under "Author" and "Reader" and "No" under every other
     role, its "Date registered" a date and a time as "2026-09-28
     05:27:26", and its "Phone", "Country" and "Mailing Address" empty
     (Rule 17; Fields).
   - **One role exported**: press "Export" again: every box is still
     ticked. Untick every box but "Author" and press "Export": the file
     lists Nova and Otto alone, and its role columns still name every
     role of the journal (Rules 16, 17).
   - **No role exported**: press "Export" again: "Author" alone is
     ticked, as last left. Untick it and press "Export": the window
     accepts it and the file holds the line of column names alone
     (Rules 16, 17).
   - **Section Editor**: the Section Editor, signed in, opens
     Statistics › "Users": the same rows with the same counts (Actors
     paragraph).
   - **Control**: as the Journal Manager, reload "Users" and press
     "Export": every box is ticked again (Rule 16). <sup>sc</sup>

3. **The monthly statistics email**

   Given: the throwaway accounts of a scratch journal (Maya, its
   Journal Manager; Sol, a Section Editor; Tess, a Section Editor with
   "Do not send me an email for these types of notifications." ticked
   for "Statistics report summary."; Uma, a Section Editor with "Enable
   these types of notifications." unticked for it; Vic, a Journal
   Manager whose account is disabled; and Wes, an Author) and its
   submissions "Axolotl" and "Bison", received on the 10th of the
   previous month and left at the Submission stage, "Caribou" {OJS
   OMP}, received on the 12th, sent to review and accepted, "Egret",
   received on the 15th and declined at the Submission stage (declined,
   on a preprint server), and "Kea", received today, after a run of the
   routine task "Editorial Report Notification" for the journal.

   - **Maya's and Sol's email**: each gets one email, whose subject
     reads "Editorial activity for {month}, {year}" ("Preprint Server
     activity for {month}, {year}" on a preprint server), {month} being
     the previous month's name and {year} its year, as "August, 2026".
     It opens with the recipient's name, then "Your journal health
     report for {month}, {year} is now available. Your key stats for
     this month are below." ("Your press health report…", "Your
     preprint health report…"), then reads "New submissions this month: 4" (3 on a preprint
     server), "Declined submissions this month: 1", "Accepted
     submissions this month: 1" {OJS OMP} ([OPS4](#ops4) on a preprint
     server) and "Total submissions in the system: 5" (4). A journal's
     closes "Login to the journal to view more detailed editorial trends
     and published article stats. A full copy of this month's editorial
     trends is attached." ([A11](#a11) on a press and a preprint server),
     then "Sincerely," and the journal's signature, then the unsubscribe
     footer (Rules 24, 25; Fields).
   - **The link**: in Sol's email press "editorial trends" ("trends" on
     a preprint server): "Editorial Activity" opens (Fields).
   - **The attachment**: the email carries "editorial-report.csv": a
     byte-order mark, then three blocks separated by empty lines:
     "Active Submissions" [A9](#a9); "Trends", "{month}, {year}",
     "Total", with the "Submissions Received" line giving 4 for the month and 5
     in total (3 and 4 on a preprint server) and the "Acceptance Rate"
     line 0.5 and 0.2 {OJS OMP}, no total followed by a yearly average;
     "Users", "Total", with "All Users" 6 (Rule 26).
   - **Sol's Tasks entry**: Sol, signed in, opens the Tasks panel: it
     lists "This is a kind reminder for you to check your publication's
     health through the editorial report.". Press it: "Editorial
     Activity" opens, the Tasks bell counts one fewer, and the entry
     stays listed (Rule 27).
   - **Tess, Uma and Vic**: Tess gets no email, and her Tasks panel
     lists the entry; Uma gets neither the email nor the entry; Vic gets
     no email (Actors row 4; Rule 28; Settings
     bullet 2).
   - **Sol's "Unsubscribe"**: in Sol's email press "Unsubscribe": the
     Unsubscribe page lists every email of Profile › "Notifications",
     "Statistics report summary." among them, each ticked. Press
     "Unsubscribe": "You have been unsubscribed". On Sol's Profile ›
     "Notifications", the row "Statistics report summary." now has "Do
     not send me an email for these types of notifications." ticked
     (Rule 28a).
   - **A second run**: after the task runs for the journal again, Maya
     gets a second email and Sol none; Sol's Tasks panel lists two
     entries and the Tasks bell counts one more (Rules 27, 28a).
   - **Control**: Wes gets neither the email nor the Tasks entry after
     either run (Actors row 4). <sup>sc</sup>

4. **A journal that sends no monthly email**

   Given: Journal Manager, a Section Editor and an Author of a scratch
   journal whose "Editorial statistics" is at "Do not send the email to
   editors.", holding one submission received on the 10th of the
   previous month.

   - **The Section Editor's Profile**: on Profile › "Notifications",
     the group "Editors" has no row "Statistics report summary.". Leave
     the tab without saving [A14](#a14) (Settings bullet 1).
   - **A run while off**: after a run of the routine task "Editorial
     Report Notification" for the journal, neither the Journal Manager
     nor the Section Editor gets an email, and the Section Editor's
     Tasks panel lists no statistics entry (Rules 24, 27; Settings
     bullet 1).
   - **Switched back on**: the Journal Manager, on Settings › Workflow ›
     "Emails", group "For Editors", chooses "Send a monthly email to
     editors." under "Editorial statistics" and presses "Save"
     ([Emails management](U56-emails-management.md)).
   - **The row returns**: the Section Editor's Profile › "Notifications"
     lists "Statistics report summary." under "Editors" again, with
     "Enable these types of notifications." ticked and "Do not send me
     an email for these types of notifications." unticked (Settings
     bullets 1, 2).
   - **A run while on**: after the task runs again, the Journal Manager
     and the Section Editor each get the email "Editorial activity for
     {month}, {year}" ({month} the previous month's name, {year} its
     year; "Preprint Server activity…" on a preprint server), reading
     "New submissions this month: 1", and the Section Editor's Tasks
     panel lists "This is a kind reminder for you
     to check your publication's health through the editorial report."
     (Rules 24, 25, 27).
   - **Control**: the Author gets no email from either run (Actors
     row 4). <sup>sc</sup>

5. **Yearly averages in "Total"**

   Given: Journal Manager of a scratch journal holding six submissions:
   "Alpha", received on 1 March three years ago; "Beta" and "Gamma",
   received on 1 March two years ago, "Gamma" sent to review and
   declined there the same day (declined, on a preprint server);
   "Delta" and "Epsilon", received on 1 March last year; and "Zeta",
   received today; all but "Gamma" left at the Submission stage.

   - **"Total"**: open Statistics › "Editorial Activity": "Total" reads
     "Submissions Received" "6 (2/year)", the four received in the two
     full years before this one divided by two; "Submissions Declined"
     "1" and "Submissions Declined (After Review)" "1" {OJS OMP}, with
     no average, their one decline falling in a single year before this
     one; "Submissions Accepted" {OJS OMP}, "Submissions Declined (Desk
     Reject)" {OJS OMP} and "Submissions Published" "0", with no average
     (Rules 8, 8a).
   - **"Last two years"**: choose it in the date range: the middle
     column is headed "{two years ago}-01-01 — {last year}-12-31" and
     reads "Submissions Received" 4 and "Submissions Declined" 1, while
     "Total" still reads "6 (2/year)" (Rules 3, 7, 8c).
   - **"Last year"**: choose it: "Submissions Received" 2 and
     "Submissions Declined" 0 in the middle column, "Total" unchanged
     (Rules 3, 7).
   - **Control**: choose "Year to date": "Submissions Received" reads 0
     in the middle column, since the range ends yesterday and "Zeta"
     arrived today (Rules 3, 7). <sup>sc</sup>

6. **Reading "Editorial Activity"** {OJS OMP}

   Given: Journal Manager and a Section Editor assigned to no
   submission, of a scratch journal with the sections "Articles" and
   "Reviews" {OJS}, holding twelve submissions, each decision recorded
   on the day the submission was received and each submission in the
   section "Articles" unless "Reviews" is named: four received on 15
   March of last year and left at the Submission stage; "Bison", received on
   20 April of last year and sent to review; "Caribou", received on 10
   May of last year, sent to review and accepted; "Dingo", received on
   5 June of last year, sent to review, accepted and sent to
   production; "Egret" ("Reviews" {OJS}), received on 12 July of last
   year and declined at the Submission stage; "Ferret", received on 8
   August of last year, sent to review and declined there; "Gecko"
   ("Reviews" {OJS}), received on 3 September of last year, sent to
   review, accepted, sent to production and published that day;
   "Heron", received on 20 September of last year but published on 1 February
   of last year, so it appears to have been imported; and "Ibis", a
   draft started today.

   - **On arrival**: open Statistics › "Editorial Activity": the chart
     reads 7 over "Active Submissions", with "Submission" 4, "Review" 1,
     "Copyediting" 1 and "Production" 1 (on a press "Submission" 4,
     "Internal Review" 0, "External Review" 1, "Copyediting" 1,
     "Production" 1). Under "Trends" the columns are "Name", "{the day
     91 days ago} — {yesterday}" and "Total", and the rows are the
     sixteen of Fields in their order. "Total" reads "Submissions
     Received" 10, "Submissions Accepted" 3, "Submissions Declined" 2,
     "Submissions Declined (Desk Reject)" 1, "Submissions Declined
     (After Review)" 1, "Submissions Published" 1, "Other Submissions"
     2, "Submissions In Progress" 1, "Imported Submissions" 1, the three
     days rows 0, "Acceptance Rate" "30%", "Rejection Rate" "20%", "Desk
     Reject Rate" "10%" and "After Review Reject Rate" "10%", no count
     followed by a yearly average. The middle column reads 0 or "0%" on
     every row (Rules 1–3, 6, 6a, 7b, 8a, 9, 10) [A3](#a3).
   - **The presets**: open the date range: it offers "Last 90 days",
     "Year to date", "Last year", "Last two years" and "Custom Range",
     and no "All dates" (Rule 3).
   - **"Last year"**: choose it: the middle column is headed "{last
     year}-01-01 — {last year}-12-31" and reads "Submissions Received"
     10, "Submissions Accepted" 3, "Submissions Declined" 2, "(Desk
     Reject)" 1, "(After Review)" 1, "Submissions Published" 1, "Other
     Submissions" 1, "Submissions In Progress" 0, "Imported Submissions"
     1, "Acceptance Rate" "60%", "Rejection Rate" "40%", "Desk Reject
     Rate" "20%" and "After Review Reject Rate" "20%"; "Total" keeps its
     figures and the chart still reads 7 (Rules 2, 3, 7, 7b, 9).
   - **A Custom Range**: set "Custom Range" from 1 June to 30 September
     of last year, typed as YYYY-MM-DD: the middle column is headed
     "{last year}-06-01 — {last year}-09-30" and reads "Submissions
     Received" 4, "Submissions Accepted" 2, "Submissions Declined" 2,
     "(Desk Reject)" 1, "(After Review)" 1, "Submissions Published" 1,
     "Other Submissions" 1, "Imported Submissions" 1, "Acceptance Rate"
     "50%", "Rejection Rate" "50%", "Desk Reject Rate" "25%" and "After
     Review Reject Rate" "25%"; the chart still reads 7 (Rules 2, 3, 7,
     9).
   - **Filters** {OJS}: press "Filters": the panel lists "Articles" and
     "Reviews" under "Sections". Choose "Reviews": both columns read
     "Submissions Received" 2, "Submissions Accepted" 1, "Submissions
     Declined" 1 and "Submissions Published" 1, and the chart still
     reads 7. Press "Filters" again: the panel closes and the Custom
     Range figures of the bullet above return (Rules 4, 4a–4c).
   - **Sub-rows**: the names of "Submissions Declined (Desk Reject)",
     "Submissions Declined (After Review)", "Submissions In Progress",
     "Imported Submissions", "Days to Accept", "Days to Reject", "Desk
     Reject Rate" and "After Review Reject Rate" start a little further
     right than every other row's name (Rule 12).
   - **Information icons**: rest the mouse pointer on the icon after
     "Other Submissions": "This includes submissions that are not
     counted in other totals, such as those that are still in progress
     and those that appear to have been imported." shows. The icon after
     "Acceptance Rate" shows "The percentage for the selected date range
     is calculated for submissions that were submitted during this date
     range and have received a final decision. …", and the one after
     "Days to First Editorial Decision" "The number of days it takes for
     most submissions to receive the first editorial decision, such as
     desk rejection or send for review. …" ([OMP2](#omp2) on a press)
     (Rule 11) [A5](#a5).
   - **Section Editor**: the Section Editor, signed in, opens Statistics
     › "Editorial Activity": the same chart and the same "Total" figures
     as on arrival (Actors paragraph).
   - **"Revert Decline"**: the Journal Manager records "Revert Decline"
     on "Egret" ([Editorial decision recording](U34-editorial-decision-recording.md))
     and opens "Editorial Activity" again: "Total" reads "Submissions
     Declined" 1 and "Submissions Declined (Desk Reject)" 0, and the
     chart reads 8 over "Active Submissions" (Rules 2, 6b).
   - **Control**: "Submissions Received" still reads 10 in "Total"
     (Rule 6). <sup>sc</sup>

   On a preprint server the page is scenario 9's.

7. **Downloading the reports** {OJS OMP}

   Given: Journal Manager of a scratch journal with the initials "J-PK"
   and the reviewers Rhea and Saul, holding "Delta notes", sent to
   review with Rhea's request left unanswered; "Marsh survey", whose
   second author, Greta Braun, is from Germany, assigned to the Site
   Administrator as its Journal Manager, who sent it to review and
   accepted it, after Rhea submitted her review with the comments
   "Clear and well argued." and Saul declined his request; and "Kelp
   draft", a draft.

   - **"Reports"**: open Statistics › "Reports": the heading "Reports",
     the line "The system generates reports that track the details
     associated with site usage and submissions over a given period of
     time. Reports are generated in CSV format which requires a
     spreadsheet application to view.", then the links "COUNTER
     Reports", "Review Report", "Articles Report" and "Subscriptions
     Report" (on a press "Monograph Report" and "Review Report"), in
     whatever order the installation lists them (Rule 18; Fields).
   - **"Articles Report"** ("Monograph Report" on a press): press it:
     "articles-JPK-{today's date as YYYYMMDD}.csv"
     ("monographs-JPK-{today's date as YYYYMMDD}.csv") downloads at once
     and the page stays as it was. The file starts with a byte-order
     mark, then the column names of Fields, the author columns running
     to "(Author 2)", or further on a press [OMP3](#omp3), then three
     lines, one per submission, "Kelp draft" among them (Rules 19, 20,
     23; Fields).
   - **"Marsh survey"'s line**: "Given Name (Author 2)" reads "Greta",
     "Family Name (Author 2)" "Braun" and "Country (Author 2)" "DE"
     {OJS}; "Status" reads "Copyediting"; the Site Administrator's names
     stand under "Given Name (Editor 1)" and "Family Name (Editor 1)",
     followed by its two decisions, oldest first, each with its date
     under "Date decided 1  (Editor 1)" and "Date decided 2  (Editor 1)"
     (with one space before "(Editor 1)" on a press); on a journal its
     "URL" opens "Marsh survey" (Rules 20a–20c, 23).
   - **"Delta notes"'s line**: "Status" reads "Review" ("External
     Review" on a press), and its "(Author 2)" cells are empty (Rules
     20a, 20c, 23).
   - **"Review Report"**: press it: "reviews-{today's date as
     YYYYMMDD}.csv" downloads at once. The file starts with a byte-order
     mark, then the column names of Fields, then three lines: "Delta
     notes"'s first, then "Marsh survey"'s two in either order. Each
     reads "Stage" "Review" ("External Review" on a press). Rhea's line
     for "Marsh survey" reads her username under "Reviewer", "Declined"
     "No", "Cancelled" "No", "Consideration" "Never" and "Comments On
     Submission" "<p>Clear and well argued.</p>", with an empty
     "Recommendation" on a press; Saul's reads "Declined" "Yes"; Rhea's
     line for "Delta notes" reads "Declined" "No" (Rules 21, 21a, 21b,
     21d).
   - **The Plugins tab**: on Settings › Website › "Plugins", under
     "Report Plugins", every report's box is ticked and cannot be
     pressed. Press the "Reports" link on the review report's row: the
     same "reviews-{today's date as YYYYMMDD}.csv" downloads at once
     (Actors row 3; Rule 18).
   - **Control**: "Kelp draft", which has no review request, has no line
     in "Review Report" (Rule 21). <sup>sc</sup>

   A preprint server offers no report: scenario 9.

8. **"Subscriptions Report"** {OJS}

   Given: Journal Manager of a scratch journal with an individual
   subscription for Nell, who has no country on her profile, and an
   institutional subscription for "Okapi Institute", whose contact, Pat,
   has "Canada" as country (without a country the download fails
   [OJS4](#ojs4)).

   - **The file**: open Statistics › "Reports" and press "Subscriptions
     Report": "subscriptions-{today's date as YYYYMMDD}.csv" downloads
     at once. It starts with a byte-order mark, then the line
     "Individual Subscriptions", then the individual column names of
     Fields, then Nell's line, with her email address under "Email
     address" ("Email" on some installs; Fields) and an empty
     "Country"; then an empty line, the line "Institutional
     Subscriptions", the institutional column names of
     Fields, and the line of "Okapi Institute", reading "Okapi
     Institute" under "Institution Name" and "Canada" under "Country"
     (Rule 22; Fields).
   - **Control**: the "Reports" page stays as it was after the download
     (Rule 19). <sup>sc</sup>

   A press and a preprint server have no "Subscriptions Report" (Fields).

9. **A preprint server's editorial statistics** {OPS}

   Given: Journal Manager of a scratch preprint server holding six
   preprints: "Axolotl" and "Bison", received on 15 March of last year
   and not yet decided; "Egret", received on 12 July of last year and
   declined; "Gecko", received on 3 September of last year and posted
   the same day; "Heron", received on 20 September of last year but
   posted on 1 February of last year, so it appears to have been
   imported; and "Ibis", a draft started today.

   - **"Editorial Activity"**: open Statistics › "Editorial Activity":
     no chart shows [OPS1](#ops1). "Trends" has four rows, in this
     order: "Submissions Received", "Submissions Declined", "Submissions
     Published" and "Other Submissions" [OPS2](#ops2). "Total" reads 4,
     1, 1 and 2, no count followed by a yearly average; the middle
     column reads 0 on every row (Rules 2, 6, 6a, 7b, 8a, 13).
   - **"Last year"**: choose it in the date range: the middle column
     reads 4, 1, 1 and 1 (Rules 3, 7).
   - **"Reports"**: open Statistics › "Reports": the heading "Reports"
     and the line "The system generates reports that track the details
     associated with site usage and submissions over a given period of
     time. Reports are generated in CSV format which requires a
     spreadsheet application to view.", and no link after it
     [OPS3](#ops3). On Settings › Website › "Plugins", "Report Plugins"
     reads "No Items" (Rule 18).
   - **Control**: the side menu's "Statistics" group offers "Reports",
     which opened the page above (Actors row 3). <sup>sc</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the "Subscriptions Report" download with an institutional subscription whose contact has no country: the file arrives, that row's "Country" empty (the guard for OJS4, once fixed; Rule 22)
  - a book declined at Internal Review on a press: "Submissions Declined", "Submissions Declined (After Review)" and both rejection rates count it (the guard for OMP1, once fixed; Rule 13)
  - a context whose every count is dated this year: the "Total" column of "Editorial Activity" holds no "/year" (the guard for A2, once fixed; Rule 8b)
  - Statistics › "Users" of a journal: no "Site Administrator" row (the guard for A6, once fixed; Rule 14)
  - a report address with an unknown, empty or missing report name: lands on the "Reports" page (the guard for A8, once fixed; Rule 19)
  - a Custom Range ending on the day submissions arrived: "Submissions Received" counts them and the rates are not "0%" (the guard for A1, once fixed; Rules 7a, 9)
  - an editor who saved Profile › "Notifications" while the monthly email was off, and one who saved the site-level profile: each keeps the statistics row as before and gets the email (the guard for A14, once fixed; Settings bullet 1)
  - "Articles Report" of a submission with supporting agencies: its "Supporting Agencies" cell lists them (the guard for OJS1, once fixed; Rule 20d)
  - "Articles Report" of a submission whose title holds "&", an apostrophe and an italic word: the "Title" cell reads as typed (the guard for OJS2, once fixed; Rule 20d)
  - "Articles Report" after "Accept and Skip Review", "Revert Decline", "New Review Round", a move back a stage and a publication: every "Editor Decision" cell named (the guard for OJS3, once fixed; Rule 20b)
- **Nothing new to test**:
  - a published item whose newer version moves it to another section,
    counted under its old section in "Filters" and "Articles Report"
    until the new version is published (Rules 4b, 20)
  - "Cancel Review Round" removing that round's decisions from
    "Articles Report" and "Monograph Report" (Rule 20e)
  - the press's "Series" and the preprint server's "Sections" filters
    (Rule 4a)
  - an inactive section or series listed in "Filters" (Rule 4a)
  - a cancelled review still counting "Review Overdue Days" (Rule 21c)
  - the export window closed by its arrow or by Escape (Rule 16)
  - leaving "Users" with the export window open and boxes changed
    (Rule 16)
  - the Editor, Production Editor and Site Administrator on "Editorial
    Activity", "Users" and "Reports", the Guest Editor {OJS} on the
    first two, each seeing the Journal Manager's figures (Actors
    paragraph, rows 1, 3)
- **Register carries it**:
  - A1 (submissions received on the range's last day, and the rates of
    such a range; Rules 7a, 9, 25)
  - A2 ("(0/year)" on a journal whose activity is all this year;
    Rule 8b)
  - A3 (drafts started within the range, in the date-range column;
    Rule 7b; scenario 6 marks it)
  - A4 (the closed "Filters" panel read out by a screen reader;
    Rule 4c)
  - A5 (the information icons from the keyboard; Rule 11; scenario 6
    marks it)
  - A6 ("Site Administrator" reading 0; Rule 14; scenario 2 marks it)
  - A7 ("Journal Manager" counting the Editors and Production Editors;
    Rule 14)
  - A8 (a report address naming no report; Rule 19)
  - A9 (the attachment's installation-wide stage counts; Rule 26;
    scenario 3 marks it)
  - A10, A13 and OMP5 (a journal, press or preprint server whose
    primary language is French; Fields; Rule 26)
  - A11 ("Login to the the press"; Fields; scenario 3 marks it)
  - A12 (a decision recorded by an editor not assigned to the
    submission; Rule 20b)
  - A14 (an account that saved Profile › "Notifications" while the
    email was off; Settings bullet 1; scenario 4 marks it)
  - OJS1 and OJS2 ("Supporting Agencies" and "&amp;" in "Articles
    Report"; Rule 20d)
  - OJS3 (the decisions "Articles Report" has no name for; Rule 20b)
  - OJS4 (an institutional subscription whose contact has no country;
    Rule 22; scenario 8 marks it)
  - OMP1 (an Internal Review decline; Rule 13)
  - OMP2 ("your journal" in the press's icon text; Fields; scenario 6
    marks it)
  - OMP3 and OMP4 ("Monograph Report" columns sized by other presses,
    and the reverted Internal Review decline; Rule 23; scenario 7 marks
    OMP3)
  - OPS4 (the preprint server's blank "Accepted submissions this
    month:"; Fields; scenario 3 marks it)
- **Owned by another feature**:
  - "COUNTER Reports" {OJS} opening its page (Rule 19;
    *[Statistics — usage](U64-usage-statistics.md)*, scenario 12)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed
unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | "Editorial Activity" leaves submissions received on the date range's last day out of "Submissions Received" | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | Editorial Activity shows "(0/year)" after each total that has nothing dated before this calendar year | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A5](#a5) | The "Trends" information icons cannot be read from the keyboard | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | Statistics › "Users" lists a "Site Administrator" row that always reads 0 | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A8](#a8) | A report address with an unknown or missing report name lands on "404 Not Found", not on "Reports" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A9](#a9) | Monthly editorial email's attachment counts every journal's active submissions, not the journal's own | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A11](#a11) | A press's monthly statistics email reads "Login to the the press" ("the the preprint server" on a preprint server) | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A14](#a14) | Saving Profile › "Notifications" while it hides the statistics row stops that editor's monthly statistics email | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS1](#ojs1) | "Articles Report" leaves "Supporting Agencies" empty for every submission, though the agencies are filled in | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS2](#ojs2) | "Articles Report" writes article titles holding "&", an apostrophe or italics with web codes ("&amp;") | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS3](#ojs3) | "Articles Report" leaves "Editor Decision" empty for skipped reviews, new rounds, reverted declines and stage moves | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS4](#ojs4) | "Subscriptions Report" downloads nothing and leaves a blank tab when an institutional contact has no country | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [OMP1](#omp1) | A press's Editorial Activity leaves books declined at Internal Review out of "Submissions Declined" | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OMP2](#omp2) | A press's "Days to First Editorial Decision" help text says "authors submitting to your journal" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP3](#omp3) | "Monograph Report" sizes its author and decision columns by every press of the installation | 🐞 | minor | — |
| [OMP4](#omp4) | "Monograph Report" names a reverted Internal Review decline "Decline Submission" | 🐞 | minor | — |
| [OMP5](#omp5) | A French press's monthly attachment names External Review by a raw code | 🐞 | minor | — |
| [OPS4](#ops4) | The preprint server's monthly email leaves "Accepted submissions this month:" blank | 🐞 | minor | — |
| [A3](#a3) | Whether drafts started within the range count in "Submissions In Progress" is unseen; drafts started today never do | ❓ | minor | — |
| [A4](#a4) | The closed "Filters" panel is still read out by a screen reader | ❓ | minor | — |
| [A7](#a7) | "Journal Manager" on "Users" also counts Editors and Production Editors | ❓ | minor | — |
| [A10](#a10) | A French journal's monthly email links to the English pages | ❓ | minor | — |
| [A12](#a12) | "Articles Report" and "Monograph Report" leave out decisions by editors not assigned to the submission | ❓ | minor | — |
| [A13](#a13) | A French press's or preprint server's monthly email is in English but for the month and the footer | ❓ | minor | — |
| [OPS3](#ops3) | A preprint server's "Reports" offers no report | ❓ | minor | — |
| [OPS1](#ops1) | A preprint server's "Editorial Activity" has no active submissions chart | ✅ | minor | — |
| [OPS2](#ops2) | A preprint server's "Trends" has four rows, "Submissions Declined" counting every declined preprint | ✅ | minor | — |

### All apps

<a id="a1"></a>
**A1 — "Editorial Activity" leaves submissions received on the date range's last day out of "Submissions Received"** · 🐞 · medium.
On Statistics › "Editorial Activity", the date-range column leaves out
every submission received on the range's last day: "Submissions
Received", "Imported Submissions" and "Other Submissions" do not count
them, while the decisions and publications of that same day are counted.
"Last 90 days" and "Year to date" end yesterday, so they always miss
yesterday's submissions; "Last year" misses 31 December, and a Custom
Range for a month misses its last day.

Nothing on the page says a day is missing. When every submission in a
range arrived on its last day (a one-day range, for example), the page
reads "Submissions Received" 0 and every rate "0%", yet still counts the
declines of those same submissions. The monthly editorial email counts
the last day, so its "New submissions this month" and a Custom Range
over the same month disagree. The fix is a few lines in one shared pkp-
lib class and one line in the monthly email's task. Expected: every row
counts the range's last day.
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Editorial Activity shows "(0/year)" after each total that has nothing dated before this calendar year** · 🐞 · low.
In the "Total" column of Statistics › "Editorial Activity", a count
reads "{count} (0/year)", as "20 (0/year)", when nothing it counts is
dated before 1 January of the current year. Each row goes by its own
dates: the submission dates for "Submissions Received", the decision
dates for the accepted and declined rows, the first publication dates
for "Submissions Published". The count should stand alone, as it does
when the earliest of those dates is last year, since there is no full
calendar year to average over yet.

A new journal, press or preprint server shows it on every count from its
first submission to the end of that year. An older one shows it on a row
whose first item came this year, such as its first desk reject.
Expected: no yearly average until a full calendar year exists.
Basis: probe, 2026-10-02. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Drafts started within the range, in "Submissions In Progress"** · ❓ · minor.
A draft carries the moment it was started as its submission date, but
no range reaches today, so drafts started today read 0 in the middle
column of "Submissions In Progress" under every range, while "Total"
counts them. Whether a draft started on an earlier day counts in a
range around that day has not been seen, as a test install holds no
draft started before today.
Question: does the middle column count the drafts started within the
range? Lean: yes, by the day the draft was started, with one started on
the range's last day left out as in [A1](#a1); a draft started before
yesterday and a Custom Range around that day settle it.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The closed "Filters" panel is still read out** · ❓ · minor.
While "Filters" is closed, its heading ("Sections", "Series") and one
button per section or series are still read out by a screen reader,
although nothing of the panel shows on screen; a pointer press where
they sit lands on the table, and Tab does not reach them. What a screen
reader user's press on one of them does has not been seen. The same
panel on the reader-statistics pages is
[Statistics — usage](U64-usage-statistics.md)'s.
Question: should the closed panel be hidden from screen readers too?
Lean: yes, a defect: a listener hears filters the page does not offer.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The "Trends" information icons cannot be read from the keyboard** · 🐞 · low.
The four icons explaining "Other Submissions", "Days to First Editorial
Decision", "Acceptance Rate" and "Rejection Rate" show their text only
while the mouse pointer rests on them; Tab skips them, and a screen
reader is offered the icon's name and not its text. One fault of the
shared icon, on every page and form field that has one: the same
icons on the reader-statistics pages are
[Statistics — usage](U64-usage-statistics.md)'s
[A7](U64-usage-statistics.md#a7). Expected: the text
can be reached from the keyboard.
Basis: probe, 2026-10-02. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Statistics › "Users" lists a "Site Administrator" row that always reads 0** · 🐞 · low.
A journal's Statistics › "Users" page lists a "Site Administrator" row
under "All Users", and it reads 0 on every journal, even when the site
administrator holds a role in that journal and is the one reading the
page. Site administration is a role of the whole site, not of a journal,
so the page has nothing to count there. Every other row is right.

The same 0 row appears in the "Users" block of the monthly editorial
email's attachment, which goes to the journal's managers and section
editors (on by default). The fix leaves the row out of a journal's
overview, which the page, the monthly email and the statistics API
share. Expected: the row is not listed.
Basis: probe, 2026-10-02. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — "Journal Manager" also counts Editors** · ❓ · minor.
"Users" counts by permission level but names each level by one role, so
"Journal Manager" includes every Editor and Production Editor, and
"Section Editor" every Guest Editor {OJS}. A journal with one Journal
Manager and two Editors reads "Journal Manager 3", or 4 where the site
administrator holds a Journal Manager role too, as on the test
installs.
Question: should the rows count each role, or name the level they
count? Lean: name the level ("Manager", as a preprint server already
does), since the counts themselves are useful.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A report address with an unknown or missing report name lands on "404 Not Found", not on "Reports"** · 🐞 · low.
A manager or editor who opens a report's download address with a report
name the install does not have, such as `…/publicknowledge/en/stats/repo
rts/report?pluginName=reviewreportplugin` (the right name in lower
case), lands on a bare "404 Not Found" page at
`…/publicknowledge/en/stats/stats/reports`. The same happens when the
name is empty or left out.

The doubled "stats/stats" is the bug. The app means to send the person
back to Statistics › "Reports", but its redirect puts the page name
where the operation's name belongs. A report cannot be turned off, so
only a name the install has no report for counts as unknown. Expected:
the "Reports" page.
Basis: probe, 2026-10-02. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — Monthly editorial email's attachment counts every journal's active submissions, not the journal's own** · 🐞 · medium.
The "Active Submissions" block of "editorial-report.csv" counts the
submissions in each stage across every journal of the installation, not
the journal the email is about, so on a multi-journal installation each
journal's editors get the same, inflated stage counts; a journal with no
submission at all gets counts above 0.

The email goes each month to every Journal Manager and Section Editor of
the journal (Press Managers and Series Editors, preprint server Managers
and Moderators). It is on by default: a journal can stop it for everyone
on Settings › Workflow › "Emails", and each recipient can turn it off on
their Profile › "Notifications". Only this one block is wrong: the
email's text and the file's "Trends" and "Users" blocks count this
journal alone, and so does the journal's "Editorial Activity" page.

Each count is the whole site's total for that stage. On a site with a
few journals the figures can look plausible; on one with dozens or
hundreds they are plainly too large. These totals are all that crosses
between journals: the file names no submission, no person and no other
journal, and does not split the totals by journal. Expected: the
journal's own counts, as its "Editorial Activity" chart shows.
Basis: probe, 2026-10-02. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A French journal's monthly email links to the English pages** · ❓ · minor.
On a journal, press or preprint server whose primary language is
French (Canada), the monthly email's links (to "Editorial Activity",
to the published-items statistics and "Unsubscribe") carry the English
language in their address ("…/en/stats/editorial"), where an English
journal's carry no language. Whether the pages then open in English has
not been seen.
Question: should the links follow the journal's primary language?
Lean: yes, a defect: a French editor should land on French pages.
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — A press's monthly statistics email reads "Login to the the press" ("the the preprint server" on a preprint server)** · 🐞 · low.
The monthly statistics email a press sends its managers and editors (a
preprint server: its managers and moderators) closes with "Login to the
the press to view more detailed editorial trends and published book
stats.", and a preprint server's with "Login to the the preprint server
to view more detailed trends and posted preprint stats.". They should
read "Login to the press" and "Login to the preprint server", as a
journal's reads "Login to the journal".

Only the English text has the doubled word. The template on Settings ›
Workflow › "Emails" › "Manage Emails" › "Statistics Report Notification"
has it too, and a manager can correct it there.

Correcting the shipped text reaches only new installs: an install stores
the template once, when it is set up, so every existing press keeps the
doubled word until a manager edits it or an upgrade repairs the stored
copies (the optional part of the fix). Expected: "Login to the press",
"Login to the preprint server".
Basis: probe, 2026-10-02. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The reports leave out decisions by unassigned editors** · ❓ · minor.
"Articles Report" {OJS} and "Monograph Report" {OMP} list decisions only
under the editors assigned to the submission, so a decision recorded by
a Journal Manager who is not among its participants appears nowhere in
the file, and a submission with no assigned editor shows no decision at
all.
Question: should the report list every decision, with who recorded it?
Lean: yes; the report is the only list of a journal's decisions, and
managers decide without being assigned.
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A French press's or preprint server's monthly email is in English** · ❓ · minor.
On a press or preprint server whose primary language is French
(Canada), the monthly email is in English but for the month's name and
the footer: subject "Editorial activity for août, 2026" ("Preprint
Server activity for août, 2026"), opening "Your press health report for
août, 2026…" ("Your preprint health report…"), footer "Ceci est un
message automatique de la revue" and "Se désabonner". A French
journal's email is wholly French: "Activité éditoriale pour août 2026",
"Le rapport d'activité éditoriale de votre revue pour août 2026 est
maintenant disponible."
Question: should a press and a preprint server send the email in their
primary language, as a journal does? Lean: yes, a defect: the mixed
email reads as broken.
Basis: probe. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — Saving Profile › "Notifications" while it hides the statistics row stops that editor's monthly statistics email** · 🐞 · medium.
Profile › "Notifications" hides the "Statistics report summary." row in
two cases: while the journal's "Editorial statistics" setting is at "Do
not send the email to editors.", and always on the site-level profile
(the profile opened outside any journal). An editor who presses "Save"
on the tab in either case is stored as having switched the row off,
although they never saw it. From then on they get neither the monthly
statistics email nor its Tasks entry.

On the journal path the loss shows once the journal switches the email
back on: the editor's row then reads "Enable these types of
notifications." unticked. After a save on the site-level profile, every
journal's row still reads ticked, yet the email stops in every journal.

Only the people the email goes to are affected: Journal Managers and
Section Editors (Press Managers and Series Editors, Preprint Server
Managers and Moderators). The site-level case needs an editor with roles
in two or more journals of the site, because a one-journal user is sent
on to the journal's own profile.

The proposed fix stops new opt-outs but does not bring back editors
already stored as opted out. Those who saved the site-level profile keep
missing every journal's email until `pkp/pkp-lib#12769` makes the
email's recipient list read each journal's own choices. Expected: the
account's earlier choice is kept.
Basis: probe, 2026-10-02. <sup>f-a14</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — "Articles Report" leaves "Supporting Agencies" empty for every submission, though the agencies are filled in** · 🐞 · medium.
The "Articles Report" that a journal manager or editor downloads from
Statistics › "Reports" has an empty "Supporting Agencies" column for
every submission, published or not. The agencies entered on each
submission's Publication › "Metadata" page are saved and shown there,
and the columns beside it, such as "Keywords", are filled as expected.
Nothing in the file or on the page says the column is missing data.

Live journals meet it today: the released OJS 3.5.0-4 (April 2026) and
3.5.0-5 both have the fault. Only journals that turn on "Supporting
Agencies" (Settings › Workflow › Metadata, off by default) collect
agencies, so only they are affected. Nothing in the app reads the file;
it is for the journal's own use, such as listing who funded its
articles. The fix is one variable name. Expected: the agencies, joined
with ", " as "Keywords" are.
Basis: probe, 2026-10-02. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — "Articles Report" writes article titles holding "&", an apostrophe or italics with web codes ("&amp;")** · 🐞 · medium.
The "Articles Report" that a journal manager or editor downloads from
Statistics › "Reports" writes article titles with web codes in place of
"&", "<", ">", quotes, apostrophes and formatting. "Fogelin's" reads
"Fogelin&#039;s", and a word put in italics reads
"&lt;i&gt;Commons&lt;/i&gt;". Only the "Title" column is affected; the
titles are stored and shown correctly everywhere else.

How often "&" is coded depends on how the title was saved. The "Title"
box on the "Title & Abstract" page stores "&" as "&amp;", so a title
saved there reads "&amp;amp;" in the file. A title stored with a bare
"&" (carried over from 3.3, saved through the API, or as in PKP's test
data, "Hansen & Pinto") reads "&amp;" once.

Whoever uses the file has to find and replace the codes by hand, and
nothing says they are there. The report has done this since OJS 3.4.0;
3.3 stored titles as plain text and wrote them as stored. The fix is one
line: the report codes the title a second time on export. Expected: the
title as typed.
Basis: probe, 2026-10-02. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — "Articles Report" leaves "Editor Decision" empty for skipped reviews, new rounds, reverted declines and stage moves** · 🐞 · medium.
The "Articles Report" that a journal manager or editor downloads from
Statistics › "Reports" lists each editor's decisions in "Editor
Decision" / "Date decided" pairs. Several decisions get a date but an
empty name: "Accept and Skip Review", "Revert Decline", "New Review
Round", and the moves back a stage ("Move to Review", "Move To
Copyediting"). Nothing in the file or on the page says a name is
missing.

New on `main`: publishing an article now records a "Move to Done"
decision, and unpublishing it a "Return to Workflow", and neither has a
name in the file either. So every published article's line gains an
empty cell, and the upgrade to this version adds one to every article
already published. A press's "Monograph Report" leaves these new
decisions unnamed in the same way.

Anyone counting decisions from the file (how many submissions were
accepted, how many went to a second round) gets wrong numbers. Expected:
every decision named.
Basis: probe, 2026-10-02. <sup>f-ojs3</sup>

<a id="ojs4"></a>
**OJS4 — "Subscriptions Report" downloads nothing and leaves a blank tab when an institutional contact has no country** · 🐞 · medium · crash: server.
When an institutional subscription's contact has no country on their
profile, pressing "Subscriptions Report" on Statistics › "Reports" makes
the app fail on the server: no file arrives, the browser tab is left
blank and no message says why. Individual subscribers without a country
are listed with an empty "Country", as expected.

The journal gets no subscriber list at all, not even the individual
subscriptions. The file downloads again once every institutional contact
has a country.

Registration and the user's own Profile require a country, but the
editors' "Add User", "Edit User" and "Create New Reviewer" forms do not,
so a contact the journal's staff added can have none. Expected: the
whole list, the country left empty.
Basis: probe, 2026-10-02. <sup>f-ojs4</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's Editorial Activity leaves books declined at Internal Review out of "Submissions Declined"** · 🐞 · medium.
A book declined with Internal Review's "Decline Submission" is counted
in neither "Submissions Declined" nor its sub-rows, nor in the rejection
rates, although "Days to Reject" counts it and an Internal Review
"Accept Submission" counts as accepted. The monthly email's "Declined
submissions this month" leaves it out too.

The press's decline figures and rejection rates read lower than they
are, and nothing on screen corrects them. The figures are counted from
the stored decisions each time they are shown, so the fix brings back
every past Internal Review decline with no data repair; only the monthly
emails already sent stay wrong.

A press upgraded from 3.3 lost its older Internal Review declines from
the figures too. 3.3 stored them as the same decision as a Review
decline and counted them; the upgrade to 3.4 relabels those stored
decisions as Internal Review declines, so they dropped out on upgrade,
even where the press has declined nothing at Internal Review since.
Expected: counted as declined, beside the desk and after-review
declines.
Basis: probe, 2026-10-02. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — A press's "Days to First Editorial Decision" help text says "authors submitting to your journal"** · 🐞 · low.
On a press, Statistics › "Editorial Activity" has an information icon
after "Days to First Editorial Decision". Its text ends "…when the
majority of authors submitting to your journal can expect a decision."
It should read "your press".

Nothing else on the page is wrong, and the figures are right.

Most translations name a journal too: in French the text reads
"…soumettant à votre revue…" on a press.
Basis: probe, 2026-10-02. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — "Monograph Report" columns are sized by every press** · 🐞 · minor.
The number of author and decision column groups in "Monograph Report"
follows the book with the most of each on the whole installation, so a
press whose books have one author each gets columns up to "Given Name
(Author 6)", all empty, when another press has a book with six authors.
Its editor columns follow this press's books. Expected: as many columns as this press's books need.
Basis: probe. <sup>f-omp3</sup>

<a id="omp4"></a>
**OMP4 — A reverted Internal Review decline reads "Decline Submission"** · 🐞 · minor.
In "Monograph Report", the decision that reverts an Internal Review
decline is named "Decline Submission", so the file shows the book
declined twice. Expected: "Revert Decline".
Basis: probe. <sup>f-omp4</sup>

<a id="omp5"></a>
**OMP5 — A French press's attachment names External Review by a raw code** · 🐞 · minor.
On a press whose primary language is French (Canada), the "Soumissions
actives" block of the monthly "editorial-report.csv" names the External
Review stage "##workflow.review.externalReview##", while "Évaluation
interne" and the other stages read in French. A journal and a preprint
server in French name every stage. Expected: the stage's French name.
Basis: probe. <sup>f-omp5</sup>

### OPS

<a id="ops1"></a>
**OPS1 — No active submissions chart** · ✅ · minor.
A preprint server's "Editorial Activity" opens on "Trends"; the chart of
active submissions by stage is left out, since a preprint server has one
stage.
Basis: probe. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — Four "Trends" rows** · ✅ · minor.
A preprint server's "Trends" has "Submissions Received", "Submissions
Declined", "Submissions Published" and "Other Submissions" only: no
acceptance, no days to a decision and no rates, since posting is not an
acceptance decision. "Submissions Declined" there is every declined
preprint, as its one stage has one "Decline".
Basis: probe. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — "Reports" offers no report** · ❓ · minor.
A preprint server's side menu offers "Reports", but the page shows only
its introduction ("The system generates reports…") and no link: no
report is installed, and Settings › Website › "Plugins" › "Report
Plugins" reads "No Items".
Question: should a preprint server have reports (a preprints report, a
moderation report), or should "Reports" leave the side menu there? Lean:
hide the entry until a report exists; an empty page looks broken.
Basis: probe. <sup>f-ops3</sup>

<a id="ops4"></a>
**OPS4 — "Accepted submissions this month:" is blank** · 🐞 · minor.
A preprint server's monthly email keeps the line "Accepted submissions
this month:" with nothing after it, since a preprint server counts no
acceptances. Expected: the line left out of the preprint server's
email.
Basis: probe. <sup>f-ops4</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Code read 2026-09-28 at ojs `72b85f4ba0` (lib/pkp `26ae6431b5`),
omp `3cd59e944` and ops `e2111e3aae` (lib/pkp `17a1f01fed`), ui-library
`03d1cee2` in all three. The lib/pkp files this spec reads are the same
in both lib/pkp commits (`templates/stats`, the editorial statistics
service and query builder, the users-report form, the statistics API
controllers, the monthly task, its jobs, mailable and notification
manager). Pages: `PKP\pages\stats\PKPStatsHandler` (`editorial()`,
`users()`, `reports()`, `displayReports()`, `report()`) and each app's
`APP\pages\stats\StatsHandler`. Live-probed 2026-09-28 (Purpose) on
scratch journals, presses and preprint servers of the test installs,
and read-only on `publicknowledge`, all three apps: the side menu's
"Statistics" group lists the three pages beside the usage pages; a
preprint server's "Reports" lists no report.

<a id="fn-b"></a>
**b** — `PKPStatsHandler::__construct()` assigns `ROLE_ID_SITE_ADMIN`,
`ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` to `editorial` and `users`
(with the ops *Statistics — usage* owns); `authorize()` adds
`ContextAccessPolicy`, which refuses every other role and every op
outside the assignment. The requests the pages send
(`stats/editorial`, `stats/editorial/averages`, `users/report`) carry
the same three roles as route middleware. The Guest Editor group is a
sub-editor group seeded on OJS alone (`docs/process/users.md`).
Live-probed 2026-09-28 (Actors paragraph; rows 1 and 3): the Journal
Manager, Editor, Production Editor, Section Editor (on a section, on
one submission and on nothing), Guest Editor and `admin` saw the same
figures; `admin` holds "Journal manager" ("Press manager", "Preprint
Server manager") on Settings › Users & Roles of every context. For
`stats/editorial` and `stats/users`, the Author, the Reviewers, the
Reader, the assistant-level roles, the Subscription Manager, a Volume
Editor, an account whose only role had ended and a manager of another
context landed on
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`;
for `stats/reports` the roles row 3 names did. Signed out, all three
addresses land on `login?source=…`. The side menu's "Editorial
Activity" lands on `stats/editorial/editorial`.

<a id="fn-c"></a>
**c** — `lib/pkp/templates/stats/editorial.tpl`: an `<h1
class="-screenReader">` "Editorial Activity" (`stats.editorialActivity`),
the chart block `v-if="activeByStage"`, the `pkp-header` h1 "Trends"
(`stats.trends`) with `<date-range>` and the "Filters" button
(`common.filter`, `v-if="filters.length"`), the table
`pkpTable--editorialStats` with a `<tooltip>` on each row that has a
`description` (`PKPStatsHandler::_getStatDescription()`: `daysToDecision`,
`acceptanceRate`, `declineRate`, `submissionsSkipped`), labelled
`stats.descriptionForStat`. `PKPStatsHandler::editorial()` sets
`dateStart` to −91 days and `dateEnd` to yesterday, the presets
`stats.dateRange.last90Days`, `thisYear` ("Year to date"), `lastYear`,
`lastTwoYears`, and the columns `common.name`, "{dateStart} —
{dateEnd}", `stats.total`. `StatsEditorialPage.vue` (extends
`StatsPage.vue`): `get()` sends three requests (the range, the totals
without dates, the averages) on every range or filter change and
rewrites the rows, with `isLoading` showing the spinner;
`setCurrentDateRange()` renames column 1 from `DateRange.vue`'s
`currentRange`. `pageTitle` fills only the browser tab
(`layouts/backend.tpl`). Custom Range bounds: `PKPStatsComponent::getConfig()`
(`dateStartMin` `STATISTICS_EARLIEST_DATE`, `dateEndMax` yesterday).
`Tooltip.vue` is a `span.tooltipButton` shown by `v-tooltip` on hover.
Sub-rows' names start with an em space (U+2003; `$indentStats`), which
the table keeps. Live-probed 2026-09-28 (Fields "Editorial Activity";
Rules 1, 3, 5, 11, 12): tab "Editorial Activity | {context name}"; the
level-1 "Editorial Activity" is screen-reader-only and the visible
headings are "{n} Active Submissions" (OJS, OMP) and "Trends"; nothing
is requested after the page opens until a range or filter changes; the
presets and the refusals as stated; the headings sort nothing; a
spinner showed while the `stats/editorial` requests were held; the icon
texts matched word for word on hover, and the icons took no focus
(tabIndex −1); a sub-row's name starts 12 pixels right of its group's
at 1280 pixels.

<a id="fn-d"></a>
**d** — `PKPStatsHandler::editorial()` builds `activeByStage` from
`Application::getApplicationStages()` with
`PKPStatsEditorialService::countActiveByStages()` (status `STATUS_QUEUED`,
by `stage_id`), names from `getWorkflowStageName()`
(`workflow.review.externalReview` is "Review" on OJS and "External
Review" on OMP; `submission.editorial` "Copyediting") and colours from
`getWorkflowStageColor()`; the total is `totalActive`
(`stats.submissionsActive`). The count goes through
`PKPStatsEditorialQueryBuilder::_getObject()`, which drops drafts and
imported submissions; it is computed once, with no dates and no filters.
OPS `StatsHandler::removeEditorialStatsChartView()` sets `activeByStage`
to null for `stats/editorial.tpl`.
Live-probed 2026-09-28 (Rule 2; Fields chart): a journal with three
submissions at Submission and one each in Review, Copyediting and
Production read 6 (a press 7 with Internal Review 1), its desk-declined,
published, scheduled, draft and imported seeds left out; the chart did
not change under any preset, Custom Range or filter. A context with no
active submission drew no ring ("0 Active Submissions"); one with a
single active submission drew one full ring.

<a id="fn-e"></a>
**e** — Each app's `StatsHandler::addSectionFilters()` on the
`TemplateManager::display` hook for `stats/publications.tpl` and
`stats/editorial.tpl`: OJS always adds "Sections" (`section.sections`,
`Repo::section()->getSectionList()`, inactive sections included; the
"Issues" heading is added for `publications.tpl` only); OMP "Series"
(`series.series`, `seriesIds`) unless the press has none; OPS
"Sections" only when `SubmissionsListPanel::getSectionFilters()` returns
two or more; inactive sections and series are listed and counted in all
three. The filter reaches `PKPStatsEditorialQueryBuilder::_getBaseQuery()`
as a join on the current publication's `section_id` (OMP `series_id`),
for every row and for the averages. `StatsPage::toggleSidebar()` clears
`activeFilters` when the panel closes.
Live-probed 2026-09-28 (Rule 4): "Filters" on a journal with one and
two sections, on a press only with series, on a preprint server only
with two sections; with "Reviews" / "Beta Series" / "Notes" made
inactive on Settings › Journal (Press, Server) › "Sections" ("Series")
the panel still listed them. Choosing section A narrowed both columns
(the requests carry `sectionIds[]`), and closing the panel requested
the unfiltered figures. An item published in section A and given
"Create New Version" moved to section B counted under A until the new
version was published ("Publish" / "Post"), then under B, on all three
apps. The closed panel stays in the accessibility tree (A4).

<a id="fn-f"></a>
**f** — `PKPStatsEditorialService::getOverview()` (rows, keys, names) and
`PKPStatsEditorialQueryBuilder`: `countSubmissionsReceived()`
(`date_submitted >= dateStart` and `<= dateEnd`), `countByDecisions()`
(the decision date, `dateEnd` plus one day; `status = STATUS_DECLINED`
for decline decisions, `!=` otherwise), `countPublished()` (status
published, the first published version's `date_published`),
`countInProgress()` and `countImported()` (`_getBaseQuery()`, the range
on `date_submitted`), `_getObject()` (drafts out; submission date on or
before the first publication date, or no publication). Accepting
decisions: `getAcceptedDecisions()` `ACCEPT`, `SKIP_EXTERNAL_REVIEW`,
`SEND_TO_PRODUCTION`, OMP adding `ACCEPT_INTERNAL`; declining:
`INITIAL_DECLINE` (desk) and `DECLINE` (after review). OMP's
`StatsEditorialService` overrides `getAcceptedDecisions()` and
`getDeclinedDecisions()` (adding `DECLINE_INTERNAL`, which only the days
rows read) and not `getOverview()`. OPS's `StatsEditorialService::getOverview()`
returns four rows: received, declined (`INITIAL_DECLINE`, which OPS's
`Decline` type extends), published and skipped
(`countSubmissionsSkipped()`).
`countImported()` and `countInProgress()` compare `date_submitted`
with `<= dateEnd` as `countSubmissionsReceived()` does (A1).
Live-probed 2026-09-28 (Rules 6, 6a, 6b, 7): nine seeds on a journal or
press (received, draft, published, imported, desk-declined, accepted,
skip-review, sent to production, review-declined) read "Submissions
Received" 7, "Submissions Accepted" 3, each decline row 1, "Other
Submissions" 2; reverted declines left "Submissions Declined", an
accepted submission declined later moved there; "Unpublish" ("Unpost")
dropped a submission from "Submissions Published", and a new version
published today left the first publication's day as its date. Custom
Ranges read each row against its own date. A draft seeded with
`submitted: false` and one started with "Begin Submission" both stored
the moment they were started as `date_submitted`.

<a id="fn-g"></a>
**g** — `PKPStatsEditorialService::getAverages()`: per key, the first
year plus one to the last year (minus one when that is this year or
later); `years = yearEnd − yearStart + 1`; `if ($years)` averages the
count over those full years, otherwise −1. `PKPStatsHandler::editorial()`
and `StatsEditorialPage.vue` show `stats.countWithYearlyAverage`
"{$count} ({$average}/year)" when the average is not −1 and the total
is above 0. The averages request carries the filters and the chosen range's
`dateStart`/`dateEnd`, which `getAverages()` drops. Live-probed
2026-09-28 (Rule 8): seeds back-dated to 2023–2026 read "Submissions
Received" "13 (2/year)" (four in 2024–2025), "Submissions Declined" "6
(1/year)" (0.5 shown as 1), "(Desk Reject)" "5 (0/year)" (none in
2024–2025), "(After Review)" "1" (its one decline in 2024) and
"Submissions Accepted" "2" (2025 and 2026); a section filter changed
the averages, the presets did not.

<a id="fn-h"></a>
**h** — Rates: `getOverview()` divides by every received submission
without dates, and with dates by the submissions received in the range
that reached an accepting or declining decision
(`countByDecisions(…, true)`); 0 when nothing to divide; rounded to two
decimals and shown ×100 with "%". Days: `getDaysToDecisions()` takes
each submission's first decision of the kind
(`_getDaysToDecisionsObject()`, the range on `date_submitted`) and
`calculateDaysToDecisionRate(days, 0.8)`.
Live-probed 2026-09-28 (Rules 9, 10): "Total" rates 15%, 46%, 38% and
8% for 2, 6, 5 and 1 of 13 received; "Year to date" with five
received, one accepted and one declined read 50%, 50%, 50%, 0%; first
decisions after 0, 0, 0, 0, 5 and 20 days read "Days to First Editorial
Decision" 5, one acceptance after 10 days "Days to Accept" 10; nothing
to divide read "0%" and 0.

<a id="fn-i"></a>
**i** — `PKPStatsHandler::users()`: `Repo::user()->getRolesOverview()`
with a collector filtered to the context: "All Users" (`stats.allUsers`)
then one row per `Application::getRoleNames()` (the site administrator
first; OJS's `Application::getRoleNames()` adds
`user.role.subscriptionManager`), each counted with
`filterByRoleIds([roleId])`. The user `Collector` defaults to active
accounts and current roles; its context filter
(`COALESCE(ug.context_id, 0)` in the context) never matches the site
administrator's group, whose context is empty. Labels:
`user.role.manager` ("Journal Manager", OMP "Press Manager", OPS
"Manager"), `user.role.subEditor`; `users.tpl` heading
`manager.statistics.statistics.registeredUsers`, tab
`stats.userStatistics`.
Live-probed 2026-09-28 (Rules 14, 15): on a journal seeded with a
Journal Manager, two Editors, a Section Editor, a Guest Editor, a
disabled Author and a Reader whose role had ended, "All Users" 6, "Site
Administrator" 0, "Journal Manager" 4, "Section Editor" 2, the rest 0
(a press 5/0/4/1, a preprint server 3/0/2/1), `admin` counted through
its manager role; created roles counted under their level; "Disable
User" and "Remove User" in a second tab changed the open page's counts
only after a reload.

<a id="fn-j"></a>
**j** — `StatsUsersPage.vue::openExportModal()` opens
`UserExportModal.vue` (title `manager.export.usersToCsv.label`) with
`PKP\components\forms\statistics\users\ReportForm` (field
`userGroupIds`, label `user.group`, description
`manager.export.usersToCsv.description`, one option per `UserGroup` of
the context, all by default; submit `common.export`). The form posts to
`stats/users`, whose POST branch prints the `users/report` address with
the posted values; `loadExport()` sets `window.location` to it and
closes the window. `PKPUserController::getReport()` →
`Repo::user()->getReport()` (`filterByUserGroupIds($args['userGroupIds']
?? null)`; an empty set of boxes sends `userGroupIds=` with no value,
and the file holds no account) →
`PKP\user\Report::serialize()`: a byte-order mark, the headings, one
"Yes"/"No" per context group from the account's active roles; file
`user-report-{Y-m-d}.csv`. The window's close control is
`SideModalBody.vue`'s arrow, named `common.close` for a screen reader;
Escape also closes it. The form's state lives in the
page (`onSet`), not on the server.
Live-probed 2026-09-28 (Actors row 2; Fields; Rules 16, 17): file
`user-report-2026-09-28.csv` sent as an attachment, the bytes EF BB BF
first, "Email address", "Date registered" as "2026-09-28 05:27:26";
one role's box alone listed that role's holders alone; every box
unticked downloaded the column-name line alone; the window reopened
with the boxes as last left after the arrow and after an export, all
ticked after a reload; leaving with the window open asked nothing. The
`users/report` address typed by a role refused "Users" answered 401
(`user.authorization.roleBasedAccessDenied`) and downloaded nothing.
The email column's heading, and every report's email column (notes l,
m, n, o), is the one text `user.email`, which lib/pkp defines twice:
"Email address" in `locale/en/common.po`, "Email" in
`locale/en/user.po`; the install's order of loading the two files picks
the heading, the duplicate key the contributor form's A19 records in
*Contributors & affiliations* (`PKP\user\Report`,
`ArticleReportPlugin`, `ReviewReportPlugin`,
`SubscriptionReportPlugin`, OMP `plugins/reports/monographReport/Report.php`).
Test run 2026-09-28 (Fields; scenarios 2, 7, 8): the local installs
read "Email address" throughout; the CI installs read "Email" in the
users export on all three apps, "Email (Author 1)" in OMP's
"Monograph Report" and "Email" in the individual block of OJS's
"Subscriptions Report", at the same commits.

<a id="fn-k"></a>
**k** — `PKPStatsHandler::reports()` sends an empty path or `reports` to
`displayReports()` (`stats/reports.tpl`: heading and tab
`manager.statistics.reports`, the line
`manager.statistics.reports.description`, one link per
`PluginRegistry::loadCategory('reports')` to `reports/report?pluginName=`)
and `report` to `report()`, which redirects for an empty or unknown
`pluginName` and otherwise calls the plugin's `display()`.
`loadCategory('reports')` reads every installed report plugin from
disk: OJS `plugins/reports/{articles, counter, reviewReport,
subscriptions}`, OMP `{monographReport, reviewReport}`, OPS none (no
`plugins/reports` folder). `reports()` hands them to the template in
the order `loadCategory()` returns them, which nothing sorts, so
installs at the same commits can list the links in different orders.
`ReportPlugin::getActions()` gives each plugin's row the "Reports" link
to the same address.
Live-probed 2026-09-28 (Actors row 3; Fields; Rules 18, 19): the links
in the Fields order on a scratch journal, a second journal and
`publicknowledge`; every report row's box on "Report Plugins" ticked
and not pressable; each link, and each row's "Reports" link on the
Plugins tab, downloaded at once with the page unchanged; a preprint
server's "Report Plugins" read "No Items". A report address naming no
report landed on `{context}/stats/stats/reports`, "404 Not Found"
(A8). Test run 2026-09-28 (Fields; scenario 7): the local installs
listed the links in the Fields table's order; a CI install at the same
commits listed "Subscriptions Report", "Articles Report", "Review
Report", "COUNTER Reports".

<a id="fn-l"></a>
**l** — OJS `ArticleReportPlugin::display()`: file
`articles-{acronym without other characters}-{Ymd}.csv`, byte-order
mark; `Repo::submission()->getCollector()->filterByContextIds()` (its
`isIncomplete` false adds no filter, so drafts are listed); author
columns up to the most authors; editors are the stage assignments in a
manager or sub-editor group; decisions matched to them by `editorId`;
`getDecisionMessage()` names `ACCEPT`, `PENDING_REVISIONS`, `RESUBMIT`,
`DECLINE`, `SEND_TO_PRODUCTION`, `EXTERNAL_REVIEW`, `INITIAL_DECLINE`
("Decline (Pre-review)", the plugin's `plugins.reports.articles.initialDecline`)
and four `RECOMMEND_*`, and returns an empty string for every other
decision; "Status" from `getStageLabel()` or `getStatusMap()`; "URL"
`dashboard/editorial?workflowSubmissionId=`; "Title" through
`htmlspecialchars()`; "Supporting Agencies" joins the undefined
`$agencies` (the collected list is `$supportingAgencies`).
Live-probed 2026-09-28 (Rule 20; Fields): 20 lines for 20 submissions,
the draft included; "Email address (Author n)", "Editor Decision 1
(Editor 1)" with two spaces before the parenthesis; "Country (Author
2)" "DE"; a published article whose newer, unpublished version moved to
"Reviews" kept "Section title" "Articles"; "Cancel Review Round" left
no decision cell and removed that round's decisions, "New Review Round"
included, on both apps; "URL" opened the submission's workflow.

<a id="fn-m"></a>
**m** — `ReviewReportPlugin::display()` (OJS and OMP identical) and
`ReviewReportDAO::getReviewReport()`: every review assignment of the
context, ordered by the submission's title; "Stage" through
`WorkflowStageDAO::getTranslationKeyFromId()`; "Consideration" names
`REVIEW_ASSIGNMENT_NEW` "Never", `CONSIDERED`, `UNCONSIDERED` and
`RECONSIDERED`, and leaves `REVIEW_ASSIGNMENT_VIEWED` empty;
`getOverdueDays()`; "Recommendation" through
`getRecommendationOptions()` (empty on OMP, whose
`hasCustomizableReviewerRecommendation()` is false); comments are the
peer-review comment rows joined with "; ", otherwise the review form's
included questions and answers as HTML. File `reviews-{Ymd}.csv`,
byte-order mark.
Live-probed 2026-09-28 (Rule 21): eight lines for eight assignments on
each app, one submission's lines in no set order (round 2 first on
OJS, last on OMP, same seed); "Consideration" "Never", empty,
"Considered", "Unconsidered", "Reconsidered" step by step; a response
due date 5 days past read 4, a review due date 3 days past 2, kept after
"Cancel Reviewer"; comments as "<p>…</p>", a two-round reviewer's
"<p>Round one comment</p>; <p>Round two comment</p>" on both lines; a
review form's answer inside "<blockquote>…</blockquote>" with
"&amp;".

<a id="fn-n"></a>
**n** — OJS `SubscriptionReportPlugin::display()`: file
`subscriptions-{Ymd}.csv`, byte-order mark; the two blocks from
`IndividualSubscriptionDAO` and `InstitutionalSubscriptionDAO::getByJournalId()`.
The individual block checks the account's country before
`Countries::getByAlpha2()`; the institutional block calls
`getByAlpha2($user->getCountry())` unchecked, and `getByAlpha2(string)`
refuses the null an unset country gives. Live-probed 2026-09-28 (Rule
22; OJS4): with one of three institutional contacts without a country,
`GET {journal}/stats/reports/report?pluginName=SubscriptionReportPlugin`
answered 500 with an empty body four times (server log: uncaught
TypeError in `Countries::getByAlpha2()`, null given); the tab stayed
blank and nothing downloaded. With that contact's country set, the
whole file downloaded, "Email address" in both blocks, an individual
subscriber's "Country" "Canada" or empty.

<a id="fn-o"></a>
**o** — OMP `MonographReportPlugin::display()` and `Report::getIterator()`:
file `monographs-{acronym}-{Ymd}.csv`, byte-order mark; one row per
`Repo::submission()` of the press, drafts included;
`retrieveLimits()` takes the largest author and decision counts
`FROM submissions s` with no press condition; `getDecisionMessage()`
gives `REVERT_INTERNAL_DECLINE` `editor.submission.decision.decline`;
`getCategories()` and `getIdentifiers()` join with line breaks; "URL"
`workflow/access/{id}`.
Live-probed 2026-09-28 (Rule 23; OMP3, OMP4): with this press's books
at one author, one editor and five decisions at most and another
press's at six, four and seven, the file ran to "(Author 6)" and
"Editor Decision 7 (Editor 1)" but stopped at "(Editor 1)"; "Status"
read every stage of the press; "Categories" and "Identifiers" held one
entry per line.

<a id="fn-p"></a>
**p** — `PKP\task\StatisticsReport` (registered `monthlyOn(1)` in
`PKPScheduler::registerSchedules()`, all three apps; name
`admin.scheduledTask.statisticsReport`): for each enabled context with
`editorialStatsEmail`, `NotificationSubscriptionSettingsDAO::getSubscribedUserIds()`
for `ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` with a current role in
the context (disabled accounts included; both jobs then skip them, as
`Repo::user()->get($userId)` returns nothing for a disabled account),
minus the blocked
notification (and, for the email, the blocked email); dispatches
`StatisticsReportNotify` jobs and `StatisticsReportMail` jobs for "first
day of previous month" to "first day of this month".
`StatisticsReportMail::handle()`: `getOverview()` for the month and over
all time, `countSubmissionsReceived()` over all time; the month's name
by `IntlDateFormatter` "MMMM" in the context's primary locale; mailable
`PKP\mail\mailables\StatisticsReportNotify` (template
`STATISTICS_REPORT_NOTIFICATION`, each app's `locale/en/emails.po`
`emails.statisticsReportNotification.subject` and `body`), from the
context's contact; attachment `editorial-report.csv` from
`createCsvAttachment()`: byte-order mark; `stats.submissionsActive` with
`countActiveByStages($stageId)` called without the context; `stats.trends`,
"{month}, {year}", the raw values; `manager.users` with
`getRolesOverview()`. `setupStatisticsVariables()` leaves
`acceptedSubmissions` null when the row is absent (OPS), which
`Mailer::compileParams()` replaces with nothing. Links:
`editorialStatsLink` `stats/editorial`, `publicationStatsLink`
`stats/publications`.
Live-probed 2026-09-28 (Actors row 4; Fields; Rules 24–26; A9, A11,
OPS4) through the test tooling's run of the task for one journal (fn
sc) and its command-line twin: recipients as Actors row 4, a disabled
Journal Manager and Section Editor getting nothing; From the principal
contact ("Site Admin" by default); subjects, openings, figures,
closings, links and footer as Fields; submissions of 31 July and 1
September left out, 1 and 31 August counted ("New submissions this
month: 4", where the page's Custom Range 2026-08-01 — 2026-08-31 read
3); the attachment with the bytes EF BB BF, 16 "Trends" lines (4 on a
preprint server), rates as "0.5". On a context whose primary language
is French (Canada), OJS's email was wholly French, OMP's and OPS's
English with "août" and a French footer (A13), the links carried `/en/`
(A10), and the press's attachment read
"##workflow.review.externalReview##",3 (OMP5).

<a id="fn-q"></a>
**q** — The `StatisticsReportNotify` job calls
`EditorialReportNotificationManager::notify()`:
`NOTIFICATION_TYPE_EDITORIAL_REPORT` at `NOTIFICATION_LEVEL_TASK` with
`contents` `notification.type.editorialReport.contents`;
`PKPNotificationManager::getNotificationMessage()` returns that
`contents`, and the manager's `getNotificationUrl()` is `stats/editorial`.
`StatisticsReportMail::handle()` also creates a normal-level
notification of the same type for each mailed account, for the
unsubscribe link (`allowUnsubscribe()`).
Live-probed 2026-09-28 (Rule 27): the Section Editor's bell read 1,
the entry had no title line, and pressing it landed on "Editorial
Activity" through the panel's mark-read redirect; the bell then read 0
and the entry stayed listed. A second run added a second entry. A "Do
not send me an email…" account had the entry; an "Enable…"-unticked
account, the Author and the assistant role had none.

<a id="fn-r"></a>
**r** — `editorialStatsEmail` (context schema, default true;
`PKPEmailSetupForm::addStatisticsReportField()`, label
`manager.editorialStatistics`, options `manager.editorialStatistics.on`
and `off`, group "For Editors"). `PKPNotificationSettingsForm::getNotificationSettingCategories()`
lists `NOTIFICATION_TYPE_EDITORIAL_REPORT` (`notification.type.editorialReport`)
under `user.role.editors` only while it is on; the blocked keys the
task reads are that row's two boxes. `PKPNotificationSettingsForm::execute()`
blocks every setting the form is not sent, so saving the tab while the
row is hidden stores it blocked (A14). Live-probed 2026-09-28 (Actors
rows 5, 6; Rule 28; Settings): "Do not send the email to editors."
saved and reopened after a reload, and no email and no Tasks entry went
to anyone, another journal's run the control; the Profile row went and
came back; the two boxes held after "Save" and a reload. The email's
"Unsubscribe" page listed every email of the tab (11 on a journal, 9 on
a preprint server), all ticked; its "Unsubscribe" left "Do not send me
an email…" ticked, and the next run brought the Tasks entry and no
email.

<a id="fn-sc"></a>
**sc** — Scenarios. Scenarios 1 to 5 run on OJS, OMP and OPS, 6 and 7
on OJS and OMP, 8 on OJS, 9 on OPS. Every scenario builds its journals
with `POST scenarios/context` and throwaway `users[]` (password: the
username twice), and its submissions with `POST scenarios/submission`,
a throwaway `author` as submitter; the names in the scenarios
("Axolotl", "Nova", "Okapi Institute"…) stand for the test's
tag-prefixed throwaways. "Received on" a day is `dateSubmitted`, which
moves the seed's decisions and publication to that day (so every
seeded decision reads 0 days); "sent to review" is
`sendExternalReview`, "accepted" `accept`, "sent to production"
`sendToProduction`, "declined at the Submission stage" `initialDecline`
(OPS `decline`), "declined there" after review `decline`, "published"
("posted") `published: true` after those decisions (a published seed
records no accepting decision of its own); an imported submission is a
seed `published` with a `datePublished` before its `dateSubmitted`; a
draft is `submitted: false`, which stores the moment it is made. Every
scratch context enrols `admin` as a manager (seed-facts): that is the
Site Administrator's Journal Manager role the counts include, and the
editor of scenario 7's "Marsh survey" (`participants: [{username:
'admin', role: 'manager'}]`, since seeded decisions are recorded as
`admin`). Scenario 1: `manager`, `author`, `externalReviewer` (OJS,
OMP), `reader`, `copyeditor` (OPS `editorialBoardMember`),
`subscriptionManager` (OJS) and a `reader` with `roles: []` and a
`pastRoles` reader role ended yesterday; the seeded journal's Journal
Manager is `manager.maya` (password as `docs/process/users.md` gives
it); the addresses are those the side menu opens (fn b); the signed-out
visitor is a fresh browser context. Scenario 2: `manager`,
`sectionEditor`, Nova `['author', 'reader']`, Otto `author`, Cora
`copyeditor` (OPS `editorialBoardMember`), Pia `author` with `disabled:
true`, Quinn with a `pastRoles` reader role ended yesterday; the files
are read from the browser's downloads. Scenario 3: Maya `manager`, Sol,
Tess and Uma `sectionEditor`, Tess with `notifications:
{notificationEditorialReport: {email: false}}`, Uma with `{enabled:
false}`, Vic `manager` with `disabled: true`, Wes `author`; the seeds
dated the 10th, 12th and 15th of the previous month and "Kea" without
a date; each run is
`POST scenarios/task` `{task: 'statisticsReport', context}`; the emails
are read in the mail catcher by the throwaways' addresses, since
`admin@mail.test` gets one per run of every test; Tess's and Uma's
Tasks panels are read signed in as them. Scenario 4: `editorialStatsEmail:
false`, `manager`, `sectionEditor`, `author`, the seed dated the 10th
of the previous month; the Section Editor's
Profile is opened and left without "Save"; the switch back on is saved
on screen. Scenario 5: `dateSubmitted` 1 March of the three years
before this one, "Zeta" without it. Scenario 6: OJS `sections[]`
"Articles" and "Reviews" with each seed's section; the `sectionEditor`
with no section; "Revert Decline" is recorded on screen with its email
skipped. Scenario 7: `context.acronym: 'J-PK'`; Rhea and Saul
`externalReviewer`; "Marsh survey" with `contributors: [{givenName:
'Greta', familyName: 'Braun', country: 'DE', …}]`, `decisions:
['sendExternalReview', 'accept']` and `reviewRounds: [{reviewers:
[{username: Rhea, status: 'completed', comments: 'Clear and well
argued.'}, {username: Saul, status: 'declined'}]}]`; "Delta notes" with
`decisions: ['sendExternalReview']` and Rhea `invited`. Scenario 8:
`subscriptionTypes[]` an individual and an institutional type,
`institutions[]` "Okapi Institute" with an IP range, `subscriptions[]`
one of each (Nell and Pat throwaway `reader`s); Pat's country is saved
on screen on Pat's Profile › "Contact", since no key sets an account's
country. Scenario 9: OPS decisions `decline`; "posted" is `published:
true`. Live-probed 2026-09-28: each of these keys built its state on
every app that has it.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-28 (Fields "Editorial Activity"): on a
journal, a press and a preprint server the headings were the
screen-reader-only "Editorial Activity", "{n} Active Submissions" (OJS,
OMP), "Trends" and, inside the closed panel, "Sections" or "Series";
none visible reads "Editorial Activity".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-28 (Rule 6a): a seed published with
`datePublished` a year back and submitted today, and one received and
left at Submission, read "Imported Submissions" 1, "Other Submissions"
1, "Submissions Received" "1 (0/year)", "Submissions Published" 0 and a
chart of 1.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-28 (Rules 8–10; A2): three seeds today
(one at Submission, one accepted after review, one desk-declined) read
"3 (0/year)", "1 (0/year)", "1 (0/year)"; rates "33%", "33%", "33%",
"0%"; days 0; the middle column 0 and "0%"; "Year to date" headed
"2026-01-01 — 2026-09-27", figures 0.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-28 (Rule 11; A5; OMP2): the "Acceptance
Rate" text as Fields on hover; Tab from the date range reached
"Filters" and then left the page's main region, no icon taking focus;
the press's "Days to First Editorial Decision" text ends "…your journal
can expect a decision."

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-28 (Rule 12): at 1280 pixels every
sub-row's name starts 12 pixels right of its group's (393 against 381),
the name beginning with an em space.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-28 (Rule 13; OMP1): a press with one book
declined at Internal Review by seed, one accepted from it and one
declined there on screen read "Submissions Declined" and its sub-rows
0, "Rejection Rate" 0%, "Submissions Accepted" "1 (0/year)", a chart
"Copyediting" 1 and "Days to Reject" 15; a preprint server's declined
preprint read "Submissions Declined" 1.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-28 (Rule 14; A6, A7): every row as fn i
gives it, the same as the Journal Manager, the Section Editor and
`admin`.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-28 (Rules 16, 17): the window "Export to
Excel/CSV" with "User Group" and its line, every box ticked at first;
the Section Editor's box alone gave the Section Editor alone, "Yes"
under that role; the window closed on export and reopened as last
left; every box unticked gave the column names alone.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-28 (Rules 18, 19; A8): as fn k.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-28 (Rule 20; A12, OJS1–OJS3): "Bread
&amp; Butter"; "Supporting Agencies" empty with "Agency One" and
"Agency Two" on the Metadata page; the Section Editor's "Accept and
Skip Review" with an empty "Editor Decision" and a filled date; the
unassigned administrator's decisions nowhere; each "Status" as Rule
20c; nothing in the file but the report's lines.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-28 (Rule 21): as fn m; "Stage" "Review"
(a press "Internal Review" or "External Review"); "Recommendation"
filled on a journal and empty on a press.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-28 (Rule 22; OJS4): as fn n; the download
failed outright instead of stopping at the subscription.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-28 (Rule 23; OMP3, OMP4): as fn o; the
reverted decline's cells read "Send to Internal Review", "Decline
Submission", "Decline Submission".

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-28 (Actors row 4; Rules 24–26): as fn p;
the Journal Manager, the Editor, the Section Editor and the site
administrator got the email, the Author and the Reader did not.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-28 (Rule 27): as fn q; no notice on the
next page opened and no count in the public header.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-28 (Rule 28; Settings): as fn r; the
account with "Enable…" unticked got neither the email nor the entry,
the one with "Do not send me an email…" ticked the entry alone.

<a id="fn-f-a1"></a>
**f-a1** — `countSubmissionsReceived()`, `countImported()` and
`countInProgress()` compare `date_submitted` (a date and time) with
`<= dateEnd` (a bare date, read as its midnight); `countByDecisions()`
and `_getDaysToDecisionsObject()` add a day to `dateEnd`. The monthly
email's range ends at the first day of the next month at midnight.
Live-probed 2026-09-28 with back-dated seeds (`dateSubmitted`), the
three apps: under "Last 90 days" the two seeds received yesterday were
left out of "Submissions Received" (4 of 6) while a desk decline and a
publication of that day counted; a Custom Range ending on an imported
seed's arrival day read "Imported Submissions" and "Other Submissions"
0, one ending the next day 1; a range ending on a declined seed's
arrival day read "Submissions Received" 0, "Submissions Declined" 1 and
every rate "0%"; the August email counted a submission of 31 August
that the page's Custom Range 2026-08-01 — 2026-08-31 left out.
Issue report: [docs/issues/U65-A1-range-last-day-left-out-of-received.md](../issues/U65-A1-range-last-day-left-out-of-received.md), filed as [pkp-e2e#641](https://github.com/jardakotesovec/pkp-e2e/issues/641).

<a id="fn-f-a2"></a>
**f-a2** — fn g: with the first and last year both this year, `years` is
−1, which the `if ($years)` guard lets through; the count over the empty
span is 0. Live-probed 2026-09-28: td3.
Issue report: [docs/issues/U65-A2-yearly-average-zero-first-year.md](../issues/U65-A2-yearly-average-zero-first-year.md), filed as [pkp-e2e#635](https://github.com/jardakotesovec/pkp-e2e/issues/635).

<a id="fn-f-a3"></a>
**f-a3** — `PKPStatsEditorialQueryBuilder::countInProgress()` applies the
range to `date_submitted`; `PKPStatsEditorialService::countSubmissionsInProgress()`'s
own comment says "Date restrictions will not be applied." Live-probed
2026-09-28, the three apps: a draft seeded with `submitted: false` and
one started with "Begin Submission" both stored the moment they were
started as `date_submitted`; "Submissions In Progress" read 0 in the
middle column under every preset and Custom Range and 2 in "Total".
Open: a draft started before yesterday, which no test install holds
yet.

<a id="fn-f-a4"></a>
**f-a4** — fn e. Live-probed 2026-09-28, the three apps: with "Filters"
closed, the accessibility tree held the heading "Sections" ("Series")
and a button per name; the panel is 1 pixel wide under the table, so a
pointer at a button's centre hits a "Trends" cell, and Tab from
"Filters" goes to the page's first link. A script-driven Enter on a
hidden name applied that filter with no sign on the page; a screen
reader's own activation was not tried.

<a id="fn-f-a5"></a>
**f-a5** — fn c: `Tooltip.vue`, the same component *Statistics — usage*
probed for its A7 (a `span.tooltipButton` out of the tab order).
Live-probed 2026-09-28: td4.
Issue report: [docs/issues/U64-A7-information-icons-out-of-keyboard-reach.md](../issues/U64-A7-information-icons-out-of-keyboard-reach.md), filed as [pkp-e2e#616](https://github.com/jardakotesovec/pkp-e2e/issues/616).

<a id="fn-f-a6"></a>
**f-a6** — fn i. Live-probed 2026-09-28: td7; `publicknowledge` read "Site
Administrator" 0 as manager.maya and as `admin`.
Issue report: [docs/issues/U65-A6-users-stats-site-administrator-reads-zero.md](../issues/U65-A6-users-stats-site-administrator-reads-zero.md), filed as [pkp-e2e#636](https://github.com/jardakotesovec/pkp-e2e/issues/636).

<a id="fn-f-a7"></a>
**f-a7** — fn i: `getRoleNames()` is keyed by role ID and
`filterByRoleIds()` counts every group of that role. Live-probed 2026-09-28: td7 ("Journal Manager" 4 with one
manager, two Editors and `admin`; a preprint server's "Manager" 2 with
one manager and `admin`).

<a id="fn-f-a8"></a>
**f-a8** — fn k. Live-probed 2026-09-28, the three apps:
`…/stats/reports/report?pluginName=NoSuchReport`, an empty `pluginName`,
no `pluginName` and the right name in lower case each landed on
`{context}/stats/stats/reports`, "404 Not Found".
Issue report: [docs/issues/U65-A8-report-address-unknown-name-404.md](../issues/U65-A8-report-address-unknown-name-404.md), filed as [pkp-e2e#638](https://github.com/jardakotesovec/pkp-e2e/issues/638).

<a id="fn-f-a9"></a>
**f-a9** — fn p: `StatisticsReportMail::createCsvAttachment()` calls
`countActiveByStages($stageId)` without `contextIds`. Live-probed 2026-09-28: a journal with no
submission, its chart 0 everywhere, got Submission 34, Review 2,
Copyediting 12, Production 2 (a press 40/0/3/17/2, a preprint server
Production 48), the installation's active counts.
Issue report: [docs/issues/U65-A9-monthly-report-counts-other-journals.md](../issues/U65-A9-monthly-report-counts-other-journals.md), filed as [pkp-e2e#633](https://github.com/jardakotesovec/pkp-e2e/issues/633).

<a id="fn-f-a10"></a>
**f-a10** — fn p (`editorialStatsLink`, `publicationStatsLink`, the
unsubscribe link). Live-probed 2026-09-28, the three apps, a context
whose primary language is French (Canada), by the task key and by its
command-line twin: the links read `…/{journal}/en/stats/editorial`,
`…/en/stats/publications` and `…/en/notification/unsubscribe…`; an
English context's links carry no language. The pages behind them were
not opened.

<a id="fn-f-a11"></a>
**f-a11** — OMP and OPS `locale/en/emails.po`,
`emails.statisticsReportNotification.body`; OJS's reads "Login to the
journal". Live-probed 2026-09-28: the three closings word for word (td14).
Issue report: [docs/issues/U65-A11-monthly-email-login-to-the-the-press.md](../issues/U65-A11-monthly-email-login-to-the-the-press.md), filed as [pkp-e2e#647](https://github.com/jardakotesovec/pkp-e2e/issues/647).

<a id="fn-f-a12"></a>
**f-a12** — fn l and fn o: decisions are matched by `editorId` to the
editors assigned to the submission alone. Live-probed 2026-09-28: td10; on a press the unassigned
administrator's decisions were absent too.

<a id="fn-f-a13"></a>
**f-a13** — fn p (the month's name by `IntlDateFormatter` in the primary
locale; the text from the context's primary-language template).
Live-probed 2026-09-28, a context whose primary language is French
(Canada), by the task key and by the command-line twin, the same both
ways: OMP's and OPS's subject and body in English with "août" and the
French footer; OJS's wholly French.

<a id="fn-f-a14"></a>
**f-a14** — fn r (`PKPNotificationSettingsForm::execute()`). Live-probed
2026-09-28, the three apps: a Section Editor pressed "Save" on Profile ›
"Notifications" with nothing changed while the journal was at "Do not
send the email to editors."; switched back on, that account's row read
"Enable these types of notifications." unticked, the task's run left it
out and no email came, while a control account that had not saved read
ticked and got the email.
Issue report: [docs/issues/U65-A14-stats-email-optout-after-saving-notifications.md](../issues/U65-A14-stats-email-optout-after-saving-notifications.md), filed as [pkp-e2e#646](https://github.com/jardakotesovec/pkp-e2e/issues/646).

<a id="fn-f-ojs1"></a>
**f-ojs1** — fn l (`$agencies`). Live-probed 2026-09-28: td10, with the item switched off and on.
Issue report: [docs/issues/U65-OJS1-articles-report-supporting-agencies-empty.md](../issues/U65-OJS1-articles-report-supporting-agencies-empty.md), filed as [pkp-e2e#648](https://github.com/jardakotesovec/pkp-e2e/issues/648).

<a id="fn-f-ojs2"></a>
**f-ojs2** — fn l (`htmlspecialchars()` on the title). Live-probed 2026-09-28: "Bread &amp; Butter", "A &lt; B &gt;
C &amp; D"; the abstract and the press's title plain.
Issue report: [docs/issues/U65-OJS2-articles-report-title-html-codes.md](../issues/U65-OJS2-articles-report-title-html-codes.md), filed as [pkp-e2e#649](https://github.com/jardakotesovec/pkp-e2e/issues/649).

<a id="fn-f-ojs3"></a>
**f-ojs3** — fn l (`getDecisionMessage()`); OMP's `Report::getDecisionMessage()`
names `SKIP_EXTERNAL_REVIEW`, `REVERT_DECLINE`, `NEW_EXTERNAL_ROUND`,
`CANCEL_REVIEW_ROUND`, `BACK_FROM_PRODUCTION` and `BACK_FROM_COPYEDITING`.
Live-probed 2026-09-28: the cell empty and the date filled for
"Accept and Skip Review" (seeded, and recorded on screen by the assigned
Section Editor), "Revert Decline", "New Review Round" and the two moves
back a stage; the press's file named them. A cancelled round leaves no
decision to name (Rule 20b).
Issue report: [docs/issues/U65-OJS3-articles-report-decision-cell-empty.md](../issues/U65-OJS3-articles-report-decision-cell-empty.md), filed as [pkp-e2e#656](https://github.com/jardakotesovec/pkp-e2e/issues/656).

<a id="fn-f-ojs4"></a>
**f-ojs4** — fn n. Live-probed 2026-09-28: td12, the server error in fn n.
Issue report: [docs/issues/U65-OJS4-subscriptions-report-contact-no-country.md](../issues/U65-OJS4-subscriptions-report-contact-no-country.md), filed as [pkp-e2e#630](https://github.com/jardakotesovec/pkp-e2e/issues/630).

<a id="fn-f-omp1"></a>
**f-omp1** — fn f: OMP adds `DECLINE_INTERNAL` to `getDeclinedDecisions()`
only; `getOverview()` and `getAverages()` count `INITIAL_DECLINE` and
`DECLINE`, and the monthly email reads `getOverview()`. Live-probed 2026-09-28: td6; the August email read "Declined
submissions this month: 1" with one Internal Review decline and one
desk decline that month.
Issue report: [docs/issues/U65-OMP1-internal-review-decline-not-counted-declined.md](../issues/U65-OMP1-internal-review-decline-not-counted-declined.md), filed as [pkp-e2e#632](https://github.com/jardakotesovec/pkp-e2e/issues/632).

<a id="fn-f-omp2"></a>
**f-omp2** — `stats.description.daysToDecision` in lib/pkp
`locale/en/manager.po`; OMP's locale files do not override it. Live-probed 2026-09-28: td4.
Issue report: [docs/issues/U65-OMP2-press-days-to-decision-text-your-journal.md](../issues/U65-OMP2-press-days-to-decision-text-your-journal.md), filed as [pkp-e2e#653](https://github.com/jardakotesovec/pkp-e2e/issues/653).

<a id="fn-f-omp3"></a>
**f-omp3** — fn o (`retrieveLimits()`). Live-probed 2026-09-28: td13.

<a id="fn-f-omp4"></a>
**f-omp4** — fn o (`getDecisionMessage()`). Live-probed 2026-09-28: td13.

<a id="fn-f-omp5"></a>
**f-omp5** — fn d (the stages' names) and fn p (the attachment).
Live-probed 2026-09-28, a press whose primary language is French
(Canada), by the task key and by the command-line twin: the attachment's
lines read "Évaluation interne",0 and
"##workflow.review.externalReview##",3; a French journal's and preprint
server's attachments name every stage.

<a id="fn-f-ops1"></a>
**f-ops1** — fn d (`removeEditorialStatsChartView()`). Live-probed 2026-09-28: no
chart and no "Active Submissions" heading for any statistics role.

<a id="fn-f-ops2"></a>
**f-ops2** — fn f (OPS `StatsEditorialService::getOverview()`). Live-probed 2026-09-28: the
four rows on every context, the one "Decline" counted.

<a id="fn-f-ops3"></a>
**f-ops3** — Live-probed 2026-09-27 (in passing, during the
*Statistics — usage* claim check), as a manager and the site
administrator: a preprint server's "Reports" showed its line and no
link, and its "Report Plugins" had no rows, where a journal listed four
reports and a press two. fn k: OPS ships no `plugins/reports` folder.
Live-probed 2026-09-28 once more, as a manager and `admin`, on a
scratch preprint server and `publicknowledge`: the same.

<a id="fn-f-ops4"></a>
**f-ops4** — fn p; OPS `locale/en/emails.po`
`emails.statisticsReportNotification.body` keeps the line. Live-probed 2026-09-28: the line with nothing after it
in the text and HTML parts.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Statistics › "Editorial Activity": the chart, the date range, "Filters", "Trends" and its information icons | `{context}/stats/editorial` (`PKPStatsHandler::editorial()`; the op is *Statistics — usage*'s ROUTE-026, cited); `templates/stats/editorial.tpl`; `StatsEditorialPage.vue` | AFFU-247, AFFU-249, AFFU-250, AFFU-253, VUE-024 |
| The chart left out on a preprint server | OPS `StatsHandler::removeEditorialStatsChartView()` | AFFU-248 |
| The sections filter (journal, preprint server) and the series filter (press) | each app's `StatsHandler::addSectionFilters()` | AFFU-251, AFFU-252 |
| The page's figures after a range or filter change | `GET {context}/api/v1/stats/editorial`, `GET …/stats/editorial/averages` (`PKPStatsEditorialController`, each app's `StatsEditorialController`) | API-037 |
| Statistics › "Users" | `{context}/stats/users` (ROUTE-026's `users` op, cited); `templates/stats/users.tpl`; `StatsUsersPage.vue` | VUE-028 |
| "Export" and the "Export to Excel/CSV" window | `StatsUsersPage.vue::openExportModal()`, `UserExportModal.vue`, `ReportForm`; `POST {context}/stats/users` | AFFU-269, AFFU-270, VUE-080 |
| The exported file | `GET {context}/api/v1/users/report` (the users API's report request, *Users management*'s API-047, cited) | — |
| The user counts request. No screen sends it: "Users" draws its counts on the page (UNASSIGNED item 52) | `GET {context}/api/v1/stats/users` (`PKPStatsUserController`) | API-040 |
| Statistics › "Reports" and its links | `{context}/stats/reports`, `…/stats/reports/report?pluginName=` (ROUTE-026's `reports` op, cited); `templates/stats/reports.tpl` | AFFM-171, AFFU-283 |
| "Articles Report" {OJS} | `ArticleReportPlugin` | PLUG-044 |
| "Monograph Report" {OMP} | `MonographReportPlugin`, `Report` | PLUG-046 |
| "Review Report" {OJS OMP} | `ReviewReportPlugin`, `ReviewReportDAO` | PLUG-047 |
| "Subscriptions Report" {OJS} | `SubscriptionReportPlugin` | PLUG-048 |
| "COUNTER Reports" {OJS} (*Statistics — usage*'s page, cited) | `CounterReportPlugin` | — |
| The monthly routine task "Editorial Report Notification" | `PKP\task\StatisticsReport` | JOB-055 |
| Its email and attachment | `PKP\jobs\notifications\StatisticsReportMail`; `PKP\mail\mailables\StatisticsReportNotify` (`STATISTICS_REPORT_NOTIFICATION`) | JOB-015, MAIL-048 |
| Its Tasks entry and the Profile row "Statistics report summary." | `PKP\jobs\notifications\StatisticsReportNotify`; `EditorialReportNotificationManager`; `NOTIFICATION_TYPE_EDITORIAL_REPORT` | JOB-016, NOTIF-049 |
| The Profile row "Weekly email of outstanding tasks" (the outstanding-tasks email is *Submissions dashboard*'s MAIL-025, JOB-011, JOB-046; the row is *Notifications center*'s) | `NOTIFICATION_TYPE_EDITORIAL_REMINDER` | NOTIF-051 |

## Reference — code anchors

- **Pages**: `lib/pkp/pages/stats/PKPStatsHandler.php` (`editorial()`,
  `users()`, `reports()`, `displayReports()`, `report()`,
  `_getStatDescription()`); `<app>/pages/stats/StatsHandler.php`
  (`addSectionFilters()`; OPS `removeEditorialStatsChartView()`);
  `lib/pkp/templates/stats/editorial.tpl`, `users.tpl`, `reports.tpl`;
  `lib/pkp/classes/template/PKPTemplateManager.php` (the side menu).
- **Components**: `lib/pkp/classes/components/PKPStatsComponent.php`,
  `PKPStatsEditorialPage.php`;
  `lib/pkp/classes/components/forms/statistics/users/ReportForm.php`;
  `lib/ui-library/src/components/Container/StatsPage.vue`,
  `StatsEditorialPage.vue`, `StatsUsersPage.vue`;
  `pages/statsUsers/UserExportModal.vue`;
  `components/DateRange/DateRange.vue`, `Tooltip/Tooltip.vue`,
  `Chart/DoughnutChart.vue`.
- **Figures**: `lib/pkp/classes/services/PKPStatsEditorialService.php`,
  `queryBuilders/PKPStatsEditorialQueryBuilder.php`;
  `<app>/classes/services/StatsEditorialService.php`,
  `queryBuilders/StatsEditorialQueryBuilder.php`;
  `lib/pkp/api/v1/stats/editorial/PKPStatsEditorialController.php`,
  `<app>/api/v1/stats/editorial/StatsEditorialController.php`;
  `lib/pkp/api/v1/stats/users/PKPStatsUserController.php`;
  `lib/pkp/classes/user/Repository.php` (`getRolesOverview()`,
  `getReport()`), `Collector.php`, `Report.php`;
  `lib/pkp/api/v1/users/PKPUserController.php` (`getReport()`).
- **Reports**: `lib/pkp/classes/plugins/ReportPlugin.php`,
  `PluginRegistry.php`; OJS `plugins/reports/articles/ArticleReportPlugin.php`,
  `reviewReport/ReviewReportPlugin.php`, `ReviewReportDAO.php`,
  `subscriptions/SubscriptionReportPlugin.php`; OMP
  `plugins/reports/monographReport/MonographReportPlugin.php`,
  `Report.php`, `reviewReport/`.
- **Monthly email**: `lib/pkp/classes/task/StatisticsReport.php`;
  `lib/pkp/classes/scheduledTask/PKPScheduler.php`;
  `lib/pkp/jobs/notifications/StatisticsReportMail.php`,
  `StatisticsReportNotify.php`;
  `lib/pkp/classes/mail/mailables/StatisticsReportNotify.php`;
  `lib/pkp/classes/notification/managerDelegate/EditorialReportNotificationManager.php`;
  `lib/pkp/classes/notification/NotificationSubscriptionSettingsDAO.php`;
  `lib/pkp/classes/components/forms/context/PKPEmailSetupForm.php`;
  `lib/pkp/classes/notification/form/PKPNotificationSettingsForm.php`.
- **Labels**: `lib/pkp/locale/en/manager.po`, `common.po`, `user.po`;
  `<app>/locale/en/emails.po`, `manager.po`, `locale.po`; each report
  plugin's `locale/en/locale.po`.
