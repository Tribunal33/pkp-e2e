# The "What is ORCID?" and "ORCID Authorization" pages' browser tab shows only "| {journal name}"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OPS (code; the bundled ORCID Profile plugin, when enabled; OMP bundles none)
  - 3.3: OJS, OPS (code; the bundled ORCID Profile plugin, when enabled; OMP bundles none)
- **Introduced** not traced; in the ORCID Profile plugin since at least [0d4b7a6555](https://github.com/pkp/orcidProfile/commit/0d4b7a65552be2917dc468b61e9dcb7db9811f34) (2019-02-14). Moved into pkp-lib by [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · 2023-10-06 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U04 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a15)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal's public pages name themselves in the browser tab before the
journal's name: "About the Journal | Journal of Public Knowledge". Two
ORCID pages do not, signed in or out. On the "What is ORCID?" page and
the "ORCID Authorization" page the tab reads "| Journal of Public
Knowledge" ("| Public Knowledge Press" on a press, "| Public Knowledge
Preprint Server" on a preprint server), though each page's heading
shows its name.

Contributors reach these pages through ORCID. Every ORCID email links
to "What is ORCID?". ORCID sends the contributor back to "ORCID
Authorization" after they answer an authorization request. Both pages
open by their address on every install, whether or not ORCID is turned
on, but nothing links to them until it is.

The fix is one attribute in each of the two page templates, the way
the other public pages already pass their title.

## Impact

- **Lost**: no work or data. The browser tab, the window title, the
  history and a bookmark's default name carry no page name and start
  with a stray "|". A screen reader announces that title when the page
  opens.
- **Who**: contributors to a journal, press or preprint server with
  ORCID turned on who follow an ORCID email's "What is ORCID?" link or
  come back from ORCID. With ORCID off, only a visitor who types the
  address.
- **Way round**: the page's own heading.

Low: only the title is incomplete, and the heading still names the
page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS). OMP and OPS are the same
  with their own names in brackets.
- `[general] sandbox = Off` in `config.inc.php` (the default). With it
  On, `OrcidHandler::verify()` and `updateScope()` return before
  rendering anything, so steps 3 and 6 give a blank page.
- ORCID need not be turned on. The dataset leaves it off, and both pages
  open by their address either way. The "What is ORCID?" address is the
  link every ORCID email carries. The "ORCID Authorization" address is
  where ORCID sends a contributor back from an authorization link.
  Opened directly, without the link's token, it shows the failure
  message that a used or expired link shows.

Signed out:

1. Open `/index.php/publicknowledge/about` ("About" › "About the
   Journal" [OMP: "About the Press"; OPS: "About the Server"]) and read
   the browser tab.
2. Open `/index.php/publicknowledge/orcid/about` and read the heading,
   the trail and the browser tab.
3. Open `/index.php/publicknowledge/orcid/verify` and read the heading
   and the browser tab.

Signed in:

4. Press "Login" and sign in as `dbarnes`.
5. Open `/index.php/publicknowledge/orcid/about` again and read the
   browser tab.
6. Open `/index.php/publicknowledge/orcid/verify` again and read the
   browser tab.

**Expected**: the browser tab names the page before the journal, as
step 1's does: "What is ORCID? | Journal of Public Knowledge" at steps 2
and 5, "ORCID Authorization | Journal of Public Knowledge" at steps 3
and 6.

**Observed**: at steps 2, 3, 5 and 6 the browser tab reads the "|"
separator and the context's name alone:

```
| Journal of Public Knowledge             (OJS)
| Public Knowledge Press                  (OMP)
| Public Knowledge Preprint Server        (OPS)
```

The headings read "What is ORCID?" and "ORCID Authorization". Step 3's
page reads "Your ORCID iD could not be verified. The link is no longer
valid."

Control: at step 1 the browser tab reads "About the Journal | Journal of
Public Knowledge" ("About the Press | Public Knowledge Press", "About
the Server | Public Knowledge Preprint Server").

## Cause

The frontend header builds the browser tab's title from the page title
its includer passes. `lib/pkp/templates/frontend/components/header.tpl`
line 23 translates `$pageTitle` into `$pageTitleTranslated` when the
includer gives no translated title, and `headerHead.tpl` prints
`{$pageTitleTranslated|strip_tags}`, then `| {context name}` on every
page but the home page.

`lib/pkp/templates/frontend/pages/orcidAbout.tpl` and `orcidVerify.tpl`
(line 11 of each) include the header with no `pageTitle`, and
`OrcidHandler::about()`, `verify()` and `updateScope()`
(`lib/pkp/pages/orcid/OrcidHandler.php`) assign none, so
`$pageTitleTranslated` is empty. The same templates already have the
page's name: they pass `orcid.about.title` and `orcid.verify.title` to
the breadcrumb (line 14) and print them as the heading (line 16).

The other public pages pass their title in the include, as
`userLogin.tpl` does (`pageTitle="user.login"`), or the handler assigns
it (`RegistrationHandler` for `userRegisterComplete.tpl`). The two ORCID
templates came into pkp-lib
in [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff)
("Move ORCID functionality into core application") from the ORCID
Profile plugin, whose templates already included the header this way.

Reach:

- "What is ORCID?" (`orcid/about`): checked on screen.
- "ORCID Authorization" from `orcid/verify`: checked on screen (the failure
  message). Its success message, with the ten-second return to the home
  page, renders the same template (checked in the code).
- "ORCID Authorization" from `orcid/updateScope`, the re-authorization
  link's landing, renders the same template (checked in the code).
- Every other frontend page in pkp-lib, OJS, OMP and OPS passes or
  assigns `pageTitle` or `pageTitleTranslated`, except
  `userConfirmActivation.tpl`, which passes a `$pageTitle` nothing
  assigns (a separate report,
  ([U02 A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U02-A2-activation-pages-no-heading.md)).
  The home pages, the site index and OJS's LOCKSS and CLOCKSS pages set
  `pageTitleTranslated` themselves (checked in the code).

## Proposed fix

Pass each page's heading key as its title in the header include, as
the sibling frontend pages do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-pages-tab-no-page-name/fix.diff)):

```diff
--- a/lib/pkp/templates/frontend/pages/orcidAbout.tpl
+++ b/lib/pkp/templates/frontend/pages/orcidAbout.tpl
-{include file="frontend/components/header.tpl"}
+{include file="frontend/components/header.tpl" pageTitle="orcid.about.title"}
--- a/lib/pkp/templates/frontend/pages/orcidVerify.tpl
+++ b/lib/pkp/templates/frontend/pages/orcidVerify.tpl
-{include file="frontend/components/header.tpl"}
+{include file="frontend/components/header.tpl" pageTitle="orcid.verify.title"}
```

The keys are the ones each page already gives its breadcrumb and
heading, so the tab, the trail and the heading read the same in every
language that translates them. The templates are shared, so the change
covers the three apps at once. It changes no API, no hook and no stored
data. A theme that overrides either template keeps its own version.

The fix was tried on `main` on the three apps: at steps 2, 3, 5 and 6
the browser tab read "What is ORCID? | Journal of Public Knowledge" and
"ORCID Authorization | Journal of Public Knowledge" (the press's and the
server's names on OMP and OPS), and the other public pages' titles were
the same with the fix in and out.

**Alternatives**:

- Assigning `pageTitle` in `OrcidHandler::about()`, `verify()` and
  `updateScope()`: three places instead of two, and the frontend
  templates, not the handlers, name the page everywhere else.
- A fallback in `headerHead.tpl` that drops the leading "|" when the
  title is empty: it hides the missing name instead of supplying it.

**What goes with it**:

- 3.5 has the same two templates, and the diff applies there as
  written.
- 3.4 and 3.3 carry the pages in the ORCID Profile plugin
  (pkp/orcidProfile `templates/orcidAbout.tpl` and `orcidVerify.tpl`),
  where the same change takes the plugin's keys
  `plugins.generic.orcidProfile.about.title` and
  `plugins.generic.orcidProfile.verify.title`.
- A check of the browser tab in the e2e tests of the ORCID pages (a
  **Planned** item in the spec).

This is a proposal; the team decides.

Small: one attribute in each of two shared templates, following the
sibling pages.

## Evidence

- The walk, a Playwright script that takes the Steps on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-pages-tab-no-page-name/walk.js),
  run with
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-pages-tab-no-page-name/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It records each
  page's address, HTTP status, browser tab, heading and trail.
  `MODE=nb` runs the neighbour check alone: signed out, the browser tab
  of the home page, About, Login, Privacy Statement, Submissions,
  Contact and Editorial Masthead, run with the fix in and out on
  2026-10-07 on the `main` tips below.
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`.
- Walked 2026-10-07 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [401a013](https://github.com/pkp/datasets/commit/401a013a7930d879b0e34997b834ffb2e809c564)
  (2026-10-06), on `main` and `stable-3_5_0`, OJS, OMP and OPS, with
  `sandbox = Off` and ORCID off in each context (`orcidEnabled` 0 in
  the dataset).
- Branch tips: main OJS 92bc2bb467 (lib/pkp e60013c77f), OMP a0e6d0a8b
  and OPS 7e34fdd57e (lib/pkp 5a5ab2d6c7); 3.5 OJS b8f5e9a951, OMP
  7d6b00060 and OPS acc0de0586 (lib/pkp 6d7f1540b6); 3.4 OJS
  d68934d0d1, OMP 0aec65441, OPS acd8ae704b (lib/pkp 767353f4fe); 3.3
  OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161 (lib/pkp ac3fa73402).
- 3.4 and 3.3 (code): lib/pkp has no ORCID pages; `header.tpl` and
  `headerHead.tpl` build the title the same way. OJS and OPS bundle the
  ORCID Profile plugin (`plugins/generic/orcidProfile`: OJS 894c2593e0
  on 3.4, OPS 7d8c4e3c51 on 3.4, both 41864d3770 on 3.3), whose
  `templates/orcidAbout.tpl` and `orcidVerify.tpl` include the header
  without a title, and whose `OrcidProfileHandler::about()` /
  `orcidVerify()` assign none. The keys
  `plugins.generic.orcidProfile.about.title` and `.verify.title` are in
  the plugin's English locale at all three commits. There the fault needs the
  plugin enabled. OMP bundles no ORCID plugin on 3.4 or 3.3 (no
  `orcidProfile` submodule).
- Introduced: in pkp/orcidProfile the templates' history on the default branch starts at 0d4b7a6555
  ("port PR to stable-3_1_2"), which already includes the header
  without a title; older history was not read.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/orcidProfile
  searched by the symptom's words and by the template names;
  `pkp/pkp-lib#13283` (open, a collector for ORCID fixes in 3.5) does
  not cover the title.
- Not driven: the "ORCID Authorization" page's success message and the
  `updateScope` landing (orcid.org is unreachable from the test
  installs); other languages; MySQL not checked (the fault is in a
  template).
