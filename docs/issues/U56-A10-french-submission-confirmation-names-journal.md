# A press's or preprint server's French submission confirmation thanks the author for choosing "notre revue"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; each app had its own French text)
- **Introduced** `pkp/pkp-lib#7631`, `pkp/omp#1071` and `pkp/ops#240` for `pkp/pkp-lib#7265` · [5932e14acb](https://github.com/pkp/pkp-lib/commit/5932e14acb5bb7c8b532118717db8e4bf5978a41) · merged 2022-02-24 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U56 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author whose interface is in French (Canada) submits to a press or a
preprint server. The confirmation email they receive is written for a
journal. It thanks them for submitting "à la revue Press de la
connaissance du public", points them to "le site Web de la revue" and
thanks them for choosing "notre revue". On a preprint server it also
leaves out what the English email says: a moderator must approve the
preprint before it is posted.

The email still arrives, and its link and username are right. In the
French list of emails, the descriptions of this email and of
"Création de l'utilisateur-trice" also speak of "la revue". That second
email itself names the press or the server.

A corrected translation fixes the list's descriptions at once, since
they are read from the language files on each visit. The email's
French name, subject and body are copied into the database when an
install is set up or French is added to it. So presses and servers
that already have French keep the journal text until a manager edits
it, unless an upgrade step rewrites the stored copy.

## Impact

- **Lost**: the press's or server's name in place of "la revue" and
  "notre revue". On a server, authors also lose the notice that a
  moderator will review the preprint before it is posted.
- **Who**: every author whose interface is in French (Canada) when
  they submit to a press or a preprint server, on every submission.
  French (France) authors get a neutral email; only its list
  descriptions name "la revue".
- **Way round**: a manager rewrites the French name, subject and body
  of the email once, under Settings › Workflow › "Emails" › "Add and
  edit templates".

Low: wording in an email that still arrives with the right link and
username.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (the press
  `publicknowledge`, "Public Knowledge Press") and for OPS `main` (the
  server `publicknowledge`, "Public Knowledge Preprint Server"). Each
  offers English and French (Canada) for the interface and for forms.
  Nothing is created before the steps.
- On the server, `ccorino` holds only the Author role, and with no
  screening plugin installed an author cannot post. So the server sends
  this email, "Submission Acknowledgement (Pending Moderation)". A
  submitter who can post gets "Submission Acknowledgement (No Moderation
  Required)" instead.
- A mail catcher the install sends to.
- Control: the journal of the OJS dataset through the same steps,
  where "la revue" is right.

The author's confirmation:

1. Sign in as `aclark` on the press (`ccorino` on the server and on the
   journal).
2. Open the initials menu at the top right, "Change Language", and pick
   "français".
3. Open "Faire une soumission"
   (`/index.php/publicknowledge/fr_CA/submission`). Pick the
   submission language "français (Canada)", type the title "u56e
   Soumission en français", tick the boxes and press "Commencer la
   soumission".
4. Add a file. On the press, upload a text file and choose "Manuscrit
   de livre" for it; on the journal, upload a text file and choose
   "Texte de l'article"; on the server, press "Ajouter un fichier" and
   add a PDF labelled "PDF". Type a French abstract on "Détails". On
   the server, pick the first answer to the question whether the
   preprint was published elsewhere. Press "Continuer" up to the last
   step, "Évaluation".
5. Press "Soumettre", then "Soumettre" in the confirmation.
6. Open the newest email to `aclark@mailinator.com`
   (`ccorino@mailinator.com`).

The manager's screens:

7. Sign in as `rvaca`.
8. Open Settings › Workflow › "Emails" and press "Add and edit
   templates".
9. Search "Submission Confirmation" (on the server "Submission
   Acknowledgement (Pending Moderation)") with Enter and press "Edit"
   on its row. The email's window opens; press "Edit" on its default
   template. In "Edit Template", press "French" and read the French
   "Name", "Subject" and "Body".
10. Close the window with the back arrow. Open "Change Language" and
    pick "français". On "Gérer les courriels", read the descriptions
    of "Confirmation de soumission" and "Création de
    l'utilisateur-trice".

**Expected.** In step 6, a French email that names the press or the
server and no journal, as the English one does ("Thank you for
considering Public Knowledge Press as a venue for your work."). On the
server it says, as the English does, that a moderator will see the
preprint and then post it or contact the author. In steps 9 and 10,
French texts with no "revue"; on the server a French name and
description saying what the English ones say ("Submission
Acknowledgement (Pending Moderation)", "…when they make a submission
and a moderator must approve it.").

**Observed.** Step 6, on the press (the server's email is the same,
with "Serveur de prépublication de la connaissance du public" as the
name):

```
Subject: Accusé de réception de la soumission à Press de la connaissance du public

Arthur Clark,
Nous vous remercions d'avoir soumis le manuscrit intitulé « u56e Soumission en français » à la revue Press de la connaissance du public. Nous l'avons bien reçu et un membre de notre équipe éditorial le prendre en charge sous peu. Grâce à notre système de gestion en ligne, vous pourrez suivre votre soumission tout au long du processus d'édition en accédant au site Web de la revue :
URL de la soumission : …/index.php/publicknowledge/fr_CA/dashboard/mySubmissions?workflowSubmissionId=19
Nom d'utilisateur-trice : aclark
Si vous avez des questions, n'hésitez pas à communiquer avec nous. Nous vous remercions d'avoir pensé à notre revue pour la publication de vos travaux.
```

Step 9: the French "Body" is that text with its placeholders ("…à la
revue {$contextName}…"), and the French "Name" reads "Confirmation de
soumission" on the server too. Step 10, on the press and the server:

```
Confirmation de soumission
Ce courriel, lorsqu'activé, est envoyé automatiquement à un-e auteur-e quand le processus de soumission d'un manuscrit à la revue a été complété. Le courriel explique comment suivre la soumission à travers le processus éditorial, et remercie l'auteur-e pour sa soumission.

Création de l'utilisateur-trice
Ce courriel est envoyé à l'utilisateur-trice nouvellement inscrit-e pour lui souhaiter la bienvenue à la revue et l'informer de son nom d'utilisateur-trice et de son mot de passe.
```

Control: the journal receives the same email and list, and there "la
revue" is right.

## Cause

The confirmation's text is pkp-lib's, shared by the three apps
(`emails.submissionAck.body`, sent by
`PKP\observers\listeners\SendSubmissionAcknowledgement` in the
submitter's interface language). Its English names no kind of
publication
([`locale/en/emails.po`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/locale/en/emails.po#L20-L31)).
Its French (Canada) text names a journal three times
([`locale/fr_CA/emails.po`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/locale/fr_CA/emails.po#L20-L36)).
So do the French descriptions of the two emails in the list,
`mailable.submissionAck.description` and
`mailable.userRegister.description`
([`locale/fr_CA/manager.po`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/locale/fr_CA/manager.po#L3491-L3521)),
whose English names none. OMP defines none of these keys in its own
locale files, so a press shows pkp-lib's French.

OPS's English body is its own, and it is the one that announces the
moderator; OPS also has its own English name and description for the
email
([`locale/en/emails.po`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/locale/en/emails.po#L225-L237),
[`locale/en/manager.po`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/locale/en/manager.po#L844-L850)).
Its French (Canada) file leaves all three empty
([`locale/fr_CA/emails.po`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/locale/fr_CA/emails.po#L149-L150),
[`locale/fr_CA/manager.po`](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/locale/fr_CA/manager.po#L755-L759)).
An empty translation counts as missing, so a server falls back to
pkp-lib's French journal text.

On 3.3 each app had its own text: OMP's French thanked the author for
submitting "à la presse", OPS's "au serveur". `pkp/pkp-lib#7265` moved
the email texts into pkp-lib and deleted the apps' copies, English and
translations alike. pkp-lib's French copy came from OJS's French,
which names the journal. The English stayed right, since pkp-lib's
English text is neutral. OPS later got its own English body back with
the new submission wizard (`pkp/ops#411`, for `pkp/pkp-lib#7191`), and
its French entries were added empty in a later rearrangement of the
locale files.

Each email's default name, subject and body are stored in the
database, one row per email and language for the whole install
(`email_templates_default_data`). The row is written when the install
is set up, and written again when a language is installed on the site
(`Locale::installLocale()`), not when a press switches a language on.
"Edit Template" and the sent email read that row; the list's
descriptions are read from the locale files on each visit.

Reach:

- Other pkp-lib French (Canada) texts that are neutral in English and
  name "la revue" reach a press and a server the same way, among them
  the French list's "Demande d'évaluation" descriptions seen on the
  press. They are listed in
  [U10-A11-french-masthead-order-text-names-journal.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A11-french-masthead-order-text-names-journal.md)
  (Evidence, "The 36 keys"), which leaves them to the translators.
  Read in the files.
- Other OPS keys that override pkp-lib in English but are empty in
  French: there the server shows pkp-lib's French, which names no
  journal but leaves out the moderator. Seen on screen: the confirmation
  of step 5 ("…sera soumise à … pour évaluation.",
  `submission.wizard.confirmSubmit`).
- "Création de l'utilisateur-trice" itself: OMP's and OPS's own French
  bodies name "la presse" and "le serveur", so only its list
  description is at fault. Read in the files.
- French (France): pkp-lib's `fr` body is neutral ("Nous vous remercions
  d'avoir pensé à nous…"), but its two list descriptions name "la
  revue", and OPS has no French (France) body of its own, so a server's
  email lacks the moderator there too. Read in the files.

## Proposed fix

Two parts, recommended together.

**1. The translations.** Make the shared French (Canada) texts neutral,
as their English is, and give OPS its own French for the three keys it
leaves empty
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-submission-confirmation-names-journal/fix.diff)
against the OJS or OMP root,
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-submission-confirmation-names-journal/fix-ops.diff)
against the OPS root). In pkp-lib's `locale/fr_CA`:

```diff
 msgid "emails.submissionAck.body"
-"intitulé « {$submissionTitle} » à la revue {$contextName}. Nous l'avons bien "
+"intitulé « {$submissionTitle} » à {$contextName}. Nous l'avons bien "
-"soumission tout au long du processus d'édition en accédant au site Web de la "
-"revue :</p>\n"
+"soumission tout au long du processus d'édition en accédant à notre site "
+"Web :</p>\n"
-"remercions d'avoir pensé à notre revue pour la publication de vos "
+"remercions d'avoir pensé à {$contextName} pour la publication de vos "

 msgid "mailable.userRegister.description"
-"souhaiter la bienvenue à la revue et l'informer de son nom d'utilisateur-"
+"souhaiter la bienvenue dans le système et l'informer de son nom d'utilisateur-"

 msgid "mailable.submissionAck.description"
-"le processus de soumission d'un manuscrit à la revue a été complété. Le "
+"le processus de soumission d'un manuscrit a été complété. Le "
```

In OPS's `locale/fr_CA`, `mailable.submissionAck.name` becomes "Accusé
de réception de la soumission (en attente de modération)", its
description "Ce courriel est envoyé automatiquement à un-e auteur-e
lorsqu'il ou elle fait une soumission et qu'un-e modérateur-trice doit
l'approuver.", and `emails.submissionAck.body` a French version of
OPS's English body (in the diff). "Bienvenue dans le système" is what
the English says ("welcome them to the system") and what the French
"Inscription d'une évaluateur-trice" description already says.

The French (Canada) translators enter these six texts on Weblate,
which commits them to `stable-3_5_0`, from where they reach `main`; the
diffs are the files as Weblate would write them.

Tried on `main`, all three apps, with the French default of this email
stored again from the patched files, as a new install would store it.
Step 6's email named the press and the server with no "revue", and on
the server announced the moderator. The server's French name read
"Accusé de réception de la soumission (en attente de modération)", and
step 10's descriptions had no "revue". Compared with the same screens
and stored texts without the fix, the English list and the English
template were unchanged, the French list changed in these two rows
only, and of the stored default texts only this email's French row
changed.

**2. An upgrade step for existing installs.** Without it, every
existing French press and server keeps the journal text. A migration
in pkp-lib's `v3_5_0` folder, listed in each app's
`dbscripts/xml/upgrade.xml`, stores the `SUBMISSION_ACK` default again
for every installed language:

```php
Repo::emailTemplate()->dao->installEmailTemplateLocaleData(
    Repo::emailTemplate()->dao->getMainEmailTemplatesFilename(),
    json_decode(DB::table('site')->value('installed_locales')),
    'SUBMISSION_ACK'
);
```

It rewrites only the stored defaults, which no manager edits: a
manager's own text is stored apart and stays. It follows the upgrade
step the U56 A2 report proposes for stored default names
([pkp-e2e#865](https://github.com/jardakotesovec/pkp-e2e/issues/865)),
uses the method an install and `Locale::installLocale()` use, and is
listed in both upgrade blocks as `I13128_FixEmailUrlLinks` is. It has
to ship in the same release as the corrected translations, since it
stores whatever the language files hold when it runs. The migration
itself was not tried, since it is not written out as a diff. Part 1's
trial ran the same method for this email through
`lib/pkp/tools/installEmailTemplate.php`.

**Alternatives**

- The translations alone (small): new installs and newly added
  languages get the neutral text, the list's descriptions change at
  once, and existing presses and servers keep the journal email until
  a manager edits it.
- OMP French texts of its own for these keys, as on 3.3: three French
  copies of one neutral English text to keep in step, where one
  neutral pkp-lib text serves all three apps.

**What goes with it**

- The translators can mend the body's grammar while there ("un membre
  de notre équipe éditorial le prendre en charge"); it is left out of
  the diff.
- The other French texts in Reach go to the same translators and stay
  out of this change.
- Backport: the diffs apply to `stable-3_5_0` as written (checked with
  `patch --dry-run`), and the migration's `v3_5_0` folder makes it the
  same file there. 3.4 has the same texts.

Medium: six translated texts, plus a migration in pkp-lib and a line
in each app's `upgrade.xml` that repairs the stored text on every
existing site.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-submission-confirmation-names-journal/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-submission-confirmation-names-journal/walk.js)
  (helpers in its `lib.js`) takes the Steps on OJS, OMP and OPS:
  `node bin/probe.js all shared/playwright/checks/issues/french-submission-confirmation-names-journal/walk.js`
  in pkp-e2e's harness (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5;
  `STEPS=nb` runs the before-and-after comparison alone). For the fix
  trial the diffs were applied and the French default restored on the
  test install with
  `PKP_CONFIG_FILE=<config> php lib/pkp/tools/installEmailTemplate.php SUBMISSION_ACK fr_CA`
  in each app root.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on PKP's
  default dataset (pkp/datasets 566bb1f, 2026-10-03), PostgreSQL, mail
  read in the test install's mail catcher (Mailpit). On the server the
  email log holds the one acknowledgement. No request failed and no
  script error showed.
- Branch tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04), OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp` 3dc90c81a6); OJS
  `stable-3_5_0` c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c and
  OPS 38b61882d3 (`lib/pkp` cf3f984335). 3.4: OMP 0aec65441, OPS
  acd8ae704b, `lib/pkp` 767353f4fe. 3.3: OMP 8e72fc883, OPS
  c5532e2161, `lib/pkp` ac3fa73402.
- Code reads: the six keys in `locale/en`, `locale/fr_CA` and
  `locale/fr` of `lib/pkp` (identical in the OJS and OMP `lib/pkp`
  tips), OMP's and OPS's own `locale/en`, `locale/fr_CA` and
  `locale/fr` `emails.po` and `manager.po` (`emails.userRegister.*`
  included), `registry/emailTemplates.xml` of OMP and OPS
  (`SUBMISSION_ACK` takes `mailable.submissionAck.name` and
  `emails.submissionAck.*`), the listeners
  `SendSubmissionAcknowledgement` (pkp-lib and OPS; the template's
  `getLocalizedData()` takes the request's language; OPS sends
  `SUBMISSION_ACK_CAN_POST` when every submitter can publish), OPS
  `Publication\Repository::canCurrentUserPublish()` (an author can post
  only through the `Publication::canAuthorPublish` hook),
  `emailTemplate\DAO::installEmailTemplateLocaleData()`,
  `Locale::installLocale()` and
  `ManageLanguageGridHandler::reloadLocale()`. On 3.5, the same files.
  On 3.4: `lib/pkp`'s French body and both descriptions name "la
  revue", OMP has no French text of its own, OPS's English has the
  moderator body and its French keys are empty. On 3.3: OMP
  `locale/fr_CA/emails.po` names "la presse" in the body and the
  description, OPS's names "le serveur" (its description's typo "à la
  seveur" aside), and neither names "la revue" there.
- Introduced: `git log -S` on the French phrase in `lib/pkp` gives
  5932e14acb (`pkp/pkp-lib#7631`), which added pkp-lib's
  `locale/fr_CA/emails.po` texts, copied from OJS's French (OJS 3.3's
  body has the same three "revue" sentences). The same PR's app
  commits deleted OMP's texts
  ([fdfeefdb1d](https://github.com/pkp/omp/commit/fdfeefdb1dd1e486091158e8fbbf8383a9411372),
  `pkp/omp#1071`) and OPS's
  ([1cd7aad47c](https://github.com/pkp/ops/commit/1cd7aad47c4b523d7d5f74bb95c1220b11c50f3a),
  `pkp/ops#240`). OPS's present English body came with
  [8fd2c6d834](https://github.com/pkp/ops/commit/8fd2c6d8341aef30ca36115520f399af1e45494e)
  (`pkp/ops#411`, 2022-12-14, Alec Smecher), and the empty French
  entries for the body, name and description with
  [eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7)
  (2023-01-30, Alec Smecher, "Rearrange locale files for summiting
  process", no pull request).
- Upstream searches (pkp/pkp-lib, pkp/omp, pkp/ops, issues and PRs):
  the French words of the symptom, "submissionAck" with fr_CA,
  `emails.submissionAck.body`, journal wording in press or server
  emails. Read and not this fault: `pkp/pkp-lib#8348` (missing variables
  in the new-submission emails), `pkp/pkp-lib#11723` (the
  acknowledgement's name when the submitter is not an author).
- Not driven: 3.4 and 3.3 (code only); the upgrade step (not written as
  a diff); the "reload defaults" action of the Languages settings; the
  other French texts in Reach; French (France) and other languages;
  MySQL.
