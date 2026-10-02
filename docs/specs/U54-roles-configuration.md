---
name: roles-configuration
status: verified
---

# Roles configuration

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal works with a fixed set of roles, and its managers decide what
each role may do. On Settings › Users & Roles › "Roles" they see every role
of the journal with its permission level and the workflow stages it works
in, tick or untick a role's stages, create a new role, change a role's name
and options (self-registration, recommend-only, metadata editing, the
masthead, access to Settings) and remove a role the journal created. On the
"Site Access Options" tab of the same page they decide whether visitors
must sign in to see the journal or its open access content, and whether
visitors may register. This spec covers those two tabs and what each of
their controls stores; what a stored setting then changes on another
feature's screen is described in that feature's spec, which the Rules
below name.

## Actors & permissions

Who opens Settings › Users & Roles is the Settings gate of
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access):
the journal's **manager-level roles** (the roles whose "Permission level"
on the "Roles" tab reads "Journal Manager", "Press Manager" on a press,
"Manager" on a preprint server: on a journal or press the Journal
Manager, the Editor and the Production Editor; on a preprint server the
Preprint Server Manager) while their role has "Permit changes to
Settings" ticked, and the Site Administrator. Below, "a manager" is any
of them. Every other role gets the access-denied page there. A Site
Administrator who holds no manager-level role in the journal reaches the
page only by typing its address, and the page opens under an "Error"
dialog, "The current role does not have access to this operation.";
[Users management](U53-users-management.md) gives the address, which
differs on a press and a preprint server. The two tabs offer every
manager the same controls; only the last row of the table depends on
which manager-level role is signed in. <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Roles" and "Site Access Options" tabs** | • every manager (above) <sup>a</sup> |
| **Tick or untick a stage in the list** | • every manager, on every box that is not greyed out (Rule 7) <sup>g</sup> |
| **"Create New Role"** | • every manager (Rules 12–15) <sup>k</sup> |
| **"Edit" a role** | • every manager, on every row but the first row of each page of the list, a filtered list included (Rule 5 [A1](#a1)) <sup>f</sup> |
| **"Remove" a role** | • offered to every manager on the same rows as "Edit"; it takes effect only for a role the journal created that nobody holds or has held (Rules 20–21) <sup>q</sup> |
| **Save "Site Access Options"** | • every manager (Rule 23) <sup>t</sup> |
| **Change "Permit changes to Settings" on a role** | • every manager, in the role's window, except on the one role that alone gives the signed-in manager the Settings pages: there the box is ticked and greyed out, yet "OK" in that window unticks it (Rule 18) ⚠ [A11](#a11) <sup>o</sup> |

## Fields & validation

**The "Roles" tab.** A list headed "Current Roles" with "Search" and
"Create New Role" at its top right, and one row per role:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Role Name" | — | The role's name in the language the page is shown in. In French a preprint server's "Preprint Server manager" and "Moderator" rows show as codes, as the "Users" list does ([Users management OPS1](U53-users-management.md#ops1)) <sup>b</sup> <sup>w</sup> |
| "Permission level" | — | "Journal Manager", "Section Editor", "Assistant", "Author", "Reviewer", "Reader", and on a journal "Subscription Manager"; a press reads "Press Manager" and "Series Editor" for the first two, a preprint server "Manager" and "Moderator". In the French interface a preprint server's Moderator row reads "Éditeur-trice de série" (Series Editor) ⚠ [OPS3](#ops3) <sup>b</sup> <sup>w</sup> |
| One column per stage | — | A journal: "Submission", "Review", "Copyediting", "Production". A press: "Submission", "Internal Review", "External Review", "Copyediting", "Production". A preprint server: "Production" alone. One box per row: ticked when the role works in that stage (Rules 6–8). A screen reader announces each box only as "checkbox" ⚠ [A8](#a8). In the French interface a press heads its External Review column "##workflow.review.externalReview##" ⚠ [OMP1](#omp1) <sup>b</sup> <sup>g</sup> <sup>w</sup> |
| The "Settings" arrow at the start of the row | — | Opens a line under the row with "Edit" and "Remove" (Rule 5 [A1](#a1)) <sup>f</sup> |

Under the rows the list reads "{from} - {to} of {total} items" with page
links, and "Items per page:" beside it once there are more roles than
the smallest number it offers (Rule 4). <sup>e</sup>

<a id="default-roles"></a>
**The roles of a new journal**, in the order the list usually shows them,
though it keeps no fixed order ([A13](#a13)), with the stages ticked in
the list and the options ticked in each role's window ("SR" "Allow user self-registration", "MH" "Consider role in
masthead list", "ME" "Permit submission metadata edit.", "PS" "Permit
changes to Settings"; "This role is only allowed to recommend…" is
unticked on every role): <sup>c</sup>

| Role (journal) | Permission level | Stages ticked | Options ticked |
|----------------|------------------|---------------|----------------|
| "Journal manager" | Journal Manager | none, all greyed ([A2](#a2)) | ME, PS, which no screen shows while the row comes first and so has no "Edit" ([A1](#a1)) |
| "Journal editor" | Journal Manager | all four, greyed | MH, ME, PS |
| "Production editor" | Journal Manager | Copyediting, Production, greyed | ME, PS |
| "Section editor" | Section Editor | all four | MH, ME |
| "Guest editor" | Section Editor | all four | none |
| "Copyeditor" | Assistant | Copyediting | none |
| "Designer" | Assistant | Production | none |
| "Funding coordinator" | Assistant | Submission, Review | none |
| "Indexer" | Assistant | Production | none |
| "Layout Editor" | Assistant | Production | none |
| "Marketing and sales coordinator" | Assistant | Copyediting | none |
| "Proofreader" | Assistant | Production | none |
| "Author" | Author | all four | SR |
| "Translator" | Author | all four | none |
| "Reviewer" | Reviewer | Review | SR, MH |
| "Reader" | Reader | none, all greyed | SR |
| "Subscription Manager" | Subscription Manager | none | none |
| "Editorial Board Member" | Assistant | none | MH |

A press lists nineteen roles: "Press manager", "Press editor",
"Production editor" and "Series editor" as the journal's first four
(levels "Press Manager" and "Series Editor"), the seven assistant roles
as on a journal, then "Author", "Volume editor" (Author; every stage;
nothing ticked), "Chapter Author" (Author; Copyediting, Production; SR),
"Translator" (as "Volume editor"), "Internal Reviewer" (Reviewer;
Internal Review; nothing ticked), "External Reviewer" (Reviewer; External
Review; SR, MH), "Reader" and "Editorial Board Member", without "Guest
editor" or "Subscription Manager". A role that works in Submission and
Review on a journal works in "Internal Review" too on a press.
A preprint server lists five: "Preprint Server manager" (Manager;
Production, ticked and greyed; ME, PS), "Moderator" (Moderator;
Production; MH, ME), "Author" (Author; Production; SR, ME), "Reader"
(Reader; greyed; SR) and "Editorial Board Member" (Assistant; none; MH).
As on a journal, the manager row's options ("Press manager", "Preprint
Server manager") show on no screen while that row comes first and so has
no "Edit" ([A1](#a1)). <sup>c</sup>

**The role window** ("Create New Role", or a row's "Edit"), top to bottom
under the heading "Role details":

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Permission level" | yes | A list of the levels of the "Roles" tab's column. "Create New Role" opens on "Journal Manager" ("Press Manager", "Manager"). On "Edit" it is greyed out and cannot change (Rule 14). A preprint server also offers "Reviewer" ⚠ [OPS2](#ops2) <sup>k</sup> <sup>p</sup> |
| "Role Name" | yes | One box per form language (Settings bullet 2). Empty: refused (Rule 15) <sup>l</sup> |
| "Abbreviation" | yes | As "Role Name". Only the role's own window shows it ⚠ [A7](#a7) <sup>l</sup> |
| "Stage Assignment" | no | One box per stage of the app, named as the list's columns; shown only for the levels of the table below. A role may be saved with no stage ticked (Rule 15) <sup>k</sup> |
| "Role Options": "Allow user self-registration", "This role is only allowed to recommend a review decision and will require an authorised editor to record a final decision.", "Permit submission metadata edit.", "Consider role in masthead list", "Permit changes to Settings" | no | Which boxes can be changed depends on the level (table below); what each stores: Rule 22 <sup>k</sup> |

Under the fields: "Required fields are marked with an asterisk: *", then
"Cancel" and "OK". <sup>k</sup>

<a id="level-boxes"></a>
**What the "Permission level" leaves open.** Choosing a level redraws the
window at once: a box the level does not allow is greyed out, keeping
any tick it had (Rule 13), and "Stage Assignment" is hidden where the
level allows no stage ⚠ [A12](#a12). <sup>k</sup>

| Permission level | "Stage Assignment" | Self-registration | Recommend-only | Metadata edit | Settings |
|------------------|--------------------|-------------------|----------------|---------------|----------|
| Journal Manager | hidden | greyed | open | ticked and greyed | open (Rule 18) |
| Section Editor | every stage open | greyed | open | open | greyed |
| Assistant | every stage open | greyed | greyed | open | greyed |
| Author | every stage open | open | greyed | open | greyed |
| Reviewer | only the review stage open (a press: "Internal Review" and "External Review"); the section is hidden on a preprint server | open | greyed | open | greyed |
| Reader | hidden | open | greyed | open | greyed |
| Subscription Manager {OJS} | every stage open | greyed | greyed | open | greyed |

"Consider role in masthead list" is open on every level. <sup>k</sup>

**The "Site Access Options" tab.** One form with "Save" at its foot: <sup>t</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Site Access": "Users must be registered and log in to view the journal site." ("…the press site.", "…the server site.") | no | Unticked on a new journal (Rule 24) <sup>t</sup> |
| "View Article Content" ("View Monograph Content", "View Preprint Content"): "Users must be registered and log in to view open access content." | no | Unticked on a new journal (Rules 23–24 [OPS1](#ops1)) <sup>t</sup> |
| "User Registration": "Visitors can register a user account with the journal." or "The Journal Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers." | one of the two | The first is chosen on a new journal. A press reads "…with the press." and "The Press Manager will register all user accounts. Editors or Section Editors may register user accounts for reviewers."; a preprint server "…with the server." and "The Server Manager will register all user accounts." (Rule 24) <sup>t</sup> |

## Rules & state

**The "Roles" list**

1. **Where it lives.** Settings › Users & Roles opens the page headed
   "Users & Roles"; its "Roles" tab holds the list of Fields. The page's
   other tabs are described in
   [Users management](U53-users-management.md) (Rule 1). A change typed
   on the "Site Access Options" tab and not saved stays while the manager
   switches to "Roles" and back, and is gone without a warning once the
   page is left, as on every Settings page. <sup>a</sup>
2. **What is listed.** Every role of this journal, whatever its level,
   and nothing from other journals, in no fixed order ⚠ [A13](#a13). A
   new journal usually lists its roles in the order of [the roles
   table](#default-roles), but its rows can come in another order. A role
   made with "Create New Role" is usually listed at the end, but it can
   be listed first; how often depends on the installation, from rarely to
   every time, and nothing the manager does changes it. A role
   whose window is saved with "OK" usually moves down the list: on a
   journal or a press to the end, on a preprint server below the roles the
   server was created with and above any created role. <sup>b</sup>
3. **Filters.**
   - 3a. "Search" at the top of the list shows two lists above the rows,
     and a second press hides them. "List roles assigned to" offers "All
     Workflow Stages" and each stage of the app; "With permission level
     set to" offers "All Permission Levels" and every level but "Reader".
     On a preprint server the level list also offers "Reviewer", which
     leaves the list empty ("0 items") [OPS2](#ops2). Choosing an entry in
     either redraws the list at once, with no button: a stage keeps the
     roles whose box in that stage's column is ticked, a level the roles
     of that level. <sup>d</sup>
   - 3b. Once an entry is chosen, the two lists hide again behind
     "Search". The list stays filtered, and only its count line shows it
     ("1 - 9 of 9 items" for "Assistant" on a journal), also after
     switching to another tab and back ⚠ [A9](#a9). A reload of the page
     clears the filter. <sup>d</sup>
4. **Paging.** The list starts with as many rows as the journal's "Items
   per page" (Settings bullet 1), 25 on a new journal, so a new journal's
   roles fit on one page. "Items per page:" offers "10", "25", "50", "75"
   and "100", plus the journal's own "Items per page" when it is none of
   these (with the journal's set to 5: "5", "10", "25", "50", "75",
   "100"). It shows once the
   list holds more roles than the smallest of those numbers, so a new
   preprint server's five roles show no "Items per page:". Choosing "10"
   shows ten rows, with page links to the others; a reload of the page
   returns the list to the journal's "Items per page". Since the list
   keeps no fixed order, the second page need not hold the roles the first
   left out: a role can show on both pages and another on neither
   ([A13](#a13)). <sup>e</sup>
5. **Row actions.** Each row's "Settings" arrow opens a line under it
   with "Edit" and "Remove". The first row of each page has no arrow and
   so neither action: on a new journal that is normally the manager
   role's row ([A13](#a13)); on a second page, or with a filter chosen,
   it is whichever role comes first there ⚠ [A1](#a1). <sup>f</sup>

**Stages in the list**

6. **A box per stage.** A ticked box means the role works in that stage.
   Which stages a role works in decides, on the other features' screens,
   which stages its members open and which stages offer the role (Rule
   22). <sup>g</sup>
7. **Greyed boxes.** Every box of a row whose level is Journal Manager
   and of the "Reader" row is greyed out; on the reviewer rows only the
   review column (a press: "Internal Review" and "External Review") can
   be pressed. A preprint server has no review column, so a role given
   the "Reviewer" level there ([OPS2](#ops2)) has its one box greyed out
   and unticked. Every other box can be pressed, the "Subscription
   Manager" row's included. <sup>g</sup>
8. **Pressing a box saves at once.** A notice at the top right reads
   "{role} role assigned to {stage} stage." ("Copyeditor role assigned to
   Production stage.") for an unticked box, or "{role} role unassigned
   from {stage} stage." for a ticked one. The box itself keeps its old
   look until the page is reloaded; switching to another tab and back
   does not change it ⚠ [A5](#a5). Nothing else asks or confirms.
   <sup>g</sup>
9. **A role's last stage.** In the list, the one ticked box of a role can
   be unticked like any other, leaving the role with no stage. In the
   role's window the same change answers "Your changes have been saved."
   and leaves the stage ticked, which the *Copyediting stage* spec records
   as its [A10](U32-copyediting-stage.md#a10). <sup>h</sup>
10. **A box pressed twice.** After a press the box keeps its old look,
    and a second press on it without reloading the page repeats the
    first change instead of reversing it: after a tick the second press
    fails, after an untick it reports the untick again ([A5](#a5)).
    <sup>i</sup>
11. **The manager-level rows.** The boxes of a Journal Manager-level
    row cannot be pressed (Rule 7); only a save of the role's window
    changes its stages (Rule 16). The manager role's members open every
    stage, yet its row shows every box empty on a journal and a press and
    its one box ticked on a preprint server. On a journal and a press a
    stage chosen under "List roles assigned to" leaves it out, and no
    stage's "Assign" offers it
    ([Stage participants](U35-stage-participants.md)) ⚠ [A2](#a2). The
    other manager-level rows ("Journal editor", "Production editor", a
    role created at that level) show their stages ticked. <sup>j</sup>

**The role window**

12. **"Create New Role".** It opens the window of Fields with "Permission
    level" on its first entry, the name boxes empty and every box
    unticked but "Permit submission metadata edit.", ticked and greyed
    out as the first level requires ([what the level leaves open](#level-boxes)).
    <sup>k</sup>
13. **The level decides the boxes.** Choosing another level redraws the
    boxes as [the table](#level-boxes) says, at once and before anything
    is saved. A box the new level greys out keeps the tick it had, but
    "OK" stores it unticked. "Permit submission metadata edit." keeps its
    state through every change of level except a change to "Journal
    Manager", which ticks it. A new role therefore reaches any other
    level with that box ticked, and is saved with it unless it is
    unticked. <sup>k</sup>
14. **"Edit".** A row's "Edit" opens the same window headed "Edit", filled
    with the role's name, abbreviation, stages and options, the
    "Permission level" greyed out: a role keeps its level for good.
    <sup>p</sup>
15. **Saving.**
    - 15a. "OK" with "Role Name" and "Abbreviation" filled closes the
      window; the list is redrawn with the new or changed row and a
      notice at the top right reads "Your changes have been saved.". An
      empty "Role Name" or "Abbreviation" in the journal's primary
      language keeps the window open with "This field is required." under
      the box. No stage needs to be ticked: a new role saved with none
      shows every box of its row unticked. <sup>l</sup>
    - 15b. A "Role Name" or "Abbreviation" of spaces only gets no "This
      field is required.". "OK" then keeps the window open with a notice
      at its top reading "Errors occurred processing this
      form", "You need to define a role name. (English)" and "You need to
      define a role abbreviature. (English)" ⚠ [A10](#a10). <sup>l</sup>
16. **Saving a manager-level role ticks every stage.** "OK" in the
    window of a role of the Journal Manager level stores every stage for
    it, whatever it worked in before, although the window offers no
    stage box to tick: after any save of the "Production editor" window
    (a changed name, a ticked option, or nothing changed), its row reads
    every stage ticked instead of Copyediting and Production alone ⚠
    [A3](#a3). <sup>m</sup>
17. **Closing the window.** "Cancel" closes the window and discards what
    was typed, without asking, even after a change. The window's "Close"
    (×) after a change asks "The data on this form has changed. Do you
    wish to continue without saving?", and leaving the page with the
    window changed brings the browser's "Leave site?" question. <sup>n</sup>
18. **The Settings box of a manager's only Settings role.** In the window
    of a role that is the only role giving the signed-in manager the
    Settings pages (the only role they hold with "Permit changes to
    Settings" ticked), that box is ticked and greyed out: an Editor whose
    only manager-level role is "Journal editor" cannot untick it there.
    The box stays open for every other manager-level role, and for a
    manager who holds a second such role. Yet "OK" in that window stores
    the box unticked ⚠ [A11](#a11). <sup>o</sup>
19. **Metadata permission reaches existing assignments.** Changing
    "Permit submission metadata edit." on a role changes the permission of
    every assignment already made in that role, on every submission of the
    journal (the assignments are *Stage participants*'). <sup>v</sup>

**Removing a role**

20. **The confirmation.** "Remove" opens a window headed "Confirm" reading
    "You are about to remove this role from this context. This operation
    will also delete related settings and all the users assignments to
    this role. Do you want to continue?", with "OK" and "Cancel". "Cancel"
    closes it and nothing changes ⚠ [A4](#a4). <sup>q</sup>
21. **What "OK" does.** The outcome is a notice at the top right, in this
    order of precedence: <sup>q</sup>
    - a role held by anyone, now or in the past: "Can't remove {role}
      role. Currently {n} user(s) is/are assigned to it.", where {n}
      counts every member the role has had; the role stays ⚠ [A6](#a6);
    - a role the journal was created with (every role of [the roles
      table](#default-roles)): "The role {role} is a default one and
      can't be removed."; the role stays;
    - a role created with "Create New Role" that nobody has held: "{role}
      role removed.", and the role is gone from every screen that offered
      it; the list itself keeps its row, whose boxes and "Remove" then
      fail, until the page is reloaded ([A5](#a5)). <sup>q</sup>

**What the role settings change elsewhere**

22. **Each control's effect lives with its screen.** The list and the
    window store the settings below; the screen where each takes effect
    is its feature's: <sup>r</sup>

    | Control | Where it takes effect |
    |---------|-----------------------|
    | The stage boxes ("Stage Assignment" and the list's columns) | Which stages the role's members open ([stage gate](U24-workflow-screen-and-stage-access.md#stage-gate)); which stages offer the role in "Assign" and list its assignments ([Stage participants](U35-stage-participants.md)); which roles a section's "Editorial Assignments" offers ([Sections](U17-sections.md)); which roles a task template's "Limit access to specific roles" offers on a stage ([Tasks & discussions](U37-tasks-and-discussions.md)); which files and library files the members see ([Submission files](U36-submission-files.md), [Submission & publisher libraries](U39-submission-and-publisher-libraries.md)) |
    | "Allow user self-registration" | Which roles a profile's Roles tab offers ([User profile](U03-user-profile.md)); on the Register pages, a Reviewer-level role with the box ticked is offered as "Yes, request the {role} role." on a journal and a press (a preprint server: [OPS2](#ops2)), and an Author-level one is not ([Registration & account validation](U02-registration-and-account-validation.md)); whether a new user may become an Author by submitting ([Submission wizard](U21-submission-wizard.md)) |
    | "This role is only allowed to recommend a review decision and will require an authorised editor to record a final decision." | Whether "Assign" starts with "Assignment privileges" ticked for the role ([Stage participants](U35-stage-participants.md)) |
    | "Permit submission metadata edit." | Whether "Assign" starts with "Permissions" ticked for the role, and every existing assignment's permission (Rule 19; [Stage participants](U35-stage-participants.md)) |
    | "Consider role in masthead list" | Whether the role and its members appear on "Editorial Masthead" and "Editorial History" ([Journal identity & about pages](U07-journal-identity-and-about-pages.md)), and in the "Editorial Masthead" order list ([Appearance & theming](U10-appearance-and-theming.md)) |
    | "Permit changes to Settings" | Whether the role's members open the Settings pages ([who opens Settings](U07-journal-identity-and-about-pages.md#settings-access)) |
    | "Role Name" | The name every screen gives the role: the "Users" list's "Roles" column ([Users management](U53-users-management.md)), the role list of "Invite to a role" ([User invitations](U06-user-invitations.md)), the masthead headings, the Register pages (Side effects) |

**Site Access Options**

23. **Saving the tab.** "Save" stores the three fields of the tab together
    and shows "Saved" beside the button; the stored values are what the
    tab shows when it is opened again, and each takes effect from the next
    page a visitor opens. A preprint server does not keep "Users must be
    registered and log in to view open access content.": ticked and saved,
    it reads "Saved", and the tab opened again shows it unticked ⚠
    [OPS1](#ops1). <sup>t</sup>
24. **What each option changes.** <sup>t</sup>
    - "Users must be registered and log in to view the journal site."
      ticked: a signed-out visitor who opens the journal's home page, an
      About page or an article's page is sent to the Login page; Login and
      Register stay open ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
      Rule 22; [Registration & account validation](U02-registration-and-account-validation.md),
      Rule 3).
    - "Users must be registered and log in to view open access content."
      ticked: on a journal, a signed-out visitor who opens a galley is sent
      to the Login page, while article pages stay open (*Subscriptions &
      open access control*); on a press, a signed-out visitor who opens a
      free publication format's file from the book page is sent to the
      Login page; on a preprint server nothing changes ([OPS1](#ops1)).
    - "The Journal Manager will register all user accounts…" chosen: the
      "Register" links leave the journal's header and its Login page
      ([Login & sessions](U01-login-and-sessions.md)), and the Register
      page, opened by its address, shows no form and reads "This journal
      is currently not accepting user registrations." ("This press is
      currently not accepting user registrations.", "This server is
      currently not accepting user registrations.") with a "Login" link
      ([Registration & account validation](U02-registration-and-account-validation.md),
      Rule 2). "Visitors can register a user account with the journal."
      brings the links and the form back.

## Side effects

- **A created role is offered at once** wherever the journal's roles are
  listed: the role list of "Invite to a role" ([User invitations](U06-user-invitations.md))
  and, for the stages ticked, the stage screens of Rule 22. A removed role
  leaves them. <sup>u</sup>
- **A renamed role** carries its new name on every screen that names it,
  the "Users" list's "Roles" column included. On the "Users" tab of the
  same page the new name shows only once the page is reloaded ⚠
  [A14](#a14). <sup>u</sup>
- **A stage change applies to the role's existing members** at once, on
  every submission, from the next time they open a stage; nothing is sent
  to them. <sup>g</sup>
- **"Permit submission metadata edit."** rewrites every existing
  assignment in the role (Rule 19). <sup>v</sup>
- **No email, notification or log line** a user can read follows any
  control of the two tabs; the notices of Rules 8, 15 and 21 and "Saved"
  are the only answer. The installation's audit log records them when it
  is switched on (Settings bullet 3). <sup>u</sup>

## Settings that modify behavior

1. **"Items per page"** (Settings › Website › "Setup" › "Lists"; 25). The
   number of rows the "Roles" list starts with before it pages (Rule 4).
   *Appearance & theming* owns the field. <sup>e</sup>
2. **"Forms"** (Settings › Website › "Setup" › "Languages"; the primary
   language alone). Each language ticked there gives "Role Name" and
   "Abbreviation" a box in that language; only the primary language's
   boxes are required (Rule 15). *Languages & locales* owns the column.
   <sup>l</sup>
3. **The security audit log switch** (the installation's configuration
   file; off by default). On: each role created, changed or removed and
   each stage ticked or unticked is written to the server's log with the
   manager who did it. No screen shows the log. <sup>u</sup>

## Cross-feature interactions

- **[Users management](U53-users-management.md)**: the Users & Roles page
  and its "Users" tab; the "Roles" column that names each member's roles.
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  who opens the Settings pages; what "Permit changes to Settings",
  "Consider role in masthead list" and "Users must be registered and log
  in to view the journal site." change on the Settings and About pages.
- **[Registration & account validation](U02-registration-and-account-validation.md)**,
  **[User profile](U03-user-profile.md)**, **[Submission wizard](U21-submission-wizard.md)**:
  what "User Registration" and "Allow user self-registration" change.
- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-gate)**,
  **[Stage participants](U35-stage-participants.md)**,
  **[Sections](U17-sections.md)**, **[Tasks & discussions](U37-tasks-and-discussions.md)**,
  **[Submission files](U36-submission-files.md)**,
  **[Submission & publisher libraries](U39-submission-and-publisher-libraries.md)**:
  what a role's stages and its recommend-only and metadata options change
  (Rule 22).
- **[Copyediting stage](U32-copyediting-stage.md#a10)**: the finding on a
  role's last stage in the window (Rule 9).
- **[User invitations](U06-user-invitations.md)**: the roles offered in
  "Invite to a role" and the per-member masthead choice.
- **[Appearance & theming](U10-appearance-and-theming.md)**: the
  "Editorial Masthead" order list of the masthead roles, and "Items per
  page".
- **[Article landing page & reading](U13-article-landing-page-and-reading.md)**,
  **[Custom pages & blocks](U09-custom-pages-and-blocks.md)**,
  **[JATS & body text](U48-jats-and-body-text.md)**,
  **[Issues](U50-issues.md)**, **[Subscriptions & open access control](U51-subscriptions.md)**,
  and [Monograph landing page](U69-monograph-landing-page.md): what the two sign-in boxes
  of "Site Access Options" change on the reader's pages.
- **[ORCID integration](U04-orcid-integration.md)** and
  **[Notify users (bulk email)](U55-notify-users.md)**: the page's "ORCID" tab and, while the Site
  Administrator allows the journal bulk email (Administration › Site
  Settings › "Bulk Emails"), its "Notify" tab.

## Canonical scenarios

Every scenario runs on a scratch journal of its own with throwaway
accounts, signed in as a throwaway Journal Manager unless it names
another role, with any other account or a signed-out visitor in a second
browser; the accounts, the passwords and the tooling recipe are in the
footnote. <sup>s</sup>

1. **The "Roles" list of a new journal**

   Given: Journal Manager, on a scratch journal with the roles it was
   created with.

   - **The list**: open Settings › Users & Roles: the page is headed
     "Users & Roles". Open its "Roles" tab: a list headed "Current Roles"
     with "Search" and "Create New Role" at its top right, and the columns
     "Role Name", "Permission level", "Submission", "Review",
     "Copyediting" and "Production" (a press: "Submission", "Internal
     Review", "External Review", "Copyediting", "Production"; a preprint
     server: "Production" alone) (Rule 1; Fields, the "Roles" tab).
   - **The rows**: the rows are the roles of [the roles
     table](#default-roles), each with its permission level and, but for
     the manager role's row [A2](#a2), its stages ticked as the table
     gives them; a press lists its nineteen roles and a preprint server its
     five, as the paragraph under the table gives them. The rows may come
     in any order [A13](#a13). Under the rows the line
     reads "1 - 18 of 18 items" (a press "1 - 19 of 19 items", a preprint
     server "1 - 5 of 5 items") (Rules 2, 4).
   - **Greyed boxes**: every box of the "Journal manager", "Journal
     editor", "Production editor" and "Reader" rows is greyed out (a
     press: "Press manager", "Press editor", "Production editor" and
     "Reader"; a preprint server: "Preprint Server manager" and "Reader").
     On the "Reviewer" row only the "Review" box is open (a press: on
     "Internal Reviewer" and "External Reviewer" only the "Internal
     Review" and "External Review" boxes). Every other box is open, all
     four of the "Subscription Manager" row's included {OJS} (Rule 7).
   - **A level filter**: press "Search": the lists "List roles assigned
     to" and "With permission level set to" show above the rows. Choose
     "Author" under "With permission level set to": at once, with no
     button, the list holds only "Author" and "Translator" and its line
     reads "1 - 2 of 2 items" (a press: "Author", "Volume editor",
     "Chapter Author" and "Translator", "1 - 4 of 4 items"; a preprint
     server: "Author" alone, "1 - 1 of 1 items") ⚠ [A9](#a9) (Rules 3a,
     3b).
   - **The filter cleared**: reload the page and open the "Roles" tab: all
     the roles are listed again, "1 - 18 of 18 items" (a press "1 - 19 of
     19 items", a preprint server "1 - 5 of 5 items") (Rule 3b).
   - **Ten per page** {OJS OMP}: beside the line, "Items per page:" offers
     "10", "25", "50", "75" and "100". Choose "10": the list shows ten
     rows, "1 - 10 of 18 items" (a press "1 - 10 of 19 items"), with page
     links. Press the link to the second page: it shows eight rows, "11 -
     18 of 18 items" (a press nine rows, "11 - 19 of 19 items"); which
     roles each page holds is not fixed [A13](#a13). Reload
     the page: the list is back to every row on one page, "1 - 18 of 18
     items" (Rule 4).
   - **No "Items per page:"** {OPS}: a preprint server's five roles show
     no "Items per page:" beside the line (Rule 4).
   - **Control**: press the greyed "Production" box of the "Reader" row:
     it does not tick, and after a reload it is still unticked (Rule 7).
     <sup>s</sup>

2. **Give a role a stage, then take it away**

   Given: Journal Manager, on a scratch journal with the roles it was
   created with, "Editorial Board Member" working in no stage.

   - **The box ticked**: on Settings › Users & Roles › "Roles" press the
     "Production" box of the "Editorial Board Member" row: a notice at the
     top right reads "Editorial Board Member role assigned to Production
     stage.", and nothing asks or confirms ⚠ [A5](#a5). Reload the page
     and open the "Roles" tab: the box is ticked (Rule 8).
   - **The stage filter**: press "Search" and choose "Production" under
     "List roles assigned to": "Editorial Board Member" is among the rows
     (Rule 3a).
   - **The task template window**: open Settings › Workflow, its "Tasks
     and Discussions" tab, press "Add template" on "Production Stage" and
     choose "Limit access to specific roles", as [Tasks &
     discussions](U37-tasks-and-discussions.md) scenario 8 does: among the
     role boxes is "Editorial Board Member" (Rules 6, 22).
   - **The box unticked, the role's last stage**: reload the page, open
     Settings › Users & Roles › "Roles" and press the ticked "Production"
     box of "Editorial Board Member": the notice reads "Editorial Board
     Member role unassigned from Production stage." [A5](#a5). Reload the
     page and open the "Roles" tab: every box of the row is unticked, the
     role working in no stage (Rules 8, 9).
   - **The stage filter again**: press "Search" and choose "Production"
     under "List roles assigned to": "Editorial Board Member" is not among
     the rows (Rule 3a).
   - **Control**: on Settings › Workflow › "Tasks and Discussions", "Add
     template" on "Production Stage" with "Limit access to specific roles"
     chosen offers no "Editorial Board Member" box (Rules 6, 22).
     <sup>s</sup>

3. **Create a role**

   Given: Journal Manager, on a scratch journal with the roles it was
   created with.

   - **The window as it opens**: on Settings › Users & Roles › "Roles"
     press "Create New Role": a window opens under the heading "Role
     details", with "Permission level" on "Journal Manager" ("Press
     Manager" on a press, "Manager" on a preprint server), "Role Name" and
     "Abbreviation" empty, and under "Role Options" every box unticked but
     "Permit submission metadata edit.", which is ticked and greyed out.
     "Allow user self-registration" is greyed out, "This role is only
     allowed to recommend a review decision and will require an
     authorised editor to record a final decision." and "Permit changes to
     Settings" are open. Under the fields: "Required fields are marked
     with an asterisk: *", then "Cancel" and "OK" (Rule 12; Fields, the
     role window).
   - **"Section Editor"**: choose it in "Permission level" ("Series
     Editor" on a press, "Moderator" on a preprint server): at once, with
     nothing saved, "Stage Assignment" shows one open box per stage, named
     as the list's columns; "Allow user self-registration" and "Permit
     changes to Settings" are greyed out; the recommend-only box is open;
     "Permit submission metadata edit." is open and still ticked (Rule 13;
     [what the level leaves open](#level-boxes)).
   - **"Assistant"**: choose it: every stage box open; the
     self-registration, recommend-only and Settings boxes greyed out; the
     metadata box open (Rule 13).
   - **"Author"**: choose it: every stage box open; "Allow user
     self-registration" open; the recommend-only and Settings boxes greyed
     out; the metadata box open (Rule 13).
   - **"Reader"**: choose it: "Stage Assignment" is hidden; "Allow user
     self-registration" open; the recommend-only and Settings boxes greyed
     out; the metadata box open (Rule 13).
   - **"Reviewer"** {OJS OMP}: choose it: under "Stage Assignment" only
     the "Review" box is open ("Internal Review" and "External Review" on
     a press); "Allow user self-registration" open; the recommend-only
     and Settings boxes greyed out; the metadata box open (Rule 13).
   - **"Subscription Manager"** {OJS}: choose it: every stage box open;
     the self-registration, recommend-only and Settings boxes greyed out;
     the metadata box open (Rule 13).
   - **"Consider role in masthead list"**: it was open at every level
     chosen (Fields, the role window).
   - **A tick the level greys out**: choose "Author", tick "Allow user
     self-registration", then choose "Assistant": the box is greyed out
     and keeps its tick (Rule 13).
   - **The name refused**: type DE in "Abbreviation", leave "Role Name"
     empty and press "OK": the window stays open with "This field is
     required." under "Role Name" (Rule 15a).
   - **The abbreviation refused**: type Data editor in "Role Name", empty
     "Abbreviation" and press "OK": "This field is required." under
     "Abbreviation" (Rule 15a).
   - **Saved**: type DE in "Abbreviation", tick "Copyediting" under "Stage
     Assignment" ("Production" on a preprint server) and press "OK": the
     window closes, a notice at the top right reads "Your changes have
     been saved.", and the list holds a "Data editor" row reading
     "Assistant" with only its "Copyediting" box ticked ("Production" on a
     preprint server) (Rule 15a).
   - **"Invite to a role"**: open the "Users" tab, press "Invite to a
     role" and walk to "Enter details" with an address no account uses,
     as [User invitations](U06-user-invitations.md) scenario 1 does: a
     role row's list offers "Data editor" (Side effects).
   - **Its "Edit"**: back on the "Roles" tab, press the "Settings" arrow
     at the start of the "Data editor" row, then "Edit": the window headed
     "Edit" holds "Data editor", DE and "Copyediting" ticked ("Production"
     on a preprint server); "Permit submission metadata edit." is ticked
     and "Allow user self-registration" unticked, "OK" having stored the
     greyed box unticked; "Permission level" reads "Assistant" and is
     greyed out, so it cannot change (Rules 13, 14). Press "Cancel": the
     window closes (Rule 17).
   - **Control**: press "Create New Role" again: the window opens on
     "Journal Manager" with "Role Name" and "Abbreviation" empty, keeping
     nothing of "Data editor" (Rule 12). Press "Cancel". <sup>s</sup>

4. **Rename a role**

   Given: Journal Manager, on a scratch journal with Quinn Ashdown, who
   holds the "Editorial Board Member" role.

   - **Its "Edit"**: on Settings › Users & Roles › "Roles" press the
     "Settings" arrow of the "Editorial Board Member" row, then "Edit":
     the window headed "Edit" holds "Editorial Board Member" in "Role
     Name", no stage ticked and "Consider role in masthead list" ticked,
     with "Permission level" reading "Assistant" and greyed out (Rule 14;
     [the roles table](#default-roles)).
   - **Renamed**: replace "Role Name" with Advisory Board and press "OK":
     the window closes, the notice "Your changes have been saved." shows,
     and the list holds an "Advisory Board" row and no "Editorial Board
     Member" row (Rule 15a).
   - **The "Users" list**: reload the page and open the "Users" tab:
     Quinn Ashdown's row reads "Advisory Board" under "Roles" [A14](#a14)
     (Side effects; Rule 22).
   - **Control**: press "Invite to a role" and walk to "Enter details" as
     in scenario 3: a role row's list offers "Advisory Board" and no
     "Editorial Board Member" (Rule 22). <sup>s</sup>

5. **The Settings box of a manager's only Settings role**

   Given: Journal Manager, on a scratch journal with a role "Managing
   editor" made with "Create New Role" at the "Journal Manager" level and
   its "Role Options" left as the window opens, whose only member is Kai
   Moreno, and, on a journal or a press, Lena Ortiz, whose only role is
   "Journal editor" ("Press editor").

   - **"Managing editor" for the Journal Manager**: on Settings › Users &
     Roles › "Roles" press the "Settings" arrow of the "Managing editor"
     row, then "Edit": the window headed "Edit" reads "Journal Manager"
     ("Press Manager", "Manager") in "Permission level", greyed out, and
     "Permit changes to Settings" is unticked and open, the role not
     being the Journal Manager's own. Tick it and press "OK": the notice
     "Your changes have been saved." shows (Rules 12, 14, 15a, 18).
   - **Kai, in the second browser**: Kai signs in and opens Settings ›
     Users & Roles: the page opens (Actors paragraph). On its "Roles" tab
     Kai opens "Managing editor"'s "Edit": "Permit changes to Settings" is
     ticked and greyed out (Rule 18). Kai presses "Cancel", since "OK"
     there would store the box unticked ⚠ [A11](#a11).
   - **Lena, the Editor** {OJS OMP}: Lena signs in and opens Settings ›
     Users & Roles › "Roles". In "Journal editor"'s ("Press editor"'s)
     "Edit", "Permit changes to Settings" is ticked and greyed out; she
     presses "Cancel". In "Production editor"'s "Edit" the box is ticked
     and open, that role not being hers; she presses "Cancel" (Rule 18;
     [the roles table](#default-roles)).
   - **Control**: the Journal Manager opens "Managing editor"'s "Edit"
     again: "Permit changes to Settings" is ticked and open (Rule 18).
     Press "Cancel". <sup>s</sup>

6. **Remove a role**

   Given: Journal Manager, on a scratch journal with three roles made with
   "Create New Role" at the "Assistant" level: "Spare desk", which nobody
   has held; "Data curator", which Quinn Ashdown holds; and "Archive
   desk", whose only member, Nova Reyes, no longer holds it.

   - **The confirmation**: on Settings › Users & Roles › "Roles" press the
     "Settings" arrow of the "Spare desk" row, then "Remove": a window
     headed "Confirm" reads "You are about to remove this role from this
     context. This operation will also delete related settings and all the
     users assignments to this role. Do you want to continue?", with "OK"
     and "Cancel" ⚠ [A4](#a4) (Rule 20).
   - **Removed**: press "OK": a notice at the top right reads "Spare desk
     role removed." (Rule 21). Reload the page and open the "Roles" tab:
     the list has no "Spare desk" row [A5](#a5).
   - **"Invite to a role"**: open the "Users" tab, press "Invite to a
     role" and walk to "Enter details" with an address no account uses, as
     [User invitations](U06-user-invitations.md) scenario 1 does: a role
     row's list offers "Data curator" and no "Spare desk" (Side effects).
   - **A role someone holds**: on the "Roles" tab, "Remove" on the "Data
     curator" row, then "OK": the notice reads "Can't remove Data curator
     role. Currently 1 user(s) is/are assigned to it." (Rule 21).
   - **A role whose member has left it**: "Remove" on "Archive desk", then
     "OK": the notice reads "Can't remove Archive desk role. Currently 1
     user(s) is/are assigned to it.", counting Nova ⚠ [A6](#a6) (Rule 21).
   - **A role the journal was created with**: "Remove" on "Editorial Board
     Member", which nobody holds, then "OK": the notice reads "The role
     Editorial Board Member is a default one and can't be removed." (Rule
     21).
   - **Control**: reload the page and open the "Roles" tab: "Data
     curator", "Archive desk" and "Editorial Board Member" are still
     listed (Rule 21). <sup>s</sup>

7. **Require sign-in, then close registration**

   Given: Journal Manager, on a scratch journal, and a signed-out visitor
   on the journal's home page.

   - **The tab**: open Settings › Users & Roles, its "Site Access Options"
     tab: under "Site Access", "Users must be registered and log in to
     view the journal site." ("…the press site.", "…the server site.") is
     unticked; under "View Article Content" ("View Monograph Content",
     "View Preprint Content"), "Users must be registered and log in to
     view open access content." is unticked; under "User Registration",
     "Visitors can register a user account with the journal." ("…with the
     press.", "…with the server.") is chosen; "Save" is at the foot
     (Fields, the "Site Access Options" tab).
   - **Sign-in required**: tick "Users must be registered and log in to
     view the journal site." and press "Save": "Saved" shows beside the
     button (Rule 23).
   - **The visitor**: reloads the home page: the Login page shows. On it,
     "Register" opens the Register page with its form; the visitor notes
     its address (Rule 24).
   - **Registration closed**: untick "Users must be registered and log in
     to view the journal site.", choose "The Journal Manager
     will register all user accounts. Editors or Section Editors may
     register user accounts for reviewers." ("The Press Manager will
     register all user accounts. Editors or Section Editors may register
     user accounts for reviewers.", "The Server Manager will register all
     user accounts.") and press "Save": "Saved" (Rule 23).
   - **The visitor**: reloads the home page: it opens, its header with no
     "Register" link; the Login page, opened from the header, has none
     either. The Register page,
     opened at the noted address, shows no form and reads "This journal is
     currently not accepting user registrations." ("This press is
     currently not accepting user registrations.", "This server is
     currently not accepting user registrations.") with a "Login" link
     (Rule 24).
   - **Registration reopened**: the Journal Manager chooses "Visitors can
     register a user account with the journal." and presses "Save". The
     visitor reloads the home page: the header's "Register" link is back,
     and it opens the Register page with its form (Rule 24).
   - **Control**: the Journal Manager reloads the page and opens "Site
     Access Options": both boxes are unticked and "Visitors can register a
     user account with the journal." is chosen, the values saved last
     (Rule 23). <sup>s</sup>

App-specific:

8. **{OMP} Sign-in for a press's open access files**

   Given: Press Manager, on a scratch press with the published monograph
   "Tidal Patterns", whose publication format "PDF" carries a free file,
   and a signed-out visitor on its book page.

   - **The box ticked**: open Settings › Users & Roles, its "Site Access
     Options" tab, tick "Users must be registered and log in to view open
     access content." under "View Monograph Content" and press "Save":
     "Saved" shows beside the button (Rule 23).
   - **The visitor**: reloads the book page and presses "PDF": the Login
     page shows (Rule 24).
   - **Control**: the book page itself opened for the visitor with the
     box ticked; only the format's file asks for a sign-in (Rule 24).
     <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A1 and A5 (issue report
    `docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md`):
    every row of the "Roles" list, the first included, offering "Edit"
    and "Remove", and a pressed stage box showing its new state without
    a reload
  - the guard for A3 (issue report
    `docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md`):
    "OK" in the "Production editor" window with nothing changed, then
    its row still reading Copyediting and Production only
- **Nothing new to test**:
  - "Cancel" in the role window after a change, and the questions its
    "Close" (×) and leaving the page ask (Rule 17)
  - "Cancel" in the "Confirm" window of "Remove" (Rule 20)
  - a second language ticked under "Forms", giving "Role Name" and
    "Abbreviation" a box per language (Settings bullet 2)
  - the Editor, the Production Editor and a Site Administrator holding a
    manager role, on both tabs, offered what the Journal Manager of
    scenarios 1 to 7 is (Actors paragraph)
  - an "Items per page" other than 25, which changes only the number of
    rows the "Roles" list starts with, as scenario 1's "10" does
    (Settings bullet 1; Rule 4)
- **Register carries it**:
  - A1 (the first row of each page, and of a filtered list, without
    "Edit" and "Remove"; Rule 5)
  - A2 (the manager role's row with no stage ticked, left out by the
    stage filter; Rule 11; scenarios 1 and 2 pass it)
  - A3 (a manager-level role's window saved, every stage ticked; Rule 16;
    scenario 5 passes it)
  - A5 (a stage box pressed twice without a reload, and a removed role's
    row failing when pressed; Rules 8, 10, 21; scenarios 2 and 6 pass it)
  - A8 (the stage boxes to a screen reader; Fields, the "Roles" tab)
  - A9 (the filters hidden again after a choice, the count line the only
    sign; Rule 3b; scenario 1 passes it)
  - A10 (a "Role Name" or "Abbreviation" of spaces; Rule 15b)
  - A11 ("OK" in the window of a manager's only Settings role storing the
    box unticked; Rule 18; scenario 5 passes it)
  - A12 ("Stage Assignment" hidden, or on screen with every box greyed;
    Fields, the role window)
  - A13 (a saved role moving down the list, a new journal's rows out of
    the table's order, a role just made listed first, and a second page
    repeating or skipping a role; Rules 2, 4; scenario 1 passes it)
  - A14 (the "Users" tab opened without a reload after a rename; Side
    effects; scenario 4 passes it)
  - OMP1 and OPS3 (the French column heading and level name; Fields, the
    "Roles" tab)
  - OPS1 (the open access sign-in box not kept on a preprint server;
    Rule 23)
  - OPS2 (the "Reviewer" level on a preprint server: in the window and
    the filter, its greyed box, its Register page box; Rules 3a, 7, 22)
- **No seed**:
  - a Site Administrator with no manager-level role in the journal,
    reaching the page by its address under the "Error" dialog (Actors
    paragraph; ending the administrator's manager role is a screen
    action no key makes)
  - the installation's audit log switched on (Settings bullet 3; a
    configuration-file switch the test install cannot change)
- **Owned by another feature**:
  - the Section Editor and every other role refused Users & Roles
    (Actors paragraph; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - a role's last stage unticked in its window (Rule 9; *[Copyediting
    stage](U32-copyediting-stage.md#a10)*, its A10)
  - "Allow user self-registration" changed on a role, read on a
    profile's Roles tab and the Register pages (Rule 22; *[User
    profile](U03-user-profile.md)*, its Rule 8a; *[Registration & account
    validation](U02-registration-and-account-validation.md)*, its Rule 7)
  - the recommend-only box ticked and "Permit submission metadata edit."
    unticked on "Section editor", read in "Assign" and on the existing
    assignments (Rules 19, 22; *[Stage
    participants](U35-stage-participants.md)*, scenario 7)
  - "Consider role in masthead list" changed (Rule 22; *Journal identity
    & about pages*, scenario 8)
  - "Permit changes to Settings" unticked on "Journal editor" (Rule 22;
    *Journal identity & about pages*, scenario 11)
  - "Users must be registered and log in to view open access content."
    ticked on a journal (Rule 24; *[Subscriptions & open access
    control](U51-subscriptions.md)*, scenario 15)
  - the dashboard of an account holding a role made at the "Reviewer"
    level on a preprint server (OPS2; *[Reviewer's
    review](U28-reviewers-review.md)*, scenario 17)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | The first row of each page of the "Roles" list has no "Edit" or "Remove" | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | The manager role's row shows no stage, and the stage filter leaves it out | 🐞 | minor | — |
| [A3](#a3) | Saving the "Production editor" role, even unchanged, opens Submission and Review to its assigned members | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A4](#a4) | "Remove" warns that members' assignments will be deleted, but a role with members is never removed | 🐞 | minor | — |
| [A5](#a5) | A pressed stage box, and a removed role's row, keep their old look until a reload, and pressing them again fails | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A8](#a8) | A screen reader announces each stage box of the list only as "checkbox" | 🐞 | minor | — |
| [A9](#a9) | After a filter entry is chosen the filters hide, and only the count line shows the list is filtered | 🐞 | minor | — |
| [A10](#a10) | A role name of spaces is refused with a different notice while the page's script fails | 🐞 | minor · crash: script | — |
| [A11](#a11) | "OK" in the window whose Settings box is greyed takes the Settings pages away from the role's holders | 🐞 | user-visible | — |
| [A13](#a13) | The "Roles" list keeps no fixed order: a role just made can come first, without "Edit" or "Remove", a saved role moves down, and a paged list can show a role twice and another never | 🐞 | user-visible | test run (claude), 2026-09-29 — was ❓ |
| [A14](#a14) | After a rename on the "Roles" tab, the "Users" tab shows the role's old name until a reload | 🐞 | minor | — |
| [OMP1](#omp1) | In French a press's "Roles" list heads its External Review column with a code | 🐞 | minor | — |
| [OPS1](#ops1) | "Users must be registered and log in to view open access content." is not kept on a preprint server | 🐞 | user-visible | — |
| [OPS3](#ops3) | In French a preprint server's Moderator level reads "Éditeur-trice de série" (Series Editor) | 🐞 | minor | — |
| [A6](#a6) | A role anyone has ever held can never be removed | ❓ | minor | — |
| [A7](#a7) | "Abbreviation" is required, and no screen but the role's own window shows it | ❓ | minor | — |
| [A12](#a12) | "Stage Assignment" was seen both hidden and on screen with every box greyed in the same four window states | ❓ | minor | — |
| [OPS2](#ops2) | A preprint server offers the "Reviewer" level for a new role | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — The first row of each page has no "Edit" or "Remove"** · 🐞 · medium · crash: server.
Every row of the "Roles" list has a "Settings" arrow that opens "Edit"
and "Remove", except the first row of each page. On a journal, new or
long in use, that row is normally the manager role: it is stored before
every other role, so it leads page 1 at every page size and every
filtered list that includes it, and its name and options cannot be
changed at all. On a second page, with a filter chosen, or when the list
comes in another order (a role just made can come first, [A13](#a13)),
the role that comes first there loses both actions instead; no other
screen changes or removes a role. The manager expects every row to offer
the same actions. A press and a preprint server alike; the stable 3.5
release lists every row with its arrow.
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The manager role's row shows no stage** · 🐞 · minor.
The "Journal manager" ("Press manager") row shows every stage box empty,
while the "Preprint Server manager" row shows its box ticked; the role's
members open every stage in all three apps. Choosing a stage under "List
roles assigned to" leaves the manager role out on a journal and a press,
and no stage's "Assign" offers it there, while a preprint server's
Production stage does ([Stage participants](U35-stage-participants.md)).
The list tells the manager that the most powerful role works nowhere.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Saving the "Production editor" role, even unchanged, opens Submission and Review to its assigned members** · 🐞 · medium.
When a manager presses "OK" in the window of a role whose permission
level is Journal Manager (Press Manager), the role is given every
workflow stage, even when nothing in the window was changed. As
installed this hits "Production editor", which works in Copyediting and
Production only. After the save, its row on the "Roles" list reads every
stage ticked.

A person assigned to a submission as Production editor was refused that
submission's Submission and Review stages until then. After the save
they open both: the submission's files, the review files, the
reviewers' names in a double-anonymous round, and "Add Reviewer".

The only message is "Your changes have been saved.". The row's stage
boxes are greyed out for this level, so no screen can give the role its
two stages back.
Basis: probe, 2026-10-02. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The removal warning describes what never happens** · 🐞 · minor.
The "Confirm" window says the removal "will also delete related settings
and all the users assignments to this role", but "OK" on a role anyone
holds or has held refuses with "Can't remove {role} role…", and every
role the journal was created with is refused whatever its members. The
warning also speaks of "this context", a word no other screen uses for
the journal.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The list does not show a change it has saved** · 🐞 · medium · crash: server.
A pressed stage box keeps its old look until the page is reloaded,
though the notice says the change was saved, so the manager presses it
again. After a tick, the second press fails on the server: no notice
shows, the box turns grey and further presses do nothing, and a reload
shows the stage ticked. After an untick, the second press reads "…
unassigned from … stage." again while the box still looks ticked. After
a successful "Remove" the role stays listed until a reload, and pressing
one of its boxes, or its "Remove" › "OK" again, fails on the server with
no message. The failing press stores nothing, so what is stored stays as
the first press left it. The manager expects the list to show what is
stored. The stable 3.5 release redraws each row as pressed.
Basis: probe, 2026-10-02. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A role ever held can never be removed** · ❓ · minor.
"Remove" refuses a created role while it has any member, and it counts
members whose role has ended: a role tried once and then emptied can
never be removed, and the notice's "Currently {n} user(s)" counts people
who no longer hold it.
Question: should a role whose members have all ended be removable, or
the notice say that past members block it? Lean: keep the block, since
ended roles carry the journal's history (the "Editorial History" page),
but word the notice to say so.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A required abbreviation nothing shows** · ❓ · minor.
"Abbreviation" must be filled to save a role, but no screen other than
the role's own "Edit" window shows a role's abbreviation.
Question: is the abbreviation still meant to appear somewhere, or should
the field become optional or go? Lean: optional, since it has no reader.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The stage boxes have no name for a screen reader** · 🐞 · minor.
The list's stage boxes carry no name a screen reader can read, neither
the role nor the stage, so each is announced only as "checkbox". A
manager who uses a screen reader cannot tell which role and stage a box
sets.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A filtered list does not say it is filtered** · 🐞 · minor.
After an entry is chosen under "List roles assigned to" or "With
permission level set to", both lists hide again behind "Search", and the
list shows only the matching roles with nothing but its count line to
say so, also after switching to another tab and back. A manager who
comes back to the tab can take the shorter list for all the journal's
roles.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A role name of spaces fails the page's script** · 🐞 · minor · crash: script.
A "Role Name" or "Abbreviation" of spaces passes the window's own check,
which refuses an empty box with "This field is required." under it.
"OK" then keeps the window open with a different refusal at its top,
"Errors occurred processing this form", naming the "role abbreviature",
while the page's own script fails behind it. The manager expects the
same refusal as for an empty box.
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — "OK" in a manager's own role window takes Settings away** · 🐞 · user-visible.
In the window of the only role that gives the signed-in manager the
Settings pages, "Permit changes to Settings" is ticked and greyed out,
so the manager expects it to stay on. "OK" in that window, even with
nothing changed, stores the role with the box unticked: the manager's
next Settings page is the access-denied page, "The current role does not
have access to this operation.", and so is every other holder's. A
Journal Manager's "Edit" of the role then shows the box unticked and
open. It happens on "Journal editor" ("Press editor") for an Editor who
holds no other manager-level role, and on a role created at the manager
level for its only holder.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — "Stage Assignment" hidden, or shown with every box greyed** · ❓ · minor.
In four states of the role window "Stage Assignment" was seen both
hidden, as this spec says, and on screen with every box greyed: "Create
New Role" as it opens; "Reader" chosen right after "Reviewer" (a journal
and a press); "Reviewer" on a preprint server; and a manager-level
role's "Edit".
Question: does the window hide the section in these states, or leave it
on screen greyed? Lean: hidden, since the section disappears with a
short animation and the sightings on screen may have come before it
ended.
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The "Roles" list keeps no fixed order** · 🐞 · user-visible.
The list keeps no fixed order, on a journal, a press and a preprint
server alike. A role just made with "Create New Role" can be listed
first, above "Journal manager": a Journal Manager who creates "Data
editor", reloads the page and opens the "Roles" tab finds it as the
first row, with no "Edit" or "Remove" ([A1](#a1)), so it can be neither
changed nor removed, while "Journal manager" below it now offers both.
How often this happens depends on the installation, not on anything the
manager does: on one test installation, where the automated tests create
a role at the same point each time, it came first every time; on
another, about once in eighty new journals.
Saving a role's window usually moves its row down the list (Rule 2), so
the order a manager has learned changes after any "OK". A new journal's
own roles do not always come in the order of the roles table either.
Once, a new preprint server with nothing saved on it listed "Author",
"Reader", "Editorial Board Member", "Preprint Server manager" and
"Moderator": "Author" had no "Edit" or "Remove", and the manager row had
both. With the list on more than one page (Rule 4), each page takes its
rows from the list in whatever order it has when that page opens, so the
second page can repeat a role the first showed and leave another role off
both. Expected: a fixed order, the installed roles first in the table's
order and created roles after them.
Re-checked: test run (claude), 2026-09-29 — was ❓ (whether the list
should keep a fixed order); a defect, since a role just made can land
first and then cannot be edited or removed.
Basis: probe; test run; code (the pages). <sup>f-a13</sup>

<a id="a14"></a>
**A14 — The "Users" tab keeps a renamed role's old name** · 🐞 · minor.
After a role is renamed in its "Edit" window, the "Roles" tab reads "Your
changes have been saved." and lists the new name, but the "Users" tab of
the same page, opened without a reload, still shows the old name in its
members' rows under "Roles": Quinn Ashdown's row reads "Editorial Board Member"
after the role became "Advisory Board". Only a reload of the page shows
the new name. The manager sees a role name the journal no longer has.
Basis: test run. <sup>f-a14</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A code heads the External Review column in French** · 🐞 · minor.
In the French interface a press's "Roles" list heads its External Review
column "##workflow.review.externalReview##", while the other columns
read "Soumission", "Évaluation interne", "Révision" and "Production". A
journal's list prints a French name for every column.
Basis: probe. <sup>f-omp1</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The open access sign-in box is not kept on a preprint server** · 🐞 · user-visible.
A preprint server's "Site Access Options" tab offers "Users must be
registered and log in to view open access content." under "View Preprint
Content". Ticked and saved, the tab says "Saved", but opened again the
box is unticked, and signed-out visitors still open every posted
preprint's files. A journal and a press keep the box and apply it.
Basis: probe. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — The "Reviewer" level on a preprint server** · ❓ · minor.
"Create New Role" and the list's level filter offer "Reviewer" on a
preprint server, which has no review stage. The filter's "Reviewer"
lists no role, and a role created at that level has its one stage box
greyed out and nothing a reviewer does. With "Allow user
self-registration" ticked, such a role adds a box to the server's
Register page labelled "##user.reviewerPrompt.optin##", with "Reviewing
interests" under it, where a journal and a press read "Yes, request the
{role} role.". An account holding such a role, even beside "Author",
lands after every sign-in on a reviewer page headed "undefined (0)" under
an "Error" window, "The current role does not have access to this
operation."; on a journal and a press such a role lands on "Action
Required by me" ([Reviewer's review OPS1](U28-reviewers-review.md#ops1)).
Question: should a preprint server offer the reviewer level at all?
Lean: no, as its installed roles carry none and the server has no working
page for the role's holders.
Basis: probe. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — The Moderator level reads "Series Editor" in French** · 🐞 · minor.
In the French interface a preprint server's "Roles" list reads
"Éditeur-trice de série" (Series Editor, a press's level) in the
"Permission level" cell of the Moderator row; the manager row reads
"Administrateur-trice du serveur". A journal's list prints its own
French level names.
Basis: probe. <sup>f-ops3</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 at the checkouts' tips (ojs `71bb244152`, omp
`187f0f40d`, ops `61cd158ce3`, one lib/pkp `76a315591b` and ui-library
`03d1cee2` in all three). The roles list, its window and its handler are
lib/pkp's alone: no app subclasses or overrides `UserGroupGridHandler`,
`UserGroupGridRow`, `UserGroupGridCellProvider`, `UserGroupForm`, their
templates or `UserGroupFormHandler.js`, so every shared claim rests on one
code path; the apps differ only in their installed roles
(`registry/userGroups.xml`), their stages (`Application::getApplicationStages()`),
their locale strings and their `UserAccessForm` subclass. Earlier drives
cited below were made by other features' checks on the same screens.

<a id="fn-a"></a>
**a** — Page: `ManagementHandler::settings()` with `access` → `access()` →
`templates/management/access.tpl` (`AccessPage.vue`): tab `roles`
(`manager.roles` "Roles") holds `load_url_in_div` of
`grid.settings.roles.UserGroupGridHandler` `fetchGrid`; tab `access`
(`manager.siteAccessOptions.siteAccessOptions` "Site Access Options")
holds the `FORM_USER_ACCESS` form. The grid handler grants every op to
`ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` behind `ContextAccessPolicy`
and `CanAccessSettingsPolicy` (the "Permit changes to Settings" gate), the
same gate as the page. Unsaved change kept across tabs and dropped on
leaving: live-probed 2026-09-25 on the "Site Access Options" tab (Rule 1;
Users management's claim check, all three apps). Live-probed 2026-09-26
(Actors paragraph; rows 1, 6; all three apps, the page's address typed):
the page opened, with the tabs "Users", "Roles", "Site Access Options" and
"ORCID", for the manager role, "Journal editor" ("Press editor") and
"Production editor" (OJS, OMP), a created manager-level role once its
"Permit changes to Settings" was ticked, and `admin`; every one of them
saw the same rows, arrows, live boxes and "Save". The access-denied page
answered that created role while its box was unticked, "Journal editor"
with its box unticked, and the Section editor (Moderator), Copyeditor,
Editorial Board Member, Author, Reviewer, Reader, Subscription Manager
(OJS), a created Assistant-level role's member and a member whose role had
ended. `admin` holding only Reader, its manager role ended: on OJS
`{journal}/management/settings/access` opened under the "Error" dialog; on
OMP and OPS that address answered the access-denied page and
`{journal}/management/access` opened the page the same way (the Users
management spec's Actors row 1).

<a id="fn-b"></a>
**b** — `UserGroupGridHandler::initialize()`: title
`grid.roles.currentRoles` "Current Roles", action `grid.roles.add` "Create
New Role", columns `settings.roles.roleName` "Role Name",
`settings.roles.from` "Permission level" (the cell prints
`Application::getRoleNames(false, [roleId])`: `user.role.manager` OJS
"Journal Manager", OMP "Press Manager", OPS "Manager";
`user.role.subEditor` "Section Editor", "Series Editor", "Moderator";
`user.role.assistant` "Assistant", `.author`, `.reviewer`, `.reader`; OJS
`user.role.subscriptionManager` "Subscription Manager"), then one
`selectStatusCell.tpl` column per
`WorkflowStageDAO::getWorkflowStageTranslationKeys()` (filtered to the
app's stages, so no Done column): OJS `submission.submission`,
`workflow.review.externalReview` (OJS locale "Review"),
`submission.editorial` "Copyediting", `submission.production`; OMP adds
`workflow.review.internalReview` "Internal Review" and reads "External
Review"; OPS Production alone. `loadData()` queries
`UserGroup::withContextIds([$contextId])` with no `orderBy`, so the order
is the database's (Postgres returns rows in the order they are stored:
insertion order, the registry's, unless a new row took the space of an
earlier deleted one or a saved row was rewritten elsewhere,
[f-a13](#fn-f-a13)). Live-probed 2026-09-26 (Fields, the "Roles" tab; Rule 2; all
three apps, new scratch contexts): "Search" and "Create New Role" at the
list's top right; the rows in the order of the roles table and nothing
from another context; a created role at the end, on the same page and
after a reload. After "Copyeditor"'s "Edit" › "Consider role in masthead
list" › "OK", its row moved from sixth (OMP fifth) to the very end, after
a created role; on OPS "Author" moved from third to below "Editorial Board
Member", above the created role. Where created roles land:
[f-a13](#fn-f-a13). The French names: [w](#fn-w).

<a id="fn-c"></a>
**c** — `registry/userGroups.xml` of each app: `stages`,
`permitSelfRegistration`, `masthead`, `permitMetadataEdit`,
`permitSettings` per group (recommendOnly unset everywhere); names from
each app's `default.groups.name.*`. OJS groups in file order: manager,
editor `1,3,4,5,6`, productionEditor `4,5,6`, sectionEditor and
guestEditor `1,3,4,5,6`, copyeditor `4`, designer `5,6`, funding `1,3`,
indexer, layoutEditor `5,6`, marketing `4`, proofreader `5,6`, author and
translator `1,3,4,5,6`, externalReviewer `3`, reader, subscriptionManager
(`0x00200000`), editorialBoardMember. OMP: the same with `2` added
(editor, sectionEditor `1,2,3,4,5,6`, funding `1,2,3`, author,
translator), no guestEditor or subscriptionManager, and volumeEditor
`1,2,3,4,5,6`, chapterAuthor `4,5,6` (self-registering), internalReviewer
`2`, externalReviewer `3`. OPS: manager, sectionEditor, author (with
`permitMetadataEdit`) `5,6`; reader; editorialBoardMember. Stage 6 (Done)
has no column. Earlier drives: the stage boxes of every row on all three
apps, live-probed 2026-09-19 (the Production stage's claim check);
"Consider role in masthead list" per role on fresh scratch contexts,
live-probed 2026-09-23 (the About pages' claim check: Internal Reviewer
and Production editor unticked); the self-registration flags through the
Register pages, live-probed 2026-09-02; "Permit submission metadata edit."
on the Layout Editor unticked, live-probed 2026-09-25. Live-probed
2026-09-26 (the roles table and the press and server paragraphs; all three
apps, new scratch contexts): every role's "Edit" window and the list's
boxes as tabled, "This role is only allowed to recommend…" unticked
everywhere, OJS "Subscription Manager" with no stage, no option and open
boxes. The first row has no "Edit" on any app ([f-a1](#fn-f-a1)); its
options were read from the database only: `permit_metadata_edit` and
`permit_settings` on, `masthead` and `permit_self_registration` off, on
all three apps.

<a id="fn-d"></a>
**d** — `userGroupsGridFilter.tpl`: two `fbvFormSection` descriptions
`grid.userGroup.filter.listRoles` "List roles assigned to" (select
`selectedStageId`: `grid.userGroup.allStages` "All Workflow Stages" + the
app's stages) and `grid.userGroup.filter.permissionLevel` "With permission
level set to" (select `selectedRoleId`: `grid.user.allPermissionLevels`
"All Permission Levels" + `getRoleNames(true)` minus `ROLE_ID_READER`);
the form's `ToggleFormHandler` submits on every change. `loadData()`:
`withRoleIds()`, `withStageIds()` (the role's `user_group_stage` rows).
Live-probed 2026-09-26 (Rule 3; all three apps): the filter form
(`#userGroupSearchForm`) hidden on landing and shown and hidden by each
press of "Search"; the entries as listed, OPS's level list with
"Reviewer", which left no row and "0 items"; each choice reloading the
list at once (`fetch-grid`); "Copyediting" with "Assistant" leaving
"Copyeditor" and "Marketing and sales coordinator"; a second after a
choice the form hidden again with the list filtered (OJS "Assistant": "1 -
9 of 9 items"; OPS two rows), the same after a switch to "Site Access
Options" and back; after a reload every row back and the form hidden.

<a id="fn-e"></a>
**e** — `PagingFeature` (`GeneralPagingFeature::setOptions()`, the
context's `itemsPerPage` via `getRangeInfo()`), `gridPaging.tpl`
(`common.itemsPerPage` "Items per page", `navigation.items` "{$from} -
{$to} of {$total} items"); `js/classes/features/PagingFeature.js` offers
`[10, 25, 50, 75, 100]` plus the default, and hides the select when the
total is at most the smallest. "Items per page" of Settings › Website: the
*Appearance & theming* spec's Rule 29. Live-probed 2026-09-26 (Rule 4;
Fields; Settings bullet 1; all three apps): a new context reads "1 - 18 of
18 items" (OMP 19, OPS 5; in French "1 - 19 de 19 élément(s)"); no "Items
per page:" on a preprint server with 5 or 10 roles, "Items per page: 10 25
50 75 100" at 11 roles and at once on OJS and OMP; "10" on OJS gives "1 -
10 of 18 items" with the links "2", ">" and ">>", and page 2 "11 - 18 of
18 items" with eight rows (OMP alike); with Settings › Website "Items per
page" at 5 the list starts at five rows ("1 - 5 of 18 items") and offers
"5 10 25 50 75 100", shown on a preprint server with 8 roles; after a
reload the list is back at the journal's number.

<a id="fn-f"></a>
**f** — `UserGroupGridRow::initialize()` adds "Edit" (`grid.action.edit`,
`AjaxModal` to `editUserGroup`) and "Remove" (`grid.action.remove`,
`RemoteActionConfirmationModal`) only `if (!empty($rowId) &&
is_numeric($rowId))`; the arrow is `gridRow.tpl`'s `show_extras` link,
screen-reader text `grid.settings` "Settings". Why the first row:
[f-a1](#fn-f-a1). Live-probed 2026-09-26 (Rule 5; Actors rows 4–5; all
three apps): no arrow on the first row of a new context, of the second
page at 10 per page (OJS "Marketing and sales coordinator", OMP
"Proofreader") and at 5 per page (OJS "Copyeditor", OMP "Designer", a
created role on OPS), and of each filtered list ("Journal editor" under
any stage, "Copyeditor" under "Assistant"); every other row with the
arrow, the second row's "Edit" on page 2 opening that row's role.

<a id="fn-g"></a>
**g** — `UserGroupGridCellProvider`: `selected` = the stage is among
`getAssignedStagesByUserGroupId()`; `disabled` and no cell action when the
column is in `RoleDAO::getForbiddenStages($roleId)` (manager: every stage;
reviewer: Submission, Copyediting, Production; reader: every stage; any
other level, the Subscription Manager's `0x00200000` included, none). The
action is `assignStage` / `unassignStage` (`AjaxAction`), handled by
`_toggleAssignment()`: CSRF check, `UserGroupStage::create()` or delete,
trivial notification `grid.userGroup.assignedStage` "{$userGroupName} role
assigned to {$stageName} stage." / `grid.userGroup.unassignedStage`
"{$userGroupName} role unassigned from {$stageName} stage.". Live-probed
2026-09-19 (the Production stage's claim check; Rules 6–8, all three
apps): one live box per stage and row, greyed on the manager-level rows,
on the Reviewer row outside its review column and on the Reader row; a
click saves at once with the Copyeditor's two notices; with the
Copyeditor's Production box ticked its assigned member reached the
Production panels and "Copyeditor" was offered by "Assign", unticked both
reverted. Live-probed 2026-09-26 (Rules 6–8; Actors row 2; all three apps,
two runs): OJS "Subscription Manager" and a created Subscription
Manager-level role with four live boxes, each press stored; on a press
"Internal Reviewer", "External Reviewer" and a created Reviewer-level role
each with both review boxes live; a created Reviewer-level role on a
preprint server with its one box greyed and unticked; a click on a greyed
box sending nothing; a box pressed as each manager-level account and as
`admin`, stored. Each press answered `assign-stage` / `unassign-stage`
with the notice at the top right and no dialog, while the box kept its old
look on the page, also after a switch to "Users" and back, until a reload
(A5). The assigned member's access to Production and the role's offer in
"Assign" followed the box both ways (OJS, OMP: Copyeditor; OPS: Editorial
Board Member).

<a id="fn-h"></a>
**h** — `_toggleAssignment()` deletes the stage row with no check for a
last stage, while `UserGroupForm::execute()` updates stages only `if
($assignedStages)` (an empty list keeps the stored ones: the Copyediting
stage spec's A10, live-probed 2026-09-19). Live-probed 2026-09-26 (Rule 9;
all three apps): "Copyeditor"'s only box unticked in the list read
"Copyeditor role unassigned from Copyediting stage." (OPS: a created
role's "Production"), and after a reload the row and its window's "Stage
Assignment" were empty; with the stage ticked again, unticking it in the
window and "OK" answered "Your changes have been saved." and left it
ticked in the row and in the reopened window.

<a id="fn-i"></a>
**i** — `_toggleAssignment()` answers
`DAO::getDataChangedEvent($userGroup->id)`, so the grid asks `fetchRow`
for row id = the role's id; but `loadData()` returns a
`VirtualArrayIterator` over `->get()->all()`, keyed 0…n−1, and
`GridHandler::setGridDataElements()` keeps those keys as row ids, so the
lookup finds another row or none (`elementNotFound`), and the pressed row
keeps its cell action (`assignStage` stays `assignStage`). A second
`assignStage` for the same stage hits `user_group_stage_unique`
(`context_id, user_group_id, stage_id`). `removeUserGroup()` answers the
same event with the removed role's id. Live-probed 2026-09-26 (Rule 10):
[f-a5](#fn-f-a5).

<a id="fn-j"></a>
**j** — The manager group has no `stages` in the OJS and OMP registries
and `5,6` in OPS's; its boxes are all forbidden (`getForbiddenStages()`),
so nothing on screen can change them; `RoleDAO::getAlwaysActiveStages()`
(`ROLE_ID_MANAGER`) makes `UserGroupForm::execute()` store every stage on
a save. The workflow's own access for manager-level roles is the *Workflow
screen & stage access* spec's. Live-probed 2026-09-19 (all three apps):
the manager row's boxes empty and greyed on OJS and OMP, ticked and greyed
on OPS. Live-probed 2026-09-26 (Rule 11; all three apps, two runs): the
manager row's boxes empty and greyed on OJS and OMP, ticked and greyed on
OPS; each stage under "List roles assigned to" leaving "Journal manager" /
"Press manager" out (OJS 4 of 4, OMP 5 of 5), OPS's "Production" listing
"Preprint Server manager"; the manager's member opening every stage with
no access notice; no stage's "Assign" offering "Journal manager" / "Press
manager", while "Journal editor", "Production editor" and a created
manager-level role were offered, and OPS offered "Preprint Server
manager"; those other manager-level rows showing their stages ticked and
kept by the stage filter.

<a id="fn-k"></a>
**k** — `userGroupForm.tpl`: heading `settings.roles.roleDetails` "Role
details"; `settings.roles.from` "Permission level" (select from
`Application::getRoleNames(true)`: the six shared levels plus OJS's
Subscription Manager, no site admin), `settings.roles.roleName` "Role
Name", `settings.roles.roleAbbrev` "Abbreviation" (both
`multilingual="true"`, `required`); `grid.roles.stageAssignment` "Stage
Assignment" (a checkbox group over the app's stages);
`settings.roles.roleOptions` "Role Options":
`settings.roles.permitSelfRegistration`, `.recommendOnly`,
`.permitMetadataEdit`, `.masthead`, `.permitSettings`;
`common.requiredField`; `fbvFormButtons` (on screen "Cancel", a link, and
"OK"). Window titles: `grid.roles.add` "Create New Role",
`grid.action.edit` "Edit". `UserGroupFormHandler.js` on load and on every
level change: `updatePermitSelfRegistration()` (open for
`ROLE_ID_REVIEWER, AUTHOR, READER`, else disabled and unchecked),
`updatePermitMetadataEdit()` (disabled and checked for
`NOT_CHANGE_METADATA_EDIT_PERMISSION_ROLES` = manager; otherwise enabled,
unchecked on a level change), `updatePermitSettings()` (open for manager,
else disabled and unchecked), `updateStageOptions()` (disables the
forbidden stages, hides the stage container when none is left enabled,
does not uncheck), `updateRecommendOnly()` (open for manager and
sub-editor). The server repeats each restriction in `execute()`. The
handlers' `removeAttr('checked')` clears only a box's starting state, not
a tick set in the window, so a greyed box keeps its tick; a disabled box
is not posted, so "OK" stores it unticked. Live-probed 2026-09-26 (Fields,
the role window and the level table; Rules 12–14; Actors row 3; all three
apps): the window titled "Create New Role" or "Edit" over the heading
"Role details", the buttons "Cancel" and "OK"; "Create New Role" opening
for every manager-level account and `admin` on the first level, the name
boxes empty, every box unticked but the metadata box, ticked and greyed;
each level's boxes as tabled, read on a fresh window per level and in
sequence once the section's animation had ended; a box greyed by a level
change keeping its tick and stored unticked by "OK" (self-registration
after "Assistant", a Submission stage after "Reviewer"); the metadata box
keeping its state through the level changes and ticked by a change to the
manager level. Earlier reads of "Stage Assignment": [f-a12](#fn-f-a12).

<a id="fn-l"></a>
**l** — `UserGroupForm::__construct()`: `FormValidatorLocale` on `name`
(`settings.roles.nameRequired` "You need to define a role name.") and
`abbrev` (`settings.roles.abbrevRequired` "You need to define a role
abbreviature."), primary locale only; `roleId` required on create (the
select always carries a value, so `settings.roles.roleIdRequired` is not
reached); no stage validator (`settings.roles.stageIdRequired` is a hidden
label in the template). The fields are `required` for the page's
client-side validation, whose message is `validator.required` "This field
is required.". Success: `updateUserGroup()` creates the trivial
notification (the default success text "Your changes have been saved.")
and returns a whole-grid data-changed event. Form languages:
`Form::fetch()` gives the multilingual boxes the context's form locales;
`_setUserGroupLocaleFields()` stores the posted locales among the
context's UI locales. Live-probed 2026-09-26 (Rule 15a; Settings bullet 2;
all three apps): an empty "Role Name" (abbreviation "TR") or an empty
"Abbreviation" kept the window open with "This field is required." under
the box and sent nothing; a new Assistant-level role with no stage saved,
its row empty on the same page and after a reload; a renamed row shown at
once. With French under "Forms" both fields gained a French box (shown
while the English box has focus); French alone was refused under the
English boxes, English alone and both saved. Spaces only:
[f-a10](#fn-f-a10).

<a id="fn-m"></a>
**m** — `UserGroupForm::execute()`: `if (in_array($userGroup->roleId,
$roleDao->getAlwaysActiveStages())) $assignedStages =
array_keys(getWorkflowStageTranslationKeys())`, then
`_assignStagesToUserGroup()` deletes and rewrites the role's stages. The
window hides "Stage Assignment" for the manager level
(`updateStageOptions()`). A section's "Editorial Assignments" offers roles
working on the first stage (the *Sections* spec's Fields). Seen once
2026-09-25 (the Sections spec's claim check, OJS): after the Production
editor's window had been saved on this tab, "Editorial Assignments"
offered the Production editor. Live-probed 2026-09-26 (Rule 16):
[f-a3](#fn-f-a3).

<a id="fn-n"></a>
**n** — `fbvFormButtons` "Cancel" closes the `AjaxModal`. Live-probed
2026-09-22 (Rule 17; the Stage participants claim check, all three apps):
"Cancel" closed a role's "Edit" window holding an unsaved change with no
prompt. Live-probed 2026-09-26 (Rule 17; all three apps): "Cancel" in
"Create New Role" and in "Edit" after typed changes closed with no
question and saved nothing; "Close" (×) after a change raised the browser
question "The data on this form has changed. Do you wish to continue
without saving?" (`FormHandler.js::containerCloseHandler()`), and leaving
the page raised the browser's leave-page question (`beforeunload`); the
typed name was not saved either way.

<a id="fn-o"></a>
**o** — `UserGroupForm::initData()` sets `mySettingsAccessUserGroupIds`:
the groups of this context the signed-in user holds actively whose
`permitSettings` is on; `UserGroupFormHandler::updatePermitSettings()`
disables the box when that list has one entry and it is the role being
edited (`willLockOut`). The guard is the window's alone; `execute()` saves
whatever is posted. Live-probed 2026-09-26 (Rule 18; Actors row 7; all
three apps): ticked and greyed for the Editor holding only "Journal
editor" ("Press editor") on that role, and for the only holder of a
created manager-level role on it; open for the same Editor on "Production
editor", for an Editor also holding "Production editor", and for the
Journal Manager. What "OK" then does: [f-a11](#fn-f-a11). On a preprint
server the installed manager role is normally the first row, which offers
no "Edit".

<a id="fn-p"></a>
**p** — `UserGroupForm::fetch()`: `disableRoleSelect` when the role
exists; `execute()` never changes `roleId` on an existing role.
Live-probed 2026-09-26 (Rule 14; all three apps): the window titled
"Edit", filled with the name, the abbreviation ("CE", "SecE", "AcqE",
"MOD", "EBM"), the stages and the options, "Permission level" disabled, on
Copyeditor, Section editor (Series editor, Moderator), Editorial Board
Member and a created role.

<a id="fn-q"></a>
**q** — `UserGroupGridRow`: `RemoteActionConfirmationModal` with
`settings.roles.removeText` and no title (the modal's default
`common.confirm` "Confirm"; buttons "OK" and "Cancel").
`removeUserGroup()`: CSRF check; `$userGroup->userUserGroups()->count()`
(every assignment row, ended ones included) > 0 → warning
`grid.userGroup.cantRemoveUserGroup`; else `isDefault` (every installed
group) → warning `grid.userGroup.cantRemoveDefaultUserGroup`; else
`$userGroup->delete()` and success `grid.userGroup.removed`. Seen
2026-09-04 (a reviewer-review probe, all three apps): every row but the
first has the arrow with "Edit" and "Remove" and a "Confirm" text.
Live-probed 2026-09-26 (Rules 20–21; Actors row 5; all three apps): the
"Confirm" window as quoted, its "Cancel" sending nothing; the refusals as
warnings at the top right for an installed role nobody holds ("The role
Copyeditor is a default one and can't be removed."), an installed role one
person holds (the held notice wins), and a created role with one current,
one past, or one current and one past member ("Currently 2 user(s)"); a
created role nobody held removed ("{role} role removed."), still listed
until a reload and gone from "Invite to a role" at once.

<a id="fn-r"></a>
**r** — What stores each control: `UserGroupStage` rows (the stage boxes),
`user_groups.permit_self_registration`, `recommend_only`,
`permit_metadata_edit`, `masthead`, `permit_settings`, and the
`name`/`abbrev` settings. The readers named in the table are the features'
own: `WorkflowStageAccessPolicy` and the participants'
`getAssignedStagesByUserGroupId()` (stage gate, "Assign"), `SectionForm`'s
editorial assignment list, the task template window's `GET
userGroups?stageIds={stage}` (`UserGroupController::getMany()`),
`UserFormHelper` and `RegistrationForm` (self-registration),
`AddParticipantForm` (recommend-only, metadata), `AboutContextHandler` and
`Repo::userGroup()->getSortedMastheadUserGroups()` (masthead),
`CanAccessSettingsPolicy` (settings). Each effect is driven in the spec
the table names. Live-probed 2026-09-26 (Rule 22; all three apps), each
control saved on this tab and read on the screen the table names: a
created role's ticked stage offering it in that stage's "Assign" and task
template window, and the first stage ticked for a role offering its
members in a section's (series') "Editorial Assignments";
self-registration on a profile's Roles tab and on the Register pages;
recommend-only and metadata edit in "Assign"; the masthead pages and order
list; Settings access both ways; a renamed role on every screen named.
File visibility was not driven.

<a id="fn-s"></a>
**s** — Scenario seeding. Scenarios 1 to 7 run on OJS, OMP and OPS and
scenario 8 on OMP, each on its own scratch journal (press, preprint
server) from `POST scenarios/context` with throwaway `users[]` (names from
`givenName` and `familyName`; password the username twice; email
`<username>@mail.test`). The first entry, `roles: ['manager']`, is the
Journal Manager (Press Manager, Preprint Server Manager) every scenario
signs in as. The context factory enrols `admin` as a manager of every
scratch context; `admin` does not sign in here. `publicknowledge` is never
changed. Scenarios 1, 2, 3 and 7 add nothing else: the roles, the task
templates and "Site Access Options" are the install's. The "Invite to a
role" address of scenarios 3, 4 and 6 is `invitee-<tag>@mail.test`, used
by no account. Scenario 4: Quinn Ashdown `editorialBoardMember`.
Scenario 5: `customRoles: [{key: 'managingEditor', level: 'manager',
name: 'Managing editor', abbrev: 'MGE'}]` (no `stages`, which a
manager-level entry refuses; the role arrives with "Permit changes to
Settings" unticked, as "Create New Role" leaves it), Kai Moreno
`managingEditor`, and on OJS and OMP Lena Ortiz `editor` ("Journal
editor", "Press editor"); Kai and Lena sign in in the second browser, one
after the other. Scenario 6: `customRoles` `spareDesk` ("Spare desk",
abbreviation "SD"), `dataCurator` ("Data curator", "DC", `stages:
['copyediting']`, OPS `['production']`) and `archiveDesk` ("Archive
desk", "AD"), each `level: 'assistant'`; Quinn Ashdown `dataCurator`;
Nova Reyes `roles: []` with `pastRoles: [{role: 'archiveDesk'}]` (the role
ended today). Scenarios 7 and 8: the visitor is a browser with no
session. Scenario 8: "Tidal Patterns" from `POST scenarios/submission`
with `submitted: true`, `decisions: ['skipExternalReview',
'sendToProduction']`, `publicationFormats: [{name: 'PDF', file:
'article.pdf'}]` and `published: true` (the format "Approved" and
"Available", its file "Open Access"); the visitor starts on its book page,
`catalog/book/{id}`. Scenarios 3 to 6 run their steps through
`replayWhenFirstRow()`: when the row a scenario opens is the list's first
row, which has no "Settings" arrow ([A1](#a1), [A13](#a13)), the scenario
starts again from its seeding on a new scratch journal, at most three
times, each landing recorded as an app defect; a third landing, or a
missing arrow on any other row, fails the test. Live-probed 2026-09-26 (the
preamble; all three apps): a scratch context's throwaway manager signing
in with the username twice; a context seeded with `restrictSiteAccess`
sending a signed-out visitor from home and an item's page to Login, its
tab showing the box ticked.

<a id="fn-t"></a>
**t** — `PKPUserAccessForm` (`FORM_USER_ACCESS`, `PUT` to the context
API): `restrictSiteAccess` (`manager.setup.siteAccess.view` "Site Access",
option `manager.setup.restrictSiteAccess`), `disableUserReg` (radio
`manager.setup.userRegistration` "User Registration", options
`manager.setup.enableUserRegistration` / `.disableUserRegistration`); each
app's `APP\components\forms\context\UserAccessForm` adds after the first
field OJS `restrictArticleAccess` (`manager.setup.siteAccess.viewContent`
"View Article Content"), OMP `restrictMonographAccess` ("View Monograph
Content"), OPS `restrictPreprintAccess` ("View Preprint Content"), each
labelled "Users must be registered and log in to view open access
content.". Labels from each app's `locale/en/manager.po`. Readers: every
page through `RestrictedSiteAccessPolicy` (`restrictSiteAccess`; `user`,
`login` and a few other pages exempt), OJS `ArticleHandler` (a galley
without a subscribed domain → `Validation::redirectLogin()`), OMP
`CatalogBookHandler::download()` (a free or paid-for file, signed out →
login), `RegistrationHandler::validate()` and the navigation menu
(`disableUserReg`). Defaults: all three unticked and registration open on
new contexts, live 2026-09-24 and 2026-09-25 (three apps; the Custom pages
and JATS claim checks), and every scratch context open for registration,
live-probed 2026-09-02. Live-probed 2026-09-26 (Fields, the tab; Rules
23–24; Actors row 6; all three apps): the labels above per app, both boxes
unticked and the first choice chosen on a new context, no field marked
required; each manager-level account and `admin` saving a changed "User
Registration" with "Saved" (one request carrying all three fields), the
choice kept after a reload. With the site box ticked, a signed-out visitor
was sent to Login from home, About, "Editorial Masthead", an item's page
and file, Search and the archive (catalog, preprint list), while Login,
Register and the lost-password page stayed open; unticked, all opened
again. The content box: on a journal the article page stayed open and its
"PDF" galley sent a signed-out visitor to Login; on a press the book page
stayed open and its "PDF" format's file view sent one to Login, the view
opening again once unticked (its PDF itself fails to load, another
feature's defect); on a preprint server nothing changed. With registration
closed, the header's and the Login page's "Register" links were gone and
the Register page answered with the sentence of Rule 24 and no form;
reopened, both came back.

<a id="fn-u"></a>
**u** — `SendInvitationStep` lists `getAllUserGroups($context)` for
"Invite to a role"; the "Users" list reads each group's localized name. No
mailable, notification or event-log entry is raised by
`UserGroupGridHandler` or `UserGroupForm`; `AuditLog::log()` writes
`USER_GROUP_CREATED`, `_UPDATED` (the changed flags), `_DELETED`,
`_STAGE_ASSIGNED` and `_STAGE_UNASSIGNED` only when the configuration
file's `[logs] log_audit` is on (off by default), to the server's log,
which no screen shows. Live-probed 2026-09-26 (Side effects; all three
apps): "Probe Role" at level "Author" with Production ticked was offered
at once in "Invite to a role", in Production's "Assign", in the Production
task template's "Limit access to specific roles" and, with
self-registration ticked, on a Reader's Profile › Roles, and was gone from
all four after its removal; "Editorial Board Member" renamed "K4 Board"
read so in the "Users" list's "Roles" cell (the same page's "Users" tab
opened without a reload keeps the old name: [f-a14](#fn-f-a14)), "Invite to a role", "Editorial
Masthead" and the Appearance order list; a stage change reached a member's
two submissions from their next opening; after every control of both tabs
the mail catcher held nothing for the members (a password reset delivered,
as a control), and no notification or activity-log line appeared.
Administration › System Information lists the configuration file's `logs`
settings, with no `log_audit` line while the switch is off; whether it
lists the switch once set was not read (the test configuration cannot be
changed).

<a id="fn-v"></a>
**v** — `UserGroupForm::execute()`: when `permitMetadataEdit` changes,
every `StageAssignment` of the group in the context gets
`canChangeMetadata` set to it. Live-probed 2026-09-22 (Rule 19; the Stage
participants claim check, all three apps): unticking it on the Section
Editor role unticked "Permissions" on that role's assignments on two
submissions. Live-probed 2026-09-26 (Rule 19; all three apps): the Section
editor (Series editor, Moderator) assignment's "Allow this person to make
changes to the publication…" box, ticked before, unticked after the role's
box was unticked and "OK" pressed, ticked again after it was ticked back.

<a id="fn-w"></a>
**w** — The Users management spec's OPS1: OPS's `locale/fr_CA` lacks
`default.groups.name.manager` and `.sectionEditor`, and the "Users" list
prints the codes. The "Roles" list prints the same group names
(`getLocalizedData('name')`). Live-probed 2026-09-26 (Fields "Role Name";
all three apps, French as a UI language): OPS printed
"##default.groups.name.manager##" and
"##default.groups.name.sectionEditor##" in the first two rows; OJS and OMP
printed French names on every row. The same page's column and level
strings: [f-omp1](#fn-f-omp1), [f-ops3](#fn-f-ops3).

<a id="fn-f-a1"></a>
**f-a1** — `UserGroupGridHandler::loadData()` returns `new
VirtualArrayIterator($pageResults, …)` where `$pageResults =
$builder->offset()->limit()->get()->all()`, a list keyed 0…n−1;
`GridHandler::setGridDataElements()` keeps the keys, so each page's first
row has row id `0`, and `UserGroupGridRow::initialize()` adds no action
when `empty($rowId)`. Seen 2026-09-04 on all three apps (a reviewer-review
probe): every row but the first had the "Settings" arrow. The first row
being the manager role on a new journal is why the *Journal identity &
about pages* spec reads its row as offering no "Edit". Other page and
filter cases: [f](#fn-f). Live-probed 2026-09-26: [f](#fn-f). A role
just made listed first (test runs 2026-09-28 and 2026-09-29):
[f-a13](#fn-f-a13); nothing moves a first row down (no filter, page size
or page link does, and a saved role only moves down), and the grid is the
only place a role is edited or removed.
Issue report: [docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md](../issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md).

<a id="fn-f-a2"></a>
**f-a2** — Live-probed 2026-09-19 (the Production stage's claim check, all
three apps). Cause: the registries (manager group without `stages` on OJS
and OMP, `5,6` on OPS); the stage filter's `withStageIds()` reads the same
rows. Filter half: [j](#fn-j). Live-probed 2026-09-26: [j](#fn-j).

<a id="fn-f-a3"></a>
**f-a3** — `UserGroupForm::execute()` with `getAlwaysActiveStages()`
([m](#fn-m)); the Production editor is a manager-level group with stages
`4,5,6`; an assigned Production editor opens only Copyediting and
Production (live-probed 2026-09-22, the Stage participants claim check,
OJS and OMP); after a save the group holds every stage. Seen once
2026-09-25 as the Production editor offered in "Editorial Assignments"
after its window was saved (OJS). Live-probed 2026-09-26 (Rule 16; OJS and
OMP): the Production editor's row read Copyediting and Production; after
its "Edit" with only "Consider role in masthead list" ticked and "OK" (the
post carrying no stage) it read every stage, on the same page and after a
reload; a section's (OMP: a series') "Editorial Assignments" offered its
members only after the save; its assigned member got "You don't currently
have access to that stage of the workflow." on Submission and Review (OMP:
Internal Review) before and opened them after. "OK" with nothing changed
did the same, and a role created at the manager level arrived with every
stage ticked (all three apps; OPS its one box). The only notice was "Your
changes have been saved.".
Issue report: [docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md](../issues/U54-A3-manager-level-role-save-ticks-every-stage.md).

<a id="fn-f-a4"></a>
**f-a4** — `settings.roles.removeText` against `removeUserGroup()`
([q](#fn-q)): no path deletes a group that has assignments, and
`isDefault` groups are never deleted. Live-probed 2026-09-26: [q](#fn-q).

<a id="fn-f-a5"></a>
**f-a5** — Row ids 0…n−1 against the role-id refresh ([i](#fn-i)); the
unique key `user_group_stage_unique` makes the repeated `assignStage` a
database error. Live-probed 2026-09-26 (Rules 8, 10, 21; all three apps,
two runs): after a tick the box stayed empty beside "Copyeditor role
assigned to Production stage."; the second press answered 500 (`POST
…/grid/settings/roles/user-group-grid/assign-stage`) with no notice and
left the box disabled, a third press sent nothing, and the reload showed
the box ticked; a second untick read "…unassigned from…" again with the
box still ticked; a switch to "Users" and back changed nothing. After
"{role} role removed." the row stayed; a press on its box answered 500
(`assign-stage` with the removed role's id) and greyed the box, and its
"Remove" › "OK" again answered 500 (`POST
…/user-group-grid/remove-user-group`) with no notice; the row was gone
after a reload.
Issue report: [docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md](../issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md).

<a id="fn-f-a6"></a>
**f-a6** — `$userGroup->userUserGroups()->count()` counts every
`user_user_groups` row of the group, ended ones included ([q](#fn-q));
ended assignments feed "Editorial History" (the *Journal identity & about
pages* spec's Rule 16). Live-probed 2026-09-26 (all three apps): a created
role whose only member had ended was refused with "Currently 1 user(s)",
one with a current and a past member with "Currently 2 user(s)".

<a id="fn-f-a7"></a>
**f-a7** — `abbrev` is required by `UserGroupForm` and stored; no
template, page component or API resource of the three apps or the
ui-library reads a group's abbreviation (`UserGroupResource` returns id,
role, default flag and name). Live-probed 2026-09-26 (all three apps): the
"Edit" windows filled the box ("CE", "SecE", "AcqE", "MOD", "EBM"); the
seeded created roles' abbreviations appeared in no text of the "Users"
list, "Editorial Masthead", a member's Profile › Roles, the Participants
panels or any other page visited.

<a id="fn-f-a8"></a>
**f-a8** — `selectStatusCell.tpl` renders each box as a bare `<input
type="checkbox" id="select-cell-…">` with no `<label>`, `aria-label` or
`title`. Live-probed 2026-09-26 (Fields; all three apps): every box of the
list's fourth row had none of the three.

<a id="fn-f-a9"></a>
**f-a9** — The two lists sit in `userGroupsGridFilter.tpl`'s form
(`#userGroupSearchForm`), which the header's "Search" link shows and hides
and which is hidden again after each choice submits it. Live-probed
2026-09-26: [d](#fn-d).

<a id="fn-f-a10"></a>
**f-a10** — The window's own check refuses only an empty box; the server's
check ([l](#fn-l)) refuses the spaces and answers with the form again,
shown under "Errors occurred processing this form" with the language name.
Live-probed 2026-09-26 (Rule 15b; all three apps): `update-user-group`
answered 200 with the refused form, the window stayed open with the notice
quoted in Rule 15b and no message under the boxes, and the page logged the
script error "Failed to execute 'appendChild' on 'Node': Unexpected token
','" on `management/settings/access`.

<a id="fn-f-a11"></a>
**f-a11** — The greyed box is the window's guard alone ([o](#fn-o)): a
disabled box is not posted, and `UserGroupForm::execute()` stores what is
posted, so the role is saved with `permitSettings` off. Live-probed
2026-09-26 (Rule 18; Actors row 7): the only holder of "Journal editor"
("Press editor"; OJS, OMP) and the only holder of a created manager-level
role (all three apps) opened the role's "Edit", saw the box ticked and
greyed and pressed "OK" with nothing changed ("Your changes have been
saved."; the post carried no `permitSettings`); Users & Roles then
answered "The current role does not have access to this operation." on a
reload and in a fresh sign-in, and the Journal Manager's "Edit" of the
role showed the box unticked and open.

<a id="fn-f-a12"></a>
**f-a12** — `updateStageOptions()` hides the stage section with
`hide('slow')`, an animation of about 600 ms, when no stage is left open
([k](#fn-k)). Live-probed 2026-09-26 (Fields; Rules 12, 16; all three
apps), three drives disagreeing: one (two runs, two level orders) read the
section on screen with every box greyed as "Create New Role" opened, with
"Reader" chosen right after "Reviewer" (OJS, OMP) and with "Reviewer" on a
preprint server; another read the "Production editor" window's section on
screen with its stages ticked and greyed; a third, waiting for the
animation to end and 700 ms more, read it hidden in all four states on all
three apps. Settles it: each of the four read two seconds after the window
opens or the level is chosen.

<a id="fn-f-a13"></a>
**f-a13** — `loadData()` sets no order ([b](#fn-b)), on OJS, OMP and
OPS alike (one lib/pkp handler), and each page is its own query,
`UserGroup::withContextIds()` with `offset()->limit()` and no `orderBy`,
so two page reads follow the rows' storage order at their own moment;
PostgreSQL rewrites an updated row wherever it has room. Code read
2026-09-26 (Rules 2, 4; scenario 1): a page repeating or skipping a role
was not driven. Live-probed
2026-09-26 (Rule 2; all three apps): a saved role moved down in every run.
In the first OJS run of the role window's check, two created roles were
listed above "Journal manager", the first with no arrow; in every later
run on the three apps created roles were listed at the end. Test run
2026-09-26 (Rule 2; OPS, scenario 1): a new server with nothing saved on
it listed "Author", "Reader", "Editorial Board Member", "Preprint Server
manager", "Moderator" ("1 - 5 of 5 items"), "Author" with no "Settings"
arrow and the manager row with one. Read in the test database, not on a
screen: the server's five roles, inserted manager first, sat in storage
order author, reader, Editorial Board Member, manager, moderator, the
first two in space freed by earlier deleted rows. The next run's new
server, its rows stored in insertion order, listed the table's order, as
the OJS and OMP runs of the same day did. Where a new row is stored:
each save is a new database connection, whose INSERT goes to a page
PostgreSQL's free space map offers, and once contexts and roles have been
removed and saved role windows rewritten, that is often an earlier page
than the context's own rows. Test runs 2026-09-28 (Rule 2; OJS scenario
3, six CI runs, each on a fresh database): the first attempt, at the same
position in the run each time, listed the "Data editor" just made
(Assistant, "Copyediting" ticked) as the first row with no "Settings"
arrow, above the 18 installed roles, "Journal manager" among them now
with its arrow; the retry on a new journal listed it last. Test run
2026-09-29 (OJS scenario 3): with the journal's other rows rewritten
after the new role's, it came first in 10 of 10 runs; without that, one
new journal in about eighty listed its created role first on the local
fleet. Scenarios 3 to 6 therefore start again on a new scratch journal
when, and only when, the row they open comes first ([s](#fn-s)).

<a id="fn-f-a14"></a>
**f-a14** — Test run 2026-09-26 (Side effects; scenario 4; all three
apps): after "Editorial Board Member"'s "Edit", "Role Name" replaced with
Advisory Board and "OK", the "Roles" tab read "Your changes have been
saved.", an "Advisory Board" row and no "Editorial Board Member" row; the
"Users" tab of the same page, opened without a reload, read "Editorial
Board Member" in Quinn Ashdown's "Roles" cell throughout ten seconds of
reads; after a reload the cell read "Advisory Board". The suites read the
tab after a reload.

<a id="fn-f-omp1"></a>
**f-omp1** — OMP's `locale/fr_CA/submission.po` leaves
`workflow.review.externalReview` empty, so the column heading prints the
key ([b](#fn-b)). Live-probed 2026-09-26 (Fields; all three apps, French
as a UI language): the press's columns read "Soumission", "Évaluation
interne", "##workflow.review.externalReview##", "Révision", "Production";
OJS printed French headings throughout.

<a id="fn-f-ops1"></a>
**f-ops1** — OPS `UserAccessForm` posts `restrictPreprintAccess`, but
`ops/schemas/context.json` has no such property:
`PKPBaseController::convertStringsToSchema()` skips it and
`SchemaDAO::updateObject()` stores only schema properties, so the value is
dropped while the save answers success; no OPS code reads it. OJS and OMP
declare `restrictArticleAccess` / `restrictMonographAccess` in their
schemas and read them ([t](#fn-t)). Live-probed 2026-09-26 (OPS1; Rule 23;
all three apps): on OPS the box ticked and saved read "Saved" and was
unticked after a reload, the context held no `restrictPreprintAccess`
value, and a signed-out visitor opened and downloaded a posted preprint's
"PDF" galley; on OJS and OMP the box was kept and applied ([t](#fn-t)).

<a id="fn-f-ops2"></a>
**f-ops2** — `Application::getRoleNames(true)` is lib/pkp's, not
overridden in OPS, so `ROLE_ID_REVIEWER` "Reviewer" is offered;
`getForbiddenStages(ROLE_ID_REVIEWER)` forbids Production, OPS's only
stage. OPS's locale has no `user.reviewerPrompt.optin`, which OJS and OMP
define and the shared Register template prints for each self-registering
Reviewer-level role. Live-probed 2026-09-26 (OPS2; Rules 3, 7; all three
apps): on OPS "Create New Role" and the level filter ("All Permission
Levels, Manager, Moderator, Assistant, Author, Reviewer") offered
"Reviewer"; the filter's "Reviewer" left "0 items"; choosing it in the
window hid "Stage Assignment", and the saved role's one "Production" box
was greyed and unticked; with self-registration ticked, the server's
Register page showed a box labelled "##user.reviewerPrompt.optin##" below
the privacy and notification boxes, with "Reviewing interests" under it,
where OJS and OMP read "Yes, request the {role} role." for their created
Reviewer-level role; on OJS and OMP "Reviewer" opened only the review
column(s). Live-probed 2026-09-29 (OPS2; all three apps, two runs, a
created Reviewer-level role "I29 Referee" on a fresh scratch context): on
OPS its only holder, and a holder of it beside Author, landed after every
sign-in, and at `dashboard`, `dashboard/reviewAssignments` and
`submissions`, on `dashboard/reviewAssignments` under the "Error" window
over a list headed "undefined (0)" ("No Items", "Showing 0 to 0 of 0"),
the side menu's "My Assignments as Reviewer" with no view under it; "OK"
closed the window and "Filters" › "Apply Filters" raised it again. The
list's `GET _submissions?…` answered 401 and the console logged
`TypeError: Cannot read properties of undefined (reading 'id')` (script
failure; no 500 and no uncaught page error). The Author's
`dashboard/mySubmissions` opened cleanly from the side menu; typed
`dashboard/editorial` gave the access-denied page. OPS's
`APP\submission\Repository::mapDashboardViews()` offers no reviewer
views, so the list falls back to the editorial request, which the role
is refused; `PKPPageRouter::getHomeUrl()` sends a Reviewer-level holder
with no manager, moderator or assistant role to the reviewer dashboard.
On OJS and OMP the same created role, alone or beside Author, landed on
"Action Required by me (0)" with the full reviewer side menu, as the
installed reviewer roles do.

<a id="fn-f-ops3"></a>
**f-ops3** — OPS's `locale/fr_CA/locale.po` translates
`user.role.subEditor` (English "Moderator") as "Éditeur-trice de série", a
press's word ([b](#fn-b)). Live-probed 2026-09-26 (Fields; all three apps,
French as a UI language): the "Permission level" cells read
"Administrateur-trice du serveur" and "Éditeur-trice de série" on the
manager and Moderator rows.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Users & Roles page, the "Roles" and "Site Access Options" tabs (hosted in the page the *Users management* spec owns) | Settings › Users & Roles (`{journal}/management/settings/access`) | VUE-013 |
| Settings dispatchers (riders; homed with *Journal identity & about pages*) | `ManagementHandler` `settings` / `access`, each app's `SettingsHandler`, `SettingsPage.vue` | ROUTE-017, ROUTE-042, ROUTE-063, ROUTE-078, VUE-022 |
| The roles list | "Roles" tab (`$$$call$$$/grid/settings/roles/user-group-grid/fetch-grid`) | GRID-048 |
| "Create New Role" | the list's top right (`add-user-group`, saved by `update-user-group`) | AFFM-109 |
| A row's "Edit" | the row's "Settings" arrow (`edit-user-group`) | AFFM-110 |
| A row's "Remove" | the row's "Settings" arrow (`remove-user-group`) | AFFM-111 |
| The stage boxes | each stage column (`assign-stage`, `unassign-stage`) | AFFM-112 |
| Filters and paging | above and under the list | AFFM-113 |
| "Site Access Options" form | the tab (`PUT {journal}/api/v1/contexts/{id}`) | AFFM-116 |
| Roles by stage (read by the task template window's role boxes) | `GET {journal}/api/v1/userGroups?stageIds={stage}` | API-046 |
| The role record | `lib/pkp/schemas/userGroup.json` | SET-028 |

Dead pieces recorded in `docs/tracking/UNASSIGNED.md` (item 35): the
grid's `fetchCategory` operation, the form's unreachable role-level and
stage validators.

## Reference — code anchors

- **Page**: `lib/pkp/pages/management/ManagementHandler.php` (`access()`);
  `lib/pkp/templates/management/access.tpl`; each app's
  `pages/management/SettingsHandler.php`.
- **Roles list**: `lib/pkp/controllers/grid/settings/roles/UserGroupGridHandler.php`,
  `UserGroupGridRow.php`, `UserGroupGridCellProvider.php`;
  `lib/pkp/templates/controllers/grid/settings/roles/userGroupsGridFilter.tpl`;
  `lib/pkp/templates/controllers/grid/common/cell/selectStatusCell.tpl`;
  `lib/pkp/classes/controllers/grid/GridHandler.php`,
  `feature/PagingFeature.php`, `feature/GeneralPagingFeature.php`;
  `lib/pkp/js/controllers/grid/GridHandler.js`,
  `lib/pkp/js/classes/features/PagingFeature.js`.
- **Role window**: `lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php`;
  `lib/pkp/templates/controllers/grid/settings/roles/form/userGroupForm.tpl`;
  `lib/pkp/js/controllers/grid/settings/roles/form/UserGroupFormHandler.js`.
- **Roles data**: `lib/pkp/classes/userGroup/UserGroup.php`,
  `Repository.php`, `relationships/UserGroupStage.php`;
  `lib/pkp/classes/security/RoleDAO.php` (`getForbiddenStages()`,
  `getAlwaysActiveStages()`); `lib/pkp/classes/workflow/WorkflowStageDAO.php`;
  each app's `registry/userGroups.xml` and `classes/core/Application.php`
  (`getApplicationStages()`, OJS `getRoleNames()`);
  `lib/pkp/api/v1/userGroups/UserGroupController.php`;
  `lib/pkp/schemas/userGroup.json`; `lib/pkp/classes/security/AuditLog.php`.
- **Site Access Options**: `lib/pkp/classes/components/forms/context/PKPUserAccessForm.php`;
  each app's `classes/components/forms/context/UserAccessForm.php` and
  `schemas/context.json`; `lib/pkp/classes/security/authorization/RestrictedSiteAccessPolicy.php`;
  OJS `pages/article/ArticleHandler.php`; OMP `pages/catalog/CatalogBookHandler.php`.
