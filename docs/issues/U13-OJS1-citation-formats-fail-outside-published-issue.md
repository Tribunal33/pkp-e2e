# Readers of an article published outside a published issue cannot switch its citation format or download it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server (signed-out visitors only)
- **Affects**
  - main: OJS
  - 3.5: none (code; an article is published only through a published issue)
  - 3.4: none (code; the same)
  - 3.3: none (code; the same)
- **Introduced**
  - the refusal, a 404 for signed-in readers: `pkp/ojs` (no merged pull request) for `pkp/pkp-lib#9295` · [ada320fd81](https://github.com/pkp/ojs/commit/ada320fd81d1f78c9bad0f80c58b502a29498a55) · 2025-05-12 · Touhidur Rahman (touhidurabir)
  - the server error for signed-out visitors: `pkp/citationStyleLanguage#159` for `pkp/pkp-lib#12152` · [fa35220](https://github.com/pkp/citationStyleLanguage/commit/fa3522012bb295386d2b5e6367b20fcad69d335d) · 2026-01-17 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an article published with no issue ("Don't Assign To An Issue"), or published now while its issue stays unpublished ("Assign To Future Issue and Publish Immediately"), "How to Cite" shows the journal's primary citation, but readers cannot use "More Citation Formats" of the "Citation Style Language" plugin. A visitor who is not signed in sees the citation stay unchanged, with no message, when choosing a format, and a "Download Citation" link opens a blank page: the app fails on the server for each of these. A signed-in Reader, Author or Section Editor not assigned to the article sees the same unchanged citation, and the downloads show "404 Not Found".

Only the journal's managers and editors, and the section editors and assistants assigned to the article, get the other formats and the files. On an article in a published issue all of it works for everyone.

Only `main` has it: publishing outside a published issue is new there and not yet released, so no installed journal meets it today, and it needs fixing before that release. It also needs the plugin turned on, which a journal does in its plugin settings; a new journal starts with it off.

## Impact

- **Lost:** the article's other citation styles and its reference-manager downloads (BibTeX, RIS). Each signed-out attempt also writes a PHP fatal error (an uncaught `TypeError`) to the server's error log.
- **Who:** once released, every visitor and reader of a journal with the plugin on, on each article it publishes with "Don't Assign To An Issue" or "Assign To Future Issue and Publish Immediately": every article of a journal that publishes continuously.
- **Way round:** the primary citation stays on the page and can be copied; there is none for another style or a download.

Medium: a secondary reader feature fails for every reader of the articles that continuous publication puts outside a published issue, while the primary citation is still offered; it reaches no installed journal before the release.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`.

Setting up, as the editor:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Citation Style Language".
3. Open submission 5, "Genetic transformation of forest trees". Under "Publication", "Title & Abstract", press "Publish". In "Review Publishing Details" choose "Publication Stage" "Version of Record", "Revision Significance" "Major Revision" and "Issue Assignment" "Don't Assign To An Issue"; press "Confirm", then "Publish".
4. Open submission 6, "Investigating the Shared Background Required for Argument: A Critique of Fogelin's Thesis on Deep Disagreement". Press "Publish", choose the same version details and "Assign To Future Issue and Publish Immediately" with the issue "Vol. 2 No. 1 (2015)"; "Confirm", then "Publish".
5. Sign out.

As a reader:

6. Signed out, open article 5's page (`/index.php/publicknowledge/en/article/view/5`). Under "How to Cite", press "More Citation Formats", then "MLA".
7. Press "More Citation Formats", then "BibTeX".
8. Repeat steps 6 and 7 on article 6's page.
9. Sign in as `ccorino` (Reader; the author of submission 2 only) and repeat steps 6 and 7 on article 5's page.
10. Sign in as `minoue` (Section editor, not assigned to submission 5) and repeat steps 6 and 7 on article 5's page.

**Expected:** "MLA" replaces the APA citation under "How to Cite" with the MLA one, and "BibTeX" downloads a `.bib` file named after the article, as on an article in a published issue.

**Observed:** the citation stays the APA one ("Diouf, D. (2026). Genetic transformation of forest trees. Journal of Public Knowledge. …") with no message. Signed out (steps 6 to 8), the page's format request answers 500 with an empty body, and "BibTeX" opens a blank page, the server answering 500:

```
GET /index.php/publicknowledge/en/citationstylelanguage/get/modern-language-association?submissionId=5&publicationId=6&return=json  500
GET /index.php/publicknowledge/en/citationstylelanguage/download/bibtex?submissionId=5&publicationId=6  500
Uncaught TypeError: APP\plugins\generic\citationStyleLanguage\pages\CitationStyleLanguageHandler::canUserAccess(): Argument #2 ($userRoles) must be of type array, null given, called in plugins/generic/citationStyleLanguage/pages/CitationStyleLanguageHandler.php on line 163
```

As `ccorino` and `minoue` (steps 9 and 10), the format request answers 404 and "BibTeX" opens the page "404 Not Found".

Signed in as `dbarnes`, the same steps on article 5 give "Diouf, Diaga. “Genetic Transformation of Forest Trees”. Journal of Public Knowledge, Oct. 2026, …" and the file "Genetic+transformation+of+forest+trees.bib"; signed out, article 1 "The Signalling Theory Dividends" (in the published issue Vol. 1 No. 2 (2014)) gives its MLA citation and its `.bib` file.

## Cause

When `isUnpublished()` calls an item unpublished, `CitationStyleLanguageHandler::setupRequest()`, which answers every format and download link, throws a 404 unless `canUserAccess()` admits the user: managers, site administrators, and sub-editors and assistants assigned to the item. For OJS, `isUnpublished()` (`plugins/generic/citationStyleLanguage/pages/CitationStyleLanguageHandler.php`, line 114) reads:

```php
return !$issue || !$issue->getPublished() || $publication->getData('status') != PKPPublication::STATUS_PUBLISHED;
```

So an article counts as unpublished when it has no issue or its issue is not published, whatever its own status. Article 5 has no issue, and article 6 is in issue 2, which is not published. Both publications are Published, and the article page itself (`ArticleHandler::initialize()`) serves them to everyone, because it decides by the publication's status alone.

The rule dates from 2017 ([8a691fe](https://github.com/pkp/citationStyleLanguage/commit/8a691fedba0a101615030aeffc7aad03b575dbb5), `pkp/pkp-lib#723`, Nate Wright), when an OJS article became public only through a published issue. Continuous publication ([ada320fd81](https://github.com/pkp/ojs/commit/ada320fd81d1f78c9bad0f80c58b502a29498a55), `pkp/pkp-lib#9295`) made an article Published with no issue, or in an issue not yet published, and the plugin's rule was not changed with it. [7b085d8](https://github.com/pkp/citationStyleLanguage/commit/7b085d8f270835ac1b42cc433ec5f4f892ca8715) (`pkp/pkp-lib#12245`, 2026-02-17) moved the status test from the submission to the publication and kept the issue tests.

A refused reader gets `NotFoundHttpException`. A signed-out visitor has no user roles: `getAuthorizedContextObject(ASSOC_TYPE_USER_ROLES)` returns null, and `canUserAccess(?User $user, array $userRoles)`, typed so by [fa35220](https://github.com/pkp/citationStyleLanguage/commit/fa3522012bb295386d2b5e6367b20fcad69d335d) (`pkp/pkp-lib#12152`), throws the `TypeError` above. Before that change the untyped method returned false for a missing user, a 404. The guards for a missing user date from 2017 ([58b2e3e](https://github.com/pkp/citationStyleLanguage/commit/58b2e3e6396d36a02e2f3a15fef3b7c1d3b0b5b5), Stefan Weil). `js/articleCitation.js` catches the failed fetch and only restores the citation's opacity, so the screen says nothing.

Reach:

- Both handler operations: `get` (every format in "More Citation Formats") and `download` (BibTeX and RIS) pass through `setupRequest()`; MLA and BibTeX walked, RIS in the code.
- Articles: published with no issue, and published now into a future issue (walked); an article in a published issue is unaffected (walked). An earlier version's page passes that version's `publicationId` to the same check (code).
- OMP and OPS: `isUnpublished()` reads the submission's status there, and a published book's and a posted preprint's "MLA" and "BibTeX" work signed out (walked).

## Proposed fix

Decide by the publication's own status in the OJS branch of `isUnpublished()`, as `ArticleHandler::initialize()` decides for the article's page, and give a signed-out request an empty role list, as `QueryUserAccessibleWorkflowStageRequiredPolicy` does (`getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES) ?? []`), so a refused visitor gets a 404 instead of a server error. The diff, against the OJS root ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/fix.diff)):

```diff
         if ($applicationName === 'ojs2') {
-            return !$issue || !$issue->getPublished() || $publication->getData('status') != PKPPublication::STATUS_PUBLISHED;
+            return $publication->getData('status') != PKPPublication::STATUS_PUBLISHED;
         }
@@
-            $userRoles = $this->getAuthorizedContextObject(PKPApplication::ASSOC_TYPE_USER_ROLES);
+            $userRoles = $this->getAuthorizedContextObject(PKPApplication::ASSOC_TYPE_USER_ROLES) ?? [];
```

Tried on OJS `main`: with it, steps 6 to 10 give the MLA citation and the `.bib` file for the visitor, `ccorino` and `minoue`; and on a scheduled article ("Assign To Future Issue and Schedule Only"), the editor's preview still gets the formats, its author's preview is still refused and a visitor still gets "404 Not Found" for the page, the same as without it.

The rule's intent, keeping an unpublished article's citation to those who may preview it, is kept: a scheduled or draft publication is not Published, so it stays refused. The `$issue` parameter of `isUnpublished()` is left unused and could be dropped.

**Alternatives:**

- Keep an issue test but accept an unpublished issue: the publication's status already says whether the article is public, and a second test can only disagree with it.
- Type `canUserAccess()`'s `$userRoles` as `?array`: the same effect as `?? []`; the caller is the better place, as the pkp-lib policy does it.
- Let `canUserAccess()` defer to `Repo::submission()->canPreview()`, which also admits the article's authors: a wider change to who may use a preview's citation, a product question of its own (open for a book's preview in OMP too), not needed here.

**What goes with it:**

- The pull request goes to `pkp/citationStyleLanguage` `main`, and `pkp/ojs` `main` takes the submodule bump. No data repair, API or hook change; OMP and OPS keep their branch.
- No backport: 3.5, 3.4 and 3.3 cannot publish an article outside a published issue, and their `canUserAccess()` is untyped.
- The guard: a unit test of `isUnpublished()` for a Published publication with no issue, one in an unpublished issue, and a scheduled one.

Small: two lines in one plugin file and a test, in one pull request, plus the routine submodule bump in OJS.

## Evidence

- Walk script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/walk.js) (with [cite.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/cite.js)), on an install freshly loaded from PKP's default test dataset (pkp/datasets 38ab955, 2026-09-30; PostgreSQL): `node bin/probe.js all shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/walk.js`. It takes Steps 1 to 10 and the two controls, and on OMP and OPS "MLA" and "BibTeX" signed out on book 5 and preprint 2.
- The scheduled-article check of the Proposed fix: [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-formats-fail-outside-published-issue/neighbour.js) (submission 15, as `dbarnes`, its author `rbaiyewu` and signed out), run with the fix applied by `node bin/try-fix.js apply …/fix.diff ojs` and without it.
- Tips: OJS `main` bade233f73 (2026-09-30), its lib/pkp 2e377d27fc, OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6), the plugin 9dd6eba (2026-09-18) in all three; OJS `stable-3_5_0` 92b9a16b48 with the plugin 41ddd1b; `stable-3_4_0` 9571d8fde7 (plugin 8f54149); `stable-3_3_0` 9fdb9bcf9a (plugin 648ae36).
- 3.5: the walk on the `stable-3_5_0` dataset got as far as step 3, where submission 5's "Schedule For Publication" window offers only "Select an issue to schedule for publication" with "Vol. 2 No. 1 (2015)" and "Vol. 1 No. 2 (2014)". `Repository::validatePublish()` requires an issue ("Every publication must be scheduled in an issue") and `setStatusOnPublish()` schedules into an unpublished issue, in 3.5's, 3.4's (`classes/publication/Repository.php`) and 3.3's (`PublicationService.inc.php`) code; the plugin's issue rule is there on all three, and `canUserAccess()` is untyped on 3.5 and 3.4 (3.3 has `$user &&` guards).
- Introduced: `git blame` on line 114 leads to 7b085d8 (status read moved to the publication), then 8a691fe (2017), where `!$issue || !$issue->getPublished()` was added. ada320fd81 is the commit that removed "Every publication must be scheduled in an issue" from OJS's `validatePublish()`. The `TypeError`: fa35220, merged in `pkp/citationStyleLanguage#159` (2026-02-04).
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/citationStyleLanguage and pkp/ui-library (citation formats without issue, continuous publication citation, citation download 404, `CitationStyleLanguageHandler`, `canUserAccess`, `userRoles`): nothing on this fault.
- Not walked: "Endnote/Zotero/Mendeley (RIS)" (the same `download()` path), a Copyeditor or assistant assigned to the article (served by `canUserAccess()` in the code), an earlier version's page. MySQL not checked; nothing here depends on the database.
- Opening Settings › Website › "Plugins" also answered 500 once on each app for the Plugin Gallery list, which the test installs cannot fetch; that is a separate fault of the Plugin Gallery, not this one.
