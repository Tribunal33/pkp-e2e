# A Journal Manager who switches payments off still sees "Institutions" in the side menu until a reload

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no Institutions page)
- **Introduced** `pkp/ui-library#213` for `pkp/pkp-lib#6782` · [adb7cd9d47](https://github.com/pkp/ui-library/commit/adb7cd9d478b4378819aedb3265ad42ab1646938) · 2022-07-23 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a Journal Manager switches payments off (Settings › Distribution ›
"Payments", "Enable" unticked, "Save"), the side menu drops "Payments"
at once but keeps "Institutions" until the page is next loaded. The page
updates the menu itself after the save, and that update removes
"Payments" but not "Institutions".

The leftover entry still opens a working Institutions page. Institutions
serve both institutional subscriptions and statistics counted by
institution, so the menu shows them while payments or institutional
statistics are on. The fault therefore shows only on a journal whose
institutional statistics are off, which is how a new install starts.

## Impact

- **Lost.** Nothing: the payment setting is saved, and the leftover
  entry opens the Institutions page, which works with payments off.
- **Who.** A Journal Manager who switches payments off, whether they
  were switched on earlier on the same page or long before. Only the
  browser tab where the save happened shows the stale entry.
- **Way round.** Reloading the page or opening another one shows the
  right menu.

Low: a stale menu entry that leads to a working page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (or `stable-3_5_0`), journal
  `publicknowledge`. Payments are off there and institutional
  statistics are off, so the side menu shows neither "Institutions" nor
  "Payments".

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › "Distribution", then the "Payments" tab.
3. Tick "Enable" and press "Save". "Saved" shows, and the side menu gains
   "Institutions" and "Payments" above "Settings". (On a journal whose
   payments are already on, skip this step: both entries are in the
   menu when the page loads.)
4. Untick "Enable" and press "Save".
5. Reload the page.

**Expected.** After step 4, "Saved", and the side menu drops both
"Institutions" and "Payments", as it shows after the reload in step 5.

**Observed.** After step 4, "Saved", and the side menu drops "Payments"
but keeps "Institutions", still there two seconds later. After the
reload in step 5 neither entry is shown. No request failed and the
browser logged no error.

Control: with institutional statistics on, "Institutions" rightly stays
after step 4 and after the reload. To turn them on, `admin` ticks
"Enable institutional statistics" under Administration › Site Settings ›
"Statistics", and `rvaca` ticks the same box under Settings ›
Distribution › "Statistics".

## Cause

The server builds the side menu on every page load. On a journal it
shows "Institutions" while payments are enabled: OJS
`classes/template/TemplateManager.php::setupBackendPage()` adds it just
before "Payments". It also shows it while institutional statistics are
on: `PKPTemplateManager::setupBackendPage()` adds it when
`Context::isInstitutionStatsEnabled()` is true.

After a save, the Settings page updates that menu in the browser
instead of reloading it. The code is the `form-success` handler in
`mounted()` in ui-library `src/components/Container/SettingsPage.vue`.
Its `FORM_PAYMENT_SETTINGS` branch runs only where the page has a
`paymentsNavLink`, which OJS sets in
`pages/management/SettingsHandler.php::distribution()` (line 195). When
`paymentsEnabled` is saved on, the branch adds both `menu.institutions`
and `menu.payments`. When it is saved off, it deletes only
`menu.payments` (line 45 on `main`). The deletion does not depend on how
"Payments" got into the menu, so a journal whose payments were on when
the page loaded meets it too. The server's rule is broken: with payments
off, "Institutions" belongs in the menu only while institutional
statistics are on.

`pkp/ui-library#213`, for `pkp/pkp-lib#6782` (the Institutions page),
made two changes here. It added `menu.institutions` to the enabling
half of the payments branch. It also added the `FORM_CONTEXT_STATISTICS`
branch, which removes "Institutions" only while "Payments" is absent.
It did not change the disabling half of the payments branch.

Reach:

- OJS only. OMP's and OPS's Settings pages set no `paymentsNavLink`, so
  the branch never runs there (checked in the code).
- The `FORM_ANNOUNCEMENT_SETTINGS` branch has a single condition and
  removes its entry correctly (checked in the code).
- No stored data is involved.

## Proposed fix

A proposal; the team decides. When payments are saved off, remove
"Institutions" too, unless institutional statistics are on. The page
already holds the Statistics form, so the fix reads the setting from it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-stays-after-payments-off/fix.diff)):

```diff
 				if (!context.paymentsEnabled && !!this.menu['payments']) {
 					let menu = {...this.menu};
 					delete menu.payments;
+					// Institutions was added with payments: keep it only while
+					// institutional statistics are on, as the server's menu does
+					const institutionStats = this.components[
+						pkp.const.FORM_CONTEXT_STATISTICS
+					]?.fields.find(
+						(field) => field.name === 'enableInstitutionUsageStats',
+					);
+					if (!institutionStats?.value) {
+						delete menu.institutions;
+					}
 					this.menu = menu;
```

The "Enable institutional statistics" field is on the form only while
the site's box is ticked. Its value is the journal's saved setting, or
the site's when the journal has none. So "field present and ticked"
matches `Context::isInstitutionStatsEnabled()`. The same handler
already reads another form's fields for the DOI forms
(`this.components.doiSetupSettings.fields`). Checking the other
condition before removing the entry mirrors the statistics branch,
which checks for "Payments".

Tried on OJS `main`: with the fix in, step 4 leaves neither entry in
the side menu. A second check ran with institutional statistics on.
Saving payments off kept "Institutions", and unticking the journal's
statistics box then removed it. Switching payments on and off again on
that same page left it out; without the fix, that last save kept
"Institutions".

**Alternatives**

- Reload the page after a payments save, as the handler does for the
  comments form. It is simpler, but the manager loses the "Saved" notice
  and any unsaved change on the page's other tabs.
- Have the server pass the institutional statistics state to the page.
  This needs a pkp-lib change as well, and the page would still have to
  update the state after a Statistics save.
- Always remove "Institutions" with "Payments". This is wrong while
  institutional statistics are on, because the server keeps the entry
  then.

**What goes with it**

- The fix reads the Statistics form's current value, and the page
  writes every unsaved edit into that form's data (ui-library
  `Container.vue::set()`, lines 68–74). So an unsaved change to
  "Enable institutional statistics" counts until it is saved or undone.
  With an unsaved tick, "Institutions" stays after payments are saved
  off. With an unsaved untick, it goes although the server would still
  show it. Either way the next page load shows the server's menu.
- No API, plugin hook or stored data changes.
- Backport: `fix.diff` applies as written to the `stable-3_5_0` and
  `stable-3_4_0` versions of `SettingsPage.vue`. Its paths start with
  `lib/ui-library/`, so inside a ui-library clone it applies with
  `-p3`. 3.4 builds with Vue CLI 5; we expect its Babel to handle the
  optional chaining, but the fix was not built there.
- Test: no test checks the side menu after a payments save. A browser
  test of the "Payments" tab that checks both entries after an unticked
  "Save" would catch this.

Small: one handler in ui-library and no server change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutions-menu-stays-after-payments-off/walk.js),
  run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutions-menu-stays-after-payments-off/walk.js [neighbour]`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), OJS `main` and `stable-3_5_0`. Both
  gave the Observed above. MySQL not checked; nothing here depends on
  the database.
- The leftover entry was not clicked in the walk. That it opens a
  working page is read in the code: `ManagementHandler::institutions()`
  checks neither payments nor statistics.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    and ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1)
    and ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    and ui-library
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072)
    and ui-library
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708).
- Code reads of 3.4 and 3.3 used `git show` of each branch:
  - On `stable-3_4_0` the payments branch of `SettingsPage.vue` is the
    same, and so 3.4 has the fault. OJS's `TemplateManager.php` adds
    "Institutions" with "Payments", and pkp-lib's
    `PKPTemplateManager.php` adds it for `isInstitutionStatsEnabled()`.
    `PKPContextStatisticsForm` has the `enableInstitutionUsageStats`
    field.
  - On `stable-3_3_0`, `SettingsPage.vue` has no `institutionsNavLink`,
    and OJS's `TemplateManager.inc.php` adds only "Payments".
  - `fix.diff` was checked with `patch --dry-run` against each
    branch's `SettingsPage.vue`.
- Introduced: `git blame` on the payments branch gives d0ffc05ab (2020,
  the branch with `payments` alone) for the delete, and adb7cd9d47 for
  the added `menu.institutions` (authored 2021-06-25, committed
  2022-07-22). The GitHub API's `commits/<sha>/pulls` gives
  `pkp/ui-library#213`, merged 2022-07-23, the date in the header.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-01 by the symptom's words and by `SettingsPage` and
  `institutionsNavLink`; nothing about this fault.
