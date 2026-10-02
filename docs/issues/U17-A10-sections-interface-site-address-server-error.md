# The REST API's sections endpoint fails with a server error when the site administrator asks at the site's address

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; no sections endpoint)
  - 3.3: none (code; no sections endpoint)
- **Introduced** `pkp/pkp-lib#9939` and `pkp/ojs#4268` for `pkp/pkp-lib#9938` · [41fa40ffc8](https://github.com/pkp/pkp-lib/commit/41fa40ffc87754040bb364ec18cd8164a9600f24), [40ef7b6c4b](https://github.com/pkp/ojs/commit/40ef7b6c4b34e41156ba5e441b84d616713d804f) · 2024-05-08 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a10) (the site's address); A10's request for a section by a non-numeric id is tracked in [U09-A18-picture-over-request-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-request-limit-server-error.md), which has its cause
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The application fails on the server when the site administrator asks
the REST API's sections endpoint for the list of a journal's sections
at the site's own address, with no journal in it. The answer is a
server error reading "Call to a member function getId() on null". The
other endpoints that need a journal answer "The requested resource was
not found." there.

No screen of the application sends this request, so only a program
signed in as the site administrator meets it, when it leaves the
journal out of the address. With the journal in the address the list
works.

## Impact

- **Lost**: nothing. No data is read or changed; the server logs an
  error for each such request.
- **Who**: only the site administrator. Other signed-in users, the
  journal's manager included, are refused by role at that address
  (401), and so are visitors.
- **Way round**: put the journal in the address.

Low: a latent defect. It would rise if a plugin or an integration were
found sending this request.

## Steps to reproduce

No screen sends this request. A person can send it by typing the
address into a browser signed in as the site administrator, which is
what these steps do.

Preconditions:

- PKP's default test dataset for OJS `main`. Nothing else.

Steps:

1. Sign in as `admin` (password `admin`).
2. Open `/index.php/index/api/v1/sections`, the list at the site's
   address.

**Expected**: the answer the other endpoints that need a journal give at
that address:

```
404 {"error":"The requested resource was not found."}
```

**Observed**:

```
GET /index.php/index/api/v1/sections
→ 500 {"error":"Call to a member function getId() on null"}
```

The server log reads:

```
production.ERROR: Call to a member function getId() on null {"exception":"[object] (Error(code: 0): Call to a member function getId() on null at …/lib/pkp/api/v1/sections/SectionController.php:147)
```

The journal's own address, `/index.php/publicknowledge/api/v1/sections`,
answers 200 with "Articles" and "Reviews". One section at the site's
address, `/index.php/index/api/v1/sections/1`, answers 400 with
`##api.sections.400.contextsNotMatched##` (no server error). At the
list's site address `rvaca` and `ccorino` get 401 "The current role does
not have access to this operation.", and a signed-out visitor gets 401.

## Cause

`SectionController::getMany()` (pkp-lib
`api/v1/sections/SectionController.php`, line 147) filters the list by
the request's journal with
`$this->getRequest()->getContext()->getId()`. At the site's address
the request has no journal, so `getContext()` returns null and the call
fails. Laravel's routing pipeline catches the error, and
`PKPExceptionHandler::render()` answers it as a 500.

The fault is that the controller never says its routes need a journal.
Most API controllers say so with the `has.context` middleware
(`PKP\middleware\HasContext`, 404 "The requested resource was not
found."); 42 controller files in pkp-lib and OJS list it. Some add
`ContextAccessPolicy` instead. `SectionController` lists `has.user`
and the role authorizer, and its `authorize()` adds
`UserRolesRequiredPolicy` and the role policies. The controller came
without a journal check in `pkp/pkp-lib#9939`, which added the
endpoint.

Why only the site administrator gets this far: the role policies in
`authorize()` run first, in the global `PolicyAuthorizer` middleware.
They refuse every user who holds no role at the site level with 401,
so a journal manager or an author never reaches the route's own
middleware. The site administrator's role is a site-level role, so the
policies let the request through. The `has.roles` middleware then
checks the site administrator role first (`HasRoles::handle()`, line
63), and the request reaches `getMany()`.

Reach:

- `get()`, one section, runs at the site's address too. It reads the
  section and refuses it with `api.sections.400.contextsNotMatched`,
  because the section's journal is not the request's. That is a
  refusal, not a crash, but the message is wrong for an address that
  names no journal (seen on screen).
- OMP and OPS ship the same controller in pkp-lib but do not mount the
  endpoint, so the address answers "The requested URL was not
  recognized." (seen on screen).
- `HasRoles::handle()` line 63 calls `$context->getId()` for every role
  other than the site administrator. This endpoint never reaches that
  call, because the site administrator role comes first in its list.
  The highlights endpoint lists the manager role first, so the site
  administrator's `index/api/v1/highlights` answers the same 500 from
  `HasRoles.php:63`, with and without this fix (seen on screen). That
  fault is spec U11's
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a5)
  and is left out here.
- Other controllers (read in the code). The ones that read the request's
  journal without `has.context` or a context policy are these:
  - announcements and navigation menus, which fall back to the site on
    purpose (`$context?->getId() ?? SITE_CONTEXT_ID`, or an explicit
    branch);
  - contexts, which checks for null;
  - highlights, which means to fall back to the site but fails in
    `HasRoles` first (above).

  No other controller does what the sections endpoint does.

## Proposed fix

Declare the need for a journal in the controller's route group, as the
other journal-only controllers do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-interface-site-address-server-error/fix.diff)):

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

`PKPUserController` uses this order (`has.user`, `has.context`, then
the role authorizer), so a signed-out visitor is still refused with 401
before the journal is checked. The fix covers both routes: at the
site's address the list and one section both answer 404 "The requested
resource was not found.". A refusal that names the missing journal
would need a new message. The endpoint still serves what
`pkp/pkp-lib#9938` asked for, a journal's sections read by a program.

Tried on `main`. With the fix, the list and the single section at the
site's address both answer 404 with that sentence, and nothing is
logged. These answers are the same with the fix in and out:

- At the journal's address the list answers 200 to `admin` and to the
  manager `rvaca`.
- The author `ccorino` is refused there with "The current role does not
  have access to this operation."
- At the site's address `rvaca` and `ccorino` get 401, and a visitor
  gets 401.

This is a proposal; the team decides.

**Alternatives**

- A null check in `getMany()` (`getContext()?->getId()`, or an early
  404). It fixes the list alone and leaves `get()` reading sections at
  an address that names no journal.
- `ContextRequiredPolicy` in `authorize()`. Every controller that uses
  it also lists `has.context`. A refusal from the policy alone answers
  401 (from `PolicyAuthorizer`) with the key
  `user.authorization.contextRequired`, whose English text is empty, so
  the program would get no sentence (read in the code).
- A null-safe guard in `HasRoles` (`$context?->getId()`). This endpoint
  does not need it: the site administrator passes on the site-level
  role and still meets the null in `getMany()`. It is the fix for the
  highlights endpoint (spec U11 A5), a separate change.

**What goes with it**

- What it touches: at the site's address the list changes from 500 to
  404, and one section from 400 to 404. Nothing changes at a journal's
  address, and no hook or stored data is involved.
- Backport: `stable-3_5_0` has the same controller, and `has.context` is
  registered there (`PKPRoutingProvider`); the diff applies as written
  (not tried there).
- Guard: an API test in pkp-lib that asks for the list without a
  journal, and the e2e check for spec U17's A10 (a **Planned** item).

Small: one line in one controller, and a test.

## Evidence

- The script saved in pkp-e2e walks the Steps and the cases in the last
  paragraph of Observed:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-interface-site-address-server-error/walk.js).
  On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sections-interface-site-address-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The argument
  `neighbour` asks for the list at the journal's address as `admin`,
  `rvaca` and `ccorino`, and at the site's address as a visitor. The
  argument `roles` asks at the site's address as `rvaca` and `ccorino`,
  and asks for the site's highlights as `admin`. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/sections-interface-site-address-server-error/fix.diff ojs omp ops`,
  then the script and its two modes, with the fix in and out.
- Walked on OJS, OMP and OPS on `main` and `stable-3_5_0` (the `roles`
  mode on OJS), on PostgreSQL and PHP 8.4.11. The fault does not touch
  the database. OMP and OPS have no sections endpoint; the script reads
  their address once. Datasets: pkp/datasets c657990 (2026-10-01).
- Code reads. `main`:
  - `SectionController`: lines 52–60, the middleware; line 147, the
    context read; line 108, `get()`'s null-safe compare.
  - `HasContext::handle()`; `HasRoles::handle()` line 63;
    `PolicyAuthorizer::handle()` lines 80–108; `PKPRoutingProvider`
    line 65 (`has.context`).
  - The middleware lists of `HighlightsController`,
    `PKPAnnouncementController` and `PKPNavigationMenuController`.
  - A grep of `lib/pkp/api/v1` and OJS `api/v1` for `'has.context'`
    (42 files), and for controllers that read `getContext()` without
    it or a context policy.

  3.5: the same controller, `HasRoles` line and middleware list in the
  `stable-3_5_0` lib/pkp. 3.4 (`origin/stable-3_4_0` in lib/pkp,
  `upstream/stable-3_4_0` in the app) and 3.3 (`stable-3_3_0`, the same
  remotes): no `api/v1/sections` in pkp-lib or OJS.
- Introduced: `git blame` on lines 55 and 147 on `main` gives
  41fa40ffc8, the file's first commit. The two later commits on the file
  (accbb5f21f, 627daf854c) touch neither line. The GitHub API's
  `commits/<sha>/pulls` gives `pkp/pkp-lib#9939`. OJS mounts the
  endpoint from 40ef7b6c4b (`api/v1/sections/index.php`).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library):
  `SectionController`, "api/v1/sections", "getId() on null" with api
  and site, "sections api 500", "has.context". Read, and not the same
  fault: `pkp/pkp-lib#10267` (the admin role at the site level) and
  `pkp/pkp-lib#10714` (theme options at the site level).
- Tips. `main`: OJS b84f8e2e44 with lib/pkp ddd8ab243a; OMP 3b0ecf794
  and OPS c8af945bb7, both with lib/pkp 3dc90c81a6. `stable-3_5_0`:
  OJS 091fb65453, OMP 9c5e24246 and OPS 38b61882d3, all with lib/pkp
  cf3f984335. `stable-3_4_0`: OJS 75cc2d488b with lib/pkp 32b0f4b4af.
  `stable-3_3_0`: OJS ac77c9fb35 with lib/pkp f6ab331645.
