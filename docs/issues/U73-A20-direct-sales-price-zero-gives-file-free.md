# A book file on "Direct Sales" at a zero price is free at "0" and out of readers' reach at "0.00"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced; present since at least [461a0e1d5](https://github.com/pkp/omp/commit/461a0e1d5897d48d05752673fa55c98d2e8a6b3a) (2015-10-21)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U73 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a20)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press editor sets a book file's terms to "Direct Sales" with a price
of zero, and the save is accepted. The file then reads "Direct Sales"
in "Publication Formats". What readers get depends on how the zero was
typed:

- At "0", the "Set Terms for Downloading" window reopens on "Open
  Access", and readers get the file free.
- At "0.00", the book page offers "0.00 Purchase PDF (0.00 USD)". A
  signed-in reader gets a payment page that shows no fee. Its only
  action leads back to the same page, so the file stays out of reach.

Nothing tells the editor that a zero price is not a sale. The press can
set the file to "Open Access" instead, but readers have no way round.

It takes a zero typed under "Direct Sales". The "0.00" outcome is on a
press with "Manual Fee Payment" set up.

## Impact

- **Lost.** At "0.00", readers lose access to a file the press meant
  to give away, and nobody is told. At "0", nothing is lost, but the
  formats list says the file is for sale.
- **Who.** Readers of a book with such a file, and the press managers
  and editors who set its terms.
- **Way round.** The press sets the file to "Open Access" and saves.
  This works for a file already saved at "0" or "0.00".

Medium: at "0.00" readers cannot get the file, but it takes a typed zero
under "Direct Sales", and the press can undo it on screen. It would be
high if presses commonly gave files away this way, since readers have
no way round of their own.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published. Its format "PDF" holds six files, each
  reading "Open Access" in the list, among them "chapter1.pdf" and
  "chapter4.pdf".
- The press has "Manual Fee Payment" as its payment method, but
  payments are off and no currency is set. Step 1 sets them up.

Setting up payments:

1. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency", check that
   "Manual Fee Payment" is chosen under "Payment Plugins", type "Pay by
   cheque u73l" in "Manual Payment Instructions" and press "Save".

A price of 0:

2. Open the book's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`)
   and, under "Publication", "Publication Formats".
3. In the row of "chapter1.pdf", press "Open Access". In "Set Terms
   for Downloading" choose "Direct Sales", type 0 under "Price (USD)"
   and press "Save".
4. Reload the page and read the row's link. Press it, read which
   choice the window has ticked and what the price box holds, and close
   the window.
5. Sign out. Open "Catalog" and press the book's title
   (`/index.php/publicknowledge/en/catalog/book/14`). Read the link
   under "Chapter 1: Mind Control—Internal or External?".
6. Press that link.

A price of "0.00" (straight after step 1):

7. As in steps 2 to 4, set "chapter4.pdf" to "Direct Sales" at "0.00",
   reload, and read the link and the window.
8. Sign out, open the book's page, read the link under "Chapter 4:
   Braitenberg’s Vehicle 2" and press it.
9. Sign in as `aclark`, open the book's page and press the same link.
10. Press "Send notification of payment", then "Continue".
11. Sign in as `dbarnes` and set "chapter4.pdf" to "Open Access" with
    "Save". Sign in as `aclark` and press chapter 4's link again.

**Expected.** At steps 3 and 7, "Save" is refused, as for any other
invalid price. The window stays open on "Direct Sales" with the typed
price, "Errors occurred processing this form" at its top and "A valid
price is required." in place of the "Price (USD)" label. Nothing is
saved, and the link still reads "Open Access".

**Observed.** The window closes at step 3, and at step 4:

- the row's link reads "Direct Sales";
- the window has "Open Access" ticked, and the "Price (USD)" box is
  empty and greyed out.

At step 5 chapter 1's link reads "PDF", as a free file's does. At step 6
a signed-out visitor gets "PDF view of the file chapter1.pdf".

At "0.00" the save is accepted too:

- At step 7 the link reads "Direct Sales", and the window reopens on
  "Direct Sales" with "0.00".
- At step 8 the link reads "0.00 Purchase PDF (0.00 USD)", and the
  visitor is sent to "Login".
- At step 9 `aclark` gets "Manual Fee Payment" with "Pay by cheque
  u73l" and "Title chapter4.pdf", and no "Fee" line.
- At step 10 "Payment Notification" says "Payment notification sent".
  Its "Continue" leads back to the same "Manual Fee Payment" page.
- At step 11 the link reads "PDF", and `aclark` gets "PDF view of the
  file chapter4.pdf".

A file at 25.00, the control, reads "Direct Sales" in the list, opens
the window on "Direct Sales" with "25.00", and sends a visitor to
"Login".

## Cause

OMP stores a file's terms twice: the choice in `salesType` and the
price in `directSalesPrice`. A price of 0 is how the app marks a free
file: `ApprovedProofForm::execute()` stores 0 for "Open Access" and
null for "Not Available". The code that acts on the terms goes by the
price:

- `CatalogBookHandler::download()` serves the file free only when
  `getDirectSalesPrice() === '0'` (line 493). Any other price goes to
  Login and then to a payment.
- `templates/frontend/components/downloadLink.tpl` words the link as a
  purchase when the price is not 0 and the press has a currency
  (line 31).
- `js/controllers/grid/files/proof/form/ApprovedProofFormHandler.js`
  ticks "Open Access" when the price box holds "0" and empties the box
  (line 54). `ApprovedProofForm::fetch()` hands it the stored choice,
  never the posted one.

Only the list's link goes by the choice:
`PublicationFormatGridCellProvider::getCellActions()` words it from
`salesType` (lines 244 to 252).

`ApprovedProofForm`'s constructor checks the price with a pattern that
takes 0 as a whole part (line 52), so "0", "0.00" and ".00" pass. Nothing
checks the price against the choice. So:

- "Direct Sales" with "0" is stored as `directSales` and `'0'`. The
  list reads the choice, while the window and the book page read the
  free price.
- With "0.00" every check misses the zero. The reader is asked to pay
  "0.00". The manual payment page hides the fee line for an amount of
  0 (`{if $itemAmount}` in its `paymentForm.tpl`). "Send notification
  of payment" mails the press contact and leads back. No screen records
  a manual payment: only PayPal's callback calls
  `OMPPaymentManager::fulfillQueuedPayment()`.

The form has always accepted a zero price. The pattern came with
988868e94 (2012), and the check it replaced (`$price >= 0`) allowed 0
too. 7fc1a34e7 (2012) stored the choice beside the price. The formats
list showed that choice as the icon of a "Set Terms" link, and since
461a0e1d5 (2015) in the link's words.

Reach:

- **Files already saved at a zero price** (on screen for "0.00"): the
  way round in Impact covers them.
- **"Direct Sales" with an empty price** (code): it passes the server's
  checks, since both are optional. No screen sends it: "Save" stays
  greyed while the box is empty.
- **The REST API and the native XML import** (code): both write
  `salesType` and `directSalesPrice` with no rule for the two together
  (`schemas/submissionFile.json` has only `nullable`). No screen sends
  a zero through them.

## Proposed fix

Refuse a zero price under "Direct Sales" in `ApprovedProofForm`, the
form that writes both values. Bring the refused window back on the
choice that was posted, with the typed price, as a refused "10.5"
already comes back. The excerpt below shows the changed lines;
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/direct-sales-price-zero-gives-file-free/fix.diff)
applies as it stands:

```diff
--- a/controllers/grid/files/proof/form/ApprovedProofForm.php
+++ b/controllers/grid/files/proof/form/ApprovedProofForm.php
@@ -50,6 +50,15 @@
         $this->addCheck(new \PKP\form\validation\FormValidatorRegExp($this, 'price', 'optional', 'grid.catalogEntry.validPriceRequired', '/^(([1-9]\d{0,2}(,\d{3})*|[1-9]\d*|0|)(.\d{2})?|([1-9]\d{0,2}(,\d{3})*|[1-9]\d*|0|)(.\d{2})?)$/'));
+        // "Direct Sales" needs a price above 0: 0 is what "Open Access" stores, and readers get such a file free
+        $form = $this;
+        $this->addCheck(new \PKP\form\validation\FormValidatorCustom(
+            $this,
+            'price',
+            'optional',
+            'grid.catalogEntry.validPriceRequired',
+            fn ($price) => $form->getData('salesType') !== 'directSales' || (float) $price > 0
+        ));
@@ -78,7 +87,8 @@
-        $templateMgr->assign('salesType', $this->approvedProof->getSalesType());
+        // The saved choice, or the one just posted when a save is refused
+        $templateMgr->assign('salesType', $this->getData('salesType'));
--- a/js/controllers/grid/files/proof/form/ApprovedProofFormHandler.js
+++ b/js/controllers/grid/files/proof/form/ApprovedProofFormHandler.js
@@ -48,7 +48,10 @@
 		if (this.salesType_ !== '') {
-			if ($priceElement.attr('value') === '') {
+			if (this.salesType_ === 'directSales') {
+				// A sale opens on its choice and price, a refused one included
+				$('#directSales').attr('checked', 'true');
+			} else if ($priceElement.attr('value') === '') {
```

The check reads a second field through `$form`, as `SalesRightsForm`'s
does, and reuses the price check's message. "Open Access" and "Not
Available" pass it untouched. `getData('salesType')` is the stored
choice when the window opens (`initData()`) and the posted one after a
refused save (`readInputData()`). The script then keeps "Direct Sales"
ticked for a sale, so the window agrees with the list.

Tried on OMP `main`:

- 0 and "0.00" under "Direct Sales" were refused with "A valid price
  is required." in place of the label. The window stayed on "Direct
  Sales" with "0" or "0.00", and the links stayed "Open Access".
- A file at 25.00 and a file saved again as "Open Access" read and
  opened as before.

- **Alternatives.**
  - Fix the window's script alone: the window would agree with the
    list, but readers would still get a "Direct Sales" file at "0" free,
    and one at "0.00" never.
  - Let the readers' side decide by `salesType`: a "Direct Sales" file
    at 0 would then lead to a payment of nothing.
  - Save "Direct Sales" at a zero price as "Open Access": the list, the
    window and the readers would agree, but the editor's choice would
    change without a word.
- **What goes with it.**
  - No data repair is needed. With the fix, a file already saved at "0"
    opens on "Direct Sales" with 0, as its link says, and the editor
    picks "Open Access". A one-line update of `sales_type` where the
    price is zero would correct such files at once. Whether to ship it
    is for the team to decide.
  - Left out: the REST API, the native import and an empty "Direct
    Sales" price. No screen sends them, and a rule for the API is a
    change to its contract.
  - The fix in
    [U73-A9-priced-file-no-payment-method-turns-readers-away.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U73-A9-priced-file-no-payment-method-turns-readers-away.md)
    (pkp-e2e#799) adds its check right after the same line of
    `ApprovedProofForm`, so the two diffs are merged by hand when both
    are taken.
  - `js/pkp.min.js`, which installs with `enable_minified` on load, is
    regenerated with `lib/pkp/tools/buildjs.sh`.
  - The diff applies as written to 3.5 and 3.4. On 3.3 the form is
    `ApprovedProofForm.inc.php`, `FormValidatorCustom` has no
    namespace, and the check needs a `function ($price) use ($form)`
    closure, since 3.3 runs on PHP 7.3.
  - The guard is an e2e check in spec U73 that "Direct Sales" at "0"
    and "0.00" is refused and the window stays on "Direct Sales", a
    **Planned** item.

Small: a check and two one-line changes in one window's form and
script, with no data or API change.

## Evidence

- The kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/direct-sales-price-zero-gives-file-free/walk.js),
  with helpers in `lib.js` beside it. Run it on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/direct-sales-price-zero-gives-file-free/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1 to
  6. `MODE=decimal` in front takes step 1 and steps 7 to 11.
  `MODE=neighbour` takes step 1 and then the cases the fix must leave
  alone: "chapter2.pdf" at 25.00 and "chapter3.pdf" saved again as
  "Open Access", with "chapter4.pdf" at "0.00".
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/direct-sales-price-zero-gives-file-free/fix.diff omp`.
  The script and its neighbour mode ran with the fix in, and the
  neighbour mode also ran without it.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL (MySQL not
  checked). Datasets: pkp/datasets 566bb1f (2026-10-03).
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6), `stable-3_5_0`
  9c5e24246 (lib/pkp cf3f984335), `stable-3_4_0` 0aec65441,
  `stable-3_3_0` 8e72fc883.
- Code reads:
  - On `main`: `ApprovedProofForm`, `ApprovedProofFormHandler.js`,
    `PublicationFormatGridHandler::editApprovedProof()` and
    `saveApprovedProof()` (`initData()` on open, `readInputData()`
    before a refused `fetch()`), `PublicationFormatGridCellProvider`,
    `CatalogBookHandler::book()` and `download()`, `downloadLink.tpl`,
    `ManualPaymentPlugin::handle()` and its `paymentForm.tpl`, and the
    callers of `fulfillQueuedPayment()`. In lib/pkp:
    `FormValidator::isEmptyAndOptional()` (a price of "0" is not empty
    on PHP 8) and `Form::validate()` with `getErrorsArray()` (one
    message per field).
  - 3.5 (`checkouts`), 3.4 (`upstream/stable-3_4_0`, the `.php` files)
    and 3.3 (`upstream/stable-3_3_0`, the `.inc.php` files): the same
    pattern, `execute()` branches, script line and `=== '0'` check.
    OJS and OPS have no terms window.
  - The history: `git blame` on line 52 (moved by the PSR-12
    reformatting 01088072a8); `git log -S` on the pattern (988868e94,
    Jason Nugent, 2012-05-24, `*7498*`) and on `salesType` (7fc1a34e7,
    Jason Nugent, 2012-10-15, `*7903*`). At `461a0e1d5^` the formats
    list's link read "Set Terms", with its icon class from
    `getSalesType()`. 461a0e1d5 (Nate Wright, for `pkp/pkp-lib#825`, in
    PR `pkp/omp#146` by Alec Smecher (asmecher), merged 2015-10-27)
    worded it from `salesType`. The wording by price in 988868e94's
    diff belongs to another grid, `ApprovedProofFilesGridCellProvider`,
    which was removed as unused in a976da306 (2017). The fault is the
    form's check, older than any of these, so Introduced names no
    commit.
- Tracker search (2026-10-04): pkp/pkp-lib, pkp/omp and pkp/ui-library
  for direct sales with a zero or free price, "Set Terms for
  Downloading", "valid price", `ApprovedProofForm`, `salesType` and
  `directSalesPrice`. The hits (`pkp/pkp-lib#6999`, `#7190`: the native
  import of formats; `pkp/omp#53`: the 2013 expedited submission) are
  other faults.
- Unverified: a "0.00" file with PayPal as the payment method (not
  driven; the test installs have no network), the notification mail at
  step 10 (not read), and the REST API and the native import (code
  only).
