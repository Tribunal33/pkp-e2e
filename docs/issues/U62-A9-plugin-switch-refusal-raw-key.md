# A Site Administrator without a role in a journal who switches its plugins is told "##user.authorization.pluginLevel##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/pkp-lib#2279` for `pkp/pkp-lib#2265` · [ff7f606182](https://github.com/pkp/pkp-lib/commit/ff7f606182d746eaee090924fb278b35ef538e5e) · 2017-02-09 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#1346` (closed without a fix). In 2016 OMP showed the same raw key, because its admin plugins page did not load the OMP locale file that holds the key. OJS and OPS have never had the key.
- **Tracked in** spec U62 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Site Administrator who holds no manager role in a journal or a
preprint server opens its Settings Wizard (Administration › "Hosted
Journals", the journal's arrow, "Settings wizard"), and ticks or
unticks one of its plugins under "Plugins". The change is refused,
which is the rule, but the browser's alert reads
"##user.authorization.pluginLevel##" instead of a reason. On a press
the same refusal reads "You do not have sufficient privileges to
manage this plugin."

The plugin stays as it was, and the administrator is not told why. It
needs an installation where the administrator's manager role in that
journal was removed; the administrator who creates a journal gets that
role.

## Impact

- **Lost**: nothing but the reason for the refusal.
- **Who**: a Site Administrator with no manager role in the journal or
  server, in the Settings Wizard's "Plugins" tab. On a journal, the
  side menu of its back-office pages still offers Settings › Website,
  whose "Plugins" tab refuses the same way; on a press and a server
  that page is refused as a whole.
- **Way round**: give the administrator the manager role in the
  journal again, then switch the plugin.

Low: a raw translation key on a refusal that changes nothing, in a
setup few installations have.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. On OPS read "Hosted
  Servers" for "Hosted Journals" and "Preprint Server manager" for
  "Journal manager".
- `admin` holds the roles Site administrator and Journal manager in
  `publicknowledge`. The steps take the manager role away, ticking
  "Reader" first because the "Edit User" form refuses a save with no
  role ticked.

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals", press the arrow of the
   `publicknowledge` row, then "Settings wizard".
3. Open the "Users" tab, press "Search", type "admin" and press
   "Search". Press the arrow of the `admin` row, then "Edit User".
4. Under "User Roles", tick "Reader" and untick "Journal manager", then
   press "OK".
5. Sign out, and sign in again as `admin`.
6. Open Administration › "Hosted Journals" › `publicknowledge` ›
   "Settings wizard", tab "Plugins".
7. Under "Generic Plugins", tick "Google Analytics Plugin".
8. Under "Generic Plugins", untick "Web Feed Plugin" and press "OK" in
   the "Disable" window.

**Expected**: each refusal says why, as on a press: "You do not have
sufficient privileges to manage this plugin."

**Observed**: at step 7 and again at step 8 the browser shows an
alert reading:

```
##user.authorization.pluginLevel##
```

Both boxes stay as they were, also after a reload. Each request
answers 200 with:

```
{"status":false,"content":"##user.authorization.pluginLevel##","elementId":"0","events":[]}
```

Control: the same steps on OMP ("Hosted Presses", "Press manager")
show the alert "You do not have sufficient privileges to manage this
plugin." After step 8 the "Disable" window stays open with a spinner
on all three apps; that is a fault of its own
([U62-A9-refused-confirmation-window-keeps-spinning.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U62-A9-refused-confirmation-window-keeps-spinning.md)).

## Cause

`PluginLevelRequiredPolicy::__construct()`
(`lib/pkp/classes/security/authorization/internal/PluginLevelRequiredPolicy.php`)
gives its refusal the message `user.authorization.pluginLevel`.
`PluginAccessPolicy` adds that policy whenever it is built with
`ACCESS_MODE_MANAGE`, and each app's
`SettingsPluginGridHandler::authorize()`
(`controllers/grid/settings/plugins/`) picks that mode for `enable`,
`disable` and `manage`. In that mode a Site Administrator is permitted
site-wide plugins only, so a journal's own plugins are refused unless
the user also holds a manager role there.
`PKPComponentRouter::handleAuthorizationFailure()` translates the
message and returns it as the answer's `content`, and
`Handler.handleJson()` shows it in an alert.

The policy is shared code, but its key is not: lib/pkp's locale files
do not define it, and of the three apps only OMP does
(`locale/en/manager.po` and 29 other languages). The policy began in
OMP, with its key in OMP's locale files
([d5a7da5d4](https://github.com/pkp/omp/commit/d5a7da5d44a41679802fb73d078d4cebe1b8a72d),
2015). OJS had its own `PluginLevelRequiredPolicy`, with no message of
its own. In 2017 `pkp/pkp-lib#2279` moved OMP's policy into lib/pkp
(ff7f606182) and OJS dropped its own copy for it
([4b4292b8ec](https://github.com/pkp/ojs/commit/4b4292b8ec05561b50148a2d934174c09b730480)),
but the key stayed in OMP. OPS, forked from OJS later, never had it.
`Locale::translate()` prints a key it cannot find as `##key##`.

Reach:

- Settings › Website › "Plugins" on a journal gives the same refusals
  (spec footnote; not tried here); on a press and a server that page is
  refused before the list.
- `manage` (a plugin's own links such as "Settings") goes through the
  same policy, but the rows do not offer those links to such an
  administrator (code).
- No other code uses the key (searched in lib/pkp, OJS, OMP and OPS).
- Whether a Site Administrator should be refused here at all is a
  separate, open question (spec U62
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U62-plugins-management.md#a6)).
  The fix below changes only what the refusal says.

## Proposed fix

Define the key in lib/pkp, beside the other `user.authorization.*`
messages of `locale/en/user.po`, with OMP's sentence:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-switch-refusal-raw-key/fix.diff).

```diff
--- a/lib/pkp/locale/en/user.po
+++ b/lib/pkp/locale/en/user.po
@@ -135,6 +135,9 @@
 msgid "user.authorization.pluginRequired"
 msgstr "A plugin was not specified and is required."
 
+msgid "user.authorization.pluginLevel"
+msgstr "You do not have sufficient privileges to manage this plugin."
+
 msgid "user.authorization.invalidReviewAssignment"
 msgstr "You do not have permission to access this review assignment."
 
```

In the same commit, copy OMP's translations of the key into lib/pkp's
`user.po` of each language. Of OMP's 29 other languages, 25 translate
it and 4 (ckb, el, fr_CA, vi) leave it empty; none of the texts names
a press, so they fit every app as they are. A language that has no
translation shows the raw key, so without this step OJS and OPS in
those 25 languages would keep showing it until Weblate fills them in.

Tried on `main` with the English line, the three apps. Steps 7 and 8
then show "You do not have sufficient privileges to manage this
plugin." on OJS and OPS. On OMP, the control, the alert reads the same
with and without the fix.

The key belongs where the code that uses it lives, so one change
covers OJS, OPS and any later app. OMP's own copies say the same and
can be removed later.

**Alternatives**:

- Add the key to OJS's and OPS's own `locale/en/manager.po`. It works,
  but keeps a shared policy's message in three app repos, which is how
  this went wrong.
- Move the key and its translations out of OMP with
  `lib/pkp/tools/moveLocaleKeysToLib.php`. That also removes OMP's
  copies, at the cost of an OMP commit beside the pkp-lib one.

**What goes with it**:

- Backport: the same lines apply to 3.5 and 3.4 (`locale/en/user.po`)
  and to 3.3 (`locale/en_US/user.po`).
- A regression test: as a Site Administrator without a manager role,
  tick a journal's plugin in the Settings Wizard and check the alert's
  text.

Small: one message added to pkp-lib's locale files, in English and the
25 languages OMP already translates, with no code change.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/lib.js))
  takes steps 1–8 on OJS, OMP and OPS, records each browser alert and
  each `enable`/`disable` answer, then reloads and reads both boxes.
  With `dismiss` it also reads the journal dashboard's side menu after
  the role is taken away. Each run starts from an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/plugin-disable-refused-window-keeps-spinning/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Chromium on PostgreSQL. Datasets: pkp/datasets c657990 (2026-10-01).
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b; pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161; pkp-lib
  f6ab331645.
- The side menu: on the editorial dashboard opened by its address, an
  administrator left with "Reader" sees "Settings" with "Website" on
  all three apps, `main` and 3.5, under an "Error" window ("The current
  role does not have access to this operation.").
- Code reads for 3.4 and 3.3: pkp-lib's `PluginAccessPolicy` adds
  `PluginLevelRequiredPolicy` with the same key in `ACCESS_MODE_MANAGE`
  on both branches, OJS's `SettingsPluginGridHandler` picks that mode
  for `enable` and `disable`, and the key is defined only in OMP's
  `locale/en/manager.po` (3.4) and `locale/en_US/manager.po` (3.3), in
  neither pkp-lib nor OJS nor OPS.
- Introduced: `git log -S` for the key in pkp-lib stops at ff7f606182
  (merged as `pkp/pkp-lib#2279`); in OMP at d5a7da5d4. OJS's own policy
  of 2012 to 2017 (`git show 4b4292b8ec^`) passed no message.
- Not tried: a language other than English.
