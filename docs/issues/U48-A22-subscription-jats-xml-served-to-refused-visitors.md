# On a subscription journal, the article page's "JATS XML" gives the article's text to visitors its galleys refuse

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (no public "JATS XML" link)
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/pkp-lib#12286` with `pkp/ojs#5313`, for `pkp/pkp-lib#10436` · [5f5066e1f6](https://github.com/pkp/pkp-lib/commit/5f5066e1f614408977d1e63d707bf4ca1420cb3a) and [5f24ac954d](https://github.com/pkp/ojs/commit/5f24ac954ddecf25b98bfce5b63f6fd94aa080c4) · 2026-02-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U48 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a22)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)

## Summary

Each article version has a "JATS XML" page in the editorial workflow
(Publication › "JATS XML"). Its tick box "Make available with
publication" is off by default. An editor who ticks it puts a "JATS
XML" link beside the galleys on the article's page once the version is
published.

On a journal that requires subscriptions, that link downloads for a
signed-out visitor and for a reader with no subscription, even in a
restricted issue whose galleys send them to the Login or
"Subscriptions" page. The XML carries the article's text whenever there
is text to carry: an uploaded JATS file in full, or a body generated
from an HTML galley. The link should show and download only for those
who may open the galleys.

The only way to close it is to untick the box. The "Enable JATS XML
Download" window that confirms the tick says only that the file becomes
available "for public download when the publication is published", not
that this bypasses subscriptions.

## Impact

- **Lost**: the journal's control over its paid content. The full text
  of a restricted article goes to every visitor, harvester and search
  engine that follows the link, and no one at the journal is told.
- **Who**: journals in subscription mode (a publishing mode a journal
  chooses; open access is the default), on each article whose editor
  ticked the box, when the version has an HTML galley or an uploaded
  JATS file with a body. A version with only PDF galleys gives a JATS
  XML without the text.
- **Way round**: untick the box on every restricted article's "JATS
  XML" page, which takes the JATS XML from subscribers too.

High: the restriction a subscription journal sells fails for every
ticked article, with no way to keep the XML for subscribers alone. It is
not critical because the box is off until an editor ticks it, article
by article.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`.
- A small HTML file of the article's text, `sxx2-article.html`:
  ```html
  <!DOCTYPE html><html><head><title>sxx2 full text</title></head><body><h1>sxx2 full text</h1><p>sxx2 This paragraph is the article's full text, for subscribers only.</p></body></html>
  ```

As `dbarnes`, the editor:
1. Sign in as `dbarnes`.
2. Settings › Distribution › "Access": set "Publishing Mode" to "The
   journal will require subscriptions to access some or all of its
   contents." and press "Save".
3. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   set "Access Status" to "Subscription" and press "Save".
4. Open submission 5, "Genetic transformation of forest trees"
   (Production). Publication › "Galleys" › "Add galley": label "HTML",
   component "Article Text", upload `sxx2-article.html`, finish.
5. Publication › "JATS XML": tick "Make available with publication",
   then "Confirm" in the "Enable JATS XML Download" window.
6. "Schedule For Publication": "Assign To Current/Back Issue", "Vol. 1
   No. 2 (2014)", "Confirm", then "Publish".

As a visitor, signed out:
7. Sign out. "Archives" › "Vol. 1 No. 2 (2014)" › "Genetic
   transformation of forest trees".
8. Press "HTML".
9. Back on the article page, press "JATS XML".

As a reader without a subscription:
10. Sign in as `ccorino` (Reader, not an author of this article, no
    subscription). Stay signed in, open the article as in step 7, and
    repeat steps 8 and 9.

**Expected**: the galley and the JATS XML follow the same rule. Neither
the visitor nor `ccorino` may open "HTML", so neither is offered "JATS
XML", and its address refuses them.

**Observed**: the article page lists "HTML", marked restricted, and
"JATS XML", unmarked, for both. "HTML" sends the visitor to the Login
page (`login?…&loginMessage=reader.subscriptionRequiredLoginText`), and
sends `ccorino` to "Subscriptions", which leads on to the journal's home
page because payments are not set up. "JATS XML" downloads
`submission-5-publication-6-jats.xml` for both:

```
200 GET /index.php/publicknowledge/api/v1/submissions/5/publications/6/jats/download
Content-Type: application/xml; charset=utf-8
Cache-Control: no-cache, public
Content-Disposition: attachment; filename="submission-5-publication-6-jats.xml"
```

The file's `<body>` holds the galley's text: "sxx2 full text" and
"sxx2 This paragraph is the article's full text, for subscribers only."

## Cause

`PKPJatsController::publicDownload()` (lib/pkp
`api/v1/jats/PKPJatsController.php`) checks only the version's
`jatsPublicVisibility` and, for an unpublished version,
`Repo::submission()->canPreview()`. The route's only middleware is the
"must log in" redirect of `restrictArticleAccess`. Once the version is
published, the controller serves the XML to every requester. It never
asks the question OJS asks before serving a galley:
`ArticleHandler::userCanViewGalley()` and the article page's `hasAccess`
use `IssueAction::subscriptionRequired()`, the version's `accessStatus`,
`subscribedUser()`, `subscribedDomain()` and the issue and article
purchases. That decision is OJS code, which pkp-lib cannot call, and
OJS routes the endpoint straight to the pkp-lib class
(`api/v1/submissions/index.php`).

On the page, OJS `ArticleHandler::view()` assigns `jatsDownloadUrl`
whenever `jatsPublicVisibility` is set, and `article_details.tpl`
renders the link beside the galleys without the restricted mark.

Both came in with the public download, which `pkp/pkp-lib#10436`
designed as "publicly (no login or editorial access required)",
presented "alongside the rest of the galleys". Subscriptions were not
considered. `pkp/pkp-lib#12728` later made the download follow the
"must log in" setting. Its thread asked whether galley-like rules should
apply, and called them out of scope.

Reach:
- The address alone is enough: opened directly, it served the text to
  both readers (checked on screen), so hiding the link does not close
  it.
- Every source of text: an uploaded JATS file is served whole; a
  generated one takes its `<body>` from an HTML galley, or from a PDF
  only when a PDF text helper is configured (the `jatsTemplate`
  plugin's `ArticleBody::create()`, checked in the code). That method
  reads the galleys of the article's current version whatever version
  is requested, which is
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a6),
  a separate report.
- The other copies of the JATS XML: the "JATS Metadata Format" for
  OAI-PMH already refuses a restricted issue's articles
  (`OAIMetadataFormat_JATS::toXml()`); the `jatsTemplate` plugin's
  download handler serves managers and subscription managers only; the
  "Body Text" API is role-gated (checked in the code).
- OMP and OPS do not register the JATS route and have no subscriptions
  (checked in the code).

## Proposed fix

Give the pkp-lib controller one question to ask before it serves a
published version, and let OJS answer it with the rule the article page
already uses
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-jats-xml-served-to-refused-visitors/fix.diff)):

- lib/pkp `PKPJatsController`: a protected `canReadPublished(PKPSubmission,
  PKPPublication): bool` that returns `true`. In `publicDownload()`,
  after the visibility and preview checks and before the content is read
  or the ETag compared, a published version that fails it gets 403
  `api.403.unauthorized`.
- OJS: a new `APP\API\v1\jats\JatsController extends PKPJatsController`
  that answers `canReadPublished()` from a new
  `IssueAction::userCanReadArticle()`. `api/v1/submissions/index.php`
  routes `jats` to it instead of the pkp-lib class, as it already
  routes the submission endpoints to OJS's `SubmissionController`.
- OJS `IssueAction::userCanReadArticle()` holds the decision that
  `ArticleHandler::view()` computes inline today as `hasAccess`: no
  issue, no subscription required, open access, a subscribed user or
  domain, or a paid issue or article purchase. `view()` uses it for
  `hasAccess` and assigns `jatsDownloadUrl` only when it holds, so the
  link and the address cannot disagree.

```php
// lib/pkp/api/v1/jats/PKPJatsController.php, publicDownload()
if ($isPublished && !$this->canReadPublished($submission, $publication)) {
    return response()->json(['error' => __('api.403.unauthorized')], Response::HTTP_FORBIDDEN);
}
```

**Which version is checked.** The check runs on the requested version:
its issue and its "Open Access" status decide, and it is that version's
uploaded file that is served. A generated body, however, comes from the
current version's galleys (A6). Until A6's fix passes the requested
version to `ArticleBody::create()`, an older version that passes the
check (one set to open access while the current one is restricted)
still serves the current version's text. A6's fix closes that gap; this
fix does not repeat it.

**How it differs from the galleys' rule.** `userCanReadArticle()` keeps
`hasAccess` as it is, so the page shows the same thing it does today.
It differs from `userCanViewGalley()`, the rule the galleys follow, in
three ways, all of which exist today between the page and the galleys:
- Association membership: `userCanViewGalley()` lets a paid-up member
  in while a membership or article fee is set; `hasAccess` does not, so
  the member would be refused the XML though the galleys open.
- "Restrict only PDF": while an article or membership fee is set,
  `userCanViewGalley()` opens non-PDF galleys to everyone; `hasAccess` ignores it, so the XML stays restricted while
  the HTML galley it is built from is free. Opening the XML there would
  give away an uploaded JATS file, which is the full text the journal
  sells as PDF, so restricting is the safer default; the team may rule
  otherwise.
- Issue purchases: `hasAccess` counts a paid issue purchase even after
  the issue fee is turned off; `userCanViewGalley()` only while it is
  set.

Adding membership to `userCanReadArticle()` would align the first for
the page and the XML at once; it is left out of the tried diff because
it changes what the page shows members.

**With the U51 A30 fix.**
[pkp-e2e#924](https://github.com/jardakotesovec/pkp-e2e/issues/924)
(galleys of an article published with no issue open to all) changes the
same two OJS files: it makes `IssueAction::subscriptionRequired()` take
a null issue (an article without an issue follows the journal's
publishing mode) and edits the same `hasAccess` block that this fix
moves. The two should land as one change sharing
`userCanReadArticle()`. With A30's nullable `subscriptionRequired()`,
`userCanReadArticle()` drops its `!$issue` early return and calls
`subscriptionRequired($issue, $journal)` directly, and passes
`$issue?->getId()` on; otherwise the XML of an article without an issue
would stay open after A30 closes its galleys.

Tried on `main` with the Steps and a set of controls. With the fix in,
the visitor and `ccorino` are offered only "HTML", and the address
answers 403 `{"error":"You are not authorized to access the requested
resource."}`. The controls gave the same results with the fix in and
out. On an open journal, the visitor still downloads the XML. On the
restricted issue, three readers still open "HTML" and download "JATS
XML": the article's author `ddiouf`, `dbarnes`, and `zwoods` as a
subscriber. For `zwoods`, `dbarnes` first set up payments (Settings ›
Distribution › "Payments": enabled, "US Dollar", "Manual Fee Payment"),
created a subscription type under "Payments" › "Subscription Types"
("Online Year sxx2", individual, online, 40 USD, 12 months), then
created an "Active" individual subscription for `zwoods` from
2026-01-01 to 2027-12-31 under "Payments" › "Individual Subscriptions".

**Alternatives**:
- A hook in pkp-lib that OJS registers: it works, but an app subclass of
  the pkp-lib controller is how OJS already specialises the submission
  and DOI endpoints.
- Reuse `userCanViewGalley()` itself: it redirects and exits rather
  than answering, so an API cannot call it.

**What goes with it**:
- Consider `Cache-Control: private` for a restricted article's answer
  instead of `public, no-cache`, so that a shared cache never stores a
  subscriber's copy.
- The guard: an OJS e2e scenario on the subscription spec (a restricted
  article with the box ticked: refused signed out and for a reader
  without a subscription, served to a subscriber), and a unit test of
  `userCanReadArticle()`.
- No stored data to repair; no backport.

Medium: two repos (an extension point in pkp-lib; a controller, an
access method and the article page in OJS), and it must be merged with
A30's change to the same OJS method.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-jats-xml-served-to-refused-visitors/walk.js),
  helpers in `lib.js` beside it:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-jats-xml-served-to-refused-visitors/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `WALK=nb` for the
  controls of the fix trial).
- Walked on `main` and `stable-3_5_0` (OJS) on PKP's default dataset
  (pkp/datasets 58f1d08, 2026-10-05), on PostgreSQL.
- The generated `<body>` shows the galley's `<p>` markup as escaped
  text; that is [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a7),
  a separate report.
- 3.5, walked: steps 2 to 4 and 6 to 10 as on `main`. The article page
  lists only "HTML", which refuses the visitor and `ccorino` as on
  `main`. The address `…/jats/download` answers 500 with `{"error":"The
  route …/jats/download could not be found."}`: the route does not
  exist there. The script could not reach the "JATS XML" page on 3.5,
  so the absence of the tick box there rests on the code read below.
- Tips:
  - `main`: OJS 1f4cef786f, lib/pkp a7f5e3081b, lib/ui-library 64d67363.
  - `stable-3_5_0`: OJS 4342473090, lib/pkp 771474347e.
  - `stable-3_4_0`: OJS d68934d0d1, lib/pkp 767353f4fe.
  - `stable-3_3_0`: OJS ac77c9fb35, lib/pkp ac3fa73402.
- Code reads:
  - `main`: `PKPJatsController` (`getGroupRoutes()`, `authorize()`,
    `publicDownload()`); OJS `ArticleHandler::view()` and
    `userCanViewGalley()`, `IssueAction`, `article_details.tpl`,
    `api/v1/submissions/index.php`; `OAIMetadataFormat_JATS::toXml()`;
    `jatsTemplate` `ArticleBody::create()` and
    `JatsTemplateDownloadHandler`; `PKPBodyTextController` routes; OMP
    and OPS `api/v1/submissions/index.php` (no `jats`).
  - Blame: `publicDownload()` and the `jatsDownloadUrl` assignment lead
    to 5f5066e1f6 (pkp-lib) and 5f24ac954d (OJS); later commits there
    (1f8d75314b, e22a22fc78, 1aab069980 for `pkp/pkp-lib#10405`;
    3ce03ceafe, 7bec8ae39e for `pkp/pkp-lib#12728`; 33822e50e3 usage
    events) did not touch the access decision for published versions.
  - 3.5: `PKPJatsController` has only the role-gated `get`, `add` and
    `delete` routes, no `jatsPublicVisibility`; OJS `ArticleHandler` and
    `article_details.tpl` have no JATS link.
  - 3.4 and 3.3 (`git show upstream/stable-3_x_0` in the OJS checkout,
    `origin/stable-3_x_0` in lib/pkp): no JATS files in either tree.
- Not driven: institutional subscriptions, issue and article purchases,
  delayed open access, an article set to open access in a restricted
  issue, and an uploaded JATS file (the code serves it through the same
  check).
