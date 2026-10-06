# A preprint server's "Posting Mode" says "Saved" but keeps nothing, so the server goes on posting

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** [3f69b496b5](https://github.com/pkp/ops/commit/3f69b496b5b6b6fa37de1c5b67ee6a41d0d9a8e6) · 2019-06-03 (no PR; before the first OPS release) · Antti-Jussi Nygård (ajnyga)
- **Upstream** `pkp/pkp-lib#8343` (open), covering more: it wants the does-not-post mode to work in OMP and OPS with no setting on screen, so the fix proposed here leaves it open
- **Tracked in** spec U51 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#ops1), spec U08 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#ops2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a preprint server's Settings › Distribution › "Access", choosing
either "Posting Mode" choice and pressing "Save" shows "Saved". The
next load of the tab shows neither choice selected.

When "OPS will not be used to post the server's contents online." is
chosen and "Save" shows "Saved", the server goes on posting: "Archives"
stays in the header, and visitors and Readers still open the list of
preprints, each preprint and its PDF. Losing the other choice, "The
server will provide open access to its contents.", changes nothing,
since the server posts openly by default.

If the choice were kept, the server's existing code would hide
"Archives" and refuse visitors and Readers the list, each preprint and
its PDF; the sentence a refused Reader should see exists in no
language.

## Impact

- **Lost.** What the manager chose. The server's preprints stay public
  after "Saved" has told the manager they are no longer posted, and
  nobody is told otherwise.
- **Who.** A preprint server's manager who uses "Posting Mode", every
  time. Most servers post openly and have no reason to touch it.
- **Way round.** Partial. The site administrator can untick "Enable
  this preprint server to appear publicly on the site" (Administration ›
  Hosted Servers). That sends signed-out visitors to the login page but
  leaves everything open to signed-in users, and on a server that
  allows registration, as the default dataset's does, anyone can sign
  up. Otherwise each preprint must be unposted.

Medium: the screen confirms a choice it throws away, and what stays
online is exactly what the manager meant to withdraw. Only how seldom a
server stops posting keeps it from high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS (server `publicknowledge`).
  It stores no "Posting Mode", so the server posts openly. Preprint 9,
  "Signalling Theory Dividends: A Review Of The Literature And Empirical
  Evidence", is posted with a PDF.

Taking the server's contents offline:

1. Sign in as `dbarnes` (a Preprint Server manager).
2. Open Settings › Distribution, then the "Access" tab. Under "Posting
   Mode" neither choice is selected.
3. Choose "OPS will not be used to post the server's contents online."
   and press "Save".
4. Load the page again and open "Access".
5. Sign out.
6. As a visitor, open the server's home page
   (`/index.php/publicknowledge/en`) and read the header.
7. Press "Archives".
8. Open preprint 9 (`/index.php/publicknowledge/en/preprint/view/9`) and
   press "PDF".
9. Sign in as `ccorino` (Author, Reader) and repeat steps 6 to 8.

Choosing open access:

10. Sign in as `dbarnes`, open Settings › Distribution › "Access", choose
    "The server will provide open access to its contents." and press
    "Save".
11. Load the page again and open "Access".

**Expected.** The tab offers only what it keeps: either a "Posting
Mode" choice that shows "Saved" is still selected after steps 4 and 11
and takes effect, or there is no "Posting Mode" at all. The server's
own code is built to make the choice of step 3 take effect: "Archives"
leaves the header, and the visitor and the Reader are refused the list,
the preprint and its PDF.

**Observed.** Step 3 shows "Saved". After steps 4 and 11 neither choice
is selected. The save sends the choice and the API accepts it, but the
context it returns has no `publishingMode`:

```
PUT /index.php/publicknowledge/api/v1/contexts/1
… publishingMode=2 …   →   200, the returned context without "publishingMode"
```

After step 3 the header reads "Archives About". As a visitor and as
`ccorino`, "Archives" opens the list with 17 preprints, and preprint 9
and its PDF viewer open. No request failed and no page script failed.

"Enable OAI", on the same tab and in the same save, is kept both ways.

## Cause

The context API keeps and returns only the properties declared in the
context schema. `SchemaDAO::updateObject()`
(`lib/pkp/classes/db/SchemaDAO.php`, line 148 on `main`) passes the
values through `PKPSchemaService::sanitize()` and writes one setting row
per schema property. `PKPContextController::edit()`
(`lib/pkp/api/v1/contexts/PKPContextController.php`, line 420) answers
from `PKPContextService::getFullProperties()`, which lists only schema
properties. OPS's `schemas/context.json` declares no `publishingMode`,
and neither does pkp-lib's, so the value the form sends is dropped
without an error.

The form still offers it. OPS `APP\components\forms\context\AccessForm`
(`classes/components/forms/context/AccessForm.php`, lines 41–49) adds
the "Posting Mode" radio over `publishingMode`, with
`Server::PUBLISHING_MODE_OPEN` and `PUBLISHING_MODE_NONE`.

`AccessForm` and OPS's `schemas/context.json` stopped matching in 2019,
while OPS was being cut down from OJS. The Introduced commit, "remove
unnecessary user groups", deleted 40 of the journal's properties from
the schema (subscriptions, fees, delayed open access, ISSNs),
`publishingMode` among them. `AccessForm`, and all the other code that
reads the setting, kept it.

In 2022 pkp decided against restoring it. `pkp/ops#368` added
`publishingMode` back to the schema and was closed unmerged. The
checklist of `pkp/pkp-lib#8318`, an OJS site-wide search issue, strikes
through the item for `pkp/ops#368` with "not needed the option/setting
should be removed". `pkp/pkp-lib#8343` (open) asks to "Implement fully
the PUBLISHING_MODE_NONE for OMP and OPS, but do not provide the
setting in the UI (Distribution > Access > Posting mode)". The radio is
still there.

Other code that reads the setting, checked on `main`. Each gets null
and so behaves as open:

- `APP\services\NavigationMenuService` hides "Archives" only for
  `PUBLISHING_MODE_NONE`, so it never hides (seen on screen).
- `OpsServerMustPublishPolicy`, on the preprint, preprints list,
  sections and search pages, never refuses (seen on screen for the
  first two). Its refusal sentence, `user.authorization.serverDoesNotPublish`,
  is in no OPS locale file.
- `templates/frontend/components/searchForm_archive.tpl` always shows
  the archive's search box, and `preprint_summary.tpl` treats null as
  open access.
- `Dc11SchemaPreprintAdapter` drops the galleys' `dc:relation` URLs
  (line 162) and the previous version's URL (line 190) under
  `PUBLISHING_MODE_NONE`; only the `dc:identifier` URL (line 150) is
  always added. The OAI records are unchanged today only because
  nothing is stored.
- No stored data: the setting was never written, so no install holds a
  `publishingMode` row for a server.
- OJS declares `publishingMode` in its schema and keeps the choice. OMP
  has no "Access" tab.

## Proposed fix

Remove the "Posting Mode" radio from OPS's `AccessForm`, so the tab
offers only what it keeps. This is a proposal. The patch is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posting-mode-not-kept/fix.diff),
against the OPS root:

```diff
-        $this->addField(new FieldOptions('publishingMode', [
-            'label' => __('manager.distribution.publishingMode'),
+        $this->addField(new FieldOptions('enableOai', [
+            'label' => __('manager.setup.enableOai'),
+            'description' => __('manager.setup.enableOai.description'),
             'type' => 'radio',
             'options' => [
-                ['value' => Server::PUBLISHING_MODE_OPEN, 'label' => __('manager.distribution.publishingMode.openAccess')],
-                ['value' => Server::PUBLISHING_MODE_NONE, 'label' => __('manager.distribution.publishingMode.none')],
+                ['value' => true, 'label' => __('common.enable')],
+                ['value' => false, 'label' => __('common.disable')],
             ],
```

The rest of the diff re-indents the "Enable OAI" field, which becomes
the form's first.

pkp has ruled that a server gets no "Posting Mode" on screen (see the
Cause), so the form is the layer to change. The schema and the code that reads the
setting stay as they are.

Tried on `main`: the "Access" tab shows "Enable OAI" alone, and the
server posts as before. A second check saved "Enable OAI" as "Disable"
and back to "Enable" with and without the fix: each choice was still
selected after a reload, and "Archives", the list, preprint 9 and its
PDF stayed open to a visitor.

**Alternatives**

- Declare `publishingMode` in OPS's `schemas/context.json` (the closed
  `pkp/ops#368`, `"in:0,2"`). The choice would then be kept, and the
  code above would take the server's contents offline; storing
  `PUBLISHING_MODE_NONE` would also drop the galley and version URLs
  from the server's OAI records. pkp rejected this in
  `pkp/pkp-lib#8318`. It would also need the missing refusal sentence
  for a signed-in Reader.
- Keep the radio and add a notice that it does nothing. That keeps a
  control with no effect.

**What goes with it**

- The three `manager.distribution.publishingMode*` strings in OPS
  `locale/*/manager.po` become unused and can go with the field.
- Backport: the diff applies as it stands to `stable-3_5_0` and, with a
  line offset, to `stable-3_4_0`. `stable-3_3_0` needs the same removal
  in `AccessForm.inc.php`.
- Guard: a Planned item in spec U51 (the server's "Access" tab offers
  "Enable OAI" and no "Posting Mode").

Small: removing the radio is one field out of one OPS form class,
tried, with no stored data and no API change. Making the mode work is
not part of it.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posting-mode-not-kept/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posting-mode-not-kept/lib.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ops shared/playwright/checks/issues/posting-mode-not-kept/walk.js`.
  It records the radios before and after each save, the save request,
  its answer and whether the answer carries `publishingMode`, the header,
  the "Archives" list, preprint 9 and its PDF viewer for the visitor and
  for `ccorino`, and every server error and page script error.
- The second check ("Enable OAI"):
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/posting-mode-not-kept/neighbour.js),
  run the same way.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/posting-mode-not-kept/fix.diff ops`,
  then walk.js and neighbour.js, each on a freshly loaded install, then
  `revert`. neighbour.js was also run without the fix.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01):
  - main: OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OPS 8eaf899468 (lib/pkp 1fb843f491): the same result
    at every step. Its `schemas/context.json` has no `publishingMode`,
    and `AccessForm.php` (lines 41–49) offers the radio.
- 3.4, by code: OPS `stable-3_4_0` at acd8ae704b, pkp-lib 32b0f4b4af.
  `schemas/context.json` has no `publishingMode`, `AccessForm.php`
  (lines 45–53) offers the radio, and `SchemaDAO::updateObject()`
  writes only sanitized schema properties.
- 3.3, by code: OPS `stable-3_3_0` at c5532e2161, pkp-lib f6ab331645.
  The same: no `publishingMode` in `schemas/context.json`, the radio in
  `AccessForm.inc.php` (lines 40–48), `SchemaDAO.inc.php` writing only
  sanitized properties, and the same readers
  (`OpsServerMustPublishPolicy.inc.php`, `NavigationMenuService.inc.php`).
- Introduced: `git log -S publishingMode -- schemas/` in OPS gives
  848801ffd6 (`pkp/pkp-lib#3594`, which moved the common properties to
  pkp-lib's schema and left `publishingMode` in OPS's own
  `schemas/context.json`) and 3f69b496b5, which removed it there.
  `commits/3f69b496b5/pulls` names no PR. The commit is on every
  release tag from `3_2_0-1`, so no OPS release kept the choice. The
  radio dates from the form's first commit (43b3907299,
  `pkp/pkp-lib#3594`), from the time OPS shared OJS's history.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/ops:
  `pkp/pkp-lib#8343` (open, milestone 3.4.0-x, no comments).
  `pkp/pkp-lib#8318` (closed, OJS site-wide search) holds the ruling on
  `pkp/ops#367` and `pkp/ops#368` (both closed unmerged).
- The partial way round is read in the code, not walked:
  `PKPPageRouter` (`lib/pkp/classes/core/PKPPageRouter.php`, line 180)
  redirects only signed-out visitors of a disabled context to the login
  page. The dataset's server stores no `disableUserReg`, so registration
  is open (read in its `server_settings`, not walked).
- Not driven: the sections and search pages' gate, and the Reader's
  refusal sentence, which no save can reach. OMP and OJS were not
  walked (OMP has no "Access" tab; OJS keeps the setting).
