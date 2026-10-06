# A press's monthly statistics email reads "Login to the the press" ("the the preprint server" on a preprint server)

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP (code)
- **Introduced** OMP: `pkp/omp#732` for `pkp/pkp-lib#4844` · [3935ac1](https://github.com/pkp/omp/commit/3935ac1c7743d1d96521d780522bc0e2adcc5da4) · 2019-12-11 · Nate Wright (NateWr). OPS: the same text from OJS's `pkp/ojs#2546` (same issue) · [abc9d89](https://github.com/pkp/ops/commit/abc9d8930f5448551cc544558c845efa2c39d341) · 2019-12-05 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** U65 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The monthly statistics email a press sends its managers and editors
(a preprint server: its managers and moderators) closes with "Login to
the the press to view more detailed editorial trends and published book
stats.", and a preprint server's with "Login to the the preprint server
to view more detailed trends and posted preprint stats.". They should
read "Login to the press" and "Login to the preprint server", as a
journal's reads "Login to the journal".

Only the English text has the doubled word. The template on Settings ›
Workflow › "Emails" › "Manage Emails" › "Statistics Report
Notification" has it too, and a manager can correct it there.

Correcting the shipped text reaches only new installs: an install
stores the template once, when it is set up, so every existing press
keeps the doubled word until a manager edits it or an upgrade repairs
the stored copies (the optional part of the fix).

## Impact

- **Lost**: nothing.
- **Who**: the managers and editors of every press (a preprint server:
  managers and moderators) whose email goes out in English, on the first
  of each month. Sending it is on by default.
- **Way round**: a manager corrects the sentence on "Manage Emails", for
  that press only.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press"); for a preprint server, OPS `main`. Nothing
  else: the press sends the monthly email (Settings › Workflow ›
  "Emails", on in the dataset), and `rvaca` (Press manager) receives it.

The template, as the press holds it:

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Emails" and press "Add and edit
   templates".
3. Type "Statistics Report Notification" in the search box and press
   the row's "Edit". The window "Edit Template" opens with the body (this
   email has no list of templates, so no second "Edit" is needed).
4. Read the body's last paragraph before "Sincerely,".

The email, as it is sent:

5. The routine task sends the email on the first of each month. To send
   it now, run the app's own scheduler tool in the app's directory:
   `php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`,
   then `php lib/pkp/tools/jobs.php run` (or open any page, since the
   dataset's configuration runs queued jobs on page loads).
6. Open `rvaca`'s email "Editorial activity for September, 2026" (the
   previous month; OPS: "Preprint Server activity for September, 2026").

**Expected**: steps 4 and 6 read "Login to the press to view more
detailed editorial trends and published book stats. A full copy of this
month's editorial trends is attached." (OPS: "Login to the preprint
server to view more detailed trends and posted preprint stats. A full
copy of this month's trends is attached.").

**Observed**: the template (step 4), OMP and OPS:

```
Login to the the press to view more detailed editorial trends and published book stats. A full copy of this month's editorial trends is attached.
Login to the the preprint server to view more detailed trends and posted preprint stats. A full copy of this month's trends is attached.
```

The email's text part (step 6), OMP and OPS:

```
Login to the the press to view more detailed editorial trends ( http://…/index.php/publicknowledge/en/stats/editorial ) and published book stats ( http://…/index.php/publicknowledge/en/stats/publications ). A full copy of this month's editorial trends is attached.
Login to the the preprint server to view more detailed trends ( http://…/index.php/publicknowledge/en/stats/editorial ) and posted preprint stats ( http://…/index.php/publicknowledge/en/stats/publications ). A full copy of this month's trends is attached.
```

The HTML part reads the same. On OJS the same steps read "Login to the
journal to view more detailed editorial trends and published article
stats.".

## Cause

The text is a typo in each app's English locale string
`emails.statisticsReportNotification.body`: OMP `locale/en/emails.po`
line 463 ("Login to the the press") and OPS `locale/en/emails.po` line
205 ("Login to the the preprint server"). Each app's
`registry/emailTemplates.xml` takes the body of `STATISTICS_REPORT_NOTIFICATION`
from that string. The installer
(`PKP\emailTemplate\DAO::installEmailTemplateLocaleData()`) stores it in
`email_templates_default_data` once, when the install is set up.
"Manage Emails" shows it from there, and the job
`PKP\jobs\notifications\StatisticsReportMail::handle()` loads it with
`Repo::emailTemplate()->getByKey()` (the press's edited copy when it has
one) and sets it as the subject and body of the mailable
`PKP\mail\mailables\StatisticsReportNotify`. (A second job,
`PKP\jobs\notifications\StatisticsReportNotify`, makes the Tasks
entry and sends no email.)

The sentence was written as "Login to the the journal" when the monthly
email was added for `pkp/pkp-lib#4844`, in OJS and in OMP (where
"journal" became "press"). OPS's repository began as a copy of OJS's
history, and its sentence became "the the preprint server" with
`pkp/pkp-lib#5461`. OJS corrected its own sentence in `pkp/ojs#2684`
(2020-03-17, "correcting typo"), after OPS's copy was taken, and the
correction never reached OMP or OPS.

Reach:

- Every OMP and OPS install holds the typo in its stored English
  template (`email_templates_default_data`, locale `en`). A press that
  edited the template holds its own copy (`email_templates_settings`),
  with the typo unless it was corrected there (checked in the code).
- No other language has it: no translation of the string in OMP's or
  OPS's `locale/*/emails.po` repeats the article, and `fr_CA` leaves the
  string untranslated (checked in the code).

## Proposed fix

Correct the sentence in the two English locale strings.
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-email-login-to-the-the-press/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-email-login-to-the-the-press/fix-ops.diff),
against each app's root. OMP:

```diff
--- a/locale/en/emails.po
+++ b/locale/en/emails.po
-"Login to the the press to view more detailed <a href="
+"Login to the press to view more detailed <a href="
```

OPS, the same file:

```diff
-"Login to the the preprint server to view more detailed <a href="
+"Login to the preprint server to view more detailed <a href="
```

It fixes new installs. Installs already set up keep their stored text,
which a manager can correct on screen; for a typo that is enough, and it
leaves every text a press edited alone.

Tried on OMP and OPS `main`: after
`php lib/pkp/tools/installEmailTemplate.php STATISTICS_REPORT_NOTIFICATION en`,
which stores the template as a new install does, the Steps showed the
Expected in the template and in the received email.

**Alternatives**

- Leave it to each press to correct on "Manage Emails". Then every new
  install keeps shipping the typo.

**What goes with it**

- Optional, a repair of the stored copies on upgrade:
  [stored-copy-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-email-login-to-the-the-press/stored-copy-omp.diff)
  and
  [stored-copy-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-email-login-to-the-the-press/stored-copy-ops.diff)
  add one `replace()` line to each app's
  `APP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks::up()`, which
  already corrects mistakes in the shipped email texts:
  `$this->replace('STATISTICS_REPORT_NOTIFICATION', 'Login to the the press', 'Login to the press', '', 'en');`
  (OPS: "the the preprint server"). `replace()` changes the default text
  and a press's edited copy only where the exact phrase is still there,
  so it changes nothing on a second run. On `main` the migration runs
  for every install upgraded to 3.6 from 3.3, 3.4 or 3.5, including a
  3.5 install that already ran it in a 3.5.0 patch release. On 3.5 the
  same line in that branch's class runs on each 3.5.0 patch upgrade, so
  it would also serve a backport. An install already on `main` (a
  development install; 3.6 is not released) does not get it.
- What was tried of it: with both diffs applied, PKP's 3.5 test dataset
  was loaded and upgraded by `main`'s code. The Steps then showed the
  Expected in the template and in the received email. Read with and
  without the fix, the stored English text differed only in the doubled
  word.
- A backport: the fix diffs apply to 3.5 and 3.4 as they stand; on 3.3
  the same line is in OMP's `locale/en_US/emails.po`.
- The changed source string goes to the translators through Weblate;
  none of the translations has the typo.
- Left out: the only other doubled "the the" in the English locale
  files, lib/pkp's `doi.manager.settings.doiPrefixPattern` ("must be in
  the the following format"), is a message no code reads.
- A test to go with the fix: an e2e check that reads the email's
  closing sentence on each app; a unit test cannot see a typo in a
  locale string.

Small: one word per app, no data repair. The optional migration line
would make it medium.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monthly-email-login-to-the-the-press/walk.js)
  (it opens "Manage Emails" with the `openManageEmails()` of
  [the U06 OPS1 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-emails-list-misses-sent-emails/lib.js)),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/monthly-email-login-to-the-the-press/walk.js`
  (the Steps); `… walk.js neighbour` (reads the template's stored text in
  every language, to compare it with and without the fix).
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on 2026-10-03,
  with the same text on both lines and OJS as the control.
- Fix trial: the fix and the stored-copy line applied together, one diff
  per app (`cat fix-omp.diff stored-copy-omp.diff`). Without the fix, the
  3.5 dataset upgraded to `main` kept "Login to the the press" ("the the
  preprint server"). The French text is empty (untranslated) with and
  without the fix, so the comparison shows nothing for French.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OMP
  0aec65441, OPS acd8ae704b (lib/pkp 9e41f10273); `stable-3_3_0` OMP
  8e72fc883, OPS c5532e2161 (lib/pkp ac3fa73402).
- Code reads: OMP and OPS `locale/en/emails.po` (3.3:
  `locale/en_US/emails.po`) and `registry/emailTemplates.xml` on each
  line. On OPS 3.3 it installs the
  template's body from `emails.statisticsReportNotification.subject`
  ("Preprint Server activity for {$month}, {$year}"), so OPS 3.3's email
  never shows the sentence, hence no OPS in the 3.3 sub-item. Also read:
  `PKP\emailTemplate\DAO::installEmailTemplateLocaleData()`,
  `lib/pkp/tools/installEmailTemplate.php`,
  `StatisticsReportMail::handle()` and `Mailable::$supportsTemplates`
  (false for this email, so "Edit" opens the template directly; the walk
  saw the same) on `main`; lib/pkp
  `I13128_FixEmailUrlLinks::replace()` and the apps' subclasses and
  `dbscripts/xml/upgrade.xml` on `main` and 3.5; every `locale/*/emails.po`
  of OMP and OPS and every English `.po` of OJS, OMP, OPS and lib/pkp
  for a repeated "the".
- Introduced: `git log -S 'Login to the the'` in each app. OMP: the
  sentence came with 3935ac1c77 (`pkp/omp#732`, merged 2019-12-16); later
  commits only rewrapped it. OPS: abc9d8930f, the OJS commit of
  `pkp/ojs#2546` in OPS's history, wrote "Login to the the journal";
  33ab20f837 (Alec Smecher, `pkp/pkp-lib#5461`, 2020-02-07) moved it to
  `emails.po` as "Login to the the preprint server". OJS's correction:
  52b395cc22, `pkp/ojs#2684`.
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ops, pkp/ojs; issues and
  PRs) by "the the press", "Login to the the", "the the preprint
  server", "health report" email, statistics email typo and
  `statisticsReportNotification`: nothing about this sentence.
- MySQL not checked; the fault is in a locale string, not a query.
