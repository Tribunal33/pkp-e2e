# Signing in at a journal not enabled publicly leads to the Dashboard or home page, not the page asked for

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3835` for `pkp/pkp-lib#3834` · [99d717b063](https://github.com/pkp/pkp-lib/commit/99d717b063148553f0669ed638b02ab8eb867eb1) · 2018-06-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A journal whose "Enable this journal to appear publicly on the site"
box is unticked sends a signed-out visitor who opens an article, a file
or the About page to its Login page (an author or editor following a
link before the journal goes public, say). After signing in they expect
the page they asked for. A journal closed by "Users must be registered
and log in to view the journal site." does lead straight back to it.

Instead an editor or author lands on the Dashboard and a Reader on the
journal's home page, and the page asked for has to be found again.

Such a journal has sent signed-out visitors to its Login page since
2018, when that replaced a "not found" page; it has never led back to
the page asked for.

## Impact

- **Lost.** No data. Nothing on the Login page or after it says that
  the link was dropped.
- **Who.** Anyone with an account who follows a link into such a
  journal while signed out: the team of a journal being set up, or of
  one taken off the public site. The Reader in the Steps stands for
  any account without a role in the journal.
- **Way round.** Once signed in, open the link again; it then opens.

Low: the page is one more click away and the task gets done. It would
be medium if the page could not be reached after signing in.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (OMP and OPS in brackets).
- The dataset has no account that is a Reader only, and a journal not
  enabled publicly takes no registration, so step 1 registers one
  first.

Registering a Reader:

1. Signed out, open "Register"
   (`/index.php/publicknowledge/en/user/register`). Fill the form
   (given name "Reader", family name "u59i", affiliation "u59i",
   country "Canada", email `u59ireader@mailinator.com`, username
   `u59ireader`, password `u59ireaderu59ireader` twice), tick the
   privacy consent box and press "Register". An account registered
   with no role box ticked is a Reader, and registering leaves the
   visitor signed in. Sign out.

Taking the journal off the public site:

2. Sign in as `admin`. Open Administration › "Hosted Journals" [OMP
   "Hosted Presses", OPS "Hosted Servers"], the row's arrow and "Edit".
   Untick "Enable this journal to appear publicly on the site" [OMP
   "…this press…", OPS "…this preprint server…"] and press "Save". Sign
   out.

Following a link while signed out:

3. Open the address of the published article 17,
   `/index.php/publicknowledge/en/article/view/17` [OMP book 14,
   `catalog/book/14`; OPS preprint 2, `preprint/view/2`]. The Login
   page opens.
4. On that Login page sign in as `dbarnes` (`dbarnesdbarnes`).
5. Sign out. Open `/index.php/publicknowledge/en/about` and, on the
   Login page, sign in as the author `amwandenga` [OMP `aclark`, OPS
   `ccorino`].
6. Sign out. Open the address of step 3 again and, on the Login page,
   sign in as `u59ireader`.

**Expected.** After each sign-in, the page asked for: the article after
steps 4 and 6, "About the Journal" [OMP "About the Press", OPS "About
the Server"] after step 5.

**Observed.** The Login page's address in steps 3, 5 and 6 carries
nothing of the page asked for:

```
/index.php/publicknowledge/en/login
```

| Step | Who | Lands on |
|---|---|---|
| 4 | `dbarnes`, editor | `dashboard/editorial`, "Assigned to me" |
| 5 | the author | `dashboard/mySubmissions`, "Active submissions" |
| 6 | `u59ireader`, Reader | the journal's home page, `/index.php/publicknowledge/en/index` |

With the journal enabled and "Users must be registered and log in to
view the journal site." ticked (Settings › Users & Roles › "Site Access
Options"), the address of step 3 opens
`login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Farticle%2Fview%2F17`,
and `dbarnes` signing in there lands on the article.

## Cause

`PKPPageRouter::route()` (`lib/pkp/classes/core/PKPPageRouter.php`,
line 185) sends every signed-out page request at a context that is not
enabled to the Login page with `$request->redirect(null, 'login')`.
That call passes no `source`, so the Login form's hidden `source` is
empty and `LoginHandler::signIn()` has nothing to return to. It falls
through to `_redirectAfterLogin()`, which sends a role holder to the
Dashboard and anyone else to the journal's home page.

The other places that interrupt a visit to ask for a sign-in call
`Validation::redirectLogin()`, which adds the address asked for
(`REQUEST_URI`) as `source`:

- `PKPPageRouter::handleAuthorizationFailure()` in the same class;
- `PKPHandler::validate()` and `PKPUserHandler::authorizationDenied()`;
- the middleware `RedirectGuestToLogin` and `PKPAuthenticateSession`;
- the apps' article, issue and payment handlers.

The plain `$request->redirect(null, 'login')` calls that remain
(`AdminHandler`, after the administrator expires all sessions;
`RegistrationHandler`, after an account activation link) interrupt no
visit, so they have no page to return to.

The line came with 99d717b063, which replaced a "not found" answer by
a redirect to Login so that the team of a journal not yet public could
sign in at it.

Reach:

- **Every page of such a context** except `login` and `invitation`:
  the gate runs before the page's handler is chosen. Read in the code,
  and seen on screen for an article, a book, a preprint and About.
- **The Login page opened by its own address** (on screen): no page
  was asked for, and the sign-in leads to the Dashboard. Not affected.

## Proposed fix

Send the visitor to Login the way the rest of the code does, with the
address they asked for
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-from-journal-not-public-forgets-page/fix.diff)):

```diff
--- a/lib/pkp/classes/core/PKPPageRouter.php
+++ b/lib/pkp/classes/core/PKPPageRouter.php
@@ -184,3 +184,3 @@
                 if (!in_array($page, ['login', 'invitation'])) {
-                    $request->redirect(null, 'login');
+                    Validation::redirectLogin();
                 }
```

The diff is shortened here; the linked file has the full context. Its
paths are relative to the app root (`patch -p1` there, `-p3` from a
pkp-lib checkout).

The class already imports `Validation` and calls the same method in
`handleAuthorizationFailure()`. `LoginHandler::signIn()` follows a
`source` only when it is a path on the site, and that check is
untouched.

Tried on `main` on the three apps: the Login page's address carried
`source=%2Findex.php%2Fpublicknowledge%2Fen%2Farticle%2Fview%2F17`, and
steps 4, 5 and 6 landed on the article [book, preprint], "About the
Journal" and the article. With the fix and without it, the Login page
opened by its own address led `dbarnes` to the Dashboard, and the
journal that requires sign-in returned him to the article.

The fix changes two more landings, both seen in the trial:

- A visitor who opens the journal's home address
  (`/index.php/publicknowledge/en/index`) and signs in lands on the
  home page, where today a role holder lands on the Dashboard.
- On that Login page, "Register" loads the Login page again (spec U59
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a9),
  an open question). With the fix the reloaded page carries
  `source=…/user/register?source=`, so signing in after pressing
  "Register" lands on "Registration complete" instead of the Dashboard.
  Hiding that link, which the open question A9 favours, removes the
  case.

The plain one-line change is the recommendation, home address
included: the visitor asked for the home page and gets it, one rule
holds for every page, and it matches what the code does for a journal
that requires sign-in (read, not walked).

When the page asked for was a galley or a file download, the sign-in
leads to that address, so the galley's page opens or the file
downloads. This is read in the code, not walked.

- **Alternatives.**
  - Passing `source` only for pages other than `index` and `user`
    keeps both landings above as they are. It costs a second list of
    page names in the gate and makes the home page the one page that
    is not returned to.
- **What goes with it.**
  - No stored data, API or plugin hook is involved.
  - The same line is in 3.5 (line 185) and 3.4 (line 204), where the
    change applies as written; on 3.3 it is a one-line `if` in
    `PKPPageRouter.inc.php` (line 192), ported by hand.
    `Validation::redirectLogin()` is the same on each.
  - The guard is a check in pkp-e2e's own suite that signing in from
    the Login page of a journal not enabled publicly returns to the
    page asked for (spec U59, a **Planned** item).

Small: one line in the shared router, following the call the same
class already makes.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/login-from-journal-not-public-forgets-page/walk.js),
  with its helpers in `lib.js` beside it and in sibling folders. Run it
  on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/login-from-journal-not-public-forgets-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With `neighbour` as
  its argument it walks the control and the fix's neighbour checks
  instead: the journal that requires sign-in, the Login page opened by
  its own address, the home address and the "Register" link.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets c657990
  (2026-10-01). 3.5 showed the same three landings on each app. The
  server logged no error in any walk.
- Tips:
  - `main`: OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794c and
    OPS c8af945bb7 (pkp-lib 3dc90c81a6).
  - `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (pkp-lib cf3f984335).
  - `stable-3_4_0`: OJS 75cc2d488b (pkp-lib 32b0f4b4af), OMP
    0aec65441f and OPS acd8ae704b (pkp-lib df13621c2d).
  - `stable-3_3_0`: OJS ac77c9fb35 (pkp-lib f6ab331645), OMP
    8e72fc8836 and OPS c5532e2161 (pkp-lib d446601ebe).
- Code reads:
  - `PKPPageRouter::route()` on each branch, at the pkp-lib commit
    each app's branch records: the gate's
    `$request->redirect(null, 'login')` at line 185 on `main` and 3.5,
    204 on 3.4 and 192 on 3.3 (where only `login` is exempt on 3.4 and
    3.3).
  - `Validation::redirectLogin()` and `LoginHandler`'s `source`
    handling on `main`, 3.4 and 3.3; `LoginHandler::_redirectAfterLogin()`,
    `PKPPageRouter::getHomeUrl()` and `RegistrationHandler::register()`
    (a signed-in visitor gets "Registration complete") on `main`.
  - Every `redirectLogin` and `'login'` redirect in pkp-lib's and
    OJS's classes and pages, for the other callers. The remaining
    `redirect(null, 'login')` calls (after the administrator expires
    all sessions, after an account activation link) follow no
    interrupted visit.
  - `git log -S` on the redirect: added by 99d717b063; the gate itself
    by 18013a13ef (2016, `pkp/pkp-lib#592`), which showed another page
    in place and redirected nowhere. `git blame` names e3f570bc37, a
    reformat.
- Not driven: a file's address and, on OJS, an issue's; a Reviewer's
  and a Site Administrator's landing; 3.4 and 3.3.
- Tracker search (2026-10-02): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library for a disabled or not enabled journal, the login
  redirect, `source`, `PKPPageRouter` and `redirectLogin`.
  `pkp/pkp-lib#3834` and `pkp/pkp-lib#592` are the closed issues the
  gate was made for; none is about the return after sign-in.
