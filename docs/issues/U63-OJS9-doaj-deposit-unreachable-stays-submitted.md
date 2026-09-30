# A DOAJ "Register" that cannot reach DOAJ leaves the article reading "Submitted" for good, never "Failed"

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#4985` for `pkp/pkp-lib#11593` · [34a2dc86b9](https://github.com/pkp/ojs/commit/34a2dc86b965d3c3037ceb21d1a2e2e974d5713b) · 2025-06-30 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs9)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal manager presses "Register" in the DOAJ Export Plugin while OJS
cannot reach DOAJ. The notice says "Articles submitted successfully" and
the article reads "Submitted". The deposit then fails in the background,
but the article keeps reading "Submitted" for good, and the status
filter's "Error" finds nothing.

Only a site administrator can see the failure, under Administration ›
"View Failed Jobs". The daily automatic deposit never sends a
"Submitted" article again, so the article stays out of DOAJ until
someone presses "Register" again. In 3.5 the same press showed "Deposit
was not successful!" at once.

It happens whenever DOAJ's API cannot be reached: DOAJ is down, its name
does not resolve, or the server has no outbound access. The journal
needs "DOAJ Plugin" on and a DOAJ API key saved. When DOAJ does answer,
with an error (a wrong key, a rejected record), the article reads
"Failed" as it should.

## Impact

- **Lost:** the article never gets into DOAJ, and no one is told. The
  list shows a deposit still under way.
- **Who:** managers of journals that deposit to DOAJ, by hand or with
  the daily automatic deposit. The deposit runs as a background job
  seconds after "Register"; it is lost when DOAJ cannot be reached at
  that moment.
- **Way round:** press "Register" again once DOAJ can be reached, or a
  site administrator presses "Try Again" on the failed job; a retry that
  reaches DOAJ moves the article to "Registered". Both need someone to
  know the deposit failed, and "Submitted" articles pile up with each
  outage.

Medium: the articles deposited during an outage silently stay out of
DOAJ, and pressing "Register" again repairs them. A server with no
outbound access fails every deposit, a lasting setup rather than an
outage, but it could not deposit to DOAJ in 3.5 either; what it loses is
the error message. It would be high if deposits failed this way on most
installations.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (`publicknowledge`, "Journal of
  Public Knowledge"; "DOAJ Plugin" is on there, with no API key saved).
  Its config runs queued jobs at the end of each web request
  (`job_runner = On`).
- OJS cannot reach doaj.org. On a test install, set `http_proxy` and
  `https_proxy` under `[proxy]` in `config.inc.php` to an address where
  nothing answers (`"http://127.0.0.1:9"`).

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Side menu "Tools"; on "Import/Export", press "DOAJ Export Plugin".
3. On "Settings", type any key (`u63ojs9-key`) in "DOAJ API Key" and
   press "Save".
4. Reload the page and open the "Articles" tab. "Register", "Export" and
   "Mark registered" sit under the list, and "Mwandenga et al.; The
   Signalling Theory Dividends" reads "Not Deposited".
5. Tick "The Signalling Theory Dividends" and press "Register".
6. Wait ten seconds and reload the page; wait ten seconds and reload it
   again; open "Articles". The deposit is tried at the end of the
   "Register" request and again at each page load at least 5 seconds
   after the last try, and the third failed try ends it.
7. Press the "Search" toggle above the list, choose "Error" in the status
   list ("Any Status"), and press the form's own "Search" button.
8. Sign out, sign in as `admin` and open Administration › "View Failed
   Jobs".

**Expected:** after step 6, "The Signalling Theory Dividends" reads
"Failed", a link that opens a window headed "Error" with the reason
(`cURL error 7: Failed to connect to doaj.org port 443 …`). "Failed" in
the row and "Error" in the filter and the window are one state. Step 7
lists the article.

**Observed:** step 5 returns to the tab with the notice "Articles
submitted successfully" and the row reading "Submitted". After step 6,
when the job has failed, the row still reads "Submitted", as plain text.
Step 7 lists "No Items". Step 8 reads "There's a total of 1 failed
job(s)." and lists `APP\plugins\generic\doaj\jobs\DOAJRegister`. The
failed job's exception begins:

```
cURL error 7: Failed to connect to doaj.org port 443 via 127.0.0.1 after 0 ms: Could not connect to server
```

On `stable-3_5_0` the same steps show the error at once. Step 5 returns
with the notice "Deposit was not successful! The DOAJ API returned an
error: 'cURL error 7: Failed to connect to doaj.org port 443 …'", and
the row keeps reading "Not Deposited". No job is queued, and the list's
status filter has no "Error" status.

## Cause

`DOAJExportPlugin::depositXML()` (`plugins/generic/doaj/DOAJExportPlugin.php`)
queues a `DOAJRegister` job (or a `DOAJDelete` job, which queues
`DOAJRegister` in turn), then sets the article's DOAJ status to
`submitted`. The job calls `registerObject()` (or `deleteObject()`),
which sends the request to DOAJ through Guzzle. That method is meant to
replace `submitted` with `registered` on success, or with `error` and
the reason on failure.

Both methods catch only `\GuzzleHttp\Exception\RequestException` (lines
178 and 225). In Guzzle 7 a request that never gets an answer
(connection refused, name not resolved, connection timed out) throws
`ConnectException`, a sibling of `RequestException` under
`TransferException`, not a subclass. So the exception leaves the method
before any status is written, and `DOAJRegister::handle()` does not
catch it either. The queue retries the job three times and moves it to
the failed jobs, and the status stays `submitted`. Nothing else writes
it again.

A DOAJ error answer (4xx or 5xx) is a `RequestException` with a
response. The catch writes `error` with DOAJ's body and status code, so
the row reads "Failed" and its window shows DOAJ's answer (read in the
code). A later run of the job that reaches DOAJ, such as a "Try Again",
writes `registered`: `DOAJRegister::handle()` skips only an object that
is already registered (read in the code).

Before 34a2dc86b9, `depositXML()` sent the request in the "Register"
request itself and caught `\Exception`, so every failure came back on
screen. That change moved the deposit into jobs, for
`pkp/pkp-lib#11593` (register each JAV version with DOAJ, delete and
re-register when an article's DOI or URL changes). It also narrowed the
catch to `RequestException`.

Two more gaps sit in the same path, read in the code:

- **Order.** `depositXML()` calls `dispatch()` first and writes
  `submitted` second (lines 297-298 and 302-303). The web job runner
  runs the job at the end of the request, after that write. A worker
  daemon (`jobs.php work`), which the config template recommends for
  busy sites, can run it in between. A refused connection fails in
  milliseconds, so the job's `error` (or `registered`) would then be
  overwritten with `submitted`, whatever the catch does.
- **Timeouts.** `PKPApplication::getHttpClient()` sets no `timeout` or
  `connect_timeout`. Guzzle's curl handler then waits 300 s for a
  connection and without limit for an answer. When DOAJ's packets are
  dropped rather than refused, the request hangs until the network gives
  up. The worker daemon arms the job's 60 s `$timeout`
  (`Worker::registerTimeoutHandler()`) and kills the job before that,
  so no catch runs. The web job runner (`PKPQueueProvider::runJobInQueue()`
  through Laravel's `Worker::runNextJob()`) does not arm the 60 s limit
  at all, so the hang ties up the PHP process at the end of someone's
  page load. `ExternalServicesHelper` states the same rule: "a job's
  requests must all finish inside its $timeout".

Reach:

- "Register" on the "Articles" tab: walked.
- "Register" on the "Publications" tab (with "DOI Versioning" on): the
  same `depositXML()` and `registerObject()` (read in the code).
- A re-deposit after the DOI or URL changed: `DOAJDelete` calls
  `deleteObject()`, which has the same catch (read in the code).
- The daily automatic deposit: `DOAJInfoSender::_registerObjects()`
  calls the same `depositXML()` (read in the code). It selects through
  `PubObjectsExportPlugin::getAllDepositableArticles()` and
  `getAllDepositablePublications()`, which take only articles with no
  status or `stale` ("Needs Sync"). So it never sends a `submitted`
  article again. It does not send an `error` one again either, though
  both methods' docblocks say "not yet registered, stale, or with status
  error".
- The same catch elsewhere, read in the code and not walked:
  `DataciteExportPlugin::depositXML()` (pkp/ojs, catches at lines 307
  and 326) and `CrossrefExportPlugin::depositXML()` (`pkp/crossref-ojs`,
  used by OJS and OPS, catch at line 344) catch only `RequestException`.
  Their deposits run in `DepositSubmission` jobs after
  `Repo::doi()->markSubmitted()`, so a DOI whose deposit cannot connect
  stays "Submitted" in the same way. Crossref's catch also writes the
  error status only inside `hasResponse()`. Crossref has a second
  `RequestException` catch in `getStatusMessage()` (line 146), where a
  connection failure escapes the request that shows a deposit's status.

## Proposed fix

A proposal, tried on `main` ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/fix.diff)).
Recommended, all in the DOAJ plugin:

1. In `registerObject()` and `deleteObject()`, catch every Guzzle
   transfer failure, and read the response only when there is one:

   ```diff
   -        } catch (\GuzzleHttp\Exception\RequestException $e) {
   +        } catch (GuzzleException $e) {
   +            // Any transfer failure, a connection DOAJ never answered included, fails the deposit.
                $returnMessage = $e->getMessage();
   -            if ($e->hasResponse()) {
   +            if ($e instanceof RequestException && $e->hasResponse()) {
   ```

2. Give both DOAJ requests `'timeout' => 20` and
   `'connect_timeout' => 10` (class constants), the values
   `ExternalServicesHelper::apiRequest()` uses. Every failure then
   reaches the catch well inside the job's 60 s, on the web runner and
   on the daemon.
3. In `depositXML()`, write `submitted` before `dispatch()`, in both
   branches, so the job's own status is never overwritten.
4. A `failed()` method on `DOAJRegister` and `DOAJDelete`, as
   `CitationLookupJob::failed()` does. It calls a new
   `DOAJExportPlugin::failSubmittedDeposit()`, which writes `error` with
   the job's exception only while the status still reads `submitted`.
   It covers what no catch sees, such as a job the daemon stops at its
   time limit, and leaves alone the reason a catch already wrote.

The status is owned by `registerObject()` and `deleteObject()`, which
already write `error` and DOAJ's answer when DOAJ answers with an error.
Parts 1 and 2 let a connection failure take the same path; parts 3 and 4
make sure nothing leaves `submitted` behind. The job still throws its
`JobException`, so the failed job stays in "View Failed Jobs", and the
retries and the delete-then-register order of `pkp/pkp-lib#11593` are
kept. Catching `GuzzleException` follows `VerifyIdentityWithOrcid` and
`PKPRorController`.

Tried on OJS, with OJS still unable to reach DOAJ. With the fix the row
read "Failed" as soon as step 5 returned (the first try runs at the end
of the "Register" request), its link opened the "Error" window with the
cURL error, and the "Error" status listed that article alone. After the
third try "View Failed Jobs" listed the job and the row kept the cURL
reason, so `failed()` left the catch's status alone. The journal's other
published article, never ticked, kept "Not Deposited".

**Alternatives:**

- Part 1 alone: a dropped connection, or a job the daemon stops, still
  leaves the article "Submitted".
- `failed()` alone: it covers every ending, but only after the third
  try, and it records the job's exception rather than DOAJ's answer.
- Catch `\Exception`, as 3.5 did: it would also report a programming
  error as a DOAJ failure.

**What goes with it:**

- Data: articles this fault left `submitted` stay that way. The manager
  ticks them and presses "Register" again.
- DataCite and Crossref, not in this diff and not tried:
  `DataciteExportPlugin` needs only the wider catch, since both its
  catches write the error status outside `hasResponse()`.
  `CrossrefExportPlugin::depositXML()` needs the wider catch and an
  error write when there is no response, and `getStatusMessage()` the
  wider catch.
- Guard: an OJS unit test that overrides `PKPTestCase::mockGuzzleClient()`
  (which answers every request with an empty `Response`) so that
  `request()` throws `new ConnectException(...)`, calls
  `registerObject()`, and expects the error result and the `error`
  status; and one that `failSubmittedDeposit()` leaves an `error` status
  alone.

Medium: four changes across three files of one plugin (the wider catch,
the request timeouts, the status written before the dispatch and a
`failed()` backstop on both jobs), each following a pattern the code base
already has, and a unit test; several files and a change to when the
status is written put it above a small fix.

## Evidence

- Kept script, which takes the Steps on OJS through the screens on a
  fresh load of the default dataset, and as a control reads the status
  of "Antimicrobial, heavy metal resistance …" (submission 17, never
  ticked):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js),
  run with
  `PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63ojs9 node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front). Beside the
  screens it reads the `jobs` and `failed_jobs` rows and the article's
  `doaj::status`: `submitted` throughout without the fix, `error` from
  step 5 on with it.
- The fix, tried 2026-09-30 on the main tips below with
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/trial.sh):
  `node bin/try-fix.js apply <fix.diff> ojs`, the walk, then
  `node bin/try-fix.js revert ojs`.
- Timeouts, checked outside OJS with the Guzzle vendored in
  `lib/pkp/lib/vendor` and a proxy address that drops packets
  (`10.255.255.1`): with `connect_timeout` 10 the request ended after
  10.0 s with `ConnectException` ("cURL error 28: Connection timed out
  after 10002 milliseconds"); without it, after 135.5 s. Laravel's
  `Worker.php` in the same vendor folder: `daemon()` calls
  `registerTimeoutHandler()`, `runNextJob()` does not.
- Walked 2026-09-30 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `ojs/main/pgsql` and
  `ojs/stable-3_5_0/pgsql`: main OJS bade233f73 (lib/pkp 2e377d27fc),
  stable-3_5_0 OJS 92b9a16b48 (lib/pkp a9c76aed62). On 3.5 the walk
  ended at step 7. MySQL not checked; the fault does not depend on the
  database.
- Code reads: main at the tip above, and `plugins/generic/crossref` at
  46a4d469bf. 3.5 at the tip above, `plugins/importexport/doaj/DOAJExportPlugin.php`
  `depositXML()`. 3.4: OJS `stable-3_4_0` at 9571d8fde7, pkp-lib at
  df13621c2d, the same file (the catch at line 137). 3.3: OJS
  `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at d446601ebe,
  `DOAJExportPlugin.inc.php` `depositXML()` (catches `Exception`, line
  120). 34a2dc86b9 is on none of the stable branches.
- Introduced: `git blame` on the two catches, the `dispatch()` calls and
  the `submitted` writes in `depositXML()` all give 34a2dc86b9, which
  created `plugins/generic/doaj/` and its jobs. The GitHub API names
  `pkp/ojs#4985` (merged 2025-10-04) as its PR. The `\Exception` catch
  it replaced dates from 6f2792e77b (2022).
- Upstream searched 2026-09-30 (pkp/pkp-lib, pkp/ojs) by the symptom
  (DOAJ deposit status submitted, failed, cURL error) and by
  `DOAJRegister`, `ConnectException`.
- Unverified (read in the code only, since the install cannot reach
  DOAJ or runs no worker daemon): a DOAJ error answer, a retry that
  reaches DOAJ, the `dispatch()` order under a worker, and a
  `failed()` that writes.
