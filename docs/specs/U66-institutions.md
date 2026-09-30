---
name: institutions
status: verified
---

# Institutions

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal keeps a list of institutions: universities, libraries,
companies whose readers it wants to recognize. Each institution has a
name, the network addresses its readers come from (its IP ranges) and,
optionally, its ROR, the institution's identifier in the Research
Organization Registry. A Journal Manager maintains the list on the
journal's "Institutions" page: searching it, adding, editing and deleting
institutions. The list serves two other features. On a journal, an
institutional subscription names one of these institutions, and a visitor
from inside its IP ranges reads what the subscription covers
([Subscriptions](U51-subscriptions.md)). While the journal collects
institutional statistics, visits from inside an institution's IP ranges
are credited to it, and COUNTER reports can be run for it
([Statistics — usage](U64-usage-statistics.md)). The page is the same in
all three apps; a press and a preprint server have no subscriptions, so
there the list serves statistics alone. <sup>a</sup>

## Actors & permissions

"Manager-level roles" below are the roles whose row on the journal's
Roles settings reads "Journal Manager" ("Press Manager" on a press,
"Manager" on a preprint server) for its permission level: Journal
Manager, Editor and Production Editor on a journal or press; on a
preprint server the manager alone. The Settings pages are open to a
manager-level role only while the role has "Permit changes to Settings"
ticked on the Roles settings: the Editor and Production Editor rows have
it ticked and can lose it; the manager role's row offers no "Edit", so it
keeps it, and on a preprint server no manager-level role can lose it
([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)).
The Institutions page asks for it too. The Site Administrator holds a
manager role in every journal of a test install. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See "Institutions" in the side menu** (Rule 1) | • Manager-level roles and the Site Administrator, while the journal collects institutional statistics (Settings bullet 1) or, on a journal, while payments are enabled (Settings bullet 2)<br>• A manager-level role without "Permit changes to Settings" is shown the entry under the same conditions, and pressing it opens the access-denied page ⚠ [A1](#a1) <sup>q1</sup><br>• On a journal, the Subscription Manager is shown it while payments are enabled and is refused the page ([Subscriptions](U51-subscriptions.md#a16))<br>• Everyone else: no entry <sup>c</sup> |
| **Open the Institutions page; search, add, edit and delete institutions** (Rules 1–7) | • Manager-level roles with "Permit changes to Settings"<br>• The Site Administrator working in the journal<br>• A manager-level role without "Permit changes to Settings", the Section Editor, assistant-level roles, Author, Reviewer, Reader and, on a journal, the Subscription Manager: the access-denied page ("The current role does not have access to this operation.")<br>• Signed out: the Login page <sup>b</sup> |
| **The Site Administrator with no manager role in the journal** | • On a journal, the page lists the journal's institutions under an "Error" window, and every search, "Save" and "Yes" on "Delete" fails, changing nothing ⚠ [A6](#a6) <sup>q7</sup><br>• On a press and a preprint server, the access-denied page, as on their other Settings pages <sup>b</sup> |

## Fields & validation

**The Institutions page** (Rule 1) carries the heading "Institutions",
then a panel titled "Institutions" with a "Search" box and the button
"Add Institution" at its top, and under them the list (Rule 3): one row
per institution, its name followed by "Edit" and "Delete". <sup>e</sup>

**The "Add Institution" and "Edit Institution" panels** open from the
right and carry three fields and "Save". Nothing is checked before
"Save". A save the journal refuses leaves the panel open: the message
sits under the field, "Please correct one error." ("Please correct {n}
errors.") appears above "Save" with a button "Jump to next error", which
scrolls to the first flagged box ⚠ [A11](#a11), the notice "The form was
not saved because {n} error(s) were encountered. Please correct these errors and
try again." shows on the page, and "Save" stays grayed out until every
flagged box has been changed. A screen reader also gets a "Go to {field}:
{message}" button per fault, which the screen does not show. "Name" is
entered per language when the journal has more than one form language:
the top right of the panel names the languages, and pressing the other
language's name ("French") adds its box beside "Name", labelled with
that name ("French"; "Name in French" to a screen reader). Which
languages these are:
[→ form languages](U57-languages-and-locales.md#form-languages).
<sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name" | yes, in the journal's primary language | One line of text per language. The label carries no required mark, yet a save with the primary language's box empty is refused with "This field is required." under it; on "Edit Institution" of a journal with two or more form languages the message reads "You must complete this field in {language}.", naming the primary language. The other languages may stay empty. A name another institution of the journal already has is accepted. Shown as the row's name (Rule 3) and wherever the journal offers its institutions (Side effects) <sup>d</sup> |
| "IP ranges" | no | A box of several lines under "Valid values include an IP address (e.g. 142.58.103.1), IP range (e.g. 142.58.103.1 - 142.58.103.4), IP range with wildcard '*' (e.g. 142.58.*.*), and an IP range with CIDR (e.g. 142.58.100.0/24).". One entry per line, each one of: an IPv4 address; two addresses joined by "-", with or without spaces around it; an address with "*" standing for any of its four parts, alone or in a range; or an address followed by "/" and a number from 0 to 32. Spaces at either end of a line and empty lines before the first entry and after the last are dropped; otherwise each line is kept as typed, a repeated line and a range written high to low included. Any other line refuses the save with "Invalid IP range" under the box, shown once however many lines are wrong: an empty line between two entries, a part written with a leading zero ("010.0.0.1"), a part above 255, or an IPv6 address ⚠ [A7](#a7) <sup>q8</sup>. A line may run to 40 characters. A longer one, such as a range with many spaces around "-", is neither saved nor refused, yet each "Save" adds the institution without IP ranges ⚠ [A9](#a9). Left empty, the institution matches no visitor <sup>d</sup> |
| "ROR" | no | One line under "Research Organization Registry ID for this institution.". Only a full registry address saves, spaces around it dropped: "https://ror.org/" followed by a nine-character identifier that starts with 0 and ends in two digits, such as "https://ror.org/0213rcc28". Anything else, the identifier "0213rcc28" alone included, is refused with "This is not formatted correctly." under the box ⚠ [A5](#a5) <sup>q9</sup>. Nothing is looked up: the box offers no suggestions and the address is not checked against the registry, unlike the registry search on a contributor's affiliations ([→ ROR lookup](U41-contributors-and-affiliations.md#ror-lookup)). No page shows the ROR but this panel; the COUNTER reports print it (Side effects) <sup>d</sup> |

## Rules & state

1. **Reaching the page.** The Institutions page is the journal's address
   followed by "management/settings/institutions". It opens by that
   address for the roles of Actors row 2 whether or not the side menu
   shows the entry. The side menu's "Institutions" entry, which opens it,
   shows under the conditions of Settings bullets 1 and 2; its place among
   the other entries is described in
   [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
   its Rule 30. <sup>c</sup>
2. **One list per journal.** Each journal has its own list. Another
   journal's institutions never appear on its page, in its search results,
   in its "Customer ID" list or in its subscription window (Side effects).
   The site itself keeps no list. A new journal starts with none.
   <sup>e</sup>
3. **The list.** One row per institution: its name in the language the
   screens are shown in, or in the journal's primary language when it has
   none in that one, then "Edit" and "Delete". The rows come in no set
   order ⚠ [A10](#a10): a new institution shows last right after it is
   added, but an institution saved on "Edit Institution" usually moves to
   the end when the page next loads, and two loads of the same list can
   start at different rows. <sup>q2</sup> Thirty rows fill a page; a
   longer list gets page controls under it ("Previous", the page numbers,
   "Next"). With no institution the list reads "No items found.".
   <sup>e</sup>
4. **Search.** Typing in "Search" and pressing Enter keeps only the
   institutions that match every word typed, in any case. A word matches
   an institution when it is part of the institution's name in any of its
   languages, or part of one of its IP ranges as typed; two words may
   match in different places, so "campus 10.0" finds "Campus Library" with
   the range "10.0.0.0/8" <sup>q3</sup>. Typing alone changes nothing. The
   clear button at the end of the box ("Clear search phrase" to a screen
   reader), or emptying the box and pressing Enter, brings the whole list
   back; a phrase nothing matches leaves "No items found.". <sup>e</sup>
5. **Adding.** "Add Institution" opens the "Add Institution" panel with
   every box empty. "Save" closes the panel and the list reloads from its
   first page, a search in the box still applied, so the new institution
   shows only when it matches the search and falls among the first thirty
   rows (Rule 3). Closing the panel with its close control, with
   Escape or with a click outside it drops what was typed without a
   warning. <sup>f</sup>
6. **Editing.** "Edit" on a row opens the "Edit Institution" panel filled
   with the institution's name in each language, its IP ranges one per
   line and its ROR. "Save" closes the panel, and the row shows the new
   name at once. Emptying "IP ranges" or "ROR" and saving leaves the
   institution with none. Closing the panel with its close control, with
   Escape or with a click outside it drops what was typed, with no
   warning, except a change to the name: until the page is reloaded the
   row shows the unsaved name, "Edit" reopens with it in "Name", and a
   "Save" there, even of another box, stores it ⚠ [A2](#a2). <sup>f</sup>
   <sup>q4</sup>
7. **Deleting.** "Delete" on a row opens the "Delete Institution" dialog,
   "Are you sure you want to continue and delete this institution?", with
   "Yes" and "No". "Yes" closes the dialog and removes the row; "No"
   closes it and keeps the institution.
   No screen brings a deleted institution back, and the usage figures credited to it are deleted with it, as read from the code ⚠ [A4](#a4). <sup>g</sup>
   - 7a. {OJS} An institution that an institutional subscription names
     leaves the list, the "Customer ID" list and the institution choices
     of a new subscription, but stays on that subscription: its row on
     "Institutional Subscriptions" keeps the name, and its "Edit" window
     keeps the institution chosen. <sup>q6</sup>
     Its usage figures are kept too, as read from the code. <sup>g</sup>
   - 7b. {OMP OPS} On a press and a preprint server "Yes" deletes
     nothing: the app fails on the server, a window titled "Error" opens
     with one button, "OK", and the institution stays in the list, after
     a reload too
     ⚠ [A3](#a3). <sup>q5</sup>

## Side effects

- No change on the page sends an email, raises a notification or writes
  a log entry. <sup>h</sup>
- A saved institution is offered at once, under its name, in the
  "Customer ID" list of Statistics › "Counter R5" ("Report Settings",
  [Statistics — usage](U64-usage-statistics.md), its Rule 22) and, on a
  journal, in the "Institution" list of the institutional subscription
  window ([→ subscription window](U51-subscriptions.md#subscription-window));
  a rename shows in both lists and in the "Name" column of
  "Institutional Subscriptions" on their next load. <sup>h</sup>
- An institution's IP ranges take effect from the next visit: on a
  journal they decide which visitors an institutional subscription
  covers (*Subscriptions*, its Rule 18). <sup>h</sup>
  While the journal collects institutional statistics they also decide which visits are credited to the institution (*Statistics — usage*, its Rule 4a), as read from the code; no screen of a test install shows credited visits. <sup>h</sup>
- A COUNTER report run for an institution names it on its
  "Institution_ID" line by the journal's own identifier for it: the
  journal's path, ":" and a number ("publicknowledge:12"). An institution with a
  ROR gets "ROR:{ROR};" in front of it
  ("ROR:https://ror.org/0213rcc28;publicknowledge:12"). <sup>q10</sup>
- Deleting a journal under Administration › "Hosted Journals" deletes
  its institutions too. A press or a preprint server that holds an
  institution is not deleted by "Remove" › "OK": the app fails on the
  server, and the press stays listed, half deleted ⚠ [A8](#a8).
  <sup>q11</sup>

## Settings that modify behavior

1. **"Enable institutional statistics"** (Administration › Site Settings ›
   "Statistics" › "Institutional Statistics", then the journal's Settings
   › Distribution › "Statistics"; both unticked at install; the journal's
   box shows only while the site's is ticked; described in
   [Statistics — usage](U64-usage-statistics.md), its Rule 29). Both
   ticked: the side menu of the roles in Actors row 1 gains "Institutions"
   (Rule 1).
   Visits from the institutions' IP ranges are then credited to them, as read from the code (Side effects).
   Either unticked: no entry from this setting; the page, its list,
   every action on it and the "Customer ID" list are unchanged. Unticking
   the journal's box and pressing "Save" removes "Institutions" from the
   side menu at once, without a reload; ticking it again and saving adds
   it back the same way. <sup>i</sup> <sup>q1</sup>
2. **Payments "Enable"** {OJS} (Settings › Distribution › "Payments";
   unticked; described in [Payments & APCs](U52-payments-and-apcs.md),
   its Rule 1). Ticked and saved: the side menu gains "Institutions"
   whatever the statistics boxes. A press's "Payments" tab adds no entry.
   <sup>i</sup>
3. **"Permit changes to Settings"** (Settings › Users & Roles › "Roles",
   a role's "Edit"; ticked on the Editor and Production Editor roles; the
   manager role's row offers no "Edit"; described in
   [Roles configuration](U54-roles-configuration.md)). Unticked: the
   role's members get the access-denied page on the Institutions page
   (Actors row 2), while the side menu still offers the entry (Actors
   row 1). <sup>b</sup>
4. **Form languages** (Settings › Website › "Setup" › "Languages", the
   "Forms" column; English alone on the seeded journal, which ticks
   French under "UI" only, and on a new one;
   [→ form languages](U57-languages-and-locales.md#form-languages)). With
   two or more: "Name" per language, and the "You must complete this
   field in {language}." refusal on an edit (Fields). With one: a single
   "Name" box and "This field is required." on every refusal. <sup>d</sup>

## Cross-feature interactions

- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  (its Rule 3) lists this page among the pages outside the five Settings
  pages and owns "Permit changes to Settings" as a gate
  ([→ settings access](U07-journal-identity-and-about-pages.md#settings-access)).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the side menu (its Rule 30 and Settings bullets 6 and 10); this
  spec owns what the "Institutions" entry opens.
- [Subscriptions](U51-subscriptions.md) {OJS} owns the institutional
  subscription window and its "Institution" list, what an institutional
  subscription covers (its Rule 18), the reader's "Purchase Institutional
  Subscription", which adds an institution to this list on every purchase
  (its Rule 29, [A11](U51-subscriptions.md#a11)), and the Subscription
  Manager's refusal on this page ([A16](U51-subscriptions.md#a16)).
- [Payments & APCs](U52-payments-and-apcs.md) {OJS} owns the "Payments"
  tab whose "Enable" adds the side-menu entry, and the entry lingering
  after "Enable" is saved unticked
  ([A12](U52-payments-and-apcs.md#a12)).
- [Statistics — usage](U64-usage-statistics.md) owns the statistics
  boxes, the crediting of visits (its Rule 4a) and the "Customer ID"
  list and report files (its Rule 22).
- [Contributors & affiliations](U41-contributors-and-affiliations.md)
  owns the registry search on contributors' affiliations
  ([→ ROR lookup](U41-contributors-and-affiliations.md#ror-lookup));
  contributor affiliations are separate records, and this page never
  searches the registry.
- [Languages & locales](U57-languages-and-locales.md) owns the journal's
  form languages; [Roles configuration](U54-roles-configuration.md) owns
  the "Permit changes to Settings" box;
  [Hosted journals](U59-hosted-journals.md) owns deleting a journal.

## Canonical scenarios

The scenarios run on scratch journals with throwaway accounts, since most
of them add, change or remove institutions and scenario 4 ticks the
site's statistics box; the accounts, their passwords, the mail
catcher's address and the tooling recipe are in the footnote. <sup>s</sup>

1. **Adding, editing and deleting an institution**

   Given: Journal Manager of a scratch journal that holds no institution
   and has English as its one form language.

   - **The empty page**: open the journal's address followed by
     "management/settings/institutions": the page carries the heading
     "Institutions", then a panel titled "Institutions" with a "Search"
     box and "Add Institution" at its top, and the list reads "No items
     found." (Fields; Rules 1–3).
   - **Three faults at once**: press "Add Institution": the "Add
     Institution" panel opens from the right with "Name", "IP ranges"
     under "Valid values include an IP address (e.g. 142.58.103.1), IP
     range (e.g. 142.58.103.1 - 142.58.103.4), IP range with wildcard '*'
     (e.g. 142.58.*.*), and an IP range with CIDR (e.g.
     142.58.100.0/24).", "ROR" under "Research Organization Registry ID
     for this institution.", every box empty, and "Save" (Rule 5;
     Fields). Leave "Name" empty, type 256.1.1.1 and 300.1.1.1 on two
     lines of "IP ranges" and https://ror.org/1213rcc28 in "ROR", and
     press "Save": the panel stays open with "This field is required."
     under "Name", "Invalid IP range" once under "IP ranges" and "This
     is not formatted correctly." under "ROR"; "Please correct 3
     errors." shows above "Save" with a button "Jump to next error"; the
     page shows "The form was not saved because 3 error(s) were
     encountered. Please correct these errors and try again."; and
     "Save" is grayed out (Fields).
   - **Correcting the faults**: type Campus Library in "Name": "Save"
     stays grayed out, since "IP ranges" and "ROR" are still flagged.
     Replace "ROR" with https://ror.org/0213rcc28. "Save" can be pressed
     again once "IP ranges" has changed too, at the next bullet's first
     "Save" (Fields).
   - **More refused lines**: replace "IP ranges" with each of these in
     turn and press "Save" after each: the line 010.0.0.1; then the
     three lines 142.58.103.1, an empty line and 142.58.103.4. Each time
     "Invalid IP range" shows under the box, no other box is flagged,
     and the panel stays open (Fields "IP ranges").
   - **Every accepted shape**: empty "IP ranges" and type in it two
     empty lines, then these eight lines, the first with three spaces
     before and after it, then one empty line:
     "142.58.103.1", "142.58.103.1-142.58.103.4",
     "142.58.103.1 - 142.58.103.4", "142.58.*.*",
     "142.58.*.1 - 142.58.*.9", "142.58.100.0/24",
     "142.58.103.4 - 142.58.103.1" and "142.58.103.1" again. Press
     "Save": the panel closes and the list shows the row "Campus
     Library" with "Edit" and "Delete" (Rules 3, 5). Press "Edit": the
     "Edit Institution" panel opens with Campus Library in "Name", the
     eight lines in "IP ranges" one per line as typed, without the
     spaces around the first and without the empty lines before and
     after, and https://ror.org/0213rcc28 in "ROR" (Rule 6; Fields "IP
     ranges").
   - **Editing**: type Campus Library Renamed in "Name", empty "IP
     ranges" and "ROR", and press "Save": the panel closes and the row
     reads "Campus Library Renamed" at once. Press "Edit" again: "IP
     ranges" and "ROR" are empty. Close the panel with its close
     control. Reload the page: the row still reads "Campus Library
     Renamed" (Rule 6).
   - **"Customer ID"**: open Statistics › "Counter R5" and press "Edit"
     on "Platform Master Report (PR)": in the "Report Settings" window,
     "Customer ID" lists "Campus Library Renamed" (Side effects).
   - **"No"**: open the Institutions page again by its address and
     press "Delete" on the row:
     the "Delete Institution" dialog asks "Are you sure you want to
     continue and delete this institution?" with "Yes" and "No". Press
     "No": the dialog closes and the row stays, after a reload too
     (Rule 7).
   - **"Yes"** {OJS}: press "Delete" on the row, then "Yes": the dialog
     closes, the row leaves the list, and the list reads "No items
     found." (Rules 3, 7). On a press and a preprint server "Yes"
     deletes nothing [A3](#a3) (Rule 7b).
   - **No email**: the mail catcher has received no email since the
     first "Save" (Side effects).
   - **Control**: press "Add Institution": the panel opens with every
     box empty (Rule 5). <sup>s</sup>

2. **Searching a journal's list, in two languages**

   Given: Journal Manager of scratch journal B, whose primary language
   is English and whose form languages are English and French, holding
   "Campus Library" (IP range 10.0.0.0/8) and "Local Library" (IP range
   127.0.0.1), on an installation whose scratch journal A holds "Zebra
   Institute" (IP range 172.16.0.0/12).

   - **B's list**: open B's Institutions page (B's address followed by
     "management/settings/institutions"): it lists "Campus Library"
     and "Local Library", and no "Zebra Institute" (Rules 2, 3).
   - **A French name**: press "Edit" on "Campus Library": the top right
     of the "Edit Institution" panel names "French" and "English". Press
     "French": a box labelled "French" appears beside "Name". Type
     Bibliothèque du campus in it and press "Save": the panel closes and
     the row, on screens shown in English, still reads "Campus Library"
     (Settings bullet 4; Fields; Rule 3).
   - **The primary language required**: press "Edit" on "Local Library",
     empty "Name" and press "Save": the panel stays open with "You must
     complete this field in English." under "Name". Type Local Library
     in "Name" and press "Save": the panel closes and the row reads
     "Local Library" (Fields "Name"; Settings bullet 4).
   - **A word of the French name**: type bibliothèque in "Search" and
     press Enter: the list holds "Campus Library" alone (Rule 4). Every
     search below is typed in "Search" the same way and ended with
     Enter.
   - **Any case**: search LIBRARY: both institutions are listed (Rule
     4).
   - **A word of an IP range**: search 127.0.0: "Local Library" alone
     (Rule 4).
   - **Two words in two places**: search campus 10.0: "Campus Library"
     alone, its name matching "campus" and its range "10.0" (Rule 4).
   - **Two words no one institution holds**: search campus 127: "No
     items found." (Rule 4).
   - **Another journal's institution**: search Zebra, then 172.16: each
     time "No items found." (Rule 2).
   - **The whole list back**: press the clear button at the end of the
     "Search" box: both institutions are listed. Search local, then
     empty the box and press Enter: both are listed again (Rule 4).
   - **Adding under a search**: search campus. Press "Add Institution",
     type Delta Institute in "Name" and press "Save": the panel closes
     and the list holds "Campus Library" alone. Press "Add Institution"
     again, type Campus Annex in "Name" and press "Save": the list holds
     "Campus Library" and "Campus Annex" (Rule 5).
   - **"Customer ID"**: open Statistics › "Counter R5" and press "Edit"
     on "Platform Master Report (PR)": "Customer ID" lists "Campus
     Library", "Local Library", "Delta Institute" and "Campus Annex",
     and no "Zebra Institute" (Rule 2; Side effects).
   - **Control**: open B's Institutions page again: it lists the four.
     Type local in "Search" without pressing Enter: all four stay listed
     (Rule 4). <sup>s</sup>

3. **Who opens the Institutions page**

   Given: the throwaway accounts of a scratch journal's Journal Manager,
   an Editor whose role has "Permit changes to Settings" unticked {OJS
   OMP}, a Section Editor, a Copyeditor (an Editorial Board Member on a
   preprint server), an Author, a Reviewer {OJS OMP} and a Reader, and
   the address of its Institutions page: the journal's address followed
   by "management/settings/institutions".

   - **The Editor without "Permit changes to Settings"** {OJS OMP}:
     signed in, opens the address: the access-denied page, "The current
     role does not have access to this operation." (Actors row 2;
     Settings bullet 3).
   - **Section Editor, Copyeditor, Author, Reviewer {OJS OMP} and
     Reader**: each, signed in, opens the address: the same
     access-denied page (Actors row 2).
   - **Signed out**: open the address in a browser where nobody is
     signed in: the Login page shows (Actors row 2).
   - **Control**: the Journal Manager, signed in, opens the address: the
     Institutions page opens with its heading "Institutions" and its
     "Add Institution" button (Actors row 2; Rule 1). <sup>s</sup>

4. **The side-menu entry while the journal collects institutional statistics**

   Given: the Site Administrator and, in a scratch journal holding
   "Campus Library", its Journal Manager, a Section Editor, a Copyeditor
   (an Editorial Board Member on a preprint server), an Author and a
   Reviewer {OJS OMP}, with "Enable institutional statistics" ticked
   both under Administration › Site Settings › "Statistics" ›
   "Institutional Statistics" and on the journal's Settings ›
   Distribution › "Statistics".

   - **Journal Manager**: the side menu shows "Institutions"; pressing
     it opens the Institutions page listing "Campus Library" (Actors row
     1; Rule 1; Settings bullet 1).
   - **Section Editor, Copyeditor, Author and Reviewer {OJS OMP}**:
     each, signed in, opens the Dashboard: the side menu shows no
     "Institutions" (Actors row 1).
   - **The journal's box unticked**: the Journal Manager opens Settings
     › Distribution › "Statistics", unticks "Enable institutional
     statistics" and presses "Save": "Institutions" leaves the side menu
     at once, without a reload (Settings bullet 1).
   - **By its address**: the Journal Manager opens the journal's address
     followed by "management/settings/institutions": the page opens and
     lists "Campus Library" (Rule 1; Settings bullet 1).
   - **Ticked again**: back on Settings › Distribution › "Statistics",
     tick "Enable institutional statistics" and press "Save":
     "Institutions" is back in the side menu at once (Settings bullet
     1).
   - **Control**: the Site Administrator unticks "Enable institutional
     statistics" under Administration › Site Settings › "Statistics" and
     presses "Save"; the Journal Manager reloads the Dashboard: the side
     menu shows no "Institutions", though the journal's box was left
     ticked (Settings bullet 1). <sup>s</sup>

5. **An institution a subscription names** {OJS}

   Given: Journal Manager of a scratch journal with payments enabled,
   the institutional subscription type "Campus Year", the institutions
   "Campus Library" (IP range 10.0.0.0/8) and "Other Library", and the
   Reader Nova's institutional subscription to "Campus Year" for
   "Campus Library".

   - **A new institution offered**: open the side menu's "Institutions"
     and press "Add Institution", type Fresh Institute in "Name" and press "Save". Open
     the side menu's "Payments", then "Institutional Subscriptions", and
     press "Create New Subscription": its "Institution" list offers
     "Campus Library", "Other Library" and "Fresh Institute" (Side
     effects). Close the window.
   - **A rename**: on the Institutions page press "Edit" on "Campus
     Library", type Campus Library East in "Name" and press "Save".
     Reload "Institutional Subscriptions": Nova's row reads "Campus
     Library East" in the "Name" column, and "Create New Subscription"
     offers "Campus Library East" and no "Campus Library" (Side
     effects). Close the window.
   - **Deleted from the list**: on the Institutions page press "Delete"
     on "Campus Library East", then "Yes": the row leaves the list, and
     stays gone after a reload (Rule 7a).
   - **Kept on the subscription**: reload "Institutional
     Subscriptions": Nova's row still reads "Campus Library East"; the
     row's arrow › "Edit" opens the window with "Campus Library East"
     chosen in "Institution" (Rule 7a;
     [→ subscription window](U51-subscriptions.md#subscription-window)).
     Close the window.
   - **Gone from the choices**: press "Create New Subscription": its
     "Institution" list offers "Other Library" and "Fresh Institute" and
     no "Campus Library East" (Rule 7a). Close the window. Open
     Statistics › "Counter R5" and press "Edit" on "Platform Master
     Report (PR)": "Customer ID" lists "Other Library" and "Fresh
     Institute" and no "Campus Library East" (Rule 7a).
   - **Control**: reload the Institutions page: it lists "Other Library"
     and "Fresh Institute" (Rule 7). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A1 (Actors rows 1–2; issue report
    `docs/issues/institutions-menu-without-settings-permission.md`): a
    member of a manager-level role without "Permit changes to Settings",
    on all three apps, offered "Institutions" in the side menu and
    reaching the page from it
  - the guard for A2 (Rule 6; issue report
    `docs/issues/unsaved-name-kept-after-closing-edit-panel.md`): a
    changed "Name" closed without "Save", then "Edit" and a "Save" of
    another box, the saved name kept on the row and in the list
  - the guard for A3 and A8 (Rule 7b, Side effects; issue report
    `docs/issues/omp-ops-institution-delete-fails.md`): "Delete" ›
    "Yes" removing an institution on a press and a preprint server, and
    "Remove" on "Hosted Presses" ("Hosted Servers") removing one that
    holds an institution
  - the guard for A9 (Fields "IP ranges"; issue report
    `docs/issues/institution-long-ip-range-save-error.md`): a valid
    range longer than 40 characters on "Add Institution" and on "Edit
    Institution", saved once or refused, the ranges already stored kept
- **Rarely met**:
  - more than thirty institutions: thirty rows a page and the page
    controls "Previous", the page numbers and "Next" under the list
    (Rule 3)
- **Nothing new to test**:
  - the ROR on a COUNTER report's "Institution_ID" line, "ROR:{ROR};"
    in front of the journal's own identifier (Side effects)
  - "Add Institution" closed by its close control, by Escape or by a
    click outside, dropping what was typed without a warning (Rule 5)
  - spaces around a full address in "ROR" dropped on save (Fields
    "ROR")
  - "This field is required." on "Edit Institution" of a journal with
    one form language (Settings bullet 4)
  - the Editor and Production Editor with "Permit changes to
    Settings", offered the Journal Manager's page (Actors row 2)
  - the Site Administrator working in the journal, offered the Journal
    Manager's page (Actors row 2)
- **Register carries it**:
  - A1 (the side-menu entry without "Permit changes to Settings";
    Actors row 1)
  - A2 ("Edit Institution" closed after a name change; Rule 6)
  - A3 ("Yes" on a press and a preprint server; Rule 7b)
  - A4 (the usage figures deleted with the institution; Rule 7)
  - A5 (the identifier alone in "ROR"; Fields "ROR")
  - A6 (the Site Administrator with no manager role in the journal;
    Actors row 3)
  - A7 (an IPv6 address in "IP ranges"; Fields "IP ranges")
  - A8 (removing a press or preprint server that holds an institution;
    Side effects)
  - A9 (an "IP ranges" line longer than 40 characters; Fields "IP
    ranges")
  - A10 (the rows' order; Rules 3, 5)
  - A11 (pressing "Jump to next error"; Fields)
- **Owned by another feature**:
  - the Subscription Manager shown "Institutions" and refused the page
    {OJS} (Actors rows 1–2; *[Subscriptions](U51-subscriptions.md)*,
    scenario 4)
  - IP ranges deciding which visitors an institutional subscription
    covers {OJS} (Side effects; *Subscriptions*, scenario 7)
  - IP ranges deciding which visits are credited to an institution
    (Side effects; *[Statistics — usage](U64-usage-statistics.md)*, its
    Rule 4a)
  - institutions added by a reader's institutional purchase {OJS}
    (Cross-feature interactions; *Subscriptions*, scenario 10)
  - a journal's deletion taking its institutions (Side effects;
    *[Hosted journals](U59-hosted-journals.md)*, scenario 6)
  - Payments "Enable" adding "Institutions" to the side menu {OJS}
    (Settings bullet 2; *[Payments & APCs](U52-payments-and-apcs.md)*,
    scenario 1)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | An Editor without "Permit changes to Settings" is offered "Institutions" and refused the page | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A2](#a2) | A name change dropped by closing "Edit Institution" stays on screen and is stored by the next "Save" | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A3](#a3) | On a press and a preprint server no institution can be deleted | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A8](#a8) | A press or preprint server that holds an institution cannot be removed and is left half deleted | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A9](#a9) | A long "IP ranges" line makes an institution's "Save" fail, adding duplicates or wiping its ranges | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A4](#a4) | Deleting an institution deletes the usage figures credited to it | ❓ | latent | — |
| [A5](#a5) | The "ROR" box asks for an ID and refuses one | ❓ | minor | — |
| [A6](#a6) | On a journal, a Site Administrator with no manager role is shown the page under an "Error" window and refused every change | ❓ | minor | — |
| [A7](#a7) | "IP ranges" refuses every IPv6 address | ❓ | minor | — |
| [A10](#a10) | The Institutions list has no set order | ❓ | minor | — |
| [A11](#a11) | "Jump to next error" leaves the cursor on the button | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — An Editor without "Permit changes to Settings" is offered "Institutions" and refused the page** · 🐞 · medium.
On a journal, press or preprint server that collects institutional
statistics, a user whose manager-level role has "Permit changes to
Settings" unticked (a Journal or Press editor or Production editor, or a
role created at the manager level, which arrives unticked) is shown
"Institutions" in the side menu, but pressing it opens "The current role
does not have access to this operation.". The change that added the
permission meant these roles to lose only the Settings pages and keep
Institutions, as they keep Announcements. Such a user cannot maintain the
institution list, and a manager with the permission has to do it for
them. Every app since 3.5.
Basis: probe, 2026-09-30. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A name change dropped by closing "Edit Institution" stays on screen and is stored by the next "Save"** · 🐞 · medium.
A manager who changes "Name" on "Edit Institution" and closes the panel
by its close control, by Escape or by a click outside it expects the
change dropped, as a change to "IP ranges" is. Instead the row shows the
new, unsaved name, and "Edit" on the row reopens the panel with it in
"Name"; a "Save" there, made to change another box, stores the name the
manager had abandoned. Only a reload before reopening puts the saved
name back. The same as [Announcements A11](U12-announcements.md#a11)
and [Highlights A4](U11-highlights.md#a4).
Basis: probe, 2026-09-30. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — On a press and a preprint server no institution can be deleted** · 🐞 · medium · crash: server.
A Press Manager or a preprint server's Manager who presses "Delete" on a
row and "Yes" expects the institution to go. The app fails on the server
instead: a window titled "Error" opens, and after "OK" the institution is
still listed, after a reload too. A press or preprint server can never
remove an institution, a mistyped one included. On a journal the same
"Yes" removes it (Rule 7).
Since: 2021-06-15 (the list's first version), a date read from the code's history · Basis: probe, 2026-09-30. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — Deleting an institution deletes the usage figures credited to it** · ❓ · latent.
The dialog asks only "Are you sure you want to continue and delete this
institution?". On "Yes", every usage figure the journal credited to the
institution is deleted with it, so no COUNTER report can show that
institution's past use again, while on a journal an institution a
subscription names is kept for its subscription (Rule 7a).
Question: should an institution with credited usage be kept out of the
list rather than deleted, as one a subscription names is? Lean: yes; the
institution record is described in the app itself as kept after deletion
because statistics may refer to it. Basis: code. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The "ROR" box asks for an ID and refuses one** · ❓ · minor.
The help under "ROR" reads "Research Organization Registry ID for this
institution.", but the identifier alone ("0213rcc28") is refused with
"This is not formatted correctly."; only the full address
"https://ror.org/0213rcc28" saves, and the panel never says so.
Question (a product ruling no screen settles): should the box take the identifier, or its help show the address form?
Lean (the author's judgment, which no screen settles): the help should show a full-address example; the full address is the registry's own form of the identifier.
Basis: probe, 2026-09-28. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — On a journal, a Site Administrator with no manager role is shown the page under an "Error" window and refused every change** · ❓ · minor.
On a journal, an administrator whose own roles there no longer include
a manager role still opens the Institutions page and sees the list, but
under an "Error" window, "The current role does not have access to this
operation.", on every load. After "OK", a search and a "Yes" on "Delete"
bring the same window, and "Save" on "Add Institution" leaves the panel
open with "An unexpected error has occurred. Please reload the page and
try again."; nothing changes. A press and a preprint server refuse that
administrator the page up front.
Question (a product ruling no screen settles): should the administrator manage a journal's list there, or be refused the page as on a press?
Lean (the author's judgment, which no screen settles): refused up front, as the other two apps do; a page that shows the list under an error and fails every action is worse than the access-denied page.
Basis: probe, 2026-09-28. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — "IP ranges" refuses every IPv6 address** · ❓ · minor.
An institution whose readers arrive from IPv6 addresses cannot be
described: every IPv6 address or range in "IP ranges" is refused with
"Invalid IP range", and the help gives IPv4 examples without saying that
only IPv4 is taken.
Question (a product ruling no screen settles): is an IPv4-only list intended?
Lean: intended as built, since the subscription and statistics matching compare IPv4 numbers only (read from the code), but the help should say "IPv4".
Basis: probe, 2026-09-28. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A press or preprint server that holds an institution cannot be removed and is left half deleted** · 🐞 · medium · crash: server.
A Site Administrator who presses "Remove" and then "OK" on
Administration › "Hosted Presses" ("Hosted Servers" for a preprint
server) for a press that holds an institution expects it deleted, as a
press without one is. The app fails on the server: the "Confirm" window
stays open with no message, and the press is still listed after a
reload. The press is left half deleted: every Settings page of it, the
Institutions page included, now answers "The current role does not have
access to this operation." even to the Site Administrator, while its
public home page still opens. On a journal the same "Remove" deletes the
journal and its institutions (Side effects). Basis: probe, 2026-09-30.
<sup>f-a8</sup>

<a id="a9"></a>
**A9 — A long "IP ranges" line makes an institution's "Save" fail, adding duplicates or wiping its ranges** · 🐞 · medium · crash: server.
A manager who types in "IP ranges" a valid range longer than 40
characters, such as one with many spaces around "-", and presses "Save"
on "Add Institution" or "Edit Institution" meets a failure on the server:
the panel stays open under "An unexpected error has occurred. Please
reload the page and try again." and nothing says which line is at fault.
Yet each "Save" on "Add Institution" adds the institution without IP
ranges, and a "Save" on "Edit Institution" keeps only the lines above the
long one, so the institution loses the ranges it had. The same range saves
once the extra spaces are removed. Every journal, press and preprint
server since institutions were introduced, and journals' institutional
subscriptions before that.
Basis: probe, 2026-09-30. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The Institutions list has no set order** · ❓ · minor.
The rows follow no order a manager can predict: an institution saved on
"Edit Institution" usually moves to the end of the list on the next
load, two loads of the same list can start at different rows, and an
institution added to a list of thirty can land on the first page or on
the second. A manager who knows an institution by its place, or pages
through a long list, cannot count on finding it where it was.
Question (a product ruling no screen settles): should the list be sorted, by name for instance?
Lean: yes; a list without a fixed order can show a row on two pages or on none as it is paged (read from the code).
Basis: probe, 2026-09-28. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — "Jump to next error" leaves the cursor on the button** · ❓ · minor.
A manager who presses "Jump to next error" after a refused "Save"
expects to land in a flagged box. The cursor stays on the button, so
where the flagged box is already in view nothing on screen changes. The
screen-reader "Go to …" buttons keep the cursor too.
Question: should the button put the cursor in the first flagged box?
Lean: yes; otherwise a keyboard or screen-reader user still has to find the box.
Basis: probe, 2026-09-28. <sup>f-a11</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — one feature, shared code.** The whole feature is lib/pkp and
ui-library code with no app override: `PKP\pages\management\ManagementHandler::institutions()`
(the `settings` operation with the argument `institutions`), the template
`lib/pkp/templates/management/institutions.tpl` (`manager.setup.institutions`
"Institutions", `<institutions-list-panel>`, hook `Template::Institutions`),
`PKP\components\listPanels\PKPInstitutionsListPanel`,
`PKP\components\forms\institution\PKPInstitutionForm`,
`PKP\API\v1\institutions\PKPInstitutionController`,
`PKP\institution\{Institution, DAO, Collector, Repository, maps\Schema}`,
`lib/pkp/schemas/institution.json`, and ui-library
`src/components/ListPanel/institutions/InstitutionsListPanel.vue` and
`InstitutionsEditModal.vue`. No app subclasses any of them; the three
checkouts carry the same lib/pkp (`c4303c66af`) and ui-library
(`19802b78`) on 2026-09-28. The app-side seams are OJS
`classes/template/TemplateManager.php` (the payments-driven side-menu
entry, note c), OJS subscriptions (notes g, h), each app's
`SettingsHandler` role assignments (note b), and each app's
`manager.institutions.noContext`, which no screen reaches (the journal is
set from the request). Code read 2026-09-28.
Live-probed 2026-09-28 (Purpose), three apps, twice each: the page,
the "Add Institution" panel's three fields and their help texts read the
same on all three; an OMP press with payments enabled shows no
"Payments" or "Institutions" entry, and an OPS server's Settings ›
Distribution has no "Payments" tab ("License", "DOIs", "Search
Indexing", "Access", "Statistics").

<a id="fn-b"></a>
**b — who reaches the page.** Each app's `APP\pages\management\SettingsHandler`
assigns `settings` to `ROLE_ID_MANAGER`; OJS also assigns it to
`ROLE_ID_SITE_ADMIN`, while OMP and OPS assign the Site Administrator
`access` alone. `ManagementHandler::authorize()` adds
`ContextAccessPolicy` and, for the `settings` operation unless the
arguments are `announcements` or `userComments`, `CanAccessSettingsPolicy`
(a Site Administrator group, or a manager-level group with
`permitSettings`): `institutions` is not exempt. Signed out, the
context access policy sends the visitor to Login. The API
(`PKPInstitutionController::getRouteGroupMiddleware()`: `has.user`,
`has.context`, `roleAuthorizer([ROLE_ID_MANAGER])`) admits the journal's
manager-level roles. Seen on screen 2026-09-23 (*Journal identity & about
pages*, its note k): the address opened the page for the manager and
answered the access-denied page to an Editor without "Permit changes to
Settings"; seen 2026-09-28 (the same note): it opened for the Site
Administrator and a Journal Manager of a scratch journal on all three
apps. seed-facts ("A Site Administrator can be left without a manager
role"): Settings › Website answers the access-denied page to such an
administrator on a press and a server.
Live-probed 2026-09-28 (lead-in; Actors row 2; Settings bullet 3), three
apps, twice each, on scratch contexts: the Roles settings' "Permission
level" reads "Journal Manager" on the OJS "Journal manager", "Journal
editor" and "Production editor" rows ("Press Manager" on OMP's "Press
manager", "Press editor", "Production editor"; "Manager" on OPS's
"Preprint Server manager" alone); the Editor and Production Editor
"Edit" windows carry "Permit changes to Settings" ticked and untickable;
the manager row has no "Edit"; the Users list shows `admin` with the
manager role in `publicknowledge` and in each scratch context. The typed
address opened the list for the manager, Editor, Production Editor and
`admin`; it answered the access-denied page
(`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`)
to the Section Editor, Copyeditor (OPS: Editorial Board Member), Author,
Reviewer, Reader, the Subscription Manager, and the Editor and
Production Editor without "Permit changes to Settings"; signed out, the
Login page (`?source=` the page).

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-28 (Actors row 1; A1; Settings bullet 1),
OJS and OMP, twice each: on a scratch journal and press whose Editor and
Production Editor roles have "Permit changes to Settings" unticked, with
both statistics boxes ticked, both roles' side menus have no "Settings"
and show "Institutions"; pressing it opens "The current role does not
have access to this operation.". The Journal Manager's unticking of the
journal's box and "Save" removed the entry from that same page at once,
and after it no role (the manager included) had the entry, while the
manager still opened the page by its address; ticking it again added
the entry back at once. On OJS the same Editor is shown the entry with
payments enabled and the statistics boxes off, and pressing it gives the
same refusal. OPS: the Roles settings list one manager-level row,
"Preprint Server manager", with no "Edit".

<a id="fn-c"></a>
**c — the side-menu entry.** `PKPTemplateManager::setupBackendPage()`
adds `institutions` (`institution.institutions` "Institutions", icon
`Institutes`) for `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` while
`Context::isInstitutionStatsEnabled()` (the site's
`enableInstitutionUsageStats`, unless the journal's own is stored false);
OJS `TemplateManager::setupBackendPage()` inserts it before `payments`
while `paymentsEnabled`, for `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER` and
`ROLE_ID_SUBSCRIPTION_MANAGER`. Neither reads `permitSettings`, which
the `settings` group does. `ManagementHandler::distribution()` passes
`institutionsNavLink`, which ui-library `SettingsPage.vue` adds or removes
on the statistics form's success. Seen on screen 2026-09-23 and
2026-09-28 (*Navigation menus & site chrome* note h; *Journal identity &
about pages* note k): the entry under both statistics boxes, and on a
journal with payments enabled, for the manager, `admin` and the
Subscription Manager.
Live-probed 2026-09-28 (Actors row 1; Rule 1; Settings bullets 1–2),
three apps, twice each: with both boxes ticked the entry showed for the
manager, Editor, Production Editor and `admin`, and not for the Section
Editor, Copyeditor or Editorial Board Member, Author or Reviewer (the
Reader, and the Subscription Manager while payments are off, have no
Dashboard and land on the access-denied page); site ticked and journal
unticked, or site unticked and journal stored ticked: no entry. OJS with
payments enabled and the statistics boxes off: the manager, Editor,
Production Editor, `admin` and the Subscription Manager (side menu read
on `{journal}/payments`, the Subscription Manager having no Dashboard);
pressing it as the Subscription Manager gives the access-denied page.
OMP with payments enabled: no entry, before and after "Enable" is saved
unticked and ticked again. The entry sits at the top level of the side
menu, after "DOIs". A manager with the site box off opens the page by its
address.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-28 (Actors row 3; A6), three apps, twice
each: on a scratch context holding "Campus Library", `admin`'s manager
role removed on screen (Users list › `admin` › "Edit" › "Remove Role";
Reader kept), then signed in again. OJS: the page lists "Campus Library"
under an "Error" window, "The current role does not have access to this
operation.", on every load (the side menu's count request answers 401
too); after "OK", "Search" "campus" + Enter answers 401 with the same
window and the list unchanged; "Add Institution", "Name" "Probe",
"Save" answers 401 and leaves the panel open under "An unexpected error
has occurred. Please reload the page and try again."; "Delete" › "Yes"
on "Campus Library" answers 401 with the window, and the row is still
there after a reload. OMP, OPS: the address answers the access-denied
page. Control: the context's own manager's search answers 200.

<a id="fn-d"></a>
**d — the panel's fields.** `PKPInstitutionForm`: `FieldText` `name`
(`common.name` "Name", size large, multilingual, no `isRequired`),
`FieldTextarea` `ipRanges` (`manager.institutions.form.ipRanges` "IP
ranges", description `…ipRangesInstructions`), `FieldText` `ror`
(`manager.institutions.form.ror` "ROR", description
`…ror.description`); one page, submit `common.save` "Save"; the form's
languages are the journal's `supportedFormLocales`
(`ManagementHandler::getSupportedFormLocales()`). Saving:
`PKPInstitutionController::add()` / `edit()` → `convertStringsToSchema()`
(an empty string becomes null, or an empty list for `ipRanges`), the
`ipRanges` string split on line ends and each line trimmed
(`convertIpToArray()`, after trimming the whole box) →
`Repository::validate()`: `ValidatorFactory::required()` (on an add, the
primary locale's `name` empty → `validator.required` "This field is
required."; on an edit, `form.requirePrimaryLocale` "You must complete
this field in {$language}." when the journal has more than one form
language), `allowedLocales`, the `ror` regex, and each IP line against
one regex (IPv4 parts 0–255 without leading zeros or `*`, an optional
`-` range with any spaces around it, or a CIDR suffix `/0`–`/32` without
wildcards), `manager.institutions.invalidIPRange` "Invalid IP range"
added once. Refusals answer 400; `Form.vue::error()` shows the field
messages, `form.errorOne` / `form.errorMany`, `form.errorA11y` "Go to
{$fieldLabel}: {$errorMessage}" and the notice `form.errors`. Stored:
`institutions` (`ror`), `institution_settings` (`name` per locale),
`institution_ip` (`ip_string` as the trimmed line, 40 characters at most,
with its numeric `ip_start`/`ip_end`). The multilingual field's language
button and "{Field} in {language}" labels are the shared `Form` component's,
as on the Announcements panel (*Announcements*, its Fields preamble).
Code read 2026-09-28.
Live-probed 2026-09-28 (Fields; Settings bullet 4), three apps, twice
each: the panel slides over the page from the right; an empty "Save"
answered 400 and left it open; three faults (empty "Name", "256.1.1.1",
"x" as "ROR") gave "Please correct 3 errors." and "…3 error(s)…". The
"Go to …" buttons sit in a list shown to screen readers alone; the
visible "Jump to next error" scrolls to the first fault, and neither
moves the keyboard focus into the box. "Save" stayed grayed after typing
in the unflagged "ROR" and came back once the flagged "Name" changed.
With English and French under "Forms" the panel's top right read
"French" (a button) and "English" (not one); the French box's accessible
name is "French Name in French". "This field is required." on an add
with the primary box empty, on one and on two form languages; "You must
complete this field in English." on an edit with two; an English-only
name saved on a two-language journal; "Dup Library" added twice gave two
rows. `publicknowledge` (as `manager.maya`): Settings › Website ›
"Setup" › "Languages" has English under "UI" and "Forms" and French
under "UI" alone, and its "Add Institution" panel has one "Name" box; a
new scratch context has English alone.
Test run 2026-09-29 (Fields; scenario 1), OJS: after the three-fault
save (empty "Name", "256.1.1.1" and "300.1.1.1", "https://ror.org/1213rcc28"),
"Campus Library" typed in "Name" left "Save" grayed out on every read
while "IP ranges" and "ROR" were still flagged; with "ROR" and "IP
ranges" changed too, "Save" was pressable on all three apps. In
ui-library, `Form.vue::fieldChanged()` removes the changed field's own error only,
and `FormPage.vue` disables "Save" while any error is left. Code read
2026-09-29.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-28 (Fields "IP ranges"; A7, A9), three
apps, twice each, as the manager of a scratch context, "Add
Institution" with a "Name" and one "IP ranges" value per try. Saved and
read back on "Edit" as typed: "142.58.103.1"; "142.58.103.1-142.58.103.4";
"142.58.103.1 - 142.58.103.4"; "142.58.*.*"; "*.*.*.*";
"142.58.*.1 - 142.58.*.9"; "142.58.100.0/24"; "0.0.0.0/0";
"142.58.100.1/32"; "142.58.103.4 - 142.58.103.1"; the same line twice
(both kept); two lines. Saved with the edges dropped: an entry with empty
lines before and after it, and one with three spaces at both ends and
two empty lines each side, both read back "142.58.103.1". Refused with
"Invalid IP range" under the box, shown once, the panel open with the
text kept: an empty line between two entries; "010.0.0.1"; "256.1.1.1";
"256.1.1.1" with "300.1.1.1"; "142.58.100.0/33"; "142.58.*.0/24";
"142.58. 103.1"; "2001:db8::1"; "2001:db8::1 - 2001:db8::9";
"2001:db8::/32". The help's four examples are IPv4 and the word "IPv4"
appears nowhere on the panel. The 45-character line (f-a9) was neither
saved nor refused.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-28 (Fields "ROR"; A5), three apps, twice
each: "https://ror.org/0213rcc28" saves, and with two spaces on each side
saves and reads back without them on "Edit". Refused with "This is not
formatted correctly." under the box: "0213rcc28"; "ror.org/0213rcc28";
"http://ror.org/0213rcc28"; "https://ror.org/1213rcc28";
"https://ror.org/0213rcc28/"; "https://ror.org/0213rcc2x";
"HTTPS://ROR.ORG/0213rcc28". Typing in the box opens no list of
suggestions and sends no request off the install. The ROR showed on
none of the Institutions rows, the "Institutional Subscriptions" row and
its "Edit" window, or the "Customer ID" list.

<a id="fn-e"></a>
**e — the list and its search.** `ManagementHandler::institutions()`
renders the first 30 of `Repo::institution()->getCollector()->filterByContextIds([journal])`
(summaries) with `itemsMax`; `PKPInstitutionsListPanel` (`count` 30,
`addInstitutionLabel` `grid.action.addInstitution` "Add Institution",
`editInstitutionLabel` `manager.institutions.edit` "Edit Institution",
`deleteInstitutionLabel` `manager.institutions.deleteInstitution` "Delete
Institution", `confirmDeleteMessage` `manager.institutions.confirmDelete`).
`InstitutionsListPanel.vue`: `PkpHeader` with the title, `Search`
(placeholder `common.search` "Search"; emits only on Enter or the clear
button, `common.clearSearch` "Clear search phrase"), the add button; rows
`localize(item.name)` (the current locale, else the primary), `common.edit`
"Edit", `common.delete` "Delete"; `Pagination` when the last page is
above 1; `ListPanel`'s empty text `common.noItemsFound` "No items found.".
The fetch mixin calls `GET institutions` with `searchPhrase`, `count`,
`offset`, the journal's id. `Collector::getQueryBuilder()`: the context,
`deleted_at IS NULL`, then per space-separated word (`%`/`_` escaped) a
case-insensitive `LIKE` on any `name` setting or any `ip_string`; no
`ORDER BY`, so the order is the database's (PostgreSQL on the test
installs). `PKPInstitutionController::getMany()` / `edit()` / `delete()`
scope to the request's journal (`exists($id, $contextId)`). A new
context carries no institution. No uniqueness check on `name` or `ror`.
Code read 2026-09-28.
Live-probed 2026-09-28 (the page; Rules 2–4), three apps, twice each:
h1 "Institutions", the panel's h2 "Institutions", the "Search" box, "Add
Institution", rows of name, "Edit", "Delete". A new context reads "No
items found.". Thirty seeded institutions: thirty rows, no page
controls; a 31st: "Previous 1 2 Next" under the list, page 2 holding one
row. A two-language journal viewed in French shows "Bibliothèque du
campus" for an institution with that French name and "Local Library"
for one with none. Another context's name word ("Zebra") and IP range
("172.16") find nothing; its "Customer ID" and subscription window never
list the other context's institution. Administration offers no
Institutions page (only the hosted contexts, "Site Settings", "View
System Information", "View Jobs", "View Failed Jobs").

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-28 (Rule 3; A10), three apps, twice each:
"Alpha", "Beta", "Gamma" added on screen each showed last at once, and a
reload kept that order. After "Edit" › "Save" on "Alpha" (a ROR set) and
a reload the rows read "Beta", "Gamma", "Alpha" in five runs of six (OPS
run 1 unchanged); after an "IP ranges" save on "Beta", "Gamma", "Alpha",
"Beta" (five of six); the edited row keeps its place until the reload. A
context seeded with "Pag 01" to "Pag 30" read in that order in five runs
of six; in the sixth (OJS) it opened on "Pag 28" and ended on "Pag 27",
and after "Pag 31" was added "Pag 31" was on page 1 and "Pag 27" on page
2.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-28 (Rule 4), three apps, twice each, on a
two-language scratch journal with "Campus Library" (French "Bibliothèque
du campus", "10.0.0.0/8") and "Local Library" ("127.0.0.1"), each typed
and Enter: "campus 10.0" → "Campus Library"; "bibliothèque" and
"Bibliothèque" → "Campus Library"; "127.0.0" → "Local Library";
"LIBRARY" → both; "10.0.0.0/8" → "Campus Library"; "campus 127" and
"nothing" → "No items found.". "local" typed without Enter left the list
as it was; the clear button (accessible name "Clear search phrase"), and
emptying the box and pressing Enter, each brought both back. After "IP
ranges" was emptied on "Campus Library", "10.0" found nothing.

<a id="fn-f"></a>
**f — adding and editing.** `InstitutionsListPanel.vue`:
`openAddModal()` clones the form (`POST` to `institutions`) and opens
`InstitutionsEditModal` (`SideModalBody`, title = the add label);
`openEditModal()` clones it (`PUT` to `institutions/{id}`), fills each
field from the row's item (`ipRanges` joined with a line break) and titles
it with the edit label. `formSuccess()`: after a `POST`, `offset` 0 and
`get()` (the first page, the search phrase kept); after a `PUT`, the row
replaced by the answer; then `closeFormModal()`. `Repository::edit()`
merges the answer's fields; `DAO::update()` replaces the IP rows whenever
`ipRanges` is posted (an empty box posts an empty list, so none are
left). Closing the side panel runs no confirmation. Code read 2026-09-28.
Live-probed 2026-09-28 (Rules 5–6), three apps, twice each: the add
panel opened empty, also after a typed-in panel was closed; the close
control, Escape and a click outside each closed it with no question and
the list unchanged; from page 2, "Save" returned to page 1. With "Beta"
searched, adding "Delta" left "Beta" alone listed; adding "Beta Two"
listed "Beta", "Beta Two". With thirty institutions, the added 31st was
on page 2 in five runs of six. "Edit" read the two ranges back one per
line; a rename showed on the row at once and after a reload; "IP ranges"
and "ROR" emptied and saved stayed empty on reopening.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-28 (Rule 6; A2), three apps, twice each:
"Edit" on "Campus Library Renamed", " X" added to "Name", the panel
closed by its close control, by Escape and by a click outside, each with
no question: the row read "Campus Library Renamed X" at once and
"Campus Library Renamed" after a reload. Before a reload, "Edit"
reopened with "Campus Library Renamed X" in "Name", and a "Save" there
after changing another box stored the abandoned name. Control: an "IP
ranges" change closed the same way left the row as it was, and "Edit"
reopened with the saved ranges.

<a id="fn-g"></a>
**g — deleting.** `InstitutionsListPanel.vue::openDeleteModal()`: dialog
`delete`, title "Delete Institution", message `confirmDeleteMessage` (no
parameter used), actions `common.yes` "Yes" (a `DELETE` through the
method override; on success the row is filtered out locally and focus
returns to the list; on error `ajaxErrorCallback`) and `common.no` "No".
`PKPInstitutionController::delete()` → `Repository::delete()` →
`DAO::delete()`: when a row of `institutional_subscriptions` names the
institution it is soft-deleted (`deleted_at` set; its IP rows kept);
otherwise its IP rows and the institution are deleted, and the
statistics tables' `institution_id` foreign keys cascade (A4; a test install holds no
credited figures to watch go). OJS keeps a soft-deleted
institution on its subscription: `SubscriptionsGridCellProvider` prints
`Repo::institution()->get()` (which does not filter `deleted_at`) and
`InstitutionalSubscriptionForm` adds "The institution is soft deleted" to
its choices for that subscription alone; the Counter R5 "Customer ID"
list and new subscriptions use the collector, which leaves it out.
Nothing restores a deleted institution. Code read 2026-09-28.
Live-probed 2026-09-28 (Rule 7), three apps, twice each: the dialog
titled "Delete Institution" reads "Are you sure you want to continue and
delete this institution?" with "Yes" and "No"; "No" keeps the row, after
a reload too; on OJS "Yes" removes the row, after a reload too.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-28 (Rule 7a; A4), OJS, twice, on a
scratch journal with an institutional subscription type and an
institutional subscription for "Campus Library" ("Other Library" beside
it): before, the "Customer ID" list of Statistics › "Counter R5" ›
"Edit" on "Platform Master Report (PR)" and "Create New Subscription"
both offer the two. "Delete" › "Yes" on "Campus Library" removes its row,
after a reload too. After: the subscription row on Payments ›
"Institutional Subscriptions" still reads "Campus Library", its "Edit"
window keeps "Campus Library" chosen, "Create New Subscription" offers
"Other Library" alone, and "Customer ID" lists "The World" and "Other
Library".

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-28 (Rule 7b; A3), OMP and OPS, twice each,
on scratch contexts holding "Gamma" and "Delta", neither named by
anything: "Delete" › "Yes" replaced the dialog with a window titled
"Error" with one button, "OK"; after "OK" nothing was open and the row
was still listed, after a reload too. Every "Yes" answered a server
error: 500 on `POST {context}/api/v1/institutions/{id}` (the method
override `DELETE`). Control: on OJS the same removes the row.

<a id="fn-h"></a>
**h — what the list feeds.** No mailable, notification or log call sits
on the institution paths (`PKPInstitutionController`, `Repository` fire
only the hooks `Institution::add`, `::edit`, `::delete::before`,
`::delete`, which nothing in the three apps' core handles). Consumers:
the Counter R5 "Customer ID" options (`CounterR5Report`'s report settings
fields, `Repo::institution()` of the context; *Statistics — usage* note
l); OJS `InstitutionalSubscriptionForm` (the collector of the journal's
institutions, `manager.subscriptions.form.institutionRequired` when none)
and `SubscriptionsGridCellProvider` (the name column); matching by IP:
`Collector::filterByIps()` for usage crediting
(`PKPStatisticsHelper`, `LogUsageEvent`) and OJS
`InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()` (a
join on `institution_ip`, `ip_start`..`ip_end`). The ROR:
`CounterR5Report` builds `Institution_ID` as `ROR:{ror}` (when set)
then `{platformId}:{id}`, joined by ";"
(`PKPStatsSushiController` likewise for the SUSHI customer list). Context
deletion: `PKPContextService::delete()` runs
`Repo::institution()->deleteMany()` over the journal's institutions,
through `DAO::delete()` (A3). Code read 2026-09-28.
Live-probed 2026-09-28 (Side effects), three apps, twice each: add,
rename, an IP-range edit, "No" and "Yes" (and, on OJS, a reader's
institutional purchase) created no row in `notifications`, `event_log`
or `email_log` and no message in the mail catcher. "Fresh Institute"
added showed on the next load in the "Customer ID" list and, on OJS, in
"Create New Subscription"; "Campus Library" renamed showed in both and in
the "Name" column of "Institutional Subscriptions". OJS, a subscribed
"Local Library" ranged 192.168.5.0/24: a signed-out visitor saw
"Requires Subscription PDF" and was sent to Login; after its "IP ranges"
became 127.0.0.1, the visitor's next visit opened the PDF.

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-28 (Side effects), three apps, twice each,
the site's COUNTER start date set to 2026-05-01 for the probe and a work
published 2026-05-10: Statistics › "Counter R5" › "Edit" on "Platform
Master Report (PR)", "Download". "Campus Library" (ROR
"https://ror.org/0213rcc28"): `Institution_ID,ROR:https://ror.org/0213rcc28;{journal path}:{institution id}`;
"Local Library" (no ROR): `Institution_ID,{journal path}:{institution id}`;
"The World": `Institution_ID,` empty.

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-28 (Side effects; A8), three apps, twice
each, as `admin`: on "Hosted Journals" a scratch journal with one
institution is deleted by "Remove" › "OK", its row gone with no message.
On "Hosted Presses" and "Hosted Servers" a context holding one
institution is not: the "Confirm" window stays open, the row is listed
after a reload, and a context with none is deleted (control).

<a id="fn-i"></a>
**i — the settings.** Site: `PKPSiteStatisticsForm`
`enableInstitutionUsageStats`; journal: `PKPContextStatisticsForm` adds
`enableInstitutionUsageStats` (`manager.settings.statistics.institutionUsageStats`)
only while the site's is on, its value the journal's own or else the
site's; a new context stores it unticked (seed-facts, "The journal's own
Settings › Distribution › "Statistics""). `Context::isInstitutionStatsEnabled()`
reads both (note c). Payments: `PKPPaymentSettingsForm` `paymentsEnabled`,
read by OJS `TemplateManager` (note c); OMP's tab adds no entry. The page,
the panel and the API read neither setting. Code read 2026-09-28.
Live-probed 2026-09-28 (Settings bullets 1–2), three apps, twice each:
with the site box unticked the journal's Settings › Distribution ›
"Statistics" shows only "Public API"; with it ticked, a context not set
otherwise shows "Institutional Statistics" › "Enable institutional
statistics" unticked. The page, its list and the "Customer ID" list
("The World" and the institutions) read the same with the site box off,
on and off again. OJS: "Enable" saved unticked drops "Payments" from the
side menu at once and "Institutions" on the next load (*Payments &
APCs* A12); ticked again, both come back at once.

<a id="fn-s"></a>
**s — accounts and tooling.** Scenarios 1 to 4 run on OJS, OMP and
OPS, a bullet badged {OJS} or {OJS OMP} only there; scenario 5 runs on
OJS. Scratch journals, presses and servers come from `POST
scenarios/context` (scenarios.md), which enrols `admin` (password
`admin`) as a manager; throwaway accounts come from its `users[]`, their
passwords their usernames twice (users.md): the Journal Manager
`manager`, the Editor `editor`, the Section Editor `sectionEditor`, the
Copyeditor `copyeditor` (OPS `editorialBoardMember`), the Author
`author`, the Reviewer `externalReviewer`, the Reader `reader` (Nova in
scenario 5). The names in the scenarios ("Campus Library", "Zebra
Institute"…) may carry the test's tag. Institutions: `institutions[]
{name, ipRanges?, ror?}` on the three apps; the list has no set order
(A10), so a test asserts the set of rows, never their order. Scenario 1:
a context with no institution, English its one form language (a new
context's default). Scenario 2: two contexts, B with
`supportedLocales` and `supportedFormLocales` `['en', 'fr_CA']` and
`institutions[]` "Campus Library" (`10.0.0.0/8`) and "Local Library"
(`127.0.0.1`), A with "Zebra Institute" (`172.16.0.0/12`); the French
name is typed on screen, since the seed fills the primary language's
box alone. Scenario 3: `roles: {editor: {permitSettings: false}}` (OJS,
OMP). Scenario 4: the site's box `POST site
{enableInstitutionUsageStats: true}` (site-wide, so the test is `@solo`
and sets it back to `false` after), the journal's box the context key
`enableInstitutionUsageStats: true`. Scenario 5: `payments`,
`subscriptionTypes[]` "Campus Year" with `institutional: true`,
`subscriptions[]` for the reader with `institution` "Campus Library"
(an institutional subscription needs IP ranges on its institution). The
"Customer ID" list is on Statistics › "Counter R5" › "Edit" on
"Platform Master Report (PR)" (*Statistics — usage*, its scenario 8).
The mail catcher is Mailpit at `http://127.0.0.1:8025` (slot 0;
`8025+n` on slot n, harness.md "Slots"), read for scenario 1's "No
email".

<a id="fn-f-a1"></a>
**f-a1 — A1 evidence.** Note c: the entry's two sources test the role
level and the setting, never `permitSettings`; note b: the page's
`CanAccessSettingsPolicy` does. The Editor and Production Editor groups
carry `permitSettings` and can lose it (Settings bullet 3); OPS offers no
manager-level group that can. Live-probed 2026-09-28: q1.
Issue report: [docs/issues/institutions-menu-without-settings-permission.md](../issues/institutions-menu-without-settings-permission.md).

<a id="fn-f-a2"></a>
**f-a2 — A2 evidence.** `InstitutionsListPanel.vue::openEditModal()`
sets `field.value = institution[field.name]`, handing the row's own
`name` object to the form; `Form.vue::fieldChanged()` writes a
multilingual change into that object (`field[prop][localeKey] = value`);
the row prints `localize(item.name)`; `closeFormModal()` discards the
cloned form only. `ipRanges` is a new string and `ror` a plain value, so
only the name leaks, into the row and into the next opening of the panel,
which fills from the same object. The same pattern is on screen in *Highlights* A4 and
*Announcements* A11. Live-probed 2026-09-28: q4.
Issue report: [docs/issues/unsaved-name-kept-after-closing-edit-panel.md](../issues/unsaved-name-kept-after-closing-edit-panel.md).

<a id="fn-f-a3"></a>
**f-a3 — A3 evidence.** `PKP\institution\DAO::delete()` asks
`DB::table('institutional_subscriptions')->where('institution_id', …)->exists()`
before choosing a soft or a hard delete. Only OJS creates that table
(`classes/migration/install/OJSMigration.php`); lib/pkp's
`InstitutionsMigration` touches it only `if (Schema::hasTable(…))`, and
OMP and OPS create no such table, so on a press and a preprint server the
query fails and the `DELETE` answers a server error; the ui-library
callback's `ajaxErrorCallback` opens the "Error" window. The check dates
from `bed0ee4c3b` "pkp/pkp-lib#6782 Introduce Institutions" (2021-06-15)
and survives `630730ae13` (2026-08-28). The same method serves a
journal's deletion (note h; q11). Live-probed 2026-09-28: q5.
Issue report: [docs/issues/omp-ops-institution-delete-fails.md](../issues/omp-ops-institution-delete-fails.md).

<a id="fn-f-a4"></a>
**f-a4 — A4 evidence.** `DAO::delete()` hard-deletes an institution no
subscription names; each app's `MetricsMigration` creates
`metrics_counter_submission_institution_daily`, `…_monthly` and
`usage_stats_institution_temporary_records` with `institution_id`
foreign keys `onDelete('cascade')`. `schemas/institution.json`,
`deletedAt`: "Institutions are kept after being deleted because they may
be referenced in statistics data." No screen of a test install shows
credited figures (*Statistics — usage*, its Rule 5), so this is read from
the code.

<a id="fn-f-a5"></a>
**f-a5 — A5 evidence.** `schemas/institution.json` `ror`:
`nullable`, `regex:#^https://ror\.org/0[^ILOU]{6}\d{2}$#`, answered with
`validator.regex` "This is not formatted correctly."; the help is
`manager.institutions.form.ror.description`. Live-probed 2026-09-28: q9.

<a id="fn-f-a6"></a>
**f-a6 — A6 evidence.** Note b: OJS gives the Site Administrator the
`settings` operation, OMP and OPS do not; the API admits
`ROLE_ID_MANAGER` alone and answers the administrator 401 carrying "The
current role does not have access to this operation." (seen on screen;
not `api.403.unauthorized`). The page itself renders its first rows
without the API, so it shows the list; a request sent on load, the
search's fetch and the delete callback each answer 401 and open the
"Error" window; `Form.vue::error()` treats a 401 as neither a field
error nor a 403/404, so the notice reads `common.unknownError`. The same
administrator's side-menu counts: *Navigation menus & site chrome* A22.
Live-probed 2026-09-28: q7.

<a id="fn-f-a7"></a>
**f-a7 — A7 evidence.** `Repository::validate()`'s IP regex takes IPv4
forms only; `DAO::insertIPRanges()`, `Collector::filterByIps()` and OJS
`InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()`
convert with `ip2long()`, which has no IPv6 form. The help,
`manager.institutions.form.ipRangesInstructions`, gives IPv4 examples
only. Live-probed 2026-09-28: q8.

<a id="fn-f-a8"></a>
**f-a8 — A8 evidence.** `PKPContextService::delete()` deletes the
context's user groups and genres before
`Repo::institution()->deleteMany()`, which goes through `DAO::delete()`
and its `institutional_subscriptions` query (f-a3); on OMP and OPS that
query fails, so the request dies after the roles are gone and before the
context row. Live-probed 2026-09-28 (q11), OMP and OPS, twice each:
"Remove" › "OK" answered 500 on
`POST index/$$$call$$$/grid/admin/context/context-grid/delete-context?rowId={id}`;
afterwards the press row and its institution remain and its user groups
and genres are gone (the control context with no institution: all gone);
as `admin`, the press's Settings › Users & Roles and Institutions pages
answer the access-denied page, and its public home page opens.
Issue report: [docs/issues/omp-ops-institution-delete-fails.md](../issues/omp-ops-institution-delete-fails.md).

<a id="fn-f-a9"></a>
**f-a9 — A9 evidence.** `institution_ip.ip_string` holds 40 characters
at most (note d) and the IP regex accepts any number of spaces around
"-", so a longer valid line passes validation and fails when stored; the
institution row is already written by then, without ranges. Live-probed
2026-09-28 (q8), three apps, twice each, plus a separate run twice on
each: the 45-character line answered 500 on `POST {context}/api/v1/institutions`
on every "Save"; after two presses and a reload the list read "Long
Library" twice, and "Edit" showed "IP ranges" empty; a 40-character line
answered 200, a 41-character one 500.
Issue report: [docs/issues/institution-long-ip-range-save-error.md](../issues/institution-long-ip-range-save-error.md).

<a id="fn-f-a10"></a>
**f-a10 — A10 evidence.** Note e: the collector sets no order, so the
rows come in the database's order, and a saved row usually moves to the
end on PostgreSQL. Live-probed 2026-09-28: q2.

<a id="fn-f-a11"></a>
**f-a11 — A11 evidence.** ui-library `FormErrors.vue::showNextError()`
emits `showField` for the first key of the refusal's error object (the
screen-reader "Go to …" buttons call the same `showError()` per key);
`Form.vue::showField()` scrolls the last `pkp-modal-scroll-container`
to the field (offset −50) and sets no focus. The error object's order
is the server's, not the boxes': on the three-fault save the "Go to …"
list reads ROR, Name, IP ranges, so the jump's "first flagged box" is
the list's first (ROR there), read from the code; the scroll itself was
not measured. Code read 2026-09-28.
Claim-checked 2026-09-28, three apps, twice each (note d): after
"Jump to next error", and after "Go to IP ranges: Invalid IP range",
the focused element is the pressed button. The persona read (step 7)
could not judge the scenario's former pass sign, "the page scrolls to
'Name'", on a panel whose first box is in view; the step was dropped.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Institutions page: the list and "Search" | `{journal}/management/settings/institutions` | AFFM-137 · ROUTE-017 · ROUTE-042 · ROUTE-063 · ROUTE-078 · VUE-022 |
| "Add Institution" panel | the page above | AFFM-138 · VUE-098 |
| "Edit" and the "Edit Institution" panel | the page above | AFFM-139 · VUE-098 |
| "Delete" and the "Delete Institution" dialog | the page above | AFFM-140 |
| Side-menu entry "Institutions" | every editorial page | ROUTE-017 |
| Institutions API | `api/v1/institutions` (`GET`, `GET {id}`, `POST`, `PUT {id}`, `DELETE {id}`) | API-023 |
| Institution record | — | SET-016 |

## Reference — code anchors

- Page: `lib/pkp/pages/management/ManagementHandler.php` (`authorize`,
  `settings`, `institutions`, `distribution` for `institutionsNavLink`);
  each app's `pages/management/SettingsHandler.php`;
  `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php`;
  `lib/pkp/templates/management/institutions.tpl`.
- Side menu: `lib/pkp/classes/template/PKPTemplateManager.php`
  (`setupBackendPage`); OJS `classes/template/TemplateManager.php`;
  `lib/pkp/classes/context/Context.php` (`isInstitutionStatsEnabled`);
  ui-library `src/components/Container/SettingsPage.vue`.
- List and panel: `lib/pkp/classes/components/listPanels/PKPInstitutionsListPanel.php`;
  `lib/pkp/classes/components/forms/institution/PKPInstitutionForm.php`;
  ui-library `src/components/ListPanel/institutions/InstitutionsListPanel.vue`,
  `InstitutionsEditModal.vue`; `src/components/Form/Form.vue`;
  `src/components/Search/Search.vue`; `src/mixins/fetch.js`,
  `ajaxError.js`.
- API and model: `lib/pkp/api/v1/institutions/PKPInstitutionController.php`;
  `lib/pkp/classes/core/PKPBaseController.php` (`convertStringsToSchema`,
  `roleAuthorizer`); `lib/pkp/classes/middleware/HasRoles.php`;
  `lib/pkp/classes/institution/Institution.php`, `DAO.php`,
  `Collector.php`, `Repository.php`, `maps/Schema.php`;
  `lib/pkp/schemas/institution.json`;
  `lib/pkp/classes/validation/ValidatorFactory.php` (`required`).
- Storage: `lib/pkp/classes/migration/install/InstitutionsMigration.php`;
  each app's `classes/migration/install/MetricsMigration.php`; OJS
  `classes/migration/install/OJSMigration.php`
  (`institutional_subscriptions`).
- Consumers: `lib/pkp/classes/sushi/CounterR5Report.php`;
  `lib/pkp/api/v1/stats/sushi/PKPStatsSushiController.php`;
  `lib/pkp/classes/institution/Collector.php` (`filterByIps`); OJS
  `controllers/grid/subscriptions/InstitutionalSubscriptionForm.php`,
  `SubscriptionsGridCellProvider.php`,
  `classes/subscription/InstitutionalSubscriptionDAO.php`,
  `classes/subscription/form/UserInstitutionalSubscriptionForm.php`;
  `lib/pkp/classes/services/PKPContextService.php` (`delete`).
- Settings: `lib/pkp/classes/components/forms/site/PKPSiteStatisticsForm.php`,
  `lib/pkp/classes/components/forms/context/PKPContextStatisticsForm.php`,
  `PKPPaymentSettingsForm.php`.
- Labels: `lib/pkp/locale/en/manager.po` (`manager.setup.institutions`,
  `manager.institutions.*`), `common.po` (`institution.institutions`,
  `common.name`, `validator.*`, `form.*`), `grid.po`
  (`grid.action.addInstitution`), `api.po`; each app's
  `locale/en/manager.po` (`manager.institutions.noContext`).
