# Merging an author whose fee is recorded "Paid" breaks the journal's payments list and that article's publishing

- **Severity** high
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS; OMP (a bought file's record loses its buyer, no error)
  - 3.5: OJS; OMP (code)
  - 3.4: OJS, OMP (code; on OJS only the payments list fails)
  - 3.3: none (code; no foreign keys, the merge moves the payments)
- **Introduced** `pkp/pkp-lib#6093` · [5092948e08](https://github.com/pkp/ojs/commit/5092948e08ce45808b9ec4c17f8cb06ca91db8c6) (OJS), [2a2e94e94c](https://github.com/pkp/omp/commit/2a2e94e94cd12c6ecf9d43d7cf7d2e9e44136ab6) (OMP, `pkp/omp#1216`) · 2022-09-29 and 2022-10-13 · Alec Smecher (asmecher); the server error since `pkp/pkp-lib#10834` (PR `pkp/pkp-lib#10877`) · [9ad8c699ea](https://github.com/pkp/pkp-lib/commit/9ad8c699ea2e9fec240a1321655914440474e0c1) · 2025-02-12 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor records an article's publication fee as "Paid", and later a
manager merges that author's account into another. From then on the
server fails wherever the fee's payment record is read. The "Payments"
page's "Payments" tab shows "Loading" and never finishes, for every
payment of the journal. The submission's workflow opens an "Error"
window and its "Payments" menu opens empty. "Schedule For Publication" ›
"Confirm" answers "An unexpected error has occurred. Please reload the
page and try again.", so the article cannot be published, and nothing on
screen repairs it.

The merge reports success. It does not carry the payment over to the
account it keeps, and it silently deletes the merged account's
subscriptions.

It needs a journal that charges an article processing fee (payments are
off by default) and a merge of an account that paid one; the
subscription loss needs only the merge of a subscriber.

## Impact

- **Lost.** Gone for good: who paid the fee (the payment record's user
  is emptied and the merged account deleted), and the merged account's
  subscriptions (the rows are deleted). The payment records themselves
  (amount, date, which article) stay in the database: the list and the
  publish check only fail to read them. Nobody is told.
- **Who.** Every Journal Manager and Subscription Manager who opens
  "Payments": the list fails for all of the journal's payments, not only
  the merged author's. Every editor who tries to publish that article,
  and so its author, whose article stays unpublished. A merged
  subscriber, who loses the subscription and with it access to
  restricted content.
- **How often.** Each merge of an account that holds a recorded fee or a
  subscription triggers it. Merges are occasional housekeeping, mostly
  of duplicate author accounts, so an APC journal meets it the first time
  it merges an author who has paid.
- **Way round.** None on screen. Turning payments off does not help:
  the publish check reads the fee's record before it looks at the
  setting. Only a database edit that sets the payment record's user to
  an existing account clears the errors. Once the fixed code is in
  place, installs already in this state read the list and publish again
  with no repair (the payer shows as "[Nonexistent user]"). Nothing can
  bring back the payer or the deleted subscriptions, so no repair is
  proposed.

High: publishing that article, a core task, fails with no way round on
screen, and the journal's payments list stays unusable, after a merge
that reported success. It would be medium if the article could be
released on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (`publicknowledge`). Every
  password is the username twice (`rvaca` / `rvacarvaca`).
- Payments set up, as `rvaca` (Journal manager). The dataset leaves them
  off.
  - Settings › Distribution › "Payments": tick "Enable", "Currency" "US
    Dollar", "Payment Plugins" "Manual Fee Payment", "Manual Payment
    Instructions" "Pay by bank transfer.", then "Save".
  - Side menu "Payments" › "Payment Types": "Article Processing Charge"
    50, then "Save".

**The fee.** All as `rvaca`:

1. Open submission 6, "Investigating the Shared Background Required for
   Argument: A Critique of Fogelin's Thesis on Deep Disagreement"
   (Production; author Dana Phillips, `dphillips`).
2. In the workflow's header press "Payments", choose "Paid" and press
   "Save". It reads "Saved".
3. Side menu "Payments" › "Payments" tab. It lists "Dana Phillips |
   Publication Fee | 50 USD | <time>".
4. Settings › "Users & Roles": on Dana Phillips's row press "…" › "Merge
   user".
5. In "Merge user", on Carlo Corino's row (`ccorino`) press "Merge into
   this User", then "OK" in "Confirm". The window closes.
6. Side menu "Payments" › "Payments" tab.
7. Open submission 6 again.
8. Press "OK" in the "Error" window, then "Payments" in the header.
9. Side menu "Publication" › "Title & Abstract" › "Schedule For
   Publication". Choose "Version of Record (VoR)" and "Major Revision",
   keep "Assign To Current/Back Issue" with "Vol. 1 No. 2 (2014)", and
   press "Confirm".

**Expected.** Step 6 lists the payment under the account that was kept,
"Carlo Corino | Publication Fee | 50 USD". Steps 7 and 8 open the
workflow as before, with "Paid" chosen. Step 9 opens the "Schedule For
Publication" window: "All publication requirements have been met. This
will be published immediately in Vol. 1 No. 2 (2014). Are you sure you
want to publish this?"

**Observed.** Step 6 shows "Loading" and never anything else. Step 7
opens an "Error" window over the workflow. In step 8 the "Payments" menu
opens empty, with no choices and no "Save". In step 9 an "Error" window
reads "An unexpected error has occurred. Please reload the page and try
again." Each read fails on the server:

```
GET {journal}/$$$call$$$/grid/subscriptions/payments-grid/fetch-grid → 500
GET {journal}/api/v1/submissions/6/publications/7/_components/submissionPayment → 500
GET {journal}/$$$call$$$/modals/publish/publish/publish?submissionId=6&publicationId=7 → 500

Uncaught TypeError: PKP\payment\Payment::setUserId(): Argument #1 ($userId)
must be of type int, null given, called in
classes/payment/ojs/OJSCompletedPaymentDAO.php on line 260
```

Before step 4, the list, the menu and the publish window all work. After
the merge, a fee another author paid and a waiver still read normally.

**The subscription.** From a freshly loaded dataset with payments set up
as above, all as `rvaca`:

1. Side menu "Payments" › "Subscription Types" › "Create New
   Subscription Type": "Name of Type" "u52w42 Online Year", "Currency"
   "US Dollar", "Cost" 40, "Format" "Online", "Duration" 12, then
   "Save".
2. "Individual Subscriptions" › "Create New Subscription": "Subscription
   type" "u52w42 Online Year"; under "Locate a User" search "Phillips"
   and choose Dana Phillips; "Status" "Active"; today as the start date
   and the same day next year as the end date; then "Save". The list
   reads "Dana Phillips | dphillips@mailinator.com | u52w42 Online Year |
   Active | 2026-10-01 | 2027-10-01".
3. Merge Dana Phillips into Carlo Corino, as in steps 4 and 5 above.
4. Side menu "Payments" › "Individual Subscriptions".

**Expected.** One row: "Carlo Corino | ccorino@mailinator.com | u52w42
Online Year | Active | 2026-10-01 | 2027-10-01".

**Observed.** "No Items". The subscription is deleted, with no error and
no message.

## Cause

`APP\user\Repository::mergeUsers()` (OJS `classes/user/Repository.php`)
first calls `parent::mergeUsers()`. Only after that does it move the old
account's individual and institutional subscriptions and its completed
payments to the new account. The parent, `PKP\user\Repository::mergeUsers()`,
moves pkp-lib's own records and ends with
`$this->delete($this->get($oldUserId, true))`. So OJS's transfers run
after the old account is gone.

Until 3.3 that order was harmless: `pkp/pkp-lib#5843` (2020) relied on
it to move payments. In 3.4, `pkp/pkp-lib#6093` added foreign keys to
`OJSMigration`, which upgraded installs get too.
`completed_payments.user_id` is `ON DELETE SET NULL` and
`subscriptions.user_id` is `ON DELETE CASCADE`. The parent's delete now
empties the payments' user and deletes the subscriptions before OJS
looks for them, so `getByUserId($oldUserId)` finds nothing to move.
OMP's `APP\user\Repository::mergeUsers()` has the same order and the
same `SET NULL` key on its payments (`2a2e94e94c`).

A payment without a user then fails every read that loads it.
`OJSCompletedPaymentDAO::_fromRow()` passes the null to
`PKP\payment\Payment::setUserId()`, which accepts only an `int` since
`9ad8c699ea` (`pkp/pkp-lib#10834`, a fix for waived fees). That class's
`$userId` property and its constructor are `?int`, and the column is
nullable. 3.4 does not have that change, and reads such a record
without error.

Two more faults sit on the same path:

- The transfer loop could not run even in the right order.
  `getByUserId()` returns a `DAOResultFactory`, whose `next()` returns
  `?DataObject` since `657efbae75` (`pkp/pkp-lib#10072`), and
  `CompletedPayment` is not a `DataObject`. With only the order fixed,
  the merge throws "DAOResultFactory::next(): Return value must be of
  type ?PKP\core\DataObject, PKP\payment\CompletedPayment returned".
- The list's "[Nonexistent user]" label, added by `pkp/pkp-lib#5843` for
  exactly these records, cannot show. `PaymentsGridCellProvider` passes
  the null to `Repo::user()->get(int $id)`, which fails the same way
  (main, 3.5 and 3.4).

Reach:

- OJS: the list of payments (`PaymentsGridHandler::loadData()`), the
  workflow's menu (`SubmissionPaymentsForm`) and publishing
  (`Repository::validatePublish()`) fail; on screen, `main` and 3.5.
  Saving the menu (`BackendSubmissionsController::payment()`) reads the
  same record and would fail too (code; the menu shows no choices).
- OJS: the merged account's individual subscription is deleted (on
  screen, `main`; code, 3.5 and 3.4). An institution's subscription whose
  contact is merged is deleted with it (code, the same cascade).
- OJS: a reader's bought article, issue or membership loses its buyer,
  so the kept account has no access to it (code; `hasPaid*()` reads by
  user, so nothing fails).
- OMP: a reader's bought file loses its buyer (seen in the database after
  a merge through the screens, `main`), so the kept account would be
  asked to pay for the file again (code, `hasPaidPurchaseFile()`).
  Nothing reads such a record in a way that fails.
- The command-line `tools/mergeUsers.php` calls the same method (code).
- Stored data: every install on 3.4 or later that has merged a payer
  holds payment records without a user, and the deleted subscriptions
  are gone.

## Proposed fix

A proposal: move the app's records while the old account still exists,
and let a payment record without a user be read and saved
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments/fix-omp.diff)):

1. OJS and OMP `Repository::mergeUsers()`: check the two ids, run the
   app's own transfers, then `return parent::mergeUsers(...)`. The parent
   already works this way: it moves everything before its final delete.
2. Replace the payment loop with one statement,
   `OJSCompletedPaymentDAO::changeUser()` (and OMP's), following
   `Repo::eventLog()->dao->changeUser()`, which the same merge calls.
3. pkp-lib `Payment::setUserId(?int)` and `getUserId(): ?int`, matching
   the property and the constructor. OJS `PaymentsGridCellProvider`
   passes only a real id to `Repo::user()->get()`, so the records
   already without a payer list as "[Nonexistent user]", and the
   workflow and publishing read them again. Both DAOs'
   `insertObject()`/`insertCompletedPayment()` and `updateObject()`
   write the user as it is instead of `(int)`, which would turn a null
   into user 0 and break the foreign key.

The heart of `mergeUsers()` in OJS (abridged: the diff also adds two
comments, and leaves the subscription transfers unchanged):

```diff
     public function mergeUsers($oldUserId, $newUserId)
     {
-        if (!parent::mergeUsers($oldUserId, $newUserId)) {
+        if (empty($oldUserId) || empty($newUserId)) {
             return false;
         }
         // … subscriptions, as now …
-        $paymentFactory = $paymentDao->getByUserId($oldUserId);
-        while ($payment = $paymentFactory->next()) {
-            $payment->setUserId($newUserId);
-            $paymentDao->updateObject($payment);
-        }
+        $paymentDao->changeUser($oldUserId, $newUserId);
 
-        return true;
+        return parent::mergeUsers($oldUserId, $newUserId);
     }
```

Tried on `main`, OJS and OMP, before the `(int)` lines were added (those
were not tried). The fee steps then show their Expected, and the
subscription steps list Carlo Corino's row. With the fix in, the other
payers' records and the waiver read as before, and OMP's bought-file
record moves to the kept account. A record left without a user by an
earlier merge lists as "[Nonexistent user]", with "Paid" in its menu.

**Alternatives**

- Only the `?int` change: the errors stop, but every merge still loses
  the payer and deletes subscriptions without a word.
- Changing the foreign keys: `CASCADE` on payments deletes the journal's
  financial records, and `RESTRICT` makes every such merge fail.
- A method the parent calls before its delete, which the apps override:
  cleaner in the long run, but a new pattern where reordering is enough.

**What goes with it**

- One transaction, recommended: the merge runs its steps without one, so
  a failure partway leaves part of the records moved. With the reorder,
  that would be an old account that still exists but has lost its
  payments and subscriptions (the old order failed the other way round).
  Wrapping `UserGridHandler::mergeUsers()` and `MergeUsersTool` (or
  `PKP\user\Repository::mergeUsers()` with its app overrides) in
  `DB::transaction()` makes it all or nothing. Not in the diff.
- No data repair: the payer and the deleted subscriptions cannot be
  recovered, and part 3 makes the records already without a payer
  readable.
- `getByUserId()` in both DAOs, and OMP's `getByContextId()`, return a
  `DAOResultFactory`, which cannot hand out a `CompletedPayment`. None of
  them has a caller once the fix is in. Remove them, or return an array
  as OJS's `getByContextId()` does; the diff leaves them alone.
- The `UserAction::mergeUsers` hook now fires after the app's transfers.
  A plugin that changes the ids through that hook would see these
  records already moved.
- Backport: the diffs apply unchanged to `stable-3_5_0`. On 3.4,
  `Payment` and `DAOResultFactory::next()` are untyped, so the reorder and
  the list's guard are enough.
- Test: an OJS unit test that merges two users, one with a completed
  payment and an individual subscription, and an end-to-end test of the
  merge.

Medium: pkp-lib, OJS and OMP, six files, no migration.

## Evidence

- Kept scripts, run on an install freshly reset to the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments/walk.js)
    takes the preconditions and the fee steps on OJS:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/merged-payer-breaks-payments/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments/neighbour.js)
    takes the subscription steps on OJS, walked with the fix in and out.
    Before the merge it also records "Paid" on submission 9 and a waiver
    on submission 5, and reads them before and after. On OMP it merges
    Arthur Clark into Alvin Finkel (below).
  - [orphaned.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments/orphaned.js)
    reads, with the fix in, a payment record whose `user_id` was set to
    NULL to stand for a merge made before the fix.
- OMP, data level only. Only PayPal's callback writes a bought-file
  record, so the record was written as
  `OMPPaymentManager::fulfillQueuedPayment()` writes it through
  `OMPCompletedPaymentDAO::insertCompletedPayment()` (in the `main`
  dataset `aclark` is user 19, and file 108 is a proof file of submission
  14):
  `INSERT INTO completed_payments (timestamp, payment_type, context_id, user_id, assoc_id, amount, currency_code_alpha, payment_method_plugin_name) VALUES (now(), 1, 1, 19, '108', 10.00, 'USD', 'PaypalPayment');`
  Then, as `rvaca`, Settings › "Users & Roles" › Arthur Clark's "…" ›
  "Merge user" › Alvin Finkel's (`afinkel`, user 20) "Merge into this
  User" › "OK". Read back with
  `SELECT completed_payment_id, assoc_id, user_id FROM completed_payments;`:
  `user_id` 19 before, NULL after the merge, and 20 with the fix in. No
  OMP screen shows the record, and the dataset has no priced file, so
  the buyer's side was not seen.
- Walked on PostgreSQL, on the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked; its InnoDB foreign keys have the same
  `SET NULL` and `CASCADE` actions.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`
  (lib/pkp `3dc90c81a6`); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d` (lib/pkp `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7`,
  OMP `0aec65441f` (lib/pkp `df13621c2d`); `stable-3_3_0` OJS
  `9fdb9bcf9a`, OMP `8e72fc8836` (lib/pkp `d446601ebe`).
- 3.5: the fee steps walked on OJS, with the same Observed. There
  "Schedule For Publication" first asks for the issue ("Select an issue
  to schedule for publication", "Save"), and that "Save" gets the error.
  The code read matches `main`. The subscription steps were not walked
  on 3.5.
- 3.4 (code): OJS and OMP `classes/user/Repository.php` call the parent
  first, and both migrations carry the `SET NULL` key (OJS also the
  subscriptions `CASCADE`). `PaymentsGridCellProvider` passes the null to
  `Repo::user()->get(int $id)`, so the list fails.
- 3.3 (code): `classes/migration/OJSMigration.inc.php` and OMP's create
  `completed_payments` and `subscriptions` without foreign keys, and
  `PKPUserAction::mergeUsers()` deletes only the user row, so OJS's
  `UserAction::mergeUsers()` still finds the old account's payments and
  subscriptions.
- Introduced: `git blame` on the OJS and OMP foreign-key lines. OJS
  `5092948e08` was pushed without a PR.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/omp searched by the symptom and
  by the classes named in the Cause. `pkp/pkp-lib#3657` (a 2018
  subscription merge error) and `pkp/pkp-lib#4073` (other tables) are
  other faults.
- Not driven: an institution's subscription, a reader's bought article
  or issue, and the command-line merge (code only). The `(int)` lines of
  the diffs were added after the fix was tried and were not walked.
