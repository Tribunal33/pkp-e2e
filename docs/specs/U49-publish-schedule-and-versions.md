---
name: publish-schedule-and-versions
status: verified
---

# Publish, schedule & versions {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every step before this one prepared the submission. This feature is the
last mile: an editor takes a publication version live. On a journal that is
the **Schedule For Publication** flow, where the editor chooses whether the
article joins an issue, goes live at once, or waits as *scheduled* until its
issue is published. On a press the **Publish** button makes the catalog
entry public. On a preprint server the **Post** button posts the preprint.
The same feature owns the way back (**Unpublish** / **Unschedule**) and the
version machinery: creating a new version of a published work, the version
stages and numbering ("Author Original", "Version of Record 2.1"), the
version list in the workflow's side menu, and the status readout
("Status: Published") that every role sees.

A preprint server's screens say **Post**/**Unpost**/**Posted** where a
journal's say Publish/Unpublish/Published, and its confirmation window is
titled "Post the preprint". The press's per-submission "Catalog Entry"
page and its catalog flags belong to
[Catalog management](U70-catalog-management.md); this spec owns only the act of
publishing. A journal's issues themselves, meaning creating, ordering and
publishing them, belong to [Issues](U50-issues.md); this spec owns the
issue-assignment choices offered while publishing an article.

## Actors & permissions

Who reaches the workflow screen at all is
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
**May publish** below is one gate shared by every control in
this feature: the user's role on the Production stage is Journal Manager,
Editor or Site Administrator, and they are not a recommending editor.
Section Editors, Guest
Editors and assistant roles never get these controls, however they are
assigned ⚠ [A2](#a2). On a preprint server that includes the Moderator
role, the role the server's own submission screens say will "review and
post" preprints. <sup>a</sup>

| Action | Who may — and when |
|--------|--------------------|
| **Publish** (journal: "Schedule For Publication"; press: "Publish"; preprint server: "Post") | • may-publish roles: while the shown version is not yet published or scheduled ⚠ [A2](#a2)<br>• the submitting Author on a preprint server: never by default. The confirmation window lists "You can not post your own preprint. It must be approved and posted by a moderator." as an unmet requirement. A screening plugin can lift this, but even then the author's workflow view offers no Post control ⚠ [OPS3](#ops3) <sup>b</sup> |
| **Unschedule** | • may-publish roles: while the shown version's status is "Scheduled" <sup>c</sup> |
| **Unpublish** ("Unpost") | • may-publish roles: while the shown version's status is "Published" <sup>c</sup> |
| **Preview** | • may-publish roles: on a not-yet-published version once the submission has moved past the Review stage (journal, press), and always on a scheduled version. This row is about the Preview among the publishing controls. The workflow window's own header shows a separate Preview/View button to every role; on a journal that header button waits for the Review stage too, so the window of a submission still in review carries no Preview anywhere {OJS} <sup>d</sup> |
| **Create New Version** | • may-publish roles: the side menu's "Create New Version" item, offered whatever the current version's state <sup>e</sup> |
| **Fill the publishing details** (Publication Settings page {OJS} / Preprint Entry page {OPS}; the "Review Publishing Details" panel {OJS}) | • may-publish roles. The entry pages additionally save for whoever may edit the publication (see [Publication metadata](U40-publication-metadata.md)) <sup>f</sup> |
| **Switch versions / read the status** | • every role the Publication area admits, the Author included. The side menu lists each version by name, and every version page heads with "Status: {state}" <sup>g</sup> |

## Fields & validation

Three surfaces carry fields. Everything else in this feature is buttons and
confirmation windows.

**"Review Publishing Details" panel {OJS}**: the side panel a journal opens
on the way to publishing, when the version still needs its details
(Rule 3). <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Publication Stage | Yes | Select: Author Original · Published Manuscript Under Review · Version of Record. |
| Revision Significance | Yes | Major Revision / Minor Revision. "Minor Revision" can be selected only when a version of the chosen stage already exists (Rule 12). |
| Update Type | No | Select, "New Version" preselected. The other choices name the reason for the version (Correction, Erratum, Retraction, …). |
| Summary of Changes (Amendment Notice) | No | Rich text, multilingual. The screen describes it as the public amendment notice, but no reader page shows it (Rule 13) ⚠ [A5](#a5). An "Insert Content" button on the submission-language box offers the change summaries authors saved with their review revisions (Rule 14). |
| Issue Assignment | Yes | Radio. The choices offered depend on which issues the journal has (Rule 5): Don't Assign To An Issue · Assign To Future Issue and Publish Immediately · Assign To Future Issue and Schedule Only · Assign To Current/Back Issue. The panel opens with the saved choice preselected. With nothing saved, "Assign To Current/Back Issue" is preselected, with no issue chosen, whenever the journal has a published or back issue; a Confirm without an issue is refused with "This field is required." under the group. With only future issues nothing is preselected, and the first pick misfires ⚠ [OJS2](#ojs2). |
| Issue | Yes, when the assignment names an issue | Select over the matching issues (future or published, per the chosen assignment). |
| Associated review round | No | Select over the submission's review rounds. It arrives pre-filled with the round ("Round 1 — opened {date}") only on the version the round was opened for, the submission's original one, so an untouched publish there keeps the link. On a version created afterwards with "Create New Version" it arrives at "Select a review round", the round listed greyed and not choosable. A "Published Manuscript Under Review" version without a round is refused (Rule 7). |

**Create New Version dialog** (all apps; Rule 11): "Which version should
metadata be copied from?" (a select over the existing versions), Publication
Stage (arrives preselected with the copied version's stage, and empty when
that version has none), and Revision Significance (same minor rule; "Minor
Revision" preselected whenever the stage allows it, empty with the stage),
with Confirm/Cancel. An untouched Confirm on a staged version therefore
answers everything (Rule 11). In French only the dialog's title and
buttons read French; its other texts are raw codes ⚠ [A10](#a10).
<sup>i</sup>

**Publication Settings page {OJS} / Preprint Entry page {OPS}**: the
Publication area's entry page. A press's counterpart is the Catalog Entry
page, described in *Catalog management*. It saves onto the shown version.
In French most of its headings and descriptions are raw codes
[A10](#a10). <sup>j</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Issue Assignment + Issue {OJS} | Yes | The same radio and select as the panel above. Every "Save" of the page stores the choice shown, whichever field the save was pressed for (Rule 3a), and a saved choice arrives pre-checked when the panel opens. The exception is "Assign To Future Issue and Schedule Only" on a journal with no published issues, which comes back as the immediate-publish choice ⚠ [OJS2](#ojs2). With nothing saved, the page arrives as the panel does. On a journal with a published issue that is "Assign To Current/Back Issue" with "Issue" empty, and every "Save", even one pressed for another field, is refused ("Please correct one error." / "Go to Issue: This field is required.") until an issue or "Don't Assign To An Issue" is chosen; a new version of an article published without an issue arrives the same way. On a journal whose only issues are future ones nothing is checked, and a save pressed for another field records "Don't Assign To An Issue" [OJS2](#ojs2). |
| Section {OJS OPS} | Always has a value | Defaults to the submission's section. The select offers no empty choice, so it cannot be blanked. It carries no on-screen required mark; only Issue Assignment and Issue are marked "Required". |
| Publication Date {OJS} / Date Posted {OPS} | No | Must be a date in the form YYYY-MM-DD ("The date must be in the format YYYY-MM-DD, such as 2019-01-01."). The description warns to leave it empty unless backdating, because the date is normally set by publishing (Rule 8). On a press or preprint server a FUTURE date entered here is what schedules the item (Rule 6). |
| Update Type · Summary of Changes | No | As on the panel above. On a preprint server the summary box has no "Insert Content" button. |
| Cover Image · Pages {OJS} · URL Path | No | Display extras of the published item. |

## Rules & state

1. **A version's states.** Every version is in exactly one of three states.
   Not yet published: the readout is **"Status: Unscheduled"** on the
   version readers would get (with nothing published, that is the highest
   version, by stage then number), worded **"Unposted"** on a preprint
   server, and **"Unpublished"** on any other version, in every app.
   **"Scheduled"**: accepted for publication and waiting (Rule 5/6).
   **"Published"** ("Posted" on a preprint server). The readout heads every
   Publication page as "Status: {state}" with a colored dot. A journal's
   in-between states (an issue choice saved but not yet confirmed) also
   read "Unpublished". <sup>g</sup>
2. **One flow, staged differently per app.** The publish button sits at
   the top right of the Publication area for may-publish roles. It is
   labeled **"Schedule For Publication"** on a journal (it reads
   **"Publish"** only once the submission itself counts as published,
   which takes a published final-stage version, Rule 8 ⚠ [A3](#a3)),
   **"Publish"** on a press, and **"Post"** on a preprint server. A press
   or preprint server goes straight to the confirmation window (Rule 4). A
   journal first opens the "Review Publishing Details" panel when needed
   (Rule 3). The Submission stage's own "Schedule For Publication" shortcut
   button belongs to that stage (see
   [Submission stage](U25-submission-stage.md#schedule)); it lands on this
   area. The Production stage view shows a same-labeled action button
   ("Post the preprint" on a preprint server) to every role who can open
   the stage, publish-excluded roles included. For them it merely lands on
   a Publication area with nothing to press ⚠ [A2](#a2). Nothing
   stage-gates the real publish button either: a journal submission still
   in External Review already offers "Schedule For Publication". Only
   Preview waits for Review to pass (Actors). <sup>k</sup>
3. **The details panel opens only while details are missing {OJS}.**
   Pressing the journal's publish button opens "Review Publishing Details"
   (Fields) if the version has no Publication Stage yet, no saved issue
   choice, or has since been unpublished (Rule 9). Confirm saves the
   choices and continues to the confirmation window. When a saved issue
   choice and stage are already in place on a version never yet
   published, the button skips the panel and opens the confirmation
   window directly (Rule 3a). The panel opens with the saved issue choice
   preselected. With nothing saved, it uses the same default as the Fields
   table above. <sup>h</sup>
3a. **What counts as saved {OJS}.** Any "Save" of the Publication
   Settings page saves an issue choice, whatever field it was pressed
   for, because the page always stores the Issue Assignment it shows. On
   a journal with no issues the page stores no issue choice, and the
   panel still opens after a save there. The stage comes from an earlier
   act such as a panel save, the version dialog or a prior publish (the
   settings page itself carries no stage field). <sup>h</sup>
3b. **A new version's first publish {OJS}.** A version made by an
   untouched version dialog (Rule 11) has its stage, but the issue it
   copied does not count as a saved choice. So its first press of the
   publish button opens the panel, arriving with the copied stage,
   "Minor Revision" and, for an article in an issue, "Assign To
   Current/Back Issue" with that issue chosen. A save of its Publication
   Settings page beforehand, even of only an Update Type, makes the
   button skip the panel (Rule 3a). <sup>h</sup>
3c. **A refused Confirm {OJS}.** A Confirm missing a Publication Stage,
   a Revision Significance or the issue its assignment names stays in
   the panel, with "This field is required." under the empty field
   (Fields). A Confirm refused with the passing notice "The form was
   not saved because 1 error(s) were encountered. Please correct these
   errors and try again.", such as a required summary's (Rule 4),
   marks nothing in the panel. On a version with no Publication Stage
   yet it opens a second panel over the first, "Publication Stage" and
   "Revision Significance" empty, and one "Cancel" closes both
   ⚠ [OJS5](#ojs5). <sup>h</sup>
4. **The confirmation window.** The final window is titled "Schedule For
   Publication" on a journal and press, and "Post the preprint" on a
   preprint server. It shows, in order: an optional warning list ("The
   following issues were found, but will not prevent publishing"; none in
   a stock install, plugins add them), then either the confirmation text
   with a Publish/Post/Schedule For Publication button, or, when
   requirements are unmet, "The following requirements must be met before
   this can be published." ("…posted." on a preprint server) with the
   list and **no confirm button at all**. The confirmation text opens "All
   publication requirements have been met." ("All requirements have been
   met." on a preprint server) and names the version: "The publication
   version is "{version}"". The exception is a press or preprint server
   publishing a version with no stage yet. It shows "The publication must
   have a version stage assigned before it can be published." instead: a
   sentence phrased as an unmet requirement right under the all-met line,
   though it blocks nothing ⚠ [A7](#a7). On a journal whose settings
   *require* a plain language summary, the panel's Confirm is refused,
   even with a summary saved, and nothing names it (Rule 3c)
   ⚠ [OJS1](#ojs1); only a version skipping the panel (Rule 3) reaches
   the window ⚠ [OJS6](#ojs6).
   Confirming closes the window, and the Publication area shows the new
   state at once: the head's status and, in place of the publish
   button, "Unpublish" ("Unpost") or "Unschedule" (Rules 6, 8, 9).
   This holds after "Review Publishing Details" or directly (Rule 3).
   <sup>l</sup>
5. **What the issue choice decides {OJS}.** The four assignments map to
   outcomes. Only the choices the journal's issues allow are offered: with
   no future issue there are no "Future Issue" options, and with no issues
   at all Rule 15 applies.

   | Choice | Outcome on confirm |
   |---|---|
   | Don't Assign To An Issue | Published at once, no issue ("…published immediately without any issue association…"). A newer version of an article already in an issue, published this way, stays listed in that issue, on its page and in its current-issue web feeds, under the newer version's title ([Issues](U50-issues.md#a17)) |
   | Assign To Future Issue and Publish Immediately | Published at once as continuous publication, listed with its still-unpublished issue ("…published immediately as continuous publication even though it is assigned to {issue} which is not published yet…") |
   | Assign To Future Issue and Schedule Only | **Scheduled**. The window's text promises "…published when {issue} is published…" and its button reads "Schedule For Publication" |
   | Assign To Current/Back Issue | Published at once into the chosen issue ("…published immediately in {issue}…") |

   ⚠ On a journal with no published issues (a future issue only), the
   panel does not honor the FIRST pick of "Assign To Future Issue and
   Schedule Only". The window offers immediate publication instead
   ("…published immediately…", button "Publish"), and confirming
   publishes at once [OJS2](#ojs2). Saving the choice on the Publication
   Settings page beforehand fares no better on that journal: the saved
   "Schedule Only" comes back as the immediate-publish choice. Only
   changing the radio to another choice and picking "Schedule Only" again
   before Confirm yields the promised scheduling window.

   A scheduled article goes live when its issue is published. Releasing
   it is part of publishing the issue (see [Issues](U50-issues.md)), not a
   clock. <sup>m</sup>
6. **Scheduling on a press or preprint server is by date.** There is no
   issue step. Publish/Post with the entry page's date field empty ("Date
   Published" on the press's Catalog Entry page, "Date Posted" on Preprint
   Entry) publishes now and stamps today. With a FUTURE date saved there,
   it sets status "Scheduled" instead. Neither window says so: the press's
   still promises to "make this catalog entry public" ⚠ [OMP1](#omp1),
   and the preprint server's still asks "…post this?" ⚠ [OPS1](#ops1). A
   scheduled press item is published by a once-daily background check
   when its date arrives. A preprint server has no such check, so a
   scheduled preprint waits forever unless someone unschedules and
   re-posts it ⚠ [OPS1](#ops1). <sup>n</sup>
7. **What blocks publishing.** The requirements list (Rule 4) refuses the
   following. In every app: a declined submission ("A declined submission
   can not be published." / "…posted."), and a contributor's
   unauthenticated or duplicated ORCID iD when ORCID is enabled (see
   [ORCID integration](U04-orcid-integration.md)). On a journal: an
   assigned issue that no longer exists; an unpaid publication fee once
   publication fees are fully in force (enabling payments and setting the
   fee is not enough, the chosen payment method must itself be completely
   set up, which is *Payments & APCs*'s territory); and a "Published
   Manuscript Under Review" version with no associated review round (the
   picker pre-fills the round only on the version the round was opened
   for, so such a version created after publishing is refused as it
   arrives, with nothing to clear; Fields). On a preprint server: the author
   block (Actors). On a journal the declined refusal comes one step late.
   The publish button first opens "Review Publishing Details", which
   requires, and saves, a Publication Stage and Revision Significance on
   the declined submission before the no-button window appears. A press
   or preprint server opens the refused window directly. <sup>o</sup>
8. **What publishing writes.** Going live stamps the publication date
   (today if the field was empty; a filled date is kept, even a past one),
   fills the empty copyright/license fields from the journal's defaults,
   and assigns a Publication Stage if none was chosen: "Version of Record"
   on a journal or press, "Author Original" on a preprint server, numbered
   as the next major version. It leaves the Author's assignment permission
   "Allow this person to make changes to the publication…" as it was: the
   Author's publication pages are read-only while the version is published
   and accept a save again once it is unpublished (the gate is in
   [Publication metadata](U40-publication-metadata.md#edit-gate)). On a
   journal or preprint server the reader page goes live at once, whatever
   the version's stage. The submission itself moves to the dashboards'
   published lists (see [My Submissions](U22-my-submissions.md) and
   [Submissions dashboard](U23-submissions-dashboard.md)) only when the
   published version's stage is the final one ⚠ [A3](#a3): "Version of
   Record" on a journal or press, "Author Original" on a preprint server.
   On a press the catalog page waits for that final stage too, so
   publishing a non-final version leaves it down ⚠ [A3](#a3). Scheduling
   performs none of the fills; they run when the item actually goes live.
   <sup>p</sup>
9. **Unpublish and Unschedule are one act with two names.** "Unschedule"
   appears on a scheduled version, "Unpublish" ("Unpost") on a published
   one. Each opens a red confirmation dialog whose confirm button repeats
   the action name. On a journal or press the dialog asks "Are you sure
   you don't want this scheduled for publication?" / "Are you sure you
   don't want this to be published?"; on a preprint server "Are you sure
   you don't want this to be scheduled to be posted?" / "…don't want this
   to be posted?". Confirming sets the version back to Rule 1's
   unpublished readout: "Unscheduled" ("Unposted") on the version readers
   would get, "Unpublished" on any other. Everything else is KEPT: the
   publication date, the issue choice {OJS}, the version number, the
   filled copyright fields. <sup>q</sup>
9a. **Unpublishing one of several versions.** The reader page goes down
   only when no published version remains. Unpublishing a later version
   while an earlier one is published leaves the page live serving that
   earlier version, its "Versions" list one entry shorter and headed by
   it. The other way round, "Unpublish" ("Unpost") on an earlier version
   while a later one is published sets only that version back: it reads
   "Status: Unpublished" with "Preview" and "Publish" ("Post"), the later
   version stays "Published" ("Posted"), and the reader page stays live as
   the later version (see [Article landing page](U13-article-landing-page-and-reading.md),
   its Rule 7b). <sup>q</sup>
10. **Publishing again re-decides from what was kept.** Because the date
    and issue survive (Rule 9), a re-publish behaves like a first publish
    with those values. On a journal the "Review Publishing Details" panel
    opens again (Rule 3), the kept issue choice and its issue pre-checked
    and the stage in place, so an untouched Confirm carries them on. The
    kept issue choice then decides the
    outcome again per Rule 5's table: an article kept as continuous
    publication goes straight live again, its issue still unpublished. A
    press or preprint item whose kept date has meanwhile passed goes
    straight live carrying the ORIGINAL date. <sup>q</sup>
11. **Creating a new version.** "Create New Version" (side menu) opens a
    dialog (Fields). Confirm creates a new version copying the chosen
    version's metadata, contributors, references and files-for-readers
    (galleys on a journal or preprint server, publication formats with
    their chapters on a press), with no publication date and not yet
    published. On a stage-assigned source the dialog arrives pre-answered
    (Fields), so an untouched Confirm yields a minor version of the same
    stage: "Version of Record 1.1", not an unassigned one. The side menu
    gains the version (Rule 11a). Readers keep getting the published version until the new one is
    published. Yet the reader page's date line changes at once: the
    unpublished draft's creation day appears as the public "Published"
    date ⚠ [A6](#a6). Nor can a reader reach the draft by address: on a
    journal the draft's own version address answers the plain "404 Not
    Found" page. A version address naming a number the article has no
    version under (a mistyped one) fails with a blank server error rather
    than that page ⚠ [OJS3](#ojs3). <sup>r</sup>
11a. **How a version is named.** The side menu names a version by its
    stage and number ("Version of Record 2.0"). A stage-less version
    reads "Unassigned version ({date})": an item's first until given a
    stage, or a copy of a stage-less version with none chosen (the
    dialog's stage select arriving on a stage offers no blank choice).
    Two made the same day share one name ⚠ [A9](#a9). <sup>i</sup>
12. **Version stages and numbering.** A journal and press know three
    stages: Author Original, Published Manuscript Under Review, Version of
    Record. A preprint server knows only Author Original. Numbering is per
    stage: a major revision starts the stage's next whole number ("2.0"),
    a minor one increments behind the dot ("1.1"). "Minor Revision" is
    offered only when the chosen stage already has a version. Switching
    the stage in the dialog silently re-selects "Minor Revision" whenever
    it is allowed, discarding a "Major" pick ⚠ [A4](#a4). Versions are
    never renumbered or deleted by this feature. <sup>s</sup>
13. **Update type and the amendment notice.** The Update Type and Summary
    of Changes save onto the version, and every screen carrying them
    promises the summary "will appear publicly as the version amendment
    notice". But after publishing, no reader page shows it in any app.
    Readers are never told what the version changed ⚠ [A5](#a5).
    <sup>t</sup>
14. **Insert Content {OJS OMP}.** The Summary of Changes box (panel and
    entry page) carries "Insert Content" on the submission-language text
    only. It opens a side panel listing the change summaries authors saved
    with each review revision file, newest first, each labeled
    "Review (Round {n}) • {date} • {file}" ("External Review (Round {n})
    • …" on a press). Choosing one appends its text after whatever the box
    already holds. With none saved it reads "No saved summaries found for
    this submission's review revisions." A preprint server has no review,
    so it has no such button. <sup>u</sup>
15. **A journal with no issues {OJS}.** With not a single issue created,
    the publish flow shows no issue fields at all and publishes
    immediately, without an issue. Scheduling is unreachable. With ORCID
    on under the member API, that publish fails when a contributor holds
    a verified iD ⚠ [OJS4](#ojs4). <sup>m</sup>
16. **Send to Text Editor {OJS OMP}.** The action lives on the workflow's
    Production stage, in its "Production Ready Files" list. A file row's
    "More Actions" menu offers "Send to Text Editor" only on files the text
    editor can import (Word, OpenDocument, RTF, LaTeX or Markdown files; a
    PDF row has no such action). It opens the same version dialog, titled
    "Send File to Text Editor", asking "To which version would you like to
    send this file?" ("Create New Version" first, then each existing
    version by its side-menu name, Rule 11a), with none selected as it
    opens. What happens to the file afterwards belongs to
    [JATS & Body Text](U48-jats-and-body-text.md). <sup>v</sup>
17. **The awaiting-approval notice.** While no version is published, a
    press's Production stage shows the banner "Awaiting approval." with
    "The monograph will not be listed in the catalog until it has been
    published…". Publishing replaces it with two stacked notices: "Status
    / Submission published." and the catalog notice (which belongs to
    *Catalog management*). A journal and preprint server record the same
    approval state internally, but their current workflow screens show no
    such banner. <sup>w</sup>

## Side effects

- **Email "Publication Published"**: sent when a version actually goes
  live (not on scheduling) to every user holding an Author-role assignment
  on the submission ("Your publication, {title}, … has been published.").
  It comes from the journal itself: the journal's name as sender, at the
  principal contact's address, never from the editor who acted, and the
  same whether the version went live from its workflow or with its issue
  ("Publish Issue").
  No journal, press or server setting turns it off. Each recipient can
  switch the email off in their own profile's notification settings; that
  does not switch off the task notice. A preprint server sends it too,
  still worded "published" throughout ⚠ [OPS5](#ops5), alongside its own
  acknowledgement below. <sup>x</sup>
- **Task notice for the author**: the same publish files "A new version of
  your submission, "{title}", was published." into each of those users'
  Tasks. Unpublishing removes the notice again. <sup>x</sup>
- **Email "A new version was created for "{title}""**: creating a version
  emails exactly the users with a stage assignment on the submission, the
  submitting author included. The acting editor is among them only when
  they hold such an assignment themselves; a manager acting without one
  gets neither email nor notice. The template nevertheless presents itself
  as a notice to assigned editors ⚠ [A1](#a1). An assigned reviewer gets
  nothing. Each recipient also gets a matching task notice ("A new version
  of a submission was created"). <sup>y</sup>
- **Posted acknowledgements {OPS}**: posting emails the preprint's
  contributors (every listed contributor with an email address, account or
  not). Two templates exist, "Preprint Posted Acknowledgement" for the
  first version and "New Version Posted Acknowledgement" for later ones,
  but every post sends the new-version one. The first-post acknowledgement
  never goes out ⚠ [OPS4](#ops4). Were it sent, its "Preprint URL" would
  lead the contributor to the preprint's workflow on the editorial
  dashboard, not to its public page ⚠ [OPS6](#ops6). The acknowledgement
  is governed by one Workflow › Emails setting (Settings below) and is
  sent even when the post only scheduled the preprint ⚠ [OPS2](#ops2). <sup>z</sup>
- **Activity log**: one line per act. "The submission was published." /
  "…was scheduled for publication." for the first version; "A new version
  was published." / "…scheduled…" for later versions; "The submission was
  unpublished." / "A version was removed from publication."; "A new version
  was created." An unschedule logs the unpublish line ("The submission was
  unpublished."; no unschedule wording exists). A preprint server words
  them with posted/unposted throughout, the scheduling lines included
  ("The submission was scheduled to be posted." / "A new version was
  scheduled to be posted."). Two more lines, both "Submission metadata
  updated" under the acting user's name, can come with a publish. On a
  journal, "Confirm" in "Review Publishing Details" adds one before the
  publish line, whatever the DOI settings. A publish that makes the
  work's DOI ("Upon publication" with none made yet; see
  [DOIs](U45-dois.md#doi-creation)) adds one after it: a single line,
  even when a press's chapters and formats get their DOIs with it.
  <sup>aa</sup>
- **Workflow closes on the final version.** Publishing a Version of Record
  (Author Original on a preprint server) also records the submission's
  workflow as finished. Unpublishing the last one reopens it. The activity
  log shows the move: "{user} moved this submission to the Done stage." /
  "{user} returned this submission to the workflow." <sup>ab</sup>
- **Passed along to other features**: publishing marks DOIs for deposit or
  update (*DOIs*), deposits the work to verified contributors' ORCID
  records on a journal or preprint server (scheduled counts as published
  for this; a press deposits nothing, see
  [ORCID integration](U04-orcid-integration.md#omp1); on a journal, a
  publish without an issue fails instead when such a contributor is
  listed [OJS4](#ojs4)), refreshes the search index, and on a press swaps
  the catalog availability records (*Catalog management*). <sup>ac</sup>

## Settings that modify behavior

- **Preprint Posted {OPS}**: Settings › Workflow › Emails, "Preprint
  Posted": "Send an email to all authors." / "Do not send an email."
  Sending is the default. When off, neither posted acknowledgement is
  sent. The "Publication Published" email still arrives; this setting does
  not touch it. <sup>z</sup>
- **The journal's issues {OJS}**: which issues exist decides which
  assignment choices the publish flow offers (Rule 5) and whether it offers
  any (Rule 15). Publication fees add their requirement (Rule 7) only once
  fully in force: payments on, a fee amount, and the chosen payment method
  itself completely set up.
- **No switch for the rest.** No journal, press or server setting turns the
  "Publication Published" email off (each recipient can, in their own
  profile; Side effects). Nothing enables author self-posting on a preprint
  server (a plugin hook only; Actors). No setting turns scheduling itself
  on or off in any app. <sup>b</sup>

## Cross-feature interactions

- [Publication metadata](U40-publication-metadata.md): owns the metadata
  pages, the edit locks that published/scheduled states impose, and the
  copyright fill's field-level story (its Rule 12). This spec owns the
  publishing acts that trigger them. Its plain-language-summary finding
  surfaces here as the panel's refused Confirm ⚠ [OJS1](#ojs1).
- [Submission stage](U25-submission-stage.md#schedule): the journal's
  Submission-stage "Schedule For Publication" shortcut that lands here.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)*:
  who opens the workflow screen and sees the Publication area at all.
- [Issues](U50-issues.md): issues themselves. Publishing an issue is what
  releases articles scheduled into it (Rule 5), and unpublishing an issue
  sets its articles back to "Scheduled".
- [Catalog management](U70-catalog-management.md): the press's Catalog Entry
  page, add-to-catalog and catalog flags. Its catalog notice replaces the
  awaiting-approval banner (Rule 17).
- [JATS & Body Text](U48-jats-and-body-text.md): the "Send to Text Editor"
  import that this feature's version dialog opens (Rule 16).
- [My Submissions](U22-my-submissions.md) /
  [Submissions dashboard](U23-submissions-dashboard.md): the list views a
  publish, schedule or unpublish moves a submission between.
- [ORCID integration](U04-orcid-integration.md): the ORCID publishing
  requirements (Rule 7) and the on-publish deposit.
- [Payments & APCs](U52-payments-and-apcs.md): the publication fee whose
  unpaid state blocks a journal's publishing (Rule 7).
- [Submission wizard](U21-submission-wizard.md): the preprint server's
  post-submission texts that tell a submitter whether they can post.

## Canonical scenarios

Scenarios 1–4, 6–10 and 16–18 run on the seeded journal with ready
accounts and scratch submissions; scenarios 5 and 11–15 run on a scratch
journal with throwaway accounts: scenario 5 because a journal must have
no issues for it and its Author changes an email setting, the others
because each needs its own issues, a future-dated item or its own email
setting. A press and preprint server have no issues; their scheduling is
the date route of scenarios 14 and 15. The
publish button and window are labelled per Rule 2; the mail catcher and
each scenario's seeding are in its footnote.

1. **Publish a submission and see it live**

   Given: Journal Manager, on the seeded journal, with an unpublished
   scratch submission in Production and its submitting Author.

   - **The Publication area**: open the submission's workflow, then its
     Publication area: the head reads "Status: Unscheduled" ("Unposted"
     on a preprint server) (Rule 1).
   - **The Production stage's banner** {OMP}: the Production stage view
     shows "Awaiting approval." with "The monograph will not be listed in
     the catalog until it has been published…" (Rule 17).
   - **"Review Publishing Details"** {OJS}: press "Schedule For
     Publication": the panel opens with "Assign To Current/Back Issue"
     already preselected (Fields); keep it, pick the published issue in
     "Issue", choose "Version of Record" as Publication Stage and "Major
     Revision" as Revision Significance, and Confirm (Rule 3).
   - **The confirmation window**: on a press or preprint server the
     publish button ("Publish" / "Post") opens it directly (Rule 2). It
     states "All publication requirements have been met." ("All
     requirements have been met." on a preprint server) and names the
     version to be assigned, "Version of Record 1.0" ("Author Original
     1.0" on a preprint server); on a press or preprint server a
     requirement-shaped stage sentence sits under the all-met line
     ([A7](#a7)) (Rule 4). Confirm.
   - **Published**: the window closes and, with no page reload, the head
     reads "Status: Published" ("Posted") with "Unpublish" ("Unpost") in
     place of the publish button; the reader page is live (Rules 4, 8).
   - **The notices** {OMP}: the Production stage's banner is replaced by
     "Status / Submission published." and the catalog notice (Rule 17).
   - **The Activity Log**: the workflow's Activity Log & Notes → History
     shows "The submission was published." and "{user} moved this
     submission to the Done stage.", and on a journal also "Submission
     metadata updated", which the panel's Confirm added (Side effects).
   - **The Author's side**: the Author finds the "Publication Published"
     email in the mail catcher, its sender the journal's name at the
     principal contact's address, not the Journal Manager (a preprint
     server's copy still says "published", [OPS5](#ops5)), and the task
     notice "A new version of your submission, "{title}", was published."
     under Tasks (Side effects).
   - **Control**: before the Confirm, the reader page was not there and
     the Author's Tasks held no such notice (Rule 8; Side effects).
     <sup>s1</sup>

2. **A declined submission cannot be published**

   Given: Journal Manager, on the seeded journal, with a declined scratch
   submission.

   - **The journal's panel** {OJS}: press "Schedule For Publication":
     "Review Publishing Details" opens first and insists on a Publication
     Stage and a Revision Significance; choose "Version of Record" and
     "Major Revision", leave the issue fields exactly as they arrive, and
     Confirm: it goes through, and the choices are saved onto the
     declined submission (Rule 7).
   - **The window**: a press or preprint server opens it directly
     (Rule 7). Either way it lists "A declined submission can not be
     published." ("…posted." on a preprint server) under "The following
     requirements must be met before this can be published." ("…posted."
     on a preprint server), and no confirm button is offered (Rules 4,
     7).
   - **Close**: the version is neither published nor scheduled; on a
     journal the head now reads "Status: Unpublished" (Rule 1).
   - **Control**: scenario 1's undeclined submission reaches "All
     publication requirements have been met." and its confirm button
     (Rule 4). <sup>s2</sup>

3. **Unpublish**

   Given: Journal Manager, on scenario 1's published submission, and its
   submitting Author.

   - **"Unpublish"**: the Publication area offers "Unpublish"
     ("Unpost" on a preprint server); press it: the red dialog asks "Are
     you sure you don't want this to be published?" ("…to be posted?");
     confirm: the head reads "Status: Unscheduled" ("Unposted"), and,
     signed out, the reader page answers 404 Not Found (Rules 9, 9a).
   - **The Activity Log**: adds "The submission was unpublished." (worded
     with "unposted" on a preprint server) and "{user} returned this
     submission to the workflow." (Side effects).
   - **The Author's Tasks**: the task notice from scenario 1 is gone; the
     list reads "No Items" (Side effects).
   - **Control**: before the unpublish, the reader page was live and the
     Tasks list held the notice (scenario 1). <sup>s3</sup>

4. **Create a new version**

   Given: Journal Manager, on the seeded journal, with a published scratch
   submission that has, besides its submitting Author, a stage-assigned
   participant and an assigned reviewer {OJS OMP}, the manager holding
   no stage assignment on it; and a Reader.

   - **"Create New Version"**: side menu › "Create New Version": the
     dialog asks which version to copy metadata from, the Publication
     Stage and the Revision Significance; the published version's stage
     and "Minor Revision" arrive preselected; Confirm unchanged: the menu
     gains "Version of Record 1.1" ("Author Original 1.1" on a preprint
     server), and its pages open with "Status: Unpublished" and the
     copied content (Rules 11, 11a).
   - **The reader page**: Reader: the page still serves the OLD version
     and its "Versions" list shows nothing new, though its date line
     already reads "Published {date} — Updated on {date}", with the
     draft's creation day as the published date ⚠ [A6](#a6) (Rule 11).
   - **The draft by address** {OJS}: Reader: the address "Preview" on
     the draft opens (Actors row 4), the reader page's address with
     "/version/" and the draft's own number, answers the plain "404 Not
     Found" page (Rule 11).
   - **The emails and notices**: the submitting Author and the
     stage-assigned participant get the email "A new version was created
     for "{title}"" and the task notice "A new version of a submission
     was created" ⚠ [A1](#a1); the assigned reviewer {OJS OMP} and the
     manager, acting without a stage assignment, get neither (Side
     effects).
   - **The Activity Log**: adds "A new version was created." (Side
     effects).
   - **Control**: before the new version, the side menu listed the one
     published version and the reader page's date line carried no
     "Updated on" (Actors row 7; Rule 11). <sup>s4</sup>

5. **Publish the new version**

   Given: Journal Manager and the submitting Author, on a published
   scratch submission to which "Create New Version" has added an
   unpublished "Version of Record 1.1" ("Author Original 1.1" on a
   preprint server), as in scenario 4; on a journal, the submission sits
   on a scratch journal with no issues created, so the details saved
   below leave the details panel to open (Rule 3a).

   - **"Insert Content"** {OJS OMP}: on the new version's entry page
     (Publication Settings; the press's Catalog Entry page) the Summary
     of Changes box of the submission language carries "Insert Content";
     press it: a side panel opens reading "No saved summaries found for
     this submission's review revisions." (Rule 14); close it.
   - **The details**: Update Type arrives on "New Version"; choose
     "Correction", type "Figure 2 corrected." in Summary of Changes, and
     save (Fields; Rule 13).
   - **The email switched off**: Author: on Profile › Notifications,
     under "Submission Events", find the row reading exactly "A new
     version of your submission, "Title", was published.": its "Do not
     send me an email for these types of notifications." box arrives
     unticked; tick it and save (Side effects).
   - **Publish**: Journal Manager: press the publish button (a journal
     opens "Review Publishing Details" with "Version of Record" and the
     saved "Correction" in place and no issue fields; Confirm); the window
     names "Version of Record 1.1" ("Author Original 1.1"); Confirm: the
     head reads "Status: Published" ("Posted"); the reader
     page now serves the new version and its "Versions" list
     gains the new entry; the saved summary appears nowhere on the page
     ⚠ [A5](#a5); the Activity Log adds "A new version was published."
     (Rules 8, 13; Side effects).
   - **The notice without the email**: the Author's Tasks hold "A new
     version of your submission, "{title}", was published." while no new
     "Publication Published" email arrives for them (Side effects).
   - **Unpublish the new version**: press "Unpublish" ("Unpost") on it
     and confirm: the reader page stays live, its "Versions" list reading
     only "{date} (Version of Record 1.0)" ("Author Original 1.0")
     (Rule 9a).
   - **Control**: scenario 1's Author, with the email left on, received
     both the email and the notice (Side effects). <sup>s5</sup>

6. **Minor and major numbering**

   Given: Journal Manager, on the seeded journal, with a scratch
   submission whose one "Version of Record 1.0" ("Author Original 1.0" on
   a preprint server) is published; on a journal the submission has been
   through a review round, and a second scratch submission, taken through
   a review round of its own, waits unpublished.

   - **A minor version in the same stage**: side menu › "Create New
     Version", keeping the copied version's stage: "Minor Revision" is
     selectable and preselected; Confirm: the menu gains "Version of
     Record 1.1" ("Author Original 1.1") (Rule 12).
   - **A first version in another stage** {OJS OMP}: create another,
     choosing "Author Original" as Publication Stage: "Minor Revision" is
     greyed, and Confirm yields "Author Original 1.0" (Rule 12). While
     switching stages, watch the Revision Significance re-select itself
     ⚠ [A4](#a4).
   - **A major version in a stage that has versions**: create another,
     keeping "Version of Record" ("Author Original" on a preprint server)
     and choosing "Major Revision": Confirm yields "Version of Record
     2.0" ("Author Original 2.0") (Rule 12).
   - **The review round cleared** {OJS}: create another, choosing
     "Published Manuscript Under Review": Confirm yields "Published
     Manuscript Under Review 1.0"; on it press the publish button
     (reading "Publish" here, the submission counting as published,
     Rule 2): "Review Publishing Details" opens with "Associated review
     round" already at "Select a review round", the submission's round
     listed greyed and not choosable; leave it and the issue fields as
     they arrive, and Confirm: the window lists "A PMUR version cannot
     be published without an associated review round. Please assign a
     review round to this publication version before proceeding." as an
     unmet requirement (Rule 4) with no confirm button (Fields; Rule 7).
   - **Control**: the side menu listed the one published version before
     the first "Create New Version" (Actors row 7); on a journal, on the
     second submission's original version, the one its round was opened
     for, press "Schedule For Publication": the panel's "Associated
     review round" arrives pre-filled "Round 1 — opened {date}"; choose "Published Manuscript
     Under Review" and "Major Revision", leave the round as it arrives,
     and Confirm: the window reads "All publication requirements have
     been met." with a "Publish" button; close it without confirming
     (Fields; Rule 7). <sup>s6</sup>

7. **The version list and the author's view**

   Given: Author, on the seeded journal, with the Author's own scratch
   submission carrying two versions, one published.

   - **The tracking view**: open the submission from My Submissions: the
     Publication side menu lists every version by name, and each version
     page heads with "Status: {state}" (Actors row 7; Rule 1).
   - **The controls**: no publish, unpublish or "Create New Version"
     control appears anywhere (Actors).
   - **Control**: the Journal Manager, on the same submission's
     unpublished version, is offered the publish button and "Create New
     Version" (Actors rows 1, 5). <sup>s7</sup>

8. **Roles without the controls**

   Given: an assigned Section Editor (Series Editor on a press; Moderator
   on a preprint server) and an assigned Assistant {OJS OMP}, on the
   seeded journal, with an unpublished scratch submission in Production
   they are assigned to.

   - **The Publication area**: each opens the same Publication area: the
     version pages are there; the publish/unpublish buttons and "Create
     New Version" are not ⚠ [A2](#a2) (Actors).
   - **The Production stage's button**: the Production stage view still
     shows each of them a "Schedule For Publication" ("Post the
     preprint") button; pressing it only lands back on the Publication
     area, where nothing more is offered (Rule 2).
   - **Control**: the Journal Manager on the same submission is offered
     the publish button and "Create New Version" (Actors rows 1, 5).
     <sup>s8</sup>

9. **Unschedule**

   Given: Journal Manager, on a scheduled version (on a journal scenario
   11's article; on a press or preprint server scenario 14's or 15's
   future-dated item).

   - **"Unschedule"**: the button offered is "Unschedule"; press it: the
     red dialog asks "Are you sure you don't want this scheduled for
     publication?" ("Are you sure you don't want this to be scheduled to
     be posted?" on a preprint server); confirm: the head is back to
     "Status: Unscheduled" ("Unposted") (Rule 9).
   - **The Activity Log**: adds the unpublish line, "The submission was
     unpublished." (worded with "unposted" on a preprint server) (Side
     effects).
   - **Control**: on a published version the same place offers
     "Unpublish" instead (Rule 9; scenario 3). <sup>s9</sup>

10. **Republish with what was kept**

    Given: Journal Manager, on a published item: on a journal scenario
    12's continuous-publication article, its issue still unpublished; on
    a press or preprint server an item published with the date left
    empty, whose stamped date has since passed.

    - **Unpublish**: press "Unpublish" ("Unpost" on a preprint server)
      and confirm (Rule 9).
    - **The entry page**: on the entry page (Publication Settings; the
      press's Catalog Entry page; Preprint Entry) the issue choice {OJS}
      and the publication date are still filled (Rule 9); type
      "2030/01/01" into "Publication Date" ("Date Posted" on a preprint
      server) {OJS OPS} and save: it is refused with "The date must be in
      the format YYYY-MM-DD, such as 2019-01-01." and the kept date
      stands (Fields).
    - **The publish button again**: press it: on a journal "Review
      Publishing Details" opens again, the kept choice ("Assign To
      Future Issue and Publish Immediately" and its issue) pre-checked
      and the stage in place; Confirm it untouched (Rules 3, 9). The
      confirmation window follows (a press or preprint server opens it
      directly); on a journal its text names the kept issue outcome;
      Confirm: on a
      press or preprint server the item returns to "Published"/"Posted"
      carrying its ORIGINAL date; on a journal the kept issue choice
      decides again: the article goes straight back to "Published", its
      issue still unpublished (Rule 10).
    - **Control**: scenario 1's first publish stamped today, and its
      panel on a journal arrived with no stage chosen and no issue
      picked (Rules 3, 8). <sup>s10</sup>

11. **Schedule into a future issue** {OJS}

    Given: Journal Manager, on a scratch journal with a future issue AND
    at least one published issue, with a scratch submission in
    Production and its submitting Author.

    - **Publication Settings**: the page arrives on "Assign To
      Current/Back Issue" with "Issue" empty; type "11-22" in "Pages" and
      save: refused with "Please correct one error." and "This field is
      required." (Fields). Choose "Assign To Future Issue and Schedule
      Only", pick the future issue in "Issue", and save: "Saved"
      (Fields).
    - **"Schedule For Publication"**: press it: "Review Publishing
      Details" opens with the saved choice pre-checked; choose "Version
      of Record" and "Major Revision" and Confirm: the window promises "…published when {issue} is
      published…" with a "Schedule For Publication" button; Confirm: the
      head reads "Status: Scheduled", the reader page stays down, and the
      dashboards list the article under "Scheduled for publication"
      (Rules 3, 5).
    - **Nothing stamped**: Publication Settings' "Publication Date" is
      still empty (Rule 8).
    - **Nothing sent**: no "Publication Published" email arrives for the
      Author, and their Tasks hold no notice (Side effects).
    - **The Activity Log**: adds "The submission was scheduled for
      publication." (Side effects).
    - **Where no issue is published**: this scenario runs on the Given's
      journal only; on a journal without a published issue neither
      route above holds ⚠ (the first panel pick and the saved
      choice both offer immediate publication), and only re-picking
      "Schedule Only" after another choice reaches the scheduling window
      [OJS2](#ojs2) (Rule 5).
    - **Control**: scenario 1's immediate publish stamped the date, sent
      the email and filed the notice (Rule 8; Side effects).
      <sup>s11</sup>

12. **Continuous publication warns and publishes** {OJS}

    Given: Journal Manager, on scenario 11's scratch journal, its future
    issue still unpublished, with three further scratch submissions in
    Production.

    - **"Assign To Future Issue and Publish Immediately"**: on the first,
      press "Schedule For Publication", pick that choice and the future
      issue, choose "Version of Record" and "Major Revision", and
      Confirm: the window spells out "…published immediately as
      continuous publication even though it is assigned to {issue} which
      is not published yet…"; Confirm: the reader page is live at once,
      while the issue is still listed under Issues › Future Issues,
      unpublished (Rule 5).
    - **"Don't Assign To An Issue"**: on the second, the same way with
      that choice: the window reads "…published immediately without any
      issue association…"; Confirm: the reader page is live at once
      (Rule 5).
    - **Publishing the issue**: on Issues › Future Issues, publish the
      issue (an *Issues* act): it releases the scheduled article of
      scenario 11, whose head now reads "Status: Published" (Rule 5).
    - **No future issue left**: on the third, press "Schedule For
      Publication": the panel offers no "Future Issue" choices, only
      "Don't Assign To An Issue" and "Assign To Current/Back Issue"
      (Rule 5).
    - **Control**: the first submission's panel, with the future issue
      still unpublished, offered both "Future Issue" choices (Rule 5).
      <sup>s12</sup>

13. **No issues, no choices** {OJS}

    Given: Journal Manager, on a scratch journal with no issues created,
    with a scratch submission in Production.

    - **"Schedule For Publication"**: the panel shows no "Issue
      Assignment" at all; choose "Version of Record" and "Major Revision"
      and Confirm: the window offers immediate publication; Confirm: the
      article is published without an issue (Rule 15).
    - **Control**: on scenario 11's journal, which has issues, the same
      panel carries the "Issue Assignment" choices (Rule 5).
      <sup>s13</sup>

14. **A future date schedules the book** {OMP}

    Given: Press Manager, on a scratch press, with a scratch submission
    in Production and its submitting Author.

    - **Catalog Entry**: set "Date Published" to "2030-01-01" and save
      (Rule 6).
    - **"Publish"**: press it: the confirmation still reads "…make this
      catalog entry public?" ⚠ [OMP1](#omp1); confirm: the head reads
      "Status: Scheduled", the catalog page stays down, and the offered
      controls become "Preview" and "Unschedule" (Rule 6).
    - **Nothing stamped or sent**: "Date Published" still reads
      "2030-01-01" (Rule 8); no "Publication Published" email arrives for
      the Author, and their Tasks hold no notice (Side effects).
    - **The daily check**: publishes it once the date arrives (Rule 6);
      that cannot be watched within a test session.
    - **Control**: scenario 1's publish with the date empty stamped today
      and went live at once (Rule 6). <sup>s14</sup>

15. **Post the preprint** {OPS}

    Given: Preprint Server Manager, on a scratch server at the default
    "Send an email to all authors.", with a submitted preprint whose
    contributor list holds, besides the submitting Author, a contributor
    without an account, and a second submitted preprint with a future
    date saved on Preprint Entry; and a second scratch server set to "Do
    not send an email.", with a submitted preprint.

    - **"Post"**: press it: the "Post the preprint" window shows the
      requirements met, the version to be assigned ("Author Original
      1.0") and a "Related Publication" line (on a fresh preprint: "This
      preprint's relations have not been entered."); Confirm: the head
      reads "Status: Posted" and the preprint page is live (Rules 4, 8).
    - **The acknowledgement**: the contributors receive a posting
      acknowledgement, mis-titled "New Version Posted Acknowledgement"
      even on this first post ⚠ [OPS4](#ops4); the contributor without
      an account receives it too (Side effects).
    - **The future-date leg**: on the second preprint, press "Post" and
      Confirm: the head reads "Status: Scheduled" instead, a state
      nothing will ever post ⚠ [OPS1](#ops1), while the acknowledgement
      is sent anyway ⚠ [OPS2](#ops2); no "Publication Published" email
      arrives for the Author, and their Tasks hold no notice (Rule 6;
      Side effects).
    - **"Do not send an email."**: on the second server, post its
      preprint: no acknowledgement reaches any contributor, while the
      Author's "Publication Published" email still arrives (Settings).
    - **Control**: the first server's post above delivered both the
      acknowledgement and the Author's "Publication Published" (Side
      effects; Settings). <sup>s15</sup>

16. **The author cannot post** {OPS}

    Given: Author, on the seeded server at its defaults, submitting a
    preprint of their own through the wizard.

    - **The wizard's closing screen**: read as the wizard ends, it says
      a moderator will review and post the preprint (its steps and texts
      belong to [Submission wizard](U21-submission-wizard.md)) (Actors).
    - **The workflow view**: afterwards, open the submitted preprint
      from My Submissions: it offers no Post control ⚠ [OPS3](#ops3)
      (Actors).
    - **Control**: the Preprint Server Manager's Publication area on the
      same preprint offers "Post" (Actors row 1). <sup>s16</sup>

17. **A submission still in Review already offers the publish button** {OJS OMP}

    Given: Journal Manager, on the seeded journal, with a scratch
    submission in an external review round and a second scratch
    submission in Production.

    - **The Publication area in Review**: open the review-stage
      submission's workflow, then its Publication area: the top right
      already offers "Schedule For Publication" ("Publish" on a press),
      and no "Preview" sits among the publishing controls; on a journal
      the workflow window's header carries no Preview either {OJS}
      (Rule 2; Actors row 4). Leave the publish button unpressed.
    - **Control**: the Production-stage submission's Publication area
      offers the same publish button and "Preview" beside it, and the
      workflow window's header its own, separate Preview (Actors row 4).
      A preprint server installs no review stage. <sup>s17</sup>

18. **"Send to Text Editor" only on importable files** {OJS OMP}

    Given: Journal Manager, on the seeded journal, with a scratch
    submission in Production whose "Production Ready Files" list holds a
    Markdown file, "notes.md", and a PDF, "article.pdf".

    - **The Markdown row**: on the workflow's Production stage, open the
      Markdown row's "More Actions": it offers "Send to Text Editor";
      choose it: the dialog "Send File to Text Editor" asks "To which
      version would you like to send this file?", with "Create New
      Version" first, then each existing version, none selected
      (Rule 16); press "Cancel": the file stays where it is, and what a
      confirmed send does with it belongs to *JATS & Body Text*.
    - **Control**: the PDF row's "More Actions" offers no "Send to Text
      Editor" (Rule 16). A preprint server's workflow shows no
      "Production Ready Files" list, so it has no such action.
      <sup>s18</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for OJS3 (issue report
    `docs/issues/U69-A3-version-address-no-version-server-error.md`): an
    article's version address with an id that is none of its versions
    answering "404 Not Found"
  - a new version of an article in an issue, made by an untouched
    version dialog, opening "Review Publishing Details" on its first
    publish with the copied stage, "Minor Revision" and that issue
    chosen (Rule 3b)
  - "Unpublish" ("Unpost") on the earlier of two published versions:
    only it reads "Status: Unpublished" with "Preview" and "Publish"
    ("Post"), the later one stays "Published" ("Posted") and the reader
    page stays live (Rule 9a)
  - a journal's "Submission metadata updated" line from the panel's
    Confirm, read in scenario 1's Activity Log (Side effects)
  - the guard for OPS1 (issue report
    `docs/issues/U49-OPS1-scheduled-preprint-never-posted.md`): a preprint
    posted with a future "Date Posted" reading "Status: Posted" once the
    scheduled tasks run on or after that date
  - the guard for OJS2 (issue report
    `docs/issues/U49-OJS2-future-issue-schedule-only-publishes-now.md`): on
    a journal whose only issues are future ones, the panel's first pick of
    "Assign To Future Issue and Schedule Only" ending in "Status:
    Scheduled", and a Publication Settings save of it coming back checked
  - the guard for A5 (issue report
    `docs/issues/U49-A5-amendment-notice-shown-to-no-reader.md`): a version
    published with Update Type "Correction" and a Summary of Changes showing
    that summary on its own reader page, in every app
  - the guard for OJS4 (issue report
    `docs/issues/U49-OJS4-publish-without-issue-orcid-contributor-error.md`):
    with ORCID on under the member API, an article published with "Don't
    Assign To An Issue" whose contributor holds a verified iD reaching
    "Status: Published" without an error, and its author receiving
    "Publication Published"
  - the guard for A6 (issue report
    `docs/issues/U49-A6-new-version-draft-rewrites-published-date.md`): a
    published article, book or preprint keeping its "Published {date}" line
    unchanged after "Create New Version" makes a still unpublished version,
    in every app
  - the guard for OPS4 (issue reports
    `docs/issues/U49-OPS4-first-post-thanked-for-new-version.md` and `docs/issues/U49-OPS4-posted-acknowledgement-raw-signature.md`): a
    preprint's first post emailing its contributors "Preprint Posted
    Acknowledgement", a later version "New Version Posted Acknowledgement",
    each ending in the server's signature rather than a raw "{$signature}"
- **Rarely met**:
  - the publish button skipping the details panel on a journal with
    issues, after a Publication Settings save on a version that already
    has its stage (Rules 3, 3b): scenario 5 runs on a journal with no
    issues, where the panel opens
  - a version created from a stage-less source, named "Unassigned version
    ({date})" (Rule 11a): no scenario opens "Create New Version" before an
    item's first publish, the one time its shown version has no stage
  - the workflow window's header Preview on a press submission still in
    review (Actors row 4): scenario 17 reads the press's publishing
    controls only, the header on the journal alone
- **Nothing new to test**:
  - a Guest Editor and a recommending editor without the controls
    (Actors): the absence scenario 8's Section Editor and Assistant read
  - the "Section" select always holding a value, with no empty choice and
    no required mark {OJS OPS} (Fields): the entry page scenario 10 saves
  - Cover Image, Pages and URL Path (Fields): display extras on the entry
    page scenario 10 saves
  - a journal's in-between states reading "Unpublished" (Rule 1): the
    readout scenario 2's panel save leaves
  - a new version of an article published without an issue arriving on
    "Assign To Current/Back Issue" with no issue (Fields): the same
    arrival and refusal scenario 11's first save reads
  - versions never renumbered or deleted here (Rule 12): the menus
    scenario 6 reads offer no such act
  - a filled past date kept on publish (Fields; Rule 8): the kept-date
    republish of scenario 10, which Rule 10 says behaves as a first
    publish with that date
  - the journal's issues deciding the choices offered (Settings): the
    journals scenarios 11 to 13 run on
  - no setting turning the "Publication Published" email, author
    self-posting or scheduling on or off (Settings): what scenarios 1,
    14, 15 and 16 do at the defaults
- **Register carries it**:
  - A3 (the journal's button reading "Publish" only once a final-stage
    version is published; a published non-final version leaving the
    submission off the published lists and a press's catalog page down;
    Rules 2, 8)
  - A7 (the requirement-shaped stage sentence under the all-met line on
    a press or preprint server; Rule 4; scenario 1 passes it)
  - A9 (same-day unassigned versions sharing one name; Rules 11a, 16)
  - A10 (in French the version dialog and the entry page reading raw
    codes; Fields)
  - OJS1 (a required plain language summary refusing the panel's Confirm
    without naming the summary; Rule 4)
  - OJS2's second half (where only future issues exist, a Publication
    Settings save for another field recording "Don't Assign To An
    Issue"; Fields)
  - OJS3 (a journal's version address naming a number the article has
    no version under answering a blank server error; Rule 11)
  - OJS4 (a publish without an issue failing for a contributor with a
    verified ORCID iD under the member API; Rule 15)
  - OJS5 (a refused Confirm opening a second, blank panel; Rule 3c)
  - OPS1 (the scheduled preprint waiting forever; Rule 6; scenario 15
    marks it)
  - OPS3 (a screening plugin lifting the author block with no Post
    control appearing; Actors; scenario 16 marks it)
  - OPS6 (the first-post acknowledgement's "Preprint URL" leading to the
    editorial workflow, not the public preprint; Side effects)
- **No seed**:
  - the warning list "The following issues were found, but will not
    prevent publishing" (Rule 4): plugins alone add entries, none in a
    stock install
  - a scheduled press item published by the once-daily check when its
    date arrives (Rule 6): the date lies beyond the test session
  - a saved revision summary listed "Review (Round {n}) • {date} •
    {file}" and appended by "Insert Content" (Rule 14): no seed carries
    an author's revision file with its summary
  - an assigned issue that no longer exists refused on a journal
    (Rule 7): no seed leaves a version pointing at a deleted issue, and
    deleting the issue on the Issues screen empties the version's choice
    instead of leaving it dangling
- **Owned by another feature**:
  - the entry page saving for whoever may edit the publication (Actors
    row 6; *Publication metadata*)
  - an unauthenticated or duplicated ORCID iD refused while ORCID is on
    (Rule 7; *ORCID integration*)
  - an unpaid publication fee refused once fees are fully in force
    (Rule 7; Settings; *Payments & APCs*)
  - publishing filling the empty copyright and license fields from the
    journal's defaults (Rule 8; *Publication metadata*)
  - the Author's publication pages read-only while the version is
    published and saving again once unpublished (Rule 8; *Publication
    metadata*)
  - what happens to a file after "Send to Text Editor" (Rule 16; *JATS &
    Body Text*)
  - DOIs marked for deposit, the ORCID deposit, the search index and the
    press's catalog availability (Side effects; *DOIs*, *ORCID
    integration*, *Catalog management*)
  - the "Submission metadata updated" line of a publish that makes the
    work's DOI (Side effects; *DOIs*)
  - a newer version published with "Don't Assign To An Issue" staying
    listed on its issue's page and in the current-issue web feeds
    (Rule 5; *Issues*, its A17)
  - the metadata pages and the edit locks published and scheduled states
    impose (Cross-feature interactions; *Publication metadata*)
  - the Submission stage's "Schedule For Publication" shortcut
    (Cross-feature interactions; *Submission stage*)
  - who opens the workflow screen and sees the Publication area
    (Cross-feature interactions; *Workflow screen & stage access*)
  - unpublishing an issue setting its articles back to "Scheduled"
    (Cross-feature interactions; *Issues*)
  - the press's Catalog Entry page, add-to-catalog and catalog flags
    (Cross-feature interactions; *Catalog management*)
  - the list views a publish, schedule or unpublish moves a submission
    between (Cross-feature interactions; *My Submissions*, *Submissions
    dashboard*)
  - the preprint server's post-submission texts (Cross-feature
    interactions; *Submission wizard*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-29), unreviewed
unless an entry notes otherwise; the team settles them on spec review.
The summary is sorted 🐞 → ❓ → ✅ and the entries below are the source;
badges, Impact and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A5](#a5) | Readers never see a new version's Summary of Changes, though the editor is told it appears publicly | 🐞 | high | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | Creating a new version, still unpublished, makes the reader page say "Published {today} — Updated on {real date}" | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A10](#a10) | In French the "Create New Version" dialog and the Publication Settings / Preprint Entry page show raw codes; the versions to copy from cannot be told apart | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OJS1](#ojs1) | With a plain language summary required, the panel's Confirm is refused without naming the summary and publishing is unreachable | 🐞 | high | issues (claude), 2026-10-02 — re-verified |
| [OJS2](#ojs2) | Editor's "Schedule Only" publishes the article at once when the journal has no published issue | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS3](#ojs3) | A version address naming a number the article has no version under crashes the article page with a blank server error instead of "not found" | 🐞 | low · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OJS4](#ojs4) | Editor publishing an article without an issue gets an error when a contributor has a verified ORCID iD | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [OJS5](#ojs5) | A refused Confirm in "Review Publishing Details" opens a second, blank panel over the first | 🐞 | minor | — |
| [OPS1](#ops1) | A preprint posted with a future "Date Posted" stays "Scheduled" for good and never goes public | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OPS4](#ops4) | Every post, the first included, sends "New Version Posted Acknowledgement"; the first-post acknowledgement never goes out | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OPS6](#ops6) | The first-post acknowledgement's "Preprint URL" links the preprint's editorial workflow, not its public page | 🐞 | latent | — |
| [A1](#a1) | The new-version email announces itself to editors but goes to every stage-assigned user, the submitting author included | ❓ | user-visible | — |
| [A2](#a2) | Publishing is offered to managers only, although the app's deeper plumbing names Section Editors and Assistants; on a preprint server that leaves Moderators without a Post button | ❓ | user-visible | — |
| [A3](#a3) | A published non-final version leaves the submission itself listed as unpublished, and a press's catalog page down | ❓ | user-visible | — |
| [A4](#a4) | Switching the Publication Stage silently re-selects "Minor Revision", discarding the user's choice | ❓ | minor | — |
| [A7](#a7) | The press's and preprint server's confirmation shows a requirement-shaped stage sentence under "All … requirements have been met" | ❓ | minor | — |
| [A9](#a9) | Unassigned versions made the same day carry identical names in every version list | ❓ | minor | — |
| [OJS6](#ojs6) | With a summary required, a version with saved details skips the refused panel and would publish without one | ❓ | latent | — |
| [OMP1](#omp1) | The press's publish confirmation promises to make the entry public while a future date schedules it instead | ❓ | minor | — |
| [OPS2](#ops2) | The posted acknowledgement is sent even when the post only scheduled the preprint | ❓ | minor | — |
| [OPS3](#ops3) | An author granted posting by a plugin still finds no Post control on the workflow | ❓ | latent | — |
| [OPS5](#ops5) | The preprint server's "Post" vocabulary stops short: header pill, email and task notice still say "published" | ❓ | minor | — |
| [A8](#a8) | Retired: after a publish, post or schedule the Publication area kept the unpublished state until a page reload; fixed in pkp/ui-library#853 before its merge, never on `main` | ✅ | retired | re-probe at the PR head (claude), 2026-09-23 — fixed before merge |

### All apps

<a id="a1"></a>
**A1 — Who the new-version email reaches** · ❓ · user-visible.
Creating a version emails "A new version was created for "{title}"" to
every user with a stage assignment on the submission. That includes the
submitting author. The acting editor gets it only through an assignment
of their own; an unassigned acting manager gets nothing. Yet the email's
own description presents it as a notice to assigned editors. An assigned
reviewer gets neither the email nor the task notice. Question: is the
audience meant to be editors only? Lean: yes. The description and the
notice's editorial wording say so; the send filters by assignment, not
role. Since: 2026-08-29 · Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — Publishing is managers-only on screen** · ❓ · user-visible.
The publish/unpublish buttons and "Create New Version" appear only for
Journal Managers, Editors and Site Administrators who are not limited to
recommendations. Assigned Section Editors, Guest Editors and Assistants
see none of them. The application's deeper plumbing names those roles for
the same acts, so screen and plumbing disagree about who may publish.
Worse, the Production stage view offers the SAME excluded roles a button
labeled "Schedule For Publication" / "Post the preprint" that is only a
navigation shortcut. Pressed, it lands on a Publication area where they
have nothing to press. On a preprint server the excluded set includes the
Moderator role, the role the submission screens tell authors will "review
and post" their preprint. For a Moderator that dead-end shortcut is the
only Post-labeled control anywhere. Question: is manager-only the intended
narrowing, and is the Moderator exclusion intended on a preprint server?
Lean: the narrowing looks deliberate in the new dashboard, but the
Moderator case contradicts the server's own texts and needs a ruling.
Since: 2026-08-29 · Basis: probe (the absent controls and the dead-end
button, every app; the wider server roster is a code reading).
<sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Only a final-stage version counts for the submission** · ❓ ·
user-visible.
The submission's own standing follows its FINAL version stage only. With
just an "Author Original" version published, a journal's article page is
live while the dashboards still list the submission as active or queued.
It joins the "Published" views only once a "Version of Record" is
published. The publish button follows the same rollup: with the article
live it still reads "Schedule For Publication", not "Publish". On a press
BOTH halves wait. With only an "Author Original" version published, the
workflow reads "Status: Published" while the public catalog page stays
down. The author is still emailed "Publication Published" with a link to
a page the public cannot open. On a preprint server Author Original IS
the final stage, so any post counts at once. Question: is a live article
on a submission the lists call unpublished intended? Lean: intended as a
versioning-model design (the lists track the version of record), but the
disagreement between a live reader page and an "active" listing will
surprise editors. Since: 2026-08-29 · Basis: probe.
<sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — The Revision Significance re-decides itself** · ❓ · minor.
In the version dialogs, changing the Publication Stage re-selects "Minor
Revision" whenever a minor version is allowed for the new stage. A user
who chose "Major Revision" and then corrects the stage gets a minor
version unless they notice. The reverse switch, to a stage with no
versions yet, correctly forces "Major Revision" and greys Minor. Only the
switch toward a stage with an existing version discards a choice. A
preprint server knows one stage and offers no switch. Question: should a
stage switch preserve the user's significance choice? Lean: yes. Silently
overriding a made choice is a defect-shaped convenience. Since:
2026-08-29 · Basis: probe.
<sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — Readers never see a new version's Summary of Changes, though the editor is told it appears publicly** · 🐞 · high.
An editor who publishes a new version of an article, book or preprint
with Update Type "Correction" and a Summary of Changes is promised on
the form that "This will appear publicly as the version amendment
notice". After publishing, the new version's reader page does not show
it. Readers see only a new entry in the "Versions" list and an "Updated
on" date, with no word on what changed. The publish goes through and the
form keeps the text, so the editor has no reason to check. A retraction
or a withdrawal published this way leaves readers no mark at all. The
display was never built: the change that added the field left the themes
for later, and upstream's open plan for the feature lists only where the
notice should go on a press and a preprint server. Every version
published with a summary is affected, whatever its Update Type, on every
install using the default theme, the only theme the three apps ship.
Basis: probe, 2026-10-02. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — Creating a new version, still unpublished, makes the reader page say "Published {today} — Updated on {real date}"** · 🐞 · medium.
An editor who presses "Create New Version" on a published article, book
or preprint changes its public page at once, before the new version is
published. The date under "Published" ("Posted" on a preprint server)
changes from the real date to "{the day the page is read} — Updated on
{the real date}". The page still shows the old version, and its
"Versions" list gains no entry. The first date is not the day the draft
was created: it is the date of each visit, so it moves forward every day
until the new version is published or deleted. Nobody is warned. The
page's citation tags keep the real date. Since: 2026-08-29 · Basis:
probe, 2026-10-02. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — A requirement-shaped sentence under "all met"** · ❓ · minor.
On a press or preprint server, publishing a version that has no
Publication Stage yet shows "The publication must have a version stage
assigned before it can be published." directly under "All publication
requirements have been met." It is phrased as an unmet requirement,
though it blocks nothing: the confirm button is present and the next line
names the stage that will be assigned. On an already-staged version the
pair collapses to "The publication version is "{version}"". A journal's
details panel assigns the stage first, so its window always shows the
assigned form. Question: should the notice say the stage WILL be assigned
rather than "must be"? Lean: yes. A first-time publisher reads a
contradiction. Since: 2026-08-29 · Basis: probe.
<sup>[f-a7](#fn-a7)</sup>

<a id="a9"></a>
**A9 — Same-day unassigned versions share one name** · ❓ · minor.
Every version created without a Publication Stage is named "Unassigned
version ({date})", so two made the same day read identically in the side
menu, in the version dialog's "Which version should metadata be copied
from?" and in the "Send File to Text Editor" picker. An editor sending a
file to one of them cannot tell which one it goes to, while versions
with a stage are told apart by number ("Version of Record 1.1"). Seen on
a journal and a press. Question: should an unassigned version carry a
distinguishing number? Lean: yes; every other version name is unique.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — In French the version dialog and the entry page show raw codes** · 🐞 · low.
With the interface in French (Canada), the Journal Manager reads raw
codes where French words belong:
- every app, the "Create New Version" dialog: its title "Créer une
  nouvelle version" and its buttons "Annuler" and "Confirmer" read
  French, but its three labels and their descriptions read
  "##publication.versionSource.create.label##",
  "##publication.versionSource.create.description##",
  "##publication.versionStage.label##",
  "##publication.versionStage.description##",
  "##publication.revisionSignificance.label##" and
  "##publication.revisionSignificance.description##"; the stage list
  offers "##publication.versionStage.authorOriginal## (AO)",
  "##publication.versionStage.publishedManuscriptUnderReview## (PMUR)"
  and "##publication.versionStage.versionOfRecord## (VoR)" (a preprint
  server only the first), and the significance list
  "##publication.revisionSignificance.major##" and
  "##publication.revisionSignificance.minor##";
- every app, the same dialog's list of versions to copy from: each
  version with a stage reads "##publication.versionStage.display##" and
  each without one "##publication.versionStage.unassignedVersion##", so
  "Version of Record 1.0" and "Version of Record 1.1" (a preprint
  server's "Author Original 1.0" and "1.1") cannot be told apart;
  "Confirmer" still creates the version;
- a journal's "Publication Settings" page and a preprint server's
  "Preprint Entry" page: the group headings read
  "##publication.placement##", "##publication.publicationTiming##",
  "##publication.versionAndUpdates##", "##publication.display##" and
  "##publication.access##"; the Section and Cover Image descriptions
  read "##publication.section.description##" and
  "##publication.coverImage.description##"; "Update Type" and its
  description read "##publication.updateType.label##" and
  "##publication.updateType.description##", and each of its twelve
  choices reads its own code, from "##publication.updateType.addendum##"
  to "##publication.updateType.withdrawal##", with
  "##publication.updateType.newVersion##" preselected; "Summary of
  Changes (Amendment Notice)" and its description read
  "##submission.form.summaryOfChanges##" and
  "##publication.summaryOfChanges.description##";
- a journal's page also: "Publication Date" reads
  "##publication.publicationDate##"; "Associated review round", its
  description and its "Select a review round" placeholder read
  "##publication.reviewRound.field.label##",
  "##publication.reviewRound.field.description##" and
  "##publication.reviewRound.field.placeholder##"; the Pages and URL
  Path descriptions read "##publication.pages.description##" and
  "##publication.publicationSettings.urlPath.description##";
- a preprint server's page also: "Date Posted" reads
  "##publication.datePublished##".

The rest of the two entry pages reads French ("Rubrique" or "Série", the date
description, "Enregistrer"), and the English screens show none of these
codes. A French-speaking editor has to guess which version a new one
copies and what each field is for. Of these texts only "Date Posted" shipped
in a released version, and its French is empty there too; the rest
arrived with main's new pages and wait for their translations, which
the team does not count as a defect (2026-10-02). The pages' menu entry and heading
are [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#a11)'s
finding, and why a missing French text shows as a code at all is
[Languages & locales](U57-languages-and-locales.md#a4)'.
Since: 2026-09-30 · Basis: probe, 2026-10-02. <sup>[f-a10](#fn-a10)</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — A required plain language summary blocks Confirm without naming itself** · 🐞 · high.
On a journal that requires a plain language summary, the "Review
Publishing Details" panel's Confirm is refused for every version, one
that already holds a summary included, so publishing and scheduling
are never reached from it ([OJS6](#ojs6)). Nothing names the summary
(Rule 3c, [OJS5](#ojs5)). The requirement's
save-blocking side is [Publication metadata](U40-publication-metadata.md#a1)'s finding,
with the same cause; a press and preprint server publish without a
summary. Since: 2026-08-28 · Basis: probe, 2026-10-02.
<sup>[f-ojs1](#fn-ojs1)</sup>

<a id="ojs2"></a>
**OJS2 — Editor's "Schedule Only" publishes the article at once when the journal has no published issue** · 🐞 · medium.
On a journal with no published issue, only one or more future issues, an
editor's first pick of "Assign To Future Issue and Schedule Only" in
"Review Publishing Details" is taken as "Publish Immediately". The first
pick is the first choice made after the panel opens, since it opens with
no choice checked. The confirmation window then offers "Publish", and
confirming publishes the article at once instead of scheduling it for
the issue. Changing the choice a second time before "Confirm" works. On
Publication Settings the same first pick, saved, comes back as "Assign
To Future Issue and Publish Immediately". A save there for another
field, such as "Pages", on a version with no issue choice yet, records
"Don't Assign To An Issue", which nobody chose. Basis: probe,
2026-10-02. <sup>[f-ojs2](#fn-ojs2)</sup>

<a id="ojs3"></a>
**OJS3 — A mistyped version address crashes instead of "not found"** · 🐞 · low · crash: server.
An article's reader page links each OLDER published version at its own
address (the "Versions" list). Typing a number the article has no version
under into that address returns a blank server error instead of the
plain "404 Not Found" page the reader should get, so an ordinary mistype
is enough to hit it. Another article's version number and letters such
as "abc" fail the same way. The article's own version numbers show the
page, and an unpublished draft's own number answers the "404 Not Found"
page. No link the journal's pages offer leads to such an address.
Since: 2026-08-29 · Basis: probe, 2026-10-01. <sup>[f-ojs3](#fn-ojs3)</sup>

<a id="ojs4"></a>
**OJS4 — Editor publishing an article without an issue gets an error when a contributor has a verified ORCID iD** · 🐞 · medium · crash: server.
An editor publishes an article with "Don't Assign To An Issue" while one
of its contributors holds a verified ORCID iD, on a journal with ORCID
on under the member API. The publish answers with "An unexpected error
has occurred. Please reload the page and try again.", although the
article is in fact published. The contributor's work is never sent to
their ORCID record. On a typical install the article's author also never
receives "Publication Published". The editor has nothing on screen to
resend either. Publishing without an issue is new on `main`. The fault
needs that, the member API, a contributor with a verified iD, and DOIs
turned on for the journal. Basis: probe, 2026-10-02.
<sup>[f-ojs4](#fn-ojs4)</sup>

<a id="ojs5"></a>
**OJS5 — A refused Confirm opens a second, blank details panel** · 🐞 · minor.
When "Review Publishing Details" is refused with the passing "1
error(s)" notice (Rule 3c) on a version with no Publication Stage yet,
a second copy of the panel opens over the first, "Publication Stage"
and "Revision Significance" empty. The editor expects to stay in the
filled-in panel with the problem marked, and faces an empty one; one
"Cancel" closes both. It was seen with a required plain
language summary ([OJS1](#ojs1)), but is a fault of its own: fixing
that requirement removes one trigger, and any other refusal of this
kind would open the copy too. A refusal for an empty field of the
panel stays in place. Basis: probe, 2026-10-02 (that other refusals do
the same is a code reading). <sup>[f-ojs5](#fn-ojs5)</sup>

<a id="ojs6"></a>
**OJS6 — With a plain language summary required, a version that skips the panel would publish without one** · ❓ · latent.
On a journal that requires a plain language summary, a version whose
issue choice and stage are already saved skips the refused panel
([OJS1](#ojs1)) for the confirmation window (Rule 3), where nothing
checks the summary. Question: should publishing require it too? Lean:
no; the setting asks for it "before accepting their submission", and a
press and preprint server publish without one. Basis: code, 2026-10-05. <sup>[f-ojs6](#fn-ojs6)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — "Make this catalog entry public?" — then it schedules** · ❓ ·
minor.
With a future Date Published saved, the press's publish confirmation
still asks "All publication requirements have been met. Are you sure you
want to make this catalog entry public?". Confirming yields "Status:
Scheduled", not a public entry: the catalog page stays down and the
controls become "Preview" and "Unschedule". Question: should the window
announce the scheduling, as a journal's does? Lean: yes. The journal flow
shows the pattern. Since: 2026-08-29 · Basis: probe (the later daily
release itself was not observed; the date lies in the future).
<sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint posted with a future "Date Posted" stays "Scheduled" for good and never goes public** · 🐞 · medium.
A manager or moderator who types a future date into "Date Posted" on a
preprint's "Preprint entry" page and then posts the preprint gets
"Status: Scheduled", not a posted preprint. It stays "Scheduled" after
the date, because the preprint server has no task that posts scheduled
preprints. Its public page never appears, while the authors receive the
usual email telling them it has been posted. The only way round is to
press "Unschedule" and post again by hand on or after the date. Clearing
the date and posting at once posts the preprint the same day, with that
day's date. This needs a future date in a field whose help says to fill
it only when backdating. Since: 2026-08-29 · Basis: probe, 2026-10-02.
<sup>[f-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — Acknowledged as posted while merely scheduled** · ❓ · minor.
The posted acknowledgement to contributors is sent whenever Post is
confirmed, even when the future date meant the preprint was only
scheduled (OPS1). Authors then read that their preprint is posted while
the public page does not exist. The "Publication Published" email
correctly waits for the actual posting. Question: should the
acknowledgement wait too? Lean: yes; today it announces intent, not
fact. Since: 2026-08-29 · Basis: probe. <sup>[f-ops2](#fn-ops2)</sup>

<a id="ops3"></a>
**OPS3 — Author self-posting has no surface** · ❓ · latent.
A screening plugin can grant authors the right to post their own
preprint, and the server's texts anticipate it: the wizard's closing
screen invites can-post submitters to post. But the author's workflow
view builds no Post button for any author, granted or not, so the grant,
where it exists, has nothing to press. This cannot be verified on a stock
install, because no such plugin ships; it is recorded as the code stands.
Question: where is a granted author meant to post from? Lean: the
invitation text and the plumbing expect a control the current author view
lost. Basis: code. <sup>[f-ops3](#fn-ops3)</sup>

<a id="ops4"></a>
**OPS4 — First-time authors are thanked for "a new version"** · 🐞 · low.
Every post sends the contributors "New Version Posted Acknowledgement",
the very first post of a preprint included. A first-time author therefore
reads "Thank you for posting a new version of your preprint… The new
version is now available." The "Preprint Posted Acknowledgement" template
meant for the first post is never sent at all. The acknowledgement body
also ends with a raw "{$signature}" placeholder. Since: 2026-08-29 ·
Basis: probe, 2026-10-02. <sup>[f-ops4](#fn-ops4)</sup>

<a id="ops5"></a>
**OPS5 — "Posted" and "published" split the same screen** · ❓ · minor.
A preprint server renames the act "Post", yet several surfaces still say
"published". After a post, the submission header's pill reads "Published"
beside a status strip reading "Posted". The author's "Publication
Published" email says their preprint "has been published". Their task
notice reads "A new version of your submission, "{title}", was
published." Question: should the Post vocabulary reach these surfaces
too? Lean: yes. The leftovers read as another application's words. Since:
2026-08-29 · Basis: probe.
<sup>[f-ops5](#fn-ops5)</sup>

<a id="ops6"></a>
**OPS6 — The first-post acknowledgement links the editorial workflow, not the preprint** · 🐞 · latent.
"Preprint Posted Acknowledgement", the email meant for a preprint's first
post, tells each contributor "Your preprint, "{title}" has been posted
online on {server}." and gives a "Preprint URL" that leads to the
preprint's workflow on the editorial dashboard, not to the public page
the email announces. On `main` the email is never sent
([OPS4](#ops4)); once it is, every first post sends this link, as the
3.5 release already does. Basis: probe, 2026-10-02.
<sup>[f-ops6](#fn-ops6)</sup>

### Retired

<a id="a8"></a>
**A8 — The workflow still shows "unpublished" after publishing** · ✅ · retired. Fixed in pkp/ui-library#853 at `51f0c727` before its merge, 2026-09-23; never on `main`. <sup>[f-a8](#fn-a8)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The gate is computed client-side:
`useWorkflowPermissions.js` sets `canPublish` only when the user's
Production-stage roles intersect `ROLE_ID_SITE_ADMIN | ROLE_ID_MANAGER`
and `currentUserCanRecommendOnly` is false on that stage (the OJS
"Editor" default group carries the manager role level, so it qualifies).
All three `workflowConfigEditorial*.js` return an empty right-hand
control set when `!permissions.canPublish` and gate the side menu's
`publication_create_new_version` item the same way. Server-side the
publish routes admit more (fn-a2).

<a id="fn-b"></a>
**b** — OPS `Repository::canCurrentUserPublish()`: non-authors true;
assigned authors get `(bool) Hook::call('Publication::canAuthorPublish')`
— false with no plugin answering. Enforced as `validatePublish()` error
`authorCheck` → `author.submit.authorsCanNotPublish` ("You can not post
your own preprint. It must be approved and posted by a moderator."). No
context setting exists (`enableAuthorScreening` sits unused in the OPS
context schema). The OPS API re-registers publish/unpublish/version/add
with an author-inclusive role set (`OPSPublishHandler` adds
`ROLE_ID_AUTHOR` to the modal too), but the guard above still refuses.

<a id="fn-c"></a>
**c** — `useWorkflowActions.js`: `workflowUnschedulePublication` and
`workflowUnpublishPublication` both `PUT
…/publications/{id}/unpublish`; only dialog title/message differ
(`publication.unschedule[.confirm]` / `publication.unpublish[.confirm]`),
both warnable, `modalStyle: 'negative'`. Offered per status in
`workflowConfigEditorial*.js` (`STATUS_SCHEDULED` → Unschedule,
`STATUS_PUBLISHED` → Unpublish).

<a id="fn-d"></a>
**d** — Preview: `workflowPreviewPublication` redirects to the
publication's public URL. Guards: OJS queued/ready +
`hasSubmissionPassedStage(…, WORKFLOW_STAGE_ID_EXTERNAL_REVIEW)`;
OMP/OPS queued + same helper; all apps unconditional on a scheduled
version. On single-stage OPS the passed-stage check is expected true
from the start. Live-probed 2026-08-29: no Preview button anywhere in
the workflow modal of an in-review OJS submission; present on
Production (OJS), Copyediting (OMP), and pre-post and scheduled
versions (OPS) — Preview navigates the same page to the public
`…view/{id}/version/{v}` URL bannered "This is a preview and has not
been published. View submission". The header twin live-probed
2026-08-29: the workflow window's header chrome showed "Preview" to an
assigned Section Editor, an Assistant and the author, and "View" to a
Guest Editor on a published submission — roles the row excludes; that
header button is separate from the publishing-controls Preview the row
records. Test run 2026-09-16 (OJS, scenario 17): the manager's workflow
window on a submission in External Review carried no "Preview" button
anywhere (header buttons Close, Activity Log, Library; right controls
"Schedule For Publication" alone), while the Production-stage
submission's window carried two, the header's and the controls'. The
OMP run read the press's controls only, so the header gate is claimed
for the journal.

<a id="fn-e"></a>
**e** — Side menu item `publication_create_new_version`
(`getPublicationVersionItems` in `useWorkflowNavigationConfig*.js`),
guarded only by `permissions.canPublish`; dispatches
`workflowCreateNewVersion` → `WorkflowVersionDialogBody` mode
`createNewVersion`, title `publication.createVersion`.

<a id="fn-f"></a>
**f** — OJS `IssueEntryForm` (`FORM_ISSUE_ENTRY`), served at
`…/_components/issue`, menu label `publication.publicationSettings`;
OPS ships its own `IssueEntryForm` (no `pages`, no assignment fields)
under the menu label `preprint.entry`. The assignment radio + issue
select + hidden status are injected client-side by
`useWorkflowPublicationFormIssue.js` (guard `formName === 'issue' &&
issueCount > 0 && isOJS()`).

<a id="fn-g"></a>
**g** — `WorkflowPublicationVersionControl.vue` `statusProps`: queued on
the current publication → `publication.status.unscheduled`; scheduled →
`.scheduled`; published → `.published`; everything else (queued on a
non-current version, and OJS's persisted ready-to-publish/-schedule
statuses 6/7) → `.unpublished`. OPS locale: published = "Posted",
unscheduled = "Unposted". Version labels come from the read-only
`versionString` prop. The OMP author view shows the readout too:
`useWorkflowConfigOMP.js` deep-merges the OJS author config, whose
`common` block mounts the version control (live-probed 2026-08-29: the
OMP author's Publication pages head "Status: Unscheduled" —
`workflowConfigAuthorOMP.js` alone defines no `common` block, but the
merge inherits OJS's). OPS wording live-probed 2026-08-29: a
never-posted (and an unposted) reader-facing version reads
"Status: Unposted" for manager, Moderator and author alike, while a
queued NON-current version reads "Unpublished" in all three apps. The
journal's in-between state live-probed 2026-08-29: saving an issue
choice on Publication Settings flipped the readout "Unscheduled" →
"Unpublished", surviving a full page reload. Which version "readers
would get": `PKP\submission\Repository::getCurrentPublicationIdByPublications()`
— the most mature PUBLISHED publication, else the most mature overall,
publications ordered by version stage, then major, then minor
(live-probed 2026-08-29: with v1.0 still published, an unpublished v1.1
read "Unpublished"; v1.1 read "Unscheduled" only after v1.0 was
unpublished too).

<a id="fn-h"></a>
**h** — `WorkflowVersionSideModal.vue`, title
`publication.scheduledForPublication.reviewDetails.label` ("Review
Publishing Details"), description `…reviewDetails.description`; hosts
`useWorkflowVersionForm('publish')`. Opened by
`workflowAssignToIssueAndScheduleForPublication` when
`!versionStage || status ∉ [READY_TO_PUBLISH, READY_TO_SCHEDULE]`; its
submit `PUT`s the version fields (+ `issueId`, hidden `status`,
`reviewRoundIds`) onto the publication, then the flow re-enters and
opens the confirmation modal. Publish-mode field roster per
`useWorkflowVersionForm.js`: `versionStage` (required), `versionIsMinor`
(required), `updateType`, `summaryOfChanges`, issue fields (when
`issueCount > 0`), `reviewRoundIds` (on screen "Associated review round", helper "Link
this version to the review round whose findings it reflects. Leave
blank if not applicable.", picker "Select a review round" — live-probed
2026-08-29; the picker arrives pre-filled with the submission's
existing round, "Round 1 — opened {date}", despite the leave-blank
helper). Test run 2026-09-16 (OJS, scenario 6): the pre-fill holds only
on the publication the round belongs to; on a version created afterwards
the picker (a reka-ui select: a combobox button with a portalled listbox,
not a native select) arrived at "Select a review round" with the round's
one option disabled, titled "Locked when associated with a different
publication/version" (`useWorkflowPublicationFormReviewRound.js`).
Preselection, live-probed 2026-08-29 (scratch journals):
a settled panel on a version with nothing saved preselects "Assign To
Current/Back Issue" (fn-m's default; journal with a back issue — with
only future issues nothing is preselected and the first pick misfires,
fn-ojs2); a "Schedule Only" choice saved on
Publication Settings arrives pre-checked with its issue, and confirming
it yields the scheduling window and "Status: Scheduled" — on a journal
with a published back issue; with no published issue the saved choice
is not kept (fn-ojs2). Panel-open
traffic is read-only (GETs only) — the first write in the flow is the
Confirm's save, so an early radio click has nothing to race: three
forced-delay attempts produced no error and the early pick survived.
The reopen after an unpublish, test run 2026-09-16 (OJS, scenario 10):
with stage and issue choice both kept, the publish button opened the
panel again (the unpublished status is `QUEUED`, outside the ready
pair), the radio and issue pre-checked as fn-q's probe recorded.
Live-probed 2026-09-28, two runs (scratch journals): the settings page
posts its shown assignment and hidden status with every save
(`useWorkflowPublicationFormIssue.js`). A new version of an article
published into a back issue, made by an untouched version dialog
(`status` 1), opened the panel on "Publish" (Stage "Version of Record
(VoR)", "Minor Revision", "Assign To Current/Back Issue" and the issue
pre-checked); the same version after a Publication Settings save of
only Update Type "Correction" (write `assignment: 4`, `status: 6`)
opened the confirmation window directly. A new version of an article
published without an issue arrived in the panel on "Assign To
Current/Back Issue" with no issue, and its Confirm was refused in place
with "This field is required." under the group. On a journal with no
issues the page's save carried no status (no Issue Assignment group);
the OJS suite's scenario 5 opens the panel there after its details save.
Live-probed 2026-09-29, two runs (Rule 3b; scratch journal, two
articles published into Vol. 1 No. 1 (2025)): each version made by an
untouched dialog was stored with the issue and `status` 1, and its
first "Publish" opened the panel on "Version of Record (VoR)", "Minor
Revision", "New Version", "Assign To Current/Back Issue" and "Vol. 1
No. 1 (2025)"; both had been retitled first, and a Title & Abstract
save stores no issue choice.
Rule 3c: the in-place refusals are fn-o's empty Confirm and this
footnote's Confirm without an issue; the second panel was walked
2026-10-02 (f-ojs5).

<a id="fn-i"></a>
**i** — `useWorkflowVersionForm('createNewVersion')`: `versionSource`
(`publication.versionSource.create.label`), `versionStage` (optional),
`versionIsMinor`; footer `common.confirm`/`common.cancel`; submit `POST
…/publications/{sourceId}/version`. Preselection live-probed 2026-08-29
(OJS, OMP, OPS, stage-assigned sources): the stage select opened on the
copied version's stage ("Version of Record (VoR)" / OPS's sole "Author
Original (AO)") and significance on "Minor Revision"; untouched Confirm
produced "Version of Record 1.1" / "Author Original 1.1". The field was
never observed empty on a stage-assigned source. Live-probed 2026-09-28
(OJS and OMP, two runs each): from a staged source the stage select
offered no blank option, so no stage-less version could be made from it;
from a never-staged, unpublished item the dialog arrived with Stage and
Significance empty and untouched Confirms yielded "Unassigned version
({date})" versions (fn-a9).

<a id="fn-j"></a>
**j** — OJS `IssueEntryForm` groups: placement (`sectionId`,
`categoryIds`), publicationTiming (`datePublished`, description
"…Do not enter a publication date unless the article was previously
published elsewhere and you need to backdate it."), versionAndUpdates
(`updateType`, `summaryOfChanges`), display (`coverImage`, `pages`),
access (`urlPath`). Date format error:
`publication.datePublished.errorFormat`. OPS variant per fn-f; OPS date
guidance: "The posted date will be set automatically when the preprint
is posted…". Labels live-probed 2026-08-29: OJS "Publication Date"
(group "Publication Timing"); the press's Catalog Entry page "Date
Published"; OPS "Date Posted" with description "The posted date will be
set automatically when the preprint is posted. Do not enter a posted
date unless you need to backdate it."
Issue Assignment on the page live-probed 2026-09-28, two runs (scratch
journal with a published back issue and a future issue; the Journal
Manager and an assigned Section Editor alike): a Production article with
no saved choice arrived on "Assign To Current/Back Issue" with "Issue"
empty; "Save" with only "Pages" changed was refused in the page with no
request sent, summary "Please correct one error. Go to Issue: This field
is required. Jump to next error", field error "This field is required.";
after "Don't Assign To An Issue" the save went through (write
`assignment: 1`, `status: 6`) and read back the same after a reload. The
same arrival and refusal on a new version of an article published
without an issue. A journal with future issues only arrived with nothing
checked (fn-ojs2); a journal with no issues showed no Issue Assignment
group and saved.

<a id="fn-k"></a>
**k** — Button per `getPrimaryControlsRight`: OJS label
`submission.status === STATUS_PUBLISHED ? publication.publish :
editor.submission.schedulePublication`, action
`WORKFLOW_ASSIGN_TO_ISSUE_AND_SCHEDULE_FOR_PUBLICATION`, statuses
queued/ready; OMP/OPS label `publication.publish` ("Publish"/"Post"),
action `WORKFLOW_SCHEDULE_FOR_PUBLICATION`, status queued only. The
legacy confirmation modal is `modals.publish.PublishHandler` (OPS:
`OPSPublishHandler`, whose only change is admitting authors), title
`editor.submission.schedulePublication` — OPS locale renders that key
"Post the preprint"; the OMP window title, live-probed 2026-08-29, is
"Schedule For Publication" (the same key as OJS). The stage views'
same-labeled button is `getActionItems` in
`workflowConfigEditorial{OJS,OPS}.js`, pushed unconditionally with
`action: 'navigateToMenu'` (fn-a2); OMP inherits the same shortcut
through the editorial-config deep-merge — `useWorkflowConfigOMP.js`
merges the OJS editorial config under OMP's, as it does the author
config (fn-g) — live-probed 2026-08-29: the button renders for a
Series Editor and a press manager. In-review presence live-probed
2026-08-29: an OJS submission in External Review already showed
"Schedule For Publication" in its Publication area (recorded, not
pressed). Residual quirk, live-probed 2026-08-29 (reproduced twice on a
scratch journal): the FIRST press of "Schedule For Publication" is
occasionally swallowed — nothing opens and no request fires until a
second press.

<a id="fn-l"></a>
**l** — `publish.tpl`: `$publishWarnings` list under
`publication.publish.warning`, then the app `PublishForm` — a
confirmation-only form (`FieldHTML`). With `$requirementErrors` the page
is added WITHOUT a submit button (`publication.publish.requirements`).
Warnings come only from the `Publication::validatePublishWarnings` hook
(core adds none). Confirmation strings: OJS
`publication.publish.confirmation[.backIssue|.continuousPublication|.issueLess|.futureIssue]`
(the future-issue branch relabels the submit
`editor.submission.schedulePublication`); OMP `…confirmation` ("…make
this catalog entry public?"); OPS "…post this?" plus the
related-publication table (`publication.publish.relationStatus.*`). All
three append the version-stage sentence
(`publication.required.versionStage[.assignment|.alreadyAssignment]`).
Live-probed 2026-08-29: the OPS window opens "All requirements have
been met." (no "publication") and its refusal heading reads "The
following requirements must be met before this can be posted." with "A
declined submission can not be posted."; A7's requirement-shaped stage
sentence ("The publication must have a version stage assigned before it
can be published.", then "The stage version that will be assigned to
the publication is "{version}"") was recorded on OMP and OPS first
publishes of stage-less versions, and collapsed to "The publication
version is "{version}"" on republish (fn-a7).
OJS1: with `plainLanguageSummary` required the panel's own save is
refused before the modal is ever reached (see the metadata spec's A1
evidence, live-probed 2026-08-28).

<a id="fn-m"></a>
**m** — `IssueAssignment` enum: NO_ISSUE/FUTURE_ISSUES_PUBLISHED →
`STATUS_READY_TO_PUBLISH`; FUTURE_ISSUE_SCHEDULED →
`STATUS_READY_TO_SCHEDULE`; CURRENT_BACK_ISSUES_PUBLISHED →
`STATUS_READY_TO_PUBLISH`; options filtered by which issues exist
(`getAvailableAssignmentOption`); default when nothing saved:
current/back issue if any issue exists, else no-issue — a default that
misfires when only future issues exist (fn-ojs2). OJS
`setStatusOnPublish()`: ready-to-publish → published (+ today if no
date), ready-to-schedule → scheduled; legacy fallback keys on the
issue's published flag. Release of scheduled articles:
`IssueGridHandler::publishIssue()` publishes every scheduled publication
of the issue; `unpublishIssue()` returns published ones to scheduled.
Zero-issue journals: the version form skips the issue fields and submits
publish-now (`issueId: null` + ready-to-publish). Live-probed 2026-08-29
(scratch journals): all four confirmation sentences appeared verbatim
per Rule 5's table with the matching buttons (the schedule-only
branch's "Schedule For Publication", the other three "Publish"); the
zero-issue journal showed no issue fields at all and published
issueless. Friction: the panel's description still says "…confirm the
issue it belongs to…" on a zero-issue journal. Live-probed 2026-09-29,
two runs (Rule 5's "Don't Assign To An Issue" row; a journal showing
the current issue's items in its feeds): the new version of an article
of Vol. 1 No. 1 (2025), retitled and published this way, was stored
with no issue, yet the issue's page (signed out, also at
`/issue/current` and after a reload) and the Atom, RSS 2.0 and RSS 1.0
feeds listed it under the new title, as they did a sibling version
published into the issue; an article published with no issue was never
in the feeds.

<a id="fn-n"></a>
**n** — OMP/OPS `setStatusOnPublish()`: future `datePublished` →
`STATUS_SCHEDULED`, else `STATUS_PUBLISHED` (+ stamp now if empty). The
daily check is `PKP\task\PublishSubmissions` — registered in the OMP
scheduler only (`Scheduler.php` per app: OJS registers other tasks, OPS
only usage stats). It publishes the current publication of scheduled
submissions whose date has arrived.

<a id="fn-o"></a>
**o** — `validatePublish()`: shared — `publication.required.declined`,
ORCID `orcid.verify.duplicateOrcidAuthor` /
`orcid.verify.hasUnauthenticatedOrcid` (when ORCID enabled); OJS —
`publication.invalidIssue`,
`editor.article.payment.publicationFeeNotPaid` (when publication fees
enabled), `publication.required.pmurReview`; OMP — no additions
(positive evidence of shared behavior); OPS — `authorCheck` (fn-b).
Errors return as HTTP 400 to the confirmation form. Declined refusal
live-probed 2026-08-29 in all three apps; on OJS the "Review Publishing
Details" panel opened first and required Publication Stage + Revision
Significance (an empty Confirm marks both "This field is required.";
the filled values are saved onto the declined submission) before the
no-button window appeared; OMP and OPS opened the refused window
directly. The ORCID refusal live-probed 2026-08-29 on all three apps
(scratch journal, press and preprint server, each with a contributor
carrying an unauthenticated iD): the window listed "Unauthenticated
ORCiDs for contributors detected." with no confirm button; the
duplicate-iD case was not probed. The dangling-issue refusal ("The
issue for this publication could not be found.") was not reachable
through the screens — live-probed 2026-08-29: deleting the assigned
(unconfirmed) issue reverted the version to "Unscheduled" and the next
publish press re-opened the panel with re-filtered choices, so the
state never survived to the check; the requirement stands on the code
reading. The fee requirement did not arm on payments enabled + an APC
of 100 + "Manual Fee Payment" selected (live 2026-08-29, window still
all-met): `publicationEnabled()` additionally requires the chosen
payment plugin's own `isConfigured()` — ManualPayment demands its
payment-instructions text. The PMUR refusal
live-probed 2026-08-29 (the round deselected and saved empty
beforehand): "A PMUR version cannot be published without an associated
review round. Please assign a review round to this publication version
before proceeding." — no confirm button; with the pre-filled round
left untouched the PMUR publish went through. Test run 2026-09-16 (OJS,
scenario 6): a PMUR version created after the Version of Record was
published was refused untouched, its picker empty and the round greyed
(fn-h), so nothing had to be cleared; on a second submission through a
round of its own, still unpublished, the original version's picker
arrived pre-filled and the untouched PMUR publish reached the all-met
window with "Publish".

<a id="fn-p"></a>
**p** — `Repository::publish()`: status via `setStatusOnPublish`;
copyright/license back-fill only when the result is PUBLISHED; version
auto-assignment via `getNextAvailableVersion(…,
Publication::DEFAULT_VERSION_STAGE, false)` (OJS/OMP `VERSION_OF_RECORD`,
OPS `AUTHOR_ORIGINAL`). Author lock: since pkp/pkp-lib#13109 (lib/pkp
`18f402e585`, in every app 2026-09-08) `publishPublication()` no longer
touches the Author's stage assignments (the loop that set
`canChangeMetadata = 0` on each of them is gone); the Author is locked out
by `Repo::submission()->canEditPublication()` reading the version's own
status alone, and unpublishing returns saving at once. Submission rollup:
`getStatusByPublications()` counts only versions whose stage equals
`VersionStage::finalVersionStage()` (A3). Live 2026-08-29 (OPS
controls, before that change): posting filled the empty copyright
holder/year from the server's defaults; the author's Save stayed disabled
after unpost (the pre-change lock, which survived unpost until 2026-09-08);
a future-date post that only scheduled left the copyright fields empty
(scheduling performs no fills). The stage
auto-assign is never exercised through the OJS screens — the journal's
details panel demands a stage before any UI publish — while a press or
preprint server exercises it live on every first stage-less publish
(fn-a7).

<a id="fn-q"></a>
**q** — `Repository::unpublish()` sets only `status = STATUS_QUEUED`;
`datePublished`, `issueId`, version numbers and the filled permission
fields are untouched; `updateStatus()` + `updateCurrentPublication()`
recompute the submission. The API refuses unless the status was
PUBLISHED or SCHEDULED (`api.publication.403.alreadyUnpublished`), which
is why one endpoint serves both dialogs (fn-c). Republish outcomes
follow `setStatusOnPublish` re-run on the kept data — live-probed
2026-08-29: an OJS continuous-publication article, unpublished while its
issue was still unpublished, reopened the panel with the kept choice
pre-checked and republished straight to "Published" through the same
confirmation window (the same reopen driven by the test run of
2026-09-16, scenario 10). OPS unpost dialog live-probed 2026-08-29: heading
"Unpost", message "Are you sure you don't want this to be posted?",
buttons Unpost/Cancel; the readout returned to "Unposted". OPS
unschedule dialog live-probed 2026-08-29: heading "Unschedule",
message "Are you sure you don't want this to be scheduled to be
posted?", buttons Unschedule/Cancel, red — the OPS locale overrides
the journal wording (`publication.unschedule.confirm`). Full
unpublish–republish cycles driven 2026-08-29 on OMP and OPS as well:
the public page returned 404 after every unpublish/unpost (all three
apps, single published version), and the republished item carried its
ORIGINAL date unchanged — no restamping. Multi-version unpublish
live-probed 2026-08-29 (OJS): unpublishing v1.1 while v1.0 stayed
published left the v1.1 page reading "Status: Unpublished" and the
article page live (HTTP 200) serving v1.0, its "Versions" list one
entry shorter; the page went 404 only after the last published version
was unpublished. The other direction live-probed 2026-09-29, two runs,
all three apps (Rule 9a): with 1.0 (published March 2025) and 1.1 (made
by an untouched dialog) both published, "Unpublish" ("Unpost") on 1.0
set it to "Status: Unpublished" (on OPS too, not "Unposted") with
"Preview" and "Publish" ("Post"), at once and after a reload; 1.1 stayed
"Published" ("Posted") with "Unpublish" ("Unpost"), and the side menu
kept both versions. Signed out, the page stayed live as 1.1, and 1.0's
own address answered "404 Not Found" (the date line and "Versions" as
Article landing page Rule 7b records). Pressing 1.0's publish button
then (cancelled) opened the panel on OJS with 1.0's own "Major
Revision" and its issue kept (Rule 10), and the window directly on OMP
and OPS, naming "Version of Record 1.0" / "Author Original 1.0".

<a id="fn-r"></a>
**r** — `Repository::version()`: clone with `datePublished = null`,
`status = QUEUED`, `sourcePublicationId` set; copies citations, authors
(remapping the primary contact), data citations, non-default JATS file,
publication media; per app adds galleys (OJS/OPS) or publication
formats + chapters + chapter authors (OMP). `currentPublicationId`
(what readers get) = the last published publication, else the most
mature of any status — so an unpublished new version does not replace
the published one publicly, though it may become the workflow's shown
default. Email/notice are sent by the API layer only
(`createNewPublicationVersionAndNotify`).

<a id="fn-s"></a>
**s** — `VersionStage` enum per app: OJS/OMP AO/PMUR/VoR (order 1/2/3,
final VoR); OPS AO only (final AO). Numbering:
`getNextAvailableVersion()` per stage, `++minor` or `++major`+`.0`;
display `publication.versionStage.display` "{stage} {major}.{minor}",
unassigned label `publication.versionStage.unassignedVersion`. Minor
availability: `allowMinorVersion = some publication already in the
chosen stage`; the auto-reselect quirk (A4) is
`updateMinorOptionAvailability()` passing the availability itself as
the field's new value on every stage change.

<a id="fn-t"></a>
**t** — `updateType` (12 values, default New Version) and
`summaryOfChanges` are stored on the publication;
`publication.summaryOfChanges.description`: "This will appear publicly
as the version amendment notice…". Rendering evidence: fn-a5.

<a id="fn-u"></a>
**u** — `useInsertSummaryOfChangesContent.js` adds the TinyMCE button on
the primary-locale editor only; `InsertSummaryOfChangesModal.vue`
(title `common.insertContent`) lists the `summaryOfChanges` texts saved
on review-revision files (OMP adds internal-review revisions), empty
state `publication.insertContent.empty`; insert APPENDS. Wired for the
OJS issue form / version form and the OMP catalogEntry form
(`(formName === 'issue' && isOJS()) || (formName === 'catalogEntry' &&
isOMP())`); skipped on OPS. Live-probed 2026-08-29 (scratch contexts,
two-locale forms): exactly one "Insert Content" button per page — the
submission-language box only; the empty message verbatim; entries read
"Review (Round 1) • 2026-08-29 • article.pdf" (OJS) / "External Review
(Round 1) • 2026-08-29 • article.pdf" (OMP); Insert appended the saved
summary after prefilled text, the other locale's box untouched; the OPS
Preprint entry page carried no such button on either box. The list is
fed by the author's revision-upload wizard, whose details step carries
the same "Summary of Changes (Amendment Notice)" field.

<a id="fn-v"></a>
**v** — `WorkflowVersionDialogBody.vue` accepts modes
`createNewVersion` and `sendToTextEditor` only; text-editor mode adds
the required `sendToVersion` select
(`publication.sendToTextEditor.label`) whose first option is "Create New
Version", then navigates to Body Text with the import parameters.
Live-probed 2026-08-29 (OJS Production Ready Files): the row's "More
Actions" menu offers "Send to Text Editor" only for pandoc-importable
extensions (`useFileManagerConfig.js` `PANDOC_IMPORT_EXTENSIONS`: docx,
odt, rtf, tex, latex, md, markdown — no action on a PDF); the dialog is
titled "Send File to Text Editor" and, on OJS, opened preselecting
"Create New Version" when live-probed 2026-08-29; the test run of
2026-09-16 (OJS, scenario 18) found the same picker (`select[name=
"sendToVersion"]`, options "Create New Version" then "Unassigned version
({date})") with an empty value on opening. The OMP dialog's picker
rendered with no selection at all (live-probed 2026-08-29, confirmed
visually). Live-probed 2026-09-28 (OJS and OMP, two runs each, a
published item and an unpublished one): the picker's value was empty on
opening every time, which settles the earlier OJS preselection as the
outlier; staged versions are listed by stage and number ("Version of
Record 1.0", "Version of Record 1.1"), stage-less ones as "Unassigned
version ({date})" (fn-a9). The OPS
workflow mounts no file manager at all (live-probed 2026-08-29: the
Production stage view's panels are Discussions and Participants only;
zero FileManager components in the OPS workflow configs) — hence the
rule's {OJS OMP} marker.

<a id="fn-w"></a>
**w** — `PKPApproveSubmissionNotificationManager::updateNotification()`
writes/clears the approve-submission and format-needs-approval notices
around the published state; the Vue workflow banner requests them on
OMP's Production stage only (OJS asks for its production-user/galley
notices instead; the OJS/OPS texts exist but nothing displays them —
"This submission is currently awaiting approval…" per-app wordings in
each app's locale). OJS/OPS refresh these records only on submission
completion; OMP also on publish/unpublish. Live-probed 2026-08-29: the
OMP banner read "Awaiting approval." / "The monograph will not be
listed in the catalog until it has been published. To add this book to
the catalog, click on the Publication tab.", replaced after publish by
"Status / Submission published." plus a "Catalog Management" notice;
OJS and OPS showed no approval banner before or after (OJS gains only
the "Status / Submission published." notice).

<a id="fn-x"></a>
**x** — `NotifyAuthorOnPublication` (shared listener, all three apps —
the mailable merely isn't listed among OPS's configurable emails):
recipients = users with author-role stage assignments; creates the
`PUBLICATION_PUBLISHED` task notice, then the email
(`AUTHOR_PUBLICATION_PUBLISHED`, subject "Publication Published")
unless the user opted out of that notification's emails
(profile notifications settings). The opt-out live-probed 2026-08-29,
both directions (OJS, recipient-scoped Mailpit): Profile ›
Notifications › Submission Events row "A new version of your
submission, "Title", was published." (email checkbox
`emailNotificationPublicationPublished`, labelled "Do not send me an
email for these types of notifications." beside the ticked "Enable these
types of notifications."; the box arrives UNTICKED on a fresh account
and ticking it is the opt-out, as the test runs of 2026-09-16 on OJS,
OMP and OPS showed: the ticked box is stored as a blocked email, and
left as it arrived a second publish delivered a second "Publication
Published") — with the opt-out saved, the
next publish delivered NO email while the task notice still arrived; a
control publish without it delivered both. Settings › Workflow ›
Emails carries no switch for this mailable (full-tab check, OJS and
OMP). Runs only when the status became PUBLISHED. The handler's unpublish branch deletes the task notice again
— it runs live although `subscribe()` registers only the published
event (live-probed 2026-08-29, all three apps: after unpublish/unpost
the author's Tasks grid reads "No Items"; twice-reproduced on OJS, the
notification row gone within seconds). Notice text:
`notification.type.publicationPublished`. The OPS send live-probed
2026-08-29 (scratch server, recipient-scoped Mailpit): the author
received subject "Publication Published" on a first post; wording
evidence at fn-ops5. Sender live-probed 2026-09-28, two runs (scratch
contexts, principal contact "Pat Principal" with its own address, the
acting manager "Mia Manager"): From "{context name}" <the principal
contact's address> on OJS for an article released by Issues › Future
Issues › "Publish Issue" (whose own "Just published: …" email came From
the acting manager) and for one published from its workflow, and on OMP
and OPS for a direct publish or post. By contrast the new-version email
and OPS's "New Version Posted Acknowledgement" come From the principal
contact's own name at the same address.

<a id="fn-y"></a>
**y** — `createNewPublicationVersionAndNotify()`: for every user
`assignedTo(submission)` — STAGE assignments, so review assignments are
outside the set — creates the `SUBMISSION_NEW_VERSION` task notice and
sends `PublicationVersionNotify` (key `VERSION_CREATED`, subject
`emails.versionCreated.subject`); no role filter despite
`toRoleIds = [SUB_EDITOR]` and the description
`mailable.publicationVersionNotify.description` ("…notifies assigned
editors…") (A1). Versions created by any other path notify nobody.

<a id="fn-z"></a>
**z** — `SendPostedAcknowledgement` (OPS listener): gate
`postedAcknowledgement` context setting (default on; Settings ›
Workflow › Emails group "Preprint Posted", options live-probed
2026-08-29: "Send an email to all authors." / "Do not send an email."); meant to send `PostedAcknowledgement` (key `POSTED_ACK`)
for version 1 and `PostedNewVersionAcknowledgement`
(`POSTED_NEW_VERSION_ACK`) otherwise, but the version check is dead —
every post sends the new-version mailable (fn-ops4); recipients = the
publication's contributor records with an email. No
published-vs-scheduled check (OPS2). Setting flip live-probed
2026-08-29 (scratch server, recipient-scoped Mailpit): with "Do not
send an email." saved, a first post and a later-version post each
delivered "Publication Published" and neither acknowledgement;
same-window posts with the setting on delivered both (positive
controls). That the first-version template also leaves the
configurable-emails list when the setting is off is a code reading,
not re-checked live.

<a id="fn-aa"></a>
**aa** — Event log: `SUBMISSION_LOG_METADATA_PUBLISH` with
`publication.event.published` / `.scheduled` (first publication) or
`.versionPublished` / `.versionScheduled` (submission has more than one
version, unpublished drafts counted), `…_UNPUBLISH` with
`.unpublished` / `.versionUnpublished`, `…_CREATE_VERSION` with
`.versionCreated`. OPS wordings: "The submission was posted.", "This
version was unposted and is no longer publicly available.", etc.
Live-probed 2026-08-29 across the acts (publish, version publish,
unpublish, version creation; full cycles on OMP and OPS): the lines
appeared as listed, the OPS log worded posted/unposted. The OPS
scheduled-line wordings are the locale's (`publication.event.scheduled`
"The submission was scheduled to be posted.", `…versionScheduled` "A
new version was scheduled to be posted.") — the scheduled log line
itself was not driven live. Unscheduling
live-probed 2026-08-29 (OJS, single-version submission): the log
gained "The submission was unpublished." — no unschedule-specific
line exists in the wording family. "Submission metadata updated"
live-probed 2026-09-29, two runs, all three apps, a publish from
Production on four scratch contexts each: DOIs on with a prefix and
"Upon publication" and no DOI yet; a DOI already made at an earlier
stage; "Never"; DOIs off. The journal's History gained one such line
under the manager in all four, already present while the confirmation
window was still open (the panel's Confirm saves the publication); a
second one, after the publish and Done-stage lines in the event log,
came only where the publish made the DOI (in all three apps; on the
press one line for the book's, a chapter's and a format's DOIs). A
press or server otherwise gained only the publish and Done-stage lines.
The History grid does not keep same-day rows in event order.

<a id="fn-ab"></a>
**ab** — `ApplyDoneWorkflowStage` listener (publish and unpublish):
records a move-to-done decision when a published final-stage version
exists, and a return-to-workflow decision when the count drops to zero.
Live-probed 2026-08-29: the activity log read "Mira Manager moved this
submission to the Done stage." after a final-stage publish and
"…returned this submission to the workflow." after unpublishing it;
the same pair observed on a preprint server around a post/unpost cycle
(Author Original being the final stage there).

<a id="fn-ac"></a>
**ac** — Listeners on the publish event: `VersionDois` (DOI creation),
`SendSubmissionToOrcid` (deposits when status is published OR
scheduled), `UpdateSubmissionInSearchIndex` (also on unpublish). OMP
`publish()`/`unpublish()` overrides additionally swap
publication-format tombstones and refresh the approval notices; OJS
reconciles article tombstones (OAI). DOI details: DOI versioning
clears/keeps version DOIs per app rules — the DOI feature's story.
ORCID deposit live-probed 2026-09-28, two runs (a contributor seeded
with a verified iD and an access token, ORCID on; read from each
install's jobs queue right after the publish, no screen shows it): under
"Member Sandbox" OJS (into a back issue) and OPS queued
`DepositOrcidSubmission`, which then failed at the test install's
unreachable ORCID sandbox ("cURL error 7"); OMP queued none under
"Member Sandbox" or "Public Sandbox", only `UpdateSubmissionSearchJob`
(*ORCID integration* records the press's missing deposit as intended);
OJS under "Public Sandbox" with no issue queued none. The issueless
member-API publish on OJS is fn-ojs4's.

<a id="fn-a1"></a>
**f-a1** — Send loop over `Repo::user()->getCollector()
->assignedTo($submissionId)` with no role filter
(`createNewPublicationVersionAndNotify`); the collector matches stage
assignments, which a review assignment is not. Live-probed 2026-08-29
(scratch journal + press, recipient-scoped Mailpit): the submitting
author and the stage-assigned participants received the email and the
task notice; the assigned, accepted reviewer received neither; the
acting manager holding NO stage assignment received nothing either
(OJS and OMP, same-window positive controls); the OPS
author receipt confirmed on a scratch server. Rider: the author's copy
links to the editorial dashboard URL
(`…/dashboard/editorial?workflowSubmissionId={id}`), not My
Submissions.

<a id="fn-a2"></a>
**f-a2** — UI gate fn-a vs server rosters: the publish API routes and
the legacy modal admit `SUB_EDITOR` and `ASSISTANT` (`SITE_ADMIN` on
the modal), and the OPS variants add `AUTHOR`; only the client-side
`canPublish` narrows to managers. The screens never offer the act, so
only the offer's absence is probe-able; the roster mismatch itself is a
code observation. OPS Moderator = the sub-editor slot
(glossary Part II), hence no Post button by the same gate. Live-probed
2026-08-29: assigned deciding and recommend-only Section Editors, a
Series Editor, Layout Editors (Assistant), the OPS Moderator and
submitting authors all lacked the top-right buttons (the container
absent from the DOM) and the "Create New Version" item, while every
version page and the status readout rendered. The stage views'
"Schedule For Publication" / "Post the preprint" button
(`getActionItems`, `action: 'navigateToMenu'`, no permission gate) was
pressed live as a Section Editor (OJS) and as the Moderator (OPS): the
page moved to the Publication area's "Title & Abstract", no dialog
opened, and no publish controls appeared.

<a id="fn-a3"></a>
**f-a3** — `getStatusByPublications()` requires a published/scheduled
publication whose `versionStage === finalVersionStage()` (VoR; OPS AO)
to move the submission to published/scheduled; `currentPublicationId`
(the reader-facing version) has no such filter — hence a live page on a
"queued" submission. Live-probed 2026-08-29 (scratch journal): with only
"Author Original 1.0" published the article page returned 200 while the
editor dashboard kept the submission under "Assigned to me" / "Active
submissions" (Published count unmoved) and the author's My Submissions
read "Published 0"; the top-right button still read "Schedule For
Publication". Publishing a "Version of Record 1.0" moved it to
"Published" on both dashboards. OPS control: a first post (Author
Original being final there) flipped both dashboards at once. OMP: the
public catalog page is gated on the SUBMISSION's published status
(`CatalogBookHandler`), unlike OJS's article page which serves any
published publication — live-probed 2026-08-29 (scratch press): with
only "Author Original 1.0" published the strip read "Status:
Published" while the anonymous catalog page returned 404, and the
author's "Publication Published" email was delivered regardless.

<a id="fn-a4"></a>
**f-a4** — `updateMinorOptionAvailability()` sets the field's
`currentValue` to the availability boolean on every stage change and
clears its error. Live-probed 2026-08-29 (OJS create dialog; the shared
dialog also exercised on OMP and OPS): with "Version of Record" chosen
and "Major Revision" picked, switching to the empty "Author Original"
stage kept Major and greyed Minor; switching back to "Version of
Record" re-selected "Minor Revision" by itself, discarding the Major
pick. The same auto-switch fires in the journal's publishing panel.
Numbering: a minor version on an existing stage produced "Version of
Record 1.1"; an empty stage produced that stage's "1.0".

<a id="fn-a5"></a>
**f-a5** — Live-probed 2026-08-29, all three apps (default themes,
scratch contexts): Update Type "Correction" and a summary ("U49D
correction notice…") saved and re-checked as persisted, version
published; the full page HTML of the article landing page, both
per-version URLs, the press's catalog page and the preprint page
contained neither the summary text nor the word "Correction". The
promise is `publication.summaryOfChanges.description` ("This will
appear publicly as the version amendment notice. Ensure it accurately
reflects the changes made in this version before publishing."), shown
on the panel and every entry page.
Issue report: [pkp-e2e#547](https://github.com/jardakotesovec/pkp-e2e/issues/547) ([docs/issues/U49-A5-amendment-notice-shown-to-no-reader.md](../issues/U49-A5-amendment-notice-shown-to-no-reader.md)).

<a id="fn-a6"></a>
**f-a6** — Live-probed 2026-08-29, all three apps (scratch contexts):
an OJS article published 2026-08-28 read "Published 2026-08-28" before,
and "Published 2026-08-29 — Updated on 2026-08-28" immediately after a
new version was created and left unpublished — the page otherwise
unchanged (old content, "Versions" list still one entry). The press's
catalog page and the preprint page grew the same "Updated on" line
("Published August 29, 2026 — Updated on August 29, 2026" / "Posted
2026-08-29 — Updated on 2026-08-29"); same-day dates masked the
inversion there.
Issue report: [pkp-e2e#550](https://github.com/jardakotesovec/pkp-e2e/issues/550) ([docs/issues/U49-A6-new-version-draft-rewrites-published-date.md](../issues/U49-A6-new-version-draft-rewrites-published-date.md)).

<a id="fn-a7"></a>
**f-a7** — Live-probed 2026-08-29 (scratch press + preprint server):
first publish of a stage-less version — OMP window "All publication
requirements have been met. Are you sure you want to make this catalog
entry public?" / "The publication must have a version stage assigned
before it can be published." / "The stage version that will be assigned
to the publication is "Version of Record 1.0"", Publish button present
and working; OPS identical in shape ("Author Original 1.0", button
"Post"). Republishing the now-staged version collapsed the two
sentences to "The publication version is "Version of Record 1.0"".
Strings: `publication.required.versionStage[.assignment|.alreadyAssignment]`.

<a id="fn-a8"></a>
**f-a8** — The confirmation is the legacy `PublishHandler` window
(`lib/pkp/templates/controllers/modals/publish/publish.tpl`). Its
`<pkp-form>` is mounted by `pkp.registry.init` as a separate Vue app, so
the `markDataChanged` that pkp/ui-library#853 (issue pkp/pkp-lib#13359)
injects into `Form.vue` is null there; the form saves through `$.ajax`,
not `useFetch`, and at the PR's earlier head `cab09538`
`AjaxModalWrapper.vue`'s `onVueFormSuccess()` closed the window with
`closeModal({formId, data})` without marking it changed.
`closeSideModalById()` then handed `onClose` `{dataChanged: false}`, and
`workflowStore.js`'s `triggerDataChange(finishedData)` returned without
reloading; before the PR the close led to an unconditional
`triggerDataChange()`. A journal's usual path still updates because the
"Review Publishing Details" panel's save flags the window slot the
confirmation then reused. Driven 2026-09-23 at the PR head `cab09538`,
before its merge, on reset databases: the OMP full suite with
lib/ui-library at the PR head (OMP `7f9455d5a`) red on scenarios 1, 5, 9,
10 and 14 and on *Publication metadata*'s scenarios 3 and 5, each waiting
for "Unpublish" or "Unschedule" after the publish request answered 200
(the snapshot after scenario 1's publish: "Status: Unscheduled",
"Preview", "Publish"); the OPS full suite (OPS `15f0b6e0bd`) red on
scenarios 1, 5, 9, 10 and 15 and on *Publication metadata*'s 3, 5 and 11,
waiting for "Unpost" or "Unschedule". The same spec files on the same
databases with lib/ui-library rebuilt at the tip's `2034439a`: OMP 38/38,
OPS 23/23. OJS (`802202cb3e`), the kept check
`shared/playwright/checks/sync/ui-library-853/publish-stale.js`: the
direct path sent no GET in the 5 s after the close and kept "Status:
Unpublished" with "Preview" and "Schedule For Publication" at
`cab09538`; at `2034439a` both the panel path and the direct path
updated. OMP's and OPS's own lib/ui-library pointers (`977e460c`,
`5d138aa9`) predate the change. Written up for the team in
`docs/reports/2026-09-23-ui-library-853-publish.md` (a temporary report,
deleted once addressed; git history keeps it). Fixed at the PR head
`51f0c727`, before its merge: `onVueFormSuccess()` now calls
`markDataChanged?.()` before closing. Verified 2026-09-23 on OJS on a
fresh reset with lib/ui-library at `51f0c727`: `publish-stale.js` read
`stale: false` on both paths, the workflow refetching the submission and
its publication after the close; the app PRs' CI with this companion was
green at `51f0c727` (pkp/ojs#5444 run 35881450909, pkp/omp#2471 run
35882950730, pkp/ops#1412 run 35883039899), OMP's and OPS's formerly red
scenarios above and *Publication metadata*'s passing there.

<a id="fn-a9"></a>
**f-a9** — Live-probed 2026-09-28 (OJS and OMP, two runs each, scratch
contexts): on an unpublished item that never had a stage, two versions
were created with the dialog's Stage and Significance left as they
arrived (empty); the "Send File to Text Editor" picker then listed
"Create New Version" and three identical "Unassigned version
(2026-09-28)", and the side menu and "Which version should metadata be
copied from?" the same three names. Label:
`publication.versionStage.unassignedVersion` with the creation date
only (fn-s).

<a id="fn-a10"></a>
**f-a10** — Live-probed 2026-09-30 (Fields: the version dialog and the
entry page; OJS, OMP, OPS, two runs; scratch contexts with UI languages
English and French (Canada), each read paired with the same read in
English; the context's Journal Manager at `/fr_CA/dashboard/editorial`):
the dialog opened on a published "Version of Record 1.0" (OPS "Author
Original 1.0") and on a never-staged, unpublished item, read before and
after an untouched "Confirmer". It made "Version of Record 1.1" (OPS
"Author Original 1.1") from the first and a second stage-less version
from the second, so the source list held two entries each reading the
same code (`versionSource` options). Entry pages read on an unpublished
production item and on a published one: OJS "Publication Settings" on a
journal with no issues (no Issue Assignment group shown), OPS "Preprint
Entry". English control: "Which version should metadata be copied
from?", "Publication Stage", "Revision Significance", "Major Revision"
/ "Minor Revision", "Placement", "Publication Timing", "Version and
Updates", "Display", "Access", "Associated review round" with "Select
a review round"; no code but the help icon's `##common.help##` (U08
A1). Mechanism (read, not driven): the keys are missing from every
app's `fr_CA` locale files (`publication.versionSource.*`,
`publication.versionStage.*`, `publication.revisionSignificance.*`,
`publication.placement`, `publication.section.description`,
`publication.publicationTiming`, `publication.versionAndUpdates`,
`publication.updateType.*`, `submission.form.summaryOfChanges`,
`publication.summaryOfChanges.description`, `publication.display`,
`publication.coverImage.description`, `publication.access`,
`publication.publicationDate`, `publication.reviewRound.field.*`,
`publication.pages.description`,
`publication.publicationSettings.urlPath.description`) or present with
an empty `msgstr` (OPS `publication.datePublished` in
`locale/fr_CA/submission.po`), and the client prints the key in place
of the text. No request failed and no
script error was logged.
Issue report: [pkp-e2e#548](https://github.com/jardakotesovec/pkp-e2e/issues/548) ([docs/issues/U49-A10-ops-french-date-posted-raw-key.md](../issues/U49-A10-ops-french-date-posted-raw-key.md)).
Issue report: [pkp-e2e#228](https://github.com/jardakotesovec/pkp-e2e/issues/228) ([docs/issues/U13-A1-french-version-name-raw-key.md](../issues/U13-A1-french-version-name-raw-key.md)), the list of versions to copy from.

<a id="fn-ojs1"></a>
**f-ojs1** — Live 2026-08-28 (metadata spec, register A1): with
"Require the author to provide a plain language summary…" on, the
panel's Confirm was refused with no message in the panel on a
summary-less version; OMP published and OPS posted under the same
requirement. Walked again 2026-10-02 (PKP's default dataset, `dbarnes`,
OJS `main`): refused before and after a summary was saved on "Title &
Abstract", each time with the panel's `PUT` answering 400
`{"plainLanguageSummary":{"en":["This field is required."]}}`, a
passing notice "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again.", no field
marked, and the second panel of f-ojs5. The
requirement is checked against what each save sends; the panel's save
does not carry the summary field.
Issue report: [pkp-e2e#323](https://github.com/jardakotesovec/pkp-e2e/issues/323) ([docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md](../issues/U21-A20-plain-summary-required-refuses-other-saves.md)).

<a id="fn-ojs2"></a>
**f-ojs2** — `getIssueAssignmentStatus()` returns the default
`CURRENT_BACK_ISSUES_PUBLISHED` + `STATUS_READY_TO_PUBLISH` whenever
ANY issue exists (`IssueAssignment::defaultAssignment`);
`useWorkflowPublicationFormIssue.js` writes that hidden status into the
form. With no published issues the default names an option the panel
does not offer, so `currentAssignmentOption` stays null, the
`isInitialDataLoad` slot is never consumed, and the user's first pick
takes the initial-load branch and skips `setHiddenValue('status', …)` —
the Confirm submits still carrying the default ready-to-publish status.
With a published or back issue present the default is offered and
preselected, the initial-load slot is consumed on open, and every pick
writes its status (code reading). Live-probed 2026-08-29, twice, with
a settled status fetch before the pick (deterministic, not timing): on
a journal whose only issue was a future one, the first "Schedule Only"
pick's window read "…published immediately… Are you sure you want to
publish this?" with button "Publish" and confirming yielded "Status:
Published"; changing the radio a second time before Confirm produced
the "…published when {issue} is published…" window and
"Status: Scheduled". The Publication-Settings-first route live-probed
2026-08-29 on the same journal shape (the same defaulting mechanism):
saving "Assign To Future Issue and Schedule Only" stored the default
ready-to-publish state instead — the reloaded settings page and the
panel both came back with "Assign To Future Issue and Publish
Immediately" checked, and an untouched Confirm offered the
continuous-publication window with a "Publish" button. On a journal
with a published back issue the saved choice arrived pre-checked and
confirmed into "Status: Scheduled" (fn-h). Live-probed 2026-09-28, two
runs (scratch journals): the Publication Settings save of "Schedule
Only" and the future issue wrote `status: 6` on the future-issue-only
journal (`status: 7` on one with a published back issue), and the page
showed "Assign To Future Issue and Publish Immediately" checked right
after "Saved", before any reload; an untouched Confirm read "…published
immediately as continuous publication even though it is assigned to
{issue} which is not published yet…" and published. On the same journal
shape an article with no saved choice arrived with no radio checked; a
save with only "Pages" changed read "Saved", wrote `assignment: 4` (the
Current/Back choice the page does not offer there) and `status: 6`, and
the page at once, a reload and the panel then showed "Don't Assign To
An Issue" checked, the panel's untouched Confirm offering issueless
publication.
Issue report: [pkp-e2e#546](https://github.com/jardakotesovec/pkp-e2e/issues/546) ([docs/issues/U49-OJS2-future-issue-schedule-only-publishes-now.md](../issues/U49-OJS2-future-issue-schedule-only-publishes-now.md)).

<a id="fn-ojs3"></a>
**f-ojs3** — Live-probed 2026-08-29: `GET
…/article/view/{id}/version/{publicationId}` returned HTTP 500 with an
empty body for a nonexistent publication id, another submission's
publication id and an unpublished draft's id alike; only an OLDER
published version of the same article renders (the current version has
no version link of its own). Server error log: `PHP Fatal error:
Uncaught Error: Typed property
APP\pages\article\ArticleHandler::$publication must not be accessed
before initialization` — `ArticleHandler`'s `if (!$this->publication)`
guard reads the typed property before it was ever assigned, so the
intended not-found response is unreachable. Empty body, no disclosure —
a robustness bug, nothing security-shaped. Test run 2026-09-16 (OJS,
scenario 4, the 2026-09-15 tip): the unpublished draft's own address,
the one its "Preview" opens, answered HTTP 404 with the body "404 Not
Found" to a signed-out visitor; a nonexistent publication id typed into
the same address still answered HTTP 500 with an empty body (one typed
observation on the probe server, not driven by the suite). The current
version's own id and another submission's were not re-read at that tip.
Issue report: [pkp-e2e#285](https://github.com/jardakotesovec/pkp-e2e/issues/285) ([docs/issues/U69-A3-version-address-no-version-server-error.md](../issues/U69-A3-version-address-no-version-server-error.md)).

<a id="fn-ojs4"></a>
**f-ojs4** — Live-probed 2026-09-28, two runs and two debug runs, the
same each time (scratch journal with no issues; ORCID on, "Member
Sandbox"; a contributor seeded with a verified iD and an access token):
panel with "Version of Record" › Confirm › "This will be published
immediately without any issue association…" › "Publish": `POST
…/api/v1/submissions/{id}/publications/{id}/publish` answered 500, "Call
to a member function getData() on null" — the journal's ORCID work
builder reads the issue's DOI with no issue
(`classes/orcid/OrcidWork.php` `getAppDoiExternalIds`). After a reload
the publication was published (status 3, dated that day); the jobs
queue gained no `DepositOrcidSubmission`, and the Author's mailbox no
"Publication Published". Controls, same runs: an article without an iD
on the same journal published and emailed its author; the same kind of
contributor published into a back issue on another scratch journal
published normally and queued the deposit; under "Public Sandbox" with
no issue the publish succeeded; OMP and OPS published such a
contributor normally under "Member Sandbox" (fn-ac). The no-issue path
on a journal with issues ("Don't Assign To An Issue") was not driven.
Issue report: [pkp-e2e#549](https://github.com/jardakotesovec/pkp-e2e/issues/549) ([docs/issues/U49-OJS4-publish-without-issue-orcid-contributor-error.md](../issues/U49-OJS4-publish-without-issue-orcid-contributor-error.md)).

<a id="fn-ojs5"></a>
**f-ojs5** — ui-library `useWorkflowVersionForm()`
(`src/pages/workflow/composables/useWorkflowVersionForm.js`, at
68972cca81) calls the panel's `onSubmitFn` whether or not the save
succeeded (`isSuccess` gates only `closeDialog`), and the publish flow
it calls back into reopens "Review Publishing Details" while the
version still has no `versionStage` (fn-h). The panel is built with
`showErrorFooter: false`, so a server-side refusal of a field it does
not hold marks nothing. Walked 2026-10-02 (PKP's default dataset,
`dbarnes`, OJS `main`, plain language summary required; f-ojs1): each
refused Confirm opened a second panel with "Publication Stage" and
"Revision Significance" empty, and one "Cancel" closed both. Kept walk:
`shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/publish-confirm.js`.
The in-place refusals (an empty stage, significance or issue) are
client-side and send no request (fn-h, fn-o). Not reported; it rides
with [pkp-e2e#323](https://github.com/jardakotesovec/pkp-e2e/issues/323)'s
Cause.

<a id="fn-ojs6"></a>
**f-ojs6** — Code read 2026-10-05 (OJS `main`, lib/pkp `987776cd04`):
`validatePublish()` (pkp-lib and OJS publication `Repository`) checks
no `plainLanguageSummary`; only `validate()`, run on each save, does
(f-ojs1). The publish button skips the panel by the version's stored
stage and status (fn-h), so that path sends no save. Not walked. The
setting's text: "Require the author to provide a plain language summary
before accepting their submission."; pkp-e2e#323's Fix notes call a
check at publishing a product decision.

<a id="fn-omp1"></a>
**f-omp1** — OMP `PublishForm` shows the single confirmation string for
every date; `setStatusOnPublish()` decides scheduled-vs-published only
after Confirm. Live-probed 2026-08-29 (scratch press): "Date Published"
saved as 2027-03-01, the Publish window verbatim unchanged ("…make this
catalog entry public?"); confirming returned "Status: Scheduled" with
controls Preview and Unschedule, and the anonymous catalog page stayed
404. The daily release itself was not observed (future date) — it rests
on the registered task (fn-n).

<a id="fn-ops1"></a>
**f-ops1** — OPS `setStatusOnPublish()` schedules on a future date, but
the OPS scheduler registers no publish task (fn-n) and OPS has no
issue-publish release path. The scheduled state live-probed 2026-08-29,
twice (scratch servers): "Date Posted" saved as a future date, the
"Post the preprint" window unchanged from the immediate-post one,
confirm → "Status: Scheduled" with controls Preview and Unschedule, the
anonymous preprint page 404. The never-posts claim rests on the absent
task registration.
Issue report: [pkp-e2e#545](https://github.com/jardakotesovec/pkp-e2e/issues/545) ([docs/issues/U49-OPS1-scheduled-preprint-never-posted.md](../issues/U49-OPS1-scheduled-preprint-never-posted.md)).

<a id="fn-ops2"></a>
**f-ops2** — `SendPostedAcknowledgement` runs on the publish event with
no status filter (fn-z), unlike `NotifyAuthorOnPublication` which
checks for the published status. Live-probed 2026-08-29
(recipient-scoped Mailpit): the scheduling post delivered the
acknowledgement while "Publication Published" correctly did not arrive
for it.

<a id="fn-ops3"></a>
**f-ops3** — `workflowConfigAuthorOPS.js` builds
`getPrimaryControlsLeft` only (status readout + relation dropdown); no
author config produces publish controls, and `canPublish` (fn-a)
excludes authors regardless of the hook. The wizard-side texts are the
submission wizard spec's (its OPS complete-screen footnotes,
live-probed 2026-08-25).

<a id="fn-ops4"></a>
**f-ops4** — `SendPostedAcknowledgement::handle()` picks the mailable
by `$publication->getData('version') == 1`, but the publication schema
keeps only `versionMajor`/`versionMinor`/`versionStage`/`versionString`
(the `version` column is gone; this listener is the datum's only
consumer), so the check is always false and the `PostedAcknowledgement`
branch is unreachable. Live-probed 2026-08-29: five first posts across
three scratch servers all delivered subject "New Version Posted
Acknowledgement" with body "…Thank you for posting a new version of
your preprint… The new version is now available. If you have any
questions, please contact me.{$signature}" — the "{$signature}"
rendered raw; "Preprint Posted Acknowledgement" appeared in no mailbox
(recipient-scoped Mailpit).
Issue report: [pkp-e2e#551](https://github.com/jardakotesovec/pkp-e2e/issues/551) ([docs/issues/U49-OPS4-first-post-thanked-for-new-version.md](../issues/U49-OPS4-first-post-thanked-for-new-version.md)).
Issue report: [pkp-e2e#552](https://github.com/jardakotesovec/pkp-e2e/issues/552) ([docs/issues/U49-OPS4-posted-acknowledgement-raw-signature.md](../issues/U49-OPS4-posted-acknowledgement-raw-signature.md)).

<a id="fn-ops5"></a>
**f-ops5** — Live-probed 2026-08-29 (scratch server): after a post the
submission header pill read "Published" while the controls strip read
"Status: Posted"; the author's mail arrived as subject "Publication
Published", body "…has been published."; the author's Tasks row read "A
new version of your submission, "{title}", was published." — the OPS
locale does not override these (`NotifyAuthorOnPublication`'s mailable
and `notification.type.publicationPublished` render the shared
wording).

<a id="fn-ops6"></a>
**f-ops6** — `emails.postedAck.body` (OPS locale) links "Preprint URL"
to `{$submissionUrl}`, and `{$submissionUrl}` is `SubmissionEmailVariable::SUBMISSION_URL`
(`getSubmissionUrl()`), the editorial workflow address. Walked
2026-10-02 (PKP's default dataset, `dbarnes` posting preprint 1, the
mail at `ccorino@mailinator.com`) on OPS `stable-3_5_0` and on `main`
with the OPS4 first-post fix tried: "Preprint Posted Acknowledgement"
arrived with "Preprint URL"
`…/dashboard/editorial?workflowSubmissionId=1`.
Kept walk:
`shared/playwright/checks/issues/preprint-posted-acknowledgement/walk.js`.
Not reported; noted under "What goes with it" in
[docs/issues/U49-OPS4-first-post-thanked-for-new-version.md](../issues/U49-OPS4-first-post-thanked-for-new-version.md).

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** A scratch submission moved to Production
(any app); OJS needs a published or future issue for the "Current/Back
Issue" pick — use a scratch back issue. Watch Mailpit for the author's
"Publication Published"; the task notice is under the bell/Tasks. OPS:
the button is "Post", the window "Post the preprint", the resulting
status "Posted". Read before any pick on the journal: the panel's
preselected "Assign To Current/Back Issue" (fn-h). OMP: the Production
stage view's "Awaiting approval." banner is read before the publish and
the two notices after (fn-w). The log lines are under the workflow's
"Activity Log & Notes → History"; the Done-stage line is fn-ab's, the
journal's "Submission metadata updated" fn-aa's (no seeded context has
a DOI prefix, so no DOI line joins them). The
email's sender (the context's name, the principal contact's address) is
fn-x's; a scratch context's principal contact is the `contactEmail` it
was created with.

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** Decline a scratch submission (journal/press:
Decline Submission while queued; preprint server: Decline on the
Production stage), then open the Publication area as manager and press
the publish button (on the journal, fill the panel's required stage and
significance to reach the refusal — Rule 7's late refusal, live-probed
2026-08-29).

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** Scenario 1's published submission; check
the author's Tasks after confirming the unpublish.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** A published scratch submission with an
assigned reviewer left on it (for A1's recipient check) on OJS/OMP; on
OPS any posted preprint. The participant and reviewer come from the
submission scenario's `participants[]` and `reviewRounds[].reviewers[]`;
the acting manager is a roster manager holding no stage assignment on
it. The draft's address is the one its "Preview" opens, the reader page's
version address with the new version's number, fetched by a signed-out
visitor and read for the "404 Not Found" page (fn-ojs3); the log line
is fn-aa's.

<a id="fn-s5"></a>
**s5 — scenario 5 seeding.** A published scratch submission and its
new version made as in scenario 4 (an untouched version dialog); on OJS
the scratch journal has no issues, because on a journal with issues the
details save either skips the panel (the published version in an issue)
or is refused for want of an issue (published without one; fn-h, fn-j).
The amendment-notice absence (A5) is asserted against the full page HTML,
not just the visible text. "Insert Content" is read on the entry page
before the summary is typed (fn-u). The opt-out is Profile ›
Notifications › "Submission Events", the row worded like the task
notice, its "Do not send me an email…" box ticked (fn-x); the Author's silence is read in
Mailpit scoped to their address, bounded by the notice's arrival and a
positive control of the test's own. The unpublish leg leaves version 1.0
published (fn-q).

<a id="fn-s6"></a>
**s6 — scenario 6 seeding.** A submission with one "Version of Record"
(journal/press) or "Author Original" (preprint server) version
published; create versions choosing same-stage and new-stage options.
OPS has a single stage — its leg covers only the minor/major numbering.
OJS: the submission is seeded through a review round (`decisions:
['sendExternalReview']` with a reviewer, then on to Production), so the
PMUR version created after publishing arrives with that round greyed in
its picker (fn-h); the refusal is fn-o's PMUR one. The Control's second
submission is seeded the same way and left unpublished, so its original
version is the round's own and the picker arrives pre-filled (fn-o).

<a id="fn-s7"></a>
**s7 — scenario 7 seeding.** A roster Author's own submission with two
versions (one published); open via My Submissions.

<a id="fn-s8"></a>
**s8 — scenario 8 seeding.** Assign the Section Editor / Series Editor /
Moderator and (OJS/OMP) an Assistant to the Production stage of an
unpublished scratch submission; record the Publication area's controls
for each, and press the Production stage view's "Schedule For
Publication" / "Post the preprint" button once per role (it navigates
only — fn-a2). Cross-app control for the exclusivity claim in Actors.

<a id="fn-s9"></a>
**s9 — scenario 9 seeding.** Journal: scenario 11's scheduled article.
Press/preprint server: scenario 14/15's future-dated item.

<a id="fn-s10"></a>
**s10 — scenario 10 seeding.** OMP/OPS: publish/post normally, wait for
the stamped date to be in the past (immediate), unpublish, republish.
OJS: scenario 12's continuous-publication article — unpublish it while
its issue is still unpublished, then republish (live-probed 2026-08-29
and driven 2026-09-16: the panel reopens pre-checked, fn-h, then back to
"Published" at once through the same continuous-publication
confirmation). The malformed date is typed on Publication Settings (OJS)
and Preprint Entry (OPS); the press's "Date Published" is *Catalog
management*'s field, so the refusal is read on the journal and preprint
server only (fn-j).

<a id="fn-s11"></a>
**s11 — scenario 11 seeding.** Scratch journal with a future issue
(Issues › Future Issues › Create Issue) AND a published back issue —
the shape on which Publication Settings arrives on "Assign To
Current/Back Issue" with no issue and refuses the first save (fn-j);
on that shape the settings-first route works (live-probed 2026-08-29:
the saved choice arrived pre-checked and confirmed into
"Status: Scheduled") and a direct panel pick registers normally. The
⚠ rider's journal shape is the same journal WITHOUT a published
issue — there both the first panel pick and the settings-saved choice
misfire, and only the re-pick choreography schedules (fn-ojs2). The
Author's silence is read in Mailpit scoped to their throwaway address,
bounded by a positive control of the test's own (a later publish's
"Publication Published"); the scheduling line is read under "Activity
Log & Notes → History" (fn-aa) and the empty date on Publication
Settings (fn-p).

<a id="fn-s12"></a>
**s12 — scenario 12 seeding.** Same future issue; second scratch
submission. The issue-publish leg drives Issues › Future Issues ›
Publish Issue and then re-checks the scheduled article of scenario 11.
Three further scratch submissions: the continuous-publication one, the
issue-less one, and one whose panel is opened only after Publish Issue,
when the journal has no future issue left (fn-m).

<a id="fn-s13"></a>
**s13 — scenario 13 seeding.** A brand-new scratch journal with no
issues created and one production-ready submission.

<a id="fn-s14"></a>
**s14 — scenario 14 seeding.** Scratch press; Catalog Entry page (the
catalog feature's surface, used here as the date's home), date e.g.
one year ahead. The Author's silence is read in Mailpit scoped to their
throwaway address, bounded by a positive control of the test's own; the
unchanged date is fn-p's no-fill.

<a id="fn-s15"></a>
**s15 — scenario 15 seeding.** Scratch preprint server (default
settings — "Preprint Posted" on); a submitted preprint. The future-date
leg uses a second preprint with the date saved on Preprint Entry before
posting. The contributor without an account is added on the workflow's
Publication › Contributors screen (*Contributors & affiliations*; no
`contributors[]` seed key exists yet) with a throwaway address to scope
Mailpit by; every silence is bounded by a positive control of the test's
own. The second server is seeded with the context scenario key
`postedAcknowledgement: false` (OPS only; Settings › Workflow › Emails
"Preprint Posted" at "Do not send an email.", fn-z).

<a id="fn-s16"></a>
**s16 — scenario 16 seeding.** A roster Author's freshly submitted
preprint on a stock server; the wizard's closing screen plus the
author's workflow view.

<a id="fn-s17"></a>
**s17 — scenario 17 seeding.** The review-stage submission is seeded
with `decisions: ['sendExternalReview']` on the submission scenario (OJS
and OMP; a preprint server answers 400 on `reviewRounds[]` and has no
review decision, scenarios.md), the Production one as scenario 1's. The
button is recorded, not pressed: the in-review offer was live-probed
2026-08-29 as an offer only (fn-k), and the Preview absence there, the
header's included on OJS, is fn-d's.

<a id="fn-s18"></a>
**s18 — scenario 18 seeding.** Seeded submissions carry no files
(scenarios.md), so both files are uploaded through the "Production Ready
Files" list's own upload control; the suite supplies a small Markdown
file and a PDF as fixtures (OJS already holds `article.pdf`, OMP
neither). The picker opens with no selection in both apps (fn-v). The preprint server's absence rests on fn-v: the
OPS workflow mounts no file manager.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Publication tab · version status readout | Workflow › Publication (all roles) | AFFW-383, AFFW-384 |
| Publication tab · Preview / Schedule For Publication / Publish / Post | Workflow › Publication, top right | AFFW-387..391 |
| Publication tab · Unschedule / Unpublish | same, per status | AFFW-392, AFFW-393, AFFW-452, AFFW-453 |
| Right controls hidden without the publish gate | same | AFFW-394 |
| Side menu · Create New Version | Workflow › Publication menu | AFFW-256, AFFW-450, AFFW-451 |
| "Review Publishing Details" side panel {OJS} | publish flow step 1 | AFFW-435..445, VUE-084 |
| Issue-assignment fields {OJS} | side panel + Publication Settings page | AFFW-446..448, AFFW-423, API-057 |
| Publication Settings page {OJS} / Preprint Entry {OPS} | Publication menu | AFFW-422, AFFW-428 |
| Insert Content modal {OJS OMP} | Summary of Changes fields | AFFW-424, AFFW-444, VUE-091 |
| Send to Text Editor version dialog | file manager row action | AFFW-438 |
| Publish confirmation modal | publish flow final step | AFFW-449, AFFW-709, AFFW-710, GRID-062, GRID-107 |
| Publish/version/unpublish endpoints (browser traffic) | API | API-057, API-065 |
| Emails | Mailpit | MAIL-002, MAIL-031, MAIL-072, MAIL-073 |
| Notices | Tasks / workflow banner | NOTIF-035, NOTIF-037, NOTIF-050, NOTIF-054 |
| Daily scheduled-publications task (OMP-registered) | scheduler | JOB-050 |

Scope notes: API-065's `relate` operation is left to *Preprint relations*
{OPS} — only its author-inclusive
re-registrations of the publish/version routes are claimed here.
API-057's `submissionPayment` component is cited by *Payments & APCs*
(rider). AFFW-424's `catalogEntry` half and NOTIF-037's OMP
format-approval surface belong to *Catalog management* (riders); the
publish/versions endpoint cluster of the omnibus submissions controller
is homed at
*[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*
(rider both ways).

## Reference — code anchors

- `lib/pkp/classes/publication/Repository.php` — `publish()`,
  `unpublish()`, `version()`, `validatePublish()`, the abstract
  `setStatusOnPublish()`
- `{app}/classes/publication/Repository.php` — per-app
  `setStatusOnPublish()`, `validatePublish()` additions, `version()`
  cloning; OPS `canCurrentUserPublish()`
- `{app}/classes/publication/Publication.php` — `DEFAULT_VERSION_STAGE`;
  OJS `STATUS_READY_TO_PUBLISH` / `STATUS_READY_TO_SCHEDULE`,
  `getPrePublishStatuses()`
- `{app}/classes/publication/enums/VersionStage.php` — per-app stage
  roster
- `ojs/classes/issue/enums/IssueAssignment.php` — the four assignment
  choices and their statuses
- `lib/pkp/api/v1/submissions/PKPSubmissionController.php` —
  `publishPublication()`, `unpublishPublication()`,
  `versionPublication()`, `createNewPublicationVersionAndNotify()`;
  `ojs/api/v1/submissions/SubmissionController.php`
  (`getIssueAssignmentStatus()`, issue/payment form components);
  `ops/api/v1/submissions/SubmissionController.php` (author-inclusive
  re-registrations)
- `lib/pkp/controllers/modals/publish/PublishHandler.php` +
  `ops/controllers/modals/publish/OPSPublishHandler.php` +
  `lib/pkp/templates/controllers/modals/publish/publish.tpl`
- `{app}/classes/components/forms/publication/PublishForm.php`,
  `IssueEntryForm.php` (OJS/OPS)
- `lib/ui-library/src/pages/workflow/composables/useWorkflowActions.js`,
  `useWorkflowVersionForm.js`, `useWorkflowPublicationFormIssue.js`,
  `useWorkflowPermissions.js`;
  `…/components/publication/WorkflowVersionSideModal.vue`,
  `WorkflowVersionDialogBody.vue`,
  `WorkflowPublicationVersionControl.vue`;
  `src/components/InsertSummaryOfChanges/InsertSummaryOfChangesModal.vue`
- `lib/pkp/classes/observers/listeners/NotifyAuthorOnPublication.php`,
  `ApplyDoneWorkflowStage.php`;
  `ops/classes/observers/listeners/SendPostedAcknowledgement.php`
- `lib/pkp/classes/task/PublishSubmissions.php` +
  `{app}/classes/scheduler/Scheduler.php`
