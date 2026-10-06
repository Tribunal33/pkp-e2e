# The "Invite to a role" address with a wrong last word shows an empty page instead of "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no invitation pages)
  - 3.3: none (code; no invitation pages)
- **Introduced** `pkp/pkp-lib#11266` for `pkp/pkp-lib#11118` · [92c8eb3bdd](https://github.com/pkp/pkp-lib/commit/92c8eb3bdd0feedc0a84d7c4cdfebcf585e875ee) (3.5), [8b428c8dee](https://github.com/pkp/pkp-lib/commit/8b428c8deed3d59cb58a908e2091a62e7c7e4d71) (main) · 2025-04-11 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Invite to a role" on Users & Roles opens
`/index.php/publicknowledge/en/invitation/create/userRoleAssignment`. The
last word is the invitation type. When a manager types the address with
another word there, the app fails on the server and shows an empty page:
`…/invitation/create/nosuchtype` does this, and so does a real type that
has no wizard, such as `…/invitation/create/reviewerAccess`. The same
address with no last word shows the "404 Not Found" page, and a wrong word
should get that page too.

The button always opens the wizard, and no email or link the app sends
points at this address with another type, so only an address typed or
pasted by hand reaches the empty page. The fix is a missing check in the page
that opens the wizard.

## Impact

- **Lost**: nothing; the server logs an uncaught error.
- **Who**: whoever may open the wizard and types a wrong address. On OJS
  `main` and on 3.5 that is managers and site administrators. On OMP and
  OPS `main` it also includes section-level editors and assistants
  (series editors and copyeditors on a press, moderators on a server),
  because those apps' pkp-lib predates the change that narrowed access to
  the wizard (`pkp/pkp-lib#13299`).
- **Way round**: the "Invite to a role" button.

Low: a server error where a "404 Not Found" page belongs, on an address
no screen, email or link offers with another type.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`.

Steps:

1. Sign in as `rvaca`.
2. Open Settings > Users & Roles and press "Invite to a role". The wizard
   opens at `/index.php/publicknowledge/en/invitation/create/userRoleAssignment`.
3. In the address bar, replace the last word, "userRoleAssignment", with
   "nosuchtype" (`/index.php/publicknowledge/en/invitation/create/nosuchtype`)
   and press Enter.
4. Replace it with "reviewerAccess"
   (`/index.php/publicknowledge/en/invitation/create/reviewerAccess`) and
   press Enter.
5. Remove the last word, leaving `/index.php/publicknowledge/en/invitation/create`,
   and press Enter.

**Expected**: steps 3 and 4 show the "404 Not Found" page, as step 5 does.

**Observed**: steps 3 and 4 each answer HTTP 500 with an empty page (no
title, no text). With PHP's `display_errors` on, as on many development
installs, the page shows the fatal error below instead. The line is
written to PHP's error log (with Apache, the server's error log). For
step 3:

```
PHP Fatal error:  Uncaught Exception: Invitation type 'nosuchtype' not found. in lib/pkp/classes/invitation/core/InvitationFactory.php:42
```

For step 4 (line 92 on OJS, 90 on OMP and OPS):

```
PHP Fatal error:  Uncaught Error: Call to a member function createHandle() on null in lib/pkp/pages/invitation/InitializeInvitationUIHandler.php:92
```

Step 5 answers 404 with "404 Not Found".

## Cause

`PKP\pages\invitation\InitializeInvitationUIHandler::create()` reads the
address's last word as the invitation type. It answers not-found when the
word is missing or numeric. Otherwise it passes the word to
`InvitationFactory::createNew()` and calls `createHandle()` on the
invitation's `getInvitationUIActionRedirectController()`. Two cases
get past that check:

- A word that is no registered type: `createNew()` throws a plain
  `Exception("Invitation type '…' not found.")`. Nothing catches it, so the
  request ends in an uncaught exception instead of the
  `NotFoundHttpException` the handler throws for its other bad addresses.
- A registered type with no wizard: `ReviewerAccessInvite`,
  `RegistrationAccessInvite` and `ChangeProfileEmailInvite` return `null`
  from `getInvitationUIActionRedirectController()` (its signature allows
  it), and `create()` calls `createHandle()` on that `null`.

The handler and its `create/<type>` address came with "refactor
invitation page handler" (`pkp/pkp-lib#11266` for `pkp/pkp-lib#11118`).
Before it, `InvitationHandler::invite` served only role invitations and
took no type. The refactor let each type supply its own wizard controller,
optionally, but `create()` never handles a type without one.

The app itself builds only two addresses for this handler, both from
Users & Roles (ui-library `UserInvitationManagerStore.js`):
`invitation/create/userRoleAssignment` and `invitation/edit/<id>` for the
role invitations it lists. Invitation emails link to
`invitation/accept` and `invitation/decline` with an id and key, which
another handler serves.

Reach:

- `edit()` in the same handler makes the same `null` call for an existing
  invitation of a type with no wizard, typed as `/invitation/edit/<id>`.
  Code read, not driven (the default dataset holds only role invitations):
  - `registrationAccess` invitations, created with the journal's id when
    `require_validation` is on in `config.inc.php` and someone registers
    with the journal, reach it in all three apps.
  - `reviewerAccess` invitations, created with the journal's id for a
    review request (`EditorAction`) and the review reminders
    (`ReviewRemind`, `ReviewRemindAuto`, `ReviewResponseRemindAuto`) when
    "one-click reviewer access" is on, reach it in all three apps.
  - `changeProfileEmail` invitations have no journal (`BaseProfileForm`
    creates them with the user's id alone). On OJS `main` and on 3.5,
    `edit()` first checks that the invitation belongs to the journal and
    already answers 404 for them; on OMP and OPS `main`, whose `edit()`
    has no such check, they reach the `null` call too.
- `ManagementHandler::editUser()` calls `createNew('userRoleAssignment')`
  with a fixed type and is not affected (checked on screen: a user's
  "Edit" opens their roles page).
- `PKP\API\v1\invitations\InvitationController::authorize()` calls
  `createNew()` with the request's type for `add` and `getMany`, so the API
  also answers a server error for an unknown type. No screen sends one
  (code read, not driven); it is left out of the fix below.

## Proposed fix

In `InitializeInvitationUIHandler`, throw `NotFoundHttpException` for an
unknown type and for a type with no wizard, in `create()` and in `edit()`.
The handler already answers not-found for its other bad addresses. Give
`InvitationFactory` a small `hasType()` so the handler can ask, rather
than catch a plain `Exception`
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-address-made-up-kind-empty-page/fix-ojs.diff)).
OMP and OPS `main` pin an older pkp-lib whose `edit()` lacks the
journal check, so their copies of the same change
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-address-made-up-kind-empty-page/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-address-made-up-kind-empty-page/fix-ops.diff))
are cut against that file:

```diff
--- a/lib/pkp/classes/invitation/core/InvitationFactory.php
+++ b/lib/pkp/classes/invitation/core/InvitationFactory.php
+    /**
+     * Whether an invitation type is registered
+     */
+    public function hasType(string $type): bool
+    {
+        return isset(self::$invitations[$type]);
+    }
+
--- a/lib/pkp/pages/invitation/InitializeInvitationUIHandler.php
+++ b/lib/pkp/pages/invitation/InitializeInvitationUIHandler.php
             $invitationType = $arg;
+            if (!app(Invitation::class)->hasType($invitationType)) {
+                throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+            }
             $invitation = app(Invitation::class)->createNew($invitationType);
             $invitationHandler = $invitation->getInvitationUIActionRedirectController();
+            if (!$invitationHandler) {
+                throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+            }
             $invitationHandler->createHandle($request);
 ...
             $invitationHandler = $invitation->getInvitationUIActionRedirectController();
+            // An invitation of a type that has no wizard is not found here either
+            if (!$invitationHandler) {
+                throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+            }
             $invitationHandler->editHandle($request);
```

Tried on `main`, OJS, OMP and OPS: steps 3 and 4 then show "404 Not
Found", with nothing in the server log. With the fix in and out alike,
"Invite to a role" opens the wizard, a user's "Edit" opens their roles
page, and `/invitation/edit/999999` shows "404 Not Found".

**Alternatives**:

- Catch the factory's `Exception` in `create()`: it works, but a broad
  catch would also turn any other failure while building the invitation
  into a 404.
- Throw `NotFoundHttpException` from `InvitationFactory`: it puts an HTTP
  answer into a class that also serves the repository's `getExisting()`
  for stored invitations, where an unknown type is a data fault, not a
  bad address.
- Give every type a wizard controller: much larger, and the types without
  one have no wizard to show.

**What goes with it**:

- No stored data is involved, and no plugin hook or API answer changes.
  `hasType()` is a new public method; the API's `authorize()` could use it
  later to answer 404 for an unknown type, a change for API clients that
  this fix leaves out.
- 3.5: `fix-ojs.diff` applies as it stands to the `stable-3_5_0` pkp-lib.
- Guard: an e2e check that types the wizard's address with a made-up word
  and with `reviewerAccess` and expects "404 Not Found".

Small: two guards and a one-line method in pkp-lib, with no data or API
change.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-address-made-up-kind-empty-page/walk.js)
  takes steps 1–5 on OJS, OMP and OPS, on an install freshly loaded from
  the default dataset, and reads each typed address's HTTP status, page
  text and the server log lines written during the request (with
  `WALK_MODE=neighbour`, the fix's neighbour check):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/invitation-address-made-up-kind-empty-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Datasets: pkp/datasets 3788b55 (2026-10-02), `main` and `stable-3_5_0`,
  on PostgreSQL.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS; before
  `pkp/pkp-lib#13299`). 3.5: OJS 091fb65453, OMP 9c5e24246, OPS
  38b61882d3; pkp-lib cf3f984335. 3.4: pkp-lib 32b0f4b4af, OJS 75cc2d488b,
  OMP 0aec65441, OPS acd8ae704b. 3.3: pkp-lib f6ab331645, OJS ac77c9fb35,
  OMP 8e72fc883, OPS c5532e2161.
- Code reads. `main` and 3.5: `pages/invitation/InitializeInvitationUIHandler.php`
  (`create()` identical in all three apps and both lines; the role list
  and `edit()`'s journal check differ by pkp-lib pin),
  `classes/invitation/core/InvitationFactory.php`, the four
  `*Invite::getInvitationUIActionRedirectController()`,
  `classes/core/InvitationServiceProvider.php` (type discovery),
  `api/v1/invitations/InvitationController.php::authorize()`,
  `pages/management/ManagementHandler.php::editUser()`,
  `pages/invitation/InvitationHandler.php::getActionUrl()` (the email
  links), ui-library `src/managers/UserInvitationManager/UserInvitationManagerStore.js`,
  and where the types without a wizard are created:
  `classes/submission/action/EditorAction.php`,
  `classes/mail/traits/OneClickReviewerAccess.php`,
  `classes/observers/listeners/ValidateRegisteredEmail.php`,
  `classes/user/form/BaseProfileForm.php`. 3.4 and 3.3: pkp-lib's
  `stable-3_4_0` and `stable-3_3_0` hold no invitation classes or pages.
- Introduced: `git blame` on `create()` gives 8b428c8dee on `main`; its
  3.5 twin 92c8eb3bdd is the merged PR `pkp/pkp-lib#11266`.
  `pkp/pkp-lib#12398` (closed) is a server error on a reviewer's
  invitation link, in the accept path, not this one.
- Not driven: `/invitation/edit/<id>` for a `registrationAccess`,
  `reviewerAccess` or `changeProfileEmail` invitation (the dataset holds
  none); the API's unknown-type answer; the page with `display_errors` on.
