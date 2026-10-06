# A visitor who signs in or registers to buy a book file lands on their home page, not the payment page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#3331` for `pkp/pkp-lib#3274` · [a153024bc9](https://github.com/pkp/pkp-lib/commit/a153024bc9c3c7102f5e097821321685bcf7d1b4) · 2018-01-30 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a18)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A visitor who follows the link of a book file for sale gets the Login
page. After signing in there they expect the payment page for that
file. They land where an ordinary sign-in would take them: the press's
home page, "My Submissions" or the Dashboard, by role. A newcomer who
chooses "Register" on that Login page, fills the form and sends it
lands on "Registration complete", signed in.

The Login page and the page they land on say nothing of the purchase.
The buyer, now signed in, must find the book again and follow the
file's link a second time, which opens the payment page at once.

The fault shows on a press that sells files: a currency and a payment
method under Settings › Distribution › "Payments", and a file set to
"Direct Sales".

## Impact

- **Lost.** The buyer's place in the purchase, and nobody tells them
  why they are on another page. No data, money or order is lost: no
  payment has begun yet.
- **Who.** Every visitor who follows a priced file's link before
  signing in, on a press that sells files.
- **Way round.** Open "Catalog", the book, and the file's link again.

Low: the purchase stays one step away and gets done, after a detour
the buyer has to work out alone. A first-time buyer may give up there,
which costs the press a sale; that risk, shown to be common, would
raise it to medium, as would a second try that did not reach the
payment page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 14, "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", is published. Its side column lists two free files
  under "PDF": "Segmentation of Vascular Ultrasound Imag.pdf" and "The
  Canadian Nutrient File: Nutrient Val.pdf".
- The dataset has no currency and no file for sale; steps 1 to 3 set
  them.

Setting a file for sale:

1. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency" and "Manual Fee
   Payment" under "Payment Plugins", type "Pay by cheque u69r10" in
   "Manual Payment Instructions" and press "Save".
2. Open the book's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`)
   and, under "Publication", "Publication Formats".
3. The files are listed under the format "PDF". In the row of
   "Segmentation of Vascular Ultrasound Imag.pdf", press "Open Access"
   in the "Availability" column. In "Set Terms for Downloading" choose
   "Direct Sales", type 25.00 under "Price (USD)" and press "Save".

Signing in to buy:

4. Sign out. Open "Catalog" and press the book's title
   (`/index.php/publicknowledge/en/catalog/book/14`).
5. In the side column press "Segmentation of Vascular Ultrasound
   Imag.pdf". The Login page opens.
6. On that Login page type `aclark` and `aclarkaclark` and press
   "Login".
7. Sign out and take steps 4 to 6 as `rvaca` (`rvacarvaca`), a Press
   manager.

Registering to buy:

8. Sign out and take steps 4 and 5. On the Login page press "Register".
   Fill the form (given name "Reader", family name "u69r10",
   affiliation "u69r10", country "Canada", email
   `u69r10reader@mailinator.com`, username `u69r10reader`, password
   `u69r10readeru69r10reader` twice), tick the required privacy
   consent box and press "Register".
9. Sign out and take steps 4 to 6 as `u69r10reader`, who holds the
   Reader role alone.

**Expected.** After steps 6, 7, 8 and 9 the payment page for the file:
"Manual Fee Payment", with "Title" "Segmentation of Vascular Ultrasound
Imag.pdf" and "Fee" "25.00 (USD)".

**Observed.** The Login page of step 5 shows only "Required fields are
marked with an asterisk: *" above the form. Its address carries the
file's full address:

```
/index.php/publicknowledge/en/login?source=http%3A%2F%2F127.0.0.1%3A8166%2Findex.php%2Fpublicknowledge%2Fen%2Fcatalog%2Fview%2F14%2F3%2F109
```

No step reaches the payment page:

| Step | Who | Lands on |
|---|---|---|
| 6 | `aclark`, Author and Reader | `dashboard/mySubmissions`, headed "Active submissions (1)" |
| 7 | `rvaca`, Press manager | `dashboard/editorial`, headed "Assigned to me (0)" |
| 8 | the newcomer, on "Register" | "Registration complete": "Thanks for registering! What would you like to do next?" |
| 9 | `u69r10reader`, Reader | the press's home page, `/index.php/publicknowledge/en/index` |

On "Registration complete" the newcomer is signed in. `aclark`,
already signed in, who opens the book and follows the same link gets
"Manual Fee Payment" at once.

## Cause

`CatalogBookHandler::download()` in OMP
(`pages/catalog/CatalogBookHandler.php`, line 545) sends a signed-out
buyer of a priced file to Login with a `source` it builds itself:
`$request->url(null, null, null, [$monographId, $representationId,
$bestFileId])`, a full address with scheme and host.

`LoginHandler::signIn()` in pkp-lib (`pages/login/LoginHandler.php`,
line 191) follows a `source` only when it is a path on the same site:
`preg_match('#^/\w#', $source)`. A full address fails that test, so
sign-in goes on to `_redirectAfterLogin()`. That method sends a user
to the Dashboard only when the request has no `source` at all. Here a
`source` is present, though refused, so that branch is skipped and
`PKPPageRouter::redirectHome()` chooses the home page of the user's
role.

The path rule came with a153024bc9, which closed an open redirect
through `source` (`pkp/pkp-lib#3274`). Until then sign-in followed any
`source`, and OMP's line, written in 2012, worked.

Reach:

- **"Register" on that Login page** (on screen): the link hands the
  same `source` to the Register form, and
  `RegistrationHandler::register()` (line 126) applies the same path
  rule, so the newcomer gets "Registration complete".
- **Every role** (on screen for a Reader, an Author and a Press
  manager; code for the others): the landing page is the role's home.
- **A free file on a press that requires sign-in to read** (code): the
  same method, at line 497, calls `Validation::redirectLogin()`, which
  passes the request's own `REQUEST_URI` (the path and the query
  string). That Login page returns to the file.
- **A priced file of an older version** (code): line 545 also leaves
  the `version/{id}` part out of the address it builds.
- **The Register page's "Login" link** (code):
  `lib/pkp/templates/frontend/pages/userRegister.tpl`, line 182, passes
  a full address as `source` too, and loses it the same way. That is a
  different caller in pkp-lib, in all three apps, and is not covered
  here.
- **OJS** (code): every sign-in redirect of its article and issue
  handlers goes through `Validation::redirectLogin()`.
- **OPS** (code): its pages and classes hold no redirect to Login.

## Proposed fix

Send the buyer to Login the way the same method does for a free file a
few lines above, and the way OJS does for an article for sale:
`Validation::redirectLogin()`, which passes the address that was asked
for as `REQUEST_URI`, the path with its query string
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sign-in-to-buy-file-skips-payment-page/fix.diff)):

```diff
--- a/pages/catalog/CatalogBookHandler.php
+++ b/pages/catalog/CatalogBookHandler.php
@@ -542,7 +542,7 @@
 
         // Users that are not logged in need to register/login first.
         if (!$user) {
-            return $request->redirect(null, 'login', null, null, ['source' => $request->url(null, null, null, [$monographId, $representationId, $bestFileId])]);
+            Validation::redirectLogin();
         }
 
         // They're logged in but need to pay to view.
```

The rule that a `source` is a path belongs to the Login page and stays
as it is; the caller does not follow it. The `source` it passes after
the fix also keeps the `version/{id}` part of an older version's file
and a query string such as `?inline=1`.

The diff drops the `return`. `PKPRequest::redirect()` ends the request
itself, and the call at line 497 has no `return` either.

Tried on OMP `main`: the Login page's address carried
`source=%2Findex.php%2Fpublicknowledge%2Fen%2Fcatalog%2Fview%2F14%2F3%2F109`,
and steps 6, 7, 8 and 9 each landed on "Manual Fee Payment" with "Fee"
"25.00 (USD)". With the fix and without it, a visitor who opened the
free file "The Canadian Nutrient File: Nutrient Val.pdf" got its view
page with no Login page, and a signed-in buyer got the payment page at
once.

- **Alternatives.**
  - Keeping line 545 and building the address with
    `$request->getRequestPath()` passes a path too, but without the
    query string, and is a second spelling of what
    `Validation::redirectLogin()` already does.
  - Letting `LoginHandler::signIn()` accept a full address on the
    site's own host would cover this caller and the Register page's
    "Login" link at once. It widens a check that was written to close
    an open redirect, so it is the team's call and not proposed here.
- **What goes with it.**
  - No stored data, API or hook is involved.
  - OJS passes a message to its Login page here
    (`Validation::redirectLogin('payment.loginRequired.forArticle')`,
    "Subscription or article purchase required to access item. …").
    OMP has no such sentence for the Login page; adding one is a
    wording decision and not part of this fix.
  - The same line is in 3.5 and 3.4, where the diff's change applies
    as written. On 3.3 it is a brace-less one-liner with `array()`
    (`CatalogBookHandler.inc.php`, line 328), so the same one call is
    ported by hand. `Validation::redirectLogin()` exists on each.
  - The guard is an e2e check that signing in from a priced file's
    Login page lands on the payment page (spec U69, a **Planned**
    item).

Small: one line in one handler, following the call the same method
already makes.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sign-in-to-buy-file-skips-payment-page/walk.js),
  with its helpers in `lib.js` beside it and in
  `priced-file-link-price-twice-or-missing/lib.js`. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/sign-in-to-buy-file-skips-payment-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It ends with the
  control and the free file's link, which are the fix's neighbour
  checks, and it ticks the Register form's privacy consent box.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/sign-in-to-buy-file-skips-payment-page/fix.diff omp`
  and the same walk, then reverted.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets 92050d9 (2026-10-01).
  3.5 showed the same four landings.
- The free file's view page logged a server error on `main` in each
  walk, which is `jardakotesovec/pkp-e2e#282`.
- Tips: OMP `main` 3b0ecf794 (pkp-lib 3dc90c81a6), `stable-3_5_0`
  b24879c3d (pkp-lib 1fb843f491), `stable-3_4_0` 0aec65441 (pkp-lib
  df13621c2d), `stable-3_3_0` 8e72fc883 (pkp-lib d446601ebe).
- Code reads:
  - `CatalogBookHandler::download()` on each branch: the redirect with
    the built `source` is at line 545 on `main`, 478 on 3.5, 462 on 3.4
    and 328 on 3.3.
  - `LoginHandler::signIn()` on each branch: the `#^/\w#` test is at
    line 191 on `main`, 161 on 3.5, 157 on 3.4 and 109 on 3.3.
  - `LoginHandler::_redirectAfterLogin()`,
    `RegistrationHandler::register()` and
    `Validation::redirectLogin()` on `main`.
  - `git log -L` on the `preg_match` line for a153024bc9, whose diff
    replaced `isset($source) && !empty($source)`; the GitHub API's
    `commits/<sha>/pulls` for its pull request. `git log -S` on OMP's
    line: written in b391f42d4 (2012-03-30) and only reformatted since.
  - Every `'source' =>` and `source=` in OMP, its pkp-lib and its
    plugins, and every `redirectLogin` and `'login'` redirect in OJS's
    and pkp-lib's pages and classes, for the other callers.
- Not driven: a Reviewer's and a Site Administrator's landing, and
  sign-in before the 2018 change.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/omp and pkp/ui-library
  for the login redirect, `source`, purchase, payment, direct sales and
  `CatalogBookHandler`. `pkp/pkp-lib#3274` is the closed issue the
  path rule was made for; no issue or pull request is about this
  landing.
