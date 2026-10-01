# On a DataCite journal, "Export DOIs" on an issue downloads nothing and "Deposit All" never sends it

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#5378` for `pkp/pkp-lib#12392` · [f396c7da65](https://github.com/pkp/ojs/commit/f396c7da651358fbfbd2102c3e37bdf638ad1816) · 2026-06-17 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal with DataCite chosen, "Export DOIs" on a published issue
("Issues" tab) closes the "Export DOIs" confirmation window and shows
nothing: the export fails on the server. "Deposit All" marks the issue "Submitted", and its
background deposit fails the same way, so the issue's DOI never reaches
DataCite.

The journal cannot register any issue DOI with DataCite from the
application, by deposit or by a downloaded file. The DOIs page tells the
manager the opposite: the issue reads "Submitted" and no error shows.
Article DOIs on the same journal are not affected.

It needs DataCite as the journal's registration agency and "Issues"
ticked under "Items with DOIs".

## Impact

- **Lost.** Every issue DOI the journal assigns stays unregistered, so
  it does not resolve. Nobody is told.
- **Who.** A journal manager on the DOIs page, at every export or
  deposit of an issue, whether pressed by hand or sent by "Automatic
  Deposit"; and every reader or citer who follows the issue's DOI.
- **Way round.** None in the application. The manager can register the
  DOI by hand in DataCite's own tools and then use "Mark DOIs
  Registered".

High: DOI deposits fail with no way round in an ordinary setup that is
not the default (a DOI plugin); it would be critical if issue DOIs were
common to most installs.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded: the journal
  `publicknowledge`, its published issue "Vol. 1 No. 2 (2014)" (issue 1)
  and its published submission 1 ("The Signalling Theory Dividends: A
  Review Of The Literature And Empirical Evidence").
- The dataset has DOIs on for "Articles" only, with no DOI prefix and
  no registration agency, so steps 2 to 4 set DataCite up on screen.
  `rvaca` is its Journal Manager; `admin` its site administrator.
- An install with outside access sends the deposits of step 9 to
  DataCite's test system (step 3 turns it on), which needs a test
  account to accept them.

Setting up DataCite:

1. Sign in as `rvaca`.
2. Settings › Website › "Plugins": tick "Enabled" on "DataCite Manager
   Plugin".
3. Settings › Distribution › "DOIs" › "Registration": choose "DataCite"
   under "Registration Agency", tick "Use the DataCite test system for
   DOI registration…", type `10.5072` in "Test DOI Prefix" (required
   with the test system on), press "Save".
4. "DOIs" › "Setup": type `10.1234` in "DOI Prefix", tick "Issues" under
   "Items with DOIs" (beside the ticked "Articles"), press "Save".

Giving the issue and an article a DOI:

5. Open "DOIs" in the side menu, tab "Issues": tick "Vol. 1 No. 2
   (2014)", choose "Bulk Actions" › "Assign DOIs", press "Assign DOIs".
6. Tab "Articles": tick "The Signalling Theory Dividends…", choose "Bulk
   Actions" › "Assign DOIs", press "Assign DOIs".

Exporting:

7. Tab "Issues": tick "Vol. 1 No. 2 (2014)", choose "Bulk Actions" ›
   "Export DOIs", press "Export DOIs".
8. Tab "Articles": tick "The Signalling Theory Dividends…", choose "Bulk
   Actions" › "Export DOIs", press "Export DOIs".

Depositing:

9. Press "Deposit All", then "Deposit all DOIs".
10. Reload the page a few times: the dataset's install runs queued jobs
    at the end of web requests, so the reloads run the deposits. Then
    open the "Issues" tab and expand "Vol. 1 No. 2 (2014)".
11. Sign in as `admin`, open Administration › "View Failed Jobs" and the
    failed `APP\jobs\doi\DepositIssue` job's details.

**Expected:** step 7 builds the issue's record as step 8 builds the
article's: the XML downloads with "Items successfully exported", or, on
an install that cannot reach DataCite, the same schema `400` the article
gets. Step 9 sends the issue's record as it sends the article's, and
the issue's status follows the answer.

**Observed:** in step 7 the "Export DOIs" confirmation window closes.
Nothing downloads, and no message or error shows. The request behind it answered 500:

```
POST /index.php/publicknowledge/api/v1/dois/issues/export  → 500
{"error":"APP\\plugins\\generic\\datacite\\filter\\DataciteXmlFilter::createFundingReferencesNode(): Argument #2 ($publication) must be of type APP\\publication\\Publication, null given, called in …/plugins/generic/datacite/filter/DataciteXmlFilter.php on line 277"}
```

The server log has the same `TypeError` as `production.ERROR`.

Step 9 shows "Items successfully submitted for deposit" and the issue
reads "Submitted" (its panel's "This item has been manually registered
with a registration agency." is a separate fault,
[U45 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a4)).
After the reloads of step 10 the issue still reads "Submitted". In step
11 the failed `APP\jobs\doi\DepositIssue` job carries the same
`TypeError`: it failed before anything was sent.

Control: the article's record is built. Its export in step 8 answers
`400` "An XML validation error occurred and the XML could not be
exported.", because this install cannot reach DataCite's schema, and
its deposit job in step 9 fails only at connecting to DataCite.

## Cause

`DataciteXmlFilter::process()` (OJS
`plugins/generic/datacite/filter/DataciteXmlFilter.php`) builds one
DataCite record for an issue, an article or a galley. For an issue,
`$article` and `$publication` are `null` by design, and every other
`create…Node()` helper it calls accepts that. The one exception is the
funding references, called without a guard at line 277:

```php
$fundingReferencesNode = $this->createFundingReferencesNode($doc, $publication, $article);
```

The method is declared with non-nullable parameters (line 830):

```php
public function createFundingReferencesNode(DOMDocument $doc, Publication $publication, Submission $submission): ?DOMNode
```

So for an issue PHP throws a `TypeError` before the method body runs,
and the whole record is lost.

The call and the method came with the funder data support
(f396c7da65, `pkp/pkp-lib#12392`), as `createFundingReferencesNode($doc,
Publication $publication)`. b80186c81c (`pkp/pkp-lib#13003`) moved the
funders to the submission and added the `Submission $submission`
parameter, also non-nullable. The issue path had been fixed for the same
kind of mistake two months before (`pkp/pkp-lib#12567`: caad96029f made
the record's helpers and `getObjectLocalePrecedence()` accept a `null`
publication and article). The funding call came after that fix and did
not follow it.

Reach:

- "Export DOIs" on the "Issues" tab: `DoiController::exportIssues()` →
  `DatacitePlugin::exportIssues()` (seen on screen).
- "Deposit All": `Repository::depositAll()` queues `DepositIssue` →
  `DatacitePlugin::depositIssues()` (seen on screen).
- "Deposit DOIs" on ticked issues: `DoiController::depositIssues()`
  queues the same job (read in the code).
- "Automatic Deposit": the `DepositDois` scheduled task queues
  `DepositContext`, which calls `depositAll()` (read in the code).
- Articles and galleys: not affected, since both carry an article and a
  publication (the article seen on screen as the control).
- Crossref: its funding code (`ArticleCrossrefXmlFilter::appendFundrefNode()`)
  runs only for articles; its issue export does not reach it (read in
  the code).
- OMP and OPS have no DataCite plugin and no issues.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/datacite-issue-export-fails/fix.diff).
With the fix, step 7 no longer fails on the server: the issue's export
now answers the same schema `400` as the article's, which comes after
the record is built. The issue's deposit job then goes as far as
connecting to DataCite, as the article's does. The article's export and deposit give the same
results with the fix in and out.

Recommended: let `createFundingReferencesNode()` take a missing
publication or submission and return no node for it. This is the same
pattern `createContributorsNode()` and the helpers fixed for
`pkp/pkp-lib#12567` use:

```diff
-    public function createFundingReferencesNode(DOMDocument $doc, Publication $publication, Submission $submission): ?DOMNode
+    public function createFundingReferencesNode(DOMDocument $doc, ?Publication $publication, ?Submission $submission): ?DOMNode
     {
         /** @var DataciteExportDeployment $deployment */
         $deployment = $this->getDeployment();
 
+        // Issues have no funders: only an article or its galley carries funding references.
+        if (!$publication || !$submission) {
+            return null;
+        }
+
         $funders = $submission->getData('funders');
```

Issues have no funders, so an issue record without funding references
is the right output. This keeps what the funder support was for, since
an article's and a galley's records are built as before.

**Alternatives:**

- Guard the call in `process()` (`if ($article) …`): it works too, but
  it leaves a public helper that still throws on the `null` its sibling
  helpers accept.
- Revert the funding references: it loses the funder data DataCite
  records now carry.

**What goes with it:**

- Stored data: issues whose deposit failed are left "Submitted", and
  "Deposit All" re-sends only "Unregistered", "Error" and "Needs Sync"
  items. Ticking such an issue and pressing "Deposit DOIs" queues it
  again (read in the code), though that action never sets "Submitted"
  itself (`DoiController::depositIssues()` discards its `array_merge`,
  line 160).
- Guard: a test in OJS `tests/plugins/` (beside
  `importexport/PubObjectCacheTest.php`) that runs the
  `issue=>datacite-xml` filter on a fixture issue, published and with a
  DOI; the existing `tests/jobs/doi/DepositIssueTest.php` uses a stub
  agency, so it never runs the DataCite filter.

Small: a nullable signature and a two-line guard in one method,
following the pattern of its sibling helpers, and a unit test.

## Evidence

- Kept script that takes the Steps through the screens on OJS, on an
  install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/datacite-issue-export-fails/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/datacite-issue-export-fails/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Where the walk
  differs from the Steps: it typed a "Username (symbol)" and left the
  test system off (neither is needed to save, and neither changes the
  path to line 277; read in the code), and it read the failed jobs
  from the `failed_jobs` table, the rows "View Failed Jobs" lists,
  instead of opening that page.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/datacite-issue-export-fails/fix.diff ojs`,
  walk.js again, then `node bin/try-fix.js revert …`. The article in
  steps 6, 8 and 9 shows the fix leaves articles alone: the same results
  with the fix in and out. The diff's context lines come from
  e8d34309a7 (`pkp/pkp-lib#13003`), so it applies to `main` from that
  commit on.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp 2e377d27fc): as Observed.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    (lib/pkp a9c76aed62): no server error. The issue's export answered
    the same `400` as the article's, and both deposit jobs failed only
    at connecting to `mds.datacite.org`. Its `DataciteXmlFilter.php` has
    no funding references.
  - Not database-dependent.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7,
  `plugins/generic/datacite/filter/DataciteXmlFilter.php`: no funding
  references; its helpers take untyped parameters.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a,
  `plugins/importexport/datacite/filter/DataciteXmlFilter.inc.php`: no
  funding references.
- Introduced: `git blame` on lines 277 and 830 gives b80186c81c (Alec
  Smecher, 2026-08-27); blame at its parent gives f396c7da65, whose PR
  `pkp/ojs#5378` was merged 2026-07-06.
- Upstream search 2026-10-01 in pkp/pkp-lib and pkp/ojs (DataCite issue
  export, DataCite issue deposit, DataCite funding issue,
  `DataciteXmlFilter`, `createFundingReferencesNode`): nothing about
  this fault. `pkp/pkp-lib#12567` (closed, fixed by `pkp/ojs#5496` and
  `pkp/ojs#5497`) is the same symptom from an earlier cause,
  `getObjectLocalePrecedence()`.
- Unverified: that DataCite accepts the issue record the fixed code
  builds; on the walked installs neither the schema check nor a deposit
  could be completed.
