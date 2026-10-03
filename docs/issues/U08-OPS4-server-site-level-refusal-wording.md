# A server's settings address typed with the site's path refuses with "No server in context!", which says nothing a user understands

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OJS, OMP, OPS (code; each "No … in context!")
- **Introduced** `pkp/ops` [4109ca6688](https://github.com/pkp/ops/commit/4109ca6688e2f79a1e919507793d098084061c42), committed without a PR · 2019-06-04 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#ops4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A preprint server's settings page has a **site-level address** when the
server's path in it is replaced by `index`, the site's own path: for
Settings › Website, `/index.php/index/en/management/settings/website`
instead of `/index.php/publicknowledge/en/management/settings/website`.
The Site Administrator and the server's manager who open it get the
access-denied page reading "No server in context!". A signed-out
visitor gets the Login page first, and the same page after signing in.

"In context" is a developer's word: the sentence does not tell the user
that the address names no server. A journal and a press say so on the
same page: "No journal was found that matched your request." ("No
press was found that matched your request."). OJS and OMP reworded
their sentence in 2022; OPS was left out.

The user reaches a site-level address by typing or editing it, and the
server's own address opens the page.

## Impact

- **Lost.** Nothing: the page refuses as it should.
- **Who.** A user who types or edits a server page's address and puts
  the site's path where the server's belongs; no page links there.
  Rare.
- **Way round.** The server's own address, or its menus.

Low: wording on a refusal whose outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main` (server `publicknowledge`,
  "Public Knowledge Preprint Server").

Steps:

1. Sign in as `admin`.
2. Open the server's Settings › Website,
   `/index.php/publicknowledge/en/management/settings/website`. The
   "Website Settings" page opens.
3. In the browser's address bar, replace the server's path
   `publicknowledge` with `index`:
   `/index.php/index/en/management/settings/website`.
4. Press "Logout" in the user menu.
5. Open the step 3 address again. The site's Login page opens.
6. Sign in there as `dbarnes`.

**Expected.** In steps 3 and 6, the access-denied page says that the
address names no server, as a journal and a press do: "No server was
found that matched your request.".

**Observed.** Steps 3 and 6 land on
`/index.php/index/en/user/authorizationDenied?message=user.authorization.noContext`,
which answers 200 and shows:

```
Home /
No server in context!
```

## Cause

The sentence is OPS's own English text for the key
`user.authorization.noContext`, `locale/en/locale.po` lines 482–483:

```po
msgid "user.authorization.noContext"
msgstr "No server in context!"
```

pkp-lib's `ContextPolicy` (`lib/pkp/classes/security/authorization/internal/ContextPolicy.php`,
line 36) adds a `ContextRequiredPolicy` with this key. A site-level
address has no server, so the policy refuses, and
`PKPPageRouter::handleAuthorizationFailure()` sends a signed-in user to
`user/authorizationDenied` with the key as the message, and a
signed-out visitor to Login first.

OPS took the text from OJS's "No journal in context!" when the server
app was made from OJS (4109ca6688). OJS and OMP rewrote theirs under
`pkp/pkp-lib#7265`, the editorial decisions rework (`pkp/ojs#3279`,
`pkp/omp#1071`, 2022). OPS's PR for the same issue, `pkp/ops#240`, left
the text as it was.

Reach (read in the code on `main`):

- Every page refusal through `ContextPolicy` or a policy built on it
  (`ContextAccessPolicy`, `SubmissionAccessPolicy`,
  `AuthorDashboardAccessPolicy` and the others in
  `lib/pkp/classes/security/authorization/`), for every role: the
  site-level addresses of the settings, users, tools, statistics,
  submission, decision and author-dashboard pages. Only Settings ›
  Website was walked.
- No page builds a site-level address to these pages: the URLs to
  `management` and the other pages take the current server's path.
- The REST API and the grids answer a site-level request with the same
  text: `APIRouter` puts it in the 403 response's `errorMessage`, and
  `PKPComponentRouter` in the JSON error.
- Other languages: OPS's translations of the old sentence (German,
  Czech, Portuguese (Brazil), Ukrainian, Macedonian, Bulgarian) keep its
  wording; French (Canada) and five others are empty; French,
  Portuguese, Croatian, Indonesian and Kyrgyz have no entry. OMP's
  French (Canada) still reads "Aucune presse en contexte!". These are
  translations, outside this fix.

## Proposed fix

Give OPS the wording OJS and OMP use. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/server-site-level-refusal-wording/fix.diff),
one line in OPS's English locale.

```diff
 msgid "user.authorization.noContext"
-msgstr "No server in context!"
+msgstr "No server was found that matched your request."
```

Tried on OPS `main`: steps 3 and 6 read "No server was found that
matched your request.". With the fix in and out, two pages stay as they
were. When `dbuskins`, a moderator, opens the server's own Settings ›
Website, he is refused with "The current role does not have access to
this operation.". When `admin` opens it, the page opens.

**Alternatives**

- One shared sentence in pkp-lib ("No journal, press or server was
  found …"): it reads worse in each app, and each app already words
  its context-specific texts itself.

**What goes with it**

- Translations: the six languages that translate the old sentence
  follow on Weblate.
- Backport: `stable-3_5_0` has the line where `main` has it, and the
  diff applies as it stands. `stable-3_4_0` has it at line 486, and the
  diff applies with a 4-line offset. `stable-3_3_0` keeps the text in
  `locale/en_US/locale.po`, where OJS and OMP also read "No journal
  (press) in context!".
- Guard: a Planned item in spec U08 on Rule 26c, reading the refusal's
  sentence on a server.

Small: one line in one locale file, copying the other two apps'
wording, tried on OPS.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run (OJS and OMP as the
  control, which read their "was found" sentences):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/server-site-level-refusal-wording/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/server-site-level-refusal-wording/walk.js`
  (`neighbour` as its argument runs the two neighbour pages alone).
- The fix, tried 2026-10-03 on the `main` tip below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/server-site-level-refusal-wording/fix.diff ops`.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each).
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib 9e41f10273; read `locale/en/locale.po` in each
  app, `ContextPolicy.php` and `PKPPageRouter.php`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib ac3fa73402; read `locale/en_US/locale.po` in
  each app, `internal/ContextPolicy.inc.php` (line 29, the same key),
  `ManagementHandler.inc.php`, which adds `ContextAccessPolicy`, a
  `ContextPolicy`, and `PKPPageRouter.inc.php`.
- Introduced: 4109ca6688 ("clean locale files") turned OJS's
  `<message key="user.authorization.noContext">No journal in
  context!</message>` into "No server in context!"; the GitHub API names
  no PR for it. `git blame` reaches it through 3c5d7727ed (a revert of a
  Weblate commit) and 93c92c3f71 (the move from XML to `.po`).
- Not driven: the other pages that refuse through the same policy (Cause,
  Reach), the REST API and grid answers, roles other than the Site
  Administrator and the server's manager, and the page in another
  interface language.
- Upstream search 2026-10-03: pkp/pkp-lib by "No server in context",
  "in context!", "user.authorization.noContext" and "No journal in
  context"; pkp/ops by "No server in context", "noContext", "server was
  found" and "in context" message; pkp/ui-library by "No server in
  context". `pkp/pkp-lib#7878` and `pkp/pkp-lib#1576` (closed) quote the
  key in code; neither is about its wording.
