---
name: onix-metadata-export
status: verified
---

# ONIX metadata & export {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A press sells its books through the book trade, and the trade passes
product information around in **ONIX** ("ONIX for Books"), the book
industry's standard file for describing books to distributors,
wholesalers and retailers. Press staff record the trade data that only
this file reads; readers never see any of it. Per book: its
**audience** (who the book is written for) on the workflow's
"Marketing" › "Audience" page, and its **representatives** on
"Marketing" › "Representatives": the **agents** who sell the book for
the press in a territory and the **suppliers** who deliver copies. Per
publication format, in the "Metadata" tab of the format's window: its
**sales rights** (where the press may or may not sell the format) and
its **market territories** (where it is sold, through which agent and
supplier, at what price). Tools › "ONIX 3.0 Monograph Export Plugin"
then exports chosen books as one ONIX 3.0 file, one product per format.
Today that export fails for every book ⚠ [A1](#a1); the same product
data reaches a file only inside a press's Native XML export (Rule 19).
The format window and its other catalog data (identification codes,
publication dates, product details) belong to
[Publication formats & proof terms](U73-publication-formats-proof-terms.md),
the press's own ONIX details to
[Journal identity & about pages](U07-journal-identity-and-about-pages.md),
and the Tools list to [Import & export](U63-import-export.md). <sup>a</sup>

A journal and a preprint server do not install ONIX. Their workflow's
side menu has no "Marketing" group (a typed address naming one of its
pages opens the submission's current stage instead), a galley's "Edit" window
has one tab, "Edit Metadata", with no "Sales Rights" or "Market
Territories" list, and Tools › "Import/Export" lists no ONIX tool.
<sup>b</sup> <sup>td1</sup>

## Actors & permissions

The "Marketing" group is part of the workflow's editorial view only.
Who opens that view, and that the author's view has no "Marketing"
group, is
[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#side-menu)
(its OMP1). "The assistant roles" below are the press's default
assistant roles: Copyeditor, Layout Editor, Designer, Indexer,
Proofreader, Marketing and sales coordinator and Funding coordinator.
The press's eighth "Assistant" role, Editorial Board Member, takes part
in no stage: the Participants "Assign" window never offers it, and an
Editorial Board Member placed on a book gets an "Error" window reading
"The current role does not have access to this operation." on opening
it. "Assigned" means listed as a participant on the book; a Series editor
or assistant role not assigned to the book cannot open its workflow at
all. The Press manager, Press editor and Production editor are the
press's manager-level roles. <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open "Audience" and "Representatives"** (Rules 1, 2, 5) | • every role that opens the book's editorial view: the Press manager, Press editor, Production editor, the Site Administrator, the assigned Series editor and the assigned assistant roles, whatever stage the book is in<br>• the Author: never offered; the author's view has no "Marketing" group <sup>c</sup> <sup>td2</sup> |
| **Save "Audience"** (Rules 2–4) | • the Press manager, Press editor, Production editor, the Site Administrator, and the assigned Series editor, whatever the "Permissions" box of their assignment ("Allow this person to make changes to the publication…") or the role's "Permit submission metadata edit." says<br>• the assigned assistant roles: "Save" is pressable, but saving is refused ⚠ [A2](#a2) <sup>c</sup> <sup>td3</sup> |
| **Add, edit and delete representatives** (Rules 5–8) | • every role of the first row, the assigned assistant roles included <sup>c</sup> <sup>td4</sup> |
| **Add, edit and delete sales rights and market territories** (Rules 9–15) | • the Press manager, Press editor, Production editor and Site Administrator, on any version, published or not<br>• the assigned Series editor, Layout Editor, Designer, Indexer and Proofreader: the format window's "Metadata" tab opens, but its "Sales Rights" and "Market Territories" lists stay on "Loading" ([Publication formats & proof terms, its A2](U73-publication-formats-proof-terms.md#a2))<br>• the assigned Copyeditor, Marketing and sales coordinator and Funding coordinator: the "Publication Formats" page shows only "You don't currently have access to that stage of the workflow.", so they never reach the format window <sup>c</sup> <sup>td5</sup> |
| **Open "ONIX 3.0 Monograph Export Plugin" and export** (Rules 16–18) | • the roles that open Tools, as [Import & export](U63-import-export.md) names them in its Actors table; every other role gets the access-denied page at the tool's address <sup>c</sup> |

## Fields & validation

Every list on these screens is one of the book trade's code lists,
except the market's "Agent" and "Supplier", which list the book's
representatives by name. An option reads the name and its code in
brackets, such as "Children (02)"; "Date Format" names the format
alone, such as "YYYYMMDD". The options are sorted by their text, but
not quite alphabetically: capitals come before small letters, and
accented letters after "z". So "GLN (06)" comes before "German ISBN
Agency publisher identifier (05)", "FRP including tax (04)" before
"Freight-pass-through RRP excluding tax (31)", and "Åland Islands" is
the last country before the discontinued ones. Any code the trade has retired comes last,
reading "(Discontinued)" in place of its code. <sup>d</sup>

<a id="audience-page"></a>
**The "Audience" page.** The editorial view's side menu, "Marketing" ›
"Audience", headed "Marketing: Audience": five lists, none required,
then "Save". A new book shows every list blank. None of the lists has
an empty choice, so a list once saved can be changed but not emptied
⚠ [A3](#a3). <sup>d</sup> <sup>td6</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Audience** | No | 13 audiences, "Adult education (08)" first and "Upper secondary education (14)" last; among them "General / adult (01)", "Children (02)" and "Professional and scholarly (06)". <sup>d</sup> |
| **Audience Range Qualifier** | No | What the three range lists below measure: 22 kinds in all, 19 current ones, "Brazil Education level (31)" first, among them "US school grade range (11)" and "Reading age, years (18)", then three discontinued ones, "Schulform (Discontinued)" last. <sup>d</sup> |
| **Audience Range (from)**, **Audience Range (to)**, **Audience Range (exact)** | No | The same 19 United States school and college grades each, "College Freshman (13)" first and "Twelfth Grade (12)" last, among them "Preschool (P)" and "Kindergarten (K)", whatever "Audience Range Qualifier" holds (Rule 3). <sup>d</sup> |

<a id="representatives-page"></a>
**The "Representatives" page.** The side menu's "Marketing" ›
"Representatives", headed "Marketing: Representatives": one table
headed "Representatives" with "Add Representative" at its top right and
the columns "Name" and "Role". The table has two groups, "Agents" and
"Suppliers", each listing the book's representatives of that type:
the name, and the role as its list names it, such as "Exclusive sales
agent (05)". A group with no representative reads "No Items". An arrow
before a name opens "Edit" and "Delete". <sup>e</sup> <sup>td7</sup>

**The representative window.** "Add Representative" opens a window
headed "Add Representative", a representative's "Edit" one headed
"Edit". Top to bottom, then "Cancel" and "OK", and "Required fields are
marked with an asterisk: *": <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Representative Type** | Yes | Two choices, "Agent" and "Supplier"; "Supplier" is chosen on a new representative. <sup>e</sup> |
| **Role** | Yes | One list per type (Rule 6): for "Agent" four roles, "Exclusive sales agent (05)", "Local publisher (07)", "Non-exclusive sales agent (06)" and "Sales agent (08)"; for "Supplier" 16 roles, "Distributor to end-customers (12)" first and "Sales agent (Discontinued)" last. Either list starts on an empty choice. The window opens with both lists side by side, the agent roles on the left, until "Agent" or "Supplier" is clicked ⚠ [A12](#a12). <sup>e</sup> <sup>td12</sup> |
| **Name** | Yes | Free text. <sup>e</sup> |
| **Representative ID Type (GLN is recommended)** | No | Ten kinds of trade identifier after an empty choice, "Börsenverein Verkehrsnummer (04)" first and "Proprietary (Discontinued)" last; a new representative arrives on "GLN (06)". <sup>e</sup> |
| **Representative ID** | No | Free text. <sup>e</sup> |
| **Phone** | No | Free text. <sup>e</sup> |
| **Email Address**, **Website** | No | One box each; Rule 7 says what they accept. <sup>e</sup> |

<a id="sales-rights-list"></a>
**The "Sales Rights" list** (a format's "Edit" › the "Metadata" tab,
[→ the tab](U73-publication-formats-proof-terms.md#metadata-tab)): a
table headed "Sales Rights" with "Add Sales Rights" at its top right and
the columns "Sales Rights Type" (the type as its list names it) and
"Rest of World?" (a tick for the entry that has it). An empty list reads
"No Items". An arrow before a row opens "Edit" and "Delete". <sup>f</sup>

**The sales-rights window.** "Add Sales Rights" opens a window headed
"Add Sales Rights", a row's "Edit" one headed "Edit". Top to bottom, then
"Cancel" and "OK", and "Required fields are marked with an asterisk: *":
<sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Sales Rights Type** | Yes | Nine types, "For sale with exclusive rights in the specified countries or territories (01)" first and two discontinued types last; no empty choice, so a new entry arrives on the first type offered. Each type is offered once per format (Rule 10). <sup>f</sup> |
| **Rest of World?** | No | One box, under "Check this box to use this Sales Rights entry as a catch-all for your format. Countries and regions need not be chosen in this case." (Rule 11). <sup>f</sup> |
| **Countries**: "Included", "Excluded" | No | Two lists of 252 countries each after an empty line, "Afghanistan (AF)" first, "Yugoslavia (Discontinued)" last; several can be chosen in each (Ctrl-click, Cmd-click on a Mac). The empty line chosen alone saves as no country. <sup>f</sup> <sup>td15</sup> |
| **Regions**: "Included", "Excluded" | No | Two lists of 352 regions each after an empty line, "Agrigento (IT-AG)" first, among them "World (WORLD)"; several can be chosen in each. The empty line chosen alone saves as no region. <sup>f</sup> <sup>td15</sup> |

<a id="markets-list"></a>
**The "Market Territories" list** (the same tab, under "Sales Rights"):
a table headed "Market Territories" with "Add Market" at its top right
and the columns "Territory", "Representatives" and "Price". "Territory"
reads "Included: ", the chosen countries' and regions' codes joined by
commas, then ", Excluded: " and the excluded ones, such as "Included:
CA, US, Excluded: GB". "Representatives" names the market's agent and
supplier, joined by a comma. "Price" shows the price followed by the
currency code with no space between, such as "25CAD" ⚠ [A4](#a4). An
empty list reads "No Items". An arrow before a row opens "Edit" and
"Delete". <sup>g</sup> <sup>td8</sup>

**The market window.** "Add Market" opens a window headed "Add Market",
a row's "Edit" one headed "Edit". Top to bottom, then "Cancel" and "OK",
and "Required fields are marked with an asterisk: *": <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Date** | Yes | Free text, with the lists "Date Format" and "Role" beside it. Refusals: Rule 13a. <sup>g</sup> |
| **Date Format** | — (always set) | 19 date formats, without codes, "Text string" first; no empty choice. A new market arrives on "YYYYMMDD (H)", the format for a date in the Islamic (Hijri) calendar ⚠ [A5](#a5). <sup>g</sup> |
| **Role** | — (always set) | 21 kinds of date, "CIP date (35)" first; no empty choice. A new market arrives on "Publication date (01)". <sup>g</sup> |
| **Agent** | No | Under "You may assign an agent to represent you in this defined territory. It is not required.": an empty choice, then the book's agents by name (Rule 14). <sup>g</sup> |
| **Supplier** | No | An empty choice, then the book's suppliers by name (Rule 14). <sup>g</sup> |
| **Countries**, **Regions** | No | As in the sales-rights window. <sup>g</sup> |
| **Price** | Yes | Free text, with a currency list beside it: 198 currencies, "Afghani (AFN)" first and the discontinued ones last. A new market arrives on "Canadian Dollar (CAD)", whatever currency the press takes payments in. Refusals: Rule 13a. <sup>g</sup> <sup>td9</sup> |
| **Price Type** | No | An empty choice, then 30 price types, "FRP excluding tax (03)" first; empty on a new market. <sup>g</sup> |
| **Taxation Rate** | No | An empty choice, then six rates, "Higher rate (H)" first and "Zero-rated (Z)" last; empty on a new market. Which rates a Native XML export accepts: Rule 19. <sup>g</sup> |
| **Taxation Type** | No | An empty choice, then "ECO (03)", "GST (Sales tax) (02)" and "VAT (Value-added tax) (01)"; empty on a new market. A market saved with it empty reopens in "Edit" on "GST (Sales tax) (02)", and "OK" then stores that ⚠ [A6](#a6). <sup>g</sup> <sup>td10</sup> |
| **Discount percentage, if applicable** | No | Free text. <sup>g</sup> |

**Leaving a window.** With something typed or chosen, the
representative, sales-rights or market window's "Cancel" closes it at
once and keeps nothing. The sales-rights and market windows' close
arrow asks first, "The data on this form has changed. Do you wish to
continue without saving?": the question's "OK" closes the window and
drops the change, its "Cancel" keeps the window open. <sup>td12</sup> <sup>td14</sup> <sup>td16</sup>

<a id="export-page"></a>
**The export page.** Tools › "Import/Export" › "ONIX 3.0 Monograph
Export Plugin" opens a page headed with the tool's name, as every tool
page is ([Import & export](U63-import-export.md), its Rule 4). While the
press's ONIX details are incomplete it holds one sentence (Rule 16);
otherwise one tab, "Export", holding: <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| the list titled "Monographs" | — | A search box and "Filters" at its top right; each line a tick box, the book's title and "View" (Rule 17). <sup>i</sup> |
| **Validate XML before the export and registration.** | No | One box, ticked when the page opens. <sup>i</sup> |
| **Select All**, **Export Submissions** | — | Two buttons under the list (Rules 17, 18). <sup>i</sup> |

Leaving the page after typing a search or changing the validation box
asks the browser's "Leave site?" question; after ticking books or
pressing "Select All" the page is left without a question. On return
nothing is ticked and the box is ticked again. <sup>td19</sup>

## Rules & state

**The "Marketing" pages**

1. **Per book.** "Audience" and "Representatives" belong to the book,
   not to a version: every version of the book has the same audience and
   the same representatives, and neither page changes when a version is
   created or published. They sit in the side menu's "Marketing" group
   with "Publication Dates", which belongs to
   [Chapters & work type](U72-chapters-work-type.md). <sup>a</sup> <sup>td11</sup>
2. **Saving the audience.** "Save" stores the five lists as they stand,
   the page shows "Saved" beside the button, and the lists read the same
   after a reload. Opening another page of the workflow, or reloading
   the page, drops an unsaved choice without asking. <sup>d</sup> <sup>td6</sup>
3. **The lists do not depend on one another.** Every range list offers
   the United States grades whatever "Audience Range Qualifier" holds; a
   range saves with no qualifier; and "Audience Range (exact)" saves
   beside "(from)" and "(to)". Which of them reach the ONIX file is
   Rule 20. <sup>d</sup> <sup>td6</sup>
4. **Only the listed codes.** A saved list holds one of its options or
   nothing; the page offers no way to type a code of one's own.
   <sup>d</sup>
5. **Adding a representative.** "OK" adds the representative under
   "Agents" or "Suppliers" by its type, and the notice "Representative
   added." appears; "Edit" › "OK" shows "Representative edited.". On an
   install with no representative yet, the first one is saved (an agent
   with "Representative added.") but unlisted until a reload
   ⚠ [A20](#a20). Each group lists its representatives in the order they
   were added, but one saved again through "Edit" can move to the end of
   its group.
   <sup>e</sup> <sup>td7</sup>
6. **The type decides the role list.** Once "Agent" is clicked, "Role"
   shows the agent roles alone, and once "Supplier" is clicked the
   supplier roles alone (until the first click both show,
   [A12](#a12)); switching back and forth keeps each list's choice
   until "OK", which stores the role of the type chosen. An existing
   representative whose type is changed moves to the other group; until
   the page is reloaded the table also keeps it, with its old role,
   under its old group ⚠ [A13](#a13). <sup>e</sup> <sup>td12</sup>
7. **What the window refuses.** An empty "Name", or "Role" left on its
   empty choice, is refused with "This field is required." under the
   field, and nothing is saved. "Email Address" refuses text that is not
   an email address, with "Please enter a valid email address." under
   the box. "Website" refuses anything not starting with "http://" or
   "https://", "www.example.org" included, with "Please enter a valid
   URL."; nothing is saved. "Representative ID" and "Phone" take any
   text. <sup>e</sup> <sup>td12</sup>
8. **Deleting a representative.**
   - 8a. "Delete" opens the delete dialog, titled "Delete", with "Are
     you sure you wish to delete this item? This action cannot be
     undone.", "OK" and "Cancel"; "OK" removes the representative and
     shows "Representative removed.", "Cancel" keeps it. <sup>e</sup> <sup>td13</sup>
   - 8b. A representative that a market territory names as its agent
     or supplier, on any format of any version of the book, is kept.
     "OK" raises a browser pop-up reading "You can not delete this
     representative because they are assigned to the market metadata
     for one or more publication formats for this submission."; the
     "Delete" dialog then stays open with a spinner, "OK" again repeats
     the pop-up, and only "Cancel" closes it. The row stays ⚠
     [A14](#a14). <sup>e</sup> <sup>td13</sup>

**Sales rights and market territories**

9. **Per format, saved on their own.** Each format of each version has
   its own two lists. They save row by row, not with the tab's "Save"
   ([Publication formats & proof terms](U73-publication-formats-proof-terms.md),
   its Rule 17a). "OK" in the window adds the row with the notice "Sales
   Rights added." ("Market added."); a row's "Edit" › "OK" shows "Sales
   Rights edited." ("Market edited."). Its "Delete" opens the delete
   dialog of Rule 8a, whose "OK" removes it with "Sales Rights
   removed." ("Market removed.") and whose "Cancel" keeps it.
   <sup>f</sup> <sup>g</sup> <sup>td14</sup>
10. **Each type once per format.** "Add Sales Rights" offers only the
    types the format has not used yet and arrives on the first of them;
    an entry's "Edit" also offers, and arrives on, the entry's own
    type. A deleted entry's type is offered again. Once a format has
    used all nine types, "Add Sales Rights" still opens, its "Sales
    Rights Type" list empty, and "OK" shows "This field is required."
    under it, so nothing can be saved. <sup>f</sup> <sup>td14</sup>
11. **One "Rest of World?" entry.** One entry per format may have "Rest
    of World?" ticked. Saving a second entry with it ticked does nothing
    visible: the window stays open, a second "Required fields are marked
    with an asterisk: *" line appears, and nothing is saved. "There is
    already a ROW sales type defined for this publication format." shows
    only later, as a notice after a reload or with the next "Sales
    Rights added." ⚠ [A15](#a15). A ticked entry needs no country or
    region; any chosen beside the tick are kept in the window, and the
    ONIX file leaves them out (Rule 21). <sup>f</sup> <sup>td15</sup>
12. **No territory needed.** An entry without "Rest of World?" saves with
    no country and no region chosen, and the book's Native XML export
    then fails (Rule 19) ⚠ [A7](#a7). <sup>f</sup> <sup>td15</sup>
13. **What the market window checks.**
    - 13a. An empty "Date" or "Price" is refused with "This field is
      required." under the box, and nothing is saved. Nothing checks
      their form: "abc" saves as a date whatever "Date Format" says, and
      "ten" saves as a price ⚠ [A8](#a8). A "Date" or "Price" of spaces
      only is refused without a word: the box is emptied, no message
      shows, and "A date is required and the date value must match the
      chosen date format." (for the price
      "##grid.catalogEntry.priceRequired##") arrives as a notice with
      the next "Market added." [A15](#a15). <sup>g</sup> <sup>td16</sup>
    - 13b. Nothing else is required: a market with no country, no
      region, no agent and no supplier saves; without a country or
      region the book's Native XML export then fails (Rule 19)
      [A7](#a7). <sup>g</sup> <sup>td16</sup>
14. **Agents and suppliers come from the book.** "Agent" lists the
    book's representatives of type "Agent" and "Supplier" those of type
    "Supplier" (Rules 5, 6), each in the order they were added on
    "Representatives"; a book with none of a type offers that list's
    empty choice alone. <sup>g</sup> <sup>td16</sup>
15. **New versions and deleted formats.** "Create New Version" copies
    each format's sales rights and market territories to the same format
    of the new version, the copied markets naming the same
    representatives; a later change on either version leaves the other
    version's lists as they were. Deleting a format removes its two
    lists with it
    ([Publication formats & proof terms](U73-publication-formats-proof-terms.md),
    its Rule 20). <sup>h</sup> <sup>td17</sup>

**The ONIX export**

16. **The press's details first.** While any of the press's "Press
    Publisher Name", "Geographical Location", "Publisher Code Type" and
    "Publisher Code" is blank (Settings bullet 1), the tool's page shows
    only "This press is missing some required information. Please go to
    Press Settings and fill in the missing details.", with no tab and no
    list. "Press Settings" is a link to Settings › Press, which opens on
    its "Masthead" tab. The Native XML tool's "Export" tab shows a
    differently worded reminder of its own and keeps its list
    ([Import & export](U63-import-export.md), its Rule 19). <sup>i</sup> <sup>td18</sup>
17. **The list.** With all four filled, the "Export" tab's list, its
    "Filters" and "Select All" work as the Native XML export list does
    ([→ the export list](U63-import-export.md#export-list), its Rules
    14–15a): every book of the press, in any stage and state, 100 to a
    page. "View" opens the book's workflow, or, for an unfinished
    submission, "Make a Submission" (headed "Make a Submission: Upload
    Files"), as on the Native XML list. <sup>i</sup> <sup>td19</sup>
18. **Exporting.** "Export Submissions" with one book or more ticked
    adds a tab "Export Submissions Results" and opens it: "The process
    failed. Check below for errors/warnings.", then "Errors occured:",
    "Generic Items" and "Filter (ONIX 3.0 XML monograph export) supports
    input classes.submission.Submission[] - array given", and no
    download. It ends the same with "Validate XML before the export and
    registration." ticked or not [A1](#a1). Expected: "The export
    completed successfully." and a "Download Exported File" button that
    downloads the ONIX file (Rules 20–24). Each "Export Submissions"
    adds another results tab; its "Close" removes the tab and returns to
    "Export" with the ticks kept. <sup>j</sup> <sup>td20</sup>
    - 18a. **Nothing ticked.** Pressed with no book ticked, "Export
      Submissions" adds the "Export Submissions Results" tab and opens
      it empty, with no text and no button, whether the validation box
      is ticked or not, while the server fails behind it ⚠
      [A16](#a16). <sup>j</sup> <sup>td21</sup>
19. **Where the trade data reaches a file today.** While the press's
    four ONIX details are filled, each publication format in a book's
    Native XML export file (Tools › "Native XML Plugin" › "Export")
    carries the format's ONIX product, built as Rules 20 to 23 say. The
    export then completes only while every product is valid ONIX. A
    format whose data ONIX refuses makes the book's Native XML export
    end with "The process failed. Check below for errors/warnings.",
    naming the refused element and value, even with the Native XML
    tool's own "Validate XML before the export and registration."
    unticked; every other book ticked with it fails too. ONIX refuses
    these: <sup>l</sup> <sup>td22</sup>
    - a market price that is not a number, such as "ten" (Rule 13a)
      [A8](#a8);
    - page counts such as "xii"
      ([Publication formats & proof terms, its A17](U73-publication-formats-proof-terms.md#a17));
    - a sales-rights entry without "Rest of World?", or a market, with
      no country and no region (Rules 12, 13b) [A7](#a7);
    - a market with a "Taxation Rate" other than "Zero-rated (Z)", or a
      "Taxation Type" with no rate, unless its "Price Type" includes tax
      ⚠ [A17](#a17). <sup>td23</sup>

<a id="product"></a>
**What an ONIX product carries from these screens.** The file names
each item by its ONIX element, quoted below as the file shows it.

20. **The audience.** A saved "Audience" gives the product an
    "Audience" element whose "AudienceCodeType" holds the chosen
    audience's code and whose "AudienceCodeValue" always reads "01",
    the wrong way round ⚠ [A9](#a9). A saved "Audience Range Qualifier"
    gives an "AudienceRange" with that qualifier and each saved grade
    after an "AudienceRangePrecision": 01 for "Audience Range (exact)",
    which stands alone; otherwise 03 for "(from)" and 04 for "(to)".
    With no qualifier saved, no range reaches the file. <sup>k</sup>
    <sup>td22</sup>
21. **Sales rights.** Each entry becomes a "SalesRights" element with
    its type's code and a territory:
    - an entry with "Rest of World?" ticked: the region "WORLD" alone,
      and the product also names the entry's type as its
      "ROWSalesRightsType";
    - an entry with included countries: those countries; the included
      regions, unless "World (WORLD)" is among them; and the excluded
      regions. Its excluded countries are left out;
    - an entry with included regions and no included country: those
      regions, and, only when "World (WORLD)" is among them, the
      excluded countries and regions;
    - an entry with nothing included makes the book's export fail
      (Rule 19) [A7](#a7). <sup>k</sup> <sup>td23</sup>
22. **Market territories.** Each market becomes a "ProductSupply"
    of its own, holding:
    - the territory, written as for sales rights (Rule 21); a market
      without one fails the book's export (Rule 19) [A7](#a7);
    - the agent, when chosen: its role, name and website;
    - the "MarketDate": date, role and "DateFormat" (00 for "YYYYMMDD",
      20 for "YYYYMMDD (H)");
    - the supplier, when chosen: its role, name, phone, email address
      and website, and the book's page address; with no supplier, the
      press itself as "Publisher to end-customers", under its "Press
      Publisher Name", with the principal contact's email address and
      the press's home page;
    - the format's "Returnable Indicator" and "Product Availability" as
      saved on its "Metadata" tab
      ([→ the tab](U73-publication-formats-proof-terms.md#metadata-tab));
      until that tab is saved, it shows "Available (20)" and "Yes,
      returnable, full copies only (Y)", but the product says available
      and states no returns condition ⚠ [A18](#a18);
    - the price: "Price Type" when chosen, the discount when typed, the
      amount, the tax ("Taxation Type" and "Taxation Rate", a zero
      percentage for "Zero-rated (Z)", the price as the taxable amount)
      unless the price type is one that includes tax, and the currency;
      a rate other than "Zero-rated (Z)" fails the export (Rule 19).
    A format with no market territory has no "ProductSupply".
    <sup>k</sup> <sup>td23</sup>
23. **Representatives.** A representative reaches the file only through
    a market that names it. Its "Representative ID Type" and
    "Representative ID" never do, nor an agent's "Phone" and "Email
    Address" ⚠ [A10](#a10). <sup>k</sup> <sup>td23</sup>
24. **The rest of the file, mostly read from the code.**
    - 24a. Each product names the identification codes of the book's
      other formats, such as an ISBN, as alternative formats. <sup>td23</sup>
    - 24b. The rest is read from the code, since the tool's own file is
      never produced (Rule 18). The file opens with a header naming the
      press by its "Publisher Code Type" and "Publisher Code", its name,
      and its principal contact's name and email address, dated the day
      of the export; then one product per format of each ticked book's
      current version, approved and available or not. Each product also
      carries what other features record: the format's codes, dates and
      product details
      ([Publication formats & proof terms](U73-publication-formats-proof-terms.md)),
      and the book's title, contributors, language, keywords, abstract,
      cover, series, license and funders. <sup>o</sup>
25. **Coming back in.** A press's Native XML import
    ([Import & export](U63-import-export.md), its Rule 10) rebuilds the
    trade data from each product:
    - 25a. The book's audience, and each format's sales rights and
      market territories as the file carries them (Rules 21, 22): the
      countries and regions the file leaves out do not come back, nor
      the tax of a market whose price type includes tax. <sup>m</sup> <sup>td24</sup>
    - 25b. The agents and suppliers the markets name, added to the
      book's representatives: an agent unless one with the same role,
      name and website is already there, and a supplier unless one with
      the same role, name, phone and email address is already there ⚠
      [A19](#a19).
      <sup>m</sup> <sup>td24</sup>
    - 25c. An entry exported with "Rest of World?" ticked comes back
      unticked, with "World (WORLD)" among its included regions ⚠
      [A11](#a11). <sup>m</sup> <sup>td24</sup>
    - 25d. The formats' "Returnable Indicator" and "Product
      Availability" do not come back [A18](#a18). <sup>m</sup> <sup>td24</sup>

## Side effects

- **Notices.** Representatives, sales rights and market territories
  show their notices on each add, edit and delete (Rules 5, 8, 9);
  "Audience" shows "Saved" by its button (Rule 2). A refused
  representative delete shows its message in a browser pop-up instead
  (Rule 8b). <sup>n</sup> <sup>td7</sup>
- **No email, no Activity Log line.** Nothing on these screens sends an
  email, adds a Tasks entry or writes a line to the book's Activity
  Log. <sup>n</sup> <sup>td25</sup>
- **Copies and removals.** "Create New Version" copies the format lists
  and deleting a format removes them (Rule 15).
- **The export file.** A successful export would write the file for its
  one download ([Import & export](U63-import-export.md), its Rule 17);
  none is written today (Rule 18).

## Settings that modify behavior

1. **The press's ONIX details** ("Press Publisher Name", "Geographical
   Location", "Publisher Code Type", "Publisher Code" on Settings ›
   Press › "Masthead", group "Publisher Identity",
   *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*;
   blank on a new press). Any of them blank: the ONIX tool's page shows
   the one sentence of Rule 16, and a Native XML export file carries no
   ONIX product (Rule 19). All four filled: the tool's page shows its
   "Export" tab (Rule 17), and each format in a Native XML file carries
   its product. "Publisher Code Type" shows nothing chosen on a new
   press, but its list (41 codes, "ARK (35)" first) has no empty
   choice, so once saved it stays filled. The other three can be
   emptied and saved, and a "Publisher Code" of spaces alone is saved as
   empty; each brings Rule 16's sentence back. <sup>i</sup> <sup>l</sup> <sup>td18</sup>

## Cross-feature interactions

- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#side-menu)*:
  the "Marketing" group of the side menu, who opens the editorial view,
  and the author's view without the group.
- *[Chapters & work type](U72-chapters-work-type.md)*: "Publication
  Dates", the group's third page, and its own refusal for the assistant
  roles ([its A2](U72-chapters-work-type.md#a2)).
- *[Publication formats & proof terms](U73-publication-formats-proof-terms.md)*:
  the format window and its "Metadata" tab, the tab's other lists and
  fields, the lists' failure to load for the Series editor and the
  assistant roles that open the format window, deleting a format, and
  the copies a new version gets.
- *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*:
  the press's four ONIX details and its principal contact.
- *[Import & export](U63-import-export.md)*: the Tools page and its
  list, the tool pages' frame, the export list's mechanics, the Native
  XML export and import that carry the ONIX products, and the Native
  XML page's own ONIX reminder (its OMP2).
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  "Create New Version", whose copies Rule 15 describes.
- *[Monograph landing page](U69-monograph-landing-page.md)*: the book's
  page, which shows none of the audience, representatives, sales rights
  or market territories.
- *[Publication metadata](U40-publication-metadata.md)*,
  *[Contributors & affiliations](U41-contributors-and-affiliations.md)*,
  *[Funding](U43-funding.md)*, *[DOIs](U45-dois.md)*: the book data an
  ONIX product also carries (Rule 24).

## Canonical scenarios

Scenarios 1 to 8 run on scratch presses with a throwaway Press manager,
scenario 2 also with a throwaway Marketing and sales coordinator.
Scenario 9 runs on the seeded journal and the seeded preprint server with
ready accounts, its control on the seeded press. The accounts, the
passwords, the mail catcher and the tooling recipe are in the
footnote. <sup>s</sup>

1. **A book's audience**

   Given: Press manager, on a book in Production whose audience was
   never saved.

   - **The empty page**: open the book's workflow and choose the side
     menu's "Marketing" › "Audience": the group also lists
     "Representatives" and "Publication Dates" (Rule 1), and the page,
     headed "Marketing: Audience", shows the lists "Audience", "Audience
     Range Qualifier", "Audience Range (from)", "Audience Range (to)" and
     "Audience Range (exact)", each with nothing chosen, then "Save"
     (Fields, the "Audience" page).
   - **Saved**: choose "Professional and scholarly (06)" in "Audience",
     "US school grade range (11)" in "Audience Range Qualifier",
     "Kindergarten (K)" in "Audience Range (from)", "Twelfth Grade (12)"
     in "Audience Range (to)" and "Preschool (P)" in "Audience Range
     (exact)", and press "Save": "Saved" shows beside the button. Reload
     the page: the five lists hold the same five choices (Rules 2, 3).
   - **An unsaved choice dropped**: choose "Children (02)" in "Audience",
     then choose "Marketing" › "Representatives": nothing asks. Choose
     "Marketing" › "Audience" again: "Audience" reads "Professional and
     scholarly (06)" (Rule 2).
   - **Control**: the book's "Activity Log" (the workflow's header) lists
     no line about the audience, and the mail catcher holds no email
     about the book (Side effects, "No email, no Activity Log line").
     <sup>s</sup>

2. **A book's representatives**

   Given: Press manager and a Marketing and sales coordinator, on a
   scratch press, with a book in Production to which the coordinator is
   assigned, whose representatives are the supplier "Supplier Sam"
   ("Distributor to end-customers (12)") alone, named by a market of the
   book's format "Paperback".

   - **The page**: Press manager: open the book's workflow and choose
     "Marketing" › "Representatives": under the heading "Marketing:
     Representatives" a table headed "Representatives" shows "Add
     Representative" at its top right and the columns "Name" and "Role";
     its group "Agents" reads "No Items", and "Suppliers" lists "Supplier
     Sam" reading "Distributor to end-customers (12)" (Fields, the
     "Representatives" page).
   - **The window**: press "Add Representative": a window headed "Add
     Representative" shows "Representative Type" on "Supplier", then
     "Role", "Name", "Representative ID Type (GLN is recommended)" on
     "GLN (06)", "Representative ID", "Phone", "Email Address" and
     "Website", "Required fields are marked with an asterisk: *",
     "Cancel" and "OK" (Fields, the representative window). That both
     "Role" lists show side by side is [A12](#a12), neither a pass nor a
     fail here.
   - **What the window refuses**: click "Agent": "Role" shows the agent
     roles alone after an empty choice, "Exclusive sales agent (05)",
     "Local publisher (07)", "Non-exclusive sales agent (06)" and "Sales
     agent (08)" (Rule 6). Press "OK" with "Name" empty and "Role" on
     its empty choice: "This field is required." shows under each, and
     nothing is saved. Type Agent Ada in "Name", choose "Exclusive sales
     agent (05)", type not-an-email in "Email Address" and press "OK":
     "Please enter a valid email address." shows under the box and
     nothing is saved. Replace it with ada@example.org, type
     www.example.org in "Website" and press "OK": "Please enter a valid
     URL." shows and nothing is saved (Rule 7).
   - **An agent added**: replace the website with
     https://ada.example.org and press "OK": the window closes, the
     notice "Representative added." appears, and "Agent Ada" is listed
     under "Agents" reading "Exclusive sales agent (05)" (Rule 5).
   - **The type decides the role**: press "Add Representative", type
     Beta Books in "Name", click "Agent" and choose "Sales agent (08)".
     Click "Supplier": "Role" shows the supplier roles alone,
     "Distributor to end-customers (12)" first after the empty choice;
     choose it. Click "Agent": "Role" still reads "Sales agent (08)".
     Click "Supplier" and press "OK": "Representative added.", and "Beta
     Books" is listed under "Suppliers" reading "Distributor to
     end-customers (12)" (Rules 5, 6).
   - **Moved to the other group**: press the arrow before "Beta Books",
     then "Edit": a window headed "Edit" opens. Click "Agent", choose
     "Non-exclusive sales agent (06)" and press "OK": "Representative
     edited." appears. Reload the page: "Beta Books" is listed under
     "Agents" reading "Non-exclusive sales agent (06)", and no longer
     under "Suppliers" (Rule 6). What the table shows before the reload
     is [A13](#a13), neither a pass nor a fail here.
   - **Deleted**: press the arrow before "Beta Books", then "Delete": a
     dialog titled "Delete" reads "Are you sure you wish to delete this
     item? This action cannot be undone." with "OK" and "Cancel". Press
     "Cancel": "Beta Books" stays. Press "Delete" again and "OK": the
     notice "Representative removed." appears and "Beta Books" is gone
     (Rule 8a).
   - **Kept while a market names it**: press the arrow before "Supplier
     Sam", then "Delete" and "OK": a browser pop-up reads "You can not
     delete this representative because they are assigned to the market
     metadata for one or more publication formats for this submission.";
     accept it. What the "Delete" dialog then does is [A14](#a14),
     neither a pass nor a fail here; press its "Cancel": "Supplier Sam"
     is still listed under "Suppliers" (Rule 8b).
   - **The Marketing and sales coordinator**: Marketing and sales
     coordinator: open the book's workflow and choose "Marketing" ›
     "Representatives": the same table, with "Add Representative"
     (Actors rows 1, 3). Press "Add Representative", click "Agent",
     choose "Local publisher (07)", type Delta Agency in "Name" and press
     "OK": "Representative added.", and "Delta Agency" is listed under
     "Agents". Press its arrow, "Edit" and "OK": "Representative
     edited.". Press its arrow, "Delete" and "OK": "Representative
     removed.", and "Delta Agency" is gone (Rules 5, 8a).
   - **Control**: Press manager: open the book's "Publication" › the
     version › "Publication Formats", press the arrow before
     "Paperback", then "Edit", choose its "Metadata" tab and press "Add
     Market": "Agent" offers "Agent Ada" alone after its empty choice,
     and "Supplier" "Supplier Sam" alone after its empty choice (Rule
     14). <sup>s</sup>

3. **A format's sales rights**

   Given: Press manager, on a book in Production with the format
   "Paperback", which has no sales rights and no market territory.

   - **The two lists**: open the book's "Publication" › the version ›
     "Publication Formats", press the arrow before "Paperback", then
     "Edit", and choose the window's "Metadata" tab: it holds a table
     headed "Sales Rights" with "Add Sales Rights" at its top right and
     the columns "Sales Rights Type" and "Rest of World?", reading "No
     Items", and under it a table headed "Market Territories" with "Add
     Market" at its top right and the columns "Territory",
     "Representatives" and "Price", reading "No Items" (Fields, the
     "Sales Rights" and "Market Territories" lists).
   - **The window**: press "Add Sales Rights": a window headed "Add
     Sales Rights" shows "Sales Rights Type" on "For sale with exclusive
     rights in the specified countries or territories (01)", the box
     "Rest of World?" under "Check this box to use this Sales Rights
     entry as a catch-all for your format. Countries and regions need
     not be chosen in this case.", "Countries" and "Regions", each with
     an "Included" and an "Excluded" list, then "Cancel" and "OK"
     (Fields, the sales-rights window).
   - **A "Rest of World?" entry**: tick "Rest of World?" and press "OK":
     the window closes, the notice "Sales Rights added." appears, and
     the list shows one row reading "For sale with exclusive rights in
     the specified countries or territories (01)" with a tick under
     "Rest of World?" (Rules 9, 11).
   - **Each type once**: press "Add Sales Rights": "Sales Rights Type"
     no longer offers "For sale with exclusive rights in the specified
     countries or territories (01)"; leave it on the type it arrives on
     (Rule 10). Under "Countries" choose "Canada (CA)" and "United States
     (US)" in "Included" (Ctrl-click, Cmd-click on a Mac) and "United
     Kingdom (GB)" in "Excluded", and press "OK": "Sales Rights added.",
     and a second row is listed with no tick (Rule 9).
   - **A second "Rest of World?" refused**: press "Add Sales Rights",
     tick "Rest of World?" and press "OK": the window stays open and
     nothing is saved (Rule 11). That no message says why is
     [A15](#a15), neither a pass nor a fail here. Press "Cancel": the
     window closes at once without asking, and the list still holds two
     rows, one ticked (Fields, "Leaving a window").
   - **Edited**: press the arrow before the second row, then "Edit": a
     window headed "Edit" opens with "Sales Rights Type" on the row's
     own type (Rule 10). Press "OK": the notice "Sales Rights edited."
     appears (Rule 9).
   - **Deleted, and its type offered again**: press the arrow before the
     second row, then "Delete": a dialog titled "Delete" reads "Are you
     sure you wish to delete this item? This action cannot be undone.".
     Press "Cancel": the row stays. Press "Delete" again and "OK": the
     notice "Sales Rights removed." appears and one row is left (Rule
     9). Press "Add Sales Rights": "Sales Rights Type" arrives on the
     type the deleted row had (Rule 10); press "Cancel".
   - **Control**: press the "Metadata" tab's own "Cancel", then open
     "Paperback"'s "Edit" › "Metadata" again: "Sales Rights" still lists
     the "Rest of World?" row with its tick, saved without the tab's
     "Save" (Rule 9). <sup>s</sup>

4. **A format's market territories**

   Given: Press manager, on a book in Production whose representatives
   are the agents "Agent Ada" and "Agent Bert", added in that order, and
   the supplier "Supplier Sam", with the format "Paperback", which has
   no sales rights and no market territory.

   - **The window**: open the book's "Publication" › the version ›
     "Publication Formats", press the arrow before "Paperback", then
     "Edit", choose the "Metadata" tab and press "Add Market": a window
     headed "Add Market" shows "Date" with "Date Format" and "Role"
     beside it, "Role" on "Publication date (01)"; "Agent" under "You
     may assign an agent to represent you in this defined territory. It
     is not required."; "Supplier"; "Countries" and "Regions"; "Price"
     with its currency list on "Canadian Dollar (CAD)"; "Price Type",
     "Taxation Rate" and "Taxation Type", each empty; "Discount
     percentage, if applicable"; then "Cancel" and "OK" (Fields, the
     market window). What "Date Format" arrives on is [A5](#a5), neither
     a pass nor a fail here.
   - **The book's representatives**: "Agent" offers an empty choice,
     then "Agent Ada" and "Agent Bert" in that order; "Supplier" offers
     an empty choice and "Supplier Sam" (Rule 14).
   - **Date and price required**: press "OK" with "Date" and "Price"
     empty: "This field is required." shows under each box, and nothing
     is saved (Rule 13a).
   - **A market added**: type 20260915 in "Date" and choose "YYYYMMDD"
     in "Date Format"; choose "Agent Ada" in "Agent" and "Supplier Sam"
     in "Supplier"; under "Countries" choose "Canada (CA)" in
     "Included"; type 25 in "Price" and press "OK": the window closes,
     the notice "Market added." appears, and the list shows one row
     whose "Representatives" reads "Agent Ada, Supplier Sam" (Rule 9;
     Fields, the "Market Territories" list). How its "Territory" and
     "Price" read is [A4](#a4), neither a pass nor a fail here.
   - **Edited**: press the arrow before the row, then "Edit": a window
     headed "Edit" opens (what its "Taxation Type" shows is [A6](#a6),
     neither a pass nor a fail here). Replace the price with 30 and
     press "OK": the notice "Market edited." appears (Rule 9).
   - **Leaving a window**: press "Add Market", type 20261001 in "Date"
     and press the window's close arrow: "The data on this form has
     changed. Do you wish to continue without saving?" shows. Press its
     "Cancel": the window stays open. Press the close arrow again, then
     "OK": the window closes, and the list still holds one row (Fields,
     "Leaving a window").
   - **Control**: press the "Metadata" tab's own "Cancel", then open
     "Paperback"'s "Edit" › "Metadata" again: "Market Territories" still
     lists the row reading "Agent Ada, Supplier Sam", saved without the
     tab's "Save" (Rule 9). <sup>s</sup>

5. **A new version copies the trade data**

   Given: Press manager, on a published book whose audience is
   "Children (02)" and whose representatives are the agent "Agent Ada"
   and the supplier "Supplier Sam", with the format "Paperback", which
   holds the sales-rights entry "For sale with exclusive rights in the
   specified countries or territories (01)" with "Canada (CA)" included,
   and a market with "Canada (CA)" included, naming "Agent Ada" and
   "Supplier Sam", at the price 25.

   - **"Create New Version"**: create a version with the side menu's
     "Create New Version"
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)).
     On the new version's "Publication Formats" page press the arrow
     before "Paperback", then "Edit", and choose "Metadata": "Sales
     Rights" lists "For sale with exclusive rights in the specified
     countries or territories (01)", and "Market Territories" one row
     whose "Representatives" reads "Agent Ada, Supplier Sam" (Rule 15).
   - **The copy changed**: press the arrow before the sales-rights row,
     then "Delete" and "OK": "Sales Rights removed.". Press the arrow
     before the market, then "Edit", replace the price with 30 and press
     "OK": "Market edited." (Rules 9, 15).
   - **The book's own pages**: choose "Marketing" › "Audience":
     "Audience" still reads "Children (02)". Choose "Marketing" ›
     "Representatives": "Agents" still lists "Agent Ada" and "Suppliers"
     "Supplier Sam" (Rule 1).
   - **Control**: choose the first version under "Publication", then
     "Publication Formats", press the arrow before "Paperback", then
     "Edit", and choose "Metadata": "Sales Rights" still lists "For sale
     with exclusive rights in the specified countries or territories
     (01)", and the market's "Edit" still shows 25 in "Price" (Rule 15).
     <sup>s</sup>

6. **The ONIX tool, from the press's details to an export**

   Given: Press manager, on a scratch press whose four ONIX details are
   blank and whose "Masthead" is otherwise complete, holding the
   published book "Tidewater Tales" and the book "Harbour Lights" in the
   Submission stage.

   - **The details missing**: open Tools › "Import/Export" › "ONIX 3.0
     Monograph Export Plugin": the page, headed with the tool's name,
     shows only "This press is missing some required information. Please
     go to Press Settings and fill in the missing details.", with no tab
     and no list (Rule 16; Settings bullet 1).
   - **The details filled**: press "Press Settings": Settings › Press
     opens on its "Masthead" tab (Rule 16). Under "Publisher Identity"
     type Tidewater Press in "Press Publisher Name" and Halifax in
     "Geographical Location", choose "ARK (35)" in "Publisher Code Type",
     type TWP-01 in "Publisher Code", and press "Save" (Settings bullet
     1).
   - **The "Export" tab**: open the ONIX tool again: it shows one tab,
     "Export", holding a list titled "Monographs" with a search box and
     "Filters" at its top right, listing "Tidewater Tales" and "Harbour
     Lights", each a line with a tick box, its title and "View"; under
     the list the box "Validate XML before the export and registration.",
     ticked, and the buttons "Select All" and "Export Submissions"
     (Rule 17; Fields, the export page).
   - **Exporting**: tick "Tidewater Tales" and press "Export
     Submissions": a tab "Export Submissions Results" is added and opens
     (Rule 18). What it reads is [A1](#a1), neither a pass nor a fail
     here; the expected text is "The export completed successfully." with
     a "Download Exported File" button.
   - **Control**: on Settings › Press › "Masthead" empty "Publisher Code"
     and press "Save": the ONIX tool's page again shows only "This press
     is missing some required information. Please go to Press Settings
     and fill in the missing details." (Settings bullet 1). <sup>s</sup>

7. **The trade data in a Native XML file**

   Given: Press manager, on a scratch press whose four ONIX details are
   filled, its "Press Publisher Name" reading Tidewater Press, with the
   book "Tidewater Tales" in Production, whose audience is "General /
   adult (01)" with "US school grade range (11)", from "Kindergarten
   (K)" to "Twelfth Grade (12)"; whose representatives are the agents
   "Agent Ada" ("Exclusive sales agent (05)", website
   https://ada.example.org) and "Agent Bert", and the supplier "Supplier
   Sam" ("Distributor to end-customers (12)", phone 555-0100, email
   sam@example.org, website https://sam.example.org); with the format
   "Paperback", carrying the ISBN 978-951-98548-9-2, a sales-rights
   entry "For sale with exclusive rights in the specified countries or
   territories (01)" with "Rest of World?" ticked, a second entry with
   "Canada (CA)" and "United States (US)" included and "United Kingdom
   (GB)" excluded, and a market with "Canada (CA)" included, naming
   "Agent Ada" and "Supplier Sam", dated 20260915 as "YYYYMMDD", at the
   price 25 "Canadian Dollar (CAD)" with "VAT (Value-added tax) (01)"
   and "Zero-rated (Z)"; and with the format "Ebook", carrying one
   market with "United States (US)" included, no agent and no supplier,
   dated 20260915 as "YYYYMMDD", at the price 12.

   - **The file**: open Tools › "Import/Export" › "Native XML Plugin",
     tick "Tidewater Tales" on its "Export" tab, press "Export
     Submissions", then "Download Exported File"
     ([Import & export](U63-import-export.md), its Rule 16), and open the
     downloaded file: "Paperback" and "Ebook" each carry an ONIX product
     (Rule 19).
   - **The audience**: each product holds an "Audience" element whose
     "AudienceCodeType" and "AudienceCodeValue" both read 01, and an
     "AudienceRange" with the qualifier 11, then the
     "AudienceRangePrecision" 03 ("(from)") before K and 04 ("(to)")
     before 12 (Rule 20).
   - **"Paperback"'s sales rights**: its product holds two "SalesRights"
     elements: the "Rest of World?" entry's territory is the region
     "WORLD" alone, and the product names that entry's type (01) as its
     "ROWSalesRightsType"; the second entry's territory names CA and US,
     and not GB (Rule 21).
   - **"Paperback"'s market**: its product holds one "ProductSupply":
     the territory CA; the agent's role, the name Agent Ada and
     https://ada.example.org; the "MarketDate" 20260915 with the role
     01 and the "DateFormat" 00; the supplier's role, the name Supplier
     Sam, 555-0100, sam@example.org, https://sam.example.org and the address of the
     book's page; and the price 25 with its tax, the type 01 ("VAT
     (Value-added tax) (01)"), the rate Z ("Zero-rated (Z)"), a zero
     percentage and 25 as the taxable amount, in CAD (Rule 22).
   - **"Ebook"'s market**: its product holds one "ProductSupply" with the
     territory US, no agent, and as the supplier the press itself: the
     role 09 ("Publisher to end-customers"), the name Tidewater Press,
     its principal contact's email address and its home page (Rule 22).
     It names 978-951-98548-9-2 as an alternative format (Rule 24a).
   - **A representative no market names**: "Agent Bert" appears nowhere
     in the file (Rule 23).
   - **Control**: on Settings › Press › "Masthead" empty "Publisher Code"
     and press "Save", then export and download "Tidewater Tales" the
     same way: its formats carry no ONIX product (Rule 19; Settings
     bullet 1). <sup>s</sup>

8. **The trade data imported on another press**

   Given: Press manager of two scratch presses whose four ONIX details
   are filled, A holding the book "Tidewater Tales" in Production and B
   holding none; the book's audience is "Children (02)" with "US school
   grade range (11)", from "Kindergarten (K)" to "Twelfth Grade (12)",
   its representatives are the agents "Agent Ada" ("Exclusive sales
   agent (05)") and "Agent Bert" ("Local publisher (07)") and the
   supplier "Supplier Sam" ("Distributor to end-customers (12)"), and
   its format "Paperback" holds a sales-rights entry "For sale with
   exclusive rights in the specified countries or territories (01)"
   with "Canada (CA)" and "United States (US)" included and "United
   Kingdom (GB)" excluded, and a market with "Canada (CA)" included and
   "United Kingdom (GB)" excluded, naming "Agent Ada" and "Supplier
   Sam", dated 20260915 as "YYYYMMDD", at the price 25.

   - **A's file**: on A open Tools › "Import/Export" › "Native XML
     Plugin", tick "Tidewater Tales" on its "Export" tab, press "Export
     Submissions", then "Download Exported File"
     ([Import & export](U63-import-export.md), its Rule 16).
   - **Imported on B**: on B's "Native XML Plugin" page, on "Import",
     press "Upload File", choose A's file and press "Import": a tab
     "Results" opens, reading
     "The import completed successfully. The following items were
     imported:" with a line for "Tidewater Tales"
     ([Import & export](U63-import-export.md), its Rule 10).
   - **The audience**: open B's "Tidewater Tales" and choose "Marketing"
     › "Audience": "Audience" reads "Children (02)", "Audience Range
     Qualifier" "US school grade range (11)", "Audience Range (from)"
     "Kindergarten (K)" and "Audience Range (to)" "Twelfth Grade (12)"
     (Rule 25a).
   - **The representatives**: choose "Marketing" › "Representatives":
     "Agents" lists "Agent Ada" reading "Exclusive sales agent (05)",
     and "Suppliers" lists "Supplier Sam" reading "Distributor to
     end-customers (12)" (Rule 25b).
   - **The format's lists**: open the version's "Publication Formats",
     press the arrow before "Paperback", then "Edit", and choose
     "Metadata". "Sales Rights" lists "For sale with exclusive rights in
     the specified countries or territories (01)"; its "Edit" shows
     "Canada (CA)" and "United States (US)" chosen under "Countries"
     "Included" and nothing under "Excluded"; press "Cancel". "Market
     Territories" lists one row whose "Representatives" reads "Agent
     Ada, Supplier Sam"; its "Edit" shows 20260915 in "Date", "Canada
     (CA)" under "Countries" "Included", nothing under "Excluded", and 25
     in "Price" (Rules 21, 22, 25a).
   - **Control**: B's "Representatives" lists no "Agent Bert", whom no
     market named (Rules 23, 25b). <sup>s</sup>

9. **No ONIX on a journal or a preprint server** {OJS OPS}

   Given: Journal Manager (Preprint Server Manager), on the seeded
   journal (the seeded preprint server), with an article (a preprint) in
   Production carrying the galley "PDF"; and Press manager, on the
   seeded press, with a book in Production carrying the format
   "Paperback".

   - **The side menu**: open the article's workflow: the side menu lists
     "Publication" ("Preprint" on a preprint server) and no "Marketing"
     group (Purpose, the absence paragraph).
   - **The galley window**: choose "Publication" ("Preprint") › the
     version › "Galleys", press the "…" button at the end of "PDF"'s
     row, then "Edit": the galley's window
     ([→ the galley window](U46-galleys.md#galley-window)) has one tab,
     "Edit Metadata", and no "Sales Rights" or "Market Territories" list
     (Purpose, the absence paragraph).
   - **Tools**: open Tools › "Import/Export": it lists "Native XML
     Plugin" ([Import & export](U63-import-export.md)) and no "ONIX 3.0
     Monograph Export Plugin" (Purpose, the absence paragraph).
   - **Control**: Press manager, on the seeded press: the book's side
     menu lists the "Marketing" group; "Paperback"'s "Edit" window, from
     the version's "Publication Formats", has the tabs "Edit" and
     "Metadata", the latter holding "Sales Rights" and "Market
     Territories"; and Tools › "Import/Export" lists "ONIX 3.0 Monograph
     Export Plugin" (Purpose). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard A16's issue report names, once fixed: "Export
    Submissions" pressed with no book ticked: the alert "No objects
    selected.", no results tab opened and no request failing
  - the guard for A1 (issue report
    `docs/issues/U74-A1-onix-export-fails-every-book.md`): on a
    freshly installed press with its "Publisher Identity" filled,
    "Export Submissions" for one book gives "The export completed
    successfully." and an ONIX file
  - the guard for A6 (issue report
    `docs/issues/U74-A6-market-edit-fills-in-gst-tax-type.md`): a
    market saved with "Taxation Type" empty reopens in its "Edit"
    window with "Taxation Type" still empty, and "OK" stores no tax
    type
  - the guard for A5 (issue report
    `docs/issues/U74-A5-new-market-and-date-preselect-hijri-calendar.md`):
    "Add Market" opens with "Date Format" on "YYYYMMDD"
  - the guard for A7 and A8 (issue report
    `docs/issues/U74-A7-A8-sales-rights-market-values-fail-native-export.md`):
    a market and a sales-rights entry saved without a territory, a
    market price of "ten" and a date of "abc" under "YYYYMMDD" are
    each refused in the window
  - the guard for A2 (issue report
    `docs/issues/U74-A2-assistant-marketing-and-work-type-refused.md`):
    an assigned Layout Editor opens "Marketing" › "Audience" with
    "Save" greyed, while the Press editor saves
  - the guard for A4 (issue report
    `docs/issues/U74-A4-market-list-shows-codes-price-run-together.md`):
    a market's row in "Market Territories" names its countries and
    regions as the window does and shows its price apart from the
    currency
  - the guard for A11 (issue report
    `docs/issues/U74-A11-native-import-unticks-rest-of-world.md`): a
    book exported to a Native XML file and imported again keeps its
    "Rest of World?" entry ticked beside its other sales-rights
    entries
  - the guard for A19 (issue reports
    `docs/issues/U74-A19-native-import-adds-press-as-supplier.md` and
    `docs/issues/U74-A19-native-import-changes-supplier-websites.md`):
    a book exported to a Native XML file and imported again keeps a
    market without a supplier without one, and its suppliers with and
    without a website as they were
  - the guard for A12 (issue report
    `docs/issues/U74-A12-representative-window-refuses-supplier.md`):
    "Add Representative" shows only the supplier role list and saves a
    supplier at the first "OK"
  - the guard for A13 (issue report
    `docs/issues/U74-A13-representative-type-change-listed-twice.md`):
    a supplier switched to "Agent" is listed under "Agents" only,
    before any reload
- **Rarely met**:
  - a format that has used all nine sales-rights types, whose "Add
    Sales Rights" list is empty (Rule 10)
- **Nothing new to test**:
  - the assigned Series editor saving "Audience", with the assignment's
    "Permissions" box ticked or not (Actors row 2)
  - several "Export Submissions Results" tabs, and a tab's "Close"
    (Rule 18)
  - a "Publisher Code" of spaces saved as blank, and a "Publisher Code
    Type" that cannot be emptied once saved (Settings bullet 1)
  - leaving the export page after a search or a changed validation box
    (Fields, the export page)
  - the Press editor, Production editor and Site Administrator, offered
    what the Press manager is (Actors rows 1–5)
- **Register carries it**:
  - A1 (the ONIX export failing for every book; Rule 18; scenario 6
    passes it)
  - A2 ("Audience" offered to the assigned assistant roles and their
    save refused; Actors row 2)
  - A3 (a saved audience list that cannot be emptied; Fields, the
    "Audience" page)
  - A4 (the "Market Territories" list's bare codes and run-together
    price; Fields; scenario 4 passes it)
  - A5 (a new market's "Date Format" on "YYYYMMDD (H)"; Fields;
    scenario 4 passes it)
  - A6 (a market's empty "Taxation Type" reopening on "GST (Sales tax)
    (02)"; Fields; scenario 4 passes it)
  - A7 (a sales-rights entry or a market with no territory, and the
    Native XML export failing on it; Rules 12, 13b, 19)
  - A8 (a market date or price of any form, and the Native XML export
    failing on a price that is not a number; Rules 13a, 19)
  - A9 (the audience written the wrong way round; Rule 20)
  - A10 (representative IDs, and an agent's phone and email, left out
    of the file; Rule 23)
  - A11 (a "Rest of World?" entry coming back unticked; Rule 25c)
  - A12 (both "Role" lists on arrival, and a new supplier refused until
    the type is clicked; Fields, the representative window; scenario 2
    passes it)
  - A13 (a switched representative listed in both groups until a
    reload; Rule 6; scenario 2 passes it)
  - A14 (a refused representative delete answered by a browser pop-up,
    its dialog left open; Rule 8b; scenario 2 passes it)
  - A15 (a second "Rest of World?" entry, or a market "Date" or "Price"
    of spaces only, refused without a message; Rules 11, 13a; scenario
    3 passes it)
  - A16 (an ONIX export with nothing ticked, the server failing;
    Rule 18a)
  - A17 (a tax rate other than "Zero-rated (Z)" failing the Native XML
    export; Rule 19)
  - A18 (a format whose "Metadata" tab was never saved stating no
    returns condition, and an import losing the formats' returns and
    availability; Rules 22, 25d)
  - A19 (an import adding the exporting press as a supplier; Rule 25b)
  - A20 (the install's first representative listed only after a
    reload, the server failing; Rule 5)
- **Owned by another feature**:
  - the Author's view without a "Marketing" group (Actors row 1;
    *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#side-menu)*)
  - an Editorial Board Member placed on a book (Actors, the opening
    paragraph; *[Stage participants](U35-stage-participants.md)*)
  - the Series editor and the assistant roles whose "Sales Rights" and
    "Market Territories" lists stay on "Loading", and the three that
    never reach the format window (Actors row 4;
    *[Publication formats & proof terms](U73-publication-formats-proof-terms.md)*)
  - a deleted format's lists removed with it (Rule 15;
    *[Publication formats & proof terms](U73-publication-formats-proof-terms.md)*)
  - other roles at the ONIX tool's address (Actors row 5;
    *[Import & export](U63-import-export.md)*, scenario 2)
  - "View" on an unfinished submission (Rule 17;
    *[Import & export](U63-import-export.md)*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed
unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | On a freshly installed press, the ONIX 3.0 tool's "Export Submissions" ends in "The process failed" for every book | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A6](#a6) | Editing a book's market fills in "GST (Sales tax)" as its tax type, and "OK" saves it unasked | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A7](#a7) | A sales-rights entry or a market saves with no territory, and the book's Native XML export then fails | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A8](#a8) | The market window takes any date and any price, and a price that is not a number makes the book's Native XML export fail | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A12](#a12) | A book's "Add Representative" window shows both role lists and refuses a supplier until "Agent" and "Supplier" are clicked | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A17](#a17) | A book whose market has a tax rate other than "Zero-rated", or a tax type alone, fails its Native XML export | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A2](#a2) | "Audience" offers "Save" to the assistant roles and refuses their save | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A4](#a4) | A book format's "Market Territories" list shows country codes and runs the price into its currency | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A5](#a5) | A new market's "Date Format" preselects "YYYYMMDD (H)", the Hijri calendar | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A9](#a9) | A book's "Audience" goes out in its ONIX data the wrong way round, so "Children" reads as a proprietary code | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A11](#a11) | A book imported from a press's Native XML file loses its "Rest of World?" sales-rights tick | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A13](#a13) | A book representative switched between "Agent" and "Supplier" is listed under both groups until the page is reloaded | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A14](#a14) | A refused representative delete answers with a browser pop-up and leaves the "Delete" dialog open | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A15](#a15) | A second "Rest of World?" entry, or a market date or price of spaces, is refused without a message | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A16](#a16) | "Export Submissions" with no book ticked opens an empty results tab | 🐞 | low · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A18](#a18) | The returns and availability the "Metadata" tab shows can differ from what the product carries, and an import loses both | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A19](#a19) | A Native XML import adds the exporting press as a supplier and changes the suppliers' websites | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A20](#a20) | On an install with no representative yet, the first one added is not listed until the page is reloaded | 🐞 | minor · crash: server | — |
| [A3](#a3) | A saved audience list cannot be emptied again | ❓ | minor | — |
| [A10](#a10) | A representative's ID, and an agent's phone and email, reach no file | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — On a freshly installed press, the ONIX 3.0 tool's "Export Submissions" ends in "The process failed" for every book** · 🐞 · medium.
On a press installed fresh from `main`, a manager who ticks one book or
more in Tools › "ONIX 3.0 Monograph Export Plugin" and presses "Export
Submissions" always gets "The process failed. Check below for
errors/warnings." and "Filter (ONIX 3.0 XML monograph export) supports
input classes.submission.Submission[] - array given", with no file to
download, whatever the book. They expect "The export completed
successfully." and an ONIX file. The press cannot produce its ONIX feed,
and there is no way round on screen. Only presses on a new install are
affected. An install upgraded from 3.5 or earlier still exports.
Since: 2025-12-04, a date read from the code's history · Basis: probe, 2026-10-03. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Audience" refuses the assistant roles it offers "Save" to** · 🐞 · low.
Every assigned assistant role (Copyeditor, Layout Editor, Marketing and
sales coordinator and the others) opens "Marketing" › "Audience" with
"Save" pressable. Their "Save" shows the passing notice "An unexpected
error has occurred. Please reload the page and try again." and nothing
is saved; the page keeps showing the new choice until a reload. The
same happens on "Publication Dates"
([Chapters & work type, its A2](U72-chapters-work-type.md#a2)).
Expected: a page these roles cannot save is offered read-only, or not
at all.
Basis: probe, 2026-10-03. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A saved audience list cannot be emptied** · ❓ · minor.
None of the five lists on "Audience" has an empty choice: a new book
shows them blank, but once a list is saved it can only be changed to
another option. A press that set "Audience Range (exact)" by mistake,
for one, cannot take it back.
Question: should each list offer an empty choice?
Lean: yes; the lists are optional, and the ONIX file treats an empty
list as "not stated" (Rule 20).
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A book format's "Market Territories" list shows country codes and runs the price into its currency** · 🐞 · low.
A press editor adds a market to a book's format and chooses its
countries and regions by name in the window ("Canada (CA)", "Quebec
(CA-QC)"). The format's "Market Territories" list then shows only the
codes, "Included: CA, US, Excluded: GB, CA-QC", and its "Price" column
runs the amount into the currency code: "25CAD", "12.50USD".
Nothing is saved wrong, and the book's ONIX data and public page are not
affected: the list is shown only in the editorial back end, so readers
never see it. Only presses that record markets for their formats meet
it.
Basis: probe, 2026-10-03. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A new market preselects the Hijri calendar** · 🐞 · medium.
"Add Market" arrives with "Date Format" on "YYYYMMDD (H)", the ONIX
format for a date in the Islamic (Hijri) calendar, rather than
"YYYYMMDD". A press that types a date without changing the list records
it as a Hijri date, and the ONIX product hands it on as one. The
format window's "Publication Dates" does the same
([Publication formats & proof terms, its A7](U73-publication-formats-proof-terms.md#a7)).
Expected: "YYYYMMDD" preselected.
Since: 2012-01-29, a date read from the code's history · Basis: probe, 2026-10-03. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Editing a book's market fills in "GST (Sales tax)" as its tax type, and "OK" saves it unasked** · 🐞 · medium.
A press editor saves a book's market with "Taxation Type" left empty.
When they later open the market's "Edit" window, "Taxation Type" shows
"GST (Sales tax) (02)". Pressing "OK" to change anything else, such as
the price, also saves GST as the market's tax type. They expect the
window to reopen on what they saved, with the tax type still empty.
Nothing tells them the tax type changed. If the market has no "Taxation
Rate", the book's Native XML export then fails with "The process failed.
Check below for errors/warnings." If its "Taxation Rate" is "Zero-rated
(Z)", the export states GST, a tax the press never chose.
Since: 2012-01-20, a date read from the code's history · Basis: probe, 2026-10-03. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — An entry or a market with no territory breaks the Native XML export** · 🐞 · medium.
A sales-rights entry without "Rest of World?", and a market, save with
no country and no region chosen. The book's export from Tools › "Native
XML Plugin" then ends with "The process failed. Check below for
errors/warnings." and, for the entry, "Line 0 Column 0: Element
'{http://ns.editeur.org/onix/3.0/reference}Territory': Missing child
element(s). Expected is one of (
{http://ns.editeur.org/onix/3.0/reference}CountriesIncluded,
{http://ns.editeur.org/onix/3.0/reference}RegionsIncluded ).", for the
market "Line 0 Column 0: Element
'{http://ns.editeur.org/onix/3.0/reference}Market': Missing child
element(s). Expected is ( {http://ns.editeur.org/onix/3.0/reference}Territory
)."; deleting the entry, or giving the market a country, lets it
complete. Until then neither the book nor any book ticked with it can
be exported. Expected: both windows ask for a country or region, the
sales-rights window only while "Rest of World?" is unticked, as the tip
under that box implies.
Basis: probe, 2026-10-03. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The market window takes any date and any price** · 🐞 · medium.
"Date" takes any text whatever "Date Format" says, and "Price" any text,
"ten" included; nothing tells the press. A price that is not a number
then makes the book's export from Tools › "Native XML Plugin" end with
"The process failed. Check below for errors/warnings.", as
[Publication formats & proof terms, its A17](U73-publication-formats-proof-terms.md#a17)
records for page counts. A date that does not match its format ("abc"
as "YYYYMMDD") passes into the product as typed, and the export
completes. Expected: the window refuses a price that is not a number,
and a date that does not match its format, as its own message "A date
is required and the date value must match the chosen date format."
promises.
Basis: probe, 2026-10-03. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A book's "Audience" goes out in its ONIX data the wrong way round, so "Children" reads as a proprietary code** · 🐞 · medium.
A press editor chooses a book's audience on "Marketing" › "Audience",
for example "Children (02)". The book's ONIX data puts the chosen
audience's code in the code-type field, which says which list the code
comes from, and "01" in the field that should hold the audience itself.
So a book for "Children (02)" reaches the trade as audience "01" in a
publisher's own ("proprietary") code scheme. Only "General / adult (01)"
comes out right.
The other audiences name other schemes: "Teenage (03)" reads as an MPAA
film rating of "01", and "Professional and scholarly (06)" as a code in
the French-language BTLF scheme. Nothing on screen warns the press. The
press's own Native XML import reads the value back the same wrong way,
so moving a book between two presses restores the right audience and
hides the fault. The ONIX 3.0 tool and the Native XML export both carry
it.
The stored audience is right; only the output is wrong. So a fix changes
the export and the Native XML import, needs no repair of stored data,
and files exported before it still import correctly.
Since: 2012-01-11, a date read from the code's history · Basis: probe, 2026-10-03. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — Some representative fields reach no file** · ❓ · minor.
"Representative ID Type (GLN is recommended)" and "Representative ID"
are asked for every representative, and "Phone" and "Email Address" for
every agent, but no ONIX product carries them, so the trade never gets
the identifier the window recommends.
Question: should the product carry the representative's identifier, and
the agent's phone and email?
Lean: yes; the ONIX standard, which no screen shows, has a place for
each of them, and no screen uses them for anything else.
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — A book imported from a press's Native XML file loses its "Rest of World?" sales-rights tick** · 🐞 · medium.
A press editor exports a book from Tools › "Native XML Plugin" and
imports the file again, into the same press or another one. A
publication format's sales-rights entry that had "Rest of World?" ticked
comes back as an ordinary entry: the box is unticked and "World (WORLD)"
is chosen under the included regions. The import says "The import
completed successfully." and nothing tells the editor.
"Rest of World?" means everywhere the format's other entries do not
name. The imported entry means the whole world instead. A format sold
with exclusive rights in Canada and non-exclusive rights in the rest of
the world comes back stating non-exclusive rights everywhere, Canada
included, beside the exclusive Canada entry: on the "Metadata" tab, and
in the book's next ONIX product, which no longer names a rest-of-world
type.
Basis: probe, 2026-10-03. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A book's "Add Representative" window shows both role lists and refuses a supplier until "Agent" and "Supplier" are clicked** · 🐞 · medium.
An editor opens a book's "Marketing" › "Representatives" and presses
"Add Representative". The window opens with "Supplier" chosen but shows
two "Role" lists side by side: the agent roles on the left, the supplier
roles on the right. They choose a supplier role, type a name and press
"OK". The window refuses with "This field is required." under the agent
list and saves nothing.
The supplier saves only after "Agent" and then "Supplier" are clicked,
and nothing on the screen suggests doing that. Editing a supplier fails
the same way: its "Edit" window also shows both lists, so "OK" is
refused even with nothing changed. A supplier saved this way is stored
correctly.
Agents are not affected: clicking "Agent" hides the supplier list.
Representatives matter to presses that send ONIX records to the book
trade, where a book's suppliers and agents are part of each product
record.
Basis: probe, 2026-10-03. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A book representative switched between "Agent" and "Supplier" is listed under both groups until the page is reloaded** · 🐞 · low.
An editor opens a supplier on a book's "Marketing" › "Representatives"
page, switches it to "Agent", picks an agent role and presses "OK".
"Representative edited." appears and the representative is listed under
"Agents" with its new role, but it is also still listed under
"Suppliers" with its old role.
The change is saved correctly, and a reload removes the extra row. Until
then the extra row acts on the same representative: its "Edit" opens the
representative as it now is, and its "Delete" deletes it, while the row
itself stays on the page.
The table redrew the whole list after each save until a 2012 change made
it redraw one row in one group, which missed this case.
Basis: probe, 2026-10-03. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A refused representative delete leaves its dialog open** · 🐞 · low.
"OK" in the "Delete" dialog of a representative that a market names
raises a browser pop-up with the refusal, and the dialog then stays
open with a spinner; "OK" again repeats the pop-up, and only "Cancel"
closes it. Expected: after the refusal the dialog closes and the
representative stays listed.
Basis: probe, 2026-10-03. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — Two refusals come without a message** · 🐞 · low.
Saving a second "Rest of World?" entry, or a market whose "Date" or
"Price" is spaces only, leaves the window open with a second "Required
fields are marked with an asterisk: *" line (the market's box emptied)
and nothing saved, but no message. The reason arrives later as a notice
on the page: "There is already a ROW sales type defined for this
publication format." after a reload or with the next "Sales Rights
added."; "A date is required and the date value must match the chosen
date format." or the untranslated "##grid.catalogEntry.priceRequired##"
with the next "Market added.". Expected: the window says what it
refused, in words, when it refuses it.
Basis: probe, 2026-10-03. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — An ONIX export with nothing ticked fails** · 🐞 · low · crash: server.
"Export Submissions" pressed with no book ticked should say to tick one;
instead the server fails and the "Export Submissions Results" tab opens
empty, with no text and no button, whether "Validate XML before the
export and registration." is ticked or not. The Native XML tool fails
the same way ([Import & export, its A12](U63-import-export.md#a12)).
Basis: probe, 2026-10-01. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — A book whose market has a tax rate other than "Zero-rated", or a tax type alone, fails its Native XML export** · 🐞 · medium.
A press editor sets a "Taxation Rate" such as "Standard rate (S)" on a
book's market. Or they choose a "Taxation Type" such as "VAT
(Value-added tax) (01)" and leave the rate empty. When they then export
the book from Tools › "Native XML Plugin", the export ends with "The
process failed. Check below for errors/warnings." and "Element
'{http://ns.editeur.org/onix/3.0/reference}Tax': Missing child
element(s).", and no file is offered. They expect the file, with the tax
they chose stated in it. Until a schema change in late 2024, the same
book exported with its tax type and rate code in the file.
If other books are ticked in the same export, they get no file either.
The editor can export the book only by changing its tax:
- emptying the tax fields drops the tax from the record;
- choosing "Zero-rated (Z)" records a tax rate the press does not
  charge.
Basis: probe, 2026-10-03. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — Returns and availability: the tab and the file disagree** · 🐞 · medium.
A format whose "Metadata" tab was never saved shows "Available (20)"
and "Yes, returnable, full copies only (Y)", but its product states no
returns condition. A book imported from a press's Native XML file
keeps none of its formats' "Returnable Indicator" and "Product
Availability": each imported tab shows those two choices whatever was
exported, and the product again states no returns condition; "Save"
on such a tab then stores "Y", wrong for a book that was not
returnable. Expected:
the tab shows what the product will carry, and an import brings both
back as exported.
Basis: probe, 2026-10-03. <sup>f-a18</sup>
Report: refresh owed — the report and its issue say "Returnable Indicator" is offered on physical formats only, but every format's "Metadata" tab shows the physical groups today (Publication formats A6, pkp-e2e#796), so those sentences hold only once A6 is fixed (2026-10-05)

<a id="a19"></a>
**A19 — A Native XML import rewrites the suppliers** · 🐞 · medium.
Every market exported without a supplier comes back naming a new
supplier, the exporting press itself ("Publisher to end-customers
(09)", its "Press Publisher Name", its principal contact's email
address, its home page as the website), which the book's
"Representatives" then lists. A supplier exported with a website comes
back with none; one exported without comes back with the book's page on
the exporting press as its website. Expected: markets and suppliers
come back as they were.
Basis: probe, 2026-10-03. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — On an install with no representative yet, the first one added is not listed until the page is reloaded** · 🐞 · minor · crash: server.
On an install where no book has a representative yet, the first one
added on a book's "Marketing" › "Representatives" page, agent or
supplier, is saved at "OK" (an agent with "Representative added."),
yet neither "Agents" nor "Suppliers" lists it; a reload lists it under its
group. Every representative added after it is listed at once.
Expected: the first one is listed at once too, like the rest.
Basis: probe, 2026-10-03. <sup>f-a20</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-28 at omp `3cd59e944`, lib/pkp `17a1f01fed`,
ui-library `03d1cee2`, ojs `72b85f4ba0`, ops `e2111e3aae`.

<a id="fn-a"></a>
**a** — The group: ui-library
`useWorkflowNavigationConfigOMP.js` pushes the `marketing` group
(`settings.libraryFiles.category.marketing` "Marketing") only when
`pageInitConfig.dashboardPage === DashboardPageTypes.EDITORIAL_DASHBOARD`;
`getMarketingItems()` adds `audience` (`monograph.audience` "Audience"),
`representatives` (`grid.catalogEntry.representatives` "Representatives")
and `publicationDates`, with no role or permission test; headings from
`getMarketingTitle()` (`semicolon` "{$label}: " + label).
`workflowConfigEditorialOMP.js` `MarketingConfig.audience` →
`WorkflowMarketingForm` (`formName: 'audience'`, loaded off
`submission.publications[0]`, the form itself per submission) and
`MarketingConfig.representatives` → `RepresentativeManager` (a
`GridWrapper` on `grid.catalogEntry.RepresentativesGridHandler` with
`submissionId` only). Audience lives on the submission (`omp/schemas/submission.json`
`audience`, `audienceRangeQualifier`, `audienceRangeFrom`,
`audienceRangeTo`, `audienceRangeExact`, each `nullable` string) and the
representatives in the `representatives` table keyed by `submission_id`;
sales rights and markets hang off `publication_format_id`
(`SalesRightsDAO`, `MarketDAO`). The tool: `plugins/importexport/onix30`
(`Onix30ExportPlugin`, display name
`plugins.importexport.onix30.displayName` "ONIX 3.0 Monograph Export
Plugin"). Live-probed 2026-09-28 (Purpose; Rule 1), two runs: signed
out and as a Reader, the book's page showed none of the audience, the
representatives, the sales rights or the markets; Tools ›
"Import/Export" listed "ONIX 3.0 Monograph Export Plugin: Export
monograph metadata in the ONIX 3.0 format"; a book with two formats
gave two products in its Native XML file; notes td1 and td11.

<a id="fn-b"></a>
**b** — OJS and OPS carry no `onix30` plugin (`plugins/importexport`:
ojs `native`, `pubmed`, `users`; ops `native`), no `MarketingConfig`, and
their navigation configs push no `marketing` group; their galley window
has no catalog-metadata tab (`PublicationFormatMetadataForm` and the
`catalogEntry` grids are OMP classes). Live-probed 2026-09-28: note td1.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-28 (the absence paragraph), two runs, as
a scratch journal's and preprint server's manager and as `manager.maya`
on OJS and OPS `publicknowledge`. The workflow's side menu held
"Workflow" and "Publication" ("Preprint" on OPS), no "Marketing";
typed addresses with `workflowMenuKey=marketing_audience`,
`marketing_representatives` or `marketing_publicationDates` opened the
current stage ("Workflow: Production", "Workflow: Submission"). A
galley's "Edit" window had one tab, "Edit Metadata" (label, language,
remote URL, URL path), with no sales-rights, market, price or tax
words. Tools › "Import/Export" listed DOAJ, Crossref, DataCite, Native
XML, Users XML and PubMed on OJS, Crossref and Native XML on OPS; a
Native XML export of a submission with a galley held no ONIX element.
Control: on OMP the Press manager saw the "Marketing" group, a format
window with the tabs "Edit" and "Metadata", and the ONIX tool, on a
scratch press and on `publicknowledge`.

<a id="fn-c"></a>
**c** — Roles, per surface:
- "Audience": the form loads through OMP `SubmissionController`
  `getAudienceForm()` (`GET
  submissions/{id}/publications/{publicationId}/_components/audience`,
  role authorizer sub-editor, manager, site admin, assistant, plus
  `SubmissionAccessPolicy`); it saves with `PUT submissions/{id}`
  (lib/pkp `PKPSubmissionController::edit()`, role authorizer manager,
  sub-editor, author; `SubmissionAccessPolicy`, no metadata-edit check),
  so an assistant's save is refused by the role authorizer.
- Representatives: `RepresentativesGridHandler` grants every op to
  manager, site admin, sub-editor and assistant, behind
  `SubmissionAccessPolicy`, whose assistant and sub-editor branches need
  only `UserAccessibleWorkflowStageRequiredPolicy` (some stage of the
  book open to the user), not the book's current stage.
- Sales rights and markets: `SalesRightsGridHandler` and
  `MarketsGridHandler` grant every op to manager and site admin only,
  behind `PublicationAccessPolicy`; nothing tests whether the version is
  published.
- The tool: lib/pkp `ImportExportPlugin` pages under
  `management/importexport`, the Tools page's gate (*Import & export*).
- The Press editor and Production editor are manager-level groups
  (`ROLE_ID_MANAGER`) on a press.
- Editorial Board Member: OMP `registry/userGroups.xml`
  `editorialBoardMember`, assistant level, `stages=""`; the Participants
  "Assign" window offers only the roles that take part in the book's
  current stage (at Production the Designer, Indexer, Layout Editor and
  Proofreader; at the Submission stage the Funding coordinator).

Live-probed 2026-09-28 (Actors intro and rows 1–5), two runs, one
scratch account per role on a scratch press: notes td2 to td5. The
Settings › Users & Roles › "Roles" list read "Press manager", "Press
editor" and "Production editor" at the "Press Manager" level, and eight
roles at "Assistant", Editorial Board Member the eighth. An Editorial
Board Member seeded onto a book saw it under "Assigned to me", and
opening it gave the "Error" window. An unassigned Series editor, Layout
Editor or Marketing and sales coordinator opening a book got the same
window (401 `roleBasedAccessDenied`), also at a typed
`marketing_audience` address. The ONIX tool's typed address opened for
the Press manager, Press editor, Production editor and `admin`; the
Series editor, Layout Editor, Marketing and sales coordinator, Author
and Reader got the access-denied page there and at `management/tools`.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-28 (Actors row 1), two runs. On a book in
Production the Press manager, Press editor, Production editor, `admin`,
the assigned Series editor and each of the seven assigned assistant
roles saw "Marketing" with "Audience", "Representatives" and
"Publication Dates"; "Audience" showed five lists with "Save" enabled,
"Representatives" the table with "Add Representative". The same held
for the Series editor on books at the Submission stage and published,
the Layout Editor at the Submission stage (a stage the role takes no
part in), Copyediting and published, the Marketing and sales
coordinator at the Submission stage (seeded: "Assign" offers the role
only at Copyediting), Copyediting and published, and the Copyeditor at
Copyediting. The Author's view (`dashboard/mySubmissions`) listed
"Workflow" and "Publication" only; the Author's typed
`marketing_audience` address fell back to the current stage, and the
editorial address went to the access-denied page.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-28 (Actors row 2; A2), two runs.
"Children (02)" saved by the Press manager, Press editor, Production
editor, `admin`, and the assigned Series editor with the assignment's
"Permissions" box unticked and ticked: 200, "Saved" by the button, kept
after a reload. The assignment's box is "Permissions" ("Allow this
person to make changes to the publication, such as the title, abstract,
metadata and other publication details. …") in the Participants panel's
"Edit Assignment"; "Permit submission metadata edit." is the Series
editor role's option on Settings › Users & Roles › "Roles" › "Edit".
Each of the seven assigned assistant roles got 401 and the notice "An
unexpected error has occurred. Please reload the page and try again.",
no window; "Children (02)" stayed selected until a reload showed the
list blank, and nothing was stored.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-28 (Actors row 3), two runs. On a book in
Production, the Marketing and sales coordinator, Layout Editor, Series
editor, Copyeditor, Designer, Indexer, Proofreader and Funding
coordinator (all assigned), the Press manager, Press editor, Production
editor and `admin` each added the supplier "Trade Books Ltd …" with
"Wholesaler to retailers (04)", then pressed its "Edit" › "OK" and its
"Delete" › "OK": "Representative added.", "Representative edited.",
"Representative removed." every time, the row under "Suppliers" in
between. The Layout Editor added one the same way on a book in
Copyediting.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-28 (Actors row 4), two runs. The Press
editor, Production editor and `admin` each added a sales-rights entry
and a market on an unpublished version's "Paperback": "Sales Rights
added.", "Market added.", the rows listed. The Press manager did the
same on a published version's format, under "Warning: This version has
been published. Editing it may impact the published content.". For the
assigned Series editor, Layout Editor, Designer, Indexer and
Proofreader the window opened with "Edit" and "Metadata", and the
tab's four lists stayed "Loading", each raising "The current role does
not have access to this operation." and "undefined". For the assigned
Copyeditor, Marketing and sales coordinator and Funding coordinator,
the "Publication Formats" address fell back to "Workflow: Production"
with "You don't currently have access to that stage of the workflow."
on a book in Production, and on a published book the page kept its
heading "Publication: Publication Formats" with that sentence alone.

<a id="fn-d"></a>
**d** — OMP `classes/components/forms/submission/AudienceForm.php`: five
`FieldSelect`s, `audience` (`monograph.audience` "Audience", ONIX list
28), `audienceRangeQualifier` (`monograph.audience.rangeQualifier`
"Audience Range Qualifier", list 30), `audienceRangeFrom`,
`audienceRangeTo`, `audienceRangeExact` ("Audience Range (from)", "(to)",
"(exact)", list 77 each), values the submission's; no field required, no
empty option (ui-library `FieldSelect.vue` → `SelectInput.vue` renders a
placeholder option only when one is passed), and nothing links the
lists. The labels come from `ONIXCodelistItemDAO::getCodes()` over
`locale/en/ONIX_BookProduct_Codelists.xml` filtered by lib/pkp
`xml/onixFilter.xsl` ("{description} ({code})"; a deprecated code "{description}"
+ `monograph.publicationFormat.onixDeprecated` " (Discontinued)"; list 55
without the code), sorted by `asort()` on the parsed entries (byte
order: capitals before small letters, accented letters and a curly
apostrophe after "z"), which puts the two-member deprecated entries
after every one-member entry. Counts in the code list file: list 28 13,
list 30 19 + 3 deprecated, list 77 19 (P, K, 1–17). `AudienceForm::$successMessage`
(`monograph.audience.success` "The audience details have been updated.")
is set and never shown: ui-library `Form.vue::success()` shows the
footer's "Saved" (`form.saved`) and emits no message; `Form.vue::error()`
turns a 401 into `common.unknownError`. The schema accepts any string
(`nullable`), so a code outside the list is refused only by the list
offering none. Live-probed 2026-09-28 (Fields intro; the "Audience"
page; Rules 2–4), two runs: note td6; the options of every list on the
four screens were read. Every list but "Date Format", "Agent" and
"Supplier" read "Name (code)"; discontinued entries came last on every
list that has them (the qualifier 3, the supplier roles 1, the ID types
1, the sales-rights types 2, the countries 3, the regions 38, the
currencies 40). Out of plain alphabetical order: "Finnish Upper
secondary school course (28)" before "Finnish school grade range (27)",
"GLN (06)" before "German ISBN Agency publisher identifier (05)", "FRP
including tax (04)" before "Freight-pass-through RRP excluding tax
(31)", "Rwanda" before "Réunion", "Tuvalu" before "Türkiye", "Åland
Islands" after "Zimbabwe", "Boliviano (BOB)" before "Bolívar Soberano
(VES)", "Lucca" before "L’Aquila". The form holds five lists and no
text box.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-28 (Fields, the "Audience" page; Rules
2, 3), two runs. On a new book the five lists showed nothing chosen and
none had an empty choice, before or after a save; "Audience" 13
options, the qualifier 22 (19, then "Ausbildungsberuf (Discontinued)",
"Bundesland (Discontinued)", "Schulform (Discontinued)"), each range
list 19, the same options with no qualifier, "Reading age, years (18)",
"US school grade range (11)" or "Brazil Education level (31)" chosen.
"Professional and scholarly (06)", "US school grade range (11)", "Ninth
Grade (9)" under "(from)" and "Twelfth Grade (12)" under "(exact)"
saved: "Saved" in the form's footer beside the button, no notice, the
same after a reload. "Tenth Grade (10)" under "(to)" alone, no
qualifier, saved and reopened alone. "Children (02)" chosen without
saving, then "Representatives" and back: nothing asked, "Professional
and scholarly (06)" shown; a reload with an unsaved choice also asked
nothing and dropped it.

<a id="fn-e"></a>
**e** — OMP `controllers/grid/catalogEntry/RepresentativesGridHandler.php`
(a `CategoryGridHandler`: title `grid.catalogEntry.representatives`,
action `grid.action.addRepresentative` "Add Representative", columns
`grid.catalogEntry.representativeName` "Name" and
`representativeRole` "Role", categories
`grid.catalogEntry.agentsCategory` "Agents" and `suppliersCategory`
"Suppliers"), `RepresentativesGridRow.php` (row actions
`grid.action.edit` "Edit", `grid.action.delete` "Delete" through
`RemoteActionConfirmationModal` with `common.confirmDelete` and title
`common.delete`), `RepresentativesGridCellProvider.php` (the role through
`Representative::getNameForONIXCode()`, list 69 or 93),
`form/RepresentativeForm.php`,
`templates/controllers/grid/catalogEntry/form/representativeForm.tpl`
("Representative Type" radios `agent`/`supplier`, `isSupplier` true on a
new form; `agentRole` list 69 and `supplierRole` list 93, each with an
empty default option and `required="true"`; `name` required;
`representativeIdType` list 92 with an empty option, `06` on a new form;
`representativeIdValue`; `phone` type tel; `email` type email; `url`
type url), `js/controllers/modals/catalogEntry/form/RepresentativeFormHandler.js`
(the radios show one role list and hide the other). The form's one
server check is `grid.catalogEntry.roleRequired` "A representative role
is required.", the role of the chosen type being in its list; the
name's requirement is the template's client-side one.
`execute()` stores `supplierRole` or `agentRole` by `isSupplier`.
Notices: `notification.addedRepresentative` "Representative added.",
`editedRepresentative` "Representative edited.",
`removedRepresentative` "Representative removed."; the refused delete
answers `JSONMessage(false, manager.representative.inUse)` (lib/pkp
`manager.po`) when a market of any publication format of any of the
submission's publications names the representative as agent or
supplier. `RepresentativeDAO::getAgentsByMonographId()` and
`getSuppliersByMonographId()` select with no `ORDER BY`. Live-probed
2026-09-28 (the "Representatives" page and window; Rules 5–8): notes
td7, td12 and td13. The refused delete answered 200 with
`{"status":false,…}`, shown as a browser `alert()` while the dialog
stayed open; on arrival both role lists showed, and the agent list
stayed `required` while "Supplier" was chosen.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-28 (the "Representatives" page; Rule 5;
Side effects, notices), four runs. A new book's table: heading
"Representatives", "Add Representative" at its top right, columns
"Name" and "Role", "Agents" and "Suppliers" each reading "No Items".
"Alpha Agency" and "Beta Agency" added: "Representative added." each,
listed in that order. "Alpha Agency" › "Edit" › "OK" with nothing
changed: "Representative edited."; it moved below "Beta Agency" in
three of the four runs and stayed first in one, and the order held
after a reload. On one book as its Press manager, each list's add,
unchanged "Edit" › "OK" and delete showed "Representative added." /
"edited." / "removed.", "Sales Rights added." / "edited." / "removed."
and "Market added." / "edited." / "removed." as page notices; the
"Audience" "Save" showed "Saved" left of the button and no notice.

<a id="fn-f"></a>
**f** — OMP `controllers/grid/catalogEntry/SalesRightsGridHandler.php`
(title `grid.catalogEntry.salesRights` "Sales Rights", action
`grid.action.addRights` "Add Sales Rights", columns
`grid.catalogEntry.salesRightsType` "Sales Rights Type" and
`salesRightsROW` "Rest of World?" through
`controllers/grid/common/cell/checkMarkCell.tpl`),
`SalesRightsGridRow.php`, `SalesRightsGridCellProvider.php`,
`form/SalesRightsForm.php`, `templates/controllers/grid/catalogEntry/form/salesRightsForm.tpl`
(`type` list 46 minus the format's used types, the entry's own kept,
`required`, no default option; `ROWSetting` checkbox with
`grid.catalogEntry.salesRightsROW.tip`), `countriesAndRegions.tpl`
(`grid.catalogEntry.countries` "Countries" and `regions` "Regions", each
two multiple selects `grid.catalogEntry.included` "Included" and
`excluded` "Excluded", lists 91 and 49). Checks: `type` required
(`grid.catalogEntry.typeRequired`, a key no locale file defines; the
list always holds a value), and the custom `ROWSetting` check
(`grid.catalogEntry.oneROWPerFormat` "There is already a ROW sales type
defined for this publication format.") through
`SalesRightsDAO::getROWByPublicationFormatId()`; no check on the
territory lists. List counts in the code list file: 46 7 + 2
deprecated; 91 249 + 3; 49 314 + 38. Notices
`notification.addedSalesRights` "Sales Rights added.",
`editedSalesRights`, `removedSalesRights`. The tab mounts both grids in
`templates/controllers/tab/catalogEntry/form/publicationMetadataFormFields.tpl`.
Live-probed 2026-09-28 (the "Sales Rights" list and window; Rules
9–12), two runs: notes td14 and td15. The list is the tab's second,
after "Product Identification"; a ticked entry's "Rest of World?" cell
holds a tick icon and no text. Each "Countries" and "Regions" list held
253 and 353 lines, the first with an empty value. The tip renders with
one space after "format.". A refused "OK" answered 200 with the form
again.

<a id="fn-g"></a>
**g** — OMP `controllers/grid/catalogEntry/MarketsGridHandler.php`
(title `grid.catalogEntry.markets` "Market Territories", action
`grid.action.addMarket` "Add Market", columns
`grid.catalogEntry.marketTerritory` "Territory",
`grid.catalogEntry.representatives` "Representatives",
`monograph.publicationFormat.price` "Price"), `MarketsGridRow.php`,
`MarketsGridCellProvider.php` (`Market::getTerritoriesAsString()`:
"Included: " + the included country and region codes joined by ", " +
", Excluded: " + the excluded ones; `getAssignedRepresentativeNames()`;
`getPrice() . getCurrencyCode()`), `form/MarketForm.php`,
`templates/controllers/grid/catalogEntry/form/marketForm.tpl`: `date`
(`grid.catalogEntry.dateValue` "Date", required), `dateFormat` (list 55,
`grid.catalogEntry.dateFormat` "Date Format", default `20`) and
`dateRole` (list 163, `grid.catalogEntry.dateRole` "Role", default
`01`), `agentId` (`grid.catalogEntry.agent` "Agent", under
`grid.catalogEntry.agentTip`) and `supplierId` ("Supplier") from
`RepresentativeDAO` for the submission, `countriesAndRegions.tpl`,
`price` (required, maxlength 255) with `currencyCode` (list 96, `CAD`
on a new form and on an edit whose stored code is empty),
`priceTypeCode` (list 58, `monograph.publicationFormat.priceType` "Price
Type"), `taxRateCode` (list 62, "Taxation Rate"), `taxTypeCode` (list
171, "Taxation Type", `02` on an edit whose stored code is empty),
`discount` ("Discount percentage, if applicable"). The price section's
`desc="monograph.publicationFormat.pricingInformation"` names a key no
locale file defines and a parameter the section does not render.
`MarketForm` checks `date` and `price` as required only
(`grid.catalogEntry.dateRequired` "A date is required and the date value
must match the chosen date format.", `grid.catalogEntry.priceRequired`,
a key no locale file defines); the templates' `required="true"` makes
the browser-side check refuse an empty box first. No check ties an
`agentId` or `supplierId` to the list offered. Notices
`notification.addedMarket` "Market added.", `editedMarket` "Market
edited.", `removedMarket` "Market removed.". Live-probed 2026-09-28 (the
"Market Territories" list and window; Rules 13, 14), two runs: notes
td8, td9, td10 and td16. The empty-box refusal is the browser's (no
request sent); the spaces-only refusal answered 200 with the form
again; the price section shows no description line. "Role": 21 kinds,
"Transfer date (28)" last; the four Hijri formats read "Text string
(H)", "YYYY (H)", "YYYYMM (H)" and "YYYYMMDD (H)".

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-28 (Fields, the "Market Territories"
list; A4), two runs. The list is the tab's third, after "Sales Rights".
A market with Countries "Included" "Canada (CA)" and "United States
(US)", "Excluded" "United Kingdom (GB)", "25", an agent "Agent Ada" and
a supplier "Supplier Sam" read "Included: CA, US, Excluded: GB" ·
"Agent Ada, Supplier Sam" · "25CAD", also after a reload, while its
"Edit" named "Canada (CA)", "United States (US)" and "United Kingdom
(GB)". A market with nothing chosen in the four lists read "Included: ,
Excluded:" with an empty "Representatives" cell; regions follow
countries ("Included: DE, WORLD, Excluded: IT-AG"); one representative
alone has no comma; "12.50" in US dollars read "12.50USD".

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-28 (Fields, "Price"), two runs. "Add
Market" arrived on "Canadian Dollar (CAD)" on a scratch press with no
payment settings (like `publicknowledge`, it stores no currency) and on
one taking payments in US dollars; 198 currencies, no empty choice,
"Afghani (AFN)" first, the 40 discontinued ones last, "Zimbabwe Dollar
(Discontinued)" the very last.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-28 (Fields, "Taxation Type"; A6), two
runs. A market saved with "Taxation Type" empty reopened in "Edit" on
"GST (Sales tax) (02)"; "OK" stored it (empty before, 02 after) and the
next "Edit" showed it again. Control: a market saved with "VAT
(Value-added tax) (01)", every other list set away from its arrival
choice, reopened on exactly what was saved.

<a id="fn-i"></a>
**i** — `Onix30ExportPlugin::display()` (index: a
`SubmissionsListPanel` titled `common.publications` "Monographs", `count`
100, `lazyLoad`, the first filter group dropped, as the Native XML
plugin's) and `plugins/importexport/onix30/templates/index.tpl`: when any
of the context's `publisher`, `location`, `codeType`, `codeValue` is
empty, only `plugins.importexport.onix30.pressMissingFields` ("This press
is missing some required information.  Please go to <a
href=\"{$url}\">Press Settings</a> and fill in the missing details.",
`url` `management/settings/context`); otherwise the tab
`plugins.importexport.native.export` "Export", the list with a tick box,
the title and `common.view` "View" per item (the Native XML plugin's
item template), the checkbox `validation`
(`plugins.importexport.common.validation` "Validate XML before the
export and registration.", `checked=$validation|default:true`),
`common.selectAll` / `common.selectNone`, and
`plugins.importexport.native.exportSubmissions` "Export Submissions".
The four settings are the Masthead's "Publisher Identity" fields
(*Journal identity & about pages*). Live-probed 2026-09-28 (the export
page; Rules 16, 17; Settings bullet 1), two runs: notes td18 and td19.
The page reads the trail "Tools / ONIX 3.0 Monograph Export Plugin"
and the tool's name as its heading; the validation box was ticked on
every arrival; "Select All" and "Export Submissions" sit on one row
under the list, the box between them. Leaving the page asked "Leave
site?" (`beforeunload`) after a typed search or a changed box, and
nothing after ticks or "Select All".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-28 (Rule 1), two runs. A published book
with an audience and two representatives, then "Create New Version",
then that version's "Publish": "Audience" read the same three choices
and "Representatives" the same two rows at each of the three points,
and the "Marketing" group sat above "Publication", outside every
version, each time.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-28 (Fields, the representative window;
Rules 6, 7; A12, A13), two runs (A13 four). "Add Representative" opened
on "Supplier" with the agent list (empty choice + 4) and the supplier
list (empty choice + 16) side by side; "OK" on a supplier with its role
chosen showed "This field is required." under the left list until
"Agent" then "Supplier" were clicked. A representative's "Edit" opened
the same way ("Sales agent (08)" showing "Retailer (08)" in the
supplier list, "Exclusive sales agent (05)" showing "Sales agent
(Discontinued)"), and a supplier's unchanged "Edit" › "OK" was refused
alike. After a click only that type's list showed. "Exclusive sales
agent (05)", then "Supplier" › "Wholesaler to retailers (04)", then
back to "Agent": the agent list still read "Exclusive sales agent
(05)"; "OK" stored the agent with that role, and the same switches
ending on "Supplier" stored "Wholesaler to retailers (04)". "Name"
empty, or "Role" on its empty choice: "This field is required." under
the field, no request sent. "not-an-email" and "not a site": "Please
enter a valid email address." and "Please enter a valid URL."; "www.example.org"
also refused; "https://epsilon.example.org" with "epsilon@example.org"
saved. "Representative ID" kept "any text !#% éü", "Phone" "call me
maybe". A supplier's "Edit" switched to "Agent" with "Non-exclusive
sales agent (06)": "Representative edited.", listed under "Agents"
with the new role and under "Suppliers" with "Distributor to
end-customers (12)" until a reload, then only under "Agents". "Cancel"
with typed text closed the window with no question and added nothing.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-28 (Rule 8; A14), two runs. "Delete"
opened a dialog titled "Delete" with the quoted question, "OK" and
"Cancel"; "Cancel" kept the row; "OK" on a representative no market
names showed "Representative removed.", gone after a reload. The
supplier "Gamma Distribution" and the agent "Eta Agency", both named by
one market: "OK" raised the refusal as a browser pop-up, and the dialog
stayed open with a spinner (read again 5 s later, "OK" enabled);
"Cancel" closed it and the rows stayed. After "Create New Version" the
market was copied; with the new version's market deleted both were
still kept (version 1's market names them); with version 1's
(published) market deleted too, both deleted with "Representative
removed.".

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-28 (Rules 9, 10; Fields, leaving a
window), two runs. With two entries on "Paperback", "Ebook"'s lists
read "No Items" and its "Add Sales Rights" offered all nine types. An
entry added on a new version's "Paperback" left the first version's
list as it was. An entry added, then the tab's own "Cancel" at once:
the window closed, and the entry was there on reopening and after a
reload. The first "Add Sales Rights" offered nine types and arrived on
"(01)"; after "(01)" was saved the next offered eight and arrived on
"(02)"; the "(01)" entry's "Edit" offered all nine and arrived on
"(01)". After the "(06)" entry was deleted, "(06)" was offered first
again. With all nine used on one format, "Add Sales Rights" opened with
an empty type list, and "OK" showed "This field is required." with no
request sent. A row's "Delete": "Cancel" kept it, "OK" removed it with
"Sales Rights removed." ("Market removed.": seven rows after "Cancel",
six after "OK"). In both windows, "Cancel" with a change closed at once
and the list stayed "No Items"; the close arrow asked the quoted
question, and "OK" closed and dropped the change.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-28 (Rules 11, 12; Fields, "Countries",
"Regions"; A15), two runs. An entry with "Rest of World?" ticked and
"Canada (CA)" under Countries "Included": a tick in its row, and
"Canada (CA)" still selected in its "Edit", also after a reload. A
second ticked entry, with nothing else chosen and with "United States
(US)": the window stayed open with a second "Required fields are marked
with an asterisk: *" line, no notice 4 s later or after "Cancel", and
the list kept one row; "There is already a ROW sales type defined for
this publication format." appeared after a reload, and a refused try
appeared again with the next "Sales Rights added.", once per try. An
entry of type "(02)" with no country or region saved with "Sales Rights
added." and was listed after a reload. The empty line of each list
chosen alone saved as nothing chosen (the entry's "Edit" showed none
selected).

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-28 (Rules 13, 14; A8, A15), two runs.
"OK" with "Date" empty, "Price" empty or both: "This field is
required." under each empty box, no request sent, nothing saved. "abc"
as a "YYYYMMDD" date with "ten" as the price saved ("Market added.",
the row's price "tenCAD", "Edit" reopening on "abc", "YYYYMMDD",
"ten"); "2024-03-05 and more" as a "YYYY" date with "-3" saved too
("-3CAD"). A "Date" or "Price" of spaces only: the window stayed with
the box emptied and a second "Required fields…" line, no message, and
nothing saved; "A date is required and the date value must match the
chosen date format." and "##grid.catalogEntry.priceRequired##" arrived
with the next "Market added.". A market with only a date and a price
saved on a book with representatives and on one without. On a book
with none, "Agent" and "Supplier" held the empty choice alone; after
"Agent Olga" was added, "Agent" offered her and "Supplier" still the
empty choice; after "Supplier Sid" and "Agent Bert", "Agent" offered
"Agent Olga", "Agent Bert" in that order and "Supplier" "Supplier Sid".
With a change, the market window's "Cancel" and close arrow behaved as
in the sales-rights window (note td14).

<a id="fn-h"></a>
**h** — OMP `classes/publication/Repository.php::version()` clones each
publication format and, through `IdentificationCodeDAO`, `MarketDAO`,
`PublicationDateDAO` and `SalesRightsDAO`, each of its rows onto the new
format (the market's `agentId` and `supplierId` copied as they are);
`classes/services/PublicationFormatService.php::deleteFormat()` deletes
the same four sets. Representatives are submission rows, untouched by
either. Live-probed 2026-09-28 (Rule 15; Side effects, copies and
removals): note td17.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-28 (Rule 15), two runs. On a published
book, "Create New Version": the new version's "Paperback" listed the
sales-rights entry "For sale with exclusive rights in the specified
countries or territories (01)" and the market "Included: CA,
Excluded:" · "Agent Ada, Supplier Sam" · "25CAD", its "Edit" naming the
same agent and supplier. On the new version the entry deleted ("Sales
Rights removed.") and the price changed to 30 ("Market edited."):
version 1 still listed the entry and "25CAD". Version 1's (published)
market changed to 40 left the new version at "30CAD" with no entry.
Deleting the new version's "Ebook" ("Publication Format removed.")
removed its format, sales-rights and market rows; version 1's "Ebook"
kept its entry and its "15CAD" market. Each price-only "Edit" › "OK"
also stored "GST (Sales tax) (02)" (A6).

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-28 (Rule 16; Settings bullet 1), two
runs. On a new press the Masthead showed the four fields blank under
"Publisher Identity" ("These fields are required to publish valid ONIX
metadata."), "Publisher Code Type" with nothing chosen. The tool's page
held only the sentence, rendered with one space after "information.",
no tab, no list and no box; "Press Settings", its one link, landed on
Settings › Press on the "Masthead" tab (page heading "Setup"). With the
four filled and saved ("Saved"), the tool opened on "Export" with its
list. "Publisher Code", "Press Publisher Name" and "Geographical
Location" each emptied alone saved, read back empty after a reload, and
brought the sentence back; "Publisher Code" typed as three spaces was
saved empty and did the same. "Publisher Code Type" has 41 options,
"ARK (35)" first, and no empty choice; a press seeded without it showed
the sentence. On an incomplete press the Native XML "Export" tab read
"This press is missing some required information for ONIX metadata used
in this export. Please go to Press Settings and fill in the missing
details." above its list, and a Native XML export of its book held no
ONIX product; filled, the file held one per format. OJS and OPS
Native XML "Export" tabs show no reminder.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-28 (the export page; Rule 17), two runs.
Nine books on a filled press, in every stage and state (published, the
Submission stage, a draft, declined, Production), were all listed as a
tick box, the title and "View". "Seven" typed in the search box left
nine lines until Enter, then one. "Filters" opened "Submission",
"Internal Review", "External Review", "Copyediting", "Production" and
"Add filter: Days since last activity"; "Production" listed the four
books at Production and neither published book. "Select All" ticked
all nine and read "Select None". With 101 books, page 1 held 100 lines
over "Previous 1 2 Next"; "Select All" ticked the 100 and kept reading
"Select All". "View" on the published book opened its Title & Abstract
page, on the Submission-stage book its Submission stage, and on the
draft "Make a Submission: Upload Files". "Leave site?" came after a
typed search or a changed validation box, never after ticks or "Select
All"; on return nothing was ticked and the box was ticked.

<a id="fn-j"></a>
**j** — `Onix30ExportPlugin::display()` `exportSubmissionsBounce` adds
the tab `plugins.importexport.native.export.submissions.results`
"Export Submissions Results"; `exportSubmissions` runs lib/pkp
`ImportExportPlugin::getExportSubmissionsDeployment()` with the ticked
ids as an array and `noValidation` 0 or 1, and
`getExportTemplateResult()` renders
`templates/plugins/importexport/resultsExport.tpl`
(`plugins.importexport.native.processFailed` "The process failed. Check
below for errors/warnings.", `innerResults.tpl` headed
`plugins.importexport.common.errorsOccured` "Errors occured:", the
generic group `plugins.importexport.native.common.any` "Generic
Items"; on success `plugins.importexport.native.export.completed` "The
export completed successfully." and "Download the exported file from the
button below."). `PKPImportExportDeployment::export()` catches the
filter's exception into that error. The filter group
`monographs=>onix30-xml` declares `inputType="class::classes.submission.Submission[]"`
(`plugins/importexport/onix30/filter/filterConfig.xml`); lib/pkp
`ClassTypeDescription::splitClassName()` reduces it to the class
`Submission`, which OMP aliased to `APP\submission\Submission` only
while `PKP_STRICT_MODE` was off (still so on stable-3_5_0,
`classes/submission/Submission.php`); omp `6f57d1d09` (2025-12-04,
pkp/pkp-lib#11583, "Removed PKP_STRICT_MODE") removed the alias and
rewrote the Native XML plugin's `filterConfig.xml` to
`class::APP\submission\Submission[]` but not this one, so
`Filter::execute()` throws `filter.input.error.notSupported`. With no
book ticked, the empty `selectedSubmissions` reaches
`Repo::submission()->get()`, which takes an integer, and the request
fails with a server error before any filter runs, the same lib/pkp path
as the Native XML tool's (*Import & export*, its A12). Live-probed
2026-09-28 (Rule 18; A1, A16): notes td20 and td21.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-28 (Rule 18; A1), two runs. On a filled
press "Export Submissions" added "Export Submissions Results" and
opened it with the failure texts of Rule 18 and no download button, for
a published book with validation ticked and unticked, two published
books, a book without a format, a draft with validation unticked, and
all nine books through "Select All"; each export posted
`exportSubmissionsBounce` (200), and no `onix30-*.xml` appeared in the
files directory's `temp/`. A second export on the same page added a
further results tab (three tabs after two); a tab's "Close" removed it
and returned to "Export" with the ticks kept.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-28 (Rule 18a; A16), two runs. With
nothing ticked, "Export Submissions" opened the results tab empty, with
no text and no button, validation ticked and unticked; its request
`GET …/Onix30ExportPlugin/exportSubmissions?selectedSubmissions=&validation=on`
(and `validation=`) answered 500.

<a id="fn-l"></a>
**l** — OMP `plugins/importexport/native/filter/PublicationFormatNativeXmlFilter.php::createRepresentationNode()`:
when the context has a contact name and email and `publisher`,
`location`, `codeType` and `codeValue`, it runs the
`monographs=>onix30-xml` filter on the submission, builds the format's
product with `MonographONIX30XmlFilter::createProductNode()`, strips
`Contributor`, `RecordReference`, `NotificationType`,
`RecordSourceType`, `Collection`, `CollateralDetail` and `Imprint`
through `plugins/importexport/native/onixProduct2NativeXml.xsl`, and
appends it to the format's element in the ONIX namespace. The Native
export validates the whole file against its schema, which imports the
ONIX one, so an invalid `PriceAmount` fails it as the page counts do
(*Publication formats & proof terms*, its A17). The principal contact's
name and email are required on Settings › Press › "Contact", so a
press that saved that tab has them. Seen live on 2026-09-28 during the
format spec's check: the Native XML export carried a format's
`<onix:Date dateformat="20">` publication date. The Native export's
schema check runs whether or not its own validation box is ticked.
Live-probed 2026-09-28 (Rule 19; Settings bullet 1): notes td22 and
td23.

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-28 (Rules 19, 20; A3, A8), two runs,
each export Tools › "Native XML Plugin" › "Export" on a filled press.
A book with "Children (02)", "US school grade range (11)", "(from)"
"Ninth Grade (9)" and "(to)" "Twelfth Grade (12)" completed ("The
export completed successfully." and "Download Exported File"), one
`onix:Product` per format, validation ticked or not, each with
`<Audience><AudienceCodeType>02</AudienceCodeType><AudienceCodeValue>01</AudienceCodeValue></Audience>`
and an `AudienceRange` of qualifier 11, precision 03 value 9, precision
04 value 12. With "(exact)" "Tenth Grade (10)" also saved, the range was
precision 01 value 10 alone. A book with no audience had no `Audience`;
one with "Audience" alone had no `AudienceRange`. A market price "ten":
"The process failed. Check below for errors/warnings.", "Errors
occured:", "Generic Items", "Line 0 Column 0: Element
'{http://ns.editeur.org/onix/3.0/reference}PriceAmount': 'ten' is not a
valid value of the atomic type
'{http://ns.editeur.org/onix/3.0/reference}dt.StrictPositiveDecimal'."
and "Validation errors:" repeating it, no download; the same with the
box unticked, and with a valid book ticked beside it. A front-matter
page count "xii" failed the same way on `ExtentValue`. Control: with
"Publisher Code" emptied the export completed with no ONIX product and
no "onix" anywhere; a scratch journal's and server's Native XML file
with one galley held no `onix:` element either.

<a id="fn-k"></a>
**k** — OMP `plugins/importexport/onix30/filter/MonographONIX30XmlFilter.php`:
`process()` writes `createHeaderNode()` (`SenderIdentifier` from
`codeType`/`codeValue`, `SenderName` the press name in its primary
locale, `ContactName`, `EmailAddress`, `SentDateTime` `date('Ymd')`) and
`createSubmissionNode()` one `createProductNode()` per
`getCurrentPublication()` format, with no approval or availability
test. In the product: `Audience` with `AudienceCodeType` =
`audience` and `AudienceCodeValue` '01'; `AudienceRange` only when
`audienceRangeQualifier` is set, with `AudienceRangePrecision` 01 and
the exact value, else 03 with `from` and 04 with `to`, each when set.
`SalesRights` per entry with `SalesRightsType` and a `Territory`: ROW →
`RegionsIncluded` `WORLD` (and `ROWSalesRightsType` after the loop,
under `PublishingDetail`); else countries included → `CountriesIncluded`
and, unless `WORLD` is among the included regions, `RegionsIncluded` and
`RegionsExcluded`, else `RegionsExcluded`; else regions included →
`RegionsIncluded` and, when `WORLD` is among them, `CountriesExcluded`
and `RegionsExcluded`; the `Territory` is appended even when empty. One
`ProductSupply` per market: `Market` › `Territory` by the same cases,
appended only when it has a child; `MarketPublishingDetail` with
`PublisherRepresentative` (`AgentRole`, `AgentName`, `Website` role 18
when the agent has a URL), `MarketPublishingStatus` 04, `MarketDate`
(`MarketDateRole`, `DateFormat`, `Date`); `SupplyDetail` › `Supplier`
(`SupplierRole`, `SupplierName`, `TelephoneNumber`, `EmailAddress`,
`Website` 18 when set, `Website` 29 the `catalog/book/{urlPath or id}`
address), or without a supplier `SupplierRole` 09, `SupplierName` the
context's `publisher`, its `contactEmail`, `Website` 18 the press home;
`ReturnsConditions` (`ReturnsCodeType` 02) from the format's returnable
code; `ProductAvailability` (20 when unset); `Price` with `PriceType`,
`Discount` › `DiscountPercent`, `PriceAmount`, `Tax` (`TaxType`,
`TaxRateCode`, `TaxRatePercent` 0 for `Z`, `TaxableAmount` = price)
unless the price type is in the tax-inclusive set (02, 04, 07, 09, 12,
14, 17, 22, 24, 27, 34, 42), and `CurrencyCode`. The filter never reads
`representativeIdType`, `representativeIdValue`, or an agent's `phone`
or `email`. A `Tax` without `TaxAmount` is valid ONIX only with
`TaxRatePercent`, which the filter writes for `Z` alone, so any other
rate fails the schema check. Live-probed 2026-09-28 (Rules 20–23,
24a): notes td22 and td23; the product's parts were read from the
Native XML file (note l).

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-28 (Rules 19, 21–23, 24a; A7, A10, A17,
A18), two runs, from Native XML files on a filled press. Sales rights,
"Paperback": the "Rest of World?" entry "(01)" with "Canada (CA)" gave
`Territory{RegionsIncluded=WORLD}` and `ROWSalesRightsType` 01 under
`PublishingDetail`; "(02)" with CA and US included, GB excluded gave
`CountriesIncluded=CA US`; "(03)" with WORLD included and DE excluded
gave `RegionsIncluded=WORLD; CountriesExcluded=DE`. "Ebook": CA and
"England (GB-ENG)" included with "Quebec (CA-QC)" and DE excluded gave
`CountriesIncluded=CA; RegionsIncluded=GB-ENG; RegionsExcluded=CA-QC`;
US and WORLD included with "California (US-CA)" and FR excluded gave
`CountriesIncluded=US; RegionsExcluded=US-CA`; "Alberta (CA-AB)"
included with IT and "Scotland (GB-SCT)" excluded gave
`RegionsIncluded=CA-AB` alone. Markets: one `ProductSupply` each; the
agent as role, name and website (18), role and name alone without a
website; `MarketDate` role 01, format 00; the supplier with role, name,
phone, email, its website and the book's page (29), a supplier without
a website with the book's page alone; with no supplier, role 09, the
"Press Publisher Name", the principal contact's email and the home
page. Saved "Y"/"Available (20)" and "N"/"In stock (21)" reached
`ReturnsConditions` and `ProductAvailability`; a format whose tab was
never saved (showing "Available (20)" and "Yes, returnable, full copies
only (Y)") had `ProductAvailability` 20 and no `ReturnsConditions`.
Price type 01, discount 10, `Tax{TaxType=02; TaxRateCode=Z;
TaxRatePercent=0; TaxableAmount=25}`; "RRP including tax (02)" with
GST and Z gave no `Tax`; "Zero-rated (Z)" alone gave `TaxRateCode=Z;
TaxRatePercent=0`; currency CAD or USD. A format with no market had no
`ProductSupply`. No representative ID, no agent phone or email, no
`AgentIdentifier` or `SupplierIdentifier` appeared; an agent or a
representative no market names was absent. The "Hardback" and "Ebook"
products carried `RelatedMaterial` › `RelatedProduct` with relation
code 06 and the "Paperback"'s ISBN-13. Failing exports ("The process
failed. Check below for errors/warnings."): an entry with nothing
included ("Element '{…}Territory': Missing child element(s)."), a market
with no country or region ("Element '{…}Market': Missing child
element(s). Expected is ( {…}Territory )."), "VAT (Value-added tax)
(01)" with "Standard rate (S)", "Standard rate (S)" alone, and a market
after A6 stored "GST (Sales tax) (02)" with no rate ("Element '{…}Tax':
Missing child element(s). Expected is ( {…}TaxAmount )."); deleting the
entry, or choosing a country, or "VAT" with "Zero-rated (Z)", let the
same book complete. A market dated "abc" as "YYYYMMDD" exported with
`<Date>abc</Date>`; one on the arrival format "YYYYMMDD (H)" with
`DateFormat` 20.

<a id="fn-o"></a>
**o** — Read from the code only, since the tool's file is never written
(Rule 18): `MonographONIX30XmlFilter` (note k) writes the header from
`createHeaderNode()` and, per product, identification codes and a DOI,
`DescriptiveDetail` (composition, form, measurements, license, series
`Collection`, title, contributors with roles and verified ORCID iDs,
language, extents, keywords as a `Subject`), `CollateralDetail`
(abstract, cover), `PublishingDetail` (imprint, publisher, funders,
city, publishing dates), `RelatedMaterial`. The Native XML file, which
strips the header, contributors, abstract, cover and series (note l),
showed on 2026-09-28 a product's `ProductIdentifier` (15, the ISBN-13;
a `PKID` one for a format without codes), `PublishingDate`,
`ProductComposition`, `CountryOfManufacture`, title, `Language` "eng",
the keywords as one `Subject` (scheme 20), `Publisher` and
`CityOfPublication`.

<a id="fn-m"></a>
**m** — OMP `plugins/importexport/native/filter/NativeXmlPublicationFormatFilter.php`:
sets the submission's `audience` from `AudienceCodeType`, the qualifier,
and the range through `_extractAudienceRangeContent()`; per
`SalesRights` element reads `ROWSalesRightsType` from inside that
element (the export writes it beside the elements, under
`PublishingDetail`), so every imported entry takes `SalesRightsType`,
`ROWSetting` false and the territory lists, `WORLD` included; per
`ProductSupply` builds a market (territory, `Date`, `MarketDateRole`,
`DateFormat`) and a `PublisherRepresentative` agent and a supplier,
reusing an existing representative of the book with the same role, name
and URL (for a supplier, as the drive showed, the same role, name,
phone and email address). The import itself: *Import & export*.
Live-probed 2026-09-28 (Rule 25; A11, A18, A19): note td24.

<a id="fn-td24"></a>
**td24** — Live-probed 2026-09-28 (Rule 25; A9, A11, A18, A19), three
runs, the td23 files imported on a second filled press as its manager
(Tools › "Native XML Plugin" › "Import", "The import completed
successfully."). Audiences came back as exported ("Children (02)" with
its qualifier and range; "(exact)" "Tenth Grade (10)" without the
"(from)" the file left out; no audience where none was saved; "Teenage
(03)"). Sales rights and markets came back as the file carried them:
"Paperback" "(02)" without "United Kingdom (GB)", "Ebook" entries
without "Germany (DE)", "World (WORLD)", "France (FR)", "Italy (IT)"
and "Scotland (GB-SCT)", and the tax-inclusive market without its
"Zero-rated (Z)". The "Rest of World?" entry listed no tick, and its
"Edit" showed the box unticked, no country and "World (WORLD)" as its
one included region; a new "Rest of World?" entry then saved on the
imported format, and the re-export carried no `ROWSalesRightsType`
until it did. "Alpha Agency", named by two markets, came back once; a
second "Alpha Agency" with another website came back as a separate
agent. Suppliers: "Gamma Distribution" came back with no website,
"Sigma Supply" (exported without one) with the exporting press's page
for the book, and every market exported without a supplier named a new
supplier, the exporting press's "Press Publisher Name" as "Publisher to
end-customers (09)" with its contact email and home page, listed on
"Representatives" even of a book that had none; two suppliers alike
but for the phone came back as two. No representative ID type or value
and no agent phone or email came back. Every imported format's
"Metadata" tab showed "Available (20)" and "Yes, returnable, full
copies only (Y)" (one exported as "In stock (21)" and "No, not
returnable (N)"), and the re-export carried `ProductAvailability` 20
and no `ReturnsConditions`.

<a id="fn-n"></a>
**n** — The handlers' `NotificationManager::createTrivialNotification()`
calls are the notices; none of the three grids, `AudienceForm` or the
export writes a `SubmissionLog` entry, sends a mailable or creates a
task. Live-probed 2026-09-28: note td25.

<a id="fn-td25"></a>
**td25** — Live-probed 2026-09-28 (Side effects), two runs. Before and
after an add, an unchanged "Edit" › "OK" and a delete on each of
"Representatives", "Sales Rights" and "Market Territories" and a "Save"
on "Audience": the book's Activity Log held the same 13 lines, the
header "Tasks" counts stayed (8 for the manager, 2 for the author), and
the mail catcher held nothing new for the manager, the author or the
contact address; `email_log`, `event_log`, `edit_tasks` and the press's
notifications kept their counts, with the job queue drained.

<a id="fn-s"></a>
**s** — Scenario seeding. Scenarios 1 to 8 run on scratch presses from
`POST scenarios/context` with a throwaway `manager` (the Press manager)
and a throwaway `author` (the books' submitter), passwords the username
twice. Scenarios 3, 4 and 5 read the lists' notices ("Sales Rights
added.", "Market added.", "Market edited.", "Sales Rights removed."),
and the press keeps a notice for its user only until any page that user
opens fetches it, so on the seeded press another test signed in as
`manager.maya` at the same time could take it first. Scenario 1 reads
the mail catcher, which can be scoped only by a recipient address that
belongs to the one scenario: the throwaway Author's.
Every book is a scratch submission from `POST scenarios/submission` with
its press's Author as `submitter`, `submitted: true` and `decisions:
['skipExternalReview', 'sendToProduction']` (Production); a published
book adds `published: true`. The trade data seeds through the keys
scenarios.md documents, built on the screens as `admin` before a
publish: the book's `audience` and `representatives[]`, and per entry of
`publicationFormats[]` its `identificationCodes[]`, `salesRights[]` and
`markets[]`. A sales-rights entry or a market names its territory with
`countriesIncluded`, `countriesExcluded`, `regionsIncluded` and
`regionsExcluded` directly on the entry, each a list of the labels the
window's lists show (`countriesIncluded: ['Canada (CA)']`); a market's
`agent` and `supplier` are the name of a `representatives[]` entry.
Scenario 1: no `audience`. Scenario 3: `[{name: 'Paperback'}]`.
Scenario 4: `representatives: [{type: 'agent', role: 'Exclusive sales
agent (05)', name: 'Agent Ada'}, {type: 'agent', role: 'Local publisher
(07)', name: 'Agent Bert'}, {type: 'supplier', role: 'Distributor to
end-customers (12)', name: 'Supplier Sam'}]` and "Paperback" with no
list. Scenario 5: published, `audience: {audience: 'Children (02)'}`,
Agent Ada and Supplier Sam as in scenario 4, and "Paperback" with
`salesRights: [{type: 'For sale with exclusive rights in the specified
countries or territories (01)', countriesIncluded: ['Canada (CA)']}]`
and `markets: [{date: '20260915', dateFormat: 'YYYYMMDD', price: '25',
agent: 'Agent Ada', supplier: 'Supplier Sam', countriesIncluded:
['Canada (CA)']}]`.
Scenario 2 adds a throwaway `marketing` account (the Marketing and
sales coordinator; the OMP roster has no such account), assigned to the
book through `participants[]` with `role: 'marketing'`; Supplier Sam as
in scenario 4 and "Paperback" with one market, `{date: '20260915',
price: '25', supplier: 'Supplier Sam', countriesIncluded: ['Canada
(CA)']}`. A supplier added on screen needs "Agent" clicked
before "Supplier" (scenarios.md, the representatives' parity fact), and
the refused delete's browser pop-up is accepted before the dialog's
"Cancel" (seed-facts.md). Scenarios 6 and 7 give the press
`context.country` and `context.acronym`, without which its "Masthead"
refuses "Save". Scenario 6 seeds none of the four ONIX keys; "Tidewater
Tales" is published, "Harbour Lights" `submitted: true` with no
decision. Scenarios 7 and 8 seed `publisher`, `location`, `codeType:
'Proprietary (01)'` and `codeValue` (scenario 7 `publisher: 'Tidewater
Press'`), on both presses of scenario 8, whose B holds no book; a
scratch press's principal contact is "Site Admin" <admin@mail.test>.
Scenario 7: the audience `{audience: 'General / adult (01)',
rangeQualifier: 'US school grade range (11)', rangeFrom: 'Kindergarten
(K)', rangeTo: 'Twelfth Grade (12)'}`; Agent Ada with `website`, Agent
Bert with the role 'Local publisher (07)', Supplier Sam with `phone`,
`email` and `website`, as the given names them; "Paperback" with
`identificationCodes: [{type: 'ISBN-13 (15)', value:
'978-951-98548-9-2'}]`, the "Rest of World?" entry `restOfWorld: true`
with no territory, the second entry of the type the window offers after
(01), and the market with `taxType: 'VAT (Value-added tax) (01)'` and
`taxRate: 'Zero-rated (Z)'`; "Ebook" with its one market. Scenario 8
seeds the book of its given the same way. Every other market leaves
"Price Type", "Taxation Rate" and "Taxation Type" out: other tax
choices fail the Native XML export ([A17](#a17)).
Scenario 9 runs with ready accounts (passwords as `docs/process/users.md`
gives them: the username twice) as `manager.maya` on OJS and OPS
`publicknowledge` (Journal Manager, Preprint Server Manager), with a
scratch submission carrying `galleys: [{label: 'PDF', file:
'article.pdf'}]` on OJS, `preprint.pdf` on OPS (the seed creates none;
OPS needs no decision to reach Production), its control as
`manager.maya` on OMP `publicknowledge` with a book carrying `[{name:
'Paperback'}]`.
Scenario 1 reads the mail catcher only after the job queue has run, and
running the queue empties it for every test at once, so scenario 1 runs
in the serial project, after the others
(`tests/serial/U74-onix-metadata-export.spec.js`); a discussion the
scenario sends after the queue has run bounds the read.
Live-probed 2026-09-28: each of these states was seeded through these
keys. Test run 2026-09-29, OMP: scenarios 2 to 9 green in the parallel
project and scenario 1 in the serial one, each seeded as above.

<a id="fn-f-a1"></a>
**f-a1** — Notes i and j. Live-probed 2026-09-28 (A1), two runs, and
earlier that day during the format spec's check: every book and set of
books, validation ticked or not, answered "The process failed …
supports input classes.submission.Submission[] - array given" with no
download (note td20), while the Native XML export carried each
format's ONIX product. The cause is read from the code (note j): the
alias the declaration relied on went with omp `6f57d1d09`; the
stable-3_5_0 line still has it, and exports (walked 2026-10-03). An
install upgraded to `main` exports too: its migration rewrites the
stored type.
Issue report: [pkp-e2e#695](https://github.com/jardakotesovec/pkp-e2e/issues/695) ([docs/issues/U74-A1-onix-export-fails-every-book.md](../issues/U74-A1-onix-export-fails-every-book.md)).

<a id="fn-f-a2"></a>
**f-a2** — Note c: the menu offers the page with no role test, the form
loads for the assistant role, and the save route admits manager,
sub-editor and author only. Live-probed 2026-09-28 (A2), two runs: each
of the seven assigned assistant roles got 401 and the passing notice,
no window (note td3); the Layout Editor's and the Marketing and sales
coordinator's "Save" on "Publication Dates" did the same, while the
Press manager's saved.
Issue report: [pkp-e2e#705](https://github.com/jardakotesovec/pkp-e2e/issues/705) ([docs/issues/U74-A2-assistant-marketing-and-work-type-refused.md](../issues/U74-A2-assistant-marketing-and-work-type-refused.md)).

<a id="fn-f-a3"></a>
**f-a3** — Note d: no `FieldSelect` carries an empty option, and the
submission schema's `nullable` values can only be emptied by a request
the screens never send. Live-probed 2026-09-28 (A3), two runs: none of
the five lists offered an empty choice before or after a save (note
td6); in a Native XML file a book with no audience saved had no
`Audience`, and one with "Audience" alone no `AudienceRange`.

<a id="fn-f-a4"></a>
**f-a4** — Note g: `Market::getTerritoriesAsString()` joins the stored
codes; `MarketsGridCellProvider` concatenates price and currency code.
Live-probed 2026-09-28 (A4): note td8.
Issue report: [pkp-e2e#710](https://github.com/jardakotesovec/pkp-e2e/issues/710) ([docs/issues/U74-A4-market-list-shows-codes-price-run-together.md](../issues/U74-A4-market-list-shows-codes-price-run-together.md)).

<a id="fn-f-a5"></a>
**f-a5** — Note g: `MarketForm::fetch()` assigns `dateFormat` `20` on a
blank form under the comment "YYYYMMDD Onix code as a default"; in ONIX
list 55 code 20 is "YYYYMMDD (H)" and 00 is "YYYYMMDD". Added in omp
`5e0d3c7ff` (2012-01-29, "Add multiple Markets, Agents, more ONIX
fields"). Live-probed 2026-09-28 (A5), two runs: "Add Market" arrived
on "YYYYMMDD (H)" (option value 20); a market saved with "20240305" on
it reached the Native XML file as `MarketDate` with `DateFormat` 20, and
with "YYYYMMDD" chosen as `DateFormat` 00. The format window's
"Publication Dates" › "Add publication date" also arrived on
"YYYYMMDD (H)".
Issue report: [pkp-e2e#700](https://github.com/jardakotesovec/pkp-e2e/issues/700) ([docs/issues/U74-A5-new-market-and-date-preselect-hijri-calendar.md](../issues/U74-A5-new-market-and-date-preselect-hijri-calendar.md)).

<a id="fn-f-a6"></a>
**f-a6** — Note g: `MarketForm::fetch()` assigns `taxTypeCode` `02`
when the stored code is empty, on an edit only; `execute()` then saves
the posted list. Present since omp `75d161dc1` (2012-01-20).
Live-probed 2026-09-28 (A6), two runs: notes td10 and td23; a book
whose market had its tax type empty exported, and after a plain "Edit"
› "OK" (stored tax type empty before, 02 after) its export failed on
`Tax`.
Issue report: [pkp-e2e#697](https://github.com/jardakotesovec/pkp-e2e/issues/697) ([docs/issues/U74-A6-market-edit-fills-in-gst-tax-type.md](../issues/U74-A6-market-edit-fills-in-gst-tax-type.md)).

<a id="fn-f-a7"></a>
**f-a7** — Notes f and k: `SalesRightsForm` has no territory check, the
market form none either, and the filter appends the sales-rights
`Territory` element whatever it holds, which the schema then refuses;
the market's empty `Territory` is left out, which leaves `Market`
without its required child. Live-probed 2026-09-28 (A7), three runs:
notes td15, td16 and td23; the same book exported before the empty
entry was added and after it was deleted.
Issue report: [pkp-e2e#701](https://github.com/jardakotesovec/pkp-e2e/issues/701) ([docs/issues/U74-A7-A8-sales-rights-market-values-fail-native-export.md](../issues/U74-A7-A8-sales-rights-market-values-fail-native-export.md)).

<a id="fn-f-a8"></a>
**f-a8** — Notes g and l: `MarketForm` checks presence only, though its
date message promises a format check; ONIX types `PriceAmount` as a
decimal, so the Native XML file fails its schema check with a non-number,
as it does for the page counts of *Publication formats & proof terms*,
its A17, while `Date` is plain text to the schema. Live-probed
2026-09-28 (A8), two runs: notes td16, td22 and td23.
Issue report: [pkp-e2e#701](https://github.com/jardakotesovec/pkp-e2e/issues/701) ([docs/issues/U74-A7-A8-sales-rights-market-values-fail-native-export.md](../issues/U74-A7-A8-sales-rights-market-values-fail-native-export.md)).

<a id="fn-f-a9"></a>
**f-a9** — Note k: ONIX 3.0 has `AudienceCodeType` from list 29 ("01"
ONIX audience codes, "02" Proprietary, "03" MPAA rating) and
`AudienceCodeValue` from the list the type names (list 28 for "01");
the filter writes the list-28 code as the type and "01" as the value.
Present since omp `47eeca316` (2012-01-11, "further ONIX export plugin
enhancements"); the Native XML import reads `AudienceCodeType` back
into `audience` (note m). Live-probed 2026-09-28 (A9), two runs:
"Children (02)" gave `02/01`, "General / adult (01)" `01/01`, "Teenage
(03)" `03/01`; the import read "Children (02)" back and the re-export
wrote `02/01` again.
Issue report: [pkp-e2e#706](https://github.com/jardakotesovec/pkp-e2e/issues/706) ([docs/issues/U74-A9-onix-audience-code-type-value-swapped.md](../issues/U74-A9-onix-audience-code-type-value-swapped.md)).

<a id="fn-f-a10"></a>
**f-a10** — Notes e and k: `RepresentativeForm` stores
`representativeIdType`, `representativeIdValue`, `phone` and `email`
for both types; `MonographONIX30XmlFilter` writes a supplier's phone and
email but reads none of the others. ONIX 3.0 offers `AgentIdentifier`
and `SupplierIdentifier` (list 92) and agent telephone and email
elements. Live-probed 2026-09-28 (A10), two runs: the window asked for
the five fields for an agent and a supplier alike, and no file carried
them (note td23).

<a id="fn-f-a11"></a>
**f-a11** — Notes k and m: the export writes `ROWSalesRightsType` under
`PublishingDetail`, the import looks for it inside each `SalesRights`
element. Live-probed 2026-09-28 (A11), three runs: note td24.
Issue report: [pkp-e2e#713](https://github.com/jardakotesovec/pkp-e2e/issues/713) ([docs/issues/U74-A11-native-import-unticks-rest-of-world.md](../issues/U74-A11-native-import-unticks-rest-of-world.md)).

<a id="fn-f-a12"></a>
**f-a12** — Note e. Live-probed 2026-09-28 (A12), two runs: note td12;
the scenario tooling's own check of the window saw the same.
Issue report: [pkp-e2e#716](https://github.com/jardakotesovec/pkp-e2e/issues/716) ([docs/issues/U74-A12-representative-window-refuses-supplier.md](../issues/U74-A12-representative-window-refuses-supplier.md)).

<a id="fn-f-a13"></a>
**f-a13** — Note e. Live-probed 2026-09-28 (A13), four runs: note td12.
Issue report: [pkp-e2e#717](https://github.com/jardakotesovec/pkp-e2e/issues/717) ([docs/issues/U74-A13-representative-type-change-listed-twice.md](../issues/U74-A13-representative-type-change-listed-twice.md)).

<a id="fn-f-a14"></a>
**f-a14** — Note e: the refused delete answers 200 with
`{"status":false,…}` (`manager.representative.inUse`). Live-probed
2026-09-28 (A14), two runs, agent and supplier alike: note td13.
Issue report: [pkp-e2e#511](https://github.com/jardakotesovec/pkp-e2e/issues/511) ([docs/issues/U62-A9-refused-confirmation-window-keeps-spinning.md](../issues/U62-A9-refused-confirmation-window-keeps-spinning.md)).

<a id="fn-f-a15"></a>
**f-a15** — Notes f and g: the refused "OK" answers 200 with the form
again and no field message; the form's error then surfaces as a
notice on the next page load or request. `grid.catalogEntry.priceRequired`
is a key no locale file defines. Live-probed 2026-09-28 (A15), two
runs: notes td15 and td16.
Issue report: [pkp-e2e#367](https://github.com/jardakotesovec/pkp-e2e/issues/367) ([docs/issues/U09-A11-static-page-refusal-repeated-after-save.md](../issues/U09-A11-static-page-refusal-repeated-after-save.md)).

<a id="fn-f-a16"></a>
**f-a16** — Note j. Live-probed 2026-09-28 (A16), two runs: note td21;
the server answered 500 to both requests, and nothing else in those
runs did.
Issue report: [pkp-e2e#258](https://github.com/jardakotesovec/pkp-e2e/issues/258) ([docs/issues/U63-A12-native-export-nothing-ticked-empty-tab.md](../issues/U63-A12-native-export-nothing-ticked-empty-tab.md)).

<a id="fn-f-a17"></a>
**f-a17** — Note k: the tax statement carries `TaxRatePercent` only for
`Z` and never a `TaxAmount`. Live-probed 2026-09-28 (A17), two runs:
note td23; "VAT (Value-added tax) (01)" with "Zero-rated (Z)" exported
`Tax{TaxType=01; TaxRateCode=Z; TaxRatePercent=0; TaxableAmount=25}`,
"GST (Sales tax) (02)" with "RRP including tax (02)" exported no `Tax`,
all three lists empty exported, and "Standard rate (S)" failed.
Issue report: [pkp-e2e#696](https://github.com/jardakotesovec/pkp-e2e/issues/696) ([docs/issues/U74-A17-market-tax-rate-fails-native-export.md](../issues/U74-A17-market-tax-rate-fails-native-export.md)).

<a id="fn-f-a18"></a>
**f-a18** — Notes k and m: the filter writes `ReturnsConditions` only
from a stored returnable code and `ProductAvailability` 20 when none is
stored; the import reads neither back. The tab's preselected choices
are *Publication formats & proof terms*' screen. Live-probed 2026-09-28
(A18), two runs: notes td23 and td24.
Issue report: [pkp-e2e#715](https://github.com/jardakotesovec/pkp-e2e/issues/715) ([docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md](../issues/U74-A18-unsaved-format-states-no-returns-condition.md)).
Issue report: [pkp-e2e#712](https://github.com/jardakotesovec/pkp-e2e/issues/712) ([docs/issues/U74-A18-native-import-resets-returns-and-availability.md](../issues/U74-A18-native-import-resets-returns-and-availability.md)).

<a id="fn-f-a19"></a>
**f-a19** — Notes k and m: an export without a supplier writes the
press itself as the `Supplier` (role 09, note k), which the import then
creates like any supplier. Live-probed 2026-09-28 (A19), two runs: note
td24; "Gamma Distribution", exported with its own website (18) and the
book's page (29), came back with no website; "Sigma Supply", exported
with the book's page alone, came back with it. The re-export on the
importing press named the exporting press's name, email and home page
as the supplier.
Issue report: [pkp-e2e#714](https://github.com/jardakotesovec/pkp-e2e/issues/714) ([docs/issues/U74-A19-native-import-adds-press-as-supplier.md](../issues/U74-A19-native-import-adds-press-as-supplier.md)).
Issue report: [pkp-e2e#711](https://github.com/jardakotesovec/pkp-e2e/issues/711) ([docs/issues/U74-A19-native-import-changes-supplier-websites.md](../issues/U74-A19-native-import-changes-supplier-websites.md)).

<a id="fn-f-a20"></a>
**f-a20** — Note e. After a save the table fetches the new row
(`representatives-grid/fetch-row?rowId={id}&rowCategoryId={0|1}`).
lib/pkp `CategoryGridHandler::getRowDataElement()` looks the row id up
among the grid's own elements first, which on this grid are its two
categories, keyed 0 ("Agents") and 1 ("Suppliers"), and looks inside
the category only when that finds nothing. Representative id 1 thus
gets the "Suppliers" category's data, and
`RepresentativesGridRow::initialize()` calls `getId()` on that array.
Representative ids count across the install, so only its first
representative is hit. Live-probed 2026-10-03 (A20; Rule 5) on OMP
`main` and `stable-3_5_0`, the default test dataset (no
representatives) as `dbarnes`, in every first walk of that day's
representative and Native XML import walks: the first representative
added, agent or supplier, was stored (an agent, A12
report step 3, with "Representative added."); its row fetch answered 500 with
`Uncaught Error: Call to a member function getId() on array`; a reload
listed it; the next one (id 2) was listed without a reload. Upstream
pkp/pkp-lib#8968 (a new representative not listed, closed in 2023 with
a change to `CategoryGridHandler`) concerns the same page.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The side menu's "Marketing" group | the workflow's editorial view | AFFW-257 |
| "Marketing" › "Audience", "Representatives" ("Publication Dates" cited; *Chapters & work type*) | the group's items | AFFW-258 |
| The "Audience" page | `GET api/v1/submissions/{id}/publications/{publicationId}/_components/audience`, `PUT api/v1/submissions/{id}` | AFFW-431, AFFW-434 |
| The "Representatives" page (legacy grid in the Vue shell) | component `grid.catalogEntry.RepresentativesGridHandler` | AFFW-432, AFFW-574, VUE-045, GRID-093 |
| The representative window | the grid's `addRepresentative`, `editRepresentative`, `updateRepresentative`, `deleteRepresentative` | AFFW-762 |
| The "Sales Rights" list and window | a format's "Edit" › "Metadata"; component `grid.catalogEntry.SalesRightsGridHandler` | GRID-094, AFFW-763, AFFW-764 |
| The "Market Territories" list and window | a format's "Edit" › "Metadata"; component `grid.catalogEntry.MarketsGridHandler` | GRID-090, AFFW-760, AFFW-764 |
| Tools › "ONIX 3.0 Monograph Export Plugin" | `management/importexport/plugin/Onix30ExportPlugin` (ops `exportSubmissionsBounce`, `exportSubmissions`, `downloadExportFile`) | PLUG-033, AFFM-169 (the Tools list, AFFM-162, cited; *Import & export*) |
| The ONIX product in a Native XML file | Tools › "Native XML Plugin" › "Export" | (the tool is *Import & export*'s) |

## Reference — code anchors

- Marketing pages: ui-library
  `src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`,
  `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOMP.js`
  (`MarketingConfig`), `src/pages/workflow/components/publication/WorkflowMarketingForm.vue`,
  `src/managers/RepresentativeManager/RepresentativeManager.vue`,
  `src/pages/workflow/WorkflowPageOMP.vue`; OMP
  `classes/components/forms/submission/AudienceForm.php`,
  `api/v1/submissions/SubmissionController.php`, `schemas/submission.json`;
  lib/pkp `api/v1/submissions/PKPSubmissionController.php`.
- Representatives: OMP `controllers/grid/catalogEntry/RepresentativesGridHandler.php`,
  `RepresentativesGridRow.php`, `RepresentativesGridCategoryRow.php`,
  `RepresentativesGridCellProvider.php`, `form/RepresentativeForm.php`,
  `templates/controllers/grid/catalogEntry/form/representativeForm.tpl`,
  `js/controllers/modals/catalogEntry/form/RepresentativeFormHandler.js`,
  `classes/monograph/Representative.php`, `RepresentativeDAO.php`.
- Sales rights and markets: OMP `controllers/grid/catalogEntry/SalesRightsGridHandler.php`,
  `SalesRightsGridRow.php`, `SalesRightsGridCellProvider.php`,
  `form/SalesRightsForm.php`, `MarketsGridHandler.php`, `MarketsGridRow.php`,
  `MarketsGridCellProvider.php`, `form/MarketForm.php`,
  `templates/controllers/grid/catalogEntry/form/salesRightsForm.tpl`,
  `marketForm.tpl`, `countriesAndRegions.tpl`,
  `templates/controllers/tab/catalogEntry/form/publicationMetadataFormFields.tpl`,
  `classes/publicationFormat/SalesRights.php`, `SalesRightsDAO.php`,
  `Market.php`, `MarketDAO.php`, `PublicationFormat.php`;
  `classes/publication/Repository.php` (`version()`),
  `classes/services/PublicationFormatService.php` (`deleteFormat()`).
- Code lists: OMP `classes/codelist/ONIXCodelistItemDAO.php`,
  `ONIXParserDOMHandler.php`, `locale/en/ONIX_BookProduct_Codelists.xml`;
  lib/pkp `xml/onixFilter.xsl`.
- The export: OMP `plugins/importexport/onix30/Onix30ExportPlugin.php`,
  `Onix30ExportDeployment.php`, `filter/filterConfig.xml`,
  `filter/MonographONIX30XmlFilter.php`, `templates/index.tpl`; lib/pkp
  `classes/plugins/ImportExportPlugin.php`,
  `classes/plugins/importexport/PKPImportExportDeployment.php`,
  `plugins/importexport/native/filter/NativeExportFilter.php`,
  `classes/filter/Filter.php`, `TypeDescription.php`,
  `ClassTypeDescription.php`,
  `templates/plugins/importexport/resultsExport.tpl`, `innerResults.tpl`.
- The Native XML carriage: OMP
  `plugins/importexport/native/filter/PublicationFormatNativeXmlFilter.php`,
  `NativeXmlPublicationFormatFilter.php`, `onixProduct2NativeXml.xsl`.
