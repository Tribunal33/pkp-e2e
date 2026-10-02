# "Subscriptions" offers "Purchase New Subscription" on an open-access journal, and it leads to the home page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no PR, for `pkp/pkp-lib#2962` · [d53574120e](https://github.com/pkp/ojs/commit/d53574120e8a6883afb868a69fca627b66021fd9) · 2017-11-16 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a23)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal that does not require subscriptions (open access, or not
published online) but has payments set up and subscription types, the
"Subscriptions" page lists the types and offers a signed-in reader
"Purchase New Subscription" under each list. Pressing it leads to the
journal's home page with no message.

The purchase pages refuse every journal that does not require
subscriptions, so the page offers a purchase that cannot happen. Readers
reach "Subscriptions" there only through a menu item the journal added
itself, or by its address.

## Impact

- **Lost:** a click and the reader's time; the reader is not told that
  the journal does not sell subscriptions online. Nothing is stored.
- **Who:** signed-in readers on such a journal's "Subscriptions" page,
  for instance a journal that set up payments for author fees and kept
  subscription types.
- **Way round:** write to the subscription contact shown on the same
  page.

Low: a link misleads in a setup few journals have, and no online
purchase is meant to happen there. It would be medium if the team wants
a not-online journal to sell (print) subscriptions online, since readers
would then lose a real purchase (see the Proposed fix).

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`; the journal stays
open access, as the dataset has it. Signed in as `rvaca` (Journal
manager):

1. Settings › Distribution › "Payments": tick "Enable", Currency "US
   Dollar", Payment Plugins "Manual Fee Payment", type any "Manual
   Payment Instructions", "Save".
2. "Payments" in the side menu › "Subscription Types" › "Create New
   Subscription Type": "Online Year", Cost `10`, "US Dollar", "Online",
   Duration `12`, "Individual (users are validated via login)", "Save".
   Again for "Campus Year", Cost `100`, "Institutional (users are
   validated via domain or IP address)".

Steps:

1. Sign in as `ccorino` (a Reader).
2. Open `/index.php/publicknowledge/en/about/subscriptions`
   ("Subscriptions"; a default install's menus have no item for it).
3. Under "Individual Subscriptions" press "Purchase New Subscription".
4. Open "Subscriptions" again and press "Purchase New Subscription"
   under "Institutional Subscriptions".

Not online:

5. As `rvaca`, Settings › Distribution › "Access": choose "OJS will not
   be used to publish the journal's contents online.", "Save".
6. As `ccorino`, steps 2 to 4 again.

Control:

7. As `rvaca`, Settings › Distribution › "Access": choose "The journal
   will require subscriptions to access some or all of its contents.",
   "Save".
8. As `ccorino`, steps 2 and 3 again.

**Expected.** In steps 2 and 6, "Subscriptions" lists the types and the
contact without "Purchase New Subscription".

**Observed.** Steps 2 and 6 show both lists, each followed by "Purchase
New Subscription". Both links, in steps 3, 4 and 6, land on the
journal's home page with no message:

```
GET /index.php/publicknowledge/en/user/purchaseSubscription/individual     302
GET /index.php/publicknowledge/en/index                                     200
```

Step 8 opens "Purchase Individual Subscription".

## Cause

`UserHandler::purchaseSubscription()`
([L130–L138](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/user/UserHandler.php#L130-L138))
and `payPurchaseSubscription()`
([L206–L222](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/user/UserHandler.php#L206-L222))
send the reader to the index unless the journal's `publishingMode` is
`PUBLISHING_MODE_SUBSCRIPTION` and the payment manager `isConfigured()`.

`AboutHandler::subscriptions()`
([L40–L56](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/about/AboutHandler.php#L40-L56))
opens the page on the payment setup alone, whatever the mode. But
[`subscriptions.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/templates/frontend/pages/subscriptions.tpl#L49-L55)
shows both purchase links under `{if $isUserLoggedIn}` only, so it offers
them in modes the purchase handlers refuse.

The links came in d53574120e ("Provide purchase links from About page",
`pkp/pkp-lib#2962`); the handlers' mode check is older (2009), and the
links were not given it.

Reach:

- Both links on "Subscriptions", open access and not online: checked on
  screen.
- "My Subscriptions" and the "Subscription" block: closed outside the
  subscription mode, so they offer nothing there (code;
  `UserHandler::subscriptions()`, `SubscriptionBlockPlugin::getContents()`).
- A "Subscriptions" menu item the journal adds shows on the page's own
  condition (`NavigationMenuService`, code), so it stays right.

## Proposed fix

Proposal: let `AboutHandler::subscriptions()` tell the template whether
purchases are accepted, with the same two checks the purchase handlers
make, and show the two links only then
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-link-on-open-journal-leads-home/fix.diff)):

```diff
             'institutionalSubscriptionTypes' => $subscriptionTypeDao->getByInstitutional($journal->getId(), true, false)->toArray(),
+            // The purchase pages also require the subscription publishing mode (UserHandler::purchaseSubscription())
+            'acceptSubscriptionPayments' => $paymentManager->isConfigured() && $journal->getData('publishingMode') == Journal::PUBLISHING_MODE_SUBSCRIPTION,
         ]);
```

```diff
-		{if $isUserLoggedIn}
+		{if $isUserLoggedIn && $acceptSubscriptionPayments}
```

(twice in `subscriptions.tpl`, plus `use APP\journal\Journal;`). The
"Subscription" block uses the same name: there it is `isConfigured()`
alone (`SubscriptionBlockPlugin.php` L104), which means the same only
because `getContents()` returns early outside the subscription mode
(L70–L72). Tried on `main`: with the fix, steps 2 and 6 show both lists
without "Purchase New Subscription", and step 8 still opens "Purchase
Individual Subscription".

For a not-online journal this settles a product question: hiding the
links means such a journal does not sell subscriptions online, even
print ones. The handlers decide that today, and the fix follows them;
if the team wants print subscriptions sold online there, the handlers'
mode check is what changes instead.

**Alternatives:**

- Close "Subscriptions" outside the subscription mode. It also hides the
  types and the contact, which a not-online journal may want to show
  for print subscriptions.
- Accept purchases in every mode. On an open-access journal a
  subscription opens nothing that is not already open. On a not-online
  journal it could sell print subscriptions; that is the product
  question above.

**What goes with it:**

- No data repair.
- Applies to 3.5 as written; 3.4 has the same lines. On 3.3 the handler
  is `AboutHandler.inc.php` and the constant the global
  `PUBLISHING_MODE_SUBSCRIPTION`.
- The guard: a U51 scenario that opens "Subscriptions" as a reader on an
  open-access journal with payments set up and finds no purchase link.

Small: two lines in one handler and its template, in one repository,
with no change to what an API or plugin relies on.

## Evidence

- Kept walk:
  [`shared/playwright/checks/issues/purchase-link-on-open-journal-leads-home/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-link-on-open-journal-leads-home/walk.js)
  (helpers in `../individual-purchase-refusal-says-nothing/lib.js`), on
  an install reset to the default dataset; run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/purchase-link-on-open-journal-leads-home/walk.js`.
  The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/purchase-link-on-open-journal-leads-home/fix.diff ojs`,
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
- Code reads on 3.4 and 3.3: the same unconditioned links
  (`subscriptions.tpl` L49 and L84) and the same mode check
  (`UserHandler.php` L130 / `UserHandler.inc.php` L106).
- A default install's menus (`registry/navigationMenus.xml`) hold no
  "Subscriptions" item; a journal adds one under Website ›
  "Navigation".
- Introduced: `git blame` on the template's `{if $isUserLoggedIn}` lines
  gives d53574120e, which added the links; `pkp/ojs` lists no pull
  request for it.
- Upstream: `pkp/pkp-lib#4700` (closed) asked to make the link more
  visible; `pkp/pkp-lib#12234` (open) is the PayPal return flow. Neither
  is this fault.
