# In French, a press's or preprint server's "Entête" settings say the role order is for "the journal's" editorial team page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: none (code; no "Editorial Masthead" tab)
  - 3.3: none (code; no "Editorial Masthead" tab)
- **Introduced** not traced to a pull request; Weblate commit [56453f06c4](https://github.com/pkp/pkp-lib/commit/56453f06c45dfd6979afa5046ee184328514dc3c) on `stable-3_5_0`, copied to `main` in [25182919bf](https://github.com/pkp/pkp-lib/commit/25182919bf5b3dd45a98ec7c02563317ce02a1fc) · 2026-09-23 · Nicolas Dickner (nicalico)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a11)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A press or preprint server manager working in French (Canada) opens
Settings › Website › "Apparence" › "Entête" (Editorial Masthead). The
description under the role list reads "Définir l’ordre des rôles sur la
page de l'équipe éditoriale de la revue.", so the text says the list
sets the order of a journal's ("la revue") editorial team page. The
English text, "Define the order of masthead roles for public display.",
names no kind of publication.

Nothing is lost: the list still sets the order of the press's or
server's own public "Entête" page, and saving works. The manager has no
setting for the text.

It is one shared text that a journal shows too, where "la revue" is
right. So the fix is a neutral wording by the French (Canada)
translators on Weblate, not a separate text per app. French (France)
and the other languages name no publication here.

## Impact

- **Lost.** Nothing.
- **Who.** A press or preprint server manager whose interface is in
  French (Canada), on the "Entête" tab of the appearance settings.
- **Way round.** None needed: the task gets done.

Low: a wording fault in one language that does not change what the
manager does or what the list sets.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (the press
  `publicknowledge`) and for OPS `main` (the server `publicknowledge`).
  Each offers English and French (Canada); `rvaca` is a manager.
- The journal of the OJS dataset is the control, through the same
  steps: there "la revue" is right.

Steps:

1. Sign in as `rvaca`.
2. Open the initials menu at the top right, "Change Language", and pick
   "français".
3. Open Settings › Website ("Paramètres du site Web",
   `/index.php/publicknowledge/fr_CA/management/settings/website`), tab
   "Apparence", side tab "Entête".
4. Read the description under the list's heading "Entête".

**Expected.** A description that names no kind of publication, as the
English one does ("Define the order of masthead roles for public
display.").

**Observed.** On the press and on the preprint server:

```
Entête
Définir l’ordre des rôles sur la page de l'équipe éditoriale de la revue.
```

The list below it holds the press's roles ("Rédacteur/Rédactrice en
chef de la presse", "Rédacteur/Rédactrice en chef de la série",
"Membre du comité éditorial") or the server's.

## Cause

`PKPAppearanceMastheadForm` (lib/pkp
`classes/components/forms/context/PKPAppearanceMastheadForm.php`) gives
the role list the description
`manager.setup.editorialMasthead.order.description`. The text lives in
pkp-lib only, shared by OJS, OMP and OPS, and no app defines its own.
The English text names no publication
([`locale/en/manager.po`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/locale/en/manager.po#L3873-L3874),
at the `lib/pkp` commit OMP and OPS `main` use).

The French (Canada) text names a journal
([`locale/fr_CA/manager.po`](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/locale/fr_CA/manager.po#L3968-L3970)).
Weblate committed it to `stable-3_5_0` on 2026-09-23
([56453f06c4](https://github.com/pkp/pkp-lib/commit/56453f06c45dfd6979afa5046ee184328514dc3c)).
The same day it reached `main` in
[25182919bf](https://github.com/pkp/pkp-lib/commit/25182919bf5b3dd45a98ec7c02563317ce02a1fc),
a one-parent commit that copies the `stable-3_5_0` translations onto
`main`; 56453f06c4 itself is not in `main`'s history. Before it the
French interface had no text for this key.

Shared texts that must name the app's kind of publication follow one
pattern: each app defines the key in its own locale files, which load
after pkp-lib's and win. The group above this list on the same tab does
that: `manager.setup.enableEnrollmentMasthead.description` is in OJS's,
OMP's and OPS's `locale/en/manager.po` ("See also Settings > Journal >
Masthead.", "Settings > Press", "Settings > Server"). This description
was written neutral instead, so a translation must stay neutral too.

Reach:

- Screens: only this description on the "Entête" tab, seen on `main`
  and 3.5. The tab's other French texts name no publication, also seen
  on screen.
- Other French (Canada) texts, read in the files: 36 other pkp-lib
  texts are neutral in English but name "la revue" in French, and OMP's
  own French files define none of them. OPS's define four, so 32 reach a
  preprint server. Among them are the email signature a new context
  starts with ("Ceci est un message automatique de la revue …"), the
  registration page ("S'inscrire à la revue {$contextName} en tant
  que…") and several decision emails. Evidence lists them.
- Other languages, read in the files: none names a publication here.
  French (France) reads "Définir l'ordre d'apparition sur la page
  d'accueil." ("on the homepage"), a different mistranslation.

## Proposed fix

Translate the text again in French (Canada) on Weblate, neutral like
the English. The new text uses the word the tab and the public page
already use for the masthead, "entête":

```diff
 msgid "manager.setup.editorialMasthead.order.description"
-msgstr ""
-"Définir l’ordre des rôles sur la page de l'équipe éditoriale de la revue."
+msgstr "Définir l’ordre d’affichage public des rôles de l’entête."
```

No code changes. Weblate commits pkp-lib's translations to
`stable-3_5_0` only, and `main` gets them when someone at PKP copies
that branch's translations onto `main`, as 25182919bf did. So the fix
reaches 3.5 with the Weblate edit and `main` with the next such copy.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-masthead-order-text-names-journal/fix.diff)
is the translated file as Weblate would write it, against an app root,
for trying the change.

Tried on `main`, all three apps: step 4 then read "Définir l’ordre
d’affichage public des rôles de l’entête.", and the tab's other French
texts were unchanged. The same tab in English read the same with the
fix in and out.

**Alternatives**

- OMP and OPS texts of their own for the key, as for the group above.
  It is more work for each language and app, and the English needs no
  app wording.

**What goes with it**

- The other 36 French (Canada) texts in Reach go to the same
  translators, and this diff leaves them out. Each needs reading in its
  context: some differ from the English in more than the publication
  (`admin.settings.disableBulkEmailRoles.adminOnly` names a journal
  manager where the English names an administrator).
- Backport: none needed past 3.5. 3.4 and 3.3 have no such text.
- Guard: no unit test fits a translation. The U10 spec's French
  "Entête" scenario on a press would catch it (a **Planned** item).

Small: one text, translated on Weblate, with no code and no data to
repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-masthead-order-text-names-journal/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-masthead-order-text-names-journal/walk.js)
  takes the Steps on OJS, OMP and OPS:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-masthead-order-text-names-journal/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `MODE=nb` reads the
  same tab in English).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03). No request failed and no script error showed.
- Branch tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04), OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (`lib/pkp` 3dc90c81a6); OJS
  `stable-3_5_0` c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c and
  OPS 38b61882d3 (`lib/pkp` cf3f984335). 3.4: OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b, `lib/pkp` 767353f4fe. 3.3: OJS ac77c9fb35,
  OMP 8e72fc883, OPS c5532e2161, `lib/pkp` ac3fa73402.
- Code reads: on `main` and 3.5, `PKPAppearanceMastheadForm` and the key
  in `locale/en` and `locale/fr_CA/manager.po` of each app's `lib/pkp`
  (the same French text in all four `lib/pkp` tips; on 3.5 the form line
  is 62 and the French text lines 3970–3972), and each app's own
  `locale/*/manager.po` (no app defines the key). On 3.4 and 3.3, a
  search of each app's and `lib/pkp`'s `classes`, `templates`, `pages`
  and English locale for `editorialMasthead` and
  `AppearanceMastheadForm`: nothing, so no such tab or text. The load
  order: `Application::__construct()` registers the app's `locale`
  folder after `PKPApplication`'s `lib/pkp/locale`, and
  `LocaleBundle::getTranslator()` merges the files in that order with
  gettext's `Translator::addTranslations()` (`array_replace_recursive`),
  so an app's text wins.
- Introduced: `git log -S` on the French text in `lib/pkp` gives
  56453f06c4 on `stable-3_5_0` (author Nicolas Dickner, committed by
  Weblate) and 25182919bf on `main` (Alec Smecher, one parent, subject
  "Merge remote-tracking branch 'translations/stable-3_5_0' into
  stable-3_5_0"); `git merge-base --is-ancestor` shows 56453f06c4 is not
  in `main`. Neither belongs to a pull request. The English text came with
  [d846f0dcde](https://github.com/pkp/pkp-lib/commit/d846f0dcdede64bd5f25c727eccd9c566605077b) (2024-06-18).
- The other French (Canada) texts in Reach: every `lib/pkp/locale/fr_CA`
  entry with "revue" whose English names no journal, less the two
  "(livre/revue)" texts, then less the keys OMP's or OPS's own
  `locale/fr_CA` files define (OPS defines four).

  <details><summary>The 36 keys</summary>

  `admin.po`: `admin.contexts.confirmDelete`,
  `admin.scheduledTask.editorialReminder.logStart`,
  `admin.scheduledTask.editorialReminder.logEnd`,
  `admin.settings.disableBulkEmailRoles.adminOnly`. `common.po`:
  `review.anonymousPeerReview`,
  `notification.type.editorialReport.contents`,
  `notification.unsubscribeNotifications.pageMessage`. `default.po`:
  `default.contextSettings.emailSignature`,
  `default.submission.step.beforeYouBegin` (OPS defines its own).
  `emails.po`: `emails.submissionAck.body` (OPS),
  `emails.editorDecisionRevisions.body`,
  `emails.editorDecisionResubmit.body`,
  `emails.editorDecisionDecline.body`, `emails.editorRecommendation.body`,
  `emails.copyeditRequest.body`, `emails.discussion.subject`,
  `emails.reviewConfirm.body`, `emails.submissionAckNotAuthor.body`
  (OPS). `manager.po`:
  `manager.settings.statistics.geoUsageStats.description`,
  `manager.settings.statistics.institutionUsageStats.description`,
  `doi.manager.settings.doiObjects`, `manager.setup.publishingDescription`,
  `manager.setup.submissionPreparationChecklistDescription`,
  `notification.localeReloaded`,
  `manager.navigationMenus.contact.conditionalWarning`,
  `mailable.reviewRequest.description`,
  `mailable.reviewRequestSubsequent.description`,
  `mailable.userRegister.description`, `mailable.submissionAck.description`
  (OPS). `reviewer.po`: `reviewer.submission.enterCompetingInterests`,
  `reviewer.submission.noGuidelines`. `user.po`:
  `user.login.registrationComplete.continueBrowsing`,
  `user.register.registerAs`, `orcid.author.submission.failure`,
  `orcid.about.howAndWhyPublicAPI`, `orcid.about.howAndWhyMemberAPI`.

  </details>

- Upstream: none found in pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library (2026-10-03).
- Not this fault: on the same tab the "Enrollment-based Masthead" group
  and the reviewers box show raw codes in French on `main` and 3.5
  (`##manager.setup.enableEnrollmentMasthead##` and three more), and on
  the preprint server the Moderator role reads
  `##default.groups.name.sectionEditor##`
  ([U57-A8-french-default-texts-stored-as-codes.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-french-default-texts-stored-as-codes.md)).
- Not driven, read in the code only: 3.4 and 3.3; the 36 other texts;
  the public "Entête" page, whose heading is the tab's own
  `common.editorialMasthead`.
- Unverified: whether the Custom Locale plugin would let a manager
  replace the text; it was not installed.
