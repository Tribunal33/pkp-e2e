# Locked galleys keep showing an article or issue price after the journal switches payments off

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1591` for `pkp/pkp-lib#1816` · [89680ebc51](https://github.com/pkp/ojs/commit/89680ebc511b20da10de17d90dda76dd75a2541f) · 2017-10-16 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

With a "Purchase Article" or "Purchase Issue" fee set and payments then
switched off, the locked links still show the fee, such as "(USD 5)"
or "(USD 20)", but nothing can be bought: a signed-in reader who
presses one lands on the journal's home page, as on any subscription
journal with payments off, fee or none.

The price shows on the article page and beside each article in the
issue's table of contents. The "Full Issue" links show it too, both on
the issue page and on the journal's home page. With payments off a
reader cannot pay for anything on the site: buying a subscription
online closes as well.

It needs a subscription journal that set an article or issue fee while
payments were on, then unticked "Payments will be enabled for this
journal…". The fee amounts stay stored. The "Payments" page that holds
them leaves the side menu when payments are switched off.

## Impact

- **Lost:** nothing is bought or charged, and only readers without a
  subscription are kept out, as they should be. The price is the fault.
- **Who:** every visitor and reader without a subscription, on each
  locked galley link, on a subscription journal that has switched
  payments off with a fee amount still stored.
- **Way round:** a Journal Manager switches payments back on, empties
  "Purchase Article" and "Purchase Issue" under "Payment Types", and
  switches payments off again. Nothing on screen suggests it.

Low: a misleading label on a narrow setup, with no money or access at
stake.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`: journal
`publicknowledge` and its published current issue "Vol. 1 No. 2 (2014)"
(open access, no "Full Issue" galleys), which holds submission 1, "The
Signalling Theory Dividends", and submission 17, each with a "PDF"
galley. The steps make the journal sell articles and issues, then switch
payments off, and add a "Full Issue" galley, which the dataset lacks.

Setting up, as `dbarnes` (Journal editor, with manager rights):

1. Sign in as `dbarnes`.
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
3. On the same page, the "Payments" tab: tick "Payments will be enabled
   for this journal. Note that users will be required to log in to make
   payments.", choose "Currency" "US Dollar" and "Payment Plugins"
   "Manual Fee Payment", type "Pay by bank transfer." in "Manual Payment
   Instructions" and press "Save".
4. "Payments" in the side menu › "Payment Types": type 20 in "Purchase
   Issue" and 5 in "Purchase Article" and press "Save".
5. Settings › Distribution › "Payments": untick "Payments will be
   enabled for this journal…" and press "Save". "Payments" leaves the
   side menu.
6. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   set "Access status" to "Subscription" and press "Save".
7. Open the same issue again › "Issue Galleys" › "Create Issue Galley":
   type "PDF" as the "Galley Label", upload any PDF file and press
   "Save".
8. Sign out.

Signed out:

9. Open the journal's home page. It shows the current issue, "Vol. 1
   No. 2 (2014)": read the "PDF" under "Full Issue" and under each
   article.
10. Press the title "The Signalling Theory Dividends" and read its "PDF".
11. Press "PDF".

Signed in without a subscription:

12. Sign in as `ccorino` (an author and reader of the journal).
13. Archives › "Vol. 1 No. 2 (2014)": press the "PDF" under "The
    Signalling Theory Dividends".
14. Back on the issue, press the "PDF" under "Full Issue".

**Expected:** payments are off, so nothing is for sale. Every link read
on the home page (step 9), the article page (step 10) and the issue page
(step 13, before pressing) shows the padlock and "PDF" with no price, as
on a journal that never set a fee. Step 11 leads to the Login page.
Where steps 13 and 14 land is not this report's matter (Cause).

**Observed:** every locked link carries the fee beside its label. On
the home page and the issue page, the "Full Issue" link reads "PDF (USD
20)" and each article's reads "PDF (USD 5)". The article page's reads
"PDF (USD 5)" too. A screen reader hears "Requires Subscription PDF
(USD 5)". Step 11 leads to the Login page:

```
Subscription required to access item. To verify subscription, log in to journal.
```

For steps 13 and 14 the server sends the reader to
`/index.php/publicknowledge/en/about/subscriptions`, and that page sends
them on to the journal's home page while payments are off. The reader
lands there with no message, and no payment is queued.

Control: with step 5 left out (payments stay on), the same links show
the same prices, and steps 13 and 14 open the "Manual Fee Payment" page
for a "Purchase Article Fee" of "5.00 (USD)" and a "Purchase Issue Fee"
of "20.00 (USD)".

## Cause

Whether a fee is on sale is decided in one place:
`OJSPaymentManager::purchaseArticleEnabled()` and
`purchaseIssueEnabled()` (`classes/payment/ojs/OJSPaymentManager.php`
lines 176–189). Each is true only when `isConfigured()` holds (payments
enabled and the payment method configured, lines 59–62 and pkp-lib
`PaymentManager::isConfigured()`) and the fee is above zero. The
purchase itself follows that rule: `ArticleHandler::userCanViewGalley()`
and `IssueHandler::userCanViewGalley()` offer the payment page only
under those methods, with one exception: `IssueHandler::userCanViewGalley()`
(line 285) also enters its payment branch on `membershipEnabled()` and
then queues an issue purchase whatever the issue fee (line 303). That
is the filed report
["With only a membership fee set, a reader pressing "Full Issue" is asked to pay an issue fee of no amount"](https://github.com/jardakotesovec/pkp-e2e/issues/55).

The price on the link ignores it. `templates/frontend/objects/galley_link.tpl`
(lines 79–83) prints `reader.purchasePrice` "({$currency} {$price})"
whenever the galley is restricted and a `purchaseFee` and a
`purchaseCurrency` are passed. It is included four times. The fourth,
`article_details.tpl` line 362 for supplementary files, passes no fee.
The other three pass the journal's stored settings as they are:

- `article_details.tpl` line 336: `purchaseArticleFee` on the article
  page;
- `article_summary.tpl` line 100: `purchaseArticleFee` beside each
  article in a table of contents;
- `issue_toc.tpl` line 119: `purchaseIssueFee` on the "Full Issue"
  links.

Saving the "Payments" tab with "Enable" unticked stores
`paymentsEnabled` false and leaves `currency`, `purchaseArticleFee` and
`purchaseIssueFee` as they were, so the price keeps showing. The
handlers already turn `purchaseArticleEnabled()` into a template flag,
`purchaseArticleEnabled` (`ArticleHandler::view()` lines 407–409,
`IssueHandler::setupIssueTemplate()` lines 455–457). `galley_link.tpl`
reads that flag, but only to choose the screen-reader words ("Requires
Subscription or Fee"), not the price. No flag exists for the issue fee.

The price came with
[89680ebc51](https://github.com/pkp/ojs/commit/89680ebc511b20da10de17d90dda76dd75a2541f)
(2017), which marked restricted galleys in the default theme and added
the fee beside them.

Where a signed-in reader lands (steps 13 and 14) does not depend on the
fee. With payments off, `purchaseArticleEnabled()`,
`purchaseIssueEnabled()` and `membershipEnabled()` are all false, so
both `userCanViewGalley()` methods skip the payment branch and redirect
to `about/subscriptions`. `AboutHandler::subscriptions()` (lines 41–44)
sends every visitor home while payments are off. That happens on any
subscription journal without payments, fee or none. Whether a locked
galley should lead there is the open product question in spec U51
[A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a5).
The closed "Subscriptions" page is the filed report
["On a subscription journal without payments set up, "Learn More" and "View Available Subscription Types" lead readers home"](https://github.com/jardakotesovec/pkp-e2e/issues/50).
The fix below changes only the label, and the presses land where they
did.

Reach:

- The article page, the tables of contents on the issue page and on the
  home page, and the "Full Issue" links on both (walked).
- A journal with payments on whose payment method is incomplete ("Manual
  Fee Payment" without instructions, "Paypal Fee Payment" without an
  account name): `isConfigured()` is false there too, so the price shows
  and nothing can be bought (read in the code, not walked).
- The `issueToc` email variable shows the issue's table of contents,
  built from `issue_toc.tpl`, and so shows the price too (read in the
  code, not walked).
- The home page's "latest articles" list (`latest_article.tpl`, new on
  `main`) goes through `article_summary.tpl` too (read in the code).

## Proposed fix

A proposal; the team decides. Show the price only while that purchase
is enabled, by the flags the handlers already set: `galley_link.tpl`
takes `purchaseArticleEnabled` for an article galley and a new
`purchaseIssueEnabled` for an issue galley, and
`IssueHandler::setupIssueTemplate()` sets the new flag beside the
article one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-shown-while-payments-off/fix.diff)):

```diff
--- a/pages/issue/IssueHandler.php
+++ b/pages/issue/IssueHandler.php
         if ($paymentManager->purchaseArticleEnabled()) {
             $templateMgr->assign('purchaseArticleEnabled', true);
         }
+        if ($paymentManager->purchaseIssueEnabled()) {
+            $templateMgr->assign('purchaseIssueEnabled', true);
+        }
--- a/templates/frontend/objects/galley_link.tpl
+++ b/templates/frontend/objects/galley_link.tpl
 {if $parent instanceOf APP\issue\Issue}
 	{assign var="page" value="issue"}
+	{assign var="purchaseEnabled" value=$purchaseIssueEnabled}
 …
 	{assign var="page" value="article"}
+	{assign var="purchaseEnabled" value=$purchaseArticleEnabled}
 …
-	{if $restricted && $purchaseFee && $purchaseCurrency}
+	{if $restricted && $purchaseEnabled && $purchaseFee && $purchaseCurrency}
```

The check sits in the shared link template rather than in its three
callers that pass a fee. So a theme that includes the default `galley_link.tpl` and
passes the fee itself is covered too. The article page needs no change:
`ArticleHandler::view()` already sets `purchaseArticleEnabled`, and it
shows no issue galleys.

Tried on `main`: with payments off (the Steps), every link read "PDF"
with no price, and the presses went where they did before. With payments
on (the Control), the prices still showed and both presses opened the
payment page, as without the fix.

**Alternatives:**

- Pass the fee from the three callers only while the flag is set: three
  places instead of one.
- Test `$currentJournal->getData('paymentsEnabled')` in the templates.
  That covers only half the rule: an incomplete payment method would
  still show a price that cannot be paid.

**What goes with it:**

- No stored data changes, and no API or hook is involved. Themes that
  override `galley_link.tpl` itself keep their own behaviour.
- Companion fix: with a membership fee set and payments on, the "Full
  Issue" link loses its price under this fix but still opens a payment
  page for an issue fee. The fix for that is in
  ["With only a membership fee set, a reader pressing "Full Issue" is asked to pay an issue fee of no amount"](https://github.com/jardakotesovec/pkp-e2e/issues/55);
  the two should land together.
- The emailed table of contents: `IssueEmailVariable::getIssueToc()`
  calls `setupIssueTemplate(…, false)`, which returns at its
  `!$withSubscriptionDetails` block before the flags are set. So with
  the fix the email never shows a price, even with payments on. If the
  team wants the price kept there, set the two purchase flags before
  that return.
- The home page's "latest articles" list: `IndexHandler::index()`, in
  its `RECENT_PUBLISHED` branch, does not call `setupIssueTemplate()`.
  Unless the current issue is also on the home page, no flag is set
  there, and with the fix the list shows no price even with payments
  on. Setting `purchaseArticleEnabled` in that branch keeps it (the
  list shows no issue galleys).
- The screen-reader words: `galley_link.tpl` line 69 chooses "Requires
  Subscription or Fee" on `$purchaseArticleEnabled` for issue galleys
  too. It should test the new `$purchaseEnabled`, so that each link's
  words follow its own fee. That is left out of the tried diff, as it
  changes what a screen reader hears on "Full Issue" links.
- Backport: the diff applies as it stands to `stable-3_5_0`. On 3.4 the
  template tests `instanceOf \APP\issue\Issue`, so the hunk that sets
  the flag per galley type needs that line as context; the other hunks
  apply. On 3.3 the handler is `IssueHandler.inc.php`
  (`_setupIssueTemplate()`) and the template tests `instanceOf Issue`.
- Guard: an e2e scenario in the Subscriptions spec, a fee set and
  payments switched off, the link reads without a price. The templates
  have no unit tests.

Small: a few lines in one handler and one template, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-shown-while-payments-off/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/fee-shown-while-payments-off/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` is
  the Control: the Steps without step 5.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/fee-shown-while-payments-off/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`. The Control was also walked without
  the fix, with the same result.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–14 on `main` and on `stable-3_5_0`, which
  matched. No request failed and no page script failed.
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
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads (OJS files; pkp-lib only for `PaymentManager::isConfigured()`):
  - 3.5: `galley_link.tpl` lines 79–83, `article_details.tpl` line 300,
    `article_summary.tpl` line 101, `issue_toc.tpl` line 119,
    `IssueHandler.php` line 455, the same as `main`.
  - 3.4: `galley_link.tpl` lines 79–81, `article_details.tpl` line 290,
    `article_summary.tpl` line 99, `issue_toc.tpl` line 119;
    `OJSPaymentManager.php` lines 61 and 178–188 and `IssueHandler.php`
    lines 428–431 decide purchases as on `main`.
  - 3.3: `galley_link.tpl` lines 76–78, `article_details.tpl` line 270,
    `article_summary.tpl` line 92, `issue_toc.tpl` line 103;
    `OJSPaymentManager.inc.php` lines 37 and 139–147 and
    `IssueHandler.inc.php` lines 385–388 the same.
- Introduced: `git blame` on `galley_link.tpl` lines 79–83 gives
  89680ebc51 ("pkp/pkp-lib#1816 Display article and issue galley access
  in default theme"), which added the price and the three callers'
  `purchaseFee` arguments in one change, merged as `pkp/ojs#1591`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  "purchase fee payments disabled", "galley price payments", "purchase
  article fee shown", "subscription price payments off", `purchaseFee`,
  `purchaseArticleFee`, `purchase_cost` and `purchaseArticleEnabled`.
  `pkp/pkp-lib#1220` (closed, 2016) is about a lock shown on an open
  access issue, not this fault.
- Not checked: third-party themes (none in the checkout).
- Unverified: the way round in Impact was read in the code (no fee
  set, no `purchaseFee`, no price), not walked.
