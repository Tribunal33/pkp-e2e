# Users & Roles in French (Canada): the Users tab and the "Invite to a role" pages show raw codes

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the older user grid, no search box or invitations)
  - 3.3: none (code; the older user grid, no search box or invitations)
- **Introduced** not traced; present since at least [be3be14e](https://github.com/pkp/pkp-lib/commit/be3be14eff471d613a2c5509d5d605196fd83817) (2024-09-19)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the French (Canada) interface, the "Users" tab of Settings › Users &
Roles prints raw codes instead of French text: the search box
"##userAccess.search##", the Invitations heading
"##invitation.header## (0)" and its button
"##invitation.inviteToRole.btn##", the Invitations columns
"##INVITATION.TABLEHEADER.NAME##" and "##INVITATION.HEADER##", and the
user list's "Start Date" column "##USERACCESS.TABLEHEADER.STARTDATE##".

The "Invite to a role" pages behind that button are codes almost
throughout: the step names, the field help, every "next" button and
the confirmation window. The email step opens with an empty subject and
message. A manager who sends it anyway does invite the person, who
receives the English invitation email, which the manager never saw.

Everything works, and switching the interface to English shows every
text. About twenty languages, French (France) among them, have these
texts.

## Impact

- **Lost:** nothing. The list, the search and the invitation all work.
  The manager cannot see what the invitation email says before sending
  it.
- **Who:** managers and administrators who use the French (Canada)
  interface, on Settings › Users & Roles and whenever they invite
  someone to a role.
- **Way round:** the English interface shows every text and fills the
  invitation email.

Low: the tasks get done in French, through pages of raw codes. An
invitation that could not be sent in French would raise it; the walk
sent one.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (`publicknowledge`). It offers
  English and Français (Canada).

The Users tab:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/management/settings/access`). The
   "Users" tab shows "Invitations (0)" with the button "Invite to a
   role", then "Current Users (39)" (a press "(38)", a preprint server
   "(25)") with the search box "Enter a user's name, role (e.g Journal
   editor), or affiliation" and the columns "Name", "Email", "Roles",
   "Start Date", "Affiliation".
3. Open the initials menu at the top right and choose "français". The
   page reopens in French, at
   `/index.php/publicknowledge/fr_CA/management/settings/access`.

Inviting (OJS):

4. Click the Invitations button ("##invitation.inviteToRole.btn##").
5. Enter `u53r42.invitee@mailinator.com` and click the step's blue
   button.
6. Enter the given name "u53r42 Invitee", choose the role "Rédacteur-trice
   de rubrique" with today as the start date, and click the blue button.
7. Leave the email as the step shows it and click the blue button; then
   the confirmation window's button.
8. Back on the "Users" tab, open the new invitation row's "…" and choose
   its second item.

**Expected:** every text in French, as the French (France) interface
shows them (for example "Inviter à un rôle", "Nom", "Annuler
l'invitation"), and at step 7 the invitation email in French, ready to
edit.

**Observed:** the Users tab reads, top to bottom (column headers in
capitals, as the page prints them):

```
##invitation.header## (0)
##invitation.inviteToRole.btn##
##INVITATION.TABLEHEADER.NAME##  COURRIEL  ##INVITATION.HEADER##  STATUT  AFFILIATION
Utilisateurs-trices actuels-elles (39)
##userAccess.search##
NOM  COURRIEL  RÔLES  ##USERACCESS.TABLEHEADER.STARTDATE##  AFFILIATION
```

A screen reader also hears "##common.moreActions##" for both tables'
last column, and "##common.loaded##" when the list loads.

Inviting:

- Step 4: the page is headed "##invitation.wizard.pageTitle##"; the
  steps read "##userInvitation.searchUser.stepName##",
  "##userInvitation.enterDetails.stepName##" and
  "##userInvitation.sendMail.stepName##"; the field is
  "##userInvitation.searchField##" and the button
  "##userInvitation.searchUser.nextButtonLabel##".
- Step 5: "##userInvitation.search.userNotFound##", the role table's
  columns "##USERINVITATION.ROLETABLE.ROLE##",
  "##USERINVITATION.ROLETABLE.STARTDATE##" and others, the button
  "##userInvitation.enterDetails.nextButtonLabel##". The field labels
  ("Prénom", "Nom de famille") and the role names are French.
- Step 7: "Objet" and "Message" are empty. The template list offers
  "Notification d'invitation à un rôle", previewed in English
  ("Invitation to New Role Dear {$recipientName}, In..."). The button
  reads "##userInvitation.sendMail.nextButtonLabel##". Clicking it sends
  the invitation. The window that follows reads
  "##userInvitation.modal.title##", "##userInvitation.modal.message##"
  and "##userInvitation.modal.button##". The invitee receives "You are
  invited to new roles", in English.
- Step 8: the row reads "u53r42 Invitee … Rédacteur-trice de rubrique
  ##userInvitation.status.invited##"; its "…" is named
  "##invitation.management.options##"; the menu offers "Modifier" and
  "##invitation.cancelInvite.actionName##". The window this opens is
  headed "##invitation.cancelInvite.title##". It lists
  "##userInvitation.roleTable.role##: Rédacteur-trice de rubrique", and
  its two buttons are "##invitation.cancelInvite.title##" and "Annuler".

## Cause

The Users tab and the invitation pages are ui-library pages whose texts
are messages from pkp-lib or the app. A message reaches the page's
`t()` through `UITranslator::getTranslationStrings()`
([UITranslator.php L56-L76](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/i18n/ui/UITranslator.php#L56-L76)).
It calls `Locale::get()` for each message the app's
`registry/uiLocaleKeysBackend.json` lists. A message missing from the
interface language comes back as `##key##`: `Locale::translate()` has no
fallback to another language
([Locale.php L504-L526](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/i18n/Locale.php#L504-L526)).
The code is right to show the gap. The gap is in the French (Canada)
translation.

The Users tab (`UserAccessManager` and `UserInvitationManager` in
ui-library) uses 18 pkp-lib messages that French (Canada) lacks:

- the labels: `userAccess.search`, `userAccess.tableHeader.startDate`,
  `invitation.header`, `invitation.inviteToRole.btn`,
  `invitation.tableHeader.name`;
- screen-reader texts: `common.moreActions`, `common.loaded`;
- a user row's "Disable" and "Enable" windows:
  `user.disabledModal.title`, `user.disabledModal.description`,
  `user.enabledModal.title`;
- an invitation row and its windows: `userInvitation.status.invited`,
  `invitation.management.options`,
  `invitation.cancelInvite.actionName`, `invitation.cancelInvite.title`,
  `invitation.cancelInvite.message`, `userInvitation.edit.title`,
  `userInvitation.edit.message`, `userInvitation.roleTable.role`.

All 18 are in English and French (France) on both `main` and
`stable-3_5_0`. French (Canada) has none of them, in
[`fr_CA/invitation.po`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/locale/fr_CA/invitation.po)
(only a file header),
[`fr_CA/userAccess.po`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/locale/fr_CA/userAccess.po)
(only `userAccess.tableHeader.name`), `fr_CA/common.po` or
`fr_CA/user.po`. The English texts came with 3.5, from 2024-09 to
2024-11. French (France) received them through pkp's translation
platform (Weblate) from 2025-09.

Reach:

- The invitation pages: none of pkp-lib's 121 invitation messages are
  in French (Canada). Neither are OJS's own seven (`locale/fr_CA`: the
  wizard's description, the step descriptions, "user not found", the
  masthead column, the confirmation message). OMP and OPS have the same
  seven in their own `locale/en`, and no French translation of them.
  Walked on OJS; read in the code for OMP and OPS.
- The invitation email: pkp-lib's `fr_CA/emails.po` has no
  `emails.userRoleAssignmentInvitationNotify.subject` or `.body`. An
  install that added French (Canada) stores that template's French text
  empty: on the walked install, `email_templates_default_data` holds
  `USER_ROLE_ASSIGNMENT_INVITATION` for `fr_CA` with an empty subject and
  body. This is why step 7 opens empty.
- French (Canada) on 3.5 overall: 297 pkp-lib messages that English has
  are missing from `fr_CA`, 275 of which French (France) has. Counted in
  the code.
- Other languages: the six visible labels are translated in 20
  languages besides English, French (France) among them, on both lines
  (`invitation.tableHeader.name` in 19). pkp-lib's other 50 language
  folders lack them too, so those interfaces show the same codes.
- OMP's and OPS's own French (Canada) gaps elsewhere are a separate
  report
  ([U57-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-omp-ops-french-texts-internal-names.md)).
- Excluded:
  - Messages missing from English too, so a separate fault each: the
    rows' "…" button `userAccess.management.options`
    ([U53-A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A5-users-row-button-raw-code-name.md)),
    the header's `common.help` and the wizard's
    `invitation.wizard.completeSteps`.
  - Messages added on `main` only, which no translation has yet:
    `navigation.content` and `editor.submission.searchGlobal` in the
    header.
  - On a preprint server, the "Roles" column's
    "##default.groups.name.manager##" and
    "##default.groups.name.sectionEditor##", which are OPS's own French
    (Canada) role names (spec U53 OPS1).

## Proposed fix

These are strings for the French (Canada) translators, not a code
change. They go in through Weblate, or as a commit that Weblate picks
up. Either way the texts should be checked against Weblate first: a
translator last worked on `fr_CA/userAccess.po` there on 2026-09-23
(its `PO-Revision-Date`), so it may already hold some of them. Landing
them on `stable-3_5_0` reaches `main` with the next merge.

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-french-raw-codes/fix.diff)
adds the Users tab's 18 messages to `fr_CA/invitation.po`,
`userAccess.po`, `common.po` and `user.po`. Its paths are relative to an
app checkout (`lib/pkp/…`); apply it to a pkp-lib clone with `-p3`. It
applies as it stands to `stable-3_5_0`. Twelve messages copy French
(France). Six differ:

- `invitation.header` "Invitations": French (France) has
  "Invitations en cours".
- `userAccess.tableHeader.startDate` "Date de début": French (France)
  has "Depuis le".
- `userAccess.search` "Saisir le nom, le rôle (p. ex. rédacteur-trice)
  ou l'affiliation d'un-e utilisateur-trice".
- `userInvitation.status.invited`, `invitation.cancelInvite.message` and
  `userInvitation.edit.message`: written in the inclusive forms French
  (Canada) uses ("Invité-e", where French (France) writes "Invité/e").

This is a proposal, and the wording is the translators' call.

An earlier version of the diff, with six of these messages, was tried on
`main` on the three apps. The tab then read "Invitations (0)",
"Inviter à un rôle", the search text and the columns "NOM",
"INVITATIONS", "DATE DE DÉBUT" and "PLUS D'ACTIONS", with no code left
from those six. Every English label and every other French label read
the same with the fix in and out. The widened diff was only
dry-run-applied to the four checkouts; it was not walked.

**Alternatives**:

- Fall back to a related language (`fr_CA` to `fr`) or to English when a
  message is missing, in `Locale::translate()`. This would hide every
  gap, in every language. It is a product decision: pages would mix
  languages, and translators would no longer see what is missing.
- Copy all 275 missing messages from French (France). The two
  translations write inclusive forms differently ("utilisateur/ice"
  against "utilisateur-trice"), so a translator would have to review
  each one.

**What goes with it**:

- The invitation pages: the rest of pkp-lib's 121 invitation messages,
  and the apps' own seven in OJS, OMP and OPS, with these 18.
- The invitation email: its French (Canada) subject and body in
  `fr_CA/emails.po`. An install that already has French (Canada) stores
  that template empty, so the new text reaches it only when its email
  templates are reinstalled (`lib/pkp/tools/installEmailTemplate.php`)
  or through an upgrade step that fills empty default templates.
- If the English search text loses its example
  ([U53-A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A4-users-search-example-journal-role.md)),
  the French (Canada) text should drop "(p. ex. rédacteur-trice)" with
  it.
- 3.4 and 3.3 have no such pages.

Medium: the tab's 18 strings are small, but the invitation pages need
about 130 more across pkp-lib and the three apps, and the email's French
reaches existing installs only through a repair of their stored
templates.

## Evidence

- Kept scripts, run on an install freshly loaded from the default
  dataset:
  - [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-french-raw-codes/walk.js),
    Steps 1 to 3 on each app, recording every `##key##` on the tab
    (text and attributes, screen-reader text included):
    `PROBE_FEATURE=<feature> node bin/probe.js all shared/playwright/checks/issues/users-french-raw-codes/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It chooses
    "français" from the dashboard's initials menu, then opens the Users
    page's address.
  - [`invite.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-french-raw-codes/invite.js),
    Steps 4 to 8 on OJS `main`:
    `PROBE_RUN=invite PROBE_FEATURE=<feature> node bin/probe.js ojs shared/playwright/checks/issues/users-french-raw-codes/invite.js`.
    In its walk the run stopped after step 7's send. Step 8 was read on
    the same install with `INVITE_FROM_ROW=1`. The invitee's mail was
    read in the install's outgoing mail.
  - The fix trial (the six-message diff): `node bin/try-fix.js apply shared/playwright/checks/issues/users-french-raw-codes/fix.diff ojs omp ops`,
    `walk.js` on `main`, then `node bin/try-fix.js revert shared/playwright/checks/issues/users-french-raw-codes/fix.diff ojs omp ops`.
    The diff was widened afterwards (dry-run only).
- Walked: the Users tab on `main` and `stable-3_5_0`, OJS, OMP and OPS;
  the invitation pages on OJS `main`. Each walk ran on a freshly loaded
  default dataset (PostgreSQL).
- Branch tips:
  - `main`: ojs `bade233f73`, omp `3b0ecf794c`, ops `c8af945bb7`;
    pkp-lib `2e377d27fc` (OJS) and `3dc90c81a6` (OMP, OPS; their `fr_CA`
    files are the same); ui-library `280f98c570`.
  - `stable-3_5_0`: ojs `92b9a16b48`, omp `3081c9b00d`, ops `cf4fce69bd`;
    pkp-lib `a9c76aed62`; ui-library `1a7a47504c`.
  - `stable-3_4_0`: ojs `9571d8fde7`, pkp-lib `df13621c2d`, ui-library
    `ee684b341b`. `stable-3_3_0`: ojs `9fdb9bcf9a`, pkp-lib `d446601ebe`,
    ui-library `96959f9ed4`.
- Code reads:
  - Every `t()` message in ui-library's `src/managers/UserAccessManager`
    and `src/managers/UserInvitationManager` (`main` and 3.5), and every
    code the invitation walk showed. Each was checked in `locale/en`,
    `fr` and `fr_CA` of pkp-lib and the app, multi-line entries
    included. `manager.people.confirmRemove` (the "Remove User" window)
    is OJS's own, and French (Canada) has it.
  - `git log -S` on each message in `locale/en` dates the English texts:
    `common.moreActions` be3be14eff (2024-09-19); `invitation.header`,
    `invitation.inviteToRole.btn` and `invitation.tableHeader.name`
    e8bdca4673 (2024-10-24); `userAccess.search` and
    `userAccess.tableHeader.startDate` 4729a3cd9c (2024-11-01).
    No commit in `locale/fr_CA` ever held them. `fr_CA/invitation.po`
    and `fr_CA/userAccess.po` first appeared in the translation merge
    25182919bf (2026-09-23). French (France) received them through
    Weblate (0d541ad70f, 2025-09-17, and later merges).
  - `UITranslator::getTranslationStrings()`, `Locale::translate()` and
    `LocaleFile::loadArray()`: an empty or missing message prints
    `##key##`, and the UI cache follows the `.po` files' times.
  - 3.4 and 3.3: `templates/management/access.tpl` on `stable-3_4_0`
    and `stable-3_3_0` shows the older user grid on the "Users" tab.
    Their ui-library has no `UserAccessManager` or
    `UserInvitationManager`, and their `locale/en` has no
    `invitation.po` or `userAccess.po`.
- Not driven: the invitation pages on OMP and OPS and on 3.5; the
  acceptance page in French (Canada); a user row's "Disable" and
  "Enable" windows. All are read in the code only.
- Unverified:
  - What Weblate holds for French (Canada); its pages refused an
    automated read.
  - Why the cancel window's explanation paragraph is blank, not a code;
    it was not compared with English.
