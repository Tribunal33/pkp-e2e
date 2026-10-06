# A preprint server's "View Preprint Content" sign-in box says "Saved" but keeps nothing, so files stay open

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** [3f69b496b5](https://github.com/pkp/ops/commit/3f69b496b5b6b6fa37de1c5b67ee6a41d0d9a8e6) · 2019-06-03 (no PR; before the first OPS release) · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#ops1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A preprint server's Settings › Users & Roles › "Site Access Options" tab
offers "Users must be registered and log in to view open access
content." under "View Preprint Content". Ticked and saved, the tab says
"Saved", but opened again the box is unticked.

Signed-out visitors still open and download the files of every posted
preprint (its PDF and any other galley), which is what the manager meant
to stop. A journal and a press have the same box, store it and send
signed-out visitors to the Login page.

OPS has no check that would send signed-out visitors to the Login page
even if the box were stored, so the fix proposed here removes the box
rather than making it work.

## Impact

- **Lost.** The manager's choice, and with it the sign-in they meant to
  require for the files.
- **Who.** A preprint server's manager who wants posted files read by
  signed-in users only. Every save loses the box. Most servers post
  openly and never touch it.
- **Way round.** Partial. "Users must be registered and log in to view
  the server site.", on the same tab, sends signed-out visitors to the
  Login page for the files too, but also for the home page, the
  preprint pages and the abstracts.

Medium: what stays open is what the manager meant to close. Few
servers want it, and the site-wide box is a way round, so it is not
high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS (server `publicknowledge`).
  Preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative
  Study Of Construct Equivalence", is posted with a "PDF" galley.

Steps:

1. Signed out, open preprint 2
   (`/index.php/publicknowledge/en/preprint/view/2`) and press "PDF". The
   PDF viewer opens.
2. Sign in as `dbarnes` (a Preprint Server manager).
3. Open Settings › Users & Roles, then the "Site Access Options" tab.
4. Under "View Preprint Content", tick "Users must be registered and log
   in to view open access content.".
5. Press "Save".
6. Load the page again and open "Site Access Options".
7. Sign out. Open preprint 2 again, press "PDF", then the viewer's
   "Download" link.

**Expected.** The tab offers only what it keeps. Either the box is still
ticked after step 6 and step 7 sends the visitor to the Login page, as a
journal does for an article's galley and a press for a book's file, or
the tab has no such box.

**Observed.** Step 5 shows "Saved". After step 6 the box is unticked.
The save sends the box and the API accepts it, but the context it
returns has no `restrictPreprintAccess`:

```
PUT /index.php/publicknowledge/api/v1/contexts/1
restrictSiteAccess=false&restrictPreprintAccess=true&disableUserReg=false
  →  200, the returned context without "restrictPreprintAccess"
```

In step 7 the PDF viewer opens (`/preprint/view/2/2`, 200) and the
download delivers the file.

On a journal (OJS `dbarnes`, article 17, "View Article Content") and on
a press (OMP `dbarnes`, book 5, "View Monograph Content") the same steps
leave the box ticked after the reload and send the signed-out visitor
from the "PDF" link to the Login page.

## Cause

The context API stores and returns only the properties declared in the
context schema. `PKPContextController::edit()` passes every posted value
to `PKPContextService::edit()`, which merges them into the context.
`SchemaDAO::updateObject()` (`lib/pkp/classes/db/SchemaDAO.php`, line 159
on `main`) then writes only the schema's properties, and the answer is
built from `PKPContextService::getFullProperties()` on the context read
again, which lists only schema properties. OPS's `schemas/context.json`
declares no `restrictPreprintAccess`, and neither does pkp-lib's, so the
value is dropped while the save answers 200.

The form still offers it. OPS `APP\components\forms\context\UserAccessForm`
(`classes/components/forms/context/UserAccessForm.php`, lines 30–36)
adds a `FieldOptions` over `restrictPreprintAccess` after pkp-lib's
"Site Access" field. No OPS code reads the setting.

The form and the schema stopped matching in 2019, while OPS was being
cut down from OJS. In 2019 the field was named `restrictArticleAccess`.
The Introduced commit, "remove unnecessary user groups", deleted 40 of the
journal's properties from OPS's `schemas/context.json`,
`restrictArticleAccess` among them. [55d5b15cf5](https://github.com/pkp/ops/commit/55d5b15cf50a79bbe5d858b745cd0972756a96db)
(2020-02-04, "fix preprinthandler error") then removed the only reader,
the journal's sign-in check in `PreprintHandler`. The form kept its
field, and [0cc844c694](https://github.com/pkp/ops/commit/0cc844c694f6aba42adbea6e554952222da8f7b6)
(`pkp/pkp-lib#6759`, "replace Article with Preprint", 2021) renamed it
to `restrictPreprintAccess` with the rest of the code.

Reach, checked in the code on `main` unless marked:

- `PreprintHandler::userCanViewGalley()`, which both the galley view and
  the download pass through, lets anyone open any galley of a posted
  preprint, and a user for whom `Repo::submission()->canPreview()` holds
  open an unposted one (also seen in the walk).
- OJS declares `restrictArticleAccess` in its schema and reads it in
  `ArticleHandler::userCanViewGalley()` and `IssueHandler`; OMP declares
  `restrictMonographAccess` and reads it in `CatalogBookHandler` (both
  also seen in the walk).
- No stored data: the setting was never written, so no install holds a
  `restrictPreprintAccess` row for a server.
- The same 2019 change left OPS's "Posting Mode" radio (Settings ›
  Distribution › "Access") posting a property the schema lacks. That
  radio has its own report and its own fix,
  [U51-OPS1-posting-mode-says-saved-keeps-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md).
  A comparison of every field of the context forms with each app's
  context schema found no other field that posts to the context API
  without a schema property.

## Proposed fix

Remove the box from OPS's `UserAccessForm`, so the tab offers only what
it keeps. The class stays, since pkp-lib's
`ManagementHandler` builds the tab from it, and becomes an empty
subclass, as OPS's `LicenseForm` and `ReviewGuidanceForm` already are.
The patch is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/fix.diff),
against the OPS root:

```diff
- * @brief Add OPS-specific fields to the users and roles access settings form.
+ * @brief The users and roles access settings form. A preprint server adds no fields.
 ...
 use PKP\components\forms\context\PKPUserAccessForm;
-use PKP\components\forms\FieldOptions;
 
 class UserAccessForm extends PKPUserAccessForm
 {
-    /**
-     * @copydoc PKPUserAccessForm::__construct()
-     */
-    public function __construct($action, $context)
-    {
-        parent::__construct($action, $context);
-
-        $this->addField(new FieldOptions('restrictPreprintAccess', [
-            'label' => __('manager.setup.siteAccess.viewContent'),
-            'value' => (bool) $context->getData('restrictPreprintAccess'),
-            'options' => [
-                ['value' => true, 'label' => __('manager.setup.restrictPreprintAccess')],
-            ],
-        ]), [FIELD_POSITION_AFTER, 'restrictSiteAccess']);
-    }
 }
```

pkp ruled the same way for the sibling "Posting Mode" radio, left
behind by the same 2019 change: `pkp/ops#368`, which added it back to
the schema, was closed unmerged, and the checklist of `pkp/pkp-lib#8318`
strikes it through with "not needed the option/setting should be
removed".

Tried on `main`: the tab shows "Site Access" and "User Registration"
only, and the preprint's PDF stays open to visitors and signed-in
readers as before. A second check saved "User Registration" with each
of its two choices, with and without the fix: each was stored and still
selected after a reload.

**Alternatives**

- Make the box work: declare `restrictPreprintAccess` (boolean,
  nullable) in OPS's `schemas/context.json`, and in
  `PreprintHandler::userCanViewGalley()` send a signed-out visitor to
  the Login page when it is set, as OJS's `ArticleHandler` does, after
  the `canPreview()` pass so previews keep working. That is a product
  decision for pkp, since OPS removed the feature, and it
  would add a property to the context API.
- Keep the box and add a notice that it does nothing. That keeps a
  control with no effect.

**What goes with it**

- `manager.setup.restrictPreprintAccess` and
  `manager.setup.siteAccess.viewContent` in OPS's `locale/*/manager.po`
  become unused and can go with the field.
- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0`, whose file is the same. `stable-3_3_0` needs the same
  removal in `UserAccessForm.inc.php`, where the field still posts
  `restrictArticleAccess`.
- Guard: a Planned item in spec U54 (a preprint server's "Site Access
  Options" offers "Site Access" and "User Registration" only).

Small: one field out of one OPS form class, tried.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset, on OPS and on OJS and OMP as the control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/lib.js).
  Run it from a pkp-e2e checkout with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/walk.js`
  (`PROBE_FEATURE` names the install it drives, `PROBE_AGENT` the folder
  its records go to).
  It records the box before and after the save and the reload, the
  posted fields, whether the answer carries the setting, the stored
  value, and what a signed-out visitor gets from the "PDF" link and the
  download. It also runs two neighbour checks: a signed-in reader
  (`ckwantes`; OMP `aclark`) with the box ticked, and a signed-out
  visitor after the box is unticked again.
- The second check ("User Registration"):
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/neighbour.js),
  run the same way.
- The fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/fix.diff ops`,
  then walk.js and neighbour.js on OPS, each on a freshly loaded install,
  then `revert`. neighbour.js was also run without the fix.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01):
  - main: OPS c8af945bb7 (lib/pkp 3dc90c81a6), OJS b84f8e2e44 (lib/pkp
    ddd8ab243a), OMP 3b0ecf794 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OPS 8eaf899468 (lib/pkp 1fb843f491), OJS c346ee00a5
    (lib/pkp 3bb4450bea), OMP c7b45f88e (lib/pkp 1fb843f491): the same
    result at every step. OPS's `schemas/context.json` there has no
    `restrictPreprintAccess`, and `UserAccessForm.php` is the same as
    on `main`.
- 3.4, by code: OPS `stable-3_4_0` at acd8ae704b, pkp-lib 32b0f4b4af.
  `UserAccessForm.php` is the same as on `main`, `schemas/context.json`
  has no such property, `SchemaDAO::updateObject()` writes only schema
  properties (line 152), and `PreprintHandler.php` reads no access
  setting.
- 3.3, by code: OPS `stable-3_3_0` at c5532e2161, pkp-lib f6ab331645.
  `UserAccessForm.inc.php` (lines 26–32) offers the box over
  `restrictArticleAccess`, which `schemas/context.json` does not
  declare; `SchemaDAO::updateObject()` writes only schema properties
  (`SchemaDAO.inc.php`, line 140), and `PreprintHandler.inc.php` reads
  no access setting.
- Introduced: `git log -S restrictArticleAccess` in OPS. At 3f69b496b5
  the form posted `restrictArticleAccess` and the commit removed it from
  `schemas/context.json`; `commits/3f69b496b5/pulls` names no PR, and
  the commit is on every release tag from `3_2_0-1`, so no OPS release
  kept the choice. The field dates from the form's first commit
  (43b3907299, `pkp/pkp-lib#3594`), from the time OPS shared OJS's
  history.
- Upstream search 2026-10-02, pkp/pkp-lib and pkp/ops, issues and PRs:
  `restrictPreprintAccess`, `restrictArticleAccess`, `UserAccessForm`,
  "View Preprint Content", "view open access content", "must be
  registered", "Site Access" with OPS. Nothing on this fault.
- The way round is read in the code, not walked:
  `RestrictedSiteAccessPolicy` sends signed-out visitors of a server
  with "Site Access" ticked to the Login page on every page but Login,
  Register and a few others.
- MySQL not checked; the fault does not depend on the database.
