# A preprint server's monthly statistics email reads "Accepted submissions this month:" with no number

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; the 3.3 email lists no figures)
- **Introduced** `pkp/ops#240` for `pkp/pkp-lib#7265` · [1cd7aad](https://github.com/pkp/ops/commit/1cd7aad47c4b523d7d5f74bb95c1220b11c50f3a) · 2022-02-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** U65 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#ops4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The monthly statistics email a preprint server sends its managers and
moderators lists four figures, and one of them, "Accepted submissions
this month:", has nothing after it. A preprint server records no
acceptances, so there is no number to give; the line should not be in a
preprint server's email at all. The other three figures are right.

The email goes out once, in the server's primary language. Servers in
English, Bulgarian, Czech, German, Macedonian, Portuguese (Brazil) or
Ukrainian get the line in their language. Where OPS's translation of
this email is empty (Catalan, Spanish, French (Canada), Norwegian
Bokmål), the server is sent its English text, line included.

The proposed fix also reaches existing servers: their upgrade removes
the line from the template they already store, unless a manager has
reworded it.

## Impact

- **Lost**: nothing; the email carries a label with no value, which
  reads as a missing or broken figure.
- **Who**: the managers and moderators of every preprint server, on the
  first of each month. Sending the email is on by default.
- **Way round**: a manager deletes the line on Settings › Workflow ›
  "Emails" › "Manage Emails" › "Statistics Report Notification", in the
  primary language's body, for that server only.

Low: a label with no value in an email whose figures are right; nothing
is lost and nothing reads the line.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (server `publicknowledge`,
  "Public Knowledge Preprint Server"). Nothing else: the server sends
  the monthly email (Settings › Workflow › "Emails", "Editorial
  statistics", on in the dataset), and `rvaca` (Preprint Server manager)
  receives it.
- Mail: the dataset's `config.inc.php` sends all mail by SMTP to
  `localhost:1025`, so the install needs a mail catcher listening there
  (Mailpit, as on PKP's CI).

The template, as the server holds it:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Emails" and press "Add and edit
   templates". The "Manage Emails" page opens.
3. Type "Statistics Report Notification" in the search box and press
   the row's "Edit". The window "Edit Template" opens with the body.
4. Read the list of figures in the body.

The email, as it is sent:

5. The routine task sends the email on the first of each month. To send
   it now, run in the app's directory
   `php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`,
   then `php lib/pkp/tools/jobs.php run`.
6. In the mail catcher, open `rvaca@mailinator.com`'s email "Preprint
   Server activity for September, 2026" (the previous month) and read
   the list of figures.

**Expected**: the list names only figures a preprint server has, in
the template (step 4) and in the email (step 6):

```
New submissions this month: 0
Declined submissions this month: 0
Total submissions in the system: 19
```

**Observed**: the template (step 4) holds a fourth item, "Accepted
submissions this month: {$acceptedSubmissions}", and the email's text
part (step 6) reads:

```
* New submissions this month: 0
* Declined submissions this month: 0
* Accepted submissions this month:
* Total submissions in the system: 19
```

The HTML part's list reads the same. On OJS and OMP the same steps read
"Accepted submissions this month: 0".

## Cause

OPS's English email text `emails.statisticsReportNotification.body`
(`locale/en/emails.po`, line 202) keeps the list item
`<li>Accepted submissions this month: {$acceptedSubmissions}</li>`.
OPS's text was copied from OJS's when the monthly email was added for
`pkp/pkp-lib#4844`, and kept that item. OPS's
`registry/emailTemplates.xml` installs the template
`STATISTICS_REPORT_NOTIFICATION` from this string.

The value comes from OPS's
`APP\services\StatsEditorialService::getOverview()`, which has had no
`submissionsAccepted` figure since 2022: `pkp/pkp-lib#7709` took it out
because a preprint server has no accept decision, so the figure always
read 0.

The shared mailable `PKP\mail\mailables\StatisticsReportNotify::setupStatisticsVariables()`
then sets `acceptedSubmissions` to `null`
(`$trends['submissionsAccepted'] ??= null;`, added in lib/pkp 9c5d83afab
to stop a PHP warning on OPS), and the mailer renders a null variable as
nothing.

Reach:

- Every OPS install stores the template once per installed language
  (`email_templates_default_data`). The line is in the stored text of
  English, `bg`, `cs`, `de`, `mk`, `pt_BR` and `uk` (`pt_BR` labels it
  "Submissões postadas no mês", posted submissions, but it is the same
  blank variable). The `ca`, `es`, `fr_CA` and `nb_NO` translations are
  empty, so the stored body in those languages is empty (seen for
  `fr_CA` on screen). `StatisticsReportMail::handle()` reads the body
  in the server's primary language with `getLocalizedData()`, which
  falls back to another language's non-empty body, English where the
  server has it (checked in the code).
- A server whose manager edited the template holds its own copy
  (`email_templates_settings`) with the line unless it was removed
  there (checked in the code).
- The attachment `editorial-report.csv` and the "Editorial Activity"
  page read the same overview and list no acceptance on OPS (checked in
  the code).
- The template editor's variable list still offers
  `acceptedSubmissions` ("The number of accepted submissions") on OPS,
  from the shared mailable's `getDataDescriptions()` (checked in the
  code). A manager who inserts it gets the same blank.

## Proposed fix

Take the list item out of OPS's email text, and out of the templates
installs already store.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/fix.diff),
against the OPS root, does both:

- It deletes the `<li>…{$acceptedSubmissions}</li>` line from
  `emails.statisticsReportNotification.body` in OPS's
  `locale/{en,bg,cs,de,mk,pt_BR,uk}/emails.po`, so new installs store a
  three-item list.
- It adds one loop to OPS's upgrade step
  `APP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks::up()`:

```php
foreach ([
    'Accepted submissions this month: {$acceptedSubmissions}',
    'Приети публикации този месец: {$acceptedSubmissions}',
    // … cs, de, mk, pt_BR, uk
] as $line) {
    $this->replace('STATISTICS_REPORT_NOTIFICATION', '<li>' . $line . '</li>', '');
}
```

`replace()` changes the stored default text and a server's edited copy
only where the exact item is still there, so it leaves a reworded copy
alone and changes nothing on a second run.

Why this step and not a new one: `I13128_FixEmailUrlLinks` is the
released step that corrects mistakes in OPS's shipped email texts,
translations included, and `dbscripts/xml/upgrade.xml` already lists it
twice. The `3.5.0.0`–`3.5.0.99` block runs it on every 3.5.0 patch
upgrade, and the `3.3.0.0`–`3.5.9.9` block runs it again on the upgrade
to 3.6 ("Already executed with 3.5.0-6 but idempotent"). Adding to it
reaches both with no change to `upgrade.xml`. If the team prefers a step
named after this issue, it needs the same two entries.

Why remove the line rather than fill it: OPS's `getOverview()` already
returns `submissionsPublished`, which, called with the month's dates,
counts the preprints first posted that month (later versions are not
counted), and the mailable never uses it. Relabelling the line as
"Preprints posted this month" with that figure is the alternative. It
needs a new variable in the shared lib/pkp mailable as well as the OPS
text, so two repositories. Its stored-template repair cannot write the
new label in the six translated templates, since no translation of it
exists yet. Removal needs neither, matches what `pkp/pkp-lib#7709` did
to the statistics, and leaves the posted count free to be added later as
a feature of its own.

Tried on OPS `main`: on PKP's 3.5 test dataset upgraded by the patched
code, and on the `main` dataset after
`php lib/pkp/tools/installEmailTemplate.php STATISTICS_REPORT_NOTIFICATION en,fr_CA`
(which stores the template as a new install does), the Steps showed the
Expected in the template and in the received email.

**Alternatives**

- Fill the line with the posted preprints of the month, as above.
- Fix only the locale files. Then only new installs lose the line, and
  every existing server, which is every server until 3.6, keeps it.
- Drop the item in the shared mailable at send time. A template is
  text a manager owns, and rewriting it on the fly would also rewrite
  their edits.

**What goes with it**

- Translations: the diff edits the six translated `emails.po` files
  directly, because they would otherwise keep the blank item. It lands
  on `stable-3_5_0` and `main` together, as `pkp/pkp-lib#13128` edited
  these same files on both branches, so the next translation sync on
  either branch does not bring the line back.
- Left out: the variable list on OPS still offers `acceptedSubmissions`.
  Hiding it would need an app check in the shared
  `StatisticsReportNotify::getDataDescriptions()`, and no default text
  uses it once the item is gone.
- Backport: the diff applies to 3.5 as it stands (checked with a dry
  run). On 3.4 the locale lines are the same (`uk` has no item there),
  but the upgrade step does not exist; a 3.4 backport would need its
  own migration.
- A test: a unit test that every variable a context's default template
  names is set by the mailable would catch this and its kind.

Medium: one repo and a few lines, but it repairs stored email
templates in an upgrade step.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/walk.js)
  (it opens "Manage Emails" with the `openManageEmails()` of
  [the U06 OPS1 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/lib.js)),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/walk.js`
  (the Steps); `… walk.js neighbour` (reads the template's stored text in
  every language, to compare it with and without the fix).
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on 2026-10-03,
  OJS and OMP as the control.
- Fix trial on OPS `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-monthly-email-accepted-blank/fix.diff ops`,
  then the Steps on the 3.5 dataset upgraded by the patched code and on
  a reloaded `main` dataset with the template re-installed (the commands
  in the script's header), and `… revert … ops`. Read with and without
  the fix on the upgraded dataset, the stored English text differed only
  by the removed item, and the French one not at all.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0`
  OPS acd8ae704b (lib/pkp 9e41f10273); `stable-3_3_0` OPS c5532e2161
  (lib/pkp ac3fa73402).
- Code reads, on each line: OPS `locale/*/emails.po` (3.3:
  `locale/en_US/emails.po`), `registry/emailTemplates.xml` and
  `classes/services/StatsEditorialService.php` (3.3: `.inc.php`); lib/pkp
  `StatisticsReportNotify` and `jobs/notifications/StatisticsReportMail.php`.
  On 3.4 the overview has no `submissionsAccepted`, the English text has
  the item and the mailable sets it to `null` (lib/pkp a06eea09c3, the
  3.4 twin of 9c5d83afab). On 3.3 the overview has none either, but OPS's
  `registry/emailTemplates.xml` installs the template's body from
  `emails.statisticsReportNotification.subject`, so the 3.3 email is one
  line of text with no figures. Also read on `main` and 3.5: lib/pkp
  `I13128_FixEmailUrlLinks::replace()` and OPS's subclass and history
  (`pkp/pkp-lib#13128`, 19d06c9fa4 on 3.5 and abf519999a on `main`, both
  2026-08-24, edit the same translated `emails.po` files), OPS's
  `dbscripts/xml/upgrade.xml`, lib/pkp `DataObject::getLocalizedData()`
  with `LocalizedData::getBestLocalizedData()`, and
  `PKPStatsEditorialQueryBuilder::countPublished()`.
- Introduced: on `main` 1cd7aad47c (`pkp/ops#240`, merged 2022-02-24)
  removed the figure from OPS's overview; `pkp/pkp-lib#7709` ("[OPS]
  Editorial Activity statistics are inaccurate") asked for the removal
  and made it on 3.3 in 2f0e236955 (`pkp/ops#239`, Jonas Raoni Soares da
  Silva). The list item itself came with abc9d8930f (the OJS commit of
  `pkp/ojs#2546`, `pkp/pkp-lib#4844`, in OPS's history).
- Upstream search (pkp/pkp-lib, pkp/ops, pkp/ui-library; issues and
  PRs) by "Accepted submissions this month", "Accepted submissions"
  with preprint, "preprint health report", "health report", OPS
  statistics report email, `acceptedSubmissions`,
  `submissionsAccepted`, `StatisticsReportNotify`,
  `setupStatisticsVariables` and `STATISTICS_REPORT_NOTIFICATION`:
  nothing about this line. `pkp/pkp-lib#7709` is the removal from the
  statistics and does not mention the email.
- Unverified: a server's edited copy of the template was not driven
  through the upgrade; the repair reaches it through the same
  `replace()` path the step's other corrections use. A server whose
  primary language has no `emails.po` key for this email (`fr`, `pt`,
  and the OPS languages with no `emails.po`: `fi`, `hr`, `id`, `ky`,
  `tr`) was not driven, and what its install stores was not settled in
  the code. The English fallback for an empty translation was read in
  the code, not driven.
- MySQL not checked; the repair is a string replacement in PHP, not a
  query that depends on the database.
