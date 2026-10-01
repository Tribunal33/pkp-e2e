# The Site Administrator asking the sections API at the site's address, with no journal, gets a server error

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; no sections interface)
  - 3.3: none (code; no sections interface)
- **Introduced** `pkp/pkp-lib#9939` for `pkp/pkp-lib#9938` · [41fa40ffc8](https://github.com/pkp/pkp-lib/commit/41fa40ffc87754040bb364ec18cd8164a9600f24) · 2024-05-08 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U17 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a10)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A caller signed in as the Site Administrator asks the sections
interface (REST API) for the list of sections at the site's own address
(`/index.php/index/api/v1/sections`), where no journal is named. The
app fails on the server with HTTP 500 "Call to a member function getId()
on null", where a "not found" refusal is due.

No screen of the app calls this interface. Only a plugin or an outside
program using the REST API would; none that ships with the apps does.
Signed-in journal managers and editors are refused at that address
("The current role does not have access to this operation."), and a
signed-out request gets the usual 401, so only the Site Administrator
reaches the failure.

At the same address, a request for one section (`…/sections/1`) is
refused with HTTP 400 as belonging to another journal. The refusal
shows the untranslated key `##api.sections.400.contextsNotMatched##`.
That missing text is U17
[A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a9),
a separate fault; the fix below turns this request into the same "not
found" refusal as the list.

## Impact

- **Lost.** Nothing stored. The caller is told that the server failed,
  not that it must ask at a journal's address.
- **Who.** Only a caller signed in as the Site Administrator.
- **Way round.** Ask at the journal's address
  (`/index.php/<journal>/api/v1/sections`), which lists its sections.

Low: nothing is lost, and only a program calling the API as the Site
Administrator reaches it.

## Steps to reproduce

The steps type the addresses into a signed-in browser, as a program
calling the API would request them.

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
  Nothing else.

1. Sign in as `admin` (the Site Administrator; in the dataset also a
   Journal manager).
2. In the same browser, open `/index.php/publicknowledge/api/v1/sections`.
   It lists the journal's two sections, "Articles" and "Reviews", as
   JSON (`"itemsMax":2`).
3. Open `/index.php/index/api/v1/sections`, the site's address.

**Expected.** HTTP 404, the answer most interfaces that serve only a
journal's records give at the site's address:

```
{"error":"The requested resource was not found."}
```

**Observed.** HTTP 500. The server log:

```
production.ERROR: Call to a member function getId() on null {"exception":"[object] (Error(code: 0): Call to a member function getId() on null at …/lib/pkp/api/v1/sections/SectionController.php:147)
```

Control: signed in as `rvaca` (Journal manager) or `dbarnes` (Journal
editor), step 3's address answers HTTP 401 "The current role does not
have access to this operation.".

## Cause

`SectionController::getMany()` limits the list to the request's journal
with `$this->getRequest()->getContext()->getId()`
([`SectionController.php` line 147](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/sections/SectionController.php#L147)).
At the site's address `getContext()` returns `null`, and the call
fails. `get()` reads the id with `?->`
([line 108](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/sections/SectionController.php#L108)),
so at the site's address it refuses every section as another journal's.

Sections belong to a journal, so every request to this interface needs
a journal in its address. Nothing in the controller checks for one.
`getRouteGroupMiddleware()` lists `has.user` and the role check
([lines 52-61](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/sections/SectionController.php#L52-L61)),
and `authorize()` adds the signed-in user and role policies
([lines 79-92](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/sections/SectionController.php#L79-L92)).
The Site Administrator's role holds at the site's address, so the
request reaches `getMany()`.

The other interfaces that serve only a journal's records refuse the
site's address in one of two ways:

- The `has.context` route middleware
  ([`HasContext.php`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/middleware/HasContext.php))
  answers 404 "The requested resource was not found.". About 40
  controllers in pkp-lib and OJS list it, for example
  `PKPInstitutionController`
  ([line 58](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/institutions/PKPInstitutionController.php#L58)).
- `ContextRequiredPolicy` in `authorize()` answers 401 "You cannot call
  this operation without a context (press, journal, conference, etc).".
  A few controllers (institutions, RORs, email templates, mailables,
  SUSHI statistics, OJS issues) add it beside `has.context`. The
  policy runs first, since `PolicyAuthorizer` is global middleware, so
  those answer 401.

The interfaces that serve both levels, announcements and highlights,
test `getContext()` and fall back to the site's own records.

Reach: every other controller in pkp-lib's and OJS's `api/v1` that
calls a method on `getContext()` is guarded by `has.context`, a context
policy, or a test of the context first (code). The comments interface
calls it too, but its `has.context` answers 404 at the site's address
before the calls run.

## Proposed fix

A proposal; the team decides. Add `has.context` to
`SectionController::getRouteGroupMiddleware()`, as its neighbours do:

```diff
--- a/lib/pkp/api/v1/sections/SectionController.php
+++ b/lib/pkp/api/v1/sections/SectionController.php
@@ -53,6 +53,7 @@
     {
         return [
             'has.user',
+            'has.context',
             self::roleAuthorizer([
                 Role::ROLE_ID_SITE_ADMIN,
                 Role::ROLE_ID_MANAGER,
```

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-site-address-server-error/fix.diff)
gives its path from the app root (`lib/pkp/…`); in a pkp-lib clone,
apply it with `git apply -p3`. It needs no import.

It covers both routes and gives the answer most journal-only interfaces
give.

**Tried** on OJS `main`. With the fix, the list and one section at the
site's address answer HTTP 404 "The requested resource was not found."
to `admin`. The journal's list and section 1 still answer 200 to `admin`
and `rvaca`. At the site's address `rvaca` and `dbarnes` still get 401
"The current role does not have access to this operation.", and a
signed-out request still gets 401.

**Alternatives**

- **`ContextRequiredPolicy` in `authorize()`**, as the institutions
  interface also has. The refusal would be a 401 naming the missing
  context, which says more, but a 401 reads as a sign-in problem, and
  the policy is the less common guard.
- **A null-safe read in `getMany()`** (`getContext()?->getId()`). The
  list would come back empty, or unfiltered, at the site's address,
  silently.
- **A refusal in `APIRouter` for every interface at the site's
  address.** The contexts and site interfaces serve there on purpose.
  Only three controllers override `PKPBaseController::isSiteWide()`
  (jobs, the test interface, plugin settings), so this needs a new flag
  on every controller.

**What goes with it**

- **A test.** A pkp-lib API test that asks for `index/api/v1/sections`
  as the Site Administrator and expects 404.
- **3.5.** The fix applies as written.

Small: one line in one controller, following the pattern of about 40
others, and a test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/sections-site-address-server-error/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-site-address-server-error/walk.js),
  on an install loaded from PKP's default test dataset (pkp/datasets
  38ab955, 2026-09-30, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/sections-site-address-server-error/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It types the Steps'
  addresses and `…/index/api/v1/sections/1` as `admin`. As controls, it
  opens the journal's list and section 1 as `admin` and `rvaca`, and the
  site's address as `rvaca`, `dbarnes` and signed out. Walked on OJS
  `main` and `stable-3_5_0`. The fix was tried on `main` with `node
  bin/try-fix.js apply shared/playwright/checks/issues/sections-site-address-server-error/fix.diff ojs`
  and taken out with `node bin/try-fix.js revert ojs`.
- Tips: `main` OJS
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
  pkp-lib
  [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
  `stable-3_5_0` OJS
  [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  pkp-lib
  [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1),
  where `SectionController.php` is identical to `main`'s. On 3.4 and 3.3,
  `api/v1` in OJS and pkp-lib holds no sections interface.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-09-30 for the sections endpoint, `SectionController`, "getId() on
  null" at the site level and `ContextRequiredPolicy` in the API.
  Nothing matched this fault.
