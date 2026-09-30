---
name: funding
status: verified
---

# Funding {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Funding lets a journal record, for each submission, the organizations that
funded the work and the grants behind it. Funders are formally credited, and
the information travels with the publication's metadata. Authors can be
asked, or required, to declare funders while submitting. The
editorial team maintains the same list on the workflow's Publication area.
Readers see the funders on the published item's landing page, with links to
each funder's public registry record and to grant DOIs. A funder is
identified in one of two ways: by picking it from the ROR registry (the
public Research Organization Registry of institutions), or by typing a name
by hand. A registry-backed funder is shown with the **ROR mark**, the
registry's logo. Each funder can carry any number of grants (name, number,
DOI). The free-text *Funding Statement* paragraph and the *Data Availability
Statement* are separate publication metadata fields owned by
*[Publication metadata](U40-publication-metadata.md)*. This spec owns the
structured funders list end to end.

## Actors & permissions

**Editing follows the publication, not this screen.** The funders list is
editable by exactly the people who may edit the submission's publication
metadata at that moment. That gate, and its locks for published items, are
owned by *[Publication metadata](U40-publication-metadata.md#edit-gate)*.
When the viewer may not edit,
the list is read-only: "Add Funder" and "Order" are grayed out and the row
action menus are absent (Rule 8). During submission, the wizard's Funders
section is the submitting author's own draft and is always editable there.
Publishing does not itself lock the list. A Journal Manager can still add,
edit and reorder funders on a published item, with only the general "This
version has been published" banner as a caution. Whether publication should
lock metadata is *[Publication metadata](U40-publication-metadata.md#edit-gate)*'s
question.
<sup>a</sup>

| Action | Who may — and when |
|--------|--------------------|
| **See the Funding list (workflow)** | • any role whose workflow view includes the Publication area: Journal Manager, Site Administrator, and assigned Section Editors, Assistants and the submission's Author. Only while the journal has funding switched on (Rule 2). Exception: an assigned Assistant whose role is not allowed onto the submission's current workflow stage sees no Publication entries at all, "Funding" included ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)). Which stages a role may enter is the workflow screen's own rule ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)), not this feature's <sup>a</sup> |
| **Add / edit / delete / reorder funders (workflow)** | • whoever may currently edit the publication's metadata (see *[Publication metadata](U40-publication-metadata.md#edit-gate)*). Everyone else sees the read-only list (Rule 8)<br>• on a preprint server, that includes the submitting author on their own not-yet-posted preprint. On a journal or press the author's workflow list is read-only [OPS1](#ops1) <sup>a</sup> |
| **Declare funders while submitting (wizard)** | • the submitting author, on the wizard's Details step, only while the journal *asks* for or *requires* funder metadata (Rule 2) <sup>b</sup> |
| **See funders on the landing page** | • any reader, on a published item that has funders recorded (Rule 9) <sup>f</sup> |
| **Configure funding for the journal** | • Journal Manager, and a Site Administrator working in the journal, on the workflow settings' Metadata screen (Settings that modify behavior) <sup>c</sup> |

## Fields & validation

The add/edit panel ("Add Funder" / "Edit Funder") carries two fields. A save
that fails validation is refused in place: the panel shows "Please correct
one error." and the Save button stays disabled until the field is corrected.
<sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Funder** | Yes | "Search for a funder by name" queries the public ROR registry as you type, from four characters on. The field's guidance reads 'Enter the full name of the institution below, avoiding any acronyms and select the name from the dropdown. (e.g. "Simon Fraser University")'. The first, pre-highlighted suggestion is always your typed text itself, styled like a registry match but without the country and the ROR mark ⚠ [A6](#a6). Registry matches follow. Each shows a name, a country, the ROR mark and its own registry-record link (read out by screen readers as "Open link in a new tab."). If the registry does not answer, suggestions simply never appear and the field shows no error ⚠ [A9](#a9). Picking a registry match fixes the funder's identity: its registry link appears, and its name, taken from the registry in every registry language available, cannot be edited by hand. If the pick instead pops up "An unexpected error has occurred. Please reload the page and try again.", the journal's own server cannot reach the registry. The funder still saves, but with no name at all ⚠ [A3](#a3). Whether the registry name then shows everywhere on a journal whose server does reach the registry is unconfirmed ⚠ [A10](#a10). Or pick your typed text instead. The panel then switches to one name box per submission language ("Type the funder name in {language}"), and the primary-language box arrives pre-filled with your typed text. The primary language's box is marked required, but a save with any one language filled is accepted ⚠ [A12](#a12). Saving with neither a pick nor a name shows "Search and select a Funder or enter a Funder name". A "Delete" button under the chosen funder clears it so you can search again. |
| **Funder Grants** | No | A sub-table of grants ("Add any grants associated with this funder (optional).") with the columns **Grant DOI**, **Grant Number** and **Grant Name**, an "Add" button for new rows and a per-row "Delete". All three cells are optional. A row left entirely blank is silently dropped on save. Grant DOI must look like a DOI ("10.xxxx/…"); anything else is refused with "This is not formatted correctly." on the cell. Grant Number is checked against the funder's grant registry only when the journal's grant-validation setting is on AND the funder was picked from the registry AND it is one of the supported major funders (Settings that modify behavior). A hand-named funder's grants are never checked. A failed check is meant to refuse the save with "The given grant number could not be validated against the Funder's ROR ID." ⚠ [A11](#a11) |

## Rules & state

1. **One list per submission.** A submission carries one ordered list of
   funders. Each funder is a registry-backed or hand-named organization plus
   its grants. The wizard, the workflow and the landing page all present
   this same list.
2. **Availability follows one journal setting.** The Funders setting on the
   workflow settings' Metadata screen has three levels. Switched off: there
   is no "Funding" entry in the workflow and no wizard section, so nothing
   new can be recorded, but funders recorded before the switch-off stay
   visible to readers on the published page (Rule 9). Enabled: the
   workflow's "Funding" entry appears, but authors are not asked during
   submission. Ask or require: the wizard's Details step additionally shows
   the Funders section. A new journal starts at "ask". <sup>c</sup>
3. **Where it lives in the workflow.** The workflow screen's Publication
   area (titled "Preprint" on a preprint server) gains a **"Funding"**
   entry. It opens a screen headed "Publication: Funding" ("Preprint:
   Funding" on a preprint server) that carries the funders list: the
   heading "Funders", the explanation "Add formal funding information,
   ensuring funders are properly credited and appear in the publication
   metadata.", and a table whose one visible column is **"Funder Name"**. A
   second column header, "More Actions", exists for screen readers only. An
   empty list reads "No funders have been added." Above the table sit
   **"Order"** and **"Add Funder"**. <sup>a</sup>
4. **The row.** Each row shows the funder's name. A registry-backed funder
   also carries the ROR mark (the registry's logo) beside it. Grants are not
   shown in the table; they appear in the edit panel and on the landing
   page. Each row's "…" menu offers **"Edit"** and **"Delete"**. <sup>a</sup>
5. **Add and edit.** "Add Funder" opens the "Add Funder" side panel (Fields
   & validation). "Edit" opens the same panel titled "Edit Funder",
   prefilled with the funder and its grants. Saving closes the panel and the
   list updates in place. A registry-backed funder's identity is fixed. To change
   which organization it is, clear the Funder field ("Delete" under the
   name) and search again. Editing only its grants is the ordinary path.
   <sup>d</sup>
6. **Delete.** "Delete" opens a confirmation ("Delete" / "Are you sure you
   wish to delete this item? This action cannot be undone.") with **"OK"**
   and **"Cancel"**. OK removes the funder and its grants permanently.
   Cancel leaves everything untouched. <sup>e</sup>
7. **Ordering.** "Order" puts the table in ordering mode. Each row's "…"
   menu is replaced by up/down arrows, which are icon-only and have no name
   that assistive technology can announce ⚠ [A5](#a5), and the button
   relabels **"Save Order"**. Moving rows and pressing Save Order persists
   the sequence, and the landing page lists funders in this order. A funder
   added after an ordering was saved appears first, above every previously
   ordered row, and keeps that place ⚠ [A7](#a7). <sup>e</sup>
8. **Read-only presentation.** For a viewer who may not edit the
   publication (Actors & permissions), the same list renders with "Add
   Funder" and "Order" grayed out and no "…" menus on the rows. <sup>a</sup>
9. **What readers see.** On a published item's landing page, a **"Funders"**
   block appears when the publication has at least one funder, and not at
   all otherwise. Each funder shows its name. A registry-backed funder's ROR
   mark links to its registry record. Under each funder come its grants: the
   grant name, "Grant Number" with the number, and "Grant DOI" with the DOI
   as a working link. On a press the landing page is the catalog's book
   page; on a preprint server, the preprint's page. <sup>f</sup>
10. **The wizard's Funders section.** While the journal asks for or requires
    funder metadata, the wizard's Details step gains a "Funders" section. It
    is the step's last section on a journal or preprint server; on a press,
    Chapters follow it. It holds the same list and add/edit panel as the
    workflow, always editable by the submitting author. On a press or
    preprint server the section's table still reads "No funders have been
    added." after a save, and the Review step "None provided", until the
    page is reloaded. The funder IS saved; only the wizard's display fails
    to refresh ⚠ [A4](#a4). The wizard's Review step lists the funder names
    under "Details", or "None provided". <sup>b</sup>
11. **"Require" warns without blocking.** With the setting at require, an
    author who declared no funders sees a warning on the wizard's Review
    step: "Funders are required." The final submit stays enabled and the
    submission completes anyway ⚠ [A1](#a1). <sup>b</sup>
12. **One list across versions.** The funders list belongs to the
    submission as a whole. Whichever publication version is selected in the
    workflow, its "Funding" entry shows, and edits, the same list
    ⚠ [A2](#a2). <sup>g</sup>
13. **Reviewers never see funders.** A Reviewer's review screen shows no
    funders list, whatever the review type, and neither does the "View All
    Submission Details" window it opens. The publication data that window
    loads carries no funders list in any review type either: the funders
    belong to the submission's own data, which no reviewer screen loads. So
    the funders reach the reviewer's browser under no review type, and
    there is no screen or traffic on which an author-anonymous review type
    reads differently from an open one. <sup>h</sup>
14. **Languages.** The workflow list and its panel follow the interface
    language. In French, "Order" and "Save Order" ("Trier", "Enregistrer
    l'ordre"), the row menu, the delete confirmation, the panel's "Add",
    "Save" and "Close" buttons and the "Delete" under the chosen funder
    read French, and a funder named through the French panel saves and is
    listed at once and after a reload. The list's heading, explanation,
    "Add Funder" button, column heading and empty-list line, and the
    panel's title and field texts, read raw codes ⚠ [A14](#a14). The
    Author's own list reads the same "Trier" and codes, grayed out where
    they may not edit (Rule 8). <sup>i</sup>

## Side effects

- Adding, editing, deleting or reordering funders sends no email, raises no
  notification, and writes no activity-log entry. The list simply changes.
  <sup>e</sup>
- Picking a registry funder stores a local copy of its ROR registry record
  (names in all registry languages, the registry link). Users never see this
  copy. When it cannot be fetched, the funder is left nameless ([A3](#a3)).
  <sup>d</sup>
- Funding metadata travels outward with the publication. It is carried in
  DOI registration and metadata export (see *DOI registration & Crossref*
  and the export plugins' features). On a journal it also feeds the
  Publication Facts Label plugin's "funders" fact when that plugin is
  enabled. Those surfaces belong to their own features.

## Settings that modify behavior

All of these sit on the workflow settings' **Metadata** screen, in its
"Funders" section ("Identify the Funders and Funder Grants associated with
the submission."): <sup>c</sup>

- **"Enable funder metadata"**. Once it is ticked, the submission-time
  choice appears: "Do not request funder metadata from the author during
  submission." / "Ask the author for funder metadata during submission." /
  "Require the author to add funder metadata before accepting their
  submission." These are the levels of Rule 2 (off / enabled / ask /
  require). Unticking and later re-ticking the box does not restore the
  saved level. The choice arrives reset to "Do not request…", and the
  manager must pick their level again ⚠ [A8](#a8).
- The **"Funder Grant ID validation"** section ("Enable grant ID validation
  for supported funders (using the Zenodo API)."), with the checkbox
  **"Enable Grant ID validation."** When it is on, a grant number entered
  for a registry-picked funder that is one of the supported major funders
  is checked against that funder's public grant registry on save, and
  numbers the registry does not know are rejected [A11](#a11). The
  supported funders are NIH, NSF, European Commission, Wellcome Trust and
  some two dozen others; the roster is fixed in the software, not
  configurable. When the registry service is unreachable, the check is
  skipped silently and the save goes through. <sup>d</sup>
- The neighboring **"Funding Statement"** setting on the same screen governs
  the free-text statement field, owned by
  [Publication metadata](U40-publication-metadata.md).

## Cross-feature interactions

- *[Publication metadata](U40-publication-metadata.md#edit-gate)* owns who
  may edit a publication and
  the published-state policy this feature's editing rides on, including
  that publishing warns rather than locks (Actors & permissions). It also
  owns the Funding Statement and Data Availability Statement fields and
  their landing-page display.
- *[Submission wizard](U21-submission-wizard.md)* owns the wizard shell
  (steps, Review, submit). This spec owns the Funders section it mounts
  (Rules 10–11).
- [Article landing page & reading](U13-article-landing-page-and-reading.md)
  (the press counterpart is the OMP catalog's book page) owns the landing
  screen. The Funders block on it is described here (Rule 9) as this feature's
  reader surface.
- *[Contributors & affiliations](U41-contributors-and-affiliations.md#ror-lookup)*
  is the home of the ROR registry lookup machinery the Funder field reuses.
- The search machinery can filter submissions by funder. Any reader-facing
  exposure of that belongs to the search feature.

## Canonical scenarios

Scenarios 1–3 and 5 run on the seeded journal with ready accounts and
scratch submissions; scenarios 4 and 6 run on a scratch journal with
throwaway accounts, because scenario 4 changes the journal's funders
setting and scenario 6 its review type. Each scenario's accounts, seeding
and the mail catcher's address are in its footnote.

1. **Record and revise funding in the workflow**

   Given: Journal Manager, on the seeded journal, with a scratch
   submission at any stage before publication.

   - **"Funding"**: open the submission's workflow, then its Publication
     area, then "Funding": the screen is headed "Publication: Funding"
     ("Preprint: Funding" on a preprint server), with the heading
     "Funders", a table whose column is "Funder Name", and "Order" and
     "Add Funder" above it (Rule 3).
   - **An empty save**: press "Add Funder", then Save with nothing
     filled: "Search and select a Funder or enter a Funder name" appears
     under the Funder field, the panel shows "Please correct one error."
     and Save stays disabled until the field is corrected (Fields).
   - **The typed-name funder**: type "Test Foundation" in "Search for a
     funder by name" and pick the typed text itself from the top of the
     suggestions: the name box marked "* Required" arrives pre-filled
     with it; press "Delete" under the chosen funder: the field clears;
     type "Test Foundation" again, pick the typed text, and leave the
     pre-filled box as it is (Fields; Rule 5).
   - **The grants**: add one grant row with "Add" under "Funder Grants"
     and fill it: "Field Study" as Grant Name, "1234" as Grant Number and
     "not-a-doi" as Grant DOI; Save: "This is not formatted
     correctly." appears on the Grant DOI cell, the panel shows "Please
     correct one error." and Save stays disabled until the cell is
     corrected; replace the DOI with "10.1234/example", press "Add" for a
     second grant row and leave it blank, then Save: the panel closes and
     the row shows "Test Foundation". This is the *typed-name funder*
     (Fields; Rule 5).
   - **The registry funder**: press "Add Funder", type "National
     Institutes of Health" and pick the suggestion of that name showing
     a country and the ROR mark: the panel shows the name and its
     registry link; Save: the row shows the name with the ROR mark beside
     it. This is the *registry funder*. Two exceptions, neither failing
     this scenario. The search must answer in the browser: no
     suggestion beyond your typed text means the registry did not answer
     ([A9](#a9)), and Ordering and Delete below run only with the
     registry funder recorded. If the pick instead pops up "An unexpected
     error has occurred. Please reload the page and try again.", the
     journal's server cannot reach the registry ⚠ [A3](#a3): dismiss it
     ("OK") and Save: the row shows the ROR mark with no name and still
     serves as the registry funder below (Fields; Rule 4).
   - **Ordering**: press "Order", move the registry funder up with its
     arrow, and press "Save Order"; reload the page: the registry funder
     is still listed first (Rule 7).
   - **Edit**: open the typed-name funder's "…" → "Edit": the panel is
     titled "Edit Funder", prefilled with the name and the one
     grant row, the blank second row gone; change the Grant Number to
     "5678" and Save: the panel closes; reopen "…" → "Edit": "5678" is
     there; press "Close" at the panel's top (the panel offers "Close"
     and "Save", no "Cancel") (Fields; Rule 5).
   - **Delete**: choose "…" → "Delete" on the registry funder: the
     confirmation asks "Are you sure you wish to delete this item? This
     action cannot be undone."; press "Cancel": it is still listed;
     delete again and press "OK": the row is gone, and the typed-name
     funder alone remains (Rule 6).
   - **Nothing else happens**: no email arrived in the mail catcher from
     these adds, edits, deletes and reorders, and the submission's
     Activity Log & Notes → History has no new entry (Side effects).
   - **Control**: before the first add, the same list read "No funders
     have been added." (Rule 3). <sup>s1</sup>

2. **Declare funding while submitting**

   Given: Author, on the seeded journal, which asks the author for
   funder metadata during submission.

   - **The Details step**: start a submission and walk to the Details
     step: its last section (on a press, the section before Chapters) is
     "Funders"; press "Add Funder" and record scenario 1's typed-name
     funder (type "Test Foundation", pick the typed text, Save): the section's table shows the row; on a
     press or preprint server it still reads "No funders have been
     added." until you reload the page, after which the row is there
     (⚠ [A4](#a4)) (Rule 10).
   - **The Review step**: go on to the Review step: "Test Foundation" is
     listed under "Details"; complete the submission (Rule 10).
   - **The Journal Manager's list**: Journal Manager: open the new
     submission's workflow, then its Publication area, then "Funding":
     the author's funder is there (Rule 1).
   - **Control**: before the add, the section's table read "No funders
     have been added." (Rules 3, 10). <sup>s2</sup>

3. **Read a published item's funding**

   Given: Reader, on the seeded journal, with a published scratch article
   whose funders list holds two hand-named funders, "Test Foundation"
   with one grant ("Field Study", "1234", DOI "10.1234/example") and
   "Second Foundation", and a registry-backed funder, all recorded
   through the workflow as in scenario 1 and ordered there with "Save
   Order" so that "Second Foundation" comes first; and a second published
   scratch article with no funders.

   - **The "Funders" block**: open the article's landing page (on a press
     the catalog's book page, on a preprint server the preprint's page):
     a "Funders" section lists "Test Foundation" and, under it, "Field
     Study", "Grant Number" with "1234" and "Grant DOI" with
     "10.1234/example" as a link (Rule 9).
   - **The saved order**: "Second Foundation" is listed before "Test
     Foundation", the order saved in the workflow (Rule 7).
   - **The registry funder**: its ROR mark links to its record on the
     registry site; its name shows beside the mark on a journal whose
     server reaches the registry; a mark with no name means it cannot
     ([A3](#a3)) (Rule 9).
   - **Control**: the published article with no funders shows no
     "Funders" section at all (Rule 9). <sup>s3</sup>

4. **The journal opts out**

   Given: Journal Manager, on a scratch journal, which starts at "Ask the
   author for funder metadata during submission.", with one published
   scratch submission whose funders list already holds a hand-named
   funder recorded through the workflow as in scenario 1, and a throwaway
   Author.

   - **The setting off**: on the workflow settings' Metadata screen,
     untick "Enable funder metadata" and save: the submission's workflow
     now shows no "Funding" entry in its Publication area (Rule 2;
     Settings).
   - **The wizard with the setting off**: Author: start a submission,
     upload its file and walk to the Details step: it has no Funders
     section (Rule 2).
   - **The published page with the setting off**: open the published
     submission's landing page: its "Funders" block still lists the
     funder (Rule 2; Rule 9).
   - **The setting on again**: Journal Manager: re-tick "Enable funder
     metadata": the choice arrives on "Do not request funder metadata
     from the author during submission." rather than the "Ask…" level
     saved before (⚠ [A8](#a8)); save it as it stands: the submission's
     workflow shows the "Funding" entry again, and the Author's draft,
     opened again at its Details step, still has no Funders section
     (Rule 2, the enabled level; Settings).
   - **"Ask" again**: pick "Ask the author for funder metadata during
     submission." and save: both surfaces are back, the "Funding" entry
     and the Funders section on the Author's Details step, and the
     submission's "Funding" list still holds its funder (Rule 2).
   - **"Require"**: pick "Require the author to add funder metadata
     before accepting their submission." and save (Settings).
   - **The Review step at "Require"**: Author: with no funder declared,
     go on to the draft's Review step: it shows "Funders are required.";
     the final submit stays enabled and the submission completes anyway
     (⚠ [A1](#a1)) (Rule 11).
   - **Control**: before the untick, the same submission's Publication
     area showed "Funding" and the Author's Details step ended with its
     Funders section (Rule 2). <sup>s4</sup>

5. **The read-only list**

   Given: Author, on the seeded journal, with the Author's own submitted
   scratch submission whose funders list holds one hand-named funder,
   recorded through the workflow by the Journal Manager as in scenario 1.

   - **The Author's list**: open your own submission's workflow, then its
     Publication area, then "Funding": the row shows the funder's name,
     "Add Funder" and "Order" are grayed out, and the row carries no "…"
     menu (Rule 8; Actors row 2).
   - **A preprint server**: on a preprint server the submitting author's
     list on their own not-yet-posted preprint is fully editable instead:
     "Add Funder" and "Order" work, the row's "…" menu offers "Edit" and
     "Delete", and "Edit" opens the "Edit Funder" panel prefilled with
     the funder ([OPS1](#ops1)) (Actors row 2; Rules 4, 5).
   - **Control**: the Journal Manager's "Funding" on the same submission
     offers "Add Funder" and "Order" and the row's "…" menu with "Edit"
     and "Delete" (Rules 3, 4). <sup>s5</sup>

6. **The reviewer's browser never receives the funders list** {OJS OMP}

   Given: Reviewer, on a scratch journal at the install defaults, whose
   review type is "Anonymous Reviewer/Anonymous Author", with a
   submission in review whose funders list holds one hand-named funder,
   "Test Foundation", and the Reviewer's accepted request on it; a
   second scratch journal whose default review type is "Open", seeded
   the same way.

   - **The anonymous assignment**: open the request from the reviewer
     dashboard: the review screen shows no funders list and "Test
     Foundation" appears nowhere on it; press "View All Submission
     Details": the window names no funder; in the browser's network view
     read the window's own request for the publication, never one you
     send: it carries no funders list at all, and "Test Foundation"
     appears nowhere in it (Rule 13).
   - **The open assignment**: the same walk on the open assignment: the
     review screen and the "View All Submission Details" window likewise
     show no funders list, and the publication the window requests
     likewise carries no funders list (Rule 13).
   - **Control**: Journal Manager: open the same submission's workflow,
     then its Publication area, then "Funding": the row shows "Test
     Foundation", and in the network view the screen's own request for
     the submission carries "Test Foundation" (Rules 1, 3). A preprint
     server installs no review stage. <sup>s6</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the list in French: "Trier" / "Enregistrer l'ordre", the row menu
    and the delete confirmation in French, and a funder saved through
    the French panel listed at once and after a reload (Rule 14)
- **Nothing new to test**:
  - grant validation on while the registry service is unreachable, the
    check skipped and the save going through (Settings): the save
    scenario 1 makes with the checkbox off
  - the Funder field's guidance text and the registry link's "Open link
    in a new tab." screen-reader label (Fields): the field scenario 1
    fills
- **Register carries it**:
  - A1 (the require warning not blocking the submit; Rule 11; scenario 4
    marks it)
  - A2 (every publication version's "Funding" entry showing and editing
    the one list; Rule 12)
  - A5 (the ordering arrows without an accessible name; Rule 7; scenario
    1 passes them)
  - A6 (the typed-text suggestion styled like a registry match; Fields)
  - A7 (a funder added after a saved order landing first; Rule 7)
  - A9 (a registry that does not answer showing no error; Fields)
  - A10 (the registry name shown everywhere on a connected install;
    Fields)
  - A12 (a save with only a non-primary language filled accepted; Fields)
  - A14 (raw codes on the list and the panel in French; Rule 14)
- **No seed**:
  - a hand-named funder's grants never checked against a grant registry
    (Fields): the checked case needs a server that reaches the registry,
    which the test installs' server cannot
  - a registry pick storing a local copy of the registry record (Side
    effects): the same server limit, so the pick saves nameless (A3)
  - "Enable Grant ID validation." on: an unknown number for a supported
    registry funder refused (Settings; A11)
- **Owned by another feature**:
  - an assigned Assistant kept off the current stage seeing no
    Publication entries, "Funding" included (Actors row 1; *Workflow
    screen & stage access*)
  - funding travelling outward: DOI registration, metadata export and
    the Publication Facts Label (Side effects; *DOI registration &
    Crossref*, *Import & export*)
  - the "Funding Statement" setting and field (Settings; *Publication
    metadata*)
  - the edit gate, its published-item locks and the "This version has
    been published" banner (Actors & permissions; Cross-feature
    interactions; *Publication metadata*)
  - the wizard shell: steps, Review and submit (Cross-feature
    interactions; *Submission wizard*)
  - the landing screen itself (Cross-feature interactions; *Article
    landing page & reading*)
  - the ROR registry lookup machinery (Cross-feature interactions;
    *Contributors & affiliations*)
  - search filtering by funder (Cross-feature interactions; *Search*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-28; additions
2026-08-29 and 2026-09-30), unreviewed unless an entry notes otherwise; the team settles
them on spec review. The summary is sorted 🐞 → ❓ → ✅ and the entries below
are the source; badges, Impact and Basis:
[Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A3](#a3) | A registry funder picked while the server cannot reach the registry errors and saves permanently nameless | 🐞 | user-visible | — |
| [A4](#a4) | On a press or preprint server the wizard's funders table and Review step still read empty after a successful save | 🐞 | minor | — |
| [A5](#a5) | Ordering arrows and the typed-name boxes are broken for assistive technology | 🐞 | minor | — |
| [A14](#a14) | In French the funders list and the "Add Funder" / "Edit Funder" panel show raw codes for their headings, explanations and field labels | 🐞 | minor | — |
| [A1](#a1) | "Require the author to add funder metadata" warns on the Review step without blocking the submission | ❓ | user-visible | — |
| [A2](#a2) | Every publication version shows and edits the same funders list, though the screen presents funding per version | ❓ | minor | — |
| [A6](#a6) | The typed-text suggestion looks like a registry match, so real funders get saved unlinked without anyone noticing | ❓ | user-visible | — |
| [A7](#a7) | A funder added after ordering jumps to the top of the saved order | ❓ | minor | — |
| [A8](#a8) | Re-enabling funder metadata resets the submission-time level to "Do not request" | ❓ | minor | — |
| [A9](#a9) | A failed funder search shows no error; suggestions silently never appear | ❓ | minor | — |
| [A10](#a10) | Whether a registry pick stores and shows the registry name on a normally connected install has not been observed | ❓ | latent | — |
| [A11](#a11) | The grant-number rejection message has never been seen on screen | ❓ | latent | — |
| [A12](#a12) | The primary-language funder name is marked required, yet a save with any one language filled is accepted | ❓ | minor | — |
| [A13](#a13) | A saved funder never appears in the Funders table, so it cannot be edited, deleted or reordered, though the published page shows the funding (regression, pkp/pkp-lib#13003) | ✅ | retired | rebase check (claude), 2026-09-03 — fixed upstream (ui-library `f88b7e6a`), suites green on all three apps |
| [OPS1](#ops1) | The submitting author edits their own unposted preprint's funders | ✅ | user-visible | — |

### All apps

<a id="a1"></a>
**A1 — "Require" warns without enforcing** · ❓ · user-visible.
With funder metadata set to required, an author who declares no funders
sees the "Funders are required." warning on the wizard's Review step. Yet
the final submit stays enabled and the submission completes. The setting's
promise ("before accepting their submission") is only advisory.
Question: is the require level meant to block submission, or only to warn?
Lean: oversight. The sibling required-metadata fields are enforced at
submit and this one is not.
Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Funders are shared across publication versions** · ❓ · minor.
The workflow offers "Funding" under each publication version, but the list
is stored once per submission. All versions show the same funders, and a
grant edited while viewing an old published version reads changed under the
current one too. The other publication metadata, by contrast, is versioned.
Question: is submission-wide funding intended, or should funders version
with the publication?
Lean: intended. Funding describes the work, not an edition. But the
per-version presentation invites the wrong expectation.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Registry pick saves a nameless funder when the server has no registry access** · 🐞 · user-visible.
When the journal's server cannot reach the ROR registry, picking a registry
match raises "An unexpected error has occurred. Please reload the page and
try again." That dialog can sit over the open panel and swallow the next
click. The funder still saves, permanently nameless: the workflow row, the
edit panel, the wizard and the published page all show a bare ROR logo with
no text. The name the user just saw in the panel is discarded rather than
kept as a fallback. Nothing recovers it short of deleting the funder and
re-adding it once the server can reach the registry.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The wizard does not refresh after a funder save on a press or preprint server** · 🐞 · minor.
On OMP and OPS, saving a funder in the wizard's Funders section leaves the
section's table reading "No funders have been added." and the Review step
reading "None provided" until the page is reloaded. The funder is saved: the
workflow list shows it, and a reload brings both wizard displays current. On
OJS the same displays update in place, so the staleness reads as a defect,
not a design.
Basis: probe. <sup>f-a4</sup>
Note (claude, 2026-08-29; updated 2026-09-03): between the pkp/pkp-lib#13003
schema move and its ui-library fix, [A13](#a13) (now retired) hid the saved
funder on every app and masked this refresh-miss. With the fix in all three
apps the text above is the standing description again; the OMP and OPS suites
still save the wizard funder without asserting the table either way, so the
refresh-miss has not been re-probed at the fixed tips.

<a id="a5"></a>
**A5 — Two funder controls are broken for assistive technology** · 🐞 · minor.
In ordering mode the row's up/down arrows are icon-only, with no accessible
name for a screen reader to read out. In the typed-name path a screen reader
reads the primary-language box out with both languages' labels run together,
and the second box has no label at all.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The typed-text suggestion masquerades as a registry match** · ❓ ·
user-visible.
The first, pre-highlighted suggestion under the Funder search is always the
typed text itself, styled like a registry match but without the country and
the ROR mark. A user searching for a real funder can pick it and save an
unlinked, hand-typed look-alike without noticing. Two testers working from
these very screens did exactly that.
Question: should the manual option be visually set apart, or listed last?
Lean: defect-shaped. The registry link is the feature's point, and it is
silently lost.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A new funder jumps ahead of a saved order** · ❓ · minor.
A funder added after the list was ordered appears first, above every
previously ordered row, and keeps that place on reload. The published page
shows the same sequence.
Question: intended, or should new funders append after the ordered rows?
Lean: defect. Appending is what a saved ordering implies.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Re-enabling funder metadata resets the submission-time level** · ❓ · minor.
Unticking "Enable funder metadata", saving, and re-ticking it does not
restore the saved request level. The radios arrive preselecting "Do not
request funder metadata from the author during submission." A manager who
saves without noticing silently downgrades the journal from "Ask" or
"Require" to never asking authors.
Question: intended reset, or a lost setting? Lean: minor defect. A saved
choice should survive a toggle, and the silent landing on "Do not request…"
invites an unnoticed policy change.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A failed funder search shows nothing** · ❓ · minor.
When the registry query fails in the browser (a service outage or a
refusal), funder suggestions simply never appear. The field shows no error
or hint, so the failure looks the same as "no matches".
Question: should the field say the registry could not be reached? Lean:
defect-shaped. The silence steers users into the typed-name path unaware.
Basis: probe, during an intermittent registry-service outage. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — Registry-name storage unobserved on a connected install** · ❓ ·
latent.
On an install whose server has ordinary internet access, a registry pick is
designed to store the funder's official registry names and show them on the
row, in the wizard and on the published page. Only the failure branch could
be observed ([A3](#a3)), so the working path rests on code reading alone.
Question: does a registry pick on a normally connected install display the
registry name everywhere? Lean: yes, as designed. Settled by one registry
pick on an install with working server internet access.
Basis: code reading; failure branch probed. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The grant-number rejection message has never been seen on screen** · ❓ · latent.
With grant validation on, a number the registry does not know should refuse
the save with "The given grant number could not be validated against the
Funder's ROR ID." But when the registry is unreachable the check is skipped
silently (observed: a nonsense NIH grant number saved without complaint), so
whether and where that message renders has not been observed.
Question: does the message appear on the offending grant row? Lean: yes.
The refusal is wired to the row's Number cell. Settled by saving one invalid
number for a supported funder, with validation on, on an install with
working server internet access.
Basis: skip branch probed; message text from code. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The primary-language name is marked required but not enforced** · ❓ · minor.
In the typed-name path the journal's primary language's box is marked
"* Required". Yet a save with it empty and only another language's box
filled is accepted: the panel closes and the row shows the other language's
name. The save actually requires a name in any ONE language (or a registry
pick). The marker promises more than the save enforces.
Question: should the save refuse without a primary-language name, or should
the required marker come off? Lean: the marker is the defect. The
any-one-language rule is what the save enforces and what the list renders
from.
Basis: probe. <sup>f-a12</sup>

<a id="a14"></a>
**A14 — In French the funders list and its panel show raw codes** · 🐞 · minor.
With the interface in French (Canada), the funders list and the "Add
Funder" / "Edit Funder" panel read raw codes where French words belong,
on a journal, a press and a preprint server:
- the list, the Author's too: the heading "Funders" reads
  "##submission.funders##", as does the table's name for a screen reader; the explanation
  "##submission.funders.description##"; the "Add Funder" button
  "##submission.funders.action.addFunder##"; the "Funder Name" column
  "##submission.funders.column.name##"; an empty list
  "##submission.funders.emptyFunders##" instead of "No funders have been
  added."; and a screen reader hears the "More Actions" column header and
  each row's "…" button as "##common.moreActions##";
- the panel: its title "##submission.funders.addFunder.title##" or
  "##submission.funders.editFunder.title##"; the "Funder" field
  "##submission.funders.funder##", its guidance
  "##submission.funders.funder.description##" and the search box's label
  "##submission.funders.funder.searchPhraseLabel##"; once the typed text
  is picked, the name box "##submission.funders.funder.typeTranslationNameInLanguageLabel##"
  instead of "Type the funder name in {language}"; "Funder Grants"
  "##submission.funders.funder.grants.label.name##", also the grant
  table's name for a screen reader, and its explanation
  "##submission.funders.funder.grants.label.description##"; the grant
  columns "##submission.funders.funder.grant.doi##",
  "##submission.funders.funder.grant.number##" and
  "##submission.funders.funder.grant.name##".

Expected: French words, as the same screens' "Trier", row menu, delete
confirmation and panel buttons show (Rule 14); in English none of these
codes appears. A French-speaking manager or author has to guess what the
panel's fields ask for, though a funder still saves. The side-menu entry
"Funding" and the page heading are
[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#a11)'s
codes, and why a missing French text shows as a code at all is
[Languages & locales](U57-languages-and-locales.md#a4)'.
Basis: probe. <sup>f-a14</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The submitting author edits their own preprint's funders** · ✅ · user-visible.
On a preprint server the author's workflow Funding list is fully editable on
their not-yet-posted preprint. On a journal or press the author's workflow
list is read-only. This matches the preprint model: authors prepare their
own preprint for posting.
Basis: probe. <sup>f-ops1</sup>

### Retired

<a id="a13"></a>
**A13 — A saved funder never appears in the Funders table** · ✅ · retired. Fixed upstream (ui-library `f88b7e6a`, pkp/pkp-lib#13003 follow-up), 2026-09-03. <sup>f-a13</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — the workflow list and its gate.** UI: `FunderManager.vue`
(ui-library `src/managers/FunderManager/`), mounted by the workflow page's
publication config (`funding` block in `workflowConfigEditorialOJS.js` /
`workflowConfigAuthorOJS.js`, prop `canEdit: permissions.canEditPublication`);
OMP and OPS inherit both blocks whole via the config deep-merge
(`useWorkflowConfigOMP.js` / `useWorkflowConfigOPS.js` — no app override
touches `funding`), and all three apps pin the identical ui-library commit
(`246623e9`, checked 2026-08-28) — positive shared-code evidence for every
client-side claim. The "Funding" menu entry is pushed by all six navigation
builders (author + editorial × 3 apps, `useWorkflowNavigationConfig*.js`)
under the same guard `publicationSettings.supportsFunders`, which
`PKPDashboardHandler::index()` sets from the context's `funders` setting;
app dashboard handlers do not override it (chain check clean). Read-only
presentation: the top buttons receive `isDisabled` when `canEdit` is false
(`PkpButton` prop via fall-through) and `FunderManagerCellActions.vue`
hides the row menu (`v-show="canEditPublication"`). Table strings:
`submission.funders` ("Funders"), `submission.funders.description`,
`submission.funders.column.name` ("Funder Name"),
`submission.funders.emptyFunders` ("No funders have been added."). The
role roster in the Actors row is the workflow screen's own access rule —
owned by the workflow/stage features; not separately verified here.
Live-probed 2026-08-28: the read-only rendering (grayed buttons, no row
menus) confirmed for the author and for a stage-assigned Assistant; an
assigned Assistant whose group lacks access to the current stage got an
EMPTY Publication nav group (no "Funding" entry at all); a manager-level
account added, edited and reordered funders on ALREADY-PUBLISHED items on
all three apps, with only the "This version has been published" banner
shown. Screen headings live-confirmed the same day: page title
"Publication: Funding" on OJS and OMP, "Preprint: Funding" on OPS — the
OPS app locale recasts the publication term to "Preprint"
(`locale/en/submission.po` override of `submission.publication`) and the
page title follows it; OPS nav group "Preprint", sr-only column header
"More Actions".

<a id="fn-b"></a>
**b — the wizard section and the require warning.**
`PKPSubmissionHandler::getDetailsStep()` appends section id `funders`
(type `SECTION_TYPE_FUNDERS`, name `submission.funders`) when the
context's `funders` setting is `request` or `require`; `wizard.tpl` mounts
`<funder-manager>` for that type with no `canEdit` prop (defaults to
editable). Subclass chains: OJS and OPS do not override `getDetailsStep()`;
OMP's override calls the parent and only appends its chapters section —
inherited-shared on all three. Review step: `review-details.tpl` renders
the funder names (or `common.noneProvided`) and, at `require` with an
empty list, a warning notification with `submission.funders.required`
("Funders are required.") — a display-only notification, not an entry in
the wizard's blocking `errors` set (A1; warn-only live-confirmed
2026-08-28, see f-a1). Live-probed 2026-08-28: the section renders last on
the OJS and OPS Details steps; OMP's Chapters section follows it; on OMP
and OPS the section's table and the Review step failed to refresh after
save (A4, f-a4).

<a id="fn-c"></a>
**c — the setting.** Context schema `funders`
(`lib/pkp/schemas/context.json`): `in:0,enable,request,require`, default
`request`. Field: `PKPMetadataSettingsForm` (`FieldMetadataSetting
'funders'`, label `manager.setup.metadata.funders`, options
`…noRequest/request/require` verbatim as quoted in Settings that modify
behavior) plus `FieldOptions 'funderGrantValidation'` (`showWhen:
'funders'`; section title "Funder Grant ID validation", description
"Enable grant ID validation for supported funders (using the Zenodo
API).", checkbox label "Enable Grant ID validation." — three distinct
strings, live-read 2026-08-28). Live-probed 2026-08-28: fresh scratch
contexts start ticked at "Ask the author…" (`request` default) on all
three apps; unticking removes the workflow entry and wizard section,
re-ticking restores both with recorded funders intact — but resets the
request level to "Do not request…" (A8, f-a8). With the setting off,
funders recorded earlier stayed on the published item's landing page
(live-probed 2026-08-28, OJS scratch journal; the landing templates
render funders without consulting the setting — fn-f's identical markup
on all three apps). All three apps' `MetadataSettingsForm` subclasses call the
parent constructor and only add publisher-id fields — the Funders section
is inherited-shared. Screen access (workflow settings) is the settings
features' rule, not re-verified here. Pin note: the OJS checkout's pkp-lib
(`87999c45`) carries one commit OMP/OPS's pin (`a9767b7f`) lacks —
"Restore type-aware empty value fallback for form field configs", 18
files across the shared form-field config layer, the funders setting's
own field classes included (checked 2026-08-28). Every funder behavior
probed this day — the A8 reset included — was identical on both pins.

<a id="fn-d"></a>
**d — the add/edit panel and validation.** Form: `FunderEditForm`
(`PKP\components\forms\funder\FunderEditForm`, fields `FieldFunder` +
`FieldFunderGrants`), served once per page by `PKPDashboardHandler::index()`
and `PKPSubmissionHandler` state; modal `FunderEditModal.vue`, titles
`submission.funders.addFunder.title` ("Add Funder") /
`submission.funders.editFunder.title` ("Edit Funder"). `FieldFunder.vue`:
search label `submission.funders.funder.searchPhraseLabel` ("Search for a
funder by name") over `FieldAffiliationsRorAutoSuggest` (queries
`https://api.ror.org/v2/organizations` from the browser, suggestions from
four typed characters, `allowCustom: true` — accepting the typed string is
the manual path); a registry pick stores `ror` + `rorObject` and POSTs the
registry record to the local `rors/` API (the Side-effects cache); manual
path renders one `FieldText` per submission language, the primary marked
required (enforced as any-one-language — A12, f-a12).
Server validation (`PKP\funder\Repository::validate()`): name-or-ror
required (`submission.funders.funderNameOrRorRequired`), ROR id shape and
grant DOI regex from `lib/pkp/schemas/funder.json`; the funders API
(`PKPFunderController::add()/edit()`) blanks the manual name whenever a
ROR is set and drops grant rows with no name, number and DOI before
validating. Registry-name fallback: `Funder::name()` maps the stored ROR
record's names onto the submission's languages when no manual name exists.
Grant-number check: `Repository::validate()` queries
`https://zenodo.org/api/awards` only when `funderGrantValidation` is on
AND the funder's ROR is in `Repository::AWARD_FUNDERS` (26 funders);
failure adds `submission.funders.grantNumberInvalid`; any request error is
swallowed (`continue`) — the silent skip, live-confirmed 2026-08-28: on a
scratch journal with validation on, a nonsense grant number for NIH (a
supported funder) saved without complaint while the registry was
unreachable (A11, f-a11). Panel validation live-confirmed the same day:
no-funder message, DOI-format message, blank grant row silently dropped,
and the failed-save summary "Please correct one error." with Save
disabled; panel strings byte-identical on OMP/OPS.

<a id="fn-e"></a>
**e — delete, ordering, silence.** Delete:
`useFunderManagerActions.js::fundersDeleteFunder()` — dialog title
`common.delete`, message `common.confirmDelete` ("Are you sure you wish to
delete this item? This action cannot be undone."), buttons `common.ok` /
`common.cancel`, then DELETE `…/funders/{id}`. Ordering:
`FunderManagerSortButton.vue` toggles `grid.action.order` ("Order") /
`grid.action.saveOrdering` ("Save Order");
`FunderManagerCellActions.vue` swaps the row menu for `TableCellOrder`
up/down while sorting; save PUTs the id sequence to `…/funders/order`
(`PKPFunderController::saveOrder()`, sequence numbers written 1..n;
`getMany` orders by sequence — a never-reordered funder holds sequence 0,
which is why a newly added funder lists FIRST among previously ordered
ones: A7, live-probed 2026-08-28, held on reload). Delete dialog and
ordering flow live-confirmed 2026-08-28. Silence: `PKPFunderController`
writes no email, no
notification and no event-log entry on any of its five operations (code
reading — the controller's methods touch only the funder rows).

<a id="fn-f"></a>
**f — the reader block.** OJS `templates/frontend/objects/
article_details.tpl` (`#funding-data`): section heading
`submission.funders`, per funder the localized name plus the ROR icon
(`$rorIdIcon`, assigned by `ArticleHandler`) linking to `$funder->ror`;
per grant `grantName`, `submission.funders.funder.grant.number` ("Grant
Number"), `submission.funders.funder.grant.doi` ("Grant DOI") linking
`https://doi.org/{grantDoi}`; the whole section skipped without funders.
OMP `monograph_full.tpl` (catalog book page, icon from
`CatalogBookHandler`) and OPS `preprint_details.tpl` (icon from
`PreprintHandler`) carry byte-identical funder markup — forked copies,
each probed live 2026-08-28: identical rendering on the OJS article page,
OMP catalog book page and OPS preprint page (heading, name, ROR-mark link
to the registry record opening in the same tab, grant name / "Grant
Number" / "Grant DOI" as a `doi.org` link), and the absence control —
a published item with no funders — showed no block on any of the three.
The same template file also renders the Funding Statement
and Data Availability sections — owned by *Publication metadata* per the
campaign's ownership split.

<a id="fn-g"></a>
**g — submission-wide storage.** `lib/pkp/schemas/funder.json` keys a
funder by `submissionId` only (required prop; no publication id);
`PKPFunderController::getMany()` filters by the authorized submission and
ignores the `{publicationId}` in its own route; `saveOrder()` likewise.
Since the 2026-08-28 schema move (f-a13) the list rides on the
submission's payload (`PKP\submission\maps\Schema::mapByProperties()`,
case `funders`), which every version's "Funding" screen reads; the
publication's payload no longer carries a `funders` property.

<a id="fn-h"></a>
**h — anonymized review.** Funders ride on the submission's payload, not
the publication's, since pkp-lib `747af277af` (pkp/pkp-lib#13003, "Move
funders from publication schema to submission schema", 2026-08-28, the
same move f-a13 records): `PKP\submission\maps\Schema::mapByProperties()`
carries the `funders` case and empties the list when authors are
anonymized (`$anonymizeAuthors`, the flag the review surfaces pass for
author-anonymous review types); `PKP\publication\maps\Schema` has no
`funders` case any more. No reviewer screen fetches a submission: the
review page (`reviewer/submission/{id}`, `reviewer/step/{id}`) requests
nothing of the submission's data, and "View All Submission Details"
fetches `GET …/submissions/{id}/publications/{pubId}`, a publication.
Test-run 2026-09-16 (OJS and OMP, scenario 6): on the anonymous and the
open assignment alike, the review screen and the details window showed no
funders list and no funder name, and the fetched publication carried no
`funders` key (its `authors` empty on the anonymous assignment and
carrying the contributor on the open one, so the data is un-anonymized
there and the missing funders are not anonymization); on OMP every
response the reviewer's browser received from the dashboard on was read
and none carried the funder's name, while the manager's own Funding
screen's `GET …/submissions/{id}` carried it. The submission-level
withholding is therefore code-read only, with no reviewer-facing screen
or traffic to show it. The 2026-08-28 OJS observation (`funders` emptied
on the anonymous assignment's publication payload, full on the open one)
was made on a checkout that predates the move. Whether the publication's
`fundingStatement` is withheld is *Publication metadata*'s field and is
not verified here.

<a id="fn-i"></a>
**i — the French interface.** Live-probed 2026-09-30 (Rule 14; A14) at
ojs `7ce98ec09e`, omp `3b0ecf794c`, ops `c8af945bb7` (lib/pkp
`3dc90c81a6`), OJS, OMP and OPS, two runs, each on a scratch context
with English and French (Canada) as interface languages, as its
manager and as the submitting Author, on a submission queued at
Production with an empty list, one with references and media, and a
published one; every French read paired with the same read in English
(no code on the funders surfaces there). French on screen: "Trier" /
"Enregistrer l'ordre" (pressed), the row menu "Modifier" / "Supprimer",
the delete dialog "Supprimer" / "Êtes-vous certain-e de vouloir
supprimer cet élément ? Cette opération est irréversible." / "OK" /
"Annuler" (read, then left), and in the panel "Fermer", "Supprimer"
under the chosen funder, "* Obligatoire", "Aucun élément" for an empty
grant table, "Ajouter", "Enregistrer". A funder typed in the French
panel ("Fondation fri30a r1", typed text picked; the registry query was
answered empty in the browser, as on the suites' installs) saved with
the funders POST answering 200 and was listed right after the save and
after a reload, on all three apps in both runs; its "Edit" panel read
the same codes. The Author's list, with the funder on it, read the same
codes on all three apps. No
request failed, none answered ≥ 500, and no script error was logged.
Not read in French: the wizard's Funders section and Review step, the
panel's validation messages and the landing page's Funders block.
Mechanism: none of the `submission.funders.*` keys has an entry in lib/pkp
`locale/fr_CA/submission.po`, nor `common.moreActions` in
`locale/fr_CA/common.po`; the client prints the key in place of the text.
The frame's `##submission.funding##` (menu entry, page heading) is
*Workflow screen & stage access*' A11.

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** One scratch submission (any stage before
publication) in the seeded journal; Journal Manager account. Needs the
journal's funders setting at its default ("ask" or any enabled level).
The registry leg needs internet BOTH browser-side (the suggestions come
live from the public registry) and server-side (the record cache) — the
campaign's test installs block server-side egress, so there the registry
leg deterministically fails per A3 and suites cover the typed-name path
plus A3's failure shape instead. "Search a well-known funder" — e.g.
"National Institutes of Health"; the grant DOI needs only the right
shape, not a real DOI (validation is format-only unless the
grant-validation setting is on). There is no funder seed key: funders
are always recorded through the panel, here and in every scenario whose
given holds one. The empty save, the DOI-format refusal and the dropped
blank grant row are the panel validations fn d records. Mail is read in
the mail catcher (Mailpit, `http://127.0.0.1:8025`), scoped by the
submitter's address, so the submitter is a throwaway account (created on
a scratch context, the only place users are created, and submitting to
the seeded journal, as U40's scenario 1 does); the absence is read
against a positive control the test itself sends the same way
(scenarios.md "Mailpit"). The log is the submission's Activity Log &
Notes → History, read before and after the edits.

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** A roster author account; journal at the
default funders level ("ask"). The wizard reaches Details after Files;
the section sits at the step's end. The manual-name path avoids the
internet dependency if the registry is unreachable.

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** One scratch submission published with a
manual (typed-name) funder carrying one fully filled grant, a second
manual funder ("Second Foundation") and a registry-backed funder, and
one published without funders as the absence control. The submission is
seeded `published: true`; the funders are recorded on it through the
workflow panel by the Journal Manager (ready account; the edit gate
allows it on a published item, Actors), and the order is saved with the
workflow's "Order" / "Save Order" after all three are recorded, so A7's
jump-ahead does not apply. On a press the landing page is the catalog
book page; on a preprint server the posted preprint's page. Live-run
2026-08-28 on all three apps, absence controls clean. Where the server
cannot reach the registry the registry funder renders nameless (A3) — its
ROR-mark link still resolves (fn-f) — which is why the name, grant and
order assertions ride on the manual funders; the suites cover the manual
funders only.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** Scratch journal (the setting is mutated;
fresh scratch contexts start at "Ask…", fn c), one scratch submission
seeded `published: true` with a funder recorded through the workflow
panel afterwards (no funder seed key, s1), so the landing-page read with
the setting off has a page (fn c), plus a throwaway author account for
the wizard leg. The "previously recorded funders intact" check is the
"Ask" re-pick leg's observable; the save on "Do not request…" before it
is Rule 2's enabled level. The author's draft carries an uploaded,
genre-assigned file, so that at "Require" the funders warning is the
only notice on the Review step and Submit stays enabled (f-a1: with any
other blocking error present, Submit is disabled and the warn-only
behaviour cannot be told apart).

<a id="fn-s5"></a>
**s5 — scenario 5 seeding.** Seeded journal. The Author is the roster
author who submitted the scratch submission (`submitter`); the funder is
recorded through the workflow panel by the Journal Manager (ready
account), who is also the control, since there is no funder seed key
(s1); the OJS-A and OMP-A tests already drive this leg. The
preprint-server leg is the same seed on the seeded preprint server with
`published: false` (the OPS1 test; fn a, f-ops1), the author's own "Add
Funder" and "Edit" bounded by the funders API responses as in s1.

<a id="fn-s6"></a>
**s6 — scenario 6 seeding.** Two scratch journals from `POST
scenarios/context`, each with throwaway accounts (a manager, an author
as `submitter`, an `externalReviewer`): one at the install defaults
("Default Review Mode" "Anonymous Reviewer/Anonymous Author", seed-facts
"Settings › Workflow › Review"), one with `review.defaultReviewMode:
open`; each with one submission seeded `decisions:
['sendExternalReview']` and `reviewRounds: [{reviewers: [{username,
status: 'accepted'}]}]` (OMP: the external round), the builder stamping
the assignment's review type from the context's default (seed-facts,
2026-09-05), and one manual funder recorded on it through the workflow
panel by the journal's manager (no funder seed key, s1). The read is the
page's own traffic, the publication request the reviewer's "View All
Submission Details" window makes (`GET
…/submissions/{id}/publications/{pubId}`), captured in the browser's
network view or by the suite's response listener; fn h holds the probed
shape (no `funders` key on the publication either assignment fetches,
the withholding sitting on the submission map that no reviewer screen
requests). The control is the manager's own Funding screen reopened on
the same submission, whose `GET …/submissions/{id}` carries the funder's
name: the same read finds the name where a screen does fetch the
submission (test-run 2026-09-16, OMP). OPS answers 400 on `review` and
`reviewRounds` (scenarios.md "OPS:"), so the suite there carries nothing
for this scenario.

<a id="fn-f-a1"></a>
**f-a1 — A1 evidence.** Live-probed 2026-08-28 on OJS and OPS (OMP not
run): with the setting at require and no funders declared, the Review step
showed "Funders are required.", Submit stayed enabled, and the submission
completed. Mechanism: the warning in `review-details.tpl` is a
`<notification>` bound to `publication.funders.length` and the `require`
setting — it is not added to the wizard's `errors` object that disables
submit; `PKP\publication\Repository::validate()` enforces
`METADATA_REQUIRE` for the plain-language summary but contains no funders
check at all (grepped 2026-08-28, pinned checkouts). Warn-only is
observable only in isolation: with any other blocking error present
(e.g. the missing-file error), Submit is disabled and the funders warning
is easy to mistake for blocking — the isolated re-run (2026-08-28, OJS: a
draft with an uploaded, genre-assigned file, no funders, require on)
reached "Submission complete".

<a id="fn-f-a2"></a>
**f-a2 — A2 evidence.** fn-g's storage facts. The workflow's version
navigation offers "Funding" under each version
(`getPublicationVersionItems`), while the list is submission-keyed.
Live-probed 2026-08-28 (OJS): a grant edited while viewing the old
published version read changed under the current version too.

<a id="fn-f-a3"></a>
**f-a3 — A3 evidence.** On a registry pick the browser POSTs the registry
record to the local `rors/` API; `PKPRorController::addOrEdit()` ignores
the client-supplied record and re-fetches
`https://api.ror.org/v2/organizations/{id}` server-side — any fetch
failure answers 404, the UI raises the generic error dialog, and the
subsequent funder save stores `ror` with an empty `name` (the funders API
blanks manual names whenever a ROR is set; `Funder::name()` then has no
cached record to fall back on). Live-probed 2026-08-28 on all three apps;
deterministic on the campaign's test installs, whose servers have no
outbound internet access.

<a id="fn-f-a4"></a>
**f-a4 — A4 evidence.** Live-probed 2026-08-28, two runs per app: after a
200 save on OMP and OPS the wizard section's table stayed at "No funders
have been added." and the wizard's Review step read "Funders — None
provided"; a full page reload brought both current (the saved name then
listed). OJS refreshed in place. Same shared `FunderManager` component on
all three (identical ui-library commit) — the per-app difference is
unexplained at code level.

<a id="fn-f-a5"></a>
**f-a5 — A5 evidence.** Live-probed 2026-08-28 (OJS; shared ui-library
components): the `TableCellOrder` up/down buttons expose no accessible
name; in the multilingual name boxes the primary input's accessible name
concatenates both languages' labels and the secondary input has none.

<a id="fn-f-a6"></a>
**f-a6 — A6 evidence.** `FieldAffiliationsRorAutoSuggest` with
`allowCustom: true` renders the typed text as the first option,
pre-highlighted, without the country subscript or ROR icon a registry
option carries. Live-observed 2026-08-28: two independent probe sessions
picked the typed-text option while intending the registry match.

<a id="fn-f-a7"></a>
**f-a7 — A7 evidence.** fn-e's sequence mechanics (new funder holds
sequence 0; ordering writes 1..n). Live-probed 2026-08-28 (OJS): the new
funder listed first above the ordered rows and held that place on reload.

<a id="fn-f-a8"></a>
**f-a8 — A8 evidence.** Live-probed 2026-08-28 on OJS (including after a
fresh page load), OMP and OPS: from a journal saved at "Ask the
author…", untick "Enable funder metadata", save, re-tick — the first
radio, "Do not request funder metadata from the author during
submission.", arrives checked; the saved "Ask" level is not restored.

<a id="fn-f-a9"></a>
**f-a9 — A9 evidence.** Observed 2026-08-28: `ror.org` intermittently
served the query URL without CORS headers, the browser's fetch failed, and
the field rendered no suggestions and no error (console-only failure).
External trigger; the silence is the field's own handling of any failed
query.

<a id="fn-f-a10"></a>
**f-a10 — A10 evidence.** The campaign's test installs block server-side
outbound HTTP, so the `rors/` cache write always fails there (f-a3). The
working path — registry record cached, `Funder::name()` mapping registry
names onto the submission's languages — is code-read only (2026-08-28,
pinned checkouts).

<a id="fn-f-a11"></a>
**f-a11 — A11 evidence.** `Repository::validate()` attaches
`submission.funders.grantNumberInvalid` to the offending row's
`grants.{i}.grantNumber` — the basis for the "appears on the grant row"
lean. Live-probed 2026-08-28 (OJS scratch journal, validation on): only
the unreachable branch was reachable — nonsense NIH grant number
`XXNONSENSE99ZZ` saved silently; message text read from the locale file,
never seen rendered.

<a id="fn-f-a12"></a>
**f-a12 — A12 evidence.** Live-probed 2026-08-28 on OJS, on a scratch
journal with English (primary) + French (Canada) submission languages:
the English box carried the "* Required" marker and the `required`
attribute; clearing it and saving with only the French box filled
("Fonds bilingue FR") was accepted — the panel closed, the stored names
were empty English + the French value, and the row rendered the French
name. Server rule (`PKP\funder\Repository::validate()`,
`submission.funders.funderNameOrRorRequired`): a name in any one language
or a ROR id satisfies the save; no primary-locale check exists. The panel
is the shared `FunderEditForm` on all three apps; the enforcement gap was
probed on OJS only.

<a id="fn-f-a13"></a>
**f-a13 — A13 evidence.** Upstream pkp/pkp-lib#13003 (commit 747af277a)
moved `funders` from the publication schema (`publication.json`) to the
submission schema (`submission.json:120`). The manager table is computed
from `publication.funders` (ui-library
`src/managers/FunderManager/funderManagerStore.js:25`,
`items: computed(() => publication.value?.funders ?? [])`) and never
fetches the funders collection — zero funders GETs in the network log.
The save POST to `/api/v1/submissions/{n}/publications/{n}/funders`
returns 200 and the funder persists on the submission: GET
`submissions/{n}` contains it; GET `submissions/{n}/publications/{n}` no
longer carries a `funders` property; GET `…/publications/{n}/funders`
returns it with a `submissionId` and no `publicationId`. Live-probed
2026-08-29 on OJS (submission 156 / publication 167, manager role,
typed-name funder): row absent after the save and after a cold reload;
the reader page's `#funding-data` block shows it. Suites: S1–S4 plus the
per-app specific tests fail identically on OJS, OMP and OPS at the
2026-08-29 tips (ojs 0471e029b9 / omp d34542e83 / ops 28d4cb1dff,
lib/pkp 13b621e42) — the entire suite red at main is this one break;
per convention the tests stay red until the upstream fix lands (the reds
are the bug, not drift).
Retired 2026-09-03: fixed upstream by ui-library `f88b7e6a` ("pkp/pkp-lib#13003
Move funders to submission"), which points `funderManagerStore` at
`submission.funders`. Verified green on OJS at `979819ae45` on 2026-08-29
(full Funding suite; ui-library pointer bumped in `87e6c700c5`, UI rebuilt);
on 2026-09-03 `f88b7e6a` sits in OMP's and OPS's `lib/ui-library` (OMP
`a1aefa3fe`, OPS `6bda92fb03`) and the apps' own e2e runs at those tips are
green (pkp/omp run 33629780688, pkp/ops run 33629815586, both 2026-09-02).

<a id="fn-f-a14"></a>
**f-a14 — A14 evidence.** Live-probed 2026-09-30 (fn i's probe): every
code listed in A14 read on all three apps in both runs, as the manager on the
empty, the filled and the published submission, and in the "Add
Funder" panel before and after the typed text was picked and in the
"Edit Funder" panel; `##submission.funders##` also as the table's
`aria-label`, `##common.moreActions##` as the screen-reader-only column
header and as each row's "…" button name. The English control read
"Funders", "Add Funder", "Funder Name", "No funders have been added."
and the panel's English labels.

<a id="fn-f-ops1"></a>
**f-ops1 — OPS1 evidence.** Live-probed 2026-08-28: the OPS submitting
author's workflow Funding list offered working Add/Edit/Order on their
unposted preprint; the OJS and OMP authors saw the read-only rendering
(fn-a). Mechanism: the publication-edit permission the manager config
passes (`canEditPublication`) evaluates true for the OPS author before
posting.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Funding list (workflow) | workflow screen → Publication → "Funding" | AFFW-401 · VUE-039 |
| "Add Funder" button | above the funders table | AFFW-552 |
| "Order" / "Save Order" button | above the funders table | AFFW-551 |
| Row move up / move down (ordering mode) | funders table rows | AFFW-553 |
| Row "Edit" | funders table row "…" menu | AFFW-554 |
| Row "Delete" | funders table row "…" menu | AFFW-555 |
| Delete confirmation ("OK" / "Cancel") | dialog | AFFW-556 |
| Add/Edit Funder panel ("Save" / "Close") | side panel | AFFW-557 · VUE-061 |
| Funders section in the wizard | submission wizard, Details step | rider on the wizard shell (owned by *[Submission wizard](U21-submission-wizard.md)*) |
| Funders block on the landing page | published item's landing page | AFFR-063 (funders portion; the funding-statement / data-availability portions ride with *Publication metadata* per the campaign's split) |
| Funders API | `submissions/{id}/publications/{id}/funders` (list, get, add, edit, delete, order) | API-020 |
| Funder record shape | — | SET-014 |

## Reference — code anchors

- `lib/pkp/api/v1/funders/PKPFunderController.php` — the five funder
  operations and their role/publication policies.
- `lib/pkp/classes/funder/Funder.php`, `Repository.php`, `maps/Schema.php`
  — model (registry-name fallback), validation (name-or-ror, Zenodo grant
  check), payload mapping; `lib/pkp/schemas/funder.json` — the record
  shape.
- `lib/pkp/classes/components/forms/funder/FunderEditForm.php` +
  `FieldFunder.php` / `FieldFunderGrants.php` — the panel's server-side
  form.
- `lib/ui-library/src/managers/FunderManager/*` — table, store, actions,
  modal (same commit in all three apps);
  `src/components/Form/fields/FieldFunder.vue` / `FieldFunderGrants.vue` /
  `FieldAffiliationsRorAutoSuggest.vue` — the panel's fields.
- `lib/pkp/pages/submission/PKPSubmissionHandler.php`
  (`getDetailsStep()`, `SECTION_TYPE_FUNDERS`) +
  `lib/pkp/templates/submission/wizard.tpl` / `review-details.tpl` — the
  wizard mount and the require warning.
- `lib/pkp/classes/components/forms/context/PKPMetadataSettingsForm.php` +
  `lib/pkp/schemas/context.json` (`funders`, `funderGrantValidation`) —
  the settings.
- `templates/frontend/objects/article_details.tpl` (OJS) /
  `monograph_full.tpl` (OMP) / `preprint_details.tpl` (OPS) — the reader
  block (forked copies).
