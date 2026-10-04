---
name: my-submissions
status: verified
---

# My Submissions (author dashboard)

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

My Submissions is the author's home in the editorial backend. It is one
list, per journal, of every submission the signed-in account is an author
on: drafts still being written, submissions under editorial consideration,
and finished ones, whether published or declined. From here the author sees
where each submission stands and answers what the journal asks of them, such
as finishing an incomplete draft or submitting requested revisions. The
author can also delete drafts they have abandoned, and open any submitted
submission's workflow to follow it in detail. The list is the author's way
into the workflow. Everything behind the "View" action, meaning the workflow
screen itself with its stages and panels, belongs to *Workflow screen &
stage access* and the stage features. The editorial team's own submission
lists are a separate feature (*Submissions dashboard*), and a reviewer's
assignment list is a third. This spec covers only the author-facing list.

## Actors & permissions

**The author** below means a signed-in account holding the journal's Author
role. The list is personal and per-journal: it shows only submissions in
this journal on which this account is assigned as an author. A **draft**,
also called an *incomplete submission*, counts from the moment it is started
(see *[Submission wizard](U21-submission-wizard.md)*). Holding other roles
alongside Author changes nothing here. A Journal Manager who also authors
sees their authored submissions on this list like any author. The one
exception is the Filters panel, which follows the account's roles (Rule 5).
What a row *offers* depends on the submission's state (Rules 6–8), not on
the author's other roles.

| Action | Who may — and when |
|--------|--------------------|
| **Open My Submissions** | • the author: from the sidebar menu group or by its direct address<br>• any signed-in user *without* the Author role typing the address: the access-denied page <sup>a</sup> |
| **See a submission listed** | • the author: their own submissions only, in every state (draft, under consideration, scheduled, published, declined) <sup>b</sup> |
| **Open a submission's workflow ("View")** | • the author: any of their submitted submissions. A draft has no "View" until it is submitted (Rule 6) <sup>e</sup> |
| **Re-enter a draft ("Complete submission")** | • the author: their own drafts (Rule 6) <sup>f</sup> |
| **Submit revisions from the list** | • the author: while the submission's current review round awaits their revisions (Rule 7) {OJS OMP} <sup>g</sup> |
| **Delete incomplete submissions** | • the author: their own drafts only. A submitted submission can never be deleted here (Rule 9). On a preprint server deletion is offered, but confirming always fails ⚠ [OPS2](#ops2) <sup>i</sup> |

## Fields & validation

N/A. The list collects no data. Its search box and Filters panel are shared
by all submission lists and are owned by *Submissions dashboard*. The
revision upload it can open is owned by *[Review stage & rounds](U26-review-stage-and-rounds.md#revisions)*.

## Rules & state

1. **Where it lives.** The backend sidebar shows a **"My Submissions as
   Author"** menu group to every holder of the Author role. Its entries are
   the list's *views*: named slices of the author's submissions, each with a
   live count badge. Choosing one opens the list filtered to that view. The
   page heading names the current view with its total, for example "Active
   submissions (2)". Next to the group, "Start A New Submission" opens the
   submission wizard (owned by *[Submission wizard](U21-submission-wizard.md#ways-in)*).
   <sup>a</sup>
2. **The views.** Which views exist depends on the app. A preprint server
   has no review stage, so it has fewer: <sup>b</sup>

   | View | OJS | OMP | OPS |
   |------|:---:|:---:|:---:|
   | Active submissions | ✓ | ✓ | ✓ |
   | Revisions requested | ✓ | ✓ | — |
   | Revisions submitted | ✓ | ✓ | — |
   | Incomplete submissions | ✓ | ✓ | — ⚠ [OPS1](#ops1) |
   | Scheduled for publication | ✓ | ✓ | ✓ |
   | Published | ✓ | ✓ | ✓ |
   | Declined | ✓ | ✓ | ✓ |

   "Active submissions" holds every submission still awaiting an outcome,
   drafts included. The other views slice by what happened: revisions asked
   for or delivered, not yet finished, scheduled into an issue {OJS},
   published, or declined. One submission can appear in several views. On a
   press or preprint server, no route was found that places anything under
   "Scheduled for publication". That view was only ever seen empty
   ⚠ [A3](#a3).
3. <a id="landing"></a> **Landing.** An account whose only role in the journal is Author lands on
   My Submissions after signing in on the journal's own login page. On a
   multi-journal site, the site-wide login page leads to the site index
   instead. The editorial roles (Journal Manager, Section Editor, Assistant)
   and the Reviewer role take precedence: an account holding one of those
   lands on that role's list instead, meaning the Dashboard or the reviewer
   dashboard. An account holding both an editorial role and Reviewer lands
   on the Dashboard. A Site Administrator lands by the roles they hold in
   this journal, like any other account: with only Author there, on My
   Submissions; with only Reader, on the journal's home page. Whoever
   holds Author keeps the author group one click away in the sidebar. The
   retired submission-list address from older versions forwards the same
   way. An old bookmarked author-dashboard link for a specific submission
   lands the submission's own author on My Submissions with that
   submission's workflow panel already open. Any other signed-in user
   following the same link gets an access-denied page instead. The same
   forward works for a link to a still-incomplete draft, and opens a
   workflow panel the list itself never offers for a draft ⚠ [A5](#a5).
   <sup>c</sup>
4. **The row.** The columns are **ID** (sortable), **Submissions** (the
   authors-and-title line), **Stage**, **Editorial Activity** (Rules 6–8),
   and **Actions**. The Stage column shows the submission's current stage in
   a colored bubble, or its outcome, for example "Declined". A draft's bubble
   reads "Incomplete", except on a preprint server, where it reads
   "Production" [OPS1](#ops1). Sorting, paging and the empty view
   ("No Items") are the shared table behavior of *Submissions dashboard*.
   This list uses them unchanged. <sup>d</sup>
5. **Search and filters.** The search box above the list finds the author's
   own submissions within the current view. The heading keeps the view's
   name and count. The "Filters" button opens the journal's filter panel,
   which offers up to four filters:
   - section {OJS OPS}, only when the journal has more than one section,
     inactive sections and sections restricted to editors counted (see
     *[Sections](U17-sections.md)*). The filter lists every section,
     including those two kinds, and choosing one narrows the list to the
     author's submissions in that section. A press offers no series filter
     here, however many series it has ⚠ [OMP1](#omp1);
   - categories, only when any exist;
   - issue {OJS}, only when any exist;
   - days since last activity, always.

   The editors' "Assigned To Editor" filter ("Assigned to Moderator" on a
   preprint server {OPS}) follows the account's roles, not the page. An
   author-only account never sees it, but a Journal Manager or Site
   Administrator who also authors finds it on their own list too
   ⚠ [A4](#a4). Both controls are shared with *Submissions dashboard*.
   <sup>j</sup>
6. **Drafts vs submitted.** A submitted submission's Actions cell offers
   **"View"**, which opens the workflow (Rule 8). A draft's Actions cell is
   empty: no "View", no button at all. Its Editorial Activity cell instead
   carries **"Complete submission"**, which reopens the submission wizard at
   the step the author last saved with "Save for Later". A step the author
   merely continued past is not remembered
   (*[Submission wizard](U21-submission-wizard.md)*). <sup>e</sup> <sup>f</sup>
7. **The Editorial Activity cell** tells the author what is happening, and
   what is asked of them, without opening the workflow: <sup>f</sup>
   - 7a. **Revision requested** {OJS OMP}: while the current review round
     awaits the author's revisions, whether for this round or for a new one,
     the cell shows "Revision requested" with a **"Submit revisions"**
     button. Pressing it opens the upload dialog directly. The dialog has
     three steps, "Upload File", "Review Details" and "Confirm", and no title
     of its own. The file lands in that round's revisions, exactly as if it
     had been uploaded on the workflow's review stage
     ([→ Revisions Uploaded](U26-review-stage-and-rounds.md#revisions)).
     Once delivered, the submission lists under "Revisions submitted". Its
     activity cell then shows the review progress counter (7b), not a
     "revisions submitted" message. <sup>g</sup>
   - 7b. **Under review, nothing asked** {OJS OMP}: the cell shows the
     review progress counter, "Review update {completed}/{total}": the
     current round's submitted reviews, marked complete by an editor or
     not, over its reviewers minus declined and cancelled requests
     ⚠ [A1](#a1). Each submitted *open* review adds its reviewer's avatar
     to a "Reviewers assigned:" row; the avatar's popover names the
     reviewer and the review type. Other review types never show a
     reviewer here
     ([→ reading reviews as the author](U26-review-stage-and-rounds.md#author-read-review)).
     With the interface in French, the counter shows a raw code instead
     of the counts ⚠ [A6](#a6). <sup>h</sup>
   - 7c. **Copyediting** {OJS OMP}: "Copyedited Files Uploaded: {count}",
     counting the workflow's "Copyedited Files" list, shown even at 0.
   - 7d. **Scheduled into an issue** {OJS}: "To be published in issue
     {issue}".
   - 7e. Otherwise the cell is empty. In particular it is empty while a new
     submission awaits the editorial team's first move. One exception: a
     submission declined during review keeps showing the review counter in
     its row ⚠ [A2](#a2).
8. **"View" opens the workflow in place.** The workflow opens as a panel
   over the list. The page address records the open submission and the
   selected entry of the workflow's left-hand menu (for example "Review"),
   so the open state can be bookmarked or shared. Closing the panel
   returns to the list at the exact address it left. The panel's contents
   are [→ the workflow screen](U24-workflow-screen-and-stage-access.md#workflow-entry)
   and the stage features
   ([submission stage](U25-submission-stage.md#author-view),
   [review stage](U26-review-stage-and-rounds.md#author-view)). <sup>e</sup>
9. **Deleting drafts.** "More Actions" (the "…" button above the list;
   in French a screen reader hears a raw code as its name [A6](#a6)) offers
   **"Delete Incomplete Submissions"**. It is grayed out while the current
   page of the list has no draft rows. Choosing it puts the list in
   selection mode: a checkbox appears on each draft row (only drafts;
   submitted rows get none), with **"Delete Incomplete Submissions"** and
   **"Cancel"** buttons above. The delete button stays disabled until
   something is selected. Pressing it opens the
   "Confirm Delete of Incomplete Submissions" dialog ("Are you sure you want
   to delete the selected items? This action cannot be undone…") with
   **"Confirm"** and **"Cancel"** buttons. Confirm deletes the selected drafts permanently.
   Cancel, in the dialog or above the list, leaves selection mode entirely:
   ticks are dropped and nothing is deleted. Changing the view, the search
   or the filters also drops any selection. On a preprint server the same
   flow is offered end to end, but confirming always fails with an error
   dialog and the draft survives ⚠ [OPS2](#ops2). The selection behavior is
   shared with the editorial list (*Submissions dashboard*); here every
   author gets it, over their own drafts.
   <sup>i</sup>
10. **Counts stay current.** The sidebar view badges and the heading's total
    update in place, without a reload, after anything done from this screen
    that changes them, for example deleting drafts or submitting revisions.
    A change someone else makes meanwhile, for example an editor removing a
    copyedited file (Rule 7c), shows on the list only when the author
    closes a workflow panel or reloads the page; until then the row keeps
    its old reading. Pressing the sidebar entry of the view already open
    does not refresh the list. <sup>e</sup>

## Side effects

- Deleting incomplete submissions removes them permanently. There is no
  email and no undo. They vanish from every view, and a bookmarked link back
  into a deleted draft's wizard no longer opens it.
- "Submit revisions" has the same side effects as uploading revisions on the
  review stage. Those belong to *[Review stage & rounds](U26-review-stage-and-rounds.md#revisions)*.
- The list itself sends nothing and logs nothing. It only shows information
  and opens other screens.

## Settings that modify behavior

None found on the list itself. The neighboring "Start A New Submission"
menu entry and the journal's intake gates belong to *[Submission wizard](U21-submission-wizard.md)*
(see "Settings that modify behavior" there).

## Cross-feature interactions

- *[Submission wizard](U21-submission-wizard.md)* creates the drafts and
  submissions this list shows. "Complete submission" and draft deletion act
  on its drafts. "Start A New Submission" sits beside this list's menu
  group.
- *[Submissions dashboard](U23-submissions-dashboard.md)* (the editorial
  lists) owns the shared
  list behavior this feature uses: the table (sorting, paging, empty state),
  search, the Filters panel, and the incomplete-submissions selection mode.
  This spec owns only their author-facing configuration.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#workflow-entry)*
  owns everything behind "View". This spec owns only the entry route.
- *[Submission stage](U25-submission-stage.md#author-view)* and
  *[Review stage & rounds](U26-review-stage-and-rounds.md#author-view)* own
  the stage states this list's Stage and Editorial Activity cells report,
  and the review anonymity rules that gate Rule 7b.

## Canonical scenarios

Scenario 1 runs on the seeded journal as a ready account holding only the
Author role, with scratch submissions; scenarios 2, 4 and 5 run on
scratch journals of their own with throwaway accounts, and scenario 3 with a
throwaway author, on the seeded journal where its issues are needed {OJS}
and on a scratch journal otherwise. The accounts, the submissions' titles,
the mail catcher's address and the tooling recipe are in each scenario's
footnote.

1. **Track and open a submission**

   Given: an account holding only the Author role, with one submitted
   submission on the seeded journal, on the journal's login page.
   <sup>s1</sup>

   - **The journal's login page**: sign in: you land on My Submissions in
     the "Active submissions" view, and the sidebar shows the "My
     Submissions as Author" group (Rules 1, 3).
   - **The retired submission-list address**: open
     `{journal path}/submissions`: it forwards to the same list (Rule 3).
   - **The row**: shows the submission's ID, its authors and title, and its
     current stage in a bubble; its Editorial Activity cell is empty, the
     submission awaiting the editorial team's first move (Rules 4, 7e).
   - **"View"**: press it: the submission's workflow opens as a panel over
     the list, and the page address now records which submission is open
     (Rule 8).
   - **Closing the panel**: close it: the list is back, at the exact
     address it left (Rule 8).
   - **The old author-dashboard link**: open
     `{journal path}/authorDashboard/submission/{id}` with the
     submission's ID: My Submissions opens with that submission's workflow
     panel already open (Rule 3).
   - **The same link in a second author's browser**: a second account
     holding only the Author role, signed in, opens it: an access-denied
     page (Rule 3).
   - **Control**: a signed-in account holding no Author role, a Journal
     Manager who does not author, types the list's address
     `{journal path}/dashboard/mySubmissions`: the access-denied page
     (Actors row 1).

2. **Resume and clean up drafts**

   Given: an account holding only the Author role on a scratch journal,
   with two drafts, one of them saved on the "Details" step with "Save for
   Later", and one submitted submission. <sup>s2</sup>

   - **"Incomplete submissions"**: open the view: it lists the two drafts
     and not the submitted submission. On a preprint server the drafts sit
     under "Active submissions" instead [OPS1](#ops1). Each draft row shows
     the "Incomplete" stage bubble ("Production" on a preprint server
     [OPS1](#ops1)), offers "Complete submission", and has no "View"
     (Rules 2, 4, 6).
   - **"Complete submission" on the saved draft**: press it: the
     submission wizard reopens at "Details" (Rule 6). Return to the list.
     Press "Complete submission" on the other draft, only to note the
     address the wizard opens at, and return again.
   - **"Active submissions"**: switch to it: draft and submitted rows sit
     together, the drafts listed here as well as under "Incomplete
     submissions", one submission appearing in several views (Rule 2).
   - **"More Actions" → "Delete Incomplete Submissions"**: choose it: a
     checkbox appears on each draft row and none on the submitted row
     (Rule 9). Tick the other draft's checkbox.
   - **"Delete Incomplete Submissions", then "Confirm"**: press the button
     above the list, then "Confirm" in the "Confirm Delete of Incomplete
     Submissions" dialog: the draft is gone and the sidebar counts drop
     without a reload (Rules 9, 10). On a preprint server the confirm step
     fails instead: an error dialog reports that the deletion is not
     permitted, and the draft stays [OPS2](#ops2).
   - **The deleted draft** {OJS OMP}: it is listed under neither "Active
     submissions" nor "Incomplete submissions", nothing on the list offers
     to restore it, and no email arrives in the author's mailbox (Side
     effects).
   - **Its wizard address** {OJS OMP}: open the address noted above: the
     wizard no longer opens (Side effects).
   - **Control**: the submitted row had no checkbox and is still listed
     after the delete: a submitted submission is never deleted here
     (Actors row 6, Rule 9).

3. **Browse the views and search**

   Given: an account holding only the Author role with two published
   submissions, one declined at the Submission stage, one in Copyediting
   {OJS OMP} and one scheduled into an issue {OJS}, beside another
   author's submitted submission on the same journal. <sup>s3</sup>

   - **The sidebar's view entries**: walk them: each opens the list under
     that view's heading with its count, and the entry's badge carries the
     same number (Rules 1, 2).
   - **"Active submissions"** {OJS OMP}: the submission in Copyediting is
     listed here, its Editorial Activity cell reading "Copyedited Files
     Uploaded: 0" (Rules 2, 7c).
   - **"Scheduled for publication"** {OJS}: the submission scheduled into
     an issue is listed here, its Editorial Activity cell reading "To be
     published in issue {issue}" (Rules 2, 7d). On a press or preprint
     server nothing feeds the view [A3](#a3).
   - **"Published"**: the two published submissions are listed here
     (Rule 2).
   - **"Declined"**: the declined submission is listed here with its
     "Declined" stage bubble and an empty Editorial Activity cell (Rules 2,
     4, 7e).
   - **A view holding nothing**: open one none of the seeded submissions
     falls under (the footnote names one per app): it shows "No Items"
     (Rule 4).
   - **The search box on "Published"**: type the first published
     submission's title (the footnote names the titles): the list narrows
     to that submission alone, and the heading count follows, "Published
     (1)" (Rule 5).
   - **"Filters"**: press it: the panel offers the days-since-last-activity
     filter and, only as Rule 5 allows, the section {OJS OPS},
     categories and issue {OJS} filters (a press offers no series filter
     [OMP1](#omp1)); "Assigned To Editor" ("Assigned to Moderator" on a
     preprint server) is not among them (Rule 5).
   - **The author's mailbox**: no email has arrived through any of the
     above: the list sends nothing (Side effects).
   - **Control**: the other author's submission is listed under none of
     the views, and searching its title on "Active submissions" finds no
     row (Actors row 2, Rule 5).

App-specific:

4. **Act on a revision request** {OJS OMP}

   Given: an account holding only the Author role on a scratch journal at
   its default review type, with one submission whose review round has
   revisions requested and one assigned reviewer who has not yet completed
   a review (on a press, either of its review stages qualifies, and a
   further submission sits in its Internal Review round with revisions
   requested), and a second submission under review with two reviewers,
   one of whom has completed; and, on a second scratch journal whose
   default review type is Open, an author's submission under review whose
   single reviewer has completed. <sup>s4</sup>

   - **"Revisions requested"**: the submission is listed here; its row's
     Editorial Activity cell reads "Revision requested" with "Submit
     revisions" (Rules 2, 7a).
   - **"Submit revisions"**: press it: the upload dialog opens directly,
     with three steps, "Upload File", "Review Details" and "Confirm", and
     no title of its own; upload a file (the footnote names it) through
     them (Rule 7a).
   - **Back on the list**: the submission now sits under "Revisions
     submitted", the sidebar badges have moved with it without a reload,
     and its Editorial Activity cell shows the review progress counter,
     "Review update 0/1", not a "revisions submitted" message (Rules 7a,
     7b, 10) [A1](#a1).
   - **A press's Internal Review round** {OMP}: the further submission is
     listed under "Revisions requested" with the same "Revision requested"
     cell and "Submit revisions"; uploading a file the same way moves it
     under "Revisions submitted" with the counter (Rule 7a).
   - **Under review, nothing asked**: under "Active submissions" the second
     submission's cell reads "Review update 1/2" and shows no "Reviewers
     assigned:" row: a review that is not open never shows its reviewer
     (Rule 7b).
   - **A completed open review**: on the journal whose default review type
     is Open, the submission's cell reads "Review update 1/1" with a
     "Reviewers assigned:" row of one avatar; the avatar's popover names
     the reviewer and the review type (Rule 7b).
   - **Control**: the delivered submission's row no longer offers "Submit
     revisions", which shows only while the round awaits the author's
     revisions (Rule 7a).

   A preprint server has no review stage, so this scenario has no analogue
   there: its author sidebar carries only "Active submissions", "Scheduled
   for publication", "Published" and "Declined" (Rule 2), and no row ever
   offers "Submit revisions".

5. **Landing for an account holding other roles too** {OJS OMP OPS}

   Given: a scratch journal with three throwaway accounts holding two roles
   each, Author and Reviewer {OJS OMP}, Author and Section Editor, and
   Section Editor and Reviewer {OJS OMP}, each on the journal's login page.
   <sup>s5</sup>

   - **Author and Reviewer** {OJS OMP}: sign in: the browser lands on the
     reviewer dashboard, with the "My Submissions as Author" group still in
     the sidebar (Rule 3).
   - **Author and Section Editor**: sign in: the browser lands on the
     Dashboard, with the "My Submissions as Author" group still in the
     sidebar (Rule 3).
   - **Section Editor and Reviewer** {OJS OMP}: sign in: the browser lands
     on the Dashboard (Rule 3).
   - **Control**: an account holding only the Author role on the same
     journal lands on My Submissions, as in scenario 1 (Rule 3).

   A preprint server has no Reviewer role, so only the Author and Section
   Editor account runs there.

## Coverage

Left out of the scenarios above, by reason:

- **Rarely met**:
  - a change someone else makes showing on the list only after a workflow
    panel closes or the page reloads, and not after pressing the open
    view's sidebar entry (Rule 10)
  - a Site Administrator holding only Author in the journal landing on My
    Submissions, and one holding only Reader landing on the journal's home
    page (Rule 3)
- **Nothing new to test**:
  - the list logging nothing (Side effects): the body names no screen where
    a log of the list's own use would be read; scenario 3 reads the mailbox
  - the section filter counting and listing inactive sections and sections
    restricted to editors (Rule 5)
  - a Journal Manager who also authors seeing their authored submissions
    like any author (Actors preamble; scenario 1's Author sees the same
    list)
  - revisions requested for a new round rather than the current one
    (Rule 7a): the cell reads "Revision requested" with "Submit revisions"
    as in scenario 4
  - reopening the open panel's recorded address from a bookmark (Rule 8):
    scenario 1's old author-dashboard link opens the panel from an address
- **Register carries it**:
  - A2 (a submission declined during review keeping the review counter;
    Rule 7e)
  - A3 (nothing feeding "Scheduled for publication" on a press or preprint
    server; Rule 2; scenario 3 marks it)
  - A4 (the editors' assignment filter on the own list of a Journal Manager
    or Site Administrator who also authors; Rule 5)
  - A5 (an old link to a draft opening the workflow panel the list never
    offers; Rule 3)
  - A6 (in French, the review counter and the "…" button's name reading
    raw codes; Rules 7b, 9)
  - OMP1 (no series filter on a press; Rule 5; scenario 3 marks it)
- **Owned by another feature**:
  - "Start A New Submission" beside the menu group (Rule 1; *Submission
    wizard*, scenario 1)
  - the site-wide login page of a multi-journal site leading to the site
    index (Rule 3; *Login & sessions*, scenario 1)
  - sorting and paging (Rule 4; *Submissions dashboard*, scenario 7)
  - a wizard step merely continued past not being remembered (Rule 6;
    *Submission wizard*, scenario 3)
  - the uploaded file landing in the round's revisions, and the upload's
    side effects (Rule 7a, Side effects; *Review stage & rounds*,
    scenario 4)
  - the grayed-out "Delete Incomplete Submissions" entry, the button
    disabled until a selection, and Cancel or a changed view, search or
    filter dropping the selection (Rule 9; *Submissions dashboard*,
    scenario 12)
  - the drafts' wizard, the workflow behind "View", and the stage states
    and review anonymity rules the cells report (Cross-feature;
    *Submission wizard*, *Workflow screen & stage access*, *Submission
    stage*, *Review stage & rounds*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review. The summary
is sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact
and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [OPS2](#ops2) | A preprint server author is offered draft deletion, but confirming always fails with a permission error | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A6](#a6) | In French a submission under review reads a raw code in place of "Review update {completed}/{total}", and the "…" button above the list is named by a raw code | 🐞 | minor | — |
| [A1](#a1) | The author sees the review progress count ("Review update 1/2") for their submission under review | ❓ | user-visible | — |
| [A2](#a2) | A declined submission's row keeps showing the review progress counter | ❓ | minor | — |
| [A3](#a3) | On a press or preprint server, nothing was found that feeds the "Scheduled for publication" view | ❓ | minor | — |
| [OPS1](#ops1) | A preprint server author gets no "Incomplete submissions" view; drafts hide inside "Active submissions" labeled "Production" | ❓ | minor | — |
| [A4](#a4) | A Journal Manager or Site Administrator who also authors gets the editors' assignment filter on their personal list | ❓ | minor | — |
| [A5](#a5) | An old author-dashboard link to a still-incomplete draft opens the draft's workflow panel, a screen the list never offers for a draft | ❓ | minor | — |
| [OMP1](#omp1) | A press author cannot filter the list by series, even when the press has several | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — Review progress disclosed to the author** · ❓ · user-visible.
While their submission is under review with nothing asked of them, the
author's row shows "Review update {completed}/{total}". That tells the
author how many reviewers the round has and how many have finished.
Reviewer *identities* stay protected, because only open-type completed
reviews show an avatar (Rule 7b). The count itself, however, is information
journals have traditionally kept from authors.
Question: is the completed/total review counter meant to be author-visible?
Lean: intended. The counter was built specifically for this list's author
view and leaks no identity. A product ruling is still worth having.
Basis: probe + judgment. <sup>a1</sup>

<a id="a2"></a>
**A2 — A declined submission's row still shows the review counter** · ❓ ·
minor.
A submission declined during review keeps "Review update
{completed}/{total}" in its Editorial Activity cell on the Declined view.
The row reads as if review were still running on a submission whose outcome
is settled.
Question: should a declined submission's activity cell be cleared instead?
Lean: oversight. The editorial list's equivalent cell has a declined state,
and this one does not.
Basis: probe. <sup>a2</sup>

<a id="a3"></a>
**A3 — "Scheduled for publication" has no feeder on OMP/OPS** · ❓ · minor.
The view exists for authors on all three apps. On OMP and OPS, however, the
publish flows offer no date control, so nothing could be scheduled rather
than published outright through the screens. The author's "Scheduled for
publication" view was only ever seen empty there. On OJS it fills normally
through issue scheduling (Rule 7d).
Question: is any screen route meant to produce a scheduled (future-dated)
publication on these two apps, or is the view vestigial there?
Lean: vestigial. The view comes from shared code whose feeder these apps do
not expose.
Basis: probe. <sup>a3</sup>

<a id="a4"></a>
**A4 — Editors' filter on the manager-author's own list** · ❓ · minor.
An account holding Journal Manager (or Site Administrator) alongside Author
opens the Filters panel on their own My Submissions and finds the editors'
"Assigned To Editor" filter there ("Assigned to Moderator" on a preprint
server). An author-only account never does.
Question: should the personal list suppress the editors' filter regardless
of the account's other roles? Lean: intended and harmless. The filter
follows the account's roles through shared code, and it discloses nothing a
manager cannot already see on the editorial list.
Basis: probe. <sup>a4</sup>

<a id="a5"></a>
**A5 — An old link to a draft opens the draft's workflow panel** · ❓ ·
minor.
Following an old author-dashboard link that points at a still-incomplete
draft lands its author on My Submissions with the draft's workflow panel
open. The list never offers that panel for a draft, because a draft row has
no "View" (Rule 6). Any other signed-in account gets the access-denied page
first.
Question: should the forward refuse, or hand off to the wizard, for a
submission that was never submitted? Lean: oversight, harmless. Only the
draft's own author can reach it.
Basis: probe. <sup>a5</sup>

<a id="a6"></a>
**A6 — In French the review counter and the "…" button show raw codes** · 🐞 · minor.
With the interface in French (Canada), a submission under review reads
"##dashboard.reviewUpdateCounts##" in its Editorial Activity cell {OJS
OMP}, where English reads "Review update 1/1" or "Review update 0/1"
(Rule 7b), so the author loses the completed and total review counts. On
every app a screen reader hears the "…" button above the list (English
"More Actions", Rule 9) as "##common.moreActions##". Expected: French
words, as the rest of the list shows: the views ("Soumissions actives",
"Révisions demandées", "Soumissions incomplètes", "Publiées",
"Refusées"), the Stage bubbles ("Incomplète", "Rejetée"), "Révision
requise" with "Soumettre les révisions", "Compléter la soumission" and
"Afficher". The English list shows none of these codes. The header's help
icon is [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md#a1)'s
finding, the workflow panel "Afficher" opens is
[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#a11)'s,
the editorial list's own codes are
[Submissions dashboard](U23-submissions-dashboard.md#a12)'s, and why a
missing French text shows as a code at all is
[Languages & locales](U57-languages-and-locales.md#a4)'.
Basis: probe. <sup>a6</sup>

### OMP

<a id="omp1"></a>
**OMP1 — No series filter on a press** · ❓ · minor.
A press author's Filters panel never offers a series filter, even when the
press has several series. Only the other filters appear. On a journal or
preprint server with more than one section, the same panel lists the
Section filter (Rule 5).
Question: is the missing series filter a product choice? Lean: intended.
The press omits the field across its whole dashboard, and a series, unlike
a section, is an optional shelf that not every submission has. A ruling is
still worth having, since the shared code supports the filter.
Basis: probe. <sup>omp1</sup>

### OPS

<a id="ops1"></a>
**OPS1 — No "Incomplete submissions" view on a preprint server** · ❓ ·
minor.
An OPS author's sidebar offers Active / Scheduled / Published / Declined
only. Their unfinished drafts appear solely inside "Active submissions",
where a draft's Stage bubble reads "Production" rather than "Incomplete".
Nothing marks a row as a draft except its "Complete submission" button.
Question: is the missing view (and the unlabeled draft state) a deliberate
simplification or an oversight?
Lean: oversight. The reduction does not follow from any concept OPS lacks,
since drafts exist there, and the draft-cleanup tool that pairs with the
view was kept (itself broken, [OPS2](#ops2)).
Basis: probe. <sup>ops1</sup>

<a id="ops2"></a>
**OPS2 — Draft deletion offered but always refused** · 🐞 · medium.
The OPS author gets the whole cleanup flow: an enabled "Delete Incomplete
Submissions" menu item, draft checkboxes, and the confirm dialog. Pressing
"Confirm" always ends in an error dialog ("You do not have permission to
delete this submission.") and the draft stays. Expected: their own drafts
delete, as they do on a journal. Only a server manager can delete the
draft for the author. Rationale for 🐞: the server's check wants an author
assignment on the Submission stage, which no preprint has, while the
list's own check accepts one on any stage, so the screen offers what the
server refuses. The wizard's "Cancel" fails on the same check, silently
([Submission wizard](U21-submission-wizard.md#ops3)).
Basis: probe, 2026-10-04. <sup>ops2</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — page, menu and access.** Page `dashboard`, op `mySubmissions`:
`PKP\pages\dashboard\PKPDashboardHandler` (role assignment
`ROLE_ID_AUTHOR` → `mySubmissions`; other roles get `editorial` /
`reviewAssignments`). The sidebar group is built in
`PKPTemplateManager::setupBackendPage()` (`$menu['mySubmissions']`, label
`navigation.mySubmissions`) for users holding `ROLE_ID_AUTHOR` in the
context, one submenu entry per view with count badges fetched from the
`_submissions/viewsCount` API (`SideNav.vue`). "Start A New Submission" =
`$menu['submit']`, `dashboard.startNewSubmission`. App subclasses
(`APP\pages\dashboard\DashboardHandler`) override only
`setupIndex()`/`getSubmissionFiltersForm()` — the op roster and role gates
are uninherited-shared. Live-probed 2026-08-26 on all three apps: group
label verbatim "My Submissions as Author"; heading "Active submissions
(N)"; a signed-in reviewer-only or manager-only account typing the address
gets the access-denied page, verbatim "The current role does not have
access to this operation." (the reviewer control is inapplicable on OPS —
the app has no reviewer role). A Site Administrator whose only role in the
journal is Reader, typing the address, gets the same page (2026-09-28, all
three apps). A signed-out visitor typing the list's
address is sent to the login page with the list carried as the return
destination (probed 2026-08-26, OJS; the return trip after logging in was
not probed).

<a id="fn-b"></a>
**b — the view roster.** `PKP\submission\Repository::mapDashboardViews()`;
author-visible views are those whose role list includes `ROLE_ID_AUTHOR`:
`TYPE_ACTIVE`, `TYPE_REVISIONS_REQUESTED` (author-only),
`TYPE_REVISIONS_SUBMITTED` (author label `submission.list.revisionsSubmitted`),
`TYPE_INCOMPLETE_SUBMISSIONS` (author-only), `TYPE_SCHEDULED`,
`TYPE_PUBLISHED`, `TYPE_DECLINED`. The OMP override removes only the
editorial-only external-review view and adds an editorial-only review-all
view — the author roster is identical to OJS; the OPS override reduces the
type list, hence no author Incomplete or Revisions views (OPS1).
Live-probed 2026-08-26: OJS and OMP sidebars carry the seven views in the
Rule 2 order verbatim; OPS carries exactly four (Active submissions /
Scheduled for publication / Published / Declined). Drafts listed under both
"Active submissions" and "Incomplete submissions" on OJS/OMP (submitted
rows absent from the latter); on OPS under "Active submissions" only. The
editorial dashboard's search *view* is editorial-only (`getViews()` adds
`VIEW_SEARCH` only for `DashboardPage::EditorialDashboard`); the author
keeps the in-page search box. "Assigned as an author" is wider than the
submitter: a co-author account holding an author assignment on the
submission — not the account that started it — sees it on their own list
with "View" (probed 2026-08-26, OJS).

<a id="fn-c"></a>
**c — landing and forwards.** `PKPPageRouter::getHomeUrl()` reads only the
account's active user groups in the current journal (`context_id` of the
journal): none, or Reader alone → the journal's `index`; manager /
sub-editor / assistant / admin → `dashboard/editorial`; else reviewer →
`dashboard/reviewAssignments`; else author → `dashboard/mySubmissions`.
The Site Administrator group belongs to the site, not the journal, so the
admin branch never matches a site-level administrator; they land by their
journal roles. Live-probed 2026-09-28 (all three apps, two runs; Rule 3):
`admin` on a scratch journal with Journal Manager ended on its own Users &
Roles › Edit page, then a fresh sign-in on the journal's login page — with
Author left, `dashboard/mySubmissions?currentViewId=active`, "Active
submissions (1)", listing the administrator's own submission and not
another author's; with Reader left, the journal's `index`; the retired
`{journal}/submissions` address forwards the same way in both cases.
Control: with Journal Manager and Author, `dashboard/editorial` ("Assigned
to me").
Landing precedence live-probed 2026-08-26 with scratch combo accounts on
every constructible app (OPS has no reviewer role): Author+Reviewer lands
on the reviewer list, Author+Section Editor on the editorial dashboard,
with the "My Submissions as Author" group still in the sidebar. The
editorial-beats-Reviewer leg probed 2026-08-26 (OJS and OMP, scratch
Section Editor+Reviewer account, no Author role): both apps landed on
`dashboard/editorial` ("Assigned to me" view), the "My Assignments as
Reviewer" group still in the sidebar — matching the `getHomeUrl()` order
above. Legacy
`submissions` page (`PKP\pages\dashboard\DashboardHandler::index`)
redirects through the same home logic — probed on all three apps. Old
author-dashboard links: `PKPAuthorDashboardHandler::submission()` redirects
to `dashboard/mySubmissions?workflowSubmissionId={id}`; the OMP subclass
overrides `submission()` but ends in the same parent redirect; OJS/OPS
subclasses add nothing (chain check clean). Probed 2026-08-26 on all three
apps: the submission's own author lands with the workflow panel already
open; a different signed-in author following the same link gets the
authorization-denied page, verbatim "You don't currently have access to
that stage of the workflow." The store auto-opens the panel for a
`workflowSubmissionId` URL param (`dashboardPageStore.js`). Further combos
probed 2026-08-26 (OJS, scratch journal): Manager+Author and
Author+Copyeditor (an Assistant role) both land on the editorial
dashboard, the author group still in the sidebar. The landing claim is
journal-login behavior: on a multi-journal install the SITE login page
landed the same author-only account on the site index, while the journal's
own login page landed on My Submissions (probed 2026-08-26, OJS). The
forward-and-auto-open chain applies to drafts too — fn-a5.

<a id="fn-d"></a>
**d — columns.** `useDashboardConfig.js` `getColumns()` `MY_SUBMISSIONS`
branch: `id` (sortable, "ID"), `title` ("Submissions"), `stage` ("Stage",
`DashboardCellSubmissionStage` — stage bubble via `getExtendedStageLabel`),
`activity` ("Editorial Activity"), `actions` ("Actions"). No "Days" column
(editorial-only). Live-probed 2026-08-26: header order verbatim ID ·
Submissions · Stage · Editorial Activity · Actions on all three apps (OMP
included — no longer only the ui-library-pin inference); a
draft's Stage bubble reads "Incomplete" on OJS/OMP but "Production" on OPS
(every preprint, drafts included, sits at the Production stage —
fn-ops1); an empty view renders one full-width "No Items" row. ID sorting
probed live 2026-08-26 (OJS): each header click toggles the direction, the
address gains `sortColumn=id&sortDirection=…`, the rows reorder, and a URL
carrying the sort parameters is honored on load. Table
mechanics: `DashboardTable.vue`, owned by *Submissions dashboard*. All
three app checkouts pin the same ui-library source, and any pin drift is
checked to be dashboard-irrelevant — positive shared-code evidence for every
client-side claim (rechecked 2026-08-26: OJS pins `1a89a4f2`, OMP/OPS its
3-commit-older ancestor `58a3dfbb`; none of the differing commits touch
`src/pages/dashboard/` or `src/components/SideNav/`); the
pkp-lib pins differ only by a campaign harness-cleanup commit touching no
product code (checked 2026-08-26).

<a id="fn-e"></a>
**e — the View action and workflow panel.**
`DashboardCellSubmissionActions.vue`: the "View" (`common.view`) button is
hidden while `submissionProgress` is set (a draft); the
editorial-dashboard-only author/reviewer suppression branch does not apply
on My Submissions. Press → `dashboardPageStore.openWorkflowModal()`: side
modal `WorkflowPage`; `onClose` refetches the list. Live-probed 2026-08-26
on all three apps: the panel opens as a dialog over the list (no
navigation); the address gains `workflowSubmissionId` and a
`workflowMenuKey` menu-position parameter; Close removes both, restoring
the exact pre-View address. A draft row's Actions cell holds no button at
all (probed 2026-08-26 on all three apps — the OMP draft rows and its
submitted row's "View" verified live). The OPS panel opens on the preprint's publication
tabs with no stage menu — the workflow feature's territory.
Rule 10's changes made by someone else, live-probed 2026-09-28 (OJS and
OMP, two runs, the assigned Section Editor uploading and then deleting a
copyedited file in a second browser): with the author's "View" panel open
during the delete, the row behind it still read "Copyedited Files
Uploaded: 1"; the panel's "Close" refetched the list (`_submissions/assigned`
and `viewsCount`) and the row read "…: 0" at 0.5 s, 2 s and 6 s. With
the list open and no panel, the row kept "…: 1"; pressing the sidebar's
"Active submissions" entry (the view already open) sent no request and the
row stayed at 1 for 6 s; a reload showed 0. The editor's own list behaved
the same.

<a id="fn-f"></a>
**f — the activity cell.**
`useDashboardConfigEditorialActivity.js::getEditorialActivityForMySubmissions()`:
`submissionProgress` → "Complete submission"
(`submission.list.completeSubmission`) → redirect `submission?id={id}`
(the wizard; landing on the wizard's file step live-probed 2026-08-26 on
OJS and OPS). Resume position probed 2026-08-26 (OJS): a draft walked
forward with "Continue" alone re-entered at its earlier saved step; after
"Save for Later" on the Details step, re-entry landed on Details — the
wizard resumes at the last SAVED step (mechanism owned by
*[Submission wizard](U21-submission-wizard.md)*). Review stage (internal or external): round status
revisions-requested or resubmit-for-review → Rule 7a; otherwise Rule 7b.
`WORKFLOW_STAGE_ID_EDITING` → `dashboard.copyEditedFilesUploaded` — probed
2026-08-26, verbatim "Copyedited Files Uploaded: 0" (OJS and OMP); after
an editor uploaded one file into the workflow's Copyedited files list, the
same cell read verbatim "Copyedited Files Uploaded: 1" (OJS, 2026-08-26) —
the count counts that list. Re-driven 2026-09-28 (OJS and OMP, two runs):
"…: 0", then "…: 1" after the assigned Section Editor (Series Editor on
OMP) uploaded one file to "Copyedited Files", then "…: 0" after it was
deleted (read after a reload); the editor's own dashboard row carries the
same string.
Production + `STATUS_SCHEDULED` + an issue label →
`dashboard.toBePublishedInIssue` — probed, verbatim "To be published in
issue Vol. 2 No. 1 (2015)"; the issue condition makes 7d OJS-only in
practice. Everything else → empty — probed: a queued Submission-stage OJS
row and fresh OPS preprints (at Production) both show an empty cell. No
declined branch exists here (unlike the editorial cell): a submission
declined during review still shows the Rule 7b counter (A2, fn-a2).

<a id="fn-g"></a>
**g — Submit revisions.** Same composable, revisions branch: alert
`dashboard.revisionRequested` ("Revision requested"), action
`dashboard.submitRevisions` ("Submit revisions") → file-manager upload
(`FileManagerActions.FILE_UPLOAD`) into
`SUBMISSION_FILE_REVIEW_REVISION` (or `_INTERNAL_REVIEW_REVISION` on OMP's
internal stage) for the current round. Live-probed 2026-08-26 on OJS
(revisions-requested AND resubmit round states) and OMP (internal
revisions-requested; external both states): identical cell in every case;
the dialog is the three-step upload wizard ("1. Upload File · 2. Review
Details · 3. Confirm") whose header shows only a back chevron — the
configured title string (`editor.submissionReview.uploadFile`) never
renders. After Complete, the file appeared in that round's "Revisions
Uploaded" grid on the editor's workflow panel (an internal-round upload
landed in the internal round); the row's cell flipped to "Review update
0/1" and the sidebar badges moved without a reload (Rule 10). OMP offers
no internal-stage resubmit decision, so that combination cannot arise.

<a id="fn-h"></a>
**h — review progress cells.**
`DashboardCellSubmissionActivityReviewsUpdate.vue`:
`dashboard.reviewUpdateCounts` = "Review update
{$reviewsCompletedCount}/{$reviewsTotalCount}", completed = completed
statuses (`useSubmission.js::CompletedReviewAssignmentStatuses`: received,
viewed, complete, thanked, so a submitted review counts before an editor
marks it complete; read 2026-09-30), total = active (declined/cancelled
excluded).
`DashboardCellSubmissionActivityReviewsOpen.vue`: renders only completed
assignments whose `reviewMethod` is `SUBMISSION_REVIEW_METHOD_OPEN`,
avatar popover = reviewer full name + review method. Live-probed
2026-08-26 (OJS and OMP): verbatim "Review update 2/2" / "1/1" / "0/2";
with one open-completed and one anonymous-completed review in the same
round, exactly one avatar renders; an anonymous-only round shows no
"Reviewers assigned:" row at all; the avatar's click-popover carries the
reviewer's full name and review type ("Open"), nothing else. The author's
own list data carries blanked reviewer identity fields (empty name and
initials) for anonymous assignments — identity is withheld at the source,
not merely hidden by the cell.

<a id="fn-i"></a>
**i — draft deletion.** `useDashboardBulkDelete.js`: availability =
unconditional for `MY_SUBMISSIONS` (`bulkDeleteIsAvailableForUser`);
per-row deletability (`canBeDeleted`) = `submissionProgress` AND (site
admin / manager OR assigned author) — on this list, every draft row.
Entry: `DashboardControlBulkActions.vue` ("More Actions" ellipsis, item
`dashboard.submissions.incomplete.bulkDelete.button` = "Delete Incomplete
Submissions"); selection-mode buttons `DashboardControlBulkDeleteButton.vue`;
DELETE to the `_submissions` API; selection reset on any query change
(view/search/filter watcher). Live-probed 2026-08-26 on OJS: the menu item
is disabled on a page with no draft rows and again once the last draft is
gone; checkboxes appear only on draft rows; the confirm dialog's buttons
are verbatim "Confirm" / "Cancel"; dialog Cancel exits selection mode with
ticks dropped; confirming deleted both drafts, with list, heading and
badges updating without a reload. Further probes 2026-08-26: the per-page
qualifier held against pagination (OJS — with every draft on page 2 of the
view, the menu item is disabled on page 1 and enabled on page 2); after
ticking, changing view, submitting a search, or applying a filter each
exits selection mode live, ticks lost and nothing deleted (OJS); and the
flow ran end-to-end on OMP — dialog verbatim "Confirm Delete of Incomplete
Submissions" / "Are you sure you want to delete the selected items? This
action cannot be undone. Please confirm to proceed." / "Confirm" ·
"Cancel"; confirming deleted both drafts, the heading and sidebar badges
moving without a reload, checkboxes appearing only on draft rows on its
Active view. The identical OPS surface refuses the
confirmation — fn-ops2.

<a id="fn-j"></a>
**j — search and filters.** `useDashboardConfig.js` `getLeftControls` /
`getRightControls` are view-agnostic: "Filters" button + search box on
every dashboard page including My Submissions. Filter fields
(`APP\components\forms\dashboard\SubmissionFilters`) are data-driven: the
section list is skipped for a single-section journal, categories and
issues {OJS} when none exist; days-since-activity always renders.
`PKPSubmissionFilters::addSectionFields()` counts and lists every section
of the journal, with no active or editor-only condition. Live-probed
2026-09-28 (OJS and OPS, two runs, scratch journals): with three sections,
"Active", "Inactive" (marked inactive) and "EdOnly" (restricted to
editors), one author submission in each, the author's "Section" field
listed all three, and applying any one narrowed the list to that section's
submission, "Active submissions (1)", with the chip "Section: {title}";
with one active section "Open" and one inactive "Shut", the field was
offered with both, and "Shut" showed the author's submission there; with
one section, only "Days since last activity". The Journal Manager's
dashboard panel listed the same sections.
Live-probed 2026-08-26: on the seeded journal the author's panel offered
Section, Issues, Categories and "Days since last activity"; on a
one-section journal with no categories or issues, only the activity
slider. "Assigned To Editor" ("Assigned to Moderator" on OPS; manager/admin-only) appeared for an editor
on the editorial dashboard (positive control) and never for an author-only
account — but it follows roles, not the page: a Manager+Author account's
own My Submissions panel offers it (fn-a4). The press's missing series
filter: fn-omp1.
Search: typing part of a title narrowed the current view, heading and
count following ("Active submissions (1)"); clearing restored the rows.
Mechanics owned by *Submissions dashboard*.

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** The seeded journal `publicknowledge`. The
Author is the roster's `author.alex` (Author only on all three apps), with
one scratch submission from `POST scenarios/submission` (`submitted` at its
default, no decisions: the Submission stage keeps the activity cell empty,
Rule 7e; on OPS the preprint sits at Production, fn-d). The second author
is `author.bea` (Author only); the control's Journal Manager is
`manager.maya` (Journal Manager only, fn-a's manager-only probe).
Addresses: the list `{journal path}/dashboard/mySubmissions`; the retired
list address `{journal path}/submissions` (the suites reach the landing
through it, since the sign-in fixture caches cookies at the site login and
asserts nothing about where sign-in lands); the old author-dashboard link
`{journal path}/authorDashboard/submission/{id}`. Denial wording per fn-a
(the address, "The current role does not have access to this operation.")
and fn-c (the other author's link, "You don't currently have access to that
stage of the workflow.").

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** A scratch journal from `POST scenarios/context`
with one throwaway `author`, two drafts (`submitted: false`) and one
submitted submission as the no-checkbox control. The scenario API has no
saved-step key: the suite opens the first draft's wizard, continues to
"Details" and presses "Save for Later" there before the list is opened, so
the resume step is deterministic (Rule 6). The wizard address is
`{journal path}/submission?id={id}` (fn-f). The deletion leg runs on
"Active submissions" because the "Incomplete submissions" view never lists
a submitted row: the no-checkbox control is unobservable there;
checkboxes-only-on-drafts verified on the Active view of all three apps
(2026-08-26). The mailbox is the mail catcher, Mailpit at
`http://127.0.0.1:8025`, read for the author's address before and after
the delete. OPS: the drafts sit under "Active
submissions" with "Production" bubbles (probed 2026-08-26), and the
deletion leg ends at the OPS2 error dialog: the suite must not assert
successful deletion there (and must not pin the refusal as contract; it is
a 🐞), so the two {OJS OMP} bullets after the confirm step do not run
there.

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** A throwaway `author` from `POST
scenarios/context` (on OJS minted in a helper context, the submissions then
seeded in `publicknowledge`, whose issues feed the scheduled view; on OMP
and OPS on the scratch context itself), with scratch submissions from
`POST scenarios/submission`: two published (`decisions:
['skipExternalReview', 'sendToProduction']`, `published: true`; on OJS
`issue` Vol 1 No 2 (2014), the published one), one declined from the
Submission stage (`decisions: ['initialDecline']`, not mid-review, so its
activity cell stays clear of A2's counter: probed 2026-08-26, OJS, stage
bubble "Declined" and an empty cell), on OJS and OMP one in Copyediting
(`decisions: ['skipExternalReview']`, no copyedited file uploaded, hence
"0"), and on OJS one scheduled into the unpublished issue Vol 2 No 1
(2015) (`published: true` with that `issue`: fn-a3's control, the row
reading "To be published in issue Vol. 2 No. 1 (2015)"). The other
author's submission is one submitted by `author.alex` on `publicknowledge`
or by a second throwaway author on the scratch context. Two published rows
make the search step's narrowing observable ("Published (2)" → "Published
(1)"); the titles carry the run's tag, the first published one being the
search term. The empty view: "Revisions requested" on OJS and OMP, "Active
submissions" on OPS. The Filters panel on `publicknowledge` (OJS) offers
Section, Issues, Categories and "Days since last activity" (fn-j); a
scratch context carries its one default section and no categories (no key
seeds them), so on OMP and OPS the panel is expected to offer "Days since
last activity" alone. The mail catcher, Mailpit at
`http://127.0.0.1:8025`, is read for the author's address before and after
the walk.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** {OJS OMP} A scratch journal from `POST
scenarios/context` with a throwaway `author` and two `externalReviewer`s
(OMP: plus an `internalReviewer`), at the default review type
(double-anonymous while `review.defaultReviewMode` is unset). Submissions
from `POST scenarios/submission`: the revision-request one with
`decisions: ['sendExternalReview', 'requestRevisions']` and one
`reviewRounds[]` reviewer at `status: 'accepted'` (revisions not yet
uploaded; expected cell after the upload "Review update 0/1"); the
under-review one with `decisions: ['sendExternalReview']` and two
reviewers, one `accepted` and one `completed` (OMP takes no
`recommendation` key); on OMP the internal-round one with `decisions:
['sendInternalReview', 'requestRevisionsInternal']` and a `reviewRounds[]`
entry with `stage: 'internal'` and the internal reviewer `accepted` (fn-g:
the upload lands in the internal round). The second journal is a further
scratch context created with `review: {defaultReviewMode: 'open'}`, its own
throwaway author and reviewer, and one submission with `decisions:
['sendExternalReview']` and its reviewer `completed`: the review method is
stamped from the context's default at assignment time (scenarios.md), which
is why the open and the anonymous completed reviews sit on different
journals. The uploaded file is a small text file named after the run's
tag, walked through the shared three-step upload helper. Counter and
popover wording per fn-h.

<a id="fn-s5"></a>
**s5 — scenario 5 seeding.** A scratch journal from `POST scenarios/context`
with four throwaway accounts: `roles: ['author', 'externalReviewer']`,
`['author', 'sectionEditor']`, `['sectionEditor', 'externalReviewer']` and
`['author']` (the control); on OPS, which has no reviewer key, only the
`['author', 'sectionEditor']` account (its Section Editor is the Moderator
group) and the control. Landings per fn-c: the reviewer dashboard is
`dashboard/reviewAssignments`, the Dashboard `dashboard/editorial` (its
"Assigned to me" view), My Submissions `dashboard/mySubmissions`; the
suites may reach each landing through the retired `{journal
path}/submissions` address, which forwards the same way (Rule 3), as
scenario 1's does.

<a id="fn-a1"></a>
**a1 — A1 evidence.** `dashboard.reviewUpdateCounts` and the
`DashboardCellSubmissionActivityReviewsUpdate` component are wired only
into `getEditorialActivityForMySubmissions` (this list's author cell) and
the review-stage author surfaces — purpose-built, not leakage from the
editorial cell; hence the "intended" lean. Live-probed 2026-08-26: the
counter renders for the author on OJS and OMP, including "0/2" with
nothing yet completed.

<a id="fn-a2"></a>
**a2 — A2 evidence.** `getEditorialActivityForMySubmissions()` has no
declined branch (the editorial-dashboard cell composable does). Live-probed
2026-08-26 on OJS: a submission declined during review round 1 (two
reviewers assigned, none completed) shows, on the "Declined" view, stage
bubble "Declined" with activity cell "Review update 0/2". Cell logic
shared by OJS and OMP (same pinned ui-library, fn-d).

<a id="fn-a3"></a>
**a3 — A3 evidence.** Probed 2026-08-26 through the screens: OMP's
"Schedule For Publication" flow (Publication tab → "Publish" confirm) and
OPS's "Post the preprint" flow offer no date control anywhere;
`APP\publication\Repository::setStatusOnPublish` on both apps sets
`STATUS_SCHEDULED` only for a future `datePublished`, so confirming
publishes immediately. No other feeder was found; the OPS/OMP author
"Scheduled for publication" views stayed at "(0)" throughout. OJS control:
publishing into an unpublished issue produced a scheduled row ("To be
published in issue…", fn-f).

<a id="fn-a4"></a>
**a4 — A4 evidence.** `PKPSubmissionFilters::addAssignedTo()` is gated by
`isManagerOrAdmin()` — a role check with no page condition and no app
override, so the field rides into the filter form of any dashboard page,
the personal author list included, for manager/admin accounts. Live-probed
2026-08-26 (OJS, scratch journal): a Manager+Author account's My
Submissions Filters panel offered "Assigned To Editor" alongside "Days
since last activity"; author-only accounts never got the field (fn-j's
positive and negative controls). Live-probed 2026-09-28 on all three apps
(two runs, scratch journals): a Site Administrator holding only Author in
the journal, Journal Manager ended, found the field on their own My
Submissions beside "Days since last activity", labelled "Assigned To
Editor" on OJS and OMP and "Assigned to Moderator" on OPS (the Journal
Manager's dashboard panel carries the same OPS label); author-only accounts
never got it. The Manager+Author combination itself was probed on OJS only;
the gate is the same shared role check.

<a id="fn-a5"></a>
**a5 — A5 evidence.** The forward and the panel auto-open are fn-c's
shared chain; nothing in it checks `submissionProgress`. Live-probed
2026-08-26 (OJS): the draft's own author following the old
author-dashboard address for their draft landed on the list with the
draft's workflow panel open (full stage menu and publication tabs); a
different signed-in author got the authorization-denied page. Not probed
on OMP/OPS.

<a id="fn-a6"></a>
**a6 — A6 evidence.** Live-probed 2026-09-30 (Rules 7b, 9; OJS, OMP, OPS,
two runs; scratch contexts with UI languages English and French (Canada),
each French read paired with the same read in English; the submitting
Author at `/fr_CA/dashboard/mySubmissions`, on arrival and on every
view): the rows in review round 1 with the reviewer accepted and with the
review completed read `##dashboard.reviewUpdateCounts##` on OJS and OMP
(English "Review update 0/1" and "Review update 1/1"), on "Soumissions
actives" and on arrival; the list-level ellipsis button's accessible name
(`aria-label`) read `##common.moreActions##` on all three apps (English
"More Actions"). The page's only other code was the header's
`##common.help##`, present in English too (U08 A1). A draft read
"Incomplète" (OPS "Production") with "Compléter la soumission", a
submission declined at the Submission stage "Rejetée", the columns "ID
Trier / Soumissions / Étape / Activité éditoriale / Actions", the heading
"Soumissions actives (6)". Neither `dashboard.reviewUpdateCounts` nor
`common.moreActions` exists in pkp-lib's `fr_CA` locale files (U57 A4's
fallback).

<a id="fn-omp1"></a>
**omp1 — OMP1 evidence.** OMP's filter form
(`APP\components\forms\dashboard\SubmissionFilters`) never calls
`addSectionFields()` — the omission is dashboard-wide, not specific to the
author list. Live-probed 2026-08-26: on a press with two series the
author's panel offered only Categories and "Days since last activity";
positive controls the same day — a two-section journal and a two-section
preprint server both listed the Section field. Re-driven 2026-09-28 (two
runs) on a press with three series: the author's panel offered "Days since
last activity" alone, and the Press Manager's dashboard panel "Assigned To
Editor" and "Days since last activity", no series field either.

<a id="fn-ops1"></a>
**ops1 — OPS1 evidence.** OPS `APP\submission\Repository::mapDashboardViews()`
passes a reduced type list (Assigned, Active, Production, Scheduled,
Published, Declined) to the shared mapper; `TYPE_INCOMPLETE_SUBMISSIONS`
and both revisions types are simply absent from it. The revisions views
follow from OPS having no review stage; the incomplete view does not
follow from anything absent. Live-probed 2026-08-26: the author sidebar
carries exactly four entries; a draft appears only under "Active
submissions", Stage bubble "Production" (every OPS submission, drafts
included, is created at the Production stage), activity cell "Complete
submission", Actions empty.

<a id="fn-ops2"></a>
**ops2 — OPS2 evidence.** The delete gate
(`Repository::canCurrentUserDelete()`) requires, for an author, an author
stage assignment on the entry (Submission) stage; every OPS submission
lives on the Production stage, so the author branch can never match. The
UI-side availability check (`useDashboardBulkDelete.js::canBeDeleted`) has
no stage condition — hence the offer-then-refusal mismatch. Live-probed
2026-08-26: confirming fires the browser's own delete request, refused
with a permission error ("You do not have permission to delete this
submission."); the screen shows an error dialog, verbatim "Error / You do
not have permission to delete this submission. / OK", and the draft is
still listed after a reload. Reproduced with a draft created live through
the OPS wizard (not a seeding artifact); the identical flow on OJS deleted
its drafts (positive control).
Issue report: [pkp-e2e#331](https://github.com/jardakotesovec/pkp-e2e/issues/331) ([docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md](../issues/U21-OPS3-author-cancel-draft-does-nothing.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| My Submissions page | `{journal}/dashboard/mySubmissions` (sidebar "My Submissions as Author") | rider on ROUTE-008 (owned by *Submissions dashboard*) |
| My Submissions columns | in-page | AFFW-027 |
| Submit revisions action | row activity cell | AFFW-040 |
| Open reviewers avatars | row activity cell | AFFW-048 |
| Review progress counter | row activity cell | AFFW-049 |
| Draft selection & deletion | "More Actions" above the list | riders on AFFW-020, 021, 023, 026 (owned by *Submissions dashboard*) |
| Legacy submissions address | `{journal}/submissions` → forwards home | rider on ROUTE-007 (owned by *Submissions dashboard*) |
| Old author-dashboard link | `{journal}/authorDashboard/submission/{id}` → forwards here with the workflow panel open | ROUTE-005 (owned by [→ workflow addresses](U24-workflow-screen-and-stage-access.md#workflow-addresses)) |

## Reference — code anchors

- `lib/pkp/pages/dashboard/PKPDashboardHandler.php` — op roster, role
  gates, page state (`DashboardPage::MySubmissions`); app subclasses
  override `setupIndex()` / `getSubmissionFiltersForm()` only.
- `lib/pkp/classes/submission/Repository.php::mapDashboardViews()` — view
  roster + per-app overrides (`omp-main/classes/submission/Repository.php`,
  `ops-main/classes/submission/Repository.php`);
  `::canCurrentUserDelete()` — the draft-deletion gate (OPS2).
- `lib/ui-library/src/pages/dashboard/` — `dashboardPageStore.js`,
  `composables/useDashboardConfig.js`,
  `composables/useDashboardConfigEditorialActivity.js`,
  `composables/useDashboardBulkDelete.js`,
  `components/DashboardTable/*` (same ui-library commit in all three
  apps).
- `lib/pkp/classes/core/PKPPageRouter.php::getHomeUrl()` — landing rule.
- `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php::submission()`
  — old-link forward.
- `lib/pkp/classes/template/PKPTemplateManager.php::setupBackendPage()` —
  sidebar menu construction.
