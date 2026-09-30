# A name or title abandoned in an "Edit" panel stays on the row, and the next "Save" stores it

- **Severity** medium · **Effort** small · **Kind** defect
- **Introduced** `pkp/ui-library#88` for `pkp/pkp-lib#5865` · [d0ffc05ab4](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3) · 2020-05-13 · Nate Wright (NateWr); copied into Institutions by `pkp/ui-library#213` (Bozana Bokan, bozana) and into Highlights by `pkp/ui-library#288` (Nate Wright, NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** specs U66 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a2), U12 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a11), U11 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a4) · **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

| Affects | main | 3.5 | 3.4 | 3.3 |
|---|---|---|---|---|
| OJS | yes | yes | yes (code) | yes (code) |
| OMP | yes | yes | yes (code) | yes (code) |
| OPS | yes | yes | yes (code) | yes (code) |

3.4 shows it on Highlights only where `[features] highlights` is on; 3.3 on Announcements only (no Institutions or Highlights there).

## Summary

A manager who changes an institution's "Name", an announcement's "Title"
or a highlight's "Title" in its "Edit" panel and closes the panel without
"Save" expects the change dropped, as a change to "IP ranges" or "URL"
is.
Instead the row shows the abandoned text as if it were saved, "Edit"
reopens with it, and the next "Save" of that item, made to change another
box, stores it without a word; a stored announcement title then shows on
the public Announcements page. Only reloading the page before editing
again brings the saved text back. Every journal, press and preprint
server, on announcements since 3.3 and on institutions and highlights
since they were added.

## Impact

What is lost: the item's saved name or title, replaced by text the manager
chose to throw away; it goes public on the Announcements page and the
home page's highlights, and on the institution's name wherever it is
shown (the Institutions list, statistics reports, a journal's
institutional subscriptions). Nobody
is told: the row shows the abandoned text at once, so the screen agrees
with what is later stored, and the manager has no cue that it was never
saved. Who meets it: a journal, press or server manager editing
institutions, announcements or highlights, when they abandon a change to
the name or title and then edit the same item again without reloading, a
common sequence when a manager starts an edit, thinks better of it and
fixes something else instead. Way round: reload the page after closing
an edit panel, or retype the name in "Name" before saving; nothing gets
worse with time. Medium: a wrong title can reach a public page silently,
but only after an abandoned edit and a second save of the same item, and
the text is in plain sight in the box; it would rise if a panel were
found that stores the abandoned text without a second edit.

## Steps to reproduce

Preconditions:
- A fresh install with its default languages, holding one journal (press,
  preprint server).
- A user with the Journal Manager role (Press Manager, Server Manager) of
  it, signed in.

Institutions:
1. Open the journal's Institutions page,
   `<journal>/management/settings/institutions` (Settings › "Institutions"
   in the side menu once institutional statistics are enabled).
2. Press "Add Institution", type "Campus Library" in "Name" and
   `10.1.0.0/16` in "IP ranges", and press "Save".
3. Press "Edit" on "Campus Library" and add " Draft" at the end of "Name".
4. Close the panel with its close control, without "Save". Read the row.
5. Press "Edit" on the row and read "Name".
6. Change "IP ranges" to `10.2.0.0/16` and press "Save".
7. Reload the page. Read the row, press "Edit" and read "Name" and "IP
   ranges"; close the panel.
8. Press "Edit", add " Esc" to "Name" and press Escape. Read the row.
9. Press "Edit", add " Out" to "Name" and click on the page outside the
   panel. Read the row.
10. Reload the page. Read the row.

Announcements:

11. Settings › Website › Setup › Announcements: tick "Enable
    announcements" and press "Save".
12. Open Announcements (`<journal>/management/settings/announcements`),
    press "Add Announcement", type "Call for papers" in "Title" and press
    "Save".
13. Press "Edit" on "Call for papers", add " Draft" to "Title" and close
    the panel with its close control. Read the row.
14. Press "Edit" on the row, read "Title", type "Deadline in May." in
    "Short Description" and press "Save".
15. Reload the page and read the row; open the journal's public
    Announcements page.

Highlights:

16. Settings › Website › Setup › Highlights: press "Add Highlight", type
    "Open call" in "Title", `https://example.org/call` in "URL" and "Read
    more" in "Button Label", and press "Save".
17. Press "Edit" on "Open call", add " Draft" to "Title" and close the
    panel with its close control. Read the row.
18. Press "Edit" on the row, read "Title", change "URL" to
    `https://example.org/call2` and press "Save".
19. Reload the page, read the row, press "Edit" and read "Title".

**Expected:** closing a panel without "Save" drops what was typed: the
rows of steps 4, 8, 9, 13 and 17 keep the saved name or title, "Edit"
reopens with it, and the saves of steps 6, 14 and 18 store only the box
changed there ("Campus Library" with `10.2.0.0/16`; "Call for papers";
"Open call").

**Observed:** step 4's row reads "Campus Library Draft" and step 5's
"Name" holds "Campus Library Draft". After step 6 and the reload of step
7 the row reads "Campus Library Draft", and "Edit" shows "Campus Library
Draft" with `10.2.0.0/16`: the abandoned name was stored. Step 8's row
reads "Campus Library Draft Esc", step 9's "Campus Library Draft Esc
Out"; after step 10's reload, "Campus Library Draft" again. Step 13's row
reads "Call for papers Draft" and step 14 reopens with it; after step 15
the row and the public Announcements page read "Call for papers Draft".
Step 17's row reads "Open call Draft" and step 18 reopens with it; after
step 19 the row and "Title" read "Open call Draft". No close asked
anything, and every save answered 200.

Control: "IP ranges" changed to `10.3.0.0/16` and the panel closed the
same way leaves the row as it was, and "Edit" reopens with the saved
`10.2.0.0/16`.

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

The form then writes a change into that object instead of replacing it:
`src/components/Form/Form.vue` `fieldChanged()`, line 522,
`field[prop][localeKey] = value`. Every keystroke in "Name" or "Title"
edits the row's own object. The row prints `localize(item.name)` or
`localize(item.title)`, so it shows the unsaved text at once; closing the
panel discards only the cloned form, never the row; and the next "Edit"
fills the form from the same, changed, row object, so its "Save" posts
the abandoned text with the rest. The rule broken: an edit form works on a
copy of the record, which the list itself intended by cloning the form.
A single-language value (`ipRanges`, rebuilt as a new string; `url`, `ror`)
is replaced, not written into, which is why the control keeps its saved
value.

Reach:
- Institutions `name`, Announcements `title`, `descriptionShort` and
  `description`, Highlights `title`, `description` and `urlText`: every
  multilingual box of the three panels. On screen for the names and
  titles on all three apps, main and 3.5; the descriptions and "Button
  Label" from the code, not driven.
- Other list panels checked in the code: Contributors and Reviewer
  Suggestions fill the form from a fresh copy fetched for the panel, and
  Submission Files' edit form has only a single-value "genreId", so none
  of them leaks.
- The same in-place write is repeated in the two forms that override
  `fieldChanged()`, `src/components/Form/context/DateTimeForm.vue` (line
  57) and `ThemeForm.vue` (line 21); their values do not come from a
  list row, so nothing shows there today.
- Stored data: an abandoned text stored by a later save looks like any
  edit and cannot be told apart.

## Proposed fix

A proposal, not tried. Make `Form.vue`'s `fieldChanged()` replace a
multilingual value instead of writing into it:

```js
// src/components/Form/Form.vue, fieldChanged()
if (localeKey) {
	field[prop] = {...field[prop], [localeKey]: value};
} else {
	field[prop] = value;
}
```

and the same line in the two overrides, `DateTimeForm.vue` and
`ThemeForm.vue`. The form is the writer that changes an object it does
not own, so the fix there covers the three panels and any list that hands
the form a row's values later. It follows the newer form code: the
`useForm` composable's `setValue()` assigns a new value
(`field.value = inputValue`) rather than editing the old one. The form
still sees the change at once, since the field object itself is updated
and emitted with `set`, as it is today for a single-language box.

Alternatives: cloning the values in each list, `field.value =
cloneDeep(institution[field.name])` in the three `openEditModal()`
methods (`cloneDeep` is already imported there), fixes the three panels
but leaves the next list that copies the pattern exposed; fetching the
item afresh on "Edit", as Contributors does, costs a request per opening
for the same result.

What goes with it: no caller relies on the write reaching the original
object (every form reads its values back through the emitted `set`); no
REST API or hook changes; no data repair is possible, as an abandoned text
stored by a later save looks like any edit. The same line applies as
written to 3.5 and 3.4, and to 3.3's `Form.vue` (line 404) for
Announcements; each app then takes the ui-library update and rebuilds its
scripts. Guard: an e2e scenario in U66, U12 and U11 (a Planned item each)
that changes the name or title, closes the panel, and checks the row and
the reopened box, and a Storybook play test on one list panel if the team
wants it in ui-library. Small: one line in the shared form and the same
in its two overrides, in one repo, following the pattern the newer form
code already uses.

## Evidence

- Kept script, taking the Steps and the control through the screens on
  each app:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=ir4 node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js`
  (stable-3_5_0: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front). The
  harness builds a new journal, press or preprint server and its manager
  account; everything else is created on screen. The walk types the
  Institutions page's address instead of opening it from the side menu;
  the Control is its step 11, so its Announcements and Highlights steps
  are numbered one higher than here, and it reads the public
  Announcements page by its address. The home page's highlight was not
  opened.
- Walked 2026-09-30 on PostgreSQL: main OJS 7ce98ec09e, OMP 3b0ecf794c,
  OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5);
  stable-3_5_0 OJS 040e916378, OMP 4f90dadac, OPS 0bb1ca0f6e (lib/pkp
  8809a197de, lib/ui-library 1a7a4750). All six showed the Observed above.
  The fault is in the browser, so the database does not bear on it.
- 3.4, by code: ui-library `stable-3_4_0` at ee684b34 (the three
  `openEditModal()` methods assign `field.value = <row>[field.name]`, and
  `Form.vue` line 434 writes `field[prop][localeKey] = value`), pkp-lib
  `stable-3_4_0` at df13621c2d (`PKPInstitutionForm` `name`, the
  announcement `title` and `HighlightForm` `title` multilingual;
  Highlights registered in `ManagementHandler` only under `[features]
  highlights`).
- 3.3, by code: ui-library `stable-3_3_0` at 96959f9e
  (`AnnouncementsListPanel.vue` `openEditModal()` assigns the row's
  value, the row prints `localize(item.title)`, `Form.vue` line 404 the
  same in-place write), pkp-lib `stable-3_3_0` at d446601ebe
  (`PKPAnnouncementForm` `title` multilingual,
  `ManagementHandler::announcements()` builds the list panel). 3.3 has no
  Institutions or Highlights list panel.
- Introduced: `git blame` on `Form.vue` line 522 reaches 7496b3c2c4 (the
  in-place write, before any list panel shared a row); on the three
  `openEditModal()` lines, d0ffc05ab4 (Announcements, the first list to
  hand a row's object to the form), adb7cd9d47 (Institutions) and
  0abe290a00 (Highlights); the PRs from the GitHub API's
  `commits/<sha>/pulls`.
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library (unsaved title or name after closing, changes without
  saving, `fieldChanged`, `openEditModal`, `cloneDeep`): nothing about
  this fault.
- Not driven: the descriptions and "Button Label" boxes, 3.4 and 3.3.
  Unverified: the proposed fix, not tried.
