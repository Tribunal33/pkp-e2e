# A review sent to ORCID by a journal with no country fails in the background instead of being skipped

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; the ORCID Profile plugin skips a review when its own "Country" is empty)
  - 3.3: none (code; the same plugin check)
- **Introduced** `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · committed 2023-10-06, merged 2024-06-21 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U04 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#ojs1)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor on a journal with no country presses "Send Review To ORCID"
on a completed review and answers "OK". The question closes with no
message, as it always does. The journal uses ORCID's member API and has
a City in its ORCID settings.

The deposit then runs as a background job, and the server fails it with
a type error. Without a City the same job ends quietly, and the design
means a review to be skipped the same way when the country is missing.
The editor sees nothing different, but the site administrator's
Administration › "View Failed Jobs" gains an entry for every review the
journal tries to send, and its error does not say that a country is
missing.

A journal upgraded from 3.3 has no country until its "Masthead" is
saved. Among those, one that sent reviews to ORCID through the ORCID
Profile plugin keeps the plugin's City through the upgrade, which drops
the plugin's Country, so its first review sent afterwards fails this
way.

## Impact

- **Lost**: no deposit the journal's settings allow. The failed entries pile
  up in "View Failed Jobs", one per review sent, with an error that
  hides the reason.
- **Who**: OJS journals on the member API with a City and no country,
  each time a completed review is sent to ORCID: by the editor's
  button, when the editor confirms a submitted review or marks it
  considered, and when the article is published.
- **Way round**: pick a country on Settings › Journal › "Masthead".
  Reviews sent after that go out. Those whose job already failed are not
  sent again on their own: each needs "Send Review To ORCID" again, or
  "Try Again" on its failed entry (read in the code). Other jobs in the
  queue carry on past the failed one (walked).

Low: the editor and the reviewer get what the design intends without a
country, and only the failed-jobs list shows the difference. It would be
medium if a failed entry stopped other work in the queue, which it does
not.

## Steps to reproduce

Preconditions:

- A journal with no country. The way a journal gets there: PKP's
  default test dataset for OJS `stable-3_3_0`, upgraded to `main`. Load
  it, delete the dump's usage log
  (`files/usageStats/usageEventLogs/usage_events_*.log`, which the 3.4
  upgrade check refuses), and run `php tools/upgrade.php upgrade`. Its
  journal, "Journal of Public Knowledge" (`publicknowledge`), then has
  no country, and Settings › Journal › "Masthead" shows "Country"
  empty. No screen saves a journal without a country.

  The shortcut to the same state, on PKP's default test dataset for
  `main`, deletes the journal's one `country` setting:

  ```sql
  delete from journal_settings where setting_name = 'country'
    and journal_id = (select journal_id from journals where path = 'publicknowledge');
  ```

- ORCID is on: as `dbarnes`, Settings › Users & Roles › "ORCID", tick
  "Enable ORCID functionality", set "ORCID API" to "Member Sandbox",
  Client ID `APP-TEST`, Client Secret `test-secret`, "City" `Burnaby`,
  "Save".
- Julie Janssen (`jjanssen`) holds a verified ORCID iD, which only
  ORCID's sign-in creates. The row's "Send Review To ORCID" needs that
  alone, and the job fails before it reads anything else of the
  reviewer. On a test install, this SQL writes the two settings the
  sign-in stores (the upgraded dataset already has an empty `orcid` row
  for her, which the delete clears):

  ```sql
  delete from user_settings where locale = '' and setting_name in ('orcid', 'orcidIsVerified')
    and user_id = (select user_id from users where username = 'jjanssen');
  insert into user_settings (user_id, locale, setting_name, setting_value)
    select user_id, '', 'orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097' from users where username = 'jjanssen';
  insert into user_settings (user_id, locale, setting_name, setting_value)
    select user_id, '', 'orcidIsVerified', '1' from users where username = 'jjanssen';
  ```

1. Sign in as `dbarnes` and open submission 13, "Hydrologic
   Connectivity in the Edwards Aquifer between San Marcos Springs and
   Barton Springs during 2009 Drought Conditions". Julie Janssen's row
   in "Reviewers" reads "Review Submitted" ["Reviewer Thanked" on the
   `main` dataset]: her review is complete.
2. Open that row's "More Actions" and press "Send Review To ORCID".
3. The question "Send this review to the reviewer's ORCID?" opens;
   press "OK".
4. Open the dashboard twice, a few seconds apart. The dataset's
   configuration runs queued jobs at the end of each request
   (`[queues] job_runner`).
5. Sign in as `admin` and open Administration › "View Failed Jobs".

**Expected**: the review is skipped, as it is when the City is empty:
nothing is sent to ORCID and nothing fails, so "View Failed Jobs" lists
no entry.

**Observed**: "OK" closes the question with no message; the request
behind it answers `200 []`:

```
POST /index.php/publicknowledge/api/v1/reviews/13/19/sendToOrcid
200 []
```

After the page loads, "View Failed Jobs" lists one entry,
`APP\jobs\orcid\DepositOrcidReview`, and its "Details" › "Exception"
reads `PKP\orcid\OrcidManager::getCountry(): Return value must be of
type string, null returned`. The server log has:

```
TypeError: PKP\orcid\OrcidManager::getCountry(): Return value must be of type string, null returned in …/lib/pkp/classes/orcid/OrcidManager.php:222
#0 …/jobs/orcid/DepositOrcidReview.php(70): PKP\orcid\OrcidManager::getCountry()
```

No request the editor's browser sends fails; the server error is the
background job's.

Control: on the same journal, empty "City" on the ORCID tab, "Save",
and take steps 2 to 5 again. "OK" answers the same, the job runs and
ends, and no new entry appears in "View Failed Jobs".

## Cause

`OrcidManager::getCountry()` (lib/pkp `classes/orcid/OrcidManager.php`,
lines 217–223) is declared to return `string` and returns
`$context->getData('country')`, which is `null` for a journal that has
no country. PHP then throws a `TypeError` instead of returning. Its
neighbour `getCity()`, written in the same commit, returns
`$context->getData(self::CITY) ?? ''`.

`DepositOrcidReview::handle()` (OJS `jobs/orcid/DepositOrcidReview.php`,
line 70) asks for the country in the very check that is meant to skip a
journal without one:

```php
if (!OrcidManager::getCity($context) || !OrcidManager::getCountry($context)) {
    return;
}
```

With a City set, `getCountry()` is reached and throws, so the job fails
and lands in `failed_jobs`, where Administration › "View Failed Jobs"
shows it.

The line came with `pkp/pkp-lib#9818`, which moved ORCID from the ORCID
Profile plugin into the core application. The plugin read the country
from its own settings form with an untyped `getSetting()`, which
returned `null` and skipped the review; the core version reads the
journal's own country through a typed getter. The same mismatch in
`getApiType()` was fixed in `pkp/pkp-lib#12058` with the same `?? ''`.

Reach:

- Every path that sends a review goes through this job: the editor's
  "Send Review To ORCID" (`PKPReviewController::sendToOrcid()`), the
  editor's "Confirm" of a submitted review (`PKPReviewerGridHandler::reviewRead()`),
  marking a review considered (`ReviewAssignmentController::markReviewConsidered()`),
  publishing (`PKPSendSubmissionToOrcid::depositReviewsForSubmission()`),
  and a reviewer verifying their iD (`VerifyIdentityWithOrcid`). Walked:
  the button; the others read in the code.
- `OrcidReview::build()` (OJS `classes/orcid/OrcidReview.php`, line 93,
  run by the constructor) is the only other caller of `getCountry()`.
  The job builds an `OrcidReview` only after the check above has passed
  (code).
- OMP and OPS send no reviews and do not call `getCountry()` (code).
- Which journals have no country. The field came with 3.4. After the
  3.3 dataset was upgraded to `main` and to 3.5, its journal had no
  `country` setting (walked), so a journal upgraded from 3.3 lacks one
  until "Masthead" is saved. The upgrade `I9771_OrcidMigration` (lib/pkp
  `classes/migration/upgrade/v3_5_0/`) copies the ORCID Profile plugin's
  City into `orcidCity` but not the plugin's Country, which it leaves
  behind. So a 3.3 journal that sent reviews through the plugin, which
  needed both, lands in exactly this state after the upgrade (read in
  the code). A journal created through the REST API without `country`
  is the other way
  ([U59 A1's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U59-A1-journal-form-country-unmarked-refused.md)).
- A failed entry stays in `failed_jobs` until someone presses "Try
  Again" or "Requeue All Failed Jobs", which re-adds the same job
  (`FailedJob::redispatchToQueue()`); it then reads the journal's
  settings afresh (code). Nothing requeues it when a country is saved.
- The other getters declared `string` in `OrcidManager` fall back to
  `''` or a default. The exceptions are `getClientId()` and
  `getClientSecret()` under the site-wide configuration, whose form
  requires both values (code); this fix does not touch them.

## Proposed fix

Give `getCountry()` the fallback `getCity()` already has
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-review-no-country-fails-in-background/fix.diff)):

```diff
--- a/lib/pkp/classes/orcid/OrcidManager.php
+++ b/lib/pkp/classes/orcid/OrcidManager.php
@@ -219,7 +219,7 @@
         if ($context === null) {
             $context = Application::get()->getRequest()->getContext();
         }
-        return $context->getData('country');
+        return $context->getData('country') ?? '';
     }
```

`DepositOrcidReview::handle()`'s check then sees an empty country and
returns, as it does for an empty City, so the job ends without
contacting ORCID and without failing. Fixing the getter covers both of
its callers. The intent of `pkp/pkp-lib#9818` (use the journal's own
country) is kept.

Tried on `main`. With the diff applied, steps 1 to 5 showed the
Expected: the job ran and ended, and "View Failed Jobs" read "No
Items". With a country set (on "Masthead", "Canada"), the fix changes
nothing: with the diff and without it, the deposit went on to ORCID at
`https://api.sandbox.orcid.org/v3.0/0000-0002-1825-0097/peer-review`.
That check needs the reviewer's full member-API authorization: to the
SQL above it adds `orcidAccessToken`, `orcidAccessScope`
`/activities/update`, `orcidRefreshToken` and an `orcidAccessExpiresOn`
in the future. The request then failed only because the test install
cannot reach ORCID.

**Alternatives**

- Declare the return `?string`: the job's check works the same, but
  `OrcidReview::build()` and any plugin calling the getter must then
  handle `null`; the empty string is what the other getters return.
- Guard in `DepositOrcidReview` alone: covers this job but leaves the
  getter throwing for the next caller.
- Copy the plugin's old Country into the journal's `country` in
  `I9771_OrcidMigration` when the journal has none: repairs the
  upgraded journals that had one, so their reviews are sent rather than
  skipped. It is a separate change, worth making beside this one, and
  does not cover a journal that never had a country.

**What goes with it**: nothing is stored wrong, so no repair; failed
entries already listed can be deleted from "View Failed Jobs", or
requeued with "Try Again" once a country is set. The diff applies as it
stands to 3.5. Tests to land with it: a pkp-lib unit test of
`getCountry()` for a context without a country, and an OJS job test of
`DepositOrcidReview` with a City and no country that expects no
failure. The fix proposed in
[pkp-e2e#736](https://github.com/jardakotesovec/pkp-e2e/issues/736)
("Send Review To ORCID" gives editors no message) carries the same
line, so whichever lands first covers this one.

Small: one line in the shared class, and a unit test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-review-no-country-fails-in-background/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-review-no-country-fails-in-background/walk.js).
  It takes the preconditions, Steps and Control on the upgraded 3.3
  dataset; with `WALK_ROUTE=shortcut`, on the `main` dataset with the
  `country` row deleted; with `WALK_MODE=neighbour`, the check with
  "Canada" picked on "Masthead" and the full authorization. The header
  comment gives the commands.
- The ORCID SQL writes what `HasOrcid::setVerifiedOrcidOAuthData()`
  stores from `AuthorizeUserData::getOrcidOAuthAccessData()` (lib/pkp
  `classes/orcid/actions/AuthorizeUserData.php`); the token strings
  stand in for ORCID's. The menu entry reads `reviewerHasOrcid`, which
  is `orcidIsVerified` (lib/pkp `classes/submission/maps/Schema.php`
  line 699).
- How the walks differed from the text: on the upgraded dataset
  (`main` and 3.5) the walk wrote the full authorization, the six rows
  the "Canada" check names; the shortcut walk on the `main` dataset
  wrote only the two rows above. The outcome was the same on all three.
- Walked on `main` and `stable-3_5_0`, OJS, PostgreSQL, pkp/datasets
  eaf024c5 (2026-10-18): the `stable-3_3_0` dataset upgraded by the
  app's own `tools/upgrade.php` (3.3.0.23 to 3.6.0.0 on `main`, to
  3.5.0.5 on 3.5), and the shortcut on the `main` dataset. On 3.5 the
  getter is at lines 216–222 and the job's check at line 70, the same
  code. That other jobs carry on: in the Control, the second job ran
  and ended with the first still failed. MySQL not checked.
- Branch tips: main OJS 6b4323ced7 (lib/pkp 042726ebf6); 3.5 OJS
  007c2cd0d6 (lib/pkp 092ec34b0f); 3.4 OJS 0012bd1022 (lib/pkp
  a71d6bd2ca, ORCID Profile plugin 894c2593e0); 3.3 OJS d7d9dd14ec
  (lib/pkp 5e84acd11b, plugin 41864d3770).
- 3.4 and 3.3 (code): lib/pkp has no `OrcidManager`; the ORCID Profile
  plugin sends a review only when `getSetting($contextId, 'country')`
  and `getSetting($contextId, 'city')` are both set
  (`OrcidProfilePlugin.php` line 341 at 894c2593e0,
  `OrcidProfilePlugin.inc.php` line 158 at 41864d3770), so an empty
  country skips it.
- `pkp/pkp-lib#10856` and `pkp/pkp-lib#12058` fixed other unset ORCID
  settings (guards in the actions, then `getApiType()`) and left
  `getCountry()` as it was.
- Unverified: "Try Again" on a failed entry after a country is saved
  (read in the code, not pressed); a deposit reaching ORCID, which the
  test installs cannot reach.
