---
name: navigation-menus-and-site-chrome
status: verified
---

# Navigation menus & site chrome

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every page of a journal sits inside a frame that lets people find their
way: on the public pages, the header with the journal's name, the primary
navigation menu, "Search" and the user menu, and below the content the
footer, with breadcrumbs, page links and skip links in between; on the
editorial screens, the editorial header and the side menu (GLOSSARY
"Header, editorial header, side menu"). A Journal Manager decides what the
two header menus hold on Settings › Website › "Setup" › "Navigation":
which menus exist, which area of the header each fills, and which items,
in what order and nesting, each carries; the Site Administrator has the
same tab for the site's own pages. Every visitor, signed in or not, then
moves around the journal through that frame. This spec owns the menus,
their items and the frame; the pages the entries open belong to their
own features. <sup>a</sup>

## Actors & permissions

"Whoever opens the Settings pages" means the manager-level roles with
"Permit changes to Settings", as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
defines them, together with *manager-level roles* (on a journal the
Journal Manager, the Editor and the Production Editor). Readers need no
account.
<sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open Settings › Website › "Setup" › "Navigation" and add, edit or delete the journal's menus and items** (Rules 1, 3–14) | • whoever opens the Settings pages; nobody else: every other role has no "Settings" in the side menu and gets the access-denied page at the Settings address <sup>b</sup> |
| **Add, edit or delete the site's menus and items** (Administration › "Site Settings" › "Site Setup" › "Navigation", Rule 1b) | • the Site Administrator, while the site hosts two or more journals; with exactly one journal the side tab is not offered<br>• there, the menus can be removed and the items added, edited and removed, but "Add Menu" and a menu's "Edit" open no window, so a site menu cannot be added or edited (Rule 1b, [A4](#a4)) <sup>c</sup> |
| **See the public header, the footer, breadcrumbs, page links and skip links** (Rules 15–24) | • any visitor, signed in or not, on any public page of a journal or of the site but the bare "404 Not Found" (Rule 26b); a journal closed to signed-out visitors sends them to Login first ([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 22) <sup>d</sup> |
| **Use the public user menu** (Rules 18–19) | • signed out: "Login", and "Register" while the journal accepts registrations<br>• signed in: the username, "Dashboard", "View Profile", "Logout"<br>• "Administration": the Site Administrator only<br>• where "Dashboard" leads depends on the role, Rule 19; a Section Editor is sent to the Profile page [A2](#a2) <sup>e</sup> |
| **See and follow the "Edit" shortcut on a public page** (Rule 25) | • a signed-in user holding a manager-level role in that journal<br>• nobody else, a Site Administrator without a manager-level role in the journal included <sup>f</sup> |
| **Use the editorial header** (Rules 27–28) | • any signed-in user on an editorial screen, whatever their roles, including a user with no role in that journal <sup>g</sup> |
| **Switch journals from the editorial header** (Rule 29) | • the Site Administrator: every other journal on the site<br>• any other user: the other journals where they hold a role<br>• in both cases a journal with the current journal's name is left out ([A21](#a21))<br>• with no other journal to offer, the control is absent <sup>g</sup> |
| **See the side menu** (Rule 30) | • a signed-in user holding at least one role in the journal; each entry's own condition is in Rule 30's table; a user none of whose entries shows (a Reader while "Disable Submissions" is on; {OJS} the Subscription Manager too, while payments are off) sees no side menu<br>• the Site Administrator holding Reader alone in the journal: the manager's side menu, with an "Error" window on every editorial page ([A22](#a22))<br>• a user with no role in the journal, and every user on the site's own editorial screens (Administration): no side menu <sup>h</sup> |

## Fields & validation

**The "Navigation" tab** (Settings › Website › "Setup" › "Navigation"; the
site's: Administration › "Site Settings" › "Site Setup" › "Navigation")
holds two tables, one under the other. Each row has a "Settings" arrow at
its left that reveals "Edit" and "Remove" under the row. <sup>i</sup>

| Table | Columns | Above the table | Empty |
|-------|---------|-----------------|-------|
| "Navigation" (the menus) | "Title" (the menu's title, itself a link that opens the menu's "Edit" window), "Navigation Menu Items" (the titles of the items the menu holds, separated by commas) | "Add Menu" | "No Navigation Menus" |
| "Navigation Menu Items" (every item of the journal, whether a menu holds it or not) | "Title" | "Add item" | "No Navigation Menu Items" |

**The menu window**, opened from the right by "Add Menu" (headed "Add
Menu") or by a menu's "Edit" or title (headed "Edit"), with "Save" and
"Cancel" at its foot: <sup>j</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Title" | yes | One line of plain text, the same in every language. Empty: "This field is required." under the box. The title of another menu of the same journal: refused with "This title already exists for another navigation menu." The same title in other letter case ("primary navigation menu") is saved as a second menu ⚠ [A10](#a10) <sup>j</sup> <sup>td1</sup> |
| "Active Theme Navigation Areas" | no | A list under "Select a navigation area": "None", then the areas of the active theme ("primary" and "user" on the default theme). Default "None" for a new menu. An area another menu of the journal already fills is refused with "A navigation menu is already assigned to this area." What the area does: Rule 8 <sup>j</sup> <sup>td1</sup> |
| "Assigned Menu Items" and "Unassigned Menu Items" | no | Two panels side by side; the first is the menu, top to bottom, the second every item of the journal the menu does not hold. Arranging: Rules 5–7 <sup>k</sup> |

A save the window refuses keeps the window open with the message under
the box and, at its foot, "Please correct one error." and a link "Jump to
next error" that scrolls to the box; "Save" stays greyed until that box
changes. A duplicate title or an area already filled also shows at the
top right "The form was not saved because 1 error(s) were encountered.
Please correct these errors and try again." <sup>j</sup> <sup>td1</sup>

**The item window**, opened by "Add item" (headed "Add item") or by an
item's "Edit" (headed "Edit"), with "Save" at its foot and no "Cancel":
it is left by the back arrow at its top (Rule 11). The boxes after
"Navigation Menu Type" depend on the type chosen. <sup>l</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Title" | yes, in the journal's primary language | Plain text, one box per form language; the box stops accepting characters after 255. Empty in the primary language: refused in the window with "This field is required." under the box. How titles follow languages: Rule 12 <sup>l</sup> |
| "Navigation Menu Type" | yes | A list starting with "Choose a type..." and then the types of the table below. The line under the list reads "Select a Navigation Menu Type or Custom to make your own" and, once a type is chosen, that type's one-line description ("Link to the page displaying your announcements." for "Announcements"). Set back to "Choose a type...", the line keeps the last type's description ⚠ [A12](#a12). Left at "Choose a type...": not saved, with no message (below the table) <sup>l</sup> <sup>td2</sup> |
| "Path" (type "Custom Page") | yes | Letters, digits and ".", "/", "-", "_" only. A path with other characters ("my page") or the path of another item of the journal: not saved, with no message (below the table). Under it: "This page will be accessible at: {address}… where %PATH% is the path entered above. Note: No two pages can have the same path. Using paths that are built into the system may cause you to lose access to important functions." <sup>l</sup> |
| "Content" and "Preview" (type "Custom Page") | no | The page's formatted text, per language, and a button that opens the unsaved page in a new browser tab. The page itself is *Custom pages & blocks*'s <sup>l</sup> |
| "URL" (type "Remote URL") | yes, in the primary language | One box per form language, up to 255 characters. A box that does not hold a full web address ("https://…"; "pkp.sfu.ca" is not one): not saved, with no message (below the table); a box of another language may stay empty <sup>l</sup> |
| "Select Series" / "Select Category" {OMP} (types "Series" and "Category") | yes | A list of the press's series, or of its top-level categories, under "Please select the series to which you would like this menu item to link." ("…the category…") <sup>l</sup> |
| "Query Parameters" (every type but "Custom Page" and "Remote URL") | no | One box per form language under "Optional query string to append to the URL (e.g., tab=metrics). Do not include the leading '?' character."; each stops accepting characters after 1000. The item's link gets the text after a "?". In the French interface the label and that line are raw codes ⚠ [A24](#a24) <sup>l</sup> <sup>td3</sup> |

Only an empty "Title" is refused with a message. Every other refusal
above (no type, a "Path" with other characters or already used, a "URL"
that is not a full web address) shows nothing: "Save" leaves the window
open, no message appears anywhere, and nothing is stored ⚠ [A11](#a11).
<sup>l</sup> <sup>td2</sup>

**The item types**, as "Navigation Menu Type" lists them; the last column
is the text the menu window's eye icon opens (Rule 7), "—" where the
window shows no eye. On a press or preprint server the page names follow
GLOSSARY Part II, but the notices, the "About" type's description ("Link
to a page displaying the About the Journal content in Settings >
Journal") and the warning of Rule 7b read as on a journal, "About the
Journal" and "Settings > Journal" included ⚠ [A13](#a13). <sup>m</sup>

| Type | The item opens | The item shows | Notice in the menu window |
|------|----------------|----------------|---------------------------|
| "Custom Page" | the item's own page, at the journal's address followed by the "Path" | always | — |
| "Remote URL" | the typed "URL", in the same browser tab | always | — |
| "About" | the "About the Journal" page | always, even with the "About the Journal" text empty | "This link will only be displayed if you have filled out the About the Journal section under Settings > Journal." ⚠ [A5](#a5) |
| "Editorial Masthead" | the "Editorial Masthead" page | always | — |
| "Submissions" | the "Submissions" page | always | — |
| "Announcements" | the Announcements page | while announcements are on (Settings bullet 1) | "This link will only be displayed if you have enabled announcements under Settings > Website." |
| "Login" | the Login page | signed out | "This link will only be displayed when the visitor is not logged in." |
| "Register" | the Register page | signed out, while the journal accepts registrations (Settings bullet 5) | "This link will only be displayed when the visitor is not logged in." |
| "Dashboard" | Rule 19 | signed in | "This link will only be displayed when the visitor is logged in." |
| "View Profile" | the Profile page | signed in | "This link will only be displayed when the visitor is logged in." |
| "Administration" | the Administration page | signed in as the Site Administrator | "This link will only be displayed when the visitor is logged in." |
| "Logout" | signs the visitor out ([Login & sessions](U01-login-and-sessions.md)) | signed in | "This link will only be displayed when the visitor is logged in." |
| "Contact" | the "Contact" page | while the principal contact's "Name" or the "Mailing Address" is filled; the "Contact" tab refuses an empty "Name" ("This field is required."), so the item always shows (Settings bullet 3) | "This link will only be displayed if you have filled out the Contact information under Settings > Contact." ⚠ [A6](#a6) |
| "Search" | the Search page | always | — |
| "Privacy Statement" | the "Privacy Statement" page | while the journal has a privacy statement (Settings bullet 4) | "This link will only be displayed if you have entered a privacy statement under Settings > Workflow > Submissions." [A6](#a6) |
| "Current Issue" {OJS} | the current issue | unless "Publishing Mode" is set to not publish online (Settings bullet 2) | — |
| "Archives" {OJS OPS} | the issue archive; on a preprint server the list of preprints | on a journal, unless "Publishing Mode" is set to not publish online (Settings bullet 2); on a preprint server always ⚠ [OPS2](#ops2) | — |
| "Subscriptions" {OJS} | the page describing the journal's subscriptions | while payments are enabled and set up (Settings bullet 6) | — (no eye, so its notice "This link will only be displayed if payments are enabled under Settings > Distribution > Payments." never shows) ⚠ [OJS1](#ojs1) |
| "My Subscriptions" {OJS} | the visitor's own subscriptions | signed in, while payments are enabled and set up and the journal requires subscriptions | — (no eye, so its notice "This link will only be displayed when a visitor is logged in." never shows) [OJS1](#ojs1) |
| "Catalog", "New Releases" {OMP} | the catalog; its new releases | always | — |
| "Series", "Category" {OMP} | the chosen series' or category's page | while that series or category exists (not seen on the test installs: no test press has a series or category of its own to delete); the types are offered only while the press has one | — |

## Rules & state

**Where menus are managed**

1. **The Navigation tab.** A journal's menus and items live on Settings ›
   Website › "Setup" › "Navigation" (Fields). Each journal has its own
   set; changing one journal's leaves every other journal's as it was.
   <sup>i</sup>
   - 1b. **The site's own.** The site has a separate set for its own
     pages (the site's home page and its site-level Login and Register
     pages), on Administration › "Site Settings" › "Site Setup" ›
     "Navigation", with the same tables. The side tab is offered only
     while the site hosts two or more journals (a test install gains it
     with its first scratch journal). <sup>c</sup>
     - There, "Add Menu", a menu's title and its "Edit" dim the page and
       open no window; nothing on the page can be pressed until it is
       reloaded. A site menu can be removed, but not added or edited
       ⚠ [A4](#a4). <sup>td9</sup>
     - The item window works as on a journal. It offers the journal's
       types, including those the site has no page for ⚠ [A14](#a14).
2. **What a new journal has.** Two menus and the items below (seventeen
   on a journal, sixteen on a press or preprint server), each under its
   installed title in the visitor's language while that language is one
   of the journal's "Forms" languages (Rule 12): <sup>n</sup> <sup>td4</sup>
   - "Primary Navigation Menu", in the area "primary": on a journal
     "Current", "Archives", "Announcements", "About"; on a press "Catalog",
     "Announcements", "About"; on a preprint server "Announcements",
     "Archives", "About". Under "About": "About the Journal", "Submissions",
     "Editorial Masthead", "Privacy Statement", "Contact".
   - "User Navigation Menu", in the area "user": "Register", "Login" and
     an item titled with the signed-in user's username, with "Dashboard",
     "View Profile", "Administration" and "Logout" under it.
   - "Search", held by no menu.

   The site starts with the "User Navigation Menu" and its seven items
   alone: no primary menu and no "Search" item.

**Menus**

3. **The "Navigation" table.** It lists the journal's menus as Fields
   describes, in no fixed order. <sup>i</sup> <sup>td5</sup>
   - 3a. **The items cell.** The "Navigation Menu Items" column names
     every item the menu holds, nested ones included, in no fixed order
     and with nothing to show which item sits under which; the username
     item reads as the viewing manager's own username. On a new journal
     the cells name these items, separated by commas:
     - "Primary Navigation Menu": "Current", "About the Journal",
       "Submissions", "Archives", "Announcements", "Editorial Masthead",
       "Privacy Statement", "About", "Contact" (press: "Catalog", "About
       the Press", "Submissions", "Announcements", "About", "Editorial
       Masthead", "Privacy Statement", "Contact"; server:
       "Announcements", "About the Server", "Submissions", "Archives",
       "About", "Editorial Masthead", "Privacy Statement", "Contact").
     - "User Navigation Menu": "Dashboard", "Register", "View Profile",
       "Login", {username}, "Administration", "Logout".
   - 3b. **Stale until reloaded.** After an item is saved with a new
     title, or removed (Rules 11, 13), each menu's cell keeps the old
     titles, a removed item and its former sub-items included, until the
     page is reloaded ⚠ [A15](#a15).
4. **The menu window.** "Add Menu" opens the window with every item of
   the journal in "Unassigned Menu Items" and "Assigned Menu Items"
   reading "No items assigned to this menu. Drag items from Unassigned
   Menu Items."; "Edit" opens it with the menu's items, in their order
   and nesting, on the left and the rest on the right. With every item
   assigned, the right panel reads "All items have been assigned.". On a
   journal with no item at all, "Add Menu" shows both texts, "No items
   assigned…" beside "All items have been assigned." ⚠ [A16](#a16). An
   item may sit in several menus: an item one menu holds is still
   offered on the right in every other menu. <sup>j</sup> <sup>k</sup>
5. **Arranging.** Items move by dragging them by the handle at their left
   ("Drag to reorder"): from one panel to the other, up and down, and onto
   an item of "Assigned Menu Items" to sit under it. <sup>k</sup>
   <sup>td6</sup>
   - 5a. **Two levels.** An item can sit under a top-level item, and
     nothing under an item that is itself under another; an item that
     has items under it cannot be dropped under another item. The limit is
     an installation setting (Settings bullet 14).
   - 5b. **Taking a branch out.** Dragging an item that has items under
     it to "Unassigned Menu Items" moves its items there too, each as an
     entry of its own.
   - 5c. **Mouse only.** The items cannot be reached or moved with the
     keyboard; a manager who does not use a mouse cannot arrange a menu
     ⚠ [A8](#a8).
6. **Saving and leaving.** Nothing is kept until "Save". "Save" stores
   the title, the area and the arrangement, closes the window, shows
   "Navigation menu was successfully added" (or "Navigation menu was
   successfully updated") at the top right, and the table shows the
   change; the public header shows it from the next page load. "Cancel",
   the window's back arrow or the Escape key close the window at once
   when nothing changed; after a change they first ask "Warning" "The
   data on this form has changed. Do you wish to continue without
   saving?", where "Yes" closes the window and stores nothing and "No"
   returns to it. Leaving the page while the window holds a change
   raises the browser's own leave question. <sup>j</sup> <sup>td7</sup>
   - 6a. **After "Yes".** Once a changed area (on a journal or press, a
     typed title too) is discarded with "Yes", the next move off
     Settings › Website still raises the browser's leave question,
     though nothing is left unsaved ⚠ [A17](#a17); after a discarded
     drag it does not.
7. **The two icons on items.** Both panels mark items with icons, and
   pressing an icon opens a window headed "Notice" with an "OK" button.
   <sup>k</sup> <sup>td8</sup>
   - 7a. **The eye.** An item of a type that shows only under a condition
     carries a crossed-out eye, except "Subscriptions" and "My
     Subscriptions" {OJS} [OJS1](#ojs1); its notice is the type's text in
     the last column of the item types table (Fields).
   - 7b. **The warning.** In a menu's window, an item that has items
     under it in that menu, as last saved, carries a red warning icon: an
     item given a sub-item gains it only after "Save" and the window
     reopened, and "About" dragged to "Unassigned Menu Items" keeps it
     there until then. Its notice reads
     "When a menu item opens
     a submenu, it's link can not be followed on all devices. For example,
     if you have an "About" item which opens a submenu with "Contact" and
     "Editorial Masthead", the "About" link may not be reachable on all
     devices. In the default menu, this is handled by creating a second
     menu item, "About the Journal", which appears in the submenu." On a
     new journal "About" carries both icons in the "Primary Navigation
     Menu" window and the username item in the "User Navigation Menu"
     window; in the other menu's window, where it waits under "Unassigned
     Menu Items", each carries the eye alone.
8. **The area decides where a menu shows.** A menu shows only while it
   fills an area of the header: "primary" is the row of links across the
   top of every page, "user" the links at the top right (Rules 15 and 18).
   A menu left at "None" shows nowhere. An area no menu fills stays empty
   on every page: no links, and nothing put in their place. The areas
   offered are the active theme's (*Appearance & theming* owns the
   theme). <sup>j</sup> <sup>o</sup>
9. **Deleting a menu.** "Remove" opens a window headed "Remove": "Are you
   sure you wish to delete this item? This action cannot be undone." with
   "OK" and "Cancel". "OK" deletes the menu, shows "Navigation menu was
   successfully removed" and takes its row away. Its items stay in
   "Navigation Menu Items" and in any other menu that holds them; the
   area it filled is left empty (Rule 8). <sup>i</sup> <sup>td10</sup>

**Items**

10. **The "Navigation Menu Items" table.** It lists every item of the
    journal, each under the title the header would show the viewing
    manager (the username item under the manager's own username), in no
    fixed order. An item saved from its "Edit" window usually moves to
    the end of the table, but not always. <sup>i</sup> <sup>td5</sup>
11. **Adding and editing an item.** "Save" in the item window stores the
    item, closes the window, shows "Navigation menu item was successfully
    added" (or "Navigation menu item was successfully updated") and the
    table shows the change. A new item belongs to no menu: it waits in
    every menu's "Unassigned Menu Items" until a manager drags it into
    one (Rule 5). A changed title or address shows in every menu that
    holds the item from the next page load. <sup>l</sup> <sup>td10</sup>
    - 11a. **Leaving the item window.** The window's back arrow
      ("Close"), changed or not, opens the browser's own box "The data on
      this form has changed. Do you wish to continue without saving?":
      "Cancel" keeps the window, "OK" closes it and stores nothing. Right
      after a refused "Save" the back arrow instead closes the window at
      once, with no box and nothing stored; once a box is changed again,
      it opens the box again. Leaving Settings › Website while the window
      is open, even untouched (a side-menu entry, a typed address), raises
      the browser's leave question; with the window closed first, the page is
      left quietly ⚠ [A18](#a18). The menu window asks in the page
      instead, and only after a change (Rule 6).
12. **Titles and languages.** An installed item shows its installed
    title in the visitor's language when that language is ticked under
    "Forms" (Settings › Website › "Setup" › "Languages"). A language
    ticked under "UI" alone (French on the seeded journal) shows the
    primary language's titles, and the item window has no box for it;
    ticking it under "Forms" brings the installed titles at once. A
    menu's title is one text in every language. <sup>l</sup> <sup>td11</sup>
    - 12a. **Typed titles.** A typed title replaces the installed one in
      that language only: after the English title is changed, a visitor
      reading in French still sees the installed French title. Emptying a
      typed title in a language other than the primary one gives that
      language the installed title back. An item a manager created shows,
      in a language it has no title for, the primary language's title.
13. **Deleting an item.** "Remove" asks as for a menu (Rule 9); "OK"
    deletes the item, shows "Navigation menu item was successfully
    removed", and takes it out of every menu that held it. Items that
    sat under it in a menu leave that menu too and are offered again in
    its "Unassigned Menu Items". <sup>l</sup> <sup>p</sup> <sup>td10</sup>
14. **Where an item leads and when it shows.** Each type's destination and
    condition are in the item types table (Fields). <sup>m</sup>
    - 14a. **A hidden item hides its branch.** An item whose condition
      fails is left out of the header together with the items under it.
      An item whose sub-items are all hidden shows as a plain link, with
      no list under it.
    - 14b. **The item window never mentions the condition.** Its line
      under "Navigation Menu Type" gives the type's description only
      ("Link to the page displaying your announcements."); the condition
      is shown in the menu window alone (Rule 7a). With announcements off,
      the "Announcements" item is simply absent from the header.
      <sup>td12</sup>

**The public header**

15. **Layout.** Every public page of a journal but the bare "404 Not
    Found" page (Rule 26b) opens with the header: the skip links (Rule
    22), the journal's logo or name, the primary menu, "Search" (Rule 17)
    and, at the top right, the user menu (Rule 18).
    <sup>d</sup> <sup>q</sup>
    - 15a. **Logo or name.** The header logo when one is set (*Appearance
      & theming*), otherwise the journal's name as text; either is a link
      to the journal's home page. The site's pages show the site's logo
      or name the same way, and the application's logo while the site has
      neither.
    - 15b. **Narrow windows.** In a narrow browser window the menus fold
      behind a button labelled "Open Menu", which shows and hides them.
      The label reads "Open Menu" in every language ⚠ [A7](#a7).
16. **Submenus.** A top-level item with shown items under it opens their
    list when pointed at, pressed or given Enter; focus alone does not
    open it, and Tab moves past a closed list. The item itself opens no
    page. Pointed at, the list shows only while the pointer stays on the
    item or the list. Pressed, it opens and stays open after the pointer
    leaves, until the visitor presses the item again, presses elsewhere
    or presses Escape. In a narrow window every list is shown open and the item goes
    nowhere. <sup>q</sup>
    - 16a. **Two levels.** The header shows two levels: an item placed
      deeper than that (possible only when the installation's
      configuration file allows deeper menus, which no screen changes;
      Settings bullet 14) is saved but never shown ⚠ [A9](#a9).
      <sup>z</sup>
17. **"Search".** On a journal's pages the header carries a "Search" link
    after the primary menu, except on the Search page itself; the site's
    pages have none. It opens the Search page
    ([Search](U15-search.md)). The "Search" item of Rule 2 is a separate
    thing: placed in a menu, it adds a second link. <sup>q</sup>
18. **The user menu.** It is the menu in the area "user" (Rule 8). On a
    new journal it shows, signed out, "Register" (while the journal
    accepts registrations, [Registration & account validation](U02-registration-and-account-validation.md),
    Rule 2) and "Login"; signed in, the user's username with a list
    under it: "Dashboard", "View Profile" (the Profile page,
    [User profile](U03-user-profile.md)), "Administration" (the Site
    Administrator only) and "Logout".
    While impersonating, "Logout" reads "Logout as {username}" ([Login &
    sessions](U01-login-and-sessions.md), Rule 15). Pressing the username
    opens that list; it leads nowhere itself. <sup>e</sup>
    - 18a. **"Administration".** It opens the
      [Administration page](U61-system-administration.md#administration-page)
      in the language of the page it was pressed on. From a journal with
      one interface language its address carries none, so
      [Languages & locales](U57-languages-and-locales.md) Rules 17a and
      18 pick the language: French after the site's pages were opened at
      a French address, though the journal's page is in English.
      <sup>e</sup>
19. **Where "Dashboard" leads.** <sup>e</sup> <sup>td13</sup>
    - 19a. **On a journal's pages.** For a user holding there a
      manager-level role, an assistant-level role, Reviewer or Author, or
      for the Site Administrator: the page that user lands on after
      signing in, the Dashboard, the reviewer dashboard or My Submissions
      ([→ landing](U22-my-submissions.md#landing)); a Site Administrator
      holding no role there but Reader is taken to its home page. For
      everyone else, the Profile page: a Reader, and a Section Editor, who
      is sent there
      although the Dashboard is where they work ⚠ [A2](#a2).
    - 19b. **The count.** For the first group of 19a, the username and
      "Dashboard" carry the number of unread tasks, as
      [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)
      (Rule 4) describes.
    - 19c. **On the site's pages.** The Site Administrator's "Dashboard"
      opens the site's home page; every other user's opens the Profile
      page.

**Footer and page furniture**

20. **The footer.** Every public page but the bare "404 Not Found" page
    (Rule 26b) ends with the footer: the "Page
    Footer" text when the journal (or, on the site's pages, the site) has
    one (*Appearance & theming*), then the application's logo, a link to
    the page about the publishing software
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 20). The logo is read to a screen reader as "More information
    about the publishing system, Platform and Workflow by OJS/PKP." ("…by
    OMP/PKP.", on a preprint server "More information about this system,
    Platform and Workflow by OPS/PKP."). Sidebar blocks sit beside the
    content on the same pages, message and access-denied pages
    included; which blocks, and where, is *Appearance & theming*'s.
    <sup>r</sup>
21. **The "Developed By" block.** Once a manager enables the plugin
    "\"Developed By\" Block" and places it in the sidebar (Settings bullet
    15), every public page's sidebar holds a link "Open Journal Systems"
    ("Open Monograph Press", "Open Preprint Systems") to PKP's page about
    the application. Its heading, "Developed By", is read to screen
    readers only; on a preprint server's French pages it reads
    "##plugins.block.developedBy.blockTitle##" ⚠ [OPS3](#ops3). <sup>s</sup>
22. **Skip links.** The first press of the Tab key on a public page
    shows "Skip to main content"; each further press shows the next, in
    this order: <sup>t</sup>
    - "Skip to main navigation menu";
    - on the home page, "Skip to about the journal" ("Skip to about the
      press", "Skip to about the server") while "Show the journal summary
      on the homepage." ("Show the press summary on the homepage.", "Show
      the server summary on the homepage.") is ticked on Settings ›
      Website › "Appearance" › "Theme";
    - on the home page, "Skip to announcements" while it lists
      announcements ([Announcements](U12-announcements.md), Rule 11);
    - on the home page, "Skip to the current issue" {OJS} while the
      journal has a current issue;
    - "Skip to site footer".

    Following one moves the next Tab into that part of the page.
23. **Breadcrumbs.** Most pages under the header open with a trail:
    "Home", then "/" and the page's name. "Home" leads to the journal's
    home page (the site's, on the site's pages); the last step is the
    page itself and is not a link. Home pages have no trail, nor has a
    book's page {OMP} or a section's page {OPS}. Some pages add a step
    in between; each page's own feature says which. <sup>u</sup>
    - "Announcements" before an announcement.
    - On an article {OJS} and a preprint {OPS} the last step is its
      section's name ("Articles", "Preprints"), not its title; an article
      adds "Archives" and, when it is in an issue, that issue before it.
    - A subcategory's page shows its parent category before it (seen on
      a journal and a preprint server; a press's category pages were not
      seen).
24. **Page links.** A list longer than one page (the issue archive {OJS},
    the catalog, series and category pages {OMP}, the list of preprints
    and a section's page {OPS}) ends with "Previous", "{start}-{end} of
    {total}" and "Next"; "Previous" is left out on the first page and
    "Next" on the last, and a list that fits one page shows none of the
    three. How many entries make a page is the journal's "Items per page"
    (Settings bullet 16). <sup>v</sup>
25. **The "Edit" shortcut.** For the users of Actors row 5, pages whose
    text a manager writes in Settings carry a link "Edit", under the
    heading (on "Editorial History", under its first sentence), which
    opens its target in the same window: <sup>f</sup>
    - on "About the Journal", "Editorial History", "Contact", the
      Information pages {OJS OMP}
      ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
      Rule 21) and each part of the "Submissions" page (*Submission
      intake configuration*): the Settings tab holding that text;
    - on the Announcements page ([Announcements](U12-announcements.md),
      Rule 9): Settings › Website › "Announcements", which a
      manager-level role without the Settings pages still opens.

    The "Privacy Statement" and "Editorial Masthead" pages carry none. A
    screen reader hears "Edit" and then "Edit {part}" ("Open a new page
    to edit this information" on a press). The shortcut shows to a
    manager-level role even when that role cannot open the Settings pages
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#a2)).
26. **Message pages and the access-denied page.** Pages that only tell
    the visitor something (a password reset sent, the refusal of a
    journal closed to registration) share one frame: the breadcrumb
    "Home" / {title}, the title as heading, the message, and a link back
    when there is somewhere to go back to ("Login", for example); what
    each says is its feature's. A completed registration shows
    "Registration complete" as heading and last trail step, "Thanks for
    registering! What would you like to do next?" and the links "Make a
    New Submission", "Edit My Profile" and "Continue Browsing". <sup>w</sup>
    - 26a. **The access-denied page** (GLOSSARY) uses the same frame
      with an empty heading and an empty last breadcrumb step, then "The
      current role does not have access to this operation." and no link
      back ⚠ [A3](#a3). <sup>w</sup> <sup>td14</sup>
    - 26b. **An address with no page.** An address the journal has no
      page for answers a bare page headed "404 Not Found", with an empty
      browser tab title and no header, sidebar or footer, so nothing on
      it leads back into the journal. A visitor gets it, signed in or
      not, for: <sup>td20</sup>
      - a path the journal does not have, including one under its About
        pages;
      - an announcement's address while announcements are off;
      - an article that does not exist {OJS};
      - a preprint, or a preprint category, that does not exist {OPS}.

      A missing issue {OJS} or book {OMP} is answered otherwise: a
      signed-out visitor gets the Login page, and a signed-in user the
      access-denied page (Rule 26a) reading "Invalid issue requested!"
      ("An invalid published submission was specified.") in place of
      "The current role does not have access to this operation.". A series that does not exist {OMP} opens the
      "Catalog" page. Each of these pages has the full header, sidebar
      and footer.

**The editorial header and side menu**

27. **The editorial header.** Every editorial screen opens with a dark bar,
    and every window that opens from the right repeats its right-hand
    part as a strip at its top. <sup>g</sup> <sup>td15</sup>
    - 27a. **Left.** The journals switcher (Rule 29), then the journal's
      name, a link to the journal's public home page. On the site's own
      editorial screens (Administration) the site's name stands there,
      a link to the site's home page; while the site has no name, "Open
      Journal Systems" ("Open Monograph Press", "Open Preprint Systems")
      stands in its place.
    - 27b. **Right.** An "i" icon that opens the application's
      documentation (PKP's "Learning OJS" guide, "Learning OMP", "Learning
      OPS") in a new browser tab, the Tasks bell
      ([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md),
      Rule 2) and the user's initials, which open the menu of Rule 28.
      A screen reader, and the page's text, name the "i" icon
      "##common.help##" ⚠ [A1](#a1).
    - 27c. **Skip links.** The first press of the Tab key reveals "Skip to
      main content" and "Skip to main navigation menu".
28. **The initials menu.** Pressing the initials opens, top to bottom:
    <sup>g</sup>
    - "Change Language" with the journal's interface languages, the
      current one ticked, while it has more than one (*Languages &
      locales*);
    - while impersonating (the button then shows both users' initials),
      "You are currently logged in as {username}" with "Logout as
      {username}" ([Login & sessions](U01-login-and-sessions.md), Rule
      13);
    - "Edit Profile" ([User profile](U03-user-profile.md));
    - "Logout", which reads "Logout as {username}" while impersonating.

    Pressing the initials again closes the menu. The Escape key leaves
    it open ⚠ [A25](#a25). <sup>td19</sup>
29. **The journals switcher.** A sitemap icon, named "Journals" ("Presses",
    "Servers") to screen readers, opens the list of journals the user may
    switch to (Actors row 7), in the site's order, the one set on
    Administration › "Hosted Journals" › "Order"
    ([→ site order](U59-hosted-journals.md#site-order)). A journal that
    carries the current journal's name is left out of the list
    ⚠ [A21](#a21). <sup>g</sup> <sup>td16</sup>
    - 29a. **Where it lands.** Choosing a journal opens, for most users,
      that journal's landing page for them
      ([→ landing](U22-my-submissions.md#landing)). The Site
      Administrator, when on the Dashboard, a Settings page,
      "Announcements", "Institutions", "Comments", "Tools", "Statistics"
      or "Issues" {OJS}, gets the same page in the chosen journal; from
      any other page ("DOIs", "Payments" {OJS}, "Catalog" {OMP}, the
      submission wizard, the Profile page, Administration), the chosen
      journal's landing page.
30. **The side menu.** Down the left of the editorial screens, for the
    users of Actors row 8. Its entries, top to bottom, each shown only to
    the roles and under the condition its row names: <sup>h</sup>
    <sup>td17</sup>

    | Entry | Shown to | Only while | What it opens is described in |
    |-------|----------|------------|--------------------------------|
    | "Editor Dashboard" (a group; its first line is the search box "Search submissions") | Journal Manager and the other manager-level roles, Section Editor, assistant-level roles, Site Administrator | — | [Submissions dashboard](U23-submissions-dashboard.md#views-sidebar) |
    | "My Assignments as Reviewer" (a group) | Reviewer | — | [Reviewer's review](U28-reviewers-review.md#reviewer-dashboard) |
    | "My Submissions as Author" (a group) | Author | — | [My Submissions](U22-my-submissions.md) |
    | "Start A New Submission" | every role, a Reader's included | the journal accepts submissions | [Submission wizard](U21-submission-wizard.md#ways-in) |
    | "Announcements" | manager-level roles, Site Administrator | announcements are on | [Announcements](U12-announcements.md) |
    | "DOIs" | manager-level roles, Site Administrator | DOIs are enabled with at least one kind of item | *DOIs* |
    | "Institutions" | manager-level roles, Site Administrator; {OJS} the Subscription Manager while payments are enabled | the site's and the journal's "Enable institutional statistics" are both ticked (Settings bullet 10), or {OJS} payments are enabled | [Institutions](U66-institutions.md) |
    | "Payments" {OJS} | manager-level roles, Site Administrator, Subscription Manager | payments are enabled | *Payments & APCs* |
    | "Settings" (a group: "Journal", "Website", "Workflow", "Distribution", "Users & Roles") | manager-level roles with "Permit changes to Settings", Site Administrator | — | [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access) |
    | "Content" (a group: "Comments" while public comments are on; "Issues" {OJS}; "Catalog" {OMP}) | manager-level roles, Site Administrator | on a preprint server, public comments are on [OPS1](#ops1) | [Reader comments & moderation](U14-reader-comments-and-moderation.md), *Issues*, *Catalog management* |
    | "Statistics" (a group: "Articles" ("Monographs", "Preprints"), "Issues" {OJS}, "Journal" ("Press", "Server"), "Editorial Activity", "Users", "Counter R5", and "Reports" for manager-level roles and the Site Administrator) | manager-level roles, Section Editor, Site Administrator | — | *Statistics — usage*, *Statistics — editorial activity & reports* |
    | "Tools" | manager-level roles, Site Administrator | — | *Import & export* |
    | "Administration" | Site Administrator | — | [System administration](U61-system-administration.md#administration-page) |

    The entry of the screen on show is highlighted, and a group holding
    it is open.
    - 30a. **A Site Administrator with Reader alone.** Once the Site
      Administrator's manager role in a journal has ended and they hold
      Reader alone there, each editorial page of that journal opens with
      a window "Error", "The current role does not have access to this
      operation.", while the side menu still offers "Editor Dashboard"
      (the search box alone), "DOIs", "Settings", "Content",
      "Statistics", "Tools" and "Administration" ⚠ [A22](#a22). Where
      "Settings" then leads is
      [→ settings access](U07-journal-identity-and-about-pages.md#settings-access).
    - 30b. **French.** In the French interface four of the side menu's
      texts are raw codes ⚠ [A23](#a23):
      - the "Content" group's label, on a journal and a press;
      - the "DOIs" entry's label, on a press and a preprint server;
      - the placeholder of the "Search submissions" box, on all three;
      - the "Statistics" group's "Monographs" entry {OMP}.
31. **Notices while a page is left.** The top-right area where notices
    appear ([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md))
    shows nothing while an editorial page is being left for another.
    <sup>td18</sup>

## Side effects

- **Saving or deleting a menu or an item** sends no email and no
  notification and leaves no line in any log a user can read; the one
  trace is the notice at the top right of the manager's screen (Rules 6,
  9, 11, 13). <sup>x</sup>
- **The public header** of the journal (or of the site, for the site's
  menus) changes from the next page load for every visitor, signed in or
  not. <sup>x</sup>

## Settings that modify behavior

1. **"Enable announcements"** (Settings › Website › "Setup" ›
   "Announcements"; unticked). Ticked: the "Announcements" item shows in
   the header (item types table) and the side menu gains "Announcements"
   (Rule 30). [Announcements](U12-announcements.md) owns the tab.
   <sup>m</sup>
2. **"Publishing Mode"** {OJS} / **"Posting Mode"** {OPS} (Settings ›
   Distribution › "Access"; a new journal arrives with neither choice
   ticked and publishes as open access). Set to "OJS will not be used to
   publish the journal's contents online.": the "Current Issue" and
   "Archives" items leave the header (item types table). On a preprint
   server "OPS will not be used to post the server's contents online."
   shows "Saved" but is not kept, and "Archives" stays [OPS2](#ops2).
   *Subscriptions & open access control* owns the tab. <sup>m</sup>
3. **The principal contact's "Name" and the "Mailing Address"**
   (Settings › Journal › "Contact"; a new journal arrives with a contact
   name). With both empty the "Contact" item leaves the header; "Name" is
   required on that tab, so a saved journal always has one
   ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Fields). <sup>m</sup>
4. **"Privacy Statement"** (Settings › Website › "Setup" › "Privacy
   Statement"; a default text). Emptied: the "Privacy Statement" item
   leaves the header ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Rule 18). <sup>m</sup>
5. **"User Registration"** (Settings › Users & Roles › "Site Access
   Options"; "Visitors can register a user account with the journal.").
   The other choice: the "Register" item leaves the header
   ([Registration & account validation](U02-registration-and-account-validation.md),
   Rule 2). <sup>m</sup>
6. **Payments** {OJS} (Settings › Distribution › "Payments"; off). On:
   the side menu gains "Payments" and "Institutions" (Rule 30) as soon as
   "Enable" is saved; once a currency and a payment method are set too,
   the "Subscriptions" item shows, and "My Subscriptions" for a
   signed-in visitor while "Publishing Mode" requires subscriptions.
   *Payments & APCs* owns the tab. <sup>m</sup> <sup>h</sup>
7. **"Enable Public Comments"** (Settings › Website › "Content" ›
   "Comments"; unticked). Ticked: the side menu's "Content" group gains
   "Comments", and on a preprint server the group appears at all (Rule
   30; [OPS1](#ops1)). [Reader comments & moderation](U14-reader-comments-and-moderation.md)
   owns the switch. <sup>h</sup>
8. **"Disable Submissions"** (Settings › Workflow › "Submission"; off).
   On: "Start A New Submission" leaves the side menu (Rule 30).
   *Submission intake configuration* owns it. <sup>h</sup>
9. **DOIs** (Settings › Distribution › "DOIs"; on, with "Articles"
   ("Monographs", "Preprints") ticked and no prefix). Off, or on with no
   kind ticked: the side menu has no "DOIs". *DOIs* owns the tab.
   <sup>h</sup>
10. **"Enable institutional statistics"** (Administration › Site Settings
    › "Statistics", then the journal's Settings › Distribution ›
    "Statistics"; both unticked). The journal's box appears once the
    site's is ticked; with both ticked the side menu gains "Institutions"
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 3). <sup>h</sup>
11. **"Permit changes to Settings"** (Settings › Users & Roles › Roles, a
    role's "Edit"; ticked on the Editor and Production Editor roles; the
    manager role's row offers no "Edit", so its box stays ticked).
    Unticked: the role loses the "Settings" group and the Navigation tab
    (Actors row 1) and keeps the "Edit" shortcut (Rule 25), which opens
    the access-denied page
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#a2)).
    On a preprint server the manager role is the only manager-level one,
    so no role there can lose the Settings pages this way. <sup>b</sup>
12. **"UI"** languages (Settings › Website › "Setup" › "Languages"; the
    primary language alone on a scratch journal, English and French on
    the seeded one). More than one: "Change Language" in the initials menu
    (Rule 28). *Languages & locales* owns the column. <sup>g</sup>
13. **"Forms"** languages (the same tab; the primary language alone). Each
    language ticked adds a box to the item window's "Title", "URL" and
    "Query Parameters" (Fields; Rule 12). <sup>l</sup>
14. **The menu depth limit** (the installation's configuration file; 2).
    Higher: the menu window lets items sit that many levels deep (Rule 5a),
    while the header still shows two (Rule 16). No screen changes it.
    <sup>k</sup>
15. **"\"Developed By\" Block"** (Settings › Website › "Plugins" ›
    "Installed Plugins"; disabled) with **"Sidebar"** (Settings › Website ›
    "Appearance" › "Setup"; no block). Enabled and placed: the block of
    Rule 21. *Plugins management* and *Appearance & theming* own the two
    lists. <sup>s</sup>
16. **"Items per page"** (Settings › Website › "Setup" › "Lists"; 25),
    beside "Page links" (10), which these lists do not use. The number of
    entries each listing page shows before the page links of Rule 24
    appear. <sup>v</sup>
17. **"Page Footer"** and the header logo (Settings › Website ›
    "Appearance" › "Setup"; empty). Set: the footer text of Rule 20 and
    the logo of Rule 15a. *Appearance & theming* owns them. <sup>r</sup>
18. **The active theme** (Settings › Website › "Appearance" › "Theme";
    the default theme, the only one installed). It names the areas a menu
    can fill (Rule 8). <sup>o</sup>

## Cross-feature interactions

- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns who opens the Settings pages, the About pages the "About" items
  open, where each page's "Edit" link leads and the page about the
  publishing software the footer links to; this spec owns the menus,
  their conditions and the shortcut's look and audience.
- [Announcements](U12-announcements.md) owns the switch that shows the
  "Announcements" item and the pages it opens; this spec owns the item's
  place and removal.
- [Registration & account validation](U02-registration-and-account-validation.md)
  owns when a journal accepts registrations; [Login & sessions](U01-login-and-sessions.md)
  owns "Login", "Logout" and impersonation; [User profile](U03-user-profile.md)
  owns the Profile page.
- [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)
  owns the Tasks bell, the unread count shown beside the username and the
  notices at the top right; this spec owns the headers they sit in.
- [My Submissions](U22-my-submissions.md#landing) owns the landing rule
  "Dashboard" follows; [Submissions dashboard](U23-submissions-dashboard.md),
  [Reviewer's review](U28-reviewers-review.md) and
  [Submission wizard](U21-submission-wizard.md) own the side-menu groups
  and entries named in Rule 30's table, each with the other features
  that table names.
- [Search](U15-search.md) owns the Search page the header's "Search"
  opens.
- [Hosted journals](U59-hosted-journals.md#site-order) owns the site's
  order of journals, which the journals switcher follows (Rule 29);
  [System administration](U61-system-administration.md#administration-page)
  owns the Administration page that the user menu's and the side menu's
  "Administration" open (Rules 18a, 30).
- [Tasks & discussions](U37-tasks-and-discussions.md) owns the French
  discussions panel's untranslated texts; the help icon's raw name in the
  headers is this spec's [A1](#a1).
- *Custom pages & blocks* owns the page a "Custom Page" item creates and
  its "Preview".
- *Appearance & theming* owns the header logo, the "Page Footer", the
  theme and its areas, and the sidebar with its blocks.
- [Languages & locales](U57-languages-and-locales.md) owns the "UI" and
  "Forms" languages and which language a page opens in, the
  Administration page's from a journal with one interface language
  included (Rule 18a).

## Canonical scenarios

Scenarios 1 to 3 only read, and run on the seeded journal with ready
accounts; every other scenario changes a menu, an item or a setting, or
needs a second journal, and runs on scratch journals with throwaway
accounts, except scenario 8, which changes the site's own items as the
Site Administrator. The accounts, their passwords and the tooling recipe
are in the footnote. <sup>y</sup>

1. **A visitor moves around the seeded journal**

   Given: a visitor, signed out, on the seeded journal's home page, with
   the journal's announcements off.

   - **The header**: across the top, left to right: the journal's name
     as text, a link to this home page; the primary menu, on a journal
     "Current", "Archives" and "About", on a press "Catalog" and "About",
     on a preprint server "Archives" and "About", with no
     "Announcements", announcements being off; "Search"; and at the top
     right "Register" and "Login" (Rules 2, 15, 15a, 17, 18; item types
     table).
   - **The "About" list**: point at "About": a list opens under it with
     "About the Journal" ("About the Press", "About the Server"),
     "Submissions", "Editorial Masthead", "Privacy Statement" and
     "Contact"; press "About" and move the pointer off the header: the
     list stays open and the page stays as it was; press Escape: it
     closes; press "About" again: it opens; press Escape: it closes
     (Rules 2, 16).
   - **A page and its trail**: choose "About the Journal" in that list:
     under the header the trail reads "Home / About the Journal", and
     "About the Journal" in it is not a link; press "Home": the home page
     opens, with no trail (Rule 23).
   - **The skip links**: on "About the Journal", press Tab: "Skip to main
     content" shows; press Tab again: "Skip to main navigation menu";
     again: "Skip to site footer"; press Enter on it, then Tab: the focus
     is in the footer (Rule 22).
   - **The footer**: at the foot of the page sits the application's logo,
     which a screen reader reads as "More information about the
     publishing system, Platform and Workflow by OJS/PKP." ("…by OMP/PKP.";
     on a preprint server "More information about this system, Platform
     and Workflow by OPS/PKP."); press it: the page about the publishing
     software opens (Rule 20).
   - **"Search"**: press "Search" in the header: the Search page opens,
     and its header carries no "Search" link (Rule 17).
   - **Control**: "About the Journal" and the Search page carry the same
     name, primary menu and user menu as the home page (Rule 15).

2. **Each role's user menu, "Dashboard" and side menu**

   Given: Journal Manager, an assistant (a Funding Coordinator; on a
   preprint server an Editorial Board Member), Section Editor, Author,
   Reviewer (none on a preprint server) and Reader, each with a ready
   account on the seeded journal, which has English and French as
   interface languages, announcements, public comments and payments off,
   DOIs on, and submissions accepted.

   - **The Journal Manager's user menu**: sign in, then press the
     journal's name in the editorial header: the journal's home page opens
     (Rule 27a); at the top right the header shows their username, then
     the Tasks bell's number ("0" without a badge); press the username: a
     list opens with "Dashboard", "View Profile" and "Logout", and the
     page stays as it was (Rules 18, 19b). Press "Dashboard": the Dashboard
     opens (Rule 19a).
   - **The Journal Manager's editorial header**: on the Dashboard, before
     pressing anything, press Tab: "Skip to main content" and "Skip to
     main navigation menu" show; the dark bar shows the journal's name at
     the left and, at the right, an "i" icon, the Tasks bell and their
     initials; press the "i" icon: PKP's "Learning OJS" guide ("Learning
     OMP", "Learning OPS") opens in a new tab [A1](#a1); press the
     initials: a menu opens with "Change Language" and the journal's two
     interface languages under it, the current one ticked, then "Edit
     Profile" and "Logout"; press the initials again: the menu closes
     (Rules 27, 27a–27c, 28; Settings bullet 12).
   - **The Journal Manager's side menu**: it reads, top to bottom,
     "Editor Dashboard", whose first line is the box "Search
     submissions", "Start A New Submission", "DOIs", "Settings", "Content"
     (holding "Issues" on a journal and "Catalog" on a press; a preprint
     server shows no "Content" group, [OPS1](#ops1)), "Statistics" and
     "Tools", with no "Announcements", "Institutions", "Payments" or
     "Administration"; "Statistics" holds "Articles" ("Monographs",
     "Preprints"), "Issues" {OJS}, "Journal" ("Press", "Server"),
     "Editorial Activity", "Users", "Counter R5" and "Reports". Choose
     "Settings" › "Website": the "Settings" group is open and "Website" is
     highlighted (Rule 30).
   - **The assistant**: sign in, open the journal's home page and press
     the username: the same three entries; press "Dashboard": the
     Dashboard opens; its side menu holds "Editor Dashboard" and "Start A
     New Submission" alone (Rules 18, 19a, 30).
   - **The Section Editor**: sign in: the Dashboard opens; its side menu
     holds "Editor Dashboard", "Start A New Submission" and "Statistics",
     whose list has no "Reports" (Rule 30).
   - **The Author**: sign in, open the journal's home page and press the
     username, then "Dashboard": My Submissions opens; its side menu holds
     "My Submissions as Author" and "Start A New Submission" (Rules 19a,
     30).
   - **The Reviewer** {OJS OMP}: the same way, "Dashboard" opens the
     reviewer dashboard; its side menu holds "My Assignments as Reviewer"
     and "Start A New Submission" (Rules 19a, 30).
   - **The Reader**: the same way, "Dashboard" opens the Profile page; its
     side menu holds "Start A New Submission" alone (Rules 19a, 30).
   - **Control**: no role's username list held "Administration", and only
     the Journal Manager's side menu held "Settings", "DOIs" and "Tools"
     (Rules 18, 30).

3. **The seeded journal's Navigation tab**

   Given: Journal Manager, on the seeded journal, whose menus are the
   installed ones; nothing is saved.

   - **The menus table**: open Settings › Website › "Setup" ›
     "Navigation": two tables, "Navigation" above "Navigation Menu Items".
     "Navigation", with "Add Menu" above it, lists "Primary Navigation
     Menu" and "User Navigation Menu", in either order. The primary menu's
     "Navigation Menu Items" cell names, in any order, "Current", "About
     the Journal", "Submissions", "Archives", "Announcements", "Editorial
     Masthead", "Privacy Statement", "About" and "Contact" (on a press
     "Catalog", "About the Press", "Submissions", "Announcements",
     "About", "Editorial Masthead", "Privacy Statement" and "Contact"; on
     a preprint server "Announcements", "About the Server",
     "Submissions", "Archives", "About", "Editorial Masthead", "Privacy
     Statement" and "Contact"); the user menu's names, in any order,
     "Dashboard", "Register", "View Profile", "Login", the Journal
     Manager's own username, "Administration" and "Logout" (Rules 2, 3,
     3a).
   - **The items table**: "Navigation Menu Items", with "Add item" above
     it, lists seventeen items (sixteen on a press or a preprint server):
     every item the two menus hold, the username item under the Journal
     Manager's username, and "Search" (Rules 2, 10).
   - **A row's arrow**: press the "Settings" arrow at the left of the
     "Primary Navigation Menu" row: "Edit" and "Remove" show under the
     row (Fields).
   - **The menu window**: press the title "Primary Navigation Menu": a
     window headed "Edit" opens from the right, with the "i" icon, the
     Tasks bell and the initials in a strip at its top (Rule 27). "Title"
     reads "Primary Navigation Menu" and "Active Theme Navigation Areas"
     "primary". "Assigned Menu Items" holds "Current", "Archives",
     "Announcements" and "About" (on a press "Catalog", "Announcements",
     "About"; on a preprint server "Announcements", "Archives", "About"),
     with "About the Journal", "Submissions", "Editorial Masthead",
     "Privacy Statement" and "Contact" under "About"; "Unassigned Menu
     Items" holds "Register", "Login", the username item, "Dashboard",
     "View Profile", "Administration", "Logout" and "Search" (Rules 2, 4).
   - **The eye**: a crossed-out eye marks "Announcements", "About", "About
     the Journal" ("About the Press", "About the Server"), "Privacy
     Statement", "Contact", "Register", "Login", the username item,
     "Dashboard", "View Profile", "Administration" and
     "Logout"; "Current", "Archives", "Catalog", "Submissions", "Editorial
     Masthead" and "Search" carry none. Press the eye on "Announcements":
     a window headed "Notice" reads "This link will only be displayed if
     you have enabled announcements under Settings > Website." with an
     "OK" button, which closes it (Rules 7, 7a; item types table).
   - **The warning**: "About" also carries a red warning icon; the
     username item, which this menu does not hold, carries the eye alone.
     Press the warning on "About": "Notice" reads "When a menu item
     opens a submenu, it's link can not be followed on all devices. For
     example, if you have an "About" item which opens a submenu with
     "Contact" and "Editorial Masthead", the "About" link may not be
     reachable on all devices. In the default menu, this is handled by
     creating a second menu item, "About the Journal", which appears in
     the submenu.", on a press and a preprint server too [A13](#a13)
     (Rule 7b).
   - **Control**: press "Cancel": the window closes at once, nothing
     having changed, and both tables read as before (Rule 6).

4. **Put a new link in the primary menu**

   Given: Journal Manager, on a scratch journal with the installed menus,
   and a visitor, signed out, on its home page in a second browser.

   - **The item**: on Settings › Website › "Setup" › "Navigation" press
     "Add item": a window headed "Add item" opens, with "Save" at its foot
     and no "Cancel". Type "Our news" in "Title", choose "Remote URL" in
     "Navigation Menu Type", type "https://pkp.sfu.ca" in "URL" and press
     "Save": the window closes, "Navigation menu item was successfully
     added" shows at the top right, and "Navigation Menu Items" lists "Our
     news" (Fields; Rule 11).
   - **Outside every menu**: press the title "Primary Navigation Menu":
     "Our news" is in "Unassigned Menu Items" (Rule 11).
   - **Two levels at most**: drag "Our news" by its handle ("Drag to
     reorder") onto "Archives" (on a press "Catalog", here and below) in
     "Assigned Menu Items": it sits under "Archives" (Rule 5). Drag
     "Search" from "Unassigned Menu Items" onto "Our news": "Search" does
     not sit under "Our news". Drag "About" onto "Announcements": "About" and the items
     under it do not go under "Announcements" (Rule 5a).
   - **Discarded**: press "Cancel": a window "Warning" asks "The data on
     this form has changed. Do you wish to continue without saving?";
     press "Yes": the window closes; press the title "Primary Navigation
     Menu" again: "Our news" is back in "Unassigned Menu Items" and the
     menu reads as before the drags (Rule 6).
   - **Asked, then kept**: drag "Our news" onto "Archives" again; press
     "Cancel": "Warning" asks the same; press "No": the window is back,
     "Our news" still under "Archives", and "Archives" carries no red
     warning icon (Rules 6, 7b).
   - **Saved**: press "Save": the window closes, "Navigation menu was
     successfully updated" shows at the top right, and the "Navigation"
     table's primary menu cell names "Our news" (Rule 6). Press the title
     again: "Archives" now carries the red warning icon (Rule 7b); press
     "Cancel".
   - **The visitor's header**: the visitor reloads the home page: pointing
     at "Archives" opens a list holding "Our news"; pressing "Archives"
     opens no page; pressing "Our news" leaves, in the same browser tab,
     for https://pkp.sfu.ca (Rules 11, 16; item types table).
   - **Edited**: Journal Manager: press the "Settings" arrow of "Our news"
     in "Navigation Menu Items" and then "Edit": a window headed "Edit"
     opens; replace "Our news" with "PKP news" and press "Save":
     "Navigation menu item was successfully updated" shows, and
     "Navigation Menu Items" lists "PKP news" once and no longer "Our
     news" (Rules 10, 11); the
     "Navigation" table's cell still names "Our news" until the page is
     reloaded [A15](#a15). The visitor reloads: the "Archives" list holds
     "PKP news" (Rule 11).
   - **Control**: after "No" and before "Save", the visitor's reloaded
     home page showed "Archives" with no list and no "Our news" (Rule 6).

5. **The item window refuses a save**

   Given: Journal Manager, on a scratch journal, on Settings › Website ›
   "Setup" › "Navigation".

   - **No title**: press "Add item", choose "Remote URL" in "Navigation
     Menu Type", type "https://pkp.sfu.ca" in "URL" and press "Save" with
     "Title" empty: "This field is required." shows under "Title" and the
     window stays open (Fields).
   - **No type**: type "Our page" in "Title", set "Navigation Menu Type"
     back to "Choose a type..." and press "Save": the window stays open
     and no message shows anywhere [A11](#a11); the line under the list
     still describes "Remote URL" [A12](#a12) (Fields).
   - **Not a web address**: choose "Remote URL" again, replace the
     address in "URL" with "pkp.sfu.ca" and press "Save": the window
     stays open, with no message (Fields).
   - **A path with other characters**: choose "Custom Page", type "my
     page" in "Path" and press "Save": the window stays open, with no
     message (Fields).
   - **A path accepted**: replace the path with "our-page" and press
     "Save": the window closes, "Navigation menu item was successfully
     added" shows at the top right, and "Navigation Menu Items" lists "Our
     page" (Fields; Rule 11).
   - **A path already used**: press "Add item", type "Second page" in
     "Title", choose "Custom Page", type "our-page" in "Path" and press
     "Save": the window stays open, with no message (Fields). Press the
     back arrow at the window's top: the window closes at once, with no
     question [A18](#a18) (Rule 11a).
   - **Control**: "Navigation Menu Items" lists "Our page" once, and no
     "Second page": no refused save stored anything (Fields).

6. **Add a menu, remove the primary one, and fill its area**

   Given: Journal Manager, on a scratch journal with the installed menus,
   on Settings › Website › "Setup" › "Navigation", and a visitor, signed
   out, on its home page in a second browser.

   - **The new window**: press "Add Menu": a window headed "Add Menu"
     opens; "Active Theme Navigation Areas" reads "None", "Unassigned Menu
     Items" holds every item of the journal, and "Assigned Menu Items"
     reads "No items assigned to this menu. Drag items from Unassigned
     Menu Items." (Fields; Rule 4).
   - **No title**: press "Save": "This field is required." shows under
     "Title", and at the window's foot "Please correct one error." with a
     link "Jump to next error"; "Save" stays greyed until "Title" changes
     (Fields).
   - **A title in use**: type "Primary Navigation Menu" in "Title" and
     press "Save": "This title already exists for another navigation
     menu." shows under the box, and at the top right "The form was not
     saved because 1 error(s) were encountered. Please correct these
     errors and try again." (Fields).
   - **An area in use**: replace the title with "Footer links", choose
     "primary" in "Active Theme Navigation Areas" and press "Save": "A
     navigation menu is already assigned to this area." shows under the
     list, with the same notice at the top right (Fields).
   - **Saved at "None"**: choose "None" again, drag "Search" into
     "Assigned Menu Items" and press "Save": the window closes,
     "Navigation menu was successfully added" shows at the top right, and
     "Navigation" gains the row "Footer links", its cell reading "Search"
     (Rule 6). The visitor reloads: the header shows the primary menu as
     before and one "Search" link (Rules 8, 17).
   - **"Remove", then "Cancel"**: press the "Settings" arrow of "Primary
     Navigation Menu", then "Remove": a window headed "Remove" reads "Are
     you sure you wish to delete this item? This action cannot be
     undone." with "OK" and "Cancel"; press "Cancel": the row stays (Rule
     9).
   - **Removed**: press "Remove" again, then "OK": "Navigation menu was
     successfully removed" shows at the top right and the row goes;
     "Navigation Menu Items" still lists "Current", "Archives" and "About"
     ("Catalog" and "About" on a press, "Archives" and "About" on a
     preprint server) (Rule 9). The visitor reloads: the header has no
     primary menu links and nothing in their place, and keeps its own
     "Search" and the user menu (Rules 8, 15).
   - **The area filled again**: press the title "Footer links", choose
     "primary" and press "Save": "Navigation menu was successfully
     updated". The visitor reloads: where the primary menu was, the
     header shows the menu's "Search" link and then its own "Search" (Rules
     8, 17).
   - **Control**: the seeded journal's home page, opened now, still shows
     its primary menu (Rule 1).

7. **Remove an item that has items under it**

   Given: Journal Manager, on a scratch journal with the installed menus,
   on Settings › Website › "Setup" › "Navigation", and a visitor, signed
   out, on its home page in a second browser, where pointing at "About"
   opens its list of five.

   - **Removed**: press the "Settings" arrow of "About" in "Navigation
     Menu Items", then "Remove": the window "Remove" asks "Are you sure
     you wish to delete this item? This action cannot be undone."; press
     "OK": "Navigation menu item was successfully removed" shows at the
     top right and "About" leaves the table (Rule 13); the "Navigation"
     table's cell still names it until the page is reloaded [A15](#a15).
   - **The menu window**: press the title "Primary Navigation Menu":
     "Assigned Menu Items" holds "Current", "Archives" and "Announcements"
     (on a press "Catalog" and "Announcements"; on a preprint server
     "Announcements" and "Archives"), and "About the Journal",
     "Submissions", "Editorial Masthead", "Privacy Statement" and "Contact"
     are among "Unassigned Menu Items" (Rule 13); press "Cancel".
   - **The visitor's header**: the visitor reloads: the primary menu reads
     "Current" and "Archives" ("Catalog" on a press, "Archives" on a
     preprint server), with no "About" and no list (Rule 13).
   - **Control**: the other items stay in "Navigation Menu Items", "About
     the Journal" and "Contact" among them (Rule 13).

8. **The site's own Navigation tab**

   Given: Site Administrator, on a site hosting the seeded journal and
   scratch journals, whose own menus are the installed ones, and a
   visitor, signed out, on the site's home page in a second browser.

   - **The tab**: open Administration › "Site Settings" › "Site Setup" ›
     "Navigation": the same two tables as a journal's; "Navigation" lists
     "User Navigation Menu" alone, and "Navigation Menu Items" its seven
     items, "Register", "Login", the Site Administrator's username,
     "Dashboard", "View Profile", "Administration" and "Logout", with no
     "Search" (Rules 1b, 2, 10).
   - **The menu kept**: press the "Settings" arrow of "User Navigation
     Menu", then "Remove": the window "Remove" asks "Are you sure you wish
     to delete this item? This action cannot be undone."; press "Cancel":
     the row stays (Rules 1b, 9).
   - **An item added**: press "Add item": the window opens as on a journal
     [A14](#a14); type "PKP" in "Title", choose "Remote URL", type
     "https://pkp.sfu.ca" in "URL" and press "Save": "Navigation menu item
     was successfully added" shows at the top right and "Navigation Menu
     Items" lists "PKP" (Rules 1b, 11).
   - **An item renamed**: press the "Settings" arrow of "Login", then
     "Edit"; replace "Login" with "Sign in" and press "Save": "Navigation
     menu item was successfully updated". The visitor reloads the site's
     home page: "Sign in" stands at the top right where "Login" was (Rules
     11, 18). Put "Login" back the same way.
   - **An item removed**: press the "Settings" arrow of "PKP", then
     "Remove" and "OK": "Navigation menu item was successfully removed"
     shows and "PKP" leaves the table (Rule 13).
   - **Control**: while "PKP" existed, the visitor's site home page showed
     no "PKP" link, a new item belonging to no menu, and no primary menu
     (Rules 2, 11).

9. **The journals switcher, and a journal where the user holds no role**

   Given: two scratch journals, a first and a second, each with the Site
   Administrator as a Journal Manager and English as its one interface
   language, and a throwaway Author of the first journal who holds no
   role in the second.

   - **No role in the journal**: Author: sign in, open the second
     journal's home page, press the username and choose "View Profile":
     the Profile page opens with the editorial header and no side menu
     (Actors rows 6, 8). The dark bar shows, at the left, a sitemap icon
     and the second journal's name, a link to its home page, and at the
     right the "i" icon, the Tasks bell and the Author's initials, which
     open "Edit Profile" and "Logout" alone, with no "Change Language"
     (Rules 27, 27a, 27b, 28).
   - **The Author's switcher**: press the sitemap icon: the list holds the
     first journal alone, by its name; choose it: the first journal's My
     Submissions opens (Rules 29, 29a).
   - **Nothing to switch to**: on the first journal's My Submissions the
     dark bar has no sitemap icon, the Author holding a role in no other
     journal (Rule 29).
   - **The Site Administrator's switcher**: sign in as the Site
     Administrator and open the first journal's Settings › Website: the
     sitemap icon's list holds the second journal and the seeded journal,
     among the site's other journals, and not the first (Rule 29); choose
     the second journal: Settings › Website of the second journal opens
     (Rule 29a). Choose "Edit Profile" in the initials menu, then the first
     journal in the sitemap list: the first journal's Dashboard opens
     (Rule 29a).
   - **"Administration"**: open the first journal's home page and press
     the username: the list holds "Dashboard", "View Profile",
     "Administration" and "Logout"; press "Administration": the
     Administration page opens (Rule 18).
   - **Control**: on the first journal's My Submissions the Author has a
     side menu, "My Submissions as Author" and "Start A New Submission"
     (Rule 30).

10. **Page links on a list longer than a page**

    Given: Journal Manager, on a scratch journal with three published
    issues (a press with three published books, a preprint server with
    three posted preprints), and a visitor, signed out, on its home page
    in a second browser.

    - **"Items per page"**: Journal Manager: open Settings › Website ›
      "Setup" › "Lists": "Items per page" reads 25 and "Page links" 10;
      replace 25 with 1 and press "Save" (Settings bullet 16).
    - **Page by page**: the visitor presses "Archives" in the header
      ("Catalog" on a press): the list shows one entry, then "1-1 of 3"
      and "Next", with no "Previous"; press "Next": "Previous", "2-2 of
      3" and "Next"; press "Next": "Previous" and "3-3 of 3", with no
      "Next"; press "Previous": "2-2 of 3" again (Rule 24).
    - **A preprint's trail** {OPS}: open one of the preprints: its trail
      reads "Home / Preprints", the section's name, not the preprint's
      title (Rule 23).
    - **Control**: before the change, at 25, the same list showed the
      three entries on one page, with no "Previous", no "Next" and no
      count (Rule 24).

11. **The "Developed By" block**

    Given: Journal Manager, on a scratch journal whose "\"Developed By\"
    Block" plugin is enabled and not placed in the sidebar, and a
    visitor, signed out, on its home page in a second browser.

    - **Placed**: open Settings › Website › "Appearance" › "Setup", tick
      "\"Developed By\" Block" in the "Sidebar" list and press "Save"
      (Settings bullet 15).
    - **Every page**: the visitor reloads the home page: the sidebar holds
      a link "Open Journal Systems" ("Open Monograph Press", "Open Preprint
      Systems") that leads to PKP's page about the application, and a
      screen reader hears the heading "Developed By" before it, a heading
      not shown on screen; "About the Journal" and the Search page carry
      the same link (Rule 21).
    - **Control**: before the save, the visitor's home page had no "Open
      Journal Systems" link in its sidebar (Rule 21).

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — states:
  - "Publishing Mode" set to "OJS will not be used to publish the journal's contents online." {OJS}: "Current Issue" and "Archives" leaving the header (Settings bullet 2; item types table)
  - a Reader with no side menu while "Disable Submissions" is on (Actors row 8)
  - an address with no page: the bare "404 Not Found" with no header, sidebar or footer; a missing issue {OJS} or book {OMP} giving a visitor the Login page and a signed-in user the access-denied page; a missing series {OMP} opening the "Catalog" page (Rule 26b)
- **Budget** — variants:
  - item titles per "Forms" language: a "UI"-only language showing the primary language's titles, a typed title replacing the installed one in its language only, and the installed title given back when a typed one is emptied (Rules 12, 12a)
  - a second "Forms" language adding a box per language to "Title", "URL" and "Query Parameters" (Settings bullet 13)
  - a hidden item hiding the items under it, and a top-level item whose sub-items are all hidden shown as a plain link (Rule 14a)
  - the home page's own skip links: about the journal, announcements and {OJS} the current issue (Rule 22)
  - an article's trail {OJS}, its section's name last, after "Archives" and its issue (Rule 23)
  - "Query Parameters" added to an item's link (Fields)
  - an item held by two menus (Rule 4)
  - the username item's red warning icon in the "User Navigation Menu" window (Rule 7b)
  - the header's "About" list closed by a second press on "About" or by a press elsewhere (Rule 16)
  - a branch dragged back to "Unassigned Menu Items", its items arriving as entries of their own (Rule 5b)
  - the Site Administrator holding Reader alone: "Dashboard" opening the journal's home page (Rule 19a)
  - "Dashboard" on the site's pages (Rule 19c)
  - "Administration" pressed on a journal with one interface language after the site's pages opened in French, opening in French too (Rule 18a)
  - the notice area while an editorial page is left (Rule 31)
- **Nothing new to test**:
  - the Editor and the Production Editor on the Navigation tab: the same tab and the same offer as the Journal Manager in scenarios 3 to 7 (Actors row 1)
- **Register carries it**:
  - A1 (the help icon's raw name; Rule 27b; scenario 2 marks it)
  - A2 (a Section Editor's "Dashboard" opening the Profile page; Rule 19a)
  - A3 (the access-denied page's empty heading and last trail step; Rule 26a)
  - A4 (a site menu that cannot be added or edited; Rule 1b)
  - A5 (the "About" notice's condition never applied; item types table)
  - A6 (the "Privacy Statement" and "Contact" notices naming the wrong tab; item types table)
  - A7 ("Open Menu" in English in every language; Rule 15b)
  - A8 (a menu arranged only with a mouse; Rule 5c)
  - A10 (a menu title in other letter case saved as a second menu; Fields)
  - A11 (the item window's refusals without a message; Fields; scenario 5 marks it)
  - A12 (the type's description kept after "Choose a type..."; Fields; scenario 5 marks it)
  - A13 (a press's and a preprint server's notices speaking of a journal; item types table; Rule 7b; scenario 3 marks it)
  - A14 (the site's item window offering types with no site page; Rule 1b; scenario 8 marks it)
  - A15 (the "Navigation" cells kept stale until a reload; Rule 3b; scenarios 4 and 7 mark it)
  - A16 (both panel texts in the menu window of a journal with no item; Rule 4)
  - A17 (the browser's leave question after a discarded change; Rule 6a)
  - A18 (the item window asking on a close with nothing typed, holding the page while open, and closing without asking after a refused "Save"; Rule 11a; scenario 5 marks it)
  - A21 (two journals of the same name hiding each other in the switcher; Rule 29)
  - A22 (the Site Administrator holding Reader alone: the manager's side menu and an "Error" window; Rule 30a)
  - A23 (raw codes in the French side menu: the "Content" and "DOIs" labels, the "Search submissions" placeholder, a press's "Monographs" statistics entry; Rule 30b)
  - A24 (raw codes in the item window's "Query Parameters", the menu window's drag handles and a press's "New Releases" type in the French interface; Fields)
  - A25 (the initials menu left open by the Escape key; Rule 28)
  - OJS1 (no eye on "Subscriptions" and "My Subscriptions" {OJS}; Rule 7a)
  - OPS2 ("Posting Mode" not kept, so "Archives" stays {OPS}; Settings bullet 2)
  - OPS3 (the French "Developed By" heading's raw code {OPS}; Rule 21)
- **No seed**:
  - the site's only menu removed with "OK" (Rule 1b): no screen can give the site a menu back (A4), so the test install would stay without one
  - "Series" and "Category" items {OMP}: no key seeds a series or category on a scratch press (item types table)
  - the principal contact's "Name" and "Mailing Address" both empty: the "Contact" tab refuses an empty "Name" (Settings bullet 3)
  - a deeper menu depth limit: only the installation's configuration file sets it (Settings bullet 14; Rule 16a; A9)
  - another theme with other areas: the default theme is the only one installed (Settings bullet 18; Rule 8)
- **Owned by another feature**:
  - every role without the Settings pages refused the Navigation tab (Actors row 1; [Journal identity & about pages](U07-journal-identity-and-about-pages.md) scenario 2)
  - the "Edit" shortcut shown to manager-level roles only (Actors row 5; Rule 25; [Journal identity & about pages](U07-journal-identity-and-about-pages.md) scenarios 1, 2 and 11)
  - "Permit changes to Settings" unticked: no "Settings" group, the "Edit" shortcut kept (Settings bullet 11; [Journal identity & about pages](U07-journal-identity-and-about-pages.md) scenario 11)
  - the journals switcher following the site's order once it is changed with "Order" (Rule 29; [Hosted journals](U59-hosted-journals.md) scenario 5)
  - "Logout as {username}" while impersonating (Rules 18, 28; [Login & sessions](U01-login-and-sessions.md) scenario 7)
  - message pages: a password reset sent, registration closed, "Registration complete" (Rule 26; [Login & sessions](U01-login-and-sessions.md) scenario 4, [Registration & account validation](U02-registration-and-account-validation.md) scenarios 1 and 5)
  - "Enable announcements" ticked: the "Announcements" item and side-menu entry (Settings bullet 1; [Announcements](U12-announcements.md) scenario 1)
  - "Privacy Statement" emptied: its item leaving the header (Settings bullet 4; [Journal identity & about pages](U07-journal-identity-and-about-pages.md) scenario 5)
  - registration closed: "Register" leaving the header (Settings bullet 5; [Registration & account validation](U02-registration-and-account-validation.md) scenario 5)
  - "Enable Public Comments" ticked: "Content" › "Comments", and the "Content" group on a preprint server (Settings bullet 7; OPS1; [Reader comments & moderation](U14-reader-comments-and-moderation.md) scenario 1)
  - payments on {OJS}: the "Payments" and "Institutions" entries, then the "Subscriptions" and "My Subscriptions" items (Settings bullet 6; *Payments & APCs*)
  - "Disable Submissions" on: "Start A New Submission" leaving the side menu (Settings bullet 8; *Submission intake configuration*)
  - DOIs off, or on with no kind ticked: no "DOIs" entry (Settings bullet 9; *DOIs*)
  - institutional statistics ticked on the site and the journal: the "Institutions" entry (Settings bullet 10; [Institutions](U66-institutions.md))
  - a "Custom Page" item's page and its "Preview" (Fields; *Custom pages & blocks*)
  - a "Page Footer" and a header logo set (Settings bullet 17; Rules 15a, 20; *Appearance & theming*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-23), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | The editorial header's help icon is named "##common.help##" | 🐞 | minor | — |
| [A2](#a2) | A Section Editor's "Dashboard" in the public header opens the Profile page | 🐞 | minor | — |
| [A3](#a3) | The access-denied page has an empty heading and an empty last breadcrumb | 🐞 | minor | — |
| [A4](#a4) | On the site's Navigation tab, "Add Menu" and a menu's "Edit" open nothing and leave the page dimmed | 🐞 | user-visible · crash: script | — |
| [A6](#a6) | The "Privacy Statement" and "Contact" notices send the manager to the wrong Settings tab | 🐞 | minor | — |
| [A7](#a7) | The header's "Open Menu" button is labelled in English in every language | 🐞 | minor | — |
| [A11](#a11) | The item window refuses a missing type, a bad path or a bad URL with no message | 🐞 | user-visible | — |
| [A12](#a12) | Back at "Choose a type...", the item window keeps the last type's description | 🐞 | minor | — |
| [A13](#a13) | On a press and a preprint server the notices still say "About the Journal" and "Settings > Journal" | 🐞 | minor | — |
| [A15](#a15) | The "Navigation" table keeps an item's old title, or a removed item, until a reload | 🐞 | minor | — |
| [A16](#a16) | With no item at all, the menu window says both panels are settled | 🐞 | minor | — |
| [A17](#a17) | After a change is discarded with "Yes", leaving the page still asks about unsaved changes | 🐞 | minor | — |
| [A18](#a18) | The item window asks before closing even when nothing was typed, and so does leaving the page; right after a refused "Save" it closes without asking | 🐞 | minor | — |
| [A21](#a21) | Two journals with the same name hide each other in the journals switcher | 🐞 | minor | — |
| [A22](#a22) | A Site Administrator holding Reader alone gets the manager's side menu and an "Error" window on every page | 🐞 | minor | — |
| [A23](#a23) | In French, the side menu's "Content" group {OJS OMP}, "DOIs" entry {OMP OPS}, "Search submissions" box and a press's "Monographs" entry {OMP} read raw codes | 🐞 | minor | — |
| [A24](#a24) | In French, the item window's "Query Parameters" box, the menu window's drag handles and a press's "New Releases" type read raw codes | 🐞 | minor | — |
| [OJS1](#ojs1) | "Subscriptions" and "My Subscriptions" carry no eye icon, so their notices never show {OJS} | 🐞 | minor | — |
| [OPS2](#ops2) | A preprint server's "Posting Mode" is not kept, so "Archives" never hides {OPS} | 🐞 | user-visible | — |
| [OPS3](#ops3) | On a preprint server's French pages the "Developed By" heading reads a raw code {OPS} | 🐞 | minor | — |
| [A5](#a5) | The "About" item's notice promises a condition the header never applies | ❓ | minor | — |
| [A8](#a8) | A menu can only be arranged with a mouse | ❓ | user-visible | — |
| [A9](#a9) | Items saved three levels deep never show in the header | ❓ | latent | — |
| [A10](#a10) | A menu titled like another in other letter case is saved as a second menu | ❓ | minor | — |
| [A14](#a14) | The site's "Add item" offers types the site has no page for | ❓ | minor | — |
| [A25](#a25) | The editorial header's initials menu stays open when Escape is pressed | ❓ | minor | — |
| [OPS1](#ops1) | A preprint server's side menu has no "Content" group while public comments are off {OPS} | ✅ | minor | — |
| [A19](#a19) | Retired: on French pages the installed "Editorial Masthead" item read "##common.editorialMasthead##"; it now reads "Entête" (Rule 12) | ✅ | retired | upstream change + claim check (claude), 2026-09-24 — fixed upstream |
| [A20](#a20) | Retired: in French the initials menu's language heading read "##common.changeLanguage##"; it now reads "Changer la langue" (Rule 28) | ✅ | retired | upstream change + claim check (claude), 2026-09-24 — fixed upstream |

### All apps

<a id="a1"></a>
**A1 — The help icon is named "##common.help##"** · 🐞 · minor.
The "i" icon in every editorial header, and in the strip atop every
window that opens from the right, should be announced as "Help". A
screen reader, and the page's text, give it the raw text
"##common.help##" instead, in every app and language.
Since: 2025-04-10 · Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A Section Editor's "Dashboard" opens the Profile page** · 🐞 · minor.
On a journal's public pages, "Dashboard" under the username leads a
Journal Manager, an assistant, a Reviewer or an Author to the list they
work from (Rule 19a). A Section Editor, whose work is on the Dashboard,
is taken to the Profile page instead. The same cause leaves their name
without the unread count
([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md#a3)).
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The access-denied page has no heading** · 🐞 · minor.
A signed-in user refused a screen gets a page whose heading and last
breadcrumb step are empty, above "The current role does not have access
to this operation.". The visitor expects a heading that says access was
denied.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The site's menus cannot be added or edited** · 🐞 · user-visible · crash: script.
On Administration › "Site Settings" › "Site Setup" › "Navigation", "Add
Menu", a menu's title and its "Edit" should open the menu window as they
do on a journal. Each instead fails in the page: the page dims, no
window opens, and nothing on the page can be pressed until it is
reloaded. A site menu can still be removed, and items added, edited and
removed, but no site menu can be added, renamed, placed in an area or
rearranged, so the site's pages keep the menus the installation placed.
Since: 2026-01-22 · Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The "About" notice describes a condition that never applies** · ❓ · minor.
The eye icon on an "About" item says "This link will only be displayed if
you have filled out the About the Journal section under Settings >
Journal." The header shows the item whatever that text holds; with the
text empty it opens a page with a heading alone.
Question: should an empty "About the Journal" hide the item, or should the
notice go? Lean: drop the notice (the page still carries the masthead
links under "About"); the item is useful either way.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Two notices name the wrong Settings tab** · 🐞 · minor.
The eye icon of a "Privacy Statement" item points the manager to
"Settings > Workflow > Submissions", and that of a "Contact" item to
"Settings > Contact". The privacy statement is on Settings › Website ›
"Setup" › "Privacy Statement" and the contact on Settings › Journal ›
"Contact"; a manager following the notice looks in the wrong place.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — "Open Menu" is always English** · 🐞 · minor.
In a narrow window the header's menus fold behind a button that reads
"Open Menu" in every interface language, French included, where
"Search", the skip links and the footer logo's text are translated (the
menu entries follow Rule 12; the site's own user menu reads
"S'inscrire", "Se connecter").
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Menus can only be arranged with a mouse** · ❓ · user-visible.
In the menu window, items move only by dragging; they cannot be focused
or moved with the keyboard, so a manager who works without a mouse
cannot add an item to a menu, reorder it or nest it.
Question: must the menu window offer a keyboard way to move items?
Lean: yes, a defect; the window replaced by this one was drag-only too,
so the gap is old, but every other settings screen works from the
keyboard.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A third level is saved but never shown** · ❓ · latent.
When the installation allows menus deeper than two levels, the menu
window lets a manager place an item three levels deep and saves it, but
the default theme's header draws two levels, so the item never appears
and nothing says why. The default limit of two never shows this.
Question: should the header draw every level the setting allows, or the
setting stop at what the theme can show? Lean: the header should follow
the setting.
Basis: code. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A title in other letter case passes as a new menu** · ❓ · minor.
"Add Menu" refuses the title of another menu of the same journal with
"This title already exists for another navigation menu.", but the same
title in other letter case ("primary navigation menu" beside "Primary
Navigation Menu") is saved, and the "Navigation" table then lists two
menus that differ only in case.
Question: should the duplicate-title check ignore letter case? Lean:
yes; the refusal exists so that two menus cannot be mistaken for each
other, and letter case alone does not tell them apart.
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The item window refuses most saves without saying why** · 🐞 · user-visible.
In "Add item" or an item's "Edit", "Save" with "Navigation Menu Type"
left at "Choose a type...", a "URL" that is not a full web address
("pkp.sfu.ca"), a "Path" with other characters ("my page") or a path
another item holds should say what is wrong: "Please select a navigation
menu type.", "A URL must be provided", "The path field must contain only
alphanumeric characters plus '.', '/', '-', and '_'.", "This path
already exists for another navigation menu item.". Instead the window
stays open with no message anywhere and nothing is stored, so "Save"
looks broken and the manager cannot tell which box to fix.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A type's description stays after "Choose a type..." is chosen again** · 🐞 · minor.
In the item window, once a type is chosen and "Navigation Menu Type" is
set back to "Choose a type...", the line under the list keeps that
type's description instead of returning to "Select a Navigation Menu
Type or Custom to make your own", so it describes a type no longer
chosen.
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A press's and a preprint server's notices speak of a journal** · 🐞 · minor.
On a press and a preprint server, the menu window's notices, the "About"
type's description and the warning of Rule 7b read as on a journal:
"…the About the Journal section under Settings > Journal.", "Link to a
page displaying the About the Journal content in Settings > Journal",
"…a second menu item, "About the Journal", …". There the installed item
is "About the Press" ("About the Server") and the side menu's "Settings"
group opens with "Press" ("Server"), so the manager is sent to names
the screen does not use.
Basis: probe. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — The site's item window offers types with no site page** · ❓ · minor.
On the site's Navigation tab, "Navigation Menu Type" lists the journal's
types: "About", "Submissions", "Editorial Masthead", "Contact",
"Privacy Statement", and "Current Issue", "Archives", "Subscriptions",
"My Subscriptions" {OJS}, "Catalog", "New Releases" {OMP}, "Archives"
{OPS}. None of these has a page on the site.
Question: should the site's item window offer only the types that lead
somewhere on the site? Lean: yes; what such an item does in the site's
header was not seen, and a type with no site page can only mislead.
Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — The "Navigation" table shows old item titles until a reload** · 🐞 · minor.
After an item is saved with a new title, or removed, only the
"Navigation Menu Items" table changes. Each menu's "Navigation Menu
Items" cell keeps the old title, or the removed item and its former
sub-items, until the page is reloaded, so the manager reads a menu that
no longer exists in that form.
Basis: probe. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — An empty menu window says both panels are settled** · 🐞 · minor.
On a journal whose items have all been removed, "Add Menu" shows "No
items assigned to this menu. Drag items from Unassigned Menu Items."
beside "All items have been assigned.". The first sends the manager to
a panel with nothing to drag; the second says items were assigned when
none exist.
Basis: probe. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — Discarded changes still hold the page** · 🐞 · minor.
In the menu window, after a changed area (on a journal or press, a
typed title too) is discarded with "Cancel" and "Yes", the window closes
and nothing is stored, yet the next move off Settings › Website raises
the browser's leave question, as though a change were still waiting.
After a discarded drag it does not.
Basis: probe. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — The item window's question on closing does not follow what changed** · 🐞 · minor.
The item window's back arrow ("Close") opens the browser's own box "The
data on this form has changed. Do you wish to continue without saving?"
even when nothing was typed, and leaving Settings › Website while the
window is open, untouched, raises the browser's leave question. The
menu window asks only after a change, in the page. A manager who opened
an item only to look is asked to confirm losing changes they never made.
Right after a refused "Save" it is the other way round: the back arrow
closes the window at once, with no question, and what the manager typed
is lost.
Basis: probe, test run. <sup>f-a18</sup>

<a id="a21"></a>
**A21 — Journals with the same name hide each other in the switcher** · 🐞 · minor.
The journals switcher leaves out every journal with the current
journal's name. An Author enrolled in two journals of the same name sees
the sitemap icon on either, and it opens an empty list; the Site
Administrator on one of them is offered every journal but its namesake,
while from a third journal both are listed.
Basis: probe. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — A Site Administrator holding Reader alone gets the manager's side menu and an "Error"** · 🐞 · minor.
Once the Site Administrator's manager role in a journal has ended and
they hold Reader alone there, each editorial page of that journal opens
with a window "Error", "The current role does not have access to this
operation.", and the side menu still offers the manager's entries:
"Editor Dashboard" (the search box alone, no views), "DOIs", "Settings",
"Content", "Statistics", "Tools" and "Administration". The side menu
should match what the pages allow; instead every page greets the
administrator with an error. Where "Settings" then leads differs by app
([Journal identity & about pages](U07-journal-identity-and-about-pages.md#a1)).
Basis: probe. <sup>f-a22</sup>

<a id="a23"></a>
**A23 — In French the side menu shows raw codes** · 🐞 · minor.
With the interface in French, four of the side menu's texts are raw
codes where French words belong:
- the "Content" group reads "##navigation.content##" on a journal and a
  press;
- the "DOIs" entry reads "##doi.manager.displayName##" on a press and a
  preprint server (a journal's reads "DOIs");
- the "Search submissions" box at the top of "Editor Dashboard" shows
  the placeholder "##editor.submission.searchGlobal##" on all three, and
  a screen reader names its row "Résultats de recherche";
- on a press, the "Statistics" group's "Monographs" entry reads
  "##common.publications##", beside French "Presse" and "Activité
  éditoriale" (a journal's reads "Articles", a preprint server's
  "Prépublications").

A screen reader hears the same codes. A French-speaking manager, Section
Editor or Site Administrator has to guess what the group, the entries and
the box are for. The statistics pages' own codes are recorded in
[Usage statistics](U64-usage-statistics.md#a6).
Basis: probe. <sup>f-a23</sup>

<a id="a24"></a>
**A24 — In French the Navigation tab's windows show raw codes** · 🐞 · minor.
With the interface in French, the item window labels the "Query
Parameters" box "##manager.navigationMenus.form.queryParams##", with
"##manager.navigationMenus.form.queryParams.description##" as the line
under it, and the menu window's drag handles show the hint
"##common.dragToReorder##" when the pointer rests on them. On a press the
item window's "Navigation Menu Type" list also offers
"##navigation.navigationMenus.newRelease##" in place of "New Releases".
The manager cannot tell what the box is for or which type that entry is.
Basis: probe. <sup>f-a24</sup>

<a id="a25"></a>
**A25 — The initials menu does not close on Escape** · ❓ · minor.
In the editorial header, the menu the initials open (Rule 28) stays
open when the Escape key is pressed; it closes only when the initials
are pressed again or the focus moves off them. The public header's
"About" list (Rule 16) and the menu window (Rule 6) both close on
Escape.
Question: should the initials menu close on Escape too? Lean: yes;
Escape is the key a keyboard or screen-reader user reaches for to close
a menu, and the other menus here answer it.
Basis: test run. <sup>f-a25</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — "Subscriptions" and "My Subscriptions" carry no eye icon** · 🐞 · minor.
Both items show only under their conditions (Settings bullet 6), and
each type has a notice ("This link will only be displayed if payments
are enabled under Settings > Distribution > Payments.", "This link will
only be displayed when a visitor is logged in."). The menu window marks
neither with the crossed-out eye, so the notice never shows and nothing
there tells the manager why the item is missing from the header.
Basis: probe. <sup>f-ojs1</sup>

### OPS

<a id="ops1"></a>
**OPS1 — No "Content" group while public comments are off** · ✅ · minor.
On a journal or press the side menu's "Content" group is always there for
manager-level roles (it holds "Issues" or "Catalog"). A preprint server
has neither, so its "Content" group appears only while public comments
are on, holding "Comments" alone. Intended.
Basis: probe. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — "Posting Mode" is not kept, so "Archives" never hides** · 🐞 · user-visible.
On Settings › Distribution › "Access", choosing "OPS will not be used to
post the server's contents online." and pressing "Save" shows "Saved",
but the next load has neither choice marked, the "Archives" item stays
in the header and the list of preprints still opens. A manager who
takes the server's contents offline this way believes it is done.
Basis: probe. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — The French "Developed By" heading reads a raw code** · 🐞 · minor.
On a preprint server's French pages a screen reader hears the "Developed
By" block's heading as "##plugins.block.developedBy.blockTitle##"; a
journal and a press read "Développé par".
Basis: probe. <sup>f-ops3</sup>

### Retired

<a id="a19"></a>
**A19 — The French "Editorial Masthead" item reads a raw code** · ✅ · retired. Fixed upstream by the French translations merge, verified 2026-09-24 on OJS, OMP and OPS: on French pages of a journal with French under "Forms", the installed item reads "Entête" in the header's "About" list, in the Navigation tab's tables and in the item window, and the page it opens is headed "Entête" (Rule 12). <sup>f-a19</sup>

<a id="a20"></a>
**A20 — The French initials menu's language heading reads a raw code** · ✅ · retired. Fixed upstream by the French translations merge, verified 2026-09-24 on OJS, OMP and OPS: with the interface in French the initials menu reads "Changer la langue", "English", "français" (ticked), "Modifier le profil", "Se déconnecter", for every role and for the Site Administrator (Rule 28). <sup>f-a20</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-23 at the checkouts' tips: ojs 802202cb3e (lib/pkp
5af3b39336, ui-library 2034439a), omp 7f9455d5a (lib/pkp 63945bbd82,
ui-library 977e460c), ops 15f0b6e0bd (lib/pkp f8bacd7658, ui-library
5d138aa9). Every lib/pkp file behind this feature (the two grid handlers,
their rows and cell providers, `PKPNavigationMenuItemsForm`,
`PKPNavigationMenuController`, `PKPNavigationMenuService`, the
navigation-menu DAOs and resources, `PKPTemplateManager`, `PKPPageRouter`,
`PKPUserHandler`, `AdminHandler`, `header.tpl`, `footer.tpl`,
`navigationMenu.tpl`, `breadcrumbs*.tpl`, `pagination.tpl`,
`editLink.tpl`, `message.tpl`, `error.tpl`, `website.tpl`,
`admin/settings.tpl`, the item-form templates and JS handler, the
migration) is byte-identical in the three checkouts, and so are the
ui-library components (`managers/NavigationMenuManager/*`,
`components/NavigationMenuEditor/*`, `TopNavActions.vue`, `SideNav.vue`,
`SkipLink.vue`, `Modal/SideModalBody.vue`); `lib/pkp/locale/en/manager.po`
differs on OMP by one unrelated DOI string. Labels are resolved app locale
first, then lib/pkp, then the plugin's own. Every claim of the body was
driven on the three test installs on 2026-09-23, on scratch journals,
presses and servers and read-only on the seeded ones, except where a
footnote says a state could not be reached (a menu deeper than two
levels, note z; a press's own series or category removed, note m; the
unnamed site's header, note td15). The `td` notes record what those
drives saw.

<a id="fn-a"></a>
**a** — Surfaces: `lib/pkp/templates/management/website.tpl` tab
`setup` › side tab `navigationMenus` (label `manager.navigationMenus`
"Navigation") loads `grid.navigationMenus.NavigationMenusGridHandler` and
`NavigationMenuItemsGridHandler`; `lib/pkp/templates/admin/settings.tpl`
side tab `nav` loads the same two grids at site level. Public frame:
`lib/pkp/templates/frontend/components/header.tpl` (`{load_menu
name="primary"}`, `{load_menu name="user"}`), `footer.tpl`,
`breadcrumbs.tpl`, `pagination.tpl`, `editLink.tpl`, each app's
`templates/frontend/components/skipLinks.tpl`. Editorial frame:
`lib/pkp/templates/layouts/backend.tpl` with ui-library `TopNavActions`,
`SideNav`, `SkipLink`. No theme in the three checkouts overrides these
templates (only `plugins/themes/default`, which has no template folder).

<a id="fn-b"></a>
**b** — The tab sits on the Settings › Website page, gated as
[→ settings access](U07-journal-identity-and-about-pages.md#settings-access)
describes (`ManagementHandler::authorize()`). On Users & Roles › Roles
the manager role's row ("Journal manager", "Press manager", "Preprint
Server manager") has no "Settings" arrow and no "Edit". Live-probed
2026-09-23 (Actors row 1; Settings bullet 11; all three apps): Section
Editor, assistant (OPS: Editorial Board Member), Reviewer, Author,
Reader, the Subscription Manager {OJS} and an Editor or Production
Editor whose box was unticked (OJS, OMP) had no "Settings" group and got
"The current role does not have access to this operation." at
`…/management/settings/website#setup/navigationMenus`; signed out, the
Login page. The unticked Editor's About page still offered "Edit"
("Edit About the Journal"; OMP "Open a new page to edit this
information"), which landed on that access-denied page.

<a id="fn-c"></a>
**c** — `AdminHandler::siteSettingsAvailability()`: `'navigationMenus' =>
$isMultiContextSite`, where `$isMultiContextSite = context count !== 1`.
Install defaults (seed-facts, 2026-09-16): the Site Settings
"Navigation" side tab appears once a second context exists. At site level
the grids load `context_id` 0 (`SITE_CONTEXT_ID`) menus and items, and
`load_menu` on a page without a context reads the same. Live-probed
2026-09-23 (Actors row 2; Rule 1b; all three apps): with one journal,
Site Settings offered "Site Setup", "Security", "Languages", "Bulk
Emails", "Statistics" and no "Navigation", and the address
`#setup/navigationMenus` landed on "Security"; with scratch journals
present, "Site Setup" listed "Navigation" with the two tables; a Journal
Manager at `index/admin/settings` got the access-denied page. The site's
home, `index/login` and `index/user/register` carried the site's user
menu and no primary menu.

<a id="fn-d"></a>
**d** — `header.tpl` and `footer.tpl` are included by every frontend page
template; `message.tpl`/`error.tpl` too. Journals closed to signed-out
visitors: [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
Rule 22 (`RestrictedSiteAccessPolicy`). Live-probed 2026-09-23 (Actors
row 3; Rule 15; all three apps): the header in the order skip links,
name, primary menu, "Search", user menu on every page read, signed out
and at every level; with "Users must be registered and log in to view
the journal site." saved, a signed-out visitor's home, About and Search
addresses landed on Login, which kept the header, "Home / Login" and the
footer.

<a id="fn-e"></a>
**e** — `PKPNavigationMenuService::getDisplayStatus()`: `NMI_TYPE_USER_LOGIN`
shown when `!Validation::isLoggedIn()`; `USER_REGISTER` when not logged in
and `!disableUserReg`; `USER_LOGOUT`, `USER_PROFILE`, `USER_DASHBOARD`
when logged in; `ADMINISTRATION` when logged in with `ROLE_ID_SITE_ADMIN`
at `SITE_CONTEXT_ID`. Logout while logged in as another user: title
`user.logOutAs` with the current (worn) user's username, URL
`login/signOutAsUser`. Dashboard: when the user `hasRole([MANAGER,
ASSISTANT, REVIEWER, AUTHOR], contextId)` or is site admin, the title is
replaced by `frontend/components/navigationMenus/dashboardMenuItem.tpl`
(title plus `<span class="task_count">{$unreadNotificationCount}</span>`)
and the URL is `PageRouter::getHomeUrl()`; otherwise the URL is
`user/profile`. `ROLE_ID_SUB_EDITOR` is absent from that list (A2).
`getHomeUrl()`: no context → site `index`; no user group in the context,
or Reader alone → the context's `index`; manager, site admin, sub editor
or assistant → `dashboard/editorial`; reviewer →
`dashboard/reviewAssignments`; author → `dashboard/mySubmissions`. The
installed user menu's top item carries the title key `{$loggedInUsername}`
and type `NMI_TYPE_USER_DASHBOARD` (each app's `registry/navigationMenus.xml`),
so it follows the same rules. Seen on screen 2026-09-04 (a claim check of
the notifications spec), all three apps: Section Editor and Reader landed
on the profile, Author on My Submissions, Reviewer on the review
assignments, Journal Manager and assistants on the editorial dashboard;
seen 2026-09-04 (a reviewer's-review probe): the item carries a count for
an editor. Every new context enrols its creator, the Site Administrator
on the test installs, as its manager, and a user's last role cannot be
removed, so an administrator with no role at all in a journal cannot be
made on screen; the branch was driven with the administrator's manager
role ended and Reader left (Rule 19a).
Live-probed 2026-09-28, two runs (Rule 18a; Actors row 4; all three
apps): "Administration" opened "Site Administration" (heading
"Administration") for `admin` from a bilingual scratch journal, from
`publicknowledge` and from the site's pages, its link carrying the
page's language (`index/en/admin/index`, `index/fr_CA/admin/index`). On a
scratch journal with English alone the link reads `index/admin/index`
and forwards to `index/<language>/admin/index`, the language this browser
last chose: after any French page it opened "Administration du site"
although the journal's page read `lang="en"`, after an English page in
English ([Languages & locales](U57-languages-and-locales.md) Rules 17a,
18).

<a id="fn-f"></a>
**f** — `lib/pkp/templates/frontend/components/editLink.tpl`: rendered only
`{if in_array(ROLE_ID_MANAGER, (array) $userRoles)}`; link text
`common.edit` "Edit", screen-reader span `help.goToEditPage` "Edit
{$sectionTitle}" (OJS, OPS app locale), "Open a new page to edit this
information" (OMP app locale). Included by `about.tpl`,
`editorialHistory.tpl`, `contact.tpl`, `information.tpl`,
`announcements.tpl` and `submissions.tpl` (four places: the submission
instructions ×3 and the privacy statement), always `page="management"
op="settings"` with a tab anchor; the Announcements page's link opens
`management/settings/announcements`. The shortcut's visibility for a
manager-level role without "Permit changes to Settings" is
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#a2).
Live-probed 2026-09-23 (Actors row 5; Rule 25; all three apps): "Edit"
shown to the Journal Manager, the Editor, the Production Editor (with
and without "Permit changes to Settings") and `admin` holding a manager
role; not to Section Editor, assistant, Reviewer, Author, Reader,
Subscription Manager {OJS}, signed-out visitors or `admin` holding
Reader alone. Pressed as the manager: About and Editorial History →
Settings › Journal › "Masthead"; Contact → "Contact"; Information →
Website › Setup › "Information"; the "Submissions" page's guidelines and
checklist → Workflow › Submission › "Author Guidance", its privacy part
→ Website › Setup › "Privacy Statement"; Announcements → the
"Announcements" page. The role without Settings access landed on the
access-denied page from every link but Announcements. "Privacy
Statement" and "Editorial Masthead" pages: no link. A preprint server
has no Information pages (the address answers 404).

<a id="fn-g"></a>
**g** — `backend.tpl`: `{if $availableContexts}` renders the `dropdown`
with icon `Sitemap` and screen-reader `context.contexts` ("Journals",
"Presses", "Servers"), listing each context whose name differs from the
current one's; then `app__contextTitle`: `{url page="index"}` with the
context name, else `{$siteTitle}` linking `{$baseUrl}`, else a plain
`common.software`; then `{if $currentUser}` `<top-nav-actions>`.
`TopNavActions.vue`: help link `v-if="helpUrl"`, `target="_blank"`,
screen-reader `t('common.help')` (the key exists in no locale file, A1);
`helpUrl` = `Application::getHelpUrl()` (OJS
`https://docs.pkp.sfu.ca/learning-ojs/`, OMP `…/learning-omp/en/`, OPS
`…/learning-ops/en/`); the Tasks button (the notifications spec); the
`Dropdown` with `InitialsAvatar`, `common.changeLanguage` "Change
Language" listing `getSupportedLocales()` while more than one, the
`manager.people.signedInAs` block while logged in as, `user.profile.editProfile`
"Edit Profile" (`user/profile`), and `user.logOut` "Logout" /
`user.logOutAs`. `Modal/SideModalBody.vue` puts `<TopNavActions />` in the
strip atop every side window. `SkipLink.vue`: buttons
`navigation.skip.main` and `navigation.skip.nav`, targets `app-main` and
`app-nav`. Context switcher: `PKPTemplateManager::setupBackendPage()` —
site admins get `getManySummary([])` (every context), others
`['userId' => …]`, both in the site's order
(`PKPContextQueryBuilder::getManySummary()` orders by `seq`, the order
Hosted Journals' "Order" saves); the current context is filtered out; for a site admin
on page `dashboard`, `manageIssues`, `management`, `payment` or `stats` the
link keeps page, op and args, otherwise it points at the other context's
`submissions` page. The filter compares names, so every context whose
name equals the current one's is dropped (A21). Seen on screen 2026-09-04 (the notifications
spec, Actors row 1): the bell for every signed-in user on an editorial
page, including one with no role in the journal. Live-probed 2026-09-23
(Actors rows 6–7; Rules 27–29; all three apps): the dark bar on the
Dashboard, Settings, the Profile page, Statistics, Tools, the wizard and
Administration; the strip (the "i" icon, "Tasks", the initials, then
"Close") atop the "Tasks" window, the menu window and the "Add item"
window. A user with no role in a scratch journal got the full header on
its Profile page and no side menu. Help opened
`https://docs.pkp.sfu.ca/learning-ojs/` (`…/learning-omp/en/`,
`…/learning-ops/en/`) in a new tab. The initials menu: "Change
Language", "English" ticked, "français", "Edit Profile", "Logout" with
two UI languages; "Edit Profile" and "Logout" alone with one; while
impersonating, "You are currently logged in as {username}", "Logout as
{username}", "Edit Profile", "Logout as {username}", the button showing
both users' initials. First Tab: "Skip to main content", then "Skip to
main navigation menu". Switcher: `admin` on the seeded journal listed
every other journal, a user in one journal had no icon, an Author in two
scratch journals was offered the other and landed on its My
Submissions; two journals given the same name: that Author's list was
empty, `admin` on one was offered every journal but the other, and from
the seeded journal both. `admin` kept the page from the Dashboard, a
Settings page, Announcements, Institutions, Comments, Tools, Statistics
and Issues; from DOIs, Payments, Catalog and the wizard the link opened
the other journal's `submissions` page, and from the Profile page its
Dashboard.

<a id="fn-h"></a>
**h** — `PKPTemplateManager::setupBackendPage()` builds `menu`:
`dashboards` (`navigation.dashboards` "Editor Dashboard") for MANAGER,
SITE_ADMIN, SUB_EDITOR, ASSISTANT, prefixed with the search item
`editor.submission.searchGlobal` "Search submissions";
`reviewAssignments` (`navigation.reviewAssignments` "My Assignments as
Reviewer") for REVIEWER; `mySubmissions` (`navigation.mySubmissions` "My
Submissions as Author") for AUTHOR — these three only when the user holds
one of MANAGER, SITE_ADMIN, SUB_EDITOR, ASSISTANT, REVIEWER, AUTHOR;
`submit` (`dashboard.startNewSubmission` "Start A New Submission") unless
`disableSubmissions`; for MANAGER or SITE_ADMIN: `announcements` while
`enableAnnouncements`, `dois` while `enableDois` with enabled DOI types,
`institutions` while `isInstitutionStatsEnabled()`, `settings`
(`navigation.settings`, submenu `context.context`, `manager.website`,
`manager.workflow`, `manager.distribution`, `navigation.access`) while any
of the user's groups has `permitSettings`; `statistics`
(`navigation.tools.statistics`: `common.publications`, `context.context`,
`stats.editorialActivity`, `manager.users`, `manager.statistics.counterR5`,
plus `manager.statistics.reports` for MANAGER/SITE_ADMIN) for MANAGER,
SITE_ADMIN, SUB_EDITOR; `tools` (`navigation.tools`) for MANAGER,
SITE_ADMIN; `admin` (`navigation.admin`) for SITE_ADMIN. App subclasses
(`classes/template/TemplateManager.php::setupBackendPage()`): OJS inserts
`content` (`navigation.content`: `manager.userComment.comments` while
`enablePublicComments`, `editor.navigation.issues` "Issues") before
`statistics`, adds the statistics "Issues" line, and, while
`paymentsEnabled`, `payments` (`common.payments`) before `settings` for
SITE_ADMIN, MANAGER, SUBSCRIPTION_MANAGER plus `institutions` before it;
OMP inserts `content` with "Comments" (while on) and
`navigation.catalog` "Catalog"; OPS inserts `content` only while
`enablePublicComments`, with "Comments" alone (code comment: "The only
submenu item for Content menu in OPS is User Comments."). `backend.tpl`
renders `<pkp-side-nav>` only `{if $currentContext && $currentUser &&
$currentUser->getRoles(contextId)|count > 0}`. `isInstitutionStatsEnabled()`
needs the site's and the context's `enableInstitutionStatistics`; the
context's box shows on Settings › Distribution › "Statistics" only
while the site's is on. A new context arrives with `enableDois` on, the
first DOI kind ticked and no prefix. Seen 2026-09-17 (an
announcements claim check): OPS has no "Content" side-menu entry on a
fresh preprint server. Live-probed 2026-09-23 (Actors row 8; Rule 30;
Settings bullets 6–10; all three apps): the entries per role as the
table gives them on the seeded and scratch journals; "Disable
Submissions" saved: "Start A New Submission" gone for everyone, and a
Reader (OJS: the Subscription Manager too, payments off) had no side
menu element at all. Payments {OJS}: "Enable" saved alone added
"Payments" and "Institutions" for the manager, `admin` and the
Subscription Manager; OMP's "Payments" tab saved and added nothing. DOIs
unticked, or ticked with every kind unticked: no "DOIs". The site's
institutional-statistics box alone added nothing; the journal's box,
then shown and unticked, added "Institutions" once ticked. The Site
Administrator whose manager role in a scratch journal was ended (Reader
left): an "Error" window, "The current role does not have access to
this operation.", on each editorial page (the side menu's submission
counts answered 401), and the manager's side menu (A22); on the
journal the Navigation tab opened, on the press and the server it gave
the access-denied page.

<a id="fn-i"></a>
**i** — `NavigationMenusGridHandler::initialize()`: title
`manager.navigationMenus` "Navigation", empty row
`grid.navigationMenus.navigationMenu.noneExist` "No Navigation Menus",
columns `common.title` "Title" and `manager.navigationMenuItems`
"Navigation Menu Items", action `grid.action.addNavigationMenu` "Add
Menu" (`VueModal` `NavigationMenuManagerFormModal`).
`NavigationMenusGridCellProvider`: the title cell is a `LinkAction` to the
same modal with the menu; the items cell joins the titles of
`NavigationMenuItemDAO::getByMenuId()` (every assignment of the menu,
`ORDER BY seq`, parents and children together) after
`transformNavMenuItemTitle()`; `seq` counts from 0 under each parent, so
a top-level item and a sub-item at the same place tie and come in the
order the database holds the rows (read 2026-09-26), which is why Rule
3a gives no order. `NavigationMenusGridRow`: `edit`
(`grid.action.edit` "Edit", the modal) and `remove` (`grid.action.remove`
"Remove", `RemoteActionConfirmationModal` with `common.confirmDelete`,
title `common.remove`, style negative, OK/Cancel from `ConfirmationModal`)
→ `deleteNavigationMenu` → `notification.removedNavigationMenu`.
`NavigationMenuItemsGridHandler`: title `manager.navigationMenuItems`,
empty `grid.navigationMenus.navigationMenuItems.noneExist` "No Navigation
Menu Items", column "Title", action `grid.action.addNavigationMenuItem`
"Add item" (`AjaxModal` titled the same); lists
`NavigationMenuItemDAO::getByContextId()` (no ORDER BY). Rows `edit`
(`AjaxModal` titled "Edit") and `remove` as above →
`deleteNavigationMenuItem` → `notification.removedNavigationMenuItem`.
The row toggle's screen-reader text is `grid.settings` "Settings"
(`templates/controllers/grid/gridRow.tpl`). The ops list also names
`saveSequence`, but the grid adds no ordering feature, so nothing on the
screen reorders items there. The menus grid's own list has no ORDER BY
either. Live-probed 2026-09-23 (Rules 1, 3, 10; all three apps):
both tables at both addresses, each row's "Settings" arrow revealing
"Edit" and "Remove"; after every change on the scratch journals the
seeded journal's tables read as before; an item saved from "Edit" moved
to the end of the items table (the query having no order, the saved row
is written wherever the table has room, usually at its end; seen
2026-09-25 in an OMP test run: after "Our news" was renamed "PKP news",
the items table's last row read "Search" for the whole 10 s wait), and
after menus were added the menus
table read "primary navigation menu, Primary Navigation Menu, Footer
links, User Navigation Menu". After "Contact" was renamed "Reach us", or
"About" removed, the "Primary Navigation Menu" cell still read
"Contact", or "About" and its former sub-items, until a reload (A15).

<a id="fn-j"></a>
**j** — ui-library `NavigationMenuManagerFormModal.vue` (title
`common.edit` in edit mode, else `grid.action.addNavigationMenu`) and
`useNavigationMenuManagerForm.js`: a `PkpForm` with `showErrorFooter`,
submit `common.save`, cancel `common.cancel`; fields `title`
(`manager.navigationMenus.form.title`, `isRequired`), `areaName`
(`manager.navigationMenus.form.navigationMenuArea` "Active Theme Navigation
Areas", description `…navigationMenuAreaMessage` "Select a navigation
area", options `common.none` plus `GET navigationMenus/areas`), and the
`menuEditor` component. Save: `POST navigationMenus` or `PUT
navigationMenus/{id}`; on success
`notify(t('notification.addedNavigationMenu' | 'editedNavigationMenu'),
'success')`, the legacy grid's `dataChanged`, `closeModal()`.
`PKPNavigationMenuController::validateNavigationMenu()`: empty title
`manager.navigationMenus.form.titleRequired` "The title is required"
(reached only past the form's own required check), another menu with the
same title in the context `…form.duplicateTitles`, another menu in the
area `…form.menuAssigned`; 422 with the field errors. `useFormChanged(form,
[assignedItems], {warnOnClose: true})`: a close with a changed state opens
`common.warning` / `form.dataHasChanged` with `common.yes` / `common.no`;
also a `beforeunload` prompt when the page is left. Live-probed
2026-09-23 (Fields, the menu window; Rules 4, 6, 8; all three apps): one
"Title" box whatever the form languages; empty: "This field is
required." under it; "Primary Navigation Menu": "This title already
exists for another navigation menu."; "primary navigation menu": saved
as a second menu (A10); "Footer links" with "primary": "A navigation
menu is already assigned to this area."; each refusal left the window
open with "⚠ Please correct one error. Jump to next error" at its foot
(screen readers also get a "Go to Title: {message}" button), "Save"
greyed until the box changed, and the two refusals the server returned
added "The form was not saved because 1 error(s) were encountered.
Please correct these errors and try again." at the top right. Unchanged,
"Cancel", the back arrow and Escape closed at once; after a drag, a
typed title or a changed area each opened "Warning"; "No" returned with
the change, "Yes" closed and nothing was stored. Leaving the page with
the window changed raised the browser's leave prompt; after "Yes" on a
changed area (OJS, OMP also a typed title) the next move off the page
raised it again, after a discarded drag it did not (A17). "Add Menu":
"None" preselected; a menu at "None" appeared nowhere; "Primary
Navigation Menu" set to "None" left the top row with the header's own
"Search" alone; "User Navigation Menu" set to "None" emptied the top
right, signed in and out; "Footer links" set to "primary" filled the
top row on the next load. With every item removed, "Add Menu" showed
both panel texts (A16).

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-23 (Fields, the menu window; all three
apps): as Journal Manager on a scratch journal, "Add Menu" with "Title"
empty, then "Primary Navigation Menu", then "Footer links" in "primary",
then "Footer links" at "None": the first three refused as note j
records, the window open each time; the fourth saved with "Navigation
menu was successfully added" and a new row "Footer links" with an empty
items cell.

<a id="fn-k"></a>
**k** — `NavigationMenuManagerField.vue` → `NavigationMenuEditor.vue`:
two `MenuTreePanel`s titled `manager.navigationMenus.assignedMenuItems`
"Assigned Menu Items" / `…unassignedMenuItems` "Unassigned Menu Items",
empty texts `manager.navigationMenu.noAssignedItems` /
`…noUnassignedItems`; `MenuTreeItem.vue`: the handle (`common.dragToReorder`
"Drag to reorder" as its title), the red `Error` icon `v-if="item.hasWarning"`
and the `NotVisible` icon `v-if="item.conditionalWarning"`, each opening
`useMenuItemWarnings()` dialogs titled `common.notice` with `common.ok`.
`NavigationMenuItemResource::toArray()`: `hasWarning` = the item has
children in the saved tree, message `manager.navigationMenus.form.submenuWarning`;
`conditionalWarning` = the type's `conditionalWarning`. Drag and drop is
`@atlaskit/pragmatic-drag-and-drop` alone: no key handler, no tabindex, in
any file of `components/NavigationMenuEditor/` (A8). Depth:
`useNavigationMenuEditor::canDropOnTarget()` refuses a drop whose deepest
descendant would pass `maxDepth`, which is `pkp.context.navigationMenuMaxDepth`
= config `[interface] navigation_menu_max_depth` (default
`PKPNavigationMenuController::DEFAULT_MAX_DEPTH` 2; `config.TEMPLATE.inc.php`
"Maximum nesting depth for navigation menu items (default: 2)").
`moveToUnassigned()` flattens the moved subtree into the unassigned list.
`GET navigationMenus/items` (new menu: `assigned: []`, every context item
unassigned) and `GET navigationMenus/{id}/items` (`getAssignedItemsTree`,
`getUnassignedItems`: every context item not assigned to this menu).
Live-probed 2026-09-23 (Rules 4–7; A8; all three apps): the panels, the
handle's "Drag to reorder" and the moves of Rule 5; "Search", already
nested, dropped on "About the Journal" was not nested under it, and
"About" with its items dropped on another item did not move; "About"
dragged to "Unassigned Menu Items" arrived there with its five items as
entries of their own. The eye on Announcements, About, the About-page
item, Privacy Statement, Contact, Register, Login, the username item,
Dashboard, View Profile, Administration and Logout, none on the other
types; the warning on "About" in the "Primary Navigation Menu" window
and on the username item in the "User Navigation Menu" window, each
with the eye alone in the other window's "Unassigned Menu Items";
gained by "Archives" only after "Save" and a reopened window. Keyboard: Tab from
"Title" reached the area list, then only the icon buttons inside items,
"Cancel" and "Save"; items and handles took no focus, and arrow keys and
Space on a focused icon moved nothing.

<a id="fn-l"></a>
**l** — `PKPNavigationMenuItemsForm` (each app's `NavigationMenuItemsForm`
is empty on OJS and OPS; OMP adds the series and category lists) with
`templates/controllers/grid/navigationMenus/form/navigationMenuItemsForm.tpl`:
`title` multilingual, `maxlength="255"`, `FormValidatorLocale` required in
the primary locale (`manager.navigationMenus.items.form.title.required`);
`menuItemType` select from `getMenuItemTypes()` prefixed with
`grid.navigationMenus.navigationMenu.selectType` "Choose a type...", label
`…form.navigationMenuItemTypeMessage`, replaced on change by the type's
`description` (`NavigationMenuItemsFormHandler.js::setType()`); the
per-type parts `customNMIType.tpl` (`path`, `…form.viewInstructions`,
`content` rich text, `common.preview` posting to
`navigationMenu/preview` into a new window) and `remoteUrlNMIType.tpl`
(`remoteUrl` multilingual, `maxlength="255"`); OMP's `seriesNMIType.tpl`
and `categoriesNMIType.tpl`; `queryParams` multilingual `maxlength="1000"`,
hidden for Remote URL, Custom and no type. `validate()`: no type →
`…form.typeMissing` (attached to `path`); Custom → path regex
`^[a-zA-Z0-9/._-]+$` (`…form.pathRegEx`) and uniqueness in the context
(`…form.duplicatePath`); Remote URL → `FILTER_VALIDATE_URL` on every
locale's value, empty allowed outside the primary locale
(`…form.customUrlError`). `execute()` on an existing item stores a title
per locale only when it was already stored or differs from the displayed
default, and stores null for an emptied box. Save →
`notification.addedNavigationMenuItem` / `…editedNavigationMenuItem`.
`NavigationMenuItemDAO::updateObject()` / `deleteById()` call
`unCacheRelatedNavigationMenus()`, which forgets every cached menu tree
holding the item. `NavigationMenuItemsGridHandler::updateNavigationMenuItem()`
answers a failed `validate()` with `new JSONMessage(false)` and no form,
so the save answers 200 `{"status":false,"content":""}` and the window
gets nothing to show; the handler has been so since 2021 (A11). An
empty title is caught by the page's own required check before any
request, with "This field is required.". Live-probed 2026-09-23 (Fields,
the item window; Rules 11–13; A18; all three apps): "Add item" and
"Edit" headings, "Save" at the foot and no "Cancel"; a Remote URL item
saved with "Navigation menu item was successfully added", waiting in
both menus' "Unassigned Menu Items"; "Contact" renamed "Reach us",
"Navigation menu item was successfully updated", shown from the next
load under "About" and in the user menu, signed out, as the manager and
as a Reader. The back arrow opened the browser's box "The data on this
form has changed. Do you wish to continue without saving?" changed or
not (four closes per app, "Cancel" and "OK"); with the window open and
untouched, a side-menu entry or a typed address raised the browser's
leave prompt, with it closed first none. Test run 2026-09-24 (Rule
11a; scenario 5; OJS and OPS): "Second page", "Custom Page", "our-page",
"Save" answered `status: false` and the window stayed; the back arrow
then closed it with no browser box (questions seen `[]`), the table
behind it listing "Our page" and no "Second page"; by hand on OPS the
same day, a refused "Save" (no type; a "URL" "pkp.sfu.ca") then the back
arrow closed at once, while a refused "Save", a changed "Title", then
the back arrow asked. OMP's run accepted a box if one came and did not
read it; the cause is shared code (note f-a18). Removing "About" (also placed
in the user menu): "Navigation menu item was successfully removed", the
header lost it and its list in both menus, and its five sub-items waited
in the primary menu's "Unassigned Menu Items".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-23 (Fields, the item window; A11, A12;
all three apps): as Journal Manager on a scratch journal, "Add item"
with "Test" and no type, then "Remote URL" with "pkp.sfu.ca", then
"Custom Page" with "my page", then a path another item held: each
"Save" left the window open with no message anywhere and stored
nothing. "Title" emptied in English (French filled): "This field is
required." under it, before any request; "The menu item title is
required." never showed. A type chosen and "Choose a type..." chosen
again: the line kept the type's description. Typing 260 characters in
"Title" kept 255.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-23 (Fields, "Query Parameters"; all three
apps): "tab=x" saved on "Archives" ("Catalog" on a press) gave the
header link `…/issue/archive?tab=x` (`…/catalog?tab=x`,
`…/preprints?tab=x`); the box, up to 1000 characters, was offered for
every type but "Custom Page" and "Remote URL", and not while "Choose a
type..." was selected.

<a id="fn-m"></a>
**m** — Types: `PKPNavigationMenuService::getMenuItemTypes()` (Custom
Page, Remote URL, About, Editorial Masthead, Submissions, Announcements,
Login, Register, Dashboard, View Profile, Administration, Logout, Contact,
Search, Privacy Statement; titles `manager.navigationMenus.customPage`,
`…remoteUrl`, `navigation.about`, `common.editorialMasthead`,
`about.submissions`, `announcement.announcements`, `navigation.login`,
`navigation.register`, `navigation.dashboard`, `common.viewProfile`,
`navigation.admin`, `user.logOut`, `about.contact`, `common.search`,
`manager.setup.privacyStatement`), extended through the
`NavigationMenus::itemTypes` hook by each app's
`classes/services/NavigationMenuService.php`: OJS `NMI_TYPE_CURRENT`
(`editor.issues.currentIssue` "Current Issue"), `NMI_TYPE_ARCHIVES`,
`NMI_TYPE_SUBSCRIPTIONS`, `NMI_TYPE_MY_SUBSCRIPTIONS`; OMP
`NMI_TYPE_CATALOG`, `NMI_TYPE_NEW_RELEASE`, and `NMI_TYPE_SERIES` /
`NMI_TYPE_CATEGORY` only while the press has a series / a top-level
category; OPS `NMI_TYPE_ARCHIVES` (description "Link to your issue
archive." there too). Conditions and URLs: `getDisplayStatus()` and each
app's `getDisplayStatusCallback()` — Announcements `enableAnnouncements`
(the site's at site level), Contact `mailingAddress || contactName`,
Privacy `getLocalizedData('privacyStatement')`, Current/Archives
`publishingMode != PUBLISHING_MODE_NONE` (OPS Archives → `preprints`),
Subscriptions `paymentsEnabled && isConfigured()` (→ `about/subscriptions`),
My Subscriptions also logged in and `PUBLISHING_MODE_SUBSCRIPTION` (→
`user/subscriptions`), OMP Series/Category hidden when the object is gone
or of another press. `NMI_TYPE_ABOUT` has no condition although its type
carries `conditionalWarning` (A5). Query parameters are appended after
the hook for every type but Remote URL and Custom. Notices:
`manager.navigationMenus.{about,announcements,loggedIn,loggedOut,contact,privacyStatement,subscriptions}.conditionalWarning`
(lib/pkp `manager.po`) and OJS `mySubscriptions.conditionalWarning` (app
`manager.po`; the lib/pkp text of that key, naming payments and access,
is shadowed on OJS). Descriptions `manager.navigationMenus.*.description`
and OMP `navigation.navigationMenus.*.description`. OPS's context schema has no
`publishingMode`, while its `NavigationMenuService` still reads it
(OPS2). Seen 2026-09-17 (an
announcements claim check), all three apps: the "Announcements" item's
window reads "Link to the page displaying your announcements." with
announcements off. Live-probed 2026-09-23 (the item types table;
Settings bullets 1–6; all three apps unless named): every type placed
in the primary menu of a scratch journal and the header read signed
out, as the manager, a Reader and `admin`, then each condition flipped
on screen and the header read again. The addresses as the table gives
them ("Custom Page" at `…/u08-page`, "Remote URL" in the same tab, OPS
"Archives" at `…/preprints`). Announcements, Register, Privacy
Statement, Current Issue and OJS Archives hid and returned with their
settings; "About" showed with the "About the Journal" text empty (the
page the heading alone); the "Contact" tab refused an empty "Name", so
"Contact" stayed. Subscriptions {OJS} showed only once payments had a
currency and "Manual Fee Payment", My Subscriptions only for a signed-in
visitor once the journal required subscriptions; neither carried an eye
(OJS1). OPS: "OPS will not be used to post the server's contents
online." showed "Saved", the save sent `publishingMode=2` and answered
200, and the next load had no choice marked and "Archives" still
opening the preprints list (OPS2). OMP: "Series" and "Category" offered
on the seeded press (lists "Applied Science", "Social Sciences", no
empty choice) and not on a scratch press, which has neither; no test
press had a series or category of its own to delete, so an item whose
series is gone was not seen. On a press and a preprint server the
notices and the "About" description read word for word as on a
journal (A13). OPS "Archives" description: "Link to your issue
archive.".

<a id="fn-n"></a>
**n** — Each app's `registry/navigationMenus.xml`, installed by
`NavigationMenuDAO::installSettings()` for every new context
(`PKPContextService::add()`) and at install for the site
(`Installer`, only nodes with `site="1"`): the "User Navigation Menu"
(area `user`, `site="1"`; `navigation.register`, `navigation.login`,
`{$loggedInUsername}` with `navigation.dashboard`, `common.viewProfile`,
`navigation.admin`, `user.logOut`), the "Primary Navigation Menu" (area
`primary`; OJS `navigation.current`, `navigation.archives`,
`manager.announcements`, `navigation.about` › `about.aboutContext`,
`about.submissions`, `common.editorialMasthead`,
`manager.setup.privacyStatement`, `about.contact`; OMP
`navigation.catalog` in place of the first two; OPS
`manager.announcements` then `navigation.archives`), and a lone
`common.search` item. `NavigationMenuItemDAO::installNodeSettings()`
creates one item per type-and-title-key, so "About" and "About the
Journal" (both `NMI_TYPE_ABOUT`), and the username item and "Dashboard"
(both `NMI_TYPE_USER_DASHBOARD`), are separate items. Titles come from
the stored `titleLocaleKey` through `setAllNMILocalizedTitles()` until a
title is typed.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-23 (Rule 2; all three apps): the seeded
and scratch journals held 17 items (presses and servers 16), the two
menus in their areas with the items Rule 2 lists, "About the Journal"
("About the Press", "About the Server") first under "About", and
"Search" in no menu. The site held "User Navigation Menu" in "user" with
its seven items and nothing else. French pages of the seeded journal
(French under "UI" alone) showed every item in English; a scratch
journal with French under "Forms" showed the installed French titles,
"Editorial Masthead" then as "##common.editorialMasthead##" (A19), and
as "Entête" once lib/pkp `25182919bf` arrived (live-probed 2026-09-24,
all three apps).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-23 (Rules 3, 10; all three apps): the
cells read as Rule 3a quotes on the seeded journal and on a new one,
"About the Journal" among the top-level titles; the username item read
as the viewing manager's username for the Journal Manager, the Editor
and the Production Editor. The items table listed the user menu's
items, then the primary menu's, "Search" last on the seeded journal; on
a new press "Contact" and "Search" came first.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-23 (Rules 5–5b; all three apps): "Search"
dragged onto "Archives" ("Catalog") sat under it; dragged again onto
"About the Journal" it was not nested (on a journal and a press it moved
beside it under "About"; on a server nothing moved); "About" dragged to
"Unassigned Menu Items" arrived with its five items as entries of their
own; "Cancel" › "Yes" stored nothing.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-23 (Rule 6; all three apps): "Cancel",
the back arrow and Escape closed an unchanged window at once; after a
drag each opened "Warning" with "Yes" and "No"; "No" returned with the
drag in place, "Yes" closed, and the reopened window and the public
header showed nothing changed. "Save" after a drag closed the window
with "Navigation menu was successfully updated", the cell changed, and
the header showed "Search" under "Archives" ("Catalog") from the next
load, signed in and out.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-23 (Rule 7; all three apps): the icons as
note k records; each opened "Notice" with its text and "OK", the
warning's text word for word as Rule 7b quotes (on a press and a server
too, A13). "Archives" given "Search" gained the warning only after
"Save" and a reopened window, and "About" dragged out of the menu kept
it in "Unassigned Menu Items" until then. Test run 2026-09-24 (Rule 7b;
scenario 3; all three apps, `manager.maya` on `publicknowledge`): in the
"Primary Navigation Menu" window the items carrying the warning read
"About" alone; the username item, among "Unassigned Menu Items", carried
one icon, the eye ("This link will only be displayed when the visitor is
logged in.").

<a id="fn-o"></a>
**o** — `PKPTemplateManager::smartyLoadNavigationMenuArea()`: returns
nothing for an area the active theme does not register; loads
`NavigationMenuDAO::getByArea(contextId, area)` (cached an hour for
signed-out visitors, the cache forgotten on insert, update and delete of a
menu) and renders `navigationMenu.tpl` with the first menu found, or with
none. `DefaultThemePlugin::init()`: `addMenuArea(['primary', 'user'])`.
Each app's `templates/frontend/components/primaryNavMenu.tpl` (a
hand-written fallback list) is included by no template in any checkout,
so an empty area shows nothing. `PKPNavigationMenuService::getNavigationAreas()`
returns the active theme's areas when a context is given and `[]`
otherwise, so a site menu's area list would hold "None" alone; the site's
window does not open (A4), so that list was not seen.
`NavigationMenuDAO::updateObject()` forgets the menu's cached tree and
its old and new area caches before the tree is saved.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-23 (Rule 1b; A4, A14; all three apps): as
the Site Administrator with scratch journals present, on Administration
› "Site Settings" › "Site Setup" › "Navigation", "Add Menu", the title
of "User Navigation Menu" and its "Edit" each dimmed the page, opened no
window and logged a page script error; the page took no press until
reloaded, Escape included. "Remove" was offered on the menu. The site's
"Add item" opened and listed the types A14 names; the site item "Login"
renamed showed its new title on the next signed-out load of the site's
home page.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-23 (Rules 9, 11, 13; all three apps): as
Journal Manager on scratch journals, "Contact" renamed "Reach us" showed
under "About" from the next load; "Remove" › "Cancel" kept an item or a
menu; "Remove" › "OK" on "About" gave "Navigation menu item was
successfully removed", the header lost "About" and its list, and the
primary menu's window then held "Current, Archives, Announcements" with
"About the Journal", "Submissions", "Editorial Masthead", "Privacy
Statement" and "Contact" in "Unassigned Menu Items"; "Remove" › "OK" on
"Primary Navigation Menu" gave "Navigation menu was successfully
removed", its row went, every item stayed in the items table and in
"Footer links", and the header's top row was empty, signed in and out.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-23 (Rule 12; all three apps): on a
scratch journal with English and French under "UI" and "Forms",
"Archives" ("Catalog") typed "Back issues" in English read "Back issues"
in English and the installed French title in French; "Our news" (Remote
URL, English only) read "Our news" in French; a French title typed on
"Submissions" showed on French pages only; the French box emptied and
saved held the installed title again when reopened. On a journal with
French under "UI" alone, French pages showed every item in English and
the item window had no French box; ticking French under "Forms" brought
the French titles at once.

<a id="fn-p"></a>
**p** — `NavigationMenusMigration`: `navigation_menu_item_assignments`
has `navigation_menu_id` → `navigation_menus` ON DELETE CASCADE,
`navigation_menu_item_id` → `navigation_menu_items` ON DELETE CASCADE and
`parent_id` → `navigation_menu_items` ON DELETE CASCADE. Deleting a menu
drops its assignments and keeps the items; deleting an item drops every
assignment of it and every assignment whose parent it was, so its former
sub-items fall back to unassigned in that menu.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-23 (Rules 14a, 14b; all three apps): with
announcements off, the "Announcements" item's window read "Link to the
page displaying your announcements.", its eye opened "This link will
only be displayed if you have enabled announcements under Settings >
Website.", and the header had no "Announcements"; "Search" placed under
it was hidden too. A new top-level item whose one sub-item ("Login")
was hidden showed signed in as a plain link with no list. Announcements
on: "Announcements" with "Search" under it, signed in and out.

<a id="fn-q"></a>
**q** — `header.tpl`: `pkp_site_nav_toggle` button with the literal
`<span>Open Menu</span>` (A7); the logo branch `{if
$displayPageHeaderLogo}` image link, `{elseif $displayPageHeaderTitle}`
text link, else `templates/images/structure/logo.png` with alt
`$applicationName`, each to `{url page="index"}`; `displayPageHeaderTitle`
is the context name, or the site title on site pages
(`PKPTemplateManager::initialize()`); the search wrapper `{if
$currentContext && $requestedPage !== 'search'}` with `common.search`
"Search". `navigationMenu.tpl` renders the top level and one level of
children (`getIsChildVisible()`, set when any child is displayed), skips
an item whose `getIsDisplayed()` is false together with its children, and
never renders a third level (A9).
Live-probed 2026-09-23 (Rule 16; all three apps): pointing at "About"
opened its list; focusing it did not, and Tab from it went to "Search";
a click or Enter opened the list without leaving the page (the theme's
script turns the item's address, served as `…/about`, into `#`); the
list stayed open after the pointer left until a click elsewhere, and
Escape closed it. Test run 2026-09-24 (Rule 16; scenario 1; all three
apps): after the pointer on "About" showed the list, one press left it
open (`ul.dropdown-menu.show`, visible) with the pointer moved
off the header, for the whole 10 s wait, and the address unchanged;
Escape hid it, a second press showed it, Escape hid it again. By hand
the same day on OPS: pointed at, the list hid once the pointer left
(`aria-expanded` "false"); a second press on "About" closed a pressed
list, and a click elsewhere closed it too. At 375 px every list showed open and "About" and the
username led to `#`. The username, pressed in a wide or narrow window at
every level, opened its list and left the page unchanged. The installed
"About" list showed one level down and nothing deeper.

<a id="fn-z"></a>
**z** — The depth limit is the configuration file's `[interface]
navigation_menu_max_depth` (note k); no screen changes it, and every
test install sets 2, so an item three levels deep could not be placed
and the header's behaviour for it was not seen (A9).

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-23 (Rules 18–19c; A2; all three apps):
on the seeded journal's home page, "Dashboard" led the Journal Manager,
the Editor, the Copyeditor, the Funding Coordinator (OPS: the Editorial
Board Member) and `admin` to the Dashboard, the Reviewer to the review
assignments, the Author to My Submissions, the Section Editor and the
Reader to the Profile page; a number followed the name and "Dashboard"
for the first group ("0"; 2 then 4 for a scratch journal's managers, 1
for its Author, each equal to the editorial header's "Tasks"), none for
the Section Editor, even with an unread task, or the Reader. `admin`
holding Reader alone in a scratch journal was taken to its home page.
"Administration" showed to `admin` alone and opened "Site
Administration"; impersonating, "Logout as {username}" returned the
administrator to their Dashboard. On the site's home page `admin`'s
"Dashboard" opened the site's home page, and every other user's a
Profile page. Signed out with registration closed: "Login" alone.

<a id="fn-r"></a>
**r** — `footer.tpl`: the sidebar `{if empty($isFullWidth)}` from the
`Templates::Common::Sidebar` hook; `{if $pageFooter}` the footer text;
`pkp_brand_footer` link `{url page="about" op="aboutThisPublishingSystem"}`
with alt `about.aboutThisPublishingSystem` (app locales: OJS "More
information about the publishing system, Platform and Workflow by
OJS/PKP.", OMP "…by OMP/PKP.", OPS "More information about this system,
Platform and Workflow by OPS/PKP.") and image `brandImage` (each app's
`TemplateManager`: `templates/images/{ojs,omp,ops}_brand.png`).
`pageFooter` comes from the context's, or on site pages the site's,
"Page Footer" (`PKPAppearanceSetupForm`, `PKPSiteAppearanceForm`,
`manager.setup.pageFooter`). Live-probed 2026-09-23 (Rules 15a, 20;
Settings bullet 17; all three apps): a scratch journal's "Page Footer"
on its pages and the site's on the site's pages only; the logo link and
its screen-reader text as quoted; a header logo uploaded in place of the
name, the application's logo on the site while it had neither, the
site's name as a text link once set. The sidebar sat beside the content
on every page read (home, About, Search, Login, Register, lost password,
Announcements, an item's page, the access-denied page, French pages).

<a id="fn-s"></a>
**s** — Each app's `plugins/blocks/developedBy`: `settings.xml` `enabled`
false; `DevelopedByBlockPlugin` display name
`plugins.block.developedBy.displayName` "\"Developed By\" Block";
`templates/block.tpl`: an `h2.pkp_screen_reader`
`plugins.block.developedBy.blockTitle` "Developed By" and a link
`common.software` to `https://pkp.sfu.ca/ojs/` (`/omp/`, `/ops/`). Placing
it: the "Sidebar" list (`scenarios.md` `sidebar`, name
`developedbyblockplugin`, with `plugins: {developedbyblockplugin:
{enabled: true}}`). OPS's `fr_CA` lacks
`plugins.block.developedBy.blockTitle` (OPS3). Live-probed 2026-09-23
(Rule 21; Settings bullet 15; all three apps): enabled alone, no block;
ticked under "Sidebar" and saved, the link on every page read; the
hidden heading "Développé par" on a journal's and a press's French
pages, "##plugins.block.developedBy.blockTitle##" on a preprint
server's.

<a id="fn-t"></a>
**t** — Each app's `templates/frontend/components/skipLinks.tpl`:
`navigation.skip.main`, `navigation.skip.nav`, on the index page
`navigation.skip.about` while the theme option
`showDescriptionInJournalIndex` (`…PressIndex`, `…ServerIndex`) is on,
`navigation.skip.announcements` while `$numAnnouncementsHomepage &&
$announcements|@count`, OJS `navigation.skip.issue` while `$issue`, then
`navigation.skip.footer`; anchors `#pkp_content_main`, `#siteNav`,
`#homepageAbout`, `#homepageAnnouncements`, `#homepageIssue`,
`#pkp_content_footer`. The default theme hides the links until focused.
Live-probed 2026-09-23 (Rule 22; all three apps): the first Tab showed
"Skip to main content" alone, each further Tab the next; the summary
link after "Show the journal summary on the homepage." was ticked, the
announcements link on a home page with two announcements, the current
issue's on the seeded journal; after Enter on a link the next Tab landed
in that part of the page.

<a id="fn-u"></a>
**u** — `breadcrumbs.tpl` ("Home" `common.homepageNavigationLabel`,
separator `navigation.breadcrumbSeparator` "/", the current step an
`aria-current` span); variants OJS `breadcrumbs_issue.tpl` and
`breadcrumbs_article.tpl` (Archives, then the issue), OPS
`breadcrumbs_preprint.tpl`, lib/pkp `breadcrumbs_catalog.tpl` (the parent)
and `breadcrumbs_announcement.tpl` ("Announcements"). The base template
and the catalog and announcement variants carry no `aria-label`; the OJS
variants carry `navigation.breadcrumbLabel` "You are here:".
Live-probed 2026-09-23 (Rule 23): "Home / {name}" with "Home" leading
home (the site's, on its pages) and the last step not a link; home
pages, an OMP book's page and an OPS section's page without a trail; an
article "Home / Archives / Articles", in an issue "Home / Archives / Vol.
7 No. 1 (2020): K3 issue 1 / Articles"; a preprint "Home / Preprints";
"Announcements" before an announcement; a subcategory's parent on a
journal and a preprint server. A press's category page could not be
read: opening one on the seeded press ended the connection (the
catalog's feature).

<a id="fn-v"></a>
**v** — `pagination.tpl`: `{if $prevUrl || $nextUrl}`, `help.previous`
"Previous", `common.pagination` "{$start}-{$end} of {$total}", `help.next`
"Next", container label `common.pagination.label` "View additional
pages". Included by OJS `issueArchive.tpl`, OMP `catalog.tpl`,
`catalogCategory.tpl`, `catalogSeries.tpl`, OPS `preprints.tpl`,
`sections.tpl` (and OJS's recommend-by-similarity plugin). Page size:
the context's `itemsPerPage`, set on Settings › Website › "Setup" ›
"Lists" (default 25); the listing handlers fall back to the
configuration file's `[interface] items_per_page` only when it is empty
(OJS `IssueHandler::archive()`). Live-probed 2026-09-23 (Rule 24;
Settings bullet 16; all three apps): "Lists" held "Items per page" 25
and "Page links" 10, both required; at 1 on a scratch context with three
items, the OJS archive, the OMP catalog and the OPS preprint list and
section page read "1-1 of 3 Next", "Previous 2-2 of 3 Next", "Previous
3-3 of 3", and "Next" and "Previous" moved a page; at 25 no page links.
A press's series and category pages over one page were not reached.

<a id="fn-w"></a>
**w** — `message.tpl` and `error.tpl`: `breadcrumbs.tpl` with
`currentTitleKey=$pageTitle`, `<h1>{translate key=$pageTitle}</h1>`, the
message (`$messageTranslated` or `$message` / `$errorMsg`), `{if
$backLink}` a link labelled `$backLinkLabel`. Callers set `pageTitle` and
`backLink` (`LoginHandler`, `RegistrationHandler`, `ResetPasswordForm`,
payment plugins…). `PKPPageRouter::handleAuthorizationFailure()`
redirects a signed-in user to `user/authorizationDenied?message=…`;
`PKPUserHandler::authorizationDenied()` assigns `message` only, never
`pageTitle`, so `translate key=""` prints an empty string for the
heading, the breadcrumb and the title (A3); unchanged since the handler
was written (no `pageTitle` in its history). Seen on screen 2026-09-04 on
OPS (a reviewer's-review probe): the page's level-1 heading is empty.
Live-probed 2026-09-23 (Rule 26; all three apps): "Home / Reset
Password", its heading, "A confirmation has been sent to your email
address if a matching account was found. …" and "Login"; a journal
closed to registration: "Register", "This journal is currently not
accepting user registrations." ("…press…", "…server…") and "Login"; a
completed registration: "Registration complete", "Thanks for
registering! What would you like to do next?" and its three links.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-23 (Rule 26a; A3; all three apps): the
Author at `{journal}/management/settings/context` of the seeded journal
got an empty level-1 heading, the breadcrumb "Home / " with an empty
last step, "The current role does not have access to this operation."
and no link but the breadcrumb's "Home"; the same for the Reader,
Section Editor, Reviewer and an assistant, and at the site's
Administration address. Signed out: the Login page.

<a id="fn-td20"></a>
**td20** — `PKPApplication` answers a `NotFoundHttpException` (a page
or operation with no handler, `PKPHandler::index()`, a handler's missing
object) with status 404 and the body `<h1>404 Not Found</h1>` alone, no
template. A missing issue {OJS} or published book {OMP} fails
`OjsIssueRequiredPolicy` / `OmpPublishedSubmissionRequiredPolicy`
(`user.authorization.invalidIssue`,
`user.authorization.invalidPublishedSubmission`), and
`PKPPageRouter::handleAuthorizationFailure()` sends a signed-out visitor
to Login and a signed-in user to `user/authorizationDenied` with that
message; OMP `CatalogHandler::series()` redirects an unknown series path
to `catalog`. Live-probed 2026-09-28, two runs (Rules 15, 20, 26b; all
three apps), on a bilingual scratch journal with the Language block in
its sidebar and on `publicknowledge`: signed out, `/en/nosuchpageu08`,
`/en/about/nosuchop`, `announcement/view/999999` with announcements off,
{OJS} `article/view/999999` and {OPS} `preprint/view/999999` and
`preprints/category/nosuchu08` answered 404, an empty `<title>`, the
heading "404 Not Found" and no header, sidebar or footer; the item
addresses the same as the scratch journal's manager. `issue/view/999999`
{OJS} and `catalog/book/999999` {OMP}: signed out, Login with the full
frame; signed in, the access-denied page (empty heading, "Home / ") with
"Invalid issue requested!" or "An invalid published submission was
specified." and the Language block. {OMP} `catalog/series/<unknown>`:
the "Catalog" page with the full frame, signed in or out. A press's
category addresses were not opened. The control: the scratch journal's
home and About pages carried the Language block. Signed in, the path
and announcement addresses were not opened: `PKPPageRouter::route()`
throws the exception for an unknown page or operation before any
authorization (code read 2026-09-28), and announcements off answer the
bare page signed in or not ([Announcements](U12-announcements.md), Actors
row 1, note e).

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-23 (Rule 27; A1; all three apps): the
header's left part, the "i" icon's documentation link in a new tab, its
screen-reader name "##common.help##" (no link named "Help"), in English
and French, and the strip atop side windows, as note g records; the
journal's name led to its home page, and on Administration the site's
name to the site's home page. With the site unnamed, Administration's
header read "Journals | Open Journal Systems" (seen once, on OJS, before
the site was named); whether that text is a link was not recorded, and
the test sites could not be unnamed again, since the form refuses an
empty "Site Name".

<a id="fn-td19"></a>
**td19** — The initials menu is ui-library `Dropdown.vue` (inside
`TopNavActions.vue`), byte-identical in the three checkouts: its button
toggles the menu on click and closes it on `blur` (`closeOnBlur()`, after
100 ms, once the focus is outside the component); it has no key handler,
so Escape does nothing (A25). Test run 2026-09-26 (Rule 28; OJS,
`manager.maya` on the Dashboard of `publicknowledge`, three repeats): the
initials pressed, Escape pressed, the menu still shown 1 s later every
time; the initials pressed again, the menu hidden every time. The same
day scenarios 2 and 9, closing the menu by a second press on the
initials, passed five times on each of OJS, OMP and OPS. On OMP and OPS
Escape was not pressed; the claim rests on the shared component.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-23 (Rule 29; A21; all three apps): the
switcher as note g records. Live-probed 2026-09-28, two runs (Rule 29;
all three apps): with a scratch journal "Zeta" created before "Alpha",
Hosted Journals listed Zeta then Alpha, and `admin`'s switcher on a
third journal's Settings page listed every other journal in exactly
that table's order (628 entries on OJS, 507 on OMP, 501 on OPS), not
alphabetically; an Author enrolled in all three was offered Zeta then
Alpha. "Order", a drag and "Done" (`context-grid/save-sequence`, 200)
put Alpha first in run 1 and Zeta first again in run 2, and the table,
`admin`'s list and the Author's list followed each time. The
screen-reader names read "Journals", "Presses", "Servers".

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-23 (Rule 30; all three apps): on the
seeded and scratch journals, each role's side menu as the table gives
it; "Editor Dashboard" opening on the box "Search submissions";
"Statistics" without "Reports" for the Section Editor; "Content" with
"Comments" and "Issues" ("Catalog") while comments were on, "Issues"
("Catalog") alone while off, and on a preprint server no "Content" while
off; the highlighted entry and the open group on Tools, Statistics,
Settings › Website, Users & Roles, Announcements, the wizard and the
Dashboard; nothing highlighted on the Profile page; no side menu on
Administration. Live-probed 2026-09-28, two runs (Rule 30, the
"Administration" row; all three apps): on a bilingual scratch journal's
Settings › Journal, `admin`'s "Administration" (`index/<lang>/admin`)
opened "Site Administration", headed "Administration", whose panels lead
to "Hosted Journals", "Site Settings", "System Information", "Expire User
Sessions" and the rest, in English and in French; the manager, Section
Editor, Author, Reader and (OJS, OMP) Reviewer had no such entry.

<a id="fn-td18"></a>
**td18** — Seen 2026-09-23 (a submission-files claim check, OJS and
OMP): a script watching the page's text caught the raw text "{{
notification.message }}" in the notice region while a workflow page
unloaded, never on a screenshot. Live-probed 2026-09-23 (Rule 31; all
three apps): pages left five ways with the processor slowed six times
and the notice area read every 50 ms never showed text; read from the
start of the arriving page, the raw text sat in the area only before the
page's script started, hidden and of no size. A side-menu entry could
not be pressed with a workflow open, which covers the side menu.

<a id="fn-x"></a>
**x** — The grid and API actions create only a trivial
`NOTIFICATION_TYPE_SUCCESS` for the acting user (the top-right notice) and
write no event-log or audit row; no mailable is sent. Menu trees are cached
a day per menu and area lists an hour for signed-out visitors; every write
path forgets the caches it touches (notes l and o). Live-probed
2026-09-23 (Side effects; all three apps): adding, editing and removing
items and saving and removing menus left the mail catcher and the
editorial header's "Tasks" unchanged; each change showed on the next
signed-out load after a signed-out read had filled the cache, and a
site item renamed on Administration showed on the site's next
signed-out load.

<a id="fn-y"></a>
**y** — Where each scenario runs: scenarios 1 to 3 on the seeded
journal, press or server `publicknowledge`, read-only, with roster
accounts (`docs/process/users.md`; passwords by `getPassword()`, `admin`
`admin`): Journal Manager `manager.maya`, assistant `assistant.rita`
(Funding Coordinator on OJS and OMP, Editorial Board Member on OPS),
Section Editor `sectioneditor.ana`, Author `author.alex`, Reviewer
`reviewer.julia` (OJS, OMP), Reader `reader.rosa`. Its settings are the
install defaults (seed-facts; Settings bullets 5 and 8): English and French under "UI", English alone under
"Forms"; announcements, public comments, payments and institutional
statistics off; DOIs on; registration and submissions open; no
"Publishing Mode" choice ticked; OJS Vol 1 No 2 (2014) published. The
visitor is a second browser context, signed out. Scenarios 4 to 7, 10
and 11 on a scratch context from `POST scenarios/context` with a
throwaway `manager` in `users[]` (password the username twice); a
scratch context arrives with the installed menus of Rule 2, English
alone under "UI" and "Forms", announcements off, and no block in its
sidebar. Recipes: 10 — on OMP and OPS three submissions from `POST
scenarios/submission` with `published: true`; on OJS three published
issues in the context's `issues[]` (each `{volume, number, year,
published: true}`; each is made current as it is published, so the last
one is "Current"); "Lists" is saved on screen.
11 — `plugins: {developedbyblockplugin: {enabled: true}}`, the
"Sidebar" ticked on screen. 8 — as `admin`, on a site where any scratch
context exists (the side tab needs a second context, seed-facts); it
changes the site's own items, which every test on the install shares,
so it runs alone and puts "Login" back. 9 — two scratch contexts, each
enrolling `admin` as manager (every `createContext` does); a throwaway
`author` in the first's `users[]` only.

<a id="fn-f-a1"></a>
**f-a1** — `TopNavActions.vue` prints `t('common.help')` in the help
link's `-screenReader` span; `common.help` exists in no `.po` file of any
app, lib/pkp or ui-library, so `useLocalize()` returns the raw
`##common.help##`. The span arrived with ui-library d0d5dfb9 (2025-04-10,
pkp-lib#10779 "Redesigned Workflow rcX - Help modal") without the key.
Seen on screen 2026-09-03, 2026-09-06, 2026-09-22 and 2026-09-23 by other
features' probes and claim checks, all three apps, every role tried: the
text "##common.help##" beside "Tasks" in the dashboard header, in the side
windows' strips (the "Assign Participant" window, the upload wizard, the
workflow windows) and in legacy windows' and the Settings › Workflow
page's headers.

<a id="fn-f-a2"></a>
**f-a2** — `PKPNavigationMenuService::getDisplayStatus()`,
`NMI_TYPE_USER_DASHBOARD`: the role list `[ROLE_ID_MANAGER,
ROLE_ID_ASSISTANT, ROLE_ID_REVIEWER, ROLE_ID_AUTHOR]` has had no
`ROLE_ID_SUB_EDITOR` through every rewrite of the method (PSR-12 reformat
2021-04-20 and later), while `PKPPageRouter::getHomeUrl()` sends a sub
editor to `dashboard/editorial`. Seen on screen 2026-09-04 (note e).

<a id="fn-f-a3"></a>
**f-a3** — Note w. The heading is `{translate key=$pageTitle}` with no
`pageTitle` assigned by `authorizationDenied()`. Live-probed 2026-09-23
(td14): the browser tab read "| Journal of Public Knowledge" ("| Public
Knowledge Press", "| Public Knowledge Preprint Server"), and was empty
at the site's address; the page body's only link was the breadcrumb's
"Home".

<a id="fn-f-a4"></a>
**f-a4** — Live-probed 2026-09-23 (td9), all three apps: each opening
logged the page script error "TypeError: Cannot convert undefined or
null to object" and left the page's overlay in place. Cause, read: the
window's form reads `pkp.context.supportedFormLocales` in `setLocales()`
(ui-library `useForm.js`, `Object.keys`), and the site's pages carry no
context. The Vue window replaced the legacy `NavigationMenuForm` in
pkp-lib#12177 (`e0a5aa2b02`, 2026-01-22); the legacy form opened on the
site. Past the crash, `getNavigationAreas($context)` returns `[]` when
`$context` is null (note o), so the site window's area list would offer
`common.none` alone.

<a id="fn-f-a5"></a>
**f-a5** — `getMenuItemTypes()` gives `NMI_TYPE_ABOUT` a
`conditionalWarning`; `getDisplayStatus()` has no case for it, so the item
is always displayed; the "About the Journal" page with an empty text shows
its heading alone ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Rule 13). The notice was written in 2017 (pkp-lib#2178, `7f8282b139`)
with the same missing condition. Live-probed 2026-09-23 (all three
apps): the notice as quoted, word for word on a press and a server; with
"About the Journal" empty the header kept "About" and the page read
"Home / About the Journal" and the heading alone; with text saved the
item still showed.

<a id="fn-f-a6"></a>
**f-a6** — `manager.navigationMenus.privacyStatement.conditionalWarning`
and `…contact.conditionalWarning` (lib/pkp `manager.po`); the privacy
statement's tab is `website.tpl` side tab `privacy`, the contact's is the
Settings › Journal page's "Contact" tab
([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 2).
Live-probed 2026-09-23 (all three apps): both notices as quoted;
Settings › Workflow › "Submission" holds "Disable Submissions", "Author
Guidance", "Metadata", "Components", "Contributor Roles" and no privacy
statement, and the side menu's "Settings" has no "Contact".

<a id="fn-f-a7"></a>
**f-a7** — `header.tpl` `<button class="pkp_site_nav_toggle"><span>Open
Menu</span></button>`: a literal, not a `{translate}`; it has been so since
the template's current layout. Live-probed 2026-09-23 (all three apps):
"Open Menu" on the French pages of the seeded journal and of two scratch
journals, one given French on the Languages tab on screen; "Search",
the skip links and the footer logo's text in French there; the site's
French home page read "S'inscrire", "Se connecter".

<a id="fn-f-a8"></a>
**f-a8** — Note k. The legacy menu form it replaced
(`NavigationMenuFormHandler.js`, jQuery UI sortable) was drag-only too.
Live-probed 2026-09-23 (note k, keyboard), all three apps.

<a id="fn-f-a9"></a>
**f-a9** — Note k (depth from the configuration) and note q (the header
template draws two levels). No theme in the checkouts overrides
`navigationMenu.tpl`. Not seen running: note z.

<a id="fn-f-a10"></a>
**f-a10** — `PKPNavigationMenuController::validateNavigationMenu()`
(note j). Live-probed 2026-09-23 (td1), all three apps: the table then
listed "primary navigation menu" and "Primary Navigation Menu".

<a id="fn-f-a11"></a>
**f-a11** — Note l (the handler's answer, since 2021) and td2. The
messages exist as `manager.navigationMenus.form.typeMissing`,
`…pathRegEx`, `…duplicatePath`, `…customUrlError`; the unused
`…items.form.title.required` reads "The menu item title is required.".

<a id="fn-f-a12"></a>
**f-a12** — `NavigationMenuItemsFormHandler.js::setType()` replaces the
line only when the chosen value has a description, and "Choose a
type..." has none, so the last text stays. Live-probed 2026-09-23 (td2), all three apps.

<a id="fn-f-a13"></a>
**f-a13** — Note m. Live-probed 2026-09-23 (td8 and the item types
drive), OMP and OPS, OJS the control.

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-23 (td9), all three apps: the site's
"Add item" type list, the same as a journal's (note m).

<a id="fn-f-a15"></a>
**f-a15** — Live-probed 2026-09-23 (note i), all three apps; a reload
brought the cells in line.

<a id="fn-f-a16"></a>
**f-a16** — `manager.navigationMenu.noAssignedItems` and
`…noUnassignedItems` (note k). Live-probed 2026-09-23 (note j), all
three apps, on a scratch journal after every item was removed.

<a id="fn-f-a17"></a>
**f-a17** — `useFormChanged()`'s `beforeunload` prompt (note j).
Live-probed 2026-09-23 (note j): after a changed area on all three apps,
after a typed title on OJS and OMP; after a discarded drag on none.

<a id="fn-f-a18"></a>
**f-a18** — The item window is the legacy form in a legacy side window
(note l). Live-probed 2026-09-23 (note l), all three apps: four closes
per app, each answered "Cancel" and "OK"; the leave prompt with the
window open and untouched, none with it closed. The refused-save half:
lib/pkp's `FormHandler.js`, shared by the three apps,
`submitHandler_()` sets `formChangesTracked = false` and triggers
`unregisterChangedForm` on every submit, before the answer comes back,
and `containerCloseHandler()` confirms `form.dataHasChanged` only while
`formChangesTracked` is set, which the next `formChange()` sets again.
Test run 2026-09-24 on OJS and OPS, and by hand on OPS (note l): no box
after a refused "Save", the box again after a changed "Title".

<a id="fn-f-a19"></a>
**f-a19** — The installed item's title key `common.editorialMasthead`
(note n) had no `fr_CA` entry: live-probed 2026-09-23 (td4, td11), all
three apps, the raw code on French pages. lib/pkp `25182919bf` (the
`translations/stable-3_5_0` merge) added `msgstr "Entête"` to
`fr_CA/common.po`. Live-probed 2026-09-24 at ojs `71bb244152`, omp
`a36551804`, ops `07141ae4df` (lib/pkp `25182919bf`), all three apps,
on a scratch journal with English and French under "UI" and "Forms":
"Entête" in the header's "À propos" list, in both Navigation tables
and the Primary menu's row, nested under "À propos" in the menu window,
and in the item window's French "Title" box, whose type line read "Lien
vers la page affichant les membres actifs du personnel éditorial."; the
page it opens titled "Entête", with the trail "Accueil / Entête"; the
Appearance side tab "Entête". The rest of the "À propos" list: OJS "À
propos de cette revue, Soumissions, Entête, Déclaration de
confidentialité, Personne-ressource"; OMP "A propos de la presse,
Soumissions, Entête, Déclaration de confidentialité, Coordonnées"; OPS
"À propos du serveur, Soumissions, Entête, Déclaration de
confidentialité, Personne-ressource". The seeded journal (French under
"UI" alone) still showed every item in English, "Editorial Masthead"
included.

<a id="fn-f-a20"></a>
**f-a20** — `TopNavActions.vue` heads the list with
`t('common.changeLanguage')` (note g), which had no `fr_CA` entry:
live-probed 2026-09-23, all three apps, on a scratch journal with
English and French under "UI", the raw code. lib/pkp `25182919bf` (the
`translations/stable-3_5_0` merge) added `msgstr "Changer la langue"`
to `fr_CA/common.po`. Live-probed 2026-09-24 at ojs `71bb244152`, omp
`a36551804`, ops `07141ae4df` (lib/pkp `25182919bf`), all three apps,
on a scratch journal with English and French under "UI" and "Forms":
the menu, named "Navigation de l'usager", read "Changer la langue",
"English", "français" (ticked), "Modifier le profil", "Se déconnecter"
for the Journal Manager (on the Profile page and on Settings ›
Website), a Section Editor, an Assistant, an Author, a Reviewer (OJS,
OMP; a preprint server installs no Reviewer) and a Reader, and for the
Site Administrator there and on the site's Administration page. On a
journal with English alone, "Edit Profile" and "Logout" with no
language list.

<a id="fn-f-a21"></a>
**f-a21** — Note g (the switcher drops every context whose name equals
the current one's). Live-probed 2026-09-23 (td16), all three apps, with
two scratch journals given the same name.

<a id="fn-f-a22"></a>
**f-a22** — Note h. Live-probed 2026-09-23, all three apps: the
administrator's manager row removed on a scratch journal's Users &
Roles ("Remove Role"), leaving Reader; the side menu's calls for the
submission views answered 401. The journal's Navigation tab opened
behind the window; a press's and a server's gave the access-denied page
([Journal identity & about pages](U07-journal-identity-and-about-pages.md#a1)).

<a id="fn-f-a23"></a>
**f-a23** — `navigation.content` (lib/pkp `common.po`) has no `fr_CA`
entry; `doi.manager.displayName` reads `msgstr ""` in OMP's and OPS's
`locale/fr_CA/manager.po` and "DOIs" in OJS's. Live-probed 2026-09-24
at ojs `71bb244152`, omp `a36551804`, ops `07141ae4df` (lib/pkp
`25182919bf`), all three apps, as the Journal Manager of a scratch
journal with English and French under "UI" and "Forms", on Settings ›
Website: the group's text and `aria-label` read
`##navigation.content##` on OJS and OMP (OPS showed no "Content" group,
public comments being off, OPS1); the DOIs entry's text and
`aria-label` read `##doi.manager.displayName##` on OMP and OPS.
`editor.submission.searchGlobal` (lib/pkp `editor.po`) has no `fr_CA`
entry, and `common.publications` reads `msgstr ""` in OMP's
`locale/fr_CA/locale.po` ("Articles" on OJS, "Prépublications" on OPS).
Live-probed 2026-09-28, two runs, all three apps, on a scratch journal
with English and French under "UI" and "Forms", as its manager, `admin`,
Section Editor, Author, Reader and (OJS, OMP) Reviewer, each page read
in `/en/` as the control, where no code showed: the two codes above held;
"Editor Dashboard"'s search box showed the placeholder
`##editor.submission.searchGlobal##` to the manager, `admin` and the
Section Editor on all three apps, its row named "Résultats de recherche"
("Search Results" in English); on OMP the "Statistiques" group's first
entry read `##common.publications##` to the same three, the other
entries in French. The Author's, Reader's and Reviewer's menus showed no
code.

<a id="fn-f-a24"></a>
**f-a24** — `manager.navigationMenus.form.queryParams`, its
`.description` and `common.dragToReorder` (English "Drag to reorder")
have no `fr_CA` entry; OMP's `navigation.navigationMenus.newRelease`
reads `msgstr ""` in its `fr_CA` locale. Live-probed 2026-09-24 at ojs
`71bb244152`, omp `a36551804`, ops `07141ae4df` (lib/pkp
`25182919bf`), all three apps, as the Journal Manager of a scratch
journal with English and French under "UI" and "Forms": the "Entête"
item's window showed the label and the line under it as the raw codes;
the Primary menu window's handles carried the `title`
`##common.dragToReorder##`; on OMP the type list's options included
`##navigation.navigationMenus.newRelease##`.

<a id="fn-f-a25"></a>
**f-a25** — Note td19: `Dropdown.vue` has no Escape handler; the
focus half of the symptom is read from `closeOnBlur()`, not run. The
header's "About" list closes on Escape (note q), the menu window too
(note td7). Test run 2026-09-26, OJS: Escape left the menu shown three
times out of three; OMP and OPS share the component.

<a id="fn-f-ojs1"></a>
**f-ojs1** — OJS `NavigationMenuService` gives `NMI_TYPE_SUBSCRIPTIONS`
and `NMI_TYPE_MY_SUBSCRIPTIONS` a `conditionalWarning`, and
`NavigationMenuItemResource` copies it from `getMenuItemTypes()` for the
menu window (note k); why the two items still arrive without it was not
traced. Live-probed
2026-09-23 (the item types drive, note m), OJS: both items in the
primary menu, neither with an icon; both conditions held at both ends.

<a id="fn-f-ops1"></a>
**f-ops1** — OPS `classes/template/TemplateManager.php::setupBackendPage()`,
note h. Live-probed 2026-09-23 (td17): "Content" › "Comments" with
comments on, no "Content" once off; on a journal and a press "Content"
stayed with "Issues" or "Catalog".

<a id="fn-f-ops2"></a>
**f-ops2** — Note m. Live-probed 2026-09-23, OPS, twice: the save posted
`publishingMode=2` to the context and answered 200, the returned context
carried no `publishingMode`, nothing was stored, the radios were
unmarked on the next load and the header read "Announcements Archives
About".

<a id="fn-f-ops3"></a>
**f-ops3** — Note s. Live-probed 2026-09-23 (Rule 21), OPS, with OJS and
OMP the control.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Navigation tab: "Navigation" table, "Add Menu", row "Edit" / "Remove", title link | `{journal}/management/settings/website#setup/navigationMenus`; grid `grid.navigationMenus.NavigationMenusGridHandler` (`fetchGrid`, `fetchRow`, `deleteNavigationMenu`) | AFFM-028 · AFFM-029 · AFFM-030 · GRID-038 |
| The menu window (title, area, the two panels) | `VueModal` `NavigationMenuManagerFormModal` from the grid | AFFM-031 · VUE-066 |
| The menu window's requests | `api/v1/navigationMenus` (`GET items`, `GET areas`, `GET {id}/items`, `POST`, `PUT {id}`) | API-028 |
| Navigation tab: "Navigation Menu Items" table, "Add item", row "Edit" / "Remove", the item window | grid `grid.navigationMenus.NavigationMenuItemsGridHandler` (`addNavigationMenuItem`, `editNavigationMenuItem`, `updateNavigationMenuItem`, `deleteNavigationMenuItem`) | AFFM-032 · AFFM-033 · AFFM-034 · GRID-037 |
| Site's Navigation tab | `index/admin/settings#setup/nav` | AFFM-218 |
| "Preview" of a Custom Page item (rider) | `navigationMenu/preview` | ROUTE-019 (owned by *Custom pages & blocks*) |
| Menu and item records | `navigation_menus`, `navigation_menu_items`, `navigation_menu_item_assignments` (+ settings tables) | SET-017 · SET-018 |
| Header: logo or name | every public page | AFFR-001 |
| Header: "Open Menu" | every public page, narrow window | AFFR-002 |
| Header: primary menu | area `primary` | AFFR-003 |
| Header: fallback primary menus (unrendered; each app's `primaryNavMenu.tpl`) | none | AFFR-004 · AFFR-005 · AFFR-006 (dead, UNASSIGNED) |
| Header: "Search" | every journal page but Search | AFFR-007 |
| Header: user menu | area `user` | AFFR-008 |
| Header: the count beside the username (rider) | user menu | AFFR-009 (state owned by *Notifications center & email preferences*) |
| Skip links | every public page | AFFR-010 |
| Sidebar region | every public page not full width | AFFR-011 |
| Footer text | every public page | AFFR-012 |
| Footer application logo | every public page → `about/aboutThisPublishingSystem` | AFFR-013 |
| Breadcrumbs | pages under the header | AFFR-014 |
| Page links | listing pages | AFFR-015 |
| "Edit" shortcut | About, Editorial History, Contact, Information, Announcements, Submissions pages | AFFR-016 |
| Inline notice box (the Search page's "no results", the issue pages' notices) | delegated to *Search* and *Issues*, which own the messages; the box has no control | AFFR-018 |
| "Developed By" block | sidebar | AFFR-091 · PLUG-002 |
| Message, error and access-denied pages | `user/authorizationDenied` and each caller | AFFR-098 |
| Editorial header frame, `tasks` and `css` ops (rider) | `PKP\controllers\page\PageHandler` | GRID-064 (owned by *Appearance & theming*) |
| Unmounted menu manager (parked) | none: `NavigationMenuManager.vue` is not in any app's ui-library | VUE-042 (UNASSIGNED) |

## Reference — code anchors

- Grids: `lib/pkp/controllers/grid/navigationMenus/NavigationMenusGridHandler.php`,
  `NavigationMenusGridRow.php`, `NavigationMenusGridCellProvider.php`,
  `NavigationMenuItemsGridHandler.php`, `NavigationMenuItemsGridRow.php`,
  `NavigationMenuItemsGridCellProvider.php`;
  `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php`.
- Item form: `lib/pkp/controllers/grid/navigationMenus/form/PKPNavigationMenuItemsForm.php`;
  each app's `controllers/grid/navigationMenus/form/NavigationMenuItemsForm.php`;
  `lib/pkp/templates/controllers/grid/navigationMenus/form/navigationMenuItemsForm.tpl`,
  `customNMIType.tpl`, `remoteUrlNMIType.tpl`; OMP
  `templates/controllers/grid/navigationMenus/seriesNMIType.tpl`,
  `categoriesNMIType.tpl`;
  `lib/pkp/js/controllers/grid/navigationMenus/form/NavigationMenuItemsFormHandler.js`.
  Legacy, unused: `lib/pkp/controllers/grid/navigationMenus/form/NavigationMenuForm.php`,
  `templates/controllers/grid/navigationMenus/form/navigationMenuForm.tpl`.
- Menu window: ui-library `managers/NavigationMenuManager/NavigationMenuManagerFormModal.vue`,
  `useNavigationMenuManagerForm.js`, `NavigationMenuManagerField.vue`;
  `components/NavigationMenuEditor/NavigationMenuEditor.vue`,
  `MenuTreePanel.vue`, `MenuTreeItem.vue`, `useNavigationMenuEditor.js`,
  `useNavigationMenuEditorDragDrop.js`, `useMenuTree.js`,
  `useMenuItemWarnings.js`; `composables/useFormChanged.js`;
  `lib/pkp/js/load.js` (registration).
- API: `lib/pkp/api/v1/navigationMenus/PKPNavigationMenuController.php`;
  `lib/pkp/classes/navigationMenu/resources/NavigationMenuResource.php`,
  `NavigationMenuItemResource.php`.
- Model and service: `lib/pkp/classes/navigationMenu/NavigationMenu.php`,
  `NavigationMenuDAO.php`, `NavigationMenuItem.php`,
  `NavigationMenuItemDAO.php`, `NavigationMenuItemAssignment.php`,
  `NavigationMenuItemAssignmentDAO.php`;
  `lib/pkp/classes/services/PKPNavigationMenuService.php`
  (`getMenuItemTypes`, `getDisplayStatus`, `getMenuTree`,
  `transformNavMenuItemTitle`, `setAllNMILocalizedTitles`,
  `getAssignedItemsTree`, `getUnassignedItems`, `getNavigationAreas`,
  `saveMenuTreeAssignments`); each app's `classes/services/NavigationMenuService.php`;
  `lib/pkp/schemas/navigationMenu.json`, `navigationMenuItem.json`;
  `lib/pkp/classes/migration/install/NavigationMenusMigration.php`; each
  app's `registry/navigationMenus.xml`.
- Public frame: `lib/pkp/classes/template/PKPTemplateManager.php`
  (`initialize`, `smartyLoadNavigationMenuArea`);
  `lib/pkp/templates/frontend/components/header.tpl`, `navigationMenu.tpl`,
  `navigationMenus/dashboardMenuItem.tpl`, `footer.tpl`,
  `breadcrumbs.tpl`, `breadcrumbs_catalog.tpl`,
  `breadcrumbs_announcement.tpl`, `pagination.tpl`, `editLink.tpl`;
  OJS `breadcrumbs_issue.tpl`, `breadcrumbs_article.tpl`; OPS
  `breadcrumbs_preprint.tpl`; each app's `skipLinks.tpl`,
  `primaryNavMenu.tpl` (unrendered); OJS and OPS `notification.tpl`;
  `lib/pkp/templates/frontend/pages/message.tpl`, `error.tpl`;
  `lib/pkp/classes/core/PKPPageRouter.php` (`getHomeUrl`,
  `handleAuthorizationFailure`); `lib/pkp/pages/user/PKPUserHandler.php`
  (`authorizationDenied`); `plugins/themes/default/DefaultThemePlugin.php`,
  `styles/head.less`; each app's `plugins/blocks/developedBy/`.
- Editorial frame: `lib/pkp/templates/layouts/backend.tpl`;
  `PKPTemplateManager::setupBackendPage()` and each app's
  `classes/template/TemplateManager.php::setupBackendPage()`; ui-library
  `components/TopNavActions/TopNavActions.vue`, `SideNav/SideNav.vue`,
  `SideMenu/SideMenu.vue`, `SkipLink/SkipLink.vue`,
  `Modal/SideModalBody.vue`, `composables/useApp.js` (`getHelpUrl`,
  `getNavigationMenuMaxDepth`); each app's `classes/core/Application.php`
  (`getHelpUrl`).
- Settings pages: `lib/pkp/templates/management/website.tpl`,
  `lib/pkp/templates/admin/settings.tpl`,
  `lib/pkp/pages/admin/AdminHandler.php` (`siteSettingsAvailability`).
- Configuration: each app's `config.TEMPLATE.inc.php` (`[interface]
  navigation_menu_max_depth`, `items_per_page`).
- Locale: lib/pkp `manager.po` (`manager.navigationMenus.*`,
  `notification.*NavigationMenu*`), `common.po` (`navigation.*`,
  `common.navigation.*`, `common.pagination*`), `grid.po`, `user.po`,
  `submission.po`; each app's `locale/en/locale.po`, `manager.po`; OMP's
  `navigation.navigationMenus.*`; the developedBy plugin's `locale.po`.
