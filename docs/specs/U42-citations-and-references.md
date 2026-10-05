---
name: citations-and-references
status: verified
---

# Citations & references

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A scholarly work cites other works. This feature records two kinds of
citation for each publication version. **References** are the work's
reference list: one entry per cited work, typed or pasted as plain text,
one reference per line. **Data citations** are structured records of the
datasets the work relies on (title, identifier, repository, creators, and
how the data relates to the study). Authors can be asked, or required, to
give both while submitting. The editorial team maintains both lists on the
workflow's Publication area. A journal can also switch on **metadata
lookup**: the install then tries, in the background, to turn each plain-text
reference into a structured record (identifiers such as a DOI, title,
authors, source) by asking public scholarly registries (Crossref, OpenAlex,
ORCID). Readers see the reference list on the published item's page. On
a journal, data citations travel outward in the generated JATS XML (Side
effects). The free-text *Data Availability Statement* on the same "Data"
page belongs to *[Publication metadata](U40-publication-metadata.md)*.

## Actors & permissions

**Editing follows the publication, not these screens.** Both lists can be
changed by exactly the people who may edit the publication's metadata at
that moment: the gate, and its rules for published versions, belong to
*[Publication metadata](U40-publication-metadata.md#edit-gate)*. Everyone
else who reaches the pages sees them read-only (Rules 9 and 20). Which roles
reach the Publication area's pages at all, and on which stages, is the
workflow screen's rule
([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)).
During submission, the wizard's References box and Data Citations table are
the submitting author's own draft and are always editable there. <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the "References" page (workflow)** | • every role that sees the Publication area's pages, the Author included, while the journal's References setting is not switched off (Rule 2) <sup>a</sup> |
| **Add, edit, delete and reprocess references (workflow)** | • whoever may currently edit the publication's metadata ([→ edit gate](U40-publication-metadata.md#edit-gate)). Everyone else gets the read-only page (Rule 9)<br>• a Site Administrator whose only role in the journal is an assistant role with no assignment on the submission (such as Copyeditor; on a preprint server Editorial Board Member): the read-only page (Rule 9) <sup>a</sup> <sup>q9</sup> |
| **Type references while submitting (wizard)** | • the submitting author, on the wizard's "Details" step, while the journal asks for or requires references (Rule 16) <sup>b</sup> |
| **See the Data Citations list (workflow "Data" page)** | • every role that sees the Publication area's pages, the Author included, while the journal's Data Citations setting is switched on (Rule 18) <sup>a</sup> |
| **Add, edit, delete and order data citations (workflow)** | • whoever may currently edit the publication's metadata. Everyone else may only "View" each one (Rule 20), including a Site Administrator whose only role in the journal is an unassigned assistant role <sup>a</sup> <sup>q2</sup> <sup>q9</sup> |
| **Declare data citations while submitting (wizard)** | • the submitting author, on the wizard's "Details" step, while the journal asks for or requires data citations (Rule 24) <sup>b</sup> |
| **See data citations as a Reviewer** {OJS OMP} | • a Reviewer, in the review screen's "View All Submission Details" window, read-only, while the journal has data citations switched on and the submission carries at least one, unless the assignment's review type is "Anonymous Reviewer/Anonymous Author" (Rule 25) <sup>n</sup> <sup>q21</sup> |
| **See references on the published page** | • any reader, on a published item's landing page, when the version has references (Rule 27) <sup>p</sup> <sup>q23</sup> |
| **Configure references, lookup and data citations** | • Journal Manager, and a Site Administrator who holds a manager role in the journal, on Settings › Workflow › Submission › "Metadata" (Settings that modify behavior)<br>• a Section Editor or an Author who types the page's address gets the access-denied page <sup>c</sup> <sup>q1</sup> |

## Fields & validation

**The References box** (the wizard's "Details" step) is one multi-line box
labelled "References" with the help text "Enter each reference on a new line
so that they can be extracted and recorded separately." It is marked
required only when the journal requires references, and then an empty box
stops the submission (Rule 16). <sup>b</sup>

**The "Add" box** at the top of the workflow's References page is one
multi-line box, also labelled "References" and marked required, with the
help text "Enter each reference on a new line so that they can be
individually processed. You can add one or multiple references at a time.
Click "Add" button to process and move them into the table below. To edit
existing entries, please use the "Edit" option in the table to modify
individual entries." Pressing **Add** with the box empty is refused in place
with "This field is required."; nothing is added, and **Add** stays grayed
out until something is typed in the box. <sup>e</sup> <sup>q3</sup>

**The "Edit citation" panel** opens from a reference's row menu. Its fields
depend on the journal's metadata lookup setting (Settings that modify
behavior). With lookup off it holds one box, **"Edit Raw Citation"**, the
reference's text. With lookup on it holds the structured form below. A save
that fails validation keeps the panel open with the error on the field and
"Please correct one error." ("Please correct {n} errors.") at the foot.
<sup>f</sup> <sup>q6</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Edit Raw Citation** | Yes; marked only with lookup on | The reference as text. With lookup on the box is marked "* Required", and an empty box is refused in place with "This field is required.". With lookup off it carries no marker, and saving it empty is refused with "This is not a valid string." and "This field is required." under the box and "Please correct one error." at the foot. Either way the panel stays open and the row keeps its text. Changing the text does not start a new lookup (Rule 14). <sup>f</sup> |
| **DOI** | No | Help text "e.g. 10.1000/182, doi:10.1000/182, https://doi.org/10.1000/182". Any of the three forms is accepted and kept as the bare DOI. Anything else is refused with "This is not formatted correctly." <sup>f</sup> |
| **URL** | No | Must be a web address, or "This is not a valid URL." <sup>f</sup> |
| **URN** | No | Free text. <sup>f</sup> |
| **Arxiv** | No | Help text "e.g. 1234.123456v2, arxiv:1234.123456v2, https://arxiv.org/abs/1234.123456v2". A bare ID is kept as typed ("2101.12345v2"). Typed as "arxiv:2101.12345v2" or "https://arxiv.org/abs/2101.12345v2", it is stored as "2101.12345", without its version ⚠ [A12](#a12). Anything else: "This is not formatted correctly." <sup>f</sup> |
| **Handle** | No | Help text "e.g. 20.1000/100, handle:20.1000/100, https://hdl.handle.net/20.1000/100". Kept as the bare handle. Anything else: "This is not formatted correctly." <sup>f</sup> |
| **Title** | No | The cited work's title. <sup>f</sup> |
| **Author Information** | No | A small table with the columns **Given Name**, **Family Name** and **ORCID iD**, an "Add" button for a new row and a "Delete" per row. The boxes have no names for a screen reader ⚠ [A14](#a14). A row added and left empty is saved as an author with no name [A13](#a13). The ORCID iD box takes any text and keeps it as typed, and the expanded row links the author's ORCID icon to it ⚠ [A22](#a22). <sup>f</sup> |
| **Source Name** · **Source Issn** · **Publisher or Host** | No | Free text: the journal, book series or platform the cited work appeared in. <sup>f</sup> |
| **Source Type** | No | A list: Book Series, Conference, Ebook Platform, Journal, Metadata, Other, Repository. It arrives with nothing chosen and has no empty entry: once a value is picked it can be changed but not cleared. <sup>f</sup> |
| **Publication Date** | No | A date picker. <sup>f</sup> |
| **Type** | No | A list of work types (Book, Book Chapter, Dataset, Dissertation, Journal Article, Preprint, Report and some thirty more). Like "Source Type", it arrives with nothing chosen and has no empty entry. <sup>f</sup> |
| **Volume** · **Issue** · **Pages** · **First Page** · **Last Page** | No | Free text. <sup>f</sup> |

**The data citation panel** ("Add Data Citation", "Edit Data Citation") is
the same form for adding and editing. A save that fails validation keeps
the panel open, as above. The read-only **"View Data Citation"** panel shows
the same fields as text; its only button is the panel's "Close".
<sup>l</sup> <sup>q16</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Title** | Yes | The dataset's title. Empty: "This field is required." <sup>l</sup> |
| **Identifier type** | No | A list: DOI, Accession, PURL, ARK, URI, ARXIV, ECLI, Handle, ISSN, ISBN, PMID, PMCID, UUID. It arrives with nothing chosen and has no empty entry. A type without an identifier is refused with "This field is required when identifier type is present.", an identifier without a type with "This field is required when identifier is present.". So once an identifier is saved it cannot be removed: clearing it on "Edit Data Citation" is refused, and the type cannot be set back to nothing ⚠ [A15](#a15). <sup>l</sup> |
| **Identifier** | No | Checked against the chosen type: an identifier that is not valid for it is refused with ""{identifier}" is not a valid {type} identifier." A valid identifier typed as a full address or with a prefix ("https://doi.org/…", "doi:…") is stored bare (Rule 21). Of type "ARXIV", "https://arxiv.org/abs/1234.12345v2" is saved as "1234.12345", and a bare ID with a version is refused (""3456.34567v4" is not a valid ARXIV identifier.") while "4567.45678" is accepted [A12](#a12). <sup>l</sup> |
| **Relationship type** | Yes | Four choices: "Supporting data without specifying whether they were generated or analyzed (supporting).", "Supporting data that were generated for the study (generated).", "Supporting data that were analyzed but not generated for the study (analyzed).", "Referenced data that were neither generated nor analyzed for the study (non-analyzed)." It arrives with nothing chosen. <sup>l</sup> |
| **Repository** | No | Free text: where the dataset is held, or its publisher. <sup>l</sup> |
| **Year** | No | A four-digit year. "202" or "20245" is refused with "This must be 4 digits long."; a value with letters ("20a4") gets "This is not a valid integer." and "This must be 4 digits long." together. <sup>l</sup> |
| **Creators** | No | The same Given Name / Family Name / ORCID iD table as a reference's authors, but here an ORCID iD is accepted only as the full address ("https://orcid.org/0000-0002-1825-0097"). Anything else, the bare iD included, is refused with "The ORCID iD you specified is invalid. Please include the full URI (e.g. "https://orcid.org/0000-0002-1825-0097")." <sup>l</sup> |
| **URL** | No | Must be a web address, or "This is not a valid URL." <sup>l</sup> |

**Typing that is not added or saved is dropped without a question.** Lines
typed in the "Add" box but not added are gone after a move to another
Publication page or after closing the submission's workflow screen.
Closing "Edit citation", "Add Data Citation" or "Edit Data Citation" with
its "Close", or leaving the page while one of them is open, drops what was
typed. Nothing asks first. The one exception is an author row added in
"Edit citation": the row itself comes back, empty ([A13](#a13)).
<sup>t</sup>

## Rules & state

### References

1. **One reference list per version.** Each publication version carries its
   own ordered list of references, each reference one entry with its own
   text. The wizard, the workflow's References page and the landing page all
   show the current version's list. Switching the version on the Publication
   area switches the list with it (see
   *[Publication metadata](U40-publication-metadata.md)*, Rule 3).
   <sup>o</sup>
2. **Availability follows the References setting.** The setting on
   Settings › Workflow › Submission › "Metadata" has four levels (Settings
   that modify behavior). Switched off: no "References" page in the
   workflow and no References box in the wizard, but references stored
   earlier stay on the published page (Rule 27). Enabled without asking
   authors ("Do not request…"): the workflow page only. Ask or require: the
   wizard's box as well (Rule 16). A new journal starts at "ask". <sup>c</sup>
3. **The References page.** The Publication area's **"References"** entry
   opens a page headed "Publication: References" ("Preprint: References" on
   a preprint server). With metadata lookup off it shows, top to bottom:
   <sup>d</sup>
   - the "Add" box and its **Add** button (Fields & validation);
   - a **"Delete all references"** link;
   - a table titled **"Structured References"**, with the line "The above
     references have been organised here in a structured format." and a
     search box "Search references here" above it. Its one visible column
     is also headed "Structured References". An empty table reads "The
     citations list is empty, please add citations above." The title and
     the line are the same whether or not lookup is on.

   With the interface in French, the "Add" box's help text, "Delete all
   references", the table's texts and the windows the page opens read
   raw codes where French words belong ⚠ [A21](#a21).
4. **The row.** Each row shows the reference's text and a "More Actions"
   ("…") menu with **"Edit"** and **"Delete"** (with lookup on, also
   "Reprocess", Rule 15). References are listed in the order they were
   entered; there is no way to reorder them. A row with nothing to expand
   (every row while lookup is off) also carries an invisible "Collapse"
   button that a screen reader announces ([A16](#a16)). <sup>d</sup>
5. **Adding references.** Each line of the "Add" box becomes one reference,
   appended after the existing ones in line order. Blank lines are skipped
   (a line of only spaces or tabs is blank). Spaces and tabs at a line's
   ends are dropped, and runs of them inside it shrink to one space. After
   a successful Add the box empties, "Saved" shows beside **Add**, and the
   table shows the new rows. <sup>e</sup> <sup>q4</sup>
   A line whose exact text (capitals count) is already in the list, or
   appeared earlier in the same paste, is dropped without any message
   ⚠ [A2](#a2). <sup>q5</sup>
6. **Editing a reference.** "Edit" opens the "Edit citation" side panel
   prefilled with the reference (Fields & validation). Saving closes the
   panel and the row shows the change. With lookup off only the text can
   be changed. Saving the same text as another reference is accepted, so
   the list then shows two identical rows that "Add" would have dropped
   ⚠ [A17](#a17). <sup>f</sup> <sup>q6</sup>
7. **Deleting.** A row's "Delete" asks "Delete" / "Are you sure you wish to
   delete this item? This action cannot be undone." with **"OK"** and
   **"Cancel"**. OK removes that reference from this version; Cancel leaves
   it. **"Delete all references"** asks "Delete all references" / "This will
   remove all references currently listed. You'll need to re-enter and
   process your citations again if you continue." with "OK" and "Cancel";
   OK empties this version's list. The link is offered on an empty list
   too, where OK changes nothing. <sup>f</sup> <sup>q7</sup>
8. **Searching.** Typing in "Search references here" and pressing Enter
   narrows the table to the rows that contain every typed word, ignoring
   case; typing alone changes nothing. Emptying the box and pressing Enter
   again, or pressing the box's "Clear search phrase" (×), shows every
   row. The words are matched against everything the page knows about the
   reference, not only what the row shows: a word such as "citations" or
   "http" keeps every row, even where the row's text has neither
   ⚠ [A3](#a3). <sup>g</sup> <sup>q8</sup>
9. **Read-only presentation.** For a viewer who may not edit the
   publication (Actors & permissions), the page renders the same list with
   the Add button, "Delete all references" and (with lookup on) "Reprocess
   all references" grayed out and no "…" menu on the rows. The "Add" box
   can still be typed in, but nothing can be added. The search box and the
   expanders still work. <sup>a</sup> <sup>q2</sup>

### Metadata lookup

10. **What lookup adds to the page.** With the journal's metadata lookup
    switched on, the References page additionally shows: <sup>d</sup>
    <sup>q10</sup>
    - above the "Add" box, the heading "Structured References" and the text
      "Structuring and Metadata Lookup is enabled for this Journal. The
      system will process your references and retrieve DOIs and other
      metadata from external sources. This may take some time, but you can
      continue working on your submission and return to this page later to
      view the updated structured citations." On a press or a preprint
      server the text still says "this Journal" ⚠ [A4](#a4); <sup>q12</sup>
    - the progress box (Rule 13) under the "Add" box;
    - a **"Reprocess all references"** link beside "Delete all references";
    - an **"Expand All"** / **"Collapse All"** link as the table's second
      column header, and an expander on each structured row (Rule 12).
      With no structured reference in the list (an empty list included),
      "Expand All" still toggles to "Collapse All" and back, and nothing
      else on the page changes.
11. **How a reference gets structured.** Every reference added while lookup
    is on (through "Add", the wizard's box, or a reprocess) is handed to a
    chain of background steps, which run after the page has answered:
    <sup>h</sup>
    1. identifiers written into the text are picked out: a DOI, an arXiv
       ID, a handle, a web address, a URN;
    2. a reference with no DOI is looked up by its text in Crossref, which
       may supply the DOI and the bibliographic details;
    3. a reference with a DOI is looked up in OpenAlex, which may supply
       title, authors, source, date, volume, issue, pages and the OpenAlex
       and Wikidata links;
    4. each author with an ORCID iD is looked up in ORCID;
    5. the reference is marked finished.

    A reference counts as **structured** once it has at least one
    identifier (DOI, arXiv ID, handle, web address or URN), a title and at
    least one author row, even one whose names are empty ⚠ [A13](#a13),
    however those arrived. A service that is busy or
    unreachable is retried later, at growing intervals; after the last
    retry the reference is marked as failed and the chain stops for it
    (Side effects). <sup>h</sup>
12. **The row with lookup on.** The row first shows the reference's
    identifiers as links: the DOI (opening doi.org), the web address, the
    arXiv ID and the handle, and "urn: {urn}" as plain text. <sup>i</sup>
    - A **structured** row then shows the cited work's title. A click on
      its expander, or "Expand All", opens the details: the authors (family
      name, then given name, each with an ORCID link where known), the
      source name, "Publication Date:", "Volume:", "Issue Number:",
      "Pages: {first} - {last}" where known, and the reference's own text
      in small print. "Wikidata" and "OpenAlex" badges link to those
      records when the lookup supplied them. The expander is named
      "Collapse" whether the row is open or closed, and Enter or Space on
      it does nothing ⚠ [A16](#a16).
    - An **unstructured** row shows the reference's text. Once its chain
      has finished without structuring it, the row carries the badge **"No
      structured information found"**.
    - A reference whose lookup failed for good shows neither details nor
      badge; nothing tells it apart from one still waiting ⚠ [A5](#a5).
13. **The progress box.** While at least one reference is structured, a
    box under the "Add" box reads "Processing references - {finished}/{total}"
    with "We're retrieving metadata for each reference. This may take a few
    moments. While we aim to match as many references as possible, some
    entries may not return metadata. Feel free to continue working in the
    meantime.", or, once every counted reference has finished, "All {total}
    references successfully processed" with "All references have been
    processed and added below. You can review, edit or remove them at any
    time." Both numbers count structured references only: references still
    waiting, unstructured ones and failed ones are left out, so the box is
    absent until the first reference is structured, and "All 2 references
    successfully processed" can stand over a list of five ⚠ [A6](#a6).
    While the box shows a count below its total, the page refreshes the
    list by itself every few seconds; otherwise the list changes only on a
    reload. <sup>i</sup> <sup>q11</sup>
14. **Editing with lookup on.** "Edit" opens the structured form of
    Fields & validation. Filling an identifier, a title and an author by
    hand makes the reference structured at once (Rule 11), whether or not
    any lookup ran. Saving does not start a lookup, and editing only the
    "Edit Raw Citation" text leaves the structured details as they were.
    <sup>f</sup> <sup>q11</sup>
15. **Reprocessing.** An unstructured row's menu adds **"Reprocess"**. It
    asks "Are you sure you want to reprocess this citation?" with "OK" and
    "Cancel"; OK sends the reference through the chain of Rule 11 again.
    **"Reprocess all references"** asks "Reprocess all references" / "This
    will reprocess all references currently listed. You'll need to re-enter
    your manual changes again if you continue." with "OK" and "Cancel"; OK
    sends every reference of the version through the chain, structured ones
    included, and the services' answers may overwrite details edited by
    hand. <sup>j</sup> <sup>q13</sup>

### References while submitting

16. **The wizard's References box.** While the journal asks for or requires
    references, the "Details" step shows the References box (Fields &
    validation) after the title, keywords and abstract. The box holds the
    whole list as text: whenever the step saves, the list is rebuilt from
    the box, one reference per line, in line order. Here, unlike Rule 5, a
    line repeated in the box stays a repeated reference.
    <sup>b</sup> <sup>k</sup> <sup>q14</sup>
    - **When the step saves.** Moving to another step saves the step at
      once: "Continue", the step rail, or the footer's "Back" (from
      "Details" to "Upload Files"). So a change carried to "Review" by
      "Continue" or the step rail is listed there, and "Submit" › "Submit"
      completes the submission with it. "Save for Later" also saves the
      step before the "Saved for Later" screen shows.
    - **Staying on the step, or leaving it.** While the author stays on
      the step, the wizard's autosave saves about a minute after the time
      the footer gives as "Last saved", not a minute after typing stops,
      so a change typed late in that minute is saved within seconds
      ([→ autosave](U21-submission-wizard.md#autosave)). Leaving the page
      before a save (another address, the dashboard) drops the typed text
      without a question.
    - **On "Review".** The "Review" step's "Details" section lists the
      references one per line under "References", or "None provided".
    - **Required and empty.** When the journal requires references and the
      box is empty, "Review" lists "References / None provided". When the
      step's check has finished ("Checking your submission" shows while it
      runs, [→ the Review step](U21-submission-wizard.md#review-step)),
      "This field is required." shows above "References" and "Submit" is
      grayed out. The submission cannot be completed until the box is
      filled.
17. **Identifiers from the wizard with lookup off.** With lookup off, a
    reference added through the workflow's "Add" keeps the DOI written in
    its text as its DOI, which shows as a link, and in the "DOI" box of
    "Edit", once lookup is switched on (Rule 12). A reference typed into
    the wizard's box does not keep it ⚠ [A7](#a7). <sup>k</sup>
    <sup>q15</sup>

### Data citations

18. **Where data citations live.** While the journal's Data Citations
    setting is switched on, each version carries a list of data
    citations, shown: <sup>c</sup> <sup>l</sup>
    - on the workflow's **"Data"** page (the Publication area's "Data"
      entry, headed "Publication: Data", on a preprint server "Preprint:
      Data"), first, above the Data
      Availability Statement that *[Publication metadata](U40-publication-metadata.md)*
      owns (its Rule 16);
    - in the wizard's "Details" step while the journal asks for or requires
      them (Rule 24);
    - read-only in a Reviewer's "View All Submission Details" window
      (Rule 25).
    Switching the setting off hides the list everywhere and keeps the stored
    data citations. <sup>c</sup>
19. **The Data Citations table.** A table headed **"Data Citations"**. For a
    viewer who may edit, it carries the line "Add formal data citations,
    ensuring datasets are properly credited and appear alongside other
    references in the publication." and, above the table, **"Order"** and
    **"Add Data Citation"**. The visible column is **"Title"**: each row
    shows the dataset's identifier, when it has one, above its title. An
    empty table reads "No data citations have been added." <sup>l</sup>
20. **Row actions.** Each row's "More Actions" ("…") menu offers **"View"**
    to everyone, and **"Edit"** and **"Delete"** only to a viewer who may
    edit the publication. A viewer who may not edit sees no line under the
    heading, no "Order" and no "Add Data Citation". "View" opens the
    read-only "View Data Citation" panel. <sup>l</sup> <sup>q2</sup>
21. **Add and edit.** "Add Data Citation" opens the "Add Data Citation" side
    panel; "Edit" opens the same form titled "Edit Data Citation", prefilled
    (Fields & validation). Saving closes the panel and the table updates in
    place. An identifier is stored without its type's address or prefix, so
    a DOI typed as "https://doi.org/10.1234/abcd" shows as "10.1234/abcd".
    <sup>l</sup> <sup>q17</sup>
22. **Delete.** "Delete" asks "Delete" / "Are you sure you wish to delete
    this item? This action cannot be undone." with "OK" and "Cancel". OK
    removes the data citation from this version; Cancel leaves it.
    <sup>l</sup>
23. **Ordering.** Until an order is saved, the table keeps no order of
    its own: data citations usually show in the order they were added,
    but can come back in another order on a later visit ⚠ [A8](#a8).
    "Order" puts the table in ordering mode: each row's "…" menu gives
    way to up and down arrows, which have no names for a screen reader
    ⚠ [A19](#a19), and the button reads **"Save Order"**. Pressing it
    saves the order shown, which then holds across reloads, and leaves
    ordering mode. A data citation added after an order was saved
    appears first, above every ordered row ([A8](#a8)). <sup>m</sup>
    <sup>q18</sup>
24. **Data citations while submitting.** While the journal asks for or
    requires data citations, the "Details" step shows a **"Data"** section
    headed "Data" with "Information about the research data associated with
    your submission.", holding the Data Citations table with every control
    of Rules 19–23, before any Data Availability Statement field. The
    "Review" step's "Details" section lists the data citations' titles
    under "Data Citations", or "None provided". When the journal requires
    data citations and none is given, the Review step shows the warning
    "Data citations are required.", but the submission can be submitted
    anyway ⚠ [A9](#a9). <sup>b</sup> <sup>q19</sup> On a press or a
    preprint server, the section's table and the Review step do not change
    after a save in the wizard (a first add, a later add, an edit) until
    the page is reloaded ⚠ [A10](#a10). <sup>q20</sup>
25. **What a Reviewer sees** {OJS OMP}. The review screen's "View All
    Submission Details" window (see
    *[Reviewer's review](U28-reviewers-review.md)*) includes the Data
    Citations table, read-only (Rule 20: "View" only), when the journal has
    data citations switched on and the version under review has at least
    one. Under the review type "Anonymous Reviewer/Anonymous Author" the
    window shows no data citations. The window never shows the references.
    <sup>n</sup> <sup>q21</sup>

### Across versions and to readers

26. **New versions start with a copy.** Creating a new version (see
    *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*)
    copies the current version's references, with their structured details
    and lookup state, and its data citations into the new version. From
    then on each version's lists change independently. <sup>o</sup>
    <sup>q22</sup>
27. **What readers see.** On a published item's landing page, a
    **"References"** block lists the version's references, one paragraph
    each, in list order, with any web address in a reference's text turned
    into a link that opens in a new tab. The block appears whenever the
    version has references, even after the journal switched the References
    setting off. It shows each reference's own text, never the structured
    details. Readers never see data citations on the landing page, though
    the editors' table promises they "appear alongside other references in
    the publication" ⚠ [A11](#a11). On a press or a preprint server, the
    page shows the "References" heading even for an item with no
    references ⚠ [A20](#a20). The page itself belongs to *Article landing
    page & reading* (on a press, *Monograph landing page*). <sup>p</sup>
    <sup>q23</sup>

## Side effects

- Adding, editing, deleting, reprocessing or reordering references and data
  citations sends no email, raises no notification and writes no
  activity-log line. <sup>r</sup>
- With metadata lookup on, each reference added or reprocessed makes the
  install send requests to Crossref, OpenAlex and ORCID in the background.
  The requests carry the journal's contact email, which Crossref uses to
  admit them to its faster service. The install paces itself per service
  (about three Crossref requests a second, one without a contact email; 90
  a second for OpenAlex; 11 a second and 24,500 a day for ORCID), waits as
  long as a busy service asks, retries an unreachable one after 5 minutes,
  then 10, 20 and so on up to eight times, and then marks the reference as
  failed (Rule 12). Nobody is told. <sup>h</sup>
- References travel outward in the Native XML export (Tools › "Native XML
  Plugin"), which carries no data citations. On a journal the generated
  JATS XML (the "JATS XML" page) carries both, each data citation as a
  data reference. DOI registrations carry them too: a journal's Crossref
  registration sends both lists and its DataCite registration the data
  citations; a preprint server's Crossref registration sends the data
  citations. Those surfaces belong to *DOIs*, *Import & export* and *JATS
  & Body Text*. <sup>r</sup>
- A journal's Crossref plugin can also, once its references are
  deposited, fetch the DOIs Crossref matched to them on an hourly schedule
  and store them on the references (*DOIs*). <sup>r</sup>
- On a journal, the "Body Text" editor offers the version's references for
  inserting citations into the article's text (*JATS & Body Text*).
  <sup>r</sup>

## Settings that modify behavior

All three sit on Settings › Workflow › Submission › "Metadata", among the
other metadata items that *[Publication metadata](U40-publication-metadata.md)*
describes in general terms (the box that enables an item and the
submission-time choice under it). <sup>c</sup> <sup>q1</sup>

- **"References"** ("Collect a submission's references in a separate field.
  This may be required to comply with citation-tracking services such as
  Crossref."): the box "Enable references metadata", then "Do not request
  references from the author during submission." / "Ask the author to
  provide references during submission." / "Require the author to provide
  references before accepting their submission." Install default: enabled
  at "Ask the author…". Unticked: no References page, no wizard box, stored
  references still shown to readers (Rules 2, 27). "Do not request…": the
  page without the wizard box. "Require…": the wizard's box is marked
  required and an empty one stops the submission (Rule 16). <sup>c</sup>
- **"References Metadata Lookup"**: the box "Enable references structuring
  and metadata lookup", shown only while "Enable references metadata" is
  ticked. Install default: off. On: new and reprocessed references go
  through the lookup, and the References page gains the lookup controls and
  displays (Rules 10–15); "Edit" opens the structured form. Off: references
  stay plain text, the page shows only the controls of Rules 3–7, and
  "Edit" offers the text alone. Switching it off does not erase details
  already found; they simply stop showing. <sup>c</sup>
- **"Data Citations"** ("A data citation typically identifies a dataset
  that supports the findings of the work. Data citations ensure
  reproducibility, transparency, and proper attribution of research
  data."): the box "Enable data citation metadata", then "Do not request
  data citation metadata from the author during submission." / "Ask the
  author for data citation metadata during submission." / "Require the
  author to add data citation metadata before accepting their
  submission." Install default: off. Enabled: the "Data" page and its
  table (Rules 18–23). Ask or require: the wizard's "Data" section as well
  (Rule 24). Require: the Review step's warning, without blocking
  ([A9](#a9)). <sup>c</sup>

Who may edit the lists follows the Roles setting "Permit submission metadata
edit." and each participant's assignment, described by
*[Publication metadata](U40-publication-metadata.md#edit-gate)*.

## Cross-feature interactions

- *[Publication metadata](U40-publication-metadata.md)*: owns the edit gate
  both lists follow ([→ edit gate](U40-publication-metadata.md#edit-gate)),
  the general mechanics of the "Metadata" settings screen, and the Data
  Availability Statement that shares the "Data" page with the Data
  Citations table.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*:
  which roles see the "References" and "Data" entries, and where they sit
  in the Publication area
  ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)).
- *[Submission wizard](U21-submission-wizard.md)*: the "Details" and
  "Review" steps, their autosave and the submit check that Rule 16's
  required references and Rule 24's warning take part in.
- *[Reviewer's review](U28-reviewers-review.md)*: the "View All Submission
  Details" window that shows the Data Citations table (Rule 25).
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  creating the version that receives the copies of Rule 26.
- [Article landing page & reading](U13-article-landing-page-and-reading.md) and
  [Monograph landing page](U69-monograph-landing-page.md): the published page whose
  "References" block Rule 27 describes.
- [DOIs](U45-dois.md), [Import & export](U63-import-export.md),
  [JATS & Body Text](U48-jats-and-body-text.md): the
  deposits, exports, generated JATS XML and Body Text editor that carry the
  lists outward (Side effects).
- *[Funding](U43-funding.md)*: the sibling list on the next Publication
  entry. Unlike funders, which belong to the submission as a whole, both
  lists here belong to one version. <sup>o</sup>

## Canonical scenarios

Scenarios 1–3 run on the seeded journal with ready accounts and scratch
submissions; scenarios 4–9 run on scratch journals with throwaway
accounts, because each needs a setting at its other end or changes one.
The accounts, passwords and tooling recipe are in the footnote. <sup>s</sup>

1. **Maintain the reference list**

   Given: Journal Manager, on the seeded journal, with an Author's
   submitted scratch submission that has no references.

   - **"References"**: open the submission's workflow, then its
     Publication area, then "References": the page is headed
     "Publication: References" ("Preprint: References" on a preprint
     server) and shows, top to bottom, the "Add" box labelled
     "References" with its **Add** button, a "Delete all references"
     link, and a table titled "Structured References" with the line "The
     above references have been organised here in a structured format."
     and the search box "Search references here" above it (Rule 3).
   - **An empty Add**: press **Add** with the box empty: "This field is
     required." appears, nothing is added, and **Add** stays grayed out
     until something is typed in the box (Fields & validation).
   - **Several lines at once**: type four lines into the box: "Alpha
     study 2020" with two spaces between each pair of words, an empty
     line, "Beta trial 2021" with two spaces before and after it, and
     "Gamma report 2022"; press **Add**: the box empties, "Saved" shows
     beside **Add**, and the table lists "Alpha study 2020", "Beta trial
     2021" and "Gamma report 2022", in that order and with single spaces
     (Rule 5).
   - **Edit**: open the "More Actions" ("…") menu of "Alpha study 2020":
     it offers "Edit" and "Delete"; press "Edit": the "Edit citation"
     panel holds one box, "Edit Raw Citation", with the reference's text.
     Clear the box and press "Save": "This is not a valid string." and
     "This field is required." show under the box and "Please correct one
     error." at the foot, the panel stays open and the row keeps its
     text. Type "Alpha study 2020, revised" and press "Save": the panel
     closes and the row reads "Alpha study 2020, revised" (Rules 4, 6;
     Fields & validation).
   - **Search**: type "BETA" in "Search references here": the table does
     not change until you press Enter; then it lists "Beta trial 2021"
     alone. Press the box's "Clear search phrase" (×): all three rows are
     back (Rule 8).
   - **The Author's read-only page** (journal, press): the submission's
     Author: open the same page of their own submission: the three rows are listed, **Add** and "Delete all
     references" are grayed out, and the rows carry no "…" menu; type
     "Delta paper 2023" in the "Add" box: the box takes it, but **Add**
     stays grayed out; type "gamma" in the search box and press Enter:
     the table lists "Gamma report 2022" alone (Rule 9).
   - **Delete**: Journal Manager: choose "…" › "Delete" on "Gamma report
     2022": a confirmation headed "Delete" asks "Are you sure you wish to
     delete this item? This action cannot be undone."; press "Cancel":
     the row stays; delete it again and press "OK": the row is gone
     (Rule 7).
   - **Delete all references**: press "Delete all references": a
     confirmation headed "Delete all references" reads "This will remove
     all references currently listed. You'll need to re-enter and process
     your citations again if you continue."; press "OK": the table reads
     "The citations list is empty, please add citations above." (Rules 3,
     7).
   - **Nothing else happens**: the submission's Activity Log gained no
     line from these adds, edits and deletes, and no email about them
     reached the mail catcher (Side effects).
   - **Control**: before the first add, the table read "The citations
     list is empty, please add citations above." (Rule 3). <sup>s</sup>

2. **Type references while submitting**

   Given: Author, on the seeded journal, which asks for references
   during submission, with the Author's own unfinished submission
   carrying its file.

   - **The "Details" step**: open the unfinished submission and go on to
     its "Details" step: after the title, keywords and abstract comes the
     "References" box, with the help text "Enter each reference on a new
     line so that they can be extracted and recorded separately." and no
     required mark (Rule 16; Fields & validation).
   - **An empty box on "Review"**: leave the box empty and press
     "Continue" on each step until "Review": its "Details" section shows
     "None provided" under "References" (Rule 16).
   - **A repeated line**: open "Details" again from the step rail, type
     "Beta trial 2021", "Alpha study 2020" and "Beta trial 2021" on three
     lines and press "Continue", which saves the step at once (Rule 16).
   - **On "Review"**: press "Continue" on each following step until
     "Review": its "Details" section lists under "References" "Beta trial
     2021", "Alpha study 2020" and "Beta trial 2021", one per line, the
     repeated line kept; complete the submission with "Submit" ›
     "Submit" (Rule 16).
   - **The Journal Manager's list**: Journal Manager: open the new
     submission's workflow, then its Publication area, then
     "References": the rows read "Beta trial 2021", "Alpha study 2020"
     and "Beta trial 2021", in that order (Rules 1, 16).
   - **Control**: the Journal Manager's table holds those three rows and
     no other: the empty box saved on the way to the first "Review"
     added no reference (Rule 16). <sup>s</sup>

3. **Read a published item's references**

   Given: Reader, on the seeded journal, with a published scratch
   submission whose references are "Zulu report 2019" and "Alpha study
   2020 https://example.org/alpha", in that order, and a second published
   scratch submission with no references.

   - **The "References" block**: open the first item's landing page (an
     article's page; on a press the catalog's book page, on a preprint
     server the preprint's page): a "References" block lists "Zulu report
     2019" and then "Alpha study 2020 https://example.org/alpha", one
     paragraph each, in list order (Rule 27).
   - **The linked address**: "https://example.org/alpha" is a link, and
     it opens in a new tab (Rule 27).
   - **Control**: the second item's page shows no reference text; on a
     journal it has no "References" block at all ([A20](#a20) records
     what a press or a preprint server shows instead) (Rule 27).
     <sup>s</sup>

4. **The journal's References setting**

   Given: Journal Manager and an Author, on a scratch journal at the
   install defaults, with a published scratch submission whose one
   reference is "Alpha study 2020" and the Author's own unfinished
   submission carrying its file.

   - **"Do not request…"**: open Settings › Workflow › Submission ›
     "Metadata"; under "References" the box "Enable references metadata"
     is ticked with "Ask the author to provide references during
     submission." chosen; choose "Do not request references from the
     author during submission." and save. Author: open the unfinished
     submission and go on to its "Details" step: it has no References
     box. Journal Manager: the published submission's Publication area
     still lists "References" (Rule 2; Settings bullet 1).
   - **Switched off**: on the same screen untick "Enable references
     metadata": the "References Metadata Lookup" box disappears; save.
     The published submission's Publication area lists no "References"
     entry. Author: the unfinished submission's "Details" step still has
     no References box. Open the published item's landing page (an article's page; on a
     press the catalog's book page, on a preprint server the preprint's
     page): its "References" block still lists "Alpha study 2020"
     (Rules 2, 27; Settings bullets 1, 2).
   - **"Require…"**: tick "Enable references metadata" again, choose
     "Require the author to provide references before accepting their
     submission." and save. Author: open the unfinished submission again
     and go on to its "Details" step: the References box is marked
     required. Leave it empty and press "Continue" on each step until
     "Review": once "Checking your submission" has gone, its "Details"
     section shows "None provided" under "References", "This field is
     required." stands above "References", and "Submit" is grayed out
     (Rule 16; Settings bullet 1).
   - **The box filled**: open "Details" from the step rail, type "Gamma
     report 2022" in the References box, press "Continue" on each step
     until "Review", then "Submit" › "Submit": the submission completes.
     Journal Manager: the new submission's "References" page lists "Gamma
     report 2022" (Rule 16).
   - **Control**: before the first change, the Author's "Details" step
     showed the References box with no required mark, and the published
     submission's Publication area listed "References" (Rules 2, 16).
     <sup>s</sup>

5. **Metadata lookup switched on**

   Given: Journal Manager, on a scratch journal with "References Metadata
   Lookup" switched on, with a scratch submission whose one reference is
   "Alpha study 2020".

   - **The page with lookup on**: open the submission's workflow, then
     its Publication area, then "References": above the "Add" box stand
     the heading "Structured References" and the text "Structuring and
     Metadata Lookup is enabled for this Journal. The system will process
     your references and retrieve DOIs and other metadata from external
     sources. This may take some time, but you can continue working on
     your submission and return to this page later to view the updated
     structured citations." (on a press or a preprint server, check only
     that it opens "Structuring and Metadata Lookup is enabled";
     [A4](#a4) records the rest); "Reprocess all references" stands
     beside "Delete all references", and "Expand All" heads the table's
     second column (Rule 10).
   - **"Expand All" with nothing structured**: press "Expand All": it
     reads "Collapse All"; press it again: "Expand All"; nothing else on
     the page changes (Rule 10).
   - **A plain row**: the row shows "Alpha study 2020", and its "…" menu
     offers "Edit", "Delete" and "Reprocess" (Rules 4, 12, 15).
   - **An empty "Edit Raw Citation"**: press "Edit": the "Edit citation"
     panel shows the structured form, its "Edit Raw Citation" box marked
     "* Required"; clear that box and press "Save": "This field is
     required." shows under it and the panel stays open; press the
     panel's "Close": the row still reads "Alpha study 2020" (Fields &
     validation).
   - **Structured by hand**: press "Edit" again; type "10.1234/abcd" in
     "DOI", "Alpha study" in "Title", "Journal of Tests" in "Source Name"
     and "12" in "Volume"; under "Author Information" press "Add" and
     type "Ada" as Given Name and "Lovelace" as Family Name; press "Save":
     the panel closes, the row shows the DOI "10.1234/abcd" as a link
     opening doi.org, then the title "Alpha study" with an expander, and
     its "…" menu no longer offers "Reprocess". A box under the "Add" box
     reads "Processing references - 0/1" (no lookup finishes on a test
     install) (Rules 11–15).
   - **The details**: click the row's expander: the details show
     "Lovelace Ada", "Journal of Tests", "Volume: 12" and the reference's
     own text "Alpha study 2020" in small print (Rule 12).
   - **Only the text edited**: press "Edit", change "Edit Raw Citation"
     to "Alpha study 2020, revised" and press "Save": the row still shows
     the DOI link and the title "Alpha study", and its details now show
     "Alpha study 2020, revised" in small print (Rule 14).
   - **Control**: on Settings › Workflow › Submission › "Metadata"
     untick "Enable references structuring and metadata lookup" and
     save: the "References" page shows no lookup heading or text, no
     "Reprocess all references", no "Expand All" and no progress box; the
     row shows only "Alpha study 2020, revised", and "Edit" offers the
     "Edit Raw Citation" box alone. Tick the box again and save: the row
     shows its DOI link and title again (Settings bullet 2; Rules 3, 6).
     <sup>s</sup>

6. **Maintain data citations**

   Given: Journal Manager, on a scratch journal whose "Data Citations"
   setting is at "Ask the author for data citation metadata during
   submission.", with an Author's submitted scratch submission that has
   no data citations.

   - **"Data"**: open the submission's workflow, then its Publication
     area, then "Data": the page is headed "Publication: Data"
     ("Preprint: Data" on a preprint server) and opens with the table
     "Data Citations", the line "Add formal data citations, ensuring
     datasets are properly credited and appear alongside other
     references in the publication." and, above the table, "Order" and
     "Add Data Citation" (Rules 18, 19).
   - **An empty save**: press "Add Data Citation": the "Add Data
     Citation" panel opens; press "Save" with nothing filled: the panel
     stays open with "This field is required." under "Title" and an error
     under "Relationship type" (Fields & validation).
   - **Refused values**: type "Ocean temperature records" in "Title",
     choose "Supporting data that were generated for the study
     (generated)." as "Relationship type" and "DOI" as "Identifier type",
     type "not-a-doi" in "Identifier" and press "Save": the save is
     refused with ""not-a-doi" is not a valid DOI identifier.". Replace
     the identifier with "https://doi.org/10.1234/abcd", type "202" in
     "Year" and press "Save": "This must be 4 digits long.". Replace the
     year with "2024"; under "Creators" press "Add", type "Ada" as Given
     Name, "Lovelace" as Family Name and "0000-0002-1825-0097" as ORCID
     iD, and press "Save": "The ORCID iD you specified is invalid. Please
     include the full URI (e.g. "https://orcid.org/0000-0002-1825-0097")."
     (Fields & validation).
   - **The saved data citation**: replace the ORCID iD with
     "https://orcid.org/0000-0002-1825-0097" and press "Save": the panel
     closes and the table's row shows "10.1234/abcd" above "Ocean
     temperature records" (Rules 19, 21).
   - **View and Edit**: the row's "…" menu offers "View", "Edit" and
     "Delete". "View" opens "View Data Citation" with the fields as text
     and the panel's "Close" as its only button; close it. "Edit" opens
     "Edit Data Citation" with "Identifier" holding "10.1234/abcd";
     change "Title" to "Ocean temperature records, revised" and press
     "Save": the row shows the new title (Rules 20, 21; Fields &
     validation).
   - **Ordering**: add two more data citations the same way, "Dataset B"
     and then "Dataset C", each with "Supporting data without specifying
     whether they were generated or analyzed (supporting)." as
     "Relationship type" and nothing else: the table lists "Ocean
     temperature records, revised", "Dataset B" and "Dataset C", in no
     fixed order ([A8](#a8)). Press "Order": each row's "…" menu gives
     way to up and down arrows ([A19](#a19)), and the button reads "Save
     Order"; press the up arrow on "Dataset C" until it is the first row
     and press "Save Order": the menus come back and the table lists
     "Dataset C" first, then the other two in the order they stood
     before; reload the page: the same order (Rule 23).
   - **Delete**: choose "…" › "Delete" on "Dataset B": a confirmation
     headed "Delete" asks "Are you sure you wish to delete this item?
     This action cannot be undone."; press "Cancel": the row stays;
     delete it again and press "OK": it is gone (Rule 22).
   - **The Author's view** (journal, press): the submission's Author:
     open the same "Data" page of their own submission: the table lists "Dataset C" and "Ocean temperature
     records, revised" with no line under its heading, no "Order" and no
     "Add Data Citation", and each row's "…" menu offers "View" alone
     (Rule 20).
   - **Nothing else happens**: the submission's Activity Log gained no
     line from these adds, edits, moves and deletes, and no email about
     them reached the mail catcher (Side effects).
   - **Control**: before the first add, the table read "No data
     citations have been added." (Rule 19). <sup>s</sup>

7. **Declare data citations while submitting**

   Given: Author, on a scratch journal whose "Data Citations" setting is
   at "Ask the author for data citation metadata during submission.",
   with the Author's own unfinished submission carrying its file.

   - **The "Data" section**: open the unfinished submission and go on to
     its "Details" step: a section headed "Data", with the line
     "Information about the research data associated with your
     submission.", holds the Data Citations table with "Order" and "Add
     Data Citation" (Rule 24).
   - **An added data citation**: press "Add Data Citation", type "Ocean
     temperature records" in "Title", choose "Supporting data without
     specifying whether they were generated or analyzed (supporting)." as
     "Relationship type" and press "Save": on a journal the table shows
     the row at once; on a press or a preprint server reload the page
     first ([A10](#a10)), and the row is there (Rule 24).
   - **On "Review"**: press "Continue" on each step until "Review": its
     "Details" section lists "Ocean temperature records" under "Data
     Citations"; complete the submission with "Submit" › "Submit"
     (Rule 24).
   - **The Journal Manager's list**: Journal Manager: open the new
     submission's workflow, then its Publication area, then "Data": the
     Data Citations table lists "Ocean temperature records" (Rules 18,
     19).
   - **Control**: before the add, the section's table read "No data
     citations have been added." (Rules 19, 24). <sup>s</sup>

8. **A new version copies both lists**

   Given: Journal Manager, on a scratch journal with data citations
   switched on, with a published scratch submission whose references are
   "Alpha study 2020" and "Beta trial 2021" and whose one data citation
   is "Ocean temperature records".

   - **The new version**: create a new version of the submission (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*):
     the new version's "References" page lists "Alpha study 2020" and
     "Beta trial 2021", and its "Data" page lists "Ocean temperature
     records" (Rule 26).
   - **Changes on the new version**: on the new version, delete "Beta
     trial 2021" with "…" › "Delete" › "OK", add "Gamma report 2022"
     through the "Add" box, and delete "Ocean temperature records" the
     same way: its "References" page lists "Alpha study 2020" and "Gamma
     report 2022", and its Data Citations table reads "No data citations
     have been added." (Rules 5, 7, 22, 26).
   - **Control**: switch the Publication area back to the published
     version: its "References" page still lists "Alpha study 2020" and
     "Beta trial 2021", and its "Data" page "Ocean temperature records"
     (Rules 1, 26). <sup>s</sup>

9. **What a Reviewer sees** {OJS OMP}

   Given: Reviewer, on a scratch journal with data citations switched on
   and the review type "Anonymous Reviewer/Disclosed Author", with an
   accepted review request on a submission whose one data citation is
   "Ocean temperature records" and whose one reference is "Alpha study
   2020"; and a second scratch journal set up the same way with the
   review type "Anonymous Reviewer/Anonymous Author".

   - **The disclosed-author review**: open the review from the Reviewer's
     dashboard and press "View All Submission Details": the window holds
     the Data Citations table with "Ocean temperature records", no line
     under its heading, no "Order" and no "Add Data Citation"; the row's
     "…" menu offers "View" alone, and "View" opens "View Data Citation".
     "Alpha study 2020" appears nowhere in the window (Rule 25; Actors
     row 7).
   - **The anonymous review**: the same walk on the second journal: the
     window shows no Data Citations table (Rule 25).
   - **Control**: Journal Manager: on the second journal, the
     submission's "Data" page lists "Ocean temperature records"
     (Rule 19). A preprint server has no review stage. <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a References change carried to "Review" by the step rail, listed
    there and submitted (Rule 16; A18 retired)
  - a References change saved by the footer's "Back" to "Upload Files"
    or by "Save for Later" (Rule 16)
  - the guard for A19 (issue report
    `docs/issues/U46-A5-ordering-arrows-unnamed.md`): in ordering mode each
    data citation row's up and down arrows carry names that say the
    direction and the citation
  - the guard for A4 (issue report `docs/issues/U42-A4-press-server-lookup-text-says-journal.md`): with "References Metadata Lookup" on, the References page of a press and of a preprint server describes the lookup without calling the context a journal
  - the guard for A9 (issue report `docs/issues/U42-A9-submits-without-required-data-citations.md`): with data citations at "Require the author to add data citation metadata…", an author's submission with no data citation is held back on "Review" (the problems banner, "Submit" disabled), and one with a data citation goes in
  - the guard for A20 (issue report `docs/issues/U42-A20-book-preprint-empty-references-heading.md`): a published book on a press and a posted preprint with no references show no "References" section; with one reference they show it
  - the guard for A10 (issue report `docs/issues/U42-A10-wizard-data-citations-funders-stale-press-server.md`): on a press and a preprint server, a data citation added in the submission wizard's "Data" section shows in its table and on "Review" at once, without a reload
  - the guard for A2 (issue report `docs/issues/U42-A2-pasted-repeat-reference-dropped-saved.md`): "Add" with a paste that repeats a listed reference keeps the repeated line in the box and says it was skipped, while the new lines are added
  - the guard for A3 (issue report `docs/issues/U42-A3-reference-search-keeps-rows-without-word.md`): "Search references here" with a word no row shows (such as "http" or "citations") keeps no row, and a word a row shows keeps that row
  - the guard for A15 (issue report `docs/issues/U42-A15-data-citation-identifier-cannot-be-removed.md`): on "Edit Data Citation", choosing the empty "Identifier type" and clearing "Identifier" removes the identifier, and a cleared "Repository", "Year" or "URL" is gone on the next "Edit"
  - the guard for A6 (issue report `docs/issues/U42-A6-reference-lookup-progress-counts-structured-only.md`): with "References Metadata Lookup" on, "Add" of new references shows "Processing references - 0/n" counting every reference added, and switching the lookup on over existing references shows no box
- **Rarely met**:
  - "Data Citations" at "Do not request data citation metadata from the
    author during submission.": the "Data" page without the wizard's
    "Data" section (Settings bullet 3; Rules 18, 24)
  - "Data Citations" switched off with data citations stored: the list
    hidden on the "Data" page, in the wizard and in the Reviewer's
    window, and listed again once switched back on (Rule 18)
- **Nothing new to test**:
  - "Reprocess" and "Reprocess all references", their confirmations,
    "OK" and "Cancel" (Rule 15)
  - a reference structured by hand keeping its DOI link, title and
    expander in a new version (Rule 26)
  - typing dropped without a question on "Close" or on leaving the page
    (Fields & validation, last paragraph)
  - "Source Type" and "Type" in "Edit citation", which arrive with
    nothing chosen and have no empty entry (Fields & validation)
  - an assigned Section Editor whose assignment may edit the
    publication (Actors row 2): the page scenario 1's Journal Manager
    edits
  - a Site Administrator whose only role in the journal is an
    unassigned assistant role (Actors rows 2 and 5): the read-only pages
    the Author opens in scenarios 1 and 6
  - the Journal Manager configuring the three settings (Actors row 9):
    the settings screen scenarios 4 and 5 save
- **Register carries it**:
  - A2 (a pasted line already in the list dropped while "Saved" shows;
    Rule 5)
  - A3 (the search keeping rows whose text lacks the typed word; Rule 8)
  - A4 (the lookup text saying "this Journal" on a press or a preprint
    server; Rule 10; scenario 5 passes it)
  - A5 (a lookup failed for good looking like one still waiting;
    Rule 12)
  - A6 (the progress box counting structured references only; Rule 13)
  - A7 (a DOI in a reference typed while submitting not kept with lookup
    off; Rule 17)
  - A8 (a new data citation with no place in the order: none before
    an order is saved, first after one; Rule 23; scenario 6 passes it)
  - A9 (data citations at "Require…" warning on "Review" without
    stopping the submission; Rule 24)
  - A10 (the wizard's Data Citations table unchanged after a save on a
    press or a preprint server; Rule 24; scenario 7 passes it)
  - A11 (no data citations on the landing page; Rule 27)
  - A12 (an arXiv ID losing its version; Fields & validation)
  - A13 (a blank author row saved and making a reference structured;
    Rule 11)
  - A14 (the author boxes with no names for a screen reader; Fields &
    validation)
  - A15 (a data citation's identifier that cannot be removed; Fields &
    validation)
  - A16 (the expander's name and keyboard, and the invisible "Collapse"
    buttons; Rules 4, 12)
  - A17 ("Edit" saving the text of another reference; Rule 6)
  - A19 (the ordering arrows with no names for a screen reader; Rule 23;
    scenario 6 passes them)
  - A20 (the empty "References" heading on a book or a preprint page;
    Rule 27; scenario 3 passes it)
  - A21 (the References page's texts and windows read raw codes in
    French; Rule 3)
- **No seed**:
  - a reference structured by the services: its identifier links,
    title, details and the "Wikidata" and "OpenAlex" badges (Rules 11,
    12); no lookup runs on a test install
  - "No structured information found" on a row whose lookup finished
    (Rule 12)
  - "All {total} references successfully processed" (Rule 13)
  - the services' answers overwriting details edited by hand after
    "Reprocess all references" (Rule 15)
  - the lookup's requests to Crossref, OpenAlex and ORCID, their
    retries and the failed mark (Side effects bullet 2)
- **Owned by another feature**:
  - the wizard's autosave while the author stays on the step (Rule 16;
    *Submission wizard*, scenario 3)
  - the Author of an unposted preprint, who gets every control on both
    pages (Actors row 2; *Publication metadata*'s edit gate, scenario 3)
  - a Section Editor or an Author typing the settings page's address
    and getting the access-denied page (Actors row 9; *Publication
    metadata*)
  - "Permit submission metadata edit." and the assignment's metadata
    permission (Settings, last paragraph; *Publication metadata*,
    scenario 3)
  - the lists in the Native XML export, the JATS XML and the DOI
    registrations (Side effects bullet 3; *DOIs*, *Import & export*,
    *JATS & Body Text*)
  - the Crossref plugin's hourly DOI fetch (Side effects bullet 4;
    *DOIs*)
  - the references offered in the "Body Text" editor (Side effects
    bullet 5; *JATS & Body Text*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | Pasting a reference already in the list drops it silently, and the References page still says "Saved" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A3](#a3) | "Search references here" keeps references whose text does not contain the typed word | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A4](#a4) | On a press or a preprint server, the References page says metadata lookup "is enabled for this Journal" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A6](#a6) | References page: the lookup's progress box counts only structured references and says "All 2 done" over five | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A7](#a7) | A DOI in a reference typed while submitting is not recorded as its DOI when metadata lookup is off | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A8](#a8) | A data citation added after the Data Citations table was ordered appears first, not last | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A9](#a9) | An author can submit with no data citations when the journal requires them | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A10](#a10) | On a press or preprint server, the submission wizard's data citations and funders still read empty after a save | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A12](#a12) | An arXiv ID entered for a reference or a data citation loses its version, or is refused with it | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A13](#a13) | "Edit citation" keeps an author row added or deleted before "Close", and the next "Save" stores it | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A14](#a14) | A screen reader hears no name for the author boxes in "Edit citation" and the data citation panel | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A15](#a15) | Editing a data citation, its identifier cannot be removed and a cleared Repository, Year or URL is kept | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A16](#a16) | The row expander is always named "Collapse" and ignores the keyboard; rows with nothing to expand carry an invisible one | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A19](#a19) | The ordering arrows on the Data Citations table have no names for a screen reader | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A20](#a20) | On a press or a preprint server, a book or preprint with no references shows an empty "References" heading | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A21](#a21) | In French the References page's help text, table, "Delete all references" and its two windows show raw codes such as "##submission.citations.structured##" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A22](#a22) | A reference author's "ORCID iD" takes any web address, and editors' ORCID icon links to it | 🐞 | medium | issues (claude), 2026-10-05 — re-verified |
| [A5](#a5) | A reference whose lookup failed for good looks exactly like one still waiting | ❓ | minor | — |
| [A11](#a11) | Readers never see data citations, though the editors' table says they appear alongside the references | ❓ | user-visible | — |
| [A17](#a17) | "Edit" accepts a repeated reference that "Add" drops | ❓ | minor | — |
| [A1](#a1) | A Site Administrator with no role in the journal is offered the References controls, but every change is refused | ✅ | retired | — |
| [A18](#a18) | A References change carried to "Review" by the step rail is lost on "Submit" | ✅ | retired | — |
| [OMP1](#omp1) | A book with no references shows an empty "References" heading | ✅ | retired | — |

### All apps

<a id="a2"></a>
**A2 — Pasting a reference already in the list drops it silently, and the References page still says "Saved"** · 🐞 · low.
An editor who pastes several references into "Add" expects each to be
added, or to be told why not. A line whose text matches an existing
reference, or an earlier line of the same paste, is dropped. The box
empties and "Saved" shows beside "Add" exactly as after a full success,
even when every line was dropped, and nothing says that anything was
skipped. The app ships a message for exactly this case ("The citations
above are duplicates. All other citations are added to the list below.")
that the page never shows. The server tidies each pasted line (spaces
and tabs at its ends removed, runs of them inside shrunk to one space)
and compares it with the stored references as they stand: only the same
text, capitals included, counts as a repeat on PostgreSQL, while on
MySQL the comparison also ignores capitals and accents (read in the
code, not walked).
Basis: probe, 2026-10-04. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — "Search references here" keeps references whose text does not contain the typed word** · 🐞 · low.
Typing a word into "Search references here" is expected to keep the rows
that show it. The search also looks in data no row displays: a web
address stored with each reference, its numbers, and a yes/no value
saying whether the reference's details (authors, title, DOI) have been
filled in. So "citations" or "http" keep every row, "false" keeps every
reference whose details are not filled in, and a digit such as "0" keeps
rows that show no digit at all. Nothing is changed or lost: the search
keeps rows it should have hidden, and clearing it shows the whole list
again. A search for a word or a year a reference's text holds still
keeps the right rows; the extra rows come with words and digits the
stored data also holds.
Basis: probe, 2026-10-04. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — On a press or a preprint server, the References page says metadata lookup "is enabled for this Journal"** · 🐞 · low.
With "References Metadata Lookup" on, the References page of a press or
a preprint server reads "Structuring and Metadata Lookup is enabled for
this Journal." Editors and authors who open a submission's "References"
page see the sentence above the "Add" box. Nothing else on the page is
affected, and lookup itself works the same. It shows only once a manager
has ticked "Enable references structuring and metadata lookup" (Settings
› Workflow › "Metadata"), which is off in a new press or server.
Basis: probe, 2026-10-04. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A reference whose lookup failed for good looks like one still waiting** · ❓ · minor.
When a service stays unreachable through every retry, the reference is
recorded as failed. Its row shows the plain text with no badge and no
details, exactly as while its lookup is still queued, and the progress box
does not count it. An editor cannot tell "give it time" from "press
Reprocess".
Question: should the row say that the lookup failed? Lean: yes, a badge of
its own beside the "Reprocess" offer; the app already records the failure,
and upstream has an open issue about showing it.
Since: 2026-09-14 (the failed state was added then) · Basis: probe for the
waiting row, 2026-09-24; code for the failed one. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — References page: the lookup's progress box counts only structured references and says "All 2 done" over five** · 🐞 · low.
With metadata lookup on, an editor who adds references expects the box
under "Add" to report on the whole list while the lookup runs. The box
counts only structured references: those whose details (identifier,
title and authors) are filled in, by the lookup or by hand. It is absent
while none is. With two of five structured it reads "Processing
references - 0/2". Once those two are done it reads "All 2 references
successfully processed" while the other three are still waiting. While
the box is absent or says "All … processed", the page stops refreshing
itself, so the rows still being looked up change only on a reload. On
`main` today the box also shows when no lookup is running. A reference
added while lookup was off, then filled in by hand after it was switched
on, shows "Processing references - 0/1" for good. That is the symptom
`pkp/pkp-lib#12155` set out to remove.
Basis: probe, 2026-10-04. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A DOI in a reference typed while submitting is not recorded as its DOI when metadata lookup is off** · 🐞 · medium.
With "References Metadata Lookup" off, an author who types a reference
with its DOI into the "References" box while submitting gets the
reference saved with the DOI in its text only, not recorded as the
reference's DOI. The same reference added later through "Add" on the
References page gets its DOI recorded. Nothing on screen differs until a
manager switches the lookup on. Then only the added reference shows its
DOI as a link and in the "DOI" box of "Edit". A journal's Crossref
deposit sends the typed reference as plain text instead of as its DOI,
and nobody is told. Lookup is off and references are requested by
default, so this reaches every reference an author types with a DOI
while submitting.
Basis: probe, 2026-10-04. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A data citation added after the Data Citations table was ordered appears first, not last** · 🐞 · low.
An editor orders a publication's data citations ("Order", the arrows,
"Save Order") and then adds another one. The new data citation appears
first, above every row that was ordered, and stays there after a reload,
where an editor expects it at the end. Several added after one saved
order all go to the top, in the order they were added, above the ordered
rows. The editor sees the new row at the top and can move it down with
the arrows and save the order again. It needs data citations turned on
("Enable data citation metadata", off by default). Every export of the
publication's data citations lists them in the order the table shows: a
journal's JATS export and its Crossref and DataCite deposits, and a
preprint server's Crossref deposit.
Basis: probe, 2026-10-04.
<sup>f-a8</sup>

<a id="a9"></a>
**A9 — An author can submit with no data citations when the journal requires them** · 🐞 · medium.
When a manager sets data citations to "Require the author to add data
citation metadata…", a submission without one is expected to be held
back. The author's "Review" step shows "Data citations are required.",
but "Submit" stays enabled and the submission completes. Required
references, by contrast, do stop it. The journal, press or server then
receives submissions without the data citations it requires.
Basis: probe, 2026-10-04. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — On a press or preprint server, the submission wizard's data citations and funders still read empty after a save** · 🐞 · medium.
On a press or a preprint server, an author who adds a data citation or a
funder on the submission wizard's "Details" step sees no change after
"Save": the Data Citations table still reads "No data citations have
been added.", the Funders table "No funders have been added.", and the
"Review" step lists both as "None provided". A second data citation does
not show either, an edited data citation keeps its old title, and a
deleted one stays listed. Every save is stored, so an author who adds
the entry again, as the empty table invites, submits it twice. Where the
press or server requires data citations or funders, "Review" also warns
that they are required, but "Submit" goes through. It happens in both
sections. A new press or server asks for funders by default; data
citations appear when the press or server turns them on.
Basis: probe, 2026-10-04. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Readers never see data citations** · ❓ · user-visible.
The Data Citations table tells editors that data citations "appear alongside
other references in the publication". On the published page they appear
nowhere: the "References" block lists the references only. Data citations
reach the outside world only through a journal's JATS XML and the DOI
registrations (Side effects).
Question: should the landing page show a version's data citations? Lean:
yes, in or next to the "References" block; otherwise the table's line
should stop promising it.
Basis: probe, 2026-09-24. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — An arXiv ID entered for a reference or a data citation loses its version, or is refused with it** · 🐞 · medium.
A reference's "Edit citation" panel has an "Arxiv" box whose help text
offers an ID in three forms: bare, after "arxiv:", and as its
https://arxiv.org/abs/ address. Typed bare, "2101.12345v2" is kept as
typed. Typed as "arxiv:2101.12345v2" or
"https://arxiv.org/abs/2101.12345v2", it is saved as "2101.12345",
without a word. When a reference's text holds "arXiv:2101.12345v2", the
metadata lookup fills "Arxiv" with "2101.12345" from it. A data citation
of type "ARXIV" saves "https://arxiv.org/abs/2101.12345v2" as
"2101.12345" and refuses the bare "2101.12345v2" as not a valid ARXIV
identifier, while the unversioned "2101.12345" is accepted. Either way
the record loses which version of the paper or dataset the work cites.
The reference half needs metadata lookup on, since with it off "Edit
citation" holds only the reference's text. The data citation half needs
data citations on. Both settings sit in Settings › Workflow and are off
by default.
Basis: probe, 2026-10-04. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — "Edit citation" keeps an author row added or deleted before "Close", and the next "Save" stores it** · 🐞 · medium.
In "Edit citation" (the References page with metadata lookup on), an
editor presses "Add" under "Author Information", types a name, and
leaves with "Close", expecting nothing kept, as happens to every other
box of the panel. On the next "Edit" the panel shows an author row with
empty boxes, and "Save" for any other change stores an author with no
name. A reference with an identifier and a title then counts as
structured: its row shows the title and an expander, and its menu loses
"Reprocess", so the lookup can no longer be rerun for that reference
alone. Deleting a row and leaving with "Close" works the same way: the
row is missing from the next "Edit" and is deleted for good by the next
"Save". The same happens to a data citation's "Creators" in "Edit Data
Citation" and to a funder's grants in "Edit Funder" on the Funding page.
The reference case needs metadata lookup on, and the creators case needs
data citations on; both are off in a new install. The grants case needs
only the Funding page, which a new install shows. In every case the
change comes back only if the item is edited again before the page
reloads or saves anything else.
Basis: probe, 2026-10-04. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A screen reader hears no name for the author boxes in "Edit citation" and the data citation panel** · 🐞 · low.
In "Edit citation" (the References page with metadata lookup on), each
row under "Author Information" has three boxes: given name, family name
and ORCID iD. None of them has a name, so a screen reader announces a
text box without saying which of the three it is. The column names are
shown only in the table's header row. The "Creators" rows of the data
citation panel ("Add Data Citation", "Edit Data Citation") are drawn by
the same component and have the same unnamed boxes. Nothing is saved
wrongly. The author boxes show only when the journal, press or server
has "Enable references structuring and metadata lookup" turned on, and
the Creators boxes only when it has data citations turned on. Both are
off in a new install.
Basis: probe, 2026-10-04. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — Editing a data citation, its identifier cannot be removed and a cleared Repository, Year or URL is kept** · 🐞 · medium.
An editor who wants to drop a data citation's identifier finds no way to
do it on "Edit Data Citation": "Identifier type" has no empty entry, and
clearing "Identifier" is refused with "This field is required when
identifier type is present.". Replacing the identifier with another one
works; only removing it is blocked. Emptying "Repository", "Year" or
"URL" on the same panel looks like it worked: "Save" closes the panel
without a message. But the old value is still there when "Edit" opens
again, and it stays in the publication's metadata. It needs data
citations turned on ("Enable data citation metadata", off by default). A
kept repository, year or URL shows in "View Data Citation" and in a
journal's JATS export. A kept URL also goes out in a journal's Crossref
and DataCite deposits and a preprint server's Crossref deposit, for a
data citation without an identifier.
Basis: probe, 2026-10-04. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — The row expander is always named "Collapse" and ignores the keyboard** · 🐞 · medium.
With lookup on, a structured row's expander is named "Collapse" whether the
row is open or closed, and Enter or Space on it does nothing; only a click
opens the row. Every row with nothing to expand (every row with lookup off,
unstructured rows with it on) carries a "Collapse" button with no size on
screen that a screen reader announces and that does nothing.
Basis: probe, 2026-10-04. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — "Edit" accepts a repeated reference that "Add" drops** · ❓ · minor.
"Add" drops a line whose text is already in the list (A2), but saving a
reference in "Edit" with the same text as another is accepted, and the list
then shows two identical rows. The wizard's box keeps a repeat as well
(Rule 16).
Question: should a repeated reference be refused or kept? Lean: one rule
for all three paths; which one is the team's call.
Basis: probe, 2026-09-24. <sup>f-a17</sup>

<a id="a19"></a>
**A19 — The ordering arrows have no names** · 🐞 · low.
In ordering mode each row's up and down arrows on the Data Citations table
are icon-only buttons with no name; a screen reader announces only
"button".
Basis: probe, 2026-10-02. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — On a press or a preprint server, a book or preprint with no references shows an empty "References" heading** · 🐞 · low.
An item's page is expected to show "References" only when the item has
references, as an article page does. On a press and on a preprint server
every published item's page carries the "References" heading, with
nothing under it when the item has none. Readers see an empty section on
the book's or preprint's page, and a screen reader announces a heading
with no content.
Basis: probe, 2026-10-04. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — In French the References page shows raw codes** · 🐞 · low.
With the interface in French (Canada), the side menu's "Références"
entry, a journal's and a press's heading "Publication : Références",
the "Add" box's label "Références" and "* Obligatoire", the "Ajouter"
button and the row menu's "Modifier" and "Supprimer" read French, but
the page's other texts read raw codes where French words belong, for the
Journal Manager and the Author alike, on a journal, a press and a
preprint server:
- the "Add" box's help text reads
  "##submission.citations.structured.description##", and the "Delete all
  references" link "##submission.citations.structured.deleteAllLink##";
- the "Structured References" table's title and column heading read
  "##submission.citations.structured##", the line under the title
  "##submission.citations.structured.descriptionTable##", the search box
  and its placeholder "##submission.citations.structured.search.placeholder##",
  and an empty table "##submission.citations.structured.emptyCitations##";
- "Edit citation" is titled
  "##submission.citations.structured.editModal.title##" and its box
  labelled "##submission.citations.structured.label.rawCitation##", above
  French "Enregistrer" and "Fermer";
- "Delete all references" asks
  "##submission.citations.structured.deleteAllDialog.title##" /
  "##submission.citations.structured.deleteAllDialog.confirm##" above
  "OK" and "Annuler", so a French-speaking Journal Manager confirms
  emptying the list without being told what it does.

A screen reader also hears "##common.moreActions##" as the name of each
row's "…" menu and "##list.collapse##" for the row's invisible "Collapse"
button ([A16](#a16)). Adding a reference still works: "Enregistré" shows
and the new row stays after a reload. The English page shows none of
these codes. The workflow screen's own codes, such as a preprint
server's heading "##submission.publication## : Références", are
[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#a11)'s
finding, and why a missing French text shows as a code at all is the
question [Languages & locales](U57-languages-and-locales.md#a4) asks.
Basis: probe, 2026-10-04. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — A reference author's "ORCID iD" takes any web address, and editors' ORCID icon links to it** · 🐞 · medium.
On a submission's "References" page, "Edit citation" has an "ORCID iD"
box for each author of a cited work. The box for a data citation's
creators refuses anything but an ORCID address. This one keeps
whatever is typed, including another website's address or a
`javascript:` link. With metadata lookup on, the expanded reference
shows that author with an ORCID icon, and pressing the icon opens the
typed address in a new tab instead of an ORCID profile.
Anyone who may edit the publication can type it. On a preprint server
that includes the submitting author, because authors may edit their
metadata by default. On a journal or press it includes the author
once an editor has ticked the author's permission to change the
publication. The editors, managers and assistants who press the icon
are the ones sent to the author's page.
Since: 2025-09-16 · Basis: probe, 2026-10-05. <sup>f-a22</sup>

### Retired

<a id="a1"></a>
**A1 — A Site Administrator with no journal role cannot change references** · ✅ · retired. Withdrawn 2026-09-24: a Site Administrator's last role in a journal cannot be removed ([User invitations](U06-user-invitations.md)), so the state has no way in, and the reachable neighbour, an administrator left with an unassigned assistant role, gets the read-only page (Actors row 2). <sup>f-a1</sup>

<a id="a18"></a>
**A18 — A References change carried to "Review" by the step rail is lost on "Submit"** · ✅ · retired. Overturned 2026-09-29: re-checked on all three apps, the step rail saves the step on the move, so the change is listed on "Review" and submitted with "Submit" › "Submit" (Rule 16). <sup>f-a18</sup>

<a id="omp1"></a>
**OMP1 — A book with no references shows an empty "References" heading** · ✅ · retired. Widened 2026-09-24: the preprint page shows the same empty heading, so the finding moved to [A20](#a20). <sup>f-omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-24 at the checkouts' tips: ojs `71bb244152`, omp
`a36551804`, ops `07141ae4df`, each on lib/pkp `25182919bf` and ui-library
`1afd40a9`. The three apps share every class, component and locale string
this spec relies on (no app overrides a key named here), so an unmarked
claim rests on that shared code. Every claim was then driven on 2026-09-24
on OJS, OMP and OPS (the Reviewer's window on OJS and OMP), on scratch
contexts seeded through the scenario API, with `publicknowledge` only read;
no drive saw a response of 500 or more or a page error. A test install
runs no job runner and no scheduled task and has no outbound connections,
so the states that only a finished or failed lookup, a DOI deposit or the
Crossref plugin's schedule produce are unreachable there; the footnotes of
those claims say so, and those claims rest on the code.

<a id="fn-a"></a>
**a** — Actors. The Publication pages: `workflowConfigEditorialOJS.js` and
`workflowConfigAuthorOJS.js` `PublicationConfig.citations` (component
`CitationManager`) and `PublicationConfig.dataAvailabilityAndCitation`
(`DataCitationManager` when `publicationSettings.supportsDataCitations`,
then the U40 statement form), both with `canEdit:
permissions.canEditPublication`; `useWorkflowConfigOMP.js` and
`useWorkflowConfigOPS.js` deep-merge the OJS configs, and the OMP and OPS
files define no `citations` or `dataAvailabilityAndCitation` key (positive
chain evidence, RUNBOOK rule 8). Menu entries:
`useWorkflowNavigationConfig{OJS,OMP,OPS}.js` push `citations`
(`submission.citations` "References") when `supportsCitations`, and
`dataAvailabilityAndCitation` (`submission.dataAvailabilityAndCitation.data`
"Data") when `supportsDataCitations || supportsDataAvailability`; the flags
are `!!$context->getData('citations')` etc. in
`PKPDashboardHandler` (`pageInitConfig.publicationSettings`). API:
`PKPCitationController` routes behind `roleAuthorizer([MANAGER,
SUB_EDITOR, ASSISTANT, AUTHOR])`, `PKPDataCitationController` adds
`ROLE_ID_SITE_ADMIN`; writes add `PublicationWritePolicy`
(`PublicationAccessPolicy`, `StageRolePolicy` for sub-editor, assistant and
author, `PublicationCanBeEditedPolicy`). Read-only rendering:
`CitationManager.vue` `:is-disabled="!citationStore.canEditPublication"`
on both links; `useCitationManagerFormAddRawCitation.js`
`canSubmit: canEditPublication.value` (`FormPage.vue` disables the submit
button when `!canSubmit`); `CitationManagerCellActions.vue`
`v-show="citationStore.canEditPublication"`. The wizard mounts
`DataCitationManager` without `canEdit`, whose default is `true`.
Live-probed 2026-09-24 (Actors rows 1–6; Rules 9, 20), all three apps:
the Journal Manager, a Section Editor assigned with "Permit metadata edit"
and an Author whose role has "Permit submission metadata edit." ticked
(on their own unpublished submission) got every control on both pages,
"Add" adding; a Section Editor assigned without the permission, an
assigned Funding Coordinator (OJS, OMP) and the Author on a journal or
press got the read-only References page ("Add" and "Delete all
references" grayed out, pressing them sending nothing, no row menu, the
box still typable) and "View" alone on the Data Citations table, with no
line under the heading, no "Order" and no "Add Data Citation"; the Author
of an unposted preprint got every control on both pages, each saving;
the same Author on a published or posted version got the read-only pages;
the Journal Manager on a published version kept every control, under
"Warning: This version has been published. Editing it may impact the
published content.". In the wizard the Author's References box was
editable and the Data section offered "Add Data Citation" although the
role's "Permit submission metadata edit." is unticked on a journal and a
press.

<a id="fn-b"></a>
**b** — Wizard. `PKPSubmissionHandler::getDetailsStep()`: after the
`Details` form, `PKPCitationsForm` (one `FieldTextarea` `citationsRaw`,
label `submission.citations` "References", description
`submission.citations.description`, `isRequired` when the setting is
`METADATA_REQUIRE`) when `citations` is `request` or `require`; then the
data sections under one heading (`submission.dataAvailabilityAndCitation.data`
"Data", `.data.description` "Information about the research data associated
with your submission."): the `dataCitations` section (rendered by
`wizard.tpl` as `<data-citation-manager>`) before `PKPDataAvailabilityForm`;
then funders. `PKPSubmissionHandler` also passes `components.dataCitation`
(the edit form) when `dataCitations` is `request`/`require`. Review:
`templates/submission/review-details.tpl`, submission locale only: the
data-citations item (`submission.dataCitations` "Data Citations", titles or
`common.noneProvided` "None provided", warning `submission.dataCitations.required`
"Data citations are required." when required and empty), then the data
availability item, then the references item (`errors.citationsRaw` as
warning notices, header `submission.citations`, `citationsRaw` split on line
breaks). Submit check: `submission/Repository::validateSubmit()` walks
`Context::getRequiredMetadata()`; `citations` is checked as `citationsRaw`.
Live-probed 2026-09-24 (the References box; Rules 16, 24), all three apps,
two runs each: the "Details" step reads "Title * Required", "Keywords",
"Abstract", "References", then "Data" when asked, then "Funders" (OMP adds
"Chapters" after "Funders"); the box is labelled "References" at "Ask"
and "References * Required" at "Require…"; the Review step lists "Data
Citations" (titles only), "Data Availability Statement", "References" and
"Funders" after the abstract. "Continue" saved the step at once. Text
typed in the box and left by another address was gone on return, with no
question. Re-checked 2026-09-29 (Rule 16's saves), all three apps, two
runs each: every step move ("Continue"; the step rail at once, after a
1.5 s pause, after keyboard typing, and followed by a reload; the
footer's "Back" on a "Details" step opened by a Review section's "Edit")
sent the step's save (`PUT …/publications/{id}` with `citationsRaw`)
0.25–0.75 s after the press, before the Review check (`PUT …/submit`, `_validateOnly`);
"Review" listed the new lines, "Submit" › "Submit" completed, and the
Journal Manager's "References" page listed only the new lines, as did the
box and "Review" after a reload. "Save for Later" sent the same save
before `PUT …/saveForLater` and the "Saved for Later" screen. Typed at
once on arriving, the autosave came 57–60 s later; typed 40 s in, with
the footer at "Last saved 39–42 seconds ago", it came 16–20 s after the
typing. Leaving for My Submissions 1.5 s after a change again sent
nothing and asked nothing.

<a id="fn-c"></a>
**c** — Settings. `PKPMetadataSettingsForm`: `FieldMetadataSetting`
`citations` (label `submission.citations` "References", description
`manager.setup.metadata.citations.description`, box
`manager.setup.metadata.citations.enable` "Enable references metadata",
`submissionOptions` `…citations.noRequest` / `.request` / `.require`);
`FieldOptions` `citationsMetadataLookup` (label
`submission.citations.structured.citationsMetadataLookup` "References
Metadata Lookup", option `manager.setup.metadata.citationsMetadataLookup.enable`
"Enable references structuring and metadata lookup", `showWhen: 'citations'`);
`FieldMetadataSetting` `dataCitations` (`manager.setup.metadata.dataCitations`
"Data Citations" and its `.description`, `.enable`, `.noRequest`,
`.request`, `.require`). Defaults (`schemas/context.json`, identical in the
three apps): `citations` `"request"`; `citationsMetadataLookup` and
`dataCitations` without a default (off). The scenario API's `metadata` key
sets `citations` and `dataCitations`, and its `citationsMetadataLookup` key
the lookup. Live-probed 2026-09-24 (Actors row 9; Rules 2, 18; Settings),
all three apps: every string verbatim; on `publicknowledge` and on a fresh
scratch context "Enable references metadata" ticked at "Ask the author to
provide references during submission.", the lookup box and "Enable data
citation metadata" unticked; unticking "Enable references metadata" before
saving removed the lookup group and re-ticking brought it back; each of the
four References levels and the Data Citations levels driven on its own
scratch context with the effects of Rules 2 and 18; the data citations
stored before switching the setting off listed again, on the "Data" page,
in the wizard and in the Reviewer's window, once it was switched back on;
a reference structured by hand while lookup was on showed as plain text
after lookup was switched off, and with its DOI link, title and expander
again after it was switched back on. Access: the Journal Manager and a Site Administrator holding the manager
role opened Settings › Workflow; a Section Editor or Author typing its
address got "The current role does not have access to this operation.". A
Site Administrator left with only an unassigned assistant role opened it on
OJS, while OMP and OPS answered with that same message (two runs per app);
that reach is the settings screen's own access, not this feature's.

<a id="fn-d"></a>
**d** — The References page. `CitationManager.vue`: with
`citationsMetadataLookup`, the heading `submission.citations.structured`
"Structured References" and `…citationsMetadataLookup.description`; then
`CitationManagerAddRawCitations`; `CitationManagerStatusProcessed` (lookup
only); the links `…structured.deleteAllLink` "Delete all references" and
`…structured.reprocessAllCitations` "Reprocess all references"
(`v-show` lookup); `PkpTable` labelled "Structured References" with
`…structured.descriptionTable`, top control `CitationManagerSearchField`
(`…structured.search.placeholder` "Search references here"), empty text
`…structured.emptyCitations`. Columns (`useCitationManagerConfig.js`):
"Structured References"; `CitationManagerToggleAll` ("Expand All" /
"Collapse All" with lookup, a blank otherwise); the actions column with an
empty header. Row menu `getItemActions()`: `common.edit`, `common.delete`,
and `admin.citation.reprocess` "Reprocess" when lookup is on and the
citation is not structured; menu label `common.moreActions` "More Actions".
Order: the citation `Collector` sorts by `seq`; no ordering control exists
in the manager. Page heading: U24 Rule 9 ("Publication: {page}").
Live-probed 2026-09-24 (Rules 3, 4, 10), all three apps: "Publication:
References" on OJS and OMP, "Preprint: References" on OPS (set in capitals
by the page's style); the page top to bottom as Rule 3 lists it, the three
column headers "Structured References", blank and blank with lookup off;
"Delete all references" is a button styled as a link; the row menu "Edit",
"Delete", plus "Reprocess" with lookup on; rows in entry order, with no
order control and nothing draggable. With lookup on: the second
"Structured References" heading and the text above the box, "Reprocess all
references" after "Delete all references", the column headers
"Structured References", "Expand All" and blank. "Expand All" over no
structured reference (an empty list, and a list of plain rows) toggled its
label and sent nothing.

<a id="fn-e"></a>
**e** — Add. `useCitationManagerFormAddRawCitation.js`: form
`addCitations`, POST `…/citations/importAdditionalCitations`, field
`rawCitations` (label `submission.citations`, description
`submission.citations.structured.description`, `isRequired`, so
`Form.vue`'s required check answers `validator.required` "This field is
required." before sending), submit `common.add` "Add", `onSuccess` empties
the field and refreshes the publication. Server:
`citation/Repository::importAdditionalCitations()` tokenizes with
`CitationListTokenizerFilter` (line breaks collapsed, the text trimmed,
split on line breaks, each line trimmed and inner whitespace collapsed),
skips empty lines, appends after `getLastSeq()`, and collects a line for
which `existsRawCitation()` is true into the returned string instead of
inserting it; the form ignores the returned body. Live-probed 2026-09-24
(the "Add" box; Rule 5), all three apps: the box's accessible name
"References * Required" and the help text verbatim; an empty "Add"
refused in the browser with no request, **Add** disabled after the
refusal and enabled again after typing; the paste "Alpha  study   2020" /
empty line / "  Beta trial 2021  " / "Gamma report 2022" gave the rows
"Alpha study 2020", "Beta trial 2021", "Gamma report 2022", the box
emptied and "✓ Saved" beside **Add**; "Epsilon note" twice, "ALPHA STUDY
2020", a tab-only line, a spaces-only line and "Zeta   final⇥piece" gave
one "Epsilon note", "ALPHA STUDY 2020" and "Zeta final piece", with the
server's answer listing "Epsilon note" as dropped.

<a id="fn-f"></a>
**f** — Edit and delete. `useCitationManagerActions.js`
`citationEditCitation()` uses `componentForms.citationRawEditForm` with
lookup off and `citationStructuredEditForm` with it on (both built in
`PKPDashboardHandler`), PUT `…/citations/{id}`, side panel title
`submission.citations.structured.editModal.title` "Edit citation".
`CitationRawEditForm`: one box `rawCitation`
(`…structured.label.rawCitation` "Edit Raw Citation"), not marked required;
`citation.json` requires `rawCitation`. `CitationStructuredEditForm`: the
fields of the Fields table (labels `submission.citations.structured.label.*`,
help `…description.doi|arxiv|handle`, `FieldAuthors` with `user.givenName`,
`user.familyName`, `user.orcid` columns, `sourceType` and `type` options
from `CitationSourceType` / `CitationType`, labels `ucwords` of the values).
`PKPCitationController::edit()` reduces `arxiv`, `doi`, `handle` with
`extractFromString()`; `citation.json` validates `doi`, `arxiv`, `handle` by
regex (`validator.regex` "This is not formatted correctly."), `url` as a URL
(`validator.url`), `date` as `Y-m-d`. Error summary `form.errorOne` /
`form.errorMany`. `citation/DAO::update()` recomputes `isStructured`; no
lookup is dispatched. Delete: dialog `common.delete` / `common.confirmDelete`,
"OK" / "Cancel" → DELETE `…/citations/{id}`. Delete all: dialog
`…structured.deleteAllDialog.title|confirm` → DELETE
`…/deleteCitationsByPublicationId` (`deleteByPublicationId()`).
Live-probed 2026-09-24 (the "Edit citation" panel; Rules 6, 7, 14), all
three apps: with lookup off the panel "Edit citation" with the one box
"Edit Raw Citation", "Save" and the header's "Close"; an empty save
answered 400 `{"rawCitation":["This is not a valid string.","This field
is required."]}` (two runs on OJS, one each on OMP and OPS); with lookup
on the box reads "Edit Raw Citation * Required" and an empty one is
refused in the browser with no request. The structured form holds 19
fields in the table's order; "doi:10.1234/efgh", "https://doi.org/10.1234/ijkl"
and "10.1234/mnop" stored bare; "not-a-doi", "not a url", "xyz" and "bad"
refused with the table's messages, two at once giving "Please correct 2
errors."; "urn:nbn:de:1234-5678" stored as typed; "handle:20.1000/100" and
"https://hdl.handle.net/20.1000/100" stored as "20.1000/100"; "Source
Type" with 7 entries and "Type" with 39, none blank, both arriving empty;
"Publication Date" a date box. Filling DOI "10.1234/abcd", Title "Alpha
study" and the author Ada Lovelace saved without any reprocess request and
structured the row; changing only "Edit Raw Citation" afterwards kept every
structured value. The assigned Section Editor, Series Editor or Moderator
got the same form with the same result. Deleting: the dialogs verbatim,
"Cancel" keeping, "OK" removing and still removed after a reload; on an
empty list "Delete all references" was offered and pressable, and "OK" left
the list empty. Test runs 2026-09-24, all three apps (scenario 1's "Edit"
leg, lookup off): every "Save", the refused empty one (400) and the
accepted one (200), wrote three PHP warnings to the server log,
`Undefined array key "arxiv"`, then "doi" and "handle", because the
lookup-off form sends only `rawCitation` and `edit()` reads the three keys
without checking they were sent; the answers and the screen were
unaffected (a latent code fault, no user impact).

<a id="fn-g"></a>
**g** — Search. `citationManagerStore.js` `citationsFiltered`: the phrase is
lowercased and split on spaces; a citation stays when every word occurs in
`JSON.stringify(Object.values(citation))`. The citation objects are the
publication's `citations`, mapped by `citation/maps/Schema::map()` with every
schema property: `_href` (the API address of the citation), `id`,
`publicationId`, `seq`, `processingStatus`, `isStructured`,
`rawCitationWithLinks` (addresses wrapped in `<a href='…' target='_blank'>`)
and every structured field, whether or not the row shows it. Live-probed
2026-09-24 (Rule 8), all three apps, seven rows: "beta" typed left all
seven until Enter, then "Beta trial 2021" alone; "BETA" the same; "alpha
2020" both Alpha rows, "alpha 2021" none; a box emptied by keys kept the
filter until Enter, and the "Clear search phrase" (×), shown once a phrase
is entered, restored every row at once; "publication", a word only in the
field names, kept none.

<a id="fn-h"></a>
**h** — Lookup. `citation/Repository::importCitations()` and
`importAdditionalCitations()` call `reprocessCitation()` when the context's
`citationsMetadataLookup` is on: `Bus::chain([ExtractPidsJob, CrossrefJob,
OpenAlexJob, OrcidJob, IsProcessedJob])` with the context's
`getContactEmail()`. `ExtractPidsHelper::execute()`: `Doi`, `Arxiv`,
`Handle`, `Url`, `Urn::extractFromString()`. `CrossrefJob` returns at once
when the citation has a DOI; it queries `works/?query.bibliographic=` and
accepts a first hit scoring 100 or more. `OpenAlexJob` returns at once
without a DOI. `OrcidJob` prepends one `OrcidAuthorJob` per author with an
iD. `IsProcessedJob` sets `PROCESSED`. `CitationProcessingStatus`: FAILED -1,
NOT_PROCESSED 0, PID_EXTRACTED 1, CROSSREF 2, OPEN_ALEX 3, ORCID 4,
PROCESSED 5. `Citation::isStructured()`: one of doi/arxiv/handle/url/urn,
and title, and authors. Retries (`CitationLookupJob`): statuses 408, 500,
502, 504 prepend a copy delayed `5 × 2^n` minutes, at most
`MAX_SERVICE_RETRIES` 8, then `fail()`, whose `failed()` stores FAILED and
logs; 429 and 503 `release()` for Retry-After + 3 s plus 0–3 s of jitter
(fallback 60 s, Crossref and OpenAlex 5 s). `ExternalServicesHelper::apiRequest()`
reports any transport failure as 504. Pacing (`JitteredRateLimited`):
Crossref 3/s with a contact email, 1/s without; OpenAlex 90/s; ORCID 11/s
and 24,500/day. Introduced by pkp-lib #12715 (2026-09-14). The upstream-sync
regression read of that day saw three references complete end to end on
OJS with outbound HTTP available, and with the dead-port proxy saw the 504
path park a reference behind a Crossref step delayed 5 minutes, with
neither data nor badge on its row. Test installs run no job runner and have
outbound HTTP dead (seed-facts), so a lookup never completes there: the
chain's steps 1–5, the requests, their pacing and retries, and the failed
mark are unreachable on a test install and rest on the code above.
Live-probed 2026-09-24 (Rule 11), all three apps: a reference added
through "Add" with a DOI and an arXiv ID in its text showed its text alone,
with no identifier link, after the Add and after a reload. Structured by
hand: a web address, a title and one named author made a row structured
(title, expander, no "Reprocess"); a DOI and a title with no author row did
not, nor five identifiers with no title; an author row with empty names
did (A13).

<a id="fn-i"></a>
**i** — Row display. `CitationManagerCellCitation.vue`, lookup on: links for
`doi` (`https://doi.org/` + DOI), `url`, `arxiv` (`https://arxiv.org/abs/`),
`handle` (`https://hdl.handle.net/`), text "urn: {urn}"; structured: title,
and when expanded the authors (`familyName givenName`, an ORCID link with
the `OrcidUnauthenticated` icon and the screen-reader text
`common.orcidProfileFor`), `sourceName`, "Publication Date:"
(`…label.date`), "Volume:", "Issue Number:" (`…label.issueNumber`),
"Pages:" when both first and last page exist, the raw text, and the badges
`…label.wikidata` "Wikidata" / `…label.openAlex` "OpenAlex" as links.
Unstructured: the raw text, and the badge
`…structured.noStructuredInformationFound` only when `processingStatus ==
PROCESSED`; FAILED (-1) matches no branch. Lookup off: the raw text only.
Progress box: `CitationManagerStatusProcessed.vue`, shown when `total > 0`,
`total` = structured citations, `processed` = structured and PROCESSED;
texts `…structured.processing.title|description` and
`…structured.processed.title|description`. Refresh: `citationManagerStore.js`
`setInterval(…, 7000)` calls the data refresh only while lookup is on and
`processed < total`. Live-probed 2026-09-24 (Rules 12, 13), all three
apps: the identifiers in the order DOI, web address, arXiv ID, handle,
each a link opening in a new tab, then "urn: urn:nbn:de:1234-5678" as
text; an expanded structured row read "Lovelace Ada" and "Babbage Charles"
(each with an ORCID link, screen-reader text "ORCID profile for Ada
Lovelace"), "Journal of Tests", "Publication Date: 2020-05-01", "Volume:
12", "Issue Number: 3", "Pages: 45 - 67" and the raw text in small print;
an unstructured row, fresh or just reprocessed, showed its text and no
badge. The expander's name read "Collapse" before and after opening, and
Enter or Space on it changed nothing; every row with nothing to expand
held a 0×0 "Collapse" button. The box read "Processing references - 0/1"
after one hand-structured reference and "0/2" with two structured in a
list of five, was absent while none was structured, and read "0/1" over
four after a structured one was deleted. At "0/1" the page fetched the
submission and the publication every 7 s (nine pairs in 60 s); with no
structured reference, with lookup off, and after leaving for "Title &
Abstract" it fetched nothing in 22 s. A reference structured by hand stays
unfinished, so on a test install the first number stays 0 and the page
keeps refreshing. Unreachable on a test install: the "Wikidata" and
"OpenAlex" badges (no field of the panel sets them), the "No structured
information found" badge, the failed row, and "All {total} references
successfully processed".

<a id="fn-j"></a>
**j** — Reprocess. Row: dialog `…structured.reprocessDialog.title`, empty
message, "OK" / "Cancel" → POST `…/citations/{id}/reprocessCitation`
(status reset to NOT_PROCESSED, chain dispatched). All: dialog
`…structured.reprocessAllCitations.title|confirm` → POST
`…/reprocessCitationsByPublicationId`, which resets and chains every
citation of the publication, structured or not. The Crossref and OpenAlex
`Inbound::getWork()` mappings write the service's values onto the citation.
Live-probed 2026-09-24 (Rule 15), all three apps: "Reprocess" offered on
unstructured rows only; its dialog headed "Are you sure you want to
reprocess this citation?" over an empty message, with "OK" and "Cancel";
"Cancel" sent nothing, "OK" sent the request (answered 200) and left the
row as it was. "Reprocess all references" asked verbatim; "OK" sent the
request (200) and the hand-structured rows kept every stored value. The
services' answers overwriting hand edits are unreachable on a test install,
where no lookup runs.

<a id="fn-k"></a>
**k** — The wizard's save. `PKPCitationsForm` PUTs `citationsRaw` to the
publication; `publication/DAO::update()` (with the old publication) calls
`citation/Repository::importCitations()`, which compares the stored raw
texts with the tokenized box by value and, when they differ, deletes the
version's citations and inserts every non-empty line (sequence = line
position, no duplicate check). With lookup on each is chained (fn h); with
lookup off the DOI found in the text is set on the object after
`dao->insert()` and never written. `importAdditionalCitations()` (the "Add"
path) writes it with `Repo::citation()->edit()`. The OJS Crossref deposit
(`ArticleCrossrefXmlFilter`, `citation_list`) sends `<doi>` for an
unstructured citation that has one. Required references: `citationsRaw`
reads as the stored lines joined, so an empty list fails
`validator.required`, shown by `review-details.tpl` above "References".
Live-probed 2026-09-24 (Rules 16, 17), all three apps, two runs each: the
box "Beta trial 2021" / "Alpha study 2020" / "Beta trial 2021" / empty /
spaces / "  Gamma    report   2022  " saved by "Continue" gave the Review
item and, after "Submit", the Journal Manager's rows "Beta trial 2021",
"Alpha study 2020", "Beta trial 2021", "Gamma report 2022"; a later save
replaced the list ("Rail one" became "Rail two" alone). At "Require…" with
the box empty, the Review step's own check (`POST …/submit`) answered 400
`{"citationsRaw":["This field is required."]}`; the wizard's `canSubmit`
needs `isValid`, false while the check's errors stand
(`SubmissionWizardPage.vue`). Test runs 2026-09-24, OJS and OPS (the OMP
suite's scenario 4 asserts the same): once the check had answered, "This
field is required." stood above "References" and the footer's "Submit"
was disabled, so the confirmation never opened. The earlier probe's
reading of no warning and a refused "Submit" › "Submit" came from a read
and a press made while "Checking your submission" still showed. Filled,
it submitted. Rule 17 on a scratch journal with lookup off: the wizard's
"Alpha study https://doi.org/10.1234/abcd" and the Journal Manager's "Add"
of "Beta trial https://doi.org/10.1234/efgh" both read as plain text; after
the lookup box was ticked and saved, with no job run, only Beta showed the
DOI link to `https://doi.org/10.1234/efgh` and "10.1234/efgh" in the "DOI"
box of "Edit", Alpha neither (two runs on OJS, one each on OMP and OPS).

<a id="fn-l"></a>
**l** — Data citations. `DataCitationManager.vue`: label
`submission.dataCitations` "Data Citations"; the description
`submission.dataCitations.description` and the top controls render only with
`canEdit`; empty text `submission.dataCitations.emptyCitations`.
`useDataCitationManagerConfig.js`: column `submission.dataCitations.title`
"Title" and a screen-reader-only `common.moreActions`; top items
`DataCitationManagerSortButton` and the "Add Data Citation" button
(`…action.addDataCitation`); row actions `common.view` always,
`common.edit` and `common.delete` with `canEdit`.
`DataCitationManagerCellCitation.vue`: identifier, then title. Panels
(`useDataCitationManagerActions.js`): `…addModal.title`, `…editModal.title`
(PUT), and `DataCitationViewModal.vue` (`…viewModal.title` "View Data
Citation", `display-only`, submit and cancel removed). Delete: dialog
`common.delete` / `common.confirmDelete`. `DataCitationEditForm`: fields and
option lists as in the table (`submission.dataCitations.label.*`), `title`
and `relationshipType` required, neither select given a value.
`dataCitation.json`: `identifier` `required_with:identifierType`,
`identifierType` `required_with:identifier` and `in:…`, `relationshipType`
`in:…`, `url` `url`, `year` `digits:4`, `authors[].orcid` `orcid`
(`validator.required_with` "This field is required when {$values} is
present.", `validator.digits`, `validator.url`, `validator.orcid`);
`dataCitation/Repository::validate()` checks the identifier through
`PidResolver::resolveByIdentifierType()` and answers
`submission.dataCitations.identifier.invalid`. `DataCitation::boot()`
strips the type's prefixes and base addresses from `identifier` on save.
The "Data" page: U40 fn f (live-probed 2026-08-28 on all three apps: with
data citations on and the statement off the page held only the Data
Citations list reading "No data citations have been added.").
Live-probed 2026-09-24 (the data citation panel; Rules 18–22), all three
apps: the panels "Add Data Citation", "Edit Data Citation" (prefilled,
Creators rows included) and "View Data Citation" (the eight fields as
text, the header's "Close" its only button); an empty save refused in the
browser with "This field is required." on Title and Relationship type;
the Identifier type list in the table's order, arriving empty with no
empty entry; a type alone and an identifier alone refused with the two
messages of the table; "not-a-doi" of type DOI refused with ""not-a-doi" is
not a valid DOI identifier."; "202" and "20245" refused with "This must be
4 digits long.", "20a4" with that and "This is not a valid integer.";
ORCID iDs "123" and "0000-0002-1825-0097" both refused with the full-URI
message; "example" refused as a URL; "https://doi.org/10.1234/abcd" stored
and shown as "10.1234/abcd" (also in "Edit"), "doi:10.1234/efgh" as
"10.1234/efgh", "https://hdl.handle.net/20.1000/100" as "20.1000/100".
Clearing a saved identifier on "Edit Data Citation" was refused (400).
Headings "Publication: Data" on OJS and OMP, "Preprint: Data" on OPS, with
"Data Citations" above the statement. The table updated in place about a
second after each panel closed, and a deleted row stayed gone after a
reload. With the setting off and a data citation stored, the workflow,
the draft's Details and Review steps and the Reviewer's window showed no
data citations.

<a id="fn-m"></a>
**m** — Ordering. `dataCitationManagerStore.js` `useOrdering()`: "Order"
starts it, rows render `TableCellOrder` (up/down) instead of the menu,
"Save Order" PUTs the id sequence to `…/dataCitations/order`
(`saveOrder()`: `seq` = position + 1); `cancelSorting` has no button.
`PKPDataCitationController::add()` sets no `seq`; the `data_citations.seq`
column defaults to 0 (`MetadataMigration`, upgrade `I6278_DataCitations`);
`DataCitation::scopeOrderBySeq()` sorts by `seq` alone, with no tie-breaker
(the funders' query adds the row id). Live-probed 2026-09-24 (Rule 23),
all three apps: "Dataset A", "B", "C" added in that order listed A, B, C,
also after an edit of A to "Dataset A1" and a reload; "Order" swapped each
row's menu for two icon-only buttons with no name and the button read "Save
Order"; C moved up twice and saved read C, A1, B, also after a reload;
"Dataset D" added then listed first, also after a reload and after saving
the order again with no move. Code read 2026-09-26 (Rule 23, the order
before a save): every data citation added and not yet ordered holds `seq`
0, so they tie and `orderBy('seq')` leaves them in the order PostgreSQL
returns the rows, which is their order on disk: usually the order added,
but a row an edit rewrote, or one written into space freed by a delete,
can come back elsewhere. The probe's A, B, C order was that storage order,
not one the app keeps. Several data citations added after a saved order
tie at 0 the same way, above the ordered rows. After "Save Order" every
row holds a distinct `seq`, so the saved order is fixed.

<a id="fn-n"></a>
**n** — Reviewer. `ReviewerViewMetadataLinkAction` passes
`dataCitationEditForm` when the context's `dataCitations` is on;
`useReviewerSubmissionDetailsForm.js` adds `DataCitationManager` with
`canEdit: false` when `publication.dataCitations` is non-empty and the form
was passed. The publication map (`publication/maps/Schema`, case
`dataCitations`) returns an empty list when
`AnonymizeData::submissionsToAnonymizeByAuthor()` lists the submission: the
caller is the reviewer of an assignment whose method is neither
`SUBMISSION_REVIEW_METHOD_ANONYMOUS` nor `_OPEN`, that is "Anonymous
Reviewer/Anonymous Author". The window has no references field. A preprint
server has no reviewers. Live-probed 2026-09-24 (Actors row 7; Rule 25),
OJS and OMP, a Reviewer who had accepted, the submission carrying one data
citation and two references: under "Anonymous Reviewer/Disclosed Author"
and "Open" the window showed Title, Authors, Abstract, then the Data
Citations table with "View" alone, no line under the heading, no "Order"
and no "Add", "View" opening "View Data Citation"; under "Anonymous
Reviewer/Anonymous Author" no table (the page's publication request
carried no data citations); with no data citation on the submission, or
the setting off, no table; no reference text and no "References" label in
any of them.

<a id="fn-o"></a>
**o** — Versions. `publication/Repository::version()`: the new
publication's `citations` are taken aside, cleared, and after insertion
copied with `citation/Repository::copyCitations()` (each citation inserted
as it is, structured fields and processing status included, no lookup
dispatched); data citations are re-created with `DataCitation::create()`
from each row's data, sequence included. U49's footnote on version creation
records the same copy. Live-probed 2026-09-24 (Rules 1, 26), all three
apps: with lookup on and version 1.0 published with three references (one
structured by hand) and one data citation, "Create New Version" gave a 1.1
("Version of Record" on OJS and OMP, "Author Original" on OPS) with the
same three rows, the structured one keeping its DOI link, title and
expander and the box "Processing references - 0/1", and the same data
citation; deleting a reference and adding another on 1.1 left 1.0's lists
as they were; the landing page kept 1.0's list until 1.1 was published. A
funder added on 1.1's "Funding" page also listed on 1.0's.

<a id="fn-p"></a>
**p** — Reader. OJS `templates/frontend/objects/article_details.tpl`:
`{if count($parsedCitations) || (string)
$publication->getData('citationsRaw')}` → section `item references`, heading
`submission.citations` "References", each citation as
`getRawCitationWithLinks()` (http, https and ftp addresses wrapped in a link
with `target='_blank'`) plus the `Templates::Article|Preprint::Details::Reference`
hook. OPS `preprint_details.tpl` has the same block but tests
`$publication->getData('citationsRaw')` without the `(string)` cast, so its
condition holds for a preprint with no references. `ArticleHandler` and
`PreprintHandler` assign the publication's `citations` without reading the
context's `citations` setting. OMP `monograph_full.tpl`: `{if $citations ||
…}`, with `CatalogBookHandler` assigning the lazy collection itself, which a
template condition treats as true even when it holds nothing. No template in
any app's `templates/` or default theme renders `dataCitations` (grep
2026-09-24). Live-probed 2026-09-24 (Actors row 8; Rule 27), all three
apps, signed out, two runs on OMP and OPS: a published item with "Zulu
report 2019", "Alpha study 2020 https://example.org/alpha", "Beta trial
2021 ftp://ftp.example.org/beta" and "Delta paper 2023 doi:10.1234/k4delta"
(Beta structured by hand) and one data citation showed the heading
"References" and one paragraph per reference in list order, the https and
ftp addresses as links opening in a new tab, "doi:10.1234/k4delta" as
text, no structured detail, and no data citation text or markup anywhere;
with "Enable references metadata" unticked and saved the block stayed; an
item with no references showed no heading on OJS and an empty "References"
heading on OMP and OPS.

<a id="fn-r"></a>
**r** — Side effects. No activity-log, mail or notification call in
`PKPCitationController`, `PKPDataCitationController`,
`citation/Repository` or the jobs (grep 2026-09-24). Outward: OJS
`ArticleCrossrefXmlFilter` (`citation_list`, data-citation relations),
`DataciteXmlFilter` (`dataCitations`), `jatsTemplate` `ArticleBack` (data
citations); OPS `PreprintCrossrefXmlFilter` (data-citation relations
only); the OMP checkout carries no DOI-registration plugin.
`CrossrefCitationDoiCheckTask` (OJS, hourly through
`CrossrefPlugin::registerSchedules()`) runs
`processPendingCitationDois()` for journals whose Crossref plugin is
enabled, deposits citations and has credentials. Body Text:
`WorkflowPublicationBodyText.vue` `transformCitationsForEditor(publication.citations)`.
Live-probed 2026-09-24 (Side effects), all three apps, two runs each:
adding, editing and deleting references and data citations, saving an
order and a row's "Reprocess" each answered 200 while the submission's
"History" kept the same lines, no "An email has been sent" line was added,
the mail catcher held no message for the Journal Manager or the Author,
and the Author's "Tasks" showed no count (a test install queues email as
jobs that never run, so the log's email lines are the evidence). Tools ›
"Native XML Plugin" exports carried `<citations><citation>…` and no data
citation; the journal's "JATS XML" page generated a `<ref-list>` with each
reference as `<mixed-citation>` and the data citation as
`<element-citation publication-type="data" specific-use="generated">`;
OMP and OPS offer no "JATS XML" entry. On OJS the "Body Text" page's side
panel listed each reference under "References" ("Drag references into the
editor to place an in-text citation.") with "Cite"; OMP and OPS have no
"Body Text" entry. DOI registrations and the hourly Crossref task are
unreachable on a test install (no registration agency on a scratch
context, no scheduled task, no outbound connections) and rest on the code
above.

<a id="fn-t"></a>
**t** — Unsaved typing. Live-probed 2026-09-24 (Fields & validation, last paragraph),
all three apps: no browser or in-page question in any run; the "Add" box
was empty on return from "Title & Abstract" and after reopening the
workflow; "Edit citation" closed with a changed text (lookup off) or a
typed DOI (lookup on) left the row unchanged and the reopened panel without
the change; a title typed in the panel and the dashboard opened by address
left the row unchanged; "Edit Data Citation" closed with a change, and the
page left with "Add Data Citation" filled, saved nothing.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-24 (Actors row 9; Settings), all three apps:
Settings › Workflow opens "Workflow Settings" with the tabs "Submission",
"Review" (not on a preprint server), the library tab ("Publisher Library",
"Press Library", "Preprint Server Library"), "Emails" and "Tasks and
Discussions"; "Submission" › "Metadata" lists, among the other items,
"References", "References Metadata Lookup", "Funding Statement",
"Funders", "Funder Grant ID validation", "Data Availability Statement" and
"Data Citations", each with the strings of the Settings section.

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-24 (Actors rows 1–6; Rules 9, 20): the
per-role reads of note a. With lookup on, "Reprocess all references" was
grayed out for a viewer who may not edit, and "Expand All" and a
structured row's expander still worked for them (OJS, OMP); with lookup
off "Reprocess all references" is not on the page at all.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-24 (the "Add" box): note e.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-24 (Rule 5): the four-line paste of note e.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-24 (Rule 5; A2), all three apps: with "Alpha
study 2020" listed, the paste "Alpha study 2020" / "Delta paper 2023" added
"Delta paper 2023" alone, the box emptied and "✓ Saved" showed with no
other message; a paste of "Beta trial 2021" alone, already listed, added
nothing and showed the same "✓ Saved". The browser's request answered 200
with the dropped lines as its body.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-24 (Rule 6): note f; "Alpha study 2020,
revised" saved closed the panel and updated the row.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-24 (Rule 7): note f.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-24 (Rule 8; A3), all three apps, seven rows of
which "Epsilon note" and "Zeta final piece" hold no digit: "citations",
"http", "false" and "0" each kept all seven rows after Enter; "true" kept
none, no row being structured with lookup off.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-24 (Actors rows 2 and 5; A1), all three apps,
two runs each: every scratch context enrols `admin` as its Journal
Manager, and Users & Roles refuses to end a user's last role in a journal
("You cannot remove the role. At least one role must be assigned to the
user."), so a Site Administrator with no role at all in a journal has no
way in from the screens. `admin` enrolled as Copyeditor (on OPS Editorial
Board Member) with its manager role then ended got the read-only References
page ("Add" and "Delete all references" grayed out, no row menu) and no
"Add Data Citation". Enrolled as Reader alone, `admin` got the editorial
dashboard's "Error" / "The current role does not have access to this
operation." and no submission (the dashboard's own access). `admin`
holding the manager role got every control on both pages, each saving.

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-24 (Rule 10): note d.

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-24 (Rules 13, 14; A6): notes f and i.

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-24 (Rule 10; A4): the press and the preprint
server read "Structuring and Metadata Lookup is enabled for this
Journal." above the box, as the journal does.

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-24 (Rule 15): note j.

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-24 (the References box; Rule 16): notes b
and k.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-24 (Rule 17; A7): note k.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-24 (the data citation panel): note l.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-24 (Rule 21): note l; a DOI typed as an
address showed "10.1234/abcd" on the row's identifier line and in the
Identifier box of "Edit".

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-24 (Rule 23; A8): note m.

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-24 (Rule 24; A9), all three apps: the Data
section on "Details" at "Ask" and "Require…", headed "Data" with its line,
the Data Citations table with every control ("View", "Edit", "Delete",
"Order", "Save Order" working) before the statement field; at "Do not
request…" and off no section and no Review item, the workflow page still
listing a stored data citation. At "Require…" with none given, "Review"
showed "Data citations are required." and "Submit" › "Submit" landed on
"Submission complete", the submission then listed on the dashboard.

<a id="fn-q20"></a>
**q20** — Live-probed 2026-09-24 (Rule 24; A10): on OMP and OPS a saved
add left the table at "No data citations have been added." and "Review"
at "Data Citations / None provided", a second add and an edited title did
not show either, and a reload showed them all; on OJS each save showed at
once.

<a id="fn-q21"></a>
**q21** — Live-probed 2026-09-24 (Actors row 7; Rule 25): note n.

<a id="fn-q22"></a>
**q22** — Live-probed 2026-09-24 (Rule 26): note o.

<a id="fn-q23"></a>
**q23** — Live-probed 2026-09-24 (Actors row 8; Rule 27; A11, A20): note
p; the "Data" page's line reads verbatim "Add formal data citations,
ensuring datasets are properly credited and appear alongside other
references in the publication.".

<a id="fn-s"></a>
**s** — Scenario seeding. The seeded journal (`publicknowledge`) keeps the
install defaults (fn c): references asked for, lookup and data citations
off. Accounts and passwords: `docs/process/users.md`; scratch journals come
from `POST scenarios/context`, whose `metadata` key sets `citations` and
`dataCitations` and whose `citationsMetadataLookup` key the lookup; a
scratch submission's `citationsRaw` seeds its references (through the
wizard's save, so with lookup off no DOI is kept) and `dataCitations[]` its
data citations. Live-probed 2026-09-24: all three keys seeded scratch
contexts and submissions on the three apps. A test install runs no job
runner and has no outbound connections, so with lookup on every reference
stays unprocessed, one structured by hand in "Edit" too (scenario 5's
"0/1"; seed-facts "Install defaults"). Mail is read in the mail catcher
(Mailpit, `http://127.0.0.1:8025`), scoped by the scenario's own
addresses; a test install queues the app's email as jobs that never run,
so the "Nothing else happens" bullets rest on the submission's Activity
Log (Activity Log & Notes › History), whose email lines would show a sent
message, with the mailbox as a second read.
The roster Author's role has "Permit submission metadata edit." unticked
on a fresh journal and press and ticked on a fresh preprint server
(seed-facts), so the Author bullets marked "(journal, press)" run on OJS
and OMP only; on OPS the Author of an unposted preprint gets every
control (note a), which *Publication metadata* tests.
Scenario 1: `manager.maya`; one submitted scratch submission by
`author.alex` with no `citationsRaw`, any stage before publication.
Scenario 2: `author.alex`'s draft (`submitted: false`) carrying its file,
since "Submit" needs the main file (seed-facts); it reopens on "Upload
Files", and "Continue" reaches "Details"; `manager.maya` reads the rows.
Scenario 3: two scratch submissions with `published: true`, the first
with `citationsRaw: ['Zulu report 2019', 'Alpha study 2020
https://example.org/alpha']`; read signed out (the article page, the
catalog book page, the preprint page).
Scenario 4: a scratch context with no `metadata` key (references at
`request`), a throwaway manager and author in `users[]`; one published
submission with `citationsRaw: 'Alpha study 2020'` and one draft of the
throwaway author carrying its file. A scratch context because the
scenario changes the setting (scenarios.md "The base context has plain
defaults"); on OJS the publish needs no issue (seed-facts).
Scenario 5: a scratch context with `citationsMetadataLookup: true` and a
throwaway manager; one submission with `citationsRaw: 'Alpha study
2020'`. The page refreshes itself every 7 s while the box shows (note i),
so each read waits for the page to settle.
Scenario 6: a scratch context with `metadata: {dataCitations: 'request'}`,
a throwaway manager and author; one submitted submission of the author
with no `dataCitations[]`.
Scenario 7: the same context shape; a draft of the throwaway author
carrying its file; the manager reads the "Data" page.
Scenario 8: a scratch context with `metadata: {dataCitations: 'request'}`
and a throwaway manager; one published submission with `citationsRaw:
['Alpha study 2020', 'Beta trial 2021']` and `dataCitations: [{title:
'Ocean temperature records', relationshipType: 'generated'}]`; the new
version is created on screen (*Publish, schedule & versions*).
Scenario 9 (OJS, OMP): two scratch contexts, each with `metadata:
{dataCitations: 'request'}`, a throwaway manager, author and reviewer, the
first with `review: {defaultReviewMode: 'anonymous'}` ("Anonymous
Reviewer/Disclosed Author"), the second with `doubleAnonymous`; in each a
submission with `decisions: ['sendExternalReview']`, `reviewRounds:
[{reviewers: [{username, status: 'accepted'}]}]`, `citationsRaw: 'Alpha
study 2020'` and `dataCitations: [{title: 'Ocean temperature records',
relationshipType: 'generated'}]`. The review method is stamped from the
context's default review type (scenarios.md, `reviewRounds[]`).

<a id="fn-f-a1"></a>
**f-a1 — A1 evidence.** Note a: `PKPCitationController`'s route group omits
`ROLE_ID_SITE_ADMIN`, while the page's controls follow
`permissions.canEditPublication`; the `HasRoles` middleware answers 401
"You are not authorized to access the requested resource." for a user with
none of the listed roles in the journal. `PKPDataCitationController` and
`PKPFunderController` list the Site Administrator. Live-probed 2026-09-24:
note q9; the state the entry described has no way in from the screens.

<a id="fn-f-a2"></a>
**f-a2 — A2 evidence.** Note e. The unused strings:
`submission.citations.structured.addRaw.partialSuccess`, `.success`,
`.empty`, `.errors` (lib/pkp `locale/en/submission.po`); no caller in
ui-library or lib/pkp (grep 2026-09-24). Live-probed 2026-09-24: q5 and
note e; none of the four strings appeared.
Issue report: [pkp-e2e#878](https://github.com/jardakotesovec/pkp-e2e/issues/878) ([docs/issues/U42-A2-pasted-repeat-reference-dropped-saved.md](../issues/U42-A2-pasted-repeat-reference-dropped-saved.md)).

<a id="fn-f-a3"></a>
**f-a3 — A3 evidence.** Note g. Live-probed 2026-09-24: q8.
Issue report: [pkp-e2e#879](https://github.com/jardakotesovec/pkp-e2e/issues/879) ([docs/issues/U42-A3-reference-search-keeps-rows-without-word.md](../issues/U42-A3-reference-search-keeps-rows-without-word.md)).

<a id="fn-f-a4"></a>
**f-a4 — A4 evidence.** `submission.citations.structured.citationsMetadataLookup.description`
exists only in lib/pkp's `locale/en/submission.po`; neither OMP's nor OPS's
`locale/en` overrides it. Live-probed 2026-09-24: q12.
Issue report: [pkp-e2e#869](https://github.com/jardakotesovec/pkp-e2e/issues/869) ([docs/issues/U42-A4-press-server-lookup-text-says-journal.md](../issues/U42-A4-press-server-lookup-text-says-journal.md)).

<a id="fn-f-a5"></a>
**f-a5 — A5 evidence.** Notes h and i: `CitationLookupJob::failed()` stores
FAILED (-1); the row's badge branch tests PROCESSED only, and the progress
box counts structured citations only. The upstream-sync read of pkp-lib
#12715 (2026-09-14) found the badge-less wait deferred upstream to
pkp/pkp-lib#13308. The failed row is not reachable on a test install
within a run (eight retries span about 21 hours). Live-probed 2026-09-24
(the waiting half), all three apps: a reference freshly added or just
reprocessed showed its text with no badge and no details, and the box did
not count it.

<a id="fn-f-a6"></a>
**f-a6 — A6 evidence.** Note i. Live-probed 2026-09-24: the box absent over
five unstructured references and "Processing references - 0/2" with two of
the five structured (note i). The "All {total}" wording is unreachable on a
test install.
Issue report: [pkp-e2e#883](https://github.com/jardakotesovec/pkp-e2e/issues/883) ([docs/issues/U42-A6-reference-lookup-progress-counts-structured-only.md](../issues/U42-A6-reference-lookup-progress-counts-structured-only.md)).

<a id="fn-f-a7"></a>
**f-a7 — A7 evidence.** Note k. Live-probed 2026-09-24: the screen half,
note k (Rule 17). The deposit half is not yet seen: it would take the OJS
Crossref XML of an article whose references came both ways.
Issue report: [pkp-e2e#872](https://github.com/jardakotesovec/pkp-e2e/issues/872) ([docs/issues/U42-A7-wizard-reference-doi-not-kept.md](../issues/U42-A7-wizard-reference-doi-not-kept.md)).

<a id="fn-f-a8"></a>
**f-a8 — A8 evidence.** Note m. The funders list shows the same behavior
after a saved order (*Funding*, A7). Live-probed 2026-09-24 (the data
citation added after a saved order): note m. Code read 2026-09-26 (the
order before a save): note m; not yet seen out of order on screen.
Issue report: [pkp-e2e#876](https://github.com/jardakotesovec/pkp-e2e/issues/876) ([docs/issues/U42-A8-data-citation-added-after-order-goes-first.md](../issues/U42-A8-data-citation-added-after-order-goes-first.md)).

<a id="fn-f-a9"></a>
**f-a9 — A9 evidence.** `Context::getRequiredMetadata()` includes
`dataCitations`; `validateSubmit()` casts `$publication->getData('dataCitations')`,
a lazy collection, to a string, which yields "[]" even when empty, so the
required check never fails. The warning is `review-details.tpl`'s
client-side notice (note b). Live-probed 2026-09-24, all three apps: a
draft carrying its main file, at "Require…" with no data citation, landed
on "Submission complete" (the Review step's own check answered 200), while
required references kept "Submit" grayed out on the same screens (q19,
note k).
Issue report: [pkp-e2e#870](https://github.com/jardakotesovec/pkp-e2e/issues/870) ([docs/issues/U42-A9-submits-without-required-data-citations.md](../issues/U42-A9-submits-without-required-data-citations.md)).

<a id="fn-f-a10"></a>
**f-a10 — A10 evidence.** `DataCitationManager` refreshes the wizard through
`useDataChanged()`; `SubmissionWizardPage.vue` provides the refresh in its
`setup()`, and `SubmissionWizardPageOMP.vue` / `SubmissionWizardPageOPS.vue`
extend it. The funders section, built the same way, stays stale on OMP and
OPS only too (*Funding*, A4); the cause is unexplained at code level.
Live-probed 2026-09-24: q20.
Issue report: [pkp-e2e#873](https://github.com/jardakotesovec/pkp-e2e/issues/873) ([docs/issues/U42-A10-wizard-data-citations-funders-stale-press-server.md](../issues/U42-A10-wizard-data-citations-funders-stale-press-server.md)).

<a id="fn-f-a11"></a>
**f-a11 — A11 evidence.** Note p (no reader template renders data
citations), note l (the table's description) and note r (the exports).
Live-probed 2026-09-24: q23 and note r.

<a id="fn-f-a12"></a>
**f-a12 — A12 evidence.** `PKP\pid\Arxiv`: the extraction pattern stops
at the ID's digits (no `v{n}` suffix) and the validation pattern
`^(?:\d+\.\d+|[a-z.-]+\/\d+)$` refuses one;
`PKPCitationController::edit()` extracts `arxiv` with it only for the
prefixed and address forms (a bare ID matches nothing and is kept as
typed), and the data citation's `PidResolver` maps "ARXIV" to the same
class. Live-probed
2026-09-24, all three apps (two runs on OJS): "2101.12345v2" kept, and
"arxiv:2101.12345v2" and "https://arxiv.org/abs/2101.12345v2" stored as
"2101.12345" in "Edit citation"; of type "ARXIV",
"https://arxiv.org/abs/1234.12345v2" saved as "1234.12345",
"arxiv:2345.23456v3" as "2345.23456", "3456.34567v4" refused and
"4567.45678" accepted.
Issue report: [pkp-e2e#866](https://github.com/jardakotesovec/pkp-e2e/issues/866) ([docs/issues/U42-A12-arxiv-id-loses-version.md](../issues/U42-A12-arxiv-id-loses-version.md)).

<a id="fn-f-a13"></a>
**f-a13 — A13 evidence.** Note h (`Citation::isStructured()` tests that
`authors` is non-empty). Live-probed 2026-09-24, all three apps: after
"Add" under "Author Information", a name typed and "Close" (no question),
the reopened panel showed a row of empty boxes; a save for another change
sent that row as a blank author, and after a reload the panel still showed
it (OMP and OPS in the full run; OJS in an earlier run, where the row then
turned structured). The page's own 7-second refresh, when it lands between
the close and the reopen, removes the blank row. A row added empty and
saved made a reference with a DOI and a title structured, took
"Reprocess" off its menu and moved the box to "0/2"; deleting the row and
saving undid all of it.
Issue report: [pkp-e2e#880](https://github.com/jardakotesovec/pkp-e2e/issues/880) ([docs/issues/U42-A13-citation-author-row-kept-after-close.md](../issues/U42-A13-citation-author-row-kept-after-close.md)).

<a id="fn-f-a14"></a>
**f-a14 — A14 evidence.** `FieldAuthors.vue` renders each row's boxes as
`FieldText` with no `label`; the column names sit only in the table
header. Live-probed 2026-09-24, all
three apps: the accessibility tree lists each box as a text box with no
name under the table "Author Information".
Issue report: [pkp-e2e#874](https://github.com/jardakotesovec/pkp-e2e/issues/874) ([docs/issues/U42-A14-citation-author-boxes-unnamed.md](../issues/U42-A14-citation-author-boxes-unnamed.md)).

<a id="fn-f-a15"></a>
**f-a15 — A15 evidence.** Note l (`identifier` `required_with:identifierType`,
the select given no empty option). Live-probed 2026-09-24, all three apps:
the list's options hold no empty entry, and clearing "Identifier" on a
saved data citation answered 400 with "This field is required when
identifier type is present.".
Issue report: [pkp-e2e#881](https://github.com/jardakotesovec/pkp-e2e/issues/881) ([docs/issues/U42-A15-data-citation-identifier-cannot-be-removed.md](../issues/U42-A15-data-citation-identifier-cannot-be-removed.md)).

<a id="fn-f-a16"></a>
**f-a16 — A16 evidence.** `CitationManagerCellToggle.vue` uses the shared
`TableCellTreeExpand.vue`, which renders its `<button>` on every row and
the icon only when `isDisplayed` (lookup on and the row structured), binds
the click to the icon rather than the button, and computes its
screen-reader text from `props.isExpanded.value`, always undefined, so the
text is always `list.collapse` "Collapse". Live-probed 2026-09-24, all three apps (two runs on OJS): note i;
the 0×0 buttons refused a click as outside the viewport.
Issue report: [pkp-e2e#588](https://github.com/jardakotesovec/pkp-e2e/issues/588) ([docs/issues/U16-A11-category-arrows-keyboard-and-names.md](../issues/U16-A11-category-arrows-keyboard-and-names.md)), shared with [Categories A11](U16-categories.md#a11): the same shared expander (`TableCellTreeExpand.vue`), re-walked 2026-10-04 on main, all three apps.

<a id="fn-f-a17"></a>
**f-a17 — A17 evidence.** Note f (`PKPCitationController::edit()` runs no
repeat check); note e (`existsRawCitation()` on "Add"). Live-probed
2026-09-24, all three apps: "Delta paper 2023" saved as "Beta trial 2021"
was accepted (200), and the list showed "Beta trial 2021" twice, also after
a reload.

<a id="fn-f-a18"></a>
**f-a18 — A18 evidence.** Recorded from a probe of 2026-09-24, two runs
per app: on OJS and OMP the list changed on "Details" and carried to
"Review" by the step rail never reached the submission, and on OPS
"Review" showed the old list in three of four reads. Overturned by a
re-check on 2026-09-29, on checkouts of 2026-09-28 (ojs `9d9f116f38`, omp
`480045c32`, ops `5da5bc48ad`, lib/pkp `fab29cfeca`, ui-library
`19802b78`): note b; in four forms of the rail move, two runs per app on
all three apps, the move sent the step's save within 0.29–0.67 s,
"Review" listed the new lines (on OPS in every read), and "Submit" ›
"Submit" completed with them; no write followed in the 8 s after
completion. The save on a step change is `SubmissionWizardPage.vue`'s
`currentStepIndex` watcher calling `addAutosaves()`, code older than
2026-09-24, so the re-check does not explain the earlier reading.

<a id="fn-f-a19"></a>
**f-a19 — A19 evidence.** Note m (`TableCellOrder`, icon-only buttons).
Live-probed 2026-09-24, all three apps: the accessibility tree lists two
unnamed buttons, each holding an image, per row in ordering mode.
Issue report: [pkp-e2e#619](https://github.com/jardakotesovec/pkp-e2e/issues/619) ([docs/issues/U46-A5-ordering-arrows-unnamed.md](../issues/U46-A5-ordering-arrows-unnamed.md)).

<a id="fn-f-a20"></a>
**f-a20 — A20 evidence.** Note p (the OMP and OPS template conditions).
Live-probed 2026-09-24, OMP and OPS, two runs each: an item with no
references showed the heading "References" over an empty block, with the
References setting on and off; OJS showed no heading.
Issue report: [pkp-e2e#871](https://github.com/jardakotesovec/pkp-e2e/issues/871) ([docs/issues/U42-A20-book-preprint-empty-references-heading.md](../issues/U42-A20-book-preprint-empty-references-heading.md)).

<a id="fn-f-a21"></a>
**f-a21 — A21 evidence.** None of lib/pkp's `submission.citations.structured*`
keys (`locale/en/submission.po`) has an entry in
`locale/fr_CA/submission.po`, and `list.collapse` and `common.moreActions`
have none in `locale/fr_CA/common.po`. Live-probed 2026-09-30 at ojs
`7ce98ec09e`, omp `3b0ecf794c`, ops `c8af945bb7` (lib/pkp `3dc90c81a6`),
two runs, all three apps, metadata lookup off, on a scratch journal with
English and French (Canada) interface languages, as its Journal Manager
and as the submitting Author, on a production-stage submission with no
references, with two, and published; every French read was paired with
the same read in `/en/`, where the page showed none of the codes. The
codes above showed in the text, placeholders and accessible names; two
more sit only in attributes or hidden controls
(`submission.citations.structured.expandAll`, and
`submission.citations.structured.reprocessAllCitations` on the hidden
"Reprocess all references" link). "Ajouter" with a typed reference
showed "Enregistré" and the new row, listed again after a reload; "Edit
citation" and the "Delete all references" dialog were closed with
"Fermer" and "Annuler". No request failed and no script error showed.
Re-walked 2026-10-04 on main, all three apps (3.5 has no structured References page). The row menu's `common.moreActions`, a released text French (Canada) never received, joined [pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457) ([docs/issues/U53-A11-users-tab-french-raw-keys.md](../issues/U53-A11-users-tab-french-raw-keys.md)), low; the rest (`submission.citations.structured*`, `list.collapse`) are main-only texts with no report under the 2026-10-02 ruling on main-only locale keys.

<a id="fn-f-a22"></a>
**f-a22 — A22 evidence.** lib/pkp `schemas/citation.json:43-45` declares
`authors.items.orcid` a bare `string` with no `validation`, so
`PKPCitationController::edit()` (`Repo::citation()->validate()`) stores
any text. ui-library `CitationManagerCellCitation.vue:57` binds it as
`:href="author.orcid"` with `target="_blank"` and no `rel`;
`FieldAuthorsDisplay.vue:14` has the same binding (it shows data
citations, whose ORCID is validated). The sibling `dataCitation.json`
gives `authors.items.orcid` `"validation": ["orcid"]`. Writes pass the
citations route's roles (manager, sub-editor, assistant, author) and
`PublicationWritePolicy` (`Repository::canEditPublication()`); the
submitter's assignment has `canChangeMetadata` while the submission is
incomplete, and the default Author group has `permitMetadataEdit` 1 on
OPS, 0 on OJS and OMP. The wizard shows only the plain References box,
so the pre-submission write is a direct `PUT
submissions/{id}/publications/{pid}/citations/{cid}`. The cell renders
only with `citationsMetadataLookup` on and the row `isStructured`; the
value is stored either way. Live-probed 2026-09-30 on OJS, OMP and OPS
main (lib/pkp `fab29cfeca`), `authors[0].orcid` set to an off-site
`https://example.com/…` address: 200 and stored as sent for the
submitting author before "Submit" (OJS and OPS `ccorino`, OMP
`afinkel`), OPS `ccorino` after submission, OJS `ccorino` with "can
change metadata" ticked on the assignment, OJS `dbuskins` and `dbarnes`;
401 for OJS `ccorino` after submission by default, the unassigned
`minoue`, and OPS `zwoods` on another author's preprint. Read in a
browser on OJS (as `dbarnes`) and OPS (`dbarnes`, `ccorino`): the
"ORCID profile for …" anchors had `href` exactly the stored values, an
`https:` address and a value with a made-up scheme, `target="_blank"`,
`rel=""`. The landing pages print only the raw text
(`getRawCitationWithLinks()|strip_unsafe_html`), and the JATS and
Crossref exports carry no reference author's ORCID. By code a
`javascript:` value is kept the same way (Vue does not sanitize a bound
`href`, and the backend sends no Content-Security-Policy header);
whether it runs on a click from this `target="_blank"` link was not
tried. Introduced by GaziYucel in pkp/pkp-lib#10692 "structured
citations" (pkp-lib `4730f6707e`, ui-library `c2f8e07d`, 2025-09-16);
pkp/pkp-lib#11902 "PIDs validation" (`2516e5a60c`, GaziYucel,
2025-10-24) added rules for arXiv, DOI and handle but not this field.
Proposed fix: give `authors.items.orcid` `"validation": ["nullable",
"orcid"]`, the existing rule (`ValidationServiceProvider.php:164`, an
`https://(sandbox.)orcid.org/` address with a valid checksum; tried on
OJS 2026-09-30: the off-site value refused with "The ORCID iD you
specified is invalid…", a full or sandbox address and an empty value
accepted), and in both Vue files render the link only for
`^https://(sandbox\.)?orcid\.org/`, with `rel="noopener noreferrer"`,
which also covers rows stored before the fix and values the lookup
writes without schema validation. 3.5, 3.4 and 3.3 do not have it: they
have no structured references (no `citation.json`, citations API or
CitationManager).
Security-shaped and unreleased: its issue report carries "- **Security** unreleased" (REPORT.md).
Issue report: [docs/issues/U42-A22-reference-author-orcid-any-link.md](../issues/U42-A22-reference-author-orcid-any-link.md).

<a id="fn-f-omp1"></a>
**f-omp1 — OMP1 evidence.** Note p. Live-probed 2026-09-24: f-a20, where
the finding continues as A20.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "References" page (the citation manager) | workflow › Publication › "References" | AFFW-398 · VUE-032 |
| "Add" box and "Add" button | "References" page, top | AFFW-533 |
| "Delete all references" | "References" page, links row | AFFW-534 |
| "Reprocess all references" (lookup on) | "References" page, links row | AFFW-535 |
| "Search references here" | "References" table, top | AFFW-536 |
| "Expand All" / "Collapse All" (lookup on) | "References" table, second column header | AFFW-537 |
| Row expander (lookup on, structured rows) | "References" table rows | AFFW-538 |
| Row "Edit" and the "Edit citation" panel | row "…" menu | AFFW-539 · AFFW-542 · VUE-055 |
| Row "Delete" | row "…" menu | AFFW-540 |
| Row "Reprocess" (lookup on, unstructured rows) | row "…" menu | AFFW-541 |
| "Delete all references" / "Reprocess all references" dialogs | the two links | AFFW-543 |
| "Data" page, Data Citations table | workflow › Publication › "Data"; wizard "Details" › "Data" | AFFW-399 · VUE-035 |
| "Add Data Citation" and its panel | Data Citations table, top | AFFW-544 · AFFW-550 · VUE-057 |
| "Order" / "Save Order" and the row arrows | Data Citations table, top; rows in ordering mode | AFFW-545 · AFFW-546 |
| Row "Edit" (data citation) | row "…" menu | AFFW-547 |
| Row "Delete" (data citation) and its dialog | row "…" menu | AFFW-548 · AFFW-549 |
| Row "View" and "View Data Citation" | row "…" menu | (not in the atlas) |
| Wizard References box and Review items | wizard "Details" and "Review" steps | (the wizard's own; *Submission wizard*) |
| Reviewer's "View All Submission Details" data citations | review screen | (*Reviewer's review*'s window) |
| Citations API | `submissions/{id}/publications/{id}/citations` | API-011 |
| Data citations API | `submissions/{id}/publications/{id}/dataCitations` | API-015 |
| The citation and data-citation records | publication data | SET-005 · SET-008 |
| Lookup chain (background jobs) | queued on add or reprocess with lookup on | JOB-003 · JOB-004 · JOB-005 · JOB-006 · JOB-007 |
| Crossref citation-DOI check | OJS scheduled task of the Crossref plugin (*DOIs*) | JOB-062 |
| Landing-page "References" block | article, preprint and book pages (*Article landing page & reading*, *Monograph landing page*) | AFFR-057 |
| Settings "References", "References Metadata Lookup", "Data Citations" | Settings › Workflow › Submission › "Metadata" (*Publication metadata* owns the screen) | — |
| `lib/pkp/tools/parseCitations.php` ("Parse and save submission(s) citations.") | command line, no screen | waived: not a screen (*System administration & jobs*) |
| Unreached pieces: the unused lookup-toggle component, the legacy author dashboard's references form | none | recorded in `docs/tracking/UNASSIGNED.md` item 25 |

## Reference — code anchors

- `lib/ui-library/src/managers/CitationManager/` — `CitationManager.vue`, `citationManagerStore.js`, `useCitationManagerConfig.js`, `useCitationManagerActions.js`, `useCitationManagerFormAddRawCitation.js`, `CitationManagerCellCitation.vue`, `CitationManagerStatusProcessed.vue`, `CitationManagerCellActions.vue`, `CitationManagerCellToggle.vue`, `CitationManagerToggleAll.vue`, `CitationManagerSearchField.vue`, `modals/CitationEditModal.vue` (and the unrendered `CitationManagerMetadataLookup.vue`)
- `lib/ui-library/src/managers/DataCitationManager/` — `DataCitationManager.vue`, `dataCitationManagerStore.js`, `useDataCitationManagerConfig.js`, `useDataCitationManagerActions.js`, `DataCitationManagerCellCitation.vue`, `DataCitationManagerCellActions.vue`, `DataCitationManagerSortButton.vue`, `modals/DataCitationEditModal.vue`, `modals/DataCitationViewModal.vue`
- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfig{Editorial,Author}OJS.js` · `useWorkflowConfig{OMP,OPS}.js` · `useWorkflowNavigationConfig/useWorkflowNavigationConfig{OJS,OMP,OPS}.js`
- `lib/ui-library/src/pages/reviewerSubmission/useReviewerSubmissionDetailsForm.js` · `lib/pkp/controllers/modals/review/ReviewerViewMetadataLinkAction.php`
- `lib/ui-library/src/components/Container/SubmissionWizardPage{,OMP,OPS}.vue` · `lib/pkp/templates/submission/wizard.tpl` · `review-details.tpl` · `lib/pkp/pages/submission/PKPSubmissionHandler.php::getDetailsStep()`
- `lib/pkp/classes/components/forms/publication/PKPCitationsForm.php` · `forms/citation/CitationRawEditForm.php` · `CitationStructuredEditForm.php` · `forms/dataCitation/DataCitationEditForm.php` · `forms/context/PKPMetadataSettingsForm.php`
- `lib/pkp/pages/dashboard/PKPDashboardHandler.php` (`publicationSettings`, `contextCitationsMetadataLookup`, `componentForms`)
- `lib/pkp/api/v1/citations/PKPCitationController.php` · `lib/pkp/api/v1/dataCitations/PKPDataCitationController.php` · `lib/pkp/classes/security/authorization/PublicationWritePolicy.php`
- `lib/pkp/classes/citation/` — `Citation.php`, `Repository.php` (`importCitations()`, `importAdditionalCitations()`, `copyCitations()`, `reprocessCitation()`), `DAO.php`, `maps/Schema.php`, `filter/CitationListTokenizerFilter.php`, `pid/ExtractPidsHelper.php`, `enum/CitationProcessingStatus.php`, `enum/CitationType.php`, `enum/CitationSourceType.php`, `externalServices/{crossref,openAlex,orcid}/Inbound.php`, `externalServices/ExternalServicesHelper.php`
- `lib/pkp/jobs/citation/` — `CitationLookupJob.php`, `ExtractPidsJob.php`, `CrossrefJob.php`, `OpenAlexJob.php`, `OrcidJob.php`, `OrcidAuthorJob.php`, `IsProcessedJob.php`, `JitteredRateLimited.php`
- `lib/pkp/classes/dataCitation/` — `DataCitation.php`, `Repository.php`, `maps/Schema.php`, `pid/PidResolver.php`
- `lib/pkp/schemas/citation.json` · `dataCitation.json` · `publication.json` (`citations`, `citationsRaw`, `dataCitations`) · `context.json` (`citations`, `citationsMetadataLookup`, `dataCitations`)
- `lib/pkp/classes/publication/DAO.php` (`citationsRaw`, `insert()`, `update()`) · `publication/Repository.php::version()` · `publication/maps/Schema.php` · `lib/pkp/classes/submission/Repository.php::validateSubmit()` · `lib/pkp/classes/context/Context.php::getRequiredMetadata()` · `lib/pkp/api/v1/submissions/AnonymizeData.php`
- `ojs/templates/frontend/objects/article_details.tpl` · `ops/templates/frontend/objects/preprint_details.tpl` · `omp/templates/frontend/objects/monograph_full.tpl` · `ojs/pages/article/ArticleHandler.php` · `ops/pages/preprint/PreprintHandler.php` · `omp/pages/catalog/CatalogBookHandler.php`
- `ojs/plugins/generic/crossref/filter/ArticleCrossrefXmlFilter.php` · `CrossrefCitationDoiCheckTask.php` · `plugins/generic/datacite/filter/DataciteXmlFilter.php` · `plugins/generic/jatsTemplate/classes/ArticleBack.php`
- `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php::setupTemplate()` (the unreached references form) · `lib/pkp/tools/parseCitations.php`
