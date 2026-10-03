# A press's or preprint server's ORCID verification failure page says to contact "the journal manager"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OPS (code; the ORCID Profile plugin, when enabled)
  - 3.3: OPS (code; the ORCID Profile plugin, when enabled)
- **Introduced** not traced; in the ORCID Profile plugin since at least [0d4b7a6555](https://github.com/pkp/orcidProfile/commit/0d4b7a65552be2917dc468b61e9dcb7db9811f34) (2019-02-14). Moved into pkp-lib by [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · 2023-10-06 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a8)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When a contributor's ORCID verification fails on a press or a preprint
server (a used or stale link, a refusal at ORCID, an iD already stored),
the "ORCID Authorization" page closes with "Please contact the journal
manager with your name, ORCID iD, and details of your submission." A
press has a press manager and a preprint server a preprint server
manager; there is no journal.

The fix is one English sentence. Ten other languages translate it,
nine of them naming a journal's manager or editor; their translators
would update them afterwards.

## Impact

- **Lost**: nothing; the sentence names the wrong kind of publisher.
- **Who**: a contributor on a press or a preprint server whose ORCID
  verification link fails, each time it does.
- **Way round**: none needed; the contributor contacts the press or
  server.

Low: wording that names a journal on a press and a preprint server,
while the page's outcome and advice are right.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. OPS is the same with the names given
  in brackets; OJS, where the sentence fits, is the control.
- `[general] sandbox = Off` in `config.inc.php` (the default). With it
  On, the "ORCID Authorization" page is empty.
- No ORCID account is needed. With the placeholder Client ID below,
  ORCID refuses the authorization link, so its consent screen and its
  "Deny" button cannot be reached. Pressing "Deny" there sends the
  browser to the link's `redirect_uri` with
  `&error=access_denied&error_description=User%20denied%20access`
  appended; step 8 opens that address directly. `error_description`
  must be present: the page's handler requires it.

ORCID on:

1. Sign in as `rvaca` and open Settings > Users & Roles > "ORCID".
2. Tick "Enable ORCID functionality", choose ORCID API "Member Sandbox",
   enter Client ID `APP-0000000000000000` and Client Secret
   `00000000-0000-0000-0000-000000000000`, and press "Save". Sign out.

The verification request:

3. Sign in as `dbarnes` and open submission 3, "The Political Economy of
   Workplace Injury in Canada" [OPS: 1, "The influence of lactation on
   the quantity and quality of cashmere production"].
4. Open Publication [OPS: Preprint] > "Contributors" and press "Edit"
   on Bob Barnetson [OPS: Carlo Corino].
5. In "ORCID iD", press "Request verification", then "Yes".

The contributor's side, signed out:

6. Open the email to bbarnetson@mailinator.com [OPS:
   ccorino@mailinator.com], "Requesting ORCID record access".
7. Copy its authorization link's `redirect_uri` parameter and decode it:
   `…/index.php/publicknowledge/orcid/verify?token=…&state=3&author_id=11`
   [OPS: `state=1&author_id=1`]. The token exists only in this link.
8. Open that address, signed out, with
   `&error=access_denied&error_description=User%20denied%20access`
   appended: the address ORCID's "Deny" returns the browser to.
9. Open the same address again (the link is now used).

**Expected**: under the failure message, the closing line points a
press's contributor to the press [OPS: the preprint server], not to a
journal manager.

**Observed**: in step 9 the page reads, in full:

```
ORCID Authorization
Your ORCID iD could not be verified. The link is no longer valid.
Please contact the journal manager with your name, ORCID iD, and details of your submission.
```

Step 8's page closes with the same sentence (its own failure line is a
raw code,
[its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U04-A2-orcid-denied-page-raw-placeholder.md)).
On OJS, submission 8 and Elinor Ostrom, the same
steps close with the same sentence, which fits a journal.

## Cause

`lib/pkp/templates/frontend/pages/orcidVerify.tpl`, line 59, closes
every failure branch with `{translate key="orcid.failure.contact"}`.
The key lives once, in `lib/pkp/locale/en/user.po` (line 739):

```
msgid "orcid.failure.contact"
msgstr "Please contact the journal manager with your name, ORCID iD, and details of your submission."
```

Neither OMP nor OPS defines its own text for it, so every app renders
the journal wording. The string came from the ORCID Profile plugin
(`plugins.generic.orcidProfile.failure.contact`, same text), which was
written for journals and moved into the shared library unchanged.

Reach:

- Every failure branch of the template: a used, stale or tampered link
  (the closing `{else}`), a refusal at ORCID (`$denied`), an iD already
  stored (`$duplicateOrcid`), rejected credentials (`$invalidClient`),
  and `$authFailure`. Walked on `$denied` and the used link; the others
  read in the code, since the line sits after the branches.
- `OrcidHandler::updateScope()`, the landing of the re-authorization
  email, renders the same template (code).
- Two other shared strings tell users to contact "the journal manager"
  on every app: `invitation.unavailable.description` (the "Invitation
  Unavailable" page) and `emails.userRoleMastheadUpdateNotify.body` (the
  masthead-visibility email). Both have their own report
  ([U06 A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A7-omp-ops-invitation-journal-wording.md)),
  whose fix this one follows; they are left out here.

## Proposed fix

Make the shared sentence neutral
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-failure-page-says-journal-manager/fix.diff),
lib/pkp only, the same for OJS, OMP and OPS):

```diff
 msgid "orcid.failure.contact"
-msgstr "Please contact the journal manager with your name, ORCID iD, and details of your submission."
+msgstr "Please contact the editorial team with your name, ORCID iD, and details of your submission."
```

"The editorial team" is how pkp-lib's other shared texts name the people
behind a journal, press or server (the submission wizard's "Upload any
files the editorial team will need to evaluate your submission."), and
the fix proposed for the same wording on the "Invitation Unavailable"
page uses it too. No app overrides the key, and the template has a
single closing line, so this one string covers every failure on every
app. It applies as written to 3.5; on 3.4 and 3.3 the ORCID Profile
plugin needs the same change in its own `locale/en/locale.po`. No code,
API, hook or stored data changes. The guard is this repository's kept
walk, reading the closing line on a press.

Tried on `main` on the three apps: with the diff applied, steps 8 and 9
closed with "Please contact the editorial team with your name, ORCID
iD, and details of your submission.", and the rest of the page was
unchanged.

**Alternatives**

- An override per app: keep the key in lib/pkp and redefine it in
  `omp/locale/en/user.po` and `ops/locale/en/user.po`, as OMP already
  does for 34 lib/pkp keys and OPS for 44
  (`admin.settings.statistics.sushiPlatform.isSiteSushiPlatform` reads
  "all journals", "all presses", "all servers"). It gives "press
  manager" and "preprint server manager" and leaves OJS's "journal
  manager" unchanged, at the cost of two more repositories. Languages
  without the override fall back to lib/pkp's own translation, so it is
  no better or worse for translations than the neutral string.
- Name the context ("Please contact {$contextName} …", passed by the
  template as the success line's `orcid.verify.success.redirect` is):
  works, but a template change for a text that needs none.
- Name the context's principal contact and email ("contact {$contactName}
  at {$contactEmail}", as the editorial reminder email does): more useful
  to the contributor, but the handler must assign both, and it is a
  wording decision for the team.

Small: one English string in lib/pkp, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js),
  shared with U04 A2 and run from this report's folder too
  ([`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-failure-page-says-journal-manager/walk.js)):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-failure-page-says-journal-manager/walk.js`.
  It takes the Steps on the three apps loaded from the default dataset,
  reading the authorization link from the contributor's email and
  opening its `redirect_uri` with ORCID's denial parameters appended.
  `MODE=nb` runs the control cases (signed out: the verify page with no
  parameters, a denial with an unknown token, the "What is ORCID?"
  page).
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`. The trial reloaded the install's dataset
  after applying it, which also empties the install's cache.
- Not driven: ORCID's consent screen (orcid.org is unreachable from the
  test installs, and the placeholder credentials would be refused); the
  failure branches other than `$denied` and the used link.
- Other languages (code, lib/pkp `locale/*/user.po` at main): ten of
  the 70 non-English locales translate `orcid.failure.contact` (ar, bg,
  de, el, he, hu, ja, nl, ru, sl). Eight name the journal's manager,
  Arabic the editor-in-chief and Greek "the Administrator"; the rest
  leave it empty.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default datasets of pkp/datasets c312c01 (2026-10-03).
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335);
  3.4 OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b; 3.3 OJS
  ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161.
- 3.4 and 3.3 (code): lib/pkp has no ORCID verify page. OPS bundles the
  ORCID Profile plugin (`plugins/generic/orcidProfile` at 7d8c4e3c51 on
  3.4, 41864d3770 on 3.3), whose `templates/orcidVerify.tpl` closes
  every failure with `plugins.generic.orcidProfile.failure.contact`,
  "Please contact the journal manager …" in `locale/en/locale.po`.
  There the fault needs the plugin enabled. OMP 3.4 and 3.3 bundle no
  ORCID plugin, and the Plugin Gallery offers it for OJS and OPS only,
  so OMP is out.
- Introduced: `git blame` on the locale and template lines gives
  c79f538c51, the move of the plugin into lib/pkp. In pkp/orcidProfile
  the template's history on its default branch starts at 0d4b7a6555
  ("port PR to stable-3_1_2"), whose `locale/en_US/locale.xml` already
  has the sentence; older history was not read.
