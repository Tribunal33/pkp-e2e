# When the call to PayPal fails, the payer's error page has no heading or page title

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** commit for `pkp/pkp-lib#1816` (no PR) · [0a8f26026e](https://github.com/pkp/ojs/commit/0a8f26026ebe0f03cd7fbe3b50592258fe9f1ddc) · 2017-10-05 · Alec Smecher (asmecher); OMP took it in the back-port for `pkp/pkp-lib#2962`, [d9974686c](https://github.com/pkp/omp/commit/d9974686cf9f7c0877090dc2c03cd00eadd8a670)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A payer presses a payment link on a journal or press that takes payments
through PayPal. The site must first call PayPal to set up the payment.
When that call fails, the site shows its own error page instead of
sending the payer on to PayPal. The page reads only "A transaction error
occurred. Please contact the journal manager for details.", under a
breadcrumb that ends "Home /". It has no heading, and the browser tab
reads "| " followed by the journal's name. The payer expects a page that
names the payment, as the manual payment page does ("Manual Fee
Payment").

The call fails when PayPal refuses the site's PayPal credentials (wrong
or expired) or when PayPal cannot be reached. So a correctly set-up site
shows the page rarely, during an outage. A site whose credentials are
wrong shows it on every payment until the manager corrects them.

The fix is a few lines, but they are in two app repositories (OJS and
OMP), each needing its own change.

## Impact

- **Lost:** nothing. The error sentence is shown, and the server's PHP
  log keeps the reason ("PayPal transaction exception: …").
- **Who:** an author paying a publication fee, a reader buying an
  article, issue, subscription or membership (OJS), or a buyer of a book
  file (OMP), each time the call to PayPal fails. A screen reader finds
  no heading on the page, and the tab gives no page name.
- **Way round:** none needed.

Low: only the page's heading, breadcrumb and title are missing.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (for OMP, the default dataset, OMP
  `main`). In step 1 the manager enters the account name "test" and
  leaves "Client ID" and "Secret" empty and "Test Mode" unticked, so
  PayPal refuses the call. The install must be able to reach PayPal for
  the log line quoted under Observed; an install that cannot reach it
  shows the same page with a connection error in the log.

OJS:

1. Sign in as `rvaca`. Open Settings › Distribution › "Payments". Tick
   "Enable", choose "US Dollar" in "Currency" and "Paypal Fee Payment"
   in "Payment Plugins", type "test" in "Account Name", and press "Save".
2. Open "Payments" › "Payment Types", type 50 in "Article Processing
   Charge" and press "Save". Sign out.
3. Sign in as `dbarnes`. Open submission 4, "Computer Skill Requirements
   for New and Existing Teachers: Implications for Policy and Practice".
   Press "Accept and Skip Review", keep "Request publication fee (50
   USD)", press "Continue" twice, then "Record Decision". Sign out.
4. Sign in as `cmontgomerie`. Open the Tasks panel and press "The
   publication fee is due for payment.".

OMP:

1. Sign in as `rvaca`. Open Settings › Distribution › "Payments". Tick
   "Enable", choose "US Dollar" and "Paypal Fee Payment", type "test" in
   "Account Name", and press "Save". Sign out.
2. Sign in as `dbarnes`. Open submission 5, "Bomb Canada and Other
   Unkind Remarks in the American Media", and its "Publication Formats"
   page. In the "PDF" format, press "Open Access" beside epilogue.pdf,
   choose "Direct Sales", type 10 as the price and press "Save". Sign
   out.
3. Sign in as `aclark`. Open the book's page from "Catalog" and press
   the "Purchase PDF (10 USD)" link.

**Expected:** a page with a heading that names the payment, the
breadcrumb ending with that heading, and the browser tab showing it
before the journal's or press's name, as on the manual payment page
("Manual Fee Payment | Journal of Public Knowledge").

**Observed:** on OJS (`/index.php/publicknowledge/en/payment/pay/1`,
200):

```
Home /
A transaction error occurred. Please contact the journal manager for details.
```

The page's `<h1>` is empty, and the browser tab reads `| Journal of
Public Knowledge`. On OMP (`/index.php/publicknowledge/en/catalog/view/5/2/41`,
200), the same page reads "… Please contact the press manager for
details." and the tab reads `| Public Knowledge Press`. The server log
has:

```
PayPal transaction exception: Authentication failed due to invalid authentication credentials or a missing Authorization header.
```

Control: with "Manual Fee Payment" chosen and instructions entered, the
same task (OJS) and the same link (OMP) open the manual page, with the
tab `Manual Fee Payment | Journal of Public Knowledge`.

## Cause

`frontend/pages/message.tpl` (pkp-lib) builds the page's breadcrumb, its
`<h1>` and, through `header.tpl`, the browser title from `$pageTitle`.
Every caller is expected to assign it. `PaymentHandler::pay()` does
(`'pageTitle' => 'common.payment'` for an unknown payment), and so does
`ManualPaymentPlugin::handle()` for its notification page.

The PayPal plugin assigns only the message. `PaypalPaymentForm::display()`
(`plugins/paymethod/paypal/PaypalPaymentForm.php`, line 90 in OJS and
OMP) catches any failure of the call to PayPal and runs
`$templateMgr->assign('message', 'plugins.paymethod.paypal.error')`
before displaying `message.tpl`, with no `pageTitle`. `{translate
key=$pageTitle}` then prints nothing in the heading, the breadcrumb and
the title.

Reach:

- The same form serves every PayPal payment, so the page shows for each
  payment type: the publication fee (OJS) and a book file purchase
  (OMP) checked on screen; article, issue, subscription and membership
  purchases checked in the code (`PaymentManager::getPaymentForm()`).
- `PaypalPaymentForm::display()`'s sandbox branch (line 57, added for
  `pkp/pkp-lib#9296` in 2024) shows the "common.sandbox" message on the
  same untitled page, on an install with `[general] sandbox = On`
  (code).
- `PaypalPaymentPlugin::handle()` (line 239 in OJS, 229 in OMP), where
  PayPal sends the payer back, shows the same untitled error page when
  completing the payment fails (code).
- Other callers of `message.tpl` that leave out `pageTitle` (code):
  `PKPUserHandler::authorizationDenied()` (line 55, the page
  `PKPPageRouter` sends an access refusal to),
  `RegistrationHandler::activateUser()` for an account already
  activated (line 186), and OJS `ArticleHandler`'s two API-token errors
  (lines 78 and 92).
- A different fault on the same template (code):
  `LoginHandler::resetPassword()` assigns `'pageTitle' =>
  __('user.login.resetPassword')` (line 377), a translated string where
  the template expects a key. By the code, `{translate key=$pageTitle}`
  then shows "##Reset Password##" in the heading, breadcrumb and title.
  Not walked.

## Proposed fix

Assign a `pageTitle` at the PayPal plugin's three `message.tpl` call
sites in each app: the two branches of `PaypalPaymentForm::display()`
and the catch block of `PaypalPaymentPlugin::handle()`. Use the plugin's
own name, "Paypal Fee Payment" (`plugins.paymethod.paypal`), which is
how the manual method heads its page (`paymentForm.tpl` passes
`pageTitle="plugins.paymethod.manual"`). The key exists in both apps on
every line back to 3.3. In `PaypalPaymentForm::display()`:

```diff
             TemplateManager::getManager($request)
-                ->assign('message', 'common.sandbox')
+                ->assign([
+                    'pageTitle' => 'plugins.paymethod.paypal',
+                    'message' => 'common.sandbox',
+                ])
                 ->display('frontend/pages/message.tpl');
 ...
-            $templateMgr->assign('message', 'plugins.paymethod.paypal.error');
+            $templateMgr->assign([
+                'pageTitle' => 'plugins.paymethod.paypal',
+                'message' => 'plugins.paymethod.paypal.error',
+            ]);
```

`PaypalPaymentPlugin::handle()`'s catch block takes the second change
(the full diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/fix-omp.diff)).
With the fix applied on `main`, the steps opened a page headed "Paypal
Fee Payment", with the breadcrumb "Home / Paypal Fee Payment" and the tab
`Paypal Fee Payment | Journal of Public Knowledge` (OMP: `… | Public
Knowledge Press`). The manual payment page and the unknown-payment page
("Payment") were unchanged.

**Alternatives:**

- "Payment" (`common.payment`), as `PaymentHandler::pay()` uses: OMP has
  no such key, so the two apps would need different titles.
- A fallback in `message.tpl` for a missing `pageTitle`: no one title
  fits every caller (an error, an access refusal, "account activated"),
  and it would hide the next caller that forgets one.

**What goes with it:**

- The other `message.tpl` callers without a title (Cause, Reach) are in
  pkp-lib and OJS's article handler and each needs its own title; they
  are left out here and are worth the same one-line change. The
  password-reset title is a separate fix (`'pageTitle' =>
  'user.login.resetPassword'`).
- No stored data, API or hook changes. The diffs apply as they stand to
  `stable-3_5_0` and `stable-3_4_0` (checked with `patch --dry-run` on
  3.4). On 3.3 the files are `*.inc.php` with no sandbox branch; the
  `assign` calls to change are at lines 62 and 181 in OJS and 62 and 180
  in OMP.
- Test: an e2e check that the error page shown when the call to PayPal
  fails has the heading.

Medium: three call sites per app across two files, in two app
repositories (OJS and OMP), each needing its own pull request.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/lib.js),
  the OJS fee request and task from
  [fee-task-stays-after-fee-recorded/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/lib.js))
  takes the Steps on a freshly loaded default dataset and records each
  page's heading, breadcrumb, tab title and text. Run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/neighbour.js),
  run right after it on the same install, opens the manual payment page
  and the unknown-payment page (`payment/pay/999999`, OJS only: OMP has
  no `payment/pay` page). Both scripts were run on `main` with the fix
  in and out.
- The walks left "Test Mode" unticked, and the install reached PayPal,
  which answered with the log line quoted under Observed. Spec U52
  records the same page with "Test Mode" ticked.
- Code reads: `PaypalPaymentForm.php` and `PaypalPaymentPlugin.php` in
  each app on every line (`git show upstream/stable-3_4_0:…`,
  `upstream/stable-3_3_0:…*.inc.php`); `templates/frontend/pages/message.tpl`
  in pkp-lib on `stable-3_4_0` and `stable-3_3_0`, which build the
  heading and breadcrumb from `$pageTitle` as `main` does. The 3.4 and
  3.3 plugin files assign only the message, as on `main`.
- Introduced: `git blame` on `main` points to the 2021 PSR-12
  reformatting (665ed1f925); `git log -S"plugins.paymethod.paypal.error"`
  leads to 0a8f26026e (the form, OJS) and
  [be4c415e29](https://github.com/pkp/ojs/commit/be4c415e29defe852735704dcf251394bc872880)
  (`handle()`, 2017-10-06), both direct commits with no PR. In 2017
  `message.tpl` had no `<h1>` but already took its breadcrumb from
  `$pageTitle`. The `<h1>` came in 2019 with `pkp/pkp-lib#4273`.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, by "paypal transaction error",
  "paypal heading", "paypal error page title", "transaction error
  occurred", "message page empty heading", and `PaypalPaymentForm` and
  `message.tpl pageTitle`. `pkp/pkp-lib#12234` (PayPal subscription
  flow after a cancelled payment) is a different fault.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), on OJS and OMP `main` and
  `stable-3_5_0`.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    both with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc883](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
