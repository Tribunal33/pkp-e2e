# Merging a payer's account breaks the journal's list of payments and the paid article's publishing

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; no foreign keys)
- **Introduced** `pkp/pkp-lib#6093` (foreign keys) · [5092948e08](https://github.com/pkp/ojs/commit/5092948e08ce45808b9ec4c17f8cb06ca91db8c6) in OJS (no PR), 2022-09-29, and [2a2e94e94c](https://github.com/pkp/omp/commit/2a2e94e94cd12c6ecf9d43d7cf7d2e9e44136ab6) in OMP (`pkp/omp#1216`), 2022-10-13 · Alec Smecher (asmecher). The menu and publishing have failed too since a later change: PR `pkp/pkp-lib#10877` (for issue `pkp/pkp-lib#10834`) · [9ad8c699ea](https://github.com/pkp/pkp-lib/commit/9ad8c699ea2e9fec240a1321655914440474e0c1) · 2025-02-12 · Touhidur Rahman (touhidurabir)
- **Upstream** none open (2026-10-01); `pkp/pkp-lib#5843` (closed 2021) fixed the same symptom for 3.3, before the 3.4 foreign keys brought it back
- **Tracked in** spec U52 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager merges the account of an Author whose article's publication
fee is recorded "Paid" into another account. From then on the app
fails on the server wherever that fee record is read. The journal's
"Payments" list never loads: it stays on "Loading". The article's
workflow opens an "Error" window, its "Payments" menu opens empty, and
"Schedule For Publication" ends in "An unexpected error has occurred."
The same merge deletes the merged account's subscriptions instead of
moving them.

Any recorded payment that names the merged account breaks the list in
the same way. That includes a waiver, which names the editor who saved
it, and a subscription or article bought online. On a press nothing
fails on screen. A reader who bought a book file and whose account is
merged into another loses the purchase: the remaining account is asked
to pay for the file again.

On 3.4 (2022 to 2025) only the list fails; the menu and publishing
still work there.

## Impact

- **Lost**: the journal's whole list of payments. Publishing of the
  paid article and of any later version of it. The merged account's
  subscriptions, deleted without a word. On a press, the merged
  account's bought files.
- **Who**: Journal and Press Managers and Site Administrators who use
  "Merge user" in a journal or press that takes payments.
- **Way round**: none on screen, since the "Payments" menu that would
  change the record fails too. An administrator with database access
  can repair a fee record by setting its payer to the account it was
  merged into (`UPDATE completed_payments SET user_id = … WHERE user_id
  IS NULL`). The list, the menu and publishing then work again. Deleted
  subscriptions can only be created again by hand, once someone
  notices they are missing.

Medium: the payments list fails for every manager of the journal, and
subscriptions are deleted silently, but both need a merge of an account
that paid or subscribed, which is rarely met, and a database update
brings the list and the article back. It would be high wherever merging
paying accounts is routine.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: the journal
  `publicknowledge`, submission 5 "Genetic transformation of forest
  trees" (Author `ddiouf`, Diaga Diouf) and submission 6 "Investigating
  the Shared Background Required for Argument: A Critique of Fogelin's
  Thesis on Deep Disagreement" (Author `dphillips`, Dana Phillips), both
  in Production.
- The dataset keeps payments off. Steps 1–4 turn them on and give Diaga
  Diouf a subscription.

Setting up, signed in as `admin`:

1. Settings › Distribution › "Payments": tick "Enable", "Currency"
   "US Dollar", "Payment Plugins" "Manual Fee Payment", "Manual Payment
   Instructions" "Pay by bank transfer.", "Save".
2. Side menu "Payments" › "Payment Types": "Article Processing Charge"
   50, "Save".
3. "Subscription Types" › "Create New Subscription Type": "Reader
   Year", "US Dollar", cost 30, "Online", 12 months, "Save".
4. "Individual Subscriptions" › "Create New Subscription": find
   `ddiouf` and choose Diaga Diouf, "Reader Year", status "Active",
   today to a year from today, "Save".
5. Open submission 5. In the header press "Payments", choose "Paid",
   "Save" ("Saved").
6. Open submission 6. "Payments" › "Waived" › "Save".
7. "Payments" › "Payments" tab: two rows, "Diaga Diouf · Publication
   Fee · 50 USD" and "admin admin · Publication Fee · 0".

Merging:

8. Settings › Users & Roles, search "Diouf". On Diaga Diouf's row "…" ›
   "Merge user". In "Merge user" search "Phillips", on Dana Phillips's
   row "Merge into this User", then "OK" in "Confirm" ("Are you sure you
   wish to merge the account with the username "ddiouf" into the account
   with the username "dphillips"? …").

After the merge:

9. "Payments" › "Payments".
10. "Payments" › "Individual Subscriptions".
11. Open submission 5 and press "Payments" in the header.
12. In submission 5, "Publication" › "Title & Abstract", "Schedule For
    Publication". "Review Publishing Details" has no issue chosen for
    submission 5: keep "Version of Record", choose "Vol. 1 No. 2
    (2014)", "Confirm". [3.5: "Schedule For Publication" first asks
    "Select an issue to schedule for publication": choose "Vol. 2 No. 1
    (2015)", "Save".]

On a press, PKP's default test dataset, OMP `main`:

13. As `dbarnes`: Settings › Distribution › "Payments": tick "Enable",
    "US Dollar", "Manual Fee Payment", any instructions, "Save".
14. Book 14 "From Bricks to Brains: The Embodied Cognitive Science of
    LEGO Robots" › "Publication" › "Publication Formats" › "PDF". On the
    row of "Segmentation of Vascular Ultrasound Imag.pdf" press the link
    "Open Access" (the file's current terms), choose "Direct Sales",
    price 25.00, "Save".
15. As `aclark` (Arthur Clark): the book's page in the catalog, the
    file's link. "Manual Fee Payment" opens.
16. PayPal's answer, which a test install cannot receive: run the SQL
    below. It writes what `OMPPaymentManager::fulfillQueuedPayment()`
    writes for the request step 15 queued (109 is the file's number, the
    last part of the link's address).
17. As `aclark`, the file's link again. The file's view page opens, not
    "Manual Fee Payment": the purchase counts. (The PDF in that page
    stays empty, since its download answers 500 for every reader:
    [U69 A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md),
    a separate fault. The check here is only whether "Manual Fee
    Payment" appears.)
18. As `admin`, merge Arthur Clark into Alvin Finkel (`afinkel`) as in
    step 8.
19. As `afinkel`, the file's link.

```sql
INSERT INTO completed_payments (timestamp, payment_type, context_id, user_id, assoc_id, amount, currency_code_alpha, payment_method_plugin_name)
VALUES (now(), 1, (SELECT press_id FROM presses WHERE path = 'publicknowledge'),
        (SELECT user_id FROM users WHERE username = 'aclark'), '109', 25, 'USD', 'PaypalPayment');
DELETE FROM queued_payments;  -- the one request step 15 queued
```

**Expected**: after the merge the fee record and the subscription name
Dana Phillips. The list loads, the menu reads "Paid", and the publish
window reads "All publication requirements have been met." On the
press, step 19 opens the file's view page as step 17 did.

**Observed**: the merge answers 200, the window closes and `ddiouf` no
longer exists. Then:

- 9: the list shows "Loading" and never fills.
- 10: "No Items": the subscription is gone, not moved.
- 11: an "Error" window reads "PKP\payment\Payment::setUserId():
  Argument #1 ($userId) must be of type int, null given, called in
  …/classes/payment/ojs/OJSCompletedPaymentDAO.php on line 260" with
  "OK", and the "Payments" menu opens empty.
- 12: "Error": "An unexpected error has occurred. Please reload the page
  and try again."
- 19: "Manual Fee Payment" asks Alvin Finkel to pay for the file again.

```
500 GET /index.php/publicknowledge/$$$call$$$/grid/subscriptions/payments-grid/fetch-grid
500 GET /index.php/publicknowledge/api/v1/submissions/5/publications/6/_components/submissionPayment
500 GET /index.php/publicknowledge/$$$call$$$/modals/publish/publish/publish?submissionId=5&publicationId=6
```

Control: submission 6's "Payments" menu still reads "Waived"; that
record names `admin`, who was not merged.

## Cause

`PKP\user\Repository::mergeUsers()` (lib/pkp) moves the shared records
to the new account and ends by deleting the old one
(`$this->delete($this->get($oldUserId, true))`). OJS's
`APP\user\Repository::mergeUsers()` calls the parent first and only
then moves the old account's subscriptions and completed payments.
OMP's does the same for completed payments.

That order did no harm while the tables had no foreign keys (3.3): the
rows kept the deleted account's id and the app's loops found them by
it. The foreign keys that `pkp/pkp-lib#6093` added for 3.4 act on the
delete before the app's code runs. `subscriptions_user_id` is `ON
DELETE CASCADE`, so the account's subscriptions are deleted. The
foreign key on `completed_payments.user_id` is `ON DELETE SET NULL` in
OJS and OMP, so the payment records lose their payer. The app's loops
then find nothing to move.

A payment record with no user breaks every read of it. Since
`pkp/pkp-lib#10877` typed `PKP\payment\Payment::setUserId(int)` and
`getUserId(): int`, `OJSCompletedPaymentDAO::_fromRow()` throws on the
null column, although the property is `?int` and the column nullable.
The reads that fail are the list (`PaymentsGridHandler::loadData()` →
`getByContextId()`), the menu (`SubmissionPaymentsForm`), the menu's
save (`BackendSubmissionsController::payment()`) and
`APP\publication\Repository::validatePublish()` behind the publish
window. The list's "[Nonexistent user]" label, added for exactly this
case by `pkp/pkp-lib#5843`, is never reached. On 3.4 `setUserId()` is
untyped, and the list fails one step later:
`PaymentsGridCellProvider` passes the null to `Repo::user()->get(int
$id)`.

Moving the existing loop before the parent call is not enough on its
own. The loop reads through `DAOResultFactory::next()`, which is typed
to return a `DataObject` since `pkp/pkp-lib#10072`. `CompletedPayment`
is not a `DataObject`, so a patch that only moves the loop makes every
merge of a payer fail with "Uncaught TypeError:
PKP\db\DAOResultFactory::next(): Return value must be of type
?PKP\core\DataObject, PKP\payment\CompletedPayment returned".

Reach:

- OJS institutional subscriptions whose contact is the merged account
  go the same way as individual ones, through their `subscriptions`
  row (code).
- OJS's other payment kinds (subscription fee, article and issue
  purchase, membership) are written to the same table, so a merged
  payer of any of them breaks the list too (code; they complete only
  through PayPal).
- OMP has no list of payments. The emptied record only stops counting
  as the merged account's purchase, seen in the browser after step
  16's SQL stood in for PayPal.
- Records already stored with no user also come from the 3.4 upgrade:
  `PreflightCheckMigration` empties `completed_payments.user_id` where
  the user no longer exists (code). They break the OJS list in the same
  way.

## Proposed fix

Move the app's own records before the parent deletes the account, with
a direct update instead of the object loop. Then let a payment record
hold no user, so the records already emptied read again. This is a
proposal; the team decides.

- OJS `APP\user\Repository::mergeUsers()` and OMP's: check both ids,
  move the subscriptions and payments, then
  `return parent::mergeUsers($oldUserId, $newUserId);`.
- `OJSCompletedPaymentDAO` and `OMPCompletedPaymentDAO`: a
  `transfer(int $oldUserId, int $newUserId): int` that updates
  `completed_payments.user_id`. It follows `Repo::note()->transfer()`
  and `Repo::notification()->transfer()`, which the parent already
  uses for the same job.
- lib/pkp `Payment::setUserId(?int)` and `getUserId(): ?int`, matching
  the property, the constructor and the column. The DAOs' insert and
  update stop casting the user id with `(int)`, which would turn a null
  payer into 0 and break the foreign key. In OJS,
  `PaymentsGridCellProvider` looks the user up only when there is an
  id, so the existing "[Nonexistent user]" label shows.

```php
public function mergeUsers($oldUserId, $newUserId)
{
    if (empty($oldUserId) || empty($newUserId)) {
        return false;
    }
    // … the individual and institutional subscriptions, unchanged …
    $paymentDao = DAORegistry::getDAO('OJSCompletedPaymentDAO');
    $paymentDao->transfer($oldUserId, $newUserId);

    return parent::mergeUsers($oldUserId, $newUserId);
}
```

The diffs are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/fix-omp.diff).
Tried on `main`: Expected held on both apps, and the waiver in
`admin`'s name stayed as it was. With the fix applied over a record an
unfixed merge had already emptied, the list showed it as "[Nonexistent
user]", the menu read "Paid" and publishing was offered.

Why the override and not the `UserAction::mergeUsers` hook that the
parent fires before its own moves: `Hook::call()` stops at the first
callback that returns `ABORT`. A plugin on that hook could then skip
the app's moves, and the hook is the plugins' extension point, while
the apps already override `mergeUsers()`. With the new order the
app's moves run before the hook. A plugin on it then finds the old
account's subscriptions and payments already on the new account. Today
it finds them still on the old account, which the delete then empties.
No plugin in the three apps' checkouts uses that hook.

The merge runs in no transaction, today or with the fix. If the parent
fails partway (as it does for an account that opened a discussion,
[U53 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a15)),
the subscriptions and payments are already on the new account while
the old one still exists. That is where the merge was taking them,
and merging the same two accounts again finds nothing left to move and
finishes the rest, so the fix does not add a transaction.
Wrapping the whole merge in a transaction belongs in the parent, for
every app, and would also roll back U53 A15's half-done merges.

**Alternatives**:

- Changing the foreign key on `completed_payments.user_id` to cascade
  or restrict would delete financial records, or refuse every merge of
  a payer.
- Letting the parent call a protected step of the apps before its
  delete is the cleaner shape for every app. It changes what app
  subclasses rely on, for the same result here.
- Making only `Payment::setUserId()` nullable stops the server errors
  but still empties the payer and deletes the subscriptions.

**What goes with it**:

- No data repair is possible in an upgrade. The emptied records no
  longer say whose they were, and deleted subscriptions are gone.
- Left out: `getByUserId()` in both DAOs has no caller after the fix,
  and neither has OMP's `getByContextId()`. All three return a
  `DAOResultFactory` and fail like the old loop as soon as a row
  matches. They can be removed or made to return an array, as OJS's
  `getByContextId()` already does, in a change of their own.
- The diffs apply to 3.5 as they stand. On 3.4 the `Payment` change is
  not needed (untyped there), but the cell-provider guard is.
- The guard: a unit test of `mergeUsers()` in OJS and OMP that moves
  a completed payment and a subscription, and the e2e scenario in
  this repository (a **Planned** item in U52): merge a paid Author and
  a subscriber, then read the list, the menu, the publish window and
  the subscriptions.

Medium: three repositories (pkp-lib, OJS and OMP), a few lines each,
tried, with no migration.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/walk.js)
  (OJS, steps 1–12 and the control) and
  [omp.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/omp.js)
  (OMP, steps 13–19), with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/lib.js).
  On a dataset fleet freshly reset (`npm run fleet-prep -- --feature
  <f> --dataset <n> --reset`):
  `PROBE_FEATURE=<f> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/walk.js`,
  and `omp …/omp.js`. On 3.5 put `PKP_E2E_LINE=stable-3_5_0` in front.
  The fix: `node bin/try-fix.js apply …/fix-ojs.diff ojs` and
  `…/fix-omp.diff omp`, reset, the same commands, then `revert`.
  `WALK_FROM=9` with the fix applied, after an unfixed walk and no
  reset, reads steps 9–13 on the record that walk left without its
  payer.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, on PKP's default
  test dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL. MySQL not
  checked. Step 16's SQL is written from the request's stored
  `payment_data`, as `OMPPaymentManager::createCompletedPayment()`
  copies it (type, press, user, file, amount, currency).
- The database repair under Way round was walked on 3.5 without the
  fix: after the unfixed merge, `UPDATE completed_payments SET user_id =
  <dphillips's id> WHERE user_id IS NULL`, then steps 9–13 again. The
  list showed "Dana Phillips · 50 USD", the menu read "Paid", and the
  publish window read "All publication requirements have been met."
- The "[Nonexistent user]" result with the fix applied over an emptied
  record was walked with the first version of the diffs, before the
  `(int)` casts were dropped. Those casts are on the write path only.
  The revised diffs were walked again on both apps from a fresh reset.
- Not walked: a merge of the editor named on a waiver (the same column
  and reads as the walked "Paid" record, code).
- Tips: OJS `main` 68615b5a32 (pkp-lib 25562b0e1a, ui-library
  64d6736318); OMP `main` 3b0ecf794 (pkp-lib 3dc90c81a6); OJS
  `stable-3_5_0` 3517e640f2 (pkp-lib b1981810da); OMP `stable-3_5_0`
  c7b45f88e (pkp-lib 1fb843f491). Code reads: OJS
  `upstream/stable-3_4_0` 75cc2d488b and `stable-3_3_0` ac77c9fb35,
  pkp-lib `stable-3_4_0` 32b0f4b4af and `stable-3_3_0` f6ab331645, OMP
  `stable-3_4_0` 0aec65441 and `stable-3_3_0` 8e72fc883.
- 3.4 (code): `OJSMigration` and `OMPMigration` carry the same foreign
  keys (5092948e08 and 2a2e94e94c are on the 3.4.0 tags). `Payment`
  and `DAOResultFactory::next()` are untyped. `SubmissionPaymentsForm`
  and `validatePublish()` read only the amount. OMP 3.4 loses the
  purchase as on `main`.
- 3.3 (code): `dbscripts/xml/ojs_schema.xml` declares no foreign keys.
  `UserAction::mergeUsers()` in OJS and OMP moves payments by the old
  id after `PKPUserAction::mergeUsers()`, which finds them still there.
- Introduced: `git blame` on `completed_payments_user_id` and
  `subscriptions_user_id` in `OJSMigration` gives 5092948e08 ("Add FKs
  to OJS schema", pushed without a PR, also adding
  `I6093_AddForeignKeys` and the preflight). OMP's `completed_payments`
  foreign key is 2a2e94e94c. The merge order dates from 2015
  (c253fe261d, `pkp/pkp-lib#705`, "move completed payments when merging
  users"), moved into the repository by `pkp/pkp-lib#7127`. The return
  type of `DAOResultFactory::next()` is 657efbae75 (`pkp/pkp-lib#10072`,
  on 3.5 and `main`).
- Upstream searched in pkp/pkp-lib, pkp/ojs and pkp/omp for "merge user
  payment", "merge users subscription", "merged user payments list",
  "Nonexistent user payment", "setUserId", "mergeUsers completed
  payments". `pkp/pkp-lib#4073` concerns other tables.
- OPS takes no payments and has no merge override.
