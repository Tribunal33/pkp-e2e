# In French (Canada), the site's ORCID switch and the contributor's ORCID iD field show untranslated text keys

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no built-in ORCID, the ORCID Profile plugin instead)
  - 3.3: none (code; no built-in ORCID, the ORCID Profile plugin instead)
- **Introduced** not traced: a translation never made. The English texts came with [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) (2024-06-21, nine), [48d38e0a9a](https://github.com/pkp/pkp-lib/commit/48d38e0a9a288a1b604a763b2d85bf901fd06ebb) (2024-09-23, two) and [fd4c1eb4b8](https://github.com/pkp/pkp-lib/commit/fd4c1eb4b83de9fc3c2393078d012415e841b03d) (2025-06-19, one)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a11), its site switch; [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A site administrator working in French (Canada) opens the site's ORCID
tab and finds the one box that turns ORCID on for every journal labelled
"##orcid.manager.siteWide.enabled##", explained by
"##orcid.manager.siteWide.description##": untranslated text keys, so
nothing says what the box does.

A manager editing a contributor meets the same on the contributor's
"Identifiant ORCID" field, whose label and help text are French:

- the button that asks the author to verify their iD, and the question
  it asks;
- the button's "requested" state and its resend link;
- an unverified iD's warning, and the question "Supprimer" asks.

The buttons still work ("Oui" sends the email or removes the iD), but
the manager cannot read what they confirm.

Every journal, press and preprint server that offers French (Canada)
and has ORCID turned on shows the field's keys; the site's tab shows
only when the install hosts more than one journal, press or server.

## Impact

- **Lost.** Only labels: the switch's label and explanation, and the
  field's nine texts. Nothing is saved wrong and every action completes.
- **Who.** In French (Canada): the site administrator, on the site's
  ORCID tab; managers, each time they add or edit a contributor in a
  journal, press or server with ORCID turned on. Read in the code, also
  editors who may edit the publication, and authors adding contributors in the submission
  wizard's "Contributors" step, which shows the same field.
- **Way round.** Switch the interface to English.

Low, as untranslated text keys while every task completes; it would
rise if managers or authors sent verification emails or removed iDs by
mistake, which nobody has reported.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main` (or
  `stable-3_5_0`): the journal, press or server `publicknowledge` and the
  site, both offering English and French (Canada). ORCID is off.
- Submission S: OJS 8 "Traditions and Trends in the Study of the
  Commons" (first contributor Elinor Ostrom), OMP 2 "The West and
  Beyond: New Perspectives on an Imagined Region" (Alvin Finkel), OPS 1
  "The influence of lactation on the quantity and quality of cashmere
  production" (Carlo Corino).
- For step 14, a contributor with an unverified iD, which the dataset
  lacks. Steps 5 to 7 import a copy of S whose first contributor has
  one: the Native XML import stores an iD without verifying it.

The site's ORCID tab (A11):

1. Sign in as `admin`. Open Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers") › "Create Journal" ("Create Press",
   "Create Server"), fill in a name, initials, contact name and email,
   country and a path (the walk used `u04r5`), tick English, and press "Save". The
   site's ORCID tab shows only on a site with more than one journal,
   press or server.
2. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
3. Open Administration › "Paramètres du site"
   (`/index.php/index/fr_CA/admin/settings`), the "Réglage du site" tab,
   and its last side tab. Read the box and the line under it. Tick the
   box and read the three fields it shows. Leave without saving.

The contributor's ORCID iD field (A12):

4. Sign in as `rvaca` (the manager). Open Settings › Users & Roles ›
   "ORCID", tick "Enable ORCID functionality", choose "Public Sandbox"
   under "ORCID API", enter `APP-0000000000000000` as the Client ID and
   `00000000-0000-0000-0000-000000000000` as the Client Secret, and
   press "Save".
5. Open Tools › "Native XML Plugin", the export tab ("Export Articles",
   "Export", "Export Preprints"), tick S, export, and press "Download
   Exported File".
6. In the file, add `<orcid>https://orcid.org/0000-0002-1825-0097</orcid>`
   on the line after the first `<author>`'s `<email>…</email>` (after its
   `<url>` when it has one).
7. On the "Import" tab, upload the file and press "Import". The results
   name the new submission C (OJS 21, OMP 19, OPS 20). On OJS they also
   list "Errors occured: … The issue identification element is missing
   for the article", because S is in no issue; C is imported all the
   same.
8. Under "Change Language", choose "français".
9. Open "Paramètres" › "Utilisateurs-trices et rôles"
   (`/index.php/publicknowledge/fr_CA/management/settings/access`) and
   its ORCID tab, the last one.
10. Open S
    (`/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=8`;
    OMP 2, OPS 1) and, in the side menu, "Contributeurs-trices". On the
    first contributor's row press "Modifier" and read the "Identifiant
    ORCID" field.
11. Press the field's button. Read the window and press "Oui".
12. Read the field. Close the window with "Fermer", press "Modifier" on
    the same row again, and read the field.
13. Close the window. Press "Ajouter un-e contributeur-trice", press the
    "Identifiant ORCID" field's button, read the window, press "Non",
    and close.
14. Open C › "Contributeurs-trices", press "Modifier" on the first
    contributor and read the field. Press "Supprimer", read the window,
    press "Oui", and read the field.

**Expected.** French, as the rest of these screens are: French (France)
reads "Activer la fonctionnalité ORCID sur l'ensemble du site" for the
box, and "Demande de vérification", "Demander la vérification ORCID" and
"Supprimer ORCID" for the field's button and windows.

**Observed.** Step 3:

```
ORCID
[ ] ##orcid.manager.siteWide.enabled##
##orcid.manager.siteWide.description##
```

Once ticked, "API ORCID", "Identifiant ORCID du client" and "Clé
secrète du client" are French. On 3.5 the tab also shows a field
labelled "##orcid.manager.siteWide.orcidCustomRedirectBaseUrl##" with
"##orcid.manager.siteWide.orcidCustomRedirectBaseUrl.description##"
under it (Cause, Reach).

Step 9: the journal's ORCID tab is French throughout ("Activer la
fonctionnalité ORCID", "API ORCID", "Ville", "Journal des
enregistrements ORCID").

Steps 10 to 14, the "Identifiant ORCID" field (its label and help text
are French):

| Step | What shows |
|------|------------|
| 10 | The button "##orcid.field.verification.request##" |
| 11 | The window "##orcid.field.authorEmailModal.title##", "##orcid.field.authorEmailModal.message##", "Oui", "Non" |
| 12, before and after reopening | "##orcid.field.verification.requested##" (disabled) and "##orcid.field.verification.resendRequest##" |
| 13 | The same window with "##orcid.field.authorEmailModal.message.noAuthor##" added |
| 14 | "##orcid.field.unverified.shouldRequest##" above "https://orcid.org/0000-0002-1825-0097 (non authentifié)" and "Supprimer"; the window "##orcid.field.deleteOrcidModal.title##", "##orcid.field.deleteOrcidModal.message##", "Oui", "Non"; after "Oui", the field back to "##orcid.field.verification.request##" |

The actions work: "Oui" at step 11 sent the request (`POST
…/api/v1/orcid/requestAuthorVerification/{authorId}`, 200) and the
author's address received "Soumission ORCID"; "Oui" at step 14 removed
the iD (`POST …/api/v1/orcid/deleteForAuthor/{authorId}`, 200). No
request failed and no script error showed. The same screens in English
read "Enable ORCID functionality site-wide", "Request verification" and
so on. Both ORCID tabs are named "Plugiciel de profil ORCID" on these
screens; that is the report ["In 32 interface languages, both ORCID
settings tabs carry the name of the retired ORCID Profile plugin"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U04-A11-orcid-tabs-named-after-old-plugin.md).

## Cause

pkp-lib's French (Canada) `locale/fr_CA/user.po`, which the three
applications share, has no text for twelve keys that English and French
(France) have, on `main` and `stable-3_5_0` alike:

- `orcid.manager.siteWide.enabled` and `.description`, the site switch
  (`OrcidSiteSettingsForm`);
- nine `orcid.field.*` texts that ui-library's `FieldOrcid.vue` shows:
  `.verification.request`, `.verification.requested`,
  `.verification.resendRequest`, `.authorEmailModal.title`,
  `.authorEmailModal.message`, `.authorEmailModal.message.noAuthor`,
  `.deleteOrcidModal.title`, `.deleteOrcidModal.message` and
  `.unverified.shouldRequest`;
- `orcid.verify.success.redirect`, the verification page's redirect
  line (`orcidVerify.tpl`).

`Locale::translate()` (`classes/i18n/Locale.php`) prints `##key##` for a
text the language lacks, as no `Locale::translate` hook or missing-key
handler supplies one. The field's texts reach the browser the same way:
`UITranslator::getTranslationStrings()` fills the page's text bundle
through `Locale::get()`.

The English texts came with c79f538c51 (PR `pkp/pkp-lib#9818`, moving
ORCID into pkp-lib; the switch and seven field texts), 48d38e0a9a (PR
`pkp/pkp-lib#10346`, `.verification.resendRequest` and the redirect
line) and fd4c1eb4b8 (PR `pkp/pkp-lib#11545`, `.message.noAuthor`;
deb51fd97b on `stable-3_5_0`). No change removed a French (Canada)
text: the translations were never made.

These twelve are part of a wider French (Canada) gap: on
`stable-3_5_0` (pkp-lib 771474347e) it lacks 299 of pkp-lib's 4315
English texts, where French (France) lacks 24. Its translators are
active (Weblate merges of 2026-09-23).

Reach:

- Read in the code: the submission wizard's "Contributors" step builds
  the same contributor form (`PKPSubmissionHandler`, `ContributorForm`),
  so authors meet the field there; the profile's Identity tab asks
  `orcid.field.deleteOrcidModal.message` before removing a verified iD
  (`templates/user/identityForm.tpl`); the redirect line follows an
  author's ORCID sign-in.
- 18 more released ORCID texts lack French (Canada) in other files on
  3.5, and French (France) has them all: five `api.orcid.*` refusals
  (`api.po`), the "update scope" email template (four, `emails.po`),
  the invitation wizard's ORCID note and the acceptance pages' ORCID
  step (six, `invitation.po`), the reviewer row's "Send Review To
  ORCID" and its question (two, `submission.po`) and the editorial
  history's ORCID link (`common.po`). None shows on the screens these
  Steps reach (the walk recorded none of them).
- 3.5 only: the site tab's "custom redirect base URL" field
  (`orcid.manager.siteWide.orcidCustomRedirectBaseUrl` and its
  `.description`) came to `stable-3_5_0` on 2026-10-01 (42df172dd7, for
  `pkp/pkp-lib#12267`); no language has it yet.
- Other languages (code, `main`): of the 57 languages other than English
  and French (Canada), 29 lack all eleven switch and field texts, 4 lack
  some and 24 have them all; for their translators.
- Not this fault: on `main` only, the contributor form's
  `submission.submit.contributorType.*` and the site's
  `##admin.security##` tab, texts that came with unreleased pages.

## Proposed fix

Translate the twelve texts on PKP's Weblate (translate.pkp.sfu.ca),
project `pkp-lib`, component `user`, French (Canada): new prose belongs
to the French (Canada) translators. Suggested wording, in the file's own style
("revues, presses et serveurs", "courriel", "auteur-e") from the French
(France) texts:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/fix.diff),
for example:

```diff
+msgid "orcid.manager.siteWide.enabled"
+msgstr "Activer la fonctionnalité ORCID pour l'ensemble du site"
…
+msgid "orcid.field.verification.request"
+msgstr "Demander la vérification"
```

Tried on `main` with that wording applied to the checkouts: on all
three applications the site tab and every state of the field read in
French, with no `orcid` key left on these screens, and the English
screens read the same with and without it.

**Alternatives**

- Commit the wording to pkp-lib: faster, but it takes the wording out of
  the translators' hands, and Weblate's next sync may conflict with it.
- Fall back to another language when a text is missing (French (Canada)
  to French, or to English): a product decision, which a
  `Locale::translate` hook or the missing-key handler could carry.

**What goes with it**

- The 18 other ORCID texts under Cause, Reach, in the same Weblate
  project, so French (Canada) has the whole ORCID feature.
- Older versions: Weblate commits to `stable-3_5_0`, which is merged
  forward into `main`, so texts entered once reach both. 3.4 and 3.3
  have no built-in ORCID.
- The guard: the U04 spec's French scenario, asserting that the site
  tab and the ORCID iD field hold no untranslated text key (a Planned
  item).

Small: twelve French (Canada) texts on Weblate and no code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/lib.js),
  shared with the tab-name report. It takes the Steps on all three
  applications, on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `MODE=nb` in front
  takes steps 1 and 4 and the reads of steps 3, 9, 10 and 11 in English,
  answering "No" (the English control). The wording was tried as a
  diff holding it and the French (Canada) tab name, with
  `node bin/try-fix.js apply`, the script with and without `MODE=nb`,
  then `revert` and `MODE=nb` again.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  c312c01 (2026-10-03); the same keys at every step on both lines,
  besides 3.5's two redirect-URL keys. The script reaches the French
  pages of steps 3 and 9 by their addresses.
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5); `locale/fr_CA/user.po` is the same at both
  pkp-lib commits. `stable-3_5_0`: OJS c1cee76b95 (`lib/pkp`
  771474347e), OMP 9c5e24246 and OPS 38b61882d3 (`lib/pkp` cf3f984335),
  `lib/ui-library` d4e01883. `stable-3_4_0`: `lib/pkp` 767353f4fe;
  `stable-3_3_0`: `lib/pkp` ac3fa73402.
- Code reads: on `main` and 3.5, every pkp-lib `locale/*/*.po` against
  `locale/en` (an empty `msgstr` counts as missing); the readers of the
  twelve keys (`OrcidSiteSettingsForm`, `FieldOrcid.vue`,
  `identityForm.tpl`, `orcidVerify.tpl`); `Locale::translate()` and
  `UITranslator`; `ContributorForm` and its users
  (`PKPDashboardHandler`, `PKPSubmissionHandler`,
  `PKPAuthorDashboardHandler`). Introduced: `git log -S` of each key on
  `locale/en/user.po`, and `git log` of `locale/fr_CA/user.po`. 3.4 and
  3.3: no `classes/orcid` and no ORCID tab in pkp-lib's
  `origin/stable-3_4_0` and `origin/stable-3_3_0`; OJS and OPS ship the
  ORCID Profile plugin there instead.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops,
  none found (2026-10-03).
- Not driven: 3.4 and 3.3; the submission wizard's field, the
  profile's question and the verification page (code only); languages
  other than French (Canada) and English (code only).
- Unverified: whether Weblate holds French (Canada) texts for these
  keys that have not reached the branches; its site answers scripts
  with a bot check.
