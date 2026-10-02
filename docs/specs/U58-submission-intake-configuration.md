---
name: submission-intake-configuration
status: verified
---

# Submission intake configuration

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A Journal Manager decides how new work comes in before any author starts
a submission. Everything for that sits on one screen, Settings › Workflow
› "Submission", in side tabs: "Disable Submissions" (whether the journal
accepts new submissions at all), "Author Guidance" (the texts an author
reads before and during the submission wizard, and the copyright notice
they must accept), "Metadata" (which descriptive fields the journal uses
and which of them the wizard asks for), "Components" (the kinds of file an
author labels each upload with, and which kind every submission must
include) and "Contributor Roles". The reader-facing side of the same
setup is the About › "Submissions" page, where visitors read the author
guidelines, the checklist, the copyright notice and the privacy statement,
and are told whether and how they can submit. "Submission intake
configuration" is the specs' name for all of this; no screen uses it
(see the [glossary](GLOSSARY.md)). Most settings here take effect on
screens other features describe (the submission wizard, the file lists,
the publication pages); this spec says where each one lands and owns the
settings tabs and the "Submissions" page themselves. <sup>a</sup>

A preprint server has the same tabs, with two differences: its "Author
Guidance" tab names one box "For Readers" and has no "For Reviewer
Suggestion" box [OPS1](#ops1), and it can show a sixth side tab, "Author
Screening", only when an installed screening plugin supplies rules; none
is installed with the application, so a standard preprint server shows
five side tabs [OPS2](#ops2). A press has the same tabs with its own
component list and defaults [OMP3](#omp3). <sup>a</sup> <sup>i</sup>

## Actors & permissions

**Terms used below.** The **manager-level roles** and the rule for who
opens the Settings pages ("Permit changes to Settings") are defined once,
in [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access);
on the seeded journal they are the Journal Manager, the Editor and the
Production Editor. Readers need no account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Change and save "Disable Submissions", "Author Guidance" and "Metadata"** (Settings › Workflow › "Submission"; Rules 1–12) | • whoever opens the Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)); nobody else<br>• every other role, and a manager-level role without "Permit changes to Settings", has no "Settings" group in the side menu, and the typed address answers the access-denied page ("The current role does not have access to this operation.") <sup>b</sup> |
| **Keep the "Components" list** ("Add a Component", "Restore Defaults", "Order", a row's "Edit" and "Delete"; Rules 13–20) | • whoever opens the Settings pages; nobody else <sup>b</sup> |
| **Keep the "Contributor Roles" list** | • described in [Contributors & affiliations](U41-contributors-and-affiliations.md), Rule 12 |
| **See the "Author Screening" tab** {OPS} (Rule 21) | • whoever opens the Settings pages, and only while an installed screening plugin supplies rules <sup>i</sup> |
| **Read About › "Submissions"** (Rules 22–27) | • any visitor, signed in or not, except on a journal closed to visitors, where a signed-out visitor gets the Login page ([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 22) <sup>j</sup> |
| **Follow the page's "Make a new submission" and "view your pending submissions" links** (Rule 23b) | • any signed-in user; where each link leads depends on the user's roles (Rule 23b) ⚠ [A5](#a5) <sup>k</sup> <sup>td9</sup> |
| **See the page's "Edit" links** (Rule 25) | • users holding a manager-level role in the journal, signed in, whether or not the role may open the Settings pages; nobody else ([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Actors row 5) <sup>k</sup> |
| **Read the journal's components through the install's programming interface** (Rule 28) | • a signed-in user holding, in that journal, the Site Administrator, a manager-level role (with or without "Permit changes to Settings"), a Section Editor, an assistant role or the Author role<br>• refused: a signed-in user holding only a Reviewer or Reader role there, and a visitor who is not signed in <sup>l</sup> <sup>td11</sup> |

## Fields & validation

The "Submission" tab of Settings › Workflow (page heading "Workflow
Settings") holds its side tabs in this order: "Disable Submissions",
"Author Guidance", "Metadata", "Components", "Contributor Roles", and on a
preprint server "Author Screening" when a plugin supplies rules (Rule 21).
The first three are each one form with "Save" at its foot (Rule 2). <sup>a</sup>

**"Disable Submissions" tab.** <sup>c</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Disable Submissions": a heading and one box with the same label. Help: "Prevent users from submitting new articles to the journal. Submissions can be disabled for individual journal sections on the journal sections settings page." ("…new articles to the press. … for individual press series on the press series settings page." ⚠ [OMP1](#omp1); "…new preprints to the server. … for individual server sections on the server sections settings page."), the words "journal sections" ("press series", "server sections") a link | no | Unticked on a new journal. Effect: Rules 4–6 |

**"Author Guidance" tab.** Every box is a formatted-text box with no
length limit, empty allowed. "Where it shows" names the screen that
displays the saved text; only the "Submissions" page is this spec's
(Rule 7). With more than one form language, each box takes one text per
language (Rule 3). <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Author Guidelines" (help "The following appears on the submissions page where authors will learn about what they must do to prepare their work for submission. …", "submissions" a link to the "Submissions" page) | no | Default: three paragraphs opening "Authors are invited to make a submission to this journal." ("…to this press."; on a preprint server "Researchers are invited to submit a preprint to be posted on this server.") and ending "…please follow the checklist below to prepare your submission.". Where it shows: the "Submissions" page, under "Author Guidelines" (Rule 24) |
| "Before you begin" (help "The following is shown to authors before they begin their submission. …") | no | Default opening "Thank you for submitting to the {journal name}." (a preprint server: "Thank you for posting your preprint at {server name}."), with a "Submission Guidelines" link to the "Submissions" page. Where it shows: the "Make a Submission" start form ([Submission wizard](U21-submission-wizard.md), Fields) |
| "Submission Checklist" (help "The following is shown to authors when they begin their submission. Authors are asked to confirm that their submission complies with any requirements specified here before beginning their submission.") | no | Default: "All submissions must meet the following requirements." and five items, the first "This submission meets the requirements outlined in the Author Guidelines." with "Author Guidelines" a link to the "Submissions" page. Where it shows: the start form's confirmation ([Submission wizard](U21-submission-wizard.md), Fields) and the "Submissions" page, under "Submission Preparation Checklist" (Rule 24) |
| "Upload Files" (help "The following is shown to authors during the upload files step. …") | no | Default: see [Submission files](U36-submission-files.md), Settings. Where it shows: the wizard's "Upload Files" step |
| "Contributors" (help "The following is shown to authors during the contributors step. …") | no | Default opening "Add details for all of the contributors to this submission.". Where it shows: the wizard's "Contributors" step |
| "Details" (help "The following is shown to authors during the details step, …") | no | Default "Please provide the following details to help us manage your submission in our system.". Where it shows: the wizard's "Details" step |
| "For the Editors" ("For Readers" on a preprint server [OPS1](#ops1); help "The following is shown to authors during the For the Editors step, …") | no | Default opening "Please provide the following details in order to help our editorial team manage your submission." (a preprint server: "…in order to help readers discover your preprint."). Where it shows: the wizard's "For the Editors" ("For Readers") step |
| "Review and Submit" (help "The following is shown to authors during the final step of the submission wizard, …") | no | Default opening "Review the information you have entered before you complete your submission.". Where it shows: the wizard's "Review" step |
| "Copyright Notice" ("Copyright notice" on a press, [OMP1](#omp1); help "The following appears on the submissions page where authors will learn about the requirements for submission. Authors will be required to confirm that they agree with the copyright notice before their submission is complete.", "submissions" a link to the "Submissions" page) | no | Empty on a new journal. Where it shows: the wizard's "Review" step, with the box "Yes, I agree to the copyright statement." ([Submission wizard](U21-submission-wizard.md), Rules 12, 14), and the "Submissions" page, under "Copyright Notice" (Rule 24) |
| "For Reviewer Suggestion" {OJS OMP} (help "The following is shown to authors during the reviewer suggestions step. Provide a brief explanation of what information the author should provide about themselves, co-authors, and any other contributors." ⚠ [A7](#a7)) | no | Default opening "When submitting, you have the option to suggest several potential reviewers.". Where it shows: the wizard's "Reviewer Suggestions" step, when the journal asks for suggestions ([Reviewer suggestions](U31-reviewer-suggestions.md#step)) |

**"Metadata" tab.** One section per item, in this order. An item is
either a heading with a box "Enable {item} metadata" and, once ticked,
three choices under it (Rule 10), or a heading with its own boxes or
choices. The three choices follow one pattern, shown here for "Keywords":
"Do not request keywords from the author during submission.", "Ask the
author to suggest keywords during submission.", "Require the author to
suggest keywords before accepting their submission.". "Where it takes
effect" names the feature that describes the item's field (Rule 12). <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Plain Language Summary": box "Enable plain language summary metadata" | no | Unticked on a new journal. Where it takes effect: [Publication metadata](U40-publication-metadata.md) |
| "Keywords": box "Enable keyword metadata" | no | Ticked on a new journal, with "Ask the author to suggest keywords during submission.". Publication metadata |
| "Subjects", "Disciplines", "Supporting Agencies", "Coverage", "Rights", "Source": boxes "Enable subject metadata", "Enable disciplines metadata", "Enable supporting agencies metadata", "Enable coverage metadata", "Enable rights metadata", "Enable source metadata" | no | Unticked on a new journal. Publication metadata |
| "Type": box "Enable type metadata" | no | Unticked on a new journal or preprint server; ticked on a new press, with "Do not request the type from the author during submission." [OMP3](#omp3). Publication metadata <sup>td3</sup> |
| "Competing Interests": box "Require submitting Authors to file a Competing Interest (CI) statement with their submission." | no | Unticked on a new journal. Where it takes effect: [Contributors & affiliations](U41-contributors-and-affiliations.md), Settings |
| "References": box "Enable references metadata" | no | Ticked on a new journal, with "Ask the author to provide references during submission.". [Citations & references](U42-citations-and-references.md), Settings |
| "References Metadata Lookup": box "Enable references structuring and metadata lookup" | no | Shown only while "Enable references metadata" is ticked (Rule 11). Unticked on a new journal. Citations & references |
| "Funding Statement": box "Enable funding statement metadata" | no | Unticked on a new journal. Publication metadata |
| "Funders": box "Enable funder metadata" | no | Ticked on a new journal, with "Ask the author for funder metadata during submission.". [Funding](U43-funding.md), Settings |
| "Funder Grant ID validation" (help "Enable grant ID validation for supported funders (using the Zenodo API)."): box "Enable Grant ID validation." | no | Shown only while "Enable funder metadata" is ticked (Rule 11). Unticked on a new journal. Funding |
| "Data Availability Statement": box "Enable data availability statement metadata" | no | Unticked on a new journal. Publication metadata |
| "Data Citations": box "Enable data citation metadata" | no | Unticked on a new journal. Citations & references |
| "Categories" (help "Should the submitting author be asked to select a category when they make a new submission?"): choices "Yes, add a categories field to the submission wizard." and "No, do not show authors this field." | yes (one is always chosen) | "No" on a new journal. Where it takes effect: [Categories](U16-categories.md), Settings bullet 1 |
| "Publisher ID" (help "The publisher ID may be used to record the ID from an external database. …"): one box per kind of item, "Enable for Publications", "Enable for Galleys", "Enable for Issues", "Enable for Issue Galleys" (a press: "Enable for Monographs", "Enable for Chapters", "Enable for Publication Formats", "Enable for Files"; a preprint server: "Enable for Preprints", "Enable for Galleys") | no | None ticked on a new journal. Where it takes effect: [Identifiers](U44-identifiers.md), Settings bullet 1 |
| "Article Number" {OJS} (help "The article number can be used in citations and other metadata instead of page numbers."): box "Enable article number metadata" | no | Unticked on a new journal. Publication metadata |

**"Components" tab.** A list titled "Article Components" ("Monograph
Components" on a press, "Preprint Components" on a preprint server) with
one column of names (its heading, "Name", is read out by screen readers
only) and above it, left to right, the buttons "Order", "Add a Component"
and "Restore Defaults". With the interface in French, a press's and a
preprint server's list shows raw text keys in place of its heading and
of some names ⚠ [A9](#a9). Each row opens, from the arrow at its start
(a screen reader hears "Settings"), the links "Edit" and "Delete". A new
journal's list, in order: "Article Text", "Research Instrument", "Research
Materials", "Research Results", "Transcripts", "Data Analysis", "Data Set",
"Source Texts", "Multimedia", "Image", "HTML Stylesheet", "Other"; a
preprint server's is the same with "Preprint Text" first; a press has its
own fifteen, from "Appendix" to "Other" [OMP3](#omp3). <sup>f</sup>

"Add a Component" and a row's "Edit" open a window ("Add a Component",
"Edit") with these fields, "Cancel" and "Save", and the note "Required
fields are marked with an asterisk: *". <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name" | yes | Text, one box per form language, at most 80 characters (the box takes no more). Saved empty, the window stays open with "This field is required." under the box. A name of only spaces is refused with a raw text key ⚠ [A10](#a10) <sup>td4</sup> |
| "File Type": box "These are dependent files, such as images displayed by a HTML file, and will not be displayed with published content." | no | Ticked at install on "Multimedia", "Image" and "HTML Stylesheet" ("Image" and "HTML Stylesheet" on a press). Unticked in a new component's window |
| "File Type": box "These are supplementary files, such as data sets and research materials, and will be displayed separately from the main publication files." | no | Ticked at install on "Research Instrument" through "Source Texts", "Multimedia" and "Other" on a journal or preprint server, "Multimedia" thus arriving with both "File Type" boxes ticked ⚠ [A4](#a4); on a press on "Appendix", "Bibliography", "Glossary", "Index", "Preface", "Prospectus", "Table", "Figure", "Photo", "Illustration" and "Other". Unticked in a new component's window |
| "File Variants": box "These files support file variants types, such as 'web' or 'high resolution' images." | no | Ticked at install on "Image" alone |
| "File Metadata" (help "Select the type of metadata that these files may receive. …"): list "Document", "Artwork", "Supplementary Content" | yes (one is always chosen) | "Document" in a new component's window. The install values are listed in [Submission files](U36-submission-files.md), Settings |
| "Require with Submissions" (help "Should at least one of these files be required with every new submission? If you select yes, authors will not be allowed to submit until they have uploaded at least one file of this type."): choices "Yes, require submitting authors to upload one or more of these files." and "No, allow new submissions without these files." | yes (one is always chosen) | "Yes" at install on "Article Text" ("Book Manuscript", "Preprint Text") alone; "No" in a new component's window |
| "Key" (help "An optional short symbolic identifer for this genre." ⚠ [A8](#a8)) | no | At most 30 characters (the box takes no more). Letters, digits, hyphens and underscores, starting and ending with a letter or digit; anything else is refused with "The key can contain only alphanumeric characters, underscores, and hyphens, and must begin and end with an alphanumeric character.". A key another component of the journal already carries is refused with "The key already exists." (Rule 16). Shown but not editable on the components a new journal arrives with, which carry fixed keys |

**About › "Submissions" page**, top to bottom. Each part after the notice
shows only while its text is not empty. <sup>j</sup>

| Part | Shown when | Content |
|------|------------|---------|
| Breadcrumb "Home" › "Submissions", heading "Submissions" | always | — |
| Notice line | always | One of three sentences (Rule 23) |
| "Author Guidelines" | the "Author Guidelines" text is set | The text; "Edit" for managers (Rule 25) |
| "Submission Preparation Checklist" | the "Submission Checklist" text is set | The text; "Edit" for managers |
| One block per section with a policy {OJS OPS} | [Sections](U17-sections.md#about-submissions), Rule 12 | The section's title and policy; signed in, also "Make a new submission to the {section} section.", the section name a link to the start screen ([Sections](U17-sections.md#a1)) |
| "Copyright Notice" | the "Copyright Notice" text is set | The text; "Edit" for managers |
| "Privacy Statement" | the journal's privacy statement is set (Settings › Website › "Setup" › "Privacy Statement") | The text; "Edit" for managers |

## Rules & state

**The screen**

1. **Where it is.** The side menu's "Settings" › "Workflow" opens
   "Workflow Settings" on its first tab, "Submission", with the
   "Disable Submissions" side tab open; for the "Submissions" page's
   "Edit" links, see Rule 25. The page address follows what was last
   pressed, and a reload opens what it names:
   <sup>a</sup>
   - 1a. Pressing a side tab shows it and puts its name in the address.
     A reload keeps that side tab ("Disable Submissions", "Author
     Guidance", "Metadata", "Components" and "Contributor Roles" alike).
     An address naming a side tab, typed or bookmarked, opens it too.
   - 1b. After pressing another tab of the page ("Review"; on a preprint
     server "Preprint Server Library") and then "Submission" again, the
     side tab that was open shows again, but the address names only
     "Submission": a reload then opens "Disable Submissions". Pressing a
     side tab again makes the reload keep it (1a).
   - 1c. A reload on a side tab of the page's "Review" tab lands on
     "Submission" › "Disable Submissions" instead
     ([Review setup & review forms](U29-review-setup-and-review-forms.md#a4)).
2. **Saving a tab.** "Save" on "Disable Submissions", "Author Guidance"
   or "Metadata" stores that tab's fields alone; "Saving" and then "Saved"
   show beside the button, with no page notice. <sup>c</sup> <sup>d</sup>
   - 2a. A change not saved stays while the user moves to another side
     tab and back: text typed, a box ticked or unticked, a choice made
     (the "Publisher ID" boxes included). Boxes and choices on
     "Metadata" and "Disable Submissions" also stay through another tab
     of the page and back; typed text was not tried that way.
   - 2b. Leaving the page or reloading it drops every unsaved change
     without any warning: the tabs show the saved values again, as on
     every Settings page
     ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
     Rule 5). <sup>c</sup>
3. **Languages.** While the journal uses more than one language for its
   forms, each "Author Guidance" box and a component's "Name" take one
   text per language. The "Author Guidance" form has one language button
   (for example "French") at its top; pressing it shows every box's
   second-language text, and each box carries a line such as "2/2
   languages completed". A component's "Name" shows its second-language
   box while the first box is focused. The "Submissions" page shows the
   text of the language the visitor reads the site in
   ([Languages & locales](U57-languages-and-locales.md#form-languages);
   the fallback to the primary language is
   [Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Rule 11). <sup>d</sup>

**Open or closed**

4. **Not accepting submissions.** Once "Disable Submissions" is ticked
   and saved, the journal is not accepting submissions: <sup>c</sup>
   - 4a. "Start A New Submission" is gone from the side menu from the
     next page load; the settings page that was saved keeps it
     until it is loaded again ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
     Rule 30). <sup>td1</sup>
   - 4b. The "Make a Submission" start screen, opened by its address,
     shows only a notice and refuses to start a submission
     ([Submission wizard](U21-submission-wizard.md), Rule 2).
   - 4c. Settings › Journal, Website, Workflow and Distribution show the
     notice "This journal is not accepting submissions at this time.
     Visit the workflow settings to allow submissions." above their tabs
     ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
     Rule 4a).
   - 4d. The "Submissions" page's notice line reads the not-accepting
     sentence for everyone (Rule 23c).
   - 4e. A submission already started can still be finished and
     submitted ([Submission wizard](U21-submission-wizard.md#a1)).
   - 4f. Nothing else changes: sections keep their own settings, and the
     reader site's "Make a Submission" block {OJS OMP}, where a manager
     has switched it on and placed it (it is off on a new journal or
     press), still links to the "Submissions" page.
5. **Accepting again.** Unticking the box and saving brings back the side
   menu entry, the start form and the "Submissions" page's invitation from
   the next page load. <sup>c</sup>
6. **Closing one section instead.** The help's "journal sections" link
   ("press series", "server sections") opens Settings › Journal ›
   "Sections" ("Series" on a press), where a single section can be
   deactivated or kept for editors ([Sections](U17-sections.md)). <sup>c</sup>

**Author guidance**

7. **Where the texts show.** Each "Author Guidance" box feeds the screen
   named in its Fields row from the next time that screen is loaded. A
   start form or wizard already open keeps the earlier texts, on every
   step reached with "Continue", until it is reloaded. The "Submissions"
   page is this spec's (Rule 24); the start form and the
   wizard steps are the [Submission wizard](U21-submission-wizard.md)'s,
   and the reviewer suggestions step is
   [Reviewer suggestions](U31-reviewer-suggestions.md#step)'. <sup>d</sup>
8. **An emptied box.** A box saved empty removes its text from where it
   shows: its part leaves the "Submissions" page, and the start form or
   step shows no text. An empty "Submission Checklist" also removes the
   start form's confirmation, and an empty "Copyright Notice" the Review
   step's ([Submission wizard](U21-submission-wizard.md), Fields). <sup>d</sup>
9. **Defaults.** A new journal arrives with a text in every box but
   "Copyright Notice" (Fields). The default "Before you begin" and
   "Submission Checklist" link to the journal's "Submissions" page by its
   full address as it was when the journal was created ⚠ [A11](#a11).
   On the start
   form, the "Submission Guidelines" link opens that page in a new tab and
   the checklist's "Author Guidelines" link in the same tab. The default
   "Author Guidelines" closes by pointing at the checklist under it.
   <sup>d</sup>

**Metadata**

10. **Box and choices.** Ticking an item's "Enable … metadata" box shows
    its three choices with "Do not request …" selected; unticking hides
    them. An item unticked and ticked again starts at "Do not request …",
    whatever was chosen before. After "Save" and a reload the tab shows
    the saved boxes and choices. <sup>e</sup> <sup>td2</sup>
11. **Boxes that depend on another.** "References Metadata Lookup" shows
    only while "Enable references metadata" is ticked, and "Funder Grant
    ID validation" only while "Enable funder metadata" is ticked. <sup>e</sup>
12. **Where an item takes effect.** Ticked, an item's field appears on
    the submission's publication pages (the feature named in its Fields
    row). Its choice decides the wizard alone: "Ask …" adds the field to
    the wizard, "Require …" also makes it a submit blocker
    ([Submission wizard](U21-submission-wizard.md#submit-gates), Rules 7
    and 13). The one exception is "Plain Language Summary", whose
    "Require …" also holds on every later save of the publication
    ([Publication metadata](U40-publication-metadata.md#a1)). This spec
    owns only the tab. <sup>e</sup>

**Components**

13. **The list.** Rows stand in the journal's component order (Rule 19).
    A component's "Name" is the word authors and editors see wherever a
    file's component is chosen or shown. <sup>f</sup>
14. **Adding.** "Add a Component" opens an empty window (Fields); "Save"
    closes it and adds the row. The new component lands at the top of the
    list, sharing first place with the first component, in no fixed order
    between the two ⚠ [A1](#a1). <sup>f</sup>
15. **Editing.** A row's "Edit" opens the window filled with the
    component's saved values; "Save" replaces them and closes it, with no
    notice. "Cancel" closes the window and drops any change without
    asking. The window's "Close" after a change asks "The data on this
    form has changed. Do you wish to continue without saving?", and
    leaving the page asks the browser's leave-page question.
    <sup>f</sup> <sup>td13</sup>
16. **Refused saves.** An empty "Name", a malformed "Key" and a "Key"
    already taken are refused with the messages in Fields, the window
    staying open. Only the empty "Name" is flagged under its box; the two
    "Key" refusals show as a notice with a "×" at the top right of the
    window. While the window is open, a press on the "×" does nothing
    ⚠ [A13](#a13); the notice leaves by itself after about five seconds.
    A key counts as taken while any component of the journal carries it,
    a deleted one included [A3](#a3). <sup>f</sup> <sup>td5</sup>
17. **Deleting.** A row's "Delete" asks, in a window titled "Delete",
    "Are you sure you wish to delete this item? This action cannot be
    undone." with "OK" and "Cancel". <sup>h</sup>
    - 17a. While any file of any submission carries the component, "OK"
      is answered by a browser pop-up reading "Before this component can
      be deleted, you must associate all related submission files with a
      different component." and the row stays. Once the pop-up is closed,
      the confirmation stays open with a spinning indicator until "Cancel"
      is pressed ⚠ [A12](#a12). <sup>td6</sup>
    - 17b. Otherwise the row leaves the list, and the component is no
      longer offered when a file is uploaded or edited
      ([Submission files](U36-submission-files.md), Settings). The
      "Media" page (workflow › "Publication" ("Preprint") › version ›
      "Media") still offers a deleted dependent component as a media
      type ⚠ [A2](#a2). <sup>td8</sup>
    - 17c. A deleted component of the install's list comes back with
      "Restore Defaults" (Rule 18), and its key stays taken ⚠ [A3](#a3).
18. **Restore Defaults.** The button asks "Are you sure you wish to
    restore the defaults?". Confirmed, every component the journal arrived
    with is back in the list, deleted ones included, with its install name
    in each form language, its install boxes and choices, and its install
    place. Components the journal added stay, with their own settings,
    sharing first place with the first install component [A1](#a1).
    <sup>g</sup> <sup>td7</sup>
19. **Order.** "Order" works as on the Sections tab
    ([Sections](U17-sections.md#order), Rule 4a): the rows become drag
    handles, and "Done" keeps the new order while "Cancel ordering" puts
    the rows back. The order is the order in which the upload lists offer
    the components ([Submission files](U36-submission-files.md)). <sup>f</sup>
20. **What a component's settings decide.** Its "File Type" boxes, "File
    Variants", "File Metadata" and "Require with Submissions" take effect
    in the upload wizard and file lists
    ([Submission files](U36-submission-files.md), Settings), on the
    "Media" page ([Media files](U47-media-files.md), Settings bullets 1–3),
    in the galley upload ([Galleys](U46-galleys.md)), on the article page
    ([Article landing page & reading](U13-article-landing-page-and-reading.md),
    Settings bullet 11) and at submit
    ([Submission wizard](U21-submission-wizard.md#submit-gates)). <sup>f</sup>

**Author screening** {OPS}

21. **The "Author Screening" tab.** A preprint server shows this side tab,
    after "Contributor Roles", only while an installed plugin supplies
    screening rules.
    The tab is a table listing each rule, with nothing to change (no screen on a standard install shows it).
    No such plugin is installed with the application, so the tab does not
    appear on a standard preprint server [OPS2](#ops2). <sup>i</sup>

**The "Submissions" page**

22. **Ways in.** The page opens from the header's "About" › "Submissions"
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 12), from the reader site's "Make a Submission" block {OJS OMP}
    where it is switched on and placed
    ([Submission wizard](U21-submission-wizard.md#ways-in)), and at
    the journal's address followed by `/about/submissions`. <sup>j</sup>
23. **The notice line.** Under the heading sits one sentence: <sup>j</sup>
    <sup>k</sup>
    - 23a. Signed out: "Login or Register to make a submission.", where
      "Login" opens the Login page and "Register" the journal's Register
      page.
    - 23b. Signed in: "Make a new submission or view your pending
      submissions.". "Make a new submission" opens the "Make a
      Submission" start screen with "Begin Submission" for every
      signed-in user, a Reviewer and a user holding only the Reader role
      included ([Submission wizard](U21-submission-wizard.md#ways-in)).
      "view your pending submissions" opens the user's own landing
      screen: <sup>td9</sup>
      - the Dashboard's "Assigned to me" for the Site Administrator, the
        manager-level roles, a Section Editor and an assistant role;
      - the reviewer dashboard's "Action Required by me" for a Reviewer
        {OJS OMP}, also one who is an Author too;
      - "My Submissions" ("Active submissions") for an Author;
      - the access-denied page for a user holding no role but Reader
        [A5](#a5). On a preprint server, opening the start screen makes
        such a user an Author, and the link then opens "My Submissions"
        ([Submission wizard](U21-submission-wizard.md#ops2)).
    - 23c. While the journal is not accepting submissions (Rule 4):
      "This journal is not accepting submissions at this time." ("This
      press …", "This server …"), with no link, for everyone, managers
      included. A journal or preprint server shows the same sentence to a
      reader no section is open to
      ([Sections](U17-sections.md#not-accepting), Rule 13).
24. **The parts.** Under the notice the page shows, in order, "Author
    Guidelines", "Submission Preparation Checklist", the section policies
    {OJS OPS}, "Copyright Notice" and "Privacy Statement", each only while
    its text is set (Fields). On the seeded journal that is every part but
    "Copyright Notice". <sup>j</sup>
25. **"Edit" links.** The users of Actors row 7 see "Edit" beside the
    heading of every part but the section policies. Under "Author
    Guidelines", "Submission Preparation Checklist" and "Copyright
    Notice" it opens Settings › Workflow ›
    "Submission" › "Author Guidance"; on a press the link under "Copyright
    Notice" opens the "Submission" tab on "Disable Submissions" instead
    ⚠ [OMP2](#omp2). Under "Privacy Statement" it opens Settings › Website
    › "Setup" › "Privacy Statement". A manager-level role without "Permit
    changes to Settings" lands on the access-denied page. <sup>k</sup>
    <sup>td10</sup>
26. **Opened on a closed journal.** On a journal that requires visitors
    to sign in, a signed-out visitor gets the Login page instead
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 22), and after signing in there lands back on the "Submissions"
    page. <sup>j</sup>
27. **Whose privacy statement.** The "Privacy Statement" part is always
    the journal's own, also on an installation configured for one
    site-wide statement, where the journal's "Privacy Statement" page
    shows the site's ⚠ [A6](#a6). <sup>j</sup>

**The programming interface**

28. **Reading the components.** The install's programming interface lists
    a journal's components to the users of Actors row 8, the same list the
    "Media" page reads. The list includes deleted components, each marked
    as not enabled [A2](#a2). <sup>l</sup> <sup>td12</sup>

## Side effects

- **None beyond the screens.** No save on these tabs and no change to the
  "Components" list sends an email, raises a notification or task, or
  writes an Activity Log line. <sup>m</sup>
- **Deleting a component keeps it on file.** The component is hidden, not
  erased: its key stays taken and "Restore Defaults" can bring an
  install component back (Rules 16–18). <sup>h</sup>

## Settings that modify behavior

The tabs are themselves the settings other features read (Fields, Rules
7, 12, 20); the list below is what changes these screens and the
"Submissions" page.

1. **"Permit changes to Settings"** (Settings › Users & Roles › "Roles", a
   manager-level role's "Edit"; ticked on the Editor and Production
   Editor roles {OJS OMP}; the Journal Manager's own row has no "Edit", so
   its box cannot be changed). Unticked, the role loses these tabs and
   its "Edit" links on the "Submissions" page lead to the access-denied
   page (Actors rows 1, 7; Rule 25). <sup>b</sup>
2. **Form languages** (Settings › Website › "Setup" › "Languages", the
   "Forms" column; the primary language alone on a new journal). More
   than one: each "Author Guidance" box and a component's "Name" take one
   text per language (Rule 3). <sup>d</sup>
3. **"Privacy Statement"** (Settings › Website › "Setup" › "Privacy
   Statement"; a default text on a new journal). Emptied, the
   "Submissions" page has no "Privacy Statement" part (Rule 24). <sup>j</sup>
4. **Sections open to authors** {OJS OPS} (Settings › Journal ›
   "Sections"; every section open on a new journal). With none open to a
   reader, the notice line reads the not-accepting sentence for that
   reader (Rule 23c). <sup>j</sup>
5. **One site-wide privacy statement** (an installation configuration
   option; off). On, the journal's "Privacy Statement" page shows the
   site's statement while the "Submissions" page keeps the journal's
   (Rule 27). <sup>j</sup> <sup>f-a6</sup>
6. **A screening plugin** {OPS} (none installed with the application).
   Installed and supplying rules, it adds the "Author Screening" tab
   (Rule 21). <sup>i</sup> <sup>n</sup>
7. **"Users must be registered and log in to view the journal site."**
   ("… the press site.", "… the server site.") (Settings › Users & Roles
   › "Site Access Options"; unticked). Ticked, a signed-out visitor who
   opens the "Submissions" page gets the Login page (Rule 26). <sup>j</sup>

## Cross-feature interactions

- **[Submission wizard](U21-submission-wizard.md)**: the start form and
  the steps that show the "Author Guidance" texts, the closed-journal
  start screen and the drafts it lets finish (Rule 4), the submit gate on
  required components and required metadata. This spec owns the settings;
  the wizard owns what the author sees.
- **[Submission files](U36-submission-files.md)**: the upload wizard and
  file lists that offer the components and apply their boxes (Rule 20).
  **[Media files](U47-media-files.md)**, **[Galleys](U46-galleys.md)** and
  **[Article landing page & reading](U13-article-landing-page-and-reading.md)**:
  the dependent, variant and supplementary boxes.
- **[Publication metadata](U40-publication-metadata.md)**,
  **[Citations & references](U42-citations-and-references.md)**,
  **[Funding](U43-funding.md)**, **[Identifiers](U44-identifiers.md)**,
  **[Categories](U16-categories.md)** and
  **[Contributors & affiliations](U41-contributors-and-affiliations.md)**:
  each "Metadata" item's field (Fields). Contributors & affiliations also
  owns the "Contributor Roles" side tab.
- **[Reviewer suggestions](U31-reviewer-suggestions.md#step)**: the step
  that shows "For Reviewer Suggestion".
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  who opens the Settings pages, how their tabs save, the notice above the
  Settings pages while submissions are disabled, the header's "About"
  menu and the "Privacy Statement" tab and page.
- **[Sections](U17-sections.md#about-submissions)**: the section policies
  on the "Submissions" page and its notice when no section is open.
- **[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)**:
  the side menu's "Start A New Submission" and the look of the "Edit"
  links.
- **[Review setup & review forms](U29-review-setup-and-review-forms.md)**
  {OJS OMP}: the "Review" tab of the same Workflow Settings page (a
  preprint server has none).
- **[Languages & locales](U57-languages-and-locales.md#form-languages)**:
  the form languages and the default texts added with a language.
- **[Login & sessions](U01-login-and-sessions.md)** and
  **[Registration & account validation](U02-registration-and-account-validation.md)**:
  the pages the signed-out notice links to.
- **[Archiving & preservation](U67-archiving-preservation.md)** {OJS}: the journal's LOCKSS and CLOCKSS
  permission pages show a "Copyright" row while a copyright notice is
  set, filled with the License Terms rather than the notice ⚠ [OJS1](#ojs1).

## Canonical scenarios

Scenario 1 reads the seeded journal as it stands, signed out; every other
scenario runs on a scratch journal with throwaway accounts, because it
changes a setting or needs an account holding two roles, a draft or a
submission with a file. The accounts, their passwords and the tooling
recipe are in the footnote. <sup>s</sup>

1. **A visitor reads the "Submissions" page**

   Given: a visitor, signed out, on the seeded journal, which has no
   copyright notice.

   - **The page**: open the journal's home page and choose "Submissions"
     in the header's "About" menu: the page shows the breadcrumb "Home" ›
     "Submissions" and the heading "Submissions", and under it the line
     "Login or Register to make a submission." (Fields; Rules 22, 23a).
   - **The parts**: under that line, in this order, "Author Guidelines",
     opening "Authors are invited to make a submission to this journal."
     ("…to this press."; on a preprint server "Researchers are invited to
     submit a preprint to be posted on this server."); "Submission
     Preparation Checklist", opening "All submissions must meet the
     following requirements."; "Articles" ("Preprints"), reading "Section
     default policy" {OJS OPS}; and "Privacy Statement" (Fields; Rule 24).
   - **"Login"**: press "Login" in the line under the heading: the Login
     page opens. Go back (Rule 23a).
   - **"Register"**: press "Register" in the same line: the journal's
     Register page opens (Rule 23a).
   - **Control**: the page has no "Copyright Notice" part and no "Edit"
     link beside any heading (Actors row 7; Rules 24, 25). <sup>s</sup>

2. **Each role's links on the "Submissions" page**

   Given: a scratch journal with the texts a new journal arrives with and
   no copyright notice, and one throwaway account per role: a Journal
   Manager, a Section Editor, an assistant, an Author, a Reviewer
   {OJS OMP}, an account holding both the Author and the Reviewer role
   {OJS OMP}, and a Reader.

   - **The Journal Manager's page**: sign in as the Journal Manager and
     open the header's "About" › "Submissions": the line under the
     heading reads "Make a new submission or view your pending
     submissions.", and "Edit" sits beside the headings "Author
     Guidelines", "Submission Preparation Checklist" and "Privacy
     Statement", and not beside "Articles" ("Preprints") {OJS OPS} (Rules
     23b, 25).
   - **The Journal Manager's "Edit" links**: press "Edit" beside "Author
     Guidelines": Settings › Workflow › "Submission" opens on its side tab
     "Author Guidance". Go back and press "Edit" beside "Submission
     Preparation Checklist": "Author Guidance" again. Go back and press
     "Edit" beside "Privacy Statement": Settings › Website › "Setup" ›
     "Privacy Statement" opens (Rule 25).
   - **The Journal Manager's pending submissions**: on the "Submissions"
     page press "view your pending submissions": the Dashboard opens on
     "Assigned to me" (Rule 23b).
   - **The Section Editor and the assistant**: each signs in in turn and
     opens the "Submissions" page: the same line under the heading, and no
     "Edit" beside any heading. "view your pending submissions" opens the
     Dashboard on "Assigned to me" (Actors row 7; Rules 23b, 25).
   - **The Author's page**: sign in as the Author and open the
     "Submissions" page: the same line under the heading, and no "Edit"
     beside any heading. Press "view your pending submissions": "My
     Submissions" opens on "Active submissions". Go back and press "Make a
     new submission": the "Make a Submission" start screen opens with
     "Begin Submission" (Actors rows 6, 7; Rules 23b, 25).
   - **The Author reads the components**: still as the Author, open the
     journal's components in the programming interface (the address is in
     the footnote): it lists the journal's components, "Article Text"
     ("Book Manuscript" on a press, "Preprint Text" on a preprint server)
     among them (Actors row 8; Rule 28).
   - **The Reviewer** {OJS OMP}: sign in as the Reviewer and open the
     "Submissions" page: the same line under the heading, and no "Edit"
     beside any heading. Press "view your pending submissions": the
     reviewer dashboard opens on "Action Required by me". Go back and
     press "Make a new submission": the start screen opens with "Begin
     Submission". Open the components' address: it refuses the Reviewer,
     listing no component (Actors rows 7, 8; Rules 23b, 25, 28).
   - **The Author who is also a Reviewer** {OJS OMP}: sign in with that
     account, open the "Submissions" page and press "view your pending
     submissions": the reviewer dashboard opens on "Action Required by me"
     (Rule 23b).
   - **Control**: sign in as the Reader and open the "Submissions" page:
     the line under the heading reads "Make a new submission or view your
     pending submissions.", no "Edit" sits beside any heading, and the
     components' address refuses the Reader, listing no component (Actors
     rows 7, 8; Rules 23b, 25, 28). <sup>s</sup>

3. **Author guidance on the "Submissions" page and in the wizard**

   Given: Journal Manager, on a scratch journal with the texts a new
   journal arrives with and no copyright notice, a visitor, signed out,
   on its "Submissions" page in a second browser, and a throwaway Author,
   signed in in a third, with a draft open at its "Upload Files" step.

   - **"Workflow Settings"**: in the side menu choose "Settings" ›
     "Workflow": the page "Workflow Settings" opens on its tab
     "Submission" with the side tab "Disable Submissions" open. The side
     tabs read "Disable Submissions", "Author Guidance", "Metadata",
     "Components" and "Contributor Roles"; a preprint server shows no
     "Author Screening" [OPS2](#ops2) (Fields; Rules 1, 21).
   - **"Author Guidance"**: press it: "Author Guidelines" opens "Authors
     are invited to make a submission to this journal." ("…to this
     press."; on a preprint server "Researchers are invited to submit a
     preprint to be posted on this server."), and "Copyright Notice"
     [OMP1](#omp1) is empty. A journal and a press show a "For Reviewer
     Suggestion" box; a preprint server shows "For Readers" where a
     journal shows "For the Editors", and no "For Reviewer Suggestion"
     [OPS1](#ops1) (Fields).
   - **A reload**: reload the page: "Author Guidance" is still the open
     side tab (Rule 1).
   - **Typed, not saved**: replace the text of "Author Guidelines" with
     Unsaved guidance, press the side tab "Metadata" and then "Author
     Guidance" again: the box still holds Unsaved guidance. The visitor
     reloads: "Author Guidelines" still opens "Authors are invited to make
     a submission to this journal.". Reload the settings page: nothing
     asks first, and "Author Guidelines" opens "Authors are invited to
     make a submission to this journal." again (Rules 2, 7).
   - **Texts saved**: replace the text of "Author Guidelines" with Send
     your manuscript as a Word file, of "Before you begin" with Read the
     guidelines first, of "Submission Checklist" with The manuscript is
     anonymised, and of "Upload Files" with Upload the manuscript and its
     figures; type Authors keep the copyright of their work in "Copyright
     Notice" and press "Save": "Saving" and then "Saved" show beside the
     button, with no notice on the page (Rule 2).
   - **The visitor's page**: the visitor reloads the "Submissions" page:
     "Author Guidelines" reads Send your manuscript as a Word file,
     "Submission Preparation Checklist" reads The manuscript is
     anonymised, and a "Copyright Notice" part reading Authors keep the
     copyright of their work now stands between "Articles" ("Preprints")
     {OJS OPS} and "Privacy Statement" (Rules 7, 24).
   - **The Author's open draft**: the Author's "Upload Files" step, open
     since before the save, does not show Upload the manuscript and its
     figures. The Author reloads it: the step shows Upload the manuscript
     and its figures (Rule 7).
   - **The Author's start screen**: the Author opens the "Submissions"
     page and presses "Make a new submission": the "Make a Submission"
     start screen shows Read the guidelines first and, in its
     confirmation, The manuscript is anonymised (Fields; Rule 7).
   - **"Edit" beside "Copyright Notice"** {OJS OPS}: open the
     "Submissions" page and press "Edit" beside "Copyright Notice":
     Settings › Workflow › "Submission" opens on "Author Guidance". A
     press opens another side tab [OMP2](#omp2) (Rule 25).
   - **"Author Guidelines" emptied**: on "Author Guidance", delete the
     whole text of "Author Guidelines" and press "Save": "Saved". The
     visitor reloads: the page has no "Author Guidelines" part, and
     "Submission Preparation Checklist" is the first part on it (Rules 8,
     24).
   - **"Privacy Statement" emptied**: open Settings › Website › "Setup" ›
     "Privacy Statement", delete its whole text and press "Save". The
     visitor reloads: the page has no "Privacy Statement" part (Rule 24;
     Settings bullet 3).
   - **Control**: the same reload still shows "Submission Preparation
     Checklist" and "Copyright Notice", whose texts are set (Rule 24).
     <sup>s</sup>

4. **Not accepting submissions**

   Given: Journal Manager, on a scratch journal accepting submissions,
   with the "Make a Submission" block switched on and placed in its
   sidebar {OJS OMP}, a visitor, signed out, in a second browser, and a
   throwaway Author, signed in in a third.

   - **Accepting**: the visitor opens the journal's "Submissions" page:
     the line under the heading reads "Login or Register to make a
     submission.". The Author opens it: "Make a new submission or view
     your pending submissions." (Rules 23a, 23b).
   - **"Disable Submissions"**: open Settings › Workflow: the side tab
     "Disable Submissions" shows a heading and a box of that name,
     unticked. Tick the box and press "Save": "Saving" and then "Saved"
     (Fields; Rules 2, 4).
   - **The visitor's page**: the visitor reloads the "Submissions" page:
     the line under the heading reads "This journal is not accepting
     submissions at this time." ("This press …", "This server …"), with
     no link (Rules 4d, 23c).
   - **The Author's page**: the Author reloads it: the same sentence, with
     no link (Rule 23c).
   - **The Journal Manager's page**: open the header's "About" ›
     "Submissions": the same sentence (Rule 23c).
   - **The block** {OJS OMP}: the visitor opens the journal's home page
     and follows the link in the sidebar's "Make a Submission" block: the
     "Submissions" page opens, with the same sentence (Rules 4f, 22).
   - **Accepting again**: on Settings › Workflow › "Disable Submissions",
     untick the box and press "Save": "Saved". The visitor reloads the
     "Submissions" page: "Login or Register to make a submission.". The
     Author reloads it: "Make a new submission or view your pending
     submissions." (Rule 5).
   - **Control**: while submissions were disabled, the visitor's page
     still showed "Author Guidelines", "Submission Preparation Checklist"
     and "Privacy Statement" under the sentence (Rules 4f, 24).
     <sup>s</sup>

5. **The "Metadata" tab**

   Given: Journal Manager, on a scratch journal at the install's
   "Metadata" settings.

   - **The tab**: open Settings › Workflow › "Submission" and press the
     side tab "Metadata": under "Keywords", "Enable keyword metadata" is
     ticked with "Ask the author to suggest keywords during submission."
     selected; under "Subjects", "Enable subject metadata" is unticked,
     with no choices under it. On a press, "Enable type metadata" is
     ticked with "Do not request the type from the author during
     submission." selected [OMP3](#omp3) (Fields).
   - **An item ticked**: tick "Enable subject metadata": three choices
     show under it, "Do not request …" selected (Rule 10).
   - **Unticked and ticked again**: under "Keywords" choose "Require the
     author to suggest keywords before accepting their submission.", then
     untick "Enable keyword metadata": its three choices are gone. Tick it
     again: the choices are back with "Do not request keywords from the
     author during submission." selected (Rule 10).
   - **Saved**: choose "Require the author to suggest keywords before
     accepting their submission." again and press "Save": "Saving" and
     then "Saved" (Rule 2).
   - **After a reload**: reload the page: "Metadata" is still the open
     side tab; "Enable subject metadata" is ticked with "Do not request …"
     selected, and "Enable keyword metadata" with "Require the author to
     suggest keywords before accepting their submission." (Rules 1, 10).
   - **Boxes that depend on another**: untick "Enable references
     metadata": "References Metadata Lookup" is gone; tick it again: it is
     back. Untick "Enable funder metadata": "Funder Grant ID validation" is
     gone; tick it again: it is back (Rule 11).
   - **Control**: "Enable coverage metadata", never touched, is still
     unticked after the reload (Fields). <sup>s</sup>

6. **Add and edit a component**

   Given: Journal Manager, signed in in two browsers, on a scratch journal
   with the install's components.

   - **The list**: open Settings › Workflow › "Submission" and press the
     side tab "Components": a list titled "Article Components"
     ("Monograph Components" on a press, "Preprint Components" on a
     preprint server), with the buttons "Order", "Add a Component" and
     "Restore Defaults" above it, left to right. Its rows run from
     "Article Text" to "Other" ("Preprint Text" first on a preprint
     server; on a press from "Appendix" to "Other" [OMP3](#omp3)) (Fields).
   - **"Add a Component"**: press it: a window titled "Add a Component"
     with an empty "Name", both "File Type" boxes unticked, "File
     Metadata" at "Document", "Require with Submissions" at "No, allow new
     submissions without these files.", the note "Required fields are
     marked with an asterisk: *", and "Cancel" and "Save" (Fields).
   - **An empty "Name"**: press "Save": "This field is required." shows
     under "Name", and the window stays open (Rule 16).
   - **A malformed "Key"**: type Survey Forms in "Name" and -survey in
     "Key", and press "Save": a notice at the window's top right reads
     "The key can contain only alphanumeric characters, underscores, and
     hyphens, and must begin and end with an alphanumeric character.",
     and the window stays open. The notice leaves by itself after about
     five seconds [A13](#a13) (Rule 16).
   - **Added**: replace the "Key" with SURVEY and press "Save": the window
     closes, and the list gains the row "Survey Forms" [A1](#a1) (Rule
     14).
   - **A taken "Key"**: press "Add a Component", type Survey Data in
     "Name" and SURVEY in "Key", and press "Save": a notice at the
     window's top right reads "The key already exists.", and the window
     stays open. Replace the "Key" with SURVEY-DATA and press "Save": the
     window closes, and the list gains "Survey Data" (Rule 16).
   - **Edited**: open the arrow at the start of the "Survey Forms" row
     and press "Edit": a window titled "Edit" shows "Survey Forms" in
     "Name" and SURVEY in "Key". Replace the name with Survey Instruments
     and press "Save": the window closes with no notice, and the row reads
     "Survey Instruments" (Rule 15).
   - **An install component**: open the "Edit" window of "Article Text"
     ("Book Manuscript", "Preprint Text"): its "Key" is shown but cannot
     be changed, and "Require with Submissions" is at "Yes, require
     submitting authors to upload one or more of these files." (Fields).
   - **"Cancel" after a change**: in the same window replace the name with
     Main Text and press "Cancel": the window closes without asking, and
     the row still reads "Article Text" (Rule 15).
   - **"Close" after a change**: open the "Edit" window of "Survey
     Instruments", replace the name with Surveys and press the window's
     "Close": it asks "The data on this form has changed. Do you wish to
     continue without saving?" (Rule 15).
   - **Control**: in the second browser, open the same list: "Survey
     Instruments" and "Survey Data" each stand once, and no row reads
     "Survey Forms" or "Main Text" (Rules 15, 16). <sup>s</sup>

7. **Delete a component, restore the defaults and order the list**

   Given: Journal Manager, on a scratch journal with an added component
   "Field Notes" and a submission one of whose files carries "Data Set"
   ("Index" on a press; on a preprint server, a galley carrying "Data
   Set"), and a throwaway Author, signed in in a second browser, with a
   draft open at its "Upload Files" step.

   - **A delete refused**: on Settings › Workflow › "Submission" ›
     "Components", open the arrow at the start of the "Data Set" row and
     press "Delete": a window titled "Delete" asks "Are you sure you wish
     to delete this item? This action cannot be undone." with "OK" and
     "Cancel". Press "OK": a browser pop-up reads "Before this component
     can be deleted, you must associate all related submission files with
     a different component.". Close the pop-up and press "Cancel" in the
     "Delete" window [A12](#a12): "Data Set" is still listed (Rules 17,
     17a).
   - **Deleted**: open the arrow at the start of the "Transcripts" row
     ("Prospectus" on a press), press "Delete" and, in the window, "OK":
     the row leaves the list (Rule 17b).
   - **The Author's upload**: the Author reloads the draft and uploads a
     file on "Upload Files": "Transcripts" ("Prospectus") is not among
     the components offered for it (Rule 17b).
   - **An install component renamed**: open the "Edit" window of "Other",
     replace the name with Other Files and press "Save": the row reads
     "Other Files" (Rule 15).
   - **"Restore Defaults"**: press it: it asks "Are you sure you wish to
     restore the defaults?"; confirm it. "Transcripts" is back between
     "Research Results" and "Data Analysis" ("Prospectus" between
     "Preface" and "Table" on a press), "Other Files" reads "Other" again,
     and "Field Notes" is still listed [A1](#a1) (Rules 17c, 18).
   - **Ordering cancelled**: press "Order": the rows become drag handles.
     Drag "Other" to the top of the list and press "Cancel ordering": the
     rows are back as they were, "Other" last (Rule 19).
   - **Ordering done**: press "Order" again, drag "Other" to the top and
     press "Done": "Other" is the first row. Reload the page: "Other" is
     still first (Rule 19).
   - **Control**: after the reload, "Data Set", whose delete was refused,
     is still listed (Rule 17a). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a reload opening "Disable Submissions" after another tab of the
    page and back (Rule 1b): scenario 3 reloads on a side tab it pressed
  - unsaved boxes and choices kept through another tab of the page and
    back, and dropped on leaving (Rules 2a, 2b): scenario 3 checks typed
    text through a side tab and a reload
  - a component's "Name" of one space refused with a sentence in the
    notice, not a raw code ([A10](#a10)): the guard the issue report
    proposes
- **Nothing new to test**:
  - the Editor and the Production Editor while their role keeps "Permit
    changes to Settings" (Actors row 1): the same tabs as the Journal
    Manager's in scenarios 3 to 7
  - the Site Administrator's "view your pending submissions" (Rule 23b):
    the Dashboard's "Assigned to me", as for the Journal Manager in
    scenario 2
  - the "Contributors", "Details", "For the Editors" and "Review and
    Submit" texts on their wizard steps (Fields; Rule 7): the same path
    from box to step as "Upload Files" in scenario 3
- **Register carries it**:
  - A5 ("view your pending submissions" for a user holding only the
    Reader role; Rule 23b)
  - A11 (the default texts' links to the address the journal was created
    at; Rule 9)
  - A1 (a new component sharing first place with the first one; Rules
    14, 18; scenarios 6 and 7 pass it)
  - A10 (a component "Name" of only spaces; Fields, "Name")
  - A12 (the "Delete" window left spinning after a refused delete; Rule
    17a; scenario 7 passes it)
  - A13 (a refused key's notice that cannot be closed with its "×"; Rule
    16; scenario 6 passes it)
  - A2 (a deleted dependent component still offered on the "Media" page;
    Rule 17b)
  - A3 (a deleted component's key still taken; Rules 16, 17c)
  - A4 ("Multimedia" arriving with both "File Type" boxes ticked;
    Fields)
  - A7 (the "For Reviewer Suggestion" help; Fields)
  - A8 (the "Key" help; Fields)
  - A9 (a press's and a preprint server's "Components" list in French;
    Fields)
  - OMP1 (a press's "Disable Submissions" help and "Copyright notice"
    label; Fields; scenario 3 names it)
  - OMP2 (a press's "Edit" beside "Copyright Notice"; Rule 25; scenario 3
    names it)
  - OJS1 (the LOCKSS and CLOCKSS pages' "Copyright" row; Cross-feature
    interactions)
- **No seed**:
  - {OPS} the "Author Screening" tab with a screening plugin's rules
    (Rule 21; Settings bullet 6): the application installs no such plugin
  - one site-wide privacy statement (Rule 27; Settings bullet 5; A6): the
    installation option cannot be set on a test install
- **Owned by another feature**:
  - a manager-level role without "Permit changes to Settings", a Section
    Editor, an Author and a Reader refused the tabs (Actors row 1;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenarios 2 and 11)
  - a Site Administrator holding no manager-level role in the journal
    (Actors row 1;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*)
  - a manager-level role without "Permit changes to Settings" following
    an "Edit" link to the access-denied page (Rule 25;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenario 11)
  - {OPS} a Reader made an Author by opening the start screen, the link
    then opening "My Submissions" (Rule 23b;
    *[Submission wizard](U21-submission-wizard.md)*, scenario 9)
  - "Disable Submissions" ticked: "Start A New Submission" leaving the
    side menu and the start screen refusing (Rules 4a, 4b;
    *[Submission wizard](U21-submission-wizard.md)*, scenario 7)
  - "Disable Submissions" ticked: the notice above the Settings pages
    (Rule 4c;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenario 10)
  - "Disable Submissions" ticked: a draft started before still submitted
    (Rule 4e; *[Submission wizard](U21-submission-wizard.md)*, scenario 8)
  - the "For Reviewer Suggestion" text on the "Reviewer Suggestions" step
    {OJS OMP} (Rule 7;
    *[Reviewer suggestions](U31-reviewer-suggestions.md)*, scenario 1)
  - a "Metadata" item's field in the wizard and on the publication pages
    (Rule 12; *[Submission wizard](U21-submission-wizard.md)*, scenario
    17; *[Publication metadata](U40-publication-metadata.md)*, scenario 2)
  - a component's boxes in the upload lists, on the "Media" page, in the
    galley upload and on the article page (Rule 20;
    *[Submission files](U36-submission-files.md)*, scenario 10;
    *[Media files](U47-media-files.md)*, scenario 6;
    *[Galleys](U46-galleys.md)*;
    *[Article landing page & reading](U13-article-landing-page-and-reading.md)*)
  - more than one form language, one text per language (Rule 3;
    Settings bullet 2;
    *[Languages & locales](U57-languages-and-locales.md)*, scenario 5)
  - no section open to the reader (Rule 23c; Settings bullet 4;
    *[Sections](U17-sections.md)*, scenario 5)
  - a journal closed to visitors sending a signed-out visitor to the
    Login page, and back after signing in (Rule 26; Settings bullet 7;
    *[Roles configuration](U54-roles-configuration.md)*, scenario 7)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | The "Media" page still offers a deleted dependent component as a media type | 🐞 | user-visible | — |
| [A7](#a7) | The "For Reviewer Suggestion" box's help describes the Contributors step | 🐞 | minor | — |
| [A8](#a8) | The component window's "Key" help misspells "identifier" and calls the component a "genre" | 🐞 | minor | — |
| [A9](#a9) | In French, a press's and a preprint server's component list shows raw text keys | 🐞 | user-visible | — |
| [A10](#a10) | A component name of only spaces is refused with a raw text key | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A12](#a12) | A refused component delete leaves its confirmation window spinning | 🐞 | minor | — |
| [A13](#a13) | The "×" of a refused key's notice cannot be pressed while the component window is open | 🐞 | minor | — |
| [OJS1](#ojs1) | The LOCKSS and CLOCKSS pages print the License Terms under "Copyright" | 🐞 | minor | — |
| [OMP1](#omp1) | A press's "Disable Submissions" help speaks of "new articles", and its copyright box reads "Copyright notice" | 🐞 | minor | — |
| [OMP2](#omp2) | A press's "Edit" under "Copyright Notice" opens "Disable Submissions", not "Author Guidance" | 🐞 | minor | — |
| [A1](#a1) | A new component lands at the top of the list, sharing first place with the first component | ❓ | minor | — |
| [A3](#a3) | A deleted component keeps its key and can come back, though the confirmation says the delete cannot be undone | ❓ | minor | — |
| [A4](#a4) | "Multimedia" arrives with both "File Type" boxes ticked, whose sentences contradict each other | ❓ | minor | — |
| [A5](#a5) | "view your pending submissions" sends a user holding only the Reader role to the access-denied page | ❓ | minor | — |
| [A6](#a6) | The "Submissions" page shows the journal's own privacy statement where the site's is configured to apply | ❓ | latent | — |
| [A11](#a11) | The default texts link to the "Submissions" page by the address the journal was created at | ❓ | latent | — |
| [OMP3](#omp3) | A press has its own component list and ships "Type" metadata switched on | ✅ | — | — |
| [OPS1](#ops1) | A preprint server's guidance has a "For Readers" box and no "For Reviewer Suggestion" box | ✅ | — | — |
| [OPS2](#ops2) | "Author Screening" appears only with a screening plugin, and none is installed | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — A new component shares first place** · ❓ · minor.
A manager who adds a component expects it at the end of the list, as a
new section lands. It is placed at the top instead, in the same place as
the first component ("Article Text"), so the two show in no fixed order:
the settings list and the upload lists of one journal have been seen to
put them differently. A manager fixes it with "Order".
Question: should a new component go last? Lean: yes; a place shared with
another component is an accident, not a choice.
Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A deleted component stays offered on the "Media" page** · 🐞 · user-visible.
A manager who deletes a dependent component (for example "Multimedia")
expects it gone everywhere, as it is from the upload wizard. The "Media"
page's "What kind of media is this?" still offers it.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A deleted component is hidden, not removed** · ❓ · minor.
"Delete" asks to confirm with "This action cannot be undone.". Yet a
deleted component of the install's list comes back with "Restore
Defaults", and any deleted component's key stays taken: a new component
given that key is refused with "The key already exists.", though no row
of the list carries it.
Question: should the confirmation say the component is hidden, and should
a deleted component's key be free again? Lean: reword the confirmation
and free the key; the hiding itself protects old files and is sound.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Multimedia" is both dependent and supplementary** · ❓ · minor.
On a new journal or preprint server, "Multimedia" arrives with both "File
Type" boxes ticked: its files "will not be displayed with published
content" and "will be displayed separately from the main publication
files". Only the first takes effect: a dependent component is not offered
for galleys, so no galley shows under the supplementary files for it.
Question: should "Multimedia" arrive with only the dependent box ticked?
Lean: yes; the second tick has no effect and makes the window contradict
itself.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — "view your pending submissions" refuses a Reader** · ❓ · minor.
A signed-in user holding only the Reader role reads "Make a new
submission or view your pending submissions." on the "Submissions" page.
"view your pending submissions" sends them to the access-denied page
("The current role does not have access to this operation."). On a
preprint server this lasts only until they open the "Make a Submission"
start screen, which makes them an Author
([Submission wizard](U21-submission-wizard.md#ops2)).
Question: should the link be left out, or lead somewhere useful, for a
user with no submissions to view? Lean: leave it out for a user holding
no Author role.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The "Submissions" page ignores the site-wide privacy statement** · ❓ · latent.
On an installation configured for one site-wide privacy statement, a
journal's "Privacy Statement" page and its start form show the site's
statement. The "Submissions" page shows the journal's own statement
instead, or none when the journal has none.
Question: should the "Submissions" page follow the site-wide statement
too? Lean: yes; one installation, one statement.
Basis: code. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The "For Reviewer Suggestion" help describes contributors** · 🐞 · minor.
The help under "For Reviewer Suggestion" reads "The following is shown to
authors during the reviewer suggestions step. Provide a brief explanation
of what information the author should provide about themselves,
co-authors, and any other contributors.", the second sentence copied from
the "Contributors" box. A manager expects guidance about suggesting
reviewers.
Basis: code. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The "Key" help has a misspelling and a code word** · 🐞 · minor.
The component window's "Key" help reads "An optional short symbolic
identifer for this genre.": "identifier" is misspelled, and "genre" is a
word the screen uses nowhere else; the screen says "component".
Basis: code. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — Raw text keys in a press's and a server's French component list** · 🐞 · user-visible.
With the interface in French, a journal's "Components" list is headed
"Éléments de l'article" and names every component in French. A press's
and a preprint server's list is headed "##grid.genres.title##" instead.
On a preprint server with French among its form languages, seven
components carry raw text keys as their French names: "Research
Instrument", "Research Materials", "Research Results", "Transcripts",
"Data Analysis", "Data Set" and "Source Texts" read
"##default.genres.researchInstrument##" … "##default.genres.sourceTexts##"
in the list and in each "Edit" window, and "Restore Defaults" writes the
keys back.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A name of only spaces is refused with a raw text key** · 🐞 · low.
A manager who saves a component whose "Name" holds only spaces expects
the empty-name message under the box. The browser's own required check
counts the spaces as filled in, and the window shows a notice at its top
right reading "##manager.setup.form.genre.nameRequired## (English)", in
every interface language; the window stays open and nothing is saved.
Shares its cause with *[Sections](U17-sections.md)* A6.
Basis: probe, 2026-10-02. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The default texts link by the address the journal was created at** · ❓ · latent.
The default "Before you begin" and "Submission Checklist" texts link to
the "Submissions" page by its full address as it was when the journal
was created. When the installation is opened through another address,
"Submission Guidelines" on the start form and "Author Guidelines" in the
checklist still lead to the creating address.
Question: should the default texts link by an address that follows the
installation? Lean: yes; an installation that moves, or is reached by a
second address, would keep working links.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A refused delete leaves its confirmation spinning** · 🐞 · minor.
A manager who deletes a component that a submission's file carries
presses "OK" in the "Delete" window. The refusal comes as a browser
pop-up; once it is closed, the "Delete" window stays open with a spinning
indicator, as if the delete were still running. Pressing "OK" again
brings the same pop-up; only "Cancel" closes the window. The row stays,
as it should.
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A refused key's notice cannot be closed** · 🐞 · minor.
A manager whose "Key" is refused in the "Add a Component" window sees the refusal as a notice with a "×" at the window's top right,
and expects the "×" to close it, as it closes a notice anywhere else
([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md),
Rule 9). While the window is open, a press on the "×" does nothing: the
notice stays until it leaves by itself after about five seconds, and the
window stays open.
Basis: test run. <sup>f-a13</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — The archiving pages print the License Terms as "Copyright"** · 🐞 · minor.
On a journal with LOCKSS or CLOCKSS switched on, a reader of the LOCKSS
and CLOCKSS permission pages expects the "Copyright" row to carry the
journal's copyright notice. The row appears only once a "Copyright
Notice" is saved on "Author Guidance", and then prints the License Terms
of Settings › Distribution › "License", empty while those are unset; the
copyright notice's own text appears on neither page.
Basis: probe. <sup>f-ojs1</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Two wording slips on a press** · 🐞 · minor.
A press's "Disable Submissions" help reads "Prevent users from submitting
new articles to the press.", where a press takes monographs; and its
"Author Guidance" box is labelled "Copyright notice", where a journal, a
preprint server and the press's own "Submissions" page say "Copyright
Notice".
Basis: code. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — The press's copyright "Edit" link opens the wrong side tab** · 🐞 · minor.
On a press's "Submissions" page, "Edit" under "Author Guidelines" and
"Submission Preparation Checklist" opens "Author Guidance", where the
texts are. "Edit" under "Copyright Notice" opens the "Submission" tab on
"Disable Submissions", and the manager has to find "Author Guidance"
themselves.
Basis: probe. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A press's components and "Type" default** · ✅ · intended divergence.
A press lists "Monograph Components": "Appendix", "Bibliography", "Book
Manuscript", "Chapter Manuscript", "Glossary", "Index", "Preface",
"Prospectus", "Table", "Figure", "Photo", "Illustration", "Image", "HTML
Stylesheet", "Other", with "Book Manuscript" required. A new press also
arrives with "Enable type metadata" ticked and "Do not request the type
from the author during submission." chosen. Its "Submissions" page shows
the not-accepting sentence only while "Disable Submissions" is ticked,
never for its series ([Sections](U17-sections.md#not-accepting), Rule 13c).
Basis: code. <sup>f-omp3</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server's guidance boxes** · ✅ · intended divergence.
A preprint server's "Author Guidance" tab names its fourth step's box "For
Readers", matching its wizard, and has no "For Reviewer Suggestion" box,
since a preprint server has no reviewer suggestions. Its English
default texts speak of posting preprints and of readers rather than
editors. The French texts it gets when French is added as a form
language are written for a journal ("Merci de votre soumission à la
revue …", "l'équipe éditoriale"), as a press's are, and its French
guidelines and checklist are placeholders
([Languages & locales](U57-languages-and-locales.md#a8)).
Basis: code. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — "Author Screening" needs a plugin** · ✅ · intended divergence.
A preprint server can list screening rules on an "Author Screening" side
tab, but only rules an installed screening plugin supplies. The
application installs no such plugin, so a standard preprint server never
shows the tab; the default that authors cannot post their own preprints
([Submission wizard](U21-submission-wizard.md#ops1)) is not listed
anywhere.
Basis: code. <sup>f-ops2</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The screen: `lib/pkp/templates/management/workflow.tpl`, which no
app overrides. Outer tab `submission` (`manager.publication.submissionStage`
"Submission"); side tabs, in order, `disableSubmissions`
(`manager.setup.disableSubmissions`), `instructions`
(`manager.setup.workflow.guidance` "Author Guidance"), `metadata`
(`submission.informationCenter.metadata` "Metadata"), `components`
(`grid.genres.title.short` "Components", in each app's `manager.po`),
`contributorRoles` (`manager.contributorRoles.title`), then the hook
`Template::Settings::workflow::submission` (OPS: note i). Page heading
`manager.workflow.title` "Workflow Settings". Handler
`PKP\pages\management\ManagementHandler::workflow()` builds
`PKPDisableSubmissionsForm`, `APP\components\forms\context\MetadataSettingsForm`
and `SubmissionGuidanceSettings`. Subclass chain (multi-app rule 8): OJS
`APP\pages\management\SettingsHandler::workflow()` calls the parent, adds
review-form support, registers the two form classes for the template and
displays; OMP's does the same without the registrations; OPS's adds the
screening hook (note i) and displays. The page is mounted in the Vue
settings container `SettingsPage.vue`. Checkouts read 2026-09-27: ojs
`72b85f4ba0` (lib/pkp `26ae6431b5`), omp `3cd59e944` and ops `e2111e3aae`
(lib/pkp `17a1f01fed`); every lib/pkp file this spec cites is identical in
the two lib/pkp revisions (diffed). The side-tab list was seen live on
2026-09-23 by the navigation-menus claim check, all three apps:
"Disable Submissions", "Author Guidance", "Metadata", "Components",
"Contributor Roles". Live-probed 2026-09-27 (Rule 1), two runs on OJS and
one each on OMP and OPS, read 2.5 s after the reload: a reload on
`…/workflow#submission/<tab>` kept each of the five side tabs open; a
reload on a side tab of "Review" (`#reviewerGuidance`, OJS and OMP) landed
on "Submission" › "Disable Submissions". Live-probed 2026-09-29 (Rules 1a,
1b), two runs on each app, the Journal Manager on all three and the
Editor on a journal and a press: a pressed side tab writes the one-part
`…/workflow#<tab>` (for example `#metadata`), which a reload keeps; a typed
`#submission/<tab>` or `#<tab>` opens that side tab and is rewritten to
`#<tab>` on landing; pressing "Review" (a preprint server's "Preprint
Server Library") writes `#review` (`#library`), and pressing "Submission"
writes `#submission`, which shows the side tab last open but reopens on
"Disable Submissions" after a reload; a side tab pressed after that round
trip (`#components`) survived the reload.

<a id="fn-b"></a>
**b** — Access: `ManagementHandler` assigns the settings ops to
`ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` behind `CanAccessSettingsPolicy`
(the "Permit changes to Settings" flag of the role); the three forms save
through the context API (`PUT contexts/{id}`), which checks the same.
`GenreGridHandler` extends `PKP\controllers\grid\settings\SetupGridHandler`,
whose `authorize()` adds `ContextAccessPolicy` and `CanAccessSettingsPolicy`;
its role assignment gives `fetchGrid`, `fetchRow`, `addGenre`, `editGenre`,
`updateGenre`, `deleteGenre`, `restoreGenres` and `saveSequence` to
`ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN`. The base's own op `uploadImage`
serves the series window's cover upload (the Sections spec) and no
component window. Who opens the Settings pages, and the access-denied
page, are the Journal identity spec's (its settings-access passage, probed
there). Live-probed 2026-09-27 (Settings bullet 1), OJS and OMP: on
Settings › Users & Roles › "Roles" the Editor's and the Production
Editor's windows showed "Permit changes to Settings" ticked; the Journal
Manager's (Press Manager's) row had no row controls. OPS lists the
Preprint Server Manager alone at the manager level.

<a id="fn-c"></a>
**c** — "Disable Submissions": `PKPDisableSubmissionsForm`
(`FieldOptions('disableSubmissions')`, label and single option
`manager.setup.disableSubmissions`, description
`manager.setup.disableSubmissions.description` with `url` =
`management/settings/context#sections`; each app's `manager.po` words the
description, OMP's "new articles to the press", OMP1). Context schema
`disableSubmissions`, boolean, default false. Consumers:
`PKPTemplateManager` adds the side menu's `submit` item
(`dashboard.startNewSubmission` "Start A New Submission") only when
`!disableSubmissions`, computed at page load (Rule 4a; td1);
`templates/submission/start.tpl` and `PKPSubmissionController::add()`
(Rule 4b; the wizard spec's note b); the notice
`manager.setup.disableSubmissions.notAccepting` in OJS `context.tpl` and in
`website.tpl`, `workflow.tpl`, `distribution.tpl` (Rule 4c);
`frontend/pages/submissions.tpl` (note j); the legacy
`PKPSubmissionsListPanel`'s `allowSubmissions`, a panel no screen mounts
with an add button (the wizard spec, note a). The "Make a Submission"
block's template links to `about/submissions` whatever the setting
(Rule 4f). Live-probed 2026-09-27 (Rules 4f, 22): on a new journal or
press the block plugin is off and Settings › Website › "Appearance" ›
"Sidebar" does not offer it until it is switched on; switched on and
placed, it read "Make a Submission" and landed on "Submissions", with
submissions open and disabled; a preprint server's "Sidebar" offers only
"Web Feed Plugin" and "Language Toggle Block", and its plugin list has no
such block. Each landing on Settings › Website met the Plugin Gallery's
known server error ([Plugins management](U62-plugins-management.md#a1)). Each app's `context.tpl` carries the tab id `sections` (OMP
labelled `series.series` "Series"), the help link's anchor (Rule 6).
Save: the form component posts its own fields and shows "Saving" /
"Saved"; the Settings pages have no leave-page guard (the Journal identity
spec, note m). Seen live: 2026-08-25, all three apps, the side menu entry
gone and the start screen's notice with the box ticked, both back once
unticked (the wizard spec's note b); 2026-09-23, the side menu entry gone
while submissions are disabled (the Journal identity spec's claim check);
2026-09-23, text typed on "Author Guidance" and on the press's and
server's settings forms dropped on leaving the page with nothing asking
(the Submission files claim check), as the Journal identity spec's note
td7 records for every Settings page. Live-probed 2026-09-29 (Rules 2a,
2b), two runs on each app, the Journal Manager on all three and the
Editor on a journal and a press (the Editor unticking and choosing back
on values the manager had saved): on "Metadata", the Keywords and
"Categories" choices changed, two "Publisher ID" boxes and "Enable
coverage metadata" ticked, and on "Disable Submissions" its box ticked,
nothing saved. Every change stayed through "Components" and back and
through the page's second tab ("Review", "Preprint Server Library") and
back; leaving by "Settings" › "Distribution" and returning, and a
reload, showed the stored values, with no `beforeunload`, confirm or
alert in any of the four ways out. "Save" then sent `PUT contexts/{id}`
(200) and the values showed on the page and after a reload.

<a id="fn-d"></a>
**d** — "Author Guidance":
`PKP\components\forms\submission\SubmissionGuidanceSettings` (id
`submissionGuidanceSettings`), `FieldRichTextarea`s, all `isMultilingual`,
in order: `authorGuidelines` (`manager.setup.authorGuidelines`, help
`manager.setup.authorGuidelines.description` with the about/submissions
url), `beginSubmissionHelp` (`submission.wizard.beforeStart`),
`submissionChecklist` (`manager.setup.submissionPreparationChecklist`),
`uploadFilesHelp` (`submission.upload.uploadFiles`), `contributorsHelp`
(`publication.contributors`), `detailsHelp` (`common.details`),
`forTheEditorsHelp` (`submission.forTheEditors`, OPS "For Readers"),
`reviewHelp` (`submission.reviewAndSubmit`), `copyrightNotice`
(`manager.setup.copyrightNotice`, OMP's `manager.po` "Copyright notice"),
and `reviewerSuggestionsHelp` (`submission.forReviewerSuggestion`) added by
`addReviewSuggestionGuidanceDetail()` only when the context schema has
`reviewerSuggestionEnabled` (OJS and OMP `schemas/context.json`; OPS
lacks it). Defaults: each prop's `defaultLocaleKey` in the context schema
(`default.contextSettings.authorGuidelines`,
`default.submission.step.beforeYouBegin`,
`default.contextSettings.checklist`, `default.submission.step.uploadFiles`,
`…contributors`, `…details`, `…forTheEditors`, `…review`,
`…reviewerSuggestions`), none for `copyrightNotice`; filled at context
creation by `PKPContextService::add()` with `submissionGuidelinesUrl` (the
context's about/submissions address) and `contextName`; OMP's and OPS's
`default.po` word their own guidelines and checklist, and OPS its
before-you-begin, upload, contributors, for-readers and review texts.
Consumers: `StartSubmission` adds "Before you begin" and the checklist
confirmation only when their text is not empty;
`PKPSubmissionHandler::getSteps()` reads the step texts; `ConfirmSubmission`
adds the copyright confirmation only when `copyrightNotice` is not empty;
the Submissions page, note j. A language added under "Forms" gets its
default texts through `PKPContextService::restoreLocaleDefaults()` (the
Languages spec). Seen live: 2026-09-06, OJS and OMP, "For Reviewer
Suggestion" the last box with its default text, and a custom text shown
on the next wizard visit (the Reviewer suggestions spec, note t15);
2026-09-23, all three apps, the "Upload Files" default verbatim and a
custom text in the author's step (the Submission files spec, note z).
Live-probed 2026-09-27, all three apps, scratch contexts: the "Copyright
Notice" help's "submissions" links to `about/submissions`; with French
ticked under "Forms" the form showed one "French" button under its tab
and each box a line "2/2 languages completed" ("0/2" under the empty
"Copyright Notice"), and the component window's `name[fr_CA]` box showed
while `name[en]` was focused (Rule 3); texts saved while the author's
start form or wizard was open did not show on that page nor on the steps
reached with "Continue", and showed after a reload (Rule 7, two runs);
the defaults' "Submission Guidelines" link carries `target="_blank"` and
opened a new tab, the checklist's "Author Guidelines" link opened in the
same tab (Rule 9). A11: the seeded contexts' default links read
`http://127.0.0.1:<port>/index.php/publicknowledge/about/submissions`,
the address the install was built through, also when the journal was
opened through a second address of the same installation; a scratch
context created through that second address links to it.

<a id="fn-e"></a>
**e** — "Metadata": `PKP\components\forms\context\PKPMetadataSettingsForm`,
fields in the order of Fields; every "Enable … metadata" item is a
`FieldMetadataSetting` with `options` (the box, value `enable`) and
`submissionOptions` (`enable` "Do not request…", `request` "Ask…",
`require` "Require…"). ui-library `FieldMetadataSetting.vue`: the choices
render `v-if="isEnabled"`, and the `isEnabled` watcher sets the value to
`enabledOnlyValue` (the "Do not request" choice) on a tick and to the
disabled value on an untick, so a re-tick starts at "Do not request"
(td2). `citationsMetadataLookup` has `showWhen: 'citations'`,
`funderGrantValidation` `showWhen: 'funders'`. `requireAuthorCompetingInterests`
and `submitWithCategories` are plain options. App subclasses (rule 8):
OJS `MetadataSettingsForm` adds `enablePublisherId` (publication, galley,
issue, issueGalley) and `enableArticleNumber`; OMP adds `enablePublisherId`
(publication, chapter, representation, file); OPS `enablePublisherId`
(publication, galley). Defaults: the context schema gives `keywords`,
`citations` and `funders` the default `request`, OMP's schema gives `type`
the default `enable` (td3); the other items have none and read as
unticked; `submitWithCategories` defaults to false. Seen live: keywords,
references and funders asked at install on the seeded contexts of the
three apps (2026-09-07; funders 2026-09-24; seed facts). Each item's
effect is described in the Settings section of the spec its Fields row
names.

<a id="fn-f"></a>
**f** — "Components": `PKP\controllers\grid\settings\genre\GenreGridHandler`
(no app subclass): title `grid.genres.title` ("Article Components",
"Monograph Components", "Preprint Components" in each app's `manager.po`);
one column `name` (`common.name`, the localized name with the primary
language as fallback); grid actions `addGenre` (`grid.action.addGenre`
"Add a Component", a window of the same title) and `restoreGenres` (note
g); `initFeatures()` → `OrderGridItemsFeature` ("Order",
`grid.action.order`, shown with two rows or more; finish controls "Done"
`common.done` and "Cancel ordering" `grid.action.cancelOrdering`;
`saveSequence`); `loadData()` → `GenreDAO::getEnabledByContextId()` ordered
by `seq`. `GenreGridRow`: `editGenre` (`grid.action.edit`, window titled
"Edit") and `deleteGenre` (note h); the row toggle's screen-reader text
`grid.settings` "Settings" (`gridRow.tpl`). `GenreForm` with
`genreForm.tpl`: `name` multilingual, `maxlength="80"`, `required` (the
client check shows `validator.required` "This field is required."; the
server's `FormValidatorLocale` names the key
`manager.setup.form.genre.nameRequired`, which no locale file of the three
checkouts defines, td4); `dependent` and `supplementary` under
`manager.setup.genres.label` "File Type"; `supportsFileVariants` under
`manager.setup.genres.supportsFileVariants.title`; `category` select under
`manager.setup.genres.metatadata` (Document 1, Artwork 2, Supplementary
Content 3); `required` radios; `key` `maxlength="30"`, `readonly` when
`Genre::isDefault()` (the key is one of the app's `registry/genres.xml`
keys). Key checks: `manager.setup.genres.key.exists` through
`GenreDAO::keyExists()`, which counts every row of the context, enabled or
not (A3); `manager.setup.genres.key.alphaNumeric`,
`/^[a-z0-9]+([\-_][a-z0-9]+)*$/i`. `execute()` inserts a new row through
`GenreDAO::insertObject()`, which stores an unset sequence as 0, the first
install component's sequence (A1). The window's close asks
`form.dataHasChanged`; its "Cancel" was seen to close without asking
(td13). Defaults: `registry/genres.xml` per app,
installed in file order; OMP's lists `OTHER` twice, so its one "Other"
ends last. Seen live: 2026-09-23, all three apps, the list titles, the
install components in the order given, their boxes and "File Metadata",
and each other end on a scratch journal (the Submission files spec, note
z); 2026-09-24, "Multimedia" with the supplementary box ticked on a
scratch context of each app (the Media files claim check); 2026-09-25,
OJS and OPS, the supplementary box ticked on the nine components listed,
the dependent box on "Multimedia", "Image" and "HTML Stylesheet", "Close"
after a change asking "The data on this form has changed. Do you wish to
continue without saving?", and "Save" closing the window with no notice
(the Article landing page spec's claim check). Live-probed 2026-09-27,
all three apps (Fields): the buttons stand, in page order, "Order", "Add a
Component", "Restore Defaults"; the "Name" column heading exists for
screen readers only (no header row is drawn); the "Key" refusals show as
a floating notice at the window's top right with a "×" (Rule 16), and a
31st character typed in "Key" is not taken. Where each setting takes
effect: the specs named in Rule 20, each with its own evidence.

<a id="fn-g"></a>
**g** — "Restore Defaults": `GenreGridHandler::restoreGenres()` (CSRF
checked) → `GenreDAO::installDefaults($contextId,
$context->getSupportedFormLocales())`. For each entry of
`registry/genres.xml` the row with that key, enabled or not, is updated
and re-enabled with the entry's category, boxes, `required`, variants,
names in every form language and sequence 0, 1, 2… in file order; an entry
without a row is inserted. Rows whose key the registry does not list are
not touched and keep their sequence; one added from the list holds 0,
the first install component's, and so shares first place (A1, td7).
Confirmation `grid.action.restoreDefaults.confirm` through
`RemoteActionConfirmationModal`.

<a id="fn-h"></a>
**h** — Delete: `GenreGridHandler::deleteGenre()`: CSRF; a count of
submission files carrying the component
(`Repo::submissionFile()->getCollector()->filterByGenreIds()`) above zero
answers `manager.genres.alertDelete` and deletes nothing (td6); otherwise
`GenreDAO::deleteObject()` → `deleteById()`, which sets `enabled = 0` and
keeps the row. Confirmation `common.confirmDelete`, in a window titled
"Delete" whose buttons read "OK" and "Cancel" (live-probed 2026-09-27,
all three apps: "Cancel" left the row, "OK" removed it at once with no
notice); the refusal `manager.genres.alertDelete` shows as a browser
alert (A12). The upload lists read enabled components
only (`getEnabledByContextId()` and the dependence and supplementary
getters filter `enabled = 1`); the "Media" page reads the programming
interface (note l). Seen live 2026-09-23, all three apps: a deleted
component gone from the upload lists (the Submission files spec, note z).

<a id="fn-i"></a>
**i** — OPS: `APP\pages\management\SettingsHandler::workflow()` adds a
callback on `Template::Settings::workflow::submission` that calls
`Settings::Workflow::listScreeningPlugins` and, when no rule comes back,
adds nothing; otherwise it appends `<tab id="authorScreening">` labelled
`manager.setup.authorScreening` "Author Screening" with a `pkpTable` of one
row per rule. No plugin, class or template in the OPS checkout registers
`Settings::Workflow::listScreeningPlugins` (grep of the whole tree,
2026-09-27), so the tab renders on no standard install; recorded as a
dead-on-standard-install candidate in the campaign's unassigned list. The
posting default is `Publication::canAuthorPublish` in OPS
`APP\publication\Repository`.

<a id="fn-j"></a>
**j** — The "Submissions" page: `PKP\pages\about\AboutContextHandler::submissions()`
assigns `submissionChecklist` (the context's localized checklist) and
`sections` (the section collector with `excludeEditorOnly(!$canSubmitAll)`);
OJS `APP\pages\about\AboutHandler` extends it (adding only
`subscriptions`), OMP and OPS use it directly. Template
`lib/pkp/templates/frontend/pages/submissions.tpl`: breadcrumb and heading
`about.submissions`; `.cmp_notification` printing `author.submit.notAccepting`
when `$sections|@count == 0` or `disableSubmissions`, otherwise, signed in,
`about.onlineSubmissions.submissionActions` ("{$newSubmission} or
{$viewSubmissions}.", links to page `submission` and page `submissions`),
signed out `about.onlineSubmissions.registrationRequired` (links to
`login` and `user/register`); then `authorGuidelines`
(`about.authorGuidelines`), `submissionChecklist`
(`about.submissionPreparationChecklist`), `$submissionChecklistAfterContent`
(the section policies: the OJS and OPS overrides capture them and include
the core template), `copyrightNotice` (`about.copyrightNotice`) and
`privacyStatement` (`about.privacyStatement`), each behind a non-empty
`getLocalizedData()`. OMP overrides the whole template: the notice checks
`disableSubmissions` alone and the copyright edit link's anchor differs
(OMP2). The page reads the context's `privacyStatement` only; the
installation option `sitewide_privacy_statement` (`config.inc.php`,
`[general]`) is read by `AboutSiteHandler` (the privacy page),
`StartSubmission` and `RegistrationForm` and not here (A6). Seen live:
2026-09-25, OJS and OPS, with "Disable Submissions" ticked a visitor, an
Author and the manager read the not-accepting sentence, and a press whose
only series was closed to authors still invited (the Sections spec, note
td12). Live-probed 2026-09-27, all three apps: the header's "About" ›
"Submissions", the typed address and (OJS, OMP) the switched-on "Make a
Submission" block opened the page (Rule 22); signed in, each section
block ends in "Make a new submission to the Articles section." ("…
Preprints section."), the name a link to `…/submission?sectionId={id}`;
on a journal with "Users must be registered and log in to view the
journal site." ticked, the typed address signed out landed on
`login?source=…/about/submissions`, and signing in there returned to the
"Submissions" page (Rule 26, one run per app); the box reads "… the press
site." on a press and "… the server site." on a preprint server (Settings
bullet 7).

<a id="fn-k"></a>
**k** — Links: "view your pending submissions" opens page `submissions`
(`lib/pkp/pages/submissions/index.php`) → `DashboardHandler::index()` →
`PKPPageRouter::redirectHome()`: manager, site administrator, sub-editor or
assistant → `dashboard/editorial`; reviewer → `dashboard/reviewAssignments`;
author → `dashboard/mySubmissions`. `DashboardHandler` assigns `index` to
site administrator, manager, sub-editor, author, reviewer and assistant
only, so a Reader-only user is refused before the redirect (A5, td9).
"Edit": `frontend/components/editLink.tpl`, printed only when
`ROLE_ID_MANAGER` is among the user's roles in the journal; screen-reader
text `help.goToEditPage`. Anchors: `management/settings/workflow#submission/instructions`
under the guidelines, the checklist and (OJS, OPS) the copyright notice;
OMP's copyright link `#submission/authorGuidelines`, an id no side tab has
(OMP2, td10); `management/settings/website#setup/privacy` under the
privacy statement. Seen live 2026-09-23 as the manager, all three apps:
the guidelines and checklist links opened "Author Guidance", the privacy
link "Privacy Statement"; a manager-level role without Settings access
landed on the access-denied page (the navigation-menus claim check).
Live-probed 2026-09-27 (Rule 25), all three apps, three runs: the section blocks
carried no "Edit" for any account, the manager's included.

<a id="fn-l"></a>
**l** — Programming interface: `PKP\API\v1\genres\GenreController` (base
`genres`), middleware `has.user` and `has.context`, `roleAuthorizer` for
`ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`,
`ROLE_ID_ASSISTANT`, `ROLE_ID_AUTHOR`, plus `UserRolesRequiredPolicy` and
`ContextAccessPolicy`. `GET /genres` → `GenreDAO::getByContextId()` (every
row, `enabled` not filtered; `count` default 30, at most 100; `itemsMax` a
count of every row); `GET /genres/{genreId}` → one row, 404 when not in
the context. `GenreResource` returns `enabled` and `isDefault` with the
component's fields. The one screen consumer is ui-library
`managers/MediaFileManager/mediaFileManagerStore.js`, which keeps
`genre.dependent` and does not look at `enabled` (A2). OPS mounts the same
controller at the unversioned `api/genres/` too, an entry point this spec
does not claim (parked in the campaign's unassigned list).

<a id="fn-m"></a>
**m** — No mail, notification, task or event-log call in
`ManagementHandler`, the three form classes, `PKPContextService::edit()`
(hooks only), `GenreGridHandler`, `GenreForm` or `GenreDAO` (read
2026-09-27).

<a id="fn-n"></a>
**n** — No screen on a standard install shows the tab: the application
installs no screening plugin (note i), so the installed end is read from
the code.

<a id="fn-s"></a>
**s** — Where each scenario runs: scenario 1 on the seeded context
`publicknowledge`, signed out, with no account; scenarios 2 to 7 each on
a scratch context from `POST scenarios/context`, with throwaway `users[]`
(passwords per the users reference): scenario 2 one account per role key,
`manager`, `sectionEditor` (Section editor; Series editor, Moderator),
`funding` (Funding Coordinator; OPS `editorialBoardMember`), `author`,
`externalReviewer` (OJS, OMP), one account with both `author` and
`externalReviewer` (OJS, OMP), and `reader`; scenarios 3 to 7 a
`manager`, plus an `author` in scenarios 3, 4 and 7. The settings are
changed on the tabs themselves, the feature under test; the context is
created with none of them set but scenario 7's added component. Drafts at "Upload Files" (scenarios 3, 7):
`POST scenarios/submission` with `submitted: false`, which opens the
wizard on "1 Upload Files". Scenario 7: the file carrying the component
from the submission scenario's `files[]` with its component (OJS "Data
Set", OMP "Index") or `galleys[]` with `genre` "Data Set" (OPS);
"Field Notes" from the context's `components` key. Scenario 4's block
{OJS OMP}: `plugins: {makesubmissionblockplugin: {enabled: true}}` with
`sidebar: ['makesubmissionblockplugin']`. The components' address in the
programming interface (scenario 2): `{journal}/api/v1/genres`, answered
with the list for the Author and refused for the Reviewer and the Reader
(note td11). On a preprint server opening the start screen makes the
visitor an Author (Rule 23b), so scenario 2 opens it only as the Author
and the Reviewer, and no scenario opens it with a roster account there.
No scenario needs the mail catcher (Side effects). The section block of
scenarios 1 to 3 {OJS OPS} is the install's first section, "Articles"
("Preprints"), whose policy reads "Section default policy", on
`publicknowledge` (seed facts; OJS `REV` has none) and on a scratch
context made without `sections[]` (the Sections spec's note n, live-probed
2026-09-25); seen on `publicknowledge` live 2026-09-27, all three apps
(a press shows no section block).

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (Rules 4a, 5), all three apps, scratch
contexts: after "Save" with the box ticked, the page that saved still
listed "Start A New Submission" and the Dashboard, the next page load,
did not; after unticking and saving, the saving page still lacked it and
still showed the notice until a new load, and the Dashboard listed it
again.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Rules 10, 11), all three apps, scratch
contexts: ticking "Enable subject metadata" showed the three choices with
"Do not request subjects from the author during submission." selected;
after "Require the author to provide subjects before accepting their
submission.", an untick (the choices gone) and a re-tick, "Do not
request…" was selected again; "Save" ("Saving", "Saved") and a reload
showed the box ticked at "Do not request…", and "Ask…" saved read "Ask…"
after a reload. Unticking "Enable references metadata" removed
"References Metadata Lookup", unticking "Enable funder metadata" removed
"Funder Grant ID validation", and a re-tick brought each back.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Fields, "Type"): on a new scratch
press and on the seeded press "Enable type metadata" was ticked with "Do
not request the type from the author during submission." selected; on a
new scratch journal and preprint server, and on the seeded ones, it was
unticked.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Fields, "Name"), all three apps: an
empty "Name" saved kept the window open with "This field is required."
directly under the box; 81 characters typed left 80 in the box. A name
of only spaces: A10.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rule 16; A3), all three apps, scratch
contexts: "Probe Component" with "Key" "PROBE-1" saved, was deleted, and
a new component with "PROBE-1" was then refused with "The key already
exists." though no row carried it; "-bad" was refused with the
alphanumeric message, and the main component's key ("SUBMISSION", on a
press "MANUSCRIPT") with "The key already exists.".

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Rule 17a; A12), two runs per app, on
a scratch context whose submission carried "Data Set" (a press "Index";
a preprint server a "Data Set" galley): "OK" in the "Delete" window
brought a browser alert with the refusal; after it was closed the window
stayed open with a spinner beside "OK" and "Cancel", still there 6 s
later, and "OK" pressed again brought the same alert; "Cancel" closed
it. The row stayed, on the same page and after a reload.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 18; A1), all three apps: after
"Other" was renamed "Other Files", "Article Text" (a press "Book
Manuscript", a server "Preprint Text") set to "No", "Transcripts" (a
press "Prospectus") deleted and "Probe Component" added, "Restore
Defaults" asked in a window titled "Confirm" with "OK" and "Cancel";
confirmed, with no notice, "Other" was back with its French name
"Autre", the main component back at "Yes", the deleted one back in its
install place, and "Probe Component" kept its own box and key and stood
first, above the main component, on the same page and after a reload.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 17b; A2), all three apps, one run
each: "Multimedia" (a press "HTML Stylesheet") and "Transcripts" (a press
"Prospectus"), deleted, left the list and the upload wizard's list; the
"Media" page's "Upload Media File" still offered the deleted dependent
one under "What kind of media is this? (Required)", beside "Image"
(control, not deleted) and "HTML Stylesheet". The page's path is the
Media files spec's (its Actors preamble and entry-point table).

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Rule 23b; Actors row 6; A5), all three
apps, the seeded roster and a scratch journal per level (two runs on OJS
and OMP): "view your pending submissions" opened "Assigned to me (0)"
for the Site Administrator, the manager-level roles, the Section Editor
and an assistant; "Action Required by me (0)" for a Reviewer and for a
user holding both Author and Reviewer (OJS, OMP); "Active submissions
(0)" under "My Submissions as Author" for an Author; the access-denied
page for a Reader-only user. "Make a new submission" opened "Make a
Submission" with "Begin Submission" for every level. On a preprint
server a Moderator, an Editorial Board Member and a Reader who opened
the start page were listed on Users & Roles as "Moderator / Author",
"Editorial Board Member / Author", "Reader / Author", on the seeded and
a scratch server; the Reader's link then opened "My Submissions" (the
Submission wizard spec's OPS2).

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27 (Rule 25; OMP2), two runs on OMP: on
a press with a copyright notice the Press Manager's "Edit" beside
"Copyright Notice" opened "Submission" › "Disable Submissions" (address
ending `#submission`); "Edit" beside "Author Guidelines" on the press,
and beside "Copyright Notice" on a journal and a preprint server, opened
"Author Guidance".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 (Actors row 8), all three apps: the
journal's `/api/v1/genres` answered 200 with every component (12, a
press 15) for the Site Administrator, the manager-level roles with or
without "Permit changes to Settings", a Section Editor, an assistant
and an Author; 401 "The current role does not have access to this
operation." for a Reviewer (OJS, OMP) and a Reader-only user; 401 "You
are not authorized to access the requested resource." signed out. On a
preprint server a Reader read 401 before opening the start page and 200
after (note td9).

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (Rule 28), all three apps: after
"Multimedia" and "Transcripts" (a press "HTML Stylesheet" and
"Prospectus") were deleted, `/api/v1/genres` listed both with `enabled:
false`, and `itemsMax` read 12 (a press 15), every row.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27 (Rule 15), two runs on OJS and one
each on OMP and OPS: after "Name" was changed, "Cancel" closed the window
at once with no question, also after the box was left with Tab, and the
list kept the old name on the same page and after a reload; the window's
"Close" asked "The data on this form has changed. Do you wish to
continue without saving?" and, accepted, closed with the old name kept;
leaving the page with the changed window open raised the browser's
leave-page question.

<a id="fn-f-a1"></a>
**f-a1** — `GenreDAO::insertObject()` stores `(float) $genre->getSequence()`,
0 for a new component, the sequence `installDefaults()` gives the first
registry entry; the list and the upload lists order by sequence alone.
Recorded by the harness on 2026-09-23 (three apps, the scenario API's
components key and the screen alike): the list and the wizard's list of
one journal put the two components in different orders.

<a id="fn-f-a2"></a>
**f-a2** — Notes h and l: deleting sets `enabled = 0`; the "Media" page's
store fetches `genres` through the programming interface, which returns
disabled rows too, and filters on `dependent` only. Live-probed
2026-09-27, all three apps (note td8).

<a id="fn-f-a3"></a>
**f-a3** — Notes f, g and h: `deleteById()` keeps the row, `keyExists()`
counts it, `installDefaults()` re-enables a registry row. Live-probed
2026-09-27, all three apps: the key taken after a delete (note td5) and
the deleted install component back after "Restore Defaults" (note
td7).

<a id="fn-f-a4"></a>
**f-a4** — `registry/genres.xml` (OJS, OPS): `MULTIMEDIA` `category="1"
dependent="1" supplementary="1"`. Seen live 2026-09-24 (three apps; a
press has no "Multimedia") and 2026-09-25 (OJS, OPS), note f; the galley
upload offers no dependent component (the Article landing page spec,
Rule 10).

<a id="fn-f-a5"></a>
**f-a5** — Note k. Live-probed 2026-09-27, all three apps, the preprint
server's enrolment included (note td9).

<a id="fn-f-a6"></a>
**f-a6** — Note j. The site-wide statement cannot be seen on a test
install: the installation option cannot be set there. At the default
(off) the "Submissions" page's text equalled the journal's own "Privacy
Statement" page (live-probed 2026-09-27, all three apps).

<a id="fn-f-a7"></a>
**f-a7** — `manager.setup.workflow.reviewerSuggestionsHelp.description`
(lib/pkp `manager.po`): its second sentence repeats
`manager.setup.workflow.contributorsHelp.description` word for word.

<a id="fn-f-a8"></a>
**f-a8** — `manager.setup.genres.key.description` (lib/pkp `manager.po`),
"An optional short symbolic identifer for this genre.", in the three apps.

<a id="fn-f-a9"></a>
**f-a9** — `grid.genres.title` has an empty `msgstr` in OMP's and OPS's
`locale/fr_CA/manager.po` (OJS: "Éléments de l'article"); OPS
`locale/fr_CA/default.po` leaves `default.genres.researchInstrument` and
the other six empty, and `GenreDAO::installDefaults()` writes the
untranslated key as the French name. Live-probed 2026-09-27, two runs
per app, OJS the control: the list in French, and on a preprint server
with English and French form languages the seven names in the list, in
each "Edit" window and after "Restore Defaults".

<a id="fn-f-a10"></a>
**f-a10** — Note f: the box's own check accepts spaces, and the server's
`FormValidatorLocale` answers with `manager.setup.form.genre.nameRequired`,
which no locale file defines. Live-probed 2026-09-27, two runs per app.
Issue report: [docs/issues/U17-A6-section-or-component-name-of-spaces-raw-code.md](../issues/U17-A6-section-or-component-name-of-spaces-raw-code.md).

<a id="fn-f-a11"></a>
**f-a11** — Note d: the default texts carry `submissionGuidelinesUrl`,
filled once at context creation with the absolute address. Live-probed
2026-09-27, all three apps (note d).

<a id="fn-f-a12"></a>
**f-a12** — Note h: the refusal is the JSON message
`manager.genres.alertDelete`, shown as a browser alert; the confirmation
window does not close on it. Live-probed 2026-09-27, two runs per
app (note td6).

<a id="fn-f-a13"></a>
**f-a13** — Test run 2026-09-27, all three apps (scenario 6, "A malformed
"Key""): the press on the notice's `button.pkpNotification__closeButton`
("Close"), resolved visible and enabled, retried until the notice left on
its own, each attempt answered "`<div … data-cy="active-modal">` subtree
intercepts pointer events". Live-probed 2026-09-27 by hand, all three
apps: the point under the "×" belongs to the window's content
(`DialogContent` … `div.flex.items-start`), and on OJS the page body, the
notification area and the button all compute `pointer-events: none` while
the window is open, though the notification layer (`z-index` 1001) is
painted above the window's (10); a real mouse press there left the notice
standing and the window open, and the notice left 5.4 s after it showed
(OJS, OMP, OPS alike).

<a id="fn-f-ojs1"></a>
**f-ojs1** — OJS `templates/gateway/lockss.tpl` and `clockss.tpl` test
`copyrightNotice` and print `licenseTerms` in the "Copyright" row. A new
journal has LOCKSS and CLOCKSS unticked on Settings › Distribution ›
"Archiving", and `gateway/lockss` and `gateway/clockss` then land on the
home page; a press and a preprint server answer "404 Not Found" there.
Live-probed 2026-09-27, OJS, two journals: no "Copyright" row without a
copyright notice; an empty row once one was saved; the License Terms in
it once those were saved on Settings › Distribution › "License".

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `locale/en/manager.po`:
`manager.setup.disableSubmissions.description` "Prevent users from
submitting new articles to the press. …" and `manager.setup.copyrightNotice`
"Copyright notice"; OMP's `about.copyrightNotice` on the page reads
"Copyright Notice".

<a id="fn-f-omp2"></a>
**f-omp2** — OMP `templates/frontend/pages/submissions.tpl`: the
copyright notice's `editLink.tpl` include passes
`anchor="submission/authorGuidelines"`, where the core template passes
`submission/instructions`; `workflow.tpl` has no side tab `authorGuidelines`.
Live-probed 2026-09-27, OMP with journal and server controls (note
td10).

<a id="fn-f-omp3"></a>
**f-omp3** — OMP `registry/genres.xml` (note f); OMP `schemas/context.json`
`type` default `enable` (td3); OMP `submissions.tpl` notice condition
(note j).

<a id="fn-f-ops1"></a>
**f-ops1** — Note d: OPS `submission.po` "For Readers", OPS `manager.po`
help "The following is shown to authors during the For Readers step, when
they are asked to provide metadata such as keywords, licensing
information, and other details to assist in discovery and moderation.";
OPS's context schema has no `reviewerSuggestionEnabled`; OPS `default.po`
texts. Live-probed 2026-09-27, OMP and OPS with OJS the control, French
added under "Forms" on screen and at creation: the French "Before you
begin" read "Merci de votre soumission à la revue …", "l'équipe
éditoriale" appeared among the French texts, and the guidelines and checklist
were the `##default.contextSettings.…##` placeholders, on the form and on
the French start form.

<a id="fn-f-ops2"></a>
**f-ops2** — Note i.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Disable Submissions" side tab | Settings › Workflow › "Submission" (`management/settings/workflow#submission/disableSubmissions`) | AFFM-053 |
| "Author Guidance" side tab | `…#submission/instructions` | AFFM-054 |
| "Metadata" side tab | `…#submission/metadata` | AFFM-055 |
| "Components" list | `…#submission/components` | GRID-042 |
| "Add a Component" | the list's button | AFFM-056 |
| "Restore Defaults" | the list's button | AFFM-057 |
| A row's "Edit" | the row's arrow | AFFM-058 |
| A row's "Delete" | the row's arrow | AFFM-059 |
| "Order" | the list's button | AFFM-060 |
| Settings grids' base (access, image upload) | every settings grid; its upload serves the series window (*Sections*) | GRID-049 |
| {OPS} "Author Screening" side tab | `…#submission/authorScreening`, only with a screening plugin's rules | AFFM-064 |
| "Submissions" page notice line | `{journal}/about/submissions` | AFFR-035 |
| "Submissions" page parts and "Edit" links | `{journal}/about/submissions` | AFFR-036 |
| Components through the programming interface | `{journal}/api/v1/genres`, `…/genres/{id}` | API-021 |
| {OPS} the same, unversioned | `{server}/api/genres` | API-066 (parked, not claimed) |
| "Contributor Roles" side tab | `…#submission/contributorRoles` | AFFM-061..063 (*Contributors & affiliations*) |
| Settings page dispatchers (rider) | `management/settings/{context,website,workflow,distribution}` | ROUTE-017 · ROUTE-042 · ROUTE-063 · ROUTE-078 · VUE-022 (bookkeeping owner *Journal identity & about pages*) |
| About pages handler (cited) | `{journal}/about/…` | ROUTE-001 (*Journal identity & about pages*) |

## Reference — code anchors

- Page and handlers: `lib/pkp/templates/management/workflow.tpl`;
  `lib/pkp/pages/management/ManagementHandler.php` (`workflow()`); each
  app's `pages/management/SettingsHandler.php` (OPS: the screening hook);
  ui-library `components/Container/SettingsPage.vue`.
- Forms: `lib/pkp/classes/components/forms/context/PKPDisableSubmissionsForm.php`,
  `lib/pkp/classes/components/forms/submission/SubmissionGuidanceSettings.php`,
  `lib/pkp/classes/components/forms/context/PKPMetadataSettingsForm.php`,
  each app's `classes/components/forms/context/MetadataSettingsForm.php`;
  ui-library `components/Form/fields/FieldMetadataSetting.vue`.
- Components: `lib/pkp/controllers/grid/settings/SetupGridHandler.php`,
  `lib/pkp/controllers/grid/settings/genre/GenreGridHandler.php`,
  `GenreGridRow.php`, `form/GenreForm.php`;
  `lib/pkp/templates/controllers/grid/settings/genre/form/genreForm.tpl`;
  `lib/pkp/classes/submission/GenreDAO.php`, `Genre.php`; each app's
  `registry/genres.xml`;
  `lib/pkp/classes/controllers/grid/feature/OrderGridItemsFeature.php`.
- Programming interface: `lib/pkp/api/v1/genres/GenreController.php`,
  `resources/GenreResource.php`; each app's `api/v1/genres/index.php` (OPS
  also `api/genres/index.php`); ui-library
  `managers/MediaFileManager/mediaFileManagerStore.js`.
- "Submissions" page: `lib/pkp/pages/about/AboutContextHandler.php`
  (`submissions()`), `lib/pkp/templates/frontend/pages/submissions.tpl`,
  the OJS, OMP and OPS `templates/frontend/pages/submissions.tpl`,
  `lib/pkp/templates/frontend/components/editLink.tpl`,
  `lib/pkp/pages/submissions/index.php`,
  `lib/pkp/pages/dashboard/DashboardHandler.php`,
  `lib/pkp/classes/core/PKPPageRouter.php` (`getHomeUrl()`).
- Defaults and schema: `lib/pkp/schemas/context.json`, each app's
  `schemas/context.json`, `lib/pkp/classes/services/PKPContextService.php`
  (`add()`, `restoreLocaleDefaults()`), `lib/pkp/locale/en/default.po` and
  each app's `locale/en/default.po`, `manager.po`.
- Consumers read for Rule 4: `lib/pkp/classes/template/PKPTemplateManager.php`
  (side menu), `lib/pkp/templates/submission/start.tpl`,
  `lib/pkp/api/v1/submissions/PKPSubmissionController.php` (`add()`); OPS
  `classes/publication/Repository.php` (`canAuthorPublish`).
