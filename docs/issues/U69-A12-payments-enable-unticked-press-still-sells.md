# A press that unticks "Enable" on its Payments tab still sells its priced files

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** commit for `pkp/pkp-lib#2964` · [001116191d](https://github.com/pkp/pkp-lib/commit/001116191dfad53c1b72c6ccfee8b0a7dff2d9be) · 2017-10-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A press that sells book files unticks "Enable" on Settings ›
Distribution › "Payments" and saves, expecting payments to stop. The
tab then hides the currency and the payment method, as if payments
were off. A signed-in reader who opens a priced file's link still gets
the payment page with the fee and the press's payment instructions.

The press is not told that the box changed nothing. A buyer is treated
exactly as before the box was unticked, so nobody pays without getting
what a buyer got before. To stop selling, the press must change each
priced file's terms.

The fault shows on a press that has a currency, a payment method and a
file set to "Direct Sales". On a journal the same box does turn
payments off.

## Impact

- **Lost.** The press's decision to stop selling. With "Manual Fee
  Payment" no money moves through the press's site: the reader reads
  the instructions and sends the press a notice by email, and those
  notices keep coming. With "Paypal Fee Payment" the buyer still pays
  through PayPal and still gets the file (read in the code, not
  walked).
- **Who.** A Press manager or Press editor of a press that sells files
  and unticks the box to stop. Only presses with files for sale can
  run into it, and only on the day they turn payments off.
- **Way round.** Under each book's "Publication Formats", set every
  priced file to "Open Access" or "Not Available", one file at a time.

Low: a setting that reads as the switch for payments does nothing on a
press, and the press can still stop its sales another way on screen.
It would be medium if a buyer paid and did not get the file because of
it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published. Its side column lists the free file
  "Segmentation of Vascular Ultrasound Imag.pdf" under "PDF".
- The dataset has no currency and no file for sale; steps 1 to 3 set
  them.

Setting a file for sale:

1. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency" and "Manual Fee
   Payment" under "Payment Plugins", type "Pay by cheque u69r10" in
   "Manual Payment Instructions" and press "Save".
2. Open the book's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`)
   and, under "Publication", "Publication Formats".
3. The files are listed under the format "PDF". In the row of
   "Segmentation of Vascular Ultrasound Imag.pdf", press "Open Access"
   in the "Availability" column. In "Set Terms for Downloading" choose
   "Direct Sales", type 25.00 under "Price (USD)" and press "Save".
4. Sign in as `aclark`. Open "Catalog", press the book's title and, in
   the side column, "Segmentation of Vascular Ultrasound Imag.pdf".
   (The link reads the file's name with no price, because "PDF" lists
   two files; that wording is `jardakotesovec/pkp-e2e#289`.) The
   payment page "Manual Fee Payment" opens: the press sells the file.

Turning payments off:

5. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   untick "Enable" and press "Save". Reload the page and open the tab
   again.
6. Sign in as `aclark`. Open "Catalog", press the book's title and, in
   the side column, "Segmentation of Vascular Ultrasound Imag.pdf".

**Expected.** At step 6 no payment page opens: the press has turned
payments off.

**Observed.** At step 5 the save answers "Saved", and after the reload
the tab shows the box alone, unticked:

```
Setup
Enable
Payments will be enabled for this press. Note that users will be required to log in to make payments.
Save
```

At step 6 the payment page opens as it did at step 4:

```
Manual Fee Payment
Pay by cheque u69r10
Title  Segmentation of Vascular Ultrasound Imag.pdf
Fee    25.00 (USD)
Send notification of payment
```

## Cause

The box saves the press setting `paymentsEnabled`, and on a press no
code reads it except the form itself, which uses it to show or hide
its other fields (`showWhen` in `PKPPaymentSettingsForm` and in the
two payment plugins).

Whether a press can take a payment is decided by
`OMPPaymentManager::isConfigured()`
(`classes/payment/omp/OMPPaymentManager.php`, line 46):

```php
return parent::isConfigured() && $this->_context && $this->_context->getData('currency');
```

That is the chosen plugin's own check (instructions for "Manual Fee
Payment", an account name for PayPal) and a currency. Unticking the
box clears neither: after step 5 the press still stores `currency`
"USD" and `paymentPluginName` "ManualPayment" beside `paymentsEnabled`
"0". `CatalogBookHandler::download()` (line 550) asks
`isConfigured()`, gets true and shows the payment form.

OJS's manager reads the setting: `OJSPaymentManager::isConfigured()`
returns `parent::isConfigured() && $this->_context->getData('paymentsEnabled')`.
The box reached the settings form the two apps share in 001116191d,
which moved the journal's enable switch there; OMP's manager was not
changed with it, so on a press the box has never done anything.

Reach:

- **The payment page** (on screen): `CatalogBookHandler::download()`,
  the one place OMP starts a payment.
- **`PaymentManager::queuePayment()`** (code): it also asks
  `isConfigured()`, from the same request.
- **The book page's link** (code): `CatalogBookHandler::book()` hands
  the template the currency whenever the press has one (line 314),
  without asking the manager. So where a link names its format (a
  format with one listed file), it words the price whatever the box
  says. The file in the Steps is linked by its name, with no price
  before or after the box is unticked (on screen).
- **The catalog entry's format form** (code):
  `PublicationFormatMetadataForm` assigns `paymentConfigured` and
  `currency` to its template when `isConfigured()` is true; no
  template reads `paymentConfigured`.
- **A payment that comes back from PayPal** (code):
  `PaymentHandler::plugin()` asks the plugin, not the manager, so the
  box has no say there either.
- **OJS** (code): reads the setting in its manager, its menu items,
  its About page and its backend menu. **OPS** has no payments.

## Proposed fix

Two parts. Have the press's manager read the box, as the journal's
does, and add an upgrade migration that ticks the box for every press
that sells today, so that the first part switches nobody off. The
migration is what makes this more than a one-line fix
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payments-enable-unticked-press-still-sells/fix.diff)):

```diff
--- a/classes/payment/omp/OMPPaymentManager.php
+++ b/classes/payment/omp/OMPPaymentManager.php
@@ -43,7 +43,7 @@
      */
     public function isConfigured()
     {
-        return parent::isConfigured() && $this->_context && $this->_context->getData('currency');
+        return parent::isConfigured() && $this->_context && $this->_context->getData('paymentsEnabled') && $this->_context->getData('currency');
     }
 
     /**
```

The manager owns the question "can this press take a payment", so
every caller follows. A press with the box unticked then behaves as a
press whose payment method is not set up does today: a signed-in
reader who opens a priced file's link is sent to "Catalog".

Tried on OMP `main`: at step 6 the link led to "Catalog" and no
payment page opened. At step 4, with the box ticked, it still opened
"Manual Fee Payment" with "Fee" "25.00 (USD)".

The diff alone is not safe to ship: it needs the migration below,
which was not written or tried.

- **Alternatives.**
  - Removing the box from a press's form (the form class is shared, so
    a flag or an OMP subclass) makes the screen honest, but leaves a
    press no single switch. "Currency", "Payment Plugins" and the
    plugins' own fields are shown only while the box is ticked, so
    each of them would need its `showWhen` removed for a press too.
  - Clearing the currency and the payment method when the box is
    unticked stops the sales through today's code, and loses the
    press's setup each time it pauses.
- **What goes with it.**
  - **The migration.** It sets `paymentsEnabled` for every press that
    has a `currency` and a `paymentPluginName`. Two groups of presses
    sell today with the box unticked and would otherwise stop on
    upgrade: those set up on the 2017 form, which showed "Currency"
    and the method whether or not the box was ticked, and those that
    unticked the box since and went on selling. Nothing changes for
    either on upgrade, and from then on the box works.
  - **Where it goes.** A class in OMP's
    `classes/migration/upgrade/v3_6_0/` (`APP\migration\upgrade\v3_6_0\I<issue>_…`,
    beside `I857_ContributorRolesTypes`), listed in
    `dbscripts/xml/upgrade.xml` in the block
    `<upgrade minversion="3.3.0.0" maxversion="3.5.9.9">`.
  - **Backport.** Recommended: `main` only. The migration cannot tell
    a box left unticked by accident from one unticked on purpose after
    the fix. Run on 3.5.0.x and again on the way to 3.6, it would tick
    the box of a press that turned payments off on a fixed 3.5. If the
    team does backport to 3.5, the class goes in `v3_5_0` and in the
    3.5 block (`minversion="3.5.0.0" maxversion="3.5.0.99"`), and on
    `main` it is listed in a block of its own whose `maxversion` is
    the last 3.5.0.x without the fix, as the descriptor already does
    for 3.4 (`maxversion="3.4.0.4"`), so a fixed install skips it. No
    backport to 3.4 or 3.3 is proposed. The one-line edit is the same
    there, but `fix.diff` does not apply to 3.3
    (`OMPPaymentManager.inc.php`, tab-indented, line 30), and 3.3 has
    no `v3_x_0` folder: its migration would be an old-style class
    under `classes/migration/upgrade/` listed in a patch-level block
    of its `upgrade.xml`.
  - A buyer already on PayPal when the box is unticked still gets the
    file: PayPal's return goes through `PaymentHandler::plugin()` and
    the plugin, which do not ask the manager. The REST API and the
    plugin hooks are untouched.
  - With the box unticked a press then behaves as a press with no
    payment method does today: a signed-in reader who opens a priced
    file's link is sent to "Catalog" with no message, and a visitor to
    Login. That behaviour is its own finding (spec U73
    [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a9)),
    and after this fix an unticked box is a second way to reach it.
  - OMP's Cypress test `cypress/tests/integration/Payments.cy.js`
    ticks the box before it sells a file, so it passes with the fix.
    Nothing in it unticks the box.
  - The guard is an e2e check that a press with "Enable" unticked
    opens no payment page (spec U69, a **Planned** item).

Medium: one line in the press's manager, and an upgrade migration so
that no press selling today is switched off by it.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payments-enable-unticked-press-still-sells/walk.js),
  with its helpers in `lib.js` beside it and in
  `priced-file-link-price-twice-or-missing/lib.js`. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/payments-enable-unticked-press-still-sells/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Step 4 is the fix's
  neighbour check. The script also reads the press's three payment
  settings (`paymentsEnabled`, `currency`, `paymentPluginName`) from
  `press_settings` after steps 3 and 5.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/payments-enable-unticked-press-still-sells/fix.diff omp`
  and the same walk, then reverted. The migration was not written or
  tried.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets 92050d9 (2026-10-01).
  The server log showed no error in any walk.
- Tips: OMP `main` 3b0ecf794 (pkp-lib 3dc90c81a6), `stable-3_5_0`
  b24879c3d (pkp-lib 1fb843f491), `stable-3_4_0` 0aec65441 (pkp-lib
  df13621c2d), `stable-3_3_0` 8e72fc883 (pkp-lib d446601ebe).
- Code reads:
  - Every `paymentsEnabled` and every `isConfigured()` in OMP, its
    pkp-lib and its plugins on `main`, and every `paymentsEnabled` in
    OMP's PHP on 3.5, 3.4 and 3.3: the form, the two plugins' `showWhen`
    and the settings API only.
  - `OMPPaymentManager::isConfigured()` on each branch: the same line
    on all four. `PKPPaymentSettingsForm` on each branch: the box and
    the two `showWhen` fields.
  - The same searches in OJS `main`, for `OJSPaymentManager` and the
    other readers of the setting.
  - 001116191d's diff (the box added to `PaymentMethodForm` and its
    template, with the currency always shown) and OMP's
    `templates/management/settings/distribution.tpl` at the end of
    2017, which showed that form as its "Payments" tab. `dbscripts` and the migration folders of OMP and
    pkp-lib hold nothing that sets `paymentsEnabled`.
  - `PaypalPaymentPlugin::handle()` (the return from PayPal calls
    `fulfillQueuedPayment()` without asking `isConfigured()`) and
    `ManualPaymentPlugin::handle()` (its `notify` sends an email and
    records no payment). `Payments.cy.js` in OMP's Cypress tests.
    `dbscripts/xml/upgrade.xml` and `classes/migration/upgrade/` on
    each branch, for where a migration goes.
- Not driven: "Paypal Fee Payment" (the walk used "Manual Fee
  Payment"), a visitor who is not signed in (the Login page comes
  first), and a press upgraded from before 2017.
- Unverified: whether any press in the field sells with the box
  unticked; the migration is proposed for that case. Whether the tab
  lets a press clear its currency or its method once chosen was not
  looked at; the form's code gives neither list an empty choice.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/omp and pkp/ui-library
  for enabling payments on a press, `paymentsEnabled`, direct sales,
  `OMPPaymentManager` and `isConfigured`. No issue or pull request is
  about this box.
