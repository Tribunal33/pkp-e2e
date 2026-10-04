# Site Settings: going back to "Appearance" › "Setup" opens "Site Setup" instead

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6339` for `pkp/pkp-lib#2773` · [451766dfd7](https://github.com/pkp/pkp-lib/commit/451766dfd7f3538524a3545c23751de5617d9c86) · 2020-11-16 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04); `pkp/pkp-lib#6209` fixed the same clash on Settings › Website only
- **Tracked in** spec U60 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On Administration › Site Settings, a Site Administrator who goes back
to the "Appearance" side tab "Setup" with the browser's Back button
lands on the "Site Setup" tab instead. Both tabs are called `#setup` in
the page's address, and the page opens "Site Setup" for it. Pressing
"Appearance", then "Setup", reopens the tab.

The same clash means a reload or a bookmark cannot reopen "Appearance"
› "Setup". On 3.4 and 3.3 it is the only side tab of the page with that
problem. On 3.5 and `main` a reload reopens none of the page's side
tabs today, a separate fault
([pkp-e2e#784](https://github.com/jardakotesovec/pkp-e2e/issues/784));
once that is fixed, "Appearance" › "Setup" will be the one still
failing, so the two fixes belong together.

The page shows "Appearance" only when the site does not host exactly
one journal (press, server).

## Impact

Low: only the open tab is lost. No setting, content or message is
touched, and two presses reopen the tab.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded.
- A second journal, since the page hides "Appearance" while the site
  hosts exactly one: signed in as `admin`, open Administration ›
  "Hosted Journals" ("Hosted Presses", "Hosted Servers") › "Create
  Journal" ("Create Press", "Create Server"). Fill in "u60e Second
  Journal" as the title, `U60E` as the initials, "u60e Second Journal"
  and `u60e@mailinator.com` as the contact, "Canada" as the country and
  `u60esecond` as the path. Tick "English" under "Languages", choose
  "English" under "Primary locale", and tick "Enable this journal to
  appear publicly on the site". Press "Save".

1. Sign in as `admin`, the Site Administrator.
2. Open Administration › "Site Settings".
3. Press the "Appearance" tab. The address ends in `#appearance`.
4. Press the side tab "Setup". The address ends in `#setup`.
5. Press the side tab "Theme". The address ends in `#theme`.
6. Press the browser's Back button.

**Expected**: "Appearance" › "Setup" again, the tab of step 4.

**Observed**: the page switches to the "Site Setup" tab, on its side tab
"Settings". The address ends in `#setup`.

Control: on "Announcements", pressing the side tabs "Announcements"
then "Announcement Types", then Back, reopens "Announcements" ›
"Announcements" and leaves the top tab alone. Typed, the address
`…/index/admin/settings#appearance/theme` opens "Appearance" › "Theme",
but `…#appearance/setup` opens "Site Setup" › "Settings".

## Cause

`lib/pkp/templates/admin/settings.tpl` gives two tabs of one page the
same id, `setup`: the top tab "Site Setup" (line 29) and the
"Appearance" side tab "Setup" (line 117). A tab's id is its name in the
address and the id of its panel in the page (`Tab.vue`), and its
button's id is `<id>-button` (`Tabs.vue`), so the page holds two
elements each with the ids `setup` and `setup-button`.

When the address changes (Back, Forward, a reload, a typed address),
`Page.vue`'s `openUrlHash()` splits the hash on `/` and emits `open-tab`
for each part. Every `<tabs>` on the page listens (`Tabs.vue`,
`mounted()`) and opens any tab of its own with that id. For `setup`,
both the top `<tabs>` and the "Appearance" `<tabs>` have one, so the top
tab "Site Setup" opens, whatever the address meant. `#appearance/setup`
opens "Appearance" first and "Site Setup" right after.

Reach:

- Back or Forward to `#setup` from any tab (Back walked on `main` and
  3.5).
- A reload or a bookmark. On 3.4 and 3.3 the side tab writes
  `#appearance/setup`, since `Tabs.vue` adds the parent tab's id there,
  and a reload opens "Site Setup" (read in the code). On 3.5 and `main`
  every side tab of the page writes its own id alone and none survives
  a reload (pkp-e2e#784); with that fixed, the side tab writes
  `#appearance/setup`, which opens "Site Setup" › "Settings" (checked by
  typing that address on today's code).
- The other way round: after an address that names "Site Setup"
  (walked with a typed `#setup/settings`), "Appearance" opens on its
  side tab "Setup" instead of "Theme", because the same `open-tab` also
  selected the side tab.
- Assistive technology: the side tab's button names
  `aria-controls="setup"`, which the browser resolves to the first
  element with that id, the "Site Setup" panel (read in the live page).
- No other page has a clash: every tab id in the three apps' templates
  and pkp-lib's, included templates counted, is unique on its page
  (read in the code).

## Proposed fix

Give the "Appearance" side tab its own id, `appearance-setup`, the name
Settings › Website already gives its "Appearance" › "Setup" tab since
`pkp/pkp-lib#6209`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-settings-appearance-setup-tab-opens-site-setup/fix.diff)):

```diff
--- a/lib/pkp/templates/admin/settings.tpl
+++ b/lib/pkp/templates/admin/settings.tpl
@@ -114,7 +114,7 @@
 				</tab>
 				{/if}
 				{if $componentAvailability['siteAppearanceSetup']}
-				<tab id="setup" label="{translate key="navigation.setup"}">
+				<tab id="appearance-setup" label="{translate key="navigation.setup"}">
 					<pkp-form
 						v-bind="components.{PKP\components\forms\site\PKPSiteAppearanceForm::FORM_SITE_APPEARANCE}"
 						@set="set"
```

Tried on `main` on all three apps: with the fix in, the side tab writes
`#appearance-setup`, Back in step 6 reopens "Appearance" › "Setup", and
each id is held by one element. With pkp-e2e#784's fix also in, a
reload reopens "Appearance" › "Setup". What must not change did not,
checked with the fix in and out: the "Site Setup" tab and its side tab
"Settings" come back after a reload, a typed `#setup/settings` opens
them, and the "Appearance" › "Setup" form shows its fields. The one
difference is the intended one: after a "Site Setup" address,
"Appearance" now opens on "Theme".

**Alternatives**:

- Rename the top tab instead. It would break the links the app writes
  to it: `PKPRestrictBulkEmailsForm` links to `setup/bulkEmails`.
- Send each part of the address only to the `<tabs>` at its depth (the
  first part to the top tabs, the second to the tabs inside). That
  guards every page against a future clash, but it changes how
  `Tabs.vue` and `Page.vue` talk, for one clash the template can avoid;
  it could follow as its own change.

**What goes with it**:

- An address saved as `#appearance/setup` keeps opening "Site Setup".
  No link in the apps points to that side tab (read in the code).
- No REST API, plugin hook or pkp Cypress test names the side tab's id
  (read in the code). Plugins that add their own side tabs through
  `Template::Settings::admin::appearance` were not checked.
- The patch applies to `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0` with a line offset (the tab sits at line 109, 97 and
  81 there).
- Test: an e2e check that Back to, and a reload on, "Appearance" ›
  "Setup" keeps the tab.

Small: one id in one template, with no data repair and no API change.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-settings-appearance-setup-tab-opens-site-setup/walk.js)
  creates the second journal on screen, takes the Steps as `admin`, and
  records after each press, Back and reload which tabs are open, the
  address's hash, and how many elements carry the ids `setup` and
  `setup-button`; it also walks the control, the typed addresses and a
  reload on each side and inner tab of the page:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/site-settings-appearance-setup-tab-opens-site-setup/walk.js`.
- Walks: OJS, OMP and OPS on `main` without the fix and on
  `stable-3_5_0` showed the Observed; `main` with the fix showed the
  Expected; `main` with this fix and pkp-e2e#784's together.
- Not driven: 3.4 and 3.3 (read in the code); Forward; a screen reader.
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04, ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
    ui-library 280f98c5).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335).
  - **`stable-3_4_0`** (code): pkp-lib 767353f4fe, ui-library ee684b34.
  - **`stable-3_3_0`** (code): pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads, beyond the files the Cause names: the two `setup` ids at
  lines 29 and 109 on 3.5, 25 and 97 on 3.4, 25 and 81 on 3.3; on 3.4
  and 3.3 `Tabs.vue`'s `$parent` check, which writes `#parent/child`
  there, and `Page.vue`'s `openUrlHash()` (`openUrlTab()` on 3.3);
  every `<tab id>` in the three apps' and pkp-lib's templates; the
  links to `admin/settings` with an anchor (`PKPRestrictBulkEmailsForm`,
  `PluginGalleryGridHandler`).
- The trace: `git blame` on line 117 gives
  [c4985f94ae](https://github.com/pkp/pkp-lib/commit/c4985f94aea6577a1e6c513ad07de2ff839367e0)
  (`pkp/pkp-lib#5241` for `pkp/pkp-lib#4762`, Nate Wright, 2019-11-02),
  which added the page with both tabs named `setup`. Then the clash was
  only a duplicate HTML id. 451766dfd7 turned on `track-history` for the
  page's tabs (lines 27, 30 and 107), which made the ids part of the
  address and brought the Back and reload symptom, so it is named as
  the introducing change. The Website page's twin was fixed in
  [7606f7fa99](https://github.com/pkp/pkp-lib/commit/7606f7fa995d8a6c346f8bf566426a3edd3bd488)
  (`pkp/pkp-lib#7860`, 2022-04-14); Site Settings was left out.
