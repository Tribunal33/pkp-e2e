# A restricted article's additional file shows a plain file icon instead of a padlock, then refuses the reader

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1499` for `pkp/pkp-lib#2577` · [4cb03fea7e](https://github.com/pkp/ojs/commit/4cb03fea7ee4b0b8c738152660eca41517d021ab) · 2017-08-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a18)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal that requires subscriptions, a restricted article's page
shows its main galleys ("PDF") with a padlock in place of the file icon,
so a reader can see what they may not open. A file listed under
"Additional Files" (a data set, a research instrument) keeps its plain
file icon. It is restricted all the same: a visitor who presses it is
sent to the Login page, and a signed-in reader without access ends up on
the journal's home page with no message.

The page's hidden text for screen readers is right ("Requires
Subscription" before the file's name), so only sighted readers are
misled. The journal's theme is the bundled Default Theme, the only theme
OJS ships.

Additional files showed the padlock until 2017, when the change that
gave them a list of their own dropped it.

## Impact

- **Lost**: nothing. The link looks open; the reader learns otherwise
  by pressing it.
- **Who**: visitors and readers without access to a restricted article
  that has additional files.
- **Way round**: none needed; access itself is enforced.

Low: only the icon is wrong, and the refusal that follows is the right
one.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, `publicknowledge`. Its
  journal is open access and its issue "Vol. 1 No. 2 (2014)" is
  published. The dataset has no article with an additional file, so
  steps 1 to 5 make one, through the screens.

As `dbarnes`:

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
2. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   choose "Subscription" under "Access Status" and press "Save".
3. Open submission 5, "Genetic transformation of forest trees" (in
   Production). Under Publication › "Galleys", press "Add galley",
   label it "PDF", choose "Article Text" and upload a PDF.
4. "Add galley" again: label "Data", choose "Data Set", upload a CSV
   file.
5. Press "Schedule For Publication", choose "Vol. 1 No. 2 (2014)" and
   press "Publish". [3.5: Publication › "Issue" › "Assign to Issue",
   the issue, "Save", then "Schedule For Publication" and "Publish".]

As a visitor, then as a reader:

6. Sign out. Open "Archives", then "Vol. 1 No. 2 (2014)", then
   "Genetic transformation of forest trees".
7. Look at the "PDF" link and, under "Additional Files", the "Data"
   link.
8. Press "Data".
9. Sign in as `ccorino` (a Reader with no subscription), open the
   article again and press "Data".

**Expected.** "Data" shows the padlock, like "PDF", since it is refused
in the same way.

**Observed.** "PDF" shows the padlock; "Data" shows the plain file icon.
In the dataset the new galleys got the IDs 4 ("PDF") and 5 ("Data"). At
step 8 the visitor is sent to the Login page, as for "PDF":

```
GET /index.php/publicknowledge/en/article/view/5/5   → 302
GET /index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Farticle%2Fview%2F5%2F5&loginMessage=reader.subscriptionRequiredLoginText   → 200
```

At step 9 `ccorino` is redirected to `about/subscriptions`, which, with
payments off, redirects to the journal's home page; again as for "PDF".

Control: as `dbarnes`, who may open the article, both links show their
file icons and "Data" downloads.

## Cause

The Default Theme's `plugins/themes/default/styles/objects/galley_link.less`
styles a restricted link only for `.obj_galley_link`: the
`&.restricted` block (lines 29 to 48) mutes the link to `@offset` and
replaces the `:before` icon with `@fa-var-lock` (lines 33 to 37). An
additional file's link is `.obj_galley_link_supplementary` (lines 51 to
61). It draws its file icon on `:after` through the `.cmp_button_text()`
mixin and has no `.restricted` rule.

The template is right. `templates/frontend/objects/galley_link.tpl`
sets `restricted` for every galley the reader cannot open and gives the
link the class `restricted` and the screen-reader text, whatever its
kind. `ArticleHandler::view()` refuses the press through
`userCanViewGalley()` (line 280; 3.5 line 247), as for any galley.

Before 4cb03fea7e (`pkp/pkp-lib#2577`) every galley, additional files
included, was an `obj_galley_link` and showed the padlock. That change
gave additional files their own class and style on the article page.

Reach:

- The article page's "Additional Files" list is the one place that
  includes `galley_link.tpl` with `isSupplementary` (`article_details.tpl`
  line 362; checked in the code). The issue's table of contents lists
  primary galleys only.
- That list passes no `purchaseFee`, so an additional file never shows
  the article's price, although buying the article opens it
  (`hasPaidPurchaseArticle()` in `userCanViewGalley()`). That price
  gap is left out of this report.
- Third-party themes style these links themselves (not checked).

## Proposed fix

Give the additional file's link the padlock when it is restricted, in
the Default Theme's stylesheet
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/additional-file-no-padlock-refused/fix.diff)):

```diff
 .obj_galley_link_supplementary {
 	…
 	&:after {
 		right: auto;
 		left: 0;
 		text-align: left;
 	}
+
+	&.restricted:after {
+		content: @fa-var-lock;
+	}
 }
```

This follows the main link's own rule, on the pseudo-element this link
uses. Tried on `main`: the visitor and `ccorino` see the padlock on
"Data", and `dbarnes`, who may open it, still sees the file icon.

The diff swaps the icon only. The padlock and the file's name keep the
link colour (`@primary`), while a restricted main link is greyed to
`@offset`. Adding `color: @offset;` to the same rule would match that
look; which of the two is wanted is the team's call.

**Alternatives**

- Drop the supplementary class for restricted files, so they fall back
  to `.obj_galley_link`: changes the layout of the "Additional Files"
  list for those readers only.
- Hide restricted additional files: the article page is meant to keep
  listing every galley, restricted or not.

**What goes with it**

- No data, API or hook changes. The compiled stylesheet is rebuilt when
  the theme's cache is cleared, as after any update.
- Applies as written to 3.5, 3.4 and 3.3.
- The test: an end-to-end check that a restricted article's additional
  file shows the padlock to a visitor.

Small: one rule in one stylesheet, copied from the main link.

## Evidence

- The Steps as a Playwright script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/additional-file-no-padlock-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/lib.js)),
  run with `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/additional-file-no-padlock-refused/walk.js`.
  It records each link's class, its computed icon (`::before` on a main
  link, `::after` on an additional file) and where each press lands.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/additional-file-no-padlock-refused/fix.diff ojs`
  and the walk on a freshly loaded install, then reverted.
- The Steps were taken in a browser on PostgreSQL, each install freshly loaded from pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01): `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a) on
  2026-10-02; `stable-3_5_0` OJS c346ee00a5 (lib/pkp 3bb4450bea) on
  2026-10-01, with the same result at every step.
- 3.4 and 3.3, by code: OJS `stable-3_4_0` at 75cc2d488b and
  `stable-3_3_0` at ac77c9fb35. `galley_link.less` has the same
  `.obj_galley_link_supplementary` block with no `.restricted` rule,
  `galley_link.tpl` adds the `restricted` class to either kind of link,
  and `article_details.tpl` lists additional files with `isSupplementary`
  (3.4 line 304, 3.3 line 284).
- Before 4cb03fea7e: `git show 4cb03fea7e -- templates/frontend/objects/galley_link.tpl`
  shows the old link, `class="obj_galley_link {$type}{if $restricted} restricted{/if}"`,
  used for every galley.
