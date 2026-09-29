---
name: publication-formats-proof-terms
status: verified
---

# Publication formats & proof terms {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A press offers each book in one or more **publication formats**: a PDF
or EPUB edition, a printed paperback or hardback, or a copy hosted on
another website. Press staff build a version's formats on its
"Publication Formats" page: each format gets a name, a kind from the
book trade's list (such as "Paperback / softback (BC)"), a physical or
digital flag, and either files readers download from the press's site
or the address of the remote copy. Each file of a format (a **format
file**; the windows call it a "proof") carries **terms**: "Open Access"
(free), "Direct Sales" (at a price) or "Not Available". "Format
Approval" approves the format's catalog data and "Format Availability"
makes the format available to readers; these two decide what the book's
page shows. "Approve Proof" marks a format file approved, which changes
nothing readers get [A10](#a10). Each format also carries catalog data
for the book trade (identification codes such as the ISBN, trade dates,
product details),
kept in its window's "Metadata" tab. What readers then see and buy on
the book's page belongs to [Monograph landing page](U69-monograph-landing-page.md); the
trade blocks only the ONIX feed reads ("Sales Rights", "Market
Territories", representatives) belong to [ONIX metadata & export](U74-onix-metadata-export.md).
<sup>a</sup>

A journal and a preprint server do not install publication formats.
Their publication's pages list "Galleys" and no "Publication Formats",
and a galley has no terms, no approval and no availability switch
([Galleys](U46-galleys.md)). <sup>b</sup>

## Actors & permissions

**The Publication Formats page** is the workflow's "Publication" › the
version › "Publication Formats". Who is offered the page at all is the
workflow screen's rule
([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)):
the editorial roles; an assistant role only while the book is in a
stage its role takes part in, and every assistant role once the version
is published; the Author on their own book, in the author's view. **The
managing roles** below are the Press manager, Press editor and
Production editor, the Site Administrator, the Series editor assigned to
the book, and the assistant roles assigned to it that take part in
Production (Layout Editor, Designer, Indexer, Proofreader); "the
assigned assistant roles" below means these four. An assigned
Copyeditor, Marketing and sales coordinator or Funding coordinator can
be offered the page (the first two while the book is in Copyediting,
all three once the version is published) and finds only "You don't
currently have access to that stage of the workflow." there, with no
list ⚠ [A13](#a13). The assignment's metadata-edit permission ("Permit
submission metadata edit.") plays no part on this page, and neither
does a published version (Rule 16). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the page and its list** (Rules 2, 3) | • every role the page is offered to (the preamble), except the three assistant roles that find no list there [A13](#a13). The managing roles get the columns "Name", "Complete" and "Availability" and every control of the Fields tables<br>• the Author: the "Name" column alone, with no "Add publication format", no "Change File" or "Select Files" and no arrow before a name; a format file's name still downloads the file, and a remote format's name still opens its address <sup>c</sup> <sup>td1</sup> |
| **Add, edit and delete formats** ("Add publication format"; a format's "Edit" and "Delete"; Rules 4–8, 20) | • the managing roles<br>• the Author: never offered <sup>c</sup> <sup>td2</sup> |
| **Add files to a format and handle its files** ("Change File", "Select Files"; a format file's "More Information", "Edit", "Delete", "Dependent Files"; Rules 9–11) | • the Press manager, Press editor, Production editor, Site Administrator and the assigned Series editor: all of it<br>• the assigned assistant roles: "Change File", and a file's "Edit" and "Delete"; "More Information" opens its window, whose "History" never loads ([Submission files, its A3](U36-submission-files.md#a3)); "Select Files" opens its window, but the window's list of files does not load ⚠ [A1](#a1)<br>• the Author: never offered <sup>c</sup> <sup>td3</sup> |
| **Approve a format and approve a format file** ("Awaiting Approval" / "Approved" in the "Complete" column; Rules 12, 13) | • the managing roles <sup>c</sup> <sup>td4</sup> |
| **Make a format available, and set a file's terms** ("Not Available" / "Available", and "Set Terms" or the terms named, in the "Availability" column; Rules 14, 15) | • the Press manager, Press editor, Production editor, Site Administrator and the assigned Series editor<br>• the assigned assistant roles: both links are offered, and the choice is refused [A1](#a1) <sup>c</sup> <sup>td5</sup> |
| **Fill a format's catalog data** (the format window's "Metadata" tab; Rules 17–19) | • the Press manager, Press editor, Production editor and Site Administrator: the whole tab<br>• the assigned Series editor and assistant roles: the tab opens and its "Save" stores the fields, but its four lists ("Product Identification", "Sales Rights", "Market Territories", "Publication Dates") do not load ⚠ [A2](#a2) <sup>c</sup> <sup>td6</sup> |
| **Set a format's or a format file's identifiers** (the "Identifiers" tabs) | • see [Identifiers](U44-identifiers.md), which names who may save them |

## Fields & validation

<a id="formats-page"></a>
**The Publication Formats page.** Under the heading "Publication:
Publication Formats", one table headed "Publication Formats", with "Add
publication format" above it for the managing roles. One row per format
of the chosen version, and under each format one row per format file,
the newest first. The formats' order is not fixed: a format saved from
its "Edit" window moves to the end of the list ⚠ [A14](#a14), and the
book's page lists the formats in the same order. A version with no
format reads "No Items"; a format with no files shows "No Items" under
its row, and a remote format (Rule 5) "This item is remotely hosted."
<sup>d</sup> <sup>td7</sup>

A format's row:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Name** | — | The format's name, followed without a space by its "Publication Format" choice, such as "PDFDigital (on physical carrier) (DA)", both in the same grey type (a remote format's name in link colour). A remote format's name is a link that opens its address in a new tab. For the managing roles, a format that is not remote also shows the links "Change File" ⚠ [A3](#a3) and "Select Files" (Rules 9, 10), and an arrow before the name opens "Edit" and "Delete" (Rules 8, 20). <sup>d</sup> <sup>td8</sup> |
| **Complete** | — | "Awaiting Approval" or "Approved", a link that opens "Format Approval" (Rule 12). <sup>d</sup> |
| **Availability** | — | "Not Available" or "Available", a link that opens "Format Availability" (Rule 14). <sup>d</sup> |

A format file's row:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Name** | — | The file's number, with an icon for its kind of document, and its name, a link that downloads the file ([→ downloading](U36-submission-files.md#download)). For the managing roles an arrow before it opens "More Information", "Edit" and "Delete", and on an HTML or XML file also "Dependent Files" (Rule 11). <sup>h</sup> <sup>td8</sup> |
| **Complete** | — | "Awaiting Approval" or "Approved", a link that opens "Approve Proof" or "Revoke Proof Approval" (Rule 13). <sup>h</sup> |
| **Availability** | — | The file's terms, a link that opens "Set Terms for Downloading" (Rule 15): "Set Terms" until terms are saved, then "Open Access", "Direct Sales" or "Not Available". <sup>h</sup> |

<a id="format-window"></a>
**The format window.** "Add publication format" opens a window headed
"Add publication format" with one tab, "Edit". A format's "Edit" opens a
window headed "Edit" with the tabs "Edit", "Metadata" and, while the
press gives formats identifiers (Settings bullets 1 and 3) and the format
is not remote, "Identifiers" (see [Identifiers](U44-identifiers.md)). The
"Edit" tab holds a group headed "Format Details", then "Required fields
are marked with an asterisk: *", "OK" and "Cancel". <sup>e</sup> <sup>td9</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Name** | Yes, in the book's language and in the press's primary language | One box per language the press offers for metadata. Empty in the book's language, "OK" is refused with "This field is required." under the box and nothing is saved. On a press with more than one metadata language, a book in another language needs the name in the press's primary language too: on a press whose primary language is English, a French book's format with only the French name is refused with "This field is required." under the English box ⚠ [A15](#a15). <sup>e</sup> <sup>td10</sup> |
| **Publication Format** | Yes | A list of five kinds, in alphabetical order: "Audio (AA)", "Digital (delivered electronically) (EA)", "Digital (on physical carrier) (DA)", "Hardback (BB)" and "Paperback / softback (BC)". A new format arrives on "Digital (on physical carrier) (DA)". <sup>e</sup> |
| **Physical format** | No | One box, unticked on a new format. <sup>e</sup> |
| **This format will be available at a separate website** | No | One box. Ticking it shows "URL of remotely-hosted content" and hides "URL Path", emptying it (Rule 5). Unticking it hides the address box but keeps what it holds ⚠ [A4](#a4). <sup>e</sup> <sup>td11</sup> |
| **URL of remotely-hosted content** | No | Shown only while the box above is ticked; a web address box. <sup>e</sup> |
| **URL Path** | No | Help: "An optional path to use in the URL instead of the ID." Shown only while the box above is unticked. Refusal in Rule 6. <sup>e</sup> |
| **ISBN** | No | Two boxes, under the lines "A 13-digit ISBN code, such as 978-951-98548-9-2." and "A 10-digit ISBN code, such as 951-98548-9-4.". Nothing checks what is typed (Rule 7). <sup>e</sup> |

<a id="metadata-tab"></a>
**The "Metadata" tab.** Top to bottom: the lists "Product
Identification" (Rule 18), "Sales Rights" and "Market Territories"
([ONIX metadata & export](U74-onix-metadata-export.md)) and "Publication Dates" (Rule 19), each with
its own add link and rows; then the fields below; then "Required fields
are marked with an asterisk: *", "Cancel" and "Save". Switching to the
"Edit" tab with a changed field asks "The data on this form has changed.
Do you wish to continue without saving?": "OK" switches and drops the
change, "Cancel" stays. The window's close arrow and the tab's "Cancel"
close at once, without asking, and keep nothing ⚠ [A16](#a16).
<sup>f</sup> <sup>td12</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Product Composition** | Yes | A list of seven kinds in alphabetical order ("Multiple-component retail product (10)" first), empty on a new format. Left empty, "Save" is refused with "This field is required." under the list, and nothing is saved. <sup>f</sup> |
| **Product Detail (not required)** | No | A long list of product details, empty on a new format. <sup>f</sup> |
| **Product Availability** | — (always set) | A list ("Available (20)", "In stock (21)", "Not yet available (10)"…), on "Available (20)" for a new format. It has no empty choice, so it always holds a value, and its label carries no asterisk. It is a catalog statement for the trade; it does not change the "Availability" column (Rule 14). <sup>f</sup> |
| **Imprint (Brand Name)** | No | Free text; typing stops at 255 characters. <sup>f</sup> |
| **Page Counts**: "Front Matter", "Back Matter" | No | Free text each ⚠ [A17](#a17). <sup>f</sup> |
| **Returnable Indicator** | No | A list, on "Yes, returnable, full copies only (Y)" for a new format. <sup>f</sup> |
| **Physical Dimensions**: "Height", "Width", "Thickness", "Weight", "Country of Manufacture" | No | Free text each [A17](#a17), with a unit list beside it ("Millimeters (mm)" preselected for the three sizes, "Grams (gr)" for the weight). Every unit list offers the same eight units, lengths and weights alike ⚠ [A18](#a18). The country list arrives on "Canada (CA)". <sup>f</sup> |
| **Digital Information**: "File Size in Mbytes", "Digital Technical Protection", "Enter your own file size value?" | — | Never shown: every format's tab shows the physical groups above, whatever its "Physical format" box says ⚠ [A6](#a6) (Rule 17b). <sup>f</sup> <sup>td13</sup> |

<a id="code-window"></a>
**The code window and the date window.** "Add Code" (under "Product
Identification") and a code's "Edit" open a window with "Code Value"
(required) and "ONIX Code Type" (required), then "OK" and "Cancel".
"Add publication date" (under "Publication Dates") and a date's "Edit"
open a window with "Date" (required), "Date Format" (required, with
"YYYYMMDD (H)" preselected on a new date ⚠ [A7](#a7)) and "Role"
(required; what it arrives on is Rule 19a), then "OK" and "Cancel".
Each window ends with "Required fields are marked with an asterisk: *".
What each list offers and refuses is Rules 18 and 19. <sup>g</sup> <sup>td14</sup>

<a id="terms-window"></a>
**The "Set Terms for Downloading" window.** A format file's terms link
opens it: the text "File formats can be made available for downloading
from the press website through open access at no cost to readers or
direct sales (using an online payment processor, as configured in
Distribution). For this file indicate the basis of access.", the choices
"Open Access", "Direct Sales" and "Not Available", a box "Price
({currency})" ({currency} is the press's currency code, Settings bullet
5) with the line "Prices should be numeric only. Do not include currency
symbols." under it, then "Cancel" and "Save". Rule 15 says what each
choice does and what the price box accepts ⚠ [A8](#a8). Nothing in the
window or the tab says whether the press has a payment method set up
[A9](#a9). "Cancel" closes the window and keeps nothing, without asking.
With a choice or the price changed, the window's close arrow asks "The
data on this form has changed. Do you wish to continue without
saving?": "OK" closes it and drops the change, "Cancel" keeps the
window. <sup>j</sup> <sup>td15</sup> <sup>td31</sup>

**The approval and availability windows.** Each shows a short text and
"OK" and "Cancel" (texts in Rules 12–14). <sup>k</sup> <sup>l</sup>

**The delete dialog.** Titled "Delete", with "Are you sure you wish to
delete this item? This action cannot be undone." and "OK" and "Cancel"
(Rule 20). <sup>m</sup>

## Rules & state

1. **What a format is.** A format belongs to one version of the book.
   It has a name, a kind ("Publication Format"), a physical flag, and
   either format files or, for a remote format, an address. It carries
   two independent states shown in its row: approval ("Awaiting
   Approval" / "Approved") and availability ("Not Available" /
   "Available"); each of its files carries its own approval and terms.
   <sup>a</sup> <sup>d</sup>
2. **Which formats the page lists.** The page lists the formats of the
   version chosen under "Publication"; choosing another version lists
   that version's formats. The page and everything on it work the same
   whichever stage the book is in, so a format can be built while the
   book is still in review, by any managing role the side menu offers
   the page to. <sup>d</sup> <sup>td7</sup>
3. **The Author's view.** The Author sees each format's name and kind
   and, under it, its files by number and name, each name a link that
   downloads the file. The Author sees no approval, availability or terms
   and has no control on the page (Actors). <sup>c</sup> <sup>td1</sup>
4. **Adding a format.** "Add publication format" › fill the "Edit" tab
   › "OK" closes the window and lists the new format at the end, reading
   "Awaiting Approval" and "Not Available", with "No Items" under it.
   Nothing else opens and no notice appears; files are added from the
   row afterwards (Rules 9, 10) and the catalog data from its "Edit"
   (Rule 17). <sup>e</sup> <sup>td2</sup>
   - 4a. **Leaving without saving.** "Cancel" closes the window and keeps
     nothing, without asking. With a field changed, the window's close
     arrow asks "The data on this form has changed. Do you wish to
     continue without saving?": "OK" closes and drops the change,
     "Cancel" keeps the window. <sup>e</sup> <sup>td9</sup>
5. **Remote formats.** A **remote format** is one saved with "This
   format will be available at a separate website." ticked: it sends
   readers to the address in "URL of remotely-hosted content" and holds
   no files. Its row offers no "Change File" or "Select Files", shows
   "This item is remotely hosted." under it, and its name is a link to
   the address. Its "Edit" window has no "Identifiers" tab, and its
   "Format Approval" asks no identifier question (Rule 12a). A remote
   format stays remote once saved: unticking the box and pressing "OK"
   keeps the address and the format [A4](#a4). <sup>e</sup> <sup>td11</sup>
6. **URL Path is checked on "OK".** An empty box is fine. A path holding
   anything but letters and digits joined by single dots, dashes or
   underscores (a space, a "/", a leading dash) is refused with "This
   may only contain letters, numbers, dashes, underscores and periods."
   under the box, and nothing is saved. In a format's "Edit" window the
   message also comes back later: the next "OK" that saves the format
   shows it again as a notice, once per refused path ⚠ [A24](#a24). A
   path made only of digits, or one another format of the same version
   already uses, is saved ⚠ [A5](#a5). What
   the path changes for readers is in Side effects. <sup>e</sup> <sup>td16</sup>
7. **The ISBN boxes.** The "ISBN" boxes are a shortcut into the
   format's "Product Identification" list (Rule 18): "OK" stores the
   13-digit box as the code "ISBN-13 (15)" and the 10-digit box as
   "ISBN-10 (Discontinued)", replacing any such codes the format had; an
   emptied box removes its code. The boxes show the codes' current
   values when the window opens. <sup>e</sup> <sup>td17</sup>
8. **Editing a format.** An arrow before the format's name, then "Edit",
   opens the format window (Fields). "OK" on the "Edit" tab stores it,
   closes the window, and the row shows the new name and kind at once.
   The save shows no notice of its own; a "URL Path" refused earlier in
   the same window shows its message as a notice now [A24](#a24).
   Switching tabs with a changed field asks the question
   of Rule 4a. <sup>e</sup> <sup>td9</sup>
9. **Adding a file with "Change File".** A format's "Change File" opens
   the upload wizard titled "Upload a File Ready for Publication"
   ([→ the upload wizard](U36-submission-files.md#upload-wizard)). After
   "Complete" the file is listed under the format, "Awaiting Approval",
   with "Set Terms" as its terms. Each upload adds another file; the
   label says "Change File" though nothing is replaced [A3](#a3). A
   format holds any number of files. <sup>h</sup> <sup>td18</sup>
10. **Adding a file with "Select Files".** A format's "Select Files"
    opens a window titled "Select Files" with the text "Any files that
    have already been uploaded to any submission stage can be added to
    the Proof Files listing by checking the Include checkbox below and
    clicking Search: all available files will be listed and can be
    chosen for inclusion." ⚠ [A19](#a19), a list headed "Page Proofs"
    of the book's "Production Ready Files" with the columns "Select",
    "Name" and "Component", each file unticked, the box "Show files from
    all accessible workflow stages." that reloads the list at once with
    the other stages' files, and "Cancel" and "OK". How the window's
    list behaves is
    *[Submission files](U36-submission-files.md#select-window)*'.
    <sup>i</sup> <sup>td19</sup>
    - 10a. **"OK" and closing.** "OK" copies each ticked file into the
      format as a new format file, "Awaiting Approval" and with "Set
      Terms" as its terms; the file it was copied from stays where it
      was. Ticking the same file again later adds a second copy. The
      window's close arrow closes it at once, ticks and all, without
      asking, and nothing is copied. <sup>i</sup> <sup>td19</sup>
11. **A format file's own actions.** "More Information" opens the file's
    window of *[Submission files](U36-submission-files.md#more-information)*.
    "Edit" opens a window headed "Edit a file" with the tabs "Edit
    Metadata" (the file's details,
    [→ Submission files](U36-submission-files.md#file-details)) and,
    while the press gives files identifiers (Settings bullets 2 and 3),
    "Identifiers" (see [Identifiers](U44-identifiers.md)). "Delete" works
    as on any file list
    ([→ deleting](U36-submission-files.md#delete)). On an HTML or XML
    file, "Dependent Files" opens a window of that name holding the
    file's dependent-files list
    ([→ dependent files](U36-submission-files.md#dependent-files)).
    <sup>h</sup> <sup>td8</sup>
12. **Approving a format.** A format's "Awaiting Approval" opens a window
    titled "Format Approval": "Approve the metadata for this format.
    Metadata can be checked from the Edit panel for each format.", with
    "OK" and "Cancel". "OK" closes it and the row reads "Approved".
    "Approved" opens the same title with "Indicate that the metadata for
    this format has not been approved."; "OK" sets "Awaiting Approval"
    again. What approval changes for readers is in Side effects.
    <sup>k</sup> <sup>td4</sup>
    - 12a. **The URN step.** While URNs are assigned to publication
      formats (Settings bullet 3) the window also carries the format's
      URN step, which is *[Identifiers](U44-identifiers.md)*' (its Rule
      16a); a remote format's window has none. With that step's box
      changed, the window's close arrow asks "The data on this form has
      changed. Do you wish to continue without saving?": "OK" closes it
      and keeps nothing (reopened, the box is ticked again), "Cancel"
      keeps the window. <sup>k</sup> <sup>td4</sup>
13. **Approving a format file.** A file's "Awaiting Approval" opens a
    window titled "Approve Proof": "Approve this proof to indicate
    proofreading is complete and the file is ready to be published.",
    with "OK" and "Cancel"; "OK" sets "Approved". "Approved" opens
    "Revoke Proof Approval": "Revoke approval for this proof to indicate
    proofreading is no longer complete and the file is not ready to be
    published."; "OK" sets "Awaiting Approval" again. A file's approval
    changes nothing readers get: an unapproved file with terms in an
    available format is offered on the book's page all the same
    ⚠ [A10](#a10). <sup>k</sup> <sup>td20</sup>
14. **Making a format available.** A format's "Not Available" opens a
    window titled "Format Availability": "Make this format available to
    readers. Downloadable files and any other distributions will appear
    in the book's catalog entry.", with "OK" and "Cancel"; "OK" sets
    "Available". "Available" opens the same title with "This format will
    unavailable to readers. Any downloadable files or other distributions
    will no longer appear in the book's catalog entry." ⚠ [A11](#a11);
    "OK" sets "Not Available". Availability does not wait for approval:
    a format still "Awaiting Approval" can be made available, and the
    reverse. <sup>l</sup> <sup>td21</sup>
15. **Setting a file's terms.** The terms link opens "Set Terms for
    Downloading" (Fields). <sup>j</sup>
    - 15a. **Opening.** A file with no terms saved opens with "Not
      Available" chosen and the price box greyed out; a file with terms
      opens on its choice, and a "Direct Sales" file with its price.
      Pressing "Save" on a file with no terms, without a change, stores
      "Not Available": the link turns from "Set Terms" to "Not
      Available". <sup>j</sup> <sup>td22</sup>
    - 15b. **"Direct Sales".** Choosing it makes the price box editable;
      "Save" stays greyed out while the box is empty or holds something
      that is not a number. On "Save" the price must be a whole number
      or carry exactly two decimals ("10", "10.50", or ".99" with no
      whole part); anything else, "10.5" and "-5" included, is refused
      with "A valid price is required." and nothing is saved: the window
      stays open with "Errors occurred processing this form" at its top
      and the message in place of the "Price (…)" label [A8](#a8).
      <sup>j</sup> <sup>td15</sup>
    - 15c. **"Open Access" and "Not Available".** Choosing either greys
      out the price box, which keeps showing what was typed until the
      window is saved; "Save" stores the choice and drops any price.
      <sup>j</sup> <sup>td22</sup>
    - 15d. **After "Save".** The window closes and the file's link reads
      the choice: "Open Access", "Direct Sales" or "Not Available". A
      "Direct Sales" price of 0 is saved: the link still reads "Direct
      Sales", the window then reopens on "Open Access", and the book's
      page offers the file free ⚠ [A20](#a20). <sup>j</sup> <sup>td15</sup>
16. **Published versions.** On a published version the page keeps every
    control and every window above, for the same roles, and each change
    reaches readers at once. The editorial view shows "Warning: This
    version has been published. Editing it may impact the published
    content." above the list; the author's view shows "This version has
    been published and can not be edited." <sup>n</sup> <sup>td23</sup>
17. **The "Metadata" tab.** It exists once the format is saved: a new
    format's window has only the "Edit" tab. <sup>f</sup>
    - 17a. **"Save".** "Save" stores the tab's fields and closes the
      window, with no notice. "Product Composition" is required: left
      empty, "Save" is refused with "This field is required." under it
      and nothing is saved. "Product Availability" has no empty choice,
      so it always holds a value (Fields). The four lists save on their
      own (Rules 18, 19), not with "Save". <sup>f</sup> <sup>td12</sup>
    - 17b. **Always the physical groups.** Every format's tab shows
      "Page Counts", "Returnable Indicator" and "Physical Dimensions",
      a digital or remote format's included, and never "Digital
      Information" [A6](#a6). <sup>f</sup> <sup>td13</sup>
18. **"Product Identification".** The list shows each code under "Code
    Value" and "ONIX Code Type". "Add Code" opens the code window
    (Fields); "OK" adds the row and the notice "Identification Code
    added." appears. A row's arrow offers "Edit" ("Identification Code
    edited.") and "Delete", which asks as the delete dialog does and
    ends with "Identification Code removed.". <sup>g</sup> <sup>td24</sup>
    - 18a. **What the code window accepts.** The "ONIX Code Type" list
      offers each type once per format: a type the format already uses
      is not offered again, except a code's own type in its "Edit".
      While the press assigns DOIs (Settings bullet 4), "DOI (06)" is
      never offered, even when the press gives formats no DOIs
      ⚠ [A21](#a21). An empty "Code Value" is refused with "This field
      is required." under the box, and nothing is saved. Nothing checks
      a value's form, an ISBN's included. <sup>g</sup> <sup>td24</sup>
19. **"Publication Dates".** The list shows each date under "Date" and
    "Role". "Add publication date" opens the date window (Fields); "OK"
    adds the row with the notice "Publication Date added.". A row's
    "Edit" and "Delete" end with "Publication Date edited." and
    "Publication Date removed.". <sup>g</sup> <sup>td14</sup>
    - 19a. **"Role".** The list offers each role once per format, in
      alphabetical order, and arrives on the first one the format has
      not used ("CIP date (35)" on a format with no date) ⚠ [A22](#a22).
      A date's "Edit" also offers, and arrives on, the date's own role.
      <sup>g</sup> <sup>td14</sup>
    - 19b. **The date check.** A date must have as many characters as
      its "Date Format" without the bracketed part (8 for "YYYYMMDD" and
      "YYYYMMDD (H)", 4 for "YYYY"); a "Text string" format takes any
      text. Nothing checks that the characters make a date. A date of
      the wrong length is refused: the window stays open with no
      message, and "Required fields are marked with an asterisk: *"
      shows a second time ⚠ [A23](#a23). The message "A date is required
      and the date value must match the chosen date format." appears
      only later, as a notice beside the next "Publication Date added.".
      An empty "Date" is refused with "This field is required." under
      the box, and nothing is saved. <sup>g</sup> <sup>td14</sup>
20. **Deleting a format.** An arrow before the format's name, then
    "Delete", opens the delete dialog. "OK" removes the format and its
    files, and the notice "Publication Format removed." appears. There
    is no undo. "Cancel" changes nothing.
    Its codes, dates, sales rights and markets go with it (read from the code: no screen shows a deleted format's lists).
    <sup>m</sup> <sup>td25</sup>
21. **A new version.** "Create New Version"
    ([→ Publish, schedule & versions](U49-publish-schedule-and-versions.md),
    its Rule 11) gives the new version a copy of each format with its
    name, kind, physical flag, address, URL path, approval, availability
    and catalog data, and a copy of each of its files with the file's
    approval and terms. The copies then change on the new version's page
    without touching the earlier version's. <sup>n</sup> <sup>td26</sup>

## Side effects

- **Notices.** Deleting a format shows "Publication Format removed.";
  the code and date lists show their notices (Rules 18, 19). Adding or
  editing a format, uploading or selecting its files, the two approvals,
  availability, terms and the "Metadata" tab's "Save" show none of their
  own; an edit saved after a refused "URL Path" shows that refusal's
  message (Rule 6, [A24](#a24)).
  <sup>o</sup> <sup>td27</sup>
- **No email.** Nothing on this page sends an email or adds a Tasks
  entry. <sup>o</sup> <sup>td27</sup>
- **Activity Log.** Creating and deleting a format, approving it or
  revoking the approval, and making it available or not available each
  add a line to the book's Activity Log; the lines and their wording are
  *[Submission activity log & notes](U38-submission-activity-log-and-notes.md)*'
  (its Rule 11). A choice the app refuses adds none. A file's upload
  writes the lines any upload writes
  ([→ Submission files](U36-submission-files.md#more-information)).
  <sup>o</sup> <sup>td20</sup>
- **A format file's "History".** Approving a format file, and revoking
  that approval, each add the same two lines to the file's "More
  Information" › "History": 'The metadata for file "{file name}" was
  edited by {username}.' and '"{full name}" ({username}) has signed off
  on the signoff for "{file name}."' ⚠ [A12](#a12). The first of the two
  also goes to the book's Activity Log. <sup>o</sup> <sup>td20</sup>
- **What readers see.** Once the version is published, the book's page
  lists each remote format that reads "Available" as a link to its
  address, and each file an available format offers (next bullet) under
  its format's name. A format that reads "Available" but whose files
  are all "Not Available" or have no terms is not on the page. A format
  that also reads "Approved" shows its catalog block (identification
  codes, dates, identifiers) there. A format's URL Path replaces its
  number in its files' addresses. The page, the purchase and the
  downloads are [Monograph landing page](U69-monograph-landing-page.md)'s. <sup>p</sup> <sup>td28</sup>
- **The files readers are offered.** An "Open Access" file is a link
  reading the format's name that opens the file's view page. A "Direct
  Sales" file's link reads "{price} Purchase {format} ({price}
  {currency code})", such as "25.00 Purchase PDF (25.00 USD)", on a
  press with a currency and a payment method; a signed-in reader who
  presses it gets the payment page ("Manual Fee Payment", "Fee 25.00
  (USD)"). On a press with neither, the link reads only the format's
  name, with no price; a visitor who presses it is sent to "Login" and
  a signed-in reader to the "Catalog", with no message ⚠ [A9](#a9). A
  file set "Not Available", or with no terms saved, is not offered.
  <sup>p</sup> <sup>td28</sup>
- **Harvesting.** A format of a published book that reads "Available"
  is a record of the press's OAI list, whether or not it reads
  "Approved"; one set "Not Available" is not
  ([Harvesting (OAI-PMH)](U19-oai-pmh.md), its Rule 3a). <sup>p</sup>
- **DOIs.** A press that gives publication formats DOIs assigns them as
  *[DOIs](U45-dois.md)* describes. <sup>q</sup>
- **Files deleted.** Deleting a format deletes its files (Rule 20):
  they leave a chapter's "Files" list too. <sup>m</sup> <sup>td25</sup>

## Settings that modify behavior

1. **"Enable for Publication Formats"** under "Publisher ID" (Settings ›
   Workflow › Submission › "Metadata", *[Identifiers](U44-identifiers.md)*).
   Unticked on a new press: a format's "Edit" window has the tabs "Edit"
   and "Metadata". Ticked: it gains "Identifiers" on every format that is
   not remote (Fields, the format window). <sup>q</sup>
2. **"Enable for Files"** under the same "Publisher ID". Unticked on a
   new press: a format file's "Edit a file" window has "Edit Metadata"
   alone. Ticked: it gains "Identifiers" (Rule 11). <sup>q</sup>
3. **The "URN" plugin with "Publication Formats" or "Files" ticked**
   (Settings › Website › "Plugins", the "URN" row's "Settings",
   *[Identifiers](U44-identifiers.md)*). Off on a new press. With
   "Publication Formats": the format window gains "Identifiers" and
   "Format Approval" gains the URN step (Rule 12a). With "Files": a
   format file's "Edit a file" gains "Identifiers", and "Approve Proof"
   gains the file's URN step. The plugin's settings window saves
   "Files" only together with "Monographs" or "Publication Formats"
   ([Identifiers, its OMP1](U44-identifiers.md#omp1)). <sup>q</sup> <sup>td29</sup>
4. **"DOIs"** (Settings › Distribution › "DOIs", the box "Allow Digital
   Object Identifiers (DOIs) to be assigned to work published by this
   press.", *[DOIs](U45-dois.md)*). Ticked on a new press: the "ONIX Code
   Type" list never offers "DOI (06)" (Rule 18a). Unticked: it offers it.
   <sup>q</sup> <sup>td24</sup>
5. **"Currency"** (Settings › Distribution › "Payments",
   *[Payments & APCs](U52-payments-and-apcs.md#payments-tab)*). None on a
   new press: the terms window's price box reads "Price ()". Saved, it
   names the currency's code, such as "Price (USD)" (Fields, the terms
   window). <sup>q</sup> <sup>td30</sup>

## Cross-feature interactions

- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)*:
  who is offered the Publication Formats page, its heading and the
  publication page frame.
- *[Submission files](U36-submission-files.md)*: the upload wizard
  "Change File" opens, the "Select Files" window's list, and a format
  file's "More Information", "Edit a file", "Delete" and "Dependent
  Files".
- *[Identifiers](U44-identifiers.md)*: the "Identifiers" tabs of the
  format window and of a format file's "Edit a file", and the URN step of
  "Format Approval".
- *[DOIs](U45-dois.md)*: format and format-file DOIs, and the DOI
  setting that hides "DOI (06)" from the code list.
- *[Payments & APCs](U52-payments-and-apcs.md)*: the press's payment
  method and currency, used by "Direct Sales".
- *[Submission activity log & notes](U38-submission-activity-log-and-notes.md)*:
  the Activity Log lines of a format.
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  publishing, and "Create New Version", whose copies Rule 21 describes.
- *[Harvesting (OAI-PMH)](U19-oai-pmh.md)*: one record per available
  format.
- *[Media files](U47-media-files.md)*: the images an HTML format file
  shows on the book's page.
- *[Chapters & work type](U72-chapters-work-type.md)*: a chapter's
  "Files" list, which offers format files too.
- *[Usage statistics](U64-usage-statistics.md)*: downloads of format
  files.
- [Monograph landing page](U69-monograph-landing-page.md): the book's page, its format
  list, the downloads and the purchase of a "Direct Sales" file.
- [ONIX metadata & export](U74-onix-metadata-export.md): the "Sales Rights" and "Market
  Territories" lists of the "Metadata" tab, the representatives, and the
  ONIX feed that reads the catalog data.
- *[Galleys](U46-galleys.md)*: the journal's and preprint server's
  counterpart.

## Canonical scenarios

Scenarios 1 to 5 and 7 to 9 run on the seeded press with ready accounts
and scratch books, and scenario 11 on the seeded journal and the seeded
preprint server, its control on the seeded press. Scenario 6 runs on a
scratch press that takes payments in US dollars, its control on a second
scratch press with no payment settings, and scenario 10 on a scratch
press with DOIs switched off, each with a throwaway Press manager and a
throwaway Author. The accounts, the passwords, the mail catcher and the
tooling recipe are in the footnote. <sup>s</sup>

1. **A format built and made available**

   Given: Press manager and the Author, on the Author's book in
   Production, which has no publication format.

   - **The empty page**: open the book's "Publication" › the version ›
     "Publication Formats": under the heading "Publication: Publication
     Formats" a table headed "Publication Formats" reads "No Items", with
     "Add publication format" above it and the columns "Name", "Complete"
     and "Availability" (Fields, the page; Actors row 1).
   - **"Add publication format"**: press it: a window headed "Add
     publication format" opens with the one tab "Edit", holding the
     group "Format Details" with "Name", "Publication Format" on
     "Digital (on physical carrier) (DA)", "Physical format" unticked,
     "This format will be available at a separate website", "URL Path"
     and the two "ISBN" boxes, then "Required fields are marked with an
     asterisk: *", "OK" and "Cancel" (Fields, the format window).
   - **An empty name**: press "OK" with nothing typed: "This field is
     required." shows under the "Name" box, the window stays open, and
     nothing is saved (Fields, "Name").
   - **"PDF"**: type PDF in "Name" and press "OK": the window closes with
     no notice, and the list shows one format reading "PDFDigital (on
     physical carrier) (DA)", "Awaiting Approval" and "Not Available",
     with the links "Change File" and "Select Files" and "No Items" under
     it (Rule 4; Fields, a format's row).
   - **A file uploaded**: press "Change File": the upload wizard titled
     "Upload a File Ready for Publication" opens
     ([→ the upload wizard](U36-submission-files.md#upload-wizard)).
     Upload article.pdf with "Book Manuscript" as its component and press
     "Complete": under "PDF" a row shows the file's number and
     article.pdf, "Awaiting Approval" and "Set Terms", and no notice
     appears (Rule 9; Fields, a format file's row).
   - **"Open Access"**: press "Set Terms": the window "Set Terms for
     Downloading" opens with "Not Available" chosen and the price box
     greyed out (Rule 15a). Choose "Open Access" and press "Save": the
     window closes and the file's link reads "Open Access" (Rules 15c,
     15d).
   - **The format approved**: press the format's "Awaiting Approval": a
     window titled "Format Approval" reads "Approve the metadata for this
     format. Metadata can be checked from the Edit panel for each
     format.", with "OK" and "Cancel"; press "OK": the format reads
     "Approved" (Rule 12).
   - **The file approved**: press the file's "Awaiting Approval": a
     window titled "Approve Proof" reads "Approve this proof to indicate
     proofreading is complete and the file is ready to be published.";
     press "OK": the file reads "Approved" (Rule 13).
   - **Made available**: press the format's "Not Available": a window
     titled "Format Availability" reads "Make this format available to
     readers. Downloadable files and any other distributions will appear
     in the book's catalog entry."; press "OK": the format reads
     "Available". None of the presses above showed a notice (Rule 14;
     Side effects, "Notices").
   - **The Author's view**: Author: open the book from My Submissions and
     choose "Publication" › the version › "Publication Formats": the list
     has the "Name" column alone, reading "PDFDigital (on physical
     carrier) (DA)" with the file's number and article.pdf under it, and
     offers no "Add publication format", "Change File", "Select Files",
     "Awaiting Approval", "Approved", "Available", terms link or arrow
     before a name. Press article.pdf: the browser downloads article.pdf
     (Rule 3; Actors row 1).
   - **Control**: the mail catcher holds no email to the Author about the
     book's formats (Side effects, "No email"). <sup>s</sup>

2. **A format's catalog data**

   Given: Press manager, on a book in Production with the format "PDF",
   which holds article.pdf and reads "Approved" and "Available".

   - **The "Metadata" tab**: on the book's "Publication Formats" page
     press the arrow before "PDF", then "Edit": a window headed "Edit"
     opens on its "Edit" tab, with a "Metadata" tab
     beside it. Press "Metadata": from the top it shows the lists
     "Product Identification", "Sales Rights", "Market Territories" and
     "Publication Dates", each with its own add link; then "Product
     Composition", empty, "Product Detail (not required)", empty,
     "Product Availability" on "Available (20)" and "Imprint (Brand
     Name)"; and at the bottom "Cancel" and "Save" (Fields, the
     "Metadata" tab). Which groups follow on this digital format is
     [A6](#a6), neither a pass nor a fail here.
   - **"Product Composition" required**: type Tidewater Books in "Imprint
     (Brand Name)" and press "Save": "This field is required." shows
     under "Product Composition" and the window stays open (Rule 17a).
   - **Saved**: choose "Multiple-component retail product (10)" in
     "Product Composition" and "Not yet available (10)" in "Product
     Availability", and press "Save": the window closes with no notice,
     and the "PDF" row still reads "Available" (Rule 17a; Fields,
     "Product Availability"). Reopen "Edit" › "Metadata": the tab holds
     "Multiple-component retail product (10)", "Not yet available (10)"
     and Tidewater Books.
   - **The ISBN boxes**: on the "Edit" tab type 978-951-98548-9-2 in the
     13-digit "ISBN" box and press "OK": the window closes. Reopen "Edit"
     › "Metadata": "Product Identification" lists 978-951-98548-9-2 under
     "Code Value" with "ISBN-13 (15)" under "ONIX Code Type" (Rule 7).
   - **"Add Code"**: press "Add Code": a window opens with "Code Value"
     and "ONIX Code Type", then "OK" and "Cancel", and the type list does
     not offer "ISBN-13 (15)", which the format already uses (Rule 18a).
     Press "OK" with "Code Value" empty: "This field is required." shows
     under the box and no row is added (Rule 18a). Choose "ISBN-10
     (Discontinued)", type 951-98548-9-4 in "Code Value" and press "OK":
     the row is added and the notice "Identification Code added."
     appears (Rule 18).
   - **A code edited and deleted**: press the arrow before the
     951-98548-9-4 row, then "Edit", replace the value with
     951-98548-9-5 and press "OK": the row reads 951-98548-9-5 and the
     notice "Identification Code edited." appears. Press its arrow, then
     "Delete": the dialog titled "Delete" reads "Are you sure you wish to
     delete this item? This action cannot be undone."; press "OK": the
     row is gone and the notice "Identification Code removed." appears
     (Rule 18).
   - **A publication date**: press "Add publication date": a window
     opens with "Date", "Date Format" and "Role", then "OK" and "Cancel".
     Choose "YYYYMMDD" in "Date Format" and leave "Role" as it arrives
     (what it arrives on is [A22](#a22), neither a pass nor a fail
     here). Press "OK" with "Date" empty: "This field is required." shows
     under the box. Type 2026091 and press "OK": the window stays open
     and no row is added (what the window shows is [A23](#a23), neither
     a pass nor a fail here). Replace it with 20260915 and press "OK":
     the window closes, a row is added under "Date" and "Role", and the
     notice "Publication Date added." appears (Rules 19, 19b).
   - **Control**: on the "Edit" tab empty the 13-digit "ISBN" box and
     press "OK": reopened, "Metadata"'s "Product Identification" no
     longer lists 978-951-98548-9-2 (Rule 7). <sup>s</sup>

3. **A Layout Editor and a Series editor build a format**

   Given: Layout Editor, Series editor and the Author, on the Author's
   book in Production, which has no publication format and to which the
   Layout Editor and the Series editor are assigned.

   - **The Layout Editor's page**: Layout Editor: open the book's
     "Publication" › the version › "Publication Formats": the table shows
     "Add publication format" and the columns "Name", "Complete" and
     "Availability" (Actors row 1).
   - **"EPUB" added**: press "Add publication format", type EPUB in
     "Name" and press "OK": "EPUB" is listed, "Awaiting Approval" and "Not
     Available", with "No Items" under it; the arrow before its name
     offers "Edit" and "Delete" (Rule 4; Actors row 2).
   - **A file uploaded**: press "EPUB"'s "Change File", upload
     article.pdf with "Book Manuscript" as its component and press
     "Complete": article.pdf is listed under "EPUB", "Awaiting Approval"
     and "Set Terms"; the arrow before it offers "More Information",
     "Edit" and "Delete" (Rule 9; Actors row 3).
   - **Both approved**: press "EPUB"'s "Awaiting Approval", then "OK" in
     "Format Approval": "EPUB" reads "Approved". Press the file's
     "Awaiting Approval", then "OK" in "Approve Proof": the file reads
     "Approved" (Rules 12, 13; Actors row 4). The Layout Editor's row
     also offers "Not Available" and "Set Terms"; what they do for this
     role is [A1](#a1), neither a pass nor a fail here.
   - **The Series editor**: Series editor: open the same page: "EPUB"
     reads "Approved" and "Not Available", its file "Approved" and "Set
     Terms". Press "Set Terms", choose "Open Access" and press "Save": the
     link reads "Open Access". Press "Not Available", then "OK" in
     "Format Availability": "EPUB" reads "Available" (Rules 14, 15;
     Actors rows 3, 5).
   - **Control**: Author: the book's "Publication Formats" list reads
     "EPUBDigital (on physical carrier) (DA)" with article.pdf under it
     and no "Approved", "Available" or "Open Access" (Rule 3).
     <sup>s</sup>

4. **Files added with "Select Files", and a file's approval revoked**

   Given: Press manager, on a book in Production whose "Production Ready
   Files" hold replacement.pdf, with the format "PDF", which holds
   article.pdf.

   - **"Select Files"**: on the book's "Publication Formats" page press
     "PDF"'s "Select Files": a window titled "Select Files" opens with a
     list headed "Page Proofs" under the columns "Select", "Name" and
     "Component", listing replacement.pdf unticked, the box "Show files
     from all accessible workflow stages.", and "Cancel" and "OK" (Rule
     10). Its text is [A19](#a19), neither a pass nor a fail here.
   - **Closed from its arrow**: tick replacement.pdf and press the
     window's close arrow: the window closes at once, without asking, and
     "PDF" still holds article.pdf alone (Rule 10a).
   - **A file copied**: press "Select Files" again, tick replacement.pdf
     and press "OK": replacement.pdf is listed under "PDF" as a new format
     file, "Awaiting Approval" and "Set Terms" (Rule 10a).
   - **A format file's actions**: press the arrow before article.pdf: it
     offers "More Information", "Edit" and "Delete". "More Information"
     opens the file's window of
     [Submission files](U36-submission-files.md#more-information); close
     it. "Edit" opens a window headed "Edit a file" on its "Edit Metadata"
     tab ([→ the file's details](U36-submission-files.md#file-details));
     close it (Rule 11; Fields, a format file's row).
   - **Approved and revoked**: press article.pdf's "Awaiting Approval",
     then "OK" in "Approve Proof": the file reads "Approved". Press
     "Approved": a window titled "Revoke Proof Approval" reads "Revoke
     approval for this proof to indicate proofreading is no longer
     complete and the file is not ready to be published."; press "OK":
     the file reads "Awaiting Approval" again (Rule 13).
   - **The copy deleted**: press the arrow before replacement.pdf under
     "PDF", then "Delete", and confirm as on any file list
     ([→ deleting](U36-submission-files.md#delete)): "PDF" holds
     article.pdf alone (Rule 11).
   - **Control**: the Production stage's "Production Ready Files" still
     lists replacement.pdf: copying it into the format left it where it
     was (Rule 10a). <sup>s</sup>

5. **A published book's formats, withdrawn and restored**

   Given: Press manager, the Author and a visitor, on the Author's
   published book with the formats "PDF", which holds article.pdf, and
   "EPUB", which holds replacement.pdf, each reading "Approved" and
   "Available" with its file on "Open Access".

   - **The warning**: Press manager: the book's "Publication Formats"
     page shows "Warning: This version has been published. Editing it
     may impact the published content." above the list, with "Add
     publication format" and the columns "Name", "Complete" and
     "Availability" (Rule 16).
   - **The book's page**: visitor: open the book's page from the press's
     catalog ([Catalog browse](U68-catalog-browse.md#book-summary)): it
     lists "PDF" and "EPUB", each file a link reading its format's name
     that opens the file's view page (Side effects, "What readers see"
     and "The files readers are offered").
   - **Leaving the terms window**: Press manager: press the "Open Access"
     link of "EPUB"'s file: "Set Terms for Downloading" opens on "Open
     Access" (Rule 15a). Choose "Not Available" and press "Cancel": the
     window closes without asking, and the link still reads "Open
     Access". Open it again, choose "Not Available" and press the
     window's close arrow: "The data on this form has changed. Do you
     wish to continue without saving?" shows; its "Cancel" keeps the
     window. Press the close arrow again, then "OK": the window closes
     and the link still reads "Open Access" (Fields, the terms window).
   - **A file set "Not Available"**: open the window again, choose "Not
     Available" and press "Save": the link reads "Not Available" (Rules
     15c, 15d). Visitor: reloaded, the book's page lists "PDF" and no
     "EPUB" (Side effects, "What readers see").
   - **"PDF" withdrawn**: Press manager: press "PDF"'s "Available": the
     "Format Availability" window opens (its text is [A11](#a11),
     neither a pass nor a fail here); press "OK": "PDF" reads "Not
     Available". Visitor: reloaded, the book's page lists no "PDF" (Rule
     14; Side effects, "What readers see").
   - **Approval revoked**: Press manager: press "PDF"'s "Approved": the
     "Format Approval" window reads "Indicate that the metadata for this
     format has not been approved."; press "OK": "PDF" reads "Awaiting
     Approval" (Rule 12).
   - **Available while awaiting approval**: press "PDF"'s "Not
     Available", then "OK": "PDF" reads "Available" and still "Awaiting
     Approval" (Rule 14). Visitor: reloaded, the book's page lists "PDF"
     again (Rule 16; Side effects, "What readers see").
   - **Control**: Author: open the book from My Submissions and choose
     "Publication" › the version › "Publication Formats": "This version
     has been published and can not be edited." shows above the list of
     "PDF" and "EPUB", with no "Add publication format" and no status or
     terms links (Rules 3, 16). <sup>s</sup>

6. **A file's terms and its price**

   Given: Press manager, on a scratch press whose "Payments" are enabled
   with the currency US Dollar and "Manual Fee Payment", with a book in
   Production carrying the format "PDF", which holds no file.

   - **A file with no terms**: on the book's "Publication Formats" page
     press "PDF"'s "Change File", upload article.pdf with "Book
     Manuscript" as its component and press "Complete": article.pdf is
     listed under "PDF" with "Set Terms" (Rule 9).
   - **"Set Terms for Downloading"**: press "Set Terms": the window reads
     "File formats can be made available for downloading from the press
     website through open access at no cost to readers or direct sales
     (using an online payment processor, as configured in Distribution).
     For this file indicate the basis of access.", offers "Open Access",
     "Direct Sales" and "Not Available" with "Not Available" chosen, and
     holds the greyed-out box "Price (USD)" with "Prices should be
     numeric only. Do not include currency symbols." under it, then
     "Cancel" and "Save" (Fields, the terms window; Rule 15a; Settings
     bullet 5).
   - **Saved unchanged**: press "Save": the window closes and the link
     reads "Not Available" (Rule 15a).
   - **A price refused**: press the file's "Not Available" link and
     choose "Direct Sales": the price box can be typed in, and "Save" is greyed out
     while it is empty. Type abc: "Save" stays greyed out. Replace it
     with -5 and press "Save": the window stays open with "Errors
     occurred processing this form" at its top and "A valid price is
     required." in place of the "Price (USD)" label. Press "Cancel": the
     link still reads "Not Available" (Rule 15b).
   - **"Direct Sales" at 25.00**: press the "Not Available" link again,
     choose "Direct Sales", type 25.00 and press "Save": the link reads "Direct Sales".
     Press it: the window opens on "Direct Sales" with 25.00 in the box
     (Rules 15a, 15b, 15d).
   - **"Open Access"**: choose "Open Access": the price box greys out,
     still showing 25.00. Press "Save": the link reads "Open Access", and
     reopened the window is on "Open Access" (Rules 15c, 15d).
   - **Control**: on a second scratch press, with no payment settings,
     whose book in Production carries the format "PDF" holding
     article.pdf on "Open Access", press the file's "Open Access" link:
     "Set Terms for Downloading" shows the price box as "Price ()"
     (Settings bullet 5). <sup>s</sup>

7. **A remote format**

   Given: Press manager and a visitor, on a published book with the
   format "PDF", which holds article.pdf.

   - **The remote box**: on the book's "Publication Formats" page press
     "Add publication format" and type web-copy in "URL Path". Tick "This
     format will be available at a separate website": "URL of
     remotely-hosted content" shows and "URL Path" is hidden. Untick it:
     "URL Path" shows again, empty. Tick it again (Fields, the format
     window).
   - **"Web" saved**: type Web in "Name" and https://example.org/web-copy
     in "URL of remotely-hosted content", and press "OK": "Web" is listed,
     "Awaiting Approval" and "Not Available", its name a link, with no
     "Change File" or "Select Files" and "This item is remotely hosted."
     under it. Press the name: https://example.org/web-copy opens in a
     new tab (Rules 4, 5). Visitor: the book's page lists no "Web" (Side
     effects, "What readers see").
   - **Made available**: Press manager: press "Web"'s "Not Available",
     then "OK": "Web" reads "Available". Visitor: reloaded, the book's
     page lists "Web" as a link to https://example.org/web-copy (Rule 14;
     Side effects, "What readers see").
   - **Control**: "PDF", which is not remote, still shows "Change File"
     and "Select Files" (Rule 5). <sup>s</sup>

8. **A format edited, its URL Path refused, and the format deleted**

   Given: Press manager, on a book in Production whose files hold
   article.pdf, with the chapter "Tides" and the format "PDF", which
   holds replacement.pdf.

   - **The chapter's "Files"**: on the book's "Publication" › the version
     › "Chapters" page press
     "Tides": its window's "Files" offers replacement.pdf
     ([Chapters & work type](U72-chapters-work-type.md)); press "Cancel"
     (Side effects, "Files deleted").
   - **Leaving without saving**: on the "Publication Formats" page press
     "Add publication format", type EPUB in "Name" and press "Cancel":
     the window closes without asking and no "EPUB" is listed. Press "Add
     publication format" again, type EPUB and press the window's close
     arrow: "The data on this form has changed. Do you wish to continue
     without saving?" shows; its "Cancel" keeps the window with EPUB
     typed. Press the close arrow again, then "OK": the window closes and
     no "EPUB" is listed (Rule 4a).
   - **"URL Path" refused**: press the arrow before "PDF", then "Edit".
     Type my pdf in "URL Path" and press "OK": "This may only contain
     letters, numbers, dashes, underscores and periods." shows, and
     nothing is saved. Replace it with a/b and press "OK": the same
     message shows (Rule 6).
   - **A tab switch with a change**: replace the name with Print and
     press the "Metadata" tab: "The data on this form has changed. Do you
     wish to continue without saving?" shows; its "Cancel" leaves the
     "Edit" tab open with Print typed (Rules 4a, 8).
   - **Edited**: choose "Paperback / softback (BC)" in "Publication
     Format", replace a/b with print-edition in "URL Path" and press
     "OK": the window closes, and the row reads "PrintPaperback /
     softback (BC)". Reopened, "Edit" holds Print, "Paperback / softback
     (BC)" and print-edition (Rules 6, 8). The notices that show as the
     window closes are [A24](#a24), neither a pass nor a fail here.
   - **Delete cancelled**: press the arrow before "Print", then "Delete":
     a dialog titled "Delete" reads "Are you sure you wish to delete this
     item? This action cannot be undone.", with "OK" and "Cancel"; press
     "Cancel": "Print" is still listed with replacement.pdf (Rule 20).
   - **Deleted**: press the arrow, then "Delete" and "OK": "Print" and
     replacement.pdf are gone, the list reads "No Items", and the notice
     "Publication Format removed." appears (Rule 20; Side effects,
     "Notices").
   - **Control**: on the "Chapters" page press "Tides": its "Files" no
     longer offers replacement.pdf (Side effects, "Files deleted").
     <sup>s</sup>

9. **A new version copies the formats**

   Given: Press manager, on a published book with the format "PDF",
   reading "Approved" and "Available", which holds article.pdf,
   "Awaiting Approval" and on "Open Access".

   - **"Create New Version"**: create a version with the side menu's
     "Create New Version"
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)):
     the new version's "Publication Formats" page lists "PDFDigital (on
     physical carrier) (DA)", "Approved" and "Available", with
     article.pdf under it, "Awaiting Approval" and "Open Access" (Rule
     21).
   - **The copy renamed**: press the arrow before "PDF", then "Edit",
     replace the name with PDF second edition and press "OK": the row
     reads "PDF second editionDigital (on physical carrier) (DA)" (Rules
     8, 21).
   - **Control**: choose the first version under "Publication": its
     "Publication Formats" page lists "PDF" and no "PDF second edition"
     (Rules 2, 21). <sup>s</sup>

10. **A press with DOIs switched off records a format's DOI**

    Given: Press manager, on a scratch press whose Settings ›
    Distribution › "DOIs" box "Allow Digital Object Identifiers (DOIs)
    to be assigned to work published by this press." is unticked, with a
    book in Production carrying the format "PDF".

    - **"DOI (06)" offered**: on the book's "Publication Formats" page
      press the arrow before "PDF", then "Edit" › "Metadata" › "Add Code": "ONIX Code Type" offers "DOI (06)"
      (Settings bullet 4; Rule 18a).
    - **A DOI code**: choose "DOI (06)", type 10.1234/pdf-copy in "Code
      Value" and press "OK": "Product Identification" lists
      10.1234/pdf-copy under "Code Value" with "DOI (06)" under "ONIX
      Code Type", and the notice "Identification Code added." appears
      (Rule 18).
    - **Control**: press "Add Code" again: "ONIX Code Type" no longer
      offers "DOI (06)", which the format now uses (Rule 18a).
      <sup>s</sup>

11. **No publication formats on a journal or a preprint server** {OJS OPS}

    Given: Journal Manager (Preprint Server Manager), on the seeded
    journal (the seeded preprint server), with an article (a preprint)
    in Production carrying the galley "PDF".

    - **The version's pages**: open the article's "Publication" (the
      preprint's "Preprint") › the version: it lists "Galleys" and no
      "Publication Formats" (Purpose, the absence paragraph).
    - **The galley**: choose "Galleys": the galley "PDF" is listed with
      no "Awaiting Approval", "Approved", "Not Available", "Available" or
      "Set Terms" (Purpose, the absence paragraph).
    - **Control**: on the seeded press the Press manager's book in
      Production lists "Publication Formats" under "Publication" › the
      version (Actors). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - "Format Approval" with its URN box changed, whose close arrow asks
    before closing, on a press that assigns URNs to publication formats
    (Rule 12a; Settings bullet 3)
  - the Press editor, Production editor and Site Administrator, offered
    what the Press manager is (Actors rows 2–6; scenario 1)
- **Register carries it**:
  - A1 (availability, terms and "Select Files" offered to the assigned
    assistant roles and refused; Actors rows 3, 5; scenario 3 passes it)
  - A2 (the "Metadata" tab's four lists for the Series editor and the
    assistant roles; Actors row 6)
  - A4 (a remote format unticked stays remote; Rule 5)
  - A5 (a "URL Path" of digits, or one another format uses; Rule 6)
  - A6 (the physical groups on a digital format; Rule 17b; scenario 2
    passes it)
  - A7 ("Date Format" arriving on "YYYYMMDD (H)"; Fields, the date
    window)
  - A8 (the price box's two checks; Rule 15b)
  - A9 (a priced file on a press with no payment method; Side effects,
    "The files readers are offered")
  - A10 (a file's approval changes nothing for readers; Rule 13)
  - A11 (the wording of the unavailable window; Rule 14; scenario 5
    passes it)
  - A12 (the file's "History" lines on approve and revoke; Side effects,
    "A format file's "History"")
  - A13 (the Copyeditor, Marketing and sales coordinator and Funding
    coordinator offered the page without a list; Actors preamble)
  - A14 (a format saved from "Edit" moves to the end of the list;
    Fields, the page)
  - A15 (a book in the press's second language; Fields, the format
    window)
  - A16 (the "Metadata" tab's close arrow and "Cancel" drop a change;
    Fields, the "Metadata" tab)
  - A17 (page counts and dimensions in free text; Fields, the "Metadata"
    tab)
  - A18 (every unit list offers every unit; Fields, the "Metadata" tab)
  - A19 (the "Select Files" text; Rule 10; scenario 4 passes it)
  - A20 (a "Direct Sales" price of 0; Rule 15d)
  - A21 ("DOI (06)" withheld while the press gives formats no DOIs;
    Rule 18a)
  - A22 ("Role" arriving on "CIP date (35)"; Rule 19a; scenario 2
    passes it)
  - A23 (a refused date shows no message in its window; Rule 19b;
    scenario 2 passes it)
  - A24 (a refused "URL Path" comes back as a notice on the next save;
    Rule 6; scenario 8 passes it)
- **Owned by another feature**:
  - the "Identifiers" tabs and who is offered them (Actors row 7;
    *[Identifiers](U44-identifiers.md)*)
  - "Enable for Publication Formats" and "Enable for Files" ticked
    (Settings bullets 1, 2; *[Identifiers](U44-identifiers.md)*)
  - the "URN" plugin with "Publication Formats" or "Files" ticked
    (Settings bullet 3; *[Identifiers](U44-identifiers.md)*)
  - an HTML format file's "Dependent Files" (Rule 11;
    *[Submission files](U36-submission-files.md#dependent-files)*)
  - a format's Activity Log lines (Side effects, "Activity Log";
    *[Submission activity log &
    notes](U38-submission-activity-log-and-notes.md)*)
  - the purchase of a "Direct Sales" file, and the downloads (Side
    effects, "The files readers are offered"; *Monograph landing page*,
    no spec yet)
  - a format's OAI record (Side effects, "Harvesting";
    *[Harvesting (OAI-PMH)](U19-oai-pmh.md)*, scenario 1)
  - format DOIs (Side effects, "DOIs"; *[DOIs](U45-dois.md)*, scenario
    4)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A6](#a6) | Every format's "Metadata" tab asks for physical dimensions and never offers "Digital Information" | 🐞 | user-visible | — |
| [A9](#a9) | A priced file on a press with no payment method shows no price and turns readers away; nothing warns the press | 🐞 | user-visible | — |
| [A17](#a17) | Page counts and dimensions take any text, and the book's Native XML export then fails | 🐞 | user-visible | — |
| [A1](#a1) | The assistant roles are offered availability, terms and "Select Files", and refused | 🐞 | minor | — |
| [A2](#a2) | The "Metadata" tab's four lists do not load for the Series editor and the assistant roles | 🐞 | minor | — |
| [A3](#a3) | A format's "Change File" adds a file; nothing is changed | 🐞 | minor | — |
| [A4](#a4) | Unticking "This format will be available at a separate website" keeps the format remote | 🐞 | minor | — |
| [A7](#a7) | A new publication date preselects "YYYYMMDD (H)", the Hijri calendar | 🐞 | minor | — |
| [A11](#a11) | The "Format Availability" window reads "This format will unavailable to readers." | 🐞 | minor | — |
| [A12](#a12) | Approving and revoking a format file write the same two "History" lines | 🐞 | minor | — |
| [A13](#a13) | The side menu offers "Publication Formats" to a Copyeditor, Marketing and sales coordinator or Funding coordinator, and the page shows them no list | 🐞 | minor | — |
| [A14](#a14) | A format saved from its "Edit" window moves to the end of the list | 🐞 | minor | — |
| [A15](#a15) | A book in the press's second language cannot get a format without a name in the primary language | 🐞 | minor | — |
| [A19](#a19) | "Select Files" tells the user to tick an "Include checkbox" and press "Search", neither of which it has | 🐞 | minor | — |
| [A20](#a20) | A "Direct Sales" price of 0 keeps the link on "Direct Sales" while readers get the file free | 🐞 | minor | — |
| [A23](#a23) | A date of the wrong length is refused with no message in its window | 🐞 | minor | — |
| [A24](#a24) | A refused "URL Path" comes back as a notice when the format is next saved, once per refusal | 🐞 | minor | — |
| [A5](#a5) | "URL Path" accepts a number, or a path another format already uses, and a reader link then answers "404 Not Found" | ❓ | minor | — |
| [A8](#a8) | The price box's two checks disagree: "10.5" is pressable and refused, "1,500.00" accepted but not pressable | ❓ | minor | — |
| [A10](#a10) | "Approve Proof" says a file becomes ready to be published, but approval changes nothing readers get | ❓ | minor | — |
| [A16](#a16) | The "Metadata" tab's close arrow and "Cancel" drop a changed field without asking | ❓ | minor | — |
| [A18](#a18) | Every unit list offers lengths and weights alike | ❓ | minor | — |
| [A21](#a21) | "DOI (06)" is withheld while DOIs are on, even when the press gives formats none | ❓ | minor | — |
| [A22](#a22) | A new date's "Role" arrives on "CIP date (35)" | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — The assistant roles are offered availability, terms and file selection, and refused** · 🐞 · minor.
An assigned Layout Editor, Designer, Indexer or Proofreader gets the
full Publication Formats page: they add, edit, delete and approve
formats and upload files. The same row also offers them "Not Available"
/ "Available", each file's terms link and "Select Files", and those
fail. "OK" in "Format Availability" pops up "The current role does not
have access to this operation." and the window stays open, the format
still "Not Available". The terms link opens "Set Terms for Downloading"
holding only that sentence. The "Select Files" window shows "Loading"
where the list belongs, after two pop-ups, "The current role does not
have access to this operation." and "undefined"; its "OK" pops up the
first again and copies nothing. Expected: a control a role cannot use
is not offered, or the role may use it like the rest of the page.
Basis: probe. <sup>f-a1</sup> <sup>td5</sup>

<a id="a2"></a>
**A2 — The "Metadata" tab's lists do not load for the Series editor and the assistant roles** · 🐞 · minor.
The assigned Series editor and the assigned assistant roles may open a
format's "Metadata" tab and its "Save" stores the fields, but the four
lists at its top ("Product Identification", "Sales Rights", "Market
Territories", "Publication Dates") stay on "Loading", each raising the
same two pop-ups ("The current role does not have access to this
operation." and "undefined"). They cannot add an ISBN code or a date
there; the "ISBN" boxes of the "Edit" tab still work for them.
Expected: the lists follow the tab.
Basis: probe. <sup>f-a2</sup> <sup>td6</sup>

<a id="a3"></a>
**A3 — "Change File" adds a file** · 🐞 · minor.
A format's link for uploading a file reads "Change File", but it adds
one more file to the format and replaces nothing; a format holds any
number of files. The label was chosen for a journal's galley, which
holds one file. Expected: "Upload File" or "Add File".
Since: 2016-06-21 (the label's change for galleys), a date read from the code's history · Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A remote format cannot be made local again** · 🐞 · minor.
In a remote format's "Edit" tab, unticking "This format will be
available at a separate website." hides "URL of remotely-hosted
content" but keeps the address in it. "OK" then saves the format still
remote: its name stays a link to the address, it still offers no
"Change File", and reopened the box is ticked again. Expected:
unticking empties the address, as a journal's galley window does.
Basis: probe. <sup>f-a4</sup> <sup>td11</sup>

<a id="a5"></a>
**A5 — "URL Path" accepts a number or a path already used** · ❓ · minor.
The format's "URL Path" is saved when it is made only of digits, or
when another format of the same version already has it. With two
formats sharing "pdf", the second format's file link on the book's page
answers "404 Not Found" while the first one's opens. A path equal to
another format's number takes that number's addresses over: the other
format's own file link then answers "404 Not Found". A journal's galley
window refuses both, with "The URL path can not be a number." and "The
URL path has already been used and can not be used again.".
Question: should a format's URL Path be refused on the same grounds as a galley's?
Lean: yes; the checks are the galley's, and without them a reader's link breaks.
Basis: probe. <sup>f-a5</sup> <sup>td16</sup>

<a id="a6"></a>
**A6 — Every format's "Metadata" tab is the physical one** · 🐞 · user-visible.
A format's "Metadata" tab shows "Page Counts", "Returnable Indicator"
and "Physical Dimensions" whether or not its "Physical format" box is
ticked, and a digital format never gets "Digital Information" ("File
Size in Mbytes", "Digital Technical Protection", "Enter your own file
size value?"). A press cannot record an e-book's file size or its
protection.
The book trade's ONIX feed carries both for a digital format, which no screen can show, since no screen sets either (read from the code).
Expected (no screen does this today): a physical format gets the physical groups, a digital one "Digital Information", a remote one neither.
Since: 2019-08-21 (the versioning rework, 6 years), a date read from the code's history · Basis: probe. <sup>f-a6</sup> <sup>td13</sup>

<a id="a7"></a>
**A7 — A new date preselects the Hijri calendar** · 🐞 · minor.
"Add publication date" arrives with "Date Format" on "YYYYMMDD (H)",
the ONIX format for a date in the Islamic (Hijri) calendar, rather than
"YYYYMMDD". A press that types a date without changing the list
records it as a Hijri date, and the book's export from Tools › "Native
XML Plugin" hands it on as one.
Expected (no screen does this today): "YYYYMMDD" preselected.
Since: 2012-01-12, a date read from the code's history · Basis: probe. <sup>f-a7</sup> <sup>td14</sup>

<a id="a8"></a>
**A8 — The price box's checks disagree** · ❓ · minor.
With "Direct Sales" chosen, "Save" is pressable for "10.5" and the save
is refused with "A valid price is required.", while "1,500.00", which
the save would accept, keeps "Save" greyed out. Only a whole number or
exactly two decimals get through (".99" too).
Question: should the price accept one decimal and thousands separators, and should the two checks agree?
Lean: accept "10.5" and keep the two checks the same; the rule reads as an oversight, not a policy.
Basis: probe. <sup>f-a8</sup> <sup>td15</sup>

<a id="a9"></a>
**A9 — A priced file on a press with no payment method turns readers away** · 🐞 · user-visible.
The terms window offers "Direct Sales" and a price whether or not the
press has a payment method set up, and neither it nor the "Metadata"
tab ever shows the notice the app holds for this ("A configured payment
method is required before you can define e-commerce settings."). On a
press with no currency and no payment method, the book's page then
lists the priced file as a plain link reading the format's name, with
no price, like a free file; a visitor who presses it is sent to
"Login", and a signed-in reader to the "Catalog", with no message.
Expected: "Direct Sales" warns, or is refused, while the press has no
payment method, and a reader who presses a file's link is never sent
away without a word.
Basis: probe. <sup>f-a9</sup> <sup>td31</sup>

<a id="a10"></a>
**A10 — Approving a format file changes nothing readers get** · ❓ · minor.
"Approve Proof" says approval marks a file "ready to be published", and
the row reads "Awaiting Approval" until then, but the book's page offers
a file with terms in an available format whether or not it is approved.
Question: is a file's approval meant to gate what readers get?
Lean: no; the gate was removed on purpose in 2018, so the window's text and the column should stop suggesting it.
Since: 2018-03-09, a date read from the code's history · Basis: probe. <sup>f-a10</sup> <sup>td28</sup>

<a id="a11"></a>
**A11 — "This format will unavailable to readers."** · 🐞 · minor.
The "Format Availability" window of an available format reads "This
format will unavailable to readers. Any downloadable files or other
distributions will no longer appear in the book's catalog entry.": a
word is missing ("will be unavailable").
Since: 2015-10-21, a date read from the code's history · Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — Approving and revoking a format file log the same lines** · 🐞 · minor.
Both "Approve Proof" › "OK" and "Revoke Proof Approval" › "OK" add the
same two lines to the file's "More Information" › "History": 'The
metadata for file "{file name}" was edited by {username}.' and '"{full
name}" ({username}) has signed off on the signoff for "{file name}."'.
The history cannot tell an approval from its withdrawal. Expected: a
line that says which it was.
Basis: probe. <sup>f-a12</sup> <sup>td20</sup>

<a id="a13"></a>
**A13 — "Publication Formats" is offered to assistant roles the page then refuses** · 🐞 · minor.
An assigned Copyeditor or Marketing and sales coordinator on a book in
Copyediting, and those two and an assigned Funding coordinator on a
published book, see "Publication Formats" in the side menu. Choosing it
shows the page's heading, "Current Submission Language", "Status" and
"You don't currently have access to that stage of the workflow.", with
no list. Expected: the side menu offers the page only to the roles it
serves, or the page shows them the list without controls. A press's
"Media" page is offered in the same way
([Workflow screen & stage access, its OMP2](U24-workflow-screen-and-stage-access.md#omp2)).
Basis: probe. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A format saved from its "Edit" window moves to the end of the list** · 🐞 · minor.
The Publication Formats page lists a version's formats in the order
they were added until one is edited: saved from its "Edit" window, the
format moves to the end of the list, at once and after a reload, and
the book's page lists the formats in the same new order. A press cannot
keep its formats in the order it chose. Whether other changes (an
approval, the availability, a file's terms) move a format too is not
settled: the same series of such changes left two different orders in
two runs. Expected: the formats keep the order they were added in.
Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — A book in the press's second language needs a format name in the primary language** · 🐞 · minor.
On a press with English as its primary metadata language and French as
a second one, a French book's format window refuses "OK" with only the
French name, showing "This field is required." under the English box;
an English book's format saves with the English name alone. A press
that publishes a book in its second language has to invent a format
name in its primary one. Expected: the name is required in the book's
language only.
Basis: probe. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — The "Metadata" tab drops a changed field without asking** · ❓ · minor.
In a format's "Metadata" tab, the window's close arrow and the tab's
"Cancel" close at once and drop a changed field; only switching to the
"Edit" tab asks "The data on this form has changed. Do you wish to
continue without saving?". The same window's close arrow does ask for a
changed field of the "Edit" tab (Rule 4a), and so does the terms
window's.
Question: should the close arrow ask for a changed catalog field too?
Lean: yes; the window asks for its other tab, so a lost catalog field is the odd one out.
Basis: probe. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — Page counts and dimensions take any text, and the book's export then fails** · 🐞 · user-visible.
Nothing checks that "Front Matter", "Back Matter", "Height", "Width",
"Thickness" and "Weight" are numbers. With "xii", "abc", "tall" or
"heavy" saved on a format, Tools › "Native XML Plugin" › "Export
Submissions" for the book ends with "The process failed. Check below
for errors/warnings." and names each of those values; typed as numbers
("12", "240") the same export completes. Expected: the tab refuses what
the export refuses.
Basis: probe. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — Every unit list offers lengths and weights alike** · ❓ · minor.
The unit list beside "Height", "Width", "Thickness" and "Weight" offers
the same eight units ("Centimeters (cm)", "Grams (gr)", "Inches (US)
(in)", "Kilograms (kg)", "Millimeters (mm)", "Ounces (US) (oz)",
"Pixels (px)", "Pounds (US) (lb)"), so a height can be saved in grams
and a weight in millimeters.
Question: should the sizes offer only lengths and the weight only weights?
Lean: yes; the book trade's lists pair each measure with its own units.
Basis: probe. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — "Select Files" names controls it does not have** · 🐞 · minor.
The "Select Files" window reads "…by checking the Include checkbox
below and clicking Search: all available files will be listed and can
be chosen for inclusion.", but its tick column is headed "Select",
there is no "Search", and ticking "Show files from all accessible
workflow stages." reloads the list at once. Expected: text that names
the window's own controls.
Basis: probe. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — A "Direct Sales" price of 0 gives the file away under a "Direct Sales" link** · 🐞 · minor.
"Direct Sales" with a price of 0 is saved. The file's link keeps
reading "Direct Sales", but the terms window reopens on "Open Access",
and the book's page offers the file as a free one: a visitor's link
opens the file's view page with no sign-in and no payment. Expected:
the link and the window agree, or a price of 0 is refused.
Basis: probe. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — "DOI (06)" is withheld even when formats get no DOIs** · ❓ · minor.
A new press gives DOIs to "Monographs" only (Settings › Distribution ›
"DOIs", "Items with DOIs"), so its formats get none. Still, "ONIX Code
Type" never offers "DOI (06)" while the "DOIs" box is ticked, so a
format's DOI cannot be recorded either way.
Question: should "DOI (06)" be withheld only while "Publication Formats" is among "Items with DOIs"?
Lean: yes; a format the press gives no DOI has none that a typed code could clash with.
Basis: probe. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — A new date's "Role" arrives on "CIP date (35)"** · ❓ · minor.
"Add publication date" arrives with "Role" on the first role, in
alphabetical order, that the format has not used: "CIP date (35)" on a
format with no date. A press that types a date without changing the
list records a CIP date rather than a "Publication date (01)", and the
book's export from Tools › "Native XML Plugin" carries it as one.
Question: should a new date arrive on "Publication date (01)", or on no role so that the press must choose?
Lean: no role; the list holds twenty-one roles, and any preselected one is recorded whenever it is missed.
Basis: probe. <sup>f-a22</sup>

<a id="a23"></a>
**A23 — A refused date shows no message in its window** · 🐞 · minor.
A date whose length does not fit its "Date Format" is refused with no
message: the window stays open and only a second "Required fields are
marked with an asterisk: *" appears. "A date is required and the date
value must match the chosen date format." shows later, as a notice
beside the next "Publication Date added.". Expected: the message shows
in the window when "OK" is refused.
Basis: probe. <sup>f-a23</sup>

<a id="a24"></a>
**A24 — A refused "URL Path" comes back as a notice on the next save** · 🐞 · minor.
In a format's "Edit" window, a "URL Path" refused on "OK" shows "This
may only contain letters, numbers, dashes, underscores and periods."
under the box, as it should, but the message also waits for later: the
next "OK" that saves the format closes the window and shows it again as
a notice at the top right, once for every refusal. After "my pdf" and
"a/b" were refused and "print-edition" saved, two such notices stood on
the page, about a path that was by then accepted. A refused date does
the same ([A23](#a23)). Expected: the message shows only in the window,
and a save that succeeds shows no error.
Basis: test run. <sup>f-a24</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Code read 2026-09-28 on the omp checkout `3cd59e944` (lib/pkp
`17a1f01fed`, ui-library `03d1cee2`). The page is the Vue shell
`PublicationFormatManager.vue` (`GridWrapper`, `grid-component=
"grid.catalogEntry.PublicationFormatGridHandler"`), listed by
`useWorkflowNavigationConfigOMP.js` (`name: 'publicationFormats'`,
`submission.publicationFormats` "Publication Formats") in both views and
mounted by `workflowConfigEditorialOMP.js` / `workflowConfigAuthorOMP.js`
(`PublicationConfig.publicationFormats`). Everything inside is the legacy
category grid `APP\controllers\grid\catalogEntry\PublicationFormatGridHandler`
(ops `fetchGrid`, `fetchRow`, `fetchCategory`, `addFormat`, `editFormat`,
`editFormatTab`, `updateFormat`, `deleteFormat`, `setApproved`,
`setAvailable`, `editApprovedProof`, `saveApprovedProof`,
`setProofFileCompletion`, `selectFiles`, `editFormatMetadata`,
`updateFormatMetadata`, `identifiers`, `updateIdentifiers`, `clearPubId`,
`dependentFiles`): the category rows are the formats
(`PublicationFormatGridCategoryRow`), the rows their `SUBMISSION_FILE_PROOF`
files with `assocType` `ASSOC_TYPE_REPRESENTATION`
(`PublicationFormatCategoryGridDataProvider::loadCategoryData()`). A
format's approval is `is_approved`, its availability `is_available`; a
file's approval is `viewable`, its terms `salesType` (`openAccess`,
`directSales`, `notAvailable`) and `directSalesPrice` (the OMP overlay of
`schemas/submissionFile.json`). The "Publication Format" kind is the
ONIX list 150 (`entryKey`).
Live-probed 2026-09-28 (Purpose), two runs: the format window's fields
and five kinds, the three terms, "Format Approval", "Approve Proof" and
"Format Availability" as quoted; a "Sales Rights" entry saved on a
published book's format left the book's page without sales rights,
markets or representatives; an "Awaiting Approval" file of an approved,
available format was offered on the book's page (A10).

<a id="fn-b"></a>
**b** — OJS (`72b85f4ba0`) and OPS (`e2111e3aae`) carry no
`controllers/grid/catalogEntry` and no `controllers/grid/files/proof`,
and their `useWorkflowNavigationConfigOJS.js` / `…OPS.js` build no
`publicationFormats` item; their publications have galleys
(`GalleyManager`). Live-probed 2026-09-28 (the absence paragraph), two
runs, as a scratch Journal Manager and Preprint Server Manager: OJS's
"Publication" › the version lists "Title & Abstract", "Contributors",
"Metadata", "References", "Funding", "JATS XML", "Body Text",
"Galleys", "Media", "Permissions & Disclosure", "Publication
Settings"; OPS's "Preprint" › the version the same without "JATS XML"
and "Body Text" and with "Preprint entry"; neither lists "Publication
Formats". A galley's menu reads "Edit", "Change File", "More
Information", "Delete", and the Galleys page carries no approval,
availability or terms. The Publication Formats address typed on either
lands, with no message, on the submission's current stage.

<a id="fn-c"></a>
**c** — `PublicationFormatGridHandler::__construct()` role-assigns
`setAvailable`, `editApprovedProof`, `saveApprovedProof` to
`ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_SITE_ADMIN`; `addFormat`,
`editFormat`, `editFormatTab`, `updateFormat`, `deleteFormat`,
`setApproved`, `setProofFileCompletion`, `selectFiles`, `identifiers`,
`updateIdentifiers`, `clearPubId`, `dependentFiles`, `editFormatMetadata`,
`updateFormatMetadata` also to `ROLE_ID_ASSISTANT`; `fetchGrid`,
`fetchRow`, `fetchCategory` also to `ROLE_ID_AUTHOR`. `authorize()` adds
`PublicationAccessPolicy` (so `SubmissionAccessPolicy`: managers and the
site administrator on every book, sub-editors and assistants through
`UserAccessibleWorkflowStageRequiredPolicy`, authors on their own book).
`initialize()` sets `_canManage` from the user's context roles
(`MANAGER`, `SITE_ADMIN`, `SUB_EDITOR`, `ASSISTANT`), with no
`canEditPublication` and, since pkp/pkp-lib#10263 (2025-05-28), no
published-status check; without it the grid has no "Add publication
format", only the "Name" column, and rows with no actions
(`PublicationFormatGridCellProvider::getCellActions()`,
`PublicationFormatGridCategoryRow::initialize()`,
`PublicationFormatGridRow` with no capabilities). The Press editor and
Production editor groups carry `ROLE_ID_MANAGER` (`registry/userGroups.xml`).
The catalog sub-grids `IdentificationCodeGridHandler`,
`PublicationDateGridHandler`, `SalesRightsGridHandler` and
`MarketsGridHandler` assign every op to `MANAGER` and `SITE_ADMIN` only;
`PKP\controllers\grid\files\proof\ManageProofFilesGridHandler` (the
"Select Files" list) to `SUB_EDITOR`, `MANAGER`, `SITE_ADMIN`. Who is
offered the page: seed-facts (U72 claim check K1, 2026-09-28). The
assistant roles' "Add publication format" was live-probed 2026-09-28
(Chapters & work type claim check, its A1): offered on a published and
an unpublished version, and a format added so was saved.
Live-probed 2026-09-28 (Actors preamble and rows 1–7; A13), two runs,
one account per role: the page and its list for the Press manager,
Press editor, Production editor, Site Administrator, an assigned Series
editor with and without the metadata-edit permission, and an assigned
Layout Editor, Designer, Indexer and Proofreader, on a book in
Production and on a published one; the side menu entry and only "You
don't currently have access to that stage of the workflow." for an
assigned Copyeditor and Marketing and sales coordinator on a book in
Copyediting, and for those two and a Funding coordinator on a
published book; on a book in Copyediting the Layout Editor, Designer,
Indexer, Proofreader and Funding coordinator found no version under
"Publication". An unassigned Series editor and an author of another
book typing the address got an empty workflow page, a Reader the
access-denied page. The Identifiers tabs of row 7 showed on a press
with "Enable for Publication Formats", "Enable for Files" and URNs for
formats.

<a id="fn-d"></a>
**d** — Page and list: `PublicationFormatGridHandler::initialize()`
(`setTitle('monograph.publicationFormats')` "Publication Formats"; the
action `grid.action.addFormat` "Add publication format"; columns
`common.name` "Name", `common.complete` "Complete",
`grid.catalogEntry.availability` "Availability", the last two only with
`_canManage`); `PublicationFormatCategoryGridDataProvider::loadCategoryData()`
(`grid.noItems` "No Items", `grid.remotelyHostedItem` "This item is
remotely hosted."). The format cell (`PublicationFormatGridCellProvider`,
`name`): the localized name plus `<span class="onix_code">` with
`getNameForONIXCode()` (list 150 through `lib/pkp/xml/onixFilter.xsl`,
which keeps AA, BB, BC, DA and EA and appends the code); a remote format's
name is an `<a target="_blank">` to `urlRemote`. The status links:
`submission.incomplete` / `submission.complete` ("Awaiting Approval" /
"Approved", OMP's own strings) and `grid.catalogEntry.isNotAvailable` /
`isAvailable` ("Not Available" / "Available"). The heading "Publication:
{page}" is the workflow page's (Workflow screen & stage access, its
Rule 9). Format order: `PublicationFormatDAO::getByPublicationId()`
orders by `seq`, which every format is created with as 0, so the
database alone decides the order (A14). Live-probed 2026-09-28 (Fields,
the page and the rows): notes td7, td8.

<a id="fn-e"></a>
**e** — `editFormat()` renders `templates/controllers/grid/catalogEntry/editFormat.tpl`:
tabs `common.edit` "Edit" (`editFormatTab`), `submission.informationCenter.metadata`
"Metadata" (only `{if isset($representationId)}`), and
`submission.identifiers` "Identifiers" (`{if !$remoteRepresentation &&
$representationId}` and `showIdentifierTab`: "representation" in the
press's `enablePublisherId`, or a `pubIds` plugin with
`isObjectTypeEnabled('Representation')`). The modal titles are
`grid.action.addFormat` and `grid.action.edit` "Edit". The form
`APP\controllers\grid\catalogEntry\form\PublicationFormatForm`
(`formatForm.tpl`): group `grid.catalogEntry.publicationFormatDetails`
"Format Details"; `name` multilingual over the press's metadata
languages plus the book's, required in the book's `locale`
(`grid.catalogEntry.nameRequired` "A name is required."); `entryKey`
(`grid.catalogEntry.publicationFormatType` "Publication Format",
default `DA`, `grid.catalogEntry.publicationFormatRequired`);
`isPhysicalFormat` (`grid.catalogEntry.physicalFormat` "Physical
format"); `remotelyHostedContent` (`grid.catalogEntry.remotelyHostedContent`
"This format will be available at a separate website"), `remoteURL`
(`grid.catalogEntry.remoteURL` "URL of remotely-hosted content");
`urlPath` (`publication.urlPath` "URL Path", help
`publication.urlPath.description`; `FormValidatorRegExp`
`/^[a-zA-Z0-9]+([\.\-_][a-zA-Z0-9]+)*$/`, `validator.alpha_dash_period`);
`isbn13`, `isbn10` (`grid.catalogEntry.isbn` "ISBN" with the two
description strings); `{fbvFormButtons}` ("OK", "Cancel"). The box
toggle is lib/pkp `js/controllers/grid/representations/form/RepresentationFormHandler.js`
(`toggleRemote_()`); leaving with changes is `AjaxFormHandler`'s form
tracking (`form.dataHasChanged`). `execute()` inserts or updates the
format and, for a new one, writes `SUBMISSION_LOG_PUBLICATION_FORMAT_CREATE`.
The harness builds formats through this form (`publicationFormats[]`,
scenarios.md): "Add publication format", the name, "OK". On screen the
in-browser check refuses an empty name first ("This field is
required.", no request sent), so "A name is required." never shows;
that check also asks for the press's primary language (A15).
Live-probed 2026-09-28: notes td9, td10, td11, td16, td17.

<a id="fn-f"></a>
**f** — `editFormatMetadata()` / `updateFormatMetadata()` build
`APP\controllers\grid\catalogEntry\form\PublicationFormatMetadataForm`
with three arguments, so its `$isPhysicalFormat` stays at the
constructor's default `true` and `$remoteURL` at `null`;
`templates/controllers/tab/catalogEntry/form/publicationMetadataFormFields.tpl`
therefore always includes `physicalPublicationFormat.tpl` and never
`digitalPublicationFormat.tpl` (`{if $isPhysicalFormat}…{elseif
!$remoteURL}`). The form loads the four sub-grids by `load_url_in_div`
(identification codes, sales rights, markets, publication dates), then
`productCompositionCode` (`monograph.publicationFormat.productComposition`,
required, empty default; list 2), `productFormDetailCode`
(`monograph.publicationFormat.productFormDetailCode` "Product Detail
(not required)"; list 175), `productAvailabilityCode`
(`monograph.publicationFormat.productAvailability`, required, default
`20`; list 65), `imprint` (maxlength 255), then the physical groups
(`pageCounts`, `returnInformation` default `Y`, `productDimensions` with
units default `mm` / `gr`, country default `CA`; lists 50, 66, 91).
Validators: `grid.catalogEntry.productAvailabilityRequired`,
`grid.catalogEntry.productCompositionRequired`; a leftover
`directSalesPrice` check for a field the form does not show.
`trackFormChanges: true` in `PublicationFormatMetadataFormHandler.js`.
The form's `inPlaceNotification` asks for
`NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD`, which no code creates (see
note f-a9). On screen the in-browser check refuses an empty "Product
Composition" first ("This field is required.", no request sent), so
"A product composition code must be chosen." never shows; "Product
Availability" has no empty entry, so its check never fires. The
composition list shows alphabetically. Live-probed 2026-09-28: notes
td12, td13.

<a id="fn-g"></a>
**g** — `IdentificationCodeGridHandler` (title
`monograph.publicationFormat.productIdentifierType` "Product
Identification", action `grid.action.addCode` "Add Code", columns
`grid.catalogEntry.identificationCodeValue` "Code Value" and
`grid.catalogEntry.identificationCodeType` "ONIX Code Type"; notices
`notification.addedIdentificationCode`, `editedIdentificationCode`,
`removedIdentificationCode`) with `form/IdentificationCodeForm.php`
(`codeForm.tpl`; `grid.catalogEntry.valueRequired`,
`grid.catalogEntry.codeRequired`; list 5 minus the format's used codes
and minus `06` while `Context::areDoisEnabled()`; list 5 marks `02`
ISBN-10 deprecated, shown with `monograph.publicationFormat.onixDeprecated`
" (Discontinued)"). `PublicationDateGridHandler` (title
`grid.catalogEntry.publicationDates` "Publication Dates", action
`grid.action.addDate` "Add publication date", columns
`grid.catalogEntry.dateValue` "Date" and `grid.catalogEntry.dateRole`
"Role"; notices `notification.addedPublicationDate`, `edited…`,
`removed…`) with `form/PublicationDateForm.php` (`pubDateForm.tpl`;
`grid.catalogEntry.dateFormat` "Date Format" from list 55 without codes,
preset to `'20'` in `fetch()`; roles from list 163 minus the format's
used roles; the custom check compares `count(str_split($date))` with the
format's text stripped of its bracket, and accepts any non-empty date
for a "string" format; message `grid.catalogEntry.dateRequired`). Row
actions: `grid.action.edit`, `grid.action.delete` with
`common.confirmDelete`. On screen the in-browser check refuses an empty
"Code Value" or "Date" first ("This field is required.", no request
sent), so "A value is required." never shows. `str_split()` splits
bytes, not characters: "202609é" (7 characters, 8 bytes) was saved as
"YYYYMMDD" and "2026091é" (8 characters) refused. Live-probed
2026-09-28: notes td14, td24.

<a id="fn-h"></a>
**h** — File rows: `PublicationFormatGridRow` extends
`SubmissionFilesGridRow` with the capabilities add, delete, manage, edit
and view-notes while `_canManage` (actions `FileInfoCenterLinkAction`
"More Information", `EditFileLinkAction` "Edit" with the modal title
`grid.action.editFile` "Edit a file", `DeleteFileLinkAction` "Delete"),
plus `dependentFiles` (`submission.dependentFiles` "Dependent Files")
for `application/xml` and `text/html`. The name cell is
`FileNameGridColumn` (number and extension icon, `DownloadFileLinkAction`).
Row actions sit behind the `show_extras` arrow of
`templates/controllers/grid/gridRow.tpl`. The format row's file links:
`AddFileLinkAction` for `SUBMISSION_FILE_PROOF`, whose
`_getTextLabels()` gives the wizard title `submission.upload.proof`
"Upload a File Ready for Publication" and the button
`submission.changeFile` "Change File", and `SelectFilesLinkAction`
(`editor.submission.selectFiles` "Select Files"). The file's status links:
`grid.catalogEntry.availableRepresentation.notApproved` / `.approved`
("Awaiting Approval" / "Approved"); terms `editor.monograph.approvedProofs.edit.linkTitle`
"Set Terms", or `payment.directSales.openAccess` "Open Access",
`payment.directSales.directSales` "Direct Sales",
`payment.directSales.notAvailable` "Not Available". OMP's
`ManageFileApiHandler::editMetadata()` shows the "Identifiers" tab of
`templates/controllers/api/file/editMetadata.tpl` for a proof file while
"file" is in `enablePublisherId` or a `pubIds` plugin covers
`SubmissionFile`; the "Edit Metadata" tab is `grid.action.editMetadata`.
The Author downloads a proof file under
`SubmissionFileAccessPolicy` option 3h (`SUBMISSION_FILE_PROOF`).
Live-probed 2026-09-28: notes td3, td8, td18.

<a id="fn-i"></a>
**i** — `selectFiles()` builds lib/pkp
`controllers/grid/files/proof/form/ManageProofFilesForm.php`
(`templates/controllers/grid/files/proof/manageProofFiles.tpl`: text
`editor.submission.proof.manageProofFilesDescription`, the grid
`ManageProofFilesGridHandler` titled `submission.pageProofs` "Page
Proofs", `{fbvFormButtons}`); the list is
`SelectableSubmissionFileListCategoryGridHandler` on the Production stage
(`SUBMISSION_FILE_PRODUCTION_READY`), with the filter box
`editor.submission.fileList.includeAllStages`. `ManageProofFilesForm::
fileExistsInStage()` always answers false, so every ticked file is
imported by `importFile()`: a clone with `assocType`
`ASSOC_TYPE_REPRESENTATION`, the format's id, `viewable` false, file
stage `SUBMISSION_FILE_PROOF`. Seed-facts (U44 claim check K1,
2026-09-24): "Select Files" offers only production-ready files.
Live-probed 2026-09-28: note td19.

<a id="fn-j"></a>
**j** — `editApprovedProof()` / `saveApprovedProof()` with
`APP\controllers\grid\files\proof\form\ApprovedProofForm`
(`approvedProofForm.tpl`, `approvedProofFormFields.tpl`: description
`payment.directSales.price.description`, radios `openAccess`,
`directSales`, `notAvailable`, the box `payment.directSales.priceCurrency`
"Price ({$currency})" filled from the press's `currency` setting, the
line `payment.directSales.numericOnly`, `submitText="common.save"`); the
modal title is `editor.monograph.approvedProofs.edit` "Set Terms for
Downloading". Price check: `FormValidatorRegExp`
`/^(([1-9]\d{0,2}(,\d{3})*|[1-9]\d*|0|)(.\d{2})?|…)$/`,
`grid.catalogEntry.validPriceRequired` "A valid price is required.".
`execute()` stores `directSalesPrice` 0 for `openAccess`, null for
`notAvailable`. `js/controllers/grid/files/proof/form/ApprovedProofFormHandler.js`:
on open, while `salesType` is not `''` (a file never saved has `null`),
an empty price checks "Not Available", a price of `0` checks "Open
Access", any other "Direct Sales"; `checkHandler_()` greys the price box
except for "Direct Sales"; `changeHandler_()` greys "Save" while the box
is empty or `isNaN()`. The pattern's empty whole part lets ".99"
through. Live-probed 2026-09-28: notes td15, td22, td30, td31.

<a id="fn-k"></a>
**k** — `setApproved()` shows lib/pkp
`PKPAssignPublicIdentifiersForm` with OMP's
`templates/controllers/grid/pubIds/form/assignPublicIdentifiersForm.tpl`
(the `Representation` branch; the pub-id assign templates only with
`approval` and no `urlRemote`); modal title
`grid.catalogEntry.approvedRepresentation.title` "Format Approval",
texts `grid.catalogEntry.approvedRepresentation.message` /
`.removeMessage`; "OK" posts `confirmed=true`, sets `is_approved`, logs
`SUBMISSION_LOG_PUBLICATION_FORMAT_PUBLISH` / `…_UNPUBLISH`, and
recreates or clears the format's OAI tombstone. `setProofFileCompletion()`
uses the same template's `SubmissionFile` branch: modal titles
`editor.submission.proofreading.approveProof` "Approve Proof" /
`revokeProofApproval` "Revoke Proof Approval", texts
`editor.submission.proofreading.confirmCompletion` /
`confirmRemoveCompletion`; "OK" edits `viewable`. The harness approves
formats through "Awaiting Approval" › "OK" (scenarios.md
`publicationFormats[]`). Seed-facts (U44 claim check K4, 2026-09-24): a
format created on screen arrives "Awaiting Approval" and "Not
Available".
Leaving the window with its URN box changed asks through the form's
change tracking (note e). Live-probed 2026-09-28: notes td4, td20, td29.

<a id="fn-l"></a>
**l** — The "Availability" cell of a format:
`RemoteActionConfirmationModal` titled
`grid.catalogEntry.availableRepresentation.title` "Format Availability",
text `grid.catalogEntry.availableRepresentation.message` or
`.removeMessage`, posting `setAvailable` with `newAvailableState`;
`setAvailable()` sets `is_available`, logs
`SUBMISSION_LOG_PUBLICATION_FORMAT_AVAILABLE` / `…_UNAVAILABLE`, and
updates the tombstone (none while approved and available). Neither
action checks the other flag.
Live-probed 2026-09-28: note td21; the assistant roles' refusal is A1.

<a id="fn-m"></a>
**m** — `PublicationFormatGridCategoryRow::initialize()` adds `editFormat`
and `deleteFormat` (`RemoteActionConfirmationModal`, `common.confirmDelete`,
title `common.delete`); `deleteFormat()` calls
`PublicationFormatService::deleteFormat()` (the format row, its
identification codes, markets, dates and sales rights, every file with
its `assocId`; the log line `SUBMISSION_LOG_PUBLICATION_FORMAT_REMOVE`)
and shows `notification.removedPublicationFormat` "Publication Format
removed.".
Live-probed 2026-09-28: note td25.

<a id="fn-n"></a>
**n** — Published versions: `publication.editorEditWarning` from
`workflowConfigEditorialOJS.js` `PublicationConfig.common` and
`publication.editDisabled` (OMP's own string) from
`workflowConfigAuthorOJS.js`, both merged into OMP's configs by
`useWorkflowConfigOMP.js` (`deepMerge`); the grid itself stopped checking
the published status in pkp/pkp-lib#10263 (2025-05-28). Seed-facts (U20
claim check K3, 2026-09-26): a published version's "Publication Formats"
page stays editable under the warning. New version:
`APP\publication\Repository::version()` clones each format (a new
`doiId` only for a major version with DOI versioning), its
identification codes, markets, dates and sales rights, and each of its
files (with dependent files) onto the new format.
Live-probed 2026-09-28: notes td23, td26.

<a id="fn-o"></a>
**o** — Notices: only `deleteFormat()` and the code and date grids
create trivial notifications; the grid's other ops return
`DAO::getDataChangedEvent()` alone. No `Mail` or queued email and no
task in any op of the grid, its forms or `PublicationFormatService`.
Log lines: Submission activity log & notes, its Rule 11.
`setProofFileCompletion()` writes one `SubmissionFileEventLogEntry`
`SUBMISSION_LOG_FILE_SIGNOFF_SIGNOFF` with `submission.event.signoffSignoff`
whatever the new `approval` value, and the file's edit adds the
file-edit line ("The metadata for file … was edited by …") to the
file's "History" and to the book's Activity Log. The revoked approval
and the withdrawn availability log `…_UNPUBLISH` and `…_UNAVAILABLE`
(notes k, l). Live-probed 2026-09-28: notes td20, td27.

<a id="fn-p"></a>
**p** — Reader side ([Monograph landing page](U69-monograph-landing-page.md)):
`pages/catalog/CatalogBookHandler.php` lists formats with
`getIsAvailable()`, remote ones among them; the files offered are format
files whose `directSalesPrice` is not null, in an available format
(`viewable` not read since pkp/pkp-lib#3467, 2018-03-09);
`templates/frontend/objects/monograph_full.tpl` shows a format's
catalog block only `{if $publicationFormat->getIsApproved()}`;
`templates/frontend/components/downloadLink.tpl` shows
`payment.directSales.purchase` for a priced file; the download refuses a
format that is not available, is remote, or a file with no price.
`PublicationFormat::getBestId()` uses the URL Path. Seed-facts (U44 claim
check K4, 2026-09-24): the format's details block shows only once it
reads "Approved" and "Available". Every format file's download
currently fails with a server error, a file uploaded on screen as much
as a seeded one: the book page's link and the file's view page open,
and the view page's download answers 500 (the probe log:
`CatalogBookHandler::$publication must not be accessed before
initialization`, CatalogBookHandler.php:533; the view page also logs
"PDFJS is not defined" and "UnexpectedResponseException"), a finding
for *Monograph landing page*, live-probed 2026-09-28 in three runs.
OAI: Harvesting (OAI-PMH), its Rule 3a and note f-omp1. Live-probed
2026-09-28 (Side effects, "Harvesting"), two runs: the press's OAI list
carried an available format reading "Awaiting Approval" and left out an
approved one set "Not Available" (the record follows the tombstone of
notes k and l). Reader side: note td28.

<a id="fn-q"></a>
**q** — Settings: `enablePublisherId` values `representation`, `file`
(Identifiers, its Rule 2); the URN plugin's "Press Content" boxes
(Identifiers); `Context::SETTING_ENABLE_DOIS` (on by default,
lib/pkp `schemas/context.json`; seed-facts, U08 claim check K2,
2026-09-24); the press's `currency` (no default; Payments & APCs,
Fields).
Live-probed 2026-09-28 (Settings bullets 1–5), two runs: "Publisher ID"
on a new press lists "Enable for Monographs", "Enable for Chapters",
"Enable for Publication Formats" and "Enable for Files", all unticked;
ticked, a local format's window and "Edit a file" gained "Identifiers",
a remote format's window did not. Controls: OJS lists "Enable for
Publications", "Enable for Galleys", "Enable for Issues", "Enable for
Issue Galleys", OPS "Enable for Preprints", "Enable for Galleys". The
URN, DOI and currency ends: notes td29, td24, td30. On a press with
"Publication Formats" among "Items with DOIs", the DOIs page's row for
the book listed its format with a DOI, "Unregistered".

<a id="fn-s"></a>
**s** — Scenario seeding. Scenarios 1 to 5 and 7 to 9 run on OMP
`publicknowledge` with ready accounts (passwords as `docs/process/users.md`
gives them: `admin`/`admin`, everyone else the username twice):
`manager.maya` (the Press manager), `sectioneditor.ana` (the Series
editor), `layouteditor.leo` (the Layout Editor) and `author.alex` (the
Author, the books' submitter); the visitor is signed out. Scenario 11
runs as `manager.maya` on OJS and OPS `publicknowledge` (Journal Manager,
Preprint Server Manager), its control as `manager.maya` on OMP. Scenarios
6 and 10 run on scratch presses from `POST scenarios/context` with a
throwaway `manager` (the Press manager) and a throwaway `author` (the
books' submitter), passwords the username twice: scenario 6 with
`payments: {enabled: true, currency: 'USD', paymentPluginName:
'ManualPayment'}` and its control on a second scratch press with no
`payments` key; scenario 10 with `enableDois: false`. Every book is a
scratch submission from `POST scenarios/submission` with its press's
Author as `submitter`, `submitted: true` and `decisions:
['skipExternalReview', 'sendToProduction']` (Production); a published
book adds `published: true`. Formats seed through `publicationFormats[]`
(scenarios.md), which builds each one on the screen as `admin` through to
"Approved" and "Available", its file on "Open Access" and still
"Awaiting Approval"; a file there is `genre: 'Book Manuscript'`.
Scenario 1: no format. Scenario 2: `[{name: 'PDF', file:
'article.pdf'}]`. Scenario 3: no format, `participants: [{username:
'sectioneditor.ana', role: 'sectionEditor'}, {username:
'layouteditor.leo', role: 'layoutEditor'}]`. Scenario 4: `files:
[{file: 'replacement.pdf', list: 'productionReady'}]` and "PDF" with
article.pdf. Scenario 5: published, "PDF" with article.pdf and "EPUB"
with replacement.pdf. Scenario 6: `[{name: 'PDF'}]`, no file; its
control's book "PDF" with article.pdf. Scenarios 7 and 9: published,
"PDF" with article.pdf. Scenario 8: `files: [{file: 'article.pdf'}]`,
`chapters: [{title: 'Tides'}]` and "PDF" with replacement.pdf. Scenario
10: `[{name: 'PDF'}]`. Scenario 11: `galleys: [{label: 'PDF', file:
'article.pdf'}]` on OJS, `preprint.pdf` on OPS; OPS needs no decision to
reach Production. The mail catcher of scenario 1 is read after the
job queue has run.
Live-probed 2026-09-28: every throwaway account signed in with its
username twice; `publicationFormats[]` built the seeded "PDF" as
`admin` (its Activity Log lines name "admin admin"); `enablePublisherId`,
`plugins`, `enableDois` and `payments` were accepted on scratch presses.
A press with URNs for "Files" alone comes from `plugins` only, the
plugin's settings window refusing it.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-28 (Actors row 1; Rule 3), two runs, as the
submitting Author and as a co-author participant with "Permit submission
metadata edit.", on books in Copyediting, in Production and published:
the list had the "Name" column alone; each format read its name and kind
("PDFDigital (on physical carrier) (DA)"), with the file's number and
name under it ("244 article.pdf"), the name downloading "article.pdf";
a remote format "Web" was a link opening its address in a new tab, with
"This item is remotely hosted." under it; no "Add publication format",
"Change File", "Select Files", status link, terms link or arrow. The
Author typing the editorial address of the same page got the
access-denied page.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-28 (Actors row 2; Rule 4), two runs, as an
assigned Series editor, an assigned Layout Editor, the Site
Administrator and the Press manager on a book in Production: "Add
publication format", a name, "OK" closed the window; the new row, last,
read "Awaiting Approval" and "Not Available" with "No Items" under it,
the same after a reload; nothing else opened and no notice showed. Its
arrow offered "Edit", "Delete"; "Edit" › a new name › "OK" renamed it;
"Delete" › "OK" removed it with "Publication Format removed.". The
assigned Layout Editor and Indexer added a format on a published book
too.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-28 (Actors row 3), two runs. The assigned Series
editor and the assigned Layout Editor each uploaded a file with "Change
File", listed under the format. "Select Files": the Series editor's
window listed the production-ready "replacement.pdf" and "OK" copied
it; the Layout Editor's showed "Loading" (A1). A file's arrow offered
both of them "More Information", "Edit", "Delete"; "Edit" opened "Edit a
file" and "Delete" › "OK" removed the file with "Removed file.".
"More Information" opened "Information Center: article.pdf"; its
"History" loaded for the Series editor and stayed on "Loading" for the
Layout Editor, after the pop-ups "The current role does not have access
to this operation." and "undefined".

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-28 (Actors row 4; Rules 12, 12a), two runs, as the
assigned Layout Editor, the assigned Series editor and the Press
manager: "Awaiting Approval" opened "Format Approval" with the text of
Rule 12 and "Cancel", "OK"; "OK" set "Approved", the same after a
reload, with no notice; "Approved" › "OK" set "Awaiting Approval";
"Cancel" changed nothing. A file's "Awaiting Approval" › "Approve Proof"
› "OK" set "Approved", and back, for the same three. On a scratch press
with the URN plugin on for "Publication Formats", a local format's
window added "URN" and the ticked box "Assign the URN
urn:nbn:de:0000-… to this publication format", and "OK" assigned it; a
remote format's window held the approval text alone; with URNs for
"Files" alone no format window had the step. With the box unticked, the
close arrow asked the question of Rule 12a; "OK" closed the window, and
reopened the box was ticked again.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-28 (Actors row 5; A1), two runs. The assigned
Series editor: "Not Available" › "OK" set "Available", the same after a
reload; a file's "Set Terms" › "Open Access" › "Save" set "Open
Access". The assigned Layout Editor and Indexer, on an unpublished and
a published book: "OK" in "Format Availability" raised the browser
pop-up "The current role does not have access to this operation.", the
window stayed open and the row read "Not Available" after a reload;
"Set Terms" opened a window holding only that sentence, and the link
still read "Set Terms".

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-28 (Actors row 6; A2), two runs. The Press manager
and the Site Administrator saw the four lists with "Add Code", "Add
Sales Rights", "Add Market" and "Add publication date". The assigned
Series editor (with and without the metadata-edit permission) and the
assigned Layout Editor (without and with it): the tab opened and the
four lists stayed on "Loading", each raising "The current role does not
have access to this operation." and "undefined"; "Single-component
retail product (00)" › "Save" closed the window and was kept on
reopening. An ISBN-13 either of them typed in the "Edit" tab showed in
"Product Identification" as "ISBN-13 (15)" for the Press manager.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-28 (Rule 2; Fields, the page; A14), two runs, as
the Press manager: "PDF", "EPUB", "Print" added to a book's second
version listed there in that order, the same after a reload, and the
first version's page read "No Items". "PDF" renamed from its "Edit"
moved to the end ("EPUB", "Print", "PDF renamed") at once and after a
reload, and the book page's links followed that order; a new version's
copy renamed the same way moved below the remote "Web". Under a format
its files listed newest first. On a book in External Review the side
menu offered "Publication Formats", the page offered "Add publication
format", and a format saved there listed as in Production.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-28 (Fields, the rows; Rule 11), two runs, as the
Press manager, the Site Administrator, an assigned Series editor and an
assigned Layout Editor: the format row read "PDFDigital (on physical
carrier) (DA)", name and kind in the same small grey type; a local
format showed "Change File" and "Select Files"; the format's arrow
offered "Edit", "Delete". A file row showed its number in the kind's
icon, then its name, a link that downloaded the file under its own
name; the file's arrow offered "More Information", "Edit", "Delete" on
a PDF file, and "Dependent Files" as well on an HTML file.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-28 (Fields, the format window; Rules 4a, 8), two
runs, as the Press manager: "Add publication format" was headed so,
with the one tab "Edit"; a format's "Edit" was headed "Edit" with
"Edit" and "Metadata" on a new press, and with "Identifiers" as well
for a local format on a press with "Enable for Publication Formats" and
URNs for formats on. The bottom "Cancel" closed without asking; the
close arrow with a name typed asked the question as a browser pop-up:
its "Cancel" kept the window and the name, its "OK" closed it and
nothing was saved; with nothing changed the arrow closed at once. A
changed name, then "Metadata", asked the same: "Cancel" stayed on
"Edit" with the change, "OK" moved to "Metadata" and dropped it.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-28 (Fields, the format window, "Name"; A15), two
runs: one box on a one-language press; "English" and "French (Canada)"
boxes on a two-language press, the second shown while the first has
focus. An empty name showed "This field is required." under the box,
the window stayed open and no request was sent. An English book's
format saved with the English name alone and was refused with the
French alone; a French book's was refused with the English alone and
with the French alone.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-28 (Fields, the remote box; Rule 5; A4), two runs,
as the Press manager: ticking the box showed "URL of remotely-hosted
content" and hid "URL Path", emptying it ("abc" gone, still empty after
unticking). The saved remote format's name was a link to its address,
opening in a new tab, with no "Change File" or "Select Files" and "This
item is remotely hosted." under it; its "Edit" had no "Identifiers" tab
where a local format of the same press had one. Unticked and "OK": the
name stayed a link, and reopened the box was ticked with the address.
Control on OJS and OPS: unticking the galley window's box emptied the
address.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-28 (Fields, the "Metadata" tab; Rule 17a; A16),
two runs, as the Press manager: the tab's order as in Fields, ending
"Required fields are marked with an asterisk: *", "Cancel", "Save".
"Save" with "Product Composition" empty sent nothing and showed "This
field is required." under the list; an imprint typed with it was gone
on reopening. "Single-component retail product (00)" › "Save" closed
the window with no notice, and the fields read back on the same page
and after a reload. A changed "Imprint (Brand Name)", then the "Edit"
tab, asked the question: "Cancel" stayed, "OK" switched and dropped the
change. The close arrow and the tab's "Cancel" closed without asking
and kept nothing, while the close arrow did ask for a changed "Edit"
tab field. "Product Availability" at "Available (20)" and at "Not yet
available (10)" left the "Availability" column as it was; 300
characters typed in "Imprint (Brand Name)" left 255.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-28 (Rule 17b; A6), two runs: on "PDF" ("Physical
format" unticked), "Print" (ticked) and a remote format, the tab showed
"Page Counts", "Returnable Indicator" and "Physical Dimensions", and
none of "Digital Information", "File Size in Mbytes", "Digital
Technical Protection" or "Enter your own file size value?".

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-28 (Fields, the code and date windows; Rules 19,
19a, 19b; A7, A22, A23), two runs, as the Press manager. "Add
publication date": "Date*", "Date Format*" on "YYYYMMDD (H)", "Role*"
on "CIP date (35)" (21 roles, alphabetical), "Cancel", "OK", then
"Required fields are marked with an asterisk: *". "YYYYMMDD" refused
"2026091" and took "20260915"; "YYYY" refused "20261" and took "2026";
"YYYYMMDD (H)" took "20261001"; "Text string" took "hello";
"abcdefgh" was saved as "YYYYMMDD". A refused date: no message six
seconds later, the window open with the required-fields line twice;
the message came with the next "Publication Date added.". An empty
"Date": "This field is required." under the box, no request. After a
date with "Publication date (01)", the next "Add publication date" no
longer offered it and arrived on the next unused role; that row's
"Edit" offered and preselected it. A date typed without touching the
lists was stored as "YYYYMMDD (H)" and "CIP date (35)", and the book's
Native XML export carried it as `<onix:Date dateformat="20">20261001</onix:Date>`
with the role 35. "Edit" › "OK" showed "Publication Date edited.";
"Delete" asked with the delete dialog and showed "Publication Date
removed.".

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-28 (Rules 15b, 15d; A8, A20), two runs, as the
Press manager with "Direct Sales" chosen: "Save" stayed greyed for an
empty box, "abc" and "1,500.00" (a press did nothing, no request);
"10.50", "25.00", ".99" and " 10" were saved (reopened "10.50",
"25.00", ".99", "10"); "10.5" and "-5" left "Save" pressable and were
refused with "A valid price is required.", the window open with "Errors
occurred processing this form" at its top, the link unchanged after a
reload. "0" was saved: the link read "Direct Sales" after a reload and
the window reopened on "Open Access"; on the published book a
visitor's link opened the file's view page with no sign-in.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-28 (Rule 6; A5), two runs, as the Press manager:
refused with the message under the box, the window open and nothing
saved: "my pdf", "-pdf", "a/b", "a..b", "pdf."; saved: "123", "pdf",
and "pdf" again on a second format of the same version; no notice at the
moment of either (the notices a later save shows: A24). On the book's page, with "pdf" on two formats the first's
file view page opened and the second's answered "404 Not Found"; with
the second's path set to the first's number and the first's path
emptied, the second's opened and the first's answered "404 Not Found".
OJS and OPS galley windows refused a number with "The URL path can not
be a number." and a used path with "The URL path has already been used
and can not be used again.".

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-28 (Rule 7), two runs, as the Press manager: the
two boxes stored the rows "ISBN-13 (15)" and "ISBN-10 (Discontinued)";
the "ISBN-13 (15)" row edited to "9780000000002" in the list showed in
the 13-digit box when the "Edit" tab was opened again, an unchanged
"OK" kept it, an emptied 10-digit box removed its row and a changed
13-digit box replaced the row's value; "not an isbn" in the 13-digit
box was stored as the code.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-28 (Rule 9; A3), two runs, as the Press manager:
the wizard "Upload a File Ready for Publication", steps "1. Upload
File", "2. Review Details", "3. Confirm"; step 1 held "Submission
Component*", "Drag and drop a file here to begin upload", "Upload File"
and "Continue", greyed until a file was added. Three uploads
(article.pdf, replacement.pdf, article.html) listed three files, each
"Awaiting Approval" and "Set Terms", newest first, none replaced, no
notice.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-28 (Rule 10; A19), two runs, as the Press manager:
the window's title and text as quoted, "Page Proofs" with the columns
"Select", "Name", "Component", the production-ready file under
"Production", unticked; the buttons "Close", "Cancel", "OK" and no
"Search". Ticking "Show files from all accessible workflow stages."
reloaded the list at once with every stage. "OK" with the file ticked:
no notice, the copy listed under a new number, "Awaiting Approval",
"Set Terms"; "Production Ready Files" still listed the source; a second
"Select Files" showed it unticked and "OK" added a second copy. The
close arrow with a file ticked closed the window at once, with no
question, and the rows stayed as they were.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-28 (Rule 13; Side effects, "Activity Log" and "A
format file's "History""; A12), two runs, as the Press manager: "Approve
Proof" and "Revoke Proof Approval" with their texts and "Cancel", "OK";
the row read "Approved", then "Awaiting Approval", at once and after a
reload, with no notice. The file's "History" held two lines after the
upload, four after the approval and six after the revoke, each press
adding 'The metadata for file "article.pdf" was edited by {username}.'
and '"Kim Manager" ({username}) has signed off on the signoff for
"article.pdf."'; the book's Activity Log gained the first line per
press. A format's creation, approval, revoked approval, availability,
withdrawn availability and deletion each added one Activity Log line
("…is no longer published." and "…is no longer available." among them;
the created and removed lines print "{$formatName}", a finding of
Submission activity log & notes); a refused availability added none.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-28 (Rule 14; A11), two runs, as the Press manager
and the assigned Series editor: "Format Availability" with both texts
as quoted and "OK" before "Cancel"; "OK" set "Available", then "Not
Available", at once and after a reload; "Cancel" sent nothing. A format
"Awaiting Approval" was made available, and a format approved while
"Not Available" stayed so until made available.

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-28 (Rules 15a, 15c; Fields, the terms window), two
runs, as the Press manager: a new file's window opened on "Not
Available", the box empty and greyed; "Save" unchanged turned the link
to "Not Available", on the same page and after a reload. "Direct
Sales" at "25.00" reopened with "25.00"; "Open Access" and "Not
Available" reopened with the box empty. "12.00" typed, then "Open
Access" or "Not Available", stayed in the greyed box and was editable
again on "Direct Sales". "Cancel" with a change asked nothing and the
link was unchanged; the close arrow with a change asked the question,
and its "OK" closed the window and dropped the change.

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-28 (Rule 16), two runs: on a published book the
Press manager revoked an approval, edited a format, made one
unavailable, set terms, added a format and a file, added and approved a
remote format and deleted a format; each change read back after a
reload and on the book's page right after. The assigned Layout Editor
and Series editor got the page with "Add publication format" and the
three columns, and the Layout Editor approved a format there. The texts
above the list read as quoted, the Author's included.

<a id="fn-td24"></a>
**td24** — Live-probed 2026-09-28 (Rule 18; Settings bullet 4; A21), two runs, as
the Press manager: "Add Code" opened "Add Code" with "Code Value*",
"ONIX Code Type*" (alphabetical, on "ARK (35)", no empty entry),
"Cancel", "OK". On a new press (DOIs on, "Monographs" the only item
with DOIs) and on one with "Publication Formats" among "Items with
DOIs": 21 types, no "DOI (06)", "ISBN-10 (Discontinued)" present; with
DOIs off: 22 types, "DOI (06)" offered. "ISBN-13 (15)" with
"9780000000002" › "OK" added the row and "Identification Code added.";
"Add Code" then no longer offered "ISBN-13 (15)", while the row's
"Edit" offered and preselected it; "Identification Code edited.";
"Delete" asked with the delete dialog, "Cancel" kept the row, "OK"
removed it with "Identification Code removed.". An empty "Code Value":
"This field is required." under the box, no request. "not-an-isbn" was
saved as "ISBN-10 (Discontinued)". A code added, then the tab left by
"Cancel", was kept.

<a id="fn-td25"></a>
**td25** — Live-probed 2026-09-28 (Rule 20; Side effects, "Files deleted"), two
runs, as the Press manager: the dialog titled "Delete" with its text,
"OK", "Cancel"; "Cancel" changed nothing, after a reload too; "OK"
removed the format and its file with "Publication Format removed.".
The file left a chapter window's "Files" list (six entries before,
five after); "Production Ready Files" was unchanged, the file never
having been there. The deleted file's download link then answered "The
current user is not authorized to access the specified submission
file.". The codes and other lists going with the format is note m's.

<a id="fn-td26"></a>
**td26** — Live-probed 2026-09-28 (Rule 21), two runs, as the Press manager:
after "Create New Version" the new version listed "PDF" ("Paperback /
softback (BC)", "Approved", "Available") with its file under a new
number ("Approved", "Open Access"), and the remote "Web" with its
address, "Awaiting Approval" and "Not Available". The copy's "Edit"
reopened with its kind, "Physical format" ticked, its URL Path and
ISBN-13, and its "Metadata" listed the "ISBN-13 (15)" code. Renaming
the copy left the first version's "PDF" unchanged.

<a id="fn-td27"></a>
**td27** — Live-probed 2026-09-28 (Side effects, "Notices" and "No email"), two
runs, as the Press manager: notices "Publication Format removed.",
"Identification Code added." and "Identification Code edited."; none on
"Add publication format" › "OK", "Edit" › "OK", two uploads, "Select
Files" › "OK", both approvals, availability, terms "Save" and
"Metadata" › "Save". After all of these and a drained job queue the
mail catcher held nothing for the book's Author, the Press manager, the
Series editor or the Layout Editor, and the Press manager's "Tasks"
count was unchanged.

<a id="fn-td28"></a>
**td28** — Live-probed 2026-09-28 (Side effects, "What readers see" and "The files
readers are offered"; A9, A10, A20), two runs and a third for the
reader side, as a visitor and as a signed-in Reader on published
books. Listed: an available format with an "Open Access" file, whether
that file read "Approved" or "Awaiting Approval" (a file uploaded on
screen and never approved too); a remote available format, as a link
to its address; a format with the URL Path "pdf", its link
`…/catalog/view/{book}/pdf/{file}` opening its view page. Not listed: a
"Not Available" format; an available format whose one file was "Not
Available"; one whose file had no terms. An "Approved", available
format with an ISBN showed "Details about the available publication
format: {name}" with "ISBN-13 (15) 9780000000002"; an available one
"Awaiting Approval" showed no such block. A "Direct Sales" file at
"25.00": on a press with "US Dollar" and "Manual Fee Payment" set up
the link read "25.00 Purchase PDF (25.00 USD)", a visitor was sent to
Login and a signed-in Reader got "Manual Fee Payment", its instructions
and "Fee 25.00 (USD)"; on a new press (no currency, no payment method)
the link read "PDF", a visitor was sent to Login and a signed-in Reader
to the catalog, with no message. Which of the currency and the payment
method decides the link's wording was not separated. Every file's view
page opened; its download failed (note p).

<a id="fn-td29"></a>
**td29** — Live-probed 2026-09-28 (Settings bullet 3; Rule 12a), two runs: a new
press lists "URN" unticked, and its "Settings" window offers
"Monographs", "Chapters", "Publication Formats", "Files". With
"Publication Formats" and "Files": the format window's "Identifiers",
"Format Approval"'s URN step, "Edit a file"'s "Identifiers", and
"Approve Proof" reading "URN" with the ticked box "Assign the URN
urn:nbn:de:0000-… to this file". A press with URNs for "Files" alone,
built through the tooling because the window refuses to save it
(Identifiers, its OMP1), showed the same on its files and no URN step
on its formats.

<a id="fn-td30"></a>
**td30** — Live-probed 2026-09-28 (Settings bullet 5; Fields, the terms window),
two runs: "Price ()" on a new press, "Price (USD)" on a press with "US
Dollar" saved. On a new press Settings › Distribution › "Payments"
shows only the unticked "Enable"; "Currency" appears once it is ticked.
The seeded press was not changed; a scratch press stood in for "a new
press".

<a id="fn-td31"></a>
**td31** — Live-probed 2026-09-28 (Fields, the terms window; A9), two runs, as the
Press manager on a new press (no payment method) and on one with a
payment method set up: the window's text and choices as quoted, and no
notice about a payment method in the window or in the format's
"Metadata" tab, before and after saving "Direct Sales" at "25.00".

<a id="fn-f-a1"></a>
**f-a1** — Notes c and j. `setAvailable`, `editApprovedProof` and
`saveApprovedProof` lack `ROLE_ID_ASSISTANT`, while the cell provider
renders both links for any `_canManage` user; `selectFiles` includes the
assistant role but the list inside (`ManageProofFilesGridHandler`) does
not. Every refusal answered with `status: false`, no server error.
Live-probed 2026-09-28: notes td3, td5, td6.

<a id="fn-f-a2"></a>
**f-a2** — Notes c and f: the four sub-grids assign every op to
`MANAGER` and `SITE_ADMIN` only; `editFormatMetadata` and
`updateFormatMetadata` include `SUB_EDITOR` and `ASSISTANT`.
Live-probed 2026-09-28: note td6.

<a id="fn-f-a3"></a>
**f-a3** — Note h. lib/pkp `AddFileLinkAction::_getTextLabels()` maps
`SUBMISSION_FILE_PROOF` to `submission.changeFile`; changed from an
add label in pkp/pkp-lib#1472 (2016-06-21, "Improve clarity around only
one file uploaded per galley in OJS"). A journal's or preprint server's
galley has its own "Change File" in the row's "More Actions" menu
("Edit", "Change File", "More Information", "Delete"), which replaces
the galley's one file (Submission files), live-probed 2026-09-28 on OJS
and OPS. Live-probed 2026-09-28 (OMP): note td18.

<a id="fn-f-a4"></a>
**f-a4** — Note e. `RepresentationFormHandler::toggleRemote_()` empties
`input[id^="urlRemote"]` on untick, but the box's id is `remoteURL`, so
nothing is emptied; `PublicationFormatForm::execute()` stores
`urlRemote` whenever `remoteURL` is posted non-empty, and a hidden input
is still posted. A journal's galley window empties it (Galleys, its
Fields).
Live-probed 2026-09-28: note td11.

<a id="fn-f-a5"></a>
**f-a5** — Note e: only the character check. `PublicationFormatDAO::getByBestId()`
first matches `url_path` within the version, then falls back to the
format number for a numeric value. The galley window's checks are
Galleys' Rule 5.
Live-probed 2026-09-28: note td16 (the two "404 Not Found" links follow
from that lookup).

<a id="fn-f-a6"></a>
**f-a6** — Note f. Introduced by pkp/pkp-lib#2072 (omp `ce205d583`,
2019-08-21, "Implement versioning and split publications from
submissions"), which added `editFormatMetadata()` passing three
arguments; before it the catalog-entry tab passed the format's physical
flag. The ONIX export reads `fileSize` and `technicalProtectionCode` for
digital formats (`MonographONIX30XmlFilter`).
The date is the omp checkout's git history. Live-probed 2026-09-28:
note td13.

<a id="fn-f-a7"></a>
**f-a7** — Note g. `PublicationDateForm::fetch()` assigns
`'dateFormat' => '20'` with the comment "YYYYMMDD Onix code as a
default"; in the shipped list 55, `00` is "YYYYMMDD" and `20` is
"YYYYMMDD (H)" (Hijri). The preset dates from omp `a92b2dd34`
(2012-01-12); the comment shows plain YYYYMMDD was meant, so it reads as
a slip, not a choice.
Live-probed 2026-09-28: note td14. The dedicated "ONIX 3.0 Monograph
Export Plugin" export failed for every book, validation ticked or not
(a finding for [ONIX metadata & export](U74-onix-metadata-export.md)), so the ONIX read was the one
inside the Native XML export.

<a id="fn-f-a8"></a>
**f-a8** — Note j: the server's pattern and `changeHandler_()`'s
`isNaN()` test differ.
Live-probed 2026-09-28: note td15.

<a id="fn-f-a9"></a>
**f-a9** — `NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD` has a title,
message (`notification.type.configurePaymentMethod`) and style in OMP's
`NotificationManager` and lib/pkp `PKPNotificationManager`, and
`PublicationFormatMetadataForm::fetch()` requests it for the tab, but no
code creates such a notification in any app. The terms form's own
`inPlaceNotification` requests none.
Live-probed 2026-09-28: notes td28, td31.

<a id="fn-f-a10"></a>
**f-a10** — Note p. pkp/pkp-lib#3467 (omp `ec7133010`, 2018-03-09, "not
approved files should be viewable") dropped the `viewable` test from the
book page, the download and the sitemap. Approval still feeds only the
calculated file size of the unreachable "Digital Information" group
(`PublicationFormat::getCalculatedFileSize()`).
Live-probed 2026-09-28: note td28 (a file uploaded on screen and never
approved was offered too).

<a id="fn-f-a11"></a>
**f-a11** — Note l. OMP `locale/en/locale.po`
`grid.catalogEntry.availableRepresentation.removeMessage`, from
pkp/pkp-lib#825 (omp `461a0e1d5`, 2015-10-21). Seen 2026-09-24 in
passing (Submission activity log & notes claim check, the
"formats-unavailable-dialog" read); live-probed 2026-09-28 again: note
td21.

<a id="fn-f-a12"></a>
**f-a12** — Note o. Live-probed 2026-09-28: note td20.

<a id="fn-f-a13"></a>
**f-a13** — Note c. `useWorkflowNavigationConfigOMP.js` adds
`publicationFormats` to the side menu with no Production check
(Workflow screen & stage access, its note q), while the grid's stage
policy refuses a role without Production access. Live-probed
2026-09-28: note c's probe line, two runs.

<a id="fn-f-a14"></a>
**f-a14** — Note d: every format is created with `seq` 0 and the list
is ordered by `seq` alone, so the database decides the order (the test
install runs PostgreSQL). Live-probed 2026-09-28: note td7. Unsettled:
after the same series of approvals, availability changes and terms on
six seeded formats, one run listed "Delta, Golf, Alpha, Bravo, Charlie,
Echo" and the other "Alpha, Bravo, Charlie, Delta, Golf, Echo", on the
page and on the book's page alike; saving one file's terms on a version
of four formats and reading the order before and after, twice, would
settle it.

<a id="fn-f-a15"></a>
**f-a15** — Note e: the form requires the name in the book's language
only; the refusal came from the in-browser check, with no request sent.
Live-probed 2026-09-28: note td10.

<a id="fn-f-a16"></a>
**f-a16** — Note f (`trackFormChanges`). Live-probed 2026-09-28: note
td12.

<a id="fn-f-a17"></a>
**f-a17** — Note f: `pageCounts` and the `productDimensions` boxes have
no validator. Live-probed 2026-09-28, two runs: "xii", "abc", "tall"
and "heavy" saved on "Print", then Tools › "Native XML Plugin" ›
"Export Submissions" for the book failed, naming each value as "not a
valid value of the atomic type …dt.StrictPositiveDecimal"; with "12",
"3", "240" and "500" the export completed.

<a id="fn-f-a18"></a>
**f-a18** — Note f: every unit list is ONIX list 50. Live-probed
2026-09-28, two runs: the height and weight lists read the same eight
entries.

<a id="fn-f-a19"></a>
**f-a19** — Note i (`editor.submission.proof.manageProofFilesDescription`).
Live-probed 2026-09-28: note td19.

<a id="fn-f-a20"></a>
**f-a20** — Note j: "Direct Sales" at 0 stores `salesType`
`directSales` with `directSalesPrice` 0; the link shows the sales type,
the window's opening logic reads a price of 0 as "Open Access", and the
book's page offers a file whose price is 0 as free. Live-probed
2026-09-28: notes td15, td28.

<a id="fn-f-a21"></a>
**f-a21** — Note g: `IdentificationCodeForm` drops `06` while
`Context::areDoisEnabled()`, whatever items the press gives DOIs to.
Live-probed 2026-09-28: note td24.

<a id="fn-f-a22"></a>
**f-a22** — Note g: the roles are ONIX list 163 minus the format's used
ones, with no preset and no empty entry, so the browser selects the
first. Live-probed 2026-09-28: note td14 (the book's export carried the
role as 35).

<a id="fn-f-a23"></a>
**f-a23** — Note g (the custom length check, `grid.catalogEntry.dateRequired`).
Live-probed 2026-09-28: note td14.

<a id="fn-f-a24"></a>
**f-a24** — Test run 2026-09-28 (OMP suite, scenario 8, as the Press
manager): after "my pdf" and "a/b" were refused in "PDF"'s "Edit" window
and "print-edition" saved, the window closed and the page's notice area
held two notices "This may only contain letters, numbers, dashes,
underscores and periods.", each with "Close". Each refused "OK" answered
200 with the form again (`update-format`); the page's
`notification/fetchNotification` after the saving "OK" returned two
`general` notifications titled "Errors occurred processing this form",
class `notifyFormError`, with that message. The refused date of A23
arrives the same way. Evidence: `.reports/U73/tomp/`.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The workflow's "Publication Formats" page | workflow › "Publication" › the version › "Publication Formats", editorial and author views | AFFW-276, AFFW-426, VUE-044 |
| The format list (legacy grid in the Vue shell) | component `grid.catalogEntry.PublicationFormatGridHandler` | AFFW-573, GRID-092 |
| The format window: tabs "Edit", "Metadata", "Identifiers" | a format's "Edit"; "Add publication format" | AFFW-754, AFFW-755, AFFW-756 (the "Identifiers" tab cited; *Identifiers*) |
| The "Edit" tab: "OK" / "Cancel", the remote-address block | the format window | AFFW-758 |
| "Format Approval", "Approve Proof", "Revoke Proof Approval" | a format's or a format file's "Complete" link | AFFW-608 |
| "Format Availability" | a format's "Availability" link | GRID-092 (`setAvailable`) |
| "Set Terms for Downloading": sales type and price | a format file's "Availability" link | AFFW-770, AFFW-771 |
| "Select Files" | a format's row; component `grid.files.proof.ManageProofFilesGridHandler` | GRID-023 (claimed here for OMP) |
| A format file's "Edit a file" tabs "Edit Metadata", "Identifiers" | a format file's arrow › "Edit" | AFFW-599 (claimed here for OMP) |
| "Dependent Files" | an HTML or XML format file's arrow | AFFW-757 |
| The "Metadata" tab: "Save", the four lists, the physical and digital groups | the format window | AFFW-765, AFFW-766 (the "Sales Rights" and "Market Territories" lists cited; [ONIX metadata & export](U74-onix-metadata-export.md)), AFFW-767, AFFW-768 (the digital group, unreachable, A6), AFFW-769 |
| "Product Identification": the code window | the "Metadata" tab | AFFW-759, GRID-089 |
| "Publication Dates": the date window | the "Metadata" tab | AFFW-761, GRID-091 |
| A format's Activity Log name | the log lines (*Submission activity log & notes*) | SET-036 |
| A format file's terms and chapter | the file record | SET-040 |

## Reference — code anchors

- Format list: OMP `controllers/grid/catalogEntry/PublicationFormatGridHandler.php`,
  `PublicationFormatGridCategoryRow.php`, `PublicationFormatGridRow.php`,
  `PublicationFormatGridCellProvider.php`,
  `PublicationFormatCategoryGridDataProvider.php`; lib/pkp
  `classes/controllers/grid/CategoryGridHandler.php`,
  `controllers/grid/files/SubmissionFilesGridRow.php`,
  `controllers/grid/files/FileNameGridColumn.php`,
  `controllers/api/file/linkAction/AddFileLinkAction.php`,
  `controllers/grid/files/fileList/linkAction/SelectFilesLinkAction.php`,
  `templates/controllers/grid/gridRow.tpl`.
- Format window: OMP `controllers/grid/catalogEntry/form/PublicationFormatForm.php`,
  `templates/controllers/grid/catalogEntry/editFormat.tpl`,
  `templates/controllers/grid/catalogEntry/form/formatForm.tpl`; lib/pkp
  `js/controllers/grid/representations/form/RepresentationFormHandler.js`.
- Metadata tab: OMP `controllers/grid/catalogEntry/form/PublicationFormatMetadataForm.php`,
  `templates/controllers/tab/catalogEntry/form/publicationMetadataFormFields.tpl`,
  `physicalPublicationFormat.tpl`, `digitalPublicationFormat.tpl`,
  `js/controllers/modals/catalogEntry/form/PublicationFormatMetadataFormHandler.js`;
  `controllers/grid/catalogEntry/IdentificationCodeGridHandler.php`,
  `IdentificationCodeGridRow.php`, `IdentificationCodeGridCellProvider.php`,
  `form/IdentificationCodeForm.php`, `templates/controllers/grid/catalogEntry/form/codeForm.tpl`;
  `PublicationDateGridHandler.php`, `PublicationDateGridRow.php`,
  `PublicationDateGridCellProvider.php`, `form/PublicationDateForm.php`,
  `templates/controllers/grid/catalogEntry/form/pubDateForm.tpl`;
  `classes/codelist/ONIXCodelistItemDAO.php`, `locale/en/ONIX_BookProduct_Codelists.xml`;
  lib/pkp `xml/onixFilter.xsl`.
- Terms and approvals: OMP `controllers/grid/files/proof/form/ApprovedProofForm.php`,
  `templates/controllers/grid/files/proof/form/approvedProofForm.tpl`,
  `approvedProofFormFields.tpl`,
  `js/controllers/grid/files/proof/form/ApprovedProofFormHandler.js`,
  `templates/controllers/grid/pubIds/form/assignPublicIdentifiersForm.tpl`;
  lib/pkp `controllers/grid/pubIds/form/PKPAssignPublicIdentifiersForm.php`,
  `classes/linkAction/request/RemoteActionConfirmationModal.php`.
- File selection and file windows: lib/pkp
  `controllers/grid/files/proof/form/ManageProofFilesForm.php`,
  `controllers/grid/files/proof/ManageProofFilesGridHandler.php`,
  `templates/controllers/grid/files/proof/manageProofFiles.tpl`,
  `controllers/grid/files/SelectableSubmissionFileListCategoryGridHandler.php`,
  `controllers/grid/files/form/ManageSubmissionFilesForm.php`,
  `controllers/api/file/PKPManageFileApiHandler.php`,
  `templates/controllers/api/file/editMetadata.tpl`; OMP
  `controllers/api/file/ManageFileApiHandler.php`,
  `templates/controllers/grid/catalogEntry/dependentFiles.tpl`.
- Model: OMP `classes/publicationFormat/PublicationFormat.php`,
  `PublicationFormatDAO.php`, `PublicationFormatTombstoneManager.php`,
  `IdentificationCodeDAO.php`, `PublicationDateDAO.php`,
  `classes/services/PublicationFormatService.php` (`deleteFormat()`),
  `classes/publication/Repository.php` (`version()`),
  `schemas/submissionFile.json`, `schemas/eventLog.json`; lib/pkp
  `classes/submission/Representation.php`,
  `classes/submissionFile/SubmissionFile.php`.
- Workflow: ui-library `src/managers/PublicationFormatManager/PublicationFormatManager.vue`,
  `src/components/GridWrapper/GridWrapper.vue`,
  `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOMP.js`,
  `workflowConfigAuthorOMP.js`, `useWorkflowConfigOMP.js`,
  `useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`.
- Reader side: OMP `pages/catalog/CatalogBookHandler.php`,
  `templates/frontend/objects/monograph_full.tpl`,
  `templates/frontend/components/downloadLink.tpl`.
- Strings: OMP `locale/en/locale.po` (`grid.catalogEntry.*`,
  `grid.action.addFormat`, `grid.action.addCode`, `grid.action.addDate`,
  `monograph.publicationFormat*`, `payment.directSales.*`,
  `editor.monograph.approvedProofs.*`, `notification.*IdentificationCode`,
  `notification.*PublicationDate`, `notification.removedPublicationFormat`,
  `notification.type.configurePaymentMethod`), `locale/en/submission.po`
  (`submission.complete`, `submission.incomplete`,
  `submission.publicationFormats`, `submission.dependentFiles`,
  `submission.event.publicationFormat*`, `publication.editDisabled`);
  lib/pkp `locale/en/*.po` (`common.*`, `grid.action.*`,
  `submission.changeFile`, `submission.upload.proof`,
  `editor.submission.proofreading.*`, `editor.submission.selectFiles`,
  `editor.submission.proof.manageProofFilesDescription`,
  `submission.pageProofs`, `publication.urlPath*`,
  `validator.alpha_dash_period`, `publication.editorEditWarning`,
  `submission.event.signoffSignoff`).
