# A DOAJ deposit that cannot connect to DOAJ leaves the article "Submitted" for good, with no error

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none ("Register" deposits at once and shows the connection error)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#4985` for `pkp/pkp-lib#11593` · [34a2dc86b9](https://github.com/pkp/ojs/commit/34a2dc86b965d3c3037ceb21d1a2e2e974d5713b) · 2025-10-04 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [OJS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a journal manager presses "Register" on the DOAJ tool while the
server cannot connect to DOAJ, the deposit that runs in the background
stops on a server error. The article reads "Submitted" for good: it
never reads "Failed", and the list filtered by the status "Error" shows
no rows. The failure is listed only under Administration › "View Failed
Jobs".

The article does not reach DOAJ, and the manager believes the deposit
is still under way. Articles sent by the daily automatic deposit get
stuck the same way, and it never sends a "Submitted" article again.

It takes a journal that deposits with a DOAJ API key while DOAJ cannot
be reached: during an outage at DOAJ, or on a server whose outbound
connections are blocked, where every deposit sticks. When DOAJ itself
answers with an error (a wrong key, a refused record), the article
reads "Failed" as it should. A separate report covers Crossref and
DataCite deposits, which stick the same way; OJS ships no mEDRA plugin.

## Impact

- **Lost.** A new article is never listed in DOAJ. An article DOAJ
  already lists, whose DOI or URL changed, keeps the old DOI or URL
  there.
- **Who.** A journal manager registering articles with DOAJ, by hand or
  through the automatic deposit, while the server cannot connect to
  DOAJ.
- **Way round.** Once DOAJ is back, tick the "Submitted" article and
  press "Register" again; the list allows it. Or, as site administrator,
  press "Try Again" on Administration › "View Failed Jobs". Nothing
  prompts either, so stuck articles pile up.

Medium: a secondary output, the article's listing in DOAJ, is lost in a
rarely met state, and the manager can register again from the list.
The silence argues for high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal has "DOAJ Plugin"
  ticked and "DOI Versioning" off, so the DOAJ tool lists "Articles".
- The server cannot connect to DOAJ. To stand in for an outage, point
  the proxy in `config.inc.php` at a port where nothing listens:

  ```ini
  [proxy]
  http_proxy = "http://127.0.0.1:9"
  https_proxy = "http://127.0.0.1:9"
  ```

  Everything else is as the dataset ships it, including `[queues]
  job_runner = On`, which runs queued jobs at the end of each page load.

Steps:

1. Sign in as `dbarnes`.
2. Tools › "DOAJ Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/DOAJExportPlugin`).
   On "Settings", type `u63ir15-key` in "DOAJ API Key" and press "Save".
   Any value serves, since no deposit reaches DOAJ.
3. Press "Articles", tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran", and press "Register".
4. Reload the page every 5 s or so for about 20 s. Each page load runs
   the queued deposit, which is tried three times, 5 s apart. Then open
   the tool's address again (it opens on "Settings") and press
   "Articles". (Without `job_runner`,
   run `php lib/pkp/tools/jobs.php run` from the app root three times,
   5 s apart, instead; not walked.)
5. Press "Search" above the list, choose "Error" in the status list and
   press "Search".
6. Sign in as `admin`: Administration › "View Failed Jobs".

**Expected.** Step 3 shows "Articles submitted successfully" and the
article reads "Submitted". Once the deposit has failed to connect, the
article reads "Failed", a link that opens a window headed "Error" with
the connection error. Step 5 lists the article.

**Observed.** Step 3: "Articles submitted successfully", the article
reads "Submitted". Step 4: it still reads "Submitted", as plain text
with no link. Step 5: "No Items". Step 6: "There's a total of 1 failed
job(s).", one row, `APP\plugins\generic\doaj\jobs\DOAJRegister`, whose
"Details" give the exception:

```
cURL error 7: Failed to connect to 127.0.0.1 port 9 after 0 ms: Could not connect to server
```

The server log has the same failure as an uncaught
`GuzzleHttp\Exception\ConnectException` from the job.

Control: submission 1, "Signalling Theory Dividends", which was not
ticked, reads "Not Deposited" throughout.

## Cause

"Register" no longer deposits while the manager waits. Since
`pkp/ojs#4985`, `DOAJExportPlugin::depositXML()`
(`plugins/generic/doaj/DOAJExportPlugin.php`) dispatches a `DOAJRegister`
job, or a `DOAJDelete` job when DOAJ holds an older DOI or URL for the
article, and sets the article's DOAJ status to "Submitted" at once. From
then on only the job moves the status, through `registerObject()` (or
`deleteObject()`): "Registered" when DOAJ accepts, "Error" with the
message otherwise. The manager's "Mark registered" can move it too.

Both methods record a failure only for the exceptions they catch, and
they catch `GuzzleHttp\Exception\RequestException` alone (line 178 in
`deleteObject()`, line 225 in `registerObject()`). On Guzzle 7 (lib/pkp
locks 7.15.2), a transfer that gets no answer throws `ConnectException`,
a sibling of `RequestException` under `TransferException`, not a
subclass: a refused connection, a failed name lookup, a failed TLS
handshake, a timeout or an empty reply. The exception passes the catch
and leaves the job. The queue tries the job three times
(`BaseJob::$tries`, 5 seconds apart) and records it as failed, and the
article keeps the "Submitted" that `depositXML()` set.

The same commit narrowed the catch. Before it, the plugin
(`plugins/importexport/doaj`, still so on `stable-3_5_0`) deposited
inside the "Register" request and caught `\Exception`, so the manager
saw the connection error at once and the article stayed "Not
Deposited".

"Submitted" is a dead end for the automatic deposit
(`DOAJInfoSender::executeActions()`): it takes only articles with no
status or with "Needs Sync" (`PubObjectsExportPlugin::EXPORT_STATUS_DEPOSITABLE`,
`classes/submission/DAO.php` line 96, `classes/publication/DAO.php`
line 137).

Reach:

- "Register" on the "Articles" tab: seen on screen on `main`.
- The "Publications" tab (a journal with "DOI Versioning" "Yes") goes
  through the same `depositXML()`: code read, not walked.
- The automatic deposit dispatches the same jobs (`_registerObjects()`
  calls `depositXML()`): code read, not walked.
- A re-deposit after a DOI or URL change runs `DOAJDelete`. When DOAJ
  cannot be reached, its `deleteObject()` fails at the same catch, so
  the old record stays at DOAJ and `DOAJRegister` is never dispatched:
  code read, not walked.
- An error answer from DOAJ is recorded: the HTTP client keeps Guzzle's
  default `http_errors`, so a 4xx or 5xx answer throws a
  `RequestException` with a response, which the catch turns into
  "Error" with DOAJ's message. Code read, not walked (the test installs
  cannot reach DOAJ).
- Crossref and DataCite have a like narrow catch in their own deposit
  code, reported in
  [pkp-e2e#210](https://github.com/jardakotesovec/pkp-e2e/issues/210);
  its fix does not touch the DOAJ plugin. OJS `main` ships no mEDRA
  plugin; a third-party one was not read.

## Proposed fix

In `DOAJExportPlugin::registerObject()` and `deleteObject()`, catch every
failed transfer, and read DOAJ's answer only when there is one:

```diff
-        } catch (\GuzzleHttp\Exception\RequestException $e) {
+        } catch (\GuzzleHttp\Exception\TransferException $e) {
+            // Any failed transfer: a connection failure is no RequestException and would leave "Submitted"
             $returnMessage = $e->getMessage();
-            if ($e->hasResponse()) {
+            if ($e instanceof \GuzzleHttp\Exception\RequestException && $e->hasResponse()) {
                 $returnMessage = $e->getResponse()->getBody() . ' (' . $e->getResponse()->getStatusCode() . ' ' . $e->getResponse()->getReasonPhrase() . ')';
             }
             $this->updateStatus($object, PubObjectsExportPlugin::EXPORT_STATUS_ERROR, $returnMessage);
```

The full diff, both methods:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/fix.diff).

The plugin makes the request and already writes "Registered" and
"Error", so the fix goes there. `TransferException` is what the code
base already catches for an outbound call that must not escape
(`lib/pkp/classes/site/VersionCheck.php` line 160,
`lib/pkp/controllers/grid/plugins/PluginGalleryGridHandler.php` line
160), and the Crossref and DataCite report proposes the same change.
The jobs that `pkp/ojs#4985` introduced stay as they are.

Tried on `main`: with the fix in, the Steps showed the Expected, and the
untouched article stayed "Not Deposited" with the fix in and out. The
job still ends under "View Failed Jobs" after its three tries, as a
deposit DOAJ refuses does today: `DOAJRegister` throws a `JobException`
for every error `registerObject()` returns. Its message now reads
"Deposit was not successful! The DOAJ API returned an error: …".

**Alternatives:**

- A `failed(Throwable $e)` handler on `DOAJRegister` and `DOAJDelete`
  that sets "Error": it covers any exception, but only after three
  attempts, and it hides the cause in a generic message. Worth adding
  as a second guard, not instead.
- Catching `\Exception`: it would also swallow coding errors inside the
  request call.

**What goes with it:**

- Stored data: articles already stuck at "Submitted" cannot be told
  apart from deposits still queued, so no migration is proposed. A
  release note can point managers to "Register" on those articles.
- Wording: the failed job's message says "The DOAJ API returned an
  error" for an error DOAJ never sent. A product question, left as it
  is.
- A question for the team, outside this fix: the doc comment of
  `PubObjectsExportPlugin::getAllDepositableArticles()` says articles
  "with status error" are deposited again, but the query takes only
  articles with no status or "Needs Sync", so a "Failed" article is not
  re-sent automatically either. The same queries add that `OR` without
  grouping it, outside the context and publication conditions (read,
  not checked at run time).
- Test: a unit test in OJS on `PKPTestCase`, beside
  `tests/jobs/doi/DepositIssueTest.php`. It needs its own Mockery mock
  of `GuzzleHttp\Client` whose `request()` throws
  (`andThrow(new ConnectException('…', new Request('POST', DOAJ_API_URL)))`),
  stored with `Registry::set(PKPTestCase::MOCKED_GUZZLE_CLIENT_NAME, …)`
  so that `Application::get()->getHttpClient()` returns it;
  `mockGuzzleClient()` cannot serve, since its `request()` returns an
  empty response. With the submission repository mocked, as
  `DepositIssueTest` mocks the issue and DOI repositories, the test runs
  `DOAJRegister` and asserts that `updateStatus()` writes "error" with
  the message. An e2e scenario in the pkp-e2e U63 spec guards the
  screen.
- Backport: none needed; 3.5 and older deposit inside the request.

Small: two catches in one file, and a unit test with its own client
mock.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/lib.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/doaj-deposit-unreachable-stays-submitted/fix.diff ojs`,
  walk.js on a freshly loaded dataset, then `node bin/try-fix.js revert`
  with the same arguments.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`:
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp 2e377d27fc): as Observed; the code read is the one in Cause.
  - stable-3_5_0: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    (lib/pkp a9c76aed62): step 3 returned with the notice "Deposit was
    not successful! The DOAJ API returned an error: 'cURL error 7:
    Failed to connect to 127.0.0.1 port 9 after 0 ms: Could not connect
    to server …'", the article stayed "Not Deposited", no job was
    queued, "View Failed Jobs" read "There's a total of 0 failed
    job(s).", and the status list has no "Error". Code read:
    `plugins/importexport/doaj/DOAJExportPlugin.php` `depositXML()`,
    line 136.
- Code reads, not walked:
  - 3.4: OJS `upstream/stable-3_4_0`
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    `plugins/importexport/doaj/DOAJExportPlugin.php` `depositXML()`: the
    same deposit inside the request, line 137, no jobs.
  - 3.3: OJS `upstream/stable-3_3_0`
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    `plugins/importexport/doaj/DOAJExportPlugin.inc.php` `depositXML()`:
    the same, line 120.
- Introduced, traced from the catch lines: `git blame` on lines 178 and
  225 of `plugins/generic/doaj/DOAJExportPlugin.php` gives 34a2dc86b9
  ("pkp/pkp-lib#11593 consider publication export in DOAJ plugin",
  authored 2025-06-30, committed 2025-10-04), which moved the plugin to
  `plugins/generic/doaj`, added the two jobs and wrote both catches. It
  came with `pkp/ojs#4985` (merged 2025-10-04), which `pkp/pkp-lib#11593`
  names as its PR. Later changes to the file (753e023ce4 for
  `pkp/ojs#5275`, 2fb073d4a4 for `pkp/pkp-lib#13100`) do not touch the
  catches.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom and by `DOAJRegister`, `registerObject`,
  `RequestException` and `ConnectException`.
- MySQL was not checked (nothing here depends on the database).
