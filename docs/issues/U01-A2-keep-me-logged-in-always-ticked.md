# "Keep me logged in" is ticked every time the Login page shows, even after the user unticked it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#658` for `pkp/pkp-lib#639` · [be949906f5](https://github.com/pkp/pkp-lib/commit/be949906f5aee16ff88668615986ec141f43445f) · 2015-08-07 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U01 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The Login page shows "Keep me logged in" already ticked, though the
label offers it as a choice, so every user who does not notice the box
and untick it is kept signed in. The same fault ticks the box again
when the page shows the form after a wrong password: a user who
unticked it, mistyped the password and signed in on the next try is
kept signed in anyway, without being told.

Unticked, a sign-in ends after a week without a visit. Kept signed in,
the browser stays signed in to the account for 30 days from the sign-in,
visited or not; 30 is the default of a setting in the installation's
configuration. On a shared computer the account stays open to the next
person who uses that browser.

## Impact

- **Lost.** The user's choice not to stay signed in, and with it the
  ordinary end of the sign-in: the browser keeps the account signed in
  for 30 days instead of until a week without a visit. No data or work
  is lost.
- **Who.** Every user of every journal, press or server who signs in
  through the Login page; most often those who mistype their password
  once, and those on a shared or public computer.
- **Way round.** Untick the box again before each press of "Login", or
  use "Logout" when done. Nothing tells the user they need to.

Medium: every sign-in that does not untick the box, and every retry
after a wrong password, leaves the account signed in on that browser for
a month without the user choosing it; it stays below high because no
data or work is lost and the user can get round it on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS; the context
  `publicknowledge`). Signed out.

Fresh Login page:

1. Open the Login page,
   `/index.php/publicknowledge/en/login`.

A refused sign-in with the box unticked:

2. Type `dbarnes` in "Username or Email" and `wrongpassword` in
   "Password".
3. Untick "Keep me logged in".
4. Press "Login".

The next, correct attempt:

5. Type `dbarnesdbarnes` in "Password", leave "Keep me logged in" as the
   page shows it, and press "Login".

**Expected.** At step 1 "Keep me logged in" is unticked. At step 4 the
page reads "Invalid username/email or password. Please try again.",
keeps `dbarnes` in "Username or Email", and shows the box unticked, as
the user left it. At step 5 the Dashboard opens and the browser holds
no `remember_web_…` cookie, since the user chose not to stay signed in.

**Observed.** At step 1 the box is ticked. At step 4 the error and
`dbarnes` are shown, and the box is ticked again. At step 5 the
Dashboard opens, and the browser's developer tools (Application ›
Cookies) show a `remember_web_c1a26bc0…` cookie that expires 30 days
later; the session cookie beside it expires 7 days later. The box's markup, at steps 1 and 4
alike:

```html
<input type="checkbox" name="remember" id="remember" value="1" checked="$remember">
```

## Cause

`lib/pkp/templates/frontend/pages/userLogin.tpl`, line 76 on `main`,
writes the checkbox's `checked` attribute as plain HTML text:
`checked="$remember"`. Smarty substitutes variables only inside its own
`{…}` tags, so the page goes out with the literal text `$remember` as the
attribute's value. The `checked` attribute is boolean in HTML: its
presence alone ticks the box, whatever its value. So the box is ticked
on every render.

The handler already passes the user's choice: `LoginHandler::index()`,
`LoginHandler::signIn()` (the refused attempt) and, on `main`, its
rate-limit branch each assign `remember` from the request. The template
never reads it. When the form is posted with the box ticked,
`Validation::login(…, $remember)` hands it to Laravel's
`Auth::attempt($credentials, $remember)`, which sets the
`remember_web_*` cookie for `[security] remember_me_lifetime` days
(30 by default, counted from the sign-in). Unticked, the sign-in rests on
the session cookie alone, which ends after `[general] session_lifetime`
days without a visit (7 by default).

The line came in with `pkp/pkp-lib#658` ("style register and login
pages", for `pkp/pkp-lib#639`), which rewrote the form as plain markup.
The form helper it replaced, `{fbvElement type="checkbox" … checked=$remember}`,
read the variable. The change was made during the 3.0 rewrite, so no
3.x release has shown the box unticked.

Reach:

- Every sign-in through the Login page of all three apps; the template
  is pkp-lib's and no app overrides it (checked in the code).
- Both forms the Login page shows: the fresh one and the one a refused
  sign-in shows again (walked), and on `main` the rate-limited refusal,
  which renders the same template (code; 3.5 has no rate limiting).
- On 3.4 and 3.3 a ticked box gives the session cookie a lifetime of
  `session_lifetime` days (`Validation::registerUserSession()`); unticked,
  it is a browser-session cookie that ends when the browser closes
  (code).
- A third-party theme that overrides `userLogin.tpl` keeps its own copy
  of the line (not checked).

## Proposed fix

Print the attribute only when the user ticked the box, as the sibling
checkboxes of `userRegister.tpl` do
(`{if $privacyConsent} checked="checked"{/if}`) and as the form helpers'
`checkboxGroup.tpl` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keep-me-logged-in-always-ticked/fix.diff)):

```diff
--- a/lib/pkp/templates/frontend/pages/userLogin.tpl
+++ b/lib/pkp/templates/frontend/pages/userLogin.tpl
@@ -73,7 +73,7 @@
 			<div class="remember checkbox">
 				<label>
-					<input type="checkbox" name="remember" id="remember" value="1" checked="$remember">
+					<input type="checkbox" name="remember" id="remember" value="1"{if $remember} checked="checked"{/if}>
 					<span class="label">
 						{translate key="user.login.rememberUsernameAndPassword"}
 					</span>
```

A fresh Login page then shows the box unticked. A refused
sign-in shows the box as the user left it, ticked or not, which is what
the handler already passes and what the introducing change meant to
keep.

Tried on `main` on the three apps: the Steps then show the Expected
(unticked at steps 1 and 4, no `remember_web_…` cookie after step 5).
The neighbour check, a refused attempt with the box left ticked and then
the correct password, shows the box ticked again and the cookie set,
with the fix in and out.

**Alternatives.**

- Drop the `checked` attribute altogether: a fresh page would be right,
  but a refused sign-in would forget a user's tick.
- Untick the box with JavaScript: a second place for the same rule, and
  it fails without scripts.

**What goes with it.**

- No stored data to repair. Users already holding a `remember_web_*`
  cookie keep it until it runs out or they sign out.
- A search of the three apps' templates, pkp-lib's and the bundled
  plugins' for an HTML attribute holding a bare `$variable` found only
  this line; the other matches are inside Smarty tags or Vue bindings,
  where the variable is read.
- Nothing an API client or plugin relies on changes; the
  `Templates::User::Login::BeforeForm` and `AfterForm` hooks are untouched.
- Backport: 3.5, 3.4 and 3.3 carry the same line (line 73) and their
  handlers assign `remember` the same way, so the diff applies as
  written with an offset.
- Guard: an e2e check that the Login page shows the box unticked, and
  shows it as left after a refused sign-in (a **Planned** item in spec
  U01).

Small: one line in a shared template, following the pattern its sibling
templates use, and an e2e check.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keep-me-logged-in-always-ticked/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/keep-me-logged-in-always-ticked/walk.js`.
  It records the box's state and markup at steps 1 and 4, the error and
  the kept username, where step 5 lands and every cookie the browser
  then holds with its lifetime. `neighbour` as the script's argument
  runs the neighbour check alone: the same steps with the box left
  ticked at step 3.
- No request in the walks answered an error and no page script failed.
- The fix, tried 2026-10-04 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/keep-me-logged-in-always-ticked/fix.diff ojs omp ops`,
  then walk.js and walk.js `neighbour` with the same command, then
  `revert` and walk.js `neighbour` again.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03),
  with the dataset's own `config.inc.php` values for `session_lifetime`
  (7) and `remember_me_lifetime` (30):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c,
    OPS 38b61882d3 (lib/pkp cf3f984335): the same result on the three
    apps. The 3.5 template has the same line (line 73), and
    `LoginHandler` assigns `remember` on its two display paths, `index()`
    and the refused `signIn()`; 3.5 has no rate-limit branch.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib 767353f4fe. `templates/frontend/pages/userLogin.tpl`
  line 73 is the same; `pages/login/LoginHandler.php` assigns
  `remember` on display and on a refused sign-in; no app overrides the
  template.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib ac3fa73402. The same template line 73;
  `pages/login/LoginHandler.inc.php` assigns `remember` the same way;
  no app overrides the template.
- Introduced: `git blame` on the line names 60fa6ff5ed
  (`pkp/pkp-lib#1614`, 2016-07-15), which only re-indented it when the
  implicit-auth branch was removed; `git log -S'checked="$remember"'`
  finds its first appearance in be949906f5, in `templates/user/login.tpl`,
  replacing `{fbvElement type="checkbox" … checked=$remember}`. GitHub's
  API (`commits/be949906f5/pulls`) names `pkp/pkp-lib#658` ("style
  register and login pages", NateWr, merged 2015-08-07); the commit
  message names only `pkp/pkp-lib#639`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for "keep me logged in", "remember checkbox login",
  "remember me" with checked or default, `userLogin.tpl remember` and
  `rememberUsernameAndPassword`. `pkp/pkp-lib#1867` (closed 2016)
  renamed the label to "Keep me logged in" and does not mention the box's
  state; `pkp/pkp-lib#12586` (merged, the `remember_me_lifetime` setting)
  changed the handler and the cookie, not the template.
- Not driven: 3.4 and 3.3 (code only); the rate-limited refusal (code);
  MySQL not checked, though nothing here depends on the database.
- Unverified: that "Logout" removes the `remember_web_*` cookie rests on
  Laravel's `SessionGuard::logout()`, which `Validation::logout()` calls;
  not walked.
