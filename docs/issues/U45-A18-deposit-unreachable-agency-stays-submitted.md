# A DOI deposit that cannot connect to Crossref or DataCite reads "Submitted" for good, with no error

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; a deposit runs while the manager waits and sets no status first)
- **Introduced** not traced; present since at least [72b6b76436](https://github.com/pkp/pkp-lib/commit/72b6b764361e966c240dcf5f076c372fa4e07d46) (2022-06-21), `pkp/pkp-lib#8021` for `pkp/pkp-lib#8020`, which queued every deposit and marks it "Submitted" before it runs
- **Upstream** `pkp/crossref-ojs#16` (closed, OJS Crossref only). Its fix, `pkp/crossref-ojs#17` (2022), caught the wider `GuzzleException`, and a 2023 formatting commit put the narrow `RequestException` back. Even #17 still failed on `hasResponse()` for a connection failure, so no version ever recorded this case correctly, which is why the Kind is defect, not regression
- **Tracked in** spec U45 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a18)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

After "Deposit DOIs" or "Deposit All" the DOI reads "Submitted". When the
background deposit cannot connect to the registration agency (Crossref or
DataCite), it fails on the server. It is tried twice more, about five
seconds apart, and then given up and recorded as a failed job, all within
seconds. The DOI stays "Submitted": no "Error" badge or "View Error"
appears. Nothing on the DOIs page tells the manager that the deposit never
arrived or that it should be sent again, and nothing points the site
administrator to Administration › "Failed Jobs".

The DOI is never registered, so it does not resolve, while the DOIs page
reports it as sent. A stuck "Submitted" looks the same as a deposit still
waiting its turn. "Deposit All" and "Automatic Deposit" never send a
"Submitted" DOI again, so it is registered only if a manager deposits the
item again by hand.

The trigger is a deposit that gets no answer: no connection, a failed name
lookup, a failed TLS handshake, a timeout or an empty reply. This covers an
outage at the agency and a server whose outbound connections are blocked,
where every deposit is lost this way. An agency that answers with an HTTP
error is recorded as "Error", as it should be. With Crossref, a transfer
error of another kind that brings no answer leaves "Submitted" too; that
case was read in the code and not reproduced.

## Impact

- **Lost.** The DOI's registration, with its status left wrong, and nobody
  is told.
- **Who.** A journal or preprint server manager depositing with Crossref
  (journals, preprint servers) or DataCite (journals), by hand or through
  "Automatic Deposit", whenever the agency is unreachable; then every reader
  who follows the DOI.
- **Way round.** Tick the item and "Deposit DOIs" again once the agency is
  back, or, as site administrator, "Try Again" on Administration › "Failed
  Jobs". Nothing prompts either, and the stuck items pile up, since no
  automatic deposit takes them again.

High: the deposit fails silently and nothing ever sends it again. The state
is not everyday (the agency must be unreachable), which alone would make it
medium, but the silence lifts it a level.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS; OPS where the steps say so).
- The server cannot connect to the agency. To stand in for an outage, point
  the proxy in `config.inc.php` at a port where nothing listens:

  ```ini
  [proxy]
  http_proxy = "http://127.0.0.1:9"
  https_proxy = "http://127.0.0.1:9"
  ```

  Everything else is as the dataset ships it, including `[queues]
  job_runner = On`, which runs queued jobs on web requests.

Crossref (OJS and OPS):

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save" (the dataset has no prefix).
4. "Registration": "Registration Agency" "Crossref", "Depositor name"
   `Public Knowledge Project`, "Depositor email" `dbarnes@mailinator.com`,
   "Save". (The dataset's journal already has the publisher and ISSN that
   Crossref needs.)
5. Side menu "DOIs": tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran" [OPS: submission 2, "The
   Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence"]; "Bulk Actions" › "Assign DOIs" › "Assign DOIs". The badge
   reads "Unregistered".
6. Tick it again; "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs".
7. Reload the DOIs page every few seconds (at least 5 s apart; each load
   runs the queued deposit) until Administration › "Failed Jobs" lists the
   job, about 20 s. Then expand the item ("Show more details about …").
8. Press the filter "Has Error".
9. Sign in as `admin`: Administration › "Failed Jobs".

DataCite (OJS), from a freshly loaded dataset, keeping the `[proxy]`
precondition in `config.inc.php`: steps 1 to 9, with "DataCite Manager
Plugin" in step 2 and, in step 4, "Registration Agency" "DataCite". The
reproduction also typed "Username (symbol)" `u45ir3`. The form does not
require it (`DataciteSettings` lists no required fields), and no deposit
reaches DataCite, so any value or none serves.

**Expected.** Step 6 shows "Items successfully submitted for deposit" and
"Submitted". Once the deposit has failed to connect, the badge reads
"Error", and the expanded item's DOI row and its agency box offer "View
Error", which opens "Registration Error Message" with the connection error.
"Has Error" lists the item, and "Deposit All" sends it again.

**Observed.** Step 6: "Items successfully submitted for deposit", badge
"Submitted". Step 7: the badge still reads "Submitted", the expanded view
reads `Article Submitted` (`Preprint Submitted` on OPS) with no "View Error",
and the agency box offers no button. [3.5: the expanded view has no status
column; the badge reads "Submitted".] Step 8: "No items found." Step 9:
"There's a total of 1 failed job(s).", one row,
`PKP\jobs\doi\DepositSubmission`, whose stored exception reads:

```
cURL error 7: Failed to connect to api.crossref.org port 443 via 127.0.0.1 after 0 ms: Could not connect to server (see https://curl.se/libcurl/c/libcurl-errors.html) for https://api.crossref.org/v2/deposits
```

With DataCite, the same, the failed job's message naming
`https://mds.datacite.org/metadata`. The item stayed "Submitted" on every
later load.

## Cause

Every deposit is a queued job. `PKPDoiController::depositSubmissions()`,
OJS `DoiController::depositIssues()` and the two `depositAll()`s (lib/pkp
`classes/doi/Repository.php` line 290 for submissions, OJS
`classes/doi/Repository.php` line 373 for issues) dispatch
`DepositSubmission` or `DepositIssue`. They mark the item's DOIs "Submitted"
(`Repo::doi()->markSubmitted()`) before the job runs. For a submission that
includes its peer-review DOIs (`getDoisForSubmission()`), whose
`DepositPeerReview` jobs are dispatched only by `DepositSubmission::handle()`
after the submission's deposit succeeded. From then on only the agency
plugin moves the status, through its `updateDepositStatus()`: "Registered"
on success, "Error" with the message when the deposit fails. The jobs have
no failure handler.

The agency plugins record a failed deposit only for exceptions they catch,
and they catch `GuzzleHttp\Exception\RequestException` alone:

- OJS `plugins/generic/crossref/CrossrefExportPlugin.php` `depositXML()`,
  line 344 (`pkp/crossref-ojs`);
- OPS `plugins/generic/crossref/CrossrefExportPlugin.php` `depositXML()`,
  line 391 (`pkp/crossref-ops`);
- OJS `plugins/generic/datacite/DataciteExportPlugin.php` `depositXML()`,
  lines 307 (the metadata) and 326 (the DOI).

On Guzzle 7 (lib/pkp requires `^7.0` and locks 7.15.2), a transfer that
gets no connection throws `ConnectException`, a sibling of
`RequestException` under `TransferException`, not a subclass. This covers a
refused connection, a failed name lookup, a failed TLS handshake, a timeout
and an empty reply (`CurlFactory`'s connection errors). The exception passes
every catch, out of `exportAndDeposit()` and the job. The queue tries the job
three times (`BaseJob::$tries`), 5 seconds apart (`BaseJob::$backoff`), and
records it as failed, and the DOI keeps the "Submitted" set at dispatch. On Guzzle 6, which 3.3 used,
`ConnectException` extended `RequestException`.

Crossref also skips the status for a `RequestException` that has no
response (a transfer error that is not a connection error): its catch only
updates the status inside `if ($e->hasResponse())`. That deposit returns
an error that the job ignores, and the DOI stays "Submitted" with no failed
job (read in the code, not reproduced). DataCite records "Error" in that
case.

"Submitted" is a dead end. The depositable queries take only
"Unregistered", "Error" and "Needs Sync": OJS `classes/doi/DAO.php` lines
117 (submissions) and 134 (issues), and OPS `classes/doi/DAO.php` line 70.
So "Deposit All" and the "Automatic Deposit" task never send a "Submitted"
DOI again.

Reach:

- Crossref on a journal and on a preprint server, DataCite on a journal:
  seen on screen on `main` and 3.5.
- Issue deposits (`DepositIssue`) go through the same `depositXML()`: code
  read, not reproduced.
- Peer-review DOIs (OJS Crossref; DataCite has no peer-review deposits) are
  marked "Submitted" with their submission, and their own jobs never run
  when the submission's deposit fails. They stay "Submitted" too. The
  Crossref fix covers them, because `updateDepositStatus()` on a submission
  edits every DOI `getDoisForSubmission()` returns. Code read, not
  reproduced.
- "Deposit All", the agency panel's "Deposit DOI(s)" and "Automatic Deposit"
  dispatch the same jobs: code read, not reproduced.
- A press has no agency plugin, so OMP is not affected.
- The same narrow catch, outside the deposit: Crossref's
  `getStatusMessage()` (OJS line 146, OPS line 143), the Crossref
  reference-DOI lookup (OJS `CrossrefCitationDoiHandler.php` line 270) and
  the DOAJ plugin's `registerObject()` and `deleteObject()` (lines 225 and
  178), whose DOAJ status also stays "Submitted" when DOAJ cannot be
  reached. Code read; not part of this fix.

## Proposed fix

In each agency plugin's `depositXML()`, catch every failed transfer and
record a failure that has no response as "Error", like the failures the
agency answered. In practice: catch `TransferException`, keep the
response-reading branches for a `RequestException` with a response, and in
Crossref add the missing `else`. `TransferException` is what the code base
already catches for an outbound call that must not escape:
`lib/pkp/classes/site/VersionCheck.php` line 160 and
`lib/pkp/controllers/grid/plugins/PluginGalleryGridHandler.php` line 160.
OJS Crossref:

```diff
-        } catch (RequestException $e) {
+        } catch (TransferException $e) {
             $returnMessage = $e->getMessage();
-            if ($e->hasResponse()) {
+            if ($e instanceof RequestException && $e->hasResponse()) {
                 …
                 }
+            } else {
+                // No answer from Crossref (no connection, a timeout): record it, or the DOI stays "Submitted"
+                $this->updateDepositStatus($context, $objects, Doi::STATUS_ERROR, null, $returnMessage);
             }
             return [['plugins.importexport.common.register.error.mdsError', $returnMessage]];
```

OPS Crossref gets the same change, in fix-ops.diff, where the variable is
`$object`. DataCite's two catches only need the
wider type and the `instanceof` guard, since they already record "Error"
in every case. The full diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-unreachable-agency-stays-submitted/fix-ojs.diff)
(OJS: Crossref and DataCite) and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-unreachable-agency-stays-submitted/fix-ops.diff).

The fix belongs in the plugins because they own the outcome: they make the
request and already write "Registered" and "Error". The job no longer fails,
so there are no pointless retries, and the DOI becomes "Error" with the
connection message at once. "Deposit All" and "Automatic Deposit" then send
it again once the agency is back.

Tried on `main`: with the fix in, the Steps showed the Expected on OJS
(Crossref and DataCite) and OPS, with no failed job. A second published item
that was given a DOI but not deposited stayed "Unregistered" with the fix in
and out.

**Alternatives:**

- A `failed(Throwable $e)` handler on the deposit jobs, marking the item's
  DOIs "Error" with `$agency->getErrorMessageKey()`. It covers any exception
  and agency plugins outside pkp, but only after three attempts, and it
  must find exactly the DOIs the job covered. It is a follow-up, not part
  of this fix. It is worth adding as a second guard, because other
  exceptions inside the job leave the same "Submitted" today, such as
  DataCite's thrown `Exception`s in `depositXML()` or the DataCite issue
  export failure. It does not replace the plugins' own status writes.
- Catching `GuzzleException`, as `pkp/crossref-ojs#17` did: it also takes
  `InvalidArgumentException` (a coding error, not a failed transfer), and a
  `ConnectException` has no `hasResponse()`, which that change still
  called.
- Letting "Deposit All" take "Submitted" DOIs: it would send deposits that
  are still queued a second time.

**What goes with it:**

- Changes reach three repos: `pkp/crossref-ojs`, `pkp/crossref-ops` and
  `pkp/ojs` (DataCite). The other catches named under Cause are advised for
  the same reason, but were not tried. `getStatusMessage()` and both DOAJ
  catches call `hasResponse()`, so they need the wider type and the
  `instanceof` guard as above. The reference lookup in
  `CrossrefCitationDoiHandler` is a one-word change.
- Stored data: DOIs already stuck at "Submitted" cannot be told apart from
  deposits still queued, so no migration is proposed. A release note can
  point managers to Administration › "Failed Jobs" ("Try Again") or to a
  fresh "Deposit DOIs" on those items.
- Wording: "View Error" then says the error "was returned by Crossref" for
  an error that Crossref never sent. That is a product question, left as it
  is.
- Tests: neither plugin has a `tests/` directory. A unit test per plugin
  would start one in each plugin repo, on `PKPTestCase` (as
  `lib/pkp/tests/jobs/doi/DepositSubmissionTest.php` does), where
  `PKPApplication::getHttpClient()` returns the Guzzle client mocked in the
  Registry under `PKPTestCase::MOCKED_GUZZLE_CLIENT_NAME`. A `MockHandler`
  there throwing a `ConnectException` lets the test assert that the DOI is
  "Error" with the message. An e2e scenario in the pkp-e2e U45 spec guards
  the screen.
- Backport: the diffs apply to `stable-3_5_0` as they are. On
  `stable-3_4_0`, OJS Crossref's `use` hunk must be applied by hand (its
  imports differ) and the rest applies.

Medium: a few lines each in three repos, with a unit test in each, and no
data repair.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-unreachable-agency-stays-submitted/walk.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/deposit-unreachable-agency-stays-submitted/walk.js`
  (Crossref; `WALK=datacite` for DataCite on OJS; `NEIGHBOUR=1` adds the
  second, undeposited item; `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  Where the walk differs from the Steps: it knows the queue is empty from
  the `jobs` table, it reads the failed job's exception from the
  `failed_jobs` row that "Failed Jobs" › "Details" shows, and it reads the
  error message from `doi_settings` (read only). The test installs' proxy
  is the precondition's.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply …/fix-ojs.diff ojs` and
  `… apply …/fix-ops.diff ops`, then walk.js with `NEIGHBOUR=1` (OJS, OPS)
  and with `WALK=datacite` (OJS), then `node bin/try-fix.js revert` for
  each.
- Walked 2026-10-01 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, with no
  upgrade needed:
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp 2e377d27fc, crossref-ojs 46a4d469bf), OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    (lib/pkp 3dc90c81a6, crossref-ops b6b94dd5de): as Observed, Crossref
    and DataCite.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    (crossref-ojs 97a9311998), OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994)
    (crossref-ops 20f54096a4), lib/pkp a9c76aed62: as Observed, Crossref
    and DataCite. The code has the same catches (OJS Crossref line 326,
    OPS Crossref line 389, DataCite lines 300 and 319) and the same jobs.
  - OMP: no registration agency plugin, so no surface.
- Code reads, not walked:
  - 3.4: OJS `upstream/stable-3_4_0`
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    has crossref-ojs f073a208eb (`catch (RequestException $e)` at line 324,
    status only inside `hasResponse()`) and DataCite
    `\GuzzleHttp\Exception\RequestException` at lines 301 and 320. OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
    has crossref-ops 50cef72474 (line 388, the same). lib/pkp `stable-3_4_0`
    df13621c2d requires Guzzle `^7.0`, and its `PKPDoiHandler.php` dispatches
    `DepositSubmission` and calls `markSubmitted()` (lines 455, 459).
  - 3.3: OJS `upstream/stable-3_3_0`
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    and lib/pkp d446601ebe: Guzzle `^6.5`, no queued deposit jobs, and no
    status set before a deposit. The Crossref and DataCite Tools pages
    deposit while the manager waits and show the caught error. OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    deposits on publish through the same Crossref export plugin, with no
    status set first.
- Introduced, traced from the catch lines. `git blame` on OJS Crossref line
  344 gives e504f13d (`pkp/pkp-lib#8800` "Formatting", 2023-03-21), which
  changed `catch (GuzzleException $e)` back to `RequestException`. That
  `GuzzleException` came from 2bb7281 (`pkp/crossref-ojs#16`, 2022-11-14),
  still with `$e->hasResponse()`, which a `ConnectException` lacks, so a
  connection failure failed the job then too. Before that,
  0f5df7c (2022-06-15) caught `GuzzleHttp\Exception\RequestException`.
  OPS Crossref line 391 comes from 9061237d (2023-03-21), and DataCite line
  307 from 6f2792e77b (2022-08-16), both `RequestException`. Guzzle 7 came
  with `pkp/pkp-lib#7842` for `pkp/pkp-lib#7815`
  ([f9a128e525](https://github.com/pkp/pkp-lib/commit/f9a128e525a619f5e1375de59aaa8ea5b6029367),
  2022-04-11). The deposit became a queued job that marks "Submitted" first
  with `pkp/pkp-lib#8021`
  ([72b6b76436](https://github.com/pkp/pkp-lib/commit/72b6b764361e966c240dcf5f076c372fa4e07d46),
  2022-06-21, Erik Hanson, ewhanson). Before that, "Deposit DOIs" answered
  the manager with the deposit's error. Several changes are involved, so no
  single one is named.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs, pkp/ops,
  pkp/ui-library, pkp/crossref-ojs and pkp/crossref-ops, by the symptom
  (deposit stuck "Submitted", connection, cURL error) and by
  `ConnectException`, `RequestException` and `DepositSubmission`.
  `pkp/crossref-ojs#16` is the same fault on OJS Crossref (its fix was
  undone, see above). `pkp/pkp-lib#11621` (closed) stored DataCite's error
  message for an answered deposit, not this.
- Unverified: the Crossref branch for a `RequestException` without a
  response (Cause, fourth paragraph) was read in the code, not reproduced.
  Issue and peer-review deposits were not walked. MySQL was not checked
  (nothing here depends on the database).
