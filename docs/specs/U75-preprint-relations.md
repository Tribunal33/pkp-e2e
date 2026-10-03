---
name: preprint-relations
status: verified
---

# Preprint relations {OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A preprint is often published later by a journal or another publisher.
The preprint server lets the preprint's Author, and the Moderator or
Preprint Server Manager who handles it, record that: the preprint's
**"Relation status"** says whether it has been published elsewhere, and
once it has, **"DOI of the published preprint"** holds the address of
the **published version** (the version that journal or publisher
published). Readers of the preprint page then see a notice that points
to the published version. Crossref, the DOI registration agency a
preprint server deposits with, asks that a preprint's record name its
published version; the record the server deposits does so (no screen shows that record).
The Author is asked the question first while submitting; afterwards it
is changed from the **"Relations"** control on the workflow's
publication pages. This spec owns the relation's choices, the "Relations" control, the
Review step's "Relation status" panel, the notice on the preprint page,
and what the relation adds to the "Post the preprint" window and to the
Crossref record. <sup>a</sup>

OJS and OMP do not install preprint relations. A journal's and a press's
publication pages have no "Relations" control, their submission wizard
asks no "Relation status" question, and an article page or a book page
carries no published-elsewhere notice. <sup>b</sup>

## Actors & permissions

Who reaches a preprint's workflow and its publication pages is
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
Everyone who reaches those pages finds the "Relations" control there
(Rule 4). Whether its "Save" goes through is the one edit gate of
*Publication metadata*
([→ the edit gate](U40-publication-metadata.md#edit-gate)), judged for
the version whose pages are open. Below, **with the edit permission**
means the person's assignment to the preprint carries the metadata
permission (the "Permissions" box of
*[Stage participants](U35-stage-participants.md#boxes)*); a Moderator's
and an Author's assignment carry it by default on a preprint server
(Settings bullet 1).

| Action | Who may, and when |
|--------|--------------------|
| **See the relation on the preprint page** (Rule 8) | • Everyone who can open the preprint page, signed in or not<br>• On a version not yet posted: the Preprint Server Manager and the assigned Moderator, through the workflow's "Preview"; the Author is offered no "Preview" (*Workflow screen & stage access*), and a signed-out visitor gets "404 Not Found" <sup>h</sup> |
| **Open "Relations"** (Rule 4) | • Preprint Server Manager and Site Administrator: on every preprint<br>• Moderator: on a preprint they are assigned to<br>• Author: on their own preprint<br>• No other role reaches the publication pages (the Editorial Board Member and the Reader do not) <sup>c</sup> |
| **Save a relation** (Rule 5) | • Preprint Server Manager and Site Administrator: on any version, posted or not<br>• Moderator with the edit permission: on any version, posted or not<br>• Author with the edit permission: unless the version's "Status: …" reads "Posted" or "Scheduled" (a "Post" with a future "Date Posted", *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*), where "Save" is offered and refused ⚠ [A1](#a1) <sup>td1</sup><br>• Moderator or Author without the edit permission: "Save" is offered and refused ⚠ [A2](#a2) <sup>c</sup> <sup>td2</sup> |
| **Answer "Relation status" while submitting** | • Whoever submits the preprint, on the wizard's "For Readers" step (*[Submission wizard](U21-submission-wizard.md#steps)*); the Review step shows the answer (Rule 7), and the preprint can be submitted with the question unanswered (Rule 2) <sup>g</sup> |

## Fields & validation

**The relation form**, the same in the "Relations" panel (Rule 4) and on
the wizard's "For Readers" step:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Relation status" | Marked "* Required" on the wizard step, which still submits without an answer ⚠ [A8](#a8); unmarked in "Relations" | Three choices, in this order: "This preprint's relations have not been entered.", "This preprint has not been published elsewhere.", "This preprint has been published elsewhere." In "Relations" the version's saved status is ticked; a preprint whose status was never answered shows none of the three ticked (Rule 2a). On the wizard step the question carries the description "Please indicate if this preprint has been published or submitted for publication elsewhere." ⚠ [A5](#a5), and which choice shows ticked there is Rules 2a and 2b. <sup>d</sup> |
| "DOI of the published preprint" | No | Shown only while "This preprint has been published elsewhere." is ticked (Rule 3). Takes any full web address, "http" or "https": a DOI's address such as "https://doi.org/10.1234/abcd", or any other such as "http://example.org/x". A value that is not a full web address is refused with "This is not a valid URL." under the box: a DOI written on its own ("10.1234/abcd"), and also "doi.org/10.1234/abcd" and "doi:10.1234/abcd" ⚠ [A4](#a4). On the wizard step such a value is not saved either, but "Continue" ends in an error window instead of the message ⚠ [A7](#a7). Left empty, it is accepted and saved as nothing. The box has no help text. <sup>d</sup> <sup>td3</sup> |
| "Save" ("Relations" only; the wizard saves its steps itself) | — | Rule 5 |

**The Review step's "Relation status" panel**: its heading, an "Edit"
button that does nothing [A11](#a11), and one line that reads the
answer (Rule 7). <sup>g</sup>

## Rules & state

### The relation

1. **One relation per version.** Each version of a preprint holds its own
   relation: a status and, with "This preprint has been published
   elsewhere.", a DOI. "Relations" shows and saves the relation of the
   version whose pages are open (the version chosen in the workflow's
   "Preprint" group,
   [→ the side menu](U24-workflow-screen-and-stage-access.md#publication-tabs)),
   and the preprint page shows the relation of the version it displays
   (Rule 8). <sup>e</sup>
   - 1a. A new version ("Create New Version", *[Publish, schedule &
     versions](U49-publish-schedule-and-versions.md)*) starts with the
     relation of the version it was made from. Changing one version's
     relation afterwards leaves the other versions as they were.
     <sup>e</sup> <sup>td5</sup>
2. **Before anyone answers.** A preprint holds no relation status until
   someone saves one, on the wizard's "For Readers" step or in
   "Relations"; "This preprint's relations have not been entered." is
   held only once someone saves that choice. A preprint the Author
   submitted without answering stays that way [A8](#a8). <sup>d</sup>
   <sup>td4</sup>
   - 2a. **What the screens show meanwhile.** While no status is held:
     - "Relations" shows none of the three choices ticked;
     - the wizard's "For Readers" step shows none ticked, and its Review
       step's panel reads "This preprint has not been published
       elsewhere." [A9](#a9);
     - the "Post the preprint" window reads "This preprint's relations
       have not been entered." (Rule 9);
     - the preprint page shows no notice (Rule 8). <sup>td4</sup>
   - 2b. **A saved answer on the wizard step.** After the wizard page is
     reloaded, the "For Readers" step shows none of the choices ticked,
     whatever was saved ⚠ [A10](#a10). The Review step's panel still
     reads the saved answer, and "Continue" with nothing ticked keeps
     it. <sup>d</sup> <sup>td4</sup>
3. **The DOI goes with "published elsewhere".** The "DOI of the published
   preprint" box shows only while "This preprint has been published
   elsewhere." is ticked; ticking another choice hides it. Hiding does
   not clear it: saving another status keeps the DOI, and the box shows
   it again, after a reload too, as soon as "This preprint has been
   published elsewhere." is ticked again ⚠ [A3](#a3). The preprint page,
   the Review step and the "Post the preprint" window read the DOI only
   with "This preprint has been published elsewhere." (Rules 7 to 9).
   The Crossref record, which no screen shows, reads it whatever the status (Rule 10).
   <sup>f</sup> <sup>td6</sup>

### The "Relations" control

4. **Where it is.** Every page under a version in the workflow's
   "Preprint" group ("Title & Abstract", "Contributors" and the rest)
   shows, in the control region above the page, the "Status: …" line
   followed by a "Relations" button with a down arrow
   ([→ the page frame](U24-workflow-screen-and-stage-access.md#publication-chrome)).
   Pressing it opens a panel under the button holding the relation form
   (Fields) and "Save", filled with the version's saved relation.
   <sup>f</sup>
5. **Saving.** "Save" writes the status and the DOI box together.
   <sup>f</sup>
   - 5a. **Accepted.** "Saved" shows beside the button for a few seconds
     and the panel keeps the saved values. The preprint page shows the
     new relation on its next load; on a posted version this happens at
     once, with no new version and no new posting. The Activity Log gains
     a line (Side effects). <sup>f</sup>
   - 5b. **A DOI box that is not a full web address** (Fields). "This is
     not a valid URL." under the box, and below it "Please correct one
     error." with the buttons "Go to DOI of the published preprint: This
     is not a valid URL." and "Jump to next error"; the notice "The form
     was not saved because 1 error(s) were encountered. Please correct
     these errors and try again."; "Save" stays disabled until the box
     is changed. Nothing is written. <sup>d</sup> <sup>td3</sup>
   - 5c. **Someone the gate refuses** (Actors, "Save a relation"). The
     notice "An unexpected error has occurred. Please reload the page
     and try again.", which does not say why ⚠ [A2](#a2); the panel
     keeps the refused choice until the page is reloaded, and nothing is
     written. <sup>c</sup> <sup>td1</sup> <sup>td2</sup>
   - 5d. **Not saved.** A choice ticked, or an address typed, without
     "Save" stays in the panel when it is closed and opened again and on
     the version's other pages, with nothing marking it unsaved. A
     reload, or leaving the workflow for another page, drops it without
     a question; "Relations" then shows the saved relation. <sup>f</sup>
6. **Never read-only.** The panel looks and works the same for everyone
   who opens it: its choices and its "Save" stay active even for someone
   the gate refuses, while the same version's other publication pages
   show them a disabled "Save" (*Publication metadata*) ⚠ [A2](#a2).
   <sup>c</sup> <sup>td2</sup>

### The Review step

7. **The "Relation status" panel.** The wizard's Review step
   ([→ the Review step](U21-submission-wizard.md#review-step)) shows a
   "Relation status" panel. Its "Edit" does nothing: the step stays on
   "Review", and the Author reaches "For Readers" through the step rail
   or the "For Readers" panel's "Edit" ⚠ [A11](#a11). Its one line
   reads: <sup>g</sup>
   - "published elsewhere" with a DOI: "This preprint has been
     published.", the word "published" a link to the DOI's address,
     opening in a new tab;
   - "published elsewhere" without a DOI: "This preprint has been
     published elsewhere.";
   - "not entered" saved: "This preprint's relations have not been
     entered.";
   - not published elsewhere: "This preprint has not been published
     elsewhere.";
   - never answered (Rule 2): "This preprint has not been published
     elsewhere." too ⚠ [A9](#a9).

### What readers see

8. **The notice on the preprint page.** When the version the page shows
   is "published elsewhere", the page opens with a notice box, above the
   "Preprint" label line and the title (and below the older-version
   notice when an older version is shown): "This preprint has been
   published elsewhere." and, when a DOI is saved, a second line "DOI of
   the published preprint" followed by the saved address as a link that
   opens in the same tab. The other two statuses, and a preprint with
   no status, show no notice. The "Preview" of a version not yet posted
   shows the notice the same way, below the line "This is a preview and
   has not been published. View submission". <sup>h</sup> <sup>td7</sup>

### The "Post the preprint" window

9. **"Related Publication".** The confirmation window of "Post"
   (*[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*
   owns it; an assigned Moderator is offered no "Post" there) carries a
   "Related Publication" table with one line for the version about to be
   posted: <sup>i</sup> <sup>td8</sup>
   - "published elsewhere" with a DOI: "This preprint has been
     published.", the word "published" a link to the DOI's address,
     opening in a new tab;
   - "published elsewhere" without a DOI: "This preprint has been
     published, but no DOI is available yet.";
   - "not entered" saved, and never answered: "This preprint's
     relations have not been entered.";
   - not published elsewhere: "This preprint has not been published
     elsewhere."

### Crossref

10. **The deposited record.** When a posted version that has its own DOI
    is deposited with Crossref, or exported for it, from the DOIs page
    ([→ the DOIs page](U45-dois.md#dois-page)), its record says that it
    is a preprint of the work named in its "DOI of the published
    preprint" box. The text goes exactly as saved, the full web address,
    marked as a DOI ⚠ [A6](#a6). The status is not read: a version whose
    box holds a DOI sends the link whatever its status ([A3](#a3)), and a
    version whose box is empty sends none. Each posted version in the
    record carries its own. <sup>j</sup>
11. **No reminder to deposit again.** Saving a relation does not mark the
    preprint's DOI "Needs Sync" on the DOIs page: a DOI that reads
    "Registered" keeps reading "Registered", after a reload too. Crossref
    keeps the relation of the last deposit until the manager deposits
    again. <sup>k</sup>

## Side effects

- **Activity Log.** Every accepted save adds "Submission metadata
  updated" under the saver's name
  ([→ what is logged](U38-submission-activity-log-and-notes.md#what-is-logged)).
  <sup>l</sup>
- **No mail.** Saving a relation sends no email and raises no
  notification. <sup>l</sup>
- **Crossref.** A deposit carries the relation, in a record no screen shows (Rule 10);
  nothing is sent when the relation is saved (Rule 11). <sup>k</sup>

## Settings that modify behavior

1. **"Permit submission metadata edit."** on the Author role (Settings ›
   Users & Roles › "Roles", the Author row's "Edit"; *[Roles
   configuration](U54-roles-configuration.md)*). Default on a preprint
   server: ticked, also on the Moderator role. Unticked: every Author
   assignment loses the edit permission, so an Author's "Save" in
   "Relations" is refused on every version (Actors, "Save a relation";
   Rule 5c [A2](#a2)); unticked on the Moderator role, the same for
   Moderators. <sup>m</sup> <sup>td9</sup>
2. **"Registration Agency"** (Settings › Distribution › "DOIs" ›
   "Registration"; *[DOIs](U45-dois.md#agencies)*). Default: none, the
   tab reading "No Registration Agency Enabled". "Crossref":
   a deposited posted version that has a DOI of its own carries its relation to Crossref, in a record no screen shows (Rule 10).
   DOIs are on by default. <sup>m</sup>

## Cross-feature interactions

- *[Submission wizard](U21-submission-wizard.md#steps)*: the "For
  Readers" step, how it saves and the Review step's check. The
  "Relation status" question on it, with its choices and its required
  mark, is in Fields here; the Review step's panel is Rule 7.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-chrome)*:
  the control region where "Relations" sits, and who reaches the
  publication pages.
- *[Publication metadata](U40-publication-metadata.md#edit-gate)*: the
  edit gate Actors applies, and the disabled "Save" of Rule 6.
- *[Stage participants](U35-stage-participants.md#boxes)* and *[Roles
  configuration](U54-roles-configuration.md)*: the "Permissions" box and
  the role option that grant the edit permission.
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  "Post", the "Post the preprint" window (Rule 9 states only its
  relation line) and "Create New Version" (Rule 1a).
- *[Article landing page & reading](U13-article-landing-page-and-reading.md#page)*:
  the preprint page; the notice on it is Rule 8.
- *[DOIs](U45-dois.md#dois-page)*: deposit and export. The record's other
  relations, to an earlier version and to data citations, are that
  spec's and *[Citations & references](U42-citations-and-references.md)*'.
- *[Submission activity log & notes](U38-submission-activity-log-and-notes.md#what-is-logged)*:
  the log line.

## Canonical scenarios

Scenario 2 runs on a scratch preprint server with throwaway accounts,
because it needs "Crossref" as the server's registration agency;
scenario 7 runs on the seeded journal and press, and the others on the
seeded preprint server, with ready accounts and preprints seeded for
them. The accounts, the passwords and the tooling recipe are in the
footnote. <sup>s0</sup>

1. **An Author records that their preprint has been published elsewhere**

   Given: Author, on their own submitted preprint not yet posted, whose
   "Relation status" nobody has answered, and the Preprint Server
   Manager, signed in in a second browser.

   - **The Activity Log before**: the Preprint Server Manager opens the
     preprint's workflow and its "Activity Log" and counts the
     "Submission metadata updated" lines under the Author's name; the
     log may already hold some before any relation is saved.
   - **"Relations"**: as the Author, open the preprint from My
     Submissions and choose "Title & Abstract" under its version in the
     workflow's "Preprint" group: the control region above the page shows the "Status: …" line
     and after it a "Relations" button with a down arrow. Press it: a
     panel opens under the button with "Relation status" and its three
     choices in this order, "This preprint's relations have not been
     entered.", "This preprint has not been published elsewhere." and
     "This preprint has been published elsewhere.", none of them ticked,
     and "Save" (Fields; Rules 2a, 4).
   - **The DOI box**: tick "This preprint has not been published
     elsewhere.": no "DOI of the published preprint" box shows. Tick
     "This preprint has been published elsewhere.": the box shows, with
     no help text (Fields; Rule 3).
   - **Saved**: type https://doi.org/10.1234/abcd in "DOI of the
     published preprint" and press "Save": "Saved" shows beside the
     button for a few seconds, and the panel keeps "This preprint has
     been published elsewhere." and the address (Rule 5a).
   - **After a reload**: reload the page and press "Relations": "This
     preprint has been published elsewhere." is ticked and the box holds
     https://doi.org/10.1234/abcd (Rules 4, 5a).
   - **The Preprint Server Manager's preview**: the Preprint Server
     Manager opens the preprint's workflow and presses "Preview": under
     the line "This is a preview and has not been published. View
     submission" a notice reads "This preprint has been published
     elsewhere." and, on a second line, "DOI of the published preprint"
     followed by https://doi.org/10.1234/abcd as a link, above the
     "Preprint" label line and the title (Actors, "See the relation";
     Rule 8).
   - **The Activity Log**: the Preprint Server Manager opens the
     preprint's "Activity Log" again: it holds one more "Submission
     metadata updated" line under the Author's name than before (Side
     effects).
   - **Control**: the Author's workflow offers no "Preview" (Actors, "See
     the relation"). <sup>s0</sup>

2. **A Preprint Server Manager records it on a posted preprint**

   Given: Preprint Server Manager, on a scratch preprint server with
   "Crossref" as its registration agency and a posted preprint of a
   throwaway Author whose DOI reads "Registered" on the DOIs page and
   whose "Relation status" nobody has answered, and a visitor, signed
   out, on that preprint's page.

   - **Before any save**: the visitor's page shows no notice above the
     "Preprint" label line and the title (Rules 2a, 8).
   - **Not saved**: open the preprint's workflow at "Title & Abstract"
     and press "Relations": none of the three choices is ticked. Tick
     "This preprint has been published elsewhere." and type
     https://doi.org/10.1234/elsewhere in "DOI of the published
     preprint", without pressing "Save". Choose "Contributors" under the
     same version: its control region shows "Relations" too; press it:
     the choice and the address are still in the panel, with nothing
     marking them unsaved. Reload the page and press "Relations": none of
     the three choices is ticked (Rules 4, 5d).
   - **Saved on the posted preprint**: tick "This preprint has been
     published elsewhere." again, type
     https://doi.org/10.1234/elsewhere in the box and press "Save":
     "Saved" (Rule 5a).
   - **The visitor's page**: the visitor reloads the preprint's page: it
     now opens with a notice box, above the "Preprint" label line and
     the title, reading "This preprint has been published elsewhere." and,
     on a second line, "DOI of the published preprint" followed by
     https://doi.org/10.1234/elsewhere as a link to that address that
     opens in the same tab (Actors, "See the relation"; Rules 5a, 8).
   - **The Activity Log**: open the preprint's "Activity Log": it holds
     "Submission metadata updated" under the Preprint Server Manager's
     name (Side effects).
   - **The DOIs page**: open the DOIs page: the preprint's DOI still
     reads "Registered", not "Needs Sync"; reload: still "Registered"
     (Rule 11).
   - **No DOI**: back in "Relations", delete the address from the box,
     leaving it empty, and press "Save": "Saved". The visitor reloads:
     the notice reads "This preprint has been published elsewhere." alone,
     with no "DOI of the published preprint" line and no link (Fields;
     Rule 8).
   - **No mail**: neither the Author's nor the Preprint Server Manager's
     mailbox holds a message that arrived after the first save (Side
     effects).
   - **Control**: tick "This preprint has not been published
     elsewhere." and press "Save": "Saved". The visitor reloads: the page
     shows no notice (Rule 8). <sup>s0</sup>

3. **A Moderator's save, with and without the edit permission**

   Given: Moderator, assigned to two posted preprints, with the edit
   permission on the first and without it on the second, neither with a
   "Relation status" answered, and a visitor, signed out.

   - **With the edit permission**: open the first preprint's workflow at
     "Title & Abstract" and press "Relations": the panel opens with none
     of the three choices ticked. Tick "This preprint has been published
     elsewhere.", type https://doi.org/10.1234/moderated in "DOI of the
     published preprint" and press "Save": "Saved" (Actors, "Open" and
     "Save a relation"; Rule 5a).
   - **The visitor's first page**: the visitor opens the first
     preprint's page: the notice reads "This preprint has been published
     elsewhere." and "DOI of the published preprint" followed by
     https://doi.org/10.1234/moderated (Rule 8).
   - **The Activity Log**: open the first preprint's "Activity Log": it
     holds "Submission metadata updated" under the Moderator's name (Side
     effects).
   - **Without the edit permission**: open the second preprint's
     workflow at "Title & Abstract" and press "Relations". Tick "This
     preprint has been published elsewhere.", type
     https://doi.org/10.1234/refused in the box and press "Save": the
     save is refused and nothing is written ⚠ [A2](#a2). Reload the page
     and press "Relations": none of the three choices is ticked (Actors,
     "Save a relation"; Rule 5c).
   - **The visitor's second page**: the visitor opens the second
     preprint's page: no notice (Rule 8).
   - **Control**: the same save, on the first preprint, went through
     with "Saved" (Actors, "Save a relation"). <sup>s0</sup>

4. **Each answer before posting: the preview and "Post the preprint"**

   Given: Preprint Server Manager, on a submitted preprint not yet
   posted, whose "Relation status" nobody has answered.

   - **Never answered**: open the preprint's workflow at "Title &
     Abstract" and press "Relations": none of the three choices is
     ticked. Press "Post": the "Post the preprint" window's "Related
     Publication" table reads "This preprint's relations have not been
     entered."; press the window's "Close", not its "Post". Press
     "Preview": no relation notice follows the line "This is a preview
     and has not been published. View submission"; go back to the
     workflow (Rules 2a, 8, 9).
   - **"Not entered" saved**: in "Relations" tick "This preprint's
     relations have not been entered." and press "Save": "Saved". "Post":
     the line reads "This preprint's relations have not been entered.";
     press "Close". "Preview": no relation notice (Rules 2, 8, 9).
   - **Not published elsewhere**: tick "This preprint has not been
     published elsewhere." and press "Save": "Saved". "Post": the line
     reads "This preprint has not been published elsewhere."; press
     "Close". "Preview": no relation notice (Rules 8, 9).
   - **Published elsewhere, no DOI**: tick "This preprint has been
     published elsewhere.", leave "DOI of the published preprint" empty
     and press "Save": "Saved". "Post": the line reads "This preprint has
     been published, but no DOI is available yet."; press "Close".
     "Preview": under the preview line, the notice reads "This preprint
     has been published elsewhere." alone. Reload the workflow page and
     press "Relations": the box is empty (Fields; Rules 8, 9).
   - **Not a full web address**: type 10.1234/abcd in the box and press
     "Save": "This is not a valid URL." shows under the box, and below it
     "Please correct one error." with the buttons "Go to DOI of the
     published preprint: This is not a valid URL." and "Jump to next
     error"; the notice reads "The form was not saved because 1 error(s)
     were encountered. Please correct these errors and try again.", and
     "Save" is disabled ⚠ [A4](#a4). Reload the page and press
     "Relations": the box is empty (Fields; Rule 5b).
   - **Another web address**: type http://example.org/x in the box and
     press "Save": "Saved". "Post": the line reads "This preprint has
     been published.", the word "published" a link to
     http://example.org/x that opens in a new tab; press "Close".
     "Preview": the notice reads "This preprint has been published
     elsewhere." and "DOI of the published preprint" followed by
     http://example.org/x as a link (Fields; Rules 8, 9).
   - **Control**: after the last "Post the preprint" window is closed,
     "Preview" still opens with the line "This is a preview and has not
     been published. View submission" (Rule 8). <sup>s0</sup>

5. **The Review step reads the answer**

   Given: Author, on a draft of their own, at the submission wizard's
   "For Readers" step.

   - **Published elsewhere, with a DOI**: under "Relation status" tick
     "This preprint has been published elsewhere.", type
     https://doi.org/10.1234/abcd in "DOI of the published preprint" and
     press "Continue": the Review step's "Relation status" panel reads
     "This preprint has been published.", the word "published" a link to
     https://doi.org/10.1234/abcd that opens in a new tab (Rule 7).
   - **Published elsewhere, no DOI**: choose "For Readers" in the step
     rail, empty the "DOI of the published preprint" box, keep "This
     preprint has been published elsewhere." ticked and press "Continue":
     the panel reads "This preprint has been published elsewhere." (Rule
     7).
   - **"Not entered"**: choose "For Readers" in the step rail, tick "This
     preprint's relations have not been entered." and press "Continue":
     the panel reads "This preprint's relations have not been entered."
     (Rule 7).
   - **Not published elsewhere**: choose "For Readers" in the step rail,
     tick "This preprint has not been published elsewhere." and press
     "Continue": the panel reads "This preprint has not been published
     elsewhere." (Rule 7).
   - **Control**: the line for "This preprint has been published
     elsewhere." without a DOI carries no link (Rule 7). <sup>s0</sup>

6. **Each version keeps its own relation**

   Given: Preprint Server Manager, on a posted preprint whose version
   holds "This preprint has been published elsewhere." with
   https://doi.org/10.1234/elsewhere, and a visitor, signed out.

   - **A new version**: in the workflow's side menu press "Create New
     Version", then "Confirm". Open the new version's "Title & Abstract"
     and press "Relations": "This preprint has been published elsewhere."
     is ticked and the box holds https://doi.org/10.1234/elsewhere (Rule
     1a).
   - **The new version's own answer**: tick "This preprint has not been
     published elsewhere." and press "Save": "Saved" (Rules 1, 5a).
   - **The first version**: in the "Preprint" group choose the first
     version's "Title & Abstract" and press "Relations": "This preprint
     has been published elsewhere." is still ticked, with
     https://doi.org/10.1234/elsewhere (Rules 1, 1a).
   - **Posting the new version**: choose the new version and press
     "Post": the "Related Publication" line reads "This preprint has not
     been published elsewhere.". Press the window's "Post" (Rule 9).
   - **The first version's page**: the visitor opens it: under the
     older-version notice, the notice reads "This preprint has been
     published elsewhere." and "DOI of the published preprint" followed by
     https://doi.org/10.1234/elsewhere, above the "Preprint" label line
     and the title (Rules 1, 8).
   - **Control**: the preprint's page, now showing the new version, has
     no relation notice, nor has the same page at the new version's
     address (Rule 8; *[Article landing page &
     reading](U13-article-landing-page-and-reading.md)*, Rule 2).
     <sup>s0</sup>

7. **No preprint relations on a journal or a press** {OJS OMP}

   Given: Journal Manager (Press Manager), with a published article (a
   published book), an Author with a draft of their own, and a visitor,
   signed out, on the seeded journal (the seeded press).

   - **The publication pages**: the Journal Manager opens the published
     article's workflow at "Title & Abstract": the control region above
     the page has no "Relations" button (Purpose, the absence paragraph).
   - **The wizard**: the Author opens the draft's wizard and presses
     "Continue" on each step up to "Review": no step asks "Relation
     status" (Purpose, the absence paragraph).
   - **The article page**: the visitor opens the published article's
     page (the book's page): no notice says it has been published
     elsewhere (Purpose, the absence paragraph).
   - **Control**: on the seeded preprint server, the same three reads
     find the "Relations" button (scenario 2), the "Relation status"
     question on "For Readers" (scenario 5) and the notice on the
     preprint page (scenario 2) (Fields; Rules 4, 8). <sup>s0</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A11 (issue report `docs/issues/U75-A11-review-panel-edit-stays-on-review.md`): on a preprint server, the Review step's "Relation status" and "License" panels' "Edit" opens "For Readers".
- **Nothing new to test**:
  - the Site Administrator opening "Relations" and saving a relation on
    any version (Actors, "Open" and "Save a relation"): the Preprint
    Server Manager's panel and save of scenarios 2 and 4
  - the assigned Moderator's "Preview" of a version not yet posted
    (Actors, "See the relation"): the Preprint Server Manager's preview of
    scenarios 1 and 4
- **Register carries it**:
  - A1 (the Author's save refused on a "Posted" or "Scheduled" version;
    Actors, "Save a relation")
  - A2 (the active "Save" and the unexpected-error notice for someone
    the edit gate refuses; Rules 5c, 6; scenario 3 passes it)
  - A3 (another status saved keeping the DOI; Rule 3)
  - A4 (a DOI written on its own refused; Fields; scenario 4 passes it)
  - A5 (the wizard's description asking about "submitted for publication
    elsewhere"; Fields)
  - A6 (the deposited record's text, the full address marked as a DOI;
    Rule 10)
  - A7 (a DOI written on its own on the wizard's "For Readers" step;
    Fields)
  - A8 (a preprint submitted with "Relation status" unanswered; Rule 2;
    Fields)
  - A9 (the Review step's line for a question never answered; Rule 7)
  - A10 ("For Readers" after a reload showing no saved answer ticked;
    Rule 2b)
  - A11 (the Review step's "Edit" on the "Relation status" panel; Rule 7)
- **No seed**:
  - "Registration Agency" at "Crossref": the deposited record carrying
    the relation (Settings bullet 2; Rule 10): no deposit or export
    reaches Crossref from a test install, so no screen shows the record
- **Owned by another feature**:
  - the wizard's "Relation status" question on "For Readers" and its
    required mark (Actors, "Answer 'Relation status' while submitting";
    Fields; *[Submission wizard](U21-submission-wizard.md)*, scenario 15)
  - the assigned Moderator offered no "Post" (Rule 9;
    *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*,
    scenario 8)
  - the Editorial Board Member and the Reader, who reach no publication
    page (Actors, "Open 'Relations'";
    *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*,
    scenario 11)
  - "Permit submission metadata edit." unticked on the Author role
    (Settings bullet 1; *[Roles configuration](U54-roles-configuration.md)*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | An Author cannot record that their posted preprint has been published elsewhere | 🐞 | user-visible | — |
| [A2](#a2) | "Relations" offers an active "Save" to someone who may not edit the version, and refuses it with an unexpected-error notice | 🐞 | minor | — |
| [A3](#a3) | Saving another status keeps the DOI of the published version | 🐞 | invisible | — |
| [A7](#a7) | A DOI written on its own on the wizard's "For Readers" step ends in an unexpected-error window | 🐞 | medium · crash: script | issues (claude), 2026-10-03 — re-verified |
| [A8](#a8) | A preprint can be submitted without answering the required "Relation status" | 🐞 | minor | — |
| [A9](#a9) | The Review step says "This preprint has not been published elsewhere." for a question never answered | 🐞 | minor | — |
| [A10](#a10) | After a reload, the wizard's "For Readers" shows the saved relation unticked, and answering again erases the DOI | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A11](#a11) | The Review step's "Edit" on the "Relation status" panel does nothing | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A4](#a4) | "DOI of the published preprint" refuses a DOI written on its own | ❓ | minor | — |
| [A5](#a5) | The wizard asks whether the preprint was "submitted for publication elsewhere" but offers no answer for it | ❓ | minor | — |
| [A6](#a6) | Crossref receives the full web address marked as a DOI | ❓ | invisible | — |

### All apps

<a id="a1"></a>
**A1 — An Author cannot record that their posted preprint has been published elsewhere** · 🐞 · user-visible.
The Author opens "Relations" on their "Posted" (or "Scheduled") preprint,
ticks "This preprint has been published elsewhere.", types the DOI and
presses "Save": the notice reads "An unexpected error has occurred.
Please reload the page and try again." ([A2](#a2)), a reload shows the
earlier relation, and the preprint page shows no relation notice.
Only a Preprint Server Manager, the Site
Administrator or an assigned Moderator with the edit permission can add
it; the Author is not offered
"Create New Version" either
([→ who may publish](U49-publish-schedule-and-versions.md#a2)). The
Author is the person who learns that the preprint has been published,
and the author's screens used before 2024 let them record it after
posting; the 2024 workflow saves the relation like the rest of the
publication, which is closed to Authors once posted.
Since: 2024-11-06 · Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Relations" offers an active "Save" to someone who may not edit the version, and refuses it with an unexpected-error notice** · 🐞 · minor.
On a version whose other publication pages show this person a disabled
"Save" (a Moderator or Author without the edit permission, an Author on
a "Posted" or "Scheduled" version), the "Relations" panel shows its choices
and "Save" active. Pressing "Save" shows the notice "An unexpected error
has occurred. Please reload the page and try again.": nothing is
written, a reload shows the earlier relation, and a second try fails the
same way. The person learns only after trying that the control was
never theirs, and the notice never says that they may not edit this
version.
Since: 2024-11-06 · Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Saving another status keeps the DOI of the published version** · 🐞 · invisible.
A version marked "This preprint has been published elsewhere." with a
DOI is switched to "This preprint has not been published elsewhere."
(or to "…relations have not been entered.") and saved. The notice leaves
the preprint page, but the DOI stays saved: the box shows it again, after
a reload too, when "published elsewhere" is ticked.
Read from the code (no screen shows the record): every later deposit to Crossref keeps naming that work as the published version.
The preprint meanwhile says it has not been published elsewhere. Before
2024 the screens saved the relation through a separate address of the
install's programming interface, which they no longer call.
Since: 2024-11-06 · Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "DOI of the published preprint" refuses a DOI written on its own** · ❓ · minor.
The box asks for a DOI, but typing one as DOIs are usually written,
"10.1234/abcd", is refused with "This is not a valid URL.", and so are
"doi.org/10.1234/abcd" and "doi:10.1234/abcd". Only a full web address,
such as "https://doi.org/10.1234/abcd", is accepted, and neither the label nor
a help text says so. On the wizard's "For Readers" step the same value
ends in an error window ([A7](#a7)).
Question: should the box accept a DOI on its own, or at least say that
it needs the full address?
Lean: accept both and keep the full address, since the preprint page
makes the value a link; failing that, add a help text with an example.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The wizard asks whether the preprint was "submitted for publication elsewhere" but offers no answer for it** · ❓ · minor.
The "For Readers" step describes the question as "Please indicate if
this preprint has been published or submitted for publication
elsewhere.", yet the three choices cover only "not entered", "not
published elsewhere" and "published elsewhere". An Author whose
preprint is under review at a journal has no matching answer; the
nearest is "This preprint has not been published elsewhere.". The
"submitted" answer was removed in 2022, a month before this text was
written.
Question: should the description drop "or submitted", or should a
"submitted" answer come back?
Lean: drop "or submitted": the answer was removed on purpose and its
saved values were turned into "not published elsewhere".
Since: 2022-10-19 · Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Crossref receives the full web address marked as a DOI** · ❓ · invisible.
The box takes only a full web address (A4), and the deposit sends that
text unchanged as the DOI of the published version
("https://doi.org/10.1234/abcd" where Crossref's DOI relations carry
"10.1234/abcd"). Whether Crossref accepts, rewrites or ignores such a
relation cannot be seen from the install.
Question: should the deposit send the DOI on its own, taken from the
saved address?
Lean: yes; Crossref links records by DOI, and the rest of the record
writes DOIs without the address part.
Basis: code. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A DOI written on its own on the wizard's "For Readers" step ends in an unexpected-error window** · 🐞 · medium · crash: script.
On "For Readers" the Author ticks "This preprint has been published
elsewhere.", types "10.1234/abcd" in "DOI of the published preprint" and
presses "Continue". The server refuses the answer, but the wizard moves
on to "Review" and opens a window "Error" that reads only "An unexpected
error has occurred. Please reload the page and try again."; the footer
stays on "Saving" and the page logs "Cannot read properties of undefined
(reading 'url')", the hang after any refused save
([→ the Submission wizard's A19](U21-submission-wizard.md#a19)). Back on
"For Readers" the step still shows the ticked answer and the typed DOI
with no message under the box, so the Author is never told that the box
needs a full web address ([A4](#a4)). Neither is saved: after the reload
the window asks for, "Review" reads "This preprint has not been
published elsewhere." and "Submit" completes the submission with no
relation at all.
Basis: probe, 2026-10-03. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A preprint can be submitted without answering the required "Relation status"** · 🐞 · minor.
"For Readers" marks the question "Relation status * Required", but with
no choice picked the Review step flags nothing and "Submit" completes the
submission ("Submission complete"). The preprint then holds no relation
status (Rule 2): its "Relations" opens with no choice ticked, and its
"Post the preprint" window reads "This preprint's relations have not
been entered.".
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The Review step says "This preprint has not been published elsewhere." for a question never answered** · 🐞 · minor.
On a draft whose "Relation status" nobody has answered, the Review
step's "Relation status" panel reads "This preprint has not been
published elsewhere.", an answer the Author never gave. The same
preprint's "Post the preprint" window reads "This preprint's relations
have not been entered.", and its "Relations" shows no choice ticked.
The panel should say "This preprint's relations have not been
entered.", or show the question as unanswered.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — After a reload, the wizard's "For Readers" shows the saved relation unticked, and answering again erases the DOI** · 🐞 · medium.
An Author answers "Relation status" on the submission wizard's "For
Readers" step, for instance "This preprint has been published
elsewhere." with the published version's DOI, and the answer is saved.
When the wizard page is loaded afresh, by a reload or by opening the
draft again later, "For Readers" shows none of the choices ticked and no
DOI box. Moving between steps without a new page load ("Back" from
Review) keeps the answer on screen. The Review step still shows the
saved answer. Left unticked, the question keeps the saved answer. An
Author who answers it again gets an empty DOI box, which looks like a
DOI never typed, and "Continue" saves it empty over the stored DOI.
Nothing says a DOI was there.
Basis: probe, 2026-10-03. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The Review step's "Edit" on the "Relation status" panel does nothing** · 🐞 · low.
On the wizard's Review step, pressing "Edit" on the "Relation status"
panel leaves the wizard on "Review" with no message, and so does the
"License" panel's "Edit"
([→ the Review step](U21-submission-wizard.md#review-step)); a press's
"Chapters" panel is dead the same way
([→ Chapters](U72-chapters-work-type.md#a5)). Both fields are on "For
Readers", which the Author reaches through the wizard's list of steps at
the top or the "For Readers" panel's "Edit". Since a 2026 change to the
template hooks, a template fetched from a hook no longer sees the
calling template's step, so these panels' "Edit" names none.
Basis: probe, 2026-10-03. <sup>f-a11</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Code read 2026-09-27 (checkouts ops `e2111e3aae`, lib/pkp
`17a1f01fed`, ui-library `03d1cee2`). The form: ops
`classes/components/forms/publication/RelationForm.php` (`FORM_ID_RELATION`
`relation`, method `PUT`), fields `relationStatus` (`FieldOptions`, radio,
`Publication::PUBLICATION_RELATION_UNKNOWN` 0, `_NONE` 1, `_PUBLISHED` 3)
and `vorDoi` (`FieldText`, `showWhen ['relationStatus', 3]`); schema
ops `schemas/publication.json` (`relationStatus` integer, default 0,
`in:0,1,2,3`; `vorDoi` string, `nullable`, `url`). The control:
ui-library `src/pages/workflow/components/publication/WorkflowPublicationRelationDropdownOPS.vue`,
mounted by `workflowConfigEditorialOPS.js` and `workflowConfigAuthorOPS.js`
(`PublicationConfig.common.getPrimaryControlsLeft`), registered only in
`WorkflowPageOPS.vue`; its form config comes from ops
`APP\pages\dashboard\DashboardHandler::setupIndex()`
(`pageInitConfig.componentForms.relationForm`). The wizard: ops
`APP\pages\submission\SubmissionHandler::getEditorsStep()` and
`templates/submission/review-relation.tpl`. The preprint page:
`templates/frontend/objects/preprint_details.tpl`, whose comment gives
the reason ("Crossref requirements: The landing page must link to the
AM/VOR when it is made available."). The "Post the preprint" window:
ops `APP\components\forms\publication\PublishForm`. Crossref:
`plugins/generic/crossref/filter/PreprintCrossrefXmlFilter.php`.
Live-probed 2026-09-27 (Purpose) on OPS scratch servers with throwaway
accounts: the "Relations" control, its two fields, the wizard's
question and the reader's notice as the notes below record.

<a id="fn-b"></a>
**b** — Code read 2026-09-27: neither `relationStatus` nor `vorDoi` is in
ojs or omp `schemas/publication.json`, `classes/`, `templates/`, `pages/`
or `api/`, nor in their lib/pkp; their ui-library copies carry
`WorkflowPageOPS.vue` but only OPS mounts it. Live-probed 2026-09-27
(absence paragraph) on an OJS and an OMP scratch context, OPS as the
positive control: the Author's wizard rail read "Upload Files, Details,
Contributors, For the Editors, Review", "For the Editors" held no
"Relation status" question and no "published elsewhere" text, and the
Review panels were Files, Details, Chapters (OMP), Contributors and For
the Editors. The Journal Manager's and Press Manager's "Title &
Abstract" of a submitted and of a published item carried no "Relations"
(the region read "Status: Unscheduled" or "Status: Published", with
"Schedule For Publication" / "Unpublish" on OJS and "Publish" /
"Unpublish" on OMP). Signed out, the article page and the book page
carried no notice. The absence test pairs each negative with the OPS
positive (PRINCIPLES M4).

<a id="fn-h"></a>
**h** — `preprint_details.tpl`: `{if $publication->getData('relationStatus')
== \APP\publication\Publication::PUBLICATION_RELATION_PUBLISHED}` opens a
`cmp_notification notice` with `publication.relation.published` ("This
preprint has been published elsewhere.") and, `{if $publication->getData('vorDoi')}`,
`<br />`, `publication.relation.vorDoi` ("DOI of the published preprint")
and `<a href="{vorDoi|escape}">{vorDoi|escape}</a>` (no `target`). It
sits after the preview notice (`submission.viewingPreview`, shown while
the version is not published) and the older-version notice
(`submission.outdatedVersion`), before `preprint_label`
(`common.publication`, ops "Preprint") and `h1.page_title`. `$publication`
is the version the page displays (`preprint/view/{id}` or
`…/version/{publicationId}`). Live-probed 2026-09-25 by the Article
landing page spec: the notice read "This preprint has been published
elsewhere. DOI of the published preprint https://doi.org/10.1234/elsewhere"
above the label line. Live-probed 2026-09-27 (Actors "See the
relation"; Rule 8): td7. On "Preview" of an unposted version: the
Preprint Server Manager is offered it in the header and in the control
region, the assigned Moderator in the header; the Author's workflow
offers none; it opens in the same tab ("This is a preview and has not
been published. View submission", then the relation notice, "Preprint"
and the title), with two lines when a DOI is saved, one without, and no
relation notice for "not published elsewhere" or a preprint with no
status. Signed out, an unposted preprint's page answered "404 Not
Found".

<a id="fn-c"></a>
**c** — The control's action is set in the component's `watch` to
`submissions/{submissionId}/publications/{id}` (`useUrl`), so "Save" is a
`PUT` (sent as `POST` with `X-Http-Method-Override: PUT`) to
`PKPSubmissionController::editPublication()`, which is in
`requiresPublicationWriteAccess`: `PublicationWritePolicy`
(`PublicationAccessPolicy`, `StageRolePolicy` for sub-editor, assistant
and author, `PublicationCanBeEditedPolicy` with message
`api.submissions.403.userCantEdit` "You are not allowed to edit this
publication."). `Repo::submission()->canEditPublication($publication,
$user)`: a manager (`_canUserAccessUnassignedSubmissions()`) passes; a
publication in `STATUS_PUBLISHED` or `STATUS_SCHEDULED` refuses a user
whose assignments are all Author ones; otherwise an assignment with
`canChangeMetadata` passes; the Site Administrator passes in the policy
itself. The per-publication reading is lib/pkp `18f402e585`
(pkp-lib#13109, 2026-09-01). A refused save answers 401 with
`errorMessage` "You are not allowed to edit this publication.", but
`Form.vue::error()` shows `errorMessage` only for a 403 or 404 and
otherwise `common.unknownError` ("An unexpected error has occurred.
Please reload the page and try again."). The panel's
`RelationForm` is built once per page in `DashboardHandler` for every
viewer, with no read-only switch, and the component reads neither
`permissions.canEditPublication` nor `publication.canCurrentUserChangeMetadata`.
The Editorial Board Member has no stage (users.md). Live-probed
2026-09-27 (Actors "Open 'Relations'"): the unassigned Preprint Server
Manager and the Site Administrator opened "Relations" on every preprint,
the assigned Moderator and the submitting Author on theirs; an
unassigned Moderator, an Editorial Board Member and another Author who
typed the workflow's address got a window "Error" reading "The current
role does not have access to this operation." and no "Relations", and a
Reader landed on a page reading the same. The refusals: td1, td2, td9.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (Actors "Save a relation"; Rule 5c;
A1), OPS scratch server: the submitting Author ticked "This preprint
has been published elsewhere.", typed "https://doi.org/10.1234/elsewhere"
and pressed "Save" on a posted preprint ("Status: Posted") and on two
scheduled ones ("Status: Scheduled"). Each save answered 401; the notice
read "An unexpected error has occurred. Please reload the page and try
again."; the panel kept the choice; a reload showed the earlier value,
and the posted preprint's page showed no relation notice. Control: the
same Author on an unposted preprint of theirs saw "Saved", kept after a
reload. Accepted likewise: the Preprint Server Manager on the posted and
on a scheduled preprint, the Site Administrator on the posted one, and
the assigned Moderator with the edit permission on a posted and an
unposted one.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Actors "Save a relation"; Rules 5c,
6; A2): the Edit Assignment "Permissions" box started ticked for a
seeded Moderator and for the submitting Author. A Moderator seeded
without it on an unposted preprint, the same Moderator after the
Preprint Server Manager unticked it in a posted preprint's Participants
("Edit", untick "Permissions", "OK"), and an Author whose box was
unticked the same way on an unposted preprint: each found "Title &
Abstract"'s "Save" disabled, the "Relations" panel's choices and "Save"
active, and a save refused as in td1, the reload showing the earlier
value. Control: a Moderator with the box ticked, "Saved".

<a id="fn-d"></a>
**d** — Labels (ops `locale/en/submission.po`): `publication.relation.label`
"Relation status", `publication.relation.unknown` "This preprint's
relations have not been entered.", `publication.relation.none` "This
preprint has not been published elsewhere.", `publication.relation.published`
"This preprint has been published elsewhere.", `publication.relation.vorDoi`
"DOI of the published preprint", `publication.relation.description`
"Please indicate if this preprint has been published or submitted for
publication elsewhere." (wizard section description only). The wizard:
`getEditorsStep()` sets `$relationForm->fields[0]->isRequired = true` and
passes the publication as a second argument the constructor does not
take, so the radio's value starts `null` whatever is stored (A10). The
schema's default of 0 is not what a new preprint stores: one seeded
through the scenario API (draft, unposted or posted) and one started or
submitted in the wizard without an answer held `relationStatus` null
(read 2026-09-27). Validation:
`Repo::publication()->validate()` with the schema rule `url` (Laravel
`Str::isUrl()`, a scheme is required), message `validator.url` "This is
not a valid URL."; an empty string skips the rule and is stored as
null. `relationStatus` has the override `validation.invalidOption`,
which nothing on screen can send. The notice: `form.errors` "The form
was not saved because {$count} error(s) were encountered. Please
correct these errors and try again." (`Form.vue::error()`, status 400).
"Save": `FormComponent` default page, `common.save`. Live-probed
2026-09-27 (Fields; Rules 2, 2a, 2b): the three choices in this order,
the same in "Relations" and on "For Readers", unmarked in "Relations"
and headed "Relation status * Required" on the wizard step under the
description. The seeded preprints' "Relations" showed no choice ticked
(td4 for the wizard).

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Fields "DOI of the published
preprint"; Rule 5b; A4), as the Preprint Server Manager on an unposted
preprint: "10.1234/abcd", "doi.org/10.1234/abcd" and "doi:10.1234/abcd"
were each refused (400) with "This is not a valid URL." under the box,
the notice "The form was not saved because 1 error(s) were encountered.
Please correct these errors and try again.", "Please correct one error."
with the buttons "Go to DOI of the published preprint: This is not a
valid URL." and "Jump to next error", and "Save" disabled; a reload
showed the stored value unchanged. "https://doi.org/10.1234/abcd" and
"http://example.org/x" were each accepted and shown again after a
reload; an empty box was accepted and reopened empty. The box carried a
label and no description.

<a id="fn-g"></a>
**g** — `review-relation.tpl`, fetched on the hook
`Template::SubmissionWizard::Section::Review` for the step `editors`
(titled "For Readers" on OPS) after `review-license.tpl`: heading
`publication.relation.label`, `pkp-button` `common.edit` ("Edit") with
`openStep('{$step.id}')`; branches `publication.relationStatus === 3`
with `vorDoi` → state `i18nRelationWithLink`
(`publication.publish.relationStatus.published`, "This preprint has been
<a href='{$vorDoi}' target='_blank'>published</a>.", placeholder filled
by `replaceLocaleParams`), without `vorDoi` →
`publication.relation.published`; `== 0` → `publication.relation.unknown`;
otherwise `publication.relation.none`, which a stored null reaches (A9).
Live-probed 2026-09-27 (Actors "Answer"; Rule 7): each line as listed,
the "published" link opening a new tab on the saved address; in the
served page both the "Relation status" and the "License" panel's "Edit"
were bound to `openStep('')` and left the wizard on "5 Review" at
`#review` on five runs over two drafts, while the "For Readers" panel's
"Edit" went to "4 For Readers" (A11). A draft submitted with the
question unanswered: the Review step's check answered with no problem,
"Submit" was enabled and "Submission complete" followed (A8).

<a id="fn-e"></a>
**e** — `relationStatus` and `vorDoi` are publication (version)
properties. `PKP\publication\Repository::version()` clones the
publication and resets the id, source, date published, status, DOI (when
DOIs are versioned) and citations, not these two. The component takes the
workflow's `selectedPublication` as `publication` and fills the form and
its action from it. Live-probed 2026-09-27 (Rules 1, 1a): td5.
"Relations" followed the version chosen in the side menu without a
reload: on the second version's pages it showed and saved that
version's relation, and after the first version's "Title & Abstract"
was opened inside its own tree item it showed and saved the first
version's; reloads agreed.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rule 1a), as the Preprint Server
Manager on a posted preprint whose version was "This preprint has been
published elsewhere." with "https://doi.org/10.1234/elsewhere": after
"Create New Version" and "Confirm", the new version's "Relations"
showed the same choice and address, right after and when opened by
address. Saving "This preprint has not been published elsewhere." there
left the first version's "Relations" as it was, and the first version's
page, signed out, kept the notice.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Rules 2, 2a, 2b; A8, A9, A10), as the
Author of a seeded draft and of two drafts started on screen: "For
Readers" showed no choice ticked, and "Review" untouched read "This
preprint has not been published elsewhere."; the preprint stored no
status. Each saved answer then read as Rule 7 lists. After a reload,
"For Readers" showed no choice ticked whatever was saved, while
"Review" read the saved answer and "Continue" sent no save (two runs).
Submitted unanswered, the preprint's "Relations" showed no choice
ticked for the Preprint Server Manager, and its "Post the preprint"
window read "This preprint's relations have not been entered.".

<a id="fn-f"></a>
**f** — The component: `Dropdown` with `has-dropdown-icon` and
`:label="t('publication.relation')"` ("Relations", ops
`locale/en/submission.po`, listed in `registry/uiLocaleKeysBackend.json`),
holding `PkpForm v-bind="relationForm"`; `watch(props.publication, …,
{immediate: true})` sets both values and the action. `Form.vue`
`submitValues` sends every field that is not `isInert`, one hidden by
`showWhen` included, so `vorDoi` goes with every save, and
`editPublication()` stores it as sent; the screens no longer call the
older relation address (ops `relatePublication()`, `Repo::publication()->relate()`;
the Reference table). `success()` refills the fields from the answer, sets
`lastSaveTimestamp` ("Saved", `form.saved`, shown by `FormPage.vue` for
5 seconds) and calls the injected `markDataChanged`. `editPublication()`
refuses only a `status` outside the pre-publish statuses, so a posted
version's relation is written in place; the preprint page reads the
stored publication. The form's values live in the page until it is
reloaded, which is why an unsaved choice survives closing the panel
(Rule 5d). Live-probed 2026-09-27 (Rules 4, 5, 5a, 5d): "Status: …"
then "Relations" with its arrow on all nine pages of a version for the
Preprint Server Manager, and on the Author's pages; none on the
Production stage page; the panel opened under the button. A save was
one request carrying `relationStatus` and `vorDoi`, the hidden box
included; "Saved" showed and was gone 6 seconds later, the panel open
with the saved values; on a posted preprint the signed-out page showed
the new notice at once, the versions still read "Author Original 1.0"
and the Activity Log gained no posting line. An unsaved choice and
address stayed when the panel was closed and opened again and on
"Contributors", with no question or mark, and were gone after going to
another address and back. td6 for Rule 3.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Rule 3; A3), as the Preprint Server
Manager on an unposted preprint saved "This preprint has been published
elsewhere." with "https://doi.org/10.1234/elsewhere": ticking "This
preprint has not been published elsewhere." hid the box; "Save" sent
the address with the new status and stored it. After a reload, ticking
"This preprint has been published elsewhere." again showed the box
holding the address; the same after saving "…relations have not been
entered.". The "Preview" then showed no relation notice, and the "Post
the preprint" window read "This preprint's relations have not been
entered.".

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 8), signed out: a posted preprint
"published elsewhere" with "https://doi.org/10.1234/elsewhere" opened
with one notice box of two lines, then "Preprint", then the title; the
link's address was the saved text, with no `target`, and pressing it
went there in the same tab. Without a DOI: the one line, no link. A
second version saved "This preprint has not been published elsewhere."
and posted: the first version's address read "This is an outdated
version published on 2026-09-27. Read the most recent version.", then
the relation notice, "Preprint" and the title (the same signed in as
the Author); the second version's address and the preprint's own
address showed no relation notice. "Not entered", saved or never
answered, and "not published elsewhere" showed no notice.

<a id="fn-i"></a>
**i** — ops `PublishForm` builds `FieldHTML('relationStatus')` with a
`pkpTable` headed `publication.publish.relationStatus` "Related
Publication": published with `vorDoi` →
`publication.publish.relationStatus.published` with `vorDoi` filled
("This preprint has been <a href='…' target='_blank'>published</a>.");
published without → `publication.publish.relationStatus.published.noDoi`
"This preprint has been published, but no DOI is available yet.";
unknown (a stored null included) → `publication.relation.unknown`;
otherwise `publication.publish.relationStatus.none` "This preprint has
not been published elsewhere.". Live-probed 2026-09-27 (Rule 9): td8;
the assigned Moderator's control region held "Relations" and no "Post".

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 9), as the Preprint Server
Manager on four unposted preprints, each window closed with its
"Close": "published elsewhere" with the address read "This preprint has
been published." ("published" linking to the address, opening a new
tab); without a DOI, "This preprint has been published, but no DOI is
available yet."; "not published elsewhere", "This preprint has not been
published elsewhere."; never answered, and "not entered" saved, "This
preprint's relations have not been entered.". Each preprint read
"Status: Unposted" after "Close". A second version's window named
"Author Original 1.1" and read that version's own relation.

<a id="fn-j"></a>
**j** — `PreprintCrossrefXmlFilter::createDocument()` writes one
`posted_content` per publication that has a DOI and `STATUS_PUBLISHED`,
newest first. `createPostedContentNode()` takes `$vorDoi =
$publication->getData('vorDoi')` without looking at `relationStatus`;
`appendRelationships()` adds `rel:program name="relations"` holding, from
`createVorDoiNode()`, `rel:related_item/rel:intra_work_relation
relationship-type="isPreprintOf" identifier-type="doi"` with the stored
text, beside `createParentDoiNode()` (`isVersionOf`, the current
version's DOI from `getDoi()`, bare) and the data citations. Code read
only: a deposit cannot reach Crossref from the test installs
(seed-facts), and on 2026-09-27 "Export DOIs" on a posted version with a
relation and on one without both answered 400 ("An XML validation error
occurred and the XML could not be exported.") with nothing on screen
(the DOIs spec's A13), so the record is not observable there.

<a id="fn-k"></a>
**k** — No listener of `Publication::edit` or `MetadataChanged` touches a
DOI's status: `MetadataChanged` feeds only
`UpdateSubmissionInSearchIndex`, and `Repo::doi()->markStale()` is
called only from the publish and unpublish paths of
`PKP\publication\Repository`. Live-probed 2026-09-27 (Rule 11) on a
scratch server with "Crossref" as its agency: a posted preprint's DOI
set to "Registered" with Bulk Actions › "Mark DOIs Registered", then
"Relations" saved "published elsewhere" with the address ("Saved"): the
DOIs page still read "Registered", right after and after a reload.
Control: "Unpost" made the row "Unpublished" and "Post" again made it
"Needs Sync".

<a id="fn-l"></a>
**l** — `PKP\publication\Repository::edit()` adds an event-log entry
(`SUBMISSION_LOG_METADATA_UPDATE`, `submission.event.general.metadataUpdated`
"Submission metadata updated") under the signed-in user (the
impersonating user during "Login As"). `editPublication()` sends no
mailable and creates no notification. Live-probed 2026-09-27 (Side
effects): each accepted save added "Submission metadata updated" under
the saver's name (the Preprint Server Manager, the Moderator, the Site
Administrator and the Author; six saves, six lines); a refused save
added none. The mail catcher held no message from the saves, while the
same search found the accounts' version, posting and submission mail,
and the Author's "Tasks" held only the posting items.

<a id="fn-m"></a>
**m** — ops `registry/userGroups.xml`: `permitMetadataEdit="true"` on the
manager, sectionEditor (Moderator) and author groups; lib/pkp
`PKP\stageAssignment\Repository::build()` takes `canChangeMetadata` from
the group's `permitMetadataEdit` when none is given, and the Roles
configuration spec (its Rule 19) has the option rewrite existing
assignments. Registration agency and DOI defaults: the DOIs spec; every
agency plugin is off and DOIs are on on the seeded and scratch contexts
(seed-facts). Live-probed 2026-09-27 (Settings): a new server's Author
and Moderator rows arrived ticked (OJS's and OMP's Author row
unticked); td9. With install defaults, Settings › Distribution › "DOIs"
› "Registration" read "No Registration Agency Enabled" and "Setup" had
the DOI box and "Preprints" ticked; a server with the Crossref plugin
on offered "None" and "Crossref" under "Registration Agency".

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Settings bullet 1), on a scratch
preprint server as the Preprint Server Manager: "Permit submission
metadata edit." unticked on the Author role ("OK"): the Author's save on
an unposted preprint was refused as in td1, the reload showing it
unchanged, and "Title & Abstract"'s "Save" was disabled; ticked again,
the save was accepted. The same with the Moderator role and an assigned
Moderator.

<a id="fn-s0"></a>
**s0** — Where each scenario runs. Scenarios 1 and 3 to 6 run on OPS
`publicknowledge` with roster accounts, passwords as
`docs/process/users.md` gives them: the Author `author.alex`, the
Preprint Server Manager `manager.maya`, the Moderator
`sectioneditor.omar` (assigned to no section there); the visitor is a
browser with no session. Each
scenario seeds its own preprints through `POST scenarios/submission`
with `submitter: 'author.alex'`: submitted and unposted (the default) in
scenarios 1 and 4; `published: true` in scenarios 3 and 6; `submitted:
false` for scenario 5's draft, which opens the wizard on "1 Upload
Files", from where the test presses "Continue" to "4 For Readers".
Scenario 3's first preprint carries `participants: [{username:
'sectioneditor.omar', role: 'sectionEditor'}]` (the edit permission from
the role's default), its second the same with `canChangeMetadata:
false`. Not `sectioneditor.ana`: she moderates the server's "Preprints"
section, so submitting a preprint assigns her with the role's default
permission, and a second `participants[]` entry for the same user and
role keeps that row and drops `canChangeMetadata: false`; a run with
her on 2026-09-27 had the second preprint's save answer 200, show
"Saving" and, in a probe of the same seed, "Saved" with a "Submission
metadata updated" line under her name. Test run 2026-09-27 with
`sectioneditor.omar`: the second preprint's save was refused (not
200), no "Saved" showed, and after a reload "Relations" showed no
choice ticked. A seeded preprint's Activity Log already holds
"Submission metadata updated" lines under its submitter's name before
any save (read 2026-09-27), which is why scenario 1 counts the lines
before the Author's save.
Scenario 2 runs on a scratch server from `POST scenarios/context` with
throwaway `users[]` `manager` and `author` (password: the username
twice), `doiPrefix: '10.1234'`, `plugins: {crossrefplugin: {enabled:
true, settings: {depositorName, depositorEmail}}}` and
`registrationAgency: 'crossrefplugin'`; its preprint, seeded
`published: true` with the scratch Author as `submitter`, carries the
DOI those settings make, and the test marks that DOI "Registered" with
the DOIs page's Bulk Actions › "Mark DOIs Registered" before the
scenario starts (note k); the mail catcher is Mailpit at `MAILPIT_URL`
(default `http://127.0.0.1:8025`), scoped by the scratch accounts'
addresses. No key seeds a relation, and a seeded preprint holds no
status at all (Rule 2): scenario 6's starting relation is saved through
"Relations" before the scenario starts, as the Preprint Server Manager.
A version's own page (scenario 6) is
`{server}/preprint/view/{id}/version/{publicationId}`. Scenario 7 runs
on OJS and OMP `publicknowledge`: `manager.maya` (the Journal Manager,
the Press Manager), `author.alex` with a `submitted: false` draft, a
`published: true` item (a journal's without `issue`, published at once)
and a browser with no session; its positive controls are scenarios 2
and 5 on OPS (PRINCIPLES M4). No scenario opens the start page
`/submission` with a roster account on OPS (seed facts).

<a id="fn-f-a1"></a>
**f-a1** — Note c and td1. The author's page used before 2024 (ops
`AuthorDashboardHandler::setupTemplate()`) carried a relation form of
its own; that page now redirects to the dashboard
(`PKPAuthorDashboardHandler::submission()`). The Vue control posting to
the plain publication route came with ui-library `e88d2d20`
"pkp/pkp-lib#7495 initial adjustments for new submission listing &
workflow for OPS" (2024-11-06); stable-3_5_0 has the same component and
action, where publishing also cleared the Author's `canChangeMetadata`
(removed by lib/pkp `18f402e585`, 2026-09-01). Live-probed 2026-09-27:
"Create New Version" was not offered to the Author on a posted or a
scheduled preprint (nor, in one read, to the assigned Moderator with
the edit permission); it was offered to the Preprint Server Manager and
the Site Administrator.

<a id="fn-f-a2"></a>
**f-a2** — Note c: no read-only switch on the panel; the other
publication forms get `canSubmit` false for a viewer who may not edit
(the Publication metadata spec, Rule 10); the notice's wording is
`Form.vue::error()`'s fallback for a 401. Live-probed 2026-09-27: td1,
td2, td9 (eight refused saves in six separate runs, the same notice
each time).

<a id="fn-f-a3"></a>
**f-a3** — Notes f and j: the hidden `vorDoi` is sent and stored with
any status; the Crossref filter takes `vorDoi` alone. Same origin as A1
(ui-library `e88d2d20`, 2024-11-06). The editorial workflow page used
before 2024 saved to the older relation address
(`$relatePublicationApiUrl` in ops `WorkflowHandler::setupIndex()`);
that page now redirects to the dashboard (`PKPWorkflowHandler::index()`),
and the screens no longer call the address. Live-probed 2026-09-27: td6
(a save with another status sent and kept the address).

<a id="fn-f-a4"></a>
**f-a4** — Schema `vorDoi` validation `["nullable", "url"]`; the field
has a label and no description. Note d. Live-probed 2026-09-27: td3.

<a id="fn-f-a5"></a>
**f-a5** — The "submitted" status (2) was removed by ops `76c3667fd5`
"pkp/pkp-lib#5774 Rewording for preprint relations" (2022-09-21), whose
upgrade `I5774_SetRelationVariables` turns a stored 2 into 1; the
description key came with ops `8fd2c6d834` "pkp/pkp-lib#7191 Implement
new submission wizard" (2022-10-19). `publication.publish.relationStatus.submitted`
("This preprint has been submitted to a journal or other academic
publication.") stays in the locale file, read by nothing, and the
schema still admits 2. Live-probed 2026-09-27: "For Readers" showed the
description above "Relation status * Required" and exactly the three
choices, and the wizard submitted with none picked (A8).

<a id="fn-f-a6"></a>
**f-a6** — Note j: `createVorDoiNode()` writes the stored text under
`identifier-type="doi"`, where `createParentDoiNode()` and the record's
own `doi_data/doi` carry the bare DOI. A code reading only: the record
is not observable on the test installs (note j).

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-27 on five runs over two drafts: the
step's publication save answered 400 for "10.1234/abcd", the wizard went
on to "5 Review" and showed the "Error" window each time; on two of the
five the browser also logged the page error "Cannot read properties of
undefined (reading 'url')" at the wizard's `#review` address. After
"OK" the "Relation status" panel read the earlier answer; back on "For
Readers" the box held "10.1234/abcd" with no field message. Note d for
the validation, note g for the panel.
Issue report: [pkp-e2e#673](https://github.com/jardakotesovec/pkp-e2e/issues/673) ([docs/issues/U75-A7-wizard-refused-doi-no-field-message.md](../issues/U75-A7-wizard-refused-doi-no-field-message.md)).
Issue report (the hang, shared with the Submission wizard's A19): [pkp-e2e#322](https://github.com/jardakotesovec/pkp-e2e/issues/322) ([docs/issues/U21-A19-wizard-refused-save-hangs-saving.md](../issues/U21-A19-wizard-refused-save-hangs-saving.md)).

<a id="fn-f-a8"></a>
**f-a8** — Note d (`isRequired` set only for the wizard) and note g.
Live-probed 2026-09-27 on two drafts: the Review step's check answered
with no problem for the unanswered question, "Submit" went through and
`relationStatus` null was stored; td4.

<a id="fn-f-a9"></a>
**f-a9** — Note g: the panel's `=== 3` and `== 0` branches miss a
stored null, which falls through to `publication.relation.none`, while
`PublishForm` reads it as unknown (note i). Live-probed 2026-09-27: td4,
and the "Post the preprint" window of a preprint submitted unanswered
(td8).

<a id="fn-f-a10"></a>
**f-a10** — Note d: `getEditorsStep()` passes the publication to a
constructor that does not take it, so the wizard's radio starts empty
whatever is stored. Live-probed 2026-09-27 with "published elsewhere"
and the address saved, and with "not entered" saved (td4).
Issue report: [pkp-e2e#674](https://github.com/jardakotesovec/pkp-e2e/issues/674) ([docs/issues/U75-A10-wizard-relation-answer-unticked-after-reload.md](../issues/U75-A10-wizard-relation-answer-unticked-after-reload.md)).

<a id="fn-f-a11"></a>
**f-a11** — Note g: `openStep('{$step.id}')` is served as `openStep('')`
in both `review-relation.tpl` and `review-license.tpl`, so neither
"Edit" names a step; the Submission wizard spec's Rule 12a has every
panel's "Edit" jump back to its step. Live-probed 2026-09-27 on five
runs over two drafts.
Issue report: [docs/issues/U75-A11-review-panel-edit-stays-on-review.md](../issues/U75-A11-review-panel-edit-stays-on-review.md).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Relations" control | Workflow › "Preprint" › any page of a version (control region) | AFFW-385 |
| The relation form in "Relations" | the panel under the button; saves with `PUT api/v1/submissions/{id}/publications/{publicationId}` | AFFW-386, API-042 |
| Review step "Relation status" panel | Submission wizard › "Review" | AFFW-128 |
| The wizard question | Submission wizard › "For Readers" (the *Submission wizard* spec) | — |
| Relation notice | the preprint page `{server}/preprint/view/{id}[/version/{publicationId}]` and its "Preview" | AFFR-082 |
| "Related Publication" line | Workflow › "Post" › "Post the preprint" | AFFW-709 |
| Crossref record | DOIs page › "Export DOIs" / "Deposit DOIs" (the *DOIs* spec) | PLUG-009 |
| The older relation address | `PUT api/v1/submissions/{id}/publications/{publicationId}/relate`; no screen calls it (UNASSIGNED candidate 48) | API-065 |

## Reference — code anchors

- Form and schema: ops `classes/components/forms/publication/RelationForm.php`,
  `classes/publication/Publication.php` (`PUBLICATION_RELATION_*`),
  `schemas/publication.json`, `classes/publication/Repository.php`
  (`relate()`, `getErrorMessageOverrides()`).
- Workflow control: ui-library
  `src/pages/workflow/components/publication/WorkflowPublicationRelationDropdownOPS.vue`,
  `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOPS.js`,
  `…/workflowConfigAuthorOPS.js`, `src/pages/workflow/WorkflowPageOPS.vue`,
  `src/components/Form/Form.vue`; ops `pages/dashboard/DashboardHandler.php`.
- Save and gate: lib/pkp `api/v1/submissions/PKPSubmissionController.php`
  (`editPublication()`), `classes/security/authorization/PublicationWritePolicy.php`,
  `classes/security/authorization/internal/PublicationCanBeEditedPolicy.php`,
  `classes/submission/Repository.php` (`canEditPublication()`),
  `classes/publication/Repository.php` (`edit()`, `version()`).
- Legacy route and forms: ops `api/v1/submissions/SubmissionController.php`
  (`relatePublication()`), `pages/workflow/WorkflowHandler.php`,
  `pages/authorDashboard/AuthorDashboardHandler.php`.
- Wizard: ops `pages/submission/SubmissionHandler.php` (`getEditorsStep()`),
  `templates/submission/review-relation.tpl`.
- Reader and publish: ops `templates/frontend/objects/preprint_details.tpl`,
  `classes/components/forms/publication/PublishForm.php`.
- Crossref: ops `plugins/generic/crossref/filter/PreprintCrossrefXmlFilter.php`
  (`createPostedContentNode()`, `appendRelationships()`, `createVorDoiNode()`).
- Locale: ops `locale/en/submission.po` (`publication.relation*`,
  `publication.publish.relationStatus*`), `locale/en/locale.po`
  (`common.publication`); lib/pkp `locale/en/common.po` (`validator.url`,
  `form.errors`, `form.saved`), `locale/en/api.po`
  (`api.submissions.403.userCantEdit`); ops `classes/migration/upgrade/v3_4_0/I5774_SetRelationVariables.php`.
