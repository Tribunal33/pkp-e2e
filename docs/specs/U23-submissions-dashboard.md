---
name: submissions-dashboard
status: verified
---

# Submissions dashboard (editorial)

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

The editorial dashboard is the editorial team's home in the backend. It is
one page per journal that lists the journal's submissions in named *views*,
such as "Active submissions", "Reviews overdue" and "Published". It has a
search box, a filter panel, and one row per submission showing where the
submission stands and what needs doing next. From here a Journal Manager,
Section Editor or assistant can find a submission, read its state at a
glance (stage, days since anything happened, review progress), take the most
common next step right from the row (assign an editor, assign reviewers),
open the full workflow in place, and delete abandoned incomplete submissions
in bulk.

This spec also owns the list machinery every backend submission list shares:
the table, the search, the filter panel, the selection mode for deleting
incomplete submissions, and the open-in-place workflow panel. The author's
own list (*[My Submissions](U22-my-submissions.md)*) and the reviewer's
assignment list ([Reviewer's review](U28-reviewers-review.md)) are separate
features that use this machinery. Their rows, views and permissions are
specified there, not here.

## Actors & permissions

**The editorial roles** on this page are **Site Administrator**, **Journal
Manager**, **Section Editor**, and the assistant-level roles (**Copyeditor**,
**Layout Editor**, **Proofreader**, **Funding Coordinator**, called "an
assistant" below). Two scopes run through everything (Rule 3). Journal
Managers work **journal-wide**: they see every submission in the journal.
A Site Administrator works journal-wide only while also holding Journal
Manager there (otherwise, Rule 3). Section Editors and assistants work
**assigned-only**: they see and search only the submissions they are
assigned to through one of these roles. Holding Author or Reviewer alongside an
editorial role changes nothing here, except for the conflict rows of
Rule 9a.

| Action | Who may — and when |
|--------|--------------------|
| **Open the editorial dashboard** | • the editorial roles: from the sidebar's "Editor Dashboard" group or by its direct address<br>• a Site Administrator without Journal Manager in the journal: the address opens, scoped as Rule 3 says ⚠ [A9](#a9)<br>• any other signed-in user who types the address: the access-denied page <sup>a</sup> |
| **See a submission listed** | • Journal Manager, and a Site Administrator who also holds Journal Manager in the journal: every submission in the journal, in whichever views match its state<br>• Section Editor, assistants, and a Site Administrator whose editorial roles in the journal are only these: only submissions they are assigned to (Rule 3) <sup>c</sup> |
| **See the "Needs editor" view** | • Journal Manager, and a Site Administrator who also holds Journal Manager in the journal, only {OJS OMP} <sup>b</sup> |
| **See the "Declined" view** | • Journal Manager, and a Site Administrator who also holds Journal Manager in the journal, only. Section Editors and assistants have no view that lists declined submissions ⚠ [A1](#a1) <sup>b</sup> |
| **Open a submission's workflow ("View")** | • every editorial role, on any row listed for them, except a conflict row (Rule 9a) or an incomplete submission's row (Rule 9c) <sup>l</sup> |
| **Filter by "Assigned To Editor"** | • Journal Manager, Site Administrator: the field appears in their Filters panel only (Rule 8). A Site Administrator gets it whatever their role in the journal, also over an assigned-only or empty list [A9](#a9) <sup>i</sup> |
| **Delete incomplete submissions in bulk** | • Journal Manager, and a Site Administrator who also holds Journal Manager in the journal: over any incomplete submission in the journal (Rule 12)<br>• a Site Administrator without Journal Manager there: still offered "More Actions", over the assigned-only or empty list they get [A9](#a9)<br>• Section Editors and assistants get no "More Actions" control here at all. Authors get it on their own list ([→ deleting drafts](U22-my-submissions.md)) <sup>m</sup> |
| **Receive the monthly outstanding-tasks email** | • Journal Manager, Section Editor: active accounts with at least one outstanding item, unless they opted out {OJS OMP} (Side effects) <sup>n</sup> |

## Fields & validation

The page collects no data of its own. Its one form is the **Filters** panel
(Rule 8). Which fields the panel offers depends on the journal's setup and
the account's roles, never on which dashboard page it opens from:

| Field (UI label) | Appears when | Rules |
|------------------|--------------|-------|
| Section {OJS OPS} | the journal has more than one section, inactive ones and those restricted to editors counted ([→ Sections](U17-sections.md#inactive)) | tick one or more sections. All are listed, the inactive and editor-only ones unmarked. Applying one narrows the view to its submissions. A press never offers a series filter ⚠ [OMP1](#omp1) <sup>i</sup> |
| Assigned To Editor (labelled "Assigned to Moderator" on a preprint server {OPS}) | the account holds Journal Manager or Site Administrator | pick one or more people from a suggest list of the journal's Journal Managers and Section Editors. The list offers nothing until a name is typed <sup>i</sup> |
| Categories | the journal has at least one category | pick one or more categories <sup>i</sup> |
| Issues {OJS} | the journal has at least one issue | pick one or more issues <sup>i</sup> |
| Days since last activity | always | a slider from 0 to 180 days. It keeps only submissions idle for at least that many days; 0 means no restriction <sup>i</sup> |

## Rules & state

<a id="views-sidebar"></a>
1. **Where it lives.** The backend sidebar shows an **"Editor Dashboard"**
   menu group to every holder of an editorial role. Its entries are the
   dashboard's views, each with a live count badge. Choosing one opens the
   list filtered to that view. At the top of the group sits a search box
   labelled "Search submissions" (Rule 7). The count badge of "Reviews
   overdue" is colored to draw attention, whatever it counts, zero
   included; the other badges are plain {OJS OMP}. Accounts that also hold
   Reviewer or Author see that role's own sidebar group beside this one
   (owned by [Reviewer's review](U28-reviewers-review.md) and
   *[My Submissions](U22-my-submissions.md)*), and "Start A New
   Submission" (owned by *[Submission wizard](U21-submission-wizard.md#ways-in)*).
   <sup>a</sup> <sup>d</sup>
2. **The views.** A view is a named slice of the journal's submissions. One
   submission can sit in several views at once. Which views exist depends
   on the app. A preprint server has no review or copyediting, so it has
   far fewer: <sup>b</sup>

   | View | Lists | OJS | OMP | OPS |
   |------|-------|:---:|:---:|:---:|
   | Assigned to me | submissions still in progress that the signed-in account is assigned to | ✓ | ✓ | ✓ |
   | Active submissions | every submission still awaiting an outcome, incomplete ones included | ✓ | ✓ | ✓ |
   | Needs editor | active submissions with no editor assigned yet (journal-wide accounts only, Rule 3) | ✓ | ✓ | — |
   | All in submission stage | active submissions sitting on the Submission stage | ✓ | ✓ | — |
   | Needs reviews | submissions in review with fewer confirmed reviews than the journal requires | ✓ | ✓ | — |
   | Awaiting reviews | submissions in review with reviews still outstanding | ✓ | ✓ | — |
   | Reviews submitted | submissions in review with at least one review submitted | ✓ | ✓ | — |
   | Reviews overdue | submissions in review with an overdue review request or review | ✓ | ✓ | — |
   | Author revisions submitted | submissions whose authors have delivered requested revisions | ✓ | ✓ | — |
   | All in review stage | active submissions on the Review stage; on a press, both of its review stages under the one entry | ✓ | ✓ | — |
   | All in copyediting stage | active submissions on the Copyediting stage | ✓ | ✓ | — |
   | All in production stage | active submissions on the Production stage | ✓ | ✓ | ✓ |
   | Scheduled for publication | submissions scheduled but not yet published | ✓ | ✓ | ✓ |
   | Published | published submissions | ✓ | ✓ | ✓ |
   | Declined | declined submissions (journal-wide accounts only, Rule 3 ⚠ [A1](#a1)) | ✓ | ✓ | ✓ |

   Every view honors the account's scope (Rule 3): "All in submission
   stage" for a Section Editor means *their* submissions on that stage.
   "Assigned to me" is the landing view. It differs from "Active
   submissions" even for a Journal Manager, because it lists only
   submissions the account is itself assigned to. <sup>b</sup> <sup>c</sup>
<a id="scope"></a>
3. **Scope.** Journal Managers see the whole journal. A Site
   Administrator does so only while also holding Journal Manager there;
   creating a journal makes its creator one, and one with no role there
   cannot be arranged on a test install. Section Editors and assistants
   see only submissions where they are listed as a participant through
   that editorial role, and so does a Site Administrator whose editorial
   roles there are only these, with no "Needs editor" or "Declined" view.
   With Reader alone the page lists nothing; Author or Reviewer alone is
   open [A9](#a9). An assignment
   as Author or Reviewer does not surface a submission on *this* dashboard;
   it surfaces on My Submissions or the reviewer's list instead. The scope
   applies uniformly to views, search and counts. <sup>c</sup>
4. **Addresses.** The page's address records the current state: the view,
   the search phrase, any filters, the sort, and an open workflow panel. So
   the page can be bookmarked, shared or reloaded as it was. Two
   exceptions: the pager's current page is never recorded (page 2 cannot
   be bookmarked), and a switched-off sort is mis-recorded ⚠ [A5](#a5).
   The retired submission-list address from older versions,
   `{journal path}/submissions`, forwards to the signed-in account's home
   list. The precedence is owned by
   *[My Submissions](U22-my-submissions.md)*, "Landing". <sup>e</sup>
<a id="table"></a>
5. **The heading and the table.** The heading names the current view with
   its total, for example "Active submissions (10)", and shows a spinner
   while the list loads. The columns are **ID** (sortable), **Submissions**
   (the authors-and-title line), **Stage** (the current stage, or the
   outcome such as "Declined", named in plain text with a small colored dot
   beside it), **Days** (days since the submission's last activity;
   sortable), **Editorial Activity** (Rule 9) and **Actions** ("View",
   Rule 11). An incomplete submission's Stage cell reads "Incomplete". The
   exception is a preprint server, which has no "Incomplete" label: there
   it reads "Production" {OPS}. A sortable header cycles through three
   states as it is clicked: descending, ascending, then unsorted. The
   address follows for the first two; switching the sort off leaves the
   old sort in the address ⚠ [A5](#a5). The list pages at 30 rows. Under
   it a line reads "Showing {first} to {last} of {total}": "Showing 1 to
   30 of 31", on page 2 "Showing 31 to 31 of 31", on an empty view
   "Showing 0 to 0 of 0". Beside that line, a view holding more than 30
   rows has pager buttons: "Previous", the page numbers ("1", "2") and
   "Next". "Previous" cannot be pressed on the first page, nor "Next" on
   the last. A screen reader announces "Go to Previous"
   and "Go to Page {n}", but plain "Next" ⚠ [A10](#a10). Which page is
   showing is never part of the address (Rule 4). An empty view shows a
   single "No Items" row. Each time the list finishes loading (on
   arrival, after a search or a sort), a screen reader hears "Loaded";
   nothing of it shows on screen.
   The author's and reviewer's lists reuse this table with their own
   columns (theirs have no "Days"). <sup>f</sup>

   With the interface in French, a few of the page's texts read raw codes
   where French words belong: what a screen reader hears for the "…"
   button above the list (Rule 12) and for "Loaded", an accepted
   reviewer's indicator (Rule 10) and, on a press, the Filters panel's
   "Assigned To Editor" field (Rule 8) ⚠ [A12](#a12).
<a id="search"></a>
6. **Search within a view.** The search box above the list ("Search
   submissions, ID, authors, keywords, etc.") narrows the *current view*.
   The heading keeps the view's name and the count follows. An active
   search shows as a chip above the table with an X to clear it. "Clear
   Filters" appears beside the chips whenever panel filters are active.
   Switching views clears the search. <sup>g</sup>
<a id="search-view"></a>
7. **Global search.** The sidebar's "Search submissions" box searches
   *everything the account can reach*, regardless of state: the whole
   journal for a journal-wide account, and their assigned submissions for
   an assigned-only one (the Rule 3 scope, so a
   submission they merely authored stays out of these results too; My
   Submissions finds it). It is the one place a Section Editor can still
   find a declined or published submission of theirs ⚠ [A1](#a1).
   Submitting it opens the **"Search Results"** view with the phrase as a
   chip. The in-page search box disappears there, because the sidebar box
   owns the phrase. Filters still work on top of the results. The page
   leaves the view only when the phrase and every filter are cleared; it
   then returns to the view the search started from. Clearing the phrase
   alone, with a filter chip still active, stays on "Search Results".
   <sup>h</sup>
<a id="filters"></a>
8. **Filters.** The "Filters" button opens a side panel titled "Filters":
   "Close" at its top, the Fields table's fields, and "Clear Filters" and
   "Apply Filters" at its foot. <sup>i</sup>
   - 8a. **Applying.** "Apply Filters" closes the panel, narrows the
     current view, and puts one chip per active filter above the table,
     each with an X to drop just that filter ⚠ [A11](#a11). Reopening
     "Filters" shows the applied choices in their fields. Filters combine
     with the search phrase. Switching views clears them.
   - 8b. **Clearing and closing.** The panel's own "Clear Filters" only
     empties its fields: the panel stays open, and the list keeps its
     chips and count. "Apply Filters" then drops every filter; "Close"
     keeps them, and the panel reopens showing them. The "Clear
     Filters" beside the chips (Rule 6) drops every filter at once.
   - 8c. **Unapplied changes.** Closing the panel without "Apply Filters"
     drops the changes made in it without asking: the list stays as it
     was and the panel reopens without them.
<a id="activity"></a>
9. **The Editorial Activity cell** tells the team what state the submission
   is in, and offers the next step where there is an obvious one. Exactly
   one of the following renders, checked in this order: <sup>j</sup>
   - 9a. **Conflict rows.** When the signed-in user is on the submission as
     an author (and not through any editorial role), the cell reads "You
     cannot access this submission as a Journal Manager since you are the
     author. To view it, go to \"My Submissions\"". The wording says
     "Journal Manager" whoever is looking, on every app ⚠ [A3](#a3). The
     row offers no buttons at all: no "View", and no activity-cell action
     such as "Assign Editor". The same applies when they are on it as a
     reviewer; the notice then points to "Review Assignments" instead
     {OJS OMP}. Only journal-wide accounts ever see these rows (Rule 3).
     <sup>j</sup>
   - 9b. **Declined**: "Declined during the {stage} stage." The stage is
     named plainly: a review-stage decline reads "Review", not "External
     Review". This shows on the "Declined" view, and the row keeps its
     "View". <sup>j</sup>
   - 9c. **Incomplete submission**: a **"Complete submission"** button. It
     takes the editor into the *author's* submission wizard for that draft
     ⚠ [A2](#a2). The row has no "View". What follows is owned by
     *[Submission wizard](U21-submission-wizard.md)*.
   - 9d. **Submission stage, no editor assigned** {OJS OMP}: an **"Assign
     Editor"** button that opens the "Assign Participant" window (the form
     is owned by [Stage participants](U35-stage-participants.md)). Once an
     editor is assigned, the cell goes quiet. <sup>j</sup>
   - 9e. **In review** {OJS OMP}: the review-round states, in the round's
     own vocabulary. See Rule 10 for the per-reviewer indicators that
     accompany most of them:
     - no reviewers on the current round yet: an **"Assign Reviewers"**
       button that opens the Add Reviewer window
       ([→ finding a reviewer](U27-reviewer-assignment-and-management.md#search));
     - revisions asked of the author: "Revisions requested from author"
       (this round) or "Revisions requested from the author to be taken to
       a new review round" (resubmit). The "Request Revisions" decision's
       "Require New Review Round" choice picks between the two
       ([→ decisions](U26-review-stage-and-rounds.md#decisions));
     - revisions delivered: "Revisions submitted", plus "New review round
       to be created" when they answer a resubmit decision;
     - all reviews confirmed: "All reviews are confirmed and a decision is
       needed." Where the journal counts a minimum, it reads "Minimum
       required number of reviews have been confirmed. A decision is
       needed." instead;
     - otherwise: the per-reviewer indicators alone.
   - 9f. **In review, with recommending editors on board** {OJS OMP},
     checked before 9e. Instead of 9e's "Assign Reviewers" and
     all-confirmed lines, a deciding editor reads "Recommending Editors
     are tasked to advise the next steps for this submission" ⚠ [A13](#a13),
     then "An editorial recommendation has been received" / "All editorial
     recommendations have been received, and a decision is required." as
     recommendations land. A recommending editor who has recorded theirs
     reads "Recommendation has been made by you." ⚠ [A14](#a14)
     ([→ recording one](U26-review-stage-and-rounds.md#recommendations)). <sup>j</sup>
   - 9g. **In copyediting** {OJS OMP}: "Copyedited Files Uploaded: {count}".
   - 9h. **Scheduled into an issue** {OJS}: "To be published in issue
     {issue}".
   - 9i. Otherwise the cell is empty. That is the case for a
     Submission-stage row with its editor assigned, and for most rows on a
     preprint server.
<a id="review-indicators"></a>
10. **Per-reviewer activity indicators** {OJS OMP}. Wherever Rule 9e shows
    them, the cell carries one small round indicator per reviewer on the
    current round, declined and cancelled ones included. For requests and
    ongoing reviews it is a countdown ring with the days left (or overdue),
    colored to flag overdue ones. Once there is an outcome (submitted,
    confirmed, declined, cancelled) it is an icon. Clicking one opens a
    popover with the reviewer's name, the review type, a status sentence,
    and up to three buttons: <sup>k</sup>

    | Reviewer status (popover headline) | Buttons offered |
    |------------------------------------|-----------------|
    | "Awaiting Response from the reviewer" (first request or resent) | "Edit Due Date" · "View details" · "Unassign" |
    | "Review Request overdue by {days} days" | "Edit Due Date" · "View details" · "Unassign" |
    | "Ongoing review - request accepted" | "Edit Due Date" · "View details" · "Cancel Reviewer" |
    | "Review overdue by {days} days" (described as a missed *response* and dated with the review deadline ⚠ [A6](#a6)) | "Edit Due Date" · "View details" · "Cancel Reviewer" |
    | "Review completed on {date}" | "View unread recommendation" (then "View recommendation" once read; a review window closed within a moment of opening, before its mark as read is saved, can leave "View unread recommendation" until a page reload ⚠ [→ Reviewer assignment & management](U27-reviewer-assignment-and-management.md#a32)) |
    | "Review was confirmed by editor" | "View recommendation" |
    | "Review Request declined on {date}" | "Resend Review Request" · "View details" · "Cancel Reviewer" |
    | "Reviewer cancelled review request" (shown when the *editor* cancelled ⚠ [A4](#a4)) | "Resend Review Request" · "View details" |

    On a journal the completed-review popover also names the reviewer's
    recommendation. A press shows the completed sentence without one.
    An assigned Section Editor or assistant gets the same popovers with the
    same working buttons, but declined and cancelled reviewers show no
    indicator at all for them ⚠ [A7](#a7).
    Every button opens the same window it would open from the workflow's
    Reviewers panel, and the list refreshes afterwards. The flows
    themselves are owned by *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)*
    ([deadlines](U27-reviewer-assignment-and-management.md#due-dates),
    [reading and confirming](U27-reviewer-assignment-and-management.md#read-review),
    [unassign vs cancel](U27-reviewer-assignment-and-management.md#unassign)). <sup>k</sup>
<a id="open-in-place"></a>
11. **"View" opens the workflow in place.** The submission's workflow opens
    as a panel over the list. The address records which submission, and
    which of its panels, is open, so the state can be bookmarked or shared,
    and reloading such an address reopens the panel. Closing it returns to
    the list exactly as it was left, refreshed. What the panel contains
    belongs to
    [→ the workflow screen](U24-workflow-screen-and-stage-access.md#workflow-entry)
    and the stage features. <sup>l</sup>
<a id="bulk-delete"></a>
12. **Bulk cleanup of incomplete submissions.** "More Actions" (the "…"
    button above the list) offers **"Delete Incomplete Submissions"**. On
    this dashboard only Journal Managers and Site Administrators get it (a
    Site Administrator whatever their role in the journal [A9](#a9)),
    and it is grayed out while the current page of the list has no
    incomplete rows. Choosing it puts the list in selection mode: a
    checkbox appears on each incomplete row (only those), with
    **"Delete Incomplete Submissions"** and **"Cancel"** buttons above. The delete
    button stays disabled until something is ticked. Pressing it opens the
    "Confirm Delete of Incomplete Submissions" dialog ("Are you sure you
    want to delete the selected items? This action cannot be undone. Please
    confirm to proceed.") with **"Confirm"** and **"Cancel"**. Confirm
    deletes the ticked submissions permanently. Cancel, in the dialog or
    above the list, leaves selection mode with nothing deleted. Changing
    the view, search or filters also drops the selection. The same
    machinery serves the author's own list with its own permissions
    ([→ deleting drafts](U22-my-submissions.md)). <sup>m</sup>
13. **Counts stay current.** The sidebar badges and the heading's total
    update in place, without a reload, after anything done from this screen
    that changes them: a bulk deletion of incomplete submissions from the
    list (Rule 12), an assignment made from a row, a decision taken in the
    workflow panel before closing it, and a submission deleted from inside
    its workflow panel, after which the badges and the total follow within
    a few seconds. <sup>d</sup>

## Side effects

- The dashboard itself is a read-and-launch surface. Listing, searching and
  filtering send nothing and log nothing. <sup>o</sup>
- Deleting incomplete submissions removes them permanently. There is no
  email and no undo; they vanish from every list, including the authors'
  own.
- Actions launched from rows and popovers (assign editor, assign reviewers,
  edit due date, cancel…) carry the side effects of their owning features
  (*Stage participants*, *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)*).
- **The monthly outstanding-tasks email** {OJS OMP}. On the first of each
  month, every active Journal Manager and Section Editor with outstanding
  work gets one email, "Outstanding editorial tasks for {journal}", sent
  from the journal's principal contact. It lists up to 20 of their assigned
  submissions that are waiting on them: a new submission awaiting first
  review; review rounds needing reviewers, awaiting reviews, with reviews
  ready or overdue, or with revisions submitted; and submissions idle for
  30 or more days in copyediting or production. Each links into this
  dashboard, and the email closes with a link to "your submission
  dashboard". An in-app notification is recorded alongside. Nothing is sent
  to editors with nothing outstanding, to accounts that opted out of this
  notification ⚠ [A8](#a8) (the email carries an unsubscribe link), or to
  accounts whose role was removed in the meantime. Assistants and Site
  Administrators (as such) never receive it. A preprint server sends no
  such email, because the monthly task is not scheduled there. <sup>n</sup>

## Settings that modify behavior

- **Reviews required** {OJS OMP}: the journal's required number of reviews
  (configured in review setup;
  [Review setup & review forms](U29-review-setup-and-review-forms.md)) drives
  the "Needs reviews" view and the "Minimum required number of reviews…"
  message (Rule 9e).
- **Notification opt-out**: each editor can block the monthly
  outstanding-tasks email in their profile's notification settings. The
  control there is labelled "Weekly email of outstanding tasks", though the
  email is monthly ⚠ [A8](#a8). The email's unsubscribe link does the same.
- **Journal setup**: whether sections, categories and issues exist decides
  which filter fields appear (Fields table). Disabling submissions hides
  the neighboring "Start A New Submission" entry (owned by
  *[Submission wizard](U21-submission-wizard.md)*).

## Cross-feature interactions

- *[My Submissions](U22-my-submissions.md)*: the author's list uses this
  feature's table, search, filters and selection machinery. It owns its own
  views, columns and permissions. Landing precedence and the forward from
  the old address are specified there ("Landing").
- [Reviewer's review](U28-reviewers-review.md): the reviewer's assignment list
  is the page's third face. It uses the same machinery with its own views and
  columns.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#workflow-entry)*:
  owns everything behind "View". This spec owns only the open-in-place mechanism (Rule 11).
- *[Submission stage](U25-submission-stage.md)*, *[Review stage & rounds](U26-review-stage-and-rounds.md)*,
  *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)*:
  the states the Stage and Editorial Activity cells report, and the windows
  the row and popover buttons open.
- *[Submission wizard](U21-submission-wizard.md)*: creates the incomplete
  submissions this dashboard lists and cleans up. "Complete submission"
  re-enters it.
- [Stage participants](U35-stage-participants.md): the "Assign Editor" window.

## Canonical scenarios

Scenarios 6, 13, 15 and 16, and scenario 9 on a journal, run on the seeded
journal with ready accounts; the rest run on a scratch journal with
throwaway accounts and scratch submissions (scenario 17 on two, one per
setting end), so the view counts hold only what the scenario built. The
accounts, passwords, mail catcher's address, tooling recipe and each
scenario's starting state are in its footnote.

1. **Land and walk the views**

   Given: Journal Manager, on the journal's login page, the journal holding
   one new submission, one in copyediting {OJS OMP}, one in production and
   one published one.

   - **Landing**: sign in: the editorial dashboard opens in the "Assigned
     to me" view, under the sidebar's "Editor Dashboard" group, which has
     one entry per view with a count badge and the "Search submissions" box
     at its top.
   - **The "Reviews overdue" badge** {OJS OMP}: its count badge is colored
     while it reads 0; the other badges are plain.
   - **The table**: the heading names the view with its count ("Published
     (1)") over the columns "ID", "Submissions", "Stage", "Days",
     "Editorial Activity" and "Actions"; a Stage cell names the stage in
     plain text with a small colored dot beside it.
   - **The views**: open each entry in turn: each opens the list under its
     own heading with its count, the published submission under "Published"
     ("Published (1)") and the others under "Active submissions".
   - **The stage views**: the copyediting submission lists under "All in
     copyediting stage", its activity cell reading "Copyedited Files
     Uploaded: {count}" {OJS OMP}; the production one lists under "All in
     production stage" with an empty activity cell.
   - **Control**: a view whose badge reads 0 shows a single "No Items" row
     under its heading. <sup>s1</sup>

2. **Assigned-only scope**

   Given: Section Editor assigned to one submission, in a journal holding a
   second, unassigned one titled "Unassigned study", a third titled
   "Authored study" that they submitted as an author, and, on a journal or
   press, a fourth titled "Reviewed study" that they are on as a reviewer
   only.

   - **Every view**: walk the "Editor Dashboard" entries: only the assigned
     submission is listed; the unassigned one appears in no view.
   - **Global search**: type Unassigned study into the sidebar's "Search
     submissions" box and submit: "Search Results (0)".
   - **The submission they authored**: it appears in no view either, and
     typing Authored study into "Search submissions" returns "Search
     Results (0)"; their "My Submissions as Author" sidebar group lists it.
   - **The submission they review** {OJS OMP}: the same: no view lists it,
     and typing Reviewed study into "Search submissions" returns "Search
     Results (0)".
   - **Control**: Journal Manager: "Active submissions" lists all four
     (three on a preprint server), and "Assigned to me" only the
     submissions they are themselves assigned to. <sup>s2</sup>

3. **Search within a view**

   Given: Journal Manager, on "Active submissions" of a journal holding
   three active submissions, one of them titled "Search target", and one
   published submission titled "Published study".

   - **The search box**: type target into the box labelled "Search
     submissions, ID, authors, keywords, etc.": the list narrows to "Search
     target", the heading keeps the view's name and its count follows
     ("Active submissions (1)"), and the phrase shows as a chip above the
     table.
   - **The chip's X**: press it: the full view is back, the count with it
     ("Active submissions (3)").
   - **A filter on top of the search**: search for target again, press
     "Filters", set "Days since last activity" to 30 and press "Apply
     Filters": the filter's chip joins the search chip, "Clear Filters"
     appears beside them, and the list holds only the rows matching both.
   - **Switching views**: open "Published": both chips are gone and the
     search box is empty; back on "Active submissions", the full view
     shows.
   - **Mailbox**: none of the above sent an email; the mail catcher holds
     nothing new.
   - **Control**: type Published study into the in-page search box on
     "Active submissions": "Active submissions (0)"; the box narrows the
     current view and never reaches beyond it. <sup>s3</sup>

4. **Global search**

   Given: Journal Manager, on "Active submissions" of a journal holding one
   declined submission titled "Declined study" and one active one.

   - **The sidebar box**: type Declined study into the sidebar's "Search
     submissions" box and submit: the "Search Results" view opens, listing
     the declined submission with its Stage cell reading "Declined", the
     phrase as a chip, and no in-page search box.
   - **Filters on the results**: press "Filters", set "Days since last
     activity" to 30 and press "Apply Filters": the list keeps only the
     results idle for at least 30 days, a filter chip joins the phrase
     chip, and the view is still "Search Results".
   - **Clearing the phrase alone**: press the phrase chip's X: the view
     stays "Search Results", the filter chip still active.
   - **Clearing the filter too**: press "Clear Filters": the page returns
     to "Active submissions", the view the search started from, with its
     in-page search box back above the list.
   - **Control**: type Declined study into that in-page search box:
     "Active submissions (0)"; only the sidebar's search reaches a declined
     submission from here. <sup>s4</sup>

5. **Filter the list**

   Given: Journal Manager, on "Active submissions" of a journal where one
   submission has been idle for 30 days or more and the others are fresh,
   with two sections and one submission in the second {OJS OPS}; a Section
   Editor of the same journal, assigned to one submission.

   - **"Filters"**: press it: a side panel titled "Filters" opens with
     "Days since last activity", "Clear Filters" and "Apply Filters"; set
     "Days since last activity" to 30 and press "Apply Filters": the panel
     closes, the list narrows to the idle submission, the heading count
     follows, and a chip for the filter shows above the table with "Clear
     Filters" beside it.
   - **"Clear Filters"**: press it: the full view is back.
   - **"Section"** {OJS OPS}: press "Filters", tick the second section in
     "Section" and press "Apply Filters": the list narrows to the
     submission in that section, with a chip for the filter above the
     table; press "Clear Filters".
   - **"Assigned To Editor"**: the manager's panel lists the field (labelled
     "Assigned to Moderator" on a preprint server); its suggest list offers
     nothing until a name is typed; type the Section Editor's name, pick
     them from the list and press "Apply Filters": the list narrows to the
     submission they are assigned to, with a chip for the filter above the
     table.
   - **A chip's X**: with that filter still active, set "Days since last
     activity" to 30 and press "Apply Filters", then press the Days chip's
     X: that chip alone goes, the "Assigned To Editor" chip stays, and the
     list shows the Section Editor's submission again.
   - **Switching views**: with that chip still active, open "Published":
     the chip is gone and the view shows its full list.
   - **Control**: Section Editor: open the same panel: there is no
     "Assigned To Editor" field, while "Days since last activity" is there.
     <sup>s5</sup>

6. **Open a submission in place**

   Given: any editorial role, on a view listing a submission.

   - **"View"**: press it on the row: the submission's workflow opens as a
     panel over the list, and the address changes to record which
     submission is open.
   - **Reload**: reload that address: the panel reopens on the same
     submission.
   - **Close**: close the panel: the list is back as it was left, reloaded,
     at the address it had before "View".
   - **Control**: reloading the address after closing brings the bare list,
     no panel. <sup>s6</sup>

7. **Sort and page**

   Given: Journal Manager, on a view with several rows (more than 30 for
   the paging step).

   - **"ID"**: click the header: the rows reorder by ID, descending, and
     the address records the sort; click again: ascending, the address
     following.
   - **"Days"**: click it: the rows reorder by idle time the same way, the
     address following.
   - **Paging**: on a view with more than 30 rows, pager controls sit under
     the list, and page 2 shows the rest; the address does not record
     which page is showing.
   - **Control**: reloading the sorted address brings the rows back in the
     same order. <sup>s7</sup>

8. **Triage a new submission** {OJS OMP}

   Given: Journal Manager, with a fresh submission nobody is assigned to.

   - **"Needs editor"**: the submission lists there and under "All in
     submission stage".
   - **"Assign Editor"**: its activity cell offers the button; press it:
     the "Assign Participant" window opens; assign a Section Editor through
     it and confirm.
   - **Back on the list**: the button is gone and the cell is empty, the
     row has left "Needs editor", and the "Needs editor" badge and the
     heading total moved without a reload.
   - **Control**: the row still lists under "Active submissions" and "All
     in submission stage". <sup>s8</sup>

9. **Review activity at a glance** {OJS OMP}

   Given: Journal Manager; four submissions in review: one whose round has
   no reviewers yet, one whose round has two review requests out,
   unanswered, and a third reviewer who declined, one whose author was
   asked for revisions this round, and one asked for revisions to be taken
   to a new review round.

   - **No reviewers yet**: the first row's cell offers "Assign Reviewers";
     press it: the Add Reviewer window opens; close it.
   - **Two requests out**: the second row's cell shows two countdown
     indicators and an icon for the declined reviewer, and the submission
     lists under "Awaiting reviews".
   - **A popover**: click one countdown indicator: it names the reviewer,
     the review type and "Awaiting Response from the reviewer", with "Edit
     Due Date", "View details" and "Unassign".
   - **The declined reviewer's popover**: click the icon: "Review Request
     declined on {date}", with "Resend Review Request", "View details" and
     "Cancel Reviewer".
   - **"View details"**: press it: the window the workflow's Reviewers
     panel opens for that reviewer appears; close it.
   - **Reviewer**: one of the two accepts the request.
   - **The accepted request**: back on the list, that reviewer's indicator
     is still a countdown ring; its popover reads "Ongoing review - request
     accepted", with "Edit Due Date", "View details" and "Cancel Reviewer".
   - **Reviewer**: the same reviewer submits their review.
   - **The completed review**: that reviewer's indicator is now a done
     mark; its popover reads "Review completed on {date}" (on a journal it
     also names the reviewer's recommendation; a press shows the sentence
     without one) with "View unread recommendation"; press it, read the
     review in the window that opens, and close it: reopened, the
     popover offers "View recommendation" ⚠ [→ Reviewer assignment &
     management](U27-reviewer-assignment-and-management.md#a32).
     The submission now lists under "Reviews submitted" too.
   - **Revisions asked**: the third row's cell reads "Revisions requested
     from author" and the fourth's "Revisions requested from the author to
     be taken to a new review round".
   - **Control**: the other reviewer's indicator is still a countdown ring
     whose popover reads "Awaiting Response from the reviewer".
     <sup>s9</sup>

10. **The conflict row**

    Given: Journal Manager who also holds the Author role and, on a journal
    or press, the Reviewer role, with one submission they authored, another
    they did not, and, on a journal or press, a third in review that they
    are on as a reviewer.

    - **Their own submission's row**: the activity cell reads "You cannot
      access this submission as a Journal Manager since you are the author.
      To view it, go to \"My Submissions\"" [A3](#a3), and the row offers no
      button at all: no "View" and no "Assign Editor".
    - **"My Submissions as Author"**: the same submission sits normally
      under that sidebar group.
    - **The submission they review** {OJS OMP}: its activity cell carries
      a conflict notice that sends them to "Review Assignments"; judge it
      by that phrase. The row offers no button either.
    - **Control**: the other submission's row keeps its "View".
      <sup>s10</sup>

11. **Declined out of editors' sight**

    Given: Journal Manager, and a Section Editor assigned to one submission
    titled "Declined study".

    - **Journal Manager**: on "Active submissions", press "View" on the
      row and decline the submission from its stage inside the panel (the
      decision belongs to the stage features); close the panel: the
      heading total and the "Declined" badge move without a reload; open
      "Declined": the row is listed with its Stage cell reading "Declined"
      and its activity cell "Declined during the {stage} stage.", and it
      keeps "View".
    - **Section Editor**: their "Editor Dashboard" group has no "Declined"
      entry [A1](#a1) and, on a journal or press, no "Needs editor" entry
      either; the submission is gone from every one of their views.
    - **Their global search**: type Declined study into "Search
      submissions" and submit: "Search Results (1)" lists it, with "View".
    - **Deleted inside the panel**: Journal Manager: on "Declined", press
      "View" on the row, press its stage's "Delete" and confirm (the dialog
      belongs to
      [→ the workflow screen](U24-workflow-screen-and-stage-access.md#delete-dialog)):
      the panel closes on the refreshed list, from which the row is gone,
      and the "Declined" badge and the heading total follow within a few
      seconds, without a reload.
    - **Control**: the Journal Manager's own group offers "Declined" and,
      on a journal or press, "Needs editor". <sup>s11</sup>

12. **Bulk-delete incomplete submissions**

    Given: Journal Manager, on "Active submissions" of a journal holding
    two incomplete submissions by two different authors and one submitted
    one.

    - **The incomplete rows**: both sit beside the submitted one; each has
      its Stage cell reading "Incomplete" ("Production" on a preprint
      server), offers "Complete submission" [A2](#a2) in its activity cell,
      and has no "View"; the submitted row has "View".
    - **"More Actions"**: open the "…" button above the list and choose
      "Delete Incomplete Submissions": the list enters selection mode, with
      a checkbox on the two incomplete rows only and "Delete Incomplete
      Submissions" and "Cancel" above; the delete button is disabled until
      a row is ticked.
    - **"Cancel"**: tick one row and press "Cancel" above the list:
      selection mode ends with nothing deleted, both incomplete rows still
      listed; choose "Delete Incomplete Submissions" again, tick one row,
      press "Delete Incomplete Submissions" and then "Cancel" in the
      dialog: the same.
    - **A view switch in selection mode**: choose "Delete Incomplete
      Submissions" once more, tick one row, open "Published" and return to
      "Active submissions": no row is ticked and nothing was deleted.
    - **Delete**: choose "Delete Incomplete Submissions" again, tick both
      and press "Delete Incomplete Submissions": the
      "Confirm Delete of Incomplete Submissions" dialog reads "Are you sure
      you want to delete the selected items? This action cannot be undone.
      Please confirm to proceed."; press "Confirm": both rows are gone, and
      the sidebar badges and the heading total drop without a reload.
    - **"More Actions" afterwards**: with no incomplete row left on the
      page, "Delete Incomplete Submissions" is grayed out.
    - **The author's own list**: signed in as one of the drafts' authors,
      My Submissions no longer lists it, and no email about the deletion
      arrived in their mailbox.
    - **Control**: a Section Editor's dashboard shows no "More Actions"
      button at all. <sup>s12</sup>

App-specific:

13. **Issue filter and scheduled rows** {OJS}

    Given: Journal Manager, with a submission scheduled into an unpublished
    issue and a second, active submission in no issue.

    - **The scheduled row**: its activity cell reads "To be published in
      issue {issue}" and its Stage cell "Scheduled".
    - **The views**: it lists under "Scheduled for publication" and no
      longer under "Active submissions".
    - **"Issues"**: on "Active submissions", press "Filters", tick the
      issue in "Issues" and press "Apply Filters": the active submission,
      in no issue, drops out ("Active submissions (0)") under the issue's
      chip; on "Scheduled for publication" with the same filter, the
      scheduled submission stays listed.
    - **Control**: press "Clear Filters" on "Active submissions": the
      active submission is back. <sup>s13</sup>

14. **One review view, two review stages** {OMP}

    Given: Press Manager; a monograph in Internal Review and one in
    External Review, no reviewers yet.

    - **"All in review stage"**: lists both.
    - **The internal one's activity cell**: offers "Assign Reviewers", like
      the external one's.
    - **Control**: the sidebar offers no separate entry for either review
      stage. <sup>s14</sup>

15. **The reduced dashboard** {OPS}

    Given: Preprint Server Manager, with a fresh preprint and two
    incomplete ones by different authors.

    - **The sidebar**: the "Editor Dashboard" group offers exactly
      "Assigned to me", "Active submissions", "All in production stage",
      "Scheduled for publication", "Published" and "Declined": no review,
      copyediting or "Needs editor" views.
    - **The fresh preprint's row**: its activity cell is empty.
    - **Bulk cleanup**: the flow of scenario 12 runs the same, the
      incomplete rows' Stage cell reading "Production".
    - **Control**: the fresh preprint's row keeps "View". <sup>s15</sup>

16. **Refused at the address**

    Given: a signed-in user whose only role in the journal is Author.

    - **The address**: type the editorial dashboard's address (the one a
      Journal Manager's "Editor Dashboard" entries open): the access-denied
      page shows, "The current role does not have access to this
      operation."
    - **Control**: Journal Manager: the same address opens the dashboard.
      <sup>s16</sup>

17. **A review confirmed, with and without a minimum** {OJS OMP}

    Given: Journal Manager; two journals, one at the install default of
    "Reviews required" and one where it is set to 1, each holding one
    submission in review whose single reviewer has submitted their review.

    - **Before**: on each journal the row's activity cell shows the
      reviewer's indicator alone, no sentence, and the submission lists
      under "Reviews submitted"; on the journal with the minimum it lists
      under "Needs reviews" too.
    - **Journal Manager confirms**: on the journal with the minimum, click
      the indicator and press "View unread recommendation": the window the
      workflow's Reviewers panel opens for reading the review appears;
      confirm the review there
      ([→ reading and confirming](U27-reviewer-assignment-and-management.md#read-review))
      and close it: the list reloads.
    - **The confirmed review**: the indicator's popover now reads "Review
      was confirmed by editor", with "View recommendation".
    - **With a minimum set**: the activity cell reads "Minimum required
      number of reviews have been confirmed. A decision is needed."
    - **At the default**: the same confirmation on the other journal ends
      with the activity cell reading "All reviews are confirmed and a
      decision is needed."
    - **Control**: on the journal with the minimum, "Needs reviews" no
      longer lists the submission once its review is confirmed.
      <sup>s17</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the "Section" field with inactive or editor-only sections (Fields)
  - the panel's own "Clear Filters", "Close" and unapplied changes (Rules 8b, 8c)
  - the "Loaded" a screen reader hears once the list has loaded (Rule 5)
  - the guard for A10 (issue report `docs/issues/U23-A10-pager-next-lacks-spoken-label.md`): on a list with two pages, every pager button carries a "Go to …" name, "Go to Next" included
  - the guard for A4 and A6 (issue report `docs/issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md`): the dashboard popover of a reviewer the editor cancelled names the editor, and that of an accepted review past its deadline speaks of the review deadline
  - the guard for A5 (issue report `docs/issues/U23-A5-dashboard-unsort-keeps-sort-in-address.md`): in scenario 7 ("Sort and page"), a third click on "ID" leaves the address without `sortColumn` and `sortDirection`
- **Nothing new to test**:
  - the "Showing {first} to {last} of {total}" line under the list, and "Previous" and "Next" that cannot be pressed at the ends of the pager (Rule 5)
  - Site Administrator holding Journal Manager in the journal, journal-wide like the Journal Manager (Actors row 2; the Journal Manager's views, scenario 2)
  - a Site Administrator whose editorial roles in the journal are only Section Editor ones, assigned-only like the Section Editor (Rule 3; the Section Editor's views, scenario 2)
  - assistants, assigned-only like the Section Editor (Actors row 2; the Section Editor's views, scenario 2)
  - an assigned Section Editor getting the same popovers and buttons (Rule 10; the Journal Manager's, scenario 9)
- **Register carries it**:
  - A2 ("Complete submission" landing the editor in the author's wizard)
  - A3 (the conflict notice saying "Journal Manager" whoever is looking)
  - A4 (an editor-cancelled request read as "Reviewer cancelled review request")
  - A5 (a switched-off sort left in the address)
  - A6 (the overdue-review popover's wording)
  - A7 (no indicator for declined and cancelled reviewers)
  - A8 (the opt-out labelled "Weekly email of outstanding tasks")
  - A9 (a Site Administrator without Journal Manager in the journal)
  - A10 (the pager's "Next" announced as plain "Next")
  - A12 (raw codes in French; Rule 5)
  - A13 (the recommending editors' line in French; Rule 9f)
  - A14 (a recommending editor's row before recording; Rule 9f)
  - OMP1 (no series filter on a press)
- **No seed**:
  - "Reviews overdue" (Rule 2) and the "Review Request overdue by {days} days" popover (Rule 10): no seed backdates a request or a review deadline
  - "Author revisions submitted" (Rule 2), "Revisions submitted" and "New review round to be created" (Rule 9e): no seed uploads the author's revisions
  - the "Categories" filter narrowing to a submission in a category (Fields): no seed puts a submission in a category, and a scratch journal gets no categories
  - recommending editors on board: the three recommendation messages {OJS OMP} (Rule 9f)
  - the monthly "Outstanding editorial tasks for {journal}" email: its recipients, up to 20 items, links and in-app notification {OJS OMP} (Actors row 8, Side effects)
  - nothing sent to editors with nothing outstanding, to opted-out or removed accounts, to assistants or to Site Administrators (Side effects, Settings)
  - a preprint server sending no monthly email (Side effects)
- **Owned by another feature**:
  - the Reviewer's and Author's sidebar groups beside the editorial one (Rule 1; *Reviewer's review*, scenario 1; *My Submissions*, scenario 3)
  - the old submissions address forwarding to the account's home list (Rule 4; *My Submissions*, "Landing")
  - the side effects of the row and popover actions (Side effects; *Stage participants*; *Reviewer assignment & management*, scenarios 1, 6, 11 and 12)
  - disabling submissions hiding "Start A New Submission" (Settings; *Submission wizard*, scenario 7)
  - My Submissions and the reviewer's list reusing the table, search, filters and selection (Cross-feature; *My Submissions*, scenarios 2 and 3; *Reviewer's review*, scenario 1)
  - what "View" opens (Cross-feature; *Workflow screen & stage access*, scenario 1), the "Assign Editor" window (*Stage participants*) and the Add Reviewer window (*Reviewer assignment & management*, scenario 1)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review. The summary
is sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact
and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A4](#a4) | The popover over an editor-cancelled review request blames the reviewer: "Reviewer cancelled review request" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A5](#a5) | Submissions dashboard: a sort switched off stays in the address and comes back on reload | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A6](#a6) | The overdue-review popover describes the missed review as a "response" and dates it with the review deadline | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A10](#a10) | Paged lists: a screen reader announces the pager's "Next" as plain "Next", unlike its "Go to …" neighbours | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A12](#a12) | In French a screen reader hears raw codes for the "…" button above the list and for "Loaded", and an accepted reviewer's indicator and a press's "Assigned To Editor" filter field show one | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A1](#a1) | Section Editors and assistants have no view listing declined (or published-and-gone) submissions; global search is their only way back | ❓ | user-visible | — |
| [A2](#a2) | Editors are offered "Complete submission" on other people's incomplete submissions, landing them in the author's wizard | ❓ | minor | — |
| [A3](#a3) | The author/reviewer conflict notice always says "as a Journal Manager", whoever is looking, on presses and preprint servers too | ❓ | minor | — |
| [A7](#a7) | Declined and cancelled reviewers show no activity indicator at all to assigned Section Editors and assistants | ❓ | minor | — |
| [A8](#a8) | The profile's opt-out for the monthly outstanding-tasks email is labelled "Weekly email of outstanding tasks" | ❓ | minor | — |
| [A9](#a9) | A Site Administrator without Journal Manager in the journal is let in but listed by their journal role: with Reader only, an "Error" dialog over an empty list | ❓ | minor | — |
| [A11](#a11) | Two values chosen in one filter field: one chip or two? | ❓ | minor | — |
| [A13](#a13) | In French the recommending editors' line may read a raw code; never seen on screen | ❓ | minor | — |
| [A14](#a14) | A recommending editor's row before recording; never seen on screen | ❓ | minor | — |
| [OMP1](#omp1) | A press's filter panel never offers a series filter, however many series exist | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — No path back to finished submissions for assigned editors** · ❓ ·
user-visible.
The "Declined" view exists only for journal-wide accounts (Rule 3). A
Section Editor or assistant whose assigned submission is
declined loses it from every view on their dashboard. The same happens with
other finished outcomes their views do not cover. Their global search still
finds it (Rule 7), but nothing tells them so.
Question: should assigned editors keep a view (or their "Declined" /
"Published" entries) scoped to their own submissions? Lean: an intended
reduction, since each view has a deliberate role list, but the silent
disappearance is worth a product ruling.
Basis: probe + code. <sup>a1</sup>

<a id="a2"></a>
**A2 — "Complete submission" hands an editor the author's wizard** · ❓ ·
minor.
An incomplete submission's row on the editorial dashboard offers "Complete
submission", the same button the author gets. Pressing it opens the
author's submission wizard on someone else's draft, where the editor can
edit and even submit it. Expected: a control suited to a manager, or none.
Question: is it intended that editors complete an author's draft? Lean:
intended but rough. Managers may legitimately finish a stuck draft, and the
page offers no other way in; the row otherwise has no "View" at all.
Basis: probe + code. <sup>a2</sup>

<a id="a3"></a>
**A3 — The conflict notice always says "Journal Manager"** · ❓ · minor.
The notice on a conflict row (Rule 9a) is a fixed sentence: "You cannot
access this submission as a Journal Manager since you are the author…". It
is shown unchanged to a Site Administrator, and on presses and preprint
servers where the role is called Press Manager or Preprint Server Manager.
The reviewer variant has the same fixed wording.
Question: should the notice name the viewer's actual role, or drop the role
mention? Lean: a wording oversight. It is a single shared sentence with no
app-level rewording; harmless, but it reads wrong outside OJS.
Basis: probe + code. <sup>a3</sup>

<a id="a4"></a>
**A4 — Cancelled-by-editor popover blames the reviewer** · 🐞 · low.
When an editor cancels a review request ("Cancel Reviewer"), the reviewer's
indicator popover is headlined "Reviewer cancelled review request",
although the reviewer did nothing. Its description repeats the
misattribution: "Reviewer has cancelled the review request on {date}."
Expected: wording that attributes the cancellation to the editorial side,
as the Reviewers panel's own status ("Request Cancelled") does. Rationale
for 🐞: the neighboring declined status has its own, correct headline, so
the two states were meant to read differently.
Basis: probe + code, 2026-10-04. <sup>a4</sup>

<a id="a5"></a>
**A5 — Submissions dashboard: a sort switched off stays in the address and comes back on reload** · 🐞 · low.
Clicking a sortable column header ("ID", or "Days", which the address
names `lastActivity`) on the submissions dashboard cycles it through
descending, ascending and off. The page's address records the first two,
but the third click leaves the address on "ascending" while the rows go
back to their default order. Reloading the page, or opening the address
from a bookmark or a shared link, sorts the list again by the column the
person had switched off. Nothing is lost: one more click after the
reload puts the list back in its default order, though the address again
keeps the sort. The same happens on an author's My Submissions and on a
reviewer's list of assignments, which use the same table.
Basis: probe, 2026-10-04. <sup>a5</sup>

<a id="a6"></a>
**A6 — The overdue-review popover talks about a response** · 🐞 · low.
Once an accepted review runs overdue, the indicator popover's headline says
"Review overdue by {days} days", but its description reads "This reviewer
has not completed their review. A response was due on {date}." It calls the
missed review a "response", and the date it shows is the review due date
under that wrong name. Expected: the description speaks of the review and
its deadline, as the headline does. The response-overdue state has this
same sentence, where it is correct.
Basis: probe, 2026-10-04. <sup>a6</sup>

<a id="a7"></a>
**A7 — Declined and cancelled reviewers vanish for assistants** · ❓ · minor.
On the same submission at the same moment, a Journal Manager's row shows an
indicator for every reviewer on the round, declined and cancelled ones
included. An assigned Section Editor or assistant sees indicators only for
the others, and nothing marks the omission. The popovers they do get carry
the editor's full working buttons.
Question: is the reduced indicator set for assigned (non-manager) users
intended? Lean: an omission. The list assigned users receive simply leaves
declined and cancelled reviewers out, while every other part of the cell
matches the manager's.
Basis: probe. <sup>a7</sup>

<a id="a8"></a>
**A8 — The outstanding-tasks opt-out says "Weekly"** {OJS OMP} · ❓ · minor.
The profile's notification settings name the opt-out for the
outstanding-tasks email "Weekly email of outstanding tasks", but the email
goes out monthly (Side effects), and nothing else on screen calls it
weekly.
Question: which is wrong, the label or the schedule? Lean: the label. The
task is deliberately registered to run monthly on the 1st, so the label
reads like a leftover from an earlier cadence.
Basis: probe + code. <sup>a8</sup>

<a id="a9"></a>
**A9 — A Site Administrator without Journal Manager is let in, then shown nothing** · ❓ · minor.
The dashboard admits any Site Administrator but lists by their roles in
the journal. With Reader as their only role there, the page opens under an
"Error" dialog ("The current role does not have access to this
operation.", "OK") over "Search Results (0)" and one "No Items" row, and
the sidebar's "Editor Dashboard" group lists no views; every view's
address, and one that opens a workflow panel, does the same, and no panel
opens. With Section Editor left instead, "More Actions" and the "Assigned
To Editor" filter stay over an assigned-only list (Rule 3). Author or
Reviewer alone is untried. The same
"Error" follows the Reader-only administrator onto every editorial page
that carries the side menu, since it comes from the "Editor Dashboard"
entry's count ([Reader comments & moderation
A9](U14-reader-comments-and-moderation.md#a9)). Expected: the
journal's submissions, or the access-denied page any Reader gets here.
Question: should the Site Administrator role count on this dashboard
without Journal Manager in the journal? Lean: one of the two gates is
wrong; the page and its controls admit the administrator while the lists
refuse them.
Basis: probe + code. <sup>a9</sup>

<a id="a10"></a>
**A10 — Paged lists: a screen reader announces the pager's "Next" as plain "Next", unlike its "Go to …" neighbours** · 🐞 · low.
Under a list that runs to more than one page, a screen reader announces
the pager's buttons as "Go to Previous", "Go to Page 1", "Go to Page 2"
and plain "Next". Expected: "Go to Next", like its neighbours. Every
button works as labelled, so nothing is lost and no way round is needed;
only the announced name is out of line. The same pager sits under every
paged list of the back office: the dashboards, Users and invitations,
Jobs, Statistics, DOIs, Announcements, Institutions, the press's
Catalog, "Add Reviewer" and Comments. The editorial dashboard shows it
past 30 submissions, the Users list past 25 users.
Basis: probe + code, 2026-10-04. <sup>a10</sup>

<a id="a11"></a>
**A11 — One chip per field, or per value?** · ❓ · minor.
Two values in one filter field were never applied: one chip or two,
and what an X drops, is open.
Question: one chip per value, each X dropping its own? Lean: yes; a chip
names one value ("Section: Shut") and its X removes it.
Basis: code. <sup>a11</sup>

<a id="a12"></a>
**A12 — In French the dashboard shows raw codes** · 🐞 · low.
With the interface in French (Canada), a few of the dashboard's texts
read raw codes where French words belong:
- the "…" button above the list and the menu it opens are named
  "##common.moreActions##" (English "More Actions"), which is what a
  screen reader hears. Its entry and the selection mode read French:
  "Supprimer les soumissions incomplètes", "Annuler", and the
  confirmation window "Confirmez la suppression des soumissions
  incomplètes". A Section Editor has no such button (Rule 12);
- each time the list reloads (on choosing a view, a search, a filter,
  a sort or a page), a screen reader hears "##common.loaded##" (English
  "Loaded"), for the Journal Manager and the Section Editor alike;
- a journal and a press: the indicator of a reviewer who has accepted
  is named "##dashboard.reviewAssignment.statusAccepted.title##" for a
  screen reader in the Editorial Activity cell, beside the days count,
  and the popover it opens shows the code as its headline (English
  "Ongoing review - request accepted"), for the Journal Manager.
  The popover's sentence and buttons read French
  ("L'évaluateur-trice a accepté la demande d'évaluation…", "Modifier la
  date d'échéance", "Voir les détails", "Retirer l'évaluateur-trice"), and
  a completed review reads French throughout ("Évaluation complétée le
  {date}");
- a press: the Filters panel's "Assigned To Editor" field is labelled
  "##editor.submissions.assignedTo##"; the rest of the panel reads
  French. A journal's reads "Assignée au,à la rédacteur-trice", a
  preprint server's "Assigné au modérateur".

A French-speaking editor cannot tell from the indicator where an accepted
review stands, and a screen-reader user hears codes for the list's
actions and its load notice. The English page shows none of these codes.
The side menu's codes around the list, such as the "Search submissions"
box's placeholder, are
[Navigation menus & site chrome A23](U08-navigation-menus-and-site-chrome.md#a23)'s
finding, the workflow panel's are
[Workflow screen & stage access A11](U24-workflow-screen-and-stage-access.md#a11)'s,
the Author's own list shows the same "…" code
([→ My Submissions](U22-my-submissions.md)), and why a missing French
text shows as a code at all is the question
[Languages & locales A4](U57-languages-and-locales.md#a4) asks.
Basis: probe + code, 2026-10-04. <sup>a12</sup>

<a id="a13"></a>
**A13 — The recommending editors' line may read a code in French** · ❓ · minor.
With the interface in French, the line a deciding editor reads while
recommending editors are still to advise (Rule 9f; English "Recommending
Editors are tasked…") has no French text, so it likely shows a raw
code, as an accepted reviewer's indicator does ([A12](#a12)). Unseen: no
seed puts recommending editors on a round.
Question: does the line read "##dashboard.recommendOnly.pendingRecommendations##"
on a French dashboard? Lean: yes.
Basis: code. <sup>a13</sup>

<a id="a14"></a>
**A14 — A recommending editor's row before they record** · ❓ · minor.
Before a recommending editor records theirs, their row (Rule 9f) was
never seen on screen.
Question: does it read as Rule 9e? Lean: yes, per the code.
Basis: code. <sup>a14</sup>

### OMP

<a id="omp1"></a>
**OMP1 — No series filter on a press** · ❓ · minor.
A press's Filters panel never offers a series filter, even when the press
has several series. On a journal or preprint server with more than one
section, the same panel lists the Section field. The omission is
dashboard-wide; the author's list records the same fact
([→ My Submissions](U22-my-submissions.md)).
Question: is the missing series filter a product choice? Lean: intended. A
series, unlike a section, is an optional shelf not every submission has.
Worth a ruling since the shared machinery supports it.
Basis: probe + code. <sup>omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — page, ops and role gates.** Page `dashboard`, op `editorial`:
`PKP\pages\dashboard\PKPDashboardHandler` — role assignment
`ROLE_ID_SITE_ADMIN | ROLE_ID_MANAGER | ROLE_ID_SUB_EDITOR |
ROLE_ID_ASSISTANT` → `editorial`; `reviewAssignments` (reviewer) and
`mySubmissions` (author) are the other faces of the same page (their
features' specs). The op sets `DashboardPage::EditorialDashboard` and
`selectedRoleIds` to the four editorial roles; the bare page address (no
op) redirects home. All three app subclasses
(`APP\pages\dashboard\DashboardHandler`) override only `setupIndex()`
(page-init payload: app forms, constants) and `getSubmissionFiltersForm()`
— the op roster, role gates and view logic are uninherited-shared (chain
check 2026-08-26). Client side: `DashboardPage.vue` mounted from
`lib/pkp/templates/dashboard/editors.tpl`; the ui-library pins differ
across the three checkouts by 3 commits touching nothing under
`src/pages/dashboard/` or `src/components/SideNav/` (checked 2026-08-26),
and the pkp-lib pins are identical — positive shared-code evidence for the
client-side claims. Live-probed 2026-08-26 (author leg all three apps,
reviewer leg OJS + OMP): an author-only or reviewer-only account typing
the dashboard address gets the access-denied page — "The current role does
not have access to this operation." Live-probed 2026-09-28 (all three
apps, two runs; Actors row 1, A9): a Site Administrator whose only role in
the journal is Reader is let through the page gate (the site-wide
administrator role satisfies `ROLE_ID_SITE_ADMIN`) but gets the dashboard
under the "Error" dialog with "Search Results (0)" (fn-a9). A Site
Administrator with no role at all in a journal cannot be reached on a test
install: creating a journal enrols its creator as Journal Manager
(`PKPContextService::add()`), and the screens never end a Site
Administrator's last role in a journal.

<a id="fn-b"></a>
**b — the view roster.** `PKP\submission\Repository::getDashboardViews()`
→ `mapDashboardViews()`; a view's role list gates who gets it
(`filterViewsByUserRoles`). Editorial-relevant role lists:
`TYPE_NEEDS_EDITOR` = admin+manager; `TYPE_DECLINED` = admin+manager
(+author — the author's own list); every other editorial view = all four
roles. Labels: `submission.dashboard.view.*` — verbatim strings in the
Rule 2 table ("Assigned to me", "Active submissions", "Needs editor",
"All in submission stage", "Needs reviews", "Awaiting reviews", "Reviews
submitted", "Reviews overdue", "Author revisions submitted" (editorial
label of `revisionsSubmitted`), "All in review stage" (the `reviewAll`
string — rendered both for OJS's `TYPE_REVIEW_EXTERNAL` view and OMP's
`TYPE_REVIEW_ALL`; the `reviewExternal` key "All in peer review" is no
longer used by the map — live-probed 2026-08-26, OJS entry label read
"All in review stage"), "All in copyediting stage", "All in production
stage", "Scheduled for publication", "Published", "Declined"). Slice definitions: status queued
(active views), `isUnassigned` (needs-editor), stage filters,
`numReviewsConfirmedLimit` vs the context's required reviews
(needs-reviews), `awaitingReviews`, `reviewsSubmitted`, `reviewsOverdue`,
`revisionsSubmitted`, status scheduled / declined; the published view
filters by the workflow's done shelf. OMP override
(`omp/classes/submission/Repository.php::mapDashboardViews()`): drops
`TYPE_REVIEW_EXTERNAL`, appends `TYPE_REVIEW_ALL` spanning
internal+external review — the sidebar nevertheless renders the entry in
stage order, between "Author revisions submitted" and "All in copyediting
stage" (live-probed 2026-08-26 on two presses; the sidebar orders entries
independently of the repository's collection order). OPS override passes
a reduced type list: assigned, active, production, scheduled, published,
declined. Roster, order and labels live-probed 2026-08-26 per app and
role: manager rosters match the Rule 2 table (OPS manager = the six
OPS-column entries); Section Editor / Series Editor / Moderator and
assistant rosters match too (the assistant's = the Section Editor's), with
no "Needs editor" and no "Declined" for any of them. View membership of an
incomplete draft, live-probed 2026-08-26: it lists under exactly "Active
submissions", "Needs editor" and "All in submission stage" (OJS + OMP) —
incomplete drafts count into "Needs editor" — and under "Active
submissions" + "All in production stage" on OPS. The review slices,
live-probed 2026-08-26 (OJS + OMP, identical three-state matrix): "Needs
reviews" keeps a submission while a submitted review awaits confirmation
and drops it only once reviews are confirmed; "Awaiting reviews" lists
only outstanding requests; a required-reviews setting of 0 behaves as a
floor of one.

<a id="fn-c"></a>
**c — scope.** `getDashboardViews()` computes
`canAccessUnassignedSubmission` = user holds admin or manager among the
page's roles; every view collector then either spans the context or is
`assignedTo($userId, $editorialRoleIds)` — an Author/Reviewer stage
assignment never qualifies on this page. The `assigned` API op enforces
the same (`_submissions/assigned`). `TYPE_ASSIGNED` is `assignedTo` even
for managers — hence "Assigned to me" ≠ "Active submissions". The search
view applies the identical split (fn-h). Live-probed 2026-08-26 on all
three apps: an unassigned submission appeared in none of a Section
Editor's (Series Editor's / Moderator's) views and its global search
returned "Search Results (0)", with a same-session positive control on the
assigned one; a Section Editor who authored a submission with no editorial
assignment found it in no editorial view and not via the editorial global
search (OJS leg), while their "My Submissions as Author" group listed it;
a manager's "Assigned to me" stood empty while "Active submissions"
listed the whole journal. The roles read are the journal's own
(`RoleDAO::getByUserId($userId, $contextId)`), so the site-wide
administrator role never counts toward `canAccessUnassignedSubmission`:
live-probed 2026-09-28 (all three apps, two runs), a Site Administrator
left with only Section Editor (Series Editor, Moderator) in the journal,
their Journal Manager role ended on screen and signed in afresh, got
"Assigned to me (1)" and "Active submissions (1)" (the list from
`_submissions/assigned`), no "Needs editor" and no "Declined" entry, and
a global search returning only the assigned submission; the same journal
before the role was ended showed "Active submissions (2)" and both entries.

<a id="fn-d"></a>
**d — the sidebar.** `PKPTemplateManager::setupBackendPage()`:
`$menu['dashboards']` (label `navigation.dashboards` = "Editor Dashboard",
one submenu entry per view) built for
admin/manager/sub-editor/assistant role holders; `$menu['reviewAssignments']`
/ `$menu['mySubmissions']` for reviewer/author. Count badges fetched
client-side from `_submissions/viewsCount` (`SideNav.vue`); the badge
color flips to the attention variant for view ids
`reviews-overdue` and `reviewer-action-required`
(`ViewsWithAttentionBadge`). Counts refresh via the app store's
`triggerReloadViewsCount` after each list refetch. Live-probed 2026-08-26:
the "Editor Dashboard" group label and the "Search submissions" box render
verbatim (all three apps); "Reviews overdue" shows the attention color at
a count of zero, and an overdue review lists under the view with "Review
overdue by {n} days" in its activity cell (OJS + OMP). Count refresh
live-probed 2026-08-26: within one session, no reload, the sidebar badges
and the heading total moved after a bulk delete and after an editor
assignment made from a row (OJS; the OMP badge movement rechecked and
confirmed the same day). Delete from inside the workflow panel, live-probed
2026-09-02 (OJS, OMP, OPS, `manager.maya`, a declined scratch submission):
`openWorkflowModal()`'s `onClose` calls `fetchSubmissions()`, which triggers
the count reload through a five-second trailing throttle (`appStore.js`);
the browser sent `_submissions/viewsCount` right after the delete and the
sidebar read "6 Declined" → "5 Declined" (OPS "8 Declined" → "7 Declined",
heading "Declined (8)" → "Declined (7)") before any reload. A badge read
inside the throttle window shows the old number for up to five seconds,
which an earlier same-day observation ("4 Declined" beside "Declined (3)")
had taken for a lag until reload. With Reader as a Site Administrator's
only journal role, `_submissions/viewsCount` answers 401 on every
dashboard load, both in the session that ended their Journal Manager role
and after a fresh sign-in (live-probed 2026-09-28, all three apps; fn-a9).

<a id="fn-e"></a>
**e — addresses.** URL query params: `currentViewId`, `searchPhrase`,
filter params, `sortColumn`/`sortDirection`, `workflowSubmissionId` (+
`workflowMenuKey`, the open panel's menu position) — `dashboardPageStore.js` treats the URL as
the source of truth (an unknown `currentViewId` falls back to the first
view). Legacy page `submissions`
(`PKP\pages\dashboard\DashboardHandler::index`) redirects through the
role-home logic — live-probed 2026-08-26 on all three apps during the
My Submissions build and re-probed the same day from the editorial side:
signing in as a manager lands on "Assigned to me", and the legacy
`{journal}/submissions` address forwards to `dashboard/editorial`.

<a id="fn-f"></a>
**f — heading, table, columns.** Heading `{currentView.name}
({itemCount})` + spinner (`DashboardPage.vue`). Editorial columns
(`useDashboardConfig.js::getColumns()`, default branch): `id` ("ID",
sortable), `title` ("Submissions"), `stage` ("Stage", label via
`getExtendedStageLabel` with a stage-colored dot rendered beside the
plain-text label — a small `rounded-full` span with a per-stage
background class, live-inspected 2026-08-26: the label sits in no bubble,
and the OPS incomplete row carries the same dot, labelled "Production"), `lastActivity` ("Days", sortable —
`DashboardCellSubmissionDays.vue`, days between `dateLastActivity` and
today), `activity` ("Editorial Activity"), `actions` ("Actions"). Page
size 30 (`PKPDashboardHandler::$perPage`); empty text "No Items"
(`grid.noItems`), "Loading" while fetching. Live-probed 2026-08-26: the
six header labels render identically on all three apps with sort controls
on ID and Days only; the heading carried its count ("Active submissions
(31)"); an empty view kept the full header row over the one "No Items"
row; a 31-row view showed "Previous / 1 / 2 / Next" pager buttons while a
1-row view showed none. The Stage cell of an incomplete submission read
"Incomplete" (OJS + OMP, live-probed 2026-08-26); OPS has no "Incomplete"
label — an incomplete preprint's read "Production". Sort-cycle and paging address behavior: fn-a5 and
the Rule 4 exceptions (paging XHR carries `offset`/`page` params; the URL
never does). The line under the list is `TablePagination.vue`
(`common.showingXofX`), and the pager (`Pagination.vue`, nav label
`common.pagination.label` = "View additional pages") renders only when
there is more than one page, "Previous" disabled on page 1 and "Next" on
the last. Live-probed 2026-09-28 (all three apps, two runs, 31 active
submissions): "Showing 1 to 30 of 31", after "Next" "Showing 31 to 31 of
31" with the one remaining row, and "Showing 0 to 0 of 0" on an empty
view; "Next" and "Go to Page 2" fetched `offset=30`, "Previous" and "Go
to Page 1" `offset=0`; the address stayed `?currentViewId=active`
throughout and a reload returned to page 1 with 30 rows. The load
notice is `dashboardPageStore.js` calling `announce(t('common.loaded'))`
into the page's `aria-live="polite"` region once a fetch completes.
Live-probed 2026-09-30 (all three apps, two runs): the region held
"Loaded" on arrival and after a search in English (Journal Manager), and
its code (fn-a12) on arrival for the Journal Manager and the Section
Editor and after a search or a sort in French; it was empty on later
reads, and the page's visible text never held it.

<a id="fn-g"></a>
**g — in-page search.** `DashboardControlSearch.vue`, label
`editor.submission.search` = "Search submissions, ID, authors, keywords,
etc."; sets the `searchPhrase` URL param and resets to page 1; the phrase
rides `submissionsQuery` alongside the view's own criteria — it narrows,
never widens. Chips row `DashboardActiveFilters.vue`: search chip with X
(`common.clearSearch`), per-filter chips (`common.filterRemove`), "Clear
Filters" (`common.filtersClear`) when filters are active. View switch
clears phrase and filters (store watcher). Live-probed 2026-08-26 (OJS):
the placeholder renders verbatim; the phrase matched a title, a numeric
submission ID and an author's family name; the chip read "Search:
{phrase}" and its X restored the full view with the heading count
following each way.

<a id="fn-h"></a>
**h — global search and the Search Results view.**
Sidebar item `itemType: 'search'`, label `editor.submission.searchGlobal`
= "Search submissions", prepended to the dashboards group only
(`PKPTemplateManager`); submit sets `searchPhrase` + `currentViewId=search`
(`SideNav.vue::onSearchSubmit`; empty submit clears). The view:
`Repository::getSearchView()` — "Search Results"
(`search.searchResults`), no status/stage filter, manager/admin span the
context, sub-editor/assistant get `assignedTo` with editorial roles;
appended to the page's view list only for the editorial page
(`PKPDashboardHandler::getViews()`), never as a counted menu entry. Store:
`SEARCH_VIEW_ID` — entering saves `_preSearchViewId`; the in-page search
control is filtered out on this view; when phrase and filters are all
empty the store returns to the saved view (or the first). Live-probed
2026-08-26: a manager's search surfaced a declined and a published
submission side by side under "Search Results (2)" (OJS); the in-page
search box was absent on the view and clearing the phrase returned to the
non-default view the search started from (all three apps); clearing the
phrase while a filter chip stayed active kept the "Search Results" view
(OJS).

<a id="fn-i"></a>
**i — filters.** `PKPSubmissionFilters` (shared):
`addSectionFields()` (skipped when the context has exactly one section;
it counts and lists every section, with no active or editor-only
condition; label `section.section`), `addAssignedTo()` (gated `isManagerOrAdmin()`,
label `editor.submissions.assignedTo` = "Assigned To Editor"; suggest list
from the users API restricted to manager+sub-editor role ids),
`addCategories()` (when any exist), `addDaysSinceLastActivity()`
(`FieldSlider` 0–180, label `submission.list.daysSinceLastActivity`);
the slider's direction live-probed 2026-08-26 (OJS): a value N keeps only
rows with idle days at or above N — a value of 5 against an all-Days-0
list emptied it.
OJS subclass adds `addIssues()` (when any issue exists; label
`issue.issues`); OMP subclass rebuilds the form *without* section fields
(OMP1); OPS subclass = shared set. The same form serves every dashboard
page — the role, not the page, decides the "Assigned To Editor" field
(probed 2026-08-26 on the author's list: a Manager+Author account gets it
there too — recorded in *My Submissions*). Modal
`DashboardModalFilters.vue`: title `common.filter` = "Filters", buttons
"Clear Filters" / "Apply Filters" (`dashboard.applyFilters`); apply emits
the form state into the URL params and closes. Live-probed 2026-08-26 on
the editorial dashboard: the seeded two-section journal's manager panel
listed Section / Assigned To Editor / Issues / Categories / Days since
last activity, labels verbatim; a one-section, no-issues, no-categories
scratch journal reduced to Assigned To Editor + Days since last activity;
a Section Editor's panel had no "Assigned To Editor" (OJS). The suggest
list showed no options until a name was typed, then exactly the journal's
Journal Managers and Section Editors — a Site Administrator appears in it
only through the Journal Manager group it also holds; an assistant and a
reviewer name returned nothing. OPS renders the field's label as
"Assigned to Moderator" (both a two-section scratch server and the seeded
server); a two-series press's panel offered no series or section field
(OMP1, editorial-dashboard leg).
Live-probed 2026-09-29 (Fields row "Section"; OJS and OPS, two runs on
scratch journals, the Journal Manager and an assigned Section Editor or
Moderator): one active section "Open" plus one inactive "Shut", and one
section plus one restricted to editors ("Items can only be submitted by
Editors and Section Editors."; OPS "Items can only be submitted by
Managers and Moderators."), each offered "Section" listing both titles as
plain checkboxes to both accounts; applying "Shut" narrowed "Active
submissions (2)" to its one submission with the chip "Section: Shut";
the default section alone offered no "Section" field. A two-series
press offered none to the Press Manager or the Series Editor (OMP1).
Live-probed 2026-09-29 (Rule 8; all three apps, two runs, the Journal
Manager and an assigned Section Editor, Series Editor or Moderator, each
read on the page and again after a reload): with "Section: Alpha" (OMP:
"Categories: Cat One") applied, reopening "Filters" showed it ticked (OMP:
a "Remove Cat One" chip in the field); the panel's "Clear Filters"
unticked it, sent no request and left the list behind with its chip and
narrowed count; "Close" then kept the chip, the count and the address
parameter (`sectionIds` / `categoryIds`), and the panel reopened ticked;
the panel's "Clear Filters" then "Apply Filters" restored the full view
with no chip and a clean address; the chips row's "Clear Filters" did the
same at once. A tick left unapplied, then "Close": no request, the list
unchanged ("Active submissions (2)", no chip), no browser dialog, and the
panel reopened empty; a reload read the same.

<a id="fn-j"></a>
**j — the activity cell.**
`useDashboardConfigEditorialActivity.js::getEditorialActivityForEditorialDashboard()`,
branches in Rule 9's order: author-conflict alert
`dashboard.noAccessBeingAuthor` (assigned as author AND not assigned via
manager/sub-editor/assistant), reviewer-conflict
`dashboard.noAccessBeingReviewer`; declined status →
`dashboard.declinedDuringStage`; `submissionProgress` → "Complete
submission" (`submission.list.completeSubmission`) → redirect to the
wizard (`submission?id={id}`); Submission stage without `editorAssigned` →
"Assign Editor" (`submission.list.assignEditor`) →
participant-assign side modal; review stages → round-status branches
(strings quoted verbatim in Rule 9e; `REVIEW_ROUND_STATUS_*`), with
`dashboard.assignReviewers` = "Assign Reviewers" on
`PENDING_REVIEWERS`; the deciding-editor collapse to recommendation
messaging applies only when `isCurrentUserDecidingEditor` — true only
when the user is a deciding editor AND recommending editors are assigned
(`submission/maps/Schema.php::getPropertyStages()`) — the collapse maps
the reviewer-side round statuses (pending reviewers, pending / ready /
completed / overdue reviews, returned to review) to
`PENDING_RECOMMENDATIONS`, an alert with no indicators, ahead of the 9e
branches (revision statuses unmapped); recommend-only
branches per `currentUserCanRecommendOnly` / `currentUserRecommendation`
(fn-a14);
`WORKFLOW_STAGE_ID_EDITING` → `dashboard.copyEditedFilesUploaded`;
Production + scheduled + issue label → `dashboard.toBePublishedInIssue`
(the issue condition makes 9h OJS-only in practice); else empty. The
conflict branches suppress "View" and the cell's action buttons alike
(`DashboardCellSubmissionActions.vue::showButton` — editorial page only).
Live-probed 2026-08-26, branch by branch: conflict rows rendered both
fixed sentences verbatim, press included, with no buttons on the row
(OJS + OMP, author and reviewer variants; the Site-Administrator-as-author
wording leg rests on the shared string — fn-a3); "Complete submission"
entered the author's wizard (fn-a2); "Assign Editor" opened the "Assign
Participant" window, and after assigning, the cell went quiet, the row
left "Needs editor" and its count dropped (OJS + OMP), while a fresh
preprint's cell stayed empty with no button (OPS control); declined rows
read "Declined during the Review stage." / "Declined during the
Production stage." (OPS) and kept "View"; the 9e revision and
confirmation strings rendered verbatim — a resubmit row stacks "Revisions
submitted" and "New review round to be created" as two lines in one
cell — and the minimum-required sentence replaced the all-confirmed one
once a required-reviews minimum was set (OJS + OMP; the
confirmed-vs-minimum arc OJS); the recommending-editor arc rendered its
five strings byte-identically on journal and press — the closing "All
editorial recommendations have been received…" sentence also shows to an
unassigned journal-wide Journal Manager, not only a deciding editor;
copyediting rows counted uploads (OJS + OMP); a scheduled OJS row read
"To be published in issue {issue}" with a "Scheduled" stage label and no
longer listed under "Active submissions"; production and published rows
on OMP and OPS kept an empty cell (no scheduled state is reachable
through a press's publish screens).

<a id="fn-k"></a>
**k — review activity indicators.**
`DashboardCellSubmissionActivityReviews.vue` (one item per assignment in
`getCurrentReviewAssignments` — active assignments of the current round)
→ `ReviewActivityIndicator` + `ReviewActivityIndicatorPopover.vue`;
config per reviewer status in
`useDashboardConfigReviewActivity.js::ConfigPerStatus` — indicator
variant (progress ring with day count vs icon; attention color for the
two overdue statuses, negative for declined/cancelled, success for
received/viewed/complete/thanked), popover title/description keys
(`dashboard.reviewAssignment.status*`), and the three button slots
mapped to Reviewer-manager actions (resend request, edit due date, review
details, cancel, unassign; "View recommendation" / "View unread
recommendation" open review details). Titles quoted verbatim in the
Rule 10 table; "Unassign" is the popover's label
(`dashboard.reviewAssignment.action.unassignReviewer`) for the same act
the Reviewers panel calls "Unassign Reviewer". The recommendation line in
the completed popover renders only when the journal supplies
recommendation options (OJS; OMP/OPS get the without-recommendation
description). Store handlers (`reviewerAddReviewer`,
`reviewerResendRequest`, `reviewerEditReview`, `reviewerReviewDetails`,
`reviewerCancelReviewer`, `reviewerUnassignReviewer`, `fileUpload`,
`participantAssign`) each refetch the list on close. Indicator looks and
popover texts live-probed 2026-08-26 (OJS + OMP, nine reviewer states per
app): headlines, descriptions, ring/icon variants and colors rendered per
the Rule 10 table, identical across the two apps except the completed
popover's recommendation line — the journal names the recommendation, the
press shows the completed sentence without one; the unread button flipped
to "View recommendation" once the recommendation had been viewed. Popover
buttons live-probed 2026-08-26 (OJS + OMP, every button pressed on each
app): each opened the same side window the workflow's Reviewers panel
opens — "Edit Review", "Review Details: {title}", "Unassign Reviewer",
"Cancel Reviewer", "Resend Review Request" — and the list refetched after
the window closed, including a close without saving. With
pkp/ui-library#853 (issue pkp/pkp-lib#13359; driven
2026-09-23 on OJS at the PR heads `cab09538` and `51f0c727`, before its
merge) the handlers still refetch at every close: `refetchCallback`
ignores the close's `dataChanged` flag, and `openWorkflowModal()`'s
`onClose` always refetches. The review window marks the review read
(`…/consider`) only once it has loaded, and the dashboard's refetch at
the close can go out before that call or alongside it: a window closed
that soon leaves "View unread recommendation" until a page reload (the
kept check `shared/playwright/checks/sync/ui-library-853/stale-read.js`,
which holds that call until the window has closed: one `/_submissions`
reload, the popover still "View unread recommendation", at both heads;
at the tip's lib/ui-library `2034439a` it offered "View
recommendation"). At `51f0c727` scenario 9's earlier test, with no wait
before "Cancel", went red twice in 16 repeats, the list GET 14–25 ms
before the mark;
*[Reviewer assignment & management](U27-reviewer-assignment-and-management.md#a32)*.

<a id="fn-l"></a>
**l — open in place.** `dashboardPageStore.js::openWorkflowModal()`: side
modal hosting the workflow page; sets `workflowSubmissionId` (+ menu-key
param) in the URL; `onClose` clears them and refetches; a URL carrying
`workflowSubmissionId` auto-opens on load. Live-probed 2026-08-26 on all
three apps from the editorial dashboard (and the same day from the
author's list — same store path): "View" opened the panel in place, the
address gained `workflowSubmissionId` + `workflowMenuKey`, reloading that
address reopened the panel, and closing restored the bare list address.

<a id="fn-m"></a>
**m — bulk delete.** `useDashboardBulkDelete.js`:
`bulkDeleteIsAvailableForUser` = editorial page AND (site admin or
manager); `canBeDeleted` per row = `submissionProgress` AND (admin /
manager, or assigned author — the author leg serves My Submissions).
Entry `DashboardControlBulkActions.vue` ("More Actions" ellipsis; item
disabled while no listed row is deletable), selection-mode buttons
`DashboardControlBulkDeleteButton.vue`, confirm dialog strings
`dashboard.submissions.incomplete.bulkDelete.*` (quoted verbatim in
Rule 12), request = bulk delete on the backend-submissions API
(`_submissions?ids[]`), then refetch; any query change resets the
selection (store watcher). Server side
(`PKPBackendSubmissionsController::bulkDeleteIncompleteSubmissions`):
role gate admin/manager/author, refuses non-incomplete ids, and re-checks
each submission via `Repository::canCurrentUserDelete()` — whose
manager/admin branch is role-only (no stage-assignment condition), so a
preprint-server manager is expected to succeed where the OPS author
cannot (the author-side 🐞 recorded in
*[My Submissions](U22-my-submissions.md)*). Live-probed 2026-08-26: the
full flow ran on OJS — dialog strings verbatim, checkboxes on incomplete
rows only, the delete button disabled until a tick, dialog-Cancel exiting
selection mode entirely, and changing view/search/filters dropping the
selection; the Confirm leg deleted on OMP and on OPS (the preprint-server
manager's delete succeeded, as the role-only branch predicts); a Section
Editor's and an assistant's dashboards rendered no "More Actions" button
at all (OJS + OMP, with the button row's neighboring controls as positive
controls). The single-row delete endpoint on the
same API is not offered by this page's screens.

<a id="fn-n"></a>
**n — the outstanding-tasks email.** Scheduled task
`PKP\task\EditorialReminders` — registered `monthlyOn(1)` in the OJS and
OMP schedulers (`APP\scheduler\Scheduler`); the OPS scheduler does not
register it (absence = install fact). The task queues one
`PKP\jobs\email\EditorialReminder` job per active manager/sub-editor per
enabled context. The job re-checks role and opt-out
(`NOTIFICATION_TYPE_EDITORIAL_REMINDER` blocked list), collects the
editor's assigned queued submissions, and builds up to 20 outstanding
lines: Submission stage → "waiting initial review"; review-stage round
statuses pending reviewers / pending reviews / reviews ready / reviews
completed / reviews overdue / revisions submitted; copyediting or
production idle > 30 days. Mailable `PKP\mail\mailables\EditorialReminder`
(template key `EDITORIAL_REMINDER`): subject "Outstanding editorial tasks
for {$contextName}", body listing the tasks with links to
`dashboard/editorial`, from the context's principal contact, with an
unsubscribe link (`allowUnsubscribe`) and a paired in-app notification.
Sent only when at least one line exists. Not screen-reachable to trigger;
claims here rest on this code path (no probe item — see the probe-list
note).

<a id="fn-o"></a>
**o — the read-and-launch claim.** The send-nothing leg live-probed
2026-08-26 (OJS): the Mailpit total stood at 500 before, during and after
a full session of listing, searching and filtering — nothing sent. The
log-nothing leg has not been checked on a log surface; it rests on the
code path — the listing ops are read-only queries on the backend
submissions API (fn-a, fn-m) with no logging step. One before/after look
at a listed submission's activity log (or the journal's event log) around
a listing/search/filter pass would settle it; lean: holds.

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** A scratch journal (the suites' choice, so every
badge count is the scenario's own) with a throwaway Journal Manager
(`manager`) and Author (`author`; passwords = username doubled, as for
every throwaway account below), holding one submitted submission, one in
copyediting (`decisions: ['skipExternalReview']`, OJS and OMP), one in
production (`decisions: ['skipExternalReview', 'sendToProduction']` on
OJS and OMP; on OPS the submitted preprint already sits on Production, so
one seed serves both) and one `published: true`, all by the author. Sign
in on the journal's own login page (`{path}/login`): landing on
`dashboard/editorial` "Assigned to me" is the landing rule in
*[My Submissions](U22-my-submissions.md)*, "Landing". The "Reviews
overdue" badge color is the attention variant (fn-d). The copyediting
cell's count is expected at 0, since a seeded submission carries no files
(scenarios.md); the suites match the label and read the number. The
"No Items" control uses whichever view's badge reads 0.

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** A scratch journal with a throwaway Journal
Manager, an Author and a Section Editor holding no section assignment (so
a submit auto-assigns nobody) and, on OJS and OMP, the `externalReviewer`
role too. Four submissions by the author: one with
`participants: [{username: <se>, role: 'sectionEditor'}]`, one untouched
("Unassigned study"), one submitted by the Section Editor's own account
("Authored study"), and on OJS and OMP one moved to review with
`reviewRounds: [{reviewers: [{username: <se>, status: 'invited'}]}]`
("Reviewed study"). The negative claims ("appears in no view") are checked
across every sidebar entry plus the global search for the title. Author
and reviewer legs live-probed 2026-08-26 (fn-c).

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** A scratch journal; three active submissions
with distinct titles ("Search target" among them) and one `published:
true` ("Published study"), so narrowing is observable against the heading
count. The Days filter at 30 against rows created today keeps no row: the
combined bullet asserts the two chips, "Clear Filters" and an empty list.
The mailbox bullet reads the mail catcher (Mailpit, one shared instance
at `MAILPIT_URL`, default `http://127.0.0.1:8025`) and compares its total
(`messageCount()`) before and after, paired with a positive control the
test sends itself.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** A scratch journal; one submission declined
from the Submission stage (`decisions: ['decline']`, so its activity cell
stays quiet) plus one active as noise; start the search from "Active
submissions" (a non-default view, so the return is observable). The Days
filter at 30 on today's rows empties the results; the filter chip and the
view name are the observables (Rule 7's filters-on-results and
phrase-cleared-alone legs live-probed 2026-08-26, fn-h).

<a id="fn-s5"></a>
**s5 — scenario 5 seeding.** A scratch journal; the idle submission
cannot be seeded, because the scenario endpoints cannot backdate last
activity (checked 2026-08-26), so the suites set the slider to 30 against
fresh rows and assert the chip, the narrowing (to no rows) and the
restore; the slider keeps rows idle *at or above* the value (fn-i). The
"Section" leg (OJS and OPS) needs a two-section scratch context
(`sections: [{abbrev: …}, {abbrev: …}]`) with one submission seeded under
the second (`section: <abbrev>`); OMP's context accepts no `series[]`
and its panel has no series field (OMP1). The "Assigned To Editor" leg
needs the throwaway Section Editor assigned to one submission
(`participants: [{username: <se>, role: 'sectionEditor'}]`); the suggest
list is opened without typing first, then the name is typed and picked.
The chip's-X leg adds the Days filter at 30 on top (the list empties)
and drops the Days chip: the editor's chip and its one row are back. The
"Switching views" bullet opens "Published" with the editor's chip still
active. The Section Editor's control leg reuses the same account.

<a id="fn-s6"></a>
**s6 — scenario 6 seeding.** The seeded journal: a scratch submission by
`author.alex`, viewed by `manager.maya` (OMP: `editor.diana`); assert the
address gains the open-panel parameter, survives reload, and is restored
exactly on close.

<a id="fn-s7"></a>
**s7 — scenario 7 seeding.** A scratch journal. For the paging leg, 31+
submissions (builder loop); the sort legs need only a handful with
distinct IDs and idle times. The paging leg may be dropped by the test
authors if seeding cost is prohibitive — sorting is the load-bearing
claim. The Days-*ordering* leg has its own seeding constraint (checked
2026-08-26): the scenario endpoints cannot backdate last activity, so on a
same-day database every row ties at 0 days and reordering by idle time is
not observable — the test may limit the Days assertion to the address
recording the sort and the list refetching, as the paging leg may be
dropped.

<a id="fn-s8"></a>
**s8 — scenario 8 seeding.** {OJS OMP} A scratch journal; one submission
submitted with no participants beyond the author (`participants: []`), and
a throwaway Section Editor to assign. On OMP the submission stage precedes
internal review as on OJS.

<a id="fn-s9"></a>
**s9 — scenario 9 seeding.** {OJS OMP} Four submissions moved to review
(`decisions: ['sendExternalReview']`): one with `reviewRounds:
[{reviewers: []}]`, one with two reviewers `invited` and a third
`status: 'declined'`, one with `decisions: ['sendExternalReview',
'requestRevisions']` and one with `decisions: ['sendExternalReview',
'resubmit']` (the "Request Revisions" decision with and without "Require
New Review Round"). OJS runs it on the seeded journal (`manager.maya`,
`author.alex`, `reviewer.julia` and `reviewer.paul` invited,
`reviewer.amara` declined); OMP on a scratch press with throwaway
reviewers, since the roster reviewers are not enrolled on a scratch
context. Seed the two open requests as invited, not accepted (observed
2026-08-26): the "Awaiting Response from the reviewer" popover belongs to
an open request — an already-accepted one shows the "Ongoing review -
request accepted" popover instead, which is what the "accepted request"
bullet reads after the reviewer's on-screen accept. The declined
reviewer's icon and popover are the declined row of the Rule 10 table
(fn-k). "View details" opens the "Review Details: {title}" window (fn-k).
The reviewer accepts and later completes through their own wizard
([reviewer flows](U28-reviewers-review.md)), the list reloaded after
each.

<a id="fn-s10"></a>
**s10 — scenario 10 seeding.** A scratch journal; a Manager+Author combo
account (`roles: ['manager', 'author']`, plus `'externalReviewer'` on OJS
and OMP) with one submission it submitted, an unrelated submission as the
positive "View" control, and on OJS and OMP a third moved to review with
the combo account invited as its reviewer (`decisions:
['sendExternalReview'], reviewRounds: [{reviewers: [{username: <combo>,
status: 'invited'}]}]`). The reviewer notice is the second fixed sentence
of fn-j; the test matches it by "Review Assignments", not by its role
wording (A3).

<a id="fn-s11"></a>
**s11 — scenario 11 seeding.** s2's assigned submission, titled "Declined
study", seeded active and declined by the manager on screen, from its
current stage inside the workflow panel opened by "View", so the badge and
total can be read after the panel closes (Rule 13, fn-d). The decision is
the "Decline Submission" wizard on every app: the Submission stage's on OJS
and OMP, the Production stage's on OPS, where a submitted preprint already
sits on Production ([→ Submission stage](U25-submission-stage.md)). Test
run 2026-09-12 on OPS: the wizard opened from inside the panel under the
heading "Decline Submission", and the row's activity cell then read
"Declined during the Production stage." (Rule 9b). The Section Editor checks:
no "Declined" sidebar entry (and on OJS and OMP no "Needs editor" entry —
rosters live-probed 2026-08-26, fn-b), submission absent from all views,
found via global search. The delete leg presses the declined stage's
"Delete" inside the panel and confirms the "Delete" dialog (fn-d,
live-probed 2026-09-02 on all three apps): the count reload runs through
a five-second trailing throttle, so the badge read allows up to five
seconds and never reloads the page.

<a id="fn-s12"></a>
**s12 — scenario 12 seeding.** A scratch journal; two incomplete
submissions (`submitted: false`) by two throwaway authors plus one
submitted control. The author leg signs in as one of the two and reads My
Submissions ("Incomplete submissions"; "Active submissions" on OPS) and
the mail catcher (fn-s3 names it) scoped to that author's address, paired
with a positive control. The two "Cancel" legs and the view-switch leg
(fn-m, live-probed 2026-08-26: dialog-Cancel exits selection mode
entirely; a view change drops the selection) run before the delete, each
re-entering selection mode through "More Actions"; after each, both
incomplete rows are asserted still listed. The grayed entry is read by
reopening "More Actions" on the same page after the deletion. The Section Editor negative leg asserts the "More
Actions" button itself is absent — count 0, not a menu missing one entry
(positive control: the same account sees the button row's other
controls).

<a id="fn-s13"></a>
**s13 — scenario 13 seeding.** {OJS} The seeded journal (`manager.maya`);
a scratch submission scheduled into a created-but-unpublished issue
(schedule path per the production/issue features) plus one active scratch
submission in no issue. Creating the scratch issue: with the default show
volume/number/year/title checkboxes on, all four identification fields
are required (probed 2026-08-26). Seeding caveat (probed 2026-08-26,
deterministic): in the "Schedule For Publication" window, choosing "Assign
To Future Issue and Schedule Only" as the very first issue-assignment pick
produces the publish-immediately confirmation instead of the schedule one
— a defect of the publication-scheduling screens (production-stage
territory, no spec yet). To seed the scheduled state, pick "Assign To
Future Issue and Publish Immediately" first, then switch to "…Schedule
Only": the confirmation then reads "This will be published when {issue}
is published…" and the row schedules correctly.

<a id="fn-s14"></a>
**s14 — scenario 14 seeding.** {OMP} A scratch press; two monographs: one
sent to Internal Review (`decisions: ['sendInternalReview']`, the round's
`stage: 'internal'`), one to External Review (the skip-internal decision);
no reviewers on either round, so both activity cells offer "Assign
Reviewers" (the OMP suite's S14 asserts the button on both rows).

<a id="fn-s15"></a>
**s15 — scenario 15 seeding.** {OPS} The seeded server, `manager.maya`;
one fresh scratch preprint and two incomplete ones for the cleanup leg
(succeeds — fn-m; contrast with the author-side refusal recorded in
*[My Submissions](U22-my-submissions.md)*).

<a id="fn-s16"></a>
**s16 — scenario 16 seeding.** The seeded journal: `author.alex` (Author
only on every app) types `{journal path}/dashboard/editorial`; the control
is `manager.maya` at the same address. Live-probed 2026-08-26 on all three
apps (fn-a): the author-only account got "The current role does not have
access to this operation."

<a id="fn-s17"></a>
**s17 — scenario 17 seeding.** {OJS OMP} Two scratch journals, each with
a throwaway Journal Manager, Author and `externalReviewer`: one created
without a `review` key (the install default, "Minimum Confirmed Reviews
Required" 0, seed-facts.md), one with `review: {numReviewsPerSubmission:
1}` (scenarios.md "Configuring a scratch context"). Each holds one
submission moved to review (`decisions: ['sendExternalReview']`; on OMP
`skipInternalReview` reaches the external stage the same way) with
`reviewRounds: [{reviewers: [{username: <reviewer>, status:
'completed'}]}]`: a submitted, unconfirmed review, whose popover is the
completed row of the Rule 10 table. Confirming is "Mark as Complete" in
the "Review Details: {title}" window the popover's "View unread
recommendation" opens (fn-k;
[→ reading and confirming](U27-reviewer-assignment-and-management.md#read-review)).
The "Needs reviews" membership is asserted only on the journal with the
minimum: at the default the view keeps the row too (fn-b: a setting of 0
behaves as a floor of one), but that is a footnote fact the body does not
state, so no scenario relies on it. Message strings: fn-j (the
minimum-required sentence replaced the all-confirmed one once a minimum
was set, OJS + OMP).

<a id="fn-a1"></a>
**a1 — A1 evidence.** `TYPE_DECLINED`'s role list is
admin+manager+author; no editorial view type includes declined status for
sub-editor/assistant, and the published view's role list does include
them — the gap is specific to declined. The search view has no status
filter and is available to all four editorial roles (fn-h), which is what
keeps the submission reachable. Live-probed 2026-08-26 on all three apps:
no Section Editor / Series Editor / Moderator or assistant sidebar
offered a "Declined" (or "Needs editor") entry, while a manager's global
search surfaced declined and published rows side by side (fn-h). The last
leg — a Section Editor's own global search returning *their* declined
submission — was observed live 2026-08-26 in the scenario-11 walk (OJS):
the search returned "Search Results (1)" listing the declined submission
with its "Declined" stage label and its "View" button.

<a id="fn-a2"></a>
**a2 — A2 evidence.** The `submissionProgress` branch of the editorial
activity composable is identical to the author's ("Complete submission" →
wizard redirect), with no role condition beyond seeing the row; managers
see every incomplete submission journal-wide (fn-c). Live-probed
2026-08-26 (OJS + OMP): a Journal Manager pressing "Complete submission"
on another author's draft landed in that draft's submission wizard and
advanced past its first step on both apps; the final submit was not
driven — the through-to-submission leg rests on the shared code path.

<a id="fn-a3"></a>
**a3 — A3 evidence.** `dashboard.noAccessBeingAuthor` /
`dashboard.noAccessBeingReviewer` are single shared strings naming
"Journal Manager"; no OMP/OPS locale override exists (checked
`{omp,ops}/locale/en`, 2026-08-26). Rendering contexts are limited to
journal-wide accounts (fn-c), so the misnaming shows to Site
Administrators and to OMP/OPS managers. Live-probed 2026-08-26 (OJS +
OMP, author and reviewer variants): both sentences rendered verbatim —
"as a Journal Manager" on the press too — with no trailing period and no
buttons on the row. The Site-Administrator-as-author rendering rests on
the shared string alone: an admin-authored submission was not
constructible without mutating the shared seeded account.

<a id="fn-a4"></a>
**a4 — A4 evidence.** `ConfigPerStatus` keys the cancelled status
(set by the editor's Cancel Reviewer — the code comment itself says
"editor cancelled review request") to title
`dashboard.reviewAssignment.statusCancelled.title` = "Reviewer cancelled
review request". The declined status has its own distinct title.
Live-probed 2026-08-26 (OJS + OMP): after the editor's "Cancel Reviewer" —
the reviewer took no action at any point — the popover read "Reviewer
cancelled review request" / "Reviewer has cancelled the review request on
{date}." on both apps, with "Resend Review Request" and "View details" as
the buttons.
Issue report: [pkp-e2e#905](https://github.com/jardakotesovec/pkp-e2e/issues/905) ([docs/issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md](../issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md)).

<a id="fn-a5"></a>
**a5 — A5 evidence.** Live-probed 2026-08-26 (OJS, manager, 31-row view;
reproduced twice in separate runs): the third click on a sorted header
fires the list request with no ordering parameter and the rows revert,
while the address keeps `sortColumn`/`sortDirection` unchanged; reloading
that address re-applied the sort. The list client is shared across the
apps (pin evidence in fn-a), so the behavior is not marked per-app.
Issue report: [pkp-e2e#906](https://github.com/jardakotesovec/pkp-e2e/issues/906) ([docs/issues/U23-A5-dashboard-unsort-keeps-sort-in-address.md](../issues/U23-A5-dashboard-unsort-keeps-sort-in-address.md)).

<a id="fn-a6"></a>
**a6 — A6 evidence.** Live-probed 2026-08-26 (OJS + OMP, same string on
both): with a response due date of 2026-08-18 and a review due date of
2026-08-20 on the assignment, the overdue popover read "Review overdue by
6 days" / "This reviewer has not completed their review. A response was
due on 2026-08-20." — the review due date under the response label. The
request-overdue state's description ("This reviewer has not responded to
the review request. A response was due on {date}") is correct in its own
context; the review-overdue state reuses the response sentence where a
review sentence is needed (popover description keys per status in
`ConfigPerStatus` — fn-k).
Issue report: [pkp-e2e#905](https://github.com/jardakotesovec/pkp-e2e/issues/905) ([docs/issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md](../issues/U23-A4-A6-review-popover-cancelled-overdue-wording.md)).

<a id="fn-a7"></a>
**a7 — A7 evidence.** Live-probed 2026-08-26 (OJS + OMP, manager vs
assigned Funding Coordinator within the same minute, eight-reviewer
round): the manager's row carried 8 indicators, the assistant's 6 — none
for the declined or the cancelled reviewer. The browser's own traffic
shows why: the manager's list rides the journal-wide submissions op
(`_submissions`), whose item carries all 8 review assignments; the
assigned-user op (`_submissions/assigned`) returns the same item with the
declined and cancelled assignments omitted server-side. The assistant's
popovers offered exactly the editor's button sets, and "Edit Due Date"
opened the full "Edit Review" window live (open only; no assistant-side
save probed).

<a id="fn-a8"></a>
**a8 — A8 evidence.** Live-probed 2026-08-26 (OJS seeded, an editor's
Profile > Notifications, read-only): the "Editors" group lists "Weekly
email of outstanding tasks" with the "Enable these types of
notifications." / "Do not send me an email for these types of
notifications." checkboxes — the opt-out surface behind fn-n's blocked
list. The schedule is `monthlyOn(1)` (fn-n). The {OJS OMP} scope follows
the email's own; the label was observed on OJS — the OMP leg rests on the
shared notification machinery, not separately probed.

<a id="fn-a9"></a>
**a9 — A9 evidence.** The page gate admits `ROLE_ID_SITE_ADMIN` (fn-a),
and "More Actions" (`bulkDeleteIsAvailableForUser`, fn-m) and the
"Assigned To Editor" field (`isManagerOrAdmin()`, fn-i) follow the
site-wide administrator role, while the views and lists follow the
journal's own roles (fn-c). Live-probed 2026-09-28 (all three apps, two
runs each, the Site Administrator given a second journal role through the
scenario tooling, their Journal Manager role then ended on their edit
page): with Reader left, both in that session and after a fresh sign-in,
`{journal}/dashboard/editorial` answered 200 and was rewritten to
`?currentViewId=search`, `_submissions/viewsCount` and
`_submissions/assigned` answered 401, one "Error" dialog read "The current
role does not have access to this operation." with "OK", and behind it
stood "Search Results (0)", one "No Items" row, "Showing 0 to 0 of 0",
"Filters" (fields "Assigned To Editor", "Assigned to Moderator" on OPS,
and "Days since last activity") and "More Actions" (a grayed "Delete
Incomplete Submissions"); the sidebar's "Editor Dashboard" group had no
entries and its "Search submissions" box was hidden. `?currentViewId=active`
gave the same, and `?workflowSubmissionId={id}` answered `submissions/{id}`
401 under the same dialog with no panel, for an assigned and an unassigned
submission. With Section Editor (Series Editor, Moderator) left, every
request answered 200, the lists were assigned-only (fn-c), and "More
Actions" and the "Assigned To Editor" field stayed. Whether the bulk
delete then reaches incomplete submissions the account cannot list was
not driven. Control: the same journals before the role was ended,
"Active submissions (2)", every request 200. No response of 500 or more
and no page error in any run.

<a id="fn-a10"></a>
**a10 — A10 evidence.** The shared `Pagination.vue` gives "Previous" and
each page number an `aria-label` from `common.pagination.goToPage` ("Go to
{$page}") and gives "Next" none. Live-probed 2026-09-28 (all three apps,
two runs, a 31-row "Active submissions"): the nav "View additional pages"
held buttons named "Go to Previous", "Go to Page 1", "Go to Page 2"
(`aria-current` on the page showing) and "Next"; a button named "Go to
Next" matched nothing. The same component pages the backend's other
tables.
Issue report: [pkp-e2e#901](https://github.com/jardakotesovec/pkp-e2e/issues/901) ([docs/issues/U23-A10-pager-next-lacks-spoken-label.md](../issues/U23-A10-pager-next-lacks-spoken-label.md)).

<a id="fn-a11"></a>
**a11 — A11 evidence.** `DashboardActiveFilters.vue` renders one chip per
entry of `activeFiltersList` (keyed field label + value label), its X
emitting `removeFilter(name, value)`. The 2026-09-29 probes (fn-i) applied
one value per field only.

<a id="fn-a12"></a>
**a12 — A12 evidence.** `common.moreActions` and `common.loaded` (lib/pkp
`locale/en/common.po`) and `dashboard.reviewAssignment.statusAccepted.title`
(`locale/en/submission.po`) have no entry in lib/pkp's `locale/fr_CA`;
OMP's `locale/fr_CA/editor.po` carries `editor.submissions.assignedTo`
with an empty text, where OJS's and OPS's are translated. Live-probed
2026-09-30 at ojs `7ce98ec09e`, omp `3b0ecf794c`, ops `c8af945bb7`
(lib/pkp `3dc90c81a6`), two runs, all three apps, on a scratch context
with English and French (Canada) interface languages, as its Journal
Manager and an assigned Section Editor; every French read was paired
with the same read in `/en/`, where none of the codes showed. The
"…" button's `aria-label` and its menu's name read the code; no row
carries a menu button (a row's buttons are "Afficher", "Compléter la
soumission" on the incomplete row, "Assigner un rédacteur-trice" on a
Submission-stage row with no editor, and the review indicators); the
bulk delete was driven to its French confirmation and cancelled. The
Section Editor had no "…". The accepted-review code showed in the cell
on every manager view listing a round-1 submission whose reviewer had
accepted, and as the popover's headline (OJS and OMP); a completed
review's cell and popover read French, the popover naming the
recommendation on OJS only (Rule 10). OMP's Filters label read the code
in both runs. No response of 500 or more and no page error. The
indicator's French "Afficher plus de details" lacks the accent on
"détails", a translation typo rather than a code.
Issue report: [pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457) ([docs/issues/U53-A11-users-tab-french-raw-keys.md](../issues/U53-A11-users-tab-french-raw-keys.md)), for `common.moreActions` and `common.loaded`.
Issue report: [pkp-e2e#900](https://github.com/jardakotesovec/pkp-e2e/issues/900) ([docs/issues/U22-A6-my-submissions-french-review-counter-raw-key.md](../issues/U22-A6-my-submissions-french-review-counter-raw-key.md)), for the accepted reviewer's indicator.
Issue report: [pkp-e2e#291](https://github.com/jardakotesovec/pkp-e2e/issues/291) ([docs/issues/U69-A15-omp-french-book-page-raw-keys.md](../issues/U69-A15-omp-french-book-page-raw-keys.md)), for a press's "Assigned To Editor" field.

<a id="fn-a13"></a>
**a13 — A13 evidence.** `useDashboardConfigEditorialActivity.js` shows
`dashboard.recommendOnly.pendingRecommendations` on
`REVIEW_ROUND_STATUS_PENDING_RECOMMENDATIONS`; the key has no `fr_CA`
text in lib/pkp on any app (locale files read 2026-09-30). The state
was not on screen in the 2026-09-30 French probe (fn-a12). It is settled
by reading the French dashboard row of a round with a recommend-only
editor assigned and every review confirmed ("Mark as Complete"), as its
deciding editor.

<a id="fn-a14"></a>
**a14 — A14 evidence.** In `useDashboardConfigEditorialActivity.js`, a
recommend-only editor without their own `currentUserRecommendation` has
the recommendation round statuses mapped back to reviews-completed (every
active review confirmed) or pending-reviews, so the 9e branches render
(code read 2026-09-30). Not driven: no seed puts recommending editors on a
round. It is settled by reading that editor's dashboard row on a round
under review before they record a recommendation.

<a id="fn-omp1"></a>
**omp1 — OMP1 evidence.** OMP's
`APP\components\forms\dashboard\SubmissionFilters` rebuilds the form
without `addSectionFields()` — dashboard-wide, every page. Live-probed
2026-08-26 (author's-list build): a two-series press offered only
Categories and "Days since last activity"; two-section journal and
preprint-server controls both listed the Section field the same day.
Re-probed the same day on the editorial dashboard: the seeded two-series
press's manager panel offered Assigned To Editor, Categories and "Days
since last activity" — no series or section field.


## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Editorial dashboard | `{journal}/dashboard/editorial` (sidebar "Editor Dashboard") | ROUTE-008 (base); ROUTE-035 (OJS), ROUTE-057 (OMP), ROUTE-074 (OPS) |
| Dashboard page component | in-page (Vue page + Smarty host) | VUE-003, AFFW-067, AFFW-061 |
| Heading, control bars | in-page | AFFW-001..007 |
| In-page search | in-page | AFFW-008; chips AFFW-009..013 |
| Views sidebar + badges | backend sidebar | AFFW-062, AFFW-064, AFFW-066; heading/menu state AFFW-059 |
| Global search box | backend sidebar | AFFW-063; search view enter/leave AFFW-060 |
| Filters panel | side modal | VUE-075, AFFW-051..054 |
| Table, sorting, paging | in-page | AFFW-022, AFFW-024..025, AFFW-058 |
| Editorial columns & cells | in-page | AFFW-028, AFFW-030..034 |
| Activity cell & actions | in-page | AFFW-035..039, AFFW-041, AFFW-047, AFFW-056 |
| Reviewer indicators & popover | in-page | AFFW-042..046 |
| Bulk cleanup | "More Actions" above the list | AFFW-014..021, AFFW-023, AFFW-026 |
| Workflow panel opener | row "View" | AFFW-055 |
| Legacy submissions address | `{journal}/submissions` → forwards home | ROUTE-007 |
| Backend submission lists API | `api/v1/_submissions` (GET /, assigned, reviews, viewsCount; DELETE bulk) | API-006 |
| Outstanding-tasks reminder | email, monthly {OJS OMP} | MAIL-025, JOB-011, JOB-046 |

## Reference — code anchors

- `lib/pkp/pages/dashboard/PKPDashboardHandler.php` — op roster, role
  gates, `getViews()`; app subclasses
  (`{ojs,omp,ops}/pages/dashboard/DashboardHandler.php`) override
  `setupIndex()` / `getSubmissionFiltersForm()` only.
- `lib/pkp/pages/dashboard/DashboardHandler.php` — legacy `submissions`
  page forward.
- `lib/pkp/classes/submission/Repository.php` —
  `getDashboardViews()` / `mapDashboardViews()` / `getSearchView()` /
  `canCurrentUserDelete()`; app overrides in
  `{omp,ops}/classes/submission/Repository.php`.
- `lib/pkp/classes/submission/DashboardView.php` — view types.
- `lib/pkp/classes/template/PKPTemplateManager.php::setupBackendPage()` —
  sidebar menu groups + global-search item.
- `lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php` — the
  lists' API (per-op role gates; bulk delete); app subclasses add
  OJS payment / OMP catalog endpoints only.
- `lib/ui-library/src/pages/dashboard/` — `DashboardPage.vue`,
  `dashboardPageStore.js`, `composables/useDashboardConfig.js`,
  `composables/useDashboardConfigEditorialActivity.js`,
  `composables/useDashboardConfigReviewActivity.js`,
  `composables/useDashboardBulkDelete.js`, `components/**`,
  `modals/DashboardModalFilters.vue`;
  `src/components/SideNav/SideNav.vue`.
- `lib/pkp/classes/components/forms/dashboard/PKPSubmissionFilters.php`
  (+ per-app `classes/components/forms/dashboard/SubmissionFilters.php`).
- `lib/pkp/classes/task/EditorialReminders.php`,
  `lib/pkp/jobs/email/EditorialReminder.php`,
  `lib/pkp/classes/mail/mailables/EditorialReminder.php`;
  `{ojs,omp}/classes/scheduler/Scheduler.php` (`monthlyOn(1)`).
