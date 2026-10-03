# Screen readers announce the editorial header's "i" (help) icon as "##common.help##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no help icon in the header)
  - 3.3: none (code; no help icon in the header)
- **Introduced** `pkp/ui-library#580` for `pkp/pkp-lib#10779` · [d0d5dfb938](https://github.com/pkp/ui-library/commit/d0d5dfb9389e8d3b80ef6985eefd01dfa4b41aaa) · 2025-04-10 · Blesilda Ramirez (blesildaramirez)
- **Upstream** `pkp/pkp-lib#12719` (open) is this same fault, reported on OMP 3.5 only; this report widens it to OJS, OMP and OPS on `main` and 3.5
- **Tracked in** spec U08 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The "i" icon at the top right of every editorial page should be
announced as "Help". A screen reader announces it as the raw
translation key "##common.help##" instead, in every language, English
included. Editors meet it on every editorial page; Authors on My
Submissions, the submission form, their submission's page and their
profile.

The same icon sits again in the dark bar atop each window that slides
in from the right, such as the Tasks window, with the same name there.

Sighted users never see the raw key: the icon shows no text and has no
tooltip. It still opens the "Learning OJS" ("Learning OMP", "Learning
OPS") guide in a new tab.

## Impact

- **Lost**: nothing.
- **Who**: every signed-in user who uses a screen reader or voice
  control, editors and authors alike, on every visit.
- **Way round**: a screen-reader user can press the link anyway and find
  the guide open in a new tab. A voice-control user cannot say "Help",
  but can pick the link by the numbers their tool lays over the page
  ("Show numbers" in macOS Voice Control), as with any unnamed control.

Low: the link works for everyone and leads only to the guide; a
screen-reader user hears a code before pressing it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same). Nothing
  is created.
- A screen reader (VoiceOver: Cmd+F5 on a Mac; NVDA on Windows), or the
  browser's accessibility inspector. In Chrome, right-click the icon and
  choose "Inspect": that selects the icon's inner `<svg>`, whose name is
  empty, so select its parent `<a>` in the Elements pane and read
  "Name" in the "Accessibility" pane.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). The Dashboard
   opens.
2. At the top right of the dark header, left of the bell, is an "i"
   icon. Tab to it (or inspect it) and read its name.
3. Press the bell. The "Tasks" window opens from the right, with a dark
   strip atop it holding the same "i" icon, the bell and the initials.
   Read the strip's "i" icon's name. Close the window.
4. Press the initials "DB" at the top right and, under "Change
   Language", press "français". Read the "i" icon's name again, and the
   bell's.
5. Sign out, sign in as `ccorino` (an Author; on OMP `aclark`), and read
   the "i" icon's name on the page they land on.

**Expected:** the icon is named "Help" ("Aide" in French), as the bell
is named "Tasks" ("Tâches").

**Observed:** at every step the icon's name is the same raw key, in the
header, in the window's strip, in French and for the Author:

```
link "##common.help##"   → https://docs.pkp.sfu.ca/learning-ojs/  (opens in a new tab)
button "Tasks 2"          (French: "Tâches 2")
```

OMP and OPS read the same, with their own guides' addresses.

## Cause

The icon is ui-library's `TopNavActions` component, used in the header
by pkp-lib's `templates/layouts/backend.tpl` and in the strip by
`SideModalBody.vue`. Its link names itself with a visually hidden span
([`TopNavActions.vue` line 11](https://github.com/pkp/ui-library/blob/64d67363/src/components/TopNavActions/TopNavActions.vue#L11)):

```vue
<span class="-screenReader">{{ t('common.help') }}</span>
```

No locale file defines `common.help`: not pkp-lib's, not any app's or
plugin's, in any language, on `main` or 3.5. ui-library's Storybook mock
(`public/globals.js`) even lists it with the raw key as its text,
`'common.help': '##common.help##'`, so the component's stories look as
broken as the app. The build lists every key the components
use in `registry/uiLocaleKeysBackend.json`, and
`UITranslator::getTranslationStrings()` hands the browser
`Locale::get()` for each of them, which is the key wrapped in `##` when
no text exists.

The span came in with the icon itself in d0d5dfb938 (`pkp/ui-library#580`,
"Redesigned Workflow rcX - Help modal"), merged with its pkp-lib side
`pkp/pkp-lib#11222`
([ba8706a6dd](https://github.com/pkp/pkp-lib/commit/ba8706a6dd36e9e8a08cdd90bf8a6baf960a3922)).
That pkp-lib change removed the "Help" links the icon replaces: the
`{help}` Smarty function, whose default label key was `help.help`
("Help"), and its template `templates/common/helpLink.tpl`. That key is still in
pkp-lib's `common.po`, translated in 52 of its 71 locales ("Aide" in
French), and nothing reads it any more.

Reach:

- Every editorial page of a signed-in user (the header), and every
  `SideModalBody` window, for example the Tasks window, the workflow and
  the windows opened from it (`SideModalBodyLegacyAjax` is built on it
  too).
- Public pages are not affected: their header is the theme's, without
  this icon (code).
- The same mistake, a key that a component uses and no locale file
  defines, appears in a few other components on `main`; each shows on
  its own screen and has its own report, so this fix leaves them out:
  `common.expand`
  ([U16 A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-A12-select-categories-column-raw-code.md)),
  `userAccess.management.options`
  ([U53 A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A5-users-list-row-button-raw-key.md)),
  `manager.category.delete.message`
  ([U16 A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-A18-delete-category-box-unnamed.md)),
  `invitation.wizard.completeSteps` and `invitation.wizard.errors`
  ([U06 A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A7-invitation-steps-raw-labels.md)).

## Proposed fix

In ui-library, name the link with `help.help`, the default key of the
removed `{help}` links, and drop the Storybook mock's raw entry
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/help-icon-raw-key-name/fix.diff)):

```diff
 # lib/ui-library/src/components/TopNavActions/TopNavActions.vue
 				<Icon icon="HelpTopNav" class="h-7 w-7"></Icon>
-				<span class="-screenReader">{{ t('common.help') }}</span>
+				<span class="-screenReader">{{ t('help.help') }}</span>
 # lib/ui-library/public/globals.js
-		'common.help': '##common.help##',
```

`help.help` is already "Help" in English and translated in 52 of
pkp-lib's 71 locales, so the link gets its name in those languages at
once, with no new text to translate. The build adds the key to
`registry/uiLocaleKeysBackend.json` by itself, and the mock already
holds `'help.help': 'Help'`. No app code reads either key, and no API,
plugin hook or stored data is involved.

Tried on `main`, on all three apps: with the diff applied and the
JavaScript rebuilt, the walk showed the Expected ("Help" in the header
and the Tasks window's strip, "Aide" in French, the same for the
Author). The rest of the header (the skip links, the context name, the
bell, the initials) and every other raw key on the Dashboard, in
English and French, read the same with the fix in and out. The
Storybook line was added to the diff after the trial; it touches no
app code, so it was not tried again.

**Alternatives**

- Add `common.help` with "Help" to pkp-lib's `locale/en/common.po`: the
  same result in English, but a second key for the same word, which
  every other language must translate again before it stops showing
  the code, while `help.help` stays unused.
- Give the link an `aria-label` or `title` instead of the hidden span:
  it changes how the name is built, not where it comes from, and still
  needs a defined key.

**What goes with it**

- Each app's `lib/ui-library` submodule moves to the fixed commit.
- Backport: `TopNavActions.vue` and `help.help` are the same on
  `stable-3_5_0`, so the diff applies there as written.
- Guard: an end-to-end check that the header's help link has a name
  with no `##`. A build-time check that every key in
  `uiLocaleKeysBackend.json` has an English text would catch the whole
  class, the components listed under Cause included.

This is a proposal; the team decides. Small: one line in one component
and one in the Storybook mock, tried, with one end-to-end check.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/help-icon-raw-key-name/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/help-icon-raw-key-name/lib.js)
  takes the Steps as `dbarnes` and the Author on an install freshly
  loaded from the default dataset (pkp/datasets e8dafbc, 2026-10-02,
  PostgreSQL; the database plays no part). From a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/help-icon-raw-key-name/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  `WALK_MODE=neighbour` is the check run with the fix in and out. No
  request failed and no page script failed.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS. The walk read
  the link's accessible name and its hidden text; no real screen reader
  was run.
- Tips: OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363); OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c5); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246c, OPS 38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library`
  d4e01883); `stable-3_4_0` `lib/pkp` 9e41f10273, `lib/ui-library`
  ee684b34; `stable-3_3_0` `lib/pkp` ac3fa73402, `lib/ui-library`
  96959f9e.
- Code reads: the files under Cause on `main` and 3.5, the same in the
  three apps. On 3.4 and 3.3, ui-library has no `TopNavActions.vue` and
  pkp-lib's `backend.tpl` has no help icon in the header (the help
  panel's links read `help.help`); no code reads `common.help`.
- Introduced: `git log -L` on line 11 of `TopNavActions.vue` ends at
  d0d5dfb938, the commit that created the component.
- Other instances: the keys in each app's `uiLocaleKeysBackend.json`
  with no English text on `main` were listed by a script; besides
  `common.help`, the ones all three apps share are those under Cause,
  and the rest belong to one app's screens.
- Upstream: `pkp/pkp-lib#12719` has no linked PR; its text calls the
  links "Dashboard", "Submissions", but its HTML is this help link.
- Not driven: languages other than English and French (Canada); side
  windows other than Tasks; the Author's pages other than My
  Submissions (code: the submission form and the profile page use the
  same editorial layout, and their submission opens in a side window); a voice-control tool's numbered labels.
