# The daily DOAJ deposit sends other journals' "Needs Sync" articles and unpublished versions to DOAJ

- **Severity** high
- **Effort** small
- **Kind** regression
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (no "Needs Sync" status)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#5125` for `pkp/pkp-lib#11589` (the submission DAO line) · [2868948ee8](https://github.com/pkp/ojs/commit/2868948ee805d2a3a8b6675bd3902fb789c9cafa) · 2025-10-07 · Bozana Bokan (bozana); the publication DAO line `pkp/ojs#4985` · [b10a6cb667](https://github.com/pkp/ojs/commit/b10a6cb667fd6ee041d1393e82b9f16c479c1f43) · merged 2025-10-04 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-06)
- **Tracked in** spec U63 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a5)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-06: the report now also covers unpublished content sent
to DOAJ, which a single-journal installation meets too, and carries the
`security` label. Since `pkp/pkp-lib#7527` a deposit by the wrong
journal names the article's own journal and ISSNs; the Steps' Observed
follows.

## Summary

On an installation that hosts several journals, the daily automatic
DOAJ deposit of one journal also takes the articles of other journals
whose DOAJ status reads "Needs Sync". It sends them to DOAJ with its own
API key and with a link built on its own address, where the site shows
"not found". The article's own journal sent nothing, yet its DOAJ list
now reads "Submitted".

The deposit also sends what is not published, on a single-journal
installation too. An article that was deposited and then unpublished
goes to DOAJ, its link showing readers "not found" (with "DOI
Versioning" on, only when it already read "Needs Sync"). When it has
a new version that nobody published, the deposit carries that draft's
title and metadata.

Nobody is told, and the article's journal has no setting that stops
another journal from taking it. Even when the article's journal
deposits automatically itself, a journal listed before it on "Hosted
Journals" takes the article first. Journals take each other's items
only when "DOI Versioning" is set the same way in both: articles between
journals that have it off, versions between journals that have it on. A
journal that has it on also sends its own versions that a later minor
version replaced. An
article reads "Needs Sync" once it has been deposited to DOAJ (or marked
as deposited) and its current version is then published again or
replaced by a newly published version; with "DOI Versioning" off,
unpublishing it does so too.

## Impact

- **Lost.** A correct DOAJ record. Other journals' articles go under the
  wrong journal's account and link, and an unpublished article goes out
  with the metadata of a draft nobody approved for publication. Each
  time an article reads "Needs Sync" again, the next run deposits it
  again. When another journal's deposit finds a DOAJ record stored under
  a different link, the run first sends DOAJ a request to delete that
  record; a journal's own unpublished article keeps its link, so it is
  deposited again without a delete.
- **Who.** A journal that deposits to DOAJ automatically, once it
  unpublishes a deposited article (with "DOI Versioning" on, only a
  version unpublished while it already reads "Needs Sync"). And a
  journal with an article in "Needs Sync", on an installation where
  another journal deposits automatically. A new version, or unpublishing
  and publishing again, is ordinary editorial work.
- **Way round.** Turning automatic deposit off stops it, and deposits
  then become manual ("Register" on the DOAJ lists). For other journals'
  deposits it has to be off in every other journal of the installation,
  which only their managers or the administrator can do. A manager who
  notices a wrong journal's deposit can press "Register" in their own
  journal, which first asks DOAJ to delete the record the other journal
  made; that holds until the article next reads "Needs Sync". The DOAJ
  tool has no action that withdraws a record from DOAJ, and an
  unpublished article has no row on its lists.

High: what a journal sends to an index goes out wrong, silently,
unpublished drafts included, in an ordinary setup that is not the
default (automatic DOAJ deposit). It would be critical if most
installations deposited to DOAJ automatically.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Its one
  journal, `publicknowledge`, has no DOAJ API key and automatic deposit
  off.
- An install that cannot reach `doaj.org`, so that no made-up key goes
  to DOAJ: in `config.inc.php`, section `[proxy]`, set
  `https_proxy = "http://127.0.0.1:9"`, a port nothing answers. An
  install that reaches DOAJ is covered after Observed.
- For the other journals' articles only: a second journal, which the
  dataset lacks, with DOAJ automatic deposit on. Steps 1–3 create it. It
  has no articles.

Other journals' articles. Second journal, as the Site Administrator:
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
11. As `admin`, open Administration › "View Jobs", which lists a queued
    deposit without its content. The install runs queued jobs on page
    loads (the dataset's config has `job_runner = On`), so open "View
    Failed Jobs" next, reloading it until the deposit is listed there,
    and open its "Details": the "Payload" is shown only there.
12. Open the article link that the "Payload" carries.

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

Content that is not published (one journal, no second journal), as
`dbarnes`:

1. Open `publicknowledge`'s "DOAJ Export Plugin", tab "Settings". Type
   any value in "DOAJ API Key", tick "OJS will deposit articles
   automatically to DOAJ. …", and press "Save".
2. Tab "Articles": tick submission 17 and press "Mark registered". It
   reads "Marked registered".
3. Open submission 17. In the "Publication" menu, choose "Create New
   Version" and press "Confirm".
4. Under the new version, open "Title & Abstract", change "Title" to
   "Draft title, not published", and press "Save".
5. Under "Version of Record 1.0", open "Title & Abstract", press
   "Unpublish", then "Unpublish" in the confirmation. Submission 17 has
   no published version now, and the DOAJ "Articles" tab no longer
   lists it.
6. Take steps 9, 11 and 12 above, opening the link signed out.

**Expected:** `publicknowledge` has no API key and does not deposit
automatically, so submission 17 still reads "Needs Sync". The second
journal has no articles, so the run sends nothing and queues no job. On
the one-journal path, submission 17 has nothing published, so nothing of
it goes to DOAJ; the run sends the journal's one published "Not
Deposited" article, submission 1 "The Signalling Theory Dividends".

**Observed:** submission 17 reads "Submitted". "View Jobs" lists one
job, `APP\plugins\generic\doaj\jobs\DOAJRegister`.

The job is the second journal's deposit of submission 17. Its "Payload"
names `publicknowledge` and its ISSNs, but links the article on the
second journal's address:

```
"journal":{"publisher":"Public Knowledge Project","title":"Journal of Public Knowledge","issns":["0378-5955","0378-5955"],…},
"link":[{"url":"http://…/index.php/u63ir1/article/view/17","type":"fulltext","content_type":"html"}]
```

That link answers 404 with the page "404 Not Found". The job then fails,
as DOAJ cannot be reached, and its "Exception" names the request it
sent with the second journal's API key: `…for
https://doaj.org/api/articles?api_key=<the second journal's key>`.

With "DOI Versioning", the row of "VoR 1.0" reads "Submitted" and the
second journal queues the deposit of that version, linked as
`…/index.php/u63ir1/article/view/17/version/18`.

On the one-journal path, "View Jobs" lists two `DOAJRegister` jobs, one
for submission 1 and one for submission 17. Submission 17's "Payload"
carries the unpublished draft's title and the article's address:

```
"title":"Draft title, not published", …
"link":[{"url":"http://…/index.php/publicknowledge/article/view/17","type":"fulltext","content_type":"html"}]
```

Signed out, that link answers 404 with "404 Not Found".

On an install that reaches DOAJ, when DOAJ refuses the made-up key, the
row reads "Failed" instead of "Submitted" once the job has run, and the
failed job's "Exception" holds DOAJ's reply, not the request with its
key. The "Payload" is the same, and its link names the journal that
sent it (read in the code, not walked).

Control: when `publicknowledge` deposits automatically itself (its own
key saved and the box ticked before step 9), the run sends submission
17 and its "Not Deposited" submission 1 in `publicknowledge`'s own
name, with links on its own address. A journal's deposit of its own
published articles works; here `publicknowledge` also comes first on
"Hosted Journals".

## Cause

`APP\submission\DAO::getExportable()` (ojs `classes/submission/DAO.php`)
builds the list of a journal's articles to deposit. For the status
`EXPORT_STATUS_DEPOSITABLE`, which `getAllDepositableArticles()` (ojs `classes/plugins/PubObjectsExportPlugin.php`) asks
for, the faulty line, line 96, adds:

```php
fn (Builder $q) => $q->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', PubObjectsExportPlugin::EXPORT_STATUS_STALE),
```

`when()` hands its closure the whole query, not a group, so the
`orWhere()` sits at the top level. The SQL reads `… WHERE s.context_id
= ? AND p.version_stage IN (…) AND p.status = 3 AND pss.setting_value
IS NULL OR pss.setting_value = 'stale'`. The second branch carries none
of the other conditions: every submission of the installation whose
`doaj::status` is `stale` matches, whatever its journal and whether or
not its current version is published.

`APP\publication\DAO::getExportable()` (`classes/publication/DAO.php`)
has the same line, line 137. `getAllDepositablePublications()` uses it
for a journal with "DOI Versioning", so it takes every `stale`
publication of the installation.

`DOAJInfoSender::_getJournals()` picks the journals with the DOAJ plugin
on, an `apiKey` and `automaticRegistration`, from
`ContextDAO::getAll(true)` (enabled journals, `ORDER BY seq`).
`executeActions()` runs these queries for each of them, and
`_registerObjects()` builds each item's JSON with that journal as the
context (`exportJSON()`, `DOAJJsonFilter`): the article URL on that
journal's path, and the journal's title, ISSNs and publisher from the
identity stamped on the publication when it was published
(`getPrimaryContextName()`, `getPrintIssn()`, `getOnlineIssn()`,
`getPublisher()`), falling back to that journal's own when none is
stamped. `DOAJExportPlugin::depositXML()` then queues `DOAJRegister`,
which sends it with that journal's key, and sets the article's status to
`submitted`. The next journal in the order then finds nothing to send.

On 3.5 and older the task asks only for "Not Deposited" articles
(`EXPORT_STATUS_NOT_DEPOSITED`, a plain `whereNull`), and a journal
sends only its own published articles.

Reach:
- A journal without "DOI Versioning" takes only other non-versioning
  journals' articles (statuses in `submission_settings`); a versioning
  journal takes only versioning journals' versions (statuses in
  `publication_settings`). Both walked.
- The `stale` branch also drops `p.status = 3` and the version stages.
  In a journal without "DOI Versioning", unpublishing a registered
  article's current version marks it `stale`
  (`PubObjectsExportGenericPlugin::handlePublicationUnpublishing()`), so
  any depositing journal sends it, its own included. The Steps have an
  unpublished new version; without one, unpublishing marks the article
  the same way and the query takes it the same way, so the unpublished
  version itself is sent (read in the code). With "DOI Versioning",
  unpublishing a version of record marks nothing; it marks the previous
  minor version only when a minor version is unpublished, so there only
  a version unpublished while it reads "Needs Sync" is sent (read in the
  code). When no
  version is published, `Repository::getCurrentPublicationIdByPublications()`
  makes the latest version current, and `DOAJJsonFilter` exports
  `getCurrentPublication()`: an unpublished new version's metadata goes
  out (walked).
- The publications' `stale` branch also drops `p2.publication_id IS
  NULL` (the latest minor version only). So a version that a later
  minor version replaced is sent beside it, by its own journal too
  (read in the code; seen in the register entry's probe).
- `tools/stampIdentityMetadata.php`, which re-stamps a journal's
  identity onto its published articles, marks each registered one
  `stale` (`handleIdentityRestamped()`), so one run of it hands them all
  to the next depositing journal (read in the code).
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
job queued, with and without "DOI Versioning"; on the one-journal path
only submission 1 is sent and submission 17 is not. The control (a
journal depositing its own "Needs Sync" and "Not Deposited" articles)
still gives the same two jobs in `publicknowledge`'s name, fix in or
out.

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
wanted: a journal's own published "Not Deposited" and "Needs Sync"
items still go in one run. Both branches again keep to published
versions of record, which `pkp/pkp-lib#11593` names as the only ones
registration considers.

A search of OJS, OMP, OPS and pkp-lib for an `orWhere()` chained at
the top level of a `when()` closure found only these two lines.

Left out:
- The docblocks of `getAllDepositableArticles()` and
  `getAllDepositablePublications()` promise items "with status error",
  which neither query includes, before the fix or after it. Whether a
  failed deposit should be retried daily is a separate question.
- With the fix, an article unpublished after its deposit stays "Needs
  Sync" and is not sent. Whether DOAJ should be asked to remove its
  record is a product question, as on 3.5, where unpublishing tells
  DOAJ nothing either.

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
  (`versioning` as an argument takes the "DOI Versioning" path,
  `unpublished` the one-journal path, `neighbour` the control). It runs
  step 9's command itself, and gives the second journal and the draft
  title a generated tag where the Steps say `u63ir1` and "Draft title,
  not published".
- Walked 2026-10-06 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [5a53d3d](https://github.com/pkp/datasets/commit/5a53d3dc4d85eacde1a042c5a0e40446f357cb09)
  (2026-10-05), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS 1f4cef786f (lib/pkp a7f5e3081b), all four ways.
  - stable-3_5_0: OJS 4342473090 (lib/pkp 771474347e), plain and
    `unpublished`, with the task named
    `APP\plugins\importexport\doaj\DOAJInfoSender`: submission 17 stays
    "Marked registered" and nothing of it is sent. 3.5 deposits
    synchronously, so a deposit DOAJ does not receive leaves no job and
    no status.
  - MySQL not checked; the fault is in the query's logic, not the
    database.
- Unverified, since no walk reached DOAJ:
  - whether DOAJ accepts a deposit sent with one journal's key for
    another journal's article, and whether it shows the draft metadata
    it receives;
  - whether DOAJ carries out a delete request for a record made under
    another account's key, both the wrong journal's delete of an
    existing record and the "Register" way round. So whether the
    article's correct record is lost is not known;
  - the deposit of an unstamped publication (one published before
    `pkp/pkp-lib#7527`, never re-stamped), which falls back to the
    depositing journal's title and ISSNs (read in the code).
- 3.4, by code, ojs `stable-3_4_0` at d68934d0d1: `DOAJInfoSender`
  calls `getUnregisteredArticles()` (`EXPORT_STATUS_NOT_DEPOSITED`);
  `classes/submission/DAO.php` has no `DEPOSITABLE` branch.
- 3.3, by code, ojs `stable-3_3_0` at ac77c9fb35:
  `DOAJInfoSender.inc.php` calls `getUnregisteredArticles()`;
  `SubmissionDAO::getExportable()` adds `AND pss.setting_value IS NULL`.
- Upstream: pkp/pkp-lib, pkp/ojs, issues and PRs, searched for "DOAJ
  automatic deposit", "DOAJ other journals", "DOAJ stale", "needs sync",
  "DOAJ unpublished", "DOAJ automatic registration", `getExportable`,
  `getAllDepositableArticles` and `EXPORT_STATUS_DEPOSITABLE`. The hits
  (`pkp/pkp-lib#11589`, `#11593`, `#7527`, `#13096`) are the features
  and fixes around it, not this fault.
