# With "Confirm Access" on, an Administration page left open still deletes journals and saves site settings without the password

- **Severity** medium
- **Effort** medium
- **Kind** intention gap
- **Security** unreleased
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no Confirm Access gate)
  - 3.4: none (code; no Confirm Access gate)
  - 3.3: none (code; no Confirm Access gate)
- **Introduced** `pkp/pkp-lib#12505` for `pkp/pkp-lib#12338` · [cf5798f06e](https://github.com/pkp/pkp-lib/commit/cf5798f06e9a410709c13509b2e36782c8681e4f) · 2026-04-09 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U01 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a13)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)

## Summary

An installation can make the Site Administrator re-enter the password
("Confirm Access") before working in Administration; the password then
holds for a set number of minutes, the confirmation period. When that
period has run out, opening any Administration page asks again. But the
changes made on a page that is already open do not ask. On an
Administration page left open in a browser tab past the confirmation
period, anyone at that browser can still create and delete journals in
Hosted Journals, save Site Settings (the site's password rules
included), manage Languages and Plugins, and retry or delete failed
jobs, without the password.

So someone at an administrator's unattended browser can delete a journal
with all its contents, or weaken the site's password rules, without
knowing the password. Nothing on screen or in the logs says the
password was skipped.

The setting, `password_timeout`, is off by default.

## Impact

- **Lost**: the protection the setting exists for. A page left open
  stays usable this way for as long as the administrator stays signed
  in, which by default is up to seven days without activity, and each
  change made on it counts as activity. The confirmation period, by
  contrast, is set in minutes.
- **Who**: installations that set a confirmation period, and only
  someone at the administrator's own browser with an Administration page
  still open. Nothing outside Administration asks for the password, so
  no other page has the same gap.
- **Way round**: none on screen; an administrator can only close
  Administration pages before leaving the browser.

Medium: a security setting silently fails at its purpose, but only where
an installation opts into it and only for someone at the administrator's
open browser; it would be high if every installation had it on.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP: "Hosted Presses", "Create Press";
  OPS: "Hosted Servers", "Create Server").
- In `config.inc.php`, section `[security]`: `password_timeout = 1`
  (the confirmation period, in minutes).

Steps (one browser, two browser tabs):

1. Sign in as `admin`.
2. Tab 1: Administration › "Hosted Journals"
   (`/index.php/index/en/admin/contexts`). "Confirm Access" asks for the
   password: type `admin`, press "Submit". Hosted Journals opens.
3. Tab 1: "Create Journal". Journal Title `sxx6 Journal`, Journal
   Initials `SXX6`, the principal contact's name `sxx6 Journal` and email
   `sxx6@mailinator.com`, Country "Canada", Path `sxx6`, Languages
   "English" (primary), tick "Enable this journal to appear publicly on
   the site", "Save". The new journal's settings wizard opens.
4. Tab 1: Administration › "Hosted Journals". It opens without asking;
   both journals are listed.
5. Tab 2: Administration › "Site Settings" › "Site Setup" › "Security".
   It opens without asking; "Minimum password length (characters)" reads
   6.
6. Leave both browser tabs untouched for two minutes, twice the
   confirmation period.
7. Tab 2: type `12` in "Minimum password length (characters)", press
   "Save".
8. Tab 1: the arrow at "sxx6 Journal", "Remove", then "OK" in "Confirm"
   ("Are you sure you want to permanently delete sxx6 Journal and all of
   its contents?").
9. Tab 1: "Create Journal" again, filled as in step 3 with `sxx6 Second
   Journal`, `SXX6B`, `sxx6b@mailinator.com` and path `sxx6b`, "Save".
10. On "Confirm Access", type `admin` and press "Submit"; then open
    Hosted Journals and Site Settings › Site Setup › Security.

**Expected**: from step 7 on the confirmation period has run out, so each change in
steps 7, 8 and 9 asks for the password first, and nothing changes until
it is given.

**Observed**: nothing asks. Step 7 shows "Saved". Step 8 removes the
row. Step 9 creates the journal, and only the redirect to its settings
wizard that follows lands on "Confirm Access" ("Signed in as admin
admin. Please enter your password to continue."). After step 10, Hosted
Journals lists "Journal of Public Knowledge" and "sxx6 Second Journal"
and no "sxx6 Journal", and "Minimum password length (characters)" reads
12.

## Cause

The gate is one authorization policy,
`PKP\security\authorization\ReauthenticationRequiredPolicy`, and the only
place that adds it is `PKP\pages\admin\AdminHandler::authorize()`
(`lib/pkp/pages/admin/AdminHandler.php`, line 111 on `main`), the page
handler of Administration's pages. Those pages make their changes
without loading a new page, through requests that other handlers
answer. These handlers check the role alone, so a Site Administrator
passes whether or not the confirmation period is still running:

- `PKPSiteController` (`PUT site`, `PUT site/theme`): every Site
  Settings form.
- `PKPContextController` `add` (`POST contexts`): the "Create Journal"
  dialog's "Save". Its `delete` (`DELETE contexts/{id}`) is equally
  Site Administrator only; no page calls it.
- `ContextGridHandler`, every op (`createContext`, `editContext`,
  `updateContext`, `deleteContext`, `saveSequence`, `users`, the grid
  itself): Hosted Journals' list, its "Create Journal" and "Edit"
  dialogs, "Remove" and "Order".
- `AdminLanguageGridHandler`: Site Settings › Languages (install,
  enable, disable, primary).
- `AdminPluginGridHandler`: Site Settings › Plugins.
- `PKPJobController`, every route (`GET jobs/all`, `GET
  jobs/failed/all`, `POST jobs/redispatch/all`, `POST
  jobs/redispatch/{id}`, `DELETE jobs/failed/delete/{id}`): the Jobs and
  Failed Jobs pages. It has no `authorize()` of its own; its route
  middleware checks the role.

Nor do these requests restart the confirmation period:
`PKPSessionGuard::isElevatedSessionActive()`, which restarts it, is
called only by the policy and by the Confirm Access page's own two ops
(`AdminHandler::confirmAccess()`, `confirmAccessSubmit()`).

`pkp/pkp-lib#12338` asks for the password "when entering
Administration", and its test steps expect an "action in the admin
area" after the period runs out to send the user to re-authenticate.
`pkp/pkp-lib#12505` gated the page handler only. The policy's
`callOnDeny()` could not serve the other handlers as it stands: it
redirects to the Confirm Access page, which a form or grid request
cannot follow.

Reach:

- Read in the code: Languages, Plugins, "Order" and the jobs requests
  take the same path as the three walked changes.
- Buttons that reload an Administration page ("Clear Data Caches",
  "Expire User Sessions") are gated, through the page handler (code).
- Handlers that Journal Managers use in their own journal, and that
  Administration reaches too, cannot take the policy as they are,
  because it refuses everyone but a Site Administrator: `PUT
  contexts/{id}` (the settings wizard's forms and the "Edit" dialog's
  "Save"), the wizard's Users tab, and at the site level the Navigation
  Menus grids, Highlights, Announcements and the Plugin Gallery (code).
- Logging: with `[logs] log_audit` on (off by default), a change to the
  site's password rules or a plugin's state is logged under the
  administrator's name; creating or deleting a journal is not, and no
  entry says the password was skipped (code).

## Proposed fix

Gate the Administration-only handlers with the same policy, and let the
policy refuse a request that is not a page load with a message instead
of the redirect
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-changes-skip-confirm-access/fix.diff)):

```diff
@@ public function effect(): int
+        $router = $this->request->getRouter();
+        if (!($router instanceof PKPPageRouter)) {
+            $this->setAdvice(AuthorizationPolicy::AUTHORIZATION_ADVICE_DENY_MESSAGE, 'user.confirmAccess.required');
+            if ($router instanceof APIRouter) {
+                // Answer 403 with the message, which the forms show; the API's default
+                // refusal is a 401, which they show as an unknown error.
+                $this->setAdvice(
+                    AuthorizationPolicy::AUTHORIZATION_ADVICE_CALL_ON_DENY,
+                    [$router, 'handleAuthorizationFailure', [$this->request, 'user.confirmAccess.required']]
+                );
+            }
+            return AuthorizationPolicy::AUTHORIZATION_DENY;
+        }
+
         // User needs to re-authenticate
```

Then add `$this->addPolicy(new ReauthenticationRequiredPolicy($request));`
to the `authorize()` of `PKPSiteController`, `ContextGridHandler`,
`AdminLanguageGridHandler` and `AdminPluginGridHandler`; to
`PKPContextController::authorize()` for its `add` and `delete` routes
only (`static::getRouteActionName()`, as `PKPBackendSubmissionsController`
picks its `delete`); and give `PKPJobController` an `authorize()` that
adds it for every route. A new locale key carries the message: "Your
access to Administration has expired. Reload the page and confirm your
password to continue."

The status: `PolicyAuthorizer` answers every API refusal with 401 unless
`authorize()` throws, and `Form.vue`'s `error()` shows the answer's
message only for 403 and 404, so a 401 reaches the administrator as "An
unexpected error has occurred. Please reload the page and try again."
`APIRouter::handleAuthorizationFailure()` already sends a 403 with
`error` and `errorMessage` (nothing calls it today), and a policy's
call-on-deny advice is the existing way to answer for itself, as the
page redirect does. A grid request needs nothing extra:
`PKPComponentRouter::handleAuthorizationFailure()` returns the policy's
message, which the page shows as an alert.

Tried on `main` on all three apps, with the confirmation period run out
as in the Steps. Step 7's "Save" is refused with a notice reading "Your
access to Administration has expired. Reload the page and confirm your
password to continue.", and "Minimum password length" stays 6. Step 8's
"OK" is refused with the same text in an alert, and the journal stays
listed. Step 9's "Create Journal" opens no dialog. The next page that
opens asks for the password, as before. Inside a running confirmation
period the same create, remove and save go through; with the gate off
they go through without any prompt; and the Journal Manager `rvaca`
saves Settings › Journal › "Masthead" with the gate on. These three
checks read the same with the fix in and out.

**Alternatives**:

- Read 401 in `Form.vue` too: a ui-library change, and every other 401
  would then show its message instead of the generic one.
- Answer 403 for every refusal in `PolicyAuthorizer`: changes what every
  API client gets.
- Throw an HTTP 403 exception from the policy: `PolicyAuthorizer` then
  answers with its generic "not allowed" text, not this message, and
  the grids would fail.
- Gate the whole `PKPContextController`, or the handlers Journal
  Managers share: the policy refuses everyone but a Site Administrator,
  so managers would lose their own journal's settings.

**What goes with it**:

- Left out on purpose: the handlers Journal Managers share (listed under
  Cause), the "Edit" dialog's "Save" among them. Since the whole
  `ContextGridHandler` is gated, "Edit" no longer opens once the period
  has run out; only a dialog opened before then can still save.
- API tokens: with the gate on, an administrator's API-token request to
  these routes has no confirmation period and is refused. Whether a
  token should pass (GitHub's "sudo mode" exempts tokens) is the team's
  call; no release has the gate.
- A refused "Remove" leaves its "Confirm" dialog open until it is
  closed.
- Guard: an e2e check that, once the confirmation period has run out, a
  Site Settings save, a journal's removal and its creation are refused
  and change nothing; a unit test of the policy's answer for an API and
  a grid request.

Medium: one policy, six handlers and a locale key in pkp-lib, with a
new answer from the API while the gate is on.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-changes-skip-confirm-access/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/admin-changes-skip-confirm-access/lib.js),
  on an install reset to PKP's default test dataset (pkp/datasets
  58f1d08, 2026-10-05, PostgreSQL); it writes `password_timeout = 1`
  into the config itself:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/admin-changes-skip-confirm-access/walk.js [nb]`
  (`nb` is the fix's neighbour check).
- Walked on `main` and 3.5, OJS, OMP and OPS. On 3.5 Hosted Journals and
  Site Settings open without asking, and "Create Journal" and "Remove"
  go through, as designed there.
- Not driven: Languages, Plugins, "Order", the jobs requests, the
  "Create Journal" dialog's "Save" with the fix in (its dialog no longer
  opens once the period has run out), and a session that never passed
  Confirm Access, which no page reaches.
- Tips: `main` OJS 1f4cef786f, OMP a989fdc37, OPS caddbb33da, lib/pkp
  a7f5e3081b (all three). 3.5: OJS 4342473090 (lib/pkp 771474347e), OMP
  9c5e24246 and OPS 38b61882d3 (lib/pkp cf3f984335). 3.4: OJS
  d68934d0d1, OMP 0aec65441, OPS acd8ae704b, lib/pkp 767353f4fe. 3.3:
  OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp ac3fa73402.
- Code reads: the six handlers' `authorize()` and route middleware;
  `PolicyAuthorizer::handle()`, `APIRouter::` and
  `PKPComponentRouter::handleAuthorizationFailure()`,
  `AuthorizationDecisionManager::decide()`, `Form.vue`'s `error()`;
  `session_lifetime` (`[general]`, days of inactivity, 7 in
  `config.TEMPLATE.inc.php`, `PKPContainer`), `AuditLog::log()` and its
  callers. The handlers are pkp-lib's; no app subclasses them. On 3.5
  and on `stable-3_4_0` and `stable-3_3_0`: no `password_timeout` in
  `config.TEMPLATE.inc.php`, no `ReauthenticationRequiredPolicy`, no
  `confirmAccess`.
- Introduced: `git blame` on `AdminHandler.php` lines 107-112 gives
  cf5798f06e; the policy file's only commit is the same. The follow-up
  b80f4956cd (`pkp/pkp-lib#12568`) only changed the notice after
  confirming.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library; issues and PRs): re-authentication administration,
  "Confirm Access", password_timeout, ReauthenticationRequiredPolicy,
  isElevatedSessionActive, reauthentication API grid, re-authentication
  bypass. Only the gate's own issue and pull requests came up.
