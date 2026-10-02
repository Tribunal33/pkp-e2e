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
- **Tracked in** specs U66 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a2), U12 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a11), U11 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a4), U47 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a5)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence); the "Media files" Steps again on `main` 2026-10-02

## Summary

A manager changes an institution's "Name", an announcement's "Title" or
a highlight's "Title" in its "Edit" panel, then closes the panel without
clicking "Save". The manager expects the change to be dropped, as a
change to "IP ranges" or "URL" is.

Instead, the row shows the abandoned text as if it were saved, and
"Edit" reopens with it. The next "Save" of that item, made to change
another box, stores the abandoned text without any warning. The text
then shows wherever the item shows, public pages included.

On 3.5 only institutions, announcements and highlights break;
highlights need no setting there or on `main`. On `main` the same also
happens to a category's title, a contributor role's name, on journals a
reviewer recommendation's title, and a media file's "Name of the file"
in "Edit Metadata" on a publication's "Media" page. There it happens even after
the editor answers "Yes" to "Do you wish to continue without saving?".
A category's row keeps showing the saved title, but its reopened
"Title" box shows the abandoned one, and the next "Save" stores it.

Every one of these windows goes wrong in the same shared form
component, so one change there fixes them all, the media window
included (tried).

## Impact

- **Lost.** The item's saved name or title, replaced by text the manager
  threw away. That text goes public on the Announcements page (also the
  site's, on a site with several journals), the home page's highlights,
  category pages and the contributor roles shown beside authors. An
  institution's name goes into the COUNTER usage reports its librarians
  download and, on journals, into its institutional subscription. On a
  journal or a press, an HTML galley finds its images by the media
  file's "Name of the file", so a web-resolution image saved under an
  abandoned name drops out of the readers' HTML page; a preprint server
  has no HTML galley plugin, and a high-resolution original is never
  shown there (read in the code, not walked).
- **Who.** A manager, or an editor on the "Media" page, who abandons a
  change to a name or title, then edits the same item again without
  reloading the page. This is a common sequence: an edit is started,
  dropped, and something else is fixed instead.
- **Way round.** Reload the page after closing an edit panel, or retype
  the saved text before saving. Nothing gets worse with time.

Medium: a wrong title can reach a public page with no warning. It takes
an abandoned edit and a second save of the same item, though, and the
reopened box shows the abandoned text before that save. It would be
higher if a panel were found that stores the abandoned text without a
second edit.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its `publicknowledge` journal (press, preprint server) has no
  institutions and no highlights, and announcements are turned off.
- No other setup: `rvaca` is its Journal Manager (Press Manager,
  Preprint Server Manager).
- For "Media files" only: a PNG image named `figure.png`, and a
  submission in Production: OJS submission 5, "Genetic transformation
  of forest trees"; OMP submission 4, "How Canadians Communicate:
  Contexts of Canadian Popular Culture"; OPS submission 1, "The
  influence of lactation on the quantity and quality of cashmere
  production". These steps were walked as `dbarnes`, the editor
  assigned to the OJS and OMP submissions; on OPS he is not assigned
  and opens it as the server's Preprint Server Manager.

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

Media files (`main` only):

21. Sign in as `dbarnes`, open the submission and go to "Publication" ›
    "Media" ("Preprint" › "Media" on a preprint server).
22. Press "Add Media File", choose `figure.png` with the file picker,
    choose "Image" and "Web resolution" on its card, and press "Upload
    Files".
23. On the "figure.png" row, open "More Actions" › "Edit Metadata" and
    replace "Name of the file" with "figure-1.png".
24. Press "Cancel", then "Yes" in the "Warning" dialog. Read the row.
25. Open "Edit Metadata" on the row again and read "Name of the file".
26. Type "Figure 1" in "Caption" and press "Save".
27. Reload the page and read the row.
28. Open "Edit Metadata", replace "Name of the file" with "figure-2.png",
    close the window with its close control, then press "Yes". Read the
    row.
29. Reload the page and read the row.

**Expected:** closing a panel without "Save" drops what was typed: the
rows of steps 5, 9, 10, 14, 18, 24 and 28 keep the saved name or title,
"Edit" ("Edit Metadata") reopens with it, and the saves of steps 7, 15,
19 and 26 store only the box changed there ("Campus Library" with
`10.2.0.0/16`; "Call for papers"; "Open call"; "figure.png" with the
caption "Figure 1").

**Observed:** at step 5 the row reads "Campus Library Draft", and at
step 6 "Name" shows "Campus Library Draft".

After step 7 and the reload of step 8 the row reads "Campus Library
Draft", and "Edit" shows "Campus Library Draft" with `10.2.0.0/16`: the
abandoned name was stored. After step 9 the row reads "Campus Library
Draft Esc", and after step 10 "Campus Library Draft Esc Out". After the
reload of step 11 it reads "Campus Library Draft" again.

At step 14 the row reads "Call for papers Draft", and at step 15 "Edit"
reopens with it. After step 16 the row and the public Announcements
page read "Call for papers Draft". At step 18 the row reads "Open call
Draft", and at step 19 "Edit" reopens with it. After step 20 the row
and "Title" read "Open call Draft".

No close of steps 5 to 18 asked for confirmation, and every save
returned 200.

On the "Media" page, step 24 first shows the "Warning" dialog: "The data
on this form has changed. Do you wish to continue without saving?".
After "Yes" the row reads "figure-1.png", and no request is sent. At
step 25 "Name of the file" reads "figure-1.png". The "Save" of step 26
sends the abandoned name with the caption and answers 200 (OJS):

```
PUT /index.php/publicknowledge/api/v1/submissions/5/publications/6/mediaFiles/46
name[en]=figure-1.png&name[fr_CA]=&caption=Figure 1&credit=&copyrightOwner=&terms=
```

After the reload of step 27 the row reads "figure-1.png": the abandoned
name was stored. At step 28 the row reads "figure-2.png", and after the
reload of step 29 "figure-1.png" again.

Control: after step 11, changing "IP ranges" to `10.3.0.0/16` and
closing the panel with its close control leaves the row as it was, and
"Edit" reopens with the saved `10.2.0.0/16`. On the "Media" page, a
"Caption" changed alone to "Figure 2" and left with "Cancel" › "Yes"
reopens as "Figure 1".

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
`handleEdit()` (`setValues(item)`) all pass a row in this way. The
"Media" page's "Edit Metadata" builds its form with `useForm` as well:
`MediaFileManager/useMediaFileManagerMetadataFormModal.js` gives the
"Name of the file" field the list row's own object
(`addFieldText('name', {…, value: mediaFile.name, isMultilingual:
true})`).

The form then writes a change into that object instead of replacing it:
`src/components/Form/Form.vue` `fieldChanged()`, line 522,
`field[prop][localeKey] = value`. Every keystroke in "Name" or "Title"
edits the row's own object.

A row that prints the object (`localize(item.name)`,
`localize(item.title)`, `localize(role.name)`) shows the unsaved text at
once; the Categories row prints the API's `localizedTitle` string, so it
does not. Closing the panel discards only the cloned form, never the
row. The next "Edit" fills the form from the same row object, which
already holds the change, so its "Save" posts the abandoned text with
the rest. On the "Media" page, "Yes" in the "Warning" dialog also
discards only the form: the row's name object keeps what was typed.
Since ui-library 1afd40a9 (`pkp/ui-library#853`) the "Media" list is
fetched again only after a save; before it, every close reloaded the
list and hid the fault there (read in the code).

A single-language value (`ipRanges`, rebuilt as a new string; `url`,
`ror`) is replaced, not written into, which is why the Control keeps its
saved value.

Reach:

- Institutions `name`, Announcements `title`, `descriptionShort` and
  `description`, Highlights `title`, `description` and `urlText`: every
  multilingual box of the three panels. Seen on screen for the names and
  titles; the descriptions and "Button Label" read in the code.
- Administration › Site Settings mounts the same `announcements-list-panel`
  and `highlights-list-panel` (`AdminHandler`, `templates/admin/settings.tpl`),
  for the site's announcements and its home page's highlights. This was
  read in the code, not reproduced: those tabs show only on a site with
  two or more journals, and the dataset has one. The site's Highlights
  tab cannot save any highlight on such a site today (U11
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a5)),
  so only its Announcements tab can show the fault until that is fixed.
- Seen on screen on `main` (none of these managers exists on 3.5): each
  item opened with "Edit", its title or name changed, the panel closed
  with its close control, then reopened and saved unchanged:
  - Settings › Journal (Press, Server) › Categories, "Edit Category":
    the row keeps "Applied Science", the reopened "Title" reads "Applied
    Science Draft", and the save stores it; all three apps.
  - Settings › Workflow › Submission › Contributor Roles, "Edit Role":
    the row reads "Translator Draft" and the save stores it; all three
    apps.
  - Settings › Workflow › Review › Reviewer Recommendations, "Edit
    Recommendation" (OJS; OMP and OPS do not offer it): the row reads
    "Accept Submission Draft" and the save stores it. Since ui-library
    [1afd40a9](https://github.com/pkp/ui-library/commit/1afd40a911253ce98327bd1130b6f6f8f35168a4)
    (`pkp/ui-library#853`, 2026-09-24), its side modal reloads the list
    on close only after a save. Before that commit, the list reloaded on
    every close, which hid the fault there (read in the code, not
    reproduced).
- Seen on screen, all three apps: a media file's "Name of the file" in
  "Edit Metadata" (Steps 21 to 29). The row prints
  `localize(mediaFile.name)` (`MediaFileManagerCellName.vue`). Read in
  the code, the same holds for the multilingual boxes of a
  supplementary file's "Edit Metadata" ("Description", "Creator (or
  owner) of file", "Publisher", "Source", "Subject", "Contributor or
  sponsoring agency"): no row shows them, so nothing changes on screen,
  but the next "Save" stores the abandoned text. An image's "Caption",
  "Credit", "Copyright Owner" and "Permission Terms" are single-language
  and keep their saved value (the Control).
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

A proposal, tried on `main` on all three apps
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/fix.diff)):
with it, the Steps (the "Media" page's included) and the Categories,
Contributor Roles and Reviewer Recommendations checks show the Expected:
the abandoned text is dropped on close and the next "Save" stores the
saved one. Ordinary edits in those seven windows and in a settings form
still save, in English and French; the "Warning" still asks before an
unsaved "Edit Metadata" closes.

Recommended: make `Form.vue`'s `fieldChanged()` replace a multilingual
value instead of writing into it, and change the same line in the two
overrides, `DateTimeForm.vue` and `ThemeForm.vue`:

```js
// src/components/Form/Form.vue, fieldChanged()
if (localeKey) {
	if (field[prop]?.[localeKey] !== value) {
		field[prop] = {...field[prop], [localeKey]: value};
	}
} else {
	field[prop] = value;
}
```

The check for a real change is needed. `FieldRichTextarea` watches its
value and emits it again whenever the value is a new object, so without
the check each emit makes another new object and the page freezes; the
first try, without it, froze Settings › Website › Setup › Announcements
on "Save".

`Form.vue` is the one writer every affected panel shares: the three list
panels, the Categories, Contributor Roles and Reviewer Recommendations
managers and the "Media" page's "Edit Metadata" all render it, whichever
way they fill it. A fix there covers all seven, and any later caller
that hands the form a row's values. It
follows `FieldFunder.vue` `updateFunderName()`, which replaces a
funder's name object the same way (`{...currentValue.value.name,
[locale]: value}`). The form still sees the change at once, since the
field object itself is updated and emitted with `set`, as it is today
for a single-language box.

**Alternatives:**

- Cloning at each caller: `field.value = cloneDeep(<row>[field.name])` in
  the three `openEditModal()` methods (`cloneDeep` is already imported
  there), a deep copy before the three managers' `setValues()`, and a
  deep copy of the whole media file (every multilingual value it passes,
  the supplementary file's included) in the media "Edit Metadata"
  window. That is seven places, and the next caller that copies either pattern still
  has the fault.
- `cloneDeep` inside `useForm`'s `setValue()`: it covers the managers but
  not the three list panels, which assign `field.value` themselves, nor
  the media window, which passes the value to `addFieldText()`.
- Fetching the item afresh on "Edit", as Contributors does: a request per
  opening for the same result.

**What goes with it:**

- No caller relies on the write reaching the original object (every form
  reads its values back through the emitted `set`); no REST API or hook
  changes.
- Backport: the same change, check included (3.5's `FieldRichTextarea`
  has the same watcher), applies as written to 3.5 and 3.4, and to 3.3's
  `Form.vue` (line 404) for Announcements; each app then takes the
  ui-library update and rebuilds its scripts. Tried on `main` only.
- Guard: an e2e scenario in U66, U12, U11 and U47 (a Planned item each)
  that changes the name or title, closes the panel, and checks the row
  and the reopened box, and a Storybook play test on one list panel if the
  team wants it in ui-library.

Small: one shared change of a few lines in the form, and the same in its
two overrides, in one repo; it covers all seven windows.

## Evidence

- Kept scripts, on an install loaded from PKP's default test dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js),
    the Steps and the Control on each app:
    `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js`
    (stable-3_5_0: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front).
  - [reach.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/reach.js),
    the Categories, Contributor Roles and Reviewer Recommendations checks
    of the Reach, `main` only: the same command with `reach.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/neighbour.js),
    an ordinary edit with a new English and French name or title in each
    of those six panels and in Masthead's acronym, then "Save" and a
    reload: the same command with `neighbour.js`.
  - [media.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/media.js),
    the "Media files" Steps (21 to 29) and their Control, then an
    ordinary rename saved with "Save" and read before and after a
    reload: the same command with `media.js`.
- The fix, tried on `main` with
  `node bin/try-fix.js apply shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/fix.diff ojs omp ops`
  (it rebuilds each app's scripts; `node bin/try-fix.js revert ojs omp ops`
  takes it out), then the three scripts above on a freshly loaded install:
  - with the fix, walk.js showed the Expected on all three apps (the rows,
    the reopened boxes and the stored values all "Campus Library", "Call
    for papers", "Open call"), and reach.js the same for Categories,
    Contributor Roles and Reviewer Recommendations;
  - neighbour.js stored every new value, English and French, with the fix
    and without it.
  - with the fix, media.js showed the Expected on all three apps; its
    ordinary rename ("figure-3.png") showed in the row at once and after
    a reload, and was stored, with the fix and without it.
  - Not driven with the fix: the date and time formats form
    (`DateTimeForm.vue`) and the theme options form (`ThemeForm.vue`).
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c0f9f10](https://github.com/pkp/datasets/commit/c0f9f10d529f7dcd018c1a61d7084c16044f0162)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS 7ce98ec09e, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
    3dc90c81a6, lib/ui-library 280f98c5);
  - stable-3_5_0: OJS 040e916378, OMP 4f90dadac0, OPS 0bb1ca0f6e (lib/pkp
    8809a197de, lib/ui-library 1a7a4750).
  - The "Media files" Steps were walked later the same day, each
    install freshly loaded from pkp/datasets
    [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
    (2026-09-30), with OJS on a newer tip (bade233f73, lib/pkp
    2e377d27fc); OMP, OPS and ui-library as above.
  - The "Media files" Steps and their Control were walked again on
    2026-10-02 with media.js, on all three apps, each install freshly
    loaded from pkp/datasets
    [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
    (2026-10-01): OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
    64d67363), OMP and OPS as above. Every app showed the Observed, the
    "Save" request of step 26 included, and no request failed. Neither
    ui-library commit since 280f98c5 touches `Form.vue` or
    `src/managers/MediaFileManager/`, and the fix applies as written.
  - The fault is in the browser, so the database does not bear on it.
- The "Media" page on 3.5, 3.4 and 3.3, by code: `stable-3_5_0`'s
  ui-library (1a7a4750) has no `src/managers/MediaFileManager/` and its
  pkp-lib (a9c76aed62) no media files API; the page came with
  ui-library 3f97137c (2026-05-06), after the 3.5 branch point.
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
  - The media "Edit Metadata" window: `value: mediaFile.name` since
    [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4)
    (`pkp/ui-library#794` for `pkp/pkp-lib#12262`, 2026-05-06, Blesilda
    Biazon), which `git blame` shows.
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library (unsaved title or name after closing, changes without
  saving, `fieldChanged`, `openEditModal`, `cloneDeep`), and again for the
  "Media" page (media file name without saving, media metadata name,
  `MediaFileManager`; `pkp/pkp-lib#12262` and its QA comments read):
  nothing about this fault. The "Media" page's searches were run again on
  2026-10-02, with the same result.
