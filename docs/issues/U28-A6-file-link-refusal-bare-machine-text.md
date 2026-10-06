# A file link opened after signing out, or without access to the file, shows one line of machine text

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [31106b7537](https://github.com/pkp/pkp-lib/commit/31106b7537751974abf937a3a8996fd9132046c8) (2010-09-07)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A file's name in the workflow's file lists and in a reviewer's review
request is a link that downloads the file. When the person who opens
that link is signed out, or is signed in without access to the file,
the browser shows a page with no header or menu and one line of
machine text: the refusal as raw JSON, with "The current role does not
have access to this operation." inside it. They expect the login page
when signed out, and the access-denied page otherwise.

The ordinary way to meet it is a session that ended while the workflow
stayed open: pressing a file's name then shows that line, in a new tab
or in place of the page they were on, and nothing says to sign in
again.

An account without access (a reviewer with no assignment on the
submission who is given the link) is rightly refused. Only the form of
the refusal is wrong. That form is shared by every address of the older
kind the screens' scripts call, not only file links, so the fix changes
one shared answer.

## Impact

- **Lost**: nothing. No file is given to anyone who should not have it.
- **Who**: an editor, assistant, author or reviewer who presses a
  file's name after their session ended, or opens a file link somebody
  sent them while signed out.
- **Way round**: sign in again and press the name again. The line of
  text does not say so.

Low: the only fault is the page shown on a refusal.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install. Nothing else.
- Journal: submission 12, "Sodium butyrate improves growth performance
  of weaned piglets during the first period after weaning", is in
  Review. `jjanssen` (Julie Janssen) has a review request on it,
  `amccrae` (Aisla McCrae) is a Reviewer with no assignment on it, and
  `dbarnes` is its editor.
- Press: submission 17, "Open Development: Networked Innovations in
  International Development", in Internal Review, with `jjanssen` and
  `amccrae` as on the journal. Nobody is assigned to it as editor:
  `dbarnes` opens it as Press editor, from "Active submissions".
- Preprint server: preprint 1, "The influence of lactation on the
  quantity and quality of cashmere production". There is no review, so
  the steps differ as the brackets say; `ckwantes` is an author with no
  part in preprint 1.

A reviewer without an assignment:

1. Sign in as `jjanssen` and open the review request for submission 12
   (on a press 17):
   `/index.php/publicknowledge/en/reviewer/submission/12`.
   [Preprint server: sign in as `dbarnes`, open preprint 1 and choose
   "Galleys" in the side menu.]
2. On "1. Request", under "Review Files", copy the link address of the
   file's name. Pressing the name downloads the file. [Preprint server:
   copy the link address of the galley's name, "PDF".]
3. Log out, sign in as `amccrae` [preprint server: `ckwantes`] and
   paste the address into the address bar.

Signed out:

4. Log out and paste the address again.

A session that ended while the workflow was open:

5. Sign in as `dbarnes` and open submission 12 (on a press 17). It
   opens on its review stage, with the file listed under "Review
   Files". [Preprint server: preprint 1, "Galleys".]
6. Open a second browser tab, log out there, and close it.
7. In the first tab, press the file's name under "Review Files".
   [Preprint server: the galley's name, "PDF".]

A reviewer's session that ended on the review request (journal and
press):

8. Sign in as `jjanssen` and open the review request as in step 1.
9. Open a second browser tab, log out there, and close it.
10. In the first tab, press the file's name under "Review Files".

**Expected** Step 3 shows the access-denied page, the journal's own
page reading "The current role does not have access to this
operation.", as a refused page address does. Steps 4, 7 and 10 show
"Login", and signing in there as `jjanssen` [preprint server:
`dbarnes`] downloads the file.

**Observed** Steps 3 and 4 show a page with no title and no menu,
holding the one line below. Step 7 opens a new tab that shows it. At
step 10 it replaces the review request in the tab the reviewer was
working in.

```
{"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

The request behind each, on the journal:

```
GET /index.php/publicknowledge/$$$call$$$/api/file/file-api/download-file?submissionFileId=31&submissionId=12&stageId=3
200, Content-Type: application/json
```

Control: the same address typed by `jjanssen` or by `dbarnes` downloads
the file.

## Cause

A file link is a component address
(`…/$$$call$$$/api/file/file-api/download-file?…`), served by
`FileApiHandler::downloadFile` (`lib/pkp/controllers/api/file/`)
through `PKPComponentRouter`. Its `authorize()` adds
`SubmissionFileAccessPolicy`, which denies a signed-out visitor and an
account with no access to the file.

`PKPRouter::_authorizeInitializeAndCallRequest()` hands every denial to
the router's `handleAuthorizationFailure()`. The page router's version
sends a signed-out visitor to Login and anyone else to the
access-denied page. The component router's version
(`lib/pkp/classes/core/PKPComponentRouter.php`, line 331) returns
`new JSONMessage(false, …)` for every request, with status 200.

That JSON is meant for the page's scripts: a grid or a window that
fetched a component address reads `status` and shows `content`. A file
link is not fetched by a script. The browser opens it as a page, in
one of three ways:

- The Vue lists render the name as
  `<a :href="file.url" target="_blank">` (`FileManagerCellFileName.vue`,
  `GalleyManagerCellName.vue`): a new tab.
- The older grids, the reviewer's "Review Files" among them, build a
  `DownloadFileLinkAction` in `FileNameGridColumn`. It is a
  `PostAndRedirectAction`: a press posts `record-download` by script,
  then `PostAndRedirectRequest.js` sets `window.location` to the
  `download-file` address, in the same tab.
- A typed or shared address.

The router has answered JSON to every denial since 31106b7537 (2010),
when component addresses served only scripts. Downloads were routed
through it later (`FileApiHandler`, b4f589696b, 2013) without an answer
of their own for a refusal.

Reach:

- Walked: the reviewer's file link typed by another reviewer, typed
  signed out, and pressed after the session ended; the workflow's
  "Review Files" name on a journal and a press; the galley's name on a
  preprint server.
- Code: the workflow's other file lists and a discussion's files, which
  link the same `download-file` address.
- The handler's other download addresses, `download-all-files` and
  `download-library-file`, and every other component address a link
  opens as a page (code).
- Where a screen offers a file link to someone the policy then
  refuses, that person sees the same line. Two reports fix the reason
  for such a refusal:
  [U36 A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A19-select-files-other-stage-row-actions-refused.md)
  (a file's name in "Upload/Select Files") and
  [U47 OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U47-OMP2-press-copyeditor-media-download-refused.md)
  (a media file's name on a press).
- A page address and a REST API address are not affected: their routers
  answer with Login or the access-denied page, and with a 403.

## Proposed fix

A proposal: when the browser opens a component address as a page and
the request is denied, answer as the page router does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-link-refusal-bare-machine-text/fix.diff)).

```diff
--- a/lib/pkp/classes/core/PKPComponentRouter.php
+++ b/lib/pkp/classes/core/PKPComponentRouter.php
@@ -333,6 +334,18 @@
         string $authorizationMessage,
         array $messageParams = []
     ) {
+        // A component address the browser opens as a page (a file's download
+        // link, pressed or typed) shows its answer to a person, not to a
+        // script: send them where the page router does, to Login or to the
+        // access-denied page. A page load asks for text/html by name; the
+        // scripts' requests ask for JSON or for anything.
+        if ($request->isGet() && str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'text/html')) {
+            if (!$request->getUser()) {
+                Validation::redirectLogin();
+            }
+            $request->redirect(null, 'user', 'authorizationDenied', null, ['message' => $authorizationMessage]);
+        }
+
         $translatedAuthorizationMessage = __($authorizationMessage, $messageParams);
```

The diff also adds `use PKP\security\Validation;`. The two calls are
the body of `PKPPageRouter::handleAuthorizationFailure()`, so a refused
file link ends where a refused page does.

The condition in the `if` has to tell a page load from a script's
request on every install. A browser's page load sends an `Accept`
header that names `text/html`. The scripts' requests do not:

- the legacy jQuery calls send `application/json, text/javascript,
  */*; q=0.01` or `*/*` (no call in `lib/pkp/js` asks for `html`);
- ui-library's `useFetch` (ofetch) sets no `Accept`, so the browser
  sends `*/*`;
- `PostAndRedirectRequest`'s post is one of the jQuery calls, and its
  `window.location` is a page load.

`isGet()` keeps a form posted into a hidden frame on the JSON answer.

Tried on `main`, on the three apps. With the diff applied:

- step 3 lands on `…/user/authorizationDenied` and shows the site's
  page reading "The current role does not have access to this
  operation.";
- step 4 lands on "Login", and signing in there downloads the file;
- step 7's new tab shows "Login";
- step 10 leaves the reviewer's tab on "Login"; signing in there
  downloads the file. The `record-download` post before it is still
  answered with JSON.

The control gave the same with the diff applied as without it: an
allowed user typing the address gets the file (`jjanssen`, `dbarnes`),
and the request the workflow's own script sends after the session ended
("Upload/Select Files"; "Add galley" on a preprint server) still gets
the JSON refusal.

**Alternatives**

- Decide by Laravel's `expectsJson()`, as `RedirectGuestToLogin` does
  for the REST API: ui-library's fetches carry no `X-Requested-With`
  and `Accept: */*`, so it would redirect them too, and they expect
  JSON.
- Decide by the browser's `Sec-Fetch-Mode: navigate` and
  `Sec-Fetch-Dest: document` headers: exact, but browsers send them
  only to HTTPS and localhost addresses, so an install on plain HTTP
  would keep the JSON line. A first version of the diff used them and
  gave the same results on the localhost trial.
- Serve downloads from a page address: every file link and every
  stored or shared address changes. Much larger, for the same result.
- Open file links by script in ui-library and show a refusal in a
  dialog: covers the Vue lists only, not a typed or shared address, the
  reviewer's pages or the remaining legacy grids.

**What goes with it**

- No stored data and no REST API change. A script that fetches a
  component address gets what it got before. When a plugin handles the
  `Request::redirect` hook, `redirectUrl()` returns and the method goes
  on to the JSON, as the page router's falls through today.
- After signing in on "Login" the browser goes on to the file's
  address. A download does not replace the page, so "Login" stays on
  screen. From a Vue list that is the new tab, which can be closed.
  From an older grid (the reviewer at step 10) it is the tab the person
  was working in, and they go back to their page themselves.
- The access-denied page is the existing one: it shows the sentence
  under the site's header, with no heading and an empty page title.
- Backport: the method's body and `Validation` are the same on 3.5 and
  3.4. On 3.5 the method starts at line 334, so the second hunk applies
  with an offset (dry run). On 3.3 the file is
  `PKPComponentRouter.inc.php`, not namespaced, and PHP 7 has no
  `str_contains()`. Not tried on the older versions.
- Guard: a unit test in
  `lib/pkp/tests/classes/core/PKPComponentRouterTest.php` for the two
  answers. `redirectUrl()` exits, so the test registers a
  `Request::redirect` hook that keeps the address and returns true, and
  sets `REQUEST_METHOD` and `HTTP_ACCEPT` in `$_SERVER`. And an e2e
  scenario here: a file link opened signed out shows "Login".

Medium: a few lines in one method, tried, but they change the shared
router's answer for every component address opened as a page, so the
team will want to look beyond the file link; the unit test needs the
hook set-up above.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-link-refusal-bare-machine-text/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-link-refusal-bare-machine-text/lib.js).
  On an install of PKP's default dataset, in pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/file-link-refusal-bare-machine-text/walk.js`;
  `MODE=neighbour` in front for what the fix must leave unchanged, and
  `PKP_E2E_LINE=stable-3_5_0` for 3.5.
  `MODE=reviewer` runs steps 8 to 10 alone.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  dataset pkp/datasets e8dafbc (2026-10-02). Steps 1 to 7 gave the same
  line on every app and both versions; steps 8 to 10 were walked on
  `main` only, OJS and OMP. No request failed on the server and no page
  script failed.
- The walk's browser is Chromium. Step 6 is a second tab of the same
  browser opening the log-out address. At step 2 on a press, the
  reviewer's download is named `jpk-review-assignment-17-book-manuscript-141.pdf`
  (the review is anonymous); the file's name on screen is `preface.pdf`.
- The trial ran on localhost. The jQuery calls' `Accept` was read from
  the walk's requests (`application/json, text/javascript, */*;
  q=0.01`). The `Accept` of a page load and of a ui-library fetch was
  not captured; the redirects and the unchanged JSON answer show what
  they held.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246c,
  OPS 38b61882d3 (pkp-lib cf3f984335, ui-library d4e01883);
  `stable-3_4_0` pkp-lib 6f96165c90; `stable-3_3_0` pkp-lib 4156e50233.
- Code reads. `main`: `PKPComponentRouter::handleAuthorizationFailure()`,
  `PKPPageRouter::handleAuthorizationFailure()`,
  `APIRouter::handleAuthorizationFailure()`,
  `PKPRouter::_authorizeInitializeAndCallRequest()`,
  `FileApiHandler::authorize()` and `downloadFile()`,
  `Validation::redirectLogin()`, `PKPUserHandler::authorizationDenied()`,
  `RedirectGuestToLogin`, `FileManagerCellFileName.vue`,
  `GalleyManagerCellName.vue`, `useFetch.js` (the headers a fetch
  sends), `FileNameGridColumn`, `DownloadFileLinkAction`,
  `PostAndRedirectRequest.js`, and the `$.ajax`, `$.get` and `$.post`
  calls under `lib/pkp/js` for a `dataType` of `html`. 3.5, 3.4 and 3.3: the component router's
  `handleAuthorizationFailure()` returns the same `JSONMessage`, the
  page router's redirects, and `FileApiHandler` serves `downloadFile`
  under `SubmissionFileAccessPolicy` (`.inc.php` files on 3.3). 3.4 and
  3.3 were not walked; their file lists are the older grids, which link
  the same address.
- Introduced: `git blame` on the method's `return new JSONMessage`
  leads through two reformats (e3f570bc37, 657efbae75) to 31106b7537,
  which gave the component router its JSON answer when it served only
  scripts.
- Upstream search, pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library,
  by the symptom's words (the refusal's text with "download", "raw
  JSON", "logged out", "session") and by `handleAuthorizationFailure`,
  `PKPComponentRouter` and `FileApiHandler`. `pkp/pkp-lib#3127`
  (closed, 2018) mentions in passing that "the error returned is JSON
  but it loads it as the URL"; it was closed by granting the access it
  was about. The other hits are about who may download a file.
- Not driven: the other file lists and a discussion's file link;
  `download-all-files` and `download-library-file`; an author or an
  assistant as the refused account; a session ended by its lifetime
  (the walk logs out in a second tab).
- Unverified: a browser other than Chromium; an install on plain HTTP
  under a host name other than localhost; what the fix does for a
  link with the `download` attribute (the "JATS XML" page's "Download",
  [U48 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U48-A11-jats-download-saves-refusal-json.md)),
  whose refused answer the browser saves as a file.
