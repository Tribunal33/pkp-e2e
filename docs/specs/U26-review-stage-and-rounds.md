---
name: review-stage-and-rounds
status: verified
---

# Review stage & rounds {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Peer review happens in numbered rounds. When an editor sends a submission to
review, Round 1 opens. The editor chooses which files reviewers will see,
invites reviewers, and watches a status line that tracks where the round
stands. The editor then closes the round with a decision: accept, decline,
ask for revisions, or open another round. The author follows the same
submission on the same workflow screen, in a reduced view. There they find
the letters the editor sent them, the reviews they are allowed to read, and
a place to upload revised files when revisions were asked for. This spec
covers the review stage screen and how rounds work: what each role sees on
it, per round and per state. Three neighbouring features are described
elsewhere: inviting and managing the reviewers themselves, the
decision-recording wizard, and the author's formal response to reviews (see
*Cross-feature interactions*).

OPS does not install a review stage. A preprint server's workflow goes
straight from submission to Production, so no Review entry ever appears in a
preprint's workflow menu, and none of the screens in this file exist there.
<sup>p</sup>

On a press, everything in this file describes the External Review stage. A
press also offers a separate, earlier Internal Review stage [OMP1](#omp1).
Its screens belong to *Internal Review stage* {OMP}. <sup>q</sup>

## Actors & permissions

The Author reaches this screen only for their own submission, through My
Submissions. Anyone who types the workflow
address of a submission they have no right to gets only an access error, and
nothing of that submission is shown
([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)).
<sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the review stage** (rounds, status, panels) | • Site Administrator; Journal Manager; Editor: every submission in the journal<br>• Section Editor, Guest Editor: when assigned to the stage<br>• Funding Coordinator: the one assistant-level group the stage's assignment dialog offers for assignment here<br>• Production assistant roles (Copyeditor, Layout Editor, Proofreader): no way in. The assignment dialog does not offer them, and one assigned on another stage is told they do not have access to this stage ⚠ [A5](#a5)<br>• Author: their own submission, in the author view (Rule 14) <sup>a</sup> |
| **See the round status line** | • Everyone who opens the stage. It is the same status box for every role (Rules 4–5) ⚠ [A2](#a2) |
| **Choose the files under review** | • Site Administrator; Journal Manager; Editor; assigned Section Editor and Guest Editor: the Files for Review panel's file selection (Rule 8) <sup>h</sup> |
| **Upload revised files** | • Author: the "Upload revisions" button, only while the round asks for or already holds revisions (Rule 9) ⚠ [A1](#a1)<br>• Editorial roles: through the Revisions Uploaded panel's own controls, to file revisions on the author's behalf <sup>i</sup> |
| **Record a decision on the round** (buttons at the top of the screen) | • Deciding editors: on the current round only (Rules 10–11)<br>• Recommending editors: never the decision buttons. They get recommendation controls instead, and only while a deciding editor is also assigned to the stage (Rule 13). The recording flow belongs to *Editorial decision recording* <sup>e</sup> |
| **See the "Recommendation" box** | • Deciding editors: once a recommending editor has recorded a recommendation for the round (Rule 13) <sup>e</sup> |
| **Read a completed review** (author view) | • Author: only reviews conducted openly, and only once completed (Rule 15) <sup>j</sup> |
| **Open the editor's letters** ("Notifications" list) | • Author: the emails editors sent them about this submission (Rule 16) <sup>k</sup> |
| **Delete the submission** | • Journal Manager; Site Administrator: only while the submission stands declined (Rule 11) <sup>e</sup> |

## Fields & validation

N/A. The stage's own surfaces are panels, buttons and a status line. The
forms they open belong to their own features: the decision wizard to
*Editorial decision recording*, the file-upload wizard to *Submission files*,
and the reviewer forms to *Reviewer assignment & management*.

## Rules & state

<a id="rounds"></a>
1. Review happens in **rounds numbered from 1**. Every round the submission
   has been through stays visible. The highest-numbered round is the
   **current** round. Only the current round's status and decisions still
   move, but a past round's panels remain editable (Rule 10
   ⚠ [A8](#a8)). <sup>b</sup>
2. Round 1 is created the moment a submission enters the review stage, that
   is, on the "Send for Review" decision on the Submission stage (see
   *Submission stage*). Every later round is created only by the "Create New
   Review Round" button (Rule 12). Rounds are never renumbered. <sup>b</sup>
3. In the workflow menu, the stage entry "Review" expands into one entry per
   round: "Review Round 1", "Review Round 2", and so on. Opening a submission
   that is in review lands on the current round. The page title reads
   "Review (Round {N})". <sup>a</sup>
4. <a id="round-status"></a> **The round status box.** At the top of the
   stage, a box headed "Round {N} Status" carries one sentence describing
   where the current round stands (Rule 5). When a **past** round is
   selected, or when the stage is viewed after the submission has moved past
   it, the box is headed plain "Status" instead. A past round reads "The
   submission has been advanced to the next round of review". Once the
   submission has moved past review, the box reads "The submission is
   currently in the {stage} stage." On a past round it then reads "The
   submission advanced to the next review round, was accepted, and is
   currently in the {stage} stage." Before the stage has started it reads
   "The {stage} stage has not yet been initiated." The editorial view and
   the author view show this same box ⚠ [A2](#a2). <sup>c</sup> <sup>d</sup>
5. **The status sentences.** The status is recomputed from the round's actual
   state every time the screen loads:

   | The box reads | When |
   |---|---|
   | "Waiting for reviewers to be assigned." | No reviewer has been added to the round ⚠ [A4](#a4) |
   | "Awaiting responses from reviewers." | Invitations are out or reviews are underway; nothing overdue, nothing submitted-and-unread |
   | "A review is overdue." | A reviewer missed a response or review deadline |
   | "New reviews have been submitted." | A review arrived that no editor has confirmed yet |
   | "All reviews are confirmed and a decision is needed." | Every review is in and confirmed ⚠ [A4](#a4) |
   | "Revisions have been requested." | After a Request Revisions decision (same round), while no revised file has arrived |
   | "Revisions have been submitted and a decision is needed." | The author uploaded a revised file after Request Revisions |
   | "Revisions requested from the author to be taken to a new review round." | After a Request Revisions decision that requires a new round, while no revised file has arrived |
   | "Revisions submitted. A new review round needs to be created." | The author uploaded a revised file after that decision |
   | "Awaiting recommendations from editors." | Recommending editors are assigned and none has recorded a recommendation for the round |
   | "New editorial recommendations have been submitted." | At least one recommending editor has recorded one, others still pending |
   | "All recommendations are in and a decision is needed." | Every recommending editor has recorded one |
   | "Submission accepted." | After an Accept Submission decision on the round |
   | "Submission declined." | After a Decline Submission decision on the round |
   | "Returned back to review." | The submission was sent back from the Copyediting stage **and** every review of the round is completed and confirmed. Until then the reviewer-derived sentences show instead (Rule 6) |

   <sup>c</sup> <sup>d</sup>
6. **Precedence.** When several sentences could apply, the round reports the
   most urgent reviewer fact first. An overdue review wins over an unread
   one, and an unread one wins over reviews still underway. Reviewers who
   declined or were removed are not counted. The revision sentences
   (requested and submitted) and the closing sentences (accepted and
   declined) override the reviewer-derived ones outright. "Returned back to
   review." sits **below** the reviewer-derived sentences. After a submission
   is moved back from Copyediting, a round with no reviewers reads "Waiting
   for reviewers to be assigned." and one with reviews underway reads
   "Awaiting responses from reviewers." The returned-back sentence can appear
   only once every review is completed and confirmed. "Awaiting
   recommendations from editors." appears only once the round has at least
   one reviewer record. A round with none reads "Waiting for reviewers to be
   assigned." even while recommendations are awaited. A declined reviewer
   counts as a record. On a round whose only reviewer records are declines,
   the recommendation sentences take over from the confirmed-reviews fallback
   of ⚠ [A4](#a4): with a recommendation still pending, such a round reads
   "Awaiting recommendations from editors." <sup>c</sup> <sup>e</sup>
7. The two "requested" sentences flip to their "submitted" partner as soon as
   a revised file newer than the decision exists. They flip back if that file
   is deleted. The author's revisions task, however, does not come back
   ⚠ [A9](#a9) (see *Side effects*). <sup>c</sup> <sup>m</sup>
8. <a id="review-files"></a> **Files for Review.** Each round carries its own
   set of files under review, the files the reviewers of that round are
   given, in the panel headed "Files for Review". The panel's selection
   dialog ("Current Review Files For Round {N}") opens listing the round's
   own review files with checkboxes. Ticking its box "Show files from all
   accessible workflow stages." adds the submission's other workflow files,
   each under a row naming its stage, a file still on the Submission stage
   under "Submission". An earlier round's review files are not offered: on
   Round 2 the review stage's row holds only Round 2's own files (Rule 12).
   Ticking a file adds it to the round, new files can be uploaded from the
   same dialog, and no file is ever deleted here.
   Confirming reports "Review files updated." Unticking a file, though,
   changes nothing the editor can see: the panel lists it exactly as
   before, and the dialog's checkboxes do not reliably mirror the panel
   ⚠ [A7](#a7). <sup>h</sup>
9. <a id="revisions"></a> **Revisions Uploaded.** Each round also carries the
   revised files uploaded in answer to a revision request, in the panel
   headed "Revisions Uploaded". The panel is present from the moment the
   round opens. Its description, "These files have been submitted by the
   author after revisions were requested", shows even on a round where no
   revisions were ever requested ⚠ [A10](#a10). The author's
   bottom-of-screen "Upload revisions" button appears only while the round's
   status is "Revisions have been requested.", "Revisions requested from the
   author to be taken to a new review round.", or "Revisions have been
   submitted and a decision is needed." ⚠ [A1](#a1). In the new-round
   variant, the round leaves this list after the author's first upload and
   that button disappears. The Revisions Uploaded panel's own "Upload"
   control still opens the same wizard. <sup>i</sup>
10. **Past rounds lose the decision buttons.** The decision buttons appear
    only when the current round is selected. A past round shows the panels
    of that round (its reviewers, its files), and the panels keep their own
    controls (upload, add a reviewer, assign a participant). Those controls
    still act: a reviewer added or a file uploaded on a past round lands in
    that past round ⚠ [A8](#a8). <sup>a</sup>
    <sup>e</sup>
11. <a id="decisions"></a> **The decision buttons** (deciding editors, current
    round): "Request Revisions", "Accept Submission" (the highlighted one),
    "Create New Review Round", "Cancel Review Round", "Decline Submission".
    Three qualifications:
    - "Request Revisions" opens with the choice "Require New Review Round".
      The options are "Revisions will not be subject to a new round of peer
      reviews." (preselected) and "Revisions will be subject to a new round
      of peer reviews." This choice selects between the two revision paths of
      Rule 5. The new-round choice continues under the wizard name "Resubmit
      for Review". The wizard itself belongs to *Editorial decision
      recording*. <sup>e</sup>
    - "Cancel Review Round" is offered only while no reviewer of the round
      has responded to the invitation or completed a review. A decline
      rules out cancelling just as an acceptance does. Past that point the
      button is simply absent, with no explanation in its place. <sup>f</sup>
    - While the submission stands **declined**, all of the above are replaced
      by "Revert Decline". A Journal Manager or Site Administrator also gets
      "Delete". <sup>e</sup>
12. **Creating and cancelling rounds.**
    - "Create New Review Round" opens round N+1. The wizard offers the
      previous round's revised files, already ticked, to carry over as the
      new round's review files. Reviewers are *not* carried over, so the new
      round starts as "Waiting for reviewers to be assigned." The previous
      round becomes a past round (Rule 10). <sup>g</sup>
    - "Cancel Review Round" removes the current round entirely. The round,
      its reviewer invitations and its file links disappear, and a withdrawn
      invitation vanishes from the reviewer's own assignment lists without a
      trace. The submission lands on the previous round, whose status box no
      longer recalls a revision request recorded on it ⚠ [A6](#a6). If
      Round 1 was cancelled, the submission goes back to the Submission
      stage. The files themselves stay in the submission's records.
      <sup>f</sup>
13. <a id="recommendations"></a> **Recommendations.** A recommending editor
    sees three recommendation buttons in place of the decision buttons:
    "Recommend Revisions", "Recommend Accept", "Recommend Decline". The flow
    belongs to *Editorial decision recording*; the limitation itself is set
    in *Stage participants*. The buttons require a deciding editor to also
    be assigned to the stage. A recommending editor who is the only
    editorial participant gets no buttons at all. Instead, the
    "Recommendation" box reads "You can not make a recommendation until an
    editor is assigned with permission to record a decision." On the
    deciding editor's screen, once a recommendation for the selected round
    exists, a box headed "Recommendation" lists the recommendation or
    recommendations recorded, for example "Accept Submission", with no
    further detail. The round status walks the three recommendation
    sentences of Rule 5. <sup>e</sup>
14. <a id="author-view"></a> **The author's view** of the same screen, per
    round, always shows the Revisions Uploaded panel with the upload button
    (Rule 9) and the stage's discussions. A "Notifications" list appears
    once an editor has sent the author a letter (Rule 16). A list of the
    reviews they may read appears once such a review exists (Rule 15). A
    submission fresh in review therefore shows only the two ever-present
    panels; the other two appear once their preconditions are met. When the
    editor has asked for a formal response to the reviews, a response panel
    appears as well. That flow belongs to *Author response to reviews*. On a
    press that panel currently never appears, even when a response was
    invited; the finding is recorded with that feature. <sup>a</sup>
15. <a id="author-read-review"></a> **Reading reviews as the author.** Only
    reviews conducted **openly** are ever listed for the author, and only
    once completed. Until such a review exists, the author's screen shows no
    reviewers list at all, not even an empty one. Anonymous reviews never
    appear, whatever their state. Each listed review offers "Read Review",
    which opens a window with three parts. First, the reviewer's name,
    completion date and recommendation; on a press no recommendation exists
    to show ⚠ [OMP2](#omp2). Second, the review text the author is meant to
    see: for form-based reviews, only the parts marked for authors; for
    free-text reviews, only remarks shared with the author. On a journal the
    window currently shows no review text at all ⚠ [OJS1](#ojs1). Third, a
    section for files the reviewer attached ⚠ [A3](#a3). <sup>j</sup>
16. <a id="author-emails"></a> **The "Notifications" list** on the author's
    review stage holds the emails editors sent the author about this
    submission. Each row is a subject line and a date. Clicking one opens
    the full letter read-only in a side panel. This is where the author
    re-reads a decision letter. Until the first such letter, the list is
    absent entirely, not shown empty. <sup>k</sup>
17. **Old addresses.** A bookmarked author link of the form used by earlier
    versions (`{journal}/authorDashboard/submission/{id}`) lands on My
    Submissions with the submission's workflow open. The old per-round tab
    address from those versions
    (`{journal}/authorDashboard/reviewRoundInfo/{id}`) answers with a bare
    "404 Not Found" page, with or without an id. <sup>o</sup>

## Side effects

- **Author uploads a revised file.** The round status flips per Rule 7, and
  an automatic email with the subject "Revised Version Uploaded" goes to the
  Journal Managers, Editors and Section Editors assigned to the stage. It is
  sent under the author's own name and address. All of this takes effect the
  moment the file is attached in the upload window's first step. Closing the
  window through its header "Close" without finishing keeps the file and the
  email, and the "Revisions Uploaded" panel behind the window lists the file
  as it closes. Pressing the window's own "Cancel" link after the file was attached,
  though, removes the file again while the email already sent stands
  ⚠ [A11](#a11). To avoid a flood, the same editor is not emailed again
  for further uploads within a day unless they have signed in since the
  last notice. <sup>l</sup>
- **Request Revisions decision.** Each author assigned to the stage gets a
  task naming the submission in the header's Tasks panel. On a journal it reads "Revision required.", on a
  press "Revisions to consider in External Review." ⚠ [OMP3](#omp3). Their
  row on My Submissions reads "Revision requested" with a "Submit revisions"
  button in both apps (the list itself belongs to *My Submissions*). The
  task disappears when a revised file is uploaded. It does not return if the
  only revised file is deleted: the status and the My Submissions row revert
  to their requested state (Rule 7) while the task list stays silent
  ⚠ [A9](#a9). The new-round variant's task reads "Resubmit for review." in
  both apps and stays in the author's list even after they upload
  ⚠ [A1](#a1). The decision's own notifications and emails belong to
  *Editorial decision recording*. <sup>m</sup>
- **Round created.** An internal round-status notice record is created. It
  currently surfaces nowhere (footnote only). <sup>n</sup>
- **Round cancelled.** The round's reviewer invitations are withdrawn. The
  authors can be notified by email as part of the decision, and so can the
  reviewers when the round has any (the wizard offers the reviewer-notice
  step only then). The email steps belong to *Editorial decision
  recording*. <sup>f</sup>

## Settings that modify behavior

- **Minimum Confirmed Reviews Required** (the journal's review setup; see
  *Review setup & review forms*). When set, the round status box shows
  "Minimum number of confirmed reviews required: {N}." while reviews are
  being gathered. While confirmed reviews remain below that minimum, this
  line replaces the confirmed-review sentence ("All reviews are confirmed and
  a decision is needed.") alone; the round's own sentence still appears
  beneath it: "Awaiting responses from reviewers." while reviews are
  underway, "New reviews have been submitted." once a review arrives. Once
  the confirmed reviews reach the minimum, the box reads "Minimum number of
  confirmed reviews required: {N}." with "Minimum required number of
  reviews have been confirmed. A decision is needed." beneath it.
  <sup>r</sup>
- **Reviewer suggestions enabled** (publication settings). Adds a reviewer
  suggestions panel to the stage. The panel belongs to *Reviewer
  suggestions*. <sup>a</sup>
- **Review type per assignment** (open or anonymous, chosen when the
  reviewer is assigned; see *Reviewer assignment & management*). Gates the
  author's access to each review (Rule 15).

## Cross-feature interactions

- **Reviewer assignment & management**: the Reviewers panel on this stage.
  Adding, reminding, thanking and unassigning reviewers, and the editor's
  reading, completing and modifying of reviews. This spec covers only the
  author-side reading (Rule 15).
- **Editorial decision recording**: every button of Rule 11 and the
  recommendation controls open that feature's wizard. This spec covers the
  buttons' presence and what each decision does to the round.
- **Stage participants**: who is assigned to the stage, and the
  limited-to-recommendations setting behind Rule 13.
- **Author response to reviews**: the response request and the author's
  response panel that appear on this stage.
- **Reviewer suggestions**: the suggestions panel, shown here when enabled.
- **Submission files**: the file manager and upload wizard mechanics behind
  the Files for Review and Revisions Uploaded panels.
- **Tasks & discussions**: the Discussions panel present on this stage in
  both views.
- **Submission stage**: the "Send for Review" decision that opens Round 1.
- **Copyediting stage**: sending a submission back from copyediting returns
  it to its review round. That round's status box usually resumes the
  reviewer-derived sentences; "Returned back to review." shows only in the
  all-confirmed state (Rules 5–6).
- **Reviewer's review**: a reviewer revisits their own past rounds on their
  reviewer page, including a round-history window. None of that appears on
  this screen.

## Canonical scenarios

Scenarios 4, 7 and 15, and the second submission of scenario 11, run on
separate scratch journals with throwaway accounts: an editor whose mailbox
scenario 4 reads, a reviewer whose assignment lists scenario 7 reads, and a
Section Editor as the only editorial participant; scenario 15's journal
alone has "Minimum Confirmed Reviews Required" set to 2 (the others keep the
default of 0). Every other scenario runs on the seeded journal with ready
accounts and scratch submissions. Accounts, passwords and the tooling recipe
are in the footnote. <sup>s</sup>

1. **Round 1 opens with the submission**

   Given: Editor, on the Submission stage of a new submission that has two
   submission files.

   - **"Send for Review"**: record the decision that sends the submission
     to review, unticking the second file in its wizard so only the first
     goes with it: the workflow menu shows "Review" with the entry "Review
     Round 1" selected, the page title reads "Review (Round 1)", the box at
     the top reads "Round 1 Status — Waiting for reviewers to be assigned.",
     and the "Files for Review" panel lists the file chosen when sending to
     review.
   - **"Current Review Files For Round 1"**: open the "Files for Review"
     panel's selection dialog: it lists the file already under review
     alone, with a checkbox. Tick "Show files from all accessible workflow
     stages.": the second file, still on the Submission stage, joins the
     list. Tick it and confirm: "Review files updated." appears and the
     panel lists both files.
   - **Uploading from the dialog**: open the dialog again and upload a new
     file from it, then confirm: "Review files updated." appears and the
     panel lists the new file too; the files listed before are still
     listed, because nothing in this dialog deletes a file.
   - **Control**: the "Review" entry holds "Review Round 1" alone; a later
     round comes only from "Create New Review Round" (scenario 6).
     <sup>s</sup>

2. **The status line follows the reviewers**

   Given: Editor, on a Round 1 that reads "Waiting for reviewers to be
   assigned.", with a Reviewer of the journal ready to review.

   - **"Add Reviewer"**: in the Reviewers panel add the reviewer (the
     request itself belongs to *Reviewer assignment & management*): the box
     reads "Awaiting responses from reviewers."
   - **The reviewer's review**: Reviewer: accept the request, then submit
     the review. Editor: the box reads "New reviews have been submitted."
   - **"Read Review"**: in the Reviewers panel open "Read Review" and
     confirm "Mark as Complete" in the "Review Details" window: the box
     reads "All reviews are confirmed and a decision is needed."
   - **Control**: with the request accepted and the review not yet
     submitted, the box still reads "Awaiting responses from reviewers.".
     <sup>s</sup>

3. **Request revisions within the round**

   Given: Editor, on the current round of a submission in review, whose
   Author is ready to sign in.

   - **"Request Revisions"**: press it: the wizard opens on the choice
     "Require New Review Round" with "Revisions will not be subject to a
     new round of peer reviews." preselected. Keep it and complete the
     wizard: the box reads "Revisions have been requested."
   - **Author**: sign in: the header's Tasks panel holds "Revision
     required." naming the submission (on a press "Revisions to consider in
     External Review." [OMP3](#omp3)), and the submission's review stage
     shows the "Upload revisions" button at the bottom of the screen.
   - **Control**: the round's "Revisions Uploaded" panel still reads "No
     Items": the sentence stands while no revised file has arrived.
     <sup>s</sup>

4. **Author uploads a revision**

   Given: Author, on a round that reads "Revisions have been requested.",
   with one Editor assigned to the stage and a second Editor of the journal
   not assigned to it.

   - **"Upload revisions", first step only**: press "Upload revisions",
     attach a file in the upload window's first step, then close the
     window through its header "Close" without finishing, accepting the
     browser's leave-without-saving prompt if it asks (the window's own
     "Cancel" link is a different path [A11](#a11)): the "Revisions
     Uploaded" panel lists the file all the same.
   - **The Editor's screen**: Editor: the box reads "Revisions have been
     submitted and a decision is needed."
   - **Tasks**: Author: the "Revision required." task is gone from the
     header's Tasks panel.
   - **Mailbox**: the assigned Editor's mailbox holds an email with the
     subject "Revised Version Uploaded", sent under the Author's own name
     and address.
   - **A second upload the same day**: Author: press "Upload revisions"
     again and complete the upload: the panel lists both files, and the
     assigned Editor's mailbox holds no second notice.
   - **After the Editor signs in**: Editor: sign in again. Author: upload a
     third file: a fresh "Revised Version Uploaded" email arrives in the
     Editor's mailbox.
   - **Control**: the Editor not assigned to the stage has no "Revised
     Version Uploaded" email in their mailbox. <sup>s</sup>

5. **Request revisions toward a new round**

   Given: Editor, on the current round of a submission in review, whose
   Author is ready to sign in.

   - **"Request Revisions", new round**: press "Request Revisions", choose
     "Revisions will be subject to a new round of peer reviews.", and
     complete the wizard, which continues under the heading "Resubmit for
     Review": the box reads "Revisions requested from the author to be
     taken to a new review round."
   - **Author**: sign in: the header's Tasks panel holds "Resubmit for
     review."; on the review stage press "Upload revisions" and complete
     the upload: the "Revisions Uploaded" panel lists the file.
   - **The Editor's screen**: Editor: the box reads "Revisions submitted. A
     new review round needs to be created."
   - **A further file**: Author: the "Revisions Uploaded" panel's own
     "Upload" control opens the same upload wizard (the bottom "Upload
     revisions" button is gone and the "Resubmit for review." task stays
     [A1](#a1); neither is a pass or fail here).
   - **Control**: after the in-round upload of scenario 4, the bottom
     "Upload revisions" button is still offered. <sup>s</sup>

6. **A new round**

   Given: Editor, on a Round 1 with one reviewer and a revised file in its
   "Revisions Uploaded" panel (the end of scenario 5).

   - **"Create New Review Round"**: press it: the wizard's file step offers
     the revised file, already ticked. Keep it and record the decision: the
     menu gains "Review Round 2", selected; the page title reads "Review
     (Round 2)"; the box reads "Round 2 Status — Waiting for reviewers to
     be assigned."; Round 2's "Files for Review" panel lists the carried
     file, and its Reviewers panel lists no reviewer.
   - **"Review Round 1"**: select it: its reviewers and files show, there
     are no decision buttons, and the box, headed "Status", reads "The
     submission has been advanced to the next round of review".
   - **Control**: select "Review Round 2" again: the decision buttons are
     back and the box is headed "Round 2 Status". <sup>s</sup>

7. **Cancel a round**

   Given: Editor, on a Round 2 whose only reviewer has been invited and has
   not responded, and a second submission on its Round 1.

   - **"Cancel Review Round"**: press it and confirm through the wizard:
     "Review Round 2" disappears from the menu and the submission stands
     on Round 1.
   - **The reviewer's lists**: Reviewer: the withdrawn invitation is in
     none of the reviewer dashboard's assignment lists.
   - **Round 1 cancelled**: Editor: on the second submission press "Cancel
     Review Round" and confirm: the submission is back on the Submission
     stage.
   - **Control**: before the cancel, the same Reviewer's assignment lists
     held the Round 2 request. <sup>s</sup>

8. **Cancelling is blocked once a review is in**

   Given: Editor, on the current round of a submission whose one reviewer
   completed a review, and a second submission whose round's only reviewer
   declined the request.

   - **The buttons**: "Cancel Review Round" is not among the decision
     buttons and nothing stands in its place; "Request Revisions", "Accept
     Submission", "Create New Review Round" and "Decline Submission" are
     offered.
   - **A declined reviewer**: on the second submission's round, "Cancel
     Review Round" is absent equally.
   - **A declined reviewer beside an accepted one**: on a third submission
     whose round holds one reviewer who declined the request and one who
     accepted it, the box reads "Awaiting responses from reviewers.": the
     declined reviewer is not counted in the status. "Cancel Review Round"
     is absent here too.
   - **Control**: on a round whose only reviewer has not yet responded,
     "Cancel Review Round" is offered (scenario 7). <sup>s</sup>

9. **Accept out of review**

   Given: Editor, on the current round of a submission in review.

   - **"Accept Submission"**: press it (the highlighted button) and
     complete the wizard: the submission moves to the Copyediting stage.
   - **The review stage afterwards**: select "Review" › "Review Round 1":
     the round is still listed and the box reads "The submission is
     currently in the Copyediting stage."
   - **A past round after acceptance**: on a second submission that went
     through two rounds and was accepted from Round 2, select "Review" ›
     "Review Round 1": the box, headed plain "Status", reads "The
     submission advanced to the next review round, was accepted, and is
     currently in the Copyediting stage."
   - **Control**: on the first submission the box is headed plain "Status",
     no longer "Round 1 Status". <sup>s</sup>

10. **Decline, revert, delete**

    Given: Journal Manager, and a Section Editor assigned to the stage, on
    the current round of a submission whose one reviewer accepted the
    request and has not submitted a review.

    - **"Decline Submission"**: Journal Manager: press it and complete the
      wizard: the box reads "Submission declined." and the decision buttons
      are replaced by "Revert Decline" and "Delete".
    - **The Section Editor's screen**: Section Editor: on the same declined
      submission the buttons are "Revert Decline" alone, with no "Delete".
    - **"Revert Decline"**: Journal Manager: press it and complete it: the
      submission is back in review and the box again reads the round's
      reviewer sentence, "Awaiting responses from reviewers.".
    - **Control**: before the decline, no "Delete" stood among the Journal
      Manager's buttons. <sup>s</sup>

11. **Recommend-only round**

    Given: a Section Editor assigned to the stage and limited to
    recommendations, alongside a deciding Editor, on the current round of
    a submission whose one reviewer declined the request (a declined
    reviewer counts as a reviewer record); and a second submission where
    such a Section Editor is the only editorial participant.

    - **The recommending editor's screen**: Section Editor: open the
      current round: there are no decision buttons; the buttons read
      "Recommend Revisions", "Recommend Accept", "Recommend Decline", and
      the box reads "Awaiting recommendations from editors."
    - **Recording**: record "Accept Submission" as a recommendation (the
      wizard belongs to *Editorial decision recording*).
    - **The deciding Editor's screen**: Editor: the "Recommendation" box
      lists "Accept Submission", and the status box reads "All
      recommendations are in and a decision is needed."
    - **Sole recommending editor**: Section Editor: open the second
      submission's round: no buttons of either kind; the "Recommendation"
      box reads "You can not make a recommendation until an editor is
      assigned with permission to record a decision."
    - **No reviewer record**: on that second submission's round, which has
      no reviewer, the status box reads "Waiting for reviewers to be
      assigned.", not "Awaiting recommendations from editors.": the
      recommendation sentences need at least one reviewer record.
    - **Control**: before the recommendation is recorded, the deciding
      Editor's screen shows no "Recommendation" box. <sup>s</sup>

12. **Author reads an open review**

    Given: Author, with two submissions in review: the first with an open
    review accepted and not yet submitted, and a decision letter already
    sent to them; the second with a completed anonymous review and no
    letter.

    - **Fresh in review**: open the second submission's review stage: the
      "Revisions Uploaded" panel and the Discussions panel are there; no
      "Notifications" list, no reviewers list (not even an empty one), and
      no "Upload revisions" button, the round having no revision request.
    - **An open review under way**: open the first submission's review
      stage: no reviewers list yet.
    - **Reviewer**: the open reviewer types "Shared remarks for the
      author." in "For author and editor" and submits the review (on a
      journal, with the recommendation "Accept Submission").
    - **"Read Review"**: Author: the first submission's review stage now
      lists the reviewer with "Read Review". Open it: the window shows the
      reviewer's name, completion date and recommendation (none on a press
      [OMP2](#omp2)); on a press the typed remark follows; on a journal no
      review text shows at all [OJS1](#ojs1). The window's attachments
      section is outside this scenario's pass or fail and is asserted by
      no test [A3](#a3).
    - **"Notifications"**: on the same screen the "Notifications" list
      holds the decision letter as a subject line and a date. Click it: the
      full letter opens read-only in a side panel.
    - **Old addresses**: open `{journal}/authorDashboard/submission/{id}`
      with the first submission's id: My Submissions opens with that
      submission's workflow open. Open
      `{journal}/authorDashboard/reviewRoundInfo/{id}`, then the same
      address without an id: a bare "404 Not Found" page each time.
    - **Control**: the second submission's review stage, its anonymous
      review completed, shows no reviewers list at all, not even an empty
      one. <sup>s</sup>

App-specific:

13. **Straight to External Review** {OMP}

    Given: Press Editor, on the Submission stage of a new monograph.

    - **"Send to External Review"**: choose it, which skips Internal
      Review: External Review's "Review Round 1" opens exactly as in
      scenario 1, and scenarios 2–12 run identically on the press
      [OMP1](#omp1).
    - **The workflow menu**: it also carries the separate "Internal Review"
      stage entry, whose screens belong to *Internal Review stage*.
    - **Control**: the External Review screen is scenario 1's, with nothing
      added by the press's extra stage: the same panels, buttons and status
      box. <sup>s</sup>

14. **No review stage on a preprint server** {OPS}

    Given: Preprint Server Manager, on any preprint's workflow.

    - **The workflow menu**: it offers no Review entry. The stages go
      straight to Production, and no round, reviewer or review file
      surface exists anywhere on the screen.
    - **Control**: the same screen offers the Production stage's own
      controls (for example posting or declining the preprint), so the
      workflow itself is working. <sup>p</sup> <sup>s</sup>

15. **A minimum of confirmed reviews** {OJS OMP}

    Given: Editor, on a scratch journal whose "Minimum Confirmed Reviews
    Required" is 2, on the current round of a submission whose one reviewer
    accepted the request.

    - **The review underway**: the box reads "Minimum number of confirmed
      reviews required: 2." with "Awaiting responses from reviewers." beneath
      it.
    - **The review submitted**: Reviewer: submit the review. Editor: the
      box reads "Minimum number of confirmed reviews required: 2." with "New
      reviews have been submitted." beneath it.
    - **"Read Review"**: in the Reviewers panel open "Read Review" and
      confirm "Mark as Complete" in the "Review Details" window: the box
      reads "Minimum number of confirmed reviews required: 2." alone; "All
      reviews are confirmed and a decision is needed." does not appear.
    - **Control**: on the seeded journal, whose "Minimum Confirmed Reviews
      Required" is 0, scenario 2's confirmed review reads "All reviews are
      confirmed and a decision is needed." with no minimum line.
      <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - after "Request Revisions", the author's only revised file deleted: the revisions task back in the author's Tasks panel ([A9](#a9)): the guard the issue report proposes
  - on a round with no revision request, the "Revisions Uploaded" description makes no claim about a request ([A10](#a10)): the guard the issue report proposes
  - scenario 4's first bullet read with no reload: the "Revisions Uploaded" panel listing the file as the closed upload window goes (Side effects, "Author uploads a revised file"): the OJS suite reloads the page before it reads the panel
  - after "Resubmit for Review" and the Author's first uploaded file: "Upload revisions" still offered ([A1](#a1)): the guard the issue report proposes
- **Rarely met**:
  - "Returned back to review." once every review is confirmed, and the reviewer sentences until then (Rules 5–6, Cross-feature): sending a submission back from Copyediting is not an ordinary week's action, and the sentence needs every review confirmed after the return
  - deleting the only revised file flipping the status back to "requested" (Rule 7): an author seldom deletes their only revised file; the task half of the path is A9
  - "New editorial recommendations have been submitted." with a second recommending editor pending (Rule 5): two recommending editors on one submission is not an ordinary week's set-up; scenario 11 walks the other two recommendation sentences with one
  - "Submission accepted." (Rule 5): after "Accept Submission" the submission sits on Copyediting and the box reads Rule 4's stage sentence (scenario 9), so an editor does not meet this sentence on this stage
- **Nothing new to test**:
  - Funding Coordinator, the one assistant-level group the stage's assignment dialog offers (Actors row 1; the same screen as the editorial roles of scenario 1)
  - editorial roles filing revisions through the "Revisions Uploaded" panel's own controls (Actors row 4; the panel of scenario 4)
  - round created: the internal notice surfaces nowhere (Side effects)
- **Register carries it**:
  - A5 (production assistant roles with no way in; one assigned elsewhere refused; Actors row 1)
  - A2 (the same status box for every role; the author gets the editor's wording; Actors row 2, Rule 4)
  - A7 (unticking a file changes nothing the editor can see; the checkboxes do not mirror the panel; Rule 8)
  - A1 (the bottom "Upload revisions" button gone after the first new-round upload while the panel's "Upload" still works; Rule 9)
  - A1 (the "Resubmit for review." task staying after the upload; Side effects)
  - A8 (a past round's panels still act: a reviewer or file lands there; Rules 1, 10)
  - OMP2 (no recommendation line on a press; Rule 15)
  - OJS1 (the journal's window showing no review text; Rule 15)
  - A3 (the window's attachments section; Rule 15)
  - A4 (a round whose only reviewers declined reading "All reviews are confirmed and a decision is needed."; Rule 6)
  - A9 (the author's revisions task never returning after the only revised file is deleted; Rule 7, Side effects)
  - A10 (the "Revisions Uploaded" description on a round with no revision request; Rule 9)
  - A6 (the restored round's box no longer recalling its revision request; Rule 12)
  - A11 (the upload window's "Cancel" link removing the attached file while the "Revised Version Uploaded" email stands; Side effects)
  - OMP3 (the press's task wording "Revisions to consider in External Review."; Side effects)
- **No seed**:
  - "A review is overdue." winning over an unread review and reviews still underway (Rules 5–6): no seed backdates a request or a review deadline
- **Owned by another feature**:
  - the workflow address of a submission one has no right to, and its access error (Actors; *Workflow screen & stage access*, scenario 6)
  - "The {stage} stage has not yet been initiated." before the stage starts (Rule 4; *Workflow screen & stage access*, scenario 2)
  - the cancelled round's files staying in the submission's records, which no screen of this stage lists once the round is gone (Rule 12; *Submission files*)
  - the author response panel once a response is requested, never on a press (Rule 14; *Author response to reviews*, scenario 4)
  - the Discussions panel in both views (Rule 14; *Tasks & discussions*)
  - the My Submissions row "Revision requested" with "Submit revisions" (Side effects; *My Submissions*, scenario 4)
  - round cancelled: the author and reviewer email steps (Side effects; *Editorial decision recording*)
  - the box once the confirmed reviews reach the minimum, "Minimum required number of reviews have been confirmed. A decision is needed." under the minimum line (Settings; *Review setup & review forms*, scenario 13)
  - the reviewer suggestions panel when suggestions are enabled (Settings; *Reviewer suggestions*, scenario 2)
  - the Reviewers panel's actions, the decision wizard, the participants and the file-manager mechanics (Cross-feature; *Reviewer assignment & management*, *Editorial decision recording*, *Stage participants*, *Submission files*)
  - the press's separate, earlier Internal Review stage [OMP1](#omp1) (Purpose; *Internal Review stage* {OMP})

## Findings register

Verdicts are the author's judgment (claude, 2026-07-31), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | After "Resubmit for Review", the Author's "Upload revisions" button disappears with their first file | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OJS1](#ojs1) | On a journal, the author's "Read Review" window shows no review text; remarks shared with the author are missing (a press shows them) | 🐞 | user-visible | — |
| [A9](#a9) | Deleting the only revised file flips the status back but never returns the author's revisions task | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A10](#a10) | The review round's "Revisions Uploaded" list says revisions were requested on rounds where none were | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A2](#a2) | The author sees the editor's status wording; the author-tailored wording exists but is never shown | ❓ | user-visible | — |
| [A3](#a3) | What the read-review window's attachments section lists: observation recorded privately with the maintainer pending a fix | ❓ | latent | — |
| [A4](#a4) | A round whose only reviewers declined reports "All reviews are confirmed and a decision is needed." | ❓ | user-visible | — |
| [A5](#a5) | No screen path assigns a production assistant to the review stage; one assigned elsewhere is refused entry | ❓ | minor | — |
| [A6](#a6) | After a round is cancelled, the restored round's status box no longer mentions its unresolved revision request | ❓ | user-visible | — |
| [A7](#a7) | Unticking a file in the review-files dialog changes nothing the editor can see, and the checkboxes do not mirror the panel | ❓ | minor | — |
| [A8](#a8) | A past round's panels still act: a reviewer added or a file uploaded there lands in the closed round | ❓ | user-visible | — |
| [A11](#a11) | The upload window's "Cancel" link removes the attached file, but the "Revised Version Uploaded" email already sent to the editors stands | ❓ | minor | — |
| [OMP2](#omp2) | A press collects no reviewer recommendation (intended, confirmed upstream 2026-08-25), and the decision letter still prints "Recommendation:" with nothing after it | ❓ | user-visible | rebase check (claude), 2026-08-25 — form-field half intended |
| [OMP3](#omp3) | On a press the fresh revisions task reads "Revisions to consider in External Review.", not the journal's "Revision required." | ❓ | minor | — |
| [OMP1](#omp1) | Presses run an additional Internal Review stage before External Review | ✅ | — | — |
| [A12](#a12) | Retired: an author who closed "Upload revisions" after the file step saw an empty "Revisions Uploaded" panel until a page reload; fixed in pkp/ui-library#853 before its merge, never on `main` | ✅ | retired | re-probe at the PR head (claude), 2026-09-23 — fixed before merge |

### All apps

<a id="a1"></a>
**A1 — After "Resubmit for Review", the Author's "Upload revisions" button disappears with their first file** · 🐞 · low.
When an editor requests revisions that will go to a new review round,
the Author's review page shows two upload buttons: "Upload revisions" in
the column to the right of the round, and "Upload" in the heading of the
"Revisions Uploaded" list. As soon as the Author uploads one file,
"Upload revisions" disappears; "Upload" stays. When revisions are
requested without a new round, both stay after the first file.

The page does not say why one button went. An Author who used "Upload
revisions" for the first file is left to conclude that no more files can
be added, or to try the other button. The fix is one line in each of two
ui-library files.
Basis: probe, 2026-10-02. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — Author-tailored status wording never shown** · ❓ · user-visible.
The product carries author-specific wordings for two round statuses, for
example "New reviews have been submitted and are being considered by the
editor." and a reassuring no-action-needed text for an overdue review. The
status box the author sees uses the editor wording instead ("A review is
overdue."), which invites the author to worry or chase. Earlier versions
showed the tailored texts.
Question: should the author's status box use the author wordings again?
Lean: yes. The texts exist, are maintained, and read as deliberate design.
Basis: probe (2026-07-31; the author's box is character-identical to the
editor's at every state checked); the tailored texts themselves are code
reading. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Read-review attachment listing recorded privately** · ❓ · latent.
What the author's "Read Review" window lists in its attachments section was
observed live on both the journal and the press. The observation is recorded
privately with the maintainer, pending a fix. Until that resolves, this spec
makes no claim about the window's attachment listing, and tests must not
assert anything about what that section lists (scenario 12 excludes it
explicitly).
Basis: probe (2026-07-31, both apps; routed to the maintainer's private
file). <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — All-declined round claims confirmed reviews** · ❓ · user-visible.
A round where reviewers were invited but every one of them declined reports
"All reviews are confirmed and a decision is needed." No review exists, and
none was confirmed. The sentence "Waiting for reviewers to be assigned."
appears only while the round has no reviewer records at all.
Question: what should a round with only declined reviewers report? Lean: the
"decision is needed" half is right, the "all reviews are confirmed" half is
wrong. This is misleading wording rather than misbehavior.
Basis: probe (2026-07-31; a round whose only invited reviewer declined shows
the confirmed-reviews sentence); reproduces identically on a press
(2026-07-31). <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — No path assigns a production assistant to the review stage** · ❓ · minor.
The review stage's participant-assignment dialog offers no production
assistant groups (Copyeditor, Layout Editor, Proofreader). One assigned on
another stage who selects the review stage sees only "You don't currently
have access to that stage of the workflow." So no screen path gives those
roles any part in review, although the file panels' underlying permissions
would admit an assistant. The Funding Coordinator, also an assistant-level
group, is offered by the same dialog on both apps, by design.
Question: are the production assistant roles meant to be assignable to the
review stage? Lean: the dialog's roster is the intended gate, and the
file-panel permissions naming assistants are leftovers. Whether an assistant
placed on the stage by other means would gain access was not observed.
Basis: probe (OJS, 2026-07-31); the dialog's role roster read on both apps
(2026-07-31). <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — Cancelling a round forgets the previous round's revision request** · ❓ · user-visible.
After "Cancel Review Round" removes Round 2, the restored Round 1 reports
"Awaiting responses from reviewers." This happens even though a request for
revisions toward a new round had been recorded on it and the author's
revised file still sits in its Revisions Uploaded panel. The status box no
longer says revisions were requested or submitted, so nothing on the screen
recalls the round's open business.
Question: should the restored round's status still reflect its unresolved
revision request? Lean: yes. The box falls back to reviewer bookkeeping and
hides what the round was actually waiting on.
Basis: probe (2026-07-31). <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Unticking a review file changes nothing the editor can see** · ❓ · minor.
In the "Current Review Files For Round {N}" dialog, unticking a listed file
and confirming reports "Review files updated." The Files for Review panel
still lists the file exactly as before; only reopening the dialog shows the
cleared checkbox. A file the round received through a decision arrives in
the dialog unticked even while the panel lists it. So does a file uploaded
from the dialog itself. The checkboxes therefore do not mirror the panel to
begin with.
Question: what is the checkbox meant to control, and does a reviewer of the
round still get an unticked file? Lean: the checkbox drives a visibility
flag the editor's own panel ignores. Whether the reviewer's file list honors
it is the observation that would settle intent.
Basis: probe (OJS, 2026-07-31); reproduces on OMP (2026-07-31), including for
a file uploaded from the dialog itself. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — Past rounds still accept reviewers and files** · ❓ · user-visible.
A past round is presented as closed: its decision buttons are gone and its
status reads "The submission has been advanced to the next round of review".
Yet its panels still work. Adding a reviewer there sends a live invitation
recorded on the past round, and completing an upload lands the file in the
past round's panel. A round's record can therefore change after review has
moved on, with nothing marking the panels read-only.
Question: are a past round's reviewer and file panels meant to stay editable?
Lean: the withdrawn decision buttons say the round is closed, and a reviewer
invited into a superseded round reads as an accident waiting to happen. But
the acting roles are entitled to manage those panels, so it may be
deliberate flexibility.
Basis: probe (2026-07-31; both mutations driven on OJS, and the retained
controls render identically on OMP). <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Deleting the only revised file leaves no revisions task behind** · 🐞 · low.
When the only revised file on a round is deleted, by the editor or by the
author, the round's status and the author's My Submissions row correctly
return to their revisions-requested state. The revisions task, however,
never comes back: the Tasks panel shows no task where the decision had put
"Revision required." The author's row still reads "Revision requested"
with "Submit revisions", so what is missing is the prompt, not the path.
The same fault keeps the editors' copyediting notice from coming back
(*Copyediting stage* [A7](U32-copyediting-stage.md#a7)).
Basis: probe, 2026-10-04 (OJS and OMP, both deleter
roles; the claim check 2026-07-31). <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — The review round's "Revisions Uploaded" list says revisions were requested on rounds where none were** · 🐞 · low.
Every review round has a "Revisions Uploaded" list. Under its heading,
the list says "These files have been submitted by the author after
revisions were requested". It says this on every round, including rounds
where no revisions were ever requested.
The editors and the author see the same sentence above an empty list.
No file or decision is affected, and nothing else on the screen is
wrong. A reader who trusts the sentence is told that revisions were
asked for when they were not.
Since: 2026-08-02 · Basis: probe, 2026-10-04. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — The upload window's "Cancel" removes a file the editors were already told about** · ❓ · minor.
The "Revised Version Uploaded" email and the status flip happen the moment
the author attaches a file in the upload window's first step. When the
author then presses the window's own "Cancel" link instead of finishing,
the file is removed again: the "Revisions Uploaded" panel is back to "No
Items" and the editor's box back to "Revisions have been requested.", while
the email already sent stands. Closing the window through its header
"Close" keeps the file. The editor is sent to look for a revision that is
gone, and nothing on the screen explains the email. Seen once, on a
journal.
Question: should the notice wait until the author finishes the upload, or
should "Cancel" keep a file the editors were already told about? Lean: the
notice is early; the file removal reads as the window doing what its
"Cancel" promises.
Since: 2026-09-12 · Basis: test run (a journal, one run; the press was not
driven on this path). <sup>[f-a11](#fn-a11)</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — Author's read-review window shows no review text** · 🐞 · user-visible.
On a journal, the "Read Review" window an author opens on a completed open
review gives the reviewer's name, completion date and recommendation, and
then no review text at all. Even a remark the reviewer explicitly shared
with the author is missing. The decision letter's reviewer appendix stops at
the recommendation the same way (that letter belongs to *Editorial decision
recording*). On a press the same window shows the shared remarks.
Editor-only remarks are correctly absent in both apps. The author is the
reader this window exists for, and on a journal they get none of the text.
Basis: probe (2026-07-31, OJS with OMP contrast). <sup>[f-ojs1](#fn-ojs1)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Internal Review stage** · ✅ · intended divergence.
A press runs an additional Internal Review stage between Submission and
External Review. It has the same round machinery, its own decision labels
("Send to External Review" closes an internal round), and its own revision
file spaces. A monograph may also skip it entirely (scenario 13). The
External Review stage this file documents is unchanged by its presence. Its
own screens belong to *Internal Review stage* {OMP}.
Basis: code (the stage roster and decision list are press-specific by
design); parity and the Internal Review menu entry observed live
(2026-07-31). <sup>[f-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — No reviewer recommendation on a press** · ❓ · user-visible.
On a press, the reviewer's review form offers no recommendation field, so
the author's "Read Review" window shows no recommendation line. The decision
letter's per-reviewer section still prints the label "Recommendation:" with
nothing after it (the letter itself belongs to *Editorial decision
recording*). On a journal the recommendation runs through all three places.
Question: is a recommendation-free review the press's intended design? Lean:
the missing form field reads as deliberate, but a letter printing an empty
"Recommendation:" label is a defect either way.
Basis: probe (2026-07-31, OMP with OJS contrast). <sup>[f-omp2](#fn-omp2)</sup>

> **Upstream answer — rebase check (claude), 2026-08-25**: the form-field
> half is intended. Upstream OMP now flips
> `Application::hasCustomizableReviewerRecommendation()` to `false` outright
> (commit titled "Disable customizable reviewer recommendations"), so the
> suppression is an app-level design flag, not a template accident. The
> letter's empty "Recommendation:" label remains the open defect half.

<a id="omp3"></a>
**OMP3 — The press's fresh revisions task is worded differently** · ❓ · minor.
After a Request Revisions decision on a press, the author's task-list entry
reads "Revisions to consider in External Review." where a journal's reads
"Revision required." Everything around it is identical in both apps: the
"Revision requested" row on My Submissions, the "Submit revisions" button,
the task clearing on upload, and the new-round variant's "Resubmit for
review." task.
Question: is the press's different task wording intended? Lean: unintended.
The press's internal-review bookkeeping deletes the task the decision just
created, and a second mechanism refiles it under its own wording. The effect
is wording-level only.
Basis: probe (2026-07-31, the same flow driven on both
apps). <sup>[f-omp3](#fn-omp3)</sup>

### Retired

<a id="a12"></a>
**A12 — An upload window closed at the file step leaves the author's panel empty** · ✅ · retired. Fixed in pkp/ui-library#853 at `51f0c727` before its merge, 2026-09-23; never on `main`. <sup>[f-a12](#fn-a12)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The workflow page composes per stage from
`useWorkflowConfig/workflowConfigEditorialOJS.js` (editorial) and
`workflowConfigAuthorOJS.js` (author view) in lib/ui-library. External-review
editorial primary panels (in order): `FileManager` `WORKFLOW_REVIEW_REVISIONS`
(atom AFFW-323), `FileManager` `EDITOR_REVIEW_FILES` (AFFW-324),
`ReviewerManager` (AFFW-325), `AuthorResponseRequestManager` (owned by the
author-response feature), `DiscussionManager` (AFFW-327); secondary:
`WorkflowRecommendOnlyListingRecommendations` (guard `selectedReviewRound &&
selectedStage?.isCurrentUserDecidingEditor`, AFFW-328), `ParticipantManager`
(AFFW-329), `ReviewerSuggestionManager` (guard `selectedReviewRound &&
publicationSettings.isReviewerSuggestionEnabled`, AFFW-330). Author-view
primary: `WorkflowListingEmails` (AFFW-350), redacted `ReviewerManager` (guard
`getOpenAndCompletedReviewAssignmentsForRound(...).length`, AFFW-352),
`FileManager` `WORKFLOW_REVIEW_REVISIONS` + `DiscussionManager` (AFFW-353),
`AuthorResponseManager` (guard: response requested or round status ∈
{ACCEPTED, REVISIONS_REQUESTED}; owned by the author-response feature). Stage
access gate: `permissions.accessibleStages` (common config guard) — an
inaccessible stage renders only "user.authorization.accessibleWorkflowStage"
text. Round menu: `useWorkflowNavigationConfigOJS.js::getReviewItems()` →
label `workflow.reviewRoundN` "Review Round {$number}", initial selection =
current round; page title `submission.stage.externalReviewWithRound` "Review
(Round {$round})". OMP: `workflowConfigEditorialOMP.js` /
`workflowConfigAuthorOMP.js` define no external-review key, so the OJS
external-review block applies verbatim through the config deep-merge
(`useWorkflowConfigOMP.js`) — shared-behavior evidence for every panel/button
claim. Server side, both dashboards are served by
`PKPDashboardHandler` (ops `editorial` / `mySubmissions`); per-submission
access is enforced by `SubmissionAccessPolicy` on `GET
/api/v1/submissions/{id}` (authors need authorship or a stage assignment;
reviewers only via a review assignment). Refused-visitor probe 2026-07-31:
an unconnected author and an assigned reviewer typing
another submission's editorial-dashboard workflow address were turned away at
the dashboard's role gate; a foreign submission id opened through My
Submissions produced only an "Error / The current role does not have access
to this operation." dialog — no submission data in any case. Panel roster, order and on-screen headings
live-probed 2026-07-31 — the file panels are headed "Files for Review" and
"Revisions Uploaded" on screen, verbatim incl. subtexts on OJS and OMP.

<a id="fn-b"></a>
**b** — `PKP\submission\reviewRound\ReviewRound` / `ReviewRoundDAO`
(lib/pkp); DB unique key on (submission, stage, round). No OJS or OMP subclass
of either class exists (empty chains — shared-behavior evidence). Round 1:
`DecisionType::runAdditionalActions()` creates round 1 with status
`REVIEW_ROUND_STATUS_PENDING_REVIEWERS` when a decision promotes into a review
stage with no round; increments only in
`NewExternalReviewRound::runAdditionalActions()` (last round + 1). "Current
round" = highest (stage, round) — `ReviewRoundDAO::getLastReviewRoundBySubmissionId()`.
Data reaches the UI embedded in the submission payload
(`Schema::getPropertyReviewRounds()`: id, round, stageId, statusId, status,
publicationId, isAuthorResponseRequested, authorResponse — the reviewRound
schema, atom SET-021).

<a id="fn-c"></a>
**c** — Status machine: `ReviewRound::determineStatus()` — precedence:
stored revision statuses (1/2) flip to their submitted partners (11/15) via
`Repo::decision()::getActivePendingRevisionsDecision()` +
`revisionsUploadedSinceDecision()` (compares file update time to decision
date, review-revision file stage); stored 3/4/5 (sent-external / accepted /
declined) are final; recommendation scan (recommendOnly stage assignments,
manager+sub-editor roles) yields 14/13; reviewer scan (declined/cancelled
ignored) yields, in order: no assignments → 6, any overdue → 10, any unread →
8, any incomplete → 7, pending recommendations → 12; stored 16
(returned-to-review) survives; fallback → 9 (basis of finding A4).
`ReviewRoundDAO::updateStatus()` recalculates on reviewer edits, revision
uploads and decisions. Status 16 is set only by
`BackFromCopyediting::runAdditionalActions()`.

<a id="fn-d"></a>
**d** — Status texts: `ReviewRound::getStatusKey()` →
`editor.submission.roundStatus.*` keys (lib/pkp locale, quoted verbatim in
Rule 5; author variants `author.submission.roundStatus.reviewsReady` /
`.reviewOverdue` — finding A2). Box: `WorkflowSubmissionStatus.vue` — heading
`notification.type.roundStatusTitle` "Round {$round} Status", body =
`currentReviewRound.status` (always the current round; past-round and
future-stage texts `workflow.submissionInNextReviewRound`,
`workflow.submissionInFutureStage`,
`workflow.submissionNextReviewRoundInFutureStage`, `workflow.stageNotStarted`
per Rule 4). Status texts and box headings live-probed 2026-07-31 — OJS full
chain: waiting → awaiting responses → new reviews → all confirmed, both
revision-request paths and their submitted partners, declined, past-round and
post-accept texts; OMP: waiting / new reviews / all confirmed /
revisions requested. On a past round or past stage the
box heading renders plain "Status", not "Round {$round} Status" (Rule 4), and
the past-round sentence carries no closing period on screen. "Returned back
to review." has not been observed on screen: the claim check (2026-07-31)
drove Move to Review into a reviewerless round and an
in-progress round and saw "Waiting for reviewers to be assigned." /
"Awaiting responses from reviewers." instead — the stored returned-back
status survives the reviewer scan only in the all-completed-and-confirmed
state (note c), and no drive has reached that state after a return from
Copyediting (a seeded `completed` review counts once "Mark as Complete" is
pressed on screen, note r), so the sentence's positive appearance stays
code-confirmed only. One dead status: `REVIEW_ROUND_STATUS_SENT_TO_EXTERNAL` ("Sent
for external review.") is set by no decision type in OJS or OMP (OMP's
`SendExternalReview` sets the internal round to ACCEPTED instead), so its
sentence never renders — invisible, recorded here only.

<a id="fn-e"></a>
**e** — Buttons: `workflowConfigEditorialOJS.js` external-review
`getActionItems` — early return on `!selectedReviewRound` or
`selectedReviewRound.round < currentReviewRound.round` (AFFW-339); recommend-
only branch on `selectedStage.currentUserCanRecommendOnly` renders
`WorkflowRecommendOnlyControls` (owned by the decision-recording feature);
else `WorkflowActionButton`s per Rule 11 guarded by
`isDecisionAvailable(...)` over `submission.availableEditorialDecisions`
(AFFW-332..338). Server assembly: `APP\submission\maps\Schema::
getAvailableEditorialDecisions()` (OJS and OMP external branches identical:
RequestRevisions, Resubmit, Accept, NewExternalReviewRound, + CancelReviewRound
when retractable, + Decline while queued; replaced by [RevertDecline] while
declined) gated by `checkDecisionPermissions()` (manager/sub-editor stage
assignments; recommendOnly ⇒ recommendation-only; assistants get none —
hence no buttons for assistant-level roles). Delete guard additionally
requires a manager/site-admin role
(`hasCurrentUserAtLeastOneAssignedRoleInAnyStage`). Recommendation display:
`WorkflowRecommendOnlyListingRecommendations.vue` (AFFW-349) — heading
`editor.submission.recommendation` "Recommendation", body =
`selectedStage.recommendations[].label` joined by commas; recommendations are
serialized only for the deciding editor. Button roster, the Request
Revisions entry modal (radio labels, "not subject" preselected) and the two
wizard headings ("Request Revisions" / "Resubmit for Review") live-probed
2026-07-31. Past-round view probed the same
day: all five decision buttons absent, while the panels'
own buttons (Upload, Upload/Select Files, Add Reviewer, Assign) still
render; the claim check (2026-07-31) then exercised them and they act on
the past round — basis of finding A8 (note f-a8).
Declined-state roster probed 2026-07-31: while declined,
a Section Editor saw only "Revert Decline", a Journal Manager also "Delete";
Revert Decline restored the full button set and the recomputed status.
Recommend-only probed the same day: the three buttons
render as quoted in Rule 13, the "Recommendation" box lists the bare decision
label, and on a reviewerless round the box read "Waiting for reviewers to be
assigned." rather than the recommendation sentence — the Rule 6 precedence
line; consistent with the `determineStatus()` scan order in note c (the
no-assignments check precedes the pending-recommendations one). The
declined-only overlap of Rule 6 was driven the same day on a second
recommend-only round
(its one reviewer had declined): the box read "Awaiting recommendations from
editors." while the recommendation was pending and "All recommendations are
in and a decision is needed." once recorded — the recommendation branches
supersede the fallback sentence of finding A4. Unobserved edge: a round with
reviews underway, unread or overdue while recommendations are pending was
not driven, so which sentence wins there stays code-predicted only (note c's
scan order puts the reviewer flags before the pending-recommendations
branch); the body records the observed states.
Rule 13's deciding-editor precondition: claim check 2026-07-31
— with a recommend-only Section Editor as the
only editorial stage participant, no recommendation buttons rendered and the
"Recommendation" box carried the guard text quoted in Rule 13; with a
deciding Journal Editor assigned alongside, the three buttons rendered and
the recorded recommendation listed as in Rule 13.

<a id="fn-f"></a>
**f** — `PKP\decision\types\CancelReviewRound` — `canRetract()` false when
any assignment is confirmed or completed; "confirmed" means a response of
either kind: `ReviewerAction::confirmReview()` sets `dateConfirmed` on
decline exactly as on accept, and the retractability check counts every
confirmed-and-not-cancelled assignment (`DecisionType::
REVIEW_ASSIGNMENT_CONFIRMED`) — basis of Rule 11's responded-not-accepted
wording; claim check 2026-07-31: Cancel absent
on a round with one declined and one unanswered invitation, present on a
reviewerless round. The locale carries a restriction
text (`editor.submission.decision.cancelReviewRound.restriction`) but no
current screen renders it — when retraction is unavailable the button is
simply not offered (probed 2026-07-31 on OJS with positive
controls; OMP observed the same vanish the same day, no text in its
place). `runAdditionalActions()` deletes the round's review assignments and
the round row (round-file links go with it via cascade; notification rows for
the round are deleted too); new stage = external review while >1 round, else
Submission stage (OMP's internal variant: internal review / Submission).
Author email mailable `DecisionCancelReviewRoundNotifyAuthor`; reviewer
withdrawal mail `ReviewCancel` (was `ReviewerUnassign` until the upstream
unassign/cancel email split, pkp/pkp-lib#13035, folded on the 2026-08-27
upstream-rebase check) — both sent from the decision wizard
(decision-recording feature); the reviewer step renders only when the round
has reviewers (live probe 2026-07-31: a reviewerless round's wizard has the
author step only). Cancel flow live-probed
2026-07-31: Round-2 cancel restores Round 1 (recomputed status — finding A6),
Round-1 cancel lands on the Submission stage, and the withdrawn unanswered
invitation disappeared from every reviewer-side list including "All
assignments".

<a id="fn-g"></a>
**g** — `PKP\decision\types\NewExternalReviewRound` — label
`editor.submission.createNewRound` "Create New Review Round"; wizard step
promotes selected files (previous round's review-revision files offered) into
the new round's review-file stage; new round built with status
PENDING_REVIEWERS. OMP: `NewInternalReviewRound extends NewExternalReviewRound`
(parameterization only). Wizard live-probed 2026-07-31:
the revised file's checkbox in the "Select Files" step arrives already
checked, and the carried file lands in the new round as a copy under a new
file id — the author's original stays in the old round's Revisions Uploaded
panel.

<a id="fn-h"></a>
**h** — Editor review files: `EditorReviewFilesGridHandler` (GRID-025; roles
manager, site admin, sub-editor, assistant; ops fetchGrid/fetchRow/selectFiles)
→ selection modal `ManageReviewFilesGridHandler` (GRID-027, op
`updateReviewFiles`, title `editor.submission.review.currentFiles` "Current
Review Files For Round {$round}"). `ManageSubmissionFilesForm::execute()`:
selected & not yet in stage → copied in and linked to the round
(`assignRevisionToReviewRound` → `review_round_files`); already in stage →
`viewable` flag set to the checkbox; deselection only clears `viewable`,
never deletes. Success notice `notification.updatedReviewFiles` "Review files
updated." No app subclasses this pair (empty chains). On-screen panel
heading "Files for Review" live-probed 2026-07-31 (note a); the dialog's
checkbox behavior probed the same day (finding A7). Test runs 2026-09-12
(OJS and OMP, scenario 1): the dialog opened under a "Review Files" heading
with the round's review file alone and the box "Show files from all
accessible workflow stages." unticked; ticking the box reloaded the list
with the Submission-stage file, whose checkbox was then ticked and
confirmed with "Review files updated." (the Rule 8 wording was corrected on
that observation). Claim check 2026-09-28 (OJS and OMP, two runs; Rule 8,
Actors row "Choose the files under review"): on three Round 2s (built from
two seeded rounds, through Request Revisions and a new round, and one
driven by a Section Editor assigned to the stage) the dialog opened on "No
Items", and ticking "Show files from all accessible workflow stages." added
the Submission-stage `article.pdf` and never Round 1's review file
`notes.md` (the list grouped under stage rows, `article.pdf` under
"Submission", the review row holding only Round 2's upload; on OMP that
row reads "External Review"); the Round 1 control added `article.pdf`
beside the round's own `notes.md`. The assigned Section Editor got the Editor's dialog, upload
included.

<a id="fn-i"></a>
**i** — Author upload button: `workflowConfigAuthorOJS.js` external-review
`getActionItems` — guard `[REVIEW_ROUND_STATUS_REVISIONS_REQUESTED,
REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW, REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED,
REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED].includes(selectedReviewRound.statusId)`
— the literal duplicate where `REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW_SUBMITTED`
(15) belongs is finding A1's basis. Button label `workflow.uploadRevisions`
"Upload revisions", upload into the review-revision file stage of the round
(file-upload wizard — submission-files feature). The panel-header "Upload"
action is the `FileManager`'s own and is not gated by the round status —
observed surviving after the resubmit-path upload, 2026-07-31 (finding A1).
Editor-side revisions panel
is the same `FileManager` namespace (AFFW-323); its editor actions observed
2026-07-31 on OJS and OMP, identical (claim check): a
header "Upload" opens the same three-step wizard, filing a revision on the
author's behalf, ungated by round status; each file row's "More Actions"
menu offers exactly "Update File Details", "More Information", "Delete"
(delete confirms, then removes the file); no select/checkbox control. The
author's per-file menu on the same panel is narrower — no "More
Information". Legacy revision grids (`WorkflowReviewRevisionsGridHandler`
GRID-029, `AuthorReviewRevisionsGridHandler` GRID-024) are wired to no
current screen — see note o.

<a id="fn-j"></a>
**j** — Author reading: redacted `ReviewerManager`
(`useReviewerManagerConfig.js`, `redactedForAuthors: true`) — rows =
open-method assignments with a completion date
(`getOpenAndCompletedReviewAssignmentsForRound`), columns reviewer / type /
actions (no status column, no add button); row action `editor.review.readReview`
"Read Review" (AFFW-487) for statuses complete/thanked/received/viewed →
legacy modal `AuthorReviewerGridHandler::readReview` (GRID-053; author role
authorized only for open-method assignments) rendering `authorReadReview.tpl`
(AFFW-666): reviewer full name, completion date, recommendation, then either
review-form responses filtered to elements marked "included in author view"
or reviewer comments filtered to viewable-by-author (AFFW-667), plus the
attachments grid `AuthorOpenReviewAttachmentsGridHandler` (GRID-010) — its
listing is finding A3's subject (sibling `AuthorReviewAttachmentsGridHandler`,
GRID-011, is unreachable — note o). Author window live-probed 2026-07-31 on
OJS and OMP (findings OJS1, A3); the
anonymous-only control the same day — no reviewers
panel mounts in the author view, matching the mount guard above.
API-side control: review assignments serialized to
authors/reviewers are anonymized unless the review method is open. The modal
form posts nothing (no submit button). The grid's second operation,
`reviewRead`, was never sent by any screen, and the Author role no longer
holds it: pkp/pkp-lib#13343 (`f80f5b9483`, 2026-09-16, "Do not allow access
for authors to reviewRead") took it out of `AuthorReviewerGridHandler`'s Author role
assignment and out of its `ReviewAssignmentRequiredPolicy` operation list,
which leaves the Author `fetchGrid`, `fetchRow` and `readReview`, so the
"Read Review" window is unchanged. Code-read 2026-09-17 on OJS (lib/pkp
`efbba94ae7`); the OMP and OPS lib/pkp pointers sit at `360badeef5`, before
the commit, and receive it with their next pointer bump. No app subclasses
`AuthorReviewerGridHandler` (empty chains).

<a id="fn-k"></a>
**k** — `WorkflowListingEmails.vue` (AFFW-350/351): fetches
`emails/authorEmails?submissionId=…&eventType=EDITOR_NOTIFY_AUTHOR` (only on
the review stage), heading `notification.notifications` "Notifications", rows
= subject + date; click opens `authorDashboard/readSubmissionEmail` in a side
modal (`submissionEmail.tpl`, AFFW-702) — the one surviving operation of the
legacy author dashboard (note o); the server re-checks the email belongs to
this submission, this event type and this user. Live-probed 2026-07-31 on OJS
and OMP: subject + date rows, and
the opened letter carries zero editable fields and no reply controls.
Conditional mounting (Rules 14, 16): claim check 2026-07-31
— with no editor letter the author view rendered no
Notifications list at all; after a decision sent the author a letter, the
list appeared with that one subject + date row.

<a id="fn-l"></a>
**l** — `PKP\mail\mailables\RevisedVersionNotify` (MAIL-047, template key
`REVISED_VERSION_NOTIFY`): dispatched only from
`PKP\submissionFile\Repository::notifyEditorsRevisionsUploaded()`, itself
called from `Repo::submissionFile()->add()` when a review-revision file's
uploader is a stage-assigned author — i.e. at the wizard's step-1 file
transfer, before the Review Details and Confirm steps (observed live: the
email and status flip landed during an abandoned wizard run). Recipients:
users with manager or sub-editor stage assignments on the round's stage.
Throttle: an editor is skipped when a prior notice exists, they have not
logged in since it, and it is under 24 h old — confirmed live: a second
completed upload on the same round sent nothing. Observed From: the author's
own name and address; subject "Revised Version Uploaded". Probed 2026-07-31
(live probe). Both remaining branches closed by the claim check
2026-07-31: an Editor not assigned to the
stage received nothing for an upload — the assigned-to-the-stage qualifier is
load-bearing — and after the assigned editor signed in again, a further
upload sent a fresh notice (the sign-in branch re-arms the daily throttle).
Test runs 2026-09-12 (OJS and OMP, scenario 4): the window closed through
its header "Close" after the step-1 attach left the file in the panel and
one notice in the mail catcher; the wizard's own "Cancel" link is note
f-a11.

<a id="fn-m"></a>
**m** — `PendingRevisionsNotificationManager`
(`NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS`, NOTIF-031; OMP also
`…_INTERNAL_…`): created at task level for each stage-assigned author when an
active Request Revisions decision exists and no newer revision file does;
content = "Upload Revised File" link action into the round. The fresh OJS
task is the decision-owned
`NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` row ("Revision
required."); on OMP the internal-review delegate's removal branch deletes
that shared row and the external delegate refiles the task as the
pendingRevisions type, worded "Revisions to consider in {$stage}." —
finding OMP3 (note f-omp3). Deleting the last revision file does NOT
re-create the task: the delete-time notification pass runs while the file
row still exists (`Repo::submissionFile()->delete()`), so
`revisionsUploadedSinceDecision()` still counts it and the removal branch
holds; nothing re-evaluates after the row is gone — finding A9, claim check
2026-07-31 (both apps, editor- and author-side
deletion). A later file added to the review stage while the decision stands
does re-create a task, as the pendingRevisions type in both apps
(`PKP\submissionFile\Repository::add()` pass; observed live on OMP,
code-traced on OJS) — so "Revision required." is the fresh-decision wording
on a journal, not a task-list invariant. Observed 2026-07-31 (live probe +
claim check): the OJS Tasks panel entry reads
"Revision required." plus the submission title, the My Submissions row shows
"Revision requested" with a "Submit revisions" button in both apps, and the
task cleared on the in-round upload. The new-round variant (Resubmit)
produces a different, decision-owned task ("Resubmit for review.", verbatim
in both apps) — side-effect line only here.

<a id="fn-n"></a>
**n** — `DecisionType::createReviewRound()` creates one
`NOTIFICATION_TYPE_REVIEW_ROUND_STATUS` record per round (NOTIF-029, normal
level, no user). Its only render site was the legacy author-dashboard round
tab (note o), so it currently surfaces nowhere; the round-status box reads
the round's status from the submission payload instead. The record is deleted
with the round. Recorded here as mechanism; no user impact.

<a id="fn-o"></a>
**o** — Legacy author-dashboard surfaces, and the atom waivers this draft
declares. Routing still names three operations; only `readSubmissionEmail`
has a handler op and renders (note k). `authorDashboard/submission` is a pure
redirect to My Submissions with the workflow open (Rule 17).
`reviewRoundInfo` has no handler method or role assignment — the template
`reviewRoundInfo.tpl` (AFFW-703/704) and, through it, `submissionEmails.tpl`
(AFFW-701), `AuthorReviewAttachmentsGridHandler` (GRID-011) and
`AuthorReviewRevisionsGridHandler` (GRID-024) render nowhere;
`WorkflowReviewRevisionsGridHandler` (GRID-029) likewise has no referencing
screen. These six atoms are **waived as unreachable legacy surfaces**
(evidence: no render/reference site in OJS, OMP or lib code; typed-URL probe
2026-07-31: `authorDashboard/submission` redirected to
My Submissions with the workflow open, and `reviewRoundInfo` answered
HTTP 404 both with and without a submission id — an error, not a screen; the
waivers stand).

<a id="fn-p"></a>
**p** — OPS absence, install facts: the preprint server's stage roster holds
no review stage (`APP\core\Application::getApplicationStages()` in ops-main,
commented "Only one stage in OPS": Production alone until 2026-09-08, and
Production plus `WORKFLOW_STAGE_ID_DONE` from pkp/pkp-lib#13109, ops
`16bbd9b90e`; every app's list gained Done that day, OJS `3bfe1f9f68`, OMP
`5d2b2fea7`; Production alone again since 2026-09-12, pkp/pkp-lib#13312, ops
`97d8a0d2e8`, lib/pkp `65901c4f7a`, every app's list losing Done that day,
OJS `0dbb274a45`, OMP `ce63a5cd8`, Done kept in
`PKPApplication::getValidStages()` for the stage-access policy alone), it inherits an empty review-stage list, registers
no review-stage decision types (`APP\decision\Repository::getDecisionTypes()`:
decline/revert/post cluster only), and serializes no review stage or
decisions (`APP\submission\maps\Schema` short-circuits to production/done).
The shared round classes and tables ship in the codebase but are never
populated on a default install. Live absence probe
2026-07-31: a preprint's workflow menu held exactly one entry, Production; no
round, reviewer or review-file surface anywhere on the screen; the Production
stage's own controls rendered as the positive control (scenario 14).

<a id="fn-q"></a>
**q** — OMP chain check (multi-app evidence): no OMP subclass of
`ReviewRound`, `ReviewRoundDAO`, any file/reviewer grid in this spec, or
`PendingRevisionsNotificationManager` (empty chains). OMP's divergence lives
in: `APP\decision\types\*` internal-review decision types (all thin
subclasses of the external ones), `Application::getApplicationStages()`
(internal stage added), `Schema::getAvailableEditorialDecisions()` (external
branch identical to OJS's), and `Repository::getReviewNotificationTypes()`
(internal + external pending-revisions types). The Vue configs add only
internal-stage blocks (note a). One forwarded OMP observation, confirmed live
2026-07-31 (cross-app control probe on OMP): no Author Response panel
renders in either the editorial or the author view — a silent absence, console
clean (`WorkflowPageOMP.vue` does not register the author-response components
the merged external-review config emits) — while the author still receives
the letter inviting a response. The finding belongs to *Author response to
reviews* (Rule 14 carries the pointer).

<a id="fn-r"></a>
**r** — Context setting `numReviewsPerSubmission` (review setup form, label
"Minimum Confirmed Reviews Required") → dashboard passes
`contextMinReviewsPerSubmission`; `WorkflowSubmissionStatus.vue` adds
`dashboard.minimumConfirmedReviewsRequired` "Minimum number of confirmed
reviews required: {$number}." and applies a minimum-aware override to the
confirmed reviewer status. Probed
2026-07-31: with a minimum of 2 and one confirmed review, the box carried only
the minimum line. Claim check 2026-07-31: with
two accepted and none confirmed, the box carried the minimum line **plus**
"Awaiting responses from reviewers." — identical on OJS and OMP — so the
body's earlier "no status sentence at all" claim was corrected on that
observation. Test run 2026-09-12 (OJS and OMP, scenario 15): with a minimum
of 2 and one review submitted and not yet confirmed, the box carried the
minimum line **plus** "New reviews have been submitted."; the body's earlier
claim that the submitted sentence does not appear was corrected on that run.
So the override suppresses only the confirmed sentence: the component's
minimum branch drops the round's own sentence for the confirmed status
alone (`REVIEW_ROUND_STATUS_REVIEWS_COMPLETED`) and otherwise prints the
minimum line above it. Once the round's confirmed reviews number at least
the minimum (`useSubmission.js::checkMinimumConsideredReviews()`), a
second branch prints the minimum line above
`dashboard.minimumReviewsConfirmedDecisionNeeded` "Minimum required number
of reviews have been confirmed. A decision is needed." in place of any
reviewer-derived sentence (waiting, awaiting, new reviews, overdue, all
confirmed); only the all-confirmed case was driven. Claim check 2026-09-28
(OJS and OMP, two runs, minimum 2, every state read on the same page and
after a reload): one review accepted read the minimum line plus "Awaiting
responses from reviewers."; one or two reviews submitted, and two
submitted with one confirmed, the minimum line plus "New reviews have been
submitted."; the only review confirmed, the minimum line alone; two seeded
`completed` reviews, each confirmed with "Mark as Complete" on screen, the
minimum line plus "Minimum required number of reviews have been confirmed.
A decision is needed.", on the editor's and the author's screen alike; a
Section Editor assigned to the stage read the same box; the control
journal or press at 0 read "New reviews have been submitted.", then "All
reviews are confirmed and a decision is needed.", with no minimum line.

<a id="fn-s"></a>
**s** — Scenario seeding. The seeded journal or press is `publicknowledge`;
roster accounts sign in with the username doubled as the password:
`editor.diana` is the Editor (a manager-level account, so a deciding editor
wherever it is assigned; the seeded journal assigns it to every submission
in its sections on submit), `manager.maya` the Journal Manager,
`sectioneditor.ana` the Section Editor, `author.alex` and `author.bea` the
Authors, `reviewer.julia` and `reviewer.paul` the Reviewers. Submissions
are scratch, built through `POST scenarios/submission` (scenarios.md) with
`decisions: ['sendExternalReview']` for a submission in Round 1 and
`reviewRounds[].reviewers[]` for its reviewer state (`invited`, `accepted`,
`declined`, `completed`); the seed carries no files, so a file is uploaded
through the Submission Files panel first. Scratch journals come from `POST
scenarios/context` with throwaway `users[]`; the mail catcher is Mailpit,
read by the throwaway recipient's address. Per scenario: 1 seeds no
decision, uploads two files and records "Send for Review" on screen. 2
adds the reviewer through "Add Reviewer" (a reviewer named in the seed
leaves that search) and drives the review on the reviewer's own page. 3
and 5 seed an `accepted` reviewer and record the decision on screen. 4
runs on a scratch journal with a throwaway `editor`, a second `editor` for
the control and an `author`, seeded `decisions: ['sendExternalReview',
'requestRevisions']`; the first editor is assigned to the stage through the
Participants panel (the "Journal editor" group), the second never. 6
continues 5's state, or seeds `decisions: ['sendExternalReview',
'resubmit']` and uploads the revised file as the author. 7: a scratch
journal with throwaway `manager`, `author` and `externalReviewer`; two
`reviewRounds[]` entries give Round 2, the second with the reviewer
`invited`; the second submission has one round. 8: `status: 'completed'`
on the first submission's reviewer, `status: 'declined'` on the second's;
the third seeds two reviewers, `status: 'declined'` and `status:
'accepted'`. 9: any round for the first submission; the second seeds
`decisions: ['sendExternalReview', 'newExternalReviewRound', 'accept']`
(the second round gets no reviewer, and "Accept Submission" lands on it).
10: a reviewer `status: 'accepted'`; `sectioneditor.ana`
assigned to the stage through `participants[]`; `manager.maya` declines
and reverts. 11: a reviewer `status: 'declined'`; the recommendation-only
limitation is set on screen in the Participants panel's "Edit" window for
`sectioneditor.ana` (the flag belongs to *Stage participants*), the
deciding editor being the auto-assigned `editor.diana`; the second
submission sits on a scratch journal with one throwaway `sectionEditor` as
its only participant, limited the same way, and its round seeds no
reviewer (`reviewers: []`). 12: `author.bea` submits both;
the open reviewer (`reviewer.julia`) is added on screen with "Review Type"
"Open" (a seeded reviewer carries the journal's default type, anonymous)
and accepts on screen before the author's first step; the letter comes from
a decision the editor records on screen; the control submission seeds
`reviewer.paul` `status: 'completed'`; the old addresses are typed. 13: a
monograph seeded with no decision; "Send to External Review" recorded on
screen. 14: any seeded preprint. 15: a scratch journal created with
`review: {numReviewsPerSubmission: 2}` and throwaway `editor`, `author`
and `externalReviewer`; the editor is assigned to the stage through
`participants[]`, the submission seeds `decisions: ['sendExternalReview']`
and the reviewer `status: 'accepted'`, whose wizard then opens on step 1;
the review is submitted on the reviewer's own page as in scenario 2 and
confirmed on screen. Seeding caveat observed 2026-07-31, twice
independently (a probe run on the seeded journal's own state provided the
contrast): on scratch journals, submitting assigns no editor even with a
matching section editor seeded, so every scratch-journal recipe assigns
its participants before the workflow steps; the auto-assignment behavior
itself belongs to the *Submission stage* feature, not this register.

<a id="fn-a1"></a>
**f-a1** — Guard list in note i: the four-entry status list contains
`REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED` twice and lacks
`REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW_SUBMITTED` (15) — the state a
resubmit-path round enters on the author's first upload (note c). The
in-round path (statuses 1→11) keeps the button through both states. Probed
2026-07-31 (contrast, same probe: the in-round path keeps
the button and its task clears on upload); the persisting "Resubmit for
review." task is the decision-owned resubmit task (note m).
Issue report: [pkp-e2e#520](https://github.com/jardakotesovec/pkp-e2e/issues/520) ([docs/issues/U26-A1-upload-revisions-button-gone-after-resubmit-upload.md](../issues/U26-A1-upload-revisions-button-gone-after-resubmit-upload.md)).

<a id="fn-a2"></a>
**f-a2** — `Schema::getPropertyReviewRounds()` calls
`ReviewRound::getStatusKey()` without the author flag, so the payload —
and the status box in both dashboards — always carries the editor wording.
The author variants exist for statuses 8 and 10
(`author.submission.roundStatus.reviewsReady` / `.reviewOverdue`) and were
rendered by the legacy author dashboard's round-status notification path
(`PKPNotificationManager::getNotificationMessage()`, which does pass the
author flag but has no remaining surface — notes n, o). Probed 2026-07-31 —
author and editor boxes character-identical at four states, viewed side by
side. Claim check 2026-09-28 (OJS and OMP): with the minimum of confirmed
reviews met, the author's box read the editor's two lines (note r).

<a id="fn-a3"></a>
**f-a3** — Both apps' observations (live probes 2026-07-31, OJS and OMP)
are routed to the maintainer's private
security file per the campaign's routing rule; nothing beyond that routing
declaration is recorded anywhere else. The grid handlers involved are indexed in note j and
the Reference tables; their behavior is not described here until the
maintainer's fix ships, and no test asserts it.

<a id="fn-a4"></a>
**f-a4** — `determineStatus()` reviewer scan ignores declined/cancelled
assignments entirely; "no assignments" (status 6) requires zero records, so
an all-declined round falls through every flag to the fallback status 9
(note c). Probed 2026-07-31 (one invited reviewer,
declined). Reproduced on OMP by the claim check the same day:
a press round whose only invited reviewer
declined reads the identical sentence.

<a id="fn-a5"></a>
**f-a5** — Probed 2026-07-31 on OJS: the review stage's
Assign dialog (stage-participants feature) listed no production assistant
user groups, and a Copyeditor assigned on the Copyediting stage got only the
`user.authorization.accessibleWorkflowStage` text ("You don't currently have
access to that stage of the workflow.") on the review stage. Claim check
2026-07-31 read the dialog's full role roster on
both apps — OJS: Journal editor, Section editor, Guest editor, Funding
coordinator, Translator, Author; OMP: Press editor, Series editor, Funding
coordinator, Author, Volume editor, Translator — Funding coordinator is a
`ROLE_ID_ASSISTANT` group with review-stage access by design, the one
assistant-level group with a screen path onto the stage. The code-side
admission with no screen path: `EditorReviewFilesGridHandler` includes
`ROLE_ID_ASSISTANT` in its role list (note h), and the stage-access gate is
`permissions.accessibleStages` (note a) — whether a stage assignment created
by other means would populate it for a production assistant was not observed.

<a id="fn-a6"></a>
**f-a6** — Probed 2026-07-31: Round 1 carried a
recorded resubmit decision and an uploaded revision (status before Round 2
existed: "Revisions requested from the author to be taken to a new review
round."); after Round 2 was cancelled, the restored Round 1's box read
"Awaiting responses from reviewers." The post-cancel recompute (note c)
resolves the round against its reviewer records and the resubmit decision no
longer surfaces; whether it should is the entry's question.

<a id="fn-a7"></a>
**f-a7** — Probed 2026-07-31: unticking a listed file
and confirming produced no visible change in the Files for Review panel, and
the decision-carried file showed unticked in the dialog while the panel
listed it. Reproduced on OMP by the claim check the same
day: dialog heading, in-dialog upload link and the
"Review files updated." notice verbatim on the press, and a file uploaded
from the dialog itself arrived with its checkbox unchecked while the panel
listed it; untick-and-confirm changed nothing visible there either.
Mechanism per note h: deselection clears the `viewable` flag on
the round's file link and never deletes; the panel renders the file
regardless of that flag. Whether `viewable` gates the reviewer-side file
list was not observed — the entry's open half. Re-driven 2026-09-28 on OJS
and OMP, two runs, on Round 1 and three Round 2s (note h): a file uploaded
through the dialog's "Upload Review File" arrived unticked right after the
upload wizard, again on reopening the dialog and again after a reload,
while "OK" reported "Review files updated." and the panel listed the file.

<a id="fn-a8"></a>
**f-a8** — Claim check 2026-07-31, two independent drives: on a two-round
scratch submission, past Round 1's Add Reviewer form
completed and that round's Reviewers panel listed the new reviewer as
"Request Sent"; and separately, past Round 1's Revisions
Uploaded "Upload" wizard completed with the file landing in Round 1's panel
while Round 2's stayed empty. The past round's status sentence was unchanged by
either mutation. Panel configs per note a (shared through the config
deep-merge); no current-round gate on these panel operations was observed.

<a id="fn-a9"></a>
**f-a9** — Mechanism and evidence in note m (the delete-time notification
pass runs while the file row still counts). Claim check
2026-07-31: flip-back plus silent task list observed on OJS
and OMP, for editor-side and author-side deletion of the only revised file;
the later file add that re-creates a task observed live on the press and
code-traced on the journal. The spec's prior revival claim was corrected by
the same check.
Issue report: [pkp-e2e#862](https://github.com/jardakotesovec/pkp-e2e/issues/862) ([docs/issues/U26-A9-deleted-revision-no-task-back.md](../issues/U26-A9-deleted-revision-no-task-back.md)).

<a id="fn-a11"></a>
**f-a11** — Test run 2026-09-12 (OJS, scenario 4, one run): after the
step-1 attach and the window's "Cancel" link, the author's Revisions
Uploaded table showed its "No Items" row, the editor's box read "Revisions
have been requested." and the bottom "Upload revisions" button was offered,
while the mail catcher held the assigned editor's "Revised Version Uploaded"
notice from the author's address. The green runs on OJS and OMP close the
window through its header "Close" instead and the file stays (note l).
Mechanism, read not driven: lib/pkp
`js/controllers/wizard/fileUpload/FileUploadWizardHandler.js`
`wizardCancelRequested` deletes the uploaded file when cancel follows an
upload; the email goes out at the step-1 add (note l). The press was not
driven on the Cancel path.

<a id="fn-a10"></a>
**f-a10** — Probed 2026-08-02, editorial view (Journal/Press Manager), on
rounds whose status box read "Awaiting responses from reviewers." and where
no Request Revisions decision had ever been recorded: the heading "Revisions
Uploaded" and the paragraph "These files have been submitted by the author
after revisions were requested" rendered verbatim on an OJS Review round 1
and an OMP External Review round 1; identical on an OMP Internal Review
round 1 the same day. Panel mechanism in notes a and i (the editor-side
revisions `FileManager`, ungated by round status).
Issue report: [pkp-e2e#858](https://github.com/jardakotesovec/pkp-e2e/issues/858) ([docs/issues/U26-A10-revisions-panel-says-revisions-requested.md](../issues/U26-A10-revisions-panel-says-revisions-requested.md)).

<a id="fn-ojs1"></a>
**f-ojs1** — Probed 2026-07-31: on OJS, a free-text review
with a comment shared for author and editor and an editor-only comment — the
author's window rendered neither, and the decision letter's reviewer
appendix listed the recommendation only; on OMP, the
shared comment rendered (the editor-only comment absent in both apps). The
window is `authorReadReview.tpl` via `AuthorReviewerGridHandler::readReview`
(note j); the OJS-side mechanism was not traced.

<a id="fn-a12"></a>
**f-a12** — pkp/ui-library#853 (issue pkp/pkp-lib#13359, which keeps
"File upload modals still reload the table when closed, since a file can
already be uploaded even if the upload is closed before the final step
completes") changed, at its earlier head `cab09538`,
`workflowStore.js`'s `fileUpload()`, which the author's "Upload
revisions" button uses, from `() => triggerDataChange()` to `async
(finishedData) => await triggerDataChange(finishedData)`. The legacy
upload wizard stores the file through its own jQuery request, so nothing
flagged the window changed, `closeSideModalById()` handed the close
`{dataChanged: false}`, and `triggerDataChange()` returned without
reloading. `fileManagerStore.js`'s `fileUpload()`, behind the panels' own
"Upload", keeps the unconditional `() => triggerDataChange()`. Driven
2026-09-23 at the PR head `cab09538`, before its merge: on OJS
(`802202cb3e`), on a fresh reset, the kept check
`shared/playwright/checks/sync/ui-library-853/upload-stale.js`, after the
step-1 attach and the header "Close", read 0 rows in the author's
Revisions Uploaded panel with no request sent after the close, and 1 row
after a reload; at the tip's lib/ui-library `2034439a`, on the same
database, 1 row right after the close, with `…/files`,
`…/stages/3/tasks` and `…/emails/authorEmails` fetched. OMP's test of
scenario 4, which looks at the panel without reloading, red at the PR
head and green at `2034439a` on the same database; OJS's test reloads
the page before it looks. OMP's and OPS's own lib/ui-library pointers
predate the change. Written up for the team in
`docs/reports/2026-09-23-ui-library-853-upload.md` (a temporary report,
deleted once addressed; git history keeps it). Fixed at the PR head
`51f0c727`, before its merge: `fileUpload()` reloads unconditionally
again (`async () => await triggerDataChange()`). Verified 2026-09-23 on
OJS on a fresh reset with lib/ui-library at `51f0c727`: `upload-stale.js`
read `stale: false`, the panel listing the file right after the close,
with `…/files`, `…/stages/3/tasks` and `…/emails/authorEmails` fetched;
OMP's test of scenario 4 passed in pkp/omp#2471's CI with this companion
at `51f0c727` (run 35882950730).

<a id="fn-omp1"></a>
**f-omp1** — OMP stage roster and decision registry in note q; internal
stage entry in the workflow menu labeled `workflow.review.internalReview`
"Internal Review". The skip path (scenario 13) is the submission-stage
decision `SKIP_INTERNAL_REVIEW`, labeled with the press's send-to-external
wording. Internal-stage screens, decisions and divergences belong to
*Internal Review stage* {OMP}. Live parity probe
2026-07-31: the External Review round matched the OJS record panel-for-panel
and button-for-button, and the "Internal Review" menu entry rendered.

<a id="fn-omp2"></a>
**f-omp2** — Probed 2026-07-31: the OMP reviewer
form carried no recommendation control, the author's read-review window
listed no recommendation line, and the decision letter's reviewer appendix
printed "Recommendation:" followed by an empty value. The OJS contrast run
showed the recommendation in all three places.

<a id="fn-omp3"></a>
**f-omp3** — Claim check 2026-07-31,
UI-driven on both apps with DB verification: OJS holds one
`NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` task row ("Revision
required."); OMP holds a `NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS` row
and no decision-type row. Mechanism: both apps create the decision task
(`PKP\decision\Repository::updateNotifications()`), but OMP's
`APP\decision\Repository::getReviewNotificationTypes()` also runs the
internal-revisions delegate, whose removal branch — finding no
internal-stage pending decision — deletes both its own type and the shared
decision row (`PendingRevisionsNotificationManager`); the external delegate
then refiles the task under `notification.type.pendingRevisions`
("Revisions to consider in {$stage}."). Wording chain and the re-created
task per note m.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Review stage, editorial view | workflow menu → Review → Review Round {N} (editorial dashboard) | AFFW-323..325, 327..330, 332..339, 349 |
| Review stage, author view | My Submissions → submission → Review Round {N} | AFFW-350..353, 355 |
| Author read-review window | author reviewers list → "Read Review" | AFFW-487, 666..667 · GRID-010, 053 |
| Author email window | "Notifications" list → subject link | AFFW-701 (legacy list — waived), AFFW-702 |
| Editor review files selection | Files for Review panel → edit | GRID-025, 027 |
| Revisions panels | Revisions Uploaded panel (both views) | GRID-024 (waived), GRID-029 (waived) |
| Legacy author round tab | `{journal}/authorDashboard/reviewRoundInfo` (dead route) | AFFW-703..704 (waived) · GRID-011 (waived) |
| Revised-version email | template key `REVISED_VERSION_NOTIFY` | MAIL-047 |
| Round-status notice record | per-round, no surface | NOTIF-029 |
| Author revisions task | task list entry with upload action | NOTIF-031 |
| Round data shape | `reviewRounds` on the submission payload | SET-021 |
| Round history (reviewer's page) | reviews API `history` operation — surface owned by *Reviewer's review*; endpoint owned by *Author response to reviews* | API-032 (rider) |

## Reference — code anchors

- `lib/pkp/classes/submission/reviewRound/ReviewRound.php` · `ReviewRoundDAO.php` — round model, status machine
- `lib/pkp/classes/decision/DecisionType.php` + `lib/pkp/classes/decision/types/` (`RequestRevisions`, `Resubmit`, `Accept`, `Decline`, `RevertDecline`, `NewExternalReviewRound`, `CancelReviewRound`) — round transitions
- `lib/pkp/classes/submission/maps/Schema.php` — round serialization, decision availability, permission checks
- `ojs-main/classes/submission/maps/Schema.php` · `omp-main/classes/submission/maps/Schema.php` — per-app decision rosters
- `omp-main/classes/decision/types/` — internal-review decision family
- lib/ui-library `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` · `workflowConfigAuthorOJS.js` (+ OMP/OPS variants) — stage composition and guards
- lib/ui-library `src/pages/workflow/components/primary/WorkflowSubmissionStatus.vue` · `WorkflowListingEmails.vue` · `secondary/WorkflowRecommendOnlyListingRecommendations.vue`
- `lib/pkp/controllers/grid/files/review/` (`EditorReviewFilesGridHandler`, `ManageReviewFilesGridHandler`) · `lib/pkp/controllers/grid/users/reviewer/AuthorReviewerGridHandler.php` · `lib/pkp/controllers/grid/files/attachment/AuthorOpenReviewAttachmentsGridHandler.php`
- `lib/pkp/classes/submissionFile/Repository.php` — revision upload side effects
- `lib/pkp/classes/notification/managerDelegate/PendingRevisionsNotificationManager.php`
- `lib/pkp/classes/mail/mailables/RevisedVersionNotify.php`
