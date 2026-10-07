# A contributor following the "Requesting updated ORCID record access" link gets a blank page and can never allow deposits

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: none (code; the ORCID Profile plugin sends no re-authorization email)
  - 3.3: none (code; the ORCID Profile plugin sends no re-authorization email)
- **Introduced** `pkp/pkp-lib#10872` for `pkp/pkp-lib#10819` · [5fafc6ffbb](https://github.com/pkp/pkp-lib/commit/5fafc6ffbb5412b47dfeda38706faedb468e76ca) · 2025-01-23 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U04 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a14)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal that moves from ORCID's public API to its member API needs
wider permission from contributors who verified their iD before the
move. When such a contributor's article is published, the journal
emails them "Requesting updated ORCID record access", with a link to
ORCID's sign-in. When ORCID sends them back to the journal, the app
fails on the server and the browser shows a blank page, whether they
pressed "Authorize" or "Deny".

Nothing is stored, so the article never reaches their ORCID record, and
every later click fails the same way. The fix touches two shared
classes, and its success path can only be tested against ORCID's member
sandbox.

## Impact

- **Lost:** the deposit of the published work to the contributor's
  ORCID record, and their answer at ORCID: an "Authorize" grants
  nothing, a "Deny" is not recorded. Nobody at the journal is told.
- **Who:** contributors verified under the public API on a journal or
  preprint server that later switched to the member API, each time one
  of their works is published there.
- **Way round:** none for the contributor. A journal manager can recover
  each one on the contributor's "ORCID iD" field: "Delete" the iD, then
  "Request verification". Verifying from that email grants the wider
  permission and sends the published work (read in the code, not
  walked). Links already sent work again once the code is fixed: they
  still name the contributor, and their token stays stored.

Medium: the ORCID deposit is a secondary output, the fault needs the
switch from the public to the member API, and a manager can redo each
contributor by hand once they know. It would be high if most journals
using the member API had started on the public one, since every earlier
contributor would need that manual step.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (OPS in brackets).
- Diaga Diouf, the contributor of submission 5 "Genetic transformation
  of forest trees" (in Production; `ddiouf` is the author account)
  [OPS: Carlo Corino, submission 1 "The influence of lactation on the
  quantity and quality of cashmere production", in Production,
  `ccorino`], verified their ORCID iD while the journal used the public
  API. Only ORCID's own sign-in creates that state, so it is written with
  this SQL, exactly as the app stores it after a public-API sign-in (the
  public API grants the scope `/authenticate`). It runs on PostgreSQL,
  MySQL and MariaDB:

  ```sql
  INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
  SELECT a.author_id, '', v.setting_name, v.setting_value
  FROM authors a
  JOIN submissions s ON s.current_publication_id = a.publication_id
  CROSS JOIN (
    SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
    UNION ALL SELECT 'orcidIsVerified', '1'
    UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
    UNION ALL SELECT 'orcidAccessScope', '/authenticate'
    UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
    UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
  ) v
  WHERE s.submission_id = 5
    AND a.email = 'ddiouf@mailinator.com';
  -- OPS: s.submission_id = 1 AND a.email = 'ccorino@mailinator.com'
  ```

Switching to the member API:

1. Sign in as `rvaca`.
2. Open Settings › Users & Roles, tab "ORCID".
3. Tick "Enable ORCID functionality", set "ORCID API" to "Member
   Sandbox", "Client ID" to `APP-0000000000000000` and "Client Secret" to
   `00000000-0000-0000-0000-000000000000`, and press "Save": "Saved".

Publishing:

4. Sign out and sign in as `dbarnes`.
5. Open submission 5, Publication › "Title & Abstract", and press
   "Schedule For Publication". In "Review Publishing Details" set the
   version to "Version of Record", choose "Assign To Current/Back Issue"
   and "Vol. 1 No. 2 (2014)", press "Confirm", then "Publish". [3.5:
   "Schedule For Publication" opens "Select an issue to schedule for
   publication"; pick "Vol. 1 No. 2 (2014)", "Save", then "Publish".]
   [OPS: open submission 1, press "Post the preprint", then "Post", and
   "Post" in the window.]
6. Load any page of the journal once or twice: the job runner sends
   `ddiouf@mailinator.com` [OPS: `ccorino@mailinator.com`] the email
   "Requesting updated ORCID record access", from Ramiro Vaca.

Following the email's link:

7. The email's two links ("Register or Connect your ORCID iD" and the one
   after "Click here to update your account with ORCID:") open ORCID's
   sign-in, `https://sandbox.orcid.org/oauth/authorize?…&scope=%2Factivities%2Fupdate&redirect_uri=…`.
   On "Authorize" ORCID sends the browser to the link's `redirect_uri`
   with `&code=…` added. Without an ORCID client registered for the
   install, take that step yourself: URL-decode the `redirect_uri`
   parameter and open it with `&code=AbC123` added:
   `/index.php/publicknowledge/orcid/updateScope?token=…&itemId=6&itemType=work&userId=12&userIdType=author&code=AbC123`
   [OPS: `…?token=…&itemId=1&itemType=work&userId=1&userIdType=author&code=AbC123`].
8. Open the address from step 7 again, this time with ORCID's "Deny"
   answer, `&error=access_denied&error_description=User%20denied%20access`,
   in place of `&code=AbC123`.

**Expected:** each answer opens the journal's "ORCID Authorization"
page. After "Authorize" the iD is stored with the member scope and the
article is sent to the contributor's ORCID record. On a test install,
where the placeholder code meets no reachable ORCID, the page instead
shows the connection error and "The ORCID authorization link has already
been used or is invalid.". After "Deny" the page reports the refusal and
the contributor's record keeps the date of the denial.

**Observed:** both answer `500` with an empty page: no heading, no text,
no title. The server log reads, for each:

```
production.ERROR: OrcidHandler::verify = No author found with supplied token
PHP Fatal error:  Uncaught TypeError: PKP\orcid\actions\VerifyIdentityWithOrcid::__construct(): Argument #1 ($identity) must be of type PKP\identity\Identity, null given, called in …/lib/pkp/pages/orcid/OrcidHandler.php on line 176 and defined in …/lib/pkp/classes/orcid/actions/VerifyIdentityWithOrcid.php:40
```

Afterwards Diaga Diouf's record is unchanged: the scope is still
`/authenticate`, no denial is stored, and the email's token is still
there. Opening the link again fails the same way.

The verification request a contributor receives before verifying
("Requesting ORCID record access", sent by "Request verification" on the
contributor's "ORCID iD" field) answers both ways with the "ORCID
Authorization" page.

## Cause

`OrcidHandler::updateScope()` (`lib/pkp/pages/orcid/OrcidHandler.php`)
is the page the re-authorization link returns to. For a work it looks
the contributor up with `getAuthorToVerify()`, the lookup of the first
verification link. That method takes the publication from the request's
`state` parameter, lists its authors and matches the emailed token
among them. The verification link carries `state` (`SendAuthorMail`
builds it as `['token', 'state' => $publicationId, 'author_id']`). The
re-authorization link does not: `SendUpdateScopeMail::handle()` builds
it as `['token', 'itemId' => publication id, 'itemType' => 'work',
'userId' => author id, 'userIdType' => 'author']`. With no `state`,
the author list is empty and no contributor is found, for any such link.

`updateScope()` then goes on regardless. Unlike `verify()`, which runs
"no author", "denied" and "verify" as one `if / elseif / else`, it
closes the `if` after the denial branch and constructs
`VerifyIdentityWithOrcid` whenever `itemType` is a known type. With no
contributor found, the constructor's `Identity $identity` parameter
refuses the null, and the request dies before the page renders.

`VerifyIdentityWithOrcid::depositOrcidItem()` also reads `state` for the
publication to deposit. So even with the contributor found, a successful
authorization from this link would fail at that point (code).

The `state` reads are older than the re-authorization feature:
`getAuthorToVerify()` has read it since ORCID moved into pkp-lib
([c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff)),
and `depositOrcidItem()` carried its read over from the
`VerifyAuthorWithOrcid` class it replaced. The fault came with the
feature: it added a second link without `state`, sent it through both
reads, and wrote `updateScope()` without the `else`.

Reach:

- OJS and OPS send the email: `DepositOrcidSubmission::handle()`
  dispatches `SendUpdateScopeMail` when a contributor's token is not
  member-scoped (walked). OMP deposits nothing, so it sends none, though
  it has the same page (code).
- Reviewers' re-authorization (OJS, `DepositOrcidReview` sends the same
  email with `itemType=review`): `getReviewerToVerify()` finds the user
  by `userId` and the token, so a fresh link reaches the page. But the
  missing `else` means a reviewer's "Deny" also starts a token exchange
  with no code, and a used or altered reviewer link answers the same 500
  (code, not driven).

## Proposed fix

Make `updateScope()` find the author the way the link names them, stop
at "no author" or "denied" as `verify()` does, and let the deposit take
the author's own publication instead of a request parameter only one
of the two links carries
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-reauthorization-link-blank-page/fix.diff)):

```diff
--- a/lib/pkp/pages/orcid/OrcidHandler.php
+++ b/lib/pkp/pages/orcid/OrcidHandler.php
@@ -169,10 +169,9 @@
         } elseif ($request->getUserVar('error') === 'access_denied') {
             // Handle access denied
             $this->handleUserDeniedAccess($identity, $templateMgr, $request->getUserVar('error_description'));
-        }
-
-        $depositType = OrcidDepositType::tryFrom($request->getUserVar('itemType'));
-        if ($depositType !== null) {
+        } else {
+            // An identity is only found for a known item type
+            $depositType = OrcidDepositType::from($request->getUserVar('itemType'));
             (new VerifyIdentityWithOrcid($identity, $request, $depositType))
                 ->execute()
                 ->updateTemplateMgrVars($templateMgr);
@@ -248,12 +247,32 @@
     private function getIdentityToVerify(Request $request): ?Identity
     {
         return match (OrcidDepositType::tryFrom($request->getUserVar('itemType'))) {
-            OrcidDepositType::WORK => $this->getAuthorToVerify($request),
+            OrcidDepositType::WORK => $this->getAuthorToUpdateScope($request),
             OrcidDepositType::REVIEW => $this->getReviewerToVerify($request),
             default => null,
         };
     }
 
+    /**
+     * Find the author a scope update link was sent to: the link names the author (`userId`)
+     * and their publication (`itemId`), and carries the token stored on that author.
+     */
+    private function getAuthorToUpdateScope(Request $request): ?Author
+    {
+        $authorId = (int) $request->getUserVar('userId');
+        $publicationId = (int) $request->getUserVar('itemId');
+        $author = $authorId && $publicationId ? Repo::author()->get($authorId, $publicationId) : null;
+        if (
+            $author === null ||
+            empty($request->getUserVar('token')) ||
+            $author->getData('orcidEmailToken') != $request->getUserVar('token')
+        ) {
+            return null;
+        }
+
+        return $author;
+    }
+
     private function getReviewerToVerify(Request $request): ?User
     {
         $user = null;
--- a/lib/pkp/classes/orcid/actions/VerifyIdentityWithOrcid.php
+++ b/lib/pkp/classes/orcid/actions/VerifyIdentityWithOrcid.php
@@ -200,8 +200,9 @@
         }
 
         if ($this->depositType === OrcidDepositType::WORK) {
-            $publicationId = $this->request->getUserVar('state');
-            $publication = Repo::publication()->get($publicationId);
+            // The author's own publication: the verification link names it as `state`, the
+            // scope update link as `itemId`
+            $publication = Repo::publication()->get($this->identity->getData('publicationId'));
 
             if ($publication->getData('status') == PKPPublication::STATUS_PUBLISHED) {
                 (new SendSubmissionToOrcid($publication, $this->context))->execute();
```

The lookup follows `getReviewerToVerify()` beside it: the link's id plus
the stored token. Taking the publication from the author keeps both
links working, because the verification link's `state` is that same
publication (`SendAuthorMail` sets it from the author).

Tried on OJS and OPS `main`. With the fix, "Authorize" reaches the token
exchange with ORCID and answers the "ORCID Authorization" page (here with
the connection failure, as ORCID is unreachable). "Deny" answers the
page and stores the denial, and the used link then answers "Your ORCID
iD could not be verified. The link is no longer valid.". The
verification request's link answered the same with and without the fix,
both ways.

**Alternatives:**

- Add `'state' => $this->itemId` to the link in `SendUpdateScopeMail`
  for works. One line, but the links already sent stay broken, and the
  page still crashes on any used or altered link without the `else`.
- Only add the missing `else`. The crash becomes the "no longer valid"
  page, but no contributor can ever re-authorize.

**What goes with it:**

- A handler test, or an e2e scenario that publishes for a contributor
  holding a public-scope token on a member-API context and follows the
  emailed link.
- Backport to 3.5: the same change applies; the diff's context differs
  by one line there (`PKPSubmission::STATUS_PUBLISHED`).
- No stored data needs repair.

**Open points** (not in the tried diff):

- The new lookup trusts the link's author and publication ids and the
  token; like `getReviewerToVerify()`, it does not check that the
  publication belongs to the journal whose address was opened. Adding
  that check (the publication's submission's context against the
  request's) would keep a link from acting across journals on one
  install.
- `handleUserDeniedAccess()` takes `string $errorDescription`, so a
  "Deny" answer without `error_description` would still be a TypeError,
  here and in `verify()`. ORCID's denial redirect sends one; passing
  `(string)` or `?? ''` would cover any that does not.
- A "Deny" on this link reaches `handleUserDeniedAccess()` once the fix
  is in, and that also clears the token the contributor granted earlier
  under the public API (seen in the trial: the iD and "verified" stay,
  the token goes). That is the handler's existing intent for a denial;
  whether declining the wider permission should drop the narrower one is
  the team's call.

Medium: about twenty lines over two classes in pkp-lib, with a test
that needs a context, a published work and a stored token.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-reauthorization-link-blank-page/walk.js)
  with [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-reauthorization-link-blank-page/lib.js)
  beside it (and `setOrcidMember()` from
  [`../publish-without-issue-orcid-contributor-error/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/lib.js)),
  on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-reauthorization-link-blank-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes the Steps,
  running the SQL after step 3 (the order does not matter to the code),
  then opens the link a third time (the used link). `MODE=nb` runs the
  control: "Request verification" on the contributor's field, then that
  email's link with the same two answers.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`. Tried on OJS and OPS `main` (steps and
  `MODE=nb` with the fix in, `MODE=nb` again after the revert); not on
  OMP (no email) or 3.5.
- The SQL copies what `VerifyIdentityWithOrcid::setIdentityData()` and
  `saveIdentityData()` (`Repo::author()->dao->update()`) write after a
  public-API sign-in: `author_settings` rows with locale `''`; the iD as
  `OrcidManager::getOrcidUrl()` plus the iD (the sandbox host for the
  sandbox APIs); `orcidIsVerified` `1`; the token, ORCID's public scope
  `/authenticate` (`OrcidManager::ORCID_API_SCOPE_PUBLIC`) and the
  refresh token; `orcidAccessExpiresOn` in `Carbon::toDateTimeString()`'s
  shape, about 20 years ahead as ORCID grants.
- Not driven: ORCID's sign-in and consent screens (orcid.org is
  unreachable from the test installs, and the placeholder client would be
  refused); the appended parameters are those of ORCID's OAuth redirect
  that `updateScope()` and `verify()` read. Unverified: the success path
  with a real code (the member-scoped token stored, then
  `depositOrcidItem()` sending the work), with or without the fix; the
  manager's way round in Impact (`OrcidController::deleteForAuthor()`
  clears the iD and token, `requestAuthorVerification()` sends the
  verification link, which asks for the member scope on a member-API
  context, and `verify()` deposits a published work); the reviewer link.
- Walked on `main` and `stable-3_5_0`, OJS and OPS, PostgreSQL, the
  default datasets of pkp/datasets 401a013 (2026-10-06), each walk on a
  freshly loaded dataset. MySQL not checked; nothing in the fault depends
  on the database. The "Deny" answer passes through a 302 to the address
  with the `/en/` locale first; the 500 is on the second request.
- Tips:
  - main: OJS 92bc2bb467 (lib/pkp e60013c77f), OPS 7e34fdd57e and OMP a0e6d0a8b (lib/pkp 5a5ab2d6c7)
  - 3.5: OJS b8f5e9a951, OPS acc0de0586, OMP 7d6b00060 (lib/pkp 6d7f1540b6)
  - 3.4: lib/pkp 767353f4fe; ORCID Profile plugin 894c2593e0 (OJS), 7d8c4e3c51 (OPS)
  - 3.3: lib/pkp ac3fa73402; ORCID Profile plugin 41864d3770 (OJS, OPS)
- Code reads: on main the three files are identical in the lib/pkp of
  the three apps; on 3.5 they match main except the published-status
  constant. On 3.4 and 3.3 lib/pkp has no `pages/orcid` and no ORCID
  jobs, the plugin's handler offers only `orcidAuthorize`, `orcidVerify`
  and `about`, and neither it nor the plugin class has a scope update or
  a re-authorization email; OMP bundles no ORCID plugin there.
- Upstream search (2026-10-07): pkp/pkp-lib, pkp/ojs and pkp/ops, by the
  symptom's words and by `updateScope`, `VerifyIdentityWithOrcid`,
  `SendUpdateScopeMail` and `getAuthorToVerify`; nothing matched.
