# Editor publishing an article without an issue gets an error when a contributor has a verified ORCID iD

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none (publishing needs an issue)
  - 3.4: none (code; publishing needs an issue)
  - 3.3: none (code; publishing needs an issue)
- **Introduced** `pkp/ojs#4875` for `pkp/pkp-lib#9295` · [ada320fd81](https://github.com/pkp/ojs/commit/ada320fd81d1f78c9bad0f80c58b502a29498a55) · 2025-05-12 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-19)
- **Tracked in** U49 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ojs4) · U04 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#ojs2)
- **Checked** 2026-10-19 (verifying after publication), 2026-10-02 (publishing), each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-19: added the same fault on the verification path, a contributor verifying their ORCID iD after such a publish (U04 OJS2).

## Summary

An editor publishes an article with "Don't Assign To An Issue" while one of its contributors holds a verified ORCID iD, on a journal with ORCID on under the member API. The publish answers with "An unexpected error has occurred. Please reload the page and try again.", although the article is in fact published.

The contributor's work is never sent to their ORCID record, and depending on the install the article's author never receives "Publication Published". The editor has nothing on screen to resend either.

A contributor who verifies their iD after such an article is published meets the same fault: the page they return to from ORCID is blank, their iD is stored, and their work is never sent to their ORCID record.

Publishing without an issue is new on `main`. The fault needs that, the member API, a contributor with a verified iD, and DOIs turned on for the journal; with DOIs off the same publish works and the deposit goes out.

## Impact

- **Lost:** the ORCID deposit for each verified contributor, and for each contributor who verifies later. On some installs the author's "Publication Published" email and notification are lost too (they were on the walked install). That depends on the order in which the install runs the steps that follow a publish, which differs between installs and stays the same on each (Cause).
- **Who:** editors who publish articles outside issues on journals using the ORCID member API, each time such an article has a contributor with a verified iD. Without such a contributor the publish works. The fault then comes back when a contributor verifies their iD afterwards: they see a blank page.
- **Way round:** publishing into an issue works. An article meant to stay outside issues has no way round: an editor who unpublishes it and publishes it again without an issue gets the same error. A contributor who verified is not told; opening the link again says "An ORCID iD was already stored for this submission.", and nothing on screen sends the deposit.

Medium: the article itself goes live, and the fault needs four things together that are each uncommon or optional: publishing without an issue, the member API, a verified contributor, and DOIs on. It would be high if journals that publish without issues became the usual case once this reaches a release, since they have no way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. Its journal `publicknowledge` has issues ("Vol. 1 No. 2 (2014)" published, "Vol. 2 No. 1 (2015)" not) and DOIs on for articles.
- Diaga Diouf, a contributor to submission 5 "Genetic transformation of forest trees" (in Production; `ddiouf` is its author account), holds a verified ORCID iD with an access token. Only ORCID's own sign-in creates that state: the contributor follows the journal's "verify your ORCID iD" link and authorizes it. So it is written here with SQL, exactly as the app stores it after that sign-in. The statement runs on PostgreSQL, MySQL and MariaDB:

  ```sql
  INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
  SELECT a.author_id, '', v.setting_name, v.setting_value
  FROM authors a
  JOIN submissions s ON s.current_publication_id = a.publication_id
  CROSS JOIN (
    SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
    UNION ALL SELECT 'orcidIsVerified', '1'
    UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
    UNION ALL SELECT 'orcidAccessScope', '/activities/update'
    UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
    UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
  ) v
  WHERE s.submission_id = 5
    AND a.email = 'ddiouf@mailinator.com';
  ```

Turning ORCID on:

1. Sign in as `rvaca`.
2. Open Settings › Users & Roles, tab "ORCID".
3. Tick "Enable ORCID functionality".
4. Set "ORCID API" to "Member Sandbox", "Client ID" to `APP-0000000000000000` and "Client Secret" to `00000000-0000-0000-0000-000000000000`.
5. Press "Save": "Saved".

Publishing:

6. Run the SQL above.
7. Sign out and sign in as `dbarnes`.
8. Open submission 5, "Genetic transformation of forest trees", Publication › "Title & Abstract".
9. Press "Schedule For Publication".
10. In "Review Publishing Details", set the version to "Version of Record", choose "Don't Assign To An Issue" under "Issue Assignment", and press "Confirm".
11. The window reads "All publication requirements have been met. This will be published immediately without any issue association. Are you sure you want to publish this?". Press "Publish".

**Expected:** the window closes and the workflow page reads "Status: Published" with an "Unpublish" button. A `PKP\jobs\orcid\DepositOrcidSubmission` job for Diaga Diouf is dispatched (on the walked install, which reaches no ORCID server, it landed in `failed_jobs` with "cURL error 7: Failed to connect to api.sandbox.orcid.org"). `ddiouf@mailinator.com` receives "Publication Published".

**Observed:** the window stays open and the page shows "An unexpected error has occurred. Please reload the page and try again.". The workflow page still reads "Status: Unpublished", and neither "Schedule For Publication" nor "Unpublish" is shown. The publish request answers 500:

```
POST /index.php/publicknowledge/api/v1/submissions/5/publications/6/publish  500
{"error":"Call to a member function getData() on null"}
```

```
production.ERROR: Call to a member function getData() on null {"exception":"[object] (Error(code: 0): Call to a member function getData() on null at …/classes/orcid/OrcidWork.php:68)
```

After a reload the page reads "Status: Published" with "Unpublish", and the submission is in the Done stage. Nothing is in `jobs` or `failed_jobs`, `ddiouf@mailinator.com` has received no message, and `ddiouf` has no notification that the article was published.

The same steps with "Assign To Current/Back Issue" › "Vol. 1 No. 2 (2014)" at step 10 publish without an error, run the deposit job and email `ddiouf`.

Verifying after publication (from a freshly loaded dataset, without the SQL):

12. Take steps 1 to 5, but at step 4 enter the "Client ID" and "Client Secret" of an ORCID Member Sandbox client registered at ORCID for the install's address. Step 17 needs one: ORCID refuses the sign-in for the placeholders above. Without such a client, step 17 cannot be taken; Evidence describes how the walk stood in for ORCID's answer.
13. Sign out and sign in as `dbarnes`.
14. Open submission 5, Publication › "Contributors", and press "Edit" on Diaga Diouf.
15. Under "ORCID iD", press "Request verification", then "Yes". `ddiouf@mailinator.com` receives "Requesting ORCID record access" from Ramiro Vaca.
16. Take steps 8 to 11. The window closes and the page reads "Status: Published", since no contributor holds a verified iD yet.
17. Sign out. Signed out, as Diaga Diouf, open the email's link "Register or Connect your ORCID iD", sign in at ORCID and press "Authorize". ORCID sends the browser back to `/index.php/publicknowledge/orcid/verify?token=…&state=6&author_id=12&code=…`.
18. Open the email's link again and authorize again.

**Expected:** step 17 opens "ORCID Authorization", reading "Your ORCID iD has been verified and successfully associated with the submission. You will now be automatically directed back to Journal of Public Knowledge.", and the ORCID deposit job for Diaga Diouf is queued. Step 18 reads "An ORCID iD was already stored for this submission. Please contact the journal manager with your name, ORCID iD, and details of your submission.".

**Observed:** step 17 answers 500 with an empty page: no title, no heading, no text. The server log reads:

```
PHP Fatal error:  Uncaught Error: Call to a member function getData() on null in …/classes/orcid/OrcidWork.php:68
```

Diaga Diouf's contributor record now holds the iD, verified, with the access token, but no deposit job was queued. Step 18 reads "An ORCID iD was already stored for this submission. …", so the contributor cannot start the deposit again.

The same steps with "Assign To Current/Back Issue" › "Vol. 1 No. 2 (2014)" at step 16 land on the "ORCID Authorization" success page and queue the deposit.

## Cause

`APP\orcid\OrcidWork::getAppDoiExternalIds()` (OJS `classes/orcid/OrcidWork.php`, line 68) reads the issue's DOI as `$this->issue->getData('doiObject')`. The class's constructor takes the issue as optional (`?Issue $issue = null`), and its sibling `getAppPubIdExternalIds()` reads it null-safely (`$this->issue?->getStoredPubId(...)`).

`APP\orcid\actions\SendSubmissionToOrcid::getOrcidWork()` builds the work with a null issue when the publication has none. It does so only when at least one contributor has an iD and a live token under the member API. `PKPOrcidWork::buildOrcidExternalIds()` calls `getAppDoiExternalIds()` only when the journal has DOIs turned on, so that is when the build throws.

The method was written when ORCID moved into the core (pkp-lib#9771), at a time when OJS refused to publish an article without an issue. `pkp/pkp-lib#9295` (continuous publication) first let an article publish without one in `ada320fd81`, and `d4aa47f268` dropped the issue check entirely. A later commit for the same issue, `e1efda5dd4` ("Do not assume an issue will be present in published content"), fixed another place that assumed an issue, but not this one.

The throw happens inside `Repo::publication()->publish()`, after the published status is saved and while the `PublicationPublished` event runs its listeners. The ORCID listener `PKP\observers\listeners\SendSubmissionToOrcid` throws, so the request answers 500 and the rest of the publish never runs:

- The contributors' deposit jobs and `depositReviewsForSubmission()` (seen: `jobs` and `failed_jobs` empty).
- The event's listeners after this one. `EventServiceProvider` discovers them in two directories (`lib/pkp/classes/observers/listeners` and `classes/observers/listeners`), in the order the file system lists them, and caches that map per install (`getCacheKey()`). So the order holds on one install until the cache is rebuilt, and differs between installs. On the walked install `ApplyDoneWorkflowStage` and `AssignDOIs::handlePublished()` came before the ORCID listener and ran: the submission moved to Done. `NotifyAuthorOnPublication` ("Publication Published" and its notification) and `UpdateSubmissionInSearchIndex` came after it and did not run (no email, no notification). Where `AssignDOIs` comes after it, a journal that creates DOIs at publication also misses them (code).
- The end of OJS's `Repository::publish()`: `stampModified()` on the submission (its OAI datestamp) and `ArticleTombstoneManager::reconcileTombstonesOnPublish()` (code).

Reach:

- `PKP\orcid\actions\VerifyIdentityWithOrcid::execute()` calls the same `SendSubmissionToOrcid::execute()`, through `depositOrcidItem()`, when a contributor verifies an iD after the article is published. It does so after `saveIdentityData()` has stored the verified iD and token and cleared the email's token. So the throw leaves the iD stored, dispatches no deposit, and stops `OrcidHandler::verify()` before it displays its template: the blank page (on screen, Steps "Verifying after publication"). The link is then used up, and nothing else deposits the work.
- OPS's `OrcidWork` has no `getAppDoiExternalIds()` override, and OMP deposits nothing (code). OMP and OPS were seen publishing an item with a verified contributor without error.
- Nothing else under `classes/orcid`, `lib/pkp/classes/orcid` or the ORCID jobs reads the issue (code). `OrcidWork::getBibtexCitation()` passes it to `CitationStyleLanguagePlugin::getCitation()`, which takes `?Issue` and falls back null-safely (`$issue ??= $issueId ? Repo::issue()->get($issueId) : null`), so it is safe; the fix trial built that citation without an error.

## Proposed fix

Read the issue's DOI null-safely in `APP\orcid\OrcidWork::getAppDoiExternalIds()`, as `getAppPubIdExternalIds()` beside it already does ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/fix.diff)):

```diff
-        $issueDoiObject = $this->issue->getData('doiObject');
+        $issueDoiObject = $this->issue?->getData('doiObject');
```

The constructor declares the issue optional, so the class itself should handle a missing one. An article without an issue then gets no "part-of" issue DOI, the same as an article in an issue that has no DOI, and keeps its own DOI or URL as its identifier. `OrcidWork` is built in one place, `SendSubmissionToOrcid::getOrcidWork()`, which both the publish listener and the later verification reach, so both are fixed. Tried: with it, the steps publish without an error, the window closes on "Status: Published", the deposit job runs and `ddiouf` receives "Publication Published". Verifying after such a publish then lands on the "ORCID Authorization" success page and queues the deposit. The back-issue publish, and verifying after it, behave the same with and without it.

**Alternatives:**

- Skip the issue in `SendSubmissionToOrcid::getOrcidWork()` instead. That fixes today's one caller only.
- Catch failures in the ORCID listener so that a failing integration cannot stop a publish halfway. Worth doing as well, but on its own it would hide this fault and still lose the deposit.

**What goes with it:**

- A DB-backed test in OJS: `OrcidWork` builds its data in the constructor from the database, the request and the pubId plugins, so it needs a context with DOIs on and a published publication without an issue. No test of the class exists today, and no OJS test base provides that state: the nearest are `tests/classes/plugins/DepositableExportableTest.php` (a `DatabaseTestCase` that inserts its own journal and publication rows) and `lib/pkp/tests/jobs/doi/DepositSubmissionTest.php` (a mocked journal with DOIs on), so the test builds its rows itself. Alternatively, an e2e scenario publishing an article without an issue with a verified contributor under the member API.
- Articles already published this way: the deposit is attempted only at publication and when a contributor verifies an iD. Once the fix is in, unpublishing and publishing such an article again deposits it and emails its author, from the code (that path was not walked). That covers contributors who verified on the blank page too: their iD and token are stored as after a successful verification. Nothing stored is wrong.

Small: one line in OJS, and a test.

## Evidence

- Kept scripts: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/walk.js) (steps 1 to 11) and [verify-walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/verify-walk.js) ("Verifying after publication"), with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/lib.js). Each takes its steps, and with `MODE=nb` the back-issue control, on an install loaded from the default dataset; each script's header gives the command that runs it.
- "Verifying after publication" was walked on 2026-10-19 (dataset pkp/datasets eaf024c5). ORCID's own sign-in (step 17) and its token answer cannot be reached from the test install, so the walk opened the email link's `redirect_uri` with `&code=…` added, and a local stand-in for ORCID's token endpoint ([orcid-token-stub.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js), the install's `[proxy]` pointed at it) answered `POST https://api.sandbox.orcid.org/oauth/token` with ORCID's documented success body. That body carries the public scope `/authenticate`, not the member scope. So in the control and fix runs the deposit job, finding no member scope, emailed "Requesting updated ORCID record access" instead of calling ORCID (`DepositOrcidSubmission::handle()`). That email showed the job had been queued and run. The failing run sent none, and its `jobs` and `failed_jobs` stayed empty. The scope plays no part before the throw.
- The SQL copies what `PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()` and `saveIdentityData()` (`Repo::author()->dao->update()`) write:
  - `author_settings` rows with locale `''`;
  - the iD as `OrcidManager::getOrcidUrl()` plus the iD (the sandbox host under "Member Sandbox");
  - `orcidIsVerified` as `1` (`DAO::convertToDB()` for a boolean);
  - the token, the member scope `/activities/update` (`OrcidManager::ORCID_API_SCOPE_MEMBER`) and the refresh token;
  - `orcidAccessExpiresOn` in `Carbon::toDateTimeString()`'s shape, set about 20 years ahead as ORCID grants.
- DOIs off: `PKPOrcidWork::buildOrcidExternalIds()` calls `getAppDoiExternalIds()` only under `areDoisEnabled()` (code), and an earlier campaign run saw the publish succeed and the deposit go out with DOIs off.
- Walked on PostgreSQL with the default dataset (pkp/datasets e8dafbc, 2026-10-02), freshly loaded before each walk. The SQL was not run on MySQL; the fault itself does not depend on the database.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a); OJS `stable-3_5_0` 091fb65453 (lib/pkp cf3f984335); OJS `stable-3_4_0` 75cc2d488b (lib/pkp 32b0f4b4af); OJS `stable-3_3_0` ac77c9fb35 (lib/pkp f6ab331645).
- Tips on 2026-10-19 (the verification walks and reads): OJS `main` 6b4323ced7 (lib/pkp 042726ebf6), line 68 unchanged; OJS `stable-3_5_0` 007c2cd0d6 (lib/pkp 092ec34b0f); OJS `stable-3_4_0` 0012bd1022 (lib/pkp a71d6bd2ca); OJS `stable-3_3_0` d7d9dd14ec (lib/pkp 5e84acd11b). The fix was tried again on today's `main` for the verification, with the back-issue control walked with it and without it.
- 3.5, verification: deleting an issue (`IssueGridHandler::deleteIssue()`) returns its articles to the queue unpublished, so 3.5 holds no published article without an issue for a contributor to verify on (code).
- 3.5, walked: the same line 68 is there, but `validatePublish()` in `classes/publication/Repository.php` still requires an issue. "Schedule For Publication" on submission 5 opens "Select an issue to schedule for publication", which lists only the two issues.
- 3.4 and 3.3, code (re-read 2026-10-19 at the tips above): ORCID is the `orcidProfile` plugin (there is no `classes/orcid/OrcidWork.php`), and `validatePublish()` refuses a publish without an issue with "publication.required.issue". It lives in `classes/publication/Repository.php` on 3.4 and `classes/services/PublicationService.inc.php` on 3.3.
- Introduced and Kind: `git blame` on `OrcidWork.php` line 68 gives d53d2fb9c3b (Erik Hanson, 2024-06-18, the move into the core).
  - `ada320fd81` is named because it is the first commit that let an article publish without an issue: it relaxed the `validatePublish()` check behind a setting, and `d4aa47f268` (2025-05-29) removed it.
  - Kind is defect rather than regression: publishing with a verified contributor into an issue worked before and still works, while publishing without an issue is a path no released line has.
- Not driven: unpublishing and publishing again; a journal with no issues at all (an earlier campaign run on a scratch journal saw it fail the same way).
