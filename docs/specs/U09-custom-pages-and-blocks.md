---
name: custom-pages-and-blocks
status: verified
---

# Custom pages & blocks

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal needs pages and boxes of its own that no built-in screen
provides: a page about fees or indexing, a call for papers, a box of
partner logos beside every page. A Journal Manager writes them in the
application's formatted-text editor, pictures included, and they appear
on the public site inside the journal's own header and footer. There are
three ways to do it, each with its own screen: <sup>a</sup>

- a **custom page**: the page a "Custom Page" item of Settings › Website ›
  "Setup" › "Navigation" gives the journal, at an address of the
  manager's choosing, which a menu may link to. This is the built-in way
  and the primary one. <sup>a</sup> <sup>td1</sup>
- a **static page** {OJS OMP}: a page written on the "Static Pages" tab
  that the "Static Pages Plugin" adds to Settings › Website. This is the
  older way, kept as a plugin. <sup>a</sup> <sup>td9</sup>
- a **custom block**: a box of formatted text written in the "Custom
  Block Manager" plugin's window and placed in the sidebar of every public
  page. <sup>a</sup> <sup>td19</sup>

An upgrade of the application turns each static page into a "Custom
Page" item. <sup>n</sup>

Every visitor reads the results. The Site Administrator has custom pages
and custom blocks for the site's own pages too. <sup>a</sup>

OPS does not ship the "Static Pages Plugin": a preprint server's
Settings › Website has no "Static Pages" tab and its Plugins list has no
such plugin. Everything below marked {OJS OMP} is absent there; custom
pages and custom blocks work on a preprint server as on a journal.
<sup>a</sup>

## Actors & permissions

"Whoever opens the Settings pages" means the manager-level roles with
"Permit changes to Settings", as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them; every other role has no "Settings" in the side menu and
gets the access-denied page at a Settings address. The site's own pages
are the Site Administrator's, on Administration › "Site Settings", whose
"Site Setup" › "Navigation", "Plugins" and "Appearance" tabs show while
the site hosts two or more journals (Settings bullet 8). Readers need no
account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Add, edit and remove "Custom Page" items** (Rules 1, 5, 6) | • whoever opens the Settings pages, in the item window of Settings › Website › "Setup" › "Navigation", which [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md) describes (its "Title", "Path" and "Content" boxes and their refusals)<br>• the Site Administrator, for the site's items (Rule 8) <sup>b</sup> |
| **Preview a page before saving it** (Rules 7, 13) | • whoever opens the Settings pages, and the Site Administrator, from the "Preview" button of the "Custom Page" item window or of the static page window<br>• a manager-level role without "Permit changes to Settings" has no Settings pages and so no button; a preview's address ({journal address}/navigationMenu/preview, or {journal address}/pages/preview for a static page) typed by it opens the journal's page with no title and no content, as a manager's typed address does<br>• anyone else who types a preview's address, signed in or not, gets a blank page and no preview, because the server fails ⚠ [A7](#a7); on a journal closed to visitors a signed-out visitor is sent to Login first <sup>c</sup> <sup>td7</sup> |
| **Read a custom page or a static page** (Rules 1–6, 12) | • any visitor, signed in or not; a journal closed to signed-out visitors sends them to Login first (Settings bullet 6) <sup>d</sup> <sup>td32</sup> |
| **Enable or disable "Static Pages Plugin" and "Custom Block Manager"** (Rules 9, 15, 17, 25) | • whoever opens the Settings pages, on Settings › Website › "Plugins" › "Installed Plugins"; *Plugins management* owns the list<br>• the Site Administrator, for the site's "Custom Block Manager", on Administration › "Site Settings" › "Plugins" (Rule 27) <sup>b</sup> |
| **Add, edit and delete static pages** {OJS OMP} (Rules 9–16) | • whoever opens the Settings pages, while "Static Pages Plugin" is enabled in the journal <sup>b</sup> <sup>f</sup> |
| **Add, edit and delete custom blocks** (Rules 17–26) | • whoever opens the Settings pages, while "Custom Block Manager" is enabled in the journal; "Delete" is offered but fails on a PostgreSQL installation (Rule 24, [A14](#a14))<br>• the Site Administrator, for the site's blocks (Rule 27) <sup>b</sup> <sup>g</sup> |
| **Place a custom block in the sidebar** (Rule 19) | • whoever opens the Settings pages, on Settings › Website › "Appearance" › "Setup", "Sidebar"; *Appearance & theming* owns the list<br>• the Site Administrator, on the site's "Appearance" › "Setup" (Rule 27) <sup>h</sup> |
| **See a custom block** (Rules 19–21) | • any visitor, on every public page of the journal that has a sidebar, while the block is placed; on a journal closed to visitors, the Login page a signed-out visitor is sent to shows the placed blocks too <sup>h</sup> <sup>td32</sup> |
| **Upload a picture into a formatted text box** (Rule 29) | • whoever works in a "Content" box of this spec (Actors rows 1, 5 and 6)<br>• the same upload serves every formatted text box of the application that offers a picture button, for whoever that box's screen admits <sup>i</sup> |

## Fields & validation

**The formatted text boxes.** The "Content" box of a "Custom Page" item,
of a static page and of a custom block is the application's
formatted-text editor, a bar of buttons above a writing area, one box per
form language (Settings bullet 4). Pictures: Rule 29; tags: Rule 4.
<sup>j</sup> <sup>td28</sup>
With two or more form languages, the first language's "Content" box
(the English one, on a journal in English and French) of the "Custom
Page" item window or of the block window can stay under a "Loading..."
spinner and take no click ⚠ [A20](#a20). <sup>f-a20</sup>

| Box | Buttons on its bar | "Insert Tag" offers |
|-----|--------------------|---------------------|
| "Content" of a "Custom Page" item | "Copy", "Paste", a "Paragraph" / "Heading 2" / "Heading 3" choice, bold, italic, underline, block quote, bulleted and numbered lists, superscript, subscript, link and remove link, source code, full screen, "Insert/edit image", "Insert Tag" | the five contact tags (Rule 4) <sup>j</sup> <sup>td28</sup> |
| "Content" of a static page {OJS OMP} | "Copy", "Paste", bold, italic, underline, link and remove link, source code, full screen, "Insert/edit image", "Insert Tag" | the five contact tags (Rule 4) <sup>j</sup> <sup>td28</sup> |
| "Content" of a custom block | the static page's buttons | no tag: the menu reads "No tags are available." (Rule 28) <sup>j</sup> <sup>td28</sup> |

"Copy" copies the selected text. "Paste" puts nothing into the box and
shows the notice "Your browser doesn't support direct access to the
clipboard. Please use the Ctrl+X/C/V keyboard shortcuts instead." over
it ⚠ [A9](#a9); the keyboard's paste works. <sup>j</sup> <sup>td28</sup>

**The "Static Pages" tab** {OJS OMP} (Settings › Website › "Static
Pages", while the plugin is enabled, Rule 9) holds one list headed
"Static Pages", with the columns "Title" and "Path" and "Add Static Page"
above it; with no page it reads "No static pages have been created.".
Each row's "Settings" arrow at its left reveals "Edit" and "Delete"
under the row. The "Path" cell is a link to the page (Rule 12). <sup>f</sup>
<sup>td10</sup>

**The static page window** {OJS OMP}, opened by "Add Static Page" (headed
"Add Static Page") or by a row's "Edit" (headed "Edit"), with "Preview"
and "Save" at its foot and no "Cancel"; it is left by the back arrow at
its top ("Close"), Rule 30. <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Path" | yes | Letters, digits and ".", "/", "-", "_" only; the box stops accepting characters after 40. Empty: refused with "This field is required.". Any other character ("about us", "café"): refused with "The path field must contain only alphanumeric characters plus '.', '/', '-', and '_'." The path of another static page of the journal: refused with "This path already exists for another static page." The path of a "Custom Page" item is accepted ⚠ [A6](#a6). A "." in the first or second part of the path, the parts being what "/" separates ("dot.only", "deep/Mixed_1.x"), is accepted, but the page then cannot be opened ⚠ [A10](#a10); in a later part ("one/two/three.x") it works <sup>f</sup> <sup>td11</sup> |
| "Title" | no mark | One box per form language, up to 255 characters; the page's heading and its name in the list. Required in the journal's primary language all the same: left empty there, "Save" is refused with "This field is required." under the box, even with another language's box filled. The primary language's title alone saves <sup>f</sup> <sup>td11</sup> |
| (the line under "Path" and "Title") | — | On a journal with one language under "UI": "This page will be accessible at: {journal address}/%PATH% ...where %PATH% is the path entered above. Note: No two pages can have the same path. Using paths that are built into the system may cause you to lose access to important functions." On a journal with more than one, the address in it carries the language: "{journal address}/en/%PATH%", "en" being the manager's interface language <sup>f</sup> <sup>td33</sup> |
| "Content" | no | A formatted text box (the table above) <sup>f</sup> |

A refused "Save" keeps the window open with the message under the box
and stores nothing. <sup>f</sup> <sup>td11</sup>

**The "Custom Block Manager" window**, opened by "Manage Custom Blocks"
on the plugin's row of Settings › Website › "Plugins" › "Installed
Plugins" (Rule 17) and headed "Custom Block Manager", holds one list
headed "Custom Blocks" with the column "Block Name" and "Add Block" above
it; with no block it reads "No custom blocks have been created.". Each
row's arrow reveals "Edit" and "Delete", except on the blank row of a
block kept with no name, which has no arrow (Rule 26a), and on a block
whose name holds a character such as "&", whose "Edit" and "Delete" do
nothing (Rule 18b). The "Block Name" cell shows the block's name as Rule
18a makes it, not the name as typed. <sup>g</sup> <sup>td18</sup>

**The block window**, opened by "Add Block" (headed "Add Block") or by a
row's "Edit" (headed "Edit"), with "Save" and "Cancel" at its foot:
<sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Block Name" | no mark | One box per form language. The block's heading on the public pages (Rule 20) and, at the first save, the source of the block's name (Rule 18). Required in the journal's primary language all the same: left empty there, "Save" is refused with "This field is required." under the box (Rule 26) <sup>g</sup> <sup>td26</sup> |
| "Content" | no | A formatted text box (the table above) <sup>g</sup> |
| "Show Name" | no | One box, "Show the name of this block above the block content."; unticked on a new block (Rule 20) <sup>g</sup> |

## Rules & state

**Custom pages**

1. **The page and its address.** A "Custom Page" item has a page of its
   own at the journal's address followed by its "Path"
   ("{journal address}/our-page"); a "Path" holding "/" gives a deeper
   address ("{journal address}/info/fees"). The page opens whether or
   not a menu holds the item; an item a menu holds links to it (the menus
   are [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)'s).
   <sup>d</sup> <sup>td1</sup>
2. **What the page shows.** The journal's header, the breadcrumbs "Home /
   {Title}", the item's "Title" as the page's heading, the "Content", then
   the footer, with the sidebar blocks beside it. The browser tab reads
   "{Title} | {journal name}". The page carries no "Edit" link, even for a
   manager. <sup>d</sup> <sup>td1</sup>
3. **Languages.** The visitor reads the title and the content in their own
   language when the item has them in it, and otherwise the journal's
   primary language's. <sup>d</sup> <sup>td2</sup>
4. **Tags.** "Insert Tag" on the editor's bar lists "Principal Contact
   Name ("{name}")", "Principal Contact Email", "Support Contact Name",
   "Support Contact Phone" and "Support Contact Email", each with the
   value in brackets; a chosen tag sits in the text as a grey label that
   is edited as one piece. On the page it shows the value at the time the
   page is read, from Settings › Journal › "Contact": a contact changed
   later changes every page that carries the tag, and a contact field
   left empty shows nothing. <sup>j</sup> <sup>td3</sup>
5. **Moving or removing.** A changed "Path" moves the page: the old
   address then answers a bare "404 Not Found" page. So does the address
   of a removed item. <sup>d</sup> <sup>td4</sup>
6. **Built-in addresses.** A "Path" that is also the address of a
   built-in page ("about" for "About the Journal", "search") replaces that
   page for every visitor: the custom page opens at that address and from
   every link to it (the header's "About" › "About the Journal", the
   header's "Search"). The window's note warns of it ("Using paths that
   are built into the system may cause you to lose access to important
   functions."). <sup>d</sup> <sup>td5</sup>
   - 6a. **The addresses under it.** Longer addresses keep their pages:
     "about/editorialMasthead" still opens "Editorial Masthead",
     "about/contact" the contact page and "search/search" the Search
     page, though no link leads to that last one while the item keeps
     the path. <sup>d</sup> <sup>td5</sup>
7. **Preview.** "Preview" in the item window opens a new browser tab,
   its address "about:blank", showing the page as it would look with the
   typed "Title" and "Content" in the interface language, inside the
   journal's header and footer, tags replaced. With nothing typed in the
   interface language's boxes, the preview shows the primary language's
   title and content, as the page itself would (Rule 3). Nothing is
   saved: the item window stays open as it was. <sup>c</sup> <sup>td6</sup>
8. **The site's own custom pages.** On the site (Administration › "Site
   Settings" › "Site Setup" › "Navigation"), a "Custom Page" item gives a
   page at the site's address followed by the "Path", inside the site's
   header and footer. The site's item window has the same "Content" bar;
   its "Insert Tag" menu reads "No tags are available.", and its
   "Preview" shows the page inside the site's header and footer.
   <sup>m</sup> <sup>td8</sup>

**Static pages** {OJS OMP}

9. **The plugin and its tab.** "Static Pages Plugin" (Settings › Website
   › "Plugins" › "Installed Plugins", under "Generic Plugins") is disabled
   on a new journal. Ticking and unticking it show the notices and the
   question Rule 17 quotes for "Custom Block Manager", with "Static Pages
   Plugin" in the notices. Once ticked, its row's arrow offers "Edit/Add
   Content", which opens Settings › Website on the "Static Pages" tab, the
   last of the page's top tabs; the tab is there from the next load of
   Settings › Website. <sup>e</sup> <sup>td9</sup>
10. **Adding and editing.** "Save" stores the page, closes the window, and
    the list shows the page by its title in the manager's interface
    language, or in the primary language when it has none there. No
    message appears at the top right, unless an earlier "Save" was
    refused for its "Path" ⚠ [A11](#a11). The list shows the pages in no
    fixed order: usually the order they were added, with a page saved
    again through "Edit" moved to the end, but neither is certain.
    <sup>f</sup> <sup>td10</sup>
11. **Refusals.** The refused paths are in the window's table (Fields).
    <sup>f</sup> <sup>td11</sup>
12. **The page.** A static page opens at the journal's address followed by
    its "Path", with the journal's header, the "Title" as a heading, the
    "Content" and the footer. Unlike a custom page it has no breadcrumbs,
    and its title is not the page's main heading ⚠ [A3](#a3). The browser
    tab, the languages and the tags work as on a custom page (Rules 2–4).
    The "Path" cell in the list opens the page in a new browser tab.
    <sup>f</sup> <sup>td12</sup> <sup>td13</sup>
13. **Preview.** The window's "Preview" works as Rule 7 describes, for
    the static page's typed "Title" and "Content". <sup>c</sup> <sup>td6</sup>
14. **Deleting.** A row's "Delete" opens a window headed "Delete": "Are
    you sure you wish to delete this item? This action cannot be undone."
    with "OK" and "Cancel". "OK" takes the row away, and the page's address
    answers a bare "404 Not Found" page. <sup>f</sup> <sup>td14</sup>
15. **Plugin disabled.** With "Static Pages Plugin" unticked again, every
    static page's address answers "404 Not Found", and the tab is gone
    from the next load of Settings › Website. Until that reload the tab
    stays and still lists the pages, but its "Add Static Page" fails: an
    empty window opens with, over it, a window "Error": "An unexpected
    error has occurred. Please reload the page and try again." and "OK"
    ⚠ [A12](#a12). The pages stay stored and come back when the plugin is
    ticked again. <sup>e</sup> <sup>td15</sup>
16. **Shared addresses.** A static page and a "Custom Page" item can hold
    the same path, since each window refuses only its own kind's
    duplicates [A6](#a6). At that address the custom page opens,
    whichever was saved first, and the static page cannot be reached; it
    opens there only while no item holds the path. A static page on a
    built-in page's address replaces that page as Rule 6 describes.
    <sup>e</sup> <sup>td16</sup>

**Custom blocks**

17. **The plugin and its window.** "Custom Block Manager" (Settings ›
    Website › "Plugins" › "Installed Plugins", under "Generic Plugins") is
    disabled on a new journal. Ticking it shows "The plugin "Custom Block
    Manager" has been enabled." at the top right, and its row's arrow then
    offers "Manage Custom Blocks" at once, which opens the "Custom Block
    Manager" window (Fields). Unticking it first asks, in a window headed
    "Disable", "Are you sure you want to disable this plugin?" with "OK"
    and "Cancel"; "OK" shows "The plugin "Custom Block Manager" has been
    disabled.". <sup>g</sup> <sup>td18</sup>
18. **Adding a block.** "Save" stores the block, closes the block window
    and the list shows it; no message appears at the top right. The block
    is switched on at once: Settings › Website › "Appearance" › "Setup"
    lists it under "Sidebar" as "{name} (Custom Block)", unticked, so
    nothing shows on the public pages yet. <sup>g</sup> <sup>h</sup>
    <sup>td19</sup>
    - 18a. **The block's name.** The name, in the list and elsewhere, is
      made at the first save from the "Block Name" box of the manager's
      interface language ⚠ [A1](#a1): lower case, with the spaces dropped
      and a hyphen before each later word that starts with a letter
      without an accent ("Our Partners" becomes "our-partners"). Any other
      word runs into the one before, and every character is kept ("News
      2026 & Events" becomes "news2026&-events", "Événements à venir"
      becomes "événementsà-venir"). <sup>g</sup> <sup>td19</sup>
    - 18b. **A name with other characters.** A block whose name holds a
      character other than letters, digits, "-" and "_" ("&" above) is
      saved, but ticking it under "Sidebar" is refused with "This may only
      contain letters, numbers, dashes and underscores.", and its row's
      "Edit" and "Delete" do nothing ⚠ [A13](#a13). Accented letters count
      as letters: "événementsà-venir" is placed as usual. <sup>g</sup>
      <sup>td19</sup>
19. **Placing.** Ticked under "Sidebar" and saved, the block shows in the
    sidebar of every public page of the journal, at its place in the
    "Sidebar" order; unticked and saved, it leaves them. *Appearance &
    theming* owns the list and its order. <sup>h</sup> <sup>td20</sup>
20. **What a block shows.** With "Show Name" unticked (a new block), the
    sidebar shows the "Content" alone, and a screen reader hears the
    "Block Name" as a heading before it. With "Show Name" ticked, the
    "Block Name" shows above the content as the block's heading.
    <sup>g</sup> <sup>td20</sup>
21. **Languages.** The visitor reads the "Block Name" and the "Content" in
    their own language when the block has them in it, and otherwise the
    journal's primary language's. <sup>g</sup> <sup>td21</sup>
22. **Editing.** A changed "Block Name", "Content" or "Show Name" shows on
    the public pages from the next page load. The list and the "Sidebar"
    label keep the name made at the first save [A1](#a1). <sup>g</sup>
    <sup>td22</sup>
23. **The same name twice.** A block whose name comes out the same as an
    existing block's gets that name followed by a run of letters and
    digits ("our-partners" and "our-partners5f3c…"). <sup>g</sup> <sup>td23</sup>
24. **Deleting.** A row's "Delete" asks as Rule 14 describes. On an
    installation whose database is PostgreSQL, as the test installs' is,
    "OK" fails ⚠ [A14](#a14): the window stays open, showing a spinner
    and no message, and the block stays in the list, in the sidebar and
    in the "Sidebar" list. This holds for the site's blocks too.
    <sup>g</sup> <sup>td24</sup>
    - 24a. **Where "OK" works.** On a MySQL installation, as read from the
      code (the test installs cannot show it), "OK" takes the block out of
      the list, out of every public page's sidebar and out of the "Sidebar"
      list, while its place in the sidebar stays stored ⚠ [A2](#a2): a
      block added later whose name comes out the same shows in the sidebar
      at once, at the deleted block's place, without being ticked.
      <sup>f-a2</sup>
25. **Plugin disabled.** Unticking "Custom Block Manager" asks as Rule 17
    describes. With the plugin unticked, every custom block leaves the
    public pages and the "Sidebar" list. The blocks stay stored and come
    back, in their places, when the plugin is ticked again, unless
    "Appearance" › "Setup" was saved in between with a changed "Sidebar"
    list: that save drops their places, and they come back unticked.
    <sup>g</sup> <sup>h</sup> <sup>td25</sup>
    - 25a. **Saving the sidebar meanwhile.** While the plugin is unticked
      and a custom block is placed, "Save" on "Appearance" › "Setup" is
      refused under "Sidebar" with "The {name} block can not be found.
      Please make sure the plugin is installed and enabled." ({name} being
      the block's name, "our-partners"), although the list no longer shows
      that block ⚠ [A15](#a15). The save goes through once the "Sidebar"
      list is changed, which drops the block's place. <sup>h</sup>
      <sup>td25</sup>
26. **An empty "Block Name".** "Save" with the "Block Name" box of the
    journal's primary language empty is refused under the box with "This
    field is required.", even with another language's box filled.
    <sup>g</sup> <sup>td26</sup>
    - 26a. **A block with no name.** A block is kept with no name when the
      box of the manager's interface language is empty, as when a manager
      working in French saves an English name only ⚠ [A4](#a4). Its row in
      "Custom Blocks" is blank and has no arrow, so neither "Edit" nor
      "Delete". "Sidebar" lists it as "(Custom Block)" with a space before
      it, and ticking it there is refused with "This is not a valid
      string." and "This may only contain letters, numbers, dashes and
      underscores.". <sup>g</sup> <sup>td26</sup>
27. **The site's own blocks.** On the site, "Custom Block Manager" is on
    Administration › "Site Settings" › "Plugins" › "Installed Plugins",
    its "Manage Custom Blocks" opens the same window for the site's
    blocks, and the site's "Appearance" › "Setup" "Sidebar" places them on
    the site's own pages. A journal's blocks and the site's are separate
    lists. <sup>m</sup> <sup>td27</sup>

**Formatted text and pictures**

28. **The editor's tags.** The contact tags are offered in the "Content"
    of a "Custom Page" item and of a static page (Rule 4). A custom
    block's "Insert Tag" offers none, and a block shows no contact value.
    A tag's code typed as text ("{$contactName}") works as the tag does on
    a custom page and a static page; a custom block shows it as typed.
    <sup>j</sup> <sup>td28</sup>

<a id="image-upload"></a>
29. **Pictures.** In any formatted text box with a picture button,
    "Insert/edit image" opens a window headed "Insert/Edit Image" with the
    tabs "General" and "Upload". On "Upload", "Browse for an image" (or a
    file dropped on "Drop an image here") sends the file to the site, as
    does a picture pasted or dropped into the box; the box then holds the
    picture, and the saved page, block or text shows it. Accepted:
    ".gif", ".jpg", ".png" and ".webp" files, the ending in any letter
    case. Through the picture window a refused file is not inserted, and
    a small window over it shows the message, with "OK": <sup>i</sup>
    <sup>td29</sup> <sup>td30</sup>
    - a picture of another kind (".bmp"; ".jpeg" too ⚠ [A5](#a5)): "You
      can only upload the following types of files: gif, jpg, png, webp."
    - a file named like a picture that is not one (a text file renamed
      ".png"): "The image you uploaded is not valid."
    - a picture whose content is another kind than its name says (a PNG
      renamed ".jpg"): "The file you uploaded did not match the file
      extension. This can happen when a file has been renamed to an
      incompatible type, for example changing photo.png to photo.jpg."
    - a file over the account's allowance (Rule 29a): "You do not have
      enough space in your user directory. The file you are uploading is
      {size}kb and you have {remaining}kb remaining."
    - a file larger than the server takes in one upload ⚠ [A18](#a18):
      the server fails, and the window reads "Path cannot be empty" or
      "One or more files could not be uploaded."; a file over the server's
      limit for a whole request gets
      "The POST data is too large.". The message meant for this case,
      "Files larger than {size} can not be uploaded.", never shows.
    - a file the browser does not take for a picture (".pdf", ".svg"):
      nothing happens, and the window stays on "Upload" with no message
      ⚠ [A16](#a16).
    - 29a. **The allowance.** Each account may store 5000 KB of pictures
      in all, whatever journal of the site they were uploaded in. A
      picture taken out of a text, or a page deleted, frees nothing: the
      file stays stored. <sup>i</sup> <sup>td31</sup>
    - 29b. **The picture's address.** The picture is stored at the site's
      address followed by "/public/site/images/{username}/{file name}",
      the file name in lower case with spaces, "_" and ":" turned into
      hyphens and every other character but letters, digits, "." and "-"
      dropped. A name left with nothing before its ending ("ü.png") is
      stored as ".png", and the picture shows as usual. A name the account
      already used gets a hyphen and 32 letters and digits before its
      ending, and the earlier picture stays as it was. <sup>i</sup>
      <sup>td30</sup>
    - 29c. **Pasted and dropped pictures.** A picture pasted or dropped
      into the box is stored as "mceclip{n}.png" (n counting from 0 on
      each page load), whatever its file's name. If its upload is refused,
      the notice "Failed to upload image: {message}" shows (for example
      "Failed to upload image: The image you uploaded is not valid."), and
      the picture stays in the box all the same, embedded in the text
      itself ⚠ [A17](#a17): "Save" stores it that way, and the public page
      shows it, a refused file that is not a picture as a broken picture.
      <sup>i</sup> <sup>td30</sup>
30. **Leaving the static page window unsaved** {OJS OMP}. After a change
    to "Path" or "Title", the window's back arrow or Escape first asks the
    browser's own question "The data on this form has changed. Do you
    wish to continue without saving?", the question the item window asks
    ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
    Rule 11a). "Cancel" keeps the window as it was; "OK" closes it and
    stores nothing. A change made only in "Content" raises no question:
    the window closes and the text is lost ⚠ [A19](#a19). An untouched
    window closes without a question. <sup>f</sup> <sup>td17</sup>
    - 30a. **Leaving the block window unsaved.** The block window's
      "Cancel" closes it at once, without a question, and stores nothing.
      Its close control and Escape after a change to "Block Name" ask the
      same question as the static page window. <sup>g</sup>
      <sup>td17</sup>
    - 30b. **Leaving the page.** Going to another address while either
      window holds a change raises the browser's own "Leave site?"
      question. <sup>f</sup> <sup>g</sup> <sup>td17</sup>

## Side effects

- Adding, editing or deleting a static page, and adding or editing a
  custom block, sends no email, raises no notification or task and writes
  no log entry; a "Custom Page" item's are *Navigation menus & site
  chrome*'s. <sup>k</sup>
- An uploaded picture is a file in the site's public files, under the
  uploading account's name, stored as soon as the upload answers, even
  when the picture window is then left with "Cancel" and the text never
  holds it. It counts toward the allowance, and nothing removes it (Rule
  29a). <sup>i</sup> <sup>td31</sup>
- Deleting a journal deletes its "Custom Page" items, its static pages
  and its custom blocks with it; the pictures stay (*Hosted journals*
  owns the deletion). <sup>k</sup>

## Settings that modify behavior

1. **"Static Pages Plugin"** {OJS OMP} (Settings › Website › "Plugins" ›
   "Installed Plugins"; disabled). Enabled: the "Static Pages" tab and the
   pages (Rules 9–14). Disabled: no tab, and the pages answer "404 Not
   Found" (Rule 15). *Plugins management* owns the list. The site's
   Plugins list (Administration › "Site Settings" › "Plugins") offers the
   plugin too, unticked; ticking it there shows "The plugin "Static Pages
   Plugin" has been enabled." and changes nothing, since the site has no
   static pages ⚠ [A8](#a8). <sup>e</sup> <sup>l</sup>
2. **"Custom Block Manager"** (Settings › Website › "Plugins" › "Installed
   Plugins"; disabled; the site's on Administration › "Site Settings" ›
   "Plugins"). Enabled: "Manage Custom Blocks" and the blocks (Rules
   17–24). Disabled: no link, and the blocks leave the pages and the
   "Sidebar" list (Rule 25). *Plugins management* owns the list.
   <sup>g</sup> <sup>l</sup>
3. **"Sidebar"** (Settings › Website › "Appearance" › "Setup"; no block
   placed). A custom block ticked there shows on every public page at its
   place in the order (Rule 19); unticked, it shows nowhere. *Appearance
   & theming* owns the list. <sup>h</sup>
4. **"Forms"** column (Settings › Website › "Setup" › "Languages"; the
   primary language alone). Each language ticked adds that language's
   boxes to "Title", "Content" and "Block Name" (Fields) [A20](#a20); a
   visitor reads the texts of their language (Rules 3, 21). *Languages &
   locales* owns it. <sup>d</sup> <sup>g</sup>
5. **The principal contact and the technical support contact** (Settings
   › Journal › "Contact"; on a new test journal the principal contact is
   set and the support contact empty). Their values are what the tags
   show (Rule 4). *Journal identity & about pages* owns the tab.
   <sup>j</sup>
6. **"Users must be registered and log in to view the journal site."**
   (on a press "Users must be registered and log in to view the press
   site.", on a preprint server "Users must be registered and log in to
   view the server site."; Settings › Users & Roles › "Site Access
   Options"; unticked). Ticked: a signed-out visitor who opens a custom
   page or a static page is sent to Login first, where the placed blocks
   show (Actors row 8). *Journal identity & about pages* (Rule 22)
   describes the closed journal. <sup>d</sup> <sup>td32</sup>
7. **The picture allowance** (the installation's configuration file;
   5000 KB per account). Another number changes the allowance of Rule
   29a; 0 refuses every picture. No screen changes it. <sup>i</sup>
8. **Two or more journals on the site** (Administration › "Hosted
   Journals", on a press "Hosted Presses", on a preprint server "Hosted
   Servers"; one journal on a fresh install, more once tests add scratch
   journals). With one journal the Site Settings have no "Site Setup" ›
   "Navigation", "Plugins" or "Appearance" tab, so the site has no custom
   pages or blocks to manage (Rules 8, 27); this end is not seen on the
   test installs, which always host many journals. *Site settings* owns
   the rule. <sup>m</sup>

## Cross-feature interactions

- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the "Navigation" tab, the item window with its "Title", "Path",
  "Content" and "Preview" boxes and their refusals, the menus a "Custom
  Page" item sits in, and the header, footer and breadcrumbs around every
  page; this spec owns the page the item gives and what its "Preview"
  shows.
- *Appearance & theming* owns the "Sidebar" list, its order and the
  theme; this spec owns what a custom block puts there.
- *Plugins management* owns the "Installed Plugins" list and ticking a
  plugin; this spec owns what "Static Pages Plugin" and "Custom Block
  Manager" add.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
  owns who opens the Settings pages, the "Contact" tab the tags read, and
  the closed journal (its Rule 22).
- *Languages & locales* owns the "Forms" languages.
- *Site settings* owns the Site Settings tabs and when they show;
  *Hosted journals* owns deleting a journal.
- Every formatted text box with a picture button, on any screen, uploads
  through [→ pictures](#image-upload) (Rule 29), and its rules hold
  there; a spec whose screen has such a box points here for them rather
  than repeating them.

## Canonical scenarios

Scenario 8 only reads, and runs on the seeded preprint server with a
ready account; every other scenario writes pages, blocks or pictures, or
needs a role set up for it, and runs on a scratch journal with throwaway
accounts. The accounts, their passwords and the tooling recipe are in
the footnote. <sup>y</sup>

1. **A custom page, from the item window to the visitor**

   Given: Journal Manager, on a scratch journal whose principal contact
   is "Site Admin" <admin@mail.test> and whose technical support contact
   is empty, and a visitor, signed out, in a second browser.

   - **The item window**: open Settings › Website › "Setup" ›
     "Navigation", press "Add item" and choose "Custom Page"; type "Our
     page" in "Title", "our-page" in "Path" and "Welcome to our page.
     Write to {$contactName} at " in "Content" (Rule 28).
   - **"Insert Tag"**: press "Insert Tag" on the bar above "Content": the
     menu lists "Principal Contact Name ("Site Admin")", "Principal
     Contact Email ("admin@mail.test")", "Support Contact Name ("")",
     "Support Contact Phone ("")" and "Support Contact Email ("")";
     choose "Principal Contact Email ("admin@mail.test")": it sits at the
     end of the text as a grey label (Rule 4).
   - **Preview**: press "Preview": a new browser tab opens at
     "about:blank", showing the heading "Our page" and the text "Welcome
     to our page. Write to Site Admin at admin@mail.test" inside the
     journal's header and footer. Back in the first tab the item window
     is still open with the typed texts, nothing saved (Rules 7, 28).
   - **Saved, in no menu**: press "Save": the new item sits in no menu.
     The visitor opens {journal address}/our-page: the journal's header, the
     breadcrumbs "Home / Our page", the heading "Our page", the text
     "Welcome to our page. Write to Site Admin at admin@mail.test", then
     the footer; the browser tab reads "Our page | {journal name}"
     (Rules 1, 2, 4, 28).
   - **Moved**: Journal Manager: press the "Settings" arrow at the left
     of "Our page" in "Navigation Menu Items", then "Edit"; replace
     "our-page" with "our-new-page" in "Path" and press "Save". The
     visitor opens {journal address}/our-new-page: the page shows;
     {journal address}/our-page answers a bare "404 Not Found" page
     (Rule 5).
   - **Removed**: press the "Settings" arrow of "Our page", then "Remove"
     and "OK". The visitor opens {journal address}/our-new-page: a bare
     "404 Not Found" page (Rule 5).
   - **Control**: while the page stood, the Journal Manager, signed in,
     opened {journal address}/our-page and saw the same page with no
     "Edit" link (Rule 2).

2. **A custom page on a built-in page's address**

   Given: Journal Manager, on a scratch journal, and a visitor, signed
   out, on its home page in a second browser.

   - **The item**: on Settings › Website › "Setup" › "Navigation" press
     "Add item" and choose "Custom Page"; type "About us" in "Title",
     "about" in "Path" and "About replacement." in "Content": the
     window's note warns "Using paths that are built into the system may
     cause you to lose access to important functions."; press "Save"
     (Rule 6).
   - **The header's link**: the visitor reloads the home page, points at
     "About" in the header and chooses "About the Journal" ("About the
     Press", "About the Server"): the page "About us" opens, reading
     "About replacement."; {journal address}/about shows the same page
     (Rule 6).
   - **An address under it**: the visitor opens {journal
     address}/about/contact: the journal's contact page (Rule 6a).
   - **Control**: {journal address}/about/editorialMasthead still opens
     "Editorial Masthead" (Rule 6a).

3. **A preview's address typed by hand**

   Given: Journal Manager, a Reader, an Editor whose role has "Permit
   changes to Settings" unticked, so has no Settings pages {OJS OMP}, and
   a visitor, signed out, on a scratch journal with "Static Pages Plugin"
   enabled {OJS OMP}.

   - **The Reader**: sign in and open {journal
     address}/navigationMenu/preview: no preview opens; the browser shows
     a blank page [A7](#a7). {OJS OMP} {journal address}/pages/preview
     gives the same (Actors row 2).
   - **Signed out**: the visitor opens the same addresses: a blank page
     each time and no preview [A7](#a7) (Actors row 2).
   - **The Editor without Settings** {OJS OMP}: sign in and open {journal
     address}/navigationMenu/preview: the journal's page opens with no
     title and no content (Actors row 2).
   - **Control**: the Journal Manager, at the same address, gets the
     same page with no title and no content (Actors row 2).

4. **A custom block, from the plugin to the sidebar**

   Given: Journal Manager, on a scratch journal where "Custom Block
   Manager" is disabled, as on a new journal, and a visitor, signed out,
   on its home page in a second browser.

   - **The plugin**: open Settings › Website › "Plugins" › "Installed
     Plugins" and tick "Custom Block Manager" under "Generic Plugins":
     at once, without a reload, its row's arrow offers "Manage Custom
     Blocks"; press it: a window headed "Custom Block Manager" holds the
     list "Custom Blocks", with the column "Block Name" and "Add Block"
     above it, reading "No custom blocks have been created." (Rule 17).
   - **The block window**: press "Add Block": a window headed "Add
     Block" holds "Block Name", "Content" and the box "Show the name of
     this block above the block content.", unticked, with "Save" and
     "Cancel" at its foot; press "Insert Tag" on the bar above "Content":
     the menu reads "No tags are available." (Fields; Rule 28).
   - **No name**: press "Save" with "Block Name" empty: "This field is
     required." shows under the box (Rule 26).
   - **Left with "Cancel"**: type "Draft" in "Block Name" and press
     "Cancel": the window closes at once, with no question, and the list
     still reads "No custom blocks have been created." (Rule 30a).
   - **Added**: press "Add Block", type "Our Partners" in "Block Name"
     and "Partner list. Write to {$contactName}." in "Content", and press
     "Save": the window closes, no message shows at the top right, and
     the list shows the block as "our-partners" [A1](#a1) (Rules 18,
     18a). The visitor reloads the home page: no block shows yet (Rule
     18).
   - **Placed**: open Settings › Website › "Appearance" › "Setup": the
     "Sidebar" list holds "our-partners (Custom Block)", unticked; tick
     it and press "Save". The visitor reloads the home page: the sidebar
     shows "Partner list. Write to {$contactName}.", the tag's code as
     typed, with no heading on screen, and a screen reader hears "Our
     Partners" as a heading before it; "About the Journal" ("About the
     Press", "About the Server") shows the same block (Rules 19, 20, 28).
   - **Renamed, name shown**: in "Manage Custom Blocks" press the arrow
     of "our-partners", then "Edit": a window headed "Edit" opens;
     replace "Our Partners" with "Friends", tick "Show the name of this
     block above the block content." and press "Save". The visitor
     reloads: "Friends" shows above the content as the block's heading.
     The list still reads "our-partners", and "Sidebar" "our-partners
     (Custom Block)" [A1](#a1) (Rules 20, 22).
   - **The same name twice**: press "Add Block", type "Our Partners" in
     "Block Name" and "Second list." in "Content", and press "Save": the
     list shows "our-partners" and a second "our-partners" followed by a
     run of letters and digits (Rule 23).
   - **Control**: untick "our-partners (Custom Block)" in "Sidebar" and
     press "Save": the visitor's reloaded home page shows no block (Rule
     19).

5. **Pictures in a page, refused files and the allowance**

   Given: Journal Manager, with an account that has uploaded no picture
   yet, on a scratch journal, a visitor, signed out, in a second browser,
   and these files: "Test Image_1.png", a PNG picture; a second PNG
   picture of another image, also named "Test Image_1.png"; "photo.bmp",
   a BMP picture; "notes.png", a text file; "photo.jpg", a PNG picture
   renamed; and "big-1.png", "big-2.png" and "big-3.png", PNG pictures of
   1900 KB each.

   - **The picture window**: on Settings › Website › "Setup" ›
     "Navigation" press "Add item", choose "Custom Page", and type
     "Pictures" in "Title" and "pictures" in "Path". On the bar above
     "Content" press "Insert/edit image": a window headed "Insert/Edit
     Image" opens with the tabs "General" and "Upload"; press "Upload":
     it offers "Browse for an image" and "Drop an image here" (Rule 29).
   - **Uploaded**: press "Browse for an image", choose the first "Test
     Image_1.png" and confirm: "Content" holds the picture (Rule 29).
     Later uploads go the same way, with the cursor at the end of
     "Content".
   - **Refused**: upload, in turn: "photo.bmp": a small window over the
     picture window reads "You can only upload the following types of
     files: gif, jpg, png, webp." with "OK"; "notes.png": "The image you
     uploaded is not valid."; "photo.jpg": "The file you uploaded did not
     match the file extension. This can happen when a file has been
     renamed to an incompatible type, for example changing photo.png to
     photo.jpg.".
     Each time press "OK": nothing is inserted (Rule 29).
   - **The same name again**: upload the second "Test Image_1.png"
     and confirm: "Content" holds both pictures (Rules 29, 29b).
   - **The allowance**: upload "big-1.png", then leave the picture
     window with "Cancel": "Content" does not hold it. Upload "big-2.png"
     and confirm: "Content" holds it. Upload "big-3.png": the small
     window reads "You do not have enough space in your user directory.
     The file you are uploading is {size}kb and you have {remaining}kb
     remaining." (Rule 29a; Side effects).
   - **Saved and read**: press "Save". The visitor opens {journal
     address}/pictures: the page shows the two "Test Image_1.png"
     pictures and "big-2.png" (Rule 29). The visitor opens the site's
     address followed by "/public/site/images/{username}/test-image-1.png",
     {username} being the Journal Manager's: the first "Test
     Image_1.png" picture shows, not the second (Rule 29b). The same
     address ending in "big-1.png" shows that picture, which no text
     holds (Side effects).
   - **Control**: "big-2.png", the same size as the refused "big-3.png",
     was accepted before it (Rule 29a).

6. **A journal in two languages**

   Given: Journal Manager, working in English, on a scratch journal
   whose primary language is English, with French ticked under "UI" and
   "Forms" and "Custom Block Manager" enabled, and a visitor, signed out,
   in a second browser.

   - **The boxes**: on Settings › Website › "Setup" › "Navigation" press
     "Add item" and choose "Custom Page": "Title" and "Content" each have
     an English and a French box (Settings bullet 4). Type "Our page" in
     the English "Title", "our-page" in "Path" and "Welcome." in the
     English "Content", leave the French boxes empty, and press "Save".
   - **French visitor, English texts**: the visitor opens {journal
     address}/fr_CA/our-page, the page in French: it reads "Our page"
     and "Welcome." (Rule 3).
   - **French texts added**: press the "Settings" arrow of "Our page",
     then "Edit"; type "Notre page" in the French "Title" and "Bienvenue."
     in the French "Content", and press "Save". The visitor reloads the
     French address: "Notre page" and "Bienvenue." (Rule 3).
   - **The block's primary name**: open "Manage Custom Blocks" on the
     "Custom Block Manager" row of Settings › Website › "Plugins" ›
     "Installed Plugins" and press "Add Block": "Block Name" and
     "Content" each have an English and a French box (Settings bullet
     4). Type "Nos partenaires" in the French "Block Name" alone and
     press "Save": "This field is required." shows under the English box
     (Rule 26).
   - **The block in two languages**: in the same window, with "Nos
     partenaires" still in the French "Block Name", type "Our Partners"
     in the English "Block Name", "Partner list" in the English "Content"
     and "Liste des partenaires" in the French "Content", tick "Show the
     name of this block above the block content." and press "Save"; on
     Settings ›
     Website › "Appearance" › "Setup" tick "our-partners (Custom Block)"
     in "Sidebar" and press "Save". The visitor reloads the French
     address: the sidebar shows "Nos partenaires" above "Liste des
     partenaires" (Rules 20, 21).
   - **Control**: the visitor opens {journal address}/en/our-page, the
     page in English: "Our page" and "Welcome.", with "Our Partners"
     above "Partner list" in the sidebar (Rules 3, 21).

7. **A static page, from the plugin to the visitor** {OJS OMP}

   Given: Journal Manager, on a scratch journal where "Static Pages
   Plugin" is disabled, as on a new journal, and a visitor, signed out,
   in a second browser.

   - **The plugin**: open Settings › Website › "Plugins" › "Installed
     Plugins" and tick "Static Pages Plugin" under "Generic Plugins"; its
     row's arrow offers "Edit/Add Content"; press it: Settings › Website
     opens on the "Static Pages" tab, the last of the page's top tabs
     (Rule 9).
   - **The empty list**: the tab holds the list "Static Pages", with the
     columns "Title" and "Path" and "Add Static Page" above it, reading
     "No static pages have been created." (Fields).
   - **The window**: press "Add Static Page": a window headed "Add Static
     Page" opens with "Preview" and "Save" at its foot and no "Cancel";
     under "Path" and "Title" a line reads "This page will be accessible
     at: {journal address}/%PATH% ...where %PATH% is the path entered
     above. Note: No two pages can have the same path. Using paths that
     are built into the system may cause you to lose access to important
     functions.", with no language in the address, the journal having
     English alone (Fields).
   - **Preview**: type "about-us" in "Path", "About us" in "Title" and
     "Welcome to our journal." in "Content", and press "Preview": a new
     browser tab opens, its address "about:blank", showing "About us"
     and "Welcome to our journal." inside the journal's header and
     footer; back in the first tab the window is still open with the
     typed texts, and the list still reads "No static pages have been
     created." (Rules 7, 13).
   - **Saved**: press "Save": the window closes, no message shows at the
     top right, and the list shows "About us" with the path "about-us"
     (Rule 10).
   - **The visitor's page**: the visitor opens {journal address}/about-us:
     the journal's header, "About us" as a heading, "Welcome to our
     journal." and the footer, with no breadcrumbs [A3](#a3); the browser
     tab reads "About us | {journal name}" (Rule 12).
   - **The "Path" link**: Journal Manager: press "about-us" in the list:
     the page opens in a new browser tab (Rule 12).
   - **A second page, and an edit**: press "Add Static Page", type "fees"
     in "Path", "Fees" in "Title" and "Our fees." in "Content", and press
     "Save": the list holds "About us" and "Fees", in any order. Press the
     "Settings" arrow at the left of "About us", then "Edit": a window
     headed "Edit" opens; press "Save": the window closes and the list
     still holds "About us" and "Fees", each once, in any order, and so
     after a reload (Rule 10).
   - **Left unsaved**: press "Add Static Page", type "x" in "Title" and
     press the back arrow at the window's top: the browser asks "The data
     on this form has changed. Do you wish to continue without saving?";
     press "Cancel": the window stays, "x" in "Title". Press the back
     arrow again, then "OK": the window closes and the list still holds
     "About us" and "Fees" and no third page (Rule 30).
   - **Forty characters**: press "Add Static Page", type "Second" in
     "Title" and "abcdefghijabcdefghijabcdefghijabcdefghijk" (41
     characters) in "Path": the box holds
     "abcdefghijabcdefghijabcdefghijabcdefghij", the first 40 (Fields).
   - **Refusals**: in the same window empty "Path" and press "Save":
     "This field is required." under "Path". Type "about us" in "Path"
     and press "Save": "The path field must contain only alphanumeric
     characters plus '.', '/', '-', and '_'.". Replace it with "about-us"
     and press "Save": "This path already exists for another static
     page.". Replace it with "second", empty "Title" and press "Save":
     "This field is required." under "Title". Each time the window stays
     open with the message under the box, and the list is unchanged
     (Fields). Press the back arrow, and "OK" if the browser asks: the
     window closes and the list still holds "About us" and "Fees" and no
     third page (Rule 30).
   - **Deleted**: press the "Settings" arrow of "Fees", then "Delete": a
     window headed "Delete" reads "Are you sure you wish to delete this
     item? This action cannot be undone." with "OK" and "Cancel"; press
     "OK": the row goes. The visitor opens {journal address}/fees: a bare
     "404 Not Found" page (Rule 14).
   - **Control**: before the plugin was ticked, Settings › Website had
     no "Static Pages" tab (Settings bullet 1).

8. **{OPS} No static pages on a preprint server**

   Given: Preprint Server Manager, on the seeded preprint server.

   - **The tabs**: open Settings › Website: its top tabs hold no "Static
     Pages" (Purpose).
   - **The Plugins list**: open "Plugins" › "Installed Plugins": no
     "Static Pages Plugin" is listed (Purpose).
   - **Control**: the same list holds "Custom Block Manager" under
     "Generic Plugins" (Purpose; Rule 17).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - an SVG chosen through "Browse for an image" refused with the site's types message, a PNG still stored (A16; the guard its issue report names)
  - a BMP dropped and one pasted into a custom page's "Content": each refused with its notice and gone from the box, the saved page holding no embedded picture (A17; the guard its issue report names)
  - a change made only in "Content" of the static page window and of the block window, then the back arrow: the question "The data on this form has changed. Do you wish to continue without saving?" (A19; the guard its issue report names)
  - a static page and a "Custom Page" item saved at "dot.only" and "deep/Mixed_1.x", each opening at its address (A10; the guard its issue report names)
  - with two form languages and the second language's editor held back, the first language's "Content" box in the block and item windows taking the click and the text, no spinner left (A20; the guard its issue report names)
  - "Add Static Page" on the tab left open after "Static Pages Plugin" is unticked: no server error {OJS OMP} (A12; the guard its issue report names)
  - a placed custom block's "Custom Block Manager" unticked, then a "Page Footer" saved on "Appearance" › "Setup" without a refusal (A15; the guard its issue report names)
  - a preview's address typed by a section editor, an author or a signed-out visitor: the access-denied page, or Login (A7; the guard its issue report names)
  - a picture over the server's file limit, and one over its request limit, chosen in "Insert/edit image": each refused with "Files larger than {size} can not be uploaded." and no server error (A18; the guard its two issue reports name)
  - a custom block listed in "Custom Blocks" and offered under "Sidebar" by its "Block Name", and by the new one after a rename (A1; the guard its issue report names)
  - a custom block named with "&", and one named only in the primary language by a manager working in another, each opened with "Edit" and placed under "Sidebar" (A4, A13; the guard their issue report names)
  - deleting a custom block: "OK" closing the window, the block gone from the Custom Block Manager's list, the sidebar and "Sidebar" (A14; the guard its issue report names)
- **Rarely met**:
  - "Static Pages Plugin" unticked with pages stored: every page answering "404 Not Found" and the tab gone, then the pages back when it is ticked again {OJS OMP} (Settings bullet 1; Rule 15)
  - "Custom Block Manager" unticked with a block placed: the block leaving the public pages and "Sidebar", then back at its place when it is ticked again (Settings bullet 2; Rule 25)
  - a contact changed on Settings › Journal › "Contact": every page carrying its tag showing the new value (Rule 4; Settings bullet 5)
- **Nothing new to test**:
  - the site's own custom page as the Site Administrator: its page inside the site's header and footer, its "Insert Tag" reading "No tags are available." and its "Preview" (Rule 8)
  - the site's own custom block as the Site Administrator, placed on the site's pages and never on a journal's (Rule 27)
  - "Users must be registered and log in to view the journal site." ticked: a signed-out visitor sent to Login from a custom page or a static page (Settings bullet 6)
  - the Login page of a journal closed to visitors showing the placed blocks (Actors row 8)
  - "Preview" in an interface language whose boxes are empty, showing the primary language's texts (Rule 7)
  - a static page listed by its primary-language title for a manager working in another language {OJS OMP} (Rule 10)
  - the static page window's line on a journal with more than one language under "UI", its address carrying "/en/" {OJS OMP} (Fields)
  - an item at "search" taking the header's "Search", "search/search" still opening the Search page (Rules 6, 6a)
  - the block window's close control and Escape asking after a "Block Name" change (Rule 30a)
  - the browser's "Leave site?" question when another address is opened with either window changed (Rule 30b)
  - a pasted or dropped picture stored as "mceclip{n}.png" (Rule 29c)
  - the Editor and the Production Editor on the Settings pages: the same items, plugins, static pages, blocks and "Sidebar" as the Journal Manager in scenarios 1 to 7 (Actors rows 1, 5, 6, 7)
- **Register carries it**:
  - A1 (a block listed and placed by a name made from its first "Block Name", never renamed; Rules 18a, 22; scenario 4 marks it)
  - A2 (a deleted block's place kept in the sidebar; Rule 24a)
  - A3 (a static page with no breadcrumbs and no main heading {OJS OMP}; Rule 12; scenario 7 marks it)
  - A4 (a block named only outside the manager's interface language kept as a blank row; Rule 26a)
  - A5 (".jpeg" pictures refused; Rule 29)
  - A6 (a static page and a "Custom Page" item on one path, the static page unreachable {OJS OMP}; Rule 16)
  - A7 (the blank page a typed preview address gives below manager level and signed out; Actors row 2; scenario 3 marks it)
  - A8 (the site's "Static Pages Plugin" row, ticked to no effect {OJS OMP}; Settings bullet 1)
  - A9 ("Paste" on the editor's bar pasting nothing; Fields)
  - A10 (a static page with a "." in the first or second part of its "Path" answering "404 Not Found" {OJS OMP}; Fields)
  - A11 (the static page window repeating an old refusal after a good save {OJS OMP}; Rule 10)
  - A12 ("Add Static Page" failing on the tab left open after the plugin is unticked {OJS OMP}; Rule 15)
  - A13 (a block whose name holds "&" never placed, edited or deleted; Rule 18b)
  - A14 (a custom block's "Delete" failing, the block staying in the list, the sidebar and "Sidebar"; Rule 24)
  - A15 ("Appearance" › "Setup" refusing a save over a placed block while "Custom Block Manager" is unticked; Rule 25a)
  - A16 (a ".pdf" or ".svg" chosen in the picture window ignored with no message; Rule 29)
  - A17 (a refused pasted or dropped picture kept in the text, embedded; Rule 29c)
  - A18 (a picture over the server's upload limit getting a server error, never the size message; Rule 29)
  - A19 (a change only in the static page window's "Content" lost without a question {OJS OMP}; Rule 30)
  - A20 (the first language's "Content" box left under a "Loading..." spinner when the second language's box loads last; Fields)
- **No seed**:
  - another picture allowance: only the installation's configuration file sets it (Settings bullet 7; Rule 29a)
- **Owned by another feature**:
  - the Section Editor, the Assistant, the Author, the Reviewer and the Reader kept out of the Settings pages (Actors preamble; [Journal identity & about pages](U07-journal-identity-and-about-pages.md) scenario 2)
  - ticking and unticking "Static Pages Plugin" and "Custom Block Manager": their notices and the "Disable" question (Actors row 4; Rules 9, 17; *Plugins management*)
  - a site hosting one journal, with no "Site Setup" › "Navigation", "Plugins" or "Appearance" tab (Settings bullet 8; *Site settings*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | Custom blocks are listed by a lower-case name built from their first "Block Name", even after a rename | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | A static page has no breadcrumbs and no main heading, where a custom page has both | 🐞 | minor | — |
| [A4](#a4) | A custom block named only outside the manager's interface language is kept as a blank row with neither "Edit" nor "Delete" | 🐞 | medium · crash: script | issues (claude), 2026-10-01 — re-verified |
| [A7](#a7) | Typing a page preview's address below manager level, or signed out, gives a blank page | 🐞 | low · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A10](#a10) | A static page or custom page whose "Path" has a "." in its first two parts answers "404 Not Found" | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | After a refused "Save" in the static page window, the next successful save shows the old refusal at the top right | 🐞 | minor | — |
| [A12](#a12) | Right after "Static Pages Plugin" is unticked, the tab's "Add Static Page" fails on the server | 🐞 | low · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A13](#a13) | A custom block whose name holds "&" can never be placed, edited or deleted | 🐞 | medium · crash: script | issues (claude), 2026-10-01 — re-verified |
| [A14](#a14) | A custom block cannot be deleted on PostgreSQL: "OK" spins and the block stays | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A15](#a15) | With "Custom Block Manager" unticked, "Appearance" › "Setup" refuses every save over a placed block it no longer lists | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A16](#a16) | An SVG, a PDF or any file but a JPEG, PNG, GIF, BMP or WEBP is ignored in "Insert/Edit Image", with no message | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A17](#a17) | A dropped or pasted picture the site refuses stays in the text, embedded, and is saved | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A18](#a18) | A picture over the upload limit gets a server error, never "Files larger than {size} can not be uploaded." | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A19](#a19) | Closing a static page, custom block or reviewer email window after editing only its text loses the text without asking | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A20](#a20) | With two form languages, the first language's "Content" box can stay under a "Loading..." spinner for good | 🐞 | medium · crash: script | issues (claude), 2026-10-01 — re-verified |
| [A2](#a2) | A deleted custom block would keep its place in the sidebar, so a later block of the same name appears unplaced | ❓ | minor | — |
| [A5](#a5) | Pictures named ".jpeg" are refused while ".jpg" is accepted | ❓ | user-visible | — |
| [A6](#a6) | A static page and a "Custom Page" item can take the same path, and the static page is then unreachable | ❓ | minor | — |
| [A8](#a8) | The site's Plugins list offers "Static Pages Plugin", and ticking it changes nothing | ❓ | minor | — |
| [A9](#a9) | "Paste" on the editor's bar pastes nothing and asks for the keyboard instead | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — Custom blocks are listed by a lower-case name built from their first "Block Name", even after a rename** · 🐞 · low.
A manager who types "Our Partners" as a custom block's "Block Name"
expects to find "Our Partners" in the "Custom Blocks" list and in the
"Sidebar" list on "Appearance" › "Setup", where blocks are picked for
the public pages. Instead both read "our-partners" ("our-partners
(Custom Block)"). After the block is renamed "Friends" they still read
"our-partners", while the public pages show "Friends".
Nothing is lost and the block works. But other names come out harder
to recognise ("News 2026 & Events" is listed as "news2026&-events"),
so a journal with several blocks, or with renamed ones, has to open
each block to tell which entry is which before ticking one under
"Sidebar".
Basis: probe, 2026-10-01. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A deleted custom block keeps its place in the sidebar** · ❓ · minor.
A manager who deletes a block that is placed in the sidebar expects its
place to go with it. As read from the code, the "Sidebar" setting keeps
the block's name instead: a block added later under the same "Block
Name" appears on every public page at once, at the old place, before the
manager has ticked it. This cannot be seen on the test installs, where
"Delete" fails ([A14](#a14)).
Question: should deleting a block also take its place out of the
"Sidebar" setting? Lean: yes; a block that appears without being placed
is not what any manager expects.
Basis: code. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A static page has no breadcrumbs and no main heading** · 🐞 · minor · {OJS OMP}.
A visitor expects a static page to look like the journal's other pages,
a custom page among them: breadcrumbs "Home / {Title}" and the title as
the page's main heading. Instead a static page has no breadcrumbs, and its
title is a second-level heading, so the page has no main heading for
screen readers and outline tools.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A custom block named only outside the manager's interface language cannot be edited or deleted** · 🐞 · medium · crash: script.
The browser requires the "Block Name" box of the journal's primary
language, but the block's name is made from the box of the manager's
interface language. A manager working in French who types only the
English name expects a block they can find and correct. Instead the
"Custom Blocks" list gains a blank row with no arrow, so neither "Edit"
nor "Delete", and ticking the block under "Sidebar" is refused, so the
block can never be shown, corrected or deleted from the screens. It
needs a journal offering more than one interface language.
Basis: probe, 2026-10-01. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — ".jpeg" pictures are refused** · ❓ · user-visible.
A manager uploading a photo named "photo.jpeg", the usual name a camera or
phone gives, is refused with "You can only upload the following types of
files: gif, jpg, png, webp.", while the same file renamed "photo.jpg" is
accepted.
Question: should the picture upload accept the ".jpeg" name of a JPEG
file? Lean: yes; the refusal looks like an omission from the list.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A static page and a custom page can share a path** · ❓ · minor · {OJS OMP}.
The static page window refuses a path another static page holds, and the
"Custom Page" item window one another item holds, but neither looks at the
other kind: both save the same path, and at that address the custom page
opens while the static page can no longer be reached, with nothing on
either screen saying so.
Question: should each window refuse a path the other kind already holds?
Lean: yes; the windows' own note says "No two pages can have the same
path.".
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Typing a page preview's address below manager level, or signed out, gives a blank page** · 🐞 · low · crash: server.
The application fails on the server when anyone below manager level (a
section editor, an assistant, an author, a reviewer, a reader) types the
address of a page preview, or when a signed-out visitor does: the
browser shows a blank page. The addresses are the custom page preview,
{journal address}/navigationMenu/preview, and, with "Static Pages
Plugin" on, the static page preview, {journal address}/pages/preview.
The person who types the address expects the access-denied page, or
Login when signed out.
Nothing is lost: only managers and the Site Administrator may preview,
and no link leads anyone else to these addresses. But the person gets no
page and no reason, and every such visit adds a server error to the
log. The fix is a few lines, but in two repositories (pkp-lib, and the
Static Pages plugin with its pointer in OJS and OMP), hence medium
effort; within one it would be small.
Basis: probe, 2026-10-01. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The site's Plugins list offers "Static Pages Plugin", to no effect** · ❓ · minor · {OJS OMP}.
On Administration › "Site Settings" › "Plugins" › "Installed Plugins"
the Site Administrator finds "Static Pages Plugin", unticked. Ticking it
shows "The plugin "Static Pages Plugin" has been enabled.", and nothing
follows: the site gets no "Static Pages" tab and the row no
"Edit/Add Content".
Question: should the site's list offer the plugin at all? Lean: no;
hide it there, or give the site static pages, since a plugin that
reports itself enabled and does nothing misleads.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — "Paste" on the editor's bar pastes nothing** · ❓ · minor.
Every "Content" box of this spec starts its bar with "Copy" and "Paste".
"Paste" puts nothing into the box and shows "Your browser doesn't support
direct access to the clipboard. Please use the Ctrl+X/C/V keyboard
shortcuts instead."; only the keyboard pastes.
Question: should the bar offer a "Paste" button that cannot paste in the
browsers the application supports? Lean: no; a button that only says it
cannot work is better left off the bar.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A static page or custom page whose "Path" has a "." in its first two parts answers "404 Not Found"** · 🐞 · medium.
A manager adds a static page, or a "Custom Page" item under Settings ›
Website › "Setup" › "Navigation", and gives it a "Path" with a "." in
its first or second part. The parts are what "/" separates, so
"dot.only" and "deep/Mixed_1.x" qualify and "one/two/three.x" does not.
The static page window and the item window both save it, because their
rule for "Path" allows a ".": "The path field must contain only
alphanumeric characters plus '.', '/', '-', and '_'." The page is
listed. But its address, typed or followed from the list's "Path" link,
answers a bare "404 Not Found" page. A "." in a later part works.
Nobody is told that the path cannot be used: the manager finds out by
opening the page, or when readers report a dead menu link. Saving the
page under a path without a "." in its first two parts makes it
reachable.
Static pages come from the Static Pages plugin, which ships with OJS and
OMP; "Custom Page" items exist in all three apps. The fix touches two
repositories, pkp-lib and the Static Pages plugin.
Basis: probe, 2026-10-01. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The static page window repeats an old refusal after a good save** · 🐞 · minor · {OJS OMP}.
A manager whose "Save" was refused for its "Path" corrects the path and
saves: the window closes and the page is listed, but a red notice at the
top right repeats the earlier refusal ("The path field must contain only
alphanumeric characters plus '.', '/', '-', and '_'."), as if the save
had failed. With the window closed after the refusal instead, the notice
shows on the next load of Settings › Website.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — Right after "Static Pages Plugin" is unticked, the tab's "Add Static Page" fails on the server** · 🐞 · low · crash: server · {OJS OMP}.
The application fails on the server when a manager unticks "Static
Pages Plugin" and then, on the same open Settings › Website page, presses
"Add Static Page". The "Static Pages" tab stays until the page is
reloaded. The button opens an empty window. Over it, a window "Error"
says "An unexpected error has occurred. Please reload the page and try
again."
The user sees that same "Error" window with the fix too, and a reload
takes the tab away. The difference is the server's answer: today a PHP
fatal error and status 500, written to the server log; with the fix a
"404 Not Found" and nothing logged. On 3.4, before the change that broke
it, the server answered 404 and the browser showed "Failed Ajax request
or invalid JSON returned." (read in the code, not driven).
The same server error answers every address that the settings pages'
tables and windows load when no code serves it. In normal work only a
page left open while a plugin is turned off leads there; otherwise it
takes an address entered by hand or a screen that sends a wrong address.
The fix is one parameter type in the shared router.
Basis: probe, 2026-10-01. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A custom block whose name holds "&" is stuck** · 🐞 · medium · crash: script.
A manager who names a block "News 2026 & Events" gets it saved and
listed as "news2026&-events". Its row's "Edit" and "Delete" do nothing,
because the window's own script fails as the list loads, and ticking it
under "Sidebar" is refused with "This may only contain letters,
numbers, dashes and underscores.". The block can never be shown,
corrected or deleted from the screens.
Basis: probe, 2026-10-01. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A custom block cannot be deleted on PostgreSQL: "OK" spins and the block stays** · 🐞 · medium · crash: server.
On an installation whose database is PostgreSQL, "OK" in a custom
block's "Delete" window leaves the window open with a spinner and no
message. The block stays in three places: the Custom Block Manager's
list, the sidebar on the public pages, and Settings › Website ›
"Appearance" › "Setup" › "Sidebar".
"Delete" is the only way to remove a block, both for a journal's blocks
and for the site's. A manager can still take a block off the public
pages by unticking it under "Sidebar", but it stays in the Custom Block
Manager's list for good.
Basis: probe, 2026-10-01. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — "Appearance" › "Setup" refuses to save over a block it no longer lists** · 🐞 · medium.
A manager who unticks "Custom Block Manager" while a custom block is
placed in the sidebar expects the rest of the site's settings to save
as before. Instead every save on Settings › Website › "Appearance" ›
"Setup" (a new "Page Footer", say) is refused under "Sidebar" with "The
our-partners block can not be found. Please make sure the plugin is
installed and enabled.", although "Sidebar" no longer lists that block,
and nothing on the tab is saved. The save goes through once the
"Sidebar" list is changed (a box ticked or unticked, or a block moved);
that save also takes the block out of the stored sidebar without a
word, so when the plugin is ticked again the block comes back unticked
and stays out of the sidebar until the manager ticks it again. The same
holds for any block plugin turned off
([Appearance & theming](U10-appearance-and-theming.md#a4)).
Basis: probe, 2026-10-01. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — An SVG, a PDF or any file but a JPEG, PNG, GIF, BMP or WEBP is ignored in "Insert/Edit Image", with no message** · 🐞 · low.
A manager opens "Insert/edit image" in a formatted text box, goes to
"Upload" and chooses an SVG drawing or a PDF through "Browse for an
image", or drops one onto "Drop an image here". They expect the picture,
or a refusal that says why. Nothing happens: the window stays on
"Upload", nothing is sent to the site, and no message shows. Any file
other than a JPEG, PNG, GIF, BMP or WEBP is ignored the same way, an
AVIF, HEIC or TIFF picture included.
The site refuses these files anyway, so nothing is lost. But a BMP
chosen in the same window gets "You can only upload the following types
of files: gif, jpg, png, webp.", and these files get no reason at all.
Saving the picture as PNG gets round it.
It happens in every formatted text box with "Insert/edit image": the
custom page, custom block and static page windows, the settings forms
(masthead, information, privacy, appearance and announcements), and
also a reviewer's comment boxes and every user's profile biography.
Basis: probe, 2026-10-01. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — A dropped or pasted picture the site refuses stays in the text, embedded, and is saved** · 🐞 · low.
A manager drags a picture from their computer into a formatted text
box, or pastes one, and the site refuses it. A notice over the box
reads "Failed to upload image:" and the reason, for a BMP "You can only
upload the following types of files: gif, jpg, png, webp.". The manager
expects the picture to be gone. Instead it stays in the box, its data
written into the text itself rather than stored as a file.
"Save" keeps it that way. The public page then holds an `<img>` whose
address is the picture's own data: the browser draws a refused picture
as usual, and a refused file that is not a picture as a broken picture.
Each later picture dropped into the box sends the refused ones again
and repeats their notices. Deleting the picture by hand before saving
gets round it.
It happens in every formatted text box that takes pictures: the custom
page, custom block and static page windows, and the settings forms.
Basis: probe, 2026-10-01. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — A picture over the upload limit gets a server error, not the size message** · 🐞 · medium · crash: server.
A manager uploading a picture through "Insert/edit image" expects
"Files larger than {size} can not be uploaded.", the message the
application gives for a file over the limit on its other uploads.
Instead the application fails on the server. Over the limit for one
uploaded file (PHP's default 2 MB, less than many phone photos), the
alert over the "Insert/Edit Image" window reads "Path must not be
empty" for a PNG, JPEG or GIF picture, or "One or more files could not
be uploaded." for a WEBP one. Over the limit for a whole request (8 MB
by default), it reads "The POST data is too large.", in English
whatever the interface language. None of them tells the manager to send
a smaller file.
Basis: probe, 2026-10-01. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — Closing a static page, custom block or reviewer email window after editing only its text loses the text without asking** · 🐞 · medium.
A manager writes or edits the text of a static page in its "Content"
box, then presses the window's back arrow. The window closes at once and
the text is gone, without a word. After a change to "Path" or "Title"
the same arrow first asks "The data on this form has changed. Do you
wish to continue without saving?", so the manager has no reason to
expect the loss. Going to another address with the window open loses
the text the same way, without the browser's "Leave site?" question.
The custom block window loses its "Content" the same way. So do an
editor's email windows to a reviewer: an editor who adds a line to the
message in "Thank Reviewer" or "Unassign Reviewer" and closes the panel
loses it without a question, and the window opens again with the
template's text. Any other window built with the older form code does
the same when its formatted-text box is the only thing changed (listed
under Cause). Pressing "Save" or sending before closing is the
only way round.
Basis: probe, 2026-10-01. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — With two form languages, the first language's "Content" box can stay under a "Loading..." spinner for good** · 🐞 · medium · crash: script.
On a journal whose form languages are English and French, a manager
opens the custom block window ("Add Block") or the "Custom Page" item
window. Each has a "Content" box per language. Now and then the page's
script fails as the window opens, and a "Loading..." spinner covers the
"Content" box of the first form language (here English) for as long as
the window is open. That box takes no click, and typing already begun
stops reaching it. Nothing says why.
The manager loses the "Content" box of that window, and any letters
typed before the spinner came. Reloading the page and opening the
window again gets round it in the usual case: the fault is a race, and
a fresh load normally comes out in the safe order.
It happens only when the second language's box is slow to start. In
pkp-e2e's test runs it came up once on its own, in a full suite run on
a loaded machine. Run 35 times per app without anything holding the
second box back, the same tests passed every time.
Basis: probe, 2026-10-01. <sup>f-a20</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-24 at the checkouts' tips: ojs 71bb244152, omp
a36551804, ops 07141ae4df, each with lib/pkp 25182919bf and ui-library
1afd40a9; the `customBlockManager` plugin at 1f8d452 and `tinymce` at
16368cd in all three, `staticPages` at 45d02c0 in OJS and OMP. Every file
behind this feature is byte-identical in the apps that carry it, and no
app or default theme overrides its templates. Labels are resolved app
locale first, then lib/pkp, then the plugin's own; no app overrides a key
quoted here. Every claim of the body was driven on the three test
installs on 2026-09-24 (static pages on OJS and OMP, OPS read for their
absence), except three states those installs cannot reach: an upgrade
(note n), a site with one journal (note m) and the place a deleted
custom block leaves (note f-a2). The test installs run PostgreSQL, take
pictures up to 2 MB per upload and 8 MB per request, and each hosts
several hundred journals. The `td` notes record what each drive saw.

<a id="fn-a"></a>
**a** — "Custom Page" is `NavigationMenuItem::NMI_TYPE_CUSTOM`, titled
`manager.navigationMenus.customPage` in
`PKPNavigationMenuService::getMenuItemTypes()`; its page is served by
`lib/pkp/pages/navigationMenu/NavigationMenuItemHandler.php`. The Static
Pages plugin is the `plugins/generic/staticPages` submodule of OJS and
OMP; OPS's `plugins/generic` holds no `staticPages` (it holds
`customBlockManager`, `tinymce` and the rest). Live-probed 2026-09-24
(Purpose; three apps): each kind written on its own screen and shown,
signed out, inside the journal's header and footer (td1, td9, td19); on
OPS, Settings › Website has the tabs "Appearance", "Setup", "Plugins"
and "Content", and neither the journal's nor the site's "Installed
Plugins" lists a static pages plugin, while the "Custom Block Manager"
row is there.

<a id="fn-n"></a>
**n** — `Upgrade::migrateStaticPagesToNavigationMenuItems()` in OJS's
and OMP's `classes/install/Upgrade.php`, called on every upgrade from
`dbscripts/xml/upgrade.xml`, turns each static page into a "Custom Page"
item through `NavigationMenuItemDAO::portStaticPage()` and deletes the
static page, skipping (with a server-log warning) one whose path a
"Custom Page" item already holds. No screen runs an upgrade, so this is
read from the code; the one check is to upgrade an older install that
holds a static page and open Settings › Website › "Setup" ›
"Navigation".

<a id="fn-b"></a>
**b** — Who opens the Settings pages: *Journal identity & about pages*,
note b there. The "Custom Page" item window is served by
`NavigationMenuItemsGridHandler` (*Navigation menus & site chrome*, its
note l). The static pages screens are `StaticPageGridHandler` and
`StaticPageForm`; the custom blocks screens `CustomBlockGridHandler` and
`CustomBlockForm`, reached from the Plugins grid through
`SettingsPluginGridHandler::manage()` (a journal) or
`AdminPluginGridHandler` (the site). `PluginGridRow` offers a plugin's own
links ("Edit/Add Content", "Manage Custom Blocks") only to a user who may
edit that plugin; `CustomBlockManagerPlugin::isSitePlugin()` is true only
outside a journal, so inside one the journal's managers edit it. The site
tabs: `AdminHandler::siteSettingsAvailability()` gives `navigationMenus`,
`sitePlugins` and `siteAppearance` only when the journal count is not 1.
Live-probed 2026-09-24 (Actors preamble, rows 1, 4–7; three apps), one
throwaway account per role: the Journal Manager, the Editor and the
Production Editor (OJS, OMP), the Manager (OPS) and the Site
Administrator have "Settings" in the side menu, open Settings › Website,
and are offered Navigation's "Add item", both plugin rows, "Add Static
Page" (OJS, OMP), "Add Block" and "Sidebar"; the Editor added a custom
page, a static page and a block that a signed-out visitor then read. An
Editor whose role has "Permit changes to Settings" unticked (OJS, OMP),
the Section Editor, an Assistant (Copyeditor; on OPS an Editorial Board
Member), the Author and the Reviewer have no "Settings" group and get
"The current role does not have access to this operation." at the
Settings address; the Reader has no side menu and gets the same page.
With a plugin unticked its row has no arrow, so no link. The site's top
tabs read "Site Setup", "Appearance", "Announcements", "Plugins", with
"Navigation" inside "Site Setup".

<a id="fn-c"></a>
**c** — Previews: `NavigationMenuItemHandler::preview()` (address
`{journal}/navigationMenu/preview`) and, for static pages,
`StaticPagesPlugin::callbackHandleContent()` answering
`{journal}/pages/preview` with an unsaved `StaticPage` handed to
`StaticPagesHandler::view()`. Both throw `Exception('The current user is
not permitted to preview.')` unless the user's roles in the context
include the manager or site administrator role; a signed-out request has
no role list at all. Both substitute the contact tags as note j says. The
buttons: `NavigationMenuItemsFormHandler.js::showPreview_()` and the
plugin's `js/StaticPageFormHandler.js::showPreview_()` post the whole form
and write the answer into `window.open('about:blank')`. Live-probed
2026-09-24 (Actors row 2; Rules 7, 13; three apps, static pages OJS
OMP): td6, td7; with "Static Pages Plugin" off, `{journal}/pages/preview`
answers "404 Not Found".

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-24 (Actors row 2, A7; three apps,
`pages/preview` on OJS and OMP): `{journal}/navigationMenu/preview` and
`{journal}/pages/preview` typed by each throwaway role and signed out.
The Journal Manager, the Editor, the Production Editor, the Site
Administrator and the Editor without "Permit changes to Settings" got
the journal's page with an empty heading (tab "| {journal name}",
breadcrumbs "Home /" on the item preview); the Section Editor, the
Assistant, the Author, the Reviewer, the Reader and a signed-out visitor
got a blank tab, status 500 with an empty body. On a closed journal the
signed-out request went to Login (td32). From the windows' "Preview",
the Editor, the Production Editor, the Manager (OPS) and the Site
Administrator got the unsaved page.

<a id="fn-d"></a>
**d** — The address: `PKPTemplateManager::initialize()` registers
`PKPNavigationMenuService::_callbackHandleCustomNavigationMenuItems()` on
`LoadHandler`, which `PKPPageRouter::route()` calls before it looks for a
built-in `pages/<page>/index.php`. The callback joins the requested page,
op (when not `index`) and arguments with "/" and asks
`NavigationMenuItemDAO::getByPath()` for a `NMI_TYPE_CUSTOM` item of the
journal (or of the site, id 0) with that path, whether or not a menu
holds it; found, it hands the request to `NavigationMenuItemHandler::view()`,
so a custom path wins over a built-in page of the same address, while a
longer address ("about/editorialMasthead") joins to another path and
reaches its own page. With no item and no page file the router throws
`NotFoundHttpException`. The menu link: `PKPNavigationMenuService`
(`NMI_TYPE_CUSTOM` in the URL switch) splits the path into page, op and
arguments. The page:
`lib/pkp/templates/frontend/pages/navigationMenuItemViewContent.tpl`
includes `header.tpl` with `pageTitleTranslated=$title`, `breadcrumbs.tpl`
with `currentTitle=$title` ("Home" `common.homepageNavigationLabel`, "/"
`navigation.breadcrumbSeparator`), `<h1 class="page_title">`, the content,
`footer.tpl`; `headerHead.tpl` appends " | {journal name}" to the title of
every page but the home page. No `editLink.tpl` include. Languages:
`NavigationMenuItem::getLocalizedTitle()` / `getLocalizedContent()` →
`DataObject::getLocalizedData()` (the interface language, then the
journal's primary language, then any). A journal closed to signed-out
visitors: `PKPHandler::authorize()` adds `RestrictedSiteAccessPolicy`
for every page handler, this one included. Live-probed 2026-09-24
(Rules 1–3, 5, 6; Actors row 3; three apps): td1–td5, td32. Every page
answers at the journal's address with the interface language's segment
added ("{journal}/en/our-page").

<a id="fn-td32"></a>
**td32** — Live-probed 2026-09-24 (Actors rows 3, 8; Settings bullet 6;
three apps): on Settings › Users & Roles › "Site Access Options" the box
reads "…to view the journal site." on OJS, "…to view the press site." on
OMP and "…to view the server site." on OPS, unticked on a new journal.
Ticked and saved: signed out, a custom page, a deeper custom page, a
static page (OJS, OMP), the home page and a preview address each landed
on Login, whose sidebar showed the two placed custom blocks and whose
header kept the menu's "Our page" link. A Reader signing in there landed
back on the custom page, and the static page then opened. Unticked again,
the custom page opened signed out.

<a id="fn-f"></a>
**f** — Static pages: `StaticPageGridHandler::initialize()` (title
`plugins.generic.staticPages.staticPages` "Static Pages", empty row
`…noneCreated` "No static pages have been created.", action
`addStaticPage` "Add Static Page", columns `pageTitle` "Title" and `path`
"Path"; data from `StaticPagesDAO::getByContextId()`, which has no ORDER
BY, so the database's own order shows: on PostgreSQL the order the rows
sit on disk, usually the order they were last written, which usually
puts an edited page last, though a rewritten row may fill an earlier gap
and parallel writes change the layout; re-read 2026-09-26, not seen out
of that order on screen); `StaticPageGridRow`
("Edit" `grid.action.edit`, an `AjaxModal` titled "Edit"; "Delete"
`grid.action.delete` through `RemoteActionConfirmationModal` with
`common.confirmDelete` "Are you sure you wish to delete this item? This
action cannot be undone."; buttons `common.ok` / `common.cancel`);
`StaticPageGridCellProvider` (the path cell is a `RedirectAction` to the
journal's address + "/" + path, opened in a window named `staticPage`).
`StaticPageForm`: `FormValidatorRegExp` on `path`, required,
`/^[a-zA-Z0-9\/._-]+$/`, `…pathRegEx`; `FormValidatorCustom` on `path`,
`…duplicatePath`, comparing only with `StaticPagesDAO::getByPath()`
(static pages of the journal); `FormValidator` on `title`, required,
`…nameRequired` (a key with no string in the plugin's locale files; on
screen an empty "Path", and an empty "Title" in the primary language,
are refused by the page itself with "This field is required." before any
request, so neither server message shows for them).
`editStaticPageForm.tpl`: `path` `maxlength="40"`, `title` multilingual
`maxlength="255"`, the `viewInstructions` line with the journal's page
address and "%PATH%" (built by `PKPPageRouter::url()`, which adds the
language segment only when the journal has more than one language under
"UI": the interface language when the journal offers it, else the
primary one), `content` `rich=true` with the contact tags,
`previewButton` "Preview", and a submit "Save" (no cancel button).
`updateStaticPage()` answers `DAO::getDataChangedEvent()` with no
notification; the plugin's `pageSaved` / `pageDeleted` strings have no
caller. The page: the plugin's `templates/content.tpl` includes
`header.tpl` with `pageTitleTranslated=$title`, then `<h2>` with the
title, the content and `footer.tpl`: no `breadcrumbs.tpl`, no `<h1>`.
Unsaved changes: the legacy form handler's tracking, as the item window
(*Navigation menus & site chrome*, note l). Live-probed 2026-09-24
(Fields, the "Static Pages" tab and window; Rules 10–14, 30; OJS, OMP):
td10–td14, td17.

<a id="fn-g"></a>
**g** — Custom blocks: `CustomBlockManagerPlugin::register()` registers,
while the plugin is enabled, one `CustomBlockPlugin` per name in its
`blocks` setting (per journal, or the site's with id 0);
`getActions()` adds "Manage Custom Blocks"
(`plugins.generic.customBlockManager.manage`), an `AjaxModal` titled with
the display name "Custom Block Manager"; `manage()` loads the grid.
`CustomBlockGridHandler::initialize()`: title "Custom Blocks", empty row
"No custom blocks have been created.", action "Add Block", one column
"Block Name" whose cell is the stored block name. `CustomBlockGridRow`
adds "Edit" and "Delete" (`common.confirmDelete`) only when the row's id
(the block name) is not empty. `CustomBlockForm`: `FormValidator` on
`blockTitle`, required (the server's check passes for a language map, as
note f says; on screen the primary language's empty box is refused before
any request); `execute()` for a new block builds the name from
`blockTitle[<the interface language>]` with `Str::of()->lower()->kebab()`
(note f-a1) and a `preg_replace()` whose bracket delimiters make it
remove nothing, appends `uniqid()` (13 hexadecimal characters) when the
name is taken, adds it to `blocks`, calls `setEnabled(true)`, and stores
`blockTitle`, `blockContent`, `showName` on the block; an edit never
renames. `editCustomBlockForm.tpl`: `blockTitle` multilingual text,
`blockContent` `rich=true` without tags, the `showName` box
(`plugins.generic.customBlock.showName` "Show Name", its label
`…showName.description`), `fbvFormButtons` "Save" and "Cancel".
`CustomBlockPlugin::getDisplayName()`: the name + " (Custom Block)";
`getHideManagement()` keeps the blocks off the Plugins list;
`getContents()` picks the title and the content in the interface language,
else the journal's (or site's) primary language, box by box, and passes
`showName`; `templates/block.tpl` shows the block with id
`customblock-{name}`, its title as a heading visually hidden while
`showName` is off, then the content. `deleteCustomBlock()` deletes the block's `enabled`, `context`,
`seq` and `blockContent` settings and takes the name out of `blocks`; the
journal's `sidebar` list is not touched. Live-probed 2026-09-24 (Fields,
the manager and block windows; Rules 17–27; three apps): td18–td27.

<a id="fn-h"></a>
**h** — The sidebar: `PKPAppearanceSetupForm` (and
`PKPSiteAppearanceForm` for the site) builds "Sidebar" (`FieldOptions`,
orderable) from `PluginRegistry::loadCategory('blocks', true)`, the
enabled block plugins, labelled by `getDisplayName()`, with the stored
`sidebar` list as its value. `PKPTemplateManager::displaySidebar()` prints,
in the stored order, each stored name that is a loaded, enabled block,
and skips the rest. On save, `PKPContextService` (and `PKPSiteService`)
refuses a posted name that is not an enabled block with
`manager.setup.layout.sidebar.invalidBlock` "The {$name} block can not be
found. Please make sure the plugin is installed and enabled.";
ui-library `FieldOptions.vue` keeps only listed options once the list is
changed on screen. Live-probed 2026-09-24 (Actors rows 7, 8; Rules 19,
25; Settings bullet 3; three apps): td20, td25, td32; a placed block
showed on the home page, a custom page, a static page, About, Search and
Login for every role and signed out, never on the bare "404 Not Found"
page, and with no block placed the home page had no sidebar. The Editor
placed a block from "Sidebar" too.

<a id="fn-i"></a>
**i** — Pictures: `PKPUploadPublicFileController::uploadFile()`
(`lib/pkp/api/v1/_uploadPublicFile/`, mounted by each app's
`api/v1/_uploadPublicFile/index.php`, address `{journal}/api/v1/_uploadPublicFile`):
allowed endings `gif`, `jpg`, `png`, `webp`, read from the lower-cased
name (`api.publicFiles.400.extensionNotSupported`); a file that fails
`getimagesize()` answers `…invalidImage`; a content type whose ending
differs, `…mimeTypeNotMatched`; the account's directory
`public/site/images/{username}` plus the new file over
`[files] public_user_dir_size` (`config.TEMPLATE.inc.php`: 5000,
kilobytes; "Set this to 0 to disallow such uploads.") answers
`…noDirSpace` with both numbers in kilobytes, rounded up; PHP's own
upload limits were meant to answer `api.files.400.fileSize` with
`Application::getReadableMaxFileSize()` (note f-a18). The stored name:
lower case, " ", "_", ":" → "-", then everything but `a-z 0-9 . -`
dropped; `_getFilename()` appends "-" + `md5(microtime())` while the name
is taken. The answer carries the file's address, which the editor puts in
the text; the file is stored whatever the editor does next. Editors: the
legacy `lib/pkp/js/controllers/SiteHandler.js` sets
`images_upload_handler` to the TinyMCE plugin's `uploadUrl`
(`TinyMCEPlugin::registerJS()`, the journal's or the site's API); the Vue
`FieldRichTextarea.vue` posts to its form's `uploadUrl` (Vue forms with
one: `PKPMastheadForm`, `PKPInformationForm`, `PKPPrivacyForm`,
`PKPAppearanceSetupForm`, `PKPAppearanceAdvancedForm`,
`PKPAnnouncementForm`). TinyMCE 7.9.3 names a pasted or dropped picture
`mceclip{n}.png` and reports a refused one as "Failed to upload image:
{message}". Nothing in the application deletes these files. Live-probed
2026-09-24 (Rule 29, 29a–29c; Side effects; Actors row 9; three apps):
td29–td31; the Editor's upload in a block and the Journal Manager's in
the "Page Footer" box of Appearance › Setup posted to the same address.

<a id="fn-j"></a>
**j** — The editor: `SiteHandler.js::initializeTinyMCE()` (TinyMCE
7.9.3) defines the bars: the default "copy paste | bold italic underline
| link unlink code fullscreen | image | pkpTags" and `fullToolbar` "copy
paste | blocks | bold italic underline | blockquote bullist numlist |
superscript subscript | link unlink code fullscreen | image | pkpTags",
with `block_formats` "Paragraph=p; Heading 2=h2; Heading 3=h3";
`lib/pkp/js/classes/Handler.js` gives `fullToolbar` to a `rich="full"`
box (the "Custom Page" item's "Content" in `customNMIType.tpl`) and the
default bar to `rich=true` (static page, custom block). Tags:
`plugins/generic/tinymce/plugins/pkpTags/plugin.js` (tooltip "Insert
Tag", items from the box's `data-variables`, "No tags are available."
when the list is empty), the lists from `PKPNavigationMenuItemsForm::fetch()`
and `StaticPageForm::fetch()` (`plugins.generic.tinymce.variables.*`:
"Principal Contact Name ("{$value}")", "Principal Contact Email (…)",
"Support Contact Name (…)", "Support Contact Phone (…)", "Support Contact
Email (…)"); `TinyMCEHelper.js::getVariableElement()` inserts a
`span.pkpTag.mceNonEditable`; `SiteHandler.js` stores it as
`{$contactName}` (and so on) on save and shows it as the label again on
load. `NavigationMenuItemHandler::view()` / `preview()` and
`StaticPagesHandler::view()` replace `{$contactName}`, `{$contactEmail}`,
`{$supportName}`, `{$supportPhone}`, `{$supportEmail}` with the journal's
values each time the page is shown, typed or inserted alike; the block
form passes no tags and `CustomBlockPlugin::getContents()` replaces
nothing. On a scratch journal the principal contact is "Site Admin"
<admin@mail.test> and the support contact empty (`seed-facts.md`).
Live-probed 2026-09-24 (Fields, the bars; Rules 4, 28; Settings bullet
5; three apps, the static page OJS OMP): td3, td28.

<a id="fn-td28"></a>
**td28** — Live-probed 2026-09-24 (Fields; Rules 4, 28; A9; three apps,
the static page OJS OMP): the bars read, by tooltip, as the Fields table
lists them ("Block Paragraph" showing "Paragraph", its choices
"Paragraph", "Heading 2", "Heading 3"); the item's and the static page's
"Insert Tag" listed the five tags with their values, the block's one
line, "No tags are available.". "{$contactName}" typed as text showed
"Site Admin" on a custom page and a static page, and "{$contactName}" as
typed in a block. "Paste" showed the clipboard notice and pasted nothing;
"Copy" then the keyboard's paste repeated the selected text.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-24 (Rule 10; Fields, the tab; OJS, OMP):
with the plugin on, "About us" / "about-us" / "Welcome" saved: the window
closed, the list "Static Pages" (columns "Title" and "Path", "Add Static
Page" above) showed "About us" and "about-us", no notice; each row's
"Settings" arrow revealed "Edit" and "Delete". "Fees" at "fees" and
"Aardvark" at "aardvark" were listed after it in that order; "About us"
saved again through "Edit" moved to the end and stayed there after a
reload. That order is the database's, not one the list sets (note f).
In the French interface a page with an English title only was
listed by it. A save after a refused one showed the old refusal (note
f-a11).

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-24 (Fields, the static page window; OJS,
OMP): "about us" and "café" refused with the characters message, a
second "about-us" with "This path already exists for another static
page.", an empty "Path" with "This field is required."; 41 characters
typed kept 40, and 40 saved; the path of a "Custom Page" item saved.
"Title" kept 255 of 256 characters; empty with English alone, it was
refused with "This field is required.", as was a French title alone on a
journal with both languages; an English title alone saved. Every refusal
kept the window open with the message under the box and the list
unchanged. Paths with ".": note f-a10.

<a id="fn-td33"></a>
**td33** — Test run 2026-09-24 (Fields, the static page window; scenario
7; OJS, OMP): on a scratch journal and a scratch press with English alone
under "UI", reached from the Plugins row's "Edit/Add Content", "Add
Static Page" showed the line with the bare address,
"http://127.0.0.1:8022/index.php/u9s7ojw2df2ugg/%PATH%" on OJS and
"http://127.0.0.1:8120/index.php/u9s7omw08zm8yi/%PATH%" on OMP, and the
rest of the line as Fields quotes it; the same reading held on a second
run of each. The "/en/" form is the live probe's reading (2026-09-24,
OJS, OMP) on a scratch journal with English and French under "UI", in the
English interface.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-24 (Rule 17; Fields, the manager window;
three apps): "Custom Block Manager" unticked under "Generic Plugins" on
a new journal, with no row arrow; ticked, "The plugin "Custom Block
Manager" has been enabled." and, without a reload, "Manage Custom
Blocks" on the arrow, opening "Custom Block Manager" with the list
"Custom Blocks", the column "Block Name", "Add Block" and "No custom
blocks have been created.". Unticking asked "Disable": "Are you sure you
want to disable this plugin?" and then showed "…has been disabled.".

<a id="fn-td26"></a>
**td26** — Live-probed 2026-09-24 (Rules 26, 26a, A4; three apps): with English
alone under "Forms", and with English and French, an empty English
"Block Name" was refused with "This field is required.", the French box
filled or not. A manager in the French interface who typed the English
name only saved a block with a blank row and no arrow; "Sidebar" listed
it as " (Custom Block)", and ticking it was refused with "This is not a
valid string." and "This may only contain letters, numbers, dashes and
underscores.".

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-24 (Rules 1, 2; Purpose; three apps): as
the Journal Manager, "Our page" at "our-page" and "Fees" at "info/fees"
saved in no menu ("Navigation menu item was successfully added"). Signed
out, as a Reader and as the manager, "/our-page" showed the tab "Our
page | {journal name}", the heading "Our page", the breadcrumbs "Home /
Our page", "Welcome to our page.", the header, the footer and the sidebar
blocks, with no "Edit" link for anyone; "/info/fees" likewise. Dragged
into "Primary Navigation Menu" and saved, the header's link pointed at
"{journal}/en/our-page" and opened it; after a "Path" change it pointed
at the new address, and after the removal the header no longer listed
it.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-24 (Rule 3; three apps): with English and
French under "Forms", an item with English texts only read "English
title" / "English text." at the French address (breadcrumbs "Accueil /
English title"); with French texts saved, the French address read them
and the English one kept the English. On a journal where French is an
interface language only, the French address read the English texts.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-24 (Rule 4; Settings bullet 5; three
apps): the menu read `Principal Contact Name ("Site Admin")`,
`Principal Contact Email ("admin@mail.test")`, `Support Contact Name
("")`, `Support Contact Phone ("")`, `Support Contact Email ("")`; a
chosen tag showed as grey text reading its menu line, went whole with
one Backspace and took no typing, and "Edit" showed it again after
saving. The page read "PN=Site Admin PE=admin@mail.test SN= SP= SE=
end."; after "Contact" saved "Ada Lovelace" as principal contact and
"Sam Support" with an email as support contact, the same page read
"PN=Ada Lovelace PE=admin@mail.test SN=Sam Support SP= SE={email} end.".

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-24 (Rule 5; three apps): "our-page" moved
to "our-new-page" ("Navigation menu item was successfully updated"): the
new address showed the page; the old one answered status 404 with a page
whose whole text is "404 Not Found", no header or footer, the same as a
never-used address. After "Remove" › "OK" the new address answered the
same.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-24 (Rule 6; three apps): an item at
"about" showed "About replacement" at "/about" signed out, as a Reader
and as the manager, and behind the header's "About" › "About the
Journal" ("About the Press", "About the Server"); an item at "search"
took "/search" and the header's "Search". "/about/editorialMasthead"
still opened "Editorial Masthead" and "/search/search" the Search page
with its form; with a static page at "about", "/about/contact" kept its
page too (td16). With both items removed, both built-in pages were back.
The note under "Path" read as Fields quotes it for a journal with more
than one language, "/en/" included.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-24 (Rules 7, 13; three apps, the static
page window OJS OMP): "Preview" opened a new tab whose address bar read
"about:blank": tab "Preview title | {journal name}", heading "Preview
title", "Preview text. Contact: Site Admin" (the tag replaced), inside
the journal's header, footer and sidebar; the item's preview with the
breadcrumbs "Home / Preview title", the static page's in the static
page's layout (note f-a3). The window kept the typed texts and the list
was unchanged. With English and French typed, the English interface
previewed "EN title" / "EN text" and the French one ("Aperçu"; on OMP
"Prévisualiser") "FR titre" / "FR texte"; in the item window with the
French boxes empty, the French interface previewed the English texts.

<a id="fn-m"></a>
**m** — The site: `AdminHandler::siteSettingsAvailability()` (note b);
a "Custom Page" item saved on the site has context id 0, found by
`NavigationMenuItemDAO::getByPath()` for a request with no journal
(`SITE_CONTEXT_ID`); `CustomBlockManagerPlugin::register()` reads the
site's `blocks` when there is no journal; `PKPSiteAppearanceForm` offers the site's
"Sidebar", which `displaySidebar()` reads on the site's pages. The site's
item window passes no tag list. Live-probed 2026-09-24 (Rules 8, 27;
Settings bullet 8; three apps): td8, td27. The test installs then
hosted 470 (OJS), 246 (OMP) and 90 (OPS) journals, so a site with one
journal was not driven; the one check is Administration › "Site
Settings" on an install that hosts one journal.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-24 (Rule 8; three apps): as the Site
Administrator, "Site page" saved on the site's "Navigation" ("Navigation
menu item was successfully added"); its window's "Insert Tag" menu read
"No tags are available.", and "Preview" opened the page in a new tab
inside the site's header and footer. Signed out, the site's address
followed by "/index/" and the path showed the site's header and footer,
the heading "Site page", the breadcrumbs "Home / Site page" and the
text; the same path under a journal answered "404 Not Found". The item
was removed again afterwards.

<a id="fn-e"></a>
**e** — `StaticPagesPlugin::register()`, only while the plugin is enabled
in the journal: `Template::Settings::website` appends
`templates/staticPagesTab.tpl` (`<tab id="staticPages">`, label
"Static Pages") after the page's own top tabs in
`lib/pkp/templates/management/website.tpl`; `LoadHandler` →
`callbackHandleContent()`, which looks up a static page of the journal
by the same joined path as note d and hands it to `StaticPagesHandler`;
`LoadComponentHandler` → the grid. `getActions()`: "Edit/Add Content"
(`plugins.generic.staticPages.editAddContent`), a `RedirectAction` to
Settings › Website with a fresh `uid` and the `#staticPages` anchor.
Which of two `LoadHandler` callbacks answers a path both a static page
and a "Custom Page" item hold depends on the order the hooks were
registered in (the plugin's at plugin load, the custom-page one in
`PKPTemplateManager::initialize()`); the first that finds a page ends the
hook, and on the test installs that is the custom page's. The plugin
ships no `settings.xml` and `version.xml` declares it lazy-load, so a
new journal has no `enabled` row. Live-probed 2026-09-24 (Rules 9, 15,
16; Settings bullet 1; OJS, OMP): td9, td15, td16.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-24 (Rule 9; Purpose; OJS, OMP): "Static
Pages Plugin" unticked under "Generic Plugins" on a new journal, with no
row arrow; ticking it showed "The plugin "Static Pages Plugin" has been
enabled." and left the tabs as they were on that page; after a reload
they read "Appearance", "Setup", "Plugins", "Content", "Static Pages".
The arrow then offered "Edit/Add Content" alone, which reloaded Settings
› Website on "Static Pages".

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-24 (Rule 12, A3; OJS, OMP): signed out,
as a Reader and as the manager, "/about-us" showed the header, the title
as a second-level heading, the content and the footer, with no
breadcrumbs, no main heading and no "Edit" link; tab "About us |
{journal name}". With English and French under "Forms", the French
address read the French texts, or the English ones where the page had
no French; a contact tag read "Site Admin", an empty support contact
nothing. A page saved with "Content" empty showed its title alone.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-24 (Rule 12; OJS, OMP): the "Path" cell's
link opened a new tab at "{journal}/en/about-us".

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-24 (Rule 14; OJS, OMP): "Delete" opened
"Delete": "Are you sure you wish to delete this item? This action cannot
be undone." with "OK" and "Cancel"; "Cancel" left the list as it was;
"OK" took the row away with no notice, and the address then answered the
bare "404 Not Found".

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-24 (Rule 15, A12; OJS, OMP): unticking
asked "Disable" / "Are you sure you want to disable this plugin?" and
showed "The plugin "Static Pages Plugin" has been disabled."; on that
page the tab stayed and its "Add Static Page" failed (note f-a12). After
a reload the tab was gone, the row had no arrow and the pages answered
"404 Not Found"; ticked again, every page was back in the list and at its
address.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-24 (Rule 16, A6; OJS, OMP): a static page
and a "Custom Page" item at "shared" both saved with no message; signed
out, "/shared" showed the custom page, with the item saved first, with
the static page saved first, and after the plugin was unticked and ticked
again. A static page alone at its path opened until an item took the
path; with the static page deleted, the custom page still showed. A
static page at "about" replaced "About the Journal" ("About the Press")
at "/about" and behind the header's link, while "about/editorialMasthead"
and "about/contact" kept their pages; deleted, "About the Journal" was
back.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-24 (Rule 18, 18a; Purpose; three apps):
"Our Partners" / "Partner list" saved with no notice; the list showed
"our-partners", "Sidebar" "our-partners (Custom Block)" unticked, and
the signed-out home page no block. "News 2026 & Events" was listed as
"news2026&-events" (note f-a13) and "Événements à venir" as
"événementsà-venir", which was placed and shown; a manager in the French
interface got the name from the French box.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-24 (Rules 19, 20; three apps): ticked and
saved, the block showed on the home page, About, Search and Login in the
saved order; unticked and saved, it left them. With "Show Name" unticked
the name was a second-level heading hidden from sight and given to screen
readers; ticked, it showed above the content.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-24 (Rule 21; Settings bullet 4; three
apps): a French visitor read the English "Our Partners" / "Partner list"
until French texts were saved, then "Nos partenaires" / "Liste des
partenaires", English visitors unchanged; with the French content
emptied again, the French name showed above the English content, each
box falling back on its own. Ticking French under "Forms" added a French
box to "Title", "Content" and "Block Name" in every window.

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-24 (Rule 22, A1; three apps): renamed
"Friends" with "Friend list", both showed from the next page load; the
list and "Sidebar" kept "our-partners".

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-24 (Rule 23; three apps): a second "Our
Partners" was listed as "our-partners" followed by 13 letters and digits
("our-partners6ab513cac7317" on OJS), in the list and under "Sidebar".

<a id="fn-td24"></a>
**td24** — Live-probed 2026-09-24 (Rule 24, A14; three apps): "Delete"
asked as Rule 14 quotes, and "Cancel" kept the row. "OK" on a placed and
on an unplaced block, a journal's and the site's, left the window open
with a spinner, the server answering status 500, and the block in the
list, the sidebar and "Sidebar". A block added again as "Our Partners"
was named "our-partners" plus 13 letters and digits, the first never
having gone, so the kept place (A2) could not be tried.

<a id="fn-td25"></a>
**td25** — Live-probed 2026-09-24 (Rules 25, 25a, A15; three apps):
unticking asked "Disable", and the block left the public pages and
"Sidebar"; ticked again, it came back at its place. With the plugin
unticked, "Save" on "Appearance" › "Setup" with "Page Footer" changed and
"Sidebar" untouched was refused (status 400) with "The our-partners block
can not be found. Please make sure the plugin is installed and
enabled."; with another block ticked it went through, and after the
plugin was ticked again "our-partners" came back unticked, absent from
the pages.

<a id="fn-td27"></a>
**td27** — Live-probed 2026-09-24 (Rule 27; three apps): the site's
"Custom Block Manager" unticked on Administration › "Site Settings" ›
"Plugins" › "Installed Plugins"; ticked, "Manage Custom Blocks" opened
the same window; "Site news" was saved as "site-news"; the site's
"Appearance" › "Setup" "Sidebar" listed "site-news (Custom Block)";
placed, it showed on the site's home page only, never on a journal's, and
no journal's list held it. Its "Delete" failed as a journal's does
(A14).

<a id="fn-td29"></a>
**td29** — Live-probed 2026-09-24 (Rule 29; three apps): "Insert/edit
image" opened "Insert/Edit Image" with "General" and "Upload"; "Upload"
read "Drop an image here" with a button "Browse for an image". "Test
Image_1.png", "photo.jpg", "photo.gif", "photo.webp" and "Photo
(1)_ä:x.PNG" were each stored and put in the box; saved, they showed in
the block on the public sidebar, on a custom page (".jpg"), on a static
page (".gif", OJS OMP) and in the "Page Footer" of "Appearance" ›
"Setup" on the home page (".png"). A pasted and a dropped picture were
stored too, the box holding the stored address; the site's item window
uploaded to the site's address.

<a id="fn-td30"></a>
**td30** — Live-probed 2026-09-24 (Rule 29, 29b, 29c; A5, A16–A18; three
apps): refused in a small window over the picture window, nothing
inserted: "photo.jpeg" (a real JPEG) and a real ".bmp" with the types
message; a text file named ".png" with "The image you uploaded is not
valid."; a PNG renamed ".jpg" with the extension message. "doc.pdf" and
"drawing.svg" sent nothing and showed nothing. A 2492 KB PNG answered
status 500 with "Path cannot be empty", a 4103 KB picture "One or more
files could not be uploaded.", an 8968 KB PNG status 500 with "The POST
data is too large.". Stored names: "Test Image_1.png"
as "test-image-1.png", "Photo (1)_ä:x.PNG" as "photo-1--x.png", "ü.png"
as ".png", a second "Test Image_1.png" (same or other content) as
"test-image-1-" plus 32 letters and digits, the first file unchanged; a
pasted and a dropped picture as "mceclip0.png" and "mceclip1.png". A
refused paste: note f-a17.

<a id="fn-td31"></a>
**td31** — Live-probed 2026-09-24 (Rule 29a; Side effects; Settings
bullet 7; three apps), with pictures under the 2 MB upload limit: a
Journal Manager's two 1906 KB PNGs were stored and the third refused with
"You do not have enough space in your user directory. The file you are
uploading is 1906kb and you have 1190kb remaining." (5000 KB); with one
taken out of its block and the block saved, the same refusal. The same
account in a second journal stored a 2 KB JPEG and was refused the big
PNG with 1189 kb remaining; after a custom page holding a picture was
deleted there, the files stayed, served, and the refusal stood. A picture
uploaded in the picture window and then left with "Cancel" was stored
all the same.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-24 (Rules 30, 30a, 30b; A19; three apps,
the static page window OJS OMP): in the static page window, "x" typed in
"Title", then the back arrow or Escape: the question; "Cancel" kept the
window with "x", "OK" closed it with nothing stored, also on an "Edit"
of a saved page. Text typed in "Content" alone: the back arrow closed the
window at once and the text was gone. Untouched "Add" and "Edit" windows
closed without a question. In the block window, "Cancel" closed at once
with nothing stored after a change to "Block Name", after a change in
"Content" alone, and on an "Edit" with a changed name; its close control
and Escape after a "Block Name" change asked the question. Going to
another address with either window changed raised the browser's "Leave
site?".

<a id="fn-k"></a>
**k** — No `NotificationManager`, mail or event-log call in
`StaticPageGridHandler`, `StaticPageForm`, `CustomBlockGridHandler` or
`CustomBlockForm`. `PKPContextService::delete()` deletes the journal's
navigation menus and items (`deleteByContextId()`) and its plugin
settings (the custom blocks), and `static_pages.context_id` is declared
`onDelete('cascade')` (`StaticPagesSchemaMigration`); nothing touches
`public/site/images/`. Live-probed 2026-09-24 (Side effects; three
apps): adding, editing and deleting a static page (OJS, OMP) and adding
and editing a custom block left the mail catcher, the notifications, the
tasks, the activity and email logs and the job queue as they were. A
scratch journal holding a "Custom Page" item with a picture, a static
page (OJS, OMP) and a placed block, removed on Administration › "Hosted
Journals" ("Are you sure you want to permanently delete {journal} and
all of its contents?" › "OK"): its item, static page and block settings
went, both pages answered "404 Not Found", and the picture stayed stored
and served.

<a id="fn-l"></a>
**l** — Neither plugin ships a `settings.xml`, so a new journal has no
`enabled` row for either and the Plugins list shows it unticked. Seen for
"Custom Block Manager" on scratch journals of the three apps on
2026-09-04 (*Notifications center & email preferences*, the toast "The
plugin "Custom Block Manager" has been enabled." after ticking it).
Live-probed 2026-09-24 (Settings bullets 1, 2; three apps, "Static Pages
Plugin" OJS OMP): both rows unticked on a new journal and on the site's
Plugins list, where "Static Pages Plugin" ticked showed the enabled
notice and added nothing (note f-a8).

<a id="fn-y"></a>
**y** — Where each scenario runs: scenario 8 on the seeded preprint
server `publicknowledge` (OPS), read-only, as the ready account
`manager.maya` (`docs/process/users.md`; password by `getPassword()`).
Scenarios 1 to 7 on scratch contexts from `POST scenarios/context`
(`scenarios.md`), each with a throwaway `manager` in `users[]` (password
the username twice), `admin` / `admin` being the Site Administrator. A
scratch context arrives with both plugins off, no block in its sidebar,
English alone under "UI" and "Forms", the principal contact "Site Admin"
<admin@mail.test> and no technical support contact (`seed-facts.md`),
and makes the install a multi-journal site. The visitor is a second
browser context, signed out. Recipes: 3 — `users[]` adds a `reader` and,
on OJS and OMP, an `editor` with `roles: {editor: {permitSettings:
false}}`; `plugins: {staticpagesplugin: {enabled: true}}` on OJS and
OMP. 4 and 7 — nothing seeded: the plugin is ticked on screen. 5 — a
fresh throwaway manager, so the whole 5000 KB allowance is free; the test
makes the picture files, the big ones under the test installs' 2 MB
upload limit (A18); the stored files stay on the install, as nothing
removes them. 6 — `context.supportedLocales` and
`context.supportedFormLocales` `['en', 'fr_CA']`, `plugins:
{customblockmanagerplugin: {enabled: true}}`; the French page is the
page's address with the `fr_CA` segment. On the test installs a custom
block, once made, cannot be deleted (A14), which is why each block
scenario has a scratch journal of its own. Live-probed 2026-09-24 (three
apps): a journal seeded with the "Custom Block Manager" key arrived with
the row ticked and "Manage Custom Blocks" offered, one seeded without it
with the row unticked; every drive ran on such scratch journals.

<a id="fn-f-a1"></a>
**f-a1** — `CustomBlockForm::execute()` makes the name once, from the
interface language's "Block Name" (note g), and an edit keeps it;
`CustomBlockGridHandler::initialize()` shows the name in the "Block Name"
column, and `CustomBlockPlugin::getDisplayName()` gives the "Sidebar"
label "{name} (Custom Block)". `Str::kebab()` drops the spaces and puts
"-" before each word whose first letter it can capitalise (a to z), so a
word opening with a digit, a sign or an accented letter runs into the one
Issue report: [docs/issues/U09-A1-custom-block-listed-by-made-up-name.md](../issues/U09-A1-custom-block-listed-by-made-up-name.md).
before. Live-probed 2026-09-24 (three apps): td19, td22.

<a id="fn-f-a2"></a>
**f-a2** — `CustomBlockGridHandler::deleteCustomBlock()` removes the
block's settings and its entry in `blocks`, not the name in the journal's
`sidebar` list; `displaySidebar()` prints any stored name that is a
loaded, enabled block, and a new block with the same name is created
enabled (note g). Read from the code 2026-09-24 and not driven: on the
test installs' PostgreSQL "Delete" fails at its first step (note f-a14),
so no block was ever deleted (td24). The one check is the same drive on
a MySQL installation: delete a placed block, add one with the same
"Block Name", and open the home page signed out.

<a id="fn-f-a3"></a>
**f-a3** — The plugin's `templates/content.tpl` prints the title in an
`<h2>` and includes no `breadcrumbs.tpl`; the core custom page's
`navigationMenuItemViewContent.tpl` has both (note d). Live-probed
2026-09-24 (OJS, OMP): td12; on the same journal the custom page
"Shared custom" had the breadcrumbs "Home / Shared custom" and a main
heading. The static page's preview has the same layout.

<a id="fn-f-a4"></a>
**f-a4** — The screen checks only the primary language's "Block Name"
box, while `CustomBlockForm::execute()` builds the name from the
interface language's box (note g), empty for a manager working in French
who typed the English name only; `CustomBlockGridRow::initialize()` adds
"Edit" and "Delete" only for a non-empty row id, and the "Sidebar" save
refuses the blank name with the two messages Rule 26a quotes. Live-probed
Issue report: [docs/issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md](../issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md).
2026-09-24 (three apps): td26.

<a id="fn-f-a5"></a>
**f-a5** — `PKPUploadPublicFileController::uploadFile()`'s allowed
endings are `gif`, `jpg`, `png`, `webp` (note i). Live-probed
2026-09-24 (three apps): "photo.jpeg", a real JPEG, refused with the
types message in a block's picture window and in the "Page Footer" box;
the same file as "photo.jpg" stored and shown.

<a id="fn-f-a6"></a>
**f-a6** — `StaticPageForm`'s duplicate check reads static pages only
(note f); the "Custom Page" item's reads items only
(*Navigation menus & site chrome*, note l). Both pages are looked up on
the same hook (notes d, e), the custom page's callback first.
Live-probed 2026-09-24 (OJS, OMP): td16.

<a id="fn-f-a7"></a>
**f-a7** — Note c: both previews throw an exception for a user without
the manager or site administrator role in the journal, and for a
signed-out request, which has no role list; nothing turns it into the
access-denied page or Login, so the answer is status 500 with an empty
body. Live-probed 2026-09-24 (three apps, `pages/preview` OJS OMP): td7.
Issue report: [docs/issues/U09-A7-typed-preview-address-blank-page.md](../issues/U09-A7-typed-preview-address-blank-page.md).

<a id="fn-f-a8"></a>
**f-a8** — The site's list (`AdminPluginGridHandler`) lists every
installed generic plugin; "Static Pages Plugin" adds its tab to Settings
› Website and its pages to a journal's addresses (note e), neither of
which the site has. Live-probed 2026-09-24 (OJS, OMP): ticked on the
site, "The plugin "Static Pages Plugin" has been enabled.", the Site
Settings tabs unchanged, the row's links "Delete" and "Upgrade" only;
unticked again through "Disable" › "OK". OPS's site list has no such row.

<a id="fn-f-a9"></a>
**f-a9** — `SiteHandler.js` puts "copy paste" at the head of both bars
(note j); TinyMCE 7.9.3's "paste" button cannot read the clipboard in
current browsers and shows its own notice instead. Live-probed
2026-09-24 (three apps): td28.

<a id="fn-f-a10"></a>
**f-a10** — The page and the first operation of an address pass through
`Core::cleanFileVar()` (`Core::getPage()`, `Core::getOp()`), which keeps
only letters, digits, "_" and "-"; `callbackHandleContent()` joins what
is left (note e), so "dot.only" is looked up as "dotonly" and not found,
while a "." in a later part survives. `StaticPageForm` allows "." (note
f). Live-probed 2026-09-24 (OJS, OMP): "dot.only", "a.b_c-d",
"deep/Mixed_1.x" and "Info/Fees_2.x-y" were listed and answered "404 Not
Found", with or without "/en/" and from the "Path" link;
"one/two/three.x", "info/fees", "Upper" and "under_score" opened. Not
driven for a "Custom Page" item, whose lookup joins the same parts (note
d).
Issue report: [docs/issues/U09-A10-static-page-dot-path-not-found.md](../issues/U09-A10-static-page-dot-path-not-found.md).

<a id="fn-f-a11"></a>
**f-a11** — Cause not traced. Live-probed 2026-09-24 (OJS, OMP), four
saves over two runs per app: after "about us", "bad path" or a used path
was refused, the corrected save showed the red notice with the refusal
(two notices at once after two refusals); with the window closed after a
refusal, "This path already exists for another static page." showed on
the next load of Settings › Website; a save with no refusal before it
showed none.

<a id="fn-f-a12"></a>
**f-a12** — The open page keeps the tab it loaded with, while the
unticked plugin no longer registers its grid (note e, `LoadComponentHandler`
only while enabled), so the grid's `add-static-page` request answers
status 500. Live-probed 2026-09-24 (OJS, OMP): td15; the request failed
twice per app.
Issue report: [docs/issues/U09-A12-static-page-add-after-plugin-off-server-error.md](../issues/U09-A12-static-page-add-after-plugin-off-server-error.md).

<a id="fn-f-a13"></a>
**f-a13** — The row's controls carry the block name in their element
ids, and the grid's script looks them up by that id; with "&" in the
name (written "&amp;" in the id) the lookup fails, the page logging
"Syntax error, unrecognized expression:
#component-plugins-generic-customblockmanager-controllers-grid-customblockgrid-row-news2026&amp;-events-editCustomBlock-button-…"
(and the same for `deleteCustomBlock`) on each load of the window, so
the links get no action. The "Sidebar" save refuses an entry outside
letters, digits, "-" and "_", accented letters counting as letters.
Live-probed 2026-09-24 (three apps): td19; "Edit" and "Delete" on
"news2026&-events" opened nothing, and ticking it under "Sidebar" was
Issue report: [docs/issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md](../issues/U09-A4-A13-custom-block-stuck-with-unusable-name.md).
refused (status 400).

<a id="fn-f-a14"></a>
**f-a14** — `CustomBlockGridHandler::deleteCustomBlock()` first calls
`PluginSettingsDAO::deleteSetting()`, whose query filters on the column
`plugin_Name`; PostgreSQL keeps the quoted name's capital and refuses it
("column "plugin_Name" does not exist"), so the request answers status
500 and nothing is deleted. MySQL matches column names without regard to
case, so the call works there (read, not driven). The test installs run
PostgreSQL. Present since pkp-lib#7111 (the caching rewrite), on
stable-3_5_0 too. Live-probed 2026-09-24 (three apps): td24, td27; the
server log recorded the error on every "OK".
Issue report: [docs/issues/U09-A14-custom-block-delete-fails-postgresql.md](../issues/U09-A14-custom-block-delete-fails-postgresql.md).

<a id="fn-f-a15"></a>
**f-a15** — With the plugin unticked its blocks are not loaded, but the
journal's stored "Sidebar" list still names them; the page posts that
list back unchanged, and `PKPContextService` refuses a name that is not
an enabled block with `manager.setup.layout.sidebar.invalidBlock` (note
h). Once the list is changed on screen, `FieldOptions.vue` keeps only the
listed options, which drops the block. Live-probed 2026-09-24 (three
apps): td25.
Issue report: [docs/issues/U09-A15-setup-save-refused-disabled-block.md](../issues/U09-A15-setup-save-refused-disabled-block.md) (with U10 A4).

<a id="fn-f-a16"></a>
**f-a16** — TinyMCE 7.9.3's "Upload" tab takes only files it reads as
pictures and drops any other without a message; the application adds no
message of its own. Live-probed 2026-09-24 (three apps): "doc.pdf" and
"drawing.svg" chosen through "Browse for an image": no request, no
message, the window unchanged.
Issue report: [docs/issues/U09-A16-picture-window-ignores-svg-pdf.md](../issues/U09-A16-picture-window-ignores-svg-pdf.md).

<a id="fn-f-a17"></a>
**f-a17** — TinyMCE 7.9.3 puts a pasted or dropped picture into the text
as an embedded data address first and swaps in the stored address once
the upload answers; on a refusal it shows "Failed to upload image:
{message}" and leaves the embedded picture where it is (note i).
Live-probed 2026-09-24 (three apps): a pasted text file named ".png" was
refused (status 400) with "Failed to upload image: The image you
uploaded is not valid."; the saved block held it as
`<img src="data:image/png;base64,…">`, and the public sidebar showed a
broken picture. Earlier that day, while every upload failed on the
server, pasted and dropped real pictures stayed the same way and showed
on the public page.
Issue report: [docs/issues/U09-A17-refused-pasted-picture-kept-embedded.md](../issues/U09-A17-refused-pasted-picture-kept-embedded.md).

<a id="fn-f-a18"></a>
**f-a18** — A file over PHP's `upload_max_filesize` arrives with an
empty temporary name, and the application fails on it before any size
check: "Path cannot be empty" (status 500), or, where the save fails, the
error lookup `uploadError($filename)` asks about the file's name instead
of the field `file`, so the switch holding `api.files.400.fileSize` is
never reached and `api.files.400.uploadFailed` answers. A request over
`post_max_size` fails before the application runs ("The POST data is too
large.", status 500). Live-probed 2026-09-24 (three apps): td30; the
test installs' limits are 2 MB per file and 8 MB per request.
Issue reports, one per cause: [docs/issues/U09-A18-picture-over-upload-limit-server-error.md](../issues/U09-A18-picture-over-upload-limit-server-error.md) (the file limit) and [docs/issues/U09-A18-picture-over-request-limit-server-error.md](../issues/U09-A18-picture-over-request-limit-server-error.md) (the request limit).

<a id="fn-f-a19"></a>
**f-a19** — The window's unsaved-change tracking (note f) reacts to
"Path" and "Title" and not to the "Content" editor; cause not traced
further. Live-probed 2026-09-24 (OJS, OMP): td17.
Issue report: [docs/issues/U09-A19-static-page-content-change-lost-on-close.md](../issues/U09-A19-static-page-content-change-lost-on-close.md).

<a id="fn-f-a20"></a>
**f-a20** — `Handler.js::initializeTinyMCE()` renders one TinyMCE 7.9.3
editor per language box of a legacy form, the first form language
first; `EditorManager.add()` makes each new editor the active one, so
the last rendered is active. When the first editor's content style
sheets are in before the later editor's iframe has run its set-up,
`initEditor()` sets `initialized = true` and focuses the first editor;
`setActive()` sends `deactivate` to the later one, and pkp's handler for
it (`SiteHandler.js`, `tinyMCEObject.target.getContent().length`, there
only to show a placeholder) reads an editor with no `serializer` yet:
"Cannot read properties of undefined (reading 'serialize')". TinyMCE's
event dispatch does not catch it, so the throw ends the first editor's
start-up before `cancelProgress()`, and the progress timer shows the
throbber (`.tox-throbber`, `aria-busy="true"`, the spinner's label
"Loading...") for good; TinyMCE's focus handling then moves the focus to
the throbber. `MultilingualInputHandler.isIncomplete_()` throws the same
error on its 500 ms timer. The proposed fix: skip an editor whose
`initialized` is false in both. The Vue forms' `FieldRichTextarea.vue`
carries no such handler. Live-probed 2026-09-28 (Fields; three apps),
on a scratch journal in English and French with "Custom Block Manager"
on, "Add Block" opened in a fresh browser each time, the French
editor's set-up held 3 s by a page script: the English box was
initialized with its throbber shown and busy, and a click on it was
intercepted by the "Loading..." spinner, 12 of 12 windows (4 per app),
each logging the error twice; with no hold, 0 of 12; with the hold and
the fix in the page, 0 of 12. Test runs 2026-09-28 (scenario 6,
three apps, the same hold, harness lever `PLAYWRIGHT_IFRAME_HOLD='-fr_CA-'`
with `PLAYWRIGHT_IFRAME_HOLD_MS=3000`): every run that got past setting up
the journal failed at the item window's English "Content" box: the
click intercepted, or on OJS once the focus taken from the box, or on
OPS once "Welc" left of "Welcome.". First seen
unforced in a full OPS run on 2026-09-27, at the block window's English
"Content": the spinner covered the box about three minutes, until
the test gave up. The order that triggers it needs a busy browser
(there, a full run on a loaded machine); without the hold the U09 file
passed 35 of 35 runs per app. Not driven: the static page window, whose
language boxes are built the same way, and whether closing and
reopening the window clears it. The suites take no workaround; a stuck
box fails its test with a message naming it.
Issue report: [docs/issues/U09-A20-first-language-content-box-stuck-loading.md](../issues/U09-A20-first-language-content-box-stuck-loading.md).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Preview" of a "Custom Page" item (the item window's button; the window itself is *Navigation menus & site chrome*'s) | Settings › Website › "Setup" › "Navigation" › "Add item" / "Edit" | AFFM-035 |
| A custom page | `{journal}/{path}` (site: `index/{path}`); the preview `navigationMenu/preview`; `navigationMenu/view` and `navigationMenu/index` exist without any screen linking them | AFFR-096 · ROUTE-019 |
| A custom block in the sidebar | every public page with a sidebar, once placed | AFFR-093 · PLUG-010 |
| "Custom Block Manager" window: "Add Block", row "Edit" / "Delete" | Settings › Website › "Plugins" › "Installed Plugins" › "Manage Custom Blocks"; the site's on Administration › "Site Settings" › "Plugins" | PLUG-010 |
| A static page {OJS OMP} | `{journal}/{path}`; the preview `pages/preview` | AFFR-097 · PLUG-027 |
| "Static Pages" tab: "Add Static Page", row "Edit" / "Delete", "Path" link {OJS OMP} | Settings › Website › "Static Pages" (the Plugins row's "Edit/Add Content") | PLUG-027 |
| Picture upload of every formatted text box | `{journal}/api/v1/_uploadPublicFile` (the site's: `index/api/v1/…`), POST; OPTIONS for the editor's pre-flight | API-007 |

## Reference — code anchors

- `lib/pkp/pages/navigationMenu/NavigationMenuItemHandler.php`,
  `lib/pkp/pages/navigationMenu/index.php` — the custom page and its
  preview; `lib/pkp/templates/frontend/pages/navigationMenuItemViewContent.tpl`.
- `lib/pkp/classes/services/PKPNavigationMenuService.php`
  (`_callbackHandleCustomNavigationMenuItems()`, the custom item's URL),
  `lib/pkp/classes/navigationMenu/NavigationMenuItemDAO.php`
  (`getByPath()`, `portStaticPage()`),
  `lib/pkp/classes/template/PKPTemplateManager.php` (the hook,
  `displaySidebar()`), `lib/pkp/classes/core/PKPPageRouter.php`
  (`route()`, `LoadHandler`), `lib/pkp/classes/core/Core.php`
  (`cleanFileVar()`, `getPage()`, `getOp()`).
- `lib/pkp/classes/plugins/PluginSettingsDAO.php` (`deleteSetting()`,
  the custom block's "Delete").
- `lib/pkp/templates/controllers/grid/navigationMenus/customNMIType.tpl`,
  `lib/pkp/controllers/grid/navigationMenus/form/PKPNavigationMenuItemsForm.php`,
  `lib/pkp/js/controllers/grid/navigationMenus/form/NavigationMenuItemsFormHandler.js`
  — the item window's custom-page part (owned by *Navigation menus & site
  chrome*).
- `plugins/generic/staticPages/` (OJS, OMP): `StaticPagesPlugin.php`,
  `StaticPagesHandler.php`, `controllers/grid/StaticPageGridHandler.php`,
  `StaticPageGridRow.php`, `StaticPageGridCellProvider.php`,
  `controllers/grid/form/StaticPageForm.php`, `classes/StaticPagesDAO.php`,
  `StaticPagesSchemaMigration.php`, `templates/*.tpl`,
  `js/StaticPageFormHandler.js`, `locale/`; OJS and OMP
  `classes/install/Upgrade.php` (`migrateStaticPagesToNavigationMenuItems()`).
- `plugins/generic/customBlockManager/`: `CustomBlockManagerPlugin.php`,
  `CustomBlockPlugin.php`, `controllers/grid/CustomBlockGridHandler.php`,
  `CustomBlockGridRow.php`, `controllers/grid/form/CustomBlockForm.php`,
  `templates/block.tpl`, `templates/editCustomBlockForm.tpl`, `locale/`.
- `lib/pkp/classes/components/forms/context/PKPAppearanceSetupForm.php`,
  `lib/pkp/classes/components/forms/site/PKPSiteAppearanceForm.php`,
  `lib/pkp/classes/services/PKPContextService.php` (`sidebar` check,
  `delete()`), `PKPSiteService.php`.
- `lib/pkp/api/v1/_uploadPublicFile/PKPUploadPublicFileController.php`,
  `<app>/api/v1/_uploadPublicFile/index.php`; `config.TEMPLATE.inc.php`
  `[files]`.
- `plugins/generic/tinymce/TinyMCEPlugin.php`,
  `plugins/generic/tinymce/plugins/pkpTags/plugin.js`;
  `lib/pkp/js/controllers/SiteHandler.js`, `lib/pkp/js/classes/Handler.js`,
  `lib/pkp/js/classes/TinyMCEHelper.js`;
  `lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue`.
- `lib/pkp/controllers/grid/plugins/PluginGridRow.php`,
  `<app>/controllers/grid/settings/plugins/SettingsPluginGridHandler.php`,
  `lib/pkp/pages/admin/AdminHandler.php` (`siteSettingsAvailability()`).
