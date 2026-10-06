# A press's home page shows the site's announcements, with links that lead nowhere

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: none (code; no site announcements on the home pages)
  - 3.3: none (code; no site announcements)
- **Introduced** `pkp/omp#1453` for `pkp/pkp-lib#9253` · [553f0739bb](https://github.com/pkp/omp/commit/553f0739bbcc5b08f73fdf395c8a97b6666dad72) · 2023-11-02 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U12 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a site with two or more presses, the administrator can turn the
site's announcements on and set a number under "Display on Homepage",
to show them on the site's home page. A press that shows no
announcements block of its own then carries the site's block headed
"Announcements" on its home page: the site's newest announcement, with
"Read More" and its title linking to an address under the press. That
address answers "404 Not Found" while the press's announcements are
off; while they are on, it sends the visitor to the press's own
Announcements list, which does not hold the site's announcement.

The press cannot remove the site's block by switching its own
announcements off. The site's block goes away only when the press's
manager turns the press's announcements on and sets a number of its
own under "Display on Homepage"; the press's home page then shows the
press's own announcements, or no block when it has none.

Every press with announcements off, the state a new press starts in,
carries the block, and so does a press with announcements on and
"Display on Homepage" empty.

## Impact

- **Lost**: no data. Readers of the press see news that is not the
  press's and follow links that end in "404 Not Found" or in a list
  without that announcement; nobody is told.
- **Who**: every visitor to the home page of such a press, on a
  multi-press site whose administrator shows site announcements on the
  site's home page.
- **Way round**: the press's manager ticks "Enable announcements" and
  sets "Display on Homepage", for example to `1`. With no announcements
  of its own, the press's home page then has no block. The cost: a
  press that chose to have no announcements now has a public
  Announcements page (empty) and an "Announcements" item in its header
  menu. The administrator can instead empty the site's "Display on
  Homepage", which also takes the block off the site's own home page.

Medium: the press can get rid of the block, at the price of an
announcements page it did not want; it would be high if the press could
not get rid of it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  ("Public Knowledge Press") has announcements off and no
  announcement.
- A second press, created in steps 1–2: the Site Settings offer their
  "Announcements" tab only while the site hosts two or more presses.

Steps (signed in as `admin`):

1. Administration › "Hosted Presses" › "Create Press".
2. Name `u12r8 Second Press`, acronym `U12R8`, a contact name and email,
   a country, path `u12r8second`, English as its language and primary
   language, "Enable this press to appear publicly on the site" ticked;
   "Save".
3. Administration › "Site Settings" › "Announcements" › "Settings":
   tick "Enable announcements", type `1` in "Display on Homepage",
   "Save".
4. Side tab "Announcements" › "Add Announcement": Title
   `u12r8 Site maintenance`, Short Description `Sunday morning.`,
   "Save".
5. Sign out. Open the site's home page (`/index.php/index`): it carries
   the block "Announcements" with "u12r8 Site maintenance", as intended.
6. Open Public Knowledge Press's home page (`/index.php/publicknowledge`).
7. Press "Read More" in its "Announcements" block.

With the press's announcements on and no count, keeping steps 1–7's
setup:

8. Sign in as `admin` (also a Press manager of `publicknowledge`).
   Settings › Website › Setup › "Announcements": tick "Enable
   announcements", leave "Display on Homepage" empty, "Save".
9. Sign out. Open the press's home page again, and press "Read More".

**Expected**: in steps 6 and 9 the press's home page has no
"Announcements" block, since the press shows no announcements on it.

**Observed**: in steps 6 and 9 the press's home page carries the site's
block and the skip link "Skip to announcements":

```
Announcements
u12r8 Site maintenance
2026-10-03
Sunday morning. Read More
```

The title and "Read More" link to
`/index.php/publicknowledge/en/announcement/view/1`. In step 7 that
address answers HTTP 404 with "404 Not Found"; in step 9 it redirects
(302) to the press's "Announcements" page, which lists nothing.

Control: the same steps on OJS and OPS (Hosted Journals, Hosted Servers)
leave the journal's and the server's home page without a block; and on
OMP, once the press sets "Display on Homepage" to `1` and adds
`u12r8 Press notice`, its home page shows "u12r8 Press notice" alone.

## Cause

OMP's `APP\pages\index\IndexHandler::index()`
(`pages/index/IndexHandler.php`, line 69) sets up the home page's
announcements with a variable the method never defines:

```php
$press = $request->getPress();
…
$this->_setupAnnouncements($journal ?? $request->getSite(), $templateMgr);
```

`$journal` is always null on a press, so the call always passes the
site. `PKPIndexHandler::_setupAnnouncements()` then assigns the site's
announcements and `numAnnouncementsHomepage` to the template whenever
the site has announcements on with a count. On a press,
`_displayPressIndexPage()` calls `_setupAnnouncements($press, …)` a
second time (line 134), but that call assigns only when the press
itself has announcements on with a count. Otherwise the site's values
stay, and `templates/frontend/pages/index.tpl` includes
`frontend/objects/announcements_list.tpl`, which prints them. Its links
are built with the page router in the press's request, so they point
under the press. There lib/pkp's
`PKP\pages\announcement\AnnouncementHandler::view()` has two outcomes.
With the press's announcements off, `isAnnouncementsEnabled()` throws
`NotFoundHttpException` before the announcement is read (the 404). With
them on, the check that the announcement belongs to the press fails and
it calls `$request->redirect(null, 'announcement')`, the press's
Announcements list (the 302), which never holds the site's
announcement.

The rule the line breaks: the site's announcements block belongs to the
site's home page only, and a context's own settings decide only its own
block. OJS and OPS follow it with one call that passes their own
`$journal` / `$server` or the site. The line came with
`pkp/pkp-lib#9253` (site-level announcements), when the OMP change for
`main` (`pkp/omp#1453`) took OJS's line with its variable name. The
same change for `stable-3_4_0`, `pkp/omp#1452` (open, never merged),
reads `$press ?? $request->getSite()` and removes the second call.

Reach:

- The site's home page is right: there `$press` is null too, and the
  site is what it should get (seen on screen).
- No other OMP handler uses the undefined `$journal` (searched in
  `pages`, `classes`, `controllers` and `plugins`).

## Proposed fix

Pass the press, and drop the second call that then repeats it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-home-shows-site-announcements/fix.diff)):

```diff
-        $this->_setupAnnouncements($journal ?? $request->getSite(), $templateMgr);
+        $this->_setupAnnouncements($press ?? $request->getSite(), $templateMgr);
…
-        $this->_setupAnnouncements($press, $templateMgr);
-
```

This follows the rule above and keeps what `pkp/pkp-lib#9253` wanted:
the site's announcements on the site's home page. Dropping the second
call is safe: after the fix the first call passes the same `$press`
object, `_setupAnnouncements()` makes the same "announcements on and a
number under Display on Homepage" check and assigns the same two
template values, and nothing between the two calls reads or sets
`announcements` or `numAnnouncementsHomepage` (`_displayPressIndexPage()`
assigns only new releases, home content, title, licence and featured
books before `display()`). `index()` is the only caller of the public
`_displayPressIndexPage()` in OMP, plugins included (searched).

Tried on OMP `main`: the walk's press home page showed no block in
steps 6 and 9, and with a count of its own it showed "u12r8 Press
notice" alone. A neighbour check covered three pages: the site's home
page (the site's block), a second press with announcements off (no
block) and the press with a count (its own block). With the fix in, all
three were as stated; without it, the second press's home page carried
the site's block, and the other two were the same.

**Alternatives**

- Only rename the variable and keep the second call: also correct, but
  the press's announcements are then queried twice for each home page.
- Clear the template's announcements in `_setupAnnouncements()` when
  the context shows none: it hides the wrong first call rather than
  fixing it.

**What goes with it**

- No data repair, no API or hook change (the template receives the
  same variables, now the press's).
- Backport: `stable-3_5_0` has the same two lines (70 and 138) and takes
  the diff as it stands. 3.4 and 3.3 need nothing.
- Guard: an e2e check that, with the site's announcements shown on
  the site's home page, opens the home page of a press with
  announcements off and finds no announcements block (spec U12,
  scenario 6).

Small: one line in one OMP handler and a redundant call removed, the
pattern OJS and OPS already use.

## Evidence

- A Playwright script that takes the Steps on installs loaded from PKP's
  default test dataset (OMP, with OJS and OPS as the control in the same
  run):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-home-shows-site-announcements/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-home-shows-site-announcements/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/press-home-shows-site-announcements/walk.js`
  (`NB=1` in front runs the neighbour check alone). The script also
  takes the control steps (the press's own count of 1 and
  `u12r8 Press notice`).
- The fix, tried 2026-10-03 on the OMP `main` tip below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-home-shows-site-announcements/fix.diff omp`.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    (lib/pkp cf3f984335), OPS 38b61882d3 (lib/pkp cf3f984335). The same
    steps and the same result on all three apps.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441, pkp-lib at 767353f4fe.
  OMP's `IndexHandler::index()` makes no announcements call and
  `_displayPressIndexPage()` calls `_setupAnnouncements($press, …)`
  only; `indexSite.tpl` has no announcements block. The site-level
  change for 3.4 (`pkp/omp#1452`) is open and not on the branch.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc883, pkp-lib at ac3fa73402.
  `IndexHandler.inc.php` calls `_setupAnnouncements($press, …)` only;
  there are no site announcements.
- Introduced: `git blame` on line 69 gives 553f0739bb ("pkp/pkp-lib#9253
  Add site-level announcements", 2023-11-02, the line added whole). The
  commit of `pkp/omp#1453` (5d794c06a0, NateWr) was pushed to `main`
  by hand as 553f0739bb, same message and time; the PR was closed
  without a GitHub merge, so the API names no PR for the commit.
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library for "site
  announcements", "announcements homepage", "_setupAnnouncements" and
  the press/home page words; only the `pkp/pkp-lib#9253` PRs came up.
- Unverified: a press with a count and no announcement of its own
  showing no block (read in the code: the press's empty list replaces
  the site's, and `announcements_list.tpl` prints nothing for an empty
  list); walked only with one announcement of its own. The header's
  "Announcements" item once the press's announcements are on was seen
  in step 9's walk.
- MySQL not checked; the fault does not depend on the database.
