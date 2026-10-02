# Site administrator cannot save Site Settings › "Statistics" after unticking "Platform" over a mistyped Platform ID

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no "Platform" setting)
- **Introduced** `pkp/pkp-lib#8109` for `pkp/pkp-lib#6782` · [28b366b248](https://github.com/pkp/pkp-lib/commit/28b366b2487b9b293e1b820048e7fb2f67ca9038) · 2022-01-27 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U64 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On Administration › Site Settings › "Statistics", a Site Administrator
ticks "Platform", types a Platform ID that is not allowed (one with a
space, for example) and unticks "Platform" again without correcting
it. The "Platform ID" box disappears from the page. Since the site is
not set as the platform, they expect "Save" to work.

Instead the save is refused with "Please correct one error.", and
nothing a sighted administrator can see says which box is wrong. The
line that names it, "Go to Platform ID: This is not formatted
correctly.", is in the page but visually hidden, and the box it names
is not on the page. "Save" then stays greyed out, and nothing chosen
on the tab is stored.

To save, the administrator ticks "Platform" again, empties or corrects
the box that comes back and unticks it, or reloads the page and makes
the other choices again. An allowed ID, or an empty box, behind an
unticked "Platform" saves as usual.

## Impact

- **Lost.** The time to find out why the tab will not save. The other
  choices on the tab are lost only if the administrator reloads.
- **Who.** A Site Administrator who starts to set the site as the
  COUNTER SUSHI platform, mistypes the ID and decides against it before
  correcting the box. A narrow path on a screen that is rarely changed.
- **Way round.** Tick "Platform" again, empty or correct "Platform
  ID", untick and save (read in the code, not walked); or reload and
  choose again (walked). Nothing on the page points to either.

Low: the save is refused in the open and the task gets done by a way
round on the same tab. It would be medium if the refused save were
silent, or if the tab stayed unsavable after a reload.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS. "Platform" is
  unticked, no Platform ID is stored, and "Compress Logs" is at "Leave
  the log files in place".

Steps:

1. Sign in as `admin`. Open Administration › Site Settings › "Site
   Setup" › "Statistics" (`/index.php/index/en/admin/settings`).
2. Under "Sushi Protocol" › "Platform", tick "Use the site as the
   platform for all journals." ("…presses." on OMP, "…servers." on
   OPS). The box "Platform ID" appears.
3. Type `PKP Platform` in "Platform ID".
4. Press "Save". The save is refused, with "This is not formatted
   correctly." under the box: an ID may not hold a space. (This step
   is not needed for the fault: with step 4 left out, step 6 is refused
   the same way.)
5. Untick "Use the site as the platform for all journals.". The
   "Platform ID" box and its message go, and "Save" can be pressed
   again.
6. Under "Compress Logs" choose "Compress the log files" and press
   "Save".
7. Reload the page and open the tab again.
8. Choose "Compress the log files" again and press "Save".

**Expected.** Step 6 answers "Saved": "Platform" is unticked, so the
hidden Platform ID is not part of the save. After step 7 "Compress the
log files" is chosen.

**Observed.** Step 6 raises the notice "The form was not saved because
1 error(s) were encountered. Please correct these errors and try
again." The tab has no "Platform ID" box, and beside "Save" it reads:

```
Please correct one error.
Jump to next error
Save
```

"Save" is greyed out. "Jump to next error" leaves the focus on itself.
The line that names the box is hidden from sight and left to screen
readers: "Go to Platform ID: This is not formatted correctly." The
request and its answer:

```
PUT /index.php/index/api/v1/site
isSiteSushiPlatform=false  sushiPlatformID=PKP Platform  compressStatsLogs=true
400 {"sushiPlatformID":["This is not formatted correctly."]}
```

After step 7 the tab is as it was before step 2, with "Leave the log
files in place" chosen. Step 8 answers "Saved".

Control: with `PKP_Platform` typed at step 3, step 4 saves, and
unticking "Platform" and pressing "Save" answers "Saved".

## Cause

The form sends the value of every field, shown or not. "Platform ID" is
a `showWhen` field of `PKPSiteStatisticsForm`
([lines 163-169](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/classes/components/forms/site/PKPSiteStatisticsForm.php#L163-L169)),
so unticking "Platform" only stops ui-library from drawing it.
`submitValues` in `Form.vue`
([lines 263-306](https://github.com/pkp/ui-library/blob/64d673631817f14826a048a462e56d9ee0168b44/src/components/Form/Form.vue#L263-L306))
still puts what was typed into the request.

`PKPSiteController::edit()`
([lines 147-168](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/api/v1/site/PKPSiteController.php#L147-L168))
validates and stores whatever arrives. The site schema gives
`sushiPlatformID` the rule `regex:#^[a-zA-Z0-9._/]{1,17}$#`
([schemas/site.json](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/schemas/site.json#L87-L94)),
and nothing makes that rule depend on `isSiteSushiPlatform`. The one
place that ties the two settings, the after-hook in
`PKPSiteService::validate()`, only asks for an ID when the platform is
on. So the server checks the format of an ID that the same request
says is not in use, although the SUSHI code reads the ID only while
the platform is on.

The form then has nowhere to show the answer. `FormGroup.vue` draws
only the fields whose `showWhen` holds, so the error has no box to sit
under. "Save" is disabled while the form holds any error
(`FormPage.vue`). An error is cleared at two moments: when its field
is edited (`Form.vue` `fieldChanged()` calls `removeError()`), and when
its field is taken off the page (`FieldBase.vue` `beforeUnmount()`
emits `set-errors` with an empty list, handled by `FormGroup.vue`
`setFieldErrors`). The box is already off the page when the server's
error arrives, so neither can happen and the error stays.

ui-library already treats a hidden field as outside the save for one
rule: since `pkp/pkp-lib#9996`, `validateRequired()` skips fields that
are not shown and a field's error is removed when it is hidden. That
change covered the browser's required check only, not the schema rules
the server runs on a hidden field's value.

Reach:

- **OJS, OMP, OPS** share the form, the schema and the controller;
  the fault was walked on all three.
- **Stored data**: none. The refused save stores nothing, and no
  malformed ID can be stored.
- **Other `showWhen` fields with a format rule** (code, not walked):
  on `main`, Site Settings › "Security" hides "Maximum attempts"
  (`min:1`) and "Lockout duration (seconds)" (`min:60`) while "Enable
  rate limiting" is unticked; a context's DOIs › "Setup" hides "DOI
  Prefix" (`regex:/^10\.[0-9]{4,7}$/`) while DOIs are off. Each is
  built the same way: sent while hidden and checked by its schema
  rule.
- **The other `showWhen` fields** (the payment, announcement, license,
  masthead, ORCID and metadata settings forms, the contributor form)
  are sent while hidden in the same way; their schema rules were not
  checked.

## Proposed fix

Leave the Platform ID out of a site save that has the platform off, in
`PKPSiteController::edit()`, before the values are validated and stored
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/fix.diff)):

```diff
--- a/lib/pkp/api/v1/site/PKPSiteController.php
+++ b/lib/pkp/api/v1/site/PKPSiteController.php
@@ -152,6 +152,12 @@
 
         $params = $this->convertStringsToSchema(PKPSchemaService::SCHEMA_SITE, $illuminateRequest->input());
 
+        // The platform ID is used, and shown in the form, only while the site is the SUSHI platform.
+        // A save that leaves the platform off does not touch the stored ID.
+        if (array_key_exists('isSiteSushiPlatform', $params) && !$params['isSiteSushiPlatform']) {
+            unset($params['sushiPlatformID']);
+        }
+
         $errors = $siteService->validate($params, $site->getSupportedLocales(), $site->getPrimaryLocale());
 
         if (!empty($errors)) {
```

Two methods of the controller call the site service's `validate()` and
`edit()`: `edit()` and `editTheme()`. The fix sits in `edit()`, where a
form's values become `$params`, so both service calls get the same
values. `editTheme()` passes only `themePluginPath` and needs nothing.

Tried on `main`, three apps. Step 6 answers "Saved" and stores
"Compress the log files"; no Platform ID is stored. With "Platform"
ticked, `PKP Platform` is still refused under the box and
`PKP_Platform` still saves. Unticking and saving then keeps the stored
`PKP_Platform`, which shows again on the next tick, with and without
the fix.

**Alternatives.**

- Stop sending hidden fields: have `submitValues` in `Form.vue` skip a
  field whose `showWhen` does not hold, as `validateRequired()` does.
  It fixes every form at once, the fields under Reach included, and it
  completes what `pkp/pkp-lib#9996` began. Not recommended as the first
  step, and not tried: it changes what every form with a `showWhen`
  field sends. At least one form relies on a hidden field being sent:
  the issue field of the publication form is set to null when it is
  hidden, so that the save clears it
  (`useWorkflowPublicationFormIssue.js`). Each such form needs a look
  first.
- Skip only the format rule in `PKPSiteService::validate()` while the
  platform is off: the save goes through, but the malformed ID is
  stored, which the schema says cannot happen.
- Keep the box on the page while it holds an error: the administrator
  can see and correct it, but must still correct an ID they have
  decided not to use.

**What goes with it.**

- The REST API: a `PUT …/api/v1/site` with `isSiteSushiPlatform` false
  no longer stores a `sushiPlatformID` sent with it. A stored ID stays
  until a save with the platform on replaces it with a different ID.
  So saving an empty box behind an unticked "Platform" no longer
  clears a stored ID. Nothing reads the ID while the platform is off
  (`CounterR5Report`, `PKPStatsSushiController`).
- Backport: the hunk applies as written to 3.5. On 3.4 the same lines
  go into `api/v1/site/PKPSiteHandler.php` (`edit()`, a Slim handler).
- Test: an e2e scenario: a refused ID,
  "Platform" unticked, "Save" answers "Saved". pkp-lib has no unit test
  of the site controller.

Small: one hunk of six added lines (three of code) in one pkp-lib
file, and the test.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` is the
  fix trial's check and the Steps' control: `PKP Platform` refused
  while ticked, `PKP_Platform` saved, then unticked and saved, then
  ticked again. The script also reads each save's request and answer
  and the three settings in `site_settings` after each save.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/hidden-platform-id-blocks-site-statistics-save/fix.diff ojs omp ops`,
  the walk and the neighbour check, then reverted; the neighbour check
  was walked again without it.
- Walked 2026-10-02 on PostgreSQL (the fix trial's last walks, the
  neighbour check with the fix and without it, ended after midnight,
  on 2026-10-03), each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02); nothing here depends on the database. No server error
  and no page script error in any walk. The successful save at step 8
  logs `PHP Warning: Undefined array key "redirectContextId"` in
  `SiteDAO.php` line 136, which spec U60 already records; it is not
  part of this finding.
  - main: OJS [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
    (lib/pkp ddd8ab243a, lib/ui-library 64d6736318), OMP 3b0ecf794c and
    OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  - 3.5: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
    cf3f984335, lib/ui-library d4e0188353). Steps 1 to 7 were walked
    there, with the same refusal, the same greyed "Save" and nothing
    stored; step 8 and "Jump to next error" were walked on `main` only.
- Code reads:
  - `main`: `PKPSiteStatisticsForm`, `schemas/site.json`,
    `PKPSiteController::edit()`, `PKPSiteService::validate()` and
    `edit()`, every reader of `sushiPlatformID` and
    `isSiteSushiPlatform` in pkp-lib and OJS, and the callers of the
    site service. In ui-library `Form.vue` (`submitValues`, `submit`,
    `validateRequired`, `error`), `FormGroup.vue`, `FormPage.vue` (the
    "Save" button's `disabled`) and `formHelpers.js`. Every `showWhen`
    in the PHP of OJS, its pkp-lib and its plugins, with the schema
    rules of the fields under Reach.
  - 3.5: the same form, schema rule, after-hook and controller lines in
    lib/pkp cf3f984335; `validateRequired()` skips hidden fields there
    too. No `PKPSiteSecurityForm` on 3.5.
  - 3.4 (code): OJS c1827e3527, OMP 0aec65441f, OPS acd8ae704b, lib/pkp
    9e41f10273, lib/ui-library ee684b341b. The same `showWhen` field
    and schema rule; `PKPSiteHandler::edit()` validates what arrives;
    `submitValues` leaves out only `field-html` fields.
  - 3.3 (code): lib/pkp ac3fa73402 has no site statistics form and no
    `sushiPlatformID` in `schemas/site.json`.
- Introduced: `git log -S` on the schema's regex and on the form's
  `'showWhen' => 'isSiteSushiPlatform'` both give 28b366b248, which
  added the field hidden and validated from the start. The hidden-field
  handling of `pkp/pkp-lib#9996` is ui-library
  [655e37f8](https://github.com/pkp/ui-library/commit/655e37f8649598d86deee69b87e67728b242a279)
  (`pkp/ui-library#357`).
- Upstream: searched 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, by the symptom's words (Platform ID,
  hidden field, cannot save, "not formatted correctly") and by
  `sushiPlatformID`, `isSiteSushiPlatform`, `PKPSiteStatisticsForm` and
  `showWhen`. Closest, and not this fault: `pkp/pkp-lib#9996` (hidden
  required fields, closed with a fix).
- The path without step 4 (typed, unticked, saved) was not walked for
  this report. Spec U64's probe of 2026-09-27 took it on the three
  apps with `bad id!` and got the same refusal with the box hidden,
  and the code agrees: `submitValues` sends the hidden value whether
  or not a save was refused before.
- The first way round is read in the code: ticking "Platform" draws
  the box again with what was typed, editing it clears the error
  (`fieldChanged()`), and unticking sends the corrected or empty value.
  Its last part was walked: an empty box behind an unticked "Platform"
  saved at step 8, a corrected one in the neighbour check.
- Not driven: the "Security" and DOI fields under Reach; the first and
  third alternatives; a screen reader; MySQL and MariaDB.
