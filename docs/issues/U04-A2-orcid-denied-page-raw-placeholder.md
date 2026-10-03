# A contributor who presses "Deny" at ORCID lands on a page showing "##orcid.authDenied##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OPS (code; the ORCID Profile plugin, when enabled)
  - 3.3: OJS, OPS (code; the ORCID Profile plugin, when enabled)
- **Introduced** not traced; in the ORCID Profile plugin since at least [0d4b7a6555](https://github.com/pkp/orcidProfile/commit/0d4b7a65552be2917dc468b61e9dcb7db9811f34) (2019-02-14). Moved into pkp-lib by [c79f538c51](https://github.com/pkp/pkp-lib/commit/c79f538c51e8300366732f993edcd84fa18a18ff) · `pkp/pkp-lib#9818` for `pkp/pkp-lib#9771` · 2023-10-06 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A contributor who follows the emailed ORCID verification link and
presses "Deny" on ORCID's consent screen comes back to the "ORCID
Authorization" page. Where it should explain that they refused access,
the page shows the raw code `##orcid.authDenied##`.

The refusal itself is recorded correctly; only the explanation is
missing, and the fix is to render the sentence the translations already
hold.

The setup is any journal, press or preprint server with ORCID turned
on. The verification email goes out when an editor presses "Request
verification" on a contributor, or when a submission is accepted with
the ORCID setting "Send e-mail to request ORCID authorization from
authors when an article is accepted" ticked.

## Impact

- **Lost**: nothing. The refusal is stored and the pending verification
  request is cleared, as designed.
- **Who**: a contributor who declines ORCID access from the verification
  email.
- **Way round**: none needed. The contributor chose to deny; if they
  change their mind, they ask the editor, who sends a new email with
  "Resend Verification Email" on the contributor's ORCID iD field.

Low: a raw translation code where one sentence of explanation belongs,
with the outcome right.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. OMP and OPS are the same with the
  names given in brackets.
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

3. Sign in as `dbarnes` and open submission 8, "Traditions and Trends in
   the Study of the Commons" [OMP: 3, "The Political Economy of
   Workplace Injury in Canada"; OPS: 1, "The influence of lactation on
   the quantity and quality of cashmere production"].
4. Open Publication [OPS: Preprint] > "Contributors" and press "Edit"
   on Elinor Ostrom [OMP: Bob Barnetson; OPS: Carlo Corino].
5. In "ORCID iD", press "Request verification", then "Yes".

The contributor's side, signed out:

6. Open the email to eostrom@mailinator.com [OMP:
   bbarnetson@mailinator.com; OPS: ccorino@mailinator.com], "Requesting
   ORCID record access".
7. Copy its authorization link's `redirect_uri` parameter and decode it:
   `…/index.php/publicknowledge/orcid/verify?token=…&state=9&author_id=15`
   [OMP: `state=3&author_id=11`; OPS: `state=1&author_id=1`]. The token
   exists only in this link.
8. Open that address, signed out, with
   `&error=access_denied&error_description=User%20denied%20access`
   appended: the address ORCID's "Deny" returns the browser to.

**Expected**: the "ORCID Authorization" page explains the refusal, with
the sentence the translations already hold: "You denied access to your
ORCID record."

**Observed**: under the heading "ORCID Authorization", the red failure
box reads, in full:

```
##orcid.authDenied##
```

followed by "Please contact the journal manager with your name, ORCID
iD, and details of your submission." (on a press and a preprint server
that line is wrong too:
[its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U04-A8-orcid-failure-page-says-journal-manager.md)).
The page answers 200 with no browser console error. The server log
holds the integration's own line, `OrcidHandler::verify - ORCID access
denied. Error description: User denied access`; with `strict = On` it
would also hold `Missing locale key "orcid.authDenied"` (the walks ran
with strict mode off).

## Cause

`lib/pkp/templates/frontend/pages/orcidVerify.tpl`, line 52, renders the
denied branch with a key that no locale defines:

```smarty
{elseif $denied}
    {translate key="orcid.authDenied"}
```

The sentence exists under another name: `orcid.verify.denied`, "You
denied access to your ORCID record." (`lib/pkp/locale/en/user.po`, line
730, translated in English and 36 other languages), which nothing
renders. A missing key makes `PKP\i18n\Locale::translate()` return
`##orcid.authDenied##`.

`OrcidHandler::handleUserDeniedAccess()` sets `denied` when ORCID returns
`error=access_denied` to `verify()` for a contributor matched by the
emailed token.

The mismatch came from the ORCID Profile plugin, whose template asked
for `plugins.generic.orcidProfile.authDenied` while its locale defined
`plugins.generic.orcidProfile.verify.denied`. Moving the plugin into the
application renamed both prefixes to `orcid.` and kept the mismatch.

Reach:

- The denied branch is reached only through `verify()`, the landing of
  the verification email (checked in the code).
- No other `orcid.*` key that a template, a class or a ui-library file
  asks for is missing from the English locale (checked in the code: the
  52 literal `orcid.` keys in lib/pkp, lib/ui-library and each app).

## Proposed fix

Render the key that exists
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/fix.diff),
lib/pkp only, the same for OJS, OMP and OPS):

```diff
                 {elseif $denied}
-                    {translate key="orcid.authDenied"}
+                    {translate key="orcid.verify.denied"}
```

Tried on `main` on the three apps: with the diff applied, step 8's
failure box read "You denied access to your ORCID record.", and a
denial carrying a token no contributor holds still showed "Your ORCID
iD could not be verified. The link is no longer valid.", as it does
without the fix.

How this was settled:

- **Where the rule lives.** In the shared template, which all three apps
  render; no app overrides it.
- **Every instance.** The one denied branch.
- **What it touches.** One line of one template; no API, hook or stored
  data. It applies as written to 3.5. On 3.4 and 3.3 the same one-line
  change goes into the ORCID Profile plugin's `templates/orcidVerify.tpl`
  (`plugins.generic.orcidProfile.verify.denied`).
- **The test.** This repository's kept walk, or a check that every key
  `orcidVerify.tpl` asks for exists in `locale/en`.

**Alternatives**

- Add an `orcid.authDenied` entry to `user.po`: leaves
  `orcid.verify.denied` an unused duplicate and starts in English only,
  where the existing key has 36 translations.

Small: one line in one template, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js)
  (helpers in `lib.js` beside it and in
  [`../publish-without-issue-orcid-contributor-error/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-without-issue-orcid-contributor-error/lib.js))
  takes the Steps on the three apps loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js`.
  It reads the authorization link from the contributor's email and opens
  its `redirect_uri` with ORCID's denial parameters appended. `MODE=nb`
  runs the control cases (signed out: the verify page with no
  parameters, a denial with an unknown token, the "What is ORCID?" page).
- `fix.diff` paths start at the app root (`a/lib/pkp/…`); in a pkp-lib
  clone apply it with `-p3`.
- Not driven: ORCID's consent screen (orcid.org is unreachable from the
  test installs, and the placeholder credentials would be refused). The
  appended parameters are those of ORCID's OAuth denial redirect, which
  `OrcidHandler::verify()` reads (`error`, `error_description`).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default datasets of pkp/datasets c312c01 (2026-10-03).
- Branch tips: main OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335);
  3.4 OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b; 3.3 OJS
  ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161.
- 3.4 and 3.3 (code): lib/pkp has no ORCID verify page; OJS and OPS
  bundle the ORCID Profile plugin (`plugins/generic/orcidProfile` at
  894c2593e0 on OJS 3.4, 7d8c4e3c51 on OPS 3.4, 41864d3770 on both on
  3.3), whose `templates/orcidVerify.tpl` asks for
  `plugins.generic.orcidProfile.authDenied` while `locale/en/locale.po`
  defines only `plugins.generic.orcidProfile.verify.denied`, and whose
  handler sets `denied` on `error=access_denied`. There the fault needs
  the plugin enabled. OMP 3.4 and 3.3 bundle no ORCID plugin, and the
  Plugin Gallery offers it for OJS and OPS only, so OMP is out.
- Introduced: `git blame` on the template line gives c79f538c51, the move
  of the plugin into lib/pkp. In pkp/orcidProfile the template's history
  on its default branch starts at 0d4b7a6555 ("port PR to
  stable-3_1_2"), which already has the mismatch; older history was not
  read.
