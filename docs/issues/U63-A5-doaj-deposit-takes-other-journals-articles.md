# One journal's daily DOAJ deposit sends other journals' "Needs Sync" articles to DOAJ as its own

- **Severity** high
- **Effort** small
- **Kind** regression
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (no "Needs Sync" status)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#5125` for `pkp/pkp-lib#11589` · [2868948ee8](https://github.com/pkp/ojs/commit/2868948ee805d2a3a8b6675bd3902fb789c9cafa) · 2025-10-07 · Bozana Bokan (bozana); the publication DAO line `pkp/ojs#4985` · [b10a6cb667](https://github.com/pkp/ojs/commit/b10a6cb667fd6ee041d1393e82b9f16c479c1f43) · merged 2025-10-04 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an installation that hosts several journals, the daily automatic
DOAJ deposit of one journal also takes the articles of other journals
whose DOAJ status reads "Needs Sync". It sends them to DOAJ with its
own API key and as its own articles: under its own journal name and
ISSNs, with a link built on its own address, where the site shows "not
found". The article's own journal sent nothing, yet its DOAJ list now
reads "Submitted".

Nobody is told, and the article's journal has no setting that prevents
it. Even when that journal deposits automatically itself, a journal
listed before it on "Hosted Journals" takes the article first. A
journal without "DOI Versioning" takes the articles of other journals
without it; a journal with "DOI Versioning" takes the versions of other
journals with it. A journal with "DOI Versioning" also sends its own
versions that a later minor version replaced, on a single-journal
installation too.

An article reads "Needs Sync" once it has been deposited to DOAJ (or
marked as deposited) and its current version is then unpublished,
published again or replaced by a newly published version.

## Impact

- **Lost.** The article's update in DOAJ, which its own journal never
  sends, and a correct DOAJ record: each run that takes an article
  sends another deposit under the wrong journal, so wrong deposits add
  up with every new version. Where the article already has a DOAJ
  record, the run first sends DOAJ a request to delete it, with the
  wrong journal's key.
- **Who.** Every journal whose articles DOAJ already holds (deposited
  or marked registered), on an installation where another journal
  deposits to DOAJ automatically; a journal that never deposited is not
  affected. It meets each such article once a new version is published
  or the article is unpublished and published again, which is ordinary
  editorial work. With "DOI Versioning", a journal that deposits
  automatically also sends its own replaced minor versions, on a
  single-journal installation too. Only the development version
  (`main`) has the fault; no released version does.
- **Way round.** None that prevents it. A manager who notices can tick
  the article and press "Register" in their own journal. When the other
  journal's deposit was accepted, that first sends DOAJ a request to
  delete the record it made, then deposits the article again.

High: what a journal sends to an index goes out wrong, silently, in an
ordinary setup that is not the default (several journals and a DOAJ
API key on one of them). It would be critical if most installations
hosted several journals with automatic DOAJ deposit on.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Its one
  journal, `publicknowledge`, has no DOAJ API key and automatic deposit
  off, and that does not change.
- A second journal, which the dataset lacks, with DOAJ automatic
  deposit on. Steps 1–3 create it. It has no articles.

Second journal, as the Site Administrator:
1. Sign in as `admin`. Administration › "Hosted Journals" › "Create
   Journal": "Journal title" "Second Journal", "Journal initials" "SJ",
   a contact name and email, "Country" "Canada", path `u63ir1`,
   English as the language and primary locale, and tick "Enable this
   journal to appear publicly on the site". Press "Save".
2. Open `/index.php/u63ir1/en/management/importexport/plugin/DOAJExportPlugin`
   (Tools › "Import/Export" › "DOAJ Export Plugin"), tab "Settings".
   "DOAJ Plugin" is on by default for a new journal.
3. Type any value in "DOAJ API Key", tick "OJS will deposit articles
   automatically to DOAJ. …", and press "Save".

An article of `publicknowledge` that needs a sync, as its editor:

4. Sign in as `dbarnes`. Open `publicknowledge`'s "DOAJ Export Plugin",
   tab "Articles". Submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran", reads "Not Deposited".
5. Tick it and press "Mark registered". It reads "Marked registered".
6. Open submission 17, "Publication", and press "Unpublish", then
   "Unpublish" in the confirmation.
7. Press "Schedule For Publication", "Confirm" in "Review Publishing
   Details", and "Publish".
8. Back on the DOAJ "Articles" tab, submission 17 reads "Needs Sync".

The daily task:

9. Wait for the daily "DOAJ automatic registration task" (run by the
   server's scheduler at midnight), or run it now from the OJS
   directory:
   `php lib/pkp/tools/scheduler.php test --name='APP\plugins\generic\doaj\DOAJInfoSender'`
10. As `dbarnes`, open `publicknowledge`'s DOAJ "Articles" tab again.
11. As `admin`, open Administration › "View Jobs". The install runs
    queued jobs on page loads (the dataset's config has `job_runner =
    On`), so the job may already have run by then. It is then listed on
    "View Failed Jobs" when DOAJ could not be reached or refused it.
    Open its "Details" there.
12. Open the article link that the job's "Payload" carries.

With "DOI Versioning" (the versions' path):

- Before step 4, as `admin`, in `u63ir1` and then in `publicknowledge`:
  Settings › Distribution › "DOIs" › "Setup". Keep "Allow Digital
  Object Identifiers (DOIs) to be assigned to work published in this
  journal." ticked (a new journal has it ticked), type a "DOI Prefix"
  such as `10.99999` when the box is empty, choose "Yes, assign a
  unique DOI to every version of an article." under "DOI Versioning",
  and press "Save".
- Take steps 4–10 on the DOAJ tab "Publications" instead of
  "Articles". In step 5, tick the row of submission 17 whose
  "Publication Stage" reads "VoR 1.0".

**Expected:** `publicknowledge` has no API key and does not deposit
automatically, so submission 17 still reads "Needs Sync". The second
journal has no articles, so the run sends nothing and queues no job.

**Observed:** submission 17 reads "Submitted". "View Jobs" lists one
job: "ID" 16, "Job" `APP\plugins\generic\doaj\jobs\DOAJRegister`,
"Queue" `queue`, "Created At" 2026-10-01 9:05:37.

The job is the second journal's deposit of submission 17. Its "Payload"
names the second journal as the article's journal and links the
article on the second journal's address:

```
"journal":{"title":"Second Journal …","volume":1,"number":"2"}, "title":"Antimicrobial, heavy metal resistance …",
"link":[{"url":"http://…/index.php/u63ir1/article/view/17","type":"fulltext","content_type":"html"}]
```

That link answers 404 with the page "404 Not Found". The test install
cannot reach DOAJ, so the job then fails and "View Failed Jobs" lists
it. Its "Exception" shows the request it sent to
`https://doaj.org/api/articles` with the second journal's API key.

With "DOI Versioning", the row of "VoR 1.0" reads "Submitted" and the
second journal queues the deposit of that version, linked as
`…/index.php/u63ir1/article/view/17/version/18`.

Control: when `publicknowledge` deposits automatically itself (its own
key saved and the box ticked before step 9), the run sends submission
17 and its "Not Deposited" submission 1 in `publicknowledge`'s own
name, with links on its own address. A journal's deposit of its own
articles works; here `publicknowledge` also comes first on "Hosted
Journals".

## Cause

`APP\submission\DAO::getExportable()` (ojs `classes/submission/DAO.php`)
builds the list of a journal's articles to deposit. For the status
`EXPORT_STATUS_DEPOSITABLE`, which `getAllDepositableArticles()` asks
for, the faulty line, line 96, adds:

```php
fn (Builder $q) => $q->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE),
```

`when()` hands its closure the whole query, not a group, so the
`orWhere()` sits at the top level. The SQL reads `… WHERE s.context_id
= ? AND p.version_stage IN (…) AND p.status = 3 AND pss.setting_value
IS NULL OR pss.setting_value = 'stale'`. The second branch carries none
of the other conditions: every submission of the installation whose
`doaj::status` is `stale` matches, whatever its journal.

`APP\publication\DAO::getExportable()` (`classes/publication/DAO.php`)
has the same line, line 137. `getAllDepositablePublications()` uses it
for a journal with "DOI Versioning", so it takes every `stale`
publication of the installation.

`DOAJInfoSender::_getJournals()` picks the journals with the DOAJ plugin
on, an `apiKey` and `automaticRegistration`, from
`ContextDAO::getAll(true)` (enabled journals, `ORDER BY seq`).
`executeActions()` runs these queries for each of them, and
`_registerObjects()` builds each item's
JSON with that journal as the context (`exportJSON()`, `DOAJJsonFilter`:
the journal's title, ISSNs and the article URL on its path).
`DOAJExportPlugin::depositXML()` then queues `DOAJRegister`, which
sends it with that journal's key, and sets the article's status to
`submitted`. The next
journal in the order then finds nothing to send.

On 3.5 and older the task asks only for "Not Deposited" articles
(`EXPORT_STATUS_NOT_DEPOSITED`, a plain `whereNull`), and a journal
sends only its own.

Reach:
- A journal without "DOI Versioning" takes only other non-versioning
  journals' articles (statuses in `submission_settings`); a versioning
  journal takes only versioning journals' versions (statuses in
  `publication_settings`). Both walked.
- The `stale` branch also drops `p.status = 3` and the version stages.
  So an article left unpublished after it was registered, which also
  reads "Needs Sync", is sent to DOAJ by any depositing journal, its
  own included (read in the code, not walked).
- The publications' `stale` branch also drops `p2.publication_id IS
  NULL` (the latest minor version only). So a version that a later
  minor version replaced is sent beside it, by its own journal too
  (read in the code; seen in the register entry's probe).
- When the article already holds a DOAJ id and its stored DOI or URL
  differs (the other journal's URL always does), `depositXML()` queues
  `DOAJDelete` instead of `DOAJRegister` and returns.
  `DOAJDelete::handle()` sends the delete with the depositing journal's
  key and then dispatches `DOAJRegister` itself (read in the code).
- Only the DOAJ task asks for `EXPORT_STATUS_DEPOSITABLE`. The DOAJ
  lists and their status filter, Crossref, DataCite and PubMed are not
  affected. OMP and OPS have no DOAJ plugin.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/fix.diff):
with it, the Steps end with submission 17 still "Needs Sync" and no
job queued, with and without "DOI Versioning". The control (a journal
depositing its own "Needs Sync" and "Not Deposited" articles) still
gives the same two jobs in `publicknowledge`'s name, fix in or out.

Recommended: one fault in two places, the same line in two sibling
DAOs. Group the two status conditions in both, so the `OR` stays
inside the status filter.

```diff
-fn (Builder $q) => $q->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE),
+fn (Builder $q) => $q->where(fn (Builder $q) => $q->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE)),
```

The nested `where(fn …)` is how the code base writes an `OR` inside a
larger query (pkp-lib `RoleDAO` lines 50–51,
`NotificationSubscriptionSettingsDAO` lines 108–109). The DAOs own the
query, so the fix covers every caller. It keeps what `pkp/pkp-lib#11589`
wanted: a journal's own "Not Deposited" and "Needs Sync" items still go
in one run.

A search of OJS, OMP, OPS and pkp-lib for an `orWhere()` chained at
the top level of a `when()` closure found only these two lines.

Left out: the docblocks of `getAllDepositableArticles()` and
`getAllDepositablePublications()` promise items "with status error",
which neither query includes, before the fix or after it. Whether a
failed deposit should be retried daily is a separate question from this
fault, so the fix leaves it as it is.

**Alternatives:**
- Filter the journal in `DOAJInfoSender`, or check the context in
  `getAllDepositableArticles()`: it leaves the other dropped conditions
  (published, version stage, latest minor version) wrong and the DAO
  open to the next caller.

**What goes with it:**
- No data repair and no backport (Affects).
- Callers: only the DOAJ task changes. It now skips other journals'
  items and its own unpublished or replaced versions.
- Guard: a test in ojs `tests/` (the DAOs are ojs's), on pkp-lib's
  `DatabaseTestCase` as `tests/jobs` already uses it, of
  `getExportable()` with `EXPORT_STATUS_DEPOSITABLE` over two journals,
  each with a `stale` and an unpublished `stale` item; and an e2e
  scenario in U63 for the daily task with two journals.

Small: one line in each of two sibling DAOs of one repo, following a
pattern the code base already uses, and a test.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/lib.js),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset` with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/walk.js`
  (`versioning` as an argument takes the "DOI Versioning" path;
  `neighbour` adds the control). The script runs step 9's command
  itself and reads the `jobs` and `failed_jobs` tables beside the
  screens.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/doaj-deposit-takes-other-journals-articles/fix.diff ojs`,
  then walk.js plain, with `versioning`, and with `neighbour`, then
  `node bin/try-fix.js revert …/fix.diff ojs`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc);
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), the same steps
    with the task named `APP\plugins\importexport\doaj\DOAJInfoSender`.
    Code read: `DOAJInfoSender` asks `getUnregisteredArticles()`
    (`EXPORT_STATUS_NOT_DEPOSITED`).
  - MySQL not checked; the fault is in the query's logic, not the
    database.
- Unverified, since no walk reached DOAJ:
  - whether DOAJ accepts a deposit sent with one journal's key and
    ISSNs for another journal's article;
  - whether DOAJ carries out a delete request for a record made under
    another account's key, both the wrong journal's delete of an
    existing record and the "Register" way round. So whether the
    article's correct record is lost is not known;
  - the row on an install that reaches DOAJ with a made-up key, where
    `registerObject()` sets "Failed" on DOAJ's refusal (read in the
    code);
  - whether the export of an unpublished "Needs Sync" article succeeds
    and is sent (the Reach's unpublished case; not walked).
- 3.4, by code, ojs `stable-3_4_0` at 9571d8fde7: `DOAJInfoSender`
  calls `getUnregisteredArticles()` (`EXPORT_STATUS_NOT_DEPOSITED`);
  `classes/submission/DAO.php` has no `DEPOSITABLE` branch.
- 3.3, by code, ojs `stable-3_3_0` at 9fdb9bcf9a:
  `DOAJInfoSender.inc.php` calls `getUnregisteredArticles()`;
  `SubmissionDAO::getExportable()` adds `AND pss.setting_value IS NULL`.
- Introduced: `git blame` on the two lines gives 2868948ee8 (submission
  DAO, "consider EXPORT_STATUS_DEPOSITABLE in submission DAO", merged
  as `pkp/ojs#5125` on 2025-10-07) and b10a6cb667 (publication DAO and
  `getAllDepositable*()`, "Consider JAV versions for indexing", merged
  as `pkp/ojs#4985` on 2025-10-04). Both are for `pkp/pkp-lib#11589`.
- Upstream: pkp/pkp-lib, pkp/ojs, issues and PRs, searched for "DOAJ
  automatic deposit", "DOAJ other journals", "DOAJ stale", "needs sync",
  `getExportable`, `getAllDepositableArticles` and
  `EXPORT_STATUS_DEPOSITABLE`.
