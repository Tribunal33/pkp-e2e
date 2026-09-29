---
name: issues
status: verified
---

# Issues {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal that publishes by issue gathers its articles into issues
(volume, number, year and an optional title) and releases each issue as a
whole. The Journal Manager creates the next issues ahead of time on the
**"Issues"** page, arranges each issue's table of contents, adds
**issue galleys** (files that carry the whole issue, such as a PDF of it)
and presses **"Publish Issue"**: the issue becomes the journal's
**current issue**, and every article scheduled into it goes live at the
same moment. Readers meet the result on the reader side: the header's
"Current" opens the current issue, "Archives" lists every published
issue, and each issue's page shows its table of contents. Which issue an
article goes into is chosen while publishing the article
([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
its Rule 5); this spec owns the issues themselves. <sup>a</sup>

OMP and OPS do not install issues: a press's and a preprint server's
editorial side menu has no "Issues" entry, their header has no "Current"
item, and an issue address typed on them opens no issue. A press
publishes through its catalog instead (*Catalog management*,
*Catalog browse*), and a preprint server posts each preprint on its own,
its "Archives" listing the preprints themselves
([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)).
<sup>b</sup> <sup>td1</sup>

## Actors & permissions

**Manager-level roles** here are the Journal Manager, the Editor and the
Production Editor; the Site Administrator counts with them. **Editorial
roles** adds to them the Section Editor, the Guest Editor and every
assistant role (Copyeditor, Designer, Funding Coordinator, Indexer, Layout
Editor, Marketing and Sales Coordinator, Proofreader, Editorial Board
Member). Nothing here depends on being assigned to a submission: a role
anywhere in the journal is enough. <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open "Issues" and use everything on it** (create, edit, arrange the table of contents, issue galleys, publish, unpublish, make current, delete, order; Rules 1–20) | • Manager-level roles: the side menu's "Issues" (under "Content") opens the page; nothing on it is gated further<br>• Everyone else: no "Issues" entry; the page's address opens the access-denied page, or the Login page when signed out <sup>c</sup> |
| **Preview an unpublished issue's page** (the row's "Preview", or the page's address; Rule 22) | • Editorial roles<br>• The Author, Reviewer, Translator, Reader and Subscription Manager are refused, and a signed-out visitor is sent to the Login page <sup>d</sup> <sup>td2</sup> |
| **Read a published issue's page, "Current" and "Archives"** (Rules 21–25) | • Anyone, signed out included, while the journal publishes online<br>• With "Publishing Mode" set to not publish online, editorial roles and the Subscription Manager only: the Reader, Author and Reviewer get the access-denied page "This journal does not publish its content online.", and a signed-out visitor is sent to the Login page (Settings bullet 1) <sup>e</sup> <sup>td16</sup> |
| **Open a "Full Issue" galley** (Rule 26) | • Anyone who may read the issue's page, on an open-access journal<br>• With "Users must be registered and log in to view open access content." ticked, signed-in visitors only (Settings bullet 3)<br>• On a subscription journal, the access rules of *Subscriptions & open access control* <sup>e</sup> |
| **Receive the issue email** (Side effects) | • Every account with an active role in the journal, the person publishing included, when that person leaves "Send an email about this to all registered users." ticked<br>• Minus those who unticked "Enable these types of notifications." for "An issue has been published." in their profile, and minus those who ticked "Do not send me an email for these types of notifications." there (see [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)) <sup>f</sup> |
| **Set an issue's identifiers, and its URN while publishing** | • Manager-level roles, on the window's "Identifiers" tab and in "Publish Issue"; the rules are [Identifiers](U44-identifiers.md) (its Rules 4, 15, 16) |
| **Place an article in an issue, or take it out through the article** | • Who may publish, and the issue choices, are [Publish, schedule & versions](U49-publish-schedule-and-versions.md) (its Rules 5 and 9) |

## Fields & validation

**The "Issues" page** (side menu › "Content" › "Issues"). Two tabs,
"Future Issues" and "Back Issues", each holding one list under a heading
of the same name. An empty list reads "No Items". <sup>a</sup> <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Create Issue" | — | Above the "Future Issues" list only; opens the "Create Issue" window (Rule 3) |
| "Order" | — | Above the "Back Issues" list only, once it holds two issues or more (Rule 20) |
| "Issue" column | — | The issue's name (Rule 2), itself a link that opens the "Issue Management" window (Rule 5) |
| "Published" column | — | "Back Issues" only: the issue's Date Published, in the journal's short date format |
| "Items" column | — | How many articles the issue holds: the articles its "Table of Contents" tab lists (Rule 9) |
| Row actions | — | Shown after pressing the small arrow at the start of the row, left to right: "Edit" (Rule 5); "Preview" on an unpublished issue, "View" on a published one, each opening the issue's page in a new tab (Rules 21, 22); "Publish Issue" (Rule 16) or "Unpublish Issue" (Rule 18); "Current Issue" on a published issue that is not the current one (Rule 17); "Delete" (Rule 19) |

<a id="issue-data"></a>
**The "Create Issue" window and the "Issue Data" tab** (the same form, top
to bottom, then "Save" and "Cancel"). <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Date Published" | Only on a published issue | A box with a date picker. On an unpublished issue the help line reads "If left empty, the date will be set automatically when the issue is published." Emptied on a published issue, "Save" is refused with "Date Published is required when the issue is published." (Rule 6). After any refused "Save" the box shows today's date, though nobody typed it and the issue saved next does not get it ⚠ [A4](#a4) <sup>l</sup> |
| "Identification": "Volume", "Number", "Year" | When their box below is ticked (Rule 4) | Three boxes side by side. "Volume" takes digits only ("Volume is required and must be a positive, numeric value."), and a "Volume" of 99999 makes "Save" fail ⚠ [A5](#a5); "Number" takes up to 40 characters of any kind (a 41st typed character does not appear); "Year" takes up to 4 characters, and anything after its leading digits is dropped without a word ⚠ [A6](#a6) <sup>td3</sup> |
| "Title" | When its box below is ticked (Rule 4) | One box; on a journal with several form languages, a box per language opens under it when it is focused |
| The boxes "Volume", "Number", "Year", "Title" | At least one (Rule 4) | Which parts make the issue's name (Rule 2). All four arrive ticked in "Create Issue" [A1](#a1) |
| "Description" | No | Formatted text, one per form language; shown on the issue's page and in the archive |
| "Cover image" | No | An upload area, "Drag and drop a file here to begin upload", with "Upload File" (Rule 7). Once a cover is saved: the image, "Alternate text" with its help text, and "Delete" |
| "URL Path" | No | "An optional path to use in the URL instead of the ID." (Rule 8) |

"Cancel" closes the window and drops typed changes without asking. With
an unsaved change in a text box, such as "Volume" or "URL Path", "Close"
and switching to another tab ask, in a browser question, "The data on
this form has changed. Do you wish to continue without saving?";
"Cancel" there keeps the window as it is. Text typed only in
"Description" raises no question: pressing another tab opens that tab at
once ⚠ [A16](#a16). <sup>i</sup>

**The "Table of Contents" tab** (the "Issue Management" window's first
tab). A list grouped under the issue's sections, one row per article, with
"Order" above it once the issue holds an article (Rules 9–13). <sup>m</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Section rows | — | The section's title; its articles listed under it |
| "Title" | — | The article's title |
| "Open Access" | — | A tick box per article, only on a journal whose "Publishing Mode" requires subscriptions and only for an issue whose "Access status" is "Subscription" (Rule 13) |
| Row actions | — | Behind the row's arrow: "Submission" (Rule 11) and "Remove" (Rule 12) |

**The "Issue Galleys" tab and its window** ("Create Issue Galley" /
"Edit Issue Galley"). The tab lists the issue galleys with "Create Issue
Galley" above the list, and "Order" once there are two galleys or more;
columns "Galley Label", "Language" (only while the journal has more than
one language) and "Publisher ID"; row actions "Edit" and "Delete". The window, top to bottom, then "Save"
and "Cancel": <sup>p</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Issue Galley" | Yes, for a new galley | An upload area with "Upload File"; any kind of file. On an existing galley, the stored file's original name as a link that downloads it in a new tab (Rules 14, 15) |
| "Galley Label" | Yes | Shown as the link's text on the issue's page ("PDF", for instance) |
| "Publisher ID" | No | Only while publisher IDs are on for issue galleys; its checks are [Identifiers](U44-identifiers.md) (its Fields, the issue galley form) |
| "Language" | Yes | A list of the journal's interface languages, arriving on the language of the forms (Rules 14, 14a) |
| "URL Path" | No | As on "Issue Data", checked against this issue's other galleys (Rule 14) |

**The "Publish Issue" window** (the row's "Publish Issue", Rule 16), top
to bottom: the box "Send an email about this to all registered users.",
arriving ticked; "Are you sure you want to publish the new issue?";
while URNs are on for issues, "URN" with the box "Assign the URN {urn}
to this issue", arriving ticked ([Identifiers](U44-identifiers.md), its
Rule 16); "Cancel" and "OK". <sup>q</sup>

**The "Access" tab** (only while "Publishing Mode" requires
subscriptions; Settings bullet 1): "Access status" ("Open access" or
"Subscription", required), "Open access date" (a date box) and "Save".
What each value lets a reader open is *Subscriptions & open access
control*. <sup>o</sup>

<a id="issue-page"></a>
**The issue's page**, top to bottom (Rules 21–23): <sup>v</sup> <sup>w</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Breadcrumb | — | "Home / Archives / {issue name}"; "Home" and "Archives" are links |
| Heading | — | The issue's name (Rule 2); the browser tab reads it followed by " \| " and the journal's name |
| "Preview" | — | A warning notice, on an unpublished issue only (Rule 22) |
| Cover image | — | When the issue has one (a cover saved for the journal's primary language shows in every interface language); a screen reader reads its alternate text, or "View {issue name}" when none was typed |
| Description | — | When the issue has one |
| "URN:" and "DOI:" lines | — | When the issue has them ([Identifiers](U44-identifiers.md), its Rule 21; *DOIs*) |
| "Published:" | — | The issue's Date Published in the journal's short date format, when it has one |
| "Full Issue" | — | A heading and one link per issue galley, labelled with its "Galley Label", in the tab's order (Rule 26) |
| Sections | — | Each section's title as a heading, then its articles, each as its article summary ([Article landing page & reading](U13-article-landing-page-and-reading.md#summary)) (Rule 23) |

**The archive's issue summary** (Rule 25), one per published issue: the
cover image as a link to the issue's page (when there is one), the title as
a link (the issue's "Title" when its box is ticked and a title is set,
with the rest of the name under it, otherwise the name), then the
description. A screen reader reads the cover as the alternate text typed
on "Issue Data", and as nothing when none was typed, where the issue's
page reads "View {issue name}" ⚠ [A7](#a7). <sup>v</sup>

## Rules & state

### The "Issues" page

1. **Two lists.** "Future Issues" holds every unpublished issue, ordered
   by year, then volume, then number, lowest first; it cannot be
   reordered. The number is compared as text, so "Vol. 1 No. 10 (2026)"
   comes before "Vol. 1 No. 2 (2026)" ⚠ [A8](#a8). "Back Issues" holds
   every published issue, in the order of Rule 20. Publishing an issue
   moves its row from the first list to the second at once, and
   unpublishing moves it back. <sup>g</sup>

<a id="issue-name"></a>
2. **The issue's name.** Everywhere an issue is named (the lists, the
   window's title, the issue's page, the email), the name is built from
   the parts whose box is ticked, in this order: "Vol. {volume}", "No.
   {number}", "({year})" (the year alone without brackets when it comes
   first), and the title after a colon. All four
   ticked gives "Vol. 1 No. 2 (2014): Special Issue"; "Volume" and "Year"
   alone give "Vol. 1 (2014)"; "Title" alone gives the title. A ticked
   "Title" with no title in the interface language shows the title of
   another language. The archive shows a set title on its own line,
   with the rest of the name under it (Fields, the archive's issue
   summary). <sup>h</sup>
3. **Creating an issue.** "Create Issue" opens the "Create Issue"
   window, the form of [Fields](#issue-data) with no tabs. A saved issue
   closes the window and appears in "Future Issues", unpublished and
   holding no article. It is born open access on an open-access journal
   and "Subscription" otherwise (Settings bullet 1). The form arrives with
   all four boxes ticked, so an issue without a title needs its "Title"
   box unticked first. With the box ticked and no title, "Save" is
   refused: the window stays open, a notice at its top right reads
   "Title is required for the issue." for a few seconds, nothing on the
   form is marked, and the list still reads "No Items" ⚠ [A1](#a1).
   <sup>i</sup> <sup>td4</sup>
4. **The ticked boxes need values.** A ticked box whose part is empty
   refuses "Save" with that part's message: "Volume is required and must
   be a positive, numeric value.", "Number is required and must be a
   positive, numeric value.", "Year is required and must be a positive,
   numeric value." or "Title is required for the issue.". With no box
   ticked, "Save" is refused with "Issue identification is required.
   Please select at least one of the issue identification options.". An
   empty part whose box is unticked is accepted. Each message of "Create
   Issue" and "Issue Data" shows for a few seconds in a notice at the
   window's top right. An empty ticked part and a missing identification
   are not marked on the form. A malformed "Volume" or "URL Path", and a
   "Date Published" emptied on a published issue, are also shown under
   their box. <sup>i</sup> <sup>td4</sup>
5. **The "Issue Management" window.** A row's "Edit", or its name, opens
   a window titled "Issue Management: {issue name}" with the tabs "Table
   of Contents", "Issue Data" and "Issue Galleys"; "Identifiers" follows
   while publisher IDs are on for issues or the URN plugin is on
   ([Identifiers](U44-identifiers.md), its Rule 15), and "Access" while
   the journal requires subscriptions (Settings bullet 1). The window
   opens on "Table of Contents". <sup>a</sup> <sup>g</sup>
6. **Saving "Issue Data".** "Save" shows "Your changes have been
   saved." and the row in its list shows the new name at once. "Date
   Published" may stay empty on an unpublished issue; publishing then
   fills it (Rule 16). On a published issue it is required (Fields), and
   a changed date shows in the "Published" column and on the issue's
   page. <sup>i</sup> <sup>l</sup>
7. **The cover image.** "Upload File" offers JPG, PNG and SVG files; the
   file uploads at once and is kept on "Save". An SVG is refused on
   "Save" with "Invalid cover page format. Accepted formats are .gif,
   .jpg, or .png." On this tab the cover belongs to the interface
   language it was saved in: in another interface language the tab shows
   none, though the issue's page may still show it (Fields, the issue's
   page). Once saved, the tab shows the image with "Alternate text",
   saved by the next "Save", and "Delete", which asks "Are you sure you
   wish to delete this item? This action cannot be undone." and on "OK"
   removes the cover and its alternate text. <sup>j</sup> <sup>td5</sup>
8. **The URL Path.** A saved "URL Path" becomes the issue's address
   (Rule 21), and the old numbered address keeps working. "Save" refuses a
   path that is only digits ("The URL path can not be a number."),
   another issue's path in the journal ("The URL path has already been
   used and can not be used again.") and any other character than
   letters, digits, "-", "_" and "." ("This may only contain letters,
   numbers, dashes, underscores and periods."). <sup>k</sup> <sup>td6</sup>

<a id="issue-toc"></a>
### The table of contents

9. **What the tab lists.** Every article with a version placed in the
   issue whose current version (Rule 9a) is scheduled or published,
   under its section: the sections in the issue's section order and the
   articles in the issue's article order (Rules 10, 10a). An article is
   placed here from its own Publication pages (see
   [Publish, schedule & versions](U49-publish-schedule-and-versions.md),
   its Rule 5); nothing on this tab adds one. An issue with no article
   reads "No Items". <sup>m</sup>
9a. **The version the tab shows.** An article's current version is its
   most recent published version, or its newest one when none is
   published; the tab lists the article under that version's title and
   section. So an article whose newer version was published with "Don't
   Assign To An Issue" stays on the tab and in "Items", under the newer
   version's title [A17](#a17). A version keeps its place in the issue
   even once unpublished (Rule 12). <sup>m</sup> <sup>f-a17</sup>
10. **"Order".** "Order" lets the articles be dragged into place within
    their section; "Done" keeps the new order, on the tab and on the
    issue's page, and "Cancel ordering" drops it. Until someone orders
    them, a section's articles come in no fixed order. <sup>m</sup>
    <sup>td7</sup>
10a. **Sections in "Order".** The sections are meant to be dragged too,
    into an order that is this issue's own and leaves the journal's
    section order and other issues alone, but no drag has yet moved a
    section heading ⚠ [A9](#a9). An article cannot be moved to another
    section here: dropped under another section, it shows there and
    "Done" is accepted, but on reopening the tab it is back in its own
    section ⚠ [A10](#a10). Its "Section" is changed on the article's
    Publication Settings. <sup>m</sup> <sup>td7</sup>
11. **"Submission".** Opens the article's workflow. <sup>m</sup>
12. **"Remove".** Asks "Are you sure you wish to remove this article from
    the issue? The article will be available for scheduling in another
    issue." under the title "Remove Article From Issue". On an article
    whose current version is in the issue, "OK" takes the article off
    the tab and unpublishes that version as the workflow's
    "Unschedule" / "Unpublish" do (see
    [Publish, schedule & versions](U49-publish-schedule-and-versions.md),
    its Rule 9): a published article's page goes offline. If it was the
    last article of its section, the section's heading leaves the tab.
    The article's workflow then reads "Unscheduled", and its "Schedule
    For Publication" arrives on "Assign To Current/Back Issue" with the
    same issue chosen. <sup>n</sup> <sup>td8</sup>
12a. **"Remove" after a newer version was published outside the issue.**
    On an article whose current version was published with "Don't Assign
    To An Issue" (Rule 9a), "OK" closes the window as usual, but the
    article stays on the tab, in "Items" and on the issue's page. What
    is unpublished instead is the earlier version that was in the issue:
    its page answers "404 Not Found" and it leaves the "Versions" list on
    the article's page. The article's page stays up as the newer version,
    and its workflow still reads "Published" ⚠ [A18](#a18). <sup>n</sup>
    <sup>f-a18</sup>
13. **"Open Access".** On a subscription journal's subscription issue,
    ticking an article's box makes that article open access and unticking
    returns it to the issue's access; each click saves at once. What that
    lets readers open is *Subscriptions & open access control*.
    <sup>o</sup>

### Issue galleys

14. **Creating an issue galley.** "Create Issue Galley" opens the window
    of Fields. "Save" needs a file, a "Galley Label" and a "Language". A
    "URL Path" is checked as in Rule 8, against this issue's galleys. A
    saved galley closes the window and joins the end of the list.
    <sup>p</sup> <sup>td9</sup>
14a. **Refused issue galleys.** The "Language" list offers the journal's
    interface languages, but "Save" accepts only one the forms are also
    in: with another, the window stays open with nothing marked and a
    notice at the top right reads "An issue galley locale is required.",
    as if no language had been chosen ⚠ [A11](#a11). A missing file ("A
    file upload is required.") and a refused "URL Path" (Rule 8's
    messages) also show only as that notice. A missing "Galley Label" is
    marked under its box: "This field is required.". <sup>p</sup>
    <sup>td9</sup>
15. **Editing, deleting and ordering.** "Edit" opens the same window
    filled in; a newly uploaded file replaces the stored one, which is
    discarded. "Delete" asks "Are you sure you wish to delete this item?
    This action cannot be undone." and on "OK" removes the galley and its
    file. "Order" drags the galleys into the order the issue's page lists
    them in, with "Done" and "Cancel ordering". <sup>p</sup>

### Publishing, the current issue, unpublishing and deleting

<a id="publish-issue"></a>
16. **"Publish Issue".** "OK" in the window of Fields publishes the issue,
    whatever it holds (an issue with no article publishes without a
    warning): <sup>q</sup> <sup>td10</sup>
    - its row moves to "Back Issues" and it becomes the current issue
      (Rule 17);
    - its Date Published stays as typed on "Issue Data", or is today when
      the box was empty;
    - every article scheduled into it is published, its page goes live,
      and it takes today as its publication date unless its version
      already carries one; an article published at once into the issue
      beforehand stays as it was;
    - the email of Side effects goes out, and its notification is
      recorded, when the box was left ticked.
    "Cancel" closes the window and changes nothing.

<a id="current-issue"></a>
17. **The current issue.** A journal has at most one current issue: the
    one the header's "Current" opens (Rule 24) and the home page shows
    ([Appearance & theming](U10-appearance-and-theming.md), its Rule 14).
    Publishing an issue always makes it current, even an older volume
    published late. "Current Issue" on another published issue's row asks
    "Are you sure you want to set this issue as current?" and on "OK"
    makes that issue current; the current issue's own row does not offer
    it. <sup>r</sup>
18. **"Unpublish Issue".** Asks "Are you sure you want to unpublish this
    published issue?"; "OK" moves the issue back to "Future Issues" with
    its Date Published kept. Every article published in it goes back to
    "Scheduled" into it: its page answers "404 Not Found" and it leaves
    the home page's lists, until the issue is published again. The
    journal is then left with no current issue, even when the issue
    unpublished was not the current one ⚠ [A2](#a2). <sup>s</sup>
    <sup>td11</sup>
19. **"Delete".** Asks "Are you sure you wish to delete this item? This
    action cannot be undone." and nothing more ⚠ [A3](#a3). "OK" removes
    the issue with its cover, its issue galleys and their files. Every
    article in it, scheduled or published, loses its issue and goes back
    to unpublished: a published article's page goes offline, yet its
    workflow header keeps reading "Published" ⚠ [A12](#a12). When the
    deleted issue was the current one, the issue at the top of "Back
    Issues" becomes current, and with no published issue left there is
    none. <sup>t</sup> <sup>td12</sup>
20. **The order of "Back Issues".** Until someone orders them, the
    current issue comes first, then the others by Date Published, newest
    first. "Order" lets the published issues be dragged into any order,
    with "Done" and "Cancel ordering". Once an order is saved, the
    archive follows it (Rule 25a), and an issue published later joins at
    the bottom of both lists, even as the current issue. <sup>u</sup>
    <sup>td13</sup>

### What readers see

21. **The issue's page.** Each issue has a page at the journal's address
    followed by "issue/view/" and either the issue's ID (the number in
    the address its row's "Preview" or "View" opens, not the issue's
    "Number") or its URL Path (Rule 8). An address that names no issue of
    the journal sends a signed-out visitor to the Login page. Its
    heading, breadcrumb and parts are those of Fields. <sup>v</sup>
22. **An unpublished issue's page is a preview.** For the roles of Actors
    row 2 it opens with the "Preview" notice at the top and lists the
    articles scheduled into the issue as well as those already published
    in it. For anyone else it is refused (Actors). <sup>d</sup> <sup>w</sup>
23. **Which articles a published issue lists.** Every article with a
    version placed in the issue whose current version (Rule 9a) is
    published, shown as that version: an article unpublished from its
    own workflow drops out; one whose newer version is not yet published
    stays, shown as its published version; one whose newer version was
    published outside the issue stays too (Rule 23a). Sections come in
    the journal's section order, or in the issue's own where one was
    saved (Rule 10a), each headed by its title unless the section omits
    it (Settings bullet 4), and a section with no article to show is
    left out. How each article is shown, and which galleys its summary
    carries, is
    [Article landing page & reading](U13-article-landing-page-and-reading.md),
    its Rule 22. <sup>w</sup>
23a. **An article whose newer version is outside the issue.** When an
    article's newer version was published with "Don't Assign To An
    Issue", the issue's page lists the article under that version's
    title and section, and its link opens that version's page, whose
    breadcrumb and "Issue" line name no issue ⚠ [A17](#a17). The article
    stays listed even after "Remove" has taken the version that was in
    the issue offline (Rule 12a). <sup>w</sup> <sup>f-a17</sup>
24. **"Current".** The header's "Current" (and the journal's address
    followed by "issue" or "issue/current") opens the current issue's
    page. With no current issue it opens a page headed "No Current Issue"
    (its browser tab reads only " | {journal name}"), with the breadcrumb
    "Home / Archives / No Current Issue" and the warning "This journal has
    not published any issues.". <sup>v</sup>

<a id="archive"></a>
25. **"Archives".** The header's "Archives" opens a page headed
    "Archives" listing one issue summary (Fields) per published issue, in
    the order of Rule 25a; unpublished issues are never listed. With
    none, the page reads "This journal has not published any issues.". A
    list longer than "Items per page" is split into pages, later ones
    headed "Archives - Page {number}", with the page links of
    [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
    (its Rule 24); a page number past the last answers "404 Not Found".
    <sup>v</sup>
25a. **The archive's order.** Once an order is saved on "Back Issues"
    (Rule 20), the archive lists the issues in that order. Before one is
    saved, it lists them in no set order: neither the current issue
    first nor newest first, as "Back Issues" does ⚠ [A13](#a13).
    <sup>u</sup> <sup>td13</sup>
26. **A "Full Issue" link.** A PDF opens in the journal's PDF reader: a
    bar across the top holds a return arrow (read to a screen reader as
    "Return to Issue Details") and the issue's name, both leading back to
    the issue's page, and "Download"; the browser tab reads "View of
    {issue name}". Any other file downloads. A galley address that names
    no galley of the issue (a wrong number, a word, another issue's
    galley) fails with an empty page ⚠ [A14](#a14). <sup>x</sup>
    <sup>td14</sup>
27. **The site's home page.** On an install whose home page lists its
    journals, each journal's entry carries "View Journal" and "Current
    Issue"; "Current Issue" opens that journal's "Current" (Rule 24),
    including for a journal with no current issue. <sup>y</sup>
    <sup>td15</sup>
28. **The journal's home page.** Its "Current Issue" part (see
    [Appearance & theming](U10-appearance-and-theming.md), its Rule 14)
    carries the current issue's name, the issue's page parts from the
    cover down (Fields), and "View All Issues". <sup>z</sup>

## Side effects

- **The issue email** ("Publish Issue" with its box ticked, on a journal
  that publishes online). It is queued for the site's background jobs,
  not sent during the press, and each recipient's copy comes from the
  person who published: subject "Just published: {issue name} of
  {journal name}", the issue's name as a link to its page and its table
  of contents in the body, and the unsubscribe footer of
  [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md).
  Recipients are those of Actors row 5; its text is the "Issue Published
  Notify" template on Settings › Workflow › "Emails" (*Emails
  management*). <sup>f</sup>
- **The notification** "An issue has been published." is created by the
  same queued job for the people of Actors row 5 (those who ticked "Do
  not send me an email for these types of notifications." included),
  but it is no task and nothing on screen lists it, so only the email
  reaches anyone. <sup>f</sup>
- **Released articles.** Each article that Rule 16 publishes behaves as
  if published from its workflow: its authors get the "Publication
  Published" email and task of
  [Publish, schedule & versions](U49-publish-schedule-and-versions.md),
  and its "Activity Log & Notes" records the publication
  ([Submission activity log & notes](U38-submission-activity-log-and-notes.md#history)).
  Unpublishing the issue and "Remove" record "The submission was
  unpublished." there too; "Delete" records only "Submission metadata
  updated" [A12](#a12). None of the three sends anything. <sup>se</sup>
- **Identifiers.** Publishing an issue assigns its URN
  ([Identifiers](U44-identifiers.md), its Rule 16) and, when the journal
  assigns DOIs to issues, creates the issue's DOI (*DOIs*). <sup>q</sup>
- **Statistics.** Each opening of an issue's page and of a "Full Issue"
  is counted for Statistics › "Issues" (*Statistics — usage*); opening a
  PDF "Full Issue" counts as a download, and its "Download" counts
  again. That page shows them from the next day: its date range ends
  yesterday. <sup>se</sup>
- Nothing else sends email: creating, editing, ordering, making current,
  unpublishing and deleting are silent. <sup>se</sup>

## Settings that modify behavior

1. **"Publishing Mode"** — Settings › Distribution › "Access"
   (*Subscriptions & open access control*). Default: on a new journal no
   choice is selected, and the journal behaves as "The journal will
   provide open access to its contents." <sup>sa</sup>
   - Open access: no "Access" tab, no "Open Access" column; a new issue
     is born open access (Rule 3).
   - "The journal will require subscriptions to access some or all of its
     contents.": the window gains "Access" (Rule 5; Fields), a new issue
     is born "Subscription", and the table of contents of a
     "Subscription" issue gains "Open Access" (Rule 13).
   - "OJS will not be used to publish the journal's contents online.": a
     new issue is born "Subscription"; the issue pages, "Current" and
     "Archives" are refused to everyone but editorial roles and the
     Subscription Manager (Actors row 3), and the articles' pages are
     refused the same way. The header then offers no "Current" and no
     "Archives", and the home page no "Current Issue", for every role.
     "Publish Issue" still offers its email box, ticked, but sends no
     email and creates no notification ⚠ [A15](#a15). <sup>td16</sup>
2. **"Delayed Open Access"** — the same screen, shown while subscriptions
   are required. Default: "Disabled". Set to a number of months,
   "Publish Issue" also sets the issue's "Access status" to
   "Subscription" and its "Open access date" to today plus that many
   months (Fields, the "Access" tab). <sup>sa</sup>
3. **"Users must be registered and log in to view open access
   content."** — Settings › Users & Roles › "Site Access Options", under
   "View Article Content". Default: unticked.
   - Unticked: a "Full Issue" link opens for anyone (Rule 26).
   - Ticked: a signed-out visitor who presses it is sent to the Login
     page first; the issue pages themselves stay open. <sup>sb</sup>
     <sup>td17</sup>
4. **A section's "Omit the title of this section from issues' table of
   contents."** — Settings › Journal › "Sections", the section's "Edit"
   (*Sections*). Default: unticked. Ticked: the issue's page, and the
   home page's "Current Issue", list the section's articles with no
   section heading above them (Rule 23); the editors' "Table of
   Contents" tab still shows the section. The same form's "Omit author
   names…" is [Article landing page & reading](U13-article-landing-page-and-reading.md)'s
   (its Settings bullet 10). <sup>sc</sup>
5. **"PDF.JS PDF Viewer"** — Settings › Website › "Plugins". Default: on.
   Off, a PDF "Full Issue" link downloads the file instead of opening the
   reader (Rule 26). <sup>x</sup>
6. **"Items per page"** — how many issues an "Archives" page lists
   (Rule 25); its screen and default are
   [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)'s.
   <sup>v</sup>
7. **Each person's "An issue has been published."** — Profile ›
   "Notifications" ([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)).
   Default: both on. Decides who gets the email, and for whom the unseen
   notification is recorded (Side effects).
8. **Publisher IDs for issues and issue galleys, and the URN plugin** —
   Settings › Workflow › Submission › "Metadata" ("Enable for Issues",
   "Enable for Issue Galleys") and the "URN" row of Settings › Website ›
   "Plugins" ([Identifiers](U44-identifiers.md)). Default: off. On, the window gains "Identifiers" (Rule 5), the galley window
   "Publisher ID" (Fields) and "Publish Issue" the URN step.

## Cross-feature interactions

- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  the issue choices offered while publishing an article (its Rule 5), the
  journal with no issue (its Rule 15), and unpublishing an article from
  its own workflow (its Rule 9). This spec's "Publish Issue" releases the
  articles that spec schedules (Rule 16 here).
- *[Identifiers](U44-identifiers.md)*: the "Identifiers" tab, the issue
  galley's "Publisher ID" and the URN step of "Publish Issue".
- *[Article landing page & reading](U13-article-landing-page-and-reading.md#summary)*:
  the article summary the table of contents is made of, and an article's
  page (its breadcrumb and "Issue" line link back here).
- *[Appearance & theming](U10-appearance-and-theming.md)*: the home
  page's "Current Issue" part, the "Journal Content Organization"
  choice showing it; the first issue created replaces a never-saved
  home page's "Latest Publications" ([its
  OJS2](U10-appearance-and-theming.md#ojs2)).
- *[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)*:
  the side menu's "Issues", the header's "Current" and "Archives", and
  the archive's page links.
- *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*:
  the "An issue has been published." preferences and the email's footer.
- *[Submission activity log & notes](U38-submission-activity-log-and-notes.md#history)*:
  the lines released, removed and unpublished articles leave.
- *[Galleys](U46-galleys.md)*: an article's own galleys, which its
  summary lists; issue galleys are this spec's.
- [Subscriptions & open access control](U51-subscriptions.md): "Publishing
  Mode", "Delayed Open Access", what "Access status", "Open access date"
  and "Open Access" let readers open, and the open-access email.
- [DOIs](U45-dois.md), [Sections](U17-sections.md),
  [Emails management](U56-emails-management.md),
  [Statistics — usage](U64-usage-statistics.md),
  [Catalog management](U70-catalog-management.md),
  [Catalog browse](U68-catalog-browse.md): issue DOIs, the section form's
  title box, the "Issue Published Notify" template, issue statistics, and a
  press's counterpart to issues.

## Canonical scenarios

Scenario 7 runs on the seeded journal and scenario 11 on the seeded press
and preprint server, with ready accounts; the others on scratch journals
with throwaway ones. The footnote holds accounts, passwords, mail
catcher's address, background-jobs command and tooling recipe. <sup>s0</sup>

1. **A journal's first issue: created, previewed and published**

   Given: Journal Manager, an Author and a Reader, and a visitor signed
   out in a second browser, on a scratch journal with no published issue
   and one unpublished issue, "Vol. 1 No. 1 (2026)", into which the
   Author's scratch article "Tidal Patterns" (section "Articles") is
   scheduled.

   - **No current issue yet**: the visitor presses "Current" in the
     journal's header: a page headed "No Current Issue", with the
     breadcrumb "Home / Archives / No Current Issue" and the warning
     "This journal has not published any issues." (Rule 24). "Archives"
     in the header opens a page headed "Archives" reading "This journal
     has not published any issues." (Rule 25). On the site's home page
     (the install's address with no journal in it), which lists the
     install's journals, this journal's entry offers "View Journal" and
     "Current Issue"; "Current Issue" opens the same "No Current Issue"
     page (Rule 27).
   - **The "Issues" page**: the Journal Manager opens the side menu's
     "Content" › "Issues" and chooses "Future Issues": the list holds
     "Vol. 1 No. 1 (2026)" with "Items" 1; "Back Issues" reads "No
     Items" (Fields; Rule 1).
   - **"Create Issue", no part ticked**: on "Future Issues" press
     "Create Issue": the "Create Issue" window opens with "Volume",
     "Number", "Year" and "Title" all ticked [A1](#a1), and under "Date
     Published" the line "If left empty, the date will be set
     automatically when the issue is published." Untick all four boxes
     and press "Save": the window stays open, and a notice at its top
     right reads "Issue identification is required. Please select at
     least one of the issue identification options." for a few seconds
     (Rule 4).
   - **A ticked part left empty**: tick "Volume", "Number" and "Year",
     type 2 in "Volume" and 1 in "Number", leave "Year" empty and press
     "Save": the notice reads "Year is required and must be a positive,
     numeric value.", and nothing on the form is marked (Rule 4).
   - **A malformed "Volume"**: replace 2 with abc in "Volume", type 2027
     in "Year" and press "Save": "Volume is required and must be a
     positive, numeric value." shows under "Volume" and in the notice
     (Rule 4; Fields).
   - **Saved**: "Date Published" now shows today's date ⚠ [A4](#a4);
     empty it. Replace abc with 2 in "Volume" and press "Save": the
     window closes, and "Future Issues" lists "Vol. 1 No. 1 (2026)", then
     "Vol. 2 No. 1 (2027)" with "Items" 0 (Rules 1, 2, 3).
   - **"Preview"**: press the small arrow at the start of the "Vol. 1
     No. 1 (2026)" row, then "Preview": the issue's page opens in a new
     tab with the "Preview" notice at the top, the heading "Vol. 1 No. 1
     (2026)", and "Tidal Patterns" under the heading "Articles" (Rule
     22; Fields, the issue's page).
   - **"Publish Issue", then "Cancel"**: back on "Issues", the row's
     arrow › "Publish Issue": the window shows, top to bottom, the box
     "Send an email about this to all registered users." (ticked), "Are
     you sure you want to publish the new issue?", "Cancel" and "OK".
     Press "Cancel": the issue stays in "Future Issues" (Rule 16;
     Fields).
   - **"Publish Issue", then "OK"**: open "Publish Issue" again, leave
     the box ticked and press "OK": the row leaves "Future Issues", and
     "Back Issues" lists "Vol. 1 No. 1 (2026)" with today's date under
     "Published"; its arrow offers "Unpublish Issue" and no "Current
     Issue" (Rules 1, 16, 17).
   - **The reader side**: the visitor presses "Current": the issue's
     page opens, with the breadcrumb "Home / Archives / Vol. 1 No. 1
     (2026)", the heading "Vol. 1 No. 1 (2026)", no "Preview" notice,
     "Published:" with today's date, and "Tidal Patterns" under
     "Articles"; the browser tab reads "Vol. 1 No. 1 (2026) | {journal
     name}". Pressing "Tidal Patterns" opens the article's page (Rules
     16, 21, 23, 24; Fields).
   - **"Archives" and the site's home page**: "Archives" lists one
     issue, "Vol. 1 No. 1 (2026)" as a link to the issue's page (Rule
     25; Fields, the archive's issue summary). On the site's home page,
     this journal's "Current Issue" now opens the issue's page (Rule
     27).
   - **The issue email**: run the site's background jobs: the mail
     catcher holds, for the Journal Manager, the Author and the Reader
     each, an email from the Journal Manager with the subject "Just
     published: Vol. 1 No. 1 (2026) of {journal name}", whose body holds
     the issue's name as a link to its page and the issue's table of
     contents with "Tidal Patterns", and which ends with the unsubscribe
     footer of [Notifications center & email
     preferences](U05-notifications-center-and-email-preferences.md)
     (Actors row 5; Side effects).
   - **Control**: "Vol. 2 No. 1 (2027)" is still under "Future Issues",
     and "Archives" does not list it (Rule 25). <sup>s0</sup>

2. **An issue's data: its name, description, cover, URL Path and date**

   Given: Journal Manager, and a visitor signed out in a second browser,
   on a scratch journal with the published, current issue "Vol. 1 No. 1
   (2025)", dated 2025-03-01, and the unpublished issue "Vol. 1 No. 2
   (2026)", neither with a title, a description or a cover.

   - **The window**: on "Issues" › "Back Issues", the "Vol. 1 No. 1
     (2025)" row's arrow › "Edit": a window titled "Issue Management:
     Vol. 1 No. 1 (2025)" opens on "Table of Contents", with the tabs
     "Table of Contents", "Issue Data" and "Issue Galleys" and no
     "Access" or "Identifiers" (Rule 5).
   - **A title**: choose "Issue Data", tick the "Title" box, type
     Special Issue in the "Title" field and press "Save": "Your changes
     have been saved." shows, and the issue's row in "Back Issues" reads
     "Vol. 1 No. 1 (2025): Special Issue" (Rules 2, 6).
   - **Fewer parts**: untick the "Number" box and press "Save": the row
     reads "Vol. 1 (2025): Special Issue" (Rule 2).
   - **Leaving with an unsaved change**: type An issue about tides. in
     "Description" and tides in "URL Path" (the description alone would
     raise no question [A16](#a16)), then press the "Table of Contents"
     tab: the browser asks "The data on this form has changed. Do you
     wish to continue without saving?"; press its "Cancel": the window
     stays on "Issue Data" with both texts. Press the window's "Close":
     the same question; press its "Cancel" again. Now press the form's
     "Cancel": the window closes without asking. Reopen "Edit" › "Issue
     Data": "Description" and "URL Path" are empty (Fields, after the
     "Issue Data" table).
   - **A description and a cover**: type An issue about tides. in
     "Description", press "Upload File" under "Cover image", choose
     profile-image-400.png and press "Save". Close the window and reopen
     "Edit" › "Issue Data": it shows the image with "Alternate text" and
     "Delete". Type A tide chart in "Alternate text" and press "Save"
     (Rules 6, 7; Fields).
   - **The reader side**: the visitor presses "Current": the page is
     headed "Vol. 1 (2025): Special Issue" and shows the cover, which a
     screen reader reads as "A tide chart", then "An issue about
     tides." and "Published:" with 2025-03-01. On "Archives" the issue's
     summary shows the cover as a link, "Special Issue" as a link on its
     own line with "Vol. 1 (2025)" under it, then "An issue about tides."
     (Rule 2; Fields, the issue's page and the archive's issue summary).
   - **A URL Path**: on "Issue Data" type 123 in "URL Path" and press
     "Save": refused with "The URL path can not be a number.". Replace
     it with spring-2025 and press "Save". The visitor opens the
     journal's address followed by "issue/view/spring-2025": the issue's
     page opens, and so does the address the row's "View" opens, which
     carries the issue's ID (Rules 8, 21).
   - **"Date Published" emptied**: empty "Date Published" and press
     "Save": refused with "Date Published is required when the issue is
     published.", under the box and in the notice (Rules 4, 6). The box
     now shows today's date ⚠ [A4](#a4); replace it with 2025-04-01 and
     press "Save": the "Published" column of "Back Issues" and the
     issue's "Published:" line show 2025-04-01 (Rule 6).
   - **The cover deleted**: on "Issue Data" press the cover's "Delete":
     it asks "Are you sure you wish to delete this item? This action
     cannot be undone."; press "OK": the image and its alternate text
     are gone. The visitor reloads the issue's page: it shows no cover
     (Rule 7; Fields).
   - **The other issue's path and cover**: on "Future Issues", "Vol. 1
     No. 2 (2026)"'s arrow › "Edit" › "Issue Data": type spring-2025 in
     "URL Path" and press "Save": refused with "The URL path has already
     been used and can not be used again.". Replace it with `a b`:
     refused with "This may only contain letters, numbers, dashes,
     underscores and periods.". Empty "URL Path", press "Upload File"
     and choose cover.svg: it uploads at once; press "Save": refused
     with "Invalid cover page format. Accepted formats are .gif, .jpg,
     or .png." (Rules 7, 8). Press the form's "Cancel".
   - **Control**: reopen "Vol. 1 No. 2 (2026)"'s "Issue Data", leave
     "Date Published" empty, type autumn-2026 in "URL Path" and press
     "Save": "Your changes have been saved." (Rules 6, 8). <sup>s0</sup>

3. **The table of contents: its order and a removed article**

   Given: Journal Manager, and a visitor signed out in a second browser,
   on a scratch journal with the sections "Articles" and "Reviews",
   "Reviews" with "Omit the title of this section from issues' table of
   contents." ticked, the published, current issue "Vol. 1 No. 1
   (2026)" holding the published articles "Tidal Patterns" and "Coastal
   Winds" in "Articles" and "A Review of Tides" in "Reviews", and the
   unpublished issue "Vol. 1 No. 2 (2026)" into which "Storm Surges" is
   scheduled.

   - **What the tab lists**: on "Issues" › "Back Issues" the "Vol. 1
     No. 1 (2026)" row reads "Items" 3; its arrow › "Edit" opens the
     "Table of Contents" tab: "Tidal Patterns" and "Coastal Winds" under
     "Articles", "A Review of Tides" under "Reviews", "Order" above the
     list, and no "Open Access" column (Rule 9; Fields; Settings bullets
     1, 4).
   - **The scheduled issue**: on "Future Issues", "Vol. 1 No. 2
     (2026)"'s "Edit" lists "Storm Surges" under "Articles" (Rule 9).
   - **The reader side**: the visitor presses "Current": the issue's
     page lists "Tidal Patterns" and "Coastal Winds" under the heading
     "Articles", and "A Review of Tides" with no section heading above
     it (Rule 23; Settings bullet 4). The visitor opens "A Review of
     Tides", notes its page's address and goes back to the issue's page.
   - **"Order", then "Done"**: back on "Vol. 1 No. 1 (2026)"'s "Table of
     Contents" press "Order", drag the lower of the two "Articles" rows
     above the other and press "Done": the tab keeps the new order, and
     the visitor, reloading the issue's page, sees the two articles in
     the same order (Rule 10).
   - **"Order", then "Cancel ordering"**: press "Order", drag the upper
     of the two "Articles" rows below the other and press "Cancel
     ordering": the tab shows the order "Done" saved (Rule 10).
   - **"Submission"**: on the "A Review of Tides" row press the arrow,
     then "Submission": the article's workflow opens; note the
     workflow's address and go back to "Issues" (Rule 11).
   - **"Remove"**: on "Vol. 1 No. 1 (2026)"'s "Table of Contents",
     "A Review of Tides"'s arrow › "Remove": a window "Remove Article
     From Issue" asks "Are you sure you wish to remove this article from
     the issue? The article will be available for scheduling in another
     issue."; press "OK": the article leaves the tab, and so does the
     "Reviews" heading, whose last article it was (Rule 12).
   - **After the removal**: the visitor reloads the issue's page: "A
     Review of Tides" is gone; the visitor opens the article's noted
     address: its page is offline (Rules 12, 23). The Journal Manager
     opens the workflow's noted address: it reads "Unscheduled", and its
     "Schedule For Publication" opens on "Assign To Current/Back Issue"
     with "Vol. 1 No. 1 (2026)" chosen (Rule 12). The workflow header's "Activity Log" › "History"
     (see [Submission activity log &
     notes](U38-submission-activity-log-and-notes.md#history)) holds
     "The submission was unpublished." (Side effects).
   - **Control**: the visitor's issue page still lists "Tidal Patterns"
     and "Coastal Winds" in the saved order, and the mail catcher holds
     no email about the removal (Rule 12; Side effects). <sup>s0</sup>

4. **Issue galleys and the "Full Issue"**

   Given: Journal Manager, and a visitor signed out in a second browser,
   on a scratch journal with the published, current issue "Vol. 1 No. 1
   (2026)" and no issue galley.

   - **The empty tab**: on "Issues" › "Back Issues", the row's arrow ›
     "Edit" › "Issue Galleys": the list reads "No Items", with "Create
     Issue Galley" above it and no "Order" (Fields).
   - **No file**: press "Create Issue Galley", type PDF in "Galley
     Label", leave "Language" as it arrives and press "Save" with no
     file: the window stays open and the notice at its top right reads
     "A file upload is required." (Rule 14a).
   - **No label**: press "Upload File" under "Issue Galley" and choose
     article.pdf, empty "Galley Label" and press "Save": "This field is
     required." shows under "Galley Label" (Rule 14a).
   - **Saved**: type PDF in "Galley Label" and press "Save": the window
     closes and the list shows "PDF" (Rule 14).
   - **A second galley**: press "Create Issue Galley", upload notes.md,
     type Notes in "Galley Label" and press "Save": "Notes" joins the
     end of the list, and "Order" shows above it (Rule 14; Fields).
   - **The reader side**: the visitor presses "Current": under the
     heading "Full Issue" the page lists "PDF", then "Notes". Press
     "PDF": the journal's PDF reader opens, with a bar across the top
     holding a return arrow (read to a screen reader as "Return to Issue
     Details"), "Vol. 1 No. 1 (2026)" and "Download"; the browser tab
     reads "View of Vol. 1 No. 1 (2026)". Press the return arrow: the
     issue's page is back. Press "Notes": the file downloads (Actors row
     4; Rule 26; Fields).
   - **"Order"**: the Journal Manager presses "Order" on "Issue
     Galleys", drags "Notes" above "PDF" and presses "Done". The visitor
     reloads the issue's page: "Notes", then "PDF" (Rule 15).
   - **A file replaced**: "PDF"'s "Edit" opens "Edit Issue Galley" with
     "PDF" in "Galley Label" and "article.pdf" as a link under "Issue
     Galley"; press "Upload File", choose replacement.pdf and press
     "Save". Reopen "Edit": the link reads "replacement.pdf" (Rule 15;
     Fields).
   - **A galley deleted**: "Notes"'s "Delete" asks "Are you sure you
     wish to delete this item? This action cannot be undone."; press
     "OK": "Notes" leaves the list. The visitor reloads the issue's
     page: "Full Issue" lists "PDF" alone (Rule 15).
   - **Control**: the visitor's "PDF" still opens the PDF reader (Rule
     26). <sup>s0</sup>

5. **The current issue and the order of "Back Issues"**

   Given: Journal Manager, and a visitor signed out in a second browser,
   on a scratch journal with the published issues "Vol. 1 No. 1 (2024)"
   dated 2024-03-01, "Vol. 2 No. 1 (2025)" dated 2025-03-01 (the current
   issue) and "Vol. 3 No. 1 (2026)" dated 2026-03-01, and the unpublished
   issue "Vol. 4 No. 1 (2027)" holding no article.

   - **Before any order**: "Issues" › "Back Issues" lists "Vol. 2 No. 1
     (2025)", "Vol. 3 No. 1 (2026)", "Vol. 1 No. 1 (2024)", with "Order"
     above the list: the current issue first, then the others newest
     first (Rule 20). The visitor's "Current" opens "Vol. 2 No. 1
     (2025)" (Rule 24).
   - **"Current Issue"**: "Vol. 2 No. 1 (2025)"'s arrow offers no
     "Current Issue". On "Vol. 3 No. 1 (2026)"'s arrow press "Current
     Issue": it asks "Are you sure you want to set this issue as
     current?"; press "OK". The visitor's "Current" now opens "Vol. 3
     No. 1 (2026)", and after a reload "Back Issues" lists "Vol. 3 No. 1
     (2026)", "Vol. 2 No. 1 (2025)", "Vol. 1 No. 1 (2024)" (Rules 17,
     20).
   - **"Order", then "Done"**: press "Order", drag "Vol. 1 No. 1
     (2024)" to the top and press "Done": "Back Issues" lists "Vol. 1
     No. 1 (2024)", "Vol. 3 No. 1 (2026)", "Vol. 2 No. 1 (2025)", and
     the visitor's "Archives" lists them in the same order (Rules 20,
     25a).
   - **"Order", then "Cancel ordering"**: press "Order", drag "Vol. 2
     No. 1 (2025)" to the top and press "Cancel ordering": the list is
     as "Done" left it (Rule 20).
   - **Published later**: on "Future Issues", "Vol. 4 No. 1 (2027)"'s
     arrow › "Publish Issue"; untick "Send an email about this to all
     registered users." and press "OK": it publishes with no warning
     though it holds no article. The visitor's "Current" opens it, and
     "Back Issues" and "Archives" both list it last (Rules 16, 17, 20).
   - **Control**: "Vol. 4 No. 1 (2027)"'s arrow offers no "Current
     Issue", and "Vol. 3 No. 1 (2026)"'s offers it again (Rule 17).
     <sup>s0</sup>

6. **"Unpublish Issue" and "Delete"**

   Given: Journal Manager, and a visitor signed out in a second browser,
   on a scratch journal with the published issues "Vol. 1 No. 1 (2025)",
   dated 2025-03-01 and holding the published article "Tidal Patterns",
   and "Vol. 1 No. 2 (2026)", dated 2026-03-01, the current issue,
   holding the published article "Coastal Winds".

   - **The pages before**: the visitor opens "Coastal Winds" from the
     issue's page that "Current" opens, and notes its address.
   - **"Unpublish Issue"**: on "Issues" › "Back Issues", "Vol. 1 No. 2
     (2026)"'s arrow › "Unpublish Issue" asks "Are you sure you want to
     unpublish this published issue?"; press "OK": the issue moves to
     "Future Issues", and its "Edit" › "Issue Data" still shows
     2026-03-01 in "Date Published" (Rule 18).
   - **The reader side**: the visitor reloads "Coastal Winds"'s page: it
     answers "404 Not Found". "Current" opens "No Current Issue", and
     "Archives" lists "Vol. 1 No. 1 (2025)" alone (Rules 18, 24, 25).
   - **The History**: open "Coastal Winds"'s workflow (the arrow ›
     "Submission" on "Vol. 1 No. 2 (2026)"'s "Table of Contents"): the
     header's "Activity Log" › "History" holds "The submission was
     unpublished." (Side effects).
   - **Published again**: on "Future Issues", "Vol. 1 No. 2 (2026)"'s
     arrow › "Publish Issue"; untick the email box and press "OK". The
     visitor reloads "Coastal Winds"'s page: it opens again, and
     "Current" opens "Vol. 1 No. 2 (2026)" (Rules 17, 18).
   - **"Delete"**: on "Back Issues", "Vol. 1 No. 2 (2026)"'s arrow ›
     "Delete" asks "Are you sure you wish to delete this item? This
     action cannot be undone." and nothing about its article ⚠
     [A3](#a3); press "OK": the row is gone (Rule 19).
   - **After the delete**: "Vol. 1 No. 1 (2025)", the top of "Back
     Issues", is now the current issue: the visitor's "Current" opens
     it. The visitor reloads "Coastal Winds"'s page: it is offline (its
     workflow header still reads "Published" ⚠ [A12](#a12)) (Rule 19).
   - **Control**: "Tidal Patterns" stays listed on "Vol. 1 No. 1
     (2025)"'s page throughout (Rule 19). <sup>s0</sup>

7. **Who may open "Issues" and an unpublished issue's page**

   Given: the Journal Manager, a Section Editor, a Copyeditor, an Author
   and a Reader, and a visitor signed out, on the seeded journal with its
   published issue "Vol. 1 No. 2 (2014)" and its unpublished issue "Vol.
   2 No. 1 (2015)".

   - **The Journal Manager**: the side menu's "Content" › "Issues" opens
     the "Issues" page; copy its address. On "Future Issues", "Vol. 2
     No. 1 (2015)"'s arrow › "Preview" opens the issue's page with the
     "Preview" notice; copy that address too (Actors rows 1, 2).
   - **The Section Editor and the Copyeditor**: each has no "Issues" in
     the side menu, and the "Issues" address opens the access-denied
     page. The preview's address opens the issue's page with the
     "Preview" notice (Actors rows 1, 2; Rule 22).
   - **The Author and the Reader**: the "Issues" address opens the
     access-denied page, and the preview's address is refused: no
     issue's page opens (Actors rows 1, 2).
   - **Signed out**: the "Issues" address and the preview's address each
     open the Login page, and so does the journal's address followed by
     "issue/view/999999", which names no issue (Actors rows 1, 2; Rule
     21).
   - **Control**: each of them, the visitor included, opens "Vol. 1 No.
     2 (2014)" with the header's "Current" (Actors row 3). <sup>s0</sup>

8. **A journal that requires subscriptions**

   Given: Journal Manager, on a scratch journal whose "Publishing Mode"
   is "The journal will require subscriptions to access some or all of
   its contents.", with the unpublished issue "Vol. 1 No. 1 (2026)" into
   which the scratch article "Tidal Patterns" is scheduled.

   - **The window's tabs**: on "Issues" › "Future Issues", the row's
     arrow › "Edit": the tabs read "Table of Contents", "Issue Data",
     "Issue Galleys" and "Access" (Rule 5; Settings bullet 1).
   - **"Access"**: the tab holds "Access status" on "Subscription",
     "Open access date" and "Save" (Fields; Rule 3).
   - **"Open Access"**: on "Table of Contents" the "Tidal Patterns" row
     carries an "Open Access" tick box; tick it, close the window and
     reopen "Edit": the box is still ticked (Rule 13).
   - **A new issue**: press "Create Issue", type 1 in "Volume", 2 in
     "Number" and 2026 in "Year", untick "Title" and press "Save". "Vol.
     1 No. 2 (2026)"'s "Edit" › "Access" shows "Access status" on
     "Subscription" (Rule 3; Settings bullet 1).
   - **Control**: on the open-access journals of scenarios 2 and 3 the
     same window had no "Access" tab and the "Table of Contents" no
     "Open Access" column (Settings bullet 1). <sup>s0</sup>

9. **A journal that does not publish online**

   Given: the Journal Manager, a Section Editor, a Subscription Manager,
   a Reader, an Author and a Reviewer, and a visitor signed out, on a
   scratch journal whose "Publishing Mode" is "OJS will not be used to
   publish the journal's contents online.", with the published issue
   "Vol. 1 No. 1 (2026)" holding the published article "Tidal Patterns"
   and the unpublished issue "Vol. 1 No. 2 (2026)".

   - **The addresses**: the Journal Manager opens "Issues" › "Back
     Issues", the row's arrow › "View": the issue's page opens in a new
     tab; copy its address and that of "Tidal Patterns"'s page (Actors
     row 3).
   - **Signed out**: the journal's header has no "Current" and no
     "Archives", and its home page no "Current Issue". The issue's
     address and the article's address each open the Login page
     (Settings bullet 1; Actors row 3).
   - **The Reader, the Author and the Reviewer**: each one's header has
     no "Current" and no "Archives"; the issue's address and the
     article's address each open the access-denied page "This journal
     does not publish its content online." (Settings bullet 1; Actors
     row 3).
   - **The Section Editor and the Subscription Manager**: each one's
     header has no "Current" and no "Archives"; the issue's address
     opens the page headed "Vol. 1 No. 1 (2026)" with "Tidal Patterns",
     and the article's address opens the article's page (Actors row 3;
     Settings bullet 1).
   - **"Publish Issue"**: the Journal Manager opens "Vol. 1 No. 2
     (2026)"'s "Publish Issue": the box "Send an email about this to all
     registered users." arrives ticked ⚠ [A15](#a15); press "OK": the
     issue moves to "Back Issues". Run the site's background jobs: the
     mail catcher holds no "Just published: Vol. 1 No. 2 (2026) of
     {journal name}" email for any of the journal's accounts (Settings
     bullet 1).
   - **Control**: on the seeded journal, which publishes online, the
     signed-out visitor's header offers "Current" and "Archives"
     (Settings bullet 1). <sup>s0</sup>

10. **Registered readers only, with the PDF reader off**

    Given: a Reader, signed out, on a scratch journal with "Users must
    be registered and log in to view open access content." ticked and
    "PDF.JS PDF Viewer" off, with the published, current issue "Vol. 1
    No. 1 (2026)" whose issue galley is "PDF".

    - **Signed out**: press "Current" in the header: the issue's page
      opens and lists "PDF" under "Full Issue"; press "PDF": the Login
      page opens (Settings bullet 3).
    - **Signed in**: sign in there as the Reader, then press "Current"
      and "PDF" again: the browser downloads the file instead of opening
      the PDF reader (Actors row 4; Settings bullets 3, 5).
    - **Control**: scenario 4's signed-out visitor, on a journal with the
      box unticked and "PDF.JS PDF Viewer" on (both install defaults),
      opened "PDF" at once in the PDF reader (Settings bullets 3, 5).
      <sup>s0</sup>

11. **No issues** {OMP OPS}

    Given: Press Manager (Preprint Server Manager), and a visitor signed
    out, on the seeded press (the seeded preprint server).

    - **The side menu**: the Press Manager's editorial side menu has no
      "Issues" (Purpose, the absence paragraph).
    - **The header**: the visitor's header has no "Current" (Purpose,
      the absence paragraph).
    - **An issue address**: the visitor opens the press's (the
      server's) address followed by "issue/current": no issue's page
      opens (Purpose, the absence paragraph).
    - **Control**: on the seeded journal the Journal Manager's side menu
      lists "Issues" under "Content", and the visitor's "Current", like
      the journal's address followed by "issue/current", opens "Vol. 1
      No. 2 (2014)" (Actors rows 1, 3; Rule 24). <sup>s0</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - a cover saved for the journal's primary language, shown on the
    issue's page in another interface language while "Issue Data"
    there shows none (Rule 7; Fields, the issue's page)
  - an "Archives" page number past the last, answering "404 Not Found"
    (Rule 25)
  - the Editor, the Production Editor and the Site Administrator,
    offered the "Issues" page the Journal Manager of scenarios 1 to 6
    is (Actors row 1)
  - the Guest Editor and the other assistant roles, offered what the
    Section Editor and the Copyeditor of scenario 7 are (Actors rows 1,
    2)
- **Register carries it**:
  - A1 ("Create Issue" refusing its own ticked "Title" with a passing
    notice; Rule 3; scenario 1 passes the ticked box)
  - A2 (unpublishing a back issue that is not current leaving no
    current issue; Rule 18)
  - A4 (today's date shown in "Date Published" after a refused "Save";
    Fields; scenarios 1 and 2 pass it)
  - A5 (a "Volume" of 99999 failing the save; Fields)
  - A6 (a "Year" with letters saved as its leading digits; Fields)
  - A7 (an archive cover with no alternate text read as nothing; Fields,
    the archive's issue summary)
  - A8 ("Future Issues" comparing numbers as text; Rule 1)
  - A9 (a section dragged in the table of contents' "Order"; Rule 10a)
  - A10 (an article dropped under another section snapping back; Rule
    10a)
  - A11 (an interface-only language refused for an issue galley; Rule
    14a)
  - A12 (a deleted issue's articles still reading "Published" in their
    workflow; Rule 19; scenario 6 passes it)
  - A13 ("Archives" in no set order before "Back Issues" is ordered;
    Rule 25a)
  - A14 (a galley address naming no galley of the issue failing with an
    empty page; Rule 26)
  - A15 (the email box still offered, ticked, on a journal that does not
    publish online; Settings bullet 1; scenario 9 passes it)
  - A16 (another tab opening with no question after text typed only in
    "Description"; Fields, after the "Issue Data" table; scenario 2
    passes it)
  - A17 (an article whose newer version was published with "Don't
    Assign To An Issue" still listed in the issue; Rules 9a, 23a)
  - A18 ("Remove" on such an article unpublishing its earlier version
    and leaving it in the issue; Rule 12a)
- **No seed**:
  - "Delayed Open Access" set to a number of months, and the "Access
    status" and "Open access date" "Publish Issue" then sets (Settings
    bullet 2)
  - issue views and downloads in Statistics › "Issues" (Side effects)
- **Owned by another feature**:
  - the issue's "Identifiers" tab, the issue galley's "Publisher ID" and
    the URN step of "Publish Issue" (Actors row 6; Settings bullet 8;
    *[Identifiers](U44-identifiers.md)*, scenario 6)
  - placing an article in an issue (Actors row 7; *[Publish, schedule &
    versions](U49-publish-schedule-and-versions.md)*, scenario 11)
  - "Archives" over more than one page (Rule 25; *[Navigation menus &
    site chrome](U08-navigation-menus-and-site-chrome.md)*, scenario 10)
  - "Items per page" (Settings bullet 6; *[Navigation menus & site
    chrome](U08-navigation-menus-and-site-chrome.md)*, scenario 10)
  - the journal home page's "Current Issue" part (Rule 28;
    *[Appearance & theming](U10-appearance-and-theming.md)*, scenario
    10)
  - a person's "An issue has been published." turned off (Settings
    bullet 7; *[Notifications center & email
    preferences](U05-notifications-center-and-email-preferences.md)*,
    scenario 9)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25; A17, A18 2026-09-28),
unreviewed unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | "Create Issue" arrives with "Title" ticked, and "Save" without a title is refused with only a passing notice; the "Title" box is not marked | 🐞 | user-visible | — |
| [A2](#a2) | Unpublishing any issue leaves the journal with no current issue | 🐞 | user-visible | — |
| [A4](#a4) | After a refused "Save", "Date Published" shows today's date, which the issue saved next does not get | 🐞 | minor | — |
| [A5](#a5) | A "Volume" of 99999 leaves "Create Issue" open with nothing shown | 🐞 | minor · crash: server | — |
| [A6](#a6) | "Year" accepts letters: "20a6" is saved as 20 without a message | 🐞 | user-visible | — |
| [A8](#a8) | "Future Issues" lists "No. 10" before "No. 2" | 🐞 | minor | — |
| [A10](#a10) | An article dropped under another section in "Order" is back in its own section on reopening | 🐞 | minor | — |
| [A11](#a11) | "Create Issue Galley" offers interface-only languages, then refuses them as if no language were chosen | 🐞 | user-visible | — |
| [A12](#a12) | After "Delete" of their issue, offline articles still read "Published" in their workflow, and their history does not say they were unpublished | 🐞 | user-visible | — |
| [A13](#a13) | "Archives" lists the issues in no set order until someone orders "Back Issues" | 🐞 | user-visible | — |
| [A14](#a14) | A galley address that names no galley of the issue fails with an empty page | 🐞 | user-visible · crash: server | — |
| [A16](#a16) | With only "Description" changed on "Issue Data", another tab opens without the unsaved-change question | 🐞 | minor | — |
| [A17](#a17) | An article whose newer version was published with "Don't Assign To An Issue" stays listed in the issue, under the newer title, linking to a page that names no issue | 🐞 | user-visible | — |
| [A18](#a18) | On such an article, "Remove" leaves it in the issue and unpublishes its earlier version, the one the issue published | 🐞 | user-visible | — |
| [A3](#a3) | "Delete" takes an issue's published articles offline behind a generic confirmation | ❓ | user-visible | — |
| [A7](#a7) | On "Archives", a cover with no alternate text is a link with no name | ❓ | minor | — |
| [A9](#a9) | No section could be moved in the table of contents' "Order" | ❓ | minor | — |
| [A15](#a15) | On a journal that does not publish online, "Publish Issue" still offers its email, ticked, and sends nothing | ❓ | user-visible | — |

### All apps

<a id="a1"></a>
**A1 — "Create Issue" refuses its own default with only a passing notice** · 🐞 · user-visible.
The "Create Issue" form arrives with the "Title" box ticked, and most
issues have no title. A Journal Manager who fills in Volume, Number and
Year and presses "Save" gets no new issue: the window stays open, a
notice at its top right reads "Title is required for the issue." for a
few seconds, the "Title" box is not marked, and "Future Issues" still
reads "No Items". The form should either arrive with "Title" unticked or
mark the "Title" box with its message. Basis: probe, 2026-09-25.
<sup>f-a1</sup>

<a id="a2"></a>
**A2 — Unpublishing any issue removes the current issue** · 🐞 · user-visible.
"Unpublish Issue" on any published issue, including an old back issue
that is not the current one, leaves the journal with no current issue.
"Current" is expected to keep showing the current issue; instead it
opens "No Current Issue" with "This journal has not published any
issues." while "Archives" still lists the published issues, and the
home page's "Current Issue" part goes. This lasts until a manager
presses "Current Issue" on a row or publishes an issue. Basis: probe,
2026-09-25. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Deleting an issue unpublishes its articles with a generic warning** · ❓ · user-visible.
"Delete" on an issue asks only "Are you sure you wish to delete this item?
This action cannot be undone.". Pressing "OK" also takes every article
published in the issue offline and sends every article in it back to
unpublished, which the question does not mention; the app carries a
fitting warning ("All articles will be returned to the editing queue and
all associated files will be permanently removed. Are you sure you want
to remove this issue?") that nothing shows. Question: should deleting an
issue that holds articles warn about them, or be refused while it holds
published ones? Lean: warn with the existing text; a published issue is
better unpublished first. Basis: probe, 2026-09-25. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Date Published" shows a date the issue never gets** · 🐞 · minor.
After "Save" is refused on "Create Issue" or "Issue Data", the "Date
Published" box shows today's date, though nobody typed it. The issue
saved next has no Date Published, so the box showed a date the issue
never got. The box should keep what was typed, empty included. Basis:
probe, 2026-09-25. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A large "Volume" fails the save** · 🐞 · minor · crash: server.
With "Volume" 99999 on "Create Issue", "Save" fails: the window stays
open with no message, no issue is created, and the app has failed on the
server. The Journal Manager expects either the issue or a message saying
what "Volume" accepts. Basis: probe, 2026-09-25. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — "Year" accepts letters** · 🐞 · user-visible.
A "Year" of "20a6" is saved without a message as 20, and the issue is
named "Vol. 1 No. 2a (20)" in the lists and on its page. "Volume" refuses
letters with a message; "Year" should do the same. Basis: probe,
2026-09-25. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The archive's cover has no name when no alternate text was typed** · ❓ · minor.
On "Archives", an issue's cover is a link to the issue's page. With no
alternate text typed on "Issue Data", a screen reader reads the cover as
nothing, so the link has no name, while the issue's page reads the same
cover as "View {issue name}". Question: should the archive's cover fall
back to "View {issue name}" as the issue's page does? Lean: yes; a link
with no name is announced as a bare link. Basis: probe, 2026-09-25.
<sup>f-a7</sup>

<a id="a8"></a>
**A8 — "Future Issues" sorts numbers as text** · 🐞 · minor.
"Future Issues" is ordered by year, volume and number, but the number is
compared as text: "Vol. 1 No. 10 (2026)" is listed before "Vol. 1 No. 2
(2026)". A Journal Manager planning issues ahead expects No. 2 before
No. 10. Basis: probe, 2026-09-25. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — No section could be moved in the table of contents' "Order"** · ❓ · minor.
Sections are expected to be draggable in the "Table of Contents" tab's
"Order", into an order of the issue's own that its page follows (Rule
10a). In two separate runs no drag moved a section heading above
another: the articles moved within their sections, and a "Done" left the
section order as it was. Question: can a section be moved here in an
ordinary desktop browser? Lean: no, which makes it a defect, since the
issue's page follows a section order nobody can set; one drag by hand of
a section heading, then "Done" and reopening the tab, settles it. Basis:
probe, 2026-09-25 (automated drags only). <sup>f-a9</sup>

<a id="a10"></a>
**A10 — An article dropped under another section snaps back** · 🐞 · minor.
In the table of contents' "Order", an article can be dragged under
another section: it shows there and "Done" is accepted, but on reopening
the tab it is back in its own section, and the "Section" on its
Publication Settings is unchanged. The screen accepts a move it does not
keep; it should either refuse the drop or move the article. Basis: probe,
2026-09-25. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — An issue galley in an interface-only language is refused as if no language were chosen** · 🐞 · user-visible.
The "Language" list of "Create Issue Galley" offers every interface
language, but "Save" with a language the forms are not in keeps the
window open with nothing marked and the notice "An issue galley locale
is required.". The Journal Manager picked an offered language and is
told to pick one. The list should offer only the languages "Save"
accepts, or "Save" should accept what the list offers. Basis: probe,
2026-09-25. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — Deleting an issue leaves its articles marked "Published"** · 🐞 · user-visible.
After "Delete" takes an issue away, its formerly published articles are
offline: their pages answer "404 Not Found" and their Publication
Settings read "Status: Unscheduled". Yet each article's workflow header
keeps reading "Published" with "Return to Workflow", and its History
records only "Submission metadata updated", where unpublishing the issue
or "Remove" records "The submission was unpublished.". An editor
reading the workflow is told the article is live when it is not. Basis:
probe, 2026-09-25. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — "Archives" follows no order until "Back Issues" is ordered** · 🐞 · user-visible.
Until a Journal Manager saves an order with "Order" on "Back Issues",
the reader's "Archives" lists the published issues in no set order:
neither the current issue first nor newest first, as "Back Issues" does.
On one journal "Archives" read 2024, 2026, 2025 where "Back Issues" read
2025, 2026, 2024. Readers expect the archive in the order the journal
sees on "Back Issues". Basis: probe, 2026-09-25. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A wrong galley address fails with an empty page** · 🐞 · user-visible · crash: server.
A "Full Issue" address that names no galley of the issue (a wrong
number, a word, another issue's galley) is expected to open the issue's
page. Instead the app fails on the server and the visitor gets an empty
page, so a stale or mistyped galley link leads nowhere. Basis: probe,
2026-09-25. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — "Publish Issue" offers an email that never goes** · ❓ · user-visible.
With "Publishing Mode" set to "OJS will not be used to publish the
journal's contents online.", the "Publish Issue" window still arrives
with "Send an email about this to all registered users." ticked, and
"OK" sends no email and creates no notification. Question: should the
box be hidden on such a journal, or say that it has no effect? Lean:
hide it; the email would link to pages readers cannot open. Basis:
probe, 2026-09-25. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — A description alone raises no unsaved-change question** · 🐞 · minor.
On "Issue Data", a change typed in a text box such as "Volume" or "URL
Path" makes another tab ask "The data on this form has changed. Do you
wish to continue without saving?" before it opens. Text typed only in
"Description" does not: pressing another tab opens it at once, with no
question. A Journal Manager who has written only a description expects
the same question before leaving the form. Basis: test run, 2026-09-25.
<sup>f-a16</sup>

<a id="a17"></a>
**A17 — An article published outside the issue stays listed in it** · 🐞 · user-visible.
A Journal Manager publishes a newer version of an issue's article with
"Don't Assign To An Issue", after a window that says "This will be
published immediately without any issue association.". The issue still
lists the article, now under the newer version's title: on the issue's
page (so, for the current issue, under "Current" and in the home page's
"Current Issue"), on
the "Table of Contents" tab, in "Items", and in the current-issue web
feeds ([Web feeds](U18-web-feeds.md), its Rule 5). Its link opens the
newer version's page, whose breadcrumb and "Issue" line name no issue, so
a reader browsing the issue lands on an article that says it belongs to
none. The issue should list the version that is in it, or drop the
article. Basis: probe, 2026-09-28. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — "Remove" unpublishes the older version and leaves the article in the issue** · 🐞 · user-visible.
On an article of A17, the "Table of Contents" tab's "Remove" asks its
usual question, and "OK" closes the window as if the article had been
taken out. It has not: it stays on the tab, in "Items" and on the
issue's page. What goes offline instead is the earlier version, the one
the issue published: its page answers "404 Not Found" and the
"Versions" list on the article's page no longer offers it, while the
article's page and its workflow still read "Published". Readers lose the
issue's own version of the article, and every link to that version
breaks; nothing tells the Journal Manager that a version went offline.
"Remove" should take
the article out of the issue and leave its published versions alone, or
refuse with a message. Basis: probe, 2026-09-28. <sup>f-a18</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips (ojs `71bb244152`, lib/pkp
`76a315591`, omp `187f0f40d`, ops `61cd158ce3`). The body was
live-probed on 2026-09-25 on OJS, with OMP and OPS read for the absence
and the exclusivity controls (notes td1–td17, each naming the rules it
settled, and the f-a notes); a claim still read only in the code says so
where it is made.

<a id="fn-a"></a>
**a** — Page: OJS `pages/manageIssues/ManageIssuesHandler.php` (`index`, roles `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `PKPSiteAccessPolicy`) renders `templates/manageIssues/issues.tpl`: heading `editor.navigation.issues` "Issues", `<tabs>` `future` (`editor.navigation.futureIssues` "Future Issues") and `back` (`editor.navigation.issueArchive` "Back Issues"), each a `load_url_in_div` of `grid.issues.FutureIssueGridHandler` / `BackIssueGridHandler`. The edit window: `IssueGridHandler::editIssue()` → `templates/controllers/grid/issues/issue.tpl` (`#editIssueTabs`: `issue.toc` "Table of Contents", `editor.issues.issueData` "Issue Data", `editor.issues.galleys` "Issue Galleys", `editor.issues.identifiers` under `{if $enableIdentifiers}`, `editor.issues.access` "Access" under `publishingMode == PUBLISHING_MODE_SUBSCRIPTION`); `enableIdentifiers` is set when `enablePublisherId` holds `issue` or any `pubIds` plugin is registered. Article placement: `Repo::publication()` `issueId` via the workflow (U49). Side menu entry: U08 Rule on the "Content" group.

<a id="fn-b"></a>
**b** — OMP `pages/` and OPS `pages/` have no `issue` or `manageIssues` directory; neither app has an issue schema, an issue grid or issue templates (OMP `pages/catalog`, `pages/manageCatalog`; OPS `pages/preprints`). An unknown page segment answers the page router's 404.

<a id="fn-c"></a>
**c** — Role gates: `IssueGridHandler`, `BackIssueGridHandler::saveSequence`, `grid.toc.TocGridHandler` and `grid.issueGalleys.IssueGalleyGridHandler` all assign their operations to `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` only, behind `ContextAccessPolicy` (plus `OjsIssueRequiredPolicy` when an `issueId` is passed). OJS `registry/userGroups.xml`: "Journal manager", "Journal editor" and "Production editor" carry role `0x10` (`ROLE_ID_MANAGER`); Section editor and Guest editor `0x11`; the assistant groups `0x1001`; Subscription Manager `0x200000`. A denied page request: `PKPPageRouter::handleAuthorizationFailure()` sends a signed-out visitor to Login and a signed-in one to `user/authorizationDenied` with the policy's message (`user.authorization.roleBasedAccessDenied` "The current role does not have access to this operation.").

<a id="fn-d"></a>
**d** — Preview: `pages/issue/IssueHandler::authorize()` adds `OjsIssueRequiredPolicy` for `view` and `download`; for an unpublished issue it permits only `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT`, otherwise denies with `user.authorization.invalidIssue` "Invalid issue requested!". The denial goes through `handleAuthorizationFailure()` (note c). The row's "Preview" is `IssueGridRow` `previewIssue` (`grid.action.previewIssue` "Preview"), an `OpenWindowAction` on `issue/view/{issueId}`.

<a id="fn-e"></a>
**e** — `OjsJournalMustPublishPolicy` (on every `IssueHandler` op): permits `ROLE_ID_MANAGER`, `SITE_ADMIN`, `ASSISTANT`, `SUB_EDITOR`, `SUBSCRIPTION_MANAGER`; denies everyone else when `publishingMode == PUBLISHING_MODE_NONE` (`user.authorization.journalDoesNotPublish` "This journal does not publish its content online."). Galleys: `IssueHandler::userCanViewGalley()` lets `IssueAction::allowedIssuePrePublicationAccess()` roles (manager, sub-editor, assistant, subscription manager) through, then on a published issue redirects a signed-out visitor to Login when `restrictArticleAccess` is set, and applies `subscriptionRequired()` / payments (U51, U52).

<a id="fn-f"></a>
**f** — `IssueGridHandler::publishIssue()`: when `sendIssueNotification` is posted and `publishingMode != PUBLISHING_MODE_NONE`, `NotificationSubscriptionSettingsDAO::getSubscribedUserIds()` picks every user with an active `user_user_groups` row in the journal (start ≤ now < end) not blocking `NOTIFICATION_TYPE_PUBLISHED_ISSUE` (`notificationPublishedIssue`), and separately those also not blocking its email (`emailNotificationPublishedIssue`); a `Bus::batch` of `jobs/notifications/IssuePublishedNotifyUsers` jobs (chunks of `NOTIFICATION_CHUNK_SIZE_LIMIT` / `Mailer::BULK_EMAIL_SIZE_LIMIT`) creates the notification for all of them and sends `IssuePublishedNotify` (`ISSUE_PUBLISH_NOTIFY`, "Issue Published Notify", `emails.issuePublishNotify.subject` "Just published: {$issueIdentification} of {$contextName}", body with `{$issueUrl}` and `{$issueToc}`) with the publishing user as sender to the second set only, footer from `setupUnsubscribeFooter()`. `notification.type.issuePublished` "An issue has been published."; `NotificationManager::getNotificationUrl()` points it at `issue/current`. U05 scenario 9 drove the email 2026-09-04 (subject "Just published: Vol. 1 No. 1 (2026): {title} of {journal name}", footer present, a Reader with "Enable…" unticked got none) after running the jobs. Live-probed 2026-09-25 (Actors row 5; Side effects bullets 1–2), OJS: after the queue ran the email reached every account with a role, the publisher and the Site Administrator included, from the publisher; not a Reader who unticked "Enable these types of notifications.", nor, on a second publish, one who ticked "Do not send me an email for these types of notifications."; right after "OK" none had arrived. The notification was recorded for every enrolled account but the one who unticked "Enable…", and nothing on screen listed it: the Tasks panels showed only tasks, and `notification` answered "404 Not Found".

<a id="fn-g"></a>
**g** — Grids: `FutureIssueGridHandler` (title `editor.issues.futureIssues`, action `addIssue` `grid.action.addIssue` "Create Issue", `loadData` unpublished, `ORDERBY_UNPUBLISHED_ISSUES` = year, volume, number ASC, no order feature); `BackIssueGridHandler` (title `editor.issues.backIssues`, extra column `published` `editor.issues.published` "Published" in `getLocalizedDateFormatShort()`, `OrderGridItemsFeature`). Columns from `IssueGridHandler::initialize()`: `identification` (`issue.issue` "Issue", the cell a link to `editIssue`), `numArticles` (`editor.issues.numArticles` "Items" = `Issue::getNumArticles()`: the submissions `filterByIssueIds()` keeps, as note m, whose current publication is scheduled or published). `IssueGridRow` actions in order: `edit` (`grid.action.edit`), `previewIssue`/`viewIssue` ("Preview"/"View"), `publish`/`unpublish`, `setCurrentIssue`, `delete`. U05 note s9 (2026-09-04): the row actions sit behind the row's expander arrow. `js/controllers/grid/issues/BackIssueGridHandler.js` refreshes on the global `issuePublished` event, `FutureIssueGridHandler.js` on `issueUnpublished`. Empty grid: `grid.noItems` "No Items". Live-probed 2026-09-25: "Order" above "Back Issues" was hidden with no issue or one and shown from two; the galley tab's likewise from two galleys; the table of contents' from one article.

<a id="fn-h"></a>
**h** — `APP\issue\Issue::getIssueIdentification()`: parts in `showVolume`, `showNumber`, `showYear`, `showTitle` order, `issue.vol` "Vol." / `issue.no` "No.", year bracketed when not first, a `:` appended before the title; the title for the given locale falling back to `getLocalizedTitle()`; an empty result forces volume, number and year. `getIssueSeries()` is the same without the title (the archive's second line). Live-probed 2026-09-25 (Rule 2): every combination named as stated in the lists, on the issue's page and in the email subject; a title given only in French showed in the English lists ("Vol. 5 No. 1 (2030): Numéro spécial K1"); "Archives" put "Special Issue" on one line and "Vol. 1 No. 2 (2014)" under it.

<a id="fn-i"></a>
**i** — `controllers/grid/issues/form/IssueForm.php` and `templates/controllers/grid/issues/form/issueForm.tpl`. `initData()` for a new issue ticks `showVolume`, `showNumber`, `showYear`, `showTitle`. Checks: `volume` regexp `^[0-9]+$` (optional), `FormValidatorCustom` on each `show*` requiring its value (`editor.issues.volumeRequired`, `numberRequired`, `yearRequired`, `titleRequired`), and in `readInputData()` a check on the field `issueForm` requiring one `show*` (`editor.issues.issueIdentificationRequired`). The `showTitle` error is attached to the check box, not to the "Title" box. `execute()` sets `accessStatus` `ISSUE_ACCESS_SUBSCRIPTION` under subscription or none publishing mode and `ISSUE_ACCESS_OPEN` otherwise, `published` 0. Save: `IssueGridHandler::updateIssue()` → `createTrivialNotification()` (`common.changesSaved` "Your changes have been saved.") and a data-changed event. Fields: `number` maxlength 40, `year` maxlength 4; the schema stores `volume` and `year` as integers (`smallint` columns). `editor.issues.datePublished.notPublished.description`. The incidental of 2026-09-04 (Rule 3): see f-a1. Live-probed 2026-09-25 (Fields, after the "Issue Data" table): "Cancel" with typed changes closed the window with no question; "Close" and switching to another tab raised the browser's question, whose "Cancel" kept the window (its "OK" not driven). The "Title" box for a second form language stays hidden until the first is focused.

<a id="fn-j"></a>
**j** — Cover: `issueForm.tpl` binds `FileUploadFormHandler` with `mime_types` "jpg,jpeg,png,svg" to `IssueGridHandler::uploadFile()`; `IssueForm::validate()` refuses a temporary file whose type `FileManager::getImageExtension()` does not map (gif, jpeg, png, ico, webp and some media types map; `image/svg+xml` does not) with `editor.issues.invalidCoverImageFormat`; `execute()` stores `cover_issue_{id}_{locale}{ext}` for `Locale::getLocale()` and the alt text for that locale. Delete: `IssueForm::fetch()` builds `deleteCoverImage` (`common.delete`, `RemoteActionConfirmationModal` `common.confirmDelete`, title defaulting to `common.confirm` "Confirm") → `IssueGridHandler::deleteCoverImage()` (clears image and alt text, removes the file). Alt text box: `common.altText` "Alternate text", `common.altTextInstructions`. Seeded covers: scenarios.md `issues[].coverImage`.

<a id="fn-k"></a>
**k** — `IssueForm`: `urlPath` regexp `^[a-zA-Z0-9]+([\.\-_][a-zA-Z0-9]+)*$` (`validator.alpha_dash_period`); `validate()` refuses digits (`publication.urlPath.numberInvalid`) and another issue's path (`Repo::issue()->getByBestId()`, `publication.urlPath.duplicate`). `Issue::getBestIssueId()` prefers the path; `OjsIssueRequiredPolicy` / `getByBestId()` read digits as the id, so the numbered address still resolves. The galley form's twin check: note p.

<a id="fn-l"></a>
**l** — `IssueForm::validate()`: a non-empty `datePublished` must be `Y-m-d` (`editor.issues.datePublished.invalid`; the date picker normalises input first, per the code's own comment); an empty one on a published issue adds `editor.issues.datePublished.requiredWhenPublished`. `execute()` stores null for an empty date on an unpublished issue.

<a id="fn-m"></a>
**m** — `controllers/grid/toc/TocGridHandler.php` (category grid, loaded by `issueToc.tpl`): `loadData()` = `Repo::submission()->getInSections()` (`filterByIssueIds()` keeps every submission with any publication carrying the issue's id, whatever that publication's status; then submission status published or scheduled, grouped by the current publication's `sectionId`; f-a17) and `Repo::section()->getByIssueId()`; columns `title` (`article.title` "Title") and, under `publishingMode == SUBSCRIPTION && accessStatus == ISSUE_ACCESS_SUBSCRIPTION`, `access` (`reader.openAccess` "Open Access", `selectStatusCell.tpl`). `OrderCategoryGridItemsFeature(ORDER_CATEGORY_GRID_CATEGORIES_AND_ROWS)` (`grid.action.order` "Order", finish controls `common.done` "Done" / `grid.action.cancelOrdering` "Cancel ordering"). Section order: `setDataElementSequence()` → `upsertCustomSectionOrder(issueId, sectionId, seq)`; article order: `setDataElementInCategorySequence()` edits the current publication's `seq` and, when the target category differs, its `sectionId`. Unordered articles share `seq` 0 and `ORDERBY_SEQUENCE` has no tie-breaker. `TocGridRow` actions: `workflow` (`submission.submission` "Submission", `RedirectAction` to `dashboard/editorial?workflowSubmissionId={id}`) and `removeArticle` (note n). Live-probed 2026-09-28 (Rules 9, 9a, 11): each row's arrow offered "Submission" and "Remove"; the newer version published outside the issue: f-a17.

<a id="fn-n"></a>
**n** — `TocGridHandler::removeArticle()`: `RemoteActionConfirmationModal` `editor.article.remove.confirm`, title `grid.action.removeArticle` "Remove Article From Issue", link label `editor.article.remove` "Remove"; for each publication of the submission in this issue with status scheduled or published: `Repo::publication()->unpublish()` (status `STATUS_QUEUED`, `issueId` kept) and `seq` cleared; the section's custom order row is deleted when it was the section's only article. Only publications carrying this issue's id are touched, so on an article whose current publication has no issue the older one is unpublished and the row, read through note m's filter, stays. Live-probed 2026-09-28 (Rules 12, 12a): the window's title and question as Rule 12 quotes them; the outcome: f-a18.

<a id="fn-o"></a>
**o** — `TocGridCellProvider::getCellActions()` `access`: an `AjaxAction` to `setAccessStatus` toggling the current publication's `accessStatus` between `ARTICLE_ACCESS_OPEN` and `ARTICLE_ACCESS_ISSUE_DEFAULT` (its accessible label `manager.plugins.disable` "Disable"). Access tab: `IssueGridHandler::access()`/`updateAccess()`, `IssueAccessForm` + `issueAccessForm.tpl` (`editor.issues.accessStatus` "Access status", options `editor.issues.openAccess` "Open access" / `editor.issues.subscription` "Subscription", `editor.issues.accessDate` "Open access date"); the save is *Subscriptions & open access control*'s.

<a id="fn-p"></a>
**p** — `controllers/grid/issueGalleys/IssueGalleyGridHandler.php` (add `grid.action.addIssueGalley` "Create Issue Galley"; columns `submission.layout.galleyLabel` "Galley Label", `common.language` "Language" only when `getSupportedLocaleNames()` > 1, `submission.publisherId` "Publisher ID" always; `OrderGridItemsFeature`; `update()` answers `JSONMessage(false)` on a failed validation without re-rendering the form), `IssueGalleyGridRow` (`edit` titled `editor.issues.editIssueGalley`, `delete` `common.confirmDelete`), `controllers/grid/issues/form/IssueGalleyForm.php` (`label` required `editor.issues.galleyLabelRequired`; `galleyLocale` must be in `getSupportedFormLocales()` `editor.issues.galleyLocaleRequired` while the list offers `getSupportedLocaleNames()`; `temporaryFileId` required for a new galley `form.fileRequired`; publisher id checks; `urlPath` as note k against `IssueGalleyDAO::getByBestId(…, issueId)`; `execute()` deletes the replaced file), `issueGalleyForm.tpl` (`editor.issues.galley` "Issue Galley" upload, the download link with `getOriginalFileName()` `target="_blank"`, `enablePublisherId` guard on `issueGalley`). New galleys take `getNextGalleySequence()`; `IssueGalleyDAO::getByIssueId()` orders by `seq`. U46 note on `editor.issues.galleyLabelRequired`.

<a id="fn-q"></a>
**q** — `IssueGridHandler::publishIssue()`: first call renders `AssignPublicIdentifiersForm` with `assignPublicIdentifiersForm.tpl` (`editor.issues.confirmPublish`, box `sendIssueNotification` `notification.sendNotificationConfirmation` checked, `common.ok`, Cancel shown); on `confirmed`: pub-ids assigned (U44), `Repo::issue()->createDoi()`, `setPublished(1)`, `datePublished` set to now only when empty, delayed-OA dates under subscription mode (Settings bullet 2), `Repo::issue()->updateCurrent($contextId, $issue)`, `Repo::doi()->issueUpdated()`, then `Repo::publication()->publish()` for each publication in the issue with status `STATUS_SCHEDULED`; the notification jobs (note f); global event `issuePublished`. OJS `Repository::setStatusOnPublish()` gives a publication with no `datePublished` the current date (its docblock's promise that articles inherit the issue's date has no code behind it). An issue with no articles publishes without a warning: U05 note s9, 2026-09-04. Live-probed 2026-09-25: the window reads, top to bottom, the box, the question, the URN step (on a journal with URNs on for issues), "Cancel" and "OK".

<a id="fn-r"></a>
**r** — `Repo::issue()->updateCurrent($contextId, ?Issue)` writes `journals.current_issue_id`, or clears it when no issue is passed; `getCurrent()` reads it. `IssueGridRow` offers `setCurrentIssue` (`editor.issues.currentIssue` "Current Issue", `editor.issues.confirmSetCurrentIssue`) only when the issue is published and not current; `IssueGridHandler::setCurrentIssue()`.

<a id="fn-s"></a>
**s** — `IssueGridHandler::unpublishIssue()`: `RemoteActionConfirmationModal` `editor.issues.confirmUnpublish`, title `editor.issues.unpublishIssue`; `Repo::issue()->edit($issue, ['published' => 0])` (date kept), then `Repo::issue()->updateCurrent($contextId)` with no issue, which clears the current issue whichever issue was unpublished; each publication published in the issue is `unpublish()`ed and `publish()`ed again, which with the issue unpublished yields `STATUS_SCHEDULED`. Global event `issueUnpublished`. Incidental of 2026-09-24 (U10 claim check K2): after "Unpublish Issue" › "OK" the issue's articles answered 404 and left the home page's lists; U15 note (2026-09-24): the article's landing page "404 Not Found" and its search entry gone at once.

<a id="fn-t"></a>
**t** — `IssueGridHandler::deleteIssue()` (`IssueGridRow` `delete`, `common.confirmDelete`, title `grid.action.delete` "Delete"): each publication in the issue gets `issueId` null and `STATUS_QUEUED` through `Repo::publication()->edit()` (with OAI tombstones), `updateStatus()` on its submission; `Repo::issue()->delete()` removes the cover files, the custom section and issue orders, the issue galleys and issue files; when the issue was current, `updateCurrent()` takes the first of `filterByPublished(true)->orderBy(ORDERBY_PUBLISHED_ISSUES)`, and with none the foreign key's `ON DELETE SET NULL` clears it. The specific text `editor.issues.confirmIssueDelete` is referenced by no template or class.

<a id="fn-u"></a>
**u** — `Collector::ORDERBY_PUBLISHED_ISSUES` = custom `o.seq` ASC, then current issue first, then `date_published` DESC (Back Issues); `ORDERBY_SEQUENCE` = `o.seq` ASC alone (the archive, `IssueHandler::archive()`). `BackIssueGridHandler::setDataElementSequence()` → `DAO::moveCustomIssueOrder()`; `DAO::insert()/update()/delete()` call `resequenceCustomIssueOrders()`, which, once any custom order exists, renumbers the published issues by `o.seq`, an issue with no row sorting last. Without any custom order the archive's `ORDER BY o.seq` has nothing to order by.

<a id="fn-v"></a>
**v** — `pages/issue/IssueHandler.php`: `index` → `current`; `current()` redirects to `issue/view/{bestId}` when `Repo::issue()->getCurrent()` returns one, else renders `frontend/pages/issue.tpl` without an issue (`current.noCurrentIssue` "No Current Issue", `current.noCurrentIssueDesc` "This journal has not published any issues.", `breadcrumbs_issue.tpl` with `common.homepageNavigationLabel` "Home" / `navigation.archives` "Archives"); `view()` renders the same template with `issue_toc.tpl`; `archive()` pages by the context's `itemsPerPage` (else the config default), throws 404 for an empty page past the first, and renders `issueArchive.tpl` (`archive.archives` "Archives", `archive.archivesPageNumber` "Archives - Page {$pageNumber}", `issue_summary.tpl`, `pagination.tpl`). `issue_summary.tpl`: cover link, `getLocalizedTitle()` when `getShowTitle()`, else `getIssueSeries()`, the series under a title, description. Live-probed 2026-09-25 (Rules 21, 24, 25), OJS: the issue's tab read "Vol. 1 No. 2 (2025) | {journal}"; `issue/view/73` (the ID) and its URL Path opened the page, `issue/view/2` (another issue's "Number", no ID of the journal) sent a signed-out visitor to Login; "No Current Issue"'s tab read "| {journal}"; with "Items per page" at 2, `issue/archive/2` was headed "Archives - Page 2" and `/3` answered "404 Not Found".

<a id="fn-w"></a>
**w** — `IssueHandler::setupIssueTemplate()` fetches with `filterByIssueIds()` (any publication carrying the issue's id, whatever its status; note m) and keeps a submission only when its current publication has a section and is `STATUS_PUBLISHED` (published issue) or scheduled/published (unpublished issue); sections from `Repo::section()->getByIssueId()` (`COALESCE(custom_section_orders.seq, sections.seq)`), a section's title null when `hideTitle`. `frontend/objects/issue_toc.tpl`: `editor.issues.preview` "Preview" warning when unpublished; cover with alt `getLocalizedCoverImageAltText()` or `issue.viewIssueIdentification` "View {$identification}"; description; pub-id plugins' lines; DOI line; `submissions.published` "Published" with `date_format:$dateFormatShort` (`includeIssuePublishDate` true); `issue.fullIssue` "Full Issue" with `galley_link.tpl` per galley; sections with `article_summary.tpl`. Live-probed 2026-09-25 (Rule 23), OJS: an article unpublished from its workflow left the page and the tab; one with a newer version left unpublished stayed, as its published version. Live-probed 2026-09-28 (Rules 23, 23a): the control of f-a17 held (a new version saved and unpublished left the issue's page, the article's page and the feeds on the first version); the newer version published outside the issue: f-a17.

<a id="fn-x"></a>
**x** — `galley_link.tpl` builds `issue/view/{issueBestId}/{galleyBestId}`; `IssueHandler::initialize()` redirects an unknown galley to `issue/view/{id}`; `view()` with a galley calls hook `IssueHandler::view::galley` and otherwise redirects to `issue/download/…`. `plugins/generic/pdfJsViewer/PdfJsViewerPlugin::issueCallback()` takes `application/pdf` galleys: `templates/display.tpl` header with the return link (`issue.return` "Return to Issue Details", screen-reader text), the title link (`getIssueIdentification()`), `common.download` "Download"; page title `article.pageTitle` "View of {$title}". Seed facts (2026-09-25): "PDF.JS PDF Viewer" arrives ticked on a new journal. `lensGalley` also hooks issue galleys (not ticked by default for issue use; not read further).

<a id="fn-y"></a>
**y** — OJS `templates/frontend/pages/indexSite.tpl`: per journal `site.journalView` "View Journal" and `site.journalCurrent` "Current Issue" (`issue/current`), unconditionally. `pages/index/IndexHandler::index()` shows the list only when no journal is requested and `getTargetContext()` resolves none (two or more enabled journals, no site redirect).

<a id="fn-z"></a>
**z** — `templates/frontend/pages/indexJournal.tpl` `.current_issue`: `journal.currentIssue` "Current Issue", `getIssueIdentification()`, `issue_toc.tpl` with `heading="h3"`, `journal.viewAllIssues` "View All Issues" → `issue/archive`; `IndexHandler` sets the issue up only when `publishingMode != NONE`. The part's conditions are U10 Rule 14.

<a id="fn-se"></a>
**se** — Released articles: `Repo::publication()->publish()` logs `publication.event.published` (or `versionPublished`) and fires `PublicationPublished`, whose listener `NotifyAuthorOnPublication` sends `AuthorPublicationPublished` to author assignments when the status is published; `unpublish()` logs `publication.event.unpublished`. Statistics: `IssueHandler::view()` and `download()` fire `UsageEvent` with `ASSOC_TYPE_ISSUE` / `ASSOC_TYPE_ISSUE_GALLEY`. No mail is sent by `updateIssue`, `saveSequence`, `setCurrentIssue`, `unpublishIssue`, `deleteIssue`, `removeArticle` or the galley operations. Live-probed 2026-09-25 (Side effects bullets 3, 5, 6), OJS: the author got "Publication Published" during the press and a Tasks row; the History read "The submission was published."; unpublishing the issue and "Remove" logged "The submission was unpublished."; "Delete": f-a12; no action here sent mail after the queue ran. Statistics: opening an issue's page and its PDF "Full Issue", then "Download", logged two issue views and two galley downloads at once, while Statistics › "Issues" read "Date Range 2026-08-25 — 2026-09-24" and "0 of 0 issues": the daily statistics task that moves the log into that page never runs on the test installs.

<a id="fn-sa"></a>
**sa** — `classes/components/forms/context/AccessForm.php`: `publishingMode` radio (`manager.distribution.publishingMode` "Publishing Mode"; `…openAccess`, `…subscription`, `…none`), `delayedOpenAccessDuration` (`about.delayedOpenAccess` "Delayed Open Access", `common.disabled` "Disabled" or `manager.subscriptionPolicies.xMonths`) shown when subscription. Effects here: `issue.tpl` "Access" tab guard, `IssueForm::execute()` access status, `TocGridHandler` column guard, `publishIssue()` delayed-OA dates and the notification guard, `OjsJournalMustPublishPolicy`. Live-probed 2026-09-25: on a new journal the three "Publishing Mode" choices arrive unselected, and an issue created there is open access; the publisher-ID boxes sit on Settings › Workflow › Submission › "Metadata" and the "URN" row on Settings › Website › "Plugins" (Distribution's tabs: "License", "DOIs", "Search Indexing", "Payments", "Statistics", "Access", "Archiving").

<a id="fn-sb"></a>
**sb** — `restrictArticleAccess` (`manager.setup.restrictArticleAccess`), read by `IssueHandler::userCanViewGalley()` only; the issue pages themselves do not read it. Box and default: seed facts (2026-09-25).

<a id="fn-sc"></a>
**sc** — OJS `templates/controllers/grid/settings/sections/form/sectionForm.tpl` `hideTitle` (`manager.sections.hideTocTitle` "Omit the title of this section from issues' table of contents."); read by `setupIssueTemplate()` and `Repo::submission()->getInSections()` (reader side only; the editors' `TocGridCategoryRow::getCategoryLabel()` prints the title regardless).

<a id="fn-s0"></a>
**s0** — Scenario seeding. Scenario 7 runs on `publicknowledge` with `manager.maya` (the Journal Manager), `sectioneditor.ana`, `copyeditor.carla`, `author.alex` and `reader.rosa`, passwords as `docs/process/users.md` gives them; its issues are the seeded "Vol. 1 No. 2 (2014)" (published, current) and "Vol. 2 No. 1 (2015)" (unpublished), which it only reads; the controls of scenarios 9 and 11 read the same journal. Scenario 11 runs on OMP and OPS `publicknowledge` as `manager.maya` (the Press Manager, the Preprint Server Manager). Every other scenario runs on its own scratch journal from `POST scenarios/context`, with throwaway `users[]` (password: the username twice): `manager` in each, plus `author` and `reader` in scenario 1, `sectionEditor`, `subscriptionManager`, `reader`, `author` and `externalReviewer` in scenario 9, `reader` in scenario 10. Issues come from `issues[]` (`{volume, number, year}`, `published: true` for a published one, `datePublished` where a date is named, `galleys: [{label: 'PDF', file: 'article.pdf'}]` in scenario 10); the last published entry is the current issue, so scenario 5 lists 2024, 2026, then 2025. Articles are scratch submissions from `POST scenarios/submission` with `title`, `published: true` and `issue` (`{volume, number, year}`); into an unpublished issue that gives a scheduled article; `section` names the section by its abbrev. Scenario 1: the article's submitter is `author`. Scenario 3: `sections: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews', hideTitle: true}]`, the three published articles seeded in the order named. Scenario 8: `publishingMode: 'subscription'`; scenario 9: `publishingMode: 'none'`. Scenario 10: `restrictArticleAccess: true` and `plugins: {pdfjsviewerplugin: {enabled: false}}`. Uploads are the fixtures `profile-image-400.png` (the cover), `article.pdf`, `replacement.pdf` and `notes.md`, and `cover.svg`, a small SVG image not yet among the fixtures. "Run the site's background jobs" is `runJobs()` (`shared/playwright/support/jobs.js`), so the tests that read the issue email belong in the serial project; the mail catcher is Mailpit at `MAILPIT_URL` (default `http://127.0.0.1:8025`), scoped by recipient address. The site's home page is `index.php/index` (seed facts: every enabled journal on one page). The visitor is a browser with no session.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-25 (the absence paragraph), as Journal Manager and signed out: the OMP side menu reads "Content › Catalog" and the OPS menu has no "Content" group; neither has "Issues" (OJS: "Content › Issues"). The press's header has no "Current" and no "Archives"; the server's has "Archives" only, opening its preprints. On OMP and OPS, `issue/archive`, `issue/current`, `issue/view/1` and `manageIssues` answer the "404 Not Found" page.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-25 (Actors rows 1–2; Rule 22), OJS, one scratch account per role and the seeded journal's "Vol. 2 No. 1 (2015)": the Author, Reader, Reviewer, Translator and Subscription Manager get the access-denied page reading "Invalid issue requested!", a signed-out visitor the Login page; the Journal Manager, Editor, Production Editor, Site Administrator, Section Editor, Guest Editor and all eight assistant roles, none assigned to a submission, get the page with "Preview", which lists a scheduled article and one published at once into the issue. Every role below the manager-level ones had no "Content › Issues" and got "The current role does not have access to this operation." at the page's address.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-25 (Fields, "Identification"; A5, A6): "abc" in "Volume" gave "Volume is required and must be a positive, numeric value." under the box; "Number" kept 40 of 41 typed characters and accepted "2a"; "Year" kept 4 of 5 typed digits. "20a6" and 99999: f-a6, f-a5.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-25 (Rules 3, 4; A1): each part's message and "Issue identification is required. Please select at least one of the issue identification options." showed verbatim in the passing notice, with nothing marked; a part left empty with its box unticked saved ("2031" alone). The notice's timing: f-a1.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-25 (Rule 7): the chooser offered .jpg, .jpeg, .png and .svg; an SVG uploaded at once and "Save" gave "Invalid cover page format. Accepted formats are .gif, .jpg, or .png." in a passing notice. A PNG saved and reopened with the image, "Alternate text" (kept by the next "Save") and "Delete"; "Delete" opened "Confirm" with "Are you sure you wish to delete this item? This action cannot be undone." and "OK" removed the image and its alternate text. A cover saved in the English interface was absent from "Issue Data" in the French one; a cover seeded for the primary language showed on the French issue's page and archive with its alternate text (two runs).

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-25 (Rule 8): "123", another issue's path, and "a b", "a..b", "-ab", "é1" each gave their message under the box and in a passing notice; "spring-2026" saved, and both `issue/view/spring-2026` and the numbered address opened the issue. The row's "Preview" kept the numbered address.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-25 (Rules 10, 10a; A9, A10): within a section, a dragged article kept its place after "Done" on the tab and on the issue's page, and "Cancel ordering" dropped a drag. Never-ordered articles came in the same order on the tab and on the page, in one issue in the order they were created, in another the reverse. The journal's section list was unchanged. Section drags: f-a9; a drop under another section: f-a10.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-25 (Rule 12): "OK" took the row off at once and the issue's "Items" dropped by one; the article's page answered "404 Not Found" while the issue's other articles stayed; the emptied section's heading left the tab; the workflow read "Status: Unscheduled" with "Schedule For Publication", which opened on "Assign To Current/Back Issue" with the same issue chosen. The version still carries the issue in the install's data (note n: `issueId` kept).

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-25 (Rules 14, 14a; A11): English with no label: "This field is required." under "Galley Label", refused in the browser; a label with no file: "A file upload is required." as the notice; "123", "a b" and a path another galley of the same issue holds: Rule 8's messages as the notice, while another issue's galley path saved. A `.md` file was accepted as a galley and joined the end of the list. Language: f-a11.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-25 (Rule 16): an issue with "2026-01-15" typed published with 2026-01-15 in "Published" and on its page; an empty date became 2026-09-25 (today). A scheduled article with no date took today, not the issue's date; one whose Publication Settings carried "Publication Date" 2023-05-05 kept it; an article published at once into the issue beforehand stayed published. An issue with no article published through the same window. "Cancel" left the issue in "Future Issues".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-25 (Rule 18; A2): with the later issue current, "Unpublish Issue" › "OK" on the older one moved it to "Future Issues" with its date kept; "Current" then opened "No Current Issue", the home page's "Current Issue" part was gone, and the later issue's row offered "Current Issue". The unpublished issue's articles answered "404 Not Found", read "Status: Scheduled" and left the home page's lists; publishing the issue again brought them back.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-25 (Rule 19; A3, A12): the generic question showed on a published issue holding an article, an unpublished one and an empty one. After "OK" the cover file, the galley and its file were gone. Deleting the current issue made the top of "Back Issues" current (with a saved order too: the top issue, not the newest); deleting a non-current one left the current issue; deleting the last published one left "No Current Issue". A scheduled article in a deleted unpublished issue read "Status: Unscheduled".

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-25 (Rules 20, 25a; A13): three issues dated 2024, 2025 and 2026, the 2025 one made current: "Back Issues" read 2025, 2026, 2024. After "Order" moved 2024 to the top and "Done", "Back Issues" and "Archives" both read 2024, 2025, 2026, and a fourth issue published later joined the bottom of both though it became current. The archive before any order: f-a13.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-25 (Rule 26; A14), signed out: "PDF" opened the reader with the return arrow ("Return to Issue Details" to a screen reader; pressed, it landed on the issue's page), the issue's name and "Download" (served as an attachment); the tab read "View of Vol. 1 No. 2 (2025)". A `.md` galley downloaded as "notes.md" and the issue's page stayed. A galley the issue lacks: f-a14.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-25 (Rule 27), signed out: the site's home page listed the enabled journals (116) on one page, each with "View Journal" and "Current Issue"; for a journal with no issue it opened "No Current Issue", for another the issue's page. OMP's site home offers "View Press Website" alone, OPS's "View Server" alone.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-25 (Actors row 3; Settings bullet 1; A15): signed out, "Archives", "Current", an issue's page and an article's page went to Login; the Reader, Author and Reviewer got "This journal does not publish its content online."; the Section Editor, Copyeditor, Subscription Manager and Journal Manager read them. For every account the header had no "Current" and no "Archives" and the home page no "Current Issue" part. The issue created on screen was "Subscription". The email: f-a15.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-25 (Settings bullet 3): with the box ticked, the issue's page opened signed out; its "PDF" went to the Login page, and signing in there as a Reader landed on the PDF reader. Unticked (the default, as on the seeded journal), a signed-out visitor opened the "PDF". OMP's box sits under "View Monograph Content" and OPS's under "View Preprint Content", unticked.

<a id="fn-f-a1"></a>
**f-a1** — Incidental of 2026-09-04 (U05 test author, OJS): on Issues › Future Issues › "Create Issue" the "Title" box arrived ticked, "Save" with an empty title re-rendered the form with no visible error line and the grid stayed "No Items". Mechanism: `IssueForm::initData()` ticks `showTitle` for a new issue; its `FormValidatorCustom` is registered on the field `showTitle` (the check box) with `editor.issues.titleRequired`. The scenario API seeds its issues with the box unticked for this reason (scenarios.md `issues[]`). Live-probed 2026-09-25 (td4): the notice "Title is required for the issue." showed at the window's top right from about 0.2 s to 4.5 s after "Save" and was gone at 6 s; nothing on the form was marked; the list still read "No Items" 16 s later.

<a id="fn-f-a2"></a>
**f-a2** — `IssueGridHandler::unpublishIssue()` calls `Repo::issue()->updateCurrent($request->getContext()->getId())` with no issue, and `updateCurrent()` then runs `JournalDAO::removeCurrentIssue()` regardless of which issue was unpublished. The home page's part: U10 Rule 14 needs a current issue. Probe: td11; "Archives" still listed the published issues.

<a id="fn-f-a3"></a>
**f-a3** — Confirmation: `IssueGridRow` `delete` uses `common.confirmDelete`; `editor.issues.confirmIssueDelete` exists in `locale/en/editor.po` and is used nowhere. Cascade: note t. Probe: td12; the specific warning never appeared.

<a id="fn-f-a4"></a>
**f-a4** — Live-probed 2026-09-25 (Fields "Date Published"; Rule 3), OJS: on "Create Issue" with the date box empty, the refused "Save" of A1 left "2026-09-25" in the box; after unticking "Title" and saving, the issue's "Issue Data" showed the date empty. On a published issue, after "Date Published is required when the issue is published." the box showed today again. Mechanism not read.

<a id="fn-f-a5"></a>
**f-a5** — Live-probed 2026-09-25 (td3), OJS: "Volume" 99999 with a valid "Year": `POST …/$$$call$$$/grid/issues/future-issue-grid/update-issue` answered 500, the window stayed open with no message and the list was unchanged. The schema stores `volume` in a `smallint` column (note i), whose limit is 32767, the likely cause; only 99999 was driven, and no server-log line was read.

<a id="fn-f-a6"></a>
**f-a6** — Live-probed 2026-09-25 (td3), OJS: Volume 1, Number "2a", "Year" "20a6", "Title" unticked: saved without a message and listed as "Vol. 1 No. 2a (20)". `IssueForm` has no check on `year` beyond the box's `maxlength` 4; the stored integer keeps the leading digits (note i).

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-25 (Fields, the archive's issue summary), OJS, two runs: on "Archives" the cover of an issue with no alternate text carried `alt=""` while its page read "View Vol. 1 No. 2 (2025)"; an issue with "K3 cover alt" typed read that on both. `issue_summary.tpl` defaults the alt to `''`, where `issue_toc.tpl` defaults it to `issue.viewIssueIdentification` (note w).

<a id="fn-f-a8"></a>
**f-a8** — Live-probed 2026-09-25 (Rule 1), OJS: "Future Issues" read 2025 Vol. 3; then 2026 Vol. 1 No. 1, No. 10, No. 2; then 2027. `ORDERBY_UNPUBLISHED_ISSUES` sorts year, volume, number (note g); `schemas/issue.json` types `number` as a string.

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-25 (Rules 10a, 23), OJS, two drives: a mouse drag of a section heading above another section, several shapes, three attempts each; the article rows moved, the section headings did not (one heading moved below its own article, then "Cancel ordering"), and a "Done" the server accepted (save-sequence 200) left the order unchanged on the tab and on the issue's page. Each section is its own sortable block on the page. The grid offers section ordering (`ORDER_CATEGORY_GRID_CATEGORIES_AND_ROWS`, note m) and the issue's page reads the saved order (note w), so the custom-order half of Rule 23 is code-read only.

<a id="fn-f-a10"></a>
**f-a10** — Live-probed 2026-09-25 (td7), OJS: an article dragged under another section showed there and "Done" was accepted; on reopening the tab it was back under its own section, and the "Section" on its Publication Settings was unchanged. Note m's `setDataElementInCategorySequence()` would change the `sectionId`; the drop did not reach it.

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-25 (td9), OJS: on a journal whose interface is English and French and whose forms are English only, a galley in French answered the notice "An issue galley locale is required." and was not listed; on a journal where French is also a form language the same galley saved as "PDF | French". `IssueGalleyForm` checks `galleyLocale` against `getSupportedFormLocales()` while the list offers `getSupportedLocaleNames()` (note p).

<a id="fn-f-a12"></a>
**f-a12** — Live-probed 2026-09-25 (td12; Side effects bullet 3), OJS, two articles over two runs (one published through its workflow, one seeded as published): after "Delete" of its issue each article's workflow header read "Published" with "Return to Workflow", its Publication Settings "Status: Unscheduled", its page "404 Not Found", and its History only "Submission metadata updated". `deleteIssue()` sets the status through `Repo::publication()->edit()`, not `unpublish()` (note t), so no unpublication is logged (note se).

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-25 (td13; Rule 25a), OJS, three journals, before any saved order: "Back Issues" 2025, 2026, 2024 (2025 current) against "Archives" 2024, 2026, 2025; "Back Issues" 2023, 2022, 2021 against 2021, 2022, 2023; after an unpublish, 2020, 2026, 2025 against 2026, 2020, 2025. Mechanism: note u, the archive orders by the saved order alone.

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-25 (td14; Rule 26), OJS, eight times over three runs: `issue/view/{id}/999`, `/{id}/nosuch`, `/{urlPath}/999` and another issue's galley each answered 500 with an empty title and body. Server log: "Uncaught TypeError: PKP\core\PKPRequest::redirect(): Argument #4 ($path) must be of type ?array, int given" in `IssueHandler.php`, the unknown-galley redirect of `initialize()` (note x). Code read: `stable-3_5_0` passes the path as a list; not driven there.

<a id="fn-f-a15"></a>
**f-a15** — Live-probed 2026-09-25 (td16; Settings bullet 1), OJS, two journals: on a journal set to not publish online, "Publish Issue" arrived with the box ticked; "OK" published the issue, queued no job, and after the queue ran no email had arrived and no notification was recorded. `publishIssue()` skips both when `publishingMode == PUBLISHING_MODE_NONE` (note f); `assignPublicIdentifiersForm.tpl` shows the box ticked whatever the mode.

<a id="fn-f-a16"></a>
**f-a16** — Test run 2026-09-25 (Fields, after the "Issue Data" table; scenario 2), OJS: with An issue about tides. typed only in "Description" on a published issue's "Issue Data", pressing "Table of Contents" raised no browser question and the selected tab read "Table of Contents". A follow-up probe the same day on a scratch journal tried three ways (the tab pressed at once, 1.5 s after typing, after first clicking into "Volume"): no question in any, the tab moved each time. A typed "URL Path" raised the question in the same run, as a typed "Volume" had in note i's probe. The window's "Close" was not driven with a description-only change. Mechanism not read.

<a id="fn-f-a17"></a>
**f-a17** — Live-probed 2026-09-28 (Fields "Items"; Rules 9, 9a, 23, 23a), OJS, four runs, each on a scratch journal with the sections "Articles" and "Second Section" and the published, current issue "Vol. 1 No. 1 (2024)" holding three published articles. As the journal's Journal Manager, "Create New Version" on two of them, each new version retitled and saved; one was then published with "Don't Assign To An Issue" (the window read "…This will be published immediately without any issue association…", and its Publication Settings then showed "Don't Assign To An Issue" with no issue box), the other with the preselected "Assign To Current/Back Issue" and the issue. Signed out, the issue's page, "Current" (`issue/current`) and the home page's "Current Issue" listed the first article under its new title in "Articles", on the page and after a reload; its link `article/view/{id}` opened the new version's page, with the breadcrumb "Home / Archives / Articles" and an issue part reading only "Section Articles". "Back Issues" read "Items" 3 and the "Table of Contents" tab listed the new title. The article published into the issue was listed under its new title, with the breadcrumb and "Issue" line naming the issue. With the journal's web feed set to "Display items in current published issue." (two of the runs), the Atom, RSS 2.0 and RSS 1.0 items carried the new title and linked to `article/view/{id}`, while an article published with no issue at all was not listed. Code read 2026-09-28 (ojs `72b85f4ba0`): the issue's page, the tab and "Items" start from `APP\submission\Collector::filterByIssueIds()`, which keeps a submission when any of its publications carries the issue's id, whatever that publication's status; `IssueHandler::setupIssueTemplate()`, `Repository::getInSections()` and `Issue::getNumArticles()` then read only the current publication's status and section (notes g, m, w). The current-issue feed applies the same filter ([Web feeds](U18-web-feeds.md), its note f).

<a id="fn-f-a18"></a>
**f-a18** — Live-probed 2026-09-28 (Rule 12a), OJS, four runs, on the article of f-a17 published outside the issue: "Remove" showed Rule 12's window and question, and "OK" answered with success (`remove-article` 200, `{"status":true}`) and closed the window. The row stayed on the tab, on the same window and after it was reopened; "Items" stayed 3; the issue's page, and in the two feed runs the current-issue feeds, still listed the new title; the workflow read "Status: Published" with only "Unpublish". The first version was unpublished instead: its page `article/view/{id}/version/{firstVersionId}` answered "404 Not Found", the article's "Versions" list dropped "2024-03-01 (Version of Record 1.0)", and the article's page, still the new version, read "Published 2024-03-01 — Updated on 2026-09-28". No run recorded a server error or a script error. Mechanism: note n.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Issues" page, tabs "Future Issues" / "Back Issues" | side menu › "Content" › "Issues" (`{journal}/manageIssues`) | ROUTE-041 · AFFM-243 |
| "Future Issues" list, "Create Issue" | "Issues" › "Future Issues" | GRID-072 · AFFM-244 |
| "Back Issues" list and its "Order" | "Issues" › "Back Issues" | GRID-070 · AFFM-262 |
| Row "Edit" and the "Issue Management" window's tabs | a row's arrow › "Edit" | AFFM-245 · AFFW-740 |
| "Issue Data" form, "Save", date, show boxes, cover "Delete" and alternate text | "Issue Management" › "Issue Data"; "Create Issue" | AFFM-246 · AFFW-744 · AFFW-745 · AFFW-746 · AFFW-747 |
| "Table of Contents" tab and list | "Issue Management" › "Table of Contents" | AFFW-743 · GRID-085 |
| Table of contents "Order" | the tab's "Order" | AFFM-247 |
| Article row "Submission" | a TOC row's arrow | AFFM-248 |
| Article row "Remove" | a TOC row's arrow | AFFM-249 |
| "Open Access" per article (subscription issue) | the TOC list's column | AFFM-250 |
| "Issue Galleys" tab, "Create Issue Galley", row "Edit", "Delete", "Order" | "Issue Management" › "Issue Galleys" | GRID-069 · AFFM-251 · AFFM-252 · AFFM-253 · AFFM-254 |
| Issue galley window: "Save", stored-file download link | "Create Issue Galley" / "Edit Issue Galley" | AFFW-749 · AFFW-750 |
| "Access" tab (subscription journals) | "Issue Management" › "Access" | AFFM-256 |
| Row "Preview" / "View" | a row's arrow | AFFM-257 |
| Row "Publish Issue" and its window's email box | "Future Issues" row's arrow | AFFM-258 · AFFW-606 |
| Row "Unpublish Issue" | "Back Issues" row's arrow | AFFM-259 |
| Row "Current Issue" | "Back Issues" row's arrow (not the current issue) | AFFM-260 |
| Row "Delete" | any row's arrow | AFFM-261 |
| Issue page, "Current", "Archives", galley view and download | `{journal}/issue`, `issue/current`, `issue/view/{id}[/{galley}]`, `issue/archive[/{page}]`, `issue/download/{id}/{galley}` | ROUTE-040 · AFFR-042 · AFFR-043 · AFFR-044 · AFFR-045 |
| Journal home "Current Issue" part (the part is U10's) | `{journal}` | AFFR-022 |
| Site home per-journal "Current Issue" link | the site's home page listing journals | AFFR-020 |
| Issues API: list, current, one issue, assignment options (read by the publish panel and the DOI screens, not by this spec's pages) | `api/v1/issues[/current\|/{id}\|/assignmentOptions]` | API-053 |
| Issue email "Issue Published Notify" and its queued job | "Publish Issue" with the box ticked | MAIL-060 · JOB-031 |
| Notification "An issue has been published." | same | NOTIF-055 |
| The issue's stored fields | — | SET-031 |

Handed to other specs: the "Identifiers" tab, the issue galley's "Publisher
ID" and the URN step of "Publish Issue" (AFFM-255, AFFW-741, AFFW-751,
AFFW-605) are [Identifiers](U44-identifiers.md)'s; the "Access" tab's save
(AFFW-742, AFFW-748), "Publishing Mode" (AFFM-096) and the open-access email
(MAIL-061) are *Subscriptions & open access control*'s.

## Reference — code anchors

- OJS pages: `pages/manageIssues/ManageIssuesHandler.php` · `pages/issue/IssueHandler.php` · `pages/index/IndexHandler.php`
- OJS grids and forms: `classes/controllers/grid/issues/IssueGridHandler.php` · `controllers/grid/issues/FutureIssueGridHandler.php` · `BackIssueGridHandler.php` · `IssueGridRow.php` · `IssueGridCellProvider.php` · `form/IssueForm.php` · `form/IssueAccessForm.php` · `form/IssueGalleyForm.php` · `controllers/grid/toc/TocGridHandler.php` · `TocGridRow.php` · `TocGridCellProvider.php` · `TocGridCategoryRow.php` · `controllers/grid/issueGalleys/IssueGalleyGridHandler.php` · `IssueGalleyGridRow.php` · `IssueGalleyGridCellProvider.php` · `classes/controllers/grid/pubIds/form/AssignPublicIdentifiersForm.php` · `js/controllers/grid/issues/FutureIssueGridHandler.js` · `BackIssueGridHandler.js`
- OJS templates: `templates/manageIssues/issues.tpl` · `templates/controllers/grid/issues/issue.tpl` · `issueToc.tpl` · `form/issueForm.tpl` · `form/issueAccessForm.tpl` · `templates/controllers/grid/issueGalleys/form/issueGalleyForm.tpl` · `templates/controllers/grid/pubIds/form/assignPublicIdentifiersForm.tpl` · `templates/frontend/pages/issue.tpl` · `issueArchive.tpl` · `indexJournal.tpl` · `indexSite.tpl` · `templates/frontend/objects/issue_toc.tpl` · `issue_summary.tpl` · `galley_link.tpl` · `templates/frontend/components/breadcrumbs_issue.tpl`
- OJS classes: `classes/issue/Issue.php` · `Repository.php` · `Collector.php` · `DAO.php` · `IssueAction.php` · `IssueGalleyDAO.php` · `IssueFileDAO.php` · `classes/section/DAO.php::getByIssueId()` · `classes/submission/Repository.php::getInSections()` · `classes/publication/Repository.php` (`publish()`, `unpublish()`, `setStatusOnPublish()`) · `classes/security/authorization/OjsIssueRequiredPolicy.php` · `OjsJournalMustPublishPolicy.php` · `classes/components/forms/context/AccessForm.php` · `schemas/issue.json`
- OJS email and notification: `classes/mail/mailables/IssuePublishedNotify.php` · `jobs/notifications/IssuePublishedNotifyUsers.php` · `classes/notification/NotificationManager.php` · `classes/notification/Notification.php` (`NOTIFICATION_TYPE_PUBLISHED_ISSUE`)
- OJS API: `api/v1/issues/IssueController.php`
- OJS plugins: `plugins/generic/pdfJsViewer/PdfJsViewerPlugin.php::issueCallback()` · `templates/display.tpl`
- lib/pkp: `classes/notification/NotificationSubscriptionSettingsDAO.php::getSubscribedUserIds()` · `classes/core/PKPPageRouter.php::handleAuthorizationFailure()` · `classes/controllers/grid/feature/OrderGridItemsFeature.php` · `OrderCategoryGridItemsFeature.php` · `classes/observers/listeners/NotifyAuthorOnPublication.php` · `classes/publication/Repository.php` (`publish()`, `unpublish()`)
- Locale: OJS `locale/en/editor.po` `editor.issues.*`, `grid.action.addIssue`, `grid.action.addIssueGalley`, `grid.action.removeArticle`, `editor.article.remove*`, `editor.navigation.*`; `locale/en/locale.po` `issue.*`, `current.*`, `archive.*`, `journal.currentIssue`, `journal.viewAllIssues`, `notification.type.issuePublished`; `locale/en/emails.po` `emails.issuePublishNotify.*`; lib/pkp `common.confirmDelete`, `publication.urlPath*`, `validator.alpha_dash_period`
