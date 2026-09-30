# A name or title abandoned in an "Edit" panel is kept, and the next "Save" stores it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; Institutions and Announcements, and Highlights where `[features] highlights` is on)
  - 3.3: OJS, OMP, OPS (code; Announcements only)
- **Introduced** `pkp/ui-library#88` for `pkp/pkp-lib#5865` · [d0ffc05ab4](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** specs U66 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a2), U12 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a11), U11 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a4)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who changes an institution's "Name", an announcement's "Title"
or a highlight's "Title" in its "Edit" panel and closes the panel without
"Save" expects the change dropped, as a change to "IP ranges" or "URL"
is.

Instead the row shows the abandoned text as if it were saved, "Edit"
reopens with it, and the next "Save" of that item, made to change another
box, stores it without a word; it then shows wherever the item does,
public pages included.

On `main` the same happens to a category's title, a contributor role's
name and, on journals, a reviewer recommendation's title; a category's
row keeps showing the saved title, so only the reopened box holds the
abandoned one.

## Impact

- **Lost.** The item's saved name or title, replaced by text the manager
  threw away. It goes public on the Announcements page (the site's too,
  on a site with several journals), the home page's highlights, category
  pages and the contributor roles shown beside authors; an institution's name goes into the COUNTER
  usage reports its librarians download and, on journals, its
  institutional subscription.
- **Who.** A manager who abandons a change to a name or title and edits
  the same item again without reloading: a common sequence when an edit
  is started, dropped, and something else fixed instead.
- **Way round.** Reload the page after closing an edit panel, or retype
  the saved text before saving. Nothing gets worse with time.

Medium: a wrong title can reach a public page with no warning, but only
after an abandoned edit and a second save of the same item, and the
reopened box shows the abandoned text before that save; it would rise if
a panel were found that stores the abandoned text without a second edit.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its `publicknowledge` journal (press, preprint server) has no
  institutions and no highlights, and announcements are turned off.
- Nothing else: `rvaca` is its Journal Manager (Press Manager, Preprint
  Server Manager).

Institutions:

1. Sign in as `rvaca`.
2. Open the Institutions page by its address,
   `/index.php/publicknowledge/en/management/settings/institutions`
   (the side menu hides "Institutions" on the dataset).
3. Press "Add Institution", type "Campus Library" in "Name" and
   `10.1.0.0/16` in "IP ranges", and press "Save".
4. Press "Edit" on "Campus Library" and add " Draft" at the end of "Name".
5. Close the panel with its close control, without "Save". Read the row.
6. Press "Edit" on the row and read "Name".
7. Change "IP ranges" to `10.2.0.0/16` and press "Save".
8. Reload the page. Read the row, press "Edit" and read "Name" and "IP
   ranges"; close the panel.
9. Press "Edit", add " Esc" to "Name" and press Escape. Read the row.
10. Press "Edit", add " Out" to "Name" and click on the page outside the
    panel. Read the row.
11. Reload the page. Read the row.

Announcements:

12. Settings › Website › Setup › Announcements: tick "Enable
    announcements" and press "Save".
13. Open Announcements
    (`/index.php/publicknowledge/en/management/settings/announcements`),
    press "Add Announcement", type "Call for papers" in "Title" and press
    "Save".
14. Press "Edit" on "Call for papers", add " Draft" to "Title" and close
    the panel with its close control. Read the row.
15. Press "Edit" on the row, read "Title", type "Deadline in May." in
    "Short Description" and press "Save".
16. Reload the page and read the row; open the public Announcements page,
    `/index.php/publicknowledge/en/announcement`.

Highlights:

17. Settings › Website › Setup › Highlights: press "Add Highlight", type
    "Open call" in "Title", `https://example.org/call` in "URL" and "Read
    more" in "Button Label", and press "Save".
18. Press "Edit" on "Open call", add " Draft" to "Title" and close the
    panel with its close control. Read the row.
19. Press "Edit" on the row, read "Title", change "URL" to
    `https://example.org/call2` and press "Save".
20. Reload the page, read the row, press "Edit" and read "Title".

**Expected:** closing a panel without "Save" drops what was typed: the
rows of steps 5, 9, 10, 14 and 18 keep the saved name or title, "Edit"
reopens with it, and the saves of steps 7, 15 and 19 store only the box
changed there ("Campus Library" with `10.2.0.0/16`; "Call for papers";
"Open call").

**Observed:** step 5's row reads "Campus Library Draft" and step 6's
"Name" holds "Campus Library Draft".

After step 7 and the reload of step 8 the row reads "Campus Library
Draft", and "Edit" shows "Campus Library Draft" with `10.2.0.0/16`: the
abandoned name was stored. Step 9's row reads "Campus Library Draft Esc",
step 10's "Campus Library Draft Esc Out"; after step 11's reload,
"Campus Library Draft" again.

Step 14's row reads "Call for papers Draft" and step 15 reopens with it;
after step 16 the row and the public Announcements page read "Call for
papers Draft". Step 18's row reads "Open call Draft" and step 19 reopens
with it; after step 20 the row and "Title" read "Open call Draft".

No close asked anything, and every save answered 200.

Control: after step 11, "IP ranges" changed to `10.3.0.0/16` and the
panel closed with its close control leaves the row as it was, and "Edit"
reopens with the saved `10.2.0.0/16`.

## Cause

Each list opens its edit panel from a deep copy of the form, then fills
the copy's fields with the row's own values by reference, in lib/ui-library
`src/components/ListPanel/institutions/InstitutionsListPanel.vue`
`openEditModal()` (line 267, `field.value = institution[field.name]`),
`announcements/AnnouncementsListPanel.vue` `openEditModal()` (lines
264–269) and `highlights/HighlightsListPanel.vue` `openEditModal()` (line
278). A multilingual value (`name`, `title`, `description`, `urlText`) is
an object keyed by locale, so the form field and the row now hold the same
object.

The newer managers do the same through `src/composables/useForm.js`:
`setValues()` calls `setValue()`, which assigns the value it is given
(`field.value = inputValue`), so a row passed in hands over its own
objects. `CategoryManager/categoryManagerStore.js` `getCategoryForm()`
(`setValues({...category, …})`, a shallow copy),
`ContributorRoleManager/useContributorRoleManagerFormAddRole.js`
(`setValues({...contributorRole})`) and
`ReviewerRecommendationManager/reviewerRecommendationManagerStore.js`
`handleEdit()` (`setValues(item)`) all do.

The form then writes a change into that object instead of replacing it:
`src/components/Form/Form.vue` `fieldChanged()`, line 522,
`field[prop][localeKey] = value`. Every keystroke in "Name" or "Title"
edits the row's own object.

A row that prints the object (`localize(item.name)`,
`localize(item.title)`, `localize(role.name)`) shows the unsaved text at
once; the Categories row prints the API's `localizedTitle` string, so it
does not. Closing the panel discards only the cloned form, never the row,
and the next "Edit" fills the form from the same, changed, row object, so
its "Save" posts the abandoned text with the rest.

A single-language value (`ipRanges`, rebuilt as a new string; `url`,
`ror`) is replaced, not written into, which is why the Control keeps its
saved value.

Reach:

- Institutions `name`, Announcements `title`, `descriptionShort` and
  `description`, Highlights `title`, `description` and `urlText`: every
  multilingual box of the three panels. On screen for the names and
  titles; the descriptions and "Button Label" in the code.
- Administration › Site Settings mounts the same `announcements-list-panel`
  and `highlights-list-panel` (`AdminHandler`, `templates/admin/settings.tpl`),
  for the site's announcements and its home page's highlights: in the
  code, not walked, since those tabs show only on a site with two or
  more journals and the dataset has one. The site's Highlights tab cannot
  save any highlight on such a site today (U11
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a5)),
  so only its Announcements tab reaches the fault until that is fixed.
- On screen on `main` (none of these managers exists on 3.5), each item
  edited, its title or name changed, the panel closed with its close
  control, reopened and saved unchanged:
  - Settings › Journal (Press, Server) › Categories, "Edit Category":
    the row keeps "Applied Science", the reopened "Title" reads "Applied
    Science Draft", and the save stores it; all three apps.
  - Settings › Workflow › Submission › Contributor Roles, "Edit Role":
    the row reads "Translator Draft" and the save stores it; all three
    apps.
  - Settings › Workflow › Review › Reviewer Recommendations, "Edit
    Recommendation" (OJS; OMP and OPS do not offer it): the row reads
    "Accept Submission Draft" and the save stores it. Its side modal
    reloads the list on close only after a save, since ui-library
    [1afd40a9](https://github.com/pkp/ui-library/commit/1afd40a911253ce98327bd1130b6f6f8f35168a4)
    (`pkp/ui-library#853`, 2026-09-24); before it, the reload on every
    close hid the fault there (from the code, not walked).
- Checked in the code and clean: Contributors and Reviewer Suggestions
  fill the form from a fresh copy fetched for the panel; `FormModal.vue`
  fills it from a fetch; Funders and the author's review response build
  new objects for `setValues()` (a funder's name is replaced, not written
  into); Citations, Data Citations and Submission Files hand over
  single-language values only.
- The same in-place write is repeated in the two forms that override
  `fieldChanged()`, `src/components/Form/context/DateTimeForm.vue` (line
  57) and `ThemeForm.vue` (line 21); their values do not come from a
  list row, so nothing shows there today.
- Stored data: an abandoned text stored by a later save looks like any
  edit and cannot be told apart.

## Proposed fix

A proposal, not tried.

Recommended: make `Form.vue`'s `fieldChanged()` replace a multilingual
value instead of writing into it, and the same line in the two
overrides, `DateTimeForm.vue` and `ThemeForm.vue`:

```js
// src/components/Form/Form.vue, fieldChanged()
if (localeKey) {
	field[prop] = {...field[prop], [localeKey]: value};
} else {
	field[prop] = value;
}
```

`Form.vue` is the one writer every affected panel shares: the three list
panels and the Categories, Contributor Roles and Reviewer Recommendations
managers all render it, whichever way they fill it. Fixed there, it
covers all six and any later caller that hands the form a row's values.
It follows `FieldFunder.vue` `updateFunderName()`, which replaces a
funder's name object the same way (`{...currentValue.value.name,
[locale]: value}`). The form still sees the change at once, since the field object itself is
updated and emitted with `set`, as it is today for a single-language box.

**Alternatives:**

- Cloning at each caller: `field.value = cloneDeep(<row>[field.name])` in
  the three `openEditModal()` methods (`cloneDeep` is already imported
  there) and a deep copy before the three managers' `setValues()`. Six
  places, and the next caller that copies either pattern is exposed.
- `cloneDeep` inside `useForm`'s `setValue()`: it covers the managers but
  not the three list panels, which assign `field.value` themselves.
- Fetching the item afresh on "Edit", as Contributors does: a request per
  opening for the same result.

**What goes with it:**

- No caller relies on the write reaching the original object (every form
  reads its values back through the emitted `set`); no REST API or hook
  changes.
- Backport: the same line applies as written to 3.5 and 3.4, and to
  3.3's `Form.vue` (line 404) for Announcements; each app then takes the
  ui-library update and rebuilds its scripts.
- Guard: an e2e scenario in U66, U12 and U11 (a Planned item each) that
  changes the name or title, closes the panel, and checks the row and
  the reopened box, and a Storybook play test on one list panel if the
  team wants it in ui-library.

Small: one line in the shared form and the same in its two overrides, in
one repo.

## Evidence

- Kept scripts, on an install loaded from PKP's default test dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js),
    the Steps and the Control on each app:
    `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js`
    (stable-3_5_0: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front).
  - [reach.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/reach.js),
    the Categories, Contributor Roles and Reviewer Recommendations checks
    of the Reach, `main` only: the same command with `reach.js`.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c0f9f10](https://github.com/pkp/datasets/commit/c0f9f10d529f7dcd018c1a61d7084c16044f0162)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS 7ce98ec09e, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
    3dc90c81a6, lib/ui-library 280f98c5);
  - stable-3_5_0: OJS 040e916378, OMP 4f90dadac0, OPS 0bb1ca0f6e (lib/pkp
    8809a197de, lib/ui-library 1a7a4750).
  - The fault is in the browser, so the database does not bear on it.
- 3.4, by code:
  - ui-library `stable-3_4_0` at ee684b34: the three `openEditModal()`
    methods assign `field.value = <row>[field.name]`, and `Form.vue`
    line 434 writes `field[prop][localeKey] = value`.
  - pkp-lib `stable-3_4_0` at df13621c2d: `PKPInstitutionForm` `name`,
    the announcement `title` and `HighlightForm` `title` multilingual;
    Highlights registered in `ManagementHandler` only under `[features]
    highlights`.
- 3.3, by code: 3.3 has no Institutions or Highlights list panel.
  - ui-library `stable-3_3_0` at 96959f9e: `AnnouncementsListPanel.vue`
    `openEditModal()` assigns the row's value, the row prints
    `localize(item.title)`, `Form.vue` line 404 the same in-place write.
  - pkp-lib `stable-3_3_0` at d446601ebe: `PKPAnnouncementForm` `title`
    multilingual, `ManagementHandler::announcements()` builds the list
    panel.
- Introduced, traced with `git log -S` in ui-library (plain `git blame`
  shows the last commit to touch each line):
  - The in-place write: first in 7496b3c2c4 (2018-10-23,
    `pkp/pkp-lib#3594`, as `field.value[data.localeKey] = data.value`),
    rewritten to today's line in d0ffc05ab4, which `git blame` shows. It
    did no harm while no form held a row's object.
  - A row's object handed to the form: first in d0ffc05ab4
    (Announcements, `field.value = announcement[field.name]`; `git blame`
    on today's lines shows af709efd6, `pkp/pkp-lib#11556`, which only
    added the `dateExpire` formatting), then adb7cd9d47 (Institutions,
    `pkp/ui-library#213`, Bozana Bokan), 0abe290a00 (Highlights,
    `pkp/ui-library#288`, Nate Wright), b8a7af79 (Reviewer
    Recommendations), b35c06bc (Categories) and b628fd2b (Contributor
    Roles). The PRs from the GitHub API's `commits/<sha>/pulls`.
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library (unsaved title or name after closing, changes without
  saving, `fieldChanged`, `openEditModal`, `cloneDeep`): nothing about
  this fault.
