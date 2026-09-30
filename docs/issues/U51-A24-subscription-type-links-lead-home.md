# On a subscription journal without payments set up, "Learn More" and "View Available Subscription Types" lead readers home

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1832` for `pkp/pkp-lib#3206` · [e0b84f6317](https://github.com/pkp/ojs/commit/e0b84f6317a31df6f5eb514f36cd118d9c3b0439) · 2018-02-12 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#6515` (open), covering "View Available Subscription Types" on "My Subscriptions" only
- **Tracked in** spec U51 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a24)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal that requires subscriptions but has no payment method set up
still shows signed-in readers two links to its "Subscriptions" page:
"Learn More" in the "Subscription" block, and "View Available
Subscription Types" on "My Subscriptions". That page is closed while
payments are not set up, so both links land on the journal's home page
with no message.

Payments are off on a new journal, so a journal that sells
subscriptions by hand, without an online payment method, is in this
state. Readers meet the links only when they are signed in and have no
subscription, and only where the journal placed the "Subscription"
block in its sidebar or the reader opens "My Subscriptions". Signed-out
readers see neither link: the block asks them to log in.

## Impact

- **Lost.** Nothing. The page the links name is closed by design while
  the journal takes no payments, so the reader could not have seen it.
- **Who.** Signed-in readers without a subscription, on a journal that
  requires subscriptions and has no payment method set up, when the
  block is in the sidebar or they open "My Subscriptions".
- **Way round.** None needed; there is nothing to buy online. The
  "Subscriptions Contact" at the top of "My Subscriptions" says whom to
  ask, when the journal filled it in.

Low: a link that promises the list of types and prices leads to the
home page, and the reader is not told why. It would be medium if the
team decided the "Subscriptions" page should open without online
payments, since today's redirect would then hide the only list of
prices from these readers.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` as the dataset has it: open access,
  payments off, no subscription type, no sidebar block. Steps 1–7 make
  it require subscriptions, place the "Subscription" block and add two
  types. The "Payments" side menu entry, where types are kept, is shown
  only while payments are enabled, so step 3 enables them and step 7
  turns them off again.
- The reader `amwandenga` has no subscription.

Setting up the journal:

1. Sign in as `rvaca` (the journal manager).
2. Settings › Distribution, tab "Access": under "Publishing Mode" choose
   "The journal will require subscriptions to access some or all of its
   contents." and press "Save".
3. Tab "Payments": tick "Payments will be enabled for this journal. …",
   set "Currency" to "US Dollar" and press "Save".
4. Settings › Website, tab "Appearance" › "Setup": under "Sidebar" tick
   "Subscription Block" and press "Save".
5. Reload, open "Payments" in the side menu, tab "Subscription Types",
   "Create New Subscription Type": "Name of Type" "Online Year u51w9",
   "Currency" "US Dollar (USD)", "Cost" "40", "Format" "Online",
   "Duration" "12", "Individual (users are validated via login)";
   "Save".
6. The same for "Campus Year u51w9", "Cost" "400", "Institutional
   (users are validated via domain or IP address)".
7. Settings › Distribution, tab "Payments": untick "Payments will be
   enabled for this journal. …" and press "Save". Log out.

Payments not set up:

8. Sign in as `amwandenga`. The home page's sidebar shows the block
   "Subscription".
9. Press "Learn More".
10. Open `/index.php/publicknowledge/en/user/subscriptions` ("My
    Subscriptions"; the header does not list it while payments are not
    set up).
11. Press "View Available Subscription Types" under "Individual
    Subscription".
12. Open "My Subscriptions" again and press "View Available
    Subscription Types" under "Institutional Subscriptions".

Payments set up (the control):

13. Sign in as `rvaca`. Settings › Distribution, tab "Payments": tick
    "Payments will be enabled for this journal. …", "Currency" "US
    Dollar", "Payment Plugins" "Manual Fee Payment", "Manual Payment
    Instructions" "Pay by bank transfer."; "Save". Log out.
14. Sign in as `amwandenga` and press "Learn More" in the home page's
    block.
15. Press "Purchase New Subscription" under the individual types, then
    open "My Subscriptions".
16. Log out and read the block on the home page.

**Expected.** "Learn More" and "View Available Subscription Types" lead
to a list of the journal's subscription types, or are not shown while
there is none to show.

**Observed.** Step 8's block reads "A subscription is required to
access some resources. Learn More", and step 9 lands on
`/index.php/publicknowledge/en/index`. Step 10 opens "My
Subscriptions" with "Individual Subscription", "Individual
subscriptions require login to access subscription content.", "View
Available Subscription Types", then "Institutional Subscriptions", its
description and "View Available Subscription Types". Steps 11 and 12
each land on `/index.php/publicknowledge/en/index#subscriptionTypes`.
No page shows a message.

Control: with payments set up, step 14 opens "Subscriptions" listing
both types, step 15 opens "Purchase Individual Subscription", and "My
Subscriptions" offers "Purchase New Subscription" under both kinds.
Signed out (step 16) the block reads "Login to access subscriber-only
resources.".

## Cause

`APP\pages\about\AboutHandler::subscriptions()` (OJS) redirects to the
home page unless payments are set up
([L40–L45](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/about/AboutHandler.php#L40-L45)).
That condition came with e0b84f6317 in `pkp/ojs#1832`, for
`pkp/pkp-lib#3206` ("Subscriptions page should not be accessible if
payments are not enabled"). The change did not touch the links to the
page, which date from 2017, when the page was open on every journal.
They are still shown when the page is closed:

- "My Subscriptions", individual part: "View Available Subscription
  Types" is the last `{else}` of `{if $userIndividualSubscription} …
  {elseif $paymentsEnabled} … {else}`
  ([userSubscriptions.tpl L60, L123–L135](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/pages/userSubscriptions.tpl#L123-L135)),
  so a reader with no individual subscription sees it whenever
  `$paymentsEnabled` is false.
- "My Subscriptions", institutional part: the link is the `{else}` of
  `{if $paymentsEnabled}`, under the reader's institutional
  subscriptions
  ([L223–L233](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/pages/userSubscriptions.tpl#L223-L233)).
- `UserHandler::subscriptions()` assigns `paymentsEnabled` as
  `$paymentManager->isConfigured()`, and `OJSPaymentManager::isConfigured()`
  includes the journal's `paymentsEnabled`. So in both parts the link
  shows exactly when `AboutHandler::subscriptions()` redirects.
- The block's "Learn More"
  ([block.tpl L50–L53](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/blocks/subscription/templates/block.tpl#L50-L53))
  is shown to every signed-in reader without a subscription, with no
  payment test. `SubscriptionBlockPlugin::getContents()` assigns
  `acceptSubscriptionPayments` (`isConfigured()`) only when the reader
  has a subscription.

Reach:

- A signed-in reader refused a restricted galley is also sent to the
  page (`ArticleHandler::userCanViewGalley()`,
  `IssueHandler::userCanViewGalley()`) and lands on the home page. What
  that reader should see instead is an open product question in spec
  U51 (whether to show a "subscription required" page with the
  contact); it is not covered here.
- The "Subscriptions" and "My Subscriptions" menu items already follow
  the page's condition (`NavigationMenuService::getDisplayStatusCallback()`,
  code). OMP and OPS have no subscription pages.

## Proposed fix

A proposal; the team decides. Show each link only while the page it names is open
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-type-links-lead-home/fix.diff),
excerpt):

```diff
 // plugins/blocks/subscription/SubscriptionBlockPlugin.php, getContents()
         $paymentManager = Application::get()->getPaymentManager($journal);
-
-        if (isset($individualSubscription) || isset($institutionalSubscription)) {
-            $templateMgr->assign('acceptSubscriptionPayments', $paymentManager->isConfigured());
-        }
+        $templateMgr->assign('acceptSubscriptionPayments', $paymentManager->isConfigured());

 // plugins/blocks/subscription/templates/block.tpl
 					{translate key="plugins.block.subscription.subscriptionRequired"}
-					<a href="{url page="about" op="subscriptions"}">{translate key="plugins.block.subscription.subscriptionRequired.learnMore"}</a>
+					{if $acceptSubscriptionPayments}
+						<a href="{url page="about" op="subscriptions"}">{translate key="plugins.block.subscription.subscriptionRequired.learnMore"}</a>
+					{/if}
```

In `userSubscriptions.tpl` the two `{else}` branches with "View
Available Subscription Types" are removed; "Purchase New Subscription"
stays under `$paymentsEnabled`. The block and "My Subscriptions" are
shown only on a journal that requires subscriptions, so there
`isConfigured()` is exactly the page's condition. This keeps what
`pkp/pkp-lib#3206` asked for (no offer page without payments) and uses
the variables both templates already have.

Tried on `main`. With the fix in, the block reads "A subscription is
required to access some resources." with no link, and "My
Subscriptions" shows no link under either kind. Steps 13–16, which must
not change, read the same with the fix in and out.

**Alternatives**

- Open the page on every journal that requires subscriptions, listing
  the types and the contact, with "Purchase New Subscription" only while
  payments are set up. Readers of journals that sell by hand would see
  the prices, and the refused-galley redirect would land somewhere
  useful. It reverses `pkp/pkp-lib#3206`, so it is a product decision,
  not a bug fix.
- Point both links at "My Subscriptions" or the journal's contact page:
  a new destination nobody asked for.

**What goes with it**

- Behavior: without payments, the block's line has no link and "My
  Subscriptions" shows only the headings and descriptions under each
  kind. Nothing changes with payments set up. No API or plugin hook is
  involved. A theme that overrides either template keeps the old links.
- Backport: the diff applies as written to 3.5 (checked with `patch
  --dry-run`); 3.4 has the same code in the same files; 3.3 needs the
  block plugin's `.inc.php` file.
- Test: an e2e scenario in spec U51 in which a signed-in reader of a
  subscription journal without payments sees neither link.

Small: a few lines in the two templates and one assignment moved in
the block plugin, using values both already compute; no data, no API,
tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-type-links-lead-home/walk.js)
  takes the Steps on a fresh load of the default dataset and records
  where each press lands, the page's notices and the server log:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-type-links-lead-home/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). A link the page
  does not offer is recorded as absent.
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs`, the
  same script, then `node bin/try-fix.js revert ojs`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`. No query
  is involved.
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
- Code reads: on 3.4 (`pages/about/AboutHandler.php`) and 3.3
  (`pages/about/AboutHandler.inc.php`) the page has the same
  payments-only condition; `userSubscriptions.tpl` has the same two
  `{else}` links, the block's template the same "Learn More", and
  `OJSPaymentManager::isConfigured()` includes `paymentsEnabled`.
- Introduced: `git log -S` on the condition in `AboutHandler` gives
  e0b84f6317 (its parent has no condition); the GitHub API lists it
  under `pkp/ojs#1832`, merged 2018-02-13. The links come from
  bcd79df730 and 18ab9dc433 (2017-10-13, `pkp/pkp-lib#1816`).
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library by the link texts, "subscriptions page redirect
  payments" and `AboutHandler`): only `pkp/pkp-lib#6515`, which does not
  mention the block.
- Not driven: 3.4 and 3.3 (code only); MySQL.
