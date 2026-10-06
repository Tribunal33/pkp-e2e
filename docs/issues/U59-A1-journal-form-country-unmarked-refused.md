# Hosted Journals: "Country" carries no Required mark, yet no journal saves without one

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no "Country" field)
- **Introduced** `pkp/pkp-lib#6832` for `pkp/pkp-lib#6099` · [6b462e0147](https://github.com/pkp/pkp-lib/commit/6b462e0147482d8f8a7045ddf83a175209c7b548) · committed 2021-03-06, merged 2021-05-06 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a1), spec U07 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The form for a journal (press, server) in Administration › "Hosted
Journals" marks "Journal title", "Journal initials", the principal
contact and "Path" as required and leaves "Country" unmarked, so a Site
Administrator expects to leave it empty. "Save" with no country is
refused with "This is not a valid string." and "This is not a valid
country." under "Country". This happens on "Create Journal", on a row's
"Edit" and on the Settings Wizard's "Journal" tab.

On a journal that has no country, nothing on "Edit" can be changed until
one is picked, not even "Enable this journal to appear publicly on the
site". Journals upgraded from 3.3 have no country until a manager saves
their "Masthead".

## Impact

- **Lost**: no data. The form keeps everything typed through the
  refusal, so a country is the only thing to add. A guessed country is
  stored, though. OJS writes it into each article's JATS XML
  (`<publisher-loc><country>`) and into review deposits to ORCID. OMP
  and OPS use it nowhere outside the settings forms and the REST API.
- **Who**: Site Administrators. On "Create Journal", every time they
  leave "Country" empty. On "Edit" and the wizard's "Journal" tab, on
  every journal with no country stored.
- **Way round**: pick a country.

Low: the administrator clears the refusal on the spot. It would be
medium if an administrator who cannot find out a journal's country had
to make an urgent change on "Edit", such as taking the journal offline.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; a press or a server shows
  the same with "Press" or "Server" in the names).
- For "Editing" only: a journal with no country. Signed in as `admin`
  on Administration › "Hosted Journals", open the browser's developer
  console and send the request "Create Journal" sends, without
  `country`:

  ```js
  fetch('/index.php/index/api/v1/contexts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Csrf-Token': pkp.currentUser.csrfToken},
      body: JSON.stringify({
          name: {en: 'u59a No Country'}, acronym: {en: 'U59A'},
          contactName: 'u59a Contact', contactEmail: 'u59a@mailinator.com',
          urlPath: 'u59anc', primaryLocale: 'en', supportedLocales: ['en'], enabled: true,
      }),
  }).then((r) => r.status);   // 200
  ```

Creating:

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals"
   (`/index.php/index/en/admin/contexts`).
3. Press "Create Journal".
4. Look at the labels. "Journal title", "Journal initials", "Principal
   Contact Name", "Principal Contact Email address", "Path", "Languages"
   and "Primary locale" carry the red "*". "Country" carries none.
5. Type "u59a Journal" in "Journal title", "U59A" in "Journal initials",
   "u59a Contact" in "Principal Contact Name", "u59a@mailinator.com" in
   "Principal Contact Email address" and "u59a" in "Path". Tick
   "English" under "Languages" and choose "English" for "Primary
   locale". Leave "Country" as it opens, with nothing chosen.
6. Press "Save".

Editing:

7. Reload "Hosted Journals", press the arrow of the `u59anc` row, then
   "Edit". "Country" opens with nothing chosen.
8. Untick "Enable this journal to appear publicly on the site".
9. Press "Save".

**Expected**: step 6 creates the journal and opens its Settings Wizard;
step 9 shows "Saved" and the journal is no longer public. "Country" is
optional on this form.

**Observed**: both saves are refused. The form reads "Please correct one
error." and under "Country":

```
This is not a valid string. This is not a valid country.
```

Step 6 sends `POST /index.php/index/api/v1/contexts` and step 9 sends
`POST /index.php/u59anc/api/v1/contexts/{id}` with
`X-Http-Method-Override: PUT`. Both are form-encoded with `country=`
(empty), and both answer 400. Nothing is stored. The form keeps what was
typed ("Enable…" stays unticked), and with "Iceland" chosen the same
"Save" goes through: the journal is created, and `u59anc` is no longer
public.

## Cause

`PKPContextForm` (`lib/pkp/classes/components/forms/context/PKPContextForm.php`)
adds `country` as a `FieldSelect` without `isRequired`, with no empty
choice, and with the value `null` when the journal has none. "Create
Journal", "Edit" (`ContextGridHandler::createContext()` and
`editContext()`) and the Settings Wizard's "Journal" tab
(`AdminHandler::wizard()`) all build it. With nothing chosen, the form
posts `country=`. On the server, the `ConvertEmptyStringsToNull`
middleware (`PKPRoutingProvider`) and
`PKPBaseController::convertStringsToSchema()` turn the empty string into
`null`.

`PKPContextService::validate()` then checks the request against
`lib/pkp/schemas/context.json`, where `country` has `"validation":
["country"]` and no `"nullable"`. So the `null` fails the `string` type
rule that `PKPSchemaService::getValidationRules()` adds, and the
`country` rule too: two messages and a 400. A request that leaves the
key out passes, because `country` is not in the schema's `required`
list. That is how a journal without a country exists: one upgraded from
3.3 (the field came with 3.4, and no 3.4 migration sets it), or one
created through the REST API without the key. The form posts every
field, so such a journal's "Edit" is refused.

The decision recorded in `pkp/pkp-lib#6099` before the change merged
(2021-04-13) reads: "Make country field not required in the add/edit
journal form". The same decision makes the field required on Settings ›
Journal › "Masthead". The commit message says so too: "Added a country
field, which is optional on the context form and required on the
masthead form". The form follows that, but the schema entry added in
the same commit makes the field required for every write that carries
it.

Reach:

- "Create Journal" and "Edit" on Hosted Journals were checked on screen.
  The Settings Wizard's "Journal" tab was checked in the code (the same
  form and request).
- Settings › Journal › "Masthead" (`PKPMastheadForm`) sets `isRequired`,
  so the browser refuses an empty "Country" with "This field is
  required." before anything is sent. Checked on screen.
- The REST API, `POST` and `PUT /api/v1/contexts`: `country: null` and
  `country: ""` (which becomes `null`) are refused; a missing key is
  accepted. Checked in the code.
- Other properties in `context.json` (lib/pkp's and the three apps')
  without `nullable` that are not in `required`: `country` is the only
  one a form leaves empty. The others are toggles, radio groups with a
  default, or not on a form. Checked in the code.
- `OrcidManager::getCountry()` (lib/pkp) is declared `: string` but
  returns `$context->getData('country')` without a fallback, unlike
  `getCity()` beside it (`?? ''`). For an OJS journal with no country,
  building a review deposit to ORCID (`OrcidReview`, OJS) would fail
  with a type error. Checked in the code only; not driven.

## Proposed fix

Make `country` nullable in the shared context schema, as `author.json`
already does for its own optional `country` (`["nullable", "country",
"regex:…"]`):
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-form-country-unmarked-refused/fix.diff).

```diff
--- a/lib/pkp/schemas/context.json
+++ b/lib/pkp/schemas/context.json
 		"country": {
 			"type": "string",
 			"validation": [
+				"nullable",
 				"country"
 			]
 		},
```

Tried on `main`, all three apps. Steps 6 and 9 then save: the journal
is created without a country, and `u59anc` is no longer public. A check
that "Masthead" on a journal with no country still refuses "Save" with
"This field is required." and stores nothing gave the same result with
and without the fix.

**Alternatives**:

- Mark "Country" required on `PKPContextForm` (`isRequired`). The label
  would then match the server, but this reverses the decision in
  `pkp/pkp-lib#6099`, and the "Edit" of a journal with no country would
  still be blocked. That is a product decision, not a fix.
- Leave the schema and drop `country` from the request when it is
  empty. That is a workaround in one form, and every API client would
  still need to know to leave the key out rather than send `null` or
  `""`.

**What goes with it**:

- ORCID: with the fix, journals without a country become an ordinary
  state, so the type error in `OrcidManager::getCountry()` (Cause,
  Reach) becomes easier to meet. A `?? ''` fallback like `getCity()`'s
  would stop the error, but `OrcidReview` would then send an empty
  country to ORCID, and whether ORCID accepts that is unverified. The
  alternative is to skip the deposit, as `OrcidReview::build()` already
  does when the journal has no online ISSN. This is left out of the
  diff for whoever owns the ORCID review deposit to decide.
- No data repair: no stored value is wrong, and a journal without a
  country is a valid state after the fix.
- What changes for callers: the REST API accepts an empty `country` on
  `POST` and `PUT /api/v1/contexts`, which only relaxes a refusal.
  "Masthead" keeps its own requirement in the browser.
- Backport: the schema line applies as written to 3.5 and 3.4.
- Optional follow-up: an empty first choice in the select, so a country
  picked by mistake can be cleared on this form.
- Test: pkp's own data test
  (`cypress/tests/data/10-ApplicationSetup/20-CreateContext.cy.js`)
  picks "Iceland", which is why it never met the refusal. A unit test of
  `PKPContextService::validate()` with `country => null` for add and
  edit would catch it.

Small: one line in the shared schema, and a unit test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-form-country-unmarked-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-form-country-unmarked-refused/lib.js))
  takes steps 1–6 and the "Iceland" save by default. With `edit` it
  sends the Editing precondition's request from the admin's page and
  takes steps 7–9. With `neighbour` it runs the "Masthead" check. Each
  run starts from an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/journal-form-country-unmarked-refused/walk.js [edit|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The upgrade route for the Editing precondition could not be walked.
  The plan was PKP's `stable-3_3_0` dataset (pkp/datasets c657990)
  upgraded to `main` with `php tools/upgrade.php upgrade`, and its
  `publicknowledge` (the 3.3 dumps hold no `country` setting). On all
  three apps the upgrade stopped at 3.3.9.9, at the 3.4 pre-flight
  check: "There are unprocessed log files from more than 1 day ago in
  the directory …/usageStats/usageEventLogs/ … All logs in this
  directory older than 20261001 must be processed or removed before the
  upgrade can continue." The usage logs come from the dataset's own
  `files/`. So "a journal upgraded from 3.3 has no country" rests on
  the code (the 3.3 schema has no `country`, and no 3.4 migration sets
  one), and the walks used the console request instead.
- The walks ran in Chromium. Datasets: pkp/datasets c657990
  (2026-10-01). No request failed on the server and no page script
  failed.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b; pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35; pkp-lib f6ab331645.
- Code reads for 3.4 and 3.3. 3.4 has the same schema entry, the same
  `PKPContextForm.php` field, `PKPMastheadForm.php` with `isRequired`,
  and the same validation path (`APIHandler::_convertStringsToSchema()`,
  `PKPContextService::validate()`). 3.3's `schemas/context.json` and
  `PKPContextForm.inc.php` have no `country`. Where the country goes
  (Impact): a search of the three apps for the context's `country`
  finds only the forms, OJS's JATS Template plugin (`ArticleFront`) and
  `OrcidManager`/`OrcidReview`.
- Upstream: the nearest hit, `pkp/pkp-lib#10908` (required fields not
  flagged when a journal's primary language differs), is a different
  fault.
- Not walked: the Settings Wizard's "Journal" tab. Unverified: the
  ORCID type error and what ORCID does with an empty country (code read
  only).
