# A press's and a preprint server's homepage image never carries the "Alternate text" the manager typed

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code)
- **Introduced** `pkp/omp#676` and `pkp/ojs#2376` (the journal template OPS was later copied from) for `pkp/pkp-lib#4683` · [d9ffc0c1ec](https://github.com/pkp/omp/commit/d9ffc0c1ecb112d9def47c1ee69002025709ba1f), [e7c66ecb3c](https://github.com/pkp/ojs/commit/e7c66ecb3c58be1e2e9eed80313c470ace2fabc5) (also in OPS's history, forked from OJS) · 2019-05-14 · E.L. Guerrero (mylonelycomputer)
- **Upstream** `pkp/pkp-lib#5778` (closed with a fix for OJS only, `pkp/ojs#2715`; OMP and OPS never received it)
- **Tracked in** spec U10 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager who uploads a "Homepage Image" and types its "Alternate text" expects that text as the picture's description, as a journal's home page gives it. A press's and a preprint server's home page show the picture with an empty description, whatever was typed, so a screen reader skips it as decoration.

The settings tab keeps the text and says "Saved", so nothing tells the manager it never reaches readers. Every press and preprint server on the default theme that shows a homepage image in the page body meets it.

## Impact

- **Lost**: the picture's description, for readers who use a screen reader or have images turned off.
- **Who**: every reader of a press's or a preprint server's home page that has a homepage image, on the default theme, unless "Show the homepage image as the header background." is ticked, which shows the picture as the header's background instead of in the page body.
- **Way round**: none on screen. A picture that carries text (a banner, a call for papers) loses that text for these readers.

Low: nothing a manager or reader does fails, and the loss is one description on one page. It would be medium where the picture carries text a reader needs, such as a call for papers.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP "Public Knowledge Press", OPS "Public Knowledge Preprint Server"; context path `publicknowledge`). The dataset's Default theme has "Show the homepage image as the header background." unticked.
- A picture on the computer, `home.png` (any PNG; the walk used 300 × 100 pixels).

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Website › "Appearance" › "Setup".
3. Under "Homepage Image", press "Upload File" and choose `home.png`.
4. In the box's "Alternate text", type "Our building".
5. Press "Save" at the foot of the tab: "Saved" shows.
6. Reload the tab: "Homepage Image" shows the picture with "Our building" in "Alternate text".
7. Open the home page (`/index.php/publicknowledge`).
8. Inspect the picture under the page's top (the browser's "Inspect", or a screen reader's list of images).

**Expected**: the picture is described as "Our building":

```html
<img src="…/presses/1/homepageImage_en.png" alt="Our building">
```

**Observed**: on the press and on the preprint server the picture's description is empty, and a screen reader does not list it:

```html
<img src="…/presses/1/homepageImage_en.png" alt="">
<img src="…/contexts/1/homepageImage_en.png" alt="">
```

The same steps on the dataset's journal ("Journal of Public Knowledge") give `<img … alt="Our building">`.

## Cause

The "Homepage Image" field (`PKPAppearanceSetupForm`, a `FieldUploadImage`) saves the typed text inside the setting's own value, as `homepageImage.altText` (`lib/pkp/schemas/context.json`, the `homepageImage` object's `altText` property). The context has no separate `homepageImageAltText` setting.

The press's and the server's home page templates read a `homepageImageAltText` variable instead, named after a setting that does not exist:

- OMP `templates/frontend/pages/index.tpl` line 29: `alt="{$homepageImageAltText|escape}"`. `IndexHandler::_displayPressIndexPage()` never assigns `homepageImageAltText`, so the variable is empty.
- OPS `templates/frontend/pages/indexServer.tpl` line 31, the same line. OPS's `IndexHandler::index()` assigns it from `$server->getLocalizedData('homepageImageAltText')`, which is null.

OJS's `indexJournal.tpl` writes `{if $homepageImage.altText} alt="{$homepageImage.altText|escape}"{/if}`, which is why the journal works; with the box empty it leaves `alt` out altogether.

The line came with the "use the homepage image as the header background" change for `pkp/pkp-lib#4683` (OMP [d9ffc0c1ec](https://github.com/pkp/omp/commit/d9ffc0c1ecb112d9def47c1ee69002025709ba1f), OJS [e7c66ecb3c](https://github.com/pkp/ojs/commit/e7c66ecb3c58be1e2e9eed80313c470ace2fabc5)). That change wrapped the picture in the new header-background condition. In the same edit, the `alt` source went from `$homepageImage.altText` back to the old variable. OMP had read `$homepageImage.altText` since 2015, OJS since `pkp/pkp-lib#4557` three weeks earlier. OJS was corrected in 2020 for `pkp/pkp-lib#5778` (`pkp/ojs#2715`: [8cb940a8e4](https://github.com/pkp/ojs/commit/8cb940a8e491910636799f3dcdb6df7b47e13a90), then [deed55c18a](https://github.com/pkp/ojs/commit/deed55c18ad23c61404d01343fd9a35ff6a49b21) the next day, which added the `{if}`). OPS's template had been copied from OJS's before that and kept the faulty line, and OMP was never changed.

Reach:

- Every language: the field is per language and the handlers already pass that language's `homepageImage`, so only the description read is wrong (read in the code).
- The header-background option: `DefaultThemePlugin` sets the picture as the header's CSS background and the body template skips it, so this line is never reached (seen on OMP and OPS).
- The other pictures with a typed description read it correctly on all three apps: the site's list of contexts (`$thumb.altText`), the logo (`$displayPageHeaderLogo.altText`), book, article and preprint covers (`$coverImage.altText`) (read in the code).
- OJS's `IndexHandler::index()` still assigns the unused `homepageImageAltText` from the missing setting; harmless, but the same leftover (read in the code).

## Proposed fix

Read the description where the field stores it, in both templates, and drop the dead assignment from OPS's handler ([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/homepage-image-alt-text-dropped/fix-omp.diff), [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/homepage-image-alt-text-dropped/fix-ops.diff)):

```diff
--- a/templates/frontend/pages/index.tpl            (OMP; OPS: indexServer.tpl, the same line)
+++ b/templates/frontend/pages/index.tpl
-		<img src="{$publicFilesDir}/{$homepageImage.uploadName|escape:"url"}" alt="{$homepageImageAltText|escape}">
+		<img src="{$publicFilesDir}/{$homepageImage.uploadName|escape:"url"}" alt="{$homepageImage.altText|escape|default:''}">
--- a/pages/index/IndexHandler.php                 (OPS)
+++ b/pages/index/IndexHandler.php
-                'homepageImageAltText' => $server->getLocalizedData('homepageImageAltText'),
```

`alt="{$….altText|escape|default:''}"` is how the same templates already write the book and preprint covers, so an empty box keeps today's empty `alt` and the picture stays marked decorative (the trailing `|default:''` does nothing after `|escape`; it stays only to match those lines and can go). The header-background condition is untouched.

Tried on `main`: with the fix in, the steps show `alt="Our building"` on the press and the server, and a screen reader lists the picture by that name. The neighbour check, with the fix in: a description with quotes and an ampersand arrives whole and escaped (`alt="Our &quot;big&quot; building &amp; yard"`), an emptied box still gives `alt=""`, and with the header-background option ticked the body shows no picture, as it does without the fix.

**Alternatives**:

- Assign `homepageImageAltText` from `homepageImage.altText` in both handlers: two places to keep in step with the field instead of one, and the variable exists only to feed this line.
- Copy OJS's `{if $homepageImage.altText} alt="…"{/if}`: it leaves out `alt` when the box is empty, so a screen reader may read the file name. Whether an empty box should mean "decorative" is a separate open question for the journal's page; the fix above does not decide it.

**What goes with it**:

- Optional: drop OJS's unused `homepageImageAltText` assignment in `IndexHandler::index()`.
- No data repair: the text is already stored where the fix reads it.
- Backport: the template line is the same on `stable-3_5_0`, `stable-3_4_0` and OMP's `stable-3_3_0`; OPS 3.3 has it in `templates/frontend/pages/indexJournal.tpl`. OPS's dead assignment sits in `pages/index/IndexHandler.php` at line 93 on 3.5 and 86 on 3.4, and in `pages/index/IndexHandler.inc.php` at line 72 on 3.3 (`$journal->getLocalizedData('homepageImageAltText')`).
- The guard: the e2e scenario that types the "Homepage Image" description and reads it on the home page (U10 scenario 3), checked on all three apps.

Small: one line in each app's home page template, following the pattern the cover images already use, no data repair, tried.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/homepage-image-alt-text-dropped/walk.js) takes the Steps on all three apps (OJS as the control); `WALK=nb` is the neighbour check. On a fleet loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/homepage-image-alt-text-dropped/walk.js`, with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix was tried with `node bin/try-fix.js apply …/fix-omp.diff omp` and `…/fix-ops.diff ops`, then reverted.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL, from pkp/datasets 566bb1f (2026-10-03): OMP and OPS gave `alt=""` on both lines, OJS `alt="Our building"`; the settings tab held "Our building" after a reload on every app. No request failed and no page script failed.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b; `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161.
- Code reads: on `main` and 3.5 the three apps' home page templates and `pages/index/IndexHandler.php`. On 3.4 and 3.3: OMP `templates/frontend/pages/index.tpl`, OPS `indexServer.tpl` (3.4) and `indexJournal.tpl` (3.3), all with `alt="{$homepageImageAltText|escape}"`; OJS `indexJournal.tpl` with `$homepageImage.altText`; pkp-lib's `schemas/context.json` (the `homepageImage` object carries `altText`, no `homepageImageAltText` setting) and `PKPAppearanceSetupForm` (the field is a `FieldUploadImage`, with its alternate text box) on both branches.
- Introduced: `git blame` on the OMP and OPS lines leads to d9ffc0c1ec (OMP) and e7c66ecb3c (OPS, a commit of the OJS history OPS was forked from; `git log -L` on OJS's line shows aa7d5a8648 for `pkp/pkp-lib#4557` setting `$homepageImage.altText`, e7c66ecb3c reverting it, 8cb940a8e4 correcting it again). OJS's 8cb940a8e4 is not in OPS's history.
- Upstream: searched pkp/pkp-lib, pkp/omp, pkp/ops, pkp/ojs and pkp/ui-library on 2026-10-03 for "homepage image alt text" and `homepageImageAltText`. `pkp/pkp-lib#5778` ("Homepage image alt text doesn't show up", 3.2) is this fault, closed after the OJS PRs `pkp/ojs#2715` and `pkp/ojs#2718` (stable). `pkp/pkp-lib#12596` (images saved without any alternate text) is a different question.
- Not checked: other themes. Only the Default theme ships in the apps' `plugins/themes`; the separately distributed themes carry their own home page templates, which were not read. MySQL not checked; the fault is in the template, not the database.
