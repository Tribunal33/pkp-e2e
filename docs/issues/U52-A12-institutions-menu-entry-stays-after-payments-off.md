# After a journal switches payments off, the side menu keeps "Institutions" until the page is reloaded

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no Institutions page)
- **Introduced** `pkp/ui-library#213` for `pkp/pkp-lib#6782` · [adb7cd9d47](https://github.com/pkp/ui-library/commit/adb7cd9d478b4378819aedb3265ad42ab1646938) · 2021-06-25 (merged 2022-07-23) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a journal manager saves Settings › Distribution › "Payments" with
"Enable" unticked, the side menu drops "Payments" at once but keeps
"Institutions", although ticking "Enable" had added the two together.
"Institutions" goes only when the page is next loaded.

Nothing is lost: the setting is saved, and the stray entry still opens
the Institutions page. Reloading the page, or opening any other, shows
the right menu.

It happens while the journal's institutional statistics are off, the
default. With them on, "Institutions" belongs in the menu for the
statistics anyway, so it rightly stays. Only a journal's side menu
follows "Enable": a press has the "Payments" tab too, but its side menu
never gains either entry.

## Impact

- **Lost.** No data. Until the page is left, a manager who presses the
  stray entry reaches the Institutions page, which the journal does not
  otherwise offer them.
- **Who.** A journal manager or editor who switches payments off, a
  rare change in ordinary use.
- **Way round.** None needed: the next page load corrects the menu.

Low: one page's side menu is wrong, with no data at stake.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (journal
  `publicknowledge`). Its payments are off, and institutional statistics
  are off for the site and the journal.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Distribution, then the "Payments" tab. The side menu
   has neither "Institutions" nor "Payments".
3. Tick "Enable" and press "Save". "Saved" shows, and the side menu
   gains "Institutions" and "Payments" above "Settings".
4. Untick "Enable" and press "Save".

**Expected.** After step 4 the side menu loses both entries that step 3
added, as it does when the page is loaded again.

**Observed.** After step 4 "Saved" shows and "Payments" leaves the side
menu, but "Institutions" stays above "Settings", still there five
seconds later. Every request answered 200 and no page script failed.

After a reload neither entry shows.

## Cause

The side menu is built on the server at each page load. In OJS,
`APP\template\TemplateManager::setupBackendPage()`
(`classes/template/TemplateManager.php`, line 189 on `main`) adds
"Payments" and "Institutions" together while the journal's
`paymentsEnabled` is on. `PKPTemplateManager::setupBackendPage()` also
adds "Institutions" while `Context::isInstitutionStatsEnabled()` is true.
So "Institutions" has two reasons to be there.

On the settings page itself, the ui-library's `SettingsPage.vue`
(`src/components/Container/SettingsPage.vue`, the `form-success`
listener in `mounted()`) changes the menu after a save without a
reload. On a payments save with `paymentsEnabled` on, it adds both
`institutions` and `payments`. With it off, it deletes `payments` only:

```js
if (!context.paymentsEnabled && !!this.menu['payments']) {
	let menu = {...this.menu};
	delete menu.payments;
	this.menu = menu;
}
```

`institutions` is deleted only after a statistics save, and only while
`payments` is absent from the menu. The payments branch has no way of
knowing whether institutional statistics still need the entry, so it
leaves it.

The payments branch has two arms. The `else if` arm, for "Enable" saved
ticked, adds `institutions` and `payments`. The `if` arm above, for
"Enable" saved unticked, deletes only `payments`. The Introduced change
added `institutions` to the `else if` arm and wrote the statistics
block, but left the `if` arm unchanged.

Reach:

- OJS only: OMP's distribution page sets no `paymentsNavLink`, so the
  payments branch never runs there, and OPS has no "Payments" tab
  (checked in the code).
- The statistics branch already handles the opposite case: "Enable
  institutional statistics" saved unticked while payments are on keeps
  "Institutions" (checked on screen).

## Proposed fix

Have `SettingsPage.vue` track whether institutional statistics are on,
and let the payments branch delete `institutions` when they are off.
This is a proposal. The patch is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/fix.diff),
against the app root (inside `lib/ui-library`, `git apply -p3`); an
excerpt:

```diff
 			institutionsNavLink: {},
+			institutionStatsEnabled: false,
 			paymentsNavLink: null,
 		};
 	},
 	mounted() {
+		// Institutional statistics also keep the institutions nav link
+		const statisticsField = this.components[
+			pkp.const.FORM_CONTEXT_STATISTICS
+		]?.fields?.find((field) => field.name === 'enableInstitutionUsageStats');
+		this.institutionStatsEnabled = !!statisticsField?.value;
+
 		pkp.eventBus.$on('form-success', (formId, context) => {
@@
 					delete menu.payments;
+					if (!this.institutionStatsEnabled) {
+						delete menu.institutions;
+					}
 					this.menu = menu;
@@
 			if (formId === pkp.const.FORM_CONTEXT_STATISTICS) {
+				this.institutionStatsEnabled = !!context.enableInstitutionUsageStats;
```

The flag starts from the statistics form the page already holds. That
form shows "Enable institutional statistics" only while the site allows
them. Its value is the journal's own setting, or the site's when the
journal has none, which is the rule of
`Context::isInstitutionStatsEnabled()`. A statistics save then updates
the flag from the saved value. This mirrors the guard the statistics
branch already has on `payments`.

Tried on `main`, OJS: after step 4 both entries leave the side menu. A
second check turned institutional statistics on for the site and the
journal. "Institutions" then stayed after "Enable" was saved unticked,
with and without the fix, both on the page where the statistics were
saved and on a freshly loaded one. Next, with the statistics saved off
and payments still on, "Institutions" stayed. Finally payments were
saved off: with the fix "Institutions" left the menu, without it the
entry stayed.

**Alternatives**

- Delete `institutions` on every payments-off save. That takes the entry
  away from a journal whose institutional statistics still need it.
- Reload the page after a payments save, as the comments setting does.
  That works without any state, but the manager loses their place on
  the page for a one-entry change.
- Have the server pass a flag in the page state. The result is the same,
  with a pkp-lib change beside the ui-library one.

**What goes with it**

- Backport: `stable-3_5_0` and `stable-3_4_0` have the same listener, so
  the diff applies there.
- Guard: a Planned item in spec U52 (Rule 1), on the scenario that
  already saves "Enable" both ways.

Small: a few lines in one ui-library component, which the apps take
through their `lib/ui-library` submodule bump, with no stored data
involved.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/lib.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/walk.js`.
  It records the side menu's entries after each save, five seconds
  later, and after a fresh load, as well as every server error and page
  script error. It also presses the stray "Institutions" entry, which
  opens the Institutions page.
- The second check (institutional statistics on):
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/neighbour.js),
  run the same way. As `admin`, it ticks "Enable institutional
  statistics" under Administration › Site Settings › "Statistics" and
  under the journal's Settings › Distribution › "Statistics". It then
  saves "Payments" on and off on a freshly loaded page, saves the
  journal's statistics off with payments on, and finally saves payments
  off.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/institutions-menu-entry-stays-after-payments-off/fix.diff ojs`
  (which rebuilds the JavaScript), then walk.js and neighbour.js, then
  `revert`. The second check was also run without the fix.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01):
  - main: OJS 68615b5a32 (lib/pkp 25562b0e1a, lib/ui-library 64d6736318).
  - stable-3_5_0: OJS 3517e640f2 (lib/pkp b1981810da, lib/ui-library
    d4e01883): the same result at every step.
- 3.4, by code: OJS `stable-3_4_0` at 75cc2d488b, pkp-lib 32b0f4b4af,
  ui-library ee684b34. `SettingsPage.vue` (lines 39–42) deletes only
  `payments`, and adb7cd9d47 is on the branch. `TemplateManager.php`
  (line 160) adds "Institutions" with "Payments".
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, ui-library 96959f9e.
  `SettingsPage.vue` has no `institutions` entry, and
  `TemplateManager.inc.php` (line 132) adds "Payments" alone.
- Introduced: `git log -L` on the payments branch of `SettingsPage.vue`
  gives c7cb4e12 (a formatting change for `pkp/pkp-lib#8518`), then
  adb7cd9d47, which added `menu.institutions` to the adding branch.
  GitHub names `pkp/ui-library#213` for it, merged 2022-07-23 into
  `main`. The issue `pkp/pkp-lib#6782` is "Improve usage statistics
  handling in the background/code".
- Upstream search 2026-10-01: pkp/pkp-lib by "institutions menu
  payments", "institutions navigation disable", "institutions sidebar",
  "institutions link payments disabled" and "institutionsNavLink";
  pkp/ui-library by "institutions menu" and "SettingsPage institutions";
  pkp/ojs by "institutions menu payments". `pkp/pkp-lib#7878` (the usage
  statistics PR) and `pkp/ui-library#197` (an earlier institutions PR,
  closed) are the change itself, not reports of this fault.
