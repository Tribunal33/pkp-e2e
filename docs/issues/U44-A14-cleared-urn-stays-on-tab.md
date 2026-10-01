# After "Clear" on a galley's, chapter's, format's or file's "Identifiers" tab, the removed URN stays shown

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code; a galley's, chapter's, format's or file's DOI "Clear" too)
- **Introduced** not traced; present since at least [219dea05d0](https://github.com/pkp/ojs/commit/219dea05d07d5caa6c59707f496dc8f8193f4c20) (2016-06-09)
- **Upstream** `pkp/pkp-lib#6444` (closed; its fix, `pkp/pkp-lib#6665`, covered only the issue window, and refreshes the issue's "Identifiers" tab only while no other tab follows it)
- **Tracked in** spec U44 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor presses "Clear" under an assigned URN on the "Identifiers"
tab of a galley (OJS), or of a chapter, a publication format or a file
(OMP), and answers "OK" to "Are you sure you wish to delete the existing
URN?". The URN is removed at once, but the tab goes on showing it, with
"The URN is assigned to this galley." and "Clear", until the window is
closed and opened again. An issue's tab shows the change at once,
except in a journal that requires subscriptions.

Nothing is lost: the URN is gone as asked, and only the tab says
otherwise until it is reopened. On 3.3 the DOI plugin's "Clear" on the
same tabs behaves the same way, and DOIs are in far wider use than
URNs.

## Impact

- **Lost.** Nothing. An editor who believes the stale tab and presses
  "Save" closes the window and changes nothing, since the URN is
  already gone; one who presses "Clear" again repeats a harmless delete.
- **Who.** Managers, editors and production staff clearing a URN where
  the URN plugin is enabled for that kind of item (it is off by
  default), and on an issue's tab in a subscription journal.
- **Way round.** Close the window and open it again: the tab then shows
  the URN that would be assigned and the ticked "Assign" box.

Low: the clear does what was asked and reopening shows it. It would be
medium if the stale tab could store a wrong value, which it does not.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, freshly loaded. The "URN"
  plugin is off.
- OJS: submission 1, "Signalling Theory Dividends", has a second
  version whose galley "PDF Version 2" sits in Vol. 1 No. 2 (2014), so
  the galley's default URN pattern can be filled in.
- OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is in Production with the chapter "Introduction:
  Contexts of Popular Culture". Its format "PDF" is remotely hosted and
  has no "Identifiers" tab, so the steps add one.

Setup:
1. Sign in as `rvaca`.
2. Settings › Website › "Plugins": tick "URN", then its arrow ›
   "Settings".
3. Tick "Articles" and "Galleys" (OMP: "Monographs", "Chapters" and
   "Publication Formats"); "URN Prefix" `urn:nbn:de:0000-`; "Use default
   patterns."; "Check Number" unticked; "Namespace" "urn:nbn:de";
   "Resolver URL" `https://nbn-resolving.de/`; "Save". Sign out.

The galley (OJS):

4. Sign in as `dbarnes`.
5. Open submission 1, its Publication area, version 2, "Galleys". On the
   "PDF Version 2" row press "More Actions" › "Edit" [3.5: the row's
   arrow › "Edit"] and open the "Identifiers" tab. It shows
   `urn:nbn:de:0000-jpkjpk.v1i2.1.g2`, "What you see is a preview of the
   URN. Select the checkbox and save the form to assign the URN." and a
   ticked "Assign the URN to this galley".
6. Press "Save". The window closes.
7. "Edit" › "Identifiers" again: the URN, "The URN is assigned to this
   galley." and a "Clear" link.
8. Press "Clear". A window titled "Delete" asks "Are you sure you wish
   to delete the existing URN?". Press "OK".
9. Close the window, then "Edit" › "Identifiers" again.

The chapter and a format (OMP), as `dbarnes`:

10. Open submission 4, "Chapters", and press the chapter's title; open
    "Identifiers": `urn:nbn:de:0000-jpk.4.c13`, the same sentence and
    "Assign the URN to this chapter". Take steps 6 to 9.
11. "Publication Formats" › "Add publication format": Name `u44r24
    EPUB`, leave "Format" as it opens, "OK". Its arrow › "Edit" ›
    "Identifiers": `urn:nbn:de:0000-jpk.4.4`. Take steps 6 to 9.

**Expected.** After "OK" at step 8 the tab shows the URN as not yet
assigned, as it does at step 9: the URN that would be assigned, its
sentence and the ticked "Assign" box, and no "Clear".

**Observed.** After "OK" at step 8 the tab still reads, unchanged:

```
URN
urn:nbn:de:0000-jpkjpk.v1i2.1.g2
The URN is assigned to this galley.
Clear
```

(chapter: `urn:nbn:de:0000-jpk.4.c13`, "…to this chapter."; format:
`urn:nbn:de:0000-jpk.4.4`, "…to this publication format."). The URN is
gone from the item at that point, and the clear's answer carries no
instruction to redraw anything:

```
POST …/grid/article-galleys/article-galley-grid/clear-pub-id  200
{"status":true,"content":"","elementId":"0","events":[]}
```

At step 9 the tab shows the URN as not yet assigned, with the ticked box.

Control: in OJS, tick "Issues" too in the URN settings. Open Issues ›
"Future Issues", the arrow of "Vol. 2 No. 1 (2015)" › "Edit" ›
"Identifiers"; press "Save" to assign the issue's URN, then "Edit" ›
"Identifiers" again and press "Clear" › "OK": the tab is redrawn at
once. Then, as `rvaca`, Settings › Distribution › "Access" › "The
journal will require subscriptions to access some or all of its
contents." › "Save". The issue window now has an "Access" tab after
"Identifiers", and the same assign, reopen and "Clear" › "OK" leave the
issue's tab showing the removed URN.

## Cause

"Clear" is a link action that `URNPubIdPlugin::getLinkActions()` builds
as a `RemoteActionConfirmationModal` posting to the window's own
`clearPubId` operation. Each of those operations deletes the URN through
`PKPPublicIdentifiersForm::clearPubId()` and answers a bare
`new JSONMessage(true)`:

- OJS `controllers/grid/articleGalleys/ArticleGalleyGridHandler.php`,
  `clearPubId()`, line 303;
- OMP `controllers/grid/users/chapter/ChapterGridHandler.php` (line 440),
  `controllers/grid/catalogEntry/PublicationFormatGridHandler.php` (line
  747) and `controllers/api/file/ManageFileApiHandler.php` (line 121).

The confirmation's handler only closes itself on success. Nothing asks
the window to fetch the tab again, so the form rendered before the clear
stays on screen.

The issue window is the one place that asks. Since `pkp/pkp-lib#6444`
("Clear DOI action does not refresh related form"), OJS
`classes/controllers/grid/issues/IssueGridHandler.php` `clearPubId()`
adds a `reloadTab` event naming `#editIssueTabs` and `#identifiersTab`,
the id that `templates/controllers/grid/issues/issue.tpl` puts on the
"Identifiers" tab's `<li>`. `SiteHandler.reloadTabHandler_` (lib/pkp
`js/controllers/SiteHandler.js`, line 492) passes that string to jQuery
UI's `tabs('load', '#identifiersTab')`.

jQuery UI does not read the string as a selector. It reads it as the end
of a tab link's `href` (`_getIndex()` filters on `[href$='…']`). No link
ends in `#identifiersTab`, so the index is -1 and `tabs.eq(-1)` loads the
last tab. The issue's tab is redrawn only because "Identifiers" is last.
In a subscription journal the "Access" tab follows it and is reloaded
instead.

Reach:
- OJS galley, OMP chapter and format: walked on main and 3.5.
- OMP file ("Edit" on a production-ready file, with "Files" ticked in
  the URN settings): the same bare answer, read in the code.
- OJS issue in a subscription journal: walked on main.
- Left alone: OJS `controllers/api/file/ManageFileApiHandler.php`
  `clearPubId()` has the same bare answer, but OJS never shows a file's
  "Identifiers" tab (it never assigns `showIdentifierTab`). OPS has no
  pub-ID plugin, so no "Clear" link. A second "Clear" on the stale tab
  deletes nothing more (`PKPPubIdPluginHelper::clearPubId()` deletes a
  row that is already gone).

## Proposed fix

Two parts, both following what the issue window already does:

1. The galley's, chapter's, format's and OMP file's `clearPubId()`
   answer with the `reloadTab` event, as the issue's does, and each of
   their templates puts `id="identifiersTab"` on its "Identifiers"
   `<li>`.
2. `SiteHandler.reloadTabHandler_` turns the tab selector into the
   tab's position, so the event reloads the tab it names whatever tabs
   come after it.

```diff
-		$(jsonData.tabsSelector).tabs('load', jsonData.tabSelector);
+		var $tabs = $(jsonData.tabsSelector),
+				index = $tabs.find(jsonData.tabSelector).index();
+
+		// jQuery UI reads a string as the end of a tab's href, not as a
+		// selector, so the tab is named by its position.
+		if (index !== -1) {
+			$tabs.tabs('load', index);
+		}
```

```diff
-        return new JSONMessage(true);
+        $json = new JSONMessage(true);
+        $json->setEvent('reloadTab', [['tabsSelector' => '#editArticleGalleyMetadataTabs', 'tabSelector' => '#identifiersTab']]);
+        return $json;
```

Nine edits, as three pull requests:

- **pkp-lib**: `js/controllers/SiteHandler.js` (the first hunk),
  `templates/controllers/api/file/editMetadata.tpl` (the file tab's
  id), and `js/pkp.min.js` rebuilt (`tools/buildjs.sh`), as
  `pkp/pkp-lib#6444` was followed by a "Recompile JS" commit.
- **OJS**, bumping lib/pkp: `ArticleGalleyGridHandler::clearPubId()`
  (`#editArticleGalleyMetadataTabs`) and
  `templates/controllers/grid/articleGalleys/editFormat.tpl`.
- **OMP**, bumping lib/pkp: `ChapterGridHandler::clearPubId()`
  (`#editChapterMetadataTabs`),
  `PublicationFormatGridHandler::clearPubId()`
  (`#editPublicationFormatMetadataTabs`),
  `ManageFileApiHandler::clearPubId()` (`#editFileMetadataTabs`),
  `templates/controllers/grid/users/chapter/editChapter.tpl` and
  `templates/controllers/grid/catalogEntry/editFormat.tpl`.

For the trial the fix was written as one diff per app, each holding that
app's edits and the lib/pkp ones:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/fix-omp.diff).
The OJS diff carries the `editMetadata.tpl` id only because lib/pkp is
shared; OJS never shows that tab.

It was tried on main. After "OK", the galley's, chapter's and format's
tabs showed the URN as not yet assigned, with the ticked box, at once.
The issue's tab did too, in an open-access and in a subscription
journal. "Cancel" still left the URN and the tab as they were. A "Save"
on the redrawn tab assigned the URN again, as its ticked box says it
will.

**Alternatives**
- Only the handler events, without the `SiteHandler` change: it works
  for these windows because "Identifiers" happens to be their last tab.
  It leaves the subscription journal's issue window wrong, and every
  later use of `reloadTab` depends on tab order.
- A numeric tab index sent from PHP: the handler would have to know the
  tab order, which depends on settings (the issue's "Access" tab, the
  format's "Metadata" tab).
- Returning the redrawn form in the clear's answer: the confirmation
  handler ignores the content, so it needs a new client pattern for one
  link.

**What goes with it**
- The `clearIssueObjectsPubIds` operation needs no redraw: it clears the
  URNs of the issue's articles and galleys, which the issue's tab does
  not show.
- Backport: both diffs apply as they stand to `stable-3_5_0`, and 3.4
  has the same lines. On 3.3 the handlers are the `.inc.php` files and
  the templates build their links with `$smarty.const.ROUTE_COMPONENT`,
  so the hunks are ported by hand; there the change also fixes the DOI
  plugin's "Clear" on these tabs.
- Test: an end-to-end check that reads the tab right after "Clear" ›
  "OK" on a galley and a chapter.

Medium: nine small edits that each follow the issue window's pattern,
but across three repositories (pkp-lib, OJS, OMP) and four windows, plus
the JavaScript rebuild.

## Evidence

- The scripts that take the Steps in the browser on an install loaded
  from PKP's default test dataset, reading the stored URN after each
  action:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js)
  (the Steps) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/neighbour.js)
  (the Control, plus "Clear" › "Cancel" and a "Save" after the clear),
  sharing
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/lib.js).
  Run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js`
  (neighbour.js the same way; on `stable-3_5_0` with
  `PKP_E2E_LINE=stable-3_5_0` in front).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/cleared-urn-stays-on-tab/fix-ojs.diff ojs`
  and the same with `fix-omp.diff omp`, then walk.js and neighbour.js,
  each on a freshly loaded dataset, then
  `node bin/try-fix.js revert ojs omp`. The installs served the
  unminified scripts (`enable_minified` off), so the `SiteHandler.js`
  change took effect without a rebuild.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6);
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d (lib/pkp a9c76aed62).
  - MySQL not checked; the fault is in the page, not a query.
- jQuery UI: `main` serves 1.14.1 (`js/build/jquery-ui/jquery-ui.js`,
  `_getIndex()` and `load()`); 3.3 and 3.4 pin 1.13.3, whose
  `_getIndex()` reads a string the same way.
- 3.4 (code): OJS 9571d8fde7, OMP 0aec65441, lib/pkp df13621c2d. The
  galley, chapter, format and file `clearPubId()` answer
  `new JSONMessage(true)`; the issue's sends the same `reloadTab`; the
  `SiteHandler` line is the same; `issue.tpl` puts "Access" after
  "Identifiers". OJS has only the URN pub-ID plugin there.
- 3.3 (code): OJS 9fdb9bcf9a, OMP 8e72fc883, lib/pkp d446601ebe. The
  same handlers and `SiteHandler` line. OJS and OMP have both the DOI
  and the URN pub-ID plugins; the DOI plugin's `doiSuffixEdit.tpl` shows
  a stored DOI with a "Clear" link whose action
  (`DOIPubIdPlugin::getLinkActions()`) posts to the same `clearPubId`
  operations, so a cleared galley, chapter, format or file DOI stays on
  the tab the same way. A publication's own DOI is on another form and
  not affected.
- Introduced: each operation had the bare answer from the commit that
  added it, so no single change brought the fault in. OJS galley:
  [219dea05d0](https://github.com/pkp/ojs/commit/219dea05d07d5caa6c59707f496dc8f8193f4c20)
  (2016-06-09, Bozana Bokan, `pkp/pkp-lib#1457`). OMP file:
  [773825db3](https://github.com/pkp/omp/commit/773825db3b472cab3e764c170414d832de2a73c0) (2016-06-20,
  Bozana Bokan, `pkp/pkp-lib#1527`). Format: pkp-lib
  [72671e821e](https://github.com/pkp/pkp-lib/commit/72671e821ed5592fa67d4029a0a2541c89ee224a)
  (2016-06-20, `pkp/pkp-lib#1527`), moved into OMP by
  [a35738312](https://github.com/pkp/omp/commit/a357383127f3d8bad43fc9c07f538679a83b2757) (2016-07-27).
  OMP chapter:
  [83dd274bc](https://github.com/pkp/omp/commit/83dd274bc17a7313d396d4b02962248fa742bcc4)
  (2018-02-07, Bozana Bokan, `pkp/pkp-lib#1692`). `pkp/pkp-lib#6444`
  (2020-12-06, steps on the issue window only) was fixed by Alec Smecher
  (asmecher) in `pkp/pkp-lib#6665` and `pkp/ojs#3012`:
  [956c34fca9](https://github.com/pkp/pkp-lib/commit/956c34fca93511f3133f43a38ed3868b33c5da6d)
  added `reloadTabHandler_`, and
  [950c588ad0](https://github.com/pkp/ojs/commit/950c588ad0b7e500f124451d7d971706b2b10785)
  the issue's event and its tab's id (2021-01-21).
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library. `pkp/pkp-lib#6443` (a custom DOI suffix needing two
  saves) is a different fault.
- Not driven: the OMP file's tab; the DOI "Clear" on 3.3; 3.4 and 3.3
  on screen.
