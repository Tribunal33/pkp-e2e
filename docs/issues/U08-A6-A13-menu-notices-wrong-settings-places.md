# Navigation menu notices point managers to Settings tabs that do not exist; on presses and servers they also say "Journal"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS (the two notices only), OMP, OPS
  - 3.5: OJS (the two notices only), OMP, OPS
  - 3.4: OJS (the two notices only), OMP, OPS (code)
  - 3.3: OJS (the two notices only), OMP, OPS (code)
- **Introduced** no single change: the texts went wrong in several (traced in Evidence); present since at least [7f8282b139](https://github.com/pkp/pkp-lib/commit/7f8282b139f3501222a493ea577022fdb70e83d5) (2017-09-28)
- **Upstream** `pkp/pkp-lib#11346` (open, an enhancement to when the "Privacy Statement" item shows, which notes in passing that its notice names the wrong place); `pkp/pkp-lib#2949` (closed without a fix, asking that pkp-lib texts stop naming a journal, with the "About" notice as its example)
- **Tracked in** spec U08 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a6), [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Website › "Setup" › "Navigation", a menu's window marks
some items with a crossed-out eye. Such an item shows on the site only
under a condition, and pressing the eye opens a "Notice" that says where
that condition is set. Two of these notices name places that do not
exist:

- "Privacy Statement" points to "Settings > Workflow > Submissions". The
  privacy statement is on Settings › Website › "Setup" › "Privacy
  Statement".
- "Contact" points to "Settings > Contact". The contact is on Settings ›
  Journal › "Contact"; on a press Settings › Press › "Contact", on a
  preprint server Settings › Server › "Contact".

On a press and a preprint server, three more texts speak of a journal:

- the "About" item's notice: "…the About the Journal section under
  Settings > Journal.";
- the "About" type's description in "Add item": "Link to a page
  displaying the About the Journal content in Settings > Journal";
- the red warning on a menu item that has items under it, on the
  installed menus "About" and the item named after the manager's
  username: "…In the default menu, this is handled by creating a second
  menu item, "About the Journal", which appears in the submenu."

There the screens read "About the Press" and "Press" on a press, and
"About the Server" and "Server" on a preprint server. The "Contact"
notice names no journal there; only its place is wrong.

## Impact

- **Lost**: nothing; the notices only misdirect.
- **Who**: managers of every journal, press and preprint server who
  arrange menus and press an item's eye or warning to learn why it may
  not show.
- **Way round**: the side menu's "Settings" group leads to both tabs, and
  the manager finds the setting there after looking in the wrong place
  first.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS, OMP or OPS; context
  `publicknowledge`. Nothing to create: the installed menus hold every
  item the steps use.

Reading the notices:

1. Sign in as `rvaca` (the Journal manager; Press manager, Preprint
   Server manager).
2. Open Settings › Website, the "Setup" tab, its side tab "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. In the "Navigation" table press "Primary Navigation Menu".
4. In "Assigned Menu Items", press the crossed-out eye beside "Privacy
   Statement"; read the "Notice"; press "OK".
5. The same for "Contact".
6. The same for "About" (the top-level item).
7. Press the red warning icon beside "About"; read the "Notice"; press
   "OK".
8. Press "Cancel".
9. Under "Navigation Menu Items" press "Add item"; in "Navigation Menu
   Type" choose "About"; read the line under the list. Press "Cancel".

Following them:

10. In the side menu under "Settings", press "Workflow"; read the
    "Submission" tab's side tabs.
11. Read the side menu's "Settings" group.

Where the settings are:

12. Press "Website", then "Setup"; read the side tabs.
13. Press "Journal" ("Press", "Server"); read the tabs, and on
    "Masthead" the label of the box that holds the about text.

**Expected.** Each notice names the place that holds its setting: the
privacy statement on Settings › Website › "Setup" › "Privacy Statement",
the contact on Settings › Journal › "Contact" (Settings › Press ›
"Contact", Settings › Server › "Contact"). On a press, the "About"
notice, the "About" type's description and the warning name "About the
Press" and Settings › Press; on a preprint server "About the Server" and
Settings › Server.

**Observed.** On OMP:

```
Step 4  Notice: This link will only be displayed if you have entered a privacy statement
        under Settings > Workflow > Submissions.
Step 5  Notice: This link will only be displayed if you have filled out the Contact
        information under Settings > Contact.
Step 6  Notice: This link will only be displayed if you have filled out the About the
        Journal section under Settings > Journal.
Step 7  Notice: When a menu item opens a submenu, it's link can not be followed on all
        devices. For example, if you have an "About" item which opens a submenu with
        "Contact" and "Editorial Masthead", the "About" link may not be reachable on all
        devices. In the default menu, this is handled by creating a second menu item,
        "About the Journal", which appears in the submenu.
Step 9  Link to a page displaying the About the Journal content in Settings > Journal
Step 10 Disable Submissions · Author Guidance · Metadata · Components · Contributor Roles
Step 11 Settings: Press · Website · Workflow · Distribution · Users & Roles
Step 12 Information · Languages · Navigation · Announcements · Highlights · Lists ·
        Privacy Statement · Date & Time
Step 13 Masthead · Contact · Series · Categories; the box: "About the Press"
```

OPS reads the same with "Server" in step 11 and "About the Server" in
step 13. Its own tabs differ a little: step 12 has no "Information", and
step 13 lists "Sections" where a press has "Series".

On OJS steps 4 and 5 read the same. Steps 6, 7 and 9 name "About the
Journal" and "Settings > Journal", which match a journal's screens: step
11 reads "Settings: Journal …" and step 13's box "About the Journal".

## Cause

The texts are English strings in pkp-lib's `locale/en/manager.po`,
shared by the three applications.
`PKPNavigationMenuService::getMenuItemTypes()` gives each item type its
`description` (the line under "Navigation Menu Type", through
`PKPNavigationMenuItemsForm`) and its `conditionalWarning` (the eye's
notice). `NavigationMenuItemResource` adds
`manager.navigationMenus.form.submenuWarning` as the warning's text on
every item that has children.

Two notices are wrong on every application:

- `manager.navigationMenus.privacyStatement.conditionalWarning` was
  right when written in 2018 (`pkp/pkp-lib#3575`): the privacy statement
  was then on Settings › Workflow › "Submission". The settings redesign
  of `pkp/pkp-lib#3594` (3.2.0) moved it to the "Privacy Statement" side
  tab of Settings › Website › "Setup" (`templates/management/website.tpl`),
  and the notice was not changed.
- `manager.navigationMenus.contact.conditionalWarning` was added in 2017
  (`pkp/pkp-lib#2944`) as "Journal Settings > Contact" and shortened the
  next day to "Settings > Contact", which names no tab. The "Contact" tab
  is on the context's own settings page, Settings › Journal (Press,
  Server), in each application's `templates/management/context.tpl`.

Three texts were written for OJS in 2017 (`pkp/pkp-lib#2178`) and name a
journal: `manager.navigationMenus.about.description`,
`…about.conditionalWarning` and `…form.submenuWarning`. OMP and OPS give
none of them a text of their own. Once the contact notice names its
group ("Settings > Journal > Contact"), it names a journal too, so they
need their own copy of that one as well.

The applications already do this for these very texts: OJS's own
`locale/en/manager.po` overrides pkp-lib's
`manager.navigationMenus.mySubscriptions.conditionalWarning`. Each
application also words its own settings path in
`manager.setup.enableEnrollmentMasthead.description` ("See also
Settings > Press > Masthead."). `pkp/pkp-lib#2949` asked in 2017 for
these keys to move to the applications and was closed without the
change.

Reach:

- The older menu window of 3.5, 3.4 and 3.3 (`navigationMenuForm.tpl`,
  `NavigationMenuFormHandler.js`) shows the same texts.
- The other notices name places that exist or none: "Announcements"
  ("Settings > Website", on screen) and OJS's "Subscriptions" ("Settings
  > Distribution > Payments", code). OJS's own text for "My
  Subscriptions" names no place (code). The eye of these two OJS items
  never shows, a fault of its own.
- Left out: the site's own "Navigation" tab (Administration › "Site
  Settings") offers the same types with the same notices. There
  "Contact" and "Privacy Statement" never show, whatever is filled in:
  `getDisplayStatus()` shows them only within a journal. So no settings
  place is right for them on the site, and the corrected notices still
  point at settings that cannot make the item show. Whether the site
  should offer those types at all is an open question to the team.
- Left out: the "About" notice promises that the item hides while the
  about text is empty, and it never does. Whether the item or the notice
  should change is an open question to the team; this report changes the
  notice's words only.

## Proposed fix

A proposal: correct the two notices in pkp-lib, and give OMP and OPS
their own English texts for the four keys that name the context, in
their own `locale/en/manager.po`, as OJS already does for the "My
Subscriptions" notice. The diffs are against each application's root,
so the pkp-lib paths start with `lib/pkp/`:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-notices-wrong-settings-places/fix-ojs.diff)
(pkp-lib alone),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-notices-wrong-settings-places/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-notices-wrong-settings-places/fix-ops.diff).

```diff
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
 msgid "manager.navigationMenus.contact.conditionalWarning"
 msgstr ""
 "This link will only be displayed if you have filled out the Contact "
-"information under Settings > Contact."
+"information under Settings > Journal > Contact."
@@
 msgid "manager.navigationMenus.privacyStatement.conditionalWarning"
 msgstr ""
 "This link will only be displayed if you have entered a privacy statement "
-"under Settings > Workflow > Submissions."
+"under Settings > Website > Setup > Privacy Statement."
--- a/locale/en/manager.po   (OMP; OPS the same with "Server")
+++ b/locale/en/manager.po
+msgid "manager.navigationMenus.about.description"
+msgstr "Link to a page displaying the About the Press content in Settings > Press"
+
+msgid "manager.navigationMenus.about.conditionalWarning"
+msgstr "This link will only be displayed if you have filled out the About the Press section under Settings > Press."
+
+msgid "manager.navigationMenus.contact.conditionalWarning"
+msgstr "This link will only be displayed if you have filled out the Contact information under Settings > Press > Contact."
+
+msgid "manager.navigationMenus.form.submenuWarning"
+msgstr "When a menu item opens a submenu, … a second menu item, \"About the Press\", which appears in the submenu."
```

This keeps every existing translation of the pkp-lib keys. Tried on
`main`, on the three applications: the Steps then read the Expected.
Every other icon's text in the windows of both installed menus, and the
"Contact" and "Announcements" type descriptions, read the same with the
fix in and out.

**Alternatives**

- Neutral pkp-lib texts that name no context ("…on the Contact tab of
  the settings"): one repository, but the manager is told less, and
  "About the Journal" has no neutral name the screens use.
- A placeholder in the pkp-lib texts filled from `context.context` and
  `about.aboutContext` in `getMenuItemTypes()` and
  `NavigationMenuItemResource`: right for every application in every
  language once translated, but no pkp-lib text does that today.
- Move the keys from pkp-lib into each application, as
  `pkp/pkp-lib#2949` proposed: loses every existing translation.

**What goes with it**

- Other languages: the two changed pkp-lib texts go to translators as
  changed strings. The new OMP and OPS keys start untranslated, so
  other languages keep pkp-lib's text on presses and servers until
  their translators add them.
- If the team drops the "About" notice over its condition, the two
  "About" overrides go with it.
- Backport: the diffs apply to `stable-3_5_0` as written. On 3.4 the
  texts are the same. On 3.3 they are in `locale/en_US/manager.po`, and
  the warning there names "Editorial Team".
- The guard: an e2e check that presses the eye on "Privacy Statement"
  and "Contact" on the three applications, and on "About" on a press and
  a server, and reads the place each names (a Planned item in the U08
  spec).

Medium: text only, but in three repositories: two texts in pkp-lib, and
the same four new keys in OMP's and in OPS's own English locale file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-notices-wrong-settings-places/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-notices-wrong-settings-places/lib.js).
  It takes the Steps as `rvaca` on an install freshly loaded from the
  default dataset (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL), on
  `main` and on `stable-3_5_0`, and changes nothing; it opens the
  settings tabs of steps 10, 12 and 13 by the addresses the side menu's
  links lead to. On 3.5 the menu window is the older one; the Steps are
  the same. From a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/menu-notices-wrong-settings-places/walk.js`.
  With `neighbour` as the argument it reads the icon texts of the
  "Primary Navigation Menu" and "User Navigation Menu" windows (both
  panels) and the "Contact" and "Announcements" type descriptions; it
  ran with the fix applied (`node bin/try-fix.js apply <fix-app.diff>
  <app>`) and without. No request failed and no page script failed.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0`
  lib/pkp 9e41f10273, OMP 0aec65441, OPS acd8ae704b; `stable-3_3_0`
  lib/pkp ac3fa73402, OMP 8e72fc883, OPS c5532e2161.
- Code reads: `main` lib/pkp `locale/en/manager.po` lines 2680, 2707,
  2711, 2766, 2791; `PKPNavigationMenuService.php` `getMenuItemTypes()`
  and `getDisplayStatus()` (the `NMI_TYPE_CONTACT` and `NMI_TYPE_PRIVACY`
  cases); `NavigationMenuItemResource.php` lines 82–109;
  `templates/management/website.tpl` and each application's
  `templates/management/context.tpl`; OJS `locale/en/manager.po` line
  1542; OMP and OPS `locale/en/manager.po`. 3.5 lib/pkp `manager.po`
  lines 2511–2622. 3.4 and 3.3: lib/pkp's English `manager.po` and
  `website.tpl`, OMP's and OPS's English `manager.po` and
  `about.aboutContext` / `context.context`.
- Introduced, traced from each text through the PO conversion
  (`631efb9665`, 2019) and Weblate rewraps to `locale/en_US/manager.xml`:
  - The three "About the Journal" texts:
    [7f8282b139](https://github.com/pkp/pkp-lib/commit/7f8282b139f3501222a493ea577022fdb70e83d5),
    2017-09-28, written by Nate Wright (NateWr), committed and merged by
    Dimitris Efstathiou (defstat) through `pkp/pkp-lib#2813` for
    `pkp/pkp-lib#2178`.
  - The contact notice: added as "Journal Settings > Contact" in
    [fcc23735de](https://github.com/pkp/pkp-lib/commit/fcc23735dea45cffaa7c2fa9a4e744b33f818caa)
    (2017-10-25) and shortened to "Settings > Contact" in
    [4ce9b2e400](https://github.com/pkp/pkp-lib/commit/4ce9b2e400bfe2db0ef79d557ded7faf3f215704)
    (2017-10-26), both `pkp/pkp-lib#2948` for `pkp/pkp-lib#2944`,
    Dimitris Efstathiou (defstat).
  - The privacy notice: written right in
    [8235a21f27](https://github.com/pkp/pkp-lib/commit/8235a21f27b1299a0234aee6c761d6f491b0c68a)
    (2018-05-10, `pkp/pkp-lib#3682` for `pkp/pkp-lib#3575`), made wrong
    by the move in
    [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3)
    (2018-10-23, `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594`), both Nate
    Wright (NateWr).
- Not driven: the site's own "Navigation" tab (code). Unverified: the
  texts of languages other than English (not read).
