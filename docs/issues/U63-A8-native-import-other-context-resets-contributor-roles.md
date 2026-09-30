# Importing a Native XML export into another journal, press or server makes every contributor an "Author"

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11765` for `pkp/pkp-lib#857` · [52d3a0f8e7](https://github.com/pkp/pkp-lib/commit/52d3a0f8e70659ff8a1507068866a6abdeb8ec90) · 2025-11-20 · jyhein (jyhein)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a8) (the contributor-role line)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

An administrator exports a submission from one journal, press or server
with Tools › "Native XML Plugin" and imports the file into another. The
import succeeds, but every contributor in the new context is an
"Author". A book's "Volume editor" and "Chapter Author" contributors
lose their role, and so does any other role but "Author".

The results tab adds "Errors occured:" with "The author '{name}' does
not have any contributor role. Defaults to AUTHOR." for every
contributor, including contributors who were authors all along. The
roles can be put back only by editing each contributor.

Only `main` has this: released versions carried the role by name and
kept it. The fix writes each role's identifier and name to the file
instead of its database number.

## Impact

- **Lost:** every contributor role other than "Author": "Volume
  editor", "Chapter Author", "Translator" and any role the context
  added.
- **Who:** an administrator or manager who moves content between
  journals, presses or servers with the Native XML Plugin, on screen or
  with the command-line import. No released version is affected; it
  starts with the release after 3.5.
- **Way round:** after the import, open each submission's
  "Contributors", press "Edit" on each contributor and tick the role
  again. Nothing restores the roles in bulk.

Between two installs the same lookup can go wrong without any line. The
importing context looks each number up among its own roles. When the
number belongs to a different role there, the contributor gets that
role and the results tab says nothing. Whether two installs' numbers
line up that way depends on the order their roles were created; this
was read in the code, not reproduced.

Medium: roles are lost for every moved contributor and come back only
by hand, but the manager is told for each one. The silent wrong role
between installs would make it high if it were shown to happen in
ordinary moves; it is not established here.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- A second press, created by `admin` on screen (the dataset has one
  press): Administration › "Hosted Presses" › "Create Press", with
  "Press Name" "u63a8 Second", "Press Initials" "U63A8", "Principal
  Contact Name" "u63a8 Contact", "Principal Contact Email"
  "u63a8@mailinator.com", "Country" "Canada", "Path" `u63a8`,
  "Languages" English and "Primary locale" English, then "Save".

1. Sign in as `admin`.
2. In `publicknowledge`, open "Tools"
   (`/index.php/publicknowledge/en/management/tools`) and choose "Native
   XML Plugin".
3. Choose the "Export" tab. Tick submission 2, "The West and Beyond: New
   Perspectives on an Imagined Region" (an edited volume: Sarah Carter
   and Peter Fortna are "Volume editor", Alvin Finkel "Author", the five
   others "Chapter Author"), and press "Export Submissions".
4. In the "Export Submissions Results" tab, press "Download Exported
   File" and keep the file.
5. Open `u63a8`'s "Tools" (`/index.php/u63a8/en/management/tools`) and
   choose "Native XML Plugin".
6. Choose the "Import" tab, press "Upload File", choose the downloaded
   file and press "Import". The "Results" tab opens and gives the new
   submission's number (19 on a freshly loaded dataset).
7. Open that submission in `u63a8`
   (`/index.php/u63a8/en/dashboard/editorial?workflowSubmissionId=19`)
   and choose "Contributors" under "Publication".

**Expected:** step 6 reads only the success text and the imported item.
In step 7 each contributor keeps the role they had in
`publicknowledge`.

**Observed:** step 6 reads:

```
The import completed successfully. The following items were imported:
Submission
"19" - "The West and Beyond: New Perspectives on an Imagined Region"
Errors occured:

Author

The author 'Alvin' does not have any contributor role. Defaults to AUTHOR.
The author 'Sarah' does not have any contributor role. Defaults to AUTHOR.
The author 'Peter' does not have any contributor role. Defaults to AUTHOR.
The author 'Gerald' does not have any contributor role. Defaults to AUTHOR.
The author 'Lyle' does not have any contributor role. Defaults to AUTHOR.
The author 'Winona' does not have any contributor role. Defaults to AUTHOR.
The author 'Matt' does not have any contributor role. Defaults to AUTHOR.
The author 'James' does not have any contributor role. Defaults to AUTHOR.
```

In step 7 all eight contributors read "Author".

On a journal ("Hosted Journals" › "Create Journal"; submission 8,
"Traditions and Trends in the Study of the Commons"; tab and button
"Export Articles") and on a preprint server ("Hosted Servers" › "Create
Server"; submission 1, "The influence of lactation on the quantity and
quality of cashmere production"; tab and button "Export Preprints") the
same steps show the lines for every contributor. No role is lost there,
because every contributor in the OJS and OPS datasets is an "Author";
a contributor given "Translator" first would lose it the same way (not
walked). The journal's tab also lists "The issue identification element
is missing …" for submission 8, a separate finding:
[U63-A8-native-import-article-without-issue-lists-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A8-native-import-article-without-issue-lists-error.md).

Control: importing the same file back into `publicknowledge` lists no
such line and keeps every role.

## Cause

The export writes each role as its database id.
`PKPAuthorNativeXmlFilter::createPKPAuthorNode()`
(`lib/pkp/plugins/importexport/native/filter/PKPAuthorNativeXmlFilter.php`,
lines 138–143) writes one `<contributor_role_id>` per role from
`Author::getContributorRoleIds()`, and `pkp-native.xsd` (line 221)
declares that element an `int`.

Contributor roles are rows per context (`contributor_roles.context_id`),
and each new journal, press or server gets its own, with new ids. In
the OMP dataset `publicknowledge`'s roles are 1–4, and a press created
next gets 5–8. `NativeXmlPKPAuthorFilter::handleElement()` (lines
202–214) looks the ids up in the importing context only
(`ContributorRole::withContextId($context->getId())->withRoleIds($ids)`),
so from another context on the same install nothing matches. The author
then has no role, and lines 268–285 record `noContributorRole` with
`addError()` and give the context's first `AUTHOR` role.

Until 3.5 a contributor's role was a user group, exported as
`user_group_ref`, the group's name in the primary locale, and matched
by name in the importing context (3.5 `NativeXmlPKPAuthorFilter`, lines
194–204). 52d3a0f8e7 replaced user groups by contributor roles and
changed the file to ids.

Reach:

- The command-line import (`tools/importExport.php
  NativeImportExportPlugin import …`) runs the same filters and prints
  the same lines under "Errors occured:"
  (`PKPNativeImportExportCLIToolKit::getCLIProblems()`; read in the
  code).
- OMP: `Author::getIsEditor()` reads the `EDITOR` role. The catalog book
  page (`CatalogBookHandler`, lines 271–277) and
  `Publication::getEditorString()` take an edited volume's editors from
  it, so a volume moved this way names no editors once published. ORCID
  works map `EDITOR` too (`PKPOrcidWork`, line 304). Both read in the
  code.
- CRediT roles (`credit_contributor_roles.credit_role_id`) are not
  written to the file at all, so they are lost on any import, even into
  the same context (read in the code). That is a separate gap, left out
  of this fix.
- A file exported from 3.5 does not reach this code: `main` refuses it
  at validation ("The process failed", with `user_group_ref` "not
  allowed" and `contributor_type` "required but missing" among the
  lines), and nothing is imported. That is a separate problem.

## Proposed fix

Proposed: write each role by its identifier and its names, and match it
in the importing context by identifier, then by name where several
roles share an identifier (OMP's "Author" and "Chapter Author" are both
`AUTHOR`). `ContributorRoleIdentifier` is the same in every context,
and the name match is how `user_group_ref` was matched.

Export (`PKPAuthorNativeXmlFilter::createPKPAuthorNode()`):

```php
foreach ($author->getContributorRoles() as $contributorRole) {
    $contributorRoleNode = $doc->createElementNS($deployment->getNamespace(), 'contributor_role');
    $contributorRoleNode->setAttribute('identifier', $contributorRole->contributor_role_identifier);
    $this->createLocalizedNodes($doc, $contributorRoleNode, 'name', $contributorRole->name);
    $contributorRolesNode->appendChild($contributorRoleNode);
}
```

Import (`NativeXmlPKPAuthorFilter`, a new `findContributorRole()` called
for each `<contributor_role>`):

```php
$candidates = ContributorRole::withContextId($contextId)
    ->withIdentifier($node->getAttribute('identifier'))
    ->orderBy('contributor_role_id')
    ->get();
// $names: the element's <name> texts, in any locale
return $candidates->first(fn (ContributorRole $role) => count(array_intersect($names, (array) $role->name)) > 0)
    ?? $candidates->first();
```

The order when no name matches: the context's oldest role with that
identifier, so a renamed "Chapter Author" lands on "Author" in a press
whose roles were created in the default order. The existing fallback to
`AUTHOR` (lines 277–284) gets the same `orderBy`, since it has none now.

`pkp-native.xsd` replaces `contributor_role_id` by a `contributor_role`
element with a required `identifier` attribute and optional localized
`name` children. The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/fix.diff).

It was tried on `main` in OJS, OMP and OPS with the Steps, and the
Expected held: no role line, and in step 7 every contributor kept their
role. The same file imported back into `publicknowledge` kept every
role, with the fix and without it.

**Alternatives**

- Keep the id and add the identifier beside it: the id still means
  nothing outside its context, and the importer would need rules for
  when to trust it.
- Match by name only, as `user_group_ref` did: fails when the other
  context renamed a role or works in another language.
- Create a missing role in the importing context: that is the context
  manager's choice, not the import's.

**What goes with it**

- pkp/datasets carries `<contributor_role_id>` in each
  `native-export-sample.xml` for `main`, in all three apps (7 elements
  in OJS's, 1 in OMP's and OPS's), and each app's
  `plugins/importexport/native/README.md` points to those files. They
  would fail validation once the schema changes. Recommended:
  regenerate them. The repository says its files come from the apps'
  integration test run, so the first dataset update after the fix
  writes the new element. The alternative, the importer reading
  `<contributor_role_id>` for a transition, keeps the broken lookup for
  files that no released version ever wrote.
- A role with no match in the importing context still falls back to
  "Author" with the line, as now.
- Copies already imported cannot be repaired from the database; they
  need their roles set again, or a new import once the fix is in.
- The guard is an e2e test: export a submission with a non-author role,
  import it into a second context, and assert the role on its
  "Contributors" page.

Medium: three files in pkp-lib, including the Native XML schema that
other tools producing import files follow, and the dataset samples.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js).
  It takes the Steps on OJS, OMP and OPS, creating the second context
  through "Create Journal", "Create Press" or "Create Server", and reads
  each contributor's role from the database in both contexts and from
  the "Contributors" page. `SAME_CONTEXT=1` imports into
  `publicknowledge` instead (the control); with `FILE=…` it imports a
  given file, which is how the 3.5 exports were imported on `main`.
  Command:
  `node bin/probe.js all shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js`.
- Fix trial:
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/trial.sh)
  applies fix.diff with `node bin/try-fix.js apply … ojs omp ops`,
  walks, and reverts with `node bin/try-fix.js revert ojs omp ops`.
- The walks:
  - `main` and 3.5, OJS, OMP and OPS. On 3.5 the file carried
    `user_group_ref` "Author", "Volume editor" and "Chapter Author", and
    the imported volume's "Contributors" page kept all three roles.
  - The 3.5 exports of the same three submissions, imported on `main`.
  - On PostgreSQL, on PKP's default datasets from pkp/datasets 38ab955
    (2026-09-30).
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6, with identical author filters and
    `pkp-native.xsd`).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (pkp-lib
    a9c76aed62).
  - stable-3_4_0: pkp-lib df13621c2d; stable-3_3_0: pkp-lib d446601ebe.
- Introduced: `git log -S` on `noContributorRole` and on
  `contributor_role_id` in `plugins/importexport/native` gives
  52d3a0f8e7 alone (authored 2025-11-11, committed 2025-11-20), in
  `pkp/pkp-lib#11765` ("Contributor Roles and Type", branch `f857`).
- Upstream search (2026-09-30), pkp organisation, issues and PRs: the
  closest, `pkp/pkp-lib#13102` (the order roles are returned in) and
  `pkp/pkp-lib#7190` (Native XML CLI import problems in 3.3), are
  different faults.
- Not driven: a move between two installs (so the silent wrong role is
  unverified), a translator on a journal, a published edited volume's
  catalog page, and the command-line import.
