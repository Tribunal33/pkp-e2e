---
name: workflow-screen-and-stage-access
status: verified
---

# Workflow screen & stage access

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every submission has one **workflow screen**: the per-submission editorial
screen where the people working on it meet the submission's stages, its
publication's pages and the tools that act on the whole submission. It opens
as a panel over a submission list, either the editorial dashboard or the
author's My Submissions, and it is the same screen for everyone. What a
person finds inside depends on their role and on how they are assigned to
the submission: which stages open, which publication pages are listed, and
which header buttons appear.

This spec owns the screen's frame and the access rules behind it: how the
screen is reached (including old bookmarked addresses), the header, the side
menu with its stage entries and publication pages, where the screen lands
when it opens, what a stage shows before its own panels, and the three
confirmation dialogs the frame itself carries (delete a submission, return a
finished submission to the workflow, return it to
[Done](GLOSSARY.md#workflow)). Above all it is the one home of the
**stage-access rule**: which role, with which assignment, may open which
stage and which publication page. The stage features, the publication
features and the header tools' own features describe what sits inside each
entry (see *Cross-feature interactions*).

Two things are described elsewhere or not at all. The "View" action that
opens this screen from a list belongs to the list's own feature
(*[Submissions dashboard](U23-submissions-dashboard.md#open-in-place)* and
*[My Submissions](U22-my-submissions.md)*). A press shows an "Internal
Review" stage in the side menu, a "Marketing" group, and "Chapters" and
"Publication Formats" pages; those exist on a press by default and belong
to other features [OMP1](#omp1).

<a id="stage-access"></a>
## Actors & permissions

**Terms used below.** Each role group has a fixed **stage set**, the stages the
group is allowed to work in; the Roles settings screen lists them. The
defaults for the roles this spec names: Section Editor, Guest Editor and
Author cover every stage; Copyeditor covers Copyediting; Layout Editor and
Proofreader cover Production; Funding Coordinator covers Submission and
Review. The Journal Manager and Editor rows carry no stage marks on that
screen because they need none: those roles reach every stage. The other
roles the screen lists (Designer, Indexer, Marketing and sales coordinator,
Translator; a press's Volume editor and Chapter Author) have sets of their
own and follow the same rule. On a preprint server the Moderator is assigned automatically to
every preprint in their section, and the Editorial Board Member has no stage
set at all, so no assistant role reaches the workflow there [OPS1](#ops1).
**Manager-level roles** are Journal Manager and Editor. Wherever this spec
names a Site Administrator it means one who also holds Journal Manager in
the journal, as every journal enrols the Site Administrator who creates it;
one whose Journal Manager role there has been ended gets every workflow or
none, depending on the role left ⚠ [A8](#a8) (Rule 3).
**Editorial roles** are the manager-level roles plus Section Editor, Guest
Editor and the assistant roles (Copyeditor, Layout Editor, Proofreader,
Funding Coordinator). The **author's view** has fewer header tools and
fewer publication pages, but the same stages and the same rules.
<sup>a</sup> <sup>j</sup>

The rule in one sentence: a manager-level role reaches every stage of every
submission without being assigned; every other role reaches only the
submissions they are assigned to, and within those only the stages in their
role's stage set. The rows spell that out per capability.

| Action | Who may, and when |
|--------|--------------------|
| **Open a submission's workflow** (from the editorial dashboard, from My Submissions, or by a typed address, Rules 1–3) | • Journal Manager; Editor: any submission in the journal, assigned or not<br>• Section Editor; Guest Editor; assistant roles: submissions they are assigned to, in any stage. For any other submission the dashboard address gives an empty panel and an "Error" dialog (Rule 3); the older addresses turn them away at the page (Rule 2a)<br>• Author: their own submissions, from My Submissions only. A typed editorial address is refused at the page (Rules 2–3); another author's submission, or their own once deleted, typed at My Submissions gives the empty panel and "Error" dialog (Rule 3)<br>• Reviewer; Reader: never, at any door (Rules 2–3). Reviewers work on their own review pages (see *Reviewer's review*) <sup>a</sup> <sup>b</sup> |
| **Open a stage's panels** (the stage entry shows its panels instead of the no-access box, Rule 13) | • Journal Manager; Editor: every stage, unless they are assigned to the submission in some other role, in which case only that role's stage set. A manager who is also a reviewer of the submission reaches no stage panels at all ⚠ [A4](#a4)<br>• Section Editor; Guest Editor; assistant roles; Author: the stages in their role's stage set. On the other stages they get the no-access box (Rule 13); the Author, whose stage set covers every stage, never sees it on their own submission <sup>j</sup> |
| **See the "Publication" group's pages** ("Preprint" on a preprint server; Rule 9) | • Editorial roles: while their role's stage set includes the active stage (managers always); a submission resting in Done (Rule 18) counts as reached by every role assigned to it. Otherwise the group is listed with nothing under it ⚠ [A2](#a2)<br>• Author: always, on their own submission, with the author's page roster (Rule 10) <sup>h</sup> |
| **See the production-only pages** (Body Text, Galleys, Media, Permissions & Disclosure, Publication Settings / Catalog Entry / Preprint entry; Rule 10) | • Editorial roles: while their role's stage set includes Production (managers always). A press lists "Media" without that condition ⚠ [OMP2](#omp2)<br>• Author: Galleys and Media only, always (Rule 10) <sup>h</sup> |
| **"Payments"** (header dropdown, journals only) | • Every role in the editorial view, the assistant roles included, once the journal has submission payments set up (Settings that modify behavior)<br>• Author: never <sup>f</sup> |
| **"View" / "Preview"** (header) | • Everyone who opened the screen from the editorial dashboard, the assistant roles included: "View" while the submission rests in Done; "Preview" while it is not published and sits in Copyediting or Production (Rule 6)<br>• Author: neither; the author's header carries "Library" only <sup>f</sup> |
| **"Activity Log"** (header) | • Journal Manager; Editor, unless assigned to the submission in another role, in which case as that role (as in the row "Open a stage's panels"); assigned Section Editor and Guest Editor, while their stage set includes the active stage. The log itself is *Submission activity log & notes*<br>• Assistant roles; Author: never <sup>f</sup> |
| **"Library"** (header) | • Everyone who can open the screen, the Author included. The library is *Submission & Publisher Libraries* <sup>f</sup> |
| **"Return to Workflow"** (header, Rule 18) | • [Deciding editors](GLOSSARY.md#roles-and-access), while the submission rests in Done<br>• Assistant roles; Author: never <sup>m</sup> |
| **"Return to Done"** (header, Rule 18) | • The same deciding editors, on the active stage, once the submission has been returned from Done and still has a published version<br>• Assistant roles; Author: never <sup>m</sup> |
| **Confirm the "Delete" dialog** (Rule 19) | • Journal Manager; Editor; Site Administrator (holding Journal Manager in the journal; without it, untried [A8](#a8)). An assigned Section Editor (a Moderator on a preprint server) is not offered the button. Which stage offers it, and when, is the stage feature's rule (*[Submission stage](U25-submission-stage.md#delete)*, *Review stage & rounds*, *Production stage*). Behind the dialog the system refuses the deletion for any other role <sup>n</sup> |
| **Change the submission language / choose a version / create a version** (publication controls, Rules 9 and 17) | • Owned elsewhere: [→ change language](U40-publication-metadata.md), *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*. A version is chosen by selecting its node in the side menu; the page itself offers no version switcher (Rule 17) |

## Fields & validation

N/A. The screen's own surfaces are the header, the side menu and three
confirm dialogs (Rules 18–19), none of which has fields. Every form reached
from the menu belongs to its own feature.

## Rules & state

<a id="workflow-entry"></a>
1. **Where the screen lives.** The workflow opens as a panel over the
   submission list it was opened from: the editorial dashboard for editorial
   roles, My Submissions for the Author. The page address records which
   submission is open and, once a menu entry is selected, which entry (Rule
   12). Closing the panel (the "Close" control at its top corner) returns
   to the list, refreshed. The list-side mechanics of opening and closing
   are the lists' own
   ([→ dashboard](U23-submissions-dashboard.md#open-in-place),
   [→ My Submissions](U22-my-submissions.md)). <sup>a</sup>
<a id="workflow-addresses"></a>
2. **Typed and bookmarked addresses.** Older address shapes still work:
   the editorial workflow address and the two stage-naming shapes (2a), and
   the old author-dashboard address (2b). All of them forward to the
   current screen rather than showing a page of their own; the current
   address itself can be typed too (2c). An older address typed without its
   numbers, or naming a stage the app does not have, does not forward
   (2d).
   - 2a. The **editorial workflow address**, `…/workflow/access/<number>`
     under the journal's own address, forwards an editorial role to the
     editorial dashboard, on its "Assigned to me" view, with that
     submission's workflow open at its usual landing entry (Rule 11). Two
     older shapes name a stage as well, and together they are the
     **stage-naming addresses**: the stage-numbered form
     `…/workflow/index/<number>/<stage number>` (1 Submission, 2 Internal
     Review, 3 Review or External Review, 4 Copyediting, 5 Production),
     and the per-stage forms that carry the stage in a word,
     `…/workflow/submission/<number>`,
     `…/workflow/externalReview/<number>`, `…/workflow/editorial/<number>`
     (Copyediting) and `…/workflow/production/<number>`, plus
     `…/workflow/internalReview/<number>` on a press. They forward the same
     way (on a preprint server only the Production forms do, 2d). The stage
     named in such an address is checked, so a role without access to that
     stage is refused, but it is not carried into the screen: the workflow
     opens at its usual landing entry, not at the named stage, even for a
     stage the submission has not reached ⚠ [A1](#a1). These addresses
     admit editorial roles only. An Author, a Reviewer or a Reader typing one is turned
     away with the access-denied page reading "You don't currently have
     access to that stage of the workflow.". The stage-naming addresses
     (both shapes) additionally refuse an incomplete submission ("Workflow
     access for incomplete submission is restricted."); the plain editorial
     workflow address forwards a draft like the dashboard address does
     [A3](#a3).
   - 2b. The **old author-dashboard address**,
     `…/authorDashboard/submission/<number>`, forwards the submission's own
     Author to My Submissions with that submission's workflow open. On a
     preprint server the panel opens on the preprint's pages (Rule 11). The
     forward is for the Author only. Any other signed-in role, including an
     Author who is not this submission's, gets the access-denied page
     instead ("You do not currently have sufficient privileges to view the
     submission." for anyone who is not an Author: editorial roles,
     Reviewer and Reader alike; "You don't currently have access to that
     stage of the workflow." for a stranger Author).
   - 2c. The **dashboard address itself** (the address Rule 1 produces) can
     be typed or bookmarked. It opens the panel for any submission the
     signed-in role may see, including an incomplete one, which the
     stage-naming addresses of 2a refuse ⚠ [A3](#a3). On a preprint server
     the Author opening their own draft this way gets the panel with an
     "Error" dialog on top ⚠ [OPS4](#ops4). <sup>b</sup>
   - 2d. **Older addresses that do not forward:**
     - the stage-numbered form with its stage number left off, or with a
       number no app uses (9, say): the access-denied page "A workflow
       stage was not specified." (tried as the Journal Manager only);
     - a stage-naming address with no submission number at all
       (`…/workflow/submission`, `…/workflow/externalReview`,
       `…/workflow/editorial`, `…/workflow/production`, `…/workflow/index`,
       and `…/workflow/internalReview` on a press): an entirely blank page,
       for the Journal Manager, Editor, Section Editor and Author alike
       ⚠ [A5](#a5);
     - the editorial workflow address with no number (`…/workflow/access`):
       a bare "404 Not Found" page. `…/workflow/internalReview` gives the
       same page typed without a number on a journal, and with or without
       one on a preprint server;
     - on a preprint server, the Submission, Review and Copyediting forms
       (`…/workflow/submission/<number>`, `…/workflow/externalReview/<number>`,
       `…/workflow/editorial/<number>`, `…/workflow/index/<number>/1`,
       `/3` and `/4`): the access-denied page "A workflow stage was not
       specified." for every role, the Journal Manager, the Moderator and
       the Author alike [OPS1](#ops1). There only the Production forms
       (`…/workflow/production/<number>`, `…/workflow/index/<number>/5`)
       and the editorial workflow address forward. <sup>b</sup>
3. **What a refused or missing submission shows.** The refusal depends on
   the door. The editorial dashboard's address refuses at the page: an
   Author, a Reviewer or a Reader who types it, whatever the submission,
   gets the access-denied page "The current role does not have access to
   this operation." and no panel. A role the dashboard admits (a Section Editor,
   Guest Editor or assistant) who types it for a submission they are not
   assigned to, or anyone who types it for a submission that no longer
   exists, gets the panel with only the submission number in its header and
   an "Error" dialog on top of it: "The current role does not have access
   to this operation." for the refused submission, "Invalid submission."
   for the deleted one, each with an "OK" button. Pressing "OK" leaves the
   empty shell open; that leftover is the *Submission stage*'s
   [→ finding](U25-submission-stage.md#a3). Behind the shell the list shows
   its "Assigned to me" view. The My Submissions address answers an Author
   the same way, shell and dialog over My Submissions, for a submission
   that is not theirs ("The current role does not have access to this
   operation.") or for their own submission once it has been deleted
   ("Invalid submission."). The older addresses of Rule 2a answer a deleted
   submission differently (Rule 19). A Site Administrator whose only role
   left in the journal is Reader gets no panel at all from the dashboard's
   address, only the same "Error" dialog over an empty list; one left with
   Section Editor gets the panel for any submission [A8](#a8). <sup>c</sup>
4. **The header.** The panel's header shows, top to bottom: the submission
   number; the contributors' names, one underlined line, exactly as the
   list's row shows them; under it, the full title of the version being
   shown; the **stage bubble** (Rule 5); and the header buttons (Rule 6).
   While the panel reloads its data after an action, a "Refreshing data"
   spinner appears for a moment beside the number. One reader gets a header
   without the contributors' line: a manager who also reviews the
   submission [A4](#a4). <sup>d</sup>
<a id="stage-label"></a>
5. **The stage bubble.** The coloured bubble under the title names where
   the submission stands, and it is the one label every list and screen
   agrees on: "Incomplete" for a draft on a journal or press (a preprint
   server's draft reads "Production" ⚠ [OPS3](#ops3)), "Submission",
   "Review (Round N)" on a journal (a press reads "Internal Review (Round
   N)" or "External Review (Round N)"), "Copyediting", "Production",
   "Scheduled", "Published" ("Posted" is not used here; a posted preprint's
   bubble also reads "Published"), and "Declined". A declined submission
   reads "Declined" whatever stage it stopped in. A submission resting in
   Done (Rule 18) reads "Published". <sup>e</sup>
6. **The header buttons.** In the editorial view the header offers, left
   to right: on a journal with submission payments set up, a "Payments"
   dropdown, for every role in the editorial view (Actors; Settings that
   modify behavior; *Payments & APCs*); **"View"** while the submission
   rests in Done, or **"Preview"** while it is not published and sits in
   Copyediting or Production (on a preprint server, every preprint that is
   [queued](GLOSSARY.md#workflow) or declined); both open the
   submission's public page, the one a site visitor reads, in the same tab,
   and "Preview"'s page carries the notice "This is a preview and has not
   been published."; neither appears while the
   submission is in Submission or Review. The two buttons follow the
   submission's stage, not its versions: after "Return to Workflow" the
   header offers "Preview" (or, when the submission went back to
   Submission, neither) although a published version still exists (Rule
   18a). Then **"Activity Log"** for the roles the Actors table lists
   (*Submission activity log & notes*); **"Library"** for everyone
   (*Submission & Publisher Libraries*); on a press, a work-type control
   reading "Monograph" whose menu offers "Edited Volume" and "Monograph"
   (*Chapters & work type* {OMP}); and, when offered, **"Return to
   Workflow"** or **"Return to Done"** (Rule 18). The author's view shows
   "Library" and nothing else. <sup>f</sup>
<a id="side-menu"></a>
7. **The side menu: the "Workflow" group.** The panel's left column is a
   menu with two groups (three in a press's editorial view, which adds
   "Marketing" [OMP1](#omp1)). The first, headed "Workflow",
   lists the stages in workflow order, every stage always, whether or not
   the submission has reached it and whether or not the reader may open it:
   on a journal "Submission", "Review", "Copyediting", "Production"; on a
   press "Submission", "Internal Review", "External Review",
   "Copyediting", "Production"; on a preprint server "Production" alone.
   The active stage's entry carries a coloured stripe. Selecting an entry
   opens that stage in the main column under a heading "Workflow: {stage}"
   (for a review round, "Workflow: Review (Round N)"; "Workflow: Internal
   Review (Round N)" or "Workflow: External Review (Round N)" on a press).
   The author's view on a journal or press shows the same group; on a
   preprint server the author's view has no "Workflow" group at all
   [OPS1](#ops1). <sup>g</sup>
8. **Review rounds in the menu.** A review stage that has rounds lists them
   under its entry as "Review Round 1", "Review Round 2", …, one per round,
   in order; the current round of the active review stage carries the
   stripe together with its stage entry. A review stage with no round yet
   has no sub-entries and no fold control. A review stage that has rounds
   is unfolded when the panel opens, whether or not it is the active stage.
   - 8a. **The stage entry itself** ("Review"; "Internal Review" /
     "External Review" on a press) can be selected too. Its heading reads
     "Workflow: Review" ("Workflow: Internal Review" / "Workflow: External
     Review" on a press), and the rounds fold away (and unfold when the
     entry is selected again). In the editorial view the main column shows
     review panels ("Revisions Uploaded", "Files for Review", "Reviewers",
     …) under a "Status" box reading "The submission has been advanced to
     the next round of review", with no decision buttons, even while the
     only round is the active one ⚠ [A6](#a6). The panels there belong to
     no round: "Files for Review" pools every round's files, "Reviewers"
     lists nobody and its "Add Reviewer" window reads only "Invalid review
     round.", and the sentence is a past round's. On a review stage the
     submission has left, the entry's box reads the "advanced … was
     accepted" sentence of Rule 15b instead.
   - 8b. **The stage entry in the author's view** changes only the
     heading. Pressed from a round, the heading reads "Workflow: Review"
     ("Workflow: External Review" on a press) over the round's own "Round N
     Status" box and panels, still on screen. Opened by an address that
     names the entry (Rule 12), the heading stands over nothing at all
     [A6](#a6). <sup>g</sup>
<a id="publication-tabs"></a>
9. **The side menu: the "Publication" group.** The second group is headed
   "Publication" ("Preprint" on a preprint server). It holds one node per
   version of the publication, labelled with the version's name, newest
   last, and under each node the publication's pages (Rule 10). A version
   is chosen by selecting its node; the pages themselves offer no version
   switcher (Rule 17). In the editorial view the nodes appear only while
   the reader's role reaches the active stage (Actors); an assigned
   assistant whose stage set does not include the active stage sees the
   group heading with nothing under it, and pressing the heading does
   nothing ⚠ [A2](#a2). Once the submission rests in Done (Rule 18), every
   role assigned to it sees the nodes, with the pages its stage set allows
   (Rule 10). In the author's view the nodes are always there.
   For the roles that may publish (on these screens the Journal Manager
   and Editor; not an assigned Section Editor, Guest Editor or Moderator),
   the group's last entry, after the newest node, is "Create New Version"
   (*[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*,
   which also owns the version names). Selecting a page opens it under the
   heading "Publication: {page}" ("Preprint: {page}" on a preprint server).
   <sup>h</sup>
10. **The pages under a version node.** The roster depends on the app, the
    view and the reader's access to Production. Pages marked *setting* appear
    only while the journal has the matching option on (Settings that modify
    behavior; "References" and "Funding" are on by default, "Data" and
    "Identifiers" off). Pages marked *production* need Production access
    (Actors).
    - **Journal, editorial view**: "Title & Abstract", "Contributors",
      "Metadata", "References" *setting*, "Data" *setting*, "Funding"
      *setting*, "Identifiers" *setting*, "JATS XML", then "Body Text",
      "Galleys", "Media", "Permissions & Disclosure", "Publication
      Settings", all five *production*.
    - **Press, editorial view**: "Title & Abstract", "Contributors",
      "Chapters" (*Chapters & work type*), "Metadata", "Publication Formats"
      (*Publication formats & proof terms*), "Media", "References"
      *setting*, "Data" *setting*,
      "Funding" *setting*, "Identifiers" *setting* (once listed, it stays
      after the identifier plugin is turned off again, as an empty page
      ⚠ [OMP3](#omp3)), then "Catalog Entry" and "Permissions &
      Disclosure", both *production*. A press has no "JATS XML" or "Body
      Text" page, and its "Media" page is not production-gated
      ⚠ [OMP2](#omp2).
    - **Preprint server, editorial view**: "Title & Abstract",
      "Contributors", "Metadata", "References" *setting*, "Data" *setting*,
      "Funding" *setting*, then "Galleys", "Media", "Permissions &
      Disclosure", "Preprint entry", all four *production*. A preprint
      server ships no identifier plugin, so it never lists "Identifiers".
    - **Author's view, journal**: "Title & Abstract", "Contributors",
      "Metadata", "References" *setting*, "Data" *setting*, "Funding"
      *setting*, "Galleys", "Media". **Press**: "Title & Abstract",
      "Contributors", "Chapters", "Metadata", "Publication Formats",
      "Media", "References" *setting*, "Data" *setting*, "Funding"
      *setting*. **Preprint server**: the author's journal list above,
      with "Production Tasks & Discussions" added last [OPS1](#ops1). The author's
      view never lists "Identifiers", "JATS XML", "Body Text",
      "Permissions & Disclosure", "Publication Settings", "Catalog Entry"
      or "Preprint entry".
    What each page contains, and whether it is editable, belongs to the
    page's feature (*Cross-feature interactions*); this spec owns only that
    the entry is offered, and when. <sup>h</sup>
<a id="initial-selection"></a>
11. **Where the screen lands.** When the panel opens without a remembered
    entry (Rule 12), it selects:
    - the current round of the active review stage, while the submission is
      in review;
    - "Title & Abstract" of the newest version, while the submission sits in
      Production and is no longer queued (scheduled or declined there), or
      rests in Done (then no stage entry carries the stripe);
    - otherwise the active stage's entry: for a declined submission, the
      "Submission" entry if it was declined there, or the round it was
      declined in.
    When that entry is a stage outside the reader's stage set (a Copyeditor
    opening a submission in review lands on the round), it shows the
    no-access box of Rule 13. On a preprint server the author's view always
    lands on "Title & Abstract", and a preprint declined at Production lands
    on "Title & Abstract" rather than on the stage that holds the decision
    buttons ⚠ [OPS2](#ops2). <sup>i</sup>
<a id="deep-link"></a>
12. **Deep links.** Every menu selection is written into the page address,
    so the address of an open panel names both the submission and the
    selected entry, in the part of the address after the "?". Opening such
    an address, or reloading it, reopens the panel on that entry. An entry
    the reader's view does not list (an Author who copies the entry part
    from an Editor's address while "Permissions & Disclosure" is selected
    and adds it to their own My Submissions address), or an entry that does
    not exist, falls back to Rule 11 and the address is rewritten to the
    entry that opened; an entry naming a stage the reader may not open is
    honoured and shows the no-access box (Rule 13). Closing the panel
    clears both parts from the address. <sup>i</sup>
<a id="stage-gate"></a>
13. **A stage the reader may not open.** Selecting a stage outside the
    reader's stage set (Actors) shows a single box, with no heading, reading
    "You don't currently have access to that stage of the workflow." and
    nothing else: no language line, no status box, no panels, no right-hand
    column, no action buttons. The menu entry itself is still offered; the
    box is the whole answer. <sup>j</sup>
14. **The submission-language line.** Every stage the reader may open, the
    Author included, begins with "Current Submission Language: {language}".
    On the stage screens it is a read-out only, never with a "Change" link;
    the link is offered on the publication pages (Rule 17) for the roles
    *[Publication metadata](U40-publication-metadata.md)* names. <sup>k</sup>
<a id="status-box"></a>
15. **The status box.** Under the language line, a box headed "Status"
    describes where the submission stands relative to the stage being
    viewed. Its text is, in order of precedence:
    - 15a. a stage the submission has not reached: "The {stage} stage has
      not yet been initiated." (a review stage counts as not reached while
      it has no round, so a press's Internal Review that was skipped keeps
      reading this after the submission has moved on);
    - 15b. a stage the submission has moved beyond: "The submission is
      currently in the {stage} stage.", naming the active stage or, while
      the submission rests in Done (Rule 18), the stage it would return to
      (Production for a submission that passed through Production). On a
      review stage the submission has left, every box is headed "Status",
      not "Round N Status"; a round that was followed by a further round
      reads instead "The submission advanced to the next review round, was
      accepted, and is currently in the {stage} stage.", the last round
      reads "currently in", and the stage's own entry (Rule 8) reads the
      "advanced … was accepted" sentence whether it has one round or
      several;
    - 15c. a review stage that is active: the box is headed "Round N
      Status" and carries the round's status sentence; a past round of the
      active stage (and the stage entry itself, Rule 8) reads "The
      submission has been advanced to the next round of review". The round
      sentences, and the minimum-reviews lines that can precede them, are
      *[Review stage & rounds](U26-review-stage-and-rounds.md)*';
    - 15d. Production, while the submission rests in Done (Rule 18):
      "Submission published.";
    - otherwise no box at all: the Submission stage while queued or
      declined there; Copyediting or Production while active and
      unpublished (a queued or declined preprint included); and a stage the
      submission has just been returned to from Done (Rule 18a). There the
      stage's own notices ("Assign a copyeditor using the Assign link in the
      Participants list.", for one) take that slot instead. A submission
      published straight from the Submission stage is the odd case: while
      it rests in Done its "Submission" and "Copyediting" entries show no
      box at all, although "Review" reads "not yet been initiated"
      ⚠ [A7](#a7).
    Stage names in these sentences are "Submission", "Review" ("Internal
    Review" / "External Review" on a press), "Copyediting" and
    "Production". <sup>k</sup>
16. **A not-yet-reached stage hides its panels.** When the box reads "has
    not yet been initiated" (15a), the stage's own panels stay hidden. For
    editorial roles the right-hand "Participants" column stays (read-only
    for a reader who may not assign); the author's view has no
    "Participants" column on any stage. A not-yet-reached Production keeps
    its "Schedule For Publication" button, on a press as on a journal
    (whose presence is the *Production stage*'s rule).
    Only a press's unreached Internal Review shows nothing at all under the
    box. Everything else the stage would show comes back the moment the
    submission reaches it. <sup>k</sup>
<a id="publication-chrome"></a>
17. **The publication page frame.** A publication page opens under its
    "Publication: {page}" heading with two control regions above the page's
    content. The left region holds, for editorial roles only, the "Current
    Submission Language: {language}" line, with its "Change" link for the
    roles *[Publication metadata](U40-publication-metadata.md)* names: on
    these screens the Journal Manager, Editor, an assigned Section Editor
    and the Moderator were offered it, the assistant roles got the line
    without it. The line follows the submission, not the version: it shows
    while the submission is not published and has a single version, it
    disappears for everyone once the submission is published or a second
    version exists, and it is back, "Change" included, above "Status:
    Published" after "Return to Workflow" (Rule 18a). Under it sits a
    read-only "Status: {Unscheduled | Scheduled | Published | Unpublished}"
    line with a coloured dot ("Unposted" / "Posted" on a preprint server,
    where a version that was posted and then unposted reads "Unpublished");
    for the Author, who gets no language line, this status line is the
    region's first item. On a preprint server the region ends with a
    "Relations" dropdown, for the Moderator and the Author alike.
    The right region holds the publishing controls: "Preview", only while
    the submission sits in Copyediting or Production (a second "Preview",
    beside the header's of Rule 6), with "Schedule For Publication" on a
    journal, "Publish" on a press or "Post" on a preprint server; a
    journal's second version beside a published one offers "Publish"; and
    "Unschedule", "Unpublish" or "Unpost" once scheduled or published. The
    region is there for the roles that may publish, the Journal Manager and
    Editor, and absent for everyone else: an assigned Section Editor or
    Guest Editor, the Moderator, the assistant roles and the Author. What
    the controls do is
    *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'
    and *[Publication metadata](U40-publication-metadata.md)*'. <sup>l</sup>
<a id="done"></a>
18. **Done, and the two return buttons.** When a submission's version of
    record is published (which version counts as the version of record is
    *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'
    rule; on a preprint server, posting the preprint), the submission
    leaves the stage it was in and rests in **Done**, a resting place beyond
    Production: the stage bubble reads
    "Published", no stage entry carries the stripe, and the activity log
    records "{editor} moved this submission to the Done stage." (publishing
    itself is *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*').
    Unpublishing the last published version sends it back the same way,
    automatically, to the stage it was published from; the panel then lands
    on that stage (Rule 11), and a submission that is in Done yet no longer
    published cannot be met on these screens. Done is a resting place, not
    a stage files are attached to: in a discussion's "Add" › "Attach Files"
    › "Attach Workflow Files" step, the "Select submission stage" list ends
    with Production and never offers Done [A10](#a10). Two header buttons
    let a
    deciding editor (the roles the Actors table names) move it by hand:
    - 18a. **"Return to Workflow"**, offered while the submission rests in
      Done. It opens a dialog titled "Return to Workflow" reading "Return
      this submission to the workflow stage it occupied before it was moved
      to Done." with "Confirm" (filled) and "Cancel"; "Cancel" changes
      nothing. Confirming puts the submission back in the stage it was
      published from, queued, with its published version still published:
      Production for a submission that passed through Production,
      Submission for one published straight from the Submission stage
      (whose "Production" entry then reads "not yet been initiated" again),
      and always Production on a preprint server. The bubble names that
      stage, the header swaps "View" for "Preview" (or neither, Rule 6) and
      "Return to Workflow" for "Return to Done", the "Production" entry
      loses its "Submission published." box, and the log gains "{editor}
      returned this submission to the workflow.".
    - 18b. **"Return to Done"**, offered on the active stage after such a
      return, while a published version still exists. Its dialog is titled
      "Return to Done" and reads "Return this submission to the Done
      stage.", "Confirm" / "Cancel". Confirming moves it back to Done; the
      log gains "{editor} returned this submission to the Done stage.".
      Unpublishing the version removes the button at once, and publishing
      again sends the submission straight back to Done without it.
    Neither dialog sends email. Both refresh the panel afterwards.
    <sup>m</sup>
<a id="delete-dialog"></a>
19. **The "Delete" dialog.** Wherever a stage offers a "Delete" button (the
    stage features say where), pressing it opens a dialog titled "Delete"
    reading "Are you sure you want to permanently delete this submission?"
    with "Confirm" (filled) and then "Cancel" (in red). "Cancel" keeps the
    panel and the button. Confirming removes the submission and all its
    records permanently, closes the panel, drops the submission from the
    address and returns to the refreshed list, from which the submission is
    gone, its "Declined" view included. Nothing is emailed. Behind the
    dialog the system refuses the deletion for anyone who is not a
    manager-level role or Site Administrator; that refusal is a safeguard,
    not something the screen offers, because the Journal Manager, Editor
    and Site Administrator are the only roles ever shown the button
    (Actors). A stale dashboard address to the deleted submission then
    behaves as Rule 3 says; the older addresses of Rule 2a show a bare
    "404 Not Found" page instead ⚠ [A9](#a9). <sup>n</sup>

## Side effects

- **On "Return to Workflow" / "Return to Done".** A decision is recorded
  and the activity log gains the line Rule 18 quotes. No email, no
  notification.
- **On "Delete" confirmed.** The submission and everything attached to it
  are removed permanently. No email. The dashboard's side-menu counts
  follow within a few seconds
  (*[Submissions dashboard](U23-submissions-dashboard.md)*).
- **On publishing and unpublishing** (done from the publication pages,
  *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*):
  the submission enters or leaves Done by itself, with the log line and the
  header changes Rule 18 describes.
- **On every other selection.** Opening stages and pages changes nothing;
  the address bar is updated (Rule 12).

## Settings that modify behavior

- **Workflow > Submission > Metadata** (the journal's metadata options):
  "References" (citations, on by default) adds the "References" page; "Data
  availability statement" or data citations (off by default) add the "Data"
  page; funders (on by default) add the "Funding" page (Rule 10). Turning an
  option off removes exactly its page. Each option's own effect is its
  feature's (*Citations & references*,
  *[Publication metadata](U40-publication-metadata.md)*,
  *[Funding](U43-funding.md)*).
- **Public identifier plugins** {OJS OMP} (Settings > Website > Plugins):
  enabling one, the URN plugin for instance, and then, in the plugin's
  settings, ticking "Articles" under "Journal Content" ("Monographs" under
  "Press Content" on a press) adds the "Identifiers" page to the editorial
  roster; the page's contents are the *Identifiers* feature's. Disabling
  the plugin removes the page again on a journal but not on a press
  [OMP3](#omp3). A preprint server ships no such plugin. <sup>h</sup>
- **Submission payments** {OJS} (Settings > Distribution > Payments for
  enabling and the payment method; the journal's own "Payments" page,
  "Payment Types" tab, for the fee): the header gains the "Payments"
  dropdown, for every role in the editorial view, only once payments are
  enabled, a payment method is set up (for manual payment, its
  instructions filled in) and the Article Processing Charge is above zero
  (*Payments & APCs*). The Author never sees it. <sup>f</sup>
- **Roles configuration**: each role group's stage set decides which stages
  that role can open (Actors). Changing a group's stages changes what its
  members see on every submission at once, in both directions, from their
  next open of the panel. <sup>j</sup>
- **The app's stage roster** is fixed per application (four stages on a
  journal, five on a press, one on a preprint server) and is not a setting
  [OMP1](#omp1) [OPS1](#ops1).

## Cross-feature interactions

- *[Submissions dashboard](U23-submissions-dashboard.md#open-in-place)* and
  *[My Submissions](U22-my-submissions.md)*: the "View" actions that open
  this panel, the open-in-place mechanics of each list, and the lists'
  counts.
- *[Submission stage](U25-submission-stage.md)*, *[Review stage & rounds](U26-review-stage-and-rounds.md)*,
  *Copyediting stage*, *Production stage*: what each stage entry shows once
  it is open (panels, decision buttons, the author's reduced panel set),
  and where the "Delete" and "Schedule For Publication" buttons are
  offered. Those specs point here for who may open the stage at all.
- *[Publication metadata](U40-publication-metadata.md)*, *[Contributors & affiliations](U41-contributors-and-affiliations.md)*,
  *Citations & references*, *[Funding](U43-funding.md)*, *Identifiers*,
  *JATS & Body Text*, *Galleys*, *Media files*, *Catalog management*: the
  contents of the publication pages this spec lists.
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  the version nodes and their names, "Create New Version", the right-hand
  publishing controls, and the publishing and unpublishing that move a
  submission into and out of Done.
- *Submission activity log & notes* and *Submission & Publisher Libraries*:
  the "Activity Log" and "Library" header buttons' windows.
- *Payments & APCs*: the journal's "Payments" header dropdown.
- *Editorial decision recording*: the decision buttons on each stage, and
  on a preprint server the "Change decision" link that reveals them.
- *Stage participants*: assignment, the source of every non-manager's
  access here, and the "Participants" column that stays on a not-yet-reached
  stage (Rule 16).
- *Roles configuration*: the stage set of each role group.
- *[Login & sessions](U01-login-and-sessions.md)*: the access-denied page
  quoted in Rules 2–3.
- **The submissions service** (a note for spec maintainers; nothing here
  is visible on screen or testable). Every panel and page in this screen
  reads and writes the submission through one shared service, and this spec
  is where that service is recorded; the feature that drives each of its
  operations (submitting, deciding, editing the publication, managing
  contributors, publishing) describes that operation. <sup>o</sup>

## Canonical scenarios

Every scenario but 12 runs on the seeded journal with ready accounts; the
submissions and their assignments are scratch. Scenario 12 runs on a
scratch journal with throwaway accounts, and so does scenario 14 on a
press or preprint server. The accounts, their passwords, the mail
catcher's address and the tooling recipe are in the footnote.
<sup>s</sup>

1. **Open a submission's workflow from the editorial dashboard**

   Given: Editor, on the dashboard, with a freshly submitted article.

   - **"View" on the row**: press it: a panel opens over the list, and the
     address bar now contains the submission number (Rules 1, 12).
   - **The header**: shows the submission number, the contributors' names
     underlined, the full title, and the bubble "Submission"; the header
     offers "Activity Log" and "Library" and neither "View" nor "Preview"
     while the submission sits in Submission. On a preprint server, where
     a queued preprint sits in Production, the bubble reads "Production"
     and the header offers "Preview", "Activity Log" and "Library"
     [OPS1](#ops1) (Rules 4, 5, 6).
   - **The side menu**: a "Workflow" group listing "Submission", "Review",
     "Copyediting", "Production" (the first with a coloured stripe; on a
     preprint server "Production" only [OPS1](#ops1)) and a "Publication"
     group with one version node whose pages start "Title & Abstract",
     "Contributors", "Metadata" (Rules 7, 9, 10).
   - **The main column**: headed "Workflow: Submission" (Rule 7).
   - **Control**: press "Close": the list is back, the panel gone (Rule 1).

2. **Walk the stages of a submission in review** {OJS OMP}

   Given: Editor, with one submission in Review Round 1 and a second in
   Review Round 2, both on the dashboard.

   - **The landing entry**: open the Round 1 submission: the panel lands on
     "Review Round 1" under "Review" ("External Review" on a press), headed
     "Workflow: Review (Round 1)" ("Workflow: External Review (Round 1)" on
     a press), with a box headed "Round 1 Status"; the bubble reads "Review
     (Round 1)" ("External Review (Round 1)" on a press) (Rules 5, 8, 11,
     15c).
   - **"Submission"**: select it: the stage begins with "Current Submission
     Language: English", a read-out with no "Change" link, and the box
     reads "Status" / "The submission is currently in the Review stage."
     ("… in the External Review stage." on a press) above the stage's
     panels (Rules 14, 15b).
   - **"Copyediting"**: select it: the same language line, and the box
     reads "The Copyediting stage has not yet been initiated." with no
     panels below it; only the "Participants" list stays on the right
     (Rules 14, 15a, 16).
   - **"Production"**: select it: the same box naming Production, with a
     "Schedule For Publication" button (so labelled on a press too) and the
     "Participants" list, still no panels (Rules 15a, 16).
   - **A press's skipped Internal Review** {OMP}: for a monograph sent
     straight to External Review from the Submission stage (so that
     Internal Review was skipped), "Internal Review" reads "The Internal
     Review stage has not yet been initiated." with nothing below it, not
     even the "Participants" list (Rules 15a, 16).
   - **The Round 2 submission**: open it: the "Review" entry lists "Review
     Round 1", "Review Round 2" in that order, the panel lands on "Review
     Round 2", striped together with "Review", and "Review Round 1" reads
     "The submission has been advanced to the next round of review"
     (Rules 8, 11, 15c).
   - **Control**: on the Round 1 submission "Review Round 1" alone sits
     under "Review", and its box is headed "Round 1 Status", not "Status"
     (Rules 8, 15c).

   A preprint server has one stage and cannot run this scenario; scenario
   10 covers it.

3. **A stage outside the role's stage set** {OJS OMP}

   Given: Copyeditor, assigned to a submission in Review, with a second
   submission in Review to which nobody assigned them.

   - **The landing entry**: open the assigned submission from the
     dashboard: the panel lands on "Review Round 1" and the main column is
     one box reading "You don't currently have access to that stage of the
     workflow." with nothing else (Rules 11, 13).
   - **"Submission"**: select it: the same box (Rule 13).
   - **Reload on "Submission"**: reload the page: the panel reopens on
     "Submission", the box still the whole answer, and the address keeps
     the entry (Rule 12).
   - **"Copyediting"**: select it: instead, the line "Current Submission
     Language: English" and the box "The Copyediting stage has not yet been
     initiated.", with the "Participants" list on the right (no "Assign"
     button) and no panels (Rules 14, 15a, 16).
   - **The "Publication" group**: shows its heading with no version node
     beneath it; pressing the heading changes nothing [A2](#a2) (Rule 9).
   - **The other submission's dashboard address**: type the dashboard
     address of the submission nobody assigned them to: the panel opens
     with only the submission number in its header and an "Error" dialog
     on top reading "The current role does not have access to this
     operation." with an "OK" button; behind the shell the list shows its
     "Assigned to me" view (Rule 3).
   - **The other submission's older address**: type its
     `…/workflow/access/<number>` address: an access-denied page, no panel
     (Rule 2a; Actors row 1).
   - **Control**: an Editor on the assigned submission sees the review
     round's panels and a version node with pages (Rules 9, 13).

   On a preprint server there is no Copyeditor role and no assistant with
   stage access, so the scenario has no analogue there; scenario 11 covers
   the preprint server's assistant [OPS1](#ops1).

4. **The production-only pages** {OJS OMP}

   Given: Funding Coordinator, assigned to a submission in Review (a
   journal or press).

   - **The version node**: open the submission and expand the node. On a
     journal the pages are "Title & Abstract", "Contributors", "Metadata",
     "References", "Funding", "JATS XML"; there is no "Body Text",
     "Galleys", "Media", "Permissions & Disclosure" or "Publication
     Settings". On a press the list runs "Title & Abstract",
     "Contributors", "Chapters", "Metadata", "Publication Formats",
     "Media", "References", "Funding", with no "Catalog Entry" or
     "Permissions & Disclosure" ("Media" is listed there, unlike on a
     journal [OMP2](#omp2)) (Rule 10).
   - **The header**: offers "Library" and no "Activity Log" (Actors row 7).
   - **"Title & Abstract"**: select it: the page opens under "Publication:
     Title & Abstract" with "Current Submission Language: English" and no
     "Change" link, under it "Status: Unscheduled", and no region of
     publishing controls on the right (Rules 9, 17).
   - **Control**: a Journal Manager on the same submission sees those pages
     as well, and "Create New Version" after the node; on "Title &
     Abstract" the language line carries "Change" and the right-hand
     region offers "Schedule For Publication" ("Publish" on a press)
     without "Preview", the submission being in Review (Rules 9, 17).

   On a preprint server the assistant role has no stage access, so the
   scenario has no analogue; a Moderator sees the full roster (scenario
   10) [OPS1](#ops1).

5. **Deep link and reload**

   Given: Editor, with a freshly submitted article open in its panel.

   - **"Contributors" under the version node**: select it, copy the address
     bar and open it in a new tab: the panel opens directly on
     "Publication: Contributors" (Rule 12).
   - **Reload**: the same (Rule 12).
   - **An entry that does not exist**: the part of the address after the
     "?" names the submission and the selected entry; replace the entry's
     name with `nonsense` and open the address: the panel opens at
     its landing entry, headed "Workflow: Submission" ("Workflow:
     Production" on a preprint server), and the address is rewritten to
     that entry (Rules 11, 12).
   - **Control**: press "Close": the address loses the submission and
     entry parts and the list is back (Rules 1, 12).

6. **Typed addresses forward**

   Given: Editor and Author, with the Author's submitted article, a second
   Author's submitted article and a draft of the first Author's, each
   signed in on the journal.

   - **The editorial workflow address**: the Editor types the journal's
     `…/workflow/access/<number>` address for the submission: the
     editorial dashboard opens on "Assigned to me" with that submission's
     workflow panel open (Rule 2a).
   - **The dashboard address for a draft**: the Editor types the dashboard
     address of the draft: the panel opens, its bubble reading
     "Incomplete" ("Production" on a preprint server [OPS3](#ops3))
     [A3](#a3) (Rules 2c, 5).
   - **The old author-dashboard address**: the Author types
     `…/authorDashboard/submission/<number>` for their own submission: My
     Submissions opens with the panel open (on a preprint server, on
     "Preprint: Title & Abstract") (Rules 2b, 11).
   - **The Author at the editorial addresses**: the Author types the
     `…/workflow/access/<number>` address and is turned away with a page
     reading "You don't currently have access to that stage of the
     workflow."; the Author types the submission's dashboard address and
     gets the access-denied page "The current role does not have access to
     this operation." and no panel (Rules 2a, 3).
   - **A stranger Author at the old author-dashboard address**: the second
     Author types `…/authorDashboard/submission/<number>` for the first
     Author's submission: the access-denied page reading "You don't
     currently have access to that stage of the workflow." (Rule 2b).
   - **Control**: an Editor types the author-dashboard address and gets
     "You do not currently have sufficient privileges to view the
     submission." (Rule 2b).

7. **The author's view**

   Given: Author, on My Submissions, with their own submission in
   Copyediting (a queued preprint on a preprint server) and a second
   Author's submitted article on the same journal.

   - **"View" on the row**: press it: the header offers "Library" and
     nothing else, and the bubble reads "Copyediting" ("Production" on a
     preprint server) (Rules 5, 6).
   - **The "Workflow" group**: on a journal or press it lists every stage;
     select "Submission", "Review Round 1", "Copyediting" and "Production"
     in turn (on a press "Submission", "Internal Review", "External
     Review"'s "Review Round 1", "Copyediting" and "Production"): each
     begins with "Current Submission Language: English", none shows the
     box "You don't currently have access to that stage of the workflow.",
     and none has a "Participants" column (Rules 13, 14, 16).
   - **The version node**: lists, in the order Rule 10 gives for the app,
     "Title & Abstract", "Contributors", "Metadata" and the metadata pages
     the journal has switched on ("References" and "Funding" on a fresh
     install), plus "Galleys" and "Media" on a journal, or "Chapters",
     "Publication Formats" and "Media" on a press; it never lists
     "Identifiers", "JATS XML", "Permissions & Disclosure" or "Publication
     Settings"; there is no "Create New Version" (Rules 9, 10).
   - **"Title & Abstract"**: select it: no language line; the region's
     first item is "Status: Unscheduled" ("Unposted" on a preprint server,
     followed by a "Relations" dropdown), and no region of publishing
     controls on the right (Rule 17).
   - **An entry copied from an Editor's address**: take the entry's name
     from the part after the "?" of an Editor's address while "Permissions
     & Disclosure" is selected, and add it to the Author's own My
     Submissions address for the same submission: the panel opens at the
     landing entry, "Workflow: Copyediting" ("Preprint: Title & Abstract"
     on a preprint server), and the address is rewritten to that entry
     (Rules 11, 12).
   - **The other Author's submission**: type the My Submissions address for
     the second Author's submission: the panel with only the submission
     number in its header and an "Error" dialog reading "The current role
     does not have access to this operation." with "OK", over My
     Submissions (Rule 3).
   - **Control**: an Editor opening the same submission sees "Activity
     Log" and "Preview" in the header and "Permissions & Disclosure" in
     the list; pressing "Preview" opens the submission's public page in
     the same tab, carrying "This is a preview and has not been
     published." (Rules 6, 10).

   On a preprint server the author's panel has no "Workflow" group, lands
   on "Preprint: Title & Abstract", and the node ends with "Production
   Tasks & Discussions" [OPS1](#ops1).

8. **View, Done and the two return buttons**

   Given: Journal Manager, with a submission that went through Production
   and is published, a second one published straight from the Submission
   stage {OJS OMP}, and a third scheduled into an issue {OJS}.

   - **The published submission**: open it: the bubble reads "Published";
     the header offers "View" and "Return to Workflow"; no stage entry is
     striped; the panel lands on "Publication: Title & Abstract", which
     shows no language line, "Status: Published" first and "Unpublish" on
     the right ("Status: Posted" and "Unpost" on a preprint server) (Rules
     5, 6, 11, 17, 18).
   - **"Production"**: select it: the box "Status" / "Submission
     published." (Rule 15d).
   - **The review entries** {OJS OMP}: select "Review Round 1": the box is
     headed "Status" and reads "The submission is currently in the
     Production stage."; select "Review" itself: "The submission advanced
     to the next review round, was accepted, and is currently in the
     Production stage." (Rules 8, 15b).
   - **"Return to Workflow", then "Cancel"**: press the button: a dialog
     titled "Return to Workflow" reads "Return this submission to the
     workflow stage it occupied before it was moved to Done." with
     "Confirm" and "Cancel"; press "Cancel": the bubble still reads
     "Published" (Rule 18a).
   - **"Return to Workflow", then "Confirm"**: the bubble now reads
     "Production", the "Production" entry is striped and shows its panels
     with no "Status" box, and the header offers "Preview" and "Return to
     Done" in place of "View" and "Return to Workflow" (Rules 6, 18a).
   - **"Title & Abstract" after the return**: select it: the line "Current
     Submission Language: English" is back, "Change" included, above
     "Status: Published" ("Status: Posted" on a preprint server) (Rule 17).
   - **"Return to Done", then "Cancel"**: press the button: the dialog
     titled "Return to Done" reads "Return this submission to the Done
     stage."; press "Cancel": the bubble still reads "Production" (Rule
     18b).
   - **"Return to Done", then "Confirm"**: the bubble reads "Published"
     again and "View" is back (Rule 18b).
   - **"Activity Log"**: open it: the log holds "{editor} returned this
     submission to the workflow." and "{editor} returned this submission
     to the Done stage.", and no email reached the author's mailbox (Rule
     18; Side effects).
   - **"Unpublish" from Done**: select "Title & Abstract", press
     "Unpublish" ("Unpost" on a preprint server) and confirm its dialog
     (the dialog is *[Publish, schedule &
     versions](U49-publish-schedule-and-versions.md)*'): the submission
     leaves Done by itself: the bubble reads "Production", the
     "Production" entry is striped, and the header offers "Preview" and no
     "Return to Done"; close the panel and open the submission again: it
     lands on "Production" (Rules 11, 18, 18b; Side effects).
   - **The submission published from the Submission stage** {OJS OMP}:
     open it, press "Return to Workflow" and "Confirm": the bubble reads
     "Submission", the header offers neither "View" nor "Preview" but
     "Return to Done", and "Production" reads "The Production stage has
     not yet been initiated." (Rules 6, 18a).
   - **The scheduled submission** {OJS}: open it: the bubble reads
     "Scheduled", the header offers "Preview", and the panel lands on
     "Publication: Title & Abstract" with "Production" striped (Rules 5,
     6, 11).
   - **Control**: the published submission's assigned Layout Editor,
     opening it after the first bullet, sees "View", the version node with
     its pages, the production-only pages included, and neither return
     button; after "Return to Workflow" / "Confirm", "Preview" and still
     neither (Rules 9, 10, 18). On a preprint server no assistant can open
     the panel; the control there is the Author, whose header reads
     "Library" throughout [OPS1](#ops1).

App-specific:

9. **{OMP} The press's five-stage menu**

   Given: Press Editor, with a monograph in External Review Round 1.

   - **The "Workflow" group**: open the monograph: the group lists
     "Submission", "Internal Review", "External Review", "Copyediting",
     "Production", with "Review Round 1" under "External Review" and the
     main column headed "Workflow: External Review (Round 1)" (Rules 7,
     8).
   - **The "Marketing" group**: sits between "Workflow" and "Publication"
     (Rule 7).
   - **The version node**: lists "Title & Abstract", "Contributors",
     "Chapters", "Metadata", "Publication Formats", "Media", "References",
     "Funding", "Catalog Entry", "Permissions & Disclosure", and no "JATS
     XML" or "Body Text" [OMP1](#omp1) (Rule 10).
   - **Control**: a Funding Coordinator assigned to the same monograph
     still sees "Media" (and the "Marketing" group) but not "Catalog
     Entry" or "Permissions & Disclosure" [OMP2](#omp2) (Rule 10).

10. **{OPS} The single-stage preprint workflow**

    Given: Moderator, with a queued preprint and a declined preprint in
    their section.

    - **The queued preprint**: open it: the "Workflow" group lists
      "Production" only, striped; the main column is headed "Workflow:
      Production" and shows no status box (Rules 7, 15).
    - **The "Preprint" group**: its version node ends with "Permissions &
      Disclosure", "Preprint entry", never lists "Identifiers", and the
      group has no "Create New Version" (Rules 9, 10).
    - **"Title & Abstract"**: select it: "Current Submission Language:
      English" with "Change", under it "Status: Unposted" and a
      "Relations" dropdown, and no region of publishing controls on the
      right (Rule 17).
    - **The declined preprint**: open it: the bubble reads "Declined" and
      the panel lands on "Preprint: Title & Abstract", not on "Production"
      [OPS2](#ops2) (Rules 5, 11).
    - **Control**: select "Production" on that declined preprint: the main
      column is headed "Workflow: Production" and offers the stage's own
      buttons, "Revert Decline" among them [OPS1](#ops1).

11. **Refused at every door** {OJS OMP OPS}

    Given: a Reviewer assigned to a submitted article, their review
    accepted {OJS OMP}, a Reader, and on a preprint server an Editorial
    Board Member, each signed in on the journal.

    - **The Reviewer at the dashboard address** {OJS OMP}: type the
      submission's dashboard address: the access-denied page "The current
      role does not have access to this operation." and no panel
      (Rule 3).
    - **The Reviewer at the editorial workflow address** {OJS OMP}: type
      `…/workflow/access/<number>`: a page reading "You don't currently
      have access to that stage of the workflow." (Rule 2a).
    - **The Reviewer at the old author-dashboard address** {OJS OMP}: type
      `…/authorDashboard/submission/<number>`: "You do not currently have
      sufficient privileges to view the submission." (Rule 2b).
    - **The Reader at the three addresses**: type the same three
      addresses: the same three answers, in the same order (Rules 2a, 2b,
      3).
    - **The Editorial Board Member at the dashboard address** {OPS}: type
      it: the panel opens with only the submission number in its header
      and an "Error" dialog reading "The current role does not have access
      to this operation." with "OK" (Rule 3) [OPS1](#ops1).
    - **Control**: an Editor typing the submission's dashboard address
      gets the panel with the submission's header (Rule 2c).

    A preprint server has no Reviewer role, so only the Reader and the
    Editorial Board Member run there [OPS1](#ops1).

12. **A manager assigned in another role** {OJS OMP}

    Given: on a scratch journal, an account holding the Journal Manager
    and Layout Editor roles, assigned as Layout Editor to a submission in
    Review Round 1, with a second submission in Review Round 1 to which
    they are not assigned.

    - **The landing entry**: open the assigned submission: the panel lands
      on "Review Round 1" and the main column is the one box "You don't
      currently have access to that stage of the workflow." (Actors row 2;
      Rules 11, 13).
    - **"Submission" and "Copyediting"**: select each ("Internal Review"
      too on a press): the same box (Rule 13).
    - **"Production"**: select it: "Current Submission Language: English"
      and the box "The Production stage has not yet been initiated.", with
      the "Schedule For Publication" button and the "Participants" list
      (Rules 14, 15a, 16).
    - **The header**: offers "Library" and no "Activity Log" (Actors
      row 7).
    - **Control**: the same account opens the second submission:
      "Submission", "Review Round 1", "Copyediting" and "Production" each
      open without the box, and the header offers "Activity Log" (Actors
      rows 2, 7).

    A preprint server has no assistant role with a stage set, so the
    scenario has no analogue there [OPS1](#ops1).

13. **An assigned Section Editor's header and publication controls** {OJS OMP}

    Given: Section Editor, assigned to a submission in Production.

    - **The header**: open the submission: it offers "Preview", "Activity
      Log" and "Library" (Rule 6; Actors row 7).
    - **The stages**: select "Submission", "Review Round 1" ("External
      Review"'s round on a press), "Copyediting" and "Production" in turn:
      each begins with "Current Submission Language: English" and none
      shows the box "You don't currently have access to that stage of the
      workflow." (Actors row 2; Rules 13, 14).
    - **"Title & Abstract"**: select it: "Current Submission Language:
      English" with "Change", under it "Status: Unscheduled", and no
      region of publishing controls on the right; the "Publication" group
      has no "Create New Version" (Rules 9, 17).
    - **Control**: a Journal Manager on the same submission gets "Create
      New Version" after the node and, on "Title & Abstract", a right-hand
      region offering "Preview" and "Schedule For Publication" ("Publish"
      on a press) (Rules 9, 17).

    On a preprint server the Moderator is this role's analogue; scenario
    10 covers it.

14. **Delete a submission and follow its stale addresses** {OJS OMP OPS}

    Given: Journal Manager, with an Author's submission declined at the
    Submission stage (a preprint declined at Production) and the same
    Author's second, submitted article.

    - **The declined submission**: open it: the bubble reads "Declined"
      and the panel lands on "Submission", striped (on a preprint server
      on "Preprint: Title & Abstract" [OPS2](#ops2); select "Production"
      there); note the address (Rules 5, 11, 12).
    - **"Delete", then "Cancel"**: on the stage that holds the decision
      buttons press "Delete" (where the button is offered is
      *[Submission stage](U25-submission-stage.md#delete)*'s rule): a
      dialog titled "Delete" reads "Are you sure you want to permanently
      delete this submission?" with "Confirm" and then "Cancel" in red;
      press "Cancel": the panel and the "Delete" button stay (Rule 19).
    - **"Delete", then "Confirm"**: the panel closes, the address loses
      the submission part, the list is back refreshed, the submission is
      gone from its "Declined" view, and within a few seconds the side
      menu's "Declined" count is one lower (Rule 19; Side effects).
    - **The author's mailbox**: no email has arrived (Side effects).
    - **The stale dashboard address**: type the address noted: the panel
      with only the submission number in its header and an "Error" dialog
      reading "Invalid submission." with "OK" (Rule 3).
    - **The Author at My Submissions**: the Author types the My Submissions
      address for the deleted submission: the same shell and "Error" /
      "Invalid submission." over My Submissions (Rule 3).
    - **Control**: the Author types the My Submissions address for their
      second submission: the panel opens with its header (Rule 2c).

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — states:
  - the language line gone once a second version exists (Rule 17): a
    second version comes from "Create New Version"
  - a journal's second version beside a published one offering "Publish"
    (Rule 17)
  - publishing again after an unpublish sending the submission straight
    back to Done without "Return to Done" (Rule 18b): scenario 8 stops at
    the unpublish
  - a submission declined in review landing on the round it was declined
    in (Rule 11): scenario 14 declines at the Submission stage
  - the "Status: Scheduled" line and "Unschedule" on a scheduled
    submission's publication page (Rule 17): scenario 8 reads the
    scheduled submission's bubble, header and landing only
  - "Preview" with "Post" on a queued preprint's publication page for the
    Preprint Server Manager (Rule 17): scenario 10 opens it as the
    Moderator
  - a preprint server turning away the older addresses for Submission,
    Review and Copyediting with "A workflow stage was not specified."
    (Rule 2d): no screen links there, so only a typed address reaches it
  - the stage-numbered address with no or an unknown stage number
    answering "A workflow stage was not specified.", and the editorial
    workflow address with no number a bare "404 Not Found" (Rule 2d):
    only a hand-typed address reaches them
- **Nothing new to test**:
  - an unassigned Section Editor at the doors (Actors rows 1–2): refused
    as scenario 3's Copyeditor is for the submission nobody assigned them
    to
  - the app's stage roster, fixed per application (Settings): scenarios
    1, 9 and 10 list each app's stages
- **Register carries it**:
  - A1 (a stage-naming address forwarding to the usual landing entry,
    not the named stage; Rule 2a)
  - A3 (the stage-naming addresses refusing an incomplete submission that
    the dashboard address opens; Rules 2a, 2c; scenario 6 marks it)
  - A4 (a manager who also reviews the submission getting no stage
    panels and a header without contributors; Actors row 2, Rule 4)
  - A5 (a stage-naming address typed with no submission number showing
    a blank page; Rule 2d)
  - A6 (the review stage's own entry: a past round's status, an "Add
    Reviewer" that fails, the round's page left on screen or nothing in
    the author's view; Rules 8a, 8b)
  - A7 (no status box on "Submission" and "Copyediting" in Done for a
    submission published straight from the Submission stage; Rule 15)
  - A8 (a Site Administrator without Journal Manager in the journal:
    every workflow with Section Editor left, none with Reader left;
    Rule 3)
  - A9 (an old-shape address to a deleted submission showing a bare "404
    Not Found"; Rule 19)
  - OMP3 (a press keeping "Identifiers" after the plugin is turned off;
    Settings)
  - OPS2 (a preprint declined at Production landing on "Title &
    Abstract"; Rule 11; scenario 10 marks it)
  - OPS3 (a preprint server's draft bubble reading "Production"; Rule 5;
    scenario 6 marks it)
  - OPS4 (a preprint server's author opening their own draft to an
    "Error" dialog over the panel; Rule 2c)
- **No seed**:
  - the "Payments" dropdown once submission payments are set up, and its
    absence for the Author (Actors row 5, Settings)
  - the deletion refused behind the dialog for a role never shown the
    button (Actors row 11, Rule 19)
  - the "References", "Data" and "Funding" pages following the journal's
    metadata options (Settings, Rule 10)
  - an identifier plugin adding "Identifiers" to the editorial roster
    (Settings)
  - a role group's changed stage set changing access from the next open
    (Settings)
- **Owned by another feature**:
  - changing the submission language, choosing a version and creating
    one (Actors row 12; *Publication metadata*, *Publish, schedule &
    versions*)
  - "OK" leaving the empty shell open behind the "Error" dialog (Rule 3;
    *Submission stage*)
  - the "Delete" button withheld from an assigned Section Editor on a
    declined submission (Actors row 11; *Submission stage*, scenario 6)
  - the contents of the stages and pages, the header windows, the
    decision buttons, the participants, the lists' "View" actions and
    their counts (Cross-feature; *Submission stage*, *Review stage &
    rounds*, *Publication metadata*, *Publish, schedule & versions*,
    *Submissions dashboard*, *My Submissions*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-02), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A5](#a5) | A stage address typed without a submission number shows a blank page, the app failing, instead of a message or a forward | 🐞 | latent · crash: server | claim check (claude), 2026-09-28 — a missing or unknown stage number is now refused; the missing submission number fails |
| [A6](#a6) | Selecting the "Review" entry itself opens a page that belongs to no round: a past round's status, an "Add Reviewer" that fails, the page's script failing | 🐞 | minor · crash: script | claim check (claude), 2026-09-28 — was ❓ |
| [A9](#a9) | An old-shape workflow bookmark to a deleted submission shows a bare "404 Not Found" page instead of a message or a forward | 🐞 | minor | — |
| [OMP3](#omp3) | A press keeps listing the "Identifiers" page, now empty, after the identifier plugin is turned off | 🐞 | minor | — |
| [OPS3](#ops3) | A preprint server's draft is labelled "Production" in the header bubble, not "Incomplete" | 🐞 | minor | — |
| [A1](#a1) | A bookmarked stage address opens the workflow at its usual landing entry, not at the stage the address names | ❓ | minor | — |
| [A2](#a2) | An assigned assistant off the active stage sees the "Publication" heading with nothing under it | ❓ | minor | — |
| [A3](#a3) | An incomplete submission's workflow opens by the dashboard address but is refused by the stage-naming address | ❓ | latent | — |
| [A4](#a4) | A manager who also reviews a submission gets its workflow with every stage marked inaccessible | ❓ | latent | — |
| [A7](#a7) | A submission published straight from the Submission stage shows no status box on "Submission" or "Copyediting" while in Done | ❓ | minor | — |
| [A8](#a8) | A Site Administrator without Journal Manager in the journal opens every submission's workflow with Section Editor left, and none with Reader left | ❓ | latent | claim check (claude), 2026-09-28 — narrowed: a role-less administrator does not occur |
| [OMP2](#omp2) | A press lists the "Media" page without Production access; a journal and a preprint server require it | ❓ | minor | — |
| [OPS2](#ops2) | A declined preprint's workflow lands on "Title & Abstract", not on the stage holding "Revert Decline" | ❓ | minor | — |
| [OPS4](#ops4) | A preprint server's author opening their own draft's panel gets an "Error" dialog over an otherwise open panel | ❓ | minor | — |
| [OMP1](#omp1) | A press adds an Internal Review stage, a Marketing group and Chapters / Publication Formats pages, none described here | ✅ | — | — |
| [OPS1](#ops1) | A preprint server has one stage, no assistant with stage access, and an author's view without a "Workflow" group | ✅ | — | — |
| [A10](#a10) | The discussion attacher's "Select submission stage" list offers a disabled "Done" for every submission | ✅ | retired | jarda.kotesovec 2026-09-14 · confirmed |

### All apps

<a id="a1"></a>
**A1 — Stage addresses forget the stage** · ❓ · minor.
The stage-naming addresses of Rule 2a check that the reader may open the
named stage and then forward to the workflow, which opens at its usual
landing entry (Rule 11). An editor following an old "Copyediting" bookmark
on a submission in review lands on the review round; an address naming a
stage the submission has not reached is accepted and lands the same way.
Expected, from the address: the named stage. On a preprint server, with one
stage, the two cannot be told apart.
Question: should the forward carry the requested stage into the panel?
Lean: yes; the address still names one, and the check already spends the
effort to validate it.
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — An empty "Publication" group** · ❓ · minor.
An assistant assigned to a submission whose role's stage set does not
include the active stage (a Copyeditor while the submission is in Review)
sees the "Publication" group heading in the menu with no version node under
it and no fold control; pressing the heading changes nothing. Expected:
either the node with the pages the role may see, or no group at all.
Question: hide the heading, or list the pages? Lean: hide it while the
group is empty; an empty heading reads as a loading failure.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Two doors, two answers for an incomplete submission** · ❓ · latent.
A Journal Manager who opens an incomplete submission's workflow by the
dashboard address, or by the plain editorial workflow address, gets the
panel (and can, for instance, assign a participant there). The same manager
typing the stage-naming address of Rule 2a is refused with "Workflow access
for incomplete submission is restricted.". The screen is reachable; the
restriction guards only the oldest door.
Question: is workflow access to a draft intended (in which case the older
address should forward too) or not (in which case the other doors should
refuse as well)? Lean: intended; the *Submission wizard* relies on it to
let a manager assign an editor to a draft. The preprint server's author
runs into the same question from the other side [OPS4](#ops4).
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — A reviewing manager gets a workflow with nothing open** · ❓ · latent.
A Journal Manager or Editor who has accepted a review request on a
submission is not shown it under "Assigned to me", but a typed address
still opens its workflow panel. What opens is a shell of the usual screen:
the header lacks the contributors' line and offers "Library" only, every
stage entry shows "You don't currently have access to that stage of the
workflow.", and the "Publication" heading is empty. Their manager rights
are set aside on that submission while they review it. Expected: either
the manager's usual screen, or a refusal that says why.
Question: is the set-aside intended (protecting the review's anonymity)?
Lean: intended in substance; the screen should say so instead of showing a
panel with nothing in it.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — A stage address without a submission number shows a blank page** · 🐞 · latent · crash: server.
Typing a stage-naming address with no submission number in it
(`…/workflow/submission`, `…/workflow/index` and the others Rule 2d lists)
shows an entirely blank page, whoever types it, the Author included: the
app fails with a server error instead of answering. There is no message,
no forward and no way on but retyping. Expected: the bare "404 Not Found"
that the editorial workflow address gives when typed the same way, or the
access-denied page. Only a hand-typed or truncated address reaches it.
Basis: probe, 2026-09-28. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — The "Review" entry opens a broken page that belongs to no round** · 🐞 · minor · crash: script.
Selecting the review stage's own entry ("Review"; "External Review" or
"Internal Review" on a press) instead of a round gives a page that belongs
to no round. The editorial view reads "The submission has been advanced to
the next round of review" while the only round is still active, and its
"Add Reviewer" opens a window reading only "Invalid review round." (Rule
8a). The author's view keeps the round's page under the new heading, or
shows nothing (Rule 8b). Each opening also makes the page's script fail,
with nothing on the page saying so: on a journal in both views, on a press
in the author's view. Expected: the current round, with its "Round N
Status" and buttons, or an entry that only folds and unfolds the rounds.
Re-checked: claim check (claude), 2026-09-28 — was ❓ (which of the two
the entry should do); a defect either way, since its "Add Reviewer" and the
page's script fail.
Basis: probe, 2026-09-28. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Skipped stages show no status after a direct publish** · ❓ · minor.
A submission published straight from the Submission stage (a journal offers
"Schedule For Publication" there) rests in Done. Its "Review" entry then
reads "The Review stage has not yet been initiated.", but "Submission" and
"Copyediting", equally passed over, show no status box at all, while
"Production" reads "Submission published.". The reader gets three different
answers for stages the submission never worked through.
Question: what should a stage the submission skipped by publishing show?
Lean: "has not yet been initiated", as "Review" already says.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — A Site Administrator without Journal Manager opens every workflow, or none** · ❓ · latent.
A journal enrols the Site Administrator who creates it as Journal Manager
and keeps an account's last role, so a Site Administrator with no role
in a journal does not occur. One whose Journal Manager role there
has been ended gets two different answers at the dashboard's address
(Rule 3). Left with Section Editor, they see only their own assignments
listed, yet the address opens any submission's workflow, one nobody
assigned them to included, with a manager's screen: "Activity Log", every
publication page and "Create New Version"; whether it offers a working
"Delete" (Rule 19) is untried. Left with Reader, the address opens no
panel at all, only an "Error" dialog over an empty list
([→ Submissions dashboard](U23-submissions-dashboard.md#a9)). Expected:
one answer, whichever role they keep.
Question: should the Site Administrator role open a journal's workflows
without Journal Manager there? Lean: yes; once any editorial role lets them
in, the workflow already treats them as a manager (so "Delete" too), and
the Reader case is the dashboard refusing before the panel can open.
Basis: probe, 2026-09-28. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — An old bookmark to a deleted submission shows a bare "404 Not Found"** · 🐞 · minor.
A Journal Manager who follows an editorial workflow address or a
stage-naming address (Rule 2a) to a submission that has since been deleted
gets a bare page reading only "404 Not Found": none of the journal's
header or menus, no message, no way on but the browser's back button. The dashboard address for
the same submission answers properly, with the "Invalid submission." dialog
of Rule 3. Expected: the access-denied page, or the forward to the dashboard
and its dialog. Only an old bookmark or an old email link reaches it.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The press's extra stages, group and pages** · ✅ · intended divergence.
A press's "Workflow" group lists five stages, adding "Internal Review"
before "External Review". Its menu carries a third group, "Marketing"
("Audience", "Representatives", "Publication Dates"), listed for every
editorial role that opens the panel, assigned assistants included, and
absent from the author's view; and its version nodes list "Chapters" and
"Publication Formats" in both views. All of these are present on a press by
default and belong to *Internal Review stage*, *Chapters & work type*,
*Publication formats & proof terms* and *ONIX metadata & export* {OMP};
this spec records only that the entries are there. Everything else in this
spec applies to a press unchanged.
Basis: probe. <sup>q</sup>

<a id="omp2"></a>
**OMP2 — "Media" is not production-gated on a press** · ❓ · minor.
On a journal and on a preprint server the "Media" page is listed only for
roles with Production access. On a press it is listed for every editorial
role that reaches the "Publication" group at all, so a Funding Coordinator
assigned during review sees "Media" on a press but not on a journal
("Catalog Entry" and "Permissions & Disclosure" are withheld from that role
on the press as expected).
Question: which is intended? Lean: the press is the odd one out; media
files are production material on every app.
Basis: probe. <sup>[f-omp2](#fn-omp2)</sup>

<a id="omp3"></a>
**OMP3 — "Identifiers" outlives its plugin on a press** · 🐞 · minor.
On a press, once a public identifier plugin has been enabled with its
publication object ticked, the "Identifiers" page stays in every version
node after the plugin is disabled again, and opens as an empty page. On a
journal the same steps remove the page. Expected: the page leaves with the
plugin, as it does on a journal.
Basis: probe. <sup>[f-omp3](#fn-omp3)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — One stage, no assistant access, and an author's view without a "Workflow" group** · ✅ · intended divergence.
A preprint server's workflow has a single stage, Production, so its
"Workflow" group lists that entry alone and the status box never says a
stage has not been initiated. The older addresses naming Submission, Review
or Copyediting are turned away there with "A workflow stage was not
specified." (Rule 2d). No assistant role reaches the workflow: the
Editorial Board Member has no stage set, so its editorial dashboard is
empty and a typed address gives the "Error" dialog of Rule 3, while the
Moderator is assigned to every preprint in their section automatically. The
author's view drops the "Workflow" group entirely: the author's panel opens
on "Preprint: Title & Abstract" and the version node ends with a
"Production Tasks & Discussions" page, which is where the author's
discussions live on a preprint server (*Tasks & discussions*). A journal's
or press's author reaches discussions through the stage entries instead.
Basis: probe. <sup>p</sup>

<a id="ops2"></a>
**OPS2 — A declined preprint lands on its metadata** · ❓ · minor.
Opening a declined preprint's workflow lands on "Preprint: Title &
Abstract", with "Production" striped but not selected. The "Revert Decline"
button sits on the "Production" entry, one click away. On a journal a
declined submission lands on the stage that holds the decision (Rule 11),
because a journal never declines at Production.
Question: should a declined preprint land on "Production"? Lean: yes; the
landing rule treats "no longer queued at Production" as "published or
scheduled" and forgets "declined".
Basis: probe. <sup>[f-ops2](#fn-ops2)</sup>

<a id="ops3"></a>
**OPS3 — A draft's bubble reads "Production"** · 🐞 · minor.
On a preprint server the header bubble of a submission that was never
finished reads "Production", the same as a queued preprint, where a journal
or press reads "Incomplete". The list rows say "Production" too, so nothing
but the "Complete submission" button tells a draft apart; the list side is
*[My Submissions](U22-my-submissions.md#ops1)*' finding. Expected:
"Incomplete", the label Rule 5 gives a draft everywhere else.
Basis: probe. <sup>[f-ops3](#fn-ops3)</sup>

<a id="ops4"></a>
**OPS4 — An author's draft opens with an error on top** · ❓ · minor.
On a preprint server the Author who opens their own unfinished draft's
panel (by its My Submissions address, or an old author-dashboard link) gets
the panel, landing on "Preprint: Title & Abstract", with an "Error" dialog
over it reading "Workflow access for incomplete submission is restricted."
and an "OK" button; after "OK" the panel stays open on the same, empty
page. On a journal or press the same author's draft opens cleanly, on the
Submission stage. The list itself never offers "View" for a draft, so only
a typed or old address reaches this.
Question: the same as [A3](#a3), asked for the author: should a draft's
panel open at all? Lean: refuse the draft cleanly at the door on every app,
or let it open without the error; the half-open panel is the worst of the
three.
Basis: probe. <sup>[f-ops4](#fn-ops4)</sup>

### Retired

<a id="a10"></a>
**A10 — A disabled "Done" in the "Select submission stage" list** · ✅ · retired. Fixed upstream (pkp/ui-library#985, 2026-09-15), verified 2026-09-16 on a reset OJS: the "Select submission stage" list ends with Production, nothing disabled (Rule 18). <sup>[f-a10](#fn-a10)</sup>

> **Reviewed — jarda.kotesovec, 2026-09-14**: confirmed 🐞. Ruling: listing
> Done in the "Select submission stage" list is a bug, to be fixed
> upstream; the entry stays open until the list ends with Production.

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The screen is the Vue `WorkflowPage` (`lib/ui-library/src/pages/workflow/WorkflowPage.vue`, app variants `WorkflowPageOJS/OMP/OPS.vue` registered as `WorkflowPage` in each app's `js/load.js`), opened as a side modal by the dashboard store (`pages/dashboard/dashboardPageStore.js::openWorkflowModal()`; `queryParamsUrl.workflowSubmissionId`), which passes `pageInitConfig` including `dashboardPage` (`EDITORIAL_DASHBOARD` | `MY_SUBMISSIONS`). The dashboard page ops are role-gated in `PKPDashboardHandler::__construct()`: `editorial` for `ROLE_ID_SITE_ADMIN | MANAGER | SUB_EDITOR | ASSISTANT`, `mySubmissions` for `ROLE_ID_AUTHOR`, `reviewAssignments` for `ROLE_ID_REVIEWER`. The panel's own data comes from `GET api/v1/{context}/submissions/{id}` (`PKPSubmissionController::get()`), guarded by `SubmissionAccessPolicy`: Manager/Site Admin any submission; Sub-editor and Assistant only with an accessible stage (`UserAccessibleWorkflowStageRequiredPolicy`); Author only as author (`SubmissionAuthorPolicy`) or with a stage assignment; Reviewer only with a review assignment. Stage sets: `registry/userGroups.xml` per app (`stages=` attribute; OJS copyeditor `4`, layoutEditor/proofreader `5`, funding `1,3`, manager/editor/sectionEditor/guestEditor/author `1,3,4,5`; OMP adds stage `2`; OPS manager, sectionEditor "Moderator" and author `5`, reader and editorialBoardMember none). No app subclasses the dashboard store or the access policies (empty chains). Live-probed 2026-09-02 on OJS, OMP and OPS (`editor.diana`, `manager.maya`, `sectioneditor.ana`, `copyeditor.carla`, `assistant.rita` as Funding Coordinator, `layouteditor.leo`, `author.alex`, `reviewer.julia`, `reader.rosa`): the rows held as written; on OPS `assistant.rita` (Editorial Board Member) got an empty editorial dashboard and, on a typed address, the "Error" dialog of note c, and every seeded Moderator of section PRE appeared on each new preprint's Participants list without being assigned by hand. OPS enrols no Editor account, so its "Editor" rows were driven as the Journal Manager (`manager.maya`) with the Moderator as a second control. Site Administrator with no journal role: live-observed once, 2026-08-02 (the reviewer-management claim check, a journal): refused at the editorial dashboard with "The current role does not have access to this operation."; not reproducible on 2026-09-02 because the context scenario enrols `admin` as manager in every journal it creates and the seeded `admin` is a Journal Manager in every test journal; the reachable states without that role were driven 2026-09-28 (note f-a8). Roles screen live-probed 2026-09-02 (`manager.maya`, Settings › Users & Roles › "Roles", all three apps): column heads "Role Name | Permission level | Submission | Review | Copyediting | Production" (OMP inserts "Internal Review | External Review" for "Review"; OPS "Production" only); the Journal manager, Journal editor and Production editor rows (OMP and OPS the same three manager-level rows) carry no stage checkboxes at all; Section editor, Guest editor, Author and Translator every stage; Copyeditor Copyediting; Layout Editor, Proofreader, Designer and Indexer Production; Funding coordinator Submission and Review (OMP: both reviews); Marketing and sales coordinator Copyediting; OMP's Volume editor every stage and Chapter Author Copyediting and Production; OPS's Moderator and Author Production, Editorial Board Member none.

<a id="fn-b"></a>
**b** — Typed addresses. `PKPWorkflowHandler` (`lib/pkp/pages/workflow/`): `access` (policies `SubmissionRequiredPolicy` + `UserAccessibleWorkflowStageRequiredPolicy(WORKFLOW_TYPE_EDITORIAL)`) and `index` (`SubmissionCompletePolicy` + `WorkflowStageAccessPolicy` with the stage from `identifyStageId()`: the `stageId` user var, else the op name via `WorkflowStageDAO::getIdFromPath()`, else `$args[1]`) both `redirectUrl` to `dashboard/editorial?workflowSubmissionId={id}`; no `workflowMenuKey` is appended (basis of A1), and the dashboard then adds `currentViewId=assigned-to-me` and the landing entry's key itself. The per-stage ops `submission`, `externalReview`, `editorial`, `production` (OMP adds `internalReview`; OPS's role map lists an `editorDecisionActions` op that no handler method implements) call `_redirectToIndex()` → `workflow/index/{id}/{stageId}` → the dashboard. Role assignment in each app's `WorkflowHandler::__construct()`: `SUB_EDITOR, MANAGER, SITE_ADMIN, ASSISTANT` (identical in OJS, OMP, OPS). Denial messages: role gate `user.authorization.roleBasedAccessDenied` "The current role does not have access to this operation."; stage gate `user.authorization.accessibleWorkflowStage` "You don't currently have access to that stage of the workflow."; incomplete `user.authorization.submission.incomplete.workflowAccessRestrict` "Workflow access for incomplete submission is restricted."; the editorial role on the author-dashboard address `user.authorization.submission.noAuthorRole`-shaped text "You do not currently have sufficient privileges to view the submission. Please edit your profile to ensure that you have been granted the appropriate roles under "Register As"." (the body quotes its first sentence). Author dashboard: `PKPAuthorDashboardHandler::submission()` (role `ROLE_ID_AUTHOR` only; `AuthorDashboardAccessPolicy` = `SubmissionAccessPolicy` + `UserAccessibleWorkflowStageRequiredPolicy(WORKFLOW_TYPE_AUTHOR)`) redirects to `dashboard/mySubmissions?workflowSubmissionId={id}`; OMP's subclass pre-assigns internal review rounds then calls the parent; OPS's subclass overrides only `setupTemplate()`/`identifyStageId()`, which the redirect never reaches. Live-probed 2026-09-02 (OJS, OMP, OPS): `workflow/access/{id}`, `workflow/index/{id}/{stage}` and the per-stage forms all forwarded an Editor / Journal Manager to `dashboard/editorial?workflowSubmissionId={id}` with the panel at its usual landing, a stage the submission had not reached and a press's `internalReview` form on a monograph without one accepted alike; Author, Reviewer and Reader (OPS: Reader) on `workflow/access` → `user/authorizationDenied?message=user.authorization.accessibleWorkflowStage`; the author-dashboard address forwarded `author.alex` to My Submissions with the panel open (OPS on "Preprint: Title & Abstract"), gave an Editor and a Journal Manager (OPS: a Moderator) the two-sentence privileges text, and a stranger Author the stage-access text. Drafts (`submitted: false`): the dashboard address and `workflow/access/{id}` opened the panel for `manager.maya` on all three apps (bubble "Incomplete"; OPS "Production"); `workflow/index/{id}/1` (OPS `/5`) → `…message=user.authorization.submission.incomplete.workflowAccessRestrict` (basis of A3, live on all three). OPS author's draft (`dashboard/mySubmissions?workflowSubmissionId={id}`): the panel opened on "Preprint: Title & Abstract" and the page's own form request (`GET …/submissions/{id}/publications/{pid}/_components/titleAbstract`) answered 401 with `user.authorization.submission.incomplete.workflowAccessRestrict`, raised as the "Error" dialog; on OJS and OMP the author's draft landed on the Submission stage, which makes no such request, and no dialog appeared (basis of OPS4). Re-driven 2026-09-28 (Rule 2d; OJS, OMP, OPS, scratch contexts, two runs each; a scratch Journal Manager, Editor, assigned Section Editor / Moderator and Author): `workflow/index/{id}` and `workflow/index/{id}/9` → 200 `user/authorizationDenied?message=user.authorization.workflowStageRequired` "A workflow stage was not specified." for the Journal Manager (`identifyStageId()` yields no valid stage and `WorkflowStageAccessPolicy`'s `WorkflowStageRequiredPolicy` refuses it; `/4`, OPS `/5`, forwarded as control); the per-stage ops and `index` with no id at all → HTTP 500 with an empty document for every role driven (note f-a5); `workflow/access` with no id and `workflow/internalReview` with no id on OJS and OPS → HTTP 404, body `h1` "404 Not Found" only. On OPS, `workflow/submission/{id}`, `externalReview/{id}`, `editorial/{id}` and `index/{id}/1`, `/3`, `/4` → the same `workflowStageRequired` page for the manager, the Moderator and the Author alike, because `WorkflowStageRequiredPolicy` accepts only `Application::getValidStages()`, which on OPS holds Production (and Done) alone (note p); `workflow/internalReview/{id}` → 404 "404 Not Found"; `production/{id}`, `index/{id}/5` and `access/{id}` forwarded the manager and the Moderator, and gave the Author the `accessibleWorkflowStage` page. The 2026-09-02 sentence above that the per-stage forms forwarded on OPS no longer holds for these three forms.

<a id="fn-c"></a>
**c** — A failed submission fetch surfaces through `useFetch` → `modalStore.openDialogNetworkError()`: title `common.error` "Error", message = the API's `errorMessage` field, one "OK" button, over the still-open side modal whose header holds only `submissionId`. Live-probed 2026-09-02 (OJS, OMP, OPS, the browser's own traffic): for an unassigned Section Editor (`sectioneditor.ravi`; OPS: a Moderator outside the preprint's section, `sectioneditor.omar`, and the Editorial Board Member `assistant.rita`) the panel's `GET api/v1/{context}/submissions/{id}` answered 401 `user.authorization.roleBasedAccessDenied` and the dialog read "The current role does not have access to this operation."; for a deleted submission it answered 404 `user.authorization.invalidSubmission`, "Invalid submission."; after "OK" the shell (number, empty heading, empty menu, "Close") stayed. `author.alex` and `reader.rosa` typing `dashboard/editorial?workflowSubmissionId={id}` were redirected to `user/authorizationDenied?message=user.authorization.roleBasedAccessDenied` by the page's role gate before any request. (The API answers 401 where 403 would be usual for a signed-in but refused user; the on-screen message is right.) Live-probed 2026-09-02: `author.alex` typing `dashboard/mySubmissions?workflowSubmissionId={id}` for another author's submission (OJS, OMP, OPS) got the shell with "Error" / "The current role does not have access to this operation." / "OK" over My Submissions (the fetch 401), and for his own preprint after its deletion (OPS) "Error" / "Invalid submission." / "OK"; `reviewer.julia` (the submission's own accepted reviewer) typing the editorial dashboard address got the role-based access-denied page like an Author; a never-existing id (99999) gave "Invalid submission." too.

<a id="fn-d"></a>
**d** — `WorkflowPage.vue`: `#pre-title` = `workflowStore.submissionId` + a big `Spinner` labelled `common.refreshingData` "Refreshing data", visible while `progressStore.screensInProgress` includes `modal_1`; `#title` = `selectedPublication.authorsStringShort` (underlined) with fallback `workflowStore.props.title` (the list's `authorsStringShort`, passed by `openWorkflowModal()` for screen readers); `#description` = `localizeSubmission(selectedPublication.fullTitle)`; `#post-description` = `StageBubble` with `workflowStore.stageLabel`. Live-probed 2026-09-02: header trio verbatim on every panel opened (OJS, OMP, OPS); the spinner showed "Refreshing data" beside the number for a few milliseconds after an "Assign Participant" dialog's "OK" (OJS, OPS, watched with a mutation observer). A reviewing manager's panel (note j, A4) showed the title in the slot where the contributors' line sits and no contributors' line at all (OJS, OMP). Until the publication has loaded, the names line is the list's `authorsStringShort` fallback, so assistive technology can announce the panel as soon as it opens; not observable by eye and not a test step.

<a id="fn-e"></a>
**e** — `useSubmission().getExtendedStage()` / `getExtendedStageLabel()` (`lib/ui-library/src/composables/useSubmission.js`): `DECLINED` when `status === STATUS_DECLINED` (any stage); Submission stage → `submissions.incomplete` "Incomplete" when `submissionProgress`, else `manager.publication.submissionStage` "Submission"; review stages → `submission.stage.internalReviewWithRound` / `submission.stage.externalReviewWithRound` with the last round number (OJS "Review (Round {$round})", OMP "External Review (Round {$round})" / "Internal Review (Round {$round})"); Editing → `submission.copyediting` "Copyediting"; Production → `manager.publication.productionStage` "Production" | `submission.status.scheduled` "Scheduled" | `submission.stage.published` "Published"; `WORKFLOW_STAGE_ID_DONE` → "Published". `submissions.published` ("Posted" on OPS) is a list label, not this bubble's. Live-probed 2026-09-02 (OJS, OMP, OPS; one seed per state): every string above verbatim, including "Published" for a posted preprint and for every seed resting in Done, and "Declined" at Submission (OJS, OMP) and at Production (OPS). The OPS draft read "Production": the "Incomplete" branch is tied to the Submission stage and a preprint server creates every submission at Production (basis of OPS3; the list rows for the same draft read "Production" too).

<a id="fn-f"></a>
**f** — `getHeaderItems()` in `workflowConfigEditorialOJS.js` / `OMP.js` / `OPS.js` (`lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/`): OJS only — `WorkflowPaymentDropdown` when `publicationSettings.submissionPaymentsEnabled` (OJS `DashboardHandler::setupIndex()` from `PaymentManager::publicationEnabled()`, which needs payments enabled, a configured payment plugin and a publication fee above zero); all three — `common.view` "View" when `status === STATUS_PUBLISHED`, `common.preview` "Preview" when not published and `stageId ∈ {EDITING, PRODUCTION}`, both → `redirectToPage(submission.urlPublished)`; `editor.activityLog` "Activity Log" when `permissions.canAccessEditorialHistory` (`useWorkflowPermissions.js`: `MANAGER | SITE_ADMIN | SUB_EDITOR` among the active stage's `currentUserAssignedRoles`); `editor.submissionLibrary` "Library" unconditionally; OMP only — `WorkflowWorkTypeOMP`; then the Return buttons via `isDecisionAvailable()` (note m). The author configs (`workflowConfigAuthorOJS/OMP/OPS.js::getHeaderItems()`) push "Library" only. The three editorial files are forked copies, so each app was driven separately. Live-probed 2026-09-02: per state — queued "Activity Log", "Library"; Review the same; Copyediting and queued Production add "Preview" first; scheduled (OJS) "Preview"; Done "View", "Activity Log", "Library", "Return to Workflow"; declined at Submission no View/Preview, a declined or queued preprint "Preview"; OMP inserts "Monograph" (a menu button with items "Edited Volume", "Monograph") after "Library". Per role on a Copyediting submission: Editor and assigned Section Editor / Moderator "Preview", "Activity Log", "Library"; assigned Copyeditor "Preview", "Library"; Author "Library". "View" and "Preview" opened `urlPublished` in the same tab, the preview page carrying "This is a preview and has not been published."; after "Return to Workflow" the header showed "Preview" (Production) or neither button (Submission) with the version still published (status queued, so the "View" condition fails). "Payments" (OJS scratch journal `u24b7`): absent with payments enabled, a fee of 50 and no manual-payment instructions; present, leftmost, once the instructions were saved; never in the author's header. Live-probed 2026-09-02 (OJS scratch journal `u24cc2`): the fee is set on the journal's own `…/payments` page, tab "Payment Types", section "Author Fees", field "Article Processing Charge"; with it at 0 the header read "Activity Log", "Library", at 50 "Payments", "Activity Log", "Library"; an assigned Copyeditor's header on the same journal read "Payments", "Library", so every editorial-view role gets the dropdown. "Preview" follows the stage, not the reader's access: a Layout Editor (stage set Production) on a Copyediting submission got "Preview", "Library" above the no-access box (OJS, OMP). "Activity Log" per role, all states including Done: Journal Manager, Editor, assigned Section Editor, Guest Editor and Moderator present; Copyeditor, Layout Editor, Proofreader, Funding Coordinator and Author absent; a manager assigned to the submission as Copyeditor (scratch user with both groups, OJS and OMP) got "Library" only, like the assistant.

<a id="fn-g"></a>
**g** — Menu: `useWorkflowNavigationConfigOJS.js::getWorkflowItems()` pushes `workflow_{stageId}` items for `SUBMISSION` (`manager.publication.submissionStage`), `EXTERNAL_REVIEW` (`manager.publication.reviewStage` "Review", with `getReviewItems()` children `workflow_{stageId}_{reviewRoundId}` labelled `workflow.reviewRoundN` "Review Round {$number}"), `EDITING` (`submission.copyediting`), `PRODUCTION` (`manager.publication.productionStage`); `colorStripe` when `activeStage.id === stageId` (round item: also `activeReviewRound.id === reviewRound.id`). `…OMP.js` pushes five (`INTERNAL_REVIEW` `workflow.review.internalReview`, `EXTERNAL_REVIEW` `workflow.review.externalReview` "External Review", each with rounds); `…OPS.js` pushes `PRODUCTION` only and pushes the `workflow` group only when `dashboardPage === EDITORIAL_DASHBOARD`. Heading: `getWorkflowTitle()` = `semicolon(manager.workflow)` + stage label ("Workflow: Submission"; the DOM carries two spaces after the colon, rendered as one); round title `submission.stage.externalReviewWithRound` / `internalReviewWithRound`. Expanded groups at open: OJS `workflow`, `publication`, `marketing`, `workflow_{EXTERNAL_REVIEW}`; OMP adds `workflow_{INTERNAL_REVIEW}`; OPS `workflow`, `publication` (`WorkflowPage{OJS,OMP,OPS}.vue::setExpandedKeys()`). The stage items are pushed unconditionally, so every stage is listed for every role (Rules 7, 13). Live-probed 2026-09-02 (OJS, OMP, OPS; seeds at every stage, two- and three-round seeds): labels, order, stripes and headings verbatim as Rules 7–8 state; a review stage without a round had no sub-entry and no `aria-expanded`; with rounds it was expanded at open on every seed; rounds listed in order with the current round striped together with its stage entry. The stage entry itself (`workflowMenuKey=workflow_3`, `workflow_2` on a press) is selectable: heading "Workflow: Review" / "Workflow: External Review", the group collapses on each press, and the main column showed the language line, a "Status" box "The submission has been advanced to the next round of review" and the round's panels without action buttons, on a one-round seed in Round 1 as on a two-round seed (basis of A6; the entry's key names no round, so the status component takes its past-round branch). Live-probed 2026-09-02: on a press the round-less "Internal Review" entry (a monograph sent straight to External Review) had no `aria-expanded`, no child item and no chevron, while "External Review" had all three; the author's view on a press listed the groups "Workflow" and "Publication" only, "Marketing" being pushed for the editorial dashboard alone (note q). On a review stage the submission had left (Copyediting after three rounds; Production after one), selecting the stage entry gave "Status" / "The submission advanced to the next review round, was accepted, and is currently in the {stage} stage." (note k). The stage entry's "Add Reviewer" window and its author's view (Rules 8a, 8b) were driven 2026-09-28: note f-a6.

<a id="fn-h"></a>
**h** — Publication group: `getMenuItems()` pushes `publication` (`submission.publication`: "Publication" OJS/OMP, "Preprint" OPS) when `dashboardPage ∈ {EDITORIAL_DASHBOARD, MY_SUBMISSIONS}`; `getPublicationVersionItems()` pushes `publication_{id}` per `submission.publications` entry (label `publication.versionString`) with `getPublicationItemsEditorial()` children when `EDITORIAL_DASHBOARD && permissions.canAccessPublication`, `getPublicationItemsAuthor()` children when `MY_SUBMISSIONS`, else nothing (basis of A2: the group is pushed, its `items` empty); then `publication_create_new_version` when `permissions.canPublish`. Page rosters (keys → labels): OJS editorial `titleAbstract` "Title & Abstract", `contributors`, `metadata` ("Metadata"), `citations` "References" if `publicationSettings.supportsCitations`, `dataAvailabilityAndCitation` "Data" if `supportsDataCitations || supportsDataAvailability`, `funding` if `supportsFunders`, `identifiers` if `identifiersEnabled`, `jats` "JATS XML", then under `permissions.canAccessProduction`: `bodyText`, `galleys`, `media`, `license` "Permissions & Disclosure", `issue` "Publication Settings". OMP editorial: `titleAbstract`, `contributors`, `chapters`, `metadata`, `publicationFormats`, `media` (ungated, basis of OMP2), `citations`/`dataAvailabilityAndCitation`/`funding`/`identifiers` as above, then gated `catalogEntry` "Catalog Entry", `license`. OPS editorial: as OJS minus `jats`/`bodyText`/`issue`, plus gated `preprintEntry` "Preprint entry". Author rosters: OJS `titleAbstract`, `contributors`, `metadata`, [`citations`], [`dataAvailabilityAndCitation`], [`funding`], `galleys`, `media`; OMP `titleAbstract`, `contributors`, `chapters`, `metadata`, `publicationFormats`, `media`, [`citations`], [`data`], [`funding`]; OPS = OJS + `discussions` ("Production Tasks & Discussions"). Settings flags come from `PKPDashboardHandler::index()` (`supportsCitations|supportsDataCitations|supportsDataAvailability|supportsFunders|identifiersEnabled` from the context's `citations`, `dataCitations`, `dataAvailability`, `funders` settings and the `pubIds` plugin registry). Live-probed 2026-09-02 (OJS, OMP, OPS): every roster above verbatim, in order, for the Journal Manager, Editor, Moderator, assigned Copyeditor (at Copyediting), assigned Funding Coordinator (in Review: OJS "…References", "Funding", "JATS XML"; OMP "…Publication Formats", "Media", "References", "Funding") and Author; version labels "Unassigned version (2026-09-02)" before publishing, "Version of Record 1.0" / "1.1" after (OPS "Author Original 1.0" / "1.1"); "Create New Version" last in the group for the Journal Manager and Editor, absent for the Moderator, the Copyeditor, the Funding Coordinator and the Author. Scratch-context defaults: references and funders on, data availability and data citations off, the URN plugin off; each option removed exactly its page when turned off; enabling URN with `enablePublicationURN` ticked added "Identifiers" (OJS, OMP); disabling it removed the page on OJS and left it on OMP, opening as "Publication: Identifiers" with an empty main column, in a fresh browser too (basis of OMP3; the flag that lists the page evidently stays set for the press, not traced further); OPS ships no `plugins/pubIds` directory. The empty "Publication" heading (A2): live on OJS and OMP for `copyeditor.carla` in Review and for the reviewing manager of note j — no node, no chevron, no `aria-expanded`, a press with the same address unchanged. Done: `Schema::getPropertyStages()`'s synthetic Done entry carries the union of the reader's assigned roles across the app stages, so `canAccessPublication` is true there for every assigned editorial role. Live-probed 2026-09-02 (OJS, OMP): a Layout Editor assigned to a submission resting in Done saw the version node with every page, "Body Text", "Galleys", "Media", "Permissions & Disclosure", "Publication Settings" included; a Funding Coordinator in Done saw "Title & Abstract", "Contributors", "Metadata", "References", "Funding", "JATS XML" (OMP "… Publication Formats", "Media", "References", "Funding") and no production page; the same two roles in Review and Copyediting saw the empty heading. Metadata options (OJS scratch `u24cc2`, Settings › Workflow › Submission › Metadata, labels "Enable references metadata", "Enable data availability statement metadata", "Enable data citation metadata", "Enable funder metadata"): "Enable data citation metadata" alone, or "Enable data availability statement metadata" alone, listed "Data" between "References" and "Funding"; both off removed it. URN plugin settings form (OJS and OMP scratch): section "Journal Content" ("Press Content"), "Please select the publishing objects that will have Uniform Resource Names (URN) assigned:", checkboxes "Issues", "Articles", "Galleys" ("Monographs", "Chapters", "Publication Formats", "Files"); "Articles" / "Monographs" (`enablePublicationURN`) is the one that lists the page, with "URN Prefix" and a namespace filled as the form requires.

<a id="fn-i"></a>
**i** — `useWorkflowMenu.js`: on first submission load, if `queryParamsUrl.workflowMenuKey` names an existing item it is selected, else `getInitialSelectionItemKey()`; every selection change writes `queryParamsUrl.workflowMenuKey`; `openWorkflowModal()`'s `onClose` nulls both `workflowSubmissionId` and `workflowMenuKey` and refetches the list. `getInitialSelectionItemKey()` (OJS/OMP, identical): review stage → `workflow_{stageId}_{currentReviewRound.id}`; `PRODUCTION && status !== STATUS_QUEUED` → `publication_{latest.id}_titleAbstract`; `DONE` → published ? Title & Abstract : `workflow_{PRODUCTION}`; else `workflow_{stageId}`. OPS: `MY_SUBMISSIONS` → always Title & Abstract; then the Production/Done branches as OJS (a declined preprint is `PRODUCTION` with `STATUS_DECLINED ≠ QUEUED` → Title & Abstract, basis of OPS2). Live-probed 2026-09-02 (OJS, OMP, OPS; one seed per state): queued → the stage; Round 1 / Round 2 / Round 3 → that round; Copyediting and queued Production → the stage; scheduled (OJS) → "Title & Abstract" with "Production" striped; Done → "Title & Abstract" of the newest node, no stripe; declined at Submission → "Submission" striped; declined preprint → "Title & Abstract" with "Production" striped; the preprint author → "Title & Abstract" always. The `DONE`-but-unpublished branch was not reachable: unpublishing from Done (or after "Return to Workflow") moved the submission out of Done in the same moment (note m) and the reopened panel landed on that stage ("Submission" for seeds published from Submission, "Production" for seeds that passed through Production). Deep links: `workflowMenuKey=publication_{id}_license` typed by the Author opened on "Submission" and the address was rewritten to `workflow_1`; `workflowMenuKey=nonsense` opened at the landing entry and was rewritten to it; `workflowMenuKey=workflow_3` typed by an assigned Copyeditor opened the "Review" entry with the no-access box and kept the key (OJS, OMP). Live-probed 2026-09-02: a submission declined in review landed on the round it was declined in ("Review Round 1" selected and striped, "Workflow: Review (Round 1)", "Round 1 Status" / "Submission declined."; OMP `workflow_2_{round}`, "Workflow: Internal Review (Round 1)"); a Layout Editor typing a past round's key (`workflow_3_{round}`, OJS and OMP) got that round selected, its heading and the no-access box, key kept; the Author typing Round 1's key on a three-round submission got "Review Round 1" with "Status" / "The submission has been advanced to the next round of review" and the round's "Revisions Uploaded" and "Review Tasks & Discussions" panels; a Layout Editor typing `publication_{id}_license` while their "Publication" group was empty, and the OPS Author typing `workflow_5`, fell back to the landing entry with the address rewritten.

<a id="fn-j"></a>
**j** — Page-side gate: `useWorkflowPermissions.js` builds `accessibleStages` = the ids of `submission.stages[]` whose `currentUserAssignedRoles` is non-empty; `canAccessPublication` = an editorial role (`SITE_ADMIN, MANAGER, SUB_EDITOR, ASSISTANT`, `composables/useCurrentUser.js`) on the **active** stage; `canAccessProduction` = additionally an editorial role on the Production stage; `canPublish` = `MANAGER | SITE_ADMIN` on Production and not `currentUserCanRecommendOnly`. `stages[].currentUserAssignedRoles` is mapped server-side by `PKP\submission\maps\Schema::getPropertyStages()`: for each of the user's stage assignments whose group membership is current, the group's `userGroupStages` receive the group's `roleId`; if the user has **no** such assignment and holds `MANAGER | SITE_ADMIN`, every stage receives those roles, **unless** the user has an undeclined, uncancelled review assignment on the submission (basis of A4). Server-side page gate: `Repo::user()->getAccessibleWorkflowStages()`: stage assignments whose group role the user still holds → the group's stages; empty and manager/admin → every app stage (`Application::getApplicationStages()`; OJS 1,3,4,5; OMP 1,2,3,4,5; OPS 5; since pkp/pkp-lib#13109, 2026-09-08, each list ended with Done, 6, until pkp/pkp-lib#13312 took it out again on 2026-09-12: note m). The common stage config (`WorkflowConfig.common.getPrimaryItems|getSecondaryItems|getActionItems` in `workflowConfigEditorialOJS.js` / `workflowConfigAuthorOJS.js`) returns `shouldContinue: false` when `!permissions.accessibleStages.includes(selectedStageId)`, with the primary column holding one `WorkflowPrimaryBasicMetadata` box whose body is `user.authorization.accessibleWorkflowStage` and the other columns empty; OMP's and OPS's configs `deepMerge` the OJS config first, so the gate survives there. Live-probed 2026-09-02 (OJS, OMP): `copyeditor.carla` assigned on a submission in Review got the bare box (a `p` with no `h3`, no language line, no columns) on "Submission", "Review", "Review Round 1", "Production" and, on a press, "Internal Review", and the language line plus "not yet been initiated" on "Copyediting", with a read-only "Participants" list (no "Assign"); `author.alex` on their own submission never saw the box on any stage. Reviewing manager (A4): scratch contexts `u24d8` with a user holding manager and reviewer roles, accepted on one seed: `dashboard/editorial` listed the submission under "My Assignments as Reviewer" and not under "Assigned to me"; the typed address opened the panel (200) with header "Library" only and no contributors' line, every stage entry the bare box, "Publication" empty; the control seed (no review assignment) opened the full manager's screen. Not runnable on OPS (no reviewer role). Live-probed 2026-09-02: a scratch user holding the manager group and the Layout Editor group, assigned as Layout Editor to a submission in Review (OJS, OMP), got the no-access box on Submission, Review, its round and Copyediting (OMP also both review stages) and opened Production ("The Production stage has not yet been initiated.", "Schedule For Publication", "Participants"); `copyeditor.carla`, `layouteditor.leo` and `proofreader.pia` assigned to a submission at the Submission stage all got the box on "Submission", while `assistant.rita` (Funding Coordinator) got the stage's panels ("Submission Files", "Desk Review Tasks & Discussions", "Participants"). Roles flip (OJS scratch `u24cc2`, Settings › Users & Roles › "Roles" › Copyeditor › "Edit", section "Stage Assignment", checkboxes "Submission", "Review", "Copyediting", "Production", "OK"): with "Review" ticked, the same assigned Copyeditor's next open of a Review Round 1 submission showed the language line, "Round 1 Status" / "Awaiting responses from reviewers.", the review panels and a read-only "Participants" list, no action buttons; unticked again, the no-access box was back.

<a id="fn-k"></a>
**k** — Common primary items (`common.getPrimaryItems`): first `WorkflowChangeSubmissionLanguage` with `canChangeSubmissionLanguage: false` (`components/publication/WorkflowChangeSubmissionLanguage.vue`: `submission.list.changeSubmissionLanguage.currentLanguage` "Current Submission Language:" + `submission.metadataLocales[submission.locale]`; the "Change" link renders only when the prop is true), then `WorkflowSubmissionStatus`, and `shouldContinue = !hasNotSubmissionStartedStage()` (`useSubmission.js`: review stages → no rounds for the stage; others → `submission.stageId < stageId`), which hides the stage's own primary items; the secondary and action getters run regardless, gating on their own state (hence the "Participants" column and Production's "Schedule For Publication" on a not-yet-reached stage). `WorkflowSubmissionStatus.vue` `message`: not started → heading `common.status` "Status", body `workflow.stageNotStarted` "The {$stage} stage has not yet been initiated."; `messagingStageId(submission.stageId) > selectedStageId` (Done maps to the stage's `returnStageId`) → `workflow.submissionInFutureStage` "The submission is currently in the {$stage} stage." or, for a round below the current round, `workflow.submissionNextReviewRoundInFutureStage` "The submission advanced to the next review round, was accepted, and is currently in the {$stage} stage."; active review stage → heading `notification.type.roundStatusTitle` "Round {$round} Status" with `workflow.submissionInNextReviewRound` "The submission has been advanced to the next round of review" for a past round (or a selection naming no round, note g), else the minimum-reviews lines and `currentReviewRound.status`; Production and `STATUS_PUBLISHED` → `editor.submission.workflowDecision.submission.published` "Submission published."; else `null`. Live-probed 2026-09-02 (OJS, OMP, OPS): every sentence verbatim on seeds in Round 1, Copyediting, queued Production and Done, on two- and three-round seeds (rounds below the last "advanced … accepted", the last round "currently in"), on a press's skipped Internal Review ("not yet been initiated" after the submission moved on) and on a queued preprint (no box); the past round's box on a past stage was headed "Status"; the active Copyediting and Production stages showed the stage's own notice in the slot ("Assign a copyeditor using the Assign link in the Participants list."; OMP Production "Awaiting approval."). Not-yet-reached stages kept the "Participants" column (OJS, OMP; absent only on OMP's Internal Review) and Production its "Schedule For Publication" button. A7: on the seed published straight from Submission (`published: true`, no decisions, resting in Done), "Submission" and "Copyediting" showed no box while "Review" read "not yet been initiated" and "Production" "Submission published." (OJS, OMP): with the stage at Done (6) neither "not started" (`6 < 4` is false) nor "future" (the return stage, Submission, is not above Copyediting) fires for Copyediting, while Review's own no-round test still does. Live-probed 2026-09-02 (OJS, OMP, OPS): while a submission that passed through Production rests in Done, its "Submission" and "Copyediting" entries and every past round read "… currently in the Production stage." (`returnStageId`); on a review stage the submission had left, the stage entry itself ("Review" / "External Review") read "The submission advanced to the next review round, was accepted, and is currently in the {stage} stage." on a one-round submission as on a three-round one, the rounds keeping their split (rounds below the last "advanced …", the last "currently in"); one check that read every round through the stage entry's key saw "advanced …" on all of them, and the per-round readings above, taken at each round's own key, are the ones the rule states. No box: a submission declined at Submission ("Submission" with its panels and "Revert Decline" / "Delete"), a declined preprint's "Production", and the stage a submission was just returned to from Done (Production, or Submission for one published from there). Author: `author.alex` (OJS, OMP, every stage, reached or not) saw one column and never a "Participants" list (`workflow-secondary-items` absent in the author's view); a press's unreached "Production" showed "Schedule For Publication" like a journal's.

<a id="fn-l"></a>
**l** — `WorkflowPage.vue` `#publication-controls-left` (`data-cy="workflow-controls-left"`) and `#publication-controls-right` (`data-cy="workflow-controls-right"`), each rendered only when its item list is non-empty. `PublicationConfig.common.getPrimaryControlsLeft` (editorial OJS): `WorkflowChangeSubmissionLanguage` with `permissions.canChangeSubmissionLanguage` (= `canPublish || canEditPublication`) while `status !== STATUS_PUBLISHED && publications.length < 2`, then `WorkflowPublicationVersionControl`, which renders as the read-only "Status:" line with a coloured dot (`Unscheduled | Scheduled | Published | Unpublished`; OPS `Unposted | Posted`), not a switcher; `getPrimaryControlsRight`: `[]` unless `permissions.canPublish` (note j: Manager or Site Administrator on Production), then the Preview / Schedule For Publication / Publish / Post / Unschedule / Unpublish / Unpost buttons by status (*Publish, schedule & versions*). Author OJS/OMP `getPrimaryControlsLeft`: the version control only; author OPS: `[WorkflowPublicationVersionControl, WorkflowPublicationRelationDropdownOPS]` as one row; editorial OPS adds the relation dropdown after the version control. `common.getPrimaryItems` prepends `WorkflowPublicationEditWarning` on a published version. Live-probed 2026-09-02 (OJS, OMP, OPS) on "Title & Abstract": Editor / Journal Manager on an unpublished single version — language line with "Change", "Status: Unscheduled" (OPS "Unposted" + "Relations"), right "Preview", "Schedule For Publication" / "Publish" / "Post"; assigned Copyeditor — language line without "Change", status line, no right region; Moderator — language line with "Change", status line, "Relations", no right region; Author — no language line, status line (OPS + "Relations"), no right region; Journal Manager on a published version, and on either node once a second version existed — no language line at all, "Status: Published" / "Unpublished" (OPS "Posted"), right "Unpublish" / "Unpost" or "Preview", "Publish". Live-probed 2026-09-02, more cases: an assigned Section Editor (`sectioneditor.ana`, OJS, Production) and the OPS Moderator on a queued and on a declined preprint got the language line with "Change" ("Current Submission Language: English Change Status: Unposted Relations"); a Copyeditor, Layout Editor and Funding Coordinator the line without it; after "Return to Workflow" (OJS, OMP, OPS; submission back in Production, version still published) "Title & Abstract" showed "Current Submission Language: English" + "Change" above "Status: Published" (`status !== STATUS_PUBLISHED` is the submission's status). "Status:" values seen: "Unscheduled", "Published", "Unpublished" (OJS/OMP: a never-published second version; OPS: "Author Original 1.0" after being posted and unposted), "Unposted", "Posted"; "Scheduled" and "Unschedule" were not reached (no scheduling driven). Right region: OJS in Production "Preview", "Schedule For Publication"; OJS in Review "Schedule For Publication" only, no "Preview"; OMP in Production "Preview", "Publish", in Review "Publish" only; OPS queued "Preview", "Post"; a journal's second version beside a published one "Preview", "Publish"; present for the Journal Manager and Editor, absent for the assigned Section Editor (OJS, OMP), the Moderator, the Copyeditor, Layout Editor, Funding Coordinator and Author (the Guest Editor shares the Section Editor's rights and was seen without "Create New Version"). Both "Preview" buttons, the header's and the region's, showed together on a Production-stage "Title & Abstract".

<a id="fn-m"></a>
**m** — Done: `WORKFLOW_STAGE_ID_DONE` (= 6, `lib/pkp/classes/core/PKPApplication.php`, label `submission.done` "Done"; excluded from `getApplicationStages()` until 2026-09-08, and since pkp/pkp-lib#13109 (ojs `3bfe1f9f68` / omp `5d2b2fea7` / ops `16bbd9b90e`) listed after Production by every app's `getApplicationStages()`; removed again by pkp/pkp-lib#13312 "Use DONE stage only for auth checks" (lib/pkp `65901c4f7a` + `716419c770`, merge `0356122fdc`; ojs `0dbb274a45` / omp `ce63a5cd8` / ops `97d8a0d2e8`, merged 2026-09-12), which adds `PKPApplication::getNonWorkflowStages()` = `[WORKFLOW_STAGE_ID_DONE]` and `getValidStages()` = the app stages plus Done, the list `WorkflowStageRequiredPolicy` and `Schema::getPropertyStages()` iterate since). `ApplyDoneWorkflowStage` listener (`lib/pkp/classes/observers/listeners/`) on `PublicationPublished` / `PublicationUnpublished`: a published version of record (`VersionStage::finalVersionStage()`) and stage ≠ Done → records `Decision::MOVE_TO_DONE` (`MoveToDone`: new stage Done, status published; log `editor.submission.decision.moveToDone.log` "{$editorName} moved this submission to the Done stage."); zero published versions of record and stage = Done → records `RETURN_TO_WORKFLOW`. `Schema::getPropertyStages()` adds a synthetic Done stage entry (`returnStageId` = the stage of the latest `MOVE_TO_DONE`/`RETURN_TO_DONE` decision, default Production) so no app stage is active (no stripe); that block is untouched by the 2026-09-08 change (its comment still says Done is excluded from `getApplicationStages()`, true again since 2026-09-12), and since then every submission's `stages` carries a Done entry from the app list as well: live 2026-09-09 (OJS), a submission in the Submission stage answered five `stages` entries, the fifth `{id: 6, label: "Done", isActiveStage: false}`, and the discussion attacher's "Select submission stage" listed a disabled "Done". Re-run 2026-09-14 on a reset OJS at the tips carrying pkp/pkp-lib#13312 (ojs `f0cde27fda`, lib/pkp `1967e76f38`; the kept reproduction `shared/playwright/checks/sync/pkp-lib-13109/regressions.js`, outputs `.reports/sync/s14-13109/`): `GET submissions/{id}` still answers five `stages` entries, the fifth `{id: 6, label: "Done", isActiveStage: false}`, now from `getValidStages()` by design (the synthetic Done block for a submission resting in Done unchanged), the picker still lists Submission, Review, Copyediting, Production and a disabled "Done"; Statistics › Editorial Activity lists no "Done" row any more and the Roles grid no "Done" column (note p). Buttons: `addItemIf(... isDecisionAvailable(submission, DECISION_RETURN_TO_WORKFLOW | DECISION_RETURN_TO_DONE))`; `availableEditorialDecisions` is built per app by `APP\submission\maps\Schema::getAvailableEditorialDecisions()` for the active stage: Done → `[ReturnToWorkflow]` when `canMakeDecision`; any other active stage → `ReturnToDone` when `canMakeDecision`, `Repo::decision()->hasDoneHistory()` and a `STATUS_PUBLISHED` publication exists (three forked copies, identical Done branches). Actions (`useWorkflowActions.js`): `workflowDecisionReturnToWorkflow` → dialog `editor.submission.decision.returnToWorkflow` / "Return this submission to the workflow stage it occupied before it was moved to Done.", Confirm (primary) / Cancel, then `POST submissions/{id}/decisions {decision: DECISION_RETURN_TO_WORKFLOW}` (`ReturnToWorkflow::getNewStageId()` = the stage of the latest into-Done decision, else Production; status `STATUS_QUEUED`; log "{$editorName} returned this submission to the workflow."); `workflowDecisionReturnToDone` → dialog "Return this submission to the Done stage.", then `POST submissions/{id}/returnToDone` (`PKPSubmissionController::returnToDone()`; records `RETURN_TO_DONE`, stage Done, status published; log "{$editorName} returned this submission to the Done stage."). Both refetch. Live-probed 2026-09-02 (OJS, OMP, OPS, `manager.maya`, `editor.diana`, `sectioneditor.ana`): the seeded `published: true` submissions rest in Done on every app (bubble "Published", no stripe, "View" and "Return to Workflow", "Production" reading "Status" / "Submission published."; version "Version of Record 1.0", OPS "Author Original 1.0"); both dialogs verbatim with "Confirm" filled first and "Cancel" second; "Cancel" changed nothing; "Confirm" gave bubble "Production", "Preview" + "Return to Done", "Production" without a box, and the log row "Maya Manager returned this submission to the workflow." (seed passed through Production; on OJS and OMP a seed published straight from Submission returned to "Submission" with neither "View" nor "Preview" and "Production" reading "not yet been initiated"; OPS always to Production); "Return to Done" restored Done and logged "… returned this submission to the Done stage.". Unpublishing (from Done or after a return) removed "Return to Done" and Done in the same moment; publishing again moved the submission straight back to Done. Per role in Done: assigned Section Editor / Moderator "View", "Activity Log", "Library", "Return to Workflow"; assigned Layout Editor "View", "Library"; Author "Library"; after the return the Section Editor / Moderator "Preview", "Activity Log", "Library", "Return to Done", the Layout Editor "Preview", "Library". Both dialogs style "Cancel" in red (`text-negative`) like the Delete dialog's. Email: a Mailpit search for the submission's title and for `author.alex`'s address found 0 messages before and 0 after each return on all three apps; no positive control exists (the seeded submissions send no mail at all), so the check would be settled by returning a submission published through the screens, whose publish mail is the control; the decision types carry no email template. A Section Editor whose assignment is limited to recommendations was not driven; the row's wording follows the glossary's deciding-editor definition and `canMakeDecision`.

<a id="fn-n"></a>
**n** — `useWorkflowActions.js::workflowDeleteSubmission()`: dialog `common.delete` "Delete", message `editor.submissionArchive.confirmDelete` "Are you sure you want to permanently delete this submission?", "Confirm" (primary) / "Cancel", `modalStyle: 'negative'`; confirm → `DELETE api/v1/{context}/_submissions/{id}` then `store.closeWorkflowModal()` (the dashboard's `onClose` refetches the list). The endpoint (`PKPBackendSubmissionsController::delete()`) enforces `Repo::submission()->canCurrentUserDelete()` = Manager (context) or Site Administrator, or the Author of an incomplete submission; refusal text `api.submissions.403.unauthorizedDeleteSubmission` "You do not have permission to delete this submission.". The button offers: the Submission and External Review stage blocks (OJS, OMP) and the Production block (OPS) of the editorial configs, each guarded by the stage's revert-decline availability **and** `hasCurrentUserAtLeastOneAssignedRoleInAnyStage(submission, [MANAGER, SITE_ADMIN])` (the stage specs'). Live-probed 2026-09-02 (OJS, OMP, OPS, `manager.maya` on a declined seed): dialog verbatim, "Confirm" filled first, "Cancel" in negative (red) text second; "Cancel" kept the panel, address and button; "Confirm" closed the panel, dropped `workflowSubmissionId` from the address, refreshed the list, the request answering 200, and the submission was gone from "Declined"; the stale address then gave "Error" / "Invalid submission." over the shell (note c). `sectioneditor.ana` (assigned Section Editor; OPS Moderator) was not offered "Delete" on any app; `editor.diana` (Journal editor / Press editor, a `ROLE_ID_MANAGER` group) on a declined submission (OJS, OMP) was offered "Schedule For Publication" (OJS), "Revert Decline", "Delete", and the same dialog opened ("Cancel" kept the panel and the button); `admin` confirmed one on OPS. The browser sends the delete as `POST …/api/v1/_submissions/{id}` (the DELETE route by method override), answered 200. A delete confirmed from within the "Declined" view removed the row and lowered the heading ("Declined (8)" → "Declined (7)", OPS). The side-menu counts followed at once ("6 Declined" → "5 Declined" before any reload, all three apps; a `viewsCount` request fires on the panel's close, throttled to once per five seconds, so a count read inside that window is up to five seconds stale). Email: Mailpit 0 before and 0 after on all three apps, no positive control (note m). Stale addresses after the delete: the dashboard address gave the "Error" / "Invalid submission." shell (note c); `workflow/access/{id}` answered HTTP 404 with the bare body "404 Not Found" (basis of A9).

<a id="fn-o"></a>
**o** — The omnibus API controller `PKP\API\v1\submissions\PKPSubmissionController` (`lib/pkp/api/v1/submissions/`, base `submissions`) is homed here because every workflow surface reads through it; each endpoint cluster is described by the feature that drives it. Route role gates (`getGroupRoutes()`): reads (`GET /`, `{id}`, `{id}/publications[/{pid}]`, contributors) — Manager, Sub-editor, Assistant, Reviewer, Author, plus `SubmissionAccessPolicy` per note a; participants — Manager, Sub-editor, Assistant; decisions, `returnToDone`, `DELETE {id}`, `changeLocale`, `version`, `nextAvailableVersion` — Manager, Sub-editor; publication add/version/publish/unpublish/delete — Manager, Sub-editor, Assistant (`StageRolePolicy` on Production for the publish set); publication edit and contributor writes and the metadata/title/data/change-language form components — Manager, Sub-editor, Assistant, Author (`PublicationWritePolicy`; `PublicationAccessPolicy` for the forms); identifier and permission-disclosure forms — Manager, Sub-editor, Assistant; `PUT {id}`, `saveForLater`, `submit` — Manager, Sub-editor, Author; `POST /` — any signed-in user (auto-enrolled as Author). App subclasses (`APP\API\v1\submissions\SubmissionController`) add OJS issue-assignment/payment forms, OMP audience/catalog/publication-dates forms, and OPS `relate` plus author-inclusive re-registrations of the publish set — each cited by its owning spec. Consumers: *Submission wizard* (submit/saveForLater/add), *Editorial decision recording* (decisions), *Publication metadata* (publication forms, changeLocale), *Contributors & affiliations* (contributors), *Publish, schedule & versions* (publish/unpublish/version).

<a id="fn-p"></a>
**p** — OPS: `ops/classes/core/Application::getApplicationStages()` = `[WORKFLOW_STAGE_ID_PRODUCTION]` until 2026-09-08, and `[WORKFLOW_STAGE_ID_PRODUCTION, WORKFLOW_STAGE_ID_DONE]` from pkp/pkp-lib#13109 (ops `16bbd9b90e`) until 2026-09-12, and `[WORKFLOW_STAGE_ID_PRODUCTION]` again since pkp/pkp-lib#13312 (ops `97d8a0d2e8`, lib/pkp `65901c4f7a`; Done kept in `PKPApplication::getValidStages()` for the stage-access policy and the `stages` property, note m), none of which touches the menu, because as it was because `useWorkflowNavigationConfigOPS.js`, not the stage list, decides what it shows: it pushes the `workflow` group only for `EDITORIAL_DASHBOARD` and the Production item alone; `getPublicationItemsAuthor()` ends with `discussions` (`submission.queries.production` "Production Tasks & Discussions", rendered by `workflowConfigAuthorOPS.js` `PublicationConfig.discussions` → `DiscussionManager` on the Production stage); `getInitialSelectionItemKey()` returns Title & Abstract for `MY_SUBMISSIONS`. `ops/registry/userGroups.xml`: manager, sectionEditor ("Moderator") and author carry `stages="5,6"` since ops `16bbd9b90e` (`stages="5"` before; on OJS and OMP the same commit set gives stage 6 to editor, productionEditor, sectionEditor, designer, indexer, layoutEditor, proofreader, author and translator, on OJS also guestEditor, on OMP also volumeEditor and chapterAuthor); reader and editorialBoardMember none. A fresh install grants no role stage 6 whatever the registry says, because `Repo::userGroup()->installSettings()` keeps registry stages only up to `WORKFLOW_STAGE_ID_PRODUCTION` (live 2026-09-09, OJS: every "Done" box in Settings › Users & Roles › Roles unchecked for every role), so the grant reached only upgraded installs, through the migration `I13109_PermitPublishedMetadataEdit` — corrected 2026-09-12 by pkp/pkp-lib#13312 (lib/pkp `65901c4f7a`): `installSettings()` now keeps registry stages up to `WORKFLOW_STAGE_ID_DONE`, and the databases installed 2026-09-14 hold the grant: OJS `publicknowledge` 10 roles with stage 6 (Author, Designer, Guest editor, Indexer, Journal editor, Layout Editor, Production editor, Proofreader, Section editor, Translator), each scratch journal the same 10; OMP 11 `user_group_stage` rows with stage 6; OPS 3 (manager, Moderator, author); the Roles grid no longer shows a "Done" column (OJS 2026-09-14, headers "Role Name", "Permission level", "Submission", "Review", "Copyediting", "Production"), so the grant is invisible there. OPS's `Schema::getAvailableEditorialDecisions()` returns `[]` outside Production/Done. Live-probed 2026-09-02: Moderator `sectioneditor.ana` on a queued preprint — "Workflow" › "Production" only (striped), no status box, buttons "Add", "Post the preprint", "Decline Submission", "Assign", "Preprint" node ending "Permissions & Disclosure", "Preprint entry", no "Create New Version"; `author.alex` on a posted preprint — no "Workflow" group, node "Author Original 1.0" ending "Production Tasks & Discussions", landing "Preprint: Title & Abstract"; `assistant.rita` (Editorial Board Member) — an editorial dashboard with every count at 0 and, on a typed address, the "Error" dialog of note c; every new preprint's Participants list carried both seeded Moderators of its section.

<a id="fn-q"></a>
**q** — OMP: `omp/classes/core/Application::getApplicationStages()` adds `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` (= 2); `useWorkflowNavigationConfigOMP.js` pushes the five stage items, a `marketing` group (`settings.libraryFiles.category.marketing` "Marketing"; `audience`, `representatives`, `publicationDates`) for the editorial dashboard only, and the `chapters` / `publicationFormats` pages in both rosters; `omp/pages/workflow/WorkflowHandler.php` adds the `internalReview` op. All belong to *Internal Review stage*, *Chapters & work type*, *Publication formats & proof terms* and *ONIX metadata & export*. Live-probed 2026-09-02: the five entries, the "Marketing" group ("Audience", "Representatives", "Publication Dates") for the Press Editor, an assigned Funding Coordinator and an assigned Copyeditor alike, absent for the Author; "Chapters" and "Publication Formats" in both rosters.

<a id="fn-s"></a>
**s** — Seeding uses the seeded test journal/press/server (`publicknowledge`) and roster accounts (passwords = username doubled), scratch submissions via the scenario submission endpoint, submitter `author.alex`. Scenario 1: `editor.diana` (OPS: `manager.maya`, since OPS enrols no Editor), a fresh `submitted: true` submission. 2: `decisions: ['sendExternalReview']` and one `reviewRounds` entry (OMP: the external stage; add `sendInternalReview` seeds for the press's other stage). 3: the scenario-2 shape plus `participants: [{username: 'copyeditor.carla', role: 'copyeditor'}]` (the seed writes the assignment row the Assign form would; the group's stage set, Copyediting only, drives the gate); control `editor.diana`. 4: the scenario-2 shape plus `participants: [{username: 'assistant.rita', role: 'funding'}]` (Funding Coordinator: stages Submission and Review on OJS/OMP); control `manager.maya`; OPS has no `funding` key. 5–6: `editor.diana` and `author.alex` on the scenario-1 submission; the typed addresses are `{journal}/workflow/access/{id}` and `{journal}/authorDashboard/submission/{id}`. 7: `author.alex` on a submission at Copyediting (`['sendExternalReview','accept']`); control `editor.diana`. 8: `manager.maya` on `decisions: ['sendExternalReview','accept','sendToProduction']`, one `reviewRounds` entry and `published: true` (OJS: `issue` = Vol 1 No 2); the seed rests in Done on every app straight away, and because it passed through Production "Return to Workflow" lands it on "Production" (a `published: true` seed without decisions returns to "Submission" instead); control `layouteditor.leo` seeded as `participants` role `layoutEditor` (OJS/OMP; on OPS the control is the Author). 9: OMP fleet, `editor.diana`, `decisions: ['sendExternalReview']`, one external round; control `assistant.rita` as `funding`. 10: OPS fleet, `sectioneditor.ana` (Moderator); the declined preprint via `decisions: ['decline']`. Never mutate a shared roster submission. Press seeds pass `series: 'monographs'`: a monograph seeded without a series auto-assigns no Series editor (unlike a journal, where section editors are auto-assigned), so the Editor's "Assigned to me" list omits it and an "assigned Series editor" needs an explicit `participants` entry. Revision seeds, 2026-09-13, in the same scheme: 1 reads the header buttons on its seed. 2 adds a second seed with two rounds, `decisions: ['sendExternalReview']` and two `reviewRounds` entries (the second entry builds Round 2; OMP: both external). 3 adds a second scenario-2-shape seed without the `participants` entry, typed at `{journal}/dashboard/editorial?workflowSubmissionId={id}` and `{journal}/workflow/access/{id}`. 4 reads the header and "Title & Abstract" on its seed. 5 rewrites the address's `workflowMenuKey` to `nonsense`. 6 adds `author.bea` as the stranger Author, with nothing seeded for her: she types `{journal}/authorDashboard/submission/{id}` for `author.alex`'s submission only; `author.alex` at `{journal}/dashboard/editorial?workflowSubmissionId={id}`, and a draft (`submitted: false`, submitter `author.alex`) typed by the Editor at that dashboard address. 7 adds `author.bea`'s `submitted: true` submission, typed by `author.alex` at `{journal}/dashboard/mySubmissions?workflowSubmissionId={id}`; the copied entry is the Editor's `workflowMenuKey=publication_{publicationId}_license`; OPS: `author.alex` on a plain `submitted: true` preprint, control `manager.maya`. 8 adds a seed `published: true` without decisions (OJS `issue` Vol 1 No 2; OJS and OMP) and, on OJS, the scheduled seed `decisions: ['sendExternalReview','accept','sendToProduction']` with one `reviewRounds` entry beside `published: true` and `issue` Vol 2 No 1 (2015), the unpublished issue, which lists the article as scheduled (the shape *My Submissions*' scenario 3 seeds); `published: true` alone with that issue leaves the bubble "Submission" and the panel on the Submission stage; the unpublish is driven on "Title & Abstract" through the "Unpublish" ("Unpost") dialog, and the mailbox read is `author.alex`'s address in the mail catcher, Mailpit at `http://127.0.0.1:8025`. 10 reads "Title & Abstract" on the queued preprint. 11: the scenario-2 seed, whose `reviewRounds` entry seeds `reviewer.julia` at `status: 'accepted'` (OJS, OMP); `reader.rosa` on every app; OPS `assistant.rita` (Editorial Board Member) on a `submitted: true` preprint; the doors are `{journal}/dashboard/editorial?workflowSubmissionId={id}`, `{journal}/workflow/access/{id}` and `{journal}/authorDashboard/submission/{id}`; control `editor.diana` (OPS `manager.maya`). 12: OJS and OMP fleets, a scratch journal from the context scenario with `users`: one account `roles: ['manager', 'layoutEditor']`, one `roles: ['author']` as submitter and one `roles: ['externalReviewer']` for the round; two submissions of the scenario-2 shape, one with `participants: [{username: <the two-role account>, role: 'layoutEditor'}]`. 13: `participants: [{username: 'sectioneditor.ana', role: 'sectionEditor'}]` on `decisions: ['sendExternalReview', 'accept', 'sendToProduction']` with one `reviewRounds` entry (press: `series: 'monographs'`); control `manager.maya`. 14: `manager.maya` on `decisions: ['decline']` (OPS: the same on the preprint), submitter `author.alex`, plus a second `submitted: true` submission of `author.alex`; the Author types `{journal}/dashboard/mySubmissions?workflowSubmissionId={id}`; the mailbox read is `author.alex`'s address in the mail catcher, Mailpit as in 8. 14 on OJS runs on `publicknowledge` as above; on OMP and OPS it runs on a scratch press / preprint server from the context scenario with `users` `roles: ['manager']` and `roles: ['author']`, the throwaway Manager and Author standing in for `manager.maya` and `author.alex`, so the "Declined" count and the mailbox are the test's own (the seeded context's "Declined" count moves under other suites' declined seeds).

<a id="fn-a1"></a>
**f-a1** — `PKPWorkflowHandler::index()` and `access()` redirect to `dashboard/editorial` with `workflowSubmissionId` only; the stage id that `identifyStageId()` resolved and `WorkflowStageAccessPolicy` checked is dropped. `useWorkflowMenu.js` would honour a `workflowMenuKey=workflow_{stageId}` if one were appended. Live-probed 2026-09-02 (OJS, OMP): `workflow/index/{id}/4`, `/5`, `workflow/editorial/{id}`, `workflow/production/{id}` (and on OMP `workflow/internalReview/{id}` on a monograph with no internal round) on a submission in Review Round 1 all landed on "Review Round 1" (`workflowMenuKey=workflow_3_{round}`); OPS has one stage, so the landing and the named stage coincide.

<a id="fn-a2"></a>
**f-a2** — Note h: `getPublicationVersionItems()` pushes no version node when `EDITORIAL_DASHBOARD && !permissions.canAccessPublication`, while `getMenuItems()` pushes the `publication` group unconditionally for that dashboard. Live-probed 2026-09-02 (OJS, OMP): `copyeditor.carla` assigned on a submission in Review saw the "Publication" heading with no node and no chevron; clicking it left menu, heading and address unchanged; the same Copyeditor at Copyediting saw the node with its pages. OPS has no assistant that can open the panel (note p), so the case cannot arise there.

<a id="fn-a3"></a>
**f-a3** — `PKPWorkflowHandler::authorize()` adds `SubmissionCompletePolicy` (`user.authorization.submission.incomplete.workflowAccessRestrict`) for every op except `access`; the dashboard page (`PKPDashboardHandler`) and the API `get` route (`PKPSubmissionController::authorize()`, `requiresSubmissionAccess` only) add none. Live-probed 2026-09-02 (OJS, OMP, OPS, `manager.maya`, a `submitted: false` seed): the dashboard address and `workflow/access/{id}` both opened the draft's panel (bubble "Incomplete"; OPS "Production"; the full menu and "Create New Version"); `workflow/index/{id}/1` (OPS `/5`) gave the authorization-denied page "Workflow access for incomplete submission is restricted.".

<a id="fn-a4"></a>
**f-a4** — Note j: `Schema::getPropertyStages()` skips the global Manager/Site-admin fallback when `$this->reviewAssignments` contains an undeclined, uncancelled assignment for the current user, so `currentUserAssignedRoles` stays empty on every stage; `useWorkflowPermissions.js` then yields `accessibleStages: []`, `canAccessPublication: false` and `canAccessEditorialHistory: false` ("Library" only), while the page-level `SubmissionAccessPolicy` and `Repo::user()->getAccessibleWorkflowStages()` have no such exclusion, so the panel opens (200). Live-probed 2026-09-02 (OJS, OMP; scratch contexts `u24d8`, a user with the manager and reviewer roles accepted on one seed): as note j records; the missing contributors' line (the title rendered in that slot) was seen on both apps. Control, same day: the same user on a second seed where their review request had been declined got the full manager's screen ("Round 1 Status" / "All reviews are confirmed and a decision is needed.", decision buttons, "Participants" with "Assign"), so the undeclined assignment is the condition. OPS has no reviewer role.

<a id="fn-a5"></a>
**f-a5** — What the entry covered changed with the app build. Live-probed 2026-09-02 (OJS, OMP, OPS, `editor.diana` / `manager.maya`): `{journal}/workflow/index/{id}` and `{journal}/workflow/index/{id}/9` both answered HTTP 500 with an empty document (no title, no text) and the browser stayed on the typed address; no API request was made. The server log named, for both, an uncaught error in `PKPWorkflowHandler::identifyStageId()` (`WorkflowStageDAO::getPathFromId()` called with `null`, and an assertion that the path is not null), raised during `authorize()` before any access policy answered. Live-probed 2026-09-28 (OJS, OMP, OPS, two runs each, a scratch Journal Manager): those two addresses now answer 200 with the access-denied page "A workflow stage was not specified." (Rule 2d, note b), and the blank page comes from the stage-naming addresses typed with no submission id: `workflow/submission`, `workflow/externalReview`, `workflow/editorial`, `workflow/production`, `workflow/index` (all three apps) and `workflow/internalReview` (OMP) each answered HTTP 500 with an empty `main`, for the scratch Journal Manager, Editor, Section Editor and Author on OJS and OMP and the Journal Manager, Moderator and Author on OPS, both runs; the server log names `Call to a member function getData() on null` in `SubmissionCompletePolicy::dataObjectEffect()` (`Repo::submission()->get()` of the missing id returns null and is not checked), the policy `PKPWorkflowHandler::authorize()` adds for every op but `access`. The same addresses with an id forwarded to the dashboard. `workflow/access` with no id answers 404 "404 Not Found" instead, through `SubmissionRequiredPolicy`.

<a id="fn-a6"></a>
**f-a6** — Note g: the review stage's own item (`workflow_{stageId}`, pushed by `getWorkflowItem()` with the rounds as children) is selectable like any entry, and `WorkflowSubmissionStatus.vue` then has no selected round, so it takes the past-round branch (`workflow.submissionInNextReviewRound`) while the stage config renders the round panels without action items. Live-probed 2026-09-02 (OJS, OMP): on a one-round seed in Round 1 and on a two-round seed in Round 2, selecting "Review" / "External Review" gave heading "Workflow: Review" / "Workflow: External Review", address `workflowMenuKey=workflow_3`, the language line, "Status" / "The submission has been advanced to the next round of review", the panels "Revisions Uploaded", "Files for Review", "Reviewers", … and no `workflow-action-items` region; each press folded or unfolded the rounds and kept the entry selected. Whose contents (2026-09-02, OJS three-round seed with a file uploaded into Round 1, and OMP): the stage entry requested `…/submissions/{id}/files?fileStages=15` and `…?fileStages=4` with no `reviewRoundIds`, where each round entry requests `…?fileStages=4&reviewRoundIds={round}`; so "Files for Review" on the stage entry listed the Round 1 file while "Review Round 3" listed "No Items", and "Reviewers" on the stage entry read "No Items" while every round listed "Julia Reviewer" / "Request Accepted". Live-probed 2026-09-28 (Rules 8a, 8b; OJS, OMP, two runs each; scratch contexts, a submission in Review Round 1 with one reviewer invited; the Editor, an assigned Section Editor and the Author): on the stage entry "Add Reviewer" requested `…/grid/users/reviewer/reviewer-grid/show-reviewer-form?selectionType=1&submissionId={id}&stageId=3&reviewRoundId=undefined` (200) and the window "Add Reviewer" held only "Invalid review round."; under "Review Round 1" the same button opened the reviewer search. On OJS every opening of the entry logged console errors from the page's Vue error handler (not uncaught page errors): pressed from the round, two `TypeError: Cannot read properties of null (reading 'authorResponse')` (one `at … getColumns`), with the round's "Author Response" panel left listed; opened by `workflowMenuKey=workflow_3`, one `TypeError: Cannot read properties of null (reading 'publicationId')` and no "Author Response" panel; 5 of 5 visits per role and run; pressing the entry again on the same visit, and "Review Round 1" pressed or typed, logged nothing. OMP's "External Review" entry logged nothing in the editorial view. The Author (OJS "Review", OMP "External Review"): pressed from the round, the address took `workflowMenuKey=workflow_3` and the heading changed while "Round 1 Status" / "Awaiting responses from reviewers." and the round's panels stayed; typed with that key, the heading alone and an empty primary region; `TypeError: Cannot read properties of null (reading 'id') at Object.getPrimaryItems` once on the first press and twice per typed visit, on both apps. The rounds folded and unfolded on each press in the author's view as in the editorial view. The round-less key is the one the screen itself writes.

<a id="fn-a7"></a>
**f-a7** — Note k's branch analysis. Live-probed 2026-09-02 (OJS, OMP, `editor.diana`): the `published: true` seed with no decisions (stage Done, return stage Submission): "Submission" — no box, the stage's panels and, on OJS, "Schedule For Publication"; "Review" (OJS) / "Internal Review" and "External Review" (OMP) — "not yet been initiated"; "Copyediting" — no box, the copyediting panels, no buttons; "Production" — "Submission published.". The same walk on a seed that passed through Production showed "currently in the Production stage" on the earlier stages after a "Return to Workflow" and "Submission published." on "Production" in Done.

<a id="fn-a8"></a>
**f-a8** — The dashboard page gate (`PKPDashboardHandler::__construct()`, note a) lists `ROLE_ID_SITE_ADMIN` for `editorial`, `WorkflowHandler::__construct()` (note b) lists `SITE_ADMIN`, and `SubmissionAccessPolicy` admits a Site Administrator to any submission, while the panel's `GET api/v1/{context}/submissions/{id}` and the list requests resolve roles per context. A Site Administrator with no role at all in a journal does not occur: `PKPContextService::add()` enrols the creating user in the journal's default manager group, and a journal keeps an account's last role. A refusal at the editorial dashboard was recorded on 2026-08-02 (the reviewer-management claim check, OJS: "The current role does not have access to this operation.") for an administrator believed role-less; on 2026-09-02 the case could not be arranged (the scratch contexts list `admin` as "Journal manager" / "Press manager" / "Preprint Server manager"). Live-probed 2026-09-28 (OJS, OMP, OPS, two runs each; scratch contexts in which `admin` was given a second role through the scenario tooling and their Journal Manager role then ended on their edit page, read after a fresh sign-in): with Reader left, `{journal}/dashboard/editorial?workflowSubmissionId={id}` for a submission `admin` was assigned to and for one they were not was rewritten to `?currentViewId=search`, `GET submissions/{id}`, `_submissions/viewsCount` and `_submissions/assigned` answered 401, one "Error" dialog read "The current role does not have access to this operation.", and no panel opened; with Section Editor left (Series editor on OMP, Moderator on OPS) and `admin` a participant on one of the two submissions, the same address opened the panel for both, the unassigned one included, every request 200: header "Activity Log", "Library" (OPS "Preview" first), the full editorial page roster and "Create New Version", while "Assigned to me (1)" listed only the assigned submission. The older addresses of Rule 2a were not typed in these states. Control: `admin` with the manager role opened the dashboard, the dashboard address and `workflow/access/{id}` normally (2026-09-02).

<a id="fn-a9"></a>
**f-a9** — `PKPWorkflowHandler::access()` and `index()` run `SubmissionRequiredPolicy` before any redirect; for an id that no longer exists the policy's failure is a 404 with no template. Live-probed 2026-09-02 (OJS, OMP, OPS, `manager.maya`, after confirming "Delete" on a declined seed): `workflow/access/{id}` → 302 to the `/en/` form → HTTP 404, page body exactly "404 Not Found" (`h1` "404 Not Found"), no journal chrome, no forward; the dashboard address for the same id gave the panel shell with "Error" / "Invalid submission." / "OK" (note c).

<a id="fn-a10"></a>
**f-a10** — The list is built from the submission's `stages[]` (the "Attach Workflow Files" step's stage select, `useFileManagerActions` / the legacy `WorkflowStagesGridHandler` chain reading `submission.stages`), and since pkp/pkp-lib#13273 (2026-09-08) `submission/maps/Schema::getPropertyStages()` emits a Done entry for every submission: first from the apps' `getApplicationStages()`, and since pkp/pkp-lib#13312 (`716419c770`, 2026-09-12: the apps' lists lose Done again but the map iterates `PKPApplication::getValidStages()`, app stages plus Done) from the map itself, so the fix for issue #13109's Roles-grid and statistics symptoms left this list as it was. Live 2026-09-09 and again 2026-09-14 on a reset OJS at ojs `f0cde27fda` / lib/pkp `1967e76f38` (the kept reproduction `shared/playwright/checks/sync/pkp-lib-13109/regressions.js`, `.reports/sync/s14-13109/s5-*`): a submission in the Submission stage answered `stages` with five entries, the fifth `{id: 6, label: "Done", isActiveStage: false}`, and the select's options read Submission, Review, Copyediting, Production and "Done" with `disabled`. Before 2026-09-08 the map added Done only for a submission resting in Done (the synthetic block, still present). OMP and OPS share the map and the component; not re-driven. Reported to the team 2026-09-08/09 with the 13109 regression; the 2026-09-14 ruling above settles the remaining surface. Fixed upstream by pkp/ui-library#985 (`b3ee741f`, merged 2026-09-15, Blesilda Biazon): `useSubmission().getWorkflowStages()` filters the submission's `stages[]` to the editorial workflow stages (Done excluded, mirroring `PKPApplication::getNonWorkflowStages()`) and `useFileAttacherWorkflowStage.js` builds the "Select submission stage" options from it; the API's `stages` property keeps its Done entry (by design since pkp/pkp-lib#13312), only the list changed. Verified 2026-09-16 on a reset OJS at ojs `ae597ff9d9` / lib/pkp `b262d27b81` / ui-library `977e460c` with the same kept reproduction (`.reports/sync/s16-13109/s5-stage-options-ojs.json`): the select's options read Submission, Review, Copyediting, Production, none disabled, and `GET submissions/{id}` still answers five `stages` entries, the fifth `{id: 6, label: "Done", isActiveStage: false}`. OMP and OPS share the component; not re-driven. Retired 2026-09-16.

<a id="fn-omp2"></a>
**f-omp2** — Note h: `useWorkflowNavigationConfigOMP.js::getPublicationItemsEditorial()` pushes `media` before the settings-gated pages and outside the `permissions.canAccessProduction` block; `…OJS.js` and `…OPS.js` push it inside that block. Live-probed 2026-09-02: `assistant.rita` as Funding Coordinator on a monograph in External Review Round 1 saw "Title & Abstract", "Contributors", "Chapters", "Metadata", "Publication Formats", "Media", "References", "Funding" and no "Catalog Entry" or "Permissions & Disclosure"; the same role on a journal article in Review Round 1 saw "Title & Abstract", "Contributors", "Metadata", "References", "Funding", "JATS XML" and no "Media".

<a id="fn-omp3"></a>
**f-omp3** — Note h: the page is listed while `publicationSettings.identifiersEnabled` is true, computed in `PKPDashboardHandler::index()` from the `pubIds` plugin registry. Live-probed 2026-09-02 (scratch presses and journals `u24d1`, as their manager): enabling the URN plugin and ticking `enablePublicationURN` in its settings added "Identifiers" on both apps; disabling the plugin (dialog "Disable" / "Are you sure you want to disable this plugin?", toast "The plugin "URN" has been disabled.") removed the page on OJS, while on OMP, in a fresh browser and login with the plugin's row unticked, every version node still listed "Identifiers", which opened as "Publication: Identifiers" with an empty main column. The seeded press, where URN was never enabled, lists no such page. Why the press's flag stays set was not traced.

<a id="fn-ops2"></a>
**f-ops2** — Note i: `useWorkflowNavigationConfigOPS.js::getInitialSelectionItemKey()` returns `publication_{latest}_titleAbstract` whenever `stageId === PRODUCTION && status !== STATUS_QUEUED`; a declined preprint has `STATUS_DECLINED`. Live-probed 2026-09-02 (`sectioneditor.ana`, `manager.maya`, `decisions: ['decline']` seeds): the panel opened on "Preprint: Title & Abstract" (`workflowMenuKey=publication_{id}_titleAbstract`) with "Production" striped and not selected, bubble "Declined"; selecting "Production" showed "Workflow: Production" with "Revert Decline" among its buttons (the *Production stage*'s).

<a id="fn-ops3"></a>
**f-ops3** — Note e: `getExtendedStage()` returns "Incomplete" only for `stageId === SUBMISSION && submissionProgress`; OPS creates every submission at `WORKFLOW_STAGE_ID_PRODUCTION`, so a preprint draft falls through to the Production label. Live-probed 2026-09-02 (OPS, `manager.maya` by the dashboard address, `author.alex` on My Submissions, `submitted: false` seed): bubble "Production" with the production colour, header "Preview", "Activity Log", "Library"; the editor's and the author's list rows read "… / Production / Complete submission"; the same seed on OJS and OMP read "Incomplete" in bubble and rows.

<a id="fn-ops4"></a>
**f-ops4** — Note b (the OPS author's draft) and note i (the OPS author always lands on "Title & Abstract", whose form is served by a publication component route guarded by `SubmissionCompletePolicy`); on a journal or press the author's draft lands on the Submission stage entry, whose panels make no guarded request. Live-probed 2026-09-02 (OPS, `author.alex`, `dashboard/mySubmissions?workflowSubmissionId={draft}`): panel with bubble "Production", heading "Preprint: Title & Abstract" and the author's page list, an "Error" dialog "Workflow access for incomplete submission is restricted." / "OK" on top, the page's own request answering 401; after "OK" the panel stayed on the same heading. The Journal Manager opening the same draft on OPS, and the author opening theirs on OJS and OMP, got no dialog. The old author-dashboard link reaches the same panel (*[My Submissions](U22-my-submissions.md#a5)*).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Workflow panel (side modal over a dashboard list) | `{journal}/dashboard/editorial?workflowSubmissionId={id}[&workflowMenuKey=…]` · `{journal}/dashboard/mySubmissions?workflowSubmissionId={id}` | VUE-012 · riders on ROUTE-007..008 (owned by *Submissions dashboard*) |
| Editorial workflow address (forwards) | `{journal}/workflow/access/{id}` · `{journal}/workflow/index/{id}/{stageId}` · `{journal}/workflow/{submission\|externalReview\|editorial\|production}/{id}` (+ `internalReview` on OMP, cited from *Internal Review stage*) | ROUTE-031 · ROUTE-053 (OJS) · ROUTE-072 (OMP) · ROUTE-088 (OPS) |
| Old author-dashboard address (forwards) | `{journal}/authorDashboard/submission/{id}` | ROUTE-005 · ROUTE-034 (OJS) · ROUTE-054 (OMP) · ROUTE-073 (OPS) |
| Header: number, spinner, names, title, stage bubble, action bar | in-panel | AFFW-226 · AFFW-227 · AFFW-228 · AFFW-229 · AFFW-230 · AFFW-707 |
| Header buttons: View / Preview / Return to Workflow / Return to Done; generic button | in-panel | AFFW-233 · AFFW-234 · AFFW-240 · AFFW-241 · AFFW-242 |
| Side menu: Workflow group and stage items, review rounds | in-panel | AFFW-244 · AFFW-245 · AFFW-246 · AFFW-247 · AFFW-249 · AFFW-250 · AFFW-251 · AFFW-252 · AFFW-253 |
| Side menu: Publication group, version nodes, pages | in-panel | AFFW-254 · AFFW-255 · AFFW-260 · AFFW-261 · AFFW-262 · AFFW-263 · AFFW-264 · AFFW-265 · AFFW-266 · AFFW-267 · AFFW-268 · AFFW-269 · AFFW-270 · AFFW-271 · AFFW-272 · AFFW-273 · AFFW-274 · AFFW-277 · AFFW-278 · AFFW-279 |
| Initial selection and deep link | address `workflowMenuKey` | AFFW-259 |
| Stage screen chrome: no-access notice, status box, hidden columns | in-panel | AFFW-280 · AFFW-282 · AFFW-283 · AFFW-284 |
| Publication page control regions | in-panel | AFFW-377 · AFFW-378 |
| Dialogs: Delete, Return to Workflow, Return to Done | in-panel | AFFW-454 · AFFW-455 · AFFW-456 |
| Submissions & publications API (omnibus) | `api/v1/{context}/submissions/…` | API-042 (app subclasses API-057 / API-061 / API-065 are claimed by their features) |

## Reference — code anchors

- `lib/ui-library/src/pages/workflow/WorkflowPage.vue`, `WorkflowPageOJS.vue`, `WorkflowPageOMP.vue`, `WorkflowPageOPS.vue`, `workflowStore.js` — the panel, its slots and per-app component registries
- `lib/ui-library/src/pages/workflow/composables/useWorkflowPermissions.js`, `useWorkflowMenu.js`, `useWorkflowActions.js`, `useWorkflowItems.js` — page-side permissions, menu state and address sync, the three dialogs
- `lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfig{OJS,OMP,OPS}.js` — stage items, publication pages, initial selection (forked per app)
- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfig{Editorial,Author}{OJS,OMP,OPS}.js`, `useWorkflowConfig{OJS,OMP,OPS}.js`, `workflowConfigHelpers.js` — header items, the common stage gate, publication control regions
- `lib/ui-library/src/pages/workflow/components/primary/WorkflowSubmissionStatus.vue`, `WorkflowPrimaryBasicMetadata.vue`; `components/publication/WorkflowChangeSubmissionLanguage.vue` — status box, no-access box, language line
- `lib/ui-library/src/composables/useSubmission.js` — stage bubble labels, active stage, not-started test, decision availability
- `lib/ui-library/src/pages/dashboard/dashboardPageStore.js` — `openWorkflowModal()`; `lib/pkp/pages/dashboard/PKPDashboardHandler.php` (+ app `DashboardHandler.php`) — dashboard role gates and `pageInitConfig`
- `lib/pkp/pages/workflow/PKPWorkflowHandler.php` (+ `pages/workflow/WorkflowHandler.php` in OJS, OMP, OPS) — typed workflow addresses and their forwards
- `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php` (+ app `AuthorDashboardHandler.php`) — the old author-dashboard forward
- `lib/pkp/classes/security/authorization/WorkflowStageAccessPolicy.php`, `AuthorDashboardAccessPolicy.php`, `SubmissionAccessPolicy.php`, `internal/UserAccessibleWorkflowStageRequiredPolicy.php`, `internal/UserAccessibleWorkflowStagePolicy.php`, `internal/SubmissionCompletePolicy.php`, `internal/SubmissionAuthorPolicy.php` — server-side stage access
- `lib/pkp/classes/user/Repository.php::getAccessibleWorkflowStages()`; `lib/pkp/classes/submission/maps/Schema.php::getPropertyStages()` (+ `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` in OJS, OMP, OPS) — accessible stages, per-stage roles, Return-to decisions
- `lib/pkp/classes/decision/types/MoveToDone.php`, `ReturnToWorkflow.php`, `ReturnToDone.php`; `lib/pkp/classes/observers/listeners/ApplyDoneWorkflowStage.php` — the Done stage
- `lib/pkp/api/v1/submissions/PKPSubmissionController.php` (+ app `SubmissionController.php`) — the omnibus API
- `registry/userGroups.xml` in OJS, OMP, OPS — default stage sets per role group
