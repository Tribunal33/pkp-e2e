# A signed-out visitor who opens a subscription purchase page's address gets an empty page, not Login

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1307` for `pkp/pkp-lib#2336` · [a96cb05987](https://github.com/pkp/ojs/commit/a96cb05987e473fe8c83caa0d2ef9904baf5b5f6) · 2017-03-08 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a12); spec U52 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a9) (its signed-out half; the payments-off half is `U52-A9-membership-address-payments-off-empty-page.md`)
- **Checked** 2026-09-30 (step 15: 2026-10-01), each branch's tip (the commits in Evidence)

## Summary

A signed-out visitor who opens "Purchase Individual Subscription" or
"Purchase Institutional Subscription" by its address (a bookmark, or a
link shared by a colleague) gets a server error instead of the Login
page. The request fails on the server, and the visitor sees an empty
page.

A reader whose session ends while a purchase form is open meets the
same empty page when they press the form's button. The empty page gives
no hint that signing in would help. A reader who signs in first and
then opens the address again can buy the subscription.

The two pages fail this way only on a journal that requires
subscriptions and takes payments. On other journals their addresses
lead to the home page.

## Impact

- **Lost.** The purchase fails for that visit. Neither the visitor nor
  the journal's staff get a message; the error is written only to the
  server's log.
- **Who.** Readers of a subscription journal who come to a purchase
  address signed out, or whose session ends on the form. No email or
  link the journal sends points at these addresses. The expiry
  reminders and the "Subscription Notification" to a subscriber carry
  no link. The one address in the purchase and renewal notices goes to
  the journal's subscription contact and opens the manager's "Payments"
  page. So readers arrive by addresses they saved or were given.
- **Way round.** Sign in with "Login" at the top of any journal page,
  then open the address again, and the form opens. The journal's
  "Subscriptions" page (`/index.php/publicknowledge/en/about/subscriptions`,
  which the default menus do not list) also leads to the form, through
  "Purchase New Subscription".

Medium: a reader who comes signed out cannot buy until they sign in on
their own. It would be high if the journal's emails or links sent
readers to these addresses, and none does.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` requires subscriptions, takes payments
  by the manual method and offers one individual subscription type. The
  dataset leaves it open access, with payments off and no subscription
  type, so the manager sets all three up in steps 1–8.

Setting up the journal:

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Distribution, tab "Access".
3. Under "Publishing Mode" choose "The journal will require subscriptions
   to access some or all of its contents." and press "Save".
4. Open the tab "Payments". Tick "Payments will be enabled for this
   journal. …", set "Currency" to "US Dollar" and "Payment Plugins" to
   "Manual Fee Payment".
5. In "Manual Payment Instructions" type "Pay by bank transfer.".
6. Press "Save".
7. Reload the page, open "Payments" in the side menu, then the tab
   "Subscription Types", and press "Create New Subscription Type".
8. Fill in "Name of Type" "Online", "Currency" "US Dollar (USD)",
   "Cost" "40", "Format" "Online" and "Duration" "12". Choose
   "Individual (users are validated via login)" and press "Save".
9. Log out.

Signed out:

10. Open `/index.php/publicknowledge/en/user/purchaseSubscription/individual`.
11. Open `/index.php/publicknowledge/en/user/purchaseSubscription/institutional`.

The session ends on the form:

12. Sign in as `amwandenga` (a reader) and open the address of step 10.
    "Purchase Individual Subscription" opens, with "Online (40.00 USD)"
    under "Subscription Type".
13. In a second browser tab, log out.
14. Back on the first tab, press "Save".

The membership address (this needs none of steps 1–9; it fails the same
on the dataset's own journal):

15. Signed out, open `/index.php/publicknowledge/en/user/payMembership`.

**Expected.** Steps 10 and 11 show the "Login" page. After signing in
there, the reader lands on "Purchase Individual Subscription" and
"Purchase Institutional Subscription". Steps 14 and 15 show the "Login"
page.

**Observed.** Steps 10, 11, 14 and 15 each answer HTTP 500, which is an
empty page where errors are not displayed. The server log:

```
PHP Fatal error:  Uncaught Error: Call to a member function getId() on null in …/pages/user/UserHandler.php:185
[500]: GET /index.php/publicknowledge/en/user/purchaseSubscription/individual
PHP Fatal error:  Uncaught Error: Call to a member function getId() on null in …/pages/user/UserHandler.php:182
[500]: GET /index.php/publicknowledge/en/user/purchaseSubscription/institutional
PHP Fatal error:  Uncaught Error: Call to a member function getId() on null in …/pages/user/UserHandler.php:269
[500]: POST /index.php/publicknowledge/en/user/payPurchaseSubscription/individual/
PHP Fatal error:  Uncaught Error: Call to a member function getId() on null in …/pages/user/UserHandler.php:434
[500]: GET /index.php/publicknowledge/en/user/payMembership
```

Signed in, the same two addresses open "Purchase Individual
Subscription" and "Purchase Institutional Subscription".

## Cause

`APP\pages\user\UserHandler` (OJS) has no `authorize()`, so nothing
requires a signed-in user for its purchase and payment operations. The
page router authorises a page request that no policy denies
(`PKPHandler::authorize()`, "blacklist approach for page controllers").
So `purchaseSubscription()` runs for a visitor with no user, reads
`$user = $request->getUser()` (null) and calls `$user->getId()`:
[line 185](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/user/UserHandler.php#L182-L188)
for an individual subscription
(`subscriptionExistsByUserForJournal($user->getId(), …)`), line 182 for
an institutional one (`new UserInstitutionalSubscriptionForm($request,
$user->getId())`). The rule it breaks: an operation that acts for the
signed-in user is authorised with `UserRequiredPolicy`, whose denial
sends a signed-out visitor to Login and back
(`PKPPageRouter::handleAuthorizationFailure()` →
`Validation::redirectLogin()`).

Up to 3.0, `UserHandler` overrode `validate($loginCheck = true)`, which
called `Validation::redirectLogin()` for a signed-out visitor, and every
operation called `$this->validate()`. The convention clean-up in
a96cb05987 changed those calls to `$this->validate(null, $request)`
(`PKPHandler::validate()`, which checks no user) and removed the
override as dead code. The login check was not moved to an
authorisation policy, so from 3.1.0 on the operations run without it.

The same missing check reaches:

- `payPurchaseSubscription()`, which the purchase forms' "Save" and
  "Continue" send to. Line 269 (individual) was checked on screen (step
  14). Line 266 (institutional) and line 242 (an address that carries an
  existing subscription's ID) were checked in the code.
- `completePurchaseSubscription()` and `payRenewSubscription()`. These
  are the addresses behind "Purchase" and "Renew" on "My Subscriptions".
  Those buttons are never shown signed out, but their addresses, opened
  signed out, fail at `$user->getId()` on lines 335 and 388 (checked in
  the code).
- `payMembership()`: `$user->getId()` at line 434, checked on screen
  (step 15) on the dataset's journal and on one with payments set up.
  It has no journal, publishing-mode or payment check before that line,
  so its address fails signed out on every journal. No screen and no
  email links to it. Signed in, the same address fails while payments
  are not set up, a separate cause
  (`U52-A9-membership-address-payments-off-empty-page.md`).
- `subscriptions()` ("My Subscriptions") checks for a user itself and
  sends a signed-out visitor to the home page, checked on screen.
- Each operation fails before it reads or writes anything for a user,
  so no data is touched. OMP and OPS have no such operations.
- Among OJS's other page handlers, each one that reads the user
  (`ArticleHandler`, `IssueHandler`, `PaymentsHandler`, and the
  workflow and submission handlers through their pkp-lib parents) has an
  `authorize()` or a `Validation::redirectLogin()`, checked in the code.

## Proposed fix

A proposal; the team decides. Add `authorize()` to OJS's
`pages/user/UserHandler.php` and require a user for the five operations
that act for one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/signed-out-purchase-subscription-server-error/fix.diff)):

```diff
+use PKP\security\authorization\UserRequiredPolicy;
 
 class UserHandler extends PKPUserHandler
 {
+    /**
+     * @copydoc PKPHandler::authorize()
+     */
+    public function authorize($request, &$args, $roleAssignments)
+    {
+        // The purchase and payment operations act for the signed-in user:
+        // a visitor who is not signed in is sent to the login page first.
+        if (in_array($request->getRequestedOp(), [
+            'purchaseSubscription',
+            'payPurchaseSubscription',
+            'completePurchaseSubscription',
+            'payRenewSubscription',
+            'payMembership',
+        ])) {
+            $this->addPolicy(new UserRequiredPolicy($request));
+        }
+
+        return parent::authorize($request, $args, $roleAssignments);
+    }
```

The rule lives in the OJS handler, which owns the operations: pkp-lib's
`PKPUserHandler` serves `index` and `authorizationDenied`, and
`authorizationDenied` must stay open to signed-out visitors (it sends
them to Login itself). The per-operation `UserRequiredPolicy` is how
`OrcidHandler::authorize()` guards `authorizeOrcid`, the fix
`pkp/pkp-lib#12632` made for the same crash on an expired session;
`ProfileHandler` and `PKPSubmissionHandler` use the same policy. The
denial sends the visitor to Login with the address as `source`, so
after signing in they land on the page they asked for. It keeps what
a96cb05987 was for (handlers call `validate(null, $request)`, and
authorisation is not done in `validate()`).

Tried on `main`. With the fix in, steps 10 and 11 show "Login", and
signing in there opens the purchase page. Step 14 shows "Login" too.
That page's `source` is the address the form posted to
(`payPurchaseSubscription/individual/`), so signing in there opens
"Purchase Individual Subscription" again at that address, with
"Online (40.00 USD)" chosen and no error shown. Pressing "Save" there
leads on to the "Manual Fee Payment" page. The institutional form would
come back the same way, with its "required" messages, since its
required fields arrive empty (read in the code, not walked). Signed in,
the two pages open as before. Signed out, "My Subscriptions" still
leads home and "Subscriptions" still opens, with the fix in and out.

Sending the posted form's Login to `purchaseSubscription/<same path>`
instead would need a hand-built `source`: `Validation::redirectLogin()`
always uses the request's own address, and no handler rewrites it. The
walk shows that the posted address already brings the reader back to a
usable form, so the fix leaves it as it is.

**Alternatives**

- `if (!Validation::isLoggedIn()) Validation::redirectLogin();` at the
  top of each operation, as `PaymentHandler::pay()` does: the same
  outcome in five copies. It is the older pattern, and it runs after
  authorisation instead of as part of it.
- A login check for every page operation in the router or
  `PKPHandler`: no. Page handlers permit by default by design, and
  public pages rely on that.
- Adding `subscriptions` to the list, so that a signed-out "My
  Subscriptions" also leads to Login rather than home: a product
  choice, since that page does not fail today.

**What goes with it**

- Signed-out visitors now reach Login on these five operations on
  every journal. On a journal that does not require subscriptions or
  take payments, the four subscription operations used to send them to
  the home page. They now go to Login first, and the handler's own
  checks send them home after they sign in. `payMembership` used to
  fail everywhere; it now leads to Login as well. Signed-in users see
  no change. No API or plugin hook is involved.
- Backport: the diff applies as written to 3.5 and 3.4 (the same file,
  and `UserRequiredPolicy` exists). 3.3 needs the `.inc.php` file and
  `import('lib.pkp.classes.security.authorization.UserRequiredPolicy');`
  in place of the `use` line.
- Test: an e2e scenario in U51 in which a signed-out visitor opens the
  purchase address, lands on Login, and after signing in lands on
  "Purchase Individual Subscription".

Small: one method in one handler, following `OrcidHandler`'s pattern,
tried, with one e2e scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/signed-out-purchase-subscription-server-error/walk.js)
  takes the Steps (setup, the two signed-out addresses, the signed-in
  control, the session ending on the form) and the neighbour checks
  (signed out: "My Subscriptions" and "Subscriptions") on a fresh load
  of the default dataset. It records each page's status and the server
  log's lines:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/signed-out-purchase-subscription-server-error/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Where the
  purchase page fails, it also takes the way round: "Login" on the home
  page, the address again, then the "Subscriptions" page and "Purchase
  New Subscription". With the fix in, it signs in on step 14's Login
  page and presses "Save" there.
- Step 15 was walked by
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/membership-address-payments-off-empty-page/walk.js)
  of the U52 A9 report, on `main` and `stable-3_5_0` (2026-10-01, OJS
  `main` bade233f73 and `stable-3_5_0` 92b9a16b48, the same tips as
  below): signed out on the freshly loaded dataset, and again after
  payments were set up. The fix below was not walked on step 15. Its
  `UserRequiredPolicy` list names `payMembership`, so step 15 leading to
  Login is read in the code.
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs`, the
  same script, then `node bin/try-fix.js revert ojs`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`. The
  fault involves no query, so it does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: on 3.4, `pages/user/UserHandler.php` has no
  `authorize()` and calls `$user->getId()` in the same places. On 3.3,
  `pages/user/UserHandler.inc.php` is the same, and so is pkp-lib's
  `PKPPageRouter::handleAuthorizationFailure()` (Login for a signed-out
  visitor). On both, `PKPUserHandler` has no policy, and
  `UserRequiredPolicy` exists.
- Introduced: `git blame` on `purchaseSubscription()` gives 665ed1f925
  (the PSR-12 reformat, `pkp/pkp-lib#5678`). Before it, the login check
  was removed in a96cb05987. The GitHub API lists `pkp/ojs#1307`
  ("pkp/pkp-lib#2336 Convention clean-up") for that commit. The
  `ojs-3_0_2-0` tag still has `UserHandler::validate($loginCheck = true)`;
  `ojs-3_1_0-0` contains a96cb05987. 3.0 was not walked.
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by "purchase subscription", "subscription not logged
  in", "subscription logged out", "subscription 500 login", and by
  `purchaseSubscription`, `UserHandler`, `payMembership`,
  `UserRequiredPolicy` and "getId() on null"): nothing about this fault.
  `pkp/pkp-lib#4700` (closed, not planned) asked for the "Purchase New
  Subscription" link to be shown to signed-out visitors and to lead
  them to Login; it does not mention the failure. `pkp/pkp-lib#12632`
  (closed, fixed) is the same shape of fault in `OrcidHandler`.
- Emails and links (code, `main`): no template, email or plugin links
  `purchaseSubscription`, `payPurchaseSubscription`,
  `completePurchaseSubscription`, `payRenewSubscription` or
  `payMembership`, apart from `subscriptions.tpl` (only signed in) and
  `userSubscriptions.tpl` ("My Subscriptions"). In `locale/en/emails.po`,
  the expiry reminders and `subscriptionNotify` have no URL variable.
  `{$subscriptionUrl}` is used only in the purchase and renewal notices.
  `SubscriptionAction::sendOnlinePaymentNotificationEmail()` sends
  those to the subscription contact, and
  `SubscriptionTypeVariables::getSubscriptionUrl()` points them at the
  `payments` page. The default menus (`registry/navigationMenus.xml`)
  have no "Subscriptions" item.
- Not driven: MySQL; 3.4 and 3.3 (code only).
