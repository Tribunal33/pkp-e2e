# Any dead link, reader pages and old workflow links alike, shows a bare "404 Not Found" page

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [c2825b8453](https://github.com/pkp/pkp-lib/commit/c2825b84535335a83c19ed7de786e346b243ffda) (2009-07-17)
- **Upstream** `pkp/pkp-lib#13084` (open; fix in PRs `pkp/pkp-lib#13085` for 3.3 and `pkp/pkp-lib#13087` for 3.5, not yet merged; no PR for `main`). This report adds the walk on today's `main` and 3.5, a fix tried on `main`, and a fault in `pkp/pkp-lib#13087`: its change, tried on `main`, answered status 200
- **Tracked in** spec U24 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Someone who follows a link to something the site no longer has gets a
page that reads only "404 Not Found". It has none of the site's header
or menus, no explanation and no link, so the only way on is the
browser's back button.

A reader meets it on a dead link to an article, a preprint or a page.
An editor or author meets it on an older workflow link to a submission
that has since been deleted. The dashboard's link to the same
submission does better: it opens the dashboard and says "Invalid
submission." in a dialog. Nothing is lost either way, but the bare page
looks as if the site had broken.

The older workflow link survives only in bookmarks and in email sent
before the upgrade to 3.5. For a deleted submission, the older
addresses that name a workflow stage show a blank page instead, a
separate fault.

## Impact

- **Lost**: the way on from the page. No content and no work.
- **Who**: any reader on a dead link, with every theme, which is the
  common case. Rarely, an editor, author or visitor on an older
  workflow link to a deleted submission.
- **Way round**: the browser's back button, or typing the site's
  address.

Low: the message is true and no task fails. It would be medium if the
page stood in for content that exists; none of the walked addresses
does that.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (journal, press or preprint
  server `publicknowledge`). Nothing else.
- The submission the steps delete. "Delete" shows on a declined
  submission only. On the journal: 18, "Self-Organization in
  Multi-Level Institutions in Networked Environments", declined in the
  dataset. On the preprint server: 4, "Genetic transformation of forest
  trees", declined in the dataset. On the press: 3, "The Political
  Economy of Workplace Injury in Canada", which step 2 declines.
  `dbarnes` is not assigned to it and needs no assignment: as Press
  editor he is offered "Decline Submission" as the dataset stands.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), with the browser's
   network panel open.
2. On the press only: open submission 3 from the dashboard, press
   "Decline Submission", then "Record Decision".
3. Type the submission's older workflow address,
   `/index.php/publicknowledge/en/workflow/access/18` (`…/3` on the
   press, `…/4` on the preprint server). It forwards to the dashboard
   with the submission's workflow open.
4. In the workflow press "Delete", then "Confirm". On the preprint
   server choose "Production" in the workflow's menu first.
5. Type the address of step 3 again.
6. Type the dashboard's address for the same submission,
   `…/dashboard/editorial?workflowSubmissionId=18` (`…=3` on the press,
   `…=4` on the preprint server).
7. Sign out and type the address of step 3 once more.
8. Still signed out, type a reader address that names nothing:
   `…/article/view/999999` on the journal, `…/preprint/view/999999` on
   the preprint server, `…/nosuchpage` on the press.

**Expected**: at steps 5, 7 and 8, a page inside the site's own header
and menus that says the address was not found, with status 404 in the
network panel.

**Observed**: at steps 5, 7 and 8 the whole page is the heading "404
Not Found": no title, no header, no menu, no link, no stylesheet. The
network panel shows status 404 and this body:

```
<h1>404 Not Found</h1>
```

Control: at step 6 the dashboard opens with the dialog "Error" /
"Invalid submission." / "OK" over it, and the header and menus stay in
reach.

## Cause

`PKPApplication::execute()` (pkp-lib `classes/core/PKPApplication.php`,
lines 377–380) is the one place that answers a
`NotFoundHttpException`. It sends the 404 header, prints
`<h1>404 Not Found</h1>` and exits. No template, and so no theme, is
involved.

The workflow address reaches it through `SubmissionRequiredPolicy`
(`classes/security/authorization/internal/SubmissionRequiredPolicy.php`,
lines 41–44), which `PKPWorkflowHandler::authorize()` adds first for
the `access` operation. When the address names no submission of this
journal, the policy's deny advice throws the exception. The 404 is the
right answer there and the policy needs no change.

Before 3.5 the same policy called `Dispatcher::handle404()`, which
printed the heading through `fatalError()`. `pkp/pkp-lib#10027`
(commits 9570593771 and 5c8f7ced5c, January 2025) turned the calls into
exceptions and kept the output.

Reach:

- Every `NotFoundHttpException` of a page request in the three apps;
  some 90 lines of OJS and its pkp-lib name the exception (code).
  Walked on `main`: an unknown article or preprint number and an
  unknown page name for a visitor, and `…/workflow/access` with no
  number or an unknown one for an editor, an author and a visitor.
- A journal path that does not exist
  (`/index.php/nosuchcontext/en/about`, walked):
  `PKPRouter::getContext()` line 205 throws the exception.
- Requests that are not pages (code, not walked): a component that
  cannot be called (`PKPRouter::_authorizeInitializeAndCallRequest()`
  line 309) and a missing file behind a file-grid download
  (`FileApiHandler` lines 113 and 119, through
  `PKPFileService::download()` lines 180 and 185). The browser shows
  the same heading if such an address is opened as a page.
- The `GoneHttpException` branch on the next lines (an invitation link
  already used or expired) sends the header "410 Gone" and prints the
  same bare heading, with the text "404 Not Found" (code, not walked).
- Who still holds a `…/workflow/access/<number>` address (code): 3.4
  and earlier put it in emails as `{$submissionUrl}`
  (`SubmissionEmailVariable::getSubmissionUrl()`) and in the submission
  lists. From 3.5 both give the dashboard's address, so on 3.5 and
  `main` only bookmarks and mail sent before the upgrade carry it.
- The addresses that name a stage
  (`…/workflow/index/<number>/<stage>`, `…/workflow/submission/<number>`)
  fail earlier for the same deleted submission: a server error and a
  blank page, the fault of
  [U71-OMP9-stage-address-without-number-blank-page.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U71-OMP9-stage-address-without-number-blank-page.md)
  (walked here after the deletion). With that fault fixed they answer
  with the bare "404 Not Found" page too.
- 3.4 and 3.3 (code): `Dispatcher::handle404()` and `fatalError()`
  print the same heading, and the `access` operation adds the same
  policy.

## Proposed fix

Recommended: for a page request, let `PKPApplication::execute()` show
the not-found message through the generic error template,
`frontend/pages/error.tpl`, which the registration and login pages
already use for their errors. This is the change of
`pkp/pkp-lib#13087` taken to `main`, kept to page requests, with the
status line it lacks
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/not-found-page-bare/fix.diff),
printed whole):

```diff
--- a/lib/pkp/classes/core/PKPApplication.php
+++ b/lib/pkp/classes/core/PKPApplication.php
@@ -17,6 +17,7 @@
 
 use APP\core\Application;
 use APP\core\Request;
+use APP\template\TemplateManager;
 use DateTime;
 use DateTimeZone;
 use Exception;
@@ -376,7 +377,9 @@
             }
         } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
             header('HTTP/1.0 404 Not Found');
-            echo "<h1>404 Not Found</h1>\n";
+            if (!$this->showNotFoundPage()) {
+                echo "<h1>404 Not Found</h1>\n";
+            }
             exit;
         } catch (\Symfony\Component\HttpKernel\Exception\GoneHttpException) {
             header('HTTP/1.0 410 Gone');
@@ -386,6 +389,34 @@
     }
 
     /**
+     * Show the not-found message inside the site's own page, so the visitor has its header and menus to go on with.
+     *
+     * @return bool false when the request is not for a page (a component or file request keeps the plain
+     *  message), or when the page cannot be built (an address that names no context: the router throws again)
+     */
+    protected function showNotFoundPage(): bool
+    {
+        try {
+            $request = $this->getRequest();
+            if (!$request->getRouter() instanceof PKPPageRouter) {
+                return false;
+            }
+            // PKPSessionGuard::sendCookies() sends the response's status with the session cookie: keep it 404.
+            app()->get(\Illuminate\Http\Response::class)->setStatusCode(404);
+            $templateMgr = TemplateManager::getManager($request);
+            $templateMgr->assign([
+                'pageTitle' => 'api.404.resourceNotFound',
+                'errorMsg' => '',
+                'errorParams' => [],
+            ]);
+            $templateMgr->display('frontend/pages/error.tpl');
+            return true;
+        } catch (\Throwable) {
+            return false;
+        }
+    }
+
+    /**
      * Get the review workflow stages used by this application.
      */
     public function getReviewStages(): array
```

- **The status.** `PKPTemplateManager::display()` calls
  `PKPSessionGuard::sendCookies()` (line 1790) before it prints the
  page. That method sends each cookie with
  `header(…, false, $response->getStatusCode())`, and the response
  object still says 200, so the 404 sent earlier is replaced. With the
  change of `pkp/pkp-lib#13087` as written, the page answered status
  200 on `main` (walked on the three apps). Setting the response's
  status first keeps the 404. 3.5 has the same call and the same
  `header()` line, so by the code the PR needs the `setStatusCode(404)`
  line there too.
- **Page requests only.** A component or file-grid request keeps the
  one-line answer, because its caller is a script that expects no HTML
  page.
- **When the plain heading stays.** For a journal path that does not
  exist, `TemplateManager::getManager()` asks the router for the
  context again, `PKPRouter::getContext()` throws again and the method
  returns false. The proposal accepts that: showing the site-level page
  there needs the router to remember the failed lookup, which belongs
  with the dedicated template below. The same `catch` hides a template
  that fails to build; it does not log, because the unknown journal
  path would then log on every visit.

Tried on `main` on OJS, OMP and OPS. Steps 5, 7 and 8 show the site's
header and menus with the heading "The requested resource was not
found.", status 404. The same for `…/workflow/access` with no number
and with an unknown one. With the fix in and out alike: a live
submission's `…/workflow/access/<number>` forwards `dbarnes` to its
workflow, another submission's author gets "You don't currently have
access to that stage of the workflow.", the dashboard's "Invalid
submission." dialog is unchanged, a published article, book and
preprint open, and the unknown journal path keeps the plain heading.

**Alternatives**

- A template of its own, `404.tpl`, with new messages, a link to the
  home page and, for a signed-in user, to the dashboard: what
  `pkp/pkp-lib#13084` proposes for `main`. It is the better page and
  can cover the unknown journal path; the fix above is its first step.
- Forwarding the `access` operation to the dashboard, whose dialog says
  "Invalid submission.". It would cover the workflow link only, and a
  visitor would be sent to Login for a submission that does not exist.

**What goes with it**

- What the fix touches: every not-found page request, on the reader's
  and the editor's side. An editor's address gets the reader-side page,
  with the signed-in user's menu in its header. A file download through
  a page address (`ArticleHandler::download()` calls
  `PKPFileService::download()`) gets the page too (code). An address of
  the `$$$call$$$` kind that names no component, typed in the browser,
  is answered by the page router and gets the page (walked). Requests
  the component router answers are left as they are (code, not
  walked).
- The 410 branch is left as it is; it can take the same method with a
  message of its own.
- The wording is a placeholder. `api.404.resourceNotFound` is the only
  existing message that fits; the template prints it as the heading and
  in the breadcrumb, over an empty description. A merge to `main` wants
  locale keys of its own.
- No data repair, no API change: the dashboard's request for the
  missing submission still answers 404 with "Invalid submission."
  (walked). A plugin on the `PKPApplication::execute::catch` hook still
  runs first.
- Backport: the diff applies as written to `stable-3_5_0`
  (`patch --dry-run`); 3.4 and 3.3 need it in
  `Dispatcher::handle404()`, as `pkp/pkp-lib#13085` does.
- Guard: an e2e scenario that types `…/workflow/access/<number>` for a
  deleted submission and an unknown article number, and expects status
  404 inside the site's header.

Medium, not small, although upstream PRs exist: they cover 3.3 and 3.5
and not `main`, the 3.5 one needs the status line, and on `main` the
change alters the page of every not-found address in three apps, wants
new locale keys for its message and a check of each theme's error
template.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/not-found-page-bare/walk.js).
  It takes steps 1 to 7 on the three apps, and the two stage-naming
  addresses after the deletion; with `MODE=nb` it runs the neighbour
  checks, step 8's addresses among them. Run on a dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/not-found-page-bare/walk.js`.
- Walked on `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). Walked on `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335, ui-library d4e01883).
  The same Observed and control on every app; no server error and no
  page script error at steps 5 to 7. Dataset: pkp/datasets e8dafbc
  (2026-10-02), PostgreSQL. The default theme only.
- Step 8 was walked on `main` only, by the neighbour run without the
  fix. On the press an unknown book number forwards a visitor to Login
  (another report's fault), so the press's step 8 uses an unknown page
  name.
- Fix trial on `main`, the printed diff applied to OJS, OMP and OPS,
  the dataset reloaded before the Steps: the Steps with the fix in,
  then the neighbour checks with the fix in and out. An earlier trial
  with the change of `pkp/pkp-lib#13087` as written is the one that
  showed status 200.
- Code reads. `main`: `TemplateManager::getManager()` calls
  `initialize()`, whose line 208 is `$request->getContext()`;
  `PKPRouter::getContext()` leaves its context unset when it throws, so
  the second call throws again. 3.5 (pkp-lib cf3f984335):
  `PKPApplication::execute()` lines 451–454 print the heading;
  `PKPTemplateManager::display()` line 1508 and
  `PKPSessionGuard::sendCookies()` line 258 are as on `main`. 3.4
  (pkp-lib `stable-3_4_0` 6f96165c90) and 3.3 (`stable-3_3_0`
  4156e50233): `Dispatcher::handle404()` calls
  `fatalError('404 Not Found')`, which echoes the `<h1>`;
  `SubmissionRequiredPolicy` sets `handle404` as its deny advice;
  `PKPWorkflowHandler::authorize()` adds the policy for `access`; 3.4's
  `SubmissionEmailVariable::getSubmissionUrl()` and
  `Repository::getUrlEditorialWorkflow()` build
  `workflow/access/<number>`, 3.5's and `main`'s the dashboard address.
- Introduced: `handle404()` with `fatalError('404 Not Found')` is in
  c2825b8453 (2009) and moved to the Dispatcher in 748eba1c35 (2010);
  the history before was not read.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp; issues and PRs, open
  and closed; pkp/ui-library not searched, the fault is on the server)
  by the symptom's words, `handle404` and `NotFoundHttpException`.
  `pkp/pkp-lib#13084` and the diffs of its two PRs were read; both PRs
  are open and unchanged since 2026-07-23.
- Not driven, read in the code only: a request the component router
  answers with the exception, with and without the fix; a missing file
  behind a download address; the 410 branch; a plugin on the
  `PKPApplication::execute::catch` hook; a theme other than the
  default; the fix on 3.5.
- Unverified: that `pkp/pkp-lib#13087` answers status 200 on 3.5 as its
  change did on `main` (the code path is the same).
