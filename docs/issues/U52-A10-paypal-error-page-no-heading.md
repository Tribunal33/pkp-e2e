# The PayPal error page has no heading, and the browser tab shows only the journal's name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#1816` (OJS) and `pkp/pkp-lib#2962` (OMP), no PR · [0a8f26026e](https://github.com/pkp/ojs/commit/0a8f26026ebe0f03cd7fbe3b50592258fe9f1ddc), [d9974686cf](https://github.com/pkp/omp/commit/d9974686cf9f7c0877090dc2c03cd00eadd8a670) · 2017-10-05, 2017-11-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal or press that takes payments through "Paypal Fee Payment",
a payment starts with the journal's own call to PayPal, made before the
payer leaves the site. When that call fails, the payer gets a page that
reads only "A transaction error occurred. Please contact the journal
manager for details." (on a press, "… the press manager …"). The page's
heading is empty, its breadcrumb ends "Home /" with nothing after it,
and the browser tab shows only the journal's or press's name.

The call fails while the "Client ID" or "Secret" on Settings ›
Distribution › "Payments" is wrong, and when PayPal cannot be reached.
The same page is shown when the payer comes back from PayPal and the
payment cannot be confirmed: PayPal does not report it approved, its
amount or currency differs from the one requested, or the payment
request no longer exists.

## Impact

- **Lost.** The page's name. A screen reader announces a level-one
  heading with no text. The error sentence is shown, and the payment
  has failed either way.
- **Who.** Anyone paying through PayPal when the payment cannot be
  started or confirmed: an
  author asked for the publication fee, a reader buying an article, an
  issue, a subscription or a book file.
- **Way round.** None is needed: the sentence on the page says what
  happened and whom to contact.

Low: a page title is missing while the outcome is shown correctly. It
would be medium if the team rates every page that fails WCAG 2.4.2 Page
Titled at that level.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (journal
  `publicknowledge`) or OMP (press `publicknowledge`). It holds no
  PayPal credentials, so every call to PayPal fails.

On a journal:

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "Payments". Tick "Enable", choose
   "US Dollar" in "Currency" and "Paypal Fee Payment" in "Payment
   Plugins", type `u52r4` in "Account Name" and press "Save". Any text
   will do: the PayPal method counts as set up only while "Account
   Name" holds a value.
3. Reload the page, open "Payments" in the side menu, then "Payment
   Types". Type 50 in "Article Processing Charge" and press "Save".
4. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice". Press "Accept and
   Skip Review", keep "Request publication fee (50 USD)", press
   "Continue" twice and "Record Decision".
5. Sign in as `cmontgomerie`, the submission's author. Open "Tasks" and
   press "The publication fee is due for payment.".

On a press:

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "Payments". Tick "Enable", choose
   "US Dollar" in "Currency" and "Paypal Fee Payment" in "Payment
   Plugins", type `u52r4` in "Account Name" and press "Save". A press
   has no "Payment Types" to fill in.
3. Open book 14, "From Bricks to Brains: The Embodied Cognitive Science
   of LEGO Robots", then "Publication" › "Publication Formats". Under
   "PDF", press "Open Access" beside "Segmentation of Vascular
   Ultrasound Imag.pdf", choose "Direct Sales", type 25.00 and press
   "Save".
4. Sign in as `aclark`. Open "Catalog", the book, and press the link of
   "Segmentation of Vascular Ultrasound Imag.pdf".

**Expected.** A page headed with its name, such as "Paypal Fee
Payment", under the breadcrumb "Home / Paypal Fee Payment", in a browser
tab titled "Paypal Fee Payment | Journal of Public Knowledge"; then the
error sentence.

**Observed.** The page (`/index.php/publicknowledge/en/payment/pay/1`;
on the press `…/catalog/view/14/3/109`) answers 200 and shows:

```
Home /
A transaction error occurred. Please contact the journal manager for details.
```

Its level-one heading is there but empty, and the browser tab reads
"| Journal of Public Knowledge". The press's page reads "A transaction
error occurred. Please contact the press manager for details." in a tab
titled "| Public Knowledge Press". The server log holds:

```
PayPal transaction exception: Authentication failed due to invalid authentication credentials or a missing Authorization header.
```

With "Manual Fee Payment" and its instructions saved in step 2 instead,
the same task and the same link open a page headed "Manual Fee Payment" in a tab titled
"Manual Fee Payment | Journal of Public Knowledge".

## Cause

The generic message page, `lib/pkp/templates/frontend/pages/message.tpl`,
takes its name from the template variable `pageTitle`. It passes it to
the breadcrumb and prints it in the heading, and
`frontend/components/header.tpl` builds the tab's title from it:

```smarty
	{include file="frontend/components/breadcrumbs.tpl" currentTitleKey=$pageTitle}
	<h1>
		{translate key=$pageTitle}
	</h1>
```

The PayPal method shows its failures through that page and assigns only
`message`. `APP\plugins\paymethod\paypal\PaypalPaymentForm::display()`
(`plugins/paymethod/paypal/PaypalPaymentForm.php`, line 87 on `main` in
both apps) catches every failure of the call that starts the payment.
This is OJS's; OMP's reads `catch (Exception $e)` and is otherwise the
same:

```php
        } catch (\Exception $e) {
            error_log('PayPal transaction exception: ' . $e->getMessage());
            $templateMgr = TemplateManager::getManager($request);
            $templateMgr->assign('message', 'plugins.paymethod.paypal.error');
            $templateMgr->display('frontend/pages/message.tpl');
        }
```

With no `pageTitle`, the heading, the breadcrumb's last part and the
tab's title before " | " are empty.

The lines date from the rewrite of the payment code, 0a8f26026e in OJS
and its port to OMP, d9974686cf. The other payment pages name
themselves: `PaymentHandler::pay()` assigns `common.payment` for a
payment request that no longer exists, and the manual method's
notification page assigns `plugins.paymethod.manual.paymentNotification`.

Reach:

- The failed start of a payment in `PaypalPaymentForm::display()`, OJS
  and OMP:
  checked on screen, for the publication fee and for a book file. The
  reader fees, the membership and a subscription open the same form
  (checked in the code).
- The failed confirmation when PayPal sends the payer back,
  `PaypalPaymentPlugin::handle()` (the `catch` at line 236 in OJS, 226
  in OMP): the same `assign` and template, checked in the code. It
  catches a missing payment request, PayPal's refusal, a state other
  than "approved", and an amount or currency that differs. The same
  method's own `sandbox = On` branch (line 193 in OJS, 183 in OMP)
  returns no page at all; that is another fault, outside this report.
- The page shown instead of the call to PayPal when the install runs with
  `sandbox = On`, `PaypalPaymentForm::display()` line 57 ("Application
  running in sandbox mode."): the same, checked in the code. This
  branch came later, for `pkp/pkp-lib#9296`; 3.3 does not have it.
- Other pages that use `message.tpl` without a `pageTitle`, not part of
  this report (checked in the code, pkp-lib and OJS `main`):
  `PKPUserHandler::authorizationDenied()`,
  `RegistrationHandler::activateUser()` for an account already
  activated, and the two API-token messages of OJS's
  `ArticleHandler::authorize()`. The list comes from a search for the
  template's name in pkp-lib and in OJS's, OMP's and OPS's own code;
  `LoginHandler::resetPassword()` for a disabled account does assign a
  `pageTitle`. Plugins outside the apps' trees were not searched.

## Proposed fix

Assign the page's name where the PayPal method assigns its message, in
all three places. This is a proposal:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/fix-ojs.diff) and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/fix-omp.diff), the same change in each app's plugin.

```diff
             $templateMgr = TemplateManager::getManager($request);
-            $templateMgr->assign('message', 'plugins.paymethod.paypal.error');
+            $templateMgr->assign([
+                'pageTitle' => 'plugins.paymethod.paypal',
+                'message' => 'plugins.paymethod.paypal.error',
+            ]);
             $templateMgr->display('frontend/pages/message.tpl');
```

`plugins.paymethod.paypal` ("Paypal Fee Payment") is in the plugin's
own locale file in both apps and is not used anywhere today. The manual
method's page is named by the matching key, `plugins.paymethod.manual`
("Manual Fee Payment"), which its template passes to the header include
and prints in its heading.

Tried on `main`, OJS and OMP: the Steps' page is headed "Paypal Fee
Payment" under "Home / Paypal Fee Payment", in a tab titled "Paypal Fee
Payment | Journal of Public Knowledge" (on the press "… | Public
Knowledge Press"), with the error sentence unchanged. The "Payment" page
of a payment request that no longer exists and the "Manual Fee Payment" page
read the same with the fix in and out. The return from PayPal and the
sandbox page were not driven.

**Alternatives**

- `common.payment` ("Payment"), which `PaymentHandler::pay()` uses. OMP
  has no such key, so it would need a new locale string there.
- Leave the heading out of `message.tpl` when `pageTitle` is empty.
  That hides the empty heading on every such page, but the tab and the
  breadcrumb stay unnamed, and a caller that forgets the title is no
  longer noticed.

**What goes with it**

- Backport: the diffs apply to `stable-3_5_0` and `stable-3_4_0`, where
  the three places read the same. `stable-3_3_0` has the two `catch`
  blocks only, in `.inc.php` files, and takes the same lines by hand.
- The other `message.tpl` callers without a title (Cause, last bullet)
  each need a name of their own; they are not covered here.
- Guard: a Planned item in spec U52, on the scenario that already opens
  this page.

Small: the same three-line change at three places in each app's copy
of the plugin (`pkp/ojs` and `pkp/omp`), tried on both, with no stored
data involved.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, a journal and a press in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/paypal-error-page-no-heading/lib.js)), run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js`.
  It records each page's answer, tab title, level-one headings,
  breadcrumb and text, and the server log's PayPal lines. The same run
  holds the neighbour checks: on the journal the address
  `payment/pay/999999` ("Payment", "Home / Payment", "Payment | Journal
  of Public Knowledge"), and on both apps the same task or link once
  "Manual Fee Payment" with instructions is the method.
- Where the walk differs from the Steps: it opens the submission and
  the book by their addresses.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/paypal-error-page-no-heading/fix-ojs.diff ojs`
  and `… fix-omp.diff omp`, then walk.js with the same command, then
  `revert` for each.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01):
  - main: OJS 68615b5a32 (lib/pkp 25562b0e1a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6).
  - stable-3_5_0: OJS 3517e640f2 (lib/pkp b1981810da), OMP c7b45f88ea
    (lib/pkp 1fb843f491): the same result on both apps, and the same
    three `assign` calls and template.
- 3.4, by code: OJS `stable-3_4_0` at 75cc2d488b, OMP at 0aec65441f,
  pkp-lib 32b0f4b4af. `PaypalPaymentForm.php` (lines 58, 91) and
  `PaypalPaymentPlugin.php` display `message.tpl` with `message` alone,
  and the template prints `pageTitle` in its `h1`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836,
  pkp-lib f6ab331645. `PaypalPaymentForm.inc.php` (line 63) and
  `PaypalPaymentPlugin.inc.php` do the same in their `catch` blocks,
  with the same template.
- OPS has no payment methods (no `plugins/paymethod`), on `main` and
  3.5.
- Introduced: `git blame` on the `assign` line gives the PSR-12
  reformat 665ed1f925; `git log -L` behind it ends at 0a8f26026e, which
  added the file with these lines. In OMP the file arrives with
  d9974686cf. GitHub names no PR for either commit. The page has
  never had a name: the `message.tpl` of that time (pkp-lib 5e8f0993fe)
  already passed `pageTitle` to the breadcrumb. The breadcrumb then
  held the `h1`.
- Not driven: a payment that reaches PayPal, the return from PayPal
  (`handle()`), the `sandbox = On` page, and the reader fees,
  membership and subscription payments. The test installs have no
  PayPal account; the failure walked is PayPal's refusal of the missing
  credentials.
- WCAG: the tab title does not describe the page (2.4.2) and the `h1`
  has no text.
- Upstream search 2026-10-01: pkp/pkp-lib by "paypal error page title",
  "paypal transaction error", "transaction error occurred",
  "message.tpl pageTitle" and "empty heading message page"; the pkp
  organisation by "PaypalPaymentForm"; pkp/ojs and pkp/omp by "paypal
  heading OR title OR breadcrumb". `pkp/pkp-lib#12234` (open) is about
  resuming a subscription after cancelling at PayPal, another fault.
