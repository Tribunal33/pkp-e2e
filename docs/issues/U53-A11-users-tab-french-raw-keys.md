# In French (Canada), the Users & Roles "Users" tab and the role invitation pages show codes instead of labels

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (no "Media" page)
  - 3.4: none (code; the older users list, no invitations)
  - 3.3: none (code; the older users list, no invitations)
- **Introduced** not traced: no change broke it. The English texts came with the role invitations and the new users list (`pkp/pkp-lib#9658`, [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) 2024-09-26, [e8bdca4673](https://github.com/pkp/pkp-lib/commit/e8bdca46737fb77d39a7a041cec5f7526dd07835) 2024-10-31, [4729a3cd9c](https://github.com/pkp/pkp-lib/commit/4729a3cd9cabc98712aaf91a227d984bdce7dcb9) 2025-02-04), and French (Canada) never received them
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a11), spec U47 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a7) (the "Media" page's "More Actions"), spec U16 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a15) (the "Categories" tab's "More Actions"), spec U30 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a9) (the journal review stage's "Author Response" table's "More Actions")
- **Checked** 2026-10-02, the "Author Response" table 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A manager working in French (Canada) who opens Settings › Users & Roles
sees codes where the "Users" tab's labels should be: the search box
reads "##userAccess.search##", the Invitations table is headed
"##invitation.header## (0)" with the button
"##invitation.inviteToRole.btn##", two of its columns and the users
list's "Start Date" column are codes, and the window that disables a
user is titled "##user.disabledModal.title##". The button opens the
role invitation pages, where every heading, step, field and button but
"Annuler" is a code. To a screen reader, the "…" menus and hidden
"More Actions" column headings of the workflow and settings lists read
"##common.moreActions##" on `main` and 3.5, seen on the "Users" tab, a
publication's "Media" page, the "Categories" tab and a journal review
round's "Author Response" table.

The rest of the tab is French, and its buttons and menus still work, so
a manager can get through by switching the interface to English.

The fix covers French (Canada) only: its missing texts, entered on
PKP's Weblate by the French (Canada) translators or a developer, or
committed as the tried diff, with no code change. Every journal, press
and preprint server that offers French (Canada) shows these codes. The
same five tab texts are also missing in 50 other languages; French
(France) is not among them, as it has all five. Those languages are
for their translators and are not counted in this report's effort.

## Impact

- **Lost.** Only labels: the tab's and the invitation pages' texts.
  Read in the code, someone invited to a role who opens the acceptance
  pages in French (Canada) also sees codes in place of their labels;
  that was not tried in a browser.
- **Who.** Managers who use the interface in French (Canada), each
  time they open the users list or invite someone. Also screen-reader
  users, who hear the code as the name of the "…" menus across the
  workflow and settings lists.
- **Way round.** Switch the interface to English.

Low: labels show as codes in one language while every task still gets
done. It would rise if a person invited to a role could not accept the
invitation in French (Canada), which nobody has tried in a browser.

## Steps to reproduce

Users tab:

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main`: the journal,
  press or server `publicknowledge`, which offers English and French
  (Canada). Its users list starts with the site administrator, "admin
  admin".

1. Sign in as `rvaca` (the journal's, press's or server's manager).
2. Open the menu under the initials at the top right and, under
   "Change Language", choose "français".
3. Open "Paramètres" › "Utilisateurs-trices et rôles"
   (`/index.php/publicknowledge/fr_CA/management/settings/access`). The
   "Utilisateurs-trices" tab is open.
4. Read the search box, the Invitations table's heading, button and
   column headings, and the column headings of "Utilisateurs-trices
   actuels-elles".
5. On the first row of that list, the site administrator "admin
   admin", press "…" and choose "Désactiver". Read the window's title
   and the line under it. Close the window.
6. Press the Invitations table's button (step 4's). Read the page it
   opens, then leave it without sending.

**Expected.** French text throughout, as the tab's other labels read
("Courriel", "Rôles", "Statut", "Affiliation"): for example, as
pkp-lib's French (France) has them, "Invitations en cours (0)",
"Inviter à un rôle", the column "Nom", the window "Désactiver admin
admin", and the page "Inviter une personne à accepter un rôle".

**Observed.** Step 4:

```
Search box:            ##userAccess.search##
Invitations table:     ##invitation.header## (0)        [##invitation.inviteToRole.btn##]
  columns:             ##INVITATION.TABLEHEADER.NAME##  COURRIEL  ##INVITATION.HEADER##  STATUT  AFFILIATION
Users list columns:    NOM  COURRIEL  RÔLES  ##USERACCESS.TABLEHEADER.STARTDATE##  AFFILIATION
```

- Step 5: the title "##user.disabledModal.title##" over
  "##user.disabledModal.description##", then the window's French
  answer for the site administrator's row, "Vous n'avez pas les
  autorisations nécessaires pour modifier cet ou cette
  utilisateur-trice."
- Step 6: the page
  `/index.php/publicknowledge/fr_CA/invitation/create/userRoleAssignment`
  reads "##invitation.wizard.pageTitle##" in the breadcrumb and as its
  heading, then "##invitation.wizard.pageTitleDescription##", the steps
  "1 ##userInvitation.searchUser.stepName## 2
  ##userInvitation.enterDetails.stepName## 3
  ##userInvitation.sendMail.stepName##", the field
  "##userInvitation.searchField##" and the buttons "Annuler" and
  "##userInvitation.searchUser.nextButtonLabel##".

The columns are upper-cased by the page's style, so the codes show in
capitals. To a screen reader the last column of both tables is also
"##common.moreActions##". No request failed and no script error showed.
The same page in English shows English labels throughout.

"Media" page (`main` only):

Preconditions:

- The same dataset. A submission in Production: OJS 5 "Genetic
  transformation of forest trees", OMP 4 "How Canadians Communicate:
  Contexts of Canadian Popular Culture", OPS 1 "The influence of
  lactation on the quantity and quality of cashmere production".
- Any PNG image, here `figure.png`.

7. Sign in as `dbarnes`, open the submission from "Active submissions"
   and, in the side menu, choose "Publication" ("Preprint" on a preprint
   server) › "Media".
8. Press "Add Media File", choose `figure.png`, pick "Image" and "Web
   resolution", and press "Upload Files". The list shows `figure.png`.
9. Open the menu under the initials and, under "Change Language", choose
   "français".
10. Open the French "Media" page by its address,
    `/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=publication_6_media`
    (OMP `workflowSubmissionId=4&workflowMenuKey=publication_4_media`,
    OPS `workflowSubmissionId=1&workflowMenuKey=publication_1_media`).
    In French the side menu's entry for the page reads
    "##publication.media##". With a screen reader, read the name of the
    list's last column and of `figure.png`'s "…" button. Neither name
    shows on screen.

**Expected.** To a screen reader, "Plus d'actions" (pkp-lib's French
(France) text) for both, as the visible columns read "Nom de fichier",
"Taille" and "Date de téléversement".

**Observed.** Step 10, as a screen reader names them:

```
Last column:  ##common.moreActions##
"…" button:   ##common.moreActions##
```

On screen, the page also shows codes for its own texts: the heading
"##publication.mediaFiles##", the line under it, and the buttons
"##publication.mediaFiles.batchLinkMedia##" and
"##publication.mediaFiles.add##". Those are outside this report (Cause,
Reach). In English, both names read "More Actions".

## Cause

pkp-lib's French (Canada) translation has no text for these keys.
`lib/pkp/locale/fr_CA/invitation.po` holds a header and no entry, so
all 121 texts of the role invitations are missing (the English file has
128 entries, as it defines 7 keys twice): the Invitations
table, the invitation pages, and the pages an invited person accepts
on. `locale/fr_CA/userAccess.po` holds one of its three texts ("Nom"),
leaving out `userAccess.search` and `userAccess.tableHeader.startDate`.
`locale/fr_CA/user.po` lacks `user.disabledModal.title`,
`user.disabledModal.description` and `user.enabledModal.title`, and
`locale/fr_CA/common.po` lacks `common.moreActions`.

`Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`) does not fall
back to another language for a missing text, so the page prints
`##key##`. That is PKP's stated design (`pkp/pkp-lib#784` points to the
"Default Translation" plugin for an English fallback). The editorial
screens get their texts from the same bundle through
`api/v1/_i18n/ui.js`.

`invitation.po` was created by 7e3a26ea83 (PR `pkp/pkp-lib#10472`),
and the tab's keys were added by e8bdca4673 (PR `pkp/pkp-lib#10558`)
and 4729a3cd9c (PR `pkp/pkp-lib#10576`, which created `userAccess.po`).
The French (Canada) files were created on Weblate on 2026-09-23:
`invitation.po` in d103c8436e and `userAccess.po` in 093e914f3a, both
merged into `stable-3_5_0` in 25182919bf. `userAccess.po` received
"Nom" the same day; `invitation.po` is still a header only. pkp-lib's
French (France) files have 120 of the 121 invitation texts and all
three of `userAccess.po`.

Reach:

- On screen (`main` and 3.5, all three applications): the "Users"
  tab's search box, Invitations heading, button and two columns, the
  "Start Date" column, the disable window's title and line, and the
  first page of "Invite to a role".
- The applications' own invitation texts: OJS, OMP and OPS each define
  18 invitation texts in their own `locale/en/invitation.po` (17 of
  their own and one that replaces pkp-lib's), and none has them in French (Canada).
  On screen: the first invitation page's description line
  "##invitation.wizard.pageTitleDescription##".
- Read in the code: the rest of the invitation pages (the details and email
  steps, the edit and cancel windows), the window that enables a
  disabled user (`user.enabledModal.title`), the Invitations row's
  "Invited on …" status (`userInvitation.status.invited`), and the
  acceptance pages an invited person sees (`acceptInvitation.*`, 33
  texts).
- To a screen reader (`main` and 3.5, all three applications):
  `common.moreActions` names the "…" menus and the hidden last-column
  headings of the workflow and settings lists, in 20 ui-library
  components on `main` (the file, galley, reviewer, participant,
  discussion, citation, funder, category, media file and task template
  managers, the dashboard's bulk actions and the reader comments lists
  among them) and 8 on `stable-3_5_0`. It was seen on the "Users" tab,
  a publication's "Media" page, the "Categories" tab and the "Author
  Response" table, which only a journal's review stage has (each walked
  on `main` without the fix, the "Users" tab on 3.5 too). The
  "Categories" tab's and the "Author Response" table's other codes are
  texts new on `main` awaiting translation, outside this report; on 3.5
  the older categories table is French throughout (walked).
  The "Media" page's visible codes (`publication.media`,
  `publication.mediaFiles.*`, `common.selectedFile`,
  `common.clickToUploadFiles`, `common.upload.addFiles`) are texts that
  came to `main` with the page in
  [1a5a8b1d7e](https://github.com/pkp/pkp-lib/commit/1a5a8b1d7e52ad079e4a669d4a6f3795cab9e61f)
  (2026-05-06); no language has them yet because Weblate translates
  `stable-3_5_0`, which does not hold them, so they are not this
  report's.
- Other languages (code, `main`), for their translators: the five
  texts of step 4 are missing in 50 of pkp-lib's 70 other languages,
  French (Canada) included (Catalan, Greek, Spanish (Mexico), Italian,
  Russian and Chinese among them), and partly in Polish; 19 have them
  all, French (France) among them.
- Not this fault:
  - The row button's name `##userAccess.management.options##`, a key no
    language defines (spec U53
    [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a5),
    reported apart).
  - On a preprint server the "Rôles" cells
    "##default.groups.name.manager##" and
    "##default.groups.name.sectionEditor##", role names saved as codes
    (the report "A press's or preprint server's French (Canada)
    guidelines, checklist, privacy statement and role names show
    internal codes").
  - On a press, the "Rôles" tab's "##workflow.review.externalReview##"
    column (the report "In French (Canada), a press's book and chapter
    pages and Roles list show codes, even for editors' names").
  - `invitation.wizard.completeSteps`, the name of the invitation
    pages' step list for a screen reader, which no language defines
    (a code in English too).
  - Codes in the page's frame on every editorial page (`common.help`,
    `editor.submission.searchGlobal`, `navigation.content`,
    `common.loaded`), which belong to other screens.

## Proposed fix

Enter the missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), which writes the locale files, rather than
commit them. There are two parts: pkp-lib's texts (part 1, in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-french-raw-keys/fix.diff)
and tried) and the applications' own invitation texts (part 2, below,
not in the diff).

Part 1 goes in four components of Weblate's `pkp-lib` project, French
(Canada): `invitation`, `useraccess`, `user` and `common`. The diff
holds 126 texts, each copied from pkp-lib's French (France) file of the
same name: the 120 of `invitation.po` that French (France) has, each
written once, `userAccess.search` and `userAccess.tableHeader.startDate`, the
three disable and enable window texts of `user.po`, and
`common.moreActions`:

```diff
+msgid "invitation.header"
+msgstr "Invitations en cours"
+
+msgid "invitation.inviteToRole.btn"
+msgstr "Inviter à un rôle"
…
+msgid "userAccess.search"
+msgstr ""
+"Entrez le nom d'un/e utilisateur/ice, son rôle (p. ex. rédacteur/ice) ou son "
+"affiliation"
```

The texts are a proposal for the translators. French (France) writes
inclusive forms its own way ("utilisateur/ice") where the French
(Canada) files write "utilisateur-trice", and calls the Invitations
table "Invitations en cours"; the translators settle both.
`invitation.userRoleAssignment.validation.error.addUserRoles.userGroupNotInContext`
has no French (France) text and is left for them.

Tried on `main`, with the diff applied to the checkouts. On all three
applications the "Users" tab read "Entrez le nom d'un/e utilisateur/ice,
son rôle (p. ex. rédacteur/ice) ou son affiliation", "Invitations en
cours (0)", "Inviter à un rôle", the columns "Nom", "Invitations en
cours", "Depuis le" and, to a screen reader, "Plus d'actions"; the
window read "Désactiver admin admin" over "Rôles actuels : …"; and the
invitation page read "Inviter une personne à accepter un rôle" with its
three steps, field and button in French. One code stayed on that page,
its description line, which is part 2's. The English tab, window and
page read the same with the diff in and out.

Part 2, not in the tried diff: 18 of the invitation texts are each
application's own (`locale/en/invitation.po` of OJS, OMP and OPS:
`invitation.wizard.pageTitleDescription`, which names the journal,
press or server masthead, the details and email steps' descriptions,
and eight `acceptInvitation.*` texts of the acceptance pages). No
application has them in French (Canada): OJS's file is a header only,
and OMP and OPS have no such file. OJS's French (France) file has all
18 to copy from; OMP and OPS have no French text at all, so their
translators write them, from OJS's with "revue" made "presse" or
"serveur". They go in the `invitation` component of Weblate's `ojs`,
`omp` and `ops` projects. Not tried: translators' wording.

**Alternatives**

- Commit the diff to pkp-lib: the same result at once, but Weblate's
  next sync may conflict with it or empty the entries again.
- Fall back from a regional language to its parent (French (Canada) to
  French) when a text is missing: it would cover every gap of this kind
  at once, but it is a new rule in `Locale::translate()` beside PKP's
  decision not to fall back (`pkp/pkp-lib#784`), and a product
  decision.

**What goes with it**

- Left out: the other languages listed under Cause, and
  about 900 other pkp-lib texts that French (Canada) lacks, which this
  report did not place on these screens.
- Older versions: Weblate commits to a `translations/stable-3_5_0`
  branch, which pkp merges into `stable-3_5_0` (latest 25182919bf,
  2026-09-23), and `stable-3_5_0` is merged forward into `main`, so
  texts entered once reach 3.5 and `main`. 3.4 and 3.3 have neither
  the screens nor the keys.
- The guard: the U53 spec's French scenario, asserting that the "Users"
  tab and the first invitation page hold no `##` code (a Planned item).

Small: about 180 French (Canada) texts entered on Weblate and no code,
pkp-lib's tried as a diff.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/users-tab-french-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-french-raw-keys/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-french-raw-keys/lib.js).
  It takes the Steps on all three applications and changes nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/users-tab-french-raw-keys/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NB=1` in front
  takes steps 3 to 6 in English, the neighbour check). The fix was
  tried with `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the
  script with and without `NB=1`, then `revert`, and `NB=1` again.
- Kept script for Steps 7 to 10:
  [`shared/playwright/checks/issues/users-tab-french-raw-keys/media.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-french-raw-keys/media.js),
  on an install freshly loaded from the default dataset (it adds
  `figure.png`):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/users-tab-french-raw-keys/media.js`.
  Not walked on 3.5: `stable-3_5_0` has no "Media" page (no
  `MediaFileManager` in its ui-library, no `publication.mediaFiles.*`
  keys in pkp-lib's `locale/en`).
- Walked on `main` and `stable-3_5_0` (Steps 7 to 10 on `main`
  only), on PostgreSQL, from pkp/datasets c657990 (2026-10-01). Both
  lines showed the same codes at every step they share. The database plays no part (locale files); MySQL not
  checked.
- Differences from the Steps: the script closes the window of step 5
  with Escape and leaves the page of step 6 by opening another address.
- Tips: `main`: OJS b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5); the French (Canada) and French (France)
  files read are the same at both pkp-lib commits. `stable-3_5_0`: OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3 (`lib/pkp` cf3f984335,
  `lib/ui-library` d4e01883). `stable-3_4_0`: `lib/pkp` 32b0f4b4af.
  `stable-3_3_0`: `lib/pkp` f6ab331645.
- Code reads: on `main` and 3.5, pkp-lib's `locale/en`, `locale/fr_CA`
  and `locale/fr` `invitation.po`, `userAccess.po`, `user.po` and
  `common.po` (an empty `msgstr` counts as missing), every
  `locale/*/userAccess.po` and `locale/*/invitation.po` for the language
  counts, `locale/en`, `locale/fr` and `locale/fr_CA` `invitation.po` of
  OJS, OMP and OPS, the keys read by ui-library's `UserAccessManager`,
  `UserInvitationManager` and `acceptInvitation` sources, and
  `Locale::translate()`. 3.4 and 3.3: no `invitation.po` or
  `userAccess.po` in pkp-lib's `locale/en` (`en_US`) on
  `origin/stable-3_4_0` and `origin/stable-3_3_0`; the users list there
  is the older grid.
- Introduced: `git log --diff-filter=A` of pkp-lib's
  `locale/en/invitation.po` (7e3a26ea83) and `git log -S` of each key
  on pkp-lib's `locale/en` (e8bdca4673 for the tab's `invitation.*` keys, 4729a3cd9c for the
  `userAccess.*` keys, c2f9b5e9f9 (2025-02-25) for the disable window's
  texts) and `git log` of `locale/fr_CA/invitation.po` and
  `userAccess.po` (created d103c8436e and 093e914f3a, 2026-09-23).
- Upstream: pkp/pkp-lib and pkp/ui-library searched by the key names
  (`invitation.header`, `inviteToRole.btn`,
  `userAccess.tableHeader.startDate`, `userAccess.search`), "fr_CA
  invitation translation", "French users invitations untranslated",
  "invitation missing translations" and "Users & Roles French". Read:
  `pkp/pkp-lib#12874` (a review of the English invitation texts, open;
  not this fault).
- Not driven: 3.4 and 3.3 (code only); part 2 of the fix; the
  invitation pages after the first, the enable window and the acceptance pages (code only);
  languages other than French (Canada) and English (code only).
- Unverified: the acceptance pages in French (Canada), read in the
  code only (their 33 pkp-lib `acceptInvitation.*` texts and the
  applications' eight have no French (Canada) text); whether Weblate
  already holds French (Canada) texts for
  these keys that have not reached the branches; its public API did not
  answer.
- Kept script for the "Author Response" table (spec U30 A9):
  [`shared/playwright/checks/issues/users-tab-french-raw-keys/author-response.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-french-raw-keys/author-response.js),
  OJS only, on an install freshly loaded from the default dataset (it
  saves one response): `lkumiega` chooses "français", opens submission
  13 (review round 1, revisions requested) from "Mes soumissions" and
  submits a response from the "Author Response" card; `dbarnes` chooses
  "français", opens submission 13 and reads the table, its row's "…"
  button and menu, then the same table in English:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/users-tab-french-raw-keys/author-response.js`.
  Walked 2026-10-04 on `main` (OJS ff004d0973, `lib/pkp` 987776cd04,
  `lib/ui-library` 64d67363; pkp/datasets 566bb1f): the row's "…"
  button is named `##common.moreActions##` in French and "More Actions"
  in English. Not walked on
  3.5: `stable-3_5_0` has no "Author Response" table (no
  `ReviewRoundResponseManager` in its ui-library, none of the feature's
  keys in pkp-lib's `locale/en`); 3.4 and 3.3 neither.
- Unverified: the fix on the "Media" page and the "Author Response"
  table. The diff was not applied while walking Steps 7 to 10 or the
  table's script. Both read `common.moreActions` from
  the same text bundle as the users list, where the trial gave "Plus
  d'actions", so the same result is expected there but was not seen.
- The "Categories" tab (spec U16 A15): read by
  [`omp-french-catalog-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-catalog-raw-keys/walk.js)
  in its `MODE=tab`, which signs in as `dbarnes`, opens
  `/index.php/publicknowledge/fr_CA/management/settings/context` and
  its "Catégories" tab, and lists the codes on it; it changes nothing:
  `MODE=tab PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/omp-french-catalog-raw-keys/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Walked 2026-10-02 on
  `main` (pkp/datasets e8dafbc): the last column's hidden heading and
  each row's "…" button read `##common.moreActions##` on OJS, OMP and
  OPS. On `stable-3_5_0` the older table showed no code on any of the
  three. The fix was not applied for this read: the tab takes the same
  text from the same bundle.
