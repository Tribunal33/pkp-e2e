---
name: submission-wizard
status: verified
---

# Submission wizard {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

The submission wizard is how new work enters the journal. A signed-in user
starts on the **Make a Submission** screen and answers a few framing
questions: title, language, section. What the journal asks depends on its
setup. They then land in a guided multi-step wizard: upload files, enter
details, list contributors, answer the editors' questions, then review
everything and submit. The wizard saves the author's work automatically as
they go. It can be left and resumed at any time, its settings (language,
section) can be changed midway, and it can be cancelled outright. Submitting
hands the work to the editorial team and triggers the acknowledgement emails
and editor notifications.

This spec covers the step flow and its gates: starting, filling, saving for
later, changing settings, cancelling and submitting. It also covers the
closing screens (Saved for Later, Submission complete, Submission cancelled).
The file panel and the contributor panel have their own mechanics, described
in *Submission files* and *Contributors & affiliations*. The other embedded
panels likewise belong to their own features (see *Cross-feature
interactions*).

## Actors & permissions

**The submitting author** means the account that started the draft. It holds
an author's assignment on the submission from the moment the draft is
created. A **draft** (also called an *incomplete submission*) is a submission
that has been started but not yet submitted. Site-wide baseline: every action
below requires signing in. A signed-out visitor who reaches a wizard address
gets the Login page.

| Action | Who may — and when |
|--------|--------------------|
| **Open the Make a Submission start screen** | • any signed-in user, whatever their roles. The screen itself then decides whether they may proceed (Rule 3) <sup>c</sup> |
| **Start a submission** (press "Begin Submission") | • Author; Journal Manager: with their existing role<br>• an Editor who is also an Author: under the role they pick in "Submit As" (Rule 4a). On a preprint server a Preprint Server Manager who is also an Author picks the same way [OPS1](#ops1)<br>• a Section Editor who is also an Author: only as Author. "Submit As" also offers "Section editor", but "Begin Submission" refuses it ⚠ [A14](#a14). On a preprint server a Moderator who is also an Author is not offered the Moderator role and submits as Author<br>• Section Editor with no other role: admitted, but silently enrolled as an Author, and their submission is made under that new role instead of their editorial one ⚠ [A9](#a9). A pure Site Administrator likely gets the same treatment; this is unverified, because no scenario exercises it, and is recorded as an open question ([A9](#a9))<br>• any other signed-in user: automatically enrolled in the journal's Author role, provided an author-role group allows self-registration (Rule 3). On a preprint server the enrolment happens earlier, on merely opening the start screen ⚠ [OPS2](#ops2). With no self-registering author-role group they get the "Not Allowed" page <sup>c</sup> |
| **Open a draft's wizard** (fill, autosave, change settings, save for later, submit) | • the submitting author: their own draft<br>• Journal Manager; Site Administrator: any draft in the journal<br>• assigned Section Editor: drafts a Journal Manager has assigned them to as a participant, through the Participants panel on the draft's workflow screen (see *Stage participants*) <sup>f</sup> |
| **Cancel a draft** (the footer "Cancel" control, Rule 16) | • the submitting author; Journal Manager; Site Administrator. Only they are shown the control. Behind the scenes the deletion is refused for anyone else; that is a safeguard, not a testable step, because no other role has a control to press. On a preprint server the author's own cancel is refused too ⚠ [OPS3](#ops3) <sup>o</sup> |
| **See the Saved for Later / Submission complete / Submission cancelled screens** | • whoever may open the underlying submission. The cancelled screen names no submission and shows for anyone signed in <sup>n</sup> |
| **Reach the wizard from the reader site** ("Make a Submission" block, {OJS OMP}) | • any visitor, once a Journal Manager has enabled the block (Rule 1). It links to the journal's submissions information page, which in turn leads to the wizard <sup>a</sup> |

## Fields & validation

These are the fields of the start form (Rule 4). Later steps embed forms
owned by other features (see *Cross-feature interactions*). What the wizard
itself enforces before submission is Rule 13.

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Before you begin | — | Informational text. Shown only when the journal has configured start-of-submission guidance. |
| Title | Yes | One-line rich text. It becomes the submission's title. |
| Submission Language | Yes | Radio list. Shown only when the journal accepts submissions in more than one language. |
| Section {OJS OPS} | Yes | Radio list. Shown only when the author has more than one section open to them; with one open section it is chosen silently (Rule 4). Selecting a section with a policy shows that policy under the list. A press asks for Submission Type instead [OMP1](#omp1). |
| Submission Type {OMP} | Yes | "Monograph: Authors are associated with the book as a whole." or "Edited Volume: Authors are associated with their own chapter." [OMP1](#omp1) |
| Submission Checklist {OJS OPS} · Submission Requirements {OMP} | Yes | The journal's checklist with one confirmation box: "Yes, my submission meets all of these requirements." Shown only when a checklist is configured. <sup>d</sup> |
| Submit As | Yes | Radio list of the roles the user may submit under. Shown only when the user holds two or more roles with submission access. Which roles it lists, which one it preselects and its description: Rule 4a. <sup>d</sup> |
| Privacy Consent | Yes | "Yes, I agree to have my data collected and stored according to the privacy statement." Shown only when a privacy statement is configured. |
| Copyright (Review step) | No, but Submit stays disabled until ticked (Rule 14) | "Yes, I agree to the copyright statement." Shown on the Review step only when the journal has a copyright notice. The submission check never flags it, yet "Submit" does not enable while it is unticked (Rule 14). |

## Rules & state

1. <a id="ways-in"></a>**Ways in.** Signed in, the dashboard sidebar offers
   "Start A New Submission", which opens the **Make a Submission** start
   screen. On the reader site of a journal or press, the "Make a Submission"
   sidebar block links to the journal's submissions information page, whose
   own controls lead to the same screen. That block is installed with the
   app but switched off until a Journal Manager enables the plugin and
   places the block in the sidebar. A preprint server does not install this
   block. Old bookmarked wizard addresses from earlier versions forward to
   the current wizard. <sup>a</sup>
2. **Open or closed.** When the journal has stopped accepting submissions,
   the sidebar's "Start A New Submission" entry disappears. The start screen
   is still reachable at its own address, for example from a bookmark kept
   from when submissions were open, but it shows only the notice "This
   journal is not accepting submissions at this time. Visit the workflow
   settings to allow submissions." ⚠ [A3](#a3). Starting a new submission is
   refused. An already-started draft, however, can still be opened, filled
   and submitted ⚠ [A1](#a1). <sup>b</sup>
3. **Start-screen gates.** The start screen turns a user away with a
   "Not Allowed" page in two cases. First, they hold no role that may submit
   and no author-role user group of the journal permits self-registration
   ("You are not allowed to submit to this journal because authors must be
   registered by the editorial staff…"). Second, on a journal or preprint
   server, every section is closed to them ("…submissions to all sections
   of this journal have been deactivated or restricted…"). On a preprint
   server either explanation renders as a raw locale code under the heading
   ⚠ [OPS7](#ops7). The gate weighs the author-role groups as a set. A press
   ships two such groups out of the box, "Author" and "Chapter Author", so
   switching off self-registration on the Author group alone still leaves
   the way in open there. The page appears only when no author-role group
   permits it {OMP}. A journal or preprint server ships just one such group.
   A section is closed to an author when it has been deactivated, or when it
   is restricted to editorial roles and the user is not a Site
   Administrator, Journal Manager or Section Editor. A user with no
   submitting role who passes the gates is enrolled in the journal's
   self-registering Author role as part of starting the submission
   ⚠ [OPS2](#ops2). <sup>c</sup>
4. **The start form.** The screen is headed "Make a Submission" and carries
   the start form (fields above), ending in the primary button
   "Begin Submission". Only sections open to the author (Rule 3) are
   offered. When exactly one is open, it is applied without being shown.
   A press asks for the Submission Type instead of a section
   [OMP1](#omp1). <sup>d</sup>
4a. **"Submit As".** The list offers the user's roles with submission
    access, and the first one listed is selected when the form opens.
    - A journal and a preprint server list "Author" first. A press lists
      the roles in no fixed order, so its preselection can change from
      one visit to the next ⚠ [OMP3](#omp3).
    - On a journal or press the stock Journal Manager role has no
      submission access, so a Journal Manager who is also an Author gets
      no choice. A preprint server's manager role has it: a Preprint
      Server Manager who is also an Author is offered "Author" and
      "Preprint Server manager" [OPS1](#ops1).
    - A Section Editor who is also an Author is offered "Section editor"
      ("Series editor" on a press), which "Begin Submission" refuses
      [A14](#a14). A preprint server does not offer its Moderator role.
    - The description reads "Select the role that best describes your
      contribution to this submission." With a manager-level editorial
      role among the options ("Journal editor", "Press editor",
      "Preprint Server manager") it adds "Select an editorial role if you
      want to edit and publish this submission yourself."
    <sup>d</sup>
5. **Begin Submission creates the draft.** Pressing "Begin Submission"
   creates the submission immediately, with the entered title, the chosen
   language, section or type, and the chosen submitting role. It then opens
   the wizard at its first step. When submitting under an Author role, the
   author is also placed on the submission's Contributors list, as its
   primary contact, whether or not the author's profile carries an
   affiliation (an empty affiliation is a legitimate profile state).
   Submitting under an editorial role chosen in "Submit As" makes the
   submitter the submission's only participant, in that role, with no
   Author entry, and leaves the Contributors list empty (Rule 12b). The
   button shows a spinner while the wizard loads. <sup>e</sup>
6. **A draft persists until submitted or cancelled.** The draft appears on
   the author's My Submissions list as an incomplete submission (see *My
   Submissions*), and its wizard address can be bookmarked and reopened.
   An unfinished draft reopens the wizard **at the step recorded by "Save
   for Later"** (Rule 10). Moving between steps does not record the step
   reached, so a draft never saved for later reopens at the first step. A
   submitted submission's wizard address shows the "Submission complete" screen
   instead (Rule 15). <sup>f</sup>
7. <a id="steps"></a>**The steps.** The wizard's step rail shows, in order:
   **Upload Files**, **Details**, **Contributors**, **For the Editors**
   (titled **For Readers** on a preprint server [OPS1](#ops1)), and
   **Review**. When the journal asks authors to suggest reviewers, a
   **Reviewer Suggestions** step sits before Review {OJS OMP}. What each
   step carries:
   - *Upload Files*: the submission file panel (see *Submission files*).
     Each file is labeled with a file type. On a preprint server this step
     manages the preprint's galleys, the files readers will get, through
     its own "Files" panel: "Add File" first asks for the galley's label,
     then the upload asks for the file's Preprint Component before
     accepting the file [OPS1](#ops1). On a draft that already listed a
     galley when the wizard was opened, a further galley never gets its
     file ⚠ [OPS8](#ops8).
   - *Details*: title and abstract. The title arrives pre-filled from the
     start form. Keywords, a plain language summary, a references box,
     data citations, a data availability statement, and a Funders list
     appear only when the journal's setup asks for them. On a press this
     step also lists the book's Chapters [OMP1](#omp1).
   - *Contributors*: the contributors panel (see *Contributors &
     affiliations*). A submitter who chose "Author" is already listed
     (Rule 5).
   - *For the Editors*: the descriptive metadata the journal asks for
     (subjects, disciplines, supporting agencies, coverage, rights, source,
     type, each only when enabled), categories when the journal lets
     authors pick them, and a comments box, which is always present:
     "Comments for the Editor" on a journal, "Cover Note to Editor" on a
     press, "Comments for the Moderator" on a preprint server. A press adds
     an optional Series choice here [OMP1](#omp1).
     A preprint server adds a License choice and a required "Relation
     status" question [OPS1](#ops1).
   - *Reviewer Suggestions* {OJS OMP}: the suggestions panel (see
     *Reviewer suggestions*). Present only when enabled.
   - *Review*: Rules 12 to 12b.
   Above the rail the wizard names the submission (number, contributors,
   title, as they are filled in). On a journal or preprint server it also
   states what is being submitted, for example "Submitting to the Articles
   section in English.", with a "Change" control (Rule 11). A press states
   the work type instead ("Submitting a Monograph."). <sup>g</sup>
8. **Moving between steps.** "Continue" advances one step. "Back" returns
   one step and is absent on the first step. Completed and current steps
   can be reopened directly from the step rail; a move by "Continue" or
   from the rail saves the step being left (Rule 9). Steps not yet
   reached are not clickable there. Each step change updates the browser
   tab title ("Make a Submission: {step}") and the address bar, so the browser's own
   Back button also steps backwards through the wizard. Editing just the
   "#…" part of the address on an open wizard, though, opens any step, even
   ahead of progress. The submission check (Rule 12) runs only when Review
   opens this way. Pasting a wizard address into a new tab, or reloading,
   always ignores the "#…" part and reopens as Rule 6 describes.
   On narrow screens the rail collapses to "{n}/{total} steps" with a
   "Show all steps" control. But a wizard *loaded* at phone width (375
   pixels, say) on a journal or press keeps the full uncollapsed rail and
   the page scrolls sideways. A merely narrow fresh load (600 pixels, say)
   collapses correctly, and so does resizing an already open window down to
   phone width. A preprint server collapses correctly even on a phone-width
   load ⚠ [A10](#a10). <sup>h</sup>
9. <a id="autosave"></a>**Autosave.** The wizard saves the author's
   changes by itself, never keystroke by keystroke:
   - *Moving to another step*, by "Continue" or from the step rail, saves
     the changes made on the step being left at once, even straight
     after typing.
   - *Staying on a step*, the wizard saves on a timer instead. A change
     is saved once a minute has passed since the last save, the time the
     footer gives as "Last saved" (counted from the page load while
     nothing has been saved), not a minute after typing stops. Text typed
     straight after opening the wizard is saved about a minute after the
     opening; text typed 40 seconds after opening it, about 20 seconds
     after the typing. Text typed once that minute has run out is saved
     within a second of its first key, while it is still being typed, so
     only its first letters go then and the rest a minute later
     ⚠ [A18](#a18). A step with no change sends nothing.
   - *The footer* flashes "Saving" while a save runs and then ticks "Last
     saved {n} seconds ago". It already shows a "Last saved" time on
     first arriving, before any save has actually run ⚠ [A4](#a4).
   - *Leaving the wizard* for another address (My Submissions, say) sends
     nothing and asks nothing. A change typed within a minute of the last
     save is lost: reopened, the draft shows the old text, with no
     "Unsaved Changes" dialog ⚠ [A15](#a15). A change typed after that
     minute keeps only what the timer had already sent, often just its
     first letters [A18](#a18).
   <sup>i</sup>
9a. **A lost connection.** The wizard notices a lost connection only
    when a save fails. The footer then switches to "Reconnecting", unsent
    changes are kept in the browser, and both "Save for Later" buttons
    and "Submit" are disabled while the wizard retries on its own at
    growing intervals. Reconnection sends the kept text and re-enables the
    buttons. "Back", "Cancel" and "Continue" never disable. With nothing
    unsaved the wizard never notices the outage: nothing changes on screen
    and "Submit" stays enabled while the network is down. Reopening a
    wizard for which the browser still holds unsaved changes opens an
    "Unsaved Changes" dialog. It offers to restore them ("Yes") or discard
    them ("No, discard unsaved changes"). <sup>i</sup>
9b. **A save the server refuses.** The server refuses a step's save,
    whether sent by the timer or by "Continue", in these cases:
    - a plain language summary longer than the section's word limit
      (Rule 13) ⚠ [A16](#a16);
    - with the plain language summary set to "require" (*Settings that
      modify behavior*, "Metadata asked of authors"), saves of other
      fields, step by step in ⚠ [A20](#a20);
    - on a preprint server, a "DOI of the published preprint" typed
      without its web address
      [→ Preprint relations A7](U75-preprint-relations.md#a7).
    <sup>[fn-a19](#fn-a19)</sup>
9c. **After a refused save.** Whatever field was refused, the wizard
    hangs ⚠ [A19](#a19):
    - "Continue" still moves on one step. An "Error" dialog opens, "An
      unexpected error has occurred. Please reload the page and try
      again.", which does not name the field.
    - The footer shows "Reconnecting" and, about four seconds later,
      "Saving" for good, whether or not "OK" is pressed. No retry is
      sent, and nothing changed later in that visit is sent either.
    - Both "Save for Later" buttons and "Submit" stay disabled; "Back"
      and "Cancel" stay enabled. On "Review", "Checking your submission"
      never clears.
    - After a reload, every field the refused save sent shows what it
      held before ("Details" sends title, keywords, abstract and summary
      in one save [A16](#a16)). "Unsaved Changes" offers only changes
      made after the refusal, and "Yes" sends them.
    <sup>[fn-a19](#fn-a19)</sup>
10. **Save for Later.** "Save for Later" is offered in the header and the
    footer. It finishes any saves in flight, records the step reached, and
    lands on the **Saved for Later** screen. That screen shows a link back
    into the wizard, labeled with the draft's contributors and title, and
    the note "We have emailed a copy of this link to you at {email}." The
    email with the resume link goes to the signed-in user who pressed the
    button ⚠ [A2](#a2). If saving fails, a "Disconnected" dialog explains
    that the draft could not be saved. <sup>j</sup>
11. <a id="reconfigure"></a>**Change Submission Settings.** The "Change"
    control beside the "Submitting to…" line opens the **Change Submission
    Settings** panel. It offers the submission language (when more than one
    is supported), plus the section on a journal or preprint server, or the
    Submission Type on a press [OMP1](#omp1). Saving applies the change and
    reloads the wizard so every step reflects it. A section change can
    change what the Details step requires (Rule 13). A language change
    saves the language only; the Review step then asks for the new
    language's title, metadata, contributor names and typed institution
    names, the ones copied from the author's profile included [A13](#a13).
    With only one language
    and one open section, no "Submitting to…" line or "Change" control
    appears at all. The exception is a press, where the work-type line and
    its "Change" control always remain, because the type can always be
    changed [OMP1](#omp1). <sup>k</sup>
12. <a id="review-step"></a>**The Review step.** Entering Review checks the
    whole submission. "Checking your submission" overlays the panels while
    the check runs. The step then shows one summary panel per earlier step:
    Files (summarizing Upload Files; on a preprint server this same panel
    lists the galleys [OPS1](#ops1), but only those uploaded since the
    wizard page was last opened or reloaded ⚠ [OPS9](#ops9)), Details,
    Contributors, For the Editors, Reviewer Suggestions when that step is
    present (Rule 7) {OJS OMP}, and the app-specific panels (a License
    panel on a preprint server [OPS1](#ops1); Chapters on a press
    [OMP1](#omp1)). When several submission languages are supported, the
    Details and For the Editors panels each appear once per language.
    <sup>l</sup>
12a. **"Edit" on a panel.** Each panel has an "Edit" button that jumps
     back to its step. On a preprint server the "License" and "Relation
     status" panels' "Edit" does nothing: the wizard stays on "Review"
     ⚠ [→ Preprint relations A11](U75-preprint-relations.md#a11). The
     "For Readers" panel's "Edit" opens the step that holds both.
     <sup>l</sup>
12b. **Problems and the confirmation.** Problems are announced in a banner
     ("There are one or more problems that need to be fixed before you can
     submit…") and repeated on the specific item, for example a missing
     abstract on the Details panel. An empty Contributors panel reads "No
     contributors have been added for this submission." as a note, not a
     problem: on its own it raises no banner and "Submit" stays enabled.
     A submission started in an editorial role reaches Review that way
     (Rule 5). When the journal has a copyright notice, a final
     "Confirmation" section asks the author to tick the copyright
     agreement. <sup>l</sup>
13. <a id="submit-gates"></a>**What must be complete to submit.** The check
    behind Rule 12 requires the following in every app: a title in the
    submission language; every contributor's name present in the submission
    language, and likewise any affiliation without a registry identifier
    (how an affiliation gets one is the Contributors panel's affair, see
    *Contributors & affiliations*); every metadata item the journal's setup
    marks *required* (keywords, references, and so on); and a file of every
    file type marked *required to submit* ("A file of the {type} type must
    be uploaded…"). On a journal and a preprint server the section adds its
    own demands: an abstract unless the section waives abstracts, and the
    section's abstract word limit ("The abstract is too long…"). The
    same limit caps the plain language summary (see
    [Publication metadata](U40-publication-metadata.md)), but a summary
    over it never reaches this check: its save is refused on the way
    (Rule 9b) [A16](#a16). A press
    requires an abstract only if its setup says so. A submission whose
    section has since closed is blocked with the section-closed message
    (Rule 17). Submitting the same draft twice, say from a second browser
    tab left on Review, is refused. But the refusal ("This submission has
    already been submitted…") never reaches the screen: the author sees
    only the generic problems banner with nothing flagged below it
    ⚠ [A6](#a6). <sup>m</sup>
14. **Submitting.** On the Review step the primary button reads "Submit".
    It stays disabled until the check passes, every confirmation box is
    ticked, and no failed save has left the wizard "Reconnecting" or hung
    on "Saving" (Rules 9a, 9c). Pressing it asks for confirmation. On a journal
    the message reads: "The submission, {title}, will be submitted to
    {journal} for editorial review. Are you sure you want to complete this
    submission?" A preprint server's message says instead what happens
    next: a moderator will review it, or, for submitters who may post their
    own preprints, that they will be able to post it [OPS1](#ops1).
    Confirming submits. The draft becomes a submitted submission on the
    editorial Submission stage (a preprint server's single production stage
    [OPS1](#ops1)), the side effects fire (see *Side effects*), and if the
    copyright box was ticked the agreement is recorded in the submission's
    activity log. <sup>m</sup>
15. **Submission complete.** After submitting, the author lands on
    "Submission complete". The screen says the journal has been notified
    and a confirmation email sent. It says so even when no email went out:
    when the journal's acknowledgement setting is off, and when the
    submitter chose an editorial role in "Submit As" ⚠ [A7](#a7). Three
    links are offered: "Review this submission" (the submission's workflow,
    in the author's own view for authors), "Create a new submission", and
    "Return to your dashboard". This same screen answers the wizard address
    of any submitted submission, so a stale wizard bookmark shows it rather
    than an error. On a preprint server the screen has two variants.
    Viewers who cannot post read that a moderator will review and post the
    preprint. Those who can post are invited to post it themselves
    [OPS1](#ops1). The variant follows whoever is looking, not who
    submitted: a manager opening another author's submitted wizard address
    is thanked for "your" preprint and invited to post it ⚠ [OPS4](#ops4).
    <sup>n</sup>
16. **Cancelling.** The wizard footer offers "Cancel" (as a link-style
    control) to the submitting author, a Journal Manager and a Site
    Administrator only. It opens the dialog "Cancel submission", which
    reads "Are you sure you wish to cancel this submission? This will
    delete the submission and all associated data. This action cannot be
    undone." with "OK" / "Cancel". Confirming deletes the draft permanently
    and lands on "Submission cancelled", which offers "Create a new
    submission" and "Return to your dashboard". Nothing is emailed. The
    deleted draft's wizard address afterwards answers only a bare
    page-not-found error, without the journal's design. On a preprint
    server the submitting author's own "Cancel" does not work: confirming
    closes the dialog and nothing else happens. The draft survives, and no
    message explains why ⚠ [OPS3](#ops3). A manager's cancel works there.
    Cancelling is only for drafts. A submitted submission's wizard shows no
    such control; its deletion is the editorial team's (see *Submission
    stage*). <sup>o</sup>
17. <a id="section-closed"></a>**A section that closes mid-draft**
    {OJS OPS}. If the draft's section is deactivated, or restricted to
    editors, after the draft was started, a non-editor reopening the wizard
    gets a "Section Closed" page instead: "{journal} is not accepting
    submissions to the {section} section. If you need help recovering your
    submission, please contact {contact}." The same closure blocks the
    final submit (Rule 13). An editor-only restriction does not block a
    Site Administrator, Journal Manager or Section Editor: their own
    draft's wizard opens and "Review" raises no section complaint.
    Deactivation blocks them like anyone else: reopening their own draft
    in a deactivated section shows the "Section Closed" page, so the
    submit check is never reached. A press has no section at intake,
    so this rule has no press analogue [OMP1](#omp1).
    <sup>p</sup>

## Side effects

All effects fire at the moment of submission (Rule 14) unless noted.

- **Acknowledgement to the submitting author.** Sent when the journal's
  submission-acknowledgement setting is on (a fresh journal defaults to
  emailing all authors) and the submitter chose "Author". A submitter who
  chose an editorial role in "Submit As" gets none [A7](#a7). Per setup,
  the journal's contact can be copied and extra copy addresses added. Both ride as blind copies on the
  submitting author's message only, never as visible copies. A journal or preprint
  server takes several extra addresses separated by commas; a press refuses
  such a list with "This is not a valid email address.", though its own
  help text invites one, so a press copies one extra address only
  ⚠ [OMP2](#omp2). On a preprint server, submitters who
  may post their own preprint are meant to get a variant acknowledgement
  saying they can post it. In practice no acknowledgement reaches them at
  all ⚠ [OPS5](#ops5). <sup>q</sup>
- **Acknowledgement to the other contributors.** When the setting is "all
  authors", every contributor with an email who is not a submitting author
  gets a separate acknowledgement. <sup>q</sup>
- **Section editors are assigned and notified.** The journal's setup can
  pre-assign editorial users per section. Those editors are assigned to
  the new submission and emailed, and it appears on their Dashboard and
  in the submission's Participants list. The assignment
  email itself belongs to *Stage participants*. On any journal created
  after the install's first, the assignment silently fails: nobody is
  assigned or emailed, and the needs-an-editor path below fires instead
  ⚠ [A8](#a8). <sup>q</sup>
- **Editors already on the submission are emailed too.** An editor on the
  submission before it is submitted gets the same email, "You have been
  assigned as an editor on a submission to {journal}", at that moment:
  a Section Editor a Journal Manager added to the draft, and an Editor
  who submitted in that role. A preprint server sends it to neither
  ⚠ [OPS10](#ops10). <sup>q</sup>
- **Managers are told when nobody was assigned automatically.** If the
  section's setup assigned no editor, every Journal Manager, Editor and
  Production Editor gets a task notification ("A new article has been
  submitted to which an editor needs to be assigned.", worded per app)
  and the "needs an editor" email, unless they have unsubscribed from
  that email. Editors already on the submission do not count: the alert
  still goes out when a Section Editor is on the draft or the submitter
  chose an editorial role, and reaches the submitting Editor too
  ⚠ [A17](#a17). The email keeps its journal wording even on a preprint
  server ⚠ [OPS6](#ops6). <sup>q</sup>
- **Activity log.** A "submission submitted" entry always. A "copyright
  agreed" entry when the copyright box was ticked (Rule 14); that entry's
  text currently opens with a raw "{$filename}" placeholder ⚠ [A5](#a5).
  <sup>q</sup>
- **The comments box becomes a discussion.** Text entered in the For the
  Editors step's comments box opens as a discussion on the submission,
  titled as the box is (Rule 7), and the discussion's participants are
  emailed the comment under that same title regardless of the
  acknowledgement setting. Who the participants are is
  the discussion's affair (see *Tasks & discussions*, which owns it and
  the notification email). The one case verified here: with no editor yet
  assigned, the submitting author is the only participant and so receives
  a copy of their own comment. <sup>q</sup>
- **Editorial task templates run.** Any task templates configured for the
  first workflow stage are instantiated on the new submission (see *Tasks &
  discussions*). <sup>q</sup>
- **{OPS} DOIs are assigned.** A preprint server configured to register
  DOIs mints them for the new preprint and its galleys at submission.
  <sup>q</sup>
- **On Save for Later** (Rule 10): the resume-link email goes to the user
  who pressed the button ⚠ [A2](#a2). <sup>j</sup>
- **On Cancel** (Rule 16): the draft and everything attached to it are
  deleted. No email is sent and no log entry survives. <sup>o</sup>

## Settings that modify behavior

All of these are journal-level settings. The intake screens where most of
them live are the subject of *Submission intake configuration*.

- **Accepting / not accepting submissions**: the switch in the journal's
  workflow settings. Switched off, it closes the front door (Rule 2).
- **Start-of-submission guidance, checklist, privacy statement**: each
  configured, or not, in the journal's setup. Configured, they add the
  "Before you begin" text, the Submission Requirements confirmation, and
  the Privacy Consent confirmation to the start form (Rule 4);
  unconfigured, the start form has none of them. A site-wide
  configuration option can substitute the site's privacy statement for the
  journal's.
- **Supported submission languages**: more than one adds the Submission
  Language choice (Rule 4) and the "Submitting to…" line with its "Change"
  control (Rule 11). It also makes the Review step show one Details panel
  and one For the Editors panel per language (Rule 12).
- **Sections** {OJS OPS}: each section's *deactivated* and *restricted to
  editors* flags gate intake (Rules 3, 17). Its *abstract not required* and
  *abstract word limit* settings shape the Details step's demands (Rule
  13); the word limit also caps a plain language summary, whose save it
  refuses (Rule 9b). See *Sections*.
- **Metadata asked of authors**: each metadata item the journal's setup
  sets to "ask" or "require" during submission adds its field to the
  Details or For the Editors step (Rule 7). Setting it to "require" makes
  it a submit blocker (Rule 13). Setting the plain language summary
  (Settings › Workflow › Submission › "Metadata") to "require" also makes
  the server refuse wizard saves of other fields (Rule 9b) [A20](#a20).
  The install default asks for keywords and references without
  requiring them, so a fresh journal's Details step
  already shows a "Keywords" field, not marked required, and a references
  box.
- **References, data citations, data availability, funders**: the same
  ask/require pattern. They add their sections to the Details step
  (Rule 7).
- **Categories**: "let authors pick categories" plus at least one category
  adds the category picker to For the Editors (Rule 7).
- **Reviewer suggestions** {OJS OMP}: the review settings' "Reviewer
  Suggestion at Submission" toggle adds the Reviewer Suggestions step and
  the Review step's suggestions panel (Rule 7). Turning it off removes
  both. A preprint server has no review settings to offer it. <sup>g</sup>
- **File types marked "required to submit"**: become submit blockers
  (Rule 13). They are configured with the journal's file components (see
  *Submission intake configuration*).
- **Submission acknowledgement**: the "Submission Confirmation" choice on
  the workflow settings' Emails screen: off / submitting author only / all
  authors (the default), plus the copy-to-contact and extra-copy-address
  options (see *Side effects*). Once "Do not send an email." is saved,
  reopening the screen shows none of the three options selected, though
  the off choice stays in force ⚠ [A12](#a12).
- **Copyright notice**: adds the copyright confirmation to the Review step
  (Rules 12b, 14); without one, Review has no Confirmation section.
- **{OPS} Author screening**: by default preprint authors cannot post
  their own preprints. A screening plugin can grant it, which switches the
  confirmation message, the completion screen and the acknowledgement email
  to their can-post variants [OPS1](#ops1).

## Cross-feature interactions

- **Submission files**: the Upload Files step's panel: upload, file type
  prompt, revise, remove. This spec owns only the step's presence and the
  required-file submit gate (Rule 13).
- **Contributors & affiliations**: the Contributors step's panel. This
  spec owns the step, the submitter's auto-listing (Rule 5) and the
  name-language submit gate (Rule 13).
- **Citations & references / Funding**: the references, data-citations and
  funders sections embedded in the Details step.
- **[Publication metadata](U40-publication-metadata.md)**: the meaning of
  the Details / For the Editors metadata fields, and the plain language
  summary sharing the abstract's word limit. The wizard owns only which
  fields appear, which block submission, and what a refused save does
  (Rules 9b, 9c).
- **Reviewer suggestions**: the suggestions panel and what editors later
  do with them. The wizard owns the step's presence gate.
- **Sections**: section configuration (deactivated, editor-restricted,
  abstract policy) whose effects gate this feature.
- **Submission intake configuration**: the settings screens behind most of
  "Settings that modify behavior".
- **My Submissions**: where drafts are listed and resumed from, and the
  entry route into a submitted submission's workflow.
- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#workflow-entry)**:
  where "Review this submission" lands. It is also the home of the submissions interface this wizard
  drives (its create, save-for-later and submit operations are part of that
  feature's interface family). The submission record those operations read
  and write is defined once, in the shared submission definition homed
  there. <sup>r</sup>
- **Submission stage**: where the submitted submission arrives on a
  journal or press. *Production stage* and *Publish, schedule & versions*
  cover a preprint server's post-submission path.
- **Stage participants**: the editor-assigned email sent at submission to
  the editors on the submission.
- **Tasks & discussions**: the comments-for-editor discussion and the
  auto-created tasks.

## Canonical scenarios

Scenarios 1 to 4, 6, 9, 14 and 15 run on the seeded journal with ready
accounts, as do the assigned-editor half of scenario 11 and the
install-default bullet of scenario 17; the drafts and submissions are
scratch, and so is the section that waives abstracts in scenario 6 on a
preprint server. The others change a journal setting, a section or a
language, so they run on a scratch journal with throwaway accounts, and
scenario 10's second contributor and copy addresses are throwaway too.
The accounts, their passwords, the mail catcher's address and the tooling
recipe are in the footnote. <sup>s</sup>

1. **Start a submission**

   Given: Author, signed in, on the dashboard.

   - **The start screen**: choose "Start A New Submission" in the sidebar:
     the "Make a Submission" screen shows the start form. Type Wizard start
     in "Title", tick the Submission Checklist and Privacy Consent boxes,
     and pick a Section on a journal or preprint server, or a Submission
     Type on a press, if offered.
   - **"Begin Submission"**: press it: the wizard opens on the "Upload
     Files" step, with the new submission's number shown above the heading.
   - **No affiliation**: an Author whose profile carries no affiliation
     starts a draft the same way: the wizard opens on "Upload Files", and
     its "Contributors" step already lists them, as primary contact.
   - **Preprint server** {OPS}: Preprint Server Manager, under Settings ›
     Website › Plugins: no "Make a Submission" block plugin is listed, and
     the reader site's sidebar offers no such block.
   - **Control**: Journal Manager on a journal or press, under Settings ›
     Website › Plugins: the "Make a Submission" block plugin is listed,
     switched off. <sup>s</sup>

2. **Fill every step and submit**

   Given: Author, on a fresh draft, at its "Upload Files" step.

   - **Upload Files**: upload one file and press "Continue".
   - **Details**: the title arrives pre-filled; type "An abstract for the
     wizard scenario." as the abstract if the section demands one, and
     press "Continue".
   - **"Back" and the step rail**: on "Contributors" press "Back":
     "Details" shows again, and the browser tab title reads "Make a
     Submission: Details", the address bar's "#…" part changing with the
     step. Press "Back" once more: "Upload Files" shows again and offers
     no "Back" of its own. In the step rail, "Details", already reached,
     reopens directly; "Review", not yet reached, is not clickable.
     Reopen "Details" from the rail and press "Continue".
   - **Contributors**: the step already lists you; press "Continue".
   - **For the Editors**: press "Continue".
   - **Review**: "Checking your submission" clears with no banner. Tick the
     copyright confirmation box if the step shows one (scenario 16) and
     press "Submit": on a journal the dialog reads
     "The submission, {title}, will be submitted to {journal} for editorial
     review. Are you sure you want to complete this submission?"; confirm
     it. The "Submission complete" screen appears with the links "Review
     this submission", "Create a new submission" and "Return to your
     dashboard".
   - **Mailbox**: the acknowledgement email arrives in your mailbox.
   - **"Review this submission"**: press it: the submission's workflow
     opens, and its activity log holds a "submission submitted" entry.
   - **The wizard address after submitting**: open the draft's wizard
     address again: the "Submission complete" screen shows, with no
     "Cancel" control.
   - **The comments box**: on a second draft, in a section with no editor
     assigned, type "Please note the data set is under embargo." in the
     For the Editors step's comments box ("Comments for the Editor" on a
     journal, "Cover Note to Editor" on a press, "Comments for the
     Moderator" on a preprint server's For Readers step) and submit the
     draft the same way: the submission's workflow shows the comment as a
     discussion titled as the box is, and a copy of the comment, under the
     same title, arrives in your mailbox, you being its only participant.
   - **Control**: a draft not yet submitted answers its wizard address with
     the wizard itself, "Cancel" in its footer. <sup>s</sup>

3. **Save for later and resume**

   Given: Author, on the "Details" step of their own draft.

   - **Autosave**: straight after opening the wizard, type Autosave check
     in "Title" and stop: the footer, which already reads "Last saved…" on
     arriving [A4](#a4), flashes "Saving" about a minute after the wizard
     opened, as it reaches "Last saved 1 minute ago", and then ticks "Last
     saved {n} seconds ago".
   - **"Save for Later"**: press it: the "Saved for Later" screen shows a
     link back into the wizard, labeled with the draft's contributors and
     title, and the note "We have emailed a copy of this link to you at
     {email}."
   - **Mailbox**: the email with the resume link arrives.
   - **Signed out**: sign out and open the emailed link: the Login page
     shows.
   - **Resume**: sign in and follow the emailed link, or reopen the draft
     from My Submissions: the wizard reopens on "Details", the step you
     left, with "Autosave check" in "Title".
   - **Control**: a second draft, moved to "Details" by "Continue" and never
     saved for later, reopens from My Submissions at "Upload Files".
     <sup>j</sup>

4. **Cancel a draft**

   Given: Author on their own draft; Journal Manager and a Section Editor
   assigned as a participant, each on another author's draft.

   - **The author's own draft**: in the wizard footer press "Cancel": the
     "Cancel submission" dialog reads "Are you sure you wish to cancel this
     submission? This will delete the submission and all associated data.
     This action cannot be undone." Confirm with "OK": the "Submission
     cancelled" screen appears, offering "Create a new submission" and
     "Return to your dashboard", and the draft is gone from My Submissions.
     On a preprint server this bullet passes only for a manager: the
     author's own confirmation closes the dialog and nothing else happens
     [OPS3](#ops3).
   - **Journal Manager on another author's draft**: open its wizard: the
     footer offers "Cancel"; press it and confirm with "OK": "Submission
     cancelled" appears.
   - **The deleted draft's address**: open the wizard address that draft
     had, noted from the address bar before cancelling: only a bare
     page-not-found error shows, without the journal's design.
   - **Mailboxes**: no email arrives, in the author's mailbox or the
     Journal Manager's.
   - **Control**: the Section Editor assigned as a participant to another
     author's draft, opening its wizard, gets "Save for Later" and
     "Continue" but no "Cancel" control. <sup>o</sup> <sup>f</sup>

5. **Change settings midway**

   Given: Author, on a draft in a journal with two open sections and two
   submission languages, and a second journal with one submission
   language and one open section.

   - **The header**: above the step rail the wizard reads "Submitting to
     the {section} section in {language}." with a "Change" control beside
     it.
   - **"Change Submission Settings"**: press "Change": the panel offers the
     section and the language; pick the other section and the other
     language and save: the wizard reloads and the line now names the new
     section and language. On a press the panel offers the Submission Type
     and the language instead [OMP1](#omp1).
   - **Review, one panel per language**: press "Continue" until "Review":
     the Details and For the Editors panels each appear twice, once per
     language.
   - **One section, one language: the start form**: on the second
     journal, open "Make a Submission": the start form shows no
     "Submission Language" list and, on a journal or preprint server, no
     "Section" list either; type Single section in "Title" and press
     "Begin Submission": the wizard opens on "Upload Files", no section
     having been asked for. A press asks for the Submission Type as always
     [OMP1](#omp1).
   - **One section, one language: the wizard header**: above the step
     rail no "Submitting to…" line and no "Change" control appear. On a
     press the work-type line and its "Change" control remain
     [OMP1](#omp1).
   - **Control**: the first journal's draft, reopened from My Submissions,
     still names the new section and language. <sup>k</sup>

6. **Validation blocks an empty submission**

   Given: Author, on a fresh draft, nothing filled in, in a section that
   requires an abstract ("Articles" on the seeded journal).

   - **Straight to Review**: press only "Continue" until "Review": after
     "Checking your submission", the banner "There are one or more problems
     that need to be fixed before you can submit…" appears, with the
     missing items called out on their panels: the required file type on
     Files ("A file of the {type} type must be uploaded…"), the abstract on
     Details (not on a press, Rule 13). "Submit" is disabled.
   - **"Edit"**: press the Files panel's "Edit": the wizard jumps back to
     "Upload Files"; upload a file of the required type and return to
     "Review": the file's complaint is gone.
   - **A contributor named in another language only**: on a second draft,
     whose second contributor has a name in another of the journal's
     languages and none in the submission language, reach "Review": the
     banner appears, the Contributors panel carries the complaint, and
     "Submit" is disabled.
   - **A section that waives abstracts**: on a third draft, in a section
     that does not require an abstract ("Reviews" on the seeded journal),
     leave the abstract empty and reach "Review": the Details panel raises
     no abstract complaint. A press has no section at intake and requires
     an abstract only if its setup says so [OMP1](#omp1).
   - **Control**: with every item fixed, the banner is gone and "Submit" is
     enabled, any copyright box ticked (scenario 2). <sup>l</sup>

7. **The journal stops accepting submissions**

   Given: Journal Manager and Author, on a journal accepting submissions.

   - **The bookmark**: Author: bookmark the "Make a Submission" start
     screen while submissions are open.
   - **Closing**: Journal Manager: switch off accepting submissions in the
     journal's workflow settings.
   - **The sidebar and the bookmark**: Author: the sidebar no longer offers
     "Start A New Submission", and opening the bookmarked start screen
     shows only the notice "This journal is not accepting submissions at
     this time. Visit the workflow settings to allow submissions."
     [A3](#a3).
   - **Control**: Journal Manager: switch accepting submissions back on:
     the author's sidebar entry returns. <sup>b</sup>

8. **A draft outlives the closing**

   Given: Author, with a draft started while submissions were open.

   - **Closing**: Journal Manager: switch off accepting submissions.
   - **The draft**: Author: reopen the draft: the wizard still opens, and
     completing it still submits [A1](#a1).
   - **Control**: on the same closed journal the author's sidebar offers no
     "Start A New Submission" (scenario 7). <sup>b</sup>

9. **A user with no role submits**

   Given: two signed-in users with no role in the journal (for example a
   Reviewer of another journal on the same site, or a bare reader account).

   - **The start screen**: the first user: open "Make a Submission" and
     begin a submission: the wizard opens normally.
   - **The account afterwards**: it holds the journal's Author role. On a
     preprint server the enrolment happens on merely opening the start
     screen [OPS2](#ops2).
   - **Self-registration off**: Journal Manager: turn off self-registration
     on every author-role group (on a press that means both Author and
     Chapter Author; turning off Author alone leaves the way in open
     {OMP}).
   - **Control**: the second user, opening "Make a Submission": the "Not
     Allowed" page with "You are not allowed to submit to this journal
     because authors must be registered by the editorial staff…"; on a
     preprint server the explanation is a raw locale code [OPS7](#ops7).
     <sup>c</sup>

10. **All contributors are acknowledged**

    Given: Author and Journal Manager, on a journal whose "Submission
    Confirmation" is all authors, the default.

    - **A second contributor**: Author: add a second contributor with a
      distinct email on the "Contributors" step, then submit: two
      acknowledgement emails arrive, one in your mailbox, one in the other
      contributor's.
    - **Copies**: Journal Manager: on the workflow settings' Emails screen,
      switch on the copy to the journal's contact and add an extra copy
      address. Author: submit another such draft: your acknowledgement is
      blind-copied to the journal's contact and to the extra address,
      neither showing as a visible copy; the other contributor's message
      goes to them alone.
    - **Submitting author only**: Journal Manager: set "Submission
      Confirmation" to submitting author only. Author: submit another such
      draft: one email, in your mailbox; none reaches the other
      contributor.
    - **Off**: Journal Manager: set it to off. Author: submit: no
      acknowledgement arrives, though "Submission complete" still says a
      confirmation email was sent [A7](#a7).
    - **Control**: under all authors, a submission whose only contributor
      is you produces one acknowledgement. <sup>q</sup>

11. **Editors learn of the new submission**

    Given: Author and Journal Manager, on a journal with one section that
    has a section editor assigned to it and a second section that has
    none.

    - **The section with an editor**: Author: submit a fresh submission to
      it. Section Editor: the assignment email arrives, the submission is
      on your Dashboard, and the submission's Participants panel lists you.
      On any journal created after the install's first this half fails:
      the editor is never assigned [A8](#a8).
    - **The section with none**: Author: submit a fresh submission to it.
      Journal Manager: the "needs an editor" email arrives (keeping its
      journal wording on a preprint server [OPS6](#ops6)) and the header
      Tasks panel shows "A new article has been submitted to which an
      editor needs to be assigned." (worded per app).
    - **Control**: the Journal Manager's mailbox holds no "needs an editor"
      email for the first submission, the one that got its editor.
      <sup>q</sup>

App-specific:

12. **Closed and restricted sections** {OJS OPS}

    Given: Journal Manager and Author, on a journal with several open
    sections, one with an abstract word limit of 10 words and one with a
    section policy; the Journal Manager has a complete draft in the section
    to be restricted and one in the section to be deactivated.

    - **Restricting and deactivating**: Journal Manager: restrict one
      section to editors and deactivate another.
    - **The start form**: Author: "Make a Submission" no longer offers
      either section, while a Journal Manager is still offered the
      restricted one, not the deactivated one.
    - **A section's policy**: Author: on "Make a Submission", pick the
      section that has a policy: the policy shows under the "Section"
      list.
    - **Word limit**: Author: on a draft in the section with the word
      limit, on "Details", type "This abstract has more words than the
      section allows, fourteen of them in all." as the abstract and reach
      "Review": the Details panel reports "The abstract is too long…" and
      "Submit" is disabled.
    - **A draft's section closes**: Journal Manager: deactivate the section
      of an existing draft of the author's. Author: reopening the draft
      gets the "Section Closed" page: "{journal} is not accepting
      submissions to the {section} section. If you need help recovering
      your submission, please contact {contact}."
    - **An editor's draft**: Journal Manager: on their own draft in the
      restricted section, the wizard opens rather than the "Section Closed"
      page, "Review" raises no section complaint and "Submit" is enabled;
      on their own draft in the deactivated section, reopening it shows
      the same "Section Closed" page the author gets, and the wizard never
      opens.
    - **Every section closed**: Journal Manager: deactivate the remaining
      open sections too. Author: "Make a Submission" shows the "Not
      Allowed" page with "…submissions to all sections of this journal have
      been deactivated or restricted…"; on a preprint server the
      explanation is a raw locale code [OPS7](#ops7).
    - **Control**: Journal Manager: reactivate a deactivated section: the
      author's start form offers it again. A press has no section at
      intake, so this scenario has no press analogue [OMP1](#omp1)
      (scenario 14). <sup>p</sup>

13. **Suggest reviewers when asked** {OJS OMP}

    Given: Journal Manager and Author, on a journal with "Reviewer
    Suggestion at Submission" off.

    - **The setting**: Journal Manager: switch on "Reviewer Suggestion at
      Submission" in the review settings.
    - **The wizard**: Author: a new draft's wizard shows the "Reviewer
      Suggestions" step before "Review", and the Review step gains a
      suggestions panel ("No reviewers have been suggested for this
      submission." while empty).
    - **Control**: with the setting off, and on a preprint server always,
      no such step appears. <sup>g</sup>

14. **Submit a monograph or an edited volume** {OMP}

    Given: Author, on a press that has series.

    - **The start form**: it asks for the Submission Type; choose "Edited
      Volume…" and press "Begin Submission": the wizard header reads
      "Submitting an Edited Volume." and "Change" offers the type switch.
    - **Details**: the step lists Chapters whichever type is chosen; switch
      back to "Monograph" through "Change": only the header line changes,
      and the Chapters section stays.
    - **For the Editors**: the step offers an optional Series choice
      ("None" preselected) [OMP1](#omp1).
    - **Control**: a journal's start form asks for a Section and no
      Submission Type (scenario 1). <sup>g</sup>

15. **Submit a preprint** {OPS}

    Given: Author and Preprint Server Manager, on the seeded preprint
    server.

    - **Upload Files**: Author: press "Add File", type PDF as the Galley
      Label, and upload the file, picking its Preprint Component when
      asked.
    - **For Readers**: the fourth step, titled "For Readers", asks for the
      License and the required "Relation status" answer. There is no
      Reviewer Suggestions step.
    - **Submitting**: the submit dialog says a moderator will review the
      preprint before posting, and "Submission complete" repeats it.
    - **Control**: a Preprint Server Manager submitting their own preprint:
      the dialog and completion screen say they can post it themselves
      [OPS1](#ops1), and no acknowledgement email arrives [OPS5](#ops5).
      <sup>m</sup> <sup>q</sup>

16. **The copyright confirmation**

    Given: Author, on a complete draft in a journal with a copyright
    notice, at its "Review" step.

    - **"Confirmation"**: the check passes with no banner, and a final
      "Confirmation" section asks you to tick "Yes, I agree to the
      copyright statement."; "Submit" stays disabled while it is unticked.
    - **Submitting**: tick it, press "Submit" and confirm the dialog:
      "Submission complete" appears. Press "Review this submission": the
      submission's activity log holds the "submission submitted" entry and
      a "copyright agreed" entry, whose text opens with a raw "{$filename}"
      placeholder [A5](#a5).
    - **Control**: on a journal without a copyright notice, "Review" has no
      "Confirmation" section and "Submit" enables once the check passes
      (scenario 2). <sup>s</sup>

17. **Required metadata blocks the submit**

    Given: Author, on a complete draft in a journal whose setup requires
    keywords during submission and asks for subjects and a data
    availability statement without requiring them.

    - **"Details"**: the step shows a "Keywords" field; leave it empty and
      reach "Review": the problems banner (scenario 6) appears, the Details
      panel carries the keywords complaint, and "Submit" is disabled.
    - **"Edit"**: press the Details panel's "Edit", type wizard in
      "Keywords" and return to "Review": the complaint is gone and "Submit"
      is enabled.
    - **Asked, not required**: "Details" also shows a data availability
      statement, and "For the Editors" a field for subjects; with both left
      empty, "Review" raises no complaint about either and "Submit" stays
      enabled.
    - **Keywords at the install default**: on a journal at the install
      default, which asks for keywords without requiring them, "Details"
      shows a "Keywords" field not marked required, and "Review" passes
      with it empty.
    - **Control**: on a journal whose setup does not ask for keywords (a
      scratch journal with the keywords item switched off, since the seeded
      journal asks for them by install default), "Details" shows no
      "Keywords" field and "Review" passes without one. <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a journal that requires the plain language summary: the start page's title, a "Details" save before the summary is typed and the "References" box all saved, and "Submit" disabled until the summary is typed (A20; the guard its issue report names)
  - the Review step after a language change asking for the new language's title, contributor names and typed institution names, the affiliation copied from the author's profile included, with "Submit" disabled until they are typed (Rule 11): likely bullets in scenario 5, which changes the language and reaches Review
  - the timer's minute counted from the last save, not from the end of typing: scenario 3's "Saving" coming as the footer reaches "Last saved 1 minute ago", and a step with no change sending nothing (Rule 9): the suites move the page's clock on a minute after the typing, which cannot tell the two readings apart
- **Rarely met**:
  - a lost connection ("Reconnecting", the disabled "Save for Later" and "Submit", the retry, the "Unsaved Changes" dialog; Rule 9a): a dropped connection is an accident, not a state an author meets in an ordinary week of submitting
  - Submit As offered to a user with two submitting roles, with the editorial-role hint, and a submission made in an editorial role: its only participant, the Contributors note, the editor-assigned email to the submitter (Rules 4a, 5, 12b; Side effects): a second role with submission access is a grant few authors hold
  - a Section Editor already on the draft emailed at the submit (Side effects, "Editors already on the submission are emailed too"): a Journal Manager seldom adds an editor before the author has submitted
- **Nothing new to test**:
  - old bookmarked wizard addresses forwarding to the current wizard (Rule 1): a bookmark from an earlier version is one few authors keep
  - editing the "#…" part of the address to open a step ahead, and a reload ignoring it (Rule 8): an author does not edit the address by hand
  - the "Disconnected" dialog when a save fails (Rule 10): a failed save is the dropped connection above
  - a change saved by a step change straight after typing (Rule 9): scenario 3 reads the timer's save, and the move's save is the same request
  - Site Administrator opening any draft and offered "Cancel" (Actors rows 3–4; the Journal Manager's offer, scenario 4)
  - every other role, with no "Cancel" control to press (Actors row 4; the Section Editor's screen, scenario 4)
  - the closing screens shown to whoever may open the submission, the cancelled screen naming nothing (Actors row 5)
  - a screening plugin granting can-post {OPS} (Settings, "Author screening"; the manager's variants, scenario 15's control)
  - disciplines, supporting agencies, coverage, rights, source and type at their "ask" end (Settings, "Metadata asked of authors"; the same field pattern as subjects, scenario 17)
- **Register carries it**:
  - A2 (the resume-link email going to a Journal Manager who pressed "Save for Later")
  - A6 (submitting the same draft twice)
  - A7 (the completion screen's email sentence, with acknowledgements off or after an editorial-role submission)
  - A9 (a Section Editor or Site Administrator pressing "Begin Submission")
  - A10 (the step rail at phone width)
  - A12 (the Emails screen showing no acknowledgement option after off is saved)
  - A14 (a Section Editor who is also an Author choosing "Section editor" in "Submit As")
  - A15 (leaving the wizard within a minute of the last save)
  - A16 (a plain language summary over the section's word limit)
  - A17 (the "needs an editor" alert with an editor already on the submission)
  - A18 (a change typed more than a minute after the last save, saved cut after its first letters)
  - A19 (the wizard hung on "Saving" after any save the server refuses, and the reload's "Unsaved Changes" after it)
  - A20 (a required plain language summary refusing saves of other fields)
  - OMP2 (a second copy address on a press)
  - OMP3 (the order of the "Submit As" roles on a press)
  - OPS4 (a manager reading another author's completion screen)
  - OPS8 (a further galley on a draft that already listed one when the wizard was opened)
  - OPS9 (the Review step's "Files" panel after a reload)
  - OPS10 (a Moderator already on a preprint at its submission)
- **No seed**:
  - a journal with a task template for the first workflow stage (Side effects, "Editorial task templates run")
  - a preprint server configured to register DOIs {OPS} (Side effects, "DOIs are assigned")
  - the site-wide substitution of the site's privacy statement (Settings, "Start-of-submission guidance, checklist, privacy statement")
  - the "Before you begin" guidance, and the start form with no checklist or privacy statement configured (Settings, "Start-of-submission guidance, checklist, privacy statement"); no scenario key sets or clears them
  - the category picker (Settings, "Categories"); no scenario key turns on "let authors pick categories"
  - the reader-site "Make a Submission" block once enabled {OJS OMP} (Actors row 6, Rule 1); no scenario key enables a plugin or places a sidebar block
  - a press whose setup requires an abstract (Rule 13); no scenario key sets it
  - a Journal Manager unsubscribed from the "needs an editor" email (Side effects); no scenario key sets a user's email opt-outs
- **Owned by another feature**:
  - the Upload Files panel and its file types (*Submission files*)
  - the contributors panel (*Contributors & affiliations*)
  - the references and data-citations sections, and their appearance at the "ask" end (*Citations & references*)
  - the Funders list, and its appearance at the "ask" end (*Funding*, scenario 2)
  - the meaning of the Details and For the Editors metadata fields (*Publication metadata*)
  - the suggestions panel (*Reviewer suggestions*)
  - the "Relation status" and "License" panels' "Edit" on a preprint server's Review step (*Preprint relations*, A11)
  - section configuration (*Sections*)
  - the intake screens (*Submission intake configuration*)
  - the drafts list and the way into a submitted submission (*My Submissions*)
  - where "Review this submission" lands (*Workflow screen & stage access*)
  - the submission's arrival on its stage (*Submission stage*)
  - the assignment email (*Stage participants*)
  - the discussion's participants and the tasks (*Tasks & discussions*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-25; additions
2026-08-26, 2026-09-07, 2026-09-28, 2026-09-30 and 2026-10-01), unreviewed unless an entry notes otherwise; the team settles
them on spec review. The summary is sorted 🐞 → ❓ → ✅ and the entries below
are the source; badges, Impact and Basis:
[Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A4](#a4) | The wizard footer shows a "Last saved" time counted from page load, not from a real save | 🐞 | minor | — |
| [A5](#a5) | The copyright-agreed activity-log line opens with a raw "{$filename}" placeholder | 🐞 | minor | — |
| [A6](#a6) | Submitting a draft twice shows a problems banner with nothing to fix; the real refusal never appears | 🐞 | latent | — |
| [A7](#a7) | The completion screen claims a confirmation email was sent when none was: acknowledgements off, or an editorial-role submitter | 🐞 | minor | — |
| [A8](#a8) | Section editors configured for auto-assignment are silently never assigned on any journal but the install's first | 🐞 | user-visible | — |
| [A10](#a10) | A wizard loaded at phone width keeps its uncollapsed step rail and the page scrolls sideways (journal & press) | 🐞 | minor | — |
| [A12](#a12) | After "Do not send an email." is saved, the Emails screen shows no Submission Confirmation option selected | 🐞 | minor | — |
| [A14](#a14) | "Submit As" offers "Section editor" ("Series editor"), and "Begin Submission" refuses it | 🐞 | user-visible | — |
| [A16](#a16) | A plain language summary over the section's word limit is refused on save with an unexplained error, and the wizard hangs on "Saving" with "Submit" disabled | 🐞 | user-visible · crash: script | — |
| [A18](#a18) | A change typed more than a minute after the last save is saved cut after its first letters; the rest waits another minute | 🐞 | minor | — |
| [A19](#a19) | After the server refuses one save, the submission wizard hangs on "Saving" and the author cannot submit | 🐞 | medium · crash: script | issues (claude), 2026-10-01 — re-verified |
| [A20](#a20) | Requiring a plain language summary makes the submission wizard refuse saves of other fields, and hang | 🐞 | high · crash: script | issues (claude), 2026-10-01 — re-verified |
| [OMP2](#omp2) | A press refuses the comma-separated "Notify Anyone" list its own help text asks for | 🐞 | minor | — |
| [OMP3](#omp3) | A press lists the "Submit As" roles in a changing order, so the preselected role changes between visits | 🐞 | minor | — |
| [OPS3](#ops3) | A preprint author's own "Cancel" is silently refused; the draft survives with no message | 🐞 | user-visible | — |
| [OPS5](#ops5) | A can-post preprint submitter gets no acknowledgement email at all | 🐞 | user-visible | — |
| [OPS7](#ops7) | The preprint "Not Allowed" page shows a raw locale code where its explanation should be | 🐞 | minor | — |
| [OPS8](#ops8) | A further galley on a draft that already listed one when the wizard was opened can never get its file | 🐞 | user-visible · crash: script | — |
| [OPS9](#ops9) | The Review step's "Files" panel says "No files have been uploaded" for galleys the draft already had when the page loaded | 🐞 | minor | — |
| [A1](#a1) | Closing submissions does not stop drafts already started; they can still be filled and submitted | ❓ | latent | — |
| [A2](#a2) | The save-for-later confirmation email goes to whoever pressed the button, not to the submitting author | ❓ | latent | — |
| [A3](#a3) | The submissions-closed notice shown to would-be authors ends with an instruction meant for managers | ❓ | minor | — |
| [A9](#a9) | Pressing "Begin Submission" silently enrolls a pure Section Editor as Author, and probably a pure Site Administrator too | ❓ | latent | — |
| [A15](#a15) | Leaving the wizard within a minute of the last save drops the change without a question | ❓ | minor | — |
| [A17](#a17) | "Needs an editor" goes out for a submission that already has an editor on it | ❓ | minor | — |
| [OPS2](#ops2) | A preprint server enrolls a roleless visitor as Author on merely opening the start screen | ❓ | latent | — |
| [OPS4](#ops4) | The preprint completion screen thanks the viewer, not the submitter | ❓ | latent | — |
| [OPS6](#ops6) | The "needs an editor" email keeps its journal wording on a preprint server | ❓ | minor | — |
| [OPS10](#ops10) | A Moderator already on a preprint is not emailed when it is submitted | ❓ | minor | — |
| [A11](#a11) | An Author-role user with no profile affiliation cannot start a submission at all; "Begin Submission" 500s (regression, pkp-lib `9e2fbac214`) | ✅ | retired | maintainer reproduced independently, 2026-09-01 (admin-created, profile-cleared and multi-role users all crash) |
| [A13](#a13) | Changing the submission language inside the wizard leaves every language-bound value, the copied contributor affiliation and given name included, to be filled for the new language before submitting | ✅ | — | @jarda.kotesovec 2026-09-12 · intended |
| [OMP1](#omp1) | A press submits by work type (Monograph / Edited Volume), with no section at intake and an optional Series later | ✅ | — | — |
| [OPS1](#ops1) | A preprint server's wizard is galley-based and single-stage: license & relation questions, moderation-aware messaging, can-post variants | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — Closed submissions do not stop an in-progress draft** · ❓ · latent.
Turning off "accepting submissions" removes the sidebar entry and blocks the
start screen (Rule 2). But an author with a draft already underway can still
open it, keep filling it, and submit it. The closure is never checked once
the draft exists.
Question: is a closure meant to let started drafts finish, or should resume
and submit be blocked too? Lean: letting drafts finish is defensible and
probably intended, but the asymmetry deserves a ruling. Basis: code
inspection + probe. <sup>[b](#fn-b)</sup>

<a id="a2"></a>
**A2 — Save-for-later email goes to the presser, not the owner** · ❓ · latent.
"Save for Later" emails the resume link to the signed-in user who pressed
the button. When that is the submitting author, the ordinary case, this is
right. When a Journal Manager saves an author's draft for later, the manager
gets the email and the author is never told. The Saved for Later screen even
says so: its link names the author, while the note reads that the copy was
emailed "to you at" the manager's own address.
Question: should the resume-link email always go to the submitting author?
Lean: yes. The link is the author's way back in, and the current behavior
reads as an oversight. Basis: probe. <sup>[j](#fn-j)</sup>

<a id="a3"></a>
**A3 — The closed-journal notice speaks to the wrong audience** · ❓ · minor.
With submissions disabled, anyone opening the start screen, including a
plain author, reads "This journal is not accepting submissions at this
time. Visit the workflow settings to allow submissions." The second sentence
is an instruction only a manager can follow. It is plain text, not a link,
even for the manager.
Question: should authors get a message without the settings instruction?
Lean: yes. One string serves two audiences; split it. Basis: probe.
<sup>[b](#fn-b)</sup>

<a id="a4"></a>
**A4 — The footer claims a save that never happened** · 🐞 · minor.
On opening any wizard step the footer already reads "Last saved a few
seconds ago" and keeps counting. But the time is measured from the moment
the page loaded, not from any actual save, which may lie much further back.
An author reading the footer is told their work was just saved when nothing
has been sent.
Basis: probe. <sup>[i](#fn-i)</sup>

<a id="a5"></a>
**A5 — The copyright-agreed log line is garbled** · 🐞 · minor.
When a submission is completed with the copyright box ticked, the activity
log's agreement entry opens with a raw placeholder: "{$filename} (…)
agreed to the copyright terms for submission.", with the ticking user's
username in the parentheses. This happens on every copyright-confirmed
submission. The neighboring "submission submitted" entry renders normally.
Basis: probe. <sup>[m](#fn-m)</sup>

<a id="a6"></a>
**A6 — Double-submitting dead-ends on an empty problems banner** · 🐞 · latent.
Pressing "Submit" on a draft that was already submitted, say from a second
browser tab left on the Review step, leaves the author on Review under the
banner "There are one or more problems that need to be fixed before you can
submit…" with nothing flagged on any panel. The server's actual refusal,
"This submission has already been submitted…", never reaches the screen.
So the author is told to fix problems that are not shown. Basis: probe.
<sup>[m](#fn-m)</sup>

<a id="a7"></a>
**A7 — The completion screen claims an email that was never sent** · 🐞 · minor.
With the journal's submission acknowledgement set to "Do not send an
email.", the "Submission complete" screen still reads "…you've been
emailed a confirmation for your records." No email exists. The same
happens to a submitter who chose an editorial role in "Submit As"
("Journal editor", "Press editor"): with the setting at its default they
get no acknowledgement, while the screen promises one. A submitter
checking their inbox for the promised confirmation finds nothing.
Basis: probe (a journal and a press). <sup>[q](#fn-q)</sup>

<a id="a8"></a>
**A8 — Auto-assignment of section editors silently fails on all but the install's first journal** · 🐞 · user-visible.
A section configured to assign editorial users automatically ("Editorial
Assignments" on the section form) assigns nobody on any journal created
after the install's first. The submission arrives with no editor, the
configured editor is never emailed and never sees it, and the managers get
the needs-an-editor alert instead. On the install's oldest journal the same
setup works, which hides the defect from casual checks. Basis: probe (two
failing journals plus a passing control, same day), with the code fault
identified. <sup>[q](#fn-q)</sup>

<a id="a9"></a>
**A9 — Starting a submission quietly turns a Section Editor into an Author** · ❓ · latent.
The start screen admits a user whose only role is Section Editor on the
strength of that editorial role. But pressing "Begin Submission" enrolls
them in the journal's Author role, without asking, and without the
self-registration check the ordinary sign-up path applies. The submission
is made under that new role, with the section editor auto-listed as its
contributor and primary contact (Rule 5). A pure Site Administrator most
likely gets the same treatment. That half is unverified: confirming it
would permanently change the roles of the one seeded administrator account
the whole test install depends on, so it awaits a check with a disposable
administrator.
Question: should starting a submission change a section editor's (or
administrator's) roles? Lean: unintended. The start screen offers the
editorial role, but the creation step recognizes only manager and author
roles, and the developers already track the gap behind that mismatch.
Basis: probe + code inspection (Section Editor); code inspection only
(Site Administrator). <sup>[fn-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — At phone width the step rail never collapses on a fresh load** · 🐞 · minor.
Opening a wizard in a phone-sized window on a journal or press renders the
full uncollapsed step rail and pushes the page into sideways scrolling. The
"{n}/{total} steps" collapse never engages. The same window resized down
after loading collapses correctly, as does a moderately narrow window from
the start. A preprint server collapses correctly even on a phone-width load.
Every step stays reachable by scrolling, hence minor. Basis: probe
(repeatable both orders, three apps compared). <sup>[h](#fn-h)</sup>

<a id="a12"></a>
**A12 — The Emails screen forgets which acknowledgement option is on** · 🐞 · minor.
After a Journal Manager picks "Do not send an email." under "Submission
Confirmation" on the workflow settings' Emails screen and saves, reopening
the screen shows none of the three options selected. The choice is in
force: no acknowledgement goes out, and saving the screen again keeps it
so. But the screen no longer says which option applies, so a manager
cannot tell "off" from a choice never made. Basis: probe.
<sup>[fn-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — Changing the language mid-wizard asks for the new language's values, the copied affiliation included** · ✅ · intended.
The Details step's "Change" lets the author switch the submission
language after the draft exists. The change saves the language and
nothing else, and the wizard leans on the Review step's check for what the
new language still lacks: the title, the required metadata, each
contributor's given name and each typed institution's name. The
contributor record copied from the author's profile is one of those
values, so the Contributors panel reads "The primary language French
(Canada) is required" under Affiliations and Review refuses with "The
affiliation name is missing in French (Canada) for one or more
affiliations for one or more of the contributors." until it is typed. A
registry-picked institution has no per-language name and is exempt, which
is why authors whose profile text matched a registry record never saw the
prompt while the profile copy still linked such matches; since
2026-09-12 the copy is always a typed name (pkp/pkp-lib#13317), so they
see it like everyone else. Copying values into a new language happens
only on the workflow's language change after submission.
Since: 2026-09-12 · Basis: probe. <sup>[fn-a13](#fn-a13)</sup>

> **Reviewed — @jarda.kotesovec, 2026-09-12**: ✅ intended (was ❓). The
> wizard's language change relies on validation and the author updates
> the inputs for the new language; the copy-over belongs to the
> post-submission language change.

<a id="a14"></a>
**A14 — "Submit As" offers "Section editor", and "Begin Submission" refuses it** · 🐞 · user-visible.
A user who is both a Section Editor and an Author gets "Submit As" with
"Author" and "Section editor" ("Series editor" on a press). Choosing
"Section editor" and pressing "Begin Submission" keeps them on the form
with "You are not allowed to submit in this user role." under "Submit
As", and no submission is created. Only "Author" can be used, so the form
offers a choice it will not accept. On a press the refused role is
sometimes the one already selected [OMP3](#omp3). A preprint server does
not offer its Moderator role at all. The same gap turns a Section Editor
with no other role into an Author [A9](#a9).
Basis: probe. <sup>[fn-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — Leaving the wizard drops a change made within a minute of the last save** · ❓ · minor.
An author who changes the Title on "Details" and then opens another
address (My Submissions, a bookmark) is not asked whether to leave.
Nothing is saved when the change comes within a minute of the last save
(the time the footer gives as "Last saved"): reopened, the draft's header
and "Details" show the old title, also after a reload, and no "Unsaved
Changes" dialog offers the change back. This holds on a first visit to
"Details" and on a return from "Review". A step change would have saved
it (Rule 9). A change typed after that minute is partly kept: the timer
sends its first letters at once [A18](#a18).
Question: should leaving the wizard with an unsaved change save it, or
ask first? Lean: one or the other. A step change saves the text and a
lost connection keeps it in the browser, so this is the one way out that
drops it silently.
Basis: probe. <sup>[fn-a15](#fn-a15)</sup>

<a id="a16"></a>
**A16 — A plain language summary over the word limit hangs the wizard on "Saving"** · 🐞 · user-visible · crash: script.
In a section with a word limit, "Details" counts a too-long plain
language summary ("Word Count: 20/10") but flags nothing, so the author
expects it to be saved. Instead the save, by the timer or "Continue",
is refused. An "Error" dialog reads "An unexpected error has occurred.
Please reload the page and try again.", naming no field, and the page's
script fails a few seconds later. The footer shows
"Reconnecting", then "Saving" for good. "Review" shows the old summary
("None provided") under "Checking your submission", which never clears,
so "Submit" stays disabled. After a reload "Details" shows the summary
empty, and the title, keywords and abstract that save carried are lost
too (Rule 9c). After a timer save, and on a preprint server after "Continue"
too, an "Unsaved Changes" dialog (Rule 9a) opens first, and "No,
discard" leaves it empty. An abstract over the same
limit is saved and reported by the Review check instead (Rule 13).
Basis: probe. <sup>[fn-a16](#fn-a16)</sup>

<a id="a17"></a>
**A17 — "Needs an editor" goes out for a submission that already has one** · ❓ · minor.
When a submission arrives, the alert considers only the editors the
section's setup assigns automatically. A submission with a Section Editor already on the draft, or one submitted
by an Editor in that role, still sends every Journal Manager, Editor and
Production Editor "A new submission needs an editor to be assigned:
\"{title}\"", the submitting Editor included. The managers are
asked to assign an editor that the submission's Participants list
already shows.
Question: should the alert count the editors already on the submission?
Lean: yes. The email's own text says no editor is assigned, which is
false here.
Basis: probe. <sup>[fn-a17](#fn-a17)</sup>

<a id="a18"></a>
**A18 — A change typed more than a minute after the last save is saved cut after its first letters** · 🐞 · minor.
An author who changes the Title on "Details" more than a minute after the
last save (after opening the wizard, when nothing has been saved yet) has
the timer save it while they are still typing. At an ordinary pace (a key
every quarter second) the draft's Title is saved as its first letter or
two, or empty (the box just cleared), and the rest is saved only a minute
later. Leaving the wizard or reloading within that next minute keeps the
cut Title: reopened, "Details"
shows only the part sent, as little as its first two letters, with no
question and no "Unsaved Changes" dialog. A Title that arrives within a
second, pasted say, is usually saved whole. A step change saves the
change as typed (Rule 9); the timer should too.
Basis: probe. <sup>[fn-a18](#fn-a18)</sup>

<a id="a19"></a>
**A19 — After the server refuses one save, the submission wizard hangs on "Saving" and the author cannot submit** · 🐞 · medium · crash: script.
When the server refuses one of a step's saves, whatever the field, the
wizard shows its "Error" dialog, and about four seconds later the page's
own script fails in the browser. From then on the footer reads "Saving",
nothing more is sent, both "Save for Later" buttons and "Submit" stay
disabled, and "Review" never gets past "Checking your submission".
The author's only way on is to reload the page. The reload drops the
refused change. Anything typed after it is offered back in an "Unsaved
Changes" dialog, and "Yes" saves it. A lost connection or a server
failure is retried and recovers; only a refusal hangs.
Today the server refuses a wizard save in three cases: the plain
language summary is required and still empty; the plain language
summary is longer than the section's word limit; on a preprint server,
"DOI of the published preprint" is typed without its web address.
([A20](#a20), [A16](#a16),
[→ Preprint relations A7](U75-preprint-relations.md#a7).)
Basis: probe, 2026-10-01. <sup>[fn-a19](#fn-a19)</sup>

<a id="a20"></a>
**A20 — Requiring a plain language summary makes the submission wizard refuse saves of other fields, and hang** · 🐞 · high · crash: script.
With Settings › Workflow › Submission › "Metadata" set to require the
plain language summary, the title typed on the start page is lost
without any message, and the server refuses these wizard saves, after
which the wizard hangs [A19](#a19):
- On "Details", a change saved while the summary's box is still empty
  (a new Title, say). Once the summary is typed, the "Details" save
  goes through, but text typed in the step's "References" box is
  still refused.
- On "For the Editors", a metadata field the journal asks for there
  ("Coverage", for one). "Review" lists "Coverage" as "None provided",
  and after a reload the field is empty.
- On a preprint server, every answer to the required "Relation status"
  on "For Readers", also one ticked after the hang that "Unsaved
  Changes" offers after a reload (Rule 9c), so it cannot be saved while
  the setting is on.

An author who types the title again, the abstract and the summary on
"Details" before its first save, and leaves "References" empty, can
still submit, but without references and, on a preprint server,
without a relation status. With the summary only asked for, the same
saves go through and the text survives a reload. The same requirement refuses the Publication pages'
saves after submission
([→ Publication metadata A1](U40-publication-metadata.md#a1)).
Basis: probe, 2026-10-01. <sup>[fn-a20](#fn-a20)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Intake by work type, series later** · ✅ · intended divergence.
A press's start form asks for the Submission Type, "Monograph: Authors are
associated with the book as a whole." or "Edited Volume: Authors are
associated with their own chapter.", instead of a section. Nothing at
intake filters by series. The wizard header states the type ("Submitting a
Monograph."), "Change Submission Settings" offers the type and language, and
an optional Series choice (default "None") sits in the For the Editors step.
The Details step additionally lists the book's Chapters, and the Review step
summarizes them. Chapter management itself belongs to
*Chapters & work type* {OMP}. Basis: code inspection; the press replaces the
section machinery by design. <sup>[fn-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — A press refuses the comma-separated copy list its help text asks for** · 🐞 · minor.
On the workflow settings' Emails screen the "Notify Anyone" box's help
reads "Separate multiple email addresses with a comma. Example:
one@example.com,two@example.com", the same words on every app. On a press,
saving two addresses that way is refused with "This is not a valid email
address."; a journal and a preprint server accept the list. So a press can
copy the acknowledgement to one extra address only, and its own screen
says otherwise. Basis: probe. <sup>[fn-omp2](#fn-omp2)</sup>

<a id="omp3"></a>
**OMP3 — "Submit As" lists its roles in a changing order** · 🐞 · minor.
"Submit As" selects whichever role it lists first. A journal and a
preprint server always list "Author" first. A press lists the roles in
no fixed order. In one run a user holding Series Editor and Author saw
"Author" first on one visit and "Series editor" first on the next, and a
user holding Press Editor and Author saw "Press editor" first; in the
other run both saw "Author" first. So the preselected role changes from visit to
visit, and can be "Series editor", which "Begin Submission" refuses
[A14](#a14). An author who accepts the preselection may be refused, or
submit under a role they did not mean.
Basis: probe. <sup>[fn-omp3](#fn-omp3)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The preprint wizard is galley-based and moderation-aware** · ✅ · intended divergence.
On a preprint server the Upload Files step manages the preprint's galleys
(what readers will download) rather than workflow files. Its panel is
titled "Files", and "Add File" asks for a galley label and then the file's
Preprint Component. The Review step's matching panel is also titled
"Files". The fourth step is titled "For Readers", with "Comments for the
Moderator" as its comments box, and adds a License choice and a required
"Relation status" question. There is no Reviewer Suggestions step. Because
posting is the only editorial act, the messaging branches on whether the
user may post: the submit confirmation says a moderator will review the
preprint (or that the submitter can post it), "Submission complete" carries
the matching text (shown to whoever views it ⚠ [OPS4](#ops4)), and the
acknowledgement email has a can-post variant, which in practice never
arrives ⚠ [OPS5](#ops5). By default only moderators and managers may post;
a screening plugin can extend it to authors. "Submit As" offers exactly
the roles a submission can be made under, the manager's and the
Author's, so a Preprint Server Manager who is also an Author may submit
as either, and a Moderator is never offered their role. Basis: code
inspection + probe; a deliberate single-stage design. <sup>[fn-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — Enrolment as Author happens on opening the start screen** · ❓ · latent.
On a journal or press, a roleless signed-in user is enrolled in the Author
role only when their submission is actually created. On a preprint server
the enrolment happens as soon as they open the "Make a Submission" screen,
before they have typed anything. So backing out still leaves the Author
role on their account.
Question: should merely viewing the start screen change a user's roles?
Lean: no. Enrol at creation, as the other apps do. Basis: probe.
<sup>[c](#fn-c)</sup>

<a id="ops3"></a>
**OPS3 — An author's own Cancel silently does nothing** · 🐞 · user-visible.
On a preprint server the wizard offers the submitting author the same
"Cancel" control and "Cancel submission" dialog as everywhere else, but
confirming does nothing. The dialog closes, no message appears, and the
draft survives; the deletion is refused behind the scenes. A manager
cancelling the same draft succeeds, and on a journal or press the author's
own cancel works. So the control is offered to someone the server always
refuses. Basis: probe (two independent runs, same day).
<sup>[o](#fn-o)</sup>

<a id="ops4"></a>
**OPS4 — The completion screen thanks whoever is looking at it** · ❓ · latent.
A preprint's "Submission complete" screen picks its message by the viewer's
posting rights, not the submitter's. A manager opening another author's
submitted wizard address reads "Thank you for submitting your preprint. You
can now post your preprint publicly." They are thanked and invited to post
a preprint someone else submitted, and the author-facing links (Review this
submission, Create a new submission, Return to your dashboard) are absent
from this variant.
Question: should the completion screen address the submitter rather than
the viewer? Lean: yes for the thank-you wording; offering a capable viewer
the post-it-now link is defensible. Basis: probe. <sup>[n](#fn-n)</sup>

<a id="ops5"></a>
**OPS5 — No acknowledgement email for a can-post submitter** · 🐞 · user-visible.
A submitter who may post their own preprint (a manager, by default) gets no
acknowledgement email after submitting: neither the can-post variant the
app defines for exactly this case nor the ordinary one. A plain author
submitting under the same conditions receives theirs. The submitter is left
with no emailed record of the submission. Basis: probe (with the
plain-author control the same day). <sup>[q](#fn-q)</sup>

<a id="ops6"></a>
**OPS6 — The needs-an-editor email speaks journal language on a preprint server** · ❓ · minor.
When a preprint arrives with no moderator assigned, the manager's task
entry is preprint-worded ("A new preprint has been submitted to which a
moderator needs to be assigned."), but the accompanying email is the
journal template: "there is no editor assigned … assigning an editor under
the Participants section".
Question: should the email use preprint-server wording, as the matching
task entry does? Lean: yes. The pair is inconsistent on the same event.
Basis: probe. <sup>[q](#fn-q)</sup>

<a id="ops7"></a>
**OPS7 — The "Not Allowed" page explains itself in a raw locale code** · 🐞 · minor.
A visitor turned away from a preprint server's start screen (Rule 3) gets
the "Not Allowed" heading with, where the explanation should be, the
literal text "##submission.wizard.notAllowed.description##". The refused
visitor is never told why. Both of the page's explanations are affected
(the must-be-registered and the all-sections-closed variants). A journal
and a press show the proper text. Basis: probe + code inspection (the
locale keys are missing on OPS alone). <sup>[c](#fn-c)</sup>

<a id="ops8"></a>
**OPS8 — A further galley on a resumed or reloaded draft never gets its file** · 🐞 · user-visible · crash: script.
When the wizard is opened on a draft that already lists a galley
(resumed after "Save for Later", or simply reloaded), "Add File" › label ›
"Save" leaves the label window open, opens "Upload a File Ready for
Publication" over it, and the page's script fails. Choosing the
Preprint Component and uploading the file work, but after "Continue"
the window's "2. Review Details" step stays blank and its "Continue"
greyed, so the upload can never be finished. The new label stays in the
"Files" list with no file, also after a reload. A draft's first galley,
and a second one added without reloading, upload normally.
Basis: probe. <sup>[fn-ops8](#fn-ops8)</sup>

<a id="ops9"></a>
**OPS9 — "Review" says no files were uploaded for a galley already on the draft** · 🐞 · minor.
When the wizard is opened on a draft that already has a galley (resumed
later, or reloaded), the Review step's "Files" panel reads "No files
have been uploaded for this submission.", although "Upload Files" lists
the galley, no problem is raised and "Submit" is enabled. Only a galley
uploaded since the page was loaded is listed ("PDF Preprint Text"). The
author's last look before submitting tells them their file is missing.
Basis: probe. <sup>[fn-ops9](#fn-ops9)</sup>

<a id="ops10"></a>
**OPS10 — A Moderator already on a preprint is not told it was submitted** · ❓ · minor.
On a journal or press an editor already on the submission when it is
submitted gets "You have been assigned as an editor on a submission to
{journal}" at that moment (Side effects). On a preprint server neither a
Moderator added to the draft by a Preprint Server Manager nor a
submitter who chose "Preprint Server manager" gets any such email.
Question: should a preprint server tell the Moderators already on a
preprint that it has been submitted? Lean: yes. The journal and the
press send it for the same event.
Basis: probe. <sup>[fn-ops10](#fn-ops10)</sup>

### Retired

<a id="a11"></a>
**A11 — No profile affiliation, no submission: the wizard's start 500s** · ✅ · retired. Fixed upstream (pkp/pkp-lib#13265), 2026-09-03. <sup>[fn-a11](#fn-a11)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Ways in. Sidebar entry: `PKPTemplateManager::setupBackendPage()`
`$menu['submit']` (label `dashboard.startNewSubmission`), guarded by
`!$context->getData('disableSubmissions')` (AFFW-065). Reader block:
`MakeSubmissionBlockPlugin` (`plugins/blocks/makeSubmission`, PLUG-005),
template links to `about/submissions` (AFFR-092); the plugin ships in OJS
and OMP only — OPS has no `makeSubmission` block directory, and live
(2026-08-25) no plugin-grid row and nothing submission-shaped among its
sidebar options. Live-probed 2026-08-25 (OJS + OMP): the plugin is listed
**disabled** in Settings → Website → Plugins; after enabling it, Appearance
→ Setup → "Sidebar" offers ""Make a Submission" Block" — ticked, the reader
sidebar shows the "Make a Submission" block whose link lands on the
"Submissions" page (`about/submissions`). Page handler:
`PKP\pages\submission\PKPSubmissionHandler`
(ROUTE-027; ops `index`, `saved`, `cancelled`, and the deprecated `wizard`
op which `redirectUrl`s to `Repo::submission()->getUrlSubmissionWizard()` —
live-probed 2026-08-25: bare `/submission/wizard` lands on the start
screen; with a valid own draft's `submissionId` it lands in that draft's
wizard at its first step),
subclassed without new ops by each app's
`APP\pages\submission\SubmissionHandler` (ROUTE-051/070/086). Role
assignment on the handler: Author, Sub-editor (Section Editor), Manager,
Site Admin. Legacy "New Submission" button on the old submissions list
panel (AFFW-068, `SubmissionsListPanel.vue`
`submission.submit.newSubmissionSingle`): the panel's only remaining
server-side mount is the Native XML import/export plugin's submission
picker. Live-probed 2026-08-25 as the manager on all three apps: that
screen's export panel shows no such button anywhere (OJS tab "Export
Articles", OMP "Export", OPS "Export Preprints") —
`PKPNativeImportExportPlugin` blanks the panel's `addUrl` and the button
renders only when one is set, so it cannot appear on this mount by
construction. Dead-in-context; not documented as a body rule.

<a id="fn-b"></a>
**b** — Open/closed. Menu guard as in note a. Start screen:
`lib/pkp/templates/submission/start.tpl` shows the notification
`manager.setup.disableSubmissions.notAccepting` when
`$currentContext->getData('disableSubmissions')` (AFFW-070), else the start
form (AFFW-071). API guard: `PKPSubmissionController::add()` returns 403
with `author.submit.notAccepting` when `disableSubmissions` — creation only;
neither `PKPSubmissionHandler::showWizard()` nor
`PKPSubmissionController::submit()` re-checks the setting (basis of A1; the
notice string's manager-facing tail is A3). Live-probed 2026-08-25 on all
three apps: with the box checked, the sidebar entry disappears and the
typed `/submission` address shows only the notice, worded per app ("This
journal is not accepting submissions at this time. Visit the workflow
settings to allow submissions." — press/server on OMP/OPS); the identical
text shows to a plain author and to the manager, and "Visit the workflow
settings" is plain text, not a link (A3). Re-enabling restored the sidebar
entry and the start form. A1 live-probed 2026-08-25 (scratch journal,
"Disable Submissions" ticked in Settings → Workflow): a draft started
beforehand still opened as the normal wizard with no closure notice, was
filled, and submitted through to "Submission complete" — while the same
author's start screen carried only the not-accepting notice.

<a id="fn-c"></a>
**c** — Start gates. Wizard page authorization for a new submission adds
only `UserRequiredPolicy` and marks role assignments checked
(`PKPSubmissionHandler::authorize()`), so any signed-in user reaches the
start screen. OJS/OPS `SubmissionHandler::start()` shows
`submission.wizard.notAllowed[.description]` when
`getSubmitUserGroups()` is empty and `submission.wizard.noSectionAllowed.description`
when `getSubmitSections()` is empty; OMP checks only user groups (no
sections at intake). Shared `PKPSubmissionHandler::getSubmitUserGroups()`:
site admins → their manager/admin groups; others → their active groups with
submission-stage access; fallback → the context's author-role groups with
`permitSelfRegistration` — any one opens the gate; OMP seeds TWO
self-registering author-role groups out of the box (`Author` and
`Chapter Author`, OMP `registry/userGroups.xml`), where OJS and OPS seed
one (display only — enrolment happens in
`PKPSubmissionController::add()`, whose fallback enrols into the first
Author group *without* re-checking `permitSelfRegistration`; the same
fallback catches editorial roles the gate admits — note fn-a9). OPS overrides
`getSubmitUserGroups()` and calls `Repo::userGroup()->assignUserToGroup()`
directly while rendering the start page (basis of OPS2). Editor-restricted
sections admit `PKPSection::getEditorRestrictedRoles()` = Site Admin,
Manager, Sub-editor. Section closure roster:
`Repo::section()` collector `excludeInactive()` +
`getEditorRestricted()` in `getSubmitSections()`. Live-probed 2026-08-25:
a signed-in user with no role in the journal reaches the start form; on
OJS the Users list showed no enrolment after the visit and an "Author" row
only after "Begin Submission", while on OPS the same check showed the
"Author" row after the bare page open, before anything was pressed (OPS2).
With the Author role's "Allow user self-registration" box unchecked, the
same kind of user instead got the "Not Allowed" page, body verbatim: "You
are not allowed to submit to this journal because authors must be
registered by the editorial staff. If you believe this is an error, please
contact Site Admin." (the site contact's display name) — the verbatim body
is OJS-probed. Suite runs 2026-08-26: on OMP, unchecking the box on the
Author group alone left the start form reachable — the roleless user came
through the press's second self-registering group, Chapter Author — and
the "Not Allowed" page appeared only with self-registration off on both
groups (the group-set gate). On OPS the page's heading showed but the
explanation beneath it rendered as the literal
`##submission.wizard.notAllowed.description##`: OPS's app locale files
define neither `submission.wizard.notAllowed.description` nor
`submission.wizard.noSectionAllowed.description` — OJS defines both, and
OMP defines the one (`notAllowed.description`) its handler uses
(rechecked against the checkouts 2026-08-26; OPS7). Section roster the
same day: the author's radio offered only the open sections; a Journal
Manager was additionally offered the editor-restricted one; the deactivated
section was offered to no one.

<a id="fn-d"></a>
**d** — Start form. Shared `PKP\components\forms\submission\StartSubmission`
(VUE-023 hosts it): intro (`beginSubmissionHelp`), locale radio when
`getSupportedSubmissionLocaleNames() > 1`, required rich-text `title`,
checklist confirm (`submissionChecklist` → one `submissionRequirements`
checkbox), `userGroupId` "Submit As" radio when ≥2 qualifying groups
(qualifying = groups with submission-stage access where such stages exist),
privacy consent (`privacyStatement`, or the site's when
`sitewide_privacy_statement` config is set). OJS/OPS subclass adds
`sectionId` radio when >1 open section (hidden field when exactly 1) with
per-section policy text via `showWhen`; OMP subclass adds the `workType`
radio (Monograph / Edited Volume). The OPS copy is a fork of the OJS
subclass (identical logic, `author.submit.serverSectionDescription`
description) — forked-copy rule: shared claims need the cross-app probe.
Live-probed 2026-08-25, all three apps: field roster and order as the
table states; the checklist fieldset is titled "Submission Checklist" on
OJS and OPS but "Submission Requirements" on OMP; with a single submission
language no Submission Language radio appears anywhere; selecting a
section renders its policy text beneath the radio list. "Submit As"
(same day, OJS): a "Journal manager"+Author account got no radio — the
stock Journal manager group carries no stage assignment, leaving one
eligible group — while a "Journal editor"+Author account got the fieldset
"Submit As", description verbatim: "Select the role that best describes
your contribution to this submission. Select an editorial role if you want
to edit and publish this submission yourself."
Live-probed 2026-09-28 (two runs per app, scratch contexts with
throwaway users; Rule 4a, Actors "Start a submission"): the
roster is `getSubmitUserGroups()` — on OJS and OMP the user's groups with
submission-stage access, so a sub-editor group qualifies and the stock
manager group (no stage) does not; OPS overrides it with the user's
manager, site-admin and author groups. OJS offered "Author" + "Section
editor" and "Author" + "Journal editor"; OMP "Author" + "Series editor"
and "Author" + "Press editor"; OPS offered no fieldset to a Moderator +
Author (submitted as Author) and "Author" + "Preprint Server manager" to
a manager + Author, while a Journal/Press manager + Author got none on
OJS and OMP. The first radio was the checked one in every visit. The
fieldset's description read only "Select the role that best describes
your contribution to this submission." beside "Section editor" or
"Series editor", and added "Select an editorial role if you want to edit
and publish this submission yourself." beside "Journal editor", "Press
editor" and "Preprint Server manager". Refusal: note fn-a14; order:
note fn-omp3.

<a id="fn-e"></a>
**e** — Creation. `StartSubmissionForm.vue` strips `title` from the
submission payload (AFFW-073), POSTs to the submissions API, then saves
`title` against `publications[0]` and redirects to
`submission.urlSubmissionWizard` keeping the spinner (AFFW-074/075).
`PKPSubmissionController::add()`: validates section
(exists/active/editor-restricted) and `userGroupId` against the submitter's
groups; picks the Author-role group by default when none was chosen; creates
submission + first publication; `Repo::stageAssignment()->build()` assigns
the submitter (metadata-edit allowed while a draft); when submitting under
an Author group, creates the contributor from the user's profile and makes
it the publication's primary contact.
Live-probed 2026-09-28 (Rule 5's editorial-role sentence): a user who
chose "Journal editor", "Press editor" or "Preprint Server manager"
submitted with the Participants list, read by the submitter and by a
Journal Manager, holding only themself in that role, and the
Contributors step empty; the same users choosing "Author" were listed as
"Author".

<a id="fn-f"></a>
**f** — Draft state and access. `submissionProgress` (submission schema,
note r) holds `start` or the current step id; empty = submitted.
`PKPSubmissionHandler::index()` routes: no id → start; `submissionProgress`
non-empty → wizard; else → complete screen. Existing-submission access is
`SubmissionAccessPolicy` (the workflow's role × assignment gate — Manager
and Site Admin unassigned, Author/Sub-editor by assignment). Live-probed
2026-08-25 (OJS): a Journal Manager typing another author's draft address
got the full wizard, footer "Cancel" included; a Section Editor assigned as
participant got the wizard with "Save for Later" and "Continue" but no
"Cancel"; an unassigned Section Editor and a different Author were both
turned away with the denial page, verbatim "The current role does not have
access to this operation." The assignment route, probed the same day: the
editorial dashboard row for an incomplete submission offers only "Complete
submission" (no workflow opener), but the workflow screen still opens at
its typed address (`/dashboard/editorial?workflowSubmissionId={id}`),
where the "Participants / Assign" panel's legacy "Assign Participant"
modal (role filter, name search, per-user radio) assigned the Section
Editor to the draft.
Resume step: `SubmissionWizardPage.vue` `created()` opens the step matching
`submission.submissionProgress` — which only `saveForLater` updates
(note j). Live-probed 2026-08-25: pressing Continue fires no write (request
log empty across two step advances), and a plain reload reopened the
wizard at Upload Files with the later steps no longer marked reached.

<a id="fn-g"></a>
**g** — Steps. `PKPSubmissionHandler::getSteps()`: files, details,
contributors, editors, reviewerSuggestions (only when
`reviewerSuggestionEnabled`), review. Details step
(`getDetailsStep()`): `Details` form (title required; keywords when the
`keywords` setting is request/require; abstract with section word
limit/requirement passed by the OJS/OPS handlers; a press passes no section
args), `PKPCitationsForm` when `citations` request/require, data sections
(`dataCitations` manager section, `PKPDataAvailabilityForm`) under one
"Data" heading, `funders` section when enabled. For the Editors
(`getEditorsStep()`): `ForTheEditors` form (metadata fields become
required when their setting is `METADATA_REQUIRE`; `categoryIds` when
`submitWithCategories` + categories exist) + `CommentsForTheEditors`
(`submission.submit.coverNote` "Comments for the Editor"). OMP adds the
chapters grid section to Details (`ChapterGridHandler`; chapter atoms belong
to *Chapters & work type*) and the `seriesId` radio in its
`ForTheEditors`. OPS replaces the files step with the galleys template
section (`PreprintGalleyGridHandler` grid, AFFW-125) and splices License
(`LicenseUrlForm`) and Relation (`RelationForm`, first field required) into
the editors step. Header line: `getSubmittingTo()` — OJS/OPS section and/or
language sentence (only when >1 of either), OMP work-type sentence
(AFFW-077/079). Section types and template hooks: wizard.tpl
(AFFW-081..088); per-app page components `SubmissionWizardPage[OMP|OPS].vue`
(VUE-029; OPS variant tracks galleys via `galley:*` events, AFFW-112).
Live-probed 2026-08-25: step rail verbatim on OJS/OMP "1 Upload Files ·
2 Details · 3 Contributors · 4 For the Editors · 5 Review"; OPS's fourth
entry reads "4 For Readers" and its comments box "Comments for the
Moderator". Same day: ticking the review settings' "Reviewer Suggestion at
Submission" checkbox ("Allow authors to suggest potential reviewers at
submission process") inserted "5 Reviewer Suggestions" between For the
Editors and Review plus a Review-step "Reviewer Suggestions" panel ("No
reviewers have been suggested for this submission." while empty);
unticking removed both; the OPS workflow settings offer no Review tab at
all. Suite runs 2026-09-07: on OMP the comments box is titled "Cover Note
to Editor" (the press's own `submission.submit.coverNote` string) with the
same help text, and the discussion row and the mailed copy carry that
title; OJS's read "Comments for the Editor" and OPS's "Comments for the
Moderator" the same way. Same day, the install default: a fresh
context's Settings → Workflow → Submission › Metadata screen reads
`keywords` and `citations` at "request" on OJS, OMP and OPS, and the
seeded context's Details step showed "Keywords" (help "Keywords are
typically one- to three-word phrases…", no "Required" mark) between
"Title" and "Abstract * Required" on all three.

<a id="fn-h"></a>
**h** — Navigation. Footer buttons `common.continue` / `common.back` /
`form.submit` (AFFW-093, 097); step rail `<steps>` with
`submission.wizard.completeSteps`, `common.showingSteps`,
`common.showAllSteps` (AFFW-080). Hash history:
`openStep`/`addHistory`/`openUrlHash` push `#stepId` and reopen on
`hashchange` (AFFW-101; `Page.vue` registers the listener). Live-probed
2026-08-25: hash, tab title and the browser Back button track every step
change; no Back button on step 1. Unreached rail entries render as plain
text (no button) and clicking them does nothing; a fragment-only address
edit on the open wizard fires `hashchange` and opens any step id — earlier
steps then show as completed, and validation runs only when the opened
step is Review — while every full page load rewrites the typed hash to the
resume step, `#review` included (`created()` opens the resume step and the
step watcher rewrites `location.hash` before `openUrlHash()` reads it).
Tab title: `submission.wizard.titleWithStep`. Phone-width collapse (A10)
live-probed 2026-08-26, fresh browser contexts sized before load: OJS
collapses correctly at 600–1024px (`.pkpSteps--collapsed`, "1/5 steps" +
"Show all steps"), but a fresh load at 480px or 375px renders no collapse
and the document scrolls sideways (scrollWidth 1056 against a 375px
viewport, step buttons laid out past the right edge); OMP fails the same
way at 375px; OPS collapses correctly at 375px (scrollWidth 558). The same
OJS page resized 1440→375 *without* reload collapses correctly; reloading
at that width breaks it again — reproduced in both orders, twice.

<a id="fn-i"></a>
**i** — Autosave. `autosave` mixin: a 500 ms job timer
(`_runAutosaveJobs()`); once more than 60 s have passed since
`lastSavedTimestamp` (set at page load, then to each successful save's
queue time) it queues the forms changed since (`staleForms`,
`SubmissionWizardPage.addAutosaves()`); an unchanged step sends nothing;
failed saves park in browser localStorage and flip
`isDisconnected` (footer `common.saving` / `common.reconnecting` /
`common.lastSaved`, AFFW-094); reconnect retries back off 4 s → 30 s. Save
buttons disable on `isDisconnected` (AFFW-078, 096); submit enablement
requires `!isAutosaving && !isDisconnected` (note m). Restore dialog on
load when stored autosaves exist: `common.unsavedChanges` title,
`common.unsavedChangesMessage`, `common.yes` / `common.discardChanges`
(AFFW-108). A 403 on autosave asks for a re-login (session/CSRF expiry).
Live-probed 2026-08-25: the save fired ≈55 s after typing stopped, with no
per-keystroke request; the footer flashed "Saving" for ~300 ms, then
"Last saved 0 seconds ago", the relative time ticking every ~3 s
("… 57 seconds ago" → "Last saved 1 minute ago"). On first arriving at a
step the footer already read "Last saved 3 seconds ago" although no save
request had been made in the session — the counter starts from page load
(A4). Live-probed 2026-09-30 (Rule 9, A15, A18; three apps, two runs
each): typed 2–6 s after the load, saved 51–58 s after typing (the ≈55 s
above); typed 40 s in, 17–20 s after; typed 75 s in, within a second,
mid-typing; a second change 20 s after a save, 37 s after typing (60.5 s
after that save). The "Saving" came as the footer reached "Last saved 1
minute ago". No request in 75 s on an unchanged "Upload Files" or in
40–75 s on an unchanged "Details"; "Continue" and the rail sent the typed
Title 0.1–0.5 s after the press. Offline live-probed 2026-08-25 (network-level offline emulation, two
sittings): typing offline leaves the ticker counting until the queued save
fails; the footer then flashes "Saving" and settles on "Reconnecting", both
"Save for Later" buttons and (on Review) "Submit" carry `disabled`, while
Back, Cancel and Continue never do; failed retries came at growing gaps
(4/8/16 s). Back online, the next retry succeeded, the footer returned to
"Last saved …", the buttons re-enabled, and the offline-typed text was on
the server at the next fresh open. Control the same day: on Review with
nothing unsaved, ~110 s offline changed nothing — no request attempted,
Submit still enabled. Restore dialog verbatim: title "Unsaved Changes",
message "We found unsaved changes from 20 seconds ago. This can happen if
you lose connection to the server while working. Restoring those changes
may overwrite any changes you have made since then. Would you like to
restore those changes now?" ("20 seconds ago" is a live relative time);
"Yes" restored the text, which a later autosave sent; "No, discard unsaved
changes" left only the last server-saved content.
Live-probed 2026-09-28, two runs per app on all three (Rules 8 and 9):
a draft walked to "Review" by "Continue", "Details" reopened from the
rail, its Title typed or its References box filled, then "Review"
reopened from the rail (0 s or 1.5 s after the last keystroke, or with no
pause) or by "Continue", and "Submit" pressed at once: 42 submits, each
kept the change. Every move sent one `PUT …/publications/{id}` (200)
before the Review check's `_validateOnly` request; "Review", the submit
dialog, the author's workflow header and the Journal Manager's
"References" page all showed the change, and no late autosave or 401
followed. The rail back to "Upload Files" saved the same way. The
2026-08-25 observation in note f (no write on "Continue") was a step with
nothing changed. An untouched step sent its timer save 58.7–59.7 s after
typing stopped. Leaving: note fn-a15.

<a id="fn-j"></a>
**j** — Save for later. `SubmissionWizardPage.saveForLater()` flushes
autosaves then PUTs `…/saveForLater` with the furthest started step
(AFFW-102); failure dialog `common.disconnected` /
`submission.wizard.unableToSave` (AFFW-103).
`PKPSubmissionController::saveForLater()` writes `submissionProgress` and
sends `SubmissionSavedForLater` (MAIL-053, key `SUBMISSION_SAVED_FOR_LATER`,
seeded in all three apps' `registry/emailTemplates.xml`; excluded from the
OPS mailable-management map but still sent) — `recipients([$request->getUser()])`,
the basis of A2. Saved screen: `saved.tpl` (AFFW-131) — heading
`submission.wizard.saved`, resume link, `submission.wizard.saved.emailConfirmation`.
Live-probed 2026-08-25 on all three apps (scratch contexts): the Saved for
Later screen and the email — subject "Resume your submission to {context}" —
arrived identically worded on OJS, OMP and OPS (settling the OPS caveat:
hidden from OPS email management, still sent); the mail's only submission
link is the plain wizard address, and following it reopened the wizard at
the step recorded — the resume step travels with the draft, not the link.
Manager run the same day (A2): the manager saving another author's draft
got the sole email, the author got none, and the screen's note read "We
have emailed a copy of this link to you at {the manager's address}." while
its link named the author.

<a id="fn-k"></a>
**k** — Reconfigure. "Change" opens `ReconfigureSubmissionModal` (VUE-081,
title `submission.wizard.changeSubmission`) hosting the per-app
`ReconfigureSubmission` form: shared base adds `locale` when >1 submission
language; OJS/OPS add `sectionId` (+ per-section policy text) when >1 open
section — the OPS copy is again a fork of the OJS subclass; OMP adds
`workType`. `SubmissionWizardPage.reconfigureSubmission()` splits values by
`reconfigureSubmissionProps` (OJS/OPS `locale`; OMP `locale`,`workType`) and
`reconfigurePublicationProps` (OJS/OPS `sectionId`; OMP none), PUTs
submission then publication, and reloads the page (AFFW-098..100). No
`$submittingTo` string → no line and no Change control (wizard.tpl guard,
AFFW-079). Live-probed 2026-08-25 (OJS, two open sections + two languages):
"Change" opened "Change Submission Settings" with the language and section
choices; saving reloaded the wizard, the "Submitting to…" line named the
new section and language, and the new section's abstract requirement and
word cap applied to the Details step immediately (reverting on switching
back). Single-configuration control the same day: on a one-language,
one-section scratch journal and preprint server the wizard rendered no
"Submitting to…" line and no "Change" control anywhere, while a matching
scratch press kept "Submitting a Monograph. Change" — the work type stays
reconfigurable. OMP and OPS reconfigure fork controls: notes fn-omp1 /
fn-ops1.

<a id="fn-l"></a>
**l** — Review step. Entering the last step runs `validate()` — a
`_validateOnly` PUT to the submit endpoint; `errors` map back onto the
step forms and the banner `submission.wizard.errors` (AFFW-089, 106, 109).
Overlay `submission.wizard.validating` while autosaving/validating
(AFFW-091). Review panels: `review-details.tpl` one panel per locale, title
& abstract always, keywords / plain-language summary / data availability
only when their setting is request/require (AFFW-113..115);
`review-editors.tpl` metadata items each gated by their setting, categories
when enabled, comments (AFFW-116..118) — also one panel per locale:
live-probed 2026-08-26 (scratch journal, English + French (Canada)
submission languages), Review panel headings verbatim "Files, Details
(English), Details (French (Canada)), Contributors, For the Editors
(English), For the Editors (French (Canada))"; `review-files.tpl` file list with
genre badge and `errors.files` notifications (AFFW-119);
`review-contributors.tpl` with `submission.wizard.noContributors` empty
warning (AFFW-120); `review-reviewer-suggestions.tpl` (AFFW-121); field
renderer `review-publication-field.tpl` with `common.noneProvided`
(AFFW-122). OPS: `review-galleys.tpl` (`author.submit.noFiles` when empty,
AFFW-126) + `review-license.tpl` (AFFW-127); the OPS relation panel and OMP
chapters panel render on the same hook; *Preprint relations* and
*Chapters & work type* own their atoms. Confirmation section:
`ConfirmSubmission` form — one
`confirmCopyright` checkbox only when the context has a `copyrightNotice`
(AFFW-092). Live-probed 2026-08-25 (scratch journal): an empty draft
walked to Review on "Continue" alone; the "Checking your submission"
overlay showed while the check ran; banner verbatim "There are one or more
problems that need to be fixed before you can submit. Please review the
information below and make the requested changes."; the Files panel
complained "You must upload at least one Article Text file." and the
Abstract item "This field is required."; the auto-listed submitter meant
no contributors complaint; "Submit" carried `disabled`; each panel's
"Edit" reopened the step that owns it. Copyright probed both ways the same
day: with the journal's Copyright Notice empty (Settings → Workflow →
"Author Guidance"), Review showed no Confirmation section and Submit
enabled without any tick; with a notice saved, Review gained the bottom
section "Confirmation — Please confirm the following before you submit."
with the box "Yes, I agree to the copyright statement.", and Submit stayed
disabled until it was ticked. On OPS the files review panel is titled
"Files", its galley row reads label + component ("PDF Preprint Text"),
and the empty complaint is "You must upload at least one Preprint Text
file."
Live-probed 2026-09-28, two runs per app (Rules 12a, 12b): a submission
started in an editorial role reached "Review" with "No contributors have
been added for this submission." on the Contributors panel, no banner,
"Submit" enabled, and the submit completed, on all three apps. On OPS the
"License" and "Relation status" panels' "Edit" left the step at "5
Review" and the address at `#review`, with no script error and no
dialog, while "For Readers" "Edit" opened "4 For Readers" (`#editors`);
the cause, a step id missing from both panels' templates, is in the
*Preprint relations* spec's note f-a11. The OPS Files panel after a
reload: note fn-ops9.

<a id="fn-m"></a>
**m** — Submit gates and the submit action. Enablement:
`canSubmit = !isAutosaving && !isDisconnected && isValid && isConfirmed`
(every checkbox in the confirmation form ticked — AFFW-107); the footer
primary button disables on the last step otherwise (AFFW-097). Server
check `Repo::submission()->validateSubmit()` (shared): not already
submitted (`submission.wizard.alreadySubmitted`), title in submission
locale, contributor given/organization names + non-ROR affiliation names in
submission locale, every `Context::getRequiredMetadata()` item, required
genres (`GenreDAO::getRequiredToSubmit()` →
`submission.files.required.genre[s]`), plain-language summary when
`METADATA_REQUIRE`. OJS and OPS overlay (forked copies — cross-app probe
required): section abstract requirement + abstract/plain-language word
limits. `PKPSubmissionController::submit()` additionally rejects an
inactive or editor-restricted section
(`submission.wizard.sectionClosed.message`). Confirm dialog:
`submission.wizard.confirmSubmit` (OJS/OMP), OPS
`submission.wizard.confirmSubmit[.canPublish]` branching on
`Repo::publication()->canCurrentUserPublish()` (AFFW-104;
`SubmissionHandler::getConfirmSubmitMessage()` OPS override). On success:
`Repo::submission()->submit()` clears `submissionProgress`, stamps
`dateSubmitted`, fires the `SubmissionSubmitted` event, opens the
comments-for-editors discussion, auto-creates stage task templates;
`confirmCopyright` adds the `SUBMISSION_LOG_COPYRIGHT_AGREED` event-log
entry with the notice text. Submit dialog live-probed 2026-08-25, verbatim
per app — OJS/OMP: "The submission, {title}, will be submitted to
{context} for editorial review. Are you sure you want to complete this
submission?"; OPS plain author: "Are you sure you want to submit {title}
to {server}? Once you submit, a moderator will review the preprint before
posting it online."; OPS can-post submitter: "…Once you submit, you will
be able to review your submission and post it online."
Validation live-probed 2026-08-25: against a 50-word section cap, the
Details counter read "Word Count: 60/50" and the Review complaint was
verbatim identical on OJS and OPS — "The abstract is too long. It should
be 50 words or less. It is currently 60 words long."; on a scratch press
the Abstract field carried no "Required" marker and an empty abstract
raised no complaint (the otherwise-empty monograph's only complaint:
"You must upload at least one Book Manuscript file."). Double-submit the
same day (two tabs, one author): the second tab's confirm drew the server
refusal — 400, "This submission has already been submitted. Please visit
your submissions dashboard to view it." in the browser's own traffic —
while the screen showed only the generic problems banner with zero item
complaints, no toast and no dialog (A6; the `submissionProgress` error key
has no panel mapping in the Review step's error display). Activity log the
same day (manager's Activity Log & Notes, History tab): "Article
submitted" beside the copyright entry rendered verbatim "{$filename}
({username}) agreed to the copyright terms for submission." — the
`{$filename}` token literal (A5). The copyright box must be re-ticked on
every fresh visit to Review (test-authoring note).

<a id="fn-n"></a>
**n** — Complete/terminal screens. `complete.tpl` (OJS/OMP, AFFW-129):
heading `submission.submit.submissionComplete`, text
`submission.submit.whatNext.description`, links `whatNext.review`
(→ `getWorkflowUrl()`: author-assigned users → the author workflow url,
others → editorial), `whatNext.create`, `whatNext.return`. OPS
`complete.tpl` (AFFW-130) branches on
`Repo::publication()->canCurrentUserPublish()`:
`submission.submit.complete.canNotPost` + the three links, or
`…canPost` with the workflow link inline. `cancelled.tpl` (AFFW-132):
heading `submission.wizard.submissionCancelled` + create/return links; the
`cancelled` op requires no submission id. The wizard address of a submitted
submission reaches `complete()` via `index()` routing (note f).
Live-probed 2026-08-25, all three apps: complete-screen body verbatim on
OJS "The journal has been notified of your submission, and you've been
emailed a confirmation for your records. Once the editor has reviewed the
submission, they will contact you." (press-worded on OMP); OPS
cannot-post variant "Thank you for submitting your preprint. The server
has been notified of your submission and you have been emailed a
confirmation for your records. Once the moderator has reviewed your
submission, they will post your preprint or contact you." The author's
"Review this submission" opened My Submissions with that submission's
workflow view; a manager typing the same address got the screen with the
link pointing at the editorial dashboard instead; re-typing the wizard
address re-answered with the same screen, no "Cancel" anywhere on it.
OPS4 observation, same day: the `canCurrentUserPublish()` branch keys on
the current user, so a manager at another author's submitted address read
the can-post text "Thank you for submitting your preprint. You can now
post your preprint publicly." with the single inline link "post your
preprint" and none of the three standard links.

<a id="fn-o"></a>
**o** — Cancel. Footer `#cancelSubmission` link-button shown when
`$canCancelSubmission` (AFFW-095): `showWizard()` sets it for context
Managers / Site Admins and for users holding an author-group stage
assignment on the submission. Dialog `submission.wizard.submissionCancel` /
`submission.wizard.cancel.confirmation`, `common.ok` + `common.cancel`,
negative style; DELETE to the backend submissions endpoint, redirect to the
cancelled screen (AFFW-105). Server guard
`Repo::submission()->canCurrentUserDelete()`: Manager (context) or Site
Admin, or an Author with a submission-stage author assignment while
`submissionProgress` is non-empty — i.e. drafts only for authors. No
mailable is dispatched on the path. Live-probed 2026-08-25: dialog wording
identical on all three apps; on OJS and OMP confirming landed on the
"Submission cancelled" screen and the draft left the author's list, and
re-typing the deleted draft's wizard address answered a bare "404 Not
Found" page without app chrome. OPS3, two independent runs the same day:
the OPS author's confirm fired the delete, the server refused it (403,
payload "You do not have permission to delete this submission."), nothing
showed on screen and the draft survived; the OPS manager's cancel on
another draft succeeded through the same flow. Mechanism: OPS drafts sit
on the Production stage, so the author never holds the *submission-stage*
author assignment `canCurrentUserDelete()` demands — the footer's
`$canCancelSubmission` check does not mirror it.

<a id="fn-p"></a>
**p** — Section closed mid-draft. `PKPSubmissionHandler::showWizard()`
checks the draft's section: `getIsInactive()`, or `getEditorRestricted()`
and the user not in `getEditorRestrictedRoles()` → the message page
`submission.wizard.sectionClosed[.message]` replaces the wizard. The same
pair of conditions re-checked at submit (note m). OMP publications carry no
section at intake, so the rule is OJS/OPS (and their handler/repository
copies are forks — cross-app probe). Live-probed 2026-08-25 (scratch
contexts): deactivating the draft's section, and separately restricting it
to editors, each replaced the author's wizard with a reader-frontend
"Section Closed" page, body verbatim "{journal} is not accepting
submissions to the {section} section. If you need help recovering your
submission, please contact Site Admin." (the site contact's display name)
— byte-identical text across both closure kinds, and identically worded on
OJS and OPS (the fork holds); the manager opened the same draft's wizard
unblocked in the editors-only case. OMP absence control the same day: no
section field anywhere in the monograph wizard — the start form has none
and "Change Submission Settings" held only the two Submission Type
choices. Suite runs 2026-09-07 (OJS and OPS): a manager reopening their
own draft in a section deactivated after the draft was started got the
"Section Closed" page (heading "Section Closed", the same body, the
manager signed in) and never the wizard; in the editors-only case their
wizard opened, Review raised no section complaint and "Submit" was
enabled. `showWizard()` sends everyone to the page on `getIsInactive()`
alone; only the editor-restricted branch is role-gated, so the submit-time
re-check is unreachable for a deactivated section.

<a id="fn-q"></a>
**q** — Submit-time side effects (listeners on the `SubmissionSubmitted`
event; all auto-discovered in the three apps unless noted).
`SendSubmissionAcknowledgement` (per-app subclass of the shared listener):
gated on the `submissionAcknowledgement` context setting; sends
`SubmissionAcknowledgement` (MAIL-049, key `SUBMISSION_ACK`) to users with
author stage assignments, bcc per `copySubmissionAckPrimaryContact` /
`copySubmissionAckAddress`; when the setting is `allAuthors`, sends
`SubmissionAcknowledgementOtherAuthors` (MAIL-051 — dispatched directly,
sharing key `SUBMISSION_ACK_NOT_USER` with the registered-but-not-dispatched
`SubmissionAcknowledgementNotAuthor`, MAIL-050) to contributors with emails
who are not submitters. Setting sweep live-probed 2026-08-25 (OJS scratch
journal; Settings → Workflow → Emails, panel "New Submission"): the
"Submission Confirmation" radios read "Send an email to all authors."
(checked by default on a fresh journal), "Send an email to the submitting
author only.", "Do not send an email."; on the default, the submitter's
acknowledgement (subject "Thank you for your submission to {journal}")
arrived, a second contributor received the distinct co-author message
(subject "Submission confirmation", "You have been named as a co-author on
a submission to…"), and a "Notify Anyone" address arrived only as Bcc on
the submitter's message (suite runs 2026-09-07, OMP and OPS: with "Notify
Primary Contact" on and a "Notify Anyone" address set, the submitter's
message carried exactly the contact and that address as Bcc and nothing
as Cc, and the co-author's message carried neither; OJS by the shared
listener, whose OJS run read the two addresses in Cc-or-Bcc without
telling them apart); with "Do not send an email." nothing arrived —
the needs-editor mail bounding the wait — while the completion screen
still read "…you've been emailed a confirmation for your records." (A7).
An OMP end-to-end control the same day mirrored the OJS fan-out exactly
(acknowledgement + needs-editor, nothing else). OPS all-authors control
(suite runs 2026-08-26): the co-author message arrived under the seeded
OPS template's subject "Submission Acknowledgement" — where OJS's reads
"Submission confirmation" — with the same named-as-co-author body
(app-worded subject, not a divergence entry). OPS subclass swaps in
`SubmissionAcknowledgementCanPost` (MAIL-074, key
`SUBMISSION_ACK_CAN_POST`) when every submitter passes
`canCurrentUserPublish()` (default: authors cannot — only the
`Publication::canAuthorPublish` hook grants it). OPS5, live-probed
2026-08-25 (scratch server): a manager submitting their own preprint
received no acknowledgement of any kind — Mailpit held only the two
needs-editor notifications — while a plain author's acknowledgement
("Thank you for your submission to {server}") arrived under the same
conditions minutes earlier (the synchronous-send control); the can-post
swap path evidently sends nothing on this build. `AssignEditors`:
`SubEditorsDAO::assignEditors()` assigns section/series-configured editors,
creates `NOTIFICATION_TYPE_SUBMISSION_SUBMITTED` (NOTIF-012) for each and
the editor-assigned email (owned by *Stage participants*); with no
assignment it creates `NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED` task
notifications for Managers and sends `SubmissionNeedsEditor` (MAIL-052, key
`SUBMISSION_NEEDS_EDITOR`, unsubscribable per user; seeded in all three
apps). A8 live-probed 2026-08-25: on two scratch journals a section's
configured Section Editor ("Editorial Assignments — Select the editorial
users who should be assigned automatically to all new submissions to this
section.", checkbox persisted on the section form) was never assigned — no
assignment email, nothing on their dashboard, needs-editor fired instead —
while on the seeded first journal the same flow assigned and emailed all
three configured editors with no needs-editor mail. Mechanism:
`assignEditors()` builds `$userGroupIds` from the user-group collection's
array indexes (`$userGroups->keys()`), not its group ids, then filters
assignments against them — any context whose group ids exceed its group
count loses every assignment; the first context's low ids coincide with
the indexes, masking the fault. Even in the working case no distinct
"new submission submitted" notification surfaced anywhere probed (Tasks
panel, dashboard, workflow view) — the assigned editor observably gets the
assignment email, the submission on their editorial dashboard, and their
Participants entry. Needs-editor path live-probed the same day on all
three apps: every Manager (including the auto-enrolled admin) received
the email — subject "A new submission needs an editor to be assigned:
\"{title}\"", body ending "…assigning an editor under the Participants
section.", identical journal-worded template on OPS too (OPS6) — plus a
Tasks-panel row, app-worded: "A new article|monograph|preprint has been
submitted to which an editor|moderator needs to be assigned."
Comments-discussion email live-probed
2026-08-26 (OJS scratch journal, acknowledgement setting "Do not send an
email.", no editor assigned): after submitting with a comment in the box,
the mail catcher held exactly one author-bound message — subject "Comments
for the Editor", From and To both the author's own address, body the
comment text — and no acknowledgement (the needs-editor mail to the
manager bounding the wait); the discussion's only participant being the
submitting author, the author was emailed their own comment.
`LogSubmissionSubmitted`: event-log entry
`submission.event.submissionSubmitted`. `UpdateAuthorStageAssignments` /
`RestrictAuthorAssignment`: author metadata-edit rights drop to the group's
configured default once submitted. OPS `AssignDOIsOnSubmission`:
`Repo::submission()->createDois()`.
Editors already on the submission, the needs-an-editor condition and
the editorial-role submitter, live-probed 2026-09-28, two runs per app
(scratch contexts with two Journal Managers and throwaway users). After
`assignEditors()` has assigned the section's editors, it emails
`EditorAssigned` to every manager or sub-editor assignment on the
submission whose group has access to the Submission stage; the
`AssignEditors` listener sends the needs-an-editor mail whenever
`assignEditors()` itself assigned nobody, whoever else is already on
the submission. A draft carrying a Section/Series Editor put on it
through the scenario tooling's `participants[]`, submitted by its
Author: on OJS and OMP the editor got "You have been assigned as an
editor on a submission to {journal}" and the Participants list kept the
editor and the Author; on OPS the Moderator, listed before and after
the submit, got nothing. OPS groups carry only the Production stages
(`registry/userGroups.xml` stages 5,6), so the Submission-stage filter
matches no moderator there (OPS10). The same filter would also skip
moderators the section assigns automatically; that case was not driven. The control draft with no editor sent no such email. Both
Journal Managers and `admin` (a Journal Manager of every scratch
context) got "A new submission needs an editor to be assigned:
\"{title}\"" in both cases, on all three apps (A17). A throwaway
Editor + Author submitting as "Journal editor" (OJS) or "Press editor"
(OMP) got that assignment email and the needs-an-editor email, and no
acknowledgement, while the completion screen read "…you've been emailed a
confirmation for your records." (A7); the same user type submitting as
"Author" got "Thank you for your submission to {journal}". On OPS the
"Preprint Server manager" submitter got only the needs-an-editor email
(the can-post case, OPS5).

<a id="fn-r"></a>
**r** — Schema. The submission record itself is defined in the shared
submission schema `lib/pkp/schemas/submission.json` (SET-025, 32 props —
notably `submissionProgress`, note f), overlaid per app:
`ojs…/schemas/submission.json` (SET-034: e.g. `sectionId` routing prop,
`scheduledIn`), `omp…` (SET-039: `workType`, audience props, …), `ops…`
(SET-045: `sectionId`, `stageId` tweaks). The wizard and its endpoints read
and write through this schema; the endpoint family itself (create,
save-for-later, submit, delete) belongs to the submissions interface homed
in *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*
(rider both ways).

<a id="fn-a9"></a>
**fn-a9** — A9. Live-probed 2026-08-26 (OJS scratch journal): a user whose
only role was Section editor pressed "Begin Submission" (no "Submit As"
fieldset offered); the wizard opened, the Contributors step showed the
submitter auto-listed as "Author — Primary Contact", and the manager's
Users grid afterwards listed the account with both roles, "Section editor
Author". Control the same day: a Journal-manager-only account began a
submission with no enrolment (Contributors "No items found.", Users grid
unchanged — the row's manager half holds). Mechanism (shared pkp-lib, so
all three apps; probed on OJS): `PKPSubmissionController::add()` builds
its submit-as roster from the user's context groups
`withRoleIds([ROLE_ID_MANAGER, ROLE_ID_AUTHOR])` only — sub-editor groups
are never eligible, and the submission-stage filter is commented out
pending pkp/pkp-lib#10929 — so a pure Section Editor hits the empty-roster
fallback, which enrols into the first Author group without re-checking
`permitSelfRegistration` (note c). A pure Site Administrator's admin group
is site-level while the roster is context-scoped, so the same fallback
should fire — not driven: the only site administrator on a test install is
the seeded `admin` account every suite depends on, and the probe would
permanently add an Author role to it.

<a id="fn-a11"></a>
**fn-a11** — A11. Reproduced 2026-09-01 on OJS `main` `d44b186c22` (env 0,
checkout fully synced: submodules, composer install, npm ci, UI rebuilt,
DB reset): POST `/api/v1/_test/scenarios/submission` → 500
`TypeError: PKP\author\Author::getAffiliations(): Return value must be of
type Traversable|array, null returned` (`Author.php:230`); full suite 21✓
with everything seeding a submission red. Chain: `Repository::
newAuthorFromUser()` (unchanged since pkp/pkp-lib#11030) runs
`setAffiliations($migratedAffiliations ? [$migratedAffiliations] : null)`
— the null is stored, so `hasData('affiliations')` is true;
`9e2fbac214` ("Fix addAffiliation() for fresh and lazy-loaded authors",
merged via `6f0a39733a` `i13003-author-order-fix`) replaced
`getAffiliations()`'s `getData('affiliations') ?? collect()` with the
hasData guard, which returns the stored null against the `iterable`
return type; `DAO::insert()` (line 172) iterates `getAffiliations()` →
throw. The production path is identical: `PKPSubmissionController::add()`
(line 736) calls `newAuthorFromUser()` for every Author-role submitter,
then `Repo::author()->add()`. Prior pkp-lib pointer `13b621e424` green
(scheduled CI run 33466736951); first red at the `d44b186c22` pointer
bump (pkp/ojs run 33536204412). Direct probe 2026-09-01 clearing the
harness of blame (the `_test` endpoints are NOT involved): a plain curl
session as `author.alex` (no affiliation in `user_settings`) POSTing the
production `api/v1/submissions` with a valid start payload → 500 with the
identical TypeError; after inserting the same `user_settings.affiliation`
row the profile form writes, the identical request → 200, submission
created. The affiliation-less user shape is legitimate product state:
`schemas/user.json` marks `affiliation` nullable and `RegistrationForm`
attaches no required-validator to it. The suite's U21 S1 (pure UI, no
scenario seeding) also failed at "Begin Submission" in the same run.
Fix is either side of the mismatch: null-tolerant `getAffiliations()` or
`collect()` instead of null in `newAuthorFromUser()`. Fix PR pkp/pkp-lib#13265 verified at the PR ref 2026-09-01 (full OJS suite 129/129 green); its first revision broke the with-affiliation branch (`collect($obj)` cast the object's properties to items) and was corrected by the author the same day (`eb4cef9203`, `collect([$migratedAffiliation])`). Upstream-ready report handed to the team 2026-09-01 (`docs/reports/`, deleted once addressed; git history keeps it). Retired 2026-09-03: the fix merged as pkp-lib `eb4cef92` (pkp/pkp-lib#13265) and reached all three apps' `main` (OJS `c499837187`, OMP `a1aefa3fe`, OPS `6bda92fb03`), where the full suites ran green that day (OJS 154, OMP 156, OPS 119 tests).
<a id="fn-a12"></a>
**fn-a12** — Emails screen after "Do not send an email.". The off end of
`submissionAcknowledgement` is stored as no row, and the "Submission
Confirmation" radio group renders no option checked for a missing value;
the next save posts the group unselected, so the state survives. Seen
2026-09-07 while building the scenario tooling (OJS, by hand): Settings →
Workflow → Emails reopened after saving "Do not send an email." listed
"Send an email to all authors.", "Send an email to the submitting author
only." and "Do not send an email." all unchecked, and the acknowledgement
stayed off. The form is the shared lib/pkp Emails settings form, so OMP
and OPS are expected to match; not reopened there.

<a id="fn-a13"></a>
**fn-a13** — Language change and the copied contributor. The wizard's
"Change Submission Settings" form PUTs `submissions/{id}`
(`PKPSubmissionController::edit()`), which saves the new `locale` and
nothing else; only the workflow's `changeLocale` route calls
`copyMultilingualData()`. `Repo::affiliation()->migrateUserAffiliation()`
fills the submission locale from the profile's default-locale text at
draft creation only (pkp/pkp-lib#13317, issue #13274; before it a profile
text with an exact registry match became a `ror` link with no name, which
`validateSubmit()` skips). Driven 2026-09-12 on OJS at the ojs PR head
`75df364d49` / pkp-lib `3f82add062`, before the merge (kept as
`checks/sync/pkp-lib-13317/wizard-locale-change.js`): scratch journal en +
fr_CA, two authors with the English profile text "Registry University …"
and a cached registry record planted under exactly that text; drafts
started in en carried the text as `name.en` with `ror` null; "Change" →
French (Canada) → Save answered 200 and left `submissions.locale` =
`fr_CA` with the affiliation and the given name still `{en}`; the Edit
panel's Affiliations table read "The primary language French (Canada) is
required / 1 of 2 languages completed / Type the institution name in
French (Canada)"; Review showed the problems banner with "The given name
is missing in French (Canada) for one or more of the contributors." for
the author whose given name was en only and "The affiliation name is
missing in French (Canada) for one or more affiliations for one or more of
the contributors." for the one with both. The same run without a registry
record at the OJS tip `cea48a066b` (before the PR) showed the same two
messages, so the limitation predates the PR for typed text; the same
planting at pkp-lib `b48c22ca06` stored the `ror` and no name, the
population the PR moves. Not driven on OMP or OPS (their checkouts lack
the change; the wizard code is shared). Ruled expected by
@jarda.kotesovec in the session's thread, 2026-09-12.

<a id="fn-a14"></a>
**fn-a14** — A14. The start form offers the user's groups with
submission-stage access (note fn-d), which include a sub-editor group,
while `PKPSubmissionController::add()` accepts only the user's manager
and author groups (the roster behind A9, note fn-a9) and answers any
other with 400 `{"userGroupId":["You are not allowed to submit in this
user role."]}` (`api.submissions.400.invalidSubmitAs`), shown as the
field's error. Live-probed 2026-09-28, two runs each on OJS and OMP
(scratch context, a throwaway Section editor + Author, "Series editor"
on the press): "Section editor"/"Series editor" picked, "Begin
Submission" left the start form in place with the error under "Submit
As", and no draft was created; "Author" picked, the same user submitted
normally. OPS control: a Moderator + Author got no "Submit As" and
submitted as Author.

<a id="fn-a15"></a>
**fn-a15** — A15. Live-probed 2026-09-28, two runs per app on all three:
a draft's Title changed on "Details", on the first visit and on a return
from "Review", then My Submissions opened by address about 3.5 s later.
No dialog opened and no request was sent on leaving. Reopened, the
wizard's header and "Details" held the old title, the same after a
reload, and no "Unsaved Changes" dialog appeared either time. Control
the same runs: the rail back to "Upload Files" before leaving saved the
change (note i). Live-probed 2026-09-30, two runs per app on all three:
the Title typed 2–7 s after the page load and My Submissions opened by
address 1.5 s later; no request and no dialog on leaving, the seeded
title on reopening and after a reload, no "Unsaved Changes" dialog.
Typed 70 s after the load instead: note fn-a18.

<a id="fn-a16"></a>
**fn-a16** — A16. The save is the step's `PUT
…/submissions/{id}/publications/{publicationId}`; the server applies the
section's word limit to `plainLanguageSummary` as it does to the
abstract (*Publication metadata*) and answers 400
`{"plainLanguageSummary":{"en":["The plain language summary is too
long. It should be 10 words or less. It is currently 20 words long."]}}`,
which the wizard shows only as its generic error. Live-probed
2026-09-28, three runs on OJS and two on OPS (scratch context, plain
language summary enabled, a section with a 10-word limit, a draft in
it): a 20-word summary typed on "Details" ("Word Count: 20/10") drew the
400 from the timer save (58.7–59.7 s) or at once on "Continue" (the step
still advanced); then the "Error" dialog, the footer "Reconnecting" and
then "Saving" for good; one request in 20 s, no retry. The switch to
"Saving" comes with the page error about 4 s after the 400, whether or
not "OK" is pressed (live-probed 2026-10-01, note fn-a19). "Review"
listed "Plain Language Summary / None provided" under "Checking your
submission", "Submit" disabled. On reload the summary was empty; an
"Unsaved Changes" dialog came first after a timer save (OJS 3 of 3, OPS
2 of 2) and after "Continue" on OPS (2 of 2) but not on OJS (0 of 3);
the drive answered it "No, discard unsaved changes" before reading
"Details", and never pressed "Yes".
Crash: the page error "Cannot read properties of undefined (reading
'url')" about 4 s after the 400, in every over-limit drive (OJS 6 of 6,
OPS 4 of 4). Control: a 10-word summary saved (200, "Last saved…"),
showed on "Review" and survived a reload.

<a id="fn-a17"></a>
**fn-a17** — A17. `AssignEditors` sends the needs-an-editor mail and task
whenever `assignEditors()` assigned nobody itself; existing assignments
are not consulted. It sends them to every user of the context's
manager-level groups (`filterByRoleIds([ROLE_ID_MANAGER])`): the
"Journal editor" and "Production editor" accounts get the task and the
email as the "Journal manager" does, live-probed in *Notifications center
& email preferences* (U05 note e). Live-probed 2026-09-28, two runs per app on all
three: note q (a Section/Series Editor or Moderator on the draft, and
the "Journal editor", "Press editor" or "Preprint Server manager"
submitter, who received the email too).

<a id="fn-a18"></a>
**fn-a18** — A18. The job timer (note i) runs every 500 ms and, once
more than 60 s have passed since `lastSavedTimestamp`, queues every form
in `staleForms` with its values at that tick; a form changed after the
minute is stale from its first input, so the next tick sends what the box
holds then. Live-probed 2026-09-30, two runs per app on all three (a
seeded draft per case, the Author): the Title typed at 250 ms a key from
75 s after the load was saved 0.5–0.8 s after the first key carrying
"A", "Au" or "" (OPS, one run: the emptied box), and whole 60.5 s later;
after 75 s on "Upload Files", then "Details", the save 0.5–1.0 s after
the first key carried "Auto", "Autosav", "Autosave check ra" or a title
cut near its end (OJS one run whole), and a reload showed that title;
typed 70 s after the load (0.2–0.4 s of typing) and My Submissions opened,
nothing was sent on leaving and no dialog opened, and on reopening and
reload "Details" read "Autosave check leavelate" and a longer cut (OMP),
"Au" and "Autosave check lea" (OPS), the full title on OJS in both runs.
OMP typed as fast in one run and was cut, so whole or cut follows where
the typing falls against the 500 ms tick, not the app. No response of
400 or more, no page error, no browser dialog.

<a id="fn-a19"></a>
**fn-a19** — Rules 9b and 9c, A19. ui-library `SubmissionWizardPage.vue`
`autosaveErrored()` drops the refused save from the browser store for
any status but 0, 500 and 403 and opens the dialog; the autosave
mixin's `onError` has already set `isDisconnected`, so `_runReconnect()`
calls `_sendAutosave(undefined)` about 4 s later, which sets
`isAutosaving` and throws on `payload.url`; neither flag is cleared, and
"Save for Later", `canSubmit` and the Review check all wait on them.
Live-probed 2026-10-01, two
runs per app on all three (the Author of a seeded draft on scratch
contexts; kept script `shared/playwright/checks/U21/I01/i01.js`), 36
refused saves: a step's `PUT …/publications/{id}` answered 400 by a
Playwright route on a Title change (fault injection, three apps), the
server's 400 `plainLanguageSummary: This field is required.` (A20,
three apps) and OPS's 400 "This is not a valid URL." for a bare DOI.
Every one: the step advanced; the "Error" dialog; the footer
"Reconnecting", then "Saving" 4.1–5.3 s after the 400, at the page error
"Cannot read properties of undefined (reading 'url')", with the dialog
still open; no request in the next 25 s; both "Save for Later" and
"Submit" disabled, "Back" and "Cancel" enabled; "Checking your
submission" on "Review". A new Title typed on "Details" afterwards (and
on OPS the full DOI address typed into the same box) with "Continue"
sent nothing. After a reload "Unsaved Changes" ("We found unsaved
changes from 18 seconds ago. …") offered that later change; "Yes" sent
it (200), "Submit" enabled, and on OPS "Review" read "This preprint has
been published."; the refused change was never offered. With nothing
changed after the refusal (OJS, OMP), the reload opened no dialog and
the Title read as before. Controls the same runs (Rule 9a): a 500 from
the route and an aborted request on the same save gave "Reconnecting",
a retry 4.1–4.7 s later answering 200, "Last saved 4 seconds ago", the
buttons enabled, and the Title kept after a reload.
Issue report: [docs/issues/U21-A19-wizard-refused-save-hangs-saving.md](../issues/U21-A19-wizard-refused-save-hangs-saving.md).

<a id="fn-a20"></a>
**fn-a20** — A20. pkp-lib `PKPPublication\Repository::validate()`
checks a required `plainLanguageSummary` against what each save sends,
not against what the publication holds (as for the Publication pages,
*Publication metadata* A1); the wizard's other step forms never send the
summary, and the "Details" form sends its box even when empty. Live-probed 2026-10-01, two
runs per app on all three (scratch contexts with "Plain Language
Summary" at require and "Coverage" at ask; kept script
`shared/playwright/checks/U21/I01/i01.js`, variants `pls`, `plsdetails`,
`refs`, `relreq`, controls `cov`, `refsctl`): a summary typed on
"Details" saved (200); "Coverage" typed on "For the Editors" / "For
Readers" and "Continue" answered 400
`{"plainLanguageSummary":{"en":["This field is required."]}}`, then
note fn-a19's hang; "Review" read "Coverage / None provided" under
"Checking your submission", and after a reload "Coverage" was empty. A
summary and two lines in "References" on "Details": 200, then 400 for
the references. A Title change with the summary box empty: 400. OPS,
"This preprint has not been published elsewhere." answered alone: 400,
nothing stored. OPS, an answer ticked after the hang, offered by
"Unsaved Changes" after a reload and sent by "Yes": 400 and the page
error again; ticked again on "For Readers" after a plain reload: the
same. Controls, the summary at ask: the same drives answered 200 and
the text read back after a reload.
Issue report: [docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md](../issues/U21-A20-plain-summary-required-refuses-other-saves.md).

<a id="fn-omp1"></a>
**fn-omp1** — OMP divergence points: `StartSubmission` (OMP) adds
`workType`; `SubmissionHandler::getSubmittingTo()` returns the work-type
sentence; `ReconfigureSubmission` (OMP) offers `workType` + locale;
`getReconfigureSubmissionProps()` = `[locale, workType]`, publication props
empty; `ForTheEditors` (OMP) adds `seriesId` (options from
`getSubmitSeries()` — active, non-editor-restricted series — plus "None");
`getDetailsStep()` (OMP) appends the chapters grid section and review
panel. OMP has no `validateSubmit` override — no abstract requirement or
word limit at intake (press abstracts are governed by its own metadata
settings only; live-confirmed 2026-08-25, note m). Live-probed 2026-08-25: "Change Submission Settings"
offered only the Submission Type pair (plus "Submission Language" on a
bilingual scratch press), never a series; the "Series" radio ("None"
preselected, then the press's series) sat on the For the Editors step; and
the Details step's "Chapters" section ("Add Chapter" grid) showed for BOTH
work types — switching Edited Volume → Monograph changed only the header
line ("Submitting a Monograph. Change").

<a id="fn-omp2"></a>
**fn-omp2** — "Notify Anyone" on a press. `omp/schemas/context.json`
validates `copySubmissionAckAddress` as one `email_or_localhost` value;
OJS and OPS validate each comma-separated part. Seen 2026-09-07 while
building the scenario tooling, through the settings form's own validation:
"one@… , two@…" was refused on the press with "This is not a valid email
address." and accepted on OJS and OPS; the box's help text read "Separate
multiple email addresses with a comma. Example:
one@example.com,two@example.com" on all three apps.

<a id="fn-omp3"></a>
**fn-omp3** — OMP3. `getSubmitUserGroups()` (note c) reads the user's
groups with no ordering, and the start form's radio lists them as read
and checks the first. Live-probed 2026-09-28, two runs (scratch press):
run 1 listed "Series editor" first and checked on the second visit of
the Series editor + Author user (the first visit had "Author" first), and
"Press editor" first and checked for the Press editor + Author user; run
2 listed "Author" first for both. OJS (six visits) and OPS (four) listed
"Author" first every time.

<a id="fn-ops1"></a>
**fn-ops1** — OPS divergence points: `SubmissionHandler` (OPS)
`getFilesStep()` swaps in the galleys template section backed by the legacy
preprint-galley grid and tracks state in `SubmissionWizardPageOPS.vue`;
`getEditorsStep()` splices `LicenseUrlForm` + required `RelationForm`;
`getConfirmSubmitMessage()` / `complete()` /
`SendSubmissionAcknowledgement` (OPS) branch on
`Repo::publication()->canCurrentUserPublish()` (authors granted only via
the `Publication::canAuthorPublish` hook — screening plugins);
reviewer-suggestion settings are part of the review settings OPS does not
install, so the step's enabling flag stays off. The OPS start/reconfigure
section forms and the `validateSubmit` overlay are forked copies of OJS's;
fork-probed 2026-08-25 on a scratch server: the start form's "Section"
radio (description verbatim "Preprints must be submitted to one of the
server's sections."), the section-only "Change Submission Settings" panel,
and a section switch applying the new section's abstract requirement and
word cap ("Abstract * Required  Word Count: 0/100") all behaved as on OJS.
The For Readers step carried the "License" radio (six Creative Commons
options plus "Other license URL") and the "Relation status" field, marked
required ("Please indicate if this preprint has been published or
submitted for publication elsewhere."). Files step live-probed 2026-08-25
(author, seeded server): panel "Files" with an "Add File" control — not
"Add galley" — opening the "Add File" modal: "Galley Label *" ("Typically
used to identify the file format (e.g. PDF, HTML, etc.)."), Language, a
separate-website checkbox and "URL Path"; saving the label auto-opens the
legacy "Upload a File Ready for Publication" wizard, which demands a
"Preprint Component" (Preprint Text, Research Instrument, …, Other)
before the file — uploading without one raised "Errors occurred processing
this form / Missing or invalid component!", with the component chosen the
same upload passed. Review panel afterwards titled "Files", galley row
"PDF Preprint Text" (note l for the empty-state complaint).
The OPS `SubmissionHandler::getSubmitUserGroups()` override lists the
user's manager, site-admin and author groups (note c), the same set
`PKPSubmissionController::add()` accepts, so a Moderator is never
offered and a Preprint Server Manager + Author is. Live-probed
2026-09-28, two runs (note fn-d): the manager + Author got "Author"
(checked) and "Preprint Server manager" with the editorial-role hint, and
submitting as "Preprint Server manager" left them the only participant,
in that role, with no contributors.

<a id="fn-ops8"></a>
**fn-ops8** — OPS8. The wizard's galley list is kept by
`SubmissionWizardPageOPS.vue` (note g). Live-probed 2026-09-28, two runs
(author on a scratch server): three drafts per run whose galley was on
them when the page loaded, one resumed after "Save for Later", one built
with a galley by the scenario tooling, one uploaded and then reloaded.
On each, "Add File" › label "HTML" › "Save" kept the label window open
behind "Upload a File Ready for Publication" and raised the page error
"this.galleys.push is not a function"; the component and the file were
accepted, and when the file finished uploading "this.galleys.map is not
a function" followed; the "2. Review Details" step stayed blank and its
"Continue" could not be pressed. The "Files" list then held the new label with no
file, also after a reload. Controls: a draft's first galley, and a
second added in the same visit, completed with no page error.

<a id="fn-ops9"></a>
**fn-ops9** — OPS9. Review panel `review-galleys.tpl` (note l).
Live-probed 2026-09-28, two runs (scratch server): a galley uploaded in
the visit showed on "Review" as "PDF Preprint Text"; after a reload,
"Review" read "No files have been uploaded for this submission." with
"Submit" enabled while "Upload Files" still listed the galley. The same
text showed on the first "Review" of all 14 drafts built with a galley
by the scenario tooling, each of which passed the check.

<a id="fn-ops10"></a>
**fn-ops10** — OPS10. Mechanism and the 2026-09-28 drive: note q (the
Submission-stage filter on the editor-assigned email matches no OPS
group).

<a id="fn-s"></a>
**s** — Scenario seeding. Use the seeded context (`publicknowledge`) and
roster accounts (passwords = username doubled); the mail catcher is
Mailpit, one shared instance at `MAILPIT_URL` (default
`http://127.0.0.1:8025`, scenarios.md), read by recipient address, never
by position (PRINCIPLES A8); drafts and submissions are
scratch, created through the UI or the scenario submission endpoint
(`submitted: false` for drafts). Scenarios 1–4, 6, 9, 14, 15 and the
assigned-editor half of 11: `author.alex` (or the app's author roster
account). 1's no-affiliation bullet: a throwaway Author whose profile
`affiliation` is empty; 1's plugin bullets: `manager.maya` reads Settings →
Website → Plugins (a journal or press lists the "Make a Submission" block
disabled; OPS lists none). 2's comments bullet needs a section with no
assigned editor (a scratch journal's section) and reads the discussion on
the workflow screen at `/dashboard/editorial?workflowSubmissionId={id}` and
the copy in the mail catcher; 2's log bullet reads the activity log there.
3 reads the mail catcher for the resume link and opens it signed out. 4
needs `sectioneditor.ana` assigned to the draft's submission for the
control (the scenario builder's `participants[]` passthrough, or manually
as `manager.maya` through the workflow screen's Participants panel — note
f) and `manager.maya` for the manager's cancel; 4's deleted-address bullet
re-types the cancelled draft's `submission?id={id}` address. 5: a scratch
journal with two open sections and two submission languages (the context
builder's `sections[]` and `supportedSubmissionLocales` passthroughs), and
for the one-section bullets a second scratch journal at the builder's
defaults (no `sections[]`, no `supportedSubmissionLocales`: one section,
one submission language; a scratch press at the same defaults for the
press half). 6's
contributor bullet: a scratch submission whose second contributor carries a
name in the second language only (a builder recipe to settle at test time;
a missing key goes back to the harness step); 6's waived-abstract bullet:
OJS the seeded `REV` "Reviews" section (`abstractsNotRequired`), OPS a
scratch server with a section seeded `abstractsNotRequired: true` (the
seeded server's one section requires an abstract), OMP any draft (the
press asks no abstract at intake). 7–8, 11–13: `manager.maya`
flips `disableSubmissions`, section flags (`editorRestricted`,
`isInactive`, the section form's word count for 12's word-limit bullet)
and "Reviewer Suggestion at Submission" (Settings → Workflow → Review) on a
scratch journal; 12's policy bullet: one of the open scratch sections
seeded with a `policy`. 9: two scratch users with no role in the context. 10 sets
Workflow → Emails' "Submission Confirmation" (all authors, submitting
author only, off; the copy to the contact; an extra copy address) on a
scratch journal, with throwaway contributor and copy addresses for
mail-catcher scoping. 16: a scratch journal with a copyright notice (the
context's `copyrightNotice`); 17: a scratch journal seeded `metadata:
{keywords: 'require', subjects: 'request', dataAvailability: 'request'}`,
and for the control a second one with `keywords` `off` (the seeded
context asks for keywords by install default, so its Details step shows
the field; run 2026-09-07 on all three apps), with a throwaway Author on
each; 17's install-default bullet: the seeded context as `author.alex`
(or a scratch one with no `metadata` key). Never mutate the
shared roster or seeded sections — scratch sections/users for every
closure test.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Sidebar "Start A New Submission" | dashboard sidebar → `submission` page | AFFW-065 |
| Reader "Make a Submission" block {OJS OMP} | reader sidebar block → about/submissions | AFFR-092 · PLUG-005 |
| Start screen | `/submission` (no id) | AFFW-069..075 · VUE-023 |
| Wizard | `/submission?id={id}` (+ `#step`) | AFFW-077..110, 112..122, 125..127 · VUE-029, VUE-081 |
| Saved for Later | `/submission/saved?id={id}` | AFFW-131 |
| Submission complete | `/submission?id={id}` (submitted) | AFFW-129 (OJS OMP) · AFFW-130 (OPS) |
| Submission cancelled | `/submission/cancelled` | AFFW-132 |
| Deprecated wizard op | `/submission/wizard[?submissionId=]` → redirect | ROUTE-027 |
| Legacy list-panel button (dead — never renders on its one remaining mount) | Native XML plugin submission picker | AFFW-068 |

## Reference — code anchors

- `lib/pkp/pages/submission/PKPSubmissionHandler.php` — routing, start/wizard/saved/cancelled/complete, steps, gates (ROUTE-027)
- `{ojs,omp,ops}/pages/submission/SubmissionHandler.php` — per-app start checks, steps, submitting-to, reconfigure props (ROUTE-051/070/086)
- `lib/pkp/classes/components/forms/submission/{StartSubmission,ReconfigureSubmission,ConfirmSubmission,CommentsForTheEditors,ForTheEditors}.php` + per-app subclasses (OJS↔OPS forks for Start/Reconfigure)
- `lib/pkp/classes/components/forms/publication/Details.php` — wizard Details form
- `lib/ui-library/src/components/Container/{StartSubmissionPage,SubmissionWizardPage,SubmissionWizardPageOMP,SubmissionWizardPageOPS}.vue` (VUE-023/029) · `pages/submissionWizard/ReconfigureSubmissionModal.vue` (VUE-081) · `mixins/autosave.js`
- `lib/pkp/templates/submission/{start,wizard,complete,saved,cancelled}.tpl` + `review-*.tpl`; `omp…/templates/submission/{chapters,review-chapters}.tpl`; `ops…/templates/submission/{galleys,review-galleys,review-license,complete}.tpl`
- `lib/pkp/api/v1/submissions/PKPSubmissionController.php` — add / saveForLater / submit / delete (API family owned by *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*)
- `lib/pkp/classes/submission/Repository.php` — `validateSubmit()`, `submit()`, `canCurrentUserDelete()`; OJS/OPS `validateSubmit()` overlays (forked)
- `lib/pkp/classes/observers/listeners/{SendSubmissionAcknowledgement,AssignEditors,LogSubmissionSubmitted,UpdateAuthorStageAssignments,RestrictAuthorAssignment}.php` + per-app subscribers; `ops…/classes/observers/listeners/AssignDOIsOnSubmission.php`
- `lib/pkp/classes/context/SubEditorsDAO.php::assignEditors()` — auto-assignment + NOTIF-012
- `lib/pkp/schemas/submission.json` (SET-025) + app overlays (SET-034/039/045)
- Divergence points checked: per-app `SubmissionHandler` overrides as noted; OJS↔OPS forked start/reconfigure/validate code (chain cannot vouch — probes); OMP lacks a `validateSubmit` override (positive chain evidence)
