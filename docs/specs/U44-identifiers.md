---
name: identifiers
status: verified
---

# Identifiers (publisher IDs & URN)

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Besides DOIs, which are a feature of their own (*DOIs*), a journal can
give what it publishes two other public identifiers. A **publisher ID**
is a free-form code the publisher keeps for an item in its own records
(the help text names an external database or a PubMed deposit). A
**URN** (Uniform Resource Name, such as `urn:nbn:de:0000-jpk.v1i2.12`)
is a persistent identifier that national libraries register and resolve;
the install's "URN" plugin builds and stores them. The Journal Manager
decides which kinds of item carry which identifier, the editorial team
sets or assigns the identifiers item by item on the screens where those
items are edited, and readers see an article's or an issue's URN as a
link to the resolver. An **item** below is anything that can carry an
identifier: the article (one publication version), a galley, an issue
and an issue galley on a journal; the monograph, a chapter, a
publication format and a file of a format on a press; the preprint and a
galley on a preprint server.

A preprint server installs no URN plugin: its Plugins page lists no
"URN", so everything below about URNs is {OJS OMP}, and on a preprint
server this feature is the publisher ID of preprints and galleys. Issues
and issue galleys exist on a journal only. A press's chapters,
publication formats and files take identifiers through windows of their
own {OMP}; this spec names those windows and their "Identifiers" tab,
and describes nothing else on them.

## Actors & permissions

Identifiers are set on screens other features own, and who reaches each
screen is that feature's rule. The article's identifiers follow the
publication's edit gate ([→ edit gate](U40-publication-metadata.md#edit-gate)):
whoever may save the Metadata page, the Author aside, may save the
"Identifiers" page.
**Manager-level roles** below are the Journal Manager and the Editor (a
press's Press Manager and Press Editor, a journal's and press's
Production Editor too), which reach Settings unless a manager has taken
"Permit changes to Settings" from the role; a Site Administrator counts
as one inside a journal or press where they hold a manager role. Without
one, a Site Administrator reaches Settings on a journal only
([→ Journal identity & about pages, A1](U07-journal-identity-and-about-pages.md#a1)),
and there the "URN" row of the Plugins page offers no "Settings". <sup>a</sup> <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Switch publisher IDs on or off, per kind of item** | • manager-level roles, on Settings › Workflow › Submission › "Metadata" (Settings bullet 1) <sup>a</sup> |
| **Enable the URN plugin, configure it, "Reassign URNs"** {OJS OMP} | • manager-level roles, on Settings › Website › "Plugins" (Settings bullets 2 to 6; Rule 18) <sup>b</sup> |
| **See the article's "Identifiers" page** {OJS OMP} | • every role that sees the editorial view of the Publication area, while the URN plugin is on for articles (Rule 7); a press keeps listing the page, empty, once the plugin is off (Rule 20). The author view never lists the page ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)) <sup>c</sup> |
| **Assign, type or clear the article's URN** {OJS OMP} | • whoever may edit the publication ([→ edit gate](U40-publication-metadata.md#edit-gate))<br>• anyone else who reaches the page sees it with "Save" greyed, yet is offered "Assign", which fills the box with a URN that cannot be saved and is gone when the page is left ⚠ [A9](#a9). A Layout Editor reaches the page once the submission is in Production; while it is still at the Submission stage, their side menu's "Publication" group is empty ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)) <sup>c</sup> <sup>q1</sup> <sup>s</sup> |
| **Type the article's Publisher ID** | • whoever may save the Metadata page ([→ edit gate](U40-publication-metadata.md#edit-gate)), the Author included, while publisher IDs are on for articles (Rule 2) <sup>d</sup> <sup>q2</sup> |
| **Set a galley's identifiers** {OJS OPS} | • Journal Manager, Editor, Site Administrator, and a Section Editor or production assistant (Layout Editor, Designer, Proofreader…) assigned with access to Production, from the galley row's "Edit" on the Galleys page (Rule 12). On a journal an assigned Section Editor saves the tab whether or not the assignment's "Permissions" box (changes to the publication) is ticked<br>• on a preprint server, also the Author, while they may edit the preprint and it is not yet posted; before posting, a Moderator whose assignment has "Permissions" unticked sees the tab read-only. Once the preprint is posted, the Preprint Server Manager, every assigned Moderator and a Site Administrator may save, and the Author's row menu offers only "View", which opens the window with the tab read-only <sup>e</sup> <sup>q19</sup><br>• a journal's Author is not offered "Edit" on a galley |
| **Set an issue's identifiers, clear its items' URNs, assign its URN while publishing** {OJS} | • the roles that manage issues (manager-level roles), on Issues › "Edit" › "Identifiers" and the row's "Publish Issue" (Rules 15, 16) <sup>f</sup> |
| **Type an issue galley's Publisher ID** {OJS} | • the same roles, in the issue galley's form (Rule 4) <sup>f</sup> |
| **Set a chapter's, publication format's or file's identifiers** {OMP} | • Press Manager, Press Editor, Site Administrator, and an assigned Series Editor or assistant, from the format's or the format file's edit window (Rule 2)<br>• the chapter's window only for whoever may edit the publication ([→ edit gate](U40-publication-metadata.md#edit-gate)); anyone else sees the chapter as plain text, with no window to open <sup>g</sup> |
| **See URNs on the reader pages** {OJS OMP} | • any reader, on a published article's page and an issue's page (journal), and under an approved, available publication format on the book page (press) (Rule 21) <sup>h</sup> |
| **Assign a publication format's URN while approving it** {OMP} | • the roles that approve publication formats, from the format row's "Awaiting Approval" on the Publication Formats page (Rule 16a) <sup>g</sup> |

## Fields & validation

**Settings › Workflow › Submission › "Metadata": "Publisher ID"** <sup>a</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Publisher ID** | No | A group of boxes under the help text "The publisher ID may be used to record the ID from an external database. For example, items exported for deposit to PubMed may include the publisher ID. This should not be used for DOIs." Journal: "Enable for Publications", "Enable for Galleys", "Enable for Issues", "Enable for Issue Galleys". Press: "Enable for Monographs", "Enable for Chapters", "Enable for Publication Formats", "Enable for Files". Preprint server: "Enable for Preprints", "Enable for Galleys". All unticked on a new journal. Saved with the screen's "Save". |

**The URN plugin's settings window** {OJS OMP} (Settings › Website ›
"Plugins", the "URN" row's "Settings"; the window is titled "URN" and
opens with "Please configure the URN plugin to be able to manage and use
URNs in OJS:", on a press "Please configure the URN plug-in to be able to
manage and use URNs in OMP:") <sup>b</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Journal Content** ("Press Content") | Yes, though not starred | "Please select the publishing objects that will have Uniform Resource Names (URN) assigned:", boxes "Issues", "Articles", "Galleys" (press: "Monographs", "Chapters", "Publication Formats", "Files"). With none ticked, "Save" is refused at the top of the window, under "Errors occurred processing this form:", with "Please choose the objects URNs should be assigned to.", once every starred box is valid. A press that ticks only "Chapters" or "Files" is refused the same way ⚠ [OMP1](#omp1). <sup>q15</sup> |
| **URN Prefix** | Yes | The fixed first part, help "The URN prefix is the fix, never changing part of the URN (e.g. "urn:nbn:de:0000-")." Empty, it is refused under the box with "This field is required." Anything not shaped "urn:" in lower case + a name + ":" + more is refused: `urn:nbn:de:0000-` and `urn:x:` pass, `nbn:de:0000-`, `urn:nbn` and `URN:NBN:DE:0000-` do not. The top of the window then reads `The URN prefix pattern must be in the form "urn:"<NID>":"<NSS>.`, but the message under the box and the notice at the top right read `…"urn:"&lt;NID&gt;":"&lt;NSS&gt;."` ⚠ [A10](#a10). <sup>b</sup> |
| **URN Suffix** | Yes, one choice | Three radio choices (Rule 8): "Use default patterns." (preselected on a new journal, with the default patterns listed under it), "Enter an individual URN suffix for each published item. You'll find an additional URN input field on each item's metadata page.", and "Use the pattern entered below to generate URN suffixes…" followed by one box per kind of item ("for issues", "for articles", "for galleys"; press "for monographs", "for chapters", "for publication formats", "for files"). A box can be typed in only while its kind is ticked under Journal Content and the pattern choice is selected; while that choice is selected, every tick in the window raises an error in the page, seen only in the browser's console, though the boxes still turn on and off as they should ⚠ [A11](#a11). With the pattern choice, an empty box for a ticked kind is refused under the box with "This field is required."; a box holding only spaces is refused with a raw text code ⚠ [A8](#a8). <sup>q10</sup> |
| **Check Number** | No | One box: "The check number will be automatically calculated and added at the end, as the last digit of an URN." Unticked on a new journal (Rules 9, 10). <sup>b</sup> |
| **Namespace** | Yes | A list: an empty entry, "urn:nbn:de", "urn:nbn:at", "urn:nbn:ch", "urn:nbn:fi" (journal only), "urn:nbn", "urn". Help: "The persistent identifier namespace usually needed for the registration (e.g. at the Deutsche Nationalbibliothek)." Left on its empty entry, "Save" is refused under the list with "This field is required." The choice is kept with the settings; no screen of the install uses it (read from the code). <sup>q21</sup> |
| **Resolver URL** | Yes | Help "(e.g. https://nbn-resolving.de/)" on a journal, "(e.g. https://nbn-resolving.de)" on a press. Empty, it is refused with "This field is required."; an entry that is not a full web address ("http://localhost", "https://nbn-resolving") with "Please enter a valid URL."; "ftp://example.org/" is accepted. Put in front of the URN to make the reader-page link (Rule 21). <sup>b</sup> |
| **Reassign URNs** | — | A button under "If you change your URN configuration, URNs that have already been assigned will not be affected. Once the URN configuration is saved, use this button to clear all existing URNs so that the new settings will take effect with existing objects." (a press ends "…take effect with all existing objects.") (Rule 18). <sup>b</sup> |

A successful "Save" closes the window with the notice "Your changes have
been saved."; a refused one keeps the window open with the messages. <sup>b</sup>

**The article's "Identifiers" page** {OJS OMP} (workflow › Publication ›
the version › "Identifiers") <sup>c</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **URN** | No | One of two shapes, by the "URN Suffix" choice. **Pattern shape** (default or own patterns): a greyed box that cannot be typed in, with an "Assign" button while it is empty or a "Clear" button while it holds a URN (Rule 9). **Individual shape**: a plain box with the help "The URN must begin with {prefix}." and, while "Check Number" is ticked, an "Add Check Number" button, greyed while the box is empty (Rule 10). Saved with the page's "Save"; refusals in Rule 11. |

**The "Identifiers" tab** of a galley's, an issue's, and on a press a
chapter's, publication format's or format file's edit window. The
windows are the galley row's "Edit" on the Galleys page (a window headed
"Upload a File Ready for Publication", tabs "Edit Metadata" and
"Identifiers"), the issue row's "Edit" on the Issues page, and on a press
"Edit Chapter", the format's "Edit" and a format file's "Edit a file". <sup>e</sup> <sup>f</sup> <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Publisher ID** | No | Present while publisher IDs are on for that kind of item (Rule 2). Refused, with the reason at the top of the tab, when it is only digits, contains "/", on a press's file looks like "12-34", or when another item of the same kind in the journal already has it (Rule 4). An issue's and a press file's value is never kept (Rules 6, 15). <sup>e</sup> |
| **URN** area | — | Present while the URN plugin is on for that kind of item; its states are Rule 12. <sup>e</sup> |
| **Save** | — | Saves both. With a typed URN suffix, the first "Save" keeps the suffix and shows the URN as a preview with the ticked box "Assign the URN to this galley" (chapter, issue…); a second "Save" with the box ticked assigns it (Rules 12, 13). The window closes on success, with no notice. <sup>e</sup> <sup>q23</sup> |

**The issue galley form** {OJS} (Issues › "Edit" › "Issue Galleys") <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Publisher ID** | No | Present while publisher IDs are on for issue galleys. Refused when it is only digits or when another issue galley of the journal has it: the form stays open, unchanged, and a notice at the top right of the page gives the reason ("The public identifier '{value}' must not be a number.", "The public identifier '{value}' already exists for another object of the same type. Please choose unique identifiers for the objects of the same type within your journal."). A "/" is accepted. On a new issue galley a value that is not only digits makes the save fail on the server ⚠ [OJS1](#ojs1). The issue galleys list shows a "Publisher ID" column whether or not publisher IDs are on for issue galleys. <sup>q11</sup> |

## Rules & state

**Publisher IDs**

1. **Two identifiers, both optional, both off by default.** Nothing on
   a new journal carries a publisher ID field or a URN; each is switched
   on per kind of item (Settings that modify behavior). DOIs are
   configured and assigned elsewhere and never appear on the screens of
   this feature. <sup>a</sup> <sup>b</sup>
2. **Where the "Publisher ID" field appears.** Ticking a kind under
   "Publisher ID" adds the field to that kind's screen; unticking it
   removes the field. A value saved while the field was shown is kept
   and returns when the kind is ticked again (an issue's and a press
   file's value is never kept at all: Rules 6, 15). <sup>d</sup> <sup>q3</sup>

   | Box | Where the field appears |
   |-----|-------------------------|
   | "Enable for Publications" ("Monographs", "Preprints") | the Publication area's "Metadata" page, "Publisher ID" ([Publication metadata](U40-publication-metadata.md)) |
   | "Enable for Galleys" {OJS OPS} | the galley window's "Identifiers" tab (Rule 12) |
   | "Enable for Issues" {OJS} | the "Edit" issue window's "Identifiers" tab (Rule 15) |
   | "Enable for Issue Galleys" {OJS} | the issue galley form |
   | "Enable for Chapters", "Enable for Publication Formats", "Enable for Files" {OMP} | the "Identifiers" tab of the chapter window, the publication format window, and a format file's "Edit" window |

3. **The article's Publisher ID is plain text.** One value per version,
   saved with the Metadata page. Any text is accepted: digits alone, a
   "/", and a value another article already carries ⚠ [A3](#a3). <sup>d</sup>
4. **Publisher IDs on the tabs and the issue galley form are checked.**
   On an "Identifiers" tab a value that is only digits, contains "/", on
   a press's file looks like "12-34", or is already held by another item
   of the same kind in the journal (galley by galley, chapter by
   chapter) is refused and nothing is saved; the issue galley form
   refuses digits alone and a duplicate, but accepts "/" (Fields). The
   tab comes back with the typed value, the window stays open, and a box
   at the top of the tab reads "Errors occurred processing this form"
   with the reason: <sup>e</sup> <sup>q4</sup>
   - "The public identifier '{value}' must not be a number."
   - "The pattern "/" is not allowed for the public identifier."
   - "The pattern '/^(\d+)-(\d+)$/' i.e. 'number-number' is not allowed
     for the public identifier." (a press's file)
   - "The public identifier '{value}' already exists for another object
     of the same type. Please choose unique identifiers for the objects
     of the same type within your journal." (a press "…within your
     press.", a preprint server "…within your server.")
5. **A saved publisher ID cannot be removed on a tab.** On a galley's, a
   chapter's or a publication format's tab, emptying the box and
   pressing "Save" closes the window as a success, and the old value is
   back when the tab is reopened ⚠ [A2](#a2). <sup>e</sup> <sup>q5</sup>
6. **A press file's publisher ID is not kept** {OMP}. On a format file's
   "Identifiers" tab, "Save" closes the window as a success, but the
   "Publisher ID" box is empty when the tab is reopened, whatever the
   value ⚠ [OMP5](#omp5). The tab still refuses the values of Rule 4.
   <sup>g</sup>

**URNs** {OJS OMP}

7. **Switching URNs on.** URNs exist while the "URN" plugin is enabled on
   Settings › Website › "Plugins" and its settings are saved with at
   least one kind ticked. The article's "Identifiers" page is listed
   under each version while "Articles" ("Monographs") is ticked; the
   tabs and windows of Rules 12 to 16a show a URN area for the kinds
   ticked. When the page is listed at all is the workflow screen's rule
   ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)).
   <sup>b</sup> <sup>c</sup>
8. **How a URN is made.** A URN is the prefix followed by a suffix, and
   with "Check Number" ticked one more digit. The suffix comes from the
   "URN Suffix" choice: <sup>b</sup>
   - **Default patterns**: on a journal the journal's initials in lower
     case, then ".v{volume}i{number}" of the article's issue, then
     ".{article number}", the submission's number atop its workflow page
     (not the version's), and for a galley ".g{galley number}", the last
     number in its "Downloads" link's address on the article's page (an
     issue alone ends after the issue part); on a press
     "{press initials}.{monograph number}", then ".c{chapter number}" for
     a chapter, ".{format number}" for a publication format and
     ".{file number}" for a file, although the settings window announces
     the format number before the file's ⚠ [OMP6](#omp6).
   - **Own patterns**: the typed pattern, with the placeholders the
     settings window lists: "%j" journal initials, "%v" volume, "%i"
     issue number, "%Y" year, "%a" the article ID, "%g" the galley ID,
     "%f" the file ID, "%p" page number, and "%x" "Custom Identifier",
     which takes the item's publisher ID (a saved "%j.%x" gives
     "…jpk.pid77"). A press's list differs and is shown there.
   - **Individual suffix**: typed item by item (Rules 10, 12).
9. **The article's URN, pattern shape.** On the "Identifiers" page the
   URN box is greyed. While it is empty and every piece the pattern
   needs is known, "Assign" fills it with the URN (Rule 8), check digit
   included when ticked. While a piece is missing there is no "Assign",
   and the box carries "You can not generate a URN until this
   publication has been assigned to an issue." under the default
   patterns on a journal, or "You can not generate a URN because one or
   more parts of the URN pattern are missing data. You may need to assign
   the publication to an issue, set a publisher ID or enter page
   numbers." under own patterns. "Clear" empties the box and asks
   nothing. Neither button saves: the URN is stored, or removed, by
   "Save", and leaving the page before "Save" asks nothing and drops the
   change. <sup>c</sup>
10. **The article's URN, individual shape.** The box takes any text.
    "Add Check Number" appends one digit to what is typed ⚠ [A6](#a6).
    "Save" stores the box as it stands. <sup>c</sup> <sup>q8</sup>
11. **What "Save" refuses on the "Identifiers" page.** A URN that does
    not begin with the prefix is refused with "The URN must begin with
    {prefix}." under the box; one another submission's article already
    carries is refused with "The given URN suffix is already in use for
    another published item. Please enter a unique URN suffix for each
    item." <sup>q18</sup> The article's own stored URN, saved again,
    draws the same refusal ⚠ [A4](#a4). A URN that differs from another
    only in case passes: with "urn:nbn:de:0000-e2e2" on one article,
    another article saves "urn:nbn:de:0000-E2E2" ⚠ [A12](#a12). An empty
    box is accepted and removes the URN. The page's error summary is the
    publication pages' own
    ([Publication metadata](U40-publication-metadata.md)). <sup>c</sup> <sup>q6</sup>
12. **The URN area of an "Identifiers" tab.** On a galley, an issue, and
    a press's chapter, format or file, the area headed "URN" is in one
    of four states: <sup>e</sup>
    - **Not stored, pattern choice, every piece known**: the URN it
      would get, then "What you see is a preview of the URN. Select the
      checkbox and save the form to assign the URN." and a ticked box
      "Assign the URN to this {item}" ⚠ [A7](#a7). <sup>q9</sup>
    - **Not stored, pattern choice, a piece missing** (a galley whose
      article has no issue, for instance): the pattern with its
      unfilled placeholders and "The URN cannot be assigned because it
      contains an unresolved pattern."
    - **Not stored, individual suffix**: "A URN suffix can take any
      form, but must be unique among all publishing objects with the
      same URN prefix assigned:", a greyed "URN Prefix" box, a "URN
      Suffix" box and, with "Check Number" ticked, an "Add Check Number"
      button [A6](#a6); pressed while the "URN Suffix" box is empty,
      that button writes "NaN" into it ⚠ [A13](#a13). With no suffix
      saved yet the area reads "The URN cannot be assigned because the
      custom suffix is missing."; once a suffix is saved, the preview
      sentence and the ticked box of the first state are added under the
      box. A suffix another item of the same kind already uses is
      refused: the tab shows "Errors occurred processing this form" and
      "The given URN suffix is already in use for another published
      item. Please enter a unique URN suffix for each item." (even when
      that item is not published), keeps the typed suffix and stays
      open; nothing is saved. <sup>q23</sup>
    - **Stored**: the URN, "The URN is assigned to this {item}." and a
      "Clear" link.
    {item} is "galley", "issue" (press: "chapter", "publication
    format", "file").
13. **Saving the tab assigns the URN.** "Save" with the box ticked
    stores the URN shown. The box arrives ticked, so a "Save" made for
    another reason, a publisher ID change for one, assigns the URN too.
    Once stored, a URN no longer follows the suffix or the pattern:
    changing the settings or the item's data leaves it as it is until
    it is cleared. <sup>e</sup> <sup>q14</sup>
14. **"Clear" on a tab.** It asks "Are you sure you wish to delete the
    existing URN?" in a window titled "Delete", with "OK" and "Cancel".
    "OK" removes the URN at once, without "Save"; "Cancel" keeps it. An
    issue's tab then shows a not-stored state at once; a galley's or a
    chapter's tab keeps showing the removed URN, "The URN is assigned to
    this {item}." and "Clear" until the window is closed and opened
    again ⚠ [A14](#a14). <sup>e</sup> <sup>q25</sup>
15. **An issue's "Identifiers" tab** {OJS}. The "Edit" issue window
    lists "Identifiers" after "Issue Galleys" while publisher IDs are on
    for issues or the URN plugin is enabled. The tab holds: <sup>f</sup> <sup>q12</sup>
    - the issue's "Publisher ID", which is never kept: "Save" closes the
      window as a success, but the box is empty when the tab is
      reopened; digits and "/" are still refused (Rule 4) ⚠ [OJS3](#ojs3);
    - its URN area (Rule 12) while "Issues" is ticked;
    - while "Articles" or "Galleys" is ticked, under a "URN" heading,
      "Use the following option to clear URNs of all objects (articles
      and galleys) currently scheduled for this issue." with a "Clear
      Issue Objects URNs" link. That link asks "Are you sure you wish to
      delete the existing issue objects URNs?" ("OK" / "Cancel"); "OK"
      removes the URN of every version and every galley of the articles
      in the issue.
16. **Publishing an issue assigns its URN** {OJS}. With "Issues" ticked,
    the "Publish Issue" window shows, under "Are you sure you want to
    publish the new issue?", the issue's URN area: "The URN {urn} has
    been assigned." when one is stored; otherwise a ticked box "Assign
    the URN {urn} to this issue"; or, when none can be made, "The URN
    cannot be assigned because the custom suffix is missing." or "The URN
    {urn} cannot be assigned because it contains an unresolved pattern."
    "OK" with the box ticked publishes the issue and stores its URN;
    with the box unticked, or with no box, it publishes the issue with
    no URN. The window's email box is the issue feature's. <sup>f</sup> <sup>q20</sup>

16a. **Approving a format assigns its URN** {OMP}. With "Publication
    Formats" ticked, the format row's "Awaiting Approval" on the
    Publication Formats page opens "Format Approval" ("Approve the
    metadata for this format. Metadata can be checked from the Edit panel
    for each format.") with the format's "URN" area: "The URN {urn} has
    been assigned." when one is stored, otherwise a ticked box "Assign
    the URN {urn} to this publication format". "OK" with the box ticked
    approves the format and stores its URN. <sup>g</sup>

17. **Publishing an article assigns nothing.** No URN is made when an
    article is published or scheduled; the confirmation window only
    reports ([→ Publish, schedule & versions](U49-publish-schedule-and-versions.md)).
    With "Articles" ticked it adds, while all requirements are met:
    "The URN for this publication will be {urn}." when the version has
    one, and a warning "A URN has not been assigned to this publication."
    when it has none. With "Galleys" ticked it shows a table instead,
    headed "URN" and "Item": a "Publication" row while "Articles" is
    ticked, and one row per galley ("Galley: {label}"), "Unassigned"
    with a warning sign where there is none. A press always shows the
    table ⚠ [OMP4](#omp4), with a "Publication" row and, for each ticked
    kind, one row per chapter ("Chapter: {title}"), per format
    ("Publication Format: {name}") and per production-ready file
    ("Files: {file name}"). <sup>c</sup> <sup>q16</sup>
18. **"Reassign URNs".** The settings window's button asks "Are you sure
    you wish to delete all existing URNs?" ("OK" / "Cancel"); "OK"
    removes every URN of the journal, published items included. The
    settings window stays open and nothing on screen says the URNs are
    gone. Pattern-built URNs can then be assigned again under the
    current settings; typed suffixes are kept and are assigned again
    from the tab. <sup>b</sup> <sup>q17</sup>
19. **A new version takes the identifiers along.** "Create New Version"
    copies the article's URN and Publisher ID into the new version
    [A4](#a4). <sup>q6</sup> Each galley's copy keeps its publisher ID
    and URN ⚠ [A5](#a5). <sup>c</sup> <sup>q7</sup>
20. **Switching the plugin off hides, and keeps.** With the "URN" plugin
    disabled, no screen shows a URN: the tabs' URN areas and the reader
    blocks go, and so does the "Identifiers" page on a journal (a press
    keeps an empty one, a finding of the workflow screen's spec). The stored URNs are kept and return when the
    plugin is enabled again. <sup>b</sup> <sup>q13</sup>
21. **What readers see.** A published article's page shows a "URN"
    heading with a link whose text and target are the resolver address
    followed by the URN ("https://nbn-resolving.de/urn:nbn:de:0000-…").
    A journal's issue page shows "URN:" with the same kind of link for an
    issue that has one. On a press, a URN shows only under a publication
    format that is approved and available ("Available" in its row on the
    Publication Formats page), on the book page, labelled "other::urn"
    rather than "URN" and not linked ⚠ [OMP2](#omp2); the monograph's own
    URN is not shown ⚠ [OMP3](#omp3). No reader page shows a publisher ID
    or a galley's URN. <sup>h</sup> <sup>q22</sup>

## Side effects

- **Page tags.** A published article's URN is also written into the
  page's search-engine tags ("DC.Identifier.URN", "citation_urn"), and
  a published monograph's URN into "DC.Identifier.URN" only, while
  those plugins are on; the tags are *Search-engine metadata &
  analytics*'s. <sup>h</sup>
- **JATS XML** {OJS}. The article's generated JATS XML carries the
  article's own numbers (the submission's and the version's) as its
  publisher IDs, never the typed Publisher ID ⚠ [OJS2](#ojs2). <sup>i</sup> <sup>q24</sup>
- **Exports.** Publisher IDs and URNs are read by the export and
  registration plugins (*Import & export*, *DOIs*). <sup>i</sup>
- **Activity Log.** Each "Save" on the "Identifiers" page or the
  Metadata page adds "Submission metadata updated" to the submission's
  Activity Log, as every Publication page's "Save" does; a press file's
  tab adds "The metadata for file "{file name}" was edited by
  {username}.". The galley, issue and format tabs and a tab's "Clear"
  add nothing. <sup>e</sup>
- **Nothing else.** Setting, assigning or clearing an identifier sends
  no email and adds no task. <sup>e</sup>

## Settings that modify behavior

1. **"Publisher ID"** (Settings › Workflow › Submission › "Metadata"):
   one box per kind of item (Fields). Default: none ticked. Ticked: the
   kind's screen gains the "Publisher ID" field (Rules 2 to 6);
   unticked, the field is gone and saved values are kept.
2. **The "URN" plugin** {OJS OMP} (Settings › Website › "Plugins",
   "Public Identifier Plugins", the "URN" row): default disabled, no
   URN anywhere. Enabled and saved with a kind ticked: URNs for that kind
   (Rule 7). Disabled again: URNs hidden and kept (Rule 20).
3. **"Journal Content" / "Press Content"** {OJS OMP} (the plugin's
   settings): default none ticked. "Articles"/"Monographs" lists the
   "Identifiers" page (Rule 7); "Galleys", "Issues" and the press's
   kinds add the URN area to their tabs and windows (Rules 12, 15,
   16a) and their rows to the confirmation table (Rule 17).
4. **"URN Suffix"** {OJS OMP}: default "Use default patterns." (the
   pattern shape, Rules 8, 9, 12); "Enter an individual URN suffix…"
   gives the individual shape (Rules 10, 12); "Use the pattern entered
   below…" the pattern shape with the typed patterns (Rule 8).
5. **"Check Number"** {OJS OMP}: default unticked. Ticked: every URN
   made from a pattern ends in a check digit, and the individual shape
   gains "Add Check Number" (Rules 9, 10, 12).
6. **"Resolver URL"** {OJS OMP}: no default; the address in front of the
   URN in the reader link (Rule 21).

## Cross-feature interactions

- *[Publication metadata](U40-publication-metadata.md)*: owns the
  Metadata page, its "Publisher ID" field row, the settings screen that
  holds "Publisher ID", and the edit gate the "Identifiers" page follows
  ([→ edit gate](U40-publication-metadata.md#edit-gate)). This spec owns
  the "Publisher ID" boxes and what a publisher ID does.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)*:
  owns when the "Identifiers" page is listed, including a press that
  keeps it after the plugin is turned off. This spec owns what the page
  holds.
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  owns the confirmation window and "Create New Version". This spec owns
  the URN note inside the window (Rule 17) and what a new version copies
  (Rule 19).
- [Galleys](U46-galleys.md): owns the Galleys page and the galley window.
  This spec owns its "Identifiers" tab.
- [Issues](U50-issues.md): owns the Issues pages, the "Edit" issue
  window, the issue galley form and "Publish Issue" with its email box.
  This spec owns the "Identifiers" tab, the issue galley's "Publisher
  ID" and the URN step of "Publish Issue" (Rules 15, 16).
- [Plugins management](U62-plugins-management.md): owns the Plugins page,
  enabling and disabling. This spec owns the "URN" plugin's settings window.
- [Article landing page & reading](U13-article-landing-page-and-reading.md),
  [Monograph landing page](U69-monograph-landing-page.md): own the reader pages. This spec owns
  the URN blocks on them (Rule 21).
- [DOIs](U45-dois.md): DOIs, their settings and their registration.
- [Import & export](U63-import-export.md) reads both identifiers,
  [Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)
  the URN (Side effects); [JATS & Body Text](U48-jats-and-body-text.md) writes
  the article's own numbers as its publisher IDs and reads neither.
- *[Submission activity log & notes](U38-submission-activity-log-and-notes.md)*:
  owns the Activity Log; this spec owns which identifier saves add a
  line to it (Side effects).
- *Publication formats & proof terms* {OMP} (no spec yet): owns the
  Publication Formats page, "Format Approval" and a format's
  availability. This spec owns the URN step of "Format Approval"
  (Rule 16a).

## Canonical scenarios

Every scenario runs on a scratch journal, press or preprint server with
throwaway accounts, because the seeded journal keeps every identifier
setting at its default, off. The accounts, passwords and tooling recipe
are in the footnote. <sup>s</sup>

1. **Switch publisher IDs on and type them**

   Given: Journal Manager, on a scratch journal at the install defaults,
   with a scratch submission that carries two galleys, "PDF" and "HTML"
   (journal, preprint server).

   - **The "Publisher ID" boxes**: open Settings › Workflow › Submission
     › "Metadata": the group "Publisher ID" carries the help text "The
     publisher ID may be used to record the ID from an external database.
     For example, items exported for deposit to PubMed may include the
     publisher ID. This should not be used for DOIs." and the boxes
     "Enable for Publications", "Enable for Galleys", "Enable for Issues"
     and "Enable for Issue Galleys" (press: "Enable for Monographs",
     "Enable for Chapters", "Enable for Publication Formats", "Enable for
     Files"; preprint server: "Enable for Preprints", "Enable for
     Galleys"), all unticked. Tick "Enable for Publications" ("Enable for
     Monographs", "Enable for Preprints") and, on a journal or preprint
     server, "Enable for Galleys", and press "Save" (Fields; Settings
     bullet 1).
   - **The Metadata page**: open the submission's workflow, then its
     Publication area, then "Metadata": it shows a "Publisher ID" box;
     type "pid-a1" and press "Save"; reload: the box holds "pid-a1"
     (Rules 2, 3).
   - **A galley's publisher ID** (journal, preprint server): open the
     Publication area's "Galleys", the "PDF" row's "Edit", then the
     "Identifiers" tab: it holds a "Publisher ID" box. Type "12345" and
     press "Save": the window stays open, and a box at the top of the tab reads "Errors occurred
     processing this form" with "The public identifier '12345' must not be
     a number."; replace it with "a/b" and press "Save": "The pattern "/"
     is not allowed for the public identifier."; replace it with "pid-g1"
     and press "Save": the window closes with no notice; open the tab
     again: the box holds "pid-g1" (Rule 4).
   - **A publisher ID another galley has** (journal, preprint server):
     open the "HTML" row's "Edit", then "Identifiers"; type "pid-g1" and
     press "Save": the window stays open with "The public identifier
     'pid-g1' already exists for another object of the same type. Please
     choose unique identifiers for the objects of the same type within
     your journal." ("…within your server.") at the top of the tab
     (Rule 4).
   - **The Activity Log**: the submission's Activity Log has gained one
     "Submission metadata updated" line, from the Metadata page's "Save",
     and none from the galley's saves; no email about these saves reached
     the mail catcher (Side effects).
   - **Switched off and on again**: on Settings › Workflow › Submission ›
     "Metadata" untick the boxes you ticked and press "Save": the Metadata
     page shows no "Publisher ID", and the "PDF" galley's window shows
     none either. Tick them again and press "Save": the Metadata page holds
     "pid-a1" again, and the "PDF" galley's "Identifiers" tab "pid-g1"
     (Rule 2; Settings bullet 1).
   - **Control**: before the first "Save" on Settings, the Metadata page
     showed no "Publisher ID" (Rules 1, 2). <sup>s</sup>

2. **Configure the URN plugin** {OJS OMP}

   Given: Journal Manager, on a scratch journal with the "URN" plugin
   disabled (the install default), with a scratch submission.

   - **The plugin**: open Settings › Website › "Plugins": under "Public
     Identifier Plugins" the "URN" row is unticked. Tick it to enable the
     plugin, then open the row's "Settings" (Settings bullet 2).
   - **The window as it opens**: it is titled "URN" and opens with
     "Please configure the URN plugin to be able to manage and use URNs in
     OJS:" ("Please configure the URN plug-in to be able to manage and
     use URNs in OMP:" on a press). "Journal Content" ("Press Content")
     offers "Issues", "Articles" and "Galleys" (press: "Monographs",
     "Chapters", "Publication Formats", "Files"), all unticked; under "URN
     Suffix" "Use default patterns." is chosen, with the default patterns
     listed under it; "Check Number" is unticked; the "Namespace" list
     offers an empty entry, "urn:nbn:de", "urn:nbn:at", "urn:nbn:ch",
     "urn:nbn:fi" (journal only), "urn:nbn" and "urn"; the window ends with
     the "Reassign URNs" button (Fields, the URN plugin's settings window;
     Settings bullets 3–5).
   - **Required boxes left empty**: tick "Articles" ("Monographs") and
     press "Save" with everything else as it arrived: the window stays
     open, and "This field is required." shows under "URN Prefix", under
     "Namespace" and under "Resolver URL" (Fields).
   - **A resolver address that is not a full web address**: type
     "urn:nbn:de:0000-" in "URN Prefix", choose "urn:nbn:de" in
     "Namespace", type "https://nbn-resolving" in "Resolver URL" and press
     "Save": "Please enter a valid URL." shows under "Resolver URL" and the
     window stays open (Fields).
   - **A prefix not shaped "urn:…:"**: replace the resolver address with
     "https://nbn-resolving.de/" and the prefix with "nbn:de:0000-", and
     press "Save": the window stays open, and its top reads `The URN
     prefix pattern must be in the form "urn:"<NID>":"<NSS>.` ([A10](#a10))
     (Fields).
   - **No kind ticked**: put the prefix back to "urn:nbn:de:0000-", untick
     "Articles" ("Monographs") and press "Save": the top of the window
     reads "Errors occurred processing this form:" with "Please choose the
     objects URNs should be assigned to." (Fields).
   - **Saved**: tick "Articles" ("Monographs") again and press "Save": the
     window closes with the notice "Your changes have been saved."
     (Fields).
   - **The other side**: open the submission's workflow, then its
     Publication area: the version now lists "Identifiers" (Rule 7).
   - **Control**: before the successful "Save", with the plugin already
     enabled, the same Publication area listed no "Identifiers" (Rule 7).
     <sup>s</sup>

3. **Assign an article's URN and publish it** {OJS OMP}

   Given: Journal Manager and a Layout Editor, on a scratch journal with
   the initials "JPK" and the "URN" plugin on for "Articles"
   ("Monographs") under "Use default patterns.", "Check Number"
   unticked, the prefix "urn:nbn:de:0000-" and the resolver address
   "https://nbn-resolving.de/"; on a journal, a published issue Vol. 1
   No. 2 (2026); a scratch submission in Production, assigned to no
   issue, with the Layout Editor assigned to it.

   - **No issue yet** {OJS}: open the submission's workflow, then its
     Publication area, then "Identifiers": the "URN" box is greyed and
     cannot be typed in, there is no "Assign", and the box carries "You
     can not generate a URN until this publication has been assigned to
     an issue." (Rule 9). A press needs no issue: its page offers
     "Assign" from the start.
   - **Assigned to an issue** {OJS}: on the Publication area's
     "Publication Settings" page choose "Assign To Current/Back Issue",
     pick "Vol. 1 No. 2 (2026)" in "Issue" and save (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*);
     back on "Identifiers" the box offers "Assign" (Rule 9).
   - **Assign, then leave**: press "Assign": the box fills with
     "urn:nbn:de:0000-jpk.v1i2.{article number}" (press:
     "urn:nbn:de:0000-{press initials}.{monograph number}") and "Clear"
     takes the place of "Assign". Open "Metadata" and come back to
     "Identifiers": nothing asked on the way, the box is empty and
     "Assign" is back (Rules 8, 9).
   - **Assign and save**: press "Assign", then "Save"; reload: the box
     holds the URN, with "Clear". The submission's Activity Log has gained
     a "Submission metadata updated" line (Rule 9; Side effects).
   - **"Clear" alone saves nothing**: press "Clear": the box empties and
     nothing is asked; reload without saving: the box holds the URN again
     (Rule 9).
   - **"Clear" and "Save"**: press "Clear", then "Save"; reload: the box
     is empty and offers "Assign" (Rules 9, 11).
   - **The Layout Editor**: the Layout Editor opens the same page: "Save"
     is greyed, though "Assign" is still offered ([A9](#a9)) (Actors
     row 4).
   - **No URN in the confirmation window**: Journal Manager: press
     "Schedule For Publication" ("Publish" on a press); on a journal the
     "Review Publishing Details" panel opens first: choose "Version of
     Record" as Publication Stage and "Major Revision" as Revision
     Significance, and Confirm (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*).
     The confirmation window carries the warning "A URN has not been
     assigned to this publication." (press: a table headed "URN" and
     "Item" with one row, "Publication", reading "Unassigned"
     ([OMP4](#omp4))). Close the window without confirming (Rule 17).
   - **The URN in the confirmation window**: on "Identifiers" press
     "Assign", then "Save". Press "Schedule For Publication" ("Publish")
     again: the confirmation window reads
     "The URN for this publication will be
     urn:nbn:de:0000-jpk.v1i2.{article number}." (press: the "Publication"
     row shows the URN). Confirm: the submission is published (Rule 17).
   - **The reader's page** {OJS}: open the published article's page: a
     "URN" heading with a link whose text and target are
     "https://nbn-resolving.de/urn:nbn:de:0000-jpk.v1i2.{article number}"
     (Rule 21; Settings bullet 6). A press's book page does not show the
     monograph's URN ([OMP3](#omp3)).
   - **The plugin switched off and on**: on Settings › Website ›
     "Plugins" untick the "URN" row: the article's page shows no URN, and
     the published version's Publication area lists no "Identifiers" (a
     press keeps listing an empty one). Tick the row again: the article's
     page shows the URN link again (press: the "Identifiers" page holds
     the URN again) (Rule 20; Settings bullet 2).
   - **"Reassign URNs"**: open the "URN" row's "Settings" and press
     "Reassign URNs": it asks "Are you sure you wish to delete all
     existing URNs?"; press "OK": the settings window stays open and
     nothing on screen says the URNs are gone. Open the article's page: it
     shows no URN (press: the "Identifiers" page's box is empty)
     (Rule 18).
   - **Control**: right before the plugin was switched off, and again
     right before "Reassign URNs", the article's page showed the URN link
     (press: the "Identifiers" page held the URN) (Rules 20, 21).
     <sup>s</sup>

4. **Type URNs item by item** {OJS OMP}

   Given: Journal Manager, on a scratch journal with the "URN" plugin on
   for "Articles" and "Galleys" ("Monographs" on a press) under "Enter
   an individual URN suffix for each published item. You'll find an
   additional URN input field on each item's metadata page.", "Check
   Number" ticked and the prefix "urn:nbn:de:0000-", with two scratch
   submissions, each carrying a galley "PDF" on a journal.

   - **The typed box**: open the first submission's workflow, then its
     Publication area, then "Identifiers": the "URN" box is a plain box
     with the help "The URN must begin with urn:nbn:de:0000-." and an "Add
     Check Number" button, greyed while the box is empty (Fields, the
     article's "Identifiers" page).
   - **Without the prefix**: type "e2e2" and press "Save": "The URN must
     begin with urn:nbn:de:0000-." shows under the box; reload: the box is
     empty (Rule 11).
   - **With a check number**: type "urn:nbn:de:0000-abc" and press "Add
     Check Number": one digit is added at the end of the box
     ([A6](#a6)); press "Save"; reload: the box holds
     "urn:nbn:de:0000-abc" with that digit (Rule 10).
   - **Another article's URN**: open the second submission's
     "Identifiers", type the first submission's URN, its digit included,
     and press "Save": "The given URN suffix is already in use for another
     published item. Please enter a unique URN suffix for each item."
     (Rule 11).
   - **A galley's suffix** {OJS}: open the first submission's "Galleys",
     the "PDF" row's "Edit", then "Identifiers": the "URN" area reads "A
     URN suffix can take any form, but must be unique among all
     publishing objects with the same URN prefix assigned:", with a greyed
     "URN Prefix" box, a "URN Suffix" box, an "Add Check Number" button
     and "The URN cannot be assigned because the custom suffix is
     missing." Type "g1" in "URN Suffix" and press "Save": the window
     closes. Open the tab again: under the box stand "What you see is a
     preview of the URN. Select the checkbox and save the form to assign
     the URN." and a ticked box "Assign the URN to this galley"
     ([A7](#a7)); press "Save": the window closes. Open the tab again: the
     area shows the URN, "The URN is assigned to this galley." and a
     "Clear" link (Rules 12, 13; Fields, the "Identifiers" tab).
   - **A suffix another galley uses** {OJS}: open the second submission's
     "PDF" galley, "Identifiers"; type "g1" in "URN Suffix" and press
     "Save": the tab shows "Errors occurred processing this form" with
     "The given URN suffix is already in use for another published item.
     Please enter a unique URN suffix for each item.", keeps "g1" and
     stays open (Rule 12).
   - **Control**: on the second submission's "Identifiers" page replace
     the refused URN with "urn:nbn:de:0000-xyz" and press "Save"; reload:
     the box holds "urn:nbn:de:0000-xyz" (Rules 10, 11). <sup>s</sup>

5. **A galley's URN from the default pattern** {OJS}

   Given: Journal Manager, on a scratch journal with the initials "JPK",
   publisher IDs on for galleys, and the "URN" plugin on for "Articles"
   and "Galleys" under "Use default patterns." with "Check Number"
   ticked and the prefix "urn:nbn:de:0000-"; a published issue Vol. 1
   No. 2 (2026); a scratch submission assigned to no issue, carrying a
   galley "PDF".

   - **A piece missing**: open the submission's workflow, then its
     Publication area, then "Galleys", the "PDF" row's "Edit", then
     "Identifiers": the tab holds a "Publisher ID" box and an area headed
     "URN" that shows the pattern with its issue placeholders unfilled
     and "The URN cannot be assigned because it contains an unresolved
     pattern." (Rule 12).
   - **Assigned to an issue**: on the Publication area's "Publication
     Settings" page choose "Assign To Current/Back Issue", pick "Vol. 1
     No. 2 (2026)" in "Issue" and save (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*).
     Open the galley's "Identifiers" tab again: the area shows
     "urn:nbn:de:0000-jpk.v1i2.{article number}.g{galley number}"
     followed by one check digit, then "What you see is a preview of the
     URN. Select the checkbox and save the form to assign the URN." and a
     ticked box "Assign the URN to this galley" ([A7](#a7)) (Rules 8, 12;
     Settings bullet 5).
   - **A publisher ID save assigns the URN too**: type "pid-g3" in
     "Publisher ID" and press "Save", the box left ticked as it arrived:
     the window closes with no notice. Open the tab again: "Publisher ID"
     holds "pid-g3", and the area shows the URN, "The URN is assigned to
     this galley." and a "Clear" link (Rules 12, 13).
   - **The confirmation window**: press "Schedule For Publication"; in
     the "Review Publishing Details" panel choose "Version of Record" as
     Publication Stage and "Major Revision" as Revision Significance, and
     Confirm (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*):
     the confirmation window shows a table headed "URN" and "Item", with
     a "Publication" row reading "Unassigned" beside a warning sign and a
     "Galley: PDF" row with the galley's URN. Close the window without
     confirming (Rule 17).
   - **"Clear"**: on the galley's "Identifiers" tab press "Clear": a
     window titled "Delete" asks "Are you sure you wish to delete the
     existing URN?"; press "Cancel": the URN stays. Press "Clear" again,
     then "OK": the URN is removed at once, without "Save", although the
     tab keeps showing it until the window is closed ([A14](#a14)). Close
     the window and open the tab again: the preview and the ticked box
     are back (Rule 14).
   - **Control**: press "Schedule For Publication" again: the
     confirmation window's "Galley: PDF" row now reads "Unassigned"
     (Rule 17). Close it without confirming.
     <sup>s</sup>

6. **An issue's URN** {OJS}

   Given: Journal Manager, on a scratch journal with the initials "JPK",
   publisher IDs on for issues, and the "URN" plugin on for "Issues",
   "Articles" and "Galleys" under "Use default patterns.", "Check Number"
   unticked, the prefix "urn:nbn:de:0000-" and the resolver address
   "https://nbn-resolving.de/"; two unpublished issues, Vol. 1 No. 2
   (2026) and Vol. 1 No. 3 (2026); a scratch submission assigned to no
   issue, carrying a galley "PDF".

   - **The issue's "Identifiers" tab**: on the Issues page open Vol. 1
     No. 2's "Edit": the window lists "Identifiers" after "Issue
     Galleys". Open it: it holds a "Publisher ID" box; an area headed
     "URN" showing "urn:nbn:de:0000-jpk.v1i2", "What you see is a preview
     of the URN. Select the checkbox and save the form to assign the URN."
     and a ticked box "Assign the URN to this issue" ([A7](#a7)); and,
     under a "URN" heading, "Use the following option to clear URNs of all
     objects (articles and galleys) currently scheduled for this issue."
     with a "Clear Issue Objects URNs" link. Close the window without
     saving (Rules 8, 12, 15).
   - **"Publish Issue"**: press Vol. 1 No. 2's "Publish Issue": under "Are
     you sure you want to publish the new issue?" the window shows a
     ticked box "Assign the URN urn:nbn:de:0000-jpk.v1i2 to this issue";
     press "OK" (Rule 16).
   - **The issue's page**: open the issue's page on the journal's
     public site, signed out: it shows
     "URN:" with a link whose text and target are
     "https://nbn-resolving.de/urn:nbn:de:0000-jpk.v1i2" (Rule 21). Back
     on the Issues page, the issue's "Edit" › "Identifiers" shows the
     URN, "The URN is assigned to this issue." and a "Clear" link
     (Rule 12).
   - **An article with its URN in the issue**: on the submission's
     "Publication Settings" page choose "Assign To Current/Back Issue",
     pick "Vol. 1 No. 2 (2026)" in "Issue" and save (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*).
     On its "Identifiers" page press "Assign", then "Save"; on the "PDF"
     galley's "Identifiers" tab press "Save" with the box ticked as it
     arrived; reopened, the tab reads "The URN is assigned to this
     galley." (Rules 9, 13).
   - **"Clear Issue Objects URNs"**: on Vol. 1 No. 2's "Edit" ›
     "Identifiers" press "Clear Issue Objects URNs": it asks "Are you sure
     you wish to delete the existing issue objects URNs?"; press "OK".
     The article's "Identifiers" page now shows an empty box with
     "Assign", and the galley's tab shows the preview with the ticked box
     again (Rule 15).
   - **The issue's own "Clear"**: on the issue's "Identifiers" tab press
     "Clear": a window titled "Delete" asks "Are you sure you wish to
     delete the existing URN?"; press "Cancel": the URN stays. Press
     "Clear" again, then "OK": the tab shows the preview and the ticked
     box at once. The issue's page shows no "URN:" (Rules 14, 21).
   - **Control**: press Vol. 1 No. 3's "Publish Issue", untick "Assign
     the URN urn:nbn:de:0000-jpk.v1i3 to this issue" and press "OK": the
     issue is published, and its page shows no "URN:" (Rules 16, 21).
     <sup>s</sup>

7. **A preprint's galley before and after posting** {OPS}

   Given: an Author, a Moderator and the Preprint Server Manager, on a
   scratch preprint server with publisher IDs on for galleys, with two
   of the Author's preprints, each carrying a galley "PDF" and each
   assigned to the Moderator with the assignment's "Permissions" box
   unticked: one not yet posted, the other posted.

   - **The Author, before posting**: the Author opens the unposted
     preprint from My Submissions, then its "Galleys": the "PDF" row's menu
     offers "Edit"; open it, then "Identifiers", type "pid-au1" in
     "Publisher ID" and press "Save": the window closes; open the tab
     again: the box holds "pid-au1" (Actors row 6).
   - **The Author, after posting**: on the posted preprint's "Galleys"
     the "PDF" row's menu offers only "View", which opens the window with
     the "Identifiers" tab read-only (Actors row 6).
   - **The Moderator, before posting**: the Moderator opens the unposted
     preprint's "PDF" galley, "Identifiers": the tab is read-only
     (Actors row 6).
   - **The Moderator, after posting**: on the posted preprint's "PDF"
     galley, "Identifiers", the Moderator types "pid-m1" in "Publisher ID"
     and presses "Save": the window closes; open the tab again: the box
     holds "pid-m1" (Actors row 6).
   - **No URN on a preprint server**: the Preprint Server Manager opens
     Settings › Website › "Plugins": "Public Identifier Plugins" lists no
     "URN" (Purpose).
   - **Control**: the Preprint Server Manager opens the unposted
     preprint's "PDF" galley, "Identifiers": the box holds "pid-au1" and
     can be typed in (Actors row 6). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for OJS1 (issue report
    `docs/issues/U44-OJS1-new-issue-galley-publisher-id-server-error.md`):
    "Create Issue Galley" with a Publisher ID saving the galley, and a
    Publisher ID another issue galley already has refused with its notice
  - the guard for A4 (issue report
    `docs/issues/U44-A4-article-own-urn-refused-as-in-use.md`): an
    article's "Identifiers" page saving its own URN a second time and on
    a new version, and a URN another article carries refused
  - the guard for OJS3 and OMP5 (issue report `docs/issues/U44-OJS3-OMP5
    -issue-and-press-file-publisher-id-never-kept.md`): an issue's and a
    press file's Publisher ID saved and read back on the reopened
    "Identifiers" tab
  - the guard for OMP5 (issue report `docs/issues/U44-OMP5-press-file-re
    fused-publisher-id-box-vanishes.md`): a press file's "Identifiers"
    tab keeping the "Publisher ID" box after a refused value
  - the guard for A6 (issue report
    `docs/issues/U44-A6-urn-check-digit-from-suffix-only.md`): "Add
    Check Number" on `urn:nbn:de:0000-abc` giving
    `urn:nbn:de:0000-abc2`, the whole-URN digit, and "Assign" matching
    the tab's own preview rule
  - the guard for A2 (issue report
    `docs/issues/U44-A2-publisher-id-on-tab-never-removed.md`): a
    galley's and a chapter's "Publisher ID" saved, emptied and saved,
    and the reopened tab empty
  - the guard for A9 (issue report
    `docs/issues/U44-A9-urn-assign-offered-without-edit-rights.md`): a
    participant whose "Save" is greyed on the "Identifiers" page (a
    Layout Editor) finding "Assign" greyed too
  - the guard for A5 (issue report
    `docs/issues/U44-A5-new-version-galley-publisher-id-refused.md`): a
    galley's and a chapter's Publisher ID set, "Create New Version", and
    the copy's "Identifiers" tab saving with the copied ID
  - the guard for A11 (issue report
    `docs/issues/U44-A11-urn-settings-pattern-choice-script-error.md`):
    the URN settings window under "Use the pattern entered below…", a
    kind and "Check Number" ticked, with no page error
  - the guard for A13 (issue report
    `docs/issues/U44-A13-check-number-empty-urn-suffix-nan.md`): a
    galley's "Identifiers" tab greying "Add Check Number" while "URN
    Suffix" is empty
  - the guard for A14 (issue report
    `docs/issues/U44-A14-cleared-urn-stays-on-tab.md`): "Clear" › "OK"
    on a galley's and a chapter's "Identifiers" tab redrawing the tab at
    once without the URN
  - the guard for A7 (issue report
    `docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md`): a galley's
    "Identifiers" tab whose assign box names the URN it will assign
  - the guard for A8 (issue report
    `docs/issues/U44-A8-urn-suffix-pattern-spaces-raw-text-code.md`):
    the URN settings window refusing a pattern box of spaces with
    "Please enter the URN suffix pattern for …", not a text code
  - the guard for OMP1 (issue report `docs/issues/U44-OMP1-urn-settings-
    chapters-files-alone-refused.md`): a press's URN settings saving
    with only "Chapters", only "Files", or those two ticked
  - the guard for A10 (issue report
    `docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md`):
    the URN settings window refusing `nbn:de:0000-` with
    `"urn:"<NID>":"<NSS>` under the box and at the top, no written-out
    codes
  - the guard for OMP2 (issue report
    `docs/issues/U44-OMP2-book-page-format-urn-code-label.md`): the book
    page showing an approved, available format's URN under "URN", linked
    to the resolver
  - the guard for OMP6 (issue report
    `docs/issues/U44-OMP6-press-file-default-urn-no-format-number.md`):
    a format file's "Identifiers" tab previewing its default URN with
    the format number, `…{press}.{monograph}.{format}.{file}`
  - the guard for OMP4 (issue report
    `docs/issues/U44-OMP4-press-publish-window-urn-table.md`): a press
    with only "Monographs" ticked seeing the URN sentence, not the
    one-row table, in the "Publish" window
- **Rarely met**:
  - a Site Administrator without a manager role in the journal: Settings
    reached on a journal only, and there the "URN" row without "Settings"
    (Actors, opening paragraph; Actors row 2)
- **Nothing new to test**:
  - "Use the pattern entered below…" with typed patterns, "%x" taking the
    item's publisher ID (Settings bullet 4; Rule 8)
  - "Galleys" ticked without "Articles": the confirmation window's table
    with galley rows only (Rule 17)
- **Register carries it**:
  - OJS3 (an issue's Publisher ID never kept; Rule 15)
  - OJS1 (a new issue galley with a Publisher ID failing; Fields, the
    issue galley form)
  - A2 (a publisher ID emptied on a tab coming back; Rule 5)
  - OMP5 (a press file's Publisher ID never kept; Rule 6)
  - A4 (the article's own URN refused on a later "Save"; Rule 11)
  - A13 ("Add Check Number" on an empty tab suffix writing "NaN";
    Rule 12)
  - A14 (a galley's or a chapter's tab still showing a cleared URN;
    Rule 14; scenario 5 passes it)
  - A4 and A5 (a new version copying the URN and the galleys' publisher
    IDs, then refusing their saves; Rule 19)
  - A6 (the check digit of "Add Check Number" and "Assign" differing
    from the app's own; Rule 10; scenario 4 passes it)
  - A12 (a URN differing from another only in case accepted; Rule 11)
  - A8, A10 and A11 (the settings window's raw text code, written-out
    angle brackets and failing page script; Fields, the URN plugin's
    settings window; scenario 2 passes A10)
  - OMP6 (a press file's default URN without the format number; Rule 8)
- **No seed**:
  - an issue galley's "Publisher ID" on an existing issue galley, its
    refusal notices, "/" accepted, and "Enable for Issue Galleys"
    (Actors row 8; Fields, the issue galley form; Settings bullet 1)
  - the "Identifiers" tabs of a press's chapters, publication formats
    and format files, with "Enable for Chapters", "Enable for
    Publication Formats" and "Enable for Files" (Actors row 9; Rule 2;
    Settings bullet 1)
  - the chapter's window only for whoever may edit the publication
    (Actors row 9)
  - the URN kinds "Chapters", "Publication Formats" and "Files" ticked
    on a press (Settings bullet 3)
  - "Format Approval" assigning a publication format's URN (Actors
    row 11; Rule 16a)
  - a press's confirmation table with a row per chapter, format and
    file (Rule 17)
  - the book page's URN under an approved, available publication format
    (Rule 21; OMP2, OMP3)
- **Owned by another feature**:
  - the author view never listing "Identifiers" (Actors row 3;
    *Workflow screen & stage access*, scenario 7)
  - a Layout Editor's empty "Publication" group while the submission is
    at the Submission stage (Actors row 4; *Workflow screen & stage
    access*, its A2)
  - the Author typing the Publisher ID on the Metadata page (Actors
    row 5; *Publication metadata*'s edit gate, scenario 3)
  - a journal's Author offered no "Edit" on a galley (Actors row 6;
    *Galleys*)
  - the URN in the page's search-engine tags (Side effects;
    *Search-engine metadata & analytics*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | A Publisher ID saved on a galley's, chapter's or format's "Identifiers" tab cannot be removed | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A4](#a4) | The Identifiers page refuses an article's own URN as "already in use" when saved again or on a new version | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A5](#a5) | After "Create New Version", a galley's or chapter's Identifiers tab refuses its own copied Publisher ID | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | "Add Check Number" and "Assign" end URNs with the wrong check digit | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | On an item's "Identifiers" tab, the box that assigns the URN does not name the URN | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A8](#a8) | URN settings: a suffix pattern of spaces is refused with a raw text code instead of a message | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A9](#a9) | "Assign" fills the URN box for a participant whose "Save" is greyed on the "Identifiers" page | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A10](#a10) | URN settings: a refused "URN Prefix" shows "&amp;lt;NID&amp;gt;" codes under the box and in a notice | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A11](#a11) | URN settings window: every click under the pattern choice raises a page script error | 🐞 | low · crash: script | issues (claude), 2026-10-02 — re-verified |
| [A13](#a13) | "Add Check Number" on an item's "Identifiers" tab writes "NaN" into an empty URN suffix box | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A14](#a14) | A galley's or chapter's "Identifiers" tab keeps showing a URN after "Clear" has removed it | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS1](#ojs1) | A new issue galley with a Publisher ID is not saved: "Save" stays greyed with no message | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [OJS3](#ojs3) | An issue's Publisher ID is never kept | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OMP1](#omp1) | A press cannot save URN settings with only "Chapters" or "Files" ticked | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP2](#omp2) | Book page: a publication format's URN is labelled "other::urn" and is not linked | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP4](#omp4) | Publishing a book with only monograph URNs shows a one-row URN table instead of the URN sentence | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP5](#omp5) | A press file's Publisher ID is never kept | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OMP6](#omp6) | A press file's URN leaves out its format number, and file patterns leave "%f" unfilled | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A3](#a3) | An article's Publisher ID accepts values the tabs refuse, a duplicate included | ❓ | minor | — |
| [A12](#a12) | A URN that differs from another only in case is accepted as new | ❓ | minor | — |
| [OJS2](#ojs2) | The JATS XML's publisher ID is the article's number, not the typed Publisher ID | ❓ | minor | — |
| [OMP3](#omp3) | Readers never see a monograph's URN | ❓ | user-visible | — |
| [A1](#a1) | Retired: an "Identifiers" tab refuses without saying why | ✅ | retired | — |

### All apps

<a id="a2"></a>
**A2 — A Publisher ID saved on a galley's, chapter's or format's "Identifiers" tab cannot be removed** · 🐞 · medium.
An editor empties the "Publisher ID" box on a galley's, a chapter's or a
publication format's "Identifiers" tab and presses "Save". The window
closes as it does after any successful save, but the ID is not removed:
when the tab is opened again, the old value is back. Nothing tells the
editor that the removal did not take. The ID can be changed to another
value, but never emptied. The ID left behind stays in the Native XML
export, still blocks the same value on other items, and goes into any
URN or DOI generated later from a pattern that uses "%x". It affects
journals and preprint servers that tick "Enable for Galleys", and
presses that tick "Enable for Chapters" or "Enable for Publication
Formats", under Settings › Workflow › "Metadata" › "Publisher ID"; all
are off by default. The article's, monograph's or preprint's own
Publisher ID, on the "Metadata" page, empties normally.
Basis: probe, 2026-10-02. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The article's Publisher ID takes what the tabs refuse** · ❓ · minor.
On the Metadata page an article's Publisher ID accepts digits alone, a
"/", and a value another article already carries. On the "Identifiers"
tabs digits alone and "/" are refused, and so is a value another
galley, chapter or publication format already has (Rule 4); the issue
galley form accepts "/". The tabs' rules date from when a publisher ID
could stand in for an item's number in its web address, which survives
only for a press's files, whose publisher ID cannot be set on any screen
([OMP5](#omp5)).
Question: should an article's publisher ID be unique in the journal,
and should the tabs keep refusing digits and "/"? Lean: require
uniqueness for articles too, and keep the digit and "/" rules only
where the ID is part of an address (a press's files).
Basis: probe, 2026-09-24. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The Identifiers page refuses an article's own URN as "already in use" when saved again or on a new version** · 🐞 · medium.
An editor presses "Save" on an article's "Identifiers" page with the URN
the article already carries. The save is refused with "The given URN
suffix is already in use for another published item. Please enter a
unique URN suffix for each item." This happens on every new version,
which inherits the URN from the version before it. Once any new version
has been made on the site, it also happens on the second save of every
submission's first version created after that; the first save of a URN
passes. Nothing is lost, and the version still publishes with its URN.
But the message tells the editor to change a correct persistent
identifier, and on a new version there is no way to save the page with
its URN. The same check can also let a real duplicate through silently,
though only in a rare coincidence. It needs the URN plugin with URNs on
for articles (monographs on a press).
Basis: probe, 2026-10-02. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — After "Create New Version", a galley's or chapter's Identifiers tab refuses its own copied Publisher ID** · 🐞 · medium.
An editor makes a new version of an article or preprint whose galley has
a Publisher ID, or of a book whose chapter or publication format has
one. Each galley, chapter and format of the new version starts with the
same Publisher ID as the one it was copied from. When the editor opens
the copy's "Identifiers" tab and presses "Save", the save is refused:
"The public identifier '…' already exists for another object of the same
type." The other object is the same galley in the earlier version. The
refusal comes back on every save until the Publisher ID is changed to a
new value, so the new version cannot keep the item's ID. On a journal or
press that uses URNs for these items, the URN on the same tab cannot be
assigned meanwhile. A Publisher ID can be set on these items only while
"Enable for Galleys" ("Enable for Chapters", "Enable for Publication
Formats") is ticked under Settings › Workflow › "Metadata", and all
three are off by default.
Basis: probe, 2026-10-02. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — "Add Check Number" and "Assign" end URNs with the wrong check digit** · 🐞 · medium.
A journal or press can have the URN plugin add a check digit to every
URN ("Check Number", off by default). The digit is meant to cover the
whole URN, prefix included. Two buttons in the browser work it out from
the part after the prefix alone, so the URNs they make usually end in
the wrong digit. With the prefix `urn:nbn:de:0000-`, "abc" becomes
"abc0" where the whole URN gives "abc2". The two buttons are "Assign",
on a submission's "Identifiers" page, and "Add Check Number", on that
page and on the "Identifiers" tab of an issue, galley, chapter,
publication format or file. The URNs the server makes from a pattern are
right: the tabs' previews, "Publish Issue" and "Format Approval".
Nothing on screen says the digit is wrong: the URN is saved as shown and
appears on the reader pages as a link to the resolver. For "Assign"
there is no way round, because the box cannot be typed in.
Basis: probe, 2026-10-02. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — On an item's "Identifiers" tab, the box that assigns the URN does not name the URN** · 🐞 · low.
On the "Identifiers" tab of a galley, an issue, or a press's chapter,
format or file, a URN that is not yet assigned comes with a ticked box
that assigns it on "Save". The box reads "Assign the URN to this
galley", with the item's kind as the last word. It should read "Assign
the URN urn:nbn:de:0000-… to this galley". The same box in the "Publish
Issue" window names the URN. Nothing is lost: the URN that will be
assigned is shown just above the box, as a preview or in the prefix and
suffix boxes. In a few languages whose sentence attaches an ending or
punctuation to the URN (Turkish, Azerbaijani, Georgian among them), that
ending is left standing alone in the label.
Basis: probe, 2026-10-02. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — URN settings: a suffix pattern of spaces is refused with a raw text code instead of a message** · 🐞 · low.
In the URN plugin's settings window, a manager can choose "Use the
pattern entered below…" and type a suffix pattern for each content type
that gets URNs (issues, articles and galleys on a journal; monographs,
chapters, publication formats and files on a press). When a ticked
type's pattern box holds only spaces, "Save" is refused, rightly. But
the message under each such box and in the list at the top of the window
is a raw text code, such as
"##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##",
instead of "Please enter the URN suffix pattern for articles." Every
content type shows its own code. The cause is that the form asks for
message keys that no locale file defines, so the fix is to name the
right keys.
Basis: probe, 2026-10-02. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — "Assign" fills the URN box for a participant whose "Save" is greyed on the "Identifiers" page** · 🐞 · low.
Some participants may open an article's or monograph's "Identifiers"
page but may not change the publication: a Layout Editor, a Copyeditor,
a Proofreader, or a section editor whose assignment does not allow
changes to the publication. For them "Save" is greyed, but the URN
field's "Assign" stays active. Pressing it fills the URN box as if the
URN had been assigned, and "Clear" takes the place of "Assign". Nothing
is sent: the box is empty again the next time the page opens. The
participant is offered a step they cannot finish, and only the greyed
"Save" hints that the URN was never assigned. It needs the URN plugin,
which is off until a manager turns it on, with URNs for articles
(monographs on a press) and the suffix left at "Use default patterns.",
the choice its settings start with. OPS has no URN plugin. DOIs are not
affected: since 3.4 they are assigned on the "DOIs" page, which only
managers open (3.3 is in the Cause).
Basis: probe, 2026-10-02. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — URN settings: a refused "URN Prefix" shows "&amp;lt;NID&amp;gt;" codes under the box and in a notice** · 🐞 · low.
In the URN plugin's settings window, a "URN Prefix" that does not start
with "urn:", a name and a colon is refused on "Save", rightly. The list
at the top of the window explains it as `The URN prefix pattern must be
in the form "urn:"<NID>":"<NSS>.`, but the message under the box reads
`…"urn:"&lt;NID&gt;":"&lt;NSS&gt;.`, with the angle brackets written out
as codes. When the manager corrects the prefix and saves, the window
closes with "Your changes have been saved.", and a notice at the top
right repeats the refusal with the same codes. The list at the top reads
correctly, and a prefix such as `urn:nbn:de:0000-` saves.
Basis: probe, 2026-10-02. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — URN settings window: every click under the pattern choice raises a page script error** · 🐞 · low · crash: script.
In the URN plugin's settings window, the window's own script fails
whenever "Use the pattern entered below…" is the selected suffix choice.
A script error, seen only in the browser's console, comes with each of
these: clicking that choice, clicking a box under "Journal Content"
("Press Content") or "Check Number", and opening the window once the
choice is saved. Nothing else goes wrong: each kind's pattern box still
becomes editable or greyed as it should, and "Save" stores the settings.
Preprint servers have no URN plugin, so they never meet it.
Basis: probe, 2026-10-02. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A URN that differs only in case counts as new** · ❓ · minor.
With "urn:nbn:de:0000-e2e2" on one article, another article saves
"urn:nbn:de:0000-E2E2" on its "Identifiers" page: the "already in use"
check (Rule 11) treats the two as different URNs.
Question: should the check ignore case? Lean: yes if the national
library's resolver treats the two as one URN, since the second would
then fail registration; that one answer settles it.
Basis: probe, 2026-09-24. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — "Add Check Number" on an item's "Identifiers" tab writes "NaN" into an empty URN suffix box** · 🐞 · low.
A journal or press can let editors type each item's URN suffix by hand
(the URN plugin's "Enter an individual URN suffix…" setting) and have
the app add a check digit ("Check Number"). On the "Identifiers" tab of
a galley, an issue, a chapter, a publication format or a submission
file, "Add Check Number" pressed while "URN Suffix" is empty writes
"NaN" into the box. The article's or monograph's "Identifiers" page
greys the same button while its box is empty. Nothing refuses the value:
"Save" keeps "NaN" as the suffix, and the item's URN is then built from
it, ending in "NaN". OPS has no URN plugin.
Basis: probe, 2026-10-02. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A galley's or chapter's "Identifiers" tab keeps showing a URN after "Clear" has removed it** · 🐞 · medium.
An editor opens the "Identifiers" tab of a galley, a chapter, a
publication format or a book file, and presses "Clear" › "OK" beside its
URN. The URN is removed at once, but the tab keeps showing it, with "The
URN is assigned to this galley." and "Clear", until the window is closed
and opened again. An issue's tab shows the change at once, except in a
journal that requires subscriptions: there the issue's window has one
more tab, "Access", and the page reloads that tab instead of
"Identifiers". An editor who trusts the tab may think "Clear" failed.
Pressing "Clear" again does no harm. Pressing "Save" on the out-of-date
tab does: when the URN plugin uses individual suffixes, it erases the
suffix the editor typed, without a message. It needs the URN plugin,
which is off until a manager turns it on, with URNs for one of these
objects. OPS has no URN plugin; on 3.3 the DOI plugin's "Clear" on the
same tabs, OPS galleys included, acts the same way.
Basis: probe, 2026-10-02. <sup>f-a14</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — A new issue galley with a Publisher ID is not saved: "Save" stays greyed with no message** · 🐞 · medium · crash: server.
A Journal Manager adds a galley to an issue and types a Publisher ID in
"Create Issue Galley". On "Save" the request fails on the server. The
window stays open with a spinner beside a greyed "Save", no message
appears, and the galley is not added. The upload and the typed fields
are lost when the window is cancelled. There is a way round: save the
galley without a Publisher ID, then open its "Edit" and add the
Publisher ID there, which works. Nothing on screen points to it. It
happens only on journals that turned on publisher IDs for issue galleys,
and on every new issue galley with a Publisher ID there.
Basis: probe, 2026-10-02. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — The JATS XML's publisher ID is not the typed one** · ❓ · minor.
The JATS XML the journal generates for an article names its publisher
ID as the article's own number (and the version's number), whatever
Publisher ID the editor typed on the Metadata page.
Question: should the generated JATS carry the typed Publisher ID when
there is one? Lean: yes, it is the value the field's help text says
exports carry; the article's number can stay when none is typed.
Basis: probe, 2026-09-24. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — An issue's Publisher ID is never kept** · 🐞 · medium.
A manager who types a Publisher ID on an issue's "Identifiers" tab and
presses "Save" sees the window close as a success, but the box is empty
when the tab is reopened, and the value is kept nowhere: the issue's
stored record has no place for it, and a Native XML import drops it the
same way. Digits and "/" are still refused with the tab's message.
"Enable for Issues" offers a field that keeps nothing.
Basis: probe, 2026-10-02. <sup>f-ojs3</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press cannot save URN settings with only "Chapters" or "Files" ticked** · 🐞 · low.
A press manager who ticks only "Chapters", only "Files", or only those
two under "Press Content" in the URN plugin's settings window cannot
save. "Save" keeps the window open with "Please choose the objects URNs
should be assigned to." Ticking "Monographs" or "Publication Formats" as
well lets the save through. On a journal, any one of "Issues",
"Articles" or "Galleys" ticked alone saves. Preprint servers have no URN
plugin.
Basis: probe, 2026-10-02. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — Book page: a publication format's URN is labelled "other::urn" and is not linked** · 🐞 · low.
Under an approved, available publication format on a press's book page,
the format's URN is shown under the label "other::urn" and as plain
text. A journal's article page labels a URN "URN" and links it to the
resolver, which is what readers expect. It shows wherever the URN plugin
is on with "Publication Formats" ticked and a format has an assigned
URN. On 3.3, a format's DOI is shown the same way, under the label "doi"
and unlinked, wherever the DOI plugin assigns DOIs to publication
formats.
Basis: probe, 2026-10-02. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — Readers never see a monograph's URN** · ❓ · user-visible.
A press can assign a URN to a monograph on its "Identifiers" page, but
the book page shows only the URNs of publication formats; the
monograph's URN reaches only the page's hidden search-engine tag (Side
effects). A journal's article page shows the article's URN.
Question: should the book page show the monograph's URN? Lean: yes, as
a journal does, labelled "URN" and linked to the resolver.
Basis: probe, 2026-09-24. <sup>f-omp3</sup>

<a id="omp4"></a>
**OMP4 — Publishing a book with only monograph URNs shows a one-row URN table instead of the URN sentence** · 🐞 · low.
A press can choose to assign URNs to monographs only: in the URN
plugin's settings, "Monographs" is then the only box ticked under "Press
Content". The settings window opens with no box ticked, so this is the
press's own choice, not a default. When an editor at such a press clicks
"Publish", the window shows a table headed "URN" and "Item" with one
row, "Publication", reading "Unassigned" or the book's URN. The window
is meant to show one line instead: the warning "A URN has not been
assigned to this publication." when the book has no URN yet, or "The URN
for this publication will be …" when it has one. A journal with only
"Articles" ticked gets that line, and a monographs-only press got it too
until a 2023 change to the plugin. The fix is one condition in OMP's URN
plugin.
Basis: probe, 2026-10-02. <sup>f-omp4</sup>

<a id="omp5"></a>
**OMP5 — A press file's Publisher ID is never kept** · 🐞 · medium.
On a format file's "Edit a file" › "Identifiers", "Save" closes the
window as a success, but the "Publisher ID" box is empty when it is
reopened, whatever the value: the file's stored record has no place for
it. The values Rule 4 refuses ("12345", "a/b", "12-34") are still
refused, and after such a refusal the box disappears from the tab,
leaving only the message, "Cancel" and "Save", until the window is
closed and opened again; a format's own tab keeps its box.
Basis: probe, 2026-10-02. <sup>f-omp5</sup>

<a id="omp6"></a>
**OMP6 — A press file's URN leaves out its format number, and file patterns leave "%f" unfilled** · 🐞 · medium.
A press that gives URNs to files and keeps "Use default patterns." is
told by the URN settings window that a file's URN is "%p.%m.%f.%s":
press initials, book, publication format, file. A format file's
"Identifiers" tab instead previews and assigns "urn:nbn:de:0000-{press
initials}.{book}.{file}", with no format number. Formats and chapters
get the URNs the window lists for them. A press that writes its own file
pattern with "%f", which the window describes as "the publication format
id", gets the "%f" left in. The file's URN tab then refuses to assign it
("The URN cannot be assigned because it contains an unresolved
pattern."). A file DOI made from a custom pattern with "%f" is assigned
with "%f" in it ("10.1234/jpk.5.%f.41"), under "Items successfully
assigned new DOIs". File DOIs under the "Default" DOI format are not
affected.
Basis: probe, 2026-10-02. <sup>f-omp6</sup>

### Retired

<a id="a1"></a>
**A1 — An "Identifiers" tab refuses without saying why** · ✅ · retired. Overturned by the drive of 2026-09-24: every tab names the reason at its top (Rule 4). <sup>f-a1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-24 at the checkouts' tips: ojs `71bb244152`, omp
`a365518044`, ops `07141ae4df`, each on lib/pkp `25182919bf` and
ui-library `1afd40a911`. Every claim was then driven on 2026-09-24 on
scratch journals, presses and preprint servers in all three apps, as the
roles each note names; notes q1 to q25 held the author's open questions
before the drive and now record what the screens showed. The URN plugin
(`plugins/pubIds/urn`) exists in OJS and OMP only; OPS has no
`plugins/pubIds` directory.

<a id="fn-a"></a>
**a** — Publisher ID settings: each app's
`classes/components/forms/context/MetadataSettingsForm.php` (extends
lib/pkp `PKPMetadataSettingsForm`, rendered on Settings › Workflow ›
Submission › "Metadata" by `lib/pkp/templates/management/workflow.tpl`,
tab `submission.informationCenter.metadata`) adds `FieldOptions
enablePublisherId`, label `submission.publisherId` "Publisher ID",
description `submission.publisherId.description`, options
`submission.publisherId.enable` "Enable for {$objects}" with OJS
`submission.publications` "Publications" / `submission.layout.galleys`
"Galleys" / `issue.issues` "Issues" / `editor.issues.galleys` "Issue
Galleys" (values `publication`, `galley`, `issue`, `issueGalley`); OMP
`common.publications` "Monographs" / `submission.chapters` "Chapters" /
`monograph.publicationFormats` "Publication Formats" / `submission.files`
"Files" (`publication`, `chapter`, `representation`, `file`); OPS
`submission.publications` "Preprints" (OPS locale) / "Galleys"
(`publication`, `galley`). The context schema declares no default, so a
new context has none ticked. Manager-level roles and Settings:
`users.md` (`editor` and `productionEditor` carry `ROLE_ID_MANAGER`) and
the `permitSettings` role option (scenarios.md `roles`). DOIs:
`lib/pkp/classes/doi`, the *DOIs* feature, no code path shared with the
pub-id plugins (`other::urn`, `publisher-id`). Live-probed 2026-09-24 (Purpose; Actors preamble, rows 1–2; Fields,
the "Publisher ID" group; Rule 1; Settings bullet 1), all three apps:
the group's help text and boxes read as quoted, all unticked on a new
context and on the seeded journal; no DOI field on any screen of this
feature. The Journal/Press Manager, Editor and Production Editor reach
Settings › Workflow and Website › "Plugins"; with "Permit changes to
Settings" unticked on the role the Editor and the Production Editor land
on the access-denied page, as do the Section Editor, Layout Editor and
Author; on a preprint server the manager reaches both, the Moderator and
the Author do not. A Site Administrator whose manager role was ended on
their own edit page (Copyeditor kept; Editorial Board Member on a
preprint server) reached both pages on a journal, every "Publisher ID"
box editable and the "URN" row offering "Delete" and "Upgrade" but no
"Settings", and the access-denied page on a press and a preprint server.
Left with a box unticked and unsaved, Settings › Workflow keeps the
change across a tab switch and drops it, asking nothing, when the page
is left (that form's own behavior).

<a id="fn-b"></a>
**b** — URN plugin: `plugins/pubIds/urn/URNPubIdPlugin.php` (lazy-load,
`version.xml`), category `plugins.categories.pubIds` "Public Identifier
Plugins", display name `plugins.pubIds.urn.displayName` "URN";
`PKPPubIdPlugin::getActions()` offers `manager.plugins.settings`
"Settings" only while enabled; the settings window is an `AjaxModal`
titled with the display name. Form `classes/form/URNSettingsForm.php` +
`templates/settingsForm.tpl` + `js/URNSettingsFormHandler.js` (disables a
pattern box unless the pattern radio is checked and its `enable…URN` box
is ticked). Checks: `FormValidatorCustom urnObjects` (OJS: issue ||
publication || representation; OMP the same three names, so chapter and
file never count, basis of OMP1), `FormValidatorRegExp urnPrefix`
`/^urn:[a-zA-Z0-9-]*:.*/` (`…form.urnPrefixPattern`), per-kind
`…form.urn{Kind}SuffixPatternRequired` (basis of A8),
`FormValidatorUrl urnResolver` (`…form.urnResolverRequired`). Suffix
radio: `urnSuffixDefault` checked unless the stored value is `pattern`
or `customId`. Namespace list from `URNSettingsForm::fetch()` (OMP lacks
`urn:nbn:fi`), `required="true"` on the select and no server check;
`urnNamespace` is read nowhere else in either app. Save:
`PKPPubIdPlugin::manage()` verb `save` → `createTrivialNotification(…
NOTIFICATION_TYPE_SUCCESS)` (`common.changesSaved`); verb `clearPubIds`
→ `JournalDAO::deleteAllPubIds()` (galleys, submission files, issues,
publications) / `PressDAO::deleteAllPubIds()` (chapters, formats,
submission files, publications), whatever the item's status. Hidden
while disabled: `register()` adds the schema fields and hooks only when
`getEnabled()`, and every display loops over
`PluginRegistry::loadCategory('pubIds', true, …)`, the enabled plugins;
the stored `pub-id::other::urn` rows are not touched by disabling.
Locale strings: `plugins/pubIds/urn/locale/en/locale.po` of each app.
The labels "Journal Content", "Articles", "Monographs", "URN Prefix"
were also read on screen by the workflow-screen spec's drive of
2026-09-02. Live-probed 2026-09-24 (Actors preamble, row 2; Fields, the settings
window; Rules 7, 8, 18, 20; Settings bullets 2–6), OJS and OMP, OPS as
control: the "URN" row's "Settings" appears only once the plugin is
enabled; the window's texts, boxes and refusals read as quoted;
`urn:nbn:de:0000-` and `urn:x:` saved, `nbn:de:0000-`, `urn:nbn` and
`URN:NBN:DE:0000-` refused; "Journal Content" carries no asterisk while
"URN Prefix", "Namespace" and "Resolver URL" do; a refused save kept the
window open (after a server refusal the intro line shows twice); the
default pattern built `urn:nbn:de:0000-jpk.v1i2.545` (OJS) and
`urn:nbn:de:0000-pkp.513` (OMP), the submission's number and not the
version's (OJS 545/561 as `workflowSubmissionId`/`publication_…`, OMP
513/525); on the article whose galley previewed `….546.g9`, the reader
page's "Downloads" link "PDF" pointed to `…/article/view/546/9`
(ccK2 p-06); the own pattern `%j.%x` with the
Publisher ID "pid77" built `…jpk.pid77`; the "Identifiers" page was not
listed before the settings were first saved. OPS: the "Public Identifier
Plugins" heading has no rows. Rules 18 and 20: notes q17, q13.

<a id="fn-c"></a>
**c** — The article's page: `useWorkflowNavigationConfig{OJS,OMP}.js`
push `identifiers` (`submission.identifiers` "Identifiers") when
`publicationSettings.identifiersEnabled`, computed in
`PKPDashboardHandler::index()` as "some `pubIds` plugin
`isObjectTypeEnabled('Publication')`" (URN: `enablePublicationURN`);
`workflowConfigEditorialOJS.js` `identifiers` renders
`WorkflowPublicationForm formName:'identifier'` with `canEdit:
permissions.canEditPublication` (`canSubmit`); the form comes from
`PKPSubmissionController::getPublicationIdentifierForm()` (403
`api.publications.403.noEnabledIdentifiers` with no enabled plugin),
`PKPPublicationIdentifiersForm` (empty; fields added by the plugin's
`Form::config::before` hook `addPublicationFormFields()`). Pattern shape:
`FieldPubIdUrn` (extends ui-library `FieldPubId.vue`: input `:disabled`
while a pattern exists, "Assign" (`plugins.pubIds.urn.editor.urn.assignUrn`)
while `canGenerateId && !currentValue`, "Clear"
(`…clearObjectsURN`) while a value, the missing-parts line otherwise;
`generateId()` fills %i %v %x %Y %j %a %b %p, OMP `isPForPress` %p %m),
default pattern OJS `%j.v%vi%i.%a` with `missingIssue`, OMP `%p.%m`;
issue number, volume and year come from the publication's `issueId`.
Individual shape: `FieldTextUrn` with `…editor.urn.description` "The URN
must begin with {$prefix}." and `addCheckNumberLabel`
`…editor.addCheckNo` "Add Check Number". Save → `PUT` publication →
`Repo::publication()->validate()` → hook `Publication::validate` →
`validatePublicationUrn()`: `…editor.missingPrefix` when the value does
not start with `urnPrefix`, `getNotUniqueErrorMsg()`
(`…urnSuffixCustomIdentifierNotUnique`) when `checkDuplicate()` finds it;
an empty value returns early and is saved. Publish notice:
`addPublishFormNotice()` on form id `publish` (`PublishForm`, opened by
`lib/pkp/controllers/modals/publish/PublishHandler.php`), skipped when
`$form->errors`; strings `…preview.publication`,
`…preview.publication.none`, `submission.status.unassigned`
"Unassigned", `…preview.objects` "Item", `…preview.galleys`
"Galley: {$galleyLabel}", the row label "Publication" a literal. No
publish path calls `assignPubId` for URNs. Versions:
`PKPPublication Repository::version()` clones the publication (every
`pub-id::*` setting copied), OJS `classes/publication/Repository.php`
clones each galley. Live-probed 2026-09-24 (Actors rows 3–4; Fields, the "Identifiers"
page; Rules 7, 9–11, 17, 19), OJS and OMP, OPS as control: the page is
headed "Publication: Identifiers" and listed under each version while
"Articles" ("Monographs") is ticked, not with a non-article kind alone;
the Author's view lists no "Identifiers" and the editorial address as
the Author lands on the access-denied page; on OPS the page is never
listed and its address falls back to the stage. With no issue, "Assign"
was missing and the issue line shown; after "Assign To Current/Back
Issue" (or, with future issues only, "Assign To Future Issue and
Schedule Only") "Assign" appeared; "Clear" asked nothing; leaving the
page with an unsaved "Assign" asked nothing and nothing was stored.
Notes q1, q6, q8, q16, q18.

<a id="fn-d"></a>
**d** — The article's Publisher ID: `PKPMetadataForm` adds `FieldText
pub-id::publisher-id` (label "Publisher ID", tooltip the help text)
while `enablePublisherId` contains `publication`; the publication schema
gives it `nullable` only and no plugin or repository hook validates it.
Hidden and kept: the field is left out of the form, and the stored
setting is not cleared by the context save. The Metadata page's other
fields and its author view are *Publication metadata*'s. Live-probed 2026-09-24 (Actors row 5; Rules 2, 3), all three apps:
"12345", "a/b" and another article's "pid-a1" all saved on the Metadata
page; a new version changed to "pid-v2" left the source's "pid-v1"; an
emptied value saved empty. Notes q2, q3.

<a id="fn-e"></a>
**e** — Galley tab: the Galleys page (`GalleyManager`, row menu
`common.edit` "Edit" → legacy `editGalley`) opens
`templates/controllers/grid/{articleGalleys,preprintGalleys}/editFormat.tpl`,
tab `submission.identifiers` when `enableIdentifiers`
(`in_array('galley', enablePublisherId)` or a plugin
`isObjectTypeEnabled('Representation')`); ops `identifiers`,
`updateIdentifiers`, `clearPubId` of `ArticleGalleyGridHandler` (roles
manager, admin, sub-editor, assistant; `WorkflowStageAccessPolicy`
Production) and OPS `PreprintGalleyGridHandler` (adds the author;
`canEdit()`: admin always, a posted version manager or sub-editor only,
an unsubmitted one always, else `canEditPublication`), the form built
with `isEditable = canEdit()`. OJS author actions: `getAuthorActions()`
in `useGalleyManagerConfig.js` is `GALLEY_LIST` only outside OPS. Form:
lib/pkp `PKPPublicIdentifiersForm` + each app's
`controllers/tab/pubIds/form/PublicIdentifiersForm.php` (sets
`enablePublisherId` per item class) + each app's
`templates/controllers/tab/pubIds/form/publicIdentifiersForm.tpl` ("Publisher
ID" text box, one `getPubIdMetadataFile()` include per enabled plugin,
`fbvFormButtons` "Save"). `validate()`: `ctype_digit` →
`editor.publicIdentificationNumericNotAllowed`; `/` →
`editor.publicIdentificationPatternNotAllowed`; a file and
`/^(\d+)-(\d+)$/` → the same; `anyPubIdExists(…, $assocType, $id, true)`
→ `editor.publicIdentificationExistsForTheSameType`. `execute()` stores
the publisher ID only `if ($this->getData('publisherId'))` (basis of
A2). URN area: `plugins/pubIds/urn/templates/urnSuffixEdit.tpl` (the four
states: `enable{Type}URN`; `customId` or stored → the suffix editor with
`…urnSuffix.description`, a disabled `urnPrefix` box, `urnSuffix`, the
`checkNo` button when `urnCheckNo`, then `…canBeAssigned` +
`urnAssignCheckBox.tpl` or `…customSuffixMissing`; stored → the URN,
`…editor.assigned`, the `clearPubIdLinkActionURN` link "Clear"; else the
preview `getPubId()` + `…canBeAssigned` + box, or
`…patternNotResolved`); `urnAssignCheckBox.tpl` is a checkbox `checked`
labelled `…editor.assignURN` with `pubId=""` passed from
`urnSuffixEdit.tpl` (basis of A7). Save with the box: 
`PKPPubIdPluginHelper::execute()` stores `getPubId()` only while no URN
is stored, after copying the suffix field. Clear:
`URNPubIdPlugin::getLinkActions()` → `RemoteActionConfirmationModal`
(`…clearObjectsURN.confirm`, button `common.delete`) →
`PKPPubIdPluginHelper::clearPubId()` deletes the setting at once. No
mailable or notification call sits on any of these paths; the Activity
Log lines come from the host saves (the publication edit, the file
window's metadata save), not from the identifier code. Live-probed 2026-09-24 (Actors row 6; Fields, the tabs; Rules 4, 5,
12–14; Side effects), OJS and OPS galleys, OJS issues, OMP chapters,
formats and files: the tabs and messages read as quoted (notes q4, q5,
q9, q14, q19, q23, q25); the galley window is headed "Upload a File
Ready for Publication"; a successful "Save" closes the window with no
notice. The Activity Log gained "Submission metadata updated" for each
save of the "Identifiers" page and of the Metadata page (OJS and OMP
four lines for four saves, OPS one) and "The metadata for file
"article.pdf" was edited by {username}." for a press file's tab, and
nothing for the galley, issue and format tabs or a "Clear" › "OK"; no
email reached any account of the context (mail catcher counts
unchanged) and the Tasks count stayed as it was.

<a id="fn-f"></a>
**f** — Issues (OJS): `IssueGridHandler::editIssue()` assigns
`enableIdentifiers` when `in_array('issue', enablePublisherId) ||
count(PluginRegistry::getPlugins('pubIds'))`; `issue.tpl` lists
`editor.issues.identifiers` "Identifiers" after `editor.issues.galleys`;
ops `identifiers`, `updateIdentifiers`, `clearPubId` (reloads
`#identifiersTab`), `clearIssueObjectsPubIds` →
`PubIdPlugin::clearIssueObjectsPubIds()` (every publication and galley
of the issue's submissions). The issue's URN area and the
`clearIssueObjectsPubIdsLinkActionURN` block ("Clear Issue Objects URNs",
`…clearIssueObjectsURN.confirm`, `…clearIssueObjectsURN.description`)
in `urnSuffixEdit.tpl`. Publish: `IssueGridHandler::publishIssue()`
builds `AssignPublicIdentifiersForm` with `approval = true` and
`editor.issues.confirmPublish`; `assignPublicIdentifiersForm.tpl`
includes each plugin's `getPubIdAssignFile()` (`urnAssign.tpl`:
`…assignURN.assigned`, the box with the real `pubId`,
`…assignURN.emptySuffix`, `…assignURN.pattern`) and the
`sendIssueNotification` box; `PKPAssignPublicIdentifiersForm::execute()`
→ `assignPubId()`. Issue galley: `issueGalleyForm.tpl` "Publisher ID"
(`publicGalleyId`) when `enablePublisherId` contains `issueGalley`;
`IssueGalleyForm::validate()` (with `addErrorField`, so the form names
the error); `IssueGalleyGridHandler` adds the `publicGalleyId` column
unconditionally. Roles: *Issues*. Live-probed 2026-09-24 (Actors rows 7–8; Fields, the issue galley
form; Rules 15, 16), OJS; on OMP and OPS the Issues address answers a
not-found page and the side menu has no "Issues". The Journal Manager,
Editor, Production Editor and a Site Administrator get the row links
"Edit", "Preview", "Publish Issue", "Delete" and the window tabs "Table
of Contents", "Issue Data", "Issue Galleys", "Identifiers"; the Section
Editor, Layout Editor and Author land on the access-denied page. With a
typed, unsaved Publisher ID the issue window asks "The data on this
form has changed. Do you wish to continue without saving?" on a tab
switch and on "Close", then drops the value. Notes q11, q12, q20,
f-ojs3.

<a id="fn-g"></a>
**g** — Press items (OMP): `ChapterGridHandler::editChapter()` assigns
`showIdentifierTab` for manager, sub-editor and assistant roles when
`chapter` or a plugin's `Chapter` is on (ops `identifiers`,
`updateIdentifiers`, `clearPubId` for the same roles);
`PublicationFormatGridHandler::editFormat()` for `representation`
(roles manager, sub-editor, assistant, admin); `ManageFileApiHandler::editMetadata()`
for proof files and `file` or a plugin's `SubmissionFile`
(`lib/pkp/templates/controllers/api/file/editMetadata.tpl`, tab after
`grid.action.editMetadata`). A file's publisher ID in its address:
`SubmissionFile::getBestId()`, `downloadLink.tpl`,
`CatalogBookHandler` (`getByBestId()` looks the publisher ID up first). Live-probed 2026-09-24 (Actors rows 9 and 11; Rules 6, 8, 16a), OMP:
"Edit Chapter" (tabs "Edit Metadata", "Identifiers"), the format's
"Edit" ("Edit", "Metadata", "Identifiers") and "Edit a file" ("Edit
Metadata", "Identifiers"). The Press Manager, Press Editor, Production
Editor, a Site Administrator and the assigned Series Editor get all
three windows and save the chapter's tab; a Series Editor whose
assignment has "Permissions" unticked and the Layout Editor see the
chapter as plain text, and open and save the format's tab. Default
previews: chapter `…pkp.536.c7`, format `…pkp.536.7`, file
`…pkp.536.138`. "Format Approval" on a format with no URN showed the
ticked "Assign the URN … to this publication format", and "OK" stored
it; on a format with one it read "The URN urn:nbn:de:0000-pkp.546.11
has been assigned."

<a id="fn-h"></a>
**h** — Reader blocks: `ojs/templates/frontend/objects/article_details.tpl`
(`item pubid`, heading `getPubIdDisplayType()` "URN", link
`getResolvingURL()` = `urnResolver` + URN, as text and target; DOI
skipped), `issue_toc.tpl` (`pub_id`, "URN:" + the link),
`omp/templates/frontend/objects/monograph_full.tpl` (per approved
format, heading `{$pubIdType}` = `other::urn`, value unlinked; no
publication-level block), `ops/templates/frontend/objects/preprint_details.tpl`
(the same loop as OJS; no plugin to feed it). No frontend template reads
`publisher-id`. Tags: `DublinCoreMetaPlugin` (`DC.Identifier.URN`) and
`GoogleScholarPlugin` (`citation_urn`) loop over the enabled pub-id
plugins. Live-probed 2026-09-24 (Actors row 10; Rule 21; Side effects, page
tags), signed out and as the Reader: the OJS article page's "URN"
heading with `https://nbn-resolving.de/urn:nbn:de:0000-jpk.v1i2.585` as
link text and target; the issue page's "URN:
https://nbn-resolving.de/urn:nbn:de:0000-jpk.v1i2", linked; no
publisher ID and no galley URN in the text, links or attributes of the
article, issue, galley view, archive, home, book, catalog and preprint
pages. The OMP format block appeared only once the format's row read
"Approved" and "Available". "DC.Identifier.URN" and "citation_urn" on
the article page with "Dublin Core Indexing Plugin" and "Google Scholar
Indexing Plugin" ticked (both arrive ticked), no such tags with both
unticked; the book page carries the monograph's URN in
"DC.Identifier.URN" and no "citation_urn" although the Google Scholar
plugin is ticked; a preprint server ships no Dublin Core plugin. Note
q22.

<a id="fn-i"></a>
**i** — Exports: `plugins/generic/jatsTemplate/classes/ArticleFront.php`
writes `<article-id pub-id-type="publisher-id">` with
`$submission->getId()` and a second one with `specific-use="publication"`
and the publication id (basis of OJS2); DataCite, Crossref and the MARC
OAI format read stored pub-ids (`DataciteXmlFilter`,
`ArticleCrossrefXmlFilter`, `oaiMetadataFormats/marcxml`). Live-probed 2026-09-24 (Side effects, JATS XML and exports): note q24;
Tools › Import/Export › "Native XML Plugin" exported the typed publisher
IDs as `<id type="public" advice="update">pid-a1</id>` on the article,
monograph or preprint and on its galley or format, and on OJS and OMP
the URN as `<id type="other::urn" …>`.

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on its own scratch context
from `POST scenarios/context`: `publicknowledge` keeps every identifier
setting at the install default and no test changes a setting there
(scenarios.md "The base context has plain defaults"). Throwaway
`users[]` (password: the username twice): `manager` as the Journal
Manager and `author` as the submitter on every app, plus `layoutEditor`
(scenario 3, OJS and OMP) and `sectionEditor`, the Moderator (scenario
7, OPS). `context.acronym` is `JPK` on a journal and `PKP` on a press,
so the default patterns have initials (a scratch context has none
otherwise, seed-facts). The "Publisher ID" boxes come from the context
key `enablePublisherId`, a list of the form's values (OJS `publication`,
`galley`, `issue`, `issueGalley`; OPS `publication`, `galley`). The URN
plugin comes from the `plugins` key, `{urnpubidplugin: {enabled: true,
settings: {enableIssueURN, enablePublicationURN,
enableRepresentationURN, urnPrefix: 'urn:nbn:de:0000-', urnSuffix:
'default' | 'customId', urnCheckNo, urnNamespace: 'urn:nbn:de',
urnResolver: 'https://nbn-resolving.de/'}}}`, every key given and
`urnCheckNo` always (without it the "Identifiers" page arrives empty).
OJS issues come from `issues[]`, galleys from the submission's
`galleys[]` (OJS, OPS; `file` the app's PDF fixture), a posted preprint
from `published: true`. No key stores a URN or assigns an unpublished
article to an issue, so scenarios 3, 5 and 6 assign both on screen, the
issue on "Publication Settings"; no key creates an issue galley or a
press's chapter, publication format or format file (Coverage, "No
seed"). In the scenarios {article number} is the submission's number
(the seed's `submissionId`, the `%a` of the default pattern), {galley
number} the galley's (`galleys[].id`), {monograph number} the
monograph's and {press initials} the press's `PKP` in lower case. Mail
is read in the mail catcher (Mailpit, `http://127.0.0.1:8025`), scoped
by the scratch accounts' addresses.
Scenario 1: no `enablePublisherId` key; one submitted submission, on
OJS and OPS with `galleys: [{label: 'PDF', …}, {label: 'HTML', …}]`.
Scenario 2 (OJS, OMP): no `plugins` key; one submitted submission.
Scenario 3 (OJS, OMP): `enablePublicationURN: true`, the other kinds
false, `urnSuffix: 'default'`, `urnCheckNo: false`; OJS `issues:
[{volume: 1, number: 2, year: 2026, published: true}]`; one submission
in Production (`files[]`, the app's PDF fixture, and `decisions:
['skipExternalReview', 'sendToProduction']`) with `participants:
[{username: <the layoutEditor>, role: 'layoutEditor'}]`; the article's
page is read signed out. Test run 2026-09-24, OJS and OMP: with the
submission still at the Submission stage, the Layout Editor's side menu
showed an empty "Publication" group and the "Identifiers" address
showed "Workflow: Submission" with "You don't currently have access to
that stage of the workflow."; in Production the page listed, "Save"
greyed.
Scenario 4 (OJS, OMP): `enablePublicationURN: true`, on OJS
`enableRepresentationURN: true`, `urnSuffix: 'customId'`, `urnCheckNo:
true`; two submitted submissions, on OJS each with `galleys: [{label:
'PDF', …}]`.
Scenario 5 (OJS): `enablePublisherId: ['galley']`;
`enablePublicationURN` and `enableRepresentationURN` true,
`enableIssueURN` false, `urnSuffix: 'default'`, `urnCheckNo: true`;
`issues: [{volume: 1, number: 2, year: 2026, published: true}]`; one
submitted submission with a "PDF" galley.
Scenario 6 (OJS): `enablePublisherId: ['issue']`; `enableIssueURN`,
`enablePublicationURN` and `enableRepresentationURN` true, `urnSuffix:
'default'`, `urnCheckNo: false`; `issues: [{volume: 1, number: 2, year:
2026}, {volume: 1, number: 3, year: 2026}]`; one submitted submission
with a "PDF" galley; the issue pages are read signed out.
Scenario 7 (OPS): `enablePublisherId: ['galley']`; `users[]`
`manager`, `sectionEditor` and `author`; two submissions of the author,
each with `galleys: [{label: 'PDF', …}]` and `participants: [{username:
<the sectionEditor>, role: 'sectionEditor', canChangeMetadata: false}]`,
the second `published: true`. The Author's role has "Permit submission
metadata edit." ticked on a fresh preprint server (seed-facts), so the
Author may edit the unposted preprint.
Live-probed 2026-09-24 (the scenario preamble): on `publicknowledge`,
read only as `manager.maya`, every "Publisher ID" box is unticked in all
three apps and the "URN" row unticked on OJS and OMP.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-24 (Actors row 4; A9), OJS and OMP: an assigned
Section Editor (Series Editor) whose assignment has "Permissions"
unticked, the Layout Editor and the Proofreader (OJS) see the footer
"Save" present and greyed on both the "Identifiers" and the Metadata
page; "Assign" is enabled and fills the box; a re-read shows the box
empty. Control: the Editor presses "Assign" and "Save", the page says
"Saved", and the URN shows after a reload.

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-24 (Actors row 5), all three apps: the Author's
view "Metadata" page shows "Publisher ID"; with "Permit submission
metadata edit." ticked on the Author role and the item unpublished, the
Author typed "pid-au1" and "Save" stored it; with it unticked the box is
typeable but "Save" is greyed.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-24 (Rule 2): "pid-a1" and "pid-g1" saved; with
every box unticked the Metadata field and the galley's "Identifiers" tab
were gone; ticked again, both values were back (OJS, OPS; OMP "pid-a1",
chapter "pid-c1", format "pid-f1"; OJS issue galley "a/b"). An issue
and a press file had no saved value to return (notes f-ojs3, f-omp5).

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-24 (Rule 4), all three apps: on a galley's tab
"12345", "a/b" and another galley's "pid-g2" were refused with the boxed
messages quoted, the window stayed open, and the reopened tab still read
"pid-g1"; the same on an OJS issue's tab and on OMP chapter, format and
file tabs, the file tab also refusing "12-34". "pid-g2" on another
galley saved and the window closed with no notice.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-24 (Rule 5; A2): on OJS and OPS galleys and OMP
chapters and formats, the emptied box and "Save" closed the window and
the reopened tab showed the old value.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-24 (Rules 11, 19; A4), OJS and OMP, individual
suffix and default patterns: "urn:nbn:de:0000-e2e1" saved; "Save"
again with nothing changed was refused with "The given URN suffix is
already in use…", on the first version as on a new one; the new
version showed the copied URN.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-24 (Rule 19; A5), OJS and OPS: the new version's
galley showed "pid-vg1"; "Save" with it unchanged was refused with the
duplicate message, the emptied box closed the window and kept the value,
"pid-vg2" saved. An OJS galley's assigned URN and publisher ID were
copied to the next version, and assigning the copy's URN was refused
until its publisher ID changed.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-24 (Rule 10; A6), OJS and OMP: "Add Check
Number" on `urn:nbn:de:0000-abc` appended "0" (pressed again, another
digit); "Assign" gave `…jpk.v1i2.5452` (OJS; the whole-URN rule gives
5) and `…pkp.5136` (OMP; whole-URN 1); an OJS galley tab previewed
`….546.g90` (suffix-only 2); `urn:nbn:de:0000-Any Text ÄÖ/;` saved and
read back as typed.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-24 (Rule 12; A7), OJS and OMP: the preview line
and the ticked box read as quoted, the label with two spaces before "to
this galley" (issue, chapter, publication format, file); previews
galley `urn:nbn:de:0000-jpk.v1i2.568.g24`, issue `…jpk.v1i3`, chapter
`…pkp.536.c7`. A galley whose article has no issue showed
`urn:nbn:de:0000-jpk.v%vi%i.567.g23` and the unresolved-pattern line,
with no box.

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-24 (Fields, "URN Suffix"; A8, A11), OJS and OMP:
with the pattern choice and "Articles" ticked, an empty "for articles"
was refused under the box with "This field is required." and nothing
was sent; a box of spaces was refused with the text code under the box,
at the top of the window and in a notice. While the pattern choice was
selected, each tick raised a page error (none under the default
choice).

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-24 (Fields, the issue galley form; OJS1): "Create
Issue Galley" with label "PDF" and "ig-1" failed on the server, the
window stayed open with a spinner beside a greyed "Save", and the list
still read "No Items"; "12345" and a duplicate were refused with the
notices quoted, the form unchanged; "ig-1" and "a/b" saved on an
existing galley and showed in the "Publisher ID" column, which stays
with "Enable for Issue Galleys" unticked.

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-24 (Rule 15): with no plugin and no publisher IDs
there is no "Identifiers" tab; with publisher IDs on for issues alone
the tab holds only "Publisher ID"; with the plugin on for "Articles"
alone it holds only the "Clear Issue Objects URNs" block under a "URN"
heading, and with "Issues" ticked the URN area is added above it.
"Clear Issue Objects URNs" › "OK" on Vol 1 No 1 removed the URNs of its
articles' versions and galleys, published and merely assigned ones
included; an article in Vol 1 No 2 kept its URN.

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-24 (Rule 20): with the plugin disabled, the OJS
article page had no URN, "Identifiers" was not listed, and the galley
window had only "Edit Metadata"; OMP kept "Identifiers" listed with its
heading and no field or "Save"; enabled again, the URNs were back on
both apps.

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-24 (Rule 13), OJS galley and OMP chapter:
"pid-g3" ("pid-c3") saved with the box as it arrived stored the URN too;
with the box unticked only the publisher ID was stored. After the
article moved from Vol 1 No 2 to Vol 1 No 1, and after the prefix
changed to `urn:nbn:de:0001-`, a stored URN stayed as it was while an
unstored preview followed.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-24 (Fields, "Press Content"; OMP1): only
"Chapters", only "Files", or both were refused with the message quoted;
"Chapters" with "Monographs", or with "Publication Formats", saved.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-24 (Rule 17; OMP4). OJS, "Articles" only:
"The URN for this publication will be urn:nbn:de:0000-jpk.v1i1.572."
when scheduling; the warning without a URN, when publishing and when
scheduling; no URN text while a requirement was unmet. "Articles" and
"Galleys": a "Publication" row and "Galley: PDF" "Unassigned";
"Galleys" only: galley rows only. OMP, "Monographs" only: the table with
one "Publication" row; every kind: rows for "Chapter: …", "Publication
Format: PDF" and "EPUB", and "Files: article.pdf". Publishing assigned
nothing. OPS: "Post the preprint" has no URN text.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-24 (Rule 18), OJS and OMP: "Reassign URNs" ›
"OK" removed the published article's URN and its galley's, and an
unpublished article's; the settings window stayed open with no notice;
"Assign" and "Save" stored the same URN again; an OJS galley's typed
suffix "g3sfx" stayed in its box with the assign box offered again.

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-24 (Rule 11; A12), OJS and OMP:
"urn:nbn:de:0000-e2e2" on a second article was refused with the
"already in use" message; "e2e2" with "The URN must begin with
urn:nbn:de:0000-."; "urn:nbn:de:0000-E2E2" saved. The page's summary
read "Please correct one error." with "Go to URN: …".

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-24 (Actors row 6). OPS, before posting: the
Author (row menu "Edit", "Change File", "Delete"), the assigned
Moderator and the manager saved the tab; a Moderator whose assignment
has "Permissions" unticked saw it read-only. After posting: the
manager, both Moderators and a Site Administrator saved; the Author's
row menu offered only "View", opening "View Galley" with the tab
read-only. OJS: the Journal Manager, Editor, Production Editor, a Site
Administrator, the assigned Section Editor with or without
"Permissions", the Layout Editor and the Proofreader saved; the
Author's "PDF" row had no menu.

<a id="fn-q20"></a>
**q20** — Live-probed 2026-09-24 (Rule 16): the window read "Send an email
about this to all registered users.", "Are you sure you want to publish
the new issue?", "URN" and the area; "OK" with "Assign the URN
urn:nbn:de:0000-jpk.v1i2 to this issue" ticked stored it, and the issue
page then read "URN: https://nbn-resolving.de/urn:nbn:de:0000-jpk.v1i2";
unticked, the issue was published with no URN; the "custom suffix is
missing" and "unresolved pattern" lines carried no box.

<a id="fn-q21"></a>
**q21** — Live-probed 2026-09-24 (Fields, "Namespace"), OJS and OMP: the empty
entry was refused under the list with "This field is required." and
nothing was sent; a chosen entry was kept when the window was reopened.
That no screen uses the choice is read from the code (note b).

<a id="fn-q22"></a>
**q22** — Live-probed 2026-09-24 (Rule 21; OMP2, OMP3): note h. The
monograph's stored `urn:nbn:de:0000-pkp.536` appeared nowhere on the
book page; the format's `urn:nbn:de:0000-pkp.536.7` appeared under
"other::urn", unlinked.

<a id="fn-q23"></a>
**q23** — Live-probed 2026-09-24 (Fields, the tab's "Save"; Rule 12), OJS
galley and issue, OMP chapter: the individual-suffix area read as
quoted; "g1" and "Save" stored the suffix only; reopened, the preview
and the ticked box were there; "Save" again stored
`urn:nbn:de:0000-g1`. "g1" on a second galley was refused with the
"already in use" message and nothing was saved. "Add Check Number" on
an empty box wrote "NaN", on "g1" gave "g16" (OMP "c9" gave "c95").

<a id="fn-q24"></a>
**q24** — Live-probed 2026-09-24 (Side effects, JATS XML; OJS2): for an article
whose Publisher ID is "pid-a1", the "JATS XML" page showed
`<article-id pub-id-type="publisher-id">585</article-id>` and
`<article-id pub-id-type="publisher-id" specific-use="publication">605</article-id>`,
and neither "pid-a1" nor the URN.

<a id="fn-q25"></a>
**q25** — Live-probed 2026-09-24 (Rule 14; A14): "Clear" asked in a window
titled "Delete" with "OK" and "Cancel"; "Cancel" kept the URN; "OK"
removed it. The OJS issue's tab then showed the preview at once, while
the OJS galley's and the OMP chapter's tab kept the old URN until
reopened. The format and file tabs were not driven for "Clear".

<a id="fn-f-a1"></a>
**f-a1** — Retired. Live-probed 2026-09-24 (note q4): every tab shows
the refusal in a box at its top, on all three apps. The draft's reading of
the code (the apps' `publicIdentifiersForm.tpl` leave
`common/formErrors.tpl` commented out or absent) did not match the
screen. The press file's box that disappears after a refusal is now
part of OMP5.

<a id="fn-f-a2"></a>
**f-a2** — `PKPPublicIdentifiersForm::execute()`: `if
($this->getData('publisherId')) { setStoredPubId(…) }`; nothing clears
it. Live-probed 2026-09-24 (note q5). An issue's and a press file's value is never stored at all (notes f-ojs3, f-omp5).
Issue report: [pkp-e2e#464](https://github.com/jardakotesovec/pkp-e2e/issues/464) ([docs/issues/U44-A2-publisher-id-on-tab-never-removed.md](../issues/U44-A2-publisher-id-on-tab-never-removed.md)).

<a id="fn-f-a3"></a>
**f-a3** — The publication schema's `pub-id::publisher-id` has only
`nullable`; its description still says it "will be used in the
publication's URL path", which `PKPSubmission::getBestId()` (urlPath
only) no longer does. `SubmissionFile::getBestId()` is the one place a
publisher ID still stands in an address (note g). Live-probed 2026-09-24 (notes d, q4, q11).

<a id="fn-f-a4"></a>
**f-a4** — `validatePublicationUrn()` calls `checkDuplicate($urn,
$publication, …)` → `PKPPubIdPlugin::checkDuplicate()` →
`Publication DAO::pubIdExists($type, $pubId, $publication->getId(),
$contextId)`, whose query excludes `s.submission_id <> $excludePubObjectId`:
a publication number compared with submission numbers. A version's own
row (and its siblings' copies, note c) is therefore counted unless its
number equals the submission's. Live-probed 2026-09-24 (note q6): the refusal met every first version too, the submission and publication numbers differing on every new seed (537 and 551 on OJS, 512 and 524 on OMP).
Issue report: [pkp-e2e#465](https://github.com/jardakotesovec/pkp-e2e/issues/465) ([docs/issues/U44-A4-article-own-urn-refused-as-in-use.md](../issues/U44-A4-article-own-urn-refused-as-in-use.md)).

<a id="fn-f-a5"></a>
**f-a5** — OJS `Publication Repository::version()` clones each galley
(`pub-id::publisher-id` and `pub-id::other::urn` copied);
`anyPubIdExists(…, ASSOC_TYPE_REPRESENTATION, $galleyId, true)` →
`Galley DAO::pubIdExists()` excludes only the galley itself. Live-probed
2026-09-24 (note q7).
Issue report: [pkp-e2e#466](https://github.com/jardakotesovec/pkp-e2e/issues/466) ([docs/issues/U44-A5-new-version-galley-publisher-id-refused.md](../issues/U44-A5-new-version-galley-publisher-id-refused.md)).

<a id="fn-f-a6"></a>
**f-a6** — `plugins/pubIds/urn/js/checkNumber.js`
`$.pkp.plugins.generic.urn.getCheckNumber(urn, urnPrefix)` strips the
prefix before computing (used by `FieldTextUrn.addCheckNumber()`,
`FieldPubIdUrn.generateId()` and the legacy `#checkNo` button);
`URNPubIdPlugin::_calculateCheckNo()` (from `constructPubId()`, every
server-built URN except `customId`) computes over the whole URN, per the
algorithm its comment cites. Both run the same conversion table; for
`urn:nbn:de:0000-abc` the suffix-only digit is 0 and the whole-URN
digit 2 (worked with both routines, 2026-09-24). Live-probed 2026-09-24 (note q8).
Issue report: [pkp-e2e#467](https://github.com/jardakotesovec/pkp-e2e/issues/467) ([docs/issues/U44-A6-urn-check-digit-from-suffix-only.md](../issues/U44-A6-urn-check-digit-from-suffix-only.md)).

<a id="fn-f-a7"></a>
**f-a7** — `urnSuffixEdit.tpl` includes `urnAssignCheckBox.tpl` with
`pubId=""` in both places; `urnAssign.tpl` passes the real `$pubId`.
Live-probed 2026-09-24 (note q9).
Issue report: [pkp-e2e#468](https://github.com/jardakotesovec/pkp-e2e/issues/468) ([docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md](../issues/U44-A7-urn-assign-box-leaves-urn-out.md)).

<a id="fn-f-a8"></a>
**f-a8** — `URNSettingsForm` messages
`plugins.pubIds.urn.manager.settings.form.urn{Issue,Publication,Representation}SuffixPatternRequired`
(OMP also `…form.urnChapterSuffixPatternRequired` and
`…form.urnSubmissionFileSuffixPattern`); the locale files define them
without the `.form` segment (`…settings.urnPublicationSuffixPatternRequired`),
and `Locale::get()` renders a missing key as `##key##`. An empty box is
stopped in the browser as a required field before any message is
looked up. Live-probed 2026-09-24 (note q10).
Issue report: [pkp-e2e#469](https://github.com/jardakotesovec/pkp-e2e/issues/469) ([docs/issues/U44-A8-urn-suffix-pattern-spaces-raw-text-code.md](../issues/U44-A8-urn-suffix-pattern-spaces-raw-text-code.md)).

<a id="fn-f-a9"></a>
**f-a9** — `FieldPubIdUrn` offers "Assign" whenever it can build the
URN and the box is empty (note c); the page's "Save" follows the edit
gate. Live-probed 2026-09-24 (note q1).
Issue report: [pkp-e2e#470](https://github.com/jardakotesovec/pkp-e2e/issues/470) ([docs/issues/U44-A9-urn-assign-offered-without-edit-rights.md](../issues/U44-A9-urn-assign-offered-without-edit-rights.md)).

<a id="fn-f-a10"></a>
**f-a10** — Live-probed 2026-09-24, OJS and OMP (note b): the same
refusal for `nbn:de:0000-`, `urn:nbn` and `URN:NBN:DE:0000-`, with the
escaped form under the box and in the notice and the plain one in the
summary at the top (`…form.urnPrefixPattern`).
Issue report: [pkp-e2e#460](https://github.com/jardakotesovec/pkp-e2e/issues/460) ([docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md](../issues/U44-A10-urn-prefix-refusal-written-out-brackets.md)).

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-24 (note q10), OJS and OMP: the page
error "Cannot read properties of null (reading '1')" on
management/settings/website#plugins on choosing the pattern radio, on
each kind tick and on "Check Number" (11 on OJS, 21 on OMP in one run
each), none under the default choice. The window's clicks are handled
by `URNSettingsFormHandler.js` (note b).
Issue report: [pkp-e2e#461](https://github.com/jardakotesovec/pkp-e2e/issues/461) ([docs/issues/U44-A11-urn-settings-pattern-choice-script-error.md](../issues/U44-A11-urn-settings-pattern-choice-script-error.md)).

<a id="fn-f-a12"></a>
**f-a12** — Live-probed 2026-09-24 (note q18), OJS and OMP:
"urn:nbn:de:0000-E2E2" stored beside "urn:nbn:de:0000-e2e2" on another
article. What would settle the question: whether the registration
agency's resolver treats the two as one URN.

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-24 (note q23), the OJS galley tab and
the OMP chapter tab; the button is the legacy `#checkNo` (note f-a6).
Issue report: [pkp-e2e#462](https://github.com/jardakotesovec/pkp-e2e/issues/462) ([docs/issues/U44-A13-check-number-empty-urn-suffix-nan.md](../issues/U44-A13-check-number-empty-urn-suffix-nan.md)).

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-24 (note q25). The galley and chapter
tabs' "Clear" deletes the URN at once (note e) without redrawing the
tab; the issue tab reloads `#identifiersTab` (note f).
Issue report: [pkp-e2e#463](https://github.com/jardakotesovec/pkp-e2e/issues/463) ([docs/issues/U44-A14-cleared-urn-stays-on-tab.md](../issues/U44-A14-cleared-urn-stays-on-tab.md)).

<a id="fn-f-ojs1"></a>
**f-ojs1** — `IssueGalleyForm::validate()` calls
`JournalDAO::anyPubIdExists(…, ASSOC_TYPE_ISSUE_GALLEY, $this->_issueGalley
? $this->_issueGalley->getId() : null, true)`, which passes the `null`
of a new galley to `IssueGalleyDAO::pubIdExists(…, int $excludeGalleyId,
…)`: a `TypeError`, answered as a server error. Live-probed 2026-09-24 (note q11): the save answered a server error (500) on `…/grid/issue-galleys/issue-galley-grid/update?issueId=…&issueGalleyId=`.
Issue report: [pkp-e2e#471](https://github.com/jardakotesovec/pkp-e2e/issues/471) ([docs/issues/U44-OJS1-new-issue-galley-publisher-id-server-error.md](../issues/U44-OJS1-new-issue-galley-publisher-id-server-error.md)).

<a id="fn-f-ojs2"></a>
**f-ojs2** — `ArticleFront` (note i). Live-probed 2026-09-24 (note q24).

<a id="fn-f-ojs3"></a>
**f-ojs3** — Live-probed 2026-09-24 (notes q4, f): "pid-i1" and
"pid-i2" on two issues, and "pid-i3" saved together with a URN, each
closed the window and read back empty; no issue setting row held a
publisher ID. OJS `schemas/issue.json` declares no
`pub-id::publisher-id`, so the issue save drops it.
Issue report: [pkp-e2e#472](https://github.com/jardakotesovec/pkp-e2e/issues/472) ([docs/issues/U44-OJS3-OMP5-issue-and-press-file-publisher-id-never-kept.md](../issues/U44-OJS3-OMP5-issue-and-press-file-publisher-id-never-kept.md)).

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `URNSettingsForm` `urnObjects` check: `enableIssueURN
|| enablePublicationURN || enableRepresentationURN`; the form has no
`enableIssueURN` and never names `enableChapterURN` or
`enableSubmissionFileURN`. Live-probed 2026-09-24 (note q15).
Issue report: [pkp-e2e#473](https://github.com/jardakotesovec/pkp-e2e/issues/473) ([docs/issues/U44-OMP1-urn-settings-chapters-files-alone-refused.md](../issues/U44-OMP1-urn-settings-chapters-files-alone-refused.md)).

<a id="fn-f-omp2"></a>
**f-omp2** — `monograph_full.tpl` prints `{$pubIdType}` (the plugin's
`getPubIdType()`, `other::urn`) as the label and the stored value as
text. Live-probed 2026-09-24 (notes h, q22).
Issue report: [pkp-e2e#474](https://github.com/jardakotesovec/pkp-e2e/issues/474) ([docs/issues/U44-OMP2-book-page-format-urn-code-label.md](../issues/U44-OMP2-book-page-format-urn-code-label.md)).

<a id="fn-f-omp3"></a>
**f-omp3** — `monograph_full.tpl` loops over the pub-id plugins only
inside the publication formats; nothing reads the publication's
`pub-id::other::urn`. Live-probed 2026-09-24 (notes h, q22): the monograph's URN reaches only the page's "DC.Identifier.URN" tag.

<a id="fn-f-omp4"></a>
**f-omp4** — OMP `URNPubIdPlugin::addPublishFormNotice()`: `elseif
($publicationFormatUrnEnabled && !$chapterUrnEnabled &&
!$publicationFormatUrnEnabled && !$submissionFileUrnEnabled)` can never
hold, so every enabled case reaches the table. Live-probed 2026-09-24 (note q16).
Issue report: [pkp-e2e#475](https://github.com/jardakotesovec/pkp-e2e/issues/475) ([docs/issues/U44-OMP4-press-publish-window-urn-table.md](../issues/U44-OMP4-press-publish-window-urn-table.md)).

<a id="fn-f-omp5"></a>
**f-omp5** — Live-probed 2026-09-24 (notes q4, g): every value, typed
by the Press Manager and by a Layout Editor, read back empty, and no
file setting row held a publisher ID; `lib/pkp/schemas/submissionFile.json`
declares no `pub-id::publisher-id`. After a refusal, OMP's
`ManageFileApiHandler::updateIdentifiers()` re-renders with lib/pkp's
base form, which never assigns `enablePublisherId`, so the box is left
out. Were a value stored, `SubmissionFile::getBestId()` and
`CatalogBookHandler` would put it in the file's download address on the
book page in place of the file's number (the reason for the "12-34"
refusal); nothing on screen can store one.
Issue report: [pkp-e2e#476](https://github.com/jardakotesovec/pkp-e2e/issues/476) ([docs/issues/U44-OMP5-press-file-refused-publisher-id-box-vanishes.md](../issues/U44-OMP5-press-file-refused-publisher-id-box-vanishes.md)).
Issue report: [pkp-e2e#472](https://github.com/jardakotesovec/pkp-e2e/issues/472) ([docs/issues/U44-OJS3-OMP5-issue-and-press-file-publisher-id-never-kept.md](../issues/U44-OJS3-OMP5-issue-and-press-file-publisher-id-never-kept.md)).

<a id="fn-f-omp6"></a>
**f-omp6** — Live-probed 2026-09-24 in two runs (note g): file
previews `urn:nbn:de:0000-kone.531.132` and `…pkp.536.138` beside the
formats' `…kone.531.4` and `…pkp.536.7`, while the settings window lists
"%p.%m.%f.%s for files". OMP `classes/plugins/PubIdPlugin.php`
`generateDefaultPattern()` does not resolve the format for a file.
Issue report: [pkp-e2e#477](https://github.com/jardakotesovec/pkp-e2e/issues/477) ([docs/issues/U44-OMP6-press-file-default-urn-no-format-number.md](../issues/U44-OMP6-press-file-default-urn-no-format-number.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Identifiers" page (the article's URN) | workflow › Publication › version › "Identifiers" | AFFW-402 |
| Format file "Edit" window, "Identifiers" tab {OMP} | "Publication Formats" › a format's file › "Edit" | AFFW-600 · GRID-088 |
| Galley "Identifiers" tab, "Save" | Galleys › row "Edit" › "Identifiers" (OJS) | AFFW-601 |
| "Publisher ID" box on the tab | the same tab (OJS) | AFFW-602 |
| Galley "Identifiers" tab {OPS} | Galleys › row "Edit" › "Identifiers" | AFFW-603 |
| Chapter, format and file "Identifiers" tabs {OMP} | "Chapters" / "Publication Formats" windows | AFFW-604 |
| "Publish Issue" URN step {OJS} | Issues › "Future Issues" › row "Publish Issue" | AFFW-605 |
| Assign-identifiers confirm {OPS} | none reachable (no caller) | AFFW-607 |
| "Edit" issue › "Identifiers" tab {OJS} | Issues › row "Edit" | AFFW-741 · AFFM-255 |
| Issue galley "Publisher ID" {OJS} | Issues › "Edit" › "Issue Galleys" › "Upload" / "Edit" | AFFW-751 |
| Reader URN blocks | article page, issue page, book page | AFFR-064 |
| File-identifier operations {OJS OPS} | no tab offers them (typed address only) | GRID-067 · GRID-100 |
| "URN" plugin and its settings window {OJS OMP} | Settings › Website › "Plugins" › "Public Identifier Plugins" › "URN" › "Settings" | PLUG-043 |
| "Publisher ID" boxes | Settings › Workflow › Submission › "Metadata" | (the settings form of *Publication metadata*) |

## Reference — code anchors

- URN plugin: `plugins/pubIds/urn/` — `URNPubIdPlugin.php` (`isObjectTypeEnabled()`, `constructPubId()`, `_calculateCheckNo()`, `getLinkActions()`, `validatePublicationUrn()`, `addPublicationFormFields()`, `addPublishFormNotice()`, `loadUrnFieldComponent()`), `classes/form/URNSettingsForm.php`, `FieldPubIdUrn.php`, `FieldTextUrn.php`, `templates/settingsForm.tpl`, `urnSuffixEdit.tpl`, `urnAssign.tpl`, `urnAssignCheckBox.tpl`, `js/checkNumber.js`, `FieldPubIdUrn.js`, `FieldTextUrn.js`, `URNSettingsFormHandler.js` (OJS and OMP copies)
- Pub-id plugin base: `lib/pkp/classes/plugins/PKPPubIdPlugin.php`, `PKPPubIdPluginHelper.php`, `PKPPubIdPluginDAO.php`; `ojs/classes/plugins/PubIdPlugin.php` (and the OMP and OPS copies)
- Legacy forms: `lib/pkp/controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`, each app's `controllers/tab/pubIds/form/PublicIdentifiersForm.php` and `templates/controllers/tab/pubIds/form/publicIdentifiersForm.tpl`; `lib/pkp/controllers/grid/pubIds/form/PKPAssignPublicIdentifiersForm.php`, `ojs|omp|ops/controllers/grid/pubIds/form/AssignPublicIdentifiersForm.php`, `templates/controllers/grid/pubIds/form/assignPublicIdentifiersForm.tpl`
- Hosts: `ojs/controllers/grid/articleGalleys/ArticleGalleyGridHandler.php`, `ops/controllers/grid/preprintGalleys/PreprintGalleyGridHandler.php`, `templates/controllers/grid/{articleGalleys,preprintGalleys}/editFormat.tpl`; `ojs/classes/controllers/grid/issues/IssueGridHandler.php`, `templates/controllers/grid/issues/issue.tpl`, `ojs/controllers/grid/issues/form/IssueGalleyForm.php`, `templates/controllers/grid/issueGalleys/form/issueGalleyForm.tpl`, `ojs/controllers/grid/issueGalleys/IssueGalleyGridHandler.php`; `omp/controllers/grid/users/chapter/ChapterGridHandler.php`, `omp/controllers/grid/catalogEntry/PublicationFormatGridHandler.php`, `ojs|omp|ops/controllers/api/file/ManageFileApiHandler.php`, `lib/pkp/templates/controllers/api/file/editMetadata.tpl`
- Vue: `lib/ui-library/src/components/Form/fields/FieldPubId.vue`; `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` (`identifiers`), `useWorkflowNavigationConfig/useWorkflowNavigationConfig{OJS,OMP,OPS}.js`, `components/publication/WorkflowPublicationForm.vue`; `lib/ui-library/src/managers/GalleyManager/useGalleyManagerConfig.js`
- Publication: `lib/pkp/classes/components/forms/publication/PKPPublicationIdentifiersForm.php`, `PKPMetadataForm.php`; `lib/pkp/api/v1/submissions/PKPSubmissionController.php` (`getPublicationIdentifierForm()`, `editPublication()`); `lib/pkp/pages/dashboard/PKPDashboardHandler.php` (`identifiersEnabled`); `lib/pkp/classes/publication/Repository.php` (`validate()`, `version()`), `ojs/classes/publication/Repository.php` (`version()`); `lib/pkp/classes/publication/DAO.php`, `lib/pkp/classes/galley/DAO.php`, `lib/pkp/classes/submissionFile/DAO.php`, `ojs/classes/issue/DAO.php`, `ojs/classes/issue/IssueGalleyDAO.php` (`pubIdExists()`, `deleteAllPubIds()`)
- Schemas: `ojs/schemas/issue.json`, `lib/pkp/schemas/submissionFile.json` (no `pub-id::publisher-id`); `omp/classes/plugins/PubIdPlugin.php` (`generateDefaultPattern()`)
- Context: each app's `classes/components/forms/context/MetadataSettingsForm.php`, `schemas/context.json` (`enablePublisherId`); `ojs/classes/journal/JournalDAO.php`, `omp/classes/press/PressDAO.php` (`anyPubIdExists()`, `deleteAllPubIds()`)
- Reader: `ojs/templates/frontend/objects/article_details.tpl`, `issue_toc.tpl`; `omp/templates/frontend/objects/monograph_full.tpl`, `omp/templates/frontend/components/downloadLink.tpl`; `ops/templates/frontend/objects/preprint_details.tpl`; `plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`, `plugins/generic/googleScholar/GoogleScholarPlugin.php`, `plugins/generic/jatsTemplate/classes/ArticleFront.php`
