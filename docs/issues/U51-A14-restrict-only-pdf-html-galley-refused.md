# With "Only Restrict Access to PDF…" ticked and no reader fee, HTML galleys show no padlock but refuse readers

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** [4e3820b271](https://github.com/pkp/ojs/commit/4e3820b271c810e852467b2b22dcf6b060d2f4a5) (before pkp used GitHub pull requests; PKP's old tracker `#3018`) · 2007-10-01 · Juan Pablo Alperin (jalperin)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a14)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal requires subscriptions, has payments set up, and its Journal
Manager has ticked "Only Restrict Access to PDF version of issues and
articles" under "Payment Types" but set no reader fee. On that journal,
a restricted issue's HTML galleys show their file icon and no padlock.
That holds on the article page and under "Full Issue", while the PDF
beside them shows the padlock. Anyone without a subscription who presses
the HTML is still turned away, exactly as for the PDF:

- signed out, they land on the Login page with "Subscription required to
  access item.";
- signed in, they land on the "Subscriptions" page.

The same goes for every galley that is not a PDF. A fee frees the
non-PDF galleys at no charge while the PDF stays restricted:

- "Association Membership" frees the article's and the issue's;
- "Purchase Article" frees only the article's;
- "Purchase Issue" frees only the "Full Issue" ones.

A "Purchase Article" or "Purchase Issue" fee also puts the PDF on sale
at that price.

## Impact

- **Lost:** the free HTML version the journal chose to offer. The
  refused reader is told a subscription is required; the journal is not
  told that its free HTML is refused.
- **Who:** readers without a subscription, on each non-PDF galley of a
  restricted issue, on journals set up this way.
- **Way round:** set a reader fee, as in the Summary. An "Association
  Membership" fee frees both kinds of HTML without putting the PDF on
  sale; a purchase fee sells the PDF too.

Medium: readers are refused what the journal offers free, but the
journal can open it on screen by setting a fee.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`: journal
`publicknowledge`, its published issue "Vol. 1 No. 2 (2014)" (open
access), and submission 17, "Antimicrobial, heavy metal resistance and
plasmid profile of coliforms isolated from nosocomial infections in a
hospital in Isfahan, Iran", published in it with a "PDF" galley. The
steps turn on subscriptions and payments and add the HTML galleys, which
the dataset lacks.

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
4. "Payments" in the side menu › "Payment Types": tick "Only Restrict
   Access to PDF version of issues and articles", leave "Purchase Issue",
   "Purchase Article" and "Association Membership" empty and press
   "Save".
5. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   set "Access status" to "Subscription" and press "Save".
6. Open the same issue again › "Issue Galleys" › "Create Issue Galley":
   type "HTML" as the "Galley Label", upload any HTML file and press
   "Save".
7. Open submission 17 › Publication › "Galleys", press "Unpublish" and
   confirm with "Unpublish".
8. "Add galley": type "HTML" as the "Galley Label", press "Save", then
   in the upload window choose "Article Text", upload any HTML file and
   press "Continue", "Continue", "Complete".
9. Press "Schedule For Publication". "Review Publishing Details" opens
   with "Version of Record (VoR)", "Major Revision", "Assign To
   Current/Back Issue" and "Vol. 1 No. 2 (2014)" already chosen: press
   "Confirm", then "Publish". [3.5: "Schedule For Publication" opens the
   confirmation at once ("All publication requirements have been met. …
   Are you sure you want to publish this?"); press "Publish".]
10. Sign out.

Signed out:

11. Archives › "Vol. 1 No. 2 (2014)" › the article's title.
12. Look at the "PDF" and "HTML" buttons.
13. Press "HTML".
14. Go back to the article and press "PDF".
15. Go to the issue's page (Archives › "Vol. 1 No. 2 (2014)") and press
    the "HTML" under "Full Issue".

Signed in without a subscription:

16. Sign in as `ccorino` (an author and reader of the journal).
17. Repeat steps 11–15.

**Expected:** the box restricts only PDFs. "HTML" shows no padlock (step
12) and opens in the HTML viewer (step 13), and the issue's "HTML"
downloads (step 15). "PDF" shows the padlock and leads to Login (step
14). Signed in, the same, with "PDF" leading to the "Subscriptions" page.

**Observed:** step 12 as expected. "PDF" shows the padlock, and a screen
reader announces "Requires Subscription PDF". "HTML" shows its file icon
and no padlock, and so does the issue's "HTML". Steps 13 and 15 both
land on the Login page, as step 14 does:

```
Subscription required to access item. To verify subscription, log in to journal.
```

(`/index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Farticle%2Fview%2F17%2F4&loginMessage=reader.subscriptionRequiredLoginText`).
Signed in (step 17), the article's "HTML", the issue's "HTML" and "PDF"
all lead to the "Subscriptions" page
(`/index.php/publicknowledge/en/about/subscriptions`).

Control: with the box unticked again, "HTML" shows the padlock like
"PDF" and is refused the same way, so the page and the refusal agree.

## Cause

Two parts of OJS decide whether a non-PDF galley is restricted, and they
answer differently.

The page follows `OJSPaymentManager::onlyPdfEnabled()`
(`classes/payment/ojs/OJSPaymentManager.php` line 196). It is true when
a payment plugin is configured and the box is ticked, whatever the fees.
`ArticleHandler::view()` (`pages/article/ArticleHandler.php` lines
403–406) and `IssueHandler::setupIssueTemplate()`
(`pages/issue/IssueHandler.php` lines 451–454) pass `restrictOnlyPdf`
to the templates on that answer alone. `templates/frontend/objects/galley_link.tpl`
(lines 56–62) then marks only a PDF galley `restricted`, which is what
draws the padlock.

The access checks narrow the rule to setups that charge a fee.
`ArticleHandler::userCanViewGalley()` lets a non-PDF galley through
under `onlyPdfEnabled()` only inside `if
($paymentManager->purchaseArticleEnabled() ||
$paymentManager->membershipEnabled())` (lines 651–660).
`IssueHandler::userCanViewGalley()` does the same inside
`purchaseIssueEnabled() || membershipEnabled()` (lines 285–290). With no
fee the exemption is never reached, so the request falls through to the
refusal: `Validation::redirectLogin('reader.subscriptionRequiredLoginText')`
signed out, `about/subscriptions` signed in (`ArticleHandler.php` line
689, `IssueHandler.php` line 315).

Both halves date from 2007, with one author:

- [1d62659ec4](https://github.com/pkp/ojs/commit/1d62659ec4b047b3c302bb1c7bc3c9a52b18b24d)
  (2007-09-23) brought payments with an "only PDF" option. It was a
  pay-per-view charge for PDFs only, and its exemption sat inside the fee
  branch.
- [4e3820b271](https://github.com/pkp/ojs/commit/4e3820b271c810e852467b2b22dcf6b060d2f4a5)
  (2007-10-01) renamed the setting `restrictOnlyPdf` and added
  per-galley open and restricted icons driven by `onlyPdfEnabled()`
  alone.
- The label read "Only Restrict Access to PDF version of articles" until
  [a161d6c72b](https://github.com/pkp/ojs/commit/a161d6c72b4cb0ecfe2ce836a737f48b4bdaf590)
  (2010-12-30, issue galleys and issue purchases) added "issues and".
- The default theme's `galley_link.tpl` carried the icon rule over in
  2015.

Reach:

- Every non-PDF article galley (HTML, XML, a remote URL); walked with
  HTML.
- "Full Issue" galleys; walked with HTML.
- An HTML galley's images and stylesheets are served through
  `ArticleHandler::download()`, which runs the same check, so they are
  refused along with it (read in the code).
- The issue's table of contents draws its galley links from the same
  `galley_link.tpl` with `restrictOnlyPdf` (read in the code).

## Proposed fix

A proposal; the team decides. Apply the box's exemption before the fee branch in both access checks,
so that the refusal follows `onlyPdfEnabled()` as the page and the
templates do. The excerpt below elides the unchanged lines; the full
diff for `main` is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/fix.diff):

```diff
--- a/pages/article/ArticleHandler.php
+++ b/pages/article/ArticleHandler.php
                 if (!(!$subscriptionRequired || … || $subscribedUser || $purchasedIssue)) {
+                    if ($paymentManager->onlyPdfEnabled() && $this->galley && !$this->galley->isPdfGalley()) {
+                        $this->issue = $issue;
+                        $this->article = $submission;
+                        return true;
+                    }
+
                     if ($paymentManager->purchaseArticleEnabled() || $paymentManager->membershipEnabled()) {
-                        if ($paymentManager->onlyPdfEnabled()) {
-                            if ($this->galley && !$this->galley->isPdfGalley()) {
-                                …
-                            }
-                        }
--- a/pages/issue/IssueHandler.php
+++ b/pages/issue/IssueHandler.php
-                    if ($paymentManager->purchaseIssueEnabled() || $paymentManager->membershipEnabled()) {
-                        if ($paymentManager->onlyPdfEnabled() && !$galley->isPdfGalley()) {
-                            return true;
-                        }
+                    if ($paymentManager->onlyPdfEnabled() && $galley && !$galley->isPdfGalley()) {
+                        return true;
+                    }
 
+                    if ($paymentManager->purchaseIssueEnabled() || $paymentManager->membershipEnabled()) {
```

The `$galley &&` guard is new on the issue side, and it is needed.
`issue/download/{issueId}` without a galley id reaches this check with
no galley. The old code never got there without a fee; the moved check
would call `isPdfGalley()` on null and answer 500.

The fee-scoped exemption of 1d62659ec4 is kept: with a fee set,
non-PDF galleys stay free, as before. The `restrictArticleAccess` login
("Users must be registered and log in to view the content") still runs
first.

Tried on `main`:

- Signed out, the article's "HTML" opened in the HTML viewer, the
  issue's "HTML" downloaded, and "PDF" still led to Login.
- Signed in, the same, with "PDF" leading to the "Subscriptions" page.
- A signed-out `issue/download/1` led to Login, both with the fix
  applied and without it.
- With the box unticked, "HTML" kept its padlock and was refused, both
  with the fix applied and without it.

**Alternatives:**

- Make the padlock follow the access checks instead, passing
  `restrictOnlyPdf` to the templates only while a reader fee is set. That
  keeps today's access, but the box would then do nothing without a fee
  while its label promises otherwise, so its wording would have to
  change too.
- Put the whole rule behind one method (on `OJSPaymentManager` or
  `IssueAction`) that both handlers and the templates' flags call. That
  is cleaner, but it is a larger refactor of code that also decides the
  fee pages.

**What goes with it:**

- A release note: journals that ticked the box without a fee will start
  serving their non-PDF galleys to everyone. No stored data changes, and
  no hook or API is involved.
- Backport: on `stable-3_5_0` the condition above the ArticleHandler
  block reads `$submission->getCurrentPublication()->getData('accessStatus')`,
  so the `main` diff's ArticleHandler hunk does not apply there. The same
  change, with that line as context, is
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/fix-stable-3_5_0.diff).
  A `patch --dry-run` applies it to 3.5 and to 3.4's two handlers. On
  3.3 the blocks are in `ArticleHandler.inc.php` and
  `IssueHandler.inc.php`, with the same structure but other
  indentation, and need their own diff.
- Guard: an e2e scenario in the Subscriptions spec: box ticked, no fee,
  a signed-out visitor opens the HTML and is refused the PDF, and
  `issue/download/{id}` without a galley still leads to Login. The
  handlers have no unit tests to extend.

Medium: a few lines in two handlers, but a change in who can read what
on journals already set up this way, which the team should decide and
announce.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/walk.js)
  (Steps in
  [steps.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/steps.js)),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/walk.js [neighbour|no-galley]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` is the
  Control; `no-galley` is steps 1–5 followed by a signed-out
  `issue/download/1`.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/fix.diff ojs`,
  the script with each argument, then `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–17 on `main` and on `stable-3_5_0`, which
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
- Code reads (OJS files only; pkp-lib is not involved):
  - 3.4: `ArticleHandler.php` lines 347 and 562–566, `IssueHandler.php`
    lines 274–278 and 427, and `galley_link.tpl` lines 57–61, the same
    shape as `main`.
  - 3.3: `ArticleHandler.inc.php` lines 312 and 496–503,
    `IssueHandler.inc.php` lines 232–235 and 384, and `galley_link.tpl`
    lines 53–57.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for "only
  restrict access to PDF", "restrict PDF subscription", "HTML galley
  subscription", `restrictOnlyPdf`, `onlyPdfEnabled` and
  `userCanViewGalley`. `pkp/pkp-lib#626` (closed, 2015) discusses the
  old template's `restrictOnlyPdf` icons, not this fault.
- The ways round (which fee frees which galley) were read in the code,
  not walked.
