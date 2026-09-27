---
name: submission-stage
status: verified
---

# Submission stage {OJS OMP OPS}

<!-- OPS lacks the Submission stage as a reachable screen; see the absence note under Purpose. -->

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every new submission arrives at the **Submission stage**. It is the first stop
in the editorial workflow, before any review begins. Here the editorial team
looks the submission over: the files the author uploaded, the participants
assigned to it, and the discussions that coordinate the work. From this screen
the team moves the submission onward with a single decision. They can send it
into peer review, accept it and skip review straight to copyediting, or decline
it. They can also reverse a decline, or delete the submission outright.

This spec covers the Submission-stage screen itself: which panels and decision
buttons each role is offered in each state, and what each decision does to the
submission. The guided wizard behind every decision button, with its email step
and its file-promotion step, belongs to *Editorial decision recording*. The
panels' own mechanics belong to their features (see *Cross-feature
interactions*). Who may open a submission's workflow at all is
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).

A preprint server runs a **single-stage workflow**. A posted preprint's only
stage is Production, and no Submission stage ever appears in a preprint's
workflow menu. None of the decision buttons or the Submission-stage panels in
this file appear there. A preprint server's editorial moves (decline, revert,
post the preprint) happen on the Production stage instead and belong to
*Production stage* and *Publish, schedule & versions* [OPS1](#ops1). <sup>p</sup>

## Actors & permissions

Who may **open** the Submission-stage screen at all is a gate shared by every workflow stage, and
it is defined once, as
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access). The
rows below record
only what each role is offered **on** the screen once it is open. The Author
reaches this screen only for their own submission, through My Submissions, in
a reduced author view (Rule 10). <sup>a</sup>

| Action | Who may — and when |
|--------|--------------------|
| **See the Submission-stage panels** (files, discussions, participants) | • Site Administrator; Journal Manager; Editor: every submission in the journal<br>• Assigned Section Editor, Guest Editor, and the assistant groups whose stage set includes the Submission stage (by default only the Funding Coordinator; a Copyeditor, Layout Editor or Proofreader assigned here gets the no-access box instead, unless the Roles settings screen has added this stage to their group; [→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)): their assigned submissions<br>• Author: their own submission, in the author view (Rule 10; the author sees files and discussions only) <sup>a</sup> |
| **Record a decision** (the buttons at the top of the screen) | • Deciding editors: while the submission is queued at this stage they get the onward decisions (Rules 2–4); while it stands declined they get "Revert Decline" (Rule 5)<br>• Recommending editors: they are offered a reduced subset of the same decision buttons ("Send for Review" on a journal; "Send to Internal Review" on a press), not the dedicated recommendation controls the Review stage gives them ⚠ [A2](#a2)<br>• Assistants (Copyeditor, Layout Editor, Proofreader, Funding Coordinator): no decision buttons, whatever stage access they hold <sup>c</sup> <sup>d</sup> |
| **Send the submission to review** | • Deciding editors: "Send for Review" on a journal; "Send to External Review" (which skips internal review) or "Send to Internal Review" on a press (Rule 2)<br>• Recommending editors: one of these buttons appears for them too ⚠ [A2](#a2) <sup>e</sup> |
| **Accept and skip review** | • Deciding editors: "Accept and Skip Review" (Rule 3) <sup>e</sup> |
| **Decline the submission** | • Deciding editors: "Decline Submission", while the submission is queued (Rule 4) <sup>e</sup> |
| **Revert a decline** | • Deciding editors: "Revert Decline", only while the submission stands declined (Rule 5) <sup>e</sup> |
| **Delete the submission** | • Journal Manager; Editor; Site Administrator (who holds a journal role on this install): the "Delete" button, only while the submission stands declined (Rule 6). No other role is offered the button; an assigned Section Editor is not. Behind that, the system also refuses the delete operation itself for anyone who is not a Manager, Editor or Administrator <sup>f</sup> |
| **Jump to the publication (Schedule For Publication)** | • Every role the editorial view admits, on a journal. The author's own view never shows it (Rule 10). The "Schedule For Publication" shortcut at the top of the screen is not tied to decision rights, so assigned assistants and recommend-only editors see it too. It opens the publication's Title & Abstract. A press does not show it (Rule 7) <sup>g</sup> |

## Fields & validation

N/A. The Submission stage's own surfaces are panels and buttons. The forms
they open belong to their own features: every decision button opens the wizard
of *Editorial decision recording*, the file panel's upload wizard belongs to
*Submission files*, and the Delete button opens a plain confirm dialog (Rule 6).

## Rules & state

<a id="panels"></a>
1. **What the screen shows.** When a submission is opened at the Submission
   stage, the editorial view shows three panels, in this order: the
   **Submission Files** panel (headed "Submission Files", listing the files the
   author uploaded), the discussions panel (headed "Desk Review Tasks &
   Discussions"), and the **Participants** panel. A fourth panel headed
   "Reviewers Suggested by Author" appears under Participants when the journal
   has reviewer suggestions enabled **and** the author entered suggestions when
   submitting. It lists each suggested reviewer with the author's reason. With
   the setting on but no suggestions entered, no such panel appears. Each
   panel's own mechanics belong to its feature (see *Cross-feature
   interactions*); this spec covers only which panels the Submission stage
   displays. The submission's decision buttons sit at the top of the screen
   (Rules 2–7). <sup>a</sup>
2. <a id="send-to-review"></a> **Send to review.** While the submission is
   queued at this stage, a deciding editor is offered a send-to-review button.
   On a journal it reads "Send for Review". When recorded, it moves the
   submission into the Review stage and opens Round 1 (see *Review stage &
   rounds*). On a press the same primary button reads
   "Send to External Review". It skips the internal review stage and opens
   External Review Round 1. A press additionally offers
   "Send to Internal Review", which routes the submission into the earlier
   Internal Review stage instead [OMP1](#omp1). <sup>e</sup>
3. **Accept and skip review.** "Accept and Skip Review" accepts the submission
   for publication without any review and sends it straight to the Copyediting
   stage. <sup>e</sup>
4. **Decline.** "Decline Submission" sets the submission's status to declined.
   The submission stays on the Submission stage. The stage label under the
   submission's title reads "Declined" in place of "Submission", and the onward
   buttons of Rules 2–3 are replaced by the declined-state buttons (Rules 5–6).
   <sup>e</sup> <sup>h</sup>
5. **Revert a decline.** While the submission stands declined, the only
   decision button offered is "Revert Decline". It returns the submission to
   the queued state and restores the onward buttons of Rules 2–3. <sup>e</sup>
6. <a id="delete"></a> **Delete.** While the submission stands declined, a
   Journal Manager, Editor or Site Administrator (who holds a journal role
   on this install) also sees a "Delete" button. The button is offered only
   in the declined state and only to those roles (Actors).
   The dialog and what confirming does are
   [→ the Delete dialog](U24-workflow-screen-and-stage-access.md#delete-dialog).
   After the delete, the submission's dashboard address (a stale bookmark
   to the open panel, say) opens the dashboard with an explicit error
   dialog: "Error" / "Invalid submission." / "OK"; the older typed
   workflow addresses answer with a bare page instead
   ([→ that finding](U24-workflow-screen-and-stage-access.md#a9)). So the reader is told the
   submission is gone. Behind the error, the workflow panel itself stays
   open, empty but for the submission's number in its header
   ⚠ [A3](#a3). <sup>f</sup>
7. <a id="schedule"></a> **The Schedule For Publication shortcut** {OJS}.
   At the top of the Submission stage a journal also shows a "Schedule For
   Publication" button. It records no decision. It opens the submission's
   publication at its Title & Abstract (see *Publish, schedule & versions*),
   where scheduling is offered. It appears for every role the editorial view
   admits, not only deciding editors (Actors, last row). The author's own view
   never shows it (Rule 10). Its appearance does not depend on the submission's
   status, so it is shown even while the submission stands declined
   ⚠ [A1](#a1). A press does not show it. <sup>g</sup>
8. **The status box is quiet at this stage.** While the submission has not
   yet left the Submission stage, no status box is shown on this screen.
   Once the submission has moved on to Review or a later stage,
   a status box appears at the top of this stage's panel column, above the
   Submission Files panel, and says where the submission now stands, for
   example "The submission is currently in the Copyediting stage." The box
   and its full message roster are
   [→ the status box](U24-workflow-screen-and-stage-access.md#status-box).
   <sup>h</sup>
9. **No decision applies off the active stage.** A decision button appears only
   when the Submission stage is the submission's active stage. Once the
   submission has moved onward, opening the Submission-stage entry shows its
   panels but none of the decision buttons. <sup>e</sup>
10. <a id="author-view"></a> **The author's view.** An author opening their own
    submission at the Submission stage sees the **Submission Files** panel and
    the "Desk Review Tasks & Discussions" panel, and nothing else. There is no
    Participants panel, no decision buttons, no Delete, and no Schedule For
    Publication shortcut. The author cannot move the submission onward. A
    submission-status summary appears only once the submission has left the
    Submission stage. The author's entry route (View on My Submissions) belongs
    to *My Submissions*; everything on the screen after it is covered here.
    <sup>i</sup>
11. **The old author-dashboard address forwards, for the author only.** An
    old author-dashboard bookmark (`…/authorDashboard/submission/<number>`)
    forwards the submission's own Author to the submission's workflow panel
    on My Submissions, which opens at its usual landing entry (this screen
    while the submission is still at the Submission stage; the current
    review round, for one in review); the forward, the landing and the
    refusals are
    [→ workflow addresses](U24-workflow-screen-and-stage-access.md#workflow-addresses).
    <sup>j</sup>

## Side effects

- **On each decision.** The notification email and any file promotion belong to
  the decision wizard, not to this screen. Each decision's own emails,
  notifications and log entry are described in *Editorial decision recording*.
  This spec records only the stage or status change each decision makes
  (Rules 2–5).
- **On Send to review.** Round 1 of the review stage is created (see *Review
  stage & rounds*).
- **On Delete.** The submission and its associated records are removed
  permanently. Nothing is emailed (Rule 6). <sup>f</sup>

## Settings that modify behavior

- **"Reviewer Suggestion at Submission"** (Settings > Workflow > Review; off by
  default). It lets authors suggest reviewers when submitting. On the
  Submission stage, the "Reviewers Suggested by Author" panel then appears for
  submissions that carry suggestions (Rule 1). The panel itself belongs to
  *Reviewer suggestions*. <sup>a</sup>
- **The app's workflow stages.** A preprint server ships a single-stage
  workflow, which is why its submissions never occupy a Submission stage
  [OPS1](#ops1). This is a fixed property of each application, not a
  configurable setting. <sup>p</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)**:
  who may open a submission's workflow and reach this stage. This spec owns
  only what the Submission stage offers once opened.
- **Editorial decision recording**: every decision button (Rules 2–5) opens
  that feature's guided wizard. This spec owns the buttons' presence and the
  stage or status change each decision makes.
- **Review stage & rounds**: the destination of Send to review (Rule 2), the
  Review stage and its Round 1.
- **Copyediting stage**: the destination of Accept and Skip Review (Rule 3).
- **Submission files**: the Submission Files panel's upload, revise and
  download mechanics.
- **Tasks & discussions**: the "Desk Review Tasks & Discussions" panel, present
  on this stage in both views.
- **Stage participants**: the Participants panel, and the recommend-only
  limitation behind the recommending-editor rows.
- **Reviewer suggestions**: the suggestions panel, shown here when enabled.
- **My Submissions**: the author's entry route into this screen (Rule 10).
- **Publish, schedule & versions**: the destination of the Schedule For
  Publication shortcut (Rule 7).
- **Production stage / Publish, schedule & versions**: on a preprint server,
  which has no Submission stage, the decision buttons this stage would carry
  ("Decline Submission", "Revert Decline", "Post the preprint") sit on the
  Production stage instead [OPS1](#ops1).

## Canonical scenarios

Every scenario but 11 runs on the seeded journal with ready accounts and
scratch submissions, scenarios 2 to 6 reaching their states by recording
the decisions on screen; scenario 11 runs on a scratch journal with
throwaway accounts. A preprint server has no Submission stage, so only
scenario 9, its absence scenario, runs there; the accounts, their
passwords, the mail catcher's address and the tooling recipe are in the
footnote. <sup>s</sup>

1. **Open a new submission at the Submission stage** {OJS OMP}

   Given: Editor, on the dashboard, with a freshly submitted article
   carrying the author's uploaded file.

   - **The Submission stage**: open the article's workflow: it lands on the
     Submission stage, which shows the "Submission Files" panel listing the
     author's uploaded file, the "Desk Review Tasks & Discussions" panel and
     the "Participants" panel, in that order (Rule 1).
   - **The decision buttons**: at the top of the screen, "Send for Review",
     "Accept and Skip Review" and "Decline Submission" (on a press the
     roster scenario 8 reads [OMP1](#omp1)) (Rules 2–4).
   - **"Schedule For Publication"** {OJS}: a journal also offers this button
     at the top; press it: the panel moves to the publication's "Title &
     Abstract"; select "Submission" in the workflow menu again: the three
     decision buttons are still offered, no decision having been recorded
     (Rule 7).
   - **Control**: no status box sits above the "Submission Files" panel, and
     the stage label under the submission's title reads "Submission"
     (Rules 4, 8).

2. **Send the submission to review** {OJS OMP}

   Given: Editor, with a freshly submitted article open at its Submission
   stage.

   - **"Send for Review"**: press it ("Send to External Review" on a press
     [OMP1](#omp1)) and complete the decision wizard: the workflow moves to
     the Review stage, and the workflow menu now shows "Review" with "Review
     Round 1" (on a press "External Review" with "Review Round 1") (Rule 2;
     Side effects).
   - **The Submission stage after the move**: select "Submission" in the
     workflow menu: its panels show, and no decision buttons remain
     (Rule 9).
   - **Control**: before the decision, the same screen offered "Send for
     Review", "Accept and Skip Review" and "Decline Submission" (Rules 2–4).

3. **Accept and skip review** {OJS OMP}

   Given: Editor, with a second freshly submitted article open at its
   Submission stage.

   - **"Accept and Skip Review"**: press it and complete the wizard: the
     submission moves to the Copyediting stage (Rule 3).
   - **The Submission stage after the move**: select "Submission" in the
     workflow menu: a status box now sits at the top of the panel column,
     above the "Submission Files" panel, reading "The submission is
     currently in the Copyediting stage."; the panels show below it, and no
     decision buttons (Rules 8, 9).
   - **Control**: before the decision, no status box sat above "Submission
     Files" (Rule 8).

4. **Decline a submission** {OJS OMP}

   Given: Editor, with a third freshly submitted article open at its
   Submission stage, and on the same journal a Journal Manager and a
   Section Editor assigned to that article.

   - **"Decline Submission"**: press it and complete the wizard: back on the
     Submission stage, the stage label under the submission's title reads
     "Declined" in place of "Submission", the onward buttons are gone and
     "Revert Decline" is offered in their place; on a journal the "Schedule
     For Publication" shortcut stays [A1](#a1) (Rules 4, 5, 7).
   - **The Journal Manager**: opens the declined submission: "Revert
     Decline" and, additionally, "Delete" (Rule 6).
   - **Control**: the Section Editor opens the declined submission: "Revert
     Decline" and no "Delete" (Rule 6; Actors row 7).

5. **Revert a decline** {OJS OMP}

   Given: Editor, with the declined submission of scenario 4 open at its
   Submission stage.

   - **"Revert Decline"**: press it and complete the wizard: the submission
     returns to the queued state: the stage label reads "Submission" again,
     and the onward buttons "Send for Review", "Accept and Skip Review" and
     "Decline Submission" are offered again (Rules 4, 5).
   - **Control**: "Revert Decline" and "Delete" are no longer offered, each
     being offered only while the submission stands declined (Actors rows
     6–7).

6. **Delete a declined submission** {OJS OMP}

   Given: Journal Manager, with an Author's submission declined at the
   Submission stage and open there.

   - **"Delete"**: press it: a dialog asks "Are you sure you want to
     permanently delete this submission?"; confirm: the submission is
     removed and the workflow panel closes (Rule 6).
   - **The dashboard's "Declined" view**: open it: the submission no longer
     appears (Rule 6; Side effects).
   - **The Author's mailbox**: no email has arrived (Side effects).
   - **Control**: a Section Editor assigned to the same declined submission,
     opening it before the delete, sees "Revert Decline" and no "Delete"
     button (Actors row 7).

7. **The author's view** {OJS OMP}

   Given: Author, on My Submissions, with their own freshly submitted
   article.

   - **The Submission stage**: open the article's workflow: it shows the
     "Submission Files" panel and the "Desk Review Tasks & Discussions"
     panel, and nothing else: no "Participants" panel (Rule 10).
   - **The top of the screen**: no decision buttons, no "Delete", and no
     "Schedule For Publication" shortcut (on a journal, where the editorial
     view offers one); there is no way to send, accept, decline or delete
     the submission from the author's view (Rule 10; Actors row 8).
   - **Control**: an Editor opening the same submission sees the
     "Participants" panel and the decision buttons "Send for Review",
     "Accept and Skip Review" and "Decline Submission" (Rules 1–4).

App-specific:

8. **{OMP} A press's Submission-stage decisions**

   Given: Press Editor, with two new monographs, each open at its Submission
   stage in turn.

   - **The decision buttons**: on the first monograph, the buttons read, in
     order: "Send to External Review", "Accept and Skip Review", "Decline
     Submission", and last "Send to Internal Review"; the journal's
     "Schedule For Publication" shortcut is absent (Rules 2, 7)
     [OMP1](#omp1).
   - **"Send to External Review"**: press it and complete the wizard: it
     skips the internal review stage and opens External Review Round 1
     directly: the workflow menu shows "External Review" with "Review Round
     1" (Rule 2) [OMP1](#omp1).
   - **"Send to Internal Review"**: on the second monograph, press it and
     complete the wizard: the submission moves into the earlier Internal
     Review stage instead: the workflow menu shows "Internal Review" with
     "Review Round 1"; the stage itself belongs to
     *Internal Review stage* {OMP} (Rule 2) [OMP1](#omp1).
   - **Control**: after either move, the monograph's Submission stage shows
     its panels and no decision buttons (Rule 9).

9. **{OPS} No Submission stage on a preprint server**

   Given: Preprint Server Manager, with a submitted preprint.

   - **The workflow menu**: open the preprint's workflow: the workflow menu
     offers only "Production"; no "Submission" entry appears [OPS1](#ops1).
   - **The decision buttons**: none of the send-to-review buttons ("Send for
     Review", "Send to External Review", "Send to Internal Review"), "Accept
     and Skip Review" or the "Schedule For Publication" shortcut exists
     anywhere on the screen [OPS1](#ops1).
   - **Control**: the Production stage shows its own controls, "Post the
     preprint" and "Decline Submission", so the workflow itself is working
     [OPS1](#ops1).

10. **An assistant assigned at the Submission stage** {OJS OMP}

    Given: Funding Coordinator, on the dashboard, assigned to a freshly
    submitted article.

    - **The Submission stage**: open the article's workflow: the "Submission
      Files" panel, the "Desk Review Tasks & Discussions" panel and the
      "Participants" panel show, in that order (Actors row 1; Rule 1).
    - **The decision buttons**: none: no "Send for Review", "Accept and Skip
      Review" or "Decline Submission" (on a press none of scenario 8's
      roster) (Actors row 2).
    - **"Schedule For Publication"** {OJS}: a journal offers the shortcut at
      the top of the screen to this role too; press it: the panel moves to
      the publication's "Title & Abstract" (Actors row 8; Rule 7). A press
      shows no such button (Rule 7).
    - **Control**: an Editor opening the same submission is offered "Send
      for Review", "Accept and Skip Review" and "Decline Submission" (Rules
      2–4).

11. **Reviewers suggested by the author** {OJS OMP}

    Given: on a scratch journal with "Reviewer Suggestion at Submission" on,
    an Editor and two submitted articles, the first carrying the one
    reviewer suggestion its author entered when submitting, "Sam Suggested"
    with the reason "Knows the field.", the second carrying none.

    - **The first article's Submission stage**: open it: a fourth panel
      headed "Reviewers Suggested by Author" sits under the "Participants"
      panel and lists "Sam Suggested" with the reason "Knows the field."
      (Rule 1; Settings).
    - **Control**: open the second article: the "Submission Files", "Desk
      Review Tasks & Discussions" and "Participants" panels, and no
      "Reviewers Suggested by Author" panel (Rule 1).

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — states:
  - the author's submission-status summary on a submission that has left
    the Submission stage (Rule 10): scenario 7 opens a submission still at
    the stage
- **Nothing new to test**:
  - the panels for an assigned Section Editor, Guest Editor or Site
    Administrator (Actors row 1): the three panels scenario 1 reads as the
    Editor and scenario 10 as the Funding Coordinator
  - an Editor's or a Site Administrator's "Delete" on a declined submission
    (Actors row 7, Rule 6): the button scenario 6 presses as the Journal
    Manager
- **Register carries it**:
  - A1 (the "Schedule For Publication" shortcut shown while the submission
    stands declined; Rule 7; scenario 4 marks it)
  - A2 (a recommending editor's reduced subset of the decision buttons;
    Actors rows 2–3)
  - A3 (the empty workflow shell behind the "Invalid submission." error
    after a delete; Rule 6)
- **No seed**:
  - the delete refused behind the button for a role never shown it (Actors
    row 7)
  - the "Schedule For Publication" shortcut for a recommend-only editor
    (Actors row 8, Rule 7): no seed sets an assignment's recommend-only
    flag
- **Owned by another feature**:
  - a Copyeditor, Layout Editor or Proofreader assigned here getting the
    no-access box (Actors row 1; *Workflow screen & stage access*,
    scenario 3)
  - a deleted submission's stale dashboard address answering "Error" /
    "Invalid submission." (Rule 6; *Workflow screen & stage access*,
    scenario 14)
  - the old author-dashboard address forwarding the Author to the panel
    (Rule 11; *Workflow screen & stage access*, scenario 6; *My
    Submissions*, scenario 1)
  - each decision's email, notification and log entry, and the decision
    wizard itself (Side effects; Cross-feature; *Editorial decision
    recording*)
  - the panels' mechanics and the decisions' destinations (Cross-feature;
    *Submission files*, *Tasks & discussions*, *Stage participants*,
    *Reviewer suggestions*, *Review stage & rounds*, *Copyediting stage*,
    *Publish, schedule & versions*)
  - a preprint server's decline, revert and post on the Production stage
    (Cross-feature; *Production stage*, *Publish, schedule & versions*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-02), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | A recommend-only editor is offered a subset of the real decision buttons, not the Review stage's dedicated recommendation controls | ❓ | user-visible | — |
| [A1](#a1) | The "Schedule For Publication" shortcut is offered on the Submission stage of a declined submission, where scheduling has no meaning | ❓ | minor | — |
| [A3](#a3) | A deleted submission's old address answers with an "Invalid submission." error dialog, but an empty leftover dialog lingers behind it | ❓ | minor | — |
| [OMP1](#omp1) | A press adds Internal Review routing to the Submission stage (Send to Internal Review; External Review skips internal) | ✅ | — | — |
| [OPS1](#ops1) | A preprint server has no Submission stage at all; its workflow is single-stage (Production only) | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — "Schedule For Publication" shown on a declined submission** · ❓ · minor.
On a journal, the "Schedule For Publication" shortcut at the top of the
Submission stage is shown regardless of the submission's status. So a declined
submission, whose only meaningful actions are Revert Decline and Delete, still
offers a button that jumps to the publication's Title & Abstract, where
scheduling remains offered. The shortcut records no decision and changes
nothing on its own. The cost is a misleading button, not a wrong action.
Question: should the Schedule For Publication shortcut be hidden while the
submission stands declined (or otherwise not yet ready to schedule)? Lean:
hide it in the declined state. It invites an action that cannot sensibly
follow.
Basis: observed on a running site (2026-08-02) + code inspection (the shortcut
is added unconditionally, ahead of the status-gated decision buttons).
<sup>[g](#fn-g)</sup>

<a id="a2"></a>
**A2 — Recommend-only editor is offered real decision buttons** · ❓ · user-visible.
On the Review stage, an editor whose participation is limited to
recommendations gets dedicated "Recommend…" controls in place of the decision
buttons. On the Submission stage, the same editor is instead offered a reduced
subset of the ordinary decision buttons: "Send for Review" on a journal,
"Send to Internal Review" on a press. The standard panels appear around them,
including a working "Assign" on Participants. Their row on the Participants
panel is annotated "Only allowed to recommend an editorial decision". The
reduced button is a working control, not a leftover: pressing it completes the
decision wizard and records the decision.
Question: what is a recommend-only editor meant to be offered on the
Submission stage? Lean: mirror the Review stage's recommend-only treatment.
Offering the ordinary decision buttons to an editor the screen itself labels
recommend-only is at least misleading.
Basis: observed on a running site (2026-08-02) + code inspection (the
Submission-stage button logic has no recommend-only branch, unlike the Review
stage's). <sup>[c](#fn-c)</sup> <sup>[d](#fn-d)</sup>

<a id="a3"></a>
**A3 — An empty leftover dialog lingers behind a deleted submission's error dialog** · ❓ · minor.
After a submission is deleted (Rule 6), revisiting its old workflow address (a
stale bookmark, a link in an old email) does get an answer: the dashboard opens
with an error dialog reading "Error" / "Invalid submission." / "OK", so the
reader is told the submission is gone. What remains is cosmetic. The error
arrives stacked over a lingering, essentially empty workflow dialog. That
dialog shows only the submission's number and a raw placeholder code where its
help link should be. It should have closed instead, or the listing itself
should have noted that the submission is gone.
Question: should the empty workflow dialog close (and its placeholder render
as a real label) when the error reports the submission invalid? Lean: tidy
it. The explicit error dialog is arguably correct behavior; the leftover shell
behind it just reads as unfinished.
Basis: observed on a running site (2026-08-02, journal and press, every role
and address form tried; identical end state each time).
<sup>[f-a3](#fn-a3)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Internal Review routing on the Submission stage** · ✅ · intended divergence.
A press's Submission stage offers two routes into review.
"Send to External Review" skips the internal review stage and opens External
Review Round 1. "Send to Internal Review" routes the submission into the
earlier Internal Review stage. A journal has a single "Send for Review" route
and no internal review stage. The Internal Review stage itself, and its own
round machinery, belong to *Internal Review stage* {OMP}.
Basis: code inspection (the press's Submission-stage decision set is
press-specific by design) + observed live (2026-08-02): both routes present
and landing as described. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — No Submission stage on a preprint server** · ✅ · intended divergence.
A preprint server runs a single-stage workflow. Its only workflow stage is
Production, so a preprint is never in a Submission stage and no Submission
entry appears in a preprint's workflow menu. None of this spec's decision
buttons or Submission-stage panels appear there. The editorial moves that a
Submission stage would carry on a journal (declining, reverting a decline, and
moving the work onward by posting the preprint) happen on the Production stage
instead and belong to *Production stage* and *Publish, schedule & versions*.
The Submission-stage configuration a preprint server inherits from the shared
workflow code never comes on screen, because no preprint ever occupies that
stage.
Basis: code inspection (the application declares Production as its only
workflow stage) + observed live (2026-08-02): Production is the only menu
entry and none of this spec's buttons appear anywhere in a preprint's
workflow. <sup>[p](#fn-p)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The workflow page composes each stage from the shared UI library's
`useWorkflowConfig` composables (`lib/ui-library/src/pages/workflow/composables/
useWorkflowConfig/`). Editorial Submission-stage panels come from
`workflowConfigEditorialOJS.js` `[WORKFLOW_STAGE_ID_SUBMISSION]`:
`getPrimaryItems` → `FileManager` namespace `SUBMISSION_FILES` (atom AFFW-286,
panel title `submission.submit.submissionFiles` "Submission Files") +
`DiscussionManager` (AFFW-287); `getSecondaryItems` → `ParticipantManager`
(AFFW-288) + `ReviewerSuggestionManager` when
`pageInitConfig.publicationSettings.isReviewerSuggestionEnabled` (AFFW-289). A
common `getPrimaryItems` prepends `WorkflowSubmissionStatus` for every stage
(note h). OMP composes via `useWorkflowConfigOMP.js` (`deepMerge` of the OJS
config then `workflowConfigEditorialOMP.js`); OMP's config defines its own
`[WORKFLOW_STAGE_ID_SUBMISSION].getActionItems` (note e) but does not redefine
the primary/secondary panels, so the panel roster is shared. OPS composes via
`useWorkflowConfigOPS.js` (`deepMerge` of OJS + `workflowConfigEditorialOPS.js`)
— see note p for why the Submission block never mounts there. Stage-open access
is the shared `permissions.accessibleStages` gate, owned by *Workflow screen &
stage access*. Live-observed 2026-08-02 (OJS and OMP): the panels render as
listed; the discussions panel is headed "Desk Review Tasks & Discussions" (not
"Discussions"). The reviewer-suggestions panel was observed on OJS only
(shared panel config): with "Reviewer Suggestion at Submission" enabled but no
suggestions entered, no panel renders; with one suggestion entered through the
submission wizard, the panel "Reviewers Suggested by Author" renders under
Participants with the suggested reviewer and the author's reason. Which
assistants see the panels, live-probed 2026-09-02 (OJS and OMP, all four
assigned as participants to a submission at the Submission stage, each
opening it by the dashboard address): `copyeditor.carla`, `layouteditor.leo`
and `proofreader.pia` got "Workflow: Submission" over one line, "You don't
currently have access to that stage of the workflow.", and nothing else;
`assistant.rita` (Funding coordinator) got "Current Submission Language:
English", "Submission Files" (with "Upload"), "Desk Review Tasks &
Discussions" (with "Add"), "Participants", on OJS also "Schedule For
Publication", and no decision buttons. The gate is the group's stage set on
the Roles settings screen (Copyeditor: Copyediting; Layout Editor and
Proofreader: Production; Funding coordinator: Submission and Review).

<a id="fn-c"></a>
**c** — The decision the buttons expose is built server-side by
`APP\submission\maps\Schema::getAvailableEditorialDecisions()` (per app),
gated by `checkDecisionPermissions()` (shared, `lib/pkp/classes/submission/
maps/Schema.php`): an editor's `canMakeDecision` is true only when they hold a
non-recommend-only Manager/Sub-editor stage assignment (or a non-recommend-only
Manager/Site-Admin group when unassigned); `isOnlyRecommending` is true when
they hold only recommend-only editorial assignments. Assistant-level roles pass
the `userHasAccessibleRoles` check but never satisfy `canMakeDecision`, so
`getAvailableEditorialDecisions()` returns an empty roster for them and no
buttons render. The UI reads the roster through `useSubmission().
isDecisionAvailable()`, which matches a decision's `stageId` against the
submission's active stage (note e). Live-observed 2026-08-02: an assigned
assistant gets no decision buttons on either app — on OMP no action area at
all, on OJS only the Schedule For Publication shortcut (note g) — and her
Participants panel is read-only (no "Assign", no row actions; panel mechanics
are *Stage participants*'). A recommend-only editor's observed offering is
finding A2.

<a id="fn-d"></a>
**d** — For a **queued** submission at `WORKFLOW_STAGE_ID_SUBMISSION` the OJS
roster is `SendExternalReview` + `SkipExternalReview` + `InitialDecline`; for a
**declined** submission it is `RevertInitialDecline` only. OMP's roster
(`omp-main/classes/submission/maps/Schema.php`) is `SkipInternalReview` +
`SkipExternalReview` while queued, plus `InitialDecline` and `SendInternalReview`;
declined → `RevertInitialDecline` only. Both apps' recommend-only rosters come
from `Repo::decision()->getDecisionTypesMadeByRecommendingUsers(SUBMISSION)`:
OJS `[SendExternalReview]`, OMP `[SendInternalReview]`. Live-observed
2026-08-02: a recommend-only editor sees exactly those buttons — "Send for
Review" (OJS), "Send to Internal Review" (OMP) — with the participant row
annotated "Only allowed to recommend an editorial decision" (finding A2).
Driven 2026-08-02 (OJS): pressing the recommend-only editor's button completed
the decision wizard and recorded the decision — the control works; OMP shows
the equivalent button (the press was not driven through the press itself).

<a id="fn-e"></a>
**e** — Buttons: `workflowConfigEditorialOJS.js` `[WORKFLOW_STAGE_ID_SUBMISSION].
getActionItems` pushes `WorkflowActionButton`s guarded by `isDecisionAvailable(
submission, DECISION_*)` — `DECISION_EXTERNAL_REVIEW` (label
`editor.submission.decision.sendExternalReview`, "Send for Review" on OJS),
`DECISION_SKIP_EXTERNAL_REVIEW` (`…skipReview`, "Accept and Skip Review"),
`DECISION_INITIAL_DECLINE` (`…decline`, "Decline Submission"),
`DECISION_REVERT_INITIAL_DECLINE` (`…revertDecline`, "Revert Decline"). OMP's
`workflowConfigEditorialOMP.js` replaces this getter wholesale: it uses
`DECISION_SKIP_INTERNAL_REVIEW` for the primary button (which localizes to
`editor.submission.decision.sendExternalReview`, "Send to External Review" on a
press), plus `DECISION_SKIP_EXTERNAL_REVIEW`, `DECISION_INITIAL_DECLINE`,
`DECISION_REVERT_INITIAL_DECLINE`, and `DECISION_INTERNAL_REVIEW`
(`…sendInternalReview`, "Send to Internal Review"). Decision types and their
transitions (`lib/pkp/classes/decision/types/`, OMP `omp-main/classes/decision/
types/`): `SendExternalReview` → `WORKFLOW_STAGE_ID_EXTERNAL_REVIEW`;
`SkipExternalReview` → `WORKFLOW_STAGE_ID_EDITING` (copyediting); `InitialDecline`
→ status `STATUS_DECLINED`, no stage change; `RevertInitialDecline` → status
`STATUS_QUEUED`; OMP `SkipInternalReview extends SendExternalReview` → external
review; `SendInternalReview` → `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`. `isDecisionAvailable`
matches against `getActiveStage(submission)`, so buttons vanish once the
submission leaves the stage (Rule 9). No app subclasses either grid handler or
the decision types beyond the OMP internal-stage set (positive chain evidence
for the OJS types). Live-observed 2026-08-02: the queued rosters verbatim —
OJS "Schedule For Publication" / "Send for Review" / "Accept and Skip Review" /
"Decline Submission"; OMP "Send to External Review" / "Accept and Skip Review"
/ "Decline Submission" / "Send to Internal Review" (that order — Internal
last; re-confirmed verbatim and in order on a second drive, 2026-08-02, with
no Schedule For Publication shortcut) — and the declined rosters of Rules 5–6.
"Send for Review" opened Review Round 1; "Send to External Review" opened
External Review Round 1 with the Internal stage left round-less; "Send to
Internal Review" opened Internal Review Round 1. Accept and Skip Review
observed live 2026-08-02 on OJS and OMP (wizard "Accept and Skip Review:
Notify Authors" → "Skipped Review"; stage label "Copyediting" on both apps;
Rule 3). Revert Decline observed live 2026-08-02 on OJS (wizard "Revert
Decline / Notify Authors / Submission Reactivated"; stage label back to
"Submission" with the full onward roster restored; Rule 5). The buttons'
disappearance after the stage is left observed live 2026-08-02 on OJS on two
independent submissions: after Accept and Skip Review, as after Send for
Review, the reopened Submission-stage entry offered only the Schedule For
Publication shortcut (note g) and none of the decision buttons (Rule 9,
scenarios 2–3).

<a id="fn-f"></a>
**f** — Delete: `workflowConfigEditorialOJS.js` (and the OMP getter) push a
`WORKFLOW_DELETE_SUBMISSION` button guarded by
`isDecisionAvailable(DECISION_REVERT_INITIAL_DECLINE)` (so, declined only) **and**
`hasCurrentUserAtLeastOneAssignedRoleInAnyStage(submission, [ROLE_ID_MANAGER,
ROLE_ID_SITE_ADMIN])`. The action (`useWorkflowActions().workflowDeleteSubmission`)
opens a `useModal` dialog titled `common.delete` "Delete", message
`editor.submissionArchive.confirmDelete` "Are you sure you want to permanently
delete this submission?", buttons "Confirm"/"Cancel", then `DELETE
/api/v1/{context}/_submissions/{id}`. The endpoint
(`lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController::delete()`)
enforces `Repo::submission()->canCurrentUserDelete()` =
Manager (context) or Site Administrator, or an Author of an **incomplete**
submission (the wizard-draft path, not this button). No app overrides
`canCurrentUserDelete` (empty chain — shared). Live-observed 2026-08-02 (OJS
and OMP): the button and dialog verbatim as ruled — shown to a Journal Manager
on a declined submission only, not to a Section Editor on the same submission,
not on a queued one; confirming removed the submission from the dashboard's
Declined view and closed the workflow. Re-confirmed 2026-08-02 on a second
pass: the press delete driven end to end (declined roster, dialog verbatim,
confirm removes the monograph and closes the workflow), and the journal's
Declined-view before/after check walked as scenario 6 prescribes — the
declined submission listed only in the Declined view, never the default view,
gone from it after the delete; the Section Editor's missing Delete control
re-confirmed. The server-side refusal for other roles rests on the code above;
only the button's absence was verified live. Live-probed 2026-09-02 (OJS and
OMP, a submission declined at Submission): `editor.diana` (Journal editor /
Press editor, a `ROLE_ID_MANAGER` group, so it passes the
`hasCurrentUserAtLeastOneAssignedRoleInAnyStage` check) was offered
"Schedule For Publication" (OJS), "Revert Decline", "Delete"; pressing
"Delete" opened the same "Delete" / "Are you sure you want to permanently
delete this submission?" dialog, and "Cancel" kept the panel and the button;
`sectioneditor.ana` (assigned Section editor) was offered "Revert Decline"
only. The browser sends the delete as `POST …/api/v1/_submissions/{id}` (the
DELETE route by method override), answered 200.

<a id="fn-a3"></a>
**f-a3** — Live-observed 2026-08-02 (OJS and OMP, identical terminal state;
driven as Journal Manager, Section Editor and Site Administrator on the
editorial address and as the author on My Submissions): after the delete, the
old workflow address opens the populated dashboard with an error dialog —
heading "Error", message "Invalid submission.", button "OK" — stacked over a
lingering workflow dialog that contains only the submission's id and a raw
`##common.help##` locale key in place of its help link. The empty shell also
paints alone for ~200 ms (warm; longer cold) before the error dialog attaches
— the transient state an earlier probe recorded as a silent empty page
(finding A3).

<a id="fn-g"></a>
**g** — `workflowConfigEditorialOJS.js` `[WORKFLOW_STAGE_ID_SUBMISSION].
getActionItems` pushes a `WorkflowActionButton` labeled
`editor.submission.schedulePublication` "Schedule For Publication",
`action: 'navigateToMenu'`, target `publication_{publicationId}_titleAbstract`
— a navigation to the publication's Title & Abstract, not a decision — and it is
pushed **unconditionally**, ahead of the status-gated decision buttons (basis of
finding A1). OMP's replacement getter omits it, so a press shows no such button
(atom AFFW-290 is `ojs,ops`). Live-observed 2026-08-02 (OJS): present while
queued and while declined, and for every role probed with workflow access —
recommend-only editor, Section Editor on a declined submission, assigned
assistant (whose action area holds that single button and nothing else);
pressing it landed on the publication's Title & Abstract with scheduling still
offered. OMP showed no such button in either state.

<a id="fn-h"></a>
**h** — The status box is `WorkflowSubmissionStatus.vue`
(`lib/ui-library/src/pages/workflow/components/primary/`), mounted by every
stage's common `getPrimaryItems`. Its message is computed for: stage not started
(`workflow.stageNotStarted`), a future active stage (`workflow.submissionInFutureStage`
/ "The submission is currently in the {$stage} stage."), the review stages, and Production;
for a submission **active at the Submission stage** none of those branches
matches and the component renders nothing (Rule 8). Live-observed 2026-08-02
(OJS and OMP): a queued submission shows no status box; the only state
indicator is the stage label under the submission's title — "Submission" while
queued, "Declined" after a decline (Rule 4).

<a id="fn-i"></a>
**i** — Author view: `workflowConfigAuthorOJS.js` (and the OMP duplicate)
`[WORKFLOW_STAGE_ID_SUBMISSION].getPrimaryItems` → `SubmissionStatus` only when
`hasSubmissionPassedStage(submission, WORKFLOW_STAGE_ID_SUBMISSION)`
(`submission.stageId > SUBMISSION`), then `FileManager` `SUBMISSION_FILES`
(AFFW-302..303) + `DiscussionManager`; the author config defines no
`getActionItems` for this stage, so no decision buttons render. `SUBMISSION_FILES`
grants the author `FILE_LIST`/`FILE_EDIT`/`FILE_DOWNLOAD_ALL`
(`managers/FileManager/useFileManagerConfig.js`). OPS's author config
(`workflowConfigAuthorOPS.js`) defines no Submission stage at all (note p).
Live-observed 2026-08-02 (OJS and OMP): the author's view holds the two panels
only — no Participants panel, no action area, no schedule shortcut — and the
author's Submission Files panel offers no Upload button despite the config's
file-edit grant (list-only live; panel mechanics are *Submission files*').

<a id="fn-j"></a>
**j** — Legacy grids: `AuthorSubmissionDetailsFilesGridHandler` (GRID-032) and
`EditorSubmissionDetailsFilesGridHandler` (GRID-033),
`lib/pkp/controllers/grid/files/submission/` (roles include Manager, Sub-editor,
Assistant, Author; ops `fetchGrid`/`fetchRow`), mounted by
`lib/pkp/templates/controllers/tab/authorDashboard/submission.tpl` (`load_url_in_div
id="submissionFilesGridDiv"`, atom AFFW-706) and `…/editorial.tpl`. The
author-dashboard entry point `PKPAuthorDashboardHandler::submission()` now
`redirectUrl`s to `dashboard/mySubmissions?workflowSubmissionId={id}` — the
current Vue workflow — so the legacy tab is no longer shown. No app subclasses
either grid handler (empty chains). Live-observed 2026-08-02 on all three
apps: the old address, typed as the submitter, 302-redirects (via a locale
hop) to the current dashboard — OJS and OMP land on My Submissions with the
modern workflow dialog open, OPS on the submission's publication tabs — and
the legacy page's body class matches zero elements, so the legacy grids render
nowhere. The author forward re-confirmed live 2026-08-02 on OJS and OPS; every
other signed-in role is denied before any redirect — an Editor and a Journal
Manager (OJS) and a Moderator (OPS) get "You do not currently have sufficient
privileges to view the submission.", and an author who is not this
submission's gets "You don't currently have access to that stage of the
workflow." — the legacy handler admits the author role only
(`AuthorDashboardAccessPolicy`, `ROLE_ID_AUTHOR`), one shared code path across
apps.

<a id="fn-omp1"></a>
**f-omp1** — OMP Submission-stage roster (note d) and action-item builder
(note e): `SkipInternalReview` (primary, labeled "Send to External Review") and
`SendInternalReview` ("Send to Internal Review") give the press its two review
routes; `SendInternalReview` targets `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`
(*Internal Review stage* {OMP}). Live-observed 2026-08-02:
"Send to External Review" opened External Review Round 1 with no internal
round created; "Send to Internal Review" opened Internal Review Round 1.

<a id="fn-p"></a>
**p** — `ops-main/classes/core/Application::getApplicationStages()` returned
`[WORKFLOW_STAGE_ID_PRODUCTION]` only until 2026-09-08; since pkp/pkp-lib#13109
(ops `16bbd9b90e`) it returned Production and `WORKFLOW_STAGE_ID_DONE` (6), as
every app's list then ended with Done; since 2026-09-12 it returns Production
alone again (pkp/pkp-lib#13312, ops `97d8a0d2e8`, lib/pkp `65901c4f7a`: Done out
of every app's list, kept in `PKPApplication::getValidStages()` for the
stage-access policy alone). Neither changes anything on this screen: the
OPS workflow menu (`useWorkflowNavigationConfigOPS.js::getWorkflowItems()`)
decides its own entries and pushes only the
Production stage entry (`manager.publication.productionStage` "Production"), and
`workflowConfigAuthorOPS.js` exports an empty `WorkflowConfig`. OPS's editorial
config still inherits the OJS Submission-stage block through the `deepMerge` in
`useWorkflowConfigOPS.js` (atoms AFFW-286..289, 290..295 carry an `ops` marking
on this basis), but no preprint ever occupies `WORKFLOW_STAGE_ID_SUBMISSION`, so
the block is never mounted. OPS's own decision roster
(`ops-main/classes/submission/maps/Schema::getAvailableEditorialDecisions()`)
serves only the Production and Done stages (`Decline`/`RevertDecline`/
`ReturnToWorkflow`/`ReturnToDone`), never the Submission stage. Live-observed
2026-08-02: a preprint's workflow menu offered Production only, no Submission
entry and none of this spec's decision buttons anywhere in the dialog, while
Production showed its own controls ("Post the preprint", "Decline
Submission"); same-day checks on OJS and OMP showed the Submission entry and
its decisions as expected (finding OPS1). Cited from the body as
<sup>p</sup>.

<a id="fn-s"></a>
**s** — Scenario seeding uses the seeded test journal/press (`publicknowledge`)
and roster accounts (passwords = username doubled). New submissions are seeded
through the scenario submission endpoint with no decisions (`submitted: true`,
stage 1), submitter `author.alex`; a seed carries no files, so scenario 1
provides "the author's uploaded file" through the "Submission Files" panel's
own "Upload" wizard. The declined and post-decision states are reached by
driving the decision wizard through the UI so the emails and transitions are
real. Scenarios 1–5: `editor.diana` (a Journal-editor-group account with
decision rights) on scratch submissions; 4 also needs `manager.maya` (Journal
Manager) and `sectioneditor.ana` (Section Editor, assigned on submit as the
seeded section's or series' editor: OJS ART, OMP `series: 'monographs'`) to
contrast the Delete button. 6: `manager.maya` on a declined scratch
submission, `sectioneditor.ana` assigned as in 4; the mailbox read is
`author.alex`'s address in the mail catcher, Mailpit at
`http://127.0.0.1:8025` (other suites' decision mail to `author.alex` arrives
there in parallel, so the test may run 6 on a scratch journal from the
context scenario with throwaway `roles: ['manager']`, `['sectionEditor']` and
`['author']` accounts, as *Workflow screen & stage access*' scenario 14
does). 7: `author.alex` on their own scratch submission, control
`editor.diana`. 8: two scratch monographs via the OMP fleet (`series:
'monographs'`), `editor.diana`. 9: a scratch preprint via the OPS fleet,
`manager.maya`. 10: `assistant.rita` (Funding Coordinator, stages Submission
and Review) seeded as `participants: [{username: 'assistant.rita', role:
'funding'}]` on a scratch submission, control `editor.diana`. 11: OJS and OMP
fleets, a scratch journal from the context scenario with `review:
{reviewerSuggestionEnabled: true}` and `users` of one `roles: ['editor']` and
one `roles: ['author']` account; two `submitted: true` submissions by that
author, the first with `reviewerSuggestions: [{givenName: 'Sam', familyName:
'Suggested', email: 'sam.suggested@mail.test', suggestionReason: 'Knows the
field.'}]`, the second without the key (OPS answers 400 on both keys, and
the seeded journal keeps the setting off). Never decline or delete a shared
roster submission — use scratch submissions so parallel tests are unaffected.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Submission stage (editorial view) | workflow → Submission stage menu entry | AFFW-286..289 |
| Submission-stage decision buttons {OJS} | workflow Submission stage → action buttons | AFFW-290..295 |
| Submission-stage decision buttons {OMP} | workflow Submission stage → action buttons | AFFW-296..301 (296..300 in scope; 301 Send to Internal Review is cited from *Internal Review stage* {OMP}) |
| Submission stage (author view) | My Submissions → View → Submission stage | AFFW-302, 303 |
| Legacy author-dashboard files grid | author-dashboard tab (redirects to current workflow) | AFFW-706 · GRID-032 · GRID-033 |

## Reference — code anchors

- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` · `workflowConfigEditorialOMP.js` · `workflowConfigEditorialOPS.js` — Submission-stage panels and buttons
- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOJS.js` · `workflowConfigAuthorOMP.js` · `workflowConfigAuthorOPS.js` — author view
- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/useWorkflowConfig{OJS,OMP,OPS}.js` — per-app deepMerge composition
- `lib/ui-library/src/pages/workflow/composables/useWorkflowActions.js` — `workflowDeleteSubmission`
- `classes/submission/maps/Schema.php` (each app) — `getAvailableEditorialDecisions()`; shared `lib/pkp/.../Schema.php::checkDecisionPermissions()`
- `classes/decision/Repository.php` (each app) — `getDecisionTypesMadeByRecommendingUsers()`
- `lib/pkp/classes/decision/types/` — `SendExternalReview`, `SkipExternalReview`, `InitialDecline`, `RevertInitialDecline`; OMP `omp-main/classes/decision/types/` — `SkipInternalReview`, `SendInternalReview`
- `lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php::delete()` · `lib/pkp/classes/submission/Repository.php::canCurrentUserDelete()`
- `lib/pkp/controllers/grid/files/submission/{Author,Editor}SubmissionDetailsFilesGridHandler.php` (GRID-032/033) · `lib/pkp/templates/controllers/tab/authorDashboard/submission.tpl` (AFFW-706)
- `ops-main/classes/core/Application.php::getApplicationStages()` — OPS stage list: Production; Done added by pkp/pkp-lib#13109 (2026-09-08) and removed again by pkp/pkp-lib#13312 (2026-09-12, ops `97d8a0d2e8`; Done now in `PKPApplication::getValidStages()` only)
- App divergence points checked: no app subclass of either files-grid handler or of the OJS decision types; OMP adds its internal-review decision set; OPS reduces the workflow to one stage
