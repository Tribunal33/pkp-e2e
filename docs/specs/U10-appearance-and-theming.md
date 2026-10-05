---
name: appearance-and-theming
status: verified
---

# Appearance & theming

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal's managers decide how its public site looks and what its home
page holds. On Settings › Website they choose the theme and its options
(the fonts, the header's colour, what the home page shows), upload a logo,
a homepage image, a favicon and a style sheet of their own, write the
page footer and extra text for the home page, choose which blocks stand
in the sidebar of the public pages and in what order, order the roles on
the public masthead, and set how long lists run before they page and how
dates and times are written. Every visitor meets the result on every
public page of the journal. The Site Administrator can also set a
journal's theme from the journal's Settings Wizard. The look of the
site's own pages (the site's home page and the pages outside any journal)
is set on Administration › Site Settings, which *Site settings*
describes. <sup>a</sup>

## Actors & permissions

Who opens the Settings pages, and what every other role gets there, is set
out in [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access):
the manager-level roles of the journal whose role allows changes to
Settings, and the Site Administrator. This spec calls them "whoever opens
the Settings pages". On a press or a preprint server the Site
Administrator opens them only through a manager-level role held there,
and without one gets the access-denied page
([Journal identity & about pages](U07-journal-identity-and-about-pages.md#a1));
on a journal, an administrator with no role there gets Settings ›
Website under an "Error" window reading "The current role does not have
access to this operation." ([Reader comments & moderation](U14-reader-comments-and-moderation.md#a9)).
A Site Administrator with no role in the journal still changes its theme
from the Settings Wizard (Rule 34). Visitors need no account. <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Change and save the "Appearance" tabs ("Theme", "Setup", "Editorial Masthead", "Advanced") and the "Lists" and "Date & Time" tabs** (Settings › Website) | • whoever opens the Settings pages; nobody else <sup>a</sup> <sup>td1</sup> |
| **Change a journal's theme from its Settings Wizard** (Administration › Hosted Journals, the journal's "Settings wizard", "Appearance"; Rule 34) | • the Site Administrator alone <sup>b</sup> <sup>td2</sup> |
| **See the result** (the home page, and the header, footer and sidebar of every public page of the journal) | • any visitor, signed in or not; on a journal that requires visitors to sign in, or that is not enabled, a signed-out visitor gets the Login page instead ([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 22) <sup>a</sup> |

## Fields & validation

The tabs this spec describes sit on Settings › Website. The top tab
"Appearance" holds the side tabs "Theme", "Setup", "Editorial Masthead"
and "Advanced"; the top tab "Setup" holds, among side tabs other features
describe, "Lists" and "Date & Time" (the full list of who describes which
tab is in [Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Rule 2). Each side tab is one form with a "Save" button at its foot. A
refused save, the "Saved" note beside the button and the language buttons
of a journal with a second form language work as on Settings › Journal,
which [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
describes. A field marked "per language" takes a value in each form
language (Rule 3). <sup>c</sup>

**The upload boxes.** "Logo", the thumbnail, "Homepage Image", "Favicon"
and the style sheet are upload boxes: "Upload File", or a file dropped on
"Drop files here to upload" (in the French interface: Rule 35a). A
picture then shows as a small preview with an "Alternate text" box
beside it and the guidance "Describe this image for
visitors viewing the site in a text-only browser or with assistive
devices. Example: "Our editor speaking at the PKP conference.""; a style
sheet shows its file name. "Remove" empties the box. While a picture box
holds a picture it shows no "Upload File" and no drop area, so a new
picture goes in by the mouse only once "Remove" has emptied the box. The
box keeps its "Upload File" for keyboard and screen-reader users: on a
page opened with a saved picture, that hidden button takes the
keyboard's focus, Enter on it opens the file chooser, and the chosen
picture takes the old one's place. On a box that opened with a saved
file, removing or replacing that file adds "Restore Original", which
brings back the saved file and its alternate text; a box that opened
empty has no "Restore Original". A picture that replaces a saved one
arrives with an empty "Alternate text" box; saved as it is, the new
picture has no description. A file of a type the box does not take is
refused in the box ("You can't upload files of this type.") and nothing
is sent; after a refusal made with "Upload File", that button and the
tab's "Save" stay disabled ⚠ [A7](#a7). The refused file's empty frame
holds a "Remove file" link that shows only under the pointer; pressing
it brings "Upload File" back, but "Save" stays disabled ⚠ [A15](#a15).
A picture that is sent and then fails on the server (A16 names the
server and the size) leaves a red warning sign under the box with no
message ⚠ [A16](#a16). An upload counts only once
the tab is saved. <sup>d</sup> <sup>td3</sup>

**"Theme"** (Settings › Website › "Appearance" › "Theme"; the page opens
on this tab). On a journal the fields follow "Theme" in the order below; a
preprint server has the same fields without "Journal Content
Organization"; a press shows "Typography", "Press Summary", "Header
Background Image", "Colour", "Show Series" and "Usage statistics display
options", in that order. <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Theme" | — | A list of the installed themes, under "New themes may be installed from the Plugins tab at the top of this page."; a stock install offers "Default Theme" alone (Rule 4) <sup>k</sup> |
| "Typography" | no | Seven choices under "Choose a font combination that suits this journal." ("…this press.", "…this server."): "Noto Sans: A digital-native font designed by Google for extensive language support." (chosen on a new journal), "Noto Serif: A serif variant of Google's digital-native font.", "Noto Serif/Noto Sans: A complementary pairing with serif headings and sans-serif body text.", "Noto Sans/Noto Serif: A complementary pairing with sans-serif headings and serif body text.", "Lato: A popular modern sans-serif font.", "Lora: A wide-set serif font good for reading online.", "Lora/Open Sans: A complimentary pairing with serif headings and sans-serif body text." (Rule 5) <sup>e</sup> |
| "Colour" | no | A colour picker with a box for the colour's code, under "Choose a colour for the header."; "#1E6292" on a new journal (Rule 6) <sup>e</sup> |
| "Journal Summary" ("Press Summary", "Server Summary") | no | One box, "Show the journal summary on the homepage." ("…the press summary…", "…the server summary…"), unticked on a new journal (Rule 7) <sup>e</sup> |
| "Journal Content Organization" {OJS} | no | Three boxes under "Choose how your journal's content will be organized on the homepage.": "Include the current issue's table of contents", "Include recent most published articles" and "Include a listing of categories"; which are ticked on a journal that never saved the tab: Rule 10 [OJS1](#ojs1) <sup>e</sup> |
| "Header Background Image" | no | One box, "Show the homepage image as the header background.", under "When a homepage image has been uploaded, display it in the background of the header instead of it's usual position on the homepage."; unticked on a new journal (Rule 8) <sup>e</sup> |
| "Usage statistics display options" | no | Three choices: "Do not display submission usage statistics chart for reader." (chosen on a new journal), "Use bar type of the chart for usage statistics display." and "Use line type of the chart for usage statistics display." (Rule 9) <sup>e</sup> |
| "Show Series" {OMP} | no | One box, "Add list of links to all of the press's series on the catalog page", unticked on a new press [OMP1](#omp1) <sup>e</sup> |

**"Setup"** (Settings › Website › "Appearance" › "Setup"). Some fields
carry a help text, shown from the small icon beside the label. <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Logo" | no | Upload box for a picture, per language. Empty on a new journal (Rule 20) <sup>f</sup> |
| "Journal thumbnail" ("Press thumbnail", "Server thumbnail") | no | Upload box for a picture, per language, with the help "A small logo or representation of the journal that can be used in lists of journals." ("…press…", "…server…"). Empty on a new journal (Rule 21) <sup>f</sup> |
| "Homepage Image" | no | Upload box for a picture, per language, with the help "Upload an image to display prominently on the homepage.". Empty on a new journal (Rules 8, 18) <sup>f</sup> |
| "Page Footer" | no | Formatted text, per language, with the help "Enter any images, text or HTML code that you'd like to appear at the bottom of your website.": bold, italic, superscript, subscript, a link, a block quote, bulleted and numbered lists, a picture ([→ pictures](U09-custom-pages-and-blocks.md#image-upload)) and a source-code view. Empty on a new journal (Rule 22) <sup>f</sup> |
| "Sidebar" | no | An orderable list with one box per block, each row with a drag handle and up and down arrows. What it offers and what the order does: Rules 23–25 <sup>s</sup> |
| "Featured Books" {OMP} | no | One box, "Display featured books on the home page" [OMP1](#omp1) <sup>f</sup> <sup>td4</sup> |
| "New Releases" {OMP} | no | One box, "Display new releases on the home page" [OMP1](#omp1) <sup>f</sup> <sup>td4</sup> |
| "Order of monographs" {OMP} | no | Six choices under "Choose how to order books in the catalog.": "Title (A-Z)", "Title (Z-A)", "Publication date (oldest first)", "Publication date (newest first)", "Series position (lowest first)", "Series position (highest first)"; none is marked on a new press [OMP1](#omp1) <sup>f</sup> <sup>td4</sup> |

On a press the three catalog fields come after "Sidebar", and the thumbnail
comes after "Logo" on every app. <sup>f</sup>

**"Editorial Masthead"** (Settings › Website › "Appearance" › "Editorial
Masthead"). The groups below, top to bottom; a preprint server has the
first two. <sup>u</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Enrollment-based Masthead" | — | One box, "Present a masthead based on user enrollments", under "If desired, a masthead can be generated automatically based on user enrollments, including start and end dates. See also Settings > Journal > Masthead." ("…See also Settings > Press > Masthead." on a press, "…See also Settings > Server > Masthead." on a preprint server); ticked on a new journal. Unticking it takes the "Editorial Masthead" list and "Reviewers" off the tab at once, before any save; ticking it again brings them back. What the box does: Settings bullet 15a <sup>u</sup> <sup>td5</sup> |
| "Editorial Masthead" | — | Shown while "Present a masthead based on user enrollments" is ticked. Under "Define the order of masthead roles for public display.", a list of role names, each with a drag handle and up and down arrows and no box to tick. Which roles, and what the order does: Rule 28 <sup>u</sup> |
| "Reviewers" {OJS OMP} | — | Shown while "Present a masthead based on user enrollments" is ticked. One box, "Enable listing of reviewers on the masthead", under "Reviewers who completed a review in the previous calendar year will be credited in a standardized format to maintain uniformity and ensure easy discoverability in this section."; unticked on a new journal and press. What the box does: Settings bullet 15b. A preprint server's tab has no "Reviewers" group <sup>u</sup> <sup>td5</sup> |

**"Advanced"** (Settings › Website › "Appearance" › "Advanced"). <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Journal style sheet" ("Press style sheet", "Server style sheet") | no | Upload box that takes ".css" files only; one file for every language. Once uploaded, the box shows the file's own name and "Remove", and still does after "Save"; once the page is loaded again it shows "styleSheet.css", a link to the stored file, and "Remove". Empty on a new journal (Rule 26) <sup>h</sup> |
| "Favicon" | no | Upload box, per language, that takes ".ico", ".png" and ".gif" pictures only. Empty on a new journal (Rule 27) <sup>h</sup> |
| "Additional Content" | no | Formatted text, per language, under "Anything entered here will appear on your homepage.", with the same buttons as "Page Footer". Empty on a new journal (Rule 19) <sup>h</sup> |
| "Cover Image Max Width", "Cover Image Max Height" {OMP} | yes | Two boxes, each under "Images will be reduced when larger than this size but will never be blown up or stretched to fit these dimensions.", 106 and 100 on a new press. A whole number of 1 or more: emptied, "Save" is refused with "This is not a valid integer. This must be at least 1." under the box; "0" with "This must be at least 1."; text with "This is not a valid integer." (Settings bullet 19) [OMP1](#omp1) <sup>h</sup> <sup>td4</sup> |

**"Lists"** (Settings › Website › "Setup" › "Lists"). <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Items per page" | yes | A small box under "Limit the number of items (for example, submissions, users, or editing assignments) to show in a list before showing subsequent items in another page."; 25 on a new journal. A whole number of 1 or more: emptied, "Save" is refused before anything is sent with "This field is required."; "0" and a negative number are refused with "This must be at least 1."; text or a decimal with "This is not a valid integer." There is no upper limit: 100000 saves (Rule 29) <sup>i</sup> <sup>td6</sup> |
| "Page links" | yes | A small box under "Limit the number of links to display to subsequent pages in a list."; 10 on a new journal; refused as "Items per page" is (Rule 30) <sup>i</sup> <sup>td6</sup> |

**"Date & Time"** (Settings › Website › "Setup" › "Date & Time"). Under
the heading "Date and Time Formats" and the sentence "Choose the preferred
format for dates and times. A custom format can be entered using the
special format characters." (the last two words a link to a page
explaining those characters), five groups of choices, each per language.
Each choice but the last is written as today's date and time in its
pattern, by the clock of the manager's own computer; the last is "Custom"
with a box for a pattern of one's own. The examples below are for 24
September 2026 at 3:05 in the afternoon. <sup>j</sup> <sup>td7</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Date" | no | "September 24, 2026" (chosen on a new journal), "September 24 2026", "24 September 2026", "2026 September 24", "Custom" <sup>j</sup> |
| "Date (Short)" | no | "2026-09-24" (chosen on a new journal), "24-09-2026", "09/24/2026", "24.09.2026", "Custom" <sup>j</sup> |
| "Time" | no | "15:05", "03:05 PM" (chosen on a new journal), "3:05PM", "Custom"; with the third choice saved, most pages print it in lower case ("3:05pm"), while some editorial screens, such as a discussion's messages, print it as the choice reads ("11:58AM"), so one journal shows both ⚠ [A8](#a8) <sup>j</sup> |
| "Date & Time" | no | One ready choice, the saved "Date" and "Time" joined by " - " ("September 24, 2026 - 03:05 PM", chosen on a new journal), then "Custom" (Rule 32) <sup>j</sup> |
| "Date & Time (Short)" | no | One ready choice, the saved "Date (Short)" and "Time" joined by a space ("2026-09-24 03:05 PM", chosen on a new journal), then "Custom" (Rule 32) <sup>j</sup> |

## Rules & state

**The tabs**

1. **Where they are.** Settings › Website opens on "Appearance" ›
   "Theme". The "Theme", "Setup", "Editorial Masthead", "Advanced",
   "Lists" and "Date & Time" tabs belong to the journal the page was
   opened in; a second journal on the same site has its own set. <sup>c</sup>
2. **Saving and leaving.** "Save" stores the fields of its own tab and
   nothing else, shows "Saved" beside the button, and the public pages
   show the change from their next load (for the header's colour in a
   browser that opened them before, Rule 6a). A change left unsaved behaves
   as on every Settings page ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Rule 5): it waits in its box while the manager moves between the
   side tabs, and is gone without a question once the page is left, so
   a "Page Footer" typed and not saved is not there after the next load.
   The same holds on "Theme": a changed choice is still there when the
   manager opens another side tab and comes back, and "Save" then
   stores it. <sup>c</sup> <sup>td8</sup>
3. **Languages.** With a second form language (Settings › Website ›
   "Setup" › "Languages", "Forms"; *Languages & locales*), each field
   marked "per language" takes a value in each language, and each group
   on "Date & Time" is chosen once per language. A visitor sees the
   logo (with its alternate text), homepage image, favicon, "Page
   Footer" and "Additional Content" of their own language; where it has
   none, the primary language's; where that has none either, another
   language's (an English visitor reads a French-only "Page Footer").
   <sup>y</sup> <sup>td9</sup>

3a. **Dates in each language.** Dates print in the formats saved for the
    visitor's language (the tab's "French" button shows the French
    groups): a French "Date (Short)" of "24.09.2026" prints on the French
    pages, and the English pages keep "2026-09-24". Until another French
    "Date" is chosen and saved, French gets the installation's default
    (Settings bullet 27) in French words: the French "Date" sits on its
    first choice, "septembre 24, 2026" ⚠ [A13](#a13), and a press's
    French pages (Rule 31) give a book's date as "mars 5, 2024" (English
    "March 5, 2024"). Once "24 septembre 2026" is chosen and saved, they
    read "5 mars 2024", and the English pages are unchanged. <sup>j</sup>
    <sup>y</sup> <sup>td9</sup>

3b. **A language offered to visitors but not in the forms.** Where
    French is ticked under "UI" but not under "Forms" (Settings › Website
    › "Setup" › "Languages"), "Date & Time" has no "French" button, and a
    French visitor reads the installation's default formats whatever the
    tab saves. On such a press, with "24 September 2026" saved under
    "Date", the English book page reads "Published 5 March 2024" and the
    French one "mars 5, 2024". Unlike the logo and "Page Footer" (Rule
    3), the dates do not fall back to the primary language's choice.
    <sup>y</sup> <sup>td9</sup>

3c. **French times.** In French (Canada), a journal left on the default
    "Time" writes the same moment two ways. The French choices on "Date &
    Time" and some editorial screens, such as a discussion's messages,
    write "a.m." and "p.m." ("2026-10-05 04:38 a.m."); a library file's
    "Date de téléversement" writes "AM" ("2026-10-05 04:38 AM")
    ⚠ [A19](#a19). In English both read "AM". <sup>j</sup>

**The theme**

4. **The theme.** The theme chosen under "Theme" draws every public page
   of the journal; the editorial screens do not change with it. It also
   names the menu areas a navigation menu can fill
   ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
   Rule 8). A stock install has "Default Theme" alone, so the list
   offers no other choice; further themes are installed and enabled as
   plugins (*Plugins management*). Rules 5 to 10 describe the default
   theme's fields. <sup>k</sup> <sup>td10</sup>
5. **"Typography".** After "Save", the text and the headings of the
   public pages use the chosen fonts: a single name sets both; a pair
   ("Noto Serif/Noto Sans") sets the headings to the first and the text
   to the second. The journal's name in the header, shown while no logo
   is set, takes the headings' font. <sup>l</sup> <sup>td11</sup>
6. **"Colour".** After "Save", the header of every public page (the band
   holding the logo or the journal's name and the primary menu) takes the
   chosen colour on its next load; a browser that opened the journal's
   pages before may show it late (Rule 6a). With a light colour the
   header's text turns dark so it stays readable. A code the colour box
   cannot read as a colour ("red", "#12345") stays in the box but changes
   nothing: "Save" shows "Saved" and keeps the colour chosen before.
   <sup>l</sup> <sup>td11</sup>

6a. **A browser that opened the journal before.** After a "Colour" save,
    a browser that never opened the journal's pages shows the new colour
    at once. A browser that already opened them, a visitor's or the
    manager's own, may keep the old colour on its next pages and a plain
    reload, for a while that grows with how long the old colour had stood
    unchanged when that browser opened the pages ⚠ [A10](#a10). Opened
    right after the previous save, its next load shows the new colour.
    Opened three minutes after it, with the new colour saved at once: a
    reload a few seconds after opening shows the old colour, one half a
    minute after, the new. <sup>l</sup>

7. **The summary on the home page.** Ticked, the home page gains a
   section headed "About the Journal" ("About the Press", "About the
   Server") holding the "Journal Summary" text of Settings › Journal ›
   "Masthead" ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Rule 8), and the skip link to it
   ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
   Rule 22). Where the section sits: Rule 12. <sup>m</sup> <sup>td12</sup>
8. **"Header Background Image".** Ticked while a "Homepage Image" is set,
   the picture fills the background of the header on every public page
   of the journal, and the home page no longer shows it in its body
   (Rule 18). Ticked with no homepage image, nothing changes.
   <sup>q</sup> <sup>td13</sup>
9. **"Usage statistics display options".** A chart choice adds a section
   headed "Downloads" to each article's landing page, holding a bar or a
   line chart of its downloads by month; an article with no downloads
   yet shows an empty chart. The landing-page features (*Article landing
   page & reading*, on a press *Monograph landing page*) describe the
   section. <sup>z</sup> <sup>td14</sup>
10. **"Journal Content Organization"** {OJS}. Each ticked box adds a part
    to the home page (Rule 12): the current issue (Rule 14), the recent
    articles (Rule 13), the categories (Rule 15). Until the tab is saved,
    which boxes count as ticked depends on the journal: with at least one
    issue, published or not, "Include the current issue's table of
    contents" alone; with no issue, "Include recent most published
    articles" alone. A journal that never saved the tab therefore changes
    its home page by itself when its first issue is created
    ⚠ [OJS2](#ojs2). A save with none of the three ticked shows "Saved"
    but keeps no choice: the tab reopens with that default ticked, and
    the home page shows that part ⚠ [OJS5](#ojs5). <sup>o</sup>
    <sup>td15</sup>

**The home page**

11. **One page per journal.** The journal's home page is its address
    with nothing after the journal's path; the header's logo or name
    leads there. Its parts are this feature's, except the carousel
    ([Highlights](U11-highlights.md)) and the announcements
    ([Announcements](U12-announcements.md)), which sit in it. <sup>m</sup>
12. **What it shows, top to bottom.** Each part shows only while its
    condition holds. A journal or press with nothing set and nothing
    published shows the header, the footer and an empty page between
    them; a preprint server's shows its search box and the "Latest
    preprints" heading. <sup>m</sup> <sup>td16</sup>

    | Journal {OJS} | Press {OMP} | Preprint server {OPS} |
    |---|---|---|
    | the carousel | the carousel | the carousel |
    | the homepage image (Rule 18) | the homepage image | the homepage image |
    | the categories (Rule 15) | "About the Press" (Rule 7) | the announcements |
    | "About the Journal" (Rule 7) | "Featured": books featured in the catalog, while "Featured Books" is ticked ([OMP1](#omp1)) | a search box and the category links (*Sections*) |
    | the announcements | "New Releases": books marked as new releases, while "New Releases" is ticked | "Latest preprints" (Rule 16) |
    | "Latest Publications" (Rule 13) | the announcements | "About the Server" (Rule 7) |
    | "Current Issue" (Rule 14) | "Additional Content" (Rule 19) | "Additional Content" |
    | "Additional Content" (Rule 19) | | |

    A preprint server's page is fixed in this order, with no choice of
    its parts but the summary [OPS1](#ops1).
13. **"Latest Publications"** {OJS}. Under this heading, the journal's
    published articles that are not in a published issue (published with
    no issue, or assigned to an issue not yet published), the most
    recently submitted first, each shown as its article summary
    (*Article landing page & reading*) ⚠ [OJS3](#ojs3); to a screen
    reader each title is a heading of the section's own level
    ⚠ [OJS6](#ojs6). Under the list "{from} - {to} of {total} items"
    ("1 - 2 of 2 items"), and, with more
    articles than "Items per page", page links: "<<" and "<" when not on
    the first page, the page numbers (Rule 30), then ">" and ">>" when not
    on the last. With no such article the section is absent. <sup>n</sup>
    <sup>td17</sup>
14. **"Current Issue"** {OJS}. Under this heading, the current issue's
    name ("Vol. 1 No. 2 (2014)"), its table of contents (*Issues*), and
    the link "View All Issues" to the archive. It shows while the journal
    has a current issue and Settings › Distribution › "Access" ›
    "Publishing Mode" is not "OJS will not be used to publish the
    journal's contents online." (*Subscriptions & open access control*).
    <sup>o</sup> <sup>td18</sup>
15. **The categories** {OJS}. A row of links, one per top-level category
    of the journal, each opening that category's page (*Categories*);
    subcategories are not listed. With no category the row is absent.
    <sup>o</sup> <sup>td19</sup>
16. **"Latest preprints"** {OPS}. The heading shows always, even with
    nothing posted. Under it, up to ten posted preprints, the most
    recently posted day first, each shown as its preprint summary
    (*Article landing page & reading*), with no page links: "Items per
    page" does not apply. Preprints posted on the same day come in no
    fixed order, so on a day with more than ten posts which ten show is
    not fixed. <sup>p</sup> <sup>td20</sup>
17. **Featured books and new releases** {OMP}. Which books are featured or
    marked as new releases is set on the catalog (*Catalog management*),
    and so is the order of the featured ones ("Order Features"); the new
    releases come newest first by publication date. The "Setup" boxes
    only show or hide the two lists. A ticked box with no book to show
    adds nothing. <sup>m</sup> <sup>td4</sup>
18. **The homepage image.** Unless "Header Background Image" is ticked
    (Rule 8), the "Homepage Image" shows under the carousel. On a journal
    it is stretched or shrunk to the full width of the page's main
    column; on a press and a preprint server it shows at the size it was
    uploaded, shrunk to fit when wider. A journal gives it the "Alternate
    text" as its description, and with the box empty gives it no text
    alternative at all ⚠ [OJS7](#ojs7); a press and a preprint server
    show it with an empty description, whatever was typed ⚠ [A1](#a1).
    <sup>q</sup> <sup>td21</sup>
19. **"Additional Content".** The text shows at the foot of the home page,
    after every other part, and on no other page. <sup>m</sup>
    <sup>td22</sup>

**Logo, thumbnail and footer**

20. **"Logo".** Set, the logo stands in the header of every public page of
    the journal in place of the journal's name, as a link to the home page
    ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
    Rule 15a), at the size it was uploaded up to 80 pixels high; a
    taller logo is scaled down to that height (a 1600 × 160 logo shows
    at 800 × 80). Its "Alternate text" is its description; without one
    the logo has none, and the link has no name a screen reader can read
    ⚠ [A2](#a2). Removed and saved, the name comes back. <sup>r</sup>
    <sup>td23</sup>
21. **The thumbnail.** Set, it shows beside the journal in the list of
    journals on the site's home page, with its "Alternate text" as its
    description (*Hosted journals* describes the list). <sup>r</sup>
    <sup>td24</sup>
22. **"Page Footer".** Set, the text shows at the foot of every public
    page of the journal, above the application's logo
    ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
    Rule 20). <sup>r</sup> <sup>td25</sup>

**The sidebar**

23. **What "Sidebar" offers.** One box per block of a plugin that is
    enabled in the journal (Settings › Website › "Plugins" › "Installed
    Plugins"; *Plugins management*), labelled with the plugin's name; a
    custom block's box reads the block's name followed by "(Custom
    Block)", while the sidebar shows its title. A new journal offers "Web
    Feed Plugin", "Information Block", "Subscription Block" and "Language
    Toggle Block"; a press offers "Browse Block" in place of
    "Subscription Block"; a preprint server offers "Web Feed Plugin" and
    "Language Toggle Block" alone. ""Make a Submission" Block" is not
    among them: its plugin is disabled on a new journal and press
    (Settings bullet 23). Enabling a plugin with a block adds its box, and
    a custom block adds one per block
    ([Custom pages & blocks](U09-custom-pages-and-blocks.md), Rule 18). No
    box is ticked on a new journal. The ticked boxes come first, in their
    sidebar order, and the unticked ones after them, so a block added
    later joins the unticked ones. Dragging a row or pressing its up or
    down arrow moves it; a screen reader hears the arrows as "Increase
    position of {block}" and "Decrease position of {block}" ⚠ [A3](#a3).
    A double quote or "&" in the block's label reaches those names
    written as HTML code: `Increase position of &quot;Developed By&quot;
    Block` ⚠ [A17](#a17). <sup>s</sup> <sup>td26</sup>
24. **Placing.** After "Save", every ticked block shows, in the list's
    order, in the sidebar beside the content of every public page of the
    journal; an unticked block shows nowhere. A block with nothing to
    show adds nothing (the "Language Toggle Block" on a journal with one
    interface language). With no block ticked the public pages have no
    sidebar; the content keeps its width and stands in the middle of the
    page. What each block holds belongs to the block's own feature:
    <sup>s</sup> <sup>td26</sup>

    | Block | Described in |
    |---|---|
    | "Information Block" {OJS OMP} | [Journal identity & about pages](U07-journal-identity-and-about-pages.md) |
    | ""Developed By" Block" | [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md) |
    | a custom block | [Custom pages & blocks](U09-custom-pages-and-blocks.md) |
    | ""Make a Submission" Block" {OJS OMP} | [Submission wizard](U21-submission-wizard.md) |
    | "Language Toggle Block" | *Languages & locales* |
    | "Web Feed Plugin"; the announcement feed's block {OJS} | *Web feeds*; [Announcements](U12-announcements.md) |
    | "Subscription Block" {OJS} | *Subscriptions & open access control* |
    | "Browse Block" (enabled on a new press) | *Catalog browse* |

25. **A placed block whose plugin is disabled.** It leaves the sidebar and
    the "Sidebar" list at once, and keeps its place: enabled again, it is
    back in its place, unless "Setup" was saved in between with a changed
    "Sidebar" list, which drops the place and brings it back unticked.
    Meanwhile, "Save" on "Setup" with the "Sidebar" list untouched is
    refused under "Sidebar" with "The {name} block can not be found.
    Please make sure the plugin is installed and enabled." ⚠ [A4](#a4),
    where {name} is the block's internal name, not its label ("The
    languagetoggleblockplugin block can not be found. …"; for a custom
    block, its name). <sup>s</sup> <sup>td27</sup>

**Style sheet and favicon**

26. **The style sheet.** After "Save", the uploaded file is loaded on
    every public page of the journal after the theme's own styles, so its
    rules win over the theme's where they are as specific: a rule for
    every heading turns the home page's headings red, while an article
    page's "Published" label keeps the theme's grey. The editorial
    screens do not load it.
    "Remove" and "Save" take it off the pages, but the file itself stays
    where it was, still opening at its address ⚠ [A5](#a5). <sup>t</sup>
    <sup>td28</sup>
27. **"Favicon".** Set, it is the icon in the browser's tab on every public
    page and every editorial screen of the journal. Without one, the tab
    shows the browser's own default icon. <sup>t</sup> <sup>td29</sup>

**The masthead order**

28. **"Editorial Masthead".** While "Present a masthead based on user
    enrollments" is ticked, the list holds every role of the journal
    whose "Consider role in masthead list" is ticked (Settings › Users &
    Roles › "Roles"; *Roles configuration*), the Reviewer role excepted:
    on a new journal "Journal editor", "Section editor" and "Editorial
    Board Member" ("Press editor", "Series editor" and "Editorial Board
    Member" on a press; "Moderator" and "Editorial Board Member" on a
    preprint server). Until the tab is first saved, the list follows the
    roles' permission levels, a newly ticked role included; roles of the
    same level, such as a journal's "Copyeditor" and "Editorial Board
    Member", stand in no fixed order among themselves ⚠ [A14](#a14).
    Once the tab has been saved, a role ticked later joins at the end.
    After "Save", the list's order is the order of the role headings on
    the public "Editorial Masthead" and "Editorial History" pages
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 14a). The arrows' names for a screen reader: [A3](#a3). The
    list in the French interface: Rule 35b.
    <sup>u</sup> <sup>td30</sup>

28a. **The list with the box unticked.** With "Present a masthead based
    on user enrollments" unticked, the list is not on the tab and neither
    public page lists roles
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 14f). The saved order is kept: ticked again, the list shows in
    that order, and once the tab is saved both pages list the roles in
    that order again.
    A role moved while the box is still ticked keeps its new place when
    the box is then unticked and the tab saved. <sup>u</sup> <sup>td30</sup>

**Lists**

29. **"Items per page".** The number of entries a list shows before it
    pages, on the lists that page: the listing pages of
    [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
    (Rule 24), the home page's "Latest Publications" {OJS} (Rule 13), the
    results of the Search page ([Search](U15-search.md)) and a category's
    page (*Categories*); on a press a category's page shows only its first
    page ⚠ [OMP2](#omp2). It is also the number of rows the older
    editorial lists start with before they page, such as Settings › Users
    & Roles › "Roles" (*Roles configuration*); the "Users" list there
    shows 25 a page whatever the number (*Users management*).
    <sup>v</sup> <sup>td31</sup>
30. **"Page links".** The most page numbers a list shows at once, on the
    lists that number their pages: the home page's "Latest Publications"
    {OJS}, the Search page's results, a category's page on a journal
    and a preprint server, and Settings › Users & Roles › "Roles". The
    current page's number sits in the middle of them when there are pages
    on both sides. The listing pages with "Previous" and "Next" do not
    use it. <sup>v</sup> <sup>td32</sup>

**Dates and times**

31. **Where the formats print.** The feature that owns each page
    describes the date it prints; a changed format shows there from the
    next load. <sup>w</sup> <sup>td33</sup>
    - "Date (Short)": an article's date on its landing page and in its
      "Versions" list, an issue's date {OJS}, the date of each
      announcement ([Announcements](U12-announcements.md)), the dates in
      a preprint's summary {OPS}, and an article's date in the Search
      page's results {OJS}.
    - "Date" {OMP}: a book's "Published" date on its page and on its
      chapters' pages, and its date in the catalog's and the Search
      page's lists; the book's "Versions" list uses "Date (Short)".
    - "Date & Time (Short)": the date and time of a submission file's
      notes and a library file's "Date uploaded".
32. **The two combined choices follow the others.** On the tab, choosing
    another "Date", "Date (Short)" or "Time" rewrites the ready choice of
    "Date & Time" or "Date & Time (Short)" to the new combination, and a
    combined group that was on its ready choice moves with it. Choosing
    the first "Date (Short)" back brings the combined choice back too,
    and "Save" stores the two in step. A combined group on "Custom"
    stays there; only its ready choice's label follows. <sup>j</sup>
    <sup>td34</sup>
33. **"Custom".** Choosing "Custom" and typing a pattern in its box
    ("d/m/Y") saves that pattern, and the dates print in it. A "Custom"
    left with an empty box saves no format, and the dates print in the
    installation's default for that group (Settings bullet 27). Under
    "Date (Short)" that save also leaves the editorial dates showing the
    time without the date ⚠ [A9](#a9). <sup>j</sup> <sup>td35</sup>

33a. **"S" in a "Custom" pattern.** A pattern holding "S", the English
    ordinal ending ("th" in "5th"), loses that ending on some editorial
    screens. With "jS M Y H:i" saved under "Date & Time (Short)", a
    library file's "Date uploaded" reads "5th Oct 2026 04:38", but a
    discussion message "5 Oct 2026 04:38" ⚠ [A18](#a18). <sup>j</sup>

**The Settings Wizard**

34. **Its "Appearance" tab.** The Site Administrator's Settings Wizard of
    a journal is reached from Administration › Hosted Journals: the
    journal's row's arrow offers "Edit", "Remove" and "Settings wizard".
    The wizard's top tabs are "Journal Settings" ("Setup" on a press,
    "Server Settings" on a preprint server), "Plugins" and "Users"; the
    first holds the side tabs "Journal" ("Press", "Server"),
    "Appearance", "Languages", "Search Indexing" and "Restrict Bulk
    Emails". "Appearance" holds the fields of the journal's own "Theme"
    tab (Fields), and a save there changes the journal as a save on its
    own tab does. A change there is kept while another of the wizard's
    side tabs is open, and dropped without a question when the page is
    reloaded or left. Every tab but "Appearance" is *Hosted journals*'s.
    On a journal with no issue, the wizard shows "Include the current
    issue's table of contents" ticked where the journal's own tab shows
    "Include recent most published articles", and a save there stores
    what the wizard shows ⚠ [OJS4](#ojs4). <sup>x</sup> <sup>td36</sup>

**Other languages of the interface**

35. **French: raw codes.** In the French interface some labels show as
    raw codes, words between "##" marks ⚠ [A6](#a6):
    - on a press's "Theme": the only entry of the "Thème" list and every
      label, description and choice of the default theme's fields,
      "Press Summary" included;
    - on a press's "Setup": the thumbnail's label and help, the "Browse
      Block" box of "Sidebar", "Featured Books" and "New Releases" with
      their boxes, and "Order of monographs" with its description and
      its two "Series position" choices (the title and date choices are
      in French);
    - on a press's "Advanced": "Cover Image Max Width", "Cover Image Max
      Height" and the note under each;
    - on a preprint server's "Theme": "Usage statistics display options"
      and its three choices.

    A journal's "Theme" shows the "Journal Content Organization" field,
    its description and its three boxes as codes too: they are texts no
    released version has yet, untranslated in every language, so these
    codes are expected, not a defect. A journal's and a preprint
    server's "Setup" and "Advanced" show no raw code. <sup>td37</sup>

35a. **French: the upload boxes.** In the French interface the drop area
    of every upload box on "Setup" ("Logo", the thumbnail, "Homepage
    Image") and "Advanced" (the style sheet, "Favicon") reads the English
    "Drop files here to upload", beside the French button "Téléverser un
    fichier" ⚠ [A12](#a12). A file the box refuses gets the English "You
    can't upload files of this type.", and the "Remove file" link on the
    refused file's frame is English too. <sup>td38</sup>

35b. **French: "Entête".** In the French interface the side tab
    "Editorial Masthead" reads "Entête", and the order list's description
    reads "Définir l’ordre des rôles sur la page de l'équipe éditoriale de
    la revue." ("the journal's editorial team page") on a press and a
    preprint server too ⚠ [A11](#a11). On a journal and a press the
    "Évaluateurs-trices" group below it names no journal; a preprint
    server's tab has no "Évaluateurs-trices". On a preprint server the
    list names the Moderator role "##default.groups.name.sectionEditor##", as the French
    public masthead does
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops4)).
    <sup>td38</sup>

## Side effects

- None beyond the pages themselves: saving these tabs sends no email,
  creates no notification and writes no line to any log a manager can
  read. <sup>c</sup>
- Uploaded pictures and the style sheet are public files of the journal,
  open to anyone at their address. "Remove" and "Save" delete a "Logo",
  "Homepage Image" or "Favicon" file. They keep the style sheet's file
  ([A5](#a5)) and the thumbnail's ⚠ [A20](#a20), which still open at
  their old address. <sup>d</sup>

## Settings that modify behavior

The fields of this feature's own tabs, then the settings of other screens
that change them.

1. **"Theme"** (Settings › Website › "Appearance" › "Theme"; "Default
   Theme", the only one installed). Another theme, once installed as a
   plugin: Rule 4. <sup>k</sup>
2. **"Typography"** (the same tab; "Noto Sans: …"). Another choice: Rule 5.
   <sup>e</sup>
3. **"Colour"** (the same tab; "#1E6292"). Another colour: Rules 6, 6a.
   <sup>e</sup>
4. **"Journal Summary"** (the same tab; unticked). Ticked: Rule 7.
   <sup>e</sup>
5. **"Journal Content Organization"** {OJS} (the same tab; ticked as Rule
   10 says). Each box ticked or unticked: Rules 13–15; none ticked:
   Rule 10. <sup>o</sup>
6. **"Header Background Image"** (the same tab; unticked). Ticked with a
   homepage image: Rule 8. <sup>q</sup>
7. **"Usage statistics display options"** (the same tab; "Do not display
   submission usage statistics chart for reader."). A chart: Rule 9.
   <sup>z</sup>
8. **"Show Series"** {OMP} (the same tab; unticked). Ticked: the catalog
   page lists links to the press's series ("Series: …") when more than
   one series holds a published book (*Catalog browse*). <sup>e</sup>
9. **"Logo"** (Settings › Website › "Appearance" › "Setup"; none). Set:
   Rule 20. <sup>r</sup>
10. **The thumbnail** (the same tab; none). Set: Rule 21. <sup>r</sup>
11. **"Homepage Image"** (the same tab; none). Set: Rule 18, and with
    bullet 6, Rule 8. <sup>q</sup>
12. **"Page Footer"** (the same tab; empty). Set: Rule 22. <sup>r</sup>
13. **"Sidebar"** (the same tab; no block ticked). Ticked blocks: Rule 24.
    <sup>s</sup>
14. **"Featured Books", "New Releases", "Order of monographs"** {OMP} (the
    same tab; see Fields). They show or hide the home page's two book
    lists (Rule 17) and set the order of the catalog's books (*Catalog
    browse*). <sup>f</sup>
15. **"Editorial Masthead"** (Settings › Website › "Appearance" ›
    "Editorial Masthead"; the roles' permission-level order). Another
    order: Rule 28. <sup>u</sup>
    - 15a. **"Present a masthead based on user enrollments"** (the same
      tab, group "Enrollment-based Masthead"; ticked on a new journal).
      Unticked: the list and "Reviewers" leave the tab (Fields), and the
      public masthead lists no roles (Rule 28a;
      [Journal identity & about pages](U07-journal-identity-and-about-pages.md),
      Settings bullet 4a and Rule 14f). <sup>u</sup>
    - 15b. **"Enable listing of reviewers on the masthead"** {OJS OMP}
      (the same tab, group "Reviewers"; unticked on a new journal and
      press). Ticked: the public masthead lists "Peer Reviewers in
      Previous Year"
      ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
      Settings bullet 4c and Rule 15). <sup>u</sup>
16. **The style sheet** (Settings › Website › "Appearance" › "Advanced";
    none). Set: Rule 26. <sup>t</sup>
17. **"Favicon"** (the same tab; none). Set: Rule 27. <sup>t</sup>
18. **"Additional Content"** (the same tab; empty). Set: Rule 19.
    <sup>m</sup>
19. **"Cover Image Max Width", "Cover Image Max Height"** {OMP} (the same
    tab; 106 and 100). Other sizes: every book's cover thumbnail is
    remade at the new size when the tab is saved (*Catalog management*).
    <sup>h</sup>
20. **"Items per page"** (Settings › Website › "Setup" › "Lists"; 25).
    Another number: Rule 29. <sup>v</sup>
21. **"Page links"** (the same tab; 10). Another number: Rule 30.
    <sup>v</sup>
22. **"Date", "Date (Short)", "Time", "Date & Time", "Date & Time
    (Short)"** (Settings › Website › "Setup" › "Date & Time"; the choices
    marked in Fields). Another choice: Rules 31–33. <sup>j</sup>
23. **The block plugins** (Settings › Website › "Plugins" › "Installed
    Plugins"; enabled on a new journal: the blocks Rule 23 lists;
    disabled: ""Developed By" Block", ""Make a Submission" Block"
    {OJS OMP} and, on a journal and a preprint server, "Browse Block").
    Enabled or disabled: Rules 23, 25.
    *Plugins management* owns the list. <sup>s</sup>
24. **"Consider role in masthead list"** (Settings › Users & Roles ›
    "Roles", a role's "Edit"; ticked on the roles Rule 28 names and on
    the Reviewer role, "External Reviewer" on a press, where "Internal
    Reviewer" arrives unticked). Ticked or unticked: which
    roles "Editorial
    Masthead" lists (Rule 28). *Roles configuration* owns it. <sup>u</sup>
25. **"Publishing Mode"** {OJS} (Settings › Distribution › "Access"; no
    choice marked on a new journal). "OJS will not be used to publish the
    journal's contents online.": no "Current Issue" on the home page
    (Rule 14). *Subscriptions & open access control* owns it. <sup>o</sup>
26. **"Forms"** (Settings › Website › "Setup" › "Languages"; the primary
    language alone on a new journal). Each language added: a value per
    language on the per-language fields (Rule 3) and its own "Date &
    Time" choices (Rule 3a); a language ticked under "UI" alone gets the
    default formats (Rule 3b). *Languages & locales* owns it. <sup>y</sup>
27. **The default formats** (the installation's configuration file; the
    choices marked in Fields). They are the formats of a journal that
    never saved "Date & Time", of a language it never saved them in
    (Rule 3a) or cannot save them in (Rule 3b), and of a group saved with
    an empty "Custom" (Rule 33). They are one set for every language,
    written in the visitor's words. No screen changes them. <sup>j</sup>

## Cross-feature interactions

- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns who opens the Settings pages, how a tab saves and what an unsaved
  change does, the "Journal Summary" text, and the "Editorial Masthead"
  and "Editorial History" pages; this spec owns the summary's place on the
  home page and the order of the masthead's roles.
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the header, the footer and the listing pages' page links; this
  spec owns the logo, the "Page Footer" text, the theme's colour and
  fonts, the sidebar's list and the numbers "Lists" sets.
- [Custom pages & blocks](U09-custom-pages-and-blocks.md) owns the
  custom blocks and the pictures of the formatted-text boxes; this spec
  owns where a block stands in the sidebar.
- [Highlights](U11-highlights.md) and [Announcements](U12-announcements.md)
  own the carousel and the announcements on the home page; this spec owns
  the page around them.
- [Search](U15-search.md) owns the Search page whose results page by
  "Items per page" and "Page links".
- [Submission wizard](U21-submission-wizard.md) owns the ""Make a
  Submission" Block".
- *Article landing page & reading* owns the article summaries of the
  home page's lists and the "Downloads" section on the landing page;
  *Monograph landing page* the same section on a book's page.
- *Issues* owns the current issue's table of contents; *Categories* owns
  the category pages; *Sections* owns a preprint server's search box and
  category links on its home page.
- *Catalog browse* and *Catalog management* own the books a press's home
  page lists, the catalog's order and series links, and cover thumbnails.
- *Hosted journals* owns the Settings Wizard and the site's list of
  journals where the thumbnail shows; *Site settings* owns the site's own
  appearance.
- *Plugins management* owns enabling themes and block plugins; *Roles
  configuration* owns "Consider role in masthead list" and the "Roles"
  list; *Languages &
  locales* owns the form languages; *Subscriptions & open access control*
  owns "Publishing Mode"; *Users management* owns the "Users" list.

## Canonical scenarios

Every scenario changes a setting, so all of them run on scratch journals
(scratch presses, scratch preprint servers) with a throwaway Journal
Manager, the Site Administrator joining in scenario 2, and a signed-out
visitor reads the public pages in a second browser; the accounts, their
passwords and the tooling recipe are in the footnote. <sup>sc</sup>

1. **A new journal's home page, its summary, its additional content and a style sheet**

   Given: Journal Manager, on a scratch journal with nothing published
   whose "Journal Summary" (Settings › Journal › "Masthead") reads "A
   journal for testing.", a visitor, signed out, in a second browser,
   and two files: "red-headings.css", a style sheet whose one rule
   colours every heading red, and "picture.png", a PNG picture.

   - **The home page, nothing set**: the visitor opens the journal's
     address: the header, the footer and an empty page between them; on
     a preprint server, a search box and the heading "Latest preprints"
     with nothing under it (Rules 11, 12, 16).
   - **The "Theme" tab as it opens**: open Settings › Website: the page
     opens on "Appearance" › "Theme" (Rule 1), and "Theme" offers
     "Default Theme" alone (Rule 4). On a journal the fields below it
     read, in this order, "Typography", "Colour", "Journal Summary",
     "Journal Content Organization", "Header Background Image" and "Usage
     statistics display options"; a preprint server shows the same
     without "Journal Content Organization"; a press shows "Typography",
     "Press Summary", "Header Background Image", "Colour", "Show Series"
     and "Usage statistics display options". "Noto Sans: A digital-native
     font designed by Google for extensive language support." is chosen,
     the colour box reads "#1E6292", "Show the journal summary on the
     homepage." ("…the press summary…", "…the server summary…") and "Show
     the homepage image as the header background." are unticked, "Do not
     display submission usage statistics chart for reader." is chosen,
     and on a press "Add list of links to all of the press's series on
     the catalog page" is unticked (Fields, "Theme").
   - **The summary**: tick "Show the journal summary on the homepage."
     and press "Save": "Saved" shows beside the button. The visitor
     reloads the home page: a section headed "About the Journal" ("About
     the Press", "About the Server") holds "A journal for testing.", and
     the page's skip links gain one to it (Rule 7).
   - **"Additional Content"**: open "Advanced", type "Welcome text" in
     "Additional Content" and press "Save". The visitor reloads: "Welcome
     text" stands at the foot of the home page, after "About the
     Journal"; the "About the Journal" page, opened from the header's
     "About" menu, does not show it (Rules 12, 19).
   - **The style sheet**: press "Upload File" under "Journal style sheet"
     ("Press style sheet", "Server style sheet") and choose
     "red-headings.css": the box shows "red-headings.css" and "Remove";
     press "Save": "Saved", and the box still reads "red-headings.css".
     Reload the page and open "Advanced": the box shows "styleSheet.css",
     a link to the stored file, and "Remove" (Fields, "Advanced"). The
     visitor reloads the home page: the heading "About the Journal" is
     red. No heading on the Journal Manager's Dashboard turns red
     (Rule 26).
   - **Removed**: press "Remove" and "Save". The visitor reloads: "About
     the Journal" is back in the theme's colour [A5](#a5) (Rule 26).
   - **A file the box does not take**: drop "picture.png" on the empty
     style sheet box: "You can't upload files of this type." shows in the
     box and nothing is sent (Fields, the upload boxes).
   - **Control**: before the summary box was ticked, the visitor's home
     page showed "A journal for testing." nowhere (Rule 7).

2. **The fonts, the header's colour and the favicon, from the journal and from the Settings Wizard**

   Given: Journal Manager and the Site Administrator, on a scratch
   journal, a visitor, signed out, in a second browser, and two files:
   "icon.png", a PNG picture, and "photo.jpg", a JPEG picture.

   - **Kept across side tabs**: on Settings › Website › "Appearance" ›
     "Theme" choose "Lora/Open Sans: A complimentary pairing with serif
     headings and sans-serif body text." under "Typography", open the
     side tab "Setup" and come back to "Theme": the choice is still marked
     (Rule 2).
   - **"Typography"**: press "Save": "Saved". The visitor reloads the
     home page: the journal's name in the header is in Lora and the text
     in Open Sans; on a preprint server the heading "Latest preprints" is
     in Lora too. The visitor opens "About the Journal" from the header's
     "About" menu: its heading "About the Journal" is in Lora and the text
     in Open Sans (Rule 5).
   - **"Colour", light**: type "#FFFF00" in the colour box under
     "Colour" and press "Save". The visitor reloads the home page, then
     opens "About the Journal" from the header's "About" menu: on both,
     the header (the band holding the journal's name and the primary
     menu) is yellow and its text dark (Rule 6).
   - **"Colour", dark**: type "#000080" and press "Save": the visitor's
     reloaded header is navy blue (Rule 6).
   - **A code the box cannot read**: type "red" in the colour box and
     press "Save": "Saved" shows, and the visitor's reloaded header stays
     navy blue (Rule 6).
   - **A file the favicon box does not take**: open "Advanced" and drop
     "photo.jpg" on "Favicon": "You can't upload files of this type."
     shows in the box and nothing is sent. Reload the page and open
     "Advanced" again: "Favicon" is empty (Fields, "Advanced"; Rule 2).
   - **"Favicon"**: press "Upload File" under "Favicon", choose
     "icon.png" and press "Save". The visitor reloads the home page: the
     browser tab's icon is "icon.png"; the Journal Manager's browser tab
     on the Dashboard shows it too (Rule 27).
   - **The Site Administrator's wizard**: sign in as the Site
     Administrator, open Administration › Hosted Journals and press the
     arrow of the journal's row: it offers "Edit", "Remove" and "Settings
     wizard". Choose "Settings wizard": the top tabs read "Journal
     Settings" ("Setup" on a press, "Server Settings" on a preprint
     server), "Plugins" and "Users", and the first holds the side tabs
     "Journal" ("Press", "Server"), "Appearance", "Languages", "Search
     Indexing" and "Restrict Bulk Emails" (Rule 34).
   - **Unsaved in the wizard**: open "Appearance": it holds the fields of
     the journal's "Theme" tab. Type "#1B5E20" in the colour box, open
     "Journal" and come back: the box still reads "#1B5E20". Reload the
     page: no question is asked; open "Appearance" again: the box no
     longer reads "#1B5E20" (Rule 34).
   - **Saved in the wizard**: type "#1B5E20" again and press "Save". The
     visitor reloads: the header is dark green. The Journal Manager
     reloads the "Theme" tab: the colour box reads "#1B5E20" (Rule 34).
     On a journal with no issue the same save also stores "Include the
     current issue's table of contents" [OJS4](#ojs4).
   - **Control**: through every save, the Journal Manager's Dashboard
     kept its own header colour and fonts (Rule 4).

3. **The logo, the thumbnail, the homepage image and the page footer**

   Given: Journal Manager, on a scratch journal, a visitor, signed out,
   in a second browser, and four PNG pictures: "logo.png", 1600 × 160
   pixels; "logo2.png", another picture; "thumb.png"; and "home.png", 300
   × 100 pixels.

   - **"Logo" uploaded**: open Settings › Website › "Appearance" ›
     "Setup", press "Upload File" under "Logo" and choose "logo.png": a
     small preview shows with "Remove", no "Restore Original", and an
     "Alternate text" box beside it under the guidance "Describe this
     image for visitors viewing the site in a text-only browser or with
     assistive devices. Example: "Our editor speaking at the PKP
     conference."" (Fields, the upload boxes).
   - **"Logo" saved**: type "Journal logo" in "Alternate text" and press
     "Save": "Saved". The visitor reloads the home page: the logo stands
     in the header in place of the journal's name, 800 × 80 pixels, with
     "Journal logo" as its description, and pressing it opens the home
     page; the "About the Journal" page, from the header's "About" menu,
     carries it too (Rule 20). The visitor notes the logo picture's own
     address.
   - **Replaced, then restored**: reload the page and open "Setup": the
     "Logo" box shows its preview and "Journal logo", with no "Upload
     File". Press "Remove": "Restore Original" and "Upload File" show.
     Press "Upload File" and choose "logo2.png": it arrives with an empty
     "Alternate text", and "Restore Original" still shows; press "Restore
     Original": "logo.png" is back, with "Journal logo" in "Alternate
     text" (Fields, the upload boxes).
   - **Replaced from the keyboard**: reload the page and open "Setup".
     Press Tab until the focus reaches the "Logo" box's "Upload File",
     which a screen reader announces though the screen does not show it,
     and press Enter: the file chooser opens. Choose "logo2.png": it
     takes the place of "logo.png" with an empty "Alternate text", and
     "Restore Original" shows; press "Restore Original": "logo.png" is
     back, with "Journal logo" (Fields, the upload boxes).
   - **The thumbnail**: press "Upload File" under "Journal thumbnail"
     ("Press thumbnail", "Server thumbnail"), choose "thumb.png", type
     "Thumb" in its "Alternate text" and press "Save". The visitor opens
     the site's home page, the install's own address: beside the journal
     in the list of journals stands "thumb.png", with "Thumb" as its
     description (Rule 21).
   - **"Homepage Image"**: upload "home.png" under "Homepage Image", type
     "Our building" in its "Alternate text" and press "Save". The visitor
     reloads the journal's home page: on a journal the picture is
     stretched to the full width of the page's main column, with "Our
     building" as its description; on a press and a preprint server it
     shows at 300 × 100 pixels [A1](#a1) (Rule 18).
   - **"Header Background Image"**: open "Theme", tick "Show the homepage
     image as the header background." and press "Save". The visitor
     reloads the home page, then opens "About the Journal": on both the
     picture fills the header's background, and the home page no longer
     shows it in its body (Rule 8). Untick the box and press "Save": the
     visitor's reloaded home page shows the picture in its body again,
     and the header's background no longer holds it (Rule 18).
   - **"Page Footer"**: open the side tab "Setup", type "Footer line" in
     "Page Footer"
     and press "Save". The visitor reloads the home page, then "About the
     Journal": "Footer line" stands at the foot of both, above the
     application's logo (Rule 22).
   - **"Logo" removed**: press "Remove" under "Logo": "Restore Original"
     shows; press "Save". The visitor reloads the home page: the header
     shows the journal's name again (Rule 20); the logo's address noted
     before no longer opens the picture (Side effects).
   - **Control**: before the first "Save", the uploaded "logo.png" had
     not reached the visitor's header: an upload counts only once the tab
     is saved (Fields, the upload boxes).

4. **The sidebar: blocks placed, ordered, switched off and removed**

   Given: Journal Manager, on a scratch journal with English as its one
   language, and a visitor, signed out, on its home page in a second
   browser.

   - **The list as it opens**: open Settings › Website › "Appearance" ›
     "Setup": "Sidebar" holds one box per block, none ticked: "Web Feed
     Plugin", "Information Block", "Subscription Block" and "Language
     Toggle Block" on a journal; the same with "Browse Block" in place of
     "Subscription Block" on a press; "Web Feed Plugin" and "Language
     Toggle Block" alone on a preprint server. There is no ""Make a
     Submission" Block" (Rule 23).
   - **A block plugin enabled**: open Settings › Website › "Plugins" ›
     "Installed Plugins" and tick ""Developed By" Block". Reload the page
     and open "Appearance" › "Setup": "Sidebar" now holds a box
     ""Developed By" Block", unticked (Rule 23).
   - **Placed**: tick "Web Feed Plugin", ""Developed By" Block" and
     "Language Toggle Block" and press "Save". Reload the page: the three
     ticked boxes stand first in "Sidebar", the unticked ones after them
     (Rule 23). The visitor reloads the home page: beside the content, a
     sidebar holds the "Web Feed Plugin" block and the ""Developed By"
     Block" in the list's order, and nothing for "Language Toggle Block",
     the journal having one language (Rule 24).
   - **Dragged**: drag ""Developed By" Block" by its handle to the top of
     the list and press "Save": the visitor's reloaded sidebar shows the
     ""Developed By" Block" first (Rules 23, 24).
   - **Moved by its arrow**: press the up arrow of "Web Feed Plugin",
     whose text reads "Increase position of Web Feed Plugin", until the
     row stands first, and press "Save": the visitor's reloaded sidebar
     shows the "Web Feed Plugin" block first [A3](#a3) (Rules 23, 24).
   - **Its plugin switched off**: on "Plugins" › "Installed Plugins",
     untick "Web Feed Plugin" and confirm. The visitor reloads: its block
     has left the sidebar. Reload Settings › Website and open "Appearance"
     › "Setup": "Sidebar" no longer lists it; leave the tab unsaved (a
     save there is refused now [A4](#a4)) (Rule 25).
   - **Its plugin switched on again**: tick "Web Feed Plugin" on
     "Plugins" › "Installed Plugins". Reload and open "Appearance" ›
     "Setup": "Sidebar" lists "Web Feed Plugin" ticked and first again; the visitor's
     reloaded sidebar shows its block first again (Rule 25).
   - **None ticked**: untick every box in "Sidebar" and press "Save". The
     visitor reloads the home page, then opens "About the Journal": no
     page has a sidebar, and the content keeps its width and stands in
     the middle of the page (Rule 24).
   - **Control**: before the first "Save", the visitor's home page had no
     sidebar (Rules 23, 24).

5. **The order of the masthead's roles**

   Given: Journal Manager, on a scratch journal whose "Editorial
   Masthead" tab has never been saved and whose "Journal editor",
   "Section editor" and "Editorial Board Member" roles ("Press editor",
   "Series editor" and "Editorial Board Member" on a press; "Moderator"
   and "Editorial Board Member" on a preprint server) each have a
   current member and a former one, and a visitor, signed out, in a
   second browser.

   - **The list as it opens**: open Settings › Website › "Appearance" ›
     "Editorial Masthead": "Present a masthead based on user enrollments"
     is ticked; under "Define the order of masthead roles for public
     display." the list reads "Journal editor", "Section editor",
     "Editorial Board Member" ("Press editor", "Series editor", "Editorial
     Board Member"; "Moderator", "Editorial Board Member"), each row with
     a drag handle and up and down arrows and no box to tick, and no
     Reviewer role. Below it, on a journal and a press, "Reviewers" with
     the note "Reviewers who completed a review in the previous calendar
     year will be credited in a standardized format to maintain
     uniformity and ensure easy discoverability in this section." and the
     box "Enable listing of reviewers on the masthead", unticked; on a
     preprint server nothing follows the list (Fields, "Editorial
     Masthead"; Rule 28).
   - **A role ticked before the first save** {OJS OMP}: open Settings ›
     Users & Roles › "Roles", press "Edit" on the "Production editor"
     row, tick "Consider role in masthead list" and save the window.
     Reload Settings › Website and open "Editorial Masthead": "Production
     editor" is in the list, above "Section editor" ("Series editor"), at
     the place of its permission level (Rule 28; Settings bullet 24).
   - **Reordered**: press the up arrow of "Editorial Board Member" until
     the row stands first, and press "Save": "Saved". The visitor opens
     "Editorial Masthead" from the header's "About" menu: "Editorial Board
     Member" is the first role heading, the others following in the
     list's order; the visitor presses "Editorial History" in the line
     "View Editorial History": that page's first role heading is
     "Editorial Board Member" too (Rule 28).
   - **A role ticked after the first save** {OJS OMP}: on Settings ›
     Users & Roles › "Roles", tick "Consider role in masthead list" for
     "Layout Editor" the same way. Reload Settings › Website and open
     "Editorial Masthead": "Layout Editor" stands last in the list
     (Rule 28; Settings bullet 24).
   - **Control**: before the "Save", the visitor's "Editorial Masthead"
     page listed "Editorial Board Member" as its last role heading
     (Rule 28).

6. **The "Lists" tab: refused numbers, then one entry a page**

   Given: Journal Manager, on a scratch journal holding three articles
   published outside any issue (a scratch press with nothing published;
   a scratch preprint server with eleven preprints posted today), and a
   visitor, signed out, in a second browser.

   - **As it opens**: open Settings › Website › "Setup" › "Lists":
     "Items per page" reads 25 and "Page links" 10 (Fields, "Lists").
   - **"Latest preprints"** {OPS}: the visitor opens the home page: under
     "Latest preprints" stand ten of the eleven preprints, with no page
     links (Rule 16).
   - **Refused**: empty "Items per page" and press "Save": "This field is
     required." and nothing is sent. Type "0" and press "Save": "This
     must be at least 1."; the same for "-1". Type "abc" and press
     "Save": "This is not a valid integer."; the same for "2.5". Type "25"
     back in "Items per page", type "0" in "Page links" and press "Save": "This must be at
     least 1." (Fields, "Lists").
   - **No upper limit**: type "100000" in both boxes and press "Save":
     "Saved" (Fields, "Lists").
   - **One a page**: type "1" in "Items per page" and "3" in "Page links"
     and press "Save": "Saved"; reloaded, the tab reads 1 and 3 (Rule 2).
   - **"Latest Publications"** {OJS}: the visitor reloads the home page:
     under "Latest Publications" one article, "1 - 1 of 3 items", the
     page numbers, ">" and ">>", and no "<<" or "<". The visitor presses
     "2": "2 - 2 of 3 items", then "<<", "<", "1 2 3" with 2 in the
     middle, ">" and ">>". The visitor presses "3": "3 - 3 of 3 items",
     with no ">" or ">>" (Rules 13, 29, 30).
   - **"Latest preprints" unchanged** {OPS}: the visitor reloads the home
     page: "Latest preprints" still lists ten preprints, with no page
     links: "Items per page" does not apply there (Rule 16).
   - **Control**: Settings › Users & Roles › "Users" still lists every
     user of the journal on one page (Rule 29).

7. **Date formats, from the tab to the public pages**

   Given: Journal Manager, on a scratch journal with announcements on,
   "Display on Homepage" at 1 and one announcement, "Call for papers",
   posted today, a published book {OMP}, and a visitor, signed out, in
   a second browser. The dates below are written for 24 September 2026
   at 3:05 in the afternoon; the tab and the pages show the tester's
   own day and time in the same patterns.

   - **The tab as it opens**: open Settings › Website › "Setup" › "Date &
     Time": under "Date and Time Formats", five groups, each choice but
     "Custom" written as today's date or time in its pattern. Chosen:
     "September 24, 2026" under "Date", "2026-09-24" under "Date
     (Short)", "03:05 PM" under "Time", "September 24, 2026 - 03:05 PM"
     under "Date & Time" and "2026-09-24 03:05 PM" under "Date & Time
     (Short)" (Fields, "Date & Time").
   - **The combined choices follow**: under "Date (Short)" choose
     "24.09.2026": the ready choice of "Date & Time (Short)" now reads
     "24.09.2026 03:05 PM" and is still the chosen one. Choose
     "2026-09-24" again: it reads "2026-09-24 03:05 PM" again. Choose
     "24.09.2026" once more, then under "Date" choose "24 September
     2026": the ready choice of "Date & Time" now reads "24 September
     2026 - 03:05 PM" (Rule 32). Press "Save": "Saved".
   - **The visitor's dates**: the visitor reloads the home page: the
     announcement's posted date reads "24.09.2026" (Rule 31). {OMP} The
     book's page gives its "Published" date as "24 September 2026", and
     the catalog lists the book with the same date (Rule 31).
   - **"Custom"**: under "Date (Short)" choose "Custom", type "d/m/Y" in
     its box and press "Save". The visitor reloads the home page: the
     announcement's date reads "24/09/2026" (Rule 33).
   - **Control**: before the first "Save", the visitor's home page gave
     the announcement's date as "2026-09-24" (Fields, "Date & Time";
     Rule 31).

8. **A journal in two languages**

   Given: Journal Manager, working in English, on a scratch journal
   whose primary language is English, with French ticked under "UI" and
   "Forms", announcements on, "Display on Homepage" at 1 and one
   announcement posted today, a visitor, signed out, in a second
   browser, and "logo.png", a PNG picture.

   - **A French footer alone**: open Settings › Website › "Appearance" ›
     "Setup", press "French" at the top of the tab, type "Pied de page"
     in the French "Page Footer" box, leave the English one empty and
     press "Save". The visitor opens {journal address}/en, the home page
     in English: its foot reads "Pied de page"; {journal address}/fr_CA,
     the home page in French, reads the same (Rule 3).
   - **Both languages**: type "English footer" in the English "Page
     Footer" box and press "Save": the visitor's reloaded English page
     reads "English footer", the French one still "Pied de page"
     (Rule 3).
   - **An English logo alone**: press "Upload File" under the English
     "Logo", choose "logo.png", type "Journal logo" in "Alternate text",
     leave the French "Logo" empty and press "Save". The visitor reloads
     the French page: its header shows the logo, with "Journal logo" as
     its description (Rule 3).
   - **Dates per language**: open "Setup" › "Date & Time", press
     "French", choose "24.09.2026" under the French "Date (Short)" and
     press "Save". The visitor reloads both pages: the announcement's
     posted date reads "24.09.2026" on the French one and "2026-09-24" on
     the English one (Rule 3a).
   - **Control**: before the first "Save", the foot of the English page
     held no footer text (Fields, "Setup": "Page Footer" empty on a new
     journal).

9. **A journal with no issue: its recent articles and its categories** {OJS}

   Given: Journal Manager, on a scratch journal with no issue, two
   articles published outside any issue and the categories "Arts" and
   "Science", "Science" holding the subcategory "Physics", and a
   visitor, signed out, in a second browser.

   - **As it opens**: open Settings › Website › "Appearance" › "Theme":
     under "Journal Content Organization" only "Include recent most
     published articles" is ticked (Rule 10).
   - **The home page**: the visitor opens it: "Latest Publications"
     lists the two articles with "1 - 2 of 2 items" and no page links;
     there is no row of categories and no "Current Issue" (Rules 12, 13,
     15).
   - **The categories**: tick "Include a listing of categories" and press
     "Save". The visitor reloads the home page: above "Latest
     Publications" stands a row of links, "Arts" and "Science", without
     "Physics"; "Arts" opens that category's page (Rules 12, 15).
   - **Recent articles off**: untick "Include recent most published
     articles" and press "Save": the visitor's reloaded home page keeps
     the row of categories and no longer shows "Latest Publications"
     (Rule 10).
   - **Control**: reloaded, the "Theme" tab has "Include a listing of
     categories" ticked alone (Rule 2).

10. **A journal with a current issue, then not published online** {OJS}

    Given: Journal Manager, on a scratch journal with one published
    issue, "Vol. 1 No. 1 (2026)", holding no article, and a visitor,
    signed out, in a second browser.

    - **As it opens**: open Settings › Website › "Appearance" › "Theme":
      under "Journal Content Organization" only "Include the current
      issue's table of contents" is ticked (Rule 10).
    - **The home page**: the visitor opens it: the heading "Current
      Issue", the issue's name "Vol. 1 No. 1 (2026)", no article under
      it, then the link "View All Issues", which opens the archive
      (Rule 14).
    - **Not published online**: open Settings › Distribution › "Access",
      choose "OJS will not be used to publish the journal's contents
      online." under "Publishing Mode" and save the tab. The visitor
      reloads the home page: "Current Issue" is gone (Rule 14; Settings
      bullet 25).
    - **Control**: the home page never showed "Latest Publications": the
      journal has no article outside a published issue (Rule 13).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the "Homepage Image" description typed in scenario 3 read on a press's and a preprint server's home page, as on a journal's (A1; the guard its issue report names)
  - the names a screen reader hears for the "Editorial Masthead" arrows ("Increase position of {role}" for an up arrow) and for each "Sidebar" box (the block's name alone) (A3; the guard its issue report names)
  - a placed block's plugin turned off, then a "Page Footer" saved on "Setup" without a refusal (A4; the guard its issue report names)
  - a style sheet removed and saved, its old address answering "404 Not Found" (A5; the guard its issue report names)
  - the French (Canada) "Apparence" tabs of a press and a preprint server showing no "##" code {OMP OPS} (A6; the guard its issue report names)
  - a ".pdf" picked for "Logo" with "Upload File" and refused, then "Upload File" and the tab's "Save" enabled again (A7; the guard its issue report names)
  - a press's French (Canada) "Entête" description naming no journal ("la revue") {OMP} (A11; the guard its issue report names)
  - a French upload box's drop area reading the French text (A12; the guard its issue report names)
  - a journal's home page with "Latest Publications" showing each article title as a heading one level below the list's heading {OJS} (OJS6; the guard its issue report names)
  - a press category holding more books than "Items per page" showing page links, its page 2 listing the next book {OMP} (OMP2; the guard its issue report names)
  - a press's French pages giving a book's date in the default format before a French "Date" is saved, and in the saved one after, the English pages unchanged {OMP} (Rule 3a)
  - French ticked under "UI" alone: "Date & Time" without a "French" button, and a press's French pages keeping the default format after an English "Date" is saved {OMP} (Rule 3b)
  - a chapter's page printing the book's "Date" {OMP} (Rule 31)
  - "Present a masthead based on user enrollments" unticked: the list and "Reviewers" leaving the tab before any save; saved, the box still unticked after a reload; ticked again and saved, the list back in its saved order, a role moved just before the box was unticked included (Fields, "Editorial Masthead"; Rule 28a; Settings bullet 15a)
  - "Enable listing of reviewers on the masthead" ticked and saved, still ticked after a reload {OJS OMP} (Fields, "Editorial Masthead"; Settings bullet 15b)
- **Nothing new to test**:
  - a role newly considered for the masthead on a preprint server, before and after the tab's first save {OPS} (Rule 28; Settings bullet 24)
  - the Editor and the Production Editor on the same tabs: the same fields and saves as the Journal Manager in scenarios 1 to 10 (Actors row 1)
- **Register carries it**:
  - A1 (a press's and a preprint server's homepage image without its description; Rule 18; scenario 3 marks it)
  - A2 (a logo saved without alternate text, the header's home link left without a name; Rule 20)
  - A3 (the ordering arrows' names for a screen reader; Rules 23, 28; scenario 4 marks it)
  - A4 ("Setup" refusing a save while a placed block's plugin is disabled; Rule 25; scenario 4 marks it)
  - A5 (the removed style sheet's file still opening at its address; Rule 26; scenario 1 marks it)
  - A6 (the French interface's raw codes on a press's and a preprint server's "Theme" tab, and on a press's "Setup" and "Advanced"; Rule 35)
  - A7 (a file refused through "Upload File" locking the box and the tab's "Save"; Fields, the upload boxes)
  - A8 (the "3:05PM" time choice printed in lower case; Fields, "Date & Time")
  - A9 (an empty "Custom" under "Date (Short)" leaving the editorial dates without the date; Rule 33)
  - A10 (a browser that opened the journal before keeping the old header colour after a "Colour" save; Rule 6a)
  - A11 (the French "Entête" description naming a journal on a press and a preprint server; Rule 35b)
  - A12 (the French upload boxes' drop area, refusal and "Remove file" in English; Rule 35a)
  - A13 (the default French date in the English word order {OMP}; Rule 3a)
  - A14 (roles of the same level changing places on "Editorial Masthead" before its first save; Rule 28)
  - A15 (the refused file's hidden "Remove file" leaving "Save" disabled; Fields, the upload boxes)
  - A16 (a "Logo" the server fails on, the box left with a warning sign and no message; Fields, the upload boxes)
  - A17 (a "Sidebar" block whose label holds a double quote or "&", its arrows' names carrying HTML code; Rule 23)
  - A18 (a "Custom" pattern with "S", the ordinal ending missing from a discussion's messages; Rule 33a)
  - A19 (the French time written "a.m." on a discussion's messages and "AM" on a library file; Rule 3c)
  - A20 (a removed thumbnail's file still opening at its address; Side effects)
  - OJS2 (a first issue created on a journal that never saved "Theme", the home page switching by itself {OJS}; Rule 10)
  - OJS3 (a published issue's articles absent from "Latest Publications", the list ordered by submission {OJS}; Rule 13)
  - OJS4 (the Settings Wizard showing another organization for a journal with no issue {OJS}; Rule 34; scenario 2 marks it)
  - OJS5 (every "Journal Content Organization" box unticked and saved {OJS}; Rule 10)
  - OJS6 (the recent articles' titles as headings at the section's own level {OJS}; Rule 13)
  - OJS7 (a journal's homepage image saved without "Alternate text" {OJS}; Rule 18)
  - OMP2 (a press's category page longer than "Items per page" {OMP}; Rule 29)
- **No seed**:
  - another theme: a test install has "Default Theme" alone (Rule 4; Settings bullet 1)
  - the installation's default formats changed: only its configuration file sets them (Settings bullet 27)
- **Owned by another feature**:
  - the Section Editor, the Assistant, the Author, the Reviewer and the Reader kept out of the Settings pages (Actors preamble; [Journal identity & about pages](U07-journal-identity-and-about-pages.md) scenario 2)
  - a Site Administrator with no role in the journal on Settings › Website: the access-denied page on a press and a preprint server, the "Error" window on a journal (Actors preamble; [Journal identity & about pages](U07-journal-identity-and-about-pages.md#a1), [Reader comments & moderation](U14-reader-comments-and-moderation.md#a9))
  - a signed-out visitor on a journal that requires visitors to sign in, or that is not enabled, getting the Login page (Actors row 3; [Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 22)
  - a change left unsaved, gone without a question once the page is left (Rule 2; [Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 5)
  - "Usage statistics display options" on a chart: the "Downloads" section of an article's, a book's and a preprint's page (Rule 9; Settings bullet 7; *Article landing page & reading*, *Monograph landing page*)
  - the catalog fields of a press: "Show Series", "Featured Books", "New Releases", "Order of monographs" and the cover sizes {OMP} (Rule 17; Settings bullets 8, 14, 19; *Catalog browse*, *Catalog management*)
  - "Items per page" on the listing pages (Rule 29; [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md) scenario 10)
  - "Items per page" and "Page links" on the older editorial lists, and the "Users" list's own page length (Rules 29, 30; *Roles configuration*, *Users management*)
  - "Date & Time (Short)" on a submission file's notes and a library file's "Date uploaded" (Rule 31; [Submission files](U36-submission-files.md), [Submission & Publisher Libraries](U39-submission-and-publisher-libraries.md))
  - the Moderator role's raw code in a preprint server's French "Entête" list {OPS} (Rule 35b; [Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops4))
  - the public "Editorial Masthead" and "Editorial History" with "Present a masthead based on user enrollments" unticked, and "Peer Reviewers in Previous Year" with "Enable listing of reviewers on the masthead" ticked (Rule 28a; Settings bullets 15a, 15b; [Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rules 14f and 15, scenario 9)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24; A10–A12
2026-09-28; A13, A14 2026-09-29; A15–A20 2026-10-05), unreviewed unless an entry notes
otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A press's and a preprint server's homepage image never carries the "Alternate text" the manager typed | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A3](#a3) | Screen readers misname the masthead's up arrows and every Sidebar box; clicking a role's name moves it | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A4](#a4) | "Setup" refuses every save while a placed block's plugin is disabled, though "Sidebar" no longer shows the block | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A5](#a5) | A removed journal or site style sheet stops loading but stays online at its old address | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A6](#a6) | In French (Canada), a press's appearance settings and a book's or preprint's download chart show untranslated codes | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A7](#a7) | After a settings upload box refuses a file, its "Upload File" and the tab's "Save" stay disabled | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A8](#a8) | The "3:05PM" time choice prints most times as "3:05pm", some as "3:05PM" | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A9](#a9) | After a manager saves an empty "Custom" short date, editorial dates show only the time | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A11](#a11) | In French, a press's or preprint server's "Entête" settings say the role order is for "the journal's" editorial team page | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A12](#a12) | In French, the settings upload boxes say "Drop files here to upload" and show their refusal in English | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A15](#a15) | After a refused file, its hidden "Remove file" frees "Upload File" but leaves "Save" disabled | 🐞 | minor | — |
| [A16](#a16) | A "Logo" the server fails on leaves a warning sign with no message under the box | 🐞 | minor · crash: server | — |
| [A17](#a17) | Screen readers hear `&quot;` and `&amp;` in the "Sidebar" arrows of a block whose label holds a double quote or "&" | 🐞 | minor | — |
| [A18](#a18) | A "Custom" pattern with "S" prints "5th Oct 2026" on a library file but "5 Oct 2026" on a discussion's messages | 🐞 | minor | — |
| [A20](#a20) | A removed journal thumbnail stays online at its old address | 🐞 | minor | — |
| [OJS5](#ojs5) | Unticking every "Journal Content Organization" box says "Saved", but the home page keeps the current issue | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [OJS6](#ojs6) | On a journal's home page, each "Latest Publications" title is a heading at the section's own level | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [OMP2](#omp2) | A press's category page shows only its first page of books, with no way to the rest | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A2](#a2) | A logo saved without alternate text leaves the header's home link without a name | ❓ | minor | — |
| [A10](#a10) | A saved "Colour" does not reach a browser that has already opened the journal | ❓ | user-visible | — |
| [A13](#a13) | Until a French "Date" is saved, a press's French pages write a book's date in the English order ("mars 5, 2024") | ❓ | minor | — |
| [A14](#a14) | Before "Editorial Masthead" is first saved, roles of the same level change places between openings of the tab | ❓ | minor | — |
| [A19](#a19) | In French (Canada), the same time reads "a.m." on a discussion's messages and "AM" on a library file | ❓ | minor | — |
| [OJS2](#ojs2) | A journal's home page switches from its recent articles to an empty current-issue section when the first issue is created | ❓ | user-visible | — |
| [OJS3](#ojs3) | "Include recent most published articles" lists only articles outside a published issue, by submission date | ❓ | minor | — |
| [OJS4](#ojs4) | The Settings Wizard shows the current issue's table of contents ticked for a journal with no issue, and a save there stores it | ❓ | minor | — |
| [OJS7](#ojs7) | A journal's homepage image saved without "Alternate text" has no text alternative at all | ❓ | minor | — |
| [OJS1](#ojs1) | Only a journal has "Journal Content Organization" | ✅ | minor | — |
| [OMP1](#omp1) | A press's appearance tabs carry the catalog's fields | ✅ | minor | — |
| [OPS1](#ops1) | A preprint server's home page has a fixed order | ✅ | minor | — |

### All apps

<a id="a1"></a>
**A1 — A press's and a preprint server's homepage image never carries the "Alternate text" the manager typed** · 🐞 · low.
A manager who uploads a "Homepage Image" and types its "Alternate text"
expects that text as the picture's description, as a journal's home page
gives it. A press's and a preprint server's home page show the picture
with an empty description, whatever was typed, so a screen reader skips
it as decoration.

The settings tab keeps the text and says "Saved", so nothing tells the
manager it never reaches readers. Every press and preprint server on the
default theme that shows a homepage image in the page body meets it.
Since: 2019-05 (a journal's page was corrected in 2020, the others
never) · Basis: probe, 2026-10-03. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A logo without alternate text leaves the home link unnamed** · ❓ · minor.
With "Alternate text" left empty, the header logo has no description at
all, and the link it forms to the home page has no name a screen reader
can read; the same header without a logo reads the journal's name.
Question: should a logo without alternate text be described by the
journal's name? Lean: yes; the name is what the logo stands for, and the
field is easy to leave empty. Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Screen readers misname the masthead's up arrows and every Sidebar box; clicking a role's name moves it** · 🐞 · low.
On Settings › Website › Appearance › "Editorial Masthead", each role's
up arrow should be named "Increase position of {role}", but a screen
reader announces it as "{role} Decrease position of {role}". The down
arrow is named correctly, "Decrease position of {role}", so both arrows
say "Decrease" and a manager ordering the masthead by ear cannot tell
which one moves a role up. Under "Setup" › "Sidebar", each block's tick
box is announced as "{block} Increase position of {block} Decrease
position of {block}" instead of the block's name alone.

For sighted managers, parts of each row pass their clicks to the wrong
control. A click on a role's name in the "Editorial Masthead" list moves
that role up one place. A click on a block's drag handle, without
dragging, ticks or unticks the block's box.

The masthead list shows while "Present a masthead based on user
enrollments" is ticked, as it is on a new journal, press or preprint
server, and the site-wide "Sidebar" list has the same fault. Basis:
probe, 2026-10-03. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Setup" refuses to save over a placed block whose plugin is off** · 🐞 · medium.
A manager who turns off a block's plugin while the block is placed in
the sidebar (a block plugin such as "Language Toggle Block"), then
saves any change on "Setup" (a new "Page Footer", say), is refused
under "Sidebar" with "The {name} block can not be found. Please make
sure the plugin is installed and enabled.", although "Sidebar" no
longer shows the block, and nothing on the tab is saved. {name} is the
block's internal name ("languagetoggleblockplugin"). The save goes
through once the "Sidebar" list is changed (a box ticked or unticked,
or a block moved); that save also takes the block out of the stored
sidebar without a word, so when the plugin is turned on again the
block comes back unticked. The same holds for a custom block
([Custom pages & blocks](U09-custom-pages-and-blocks.md#a15)).
Basis: probe, 2026-10-01. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A removed journal or site style sheet stops loading but stays online at its old address** · 🐞 · low.
A manager who presses "Remove" under "Journal style sheet" and saves,
or a Site Administrator who does the same under "Site style sheet" in
Site Settings, expects the file to be gone. The public pages stop
loading it, but the file stays in the journal's or the site's public
files and still opens at its old address, for anyone, signed in or not.
Nothing on the site links to it any more, so it is reached through an
old saved copy of a page, a search index, or by someone who knows the
address.

Nothing on screen shows that the file is still there, and no screen can
delete it. It matters when the file held something the journal or the
site meant to withdraw.

Besides the style sheets, only a journal's thumbnail is left behind
([A20](#a20)): a removed "Logo", "Homepage Image" or "Favicon" of a
journal, and the site's "Logo", are deleted as they should be. Basis:
probe, 2026-10-04. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — In French (Canada), a press's appearance settings and a book's or preprint's download chart show untranslated codes** · 🐞 · low.
A press manager who uses the interface in French (Canada) and opens
Settings › Website › "Apparence" reads codes (untranslated keys, such as
"##plugins.themes.default.name##" for the theme's name) in place of 36
labels, descriptions and choices: every field of the theme on "Thème",
the press thumbnail, "Featured Books", "New Releases" and "Order of
monographs" on "Configuration", and the two cover image sizes on
"Configuration avancée". A preprint server's "Thème" shows the download
chart's field and its three choices as codes.

When the press or server turns that chart on, a French (Canada) reader
of a book's or a preprint's page sees a code as the chart's heading, and
the months read "##plugins.themes.default.displayStats.monthInitials##
2026" for January and "undefined 2026" for every other month. The
download counts show, but not which month they belong to. On the home
page, a screen reader names the highlights carousel's two arrows by codes
too. The settings save and work.

It happens on a press or preprint server that offers French (Canada);
the chart is off until the manager picks one of its two chart types. A
journal is not affected: its theme texts are translated, and the codes
its "Thème" shows are texts new on `main` that await translation in
every language. French (France) has nearly all the press's texts, but on
a preprint server 9 of the other 16 languages lack the chart's texts
too, French (France), Spanish and Portuguese among them. No code
changes: PKP's French (Canada) translators, or a PKP developer with an
account, enter the missing texts on PKP's translation platform. Basis:
probe, 2026-10-04. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — After a settings upload box refuses a file, its "Upload File" and the tab's "Save" stay disabled** · 🐞 · medium.
A manager who picks a ".pdf" for "Logo" with "Upload File" sees "You
can't upload files of this type." in the box and expects to pick another
file. Instead the box keeps an empty frame with no visible "Remove". Its
"Upload File" is disabled, and so is the tab's "Save", and the form's
foot reads:

"Please correct one error. Go to Logo: You can't upload files of this
type. Jump to next error"

Only a file of the right type dragged onto the box turns both back on. A
manager who never drags a file has to reload the page, losing every
other unsaved change on the tab. "Favicon" and the style sheet behave
the same, as does every upload box of the settings and publication forms
when it refuses a file. Basis: probe, 2026-10-03. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The "3:05PM" time choice prints most times as "3:05pm", some as "3:05PM"** · 🐞 · low.
On Settings › Website › "Date & Time", the third "Time" choice reads
like "3:05PM". A manager who picks it and saves expects times written
that way. Most pages print them in lower case instead: a library file's
"Date uploaded" reads "2026-10-03 7:25pm".

The screens drawn in the browser follow the label, so the same journal
prints both forms. On `main` a discussion message reads "11:58AM" while
the library reads "7:25pm". On 3.5 only the tab's own labels and the
emails list in an author's workflow print "PM". Up to 3.4 the choice
read "3:05pm" and every page agreed.

It happens only with that choice, in English, and only on staff
screens, apart from readers' comments on `main`. French (Canada)
differs in another way, outside this report. Basis: probe, 2026-10-03.
<sup>f-a8</sup>

<a id="a9"></a>
**A9 — After a manager saves an empty "Custom" short date, editorial dates show only the time** · 🐞 · medium.
A manager opens Settings › Website › "Date & Time", picks "Custom" under
"Date (Short)", leaves its box empty and presses "Save". "Saved" shows,
and the short dates go back to the installation's default. But the same
save also rewrites "Date & Time (Short)", a group the manager never
touched, to the time alone.

From then on every editorial timestamp that uses "Date & Time (Short)"
shows no date: a discussion message reads "11:58 AM" instead of
"2026-10-02 11:58 AM". Nothing on the page says so, and choosing another
"Date (Short)" does not bring the date back. Basis: probe, 2026-10-03.
<sup>f-a9</sup>

<a id="a10"></a>
**A10 — A saved "Colour" does not reach a browser that has already opened the journal** · ❓ · user-visible.
The manager saves a new "Colour" on "Theme" and sees "Saved". A browser
that has already opened the journal's pages, a visitor's or the
manager's own, keeps the old header colour on its next page and a
plain reload, while a browser that never opened the journal shows the
new one. How long it keeps the old colour grows with how long that colour had
stood unchanged before its visit, so a journal whose look has not changed
for a long time gives its returning visitors the old colour the longest.
The site's own pages behave the same
([Site settings](U60-site-settings.md#a9)). Question: should a saved
theme change reach every visitor on their next load? Lean: yes, a
defect: the style sheet's address should change when the theme's
settings do, or the browser should be told to check the sheet on every
load. Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — In French, a press's or preprint server's "Entête" settings say the role order is for "the journal's" editorial team page** · 🐞 · low.
A press or preprint server manager working in French (Canada) opens
Settings › Website › "Apparence" › "Entête" (Editorial Masthead). The
description under the role list reads "Définir l’ordre des rôles sur la
page de l'équipe éditoriale de la revue.", so the text says the list
sets the order of a journal's ("la revue") editorial team page. The
English text, "Define the order of masthead roles for public display.",
names no kind of publication.

Nothing is lost: the list still sets the order of the press's or
server's own public "Entête" page, and saving works. The manager has no
setting for the text.

It is one shared text that a journal shows too, where "la revue" is
right. So the fix is a neutral wording by the French (Canada)
translators on Weblate, not a separate text per app. French (France)
and the other languages name no publication here. Basis: probe,
2026-10-03. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — In French, the settings upload boxes say "Drop files here to upload" and show their refusal in English** · 🐞 · low.
A manager working in French expects the upload boxes in French, as their
button "Téléverser un fichier" is. The drop area of every upload box on
"Setup" and "Advanced" reads "Drop files here to upload" in English.

A file the box refuses gets the English message "You can't upload files
of this type.", and the "Remove file" link on the refused file's frame
is English too.

The same holds for every interface language other than English, and for
every upload box built on the same component: the pictures of
announcements, categories, highlights, the site's appearance settings,
an article's or preprint's cover image and a book's cover. The
submission wizard's file upload shows the same English drop text while a
file is dragged over it, and the same English refusals. Basis: probe,
2026-10-03. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The default French date keeps the English word order** · ❓ · minor.
A French visitor to a press whose managers never saved a French "Date"
reads a book's date as "mars 5, 2024", and its "Mis(e) à jour" date the
same way: French month names in the English order. The installation has
one default pattern for every language, and "Date & Time" offers it to
French already chosen, as "septembre 24, 2026"; where French is not under
"Forms" (Rule 3b), no screen changes it at all. Question: should a
language with no saved format get a default in its own order ("5 mars
2024"), or should the tab say that its default is the English one? Lean:
a default per language; French readers see an ungrammatical date on every
book until a manager who knows the tab changes it. Basis: probe.
<sup>f-a13</sup>

<a id="a14"></a>
**A14 — Roles of one level change places before the masthead order is first saved** · ❓ · minor.
Until "Editorial Masthead" is first saved, its list follows the roles'
permission levels, and a manager expects it in the same order at every
opening. Roles of the same level have no set order between them:
"Copyeditor" stood above "Editorial Board Member" on one journal and
below it on another, and on one journal the two changed places between
two openings of the tab with nothing saved in between. A press kept
"Copyeditor" above "Editorial Board Member" each time. Question: should
the list have one order before its first save? Lean: yes, a minor
defect; a list that reorders itself between visits reads as a change
nobody made. Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — After a refused file, its hidden "Remove file" frees "Upload File" but leaves "Save" disabled** · 🐞 · minor.
After "Logo" refuses a ".pdf" picked with "Upload File" ([A7](#a7)),
the box's empty frame holds a "Remove file" link written white on
white: it shows only while the pointer is over the frame. A manager who
finds it and presses it expects the box and the tab back as they were.
The box empties and "Upload File" works again, but the tab's "Save"
stays disabled, and the form's foot reads "Please correct one error. Go
to Logo: undefined Jump to next error", naming no error the box shows.
Basis: probe, 2026-10-03. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — A "Logo" the server fails on leaves a warning sign with no message** · 🐞 · minor · crash: server.
On a server whose file and request limits are both 8 MiB, a picture of
exactly 8388608 bytes passes the "Logo" box's size check, is sent in
full, and the application fails on the server
([Submission files](U36-submission-files.md#a21) describes why it is
sent at all). The manager expects a message saying why the picture was
not taken. The picture stays in the upload frame with its "Remove
file" link and a red warning sign under it, no message; the form's
foot reads "Please correct one error." and "Go to Logo:" with nothing
after it. As after a refused type ([A7](#a7)), the frame's "Upload
File" and the tab's "Save" stay disabled. Nothing is stored, and
nothing says the picture was too large. Basis: probe, 2026-10-02. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — Screen readers hear `&quot;` and `&amp;` in the "Sidebar" arrows of a block whose label holds a double quote or "&"** · 🐞 · minor.
On Settings › Website › Appearance › "Setup" › "Sidebar", a block's up
and down arrows should be named after the block as its box shows it.
Where the label holds a double quote or "&", the names carry it written
as HTML code instead. With ""Developed By" Block"'s plugin enabled
(Settings › Website › "Plugins"), a screen reader announces its arrows
as `Increase position of &quot;Developed By&quot; Block` and `Decrease
position of &quot;Developed By&quot; Block`. A custom block named "News 2026 & Events", whose box
reads "news2026&-events (Custom Block)", gets `Increase position of
news2026&amp;-events (Custom Block)` (that name is itself a fault:
[Custom pages & blocks](U09-custom-pages-and-blocks.md#a13)). The tick
box, whose name takes in the arrows' names ([A3](#a3)), carries the same
codes. The visible labels are right. Basis: probe, 2026-10-05.
<sup>f-a17</sup>

<a id="a18"></a>
**A18 — A "Custom" pattern with "S" prints "5th Oct 2026" on a library file but "5 Oct 2026" on a discussion's messages** · 🐞 · minor.
A manager who saves "jS M Y H:i" as the "Custom" pattern of "Date &
Time (Short)" expects every date of that group with its ordinal ending,
as a library file's "Date uploaded" reads it: "5th Oct 2026 04:38". A
discussion's messages leave the ending out: "5 Oct 2026 04:38". The
same journal writes the same moment two ways; with the default pattern
both read "2026-10-05 04:38 AM". Basis: probe, 2026-10-05.
<sup>f-a18</sup>

<a id="a19"></a>
**A19 — In French (Canada), the same time reads "a.m." on a discussion's messages and "AM" on a library file** · ❓ · minor.
With the interface in French (Canada) and the journal on the default
"Time", a discussion message reads "2026-10-05 04:38 a.m." while a
library file's "Date de téléversement" reads "2026-10-05 04:38 AM"; the
"Date & Time" tab's French choices read "04:40 a.m." and "4:40a.m.". In
English both read "AM". Question: should one journal write the French
time one way? Lean: yes; "a.m." is the French-Canadian form and the
pages that print "AM" could follow it, though which form is right is
the product team's call. Basis: probe, 2026-10-05. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — A removed journal thumbnail stays online at its old address** · 🐞 · minor.
A manager who presses "Remove" under "Journal thumbnail" on Settings ›
Website › Appearance › "Setup" and saves expects the picture to be
gone. The box stays empty after a reload, but the picture stays in the
journal's public files and still opens at its old address, for anyone,
signed in or not. A "Logo" removed in the same save is deleted.
Nothing on screen shows that the thumbnail is still there, and no
screen can delete it; as with a removed style sheet ([A5](#a5)), it
matters when the picture was meant to be withdrawn. Basis: probe,
2026-10-05. <sup>f-a20</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — Only a journal has "Journal Content Organization"** · ✅ · minor.
A journal chooses which of the current issue, its recent articles and its
categories its home page shows; a press's home page follows its catalog
fields ([OMP1](#omp1)) and a preprint server's is fixed ([OPS1](#ops1)).
The three home pages serve different publishing models. Basis: code.
<sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — The home page changes by itself when the first issue is created** · ❓ · user-visible.
A journal that never saved "Theme" shows its published articles under
"Latest Publications". As soon as its first issue is created, even one
not yet published, the home page shows the current issue instead, which
stays absent until an issue is published: the articles vanish from the
home page with nobody having changed a setting. Question: should a
journal keep the organization it shows until a manager changes it? Lean:
yes; store the organization when the journal is created, or count only
published issues. Basis: probe. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — "Include recent most published articles" lists only articles outside a published issue** · ❓ · minor.
The box promises the journal's most recent articles. The list holds only
articles published with no issue or in an issue not yet published, the
most recently submitted first, so a journal that publishes by issue sees
it empty, and an article published early but submitted long ago sits at
the bottom. Question: is the list meant for articles published ahead of
an issue alone? Lean: yes, for continuous publishing; the box's wording
should say so, and the list should run by publication date.
Basis: probe. <sup>f-ojs3</sup>

<a id="ojs4"></a>
**OJS4 — The Settings Wizard shows another content organization** · ❓ · minor.
For a journal with no issue, the journal's own "Theme" tab shows "Include
recent most published articles" ticked, which is what its home page
shows. The Site Administrator's Settings Wizard shows "Include the current
issue's table of contents" ticked instead, and a save of the wizard's
"Appearance" tab, made to change the colour say, stores that choice and
empties the home page of its articles. Question: should the wizard show
the journal's own organization? Lean: yes; the two screens edit the same
settings. Basis: probe. <sup>f-ojs4</sup>

<a id="ojs5"></a>
**OJS5 — Unticking every "Journal Content Organization" box says "Saved", but the home page keeps the current issue** · 🐞 · medium.
A journal manager who unticks all three "Journal Content Organization"
boxes under Settings › Website › "Appearance" › "Theme" and presses
"Save" sees "Saved", and expects a home page without the current issue,
the recent articles and the categories. Instead the tab reopens with the
box a journal gets when nothing is saved: "Include the current issue's
table of contents" once the journal has any issue, otherwise "Include
recent most published articles". The home page shows that part, for
example "Current Issue".

Ticking any one box is kept; only the choice of none is lost, and
nothing says so. The boxes belong to the default theme and the themes
built on it. Basis: probe, 2026-10-03. <sup>f-ojs5</sup>

<a id="ojs6"></a>
**OJS6 — On a journal's home page, each "Latest Publications" title is a heading at the section's own level** · 🐞 · low.
On a journal's home page, each article title under "Latest
Publications" is a heading at the same level as "Latest Publications"
itself, rather than one level below it. So a screen reader's list of
headings shows each article as a new part of the page. The current
issue's article titles, by contrast, sit below its "Articles" heading,
as expected.

Every article can still be reached and read; only the outline is wrong.

The list shows by default on a journal with no issue, the continuously
publishing journal it was built for. A journal with issues shows it once
a manager ticks "Include recent most published articles". It lists the
articles published outside a published issue: published with no issue
(the case the Steps take) or into an issue not yet published. The list
is on `main` only, in no release yet. Basis: probe, 2026-10-03.
<sup>f-ojs6</sup>

<a id="ojs7"></a>
**OJS7 — A journal's homepage image without alternate text has no text alternative** · ❓ · minor.
With "Alternate text" left empty, a journal's homepage image carries no
text alternative at all, so a screen reader may announce it by its file
name; a press's and a server's always carry an empty one
([A1](#a1)). Question: should an empty box mark the picture as
decorative, so a screen reader skips it? Lean: yes; a file name tells a
listener nothing. Basis: probe. <sup>f-ojs7</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's appearance tabs carry the catalog's fields** · ✅ · minor.
A press's "Setup" adds "Featured Books", "New Releases" and "Order of
monographs", its "Advanced" adds the cover image sizes, and its "Theme"
adds "Show Series": the catalog is a press's home for its books, and a
journal and a preprint server have none. Basis: code. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — A press's category page shows only its first page of books, with no way to the rest** · 🐞 · medium.
A visitor who opens a press's category holding more books than the
press's "Items per page" (25 unless the press changes it) sees the
category's full count but only the first page's books. There are no page
numbers and no "Previous" or "Next" under them, so the visitor cannot
reach the rest of the category from its page.

No book or data is lost, but nothing on the page says the list is cut
short. Visitors can still find the other books through the catalog,
their series' pages or the search. Basis: probe, 2026-10-03.
<sup>f-omp2</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server's home page has a fixed order** · ✅ · minor.
A preprint server's home page always lists its latest preprints under a
search box and its category links, with the summary after them; only the
summary can be switched off. Continuous posting has no issue to show.
Basis: code. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — the screens and who reaches them.** `PKP\pages\management\ManagementHandler::website()`
builds the Website page's forms and `lib/pkp/templates/management/website.tpl`
mounts them; the page's guard is `CanAccessSettingsPolicy` in
`ManagementHandler::authorize()` (the manager-level group with
`permitSettings`, or the Site Administrator), described in the Journal
identity spec's note on who opens the Settings pages. Each app's
`APP\pages\management\SettingsHandler` extends `ManagementHandler` and
overrides `workflow` and `distribution` only, so `website()` is the shared
one. The three checkouts pin one pkp-lib (`76a315591b`) and one
ui-library (`03d1cee2`) at ojs `d9b567efec`, omp `187f0f40d`, ops
`61cd158ce3`. The site's own appearance is `AdminHandler::settings()`
with the `siteTheme` and `siteAppearanceSetup` components, shown only on
a site with more than one context (seed-facts, 2026-09-16). Public pages
read the settings through `PKPTemplateManager::initialize()` and
`lib/pkp/templates/frontend/components/{header,footer}.tpl`, which no app
overrides. Code read 2026-09-24.

<a id="fn-b"></a>
**b — the Settings Wizard.** `AdminHandler::wizard()` (site
administrator only) renders `lib/pkp/templates/admin/contextSettings.tpl`:
top tab `setup` labelled `manager.setup` ("Journal Settings", OMP "Setup",
OPS "Server Settings"), side tab `appearance` (`manager.website.appearance`)
mounting `<theme-form>` with a `PKPThemeForm` built for the edited context,
whose action is `api/v1/contexts/{id}/theme` under the edited context's
path. The row action is `ContextGridRow`'s `wizard` link
(`grid.action.wizard` "Settings wizard"). `PKPContextController::editTheme()`
admits `ROLE_ID_SITE_ADMIN` or `ROLE_ID_MANAGER`. Code read 2026-09-24.

<a id="fn-c"></a>
**c — the tabs and their saves.** `website.tpl`: top tab `appearance`
with side tabs `theme` (`<theme-form>`), `appearance-setup`,
`appearance-masthead`, `advanced`; top tab `setup` with `lists`
(`PKPListsForm`) and `dateTime` (`<date-time-form>`) among the others. Every
form but the theme form sends `PUT api/v1/contexts/{id}` with its own
fields (`Form.vue::submit()`, sent as POST with `X-Http-Method-Override:
PUT`), and `PKPContextService::edit()` merges only
the props received and fires the `Context::edit` hook; no mailable,
notification or log entry is raised on this path. The theme form sends
`PUT api/v1/contexts/{id}/theme`, which saves each option through
`ThemePlugin::saveOption()` and clears the template and compiled-CSS
caches (`clearTemplateCache()`, `clearCssCache()`). Unsaved changes: the
Journal identity spec's note on saving a tab (live-probed there
2026-09-23: kept across tabs, dropped on leaving, no dialog).
Live-probed 2026-09-24 (Rule 2; Side effects bullet 1; all three apps,
two runs): a "Theme" change, a "Page Footer" and an "Items per page"
left unsaved each stayed in their boxes across the other side tabs and
the top tab "Setup"; "Save" on "Date & Time" stored nothing of "Lists";
a reload or the Dashboard dropped the unsaved changes with no question.
Pressing the side menu's "Website" while Settings › Website is open
loads nothing, so an unsaved change stays in its box. Mail catcher
counts for every user of the scratch journal were 0 before and after
seven to eleven saves, and the manager's Tasks panel held the same one
task before and after. Seen 2026-09-28 on all three apps: every load of
Settings › Website answers the Plugin Gallery's server error
([Plugins management](U62-plugins-management.md#a1)); the tabs this spec
describes load and save regardless.

<a id="fn-d"></a>
**d — the upload boxes.** `PKP\components\forms\FieldUpload` and
`FieldUploadImage`, ui-library `FieldUpload.vue` / `FieldUploadImage.vue`:
`common.upload.addFile` "Upload File", `form.dropzone.dictDefaultMessage`
"Drop files here to upload", `common.remove` "Remove",
`common.upload.restore` "Restore Original", `common.altText` "Alternate
text", `common.altTextInstructions`. The refusal reads "You can't upload
files of this type." on all three apps (live-probed 2026-09-24). An
image box accepts `image/*` unless the field narrows it; the favicon box
carries "Alternate text" too. On save, `PKPContextService::edit()`
moves each temporary file into the journal's public files
(`_saveFileParam()`: `public/journals|presses|contexts/<id>/`, stored as
`name`, `uploadName`, `width`, `height`, `dateUploaded`, `altText`); a
`null` value deletes the stored file (`PublicFileManager::removeContextFile()`).
The thumbnails are saved by each app's `ContextService::afterEditContext()`,
which never deletes a removed one's file (A20, note f-a20).
Since 2026-09-24 the test installs' public files load (seed-facts: the
relative `public_files_dir`). Live-probed 2026-09-24 (Side effects
bullet 2; all three apps): a saved logo's address answered a signed-out
browser and answered "not found" after "Remove" and "Save". Live-probed
2026-10-05 (Side effects bullet 2; all three apps, two runs): the same
for the logo, while a thumbnail removed in the same save still opened
(note f-a20).

<a id="fn-e"></a>
**e — the theme's fields.** `DefaultThemePlugin::init()` in each app's
`plugins/themes/default/`: `addOption()` for `typography` (radio, default
`notoSans`), `baseColour` (`FieldColor`, `#1E6292`),
`showDescriptionInJournalIndex` / `…PressIndex` / `…ServerIndex`
(label `manager.setup.contextSummary`), OJS `journalContentOrganization`
(`APP\journal\enums\JournalContentOption`, pkp-lib#9295, 2025-05/06),
`useHomepageImageAsHeader`, `displayStats` (default `none`), and OMP
`showCatalogSeriesListing`. Order: OJS typography, colour, summary,
organization, header image, statistics; OMP typography, summary, header
image, colour, series, statistics; OPS as OJS without the organization.
`PKPThemeForm` sets each field's value from `getOptionValues()` (null
when never saved) and `Field::getConfig()` shows `value ?? default`.
Labels: each app's `plugins/themes/default/locale/en/locale.po` and the
app's `manager.setup.contextSummary` ("Journal Summary", "Press Summary",
"Server Summary"). Code read 2026-09-24.

<a id="fn-f"></a>
**f — "Setup".** `PKPAppearanceSetupForm`: `pageHeaderLogoImage`
(`manager.setup.logo`), `homepageImage` (tooltip
`manager.setup.homepageImage.description`), `pageFooter`
(`FieldRichTextarea`, toolbar `bold italic superscript subscript | link |
blockquote bullist numlist | image | code`, upload URL
`api/v1/_uploadPublicFile`), `sidebar` (`FieldOptions`, `isOrderable`).
Each app's `AppearanceSetupForm` inserts its thumbnail (`journalThumbnail`,
`pressThumbnail`, `serverThumbnail`) after the logo; OMP's appends
`displayFeaturedBooks`, `displayNewReleases` (booleans, no default in the
schema) and `catalogSortOption` (radio of
`Repo::submission()->getSortSelectOptions()`, nullable, no default). A
field's `tooltip` renders as the icon beside its label. Code read
2026-09-24.

<a id="fn-h"></a>
**h — "Advanced".** `PKPAppearanceAdvancedForm`: `styleSheet`
(`FieldUpload`, `acceptedFiles` `.css`, `fileUrl` the public address),
`favicon` (`FieldUploadImage`, `acceptedFiles`
`image/x-icon,image/png,image/gif`), `additionalHomeContent` (same
toolbar as the footer). OMP's `AppearanceAdvancedForm` adds
`coverThumbnailsMaxWidth` / `…MaxHeight` (schema integers, defaults 106
and 100, `min:1`), used when cover thumbnails are generated
(`APP\publication\Repository`, `SeriesForm`, the category API). OJS and
OPS subclasses are empty. Code read 2026-09-24.

<a id="fn-i"></a>
**i — "Lists".** `PKPListsForm`: `itemsPerPage`, `numPageLinks`
(`FieldText`, `isRequired`, size small). Schema: integers, defaults 25
and 10, `nullable`, `min:1`. `PKPBaseController::convertStringsToSchema()`
turns a digits-only string into an integer and leaves anything else a
string, so "abc" and "2.5" fail the `integer` rule (`validator.integer`
"This is not a valid integer."), while "0" and "-1" fail `min`
(`validator.min.numeric` "This must be at least {$min}.", live-probed
2026-09-24 for "-1"); the schema sets no maximum; an emptied
required box is refused in the browser (`validator.required`). Seen
2026-09-23 on all three apps: "Items per page" 25 and "Page links" 10 on
every context (seed-facts).

<a id="fn-j"></a>
**j — "Date & Time".** `PKPDateTimeForm`: group `descriptions`
(`manager.setup.dateTime.descriptionTitle`, `…description` with its link
"format characters" to the PHP manual's date-format characters);
`dateFormatLong` presets `F j, Y`, `F j Y`, `j F Y`, `Y F j`;
`dateFormatShort` `Y-m-d`, `d-m-Y`, `m/d/Y`, `d.m.Y`; `timeFormat` `H:i`,
`h:i A`, `g:ia`; each plus a `Custom` input
(`manager.setup.dateTime.custom`). `datetimeFormatLong` and
`datetimeFormatShort` offer one preset per locale built on the server
from the saved date and time (`{long} - {time}`, `{short} {time}`) plus
`Custom`. `Context::getDateTimeFormats()` fills a locale with no saved
value from the configuration file's `[general]` `date_format_long` "F j,
Y", `date_format_short` "Y-m-d", `time_format` "h:i A",
`datetime_format_long` "F j, Y - h:i A", `datetime_format_short` "Y-m-d
h:i A" (each app's `config.TEMPLATE.inc.php`); a new context stores the
five formats empty. ui-library `DateTimeForm.vue::mounted()` rewrites
every preset's label with luxon's `DateTime.now()`, the browser's clock
(pkp-lib#11079, 2025-03), so `g:ia` shows as "3:05PM" while PHP's `date()`
prints "3:05pm" (A8); the French labels read "15:05", "03:05 p.m.",
"3:05p.m.": luxon writes the locale's meridiem for `a` and `A`, while
Carbon prints "AM" or "am" in every language (A19), and ui-library
`phpToLuxonFormat()` maps PHP's `S` to nothing (A18).
`fieldChanged()` / `updateFields()` rewrite the combined preset's label
and move the combined value when it equalled the old combination. An empty custom box saves `null` for that group and the
getters fall back to the configuration file. Saved under "Date (Short)",
the stored `datetimeFormatShort` is the time pattern alone (A9; why the
combination drops the date was not traced). The public pages print a
pattern with `PKPTemplateManager::smartyDateFormat`, Carbon's
`translatedFormat`, so the one default pattern is filled with the
visitor's month names in its English order (A13, note f-a13).
Live-probed 2026-10-05 (Fields, "Time"; Rules 3c, 33a; all three apps,
two runs): the French labels read "04:40", "04:40 a.m.", "4:40a.m." at
that time; the `S` and meridiem readings are in notes f-a18 and f-a19.

<a id="fn-k"></a>
**k — the theme list.** `PKPThemeForm` fills the `themePluginPath`
select from `PluginRegistry::loadCategory('themes', true)` (enabled theme
plugins) and keeps each theme's option fields in `themeFields`;
ui-library `ThemeForm.vue::changeTheme()` swaps the fields under "Theme"
for the chosen theme's on a new choice, and "Save" switches the journal
to it. That swap is known from the code alone: no test install has a second
theme, and the Plugin Gallery that would install one answers a server
error there (checked 2026-09-24). `PKPContextService::validate()`
refuses a theme that is not installed and enabled
(`manager.setup.theme.notFound`). The three checkouts ship
`plugins/themes/default` alone; live-probed 2026-09-16 and 2026-09-24 on
all three apps: the select offers "Default Theme" alone, under a plain
sentence (not a link), and Plugins › "Installed Plugins" lists it as the
only theme plugin. `PKPTemplateManager` picks the active theme from the
context's `themePluginPath` for frontend pages; `DefaultThemePlugin::init()`
registers the menu areas `primary` and `user`.

<a id="fn-l"></a>
**l — typography and colour.** `DefaultThemePlugin::init()` adds the font
stylesheet for the chosen `typography` and LESS variables `@font` /
`@font-heading`; a `baseColour` other than `#1E6292` sets `@bg-base`, and
when `isColourDark()` is false (contrast 130 or more) also
`@text-bg-base: rgba(0,0,0,0.84)`. `saveOption()` stores `null` for a
value not matching `/^#[0-9a-fA-F]{1,6}$/` (pkp/pkp-lib#11974), and
`init()` falls back to `#1E6292` for such a value; on screen that
fallback is not reached, because the colour box sends the colour chosen
before when the typed code is not one it can read (live-probed
2026-09-24, "red" and "#12345"). The compiled
stylesheet is served by `PKP\controllers\page\PageHandler::css()`
(`$$$call$$$/page/page/css?name=stylesheet`), cached per context as
`cache/{contextId}-stylesheet-{hash}.css` and cleared on every theme save.
The sheet keeps the same address whatever the settings, and is sent with
`Last-Modified` (the time it was last compiled) and `Content-Length`
only: no `Cache-Control`, `ETag` or `Expires`; a conditional request
(`If-Modified-Since`) is answered with a full 200 (57–73 KB), never a
304. A browser may therefore reuse its copy without asking, for a
heuristic share of the copy's age (a tenth, in the browser driven). The
fonts of "Typography" are set as variables of the same compiled sheet
(code read), so they would lag the same way; not driven. Live-probed
2026-09-28 (Rules 2, 6, 6a; A10; all three apps, two runs): note f-a10.

<a id="fn-m"></a>
**m — the home page.** OJS `APP\pages\index\IndexHandler::index()` with
`templates/frontend/pages/indexJournal.tpl`; OMP `IndexHandler::_displayPressIndexPage()`
with `index.tpl`; OPS `IndexHandler::index()` with `indexServer.tpl`; each
extends `PKPIndexHandler` (no ops of its own). Order in the templates:
OJS highlights, `homepage_image`, `categoryHeader`, `homepage_about`
(`about.aboutContext`), announcements, `latest_article.tpl`,
`current_issue`, `additional_content`; OMP highlights, image,
`homepage_about`, `monographList.tpl` for `catalog.featured` "Featured"
(while `displayFeaturedBooks`) and `catalog.newReleases` "New Releases"
(while `displayNewReleases`), announcements, additional content; OPS
highlights, image, announcements, `archiveHeader.tpl`,
`homepage_latest_preprints`, `homepage_about`, additional content. The
Highlights spec's claim check confirmed the carousel's place and the
parts below it (2026-09-16). `additionalHomeContent` is assigned by the
index handlers alone.

<a id="fn-n"></a>
**n — "Latest Publications".** OJS `IndexHandler`, option
`RECENT_PUBLISHED`: `Repo::submission()->getCollector()->filterByLatestPublished(true)`
(OJS `APP\submission\Collector`: the current publication published, with
a publication date, and either no issue or an unpublished one), no
`orderBy()` call, so the collector's default `dateSubmitted DESC`; paged
by a `LengthAwarePaginator` of `itemsPerPage`. `latest_article.tpl`:
heading `submissions.published.latest` "Latest Publications",
`{page_info}` (`navigation.items` "{$from} - {$to} of {$total} items",
printed whenever there is a page) and `{page_links}`
(`PKPTemplateManager::smartyPageLinks()`: `&lt;&lt;` `&lt;` before, the
numbers from `page - floor(numPageLinks / 2)`, `&gt;` `&gt;&gt;` after,
nothing on a single page). Code read 2026-09-24.

<a id="fn-o"></a>
**o — the organization, the current issue and the categories.**
`JournalContentOption::default()`: `ISSUE_TOC` when any issue of the
journal exists (`Repo::issue()` collector `exists()`, published or not),
else `RECENT_PUBLISHED`, and `ISSUE_TOC` when no journal is in the
request. `IndexHandler` reads `$activeTheme->getOption('journalContentOrganization')`
and uses `default()` when it is not an array. `CATEGORY_LISTING`: the
journal's categories, printed by `categoryHeader.tpl` for those without a
parent, each linking `catalog/category/{path}`. `ISSUE_TOC`:
`Repo::issue()->getCurrent()` and `publishingMode !=
PUBLISHING_MODE_NONE` (`AccessForm`, `manager.distribution.publishingMode.none`),
then `IssueHandler::setupIssueTemplate()`; labels `journal.currentIssue`
"Current Issue", `journal.viewAllIssues` "View All Issues" (to
`issue/archive`). Seen 2026-09-23: "Publishing Mode" shows no choice
marked on a new journal (seed-facts).

<a id="fn-p"></a>
**p — "Latest preprints".** OPS `IndexHandler::index()`: published
submissions of the server, `orderBy(ORDERBY_DATE_PUBLISHED)` descending,
`limit(10)`, no paginator; the publication date carries no time, so
preprints posted the same day tie and the database picks their order.
`indexServer.tpl` prints the heading `index.latestPreprints` "Latest
preprints" and a `<ul>` of `preprint_summary.tpl` unconditionally. The
search box and category links come from `archiveHeader.tpl` (the
Sections feature's archive header).

<a id="fn-q"></a>
**q — the homepage image.** OJS `indexJournal.tpl`: `<div
class="homepage_image"><img … alt="{$homepageImage.altText}">` when set
(the `alt` omitted when empty), the image styled to the column's width;
OMP `index.tpl` and OPS `indexServer.tpl`: a bare `<img …
alt="{$homepageImageAltText|escape}">`, a variable OMP's handler never
assigns and OPS's reads from `homepageImageAltText`, a setting the
context schema lacks (it stores the text as `homepageImage.altText`), so
`alt` is always empty. All three skip the image while
`useHomepageImageAsHeader` is on. `DefaultThemePlugin::init()` adds the
inline style `.pkp_structure_head { background: center / cover no-repeat
url("…"); }` on every page of the context when the option is on and the
context has a localized `homepageImage`. Live-probed 2026-09-24 (Rules
8, 18; all three apps): with the header option ticked, the header's
background was the picture on the home, About and item pages and the
home page body had none; unticked, the picture was back in the body;
removed and saved with the option still ticked, the header was plain
colour again. In a 1280-pixel window with an 860-pixel main column, a
300 × 100 picture showed 860 × 287 on a journal and 300 × 100 on a press
and a server; a 2000 × 400 picture 860 × 172 and 800 × 160.

<a id="fn-r"></a>
**r — logo, thumbnail, footer.** `header.tpl`: `{if
$displayPageHeaderLogo}` an `<a class="is_img">` with the uploaded file,
its `width` and `height`, and `alt` only when `altText != ''`; `{elseif
$displayPageHeaderTitle}` the name as text (`PKPTemplateManager` assigns
both from the context). The thumbnail: each app's `indexSite.tpl`, `alt`
only when set. `footer.tpl`: `{if $pageFooter}` a `pkp_footer_content`
block before `pkp_brand_footer`. Seen 2026-09-23 in passing on all three
apps: a header logo uploaded without alternate text rendered with no
`alt`.

<a id="fn-s"></a>
**s — the sidebar.** `PKPAppearanceSetupForm` offers
`PluginRegistry::loadCategory('blocks', true)` (the enabled block plugins,
the custom blocks included) by `getDisplayName()`. ui-library
`FieldOptions.vue::mounted()` sorts the options by their index in the
saved value, unsaved ones last; `Orderer.vue` gives the arrows
`common.orderUp` "Increase position of {$itemTitle}" and
`common.orderDown` "Decrease position of {$itemTitle}"; the watcher on
`selectedValue` filters the value to the offered options only when the
list changes. `PKPTemplateManager::displaySidebar()` prints the saved
names in order, skipping names not among the enabled blocks; `footer.tpl`
prints the `pkp_structure_sidebar` column only when that output is
non-empty, and `header.tpl` adds `has_sidebar` from `hasSidebar`.
`PKPContextService::validate()` refuses a saved name that is not an
enabled block (`manager.setup.layout.sidebar.invalidBlock`, filled with
the saved registry name, such as `languagetoggleblockplugin`). Enabled on
a new context by each plugin's `settings.xml`: OJS `information`,
`languageToggle`, `subscription`, OMP `browse`, `information`,
`languageToggle`, OPS `languageToggle`; the generic `webFeed` true in all
three; `developedBy` false. `makeSubmission` is not enabled on a new
context: no `enabled` row exists for it on any context, `publicknowledge`
included. Live-probed 2026-09-24 (Rules 23–25; all three apps): the
"Sidebar" lists of new contexts as Rule 23 quotes them, on four scratch
contexts per app.

<a id="fn-t"></a>
**t — style sheet and favicon.** `PKPTemplateManager::initialize()`: the
context's `styleSheet` is added as `contextStylesheet` with
`STYLE_SEQUENCE_LATE` and the default `contexts` (`frontend` only), its
address carrying `?d={dateUploaded}` on OJS and OPS and `?v=3.6.0.0` on
OMP; the favicon (`Context::getLocalizedFavicon()`, the current locale
then the primary) as a `<link rel="icon">` header in the `frontend` and
`backend` contexts. Code read 2026-09-24. Live-probed 2026-09-24 (Rule
26; all three apps): a style sheet whose one rule colours every heading
red was the last style sheet in the page head; the home page's headings
turned red while the item page's "Published" ("Posted") and "Versions"
labels kept the theme's grey; the Dashboard and Settings › Website did
not load it.

<a id="fn-u"></a>
**u — "Editorial Masthead".** `PKPAppearanceMastheadForm` (reworked by
pkp/pkp-lib#13370, lib/pkp `fab29cfeca`): `enableEnrollmentMasthead`
(`FieldOptions`, one option), then `mastheadUserGroupIds` (`FieldOptions`,
`isOrderable`, `allowOnlySorting`, the value every listed id,
`showWhen: enableEnrollmentMasthead`), then, only when
`Application::getReviewStages()` is non-empty (not OPS),
`enableEnrollmentMastheadReviewers` (`FieldOptions`, one option,
`showWhen: enableEnrollmentMasthead`), which replaces the former
`FieldHTML` `reviewer` note. `schemas/context.json`:
`enableEnrollmentMasthead` defaults to true, the reviewers key has no
default (stored false on the tab's first save); the issue gives the
enrollment box as unticked on an upgraded context, the reviewers box
as off on upgrade and on a new context.
`Repo::userGroup()->getSortedMastheadUserGroups()`:
the context's groups with `masthead` true, the reviewer role excluded,
ordered by role id (`orderByRoleId()`, no second key, so groups of one
role id come in database order: A14), then by the saved order with
unsaved groups last; with no saved order, the role-id order alone, so a
newly ticked group takes its level's place. A hidden list keeps its
value, so a save with the enrollment box unticked still stores the
list's order. `registry/userGroups.xml` sets `masthead="true"`
on the editor, section editor, external reviewer and editorial board
member groups (OJS, OMP) and on the section editor and editorial board
member groups (OPS); OMP's internal reviewer group has none. The Journal
identity spec live-probed the order's effect on 2026-09-23.

<a id="fn-v"></a>
**v — where "Lists" applies.** Each app's `TemplateManager` assigns the
context's `itemsPerPage` and `numPageLinks` to the frontend.
`{page_links}` (numbered) is used by OJS `latest_article.tpl`, each app's
`frontend/pages/search.tpl` and the OJS and OPS `catalogCategory.tpl`;
OMP's `catalogCategory.tpl` prints no page links; the listing pages'
`pagination.tpl` prints "Previous" / "Next" only.
`PKPHandler::getRangeInfo()` takes the context's `itemsPerPage` as the
page size of every paged grid (`PagingFeature`, for example the Roles
grid; `gridPaging.tpl` adds an "Items per page:" select); the Comments
page's list uses it too (`userComment\Repository`). The "Users" list on
Settings › Users & Roles is a Vue list that asks 25 a page
(`count=25`), and the Dashboard's submission list 30. Code read
2026-09-24; the listing pages were live-probed by the Navigation menus
spec on 2026-09-23.

<a id="fn-w"></a>
**w — where the formats print.** `PKPTemplateManager` assigns the
context's formats to the frontend and to the editorial page context.
`dateFormatShort`: OJS `article_details.tpl`, `issue_toc.tpl` and the
search results' `article_summary.tpl`; OPS `preprint_details.tpl`,
`preprint_summary.tpl`; lib/pkp `announcement_full.tpl`,
`announcement_summary.tpl`, `announcements_list.tpl`. `dateFormatLong`:
OMP `monograph_full.tpl`, `monograph_summary.tpl`, `chapter.tpl`. The
date-and-time formats: lib/pkp `controllers/informationCenter/note.tpl`
and the library file forms print `datetimeFormatShort`;
`workflow/reviewHistory.tpl` and `authorDashboard/submissionEmails.tpl`
name the date-and-time formats too, but none of the screens driven on 2026-09-24
printed "Date & Time" (the long one), and a review's history was not
reached. The Announcements spec live-probed "Date (Short)" on
announcement dates (2026-09-17).

<a id="fn-x"></a>
**x — the wizard's organization.** `DefaultThemePlugin::init()` computes
the `journalContentOrganization` default with the request's context;
the wizard runs at the site's address (`index/admin/wizard/{id}`), where
the request has no journal, so `JournalContentOption::default()` returns
`ISSUE_TOC`. `PKPThemeForm` shows `value ?? default`, and the theme
form's save posts every field, so what the wizard shows is stored. The
wizard's theme save goes to the edited context's theme endpoint, which
admits a Site Administrator with no role in that context. Code read
2026-09-24. Live-probed 2026-09-24 (Rule 34; OJS4; two runs): on a
scratch journal with no issue the wizard ticked the current issue and
the journal's own tab its recent articles; a wizard save with only
"Colour" changed left the own tab on the current issue and the home
page without its articles; with a published issue both screens ticked
the current issue. On a press and a server the wizard's fields equalled
the own tab's and its save reached the public header.

<a id="fn-y"></a>
**y — languages.** The logo, thumbnail, homepage image, favicon, footer
and additional content are `isMultilingual`; the public pages read them
with `getLocalizedData()`, which falls back to the primary locale and
then to any locale holding a value (live-probed 2026-09-24 with a
French-only footer), and the favicon with `getLocalizedFavicon()`. `PKPDateTimeForm`'s fields are
multilingual, one choice per form locale, and `getLocalizedDateFormat…()`
read the visitor's locale; a locale with no saved value, including one
outside the form locales, gets the configuration file's pattern, not the
primary locale's (Rules 3a, 3b; note j). A context without
`supportedFormLocales` has the primary language alone under "Forms"
(scenarios.md).

<a id="fn-z"></a>
**z — the statistics chart.** `displayStats` is read by OJS
`article_details.tpl`, OMP `monograph_full.tpl` and OPS
`preprint_details.tpl` (`!= 'none'`), which call
`ThemePlugin::displayUsageStatsGraph()` and print
`plugins.themes.default.displayStats.downloads` "Downloads" and
`…noStats` "Download data is not yet available.". Code read 2026-09-24.

<a id="fn-sc"></a>
**sc — the scenarios' givens.** Where each scenario runs: every one on
scratch contexts from `POST scenarios/context` (`pkpApi.createContext()`,
`scenarios.md`), each with a throwaway manager in `users[]` (`roles:
['manager']`, password the username twice); `admin` / `admin`
(`docs/process/users.md`) is the Site Administrator, enrolled as a
manager in every context the API creates. A scratch context arrives with
English alone under "UI" and "Forms", no block placed, ""Developed By"
Block" disabled, no issue and no category, "Publishing Mode" unmarked,
and every appearance field at the install default (`seed-facts.md`). The
visitor is a fresh signed-out browser context. Pictures, the style sheet
and the favicon are test fixtures uploaded on screen; the "Date & Time"
labels follow the browser's clock, so a test pins it or computes the
expected strings from today. Recipes: 1 — `context.description` (the
"Journal Summary"); the style sheet's one rule colours `h1`–`h6` red. 2
— nothing seeded; the wizard is `admin`'s. 3 — nothing seeded; the
site's home page lists every context of the install, so the test finds
the scratch journal's row. 4 — nothing seeded: the plugin is ticked on
screen. 5 — `users[]` with `editor`, `sectionEditor` and
`editorialBoardMember` (OPS `sectionEditor` and `editorialBoardMember`),
each current, and one more account per role with the role in
`pastRoles[]`; "Production editor" and "Layout Editor" are
`productionEditor` and `layoutEditor`, ticked on screen. 6 — OJS three
`POST scenarios/submission` seeds with `published: true` and no `issue`;
OPS eleven with `published: true`. 7 — `enableAnnouncements: true`,
`numAnnouncementsHomepage: 1`, `announcements: [{title: 'Call for
papers'}]`; OMP one submission with `published: true`. 8 —
`context.supportedLocales` and `context.supportedFormLocales` `['en',
'fr_CA']` and the announcement keys of 7; the French page is the
journal's address with the `fr_CA` segment. 9 — two submissions with
`published: true` and no `issue`; `categories: [{path: 'arts', title:
'Arts'}, {path: 'science', title: 'Science', children: [{path:
'physics', title: 'Physics'}]}]`. 10 — `issues: [{volume: 1, number: 1,
year: 2026, published: true}]`.

<a id="fn-f-a1"></a>
**f-a1** — OJS `aa7d5a8648` (2019-04-21, `pkp/pkp-lib#4557`, "corrected
alt text source for homepageImage") moved the journal's page to
`$homepageImage.altText`; `e7c66ecb3c` (2019-05-14, `pkp/ojs#2376`, for
`pkp/pkp-lib#4683`, the header-background option) switched it back to
the dead `$homepageImageAltText`, as OMP `d9ffc0c1e` (2019-05-14) did on
the press's page, which had read `$homepageImage.altText` since 2015.
OJS was corrected in 2020 by `8cb940a8e4` (`pkp/ojs#2715`, for
`pkp/pkp-lib#5778`) and `deed55c18a` the next day (the `alt` left out
when empty). OPS's template was copied from the journal's before that
fix (`8cb940a8e4` is not in OPS's history; renamed in `c8046900c3`,
2021-02-14) and kept `$homepageImageAltText`, see note q. Git history
read 2026-10-03. Live-probed 2026-09-24 on all three
apps: typed "Home picture" (and "Our building"), the journal's picture
read the typed text, the press's and the server's `alt=""`; the tab
still held the text after a reload.
Issue report: [pkp-e2e#775](https://github.com/jardakotesovec/pkp-e2e/issues/775) ([docs/issues/U10-A1-homepage-image-alt-text-dropped.md](../issues/U10-A1-homepage-image-alt-text-dropped.md)).

<a id="fn-f-a2"></a>
**f-a2** — Seen 2026-09-23 in passing on all three apps (twice): the
header logo without alternate text had no `alt`; note r.

<a id="fn-f-a3"></a>
**f-a3** — `FieldOptions.vue` wraps the box, its label and the `Orderer`
arrows in one `<label>`, so a box's accessible name takes both arrows'
screen-reader texts ("{block} Increase position of {block} Decrease
position of {block}"). Live-probed 2026-09-24 on all three apps: on
"Editorial Masthead" (`allowOnlySorting`, no box) the up button
`orderer__up`, whose own screen-reader text is "Increase position of
{role}", sits inside `label.pkpFormField--options__option` and is
announced "{role} Decrease position of {role}". Re-probed 2026-09-29 (all three apps, two
runs): unchanged; the two masthead boxes carry their own names only
("Present a masthead based on user enrollments", "Enable listing of
reviewers on the masthead").
Issue report: [pkp-e2e#776](https://github.com/jardakotesovec/pkp-e2e/issues/776) ([docs/issues/U10-A3-appearance-ordering-arrows-misnamed.md](../issues/U10-A3-appearance-ordering-arrows-misnamed.md)).

<a id="fn-f-a4"></a>
**f-a4** — Note s: the stored value keeps the disabled block's name, the
list filters it only when changed, and the save's validation refuses it.
Live-probed 2026-09-24 on all three apps with "Language Toggle Block"
and with a custom block ("Custom Block Manager" disabled): a "Page
Footer" save answered 400 with the message under "Sidebar" and "Please
correct one error. Go to Sidebar: … Jump to next error" at the form's
foot; the footer was not saved. The Custom pages & blocks spec drove the
custom-block case the same day (its A15).
Issue report: [pkp-e2e#370](https://github.com/jardakotesovec/pkp-e2e/issues/370) ([docs/issues/U09-A15-setup-save-refused-disabled-block.md](../issues/U09-A15-setup-save-refused-disabled-block.md)) (with U09 A15).

<a id="fn-f-a5"></a>
**f-a5** — `PKPContextService::_saveFileParam()` with a `null` value
first reads the stored setting with `getData($settingName, $localeKey)`.
The style sheet, one file for every language, is saved with no locale,
so `$localeKey` keeps its default `''`, which `DataObject::getData()`
looks up as a locale: `getData('styleSheet', '')` returns `null`, and
nothing is deleted before the setting is cleared. A second fault sits
behind it: the removal takes `$isImage ? $setting['uploadName'] :
$setting`, and the style sheet, saved with `$isImage` false, is stored
as an object (`name`, `uploadName`, `dateUploaded`), so with the lookup
alone fixed the path handed to `PKPPublicFileManager::removeContextFile()`
would end in the array's string form and still delete nothing.
`PKPSiteService::_saveFileParam()` has the same branch for the site's
style sheet. Code read 2026-10-03. Live-probed 2026-09-24 on all three apps:
after "Remove" and "Saved", the pages no longer linked the style sheet,
and its old address (`/public/journals/<id>/styleSheet.css`, OMP
`presses`, OPS `contexts`) still answered 200 with the file, signed out;
a removed favicon's and logo's addresses answered 404.
Issue report: [pkp-e2e#780](https://github.com/jardakotesovec/pkp-e2e/issues/780) ([docs/issues/U10-A5-removed-style-sheet-stays-public.md](../issues/U10-A5-removed-style-sheet-stays-public.md)).

<a id="fn-f-a6"></a>
**f-a6** — Seen 2026-09-24 on all three apps with the French interface.
OJS `locale/fr_CA` lacks `manager.setup.journalContentOrganization` and
its description and option keys: OJS added them in English on `main`
only (`9486d8e182`, 2025-05-27, `pkp/pkp-lib#9295`) and no language has
them yet, so under the team's 2026-10-02 ruling on main-only texts they
await translation and are not part of A6 (read 2026-10-03). OMP's `plugins/themes/default/locale/fr_CA/locale.po`
holds one entry and the app's `manager.setup.contextSummary` is empty in
French; OPS's theme locale has empty `displayStats` strings. Code read
2026-09-24. Live-probed 2026-09-28 (Rule 35; OMP, two runs, OJS and OPS
the controls): a press's French "Setup" showed
"##manager.setup.pressThumbnail##",
"##manager.setup.pressThumbnail.description##",
"##plugins.block.browse.displayName##" (with "Avancer la position de
##plugins.block.browse.displayName##"),
"##manager.setup.displayFeaturedBooks##",
"##manager.setup.displayFeaturedBooks.label##",
"##manager.setup.displayNewReleases##",
"##manager.setup.displayNewReleases.label##", "##catalog.sortBy##",
"##catalog.sortBy.catalogDescription##",
"##catalog.sortBy.seriesPositionAsc##" and
"##catalog.sortBy.seriesPositionDesc##", the other four order choices
reading "Titres (A-Z)", "Titres (Z-A)", "Date de publication (du plus
ancien)", "Date de publication (du plus récent)"; its "Advanced"
"##manager.setup.coverThumbnailsMaxWidth##" and
"##manager.setup.coverThumbnailsMaxHeight##", each over
"##manager.setup.coverThumbnailsMaxWidthHeight.description##". A
journal's and a server's "Setup" and "Advanced" showed none. Beyond
French (Canada), read in the locale files on `main` 2026-10-03 (a text
counts as missing when empty or absent; not driven): of OMP's 33
languages, Greek, Kyrgyz and Vietnamese lack all 42 texts the French
(Canada) fix holds and 19 others lack some (French (France) three);
of OPS's 17, Catalan, Croatian, French (France), Indonesian, Kyrgyz,
Norwegian Bokmål, Portuguese, Spanish and Turkish lack all nine chart
texts.
Issue report: [pkp-e2e#777](https://github.com/jardakotesovec/pkp-e2e/issues/777) ([docs/issues/U10-A6-french-appearance-settings-raw-keys.md](../issues/U10-A6-french-appearance-settings-raw-keys.md)).

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-24 on all three apps ("Logo", "Favicon",
the style sheet): after a ".pdf" picked with "Upload File" the box kept
an empty frame, its "Upload File" and the form's "Save" were disabled,
and the foot line stayed; a picture dropped on the box cleared the
error and enabled both. A file dropped rather than picked is refused
the same way, with nothing sent.
Issue report: [pkp-e2e#772](https://github.com/jardakotesovec/pkp-e2e/issues/772) ([docs/issues/U10-A7-refused-upload-locks-box.md](../issues/U10-A7-refused-upload-locks-box.md)).

<a id="fn-f-a8"></a>
**f-a8** — Note j: the label is luxon's rendering of `g:ia`, the pages
PHP's. Live-probed 2026-09-24 on all three apps: the choice read
"7:35PM" at that time; saved, a library file's "Date uploaded" read
"2026-09-24 7:17pm" and a file's note "2026-09-24 7:17pm". Walked
2026-10-03 (Fields, "Time"; `main` and 3.5): the screens the browser
draws print with luxon and follow the label, so on `main` a discussion
message read "11:58AM" while a library file's "Date uploaded" read
"7:25pm"; on 3.5 only the tab's labels and the emails list in an
author's workflow printed "PM". Up to 3.4 the labels were drawn with
moment, whose `a` is lower case, so the choice itself read "3:05pm"
(code read).
Issue report: [pkp-e2e#779](https://github.com/jardakotesovec/pkp-e2e/issues/779) ([docs/issues/U10-A8-time-choice-3-05pm-prints-lower-case.md](../issues/U10-A8-time-choice-3-05pm-prints-lower-case.md)).

<a id="fn-f-a9"></a>
**f-a9** — Note j. Live-probed 2026-09-24 on all three apps, two runs:
the save stored `datetimeFormatShort` as "h:i A" for the language
saved; the tab then showed "2026-09-24" marked under "Date (Short)" and
"Custom" with "h:i A" under "Date & Time (Short)"; a library file's "Date
uploaded" read "07:17 PM" (all three) and a file's note "admin admin
07:17 PM" (OJS, OMP).
Issue report: [pkp-e2e#773](https://github.com/jardakotesovec/pkp-e2e/issues/773) ([docs/issues/U10-A9-date-short-empty-custom-strips-editorial-dates.md](../issues/U10-A9-date-short-empty-custom-strips-editorial-dates.md)).

<a id="fn-f-a10"></a>
**f-a10** — Note l. Live-probed 2026-09-28 (Rules 2, 6, 6a; all three
apps, two runs, identical), a scratch context each, `admin` saving
"Colour" in one browser and a signed-out visitor in another. The sheet's
address was the same before and after each save. First, a visitor
whose first load compiled the sheet saw #1E6292; `admin` saved
"#000080" ("Saved"); the visitor's reload about 1.5 s later asked the
server again and showed rgb(0, 0, 128), as did its next page (About)
and a browser that had never opened the context. Then, 180 s after that
save, the visitor opened the home page (navy; the sheet's
`Last-Modified` 185 s before its `Date`) and `admin` at once saved
"#8B0000": the visitor's reload 2.8–2.9 s after its first load and its
About page at 3.5–3.6 s took the sheet from the browser's cache with no
request and stayed navy, while a browser that had never opened the
context showed rgb(139, 0, 0); a reload 26.8–26.9 s after the first load
asked the server and showed rgb(139, 0, 0). The span fits a tenth of the
copy's age (185 s, about 18 s); by that rule a look unchanged for days
lasts hours (not driven). The tab reopened on "#8B0000"; the header's
links stayed white. The same caching on the site's pages: the Site
settings spec's A9.

<a id="fn-f-a11"></a>
**f-a11** — lib/pkp `locale/fr_CA/manager.po`
`manager.setup.editorialMasthead.order.description` is one shared text,
with no press or server version in OMP's or OPS's locale. Live-probed
2026-09-28 (Rule 35b; all three apps, two runs): the French "Entête"
description read the same on a journal, a press and a server; the
English "Define the order of masthead roles for public display." on all
three. The list read "Rédacteur-trice", "Rédacteur-trice de rubrique",
"Membre du comité éditorial" (OJS); "Rédacteur/Rédactrice en chef de la
presse", "Rédacteur/Rédactrice en chef de la série", "Membre du comité
éditorial" (OMP); "##default.groups.name.sectionEditor##", "Membre du
comité éditorial" (OPS). A role moved up with its arrow and left
unsaved was back in its old place after a reload, with no dialog.
Issue report: [pkp-e2e#781](https://github.com/jardakotesovec/pkp-e2e/issues/781) ([docs/issues/U10-A11-french-masthead-order-text-names-journal.md](../issues/U10-A11-french-masthead-order-text-names-journal.md)).

<a id="fn-f-a12"></a>
**f-a12** — lib/pkp `FieldUpload` passes the text as
`dropzoneDictDefaultMessage` (`form.dropzone.dictDefaultMessage`, French
"Déposer des fichiers à téléverser ici."), while the drop-zone library
reads `dictDefaultMessage`, so its own English default shows; code read
2026-09-28, not traced further, and by that reading every language is
affected (only French driven). Live-probed 2026-09-28 (Rule 35a; all
three apps, two runs): "Logo", the thumbnail and "Homepage Image" on
"Setup" and the style sheet and "Favicon" on "Advanced" each read "Drop
files here to upload" beside "Téléverser un fichier".
Issue report: [pkp-e2e#778](https://github.com/jardakotesovec/pkp-e2e/issues/778) ([docs/issues/U10-A12-upload-boxes-drop-text-english.md](../issues/U10-A12-upload-boxes-drop-text-english.md)).

<a id="fn-f-a13"></a>
**f-a13** — Each app's configuration file has one `[general]`
`date_format_long` "F j, Y" for every locale; `Context::getDateTimeFormats()`
fills a locale with no saved value from it, and
`PKPTemplateManager::smartyDateFormat` prints it with Carbon's
`translatedFormat`, so the pattern gets the visitor's month names in its
English order. Live-probed 2026-09-29 (Rules 3a, 3b; three apps, two
runs each, OMP three): on scratch contexts with French under "UI" and
"Forms", the French "Date" group arrived with "F j, Y" checked, labelled
"septembre 29, 2026", on all three apps; on a press, a book published
2024-03-05 with a second version published that day read "mars 5, 2024
— Mis(e) à jour septembre 29, 2026" on the book's and the chapter's
French pages, until "29 septembre 2026" was saved under French. With
French under "UI" alone the tab had no French group. Every Settings ›
Website load also answered the Plugin Gallery's list
(`plugin-gallery-grid/fetch-grid`) with a 500, the test installs' known
gallery failure, not behind this finding.

<a id="fn-f-a14"></a>
**f-a14** — `Repo::userGroup()->getSortedMastheadUserGroups()` orders by
role id alone before the saved order (note u), so "Copyeditor" and
"Editorial Board Member" (both the Assistant role id), and "Journal
editor" and "Production editor" (both the Manager role id), come in
whatever order the database returns. Live-probed 2026-09-29 (Rule 28;
scratch journals and presses, "Copyeditor" ticked before the first
save): on one journal "Copyeditor" read above "Editorial Board Member"
at one opening and below it at the next, nothing saved between; on a
second journal below at both openings, on a third above at both; the
press above in all three runs. "Production editor" stood after
"Journal editor" in every run. The same list feeds the public pages, so
they follow the tab's order (code read, not driven).

<a id="fn-f-a15"></a>
**f-a15** — Walked 2026-10-03 on `main`, all three apps ("Logo", a
".pdf" picked with "Upload File", then the pointer over the empty
frame): the frame turned blue with the file's name and a blank white
block, the link "Remove file" in white on white; pressing it emptied
the box and enabled "Upload File", while "Save" stayed disabled with
"Please correct one error. Go to Logo: undefined Jump to next error".
Not walked on 3.5. Cause, read in the code: ui-library `FormGroup.vue`
`setFieldErrors()` deletes a multilingual field's language entry but
leaves an empty object under the field's name, which the form still
counts as an error. The fix proposed for A7 removes the refused file
and its link, but by the code the empty entry still shows while the
next file uploads. Issue report for A7, which records this walk:
[pkp-e2e#772](https://github.com/jardakotesovec/pkp-e2e/issues/772).

<a id="fn-f-a16"></a>
**f-a16** — Walked 2026-10-02 on `main` and 3.5, all three apps, on a
second `php -S` of the same install with `upload_max_filesize` and
`post_max_size` both 8M and `display_errors` off: an 8 MiB (8388608
bytes) "Logo" passed the box's check against `getIntMaxFileMBs()`, and
`POST …/api/v1/temporaryFiles` answered 500
`{"error":"The POST data is too large."}`; the server log read "PHP
Warning: POST Content-Length of 8389029 bytes exceeds the limit of
8388608 bytes". The box kept the preview and the link "Remove file",
an error icon with no text, "Upload File" disabled; the form's foot
"Please correct one error." with "Go to Logo:" and "Save" disabled.
Cause, read in the code: ui-library `FieldUpload.vue` `onError()` shows
only an answer's `errorMessage`, and this answer carries `error`, so
the message is empty; any server refusal of a settings upload that
carries `error` would show the same (not driven). Why the file is sent
and the server error itself belong to Submission files' A21 and Custom
pages & blocks' A18 (pkp-e2e#373).

<a id="fn-f-a17"></a>
**f-a17** — `FieldOptions.vue` prints `option.label` as HTML
(`v-strip-unsafe-html`) but hands the same string to `Orderer` as
`item-title`, which prints it through text interpolation, so an entity
in the label is shown as text: the screen-reader span's source holds
`news2026&amp;amp;-events`, and what a screen reader receives is
`&amp;`, one level. Live-probed 2026-10-05 on all three apps, two runs,
as a Journal Manager and as the Site Administrator through the
manager role: the arrows' names as A17 quotes them, the boxes'
accessible names "news2026&-events (Custom Block) Increase position of
news2026&amp;-events (Custom Block) Decrease position of
news2026&amp;-events (Custom Block)", the visible labels
"news2026&-events (Custom Block)" and ""Developed By" Block". The custom
block's row in the Custom Block Manager raised its script errors
(Custom pages & blocks A13) during the walk; nothing else failed.

<a id="fn-f-a18"></a>
**f-a18** — Note j: ui-library `phpToLuxonFormat()` maps PHP's `S` to
an empty string ("no direct Luxon equivalent"); the server prints with
Carbon's `translatedFormat`. Live-probed 2026-10-05 on all three apps,
two runs: "Custom" under "Date & Time (Short)" with `jS M Y H:i` saved
(sent and stored as typed; the box read it after a reload); a library
file's "Date uploaded" read "5th Oct 2026 04:38" and a discussion
message "Message from {username} 5 Oct 2026 04:38". Control, the
default `Y-m-d h:i A`: both read "2026-10-05 04:38 AM".

<a id="fn-f-a19"></a>
**f-a19** — Note j. Live-probed 2026-10-05 on all three apps, two
runs, on the default `h:i A` with French (Canada) a form and interface
language: a discussion message read "2026-10-05 04:38 a.m." (its head
reads "##discussion.messageFrom##",
[Tasks & discussions](U37-tasks-and-discussions.md#a15)), a
library file's "Date de téléversement" "2026-10-05 04:38 AM"; the tab's
French "Time" choices "04:40", "04:40 a.m.", "4:40a.m." and "Date &
Time (Short)" "2026-10-05 04:40 a.m.". The A8 issue report names the
same split as outside its fix.

<a id="fn-f-a20"></a>
**f-a20** — Each app's `ContextService::afterEditContext()` calls
`_saveFileParam($newContext, null, …)` for the thumbnail with the context
already built from the saved values, so `getData('journalThumbnail',
$locale)` (`pressThumbnail`, `serverThumbnail`) is already `null` and
nothing is removed; `PKPContextService::edit()` passes the old context
for the logo, homepage image and favicon, which is why those are
deleted. Code read 2026-10-05. Live-probed 2026-10-05 on all three
apps, two runs: thumbnail and "Logo" uploaded and saved
(`/public/journals/<id>/journalThumbnail_en.png`, OMP
`/public/presses/<id>/pressThumbnail_en.png`, OPS
`/public/contexts/<id>/serverThumbnail_en.png`, and
`pageHeaderLogoImage_en.png`, each answering 200 `image/png` signed
out); "Remove" on both and "Save" (200, "Saved"): both boxes empty with
"Restore Original" on the same page and after a reload, both settings
cleared in the database; the logo's address then answered 404 and its
file was gone, while the thumbnail's still answered 200 `image/png`
(in a freshly launched browser too) and its file stayed on disk. The
site's list of journals after the removal was not read.

<a id="fn-f-ojs1"></a>
**f-ojs1** — `journalContentOrganization` is added by OJS's
`DefaultThemePlugin` alone; OMP and OPS index handlers read no such
option (note m). Code read 2026-09-24.

<a id="fn-f-ojs2"></a>
**f-ojs2** — Note o: the default is computed on every request from
whether any issue exists; nothing stores it when the journal is created
(the theme's `settings.xml` holds `enabled` alone). Code read 2026-09-24.
Live-probed 2026-09-24: a scratch journal with "Theme" never saved and
one article published with no issue showed it under "Latest
Publications"; after Issues › "Create Issue" › "Save" (not published)
the home page was empty and "Theme" ticked the current issue; after
"Publish Issue" it showed "Current Issue" with the issue and no
articles, and still not the article.

<a id="fn-f-ojs3"></a>
**f-ojs3** — Note n. The label is OJS's
`manager.setup.journalContentOrganization.option.recentPublished`
"Include recent most published articles". Code read 2026-09-24.
Live-probed 2026-09-24 (Rule 13): articles A, B, C published with no
issue listed C, B, A; an article in the published issue was absent; an
article submitted before them and published last sat at the bottom; an
article published at once into an issue not yet published headed the
list.

<a id="fn-f-ojs4"></a>
**f-ojs4** — Note x. Code read 2026-09-24; live-probed 2026-09-24, two
runs (note x).

<a id="fn-f-ojs5"></a>
**f-ojs5** — The fault is in the shared theme-option save, not in
`IndexHandler`. The tab sends an empty list as `''` (jQuery drops empty
arrays, `Form.vue` `submitValues`), the API's `ConvertEmptyStringsToNull`
turns it into `null`, and pkp-lib's `ThemePlugin::saveOption()` stores
a row whose value is NULL. `ThemePlugin::getOption()` reads that back
as never set and answers with the option's default,
`JournalContentOption::default()` (note o); the tab (`PKPThemeForm`,
`Field::getConfig()` `value ?? default`) and `IndexHandler` both see
that default. `journalContentOrganization` is the first theme option
whose default is a list that is never empty. A child theme of the
default theme and the Settings Wizard's "Appearance" tab save through
the same `saveOption()` and meet it too. Code read 2026-10-03; walked
2026-10-03 on `main` and 3.5. Live-probed 2026-09-24 on two scratch
journals with an issue, two runs: "Saved", the tab reopened with
"Include the current issue's table of contents" ticked, and the home
page showed "Current Issue".
Issue report: [pkp-e2e#782](https://github.com/jardakotesovec/pkp-e2e/issues/782) ([docs/issues/U10-OJS5-home-page-parts-all-unticked-come-back.md](../issues/U10-OJS5-home-page-parts-all-unticked-come-back.md)).

<a id="fn-f-ojs6"></a>
**f-ojs6** — `latest_article.tpl` passes `heading=$articleHeading`,
which nothing assigns there, so `article_summary.tpl` falls back to `h2`.
Live-probed 2026-09-24: "Latest Publications" a level-2 heading and each
article title level 2; under "Current Issue", "Articles" level 3 and
each article level 4.
Issue report: [pkp-e2e#783](https://github.com/jardakotesovec/pkp-e2e/issues/783) ([docs/issues/U10-OJS6-latest-publications-titles-same-heading-level.md](../issues/U10-OJS6-latest-publications-titles-same-heading-level.md)).

<a id="fn-f-ojs7"></a>
**f-ojs7** — Note q: the journal's template omits `alt` when the text is
empty. Live-probed 2026-09-24: a journal's homepage image saved with the
box empty had no `alt` attribute.

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `AppearanceSetupForm`, `AppearanceAdvancedForm` and
`DefaultThemePlugin` (notes e, f, h); the catalog reads
`catalogSortOption` (`CatalogListPanel`, `CatalogHandler`) and
`showCatalogSeriesListing` (`catalog.tpl`). Code read 2026-09-24.

<a id="fn-f-omp2"></a>
**f-omp2** — Note v: OMP's `catalogCategory.tpl` prints no page links.
Live-probed 2026-09-24, two runs: at "Items per page" 1 a press category
holding three books showed "3 Titles" and one book with no page links,
while the catalog showed one book with "Next"; on a journal and a
server a category of two items read "1 - 1 of 2 items 1 2 > >>".
Issue report: [pkp-e2e#774](https://github.com/jardakotesovec/pkp-e2e/issues/774) ([docs/issues/U10-OMP2-press-category-page-no-page-links.md](../issues/U10-OMP2-press-category-page-no-page-links.md)).

<a id="fn-f-ops1"></a>
**f-ops1** — OPS `IndexHandler::index()` and `indexServer.tpl` (notes m,
p): no option but `showDescriptionInServerIndex` shapes the page. Code
read 2026-09-24.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-24 (Actors rows 1–2; Actors preamble; all
three apps): as a scratch journal's manager one change on each of
"Theme", "Setup", "Editorial Masthead", "Advanced", "Lists" and "Date &
Time" showed "Saved"; the Editor and Production Editor (OJS, OMP) and
`admin` saved "Lists" alike. `sectioneditor.ana`, `assistant.rita`,
`reviewer.julia`, `author.alex` and `reader.rosa` had no "Settings" group
and the typed address answered the access-denied page; signed out, the
Login page. `admin` with the manager role ended on a scratch press or
server got the access-denied page there; on a scratch journal the page
loaded under the "Error" window, raised by a dashboard count request
answering 401. Two runs. Re-probed 2026-09-29 ("Editorial Masthead"
with its two boxes; all three apps, two runs): the scratch manager
saved both boxes; the Journal editor (OJS) and Press editor (OMP)
ticked "Enable listing of reviewers on the masthead", saw "Saved" and
the box ticked after a reload, and unticked it again; the Section
editor, Series editor and Moderator typing Settings › Website's address
got the access-denied page.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-24 (Actors row 2; Rule 34; all three apps,
two runs): the manager, Editor, Production Editor and every lower role
typing the wizard's or Hosted Journals' address got the access-denied
page, and only `admin`'s side menu had "Administration". In the wizard
"Colour" set to "#1B5E20" and saved showed "Saved", the journal's own
"Theme" tab then read it, and the public header was that green on the
next load; the same with `admin` holding no role in the journal.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-24 (Fields, the upload boxes; all three
apps): a ".pdf" on "Logo" and "Favicon" and a ".png" on the style sheet,
each by the file chooser and by a drop, showed "You can't upload files of
this type." and sent nothing. A logo uploaded to an empty box showed
"Remove" and no "Restore Original"; on a box holding a saved logo,
"Remove" or a new upload (set on the box's hidden file input) added
"Restore Original", which brought back the saved logo with "Journal
logo". A new homepage image put in place of one saved with "Our
building" arrived with the box empty. An unsaved upload did not reach
the visitor's header. Test run 2026-09-24 (Fields, the upload boxes;
scenario 3): ui-library `FieldUploadImage.vue` wraps the dropzone and its
"Upload File" in `<div :class="{'-screenReader': currentValue}">`, so a
box holding a picture shows neither; a mouse click on the button landed
on the preview (OMP). On the tab loaded again with a saved logo the
button was enabled (OJS), and focus plus Enter opened the file chooser,
the upload answering 200 with "Alternate text" empty and "Restore
Original" shown (OMP, OPS); after "Remove" the button was visible and
the upload went through (OJS). Seen once on OJS: right after a logo was
uploaded and saved in the same visit, the hidden button was disabled.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-24 {OMP}: on a new press "Featured Books"
and "New Releases" were unticked, no "Order of monographs" choice was
marked, and the cover sizes read 106 and 100; both boxes ticked and
saved with no book featured or new, the home page gained no heading.
"0" in a cover box was refused, "abc" too, and 1 × 1 and 5000 × 5000
saved. On the catalog "Order Features" › "Save Order" turned "Featured"
from M1, M2 to M2, M1, while "New Releases" kept M1, M2.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-29 (Fields, "Editorial Masthead";
Settings bullets 15a, 15b; all three apps, two runs, scratch contexts):
a new context's tab opened with "Present a masthead based on user
enrollments" ticked; a journal's and a press's with "Enable listing of
reviewers on the masthead" unticked, their first save storing it off;
a preprint server's tab held the first two groups only. Unticked, the
list and "Reviewers" left the tab before any save and came back when
ticked again; a side-tab switch kept the unsaved untick and a reload
restored the saved box, with no dialog. The reviewers box ticked and
saved (OJS, OMP) showed "Saved", stayed ticked after a reload and
added "Peer Reviewers in Previous Year" to the visitor's masthead;
unticked and saved, the block was gone. The only server errors were
the Plugin Gallery's list request on each Settings › Website load
(`plugin-gallery-grid/fetch-grid` 500, the test install has no
internet), unrelated to these tabs.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-24 (Fields, "Lists"; all three apps):
"Items per page" emptied, "This field is required." with nothing sent;
"0" and "-1", "This must be at least 1."; "abc" and "2.5", "This is not a
valid integer."; each with "Please correct one error. Go to Items per
page: … Jump to next error" at the foot; "Page links" the same. 100000
in both boxes saved.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-24 (Fields, "Date & Time"; all three apps):
with the browser's clock set to 24 September 2026 at 15:05 the choices
read as Fields quotes them, the third "Time" choice "3:05PM"; a browser
at UTC+14, while the server read 19:13 UTC on 24 September, showed
"September 25, 2026" and "09:13 AM": the labels follow the manager's
computer.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-24 (Rule 2; all three apps, two runs):
note c.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-24 (Rule 3; all three apps, two runs): on
a journal with English and French forms, an English-only logo, homepage
image, favicon and "Additional Content" showed to the French visitor;
a French-only "Page Footer" ("Pied de page") showed to both, and with
"English footer" added each language read its own; a French "Date
(Short)" of "24.09.2026" printed "Publié 24.09.2026" on the French
item page against "2026-09-24" in English. Live-probed 2026-09-29
(Rules 3a, 3b; three apps, two runs each, OMP three; a signed-out
visitor): on a context with French under "UI" and "Forms" the French
"Date" arrived on "septembre 29, 2026"; a press's book published
2024-03-05, with a second version published that day, read "mars 5,
2024" on its French page and its chapter's page, and the French catalog
gave it "septembre 29, 2026" (the second version's date); with "29
septembre 2026" saved under French (the tab showed it after a reload)
they read "5 mars 2024" and "29 septembre 2026", and the English pages
still "March 5, 2024". A journal's and a server's French pages print no
"Date" (Rule 31): "Publié 2024-03-05", "Diffusé-e 2024-03-05", unchanged
by that save. On a context with French under "UI" alone the tab showed
no language button and no French group; with "j F Y" saved in English
the book read "Published 5 March 2024" in English and "mars 5, 2024" in
French, on the book's and chapter's pages and in the catalog.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-24 (Rule 4; all three apps): the "Theme"
list offered "Default Theme" alone; after "#FFFF00" and "Lora/Open
Sans" were saved the Dashboard's header and font were unchanged;
Settings › Website › "Setup" › "Navigation", "Add Menu", offered the
areas "None", "primary" and "user".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-24 (Rules 5, 6; all three apps): "Lora/Open
Sans" set headings in Lora and text in Open Sans; "Lato" both Lato;
"Noto Serif/Noto Sans" headings Noto Serif, text Noto Sans. "#FFFF00"
gave a yellow header with dark links, "#000080" a navy header with
white links, on the home, item, list and About pages. "red" and
"#12345" typed over "#000080" and saved: the tab reopened on "#000080"
and the header stayed navy. Test run 2026-09-24 (Rule 5; scenario 2;
all three apps): a new journal's and press's home page has no heading
in its body, its one `h1` being the header's screen-reader copy of the
name, in the text's font; with "Lora/Open Sans" saved, the header's name
link (`.pkp_site_name a`) read Lora and the text Open Sans there, and
the "About" page's heading read Lora; on OPS "Latest preprints" read
Lora too.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-24 (Rule 7; all three apps): ticked with
a summary set, the home page gained "About the Journal" ("About the
Press", "About the Server") holding the text, and the skip link to it;
unticked, the section went.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-24 (Rule 8; all three apps): note q.
Ticked with no homepage image, the header kept its colour.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-24 (Rule 9; all three apps, two runs):
the bar and the line choice each added a "Downloads" heading and a
chart to the article, book and preprint pages; with no downloads the
chart was empty, and "Download data is not yet available." never
showed (the test installs process no usage logs); "Do not display…"
removed both.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-24 (Rule 10; OJS): a scratch journal with
no issue ticked "Include recent most published articles" alone; one
with an unpublished issue, and the seeded journal, "Include the current
issue's table of contents" alone.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-24 (Rules 11, 12; all three apps): a
scratch context with every part set showed them in the table's order;
a new one with nothing set showed nothing between the header and the
footer on a journal and a press, and the search box over an empty
"Latest preprints" on a server. The journal's address with and without
`/index` shows the same page, and the header's name leads there.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-24 (Rule 13; OJS): note f-ojs3 for the
entries; "1 - 3 of 3 items" at the defaults. At "Items per page" 1 and
"Page links" 2: page 1 "1 - 1 of 4 items 1 2 > >>", page 2 "2 - 2 of 4
items << < 1 2 > >>", the last "4 - 4 of 4 items << < 3 4". With no
such article the section was absent.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-24 (Rule 14; Settings bullet 25; OJS):
"Current Issue", "Vol. 1 No. 1 (2026)", "Published: 2026-09-24", the
table of contents and "View All Issues" to the archive; unticked, the
section went. "Publishing Mode" set to "OJS will not be used to publish
the journal's contents online." and saved removed the section and
nothing else; set back to open access, it returned.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-24 (Rule 15; OJS): the row read "K2 Arts",
"K2 Science", without the subcategory "K2 Sub"; "K2 Arts" opened that
category's page. With no category the row was absent.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-24 (Rule 16; OPS): the heading over an
empty list with nothing posted; with eleven preprints posted the same
day, ten listed with no page links, at the default and at "Items per
page" 1, in a different order and a different ten on two runs (note p),
while the preprint list showed one with "Next" at 1.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-24 (Rule 18; all three apps): the picture
right under the carousel; its sizes and text alternatives in notes q and
f-a1; saved with the box empty on a journal, no text alternative (OJS7).

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-24 (Rule 19; all three apps): "Welcome
text" was the last part of the home page and on no other page read
(About, the archive or catalog or preprint list, an item's page, the
announcements page).

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-24 (Rule 20; A2; all three apps): a 300 ×
80 logo with "Journal logo" replaced the name on the home and About
pages at 300 × 80 and led to the home page; a 1600 × 160 logo showed at
800 × 80. With the box emptied the logo had no text alternative and the
link no name. "Remove" and "Save" brought the name back. A French
visitor saw the English logo with "Journal logo" until a French one was
saved.

<a id="fn-td24"></a>
**td24** — Live-probed 2026-09-24 (Rule 21; all three apps): the
thumbnail showed as a linked picture above the journal's name on the
site's home page, its text alternative "Thumb".

<a id="fn-td25"></a>
**td25** — Live-probed 2026-09-24 (Rule 22; all three apps): "Footer line"
at the foot of the home and About pages, in a block above the
application's logo.

<a id="fn-td26"></a>
**td26** — Live-probed 2026-09-24 (Rules 23, 24; all three apps): no box
ticked on a new context; "Increase position of Language Toggle Block"
moved that row up with nothing sent, and a drag by the handle moved a
row to the top. On a journal with one language, "Language Toggle Block"
and "Web Feed Plugin" ticked showed "Latest publications" alone; with
two languages, "Language" then "Latest publications". Every box unticked
and saved: no sidebar, the 860-pixel content column moved from the left
edge to the middle. ""Developed By" Block" enabled later landed last
among the unticked boxes, and a custom block named "k3-partners" titled
"K3 Partners" read "k3-partners (Custom Block)" among the unticked
boxes. "Browse Block" enabled on a journal and a server added its box
and a "Browse" block.

<a id="fn-td27"></a>
**td27** — Live-probed 2026-09-24 (Rule 25; A4; all three apps): the
placed "Language Toggle Block" left "Sidebar" and the pages at once when
disabled, and came back ticked and first when enabled again; with a
changed "Sidebar" list saved in between, it came back unticked and last.
The refusal: note f-a4.

<a id="fn-td28"></a>
**td28** — Live-probed 2026-09-24 (Fields, "Advanced"; Rule 26; A5; all
three apps): note t for the pages, f-a5 for the removal. The box read
"k4-red-headings.css" and "Remove" before "Save", and "styleSheet.css"
(a link to the stored file) when the tab was opened again. Test run
2026-09-24 (Fields, "Advanced"; scenario 1): right after "Saved" the box
still read "red-headings.css" with "Remove" and a disabled "Upload
File", and no link, for 10 to 30 s (OJS two runs, OMP one); with the
page loaded again it read "styleSheet.css" as a link ending
`/styleSheet.css` (all three apps).

<a id="fn-td29"></a>
**td29** — Live-probed 2026-09-24 (Rule 27; all three apps): a ".png"
favicon was the page icon on the home, item, Dashboard and Settings ›
Website pages; a ".jpg" was refused in the box; with none, the pages
carried no icon link. A French visitor got the English favicon until a
French one was saved.

<a id="fn-td30"></a>
**td30** — Live-probed 2026-09-24 (Rule 28; all three apps): the
second role's up arrow and "Save" reordered the tab and the headings of
both public pages. "Production editor" ticked on a journal whose tab was
never saved sat second ("Journal editor", "Production editor", "Section
editor", "Editorial Board Member"; a press the same with "Press
editor"); "Layout Editor" ticked after a save sat last. A move left
unsaved survived a side-tab switch and was gone after a reload. The
arrows' names: note f-a3. Re-probed 2026-09-29 (Rules 28, 28a; all
three apps, three runs): the same sets and places ("Layout Editor" on a
journal and a press, "Reader" on a preprint server, last when ticked
after a save; the preprint server's "Author" ticked before the first
save last, at its level), the handle dragged the last role to the top,
and the saved order headed both public pages. With the enrollment box
unticked and saved: no list and no "Reviewers" on the tab, also after a
reload; the masthead held its heading and the "Editorial History"
text, and the history address opened the masthead. Ticked again and
saved: the list and both pages in the saved order. A role moved up and
the box then unticked and saved reopened, ticked again, in the moved
order. Same-level roles: note f-a14.

<a id="fn-td31"></a>
**td31** — Live-probed 2026-09-24 (Rule 29; all three apps): at "Items
per page" 1 the archive, catalog and preprint list, "Latest
Publications", the Search page and a journal's and a server's category
page showed one entry a page; the "Users" list showed all five users
("Showing 1 to 5 of 5") and the "Roles" list one role ("1 - 1 of 18
items 1 2 3 > >>").

<a id="fn-td32"></a>
**td32** — Live-probed 2026-09-24 (Rule 30; all three apps): with 13
items at 1 a page, "Latest Publications" {OJS} and the Search page read
"1 - 1 of 13 items 1 2 3 4 5 6 7 8 9 10 > >>" on page 1 and "7 - 7 of 13
items << < 2 3 4 5 6 7 8 9 10 11 > >>" on page 7 with "Page links" 10,
and "1 2 3 > >>" and "<< < 6 7 8 > >>" with 3; the archive, catalog and
preprint list showed "Previous" and "Next" alone at either number.

<a id="fn-td33"></a>
**td33** — Live-probed 2026-09-24 (Rule 31; all three apps): with
"24.09.2026" and "24 September 2026" saved, announcements printed
"24.09.2026", an article "Published 24.09.2026" and its issue
"Published: 24.09.2026", a preprint "Posted 24.09.2026", a book
"Published 24 September 2026" and the catalog "24 September 2026". A
file's note and a library file's "Date uploaded" read "2026-09-24 07:17
PM" before, "24.09.2026 07:17 PM" after, and "24.09.2026 19:17" once
"15:05" was saved under "Time". Live-probed 2026-09-29 (Rule 31; OMP,
three runs): a chapter's page prints the book's "Date" as the book's
page does.

<a id="fn-td34"></a>
**td34** — Live-probed 2026-09-24 (Rule 32; all three apps, two runs):
"24-09-2026" under "Date (Short)" rewrote the ready "Date & Time (Short)"
label, still marked; "2026-09-24" back rewrote it to "2026-09-24 07:31
PM", and "Save" stored `Y-m-d h:i A`, marked after the reload, with and
without a save in between; "15:05" under "Time" rewrote both combined
labels and back restored them; a combined group on "Custom" stayed there with its ready
label rewritten.

<a id="fn-td35"></a>
**td35** — Live-probed 2026-09-24 (Rule 33; all three apps, two runs):
"d/m/Y" printed "24/09/2026" on announcements and item pages and
"24/09/2026 19:17" in editorial dates; "Custom" emptied and saved printed
"2026-09-24" again and the tab reopened with "2026-09-24" marked; the
editorial dates: note f-a9.

<a id="fn-td36"></a>
**td36** — Live-probed 2026-09-24 (Rule 34; OJS4; all three apps, two
runs): note x. A colour typed in the wizard stayed through its "Journal"
("Press", "Server") tab and back, and was gone after a reload with no
question.

<a id="fn-td37"></a>
**td37** — Live-probed 2026-09-24 (Rule 35; A6; all three apps, two runs):
on OJS the organization field's five codes and nothing else; on OPS
the statistics field's label and three choices; on OMP 23 codes, the
field label "Thème" and its description translated. Note f-a6.
Live-probed 2026-09-28 (Rule 35; all three apps, two runs): the "Theme"
codes as before; a press's "Setup" and "Advanced" codes in note f-a6.

<a id="fn-td38"></a>
**td38** — Live-probed 2026-09-28 (Rules 35a, 35b; all three apps, two
runs, English and French interface on scratch contexts): the upload
boxes in note f-a12, the "Entête" tab in note f-a11. The preprint
server's Moderator code also labels its arrows ("Avancer la position de
##default.groups.name.sectionEditor##"). Re-probed 2026-09-29 (Rule 35b;
all three apps, two runs): as before; the "Évaluateurs-trices" group
(OJS, OMP) now holds the reviewers box, and a preprint server's tab has
no such group. The labels pkp/pkp-lib#13370 added (the enrollment group,
its description and box, the reviewers box) read as raw codes in French
and the "Évaluateurs-trices" note keeps its older wording, pending
their translation. Walked 2026-10-03 (Rule 35a; all three apps, `main`
and 3.5, French (Canada)): a ".pdf" picked for "Logo" with "Téléverser
un fichier" was refused with "You can't upload files of this type.",
and the refused file's frame carried the link "Remove file". By the
code, the drop area and the refusal take the upload library's own
English texts in every language (note f-a12).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Theme" tab (theme list and the theme's fields, "Save") | Settings › Website › Appearance › Theme | AFFM-018 |
| "Setup" tab (logo, thumbnail, homepage image, page footer, sidebar; OMP catalog fields) | Settings › Website › Appearance › Setup | AFFM-019 |
| "Editorial Masthead" tab (role order) | Settings › Website › Appearance › Editorial Masthead | AFFM-020 |
| "Advanced" tab (style sheet, favicon, additional content; OMP cover sizes) | Settings › Website › Appearance › Advanced | AFFM-021 |
| "Lists" tab | Settings › Website › Setup › Lists | AFFM-041 |
| "Date & Time" tab | Settings › Website › Setup › Date & Time | AFFM-043 |
| Settings Wizard "Appearance" tab | Administration › Hosted Journals › "Settings wizard" | AFFM-198 |
| "Latest Publications" on the journal's home page | the journal's home page (OJS) | AFFR-023 |
| The home page's summary section, homepage image and additional content | the home page | AFFR-025 |
| A preprint server's home composition ("Latest preprints"; the archive header is the Sections feature's) | the server's home page (OPS) | AFFR-027 |
| Home page handlers | `index` of a journal, press or server | ROUTE-011 · ROUTE-038 · ROUTE-060 · ROUTE-077 |
| Settings pages' `website` op | Settings › Website | ROUTE-017 · ROUTE-042 · ROUTE-063 · ROUTE-078 · VUE-022 |
| The theme's compiled stylesheet (`css` op; the `tasks` op is the notifications feature's) | `$$$call$$$/page/page/css?name=stylesheet` | GRID-064 |
| Default theme plugin | Settings › Website › Plugins (theme plugins) | PLUG-049 |
| Theme read and save (sub-op cited here, owned by Hosted journals) | `api/v1/contexts/{id}/theme` (GET, PUT) | API-013 |

## Reference — code anchors

- `lib/pkp/pages/management/ManagementHandler.php` (`website()`),
  `lib/pkp/templates/management/website.tpl`; each app's
  `pages/management/SettingsHandler.php`.
- `lib/pkp/classes/components/forms/context/PKPThemeForm.php`,
  `PKPAppearanceSetupForm.php`, `PKPAppearanceMastheadForm.php`,
  `PKPAppearanceAdvancedForm.php`, `PKPListsForm.php`,
  `PKPDateTimeForm.php`; each app's
  `classes/components/forms/context/AppearanceSetupForm.php` and
  `AppearanceAdvancedForm.php`.
- ui-library `src/components/Form/context/ThemeForm.vue`,
  `DateTimeForm.vue`; `src/components/Form/fields/FieldOptions.vue`,
  `FieldRadioInput.vue`, `FieldUpload.vue`, `FieldUploadImage.vue`,
  `FieldColor.vue`; `src/components/Orderer/Orderer.vue`.
- `lib/pkp/api/v1/contexts/PKPContextController.php` (`getTheme()`,
  `editTheme()`); `lib/pkp/classes/services/PKPContextService.php`
  (`validate()`, `edit()`, `_saveFileParam()`); each app's
  `classes/services/ContextService.php` (thumbnails).
- `lib/pkp/classes/plugins/ThemePlugin.php`; each app's
  `plugins/themes/default/DefaultThemePlugin.php` and its locale;
  OJS `classes/journal/enums/JournalContentOption.php`.
- `lib/pkp/classes/template/PKPTemplateManager.php` (logo, favicon, style
  sheet, formats, `displaySidebar()`, `smartyPageInfo()`,
  `smartyPageLinks()`); `lib/pkp/controllers/page/PageHandler.php`
  (`css()`); `lib/pkp/templates/frontend/components/header.tpl`,
  `footer.tpl`.
- `lib/pkp/pages/index/PKPIndexHandler.php`; each app's
  `pages/index/IndexHandler.php` and home template (OJS
  `indexJournal.tpl`, `latest_article.tpl`, `categoryHeader.tpl`; OMP
  `index.tpl`; OPS `indexServer.tpl`); each app's `indexSite.tpl`
  (thumbnails).
- `lib/pkp/pages/admin/AdminHandler.php` (`wizard()`),
  `lib/pkp/templates/admin/contextSettings.tpl`,
  `lib/pkp/controllers/grid/admin/context/ContextGridRow.php`.
- `lib/pkp/classes/userGroup/Repository.php`
  (`getSortedMastheadUserGroups()`); each app's `registry/userGroups.xml`.
- `lib/pkp/schemas/context.json` and each app's `schemas/context.json`
  (the settings' types and defaults); each app's `config.TEMPLATE.inc.php`
  (`[general]` date and time formats).
