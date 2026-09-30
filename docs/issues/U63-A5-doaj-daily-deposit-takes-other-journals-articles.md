# One journal's daily DOAJ deposit sends other journals' "Needs Sync" articles to DOAJ as its own

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#5125` (articles) and `pkp/ojs#4985` (publications) for `pkp/pkp-lib#11589` · [2868948ee8](https://github.com/pkp/ojs/commit/2868948ee805d2a3a8b6675bd3902fb789c9cafa) · 2025-10-07 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a5)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On an installation that hosts several journals, the daily automatic
DOAJ deposit of a journal also takes the articles of other journals
whose DOAJ status reads "Needs Sync". It sends them to DOAJ with its
own API key and as its own articles: under its own journal name and
ISSNs, with a link built on its own address, where the article does not
exist and the site shows "not found". The article's own journal sent
nothing, yet its DOAJ list now reads "Submitted".

Nobody is told, and the article's journal has no setting that prevents
it. Where the article already has a DOAJ record, the run first asks
DOAJ to delete that record, with the depositing journal's key.

An article reads "Needs Sync" once it has been deposited to DOAJ (or
marked as deposited) and its current version is then unpublished,
published again or replaced by a newly published version.

## Impact

- **Lost:** a correct DOAJ index entry. By DOAJ's own rules the wrong
  record is filed under the depositing journal, and the article's own
  record is not updated, or is deleted where DOAJ lets that key delete
  it.
- **Who:** installations hosting several journals, where one has an API
  key and automatic deposit on and another has articles reading "Needs
  Sync", both with the same "different DOIs for different versions"
  setting. Only `main` is affected, which is unreleased: no site running
  a released version meets it.
- **Way round:** none. OJS has no screen that removes a record at DOAJ,
  so a wrong record stays until the depositing journal's DOAJ account
  removes it at DOAJ. Unticking automatic deposit in the journals that
  have it stops further runs.

High: a public index gets records under the wrong journal, with dead
links, silently, on every daily run of an ordinary multi-journal setup.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`.
- In `config.inc.php`, `[queues] job_runner = Off`, so that the deposit
  stays queued where it can be read. With the default `On`, the next
  page load sends it; an install that reaches DOAJ then gets DOAJ's
  refusal of the made-up key, and the row reads "Failed" instead of
  "Submitted".
- A second journal, created in steps 1–2, because the dataset has only
  one. A new journal has "DOAJ Plugin" ticked by default.

The second journal, which deposits automatically:

1. Sign in as `admin`. Administration › "Hosted Journals" › "Create
   Journal": Journal title "u63a5 Journal", Journal initials "U5J",
   Principal Contact Name "u63a5 Contact", Principal Contact Email
   "u63a5@mailinator.com", Country "Canada", Path `u63a5`, Languages
   "English", Primary locale "English", tick "Enable this journal to
   appear publicly on the site"; "Save".
2. Open the new journal's Tools (`/index.php/u63a5/en/management/tools`)
   › "DOAJ Export Plugin". Under "DOAJ API Key" type `u63a5-key`, tick
   "OJS will deposit articles automatically to DOAJ. …", "Save". Its
   "Articles" tab reads "No Items".

"Journal of Public Knowledge" (`publicknowledge`), which has no API key
and no automatic deposit:

3. Sign in as `rvaca`. Tools › "DOAJ Export Plugin" › "Articles": tick
   "Antimicrobial, heavy metal resistance and plasmid profile of
   coliforms isolated from nosocomial infections in a hospital in
   Isfahan, Iran" (submission 17), press "Mark Registered". Its status
   reads "Marked registered".
4. Open submission 17 › "Title & Abstract" under its publication
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
   Press "Unpublish", and "Unpublish" in the window: this is what turns
   the DOAJ status to "Needs Sync". Then put the article back: "Schedule
   For Publication", "Confirm" under "Review Publishing Details", and
   "Publish" in the window ("This will be published immediately in
   Vol. 1 No. 2 (2014)."). The status reads "Published".
5. Tools › "DOAJ Export Plugin" › "Articles": submission 17 reads
   "Needs Sync", "The Signalling Theory Dividends" (submission 1) reads
   "Not Deposited".

The daily run:

6. Let the day's "DOAJ automatic registration task" run. It runs after
   midnight on its own. To run it at once, use pkp's scheduler tool on
   the server:
   `php lib/pkp/tools/scheduler.php test --name='APP\plugins\generic\doaj\DOAJInfoSender'`.
7. As `rvaca`, reload Tools › "DOAJ Export Plugin" › "Articles".
8. Read the queued deposit in the database:
   `select id, payload from jobs where payload like '%DOAJRegister%';`

**Expected:** submission 17 still reads "Needs Sync", and nothing is
queued.

**Observed:** submission 17 reads "Submitted"; submission 1 still reads
"Not Deposited". One `DOAJRegister` job is queued for submission 17 in
the name of "u63a5 Journal", whose API key it uses. The record it
carries names the wrong journal and links to an address the site
answers with 404:

```
{"bibjson":{"journal":{"title":"u63a5 Journal","volume":1,"number":"2"},
 "title":"Antimicrobial, heavy metal resistance …", …
 "link":[{"url":"http://<host>/index.php/u63a5/article/view/17","type":"fulltext",…}], …}}
```

The article's own address, `/index.php/publicknowledge/article/view/17`,
opens the article.

## Cause

`APP\submission\DAO::getExportable()` (`classes/submission/DAO.php`)
builds the list the daily task sends. For the status
`EXPORT_STATUS_DEPOSITABLE`, which only
`PubObjectsExportPlugin::getAllDepositableArticles()` passes, it adds
the status condition inside a `when()` callback:

```php
fn (Builder $q) => $q->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE),
```

The callback receives the outer query, so the `orWhere()` is not
grouped with the `whereNull()`. The SQL reads
`… WHERE s.context_id = ? AND p.version_stage IN (…) AND p.status = 3
AND pss.setting_value IS NULL OR pss.setting_value = 'stale'`. Since
AND binds before OR, the `stale` branch has none of the other
conditions: every submission of the installation whose `doaj::status`
is `stale` ("Needs Sync") matches, whatever its journal.

`DOAJInfoSender::executeActions()` (on `main` in
`plugins/generic/doaj/`, beside `DOAJExportPlugin` and the `jobs/`
folder) then calls `DOAJExportPlugin::exportJSON()` and `depositXML()`
for each of them with the journal whose run it is. The record takes
that journal's name, ISSNs, publisher and address (`DOAJJsonFilter`),
and `depositXML()` writes `submitted` on the article. What it sends
depends on the article:

- No DOAJ id stored (a "Marked registered" article, as in the Steps):
  `DOAJRegister`, which posts the record with the depositing journal's
  API key (`registerObject()`).
- A DOAJ id stored (an article really registered with DOAJ): the
  record's link always differs from the stored one, so `depositXML()`
  dispatches `DOAJDelete` first. It asks DOAJ to delete the article's
  real record with the depositing journal's key (`deleteObject()`), and
  only if that succeeds dispatches `DOAJRegister`. If DOAJ refuses, the
  article's row reads "Failed". Read in the code.

`APP\publication\DAO::getExportable()` has the same line for
journals with "different DOIs for different versions"
(`getAllDepositablePublications()`). Both came with
`pkp/pkp-lib#11589`, which added the "Needs Sync" status so that a
registered article is sent again after a new version. The publications
path came first (`pkp/ojs#4985`); `pkp/ojs#5125` copied it into the
submission DAO. Before them the daily task selected only its own
journal's published articles with no status, as 3.5 does.

Reach:

- Journals without "different DOIs for different versions": walked.
  They read the status from `submission_settings`, which only journals
  with the same setting write, so they take other such journals'
  articles only. Checked in the code.
- Journals with it: the publications path has the same fault and reads
  `publication_settings`, so it takes other versioning journals'
  "Needs Sync" versions, older minor versions included (the `stale`
  branch also escapes `p2.publication_id IS NULL`). Checked in the code.
- A journal that deposits automatically loses its own "Needs Sync"
  articles to any journal with automatic deposit listed before it in
  Hosted Journals: the task walks the enabled journals in that order
  (`ContextDAO::getAll(true)`, `ORDER BY seq`), and the first run marks
  them `submitted`. Checked in the code.
- The DOAJ list, its status filter and "Register" never pass
  `EXPORT_STATUS_DEPOSITABLE`, so they are not affected. Checked in the
  code (every `getExportable()` caller).

## Proposed fix

Group the two conditions, in both DAOs, so that the `stale` branch keeps
every other condition of the query. This is how the code base writes an
optional "null or value" condition elsewhere, for example
`RoleDAO::userHasRole()`:
`->where(fn (Builder $q) => $q->whereNull('uug.date_start')->orWhere(…))`.
The [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles/fix.diff)
makes the same change in `classes/submission/DAO.php` and
`classes/publication/DAO.php`:

```diff
-                            fn (Builder $q) => $q->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE),
+                            fn (Builder $q) => $q->where(
+                                fn (Builder $q) => $q->whereNull('pss.setting_value')
+                                    ->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE)
+                            ),
```

It keeps what `pkp/pkp-lib#11589` wanted: a journal's own "Needs Sync"
articles are still sent again. Tried on `main`: with the fix, step 7
shows submission 17 still "Needs Sync" and nothing is queued. With
"Journal of Public Knowledge" depositing automatically itself, its own
"Needs Sync" and "Not Deposited" articles both turn "Submitted", with
the fix and without it.

**Alternatives:**

- A journal check in `DOAJInfoSender::_registerObjects()`: it would
  leave the query wrong for older versions and for any later caller of
  the status.
- Two queries (not deposited, then stale), merged in
  `getAllDepositableArticles()`: more code for the same result.

**What goes with it:**

- A test in OJS that calls `getAllDepositableArticles()` and
  `getAllDepositablePublications()` for one journal while another
  journal with the same versioning setting has an article reading
  "Needs Sync", and expects that article not to be returned.
- No data repair and no backport: only `main`, unreleased, has it.
- The same shape elsewhere, left out here because each is another area
  and none was checked on screen:
  - `APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()` (and OPS's twin)
    adds `where('dot.set_spec', '=', $set)->orWhere('dot.set_spec',
    'like', …)` ungrouped to the deleted-records query, so the exact-set
    branch drops the date and submission conditions that follow it.
  - `PKP\user\Collector::buildUserGroupFilter()` adds
    `where('ug.masthead', 0)->orWhere(…)->orWhereNull(…)` ungrouped for
    `UserMastheadStatus::STATUS_OFF`; nothing passes that status today.
  - `PKP\institution\Collector::getQueryBuilder()` appends
    `orWhereIn()` at the top level for the second and later addresses
    of `filterByIps()`; its only caller, `PKPStatisticsHelper`, passes
    one address.

  The other `orWhere()` calls found in OJS and lib/pkp are grouped.
- The docblocks of `getAllDepositableArticles()` and
  `getAllDepositablePublications()` also name articles "with status
  error", which the query has never selected. The fix leaves that as it
  is, for the team to decide.

Small: one grouped condition in each of two sibling DAOs, and a test.

## Evidence

- Kept script, which takes the Steps through the screens on OJS on a
  fresh load of the default dataset and reads the stored DOAJ statuses
  and the queued jobs beside the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles/walk.js),
  run with
  `PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63a5 node bin/probe.js ojs shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles/walk.js`.
  The walk ran with `job_runner = On` on an install that cannot reach
  DOAJ: the job's attempt failed to connect and the row stayed
  "Submitted". The payload in Observed was read from the `jobs` row
  right after the walk.
- The fix was tried with
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-daily-deposit-takes-other-journals-articles/trial.sh)
  (`node bin/try-fix.js apply <fix.diff> ojs`, the walk and the
  neighbour, then `revert`).
- DOAJ's side, from its public API documentation (<https://doaj.org/api/docs>,
  v4.0.0, read 2026-09-30): an article is refused ("forbidden") when its
  ISSN "belongs to another journal that isn't associated with your
  account". The wrong record carries the depositing journal's own ISSNs
  and key, so it passes that rule and is filed under that journal.
  Whether DOAJ carries out a delete of another account's record with
  that key is not documented. Neither was tried against DOAJ: the test
  install cannot reach it.
- Walked 2026-09-30 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `ojs/main/pgsql` and
  `ojs/stable-3_5_0/pgsql`: main OJS bade233f73 (lib/pkp 2e377d27fc),
  stable-3_5_0 OJS 92b9a16b48 (lib/pkp a9c76aed62). MySQL not checked;
  the fault is in how the query groups its conditions, not in the
  database.
- 3.5, walked: step 3's status filter offers only "Any Status", "Not
  Deposited", "Marked registered" and "Registered", so steps 4–5 cannot
  be taken. Steps 6–7 ran: submission 17 stayed "Marked registered" and
  nothing was queued. In the code, 3.5's
  `plugins/importexport/doaj/DOAJInfoSender.php` calls
  `getUnregisteredArticles()`, whose status condition is a single
  `whereNull()`.
- 3.4, code: `upstream/stable-3_4_0` 9571d8fde7 (lib/pkp df13621c2d).
  `DOAJInfoSender` calls `getUnregisteredArticles()`, and
  `classes/submission/DAO.php` has no "stale" status and no `orWhere()`.
  3.3, code: `upstream/stable-3_3_0` 9fdb9bcf9a (lib/pkp d446601ebe).
  `SubmissionDAO::getExportable()` is an SQL string whose
  not-deposited condition is `AND pss.setting_value IS NULL`.
- Introduced: `git blame` on the line in `classes/submission/DAO.php`
  gives 2868948ee8 (`pkp/ojs#5125`, merged 2025-10-07). The same line in
  `classes/publication/DAO.php` blames to
  [b10a6cb667](https://github.com/pkp/ojs/commit/b10a6cb667fd6ee041d1393e82b9f16c479c1f43)
  (2025-06-30, `pkp/ojs#4985`, merged 2025-10-04), which added the
  "stale" status and `getAllDepositableArticles()`; the submission DAO
  did not handle that status until 2868948ee8. No later change touches
  the line. Read on the pkp side: `pkp/pkp-lib#11589`, `#11593`,
  `#13195` and the two PRs; none reports this fault.
- Not walked, read in the code: the `DOAJDelete` path, the publications
  path and the journal order.
