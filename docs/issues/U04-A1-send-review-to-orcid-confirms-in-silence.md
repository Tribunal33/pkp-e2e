# "Send Review To ORCID" gives editors no message, even on a press or journal that sends nothing

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no "Send Review To ORCID")
  - 3.3: none (code; no "Send Review To ORCID")
- **Introduced** `pkp/pkp-lib#10756` and `pkp/ui-library#473` for `pkp/pkp-lib#10744` · [4a4b7f6b0d](https://github.com/pkp/pkp-lib/commit/4a4b7f6b0d2b1ed7796a47ce90da9e8a647985fe), [48887248d0](https://github.com/pkp/ui-library/commit/48887248d0207a9cf2878f13715413ce6e9f2206) · 2024-12-31 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a1), its silent confirm (its offer before completion is [pkp-e2e#684](https://github.com/jardakotesovec/pkp-e2e/issues/684))
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who presses "Send Review To ORCID" on a completed review and
answers "OK" sees the question close, and nothing else: no message that
the review is on its way, and no message that it cannot be sent.

In several setups nothing is sent, so the editor believes the
reviewer's ORCID record now lists a review it never will.
A press does not send reviews to ORCID at all, by design, so there the
editor needs an answer rather than a send. A journal sends nothing when
its ORCID settings use the public API, or lack a City, or the journal
has no country in its settings. Only a journal on the member API with
a City and a country queues the review (or, for a reviewer who has not
yet given the journal that permission, first emails them a request for
it), also without a word to the editor.

It needs ORCID turned on and a reviewer who connected their iD through
ORCID's sign-in.

## Impact

- **Lost**: the review credit the editor meant to give, where the setup
  cannot send it, and nobody is told; the editor may tell the reviewer
  it was sent.
- **Who**: editors and managers of a press, or of a journal whose ORCID
  settings use the public API or lack a City or country, on the row of
  a reviewer with a connected iD, each time they press "Send Review To
  ORCID".
- **Way round**: none on screen. A manager can tell only by reading the
  ORCID settings and knowing which setups send reviews.

Medium: the editor's request looks done and is not, with no way to
tell on screen. Shown as a message, the same refusal would be low; the
silence raises it one level. It goes no higher because no stored work
is lost, and a journal that can send reviews also sends them on its
own when the editor marks a completed review as read ("Confirm") or
considered.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP is the same with the names given
  in brackets.
- ORCID is on: as `dbarnes`, Settings › Users & Roles › "ORCID", tick
  "Enable ORCID functionality", set "ORCID API" to "Public Sandbox"
  [OMP: "Member Sandbox", the setting under which a journal would send
  the review; a press sends nothing under either], Client
  ID `APP-TEST`, Client Secret `test-secret`, "Save".
- Julie Janssen (`jjanssen`) [OMP: Paul Hudson, `phudson`] has connected
  her [OMP: his] ORCID iD through ORCID's sign-in. ORCID's own service
  creates that state; on a test install without it, this SQL
  (PostgreSQL; MySQL not checked) writes what the app stores when the
  sign-in completes under the public API. On OMP put `'/activities/update'`
  (the member API's scope) in the scope row and `'phudson'` in the last
  line:

  ```sql
  insert into user_settings (user_id, locale, setting_name, setting_value)
  select u.user_id, '', s.name, s.value from users u, (values
    ('orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097'),
    ('orcidIsVerified', '1'),
    ('orcidAccessToken', 'an-access-token-from-orcid'),
    ('orcidAccessScope', '/authenticate'),
    ('orcidRefreshToken', 'a-refresh-token-from-orcid'),
    ('orcidAccessExpiresOn', '2046-10-03 12:00:00')
  ) as s(name, value) where u.username = 'jjanssen';
  ```

1. Sign in as `dbarnes` and open submission 13, "Hydrologic
   Connectivity in the Edwards Aquifer between San Marcos Springs and
   Barton Springs during 2009 Drought Conditions" [OMP: 12, "Connecting
   ICTs to Development"]. Julie Janssen's [OMP: Paul Hudson's] row in
   "Reviewers" reads "Reviewer Thanked" [OMP: "Review Submitted"]: the
   review is complete.
2. Open that row's "More Actions" and press "Send Review To ORCID".
3. The question "Send this review to the reviewer's ORCID?" opens;
   press "OK".

**Expected**: a message after "OK" saying what happened: here, that
nothing was sent and why (a press does not send reviews to ORCID; a
journal sends them only when its ORCID settings use the member API and
name a City, and the journal has a country); on a journal that can
send it, that the review is on its way.

**Observed**: the question closes and no message of any kind follows,
on the page or in a browser alert. The request behind "OK" answers 200
with an empty list:

```
POST /index.php/publicknowledge/api/v1/reviews/13/19/sendToOrcid   [OMP: reviews/12/13/sendToOrcid]
200 []
```

On the journal, "OK" queues `DepositOrcidReview` and the job runner
(`[queues] job_runner` On, as in the dataset's config) runs it within
the same request, where it returns at the member-API check, so nothing
is left to see in `jobs` or `failed_jobs`. With the runner Off, the job
waits in `jobs` until a worker runs it to the same end. On the press
nothing is queued.

Controls, on the journal with "ORCID API" set to "Member Sandbox" and
"City" filled:

- With `'/activities/update'` in the SQL for Julie Janssen, the same
  steps end in the same silence, and the review is queued
  (`DepositOrcidReview` in `jobs`).
- Run the SQL once more with `'/authenticate'` and `'amccrae'` in the
  last line (a reviewer who connected before the journal moved to the
  member API; Julie Janssen keeps her row), then take the steps on
  Aisla McCrae's row of the same submission: "OK" emails her
  "Requesting updated ORCID record access", again with no message to
  the editor.

## Cause

`PKPReviewController::sendToOrcid()` (lib/pkp
`api/v1/reviews/PKPReviewController.php`, lines 806–829) runs the app's
`SendReviewToOrcid::execute()` and answers `[]` with 200 whatever that
does. Nothing between the request and the deposit decides whether this
review can be sent, so the answer cannot say.

That decision is made later, in the background. On OJS, `execute()`
always queues `DepositOrcidReview` (behind `ReconcileOrcidReviewPutCode`
for a reviewer who still holds a user-level put code from an older
version). Its
`handle()` (OJS
`jobs/orcid/DepositOrcidReview.php`) then, with no word to anyone:

- returns when the review is not complete (line 50), ORCID is off for
  the journal (line 62), the member API is not in use (line 66), or the
  ORCID settings have no City (line 70);
- throws a `TypeError` when the City is set but the journal has no
  country, since `OrcidManager::getCountry()` is declared `: string`
  and returns the unset setting; the job lands in `failed_jobs`. The
  admin's journal form does not require a country (read in the code);
- marks itself failed when `[general] sandbox` is On (line 58), but
  `fail()` does not stop `handle()`: the checks below and the call to
  ORCID still run;
- fails on a disabled reviewer, whom line 74 does not load (the menu
  item is offered all the same, since the schema map loads disabled
  users);
- past those, returns when the reviewer has no iD or token, or a
  member-scope token that has expired (lines 76–84), and queues
  `SendUpdateScopeMail`, a permission request to the reviewer, when
  the token's scope is not the member one.

On OMP, `SendReviewToOrcid` is the empty `PKPSendReviewToOrcid::execute()`,
which sends nothing.

The client, `reviewerSendToOrcid()` in ui-library
`src/managers/ReviewerManager/useReviewerManagerActions.js` (lines
420–458), closes the question and shows something only when the
request fails; a success shows nothing.

Reach: the other callers of `SendReviewToOrcid` send without being
asked (`PKPReviewerGridHandler::reviewRead()`,
`ReviewAssignmentController::markReviewConsidered()`,
`PKPSendSubmissionToOrcid::depositReviewsForSubmission()`,
`VerifyIdentityWithOrcid`), so they owe the editor no answer; this
endpoint is the only on-request send.

## Proposed fix

Decide on the server, before queuing, whether the review can be sent,
answer with the reason when it cannot, and show the answer either way
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/send-review-to-orcid-confirms-in-silence/fix-ojs.diff);
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/send-review-to-orcid-confirms-in-silence/fix-omp.diff)
is fix-ojs.diff without its three OJS files, `SendReviewToOrcid`,
`DepositOrcidReview` and `locale/en/locale.po`):

- lib/pkp `OrcidManager::canDepositReviews(Context)` holds the
  journal's conditions in one place: ORCID on, a member API, a City and
  a country. `DepositOrcidReview::handle()` calls it in place of its
  three checks, so the job still checks at run time, and the two cannot
  drift. `getCountry()` returns `''` for an unset country, which ends
  the `TypeError`: such a journal is now told why nothing is sent. Its
  one other caller, `OrcidReview::toArray()`, runs only after that
  check has passed.
- lib/pkp `PKPSendReviewToOrcid` gains `getUnavailableReason(): ?string`.
  The base answers "Nothing was sent. Reviews are not sent to ORCID
  records from here.", so a press and a preprint server say so with no
  code of their own.
- OJS `SendReviewToOrcid` overrides it: a review not complete, a
  journal with ORCID off, a journal that fails `canDepositReviews()`,
  and a reviewer who is disabled, has no token or holds an expired
  member-scope token each get their own reason. It loads the reviewer
  as the job does, without disabled users, so a disabled reviewer is
  refused rather than told "queued" for a job that would fail; sending
  credit for a disabled account is not something the job was built to
  do. The reviewer checks repeat lines 74–84 of `handle()`, since the
  job answers those states differently (nothing, or a permission
  request). A refusal also skips `ReconcileOrcidReviewPutCode`, which
  then runs on the next send that is allowed.
- `PKPReviewController::sendToOrcid()` answers 422 with the reason, as
  `requestAuthorResponse()` in the same controller refuses a valid
  request the current state does not allow, and queues the job
  otherwise:

  ```php
  $sendReview = new SendReviewToOrcid($reviewAssignment->getId());
  if ($reason = $sendReview->getUnavailableReason()) {
      return response()->json(['error' => $reason], Response::HTTP_UNPROCESSABLE_ENTITY);
  }
  $sendReview->execute();
  ```

- ui-library `reviewerSendToOrcid()` asks `useFetch` for
  `expectValidationError` and, through `useNotify` as
  `useReviewDetails.js` in the same folder does, shows the server's
  reason as a warning, or this as a success: "The review has been
  queued for the reviewer's ORCID record. If the reviewer has not yet
  allowed this journal to add it, they are emailed a request first."
- Six keys (`orcid.review.send.*`): the base's refusal in lib/pkp
  `locale/en/user.po`; the five only OJS reaches, which speak of a
  journal, in OJS `locale/en/locale.po`.

With `[general] sandbox` On, the job behaves as before after the
success message (marked failed, and still run on); the fix leaves
sandbox mode alone.

Tried on `main`, on the journal and the press, with the JavaScript
rebuilt. With the diffs applied, "OK" in step 3 answered 422 and
showed "Nothing was sent. Reviews are sent to ORCID only when the
ORCID settings use a member API and name a city, and the journal has a
country." [OMP: "Nothing was sent. Reviews are not sent to ORCID
records from here."], and nothing was queued. In both controls "OK"
showed the success message above and did what it did with the fix out:
the member-scope reviewer's deposit was queued, and the public-scope
reviewer was emailed the permission request. The refusals for ORCID
off, a disabled reviewer and a missing or expired token were read in
the code, not walked.

How this was settled:

- **Where the rule lives.** Only OJS sends reviews, so the app's action
  class answers whether this review can be sent. The new method sits
  beside `execute()`, which the base already asks apps to override.
- **What it touches.** The endpoint now answers 422 where it answered
  200 and did nothing. A subclass that overrides `execute()` without
  the new method is refused by the base default: a change to the
  contract plugins and other apps rely on, harmless in the PKP apps
  (only OJS sends reviews) but worth a line in the release notes. No
  stored data or hook changes. On 3.5 the lib/pkp and OJS hunks apply
  as written; the ui-library hunk needs a one-line rebase, since 3.5's
  `useReviewerManagerActions.js` lacks the `ReviewDetailsModal` import
  its context names.
- **The test.** A pkp-lib API test of `sendToOrcid` on a press, on a
  public-API journal and on a member-API journal, and a unit test of
  `canDepositReviews()`.

**Alternatives**

- Hide the menu item where nothing can be sent: the schema map adds a
  flag beside `reviewerHasOrcid` and the menu reads it (pkp-e2e#684's
  alternative). It ends the press and public-API offers but leaves the
  member-API journal's silent confirm; it goes well with this fix.
- A success message in ui-library alone: tells the press's editor that
  a review was queued that never will be.
- Write the reason to the ORCID log in the job: nobody reads it from
  the workflow.

**What goes with it**: the translations of the six keys; nothing is
stored wrong, so no repair.

Medium: three repositories (pkp-lib, OJS, ui-library), a refusal
default that changes the action class's contract, and six locale keys,
tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/send-review-to-orcid-confirms-in-silence/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/send-review-to-orcid-confirms-in-silence/walk.js)
  (helpers in its `lib.js` and in
  [`../reviewer-response-erases-reminder-history/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-response-erases-reminder-history/lib.js))
  takes the preconditions and Steps on a journal and a press loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/send-review-to-orcid-confirms-in-silence/walk.js`;
  with `WALK_MODE=neighbour` it takes the two controls on the journal.
  After each "OK" it reads the queue three times: at once, after one
  more page load, and after a second one 8 s later (past the job's 5 s
  retry delay), and Mailpit for mail to the reviewer.
- The SQL precondition writes what `AuthorizeUserData::getOrcidOAuthAccessData()`
  (lib/pkp `classes/orcid/actions/AuthorizeUserData.php`) builds and
  `HasOrcid::setVerifiedOrcidOAuthData()` stores for a signed-in user;
  the scope is the one `OrcidManager` asks for under each API
  (`ORCID_API_SCOPE_PUBLIC`, `ORCID_API_SCOPE_MEMBER`). The token
  strings stand in for ORCID's. The dataset journal's and press's
  country is `IS`, so the `TypeError` for an unset country was read in
  the code, not walked.
- `fix-<app>.diff` paths start at the app root (`a/lib/pkp/…`,
  `a/lib/ui-library/…`, `a/classes/…`). The trial: `node bin/try-fix.js
  apply <dir>/fix-ojs.diff ojs` and `… fix-omp.diff omp` (which rebuild
  the JavaScript), then the walk on both apps and `WALK_MODE=neighbour`
  on OJS, with the fix in and out; `revert` with the same arguments.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, PostgreSQL, the
  default datasets of pkp/datasets c312c01 (2026-10-03). The browser
  showed no alert, notice or script error, and no request failed. On
  3.5 the controller (lines 751–775) and `reviewerSendToOrcid()` are
  the same.
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d6736318), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c570); 3.5 OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
  (lib/pkp cf3f984335), lib/ui-library d4e0188353; 3.4 OJS d68934d0d1,
  OMP 0aec65441f (lib/pkp 767353f4fe); 3.3 OJS ac77c9fb35, OMP
  8e72fc8836 (lib/pkp ac3fa73402).
- 3.4 and 3.3 (code): lib/pkp has no `sendToOrcid` or
  `SendReviewToOrcid`; the ORCID Profile plugin on OJS
  (`plugins/generic/orcidProfile` at 894c2593e0 and 41864d3770) sends a
  review only from `handleThankReviewer()` when the editor thanks the
  reviewer, with no menu entry; OMP ships no such plugin there.
- Introduced: `git log -S'sendToOrcid'` in lib/pkp gives 4a4b7f6b0d (the
  endpoint, `pkp/pkp-lib#10756`), and in lib/ui-library 48887248d0 (the
  menu entry and `reviewerSendToOrcid()`); `git blame` on both shows
  the answer and the client's handling unchanged since (6421d4625 and
  4fe5e33e5 only reshaped the function's signature and its URL helper).
- Not driven: a deposit reaching ORCID (its service is unreachable from
  the test installs); a journal with ORCID off, without a City or
  without a country; a reviewer with an expired token; an install with
  `[general] sandbox` On; a disabled reviewer (all read in the code).
