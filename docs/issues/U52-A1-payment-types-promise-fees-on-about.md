# "Payment Types" tells a journal manager the fees appear in About the Journal, but no page lists them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#1816`, no PR · [6d3fa52e52](https://github.com/pkp/ojs/commit/6d3fa52e5264a2e45e5b51453c1a93d8813a6076) · 2017-09-28 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#4701` (closed without a fix), covering the membership sentence only
- **Tracked in** spec U52 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "Payment Types" tab tells a journal manager that the reader fees
"will appear in About the Journal under Policies, as well as at points
where payment is required", and that "The Association Membership will
appear in About the Journal under Policies." None of the fees set on
that tab appears on any page of the journal in advance: About the
Journal has no "Policies" section and shows no amount.

An author learns of the publication fee only when it is requested after
acceptance, and a reader sees an article's or an issue's price only on
the locked galley link. A manager who trusts the tab to publish the
fees, and so writes them nowhere else, leaves authors and readers
without them until the moment of payment.

The tab is reached from the side menu's "Payments" once a journal has
turned payments on.

## Impact

- **Lost**: nothing stored. The fees are not published in advance,
  though the tab says they are, and the manager is not told.
- **Who**: journal managers who set fees on Payments › "Payment Types",
  and the authors and readers they expect to read those fees in advance.
- **Way round**: type the fees into the journal's "About the Journal"
  text (Settings › Journal › "Masthead") or another page.

Low: the wording misleads the manager, but each fee that is charged is
shown to the payer before they pay (the publication fee on its payment
request, the reader prices on the locked links), so nothing is lost; it
would be medium if a fee could be charged without its amount being
shown to the payer first.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Payments are off there, so
  step 2 turns them on.

1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "Payments". Tick "Enable", choose "US
   Dollar" under "Currency" and "Manual Fee Payment" under "Payment
   Plugins", type any text in "Manual Payment Instructions" and press
   "Save".
3. Reload the page, press "Payments" in the side menu, then the "Payment
   Types" tab. Read the sentences under "Reader Fees" and "General
   Fees".
4. Type "50" in "Article Processing Charge", "7" in "Purchase Issue",
   "5" in "Purchase Article" and "20" in "Association Membership". Press
   "Save".
5. Sign out. On the journal's site open "About" › "About the Journal"
   (`/index.php/publicknowledge/en/about`).
6. Open the other pages the site's menus offer: "Submissions",
   "Editorial Masthead", "Privacy Statement", "Contact", the home page,
   "Current" and "Archives", and the "Subscriptions" page
   (`/index.php/publicknowledge/en/about/subscriptions`).

**Expected**: About the Journal lists the fees under "Policies", as the
tab says. Or, if the journal does not list fees there, the tab does not
promise it.

**Observed**: the tab shows the two sentences quoted in the Summary.
Step 4 answers "Your changes have been saved." and the boxes keep 50, 7,
5 and 20. About the Journal shows its heading "About the Journal" and
the journal's own text, with no "Policies" section and no amount. None
of the pages of step 6 names a fee or any of the four amounts.

## Cause

The two sentences are the locale strings
`manager.payment.readerFeesDescription` and
`manager.payment.generalFeesDescription` (`locale/en/manager.po`), which
`templates/payments/paymentTypesForm.tpl` prints under "Reader Fees" and
"General Fees". They were written in 2007 for OJS 2, whose About pages
listed the fees: an "Author Fees" part of the Submissions page
(`about.authorFeesMessage`, "This journal charges the following author
fees.") and a "Memberships" page.

OJS 3's About pages do not read these fees. They were rebuilt in 2013
(ojs ae903bd93b, "Include basic page structure from OMP") without those
parts. When the payment settings returned in OJS 3.1,
`classes/subscription/form/PaymentTypesForm.php` and its template (ojs
6d3fa52e52) took the OJS 2 sentences over unchanged. Today
`lib/pkp/templates/frontend/pages/about.tpl` prints only the journal's
own "About the Journal" text. `AboutContextHandler` passes no fee, and
`AboutHandler::subscriptions()` passes only the subscription types,
whose costs `subscriptions.tpl` prints. The keys `about.authorFees`,
`about.authorFeesMessage`, `about.memberships` and
`payment.membership.buyMembership` remain in `locale/en/locale.po`,
used by no template.

The membership cannot be bought at all: no page links to
`user/payMembership`, and `OJSPaymentManager::createQueuedPayment()`
treats `PAYMENT_TYPE_MEMBERSHIP` as deprecated, so the "General Fees"
sentence promises a listing of a fee nobody can pay (spec U52
[A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a7)).

Reach:

- The only reader pages that print a "Payment Types" fee are the locked
  galley links: "Purchase Article" on the article and its listings
  (`article_summary.tpl`, `article_details.tpl`), "Purchase Issue" on
  the issue's table of contents (`issue_toc.tpl`) (code). So the second
  half of the "Reader Fees" sentence, "at points where payment is
  required", holds; the "About the Journal under Policies" half does
  not.
- "Article Processing Charge" is shown to an author first on the payment
  request after acceptance (code); no page of step 6 shows it.
- The "Author Fees" sentence ("Enter fee amounts below in order to
  enable author processing charges.") promises nothing and is right.
- OMP and OPS have no "Payment Types" tab and no such strings (code).
- A 2020 edit (ojs 617cd6db51, "Remove English reference to donations")
  took the donations clause out of `generalFeesDescription` and kept the
  "About the Journal under Policies" clause.

## Proposed fix

Reword the "Reader Fees" sentence to what readers meet today, and drop
the "General Fees" sentence, as `pkp/pkp-lib#4701` asked
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-types-promise-fees-on-about/fix.diff)):

```diff
 msgid "manager.payment.readerFeesDescription"
-msgstr "Selected options, along with their descriptions and fees (which can be edited below), will appear in About the Journal under Policies, as well as at points where payment is required."
+msgstr "Readers are shown these fees at the points where payment is required."
```

```diff
 	{fbvFormSection title="manager.payment.generalFees"}
-		<p>{translate key="manager.payment.generalFeesDescription"}
 		{if $membershipFee==0}{assign var=membershipFee value=""}{/if}
```

This is a proposal. It drops only the promise of a listing that no page
makes; whether the "Association Membership" box itself should stay is
the open question of spec U52's A7, and dropping its sentence leaves
that question as it is. The rewording follows how ojs 617cd6db51 fixed
the same strings in 2020: the English source changes.

Tried on OJS `main`: the tab then showed the new "Reader Fees" sentence
and no sentence under "General Fees", and steps 4 to 6 were unchanged.

**Alternatives**:

- List the fees on About the Journal, as OJS 2 did. That is a new
  reader-page feature and a product decision (which fees, which page,
  how themes show them), not a fix for misleading wording.
- Reword the "General Fees" sentence instead. No true sentence about the
  membership fee helps the manager while nobody can buy a membership.
- Remove the "Reader Fees" sentence too. Its second half is true and
  tells the manager where readers meet the price.

**What goes with it**:

- Other instances: no other string or template promises a fee on an
  About page (a search of `locale/en` and the templates of OJS, OMP and
  OPS for "under Policies" and "About the Journal" in payment strings,
  code). The now unused `manager.payment.generalFeesDescription` and the
  four unused About keys of the Cause can go in the same change.
- Translations: the 62 other OJS locales carry the old "Reader Fees"
  sentence; the change marks them `#, fuzzy` for translators, as ojs
  617cd6db51 did.
- Backport: the same string and template line are on `stable-3_5_0` and
  `stable-3_4_0`; on `stable-3_3_0` the string is in
  `locale/en_US/manager.po`, and the diff applies with that path change.
- The guard: none needed beyond the wording; the spec's scenario that
  opens "Payment Types" can read the new sentence.

Small: one string and one template line, no code change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-types-promise-fees-on-about/walk.js)
  (steps 1 to 6; helpers in its `lib.js`), run on an install freshly
  loaded from PKP's default test dataset (pkp/datasets c657990,
  2026-10-01, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/payment-types-promise-fees-on-about/walk.js`.
  Walked on `main` and on `stable-3_5_0`, with the same result on both.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs`, then `walk.js`
  and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-types-promise-fees-on-about/neighbour.js),
  which read the same with the fix in and out (headings, the "Author
  Fees" sentence, the box labels, a valid save, the refusal of "abc").
- The walk checked the pages of step 6 for any of the four amounts and
  for the words "fee", "charge", "membership", "policies" and
  "purchase". The dataset's articles are open access, so no locked
  galley link (the one place a price is printed) was on screen; that
  part of the Cause is read in the code.
- Branch tips: OJS `main` 68615b5a32 (lib/pkp 25562b0e1a); OJS
  `stable-3_5_0` 3517e640f2 (lib/pkp b1981810da); OJS `stable-3_4_0`
  75cc2d488b (lib/pkp 32b0f4b4af); OJS `stable-3_3_0` ac77c9fb35
  (lib/pkp f6ab331645).
- Code reads: on `main`, `paymentTypesForm.tpl`, `PaymentTypesForm`,
  `PaymentsHandler`, `AboutHandler`, `AboutContextHandler`,
  `frontend/pages/about.tpl`, `frontend/pages/subscriptions.tpl`,
  `galley_link.tpl` and its callers, `UserHandler::payMembership()` and
  `OJSPaymentManager`. On `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`: the same template and the same two English strings,
  and an `about.tpl` that prints only the journal's own text.
- Introduced: `git log --follow` on `paymentTypesForm.tpl` reaches
  6d3fa52e52 through two moves (d106e9eed2 and 37de9bf480,
  `pkp/pkp-lib#2964`); `git log -S` on the keys reaches the 2007 OJS 2
  commit 8eeb525a58 (`#3064#`, "Payment system overhaul"), when the
  About pages listed the fees; ae903bd93b and bc24850e60 (2013) removed
  that listing.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  for "About the Journal under Policies", "payment types fees about
  journal policies", "author fees displayed about", "article processing
  charge display fee about page", `readerFeesDescription`,
  `generalFeesDescription`, `paymentTypesForm`. `pkp/pkp-lib#4701`
  ("Add functionality to purchase a membership in OJS 3", closed as not
  planned in 2022) reports that the membership sentence is "a holdover
  from OJS 2" and asks for it to be removed; it does not cover the
  reader fees sentence.
