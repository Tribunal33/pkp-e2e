# On an OMP site, a saved "Site style sheet" is loaded on no page, neither the site's nor any press's

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#614` for `pkp/pkp-lib#3594` · [88d8a48125](https://github.com/pkp/omp/commit/88d8a481256c2b8904647bba4694ad665614f087) · 2018-12-21 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#12753` (open), which reports this fault and a second one: the press's own style sheet linked twice
- **Tracked in** spec U60 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#omp1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The Site Administrator of an OMP site uploads a "Site style sheet",
sees "Saved", and no page changes: neither the site's own pages nor any
press's load it, while a journal site and a preprint server load it on
every public page.

Nothing says the sheet is ignored: the "Site style sheet" field even
names the stored file after a reload.

Site Settings offers the field on an OMP install that hosts two or more
presses, or none yet; an install with one press never sees it.

## Impact

- **Lost:** the styling the Site Administrator set for the whole site.
  No content or data is lost; the pages keep the theme's look.
- **Who:** the Site Administrator, and every reader of the site's pages
  and the presses' pages. Uploading a site style sheet is rare. On an
  install with no press yet, the site's own pages are all there is.
- **Way round:** for the presses' pages, the same rules uploaded as
  each press's "Press style sheet" (Settings › Website › "Appearance" ›
  "Advanced"), one press at a time. For the site's own pages (its home
  page, which lists the presses), none on screen.

Medium: a task fails (the uploaded sheet does nothing), and there is a
way round on screen for the presses' pages only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP), freshly loaded. It holds
  one press, `publicknowledge`, and no style sheet.
- On your computer: `u60i-site.css` holding one rule you see at once:

  ```css
  body::before { content: "u60i site style sheet"; display: block; background: #ff0; }
  ```

- A second press, which step 2 creates: Site Settings shows its
  "Appearance" tab only when the site holds a number of presses other
  than one.

1. Sign in as `admin` (password `admin`), the Site Administrator.
2. Go to Administration › "Hosted Presses" and press "Create Press".
   Fill in the name "u60i Press", initials "u60i", contact "u60i Press"
   and `u60i@mailinator.com`, country "Canada", path `u60i`, tick
   English as the language and the primary one, tick that it appears
   publicly, and press "Save". The press is created and its settings
   wizard opens (`/index.php/index/en/admin/wizard/<id>`). On an install
   without internet access the wizard's Plugin Gallery fails to load;
   that error is unrelated and can be ignored.
3. Go to Administration › "Site Settings", open the "Appearance" tab,
   then its "Setup" tab.
4. Under "Site style sheet", press "Upload File" and choose
   `u60i-site.css`. Press "Save": "Saved" shows.
5. Reload the page and open "Appearance" › "Setup" again. The field
   shows "styleSheet.css" as a link to `…/public/site/styleSheet.css`.
6. Sign out and open the site's home page (`/index.php/index`).
7. Open the press's home page (`/index.php/publicknowledge`).
8. Open the new press's home page (`/index.php/u60i`).

**Expected:** each of the three pages shows the yellow bar "u60i site
style sheet" at its top, and its page head links
`…/public/site/styleSheet.css` after the theme's own style sheets.

**Observed:** none of the three pages shows the bar, and none links the
site's style sheet: each page head links four style sheets, none of
them `styleSheet.css`. The file itself is stored:
`…/public/site/styleSheet.css` answers 200 with the uploaded rule.

The same steps on OJS (Hosted Journals, "Create Journal") and OPS
(Hosted Servers, "Create Server") show the bar on all three pages, each
head linking `…/public/site/styleSheet.css?v=3.6.0.0`.

## Cause

OMP's `TemplateManager::initialize()` (`classes/template/TemplateManager.php`,
from line 39) registers no style sheet for the site. Its twins in OJS
(line 65) and OPS (line 57) register the site's stored `styleSheet`
setting on every page, before branching on the context:

```php
if ($site->getData('styleSheet')) {
    $this->addStyleSheet(
        'siteStylesheet',
        $request->getBaseUrl() . '/' . $publicFileManager->getSiteFilesPath() . '/' . $site->getData('styleSheet')['uploadName'],
        ['priority' => self::STYLE_SEQUENCE_LATE]
    );
}
```

Nothing else registers it: pkp-lib's `PKPTemplateManager::initialize()`
registers only the context's own sheet (`contextStylesheet`, line 294),
and the default theme adds none. So the frontend's
`{load_stylesheet context="frontend"}` never prints the site's sheet on
an OMP site, though the shared Site Settings form
(`PKPSiteAppearanceForm`) and `PKPSiteService::edit()` store it as on
the other apps.

OMP had a block until `pkp/omp#614`, at `STYLE_SEQUENCE_LAST`. That
change moved the settings to the entity schema (`pkp/pkp-lib#3594`),
where the site's style sheet stopped being a file name read by
`Site::getSiteStyleFilename()`. In OJS, the twin change (43b3907299)
rewrote its block to read `$site->getData('styleSheet')`; in OMP it
deleted the block and added nothing in its place.

Reach:

- Every public page of an OMP site (the site's home page and every
  press's pages); checked in a browser on the three home pages.
- The editorial screens are not affected: the sheet is meant for the
  frontend only, and OJS and OPS do not load it there either (checked
  in a browser on Site Settings).

## Proposed fix

Add the block OJS and OPS carry to OMP's `TemplateManager::initialize()`,
in the same place: after the site's public files directory is assigned,
before the context branch, so it covers the site's pages and every
press's. The patch below is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-ignores-site-style-sheet/fix.diff)
as it stands; apply it at OMP's root with `patch -p1`.

```diff
--- a/classes/template/TemplateManager.php
+++ b/classes/template/TemplateManager.php
@@ -54,6 +54,14 @@
             $this->assign('sitePublicFilesDir', $siteFilesDir);
             $this->assign('publicFilesDir', $siteFilesDir); // May be overridden by press
 
+            if ($site->getData('styleSheet')) {
+                $this->addStyleSheet(
+                    'siteStylesheet',
+                    $request->getBaseUrl() . '/' . $publicFileManager->getSiteFilesPath() . '/' . $site->getData('styleSheet')['uploadName'],
+                    ['priority' => self::STYLE_SEQUENCE_LATE]
+                );
+            }
+
             // Pass app-specific details to template
             $this->assign([
                 'brandImage' => 'templates/images/omp_brand.png',
```

The fix uses `STYLE_SEQUENCE_LATE`, as OJS and OPS do, rather than the
`STYLE_SEQUENCE_LAST` of OMP's deleted block, so the three apps
register the site's sheet the same way. The priority does not decide
which sheet wins on a press that has its own style sheet as well; OMP's
second registration of the press's sheet does:

- Today, and with this fix alone, the press's rules win over the
  site's: OMP links the press's sheet a second time at
  `STYLE_SEQUENCE_LAST` (lines 77–84 of the same method), after the
  site's.
- With this fix and the removal of that second registration, which
  `pkp/pkp-lib#12753` asks for, the site's rules win, as they do on
  OJS and OPS today (seen in a browser on both). That is a visible
  change for a press with both sheets, and whether the site's sheet
  should reach the presses at all is the open question of
  `pkp/pkp-lib#5973`.

A search of OMP's, OJS's and OPS's `TemplateManager` found no other
site setting one app registers and the others do not.

Tried on OMP: with the diff applied, the Steps end with the bar on all
three pages and each head linking `…/public/site/styleSheet.css?v=3.6.0.0`.
A side check, run with and without the diff, uploaded both the site's
sheet and a "Press style sheet" for `publicknowledge`. Both times Site
Settings (an editorial screen) loaded neither sheet, and
`publicknowledge`'s own rules won over the site's; with the diff, that
press links the site's sheet between its own two links.

**Alternatives:**

- Move the block into pkp-lib's `PKPTemplateManager::initialize()`,
  beside the context's sheet, and delete it from the three apps: one
  home for both sheets, so the twins cannot drift again, but four
  repositories for a fault in one app.
- Load the site's sheet on the site's own pages only: that is the
  product question of `pkp/pkp-lib#5973` ("Site-wide stylesheet loads
  for every journal"), and the fix should not decide it for OMP alone.

**What goes with it:**

- `pkp/pkp-lib#12753`'s removal of the press's second registration fits
  the same pull request, with the change of order described above.
- Not part of this fix: the site's sheet carries only the `?v=<version>`
  cache-buster, not the `?d=<upload date>` the context's sheet has, so
  a re-uploaded site sheet can stay cached in browsers until the next
  upgrade. OJS and OPS have the same gap; the pkp-lib alternative above
  would close it in one place.
- Backport: the diff applies as written to `stable-3_5_0`. On 3.4 the
  same lines sit in the same method; on 3.3 the file is
  `TemplateManager.inc.php` and the priority is the global
  `STYLE_SEQUENCE_LATE`, as in OJS 3.3.
- Test: an end-to-end check of the site's style sheet on a press site,
  proposed as a Planned item in pkp-e2e's site settings spec (its
  scenario 11 runs today on OJS and OPS only).

Small: one block in one OMP method, copied from its OJS and OPS twins,
with no data repair.

## Evidence

- The script that takes the Steps through the browser on a freshly
  loaded default dataset, in pkp-e2e's own harness:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-ignores-site-style-sheet/walk.js)
  (`node bin/probe.js all <script>`). With `WALK=nb` in front it runs
  the side check under Proposed fix instead.
- Walked: on `main`, the Steps on OJS, OMP and OPS without the fix and
  on OMP with it, and the side check on the three apps without the fix
  and on OMP with it; on `stable-3_5_0`, the Steps on OJS, OMP and OPS
  (the same result as `main`, `?v=3.5.0.5` on OJS and OPS).
  PostgreSQL, datasets pkp/datasets 566bb1f (2026-10-03). No page
  script failed; the only server errors were the Plugin Gallery's list
  (step 2).
- Not driven: 3.4 and 3.3, and an install with no press (the field's
  condition, `AdminHandler::siteSettingsAvailability()`, is a press
  count other than one: read in the code).
- Tips:
  - **`main`:** OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
    and OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - **`stable-3_5_0`:** OJS c1cee76b95 (lib/pkp 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335).
  - **`stable-3_4_0`:** OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib ac3fa73402.
- Code reads: on `main` and `stable-3_5_0`, each app's
  `TemplateManager::initialize()`, pkp-lib's
  `PKPTemplateManager::initialize()`, `addStyleSheet()` and
  `smartyLoadStylesheet()`, `PKPSiteAppearanceForm`, and the frontend
  and backend layouts' `load_stylesheet`. On `stable-3_4_0` and
  `stable-3_3_0`, each app's `TemplateManager` (OMP registers only
  `contextStylesheet`, OJS and OPS `siteStylesheet`), pkp-lib's
  `PKPTemplateManager` (no site sheet) and `PKPSiteAppearanceForm`
  (the "Site style sheet" field is there).
- Introduced: `git log -S"'siteStylesheet'"` on OMP's
  `classes/template/` names 88d8a48125, which deletes the
  `getSiteStyleFilename()` block (merged as `pkp/omp#614` on
  2019-01-09).
- Upstream: searched pkp/pkp-lib and pkp/omp, issues and PRs, open and
  closed, on 2026-10-04 ("site style sheet OMP", "site stylesheet",
  `siteStylesheet`). `pkp/pkp-lib#12753`'s body is about the press's
  own sheet linked twice; its title and a comment of 2026-09-25 add
  this fault ("the site style sheet uploaded under Administration →
  Site Settings → Appearance is also never loaded in OMP"). No pull
  request is linked to it.
- Unverified: that OMP loaded the site's sheet in a browser before
  2018; read in the code only (the deleted block loaded the file when
  it existed).
