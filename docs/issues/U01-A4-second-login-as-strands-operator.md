# While signed in as another user, "Login As" is still offered, and using it strands the operator in that account

- **Severity** low
- **Effort** medium
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the older user grids hide "Login As" during a Login As)
  - 3.3: none (code; the older user grids hide "Login As" during a Login As)
- **Introduced** `pkp/pkp-lib#10477` for `pkp/pkp-lib#10290` · [67ffa3ee0f](https://github.com/pkp/pkp-lib/commit/67ffa3ee0f341f2118f0c4f7a78617698916473e) · 2025-02-03 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** `pkp/pkp-lib#10731` (closed without a fix for this part, covering the Participants panel only)
- **Tracked in** spec U01 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An administrator or manager who has used "Login As" to act as an editor
or manager is still offered "Login As" on other people's rows: in
Settings › Users & Roles, the workflow's Participants panel and the
Reviewers table. Choosing it replaces the first "Login As" instead of
adding to it. So "Logout as" returns to the account the operator had
taken over, not to their own, and leaves that account plainly signed
in, with no way back offered.

The operator can see whose account they are in and gains no rights. To
get back, they sign out and sign in again with their own password.

It happens only when the account taken over may use "Login As" itself,
such as a Journal editor's or a Journal manager's.

## Impact

- **Lost**: no data. After "Logout as", the user menu shows the
  taken-over account's initials and name ("DB dbarnes"), a plain
  "Logout" and no "You are currently logged in as" line. Nothing says
  that the operator's own account has dropped out, or how to get back.
- **Who**: anyone allowed to use "Login As" (the Site Administrator,
  Journal managers, Journal editors) who uses it on an account that may
  use it too, then uses it again from there. Rare in ordinary use.
- **Way round**: "Logout", then sign in again as yourself.

Low: the operator loses only the way back, and the screen shows which
account they are in. A screen that did not show the signed-in account
after "Logout as" would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), nothing
  added. `dbarnes` is a Journal editor (OMP: Press editor; OPS:
  Preprint Server manager), so he can open Users & Roles and every
  workflow.
- The submission each app's steps open:
  - OJS: submission 7, "Developing efficacy beliefs in the classroom":
    participant "Domatilia Sokoloff", reviewer "Paul Hudson".
  - OMP: submission 16, "A Designer's Log: Case Studies in Instructional
    Design": participant "Michael Power", reviewer "Adela Gallego".
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production": participant "Carlo Corino" (OPS
    has no Reviewers table).

Steps:

1. Sign in as `admin`.
2. Settings › Users & Roles. On "Daniel Barnes"'s row, open the row
   menu, choose "Login As", then "OK". The user menu now reads "You are
   currently logged in as dbarnes" and offers "Logout as dbarnes".
3. Settings › Users & Roles. Open the row menu on "Ramiro Vaca"'s row
   and read it, then close it.
4. Open the submission above
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
   In "Participants", open the participant's "More Actions" and read it,
   then close it.
5. (OJS, OMP) In the Reviewers table, open the reviewer's "More Actions"
   and read it, then close it.
6. Back on Settings › Users & Roles, on "Ramiro Vaca"'s row, choose
   "Login As", then "OK".
7. Open the user menu and choose "Logout as rvaca".
8. Open the user menu and read it. Then open Administration
   (`/index.php/index/en/admin`).

**Expected**: steps 3 to 5 offer no "Login As", because a "Login As" is
already active, so step 6 cannot be taken. "Logout as" always brings
back `admin`.

**Observed**: every menu read in steps 3 to 5 offers "Login As":

```
Users & Roles, "Ramiro Vaca":  Edit · Email · Login As · Remove User · Disable User · Merge user
Participants:                  Edit · Notify · Login As · Remove
Reviewers (OJS, OMP):          Review Details · Edit · Cancel Reviewer · Email Reviewer · History · Login As · Editorial Notes
```

After step 6, the user menu's button shows "DB dbarnes RV rvaca", not
admin, and the menu reads "You are currently logged in as rvaca" with
"Logout as rvaca". After step 7, the browser lands on the dashboard
signed in as `dbarnes`. The menu offers "Edit Profile" and a plain
"Logout", with no "You are currently logged in as" line and no "Logout
as". Administration answers "The current role does not have access to
this operation."

A control: "Logout as dbarnes" pressed after step 2 brings back `admin`.

## Cause

The rule that a Login As does not start from within another one moved
from the legacy grid rows to the server-computed `canLoginAs` flag, and
lost the check that no Login As is already active on the way.

The legacy rows offer the action only when `!Validation::loggedInAs()`
holds, beside the administration-level check that the operator may act
as that user (`Validation::getAdministrationLevel() ===
ADMINISTRATION_FULL`): `UserGridRow`, `StageParticipantGridRow` and
`ReviewerGridRow`. The Vue managers that replaced them
(`UserAccessManager`, `ParticipantManager`, `ReviewerManager`) show
"Login As" whenever the item's `canLoginAs` is true. `pkp/pkp-lib#10290`
asked for that flag and quoted all three conditions: "just checking
whether its not the current user and whether we are not 'logged in as'
already", then the administration-level check. `pkp/pkp-lib#10477` (67ffa3ee0f) wrote
the flag without the `loggedInAs()` check:

- `PKP\security\Validation::canUserLoginAs()` (lib/pkp
  `classes/security/Validation.php`, line 490 on `main`) checks only for
  the same user and for `getAdministrationLevel() === ADMINISTRATION_FULL`.
  `PKP\submission\maps\Schema` calls it for the participants
  (`getPropertyParticipants()`) and the review assignments.
- `PKP\user\maps\Schema::getPropertyCanLoginAs()` (lib/pkp
  `classes/user/maps/Schema.php`, line 269) checks for the same user,
  then a site administrator, then the batched permission map. It never
  reads the impersonation state. Its rewrite for `pkp/pkp-lib#11791`
  (e19cbb0a79) kept the omission.

The server side does not stop a second Login As either.
`LoginHandler::signInAsUser()` (the address `login/signInAsUser/<userId>`,
which the confirmation's "OK" opens) runs only the administration-level
check, against the user currently signed in. `PKPSessionGuard::signInAs()`
then stores `'signedInAs' => $this->getUserId()`. A second sign-in
therefore overwrites `signedInAs`, which held the operator's own account,
with the account taken over first. `signOutAsUser()` restores that
account and clears `signedInAs`, and nothing points back to the operator.

Reach:

- Users & Roles, the Participants panel and the Reviewers table:
  walked (Steps).
- The REST API: `canLoginAs` in `/users`, in a submission's
  `reviewAssignments` and in its participants is true while a Login As
  is active (code).
- `login/signInAsUser/<userId>` typed directly while a Login As is
  active has the same effect as the menu item: walked on `main`
  (Evidence).
- The three legacy rows are still in lib/pkp `main` with their check
  (`UserGridRow.php:190`, `StageParticipantGridRow.php:115`,
  `ReviewerGridRow.php:165`). Only `UserGridRow` still renders on a
  screen (Administration › Hosted Journals › a journal's users), which
  cannot be opened during a Login As. The workflow's Vue managers call
  the other two grids' handlers only to open their windows (code).

## Proposed fix

A proposal; the team decides. Apply the old rule where the flag is
computed, so every screen and API client inherits it. Then make the
session keep the original account, so "Logout as" returns to it however
a second Login As is reached.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/second-login-as-strands-operator/fix.diff)
(lib/pkp only):

```diff
--- a/lib/pkp/classes/security/Validation.php
+++ b/lib/pkp/classes/security/Validation.php
@@ public static function canUserLoginAs(
-        // prevent self-login
-        if ($targetUserId === $currentUserId) {
+        // prevent self-login, and a second Login As while one is already active
+        if ($targetUserId === $currentUserId || self::loggedInAs()) {
             return false;
         }
--- a/lib/pkp/classes/user/maps/Schema.php
+++ b/lib/pkp/classes/user/maps/Schema.php
@@ protected function getPropertyCanLoginAs(
+        // no second Login As while one is already active
+        if (Validation::loggedInAs()) {
+            return false;
+        }
+
         $isSiteAdmin = (bool) ($auxiliaryData['isSiteAdmin'] ?? Validation::isSiteAdmin());
--- a/lib/pkp/classes/core/PKPSessionGuard.php
+++ b/lib/pkp/classes/core/PKPSessionGuard.php
@@ public function signInAs(
-            'signedInAs' => $this->getUserId(),
+            // keep the original account when already signed in as another user, so "Logout as" returns to it
+            'signedInAs' => $this->session->get('signedInAs') ?: $this->getUserId(),
```

The two flag computations are the only places where `canLoginAs` is
decided, and the check follows the legacy rows'. The session guard line
covers `login/signInAsUser/<userId>` typed directly, which the flag
cannot hide: that second Login As still goes through, checked against
the account signed in, but "Logout as" now returns to the operator's own
account.

Tried on `main` on OJS, OMP and OPS. With the fix, steps 3 to 5 offer no
"Login As". "Logout as dbarnes" brings back `admin`, and Administration
opens. The neighbour check, with the fix in and out:

- unchanged: `dbarnes`, signed in as himself, is still offered "Login
  As" on the three rows, and `admin`'s plain "Login As" › "Logout as"
  round trip still brings back `admin`;
- changed as intended: the sign-in-as address typed during a Login As
  now lands as `rvaca` under "AA admin RV rvaca", and "Logout as rvaca"
  brings back `admin` (without the fix, as in Observed).

**Alternatives**:

- Hide "Login As" in the three ui-library configs, using the page's
  impersonation state. That leaves the API flag wrong for other clients,
  and a typed address still strands the operator.
- The team's choice for a typed second Login As: let it go through and
  return to the operator's own account (this proposal), or refuse it in
  `LoginHandler::signInAsUser()` while `Validation::loggedInAs()` is
  set, which is stricter but needs a new error message.

**What goes with it**:

- The API's `canLoginAs` becomes false for every row while a Login As
  is active. No screen relies on the opposite.
- The diff applies as it stands to `stable-3_5_0`, where the same three
  methods carry the same lines. 3.4 and 3.3 do not need it.
- The guard: a pkp-lib unit test that `canUserLoginAs()` and the user
  map's `canLoginAs` are false while `signedInAs` is set, and an e2e
  check that after a Login As no row offers "Login As".

Medium: three small changes in three pkp-lib classes, with tests. Each
is one or two lines, but they sit in separate places.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/second-login-as-strands-operator/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/second-login-as-strands-operator/lib.js),
  run on an install reset to PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`, then
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/second-login-as-strands-operator/walk.js`.
  Its `nb` argument runs the neighbour check: `dbarnes` signed in as
  himself on the same three rows; `admin` › "Login As" `dbarnes` ›
  "Logout as"; and, during that Login As, the sign-in-as address for
  `rvaca` typed directly, then "Logout as".
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/second-login-as-strands-operator/fix.diff ojs omp ops`.
  Then the dataset was reloaded and the walk and its `nb` check run,
  followed by `revert`, and the `nb` check again with the fix out. No
  request answered a server error and no page script failed in any run.
- 3.5 walked with the same script on the `stable-3_5_0` dataset (3.5.0.5):
  the same menus and the same end state on the three apps.
- 3.4 and 3.3, code: lib/pkp `stable-3_4_0`'s
  `controllers/grid/settings/user/UserGridRow.php`,
  `controllers/grid/users/stageParticipant/StageParticipantGridRow.php`
  and `controllers/grid/users/reviewer/ReviewerGridRow.php` offer the
  action only under `!Validation::loggedInAs()`. `stable-3_3_0`'s
  `.inc.php` versions do the same under `!Validation::isLoggedInAs()`.
  These grids are Users & Roles, the participants list and the
  reviewers list on those versions. Their `LoginHandler::signInAsUser()`
  also overwrites `signedInAs`, so only a typed address could strand
  the operator there. Not driven.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363); OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5). 3.5: OJS c1cee76b95 (lib/pkp 771474347e),
  OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335), lib/ui-library
  d4e01883. 3.4: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b, lib/pkp
  767353f4fe. 3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp
  ac3fa73402.
- Introduced: `git blame` on `canUserLoginAs()` and on the first
  version of `getPropertyCanLoginAs()` leads to 67ffa3ee0f
  (`pkp/pkp-lib#10477`, merged 2025-02-14). The legacy rows'
  `loggedInAs()` checks are older.
- Upstream: searched 2026-10-04 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library ("login as" with impersonation, "logout as", nested,
  "already logged in as", `canLoginAs`, `getPropertyCanLoginAs`,
  `signedInAs`). `pkp/pkp-lib#10731` asked that the Participants panel
  not offer "Login As" "for a person who already is logged in similar to
  how settings user's & roles Login As function works". It was closed
  once its main point (no "Login As" for users without the right) passed
  testing.
