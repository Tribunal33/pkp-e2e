# On a French press or preprint server, the new-announcement email's last sentence arrives in English

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code)
- **Introduced** not traced; present since at least [cfe29021a](https://github.com/pkp/omp/commit/cfe29021a4faf6b607742f188aad7b34651d0914) (OMP) and [ffa67a3217](https://github.com/pkp/ops/commit/ffa67a321796698ec10fd3a1d0b4cdccebe0447d) (OPS), 2020-05-25, which gave the email its text in English only (`pkp/pkp-lib#4746`)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U12 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a14)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press or a preprint server whose primary language is French
(Canada), the announcement email arrives with the French title as its
subject and "Se désabonner … des courriels envoyés par …" as its footer.
Between them, "Visit our website to read the full announcement." is in
English. A journal sends the whole mail in French.

The press's primary language decides, not the reader's: every recipient
gets this mix. Nothing is lost: only that one sentence is English. A
manager can fix it for good by typing the French text into the "New
Announcement" email template, whose French fields are empty.

The same happens with any primary language whose translation lacks this
email's text; the Cause lists them.

## Impact

- **Lost.** Nothing; one sentence of the email is English.
- **Who.** Every recipient of an announcement email ("Send an email about
  this to all registered users." ticked) from a press or preprint server
  whose primary language lacks the text: French (Canada) here.
- **Way round.** A manager fills the empty French "Body" of the "New
  Announcement" template under Settings › Workflow › "Emails" (the
  "Subject" is the announcement's title, `{$announcementTitle}`, in any
  language). A saved text wins over the stored default, so it lasts
  through upgrades and the fix.

Low: a wording fault in one email, while the announcement reaches its
readers.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (or OPS `main`): the press
  (the server) `publicknowledge`, which offers English and French
  (Canada), English primary, with announcements off.

1. Sign in as `dbarnes` (the press's editor, a manager-level role).
2. Settings › Website › "Setup" › "Languages": in "Website Languages",
   choose the "Primary locale" radio on the row "French/français"
   (`fr_CA`).
3. Settings › Website › "Setup" › "Announcements": tick "Enable
   announcements" and press "Save".
4. Open "Announcements" in the side menu and press "Add Announcement".
5. In the French (Canada) boxes, "Title": "Appel à contributions
   u12r7fr" and "Short Description": "Résumé u12r7". Tick "Send an email
   about this to all registered users." and press "Save".
6. A queued job sends the email: the job runner runs it on the next page
   loads (the dataset's `job_runner = On`), or run
   `php lib/pkp/tools/jobs.php run`. Read it in the install's own mail
   catcher, in the mailbox of any user of the press, for example
   `rvaca`.
7. Settings › Workflow › "Emails" › "Add and edit templates": search
   "New Announcement" and press "Edit". Read the French (Canada)
   "Subject" and "Body".

**Expected.** The whole email in French, as a journal sends it: after
the title and the short description, "Visiter notre site Web pour
consulter l'annonce complète." with "l'annonce complète" a link to the
announcement. Step 7 shows that text in the French body.

**Observed.** On OMP, from "Daniel Barnes", subject "Appel à
contributions u12r7fr", text part:

```
*Appel à contributions u12r7fr*

Résumé u12r7

Visit our website to read the full announcement ( …/index.php/publicknowledge/en/announcement/view/1 ).

—
Se désabonner ( …/notification/unsubscribe?… ) des courriels envoyés par Press de la connaissance du public ( …/index.php/publicknowledge/en ).
```

OPS sends the same, its footer naming "Serveur de prépublication de la
connaissance du public". In step 7 the French "Subject" and "Body" are
empty on both apps; the English ones hold the English text.

On OJS the same steps give "Visiter notre site Web pour consulter
l'annonce complète" and a French body in step 7.

## Cause

OMP's and OPS's French (Canada) `locale/fr_CA/emails.po` leave
`emails.announcement.subject` and `emails.announcement.body` empty
(`msgstr ""`). The keys are each app's own, named in its
`registry/emailTemplates.xml` for the `ANNOUNCEMENT` email; pkp-lib
defines no `emails.announcement.*` text, so only the app's `emails.po`
can supply it. OJS's `fr_CA` has both.

When French is installed, `PKP\emailTemplate\DAO::installEmailTemplateLocaleData()`
(`lib/pkp/classes/emailTemplate/DAO.php`) stores each email's text per
language in `email_templates_default_data`, with an empty text where the
translation is missing. The default dataset holds `ANNOUNCEMENT`'s
`fr_CA` row with an empty subject and body on OMP and OPS.

When an announcement is saved with the email ticked,
`PKPAnnouncementController::notifyUsers()` queues
`NewAnnouncementNotifyUsers` with the context's primary language for
every recipient, and its `createMailable()` reads the template's body
and subject with `getLocalizedData('body', $this->locale)`.
`LocalizedData::getBestLocalizedData()` skips the empty French text and
takes the next language with one, English, the site's primary language.
The title, the short description and the unsubscribe footer are filled
in afterwards in the primary language, so only the template's own words
come out English.

Reach:

- Installed presses and servers: the empty `fr_CA` row stays when the
  translation is added later. An upgrade rewrites stored email texts
  only through an explicit migration (`I12903_ReviewerUnassignEmailTemplate`,
  `I13128_FixEmailUrlLinks`), and none covers this one (checked in the
  code).
- Other languages lack the announcement text too, so a press or server
  with one of them as its primary language gets the English sentence the
  same way (an empty or absent entry, read in the locale files on
  `main`): OMP Greek, Galician, Slovenian, Swedish and Vietnamese; OPS
  Catalan, Spanish, French (France), Norwegian Bokmål, Portuguese and
  every language without an OPS `emails.po`; OJS 13 of its 64 languages.
  Outside this report's fix.
- Other emails of the same two files: OMP leaves the French subject or
  body of eight more of its own emails empty (among them
  `USER_VALIDATE_CONTEXT`, `REVIEW_REQUEST_SUBSEQUENT`,
  `EDITOR_DECISION_SKIP_REVIEW`, `STATISTICS_REPORT_NOTIFICATION`), OPS
  of six (among them `POSTED_ACK`, `EDITOR_ASSIGN`,
  `EDITOR_DECISION_ACCEPT`); each goes out in English the same way (read
  in the locale files and the dataset's stored rows, not walked).
  Outside this report's fix.
- 3.3 chooses the language differently: there the email is written in
  the language the posting manager is using, not the press's primary
  language, and `MailTemplate` reads the stored text without a fallback.
  The same two `emails.po` entries are empty there (read in the code; see
  Evidence for what stays unverified).

## Proposed fix

A proposal; the team decides. Two French (Canada) texts in each app,
copied from OJS's, and an upgrade migration in each app that fills the
stored `ANNOUNCEMENT` texts left empty, so installed presses and servers
get them too:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-announcement-email-english-sentence/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-announcement-email-english-sentence/fix-ops.diff).

```diff
 msgid "emails.announcement.subject"
-msgstr ""
+msgstr "{$announcementTitle}"

 msgid "emails.announcement.body"
 msgstr ""
+"<b>{$announcementTitle}</b><br />\n"
+"<br />\n"
+"{$announcementSummary}<br />\n"
+"<br />\n"
+"Visiter notre site Web pour consulter <a href="
+"\"{$announcementUrl}\">l'annonce complète</a>."
```

The migration, `APP\migration\upgrade\v3_6_0\FillEmptyAnnouncementEmailTexts`
(a placeholder name; the team gives it its issue number), follows the
targeted, idempotent style of `v3_5_0/I13128_FixEmailUrlLinks`, without
rewriting managers' custom texts and without a revert. It selects
the `ANNOUNCEMENT` rows of `email_templates_default_data` whose subject
or body is empty and fills only the empty columns from the app's
`emails.po` in that row's language (`__()` with the missing-key handler
returning `''`, as the installer does). A non-empty stored text is never
rewritten, a language whose `emails.po` still lacks the text stays
empty, and a site without French has no `fr_CA` row to fill. A
manager's saved French text is untouched, since it lives in
`email_templates_settings` and `DAO::fromRow()` lets it win per
property over the default. The fix reaches installs that already exist
only through this migration. It is listed in each app's
`dbscripts/xml/upgrade.xml` after `I13128_FixEmailUrlLinks`.

Tried on `main` with both diffs applied, on PKP's 3.5 dataset upgraded
by the patched code, so that the migration ran over the stored empty
French row: the Steps showed the Expected on both apps ("Visiter notre
site Web pour consulter l'annonce complète", and the French body in step
7). The checks that it reaches no further: after the same upgrade with
and without the diffs, the English `ANNOUNCEMENT` row and every other
email's stored default rows were identical, only the French row
differing; and on a press and a server with English primary, the English
email and the English template read the same with the diffs in and out.

**Alternatives**

- The texts alone, entered on PKP's Weblate (translate.pkp.sfu.ca) by
  the French (Canada) translators: new installs get them, but an
  installed press keeps its empty row until an administrator runs
  `php lib/pkp/tools/installEmailTemplate.php ANNOUNCEMENT fr_CA`, or a
  site administrator presses "Reload defaults" on the French row of
  Settings › Website › "Setup" › "Languages". That button rewrites the
  context's French default settings and the French default of every
  email for the whole site, which is far more than this fault needs.
- Reinstall the email with `installEmailTemplates(emailKey:
  'ANNOUNCEMENT')`, as `I12903_ReviewerUnassignEmailTemplate` does: it
  deletes and rewrites the stored row of every installed language, and
  empties again any whose `emails.po` lacks the text.
- Fall back per sentence, or from the stored text to the locale file at
  send time: a change to how every email template is read, for one
  missing translation.

**What goes with it**

- The texts and the migration ship in the same release: the migration
  installs what `emails.po` holds at upgrade time, so a Weblate sync
  landing after it brings installs nothing. The texts should also reach
  the `emails` component of the `omp` and `ops` projects on Weblate, or
  the next sync may empty them again; the wording needs a French
  (Canada) translator's yes.
- Backport: the locale change applies as written to 3.5 and 3.4. On
  `stable-3_5_0` the migration goes in both the `3.1.0.0`–`3.4.9.9` and
  the `3.5.0.0`–`3.5.0.99` blocks of `upgrade.xml`, as
  `I12133_FixCategorySort` and `I13283_RestoreDegradedOrcidFunctionality`
  are: the installer picks blocks by the version upgraded from, so a 3.4
  → 3.5.0-N upgrade would otherwise skip it. It is idempotent, so running
  it in both is safe.
- The class is identical in OMP and OPS, so it could live once in
  pkp-lib instead (a no-op on OJS, whose French row is filled); the team
  decides. Its `down()` throws `DowngradeNotSupportedException`, as
  `I12903_ReviewerUnassignEmailTemplate` does, and is left so in the
  tried diff; a commented no-op (the filled text is the install default)
  would not cut a failed upgrade's rollback of `I13128_FixEmailUrlLinks`
  before it.
- The guard: the U12 spec's announcement email on a French-primary press
  and preprint server, asserting the French sentence (a Planned item).

Medium: two apps, each with its texts and an upgrade migration of its
own for the installs that hold the empty text.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-announcement-email-english-sentence/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-announcement-email-english-sentence/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on OJS (the control),
  OMP and OPS and reads the email from the mail catcher. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-announcement-email-english-sentence/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` as
  the argument takes steps 1 and 3 to 7 with English left primary and
  English texts in step 5.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03); the two lines read the same. The database plays
  no part; MySQL not checked.
- Fix trial: `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `… fix-ops.diff ops`; the 3.5 dataset loaded and upgraded by the
  patched code (`PKP_E2E_DATASET_BRANCH=stable-3_5_0` on the reset, the
  upgrade log naming the migration) and the kept script; a plain reset
  and the script with `neighbour`; `node bin/try-fix.js revert`; the 3.5
  dataset upgraded by the unpatched code, its stored
  `email_templates_default_data` compared with the patched upgrade's
  (an md5 per row set); a plain reset and the script with `neighbour`.
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5). `stable-3_5_0`: OJS c1cee76b95 (`lib/pkp`
  771474347e), OMP 9c5e24246 and OPS 38b61882d3 (`lib/pkp`
  cf3f984335). `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 767353f4fe. `stable-3_3_0`: OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, pkp-lib ac3fa73402.
- Code reads: `emails.announcement.subject` and `.body` in each app's
  `locale/en` and `locale/fr_CA` `emails.po` on `main`, 3.5, 3.4 and 3.3
  (OJS's French has both on every line; OMP's and OPS's are empty on
  every line); the stored `ANNOUNCEMENT` rows of the three `main`
  datasets; `PKPAnnouncementController::notifyUsers()`,
  `NewAnnouncementNotifyUsers`, `LocalizedData::getBestLocalizedData()`,
  `DAO::installEmailTemplates()`, `installEmailTemplateLocaleData()` and
  `fromRow()`, `Locale::installLocale()`,
  `PKPContextService::restoreLocaleDefaults()` and `LanguageGridRow`
  ("Reload defaults", site administrators only), and the migrations
  `I12903_ReviewerUnassignEmailTemplate`, `I13128_FixEmailUrlLinks` and
  the 3.5 `InstallEmailTemplates` on `main`; on 3.4
  `PKPAnnouncementHandler` (the primary language),
  `NewAnnouncementNotifyUsers`, `DataObject::getLocalizedData()` (the
  same fallback) and `DAO::installEmailTemplates()` (the same
  signature); on 3.3 `AnnouncementNotificationManager::getMailTemplate()`
  and `MailTemplate` (the poster's language, `getData()` without a
  fallback). A Python read of every `emails.po` for the empty entries
  and the language counts under Cause.
- Introduced: `git log -S'emails.announcement.body'` on each app's
  `locale`; OJS's French text came with
  [968d1b4d34](https://github.com/pkp/ojs/commit/968d1b4d34619de646c13b411e3c14f4402881a5)
  (2020-06-04, "Translation updates"); OMP's and OPS's French entries have
  been empty since they appeared.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ops searched on 2026-10-03 by
  "announcement email French", "announcement email translation",
  `emails.announcement.body`, `emails.announcement`, "fr_CA email
  templates missing", "fr_CA emails", "email template empty translation
  fallback English" and the English sentence. Nearest, neither this
  fault: `pkp/pkp-lib#11303` (the email in the primary language for
  every recipient) and `pkp/pkp-lib#6084` (blank announcement emails
  after the 3.2.1 upgrade, fixed by installing the translated template on
  upgrade and the `installEmailTemplate.php` tool).
- Not driven: 3.4 and 3.3 (code only); the other empty emails and
  languages (locale files only); saving a French text in the template
  (the way round); "Reload defaults".
- Unverified: what the email holds on 3.3 when the posting manager works
  in French, where `getData()` has no fallback (read in the code only);
  whether Weblate already holds French (Canada) texts for these keys
  (its site answers with a bot check).
