# A galley's or chapter's "Identifiers" tab keeps showing a URN after "Clear" has removed it

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP, OPS (code; DOIs too)
- **Introduced** `pkp/omp#498` for `pkp/pkp-lib#1692` (chapters) · [83dd274bc](https://github.com/pkp/omp/commit/83dd274bc17a7313d396d4b02962248fa742bcc4) · 2018-02-07, and with no PR [219dea05d0](https://github.com/pkp/ojs/commit/219dea05d07d5caa6c59707f496dc8f8193f4c20) for `pkp/pkp-lib#1457` (galleys) · 2016-06-09 · Bozana Bokan (bozana). The issue's tab: `pkp/pkp-lib#6665` and `pkp/ojs#3012` for `pkp/pkp-lib#6444` · [956c34fca9](https://github.com/pkp/pkp-lib/commit/956c34fca93511f3133f43a38ed3868b33c5da6d) · 2021-01-21 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#6444` (closed; its fix redraws only the issue's tab, and not in a subscription journal)
- **Tracked in** spec U44 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a14)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor opens the "Identifiers" tab of a galley, a chapter, a
publication format or a book file, and presses "Clear" › "OK" beside its
URN. The URN is removed at once, but the tab keeps showing it, with "The
URN is assigned to this galley." and "Clear", until the window is closed
and opened again. An issue's tab shows the change at once, except in a
journal that requires subscriptions: there the issue's window has one
more tab, "Access", and the page reloads that tab instead of
"Identifiers".

An editor who trusts the tab may think "Clear" failed. Pressing "Clear"
again does no harm. Pressing "Save" on the out-of-date tab does: when
the URN plugin uses individual suffixes, it erases the suffix the editor
typed, without a message.

It needs the URN plugin, which is off until a manager turns it on, with
URNs for one of these objects. OPS has no URN plugin; on 3.3 the DOI
plugin's "Clear" on the same tabs, OPS galleys included, acts the same
way.

## Impact

- **Lost**: the URN is removed as asked. With individual suffixes, a
  "Save" on the out-of-date tab also erases the stored suffix; reopened,
  the tab reads "The URN cannot be assigned because the custom suffix is
  missing."
- **Who**: journal and press editors who clear the URN of a galley,
  chapter, publication format or file, or of an issue in a subscription
  journal, each time they do.
- **Way round**: close the window and open it again before doing
  anything else on the tab; an erased suffix can be typed again.

Medium: the tab says the opposite of what was just done, and in a
narrow case acting on it silently erases a typed suffix, which the
editor can type again; with nothing erased it would be low.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS or OMP). The steps turn on
  the URN plugin, which the dataset leaves off.
- OJS: the journal is open access, and issue "Vol. 1 No. 2 (2014)" is
  published, as the dataset holds them.

Setting up URNs:
1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's arrow › "Settings": tick "Issues" and "Galleys"
   [press: "Monographs" and "Chapters"]; "URN Prefix"
   `urn:nbn:de:0000-`; leave "Use default patterns."; "Namespace"
   `urn:nbn:de`; "Resolver URL" `https://nbn-resolving.de/`; "Save".

A galley [press: a chapter]:
4. Open submission 1, "Signalling Theory Dividends" › Publication ›
   "Galleys"; on "PDF Version 2" the row menu › "Edit" › "Identifiers"
   [press: submission 7, "Accessible Elements: Teaching Science Online
   and at a Distance" › Publication › "Chapters" › "Introduction" ›
   "Identifiers"]. The URN area shows the URN to be assigned, "What you
   see is a preview of the URN. Select the checkbox and save the form to
   assign the URN." and a ticked "Assign the URN to this galley" box.
5. "Save". The window closes.
6. Open the window and its "Identifiers" tab again. It shows
   `urn:nbn:de:0000-jpkjpk.v1i2.1.g27`
   [press: `urn:nbn:de:0000-jpk.7.c277`], then "The URN is assigned to
   this galley." [press: "… to this chapter."] and "Clear".
7. "Clear": a window titled "Delete" asks "Are you sure you wish to
   delete the existing URN?". "OK".
8. Look at the tab. Then close the window and open it again.

An issue in a subscription journal (OJS):
9. Settings › Distribution › "Access": tick "The journal will require
   subscriptions to access some or all of its contents."; "Save".
10. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" arrow › "Edit": the
    window lists "Access" after "Identifiers". On "Identifiers", with
    the box ticked as in step 4, "Save". The window closes.
11. Open the window again (the issue's arrow › "Edit") and its
    "Identifiers" tab: the URN, "The URN is assigned to this issue." and
    "Clear". "Clear" › "OK". Look at the tab.

Saving the out-of-date tab (OJS galley):
12. Start again from the default dataset, with step 3's settings but
    "Enter an individual URN suffix…" chosen instead of "Use default
    patterns.".
13. Open the galley's "Identifiers" tab as in step 4; type `a14` in "URN
    Suffix"; "Save". Open it again: the box is ticked; "Save".
14. Open it again: `urn:nbn:de:0000-a14`, "The URN is assigned to this
    galley." and "Clear". "Clear" › "OK"; then "Clear" › "OK" again on
    the same tab; then "Save".
15. Open the window and its tab again.

**Expected**: after "OK" the tab shows at once what it shows when it is
opened again: no URN assigned, the URN to be assigned, the preview note
and the ticked box (with individual suffixes, the "URN Suffix" box still
holding `a14`), so a "Save" keeps the suffix.

**Observed**: after "OK" the URN is removed (the request answers
`{"status":true,…,"events":[]}`), but the galley's [chapter's] tab still
reads:

```
URN urn:nbn:de:0000-jpkjpk.v1i2.1.g27 The URN is assigned to this galley. Clear
```

In the subscription journal (step 11) the issue's tab also keeps the
removed URN, "The URN is assigned to this issue." and "Clear", while the
page loads the "Access" tab's content again
(`…/grid/issues/back-issue-grid/access`). In step 14 the second "Clear"
› "OK" answers success and changes nothing; "Save" closes the window as
a success. Reopened (step 15), "URN Suffix" is empty and the tab reads
"The URN cannot be assigned because the custom suffix is missing."

Control: in the open-access journal (steps 10 and 11 without step 9,
whose window has no "Access" tab), the issue's tab shows the URN as not
assigned at once after "OK".

## Cause

"Clear" is a link action that opens a confirmation window
(`RemoteActionConfirmationModal`, built in
`URNPubIdPlugin::getLinkActions()`); "OK" posts to the window handler's
`clearPubId` op. The answer's events are triggered on the confirmation
window, so the tab's form redraws only when the answer asks the page to
reload the tab.

OJS `ArticleGalleyGridHandler::clearPubId()` and OMP
`ChapterGridHandler`, `PublicationFormatGridHandler` and
`ManageFileApiHandler` `clearPubId()` answer a bare
`new JSONMessage(true)`, as they have since each was written, so their
tabs are never redrawn. `pkp/pkp-lib#6444` ("Clear DOI action does not
refresh related form", reported on an issue's tab) added a reload to one
handler only: OJS `IssueGridHandler::clearPubId()` answers
`setEvent('reloadTab', [['tabsSelector' => '#editIssueTabs', 'tabSelector' => '#identifiersTab']])`,
read by lib/pkp `SiteHandler.js` `reloadTabHandler_`.

That reload reaches the right tab by chance. `reloadTabHandler_` calls
`$(jsonData.tabsSelector).tabs('load', jsonData.tabSelector)`, but
jQuery UI's `tabs('load', …)` reads a string as the end of a tab link's
`href` (`_getIndex()`: `[href$='…']`), not as a selector. No link ends in
`#identifiersTab`, so the index is -1, which jQuery UI takes as the
window's last tab: "Identifiers" in an open-access journal, "Access" in
a subscription journal.

The erased suffix follows from the out-of-date form. The URN area of a
tab with a stored URN holds no "URN Suffix" box and no assign box
(`urnSuffixEdit.tpl`). Once the URN is gone,
`PKPPubIdPluginHelper::execute()` copies every plugin field from the
posted form onto the galley (`setData('urnSuffix', null)`), and the
galley is saved without its suffix.

Reach:
- The publication format's and the press file's tabs (OMP): the same
  bare answer and the same "Clear" link. Code.
- 3.3: the DOI plugin puts its own "Clear" on the same tabs, answered by
  the same `clearPubId()` ops, so DOIs act the same way there (OJS, OMP,
  and OPS galleys). Code.
- OJS `ManageFileApiHandler::clearPubId()` answers bare too, but no OJS
  plugin offers an identifier for files, so nothing reaches it. Code.
- "Clear Issue Objects URNs" on the issue's tab answers bare, but it
  removes the URNs of the issue's articles and galleys, which the tab
  does not show. Code.

## Proposed fix

Proposal: give every tab with a "Clear" the reload the issue's tab has,
and make that reload find its tab. Each `clearPubId()` above answers
with the same `reloadTab` event as the issue's, naming its window's
tabs, and each of those windows gives its "Identifiers" tab the
`identifiersTab` id the issue's already has. `reloadTabHandler_` looks
the tab up by that selector and passes its position, which is what
jQuery UI expects.
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/fix-omp.diff)
carry the full change; its core:

```diff
--- a/lib/pkp/js/controllers/SiteHandler.js
-		$(jsonData.tabsSelector).tabs('load', jsonData.tabSelector);
+		var $tabs = $(jsonData.tabsSelector),
+				// jQuery UI's tabs('load') reads a string as the end of a tab's
+				// href, never as a selector, so pass the tab's position instead.
+				index = $tabs.find(jsonData.tabSelector).index();
+
+		if (index !== -1) {
+			$tabs.tabs('load', index);
+		}
--- a/controllers/grid/articleGalleys/ArticleGalleyGridHandler.php   (OJS; OMP's three handlers alike)
         $form->clearPubId($request->getUserVar('pubIdPlugIn'));
-        return new JSONMessage(true);
+        $json = new JSONMessage(true);
+        $json->setEvent('reloadTab', [['tabsSelector' => '#editArticleGalleyMetadataTabs', 'tabSelector' => '#identifiersTab']]);
+        return $json;
--- a/templates/controllers/grid/articleGalleys/editFormat.tpl   (and editChapter.tpl, OMP's editFormat.tpl, lib/pkp editMetadata.tpl)
-			<li><a href="{url … op="identifiers" …}">…</a></li>
+			<li id="identifiersTab"><a href="{url … op="identifiers" …}">…</a></li>
```

Tried on OJS and OMP `main`: after "OK" the galley's and the chapter's
tabs show the URN as not assigned at once, and so does the issue's tab
in the subscription journal, whose reload now loads "Identifiers"
rather than "Access". With and without the fix, "Cancel" leaves the tab
as it is and loads nothing, and the open-access issue's tab still
redraws after "OK". The redrawn tab is the one step 15 shows on a fresh
open, with its "URN Suffix" box, so a "Save" there posts the suffix.

**Alternatives**:
- Fix only `reloadTabHandler_`: the issue's tab in a subscription journal
  is put right, but the other tabs still get no reload request.
- Send the tab's position from PHP instead of a selector: each handler
  would hard-code how many tabs come before "Identifiers", which goes
  wrong silently when a window gains a tab (the format window's
  "Metadata" tab is already conditional).
- Answer with the existing `refreshForm` event (`AjaxFormHandler`) and
  the form's HTML: the event fires on the confirmation window, which does
  not pass `refreshForm` on to the link that opened it, and making every
  window pass it on changes other forms.

**What goes with it**:
- No stored data, REST API or plugin hook changes. The `reloadTab`
  payload stays as it is, and only `SiteHandler` reads it.
- [U44-OMP5-press-file-refused-publisher-id-box-vanishes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OMP5-press-file-refused-publisher-id-box-vanishes.md)
  changes the `new PKPPublicIdentifiersForm(…)` line of OMP
  `ManageFileApiHandler::clearPubId()`, two lines above the `return`
  this fix replaces, so the two diffs conflict if applied as they stand.
- Backport: 3.5 and 3.4 hold the same files and lines. On 3.3 the
  handlers are `.inc.php` files and the templates use
  `$smarty.const.ROUTE_COMPONENT`; OPS needs the same change in its
  `controllers/grid/articleGalleys/ArticleGalleyGridHandler.inc.php` and
  `templates/controllers/grid/articleGalleys/editFormat.tpl`
  (`#editArticleGalleyMetadataTabs`), for the DOI's "Clear".
- Guard: an e2e check that "Clear" › "OK" on a galley's and a chapter's
  tab shows the URN as not assigned at once (U44 scenario 5 now checks
  only the reopened tab), and one on an issue in a subscription journal.

Medium: one shared JavaScript change in pkp-lib plus four app handlers
and their templates across OJS and OMP, with e2e checks.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–8 on OJS and OMP and
  then, on OJS, the open-access control and steps 9–11, on a freshly
  loaded default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js`.
  `WALK=stale` takes steps 12–15 (OJS). `WALK=neighbour` takes steps
  1–6, then "Clear" › "Cancel" on the item's tab and, on OJS, the
  open-access issue's "Clear" › "OK", with the fix applied and without.
- Walked: OJS and OMP on `main` and on `stable-3_5_0` (steps 1–11), each
  on its branch's default dataset (pkp/datasets c657990, 2026-10-01,
  PostgreSQL), with the same outcome on both; steps 12–15 on OJS `main`
  only. OPS has no URN plugin. The press needs "Monographs" ticked
  beside "Chapters" because the URN settings refuse "Chapters" alone
  ([U44 OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp1)).
- Code reads on `main`: OJS `IssueGridHandler`, `ArticleGalleyGridHandler`
  and `ManageFileApiHandler` `clearPubId()`, `issue.tpl` and the galley's
  `editFormat.tpl`; OMP `ChapterGridHandler`,
  `PublicationFormatGridHandler` and `ManageFileApiHandler`
  `clearPubId()`, `editChapter.tpl` and `editFormat.tpl`; lib/pkp
  `SiteHandler.js`, `AjaxFormHandler.js`, `ModalHandler.js`,
  `RemoteActionConfirmationModalHandler.js`, `editMetadata.tpl`,
  `PKPPubIdPluginHelper::execute()`, `PKPPubIdPlugin::addToSchema()` and
  `verifyData()`, `PKPPublicIdentifiersForm::execute()`; the URN plugin's
  `getLinkActions()` and `urnSuffixEdit.tpl`; jQuery UI 1.14's `tabs`
  `_getIndex()` and `load()`.
- 3.5: the same files, unchanged on these points. 3.4 and 3.3: `git
  show` of the same files in OJS, OMP and lib/pkp: the issue's
  `reloadTab` answer and the bare answers elsewhere on both, the same
  `reloadTabHandler_`, jQuery UI 1.13.3 (lib/pkp `composer.json`, the
  same `_getIndex()`); OMP's URN plugin on both; on 3.3 the DOI plugin's
  `clearPubIdLinkActionDoi` in `doiSuffixEdit.tpl` in OJS, OMP and OPS,
  and OPS's `ArticleGalleyGridHandler.inc.php` `clearPubId()` answering
  bare.
- Introduced: each bare `clearPubId()` answer dates from the method's
  first version: OJS galleys 219dea05d0 (pushed without a PR), OMP
  chapters 83dd274bc (`pkp/omp#498`), OMP formats and files 773825db3
  (`pkp/pkp-lib#1527`, 2016-06-20; the format's method moved in
  a35738312, 2016-07-27). Kind is "defect", not "intention gap":
  `pkp/pkp-lib#6444` reported only the issue's tab, and its fix
  (`pkp/pkp-lib#6665`, 956c34fca9 and 223f85ee80; `pkp/ojs#3012`,
  950c588ad0) never aimed at the other tabs; it brought the
  last-tab reload that misses an issue's tab in a subscription journal.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library on
  2026-10-02 by the symptom ("URN clear galley", "clear URN tab",
  "identifiers tab not refreshed", "URN clear chapter", "URN still shown
  after clear", "DOI clear galley identifiers") and by `clearPubId` and
  `reloadTab`. `pkp/pkp-lib#6444` is the only match;
  `pkp/pkp-lib#6443` (a custom DOI needing two saves) and
  `pkp/pkp-lib#5514` (a review of the DOI assign and clear actions) are
  other faults.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a); OMP `main`
  3b0ecf794 (3dc90c81a6); OJS `stable-3_5_0` 091fb65453 and OMP
  9c5e24246 (both cf3f984335); `stable-3_4_0` OJS 75cc2d488b, OMP
  0aec65441, pkp-lib 32b0f4b4af; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, pkp-lib f6ab331645.
- Not driven: the format's and file's tabs, the erased suffix on OMP and
  on 3.5, and the fix's effect on step 14's "Save" (read from the
  redrawn tab, not walked).
