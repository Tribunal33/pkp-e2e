# On a press, a book address that names no book opens the Login page instead of "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** for `pkp/pkp-lib#772` · [8070e9ab28](https://github.com/pkp/pkp-lib/commit/8070e9ab28441d056c5a07377bf32e1f3dcc402f) · 2017-02-15 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#772` (closed), "Respond to nonexistent monographs with a 404": its fix reached pkp-lib's submission policy, not the policy behind a press's book address
- **Tracked in** spec U69 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press, a visitor who opens a book address with a number or URL
Path the press does not have is sent to the Login page. A visitor who
signs in there, like anyone already signed in, gets an error page
instead: its heading is empty, its browser tab reads "| {press name}",
and its text is "An invalid published submission was specified.". In
both cases the answer should be "404 Not Found".

Nothing is lost, since there is no book to show. But a mistyped or
stale link asks the visitor to sign in for something that does not
exist, and a crawler is redirected instead of being told the address
is gone.

The press already answers "404 Not Found" in the neighbouring case, an
unpublished book's address opened by a visitor. A journal and a
preprint server answer "404 Not Found" for this case, an article or
preprint address that names nothing.

## Impact

- **Lost.** The right message and status.
- **Who.** Anyone who opens a press's book or book-file address that
  names no book: a reader with a mistyped link, a crawler. The press's
  own screens do not turn a working book address into such an address:
  an unpublished book answers "404 Not Found", a book's earlier URL
  Path still finds the book, and the dashboard deletes only incomplete
  submissions, which never had a public page. Only a book deleted
  through the REST API leaves its old address in this state.
- **Way round.** None needed: the catalog and every existing book's
  address work.

Low: there is no book to show, so no page or task is missing. It would
be medium if a screen let a press delete a published book, or if a link
the application itself offers led to such an address.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`: the press
  `publicknowledge`, "Public Knowledge Press". No book has the number
  999999 or the URL Path `no-such-book`.

Signed out:

1. Open `/index.php/publicknowledge/en/catalog/view/999999/1/1`, a file
   address under a book number the press does not have.
2. Open `/index.php/publicknowledge/en/catalog/book/no-such-book`.
3. Open `/index.php/publicknowledge/en/catalog/book/999999`.
4. On the Login page that step 3 opened, type `dbarnes` and
   `dbarnesdbarnes` and press "Login".

Signed in:

5. Open `/index.php/publicknowledge/en/catalog/book/no-such-book`.

**Expected.** Steps 1, 2, 3 and 5 each show "404 Not Found" (status
404), so step 3 opens no Login page to sign in on.

**Observed.** Steps 1 to 3 land on the Login page, browser tab "Login |
Public Knowledge Press". Step 4 returns to the address of step 3 and
lands on an error page, and step 5 lands on the same page. Its heading
is empty and its browser tab reads "| Public Knowledge Press"; under
the breadcrumb "Home /" it reads "An invalid published submission was
specified.".

```
302 /index.php/publicknowledge/en/catalog/book/999999          (step 3; steps 1 and 2 alike)
200 /index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fcatalog%2Fbook%2F999999

302 /index.php/publicknowledge/en/login/signIn                 (step 4)
302 /index.php/publicknowledge/en/catalog/book/999999
200 /index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.invalidPublishedSubmission

302 /index.php/publicknowledge/en/catalog/book/no-such-book    (step 5)
200 /index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.invalidPublishedSubmission
```

Control: on the same press `…/catalog/book/1`, an unpublished book,
shows "404 Not Found" to a visitor. On a journal
`/index.php/publicknowledge/en/article/view/999999`, and on a preprint
server `/index.php/publicknowledge/en/preprint/view/999999`, show "404
Not Found" (status 404), signed out and as `dbarnes`.

## Cause

`CatalogBookHandler::authorize()` (omp
`pages/catalog/CatalogBookHandler.php`, line 72) adds
`OmpPublishedSubmissionAccessPolicy`, a policy set whose constructor
adds one policy, `OmpPublishedSubmissionRequiredPolicy`
(`classes/security/authorization/OmpPublishedSubmissionRequiredPolicy.php`).
That policy looks the book up: its `dataObjectEffect()` returns
`AUTHORIZATION_DENY` when the address holds no ID (line 56) or the
press has no submission with that number or URL Path (line 65).

A plain denial is answered as an access refusal.
`PKPPageRouter::handleAuthorizationFailure()` (pkp-lib, lines 381–391)
sends a visitor to Login and a signed-in user to
`user/authorizationDenied` with the policy's message key. That page
(`frontend/pages/message.tpl`) is given no page title, hence the empty
heading and tab.

A missing object is not an access question, and a policy can say so:
it sets a "call on deny" advice, which
`AuthorizationDecisionManager::_decidePolicySet()` hands back from the
denying policy, also from inside a policy set, and runs instead of the
refusal. `pkp/pkp-lib#772`, "Respond to nonexistent monographs with a
404", was closed by 8070e9ab28, which gave pkp-lib's
`SubmissionRequiredPolicy` such an advice (then
`Dispatcher::handle404()`; since `pkp/pkp-lib#10027` it throws
`NotFoundHttpException`, as `PublicationRequiredPolicy` does too).

That fix missed the address its title names. A press's book address was
never checked by `SubmissionRequiredPolicy`: OMP's policy extends
`DataObjectRequiredPolicy` directly, as it did in 2017 (then named
`OmpPublishedMonographRequiredPolicy`), and it got no advice.

The handler shows the intent: `book()` lines 96–105 read "Serve 404 if
no submission available" and test `!$submission`, which is never true
there, because the policy has already refused the request. The rest of
that test answers 404 for an unpublished book, since the policy lets
any existing submission through.

OJS and OPS do not use a policy for this: `ArticleHandler::initialize()`
and `PreprintHandler::initialize()` look the submission up themselves
and throw `NotFoundHttpException`.

Reach:

- **Every `catalog` address that names a book** (on screen for `book`
  and `view`; `download` in the code): `book`, `view` and `download`
  share `authorize()`, so chapter, version and file addresses under a
  missing book answer the same.
- **Every role** (on screen for a visitor and the Press editor): the
  policy does not look at the user.
- **`catalog/book` with nothing after it** (code): line 56 denies it
  the same way.
- **A deleted book's address** (code): the policy finds no submission.
  The dashboard's "Delete Incomplete Submissions" offers only
  incomplete submissions (ui-library `useDashboardBulkDelete.js`); the
  REST API lets a manager delete any
  (`Repo::submission()->canCurrentUserDelete()`).
- **Not this fault:** a book's earlier URL Path. The policy finds the
  book through any of its versions, and what follows is its own report
  ([U69-A16-earlier-url-path-server-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A16-earlier-url-path-server-error.md)).
- **`CoverHandler`** (omp `controllers/submission/CoverHandler.php`;
  code): the only other handler that adds the same policy set. No page
  requests it: the one template that builds its address,
  `templates/controllers/monographList/coverImage.tpl`, is included by
  no other.
- **OJS, an issue address that names no issue** (code, not walked):
  `OjsIssueRequiredPolicy` sets no advice either, so `IssueHandler`
  answers with the same two pages. That policy has two refusals behind
  one answer: a missing issue, and an unpublished issue for a role that
  may not preview it, where Login suits a visitor. One advice cannot
  serve both, so it is left out of this report and its fix.

## Proposed fix

Give OMP's policy the advice `SubmissionRequiredPolicy` and
`PublicationRequiredPolicy` carry, word for word
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-book-address-asks-sign-in/fix.diff)):

```diff
--- a/classes/security/authorization/OmpPublishedSubmissionRequiredPolicy.php
+++ b/classes/security/authorization/OmpPublishedSubmissionRequiredPolicy.php
@@ -41,6 +41,13 @@
     {
         parent::__construct($request, $args, $submissionParameterName, 'user.authorization.invalidPublishedSubmission', $operations);
         $this->context = $request->getContext();
+
+        // An address that names no book of the press has no page: answer 404,
+        // as SubmissionRequiredPolicy does
+        $this->setAdvice(
+            AuthorizationPolicy::AUTHORIZATION_ADVICE_CALL_ON_DENY,
+            fn () => throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException()
+        );
     }
```

The policy owns the rule "this address names a book of the press", and
both of its denials mean "no such book", so every operation of the
handler is covered in one place.

The never-true `!$submission` test in `book()` (line 100, with the
first line of its comment) can go in the same change, since the policy
now answers that case; the tried diff leaves it, and it does no harm
where it is.

Tried on OMP `main`: steps 1, 2, 3 and 5 each showed "404 Not Found"
(status 404), and step 3 opened no Login page. With the fix in and out,
a published book's address showed the book, an unpublished book's
address showed "404 Not Found" to a visitor and its preview to
`dbarnes`.

- **Alternatives.**
  - Looking the book up in `CatalogBookHandler` itself, as
    `ArticleHandler::initialize()` does, and dropping the policy: the
    same result with three methods rewritten.
  - Changing `PKPPageRouter::handleAuthorizationFailure()` would touch
    every real access refusal in the three apps.
- **What goes with it.**
  - No stored data is involved.
  - `CoverHandler` would answer 404 instead of a JSON refusal for an
    unknown ID (code, not tried).
  - Backport: the diff applies as written to `stable-3_5_0`, where the
    constructor is the same (not tried there).
  - The guard: an e2e check in spec U69 that a book address naming no
    book answers "404 Not Found", signed out and signed in (a
    **Planned** item).

Small: one statement in one OMP policy, copying its pkp-lib siblings,
with no data repair.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-book-address-asks-sign-in/walk.js),
  takes steps 1 to 5 on OMP and the control addresses on OJS and OPS,
  on installs freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/unknown-book-address-asks-sign-in/walk.js`.
  `WALK=neighbour` in front takes the neighbour check on OMP:
  `catalog/book/5` (published), `catalog/book/1` (unpublished) signed
  out, then `catalog/book/1` as `dbarnes`.
- The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, the script in both modes
  on OMP, then `revert`. With the fix in, step 4 has no Login page, so
  the script signs `dbarnes` in at the press's own Login address before
  step 5.
- Walked on `main` and `stable-3_5_0` (OMP, with the OJS and OPS
  controls), on PostgreSQL; nothing here depends on the database (MySQL
  not checked). Datasets: pkp/datasets 92050d9 (2026-10-01). On 3.5 the
  steps and the controls were answered exactly as on `main`. The server
  log stayed empty on every walk.
- Tips:

  | Line | OMP | its lib/pkp | OJS | OPS |
  |---|---|---|---|---|
  | `main` | 3b0ecf794c | 3dc90c81a6 | 4408b94def | c8af945bb7 |
  | `stable-3_5_0` | b24879c3db | 1fb843f491 | 18d097d94e | 3f0919468c |
  | `stable-3_4_0` | 0aec65441 | df13621c2d | not read | not read |
  | `stable-3_3_0` | 8e72fc883 | d446601ebe | not read | not read |
- Code reads:
  - `main`: `CatalogBookHandler::authorize()`, `book()` and
    `download()`; `OmpPublishedSubmissionAccessPolicy` and
    `OmpPublishedSubmissionRequiredPolicy`; pkp-lib
    `DataObjectRequiredPolicy`, `SubmissionRequiredPolicy`,
    `PublicationRequiredPolicy`,
    `AuthorizationDecisionManager::_decidePolicySet()`,
    `PKPPageRouter::handleAuthorizationFailure()`,
    `PKPUserHandler::authorizationDenied()`,
    `LoginHandler::signIn()` (it redirects to `source`) and
    `frontend/pages/message.tpl`; OJS `ArticleHandler` and OPS
    `PreprintHandler`, `authorize()` and `initialize()`; a search of
    the three apps and pkp-lib for subclasses of
    `DataObjectRequiredPolicy` and for the "call on deny" advice (only
    the two pkp-lib policies set it; of the others, only OMP's and
    OJS's `OjsIssueRequiredPolicy` gate a reader page); a search of OMP
    for users of `CoverHandler` and `coverImage.tpl`;
    `Repo::submission()->canCurrentUserDelete()`,
    `PKPBackendSubmissionsController`'s delete and ui-library's
    `useDashboardBulkDelete.js` (it offers a submission only while its
    `submissionProgress` is set).
  - 3.5: the policy's constructor and `dataObjectEffect()` are the same
    as on `main`; pkp-lib's `SubmissionRequiredPolicy` carries the
    advice.
  - 3.4: the policy (`.php`) has the same constructor and
    `dataObjectEffect()`, and `PKPPageRouter::handleAuthorizationFailure()`
    the same two redirects.
  - 3.3: the policy (`.inc.php`) sets no advice either, and
    `handleAuthorizationFailure()` is the same. Its `dataObjectEffect()`
    also denies a book that is not published, so there an unpublished
    book's address is answered the same way as a missing one.
- Introduced and Kind: `pkp/pkp-lib#772` (opened 2015-09-24, milestone
  "OMP 3.1", motivated by removing content from Google Scholar) was
  closed on 2017-02-16 with "Solved much more simply", the day after
  8070e9ab28, a commit without a PR whose only change is the advice in
  `SubmissionRequiredPolicy`; no OMP commit of that time names #772.
  OMP's handler at that date added `OmpPublishedMonographAccessPolicy`,
  whose required policy extended `DataObjectRequiredPolicy`. The issue
  does not name an address; "intention gap" reads its title as the
  book's public address, which its motive needs. The policy itself is
  older: `git log --follow` ends at omp eae957837 (`pkp/pkp-lib#1527`,
  2016-07-13), and the history before that was not read.
- Tracker search (2026-10-01): pkp/pkp-lib and pkp/omp, issues and PRs,
  by symptom ("catalog book 404 login redirect nonexistent", "OMP book
  not found login instead of 404", "missing book address login page not
  found", "invalid published submission was specified") and by the code
  (`OmpPublishedSubmissionRequiredPolicy`, `invalidPublishedSubmission`,
  "authorizationDenied catalog book"). The searches did not return
  #772; it was found from the pkp-lib policy's history.
  `pkp/pkp-lib#5299`, the one hit on the class, asked for the book
  preview (closed). pkp/omp's `main` on GitHub has no advice in the
  policy.
- Not driven: a `download`, chapter or version address under a missing
  book; `catalog/book` without an ID; a deleted book's address; a
  published book unpublished again (the control's book 1 was never
  published; `book()` tests the status alike); a Reader or an author
  account; `CoverHandler`; OJS's issue address; the fix on 3.5; 3.4 and
  3.3.
