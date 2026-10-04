# In French (Canada), "Manage Emails" shows codes instead of some emails' names and descriptions

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; no "Manage Emails" page)
- **Introduced** not traced; present since at least [fdfeefdb1d](https://github.com/pkp/omp/commit/fdfeefdb1dd1e486091158e8fbbf8383a9411372) (2022-02-22)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U56 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a11)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A manager who works in French (Canada) and opens Settings › Workflow ›
"Emails" › "Gérer les courriels" finds some emails listed under codes
such as "##mailable.postedAck.name##" instead of a French name, each
described by a code too, and other rows with a French name over a
coded description. Because the list is sorted by name, the coded rows
head it: three on a journal, nine on a press, seven on a preprint
server. On `main`, a journal and a press show three more coded rows on
top of these, for emails added after 3.5 that no language has
translated yet.

On a preprint server, the list's filters by role, which narrow it to
the emails a role sends ("Envoyé par") or receives ("Envoyé à"), name
the Moderator role "##default.groups.name.sectionEditor##".

It happens on every journal, press and preprint server that offers
French (Canada); in French (France) a journal and a press show no such
code, and a preprint server shows the same ones. The fix is 27 French
(Canada) texts and no code change. We propose that the French (Canada)
translators, or a developer with an account, enter them on PKP's
Weblate, which writes the locale files, rather than a developer
committing them, which Weblate's next sync could undo.

## Impact

- **Lost.** Only labels: the coded emails' names and descriptions and
  the Moderator filter's name. A screen reader also reads the code
  as the name of the row's edit button ("Modifier
  ##mailable.postedAck.name##").
- **Who.** Managers who use the interface in French (Canada), each time
  they open "Manage Emails".
- **Way round.** Switch the interface to English, or open the email and
  read its subject and body. Every email can still be found, opened and
  edited.

Low: some labels are codes in one language, and every task still gets
done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main`: the journal,
  press or server `publicknowledge`, which offers English (primary) and
  French (Canada). `rvaca` is its manager.

Steps:

1. Sign in as `rvaca`.
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open "Paramètres" › "Flux des travaux", the "Courriels" tab, and
   press the link "Ajouter et modifier les gabarits". The page "Gérer
   les courriels" opens
   (`/index.php/publicknowledge/fr_CA/management/settings/manageEmails`).
4. Read the first rows of the list, each email's name and the
   description under it.
5. On OPS, read the filter buttons under "Envoyé par" and "Envoyé à".

**Expected.** Every email has a French name and a French description,
as the other rows of the list do ("Abonnement échu", "Ce courriel avise
un-e abonné-e que son abonnement est expiré. …"). On a preprint server
the Moderator's filter button reads a French word for the role, as the
journal's and the press's Editor button reads "Rédacteur-trice".

**Observed.** Step 4, the rows showing a code, at the top of the list:

```
Journal (6 rows):
  ##mailable.authorPublicationPublished.name##          ##mailable.authorPublicationPublished.description##
  ##mailable.reviewCancel.name##                        ##mailable.reviewCancel.description##
  ##mailable.reviewRound.requestAuthorResponse.name##   ##mailable.reviewRound.requestAuthorResponse.description##
  ##mailable.userRoleMastheadUpdateNotify.name##        ##mailable.userRoleMastheadUpdateNotify.description##
  ##orcid.orcidRequestUpdateScope.name##                ##emails.orcidRequestUpdateScope.description##
  Changer l'adresse courriel d'invitation               ##mailable.changeProfileEmailInvitationNotify.description##

Press (12 rows): the journal's six, and
  ##mailable.decision.sendInternalReview.notifyAuthor.name##   ##mailable.decision.sendInternalReview.notifyAuthor.description##
  ##mailable.publicationVersionNotify.name##                   ##mailable.publicationVersionNotify.description##
  ##mailable.validateEmailContext.name##                       ##mailable.validateEmailContext.description##
  Notification sur les rapports statistiques                   ##mailable.statisticsReportNotify.description##
  Soumission en attente de rédacteur-trice                     ##mailable.submissionNeedsEditor.description##
  Soumission refusée avant évaluation                          ##mailable.decision.initialDecline.notifyAuthor.description##

Preprint server (7 rows):
  ##mailable.postedAck.name##              ##mailable.postedAck.description##
  ##mailable.postedNewVersionAck.name##    ##mailable.postedNewVersionAck.description##
  ##mailable.publicationVersionNotify.name##   ##mailable.publicationVersionNotify.description##
  ##mailable.submissionAckCanPost.name##   ##mailable.submissionAckCanPost.description##
  ##mailable.validateEmailContext.name##   ##mailable.validateEmailContext.description##
  Notification sur les rapports statistiques   ##mailable.statisticsReportNotify.description##
  Soumission refusée avant évaluation          ##mailable.decision.initialDecline.notifyAuthor.description##
```

Step 5 (OPS):

```
Envoyé par:  ##default.groups.name.sectionEditor##  Lecteur-trice  Système
Envoyé à:    ##default.groups.name.sectionEditor##  Auteur-e  Lecteur-trice
```

On 3.5 (the `stable-3_5_0` dataset) the same steps show 3 coded rows
on a journal, 9 on a press and 7 on a server, and the same Moderator
filter. The same page in English shows no code.

## Cause

`ManagementHandler::manageEmails()` builds the list with
`Repository::summarizeMailable()` (`lib/pkp/classes/mail/Repository.php`),
which names each email with `Mailable::getName()` and
`Mailable::getDescription()`: they translate the mailable's `$name` and
`$description` keys with `__()`. The handler then sorts the list by the
translated name, which puts the `##` rows first.
`Locale::translate()` answers a key the language has no text for with
`##key##` and does not fall back to English (PKP's stated design,
`pkp/pkp-lib#784`). An empty `msgstr` counts as no text, since
`LocaleFile` drops it. An application's text for a key overrides
pkp-lib's, and when the application's entry is empty, pkp-lib's text
shows instead. That is why some rows of a press and a server show
pkp-lib's French, written for a journal, and others a code: a code
shows only where neither file has a text.

The French (Canada) files lack these texts:

- pkp-lib, all three applications (`lib/pkp/locale/fr_CA`):
  `emails.po` has no entry for `mailable.userRoleMastheadUpdateNotify.name`
  and `.description`, `orcid.orcidRequestUpdateScope.name` or
  `emails.orcidRequestUpdateScope.description`; `manager.po` has no
  `mailable.changeProfileEmailInvitationNotify.description`.
- OMP (`locale/fr_CA/manager.po`): the entries for
  `mailable.decision.sendInternalReview.notifyAuthor`,
  `mailable.publicationVersionNotify` and `mailable.validateEmailContext`
  (name and description), `mailable.submissionNeedsEditor.description` and
  `mailable.decision.initialDecline.notifyAuthor.description` are empty,
  and `mailable.statisticsReportNotify.description` is missing. The
  names of the last three are pkp-lib's, which French (Canada) has.
- OPS (`locale/fr_CA/manager.po`): the entries for
  `mailable.postedAck`, `mailable.postedNewVersionAck`,
  `mailable.submissionAckCanPost`, `mailable.publicationVersionNotify`
  and `mailable.validateEmailContext` (name and description) and
  `mailable.decision.initialDecline.notifyAuthor.description` are empty,
  and `mailable.statisticsReportNotify.description` is missing.
- The Moderator button: OPS's `SettingsHandler::getEmailFromFilters()`
  and `getEmailToFilters()` (`pages/management/SettingsHandler.php`)
  name the role with `default.groups.name.sectionEditor` ("Moderator"),
  whose entry in OPS's `locale/fr_CA/default.po` is empty. pkp-lib's
  handler, used by OJS and OMP, names it `user.role.editor`, which French
  (Canada) has.

OJS's own French (Canada) file has all of its texts.

Reach:

- The same empty `default.groups.name.sectionEditor` entry also makes a
  server save its Moderator role's French name as the code, which the
  report
  [U57-A8-french-default-texts-stored-as-codes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-french-default-texts-stored-as-codes.md)
  covers. The French text proposed below is the one that report's part
  3 needs too.
- 3.4 (code): OMP's and OPS's application entries above are empty there
  too; the pkp-lib keys do not exist on 3.4, and OJS's file has its
  texts.
- Other languages (code, `stable-3_5_0`): French (France) has every
  pkp-lib and OMP text above but none of OPS's; most other languages
  lack some of them, for their own translators.
- The other empty or missing entries a translator meets in the same
  files (code, and on screen where they show):
  - OPS `mailable.editorAssigned` (name and description) and
    `mailable.decision.accept.notifyAuthor.description`: they show
    pkp-lib's French, "Rédacteur-trice assigné (Automatique)" and "Le
    courriel notifie l'auteur-e que la soumission a été acceptée pour
    publication.", so no code. They are left out: the words fit a
    journal more than a server, which is a wording choice for the
    translators.
  - OPS `mailable.submissionAck` (name and description): they show
    pkp-lib's journal text ("… à la revue …"), no code; spec U56
    [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a10)
    covers it, reported apart.
  - OPS `mailable.decision.initialDecline.notifyAuthor.name`: shows
    pkp-lib's "Soumission refusée avant évaluation", no code; left out.
  - OMP `mailable.indexRequest.name` and `mailable.indexComplete.name`
    (empty) and `mailable.layoutComplete.name` (missing): no email on
    `main` or 3.5 uses these keys, so no row shows them; left out.
- The three emails new on `main` (`mailable.authorPublicationPublished`,
  `mailable.reviewCancel`, `mailable.reviewRound.requestAuthorResponse`)
  have no English text on `stable-3_5_0`, so Weblate does not offer
  them yet; they are left out.
- Not this fault:
  - The ORCID emails' other two names, "orcidCollectAuthorId" and
    "orcidRequestAuthorAuthorization", which French (Canada) copies from
    the English code names (spec U56
    [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a2),
    reported apart).
  - Each row's visible "Edit", which is English in every language: the
    word is written into `lib/pkp/templates/management/manageEmails.tpl`
    instead of being translated.

## Proposed fix

Enter the missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files, rather than
commit them. The French (Canada) translators can enter them, or a
developer with a Weblate account. There are 27 texts in three
projects, as the diffs show:

- `pkp-lib`, components `emails` (4) and `manager` (1), shared by the
  three applications:
  [fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-manage-emails-raw-keys/fix-ojs.diff)
  is this part alone.
- `omp`, component `manager` (9):
  [fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-manage-emails-raw-keys/fix-omp.diff),
  with the pkp-lib part.
- `ops`, components `manager` (12) and `default` (1):
  [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-manage-emails-raw-keys/fix-ops.diff),
  with the pkp-lib part.

```diff
 msgid "mailable.postedAck.name"
-msgstr ""
+msgstr "Accusé de publication"
…
 msgid "default.groups.name.sectionEditor"
-msgstr ""
+msgstr "Modérateur-trice"
```

The texts are a proposal for the translators. pkp-lib's and OMP's are
adapted from French (France), which has them, into the French (Canada)
files' forms ("-trice", "courriel", "presse"). OPS's French (France)
file has none of them, so OPS's are written from the English and from
the journal's French texts. "Modérateur-trice" is the word the server's
French emails already use, and the one the report
[U54-OPS3-ops-french-moderator-reads-series-editor.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-OPS3-ops-french-moderator-reads-series-editor.md)
proposes for the role's permission level. For
`orcid.orcidRequestUpdateScope.name` the diff gives a French name in
words. Spec U56 A2 asks for the English name to be words too, instead
of the code-like "orcidRequestUpdateScope", so the French does not copy
it.

Tried on `main` with the three diffs applied: the French list showed no
code on a server, and on a journal and a press only the three emails
new on `main`. The fixed rows read, for example, "Accusé de
publication" and "Validez l'adresse courriel (inscription à la
presse)", and the server's filter buttons read "Modérateur-trice". The
list's other French rows and the English list were the same with the
diffs in and out.

**Alternatives**

- Commit the diffs to the repositories: the same result at once, but
  Weblate's next sync may conflict with them or empty the entries
  again.
- Name OPS's filter with `user.role.subEditor`: its French (Canada) text
  is the stale "Éditeur-trice de série" (the U54-OPS3 report), so the
  button would name the role "series editor", a press's role, instead of
showing a code.
- Fall back to English when a text is missing: it would cover every gap
  of this kind, but it is a new rule in `Locale::translate()` against
  PKP's decision not to fall back (`pkp/pkp-lib#784`), and a product
  decision.

**What goes with it**

- Left out: the entries listed at the end of the Cause's reach; the
  role's plural and abbreviation in OPS's `default.po` (the U57-A8
  report); the other languages.
- Older versions: Weblate commits to a `translations/stable-3_5_0`
  branch, which pkp merges into `stable-3_5_0` and from there into
  `main`, so texts entered once reach 3.5 and `main`. The diffs apply to
  `stable-3_5_0` as they stand (dry run). 3.4 takes OMP's and OPS's
  texts only as a developer's commit; it has none of the pkp-lib keys.
- The guard: the U56 spec's French scenario, asserting that "Gérer les
  courriels" holds no `##` code (a Planned item).

Small: 27 French (Canada) texts entered on Weblate and no code, tried
as diffs.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-manage-emails-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-manage-emails-raw-keys/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-manage-emails-raw-keys/lib.js).
  It takes the Steps on all three applications and changes nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-manage-emails-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NB=1` in front
  takes steps 3 to 5 in English, the control run). The fix was
  tried with `node bin/try-fix.js apply …/fix-<app>.diff <app>` for each
  application, the script with and without `NB=1`, then `revert`, and
  `NB=1` again.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03). The database plays no part (locale files);
  MySQL not checked.
- Differences from the Steps: the script opens "Flux des travaux" by its
  address (`/index.php/publicknowledge/fr_CA/management/settings/workflow`)
  instead of through the "Paramètres" menu.
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5); pkp-lib's French (Canada) `emails.po` and
  `manager.po` are the same at both pkp-lib commits. `stable-3_5_0`:
  OJS c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c and OPS
  38b61882d3 (`lib/pkp` cf3f984335). `stable-3_4_0`: OJS d68934d0d1,
  OMP 0aec65441f, OPS acd8ae704b, `lib/pkp` 767353f4fe.
  `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
  `lib/pkp` ac3fa73402.
- Code reads: on `main` and 3.5, each key the walk showed, in the
  `en`, `fr` and `fr_CA` files of the applications' `locale/` and of
  pkp-lib's `locale/` (`manager.po`, `emails.po`, `default.po`; an empty
  `msgstr` counts as missing), which separated the three emails new on
  `main` (no English text on `stable-3_5_0`) from the rest;
  `Mailable::getName()`, `getDescription()`,
  `ManagementHandler::manageEmails()`, `Repository::summarizeMailable()`
  and OPS's `SettingsHandler`. 3.4:
  the same files from `upstream/stable-3_4_0` and pkp-lib's
  `origin/stable-3_4_0`, `ManagementHandler::manageEmails()` and OPS's
  `SettingsHandler` filters (the same `default.groups.name.sectionEditor`).
  3.3: pkp-lib's `origin/stable-3_3_0` has no `classes/mail/mailables`
  and no `manageEmails` handler. The language counts read every
  `locale/<language>` of the `stable-3_5_0` applications and their
  pkp-lib.
- Introduced: `git log -S` of each key on the applications' `locale/en`
  (`en_US` before 2023) and `locale/fr_CA`, and on pkp-lib's
  `locale/en`. Each text came in English only. The oldest is OMP's
  "Sent to Internal Review", with `pkp/pkp-lib#7265` (fdfeefdb1d,
  2022-02-22). OMP's and OPS's French (Canada) entries first appear,
  empty, in the locale files' rearrangement
  ([3bcd14e06c](https://github.com/pkp/omp/commit/3bcd14e06cc22367cecae0210fb6834a79c98991)
  and [eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7),
  2023-01-30), and none has had a text since. OPS's posting emails with `pkp/pkp-lib#5716`
  ([864f177d21](https://github.com/pkp/ops/commit/864f177d21a50c87ee6888365ba82cf4e07508aa),
  2022-11-07), `orcid.orcidRequestUpdateScope.name` with
  `pkp/pkp-lib#10819` (5fafc6ffbb, 2025-01-23), and
  `mailable.userRoleMastheadUpdateNotify` and
  `mailable.changeProfileEmailInvitationNotify` with 3.5. Not traced
  further.
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library searched by
  the key names (`userRoleMastheadUpdateNotify`, `orcidRequestUpdateScope`,
  `changeProfileEmailInvitationNotify`, `postedAck`,
  `submissionAckCanPost`, `validateEmailContext`,
  `default.groups.name.sectionEditor`), `getEmailFromFilters`, "fr_CA
  emails untranslated", "French manage emails", "mailable name
  translation missing" and "French translation". Read and not this
  fault: `pkp/pkp-lib#13050` (a missing mailable class),
  `pkp/pkp-lib#11106` (quotes in an English email).
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) and English (code only).
- Unverified: whether Weblate already holds French (Canada) texts for
  these keys that have not reached the branches.
