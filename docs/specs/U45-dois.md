---
name: dois
status: verified
---

# DOIs

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A DOI (Digital Object Identifier, such as `10.1234/a7kx3m52`) is the
persistent address a journal gives what it publishes, so that citations
keep resolving through `https://doi.org/` wherever the work moves. The
Journal Manager decides which kinds of item carry a DOI, gives the
journal's DOI prefix (the "10.…" part a registration agency such as
Crossref or DataCite hands out), and chooses when DOIs are made and in
what format. The DOIs page then lists the journal's items with their
DOIs and their registration status: a manager assigns missing DOIs,
types or corrects one by hand, marks what was registered elsewhere, and,
with a registration agency configured, exports or deposits the DOIs'
metadata with that agency and follows each deposit to "Registered" or
"Error". Readers see an item's DOI as a link on its page. An **item**
below is anything that can carry a DOI: on a journal an article (one
version of it), a galley, an issue and a peer review; on a press a
monograph version, a chapter, a publication format and a file of a
publication format; on a preprint server a preprint version and a
galley. A **kind** is one of the boxes under "Items with DOIs"
(Fields). <sup>a</sup>

Issues and peer-review DOIs exist on a journal only, chapter and
publication-format DOIs on a press only (Rules 45–54). The
registration agencies come as plugins: a journal installs the "Crossref
Manager Plugin" and the "DataCite Manager Plugin", a preprint server the
"Crossref Manager Plugin", and a press none. Every agency plugin is
disabled on a new journal and preprint server, the seeded ones included,
so the "Registration" tab reads "No Registration Agency Enabled" until a
manager enables one on Settings › Website › "Plugins" (Rule 34). On a
press DOIs are made and tracked but never exported or deposited from the
install. <sup>a</sup> <sup>q1</sup>

## Actors & permissions

**Manager-level roles** are those that open the Settings pages when
their row allows it, as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them (on a journal the Journal Manager, the Editor and the
Production Editor; on a preprint server the Preprint Server Manager).
The Site Administrator holds a manager role in every journal of the test
installs. **DOIs are on** below means the "DOIs" box of Settings ›
Distribution › "DOIs" › "Setup" is ticked with at least one kind ticked
(Rule 1). <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Change the DOI settings** (Settings › Distribution › "DOIs", side tabs "Setup" and "Registration") | • whoever opens the Settings pages ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)); nobody else <sup>b</sup> |
| **Open the DOIs page** (side menu "DOIs") | • manager-level roles of the journal and the Site Administrator, while DOIs are on; a manager-level role whose "Permit changes to Settings" is unticked opens it too<br>• Section Editor, assistant-level roles, Author, Reviewer, Reader: no "DOIs" entry; the page's address answers the access-denied page<br>• while DOIs are off, every signed-in user who types the address gets the access-denied page reading "You cannot call this operation without DOIs enabled."<br>• signed out: the Login page <sup>b</sup> <sup>q2</sup> |
| **Assign, type, clear, mark, export and deposit DOIs** | • whoever opens the DOIs page: every control on it is theirs; which controls show depends on the settings (Rules 14–30) <sup>b</sup> |
| **See an item's DOI** | • any visitor who may open the item's public page (Rule 43) <sup>w</sup> |
| **See the Crossmark button** {OJS} | • any visitor on a journal's article page, while Rule 42 holds <sup>t</sup> |
| **See "Cited by" and the citing articles** {OJS} | • any visitor on a journal's article page, while Rule 42a holds <sup>z</sup> |

## Fields & validation

**Settings › Distribution › "DOIs" › "Setup"** (the tab "DOIs", side tab
"Setup"). One form with "Save" at its foot. A refused save shows its
messages under the boxes and in the form's footer, and a successful one
"Saved" beside the button, as every Settings form does
([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Fields). While the "DOIs" box is unticked, every field below it is
hidden, except the "Custom DOI Suffix Pattern" group while "Custom
pattern" is the chosen format: its help and boxes stay on screen (on a
journal also "Peer Review" with "Custom pattern not supported"), before
and after a save and a reload. An unsaved change (a box ticked, a value
typed) is kept while moving to the "Registration" side tab or another
top tab and back, and is lost without a warning when the page is left,
as on every Settings form
([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Rule 5). <sup>c</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **DOIs** | No | One box: "Allow Digital Object Identifiers (DOIs) to be assigned to work published in this journal." (a press "…to work published by this press.", a preprint server "…to assigned to works published on this server." ⚠ [OPS1](#ops1)). Ticked on a new journal (Rule 2). <sup>c</sup> <sup>y</sup> |
| **Items with DOIs** | No | Help: "Select which items will be assigned a DOI. Most journals assign DOIs to articles, but you may wish to assign DOIs to all of the published items." (a press and a preprint server word it for their own items). Boxes: journal "Articles", "Issues", "Article galleys, such as a published PDF", "Peer Review"; press "Monographs", "Chapters", "Publication Formats", "Files"; preprint server "Preprints", "Preprint galleys, such as a published PDF". The first box is ticked on a new journal, the others not. While a registration agency is chosen, only the kinds that agency accepts are listed (Rule 35). Effect: Rule 4. <sup>c</sup> |
| **DOI Prefix** | Yes, while "DOIs" is ticked | Help: "The DOI Prefix is assigned by a registration agency, such as Crossref or DataCite. Example: 10.xxxx" (both names are links). Empty on a new journal. "10." followed by four to seven digits and nothing else ("10.1234", "10.1234567"); anything else ("10.123", "11.1234", "10.1234/") is refused under the box with "This is not formatted correctly.". Empty while "DOIs" is ticked, it is refused with "A DOI prefix is required" (Rule 3). <sup>c</sup> <sup>q3</sup> |
| **Automatic DOI Assignment** | Yes, one choice | Help: "When should a submission be assigned a DOI?". A list: "Upon reaching the copyediting stage" (a preprint server "Upon reaching the production stage"), "Upon publication", "Never". The first is selected on a new journal. Effect: Rule 5. <sup>c</sup> |
| **DOI Format** | Yes, one choice | Help: "Select the format to use when the application generates a DOI." Radios: "Default - Automatically generates a unique eight-character suffix" (selected on a new journal), "None - Suffixes must be entered manually on the DOI management page and will not be generated automatically" (the words "DOI management page" link to the DOIs page), "Custom pattern - (not recommended)". Effect: Rule 6. <sup>c</sup> |
| **Custom DOI Suffix Pattern** | Only with "Custom pattern" | A group shown only while "Custom pattern - (not recommended)" is selected. Its help opens "Enter a custom suffix pattern for each publication type." and lists the symbols the app offers (Rule 6c). One box per kind: journal "Submissions", "Article Galleys", "Issues", and under "Peer Review" the words "Custom pattern not supported" instead of a box; press "Submissions", "Chapters", "Publication Formats", "Files"; preprint server "Submissions", "Preprint Galleys". The box of a ticked kind left empty is refused with "A DOI suffix pattern is required." under that box; the box of an unticked kind may stay empty. After that refusal, unticking the kind leaves "Save" greyed out until something is typed in the flagged box (typing and then emptying it is enough); the save then passes. <sup>c</sup> <sup>q4</sup> |
| **DOI Versioning** | Yes, one choice | Help (journal): "Assign a new DOI to each publication version? Most users will want to use the default option (no), as it was until now."; a preprint server's help ends "…the default option (yes) to ensure preprint versions are correctly assigned DOIs." Radios: "Yes, assign a unique DOI to every version of an article." and "No, all versions of an article should have the same DOI." ("…of a monograph/chapter…", "…of a preprint…"). "No" on a new journal and press, "Yes" on a new preprint server. Effect: Rules 11, 12. <sup>c</sup> |

**Settings › Distribution › "DOIs" › "Registration"** (side tab
"Registration"). One form with "Save", saved and refused as the Setup
tab; an unsaved change (an agency picked, a box ticked, a value typed)
is kept across a move to "Setup" or another top tab and lost on leaving
the page, the same way. <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Registration Agency** | No | Help: "Please select the registration agency you would like to use when depositing DOIs." A list offering "None", then each enabled agency plugin's agency ("Crossref", "DataCite"). On a new journal, and after "None" is saved and the page reloaded, the list shows an empty box (no choice). Shown only while at least one agency plugin is enabled; otherwise the tab reads "No Registration Agency Enabled" and "DOIs can be automatically minted and deposited with a registration agency. To use this feature, locate and install a plugin from the appropriate registration agency." and holds no field but "Save", which answers "Saved" and changes nothing ⚠ [A21](#a21) (a press always, Purpose). Choosing an agency shows its block below (the next tables) without saving (Rule 35). <sup>d</sup> <sup>e</sup> |
| **Automatic Deposit** | No | Shown once an agency is chosen. One box, "Enable automatic depositing", under the help "The DOI registration and metadata can be automatically deposited with the selected registration agency whenever an item with a DOI is published. Automatic deposit will happen at scheduled intervals and each DOI's registration status can be monitored from the DOI management page." Unticked on a new journal (Rule 41). <sup>d</sup> <sup>e</sup> |

**The Crossref block** (Registration Agency "Crossref"), headed
"Crossref Settings". On a journal missing a publisher or an ISSN it
opens with the notice of Rule 37; then "The following items are
required for a successful Crossref deposit.". <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Depositor name** | Yes (starred) | Help: "Name of the organization registering the DOIs. It is included with deposited metadata and used to record who submitted the deposit." Empty, refused with "This field is required."; longer than 60 characters, refused with "This may not be greater than 60 characters." <sup>e</sup> <sup>q5</sup> |
| **Depositor email** | Yes (starred) | Help: "Email address of the individual responsible for registering content with Crossref. It is included with the deposited metadata and used when sending the deposit confirmation email." Empty, refused with "This field is required."; not an email address, refused with "This is not a valid email address."; longer than 90 characters, refused. <sup>e</sup> |
| **Crossmark** {OJS} | No | One box: "Enable participation in Crossmark to allow readers to check the publication status of articles. Learn more." ("Learn more." links to Crossref's Crossmark documentation). Unticked on a new journal. Effect: Rule 42. A preprint server's block has no such box. <sup>e</sup> <sup>t</sup> |
| **Enable Cited-by** {OJS} | No | Below "Crossmark". One box: "Enable Crossref Cited-by to retrieve citations found in Crossref for an article." Unticked on a new journal. Saved ticked, it makes "Username" and "Password" required (their row). Effect: Rule 42a. A preprint server's block has no such box. <sup>z</sup> <sup>q38</sup> |
| **Update Policy DOI** {OJS} | Yes (starred) whenever shown | Help: "Journal's update policy DOI is required when a unique DOI is used for every version of an article." Shown while "DOI Versioning" is "Yes", and otherwise only while "Crossmark" is ticked (Rule 38). A value must read like a DOI ("10.1234/policy"); anything else is refused with "This is not formatted correctly.". <sup>e</sup> <sup>q6</sup> |
| **Username**, **Password** | No | Under a paragraph beginning "If you would like to use this plugin to register Digital Object Identifiers (DOIs) directly with Crossref, you will need to add your Crossref account credentials…" and ending "…but you cannot register your DOIs with Crossref from OJS." ("…from OPS." on a preprint server). "Username" help: "The Crossref username that will be used to authenticate your deposits. If you are using a personal account, please see the advice above." (a preprint server "…If you are using a personal account, see the advise above." ⚠ [OPS3](#ops3)). "Password" is a hidden-text box. Up to 120 and 50 characters. While "Enable Cited-by" is ticked {OJS}, an empty one is refused under its box with 'A username is required when the "Enable Cited-by" option is selected.' ('A password is required…'); the box itself stays ticked on the form. <sup>e</sup> <sup>z</sup> <sup>q38</sup> |
| **Testing** | No | One box: "Use the Crossref test API (testing environment) for the DOI deposit. Please do not forget to remove this option in production." Unticked on a new journal. <sup>e</sup> |

**The DataCite block** {OJS} (Registration Agency "DataCite"), headed
"DataCite Settings", opening with "Please configure the DataCite export
plugin before using it for the first time." and a paragraph on obtaining
DataCite access. <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Username (symbol)**, **Password** | No | Plain and hidden-text boxes, up to 50 characters each. <sup>f</sup> |
| **Testing** | No | One box: "Use the DataCite test system for DOI registration. Please do not forget to disable this for production." <sup>f</sup> |
| **Test Username**, **Test Password** | No | Up to 50 characters each. <sup>f</sup> |
| **Test DOI Prefix** | Only with "Testing" ticked | Empty while "Testing" is ticked, refused with "A test DOI prefix is required when using the test system for DOI registration." <sup>f</sup> <sup>q7</sup> |

<a id="dois-page"></a>
**The DOIs page** (side menu "DOIs"; heading "DOIs"). Tabs by kind
(Rule 14), each holding one list whose header carries the list's title,
a "Search" box, a "Bulk Actions" menu and, with an agency configured,
"Deposit All"; a "Filters" column beside the list; the items; and page
links under the list. <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Search** | — | Narrows the list to the phrase once Enter is pressed; typing alone changes nothing (Rule 21). A "Clear search phrase" button, shown once a phrase is set, empties it. <sup>o</sup> |
| **Bulk Actions** | — | A menu: "Select All" / "Select None", "Expand all" / "Collapse all", then "Take action on {count} selected item(s)." over the actions of Rule 24. <sup>p</sup> |
| **Deposit All** | — | A button, shown only with an agency configured (Rule 36). Rule 29. <sup>p</sup> |
| **Filters** | — | Headed "Filters", with a round button showing only a "?" icon beside the heading that opens the "DOI Statuses" window (Rule 22); a screen reader announces it as "button" with no name ⚠ [A8](#a8). Groups: "Status" ("Needs DOI", "DOI Assigned"); "Registration" ("Unregistered", "Submitted", "Registered", "Has Error", "Needs Sync"); "Publication Status", on a press ("Published", "Unpublished") and on a preprint server ("Posted", "Unpublished"); on a journal's "Articles" tab an "Issues" box that suggests an issue once its year ("2025") or its full name from the start ("Vol. 1 No. 1") is typed ("Vol" or "1" suggests nothing); choosing one keeps that issue's articles. <sup>o</sup> <sup>q8</sup> |
| **An item's row** | — | A tick box with no name for a screen reader [A8](#a8), the item's name as a link that opens its public page in a new tab (Rule 16), its number, a status badge (Rule 31) and an expand button. <sup>m</sup> |
| **An item's expanded view** | — | The version's name, a table "Type", "DOIs", "Status", "Actions" with one row per DOI the item carries (Rule 17), "Edit" / "Save" (Rule 18), and with an agency configured the agency panel (Rule 30). On a press, under the table, the note of Rule 47 while a chapter cannot carry a DOI. <sup>m</sup> <sup>q29</sup> |
| **A DOI box** | No | Greyed text until "Edit" is pressed. A DOI must begin with digits, a dot and more digits, then "/" (for example "10.1234/abc"), and may hold only letters, digits and `-._;()/`; it must be unused by any other item on the install (Rule 18). <sup>n</sup> <sup>q9</sup> |

## Rules & state

**Switching DOIs on**

1. **DOIs on or off.** While the "DOIs" box is ticked and at least one
   kind is ticked, managers' side menus carry "DOIs"
   ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
   its Rule 30 and Settings bullet 9) and the DOIs page opens. Unticking
   the box, or every kind, and saving takes the entry away, and the page's
   address then answers the access-denied page with "You cannot call this
   operation without DOIs enabled." (Actors). DOIs already given are kept
   (Rule 43). <sup>b</sup> <sup>c</sup>
2. **A new journal arrives on, without a prefix.** Every new journal,
   press and preprint server, the seeded ones included, starts with the
   "DOIs" box ticked, the first kind ticked and no prefix. Its DOIs page
   opens under the warning "DOIs cannot be assigned unless you provide
   your assigned DOI prefix. Add DOI prefix."; the link opens Settings ›
   Distribution › "DOIs". Without a prefix no DOI is made, automatically
   or by "Assign DOIs", which the page does not offer (Rule 25); a DOI
   typed by hand is still accepted (Rule 18). <sup>y</sup> <sup>g</sup> <sup>h</sup>
3. **The Setup tab cannot be saved on without a prefix.** Every "Save"
   with the "DOIs" box ticked and "DOI Prefix" empty is refused with "A
   DOI prefix is required" under the box, whatever else changed. So a new
   journal cannot save a Setup change with "DOIs" ticked before a prefix
   is typed, and a journal that unticked "DOIs" cannot tick it again
   without one, although it was created in that state ⚠ [A1](#a1).
   Unticking "DOIs" and saving stores the other fields as they stand: a
   "DOI Versioning" or "Automatic DOI Assignment" change refused a moment
   before is kept and shows when the box is ticked again. Unticking the
   box clears a shown prefix message at once. <sup>c</sup> <sup>q10</sup>
4. **What each kind gives a DOI.** Ticking a kind makes its items
   eligible (Rules 5–8) and adds their rows to the DOIs page (Rule 17);
   unticking it keeps the DOIs its items already have, but the page stops
   showing their rows and the page's actions leave them alone. <sup>c</sup> <sup>m</sup> <sup>q11</sup>

   | Box | Items | Listed on |
   |-----|-------|-----------|
   | "Articles" ("Monographs", "Preprints") | each version of the work | the "Articles" tab ("Monographs", "Preprints") |
   | "Article galleys, such as a published PDF" ("Preprint galleys…") {OJS OPS} | each galley of each version | the same tab, as rows of the work |
   | "Peer Review" {OJS} | each completed review shown publicly (Rule 7) | the "Articles" tab |
   | "Issues" {OJS} | each issue | the "Issues" tab |
   | "Files" {OMP} | each file of each publication format | the "Monographs" tab ⚠ [OMP1](#omp1) |
   | "Chapters" {OMP} | each chapter of each version that has its own page (Rule 47) | the "Monographs" tab, as rows of the book (Rule 45) <sup>q28</sup> |
   | "Publication Formats" {OMP} | each publication format of each version | the "Monographs" tab, as rows of the book (Rule 45) <sup>q28</sup> |

<a id="doi-creation"></a>
**Making DOIs**

5. **When DOIs are made by themselves.** A DOI is made only for a
   ticked kind, only while a prefix is set, and only for an item that has
   none yet. "Automatic DOI Assignment" decides the moment:
   <sup>h</sup> <sup>q12</sup>
   - **"Upon reaching the copyediting stage"** (journal, press): when a
     decision moves the submission into Copyediting or Production, its
     current version and that version's galleys get their DOIs (on a
     press, the files and, with their kinds ticked, the publication
     formats and the chapters, Rule 48 <sup>q30</sup>). On a preprint server the choice reads "Upon
     reaching the production stage" and acts at the preprint's final
     "Submit".
   - **"Upon publication"**: when the version is published (posted), or,
     on a journal, when the article is scheduled into a future issue.
   - Under either of the two, publishing a version also makes any DOI
     still missing, so a galley added after the stage move gets its DOI
     when the version is published
     ([Galleys](U46-galleys.md), Side effects).
   - **"Never"**: nothing is made by itself; "Assign DOIs" (Rule 25) or a
     DOI typed by hand (Rule 18) gives one.
6. **What a made DOI looks like.** The prefix, "/", then a suffix chosen
   by "DOI Format": <sup>h</sup>
   - **a. "Default"**: eight characters, lower-case letters and digits,
     the last two always digits ("10.1234/a7kx3m52"); a different one
     for every item.
   - **b. "None"**: nothing is meant to be made; DOIs are typed by hand
     on the DOIs page (Rule 18). Yet every automatic moment and "Assign
     DOIs" still gives the item the prefix and a bare "/"
     ("10.1234/") ⚠ [A2](#a2). <sup>q13</sup>
   - **c. "Custom pattern"**: the box of the item's kind, with its
     symbols replaced. A journal offers "%j" journal initials (Settings ›
     Journal › "Masthead" "Journal initials", lower case), "%v" issue
     volume, "%i" issue number, "%Y" issue year, "%a" article ID (the
     number the Dashboard lists it under), "%g" galley ID, "%f" file ID,
     "%p" page numbers and "%x" custom identifier (the item's Publisher
     ID, [Identifiers](U44-identifiers.md)); a press "%p" press initials,
     "%m" monograph ID, "%c" chapter ID, "%f" publication format ID, "%s"
     file ID and "%x"; a preprint server shows the two examples
     "%j.%a" (preprints) and "%j.%a.g%g" (galleys). An article whose
     pattern uses "%v", "%i" or "%Y" gets no DOI until it is assigned to
     an issue (Rule 25 for the message). Any other symbol with nothing to
     fill it stays in the DOI as typed, and "Assign DOIs" reports
     success: "%j.%p" on an article without "Pages" gives
     "10.1234/jpk.%p", "k2.%x" on an item without a Publisher ID gives
     "10.1234/k2.%x" ⚠ [A9](#a9). A peer review takes no pattern and is
     treated as under "None" [A2](#a2). <sup>q14</sup>
7. **Peer-review DOIs** {OJS}. With "Peer Review" ticked, a review gets a
   DOI at the version's automatic moment (Rule 5) or by "Assign DOIs"
   once the reviewer has submitted it and its "Public Visibility" box
   ("Publicly Show Reviewer Comments") is ticked
   ([Reviewer assignment & management](U27-reviewer-assignment-and-management.md),
   Fields; the journal default in
   [Review setup & review forms](U29-review-setup-and-review-forms.md),
   Rule 4). The DOIs page lists it as "Peer Review {number}" under the
   article's current version, the number being one the install gives
   the review request ("Peer Review 186"), not a count of the article's
   reviews. The row shows once the review counts as read: an editor
   pressed "Mark as Complete" on it, or a decision sent the "Notify
   Reviewers" email, after which the reviewer's row reads "Reviewer
   Thanked". The review's DOI is made at the automatic moment even
   before that. No reader page shows a review's DOI. <sup>j</sup> <sup>q15</sup>
8. **Issue DOIs** {OJS}. With "Issues" ticked, publishing an issue
   ("Publish Issue", [→ publishing an issue](U50-issues.md#publish-issue))
   gives it a DOI when it has none, whatever "Automatic DOI Assignment"
   says ⚠ [OJS1](#ojs1). Its scheduled articles are published at the
   same moment; they already carry their DOIs from an earlier moment of
   Rule 5 (the move to Copyediting, or the scheduling under "Upon
   publication"), and under "Never" they get none. The issue's DOI is
   otherwise given by "Assign DOIs" or by hand on the "Issues" tab. <sup>i</sup>
9. **A DOI is unique on the install.** A DOI typed by hand is refused
   when any item of any journal on the install already carries it
   (Rule 18). Made DOIs are not checked this way. <sup>n</sup>
10. **A version's DOI travels with it.** Making, typing or clearing a DOI
    changes it on every page that shows it (Rule 43), and in the records
    other features publish ([Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md),
    [OAI-PMH](U19-oai-pmh.md)). <sup>w</sup>

<a id="version-dois"></a>
**Versions**

11. **"DOI Versioning" "No": one DOI for every version.** A new version
    ("Create New Version",
    [Publish, schedule & versions](U49-publish-schedule-and-versions.md))
    starts with its source version's DOI, and its galleys with theirs.
    Changing the DOI on the DOIs page changes it for every version. A
    DOI given by "Assign DOIs" while a newer version is still
    unpublished goes to the published version only (the one the DOIs
    page shows, Rule 17): once the newer version is published, its page
    shows no DOI while the older version's page shows it ⚠ [A10](#a10).
    <sup>k</sup>
12. **"DOI Versioning" "Yes": a DOI per major version.** A new version
    made with "Major Revision" starts without a DOI, its galleys too, and
    gets its own by Rules 5 and 25 (on publication at the latest, unless
    "Never"). A version made with "Minor Revision" keeps its source's
    DOI, its galleys too: a family of versions whose names differ only
    after the dot ("Version of Record 2.0", "2.1") shares them. On a
    preprint server the minor version's galleys start without a DOI
    instead, read "Needs DOI" in the "View all" window and get new DOIs
    on publication ⚠ [OPS4](#ops4). Changing a DOI on the DOIs page then
    changes it for that family only; the others keep theirs.
    While any journal of the install is set to "Yes", every journal's
    OAI requests fail ([→ OAI-PMH, A22](U19-oai-pmh.md#a22)). <sup>k</sup> <sup>q16</sup>
13. **Switching versioning later.** A change of "DOI Versioning" affects
    versions made afterwards; versions made before keep what they have.
    <sup>k</sup>

<a id="doi-list"></a>
**The DOIs page**

14. **Tabs.** A journal's page has an "Articles" tab while "Articles",
    galleys or "Peer Review" is ticked, and an "Issues" tab while "Issues"
    is ticked; each opens with its own heading ("Articles", "Issues") and
    a list titled "Article DOIs" / "Issue DOIs". A press has one tab,
    "Monographs" ("Monograph DOIs"), and a preprint server one,
    "Preprints" ("Preprint DOIs"), while any kind is ticked. <sup>g</sup>
15. **Which works are listed.** On the "Articles" tab (journal) and
    "Monographs" tab (press): every submission at Copyediting or
    Production, and every one with a published version or already
    carrying a DOI; a submission still at Submission or Review with no DOI
    is not listed. On a preprint server every preprint is listed, an
    unfinished draft nobody has submitted included (badge "Unpublished",
    its row "Needs DOI") ⚠ [OPS5](#ops5). The "Issues" tab lists every
    issue, published or not. The most recently submitted work comes
    first. <sup>l</sup> <sup>q17</sup>
16. **An item's row.** A work's name reads "{contributors} — {title}" of
    its current version; an issue's is its name ("Vol. 1 No. 2 (2014)").
    The link opens the public page in a new tab. The number is the
    submission's ID (the issue's). The badge reads "Unpublished" while the
    work's current version (the issue) is not published, and otherwise the
    status of Rule 31. <sup>m</sup>
17. **An item's expanded view.** The name of the version shown: the
    current one, or, while a newer version is unpublished, the published
    one, whose DOIs the view then lists and "Assign DOIs" fills
    [A10](#a10). Then one row per DOI that version carries for the
    ticked kinds, in this
    order: the work ("Article", "Monograph", "Preprint"), each galley
    under its label, each peer review ("Peer Review {number}"); an issue
    has one row, "Issue"; a press's file rows read "{format name} / {file
    name}", and its chapter and format rows come between the work's and
    the files' (Rule 45) <sup>q27</sup>. Each row shows its DOI (empty while it has none), its status
    badge (Rule 31) and, while that status is "Error", a "View Error"
    link (Rule 33 [A18](#a18)). <sup>m</sup>
18. **Typing, changing and clearing a DOI by hand.** "Edit" makes the
    boxes of the expanded view editable and turns into "Save". On "Save",
    each changed box is stored on its own: a typed DOI on an item without
    one becomes its DOI; a changed one replaces it (Rules 11, 12 for
    versions); an emptied box removes the item's DOI and its row reads
    "Needs DOI" again (an unpublished work's list badge stays
    "Unpublished"). Success shows "DOI(s) successfully updated" at the
    top right. A DOI need not begin with the journal's own prefix
    ⚠ [A7](#a7). A value refused by the rules of the DOI box (Fields) or
    by Rule 9 is not stored: the notice "Some DOI(s) could not be
    updated" appears and the box returns to its old value, with no word
    of the reason ⚠ [A3](#a3). A "Save" with some boxes refused and
    others stored shows both "Some DOI(s) could not be updated" and
    "DOI(s) successfully updated". Unchanged boxes send nothing, and
    "Save" with no change just closes the editing. A box typed in and not
    saved stays in editing across a tab switch or a collapse of the row,
    and is lost without a question when the page is left. <sup>n</sup> <sup>q9</sup>
19. **A deposited item cannot be edited.** While the item's status is
    "Submitted" or "Registered", "Edit" is greyed out; "Mark DOIs
    Unregistered" (Rule 27) makes it editable again. <sup>m</sup>
20. **Other versions' DOIs.** With "DOI Versioning" "Yes" and more than
    one version, the expanded view reads "There are {count} versions."
    with a "View all" button; it opens the side window "DOIs for all
    versions", one block per version, headed "{version} ({date
    published})" or "{version} Unpublished" as a link to that version's
    page, each with the table of Rule 17. Only each family's newest
    version (Rule 12) gets a block, and {count} counts the blocks:
    with 1.0, 2.0 and 2.1 it reads "There are 2 versions.". One "Edit" at
    the foot of the window makes every block's boxes editable, and one
    "Save" stores them. <sup>m</sup> <sup>q16</sup>
21. **Search.** The phrase applies once Enter is pressed. Words match
    the works' titles and contributors' names. A phrase beginning with
    digits and a dot ("10.1234/a7k") is read as the start of a DOI, and
    what it finds differs by app ⚠ [A11](#a11): on a journal, the
    articles whose own DOI begins with it (a galley's DOI finds nothing);
    on a press, the books with a chapter, format or file DOI beginning
    with it, counting only the kinds ticked under "Items with DOIs"
    <sup>q33</sup> (the monograph's own DOI finds nothing); on a
    preprint server nothing,
    "10.1234/" included. A suffix without its prefix finds nothing.
    <sup>o</sup> <sup>q18</sup>
22. **Filters.** Choosing a filter narrows the list and marks it chosen;
    choosing it again, or its "Clear filter: {name}", lifts it. Within
    "Status" and within "Registration" one filter at a time applies.
    "Needs DOI" keeps items missing a DOI for at least one ticked kind
    (on a press the file DOIs never count, so a book missing only its
    file DOI is not listed [OMP1](#omp1); chapters and formats: Rule 51), "DOI Assigned" items
    carrying at least one. "Unregistered" keeps published items whose DOI
    reads "Unregistered"; the other "Registration" filters keep items
    with a DOI in that status. After "Unregistered" and then another
    "Registration" filter, that filter's "Clear filter: {name}" leaves no
    filter chosen, yet every unpublished work stays out of the list until
    the page is reloaded ⚠ [A12](#a12). The info button beside
    "Filters" opens the side window "DOI Statuses", a table "Status" /
    "Description" with one line per status (Rule 31) and "DOI Assigned:
    All items assigned a DOI.". <sup>o</sup> <sup>q8</sup>
23. **Paging.** Thirty items per page; page links appear under the list
    once there are more. <sup>g</sup>
24. **"Bulk Actions".** "Select All" ticks every item of the page shown
    ("Select None" unticks them); "Expand all" / "Collapse all" opens or
    closes them. Its actions, in this order: "Export DOIs" (agency
    configured, Rule 36), "Mark DOIs Registered", "Mark DOIs Unregistered",
    "Mark DOIs Needs Sync", "Assign DOIs" (prefix set, Rule 25), "Deposit
    DOIs" (agency configured, Rule 36). Each opens a window titled with
    its own name, holding its question ("You are about to …{count} item(s)… Are you
    sure…?"), a button of the same name and "Cancel". The action applies
    to the ticked items; afterwards the list reloads and nothing stays
    ticked. With nothing ticked, the window still opens ("…for 0
    item(s)…"); its button closes it and nothing else happens, with no
    message ⚠ [A13](#a13). The menu closes when its item opens the
    window, but stays open over the list after a held press on "Assign
    DOIs" whose window is answered at once ⚠ [A22](#a22).
    <sup>p</sup> <sup>q19</sup>
25. **"Assign DOIs".** Offered only while a prefix is set. For each
    ticked item it makes every missing DOI of the current version for the
    ticked kinds (an issue's own DOI on the "Issues" tab), in the format of
    Rule 6, published or not; items that already carry them are left
    alone. Success: "Items successfully assigned new DOIs". An item that
    cannot get one leaves a window "DOI Updates Failed", reading "Some
    DOI(s) could not be updated" over one line per failure, such as
    "Could not create a DOI for the following submission: {title}. The
    submission must be assigned to an issue before a DOI can be
    generated."; the others still get theirs. <sup>p</sup> <sup>h</sup>
26. **"Mark DOIs Registered".** Records every DOI of each ticked
    published item as registered by hand ("Registered", with no agency).
    When any ticked item is not published, nothing at all is marked and
    the window "DOI Updates Failed" lists, per unpublished item, "Failed
    to mark the DOI registered for {title}. The submission must be
    published before the status can be updated." ("…The issue must be
    published…" on the "Issues" tab). Success: "Items successfully marked
    registered". <sup>p</sup>
27. **"Mark DOIs Unregistered".** Sets every DOI of each ticked item,
    published or not, back to "Unregistered". Success: "Items
    successfully marked unregistered". <sup>p</sup>
28. **"Mark DOIs Needs Sync".** Its window reads "You are about to mark
    DOI metadata records for {count} item(s) as needing to be synced. The
    Needs Sync status can only be applied to previously submitted DOIs.
    Are you sure you want to mark these records as stale?" ("stale"
    appears nowhere else on the page ⚠ [A14](#a14)). It sets "Needs
    Sync" on each ticked published item whose DOI reads "Submitted" or
    "Registered"; when any ticked item is not such, nothing is marked and
    "DOI Updates Failed" lists "Failed to mark the DOI needs sync for
    {title}. The DOI cannot be marked needs sync because they have not
    yet been registered or submitted." Success: "Items successfully
    marked needs sync". <sup>p</sup>
29. **Export and deposit** (agency configured, Rule 36).
    <sup>p</sup> <sup>r</sup>
    - **"Export DOIs"** asks "You are about to export DOI metadata
      records for {count} item(s) for {agency}. Are you sure you want to
      export these records?". Confirmed, it is meant to download the
      ticked items' metadata in the agency's format (one file; a journal
      whose "Peer Review" kind the agency accepts gets a second file for
      the reviews) and show "Items successfully exported". The install
      checks that file against the agency's published format, which it
      fetches from the agency's site; an install that cannot reach that
      site downloads nothing and shows no message, as on the test
      installs [A13](#a13). Any ticked item without a published DOI (an
      unpublished work, a published work whose DOI was cleared, an
      unpublished issue) makes the whole action fail the same silent way,
      with nothing exported [A13](#a13). With DataCite, exporting a
      published issue fails on the server and shows nothing
      ⚠ [OJS2](#ojs2).
    - **"Deposit DOIs"** asks "You are about to send DOI metadata records
      for {count} item(s) to {agency}. Are you sure you want to deposit
      these records?". Confirmed, it sends the ticked published items to
      the agency in the background and sets their DOIs to "Submitted" at
      once ("Items successfully submitted for deposit"). A ticked
      published work that has no DOI gets the same notice, yet stays
      "Needs DOI" and nothing is sent ⚠ [A15](#a15). A ticked unpublished
      item makes the whole action fail: nothing is marked, the window
      closes and no message says why [A13](#a13).
    - **"Deposit All"** opens "Deposit all DOIs": "You are about to
      schedule all outstanding DOI metadata records to be deposited with
      {agency}. Only published items with a DOI will be deposited…",
      with "Deposit all DOIs" and "Cancel". It sends every published
      item whose DOI reads "Unregistered", "Error" or "Needs Sync" (on a
      journal the published issues too), sets those to "Submitted" and
      shows the same success notice. With nothing left to deposit it
      still shows "Items successfully submitted for deposit" and changes
      nothing.
30. **The agency panel.** With an agency configured, an item's expanded
    view ends with a box naming the agency, a sentence and buttons:
    <sup>m</sup> <sup>q20</sup>

    | The item | Sentence | Buttons |
    |----------|----------|---------|
    | not published | "This item cannot be deposited until it has been published." | none |
    | published, "Unregistered", "Needs Sync" or "Error" | "The metadata for this item has not been submitted to {agency}.", for a "Needs Sync" item too, although it was deposited or registered before ⚠ [A16](#a16) | "Deposit DOI(s)", which opens "Deposit DOIs" for this item alone; "View Error" too while "Error" (Rule 33) |
    | "Registered" through the agency | "The metadata for this item has been submitted to {agency}." | "View Record" once the agency's answer is stored (Rule 33 [A18](#a18)) |
    | "Registered" by "Mark DOIs Registered" | "This item has been manually registered with a registration agency." | none |

    A "Submitted" item reads "This item has been manually registered with
    a registration agency." at once after its deposit, after a reload,
    and still after the background deposit has run and failed
    ⚠ [A4](#a4). While the item is being edited the buttons are greyed
    out. <sup>q20</sup>

**Statuses and deposits**

31. **The statuses.** Each DOI has one; an item's badge shows its first
    row's status (Rule 17) while that row carries a DOI. The "DOI Statuses" window words them:

    | Badge | Meaning ("DOI Statuses") |
    |-------|---------------------------|
    | "Needs DOI" | "All items missing a DOI." (the row has no DOI) |
    | "Unregistered" | "All items with a DOI that have been published but not yet deposited with a registration agency." |
    | "Submitted" | "All items that have been submitted to a registration agency." |
    | "Registered" | "All items that have been registered with a registration agency or manually marked as registered." |
    | "Error" (the filter "Has Error") | "All items that have encountered an error in the registration process." |
    | "Needs Sync" | "All items that have been republished since they were last deposited with a registration agency. They need to be resubmitted to the registration agency to update their metadata records." |

    <sup>r</sup>
32. **Statuses that change by themselves.** A DOI starts "Unregistered".
    A deposit sets "Submitted" at once; the agency's answer to the
    background deposit then sets "Registered" or "Error" (Rule 33).
    Unpublishing a version whose DOIs read "Submitted" or "Registered", or
    publishing it or a newer version sharing them, turns them to "Needs
    Sync"; unpublished and published again, they stay "Needs Sync". With
    "DOI Versioning" "Yes", publishing a new minor version marks the DOI
    it shares "Needs Sync"; a new major version gets a DOI of its own
    ("Unregistered") and the earlier versions' DOIs keep their status
    ⚠ [A17](#a17). Unpublishing or publishing again an issue whose DOI
    reads "Submitted" or "Registered" turns it to "Needs Sync" {OJS}.
    <sup>r</sup> <sup>q21</sup>
33. **A deposit that fails.** When the agency answers a deposit with an
    error, the DOI reads "Error"; the row's "View Error" and the panel's
    "View Error" open the window "Registration Error Message": "The
    following error was returned by {agency} and contains details about
    the cause of the error:" over the agency's message. A deposit that
    cannot reach the agency never gets there: its background job fails,
    is tried twice more and is dropped, and the DOI stays "Submitted"
    with nothing on the DOIs page to show it ⚠ [A18](#a18). The test
    installs reach no agency, so every deposit there stays "Submitted".
    <sup>r</sup> <sup>q22</sup>

<a id="agencies"></a>
**Registration agencies**

34. **Which agencies an install offers.** The Registration Agency list
    offers an agency while its plugin is enabled on Settings › Website ›
    "Plugins" › "Generic Plugins": "Crossref Manager Plugin" (journal,
    preprint server), "DataCite Manager Plugin" (journal). Disabling the
    chosen agency's plugin ("Are you sure you want to disable this
    plugin?") drops the choice: the list shows an empty box (with no
    agency plugin left, the tab reads "No Registration Agency Enabled"),
    and enabling the plugin again does not bring the choice back. The
    agency's saved fields and "Enable automatic depositing" stay stored
    and show filled when the agency is chosen again; the Setup tab lists
    every kind again, the ones the agency dropped (Rule 35) still
    unticked. <sup>d</sup> <sup>a</sup> <sup>q1</sup>
35. **Choosing an agency.** Picking an agency in the list shows its block
    at once; "Save" stores the choice, "Automatic Deposit" and the block's
    fields. Saving a new agency also unticks, without a word, any kind
    that agency does not accept ⚠ [A6](#a6), and from then on the Setup
    tab lists only the accepted kinds: <sup>d</sup>

    | Agency | Accepts |
    |--------|---------|
    | Crossref, journal | "Articles", "Issues", "Peer Review" |
    | DataCite, journal | "Articles", "Issues", "Article galleys, such as a published PDF" |
    | Crossref, preprint server | "Preprints" |

    When a kind the agency keeps comes after the dropped one (a journal
    with "Articles", "Article galleys, such as a published PDF" and "Peer
    Review" ticked choosing Crossref), every kind ends up unticked and the
    DOIs page fails to show its list ⚠ [A19](#a19). A block field refused
    after "Save" leaves the agency choice saved all the same
    ⚠ [A5](#a5). <sup>d</sup> <sup>q5</sup>
36. **When an agency counts as configured.** The DOIs page offers
    "Export DOIs", "Deposit DOIs", "Deposit All" and the agency panel only
    while the chosen agency is configured: <sup>s</sup>
    - **Crossref, journal**: "Depositor name" and "Depositor email" saved,
      a prefix set, and the journal's "Publisher" and an ISSN ("Online
      ISSN" or "Print ISSN") saved on Settings › Journal › "Masthead"
      ([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Fields).
    - **Crossref, preprint server**: the two depositor fields and a
      prefix. "Preprints" is then the only kind the Setup tab lists, and
      unticking it turns DOIs off (Rule 1).
    - **DataCite**: as soon as it is chosen and saved (the Setup tab
      keeps a prefix, and the block refuses "Testing" without a "Test DOI
      Prefix").
37. **Crossref's requirements notice** {OJS}. While the journal lacks a
    publisher or an ISSN, the Crossref block opens with a warning headed
    "Plugin requirements not met", listing "A journal publisher has not
    been configured! You must add a publisher institution on the Journal
    Settings Page." and "A journal ISSN has not been configured! You must
    add an ISSN on the Journal Settings Page." (each "Journal Settings
    Page" links to Settings › Journal). The notice does not stop "Save".
    <sup>e</sup>
38. **"Update Policy DOI"** {OJS}. Shown and required while "DOI
    Versioning" is "Yes"; with "No", shown and required only while
    "Crossmark" is ticked, and hidden (not required) otherwise. <sup>e</sup>
39. **Publish warnings from Crossref** {OJS}. While Crossref is the
    chosen agency, "Articles" is ticked and "Automatic DOI Assignment" is
    not "Upon publication", the publish window's warning list ("The
    following issues were found, but will not prevent publishing",
    [Publish, schedule & versions](U49-publish-schedule-and-versions.md),
    Rule 4) names what would stop a Crossref deposit: "Journal publisher
    must be provided before submissions can be deposited with Crossref.",
    "Either an online ISSN or print ISSN must be provided before
    submissions can be deposited with Crossref." (listed twice
    ⚠ [OJS3](#ojs3)), and 'The submission "{title}" is not associated
    with a DOI and cannot be deposited with Crossref.' when the version
    has no DOI. Publishing goes ahead.
    <sup>u</sup> <sup>q23</sup>
40. **Crossref's reference DOIs** {OJS}. With the Crossref plugin
    enabled, the journal's deposited references are matched to DOIs on an
    hourly schedule
    ([Citations & references](U42-citations-and-references.md), Side
    effects). <sup>d</sup>
41. **"Automatic Deposit".** Ticked, the box promises deposits "at
    scheduled intervals". A journal's install runs that deposit once a
    day. A preprint server offers the box, but its install schedules no
    deposit ⚠ [OPS2](#ops2). <sup>v</sup>

<a id="crossmark"></a>
42. **The Crossmark button** {OJS}. While the "Crossref Manager Plugin"
    is enabled, its "Crossmark" box is saved ticked, and the version shown
    carries its own DOI, the article's page shows the Crossmark button
    (the Crossmark logo, alt text "Crossmark") as the last block of its
    side column, followed only by "Cited by" when Rule 42a shows it; pressing it opens Crossref's Crossmark window for the
    DOI. Saving "None" as the Registration Agency does not remove the
    button; only disabling the plugin or unticking "Crossmark" does. The
    page is [Article landing page & reading](U13-article-landing-page-and-reading.md)'s.
    <sup>t</sup> <sup>q24</sup>

<a id="cited-by"></a>
42a. **Cited by** {OJS}. While Crossref is the saved Registration
    Agency, its "Enable Cited-by" box is saved ticked with a username and
    a password, and at least one published version of the article carries
    a DOI, the article's page shows a "Cited by" block in its side column
    as its last block (after "Section" and the Crossmark button), whichever version is
    shown: "This article has been cited **{n} times** according to
    Crossref" and the link-styled button "View citing articles". The
    count is Crossref's, for every DOI of the article's published
    versions, a citing work counted once; it reads "--" until Crossref
    has answered, and stays "--" when Crossref refuses or cannot be
    reached. The button opens a window titled "Articles that cite this
    article (Crossref)": "{n} citations", then one entry per citing work,
    its title in bold, its authors, a source line (journal or
    institution, year, "vol {v}({issue})", "no {issue}" without a volume,
    "p{first page}", the parts separated by a dot) and "doi.org/{DOI}" as
    a link opening in a new tab; "Copy Citation Details" puts one line per
    work on the clipboard (title, authors, source parts and
    `https://doi.org/{DOI}`, comma-separated) and reads "Copied" for two
    seconds; "Close" closes the window. The list is fetched once per
    page and kept for a day per article. The block is styled for the
    default theme and its child themes only; other themes get it
    unstyled. Unticking the box, or an article with no published DOI,
    leaves no block. The page is
    [Article landing page & reading](U13-article-landing-page-and-reading.md)'s.
    <sup>z</sup> <sup>q38</sup>

<a id="doi-line"></a>
**What readers see**

43. **The "DOI:" line.** The page of an article, a preprint or a book
    shows the shown version's DOI as "https://doi.org/{DOI}", a link
    ([Article landing page & reading](U13-article-landing-page-and-reading.md),
    Fields). A version without a DOI of its own shows, with "DOI
    Versioning" "Yes", the DOI of another version of its family
    (Rule 12), and with "No", when it is an older version, the current
    version's DOI; otherwise no line. The line follows the stored DOI:
    it stays, on the page and in its head tags, after "DOIs" is unticked
    or the kind unticked. The journal's OAI records
    ([OAI-PMH](U19-oai-pmh.md)) carry no DOI while "DOIs" is unticked,
    and carry it again once it is ticked, whatever the kinds. A book's
    page also shows each publication format's DOI in that format's
    details ("DOI:" and the link) {OMP}; which chapter and format DOIs
    readers see is Rule 54. An issue's page shows its DOI
    the same way ([Issues](U50-issues.md), Fields). <sup>w</sup> <sup>q25</sup>

**Older entry points**

44. **The plugins' own pages.** Tools › "Import/Export" lists "Crossref
    XML Export Plugin" and, on a journal, "DataCite Export/Registration
    Plugin", whether or not the agency's manager plugin is enabled; their
    pages (also reached through "Import/Export Data" on the plugin's own
    row on Settings › Website › "Plugins") hold only the warning "DOI
    management has moved. Please see the DOI management and DOI settings
    pages.", whose two links open the DOIs page and Settings ›
    Distribution › "DOIs" › "Setup". The page's heading is empty and the
    browser tab reads only the journal's name ⚠ [A20](#a20). The DOIs
    page is where DOIs are exported and deposited. <sup>x</sup> <sup>q26</sup>

<a id="press-dois"></a>
**A press's chapters and publication formats** {OMP}

The chapters are those of the version's "Chapters" page
([Chapters & work type](U72-chapters-work-type.md)), the formats those
of its "Publication Formats" page
([Publication formats & proof terms](U73-publication-formats-proof-terms.md)).
The rules above hold for their DOIs as for any item; these add what
differs. <sup>z1</sup>

45. **Chapter and format rows.** In a book's expanded view (Rule 17)
    the rows come in this order: "Monograph"; with "Chapters" ticked,
    one row per chapter, named by the chapter's title, in the order of
    the version's chapter list; with "Publication Formats" ticked, one
    row per format, named "Format / {format name}" ("Format / PDF"), in
    the order of the "Publication Formats" page; then the file rows.
    Each row has its DOI box and status badge, and "Edit" / "Save"
    treat it as any row (Rule 18): a DOI typed into an empty chapter or
    format box becomes that chapter's or format's DOI. A DOI typed into
    an empty file row is stored too, but the save reports "Some DOI(s)
    could not be updated" and the box shows empty until the page is
    reloaded ⚠ [OMP2](#omp2). <sup>z2</sup> <sup>q27</sup>
46. **Either kind alone lists the books.** With "Chapters" or
    "Publication Formats" ticked and "Monographs" not, the "Monographs"
    tab lists the same books as Rule 15, each with only the ticked
    kinds' rows, unlike "Files" alone [OMP1](#omp1). The book's badge
    then reads its first row's status (Rule 31). <sup>z3</sup> <sup>q28</sup>
47. **A chapter needs its own page.** Only a chapter whose "Chapter
    Page" box is ticked, or that already has a DOI, can carry one
    ([Chapters & work type](U72-chapters-work-type.md), its Rule 10). A
    chapter without either keeps its row, but greyed, its badge reading
    "Needs DOI" ⚠ [OMP3](#omp3): after "Edit" its box cannot be typed
    in, and under the table the view reads
    "Chapters without a landing page cannot have a DOI.". No automatic
    moment and no "Assign DOIs" gives it a DOI, and "Assign DOIs" still
    reports "Items successfully assigned new DOIs" when that chapter is
    all the book lacks. <sup>z4</sup> <sup>q29</sup>
48. **When chapter and format DOIs are made.** At Rule 5's moments,
    with the kind ticked: <sup>z5</sup>
    - **"Upon reaching the copyediting stage"**: the decision that moves
      the book into Copyediting or Production gives its current
      version's formats, and its chapters that have their page, their
      DOIs. Publishing the version then gives a DOI to a chapter whose
      page was ticked after that decision, and to a format added after
      it. <sup>q30</sup>
    - **"Upon publication"**: publishing the version gives them. A
      chapter whose page is ticked after the version is published gets
      no DOI by itself. <sup>z12</sup>
    - Under any setting, "Assign DOIs" gives a DOI to every format and
      every chapter with its page still missing one, published or not
      (Rule 25). <sup>q30</sup>
49. **Custom suffix patterns.** Under "Custom pattern" a chapter's DOI
    follows the "Chapters" box and a format's the "Publication Formats"
    box, with Rule 6c's symbols: "%c" the chapter ID, "%f" the
    publication format ID, "%x" the chapter's or format's own Publisher
    ID. A symbol with nothing to fill it, such as "%c" in the
    "Publication Formats" box, stays in the DOI as typed [A9](#a9).
    Under "None" a chapter and a format get the prefix and a bare "/",
    as every item does [A2](#a2). <sup>z6</sup> <sup>q31</sup>
50. **Versions.** Chapters and formats follow the version rules as
    galleys do: under "DOI Versioning" "No" a new version's chapters
    and formats start with their source's DOIs, and a DOI changed on
    the DOIs page changes for every version (Rule 11); under "Yes" a
    "Major Revision" version's chapters and formats start without, and
    get their own by Rule 48; a "Minor Revision" version's keep their
    source's, and a change in the "DOIs for all versions" window changes
    that family only (Rules 12, 20). A chapter first added in a later
    version gets a DOI of its own. <sup>z7</sup> <sup>q32</sup>
51. **Filters on a press.** <sup>z8</sup> <sup>q33</sup>
    - "Needs DOI" keeps a book missing the DOI of a ticked kind: its own,
      a chapter that has its page, or a format. A chapter without its
      page never counts, nor does a file [OMP1](#omp1).
    - "DOI Assigned" keeps a book whose own, chapter or format DOI is
      set, for the ticked kinds.
    - The "Registration" filters keep a book whose own, chapter or format
      DOI reads that status, whether or not that kind is ticked; a file
      DOI never counts.
52. **Marks and statuses.** "Mark DOIs Registered", "Mark DOIs
    Unregistered" and "Mark DOIs Needs Sync" (Rules 26–28) set the
    DOIs of the ticked book's chapters and formats with its own, for
    the ticked kinds. Unpublishing a version whose chapter and format
    DOIs read "Registered" turns them "Needs Sync" with the book's, and
    they stay "Needs Sync" when it is published again; publishing a newer
    version that shares them does the same (Rule 32). <sup>z9</sup> <sup>q34</sup>
53. **Formats readers cannot get.** A format that is not available to
    readers, or not approved, gets its DOI at the same moments and keeps
    its row on the DOIs page; the book's page shows no DOI for it
    (Rule 54). <sup>z10</sup> <sup>q35</sup>
54. **What readers see of them.** <sup>z11</sup>
    - In the book's table of contents each chapter shows a DOI line
      ([Monograph landing page](U69-monograph-landing-page.md#book-page),
      its Rule 10): the chapter's own DOI, or, without one, the DOI the
      same chapter carries in another version of its family (Rule 12),
      whatever "DOI Versioning" says. <sup>q36</sup>
    - A chapter's own page shows its "DOI:" line
      ([Monograph landing page](U69-monograph-landing-page.md#chapter-page)):
      the chapter's own DOI; without one, under "DOI Versioning" "Yes",
      its family's (Rule 12). Under "No" an older version's chapter
      page is meant to show the current version's chapter DOI, but that
      page answers a server error
      ([→ Monograph landing page, A19](U69-monograph-landing-page.md#a19)).
      <sup>q36</sup>
    - A format's DOI shows in its details on the book's page (Rule 43)
      while the format is approved and available to readers. An
      available format that is not approved is still a download link
      there, but has no details and no DOI. A format's DOI has no
      fallback to another version's. <sup>q35</sup> <sup>q36</sup>
    - As Rule 43 says for a book, these lines follow the stored DOI:
      they stay after the kind is unticked. <sup>q36</sup>

## Side effects

- **Deposits leave the install.** "Deposit DOIs" and "Deposit All" send
  the items' metadata to the chosen agency's deposit service from
  background jobs, to its test service while "Testing" is ticked
  (Settings bullet 10); "Automatic Deposit" is Rule 41. What a deposit
  carries of the references is described under
  [Citations & references](U42-citations-and-references.md), Side
  effects. <sup>r</sup>
- **Downloads.** "Export DOIs" is meant to save the metadata file(s) to
  the manager's computer (Rule 29 [A13](#a13)). <sup>p</sup>
- **Statuses change on other features' actions**: publishing and
  unpublishing versions and issues (Rule 32). <sup>r</sup>
- **Activity Log, no mail.** No DOI action sends an email or a
  notification. <sup>r</sup> A DOI given to a work that had none adds
  one "Submission metadata updated" to the work's Activity Log, under
  the name of whoever acted: <sup>r</sup>
  - **"Assign DOIs", or a DOI typed by hand**: under the manager's
    name. For a press's file the line reads "The metadata for file
    "{file}" was edited by {username}." <sup>r</sup>
  - **A publish under "Upon publication"**: under the user who
    publishes, beside "The submission was published." ("…posted." on a
    preprint server). <sup>z13</sup>
  - **A decision under "Upon reaching the copyediting stage"** (journal,
    press): under the user who records the decision moving the work
    into Copyediting, beside the decision's line ("{name} skipped the
    review stage and sent this submission to the copyediting stage."
    for "Accept and Skip Review"). On a press a file's DOI made by the
    same decision adds the file's line as well. <sup>q37</sup>

  No line is added:
  - by a publish under "Never", with "DOIs" unticked, or of a work that
    already has its DOI; <sup>r</sup>
  - on a press, for a chapter's or a format's DOI, whether it is made,
    assigned, typed or cleared: a publish that makes them together with
    the book's own DOI adds only the book's line, and "Assign DOIs" on a
    book whose own DOI is already set adds none; <sup>q37</sup>
  - on a journal, for a galley's DOI typed or cleared <sup>q37</sup>;
    whether a journal's or a preprint server's galley given its DOI
    alone at a publish adds one is open ⚠ [A23](#a23);
  - on a journal and a press, for changing or clearing a DOI, and in
    every app for the three Mark actions. On a preprint server ("DOI
    Versioning" "Yes") every saved change or clearing of a DOI adds the
    line. <sup>r</sup>

  On a journal, "Review Publishing Details" › "Confirm" adds a line of
  its own, whatever the DOI settings
  ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
  Side effects). <sup>r</sup>
- **Head tags.** With the Crossmark button shown, the article page's
  head also carries the version's DOI for the Crossmark widget
  ([Search-engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)
  owns the head tags). <sup>t</sup>

## Settings that modify behavior

1. **"DOIs"** (Settings › Distribution › "DOIs" › "Setup"; ticked). Off:
   no "DOIs" side-menu entry, the DOIs page refused, nothing made
   (Rule 1). <sup>c</sup>

2. **"Items with DOIs"** (same tab; the first box ticked). Each box adds
   its items (Rule 4); none ticked works as off (Rule 1). "Issues"
   adds the "Issues" tab {OJS}; "Peer Review" the review rows {OJS};
   "Chapters" and "Publication Formats" the book's chapter and format
   rows {OMP} (Rules 45, 46). <sup>c</sup> <sup>q28</sup>

3. **"DOI Prefix"** (same tab; empty). Set: DOIs are made (Rules 5, 25)
   and "Assign DOIs" is offered; empty: the page's warning (Rule 2) and
   the Setup tab refuses to save (Rule 3). <sup>c</sup>

4. **"Automatic DOI Assignment"** (same tab; "Upon reaching the
   copyediting stage", "…production stage" on a preprint server). "Upon
   publication" and "Never" move or stop the automatic moment (Rule 5). <sup>h</sup>

5. **"DOI Format"** (same tab; "Default"). "None" and "Custom pattern"
   change what a made DOI looks like (Rule 6); "Custom pattern" shows the
   pattern boxes (Fields). <sup>h</sup>

6. **"DOI Versioning"** (same tab; "No" on a journal and press, "Yes" on
   a preprint server). The other end changes what a new version starts
   with (Rules 11, 12) and adds "View all" (Rule 20); "Yes" also shows
   Crossref's "Update Policy DOI" {OJS} (Rule 38). <sup>k</sup>

7. **"Registration Agency"** (Settings › Distribution › "DOIs" ›
   "Registration"; no choice, the list showing an empty box). An agency: its block, the kinds it accepts
   (Rule 35), and once configured the export and deposit controls
   (Rules 29, 30, 36). <sup>d</sup>

8. **"Automatic Deposit"** (same tab; unticked). Ticked: scheduled
   deposits (Rule 41). <sup>v</sup>

9. **"Crossmark"** {OJS} (the Crossref block; unticked). Ticked: the
   article page's Crossmark button (Rule 42) and "Update Policy DOI"
   (Rule 38). <sup>t</sup>

9a. **"Enable Cited-by"** {OJS} (the Crossref block; unticked). Ticked
   with the credentials: the article page's "Cited by" block (Rule 42a);
   "Username" and "Password" become required (Fields). <sup>z</sup>

10. **"Testing"** (the agency block; unticked). Ticked: deposits go to the
    agency's test service; for DataCite a "Test DOI Prefix" is required
    (Fields). <sup>e</sup> <sup>f</sup>

11. **"Crossref Manager Plugin"**, **"DataCite Manager Plugin"**
    (Settings › Website › "Plugins" › "Generic Plugins"; all disabled on
    a new journal and preprint server, the seeded ones included).
    Enabled: the agency is offered (Rule 34). *Plugins management* owns
    the list. <sup>a</sup>

12. **"Publicly Show Reviewer Comments"** {OJS} (a review's "Public
    Visibility" box, its default on Settings › Workflow › Review;
    unticked). Ticked: the review can carry a DOI (Rule 7).
    [Review setup & review forms](U29-review-setup-and-review-forms.md)
    owns the default. <sup>j</sup>

13. **Journal "Publisher" and ISSNs** {OJS} (Settings › Journal ›
    "Masthead"; empty). "Publisher" and either ISSN set: Crossref counts
    as configured (Rule 36) and its notice goes (Rule 37). <sup>s</sup>

14. **"Chapter Page"** {OMP} (a chapter's box in its "Add Chapter" /
    "Edit Chapter" window, "Show this chapter on its own page and link to
    that page from the book's table of contents.";
    [Chapters & work type](U72-chapters-work-type.md) owns it;
    unticked for a new chapter). Ticked: the chapter can carry a DOI;
    unticked, with no DOI yet, its row on the DOIs page is greyed and
    nothing gives it one (Rule 47). <sup>z4</sup>

## Cross-feature interactions

- **[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)**:
  the side menu's "DOIs" entry and its condition (Rule 1).
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  who opens Settings; the Distribution "DOIs" tab's place; the Masthead
  "Publisher" and ISSN that Crossref needs (Rule 36).
- **[Article landing page & reading](U13-article-landing-page-and-reading.md)**:
  the page that shows the "DOI:" line (Rule 43) and the Crossmark button
  (Rule 42); this spec owns which DOI shows and when the button shows.
- **[Issues](U50-issues.md#publish-issue)**: publishing an issue makes its
  DOI (Rule 8) and, for a DOI already submitted or registered, marks it
  "Needs Sync" (Rule 32); the issue page's "DOI:" line.
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  publishing makes DOIs (Rule 5) and changes statuses (Rule 32); new
  versions keep or lose DOIs (Rules 11, 12); the publish window's
  warning list carries Crossref's checks (Rule 39).
- **[Galleys](U46-galleys.md)**: galley DOIs made at publication (Rule 5).
- **[Identifiers](U44-identifiers.md)**: publisher IDs and URNs, a
  separate feature; the "%x" pattern symbol reads the Publisher ID
  (Rule 6c).
- **[OAI-PMH](U19-oai-pmh.md)** and **[Search-engine metadata &
  analytics](U20-search-engine-metadata-and-analytics.md)**: carry the
  DOI in their records and head tags (the OAI records drop it while
  "DOIs" is off, Rule 43); with "DOI Versioning" "Yes" the journal's OAI
  fails ([→ A22](U19-oai-pmh.md#a22)).
- **[Citations & references](U42-citations-and-references.md)**: what a
  deposit carries of the references, and the Crossref plugin's hourly
  reference-DOI matching (Rule 40).
- **[Submission activity log & notes](U38-submission-activity-log-and-notes.md)**:
  the Activity Log lines that "Assign DOIs", a typed DOI and a DOI made
  by itself add (Side effects).
- **[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)**
  and **[Review setup & review forms](U29-review-setup-and-review-forms.md)**:
  a review's "Public Visibility" and "Mark as Complete" (Rule 7).
- **[Chapters & work type](U72-chapters-work-type.md)**: the chapters
  and their "Chapter Page" box, which decides whether a chapter can carry
  a DOI (Rule 47); that spec keeps the box ticked once the chapter has a
  DOI.
- **[Publication formats & proof terms](U73-publication-formats-proof-terms.md)**:
  the formats whose DOIs Rules 45–53 describe, and their approval and
  availability to readers (Rules 53, 54).
- **[Monograph landing page](U69-monograph-landing-page.md)**: the book's
  table of contents, chapter pages and format details that show the
  chapter and format DOIs; this spec owns which DOI shows (Rule 54).
- [Plugins management](U62-plugins-management.md),
  [Import & export](U63-import-export.md): the plugin
  list that enables the agencies (Rule 34) and the Tools pages of
  Rule 44.

## Canonical scenarios

Scenario 1 only reads, on the seeded journal with ready accounts; every
other scenario runs on a scratch journal, press or preprint server with
throwaway accounts. <sup>sc</sup>

1. **Who opens the DOIs page, on a journal without a prefix**

   Given: the Journal Manager, the Editor, a Section Editor, an Author
   and a Reader, on the seeded journal as installed, with DOIs on, the
   first kind ticked and no prefix.

   - **The Journal Manager's DOIs page**: sign in as the Journal Manager
     and open the side menu's "DOIs": the page is headed "DOIs" and opens
     under the warning "DOIs cannot be assigned unless you provide your
     assigned DOI prefix. Add DOI prefix."; its "Bulk Actions" menu
     offers no "Assign DOIs" (Rules 2, 24).
   - **"Add DOI prefix"**: press the warning's link: it opens Settings ›
     Distribution › "DOIs", where the "DOIs" box is ticked, the first box
     under "Items with DOIs" ("Articles", "Monographs", "Preprints") is
     ticked and "DOI Prefix" is empty (Rule 2). Leave the tab without
     saving.
   - **The Editor** (journal, press): sign in as the Editor: the side
     menu carries "DOIs", and the page opens with its "Bulk Actions" menu
     and its "Filters" column (Actors row 2).
   - **Section Editor, Author, Reader**: sign in as each in turn: the
     side menu has no "DOIs", and the address the Journal Manager's
     "DOIs" opened answers the access-denied page, "The current role does
     not have access to this operation." (Actors row 2).
   - **Signed out**: the same address shows the Login page (Actors
     row 2).
   - **Control**: signed in as the Journal Manager again, the same
     address opens the DOIs page (Actors row 2). <sup>sc</sup>

2. **Save a DOI prefix**

   Given: a Journal Manager and an Editor whose role has "Permit changes
   to Settings" unticked (journal, press), on a scratch journal at the
   install defaults.

   - **The "Setup" tab as it arrives**: open Settings › Distribution ›
     "DOIs" (side tab "Setup"): the "DOIs" box is ticked and reads "Allow
     Digital Object Identifiers (DOIs) to be assigned to work published
     in this journal." ("…to work published by this press."; a preprint
     server's reads otherwise [OPS1](#ops1)); "Items with DOIs" lists
     "Articles", "Issues", "Article galleys, such as a published PDF" and
     "Peer Review" (press: "Monographs", "Chapters", "Publication
     Formats", "Files"; preprint server: "Preprints", "Preprint galleys,
     such as a published PDF"), the first ticked and the others not; "DOI
     Prefix" is empty; "Automatic DOI Assignment" shows "Upon reaching
     the copyediting stage" ("Upon reaching the production stage" on a
     preprint server) and also offers "Upon publication" and "Never";
     "DOI Format" has "Default - Automatically generates a unique
     eight-character suffix" selected; "DOI Versioning" has its "No"
     radio selected ("Yes" on a preprint server) (Fields).
   - **No prefix**: choose "Upon publication" in "Automatic DOI
     Assignment" and press "Save": "A DOI prefix is required" shows under
     "DOI Prefix" and nothing is saved (Rule 3; [A1](#a1)).
   - **A malformed prefix**: type "10.123" in "DOI Prefix" and press
     "Save": "This is not formatted correctly." shows under the box;
     replace it with "10.1234/" and press "Save": the same message
     (Fields).
   - **Saved**: replace it with "10.1234" and press "Save": "Saved"
     shows beside the button; reload: "DOI Prefix" holds "10.1234" and
     "Automatic DOI Assignment" "Upon publication" (Fields; Rule 3).
   - **The DOIs page**: open the side menu's "DOIs": the prefix warning
     is gone, and "Bulk Actions" offers "Assign DOIs" (Rules 2, 25).
   - **The Editor without Settings** (journal, press): sign in as the
     Editor: the side menu carries "DOIs", and the page opens with "Bulk
     Actions" and "Filters" (Actors row 2). A preprint server has no
     manager-level role but the Preprint Server Manager.
   - **Control**: before the prefix was saved, the DOIs page opened
     under the prefix warning and "Bulk Actions" offered no "Assign DOIs"
     (Rule 2). <sup>sc</sup>

3. **The list: rows, search and filters**

   Given: a Journal Manager, on a scratch journal with the prefix
   "10.1234" and "Automatic DOI Assignment" "Upon publication", holding
   "Axolotl limb memory" by Ada Lovelace, published (on a journal in the
   published issue Vol. 1 No. 1 (2025)), and "Tardigrade desiccation" and
   "Coral spawning" by Mary Anning, the first at Copyediting and the
   second at the Submission stage (on a preprint server both submitted
   and not posted).

   - **The page**: open the side menu's "DOIs": the page is headed
     "DOIs" and has one tab, "Articles" ("Monographs", "Preprints"), with
     no "Issues" tab; its list is titled "Article DOIs" ("Monograph DOIs",
     "Preprint DOIs"), its header carries "Search" and "Bulk Actions" and
     no "Deposit All", and a "Filters" column stands beside it (Fields,
     the DOIs page; Rule 14).
   - **Which works are listed**: the list holds "Axolotl limb memory" and
     "Tardigrade desiccation" and not "Coral spawning" (a preprint server
     lists all three) (Rule 15).
   - **A published work's row**: "Axolotl limb memory"'s row shows a tick
     box, "{contributors} — Axolotl limb memory" as a link that opens the
     article's public page in a new tab, the submission's number and the
     badge "Unregistered". Expand it: the version's name over a table
     "Type", "DOIs", "Status", "Actions", with one row, "Article"
     ("Monograph", "Preprint"), holding a DOI that begins "10.1234/" and
     reading "Unregistered", and "Edit" (Fields, an item's row and
     expanded view; Rules 16, 17, 31).
   - **An unpublished work's row**: "Tardigrade desiccation" reads
     "Unpublished"; expanded, its "Article" row is empty and reads "Needs
     DOI" (Rules 16, 17, 31).
   - **Search**: type "Axolotl" in "Search": the list does not change;
     press Enter: only "Axolotl limb memory" is listed, and a "Clear
     search phrase" button shows. Press it: the box empties and the other
     works are back. Type "Anning" and press Enter: only "Tardigrade
     desiccation" is listed (on a preprint server also "Coral spawning")
     (Fields, "Search"; Rule 21).
   - **"Status" filters**: press "Needs DOI": "Axolotl limb memory" leaves
     the list and the filter is marked chosen; press "DOI Assigned": it
     takes the place of "Needs DOI", and only "Axolotl limb memory" is
     listed; press "Clear filter: DOI Assigned": every work is back
     (Rule 22).
   - **"Registration" filters**: press "Unregistered": only "Axolotl limb
     memory" is listed; press "Unregistered" again: the other works are
     back (Rule 22).
   - **"Publication Status"** (press, preprint server): press
     "Unpublished": "Axolotl limb memory" leaves the list; press it again
     and press "Published" ("Posted"): only "Axolotl limb memory" is
     listed (Fields, "Filters").
   - **The "Issues" box** {OJS}: type "2025" in "Issues": it suggests
     "Vol. 1 No. 1 (2025)"; choose it: only "Axolotl limb memory" is
     listed (Fields, "Filters").
   - **Control**: on a journal and a press, "Coral spawning" was listed
     under no search and no filter (Rule 15). <sup>sc</sup>

4. **DOIs made at the move to Copyediting**

   Given: a Journal Manager, on a scratch journal with the prefix
   "10.1234" and the other DOI settings at the install defaults, holding
   "Tardigrade desiccation" at the Submission stage; on a press
   "Chapters", "Publication Formats" and "Files" are ticked too and the
   book carries two chapters, "Tides" with its "Chapter Page" ticked and
   "Harbours" without, and a publication format "PDF" with a file; on a
   preprint server "Tardigrade desiccation" is an Author's unfinished
   draft instead.

   - **The decision**: open "Tardigrade desiccation"'s workflow and
     record "Accept and Skip Review"
     ([Editorial decision recording](U34-editorial-decision-recording.md)):
     the submission moves to Copyediting. On a preprint server the Author
     finishes the draft with the wizard's final "Submit"
     ([Submission wizard](U21-submission-wizard.md)) (Rule 5).
   - **The made DOI**: open "DOIs": "Tardigrade desiccation" is listed
     with the badge "Unpublished"; expanded, its "Article" row
     ("Monograph", "Preprint") holds "10.1234/" followed by eight
     characters, lower-case letters and digits, the last two of them
     digits, and reads "Unregistered" (Rules 5, 6a, 15, 16, 32).
   - **A press's file** {OMP}: the book's expanded view also has a row
     "PDF / {file name}" holding a DOI of the same shape, different from
     the monograph's (Rules 4, 5, 6a, 17).
   - **The Activity Log** (journal, press): the work's Activity Log has
     gained "Submission metadata updated" under the name of the Journal
     Manager, who recorded the decision (Side effects).
   - **A press's chapters and format** {OMP}: the book's expanded view
     lists, in this order, "Monograph", "Tides", "Harbours", "Format /
     PDF" and "PDF / {file name}". "Tides" and "Format / PDF" each hold a
     DOI of the same shape and read "Unregistered". "Harbours" is greyed,
     has no DOI and reads "Needs DOI" [OMP3](#omp3), and under the table
     the view reads "Chapters without a landing page cannot have a
     DOI.". Press "Edit": "Harbours"' box cannot be typed in; press
     "Save": the editing closes (Rules 18, 45, 47, 48).
   - **A page ticked and a format added after the move** {OMP}: tick
     "Harbours"' "Chapter Page" in its "Edit Chapter" window on the
     book's "Chapters" page
     ([Chapters & work type](U72-chapters-work-type.md)) and save it, and
     add a publication format named "EPUB" on the book's "Publication
     Formats" page
     ([Publication formats & proof terms](U73-publication-formats-proof-terms.md)).
     On "DOIs" "Harbours" is no longer greyed, the note under the table
     is gone, and "Harbours" and "Format / EPUB" have no DOI and read
     "Needs DOI". Publish the book
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)):
     both now hold a DOI (Rules 47, 48).
   - **Control**: before the decision, the DOIs page did not list
     "Tardigrade desiccation" (journal, press) (Rule 15). <sup>sc</sup>

5. **DOIs made at publication, a galley's included**

   Given: a Journal Manager, on a scratch journal with the prefix
   "10.1234", "Automatic DOI Assignment" "Upon publication" and the
   galley box ticked ("Article galleys, such as a published PDF",
   "Preprint galleys, such as a published PDF"; a press ticks "Chapters"
   and "Publication Formats" instead), holding "Axolotl limb memory" and
   "Tardigrade desiccation" unpublished in Production, each with a galley
   "PDF" (journal, preprint server), on a press "Axolotl limb memory"
   carrying two chapters, "Tides" with its "Chapter Page" ticked and
   "Harbours" without, and two publication formats with a file each,
   "PDF" approved and available to readers and "EPUB" available but not
   approved, and on a journal a published issue Vol. 1 No. 1 (2025).

   - **Before publishing**: open "DOIs": both works read "Unpublished";
     expanded, "Axolotl limb memory"'s "Article" row is empty and reads
     "Needs DOI" (Rules 5, 17, 31).
   - **Published**: publish "Axolotl limb memory", on a journal into
     Vol. 1 No. 1 (2025), on a preprint server with "Post the preprint"
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)).
   - **The made DOIs**: back on "DOIs", its badge reads "Unregistered";
     expanded, the "Article" row and a "PDF" row (journal, preprint
     server) each hold "10.1234/" followed by eight characters, the two
     different, both "Unregistered" (Rules 5, 6a, 17, 31).
   - **The reader's page**: signed out, open the published article's
     page: it shows "DOI:" with "https://doi.org/{the "Article" row's
     DOI}" as a link (Rule 43; Actors row 4).
   - **The Activity Log**: "Axolotl limb memory"'s Activity Log has
     gained "Submission metadata updated" under the name of the Journal
     Manager, who published it; on a press it is the only such line, the
     chapters' and formats' DOIs adding none (Side effects).
   - **A galley's DOI by hand** {OJS}: expand "Axolotl limb memory",
     press "Edit", empty the "PDF" row's box and press "Save": the row
     reads "Needs DOI". Press "Edit", type "10.1234/e2e-g1" in the same
     box and press "Save": "DOI(s) successfully updated", and the row
     holds "10.1234/e2e-g1". Neither save adds a line to the Activity Log
     (Rule 18; Side effects).
   - **A press's chapters and formats** {OMP}: the book's expanded view
     has "Tides", "Harbours", "Format / PDF" and "Format / EPUB" rows.
     "Tides" and both format rows each hold "10.1234/" followed by eight
     characters and read "Unregistered"; "Harbours" is greyed and has no
     DOI (Rules 47, 48, 53).
   - **The book's page** {OMP}: signed out, open "Axolotl limb memory"'s
     page. In its table of contents "Tides" shows a DOI line with the
     DOI of its row on "DOIs". "PDF"'s details show "DOI:" with
     "https://doi.org/{the "Format / PDF" row's DOI}". "EPUB" is listed
     as a download link, with no details and no DOI. Press "Tides" in
     the table of contents: its own page shows its "DOI:" line with the
     same DOI (Rules 43, 53, 54).
   - **"Harbours" without its page** {OMP}: on "DOIs" press "Needs DOI":
     "Tardigrade desiccation" is listed and "Axolotl limb memory" is not;
     press "Needs DOI" again to lift it (Rule 51). Tick "Axolotl limb
     memory" and run "Assign DOIs": "Items successfully assigned new
     DOIs", and "Harbours" still has no DOI; the Activity Log gains no
     line (Rule 47; Side effects).
   - **"Harbours" given its page after the publish** {OMP}: tick its
     "Chapter Page" in its "Edit Chapter" window on the book's "Chapters"
     page ([Chapters & work type](U72-chapters-work-type.md)) and save
     it. Reload "DOIs": "Harbours" is no longer greyed and still has no
     DOI, and "Needs DOI" now lists "Axolotl limb memory" (Rules 48, 51).
     Run "Assign DOIs" on the book again: "Harbours" holds a DOI, and
     the Activity Log gains no line (Rule 48; Side effects).
   - **Control**: "Tardigrade desiccation", not published, still reads
     "Needs DOI" in its "Article" row (Rule 5). <sup>sc</sup>

6. **"Never", then "Assign DOIs"; DOIs switched off**

   Given: a Journal Manager, on a scratch journal with the prefix
   "10.1234" and "Automatic DOI Assignment" "Never", holding "Axolotl limb
   memory" and "Tardigrade desiccation", both published.

   - **Published without a DOI**: open "DOIs": both read "Needs DOI";
     signed out, "Axolotl limb memory"'s page shows no "DOI:" line
     (Rules 5, 43).
   - **"Assign DOIs"**: tick "Axolotl limb memory" and open "Bulk
     Actions": it reads "Take action on 1 selected item(s)."; choose
     "Assign DOIs": a window titled "Assign DOIs" asks about "1 item(s)",
     with the buttons "Assign DOIs" and "Cancel"; press "Assign DOIs":
     "Items successfully assigned new DOIs" shows, the list reloads with
     nothing ticked, and the work's "Article" row holds "10.1234/"
     followed by eight characters, "Unregistered" (Rules 6a, 24, 25).
   - **One already carrying a DOI**: tick both works and run "Assign
     DOIs" again: "Axolotl limb memory" keeps the same DOI and "Tardigrade
     desiccation" gets one of its own (Rule 25).
   - **The Activity Log**: "Axolotl limb memory"'s Activity Log has
     gained "Submission metadata updated" under the Journal Manager's
     name, and no email about the DOIs has reached the mail catcher (Side
     effects).
   - **The reader's page**: "Axolotl limb memory"'s page now shows "DOI:"
     with "https://doi.org/{its DOI}" (Rules 10, 43).
   - **DOIs switched off**: on Settings › Distribution › "DOIs" untick
     "DOIs" and press "Save": the side menu no longer carries "DOIs", and
     the DOIs page's address answers the access-denied page with "You
     cannot call this operation without DOIs enabled."; "Axolotl limb
     memory"'s page still shows its "DOI:" line (Rules 1, 43; Actors
     row 2).
   - **Every kind unticked**: tick "DOIs" again, untick every box under
     "Items with DOIs" and press "Save": the side menu has no "DOIs", and
     the address answers the same message (Rule 1; Settings bullet 2).
   - **Control**: before "DOIs" was unticked, the side menu carried
     "DOIs" and the page opened (Rule 1). <sup>sc</sup>

7. **Type, change and clear a DOI by hand**

   Given: a Journal Manager, on a scratch journal with the prefix
   "10.1234", "Automatic DOI Assignment" "Never" and "DOI Format" "None",
   holding "Axolotl limb memory" and "Tardigrade desiccation", both
   published without a DOI; on a press "Chapters" and "Publication
   Formats" are ticked too and "Axolotl limb memory" carries the chapter
   "Tides", its "Chapter Page" ticked, and a publication format "PDF".

   - **The "None" format**: on Settings › Distribution › "DOIs" "DOI
     Format" has "None - Suffixes must be entered manually on the DOI
     management page and will not be generated automatically" selected;
     its words "DOI management page" open the DOIs page (Fields; Rule 6b).
   - **A typed DOI**: expand "Axolotl limb memory": the "Article" row's
     DOI box is greyed; press "Edit": the box can be typed in and "Edit"
     reads "Save". Type "10.1234/e2e-a1" and press "Save": "DOI(s)
     successfully updated" shows at the top right, and the row holds
     "10.1234/e2e-a1" and reads "Unregistered" (Fields, a DOI box;
     Rules 18, 32).
   - **The other side**: the work's page shows "DOI:" with
     "https://doi.org/10.1234/e2e-a1", and its Activity Log gained
     "Submission metadata updated" (Rules 10, 43; Side effects).
   - **Refused values**: expand "Tardigrade desiccation", press "Edit",
     type "abc" and press "Save": "Some DOI(s) could not be updated"
     shows and the box is empty again [A3](#a3); do the same with
     "10.1234/a b", then with "10.1234/e2e-a1", the DOI "Axolotl limb
     memory" carries: each is refused the same way; the row still
     reads "Needs DOI" (Fields, a DOI box; Rules 9, 18).
   - **Changed**: on "Axolotl limb memory" press "Edit", replace the DOI
     with "10.1234/e2e-a2" and press "Save": "DOI(s) successfully
     updated"; the work's page now shows "https://doi.org/10.1234/e2e-a2"
     (Rules 10, 18). A preprint server's Activity Log gains another
     "Submission metadata updated"; a journal's and a press's gain none
     (Side effects).
   - **A chapter's and a format's DOI** {OMP}: on "Axolotl limb memory"
     press "Edit", type "10.1234/e2e-c1" in the "Tides" row and
     "10.1234/e2e-f1" in the "Format / PDF" row and press "Save": "DOI(s)
     successfully updated", and both rows hold their DOIs and read
     "Unregistered" (Rules 18, 32, 45). Press "Edit", replace "Tides"'
     DOI with "10.1234/e2e-c2", empty the "Format / PDF" box and press
     "Save": "Tides" holds "10.1234/e2e-c2" and "Format / PDF" reads
     "Needs DOI" (Rule 18). Press "Needs DOI": the list holds "Axolotl
     limb memory", its own and chapter DOIs set; press it again to
     lift it (Rule 51). The book's Activity Log gains no line from
     these saves (Side effects).
   - **Cleared**: press "Edit", empty "Axolotl limb memory"'s "Article"
     box and press "Save": the row reads "Needs DOI"; the work's own
     "DOI:" line goes, a chapter's stays (Rules 10, 18, 43, 54).
   - **Control**: on "Tardigrade desiccation" press "Edit", then "Save"
     with nothing changed: the editing closes (Rule 18). <sup>sc</sup>

8. **A custom suffix pattern**

   Given: a Journal Manager, on a scratch journal whose "Journal initials"
   are "JPK", with the prefix "10.1234" and "Automatic DOI Assignment"
   "Never", holding "Axolotl limb memory", published; on a journal also a
   published issue Vol. 1 No. 1 (2025), "Tardigrade desiccation"
   published in it, and "Coral spawning" in Production, assigned to no
   issue.

   - **The pattern group**: open Settings › Distribution › "DOIs" and
     choose "Custom pattern - (not recommended)": the group "Custom DOI
     Suffix Pattern" appears, its help opening "Enter a custom suffix
     pattern for each publication type.", with the boxes "Submissions",
     "Article Galleys" and "Issues" and, under "Peer Review", the words
     "Custom pattern not supported" (press: "Submissions", "Chapters",
     "Publication Formats", "Files"; preprint server: "Submissions",
     "Preprint Galleys") (Fields).
   - **An empty box refused**: press "Save" with the boxes empty: "A DOI
     suffix pattern is required." shows under "Submissions" (Fields).
   - **Saved**: type "%j.%a" in "Submissions" (a press "%p.%m") and press
     "Save": "Saved" (Fields).
   - **The made DOI**: on "DOIs" tick "Axolotl limb memory" and run
     "Assign DOIs": its "Article" row holds "10.1234/jpk.{its number}",
     its number being the one its row shows (Rules 6c, 16, 25).
   - **A pattern that needs an issue** {OJS}: replace the pattern with
     "%j.v%vi%i.%a" and press "Save"; tick "Tardigrade desiccation" and
     "Coral spawning" and run "Assign DOIs": a window "DOI Updates Failed"
     reads "Some DOI(s) could not be updated" over "Could not create a
     DOI for the following submission: Coral spawning. The submission must
     be assigned to an issue before a DOI can be generated.", and
     "Tardigrade desiccation" gets "10.1234/jpk.v1i1.{its number}"
     (Rules 6c, 25).
   - **Control**: before "Custom pattern" was chosen, the tab showed no
     "Custom DOI Suffix Pattern" group (Fields). <sup>sc</sup>

9. **Mark statuses by hand; "Needs Sync" after unpublishing**

   Given: a Journal Manager, on a scratch journal with the prefix
   "10.1234", holding "Axolotl limb memory", published with its DOI
   ("Unregistered"), and "Tardigrade desiccation" in Production,
   unpublished; on a press "Chapters" and "Publication Formats" are
   ticked too and "Axolotl limb memory" carries the chapter "Tides", its
   "Chapter Page" ticked, and a publication format "PDF", both with
   their DOIs.

   - **"Mark DOIs Registered" refused**: tick both, choose "Bulk Actions"
     › "Mark DOIs Registered" and press the window's "Mark DOIs
     Registered": a window "DOI Updates Failed" lists "Failed to mark the
     DOI registered for Tardigrade desiccation. The submission must be
     published before the status can be updated.", and "Axolotl limb
     memory" still reads "Unregistered" (Rule 26).
   - **Marked registered**: tick "Axolotl limb memory" alone and run
     "Mark DOIs Registered": "Items successfully marked registered"; its
     badge and its "Article" row read "Registered", and its "Edit" is
     greyed out (Rules 19, 26).
   - **Unpublished**: unpublish it
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
     Rule 9): on "DOIs" its badge reads "Unpublished" and its "Article"
     row "Needs Sync", and "Edit" can be pressed again (Rules 16, 19, 32).
   - **Published again**: publish it again: the row still reads "Needs
     Sync" (Rule 32).
   - **"Mark DOIs Unregistered"**: tick it and run "Mark DOIs
     Unregistered": "Items successfully marked unregistered"; the row
     reads "Unregistered" (Rule 27).
   - **"Mark DOIs Needs Sync" refused**: tick it and choose "Mark DOIs
     Needs Sync": the window reads "You are about to mark DOI metadata
     records for 1 item(s) as needing to be synced. The Needs Sync status
     can only be applied to previously submitted DOIs." [A14](#a14); press
     its "Mark DOIs Needs Sync": "DOI Updates Failed" lists "Failed to
     mark the DOI needs sync for Axolotl limb memory. The DOI cannot be
     marked needs sync because they have not yet been registered or
     submitted." (Rule 28).
   - **Marked "Needs Sync"**: run "Mark DOIs Registered" on it, then
     "Mark DOIs Needs Sync": "Items successfully marked needs sync"; the
     row reads "Needs Sync" (Rule 28).
   - **A press's chapter and format rows** {OMP}: after each step above,
     the book's "Tides" and "Format / PDF" rows read what its "Monograph"
     row reads: "Registered" after the first "Mark DOIs Registered",
     "Needs Sync" after the unpublish and after the publish again,
     "Unregistered" after "Mark DOIs Unregistered", and "Needs Sync" at
     the end (Rule 52).
   - **A newer version** {OMP}: run "Mark DOIs Registered" on "Axolotl
     limb memory" again, then on its workflow press "Create New Version"
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
     Rule 11; "DOI Versioning" is "No", as on every new press): on "DOIs" the
     book's "Monograph", "Tides" and "Format / PDF" rows still read
     "Registered". Publish the new version: all three read "Needs Sync"
     (Rules 32, 52).
   - **Control**: "Tardigrade desiccation" read "Unpublished" throughout
     (Rule 16). <sup>sc</sup>

10. **One DOI for every version ("DOI Versioning" "No")**

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234" and "DOI Versioning" "No" (a preprint server set to "No"),
    holding "Axolotl limb memory", published with its DOI; on a press
    "Chapters" and "Publication Formats" are ticked too and the book
    carries the chapter "Tides", its "Chapter Page" ticked, and a
    publication format "PDF", both with their DOIs.

    - **A new version**: on the work's workflow press "Create New
      Version"
      ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
      Rule 11): on "DOIs" the work's expanded view still shows the
      published version and its DOI (Rule 17).
    - **The new version published**: publish the new version: the
      article's page shows the same "DOI:" line as before (Rules 11, 43).
    - **Changed for every version**: on "DOIs" press "Edit", replace the
      DOI with "10.1234/e2e-v1" and press "Save": the article's page and
      the older version's page both show "https://doi.org/10.1234/e2e-v1"
      (Rules 11, 43).
    - **A press's chapter and format** {OMP}: the expanded view, now
      showing the new version, holds in its "Tides" and "Format / PDF"
      rows the same DOIs as before the new version (Rule 50). Press
      "Edit", replace "Tides"' DOI with "10.1234/e2e-c3" and press
      "Save": the table of contents on the book's page and on the older
      version's page both show "10.1234/e2e-c3" in "Tides"' DOI line
      (Rules 50, 54).
    - **Control**: before the change, the older version's page showed
      the first DOI (Rules 11, 43). <sup>sc</sup>

11. **A DOI per major version ("DOI Versioning" "Yes")**

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234" and "DOI Versioning" "Yes" (a preprint server's default),
    holding "Axolotl limb memory", published with its DOI as version 1.0;
    on a press "Chapters" and "Publication Formats" are ticked too and
    the book carries the chapter "Tides", its "Chapter Page" ticked, and
    a publication format "PDF", both with their DOIs.

    - **A major version**: on the work's workflow press "Create New
      Version" and choose "Major Revision"
      ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
      Rule 11): on "DOIs" the expanded view reads "There are 2 versions."
      with a "View all" button; press it: a side window "DOIs for all
      versions" holds a block headed "{version} ({date published})" for
      1.0, with its DOI, and one headed "{version} Unpublished" for the
      new version, whose "Article" row has no DOI (Rules 12, 20).
    - **The major version published**: close the window and publish the
      new version, 2.0: in "View all" its "Article" row now holds a DOI of
      its own, different from 1.0's; the article's page shows it, and
      1.0's page keeps 1.0's DOI (Rules 12, 43).
    - **A minor version**: press "Create New Version" and choose "Minor
      Revision": the expanded view still reads "There are 2 versions.";
      "View all" holds 1.0's block and the new minor version's, 2.1,
      "Unpublished", whose "Article" row holds 2.0's DOI (Rules 12, 20).
    - **One "Edit" for the window**: press "Edit" at the foot of the
      window, replace the DOI in 2.1's block with "10.1234/e2e-v2" and
      press "Save": 2.0's page shows "https://doi.org/10.1234/e2e-v2", and
      1.0's page keeps its own DOI (Rules 12, 20, 43).
    - **A press's chapter and format** {OMP}: in "View all" 2.0's block
      had "Tides" and "Format / PDF" rows without a DOI before 2.0 was
      published, and after its publish DOIs of their own, different from
      those rows in 1.0's block; 2.1's block holds the DOIs 2.0's block
      showed. Press "Edit" at the foot of the window, replace "Tides"'
      DOI in 2.1's block with "10.1234/e2e-c4" and press "Save": the
      table of contents on 2.0's page shows "10.1234/e2e-c4" in "Tides"'
      DOI line, and on 1.0's page "Tides" keeps 1.0's DOI (Rules 50, 54).
    - **Control**: before the major version, the expanded view had no
      "There are … versions." line and no "View all" (Rule 20).
      <sup>sc</sup>

12. **Choose a registration agency** {OJS OPS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234", "Articles" and "Article galleys, such as a published PDF"
    ticked ("Preprints" and "Preprint galleys, such as a published PDF"),
    no agency plugin enabled, on a journal its "Publisher" and "Online
    ISSN" saved on Settings › Journal › "Masthead", and "Axolotl limb
    memory" published with a galley "PDF", both carrying DOIs.

    - **No agency plugin**: open Settings › Distribution › "DOIs" ›
      "Registration": it reads "No Registration Agency Enabled" and "DOIs
      can be automatically minted and deposited with a registration
      agency. To use this feature, locate and install a plugin from the
      appropriate registration agency.", with no field but "Save"; press
      it: "Saved" [A21](#a21) (Fields; Settings bullet 11).
    - **The plugin enabled**: on Settings › Website › "Plugins" ›
      "Generic Plugins" tick "Crossref Manager Plugin" (*Plugins
      management*): the "Registration" tab now shows "Registration
      Agency" with an empty box, its list offering "None" and "Crossref"
      (Fields; Rule 34).
    - **Crossref chosen**: choose "Crossref": the block "Crossref
      Settings" shows at once, before any save, with "Depositor name" and
      "Depositor email", and "Enable automatic depositing" shows unticked.
      Type "Public Knowledge Project" in "Depositor name" and
      "doi@mail.test" in "Depositor email" and press "Save": "Saved"
      (Fields; Rule 35).
    - **The "Setup" tab**: "Items with DOIs" now lists only "Articles",
      "Issues" and "Peer Review" (a preprint server "Preprints"), with
      "Articles" ("Preprints") ticked; the galley box is gone [A6](#a6)
      (Rule 35).
    - **The DOIs page**: "Axolotl limb memory"'s expanded view no longer
      has the "PDF" row, and the list header carries "Deposit All"
      (Rules 4, 36).
    - **The plugin disabled**: on "Plugins" untick "Crossref Manager
      Plugin" and confirm "Are you sure you want to disable this
      plugin?": the "Registration" tab reads "No Registration Agency
      Enabled", and the DOIs page has no "Deposit All" (Rules 34, 36).
    - **The plugin enabled again**: tick it again: "Registration Agency"
      shows an empty box; choose "Crossref": "Depositor name" and
      "Depositor email" hold "Public Knowledge Project" and
      "doi@mail.test". The "Setup" tab lists every kind again, the galley
      box unticked (Rule 34).
    - **Control**: before Crossref was saved, the "Setup" tab listed the
      galley box ticked and the expanded view had the "PDF" row
      (Rules 4, 35). <sup>sc</sup>

13. **Deposit DOIs with Crossref** {OJS OPS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234" and Crossref chosen and configured (its depositor fields
    saved; on a journal its "Publisher" and "Online ISSN" saved), holding
    three published works carrying DOIs, "Axolotl limb memory",
    "Tardigrade desiccation" and "Coral spawning", all "Unregistered", and
    "Moss regrowth" in Production, unpublished.

    - **What the page offers**: open "DOIs": the list header carries
      "Deposit All", and "Bulk Actions" lists "Export DOIs", "Mark DOIs
      Registered", "Mark DOIs Unregistered", "Mark DOIs Needs Sync",
      "Assign DOIs" and "Deposit DOIs", in that order (Rules 24, 36).
    - **The agency panel**: expand "Moss regrowth": its view ends with a
      box naming "Crossref" and reading "This item cannot be deposited
      until it has been published.", with no button; expand "Axolotl limb
      memory": "The metadata for this item has not been submitted to
      Crossref.", with "Deposit DOI(s)" (Rule 30).
    - **Registered by hand**: run "Mark DOIs Registered" on "Tardigrade
      desiccation": its box reads "This item has been manually registered
      with a registration agency.", with no button (Rule 30).
    - **"Export DOIs" with an unpublished work**: tick "Axolotl limb
      memory" and "Moss regrowth" and choose "Export DOIs": the window
      asks "You are about to export DOI metadata records for 2 item(s)
      for Crossref. Are you sure you want to export these records?";
      press "Export DOIs": nothing downloads [A13](#a13) (Rule 29).
    - **"Deposit DOIs" with an unpublished work**: tick the same two and
      choose "Deposit DOIs": the window asks "You are about to send DOI
      metadata records for 2 item(s) to Crossref. Are you sure you want to
      deposit these records?"; press "Deposit DOIs": nothing is marked,
      and "Axolotl limb memory" still reads "Unregistered" [A13](#a13)
      (Rule 29).
    - **"Deposit DOIs"**: tick "Axolotl limb memory" alone and run
      "Deposit DOIs": "Items successfully submitted for deposit"; its
      badge and its "Article" row read "Submitted" at once, and its
      "Edit" is greyed out [A4](#a4) (Rules 19, 29, 32).
    - **"Deposit All"**: press "Deposit All": the window "Deposit all
      DOIs" reads "You are about to schedule all outstanding DOI metadata
      records to be deposited with Crossref. Only published items with a
      DOI will be deposited…", with "Deposit all DOIs" and "Cancel";
      press "Deposit all DOIs": "Items successfully submitted for
      deposit", and "Coral spawning" reads "Submitted" (Rule 29).
    - **No mail**: no email about the deposits has reached the mail
      catcher (Side effects).
    - **Control**: after "Deposit All", "Tardigrade desiccation" still
      reads "Registered" and "Moss regrowth" "Unpublished" (Rules 16,
      29). <sup>sc</sup>

14. **Crossref's requirements on a journal** {OJS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234", "Automatic DOI Assignment" "Never", Crossref chosen with
    its depositor fields saved, no "Publisher" and no ISSN, a published
    issue Vol. 1 No. 1 (2025), and "Axolotl limb memory" in Production
    without a DOI.

    - **The notice**: open the "Registration" tab: the Crossref block
      opens with a warning headed "Plugin requirements not met", listing
      "A journal publisher has not been configured! You must add a
      publisher institution on the Journal Settings Page." and "A journal
      ISSN has not been configured! You must add an ISSN on the Journal
      Settings Page."; press "Save": "Saved" (Rule 37).
    - **Not configured**: on "DOIs" the header has no "Deposit All",
      "Bulk Actions" offers neither "Export DOIs" nor "Deposit DOIs", and
      the work's expanded view has no agency box (Rule 36).
    - **The publish warnings**: on the work's workflow press "Schedule
      For Publication" and go on to its confirmation window
      ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
      Rule 4): under "The following issues were found, but will not
      prevent publishing" it lists "Journal publisher must be provided
      before submissions can be deposited with Crossref.", "Either an
      online ISSN or print ISSN must be provided before submissions can be
      deposited with Crossref." [OJS3](#ojs3) and 'The submission "Axolotl
      limb memory" is not associated with a DOI and cannot be deposited
      with Crossref.'. Close it without publishing (Rule 39).
    - **"Publisher" and an ISSN saved**: on Settings › Journal ›
      "Masthead" type "Public Knowledge Project" in "Publisher" and
      "1234-5679" in "Online ISSN" and press "Save": the Crossref block
      opens without the notice, and "DOIs" offers "Deposit All", "Export
      DOIs" and "Deposit DOIs" (Rules 36, 37; Settings bullet 13).
    - **With a DOI**: run "Assign DOIs" on the work and go on to the
      confirmation window again: the line 'The submission "Axolotl limb
      memory" is not associated with a DOI…' is gone; publish it into
      Vol. 1 No. 1 (2025): the work reads "Unregistered" on "DOIs"
      (Rules 16, 31, 39).
    - **Control**: before "Publisher" and "Online ISSN" were saved, the
      DOIs page offered no "Deposit All" (Rule 36). <sup>sc</sup>

15. **Crossmark and "Update Policy DOI"** {OJS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234", "DOI Versioning" "No" and Crossref chosen with its
    depositor fields saved, holding "Axolotl limb memory", published with
    its DOI.

    - **As it arrives**: on the "Registration" tab the Crossref block has
      "Crossmark" unticked, reading "Enable participation in Crossmark to
      allow readers to check the publication status of articles. Learn
      more.", and no "Update Policy DOI" (Fields; Rule 38).
    - **Versioning "Yes"**: on "Setup" choose "Yes, assign a unique DOI
      to every version of an article." and press "Save": the Crossref
      block now shows "Update Policy DOI", starred, with "Crossmark"
      unticked. Choose "No, all versions of an article should have the
      same DOI." and press "Save": the box is hidden again (Rule 38).
    - **Crossmark ticked**: tick "Crossmark": "Update Policy DOI" shows,
      starred. Type "policy" and press "Save": "This is not formatted
      correctly." shows under the box; replace it with "10.1234/policy"
      and press "Save": "Saved" (Fields; Rule 38).
    - **The article's page**: signed out, open "Axolotl limb memory": its
      side column ends with the Crossmark button, the Crossmark logo with
      the alt text "Crossmark" (Rule 42).
    - **"None" saved**: choose "None" as the Registration Agency and
      press "Save": the article's page still shows the button (Rule 42).
    - **The plugin disabled**: on Settings › Website › "Plugins" untick
      "Crossref Manager Plugin" and confirm: the article's page no longer
      shows the button (Rule 42).
    - **Control**: before "Crossmark" was saved ticked, the article's page
      had no Crossmark button (Rule 42). <sup>sc</sup>

16. **DataCite** {OJS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234" and "Articles" ticked, the "DataCite Manager Plugin" enabled
    and no agency chosen, holding "Axolotl limb memory", published with
    its DOI.

    - **DataCite chosen**: on the "Registration" tab choose "DataCite" in
      "Registration Agency": the block "DataCite Settings" opens with
      "Please configure the DataCite export plugin before using it for the
      first time." and holds "Username (symbol)", "Password", "Testing",
      "Test Username", "Test Password" and "Test DOI Prefix" (Fields, the
      DataCite block).
    - **"Testing" without a test prefix**: tick "Testing" and press
      "Save": "A test DOI prefix is required when using the test system
      for DOI registration." [A5](#a5); type "10.5072" in "Test DOI
      Prefix" and press "Save": "Saved" (Fields).
    - **The "Setup" tab**: "Items with DOIs" lists "Articles", "Issues"
      and "Article galleys, such as a published PDF", and no "Peer Review"
      (Rule 35).
    - **The DOIs page**: the header carries "Deposit All", "Bulk Actions"
      offers "Export DOIs" and "Deposit DOIs", and "Axolotl limb memory"'s
      expanded view ends with a box naming "DataCite" and reading "The
      metadata for this item has not been submitted to DataCite.", with
      "Deposit DOI(s)" (Rules 30, 36).
    - **"Deposit DOI(s)"**: press it: the window "Deposit DOIs" asks "You
      are about to send DOI metadata records for 1 item(s) to DataCite.
      Are you sure you want to deposit these records?"; press "Deposit
      DOIs": "Items successfully submitted for deposit", and the row reads
      "Submitted" (Rules 29, 30).
    - **Control**: before DataCite was saved, the DOIs page had no
      "Deposit All" (Rule 36). <sup>sc</sup>

17. **Peer-review DOIs** {OJS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234", "Articles" and "Peer Review" ticked, the other DOI
    settings at the install defaults, and "Publicly Show Reviewer
    Comments" ticked as the default on Settings › Workflow › Review,
    holding "Axolotl limb memory" and "Tardigrade desiccation" in
    Review, each with one review the reviewer has submitted.

    - **Accept with the reviewers notified**: on "Axolotl limb memory"
      record "Accept Submission", sending its "Notify Reviewers" email
      ([Editorial decision recording](U34-editorial-decision-recording.md)):
      the reviewer's row reads "Reviewer Thanked". On "DOIs" the work's
      expanded view has an "Article" row and, under the current version, a
      "Peer Review {number}" row, each with a DOI of its own beginning
      "10.1234/" and reading "Unregistered" (Rule 7).
    - **Accept without the email**: on "Tardigrade desiccation" record
      "Accept Submission" and skip its "Notify Reviewers" email: the
      work's expanded view has the "Article" row only (Rule 7).
    - **"Mark as Complete"**: open that review's "Read Review" and press
      "Mark as Complete"
      ([Reviewer assignment & management](U27-reviewer-assignment-and-management.md)):
      the expanded view now has a "Peer Review {number}" row with its DOI
      (Rule 7).
    - **Control**: before either decision, the DOIs page listed neither
      work (Rule 15). <sup>sc</sup>

18. **Issue DOIs, and an article scheduled under "Upon publication"** {OJS}

    Given: a Journal Manager, on a scratch journal with the prefix
    "10.1234", "Articles" and "Issues" ticked and "Automatic DOI
    Assignment" "Upon publication", holding an unpublished issue Vol. 1
    No. 2 (2026) and "Axolotl limb memory" in Production, assigned to no
    issue.

    - **The "Issues" tab**: open "DOIs": it has the tabs "Articles" and
      "Issues"; "Issues", headed "Issues" with the list "Issue DOIs",
      lists "Vol. 1 No. 2 (2026)" with the badge "Unpublished"; expanded,
      it has one row, "Issue", without a DOI (Rules 14, 15, 16, 17).
    - **Scheduled into the issue**: schedule "Axolotl limb memory" into
      Vol. 1 No. 2 (2026) without publishing it
      ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)):
      on "Articles" its "Article" row now holds a DOI, "Unregistered"
      (Rule 5).
    - **"Publish Issue"**: publish the issue
      ([→ publishing an issue](U50-issues.md#publish-issue)): on "Issues"
      its "Issue" row holds "10.1234/" followed by eight characters,
      "Unregistered"; on "Articles" the article keeps the DOI it had
      (Rules 6a, 8).
    - **The issue's page**: signed out, the issue's page shows "DOI:" with
      "https://doi.org/{the issue's DOI}" (Rule 43).
    - **Control**: before "Publish Issue", the issue's "Issue" row had no
      DOI (Rule 8). <sup>sc</sup>

19. **A press offers no registration agency** {OMP}

    Given: a Press Manager, on a scratch press with the prefix "10.1234",
    holding "Axolotl limb memory", published with its DOI.

    - **The Plugins list**: Settings › Website › "Plugins" › "Generic
      Plugins" lists neither "Crossref Manager Plugin" nor "DataCite
      Manager Plugin" (Purpose; Rule 34).
    - **The "Registration" tab**: it reads "No Registration Agency
      Enabled", with no field but "Save"; press it: "Saved" [A21](#a21)
      (Fields).
    - **The DOIs page**: the list header has no "Deposit All"; "Bulk
      Actions" offers "Mark DOIs Registered", "Mark DOIs Unregistered",
      "Mark DOIs Needs Sync" and "Assign DOIs", and neither "Export DOIs"
      nor "Deposit DOIs"; the book's expanded view ends without an agency
      box (Purpose; Rules 24, 36).
    - **Control**: run "Mark DOIs Registered" on the book: "Items
      successfully marked registered", and its row reads "Registered"
      (Rule 26). <sup>sc</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A19 (Rule 35; issue report
    `docs/issues/U45-A19-agency-choice-unticks-every-doi-kind.md`): a
    journal and a preprint server with the galley kind ticked before a
    kept kind choose Crossref and save; the Setup tab then shows the kept
    kinds ticked and the DOIs page lists its items {OJS OPS}
  - the guard for A18 (Rule 33; issue report
    `docs/issues/U45-A18-deposit-unreachable-agency-stays-submitted.md`):
    a deposit the test install cannot send to the agency turns the item
    "Error" with "View Error", and "Has Error" lists it {OJS OPS}
  - the guard for OMP1 (Rules 4, 22; issue report
    `docs/issues/U45-OMP1-file-dois-ignored-on-dois-page.md`): a press
    with "Files" alone ticked listing its books on the DOIs page, and a
    book missing only its file DOI listed under "Needs DOI" {OMP}
  - the guard for OPS4 (Rule 12; issue report
    `docs/issues/U45-OPS4-minor-version-new-galley-dois.md`): under "DOI
    Versioning" "Yes", a preprint's "Minor Revision" keeps its galley's
    DOI {OPS}
  - the guard for OMP2 (Rule 45; issue report
    `docs/issues/U45-OMP2-file-row-doi-save-error.md`): a DOI typed into a
    book's empty file row and saved answers "DOI(s) successfully updated"
    and shows at once {OMP}
  - the guard for A12 (Rule 22; issue report
    `docs/issues/U45-A12-doi-filter-clear-hides-unpublished.md`):
    "Unregistered", then "Registered", then "Clear filter: Registered"
    lists the unpublished works again
  - the guard for A4 (Rule 30; issue report
    `docs/issues/U45-A4-deposited-item-reads-manually-registered.md`):
    after "Deposit DOIs" the "Submitted" item's agency box reads "The
    metadata for this item has been submitted to {agency}." {OJS OPS}
  - the guard for A13 (Rules 24, 29; issue report
    `docs/issues/U45-A13-bulk-action-refusal-no-message.md`): "Deposit
    DOIs" with an unpublished work among the ticked ones shows the "Error"
    window with the server's reason
  - the guard for A8 (Fields, the DOIs page; issue report
    `docs/issues/U45-A8-doi-page-controls-unnamed.md`): the button beside
    "Filters" found by its role and the name "DOI Statuses", and a row's
    tick box by its role and the item's name
- **Rarely met**:
  - a press with "Chapters" or "Publication Formats" ticked and "Monographs" not: the same books listed, each with only those kinds' rows, the badge read from the first row {OMP} (Rule 46)
- **Nothing new to test**:
  - the Site Administrator on the DOIs page: the Journal Manager's page of scenarios 1 and 3 (Actors row 2)
  - another manager-level press role or the Site Administrator on a book's chapter and format rows: the Press Manager's rows of scenarios 4, 5 and 7 (Actors rows 2–3)
  - "DOI Assigned" on a press counting a book's chapter and format DOIs of the ticked kinds: the same filter scenario 3 presses (Rule 51)
  - a chapter's and a format's DOI lines on the book's page kept after their kind is unticked: the same stored-DOI rule as the "DOI:" line scenario 6 reads after "DOIs" is unticked (Rules 43, 54)
  - a preprint server with Crossref chosen, "Preprints" unticked: DOIs off as in scenario 6 (Rules 1, 36)
  - "Automatic Deposit" ticked: the scheduled deposit changes nothing a screen offers (Rule 41; Settings bullet 8)
  - "Testing" ticked: deposits go to the agency's test service through the same screens; DataCite's "Test DOI Prefix" rides in scenario 16 (Fields; Settings bullet 10)
  - unticking "DOIs" and saving to store the other "Setup" changes, and the prefix message cleared by the untick (Rule 3; A1)
  - a "Save" with one DOI box refused and another stored showing both notices, and a typed DOI kept across a tab switch and lost on leaving the page (Rule 18)
  - the "Custom DOI Suffix Pattern" group left on screen with "DOIs" unticked, and "Save" greyed after a pattern refusal until the flagged box is typed in (Fields, "Setup")
  - "Deposit All" with nothing left to deposit (Rule 29)
  - paging past thirty items (Rule 23)
  - the "DOI Statuses" window (Rules 22, 31)
  - the agency plugins' Tools pages and their two links (Rule 44; A20)
  - a chapter without a DOI of its own showing its family's in the book's table of contents and, under "DOI Versioning" "Yes", on its own page {OMP} (Rule 54)
  - the "Registration" filters on a press counting chapter and format DOIs whether or not their kind is ticked, and never a file's (Rule 51)
  - the "Custom pattern" "Chapters" and "Publication Formats" boxes and their "%c", "%f" and "%x" symbols {OMP} (Rule 49)
  - a publish under "Never" adding no "Submission metadata updated": no DOI is made, as in the saves of scenarios 5 and 7 that add no line (Side effects)
- **Register carries it**:
  - A2 (a made DOI under "None", and a peer review's under "Custom pattern", reading the prefix and a bare "/", a press's chapters and formats included; Rules 6b, 49)
  - A9 (a pattern symbol with nothing to fill it, such as "%c" in a press's "Publication Formats" box; Rules 6c, 49)
  - A7 (a typed DOI outside the journal's prefix; Rule 18)
  - A10 ("Assign DOIs" under "No" while a newer version is unpublished; Rules 11, 17)
  - OPS4 (a preprint server's minor version's galleys; Rule 12)
  - A17 (a new major version leaving the earlier DOI's status; Rule 32)
  - OPS5 (a preprint server listing unfinished drafts; Rule 15)
  - A11 (searching by a DOI's start, on a press by a chapter's, format's or file's DOI while its kind is ticked; Rule 21)
  - A12 (clearing a "Registration" filter after "Unregistered"; Rule 22)
  - A8 (the unnamed "DOI Statuses" button and row tick boxes; Fields, the DOIs page)
  - A13 (a bulk action confirmed with nothing ticked, and the silent refusals scenario 13 passes; Rules 24, 29)
  - A22 (the "Bulk Actions" menu left open over the list after "Assign DOIs"; Rule 24)
  - A14 (the "Mark DOIs Needs Sync" question's "stale"; Rule 28; scenario 9 passes it)
  - A19 (choosing an agency unticking every kind; Rule 35)
  - A5 (a refused block field keeping the agency; Rule 35; scenario 16 passes it)
  - OJS3 (the ISSN publish warning listed twice; Rule 39; scenario 14 passes it)
  - OJS1 ("Never" not stopping an issue's DOI at "Publish Issue"; Rule 8)
  - OJS2 (a DataCite issue export or deposit; Rule 29)
  - A15 ("Deposit DOIs" on a published work without a DOI; Rule 29)
  - A18 (a deposit that cannot reach the agency staying "Submitted"; Rule 33)
  - A4 (a deposited item's agency panel; Rule 30; scenario 13 passes it)
  - A16 (a "Needs Sync" item's agency panel; Rule 30)
  - OPS2 ("Automatic Deposit" on a preprint server; Rule 41)
  - OMP1 ("Files" alone listing nothing, and "Needs DOI" ignoring a missing file DOI; Rules 4, 22)
  - OMP2 (a DOI typed into a book's empty file row reported as not updated, yet stored; Rule 45)
  - OMP3 (a chapter that cannot carry a DOI reading "Needs DOI"; Rule 47; scenario 4 passes it)
  - OPS3 (a preprint server's "Username" help; Fields, the Crossref block)
  - A21 (the server log's warning on a "Registration" tab "Save" without an agency; Fields, the Registration tab; scenarios 12 and 19 pass it)
  - A23 (a journal's or a preprint server's galley given its DOI alone at a publish; Side effects)
- **No seed**:
  - the "Export DOIs" download and "Items successfully exported": the test installs cannot reach the agency's site (Rule 29; Side effects)
  - a deposit the agency answers with an error: "Error", "View Error" and the "Registration Error Message" window (Rules 17, 33)
  - a deposit the agency accepted: the panel's "Registered" through the agency and "View Record" (Rules 30, 33)
- **Owned by another feature**:
  - an unsaved change on the "Setup" or "Registration" tab lost on leaving the page (Fields; *Journal identity & about pages*, Rule 5)
  - an older version's chapter page under "DOI Versioning" "No", meant to show the current version's chapter DOI, answering a server error {OMP} (Rule 54; *Monograph landing page*, its A19)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | "None" (and every peer review) gets a DOI that is the prefix and a bare "/" | 🐞 | high | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | A DOI refused on the DOIs page gets only "Some DOI(s) could not be updated", never the reason | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A4](#a4) | After "Deposit DOIs", the item's agency box says it "has been manually registered", though nobody marked it | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A8](#a8) | On the DOIs page, a screen reader announces the "DOI Statuses" button and every row's tick box without a name | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A9](#a9) | A pattern symbol with nothing to fill it stays in the DOI | 🐞 | high | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | Searching the DOIs page by a DOI misses some DOIs on each app, and fails on a preprint server | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A12](#a12) | On the DOIs page, clearing a "Registration" filter chosen after "Unregistered" leaves only published works listed | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A13](#a13) | A bulk action the server refuses on the DOIs page closes its window and shows no message | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A14](#a14) | The "Mark DOIs Needs Sync" question asks to mark the records "as stale" | 🐞 | minor | — |
| [A15](#a15) | "Deposit DOIs" on a published work with no DOI reports success, and nothing is deposited | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A17](#a17) | With "DOI Versioning" "Yes", publishing a new major version leaves the earlier version's DOI "Registered" instead of "Needs Sync" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A18](#a18) | A DOI deposit that cannot connect to Crossref or DataCite reads "Submitted" for good, with no error | 🐞 | high · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A19](#a19) | Saving a DOI registration agency can untick every DOI kind and leave the DOIs page blank | 🐞 | high · crash: script | issues (claude), 2026-10-01 — re-verified |
| [A20](#a20) | The agency plugins' Tools pages have an empty heading | 🐞 | minor | — |
| [A21](#a21) | A "Save" on the Registration tab without an agency leaves a warning in the server log | 🐞 | invisible | — |
| [A22](#a22) | After "Assign DOIs" answered at once, the "Bulk Actions" menu stays open over the list | 🐞 | minor | — |
| [OJS2](#ojs2) | On a DataCite journal, "Export DOIs" on an issue downloads nothing and "Deposit All" never sends it | 🐞 | high · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OJS3](#ojs3) | The publish window lists the ISSN warning twice | 🐞 | minor | — |
| [OMP1](#omp1) | A press's DOIs page lists no books when only "Files" is ticked, and "Needs DOI" skips missing file DOIs | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OMP2](#omp2) | A DOI typed into a book's file row on a press's DOIs page is saved, but "Save" reports a failure | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [OPS1](#ops1) | The "DOIs" box reads "…to assigned to works published on this server." | 🐞 | minor | — |
| [OPS3](#ops3) | The Crossref "Username" help reads "…see the advise above." | 🐞 | minor | — |
| [OPS4](#ops4) | On a preprint server, a minor version's galleys get new DOIs instead of keeping their source's | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A1](#a1) | A new journal arrives in a DOI state its own Setup tab refuses to save | ❓ | minor | — |
| [A5](#a5) | The Registration tab keeps a new agency even when its fields are refused | ❓ | minor | — |
| [A6](#a6) | Choosing an agency silently unticks the kinds it does not accept | ❓ | minor | — |
| [A7](#a7) | A DOI typed by hand need not begin with the journal's prefix | ❓ | minor | — |
| [A10](#a10) | Under "DOI Versioning" "No", "Assign DOIs" while a newer version is unpublished gives the DOI to the published version only | ❓ | user-visible | — |
| [A16](#a16) | A "Needs Sync" item's agency panel says its metadata "has not been submitted" | ❓ | minor | — |
| [A23](#a23) | A journal's or a preprint server's galley given its DOI alone at a publish: its Activity Log line untried | ❓ | minor | — |
| [OJS1](#ojs1) | "Never" does not stop an issue's DOI at "Publish Issue" | ❓ | minor | — |
| [OMP3](#omp3) | A chapter that cannot have a DOI reads "Needs DOI" | ❓ | minor | — |
| [OPS2](#ops2) | A preprint server offers "Automatic Deposit" but nothing runs it | ❓ | user-visible | — |
| [OPS5](#ops5) | A preprint server's DOIs page lists drafts nobody has submitted | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — A new journal arrives in a DOI state its own Setup tab refuses to save** · ❓ · minor.
Every new journal, press and preprint server starts with "DOIs" ticked
and no "DOI Prefix", but the Setup tab refuses every save in that state
with "A DOI prefix is required". A manager cannot save a change to "DOI
Versioning" or any other Setup field with "DOIs" ticked before typing a
prefix (only by unticking "DOIs" and saving, Rule 3), and one who
unticks "DOIs" cannot tick it again without one.
Question: should a context without a prefix be allowed to keep DOIs on?
Lean: yes; the DOIs page's own "Add DOI prefix" warning is written for
exactly that state, so the save should accept it rather than the default
avoid it.
Basis: probe, 2026-09-26. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "None" (and every peer review) gets a DOI that is the prefix and a bare "/"** · 🐞 · high.
With "DOI Format" "None - Suffixes must be entered manually … and will
not be generated automatically", a manager expects no DOI until one is
typed. Instead "Assign DOIs" and the automatic assignment give every
work "{prefix}/" with nothing after the slash, the same value for every
work; the DOIs page reports "Items successfully assigned new DOIs", and
the work's public page, its citation tags, "How to cite" and OAI-PMH
carry that DOI. On a journal with "Peer Review" ticked, every publicly
shown completed review gets the same bare value, under "None" and under
"Custom pattern". One cause with [A9](#a9).
Basis: probe, 2026-10-01. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A DOI refused on the DOIs page gets only "Some DOI(s) could not be updated", never the reason** · 🐞 · low.
A manager types a DOI into a box on the DOIs page and presses "Save".
When the server refuses the DOI, the notice reads only "Some DOI(s)
could not be updated" and the box returns to its old value. The server
sends its reason with the refusal: "This is not formatted correctly.",
"The DOI contains invalid characters." or "The given DOI suffix is
already in use for another published item. Please enter a unique DOI
suffix for each item.". The page never shows it, so a mistyped DOI
cannot be told from one that another work already has. The way round is
to try other values until one is accepted.
Basis: probe, 2026-10-01. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — After "Deposit DOIs", the item's agency box says it "has been manually registered", though nobody marked it** · 🐞 · low.
On the DOIs page, an item whose DOI was sent for deposit reads
"Submitted", and the agency box in its expanded view says "This item has
been manually registered with a registration agency." Expected: "The
metadata for this item has been submitted to {agency}.", since nobody
marked it registered. Nothing is lost: the badge, the deposit and the
stored status are right, and the box picks the wrong one of two
sentences. The sentence is wrong for as long as the item reads
"Submitted". That is seconds where queued jobs run on web requests (the
default), and until the worker's or cron's next run otherwise. When the
deposit cannot connect to the agency, the item stays "Submitted" (a
separate fault, [A18](#a18)) and the sentence stays with it. It needs
Crossref or DataCite configured, which a press cannot have. It shows on
an item whose DOI no agency has registered before; an item deposited
again after an agency registered it reads the right sentence.
Basis: probe, 2026-10-01. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The Registration tab keeps a new agency even when its fields are refused** · ❓ · minor.
A manager chooses an agency, fills its block with a value the install
refuses, and presses "Save". The message appears under the field, yet
the agency choice and "Automatic Deposit" are already saved, and any
kind the agency does not accept already unticked.
Question: should a refused block leave the tab's other fields unsaved?
Lean: yes; one "Save" should store all or nothing.
Basis: probe, 2026-09-26. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Choosing an agency silently unticks the kinds it does not accept** · ❓ · minor.
A journal with "Articles" and "Article galleys, such as a published
PDF" ticked chooses Crossref and saves; the galley kind is unticked and
disappears from the Setup tab with no message, and the galley rows
leave the DOIs page. When the dropped kind is not the last one ticked,
every kind goes instead ([A19](#a19)).
Question: should the tab warn before dropping a kind?
Lean: keep the rule (the agency cannot register those items) but say so
on "Save".
Basis: probe, 2026-09-26. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A DOI typed by hand need not begin with the journal's prefix** · ❓ · minor.
The DOIs page accepts "10.9999/x" on a journal whose prefix is
"10.1234"; the journal's own prefix is never checked.
Question: should a typed DOI have to start with the journal's prefix?
Lean: no; journals carry DOIs registered under earlier prefixes or by
other publishers, so accepting any DOI is intended.
Basis: probe, 2026-09-26. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — On the DOIs page, a screen reader announces the "DOI Statuses" button and every row's tick box without a name** · 🐞 · low.
The round button beside "Filters" on the DOIs page shows only a "?"
icon, and no row's tick box has a label, so a screen reader announces
"button" and "checkbox" with nothing more. A manager who cannot see the
screen cannot tell that the button opens the "DOI Statuses" legend, or
which item a box ticks, except by reading on to the item's name, which
comes right after its box. Both controls work from the keyboard, and the
other controls of the page have names. The DOIs page is there once DOIs
are turned on for the journal, press or preprint server.
Basis: probe, 2026-10-01. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A pattern symbol with nothing to fill it stays in the DOI** · 🐞 · high.
Under "Custom pattern" a manager expects a DOI built from the item's
values, or a refusal when one is missing. Instead "Assign DOIs" on an
item that lacks the symbol's value keeps the symbol and reports success:
"%j.%p" on an article without "Pages" gives "10.1234/jpk.%p", and
"k2.%x" on an item without a Publisher ID gives "10.1234/k2.%x" (filled,
they give "10.1234/jpk.12-34" and "10.1234/k2.{Publisher ID}"). The row
reads "Unregistered", and readers see that DOI on the work's page, in
its citation tags and in OAI-PMH; Crossref's export would send it. One
cause with [A2](#a2).
Basis: probe, 2026-10-01. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — Under "DOI Versioning" "No", "Assign DOIs" while a newer version is unpublished gives the DOI to the published version only** · ❓ · user-visible.
With "DOI Versioning" "No" and an article published without a DOI, a
manager presses "Create New Version", then "Assign DOIs" for the
article on the DOIs page, which lists "Version of Record 1.0". Once 1.1
is published, its page shows no "DOI:" line, while the 1.0 page shows
the DOI.
Question: under "No", should a DOI assigned while a newer version is
unpublished reach that version too?
Lean: yes; "No, all versions of an article should have the same DOI."
is what the manager chose.
Basis: probe, 2026-09-26. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Searching the DOIs page by a DOI misses some DOIs on each app, and fails on a preprint server** · 🐞 · medium · crash: server.
A manager types a DOI, or its start, into the search box of the DOIs
page and presses Enter, expecting the items that carry it. What the
search finds depends on the app and on the kinds ticked under "Items
with DOIs" (Settings › Distribution › "DOIs"). Each app starts with only
the works' own kind ticked. A journal ("Articles") finds an article by
its DOI. Once "Article galleys" is ticked, a galley's DOI is never
found. A press ("Monographs") finds nothing for any DOI. The book's own
DOI is the one kind it never finds. Once chapters, formats or files are
ticked, their DOIs are found. A preprint server ("Preprints") fails on
the server at every DOI search. An "Error" window opens and the list
stays unfiltered. Once "Preprint galleys" is ticked, the error stops,
but no DOI is ever found. Where the search misses, the list reads "No
items found.", so the manager is led to believe that no item carries the
DOI. The editorial dashboard's "Search submissions" gives the same
results, the error included.
Basis: probe, 2026-10-01. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — On the DOIs page, clearing a "Registration" filter chosen after "Unregistered" leaves only published works listed** · 🐞 · low.
A manager presses "Unregistered", then "Registered", then "Clear filter:
Registered". No filter reads chosen, yet every unpublished work stays
out of the list until the page is reloaded, so the manager takes a
partial list for the whole one. Reloading the page brings the whole list
back, and nothing is saved wrong. It is met in ordinary browsing: a
manager looks at "Unregistered", switches to any other filter of the
"Registration" group ("Submitted", "Registered", "Has Error", "Needs
Sync") and then clears that filter.
Basis: probe, 2026-10-01. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A bulk action the server refuses on the DOIs page closes its window and shows no message** · 🐞 · medium.
A manager confirms a bulk action on the DOIs page and the server refuses
the request. The confirmation window closes, the list reloads with
nothing ticked, and no "Error" window says that the action was refused
or why. The case a manager meets is "Deposit DOIs" or "Export DOIs" with
an unpublished work among the ticked ones. The DOIs list shows
unpublished works beside published ones, so "Select All" ticks them. The
server then refuses the whole selection: nothing is deposited or
exported, for the published works either. The same silence follows any
action confirmed with nothing ticked, and an "Export DOIs" whose file
does not pass the registration agency's format check. For an unpublished
work the way round is to untick it and run the action again, once the
manager has guessed that this is the reason.
Basis: probe, 2026-10-01. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — The "Mark DOIs Needs Sync" question asks to mark the records "as stale"** · 🐞 · minor.
The window ends "Are you sure you want to mark these records as
stale?", while the action, the badge, the filter and the "DOI Statuses"
window all say "Needs Sync"; "stale" appears nowhere else on the page,
so the manager confirms a status the screen never names.
Basis: probe, 2026-09-26. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — "Deposit DOIs" on a published work with no DOI reports success, and nothing is deposited** · 🐞 · medium · crash: server.
A manager ticks a published work that has no DOI on the DOIs page and
presses "Deposit DOIs". The page reports "Items successfully submitted
for deposit", but the work stays "Needs DOI", nothing reaches the
registration agency, and the background deposit fails on the server.
Only the site administrator's "Failed Jobs" page shows the failure. The
way round is to give the work a DOI first ("Assign DOIs") and deposit
again. With DataCite, a work whose article DOI was cleared while its
galley kept one fares worse: the galley's DOI turns "Submitted" and
stays so, though nothing was sent. It needs a registration agency
(Crossref, or DataCite on a journal) and a published work without an
article or preprint DOI. Every work published before the journal or
server set its DOI prefix is in that state, as are works whose DOI was
cleared. On 3.5 the same notice shows, and the work is sent to Crossref
with an empty DOI, which cannot register anything; the work stays "Needs
DOI" and no error is recorded.
Basis: probe, 2026-10-01. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — A "Needs Sync" item's agency panel says its metadata "has not been submitted"** · ❓ · minor.
A DOI reads "Needs Sync" only after it was deposited or registered, yet
its panel reads "The metadata for this item has not been submitted to
{agency}." with "Deposit DOI(s)", the same as for an item never
deposited.
Question: should a "Needs Sync" item's panel say that its record needs
sending again rather than that nothing was submitted?
Lean: yes, in the words of the "DOI Statuses" window ("They need to be
resubmitted…").
Basis: probe, 2026-09-26. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — With "DOI Versioning" "Yes", publishing a new major version leaves the earlier version's DOI "Registered" instead of "Needs Sync"** · 🐞 · low.
A journal, press or preprint server has "DOI Versioning" set to "Yes". A
manager creates a new version of a published work with "Major Revision"
and publishes it. The new version gets a DOI of its own, "Unregistered".
The earlier version's DOI was "Registered" and still is, where the code
means it to turn "Needs Sync". The status shows in the window that "View
all" opens on the DOIs page. Only a preprint server's Crossref record
for the earlier version is out of date: it should now name the new
version. Depositing the work for its new DOI, by hand or by "Automatic
Deposit", sends every version's record and sets every status again. On a
journal and a press the earlier version's record at the agency does not
change, so only the label differs from what the code intends. "DOI
Versioning" is "Yes" by default on a preprint server and "No" on a
journal and a press. A new version gets its DOI on publication unless
"Automatic DOI Assignment" is "Never".
Basis: probe, 2026-10-01. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — A DOI deposit that cannot connect to Crossref or DataCite reads "Submitted" for good, with no error** · 🐞 · high · crash: server.
After "Deposit DOIs" or "Deposit All" the DOI reads "Submitted". When
the background deposit cannot connect to the registration agency
(Crossref or DataCite), it fails on the server. It is tried twice more,
about five seconds apart, and then given up and recorded as a failed
job, all within seconds. The DOI stays "Submitted": no "Error" badge or
"View Error" appears. Nothing on the DOIs page tells the manager that
the deposit never arrived or that it should be sent again, and nothing
points the site administrator to Administration › "Failed Jobs". The DOI
is never registered, so it does not resolve, while the DOIs page reports
it as sent. A stuck "Submitted" looks the same as a deposit still
waiting its turn. "Deposit All" and "Automatic Deposit" never send a
"Submitted" DOI again, so it is registered only if a manager deposits
the item again by hand. The trigger is a deposit that gets no answer: no
connection, a failed name lookup, a failed TLS handshake, a timeout or
an empty reply. This covers an outage at the agency and a server whose
outbound connections are blocked, where every deposit is lost this way.
An agency that answers with an HTTP error is recorded as "Error", as it
should be. With Crossref, a transfer error of another kind that brings
no answer leaves "Submitted" too; that case was read in the code and not
reproduced.
Basis: probe, 2026-10-01. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — Saving a DOI registration agency can untick every DOI kind and leave the DOIs page blank** · 🐞 · high · crash: script.
A journal manager chooses Crossref or DataCite as the registration
agency and saves. Saving an agency unticks the DOI types it does not
register (the boxes the Setup tab lists under "Items with DOIs", here
called kinds). When such a kind comes before one the agency keeps, every
"Items with DOIs" box then reads unticked, and the DOIs page shows its
heading and tabs but no list: the page's script fails. Nothing on screen
explains it. The stored kinds survive: the setting still holds
"Articles" and the other kept kind, and the server goes on assigning
DOIs and, where "Automatic Deposit" is on, depositing them by those
kinds. What is lost is the two screens. The DOIs page is the only place
to deposit, assign, edit or mark DOIs by hand, so a manager without
"Automatic Deposit" cannot register any DOI. The Setup tab cannot put
the kinds back: its boxes tick and untick all together, and "Save" is
refused. "Comes before" is the order of the stored list, which follows
the order the boxes were ticked, across saves. It is reached on a
journal choosing Crossref, with galleys before "Peer Review" or before
"Issues"; on a preprint server choosing Crossref, with galleys before
"Preprints"; and on a journal choosing DataCite, with "Peer Review"
before a kept kind (seen once in the spec's footnote, not reproduced
here).
Basis: probe, 2026-10-01. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — The agency plugins' Tools pages have an empty heading** · 🐞 · minor.
Tools › "Import/Export" › "Crossref XML Export Plugin" (on a journal
also "DataCite Export/Registration Plugin") opens a page whose heading
is empty and whose browser tab reads only the journal's name; the
notice is the page's only content. A screen reader announces an empty
heading, and the tab does not say which page is open.
Basis: probe, 2026-09-26. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — A "Save" on the Registration tab without an agency leaves a warning in the server log** · 🐞 · invisible.
On a journal or preprint server with no agency plugin enabled, and on
every press, the "Registration" tab holds no field but "Save". Pressing
it answers "Saved" and changes nothing, as expected, but each press
also writes a warning to the install's server error log, because the
save expects a "Registration Agency" choice the tab does not have.
Nothing on screen shows it; the log gains a line per save.
Basis: test run, 2026-09-26. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — After "Assign DOIs" answered at once, the "Bulk Actions" menu stays open over the list** · 🐞 · minor.
A manager ticks an item, presses "Bulk Actions", holds the mouse button
on "Assign DOIs" for about a fifth of a second (an unhurried click),
and presses the window's "Assign DOIs" at once. The window closes
within half a second of the first press and "Items successfully
assigned new DOIs" shows, but the menu is still open over the list's
first rows, with the keyboard focus back on its "Assign DOIs" item. A
press on the first row's expand button lands on the menu instead.
Expected: the menu closes once the window opens, as after a press with
no hold, or when the window closes 1.8 s after the press (other
timings untried).
Basis: probe, 2026-09-28. <sup>f-a22</sup>

<a id="a23"></a>
**A23 — A journal's or a preprint server's galley given its DOI alone at a publish: its Activity Log line untried** · ❓ · minor.
On a journal or a preprint server, a galley added after the work got
its DOI gets its own at the publish (Rule 5).
Question: does that publish add "Submission metadata updated" (on a
journal, besides the line "Confirm" adds)?
Lean: no; a journal's galley DOI typed by hand adds none, and on a
press a chapter's or format's DOI made alone at a publish adds none.
Basis: judgment, 2026-09-29. <sup>r</sup> <sup>q37</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — "Never" does not stop an issue's DOI at "Publish Issue"** · ❓ · minor.
With "Automatic DOI Assignment" "Never" and "Issues" ticked, publishing
an issue still gives it a DOI, while the articles scheduled in it get
none.
Question: should "Never" cover issues too?
Lean: yes; the setting's help asks only about submissions, but a manager
who chose "Never" expects no DOI to appear by itself.
Basis: probe, 2026-09-26. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — On a DataCite journal, "Export DOIs" on an issue downloads nothing and "Deposit All" never sends it** · 🐞 · high · crash: server.
On a journal with DataCite chosen, "Export DOIs" on a published issue
("Issues" tab) closes the "Export DOIs" confirmation window and shows
nothing: the export fails on the server. "Deposit All" marks the issue
"Submitted", and its background deposit fails the same way, so the
issue's DOI never reaches DataCite. The journal cannot register any
issue DOI with DataCite from the application, by deposit or by a
downloaded file. The DOIs page tells the manager the opposite: the issue
reads "Submitted" and no error shows. Article DOIs on the same journal
are not affected. It needs DataCite as the journal's registration agency
and "Issues" ticked under "Items with DOIs".
Basis: probe, 2026-10-01. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — The publish window lists the ISSN warning twice** · 🐞 · minor.
While Crossref is chosen and the journal has neither ISSN, the publish
window lists "Either an online ISSN or print ISSN must be provided
before submissions can be deposited with Crossref." twice under "The
following issues were found, but will not prevent publishing".
Basis: probe, 2026-09-26. <sup>f-ojs3</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's DOIs page lists no books when only "Files" is ticked, and "Needs DOI" skips missing file DOIs** · 🐞 · medium.
A press ticks "Files" alone under "Items with DOIs" and saves. Its DOIs
page then reads "No items found.", so the files' DOIs can be neither
seen nor assigned there. With "Monographs" ticked as well, the press's
books are listed with their file rows, but the "Needs DOI" filter
ignores file DOIs. A book that has its own DOI but whose file has none
is left out, although that file's row reads "Needs DOI". For a press
that wants DOIs on files only, the way round is to tick a second kind,
such as "Monographs". "Assign DOIs" then also gives each book a DOI of
that kind, which the press must accept or delete row by row. Publishing
a book still gives its files DOIs by themselves, unless "Automatic DOI
Assignment" is "Never".
Basis: probe, 2026-10-01. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — A DOI typed into a book's file row on a press's DOIs page is saved, but "Save" reports a failure** · 🐞 · medium · crash: server.
On a press's DOIs page, a manager expands a book whose file row ("PDF /
epilogue.pdf") has no DOI, presses "Edit", types a DOI into that row's
DOI box and presses "Save". The server stores the DOI, then answers the
save with an error. The notice reads "Some DOI(s) could not be updated",
the box is empty again and the row still reads "Needs DOI". Only after a
reload does the row show the DOI, "Unregistered". A manager who believes
the notice and tries again is refused the same DOI, with the same
notice, because it is already taken. A different DOI is stored and
linked to the file in its place, with the same notice. The first DOI
then belongs to nothing, yet stays taken: it can no longer be given to
this file or any other item on the install, and no screen shows or
removes it. It needs a press with "Files" ticked under "Items with
DOIs", which is off by default. A DOI typed into the book's own row
saves without the error.
Since: 2025-08-20 · Basis: probe, 2026-10-01. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A chapter that cannot have a DOI reads "Needs DOI"** · ❓ · minor.
On a press's DOIs page a chapter whose "Chapter Page" box is unticked
and that has no DOI keeps a greyed row whose badge reads "Needs DOI",
just above "Chapters without a landing page cannot have a DOI.", and
still after "Assign DOIs". The "Needs DOI" filter leaves the book out
when that chapter is all it lacks (Rule 51), so the badge and the
filter disagree.
Question: should a chapter that cannot carry a DOI show a status that
asks for one?
Lean: no, a minor 🐞; the badge asks for a DOI the same view says the
chapter cannot have.
Basis: probe, 2026-09-29. <sup>f-omp3</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The "DOIs" box reads "…to assigned to works published on this server."** · 🐞 · minor.
The box's label on a preprint server reads "Allow Digital Object
Identifiers (DOIs) to assigned to works published on this server.";
"to be assigned" is meant.
Basis: probe, 2026-09-26. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — A preprint server offers "Automatic Deposit" but nothing runs it** · ❓ · user-visible.
With Crossref chosen, the Registration tab offers "Enable automatic
depositing" and promises deposits "at scheduled intervals", but a
preprint server's install schedules no deposit, so a ticked box has
nothing to act on and the preprints wait for a manual deposit.
Question: should preprint servers deposit on a schedule, or not offer
the box?
Lean: deposit on a schedule, as a journal does.
Basis: probe, 2026-09-26. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — The Crossref "Username" help reads "…see the advise above."** · 🐞 · minor.
On a preprint server the Crossref block's "Username" help reads "The
Crossref username that will be used to authenticate your deposits. If
you are using a personal account, see the advise above."; a journal's
reads "…please see the advice above.".
Basis: probe, 2026-09-26. <sup>f-ops3</sup>

<a id="ops4"></a>
**OPS4 — On a preprint server, a minor version's galleys get new DOIs instead of keeping their source's** · 🐞 · low.
A preprint server has "DOI Versioning" set to "Yes" and gives DOIs to
its galleys (off by default). A manager creates a new version of a
posted preprint with "Minor Revision" and posts it. The new version
keeps the preprint's DOI, but its galleys do not keep theirs: each gets
a new DOI. On a journal and a press, a minor version keeps its galleys'
and formats' DOIs. Nothing on screen says so, and the manager cannot put
the old DOI back: the DOIs page refuses it with "Some DOI(s) could not
be updated".
Basis: probe, 2026-10-01. <sup>f-ops4</sup>

<a id="ops5"></a>
**OPS5 — A preprint server's DOIs page lists drafts nobody has submitted** · ❓ · minor.
On a preprint server an unfinished draft, one an Author started and
never submitted, is listed on the DOIs page with the badge
"Unpublished" and its row "Needs DOI". A journal and a press list no
such draft.
Question: should the DOIs page list a draft nobody has submitted?
Lean: no; a manager has nothing to register for it, and the other apps
leave drafts out.
Basis: probe, 2026-09-26. <sup>f-ops5</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Scope: every row type of a press's DOI list
(`DoiListPanelOMP.vue` `publication`, `chapter`, `representation`,
`file`) and the `omp/api/v1/_dois/BackendDoiController` chapter and
format ops are this spec's (Rules 45–54, notes z1–z13, added
2026-09-29); the chapters and formats themselves are
*Chapters & work type*'s and *Publication formats & proof terms*'s. Agency plugins in the
checkouts (ojs `3162c105bf`, omp
`72a01a026`, ops `e9f6f4f550`, lib/pkp `1ad4a14bb2`, ui-library
`03d1cee2`): `ojs/plugins/generic/crossref`, `ojs/plugins/generic/datacite`,
`ops/plugins/generic/crossref`; `omp/plugins/generic/` holds none (no class
implementing `IDoiRegistrationAgency`). Live-probed 2026-09-26 (Purpose;
Settings bullet 11), all three apps: on `publicknowledge` and on new
scratch contexts the Plugins list shows "Crossref Manager Plugin" (and on
a journal "DataCite Manager Plugin") unticked and the "Registration" tab
reads "No Registration Agency Enabled"; a press lists no agency plugin
and its DOIs page offers no export or deposit. An earlier read on
2026-09-25 had found Crossref ticked on a scratch journal; it did not
hold on this fleet. Every opening of the Plugins tab fires the Plugin
Gallery's `plugin-gallery-grid/fetch-grid`, which answers 500 on the test
installs (a known failure of the plugins screen, not of this feature).

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-26 (Purpose; Rule 34), OJS and OPS, the
press as control: ticking "DataCite Manager Plugin" on a journal ("The
plugin "DataCite Manager Plugin" has been enabled.") adds "DataCite" to
the list; with both plugins on it offers "None", "DataCite", "Crossref".
Choosing an agency and "Save" answered 200. Unticking the chosen agency's
plugin asks "Are you sure you want to disable this plugin?"; after "OK"
("The plugin "Crossref Manager Plugin" has been disabled.") the list shows
an empty box with the other agency still enabled, or the tab reads "No
Registration Agency Enabled" with none; ticking the plugin again leaves
the box empty. The agency's saved fields and "Enable automatic
depositing" stayed stored and showed filled when it was chosen again.

<a id="fn-b"></a>
**b** — `lib/pkp/pages/dois/PKPDoisHandler.php`: role assignment
`ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN` for `index` (and a `management`
op with no method); policies `ContextRequiredPolicy`, `DoisEnabledPolicy`
(`enableDois` and a non-empty `enabledDoiTypes`, message
`doi.authorization.enabledRequired`), then the role policy; no
`permitSettings` check. Failure: `PKPPageRouter::handleAuthorizationFailure()`
→ `user/authorizationDenied?message=…` (signed out: Login). App
subclasses `ojs|omp|ops/pages/dois/DoisHandler.php` add no ops. The API
routes behind the page (`api/v1/dois`, `api/v1/_dois`) take the same
roles and `DoisEnabledPolicy`. The settings forms save through
`PUT api/v1/contexts/{id}` and `PUT api/v1/contexts/{id}/registrationAgency`
(`PKPContextController::editDoiRegistrationAgencyPlugin()`, manager or
admin). Live-probed 2026-09-26 (Actors rows 1–5), all three apps: the
Editor and the Production Editor open Settings › Distribution and the
DOIs page (OPS: the manager only); `admin` sees "DOIs" and opens the page
on scratch contexts and on `publicknowledge`; Section Editor, Copyeditor,
Reviewer, Author and Reader (OPS: Moderator, Editorial Board Member,
Author, Reader) get "The current role does not have access to this
operation." at Settings › Distribution.

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-26 (Actors row 2), all three apps: (1) the
Editor and the Production Editor with "Permit changes to Settings"
unticked see "DOIs" in the side menu and get the full page ("Bulk
Actions", filters); (2) Section Editor, assistant-level roles, Reviewer,
Author and Reader have no "DOIs" entry, and the address lands on
`user/authorizationDenied` with "The current role does not have access
to this operation."; (3) with "DOIs" unticked and saved, the manager, the
Editor, the Section Editor, the Copyeditor, the Reviewer, the Author, the
Reader and `admin` all get "You cannot call this operation without DOIs
enabled."; (4) signed out, the Login page.

<a id="fn-c"></a>
**c** — Forms: `lib/pkp/classes/components/forms/context/PKPDoiSetupSettingsForm.php`
(groups `doiDefaultGroup`, `doiSettingsGroup` `showWhen enableDois`,
`doiCustomSuffixGroup` `showWhen [doiSuffixType, customPattern]`, which
does not test `enableDois`; fields `enableDois`, `doiPrefix`,
`doiCreationTime`, `doiSuffixType`,
`doiPublicationSuffixPattern` (label `manager.language.submissions`),
`doiRepresentationSuffixPattern`, `doiVersioning`); app subclasses
`classes/components/forms/context/DoiSetupSettingsForm.php` add
`enabledDoiTypes` (OJS `publication`, `issue`, `representation`,
`peerReview`; the `authorResponse` option commented out; OMP
`publication`, `chapter`, `representation`, `file`; OPS `publication`,
`representation`), filtered by the configured agency's `allowedBy`, and
the pattern boxes (OJS `doiIssueSuffixPattern` and the
`peerReviewCustomSuffixMessage` HTML field; OMP `doiChapterSuffixPattern`,
`doiSubmissionFileSuffixPattern`). Vue: `DoiSetupSettingsForm.vue`
(clears the `doiPrefix` error when `enableDois` changes). Validation:
`lib/pkp/schemas/context.json` (`doiPrefix` `regex:/^10\.[0-9]{4,7}$/`,
message `validator.regex` "This is not formatted correctly.");
`PKPContextService::validate()` (`enableDois` and empty `doiPrefix` →
`doi.manager.settings.doiPrefix.required`; empty publication /
representation pattern under `customPattern` →
`doi.manager.settings.doiSuffixPattern.required`); OJS and OMP
`ContextService::validateContext()` for the issue, chapter and file
patterns. Defaults (app `schemas/context.json`): `enableDois` true,
`enabledDoiTypes` `["publication"]`, `doiCreationTime`
`copyEditCreationTime`, `doiSuffixType` `default`, `doiVersioning` false
(OPS true). Labels: app `locale/en/manager.po` over lib/pkp's
(`manager.setup.enableDois.description`, `doi.manager.settings.*`); OPS
`manager.setup.enableDois.description` "…to assigned to works…";
`doi.manager.settings.doiCreationTime.copyedit` OPS "Upon reaching the
production stage". The whole form posts every field (`Form.vue`
`submitValues`). Live-probed 2026-09-26 (Fields, the Setup tab; Rules 1,
4; Settings bullets 1–5), all three apps: labels, help texts, boxes and
radios as quoted, each option saved and read back after a reload; a
refused save shows the message under the box, the footer "Please correct
one error. Go to DOI Prefix: … Jump to next error" and the page notice
"The form was not saved because 1 error(s) were encountered. Please
correct these errors and try again."; with "Custom pattern" selected,
unticking "DOIs" (unsaved, and saved and reloaded) left the pattern
group on screen with the typed pattern in its box; an unsaved change
survived a move to "Registration" and to another top tab, and was gone
after leaving the page, with no question asked. Unticking "DOIs", or
every kind, and saving removed the side-menu entry; the reader page
kept the DOI, and ticking "DOIs" again brought back the same DOIs.

<a id="fn-y"></a>
**y** — Live-probed 2026-09-24 (U08 claim check, all three apps): DOIs on
by default on `publicknowledge` and every scratch context, the first kind
ticked, no prefix; managers' side menus show "DOIs". Live-probed
2026-09-23 (U08 claim check K4): after "DOIs" was unticked and saved,
ticking it again and pressing "Save" answered 400 with "A DOI prefix is
required" under the box and "The form was not saved because 1 error(s)
were encountered…". The prefix warning: `templates/management/dois.tpl`
(each app) `manager.dois.settings.prefixRequired`, shown when
`enableDois` and no `doiPrefix`, link `management/settings/distribution#dois`.
Live-probed 2026-09-26 (Rules 1, 2), all three apps: the arrival state
again; the warning verbatim; "Add DOI prefix" lands on Settings ›
Distribution with "DOIs" › "Setup" selected; an item published without a
prefix reads "Needs DOI" and "Bulk Actions" offers no "Assign DOIs"; a
DOI typed by hand without a prefix answered 200, reads "Unregistered"
after a reload and shows on the reader page.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-26 (Fields, "DOI Prefix"), all three apps:
"10.123", "10.12345678", "11.1234" and "10.1234/" refused with "This is
not formatted correctly." under the box; "10.1234" and "10.1234567"
saved and read back after a reload; the help's "Crossref" and "DataCite"
link to their sites. A prefix typed with surrounding spaces is saved
without them.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-26 (Fields, "Custom DOI Suffix Pattern"),
all three apps: the group appears on selecting "Custom pattern"; the
journal's help lists "%j Journal Initials … %x Custom Identifier", the
press's "%p Press Initials … %x Custom Identifier", the server's "%j.%a
Preprints", "%j.%a.g%g Galleys". "Submissions" empty with the first kind
ticked: "A DOI suffix pattern is required." under "Submissions"; "Issues"
(journal), "Files" (press), "Preprint galleys…" (server) ticked with
their box empty: the same message under that box; the kind unticked with
its box empty: saved. After the refusal, unticking the flagged kind left
"Save" disabled until a character was typed in the flagged box and
removed again; the save then passed.

<a id="fn-d"></a>
**d** — `lib/pkp/classes/components/forms/context/PKPDoiRegistrationSettingsForm.php`:
agencies from the hook `DoiSettingsForm::setEnabledRegistrationAgencies`
(registered only by enabled agency plugins); with more than the "None"
option, the `registrationAgency` select and `automaticDoiDeposit`
(`showWhen registrationAgency`), else the `noPluginsEnabled` HTML field;
agency fields in the group `agencySpecificSettings`
(`DoiRegistrationSettingsForm.vue` swaps them when the select changes).
Save: `PKPContextController::editDoiRegistrationAgencyPlugin()` validates
and saves the context fields first, then, for a newly chosen agency,
`array_intersect()`s `enabledDoiTypes` with `getAllowedDoiTypes()` and
saves that, then validates the agency fields
(`RegistrationAgencySettings::validate()`) and answers 400 on errors. OMP
`DoiSetupSettingsForm` calls `removeField(automaticDoiDeposit)` on a form
that has none. Plugin disable: `CrossrefPlugin::setEnabled(false)` (and
DataCite's) resets `registrationAgency`; the stored agency settings and
`automaticDoiDeposit` are kept. The reference-DOI task:
`CrossrefPlugin::registerSchedules()` (`CrossrefCitationDoiCheckTask`,
hourly; described by the citations spec). Live-probed 2026-09-26
(Fields, the Registration tab; Rules 34, 35), OJS and OPS, the press as
control: the list shows no choice on a new context (value ""); choosing
an agency sends no request and shows its block; "Save" answered "Saved"
and the agency, "Enable automatic depositing" and the block's fields
read back after a reload; "None" saved shows "None" until the reload,
then the empty box; the tab without a plugin (all three apps) still has
"Save", which answered 200 with nothing stored; an unsaved choice
survived a move to "Setup" and back and was gone after leaving the
page. The install's own task list (`lib/pkp/tools/scheduler.php list`,
read only) shows `CrossrefCitationDoiCheckTask` hourly on the journal
install, none on the press and preprint-server installs.

<a id="fn-e"></a>
**e** — `ojs/plugins/generic/crossref/classes/CrossrefSettings.php`:
schema `required: depositorName, depositorEmail`; `depositorName` max 60,
`depositorEmail` email max 90, `username` max 120, `password` max 50,
`updatePolicyDoi` `regex:/^\d+(.\d+)+\//`, `crossmark`, `testMode`;
fields in order: preamble (`_getPreambleText()`: the
`plugins.importexport.common.missingRequirements` notice with
`…error.publisherNotConfigured` / `…error.issnNotConfigured` when
`publisherInstitution` / both ISSNs are empty, then
`…settings.depositorIntro`), `depositorName`, `depositorEmail`,
`crossmark`, `updatePolicyDoi` (`isRequired`; `showWhen crossmark` only
when `doiVersioning` is off), `credentialsExplanation`, `username`,
`password`, `testMode`. OPS `CrossrefSettings.php`: no `crossmark`, no
`updatePolicyDoi`, no requirements notice. Live-probed 2026-09-26 (Fields, the Crossref
block; Rules 37, 38), OJS and OPS: "Crossref Settings", the notice on a
journal without publisher or ISSN (publisher only: only the ISSN line;
an ISSN only: only the publisher line; both: none; each "Journal
Settings Page" link opens Settings › Journal in a new tab; "Save" with
the notice shown answered "Saved"); "Depositor name" empty: "This field
is required.", 61 characters: "This may not be greater than 60
characters."; "Depositor email" "not-an-email": "This is not a valid
email address.", 91 characters refused; "Username" 121 and "Password"
51 characters refused; "Crossmark" and its "Learn more." link on a
journal only; "Testing" unticked on arrival. An empty required box is
refused in the browser, a server refusal also shows the page notice.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-26 (Rule 35; A5, A6), OJS and OPS, and
DataCite on a journal: a 61-character "Depositor name", a valid email,
"Enable automatic depositing" ticked and "Save" showed the message under
the box and in the footer; after a reload the list read "Crossref",
"Enable automatic depositing" was ticked, the depositor boxes were empty,
and the Setup tab no longer listed the galley box. A refused DataCite
save kept "DataCite" the same way.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-26 (Fields, "Update Policy DOI"; Rule 38),
OJS; a preprint server's block has no such box, with "No" or "Yes":
with "DOI Versioning" "No" the box is hidden while "Crossmark" is
unticked and shown as "Update Policy DOI *" once it is ticked; with
"Yes" it shows with "Crossmark" unticked. Empty: "This field is
required."; "policy": "This is not formatted correctly."; "10.1234/policy":
"Saved", read back after a reload.

<a id="fn-f"></a>
**f** — `ojs/plugins/generic/datacite/classes/DataciteSettings.php`: no
required fields; `username`, `password`, `testUsername`, `testPassword`,
`testDOIPrefix` max 50; `addValidationChecks()` requires `testDOIPrefix`
with `testMode` (`plugins.importexport.datacite.settings.form.testDOIPrefixRequired`);
preamble `…datacite.settings.description` and `…datacite.intro`.
`DatacitePlugin::isPluginConfigured()`: required props, then the prefix
(or the test prefix under test mode). Live-probed 2026-09-26 (Fields,
the DataCite block), OJS; no DataCite row on a press's or a preprint
server's Plugins list: the heading, the two opening texts, "Username
(symbol)" plain and "Password" hidden, "Test Username" plain and "Test
Password" hidden, 51 characters in each refused with "This may not be
greater than 50 characters." and 50 accepted; "Testing" with its text,
unticked. The "Test DOI Prefix" box shows whether or not "Testing" is
ticked.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-26 (Fields, "Test DOI Prefix"; Settings
bullet 10), OJS: "Testing" ticked with "Test DOI Prefix" empty: "A test
DOI prefix is required when using the test system for DOI
registration." and "Please correct one error."; "10.5072": "Saved", read
back after a reload.

<a id="fn-g"></a>
**g** — `ojs|omp|ops/templates/management/dois.tpl` (heading
`doi.manager.displayName`, tabs `submission-doi-management` label
`article.articles` / `submission.list.monographs` / `common.publications`,
OJS `issue-doi-management` `issue.issues`); `DoisHandler::getTemplateVariables()`
(OJS: Articles tab when `publication`, `representation`, `peerReview` or
`authorResponse` is enabled; Issues tab on `issue`; OMP and OPS: any
kind). List panels: `lib/pkp/classes/components/listPanels/PKPDoiListPanel.php`
(`count` 30, the "Status" and "Registration" filters), app
`classes/components/listPanels/DoiListPanel.php` (OJS issue autosuggest
`FieldSelectIssues` on the submissions list; OMP/OPS "Publication
Status"), titles `doi.manager.submissionDois` ("Article DOIs", "Monograph
DOIs", "Preprint DOIs") and `doi.manager.issueDois`. Vue:
`components/Container/DoiPage{OJS,OMP,OPS}.vue`,
`components/ListPanel/doi/DoiListPanel.vue` (+ `DoiListPanel{OJS,OMP,OPS}.vue`).
Live-probed 2026-09-26 (Fields, the DOIs page; Rules 14, 23), all three
apps: heading "DOIs"; tabs and list titles as stated ("Issues" alone
gives only an "Issues" tab; galleys or "Peer Review" alone an "Articles"
tab; a press with "Files" alone still shows "Monographs"); the header's
"Search", "Bulk Actions" and, with an agency configured only, "Deposit
All"; 30 items on the first page, "Previous 1 2 Next", the 31st on page 2.

<a id="fn-o"></a>
**o** — `DoiListPanel.vue` `<Search>` (`common.search`,
`common.clearSearch`; the phrase is sent on Enter), filters sidebar
(`common.filter` "Filters", `addFilter()`: `unregistered` also sets
`doiStatus` unregistered and the published status; one value per
param), `openStatusInfoModal()` →
`DoiStatusInfoModal.vue` (`manager.dois.help.statuses.title`, rows
needsDoi, doiAssigned, unregistered, submitted, registered, error, stale
with their `.description`); the button holds only an icon. Search:
`PKPSubmissionController` `searchPhrase` → `Collector::searchPhrase()`;
`Doi::beginsWithDoiPrefixPattern()` (`/^\d+\./`) switches to
`addFilterByAssociatedDoiIdsToQuery()` (`LIKE '{phrase}%'` over the
enabled kinds' DOIs). Filters: `Collector::addHasDoisFilterToQuery()`,
`addDoiStatusFilterToQuery()` (app copies). Live-probed 2026-09-26
(Fields, "Search"; Rule 21), all three apps, two runs each: typing a
phrase left the list as it was, Enter narrowed it; title words (first
or middle) and a contributor's given or family name find the work;
"Clear search phrase" appears once a phrase is set and empties the box
and the list's filter.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-26 (Fields, "Filters"; Rule 22), all three
apps: each filter narrows the list, reads chosen and gains "Clear
filter: {name}"; pressing it again lifts it; "Needs DOI" then "DOI
Assigned" leaves only the second; "Unregistered" then "Registered" only
the second; "DOI Assigned" with "Registered" combine. "Unregistered"
keeps published works with an "Unregistered" DOI and drops unpublished
ones. On a journal and a preprint server a work with its own DOI set and
its galley's empty is under both "Needs DOI" and "DOI Assigned"; on a
press a book with its own DOI and no file DOI is not under "Needs DOI"
(two runs). The journal's "Issues" box suggested nothing for "Vol" or
"1", "Vol. 1 No. 1 (2025)" for "2025" and "Vol. 1 No. 1", and choosing
it kept that issue's articles; the box is absent on the "Issues" tab.
The info button opens "DOI Statuses", a "Status" / "Description" table
of seven lines ("DOI Assigned — All items assigned a DOI." after "Needs
DOI"); the button has no label, `aria-label` or title.

<a id="fn-p"></a>
**p** — `DoiListPanel.vue`: `openBulkExport()`, `openBulkMarkRegistered()`,
`openBulkMarkUnregistered()`, `openBulkMarkStale()`, `openBulkAssign()`
(`canAssignDois`: prefix and a kind), `openBulkDeposit()`,
`openBulkDepositAll()`; `openBulkActionDialog()` (title = label, the
`…prompt` message, buttons label + `common.cancel`); `onBulkActionComplete()`
reloads and clears `selected`; `failedDoiActions` → dialog
`manager.dois.update.failedCreation` with `DoiFailedActionDialogBody.vue`;
other errors → `ajaxError`, which showed no window on the drive. API:
`lib/pkp/api/v1/dois/PKPDoiController.php` `assignSubmissionDois()`
(no ids → `api.404.resourceNotFound`; no prefix → 403
`api.dois.403.prefixRequired`), `markSubmissionsRegistered()` (valid =
current publication published; else `DoiException::SUBMISSION_NOT_PUBLISHED`
per item, nothing marked), `markSubmissionsUnregistered()` (any of the
context's submissions), `markSubmissionsStale()` (published and
`doiStatus` submitted/registered, else `INCORRECT_STALE_STATUS`),
`exportSubmissions()` (`getExportableDOIsSubmissionIds()`, else
`api.dois.400.invalidPubObjectIncluded`; a second temporary file for
peer reviews when the agency and the context both allow `peerReview`),
`depositSubmissions()` (published only; dispatches `DepositSubmission`,
`markSubmitted()`), `depositAllDois()` → `Repository::depositAll()`
(`DAO::getAllDepositableSubmissionIds()`: statuses unregistered, error,
stale); OJS `api/v1/dois/DoiController.php` the issue twins
(`ISSUE_NOT_PUBLISHED`). Empty selection: the ids array is empty →
`api.dois.404.noPubObjectIncluded`. Live-probed 2026-09-26 (Rules 24–29),
all three apps (export and deposit OJS Crossref and DataCite, OPS
Crossref; the manager, the Editor and the Site Administrator alike):
"Bulk Actions" and "Take action on {count} selected item(s)." as
stated, the count following the ticks; every action's window with its
question, its button and "Cancel"; "Cancel" sends nothing and keeps the
ticks; after any confirmed action the list reloads with nothing ticked.
"Assign DOIs" is missing from a context without a prefix; it gave the
missing DOIs in the "Default" shape and left carried ones alone
("Items successfully assigned new DOIs"), the unpublished issue's own
DOI on the "Issues" tab included; a pattern needing an issue gave the
"DOI Updates Failed" window while the other ticked work got its DOI.
"Mark DOIs Registered", "Unregistered" and "Needs Sync" gave the success
notices and the "DOI Updates Failed" lines as quoted, on the "Issues"
tab too. "Deposit DOIs" set "Submitted" at once and after a reload;
"Deposit All" set every published "Unregistered" and "Needs Sync" work,
and the published issue, to "Submitted", leaving the rest. Every
confirmed "Export DOIs" answered 400 "An XML validation error occurred
and the XML could not be exported." with nothing downloaded: the
install fetches the agency's schema
(`https://www.crossref.org/schemas/crossref5.4.0.xsd`,
`http://schema.datacite.org/meta/kernel-4/metadata.xsd`) through the
test installs' dead proxy, so the file, the peer-review second file and
"Items successfully exported" are code-read only.

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-26 (Rules 24, 26, 29; A13), all three
apps: with nothing ticked each action's window opened reading "0
item(s)"; its button sent the request, which answered 404 ("No valid
publication objects were included with the request.", for "Assign DOIs"
"The requested resource was not found."), and the window closed with no
other window or notice (a watcher on the page saw none; OJS twice). One
published and one unpublished item ticked: "Mark DOIs Registered"
marked nothing and listed the unpublished one in "DOI Updates Failed";
"Export DOIs" and "Deposit DOIs" answered 400 "One or more invalid
publication objects were included with the request." and closed with
no message, both items keeping their badges.

<a id="fn-m"></a>
**m** — `components/ListPanel/doi/DoiListItem.vue`: tick box, title link
(`target="_blank"`), `{{ item.id }}`, the badge (`publicationStatusLabel`
when unpublished, else `getDepositStatusString()` of
`currentVersionDoiObjects[0]`), `Expander` ("Show more details about
{id}"); expanded: `versionString`, `PkpTable` columns `common.type`,
`manager.dois.title`, `common.status`, `grid.columns.actions`, rows
`currentVersionDoiObjects`, `common.viewError` link on error; versions bar
(`doi.manager.versions.countStatement`, `doi.manager.versions.view`) when
`versions.length > 1` and `versionDois`; Edit/Save
`:is-disabled="isDeposited(itemDepositStatus) || isSaving"`; the
depositor panel (`manager.dois.registration.*`: `notPublishedDescription`,
`notSubmittedDescription`, `submittedDescription`,
`manuallyMarkedRegistered` when the DOI's `registrationAgency` is null;
buttons `viewRecord` when deposited with a registered message,
`depositDois` when published and not deposited, `viewError` on error with
a message). `useDoi.js` (`isDeposited`: submitted, registered). Row
building: `DoiListPanelOJS.vue` `addDoiObjects()` (`article.article`,
galley label, `submission.peerReview.identified`,
`submission.reviewRound.authorResponse.identified`, `issue.issue`),
`DoiListPanelOMP.vue` (`submission.monograph`, chapters,
`manager.dois.formatIdentifier.file`, "{format} / {file}"),
`DoiListPanelOPS.vue` (`submission.publication` "Preprint", galleys).
`DoiItemVersionModal.vue` (`doi.manager.versions.modalTitle`; header
"{versionNumber} ({datePublished})" or `publication.status.unpublished`;
one Edit/Save for the whole window).
`DoiListPanel.getVersions()` keeps the newest minor per stage and major.
Live-probed 2026-09-26 (Fields, an item's row and expanded view; Rules
16, 17, 19, 20, 30), all three apps: the row's tick box, "Lovelace —
Axolotl limb memory" as a link opening the version's public page in a
new tab (for an unpublished work too, the manager seeing its preview),
the submission ID, the badge, the expander "Show more details about
{id}"; the expanded view "Version of Record 1.0" (a preprint "Author
Original 1.0"; an unpublished first version "Unassigned version
({date})") over "Type" / "DOIs" / "Status" / "Actions", rows "Article",
"PDF", a press's "PDF / article.pdf", an issue's "Issue"; "Edit" greyed
while "Registered" (three apps) and "Submitted" (journal), enabled again
after "Mark DOIs Unregistered", and enabled while "Needs Sync". With a
newer version created and unpublished the expanded view kept showing
the published version.

<a id="fn-n"></a>
**n** — `DoiListItem.saveDois()`: only changed boxes; no DOI yet →
`POST api/v1/dois` then `PUT api/v1/_dois/{publications|galleys|issues|
peerReviews|…}/{id}` with `doiId`; emptied → `DELETE api/v1/dois/{id}`;
changed → `PUT api/v1/dois/{id}` (with `pubObjectType`/`pubObjectId` when
versioning); any failure → `manager.dois.update.partialFailure` warning
and `updateMutableDois()` (the old values); success →
`manager.dois.update.success`. Validation: `lib/pkp/schemas/doi.json`
(`doi` `regex:/^\d+(.\d+)+\//`), `Repository::validate()`
(`isDuplicate()` across all contexts →
`doi.editor.doiSuffixCustomIdentifierNotUnique`; characters outside
`[-._;()/A-Za-z0-9]` → `doi.editor.doiSuffixInvalidCharacters`); no check
against the context's `doiPrefix`. Made DOIs (`mintAndStoreDoi()`) skip
`validate()`. Live-probed 2026-09-26 (Rule 9), all three apps: a typed
DOI carried by another journal's work, or by another work of the same
journal, is refused; two published works of one context both carry the
same made DOI under a pattern of fixed text.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-26 (Fields, a DOI box; Rule 18; A3, A7),
all three apps, the journal twice: "abc" and "10/x…" refused ("This is
not formatted correctly." in the answer), "10.1234/a b" and "…<x>"
refused ("The DOI contains invalid characters."), another journal's DOI
and another work's DOI of the same journal refused ("The given DOI
suffix is already in use for another published item. Please enter a
unique DOI suffix for each item."); the screen showed only "Some DOI(s)
could not be updated" and the old value, on the page and after a reload.
"10.1234/…abc" and "10.9999/…abc" accepted with "DOI(s) successfully
updated" top right. Emptying the box removed the DOI, the row reading
"Needs DOI" (an unpublished work's badge staying "Unpublished"). One
"Save" with one box refused and one accepted showed both notices. A box
typed in and not saved stayed in editing across a tab switch (journal)
and a collapse of the row, and the old value was back after leaving the
page, with no question asked.

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-26 (Rule 3; A1), all three apps, twice:
with no prefix, a "DOI Versioning" change and "Save" answered "A DOI
prefix is required" under the box; unticking "DOIs" and "Save" then
answered "Saved", and on ticking the box again the changed radio (and
"Never", on a second context) showed after a reload; ticking "DOIs" and
"Save" was refused again; unticking the box with the message shown
cleared it at once.

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-26 (Rule 4), all three apps: galleys
(journal, server) or "Files" (press) unticked and saved: the item's
second row leaves the page, and the reader page keeps the work's DOI;
"Mark DOIs Registered" marked the work's row "Registered"; the kind
ticked again: its row returns with its old DOI, "Unregistered".

<a id="fn-h"></a>
**h** — Moments: `lib/pkp/classes/observers/listeners/AssignDOIs.php`
(`DecisionAdded`, `copyEditCreationTime` and a new stage of Copyediting
or Production → `Repo::submission()->createDois()`, the current
publication), `VersionDois.php` (`PublicationPublished`, DOIs on and not
`neverCreationTime` → `Repo::publication()->createDois()`), OPS
`classes/observers/listeners/AssignDOIsOnSubmission.php`
(`SubmissionSubmitted`, `copyEditCreationTime`). `createDois()` (each
app's `classes/publication/Repository.php`): each enabled kind with an
empty `doiId`; peer reviews from `getCompletedReviewAssignments()` that
are publicly visible (`mintDoi()`); exceptions collected, never shown by
the listeners. Minting: `lib/pkp/classes/doi/Repository.php`
`mintAndStoreDoi()` (no prefix → `DoiException` "missingPrefix"),
`generateDefaultSuffix()` → `DoiGenerator::encodeSuffix()` (Crockford
base32 of a random number, lower case, plus a two-digit ISO 7064
checksum, left-padded with "0" to eight characters); app `mint*Doi()`:
`default` → that suffix, otherwise `generateSuffixPattern()`
(`customPattern` → `PubIdPlugin::generateCustomPattern()`; `customId`
("None") → the empty string, so the stored DOI is "{prefix}/");
`mintDoi()` for reviews: `default` → suffix, anything else → empty.
Issue-pattern check `PubIdPlugin::suffixHasIssuePattern()` (`%v`, `%i`,
`%Y`) → `DoiException::PUBLICATION_MISSING_ISSUE` /
`REPRESENTATION_MISSING_ISSUE`. Live-probed 2026-09-26 (Rules 5, 6a;
Settings bullets 3–5), all three apps: every "Default" suffix seen
(fifteen, e.g. `1v7kz926`, `m2g80720`, `texzf150`) was eight lower-case
letters and digits ending in two digits, one per item; a kind left
unticked got nothing at publish; without a prefix an Accept or a publish
made nothing ("Needs DOI"); a DOI typed before the publish survived it.

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-26 (Rule 5), all three apps. "Upon
reaching the copyediting stage": the Accept gave the article and its
galley their DOIs (journal), the monograph, its publication format and
the format's file theirs (press); a work whose DOI was cleared at
Copyediting got a new one at "Send To Production"; a preprint and its
galley got theirs at the Author's final "Submit". A work sent on before
its galley existed got the galley's DOI at publication. "Upon
publication": after the Accept the work read "Needs DOI", and the
publish (a preprint's "Post") gave the work and its galleys, formats and
files their DOIs; on a journal an article scheduled into a future issue
("This will be published when Vol. 2 No. 1 (2026) is published…") had
its DOI before "Publish Issue", seeded or scheduled on screen. "Never":
the Accept and the publish left "Needs DOI" until "Assign DOIs".

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-26 (Rule 6b; A2), all three apps: under
"None", "Assign DOIs" on two items gave both "10.1234/", publishing under
"Upon publication" gave "10.1234/", and the reader page shows "DOI:
https://doi.org/10.1234/".

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-26 (Rule 6c; A9), all three apps: on a
scratch journal with "Journal initials" "JPK" and no abbreviation,
"%j.v%vi%i.%a" on an accepted article with no issue: "Assign DOIs"
showed "DOI Updates Failed" with the issue line; after "Assign To Future
Issue and Schedule Only" › "Vol. 1 No. 2 (2014)", "Assign DOIs" gave
`10.1234/jpk.v1i2.799`. "%j.%p" gave `jpk.12-34` with "Pages" "12-34"
and `10.1234/jpk.%p` without, listed "Unregistered" (two runs). A press's
"%p.%m" gave `jpk.619`, a server's "%j.%a" `jpk.491`. "k2.%x" gave
`10.1234/k2.{Publisher ID}` with a Publisher ID typed on the Metadata page
and `10.1234/k2.%x` without, with "Items successfully assigned new DOIs"
(three apps). A peer review under "Custom pattern" got `10.1234/`,
under "Default" an eight-character suffix.

<a id="fn-j"></a>
**j** — Rows: `Repo::publication()->getReviewDoiItemsGroupedByPublication()`
(review assignments `filterByIsConfirmedByEditor(true)`,
`filterByIsPubliclyVisible(true)` on the version's review rounds) →
`reviewDoiItems` in the publication map; `DoiListPanelOJS.vue`
`peerReview` rows, labelled "Peer Review {$identifier}" with the review
assignment's ID. Minting: `createDois()` over completed, publicly
visible assignments. Edit: `PUT api/v1/_dois/peerReviews/{id}` refuses a
review that is not publicly visible (422
`api.dois.reviews.422.cannotAssignDoi`). Author-response DOIs: the kind is
commented out of `DoiSetupSettingsForm` (OJS), so they are never offered.
Reader display: `lib/pkp/classes/components/OpenReviewComponent.php` is
configured but mounted by no template. Live-probed 2026-09-26 (Settings
bullet 12), OJS: Settings › Workflow › Review "Publicly Show Reviewer
Comments" arrives unticked and each review's box follows it; the box is
in the reviewer row's "More Actions" › "Edit" window, for the Journal
Manager and the assigned Section Editor alike.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-26 (Rule 7), OJS, two runs of each path:
a submitted review with "Publicly Show Reviewer Comments" ticked got its
DOI at the Accept, before any "Mark as Complete"; one with the box
unticked got none at the Accept or by "Assign DOIs". An Accept that sent
the "Notify Reviewers" email turned the reviewer row to "Reviewer
Thanked" and listed "Peer Review 188" at once; with the email skipped
the row appeared only after "Mark as Complete". The rows read "Peer
Review 186" … "192" (the review assignments' IDs), under the work's
current version. The published article's page (visitor) carries no
review DOI.

<a id="fn-i"></a>
**i** — `ojs/classes/controllers/grid/issues/IssueGridHandler.php`
`publishIssue()`: on the confirmed first publish
`Repo::issue()->createDoi()` (enabled `issue` kind and no `doiId`; no
`doiCreationTime` check), then `Repo::doi()->issueUpdated()` (stale) and
each scheduled publication's `publish()`; `unpublishIssue()` →
`issueUpdated()`. `ojs/classes/doi/Repository.php` `mintIssueDoi()`.
Live-probed 2026-09-26 (Rule 8; OJS1), OJS: under "Never" and "Upon
publication", "Publish Issue" › "OK" gave the issue a DOI
(`10.1234/r7wqr642`), "Unregistered"; an issue DOI typed on the "Issues"
tab before the publish was kept; a cleared issue DOI came back through
"Assign DOIs"; under "Never" the article scheduled in the issue stayed
"Needs DOI".

<a id="fn-k"></a>
**k** — `lib/pkp/classes/publication/Repository.php` `version()`: with
`doiVersioning` and not `$isMinorVersion` the new publication's `doiId`
is cleared; app `version()` overrides clear the galleys' (OJS, OPS),
formats', files' and chapters' (OMP) the same way, except that OPS's
clears the galleys' whenever `doiVersioning` is on, minor version or not.
Editing with versioning: `PKPDoiController::edit()` / `delete()` with
`pubObjectType`/`pubObjectId` act on `getMinorVersionsWithSameDoi()`
(a new DOI record for that version family, the old one deleted when no
longer used). "Major Revision" / "Minor Revision" are the Create New
Version dialog's radios (the versions spec, Rule 12). Live-probed
2026-09-26 (Rules 11, 13; Settings bullet 6), all three apps: under
"No", a new version started with its source's DOI, its galleys, formats
and files with theirs, and a change on the DOIs page changed both
versions; "No" → "Yes" kept the earlier versions' shared DOI and the next
major version started without; "Yes" → "No" gave the next version its
source's DOI. A new journal and press arrive on "No", a preprint server
on "Yes".

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-26 (Rules 12, 20; OPS4), all three apps:
under "Yes" a major version started with no DOI on the work, its galley,
format or file, and its publish made them (under "Never" none); a minor
version kept the work's DOI and, on a journal and a press, its galley's,
format's and file's, while on a preprint server its galley read "Needs
DOI" in the "View all" window. Editing the newest block's work DOI in
"View all" changed 2.0 and 2.1 and left 1.0. With 1.0 and an unpublished
2.0 the view read "There are 2 versions."; with 1.0, 2.0 and 2.1 still
"There are 2 versions.", the window holding "Version of Record 1.0
({date})" and "Version of Record 2.1 Unpublished" (a preprint "Author
Original …") as links opening in a new tab, and one "Edit" beside
"Close". While a journal of the install was on "Yes", `publicknowledge`'s
OAI answered a server error, and again 200 once it was set back to "No";
the press and preprint-server installs answered 200.

<a id="fn-l"></a>
**l** — `onDoiPage` → `Collector::filterByOnDoiPage()`; app
`addOnDoiPageFilterToQuery()`: OJS and OMP `stage_id` in Copyediting,
Production, or a publication published or carrying a DOI (galley,
review, chapter, format DOIs likewise); OPS `stage_id` Production or the
same. `getQueryBuilder()` returns no rows when none of the enabled kinds
is in the app's `getAllowedDoiTypes()` (OMP's list lacks `file`). Order:
`Collector::$orderBy` default date submitted, descending. The issue list
reads `api/v1/issues` with no filter. Live-probed 2026-09-26 (Rule 15):
see q17; a journal's seeded scheduled article that carried a DOI was
listed from the Submission stage and left the list once its DOI was
cleared.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-26 (Rule 15; OPS5), all three apps: on a
journal and a press, works at Submission and Review with no DOI are not
listed; Copyediting, Production and published works are; an unfinished
draft is not. On a preprint server an unfinished draft is listed
("Unpublished", its row "Needs DOI"), both a seeded one and one an
Author started with "Begin Submission". The "Issues" tab lists a
published and an unpublished issue. Newest submitted first; works
submitted in the same second come in no fixed order.

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-26 (Rule 21; A11), all three apps, two runs
each, read on the list and in the page's own list request: on a journal
the article's DOI start ("10.1234/sj") finds the work and a galley's DOI
start finds nothing; on a press the monograph's own DOI finds nothing,
even whole, a file's DOI start finds the book, and "10.1234/" lists only
books with a file DOI; on a preprint server nothing is found, "10.1234/"
included; a suffix without its prefix finds nothing. Cause, in the code
and consistent with the drive: each app's
`Collector::addFilterByAssociatedDoiIdsToQuery()` builds the first
enabled kind's branch on a query that also carries `whereRaw('1 = 0')`,
so that branch never matches and only the union branches count (OJS
galleys first, OMP publication first); OPS puts the `1 = 0` on the outer
query, which empties every DOI search.

<a id="fn-q20"></a>
**q20** — Live-probed 2026-09-26 (Rule 30; A4, A16), OJS Crossref and
DataCite, OPS Crossref; the press and a context without an agency show
no panel: the box is headed "Crossref" / "DataCite"; an unpublished work
reads "This item cannot be deposited until it has been published." with
no button; a published "Unregistered" work "The metadata for this item
has not been submitted to Crossref." ("…DataCite.") with "Deposit
DOI(s)", which opens "Deposit DOIs" for that item alone; after "Mark
DOIs Registered", "This item has been manually registered with a
registration agency." with no button; a "Needs Sync" work (marked
"Registered", then "Needs Sync") "…has not been submitted…" with
"Deposit DOI(s)". After "Deposit DOI(s)" or "Deposit DOIs" the panel read
"manually registered" at once, after a reload and after the background
jobs had run and failed. "Deposit DOI(s)" is greyed while the row is
being edited. The "Registered through the agency" row, "View Record"
and "View Error" were not reachable (Rule 33).

<a id="fn-r"></a>
**r** — Statuses: `lib/pkp/classes/doi/Doi.php` (1 unregistered, 2
submitted, 3 registered, 4 error, 5 stale; `getResolvingUrl()`
`https://doi.org/` + the DOI); `DAO::markStale()` (only from submitted or
registered), `markSubmitted()` (status only; `registrationAgency` left
as it was); `Repository::markRegistered()` (`registrationAgency` null),
`markUnregistered()`. Automatic "Needs Sync":
`lib/pkp/classes/publication/Repository.php` `publish()` (versioning: a
new major version is meant to mark all the submission's DOIs, the newest
minor its publication's; no versioning: the current publication's) and
`unpublish()`; OJS `Repository::issueUpdated()`. Deposit jobs:
`lib/pkp/jobs/doi/DepositSubmission.php`, `DepositPeerReview.php`,
`DepositContext.php`, OJS `jobs/doi/DepositIssue.php`; the agencies'
`updateDepositStatus()` set registered or error with the stored message
(`CrossrefExportPlugin`, `DataciteExportPlugin::depositXML()`). No mail
or notification in `lib/pkp/classes/doi`, `api/v1/dois`, `api/v1/_dois`,
`jobs/doi` or the agency plugins. The test installs' proxy is a
dead port (seed facts), so every deposit request fails at connection.
Live-probed 2026-09-26 (Rule 31; Side effects), all three apps: the
"DOI Statuses" window's six status lines match the table verbatim, plus
"DOI Assigned"; badges seen "Needs DOI", "Unregistered", "Submitted",
"Registered", "Needs Sync", "Unpublished"; on one DataCite work whose
"Article" row was emptied while its "PDF" row read "Submitted", the badge
read "Unregistered" and "Deposit All" skipped it (seen once, so the rule
states only the case with a DOI on the first row). No email reached the
context's users (the mail catcher held none for the manager, the editor
or the authors) and no notification was created. The work's Activity
Log gained "Submission metadata updated" under the manager for "Assign
DOIs" and a DOI typed on a work without one (a press's file: "The
metadata for file "article.pdf" was edited by {username}."); on a
preprint server every saved change or clearing logged it; on a journal
and a press changing or clearing a DOI and the Mark actions logged
nothing. "Deposit DOIs" and "Deposit All" queued a job per work (and per
issue) whose attempts went to `https://api.crossref.org/v2/deposits`
and `https://mds.datacite.org/metadata`.
Live-probed 2026-09-29 (Side effects, "Activity Log, no mail"), two runs,
the Journal Manager "Mia Manager" on scratch contexts with the prefix
"10.1234", an item in Production (a preprint submitted) published from
its workflow (a journal through "Review Publishing Details" › "Confirm"
› "Publish"), History read right after and after a fresh load. "Upon
publication", no DOI yet, all three apps: the publish made the DOI
(`10.1234/…` in `dois` after, none before) and History gained "The
submission was published." ("The submission was posted."), "Mia Manager
moved this submission to the Done stage." and one "Submission metadata
updated" under "Mia Manager"; on a press the same publish made the
book's, one chapter's ("Chapter Page" ticked; the unticked chapter got
none) and the format's DOI with that single line and no file or format
line. The line follows the publish and Done lines in `event_log`; the
History grid lists same-day rows in no fixed order. A DOI already made
under "Upon reaching the copyediting stage" ("…production stage"),
"Never", and "DOIs" unticked: no DOI line at publish, all three apps. On a journal every such publish also
logged one "Submission metadata updated" at the panel's "Confirm",
already present while the publish window was open (four contexts, DOIs
on and off). OJS and OMP, "Upon reaching the copyediting stage": the
manager recorded "Accept and Skip Review" (Notify Authors, Select Files,
"Record Decision"); the DOI was made and History gained "Mia Manager
skipped the review stage and sent this submission to the copyediting
stage.", the decision email and one "Submission metadata updated" under
"Mia Manager".

<a id="fn-q21"></a>
**q21** — Live-probed 2026-09-26 (Rule 32; A17), all three apps: a
"Registered" work unpublished (a preprint "Unpost") reads "Needs Sync"
in its expanded row (the badge "Unpublished") and stays so when
published again; a "Registered" work under "No" read "Registered" after
"Create New Version" and "Needs Sync" once the new version was
published; a "Submitted" work unpublished reads "Needs Sync"; an
"Unregistered" work stays "Unregistered" through both. Under "Yes": a
new minor version 1.1 of a "Registered" 1.0, published, turned the
shared DOI "Needs Sync"; a new major version 2.0, published, got its own
"Unregistered" DOI and 1.0's stayed "Registered" (one run per app). OJS
issue: "Registered", "Unpublish Issue" ("Are you sure you want to
unpublish this published issue?") → "Needs Sync", published again →
"Needs Sync"; the untouched issue stayed "Unregistered". Cause for
A17, in the code: `publish()` compares the version being published with
itself when deciding whether it is a new major version.

<a id="fn-q22"></a>
**q22** — Live-probed 2026-09-26 (Rule 33; A18), OJS Crossref and
DataCite, both with and without "Testing", OPS Crossref, deposits from
"Deposit DOI(s)", "Deposit DOIs" and "Deposit All", the queue drained
with the install's own worker three times: every job failed at
connection ("cURL error 7: Failed to connect to …"), was retried twice
and landed among the failed jobs; every deposited item still read
"Submitted", with no "View Error" in the row or the panel. The
"Registration Error Message" window was therefore not seen; its wording
is code-read.

<a id="fn-s"></a>
**s** — `isPluginConfigured()`: OJS `CrossrefPlugin` (the schema's
required props, `doiPrefix`, `publisherInstitution` and `onlineIssn` or
`printIssn`), OPS `CrossrefPlugin` (required props, prefix, `publication`
enabled), `DatacitePlugin` (required props, then the prefix or, in test
mode, `testDOIPrefix`). `PKPDoisHandler::_getRegistrationAgencyInfo()`
passes `isConfigured` to the list, which gates export, deposit, "Deposit
All" and the panel (`isRegistrationPluginConfigured`). Live-probed
2026-09-26 (Rule 36; Settings bullet 13), OJS and OPS, the press as
control: Crossref on a journal offered nothing without publisher and
ISSN, with the publisher only, or with "Online ISSN" only, and
everything with the publisher and either ISSN; nothing while the
depositor fields were unsaved. Crossref on a preprint server: nothing
before the save, everything after; unticking "Preprints" there removed
the side menu's "DOIs" and the page answered "You cannot call this
operation without DOIs enabled.". DataCite: everything as soon as it was
chosen and saved, and with "Testing" and a "Test DOI Prefix".

<a id="fn-u"></a>
**u** — OJS `CrossrefPlugin::validate()` on `Publication::validatePublishWarnings`:
skipped unless Crossref is the chosen agency, `publication` is
enabled and `doiCreationTime` is not `publicationCreationTime`; rules
`publisherInstitution` required, `onlineIssn`/`printIssn`
`required_without`, `doi` required, `issueId` in the context; messages
`plugins.generic.crossref.publisherInstitution.required`,
`…issn.requiredWithout`, `…doi.required`, `…issueId.invalid`.
Live-probed 2026-09-26 (Rule 39): see q23; the list also shows while
Crossref is chosen but not yet configured.

<a id="fn-q23"></a>
**q23** — Live-probed 2026-09-26 (Rule 39; OJS3), OJS, two processes and
two journals: Crossref chosen (depositor fields saved, no publisher or
ISSN), "Articles" ticked, under "Never" and "Upon reaching the
copyediting stage": the "Schedule For Publication" window lists under
"The following issues were found, but will not prevent publishing" the
publisher line, the ISSN line twice, and 'The submission "{title}" is
not associated with a DOI and cannot be deposited with Crossref.'; with
a DOI assigned the last line goes; with publisher and ISSN saved only
the DOI line shows. "Upon publication", "Articles" unticked, or no
agency: no list. "Publish" goes ahead. A preprint server's "Post the
preprint" window lists nothing.

<a id="fn-v"></a>
**v** — `lib/pkp/classes/task/DepositDois.php` (dispatches
`DepositContext` per enabled context; `DepositContext` returns unless
`automaticDoiDeposit`, then `Repo::doi()->depositAll()`, the items
"Deposit All" sends); registered daily only in
`ojs/classes/scheduler/Scheduler.php`; `omp` and `ops`
`classes/scheduler/Scheduler.php` do not register it. Read 2026-09-26
(Rule 41; OPS2) from each install's own task list
(`lib/pkp/tools/scheduler.php list`, read only): the journal install
lists `PKP\task\DepositDois` daily (`0 0 * * *`), the press and
preprint-server installs none. The box saved ticked and read back after
a reload (OJS, OPS). The test installs run no scheduled task
(`task_runner = Off`), so what the task deposits was not seen.
Live-probed 2026-09-26 (Rule 41): "Enable automatic depositing" with its
help, saved ticked and read back after a reload on OJS and OPS.

<a id="fn-t"></a>
**t** — OJS `CrossrefPlugin`: hooks registered only while the plugin is
enabled; `isCrossmarkEnabled()` = the `crossmark` setting and the
requested publication's own `getDoi()`, with no check of the chosen
agency; `setupCrossmarkButton()` loads
`https://crossmark-cdn.crossref.org/widget/v2.0/widget.js` and the
plugin's `public/build/crossref.js`; `displayCrossmarkButton()` on
`Templates::Article::Details` renders `templates/crossmarkButton.blade`
(`<section class="item crossmark">`,
`resources/js/components/CrossrefCrossmarkButton.vue`: an
`<a data-target="crossmark">` around the Crossmark logo, alt
"Crossmark"); `addCrossmarkDoiMeta()` adds `DC.Identifier.DOI`.
Live-probed 2026-09-25 (U13 claim check): with Crossref chosen and
Crossmark ticked and saved, the article page gained `.item.crossmark` as
the side column's last block; OPS's block has no Crossmark box.
Live-probed 2026-09-26 (Side effects, head tags), OJS: with "Crossmark"
ticked the current article's head carries two `DC.Identifier.DOI` tags
with the same DOI (Dublin Core's and the Crossmark one) and the widget
script; an older version's page one tag and the block; without
Crossmark one tag, no widget, no block.

<a id="fn-q24"></a>
**q24** — Live-probed 2026-09-26 (Rule 42), OJS, two journals, signed
out; the preprint server shows no button: with the plugin enabled,
"Crossmark" saved ticked and a DOI, the side column ends with the
Crossmark block (alt text "Crossmark"); pressing it opens Crossref's
Crossmark window for that DOI in the page. No DOI: no button. A current
version 1.1 without a DOI has no button, its older 1.0 with one has it.
"None" saved as the Registration Agency: still shown; the plugin
disabled: gone; the agency chosen again: back; "Crossmark" unticked and
saved: gone.

<a id="fn-z"></a>
**z** — OJS `CrossrefPlugin` with crossref-ojs#108 (pkp/pkp-lib#13221,
dev-team#316): `CrossrefCitedBy::isCitedByEnabled()` = the configured
agency is `CrossrefPlugin`, its `citedBy` setting, and
`hasCrossrefCredentials()` (username and password both non-empty);
`setupCitedByComponents()` on `ArticleHandler::view` also needs any of
the submission's published publications to have a DOI, then passes the
submission id through `TemplateManager::setPiniaStoreData('crossrefCitedBy', …)`
(pkp-lib#13292) and loads `public/build/crossref.js`, and
`public/build/crossref.css` only when `isThemeActive('defaultthemeplugin')`
(the theme or a parent). `displayCitedByComponent()` on
`Templates::Article::Details`, registered after the Crossmark hook,
renders `templates/citedBy.blade` (`<section class="item crossref-cited-by">`,
`<crossref-cited-by-count>`, a `pkp-button` calling the store's
`openCitedByModal()`). `CrossrefCitedByController`
(`GET api/v1/crossref/citedBy/{submissionId}`, `PublicAccessPolicy`):
404 for an unknown id or no published DOI, 403 while
`isCitedByEnabled()` is false, else Crossref's `getForwardLinks` per
unique DOI, merged by citing DOI, cached a day under
`crossref-citedBy-{id}`; a failure answers 502 and is not cached (the
log line masks `usr` and `pwd`). `classes/CrossrefSettings.php`:
`citedBy` boolean, `required_if:citedBy,true` on `username` and
`password`. Store `resources/js/components/CitedBy/useCrossrefCitedByStore.js`
(ui-library#992 `usePkpPageData()`): `totalDisplay` "--" while loading
or failed; `copyAllToClipboard()` joins each work's parts with
`common.commaListSeparator`.

<a id="fn-w"></a>
**w** — `ojs/pages/article/ArticleHandler.php`,
`ops/pages/preprint/PreprintHandler.php`: `doiObject` = the shown
publication's, else with versioning `Repo::publication()->getMinorVersionsDoi()`,
else for a non-current version the current publication's;
`omp/pages/catalog/CatalogBookHandler.php` the same for the monograph.
`templates/frontend/objects/article_details.tpl` (and the OPS and OMP
copies): `{if $doiObject}` → `doi.readerDisplayName` "DOI" + ":", the
`resolvingUrl` as text and link; no check of `enableDois` or the kind.
The OAI records test `enableDois`. The issue page: `issue_toc.tpl` (the
issues spec). Live-probed 2026-09-26 (Actors row 4; Rule 10), all three
apps: signed out and signed in, the page shows "DOI:
https://doi.org/{DOI}" as a link; making, changing, clearing and
retyping the work's DOI on the DOIs page changed, at the next read, the
page's line, the head tags and the OAI records (the line and tags gone
while empty).

<a id="fn-q25"></a>
**q25** — Live-probed 2026-09-26 (Rule 43), all three apps: under "No"
an older version without its own DOI shows the current version's; under
"Yes" a version without its own shows a minor sibling's, a major version
with none shows no line, and before any DOI no line anywhere. With
"DOIs" unticked the page and its head tags keep the DOI while the OAI
ListRecords carry none; with only the work's kind unticked the OAI
records carry it again. A book's page also shows each format's DOI in
that format's details ("DOI:", then the link). The issue page shows
"DOI: https://doi.org/{issue DOI}" (OJS).

<a id="fn-x"></a>
**x** — `ojs/classes/plugins/DOIPubIdExportPlugin.php` `display()` for
the index renders the plugin's `templates/index.tpl`:
`manager.dois.settings.relocated` with `url page="dois"` and
`management/settings/distribution#dois`; the same template in
`ops/plugins/generic/crossref/templates/index.tpl` and
`ojs/plugins/generic/datacite/templates/index.tpl`.
`ImportExportPlugin::getActions()` gives the Plugins row a link to
`management/importexport/plugin/{name}`. The export plugins'
`getSettingsFormClassName()` throw ("DOI settings no longer managed via
plugin settings form."), which no link on the Plugins list opens.
Live-probed 2026-09-26 (Rule 44): see q26.

<a id="fn-q26"></a>
**q26** — Live-probed 2026-09-26 (Rule 44; A20), all three apps: Tools ›
"Import/Export" lists "Crossref XML Export Plugin" (journal, preprint
server) and "DataCite Export/Registration Plugin" (journal) on
`publicknowledge`, on a context without an agency, and with DataCite's
manager plugin off; a press lists neither. Each page
(`management/importexport/plugin/CrossrefExportPlugin`,
`…/DataciteExportPlugin`) holds only the notice; "DOI management" opens
the DOIs page, "DOI settings" Settings › Distribution › "DOIs" ›
"Setup"; the page's level-one heading is empty and the browser title is
the journal's name. The Plugins list has "Crossref XML Export Plugin"
and "DataCite Export/Registration Plugin" rows of their own, each with
"Import/Export Data" to the same page. The Editor reaches the page; the
Section Editor and the Author get "The current role does not have access
to this operation.".

<a id="fn-z1"></a>
**z1** — Read 2026-09-29 in the checkouts omp `3cd59e944`, its lib/pkp
`17a1f01fed`, ui-library `03d1cee2`. Rows:
`components/ListPanel/doi/DoiListPanelOMP.vue` `addDoiObjects()` walks
each publication of the book and pushes, each under its
`enabledDoiTypes` guard, the `publication` row
(`submission.monograph` "Monograph"), one `chapter` row per
`publication.chapters` (label the chapter's localized title, `disabled`
while `!chapter.isPageEnabled && !doiObject`), one `representation` row
per `publication.publicationFormats`
(`manager.dois.formatIdentifier.file` "Format / {$format}", OMP
`locale/en/manager.po`) and the `file` rows. The data:
`omp/classes/publication/maps/Schema.php` (each chapter's `_data` with
its `doiObject`; each format's with its `doiObject` and its files);
chapters from `ChapterDAO::getByPublicationId()` (`ORDER BY spc.seq`),
formats from the publication's `publicationFormats`.

<a id="fn-z2"></a>
**z2** — `DoiListItem.saveDois()`: a box on a row without a DOI sends
`POST api/v1/dois`, then the row's `updateWithNewDoiEndpoint`, `PUT
api/v1/_dois/chapters/{chapterId}` or `PUT
api/v1/_dois/publicationFormats/{publicationFormatId}` with the new
`doiId`; a change or an emptied box goes to `PUT` / `DELETE
api/v1/dois/{id}` as for any row (note n). OMP
`api/v1/_dois/BackendDoiController`: `editChapter()` answers 404
(`api.404.resourceNotFound`) for an unknown chapter, 403
`api.dois.403.editItemDoiCantBeAssigned` ("A DOI cannot be assigned to
this item.") for a chapter with neither its page nor a DOI, 403
`api.dois.403.editItemOutOfContext` for another press's chapter, 404
`api.dois.404.doiNotFound` for an unknown DOI record; then stores the
`doiId` through `ChapterDAO::updateObject()`. `editPublicationFormat()`
does the same for a format, without the not-found check for the format
and without a page condition; it answers an empty 200. Both sit behind
`PKPBackendDoiController`'s roles (manager, Site Administrator) and
`DoisEnabledPolicy` (note b). OMP `api/v1/dois/DoiController`
`getPubObjectHandler()` maps `chapter` to `ChapterDAO` and
`representation` to `PublicationFormatDAO` for the versioned edit and
delete.

<a id="fn-q27"></a>
**q27** — Live-probed 2026-09-29 (Rules 17, 45), OMP, two runs, the
Press Manager on scratch presses with the four kinds ticked, a
published book with "Tides" ("Chapter Page" ticked), "Harbours"
(unticked), "PDF" (with a file) and "EPUB" (no file): the rows read
"Monograph", "Tides", "Harbours", "Format / PDF", "Format / EPUB",
"PDF / article.pdf", each with its DOI ("Harbours" empty) and its
badge. "Format / PDF" emptied and saved: "DOI(s) successfully updated",
"Needs DOI" at once and after a reload (`DELETE api/v1/dois/{id}`);
"10.1234/fmt-pdf-…" typed and saved: the same notice, "Unregistered"
(`POST api/v1/dois`, then `PUT api/v1/_dois/publicationFormats/{id}`);
the same on "Tides" (`PUT …/_dois/chapters/{id}`); the book's badge
stayed "Unregistered". At every read the format rows stood in the
order the "Publication Formats" page showed at that moment, also after
a change had moved a format there; a chapter cannot be moved on the
"Chapters" page, so the chapter rows follow the order the chapters were
added in. Control, OJS and OPS: the view holds "Article" or "Preprint"
and "PDF" only.

<a id="fn-z3"></a>
**z3** — OMP `classes/submission/Collector.php`: `getAllowedDoiTypes()`
lists `publication`, `chapter`, `representation` (not `file`, note
f-omp1), so either new kind alone keeps the list's query alive;
`addOnDoiPageFilterToQuery()` lists Copyediting and Production, a
published publication, and a publication carrying a publication,
chapter or format DOI for the ticked kinds. The badge: `useDoi.js`
`itemDepositStatus`, the first row of the current version.

<a id="fn-q28"></a>
**q28** — Live-probed 2026-09-29 (Rules 4, 46; Settings bullet 2), OMP,
two runs, OJS and OPS as controls. Setup kinds: OMP "Monographs",
"Chapters", "Publication Formats", "Files"; OJS "Articles", "Issues",
"Article galleys, such as a published PDF", "Peer Review"; OPS
"Preprints", "Preprint galleys, such as a published PDF"; neither OJS
nor OPS offers a chapter or format box, OMP no "Issues" or "Peer
Review". On OJS "Issues" ticked adds the "Issues" tab and "Peer Review"
the "Peer Review {n}" row of a review whose "Notify Reviewers" email
was sent; unticked, both go. A press with a published book ("Tides"
with its page, "PDF"), a book at Copyediting and one at Submission, the
published book's own DOI marked "Registered": "Chapters" alone lists
the published and the Copyediting book, not the Submission one, each
view holding only "Tides"; the published book's badge reads
"Unregistered" (its "Tides" row; "Registered" with "Monographs" alone),
the Copyediting book's "Unpublished". "Publication Formats" alone: the
same books with only "Format / PDF". "Files" alone: "No items found.".

<a id="fn-z4"></a>
**z4** — OMP `classes/monograph/Chapter.php` `isPageEnabled()` (the
stored box, or a DOI); `createDois()` (OMP
`classes/submission/Repository.php` and `classes/publication/Repository.php`)
mints a chapter's DOI only when `isPageEnabled()` and skips the others
without an exception, so "Assign DOIs" reports success
(`manager.dois.notification.assignDoisSuccess`). The list:
`DoiListItem.vue` and `DoiItemVersionModal.vue` give a `disabled` row
the label class `labelDisabled` and disable its input while editing;
`DoiListPanelOMP.containsDisabled()` sets `hasDisabled` with
`manager.dois.disabledChaptersDescription` ("Chapters without a landing
page cannot have a DOI.", OMP `locale/en/manager.po`), shown under the
table while any chapter row of any version of the book is disabled.
The box: `publication.chapter.landingPage` "Chapter Page" (OMP
`locale/en/submission.po`); its behavior once a DOI exists is the
chapters spec's.

<a id="fn-q29"></a>
**q29** — Live-probed 2026-09-29 (Rule 47; Fields, an item's expanded
view; Settings bullet 14), OMP, two runs in each of two checks.
"Harbours" (page unticked, no DOI): its label greyed (class
`labelDisabled`), its box disabled after "Edit", its badge "Needs DOI"
(OMP3), and "Chapters without a landing page cannot have a DOI." after
the table, before "Edit". Its "Chapter Page" ticked in "Edit Chapter"
and saved: on the reloaded DOIs page the label plain, the note gone,
the box editable. Unticked again, then "Assign DOIs" for the book, every
other row filled: "Items successfully assigned new DOIs", "Harbours"
still "Needs DOI" and greyed, the note back. A DOI typed into
"Harbours" while its page was ticked, then the box unticked and saved
in "Edit Chapter": the window reopens ticked with "(This chapter will
always be shown on its own page because it has a DOI.)" and the row
stays plain with its DOI. "Add Chapter" and "Edit Chapter" ("Edit
Metadata") both carry "Chapter Page", unticked in "Add Chapter".
Control, OJS and OPS: no greyed row and no such note.

<a id="fn-z5"></a>
**z5** — The moments (note h): `AssignDOIs` (a decision into
Copyediting or Production) → OMP `submission\Repository::createDois()`
on the current publication; `VersionDois` (a publish) → OMP
`publication\Repository::createDois()`; "Assign DOIs" →
`PKPDoiController::assignSubmissionDois()` →
`submission\Repository::createDois()`. Each mints a DOI for every format
of the version without one (no approval or availability check) and for
every chapter with `isPageEnabled()` and none. Live-probed 2026-09-26
(q12): the Accept gave the press's publication format its DOI.

<a id="fn-q30"></a>
**q30** — Live-probed 2026-09-29 (Rules 5, 48), OMP, two runs.
"Upon reaching the copyediting stage": "Accept and Skip Review",
recorded by the Press Manager and by a Series Editor, gave "Monograph",
"Tides" (page ticked) and every format, "Proof" (neither approved nor
available) included, their DOIs, and "Harbours" (no page) none. With
only "Monographs" and "Files" ticked the Accept gave the monograph and
"PDF / article.pdf" theirs; "Chapters" and "Publication Formats" ticked
afterwards showed "Tides" and "Format / PDF" "Needs DOI". A format
"Print" added in Copyediting got its DOI from "Send To Production".
"Harbours"' page ticked and a format "EPUB" added after that decision:
both "Needs DOI" until the publish gave them theirs. "Assign DOIs": a
chapter "Coda" added to a published book with its page got its DOI only
from it; under "Never", on an unpublished book, it gave "Monograph",
"Tides", "Format / PDF" and "Format / Proof" theirs and "Harbours" none;
on the book whose kinds were ticked late it filled "Tides" and "Format /
PDF".

<a id="fn-z12"></a>
**z12** — Live-probed 2026-09-28 (U72 claim check, its note td14), on
two presses and a seeded publish: with "Chapters" ticked and "Upon
publication", publishing gave a DOI only to "Tides", whose "Chapter
Page" was ticked; "Harbours", unticked, got none, and ticking its box
after the publish gave it none. Live-probed again 2026-09-29 (Rule 48),
OMP, two runs: publishing gave "Monograph", "Tides" and "Format / PDF"
their DOIs and "Harbours" none; "Harbours"' page ticked after the
publish: still none after a reload, until "Assign DOIs" gave it one
("Items successfully assigned new DOIs").

<a id="fn-z6"></a>
**z6** — OMP `classes/doi/Repository.php` `mintChapterDoi()`,
`mintPublicationFormatDoi()`: `default` → the eight-character suffix;
otherwise `generateSuffixPattern()` → `getPubIdSuffixPattern()`
(`doiChapterSuffixPattern` for a `Chapter`,
`doiRepresentationSuffixPattern` for a `Representation`) → OMP
`classes/plugins/PubIdPlugin::generateCustomPattern()`: `%p` the press
acronym lower-cased, `%x` the object's stored `publisher-id` (left as
typed when it has none), `%m` the submission ID, `%c` only with a
chapter, `%f` only with a representation, `%s` only with a file; `none`
→ the empty suffix. An empty "Chapters" box with "Chapters" ticked is
refused by OMP `ContextService::validateContext()`, an empty
"Publication Formats" box with that kind ticked by
`PKPContextService::validate()` ("A DOI suffix pattern is required.",
Fields).

<a id="fn-q31"></a>
**q31** — Live-probed 2026-09-29 (Rule 49), OMP, two runs, press
acronym "JPK". "Submissions" "%p.%m", "Chapters" "%p.%m.c%c",
"Publication Formats" "%p.%m.f%f.%c", a book published: "Monograph"
"10.1234/jpk.156", "Tides" "10.1234/jpk.156.c50", "Format / PDF"
"10.1234/jpk.156.f109.%c"; the book page's "Tides" link ends
"/chapter/50" and its PDF link "/catalog/view/156/109/107". "%x":
"Chapters" "%p.c%c.%x", "Publication Formats" "%p.f%f.%x", a Publisher
ID typed on "Tides" (Edit Chapter › "Identifiers"), "Assign DOIs" on an
unpublished book: "Tides" "10.1234/jpk.c51.tpidb", "Shoals" (no
Publisher ID) "10.1234/jpk.c52.%x", the two formats "…f110.%x" and
"…f111.%x", with "Items successfully assigned new DOIs". The "Chapters"
box emptied with the kind ticked: "A DOI suffix pattern is required."
under it and "Please correct one error." in the footer. "None", a book
published: "Monograph", "Tides" and "Format / PDF" all "10.1234/";
control, OJS and OPS under "None": the work and its galley "10.1234/".

<a id="fn-z7"></a>
**z7** — OMP `classes/publication/Repository.php` `version()` clones
each format, its files and each chapter onto the new version, clearing
their `doiId` only with `doiVersioning` on a major version. The
versioned edit and delete (note k) find a chapter's family through
`ChapterDAO::getMinorVersionsWithSameDoi()` (same source chapter,
version stage and major, same DOI) and a format's through
`PublicationFormatDAO::getMinorVersionsWithSameDoi()` (same version
stage and major, same DOI). Live-probed 2026-09-26 (note k): under "No" a
new version's formats and files started with their source's DOIs, and
under "Yes" a major version's started without; no chapter was in that
probe.

<a id="fn-q32"></a>
**q32** — Live-probed 2026-09-29 (Rule 50), OMP, two runs. "No":
"Create New Version" on a published book: the new version's "Tides"
and "PDF" carry the source's DOIs before and after its publish, the DOIs
page showing the published version until then; "Tides" and "Format /
PDF" changed on the DOIs page: both versions' book pages show the new
DOIs; "Coda", first added in the new version with its page, got a DOI
of its own on its publish. "Yes": a "Major Revision" 2.0's "Tides" and
"PDF" started without DOIs and got their own on its publish, as did
"Coda", added in 2.0; a "Minor Revision" 2.1 kept 2.0's; in "View all"
(blocks "Version of Record 1.0 ({date})" and "Version of Record 2.1
Unpublished") › "Edit", 2.1's "Tides" changed › "Save": 2.0 and 2.1
carry the new DOI, 1.0 keeps its own.

<a id="fn-z8"></a>
**z8** — OMP `classes/submission/Collector.php`:
`addHasDoisFilterToQuery()` (`hasDois` false: the current publication's
DOI missing while `publication` is ticked, or a chapter with the
`isPageEnabled` setting 1 and no DOI while `chapter` is, or a format
with no DOI while `representation` is; true: any of those set for its
ticked kind); `addDoiStatusFilterToQuery()` joins the current
publication's, its chapters' and its formats' DOIs with no check of the
ticked kinds, and no file DOIs; `addFilterByAssociatedDoiIdsToQuery()`
unions the chapter, format and file DOIs, the publication branch sitting
on the `1 = 0` query (note q18).

<a id="fn-q33"></a>
**q33** — Live-probed 2026-09-29 (Rules 21, 22, 51; A11), OMP, two
runs, OJS and OPS as controls. Six published books, each with "Tides"
(page), "Harbours" (no page) and "PDF" with a file: A every DOI; B its
own and "PDF"'s; C its own and "Tides"'; D its own, "Tides"' and
"PDF"'s, no file DOI; E "Tides"' only; F its file's only. The four
kinds ticked: "Needs DOI" B, C, E, F (not A, missing only "Harbours",
nor D, missing only its file DOI); "DOI Assigned" A–E. "Chapters"
unticked: "Needs DOI" C, E, F; "DOI Assigned" A–D. "Publication
Formats" unticked: "Needs DOI" B, E, F; "DOI Assigned" A–E.
"Registration": A's "Tides" alone marked "Registered" while "Chapters"
was the only kind ticked; with the four kinds, A's own DOI
"Unregistered", "Registered" lists A, still A only with "Chapters" or
"Publication Formats" unticked; F, whose only DOI (its file's) was
marked "Registered", is never listed; "Unregistered" lists A–E.
Search, the four kinds ticked: the start of A's "Tides", "Format / PDF"
or file DOI finds A only; E's chapter DOI whole finds E; a book's own
DOI, whole or its start, finds nothing; "10.1234/" lists every book
with a chapter, format or file DOI, F included. "Chapters" unticked:
the start of A's "Tides" DOI finds "No items found." (formats and files
unticked not driven; note o reads the search over the ticked kinds'
DOIs). On a preprint server nothing, "10.1234/" and a preprint's own DOI
whole included; on a journal an article's own DOI, its start or whole,
finds it and a galley's start nothing. Control for Rule 22: on OJS and
OPS a work with its own DOI and its galley DOI cleared is under "Needs
DOI".

<a id="fn-z9"></a>
**z9** — `PKPDoiController::markSubmissionsRegistered()`,
`markSubmissionsUnregistered()`, `markSubmissionsStale()` act on OMP
`doi\Repository::getDoisForSubmission()`: the current publication's
own, chapter and format DOIs for the ticked kinds, and its file DOIs
while "Files" is ticked. `publication\Repository::publish()` and
`unpublish()` mark `getDoisForPublication()` (or, for a new major
version, `getDoisForSubmission()`) "Needs Sync", from "Submitted" or
"Registered" only (`DAO::markStale()`).

<a id="fn-q34"></a>
**q34** — Live-probed 2026-09-29 (Rules 32, 52), OMP, two runs, the four
kinds ticked: "Mark DOIs Registered", "Mark DOIs Needs Sync" and "Mark
DOIs Unregistered" each set the book's own, "Tides", "Format / PDF" and
file rows together ("Items successfully marked registered", "…needs
sync", "…unregistered"). A second book with "Chapters" unticked, "Mark
DOIs Registered", "Chapters" ticked again: its own, format and file rows
"Registered", "Tides" "Unregistered". Marked "Registered", then
"Unpublish": every row "Needs Sync", the badge "Unpublished";
"Publish" again: every row still "Needs Sync". Under "No", a
"Registered" book's new version: every row still "Registered" while it
was unpublished, "Needs Sync" once it was published. No row read
"Submitted": a press has no agency, and an unpublished book cannot be
marked "Registered" (Rule 26).

<a id="fn-z10"></a>
**z10** — The DOI list and `createDois()` read
`$publication->getData('publicationFormats')`, every format of the
version; OMP `pages/catalog/CatalogBookHandler.php` passes the book page
only the formats with `getIsAvailable()`.

<a id="fn-q35"></a>
**q35** — Live-probed 2026-09-29 (Rules 43, 53, 54), OMP, two runs,
the book pages read signed out. An approved, available format's details
end "DOI: https://doi.org/{DOI}" as a link (headed "Details about this
monograph" while it is the only such format). "EPUB" made "Not
Available" after the publish ("Format Availability" › "OK"): its row
keeps its DOI and "Unregistered"; the book's page drops its details and
its download. "PDF"'s approval revoked ("Approved" › "Format Approval"
› "OK") and "EPUB" not available, then published: both got DOIs and
keep their rows; the page shows no format details and no format DOI,
and "PDF", still available, stays a download link. A format neither
approved nor available got its DOI at the Accept and from "Assign
DOIs" (q30).

<a id="fn-z11"></a>
**z11** — OMP `pages/catalog/CatalogBookHandler.php`: for the table of
contents, a chapter without a DOI takes `ChapterDAO::getMinorVersionsDoi()`
(the same source chapter in another publication of the same version
stage and major), whatever `doiVersioning` says; for a chapter page, the
chapter's own DOI, else with `doiVersioning` `getMinorVersionsDoi()`,
else, on a version that is not the current one,
`getCurrentPublicationChapterDoi()`, which passes an integer to
`whereIn()` and fails (the landing page spec's note f-a19 saw the server
error). A format's DOI has no fallback. Templates:
`templates/frontend/objects/monograph_full.tpl` (a chapter's `div.doi`,
"DOI" and the resolving link; a format's `sub_item pubid` block, the
"DOI" heading and the link, available formats only),
`templates/frontend/objects/chapter.tpl` (`item doi`); none tests
`enableDois` or the kind.

<a id="fn-q36"></a>
**q36** — Live-probed 2026-09-29 (Rule 54), OMP, two runs, signed out:
a book published as 1.0 with "Chapters" unticked ("Tides", page ticked,
no DOI), then "Chapters" and "Publication Formats" ticked, a "Minor
Revision" 1.1 published and 1.1's "Tides" DOI typed on the DOIs page.
1.0's table of contents shows 1.1's "Tides" DOI under "No" and "Yes"
alike; 1.1's "Tides" page shows its own; under "Yes" 1.0's "Tides" page
shows 1.1's; under "No" 1.0's "Tides" page answers a blank server error
(500 on `{press}/catalog/book/{id}/version/{1.0 id}/chapter/{n}`),
while a 1.0 chapter that holds its own shared DOI opens with it. 1.0's
"PDF", without a DOI, shows no details and does not borrow 1.1's.
"Chapters" and "Publication Formats" unticked and saved: every table of
contents line, chapter-page line and 1.1's format DOI stays, under both
settings.

<a id="fn-z13"></a>
**z13** — Live-probed 2026-09-28 (U70 claim check I28, all three apps):
a publish that assigned a DOI (DOIs on, "Upon publication", none yet)
wrote "Submission metadata updated" in the publisher's name, from the
workflow and from a press's "Add Entry" alike (seed-facts). Mechanism:
`lib/pkp/classes/publication/Repository.php` `edit()` logs
`submission.event.general.metadataUpdated` on every edit, and
`createDois()` stores the work's own DOI through it; chapters and
formats are stored through `ChapterDAO::updateObject()` and
`PublicationFormatDAO::updateObject()`, which log nothing, as do the
`_dois` chapter and format ops.

<a id="fn-q37"></a>
**q37** — Live-probed 2026-09-29 (Side effects, "Activity Log, no
mail"), OMP, OJS as control, two runs. "Upon publication", a book
without its DOI: its publish added one "Submission metadata updated"
under the Press Manager, and under the Press Editor for his publish of
a second book; a publish on a book whose DOI came earlier added none.
"Upon reaching the copyediting stage": "Accept and Skip Review" logged
it under whoever recorded it (the Press Manager, a Series Editor), with
"The metadata for file "article.pdf" was edited by {username}." for the
file DOI; the journal's Accept logged it under the manager; a preprint
server offers no such decision ("Upon reaching the production stage",
"Upon publication", "Never"). No new line after "Send To Production"
and a publish that gave chapters and formats their DOIs, "Assign DOIs"
on books whose own DOI was set, "Format / PDF" cleared then typed, or
"Tides" cleared, typed and changed; "Assign DOIs" on a book without its
own DOI logged one line. On a journal a galley's DOI cleared, then
typed, logged nothing.

<a id="fn-q38"></a>
**q38** — Driven 2026-09-28 on OJS at the PR heads, before their merge
(ojs `3c9d06844f`, lib/pkp `fec909fbfd`, lib/ui-library `67f0ea20`,
crossref `0dd599a`; `shared/playwright/checks/sync/crossref-ojs-108/cited-by.js`),
a scratch journal, signed out unless noted: the manager's
`registrationAgency` save with "Enable Cited-by" and no credentials,
with a username only, and with empty strings answered 400 with the
username and password messages; on Settings › Distribution › DOIs ›
Registration the box sits after "Crossmark", and "Save" ticked without
credentials showed both messages under the boxes. With credentials: an
article with a published DOI showed "Cited by" as the side column's last
block, "--" after Crossref refused; one without a DOI no block and no
request; an article with three planted cached citations "3 times", the
window "3 citations" with the three entries, "Copy Citation Details"
filled the clipboard and read "Copied". With "Crossmark" also ticked the
Crossmark block came before "Cited by". Unticked: no block, and the
endpoint answered 403.

<a id="fn-sc"></a>
**sc** — Scenario seeding. Scenario 1 reads `publicknowledge` as
installed (DOIs on, the first kind ticked, no prefix, every agency
plugin off: seed-facts), signed in as `manager.maya` (Journal Manager),
`editor.diana` (Editor; OJS and OMP, OPS enrols no editor),
`sectioneditor.ana` (Section Editor, Series Editor, Moderator),
`author.alex` and `reader.rosa` (`docs/process/users.md`; passwords the
username twice); no test changes a setting there. Every other scenario
seeds its own scratch journal, press or preprint server through `POST
scenarios/context` with throwaway `users[]` (password: the username
twice): `manager` as the Journal Manager everywhere, `editor` with
`roles: {editor: {permitSettings: false}}` in scenario 2 (OJS, OMP),
`author` submitters named "Ada Lovelace" and "Mary Anning"
(`givenName`, `familyName`) in scenario 3, an `author` for scenario 4's
draft on OPS, and an `externalReviewer` in scenario 17. The DOI
settings are the context keys of scenarios.md: `doiPrefix: '10.1234'`
everywhere but scenario 2; `doiCreationTime` `publication` (scenarios
3, 5, 18) or `never` (6, 7, 8, 14); `doiSuffixType: 'none'` (7);
`enabledDoiTypes` with `representation` (5, 12; on OMP also 4, 7, 9,
10, 11), `chapter` (OMP: 4, 5, 7, 9, 10, 11), `file` (4, OMP),
`peerReview` (17) or `issue` (18); `doiVersioning` `false` on OPS in
scenario 10 and `true` in 11; `context.acronym: 'JPK'` in scenario 8.
Scenarios 11 and 15 put a journal on "DOI Versioning" "Yes", which
makes every OJS OAI request of the install fail while it lasts
(seed-facts), so the OJS test of scenario 11 sets it back to "No" on
screen before it ends. The agency: `plugins: {crossrefplugin |
dataciteplugin: {enabled: true, settings: {depositorName,
depositorEmail}}}` with `registrationAgency` (scenarios 13, 14, 15),
the DataCite plugin enabled alone in scenario 16, none in 12 and 19;
`publisherInstitution` and `onlineIssn` in scenarios 12 and 13 (OJS).
Works through `POST scenarios/submission`: `decisions[]` for the
Copyediting, Production and Review stages, `published: true`,
`galleys[]` "PDF" (`article.pdf`, `preprint.pdf`), OMP's
`publicationFormats[]` "PDF" (with `file` in scenarios 4 and 5) and in
scenario 5 "EPUB" with `file` and `approved: false`, OMP's `chapters[]`
"Tides" with `page: true` (4, 5, 7, 9, 10, 11) and "Harbours" without
(4, 5), `submitted: false` for scenario 4's draft on OPS, `issue` into `issues[]` entries
(published or not), and in scenario 17 `reviewRounds[].reviewers[]`
`completed` with the context's `review.defaultReviewPublicVisibility`.
The Activity Log and the mail catcher are read after each action; on a
journal a publish through "Review Publishing Details" › "Confirm" adds
one more "Submission metadata updated" whatever the DOI setting
(seed-facts), so scenario 5 counts the line on a press only. A press's
formats can change order after any save (seed-facts), so the row order
is read in scenario 4 only, before "EPUB" is added. "Harbours"'
"Chapter Page" (scenarios 4, 5) and scenario 4's "EPUB" are set on
screen.
Queued deposits are never drained: their jobs fail at connection on
the test installs (seed-facts), so no scenario reads a status after
them. Scenarios 1–11 run on all three apps, 12 and 13 on OJS and OPS,
14–18 on OJS, 19 on OMP. In the scenarios {its number} is the number
the item's row shows, the submission's. Live-probed 2026-09-26: these
keys seeded every scratch journal, press and preprint server of the
check on all three apps; the chapter and format keys are the U72 and
U45 harness passes' (scenarios.md, 2026-09-28 and 2026-09-29).

<a id="fn-f-a1"></a>
**f-a1** — Live-probed 2026-09-23 (U08 claim check K4): the refusal after
unticking and re-ticking; the created default from the context schema
(`enableDois` default true, no `doiPrefix`) versus
`PKPContextService::validate()`. Live-probed 2026-09-26, all three
apps: the same, and the untick-and-save way round it (q10).

<a id="fn-f-a2"></a>
**f-a2** — `ojs|omp|ops/classes/doi/Repository.php` `generateSuffixPattern()`
returns '' for `SUFFIX_MANUAL`; `mintAndStoreDoi()` stores
"{prefix}/" without `validate()` (no duplicate check);
`lib/pkp/classes/doi/Repository.php` `mintDoi()` (reviews) returns ''
for every type but `default`. Neither `AssignDOIs`, `VersionDois` nor
`assignSubmissionDois()` checks the suffix type. Live-probed 2026-09-26
(q13, q14), all three apps and a journal's peer review.
Issue report: [pkp-e2e#213](https://github.com/jardakotesovec/pkp-e2e/issues/213) ([docs/issues/U45-A2-A9-unfinished-doi-assigned.md](../issues/U45-A2-A9-unfinished-doi-assigned.md)).

<a id="fn-f-a3"></a>
**f-a3** — `DoiListItem.postUpdatedDoiError()` records only a failure
flag; `postUpdatedDoiComplete()` emits `manager.dois.update.partialFailure`
and restores the old values; the 400 body's messages are dropped.
Live-probed 2026-09-26 (q9), all three apps.
Issue report: [pkp-e2e#233](https://github.com/jardakotesovec/pkp-e2e/issues/233) ([docs/issues/U45-A3-doi-edit-refusal-no-reason.md](../issues/U45-A3-doi-edit-refusal-no-reason.md)).

<a id="fn-f-a4"></a>
**f-a4** — `DAO::markSubmitted()` sets only the status;
`DoiListItem.vue` reads `itemRegistrationAgency === null` on a deposited
(submitted or registered) item as "manually registered". Live-probed
2026-09-26 (q20), OJS Crossref and DataCite, OPS Crossref: at once,
after a reload, ten minutes later, and after the jobs had run and failed.
Issue report: [pkp-e2e#232](https://github.com/jardakotesovec/pkp-e2e/issues/232) ([docs/issues/U45-A4-deposited-item-reads-manually-registered.md](../issues/U45-A4-deposited-item-reads-manually-registered.md)).

<a id="fn-f-a5"></a>
**f-a5** — `PKPContextController::editDoiRegistrationAgencyPlugin()`
saves `registrationAgency` and `automaticDoiDeposit`, then prunes
`enabledDoiTypes`, before validating the agency fields. Live-probed
2026-09-26 (q5), OJS and OPS, and DataCite.

<a id="fn-f-a6"></a>
**f-a6** — The same method's `array_intersect()` of the enabled kinds
with `getAllowedDoiTypes()` (OJS Crossref: publication, issue,
peerReview; DataCite: publication, representation, issue; OPS Crossref:
publication). Live-probed 2026-09-26 (q5), OJS and OPS: the galley kind
unticked and gone from the Setup tab, the galley rows gone from the DOIs
page ("Article … PDF Unregistered" before, "Article" alone after), no
message; "Peer Review" dropped the same way under DataCite.

<a id="fn-f-a7"></a>
**f-a7** — `Repository::validate()` and `doi.json` check only the
general DOI shape; the old key `doi.editor.missingPrefix` ("The DOI must
begin with {$doiPrefix}.") is displayed nowhere. Live-probed 2026-09-26
(q9), all three apps: "10.9999/…" accepted where the prefix is "10.1234".

<a id="fn-f-a8"></a>
**f-a8** — `DoiListPanel.vue` `.doiListPanel__statusInfoButton` holds
only an icon, with no label, `aria-label` or title; the rows' tick boxes
have no label. Live-probed 2026-09-26 (q8), all three apps: the page's
accessibility tree reads `button` with only an image beside "Filters"
and `checkbox` with no name on every row; the journal's "Issues" box is
named "Issues".
Issue report: [pkp-e2e#237](https://github.com/jardakotesovec/pkp-e2e/issues/237) ([docs/issues/U45-A8-doi-page-controls-unnamed.md](../issues/U45-A8-doi-page-controls-unnamed.md)).

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-26 (q14): "%p" on a journal (two runs),
"%x" on all three apps; the "Assign DOIs" answer listed no failure
(`{"failedDoiActions":[]}`), and a pattern of "%x" alone gave
`10.1234/%x`.
Issue report: [pkp-e2e#213](https://github.com/jardakotesovec/pkp-e2e/issues/213) ([docs/issues/U45-A2-A9-unfinished-doi-assigned.md](../issues/U45-A2-A9-unfinished-doi-assigned.md)).

<a id="fn-f-a10"></a>
**f-a10** — Live-probed 2026-09-26, OJS, two journals: the DOIs page
listed "Version of Record 1.0" after "Create New Version"; after "Assign
DOIs" and the publish of 1.1, the article page (1.1) had no "DOI:" line
and the 1.0 page had it. Not driven on a press or a preprint server.
Rule 17's half (the published version shown while a newer one is
unpublished) was seen on all three apps.

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-26 (q18, which gives the cause), all
three apps, two runs each. Live-probed again 2026-09-29 (q33) on a press
with chapter and format DOIs, and on a journal and a preprint server:
the same.
Issue report: [pkp-e2e#217](https://github.com/jardakotesovec/pkp-e2e/issues/217) ([docs/issues/U45-A11-doi-search-finds-different-sets.md](../issues/U45-A11-doi-search-finds-different-sets.md)).

<a id="fn-f-a12"></a>
**f-a12** — `addFilter()` sets the published status with `unregistered`
and does not take it away when the "Registration" filter changes.
Live-probed 2026-09-26 (q8), all three apps (the journal twice): after
"Unregistered" then "Registered", the list request carried
`doiStatus=3&status[]=3`; after "Clear filter: Registered" no filter
read chosen and the request still carried `status[]=3` (the journal
showed 4 of its 6 works) until a reload.
Issue report: [pkp-e2e#231](https://github.com/jardakotesovec/pkp-e2e/issues/231) ([docs/issues/U45-A12-doi-filter-clear-hides-unpublished.md](../issues/U45-A12-doi-filter-clear-hides-unpublished.md)).

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-26 (q19; p), all three apps (export and
deposit OJS Crossref and DataCite, OPS Crossref): empty selections
answered 404 (`api.dois.404.noPubObjectIncluded`, for "Assign DOIs"
`api.404.resourceNotFound`); an unpublished work beside a published one,
a published work whose DOI was cleared, and the unpublished issue
answered 400 `api.dois.400.invalidPubObjectIncluded`; exports answered
400 "An XML validation error occurred and the XML could not be
exported.". In each case the confirm window closed, no other window or
notice appeared, and the list reloaded with nothing ticked.
Issue report: [pkp-e2e#234](https://github.com/jardakotesovec/pkp-e2e/issues/234) ([docs/issues/U45-A13-bulk-action-refusal-no-message.md](../issues/U45-A13-bulk-action-refusal-no-message.md)).

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-26 (Rule 28), all three apps: the
window text as quoted, with nothing ticked and with one item ticked.

<a id="fn-f-a15"></a>
**f-a15** — Live-probed 2026-09-26, OJS and OPS Crossref (DataCite the
same notice for a work whose article DOI was emptied): "Deposit DOIs"
answered 200 with the notice, the row stayed "Needs DOI", and the queued
`PKP\jobs\doi\DepositSubmission` job failed with "invalid.job.payload"
(`DepositSubmission.php`).
Issue report: [pkp-e2e#223](https://github.com/jardakotesovec/pkp-e2e/issues/223) ([docs/issues/U45-A15-deposit-without-doi-reports-success.md](../issues/U45-A15-deposit-without-doi-reports-success.md)).

<a id="fn-f-a16"></a>
**f-a16** — `DoiListItem.vue` shows `notSubmittedDescription` and
"Deposit DOI(s)" for any published item that is not submitted or
registered, "Needs Sync" included. Live-probed 2026-09-26 (q20).

<a id="fn-f-a17"></a>
**f-a17** — Live-probed 2026-09-26 (q21, which gives the cause), all
three apps, one run each.
Issue report: [pkp-e2e#229](https://github.com/jardakotesovec/pkp-e2e/issues/229) ([docs/issues/U45-A17-major-version-earlier-doi-stays-registered.md](../issues/U45-A17-major-version-earlier-doi-stays-registered.md)).

<a id="fn-f-a18"></a>
**f-a18** — Live-probed 2026-09-26 (q22): `PKP\jobs\doi\DepositSubmission`
failed with `GuzzleHttp\Exception\ConnectException` (three attempts),
every deposit, OJS and OPS; the DOI status stayed 2 (submitted) and no
error message was stored. Nothing on the DOIs page lists failed jobs.
Issue report: [pkp-e2e#210](https://github.com/jardakotesovec/pkp-e2e/issues/210) ([docs/issues/U45-A18-deposit-unreachable-agency-stays-submitted.md](../issues/U45-A18-deposit-unreachable-agency-stays-submitted.md)).

<a id="fn-f-a19"></a>
**f-a19** — `editDoiRegistrationAgencyPlugin()`'s `array_intersect()`
keeps the kept kinds' positions in the stored list of kinds (the
DataCite journal's list had been seeded as publication, peerReview,
representation), so the stored `enabledDoiTypes` reads
`{"0":"publication","2":"peerReview"}` (read from the database, read
only) instead of a list; the Setup form then ticks nothing and
`DoiListPanel` fails with `TypeError: this.enabledDoiTypes.includes is
not a function`. Live-probed 2026-09-26, OJS, three journals over two
processes (Crossref and DataCite); controls with the dropped kind last,
and DataCite with nothing to drop, kept the other kinds.
Issue report: [pkp-e2e#206](https://github.com/jardakotesovec/pkp-e2e/issues/206) ([docs/issues/U45-A19-agency-choice-unticks-every-doi-kind.md](../issues/U45-A19-agency-choice-unticks-every-doi-kind.md)).

<a id="fn-f-a20"></a>
**f-a20** — Live-probed 2026-09-26 (q26), OJS (both plugins) and OPS
(Crossref): the page's `h1` is empty (the accessibility tree reads
`heading [level=1]` with no name).

<a id="fn-f-a21"></a>
**f-a21** — `PKPContextController::editDoiRegistrationAgencyPlugin()`
reads `registrationAgency` from the request without checking it is
there; the form without an agency plugin (the `noPluginsEnabled` field,
footnote d) posts no such key, so PHP logs `Undefined array key
"registrationAgency"`, the value reads as null and the request answers
200 with nothing stored. Test run 2026-09-26, all three apps (scenario
12's "No agency plugin" on OJS and OPS, scenario 19's "Registration"
tab on OMP, in each app's green run): the screen showed "Saved" and the
server log held the warning for that save. Live-probed 2026-09-26
(Fields, the Registration tab, OJS): the same line at the tab's "Save".

<a id="fn-f-a22"></a>
**f-a22** — ui-library `Dropdown.vue` `closeOnBlur()` (the "Bulk
Actions" menu of `DoiListPanel.vue`): 100 ms after the "Bulk Actions"
button loses the focus it closes the menu if the focus has left it,
otherwise it looks again once a second. The window
(`openBulkActionDialog()` → `useModal().openDialog()`, reka-ui
`DialogContent`) hands the focus back to the item that opened it when it
closes; if that happens before the first once-a-second look, the focus
is inside the menu again and every later look keeps it open (from the
code, until the focus leaves the menu; a press elsewhere was not
driven). Live-probed 2026-09-28, all three apps (scratch journal,
prefix 10.1234, "Never", two published works, the journal's Journal
Manager; four rounds on OJS and OMP, two on OPS): with the press on
"Assign DOIs" held 200 ms and the window's button pressed at once (the
window gone 320–450 ms after the press), the menu was open 2.5 s later
in every round, the focus on its "Assign DOIs" item, and the point at
the first row's "Show more details about {id}" belonged to the menu;
with an instant press (window gone 130–390 ms after it) or the window
answered after 1.5 s (1.8–2.0 s), the menu was closed in every round
and the point was the row's own button. No server or script error.
Only "Assign DOIs" was driven; the other actions open their windows
through the same code. The suites wait, once the window is open, for the
menu to close before answering it (`docs/tracking/app-changes.md` row
21; app code unchanged).

<a id="fn-f-ojs1"></a>
**f-ojs1** — `IssueGridHandler::publishIssue()` calls
`Repo::issue()->createDoi()` with no `doiCreationTime` check;
`doi.manager.settings.doiCreationTime.description` "When should a
submission be assigned a DOI?". Live-probed 2026-09-26 (see i): "Never",
"Issues" ticked, "Publish Issue" › "OK" gave the issue a DOI; the article
scheduled in it got none.

<a id="fn-f-ojs2"></a>
**f-ojs2** — Live-probed 2026-09-26, OJS with DataCite: `POST
api/v1/dois/issues/export` answered 500 ("DataciteXmlFilter::createFundingReferencesNode():
Argument #2 ($publication) must be of type APP\publication\Publication,
null given"); after "Deposit All" the issue's deposit job failed with the
same error. On a Crossref journal the issue export answers the 400 of
A13 instead.
Issue report: [pkp-e2e#204](https://github.com/jardakotesovec/pkp-e2e/issues/204) ([docs/issues/U45-OJS2-datacite-issue-export-fails.md](../issues/U45-OJS2-datacite-issue-export-fails.md)).

<a id="fn-f-ojs3"></a>
**f-ojs3** — Live-probed 2026-09-26 (q23), OJS, two processes and two
journals.

<a id="fn-f-omp1"></a>
**f-omp1** — `omp/classes/submission/Collector.php`
`getAllowedDoiTypes()` lists publication, chapter and representation, not
`file`; `PKPSubmissionCollector::getQueryBuilder()` returns no rows for
`onDoiPage` when the enabled kinds share nothing with that list, while
`DoisHandler` shows the tab for any enabled kind and `DoisEnabledPolicy`
admits the page. Live-probed
2026-09-26 (q8), OMP: "Files" alone: "DOIs" in the side menu, the page on
"Monographs" with "No items found." while a published book carries a
file DOI, "Assign DOIs" offered with nothing to tick; with "Monographs"
also ticked the books list with their "PDF / article.pdf" rows; a book
with its own DOI and an empty file DOI is not under "Needs DOI" (two
runs). Live-probed again 2026-09-29 (q28, q33), OMP, two runs: "Files"
alone "No items found."; with the four kinds ticked a book missing only
its file DOI is not under "Needs DOI".
Issue report: [pkp-e2e#214](https://github.com/jardakotesovec/pkp-e2e/issues/214) ([docs/issues/U45-OMP1-file-dois-ignored-on-dois-page.md](../issues/U45-OMP1-file-dois-ignored-on-dois-page.md)).

<a id="fn-f-omp2"></a>
**f-omp2** — Live-probed 2026-09-29 (Rule 45), OMP, two runs: on a
published book whose "PDF / article.pdf" row had no DOI, a DOI typed
into that row and "Save" showed "Some DOI(s) could not be updated" and
an empty box; after a reload the row held the typed DOI, "Unregistered",
and "Mark DOIs Registered" then marked it "Registered". A chapter or
format box typed the same way saved normally. The request, `POST
api/v1/_dois/submissionFiles/{id}` with a `PUT` override, answered 500
in both runs: OMP `api/v1/_dois/BackendDoiController::editSubmissionFile()`
stores the `doiId`, then calls
`GenreDAO::getByContextId()->toArrayAssociative()`, a method lib/pkp's
`DAOResultFactory` does not have (it has `toArray()` and
`toAssociativeArray()`): "Call to undefined method
PKP\db\DAOResultFactory::toArrayAssociative()". The call read
`toArray()` until OMP commit `4f3ca0fd1` ("pkp/pkp-lib#11682 Optimize
the software", 2025-08-20). "Assign DOIs" fills file rows without that
request.
Issue report: [pkp-e2e#224](https://github.com/jardakotesovec/pkp-e2e/issues/224) ([docs/issues/U45-OMP2-file-row-doi-save-error.md](../issues/U45-OMP2-file-row-doi-save-error.md)).

<a id="fn-f-omp3"></a>
**f-omp3** — Live-probed 2026-09-29 (Rule 47), OMP, two runs: the
greyed "Harbours" row read "Needs DOI" beside "Chapters without a
landing page cannot have a DOI." on a book after its publish, under
"Never" and after "Assign DOIs"; the "Needs DOI" filter left out a book
missing only that chapter (q33; the filter's rule is note z8).

<a id="fn-f-ops1"></a>
**f-ops1** — `ops/locale/en/manager.po`
`manager.setup.enableDois.description`. Live-probed 2026-09-26, OPS.

<a id="fn-f-ops2"></a>
**f-ops2** — `ops/classes/scheduler/Scheduler.php` registers only the
usage-statistics loader beside the lib/pkp tasks; `DepositDois` is
registered by OJS's scheduler alone; the OPS Registration form still
offers `automaticDoiDeposit` (`PKPDoiRegistrationSettingsForm`).
Live-probed 2026-09-26 (see v): the box and its help on OPS, saved and
read back ticked; the preprint-server install's task list holds no
deposit task.

<a id="fn-f-ops3"></a>
**f-ops3** — Live-probed 2026-09-26, OPS (both reads of the tab),
against the journal's help.

<a id="fn-f-ops4"></a>
**f-ops4** — `ops/classes/publication/Repository.php` `version()` clears
the new galleys' `doiId` whenever versioning is on; OJS's copy tests
`!$isMinorVersion`. Live-probed 2026-09-26 (q16): the minor version's
galley had no DOI in the database and read "Needs DOI" in "View all";
the journal and the press kept theirs.
Issue report: [pkp-e2e#220](https://github.com/jardakotesovec/pkp-e2e/issues/220) ([docs/issues/U45-OPS4-minor-version-new-galley-dois.md](../issues/U45-OPS4-minor-version-new-galley-dois.md)).

<a id="fn-f-ops5"></a>
**f-ops5** — See l for the listing rule. Live-probed 2026-09-26 (q17):
a journal and a press listed no draft.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| DOIs "Setup" side tab | Settings › Distribution › "DOIs" › "Setup" (`management/settings/distribution#dois`) | AFFM-091 · SET-010 |
| DOIs "Registration" side tab, agency blocks | Settings › Distribution › "DOIs" › "Registration" | AFFM-092 · PLUG-009 · PLUG-011 |
| DOIs page | side menu "DOIs" (`{context}/dois`) | ROUTE-010 · ROUTE-036 · ROUTE-058 · ROUTE-075 · VUE-018 |
| DOIs page tabs | "Articles" / "Issues" {OJS}, "Monographs", "Preprints" | AFFM-148 · AFFU-211 · AFFU-212 |
| Prefix warning | top of the DOIs page | AFFU-210 |
| Search, bulk menu, select and expand all | the list's header | AFFM-149 · AFFM-150 · AFFU-213 · AFFU-214 · AFFU-215 · AFFU-216 |
| Export, mark, assign, deposit, "Deposit All" | "Bulk Actions", header button | AFFM-151 · AFFM-152 · AFFM-153 · AFFM-154 · AFFU-217 · AFFU-218 · AFFU-219 · AFFU-220 · AFFU-221 · AFFU-222 · AFFU-223 |
| Filters and the "DOI Statuses" window | the "Filters" column | AFFM-155 · AFFM-156 · AFFU-224 · AFFU-225 · AFFU-226 · AFFU-227 · AFFU-228 · VUE-096 |
| Paging | under the list | AFFU-229 |
| Item row, expanded view, edit and save | an item | AFFM-157 · AFFM-158 · AFFU-230 · AFFU-231 · AFFU-232 · AFFU-233 · AFFU-234 · AFFU-236 |
| "View all" versions window | an item's expanded view | AFFM-159 · AFFU-235 · AFFU-241 · AFFU-242 · VUE-095 |
| Agency panel, "View Record", "Deposit DOI(s)", "View Error" | an item's expanded view | AFFM-160 · AFFU-237 · AFFU-238 · AFFU-239 · AFFU-240 · AFFU-243 |
| Row kinds per app | the expanded table | AFFU-244 (OJS) · AFFU-245 (OMP: the monograph, chapter, format and file rows) · AFFU-246 (OPS) |
| DOI management API | `api/v1/dois` (list, one, add, edit, delete, assign, export, deposit, mark, `depositAll`, export download) | API-016 · API-052 (OJS issues) |
| DOI attach API | `api/v1/_dois/{publications,peerReviews,authorResponses}/{id}`, OJS `galleys`, `issues`, OPS `galleys`, OMP `chapters`, `publicationFormats`, `submissionFiles` | API-001 · API-050 · API-058 · API-063 |
| Registration save | `PUT api/v1/contexts/{id}/registrationAgency` | (the contexts API, cited) |
| Background deposits | queued jobs | JOB-008 · JOB-009 · JOB-010 · JOB-030 (OJS) |
| Scheduled automatic deposit | daily task, OJS | JOB-045 |
| Crossref reference-DOI check | hourly task in the Crossref plugin (the citations spec) | JOB-062 |
| Crossmark button | journal article page, side column | AFFR-069 |
| Tools pages of the agency plugins | Tools › "Import/Export" › "Crossref XML Export Plugin" / "DataCite Export/Registration Plugin" | PLUG-009 · PLUG-011 |

## Reference — code anchors

- Settings forms: `lib/pkp/classes/components/forms/context/PKPDoiSetupSettingsForm.php`, `PKPDoiRegistrationSettingsForm.php`; `ojs|omp|ops/classes/components/forms/context/DoiSetupSettingsForm.php`; `lib/ui-library/src/components/Form/context/DoiSetupSettingsForm.vue`, `DoiRegistrationSettingsForm.vue`; `lib/pkp/templates/management/distribution.tpl` (OPS `templates/management/distribution.tpl`)
- Validation and save: `lib/pkp/classes/services/PKPContextService.php` (`validate()`), `ojs|omp/classes/services/ContextService.php` (`validateContext()`), `lib/pkp/api/v1/contexts/PKPContextController.php` (`editDoiRegistrationAgencyPlugin()`), `lib/pkp/schemas/context.json`, app `schemas/context.json`, `lib/pkp/classes/context/Context.php` (`SETTING_*`, `isDoiTypeEnabled()`, `getConfiguredDoiAgency()`)
- DOIs page: `lib/pkp/pages/dois/PKPDoisHandler.php`, `ojs|omp|ops/pages/dois/DoisHandler.php`, `ojs|omp|ops/templates/management/dois.tpl`, `lib/pkp/classes/security/authorization/DoisEnabledPolicy.php`, `lib/pkp/classes/components/listPanels/PKPDoiListPanel.php`, app `classes/components/listPanels/DoiListPanel.php`
- Vue: `lib/ui-library/src/components/Container/DoiPage{OJS,OMP,OPS}.vue`; `components/ListPanel/doi/` (`DoiListPanel.vue`, `DoiListPanel{OJS,OMP,OPS}.vue`, `DoiListItem.vue`, `DoiItemVersionModal.vue`, `DoiStatusInfoModal.vue`, `DoiFailedActionDialogBody.vue`, `DoiItemViewErrorDialogBody.vue`, `DoiItemViewRegisteredMessageDialogBody.vue`, `useDoi.js`); app `registry/uiLocaleKeysBackend.json`
- API: `lib/pkp/api/v1/dois/PKPDoiController.php`, `ojs|omp/api/v1/dois/DoiController.php`, `lib/pkp/api/v1/_dois/PKPBackendDoiController.php`, `ojs|omp|ops/api/v1/_dois/BackendDoiController.php`; `lib/pkp/api/v1/submissions/PKPSubmissionController.php` (`onDoiPage`, `hasDois`, `doiStatus`)
- Model: `lib/pkp/classes/doi/` (`Doi.php`, `Repository.php`, `DAO.php`, `Collector.php`, `DoiGenerator.php`, `RegistrationAgencySettings.php`, `exceptions/DoiException.php`), `ojs|omp|ops/classes/doi/Repository.php`, `DAO.php`; `lib/pkp/schemas/doi.json`; `lib/pkp/classes/submission/Collector.php` and app copies (`addOnDoiPageFilterToQuery()`, `addHasDoisFilterToQuery()`, `addDoiStatusFilterToQuery()`, `addFilterByAssociatedDoiIdsToQuery()`, `getAllowedDoiTypes()`)
- Creation and versions: `lib/pkp/classes/observers/listeners/AssignDOIs.php`, `VersionDois.php`, `ops/classes/observers/listeners/AssignDOIsOnSubmission.php`; `lib/pkp/classes/publication/Repository.php` (`version()`, `publish()`, `unpublish()`, `getMinorVersionsDoi()`, `getReviewDoiItemsGroupedByPublication()`), app `classes/publication/Repository.php` (`createDois()`, `version()`), `ojs/classes/issue/Repository.php` (`createDoi()`), `ojs/classes/controllers/grid/issues/IssueGridHandler.php` (`publishIssue()`, `unpublishIssue()`), `ojs/classes/plugins/PubIdPlugin.php` (`generateCustomPattern()`, `suffixHasIssuePattern()`)
- Jobs and tasks: `lib/pkp/jobs/doi/DepositSubmission.php`, `DepositPeerReview.php`, `DepositContext.php`, `ojs/jobs/doi/DepositIssue.php`, `lib/pkp/classes/task/DepositDois.php`, `ojs/classes/scheduler/Scheduler.php`
- Agencies: `ojs/plugins/generic/crossref/` (`CrossrefPlugin.php`, `CrossrefExportPlugin.php`, `classes/CrossrefSettings.php`, `templates/crossmarkButton.blade`, `templates/index.tpl`, `resources/js/components/CrossrefCrossmarkButton.vue`, `CrossrefCitationDoiCheckTask.php`), `ops/plugins/generic/crossref/` (same names, no Crossmark), `ojs/plugins/generic/datacite/` (`DatacitePlugin.php`, `DataciteExportPlugin.php`, `classes/DataciteSettings.php`, `templates/index.tpl`); `ojs/classes/plugins/DOIPubIdExportPlugin.php`, `PubObjectsExportPlugin.php`; `lib/pkp/classes/plugins/IPKPDoiRegistrationAgency.php`
- Reader: `ojs/pages/article/ArticleHandler.php`, `ops/pages/preprint/PreprintHandler.php`, `omp/pages/catalog/CatalogBookHandler.php`; `templates/frontend/objects/article_details.tpl` and the OPS and OMP counterparts; OMP `templates/frontend/objects/monograph_full.tpl`, `chapter.tpl`
- A press's chapters and formats: OMP `classes/doi/Repository.php` (`mintChapterDoi()`, `mintPublicationFormatDoi()`, `getDoisForSubmission()`, `getDoisForPublication()`), `classes/submission/Repository.php` and `classes/publication/Repository.php` (`createDois()`, `version()`), `classes/submission/Collector.php`, `classes/plugins/PubIdPlugin.php` (`generateCustomPattern()`), `classes/monograph/Chapter.php` (`isPageEnabled()`), `classes/monograph/ChapterDAO.php` and `classes/publicationFormat/PublicationFormatDAO.php` (`getMinorVersionsWithSameDoi()`, `getMinorVersionsDoi()`, `getCurrentPublicationChapterDoi()`), `classes/publication/maps/Schema.php`, `api/v1/_dois/BackendDoiController.php` (`editChapter()`, `editPublicationFormat()`), `api/v1/dois/DoiController.php`, `classes/services/ContextService.php` (`validateContext()`); ui-library `components/ListPanel/doi/DoiListPanelOMP.vue`
