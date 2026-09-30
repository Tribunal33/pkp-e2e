# With only a membership fee set, a reader pressing "Full Issue" is asked to pay an issue fee of no amount

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no PR (bug 4169 of PKP's old tracker) · [a161d6c72b](https://github.com/pkp/ojs/commit/a161d6c72b4cb0ecfe2ce836a737f48b4bdaf590) · 2010-12-30 · michael-pkp (mfelczak)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a20)
- **Checked** 2026-09-30 and 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal that sells subscriptions, sets an "Association
Membership" fee and leaves "Purchase Issue" empty, a signed-in reader
with no subscription or membership who presses a restricted "Full
Issue" galley gets the payment page for a "Purchase Issue Fee" with no
amount. An article galley in the same issue takes the same reader to
the "Subscriptions" page, as it should, since the journal does not sell
single issues.

The reader is asked to pay for something the journal does not sell,
and the page offers no way to what it does sell. With manual payment,
"Send notification of payment" mails the journal's contact a notice of
an issue purchase that costs 0, which no screen lets staff act on.

## Impact

- **Lost.** The reader's time, and the journal contact's on that
  notice. Neither the reader nor the journal's staff is told that no
  issue fee is set.
- **Who.** Only journals that set "Association Membership": the fee is
  empty by default, and OJS 3 has no screen where a reader buys a
  membership (`pkp/pkp-lib#4701`). There, every such press.
- **Way round.** The reader opens "Subscriptions" from the journal's
  menu. The journal sets a "Purchase Issue" fee, or clears
  "Association Membership".

Medium rather than low: the outcome is wrong, not only its wording. The
reader is sent to pay for something that costs nothing, with no way to
the issue from that page, and the journal's staff get a request that
they cannot act on.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`.
- The journal `publicknowledge` requires subscriptions, takes manual
  payments and charges an "Association Membership" fee, with "Purchase
  Issue" and "Purchase Article" empty. The issue "Vol. 1 No. 2 (2014)"
  is restricted to subscribers and has a "Full Issue" galley. The
  dataset has none of this: the journal is open access, payments are
  off, no fee is set and the issue has no issue galley.
- The reader `ccorino` has no subscription and no membership, and is
  not an author of "Signalling Theory Dividends" (submission 1, in that
  issue, with a "PDF" galley).

Setting up (the editor):

1. Sign in as `dbarnes`.
2. Open Settings › Distribution, tab "Access". Choose "The journal will
   require subscriptions to access some or all of its contents." and
   press "Save".
3. Open the tab "Payments". Tick "Payments will be enabled for this
   journal. …", set "Currency" to "US Dollar" and "Payment Plugins" to
   "Manual Fee Payment", type "Pay by bank transfer." in "Manual Payment
   Instructions" and press "Save".
4. Open Payments › "Payment Types". Type "10" in "Association
   Membership", leave "Purchase Issue" and "Purchase Article" empty, and
   press "Save".
5. Open Issues › "Back Issues", open "Vol. 1 No. 2 (2014)", tab
   "Access", choose "Subscription" and press "Save".
6. Open "Vol. 1 No. 2 (2014)" again, tab "Issue Galleys", press "Create
   Issue Galley", type "PDF" in the label box, upload a PDF file and
   press "Save".
7. Log out.

The reader:

8. Sign in as `ccorino`.
9. Open "Archives" and "Vol. 1 No. 2 (2014)". Under "Full Issue" the
   page shows "PDF" with a padlock ("Requires Subscription").
10. Press the "Full Issue" "PDF".
11. Press "Send notification of payment".
12. Open the issue again and press "PDF" under "Signalling Theory
    Dividends".

**Expected.** Step 10 leads to the "Subscriptions" page, as step 12
does. The journal does not sell single issues, so there is no issue fee
to pay.

**Observed.** Step 10 answers 200 and shows "Manual Fee Payment", with
one table row, "Title" "Purchase Issue Fee", and no "Fee" row. Below
that are "Pay by bank transfer." and "Send notification of payment".
Step 11 shows "Payment Notification", "Payment notification sent", and
mails the journal contact (`rvaca`):

```
Subject: Manual Payment Notification
A manual payment needs to be processed for the journal Journal of Public
Knowledge and the user "ccorino". The item being paid for is "Purchase
Issue Fee". The cost is 0 (USD).
```

Step 12 lands on "Subscriptions". No request failed, and the server
log has no error.

## Cause

`IssueHandler::userCanViewGalley()` enters its purchase branch when
issue purchases or memberships are on:
`if ($paymentManager->purchaseIssueEnabled() || $paymentManager->membershipEnabled())`
([line 285](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/issue/IssueHandler.php#L285)).
A signed-in reader who has neither bought the issue nor holds a current
membership reaches the `else` on
[lines 301–309](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/issue/IssueHandler.php#L301-L309).
It queues a `PAYMENT_TYPE_PURCHASE_ISSUE` payment of
`purchaseIssueFee` and displays the payment form, without checking
that issue purchases are on. With only the membership fee set, that fee
is empty, so the payment is queued with amount 0.
`ManualPaymentPlugin::getPaymentForm()` sets `itemAmount` to null when
the amount is not above 0, and `plugins/paymethod/manual/templates/paymentForm.tpl`
leaves the "Fee" row out under `{if $itemAmount}`. That is why the page
shows no amount.

The article side had the same `else` until 2017.
[5918b34b09](https://github.com/pkp/ojs/commit/5918b34b0939893335a7e87dc8551f82bc6494f7)
(`pkp/pkp-lib#2962`, "Check article purchases before queueing payment")
changed `ArticleHandler::userCanViewGalley()` to
`} elseif ($paymentManager->purchaseArticleEnabled()) {`
([line 675 today](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/article/ArticleHandler.php#L675)).
A reader who is not a member then falls through to the "Subscriptions"
redirect. The issue side was not changed. It has queued the issue fee
unconditionally since issue purchases were added in a161d6c72b.

Where else the fault shows, and how each was checked:

- "Full Issue" galleys of any format, for signed-in readers: walked
  with PDF.
- A journal using PayPal instead of manual payment: read in the code.
  `PaypalPaymentForm::display()` asks PayPal for a purchase of "0.00".
  If PayPal refuses it, the reader sees "A transaction error occurred.
  Please contact the journal manager for details."; if PayPal accepts
  it, the reader gets a PayPal checkout for 0.00. Which of the two
  PayPal does was not checked.
- The staff side of the notice: read in the code. The press stores a
  queued payment of amount 0 (one `queued_payments` row, seen in the
  walk), and every press adds another. No screen lists queued payments
  (Payments › "Payments" lists completed ones), and no screen marks a
  manual payment as paid. Staff can only answer the email, or give the
  reader a subscription by hand.
- A signed-out visitor goes through the same branch: read in the code.
  Login shows "Subscription or issue purchase required to access item.
  …", and after signing in the visitor gets the same payment page. The
  fix sends that visitor to "Subscriptions" after signing in, but leaves
  the Login message offering an issue purchase. The article side's
  message does the same when only a membership fee is set.
- Article galleys: guarded since 2017. Walked: the "Subscriptions"
  page.
- The other places that queue a payment do not use an unset journal
  fee: the author's publication fee is queued only after
  `publicationEnabled()`, and a subscription payment takes its amount
  from the subscription type. `UserHandler::payMembership()` queues the
  membership fee without checking `membershipEnabled()`, but no screen
  links to it, so no user reaches it today. Read in the code, and left
  out of this fix.
- OMP and OPS have no reader fees.

## Proposed fix

A proposal; the team decides. Queue the issue payment only when issue
purchases are on, as the article side does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-fee-of-no-amount/fix.diff)):

```diff
--- a/pages/issue/IssueHandler.php
+++ b/pages/issue/IssueHandler.php
@@ -298,7 +298,7 @@
                         $dateEndMembership = $user->getData('dateEndMembership', 0);
                         if ($completedPaymentDao->hasPaidPurchaseIssue($userId, $issue->getId()) || (!is_null($dateEndMembership) && $dateEndMembership > time())) {
                             return true;
-                        } else {
+                        } elseif ($paymentManager->purchaseIssueEnabled()) {
                             // Otherwise queue an issue purchase payment and display payment form
                             $queuedPayment = $paymentManager->createQueuedPayment($request, OJSPaymentManager::PAYMENT_TYPE_PURCHASE_ISSUE, $userId, $issue->getId(), $journal->getData('purchaseIssueFee'));
                             $paymentManager->queuePayment($queuedPayment);
```

The outer condition stays as it is: a paid-up member must still get in,
and that check is inside the branch.

Tried on `main`: with the fix in, step 10 lands on "Subscriptions", no
payment is queued, and step 12 is unchanged. A journal that does sell
issues is unaffected: with "Purchase Issue" also set to 20, step 10
shows "Manual Fee Payment" with "Purchase Issue Fee" and "20.00 (USD)",
with the fix in and out.

**Alternatives**

- Hide the payment page when the amount is 0: that guard would sit in
  every payment plugin rather than in the one place that decides what
  is for sale, and the reader would still not reach "Subscriptions".
- Retire the membership fee, as `pkp/pkp-lib#4701` discussed, since
  OJS 3 has no screen for buying a membership: a product decision, and
  larger. The one-line fix is right either way.

**What goes with it**

- No REST API, plugin hook or template is involved. Zero-amount issue
  payments already queued stay as they are; no repair is proposed.
- The fix proposed in `jardakotesovec/pkp-e2e#51`
  (https://github.com/jardakotesovec/pkp-e2e/issues/51, "With "Only
  Restrict Access to PDF…" ticked and no reader fee, HTML galleys show
  no padlock but refuse readers") changes the lines just above this one
  in `IssueHandler::userCanViewGalley()`. The two patches touch
  neighbouring lines and apply together, in either order (checked with
  `patch` on `main`).
- Backport: the same `else` is on 3.5 (line 299), 3.4 (line 290) and
  3.3 (`IssueHandler.inc.php` line 246). The diff applies as written on
  3.5 and 3.4. 3.3 needs the same one-line change in its own file.
- Test: an e2e scenario in spec U51 in which, with only "Association
  Membership" set, a signed-in reader pressing a restricted "Full
  Issue" lands on "Subscriptions".

Small: one line in one method, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-fee-of-no-amount/walk.js),
  steps 1–12, run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/full-issue-fee-of-no-amount/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour`
  also sets "Purchase Issue" to 20 in step 4.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/full-issue-fee-of-no-amount/fix.diff ojs`,
  the script with and without `neighbour`, then `node bin/try-fix.js revert ojs`;
  `neighbour` walked again without the fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–12 on `main` and on `stable-3_5_0`,
  with the same result (3.5 mails "The cost is 0 (USD)" too). MySQL
  not driven; nothing here depends on the database.
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
- Code reads: on 3.5, 3.4 and 3.3, the issue branch of
  `userCanViewGalley()` at the lines the Backport bullet gives, with
  the same unconditional `else`, and `ArticleHandler`'s `elseif
  ($paymentManager->purchaseArticleEnabled())` (3.5 line 598, 3.4 line
  587, 3.3 `.inc.php` line 523). On `main`, for the PayPal and staff
  bullets: `plugins/paymethod/paypal/PaypalPaymentForm.php` `display()`,
  `controllers/grid/subscriptions/PaymentsGridHandler.php` `loadData()`
  (completed payments only), and the callers of `QueuedPaymentDAO`.
- Introduced: `git blame` on the `else` points to 665ed1f925 (the
  PSR-12 reformat, `pkp/pkp-lib#5678`); blame at its parent points to
  a161d6c72b ("*4169* Issue galleys and purchase issue", committed as
  michael-pkp, GitHub mfelczak; no PR). 5918b34b09 is by Alec Smecher
  (asmecher), 2017-11-08, with no PR.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words (membership fee, purchase issue, issue purchase, full
  issue payment, manual payment) and by `userCanViewGalley`,
  `membershipEnabled` and `purchaseIssueEnabled`. `pkp/pkp-lib#4701` (closed, not planned) notes that OJS 3 offers no
  way to buy a membership. `pkp/pkp-lib#11121` (open) is a server
  error on "Send notification of payment" on 3.4 and 3.5, which today's
  code no longer shows here. None of them is this fault.
- Not driven: the signed-out visitor's path, a reader with a current
  membership, and the PayPal method (no PayPal account or outside
  network here). Unverified: what PayPal answers to a purchase of 0.00.
