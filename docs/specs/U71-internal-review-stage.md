---
name: internal-review-stage
status: verified
---

# Internal Review stage {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A press may have a monograph read by its own people before, or instead
of, outside peer review. The editor sends the monograph from the
Submission stage to Internal Review with "Send to Internal Review",
invites the press's Internal Reviewers to the round, follows the round's
status box, and closes the round with a decision: ask the author for
revisions, open another internal round, send the monograph on to External
Review, accept it straight for Copyediting, or decline it. An editor whose
participation is limited to recommendations recommends instead. The author
follows the same stage in their own view, reads the reviews they are
allowed to read and uploads revised files there. The stage runs on the
review machinery of External Review; this spec covers what the Internal
Review stage shows to whom, per round and per state, what each of its
decisions does, and where it departs from External Review. The decision
wizard, the Reviewers panel, the Participants panel, the discussions panel
and the file windows are described with their own features (see
*Cross-feature interactions*). <sup>a</sup>

A journal and a preprint server install no Internal Review stage. A
journal's workflow menu lists "Submission", "Review", "Copyediting" and
"Production", and its one review stage is described in
*[Review stage & rounds](U26-review-stage-and-rounds.md)*; a preprint
server's lists "Production" alone. Neither offers "Send to Internal
Review", an Internal Reviewer role or any decision of this file.
<sup>p</sup>

## Actors & permissions

"Deciding editor" and "recommending editor" are the
[glossary's](GLOSSARY.md#roles-and-access); "assigned" means listed on the
monograph's Participants panel. Who can open a stage at all, and what a
typed workflow address answers for someone without the right, is
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
<sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the Internal Review stage** (its rounds, status box and panels) | • Site Administrator; Press Manager; Press Editor: every monograph of the press<br>• Series Editor: when assigned to the monograph. One who is not assigned gets an "Error" dialog, "The current role does not have access to this operation.", over an empty workflow ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access))<br>• Funding Coordinator: the one assistant role the stage's "Assign" offers; when assigned, the panels and their file controls, never the decision buttons. Not assigned, the same "Error" dialog<br>• Copyeditor, Layout Editor, Proofreader, Designer, Indexer, Marketing and sales coordinator: not offered in the stage's "Assign". One of them assigned to the monograph, or an assigned Production editor, opens Internal Review on "You don't currently have access to that stage of the workflow." with no panels ([→ stage participants A8](U35-stage-participants.md#a8))<br>• Author, and a Volume editor or Translator assigned alongside: their own monograph, in the author view (Rules 15–16)<br>• Internal Reviewer: never; they work on their own review page (*[Reviewer's review](U28-reviewers-review.md#wizard)*) <sup>b</sup> |
| **Send a monograph into Internal Review** ("Send to Internal Review" on the Submission stage) | • Deciding editors: while the monograph is queued there (Rule 1)<br>• Recommending editors: offered the same button, and it records a real decision ([→ submission stage](U25-submission-stage.md#a2)) <sup>c</sup> |
| **Choose the files under review; upload to the round's file lists** | • Site Administrator; Press Manager; Press Editor; an assigned Series Editor or Funding Coordinator: the "Files for Review" and "Revisions Uploaded" panels (Rules 4, 6) <sup>d</sup> |
| **Invite and manage Internal Reviewers** (the "Reviewers" panel) | • As on External Review: *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)* (Rule 4) <sup>td-pool</sup> |
| **Upload revised files** | • Author: the "Upload revisions" button, only while the round asks for or already holds revisions; the "Upload" above "Revisions Uploaded" shows on every round but refuses while no revision is asked for (Rule 15)<br>• The editorial roles of the files row above: the "Revisions Uploaded" panel's own controls <sup>d</sup> |
| **Record a decision on the round** | • Deciding editors: on the current round, while Internal Review is the monograph's active stage (Rules 8–13) <sup>e</sup> |
| **Record a recommendation** | • Recommending editors: the four buttons of Rule 14, only while a deciding editor is also assigned <sup>f</sup> |
| **See the "Recommendation" box** | • Deciding editors: once a recommending editor has recorded a recommendation for the round (Rule 14) <sup>f</sup> |
| **Read a completed review** (author view) | • Author: only reviews conducted openly, once completed (Rule 16) <sup>g</sup> |
| **Delete the monograph** | • Press Manager; Press Editor; Site Administrator: only while it stands declined on this stage (Rule 10); an assigned Series Editor is not offered it <sup>e</sup> |

## Fields & validation

N/A. The stage's own surfaces are panels, buttons and a status box. The
forms they open belong to their own features: the decision wizard to
*[Editorial decision recording](U34-editorial-decision-recording.md)*, the
upload windows to *[Submission files](U36-submission-files.md)*, and the
reviewer windows to *Reviewer assignment & management*.

## Rules & state

<a id="entering"></a>
1. **Getting there.** Internal Review is optional. A monograph enters it
   from the Submission stage through "Send to Internal Review", which
   opens Internal Review's Round 1 (the button and its neighbours:
   *[Submission stage](U25-submission-stage.md#send-to-review)*). A
   monograph sent on with the Submission stage's "Send to External Review",
   or accepted there with "Accept and Skip Review", never enters it: its
   "Internal Review" entry keeps reading "The Internal Review stage has not
   yet been initiated." with nothing under it
   ([→ the status box](U24-workflow-screen-and-stage-access.md#status-box)).
   Two later decisions can bring a monograph back here (Rule 17). <sup>r1</sup>
<a id="rounds"></a>
2. **Rounds.** Internal Review runs in rounds numbered from 1, as External
   Review does ([→ rounds](U26-review-stage-and-rounds.md#rounds)). The
   workflow menu's "Internal Review" entry lists "Review Round 1", "Review
   Round 2" and so on under it; a monograph in Internal Review opens on its
   current round; the stage bubble under the title reads "Internal Review
   (Round {N})" and the page heading "Workflow: Internal Review (Round
   {N})" ([→ the side menu](U24-workflow-screen-and-stage-access.md#side-menu)).
   The two stages count separately: the first External Review round is
   "Review Round 1" again, however many internal rounds came before.
   <sup>r2</sup>
<a id="status"></a>
3. **The status box.** An internal round's box is External Review's, with
   the same sentences and the same precedence
   ([→ the round status](U26-review-stage-and-rounds.md#round-status)):
   "Round {N} Status" over "Waiting for reviewers to be assigned.",
   "Awaiting responses from reviewers.", "New reviews have been
   submitted.", "Revisions have been requested." and the rest. The two
   sentences of a revision request that asks for a new round ("Revisions
   requested from the author to be taken to a new review round." and
   "Revisions submitted. A new review round needs to be created.") never
   appear here, because the stage has no such request (Rule 11). Once the
   monograph has left Internal Review, its rounds read the "currently in
   the {stage} stage" sentences of
   [→ the status box](U24-workflow-screen-and-stage-access.md#status-box).
   <sup>r3</sup>
<a id="panels"></a>
4. **What the editorial view shows** on the current round. At the top, the
   "Current Submission Language:" line and the status box (*Workflow
   screen & stage access*); then, in the main column from the top: <sup>r4</sup>

   | Panel | What it holds | Its mechanics |
   |---|---|---|
   | "Revisions Uploaded" | the author's revised files for this round (Rule 6) | [→ revisions](U26-review-stage-and-rounds.md#revisions) and *Submission files* <sup>r4</sup> |
   | "Files for Review" | the files this round's Internal Reviewers are given (Rule 6) | [→ files for review](U26-review-stage-and-rounds.md#review-files) <sup>r4</sup> |
   | "Reviewers" | the round's reviewers, with "Add Reviewer". Its search finds only the press's Internal Reviewers. Two lists the window shows before any search also offer someone who is only an External Reviewer: "Locate a Reviewer" always, and "Select a Reviewer from Reviewer Suggestions" with "Reviewer Suggestion at Submission" on. Chosen from either, that person is added to the internal round as a "Request Sent" row and gets the request ([→ reviewer assignment OMP2](U27-reviewer-assignment-and-management.md#omp2), [→ reviewer suggestions OMP1](U31-reviewer-suggestions.md#omp1)) | *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md#search)* <sup>td-pool</sup> |
   | "Review Tasks & Discussions" | the stage's discussions and tasks | *[Tasks & discussions](U37-tasks-and-discussions.md#panel)* <sup>r4</sup> |

   In the right-hand column, "Recommendation" (deciding editors, Rule 14)
   sits above "Participants" (*Stage participants*), whose "Choose a
   predefined message…" list holds only the blank entry on this stage
   ([→ predefined messages](U35-stage-participants.md#predefined-messages)).
   The decision buttons are Rule 8's. <sup>r4</sup>
5. **Two External Review panels are missing here.** Internal Review shows
   no "Reviewers Suggested by Author" panel, even with the author's
   suggestions switched on, although its "Add Reviewer" window offers the
   suggestions ([→ reviewer suggestions](U31-reviewer-suggestions.md#omp1)),
   and no "Author Response" table
   ([→ author response to reviews](U30-author-response-to-reviews.md#omp1),
   which records that a press shows it on neither review stage).
   <sup>r5</sup>
<a id="own-files"></a>
6. **The stage's own files.** The files under review and the revised files
   of Internal Review are kept apart from External Review's: External
   Review's "Files for Review" and "Revisions Uploaded" never list them.
   They reach External Review only as Rule 13 says, or when an editor
   picks them in External Review's "Files for Review" window after
   ticking its box "Show files from all accessible workflow stages.".
   <sup>r6</sup> <sup>td-files</sup>
7. **The "Internal Review" entry itself.** Selecting the stage's own menu
   entry rather than one of its rounds: <sup>td-entry</sup>
   - 7a. In the editorial view it shows the stage-level view of
     [→ the side menu](U24-workflow-screen-and-stage-access.md#side-menu):
     the panels under a "Status" box, and no decision buttons. While the
     monograph is in Internal Review the box reads "The submission has been
     advanced to the next round of review". Once it has left the stage the
     box reads "The submission advanced to the next review round, was
     accepted, and is currently in the {stage} stage.", even when the stage
     had a single round (that round itself reads "The submission is
     currently in the {stage} stage.", Rule 3). Unlike External Review's entry, the
     right-hand column stays empty: no "Participants" and no
     "Recommendation". <sup>td-entry</sup>
   - 7b. In the author's view, pressing the entry changes the heading to
     "Workflow: Internal Review" and leaves the round's status box and
     panels on screen; the same entry opened by a typed address shows the
     heading and nothing under it. Either way the page fails, with a script
     error in the browser's console ⚠ [OMP7](#omp7). <sup>td-entry</sup>
<a id="decisions"></a>
8. **The decision buttons.** A deciding editor on the current round of an
   active Internal Review is offered, in this order: "Request Revisions",
   "Send to External Review" and "Accept Submission" (both highlighted),
   "Create New Review Round", and the warning-styled "Cancel Review Round"
   (Rule 9) and "Decline Submission". A past round, the stage entry
   (Rule 7), and every round once the monograph has left the stage show no
   decision buttons. A recommending editor gets Rule 14's controls
   instead. Each button opens the decision wizard of
   *[Editorial decision recording](U34-editorial-decision-recording.md#pages)*;
   what the recorded decision does here is Rule 12. <sup>r8</sup>
9. **"Cancel Review Round"** is offered only while no reviewer of the
   round has responded to the request or completed a review, as on
   External Review ([→ decisions](U26-review-stage-and-rounds.md#decisions));
   past that point the button is absent, with nothing in its place.
   <sup>r8</sup>
10. **A declined monograph.** While the monograph stands declined on
    Internal Review, the buttons of Rule 8 are replaced by "Revert
    Decline", and a Press Manager, Press Editor or Site Administrator also
    gets "Delete"
    ([→ the "Delete" dialog](U24-workflow-screen-and-stage-access.md#delete-dialog)).
    <sup>r8</sup>
<a id="no-resubmit"></a>
11. **No "Resubmit for Review".** "Request Revisions" opens its wizard at
    once, without External Review's "Require New Review Round" window
    ([→ the choice before "Request Revisions"](U34-editorial-decision-recording.md)).
    Revisions asked for on Internal Review always come back to the same
    round; a further internal round is opened with "Create New Review
    Round" ⚠ [OMP6](#omp6). <sup>r11</sup> <sup>td-resubmit</sup>
<a id="outcomes"></a>
12. **What each decision does.** Once "Record Decision" is pressed: <sup>r12</sup>

    | Decision | Where the monograph goes | What the internal round shows afterwards |
    |---|---|---|
    | "Request Revisions" | stays on the round | "Revisions have been requested."; once the author's revised file arrives (Rule 15), "Revisions have been submitted and a decision is needed." <sup>r12</sup> |
    | "Create New Review Round" | Round {N+1} of Internal Review, which opens on "Waiting for reviewers to be assigned."; no reviewer is carried over | the previous round becomes a past round: "The submission has been advanced to the next round of review", no buttons <sup>r12</sup> |
    | "Cancel Review Round" | the previous internal round; when the cancelled round was Round 1, the Submission stage, queued, with its Submission-stage buttons back | the cancelled round is gone from the menu, with its reviewer requests <sup>r12</sup> |
    | "Send to External Review" | External Review, whose Round 1 opens on "Waiting for reviewers to be assigned." | the round is closed as accepted; its box reads "The submission is currently in the External Review stage." <sup>r12</sup> |
    | "Accept Submission" | Copyediting, directly; External Review is skipped, and its entry keeps reading "The External Review stage has not yet been initiated." | "The submission is currently in the Copyediting stage." <sup>r12</sup> |
    | "Decline Submission" | stays on the round; the stage bubble reads "Declined" | "Submission declined.", with Rule 10's buttons <sup>r12</sup> |
    | "Revert Decline" | stays on the round, active again | the box reads by the round's reviewers again, and Rule 8's buttons are back <sup>r12</sup> |

<a id="carried-files"></a>
13. **Files carried on.** "Send to External Review", "Accept Submission"
    and "Create New Review Round" each have a "Select Files" page
    ([→ "Select Files"](U34-editorial-decision-recording.md#select-files)):
    <sup>td-files</sup> <sup>td-carry</sup>
    - 13a. "Send to External Review": its "Revisions" list holds every
      revised file uploaded on Internal Review, ticked, the latest round's
      first when there were several rounds. The ticked files arrive in
      External Review Round 1's "Files for Review" as copies under new
      numbers, while the internal round keeps the originals, and External
      Review's "Revisions Uploaded" reads "No Items". The files under
      internal review are not offered, so a monograph with no revisions
      reaches External Review Round 1 with an empty "Files for Review"
      ⚠ [OMP4](#omp4); an editor can still add them there (Rule 6).
      <sup>td-files</sup>
    - 13b. "Accept Submission" and "Create New Review Round": the
      "Revisions" list reads "No items found.", even when the round holds
      the author's revised file, so nothing reaches Copyediting's "Draft
      Files" or the new round's "Files for Review" ⚠ [OMP2](#omp2).
      <sup>td-carry</sup>
<a id="recommendations"></a>
14. **Recommendations.** The rules are External Review's
    ([→ recommendations](U26-review-stage-and-rounds.md#recommendations)),
    with this stage's buttons and names: <sup>f</sup>
    - 14a. A recommending editor on the current round sees four buttons in
      place of the decision buttons: "Recommend Revisions", "Recommend
      Accept", "Recommend Decline" and "Recommend Send to External Review".
      There is no "Recommend Resubmit for Review" button (a typed address
      still reaches it, [OMP6](#omp6)), and "Recommend Revisions" opens its
      wizard at once (Rule 11). The buttons need a deciding editor assigned
      as well; without one the "Recommendation" box reads "You can not make
      a recommendation until an editor is assigned with permission to
      record a decision.". <sup>f</sup>
    - 14b. After recording, the recommending editor's box names the
      recommendation with a "Change decision" button, and the deciding
      editor's "Recommendation" box lists it; with two recommending editors
      it lists the latest of each, comma-separated. A recorded "Recommend
      Send to External Review" is named "Send to External Review" in both
      boxes. "Change decision" opens no window: the box keeps the recorded
      name and the four "Recommend …" buttons show under it; recording
      another replaces the name in both boxes. <sup>f</sup>
    - 14c. The round's box walks the recommendation sentences: "Awaiting
      recommendations from editors." while nothing is recorded and no
      review is under way (for example when the round's only reviewer
      declined), "New editorial recommendations have been submitted." once
      some recommending editors have recorded, and "All recommendations are
      in and a decision is needed." once all have. The last two show as
      soon as the recommendation is recorded, ahead of any reviewer still
      under way, and the author's view reads the same.
      Recording moves nothing else: the monograph stays on the round, the
      deciding editor keeps Rule 8's buttons and the reviewers keep their
      requests. <sup>f</sup>
<a id="author-view"></a>
15. **The author's view** of an internal round shows, from the top, the
    status box, a "Reviewers" list once Rule 16 allows it, "Revisions
    Uploaded" and "Review Tasks & Discussions". <sup>g</sup>
    - 15a. The "Upload revisions" button, at the top of the right-hand
      column, appears only while the round's box reads "Revisions have been
      requested." or "Revisions have been submitted and a decision is
      needed."; it opens the upload window of *Submission files*, and the
      file lands in this round's "Revisions Uploaded". <sup>g</sup>
    - 15b. "Upload" also stands above "Revisions Uploaded" on every round.
      While no revision is asked for, it opens "Upload Review File" reading
      only "You are not allowed to add and edit these files.", and nothing
      is added to the list
      ([→ submission files A7](U36-submission-files.md#a7)); on an earlier
      internal round while External Review asks for revisions, see Rule 18.
      <sup>g</sup>
    - 15c. Unlike External Review, the author's Internal Review has no
      "Notifications" list of the editors' emails, so the letter that sent
      the monograph here and a revision request cannot be read again on
      this stage ⚠ [OMP3](#omp3). No "Author Response" card appears either
      (Rule 5). <sup>td-emails</sup>
<a id="author-reviews"></a>
16. **The author's "Reviewers" list.** It appears once the round has a
    review conducted openly that is requested, accepted or completed; a
    declined request, or one the editor cancelled, does not count. It lists
    only the open reviews that are completed, each with "Read Review" (the
    window: [→ reading reviews as the author](U26-review-stage-and-rounds.md#author-read-review)).
    While the round's only open reviews are still under way, the author
    sees the heading "Reviewers", the columns "Reviewer", "Type" and
    "Actions", and "No Items" under them ⚠ [OMP5](#omp5). Anonymous reviews
    never appear, and a round without an open review shows no list at all.
    <sup>g</sup> <sup>td-reviewers</sup>
<a id="returning"></a>
17. **Coming back to Internal Review.** <sup>r17</sup>
    - 17a. "Move to Review" on Copyediting, for a monograph that never had
      an External Review round, returns it to its last internal round
      ([→ "Move to Review"](U32-copyediting-stage.md#move-to-review)),
      with Rule 8's buttons. A round that had asked for and received
      revisions reads "Returned back to review." ("Awaiting
      recommendations from editors." with a recommending editor assigned);
      a round that never had a reviewer reads "Waiting for reviewers to be
      assigned.". <sup>r17</sup>
    - 17b. "Cancel Review Round" on External Review Round 1, for a
      monograph that came through Internal Review, returns it to its last
      internal round, not to the Submission stage. That round's box reads
      "Submission accepted." while Rule 8's decision buttons are offered
      again, "Cancel Review Round" only while Rule 9 allows it (a round
      with a completed review has none); "External Review" stays in the
      menu with no round under it. <sup>td-return</sup>
18. **After the monograph has moved on.** The internal rounds stay in the
    menu and open on their panels under the box of Rule 3, with no
    decision buttons. The panels keep their own controls ("Add Reviewer",
    the file lists' upload), as a past External Review round does
    ([→ rounds](U26-review-stage-and-rounds.md#rounds)). A reviewer added
    there gets the request on that internal round while the monograph
    stays where it is; what their review page then shows is
    [→ reviewer's review A12](U28-reviewers-review.md#a12). While External
    Review asks the author for revisions, the author's "Upload" on an
    earlier internal round files the revision on that round, and External
    Review's "Revisions Uploaded" stays empty ⚠ [OMP8](#omp8).
    <sup>td-left</sup>
19. **The stage's address.** A typed or bookmarked address naming the
    press's Internal Review stage and the monograph forwards to the
    monograph's workflow like the other stage addresses
    ([→ workflow addresses](U24-workflow-screen-and-stage-access.md#workflow-addresses)).
    Typed without the monograph's number, the same address gives an empty
    page: the app fails on the server ⚠ [OMP9](#omp9). <sup>r19</sup>

## Side effects

- **The author uploads a revised file.** The round's box flips per Rule 12,
  and one "Revised Version Uploaded" email goes to the editors assigned to
  the stage, a recommending editor included, all of them in its To line;
  an assigned Funding Coordinator and an unassigned Press Manager or Press
  Editor get none. It is sent under the author's name, with External
  Review's rules on timing and repeats
  ([→ the review stage's side effects](U26-review-stage-and-rounds.md#revisions)).
  <sup>e1</sup>
- **"Request Revisions".** The author's row on My Submissions reads
  "Revision requested" with "Submit revisions" (*[My
  Submissions](U22-my-submissions.md)*). No task reaches the author's
  header Tasks panel, where External Review's request puts "Revisions to
  consider in External Review." ⚠ [OMP1](#omp1). <sup>td-task</sup>
- **The decisions' emails and Activity Log lines.** Each decision's
  "Notify Authors" and "Notify Reviewers" letters, their templates and the
  line each leaves in the Activity Log are
  *[Editorial decision recording](U34-editorial-decision-recording.md)*'s,
  which records that the "Review Cancel" letter of "Cancel Review Round"
  leaves the press's name unfilled on a press. <sup>e4</sup>
- **"Send to Internal Review".** Besides its email, the decision leaves a
  notice for the author ("Internal review process started.") that no
  screen shows, as the other decisions' notices do
  ([→ editorial decision recording](U34-editorial-decision-recording.md#a5)).
  <sup>e2</sup>
- **"Accept Submission".** The monograph arrives on Copyediting with no
  notice box for its assigned editors, as after "Accept and Skip Review";
  after External Review's "Accept Submission" they read "Assign a
  copyeditor using the Assign link in the Participants list."
  ([→ the copyediting notices](U32-copyediting-stage.md#notices))
  ⚠ [OMP10](#omp10). <sup>td-notice</sup>
- **"Cancel Review Round".** The round's reviewer requests are withdrawn
  and vanish from the reviewers' own lists, as on External Review
  ([→ decisions](U26-review-stage-and-rounds.md#decisions)). <sup>r12</sup>
- **Editors assigned to the stage.** An internal record of the stage's
  editor assignment is kept and updated with every assignment; no screen
  shows it. <sup>e3</sup>

## Settings that modify behavior

- **"Minimum Confirmed Reviews Required"** (Settings › Workflow › Review;
  *[Review setup & review forms](U29-review-setup-and-review-forms.md)*).
  Install default 0. Above 0, an internal round's status box opens with
  "Minimum number of confirmed reviews required: {N}." as External
  Review's does; once that many are confirmed, the round's own line under
  it reads "Minimum required number of reviews have been confirmed. A
  decision is needed.". Each review stage counts only its own round's confirmed
  reviews. On an internal round with fewer, "Accept Submission", "Request
  Revisions" and "Create New Review Round" first ask "Proceed Without
  Minimum Confirmed Reviews?" (the dialog: *Editorial decision
  recording*); "Send to External Review", "Decline Submission" and "Cancel
  Review Round" never ask (Rules 3, 8). <sup>st1</sup>
- **"Default Review Mode"** (Settings › Workflow › Review;
  *[Review setup & review forms](U29-review-setup-and-review-forms.md#review-mode)*).
  Install default "Anonymous Reviewer/Anonymous Author": the review type
  an Internal Reviewer's request starts with, so the author's view shows
  no "Reviewers" list. "Open" makes each new request open, and the list of
  Rule 16 appears for the author. <sup>st2</sup>
- **"Assignment privileges"** (the Participants panel's "Edit Assignment"
  window; *[Stage participants](U35-stage-participants.md#recommend-only)*).
  Install default: unticked, so an assigned Series Editor decides. Ticked,
  the editor records recommendations on this stage (Rule 14) in place of
  Rule 8's decisions. <sup>f</sup>
- **"Reviewer Suggestion at Submission"** (Settings › Workflow › Review;
  *[Reviewer suggestions](U31-reviewer-suggestions.md)*). Install default:
  off. On, Internal Review's "Add Reviewer" window lists the author's
  suggestions, while the stage still shows no suggestions panel (Rule 5).
  <sup>r5</sup>
- **"Internal Review Guidelines"** (Settings › Workflow › Review;
  *[Review setup & review forms](U29-review-setup-and-review-forms.md#guidance)*).
  Install default: empty. Filled, Internal Reviewers read it in their
  review wizard (*Reviewer's review*); nothing on this stage's screen
  changes. <sup>st3</sup>
- **A role's "Stage Assignment" boxes** (Settings › Users & Roles › Roles,
  the role's "Edit"; *[Roles configuration](U54-roles-configuration.md)*).
  At install the "Internal Review" box is ticked for Press editor, Series
  editor, Funding coordinator, Author, Volume editor, Translator and
  Internal Reviewer, and the Press manager row shows every stage box empty
  and greyed, with no "Edit"; the role works on every stage whatever the
  boxes show. A ticked box offers the role in this stage's "Assign",
  except Internal Reviewer, who joins through "Add Reviewer". Unticking it
  takes the offer away and takes the stage from everyone already assigned
  in that role: their rows leave this stage's Participants panel, and the
  stage reads "You don't currently have access to that stage of the
  workflow." for them; ticking it again gives both back
  ([→ stage participants](U35-stage-participants.md#assignment)).
  <sup>b</sup>
- **"Internal Review Stage" templates** (Settings › Workflow › "Tasks and
  Discussions"; *Tasks & discussions*). Install default: the group reads
  "No Items". A template added there with "Auto-add at stage" ticked is
  added to "Review Tasks & Discussions" when a monograph reaches Internal
  Review ([→ auto-add](U37-tasks-and-discussions.md#auto-add)), as
  "Discussion {template name}", "Created by: system", under "In progress",
  with no participants: the Press Manager sees it, the assigned Series
  Editor who sent the monograph does not. <sup>st4</sup>

## Cross-feature interactions

- *[Submission stage](U25-submission-stage.md#send-to-review)*: the "Send
  to Internal Review" button that opens Round 1, and the press's other
  route, "Send to External Review", that skips this stage (Rule 1).
- *[Review stage & rounds](U26-review-stage-and-rounds.md)*: the round
  machinery this stage shares with External Review, the status sentences,
  the file panels, the recommendation boxes and the author's read-review
  window (Rules 2–4, 14, 16).
- *[Editorial decision recording](U34-editorial-decision-recording.md)*:
  every button of Rules 8 and 14 opens that feature's wizard; its pages,
  letters and log lines are described there. This spec covers the
  buttons' presence and what each decision does to the stage.
- *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)*:
  the "Reviewers" panel, the per-stage reviewer pool and every reviewer
  action on it.
- *[Reviewer's review](U28-reviewers-review.md)*: the Internal Reviewer's
  own page and review wizard.
- *[Stage participants](U35-stage-participants.md)*: the Participants
  panel and the recommend-only limit behind Rule 14.
- *[Reviewer suggestions](U31-reviewer-suggestions.md)* and *[Author
  response to reviews](U30-author-response-to-reviews.md)*: the two
  External Review panels this stage lacks (Rule 5).
- *[Tasks & discussions](U37-tasks-and-discussions.md)*: the discussions
  panel of both views and the stage's templates.
- *[Submission files](U36-submission-files.md)*: the file lists' windows
  and the upload window behind "Upload revisions".
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*:
  the menu, the stage bubble, the status box's stage sentences, who may
  open the stage, and its address (Rules 1–3, 7, 19).
- *[Copyediting stage](U32-copyediting-stage.md)*: "Move to Review" back
  to Internal Review (Rule 17a), and its notice box (Side effects).
- *[My Submissions](U22-my-submissions.md)* and *[Submissions
  dashboard](U23-submissions-dashboard.md)*: the monograph's row and its
  "Internal Review" stage label in the lists.
- *[Review setup & review forms](U29-review-setup-and-review-forms.md)*:
  the review settings of *Settings that modify behavior*.

## Canonical scenarios

Scenarios 1 and 3 to 6 run on the seeded press with ready accounts and
scratch monographs; scenarios 2 and 7 to 9 each run on a scratch press
with throwaway accounts, scenario 8's press with "Default Review Mode" at
"Open" and scenario 9's with "Minimum Confirmed Reviews Required" at 2 (the
others keep the install defaults); scenario 10 runs on the seeded journal
and the seeded preprint server, its control on the seeded press. The
accounts, the passwords, the mail catcher and the tooling recipe are in the
footnote. <sup>s</sup>

1. **Round 1 of Internal Review opens**

   Given: Press Editor, on the Submission stage of a queued monograph with
   one submission file and a Copyeditor assigned to it, with an Internal
   Reviewer of the press and the monograph's Author ready to sign in.

   - **"Send to Internal Review"**: press it and complete its wizard with
     "Record Decision" (the wizard: *[Editorial decision
     recording](U34-editorial-decision-recording.md#pages)*): the workflow
     menu's "Internal Review" entry lists "Review Round 1", selected; the
     stage bubble under the title reads "Internal Review (Round 1)", the
     page heading "Workflow: Internal Review (Round 1)", and the box at the
     top "Round 1 Status" over "Waiting for reviewers to be assigned."
     (Rules 1–3).
   - **The panels**: under the "Current Submission Language:" line and the
     status box, the main column holds, from the top, "Revisions Uploaded",
     "Files for Review", "Reviewers" with "Add Reviewer", and "Review Tasks
     & Discussions"; the right-hand column holds "Participants". There is
     no "Reviewers Suggested by Author" panel and no "Author Response"
     table (Rules 4, 5).
   - **The decision buttons**: in this order, "Request Revisions", "Send to
     External Review", "Accept Submission", "Create New Review Round",
     "Cancel Review Round" and "Decline Submission" (Rules 8, 9).
   - **"Assign"**: press the "Participants" panel's "Assign": the "Assign
     Participant" window's role list offers exactly Press editor, Series
     editor, Funding coordinator, Author, Volume editor and Translator,
     never Press manager, Copyeditor, Layout Editor, Proofreader, Designer,
     Indexer, Marketing and sales coordinator or Internal Reviewer (Actors
     row 1; Settings bullet 6). Close the window with its "Cancel".
   - **"Add Reviewer"**: add the Internal Reviewer (the window:
     *[Reviewer assignment &
     management](U27-reviewer-assignment-and-management.md)*): the
     "Reviewers" panel lists them, and the box reads "Awaiting responses
     from reviewers." (Rules 3, 4).
   - **The stage entry**: select the "Internal Review" entry itself rather
     than its round: the panels show under a "Status" box reading "The
     submission has been advanced to the next round of review", with no
     decision buttons and nothing in the right-hand column (Rule 7a).
   - **The Copyeditor**: sign in, open the monograph from the Dashboard and
     select "Internal Review" in its workflow menu: the stage reads "You
     don't currently have access to that stage of the workflow." and shows
     no panels (Actors row 1).
   - **The author's view**: Author: open the monograph from My Submissions:
     it opens on "Internal Review" › "Review Round 1", showing from the top
     the status box, "Revisions Uploaded" and "Review Tasks & Discussions",
     with no "Reviewers" list, since the request carries the install's
     "Default Review Mode", "Anonymous Reviewer/Anonymous Author", and no
     "Upload revisions" button (Rules 2, 15, 15a, 16; Settings bullet 2).
   - **Control**: Press Editor: select "Review Round 1" again: "Cancel
     Review Round" is still among the buttons, since the reviewer has not
     responded (Rule 9). <sup>s</sup>

2. **Revisions asked for and uploaded on the same round**

   Given: Press Editor, Series Editor, a second Series Editor whose
   "Assignment privileges" limit them to recommendations, and Funding
   Coordinator, all assigned to the monograph, its Author, and a Press
   Manager not assigned to it, on a scratch press, with the monograph on
   Internal Review Round 1 holding one completed review.

   - **The round**: Press Editor: the box reads "New reviews have been
     submitted."; the buttons are "Request Revisions", "Send to External
     Review", "Accept Submission", "Create New Review Round" and "Decline
     Submission", with no "Cancel Review Round", since a reviewer has
     completed a review (Rules 3, 8, 9).
   - **"Request Revisions"**: press it: its wizard opens at once, with no
     "Require New Review Round" window before it; complete it with "Record
     Decision": the monograph stays on Round 1, whose box reads "Revisions
     have been requested." (Rules 11, 12).
   - **The author's view**: Author: open the monograph from My Submissions:
     Round 1's box reads "Revisions have been requested.", and "Upload
     revisions" shows at the top of the right-hand column; there is no
     "Reviewers" list, the completed review being anonymous at the
     install's "Default Review Mode" (Rules 15a, 16; Settings bullet 2).
   - **"Upload revisions"**: press it and upload one file through its window
     (the window: *[Submission files](U36-submission-files.md)*): the file
     is listed in the round's "Revisions Uploaded", the box reads
     "Revisions have been submitted and a decision is needed.", and "Upload
     revisions" is still offered (Rules 12, 15a).
   - **The editors' side**: Press Editor: the box reads "Revisions have been
     submitted and a decision is needed.", and "Revisions Uploaded" lists
     the Author's file (Rule 12).
   - **The email**: the mail catcher holds one "Revised Version Uploaded"
     email, sent under the Author's name, with the Press Editor, the Series
     Editor and the recommending Series Editor all in its To line; the
     Funding Coordinator and the Press Manager get none (Side effects, the
     first bullet).
   - **The Funding Coordinator**: sign in and open the monograph from the
     Dashboard: Round 1's panels show, "Files for Review" and "Revisions
     Uploaded" among them, and none of the decision buttons (Actors rows 1,
     3).
   - **Control**: before "Request Revisions", the Author's Round 1 offered
     no "Upload revisions" (Rule 15a). <sup>s</sup>

3. **On to External Review, and back by "Cancel Review Round"**

   Given: Press Editor and the Author, on a monograph whose Internal Review
   Round 1 holds one file in "Files for Review", one completed review and a
   revised file the Author uploaded after "Request Revisions", with an
   Internal Reviewer of the press not on the round; and a second monograph
   sent on to External Review from an Internal Review Round 1 that holds
   one completed review, External Review's Round 1 having no reviewer.

   - **"Send to External Review"**: on the first monograph press it: the
     wizard's "Select Files" page holds one list, "Revisions", with the
     revised file ticked, and no list of the file under review
     [OMP4](#omp4); complete the wizard with "Record Decision": the
     monograph is on External Review, whose "Review Round 1" opens on
     "Waiting for reviewers to be assigned."; that round's "Files for
     Review" lists a copy of the revised file under a new number, and its
     "Revisions Uploaded" reads "No Items" (Rules 12, 13a).
   - **The internal round, left behind**: select "Internal Review" ›
     "Review Round 1": its box reads "The submission is currently in the
     External Review stage.", no decision buttons show, and its "Files for
     Review" and "Revisions Uploaded" still list the file under review and
     the revised file (Rules 3, 8, 13a, 18).
   - **A reviewer added there**: on that round press "Add Reviewer" and add
     the Internal Reviewer: the round's "Reviewers" panel lists them, and
     the monograph stays on External Review, whose "Review Round 1" still
     reads "Waiting for reviewers to be assigned." (Rule 18).
   - **The stage entry**: select the "Internal Review" entry itself: its
     "Status" box reads "The submission advanced to the next review round,
     was accepted, and is currently in the External Review stage.", with no
     decision buttons (Rule 7a).
   - **The author's view**: Author: open the monograph from My Submissions
     and select "Internal Review" › "Review Round 1": its box reads "The
     submission is currently in the External Review stage.", and no "Upload
     revisions" shows (Rules 3, 15a).
   - **The second monograph, before**: Press Editor: its "Internal Review" ›
     "Review Round 1" reads "The submission is currently in the External
     Review stage.", with no decision buttons (Rules 3, 8).
   - **"Cancel Review Round" on External Review**: on its External Review
     "Review Round 1" press "Cancel Review Round" and complete the wizard
     with "Record Decision": the monograph is back on Internal Review
     "Review Round 1", whose box reads "Submission accepted." while
     "Request Revisions", "Send to External Review", "Accept Submission",
     "Create New Review Round" and "Decline Submission" are offered, with no
     "Cancel Review Round", since the round holds a completed review; the
     menu lists "External Review" with no round under it (Rules 9, 17b).
   - **Control**: on the first monograph, External Review's "Files for
     Review" and "Revisions Uploaded" list neither the file under internal
     review nor the revised file under its internal number, only the copy
     under its new one (Rule 6).
     <sup>s</sup>

4. **Accepted straight for Copyediting, and back by "Move to Review"**

   Given: Press Editor and the Author, on a monograph whose Internal Review
   Round 1 holds one completed review and reads "Revisions have been
   submitted and a decision is needed." after "Request Revisions" and the
   Author's revised file.

   - **"Accept Submission"**: press it and complete its wizard with "Record
     Decision" (what its "Select Files" page lists is [OMP2](#omp2)): the
     monograph is on Copyediting, and the workflow menu's "External Review"
     entry reads "The External Review stage has not yet been initiated."
     (Rule 12). Whether Copyediting shows the editor a notice box is
     [OMP10](#omp10), neither a pass nor a fail here.
   - **The internal round, left behind**: select "Internal Review" ›
     "Review Round 1": its box reads "The submission is currently in the
     Copyediting stage.", with no decision buttons and "Add Reviewer" still
     on its "Reviewers" panel (Rules 3, 8, 12, 18).
   - **The author's view**: Author: open the monograph from My Submissions
     and select "Internal Review" › "Review Round 1": its box reads "The
     submission is currently in the Copyediting stage.", and no "Upload
     revisions" shows (Rules 3, 15a).
   - **"Move to Review"**: Press Editor: on Copyediting press "Move to
     Review" and record the decision (the decision: *[Copyediting
     stage](U32-copyediting-stage.md#move-to-review)*): the monograph is
     back on Internal Review "Review Round 1", whose box reads "Returned
     back to review.", with "Request Revisions", "Send to External Review",
     "Accept Submission", "Create New Review Round" and "Decline Submission"
     offered (Rules 8, 9, 17a).
   - **Control**: the "External Review" entry still reads "The External
     Review stage has not yet been initiated.": "Move to Review" returned
     the monograph to its internal round, not to External Review (Rule
     17a). <sup>s</sup>

5. **A second internal round, and cancelled rounds**

   Given: Press Editor and the Author, on a monograph whose Internal Review
   Round 1 holds one completed review, with an Internal Reviewer of the
   press not on it; and a second monograph on Internal Review Round 1 with
   no reviewer.

   - **"Create New Review Round"**: on the first monograph press it and
     complete its wizard with "Record Decision": the "Internal Review"
     entry lists "Review Round 1" and "Review Round 2", with Round 2
     selected; the stage bubble reads "Internal Review (Round 2)", the
     heading "Workflow: Internal Review (Round 2)", and the box "Round 2
     Status" over "Waiting for reviewers to be assigned."; its "Reviewers"
     panel lists no reviewer (Rules 2, 12).
   - **Round 1, past**: select "Review Round 1": its box reads "The
     submission has been advanced to the next round of review", with no
     decision buttons (Rules 8, 12).
   - **The author's view**: Author: open the monograph from My Submissions:
     it opens on Round 2, under the heading "Workflow: Internal Review
     (Round 2)" (Rule 2).
   - **A request on Round 2**: Press Editor: on "Review Round 2" add the
     Internal Reviewer. Internal Reviewer: sign in: the reviewer dashboard
     lists the monograph's request (Side effects, the "Cancel Review Round"
     bullet).
   - **"Cancel Review Round" on Round 2**: Press Editor: "Cancel Review
     Round" is offered, since the reviewer has not responded; press it and
     complete its wizard with "Record Decision": "Review Round 2" is gone
     from the menu, and the monograph stands on "Review Round 1" under the
     heading "Workflow: Internal Review (Round 1)" (Rules 2, 9, 12).
     Internal Reviewer: reload the reviewer dashboard: none of its lists
     holds the request any more (Side effects, the "Cancel Review Round"
     bullet).
   - **"Cancel Review Round" on the only round**: Press Editor: on the
     second monograph press it and record the decision: the monograph is
     back on the Submission stage, queued, offering "Send to Internal
     Review" again, and "Review Round 1" is gone from the "Internal Review"
     entry (Rule 12; Actors row 2).
   - **Control**: before "Create New Review Round", the first monograph's
     Round 1, holding a completed review, offered no "Cancel Review Round"
     (Rule 9). <sup>s</sup>

6. **Declined on Internal Review, and reverted**

   Given: Press Manager, and a Series Editor assigned to the monograph, on
   the monograph's Internal Review Round 1 with one Internal Reviewer
   invited who has not responded.

   - **"Decline Submission"**: Series Editor: press it and record the
     decision: the stage bubble reads "Declined", the round's box reads
     "Submission declined.", and the decision buttons are replaced by
     "Revert Decline" alone (Rules 10, 12; Actors row 10).
   - **The Press Manager**: the same round offers "Revert Decline" and
     "Delete" (Rule 10).
   - **"Revert Decline"**: Series Editor: press it and record the decision:
     the monograph is active on Round 1 again: the stage bubble reads
     "Internal Review (Round 1)", the box reads "Awaiting responses from
     reviewers." again, and "Request Revisions", "Send to External Review",
     "Accept Submission", "Create New Review Round", "Cancel Review Round"
     and "Decline Submission" are back (Rules 2, 8, 12).
   - **Control**: Press Manager: before the decline, and again after the
     revert, the round offered those six buttons and no "Delete" (Rule 10).
     <sup>s</sup>

7. **A recommending editor on an internal round**

   Given: Press Editor and a Series Editor whose "Assignment privileges"
   limit them to recommendations, both assigned to the monograph, and its
   Author, on a scratch press, with the monograph on Internal Review Round
   1 and one Internal Reviewer invited who has not responded.

   - **The recommending editor's round**: Series Editor: the box reads
     "Awaiting responses from reviewers."; in place of the decision buttons
     there are four: "Recommend Revisions", "Recommend Accept", "Recommend
     Decline" and "Recommend Send to External Review", and no "Recommend
     Resubmit for Review" (Rules 3, 14a; Settings bullet 3).
   - **"Recommend Send to External Review"**: press it and complete its
     wizard with "Record Decision": the Series Editor's box names "Send to
     External Review" with a "Change decision" button, and the round's box
     reads "All recommendations are in and a decision is needed.", although
     the reviewer has not responded (Rules 14b, 14c).
   - **The deciding editor's side**: Press Editor: the "Recommendation" box,
     above "Participants", lists "Send to External Review"; the round's box
     reads "All recommendations are in and a decision is needed."; the
     monograph is still on Round 1, with "Request Revisions", "Send to
     External Review", "Accept Submission", "Create New Review Round",
     "Cancel Review Round" and "Decline Submission" offered, and the invited
     reviewer is still on the "Reviewers" panel (Rules 4, 8, 14b, 14c).
   - **The author's view**: Author: the round's box reads "All
     recommendations are in and a decision is needed." (Rule 14c).
   - **"Change decision"**: Series Editor: press it: no window opens; the
     box keeps "Send to External Review", and the four "Recommend …"
     buttons show under it. Press "Recommend Revisions": its wizard opens
     at once, with no choice window before it; complete it with "Record
     Decision": "Send to External Review" is gone from the Series Editor's
     box and from the Press Editor's "Recommendation" box, each naming the
     new recommendation instead (Rules 11, 14a, 14b).
   - **Control**: before the first recommendation, the Press Editor's round
     showed no "Recommendation" box (Actors row 8). <sup>s</sup>

8. **The Author reads an open internal review**

   Given: Author and Press Editor, on a scratch press whose "Default Review
   Mode" is "Open", with a monograph whose Internal Review Round 1 holds
   one completed review and one request not yet answered, and a second
   monograph whose Round 1's only request was declined.

   - **A completed open review**: Author: open the first monograph from My
     Submissions: Round 1 shows, from the top, the status box, a "Reviewers"
     list, "Revisions Uploaded" and "Review Tasks & Discussions"; the list
     holds one row, the completed review, with "Read Review", and not the
     unanswered request (Rules 15, 16; Settings bullet 2).
   - **The editor's side**: Press Editor: the same round's "Reviewers" panel
     lists both requests (Rule 4).
   - **A declined open request**: Author: the second monograph's Round 1
     shows no "Reviewers" list (Rule 16).
   - **Control**: at the install's "Default Review Mode", "Anonymous
     Reviewer/Anonymous Author", scenario 2's Author saw no "Reviewers" list
     on a round holding a completed review (Settings bullet 2).
     <sup>s</sup>

9. **A minimum of confirmed reviews on an internal round**

   Given: Press Editor, on a scratch press whose "Minimum Confirmed Reviews
   Required" is 2, with a monograph whose Internal Review Round 1 has one
   Internal Reviewer invited who has not responded, and a second monograph
   whose Round 1 holds two completed reviews.

   - **The line**: on the first monograph, the round's box opens with
     "Minimum number of confirmed reviews required: 2." (Settings bullet 1).
   - **Three decisions that ask**: press "Accept Submission": before any
     wizard, the question "Proceed Without Minimum Confirmed Reviews?"
     shows; close it with its "Cancel" (the question: *[Editorial decision
     recording](U34-editorial-decision-recording.md)*): the round is
     unchanged. Do the same with "Request Revisions" and with "Create New
     Review Round": each asks the same question first (Settings bullet 1).
   - **Three that do not**: press "Send to External Review": its wizard
     opens at once, with no question; leave it with the footer's "Cancel",
     then "Cancel Decision" ([→ the wizard's
     footer](U34-editorial-decision-recording.md#footer)). Do the same with
     "Decline Submission" and with "Cancel Review Round": each opens its
     wizard at once (Settings bullet 1).
   - **The minimum met**: on the second monograph, confirm both reviews
     with "Read Review" › "Mark as Complete": under the line, the box reads
     "Minimum required number of reviews have been confirmed. A decision is
     needed.", and "Accept Submission" opens its wizard at once; leave it
     the same way (Settings bullet 1).
   - **External Review counts its own**: press "Send to External Review" and
     complete its wizard with "Record Decision": External Review's "Review
     Round 1" box opens with "Minimum number of confirmed reviews required:
     2." over "Waiting for reviewers to be assigned.", with no "Minimum
     required number of reviews have been confirmed…" line: the two
     internal confirmations do not count there (Settings bullet 1).
   - **Control**: before the confirmations, the second monograph's "Accept
     Submission" asked "Proceed Without Minimum Confirmed Reviews?" too: a
     completed review counts only once confirmed (Settings bullet 1).
     <sup>s</sup>

10. **No Internal Review on a journal or a preprint server** {OJS OPS}

    Given: Journal Manager (Preprint Server Manager), on the seeded journal
    (the seeded preprint server), with a newly submitted article (preprint)
    still queued.

    - **The journal's workflow**: open the article: its workflow menu lists
      "Submission", "Review", "Copyediting" and "Production", and no
      "Internal Review"; its Submission stage offers no "Send to Internal
      Review" (Purpose, the absence paragraph).
    - **The server's workflow**: open the preprint: its workflow menu lists
      "Production" alone (Purpose, the absence paragraph).
    - **No Internal Reviewer**: Settings › Users & Roles, its "Roles" tab,
      lists no "Internal Reviewer" (Purpose, the absence paragraph).
    - **Control**: on the seeded press, the Press Manager's queued monograph
      lists "Internal Review" in its workflow menu and offers "Send to
      Internal Review" on its Submission stage, and the press's "Roles" tab
      lists "Internal Reviewer" (Rule 1; Actors row 2; Settings bullet 6).
      <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - {OMP} the author's "Upload" on an internal round that was sent on to External Review refusing with "You are not allowed to add and edit these files.", while External Review's "Upload revisions" takes the file ([OMP8](#omp8); Rule 18): the guard the issue report proposes, once fixed
  - {OMP} "Accept Submission" and "Create New Review Round" on an internal round listing the author's revised file under "Revisions", ticked, and copying it into "Draft Files" and the new round's "Files for Review" ([OMP2](#omp2); Rule 13b): the guard the issue report proposes, once fixed
  - {OMP} the author's header Tasks panel gaining "Revisions to consider in Internal Review." after "Request Revisions" on an internal round, and losing it on the revised-file upload ([OMP1](#omp1); Side effects bullet 2): the guard the issue report proposes, once fixed
- **Rarely met**:
  - a round with a recommending editor assigned and no review under way,
    its box reading "Awaiting recommendations from editors." (Rule 14c)
  - the round "Move to Review" returns to with a recommending editor
    assigned, reading "Awaiting recommendations from editors." in place of
    "Returned back to review." (Rule 17a)
  - two recommending editors: "New editorial recommendations have been
    submitted." while one is still to record, and the deciding editor's
    "Recommendation" box listing both, comma-separated (Rules 14b, 14c)
- **Nothing new to test**:
  - the two internal letters listed on External Review's "Notifications"
    once the monograph gets there (Rule 15c; OMP3)
  - an open request the editor cancelled, which gives the Author no
    "Reviewers" list either (Rule 16)
  - several internal rounds' revised files on "Send to External Review"'s
    "Revisions" list, the latest round's first (Rule 13a)
  - the internal files picked in External Review's "Files for Review"
    window after ticking "Show files from all accessible workflow stages."
    (Rule 6)
  - External Review's first round named "Review Round 1" after two
    internal rounds (Rule 2)
  - an assigned Series Editor who decides, offered the Press Editor's
    buttons (Actors rows 1, 6; scenario 6 declines as one)
  - the Press Manager and the Site Administrator on the round, offered
    what the Press Editor is (Actors row 1)
  - a Volume editor or Translator assigned alongside the Author, who gets
    the Author's view (Actors row 1)
  - a recommending editor with no deciding editor assigned, whose box
    reads External Review's message (Rule 14a)
  - the notices no screen shows: "Internal review process started." and
    the stage's editor-assignment record (Side effects, the "Send to
    Internal Review" and "Editors assigned to the stage" bullets)
- **Register carries it**:
  - OMP1 (no task in the Author's Tasks panel after "Request Revisions";
    Side effects, the "Request Revisions" bullet; scenario 2 passes it)
  - OMP2 (the empty "Revisions" list of "Accept Submission" and "Create
    New Review Round"; Rule 13b; scenario 4 passes it)
  - OMP3 (no "Notifications" list in the Author's Internal Review; Rule
    15c)
  - OMP4 (the files under internal review not offered by "Send to External
    Review"; Rule 13a; scenario 3 passes it)
  - OMP5 (the Author's empty "Reviewers" table while an open review is
    under way; Rule 16)
  - OMP6 (no "Resubmit for Review" or "Recommend Resubmit for Review", and
    the recommendation a typed address records; Rules 11, 14a; scenarios 2
    and 7 pass it)
  - OMP7 (the Author selecting the "Internal Review" entry itself; Rule 7b)
  - OMP8 (the Author's "Upload" on an earlier internal round while External
    Review asks for revisions; Rule 18)
  - OMP9 (the stage's address typed without the monograph's number; Rule
    19)
  - OMP10 (no Copyediting notice after "Accept Submission"; Side effects,
    the "Accept Submission" bullet; scenario 4 passes it)
- **Owned by another feature**:
  - an unassigned Series Editor or Funding Coordinator meeting the "Error"
    dialog (Actors row 1; *[Workflow screen & stage
    access](U24-workflow-screen-and-stage-access.md#stage-access)*)
  - an assigned Production editor refused the stage (Actors row 1;
    *[Stage participants](U35-stage-participants.md#a8)*, its A8)
  - the Internal Reviewer, who has no workflow screen and works on their
    own review page (Actors row 1; *[Reviewer's
    review](U28-reviewers-review.md)*)
  - a recommending editor offered "Send to Internal Review" on the
    Submission stage (Actors row 2; *[Submission
    stage](U25-submission-stage.md#a2)*, its A2)
  - the internal pool in "Add Reviewer", whose lists before a search also
    offer External Reviewers (Rule 4; *[Reviewer assignment &
    management](U27-reviewer-assignment-and-management.md)*, scenario 13)
  - a monograph that skipped Internal Review, its entry reading "The
    Internal Review stage has not yet been initiated." (Rule 1; *Workflow
    screen & stage access*)
  - back from Copyediting by "Move to Review" onto a round that never had
    a reviewer, reading "Waiting for reviewers to be assigned." (Rule 17a;
    *[Copyediting stage](U32-copyediting-stage.md)*, scenario 9)
  - the Author's "Upload" above "Revisions Uploaded" refusing on a round
    with no revision request (Rule 15b; *[Submission
    files](U36-submission-files.md#a7)*, its A7)
  - the My Submissions row after "Request Revisions" (Side effects, the
    "Request Revisions" bullet; *[My Submissions](U22-my-submissions.md)*,
    scenario 4)
  - the decisions' wizard pages, letters and Activity Log lines (Side
    effects, the third bullet; *[Editorial decision
    recording](U34-editorial-decision-recording.md)*, scenario 11)
  - the Participants panel's predefined messages (Rule 4; *[Stage
    participants](U35-stage-participants.md#predefined-messages)*)
  - the discussions panel in both views (Rules 4, 15; *[Tasks &
    discussions](U37-tasks-and-discussions.md#panel)*)
  - "Reviewer Suggestion at Submission" on (Settings bullet 4; *[Reviewer
    suggestions](U31-reviewer-suggestions.md)*, scenario 5)
  - "Internal Review Guidelines" filled (Settings bullet 5; *Reviewer's
    review*, scenario 15)
  - a role's "Internal Review" box unticked, taking the stage from those
    assigned in that role (Settings bullet 6; *[Stage
    participants](U35-stage-participants.md#assignment)*)
  - an "Internal Review Stage" template with "Auto-add at stage", listed
    for the Press Manager only (Settings bullet 7; *[Tasks &
    discussions](U37-tasks-and-discussions.md#auto-add)*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [OMP1](#omp1) | After "Request Revisions" on Internal Review, a press author gets no task in the Tasks panel | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP2](#omp2) | On a press's Internal Review, "Accept Submission" and "Create New Review Round" carry none of the author's revised files | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OMP7](#omp7) | The author selecting the "Internal Review" entry itself gets a stale or empty page, and the page's script fails | 🐞 | medium · crash: script | issues (claude), 2026-10-02 — re-verified |
| [OMP8](#omp8) | A press author's "Upload" on a past Internal Review round files the revision there while External Review waits for it | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP9](#omp9) | The stage's address typed without the monograph's number gives an empty page from a server failure | 🐞 | latent · crash: server | — |
| [OMP10](#omp10) | After "Accept Submission" on Internal Review the assigned editors get no notice box on Copyediting | 🐞 | minor | — |
| [OMP3](#omp3) | The author's Internal Review has no "Notifications" list, so its letters cannot be re-read there | ❓ | user-visible | — |
| [OMP4](#omp4) | "Send to External Review" offers only the revised files, not the files that were under internal review | ❓ | minor | — |
| [OMP5](#omp5) | The author sees an empty "Reviewers" table while an open internal review is under way | ❓ | minor | — |
| [OMP6](#omp6) | Internal Review offers no "Resubmit for Review", yet a recommending editor can record one by a typed address | ❓ | minor | — |

### OMP

<a id="omp1"></a>
**OMP1 — After "Request Revisions" on Internal Review, a press author gets no task in the Tasks panel** · 🐞 · low.
After a press editor records "Request Revisions" on Internal Review,
the author's Tasks panel in the page header gains nothing: it reads "No
Items", and the "Tasks" button shows no count. After the same decision
on External Review the panel lists "Revisions to consider in External
Review." with the monograph's title.

The request is recorded and the author can still answer it: the
monograph's row on My Submissions reads "Revision requested" with a
"Submit revisions" button.
Since: 2022-01-18 · Basis: probe, 2026-10-02. <sup>[f-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — On a press's Internal Review, "Accept Submission" and "Create New Review Round" carry none of the author's revised files** · 🐞 · medium.
On a press's Internal Review, an editor who records "Accept Submission"
or "Create New Review Round" after the author has uploaded a revised
file finds the decision's "Select Files" page reading "No items found."
under "Revisions". The decision is recorded and the revised file is not
copied: Copyediting's "Draft Files", or the new round's "Files for
Review", stays empty. On External Review the same page lists the revised
file, ticked, and the decision copies it.

After accepting, the editor can fetch the file by hand: "Draft Files" ›
"Upload/Select Files", tick "Show files from all accessible workflow
stages.", tick the file under "Internal Review", "OK". After a new
round there is no such pick: the same window on Round 2 lists nothing
under "Internal Review", so the file has to be downloaded from Round 1
and uploaded again.
Since: 2022-01-18 · Basis: probe, 2026-10-02. <sup>[f-omp2](#fn-omp2)</sup>

<a id="omp3"></a>
**OMP3 — No "Notifications" list on the author's Internal Review** · ❓ · user-visible.
On External Review the author's view lists the emails the editors sent
them about the monograph, each opening the full letter. The author's
Internal Review has no such list, so the "Sent to Internal Review" letter
and a revision request, the letter the author most needs while revising,
cannot be read again on the stage where the revisions are uploaded. Once
the monograph reaches External Review, that stage's "Notifications" list
shows the two internal letters, "Your submission has been sent for
internal review" and "Your submission has been reviewed and we encourage
you to submit revisions", beside its own, each opening the full letter; on
Internal Review they are never readable.
Question: should the author's Internal Review list the editors' letters as
External Review does? Lean: yes; the list is the author's record of what
was asked, and nothing about internal review argues for hiding it.
Basis: probe. <sup>[f-omp3](#fn-omp3)</sup>

<a id="omp4"></a>
**OMP4 — "Send to External Review" offers the revised files only** · ❓ · minor.
"Send to External Review" from an internal round offers, on its "Select
Files" page, the revised files uploaded on Internal Review and nothing
else. The files the Internal Reviewers read are not offered, so a
monograph that needed no revision reaches External Review Round 1 with an
empty "Files for Review", and the editor has to add the manuscript again
there.
Question: should the files under internal review be offered for External
Review? Lean: yes, as a second list, unticked or ticked by default; the
Submission stage's "Send to External Review" offers the submission's files
the same way.
Basis: probe. <sup>[f-omp4](#fn-omp4)</sup>

<a id="omp5"></a>
**OMP5 — An empty "Reviewers" table for the author** · ❓ · minor.
On External Review the author's "Reviewers" list appears only once an open
review is completed. On Internal Review it appears as soon as an open
review is requested, and lists nothing until one is completed: the author
sees the heading "Reviewers" over column headings and "No Items".
Question: should the author's internal list wait for a completed open
review, as External Review's does? Lean: yes; an empty table with no
explanation reads as a fault.
Basis: probe. <sup>[f-omp5](#fn-omp5)</sup>

<a id="omp6"></a>
**OMP6 — No "Resubmit for Review" on Internal Review, but a typed recommendation for it** · ❓ · minor.
On External Review "Request Revisions" first opens a "Require New Review
Round" window, "Revisions will not be subject to a new round of peer
reviews." (ticked) or "Revisions will be subject to a new round of peer
reviews."; a recommending editor's "Recommend Revisions" first offers
"Revisions should not be subject to a new round of peer reviews." or
"Revisions should be subject to a new round of peer reviews.". Neither
review stage has a "Recommend Resubmit for Review" button. On Internal
Review no screen offers either choice: "Request Revisions" and "Recommend
Revisions" open their wizards at once, revisions always return to the same
round, and a new internal round is opened with "Create New Review Round".
The recommendation is still reachable by a typed address: a recommending
Series Editor gets "Recommend Resubmit for Review", and "Record Decision"
records it ("Recommendation Submitted"). Their box then reads "Resubmit for
Review" with "Change decision", the deciding editor's "Recommendation" box
lists "Resubmit for Review", and the round reads "All recommendations are
in and a decision is needed.". The deciding editor's matching address reads
"This decision could not be found. Please provide a recognized decision
type.", so no one can act on the recommendation.
Question: should the recommendation that only a typed address reaches be
removed, or offered as a choice the way External Review offers it? Lean:
remove it; no deciding editor on this stage can act on it, and "Create New
Review Round" already does the job in one step.
Basis: probe. <sup>[f-omp6](#fn-omp6)</sup>

<a id="omp7"></a>
**OMP7 — The author's "Internal Review" entry shows a stale or empty page** · 🐞 · medium · crash: script.
An author who presses the stage's own menu entry, "Internal Review",
expects the stage-level view an editor gets there (Rule 7a). The heading
changes to "Workflow: Internal Review" but the round's status box and
panels stay on screen, and the same entry opened by a typed address shows
the heading with nothing under it. Both times the page's script fails with
an error in the browser's console. The page opens only when someone presses the stage's
name; the round's own entry under it still opens the round. It is one
fault with the editor's side of the same entry,
[→ workflow screen A6](U24-workflow-screen-and-stage-access.md#a6), and
shares its issue report and its severity.
Basis: probe, 2026-10-02. <sup>[f-omp7](#fn-omp7)</sup>

<a id="omp8"></a>
**OMP8 — A press author's "Upload" on a past Internal Review round files the revision there while External Review waits for it** · 🐞 · low.
On a press, an author can still upload revision files to a monograph's
last Internal Review round after the monograph has moved to External
Review, if that round ever had a "Request Revisions" decision. When
External Review then asks for revisions and the author opens the earlier
Internal Review round from the side menu, "Upload" above "Revisions
Uploaded" takes the file, and the file is listed on that internal round.

Nothing tells the author it went to the wrong round, but the request
stays visibly open: External Review still reads "Revisions have been
requested." with "Upload revisions", and the "My Submissions" row still
reads "Revision requested". The assigned editors get the "Revised
Version Uploaded" email, then find External Review reading "Revisions
have been requested." over an empty "Revisions Uploaded"; the file is on
the Internal Review round.

An Internal Review round sent to External Review with no "Request
Revisions" decision refuses the same "Upload".

The "Upload" offered where it should refuse is
[→ submission files A7](U36-submission-files.md#a7); here the server takes
the file as well (Rule 15b).
Basis: probe, 2026-10-02. <sup>[f-omp8](#fn-omp8)</sup>

<a id="omp9"></a>
**OMP9 — The stage's address without a number fails on the server** · 🐞 · latent · crash: server.
Typed without the monograph's number, the Internal Review stage's address
gives an empty page with no message and no forward: the app fails on the
server instead of refusing. Every stage-naming address of the three apps
does the same; it is the defect
[→ workflow screen A5](U24-workflow-screen-and-stage-access.md#a5) records
for the stage-numbered address.
Basis: probe. <sup>[f-omp9](#fn-omp9)</sup>

<a id="omp10"></a>
**OMP10 — No Copyediting notice after an internal "Accept Submission"** · 🐞 · minor.
An assigned editor opening a monograph that "Accept Submission" moved from
Internal Review to Copyediting expects "Assign a copyeditor using the
Assign link in the Participants list.", as after External Review's
"Accept Submission". No notice box shows, on landing or after a reload.
This is the gap
[→ copyediting stage A6](U32-copyediting-stage.md#a6) records for "Accept
and Skip Review", on a second path.
Basis: probe. <sup>[f-omp10](#fn-omp10)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Code-read 2026-09-27 on checkouts omp `3cd59e944` (lib/pkp `17a1f01fed`, lib/ui-library `03d1cee2`), ojs `72b85f4ba0`, ops `e2111e3aae`; not yet driven. The workflow page composes the stage from the `[WORKFLOW_STAGE_ID_INTERNAL_REVIEW]` blocks of `useWorkflowConfig/workflowConfigEditorialOMP.js` (editorial) and `workflowConfigAuthorOMP.js` (author view), deep-merged over the OJS configs by `useWorkflowConfigOMP.js`, so the common items (stage-access gate `permissions.accessibleStages`, the language line, `WorkflowSubmissionStatus`) are the shared ones. Decisions offered: `APP\submission\maps\Schema::getAvailableEditorialDecisions()` case `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`. Decision types: `omp/classes/decision/types/` — `RequestRevisionsInternal`, `AcceptFromInternal`, `NewInternalReviewRound`, `CancelInternalReviewRound`, `DeclineInternal`, `RevertDeclineInternal`, the recommend set and OMP's own `SendExternalReview` are thin subclasses of the lib/pkp types with the trait `traits/InInternalReviewRound.php` (stage id, the internal file stages, the internal attachers); `SendInternalReview` and `RecommendSendExternalReview` are OMP's own. Round model shared (`PKP\submission\reviewRound\ReviewRound`, no OMP subclass). The shipped specs that already drive parts of the stage live on OMP: *Submission stage* scenario 8 ("Send to Internal Review" opening "Internal Review" › "Review Round 1", 2026-08-02), *Reviewer assignment & management* scenario 13, *Reviewer's review* scenario 15, *Reviewer suggestions* scenario 5, *Editorial decision recording* scenario 11, *Stage participants* Rule 5c, *My Submissions* scenario 4. Live-probed 2026-09-27 (Purpose; Actors preamble) on scratch presses: the editor's five decision buttons (six with "Cancel Review Round" on a round without reviewers), the recommending editor's four "Recommend …" buttons, and the author's own view with "Upload revisions" and the open reviews; the decision wizard, the upload windows and the reviewer windows opened as their features describe.

<a id="fn-p"></a>
**p** — Absence, install facts: `Application::getApplicationStages()` lists Submission, External Review, Editing and Production in OJS (`ojs/classes/core/Application.php`) and Production alone in OPS ("Only one stage in OPS"); OMP adds `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`. Only `useWorkflowNavigationConfigOMP.js` pushes an "Internal Review" item (`workflow.review.internalReview`); the OJS and OPS decision registries (`classes/decision/Repository.php::getDecisionTypes()`) hold no internal type; the "Internal Reviewer" group (`default.groups.name.internalReviewer`, stages `2`) is in OMP's `registry/userGroups.xml` alone. The journal's and the preprint server's menus as listed were observed live by *Workflow screen & stage access* (its Rule 7). Cross-app control for the claim check: a journal submission's and a preprint's workflow menus carry no "Internal Review" entry, and the journal's Submission stage no "Send to Internal Review". Live-probed 2026-09-27: a journal's menu read "Submission", "Review", "Copyediting", "Production", its queued submission offered no "Send to Internal Review", its round no internal decision, and its Roles list "Reviewer" and no "Internal Reviewer"; a preprint server's menu read "Production" alone, with "Post the preprint" and "Decline Submission" and no reviewer role.

<a id="fn-b"></a>
**b** — Stage sets, OMP `registry/userGroups.xml`: Press manager (`default.groups.name.manager`, no `stages`: every stage), Press editor `1,2,3,4,5,6`, Production editor `4,5,6`, Series editor `1,2,3,4,5,6`, Copyeditor `4`, Marketing and sales coordinator `4`, Designer / Indexer / Layout Editor / Proofreader `5,6`, Funding coordinator `1,2,3`, Author / Volume editor / Translator `1,2,3,4,5,6`, Chapter Author `4,5,6`, Internal Reviewer `2`, External Reviewer `3`, Editorial Board Member none. The stage's "Assign" offers the groups whose set holds the stage (*Stage participants* Rules 2–3). An assistant (`ROLE_ID_ASSISTANT`) passes `getAvailableEditorialDecisions()`'s role check but `checkDecisionPermissions()` gives it no `canMakeDecision`, so it gets no buttons. The assigned Production editor's refusal ("You don't currently have access to that stage of the workflow.") on a press's Internal Review was live-probed 2026-09-22 by *Stage participants* (its A8). Reviewers reach a submission only through a review assignment (`ReviewAssignmentAccessPolicy`); the workflow screen refuses them (*Workflow screen & stage access*). Live-probed 2026-09-27 (Actors row 1; Settings bullet 6), two runs: an unassigned Series Editor, Funding Coordinator or Layout Editor opening the monograph got the "Error" dialog "The current role does not have access to this operation." over an empty workflow (the browser's `GET submissions/{id}` answering 401); a Copyeditor assigned through the scenario API and an assigned Production editor opened Internal Review on "You don't currently have access to that stage of the workflow." with no panels. Settings › Users & Roles › Roles: the Press manager row shows every stage box empty and greyed and has no row arrow ("Edit"); the Press editor and Production editor boxes are greyed too. The same screen on a journal shows the Journal manager row's boxes empty and greyed; on a preprint server the Preprint Server manager row has its one "Production" box ticked and greyed. The stage's "Assign" listed exactly Press editor, Series editor, Funding coordinator, Author, Volume editor and Translator on four presses, never Internal Reviewer. Unticking Funding coordinator's "Internal Review" ("Your changes have been saved.") removed it from the stage's "Assign" (the Submission stage's still offered it), removed the assigned Funding Coordinator's row from the stage's Participants panel and gave them the stage-access sentence; ticking it again restored both; ticking Copyeditor's box added Copyeditor to the stage's "Assign".

<a id="fn-c"></a>
**c** — OMP `APP\decision\Repository::getDecisionTypesMadeByRecommendingUsers()` returns `[SendInternalReview]` for the Submission stage, and `Schema::getAvailableEditorialDecisions()` uses it for a recommend-only editor there. Seen 2026-09-20 during the decision-recording feature's check: the Submission stage offered "Send to Internal Review" to a recommend-only Series Editor, who recorded it as a real decision (the decision-recording spec's Actors row 3; the submission-stage spec's A2 holds the question). Live-probed 2026-09-27, again: the recommend-only Series Editor was offered "Send to Internal Review" alone, which ran the same two pages, closed on "Sent for Internal Review" and left the Activity Log line "… sent this submission to the internal review stage.".

<a id="fn-d"></a>
**d** — `lib/ui-library/src/managers/FileManager/useFileManagerConfig.js`: `EDITOR_REVIEW_FILES` and `WORKFLOW_REVIEW_REVISIONS` switch `fileStage` to `SUBMISSION_FILE_INTERNAL_REVIEW_FILE` / `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION` when `stageId === WORKFLOW_STAGE_ID_INTERNAL_REVIEW`; titles `fileManager.filesForReview` "Files for Review", `fileManager.revisionsUploaded` "Revisions Uploaded"; list, upload or select, edit, delete and notes for `ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_ASSISTANT`; list, upload, edit and delete of revisions for `ROLE_ID_AUTHOR`. The author's write is gated server-side by `SubmissionFileStageAccessPolicy`: an `ACCEPT_INTERNAL`, `PENDING_REVISIONS_INTERNAL`, `NEW_INTERNAL_ROUND` or `RESUBMIT_INTERNAL` decision on the latest internal round. Live-probed 2026-09-27 (Actors rows 3, 5): the Site Administrator, Press Manager, Press Editor, assigned Series Editor and assigned Funding Coordinator each had "Upload/Select Files" and "Upload"; the Funding Coordinator's upload landed in "Revisions Uploaded" and gave the author no "Upload revisions".

<a id="fn-e"></a>
**e** — Buttons: `workflowConfigEditorialOMP.js` internal `getActionItems()` (atoms AFFW-311..319), each behind `isDecisionAvailable()`, which requires the decision on the submission's active stage; the server returns no decision off the active stage or for a user without `canMakeDecision`. "Delete" (`common.delete`) shows with `DECISION_REVERT_INTERNAL_DECLINE` available and `hasCurrentUserAtLeastOneAssignedRoleInAnyStage(submission, [ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN])`; the Press editor group is `ROLE_ID_MANAGER`, the Series editor `ROLE_ID_SUB_EDITOR`. Recording and its refusals: the decision-recording spec (`DecisionHandler`, `DecisionWritePolicy`). Live-probed 2026-09-27 (Actors rows 6, 10): the buttons for the Site Administrator, Press Manager, Press Editor and assigned Series Editor on the current round, none on a past round or once the monograph had left the stage, never for the Funding Coordinator; on a declined monograph "Revert Decline" and "Delete" for the first three, "Revert Decline" alone for the assigned Series Editor; "Delete" asks "Are you sure you want to permanently delete this submission?".

<a id="fn-f"></a>
**f** — `WorkflowRecommendOnlyControls.vue` (mounted by the internal `getActionItems()` when `selectedStage.currentUserCanRecommendOnly`): for `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` the actions `DECISION_RECOMMEND_PENDING_REVISIONS_INTERNAL` ("Recommend Revisions"), `DECISION_RECOMMEND_ACCEPT_INTERNAL` ("Recommend Accept"), `DECISION_RECOMMEND_DECLINE_INTERNAL` ("Recommend Decline"), `DECISION_RECOMMEND_EXTERNAL_REVIEW` (OMP `editor.submission.recommend.sendExternalReview` "Recommend Send to External Review"), atoms AFFW-345..348; the box `editor.submission.recommendation` "Recommendation", `editor.submission.workflowDecision.changeDecision` "Change decision", `editor.submission.recommendation.noDecidingEditors` when `submission.editorAssigned` is false. `useWorkflowDecisions.js::decisionRecommendPendingRevisionsInternal()` opens the wizard directly (no `WorkflowSelectRevisionFormModal`). `RecommendSendExternalReview::getRecommendationLabel()` is `editor.submission.decision.sendExternalReview` "Send to External Review", the name both boxes print (`Schema::getPropertyStages()` `currentUserRecommendation`, the deciding editor's `WorkflowRecommendOnlyListingRecommendations`, secondary item guarded by `isCurrentUserDecidingEditor`, atom AFFW-308). Recommendations change no stage, status or round status (`getNewStageId()`, `getNewStatus()`, `getNewReviewRoundStatus()` null); the round's recommendation sentences come from `ReviewRound::determineStatus()`, stage-scoped. The recommend-only flag itself: the participants spec's Rule 9. Live-probed 2026-09-27 (Rule 14), two runs, at the Series Editor and the Press Editor level: the four buttons, each opening a one-page "Notify Editors" wizard (decisions 24, 23, 26, 13); with a reviewer invited, the box moved from "Awaiting responses from reviewers." to "All recommendations are in and a decision is needed." at once after any recommendation, for the recommending editor, the deciding editor and the author, on the page and after a reload, while the deciding editor kept all six buttons, the author got no "Upload revisions" and the reviewer kept the request; with the only reviewer declined and two recommending editors the box read "Awaiting recommendations from editors.", then "New editorial recommendations have been submitted.", then "All recommendations are in and a decision is needed."; the deciding editor's box read "Send to External Review, Accept Submission", then "Decline Submission, Accept Submission"; "Change decision" left the address unchanged, opened no dialog and showed the four buttons under the recorded name. The editorial dashboard (the *Submissions dashboard* spec's list) read "Recommending Editors are tasked to advise the next steps for this submission" on such a monograph's row until all recommending editors had recorded, then "All editorial recommendations have been received, and a decision is required.".

<a id="fn-g"></a>
**g** — `workflowConfigAuthorOMP.js` internal block (atoms AFFW-320..322): primary items a redacted `ReviewerManager` when `getOpenReviewAssignmentsForRound(submission.reviewAssignments, selectedReviewRound.id).length` (review method open; a declined request, or one the editor cancelled, did not count when driven), `FileManager` `WORKFLOW_REVIEW_REVISIONS`, `DiscussionManager`; no `WorkflowListingEmails` and no `AuthorResponseManager`, both of which the external block of `workflowConfigAuthorOJS.js` pushes. Action: `workflow.uploadRevisions` "Upload revisions" (`FileManagerActions.FILE_UPLOAD`, `fileStage` `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`, the round id) while `statusId` is `REVISIONS_REQUESTED`, `RESUBMIT_FOR_REVIEW` or `REVISIONS_SUBMITTED`. The redacted table (`reviewerManagerStore.js`) lists `getOpenAndCompletedReviewAssignmentsForRound()` only, under `user.role.reviewers` "Reviewers" with the columns `user.role.reviewer` "Reviewer", `common.type` "Type" and `grid.columns.actions` "Actions", its empty table reading "No Items"; "Read Review" (`editor.review.readReview`) for rows Complete, Thanked, Received or Viewed. Live-probed 2026-09-27 (Rules 15–16): "Upload revisions" sat in the right-hand action column (`workflow-action-items`) at the top, present at the two revision sentences and absent at every other box, a past round and a round the monograph had left; it opened the "Upload Review File" wizard and the file landed in the selected round's list. The panel's "Upload" above "Revisions Uploaded", on a round with no revision request, opened "Upload Review File" reading only "You are not allowed to add and edit these files." and the list stayed "No Items" on the page and after a reload.

<a id="fn-r1"></a>
**r1** — `SendInternalReview::getNewStageId()` is Internal Review; `DecisionType::runAdditionalActions()` creates Round 1 when the target review stage has none. The Submission stage's "Send to External Review" is `SkipInternalReview` (a lib/pkp `SendExternalReview`, target External Review); "Accept and Skip Review" targets Copyediting. `useSubmission.js::hasNotSubmissionStartedStage()` counts a review stage without rounds as not started, so its box reads `workflow.stageNotStarted` and, on the internal stage, `getSecondaryItems()` returns nothing without a round; the workflow-screen spec's Rule 16 observed "nothing at all under the box" for a skipped Internal Review (live 2026-09-02). Live-probed 2026-09-27 (Rule 1): "Send to Internal Review" ran "Notify Authors" and "Select Files", closed on "Sent for Internal Review" and landed on "Review Round 1"; after the Submission stage's "Send to External Review" or "Accept and Skip Review" the "Internal Review" entry showed only "The Internal Review stage has not yet been initiated.", in the editorial and the author view.

<a id="fn-r2"></a>
**r2** — `useWorkflowNavigationConfigOMP.js::getWorkflowItems()` pushes the item `workflow.review.internalReview` "Internal Review" with `getReviewItems({stageId: WORKFLOW_STAGE_ID_INTERNAL_REVIEW})` children (`workflow.reviewRoundN` "Review Round {$number}", atom AFFW-248); `getInitialSelectionItemKey()` selects `workflow_{stageId}_{currentRound}` for either review stage; bubble OMP `submission.stage.internalReviewWithRound` "Internal Review (Round {$round})". Rounds are numbered per submission and stage (`ReviewRoundDAO`, unique on submission, stage and round); `DecisionType::createReviewRound($submission, $newStageId, 1)` gives External Review its own Round 1. Live-probed 2026-09-27 (Rule 2): "Review Round 1" and "Review Round 2" under "Internal Review", bubble and heading "(Round 2)" for the editor and the author, and External Review's first round "Review Round 1" after two internal rounds.

<a id="fn-r3"></a>
**r3** — `WorkflowSubmissionStatus.vue` handles `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` in every branch that handles External Review (not started, future stage, past round, current round, minimum lines); the sentence is the round's `status` from `Schema::getPropertyReviewRounds()` (`ReviewRound::getStatusKey()` over `determineStatus()`, recomputed on every read). The resubmit statuses need a `RESUBMIT_INTERNAL` decision, which no control of the stage records (note r11). `REVIEW_ROUND_STATUS_SENT_TO_EXTERNAL` ("Sent for external review.") is set by no code: OMP's `SendExternalReview` sets `REVIEW_ROUND_STATUS_ACCEPTED` instead (dead-code candidate, UNASSIGNED item 45). Live-probed 2026-09-27 (Rule 3): each sentence on an internal round with External Review as the control, including the precedence (a completed and an invited review read "New reviews have been submitted."), no resubmit sentence reachable, and the left-stage sentences for the editor and the author.

<a id="fn-r4"></a>
**r4** — Editorial primary items in order (atoms AFFW-304..307): `FileManager` `WORKFLOW_REVIEW_REVISIONS`, `FileManager` `EDITOR_REVIEW_FILES`, `ReviewerManager` (heading `user.role.reviewers` "Reviewers", `editor.submission.addReviewer` "Add Reviewer"), `DiscussionManager` (its stage title, "Review Tasks & Discussions" on a review stage, per the tasks-and-discussions spec); secondary items (AFFW-308..309), only with a round selected: `WorkflowRecommendOnlyListingRecommendations` for a deciding editor, then `ParticipantManager` (`editor.submission.stageParticipants` "Participants"). The predefined-message list's blank-only state on Internal Review was live-probed 2026-09-22 by *Stage participants* (its OMP1). Live-probed 2026-09-27 (Rules 4–5) at every editorial level: the language line, the four panels in order, "Recommendation" above "Participants", and the predefined-message list holding only the blank entry, where External Review and the Submission stage add a "Discussion" entry and "Assign Editor".

<a id="fn-td-pool"></a>
**td-pool** — Live-probed 2026-09-27 (Actors row 4; Rule 4, the "Reviewers" row) on four scratch presses in two runs, each with a throwaway account holding only External Reviewer: as Press Editor on Internal Review Round 1, "Add Reviewer" › "Locate a Reviewer" listed that person with "Select Reviewer" before any search, beside the Internal Reviewers; searching his name read "No items found." while an Internal Reviewer's name was found; chosen from the unsearched list, he showed on the round as "Request Sent" on the page and after a reload, had the request under "Action Required by me" and opened his own review page. With "Reviewer Suggestion at Submission" on and a suggestion carrying such a person's address, "Select a Reviewer from Reviewer Suggestions" offered him, and added from there he showed as "Request Sent" too. First seen 2026-09-06 during the reviewer-suggestions check; the reviewer-assignment spec's OMP2 records the unsearched list's mix.

<a id="fn-r5"></a>
**r5** — The internal editorial block pushes no `ReviewerSuggestionManager` and no `AuthorResponseRequestManager` (the external block of `workflowConfigEditorialOJS.js` pushes both). Live-probed 2026-09-06 by *Reviewer suggestions* (its note t10): no "Reviewers Suggested by Author" panel on Internal Review, and its "Add Reviewer" opened with "Submission Author List", "Select a Reviewer from Reviewer Suggestions" and "Locate a Reviewer". The press's missing Author Response panels: *Author response to reviews* OMP1. Live-probed 2026-09-27: with suggestions on, no "Reviewers Suggested by Author" on Internal Review at any level and "Select a Reviewer from Reviewer Suggestions" in its window, while External Review showed the panel; no "Author Response" on any press round, a journal's round showing it.

<a id="fn-r6"></a>
**r6** — Note d's file stages; External Review's panels use `SUBMISSION_FILE_REVIEW_FILE` / `SUBMISSION_FILE_REVIEW_REVISION`. The "Files for Review" window's box "Show files from all accessible workflow stages." is the review-stage spec's Rule 8 (`ManageReviewFilesGridHandler`). Live-probed 2026-09-27 (Rule 6): note td-files.

<a id="fn-td-files"></a>
**td-files** — Live-probed 2026-09-27 (Rules 6, 13a), two runs. On a monograph in Internal Review Round 1 with one file in "Files for Review" and a revised file the Press Editor added to "Revisions Uploaded", "Send to External Review" › "Select Files" showed one list, "Revisions", holding the revised file, ticked, and no list of the files under review. After recording, External Review Round 1's "Files for Review" held one row, a copy of the revision under a new number, and "Revisions Uploaded" read "No Items", on the page and after a reload; the internal round kept both its files. External Review's "Upload/Select Files" window listed the "External Review" group alone; with "Show files from all accessible workflow stages." ticked it added "Internal Review" with both internal files (and empty Submission, Copyediting, Production and Done groups), and a file picked there arrived in "Files for Review" as a new copy while the internal round kept it. On a monograph with two internal rounds, each with one revised file, the "Revisions" list held both, Round 2's first, both ticked, and both arrived. A monograph with no revision reached External Review Round 1 with "Files for Review" reading "No Items".

<a id="fn-td-entry"></a>
**td-entry** — Live-probed 2026-09-27 (Rule 7), two runs. Editorial view: as Press Editor and as the assigned Series Editor on a monograph in Internal Review Round 1, the entry pressed from the menu and typed (menu key `workflow_2`) showed "Workflow: Internal Review", a "Status" box reading "The submission has been advanced to the next round of review", the four panels (its "Reviewers" reading "No Items" although the round had two: the workflow-screen spec's A6), no decision buttons and an empty right-hand column; External Review's own entry showed the same box and panels with "Participants" and "Assign" in the right-hand column. On a monograph sent on to External Review after one internal round the entry read "The submission advanced to the next review round, was accepted, and is currently in the External Review stage." while its Round 1 read "The submission is currently in the External Review stage."; after two rounds Round 1 itself read the "advanced…" sentence (Rule 3). The author's view: note f-omp7.

<a id="fn-r8"></a>
**r8** — Note e's `getActionItems()`: `requestRevisions` `isSecondary`; `sendExternalReview` and `accept` `isPrimary`; `createNewRound` plain; `cancelReviewRound` and `decline` `isWarnable`; `revertDecline` `isSecondary`; returns nothing without a selected round or on a round below the current one, and `WorkflowRecommendOnlyControls` alone for a recommend-only editor. Server roster, queued: `RequestRevisionsInternal`, `SendExternalReview`, `AcceptFromInternal`, `NewInternalReviewRound`, `CancelInternalReviewRound` when `canRetract()` (lib/pkp `CancelReviewRound`: no confirmed and no completed assignment on the round), `DeclineInternal`; declined: `[RevertDeclineInternal]`. Labels: lib/pkp `editor.submission.decision.requestRevisions` "Request Revisions", `.accept` "Accept Submission", `editor.submission.createNewRound` "Create New Review Round", `.cancelReviewRound` "Cancel Review Round", `.decline` "Decline Submission", `.revertDecline` "Revert Decline"; OMP `editor.submission.decision.sendExternalReview` "Send to External Review". Live-probed 2026-09-27 (Rules 8–10): the roster, order and emphasis as listed; nothing on a past round or once the monograph had left; "Cancel Review Round" absent once a reviewer had accepted, declined or completed; on a declined monograph note e.

<a id="fn-r11"></a>
**r11** — `useWorkflowDecisions.js::decisionPendingRevisionsInternal()` opens `DECISION_PENDING_REVISIONS_INTERNAL` directly, after the minimum-reviews check, where the external `decisionRequestRevision()` opens `WorkflowSelectRevisionFormModal`; the roster (note r8) holds no resubmit type. Live-driven 2026-09-20 by *Editorial decision recording* (its scenario 11): "Request Revisions" on the internal round opened "Request Revisions: Notify Authors" with no choice window. Live-probed 2026-09-27, again: the internal "Request Revisions" (decision 20) opened with no choice window.

<a id="fn-td-resubmit"></a>
**td-resubmit** — Live-probed 2026-09-27 (Rule 11; OMP6). As a recommending Series Editor on Internal Review Round 1, with a deciding editor also assigned, the wizard address `decision/record/{id}?decision=25&reviewRoundId={round}` opened "Recommend Resubmit for Review" (one page, "Notify Editors"); "Record Decision" closed on "Recommendation Submitted"; after a reload the recommending editor's box read "Recommendation" "Resubmit for Review" with "Change decision", the deciding editor's "Recommendation" box listed "Resubmit for Review", and the round read "All recommendations are in and a decision is needed.". As the Press Editor, decision number 21 on the same round went to `user/authorizationDenied?message=editor.submission.workflowDecision.typeInvalid`, "This decision could not be found. Please provide a recognized decision type.", nothing recorded (two runs). The on-screen "Recommend Revisions" opened decision 24 at once. OMP registers `RecommendResubmitInternal` (25) but offers it nowhere; `ResubmitInternal` (21) is not registered (UNASSIGNED item 45).

<a id="fn-r12"></a>
**r12** — Per type (note a): `RequestRevisionsInternal` round `REVISIONS_REQUESTED`, flipping to `REVISIONS_SUBMITTED` when a revised file of the round is newer than the decision (`Repo::decision()->revisionsUploadedSinceDecision()`, internal file stage since pkp/pkp-lib#11219); `NewInternalReviewRound` creates round N+1 of the internal stage at `REVIEW_ROUND_STATUS_PENDING_REVIEWERS`, copying no assignment; `CancelInternalReviewRound::getNewStageId()` is Internal Review when the monograph has more than one internal round, else Submission, and the lib/pkp cancel deletes the round's assignments and the round; OMP `SendExternalReview` moves to External Review (Round 1 created at `PENDING_REVIEWERS`) and sets the internal round `REVIEW_ROUND_STATUS_ACCEPTED`; `AcceptFromInternal` (lib/pkp `Accept`) moves to Copyediting with the round `ACCEPTED`; `DeclineInternal` sets the submission declined and the round `DECLINED`; `RevertDeclineInternal` sets it queued and clears the round status for recomputation. The left-stage sentences are the workflow-screen spec's Rule 15. Live-driven 2026-09-20 by *Editorial decision recording* (its scenario 11): "Send to Internal Review" and, from an internal round, "Send to External Review" recorded, with their closing windows and log lines. The withdrawn requests' disappearance: the review-stage spec's Rule 12. Live-probed 2026-09-27 (Rule 12): every decision recorded on screen with the outcomes of the table; "Cancel Review Round" from Round 1 left the monograph on the Submission stage with no round, from Round 2 on Round 1.

<a id="fn-td-carry"></a>
**td-carry** — Live-probed 2026-09-27 (Rule 13b; OMP2). After "Request Revisions" and the Author's upload of one file on Internal Review Round 1, "Accept Submission" › "Select Files" ("Select files that should be sent to the copyediting stage.") showed "Revisions" reading "No items found."; after recording, Copyediting's "Draft Files" read "No Items", and its "Upload/Select Files" window, with all stages shown, offered the revision under "Internal Review". On a second monograph in the same state "Create New Review Round" › "Select Files" ("Select files that should be sent for review.") read the same, and Round 2's "Files for Review" read "No Items". The External Review control: note f-omp2.

<a id="fn-td-emails"></a>
**td-emails** — Live-probed 2026-09-27 (Rule 15c; OMP3). The Press Editor recorded "Send to Internal Review" and "Request Revisions" on screen, and both letters ("Your submission has been sent for internal review", "Your submission has been reviewed and we encourage you to submit revisions") reached the author in the mail catcher; the author's Internal Review round showed no "Notifications" heading after either, nor after the upload. After "Send to External Review", the author's External Review Round 1 showed "Notifications" listing both letters, each row opening a "Notifications" dialog with the full letter and its signature, on the page and after a reload. Code: `WorkflowListingEmails.vue` fetches the submission's editor-to-author emails, all stages, but only when the selected stage is External Review.

<a id="fn-td-reviewers"></a>
**td-reviewers** — Live-probed 2026-09-27 (Rule 16; OMP5) on a scratch press whose "Default Review Mode" is "Open": an invited or accepted open request showed the author "Reviewers" with the columns "Reviewer", "Type" and "Actions" and one row "No Items"; a declined request, and one the editor cancelled with "Cancel Reviewer", showed no list, on the page and after a reload; completed, the row "{reviewer} · Open · Read Review", whose "Read Review" opened "Review: {title}" with "Completed: {date}", "Reviewer Comments" and "Reviewer Files". On a round with an open completed, an open invited and an anonymous completed review, only the first was listed, while the editor saw all three. At the anonymous default the author saw no "Reviewers" heading, invited or completed. External Review on the same press: invited showed no list, completed the row.

<a id="fn-td-return"></a>
**td-return** — Live-probed 2026-09-27 (Rule 17b), two runs. On a monograph sent from Internal Review Round 1, where one review was completed, to External Review with no reviewer, "Cancel Review Round" (one page, "Notify Authors"; closing window "Cancelled the latest round of review.") landed on "Workflow: Internal Review (Round 1)", "Round 1 Status · Submission accepted.", on the page and after a reload, with "Request Revisions", "Send to External Review", "Accept Submission", "Create New Review Round" and "Decline Submission" and no "Cancel Review Round"; the menu listed "External Review" with no round under it. With two internal rounds the landing was Round 2, "Submission accepted.", with all six buttons (Round 2 had no reviewer); with no internal round, the Submission stage; from External Review Round 2, External Review Round 1. Code: lib/pkp `CancelReviewRound::getNewStageId()` returns Internal Review when the monograph has at most one external round and any internal round; `DecisionType::runAdditionalActions()` then recomputes the internal round's status, and `ReviewRound::determineStatus()` keeps an `ACCEPTED` status as it is.

<a id="fn-r17"></a>
**r17** — lib/pkp `BackFromCopyediting::getNewStageId()`: External Review when the monograph ever had an external round, else Internal Review when it had an internal round, else Submission. Live-probed 2026-09-18 by *Copyediting stage* (its scenario 9, OMP): an internal round only landed on "Internal Review (Round 1)" reading "Waiting for reviewers to be assigned."; internal then external landed on External Review. Live-probed 2026-09-27 (Rule 17a), two runs: three monographs whose internal Round 1 had asked for and received revisions ("Revisions have been submitted and a decision is needed."), accepted and moved back, landed on "Returned back to review." (editor only) or "Awaiting recommendations from editors." (a recommend-only Series Editor also assigned), on the page and after a reload; seeded monographs with no reviewer landed on "Waiting for reviewers to be assigned.", one internal round on Round 1 and two on Round 2; internal then external rounds landed on External Review Round 1, and "Accept and Skip Review" on the Submission stage.

<a id="fn-td-left"></a>
**td-left** — Live-probed 2026-09-27 (Rule 18; OMP8). After "Send to External Review", Internal Review Round 1 read "The submission is currently in the External Review stage." with no decision buttons for the Site Administrator, Press Manager, Press Editor, Series Editor and Funding Coordinator, each offered "Upload", "Upload/Select Files" and "Add Reviewer". The Press Editor's "Upload" filed a revision on that round, and "Add Reviewer" added an Internal Reviewer there as "Request Sent · Open", on the page and after a reload, while the monograph stayed on External Review with its round unchanged. That reviewer's review page opened on step 1 with "Previous Reviews" reading "Round 1 Review Submitted on" and no date, and "Read Round 1 Review" showed "The review was not completed." (the reviewer's-review spec's A12 and A2). After "Accept Submission" the internal rounds read "…currently in the Copyediting stage." with the same three controls; a past External Review round shows the same controls (the review-stage spec's A8). The internal blocks gate only the decision buttons on the stage.

<a id="fn-r19"></a>
**r19** — OMP `pages/workflow/WorkflowHandler` adds the `internalReview` op to lib/pkp `PKPWorkflowHandler` (atom ROUTE-072, owned by the workflow-screen spec as a rider): `{press}/workflow/internalReview/{id}` forwards to the editorial dashboard's workflow as the other stage ops do (that spec's note b and Rule 3). Live-probed 2026-09-27: the address forwarded the Site Administrator, Press Manager, Press Editor, the assigned Series Editors and the Funding Coordinator to the workflow open on Internal Review Round 1; a never-assigned Series Editor, the Author and the Internal Reviewer got "You don't currently have access to that stage of the workflow."; on a monograph never in Internal Review it opened the stage the monograph is on; on a journal and a preprint server it answers "404 Not Found". Typed without the number: note f-omp9.

<a id="fn-e1"></a>
**e1** — `lib/pkp/classes/submissionFile/Repository.php::add()`: a file in `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION` (or the external stage) updates the round status (`ReviewRoundDAO::updateStatus()`), updates the pending-revisions notices of the stage's authors, and, when the uploader is one of them, calls `notifyEditorsRevisionsUploaded()` (mailable `RevisedVersionNotify`, "Revised Version Uploaded"; its recipients, sender and once-a-day rule are the review-stage spec's note l). Live-probed 2026-09-27 (Side effects bullet 1), two runs: one message from the author with the assigned Press Editor, Series Editor and recommend-only Series Editor in its To line, none to the assigned Funding Coordinator, the unassigned Press Manager or Press Editor, or the author; a second upload the same day sent nothing; after the Press Editor signed in, a third sent a fresh email to them alone.

<a id="fn-td-task"></a>
**td-task** — Live-probed 2026-09-27 (Side effects bullet 2; OMP1), two runs. After "Request Revisions" on Internal Review Round 1 the author's header Tasks panel read "No Items", and again after the author's upload and after "Send to External Review"; My Submissions read "Internal Review (Round 1) · Revision requested" with "Submit revisions", then "Review update 1/1" after the upload. Control: after "Request Revisions" on External Review the panel gained "Revisions to consider in External Review." with the title, which opened the round (the review-stage spec's OMP3); a journal's author gains "Revision required.".

<a id="fn-e4"></a>
**e4** — The decision-recording spec's page, closing-window and email tables name the internal decisions ("Send to Internal Review", and "Send to External Review" from an internal round, live-driven 2026-09-20 in its scenario 11); the internal "Request Revisions", "Accept Submission", "Create New Review Round", "Cancel Review Round", "Decline Submission" and "Revert Decline" inherit the lib/pkp types' mailables and log keys (note a). The "Review Cancel" letter's unfilled `{$journalName}` on a press is that spec's OMP1. Live-probed 2026-09-27: every internal decision's "Notify Authors" template, subject and first Activity Log line matched the decision-recording spec's tables; the press's "Review Cancel" letter read "{$journalName}" unfilled on both review stages, while a journal's fills in its name.

<a id="fn-e2"></a>
**e2** — Read from the code; no screen shows this notice. OMP `NotificationManager::getNotificationTypeByEditorDecision()` maps `Decision::INTERNAL_REVIEW` to `NOTIFICATION_TYPE_EDITOR_DECISION_INTERNAL_REVIEW` (atom NOTIF-020), written by `EditorDecisionNotificationManager` at the normal level with OMP `notification.type.editorDecisionInternalReview` "Internal review process started."; no template or component of lib/pkp, the ui-library or OMP asks for it. Its only reader, OMP `AuthorDashboardHandler::_getNotificationRequestOptions()`, has no caller (UNASSIGNED item 45); the siblings are UNASSIGNED item 13 and the decision-recording spec's A5. Live-probed 2026-09-27: after "Send to Internal Review" was recorded on screen, "Internal review process started." showed on no screen of the author, the Press Editor or the Series Editor (header Tasks, My Submissions, the workflow landing and Round 1).

<a id="fn-td-notice"></a>
**td-notice** — Live-probed 2026-09-27 (Side effects bullet 5; OMP10), two runs. "Accept Submission" recorded on an Internal Review round with one completed review: Copyediting showed the assigned Press Editor and Series Editor no notice box, on landing and after a reload. Controls: after External Review's "Accept Submission" both read the "Notification" box "Assign a copyeditor using the Assign link in the Participants list.", and a journal's accept from review shows it too; after the Submission stage's "Accept and Skip Review", none (the copyediting spec's A6). Code: lib/pkp `Decision\Repository::getSubmissionNotificationTypes()` lists the copyediting notices for `Decision::ACCEPT` only, not `ACCEPT_INTERNAL`; the missing notice is the copyediting spec's A6 on a second path.

<a id="fn-e3"></a>
**e3** — Read from the code; no screen shows this record. `NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_INTERNAL_REVIEW` (atom NOTIF-015), created and deleted by `EditorAssignmentNotificationManager` with the stage's editor assignments; read by nothing, and OMP `WorkflowHandler::getEditorAssignmentNotificationTypeByStageId()` has no caller (UNASSIGNED item 14 names this sibling). Live-probed 2026-09-27: with no editor assigned, "An editor must be assigned before review is initiated." (the record's text) showed on no internal round, stage entry or Tasks panel of the Press Manager or Site Administrator, nor on the External Review, Submission-stage or journal controls.

<a id="fn-st1"></a>
**st1** — `useSubmission.js::checkMinimumConsideredReviews()` is called on both review stages, and each stage's round counts only its own confirmed reviews; `useWorkflowDecisions.js::showWarningDialogAboutMinimumReviewsIfEnabled()` wraps `decisionAcceptInternal`, `decisionPendingRevisionsInternal` and `decisionNewInternalRound`, not `decisionExternalReview` (dialog `dashboard.proceedWithoutMinimumReviews` "Proceed Without Minimum Confirmed Reviews?"); `WorkflowSubmissionStatus.vue` prints `dashboard.minimumConfirmedReviewsRequired` for the internal stage too. Install default 0 (seed-facts, "Settings › Workflow › Review", live 2026-09-04 and 2026-09-05). Live-probed 2026-09-27 with the minimum at 2: the line on every internal round state; "Accept Submission", "Request Revisions" and "Create New Review Round" asking, "Cancel" returning with nothing recorded and "Yes, Continue" opening the wizard; "Send to External Review", "Decline Submission" and "Cancel Review Round" opening their wizards directly; with two reviews marked complete, "Minimum required number of reviews have been confirmed. A decision is needed." under the line and "Accept Submission" opening its wizard at once. With 2 of 2 confirmed on Internal Review and "Send to External Review" recorded, External Review Round 1 read "Minimum number of confirmed reviews required: 2." over "Waiting for reviewers to be assigned." and its "Accept Submission" asked.

<a id="fn-st2"></a>
**st2** — Install default "Anonymous Reviewer/Anonymous Author" (seed-facts, live 2026-09-04); the "Add Reviewer" form starts each request's review type from the context's default (the review-setup spec's Rule on review mode; the scenario API stamps it the same way); the author's list needs an open review (note g). Live-probed 2026-09-27: the install default; "Open" saved on screen made a new request start "Open" and the author's list appear, while a request made before the change stayed anonymous.

<a id="fn-st3"></a>
**st3** — OMP `ReviewGuidanceForm` adds `internalReviewGuidelines` ("Internal Review Guidelines"), empty at install (seed-facts); shown on the Internal Reviewer's wizard steps 2 and 3 (the reviewer's-review spec's scenario 15; the review-setup spec's Fields). The workflow configs read no guideline. Live-probed 2026-09-27: empty, the Internal Reviewer's step 2 read "This publisher has not set any reviewer guidelines."; filled, both Internal Reviewers read the text on step 2 and in step 3's "Review Guidelines", an External Reviewer on the same press did not, and the editor's and the author's round read the same before and after.

<a id="fn-st4"></a>
**st4** — OMP `registry/taskTemplates.xml` installs no template for stage 2 (the tasks-and-discussions spec's scenario reads "Internal Review Stage" "No Items"); `DecisionType::runAdditionalActions()` calls `Repo::editorialTask()->autoCreateFromTemplates($submission, $newStageId)` whenever a decision sets a stage, Internal Review included ("Send to Internal Review"). Live-probed 2026-09-27, two runs: a template added on screen with the auto-add box ticked was added on "Send to Internal Review" and on a monograph seeded into the stage, one without it was not; the Press Manager's panel listed it as "Discussion {template name}", "Created by: system", under "In progress", while the assigned Series Editor who sent the monograph read "No Items" in every group, on the page and after a reload; "Cancel Review Round" on internal Round 2 added no second item.

<a id="fn-s"></a>
**s** — Scenario tooling. Ready accounts on the seeded press `publicknowledge` ("Public Knowledge Press"), passwords as `docs/process/users.md` gives them: `editor.diana` (the Press Editor), `manager.maya` (the Press Manager), `sectioneditor.ana` (scenario 6's Series Editor), `reviewer.amara` and `reviewer.adam` (Internal Reviewers), `copyeditor.carla` (scenario 1's Copyeditor) and `author.alex` (the submitter, the Author). Scenarios 1 and 3 to 6 seed their monographs there with `POST scenarios/submission`, `series: 'monographs'`, `submitter: 'author.alex'` and one `files[]` entry; the press auto-assigns the series' editors on a submitted seed, so `participants[]` is additive there (scenarios.md). Scenario 1: no `decisions`, `participants: [{username: 'copyeditor.carla', role: 'copyeditor'}]`, `reviewer.amara` added on screen. Scenario 3: the first monograph `decisions: ['sendInternalReview', 'requestRevisionsInternal']` with `reviewRounds: [{stage: 'internal', files: [one file], reviewers: [{username: 'reviewer.amara', status: 'completed'}]}]`, its revised file uploaded by `author.alex` through "Upload revisions" before the scenario starts (no key seeds an author's revised file: scenarios.md "Field shapes not built yet"), `reviewer.adam` the reviewer added on the left round; the second monograph `decisions: ['sendInternalReview', 'sendExternalReview']` with the same one-entry `reviewRounds`, so External Review Round 1 gets no reviewer. Scenario 4: one monograph seeded and revised as scenario 3's first. Scenario 5: the first monograph `decisions: ['sendInternalReview']` with the one completed internal review, `reviewer.adam` added on Round 2 on screen; the second `decisions: ['sendInternalReview']` and no `reviewRounds`. Scenario 6: `decisions: ['sendInternalReview']`, `reviewRounds: [{stage: 'internal', reviewers: [{username: 'reviewer.amara'}]}]` (status `invited`), `participants: [{username: 'sectioneditor.ana', role: 'sectionEditor'}]`, driven as `sectioneditor.ana` and `manager.maya`. Scenarios 2, 7, 8 and 9 each create a scratch press with `POST scenarios/context` and throwaway `users[]` (password: the username twice) under the role keys `manager`, `editor`, `sectionEditor`, `funding`, `internalReviewer` and `author` as the scenario needs them; a scratch press has no series, so their monographs carry none, and every one is `decisions: ['sendInternalReview']` with one `reviewRounds[]` entry of `stage: 'internal'`. Scenario 2: `participants[]` rows for the `editor`, one `sectionEditor`, a second `sectionEditor` with `recommendOnly: true` and the `funding` user, the `manager` left out, one `completed` review; the mail catcher is Mailpit at `MAILPIT_URL` (default `http://127.0.0.1:8025`), read by recipient address. Scenario 7: `participants[]` for the `editor` and a `sectionEditor` with `recommendOnly: true`, one `invited` review. Scenario 8: `review: {defaultReviewMode: 'open'}`, so every seeded request is open; the first monograph's round one `completed` and one `invited` review from two `internalReviewer` users, the second one `declined`. Scenario 9: `review: {numReviewsPerSubmission: 2}`; the first monograph one `invited` review, the second two `completed` (a seeded `completed` review counts toward the minimum only once "Mark as Complete" confirms it, seed-facts.md). Scenario 10 runs on OJS and OPS `publicknowledge` as `manager.maya`, each with a scratch submission seeded with no decision (OJS section `ART`); its control is OMP `publicknowledge` as `manager.maya` with a queued scratch monograph.

<a id="fn-omp1"></a>
**f-omp1** — `PKP\decision\Repository::updateNotifications()` updates, for a `PENDING_REVISIONS_INTERNAL` decision, the types `[NOTIFICATION_TYPE_PENDING_INTERNAL_REVISIONS` (OMP's `getNotificationTypeByEditorDecision()`), then OMP's `getReviewNotificationTypes()` internal and external`]` for the authors assigned at the stage. `PendingRevisionsNotificationManager::updateNotification()` asks `Repo::decision()->getActivePendingRevisionsDecision($submissionId, $expectedStageId, Decision::PENDING_REVISIONS)`; for the internal stage that function accepts only `PENDING_REVISIONS_INTERNAL` and `RESUBMIT_INTERNAL` and returns null, so the delegate takes its removal branch and deletes the internal task (atom NOTIF-030) together with any decision task; `submissionFile/Repository::add()` runs the same update on every revised-file upload. The call's form dates from lib/pkp `f75706ba57` (pkp/pkp-lib#7265, 2022-01-18); before pkp/pkp-lib#11219 (2025-04-09) the lookup matched `PENDING_REVISIONS` decisions of the internal stage, of which there are none, so no internal task has been raised since that refactor. The task's wording would be `notification.type.pendingRevisions` "Revisions to consider in {$stage}." with "Internal Review". Live-probed 2026-09-27 (note td-task).
Issue report: [docs/issues/U71-OMP1-internal-revisions-request-gives-author-no-task.md](../issues/U71-OMP1-internal-revisions-request-gives-author-no-task.md).

<a id="fn-omp2"></a>
**f-omp2** — lib/pkp `Accept::getSteps()` and `NewExternalReviewRound::getSteps()`, inherited unchanged by OMP's `AcceptFromInternal` and `NewInternalReviewRound`, build the "Revisions" list (`editor.submission.revisions`) with `filterByFileStages([SubmissionFile::SUBMISSION_FILE_REVIEW_REVISION])` and the round's id, hard-coded where the trait's `getRevisionFileStage()` would give `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`; an internal round's revised files sit in that internal stage, so the list is empty. `NewExternalReviewRound`'s promotion target is `SUBMISSION_FILE_REVIEW_FILE`, External Review's stage, not `SUBMISSION_FILE_INTERNAL_REVIEW_FILE`. Both since lib/pkp `f75706ba57` (pkp/pkp-lib#7265, 2022-01-18). The decision-recording spec's page table links here from both rows (corrected 2026-09-28). Live-probed 2026-09-27 (note td-carry); the External Review control the same day, after "Request Revisions" with "Revisions will not be subject to a new round of peer reviews." and the author's upload: both decisions' "Revisions" listed the file, ticked, and recording copied it into "Draft Files" and into Round 2's "Files for Review".
Issue report: [docs/issues/U71-OMP2-internal-round-revised-files-not-carried.md](../issues/U71-OMP2-internal-round-revised-files-not-carried.md).

<a id="fn-omp3"></a>
**f-omp3** — `workflowConfigAuthorOMP.js`'s internal block mounts no `WorkflowListingEmails`, which `workflowConfigAuthorOJS.js`'s external block mounts first; `WorkflowListingEmails.vue` itself fetches only for the external stage id (comment "currently only used in review stage"). The OMP author config dates from ui-library `80daa02d` (pkp/pkp-lib#7495, 2024-10-16). Live-probed 2026-09-27 (note td-emails).

<a id="fn-omp4"></a>
**f-omp4** — OMP `SendExternalReview::withFilePromotionLists()` adds one list, "Revisions", of every `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION` file of the monograph, all rounds, selected by default (`PromoteFiles::addFileList()`); `SUBMISSION_FILE_INTERNAL_REVIEW_FILE` is never listed. The Submission stage's "Send to External Review" (lib/pkp `SendExternalReview`) lists "Submission Files". Live-probed 2026-09-27 (note td-files); the same day the Submission stage's "Send to External Review" and "Send to Internal Review" each showed "Submission Files" holding the submission file, ticked.

<a id="fn-omp5"></a>
**f-omp5** — Note g: the panel's guard counts open reviews in any state but declined or cancelled (`getOpenReviewAssignmentsForRound()`), while its table lists only completed ones (`getOpenAndCompletedReviewAssignmentsForRound()`); External Review's author block guards with the completed count, so the two agree there. Since ui-library `80daa02d` (2024-10-16). Live-probed 2026-09-27 (note td-reviewers).

<a id="fn-omp6"></a>
**f-omp6** — No internal resubmit is offered (note r11), while OMP carries `ResubmitInternal` (unregistered, and returning `PENDING_REVISIONS_INTERNAL` as its number), a registered `RecommendResubmitInternal`, reachable by address (note td-resubmit), the ui-library handlers `decisionResubmitInternal` and `decisionRecommendResubmitInternal`, the `RESUBMIT_INTERNAL` branch of `ReviewRound::determineStatus()` and the unused `REVIEW_ROUND_STATUS_SENT_TO_EXTERNAL`; all recorded in UNASSIGNED item 45. On External Review, live-probed 2026-09-27 on a press and on a journal: the deciding editor's "Request Revisions" window "Require New Review Round" and the recommending editor's "Recommend Revisions" window with the "should" wording, and only three recommend buttons.

<a id="fn-omp7"></a>
**f-omp7** — Live-probed 2026-09-27 (Rule 7b), two runs: as the monograph's Author, pressing "Internal Review" (and, on a monograph in External Review, "External Review") changed the heading and left the selected round's box and panels; the same entry typed as `workflowMenuKey=workflow_2` showed the heading alone. The console logged `TypeError: Cannot read properties of null (reading 'id')` at `getPrimaryItems`, once when pressed and twice when typed; no request failed. The internal author block of `workflowConfigAuthorOMP.js` reads `selectedReviewRound.id` with no round selected. A journal author's "Review" entry does the same (`workflow_3`); the editor's side of the stage entry is the workflow-screen spec's A6.
Issue report: [docs/issues/U71-OMP7-review-stage-entry-page-of-no-round.md](../issues/U71-OMP7-review-stage-entry-page-of-no-round.md).

<a id="fn-omp8"></a>
**f-omp8** — Live-probed 2026-09-27 (Rule 18): a monograph with an internal "Request Revisions" and the author's upload on Round 1, sent to External Review, where the editor then recorded "Request Revisions". The author's "Upload" above internal Round 1's "Revisions Uploaded" opened the three-step "Upload Review File" wizard; the file landed on that round, on the page and after a reload, while External Review Round 1 read "Revisions have been requested." over "No Items" for the author and the editor. The file's "More Actions" offered "Update File Details" and "Delete". Control: on a monograph whose internal round never asked for revisions the same "Upload" refused with "You are not allowed to add and edit these files.". Consistent with note d's server gate, which looks at the decisions of the latest internal round, not at the stage the monograph is on.
Issue report: [docs/issues/U71-OMP8-author-revision-filed-on-earlier-internal-round.md](../issues/U71-OMP8-author-revision-filed-on-earlier-internal-round.md).

<a id="fn-omp9"></a>
**f-omp9** — Live-probed 2026-09-27 (Rule 19): `{press}/workflow/internalReview` with no id answered 500 and an empty page; so did `externalReview`, `submission`, `editorial` and `production` on a press, the same four on a journal and `submission` and `production` on a preprint server, 12 server errors in all (`GET /index.php/{context}/workflow/{op}`); `internalReview` on a journal or a preprint server answers "404 Not Found". The stage-numbered form of the same defect is the workflow-screen spec's A5.

<a id="fn-omp10"></a>
**f-omp10** — Note td-notice, with the code. The copyediting spec's Rule 3 grants the notice after a journal's review round or a press's External Review, and its A6 covers this path and "Accept and Skip Review" (corrected 2026-09-28). Live-probed 2026-09-27.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Internal Review stage, editorial view | workflow menu → "Internal Review" → "Review Round {N}" (editorial dashboard) | AFFW-248, 304..305, 307..308, 310..319 |
| The stage's "Reviewers" panel | editorial view of an internal round; mechanics cited from *Reviewer assignment & management* (scenario 13) | AFFW-306 |
| The stage's "Participants" panel | right-hand column of an internal round; mechanics cited from *Stage participants* (Rule 5c) | AFFW-309 |
| "Send to Internal Review" | Submission stage button; driven by *Submission stage* (scenario 8) | AFFW-301 |
| Recommendation controls | a recommending editor's internal round | AFFW-345..348 (the shared "Change decision" and no-editor notice, AFFW-340..341, are *Editorial decision recording*'s) |
| Internal Review stage, author view | My Submissions → the monograph → "Internal Review" → "Review Round {N}" | AFFW-320..322 |
| "Sent to Internal Review" email | template key `EDITOR_DECISION_SEND_TO_INTERNAL`; its page and text cited from *Editorial decision recording* (scenario 11) | MAIL-071 |
| Editor-assignment notice for the stage | no surface | NOTIF-015 |
| "Internal review process started." notice | no surface | NOTIF-020 |
| The author's internal revisions task | header Tasks panel; never raised (OMP1) | NOTIF-030 |
| The stage's address | `{press}/workflow/internalReview/{id}`; owned by *Workflow screen & stage access* | ROUTE-072 (rider) |

## Reference — code anchors

- OMP `classes/decision/types/` (`SendInternalReview`, `SendExternalReview`, `SkipInternalReview`, `RequestRevisionsInternal`, `AcceptFromInternal`, `NewInternalReviewRound`, `CancelInternalReviewRound`, `DeclineInternal`, `RevertDeclineInternal`, `RecommendAcceptInternal`, `RecommendDeclineInternal`, `RecommendRevisionsInternal`, `RecommendSendExternalReview`, `RecommendResubmitInternal`, `ResubmitInternal`) and `traits/InInternalReviewRound.php` — the internal decision family
- OMP `classes/decision/Repository.php` (`getDecisionTypes`, `getReviewNotificationTypes`, `getDecisionTypesMadeByRecommendingUsers`) · `classes/submission/maps/Schema.php` (`getAvailableEditorialDecisions`) · `classes/notification/NotificationManager.php` · `classes/core/Application.php` (`getApplicationStages`) · `pages/workflow/WorkflowHandler.php` · `registry/userGroups.xml`
- lib/pkp `classes/decision/DecisionType.php` · `classes/decision/Repository.php` (`getActivePendingRevisionsDecision`, `revisionsUploadedSinceDecision`, `updateNotifications`, `getSubmissionNotificationTypes`) · `classes/decision/types/{Accept,NewExternalReviewRound,CancelReviewRound,RequestRevisions,Decline,RevertDecline,SendExternalReview}.php` · `classes/decision/steps/PromoteFiles.php`
- lib/pkp `classes/submission/reviewRound/ReviewRound.php` · `ReviewRoundDAO.php` · `classes/submission/maps/Schema.php` (`getPropertyReviewRounds`, `getPropertyStages`, `checkDecisionPermissions`)
- lib/pkp `classes/notification/managerDelegate/PendingRevisionsNotificationManager.php` · `EditorDecisionNotificationManager.php` · `EditorAssignmentNotificationManager.php` · `classes/submissionFile/Repository.php` · `classes/security/authorization/internal/SubmissionFileStageAccessPolicy.php`
- lib/ui-library `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOMP.js` · `workflowConfigAuthorOMP.js` · `useWorkflowConfigOMP.js` · `useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js` · `useWorkflowDecisions.js`
- lib/ui-library `src/pages/workflow/components/primary/WorkflowSubmissionStatus.vue` · `WorkflowListingEmails.vue` · `components/action/WorkflowRecommendOnlyControls.vue` · `components/secondary/WorkflowRecommendOnlyListingRecommendations.vue` · `src/managers/ReviewerManager/` (`reviewerManagerStore.js`, `useReviewerManagerConfig.js`) · `src/managers/FileManager/useFileManagerConfig.js` · `src/composables/useSubmission.js`
- Locale: OMP `locale/en/{submission,editor,notification,default}.po` (the internal labels, "Send to External Review", "Recommend Send to External Review", "Internal review process started.", the group names) over lib/pkp `locale/en/{submission,editor,common}.po`
