# While payments are off, a reader's "Learn More" and "View Available Subscription Types" lead to the home page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1832` for `pkp/pkp-lib#3206` · [e0b84f6317](https://github.com/pkp/ojs/commit/e0b84f6317a31df6f5eb514f36cd118d9c3b0439) · 2018-02-12 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#6515` (open), covering "View Available Subscription Types" only
- **Tracked in** spec U51 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a24)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal that requires subscriptions and has not set up payments
(payments are off on a new journal), a signed-in reader with no
subscription is offered "Learn More" in the sidebar's "Subscription"
block, and "View Available Subscription Types" on "My Subscriptions".
Both lead to the journal's home page with no message.

Both links point to the "Subscriptions" page, which has been closed
while payments are off since 2018; until then they opened it. The
proposed fix hides the two links while the page is closed.

## Impact

- **Lost:** a click and the reader's time.
- **Who:** signed-in readers without a subscription. "Learn More" is on
  every page that carries the "Subscription" block. "My Subscriptions"
  has no menu item while payments are off and the block does not link
  to it for these readers, so they reach it only by its address.
  Signed-out visitors see "Login to access subscriber-only resources."
  instead, with no link.
- **Way round:** write to the journal's main contact on the Contact
  page. No page shows the subscription types or the subscription
  contact while payments are off; the About page shows only the text
  the journal wrote there.

Low: the links lead nowhere, but the page they point to is closed on
purpose, so the reader loses nothing they could otherwise reach. It
would be medium if the team decides that readers should see the
subscription types and contact while payments are off (the open
question in U51
[A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a5));
then the closed page is the fault, not the links.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`; payments stay as
the dataset has them (not enabled). Signed in as `rvaca` (Journal
manager):

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents.", "Save".
2. Open `/index.php/publicknowledge/en/payments` (the "Payments" side
   menu item shows only while payments are enabled) › "Subscription
   Types" › "Create New Subscription Type": "Online Year", Cost `10`,
   "US Dollar", "Online", Duration `12`, "Individual (users are
   validated via login)", "Save".
3. Settings › Website › "Appearance" › "Setup": under "Sidebar" tick
   "Subscription Block", "Save".

Steps:

1. Sign in as `ccorino` (a Reader with no subscription).
2. On the journal's home page, the sidebar's "Subscription" block reads
   "A subscription is required to access some resources. Learn More".
   Press "Learn More".
3. Open `/index.php/publicknowledge/en/user/subscriptions` ("My
   Subscriptions").
4. Under "Individual Subscription" press "View Available Subscription
   Types".

Control:

5. As `rvaca`, Settings › Distribution › "Payments": tick "Payments will
   be enabled for this journal…", Currency "US Dollar", Payment Plugins
   "Manual Fee Payment", and type any text into "Manual Payment
   Instructions" (left empty, payments still count as not set up),
   "Save".
6. As `ccorino`, steps 2 and 3 again.

**Expected.** No link to the "Subscriptions" page while that page is
closed. `pkp/pkp-lib#3206` closed it while payments are off and asked
for its menu item to hide, which it does.

**Observed.** Steps 2 and 4 land on the journal's home page with no
message:

```
GET /index.php/publicknowledge/en/about/subscriptions   302
GET /index.php/publicknowledge/en/index                 200
```

In step 6, "Learn More" opens "Subscriptions", and "My Subscriptions"
offers "Purchase New Subscription" instead of "View Available
Subscription Types".

## Cause

e0b84f6317 (`pkp/pkp-lib#3206`, "Subscriptions page should not be
accessible if payments are not enabled") made
[`AboutHandler::subscriptions()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/about/AboutHandler.php#L40-L45)
send the reader to the index unless `paymentsEnabled` and the payment
manager `isConfigured()`. The issue also asked to hide the menu item,
which `NavigationMenuService`
([L103–L108](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/services/NavigationMenuService.php#L103-L108))
does. Two links to the page, written months before and working until
then, were left as they were:

- [`userSubscriptions.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/templates/frontend/pages/userSubscriptions.tpl#L123-L135)
  shows "View Available Subscription Types" exactly in the branch where
  `$paymentsEnabled` (which `UserHandler::subscriptions()` fills from
  `isConfigured()`) is false, under both parts (L129–L135 and
  L227–L230).
- The "Subscription" block's
  [`block.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/plugins/blocks/subscription/templates/block.tpl#L50-L53)
  shows "Learn More" to every signed-in reader without a subscription,
  whatever the payment setup. `SubscriptionBlockPlugin::getContents()`
  ([L101–L105](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/plugins/blocks/subscription/SubscriptionBlockPlugin.php#L101-L105))
  assigns `acceptSubscriptionPayments` only when the reader has a
  subscription, so the template cannot tell.

Reach:

- "Learn More", and "View Available Subscription Types" under the
  individual part: checked on screen.
- The same link under the institutional part (shown whenever
  institutional types exist): the same branch, code.
- A locked galley pressed by a signed-in reader while payments are off
  is redirected to the same closed page by `ArticleHandler` and
  `IssueHandler`. That is U51
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a5),
  an open question, and is left out here.

## Proposed fix

Proposal: show the two links only while the "Subscriptions" page is
open
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-offer-links-lead-home-payments-off/fix.diff)):

- `userSubscriptions.tpl`: drop the two `{else}` branches holding "View
  Available Subscription Types", so each part shows "Purchase New
  Subscription" while payments are set up and nothing otherwise.
- `SubscriptionBlockPlugin::getContents()`: assign
  `acceptSubscriptionPayments` (`isConfigured()`) always, not only for a
  reader with a subscription.
- `block.tpl`: show "Learn More" only under `{if $acceptSubscriptionPayments}`;
  "A subscription is required to access some resources." stays.

```diff
-        if (isset($individualSubscription) || isset($institutionalSubscription)) {
-            $templateMgr->assign('acceptSubscriptionPayments', $paymentManager->isConfigured());
-        }
+        $templateMgr->assign('acceptSubscriptionPayments', $paymentManager->isConfigured());
```

`OJSPaymentManager::isConfigured()` already requires `paymentsEnabled`
(main L59–L62, the same on 3.3), so this condition is the one the page
and its menu item test. The fix keeps what `pkp/pkp-lib#3206` was for:
the page stays closed while payments are off. Tried on `main`: with the
fix, the block reads "A subscription is required to access some
resources." with no link and "My Subscriptions" offers no link, while in
the Control "Learn More" opens "Subscriptions" and "My Subscriptions"
offers "Purchase New Subscription".

**Alternatives:**

- Open "Subscriptions" whatever the payment setup, listing the types and
  the subscription contact, and show its purchase links only while
  purchases are accepted. It tells readers of journals that take payment
  outside OJS how to subscribe, which U51 A5 leans to, but it reverses
  `pkp/pkp-lib#3206`: the team's call.
- Point the links elsewhere (the Contact page). That page shows the
  journal's main contact, not the subscription contact.

**What goes with it:**

- No data repair.
- The `user.subscriptions.viewSubscriptionTypes` string is then unused;
  it can go in Weblate.
- Applies as written to 3.5 and 3.4. 3.3 has the same templates and the
  block plugin in `SubscriptionBlockPlugin.inc.php`, indented with tabs,
  so the PHP hunk needs re-indenting there.
- The guard: a U51 scenario with the subscription mode and payments off
  that finds neither link.

Small: only templates and one line in the block plugin change, on a
condition OJS already uses, with nothing an API or another plugin reads.

## Evidence

- Kept walk:
  [`shared/playwright/checks/issues/subscription-offer-links-lead-home-payments-off/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-offer-links-lead-home-payments-off/walk.js)
  (helpers in `../individual-purchase-refusal-says-nothing/lib.js`), on
  an install reset to the default dataset; run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/subscription-offer-links-lead-home-payments-off/walk.js`.
  The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-offer-links-lead-home-payments-off/fix.diff ojs`,
  the walk again, then `revert`.
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
- Code reads on 3.4 and 3.3: the same redirect (`AboutHandler.php` L42 /
  `AboutHandler.inc.php` L32), the same `{else}` links
  (`userSubscriptions.tpl` L129–L135, L228–L230) and the same "Learn
  More" (`block.tpl` L52); e0b84f6317 is on both branches. A default
  install's menus (`registry/navigationMenus.xml`) hold no
  "Subscriptions" or "My Subscriptions" item.
- Introduced: `git log -L` on the redirect lines of `AboutHandler`; the
  PSR-12 reformat (665ed1f925) only moved them, the first commit is
  e0b84f6317, merged as `pkp/ojs#1832`. The links predate it
  (bcd79df730 for "View Available Subscription Types", 2017-10-13; the
  block's "Learn More" since dec19f97d7, 2018-01-10).
- Upstream: `pkp/pkp-lib#6515` (open, 2020) reports "View Available
  Subscription Types" leading to the index for this reason; it does not
  mention the block's "Learn More".
