# A galley's separate-website box keeps an address typed without "https://", and readers' link lands on "404 Not Found"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/ojs#819` for `pkp/pkp-lib#1123` · [8a917dd997](https://github.com/pkp/ojs/commit/8a917dd997e8fd16f716bfeca14a90150b0b0643) · 2016-04-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U46 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor adds a galley with "This galley will be available at a
separate website." ticked and types the address without "https://", such
as "www.example.org". "Save" keeps whatever is typed, with no message,
although the galley's field is meant to hold a web address.

Once the article or preprint is published, readers who press the
galley's link land on the journal's or server's own "404 Not Found" page
instead of the remote copy, and nobody on the editorial side is told.
From 3.5 on, an editor can correct the address in the published
galley's "Edit" window; on 3.4 and 3.3 that window is view-only once the
item is published, so the editor has to unpublish or create a new
version first.

A press's publication format window, which has the same address box,
refuses such an address before saving.

## Impact

- **Lost**: the reader's way to the remote copy of the article or
  preprint, for as long as the address stays wrong; nobody is told.
- **Who**: an editor, section editor, layout editor or moderator who
  sets up a galley hosted at a separate website and leaves out
  "https://", and every reader of that item. Remote galleys are an
  ordinary option but uncommon, and the address has to be mistyped.
- **Way round**: once someone notices, the full address typed in the
  published galley's "Edit" window mends the link on `main` and 3.5 (on
  a preprint server only for an administrator, a manager or a
  Moderator) (code). On 3.4 and 3.3 that window is view-only after
  publishing, so the item must be unpublished or given a new version
  first (code). Before publishing, the editorial "Galleys" list shows a
  remote galley's label without a link, so the mistake shows only on the
  public page.

Medium: the published item's link to its full text is dead and nobody is
told, but only for a remote galley whose address lacks its scheme, and
an editor can mend it on screen. It would be high if remote galleys
were common. On 3.4 and 3.3 the mend needs an unpublish or a new
version, which is slower but still a way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS or OPS), freshly loaded.
  Nothing else: the steps use `dbarnes`, OJS submission 1 "Signalling
  Theory Dividends" (published, its newer version 1.1 not yet published)
  and OPS submission 1 "The influence of lactation on the quantity and
  quality of cashmere production" (in Production, one galley "PDF").

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 1 and, in the side menu, "Publication" › "Version of
   Record 1.1" › "Galleys" [OPS: "Preprint" › "Galleys"; 3.5: the side
   menu has no version entries; "Publication" › "Galleys" opens version
   1.1].
3. Press "Add galley". In "Create New Galley" type "Web u46w4" in
   "Galley Label".
4. Tick "This galley will be available at a separate website." and type
   `www.example.org` in "URL of remotely-hosted content".
5. Press "Save". The window "Upload a File Ready for Publication"
   opens; press its "Cancel".
6. In the "Galleys" list open "Web u46w4" › "Edit" and read "URL of
   remotely-hosted content"; press "Cancel".
7. OJS: publish version 1.1: press "Publish", keep what "Review
   Publishing Details" preselects, press "Confirm", then "Publish" [3.5:
   "Publish", then the window's "Publish"]. OPS: press "Post", then
   "Post" in the confirmation.
8. Sign out, open the article's page
   (`/index.php/publicknowledge/article/view/1`) [OPS:
   `/index.php/publicknowledge/preprint/view/1`] and press "Web u46w4".

**Expected:** step 5 refuses the address: the window stays open with a
message under "URL of remotely-hosted content" asking for a web address,
and nothing is saved.

**Observed:** step 5 saves (the window closes and the upload window
opens), and step 6 shows the box ticked and `www.example.org` kept. In
step 8 the article page lists "PDF Version 2" and "Web u46w4". The
article's address in the dataset is `…/article/view/mwandenga` (its URL
Path), and "Web u46w4" links to galley 4 under it. Pressing it goes:

```
302 /index.php/publicknowledge/en/article/view/mwandenga/4
404 /index.php/publicknowledge/en/article/view/mwandenga/www.example.org
```

The first line is the galley link's own redirect, whose `Location` is
the bare text; the second is the browser resolving that text against the
galley's address. The page reads only "404 Not Found". OPS:
`…/preprint/view/1/21` answers 302 and `…/preprint/view/1/www.example.org`
404, "404 Not Found".

With `https://www.example.org/u46w4` typed at step 4 instead, the galley
saves and the reader's link opens that address.

## Cause

The galley forms never check the address. `ArticleGalleyForm::__construct()`
(OJS `controllers/grid/articleGalleys/form/ArticleGalleyForm.php` lines
59–62) adds checks for the label, the URL Path, the locale, the POST and
the CSRF token, and none for `urlRemote`. `execute()` (line 178) stores
the text as typed, and the template renders the box as a plain text box
(`templates/controllers/grid/articleGalleys/form/articleGalleyForm.tpl`
line 37, `type="text"`), so the browser does not check it either.
`PreprintGalleyForm` in OPS is the same form.

The rule exists but nothing applies it. `schemas/galley.json` (OJS and
OPS) gives `urlRemote` `"validation": ["url"]`, and only
`Repo::galley()->validate()` reads it. On `main` nothing calls that
method: there is no galleys API, and neither form nor the native XML
import uses it.

The reader's link then follows the stored text.
`ArticleHandler::view()` (OJS `pages/article/ArticleHandler.php` line 366)
and `download()` (line 518) answer a remote galley with
`$request->redirectUrl($this->galley->getData('urlRemote'))`, a
`Location` header holding the bare text. The browser resolves
`www.example.org` against the galley's own address, which lands on a
page that does not exist. OPS's `PreprintHandler` does the same (lines
308 and 372).

The remote address box came into OJS 3 with 8a917dd997 (`pkp/ojs#819`,
"remotely hosted galleys for OJS 3"), as a text box without a check,
and OPS started from the OJS form. OMP's publication format window got
the browser's URL check on the box in 2020, when OMP 27f7a88fa6
(`pkp/omp#860`, "Update input type") changed it to `type="url"`; the
galley forms never followed.

Reach:

- Adding and editing alike: "Create New Galley" and the galley's "Edit"
  window are the same form. Adding was walked, and so was "Edit" showing
  the kept text; saving a changed address in "Edit" was read in the code.
- OPS's submission wizard, where an author adds galleys, uses the same
  `PreprintGalleyForm` (code).
- The reader's "Download" address of a remote galley redirects the same
  way (code).
- OMP: `PublicationFormatForm` has no server check either, but its box is
  `type="url"`, so the screen refuses such an address (walked on `main`
  and 3.5).
- Only an address without a scheme (or otherwise not a URL) is caught
  by a URL check: a typo inside a full `https://` address is a valid URL
  and stays the editor's to notice.

## Proposed fix

Add the URL check the code base already has for an optional address,
`FormValidatorUrl`, to each form, as `UserDetailsForm` and
`PublicProfileForm` do for a user's "Homepage URL" (with their own
message, `user.profile.form.urlInvalid`):

```diff
--- a/controllers/grid/articleGalleys/form/ArticleGalleyForm.php
+++ b/controllers/grid/articleGalleys/form/ArticleGalleyForm.php
         $this->addCheck(new \PKP\form\validation\FormValidatorRegExp($this, 'urlPath', 'optional', 'validator.alpha_dash_period', '/^[a-zA-Z0-9]+([\\.\\-_][a-zA-Z0-9]+)*$/'));
+        $this->addCheck(new \PKP\form\validation\FormValidatorUrl($this, 'urlRemote', 'optional', 'validator.url'));
```

and the same line in OPS `PreprintGalleyForm::__construct()`. OMP's
`PublicationFormatForm::__construct()` gets it too, for `remoteURL`:
its box is checked only in the browser today, and the server should
refuse the same addresses there.

`FormValidatorUrl` applies Laravel's `url` rule, the rule
`schemas/galley.json` names. The fix uses the message `validator.url`
("This is not a valid URL."), the one `ValidatorFactory` gives that rule
everywhere, rather than the user profile's own key. The check also adds
the `url` class to the box (`$form->cssValidation`), so the browser
refuses the address before anything is sent. An empty box still passes
("optional"), and unticking the remote box empties it, so galleys with a
file are not touched.

The diffs, one per app root:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-address-not-checked/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-address-not-checked/fix-ops.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-address-not-checked/fix-omp.diff).
Tried on `main` in all three apps: step 5 was refused in the browser
on OJS and OPS ("Please enter a valid URL." under the box, nothing sent,
the list unchanged). With the fix in and
out alike, a galley with the remote box unticked still saved, and
`https://www.example.org/u46w4` still saved (on OMP too) and the
reader's link opened it.

This is a proposal; the team decides.

**Alternatives**:

- `type="url"` on the two templates, as OMP has: the browser refuses,
  but the server still keeps whatever a save sends, so the rule holds in
  one place only.
- Calling `Repo::galley()->validate()` from the forms: it applies the
  whole schema, but the forms already check the label, the URL Path and
  the locale with their own messages, so those would be checked twice;
  OMP's publication format has no such schema.
- Adding "https://" in front of an address without a scheme when it is
  saved or followed: it guesses, and hides a typing mistake that may be
  more than a missing scheme.

**What goes with it**:

- Galleys already saved with such text keep it, and their links stay
  broken until edited. No migration is proposed: only the editor knows
  the intended address, and prefixing "https://" would guess. A site
  can list them with a one-off query:
  `SELECT galley_id, publication_id, remote_url FROM publication_galleys WHERE remote_url IS NOT NULL AND remote_url !~* '^https?://';`
  (PostgreSQL; `NOT REGEXP` on MySQL). With the fix, a later "Save" in
  such a galley's "Edit" window is refused until the address is
  corrected, which works on `main` and 3.5 for a published galley too;
  on 3.4 and 3.3 that window is view-only once published (code).
- The native XML import (`NativeXmlRepresentationFilter`) still stores
  an imported address as given: it is left out because it bypasses
  every form check of the galley, and checking imports is a change of
  its own.
- Backport: `FormValidatorUrl` with the same `url` class is in pkp-lib
  3.5, 3.4 and 3.3, so the same line applies there (on 3.3 unqualified,
  in `ArticleGalleyForm.inc.php` in OJS and OPS).
- Test: an e2e check in spec U46 (a **Planned** item) that "Create New
  Galley" refuses `www.example.org` and saves `https://www.example.org`.

Medium: the change is one line, following a pattern the code already
uses, but it lands in three app repositories (OJS, OPS and OMP; pkp-lib
is not touched), and REPORT.md counts a fix across two repositories or
more as medium. It needs no data repair, since stored addresses are left
to the editors.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-address-not-checked/walk.js)
  takes the Steps on OJS and OPS and the control on OMP, and records for
  each "Save" or "OK" the saves sent, the answer, whether the window
  stays open and the messages in it; then the address kept in "Edit"
  and, for the reader's press, every answer and the page reached.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/remote-galley-address-not-checked/walk.js`.
  - **Control run** (the same windows with a valid address, and with the
    remote box unticked): `W4_MODE=nb` in front saves a galley "Draft
    u46w4" with the box unticked, then "Web u46w4" with
    `https://www.example.org/u46w4` (OMP: a format with that address),
    publishes or posts, and presses the reader's link.
  - **Fix trial:** `node bin/try-fix.js apply <fix-app.diff> <app>` for
    each app, the walk, then the control run with the fix in and, after
    `node bin/try-fix.js revert <fix-app.diff> <app>`, out.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02).
- Not driven: 3.4 and 3.3; saving a changed address in "Edit", on a
  published galley or not; OPS's submission wizard; the "Download"
  address.
- Unverified: the fix's server-side refusal (the browser refuses first,
  so no walk reached it); read in the code (`ValidatorUrl` applies
  Laravel's `url` rule).
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c
    (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each).
  - **`stable-3_4_0`:** OJS c1827e3527, OMP 0aec65441f, OPS acd8ae704b,
    pkp-lib 9e41f10273.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib ac3fa73402.
- Code reads:
  - `main`: `ArticleGalleyForm` and `PreprintGalleyForm`
    (`__construct()`, `execute()`), their templates, `schemas/galley.json`,
    `Repo::galley()->validate()` and its callers (none),
    `ArticleHandler::view()` and `download()`, `PreprintHandler`'s twins,
    OMP `PublicationFormatForm` and `formatForm.tpl`, pkp-lib
    `FormValidatorUrl`, `ValidatorUrl`, `FormBuilderVocabulary::_addClientSideValidation()`,
    `NativeXmlRepresentationFilter`; the galley grids' `canEdit()` (OJS
    production-stage access; OPS: administrator, or manager and
    Moderator once posted).
  - 3.5, 3.4 and 3.3: OJS and OPS galley forms and templates (no URL
    check, `type="text"`), the `ArticleHandler`/`PreprintHandler`
    redirects, the grids' `canEdit()` (3.5 as `main`; 3.4 and 3.3 false
    for a published version in both apps), pkp-lib `FormValidatorUrl`
    (adds the `url` class on each), OMP `formatForm.tpl` (`type="url"`
    on each). OPS 3.3 names its form `ArticleGalleyForm.inc.php`.
- The trace: `git blame` on the template's `urlRemote` line leads to
  8a917dd997 (2016-04-12, Bozana Bokan, `pkp/ojs#819` for
  `pkp/pkp-lib#1123`), which added the box as `type="text"` with no check
  in `ArticleGalleyForm`. OMP's box: 27f7a88fa6 (2020-09-15, Manuel
  Garcia, `pkp/omp#860`).
- Upstream (2026-10-02): none found in pkp/pkp-lib, pkp/ojs, pkp/ops,
  pkp/omp and pkp/ui-library. Nearest: `pkp/pkp-lib#6621` ("Remote
  galleys are broken", a crash opening a remote galley's window on OPS
  3.3, fixed) and `pkp/pkp-lib#1123` (the feature itself).
