# A press that cannot take payments can put a book file on sale, and readers who open it are turned away without a word

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** commit for issue 7154 in pkp's old bug tracker (no pull request) · [3809de272](https://github.com/pkp/omp/commit/3809de27278d8d532e2ab9943270526e71e618de) · 2012-03-30 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press can set a book file to "Direct Sales" with a price while it
cannot take payments, that is, while it has no currency, or while its
"Manual Fee Payment" has no instructions. The "Set Terms for
Downloading" window saves the price without a word about payments.
Every new press is in this state until it sets up "Payments". A press
that already sells falls into it when it empties its payment
instructions, which the Payments tab saves without a word.

From then on no reader can get the file. A visitor who opens its link
is sent to the Login page, and a signed-in reader to the "Catalog".
Neither page says anything about the file. On a press with a currency
the link still reads "25.00 Purchase PDF (25.00 USD)"; without one it
reads "PDF", like a free file.

The press can get out by filling in "Payments" or by setting the file
back to "Open Access", but nothing on screen tells it that it needs to.

## Impact

- **Lost.** Every reader's access to the priced file: nobody can buy
  or read it. The book's other files still open. Neither the reader nor
  the press is told.
- **Who.** Readers of a press that sells files directly, once the press
  can no longer take payments: it priced a file before setting up
  payments, or it emptied "Manual Payment Instructions" later. In the
  code, choosing "Paypal Fee Payment" without an account name has the
  same effect. The currency cannot be cleared once chosen. After the
  fix proposed in `jardakotesovec/pkp-e2e#294`, which makes the
  Payments tab's "Enable" box switch a press's payments off, unticking
  that box is a further way in.
- **Way round.** For the reader, none. The press learns of it only when
  a reader writes to say the link does not work.

Medium: the file is lost to every reader, silently, but only while the
press's payment settings are incomplete. It would be high if a routine
action led there, such as a setting most presses that sell files
change.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published. Its format "PDF" holds six free files,
  among them "chapter1.pdf" and "chapter2.pdf", the files of chapters 1
  and 2. Its table of contents shows each chapter's file as a link
  "PDF".
- The press has no currency, and its payment method, "Manual Fee
  Payment", has no instructions. Settings › Distribution › "Payments"
  shows only "Enable", unticked.

A press that has not set up payments:

1. Sign in as `dbarnes`. Open book 14's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`),
   then, under "Publication", "Publication Formats".
2. In the row of "chapter1.pdf" press "Open Access". In "Set Terms for
   Downloading" choose "Direct Sales", type 25.00 under "Price ()" and
   press "Save".
3. Sign out. Open "Catalog" and press the book's title
   (`/index.php/publicknowledge/en/catalog/book/14`).
4. Under "Chapter 1: Mind Control—Internal or External?" press "PDF".
5. Sign in as `aclark` (a Reader). Open the book's page again and press
   chapter 1's "PDF".
6. Press chapter 2's "PDF".

A press that sells, then empties its instructions (starting again from
the default dataset):

7. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency" and "Manual Fee
   Payment" under "Payment Plugins", type "Pay by cheque u73c" in
   "Manual Payment Instructions" and press "Save".
8. Take steps 1 and 2, with "Price (USD)".
9. Sign in as `aclark`, open the book's page and press chapter 1's
   "25.00 Purchase PDF (25.00 USD)". "Manual Fee Payment" opens, with
   "Fee 25.00 (USD)".
10. Sign in as `dbarnes`. On "Payments", empty "Manual Payment
    Instructions" and press "Save".
11. Sign in as `aclark` and take step 9 again. Sign out and take it
    once more as a visitor.

**Expected.** At step 2 the window refuses "Direct Sales", or at least
warns, saying that the press cannot take payments yet. The app holds a
sentence for this: "A configured payment method is required before you
can define e-commerce settings." At steps 4, 5 and 11 the reader is
told that the file cannot be bought at the moment, rather than being
sent to another page.

**Observed.** At step 2 the window reads as below, before and after the
save, and the save goes through: the row's terms link then reads
"Direct Sales".

```
File formats can be made available for downloading from the press website through open access at no cost to readers or direct sales (using an online payment processor, as configured in Distribution). For this file indicate the basis of access.
Open Access  Direct Sales  Not Available
Price ()
Prices should be numeric only. Do not include currency symbols.
Cancel  Save
```

On the book page, chapter 1's link reads "PDF", the same as chapter 2's
free file. At step 4 the visitor lands on "Login", which says only
"Required fields are marked with an asterisk: *" above the form. At
step 5 `aclark` lands on "Catalog", the list of the press's books, with
no message. At step 6 chapter 2's free file opens in the PDF view page.

At step 10 the tab answers "Saved". At step 11 chapter 1's link still
reads "25.00 Purchase PDF (25.00 USD)". `aclark` lands on "Catalog" and
the visitor on "Login", as at steps 4 and 5.

## Cause

`CatalogBookHandler::download()` in OMP
(`pages/catalog/CatalogBookHandler.php`) handles a file with a price in
two steps. Line 545 sends a visitor to Login. After that, lines 549 to
552 ask the payment manager whether the press can take a payment:

```php
$paymentManager = new OMPPaymentManager($press);
if (!$paymentManager->isConfigured()) {
    $request->redirect(null, 'catalog');
}
```

`OMPPaymentManager::isConfigured()` is true only when the press has a
currency and its payment method is complete: instructions for "Manual
Fee Payment", an account name for PayPal. Every press has "Manual Fee
Payment" as its method by default (`paymentPluginName` in
`schemas/context.json`), with no instructions and no currency. When the
answer is no, the reader is redirected to the catalog with no message,
and a visitor has first been asked to sign in. These lines came with
the first payment code in 3809de272.

`ApprovedProofForm`, the "Set Terms for Downloading" window, saves
"Direct Sales" and a price whatever the payment setup, and never asks
the payment manager. In 2012 OMP had a warning for this state, the
notification `NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD`, with the
sentence quoted under Expected
([72a91626b](https://github.com/pkp/omp/commit/72a91626b0139b211923ba379a8c3da369b04860)).
It showed on the format's "Metadata" tab, not in the terms window. Two
pieces of code created it:

- **On a new press.**
  [a9f681687](https://github.com/pkp/omp/commit/a9f681687653544c3096129c6f39e84d47191471)
  (2015) removed it on purpose, with the message "Don't warn about
  unconfigured payment settings b/c of existing working default". That
  premise no longer holds: the default method needs instructions, and
  there is no default currency, so a new press cannot take payments.
- **When the payment settings were saved without a method.**
  [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3)
  (`pkp/pkp-lib#3931` for `pkp/pkp-lib#3594`, 2018) replaced that form
  with the current one, which does not create it.

So no code creates the notification today. The "Metadata" tab still
lists it among the notifications it would display, and
`PublicationFormatMetadataForm::fetch()` still assigns
`paymentConfigured` and `currency`, which no template reads.

Reach:

- **The book page** (on screen): `CatalogBookHandler::book()` lists
  every file with a price that is not null. `downloadLink.tpl` prints
  the price only when the press has a currency.
- **A chapter's page and an older version's files** (code): the same
  `download()`.
- **Files priced through the native import** (code): the import writes
  `directSalesPrice` and `salesType` without the terms window.
- **The Payments tab** (on screen for the instructions, code for
  PayPal): neither method's fields are required, so a press saves them
  empty with "Saved".
- **OJS and OPS** (code): neither sells a file through a publication
  format. OPS has no payments, and OJS offers its purchase fees only
  while its payment manager is configured.

## Proposed fix

Ask the payment manager, which owns the question "can this press take a
payment", in the two places that miss it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/priced-file-no-payment-method-turns-readers-away/fix.diff)):

- **Where the price is set.** `ApprovedProofForm` refuses "Direct
  Sales" while the press cannot take payments, with the app's existing
  sentence. The check follows the custom validators of OMP's other
  forms (`SeriesForm`, `SalesRightsForm`):

  ```diff
  +        // A file can be put on sale only while the press can take payments
  +        $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'salesType', 'optional', 'notification.type.configurePaymentMethod', function ($salesType) {
  +            return $salesType !== 'directSales' || Application::get()->getPaymentManager(Application::get()->getRequest()->getContext())->isConfigured();
  +        }));
  ```

- **Where the file is bought.** `download()` asks before the Login
  redirect, and shows a message page instead of sending the reader
  away. The page is `frontend/pages/message.tpl`, as in OJS's
  `PaymentHandler` for a payment that cannot be found:

  ```diff
  @@ -540,17 +540,22 @@
   
           // Fall-through: user needs to pay for purchase.
   
  +        // The press cannot take payments: say so instead of asking for a login or a payment.
  +        $paymentManager = new OMPPaymentManager($press);
  +        if (!$paymentManager->isConfigured()) {
  +            $templateMgr->assign([
  +                'pageTitle' => 'payment.directSales.notAvailable',
  +                'message' => 'payment.directSales.paymentNotConfigured',
  +            ]);
  +            return $templateMgr->display('frontend/pages/message.tpl');
  +        }
  +
           // Users that are not logged in need to register/login first.
           if (!$user) {
               return $request->redirect(null, 'login', null, null, ['source' => $request->url(null, null, null, [$monographId, $representationId, $bestFileId])]);
           }
   
           // They're logged in but need to pay to view.
  -        $paymentManager = new OMPPaymentManager($press);
  -        if (!$paymentManager->isConfigured()) {
  -            $request->redirect(null, 'catalog');
  -        }
  -
           $queuedPayment = $paymentManager->createQueuedPayment(
  ```

  The new English string reads "This file is for sale, but the press
  is not able to take payments at the moment. Please contact the
  press." under the title "Not Available". A reader who has already
  paid for the file still gets it, because that branch comes earlier in
  the method.

Choices in this proposal:

- **A refusal, not a standing warning.** The sentence appears only when
  a press saves "Direct Sales". A press that never sells files never
  sees it, which keeps the intent of a9f681687. The existing sentence
  says a payment method "is required", which is true of a refused save.
  A warning in every terms window of such a press would have needed a
  new sentence, and a script change to show it only while "Direct
  Sales" is chosen.
- **HTTP 200 for the message page.** That is intended. The file exists
  and the state is temporary, and the app's other message pages answer
  200 too.

Tried on OMP `main`. At step 2 the save was refused, and the window
showed "Errors occurred processing this form" with "A configured
payment method is required before you can define e-commerce
settings."; chapter 1 then stayed a free file. At step 11 both `aclark`
and the visitor got "Not Available" with the new sentence. At steps 8
and 9, on a press that can take payments, the save went through and
`aclark` got "Manual Fee Payment" with "Fee 25.00 (USD)", as without
the fix.

- **Alternatives.**
  - A warning in the terms window that does not refuse the save: see
    above. It also lets a press create a priced file nobody can buy.
  - Keeping a priced file off the book page while the press cannot take
    payments, the way the page already leaves out files set to "Not
    Available". Readers would not meet a dead link. But `book()`, the
    chapter page and the sitemap would each need the check, and the
    file would vanish from the press's page without a word.
  - Making "Manual Payment Instructions" and PayPal's account name
    required on the Payments tab would close the way in at step 10. It
    leaves a new press, imported files and PayPal's other fields as
    they are. It would be a good addition, in the payment plugins, and
    is not part of this diff.
- **What goes with it.**
  - One new English string.
  - The "Metadata" tab's dead notification request, and the
    `paymentConfigured` and `currency` it assigns, can go in the same
    change. The diff leaves them.
  - `jardakotesovec/pkp-e2e#295` proposes a change to the Login redirect
    line just below. The two diffs touch neighbouring lines, so the
    second to land needs a rebase. With both, the payment check still
    comes before the Login page.
  - A press with a file already set to "Direct Sales" that can no longer
    take payments keeps the file as it is. Its readers get the message
    page, and the window refuses the next save of "Direct Sales".
  - No stored data is involved. The REST API is not involved either:
    the submission file schema does not hold the price. The
    `CatalogBookHandler::download` hook is untouched.
  - The diff applies as it stands to 3.5 and 3.4 (checked with
    `patch --dry-run`, not walked). On 3.3 the files are `.inc.php`, so
    the same change is ported by hand.
  - The guard is an e2e check of a priced file on a press that cannot
    take payments: the refusal in the terms window and the message for
    a reader (spec U73, a **Planned** item).

Medium: about fifteen lines in a form, a handler and a locale file in
OMP, following patterns the code already uses, with a behaviour change
in the terms window that presses will notice.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/priced-file-no-payment-method-turns-readers-away/walk.js),
  with its helpers in `lib.js` beside it and in
  `priced-file-link-price-twice-or-missing/lib.js`. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/priced-file-no-payment-method-turns-readers-away/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With `MODE=emptied`
  in front it takes steps 7 to 11. With `MODE=neighbour` it takes steps
  1 to 6 on a press with payments set up. The default mode also reads
  the terms window again after the save and the format's "Metadata"
  tab: neither showed a notice.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/priced-file-no-payment-method-turns-readers-away/fix.diff omp`,
  then reverted.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL. Nothing here
  depends on the database. Datasets: pkp/datasets 566bb1f (2026-10-03).
  Steps 7 to 11 were walked on `main` only.
- The free files' view pages logged a server error on `main` in every
  walk, and a script error on both lines. These are
  `jardakotesovec/pkp-e2e#282` and `jardakotesovec/pkp-e2e#283`. The
  steps on the priced file logged nothing.
- Tips: OMP `main` 3b0ecf794 (pkp-lib 3dc90c81a6), `stable-3_5_0`
  9c5e24246 (pkp-lib cf3f984335), `stable-3_4_0` 0aec65441 (pkp-lib
  767353f4fe), `stable-3_3_0` 8e72fc883 (pkp-lib ac3fa73402).
- Code reads:
  - `CatalogBookHandler::download()` on each branch: the
    `isConfigured()` check after the Login redirect is at line 550 on
    `main`, 483 on 3.5, 467 on 3.4 and 333 on 3.3, with the redirect to
    the catalog on the next line. `ApprovedProofForm` and
    `approvedProofFormFields.tpl` on each branch: no payment check.
    `OMPPaymentManager::isConfigured()` on 3.3: the same rule.
  - `ManualPaymentPlugin` and `PaypalPaymentPlugin` (`isConfigured()`
    and their fields), `PKPPaymentSettingsForm` and ui-library's
    `SelectInput.vue` (no empty choice for the currency), and
    `paymentPluginName` and `currency` in the context schemas, on
    `main`.
  - Every `NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD` in OMP and its
    pkp-lib on each branch: titles, styles and the "Metadata" tab's
    request, and no code that creates it. `git log -S` on the constant
    in OMP and pkp-lib for its history.
    `git log --diff-filter=A` on `ApprovedProofForm`: the terms window
    dates from 4882158cb (2012-03-27), so the price was never set where
    the notification showed.
  - Every `isConfigured()` and `getDirectSalesPrice()` in OMP and its
    pkp-lib. `schemas/submissionFile.json` for the API. The native
    import filters for `directSalesPrice`.
- Not driven: "Paypal Fee Payment", a file priced through the native
  import, and the message page in another language.
- Tracker search (2026-10-03): pkp/pkp-lib, pkp/omp and pkp/ui-library,
  for direct sales and an unconfigured payment method, and for the
  classes the Cause names.
