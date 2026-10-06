# A reader pressing a locked "Full Issue" is asked to pay an issue fee of no amount when only a membership fee is set

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no PR (pkp bug 4169) · [a161d6c72b](https://github.com/pkp/ojs/commit/a161d6c72b4cb0ecfe2ce836a737f48b4bdaf590) · 2010-12-30 · michael-pkp (commit author)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a subscription journal with an "Association Membership" fee and no
"Purchase Issue" fee, a signed-in reader without a subscription or
membership who presses a locked "Full Issue" galley gets the payment
method's page for a "Purchase Issue Fee" with no amount (with the
manual method: its payment instructions and "Send notification of
payment"). An article galley in the same case leads to the
"Subscriptions" page.

The reader is invited to pay for something the journal does not sell,
and "Send notification of payment" tells the journal's contact that a
"Purchase Issue Fee" costing 0 is to be processed.

## Impact

- **Lost:** the reader is sent to a payment for an issue fee that does
  not exist instead of the "Subscriptions" page. Each time a reader
  presses the galley, a pending payment of 0 is stored in the
  `queued_payments` table (no screen lists it). The journal's contact
  gets an email only when the reader presses "Send notification of
  payment".
- **Who:** signed-in readers without a subscription or membership, on a
  journal with payments enabled, an "Association Membership" fee and no
  "Purchase Issue" fee, every time they press a "Full Issue" galley.
- **Way round:** the reader can reach "Subscriptions" by pressing an
  article's galley; the journal can avoid it by setting an issue fee.

Low: nothing is granted, charged or lost, only a wrong page and a
pointless email. It would be medium if a reader had no other way to
the "Subscriptions" page.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`. Set up through
the screens, signed in as `dbarnes`:

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
2. Settings › Distribution › "Payments": tick "Enable", Currency "US
   Dollar", Payment Plugins "Manual Fee Payment", type any "Manual
   Payment Instructions", "Save".
3. "Payments" in the side menu › "Payment Types": "Association
   Membership" `7`, "Purchase Issue" and "Purchase Article" empty,
   "Save".
4. Issues › "Back Issues" › the arrow beside "Vol. 1 No. 2 (2014)" ›
   "Edit" › "Access": Access Status "Subscription", "Save".
5. Open the same issue's "Edit" again › "Issue Galleys" › "Create Issue
   Galley": label "PDF", upload any PDF file, "Save".

Steps:

1. Sign in as `ccorino` (a Reader with no subscription).
2. Open "Archives" › "Vol. 1 No. 2 (2014)" and press "PDF" under "Full
   Issue".
3. Press "Send notification of payment".
4. Back on the issue, press "PDF" under "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms…" (control).

**Expected.** As for the article in step 4, the "Subscriptions" page:
no issue fee is set, so there is nothing to buy for this issue.

**Observed.** Step 2 shows the "Manual Fee Payment" page:

```
Manual Fee Payment
Title   Purchase Issue Fee
<the manual payment instructions>
Send notification of payment
```

with no "Fee" line, and the `queued_payments` table now holds a
"Purchase Issue" payment of amount 0 for `ccorino`. Step 3 shows "Payment notification
sent", and the journal's contact (`rvaca@mailinator.com`) receives
"Manual Payment Notification":

```
A manual payment needs to be processed for the journal Journal of Public Knowledge and the user "ccorino". The item being paid for is "Purchase Issue Fee". The cost is 0 (USD).
```

Step 4 leads to the "Subscriptions" page. No request fails.

Control: with "Purchase Issue" `20` saved beside the membership fee,
step 2 shows the same page with "Fee 20.00 (USD)", which is right.

## Cause

[`IssueHandler::userCanViewGalley()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/issue/IssueHandler.php#L285-L310)
enters its purchase branch on
`$paymentManager->purchaseIssueEnabled() || $paymentManager->membershipEnabled()`.
For a signed-in reader who has neither bought the issue nor a current
membership, its `else` always queues a `PAYMENT_TYPE_PURCHASE_ISSUE`
payment of `$journal->getData('purchaseIssueFee')` and shows the payment
form. With only a membership fee set, that fee is empty, so the payment
is queued for 0 and the page has no amount. The rule it breaks: an issue
purchase is offered only while an issue fee is set
(`purchaseIssueEnabled()`), which is how the article handler's issue
purchase check reads it
([L645](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/article/ArticleHandler.php#L645)).

The article side had the same `else` and was fixed in 2017:
[5918b34b09](https://github.com/pkp/ojs/commit/5918b34b0939893335a7e87dc8551f82bc6494f7)
("Check article purchases before queueing payment", for
`pkp/pkp-lib#2962` "Fix membership options") turned it into
`elseif ($paymentManager->purchaseArticleEnabled())`, so
[`ArticleHandler::userCanViewGalley()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/article/ArticleHandler.php#L670-L682)
falls through to the "Subscriptions" page. The issue handler, written
in [a161d6c72b](https://github.com/pkp/ojs/commit/a161d6c72b4cb0ecfe2ce836a737f48b4bdaf590)
(2010) after the article's shape, did not get the same change.

Reach:

- Every payment method gets the same queued payment of 0; only the
  manual method was driven.
- Stored data: one queued payment of 0 each time a reader presses the
  galley (read in the database after the walk). A queued payment grants
  nothing, so nothing needs repair.
- Left out: a signed-out visitor in the same setup is sent to the Login
  page with "Subscription or issue purchase required…". The same
  `|| membershipEnabled()` condition picks that message, so it offers
  an issue purchase that does not exist; the article side words it the
  same way for articles. That wording is not changed here.

## Proposed fix

Proposal: give the issue handler the article handler's guard, so a
reader is sent to the payment page only while an issue fee is set and
otherwise falls through to the "Subscriptions" page
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/fix.diff)):

```diff
                         if ($completedPaymentDao->hasPaidPurchaseIssue($userId, $issue->getId()) || (!is_null($dateEndMembership) && $dateEndMembership > time())) {
                             return true;
-                        } else {
+                        } elseif ($paymentManager->purchaseIssueEnabled()) {
                             // Otherwise queue an issue purchase payment and display payment form
```

It follows the 2017 article fix line for line and keeps what the branch
is for: a paid issue or a current membership still opens the galley.
Tried on `main`: with the fix, step 2 leads to the "Subscriptions"
page and no payment is queued, while with an issue fee of 20 the page
still asks for "20.00 (USD)" and a signed-out visitor still gets the
Login page.

**Alternatives:**

- Split the branch condition (`purchaseIssueEnabled()` alone for the
  purchase, membership checked apart). Cleaner to read, but it moves
  more lines than the fault needs.
- Point the "Full Issue" links elsewhere in
  `templates/frontend/objects/issue_toc.tpl` when no issue fee is set.
  It leaves the handler queueing payments of 0 for anyone who opens the
  galley's address.

**What goes with it:**

- Applies as written to 3.5; 3.4 and 3.3 have the same `else`.
- The fix proposed in
  [A journal restricting only PDFs shows its HTML galleys unlocked, then refuses them to readers without a subscription](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A14-non-pdf-galley-shown-open-refused.md)
  touches the lines just above in the same method; the two diffs apply
  one after the other cleanly.
- The guard: a U51 scenario with only a membership fee, a reader
  pressing a "Full Issue" galley and landing on "Subscriptions".

Small: a one-line change copied from a fix pkp already made, with a
short scenario to guard it.

## Evidence

- Scripts: [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/walk.js) (the steps) and [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/neighbour.js) (an issue fee of 20 beside the membership fee; same result with the fix in and out), each after `npm run fleet-prep -- --feature issues-sb4 --dataset 4 --reset`: `PROBE_FEATURE=issues-sb4 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0` in front).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/full-issue-asks-fee-of-no-amount/fix.diff ojs`, both scripts again, then `revert`.
- Tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0`
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  (lib/pkp 3bb4450bea); `stable-3_4_0`
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315);
  `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b).
  Dataset pkp/datasets c657990 (2026-10-01), PostgreSQL; nothing here
  depends on the database.
- Code reads: `IssueHandler::userCanViewGalley()` and
  `ArticleHandler::userCanViewGalley()` on each line;
  `OJSPaymentManager::purchaseIssueEnabled()` and `membershipEnabled()`;
  the manual method's `paymentForm.tpl` (the "Fee" row only when an
  amount is set) and its `notify` handler. 3.4
  (`pages/issue/IssueHandler.php` L274–L292) and 3.3
  (`pages/issue/IssueHandler.inc.php` L232–L248).
- Introduced: `git log -S membershipEnabled()` on the issue handler; the
  blamed lines sit in the PSR-12 reformat 665ed1f925 (2021), and before
  it in a161d6c72b, "*4169* Issue galleys and purchase issue" (pkp's
  old bug tracker, no pull request). The article side's fix found with
  `git log -G 'elseif ?\(\$paymentManager->purchaseArticleEnabled'`;
  `pkp/ojs` lists no pull request for 5918b34b09.
- Upstream (searched 2026-10-01): `pkp/pkp-lib#11121` (open) is a
  server error on "Send notification of payment" on 3.4 and 3.5 with a
  fee set, which the walks here did not meet; `pkp/pkp-lib#4701`
  (closed) is about buying a membership. Neither is this fault.
- Not checked: what PayPal shows for a payment of 0 (it needs the
  outside service).
- Unverified: a reader with a current membership could not be made on
  the test install (no payment completes there); that path is read in
  the code only.
