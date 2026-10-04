# Reloading or bookmarking a Settings or Site Settings side tab opens the page's first tab

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#9280` for `pkp/pkp-lib#8919` · [da352e49d8](https://github.com/pkp/pkp-lib/commit/da352e49d820f4868917539c3f4bd6806c883708) · 2023-10-02 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U07 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#a7), spec U60 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a7)
- **Checked** 2026-10-03 (Site Settings 2026-10-04), each branch's tip (the commits in Evidence)

## Summary

A manager who opens a side tab on a Settings page, such as Settings ›
Website › "Setup" › "Privacy Statement", and then reloads the page or
comes back to it from a bookmark, expects the same tab. A top tab such
as Settings › Journal › "Contact" does come back. The side tab does not:
the page opens on its first tab, Website › "Appearance" › "Theme".

The tab is reopened by pressing the two tabs again, but a saved or
shared link to a side tab is no use.

It happens on the side tabs under every top tab except a page's first
one (Website › "Setup" and "Content", Workflow › "Review",
Distribution › "DOIs" among them) and on the inner tabs of Website ›
"Plugins". The Site Administrator meets it on Administration › Site
Settings: the side tabs under the top tabs "Appearance" and
"Announcements", and the inner tabs under "Plugins", reopen as "Site
Setup" › "Settings". Side tabs under a page's first top tab, such as
Website › "Appearance" › "Advanced", do come back.

## Impact

- **Lost**: the open tab. No data or settings.
- **Who**: journal, press and server managers on their Settings pages,
  and the Site Administrator on Site Settings, whenever they reload,
  bookmark or share a side tab's address.
- **Way round**: press the two tabs again.

Low: only the way back to a tab is broken. The "Edit" links a manager
sees on the public "Submissions" page and the "Information" pages (for
readers, authors, librarians) still open the right side tab.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. The Settings steps need nothing else; the Site Settings steps
  need a second journal (below).

Settings:

1. Sign in as `rvaca`, the journal's (press's, server's) manager.
2. Open Settings › "Website".
3. Press the "Setup" tab, then the "Privacy Statement" side tab. The
   address ends in `/management/settings/website#privacy`.
4. Reload the page.
5. Open the same address in a new browser tab, as a bookmark would.

**Expected**: steps 4 and 5 open "Setup" › "Privacy Statement" again,
and the address names both tabs.

**Observed**: steps 4 and 5 open "Appearance" › "Theme". The address
still reads `…/management/settings/website#privacy`.

The same happens on Settings › "Workflow" › "Review" › "Reviewer
Guidance" (OJS and OMP; a preprint server has no "Review" tab): the
address ends in `#reviewerGuidance`, and a reload opens "Submission" ›
"Disable Submissions".

Controls: Settings › Journal › "Contact" writes `#contact` and comes
back after a reload. Typing
`…/management/settings/website#setup/privacy` opens "Setup" › "Privacy
Statement", but the address is then rewritten to `#privacy`.

Site Settings (the page shows "Appearance", "Announcements" and
"Plugins" only while the site does not host exactly one journal, so a
second one is created first):

6. Sign in as `admin`, the Site Administrator.
7. Open Administration › "Hosted Journals" ("Hosted Presses", "Hosted
   Servers") › "Create Journal" ("Create Press", "Create Server"). Fill
   in "u60e Second Journal" as the title, `U60E` as the initials, "u60e
   Second Journal" and `u60e@mailinator.com` as the contact, "Canada" as
   the country and `u60esecond` as the path. Tick "English" under
   "Languages", choose "English" under "Primary locale", and tick
   "Enable this journal to appear publicly on the site". Press "Save".
8. Open Administration › "Site Settings". Press the top tab
   "Announcements", then its side tab "Announcement Types". The address
   ends in `#announcement-types`.
9. Reload the page.

**Expected**: "Announcements" › "Announcement Types" again.

**Observed**: "Site Setup" › "Settings". The address still ends in
`#announcement-types`.

The same happens for "Plugins" › "Plugin Gallery" (`#pluginGallery`)
and for "Appearance" › "Theme", which writes `#theme` when pressed,
though it is already open under "Appearance" by default.

## Cause

`Tabs.vue` in ui-library writes the open tab into the address in
`updateUrl()`. A `<tabs>` nested in a `<tab>` is meant to write both
ids, `#parent/child`:

```js
const hash =
	this.$parent.$options.name === 'Tab'
		? '#' + this.$parent.id + '/' + this.currentTab
		: '#' + this.currentTab;
```

`Tab.vue` declares no `name`. On Vue 2 (3.3 and 3.4), pkp-lib's
`js/load.js` registered it with `Vue.component('Tab', Tab)`, which sets
the definition's `name` to `'Tab'`, so the check matched. Since the
move to Vue 3, `load.js` registers it with `vueApp.component('Tab',
Tab)` (now through `VueRegistry.registerComponent()`), and Vue 3's
`app.component()` does not name the component. So the check never
matches, and every nested `<tabs>` writes its own tab's id alone.

When the page loads, `Page.vue`'s `openUrlHash()` splits the hash on `/`
and emits `open-tab` for each part. `#privacy` names only the side tab:
the nested `<tabs>` selects "Privacy Statement", but nothing opens its
top tab, "Setup", so the page shows its first top tab. `#setup/privacy`
opens both, which is the shape the app's own links use (the "Edit"
links in `frontend/pages/submissions.tpl` pass `anchor="setup/privacy"`
and `"submission/instructions"`, `information.tpl` passes
`"setup/information"`).

`updateUrl` is one `debounce(…, 100)` defined in the component's
`methods`, so it is shared by every `<tabs>` on the page: when the top
and the nested tabs both call it within 100 ms, only the last caller
writes. Opening `#setup/privacy` selects "Setup", then "Privacy
Statement", so the nested `<tabs>` writes last, today `#privacy` (with
the fix, `#setup/privacy`, which leaves the address as it is).

Reach:

- The `<tabs :track-history="true">` nested in a `<tab>` under any
  top tab but a page's first, which are all of them in the three apps'
  templates. Settings › Website: the side tabs of "Setup" (walked) and
  "Content" ("Comments"), and the inner tabs of "Plugins"; Settings ›
  Workflow: the side tabs of "Review" (walked);
  Settings › Distribution: the side tabs of "DOIs" and, in OJS, of
  "Archiving"; Administration › Site Settings: the side tabs of
  "Appearance" and "Announcements" and the inner tabs of "Plugins" (tabs
  the page shows once the site has more than one journal); a hosted
  journal's settings wizard: the inner tabs of "Plugins". These
  are read in the code (`website.tpl`, `workflow.tpl`,
  `distribution.tpl`, `additionalDistributionTabs.tpl`,
  `admin/settings.tpl`, `admin/contextSettings.tpl`), apart from the
  walked ones.
- A reload after following an "Edit" link on the public pages loses
  the tab, since the address is rewritten to the side tab's id alone.
- Not this cause: on Administration › Site Settings, the "Appearance"
  side tab "Setup" has the same id, `setup`, as the top tab "Site
  Setup", so `#appearance/setup`, the address the fix makes it write,
  opens "Site Setup" › "Settings" (checked by typing that address on
  today's code). It needs its own one-line change, a new id for that
  side tab in pkp-lib's `templates/admin/settings.tpl`, reported in
  [U60-A7-appearance-setup-tab-opens-site-setup.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U60-A7-appearance-setup-tab-opens-site-setup.md).
  With this fix and that one applied together, a reload reopens every
  side and inner tab of Site Settings (walked); this fix alone leaves
  "Appearance" › "Setup" opening "Site Setup".

## Proposed fix

Let a `<tab>` tell the `<tabs>` nested in it its id through
provide/inject, the channel the two components already use
(`registerTab`), instead of reading `$parent`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-side-tab-reload-opens-first-tab/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Tabs/Tab.vue
+++ b/lib/ui-library/src/components/Tabs/Tab.vue
+	provide() {
+		return {
+			// Lets a <tabs> nested in this tab name it in the URL hash (#parent/child)
+			parentTabId: this.id,
+		};
+	},
--- a/lib/ui-library/src/components/Tabs/Tabs.vue
+++ b/lib/ui-library/src/components/Tabs/Tabs.vue
+	inject: {
+		/** The id of the <tab> this <tabs> is nested in, if any */
+		parentTabId: {default: null},
+	},
 ...
-				const hash =
-					this.$parent.$options.name === 'Tab'
-						? '#' + this.$parent.id + '/' + this.currentTab
-						: '#' + this.currentTab;
+				const hash = this.parentTabId
+					? '#' + this.parentTabId + '/' + this.currentTab
+					: '#' + this.currentTab;
```

The injected id reaches the nearest `<tab>` above a `<tabs>`, not only
its direct parent, so a `<tabs :track-history>` placed anywhere inside
a `<tab>`, even inside another component, would get the prefix. No page
has one today: the only other `<tabs :track-history>`, in
`UserCommentsPage.vue`, is not inside a `<tab>`.

Tried on `main` on all three apps: with the fix in, the Steps write
`#setup/privacy`, and a reload and a new browser tab both open "Setup"
› "Privacy Statement". "Reviewer Guidance" writes
`#review/reviewerGuidance` and comes back after a reload. Top tabs are
unchanged with the fix in and out: "Contact" writes `#contact` and
Website › "Setup" writes `#setup`, and both come back after a reload.

**Alternatives**:

- Add `name: 'Tab'` to `Tab.vue`. One line, and it restores the check
  as written in 2020, but it still depends on `$parent`. In Vue 3 that
  is the component whose template holds the `<slot>` the `<tabs>` is
  placed in: a `<tab>` today, but any wrapper component placed between
  them would take its place and break the check again without a sign.
- Make `openUrlHash()` find the parent of a lone side-tab id and open
  it too. That would also mend addresses saved before the fix, but the
  page would need to know the tab tree, and it leaves the written
  address wrong. It could be added on top of the fix.

**What goes with it**:

- An address saved before the fix (`#privacy`) still opens "Appearance"
  › "Theme". With the fix in, that page's address is rewritten to
  `#setup/privacy` while "Appearance" › "Theme" stays open; a reload
  then opens the side tab (seen in the trial).
- The patch applies as written to `stable-3_5_0`'s ui-library.
- Test: an e2e check that a reload on a side tab keeps it, the cheap
  guard. A ui-library component test that a `<tabs>` nested in a
  `<tab>` writes `#parent/child` would need new dev dependencies:
  ui-library runs Vitest, for composables only, without
  `@vue/test-utils` and without a DOM environment (jsdom or happy-dom).

Small: the change reuses the provide/inject channel the two components
already share, needs
no data repair, and no API client, plugin or other screen relies on the
address's old shape.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/settings-side-tab-reload-opens-first-tab/walk.js)
  takes the Steps on all three apps as `rvaca` and records, after each
  press and reload, which top tab and side tab are open and the
  address's hash; it also walks the controls (Journal › "Contact",
  Website › "Appearance" › "Advanced", Workflow › "Review" › "Reviewer
  Guidance", the typed `#setup/privacy`):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/settings-side-tab-reload-opens-first-tab/walk.js`.
- The Site Settings steps were walked with the related report's script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-settings-appearance-setup-tab-opens-site-setup/walk.js)
  (its reload group), on 2026-10-04 on the same tips.
- Walks: OJS, OMP and OPS on `main` without the fix and on
  `stable-3_5_0` showed the Observed; `main` with the fix showed the
  Expected (Site Settings with both fixes in).
- Not driven: the browser's Back button.
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04, ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
    ui-library 280f98c5).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335); ui-library
    d4e01883.
  - **`stable-3_4_0`** (code): OJS d68934d0d1, OMP 0aec65441, OPS
    acd8ae704b; pkp-lib 767353f4fe, ui-library ee684b34.
  - **`stable-3_3_0`** (code): OJS ac77c9fb35, OMP 8e72fc883, OPS
    c5532e2161; pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads, beyond the files the Cause names: the shipped
  `js/build.js` on `main` (the `Tab` definition carries no `name`);
  every template with `track-history` in the three apps; on 3.5 the
  check at `Tabs.vue` line 141 and `vue` ^3.5; on 3.4 and 3.3 `vue`
  ^2.6.
- The trace: `git blame` on the check in `Tabs.vue` gives d00794e4
  ("pkp/pkp-lib#2773 Support URL history for tab navigation", Nate
  Wright, 2020-11-16), unchanged since apart from formatting. `git log -S"Vue.component('Tab', Tab)"` on pkp-lib's
  `js/load.js` gives da352e49d8, the Vue 3 migration, which replaced
  it with `vueApp.component('Tab', Tab)`; GitHub links it to
  `pkp/pkp-lib#9280`. Its ui-library side is 7f13651e (`pkp/ui-library#286`),
  which left `Tabs.vue`'s check as it was.
- Upstream: `pkp/pkp-lib#8743`
  ("UI routing by URL hash not working", closed, 3.4) was a different
  fault: the page read the hash before the tabs listened for it.
