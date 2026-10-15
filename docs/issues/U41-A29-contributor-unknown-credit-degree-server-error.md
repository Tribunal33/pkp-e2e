# A program saving a contributor with an unknown CRediT degree gets a server error, and part of the change is kept

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no CRediT roles)
  - 3.4: none (code; no CRediT roles)
  - 3.3: none (code; no CRediT roles)
- **Introduced** `pkp/pkp-lib#11639` for `pkp/pkp-lib#857` · [036af20d17](https://github.com/pkp/pkp-lib/commit/036af20d176c3dc32d5b36b59c7b41bf5688bcef) · 2025-07-07 · Bozana Bokan (bozana); the commit's author is jyhein
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U41 [A29](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a29)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The contributor form offers only "Lead", "Equal" and "Supporting" as a
CRediT role's "Degree", or none. A program that saves a contributor
through the install's programming interface (the REST API's contributor
edit request) can send any other word as a degree ("lead" in lower
case, for one). The program expects the save to be refused with a
message naming the field, and the contributor to stay as it was.

Instead the save fails with a server error after part of the change is
made. The CRediT roles the request lists before the faulty one take
their new degrees. The roles it lists after the faulty one are not
saved, and the roles it leaves out are removed from the contributor.
The rest of the change, a new given name for one, is lost.

## Impact

- **Lost**: one contributor's change per request, and the error does
  not say which field was wrong. An editor-level program can do this to
  a published version's contributor too; its article page and JATS then
  show the half-changed roles (code).
- **Who**: only a program writing to the REST API as an editor, or as
  an author allowed to edit the publication, such as an import script
  or an integration. No release has it: CRediT roles are new on `main`.
- **Way round**: send the request again with "LEAD", "EQUAL",
  "SUPPORTING" or no degree. That repairs the contributor: every role
  and the new given name are saved. The API reference does not list
  the allowed degrees or say they are in capitals; only a contributor
  read back from the API shows them.

Low: no screen reaches it, and a corrected request repairs it. It would
rise if a plugin or an integration were found sending other degrees.

## Steps to reproduce

The steps send the request a program would send.

Preconditions:

- PKP's default test dataset for `main`, journal `publicknowledge`.
- `api_key_secret` set in the install's `config.inc.php` (section
  `[security]`); the dataset leaves it empty, and without it no API key
  can be made.
- `dbarnes`'s API key: as `dbarnes`, Profile › "API Key" › "Create API
  Key", and copy the key (`$KEY` below).

Steps (OJS: submission 7, "Developing efficacy beliefs in the
classroom", publication 8, contributor Domatilia Sokoloff, id 14):

1. Sign in as `dbarnes`, open submission 7, side menu "Contributors",
   "Edit" on Domatilia Sokoloff.
2. Under "CRediT roles and the degrees of contribution", press "Add
   Another Role": a row with the role "Conceptualization". Set its
   "Degree" to "Lead". Press "Add Another Role" again, set the new
   row's role to "Data Curation" and leave its "Degree" empty. "Save".
3. Read the contributor:
   `curl -H "Authorization: Bearer $KEY" https://<install>/index.php/publicknowledge/api/v1/submissions/7/publications/8/contributors/14`
4. Send the record back with `curl -X PUT` to the same address,
   `-H "Content-Type: application/json"`, with the record as read and
   these changes: `contributorRoles` as the roles' ids (`[1]`), the
   fields whose value is `null` left out, and

   ```json
   {"givenName": {"en": "Domatilia hkk4", "fr_CA": ""},
    "creditRoles": [
      {"role": "https://credit.niso.org/contributor-roles/conceptualization/", "degree": "EQUAL"},
      {"role": "https://credit.niso.org/contributor-roles/software/", "degree": "lead"}]}
   ```

   The body keeps `"contributorType": "PERSON"` and the contributor's
   `affiliations` from the record; without them the handler empties
   the contributor's names, email and affiliations (see Cause).
5. "Edit" on Domatilia Sokoloff again.

**Expected**: step 4 answers 400 with an error on
`creditRoles.1.degree`, and step 5 shows what step 2 saved:
"Conceptualization" "Lead", "Data Curation" with no degree, the given
name "Domatilia".

**Observed**: step 4 answers 500. The server log has:

```
production.ERROR: SQLSTATE[23514]: Check violation: 7 ERROR: new row for relation "credit_contributor_roles" violates check constraint "credit_contributor_roles_credit_degree_check"
DETAIL: Failing row contains (33, 14, 9, lead, null).
```

Step 5 shows "Conceptualization" "Equal" alone: "Data Curation" is
gone and "Software" was not added. The given name is still "Domatilia".
The affiliation, "University College Cork", is kept.

Sending step 4's body again with "LEAD" for Software answers 200 and
saves it whole: "Conceptualization" "Equal", "Software" "Lead", and the
given name "Domatilia hkk4".

## Cause

The degree a request sends is never checked against the degrees the
database accepts.

`schemas/author.json` (pkp-lib) declares `creditRoles` with
`"readOnly": true`, because the roles live in their own table
(`credit_contributor_roles`), not in `author_settings`.
`PKPSchemaService::addPropValidationRules()` (line 423) returns early
for a read-only property, so the schema's validator gets no rule for
`creditRoles` or its `degree`. `Repository::validate()` in
`classes/author/Repository.php` adds checks of its own for
`contributorRoles` and the affiliations, but none for `creditRoles`.

The write then goes through. `author\DAO::update()` (line 187) runs,
in this order: `Repo::affiliation()->saveAffiliations()`;
`creditContributorRole\Repository::addCreditRoles()`, which deletes the
contributor's CRediT roles the request leaves out, then writes one row
per role in the order sent, `['credit_degree' => $rd['degree'] ??
null]` (line 67); `addContributorRoles()`; and last `parent::_update()`,
which writes the contributor's own row and settings. The
`credit_degree` column is an enum of `CreditRoleDegree::getDegrees()`
(LEAD, EQUAL, SUPPORTING), so PostgreSQL refuses the first unknown degree with
`credit_contributor_roles_credit_degree_check`. Nothing wraps the writes
in a transaction, so what was written before the refusal stays, and the
contributor's own row is never written.

Reach:

- Adding a contributor (`PKPSubmissionController::addContributor()`)
  runs the same `validate()`, then `author\DAO::insert()`, which writes
  the contributor's row first, then the affiliations, the CRediT roles
  and the contributor roles. A faulty degree stops it in the CRediT
  roles: the new contributor stays in the list with the CRediT roles
  listed before the faulty one, and with no contributor role (Author,
  Translator) at all (code).
- The same gap on `contributorType`: the schema gives it only
  `nullable`, and the `contributor_type` column is an enum of
  `ContributorType::getTypes()` (PERSON, ORGANIZATION, ANONYMOUS). An
  edit with "person" fails on `authors_contributor_type_check` after
  the affiliations, CRediT roles and contributor roles are written,
  and the given name is not saved. Checked on all three apps by
  running the handler's `validate()` and `edit()` calls with that
  value. The form sends only the three names.
- A neighbouring gap, not covered by the fix: an edit request that
  leaves out `contributorType` answers 200 and empties the
  contributor's given and family names and email, and removes the
  affiliations. `removeIrrelevantContributorTypeData()` (line 2498)
  reads the missing key (a PHP warning), so it treats every type's
  fields as irrelevant and sets them to null, and `editContributor()`
  replaces the affiliations with the empty list it was sent (walked on
  OJS).
- Nothing else writes a degree: the native XML import carries no CRediT
  roles, and a new version copies the stored ones (code).
- An unknown CRediT role (`creditRoles.*.role`) is not part of this
  fault: `addCreditRoles()` skips an identifier it does not know
  (line 64) and saves the rest, with no error. The fix leaves that
  as it is; refusing it too would be a separate decision.

## Proposed fix

Add the rules the read-only schema property cannot carry in
`Repository::validate()`, beside the checks it already makes there
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contributor-unknown-credit-degree-server-error/fix.diff)):

```diff
+        $rules = $schemaService->getValidationRules(PKPSchemaService::SCHEMA_AUTHOR, $allowedLocales);
+        // The schema marks creditRoles readOnly (they are stored in their own table), so it adds no
+        // rule for them. Their degree must still be one the credit_degree column accepts, and the
+        // contributor type one the contributor_type column accepts, or the save fails midway.
+        $rules['creditRoles'] = ['nullable', 'array'];
+        $rules['creditRoles.*.degree'] = ['nullable', Rule::in(CreditRoleDegree::getDegrees())];
+        $rules['contributorType'][] = Rule::in(ContributorType::getTypes());
+
         $validator = ValidatorFactory::make(
             $props,
-            $schemaService->getValidationRules(PKPSchemaService::SCHEMA_AUTHOR, $allowedLocales),
+            $rules,
```

(with `use Illuminate\Validation\Rule;` and `use
PKP\author\creditRole\CreditRoleDegree;`). Both the add and the edit
call `validate()` before any write, so a request with an unknown degree
or type is answered 400 with "The selected creditRoles.1.degree is
invalid." and nothing is written. The rule reads the allowed values from
the same enums the columns are built from, as `AddMediaFiles::rules()` and
`PKPSubmissionController::validateVersionStage()` do with `Rule::in()`
over an enum's cases. The form's empty degree reaches the server as `null`
(Laravel's `ConvertEmptyStringsToNull`), which `nullable` accepts.

Tried on `main`. On OJS, step 4 then answered 400 with
`{"creditRoles":{"1":{"degree":["The selected creditRoles.1.degree is invalid."]}}}`,
and step 5 showed what step 2 saved. In the three apps, the handler's
`validate()` and `edit()` calls run with the same values refused the
degree, and refused "person" as the type with `{"contributorType":["The
selected contributor type is invalid."]}`; nothing was written. As a
neighbour check, the form's own "Save" (two roles, one without a
degree, and a new given name) and a save with the degrees "SUPPORTING"
and `null` and the type "PERSON" stored everything they sent, with the
fix in and out.

**Alternatives**:

- Map an unknown degree to none in `addCreditRoles()`
  (`CreditRoleDegree::toValue()`). No server error, but the program's
  "lead" would be dropped without a word.
- Drop `readOnly` from `creditRoles` in the schema and give `degree` an
  `in:` rule there. `readOnly` is also what keeps the DAO from storing
  `creditRoles` in `author_settings`, so this would change the storage,
  not only the validation.

**What goes with it**:

- A unit test of `Repository::validate()` with a degree "lead" and a
  type "person", each expecting one error.
- One transaction around `author\DAO::insert()` and `update()`, so that
  any later database refusal leaves the contributor as it was. It is
  not needed for this fault once the rule is in, and it also covers the
  partial saves of
  [U41-A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A14-one-role-journal-contributor-save-fails.md).
- The API reference: `creditRoles[].degree` and `contributorType` list
  their allowed values.
- No data repair and no backport: no stored row holds a bad value, and
  no release has CRediT roles.

Small: one method and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contributor-unknown-credit-degree-server-error/walk.js)
  with `lib.js` and `seam.php` beside it, run on an install freshly
  loaded from PKP's default test dataset (pkp/datasets 7912e09,
  2026-10-14):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js <app|all> shared/playwright/checks/issues/contributor-unknown-credit-degree-server-error/walk.js [http|steps|neighbour]`.
  `http` takes the Steps on OJS (it sets `api_key_secret` in the
  install's config, creates `dbarnes`'s key on the Profile page, and
  sends the requests with curl), then the corrected resend and the
  request without `contributorType`. `steps` is the code check on the
  three apps: the screens for step 2, then `seam.php`, which runs the
  handler's `Repo::author()->validate()` and, when it passes,
  `Repo::author()->edit()` from the command line, with step 4's values
  and with "person" as the type. `neighbour` is the check of what the
  fix must leave alone. The stored state is read from the database
  after each step.
- Step 4's body differs from the record the GET returns in two ways,
  both needed for any edit sent back that way: the GET lists
  `contributorRoles` as objects, which the PUT answers 500 ("Nested
  arrays may not be passed to whereIn method."), and it holds
  `"orcidVerificationRequested": null`, which the PUT refuses with
  "This field must be true or false.". Neither is part of this fault.
- Branch tips checked, on PostgreSQL: main OJS 378eced941, OMP
  f4836d4fba, OPS 2ece50497f (pkp-lib b17fadae59, ui-library 47b565cb
  in all three). MySQL not checked: there `credit_degree` and
  `contributor_type` are native `ENUM` columns, and whether a non-strict
  server stores an empty value instead of refusing is unverified.
- OMP and OPS: the HTTP steps were not sent there. The code check gave
  the same partial writes as on OJS (OMP submission 1, Arthur Clark;
  OPS submission 1, Carlo Corino), and both apps use pkp-lib's handler
  and DAO with no override.
- 3.5 walked (OJS ca763c91cd, OMP a70bbb9c4d, OPS 44aec6e131, pkp-lib
  4045d9241e; the same dataset commit): the contributor "Edit" form has
  no CRediT field in the three apps. The code agrees: no
  `credit_contributor_roles` table, no `creditRoles` in
  `schemas/author.json`, no `contributor_type` column.
- 3.4 (OJS daf0ca971d, OMP 0aec65441f, OPS acd8ae704b; pkp-lib
  55c8e406b3) and 3.3 (OJS d7d9dd14ec, OMP 8e72fc8836, OPS c5532e2161;
  pkp-lib 5e84acd11b), code: `schemas/author.json` has neither
  `creditRoles` nor `contributorType`, and pkp-lib has no CRediT files.
- Introduced: blame on `creditRoles` in `schemas/author.json` (the
  `readOnly` without rules) and on the degree write in
  `addCreditRoles()` leads to 036af20d17 (the first commit of both;
  52d3a0f8e7 later rewrote the write's lines, keeping `$rd['degree'] ??
  null`). The GitHub API names `pkp/pkp-lib#11639` as its merged PR
  (2025-07-16). `contributorType` and its enum column came later, with
  52d3a0f8e7 (`pkp/pkp-lib#11765`).
- Code read for Impact: the published-version case rests on
  `PublicationCanBeEditedPolicy` and `canEditPublication()`, which let
  a manager or an editor with access to unassigned submissions edit a
  published version, and on the article page (`article_details.tpl`)
  and the JATS (`ArticleFront`) printing the stored CRediT roles; it
  was not walked. The API reference is generated from
  `schemas/author.json`, whose `degree` is a plain string.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the
  script's `steps` with the fix and `neighbour` with the fix in and out,
  and `http` on OJS with the fix; then reverted.
- Not driven: the add request (read in the code only), and any client
  sending these values today.
