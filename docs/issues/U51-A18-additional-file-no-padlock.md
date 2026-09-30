# Additional files of an article in a restricted issue show no padlock, yet readers without access are refused

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1499` for `pkp/pkp-lib#2577` · [4cb03fea7e](https://github.com/pkp/ojs/commit/4cb03fea7ee4b0b8c738152660eca41517d021ab) · 2017-08-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a18)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On the page of an article in a restricted issue, the article's PDF shows
a padlock, but an additional file listed below it (a data set, for one)
keeps its file icon. Anyone without a subscription who presses the file
is refused, just as for the PDF:

- signed out, they land on the Login page with "Subscription required to
  access item.";
- signed in, they are sent on to the "Subscriptions" page, or, on a
  journal whose payments are not set up, to the journal's home page.

Screen-reader users already hear "Requires Subscription" before the
file's name; only the padlock is missing. Nothing is lost, and the
refusal is correct.

The fix is the padlock rule for these links in OJS's default theme
stylesheet, as the PDF button already has.

## Impact

- **Lost:** a click, spent finding out that a file which looked free is
  not.
- **Who:** sighted users without a subscription, on the page of an
  article in a restricted issue that has additional files, in the default
  theme.
- **Way round:** none needed.

Low: no task fails; a misleading icon is where the scale puts low.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`: journal
`publicknowledge`, its published issue "Vol. 1 No. 2 (2014)", and
submission 17, "Antimicrobial, heavy metal resistance and plasmid
profile of coliforms isolated from nosocomial infections in a hospital
in Isfahan, Iran", published in it with a "PDF" galley. The steps turn
on subscriptions and add the additional file, which the dataset lacks.

As `dbarnes` (Journal editor, with manager rights):

1. Sign in as `dbarnes`.
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
3. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   set "Access status" to "Subscription" and press "Save".
4. Open submission 17 › Publication › "Galleys", press "Unpublish" and
   confirm with "Unpublish".
5. "Add galley": type "Data" as the "Galley Label", press "Save", then
   in the upload window choose "Data Set", upload any text file and
   press "Continue", "Continue", "Complete".
6. Press "Schedule For Publication". "Review Publishing Details" opens
   with "Version of Record (VoR)", "Major Revision", "Assign To
   Current/Back Issue" and "Vol. 1 No. 2 (2014)" already chosen: press
   "Confirm", then "Publish". [3.5: "Schedule For Publication" opens the
   confirmation at once; press "Publish".]
7. Sign out.

Signed out:

8. Archives › "Vol. 1 No. 2 (2014)" › the article's title.
9. Look at the "PDF" button and, below it, the "Data" link (the
   additional files, headed "Additional Files" for screen readers).
10. Press "Data".

Signed in without a subscription:

11. Sign in as `ccorino` (an author and reader of the journal), then
    repeat steps 8–10.

**Expected:** "Data" shows the padlock in place of its file icon, as
"PDF" does. Pressing it still refuses the file.

**Observed:** "PDF" shows the padlock. "Data" shows its file icon and no
padlock, although its link carries the `restricted` class and the
hidden words "Requires Subscription", so a screen reader announces
"Requires Subscription Data". Pressing it signed out leads to the Login
page:

```
Subscription required to access item. To verify subscription, log in to journal.
```

Signed in (step 11) it redirects to `about/subscriptions`. That page is
not offered while payments are not set up, so the reader ends on the
journal's home page with no word about why. That home-page ending is a
separate question, [tracked apart](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a5).

Control: with the issue set back to "Open access", "Data" keeps its
file icon and downloads.

## Cause

`templates/frontend/objects/galley_link.tpl` (line 65) renders an
additional file with the class `obj_galley_link_supplementary` instead
of `obj_galley_link`. As for any galley, it adds `restricted` and the
"Requires Subscription" screen-reader text when the user has no access.

In the default theme's `plugins/themes/default/styles/objects/galley_link.less`,
only `.obj_galley_link.restricted` replaces the icon with the padlock
(lines 29–46). `.obj_galley_link_supplementary` (lines 51–61) draws its
file icon in `:after`, through `.cmp_button_text(@fa-var-file-text-o)`.
It has no `restricted` rule.

The class came with
[4cb03fea7e](https://github.com/pkp/ojs/commit/4cb03fea7ee4b0b8c738152660eca41517d021ab)
("pkp/pkp-lib#2577 Separate display of primary and supplementary
galleys on article details page", merged in `pkp/ojs#1499` and first
released in OJS 3.1.0). Before it, in OJS 3.0 (`ojs-3_0_2-0`, read in
the code), `article_details.tpl` line 214 listed every galley,
supplementary ones included, through `galley_link.tpl`. Every galley was
then an `obj_galley_link`, which gets the padlock when restricted. The
commit gave supplementary galleys their own block and style, and the
padlock did not come along.

Reach:

- Only the article page lists additional files
  (`templates/frontend/objects/article_details.tpl` line 362). The
  issue's table of contents shows primary galleys only
  (`article_summary.tpl` line 90).
- The default theme is the only theme in the OJS repository. Other
  themes (Bootstrap 3, Health Sciences and the rest) are separate
  plugins and were not checked. A child theme of the default theme
  inherits the fix.

## Proposed fix

A proposal; the team decides. Give the additional-file link the padlock when it is restricted, in the
rule that draws its icon
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/additional-file-no-padlock/fix.diff)):

```diff
--- a/plugins/themes/default/styles/objects/galley_link.less
+++ b/plugins/themes/default/styles/objects/galley_link.less
@@ -58,4 +58,8 @@
 		left: 0;
 		text-align: left;
 	}
+
+	&.restricted:after {
+		content: @fa-var-lock;
+	}
 }
```

This follows the `.obj_galley_link.restricted:before` rule above it,
which swaps the file glyph for `@fa-var-lock`. It uses `:after`, since
that is where `.cmp_button_text` puts this link's icon.

Tried on `main`:

- The restricted "Data" showed the padlock and was still refused.
- With the issue set back to "Open access", "Data" kept its file icon
  and downloaded, both with the fix applied and without it.

**Alternatives:**

- Render additional files with `obj_galley_link` as well: that brings
  the padlock, but turns the text links back into buttons, undoing the
  2017 layout.
- Put the icon in the template as an element: a bigger change to a
  template that other themes override.

**What goes with it:**

- A theme's stylesheet is compiled once and cached (`cache/*.css`), so
  an install sees the change once that cache is cleared, as a release
  upgrade does.
- A design choice: restricted galley buttons also turn the muted
  `@offset` colour, and whether restricted additional files should too
  is for the team. The diff changes only the icon.
- Backport: the same `.obj_galley_link_supplementary` block is on
  `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`, so the diff applies
  as written.
- Guard: an e2e check in the Subscriptions spec that a restricted
  additional file shows the padlock and an open one its file icon.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/additional-file-no-padlock/walk.js)
  (Steps in
  [steps.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/steps.js)),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/additional-file-no-padlock/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` is the
  Control. The script reads each link's class, its screen-reader words
  and the glyph its `::before` and `::after` draw.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/additional-file-no-padlock/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–11 on `main` and on `stable-3_5_0`, which
  matched. No request failed and no page script failed.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads on 3.4 and 3.3 (OJS files only): `galley_link.tpl` gives
  the link `restricted` (3.4 line 65, 3.3 line 61), and
  `article_details.tpl` lists additional files with
  `isSupplementary="1"` (3.4 line 304, 3.3 line 284).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  "supplementary galley padlock", "supplementary restricted icon",
  "supplementary file lock restricted", "additional files subscription"
  and `obj_galley_link_supplementary`. Nothing matched.
