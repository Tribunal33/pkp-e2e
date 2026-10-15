# Anyone, signed in or not, can read who reported a comment and why from the public comment list

- **Severity** high
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS; OMP and OPS carry the same code, but no screen there writes a comment to report
  - 3.5: none (no reader comments)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11410` for `pkp/pkp-lib#11326` · [3aa127313b](https://github.com/pkp/pkp-lib/commit/3aa127313b5366cd01deddb48a096164d8d12484) · 2025-06-18 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U14 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U14-reader-comments-and-moderation.md#a17)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Only a journal's moderators are meant to know who reported a comment
and why: they read reports on the Comments page. But the comment list
behind every article's page, `GET /api/v1/comments/public`, which
anyone may call without signing in, returns every report on each
approved comment when `includeReports` is added to the request. Each
report carries the reporter's name, affiliation and ORCID iD, and the
reason exactly as they typed it.

So the writer of a reported comment, or any visitor, can learn who
reported it and what they wrote. The reporter is not told. No page of
the app sends `includeReports`, but the parameter is in pkp-lib's
public source.

## Impact

- **Lost**: the confidentiality of a report, with the reporter exposed
  to the person they reported.
- **Who**: every reader who reports an approved comment, on every
  journal that turns on "Enable Public Comments" (Settings › Website ›
  "Content" › "Comments"; off by default). It is on `main` only today,
  so it ships in the next release unless fixed.
- **Way round**: none short of turning comments off; a reader cannot
  report anonymously.

High: reporting a comment, a secondary task, fails at what it promises
for every reporter on every journal with comments on, silently and with
no way round, and what leaks is personal data handed to the person
reported.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`).
  Public comments are off in it; step 1 turns them on.
- Submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a
  hospital in Isfahan, Iran", is published; its published version is
  publication 18. The article's page asks for its comments with
  `/index.php/publicknowledge/api/v1/comments/public?publicationIds=18`.
- `dbarnes` (Journal editor) moderates, `ccorino` (Carlo Corino) writes
  the comment and `lchristopher` (Leo Christopher, Australian National
  University) reports it.

Steps:

1. Sign in as `dbarnes`. Settings › Website › "Content" › "Comments":
   tick "Enable Public Comments", press "Save".
2. Sign in as `ccorino`. Open the article's page
   (`/index.php/publicknowledge/article/view/17`), type "h15f comment by
   ccorino" in the comment box, press "Submit".
3. Sign in as `dbarnes`. Content › Comments: the row's "…" › "View
   Comment" › "Approve Comment".
4. Sign in as `lchristopher`. On the article's page, the comment's "…" ›
   "Report", type the reason "h15f reason typed by lchristopher", press
   "Submit".
5. Sign out. Open
   `/index.php/publicknowledge/api/v1/comments/public?publicationIds=18`.
6. Open the same address with `&includeReports=1` added.
7. Sign in as `ccorino`, the comment's writer, and open the address of
   step 6.

**Expected**: steps 6 and 7 answer as step 5 does: the approved comment,
with no reports.

**Observed**: step 5 lists the comment with `"isReported": true` and no
reports. Steps 6 and 7 answer 200 with the same comment and its
reports:

```json
"reports": [
  {
    "id": 1,
    "userCommentId": 1,
    "userId": 28,
    "userName": "Leo Christopher",
    "userOrcidDisplayValue": null,
    "note": "h15f reason typed by lchristopher",
    "createdAt": "2026-10-15T05:05:21.000000Z",
    "updatedAt": "2026-10-15T05:05:21.000000Z",
    "isUserOrcidAuthenticated": false,
    "userAffiliation": "Australian National University"
  }
]
```

Control: signed out, the moderators' own request for the comment's
reports, `/index.php/publicknowledge/api/v1/comments/1/reports`, answers
401 "You are not authorized to access the requested resource."

## Cause

`PKP\API\v1\comments\resources\UserCommentResource::toArray()` adds a
comment's reports whenever the request's query holds the key
`includeReports`, with no check on who asks
([UserCommentResource.php#L63-L65](https://github.com/pkp/pkp-lib/blob/b17fadae59/api/v1/comments/resources/UserCommentResource.php#L63-L65)):

```php
if (key_exists('includeReports', $requestQueryParams)) {
    $results['reports'] = UserCommentReportResource::collection($this->reports);
}
```

`UserCommentReportResource` carries the reporter's `userId`,
`userName`, `userAffiliation`, `userOrcidDisplayValue` and the `note`. The same
resource serves `UserCommentController::getManyPublicComments()`, the
`GET comments/public` route, which sits outside the `has.user` group
and is authorized by `PublicAccessPolicy` alone, so anyone reaches it.
The rule that reports are moderator data is kept everywhere else: the
report routes (`GET comments/{id}/reports`, `…/reports/{reportId}`) sit
behind `roleAuthorizer([ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER])`, and the
resource itself already puts `approvedAt` and `approvedByUserName`
behind `mergeWhen($request->user() && Repo::userComment()->isModerator(…))`.

The branch came with the comments API in
[3aa127313b](https://github.com/pkp/pkp-lib/commit/3aa127313b5366cd01deddb48a096164d8d12484),
meant for the moderators' `getMany()` and `get()` routes (their doc
blocks name the parameter); the public route was added in the same
change and shares the resource.

Reach:

- The public list is the only route open to non-moderators that renders
  existing comments, which can carry reports; `submit()` (any signed-in
  user, `POST comments`) renders the new comment, which has none.
  Checked in the code.
- Every report in the journal: publication ids run in sequence, so a
  caller can ask for 1, 2, 3… in turn. Checked on screen for one, in the
  code for the rest.
- OMP and OPS: the same lib/pkp file and controller, and both register
  the `comments` API; no comment box writes comments there, so reports
  exist only on comments made through the API. Checked in the code.
- `isReported` on the public list also tells anyone that a comment has
  been reported, without naming anyone. The article's page does not read
  it. Left as it is (see Proposed fix).

## Proposed fix

Give the `includeReports` branch the same moderator check the resource
already uses for the moderator-only fields, so the shared resource
decides for every route
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-comment-list-exposes-reports/fix.diff),
against `lib/pkp`):

```diff
         $publication = $this->publication; /** @var Publication $publication */
 
+        $isModerator = $request->user() && Repo::userComment()->isModerator($request->user());
+
         $results = [
…
             // Fields only available to moderators
-            $this->mergeWhen($request->user() && Repo::userComment()->isModerator($request->user()), [
+            $this->mergeWhen($isModerator, [
…
-        if (key_exists('includeReports', $requestQueryParams)) {
+        // Reports name the reporter and their reason: moderators only
+        if ($isModerator && key_exists('includeReports', $requestQueryParams)) {
             $results['reports'] = UserCommentReportResource::collection($this->reports);
         }
```

`$request->user()` is the signed-in user on `GET comments/public` too,
although that route has no `has.user` middleware:
`Dispatcher::setUserResolver()` points Illuminate's user resolver at the
PKP session user for every API request. The comment above the route
(`UserCommentController.php` L56-58, "authenticated users won't have
user context in their requests") is stale; `getManyPublicComments()`
itself reads the session user to list the viewer's own pending
comments. That comment could be corrected with the fix. A moderator
calling `comments/public` with an API token alone gets no reports after
the fix, since the route never decodes the token; `GET comments` serves
them.

Tried on OJS `main`: with the fix, steps 6 and 7 answer the comment
without `reports`, as step 5 does. Without the fix and with it, a
moderator still gets the report: on the Comments page "View Report"
shows Leo Christopher and the reason, and `dbarnes` opening the address
of step 6 gets the report.

- **Alternatives**: dropping the parameter in
  `getManyPublicComments()` covers that route only and leaves the next
  caller of the resource to repeat the mistake. Taking reports out of
  `UserCommentResource` altogether is cleaner, since no screen asks for
  them through it (the Comments page reads `GET comments/{id}/reports`),
  but it changes what the moderators' `GET comments` and
  `GET comments/{id}` answer for an API client that uses the parameter.
- **What goes with it**: no stored data to repair. `isReported` could
  be put behind the same check; it names no one, and the article's page
  sets it itself after a report, so it is left to the team. The guard
  fits the existing Cypress spec
  `lib/pkp/cypress/tests/integration/publicComments/PublicComments.cy.js`
  (pkp-lib has no test harness for API routes): after its "should allow
  authenticated user to report a comment" test, a `cy.request()` to
  `comments/public?publicationIds=…&includeReports=1` signed out and as
  the comment's writer expects no `reports` key, and as the moderator
  expects one.

Small: one condition in one shared resource, following the check beside
it, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-comment-list-exposes-reports/walk.js)
  (helpers in `lib.js` beside it, through the OJS U14 page objects)
  takes steps 1–7 and the control on an OJS install loaded from the
  default dataset (pkp/datasets `7912e09`, 2026-10-14, the `pgsql`
  dump; the walks ran on PostgreSQL):
  `node bin/probe.js ojs shared/playwright/checks/issues/public-comment-list-exposes-reports/walk.js`;
  the moderator check under Proposed fix is
  `node bin/probe.js ojs shared/playwright/checks/issues/public-comment-list-exposes-reports/walk.js neighbour`.
- Tips: OJS `378eced941`, OMP `f4836d4fb`, OPS `2ece50497f` (all three
  lib/pkp `b17fadae59`, lib/ui-library `47b565cb`); stable-3_5_0 OJS
  `ca763c91cd`, OMP `a70bbb9c4`, OPS `44aec6e131` (lib/pkp
  `4045d9241e`); stable-3_4_0 OJS `daf0ca971d`, OMP `0aec65441`, OPS
  `acd8ae704b`, lib/pkp `55c8e406b3`; stable-3_3_0 OJS `d7d9dd14ec`, OMP
  `8e72fc883`, OPS `c5532e2161`, lib/pkp `5e84acd11b`.
- Code reads on `main`: `UserCommentController` (`getGroupRoutes()`,
  `authorize()`, `getManyPublicComments()`, `getMany()`, `get()`,
  `submit()`), `UserCommentResource`, `UserCommentReportResource`,
  `userComment\Repository::isModerator()`, `Dispatcher::setUserResolver()`,
  `DecodeApiTokenWithValidation` (its resolver also falls back to the
  session user; it runs only with `has.user`);
  ui-library and lib/pkp grepped for `includeReports` (only the resource
  and the two doc blocks) and for the comment routes the screens call
  (the article's page `comments/public?publicationIds=…`, the Comments
  page `comments/{id}/reports`); `enablePublicComments` in
  `schemas/context.json` (default `false`).
- 3.5 walked: the same script on the `stable-3_5_0` installs of the three
  apps finds no "Comments" tab under Settings › Website, and the address
  of step 6 answers 404 `{"error":"api.404.endpointNotFound"}`; lib/pkp
  on `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` holds no
  `api/v1/comments` and no `userComment` classes.
- Not driven: OMP and OPS on `main`; OJS's comment box is in
  `templates/frontend/objects/article_details.tpl`, and the two apps'
  templates hold none.
- Introduced: `git blame` on the `includeReports` lines gives
  `3aa127313b`, unchanged since. The reporter's `userAffiliation` (and
  `isUserOrcidAuthenticated`) came later, in `1869f217fd`
  (`pkp/pkp-lib#11647`, 2025-08-28), so the affiliation has leaked
  since then; name, ORCID iD and reason since `3aa127313b`. The other
  later changes to `UserCommentResource` (`0c0f1406b1`,
  `pkp/pkp-lib#11620`, the writer's affiliation, initials and ORCID
  state; `7a77610448`; `f5bd392a69`) leave this branch alone. In PR `pkp/pkp-lib#11410`'s review
  a reviewer asked where `includeReports` was used, and the answer
  pointed at the resource; who may use it was not discussed.
- Upstream search 2026-10-15 (pkp/pkp-lib, pkp/ojs, pkp/ui-library;
  "includeReports", "UserCommentResource", "getManyPublicComments",
  user words about comment reports and privacy): only `pkp/pkp-lib#11410`
  (the introducing PR) and `pkp/pkp-lib#13052` (an N+1 query on the same
  route, not this fault).
