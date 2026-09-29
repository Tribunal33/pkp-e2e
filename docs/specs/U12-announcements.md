---
name: announcements
status: verified
---

# Announcements {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Announcements are a journal's news posts: a call for papers, a conference,
a closing date. A Journal Manager switches them on in the journal's
Website settings, writes them on the journal's Announcements page (a side
panel with a title, a short description, the full text, a picture and an
optional expiry date) and can have every user with a role in the journal
emailed about a new one. Readers meet them on the public Announcements
page, on each announcement's own page and, if the manager chooses, at the
top of the home page; an announcement disappears from the public site on
its expiry date. When the install hosts several journals, the Site
Administrator has a separate set for the site's own home page. On a
journal the announcements can also be read as a web feed ⚠ [A7](#a7).
<sup>a</sup>

## Actors & permissions

An announcement belongs either to one journal or to the site (Rule 1).
"Manager-level roles" below are the roles whose row on the journal's
Roles settings reads "Journal Manager" ("Press Manager" on a press,
"Manager" on a preprint server) for its permission level: Journal
Manager, Editor and Production Editor on a journal or press; on a
preprint server the manager alone. The journal's settings are open to a
manager-level role only while the role has "Permit changes to Settings"
ticked on the Roles settings. The Editor and Production Editor rows have
it ticked and can lose it; the manager role's row offers no "Edit", so it
keeps it, and on a preprint server no manager-level role can lose it. The
announcements page itself does not ask for it (Rule 3). Readers need no
account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Switch announcements on and configure them** (Settings › Website › Setup › Announcements) | • manager-level roles of that journal with "Permit changes to Settings"<br>• Site Administrator working in the journal (the same tab)<br>• Section Editor, Assistant, Author, Reviewer, Reader: no Website settings at all; the settings address answers the access-denied page <sup>b</sup> |
| **Open the journal's Announcements page; add, edit and delete announcements; add, edit and remove announcement types** | • manager-level roles of that journal, with or without "Permit changes to Settings" (Rule 3)<br>• Site Administrator working in the journal<br>• the page opens by its address even while announcements are switched off (Rule 2) ⚠ [A8](#a8)<br>• Section Editor, Assistant, Author, Reviewer, Reader: the access-denied page, and no "Announcements" entry in their side menu <sup>b</sup> <sup>c</sup> |
| **Open the site's Announcements tab; configure, add, edit, delete site announcements and their types** | • Site Administrator, on the Site Settings, only while the site hosts two or more journals (Rule 16)<br>• Journal Manager: never; the Site Settings are the administrator's alone <sup>d</sup> |
| **Read the Announcements page, an announcement's page and the home page list** | • any visitor, signed in or not, while the journal's "Enable announcements" is ticked (Rule 2); with it unticked every announcement address answers "404 Not Found" and the header carries no "Announcements" item <sup>e</sup> |
| **Follow the "Edit" link on the public Announcements page** | • manager-level roles of that journal and the Site Administrator working in it, signed in: the link "Edit" (read to a screen reader as "Edit" followed by "Edit Announcements"; by "Open a new page to edit this information" on a press) opens the journal's Announcements page on its "Announcements" tab (Rule 9); nobody else sees it, and neither the announcement's page nor the home page carries one <sup>e</sup> |
| **Be told about a new announcement** | • every user holding a role in that journal, the person who posted it included, unless the "A new announcement has been created." row ("New announcement." on a press) of their profile's Notifications tab says otherwise (Side effects); a Site Administrator with no role in the journal is not told, a case that cannot be seen on a test install, whose administrator holds a role in every journal<br>• nobody for a site announcement (Rule 16) <sup>f</sup> |
| **Read the announcement feed** {OJS} | • any visitor, through the feed links, while announcements are on and a manager has enabled the "Announcement Feed Plugin", which a fresh journal has off (Rule 18) <sup>g</sup> |

## Fields & validation

The "Add Announcement" and "Edit Announcement" side panels carry the same
fields and one "Save" button. A save that fails validation is refused in
place: the panel stays open, "Please correct one error." (or "Please
correct {n} errors.") appears under the fields above "Save", with a "Go to
{field}: {message}" button per fault and a "Jump to next error" button,
the message sits under the field, and "Save" is grayed out until every
flagged box is changed. "Title", "Short Description" and "Announcement" are
entered per language when the form has more than one: a language button
at the top of the panel shows the second language's boxes, labelled
"{Field} in {language}" (Rule 14). <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Title" | yes, in the primary language | One line of plain text, the widest box on the panel. Empty on save: "This field is required." (with two or more form languages, on an edit: "You must complete this field in {language}.", naming the primary language). Shown as the row's name in the list, as the heading of the announcement's page and of its summary, as the browser title of its page and as the subject of the email <sup>h</sup> <sup>i</sup> |
| "Short Description" | no | Formatted text under the hint "A brief description to appear along with the announcement title.", with bold, italic, superscript, subscript, a link, a block quote, bulleted and numbered lists, a picture and a source-code view. The picture button, "Insert/edit image", uploads and inserts a picture as every formatted text box with one does, the files it takes and refuses included ([→ pictures](U09-custom-pages-and-blocks.md#image-upload)). Shown under the title in every summary (the Announcements page, the home page's first item) and in the email; on the announcement's own page only when "Announcement" is empty (Rule 10) <sup>h</sup> <sup>i</sup> |
| "Announcement" | no | Formatted text under the hint "The full text of the announcement.", the same controls as "Short Description" in a taller box. Shown on the announcement's own page alone (Rule 10) <sup>h</sup> |
| "Image" | no | An upload box ("Upload File"; "Drop files here to upload") that takes image files only. Any other file is refused in the box, with "You can't upload files of this type." under its name and a "REMOVE FILE" link that clears it; until it is cleared the panel counts it as a form error ("Please correct one error.", "Save" and "Upload File" grayed out); a file over the server's upload limit is refused the same way with "File is too big ({size}MiB). Max filesize: {limit}MiB.". A chosen image shows a preview with an "Alternate text" box and "Remove"; on an edit, "Remove" clears the preview and offers "Restore Original", which brings the saved picture and its alternate text back. A GIF, JPEG or PNG whose file name ends in the matching lower-case extension (.gif, .jpg, .png) saves; a JPEG named ".jpeg" or any image with an upper-case extension is accepted in the box but refused on "Save" with "There was an error uploading this image." under "Image", and on an edit that refusal deletes the announcement ⚠ [A2](#a2). A saved image shows above the text on the announcement's page and beside the title in its summaries, with the alternate text as its description (Rule 15) <sup>j</sup> |
| "Expiry Date" | no | A small plain-text box under the hint "The announcement will be displayed to readers until this date. Leave blank if the announcement should be displayed indefinitely.", typed as YYYY-MM-DD; any other shape is refused with "The date format is not valid. Enter each date in the format YYYY-MM-DD.". A past date is accepted. On "Edit Announcement" the box shows the saved date in the journal's short date format, which the save refuses unless that format is YYYY-MM-DD ⚠ [A3](#a3). What the date does: Rule 8 <sup>k</sup> |
| "Announcement Type" | no | A list of round buttons, one per type of the journal (Rule 13), shown only while at least one type exists; nothing is chosen for a new announcement, and a chosen type cannot be cleared, only changed ⚠ [A6](#a6). The type shows nowhere to readers ⚠ [A5](#a5) <sup>l</sup> |
| "Send Email" · "Send an email about this to all registered users." | no | A box, unticked by default. On "Add Announcement", ticked, it sends the email of Side effects to every user the journal notifies; on "Edit Announcement" the box is offered again, unticked, and does nothing ⚠ [A9](#a9) <sup>f</sup> |

**The Announcements settings tab** (Settings › Website › Setup ›
Announcements; the same form on the site's tab, Rule 16) has three fields
and "Save": <sup>m</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Announcements" · "Enable announcements" | no | A box under the sentence "Announcements may be published to inform readers of journal news and events. Published announcements will appear on the Announcements page." ("…of news and events." on a press, "…of server news and events." on a preprint server), unticked on a fresh journal. What it switches: Rule 2. The two fields below appear only while it is ticked <sup>m</sup> |
| "Introduction" ("Additional Information" on a press [OMP1](#omp1)) | no | Formatted text per language, empty by default; its help icon reads "Enter any information you would like to appear on your announcements page." ("Enter any additional information that should be displayed to readers on the Announcements page." on a press). Shown on the public Announcements page between the heading and the list (Rule 9) <sup>m</sup> |
| "Display on Homepage" | no | A small box under "How many announcements to display on the homepage. Leave this empty to display none.", empty by default. A whole number of zero or more; text or a decimal is refused with "This is not a valid integer." and a negative number with "This must be at least 0."; the tab then reads "Please correct one error." with a "Jump to next error" link, and "Save" is grayed out until the value changes. What the number does: Rule 11 <sup>m</sup> |

Nothing on the tab is saved before "Save": an unsaved tick stays on
screen while another tab of the Website settings is opened, and leaving
the page loses it without a warning. <sup>m</sup>

**The "Add Announcement Type" and "Edit" windows** (the "Announcement
Types" tab, Rule 13) carry one field, "Name" (per language, required in
the primary language: left empty, or filled in the second language only,
it is refused with "This field is required." under "Name"), "Save" and
"Cancel". The window blocks the page behind it until "Save", "Cancel" or
its close control; leaving by address drops an unsaved name without a
warning. <sup>l</sup>

**The "Announcement Feed Plugin" settings window** {OJS} (Rule 18)
carries three round buttons, "Display feed links on all journal pages.",
"Display feed links only on homepage and announcement page." and "Display
feed links only on announcement page.", none chosen on a fresh journal,
and a small box "Limit feed to [ ] most recent announcements." that
empties itself for text, zero or a negative number and otherwise keeps
what was typed, a decimal included, with "OK" and "Cancel"; "Cancel"
discards the changes. <sup>g</sup>

## Rules & state

1. **Scope.** Every announcement belongs to exactly one journal, or to
   the site. A journal's Announcements page lists only its own, its public
   pages show only its own (a press's home page can show the site's,
   [OMP2](#omp2)), and its types are its own; nothing is shared between
   journals. The site's set is kept on the Site Settings and is meant for
   the site's own home page (Rule 16). <sup>a</sup>
2. **The switch.** With "Enable announcements" unticked (the state of
   every fresh journal and of the site): the public Announcements page and
   every announcement's page answer "404 Not Found"; the header's
   "Announcements" item is hidden; the home page lists none; the editorial
   side menu has no "Announcements" entry; on a journal a feed address
   lands on the home page, or answers "404 Not Found" while the feed
   plugin is off (Rule 18). Ticking it and pressing "Save" reverses all
   of that: the side menu gains its entry the moment the save succeeds,
   the public pages, the header item and the feeds from their next load;
   announcements already saved while it was off become visible at once.
   The journal's Announcements page itself stays reachable by its address
   either way, and accepts new announcements that nobody can read until
   the box is ticked ⚠ [A8](#a8). <sup>c</sup> <sup>e</sup> <sup>m</sup>
3. **Reaching the Announcements page.** While announcements are on, the
   editorial side menu of every manager-level role shows an
   "Announcements" entry with its own icon, above "Settings" (right after
   the save that switched announcements on it sits between "DOIs" and
   "Settings"; a reload moves it above "DOIs"); it opens the
   Announcements page, headed "Announcements", with the tabs
   "Announcements" and "Announcement Types". The page does not ask for
   "Permit changes to Settings": an Editor or Production Editor whose
   Roles row has it unticked, and so has no "Settings" in its side menu,
   still has "Announcements" and reaches the page (a state a journal or
   press can hold, not a preprint server; Actors). <sup>c</sup>
4. **The list.** The "Announcements" tab lists the journal's announcements
   newest first, expired ones included, one row per announcement showing
   its title and the buttons "View", "Edit" and "Delete"; above the list a
   "Search" box and "Add Announcement". With no announcements the list
   reads "No items found.". Thirty rows fill a page; a longer list gets
   page controls under it. Typing a phrase in "Search" and pressing Enter
   filters the list to the announcements whose title, short description
   or full text contains every word typed, in any case, all the words in
   the same one of those three texts ("june call" finds nothing when
   "june" is in the short description and "call" in the title); typing
   alone changes nothing, clearing the box and pressing Enter brings the
   whole list back, and a phrase no announcement holds leaves "No items
   found.". "View" opens the announcement's public page in the same
   window (an expired one: the Announcements page instead, Rule 8; with
   announcements off: "404 Not Found", Rule 2). <sup>c</sup> <sup>n</sup>
5. **Adding.** "Add Announcement" opens the "Add Announcement" panel
   (Fields & validation). "Save" closes the panel and the new announcement
   appears as the first row of the list with no reload; the row shows its
   title and the three buttons alone, and its posted date, today, prints
   under the title on the Announcements page and the home page. It is
   public from that moment, on the Announcements page and, within the
   "Display on Homepage" count, on the home page; there is no draft state
   and no publish step. Closing the panel with its close control, or
   leaving the page by typing another address, drops what was typed with
   no warning, and "Add Announcement" opens an empty panel again; a
   picture already inserted into a box stays stored at its address
   (*[Custom pages & blocks](U09-custom-pages-and-blocks.md#image-upload)*
   Rules 29a, 29b). <sup>c</sup> <sup>o</sup>
6. **Editing.** "Edit" on a row opens the "Edit Announcement" panel with
   the row's values filled in, the image previewed and the expiry date
   printed (Fields "Expiry Date"). "Save" closes the panel and the row
   shows the new title in place; the public pages show the change on
   their next load. The posted date never changes: an edited announcement
   keeps its place in every list. Closing the panel with its close control,
   Escape on a plain box or a click outside it keeps the announcement as it
   was, with no warning, but the row shows the unsaved title until the
   page is reloaded ⚠ [A11](#a11). <sup>c</sup> <sup>o</sup>
7. **Deleting.** "Delete" on a row opens the "Delete Announcement"
   dialog: "Are you sure you want to permanently delete the announcement
   {title}?" with "Yes" and "No". "Yes" removes the row and the
   announcement's pages; its image file stays in the journal's public
   files ⚠ [A12](#a12). "No" closes the dialog and keeps everything.
   <sup>c</sup> <sup>j</sup>
8. **Expiry.** An announcement with an "Expiry Date" is public until the
   day before that date: from the first moment of the expiry date it is
   gone from the Announcements page, the home page and the feed, and its
   own page sends the visitor to the Announcements page instead. A past
   date on a new announcement makes it invisible from the start. An
   expired announcement stays in the manager's list, and clearing the date
   brings it back. The email of Side effects is sent whatever the date.
   <sup>k</sup>
9. **The Announcements page.** The header's "Announcements" item (Rule 12)
   opens the journal's Announcements page: the breadcrumb "Home" ›
   "Announcements", the heading "Announcements", the "Introduction" text
   when one is set, then every unexpired announcement newest first, each
   as a summary: the image when there is one, the title as a link, the
   posted date, the "Short Description" and a "Read More" link (read to a
   screen reader as "Read more about {title}"). With no unexpired
   announcement the page shows the heading and the introduction alone, no
   "no announcements" sentence ⚠ [A10](#a10). A signed-in manager-level
   role also sees an "Edit" link under the heading (Actors row 5).
   <sup>e</sup> <sup>p</sup>
10. **An announcement's page.** The title link and "Read More" open the
    announcement's own page: the breadcrumb "Home" › "Announcements" ›
    {title}, the title as heading, the posted date, the image above the
    text when there is one, then the "Announcement" text, or the "Short
    Description" when the full text is empty. The browser title is the
    announcement's title followed by the journal's name, as on the
    journal's other pages. The page has no other control. The address of
    an expired announcement, of an unknown one or of another journal's
    announcement opens the Announcements page instead, with no message.
    <sup>e</sup> <sup>p</sup>
11. **The home page list.** With "Display on Homepage" holding a number
    above zero and at least one unexpired announcement, the home page
    carries a block headed "Announcements": the newest announcement as a
    full summary (as on the Announcements page, Rule 9) and up to the rest
    of the number as title links with their posted date, newest first. The
    block sits below the carousel of highlights, the homepage image and
    the "About the Journal" text on a journal, and above the preprint list
    on a preprint server; the page's skip links gain "Skip to
    announcements". A number larger than the count lists them all; an
    empty box, zero or no unexpired announcement leaves no block and no
    heading. The site's home page has the same block for the site's
    announcements, governed by the site's own two fields (Rule 16). On a
    press with "Display on Homepage" empty, while the site's announcements
    are on with a count, the press's home page carries the site's block,
    where a journal and a preprint server show none {OMP} ⚠
    [OMP2](#omp2). <sup>q</sup>
12. **The header item.** A fresh journal's primary navigation menu carries
    an "Announcements" item (after "Archives" on a journal, after
    "Catalog" on a press, first on a preprint server), shown only while
    announcements are on; it opens the Announcements page. The menu's
    editor warns "This link will only be displayed if you have enabled
    announcements under Settings > Website." on that item. The item's
    place and removal are *Navigation menus & site chrome*'s. <sup>e</sup>
13. **Types.** The "Announcement Types" tab shows a table headed
    "Announcement Types" with a "Name" column and "Add Announcement Type"
    above it; empty, it reads "No announcement types have been created.".
    "Add Announcement Type" opens a window of that name with "Name",
    "Save" and "Cancel" (Fields); a save adds the row and shows
    "Announcement type added." at the top right of the screen. A row's
    arrow opens "Edit" (the same window; "Announcement type edited." on
    save, but the table shows the old name until the page is reloaded ⚠
    [A13](#a13)) and "Remove", which asks "Are you sure you wish to delete
    this item? This action cannot be undone." with "OK" and "Cancel";
    "OK" removes the type, shows "Announcement type removed." and deletes
    every announcement of that type with it, which the dialog never says
    ⚠ [A1](#a1); the "Announcements" tab's list still shows them until the
    page is reloaded. Once a type exists the announcement panel offers
    "Announcement Type" (Fields); with none, the field is absent. The
    type's name is printed nowhere: not on the Announcements page, the
    announcement's page, the home page, in the email or, on a journal, in
    the feeds (Rule 18). <sup>l</sup>
14. **Languages.** The panel's text fields are entered per language for
    each language ticked under "Forms" on the journal's Languages
    settings; the site's panel offers every language the site has. Only
    the primary language's "Title" is required. The list and every public
    page show each text in the language the page is viewed in when the
    announcement has one, otherwise in the primary language; a short
    description entered in French alone once printed in French on the
    English page of a journal whose primary language is English, a
    fallback not yet confirmed ⚠ [A17](#a17). The email is
    written in the journal's primary language (on a press or a preprint
    server one sentence of it stays English ⚠ [A14](#a14)). <sup>h</sup>
    <sup>r</sup>
15. **The image.** A saved image is kept as a file of the journal's (or
    the site's) public files, one per announcement, and shown on the
    announcement's page and in its summaries with the "Alternate text" as
    its description. On an edit, "Remove" then "Save" deletes the file
    and leaves the pages text-only; a new upload of the same type
    overwrites the file, and one of another type is written beside the
    old file, which stays. Deleting the announcement leaves its file
    behind too ([A12](#a12); Rule 7). <sup>j</sup>
16. **The site's announcements.** On a site with two or more journals the
    Site Settings show an "Announcements" tab with three side tabs:
    "Settings" (the same three fields as the journal's tab, Fields),
    "Announcements" and "Announcement Types". While the site's "Enable
    announcements" is unticked the last two read "You must enable
    announcements." with the two last words linking to "Settings"; ticked
    and saved, they show the site's list panel and types table at once.
    The site's panel adds, edits, deletes and searches as the journal's
    does (Rules 4–7), and the site's types table behaves as the journal's
    (Rule 13). The site's announcements are the site's home page's (Rule
    11) and the site's own Announcements page's (`index/announcement`),
    open while the site's box is ticked; the site's header has no
    "Announcements" item, so that page is reached by its address, by the
    home page block's links and by the "Skip to announcements" link. A site announcement never
    sends the email of Side effects; its notification is not recorded
    either, which no screen shows (Actors row 6). A site with one journal
    has no site-level announcements screen, a state that cannot be seen
    on the test installs; the rule that hides the tab is *Site settings*'
    (*[Highlights](U11-highlights.md)* Rule 12 states it). <sup>d</sup>
17. **Live at once, for everyone.** An unexpired announcement is public
    from the moment it is saved, to every visitor alike: no draft, no
    approval, no per-role visibility. <sup>o</sup>
18. **The feed** {OJS}. A journal's announcements can be read as an Atom,
    an RSS 2.0 or an RSS 1.0 feed while announcements are on and the
    "Announcement Feed Plugin" (Settings › Website › Plugins › Installed
    Plugins › Generic; off on a fresh journal) is enabled. With the
    plugin enabled and announcements off, a feed address lands on the
    journal's home page; with the plugin disabled it answers "404 Not
    Found". Each feed is titled "{journal name}: Announcements" and lists
    the unexpired announcements in no fixed order (usually the order they
    were added), each with the announcement's title, its posted date, its
    page's address and its "Announcement" text; only the RSS 2.0 feed's
    dates are readable ⚠ [A15](#a15). With "Limit feed to" set the feeds
    carry only the first that many they list without it, not the most
    recent ones the label promises ⚠ [A7](#a7). The plugin's block, "Announcement Feed Plugin", placed in
    the sidebar (*Appearance & theming*, Settings › Website › Appearance ›
    Setup › Sidebar), shows a box headed "Announcements" with three logo
    links ("Atom logo", "RSS2 logo", "RSS1 logo") to the feeds. The
    "Display feed links…" choice says where the box appears: "…only on
    announcement page." on the Announcements page and on each
    announcement's page, "…only on homepage and announcement page." on
    those and the home page, "…on all journal pages." everywhere. On a
    fresh journal, with no choice saved, the box appears on the home page
    alone, while the hidden feed links a browser's feed reader looks for
    sit on every page ⚠ [A16](#a16). A press and a preprint server install no
    announcement feed plugin. <sup>g</sup>

## Side effects

- **A notification for every user with a role in the journal**, the
  poster included, is recorded when an announcement is added (never on an
  edit); it appears nowhere in the application (the "no task" of
  *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*
  Rule 6) and is withheld from a user whose "Enable these types of
  notifications." is unticked on the "A new announcement has been
  created." row ("New announcement." on a press) of their Notifications
  tab. <sup>f</sup>
- **The "New Announcement" email**, only when "Send an email about this to
  all registered users." was ticked on "Add Announcement": one email per
  user notified above whose "Do not send me an email for these types of
  notifications." on that row is unticked; subject the announcement's
  title; body the title in bold, the "Short Description", then "Visit our
  website to read the full announcement." with "full announcement" a link
  to the announcement's page, and the Unsubscribe footer; the From line
  names the person who posted it. The mail is in the journal's primary
  language, with one English sentence left on a press or a preprint
  server ([A14](#a14); Rule 14). Both the notification and the email are
  queued, as one job for the users notified alone and one for those
  emailed too: they arrive when the site's background jobs run; a test
  install never runs them by itself. The template is edited under
  Settings › Workflow › Emails as "New Announcement" (*Emails
  management*). <sup>f</sup>
- **The image** is stored as a file in the journal's (or the site's)
  public files directory and deleted on "Remove", not with the
  announcement ([A12](#a12); Rule 15). <sup>j</sup>
- **Deleting an announcement type** deletes every announcement of that
  type (Rule 13) ⚠ [A1](#a1). <sup>l</sup>
- **Deleting a journal** deletes its announcements, their images and its
  types with it (*Hosted journals* owns the deletion). <sup>a</sup>
- Nothing is written to any log (no screen shows one); no task is raised:
  after the jobs have run, the manager's Tasks panel reads "No Items".
  <sup>f</sup>

## Settings that modify behavior

- **"Enable announcements"** (Settings › Website › Setup › Announcements;
  default unticked). Unticked: no public announcement page, no header
  item, no home page block, no side menu entry; on a journal a feed
  address lands on the home page (Rule 2). Ticked: all of those, the side
  menu entry the moment the save succeeds and the rest from the next page
  load. <sup>m</sup>
- **"Introduction"** (the same tab; default empty). Filled: the text
  prints under the heading of the Announcements page (Rule 9). Empty:
  nothing between the heading and the list. <sup>m</sup>
- **"Display on Homepage"** (the same tab; default empty). A number above
  zero: the home page block with that many announcements (Rule 11). Empty
  or zero: no block. <sup>m</sup>
- **The site's "Enable announcements", "Introduction" and "Display on
  Homepage"** (Site Settings › Announcements › Settings; defaults as the
  journal's). The same effects for the site's Announcements page and home
  page (Rule 16). <sup>d</sup>
- **"Permit changes to Settings"** (Settings › Users & Roles › Roles, a
  role's edit form; ticked on every default manager-level role, and the
  manager role's own row offers no "Edit"). Unticked on an Editor or
  Production Editor: the role loses the journal's settings and the
  Announcements settings tab with them, and keeps the Announcements page
  (Rule 3); on a preprint server no manager-level role can be changed.
  *Users management* owns the role form. <sup>b</sup>
- **"Forms"** column (Settings › Website › Setup › Languages; default the
  primary language only). Each language ticked adds that language to the
  panel's "Title", "Short Description" and "Announcement" (Rule 14).
  *Languages & locales* owns it. <sup>h</sup>
- **"Date (Short)"** (Settings › Website › Setup › Date & Time; default
  YYYY-MM-DD). Another format changes how the posted dates print on every
  page of this feature and how "Edit Announcement" prints the expiry
  date, which the save then refuses ⚠ [A3](#a3). *Appearance & theming*
  owns the tab. <sup>k</sup>
- **The "A new announcement has been created." row** ("New
  announcement." on a press) of each user's Notifications tab (Profile ›
  Notifications; "Enable these types of notifications." ticked and "Do
  not send me an email for these types of notifications." unticked by
  default; a person who registered with "Yes, I would like to be
  notified of new publications and announcements." unticked starts with
  the email box ticked, so gets the notification and no email). Its two
  boxes decide whether that user gets the notification and the email
  (Side effects). *Notifications center & email preferences* owns the
  tab. <sup>f</sup>
- **"Announcement Feed Plugin"** {OJS} (Settings › Website › Plugins ›
  Installed Plugins › Generic; default disabled). Enabled: the feeds
  answer and the block can be placed; with announcements off a feed
  address then lands on the journal's home page. Disabled: the feeds
  answer "404 Not Found" and the block is gone from the sidebar choices.
  Its "Display feed links…" choice (default none saved: the block on the
  home page alone) and "Limit feed to" (default empty: every unexpired
  announcement) are Rule 18's. *Plugins management* owns enabling a
  plugin. <sup>g</sup>
- **"Sidebar"** {OJS} (Settings › Website › Appearance › Setup; default
  no block). "Announcement Feed Plugin" ticked places the feed box (Rule
  18). *Appearance & theming* owns the sidebar. <sup>g</sup>

## Cross-feature interactions

- *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*
  owns the Notifications tab, the meaning of its two boxes and the
  Unsubscribe footer; this spec owns the event, its recipients and the
  email's text (Side effects).
- *[Registration & account validation](U02-registration-and-account-validation.md)*
  owns the "Yes, I would like to be notified of new publications and
  announcements." box that presets the email choice.
- *Navigation menus & site chrome* owns the primary navigation menu the
  "Announcements" item sits in (Rule 12) and the skip links.
- *Appearance & theming* owns the home page's other blocks around the
  announcements block (Rule 11), the "Date & Time" formats and the
  sidebar (Rule 18).
- *Languages & locales* owns the "Forms" languages (Rule 14).
- *Site settings* owns the Site Settings page and the rule that shows its
  tabs only on a multi-journal site (Rule 16); this spec owns what the
  site's "Announcements" tab does.
- *Hosted journals* owns creating and deleting journals (Side effects).
- *Users management* owns the Roles form with "Permit changes to
  Settings" (Rule 3).
- *Emails management* owns editing the "New Announcement" template; the
  email's default text is Side effects'.
- *Plugins management* owns enabling and disabling the "Announcement
  Feed Plugin" (Rule 18).
- *[Custom pages & blocks](U09-custom-pages-and-blocks.md#image-upload)*
  owns the picture button of "Short Description" and "Announcement"
  (Fields; Rule 5).
- *[Highlights](U11-highlights.md)* is the neighbouring tab under Setup;
  nothing is shared: a highlight is not an announcement and appears in no
  announcement list or feed.

## Canonical scenarios

Every scenario runs on a scratch journal with throwaway accounts, because
the seeded journal keeps announcements off, and switching them on there
would change its header and, with a home page count, its home page for
every other suite. Each scenario's accounts, seeding, the mail
catcher's address and how the site's background jobs are run are in its
footnote.

1. **Switch announcements on**

   Given: Journal Manager, on a scratch journal with announcements off,
   with a throwaway Section Editor, Author and Reader.

   - **The public side while off**: in a second browser, signed out, open
     the journal's Announcements page by its address: it reads "404 Not
     Found"; the home page's header carries no "Announcements" item (Rule
     2).
   - **The side menu while off**: signed in as the Journal Manager, the
     editorial side menu has no "Announcements" entry (Rule 2).
   - **The tab**: open Settings › Website › Setup › Announcements: the box
     "Enable announcements" is unticked under the sentence "Announcements
     may be published to inform readers of journal news and events.
     Published announcements will appear on the Announcements page." ("…of
     news and events." on a press, "…of server news and events." on a
     preprint server) and no other field shows; tick it: "Introduction"
     ("Additional Information" on a press, [OMP1](#omp1)) and "Display on
     Homepage" appear under it (Fields).
   - **A refused count**: type "abc" in "Display on Homepage" and press
     "Save": "This is not a valid integer." sits under the box, the tab
     reads "Please correct one error." with a "Jump to next error" link,
     and "Save" is grayed out; replace the value with "-1": "Save" is live
     again and, pressed, is refused with "This must be at least 0."
     (Fields).
   - **Saved**: type "News from the editors." in "Introduction" and "2" in
     "Display on Homepage" and press "Save": the side menu gains an
     "Announcements" entry with its own icon between "DOIs" and
     "Settings", with no reload; reload the page: the entry sits above
     "DOIs" (Rules 2, 3).
   - **The public side on**: signed out, the home page's header now
     carries "Announcements" (after "Archives" on a journal, after
     "Catalog" on a press, first on a preprint server); press it: the
     Announcements page opens with the breadcrumb "Home" › "Announcements",
     the heading "Announcements" and "News from the editors." under it,
     then nothing: no announcement and no sentence saying so
     ([A10](#a10)); the home page carries no block headed "Announcements"
     (Rules 2, 9, 11, 12).
   - **The "Edit" link**: as the Journal Manager, open the public
     Announcements page: an "Edit" link sits under the heading (read to a
     screen reader as "Edit" followed by "Edit Announcements"; by "Open a
     new page to edit this information" on a press); press it: the
     journal's Announcements page opens on its "Announcements" tab, headed
     "Announcements" with the tabs "Announcements" and "Announcement
     Types", the list reading "No items found." (Actors row 5; Rules 3,
     4).
   - **Control**: the Section Editor, the Author and the Reader each sign
     in and open the Website settings and the Announcements page at the
     addresses the Journal Manager used: each gets the access-denied page
     both times, and none has "Announcements" in their side menu (Actors
     rows 1–2). <sup>s1</sup>

2. **Add, edit and delete an announcement**

   Given: Journal Manager, on a scratch journal with announcements on and
   "Display on Homepage" at 2, with no announcements and no announcement
   types.

   - **The empty list**: press "Announcements" in the side menu: the
     "Announcements" tab reads "No items found." with a "Search" box and
     "Add Announcement" above it (Rules 3, 4).
   - **An empty save**: press "Add Announcement": the "Add Announcement"
     panel opens with "Title", "Short Description" under "A brief
     description to appear along with the announcement title.",
     "Announcement" under "The full text of the announcement.", the
     upload box "Image", "Expiry Date" under "The announcement will be
     displayed to readers until this date. Leave blank if the
     announcement should be displayed indefinitely.", the box "Send an
     email about this to all registered users." unticked, and no
     "Announcement Type"; press "Save": the panel stays open, "Please
     correct one error." appears under the fields above "Save" with "Go
     to Title: This field is required." and "Jump to next error", "This
     field is required." sits under "Title", and "Save" is grayed out
     (Fields; Rule 13).
   - **A refused date and a refused file**: type "Call for papers" in
     "Title" and "tomorrow" in "Expiry Date" and press "Save": "The date
     format is not valid. Enter each date in the format YYYY-MM-DD." sits
     under "Expiry Date" with "Please correct one error."; clear "Expiry
     Date"; drop a text file (notes.txt) in "Image": "notes.txt" is listed
     in the box with "You can't upload files of this type." under its name
     and a "REMOVE FILE" link, "Please correct one error." shows, and
     "Save" and "Upload File" are grayed out; press "REMOVE FILE": the file
     is gone from the box and "Save" is live (Fields).
   - **The first announcement, with a picture**: type "Deadline 1 June."
     in "Short Description" and "Submissions are open until 1 June." in
     "Announcement", drop a PNG picture (photo.png) in "Image": a preview
     appears with an "Alternate text" box; type "Journal logo" in
     "Alternate text", leave the email box unticked and press "Save": the
     panel closes and "Call for papers" is the list's only row, showing
     its title and the buttons "View", "Edit" and "Delete" alone (Rule
     5).
   - **The public pages, signed out**: the Announcements page lists "Call
     for papers" as a summary: the picture described "Journal logo", the
     title as a link, today's date as its posted date, "Deadline 1 June."
     and a "Read More" link (read to a screen reader as "Read more about
     Call for papers"); the home page carries a block headed
     "Announcements" with the same summary, and its skip links "Skip to
     announcements"; press "Read More": the announcement's page shows the
     breadcrumb "Home" › "Announcements" › "Call for papers", the heading
     "Call for papers", the posted date, the picture above the text and
     "Submissions are open until 1 June.", the browser title "Call for
     papers" followed by the journal's name, and no other control (Rules
     5, 9, 10, 11).
   - **"View"**: press "View" on the row: the announcement's page opens in
     the same window (Rule 4).
   - **The second announcement, short description only**: press "Add
     Announcement", type "Workshop" in "Title" and "Registration open." in
     "Short Description", leave "Announcement" empty, type tomorrow's
     date as YYYY-MM-DD in "Expiry Date" and press "Save": "Workshop" is
     now the first row, above "Call for papers"; signed out, the
     Announcements page lists "Workshop" first, its page shows
     "Registration open." as its text, and the home page block shows
     "Workshop" as a full summary with "Call for papers" under it as a
     title link with its posted date (Rules 4, 5, 10, 11).
   - **Edit**: press "Edit" on "Workshop": the "Edit Announcement" panel
     opens with the row's values filled in and tomorrow's date printed in
     "Expiry Date"; change "Title" to "Workshop 2027" and press "Save":
     the panel closes and the row reads "Workshop 2027" in place, still
     first; signed out, the Announcements page lists "Workshop 2027" first
     (Rule 6).
   - **Expired**: press "Edit" on "Workshop 2027", type today's date as
     YYYY-MM-DD in "Expiry Date" and press "Save": the row stays in the
     list; signed out, the Announcements page lists "Call for papers"
     alone, the home page block shows "Call for papers" alone as a full
     summary, and the address of the page of "Workshop 2027" opens the
     Announcements page instead with no message, as does the same address
     with 999999 in place of the announcement's number; press "View" on
     "Workshop 2027": the Announcements page opens (Rules 4, 8, 10, 11).
   - **Back from expiry**: press "Edit" on "Workshop 2027", clear "Expiry
     Date" and press "Save": signed out, "Workshop 2027" is listed first
     again (Rule 8).
   - **The picture removed**: press "Edit" on "Call for papers": the
     picture is previewed with "Alternate text" reading "Journal logo",
     "Remove" and the upload box, and no "Restore Original"; press
     "Remove": the preview is gone and "Restore Original" is offered;
     press it: the preview and "Journal logo" are back; press "Remove"
     again, then "Save": signed out, the announcement's page and its
     summaries are text-only, with no picture (Fields "Image"; Rule 15).
   - **Delete**: press "Delete" on "Workshop 2027": the "Delete
     Announcement" dialog asks "Are you sure you want to permanently
     delete the announcement Workshop 2027?" with "Yes" and "No"; press
     "No": the dialog closes and the row is still there; press "Delete"
     again, then "Yes": the row is gone, the address of its page opens the
     Announcements page, and, signed out, the Announcements page lists
     "Call for papers" alone (Rule 7).
   - **Control**: signed out, the seeded journal's Announcements page on
     the same install still reads "404 Not Found": nothing of the scratch
     journal's reaches it (Rules 1, 2). <sup>s2</sup>

3. **Search the list; add, edit and remove announcement types**

   Given: Journal Manager, on a scratch journal with announcements on and
   "Display on Homepage" at 2, with three announcements, "Call for papers"
   (short description "Deadline 1 June."), "Workshop" (short description
   "Registration open.") and "Reading group" (announcement text "Meets
   monthly."), and no announcement types.

   - **"Search"**: on the Announcements page's "Announcements" tab type
     "call" in "Search" and press Enter: the list shows "Call for papers"
     alone; replace it with "june" and press Enter: "Call for papers"
     alone again, found by its short description; replace it with "june
     call" and press Enter: "No items found.", one word being in the title
     and the other in the short description; clear the box and press
     Enter: all three rows are back (Rule 4).
   - **The empty types table**: open the "Announcement Types" tab: the
     table headed "Announcement Types", with its "Name" column, reads "No
     announcement types have been created.", with "Add Announcement Type"
     above it (Rule 13).
   - **A refused name**: press "Add Announcement Type": the window "Add
     Announcement Type" opens with "Name", "Save" and "Cancel"; press
     "Save" with "Name" empty: "This field is required." sits under "Name"
     and the window stays open (Fields).
   - **Two types added**: type "Conference" in "Name" and press "Save":
     "Announcement type added." shows at the top right of the screen and
     "Conference" is a row of the table; add "Event" the same way (Rule
     13).
   - **A type edited**: press the arrow on the "Conference" row, then
     "Edit": the same window opens; change "Name" to "Conference 2027" and
     press "Save": "Announcement type edited." shows, but the row still
     reads "Conference" ([A13](#a13)); reload the page: the row reads
     "Conference 2027" (Rule 13).
   - **A typed announcement**: on the "Announcements" tab press "Edit" on
     "Workshop": the panel now offers "Announcement Type" as round buttons
     "Conference 2027" and "Event", none chosen; choose "Event" and press
     "Save"; press "Edit" on "Workshop" again: "Event" is chosen and the
     buttons offer no way back to none ([A6](#a6)); signed out, the
     Announcements page, the page of "Workshop" and the home page block
     print "Event" nowhere ([A5](#a5)) (Fields "Announcement Type"; Rule
     13).
   - **A type removed with its announcement**: on the "Announcement Types"
     tab press the arrow on "Event", then "Remove": the dialog asks "Are
     you sure you wish to delete this item? This action cannot be undone."
     with "OK" and "Cancel"; press "OK": "Announcement type removed."
     shows and the row is gone; signed out, "Workshop" is gone from the
     Announcements page and the home page block and the address of its
     page opens the Announcements page instead, though the dialog said
     nothing of it ([A1](#a1)); the "Announcements" tab still lists
     "Workshop" until the page is reloaded, then two rows remain (Rule 13;
     Side effects).
   - **Control**: "Call for papers" and "Reading group", which have no
     type, are still listed and, signed out, still on the Announcements
     page after the removal (Rule 13). <sup>s3</sup>

4. **The email and who gets it**

   Given: Journal Manager, on a scratch journal with announcements on,
   with a throwaway Reader whose Notifications tab keeps its defaults, an
   Author whose "Enable these types of notifications." is unticked on the
   "A new announcement has been created." row ("New announcement." on a
   press) of that tab, and a Section Editor whose "Do not
   send me an email for these types of notifications." is ticked on that
   row.

   - **The row's defaults**: open Profile › Notifications as the Journal
     Manager: the row "A new announcement has been created." ("New
     announcement." on a press) has "Enable these types of notifications."
     ticked and "Do not send me an email for these types of
     notifications." unticked (Settings).
   - **An announcement without the email**: on the Announcements page
     press "Add Announcement", type "Board meeting" in "Title" and "Agenda
     to follow." in "Short Description", leave "Send an email about this
     to all registered users." unticked and press "Save": "Board meeting"
     is the first row (Rule 5; Fields "Send Email").
   - **An announcement with the email**: press "Add Announcement", type
     "Call for papers" in "Title" and "Deadline 1 June." in "Short
     Description", tick the email box and press "Save": "Call for papers"
     is the first row; signed out, it is already on the Announcements
     page, while nothing has reached the mail catcher: the email waits
     for the site's background jobs (Rule 17; Side effects).
   - **The email**: run the site's background jobs: the mail catcher holds one
     "New Announcement" email for the Journal Manager, who posted it, and
     one for the Reader: the subject "Call for papers", the From line
     naming the Journal Manager, the body "Call for papers" in bold,
     "Deadline 1 June.", then "Visit our website to read the full
     announcement." with "full announcement" a link, and the Unsubscribe
     footer; press "full announcement": the announcement's page opens,
     headed "Call for papers" (Side effects; Rule 10).
   - **Who gets nothing**: the mail catcher holds no email for the Author
     or the Section Editor, and none titled "Board meeting" for anyone
     (Side effects).
   - **Nothing else**: the Journal Manager's Tasks panel reads "No Items"
     (Side effects).
   - **Control**: a Reader of the seeded journal, who holds no role in the
     scratch journal, gets no email either, read after the Reader's
     arrived (Actors row 6; Rule 1). <sup>s4</sup>

5. **Announcements in a second language**

   Given: Journal Manager, on a scratch journal that offers its visitors
   French beside English and has French ticked under "Forms" on Settings
   › Website › Setup › Languages, with announcements on and "Display on
   Homepage" at 2, and one announcement "Call for papers" (short
   description "Deadline 1 June.") entered in English only.

   - **The two-language panel**: on the Announcements page press "Add
     Announcement" and press the language button at the top of the panel:
     it shows the boxes "Title in French", "Short Description in French"
     and "Announcement in French" (Fields; Rule 14).
   - **A French-only save refused**: type "Appel à contributions" in
     "Title in French", leave "Title" empty and press "Save": the panel
     stays open with "Please correct one error." and "This field is
     required." under "Title" (Fields "Title"; Rule 14).
   - **Saved in both languages**: type "Second call" in "Title" and "Date
     limite le 1er juin." in "Short Description in French" and press
     "Save": the panel closes and "Second call" is the first row (Rules
     5, 14).
   - **The list and the pages in French**: open the Announcements page
     with "/fr_CA" in place of "/en" in its address: the rows read "Appel
     à contributions" and "Call for papers", the second in its
     primary-language title because it has no French one; signed out, the
     public Announcements page and the home page block with "/fr_CA" in
     the address print "Appel à contributions" with "Date limite le 1er
     juin." and "Call for papers" with "Deadline 1 June." (Rule 14).
   - **An edit emptying the primary language**: with "/en" back in the
     address, press "Edit" on "Second call", clear "Title" and press
     "Save": the panel stays open with "You must complete this field in
     English." under "Title" (Fields "Title").
   - **A type in two languages**: on the "Announcement Types" tab press
     "Add Announcement Type": "Name" is offered in English and in French;
     type "Conférence" in the French one alone and press "Save": "This
     field is required." sits under "Name"; type "Conference" in the
     English one and press "Save": "Announcement type added." (Fields;
     Rule 13).
   - **Control**: signed out, the public Announcements page in English
     lists "Second call" and "Call for papers" with "Deadline 1 June."
     under the latter, its English text; what prints under "Second call",
     whose short description is French only, is open ([A17](#a17)) (Rule
     14). <sup>s5</sup>

6. **The site's announcements**

   Given: Site Administrator, on an install hosting the seeded journal
   and a scratch journal with announcements on and "Display on Homepage"
   empty, the site's announcements off.

   - **The site's pages while off**: signed out, the site's Announcements
     page (Rule 16 gives its address) reads "404 Not Found", and the
     site's home page has no block headed "Announcements" (Rules 2, 16).
   - **The site's tab**: open Administration › Site Settings ›
     Announcements: the side tabs "Settings", "Announcements" and
     "Announcement Types"; the last two read "You must enable
     announcements." with "enable announcements" a link to "Settings"
     (Rule 16).
   - **Switched on**: on "Settings" tick "Enable announcements", type
     "News from the site." in "Introduction" and "1" in "Display on
     Homepage" and press "Save": with no reload, the "Announcements" side
     tab shows the list panel, "No items found." with "Search" and "Add
     Announcement", and "Announcement Types" the table reading "No
     announcement types have been created." (Rule 16; Fields).
   - **A site announcement**: on "Announcements" press "Add
     Announcement", type "Site maintenance" in "Title" and "Sunday
     morning." in "Short Description", tick "Send an email about this to
     all registered users." and press "Save": "Site maintenance" is the
     list's only row; type "maintenance" in "Search" and press Enter: the
     row alone; press "Edit", change "Title" to "Site maintenance on
     Sunday" and press "Save": the row reads "Site maintenance on Sunday"
     (Rules 4–6, 16).
   - **The site's pages on**: signed out, the site's Announcements page
     shows the heading "Announcements", "News from the site." and the
     summary "Site maintenance on Sunday" with "Sunday morning." and "Read
     More"; the site's home page carries the block headed "Announcements"
     with that summary and the skip link "Skip to announcements"; "Read
     More" opens the announcement's page, headed "Site maintenance on
     Sunday"; the scratch journal's Announcements page and home page show
     none of it (on a press the home page carries the site's block,
     [OMP2](#omp2)) (Rules 1, 9–11, 16).
   - **No email**: run the site's background jobs: the mail catcher holds
     no email titled "Site maintenance" for the Site Administrator (Actors
     row 6; Rule 16).
   - **A site type**: on "Announcement Types" press "Add Announcement
     Type", type "Site news" in "Name" and press "Save": "Announcement
     type added." shows and "Site news" is a row of the table (Rule 16).
   - **Deleted and switched off**: on "Announcements" press "Delete" on
     "Site maintenance on Sunday", then "Yes": the row is gone; on
     "Settings" untick "Enable announcements" and press "Save": signed
     out, the site's Announcements page reads "404 Not Found" again and
     the site's home page has no block (Rules 2, 7, 16).
   - **Control**: "Journal notice", added on the scratch journal with the
     email box ticked before the jobs ran, mails the Site Administrator,
     who holds a role there: the positive control for the site
     announcement's silence (Actors row 6). <sup>s6</sup>

7. **The announcement feed** {OJS}

   Given: Journal Manager, on a scratch journal with announcements on,
   the "Announcement Feed Plugin" enabled and its block placed in the
   sidebar with no "Display feed links…" choice saved, with one
   announcement "Older notice" (announcement text "Posted first.") and one
   expired announcement "Old news".

   - **The newest by hand**: on the Announcements page press "Add
     Announcement", type "Newer notice" in "Title" and "Posted second." in
     "Announcement" and press "Save": "Newer notice" is the first row
     (Rule 5).
   - **The box**: signed out, the home page's sidebar carries a box headed
     "Announcements" with the links "Atom logo", "RSS2 logo" and "RSS1
     logo"; the Announcements page carries no box, no "Display feed
     links…" choice being saved ([A16](#a16)) (Rule 18).
   - **The feeds**: each link opens a feed titled "{journal name}:
     Announcements" listing "Older notice" and "Newer notice", in any
     order, each with its title, its posted date, its page's address and
     its "Announcement" text; "Old news" is in none; the RSS 2.0 feed's
     dates are readable, the Atom and RSS 1.0 feeds' are not
     ([A15](#a15)) (Rules 8, 18).
   - **Announcements switched off**: as the Journal Manager untick
     "Enable announcements" on Settings › Website › Setup › Announcements
     and press "Save": signed out, each feed's address now lands on the
     journal's home page (Rules 2, 18).
   - **Control**: on a second scratch journal with announcements on and
     the plugin at its default, disabled, the three feed addresses read
     "404 Not Found" and the "Sidebar" list on Settings › Website ›
     Appearance › Setup offers no "Announcement Feed Plugin" (Rule 18;
     Settings). <sup>s7</sup>

   A press and a preprint server install no announcement feed plugin:
   Settings › Website › Plugins › Installed Plugins › Generic lists no
   "Announcement Feed Plugin" there, so the scenario has no analogue on
   OMP or OPS beyond that absence (Rule 18).

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - an unsaved tick on the settings tab kept across a tab switch and
    lost on leaving the page (Fields)
  - a type window left with an unsaved name blocking the page's tabs
    and dropped by address (Fields)
  - a list longer than thirty rows with page controls (Rule 4)
  - the "Display feed links…" choices and the "OK" / "Cancel" window
    {OJS} (Fields; Rule 18)
  - a saved image replaced by a new upload (Rule 15): scenario 2 removes
    one
  - another journal's announcement address landing on the Announcements
    page (Rule 10): scenario 2 opens an expired and an unknown one
  - a file over the server's upload limit refused in the "Image" box
    (Fields): scenario 2 meets the same box's refusal with a text file
  - "Add Announcement" closed, or left by address, with a title typed
    and a picture inserted, and opening empty again (Rule 5)
  - Editor and Production Editor on the settings tab and the
    Announcements page {OJS OMP} (Actors rows 1–2): the same tab, page
    and panel scenarios 1 and 2's Journal Manager uses
  - the Site Administrator working in the journal (Actors rows 1–2): the
    same tab, page and panel
  - Assistant and Reviewer refused the settings and the page (Actors
    rows 1–2): the same access-denied page scenario 1's Section Editor,
    Author and Reader get
  - the two queued jobs behind the notification and the email (Side
    effects): no screen shows the jobs; scenario 4 reads what it
    delivers
  - nothing written to any log (Side effects): no screen shows one;
    scenario 4 reads the Tasks panel
- **Register carries it**:
  - A8 (the Announcements page reached by address, accepting
    announcements and sending the email while "Enable announcements" is
    unticked; Rule 2)
  - A14 (the English sentence in the email of a French-primary press or
    preprint server; Rule 14)
  - A13 (an edited type's old name shown until a reload; Rule 13;
    scenario 3 marks it)
  - A12 (the image file left in the public files after a delete, a
    refused edit or a replacement of another type; Rules 7, 15)
  - A11 (an unsaved title left on the row after "Edit Announcement" is
    closed; Rule 6)
  - A2 (an image refused on "Save" deleting the announcement on an edit;
    Fields "Image")
  - A9 ("Send an email about this to all registered users." ticked on an
    edit; Fields "Send Email")
  - A3 ("Date (Short)" set to another format; Settings)
  - A7 ("Limit feed to" set {OJS}; Rule 18)
  - A15 and A16 (the Atom and RSS 1.0 feeds' dates, the browser's feed
    links with no choice saved {OJS}; Rule 18; scenario 7 marks them)
  - A5 and A6 (a type printed nowhere; a chosen type that cannot be
    cleared; Fields "Announcement Type"; scenario 3 marks them)
  - A10 (the empty Announcements page with no sentence; Rule 9;
    scenario 1 marks it)
  - A17 (a short description entered in French alone printed on the
    English page; Rule 14; scenario 5 marks it)
  - OMP2 (a press's home page carrying the site's announcements while
    the press has no "Display on Homepage" count; Rule 11; scenario 6
    marks it)
- **No seed**:
  - an Editor whose role has "Permit changes to Settings" unticked
    reaching the Announcements page and refused the settings {OJS OMP}
    (Rule 3; Settings): the Roles form has no seed key
  - a Site Administrator with no role in the journal not told of a new
    announcement (Actors row 6): the test install's administrator holds
    a role in every journal
  - a site with one journal and no site "Announcements" tab (Rule 16):
    the install stops being one once its first scratch journal exists
- **Owned by another feature**:
  - a person registered with "Yes, I would like to be notified of new
    publications and announcements." unticked getting the notification
    and no email (Settings; *Registration & account validation*)
  - the Journal Manager refused the Site Settings (Actors row 3; *Site
    settings*)
  - the "Announcements" item removed from the navigation menu (Rule 12;
    *Navigation menus & site chrome*)
  - a deleted journal's announcements, images and types going with it
    (Side effects; *Hosted journals*)
  - the picture button of "Short Description" and "Announcement": its
    window, the files it takes and refuses, and the stored picture
    (Fields; Rule 5; *[Custom pages & blocks](U09-custom-pages-and-blocks.md)*
    scenario 5)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-17), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | Removing an announcement type deletes every announcement of that type after a dialog that only asks about "this item" | 🐞 | user-visible | — |
| [A2](#a2) | An image refused on "Save" (a ".jpeg" name, an upper-case extension) deletes the announcement being edited | 🐞 | user-visible | — |
| [A3](#a3) | "Edit Announcement" prints the expiry date in the journal's short date format, which the save refuses unless that format is YYYY-MM-DD | 🐞 | user-visible | — |
| [A7](#a7) | "Limit feed to {n} most recent announcements." keeps the first {n} the unlimited feed lists, not the most recent {OJS} | 🐞 | minor | — |
| [A9](#a9) | "Send an email about this to all registered users." is offered on "Edit Announcement" and does nothing there | 🐞 | minor | — |
| [A11](#a11) | "Edit Announcement" closed without saving leaves the unsaved title on the row until a reload | 🐞 | minor | — |
| [A12](#a12) | A deleted announcement's image file, and the file a refused or replaced image had, stay in the public files | 🐞 | minor | — |
| [A13](#a13) | An edited announcement type keeps its old name in the table until a reload; the row's refresh fails with a server error | 🐞 | user-visible | — |
| [A14](#a14) | The announcement email's "Visit our website…" sentence stays English on a French press or preprint server {OMP OPS} | 🐞 | minor | — |
| [A15](#a15) | The Atom and RSS 1.0 feeds carry unreadable dates ("%2026-%09-%17UTC%UTC%259") {OJS} | 🐞 | minor | — |
| [OMP2](#omp2) | A press with "Display on Homepage" empty shows the site's announcements on its home page while the site's are on with a count {OMP} | 🐞 | user-visible | — |
| [A5](#a5) | An announcement's type is printed nowhere a reader looks | ❓ | minor | — |
| [A6](#a6) | A chosen "Announcement Type" cannot be cleared, only changed | ❓ | minor | — |
| [A8](#a8) | The Announcements page opens, accepts announcements and sends the email while "Enable announcements" is unticked | ❓ | minor | — |
| [A10](#a10) | The public Announcements page with nothing to list shows the heading alone, no "No announcements have been published." | ❓ | minor | — |
| [A16](#a16) | With no "Display feed links…" choice saved, the browser is told about the feeds on every page while the box shows on the home page alone {OJS} | ❓ | minor | — |
| [A17](#a17) | A short description entered in French alone printed under its English title on the English Announcements page, seen once | ❓ | minor | — |
| [OMP1](#omp1) | The settings tab labels the introduction "Additional Information" on a press, "Introduction" elsewhere | ✅ | minor | — |
| [A4](#a4) | The site's Announcements panel cannot save, edit, delete or search | ✅ | retired | claim check (claude), 2026-09-17 — did not reproduce on any app |

### All apps

<a id="a1"></a>
**A1 — Removing a type deletes its announcements unwarned** · 🐞 · user-visible.
A manager who presses "Remove" on an announcement type reads "Are you
sure you wish to delete this item? This action cannot be undone." and
expects the type alone to go. "OK" also deletes every announcement of
that type, from the list and the public site, and the only message is
"Announcement type removed."; the "Announcements" tab's list still shows
the deleted announcements until the page is reloaded. The application
carries the warning "Warning! All announcements with this announcement
type will also be deleted…" but never shows it. Basis: probe.
<sup>f-a1</sup>

<a id="a2"></a>
**A2 — A refused image deletes the announcement on an edit** · 🐞 · user-visible.
A manager who edits an announcement and drops a JPEG named "photo.jpeg",
or any image whose file name ends in an upper-case extension, sees the
preview, presses "Save" and gets "There was an error uploading this
image." under "Image", as expected for a refused file. But the
announcement itself is deleted by that refusal: its row stays in the
panel until the page is reloaded, then it is gone, with its public page;
its earlier image file stays in the journal's public files
([A12](#a12)). On "Add Announcement" the same refusal only stops the
save. Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The expiry date is printed in a format the save refuses** · 🐞 · user-visible.
On a journal whose "Date (Short)" is anything but YYYY-MM-DD, "Edit
Announcement" prints a saved expiry date in that format, and "Save",
even with nothing changed, is refused with "The date format is not
valid. Enter each date in the format YYYY-MM-DD." until the manager
retypes the date. On a fresh journal the two formats agree and nothing
shows. Basis: probe. <sup>f-a3</sup>

<a id="a5"></a>
**A5 — A type is printed nowhere** · ❓ · minor.
A manager who creates announcement types and assigns them expects readers
to see them: a label on the summary, a grouping, a filter. The type is
kept, but no public page, no list, no email and, on a journal, no feed
prints it. Question: what is a type for? Lean: either print it before
the title on the summaries and the page, or drop the "Announcement Types"
tab. Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A chosen type cannot be cleared** · ❓ · minor.
"Announcement Type" is a set of round buttons with no "None": a new
announcement starts with none chosen, and once one is chosen and saved
the panel offers no way back to none, only another type. Question: should
the field offer "None"? Lean: yes; a type is optional on the way in and
should be on the way out. Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — "Limit feed to" does not keep the most recent** {OJS} · 🐞 · minor.
A manager who sets "Limit feed to 2 most recent announcements." expects
the feeds to carry the two newest. They carry the first two they list
without the limit, usually the two added first, and the RSS 2.0 feed's
channel date is the first one's. Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The Announcements page works while announcements are off** · ❓ · minor.
With "Enable announcements" unticked the side menu hides "Announcements",
but the page's address still opens the page, lists, adds, edits and
deletes, and sends the email if asked, while readers can reach none of
it: the reader's inbox holds the announcement's title with "Visit our
website to read the full announcement." while every announcement address
answers "404 Not Found" to that reader. Question: is the page meant to
work as a drafting space while the switch is off? Lean: yes, keep it;
the menu entry is the guide and the switch governs the public side only,
but the email box should be refused while the box is off. Basis: probe.
<sup>f-a8</sup>

<a id="a9"></a>
**A9 — The email box on an edit does nothing** · 🐞 · minor.
"Edit Announcement" offers "Send an email about this to all registered
users." exactly as "Add Announcement" does; ticking it and saving sends
nothing and records nothing. The manager cannot tell from the screen.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — An empty Announcements page says nothing** · ❓ · minor.
A visitor who opens the Announcements page of a journal with no unexpired
announcement sees the heading "Announcements" and the introduction, then
nothing: no "No announcements have been published.", although the
application carries that sentence. Question: should the empty page say
so? Lean: yes; an empty page reads as broken. Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — An unsaved title stays on the row after the panel is closed** · 🐞 · minor.
A manager who changes "Title" on "Edit Announcement" and closes the panel
by its close control, by Escape or by a click outside it expects the row
to keep the saved title. The row shows the new, unsaved title until the
page is reloaded; the announcement itself is unchanged. The same as
*[Highlights](U11-highlights.md#a4)* A4. Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A deleted announcement's image file is left behind** · 🐞 · minor.
A manager who deletes an announcement expects its image to go with it.
"Delete Announcement" › "Yes", the refused image of [A2](#a2) and a new
image of another type all leave the earlier file in the journal's public
files; only "Remove" then "Save" deletes a file. No screen shows it; the
folder grows. Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — An edited type keeps its old name until a reload** · 🐞 · user-visible.
A manager who edits an announcement type reads "Announcement type
edited." and expects the table to show the new name. The table still
shows the old name, on the journal's tab and the site's alike; the new
name appears on the next load of the page. The browser's own traffic
shows the table's row refresh failing with a server error after every
edit. Basis: probe. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — One sentence of the email stays English on a French press or server** {OMP OPS} · 🐞 · minor.
A user of a press or a preprint server whose primary language is French
gets the announcement email with the French title as its subject and "Se
désabonner … des courriels envoyés par …" as its footer, but "Visit our
website to read the full announcement." in English between them; a
journal sends the whole mail in French. Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — The Atom and RSS 1.0 feeds carry unreadable dates** {OJS} · 🐞 · minor.
A visitor who subscribes to the Atom or RSS 1.0 feed gets entries whose
date reads "%2026-%09-%17UTC%UTC%259" (Atom, the feed's own stamp and
every entry alike) or "%2026-%09-%17" (RSS 1.0); a strict feed reader may
refuse the whole feed. The RSS 2.0 feed's dates are well formed. Basis:
probe. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — The browser's feed links do not follow the box until a choice is saved** {OJS} · ❓ · minor.
On a journal where no "Display feed links…" choice has been saved, the
sidebar box shows on the home page alone, but the hidden feed links a
browser's feed reader looks for (its "subscribe" button) sit on every
page, About included; once a choice is saved the two agree.
Question: should the browser links follow the box in the default state
too? Lean: yes; a visitor's feed reader offers a subscription on pages
that show no box. Basis: probe. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — A French-only short description printed on the English page** · ❓ · minor.
A visitor reading the English Announcements page expects each text in
English, or in the journal's primary language when the announcement has
no English one (Rule 14). Once, on a journal whose primary language is
English, an announcement with an English title and a short description
entered in French alone printed that French short description under its
English title. Seen once, on a journal; not seen again, and not looked
for on a press or a preprint server. Question: when a text is empty in
the page's language and in the primary language, should the page print
it in whichever language holds one, or leave it out? Lean: intended; the
page falls back to whichever language holds a text rather than leaving a
gap, and a second look on any app would confirm it. Basis: test run.
<sup>f-a17</sup>

### OMP

<a id="omp1"></a>
**OMP1 — "Additional Information" for the introduction** · ✅ · minor.
The press's settings tab labels the introduction field "Additional
Information" with the help text "Enter any additional information that
should be displayed to readers on the Announcements page."; a journal and
a preprint server say "Introduction" and "Enter any information you would
like to appear on your announcements page.". The field and its effect are
the same. Basis: probe. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — A press's home page shows the site's announcements** · 🐞 · user-visible.
A visitor to a press whose announcements are on with "Display on
Homepage" empty expects its home page to carry no announcements block
(Rule 11). While the site's announcements are on with a count, the
press's home page carries the site's block headed "Announcements": the
site's newest announcement as a summary, its title and "Read More"
linking to an address under the press rather than the site's, and none
of the press's own announcements. A press with a count of its own shows
its own alone; a journal and a preprint server in the same state show no
block. Basis: test run. <sup>f-omp2</sup>

### Retired

<a id="a4"></a>
**A4 — The site's panel cannot save** · ✅ · retired. Did not reproduce: the site's Announcements panel adds, edits, deletes and searches on OJS, OMP and OPS, and the site's pages show the result (Rule 16); live-probed 2026-09-17. <sup>f-a4</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — one feature, shared code, two scopes.** The whole feature is lib/pkp
code with no app override: `PKP\pages\announcement\AnnouncementHandler`
(`index`, `view`), `PKP\API\v1\announcements\PKPAnnouncementController`
(mounted by each app's `api/v1/announcements/index.php`),
`PKP\announcement\Announcement` (an Eloquent model, `announcements` +
`announcement_settings`, `CREATED_AT = date_posted`, no `UPDATED_AT`),
`PKP\announcement\AnnouncementTypeDAO`, the forms
`PKPAnnouncementForm` and `PKPAnnouncementSettingsForm`, the
ui-library `AnnouncementsListPanel.vue` / `AnnouncementsEditModal.vue`,
and the templates under `lib/pkp/templates/frontend/{pages,objects,components}/announcement*`.
Scope is `assoc_type` (the app's context assoc type) plus `assoc_id`
(the context id, null for the site): `Announcement::scopeWithContextIds()`
keeps `assoc_id IN (…)` and, for `PKPApplication::SITE_CONTEXT_ID`,
`assoc_id IS NULL`; every list (`AnnouncementHandler::index()`,
`PKPIndexHandler::_setupAnnouncements()`, `getMany`) filters by the request's
context or the site. `PKPContextService::delete()` deletes the context's
announcement types (`deleteByContextId`) and announcements
(`Announcement::withContextIds([$id])->delete()`, which deletes each image).
Three checkouts compared byte-for-byte on these files at the 2026-09-17
tips: identical. Code read 2026-09-17.
Live-probed 2026-09-17 (Purpose; Rule 1; Side effects, the journal's
deletion), OJS, OMP and OPS: with 31 announcements on a scratch journal the
seeded journal's Announcements page read "No items found." and the site's
list was empty; a scratch journal removed under Administration › Hosted
Journals ("Are you sure you want to permanently delete {name} and all of its
contents?") took its two announcements, their settings, its type and its
image file with it (checked in the database and the public files) and its
pages answered 404 after, the other scratch journal's announcement
untouched.

<a id="fn-b"></a>
**b — who reaches which screen.** `ManagementHandler::authorize()` adds
`ContextAccessPolicy` for every op and `CanAccessSettingsPolicy` for the
`settings` op *except* when the requested args are `['announcements']` or
`['userComments']` (comment in the code: "moved out of settings without
changing their URL"); the handler's role assignment for `settings` is
`ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN`. So the Website settings need a
manager-level group with `permitSettings` (`registry/userGroups.xml`: the
manager, editor and productionEditor groups carry `permitSettings="true"` on
OJS and OMP; OPS installs the manager group alone), while
`management/settings/announcements` needs only the manager role level.
`settings.roles.permitSettings` "Permit changes to Settings" is the Roles
form's box. Sub-editors, assistants, authors, reviewers and readers have no
`settings` op: the shared `Handler` refusal, the access-denied page. Code
read 2026-09-17.
Live-probed 2026-09-17 (Actors rows 1–3; Rule 3; Settings bullet 5), OJS,
OMP and OPS, on a scratch journal with one throwaway account per permission
level: the manager, and on OJS and OMP the editor and production editor,
reach `management/settings/website` with the Setup side tab "Announcements";
the section editor, assistant (editorial board member on OPS), author,
reviewer and reader get the access-denied page at both
`management/settings/website` and `management/settings/announcements` (`user
/authorizationDenied?message=user.authorization.roleBasedAccessDenied`, "The
current role does not have access to this operation.", inside the public
site's frame) and their side menu has no "Announcements"; the manager gets
the same page at `index/admin/settings`. The Roles grid's "Permission level"
column reads "Journal Manager" / "Press Manager" / "Manager"; the manager
row has no "Edit" on any app; with "Permit changes to Settings" unticked on
the editor role (OJS, OMP) the editor's side menu lost "Settings", kept
"Announcements" and the page opened; re-ticked after. On OPS no manager-
level row can be edited, so the unticked state has no screen there.

<a id="fn-c"></a>
**c — the Announcements page and its list.**
`PKPTemplateManager::setupBackendPage()` adds `$menu['announcements']`
(label `announcement.announcements`, icon `Announcements`, url
`management/settings/announcements`) for users whose roles intersect
`[ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN]` and only when the context's
`enableAnnouncements` is set; it is added before `dois`, `institutions` and
the `settings` block. `ManagementHandler::announcements()` builds a
`PKPAnnouncementsListPanel` (id `announcements`, title
`manager.setup.announcements`, `count` 30, `getParams.contextIds`) with a
`PKPAnnouncementForm` and renders `templates/management/announcements.tpl`:
heading `manager.setup.announcements`, tabs `announcements`
(`manager.setup.announcements`) and `announcementTypes`
(`manager.announcementTypes`, the grid loaded by `load_url_in_div`). The
op checks nothing about `enableAnnouncements`. The panel:
`AnnouncementsListPanel.vue` with `Search`, `addAnnouncementLabel`
(`grid.action.addAnnouncement` "Add Announcement"), row buttons
`common.view` (an `<a>` to `item.url`, the public `announcement/view/{id}`),
`common.edit`, `common.delete`; `Pagination` when `lastPage > 1`;
`ListPanel` prints `common.noItemsFound` "No items found." for an empty
list; `formSuccess` re-fetches the list after a POST and replaces the item
after a PUT. Code read 2026-09-17.
Live-probed 2026-09-17 (Rules 2–7; Actors row 2; A8), OJS, OMP and OPS, on a
scratch journal: the side menu entry "Announcements" with its icon appears
the moment the settings tab's "Save" succeeds (between "DOIs" and
"Settings"; above "DOIs" after a reload) and goes the moment the box is
unticked and saved; with the box unticked
`management/settings/announcements` still opens with "Add Announcement",
lists, and accepts a new announcement, and "View" on a row answers the bare
"404 Not Found"; 30 rows fill a page and 31 add "Previous 1 2 Next";
"Search" filters on Enter alone (note n); "View" is a plain link opening the
public page in the same window, the expired one landing on the Announcements
page.

<a id="fn-d"></a>
**d — the site's tab.** `AdminHandler::settings()` builds the same
`PKPAnnouncementSettingsForm` on the site (`PUT site`), a
`PKPAnnouncementForm` on `index/api/v1/announcements` with the site's
`getSupportedLocaleNames()` as its locales, and
`getAnnouncementsListPanel()` over `withContextIds([SITE_CONTEXT_ID])`;
`templates/admin/settings.tpl` mounts them as the tab `announcements`
(`announcement.announcements`) with the side tabs `announcement-settings`
(`admin.settings` "Settings"), `announcement-items`
(`announcement.announcements`) and `announcement-types`
(`manager.announcementTypes`), the last two behind
`v-if="announcementsEnabled"` (a page-load state,
`(bool) $site->getData('enableAnnouncements')`, not updated by the form's
save) with the else text `manager.announcements.notEnabled` "You must
<a href="#announcements/announcement-settings">enable announcements</a>.".
The tab is shown while `siteSettingsAvailability()['announcements']`, that
is `app()->get('context')->getCount() !== 1`. `AnnouncementHandler::index()`
and `PKPIndexHandler::_setupAnnouncements()` read the site's
`enableAnnouncements`, `announcementsIntroduction` and
`numAnnouncementsHomepage` when the request has no context. Site
announcements never notify: `PKPAnnouncementController::add()` calls
`notifyUsers()` only `if ($context)` (the code's own comment: "There is no
way to determine users who have subscribed to site-level announcements").
Code read 2026-09-17.
Live-probed 2026-09-17 (Rule 16; Actors row 3; Settings bullet 4; A4), OJS,
OMP and OPS, as the Site Administrator with scratch journals present:
Administration › Site Settings › Announcements shows the side tabs
"Settings", "Announcements" and "Announcement Types"; the last two read "You
must enable announcements." with "enable announcements" linking to the
"Settings" side tab; a tick left unsaved changes nothing; after "Save" they
show the list panel and the types table without a reload; "Add Announcement"
› "Site news" › "Save" added the row, "Edit", "Search" and "Delete" worked,
and "Site type" was added, edited (the stale row of A13) and removed; with
an introduction and "Display on Homepage" 2, `index/announcement` printed
the introduction and both summaries, the site's home page carried the block
above the journals list with "Skip to announcements", and
`index/announcement/view/{id}` opened; the site's header carried "Register"
and "Login" alone; the scratch journal's pages showed none of it; a site
announcement added with the email box ticked mailed nobody; the site was
restored to off after (`index/announcement` 404 again). A one-journal site
has no reachable state on the test installs, which carry scratch journals;
its tab set is seed-facts'.

<a id="fn-e"></a>
**e — the public pages and the switch.** `AnnouncementHandler::index()` and
`view()` throw `NotFoundHttpException` unless the context's (or, with no
context, the site's) `enableAnnouncements` is true; the app renders that
as the bare "404 Not Found" page other specs record. `view()` also
redirects to `announcement` (the list) when the id is unknown, belongs to
another context or has a `dateExpire` before now. The header item is the
default primary menu's `NMI_TYPE_ANNOUNCEMENTS` item
(`registry/navigationMenus.xml`, title `manager.announcements`
"Announcements", third on OJS after Current and Archives, second on OMP
after Catalog, first on OPS), which
`PKPNavigationMenuService::getDisplayStatus()` shows only while
`enableAnnouncements` is set on the context, or on the site for a
site-level menu; its url is `announcement`. The Navigation settings print
`manager.navigationMenus.announcements.conditionalWarning` on it.
`frontend/pages/announcements.tpl` includes `editLink.tpl` (`if
in_array(ROLE_ID_MANAGER, $userRoles)`: the text `common.edit` "Edit" plus
the screen-reader `help.goToEditPage`, linking to
`management/settings/announcements#announcements`). Code read 2026-09-17.
Live-probed 2026-09-17 (Actors rows 4–5; Rules 2, 9, 10, 12), OJS, OMP and
OPS, on scratch journals: with the box unticked, signed out, `/announcement`
and `/announcement/view/{id}` answer HTTP 404 with the bare "404 Not Found"
page (no header, an empty browser title) and the home page's menu reads
"Current | Archives | About" / "Catalog | About" / "Archives | About";
ticked, the item "Announcements" sits third / second / first and lands on
the list; the "Edit" link under the heading (`a.cmp_edit_link`, its screen-
reader span "Edit Announcements" on OJS and OPS, "Open a new page to edit
this information" on OMP) shows for `admin`, the manager and, on OJS and
OMP, the editor, and lands on
`management/settings/announcements#announcements`; it is absent for the
section editor, assistant, reviewer, author and reader, and the
announcement's page and the home page carry none. An expired announcement's
id, an unknown id (999999) and another journal's id all answer 200 with the
Announcements page and no message.

<a id="fn-f"></a>
**f — who is told, and how.** `PKPAnnouncementController::add()` →
`notifyUsers()`: recipients are
`NotificationSubscriptionSettingsDAO::getSubscribedUserIds()` over the
context, i.e. every user with an active `user_user_groups` row in a group
of that context (start date passed, end date not reached; the site
administrator's site-level group has `context_id` null and does not count)
minus those with `blocked_notification` for
`NOTIFICATION_TYPE_NEW_ANNOUNCEMENT`; with `sendEmail` true the subset
without `blocked_emailed_notification` gets the email too. Jobs
`PKP\jobs\notifications\NewAnnouncementNotifyUsers` are batched
(`Bus::batch`), chunked by `Notification::NOTIFICATION_CHUNK_SIZE_LIMIT`
and `Mailer::BULK_EMAIL_SIZE_LIMIT`; on the fleets nothing runs until a
test drains the queue (seed-facts, `job_runner = Off`). Each job creates a
`NOTIFICATION_LEVEL_NORMAL` notification per recipient
(`AnnouncementNotificationManager::notify()`, contents the title) and,
when a sender was passed, sends `PKP\mail\mailables\AnnouncementNotify`
(template key `ANNOUNCEMENT`, name `mailable.announcementNotify.name` "New
Announcement", group Other) with `sender($poster)` (the `Sender` trait sets
From to the poster's email and full name), the recipient's locale forced to
`Locale::getPrimaryLocale()`, subject `emails.announcement.subject`
"{$announcementTitle}", body `emails.announcement.body` (the title in
`<b>`, `{$announcementSummary}` = the short description, "Visit our website
to read the <a href="{$announcementUrl}">full announcement</a>."), plus
`allowUnsubscribe($notification)` and the `Unsubscribe` footer. `edit()`
never calls `notifyUsers()`; the form still carries the `sendEmail`
`FieldOptions` (group label `common.sendEmail` "Send Email", box
`notification.sendNotificationConfirmation`). The Notifications tab's row
key is `notification.type.newAnnouncement` ("A new announcement has been
created." on OJS and OPS by their own locale files, "New announcement." on
OMP); U05 Rule 6 records "no task" for it. Code read 2026-09-17.
Live-probed 2026-09-17 (Actors row 6; Side effects; Settings bullet 8; A8,
A9), OJS, OMP and OPS, on a scratch journal with a throwaway manager,
section editor, author and reader plus two visitors registered by hand:
after "Call for papers" (short description "Deadline 1 June.") was added
with the email box ticked and `php lib/pkp/tools/jobs.php run` drained the
queue, the mail catcher held one mail each for the manager who posted it,
the reader, the registrant with the consent box ticked and `admin` (enrolled
as a manager by the seed), none for `reader.rosa` (no role in the journal),
none for the author whose "Enable these types of notifications." was
unticked, the section editor whose "Do not send me an email…" was ticked or
the registrant whose consent box was unticked; subject "Call for papers",
From "Mira Manager <…@mail.test>", body the title in bold, the short
description, "Visit our website to read the full announcement." linking
`announcement/view/{id}`, then "Unsubscribe from emails sent by {journal}.";
the ticked add queued two jobs, an unticked add one and an edit with the box
ticked none, every mailbox unchanged after the edit; no toast anywhere and
the manager's and author's Tasks panel "No Items" after the drain; a reader
has no editorial page to read. The Notifications row reads "New
announcement." on OMP; its boxes default ticked / unticked; a registration
with the consent box unticked ticks the email box; unticking "Enable…" grays
the email box out. The Site Administrator with no role in the journal has no
screen: every scratch journal enrols `admin` as a manager and a journal
manager cannot remove that role. Settings › Workflow › Emails lists "New
Announcement" with the subject `{$announcementTitle}` and the body above, no
footer in the template.

<a id="fn-g"></a>
**g — the feed (OJS).** `plugins/generic/announcementFeed/` (OJS only;
OMP and OPS ship `webFeed` but no announcement feed):
`AnnouncementFeedPlugin` (`settings.xml`: `enabled` true) registers, when
enabled, `AnnouncementFeedBlockPlugin` (`getHideManagement()` true, so it
is offered only as a sidebar block, display name
`plugins.generic.announcementfeed.displayName` "Announcement Feed Plugin")
and `AnnouncementFeedGatewayPlugin` (`gateway/plugin/AnnouncementFeedGatewayPlugin/{atom|rss|rss2}`),
and adds `<link rel="alternate">` headers per `displayPage`.
`AnnouncementFeedGatewayPlugin::fetch()` returns false (the gateway
handler's 404) with no context, with `enableAnnouncements` off, with the
plugin disabled or with an unknown type; otherwise
`Announcement::withContextIds([$journal])->withActiveByDate()`, no
`orderBy`, `limit($recentItems)` when the setting is above zero, rendered
by `atom.tpl` / `rss.tpl` / `rss2.tpl` (feed title "{journal}:
Announcements"; entry title `getLocalizedData('fullTitle')`, summary the
`description`). The block (`templates/block.tpl`: heading
`announcement.announcements`, three image links with alt
`plugins.generic.announcementfeed.{atom,rss2,rss1}.altText`) renders when
`displayPage == 'all'`, or `'homepage'` on the index and announcement
pages, or `$displayPage == $requestedPage`; with no setting saved
`$displayPage` is null, which PHP 8 equates to the empty requested page of
the home page and to nothing else. `AnnouncementFeedSettingsForm`:
`displayPage` radios (`plugins.generic.announcementfeed.settings.{all,homepage,announcement}`),
`recentItems` (`readInputData()` empties anything not a positive
integer). Code read 2026-09-17. Re-read 2026-09-26
(`AnnouncementFeedGatewayPlugin.php:133-138`): with no `orderBy` the
database hands the rows back in the order they sit in storage, usually
the order added, which an edit or a concurrent write can change; hence
Rule 18's "no fixed order". No feed has been seen out of that order.
Live-probed 2026-09-17 (Actors row 7; Fields, the feed window; Rules 2, 8,
13, 18; Settings bullets 9–10; A5, A7, A15, A16), OJS, with OMP and OPS as
the control: a scratch journal created with no plugin key lists
"Announcement Feed Plugin" unticked under Generic Plugins with no "Settings"
action, its three feed addresses answer "404 Not Found" and the Sidebar list
offers no feed block (the plugin's `settings.xml` is never installed: no
`getContextSpecificPluginSettingsFile()` override, no `plugin_settings` row
on `publicknowledge` either); ticked by hand ("The plugin "Announcement Feed
Plugin" has been enabled.") the row gains "Settings", the feeds answer and
the block appears; disabled again ("Disable — Are you sure you want to
disable this plugin?"), the 404 returns. On a journal seeded with the plugin
on and the block placed (`plugins` + `sidebar`, scenarios.md) the box
"Announcements" carries "Atom logo", "RSS2 logo", "RSS1 logo" linking
`gateway/plugin/AnnouncementFeedGatewayPlugin/{atom,rss2,rss}` (content
types `application/atom+xml`, `application/rss+xml`, `application/rdf+xml`);
each feed is titled "{journal}: Announcements" and listed the unexpired
announcements oldest first on that run, with the title, `announcement/view/{id}` and the
"Announcement" text; the typed announcement's entry title is the plain
title; the expired one is in none. Atom's `<updated>` and `<published>` read
"%2026-%09-%17UTC%UTC%259" and RSS 1.0's `<dc:date>` "%2026-%09-%17"; RSS
2.0's "Thu, 17 Sep 2026 10:28:01 +0000" is right. The window: "OK" (a
button) and "Cancel" (a link, discarding a chosen button and a typed
number); "abc", "0" and "-3" reopen empty, "2.5" reopens as "2.5"; "Limit
feed to 2" kept the two oldest of four and RSS 2.0's channel `pubDate` the
older's; cleared, all four came back. The box per choice as Rule 18; with
none saved the `<link rel="alternate">` discovery headers were on every
page, `/about` included, while the box was on the home page alone; with a
choice saved they followed the box. With announcements off and the plugin
on, a feed address answered 200 with the journal's home page after a
redirect; an unknown feed type the same. OMP and OPS: no "Announcement Feed
Plugin" row, no block in the Sidebar list, the feed addresses 404, only the
Web Feed plugin's discovery headers.

<a id="fn-h"></a>
**h — the panel's form.** `PKPAnnouncementForm`: `FieldText` `title`
(`common.title`, size large, multilingual), `FieldRichTextarea`
`descriptionShort` (`manager.announcements.form.descriptionShort` "Short
Description", description `…descriptionShortInstructions`, toolbar `bold
italic superscript subscript | link | blockquote bullist numlist | image |
code`, multilingual), `FieldRichTextarea` `description`
(`manager.announcements.form.description` "Announcement",
`…descriptionInstructions`, the same toolbar, size large, multilingual),
`FieldUploadImage` `image` (`manager.image` "Image"), `FieldText`
`dateExpire` (`manager.announcements.form.dateExpire` "Expiry Date",
`…dateExpireInstructions`, size small), `FieldOptions` `typeId` (radio,
label `manager.announcementTypes.typeName` "Announcement Type", only when
`AnnouncementTypeDAO::getByContextId()` returns a type), `FieldOptions`
`sendEmail`. Locales: `ManagementHandler::getSupportedFormLocales()` on a
journal, the site's supported locales on the site. Required props
(`schemas/announcement.json`): `assocType` and `title`;
`Repository::validate()` runs `ValidatorFactory::required()` with the
multilingual set, so the primary-locale title is what "This field is
required." / `form.requirePrimaryLocale` guard, as on the Highlights
panel. Errors: `form.errorOne` / `form.errorMany`, the `form.errorA10y`
"Go to {$fieldLabel}: {$errorMessage}" buttons; the submit button is
`common.save`. Code read 2026-09-17.
Live-probed 2026-09-17 (Fields, the panel; Rule 14; Settings bullet 6), OJS,
OMP and OPS: "Save" on the empty panel reads "Please correct one error."
with "Go to Title: This field is required." and "Jump to next error", "This
field is required." under "Title" and "Save" disabled; with a malformed
"Expiry Date" too, "Please correct 2 errors." with one "Go to …" button per
fault; the toolbar of "Short Description" and "Announcement" reads Bold,
Italic, Superscript, Subscript, Insert/edit link, Blockquote, Bullet list,
Numbered list, Insert/edit image, Source code; on a journal with French
under "Forms" (the `supportedFormLocales` passthrough) the panel shows
"French" and "English" at its top, the French boxes "Title in French",
"Short Description in French" and "Announcement in French" hidden until
"French" is pressed, a French-only title refused with "This field is
required." and a primary title emptied on an edit with "You must complete
this field in English."; the site's window offers "French" and "English",
the site's two languages.
Live-probed 2026-09-28 (Fields "Short Description", "Announcement"), OJS,
OMP and OPS, two runs each, as the manager and as `admin` working in a
scratch journal: the same toolbar in both boxes; "Insert/edit image"
opened "Insert/Edit Image" with the tabs "General" and "Upload"; a `.png`,
a `.webp` and an upper-case `.PNG` were inserted and, once saved, showed
on the public list (the short description's) and on the announcement's
page (the full text's); a `.bmp` and a `.jpeg` were refused with "You can
only upload the following types of files: gif, jpg, png, webp.", a text
file named `.png` with "The image you uploaded is not valid." and a PNG
named `.jpg` with the extension-mismatch message, each in a window with
"OK" and nothing inserted (`POST …/api/v1/_uploadPublicFile` 400); the
files were stored lower-cased under `public/site/images/{username}/`, a
name `admin` had already used with a 32-character suffix, and a pasted
picture as `mceclip0.png`; "Edit" read both boxes back with their pictures
after a reload. *Custom pages & blocks* Rule 29, 29b and 29c hold here as
stated there. The site's panel was not driven (switching the site's
announcements on is shared state); it builds the same form.

<a id="fn-i"></a>
**i — where the texts print.** `frontend/objects/announcement_summary.tpl`:
the image (`imageUrl`, `imageAltText`), the title as a link to
`announcement/view/{id}`, `datePosted` in `$dateFormatShort`,
`descriptionShort` through `strip_unsafe_html`, "Read More"
(`common.readMore`, screen reader `common.readMoreWithTitle` "Read more
about {$title}"). `announcement_full.tpl`: title, date, image,
`description` or, when empty, `descriptionShort`. `frontend/pages/announcement.tpl`
sets the page title to the localized `title`. The email's subject and body
are note f's. Code read 2026-09-17.
Live-probed 2026-09-17 (Fields "Title", "Short Description"; Rules 9, 10),
OJS, OMP and OPS: the title is the row's name, the summary's heading, the
page's heading and browser title ("{title} | {journal}") and the mail's
subject; the short description prints under the title on the Announcements
page, in the home block's first item and in the email, and on the
announcement's page only when "Announcement" is empty.

<a id="fn-j"></a>
**j — the image.** `FieldUploadImage` (`acceptedFiles: 'image/*'`,
`maxFilesize` = PHP's `upload_max_filesize`; the Dropzone default
messages print, as *Highlights* note g records) uploads to the
`temporaryFiles` API; on save `Announcement::save()` →
`handleImageUpload()` → `isValidImage()`: `getimagesize()` must succeed and
`FileManager::getImageExtension(mime)` (`.gif`, `.jpg`, `.png`, `.ico`…)
must equal `'.' . pathinfo(originalName, PATHINFO_EXTENSION)`, a
case-sensitive string compare, so `photo.jpeg` (`.jpg` ≠ `.jpeg`) and
`PHOTO.PNG` (`.png` ≠ `.PNG`) fail and throw `StoreTemporaryFileException`.
`PKPAnnouncementController::add()` then destroys the just-created row and
answers 400 `api.400.errorUploadingImage` under `image`; `edit()` catches
the same exception with `$announcement->delete()` (its own comment: "TODO
do we really need to delete an announcement if the image upload fails?")
before answering the 400. A stored image is `public/…/announcements/{id}.{ext}`
(`Announcement::IMAGE_SUBDIRECTORY`), replaced in place by a new upload
(`deleteImage()` then `handleImageUpload()`), removed with its settings row
when the field is emptied, and deleted by `delete()`. Code read
2026-09-17.
Live-probed 2026-09-17 (Fields "Image"; Rules 7, 15; A2, A12), OJS, OMP and
OPS: a `.txt` is listed in the box as "notes.txt REMOVE FILE" with "You
can't upload files of this type.", "Save" and "Upload File" disabled, and
"REMOVE FILE" clears it and re-enables both; `photo.gif`, `photo.jpg` and
`photo.png` save as `{id}.gif` / `.jpg` / `.png` under
`public/journals|presses|contexts/{contextId}/announcements/`; `photo.jpeg`
and `PHOTO.PNG` preview, then "Save" answers "There was an error uploading
this image." (an add adds nothing; an edit's row is gone after a reload and
its page lands on the Announcements page, the file left on disk); the saved
image prints on the page and in the summaries with its "Alternate text" (its
address is the file's absolute disk path on the test installs and never
loads, seed-facts, so a test asserts the `alt` and the file); "Remove" then
"Save" deletes the file and the pages are text-only; a GIF replacing a PNG
left both files, a PNG replacing the GIF overwrote `{id}.png`; "Delete
Announcement" › "Yes" left `{id}.gif` in the folder.
"Restore Original" is `FieldUploadImage`'s restore button, rendered only
while the field's value differs from the saved one
(`v-if="initialValue && !isInitialValue"`). Suite runs 2026-09-17 (Fields
"Image"; scenario 2), OJS, OMP and OPS: "Edit Announcement" on an
announcement with a saved picture opened with the preview ("Preview of the
currently selected image."), "Alternate text" holding the saved text,
"Remove", "Drop files here to upload" and "Upload File" and no "Restore
Original"; after "Remove" the preview was gone and "Restore Original"
showed; pressed, the preview and the alternate text were back; "Remove"
then "Save" left the pages text-only and the file deleted.

<a id="fn-k"></a>
**k — the expiry date.** The schema rule is `date_format:Y-m-d` with the
message `stats.dateRange.invalidDate`; the column `date_expire` is a
datetime, so "2026-09-17" is stored as midnight. `Announcement::scopeWithActiveByDate()`
keeps `date_expire > now() OR date_expire IS NULL` and
`AnnouncementHandler::view()` allows `now() <= dateExpire`: an announcement
is gone from the first second of its expiry date. No rule refuses a past
date. `AnnouncementsListPanel.vue::openEditModal()` prints `dateExpire`
through `formatShortDate()` (`dateUtils.js`), which reads
`pkp.context.dateFormatShort`, the context's localized short date format
(`PKPTemplateManager`: `$currentContext->getLocalizedDateFormatShort()`),
`Y-m-d` on a fresh install (`config.TEMPLATE.inc.php`
`date_format_short`); with another format under Settings › Website ›
Setup › Date & Time › "Date (Short)" the printed value fails
`date_format:Y-m-d` on save (A3). Code read 2026-09-17.
Live-probed 2026-09-17 (Fields "Expiry Date"; Rule 8; Settings bullet 7;
A3), OJS, OMP and OPS: "17/09/2026", "2026-9-7", "2026-13-01" and "tomorrow"
each refused with the date message; an announcement expiring today is absent
from the public list and the home block and its "View" lands on the
Announcements page, one expiring tomorrow is listed and its page opens; a
past date saves, is never public, and its mail still goes out; both expired
ones stay in the manager's list and clearing the date brings one back. With
"Date (Short)" set to `d-m-Y` every posted date prints "17-09-2026", "Edit
Announcement" prints "17-10-2026" and "Save" unchanged is refused with "The
date format is not valid. Enter each date in the format YYYY-MM-DD.";
retyped as YYYY-MM-DD it saves; at the default the printed "2026-09-16"
saves unchanged; restored to `Y-m-d` after.

<a id="fn-l"></a>
**l — types.** `AnnouncementTypeGridHandler` (roles manager and site
admin; `ContextAccessPolicy` or `PKPSiteAccessPolicy`): title
`manager.announcementTypes`, empty text `manager.announcementTypes.noneCreated`,
column `common.name`, action `addAnnouncementType` (`grid.action.addAnnouncementType`
"Add Announcement Type", an `AjaxModal` of that title) showing
`AnnouncementTypeForm` (`announcementTypeForm.tpl`: one multilingual
`name`, `maxlength` 255, `FormValidatorLocale` required with
`manager.announcementTypes.form.typeNameRequired`, buttons `common.save`
and the form's cancel); on success a trivial notification
`notification.addedAnnouncementType` / `…editedAnnouncementType`. Row
actions: `edit` (`AjaxModal` titled `grid.action.edit` "Edit") and
`remove` (`RemoteActionConfirmationModal` with `common.confirmDelete` and
the title `common.remove` "Remove"; buttons `common.ok` "OK" and
`common.cancel`), then `notification.removedAnnouncementType`.
`AnnouncementTypeDAO::deleteById()` runs
`Announcement::withTypeIds([$typeId])->delete()` before deleting the type
(A1; the unused warning is `manager.announcementTypes.confirmDelete`).
The `typeId` radio has no empty option; `edit()` sets `typeId` to null only
when the request omits it, which the panel never does once a value is set
(A6). No template prints the type: `announcement_summary.tpl`,
`announcement_full.tpl`, `announcements_list.tpl` and the mail use
`title`; `AnnouncementHandler::view()` assigns `announcementTitle` from
`fullTitle` but no template reads it; the OJS feed templates read
`fullTitle`, whose accessor concatenates the type's whole multilingual
`name` array with `': '` (an "Array to string conversion") (A5, note g's
question). Code read 2026-09-17.
Live-probed 2026-09-17 (Fields, the type windows; Rule 13; Side effects; A1,
A5, A6, A13), OJS, OMP and OPS: the empty table reads "No announcement types
have been created."; "Add Announcement Type" is a window with "Name" (the
French box under the English one on a two-language journal), "Save" and
"Cancel" (a link); an empty or French-only name is refused with "This field
is required." and nothing is sent; "Workshop" saved shows "Announcement type
added." at the top right; the row's arrow reveals "Edit" and "Remove";
"Workshop 2" saved shows "Announcement type edited." but the row reads
"Workshop" three seconds later and "Workshop 2" after a reload (the grid's
`announcement-type-grid/fetch-row?rowId={id}` answered 500 after every edit,
on the journal's tab and the site's); "Remove" asks the dialog's sentence
with "OK" and "Cancel"; "OK" shows "Announcement type removed." and the two
announcements of that type are gone from the public page, the home block and
their own pages, and from the list after a reload (four rows still shown
before one); the untyped announcement survived every removal; "Conference"
and "Event" printed nowhere public and not in the list rows; with types
present the panel offers them as round buttons, with none it has no
"Announcement Type" field; a saved type offers no way back to none (the PUT
carries the new `typeId`); a window left with an unsaved name blocks the
page's tabs and leaving by address drops it with no dialog.

<a id="fn-m"></a>
**m — the settings tab.** `PKPAnnouncementSettingsForm` (`PUT contexts/{id}`
on a journal, `PUT site` on the site): `FieldOptions` `enableAnnouncements`
(label `manager.setup.announcements`, description
`manager.setup.enableAnnouncements.description`, one box
`manager.setup.enableAnnouncements.enable`), `FieldRichTextarea`
`announcementsIntroduction` (`manager.setup.announcementsIntroduction`,
tooltip `….description`, multilingual, `showWhen: enableAnnouncements`),
`FieldText` `numAnnouncementsHomepage` (`manager.setup.numAnnouncementsHomepage`,
description `….description`, size small, `showWhen`). The labels come from
each app's `locale/en/manager.po`, which is why the press differs (OMP1)
and the description names "journal", nothing, or "server". Schema:
`enableAnnouncements` boolean nullable, no default (so unset on a fresh
context and on the site: seed-facts "Announcements are off on a scratch
context and on the site"); `numAnnouncementsHomepage` integer, `nullable`,
`min:0` (`validator.integer`, `validator.min.numeric`). `website.tpl`
mounts the form as the Setup side tab `announcements`
(`manager.setup.announcements`), before "Highlights". Code read
2026-09-17.
Live-probed 2026-09-17 (Fields, the settings tab; Rules 2–3; Settings
bullets 1–3; OMP1), OJS, OMP and OPS, on a scratch journal: before the tick
the tab shows the "Announcements" group alone with the box unticked and the
app's sentence; "Introduction" ("Additional Information" on OMP, its tooltip
per app) and "Display on Homepage" appear the moment the box is ticked;
"abc" and "2.5" are refused with "This is not a valid integer.", "-1" with
"This must be at least 0.", "0" and "2" saved with "Saved"; a refusal reads
"Please correct one error." with "Jump to next error" and "Save" grayed
until the value changes; "Save" with nothing changed reads "Saved"; an
unsaved tick survives a side-tab and a top-tab switch with no dialog and is
gone after the page is left; the side menu gains "Announcements" without a
reload (note c). `publicknowledge` has the box unticked on all three apps.

<a id="fn-n"></a>
**n — search and paging.** `Announcement::scopeWithSearchPhrase()` splits
the phrase on spaces and, for every word, requires a `LIKE %word%` match
(lower-cased, `%` and `_` escaped) on `title`, `descriptionShort` or
`description` in `announcement_settings`, so all words must match; on screen they must
sit in the same text, and the panel sends `searchPhrase` on Enter. `getMany`
caps `count` at `MAX_COUNT` 100 and the panel asks for 30. Code read
2026-09-17.
Live-probed 2026-09-17 (Rule 4), OJS, OMP and OPS: "call", "CALL", "june"
(in the short description) and "call papers" each found "Call for papers"
alone; "june deadline" (both words in the short description) found it; "june
call" and "call june" (one word in the title, one in the short description)
found nothing, "No items found."; no request was sent while typing, one on
Enter, and the cleared box restored the list on Enter alone (the box has no
clear control); 30 rows without page controls, 31 with "Previous 1 2 Next"
and the oldest on page 2.

<a id="fn-o"></a>
**o — posted date, immediacy, closing.** `date_posted` is the Eloquent
`CREATED_AT`, set on insert and never touched again (`UPDATED_AT` null);
every list orders by it descending. Nothing in the schema is a state:
`announcement.json` has `assocId`, `assocType`, `dateExpire`, `datePosted`,
`description`, `descriptionShort`, `id`, `image`, `title`, `typeId`, `url`
and `_href`. The side modal is `SideModalBody`, closed by its close button,
Escape or the backdrop as on the Highlights panel. Code read 2026-09-17.
Live-probed 2026-09-17 (Rules 5, 6, 17; A11), OJS, OMP and OPS: the new row
reads "{title} View Edit Delete" with no date, first in the list with no
navigation during the save; editing the oldest of three kept its row third
and its posted date on the public page; "Edit Announcement" closed by
"Close", by Escape on "Title" or by a click on the backdrop raised no dialog
and the reload showed the saved title, the row showing the unsaved one until
then; "Call for papers" was public to a signed-out visitor and to the reader
while its notification jobs still sat in the queue.
Live-probed 2026-09-28 (Rule 5, closing "Add Announcement"), OJS, OMP and
OPS, two runs each, on a scratch journal: with a title typed and a picture
inserted into "Short Description", "Close" shut the panel with no browser
or in-app dialog and the list unchanged, and "Add Announcement" reopened
empty; with a title typed again, leaving by another address
(`management/settings/website`, or a reload of the Announcements page)
raised no "Leave site?" question; the picture's file stayed under
`public/site/images/{username}/` (read in five of the six runs, the first
OJS run recording no file list). The one server error of the drive, the
Plugin Gallery's list on landing on Settings › Website, is
*[Plugins management](U62-plugins-management.md#a1)* A1, not this
feature's.

<a id="fn-p"></a>
**p — the Announcements page.** `AnnouncementHandler::index()` assigns
`announcementsIntroduction` (the context's or site's localized value,
printed raw by `frontend/pages/announcements.tpl` between the `<h1>` and
`frontend/components/announcements.tpl`, a `<ul class="cmp_announcements">`
of `announcement_summary.tpl` items) and `Announcement::withActiveByDate()->orderBy(date_posted desc)->withContextIds(...)`,
with a `TODO` that the list should paginate: it does not. The template has
no empty-state branch; `announcement.noneExist` "No announcements have
been published." exists in `common.po` and is unused (A10). Breadcrumbs:
`breadcrumbs.tpl` with `currentTitleKey="announcement.announcements"`;
`breadcrumbs_announcement.tpl` on the detail page adds the Announcements
link (`common.homepageNavigationLabel` "Home"). Code read 2026-09-17.
Live-probed 2026-09-17 (Rules 9, 10; A10), OJS, OMP and OPS: the breadcrumb
"Home / Announcements", the heading, the introduction as its own paragraph
between the heading and the list (after the "Edit" link when one shows), the
browser title "Announcements | {journal}"; the three live announcements
newest first (the by-hand add first; two seeded in the same second in
arbitrary order), each an image, an h2 title link, the date, the short
description and "Read More" read as "Read more about {title}"; the expired
one absent; with only an expired announcement the page printed the
breadcrumb, the heading and the introduction and nothing else; the
announcement's page read heading › date › image › text, the short
description as the text when "Announcement" was empty, its only links the
two crumbs.

<a id="fn-q"></a>
**q — the home page block.** `PKPIndexHandler::_setupAnnouncements()`
assigns `announcements` (`withActiveByDate()`, `limit(numAnnouncementsHomepage)`,
newest first, the context's or the site's) and `numAnnouncementsHomepage`
only when both `enableAnnouncements` and the number are truthy;
`frontend/objects/announcements_list.tpl` renders `<section
class="cmp_announcements">` with `<a id="homepageAnnouncements">`, the
heading `announcement.announcements`, the first item through
`announcement_summary.tpl` (heading level h3) and the rest as h4 title
links with the date, breaking after `numAnnouncements`. Included by OJS
`indexJournal.tpl` (after `homepage_about`, before the latest
publications), OMP `index.tpl` (after the about text, before the
additional content), OPS `indexServer.tpl` (before `archiveHeader.tpl`),
and each app's `indexSite.tpl` (before the journals list). `skipLinks.tpl`
adds `navigation.skip.announcements` "Skip to announcements" when
`$numAnnouncementsHomepage && $announcements|@count`. Code read
2026-09-17.
Live-probed 2026-09-17 (Rule 11; Settings bullet 3), OJS, OMP and OPS: at
"Display on Homepage" 2 with three live announcements the block
"Announcements" carried the newest as a full summary and the second as a
title link with its date, the third absent; at 5 all three; at 0 and empty
no block, no heading and no "Skip to announcements"; with a count but no
live announcement no block; on OPS the block sat above the archive header
and "Latest preprints"; on a fresh scratch journal and press only the
announcements block renders (no highlight, no homepage image, no summary
text), so the order against those three is the Highlights claim check's
home-page read of 2026-09-16 with all of them on; the site's home page
carried the block above the journals list with the skip link once the site's
box, a count of 1 and one site announcement were set (note d).

<a id="fn-r"></a>
**r — languages.** `getLocalizedData()` (`ModelWithSettings`) falls back
to the primary locale when the requested locale has no value; the panel's
locales are the context's form locales (note h); the job passes
`Locale::getPrimaryLocale()` to the mailable. On the fleets `publicknowledge`
and every scratch context have `en` alone under "Forms" unless the
`supportedFormLocales` passthrough lists `fr_CA` (scenarios.md). Code
read 2026-09-17.
Live-probed 2026-09-17 (Rule 14; A14), OJS, OMP and OPS, on a scratch
journal with French under "Forms": the manager's list under `/fr_CA/` read
"Appel à contributions" and "English only" under the heading "Annonces"; the
public list, page and home block under `/fr_CA/` printed the French title
and short text where they existed and the English ones otherwise, under
`/en/` the English ones. On a scratch journal, press and server whose
primary language is French, the manager working under `/en/`: the mail's
subject was the French title and its footer "Se désabonner … des courriels
envoyés par …" on the three apps; the body sentence was "Visiter notre site
Web pour consulter l'annonce complète" on OJS and "Visit our website to read
the full announcement." on OMP and OPS.

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** `POST scenarios/context` with no
announcement key (a fresh context has announcements off, seed-facts) and
`users[]` `manager`, `sectionEditor`, `author` and `reader` (passwords:
the username twice). The addresses: the Website settings
`management/settings/website` (the "Announcements" side tab under Setup),
the journal's Announcements page `management/settings/announcements`, the
public page `{path}/announcement` (note e), the access-denied page note
b's. Signed-out reads run in a second browser context. The side menu's
order is read from its entries (note c); the "Edit" link is
`a.cmp_edit_link` with its screen-reader span (note e).

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** `POST scenarios/context` with
`enableAnnouncements: true`, `numAnnouncementsHomepage: 2` and the
`manager`. The picture is
`apps/ojs/playwright/fixtures/files/profile-image-400.png` dropped as
`photo.png`, the refused file any `.txt` (the suites write `notes.txt`).
The picture never loads on the test installs (seed-facts), so the suite
asserts the summary's and the page's `<img>` with its alternate text and
the stored file `public/…/announcements/{id}.png` (note j), never the
rendered picture, and after "Remove" the file's absence. Today's and
tomorrow's dates are computed in the install's time zone (an expiry
today is gone from the first second of the day, note k). The unknown
address is `announcement/view/999999` (note e). The control reads the
seeded journal `publicknowledge`'s `announcement` page signed out
(announcements off there, seed-facts).

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** As s2 with `announcements[]` the three of
the given (`title`, `descriptionShort` or `description` as `<p>…</p>`);
seeded in one request they share a posted second, so the suite finds rows
by title and asserts no position (scenarios.md). The types are added
through the window. The stale row of [A13](#a13) is read from the table
after the notice (note l); the deleted announcement's page is
`announcement/view/{id}` from the seed's response.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** `POST scenarios/context` with
`enableAnnouncements: true` and `users[]` `manager`, `reader`, `author`
and `sectionEditor`; the Author's and the Section Editor's Notifications
rows are set through Profile › Notifications before the adds (the tab is
*Notifications center & email preferences*'; there is no seed key for
it). The queue is drained with `runJobs()`
(`shared/playwright/support/jobs.js`, `php lib/pkp/tools/jobs.php run`;
serial project only), after which the mail is read in the mail catcher
(Mailpit, `http://127.0.0.1:8025`) scoped by each throwaway's address
(`<username>@mail.test`) with the title as the content marker; the
absences are read with `expectNone` against the Reader's mail
(scenarios.md "Mailpit"). A job-sent email's links carry the install's
configured base address (seed-facts), so the suite opens the link's path
on its own origin. The Tasks panel is the header's. The control reads
`reader.rosa`'s inbox, the roster reader with no role in the scratch
journal (note f).

<a id="fn-s5"></a>
**s5 — scenario 5 seeding.** `POST scenarios/context` with
`context.supportedLocales: ['en', 'fr_CA']`,
`context.supportedFormLocales: ['en', 'fr_CA']` (scenarios.md "POST
scenarios/context"), `enableAnnouncements: true`,
`numAnnouncementsHomepage: 2`, `announcements[]` the English-only "Call
for papers" and the `manager`. The French pages are the `/fr_CA/`
addresses (note r); the type window's French box sits under the English
one (note l).

<a id="fn-s6"></a>
**s6 — scenario 6 seeding.** The scratch journal: `POST scenarios/context`
with `enableAnnouncements: true` and the `manager`; its presence beside
`publicknowledge` is what shows the site's tab (note d). The Site
Administrator is `admin`, enrolled as a manager in every scratch context
(seed-facts). The site's tab is `index/admin/settings#announcements`, the
site's Announcements page `index/announcement`, its home page `index/`,
the site announcement's page `index/announcement/view/{id}` (note d). The
site's settings are shared by every test on the install, so the scenario
leaves the box unticked in its last bullet and the suite runs it apart
from tests that read the site's home page. On OMP the suite reads the
scratch press's Announcements page alone, its home page carrying the
site's block (OMP2; PRINCIPLES M3). The site announcement's
silence is read at `admin`'s address against the control's journal
announcement, added through the scratch journal's panel with the box
ticked and drained as s4.

<a id="fn-s7"></a>
**s7 — scenario 7 seeding (OJS).** `POST scenarios/context` with
`enableAnnouncements: true`, `plugins: {announcementfeedplugin: {enabled:
true}}`, `sidebar: ['AnnouncementFeedBlockPlugin']` (no `settings`, so no
"Display feed links…" choice is saved), `announcements[]` "Older notice"
(`description` "Posted first.") and "Old news" (`dateExpire` `2020-01-01`)
and the `manager`; the newest is added by hand because seeded
announcements share a posted second (scenarios.md). The feed addresses
are `gateway/plugin/AnnouncementFeedGatewayPlugin/{atom,rss2,rss}` (note
g); the dates of [A15](#a15) are the `<updated>`, `<published>`,
`<dc:date>` and `<pubDate>` elements. The control's second scratch
journal is seeded with `enableAnnouncements: true` and no `plugins` key
(the plugin disabled by default, seed-facts). On OMP and OPS the absence
test reads Settings › Website › Plugins for no "Announcement Feed Plugin"
row, with the "Web Feed Plugin" row those apps ship as its positive
control, and the three feed addresses for "404 Not Found" (note g).

<a id="fn-f-a1"></a>
**f-a1 — A1 evidence.** `AnnouncementTypeGridRow::initialize()` builds the
`remove` action with `common.confirmDelete`; `AnnouncementTypeDAO::deleteById()`
deletes the announcements first. `manager.announcementTypes.confirmDelete`
("Warning! All announcements with this announcement type will also be
deleted…") is referenced by no template or handler at the 2026-09-17 tips.
Code read 2026-09-17. Live-probed 2026-09-17 (A1), OJS, OMP and OPS: the
dialog's text and buttons as the entry says, "Announcement type removed."
the only message, the two typed announcements gone from the public site at
once and from the list after a reload.

<a id="fn-f-a2"></a>
**f-a2 — A2 evidence.** `PKPAnnouncementController::edit()`'s catch block
calls `$announcement->delete()` before answering
`api.400.errorUploadingImage`; the `isValidImage()` compare is note j's.
The panel's `formSuccess` never runs on a 400, so the row stays until the
next fetch. Code read 2026-09-17. Live-probed 2026-09-17 (A2), OJS, OMP and OPS:
`photo.jpeg` and `PHOTO.PNG` on an edit answered the message (PUT 400); the
row stayed until a reload, then was gone with its page; the announcement's
`{id}.png` stayed on disk.

<a id="fn-f-a3"></a>
**f-a3 — A3 evidence.** Note k: the edit modal prints through
`formatShortDate()` and the API validates `date_format:Y-m-d`. Code read 2026-09-17. Live-probed 2026-09-17 (A3), OJS, OMP and OPS: with
"Date (Short)" `d-m-Y` the panel printed "17-10-2026" and the unchanged save
was refused; retyped as YYYY-MM-DD it saved.

<a id="fn-f-a4"></a>
**f-a4 — A4 evidence (retired).** The entry rested on a code read:
`PKPAnnouncementController::getRouteGroupMiddleware()` is `has.user` plus
`has.roles:1|16`, the `HasRoles` middleware whose matcher failed for
`index/api/v1/highlights` with no context on 2026-09-16 (*Highlights* A5),
and the site's panel posts to `index/api/v1/announcements`. Live-probed
2026-09-17 (A4), OJS, OMP and OPS: every request the site's panel sent (add,
edit, delete, search, the list's fetch) answered 200 and the site's pages
showed the result; the failure does not reach this controller. Retired
2026-09-17.

<a id="fn-f-a5"></a>
**f-a5 — A5 evidence.** Note l: no template prints `typeId` or the type's
name; `fullTitle` is read by the OJS feed templates alone. Code read 2026-09-17. Live-probed 2026-09-17 (A5), OJS, OMP and OPS, the
feed on OJS: "Conference" and "Event" printed on no public page, in no list
row, not in the mail and not in the feed entries, whose title is the plain
title.

<a id="fn-f-a6"></a>
**f-a6 — A6 evidence.** `PKPAnnouncementForm` builds `typeId` as a
`FieldOptions` of type `radio` from the context's types with no empty
option; `edit()` applies `$params['typeId'] ??= null` only to an absent
key. Code read 2026-09-17. Live-probed 2026-09-17 (A6), OJS, OMP and OPS: no
control back to none once "Call" was saved, only "Event"; the PUT carried
the new `typeId`.

<a id="fn-f-a7"></a>
**f-a7 — A7 evidence.** `AnnouncementFeedGatewayPlugin::fetch()` applies
`limit($recentItems)` to a query with no `orderBy` and takes
`$announcements->first()->datePosted` as the feed's updated stamp. Code read 2026-09-17. Live-probed 2026-09-17 (A7), OJS: "Limit feed to 2"
kept "Oldest call (edited)" and "Typed notice", the two oldest of four, in
all three feeds; RSS 2.0's channel `pubDate` was the older's. Re-read
2026-09-26: the two kept are the first two in storage order, not the
two oldest by date; on the probe the two coincided.

<a id="fn-f-a8"></a>
**f-a8 — A8 evidence.** `ManagementHandler::announcements()` and
`PKPAnnouncementController` check nothing about `enableAnnouncements`;
only the side menu entry (note c) and the public side (note e) do. Code read 2026-09-17. Live-probed 2026-09-17 (A8), OJS, OMP and OPS: with
the box unticked the page opened by address with its rows; an add with the
email box ticked listed the row and, once the queue ran, mailed the reader,
while `/announcement` answered the bare 404 to the signed-out reader.

<a id="fn-f-a9"></a>
**f-a9 — A9 evidence.** Note f: `notifyUsers()` is called from `add()` and
nowhere else; `edit()` reads `sendEmail` into `$params` and discards it.
Code read 2026-09-17. Live-probed 2026-09-17 (A9), OJS, OMP and OPS: the
edit's PUT carried `sendEmail=true`, answered 200 and queued nothing; every
mailbox unchanged while the control add after it mailed.

<a id="fn-f-a10"></a>
**f-a10 — A10 evidence.** Note p: `announcements.tpl` and
`components/announcements.tpl` have no empty branch; `announcement.noneExist`
is unreferenced. Code read 2026-09-17. Live-probed 2026-09-17 (A10), OJS, OMP and OPS: the
page of a journal with one expired announcement printed the breadcrumb, the
heading and the introduction alone.

<a id="fn-f-omp1"></a>
**f-omp1 — OMP1 evidence.** `omp/locale/en/manager.po`:
`manager.setup.announcementsIntroduction` "Additional Information",
`….description` "Enter any additional information that should be displayed
to readers on the Announcements page."; `ojs/locale/en/manager.po` and
`ops/locale/en/manager.po`: "Introduction", "Enter any information you
would like to appear on your announcements page.". Code read 2026-09-17.
Live-probed 2026-09-17 (OMP1), OJS, OMP and OPS: the label and the tooltip
per app as the entry says; the text printed between the heading and the list
on all three.

<a id="fn-f-a11"></a>
**f-a11 — A11 evidence.** The side panel is the same `SideModalBody` as the
Highlights panel, whose close paths leave the list item's edited copy in
place (*Highlights* A4). Live-probed 2026-09-17 (A11), OJS, OMP and OPS: the
rows read "Call for papers UNSAVED", "… ESC" and "… OUTSIDE" after the three
closes, no browser or in-app dialog, "Call for papers" after the reload and
on the public page.

<a id="fn-f-a12"></a>
**f-a12 — A12 evidence.** Note j's code read (`Announcement::delete()`
removing the image) did not hold on screen. Live-probed 2026-09-17 (A12),
OJS, OMP and OPS: `{id}.gif` still under `public/…/announcements/` after
"Delete Announcement" › "Yes" (DELETE 200); the announcements A2 deleted
left their `{id}.png`; a GIF replacing a PNG left `{id}.png` beside
`{id}.gif`, a PNG replacing the GIF overwrote `{id}.png`; "Remove" then
"Save" removed the file. Nothing on a screen shows the folder.

<a id="fn-f-a13"></a>
**f-a13 — A13 evidence.** After the edit form's success the grid requests
its row again (`announcement-type-grid/fetch-row?rowId={id}`), and that
request answered 500 on every edit. Live-probed 2026-09-17 (A13), OJS, OMP
and OPS, the journal's tab and the site's: the row read the old name after
the notice and three seconds later, the new one after a reload.

<a id="fn-f-a14"></a>
**f-a14 — A14 evidence.** The job forces the recipient's locale to the
primary language (note f), so the whole mail should be French. Live-probed
2026-09-17 (A14) on a scratch press and preprint server whose primary
language is French, the manager working under `/en/`: subject "Appel à
contributions", footer "Se désabonner … des courriels envoyés par …", body
"Visit our website to read the full announcement."; on the journal the body
read "Visiter notre site Web pour consulter l'annonce complète". The likely
cause is a French string of `emails.announcement.body` missing from the
press's and server's locale files; the files were not compared.

<a id="fn-f-a15"></a>
**f-a15 — A15 evidence.** The feeds are rendered by
`plugins/generic/announcementFeed/templates/{atom,rss,rss2}.tpl`.
Live-probed 2026-09-17 (A15), OJS: Atom's `<updated>` and `<published>` read
"%2026-%09-%17UTC%UTC%259" for the feed and every entry, RSS 1.0's
`<dc:date>` "%2026-%09-%17", RSS 2.0's `<pubDate>` "Thu, 17 Sep 2026
10:28:01 +0000"; the same under "Limit feed to 2". The date pattern the two
templates pass was not read.

<a id="fn-f-a16"></a>
**f-a16 — A16 evidence.** `AnnouncementFeedPlugin` adds the `<link
rel="alternate">` headers per `displayPage` (note g); with no setting saved
they are added to every page. Live-probed 2026-09-17 (A16), OJS: `/about`
carried the three announcement-feed discovery links and no box; after "…only
on announcement page." was saved the home page carried neither and the
Announcements page both.

<a id="fn-f-a17"></a>
**f-a17 — A17 evidence.** Seen in the OJS suite's first run of 2026-09-17
(scenario 5), on a scratch journal with `en` primary and `fr_CA` under
"Forms": the English public Announcements page (`/en/announcement`) printed
"Date limite le 1er juin. Read More Read more about Second call" under
"Second call", whose `descriptionShort` was entered in `fr_CA` alone. The
likely mechanism is `getLocalizedData()`'s fallback past the primary locale
to any locale holding a value (note r), not read in the code. The suites
assert neither way: their English control reads "Call for papers" alone,
and OMP and OPS were not driven on this. The one observation that settles
it: the same announcement read on the English page on any app a second
time.

<a id="fn-f-omp2"></a>
**f-omp2 — OMP2 evidence.** OMP's `pages/index/IndexHandler.php` calls
`_setupAnnouncements($journal ?? $request->getSite(), …)` with `$journal`
undefined on a press, so the site's announcements are assigned first, and
the later `_setupAnnouncements($press, …)` replaces them only when the
press has both `enableAnnouncements` and `numAnnouncementsHomepage`; OJS
and OPS pass their own defined `$journal` / `$server`. Code read
2026-09-17. Seen in the OMP suite's serial run of 2026-09-17 (scenario 6):
the scratch press's home page (announcements on, no count; the site on
with a count of 1) carried one `section.cmp_announcements` headed
"Announcements" with "Site maintenance on Sunday", its date, "Sunday
morning." and "Read More", the links to `{press}/announcement/view/{id}`,
plus "Skip to announcements". Confirmed 2026-09-17 on two fresh presses:
the press with no count carried one block, the site's "Site-only notice",
linked at `{press}/announcement/view/{id}`; the press with a count of 2
carried its own "Press with count" alone; the site's home page the site's;
the site restored to off after (`index/announcement` 404 again).


## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Announcements settings tab (journal) | `management/settings/website#setup/announcements` | AFFM-036 |
| Announcements page (journal): list, search, add, view, edit, delete | `management/settings/announcements#announcements` | AFFM-129, AFFM-130, AFFM-131, AFFM-132, AFFM-133 |
| Announcement Types tab (journal) | `management/settings/announcements#announcementTypes` | AFFM-134, AFFM-135, AFFM-136 · GRID-007 |
| Site Settings › Announcements (settings, list, types) | `index/admin/settings#announcements` | AFFM-225, AFFM-226, AFFM-227 |
| Add / edit side panel | the panel of the two pages above | VUE-092 |
| Public Announcements page | `{journal}/announcement` (site: `index/announcement`) | AFFR-028 · ROUTE-004 |
| Announcement summary and "Read More" | on the page above and the home page | AFFR-029 |
| Home page block | `{journal}/` (site: `index/`) | AFFR-030 |
| Announcement page | `{journal}/announcement/view/{id}` | AFFR-031 · ROUTE-004 |
| Header item, skip link, breadcrumb, "Edit" link | every public page | AFFR-004, AFFR-005, AFFR-006, AFFR-010, AFFR-014, AFFR-016 |
| Announcements API | `api/v1/announcements` | API-008 |
| Announcement record | — | SET-002 |
| "New Announcement" email | the mail catcher | MAIL-001 |
| New-announcement notification and its job | — | NOTIF-008 · JOB-014 |
| Announcement feed block and feeds {OJS} | the sidebar; `gateway/plugin/AnnouncementFeedGatewayPlugin/{atom,rss,rss2}` | AFFR-095 · PLUG-007 |

## Reference — code anchors

- Public pages: `lib/pkp/pages/announcement/AnnouncementHandler.php`;
  `lib/pkp/pages/index/PKPIndexHandler.php` (`_setupAnnouncements`);
  `lib/pkp/templates/frontend/pages/announcements.tpl`, `announcement.tpl`;
  `lib/pkp/templates/frontend/objects/announcement_summary.tpl`,
  `announcement_full.tpl`, `announcements_list.tpl`;
  `lib/pkp/templates/frontend/components/announcements.tpl`,
  `breadcrumbs_announcement.tpl`, `editLink.tpl`; each app's
  `templates/frontend/pages/index*.tpl`, `components/skipLinks.tpl`.
- Management: `lib/pkp/pages/management/ManagementHandler.php`
  (`announcements`, `authorize`, `website`);
  `lib/pkp/templates/management/announcements.tpl`, `website.tpl`;
  `lib/pkp/pages/admin/AdminHandler.php` (`settings`,
  `getAnnouncementsListPanel`, `siteSettingsAvailability`);
  `lib/pkp/templates/admin/settings.tpl`;
  `lib/pkp/classes/template/PKPTemplateManager.php` (the side menu).
- Forms and panel: `lib/pkp/classes/components/forms/announcement/PKPAnnouncementForm.php`;
  `lib/pkp/classes/components/forms/context/PKPAnnouncementSettingsForm.php`;
  `lib/pkp/classes/components/listPanels/PKPAnnouncementsListPanel.php`;
  `lib/ui-library/src/components/ListPanel/announcements/AnnouncementsListPanel.vue`,
  `AnnouncementsEditModal.vue`; `lib/ui-library/src/utils/dateUtils.js`.
- Model and API: `lib/pkp/classes/announcement/Announcement.php`,
  `Repository.php`, `AnnouncementType.php`, `AnnouncementTypeDAO.php`;
  `lib/pkp/schemas/announcement.json`; `lib/pkp/api/v1/announcements/PKPAnnouncementController.php`;
  `lib/pkp/classes/middleware/HasRoles.php`.
- Types grid: `lib/pkp/controllers/grid/announcements/AnnouncementTypeGridHandler.php`,
  `AnnouncementTypeGridRow.php`, `form/AnnouncementTypeForm.php`;
  `lib/pkp/templates/controllers/grid/announcements/form/announcementTypeForm.tpl`.
- Notification and mail: `lib/pkp/jobs/notifications/NewAnnouncementNotifyUsers.php`;
  `lib/pkp/classes/notification/managerDelegate/AnnouncementNotificationManager.php`;
  `lib/pkp/classes/notification/NotificationSubscriptionSettingsDAO.php`;
  `lib/pkp/classes/mail/mailables/AnnouncementNotify.php`;
  `lib/pkp/registry/emailTemplates.xml` (`ANNOUNCEMENT`); each app's
  `locale/en/emails.po`, `locale/en/manager.po`, `locale/en/locale.po`.
- Navigation: `lib/pkp/classes/services/PKPNavigationMenuService.php`
  (`NMI_TYPE_ANNOUNCEMENTS`); each app's `registry/navigationMenus.xml`.
- Feed (OJS): `plugins/generic/announcementFeed/AnnouncementFeedPlugin.php`,
  `AnnouncementFeedBlockPlugin.php`, `AnnouncementFeedGatewayPlugin.php`,
  `AnnouncementFeedSettingsForm.php`, `templates/{atom,rss,rss2,block,settingsForm}.tpl`,
  `settings.xml`; `pages/gateway/GatewayHandler.php`.
- Context deletion: `lib/pkp/classes/services/PKPContextService.php` (`delete`).
