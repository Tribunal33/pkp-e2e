# REST API: a journal's highlights, announcements and institutions point at the site's address, and a highlight cannot be read on its own

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; highlights on OJS only, behind the unlisted `[features] highlights` setting)
  - 3.3: none (code; an announcement's link names its journal, and there are no highlights or institutions)
- **Introduced** the links: `pkp/pkp-lib#7064` for `pkp/pkp-lib#5328` · [1f48f6e414](https://github.com/pkp/pkp-lib/commit/1f48f6e4148b410d9e5b731e17e54a751f5ca3b4) · 2021-06-03 · Nate Wright (NateWr); the highlight read: `pkp/pkp-lib#9321` for `pkp/pkp-lib#9262` · [9984fe4470](https://github.com/pkp/pkp-lib/commit/9984fe447071d461189e58904f47308e7b2920c4) · 2023-10-12 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U11 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a10), spec U12 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a19), spec U66 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U66-institutions.md#a12)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The application fails on the server when a program reads one of a
journal's highlights on its own through the REST API at the journal's
address, signed in as the Journal Manager or as the Site Administrator.
This happens for every highlight of every journal, press and preprint
server. Editing and deleting a highlight work.

The link the API gives with each highlight is no way round. It points at
the site's address instead of the journal's. At that address the Journal
Manager is refused, and the Site Administrator's request fails on the
server as well. A journal's announcements and institutions have the same
wrong link, and the site's address refuses them too, although the
journal's address reads them.

Nothing stored is lost. Each list gives every item with all its details,
and the apps' own screens never read one of these items on its own.

## Impact

- **Lost**: nothing stored. A program cannot fetch one highlight, and
  cannot follow the link of a highlight, an announcement or an
  institution. Each failed highlight read logs a server error.
- **Who**: programs that use a journal's highlights, announcements or
  institutions through the REST API and read one item by its link or
  its id.
- **Way round**: read the journal's list, which carries every property
  of each item; or build the address from the journal's path and the id
  (announcements and institutions only).

Low: no user of the apps meets it. It would be medium if a screen or a
shipped plugin read one of these items on its own.

## Steps to reproduce

The steps add a highlight on screen, then type the REST API's addresses
into the same signed-in browser.

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same, with
  "Press" or "Server" for "Journal").

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager.
2. Go to Settings › "Website" › "Setup" › "Highlights". Press "Add
   Highlight", fill in "Title" "h15i Call for papers", "URL"
   "https://example.org/h15i" and "Button Label" "Read more", and press
   "Save". The list shows "h15i Call for papers".
3. Open `/index.php/publicknowledge/api/v1/highlights`. Note the
   highlight's `id` (1 on a fresh dataset) and its `_href`.
4. Open the `_href` address.
5. Open `/index.php/publicknowledge/api/v1/highlights/1`.
6. Log out and sign in as `admin` (password `admin`). Open the list of
   step 3 again, open the `_href` read from it, then open the address of
   step 5.

**Expected**: in steps 3 and 6 the highlight's `_href` is
`http://<host>/index.php/publicknowledge/api/v1/highlights/1`. Steps 4,
5 and 6 answer 200 with the highlight, the same properties the list
gives.

**Observed**:

- Steps 3 and 6: the list answers 200, and the highlight's `_href` names
  the site:

  ```
  "_href": "http://<host>/index.php/index/api/v1/highlights/1"
  ```

- Step 4: `rvaca` is refused.

  ```
  GET /index.php/index/api/v1/highlights/1
  → 401 {"error":"user.authorization.roleBasedAccessDenied", …}
  ```

- Step 5: the request fails on the server. The server log:

  ```
  GET /index.php/publicknowledge/api/v1/highlights/1 → 500
  production.ERROR: PKP\highlight\Repository::get(): Argument #2 ($contextId) must be of type ?int, APP\journal\Journal given, called in …/lib/pkp/api/v1/highlights/HighlightsController.php on line 117
  ```

  OMP names `APP\press\Press` and OPS `APP\server\Server`.

- Step 6: `admin` gets a 500 at both addresses. At the journal's address
  it is the same `TypeError` as in step 5. At the site's address it is
  "Call to a member function getId() on null" from `HasRoles.php:63`,
  the failure of
  [U11-A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U11-A5-site-highlights-cannot-be-saved.md),
  which every request to the site's highlights meets.

## Cause

**The link.** `PKP\core\maps\Schema::getApiUrl()` (pkp-lib
`classes/core/maps/Schema.php`, line 81) builds an object's API address
for its `_href`. When the caller gives no context path, it uses
`PKPApplication::SITE_CONTEXT_PATH` (`index`), the site's address. Most
maps whose objects belong to a journal pass the path
(`$this->context->getData('urlPath')` in the publication, submission
file, user, ROR, contributor role and email log maps, and OJS's issue
map). Three do not, so a journal's objects get a `_href` at the site's
address:

- highlights: `PKP\highlight\maps\Schema::mapByProperties()`
  (`classes/highlight/maps/Schema.php`, line 81);
- announcements: `PKP\announcement\maps\Schema::mapByProperties()`
  (`classes/announcement/maps/Schema.php`, line 83);
- institutions: `PKP\institution\maps\Schema::mapByProperties()`
  (`classes/institution/maps/Schema.php`, line 83).

The default and the announcement map came in together with
1f48f6e414, the change that introduced these maps. Before it, 3.3's
`PKPAnnouncementService` built an announcement's link from its
journal's path. The default was `CONTEXT_ID_ALL` (`_`) until
[4ebcf37eb4](https://github.com/pkp/pkp-lib/commit/4ebcf37eb4a2bebe2c48b1c30cf1116a56f5314a)
(`pkp/pkp-lib#8333`, 2024-06-10), which named no journal either. The
institution map ([bed0ee4c3b](https://github.com/pkp/pkp-lib/commit/bed0ee4c3bcde7cf48c9f70bdee9400b061a31c1),
`pkp/pkp-lib#6782`) and the highlight map (9984fe4470) followed it.

What the site's address answers (seen in the API on `main` and 3.5):

- A highlight: the Journal Manager gets 401, and the Site Administrator
  gets U11-A5's 500.
- An announcement: the Journal Manager gets 401, and the Site
  Administrator gets 400 "The announcement you requested is not part of
  this journal." (on a press the raw
  `##api.announcements.400.contextsNotMatched##`).
- An institution: both get 401 "You cannot call this operation without
  a context (press, journal, conference, etc).".

**The read.** `HighlightsController::get()`
(`api/v1/highlights/HighlightsController.php`, line 117) passes
`$this->getRequest()->getContext()`, the context object, where
`Repository::get(int $id, ?int $contextId)` takes the context's id.
PHP throws a `TypeError`, which the API answers as a 500. So every
journal highlight read at the journal's address fails. The controller's
other methods pass `$context?->getId()` (lines 182, 189, 201, 230, 254
and 295), so editing and deleting one highlight by its id work, through
the API and in the Highlights panel (editing seen in the panel, deleting
read in the code). The line came with 9984fe4470 and
moved unchanged into the Laravel controller with `pkp/pkp-lib#9176`.

For highlights both lines have to change. With only the read fixed, the
`_href` still leads to the site. Once U11-A5 is fixed, the site's
address would look the id up among the site's own highlights
(`DAO::get()` matches `COALESCE(context_id, 0) = 0`) and answer 404 for a
journal's highlight (read in the code).

Reach:

- The Highlights, Announcements and Institutions panels are unaffected.
  They build each item's address from the journal's API and the id,
  and no screen reads these `_href`s (read in the code). The panel's
  add and edit of a highlight work on screen.
- The section map makes the same call, but the section schema has no
  `_href`, so no answer carries one (seen in the API).
- The decision and review assignment maps make the same call, but
  their links (`submissions/{id}/decisions/{id}`,
  `_submissions/reviewAssignments/{id}`) name routes that exist on no
  address, a separate question (read in the code).
- No other controller passes a context object where an id is expected
  (a search of `api/`, `classes/`, `pages/` and `controllers/`).

## Proposed fix

Make the request's context the default path in the shared
`getApiUrl()`, and pass the context's id in `HighlightsController::get()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlight-read-on-its-own-fails/fix.diff)):

```diff
--- a/lib/pkp/classes/core/maps/Schema.php
+++ b/lib/pkp/classes/core/maps/Schema.php
@@ -77,13 +77,16 @@
 
     /**
      * Get the URL to an object in the REST API
+     *
+     * @param ?string $contextPath The path of the context whose API serves the object. Defaults to
+     *   the request's context, which the map holds, and to the site when there is none.
      */
-    protected function getApiUrl(string $route, $contextPath = PKPApplication::SITE_CONTEXT_PATH): string
+    protected function getApiUrl(string $route, ?string $contextPath = null): string
     {
         return $this->request->getDispatcher()->url(
             $this->request,
             PKPApplication::ROUTE_API,
-            $contextPath,
+            $contextPath ?? $this->context?->getData('urlPath') ?? PKPApplication::SITE_CONTEXT_PATH,
             $route,
         );
     }
--- a/lib/pkp/api/v1/highlights/HighlightsController.php
+++ b/lib/pkp/api/v1/highlights/HighlightsController.php
@@ -114,7 +114,7 @@
      */
     public function get(Request $illuminateRequest): JsonResponse
     {
-        $highlight = Repo::highlight()->get((int) $illuminateRequest->route('highlightId'), $this->getRequest()->getContext());
+        $highlight = Repo::highlight()->get((int) $illuminateRequest->route('highlightId'), $this->getRequest()->getContext()?->getId());
 
         if (!$highlight) {
             return response()->json([
```

The new default is the map's `$this->context`, which is the request's
context (`AppServiceProvider` binds `Context` to the request's), not the
context the object belongs to. That is right for these three maps
because every list and single read they serve is filtered to the
request's context: a journal's address returns only that journal's
highlights, announcements and institutions, and the site's address only
the site's, where the map has no context and the default stays `index`.

The default is where the fix belongs because the three maps make the
same mistake, and the base method is the one place that knows the
request's context. A map that passes a path keeps it. Plugin maps were
checked: of the plugins the Plugin Gallery lists, two maps extend the
base class (PLN's deposit and deposit object maps), and neither calls
`getApiUrl()`. So the shared default changes no plugin's link, and it is
recommended over fixing the highlight map alone.

Tried on `main` on OJS, OMP and OPS: with the fix every step showed the
Expected, and nothing was logged. These answers are the same with the
fix in and out:

- `rvaca` adds a highlight on the journal's panel and edits its "URL".
- The section editor `dbuskins` gets 401 at the journal's address for
  one highlight, and so does a signed-out browser.
- `admin` still gets U11-A5's 500 on the site's list of highlights.
- A publication's `_href` keeps the journal's address.

One answer changes, as it should: an unknown id at the journal's address
gets 404 "The highlight you requested was not found." instead of the
500.

**Alternatives**

- Pass `$this->context?->getData('urlPath') ?? PKPApplication::SITE_CONTEXT_PATH`
  in each of the three maps, as the announcement map's `getUrlPath()`
  already does for its `url`. It works too, but leaves the default that
  caused all three in place for the next map.
- Build each link from the object's own `contextId`. It needs a context
  lookup per item, and no list holds another context's items.

**What goes with it**

- What it touches: at a journal's address, the `_href` of its
  highlights, announcements and institutions now names the journal, and
  the decision and review assignment links take the journal's path
  (still no route). At the site's address nothing changes. No hook or
  stored data is involved.
- Backport: the diff applies to `stable-3_5_0` as written (a dry run;
  not walked). On 3.4 the same two changes fit by hand:
  `getApiUrl()`'s default there is `CONTEXT_ID_ALL`, and
  `HighlightsHandler::get()` (line 111) passes the context object.
- Guard: a pkp-lib unit test for a map's `_href` at a journal and at the
  site, and an API test that reads one highlight at a journal's address.

Small: two lines in two pkp-lib files, and a test. The links it changes
lead nowhere today, so no API client can rely on them.

## Evidence

- The script saved in pkp-e2e walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlight-read-on-its-own-fails/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlight-read-on-its-own-fails/lib.js)
  and the panel helpers of
  [U11-A5's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-highlights-cannot-be-saved/lib.js).
  On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/highlight-read-on-its-own-fails/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The argument
  `neighbour` runs the four checks listed under Proposed fix on their
  own, on a fresh dataset. The fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/highlight-read-on-its-own-fails/fix.diff ojs omp ops`,
  a reset, the walk and `neighbour`, then `revert`.
- Walked on OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL
  and PHP 8.3.33, datasets pkp/datasets 7912e09 (2026-10-14). 3.5 showed
  the same answers; its server log writes the line as `TypeError: …`.
  The fault does not touch the database, so MySQL was not checked.
  Step 6 was walked as written, the list read again as `admin`, without
  the fix; the fix trial ran before that step re-read the list, and
  opened the `_href` of step 3, which with the fix in names the
  journal.
- Announcements and institutions (U12 A19, U66 A12) were not walked by
  this script: their `_href` and the answers in the Cause rest on the
  U12 claim check's walk (cc12a: OJS, OMP and OPS, `main` and 3.5, two
  runs each, on a journal holding one announcement and one institution;
  `shared/playwright/checks/U12/H15/h15.js`, phase `href`) and on the
  code. The default dataset holds neither, so the fix trial could not
  show their links changed; that stays unverified on screen.
- Code reads, `main`:
  - Every `getApiUrl(` call in lib/pkp `classes` and `api` and the apps'
    `classes` and `plugins`, and which schemas carry `_href` (lib/pkp
    `schemas/*.json`; the apps' own: OJS `issue.json` only).
  - The single-item routes: `PKPAnnouncementController` line 85,
    `PKPInstitutionController` line 73; none for one decision or one
    review assignment.
  - `HighlightsListPanel.vue` (item addresses from `apiUrl`), and a
    search of ui-library `src` and pkp-lib `js` for `_href`: only email
    templates, a publication and failed jobs read one.
- Plugin maps: the default branches of the 115 GitHub repositories that
  pkp/plugin-gallery's `plugins.xml` links (2026-10-15; one,
  heiseonline/shariff, has no PHP), searched for `getApiUrl(` and for
  classes extending `PKP\core\maps\Schema`. Hits: pkp/pln's
  `classes/deposit/Schema.php` and `classes/depositObject/Schema.php`
  (extend the base, no `getApiUrl()` call); lepidus/dataversePlugin's
  dispatchers (an unrelated method of the same name in their own
  class). Plugins outside the gallery were not checked.
- 3.4 (`origin/stable-3_4_0` in lib/pkp, `upstream/stable-3_4_0` in the
  apps): the announcement and institution maps' `_href` lines and the
  highlight map's line are as on `main`, with the default
  `CONTEXT_ID_ALL`. OJS's `SettingsHandler` builds the journal's
  highlights panel only when `[features] highlights` is on (line 221);
  OMP and OPS 3.4 have no `api/v1/highlights`. Highlights reached 3.4
  with `pkp/pkp-lib#9270`. 3.3 (`stable-3_3_0`, the same remotes):
  `PKPAnnouncementService::getProperties()` builds `_href` from the
  announcement's journal `urlPath` (line 124); no highlights or
  institutions.
- Introduced: `git log -S getApiUrl --follow` on the base class gives
  1f48f6e414, whose announcement map called it without a path; the
  GitHub API's `commits/<sha>/pulls` gives `pkp/pkp-lib#7064` (merged
  2021-06-10) for it and `pkp/pkp-lib#9321` for 9984fe4470. `git blame`
  on the controller's line 117 gives 71e79e31e3 (`pkp/pkp-lib#9176`),
  which moved it; 9984fe4470's `HighlightsHandler.php` line 111 already
  passed the context object.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by the symptom's words and by `getApiUrl`,
  `HighlightsController` and `_href`. Read, and not the same fault:
  `pkp/pkp-lib#11286` (a highlight's `urlText` TypeError on save),
  `pkp/pkp-lib#10061` (the tab shown without its setting),
  `pkp/pkp-lib#11765` and `pkp/pkp-lib#12397` (review comments asking
  new maps to pass the context path).
- Tips. `main`: OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f, all with
  lib/pkp b17fadae59. `stable-3_5_0`: OJS ca763c91cd, OMP a70bbb9c4,
  OPS 44aec6e131, all with lib/pkp 4045d9241e. `stable-3_4_0`: lib/pkp
  55c8e406b3. `stable-3_3_0`: lib/pkp 5e84acd11b.
