# Saving a DOI registration agency can untick every DOI kind and leave the DOIs page blank

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; no registration agency setting)
- **Introduced** `pkp/pkp-lib#8643` for `pkp/pkp-lib#8310` · [2d1ba43f39](https://github.com/pkp/pkp-lib/commit/2d1ba43f39a4fe418c1574dc2981d21868bb5292) · 2023-02-15 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager chooses Crossref or DataCite as the registration
agency and saves. Saving an agency unticks the DOI types it does not
register (the boxes the Setup tab lists under "Items with DOIs", here
called kinds). When such a kind comes before one the agency keeps,
every "Items with DOIs" box then reads unticked, and the DOIs page
shows its heading and tabs but no list: the page's script fails.
Nothing on screen explains it.

The stored kinds survive: the setting still holds "Articles" and the
other kept kind, and the server goes on assigning DOIs and, where
"Automatic Deposit" is on, depositing them by those kinds. What is lost
is the two screens. The DOIs page is the only place to deposit, assign,
edit or mark DOIs by hand, so a manager without "Automatic Deposit"
cannot register any DOI. The Setup tab cannot put the kinds back: its
boxes tick and untick all together, and "Save" is refused.

"Comes before" is the order of the stored list, which follows the order
the boxes were ticked, across saves. It is reached:

- on a journal choosing Crossref, with galleys before "Peer Review" or
  before "Issues";
- on a preprint server choosing Crossref, with galleys before
  "Preprints";
- on a journal choosing DataCite, with "Peer Review" before a kept kind
  (seen once in the spec's footnote, not reproduced here).

## Impact

- **Lost.** The DOIs page and the Setup tab's "Save". The stored kinds
  survive, and DOI assignment and automatic deposit go on by them.
  Without "Automatic Deposit", which is off until the manager ticks it,
  no DOI can be deposited at all, so new DOIs are never registered.
- **Who.** A journal or preprint server manager on Settings ›
  Distribution › "DOIs" › "Registration" who sets up Crossref or
  DataCite with the kinds in the order above. The choice is usually
  made once, when DOI registration is set up.
- **Way round.** None on screen. A manager's REST call `PUT
  /api/v1/contexts/{id}` with a proper `enabledDoiTypes` list, or an
  edit of the database, stores a list again.

High: "Automatic Deposit" is off by default, so a journal or server in
this state, with no way back on screen, registers no new DOI with its
agency after a save that said "Saved". It would be medium where
"Automatic Deposit" is on, since registration then carries on and only
the management screens are lost.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS or OPS), freshly loaded.
  Its `publicknowledge` journal (preprint server) has DOIs on, "Items
  with DOIs" set to "Articles" ("Preprints") only, no DOI prefix and no
  registration agency plugin enabled.
- No other setup: `dbarnes` is its Journal editor (Preprint Server
  manager) and can change its settings.

On a journal:
1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup". Under "Items with DOIs"
   "Articles" is ticked. Tick "Article galleys, such as a published
   PDF", then "Peer Review". [3.5, which has no "Peer Review" kind:
   tick "Issues" after the galley box.]
4. In "DOI Prefix" type `10.1234` (the dataset has none, and the form is
   refused without one) and press "Save": "Saved".
5. Open the DOIs page, `/index.php/publicknowledge/dois`: it lists the
   journal's articles.
6. Settings › Distribution › "DOIs" › "Registration": choose "Crossref"
   in "Registration Agency", type "Public Knowledge Project" in
   "Depositor name" and `dbarnes@mailinator.com` in "Depositor email",
   and press "Save": "Saved".
7. Reload the page and open "DOIs" › "Setup".
8. Open the DOIs page.

Trying to put the kinds back:

9. On "Setup", tick "Articles", then "Peer Review". [3.5: "Articles",
   then "Issues".]
10. Press "Save".

On a preprint server, the same steps with step 3 as: untick
"Preprints", tick "Preprint galleys, such as a published PDF", tick
"Preprints" again (both ticked, the galley box first). Step 9 ticks
"Preprints".

**Expected:** step 7 lists "Articles", "Issues" and "Peer Review" with
"Articles" and "Peer Review" ticked; the galley box is gone, since
Crossref does not register galleys. Step 8 lists the articles as in
step 5. On a server, "Preprints" stays ticked and the DOIs page lists
the preprints.

**Observed:** step 7 lists "Articles", "Issues" and "Peer Review", none
ticked. Step 8 shows the heading "DOIs" and an "Articles" tab with
nothing under it: no "Article DOIs" list, no "Search", "Bulk Actions"
or "Filters", no items. The browser console holds:

```
TypeError: this.enabledDoiTypes.includes is not a function
```

Step 9: ticking "Articles" ticks all three boxes at once, and ticking
"Peer Review" unticks all three. Step 10 is refused with the notice "The
form was not saved because 1 error(s) were encountered. Please correct
these errors and try again." and "This is not a valid array." under
"Items with DOIs"; the save request sent `enabledDoiTypes=false` and
answered 400. The server's error log gains, for that save:

```
Plugin APP\plugins\generic\crossref\CrossrefPlugin failed to handle the hook Context::validate
TypeError: array_diff(): Argument #1 ($array) must be of type array, string given in …/plugins/generic/crossref/CrossrefPlugin.php:309
```

The DOIs page stays blank.

On the server: "Preprints" unticked in step 7, the DOIs page's
"Preprints" tab empty with the same error, and step 10 refused the same
way (`enabledDoiTypes=true`, the log line from `CrossrefPlugin.php:251`).
On 3.5 the journal shows "Articles" and "Issues" unticked, and both DOIs
page tabs are empty, the error logged once for each.

With only "Articles" and the galley box ticked in step 3 (the dropped
kind last), the galley box goes, "Articles" stays ticked and the DOIs
page lists the articles.

## Cause

`PKPContextController::editDoiRegistrationAgencyPlugin()` (lib/pkp
`api/v1/contexts/PKPContextController.php`, from line 535) runs on the
Registration tab's "Save". When the agency differs from the stored one,
it filters the context's `enabledDoiTypes` down to the agency's
`getAllowedDoiTypes()` with `array_intersect($enabledPubObjectTypes,
$allowedPubObjectTypes)` (line 636) and saves the result.
`array_intersect()` keeps the first array's keys, so a dropped kind
before a kept one leaves a gap: `[0 => 'publication', 2 => 'peerReview']`.

The setting is a list (each app's `schemas/context.json`, `"type":
"array"`). `PKPSchemaService::coerce()` keeps the keys, and
`DAO::convertToDB()` stores the array with `json_encode()`, which writes
an array with a gap as an object. The reproduction read
`{"0":"publication","2":"peerReview"}` from `journal_settings`
(`{"1":"publication"}` from `server_settings`).

PHP reads it back as a keyed array, which the PHP readers handle
(`in_array()`, `empty()`). The two pages that pass it to the browser
pass an object:

- `PKPDoisHandler::index()` puts it in the DOIs page's arguments, and
  the app's `DoisHandler::getAppStateComponents()` builds the list
  panels from them. Their app variants call
  `this.enabledDoiTypes.includes(…)` (ui-library `DoiListPanelOJS.vue`
  line 28, `DoiListPanelOPS.vue` line 27), and the error stops the list
  from rendering.
- The Setup form (`DoiSetupSettingsForm`) gives it to "Items with DOIs"
  (`FieldOptions`). Its checkboxes are bound to an object rather than an
  array, so none reads ticked and a tick sets the whole value to `true`
  or `false`. The save then posts a boolean, which validation refuses.

The stored order follows the order the boxes were ticked: `FieldOptions`
(not orderable) appends each tick to the value.

Reach:

- The DOIs page and the Setup tab on OJS (Crossref; DataCite seen once
  in the spec's footnote, not reproduced here) and OPS (Crossref). OMP
  is out because no agency plugin is offered for a press, so nothing
  filters its kinds (read in the code).
- A refused Registration save leaves the gap too: the agency and the
  filtered list are saved (lines 595–644) before the agency's own fields
  are validated (line 655), so a save refused for, say, a bad depositor
  email stores both, with no "Saved" (read in the code).
- The REST API: `GET /api/v1/contexts/{id}` returns `enabledDoiTypes` as
  an object to every client (read in the code, not run).
- The PHP readers: `Context::isDoiTypeEnabled()`, `DoisEnabledPolicy`,
  OJS `doi\DAO` and the repositories read the stored value correctly, so
  assignment and automatic deposit go on (read in the code). Crossref's
  `validateAllowedPubObjectTypes()` (`Context::validate` hook) calls
  `array_diff()` on the posted value, so step 10's boolean throws the
  logged TypeError above; `Hook::run()` catches it as a plugin failure,
  and the request still answers 400 (reproduced).
- The same mistake, harmless: each app's `DoiSetupSettingsForm`
  filters the kind options with `array_filter()`, which also leaves a
  gap (`{"0":…,"1":…,"3":…}` under Crossref on a journal). The options
  render anyway, because `v-for` walks an object (the dropped-kind-last
  case in Observed).

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/fix.diff):
with it, the Steps store `["publication","peerReview"]` on the journal
and `["publication"]` on the server, step 7 shows the kept kinds
ticked, and step 8 lists the articles (preprints). The dropped-kind-last
case gave the same result with the fix in and out.

Recommended: make the filter's result a list again, in the one place
that filters the setting.

```php
// PKPContextController::editDoiRegistrationAgencyPlugin()
$filteredPubObjectTypes = array_values(array_intersect($enabledPubObjectTypes, $allowedPubObjectTypes));
```

This is the code base's pattern for a filtered list
(`FormComponent::removeField()`, `PKPSiteService`, the funder
controller's `grants`). The `!=` comparison below it is true whenever
the stored value changes: when a kind is dropped, and when a stored
value with a gap is re-indexed. The fix keeps dropping the kinds the
agency cannot register.

The other writers of the setting already store lists: the Setup form
posts an array, and the 3.4 upgrade (lib/pkp's `PKPI7014_DoiMigration`,
with OJS's `I7014_DoiMigration` adding `issue`) pushes onto one.

**Alternatives:**

- Re-indexing every `"type": "array"` prop in
  `PKPSchemaService::coerce()`: it covers every writer, but changes how
  every array prop is stored, and some may be keyed by design (not
  checked).
- `array_values()` in `PKPDoisHandler` or the apps'
  `DoisHandler::getAppStateComponents()` and the Setup form, or
  `Object.values()` in the ui-library: a guard at each reader. It leaves
  the stored record and the REST API wrong.

**What goes with it:**

- Repair: contexts that saved an agency on 3.4 or 3.5 with the kinds in
  that order are already in this state, and their managers cannot fix it
  on screen. An upgrade migration should re-index `enabledDoiTypes` in
  `journal_settings` and `server_settings`, reading the JSON and writing
  it back with `array_values()`: the next `main` upgrade's, and a 3.5
  point release's if backported. With the fix in, choosing "None" and
  then the agency again should also rewrite the list, since the `!=`
  then sees the re-indexed value as a change (read in the code, not
  tried).
- The options' `array_filter()` in each app's `DoiSetupSettingsForm`
  can take `array_values()` too, for a clean config. It is not needed
  for this fault.
- Backport: it applies as written to 3.5 (the same line, 632) and to
  3.4 (`api/v1/contexts/PKPContextHandler.php` line 614).
- Guard: an e2e scenario in U45 (a Planned item): choose Crossref with
  galleys ticked before "Peer Review", then open the Setup tab and the
  DOIs page.

Medium: one line in pkp-lib, plus an upgrade migration to repair the
contexts already affected.

## Evidence

- Kept script that takes the Steps in the browser on OJS and OPS (OMP
  is skipped: no surface), on an install loaded from PKP's default test
  dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/walk.js)
  (steps 1–8), run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/walk.js`;
  `WALK=neighbour` in front takes the dropped-kind-last case.
  Steps 9–10 are
  [wayround.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/wayround.js),
  run the same way right after walk.js, without a reset. Both read the
  stored `enabledDoiTypes` from the database beside the screens.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/fix.diff ojs ops`,
  then walk.js and the dropped-kind-last case (`WALK=neighbour`), then
  `node bin/try-fix.js revert shared/playwright/checks/issues/agency-choice-unticks-every-doi-kind/fix.diff ojs ops`.
  The repair migration was not written or tried.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`, no upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc, crossref 46a4d46), OPS
    c8af945bb7 (lib/pkp 3dc90c81a6, crossref b6b94dd), ui-library
    280f98c5; OMP 3b0ecf794 read only.
  - stable-3_5_0: OJS 92b9a16b48 (crossref 97a9311), OPS cf4fce69bd
    (crossref 20f5409), lib/pkp a9c76aed62, ui-library 1a7a4750.
  - `json_encode()` does not depend on the database, so MySQL should
    store the same object; MySQL not checked.
  - The log lines are from the installs' PHP server logs.
- 3.4, by code:
  - pkp-lib `stable-3_4_0` at df13621c2d: the same filter in
    `api/v1/contexts/PKPContextHandler.php` line 614, and 2d1ba43f39 is
    on the branch; `DAO::convertToDB()` `json_encode()`s arrays.
  - ui-library `stable-3_4_0` at ee684b34: `DoiListPanelOJS.vue` calls
    `this.enabledDoiTypes.includes(…)`.
  - OJS `stable-3_4_0` at 9571d8fde7: Crossref (plugin at f073a208eb)
    accepts publication and issue, DataCite publication,
    representation and issue. OPS's Crossref (plugin at 50cef72474)
    accepts publication only.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe has no
  `enabledDoiTypes` or `getAllowedDoiTypes()`; DOIs are set in the DOI
  plugin there, with no registration agency choice.
- Introduced: `git blame` on the filter line in pkp-lib `main` gives
  2d1ba43f39 ("pkp/pkp-lib#8310 Allow DOI agency plugins to limit DOI
  types"), committed to `api/v1/contexts/PKPContextHandler.php` and
  moved since without change. It was merged as PR `pkp/pkp-lib#8643`
  (merge 857b95d229, 2023-02-16, branch `ewhanson/i8310_allowedTypes`).
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library (`enabledDoiTypes`, "includes is not a function", DOI
  agency kinds unticked, "Items with DOIs", DOIs page empty with
  Crossref, `editDoiRegistrationAgencyPlugin`, `getAllowedDoiTypes`,
  "not a valid array"): nothing about this fault.
- Not driven: DataCite; the REST API's context answer and the `PUT`
  way round; a refused Registration save.
- Unverified: a journal upgraded from 3.3 gets its `enabledDoiTypes`
  from `I7014_DoiMigration` in the order the old settings rows are
  read. Where galleys come before a kept kind, choosing Crossref after
  the upgrade would reach this fault.
