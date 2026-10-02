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
- **Upstream** none found (2026-10-02)
- **Tracked in** U49 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ojs4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor publishes an article with "Don't Assign To An Issue" while one of its contributors holds a verified ORCID iD, on a journal with ORCID on under the member API. The publish answers with "An unexpected error has occurred. Please reload the page and try again.", although the article is in fact published.

The contributor's work is never sent to their ORCID record. On a typical install the article's author also never receives "Publication Published". The editor has nothing on screen to resend either.

Publishing without an issue is new on `main`. The fault needs that, the member API, a contributor with a verified iD, and DOIs turned on for the journal.

## Impact

- **Lost:** the ORCID deposit for each verified contributor. Depending on the order the install runs its publish steps in, the author's "Publication Published" email and notification are lost too (they were on the walked install).
- **Who:** editors who publish articles outside issues on journals using the ORCID member API, each time such an article has a contributor with a verified iD. Without such a contributor the publish works.
- **Way round:** publishing into an issue works. An article meant to stay outside issues has no way round: publishing it again takes the same failing path. The editor can only write to the author by hand.

Medium: the article itself goes live, and the fault needs three things that are each uncommon: publishing without an issue (new on `main`), the member API, and a verified contributor. It would be high if journals that publish without issues became the usual case once this reaches a release, since they have no way round.

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

**Expected:** the window closes and the workflow page reads "Status: Published" with an "Unpublish" button. The ORCID deposit job for Diaga Diouf runs. On this dataset the job runner works on web requests and no ORCID server is reachable, so the job lands in `failed_jobs` as `PKP\jobs\orcid\DepositOrcidSubmission` with "cURL error 7: Failed to connect to api.sandbox.orcid.org". `ddiouf@mailinator.com` receives "Publication Published".

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

## Cause

`APP\orcid\OrcidWork::getAppDoiExternalIds()` (OJS `classes/orcid/OrcidWork.php`, line 68) reads the issue's DOI as `$this->issue->getData('doiObject')`. The class's constructor takes the issue as optional (`?Issue $issue = null`), and its sibling `getAppPubIdExternalIds()` reads it null-safely (`$this->issue?->getStoredPubId(...)`).

`APP\orcid\actions\SendSubmissionToOrcid::getOrcidWork()` builds the work with a null issue when the publication has none. It does so only when at least one contributor has an iD and a live token under the member API. `PKPOrcidWork::buildOrcidExternalIds()` calls `getAppDoiExternalIds()` only when the journal has DOIs turned on, so that is when the build throws.

The method was written when ORCID moved into the core (pkp-lib#9771), at a time when OJS refused to publish an article without an issue. `pkp/pkp-lib#9295` (continuous publication) first let an article publish without one in `ada320fd81`, and `d4aa47f268` dropped the issue check entirely. A later commit for the same issue, `e1efda5dd4` ("Do not assume an issue will be present in published content"), fixed another place that assumed an issue, but not this one.

The throw happens inside `Repo::publication()->publish()`, after the published status is saved and while the `PublicationPublished` event runs its listeners. The ORCID listener `PKP\observers\listeners\SendSubmissionToOrcid` throws, so the request answers 500 and the rest of the publish never runs:

- The contributors' deposit jobs and `depositReviewsForSubmission()` (on screen: no job).
- The event's listeners after this one. Laravel finds them by reading the listener directory, so their order follows the file system and differs between installs. On the walked install `ApplyDoneWorkflowStage` and `VersionDois` came before the ORCID listener and ran: the submission moved to Done. `NotifyAuthorOnPublication` ("Publication Published" and its notification) and `UpdateSubmissionInSearchIndex` came after it and did not run (on screen: no email, no notification). Where `VersionDois` comes after it, a journal with a DOI prefix also misses the DOIs it creates at publication (code).
- The end of OJS's `Repository::publish()`: `stampModified()` on the submission (its OAI datestamp) and `ArticleTombstoneManager::reconcileTombstonesOnPublish()` (code).

Reach:

- `PKP\orcid\actions\VerifyIdentityWithOrcid::depositOrcidItem()` calls the same `SendSubmissionToOrcid::execute()` when a contributor verifies an iD after the article is published. So verifying on a published article without an issue fails the same way (code, not driven).
- OPS's `OrcidWork` has no `getAppDoiExternalIds()` override, and OMP deposits nothing (code). OMP and OPS were seen publishing an item with a verified contributor without error.
- Nothing else under `classes/orcid`, `lib/pkp/classes/orcid` or the ORCID jobs reads the issue (code).

## Proposed fix

Read the issue's DOI null-safely in `APP\orcid\OrcidWork::getAppDoiExternalIds()`, as `getAppPubIdExternalIds()` beside it already does ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/fix.diff)):

```diff
-        $issueDoiObject = $this->issue->getData('doiObject');
+        $issueDoiObject = $this->issue?->getData('doiObject');
```

The constructor declares the issue optional, so the class itself should handle a missing one; this keeps every method of the class consistent with its own contract. An article without an issue then gets no "part-of" issue DOI, the same as an article in an issue that has no DOI, and keeps its own DOI or URL as its identifier. `OrcidWork` is built in one place, `SendSubmissionToOrcid::getOrcidWork()`, which both the publish listener and the later verification reach, so both are fixed. Tried: with it, the steps publish without an error, the window closes on "Status: Published", the deposit job runs and `ddiouf` receives "Publication Published". The back-issue publish behaves the same with and without it.

**Alternatives:**

- Skip the issue in `SendSubmissionToOrcid::getOrcidWork()` instead. That fixes today's one caller, but leaves a class whose constructor accepts no issue still unable to handle one.
- Catch failures in the ORCID listener so that a failing integration cannot stop a publish halfway. Worth doing as well, but on its own it would hide this fault and still lose the deposit.

**What goes with it:**

- A DB-backed test in OJS: `OrcidWork` builds its data in the constructor from the database, the request and the pubId plugins, so it needs a context with DOIs on and a publication without an issue. No test of the class exists today. Alternatively, an e2e scenario publishing an article without an issue with a verified contributor under the member API.
- Articles already published this way: the deposit is attempted only at publication and when a contributor verifies an iD. Once the fix is in, unpublishing and publishing such an article again deposits it and emails its author, from the code (that path was not walked). Nothing stored is wrong.

Small: one line in OJS, and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/walk.js) with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/lib.js). It takes the steps above, plus the back-issue control, on an install loaded from the default dataset.
- The SQL copies what `PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()` and `saveIdentityData()` (`Repo::author()->dao->update()`) write:
  - `author_settings` rows with locale `''`;
  - the iD as `OrcidManager::getOrcidUrl()` plus the iD (the sandbox host under "Member Sandbox");
  - `orcidIsVerified` as `1` (`DAO::convertToDB()` for a boolean);
  - the token, the member scope `/activities/update` (`OrcidManager::ORCID_API_SCOPE_MEMBER`) and the refresh token;
  - `orcidAccessExpiresOn` in `Carbon::toDateTimeString()`'s shape, set about 20 years ahead as ORCID grants.

  No ORCID server is reachable from the test install, and the fault fires before any outbound call.
- Walked on PostgreSQL with the default dataset (pkp/datasets e8dafbc, 2026-10-02), freshly loaded before each walk. The SQL was not run on MySQL; the fault itself does not depend on the database. The fix was tried with an earlier, PostgreSQL-only form of the same SQL that stored the same values (the expiry computed from now).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a); OJS `stable-3_5_0` 091fb65453 (lib/pkp cf3f984335); OJS `stable-3_4_0` 75cc2d488b (lib/pkp 32b0f4b4af); OJS `stable-3_3_0` ac77c9fb35 (lib/pkp f6ab331645).
- 3.5, walked: the same line 68 is there, but `validatePublish()` in `classes/publication/Repository.php` still requires an issue. "Schedule For Publication" on submission 5 opens "Select an issue to schedule for publication", which lists only the two issues.
- 3.4 and 3.3, code: ORCID is the `orcidProfile` plugin (there is no `classes/orcid/OrcidWork.php`), and `validatePublish()` refuses a publish without an issue with "publication.required.issue". It lives in `classes/publication/Repository.php` on 3.4 and `classes/services/PublicationService.inc.php` on 3.3.
- Introduced and Kind: `git blame` on `OrcidWork.php` line 68 gives d53d2fb9c3b (Erik Hanson, 2024-06-18, the move into the core), written while an issue was required.
  - `ada320fd81` is named because it is the first commit that let an article publish without an issue: it relaxed the `validatePublish()` check behind a setting, and `d4aa47f268` (2025-05-29) removed it.
  - Kind is defect rather than regression: publishing with a verified contributor into an issue worked before and still works, while publishing without an issue is a path no released line has.
  - `ada320fd81` is among the commits of `pkp/ojs#4875`.
- Not driven: a contributor verifying an iD on an article already published without an issue (`VerifyIdentityWithOrcid`); unpublishing and publishing again; a journal with no issues at all (seen failing the same way in the earlier probe behind the register entry).
