# A journal restricting only PDFs shows its HTML galleys unlocked, then refuses them to readers without a subscription

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced as one change; present since at least [4e3820b271](https://github.com/pkp/ojs/commit/4e3820b271c810e852467b2b22dcf6b060d2f4a5) (2007-10-01)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A subscription journal with payments enabled ticks "Only Restrict
Access to PDF version of issues and articles" and saves no "Purchase
Article", "Purchase Issue" or "Association Membership" fee. Its
restricted issues then show the non-PDF galleys (HTML, for one)
without the padlock, on the issue's page and the article's page. A
reader without a subscription who presses one is turned away exactly
like a PDF: a signed-out visitor to the Login page, a signed-in reader
to the "Subscriptions" page.

The box and the link both say that only PDFs are restricted, so the
journal believes its HTML is open while every reader without a
subscription is refused it. The reader is not told why, and nothing
tells the journal's managers that the HTML is refused. Saving a fee
makes the HTML open.

## Impact

- **Lost:** readers without a subscription lose access to the non-PDF
  galleys the journal chose to leave open, and see an open link that
  leads to a refusal.
- **Who:** every visitor without a subscription, on a journal with
  payments enabled (Settings › Distribution › "Payments": "Enable" and
  a payment method with its required box filled), the box ticked and
  none of the three fees saved, on every restricted issue. With
  payments not enabled the box has no effect: every galley shows the
  padlock and is refused, so links and access agree.
- **Way round:** the journal can save a fee. An article's HTML then
  opens with a "Purchase Article" or an "Association Membership" fee, a
  "Full Issue" HTML with a "Purchase Issue" or an "Association
  Membership" fee. The HTML then opens free for everyone, not behind
  the purchase, and with a purchase fee the PDFs show their price and
  can be bought. Nothing on screen says a fee is needed. Readers have
  no way round.

Medium: content the journal configured as open is refused while the
link shows it open, and only a fee the journal never wanted puts it
right.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`. Everything else
is set up through the screens, signed in as `dbarnes`:

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents." and press
   "Save".
2. Settings › Distribution › "Payments": tick "Enable", Currency "US
   Dollar", Payment Plugins "Manual Fee Payment", type any "Manual
   Payment Instructions", "Save".
3. "Payments" in the side menu › "Payment Types": tick "Only Restrict
   Access to PDF version of issues and articles", leave every fee empty,
   "Save".
4. Issues › "Back Issues" › the arrow beside "Vol. 1 No. 2 (2014)" ›
   "Edit" › "Access": Access Status "Subscription", "Save".
5. Open the same issue's "Edit" again › "Issue Galleys" › "Create Issue
   Galley": label "HTML", upload any HTML file, "Save".
6. Open submission 5, "Genetic transformation of forest trees"
   (Production) › Publication › "Galleys" › "Add galley": label "HTML",
   "Save"; in the upload window choose "Article Text", upload any HTML
   file, "Continue", "Continue", "Complete".
7. "Schedule For Publication": "Assign To Current/Back Issue", Issue
   "Vol. 1 No. 2 (2014)", "Confirm", then "Publish". [3.5: Publication ›
   "Issue" › "Assign to Issue", pick "Vol. 1 No. 2 (2014)", "Save"; then
   "Schedule For Publication" and the window's "Publish".]

Steps:

1. Sign out. Open "Archives" and "Vol. 1 No. 2 (2014)".
2. Look at the links: "Full Issue" "HTML", "Genetic transformation of
   forest trees" "HTML", and the "PDF" of "The Signalling Theory
   Dividends…" and of "Antimicrobial, heavy metal resistance…".
3. Press "HTML" under "Genetic transformation of forest trees".
4. Back on the issue, press "HTML" under "Full Issue".
5. Sign in as `ccorino` (a Reader with no subscription) and repeat 3
   and 4.

**Expected.** Both HTML links show no padlock, and both open for
everyone: the article's HTML in the reader, the "Full Issue" HTML as
its file. The PDFs stay locked.

**Observed.** The HTML links show no padlock and no "Requires
Subscription" words, while every PDF link shows the padlock. Signed out, both
HTML links lead to the Login page with:

```
Subscription required to access item. To verify subscription, log in to journal.
```

As `ccorino`, both lead to the "Subscriptions" page. No request fails.

Control: with "Purchase Article" 5 and "Purchase Issue" 20 saved on
"Payment Types" (the box still ticked), the same two HTML links open
for the signed-out visitor; with the box unticked, both HTML links show
the padlock and are refused, as they should be.

## Cause

Two pieces of OJS decide about a restricted galley, and they read the
box differently.

The links follow the box alone.
[`ArticleHandler::view()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/article/ArticleHandler.php#L404-L406)
and
[`IssueHandler::setupIssueTemplate()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/issue/IssueHandler.php#L452-L454)
assign `restrictOnlyPdf` whenever `OJSPaymentManager::onlyPdfEnabled()`
holds (payments enabled and the box ticked), and
[`galley_link.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/templates/frontend/objects/galley_link.tpl#L56-L62)
then locks only `pdf` links.

Access follows the box only when a fee is set.
[`ArticleHandler::userCanViewGalley()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/article/ArticleHandler.php#L651-L660)
checks `onlyPdfEnabled()` inside
`if ($paymentManager->purchaseArticleEnabled() || $paymentManager->membershipEnabled())`,
and
[`IssueHandler::userCanViewGalley()`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/issue/IssueHandler.php#L285-L290)
inside `if ($paymentManager->purchaseIssueEnabled() || $paymentManager->membershipEnabled())`.
With no fee set, neither branch is entered, the non-PDF galley gets no
exemption, and the handler falls through to the Login page or
`about/subscriptions`. The box is a statement about what is
restricted, not about what can be bought, so the exemption belongs
outside the fee branch.

Both halves date from the payment feature. The article check went into
the pay-per-view branch with that feature in
[1d62659ec4](https://github.com/pkp/ojs/commit/1d62659ec4b047b3c302bb1c7bc3c9a52b18b24d)
(2007-09-23); a week later
[4e3820b271](https://github.com/pkp/ojs/commit/4e3820b271c810e852467b2b22dcf6b060d2f4a5)
(2007-10-01) added the padlock and tied it to the box alone, which is
when the two began to disagree. The issue handler copied the article's
shape when issue galleys arrived in
[a161d6c72b](https://github.com/pkp/ojs/commit/a161d6c72b4cb0ecfe2ce836a737f48b4bdaf590)
(2010-12-30).

Reach:

- Every way into a galley (`ArticleHandler::view()` and `download()`,
  `IssueHandler::view()` and `download()`) runs `userCanViewGalley()`,
  except that `ArticleHandler::download()` sends a remote-URL galley to
  its address before the check. A remote galley is never a PDF galley,
  so it is not refused there (code).
- With an "Association Membership" fee alone the two agree and the HTML
  opens (code); the purchase fees were checked on screen.
- A file under the article's "Additional Files" is a galley too, so the
  same rule decides it there (code).

## Proposed fix

Proposal: move the "only PDFs are restricted" exemption ahead of the
fee branch in both handlers, so access follows the box exactly as the
padlock already does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/non-pdf-galley-shown-open-refused/fix.diff)):

```diff
                 if (!(!$subscriptionRequired || … || $subscribedUser || $purchasedIssue)) {
-                    if ($paymentManager->purchaseArticleEnabled() || $paymentManager->membershipEnabled()) {
-                        if ($paymentManager->onlyPdfEnabled()) {
-                            if ($this->galley && !$this->galley->isPdfGalley()) {
-                                …
-                                return true;
-                            }
-                        }
+                    if ($paymentManager->onlyPdfEnabled() && $this->galley && !$this->galley->isPdfGalley()) {
+                        …
+                        return true;
+                    }
+
+                    if ($paymentManager->purchaseArticleEnabled() || $paymentManager->membershipEnabled()) {
```

and the same move in `IssueHandler::userCanViewGalley()`.
`onlyPdfEnabled()` already requires payments to be enabled, as the
padlock does, so the two now agree in every setup. Tried on `main`:
with the fix, the steps' HTML links open for the signed-out visitor
and for `ccorino`, while the PDF stays refused to both and, with the
box unticked, the HTML stays locked and refused.

**Alternatives:**

- Lock non-PDF links too while no fee is set. The issue page lists
  article links (whose exemption needs an article or membership fee)
  and "Full Issue" links (an issue or membership fee) under one
  `restrictOnlyPdf` flag, so this needs two flags. It changes no
  access, but leaves the box doing nothing without a fee, against its
  own label.
- Move the box out of "Payment Types" to the "Access" settings. That is
  where it belongs, but it is a settings move with a migration, larger
  than this fix needs.

**What goes with it:**

- A behavior change: on a journal already in this state, non-PDF
  galleys of restricted issues open to everyone, which is what its
  setting says.
- No stored data to repair.
- 3.5 applies it as written in `IssueHandler`; its `ArticleHandler`
  reads the access status from `$submission->getCurrentPublication()`
  on the line above, so the hunk needs its context adjusted. 3.4 has
  the same code; 3.3 the same logic in `.inc.php` files.
- The guard: a U51 scenario with the box ticked and no fee, a visitor
  opening the HTML of a restricted article and "Full Issue".

Medium: the code is a few lines, but opening content on live journals
is a ruling the team should make before merging.

## Evidence

- Script: [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/non-pdf-galley-shown-open-refused/walk.js), after `npm run fleet-prep -- --feature issues-sb4 --dataset 4 --reset`: `PROBE_FEATURE=issues-sb4 PROBE_AGENT=sb4 node bin/probe.js ojs shared/playwright/checks/issues/non-pdf-galley-shown-open-refused/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0` in front).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/non-pdf-galley-shown-open-refused/fix.diff ojs`, the script again, then `revert`.
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
- Code reads: on each line, `ArticleHandler::userCanViewGalley()`,
  `IssueHandler::userCanViewGalley()`, the `restrictOnlyPdf`
  assignments, `OJSPaymentManager::onlyPdfEnabled()` and
  `galley_link.tpl`. 3.4 (`pages/article/ArticleHandler.php` L563–L567,
  `pages/issue/IssueHandler.php` L274–L277) and 3.3 (the same in
  `ArticleHandler.inc.php` L498–L503 and `IssueHandler.inc.php`
  L232–L235) nest the exemption the same way and lock links by the box
  alone.
- Introduced: `git log -S onlyPdfEnabled` and `-S membershipEnabled()`
  on the handlers; the blamed lines sit in the PSR-12 reformat
  665ed1f925 (2021), and before it in the commits named in Cause, all
  from before pkp used pull requests.
- Upstream (searched 2026-10-01): `pkp/pkp-lib#626` (closed) reworked
  the old issue template's access icons and is not this fault.
- Payments not enabled: read in the code (`onlyPdfEnabled()` needs
  `isConfigured()`), not walked here.
- Unverified: a paid-up "Association Membership" or a completed
  purchase could not be made on the test install (no payment completes
  there); those paths are read in the code only.
