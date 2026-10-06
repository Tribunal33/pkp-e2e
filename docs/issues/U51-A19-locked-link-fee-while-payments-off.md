# A journal with payments turned off still shows readers a price on its locked galley links

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
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal that requires subscriptions sets "Purchase Article" and
"Purchase Issue" fees while payments are on, then turns payments off.
Its locked galley links keep showing the price: "PDF (USD 5)" on each
article and "PDF (USD 20)" on the "Full Issue", on the issue's page and
on each article's page.

Nothing can be bought. A signed-in reader who presses the link lands on
the journal's home page with no message. A visitor who presses it is
sent to the Login page, whose message asks for a subscription and says
nothing of a purchase.

The manager can remove the price by opening the "Payments" page by its
address, which still works with payments off, and emptying the fees.

## Impact

- **Lost**: nothing stored, and nobody is charged.
- **Who**: every reader of a subscription journal that saved reader
  fees and later turned payments off, on the issue's page, the current
  issue on the home page and each article's page.
- **Way round**: the manager opens `<journal>/payments` by its address
  (the side menu hides it while payments are off), empties both fees on
  its "Payment Types" tab and presses "Save".

Low: the price promises a sale that cannot happen, but no reader loses
access or money.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, `publicknowledge`. Its
  journal is open access, its issue "Vol. 1 No. 2 (2014)" is published
  with "The Signalling Theory Dividends" and "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms…", each with a "PDF", and
  payments are off.

As `dbarnes`:

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
2. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   choose "Subscription" under "Access Status" and press "Save".
3. In the same window, "Issue Galleys" › "Create Issue Galley": label
   "PDF", upload a PDF, "Save".
4. Settings › Distribution › "Payments": tick "Enable", choose "US
   Dollar" and "Manual Fee Payment", type "Pay by cheque" in "Manual
   Payment Instructions", "Save".
5. Open "Payments" in the side menu (the page is headed
   "Subscriptions"), tab "Payment Types": type 5 in "Purchase Article"
   and 20 in "Purchase Issue", "Save".
6. Settings › Distribution › "Payments": untick "Enable", "Save".

As a visitor, then as a reader:

7. Sign out. Open "Archives", then "Vol. 1 No. 2 (2014)". Read the
   articles' "PDF" links and the "Full Issue" "PDF".
8. Open "The Signalling Theory Dividends" and read its "PDF" link.
9. Back on the issue's page, press "The Signalling Theory Dividends"'s
   "PDF".
10. Sign in as `ccorino` (a Reader with no subscription). On the
    issue's page press "The Signalling Theory Dividends"'s "PDF", then
    the "Full Issue" "PDF".

**Expected.** With payments off, the locked links read "PDF" with the
padlock and no price, as before a fee was ever saved.

**Observed.** On the issue's page (step 7) every link shows the padlock
and a price:

```
Full Issue:                        PDF (USD 20)
The Signalling Theory Dividends:   PDF (USD 5)
Antimicrobial, heavy metal …:      PDF (USD 5)
```

A screen reader hears "Requires Subscription" before each. The
article's own page (step 8) shows "PDF (USD 5)". At step 9 the visitor
is sent to the Login page
(`login?…&loginMessage=reader.subscriptionRequiredLoginText`). At step
10 both presses redirect `ccorino` to `about/subscriptions`, which,
with payments off, redirects to the journal's home page.

Controls:

- With "Enable" ticked again at step 4's screen, the same links show
  the same prices with the screen-reader text "Requires Subscription or
  Fee". `ccorino`'s press opens "Manual Fee Payment" with "Purchase
  Article Fee" and "5.00 (USD)" (for the "Full Issue": "Purchase Issue
  Fee", "20.00 (USD)").
- With payments off again, `dbarnes` opens
  `/index.php/publicknowledge/en/payments` by its address: the
  "Subscriptions" page opens. On "Payment Types" he empties both fees
  and presses "Save". The links then read "PDF" with no price.

## Cause

`templates/frontend/objects/galley_link.tpl` prints the price whenever
it is given one (line 79):

```smarty
{if $restricted && $purchaseFee && $purchaseCurrency}
```

Its three callers pass the journal's saved fee without asking whether
it can be paid: `article_details.tpl` line 336 and `article_summary.tpl`
line 100 pass `$currentJournal->getData('purchaseArticleFee')`, and
`issue_toc.tpl` line 119 passes `purchaseIssueFee`. Whether the fee can
be paid is `OJSPaymentManager::purchaseArticleEnabled()` /
`purchaseIssueEnabled()`: payments enabled, the payment method
configured and the fee above zero. With payments off, the two
`userCanViewGalley()` methods skip their purchase branch (entered on
`purchase…Enabled() || membershipEnabled()`) and send the reader to
`about/subscriptions` or to the Login page.

89680ebc51 added the price this way. The handlers already passed
`purchaseArticleEnabled`, which the same template uses for the
screen-reader text, so that text follows the payment state and the
price does not.

Reach:

- The article page and the issue page (seen in the browser) and the
  current issue on the home page (`IndexHandler` calls
  `IssueHandler::setupIssueTemplate()`; read in the code).
- The "Full Issue" link's screen-reader text follows
  `purchaseArticleEnabled` too: with only "Purchase Issue" set it says
  "Requires Subscription", with only "Purchase Article" set "Requires
  Subscription or Fee" (code).
- The table of contents in the "issue published" email
  (`IssueEmailVariable::getIssueToc()`) renders the same template with
  the same fee (code).
- A saved fee with payments on but the method not configured (manual
  payments with empty instructions) shows the price too, since
  `isConfigured()` is false then (code).

## Proposed fix

Show the price only while that purchase can be made, using the payment
manager's `purchaseArticleEnabled()` / `purchaseIssueEnabled()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/locked-link-fee-while-payments-off/fix.diff)):

- `pages/issue/IssueHandler.php`, `setupIssueTemplate()`: assign
  `purchaseArticleEnabled` and a new `purchaseIssueEnabled`, before the
  `if (!$withSubscriptionDetails) { … return; }` branch the email
  takes, instead of `purchaseArticleEnabled` alone at the end.
- `templates/frontend/objects/galley_link.tpl`: pick the flag for the
  link's kind and require it for the price and the "or Fee" text:

```smarty
{if $parent instanceOf APP\issue\Issue}
	{assign var="purchaseEnabled" value=$purchaseIssueEnabled}
{else}
	{assign var="purchaseEnabled" value=$purchaseArticleEnabled}
{/if}
…
			{if $purchaseEnabled}
				{translate key="reader.subscriptionOrFeeAccess"}
…
	{if $restricted && $purchaseEnabled && $purchaseFee && $purchaseCurrency}
```

The check sits in the one template every caller shares, so the article
page, the table of contents and the email follow it. Membership is left
out on purpose: a membership fee opens galleys but is not a price for
this link. Tried on `main`: with payments off the links read "PDF" with
the padlock and no price; with payments on again the prices, the "or
Fee" text and the "Manual Fee Payment" page are unchanged.

**Alternatives**

- Guard each of the three `include`s instead: three places, and themes
  that copy them keep the fault.
- Clear the fees when payments are turned off: loses the manager's
  settings for the next time payments are turned on.

**What goes with it**

- No data repair: the saved fees are right; only their display was not.
- A third-party theme that ships its own `galley_link.tpl` keeps the
  fault until it adds the same condition (not checked).
- A list that includes `galley_link.tpl` with no handler assigning the
  flags shows no price after the fix. In OJS that is "Latest
  Publications" on `main` when the home page shows no table of
  contents (code).
- Backport: on 3.5, 3.4 and 3.3 the method is `_setupIssueTemplate()`.
  On 3.5 `fix.diff` applies only with reduced context (`-C1`), since
  its assign array holds an extra `'authorUserGroups'` line. 3.4 and 3.3
  have no early return (their signature is `($request, $issue, $showToc
  = false)`), so the flags go where `purchaseArticleEnabled` is assigned
  today. 3.4 tests `instanceOf \APP\issue\Issue` and calls
  `Application::getPaymentManager()` statically; 3.3 tests
  `instanceOf Issue`.
- The test: an end-to-end check that with fees saved and payments
  turned off the locked link shows no price.

Small: one condition in the shared template and two flags in the
handler that already computes the first of them.

## Evidence

- The Steps as a Playwright script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/locked-link-fee-while-payments-off/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/lib.js)),
  run with `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/locked-link-fee-while-payments-off/walk.js`.
  It records each link's text, icon and screen-reader text and where
  each press lands, with payments off, then on again, then off with the
  fees emptied on the "Payments" page opened by its address.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/locked-link-fee-while-payments-off/fix.diff ojs`
  and the walk on a freshly loaded install, then reverted.
- The Steps were taken in a browser on PostgreSQL, each install freshly loaded from pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01): `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a) on
  2026-10-02, the Steps and both controls; `stable-3_5_0` OJS c346ee00a5
  (lib/pkp 3bb4450bea) on 2026-10-01, steps 1 to 8 and 10 and the first
  control, with the same result. The visitor's press (step 9) and the
  address control were taken on `main` only. On 3.5 `PaymentsHandler`
  likewise has no payments check (code).
- 3.4 and 3.3, by code: OJS `stable-3_4_0` at 75cc2d488b and
  `stable-3_3_0` at ac77c9fb35. `galley_link.tpl` has the same
  condition (3.4 line 79, 3.3 line 76); `article_details.tpl`,
  `article_summary.tpl` and `issue_toc.tpl` pass the saved fees (3.4
  lines 290, 99, 119; 3.3 lines 270, 92, 103); `_setupIssueTemplate()`
  assigns `purchaseArticleEnabled` only.
