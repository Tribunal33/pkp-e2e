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
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a8) (the contributor-role line)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An administrator exports a submission from one journal, press or server
with Tools › "Native XML Plugin" and imports the file into another. The
contributors are all imported, but each one loses their role and
becomes an "Author". A book's "Volume editor" and "Chapter Author"
contributors, a "Translator", and anyone with a role the context added
are all turned into "Author".

The results tab adds "Errors occured:" with "The author '{name}' does
not have any contributor role. Defaults to AUTHOR." for every
contributor, including those who were authors all along. Nothing
restores the roles in bulk.

It happens on every import into a context other than the one the file
came from, on the same install; importing back into the same context
keeps the roles.

## Impact

- **Lost:** the roles. On a press, a moved edited volume no longer names
  its editors, and its chapter authors become plain authors. A journal
  or preprint server starts with only "Author" and "Translator", so there
  only translators and roles the context added are lost.
- **Who:** an administrator or manager who moves content between
  journals, presses or servers on one install with the Native XML
  Plugin, on screen or from the command line.
- **Way round:** after the import, open each submission's
  "Contributors", press "Edit" on each contributor and tick the role
  again.

Medium: the manager is told, one line per contributor, and can restore
each role by hand, but on a press every edited volume moved this way
loses its editors until someone does.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
- A second press, created by `admin` on screen (the dataset has one
  press): Administration › "Hosted Presses" › "Create Press", with "Press
  Name" "u63ir11 Second", "Press Initials" "U63IR11", "Principal Contact
  Name" "u63ir11 Second", "Principal Contact Email"
  "u63ir11@mailinator.com", "Country" "Canada", "Path" `u63ir11`,
  "Languages" English and "Primary locale" English, then "Save".

1. Sign in as `admin`.
2. In `publicknowledge`, open Tools › "Native XML Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`).
3. Choose the "Export" tab. Tick submission 2, "The West and Beyond: New
   Perspectives on an Imagined Region" (an edited volume: Sarah Carter
   and Peter Fortna are "Volume editor", Alvin Finkel "Author", the five
   others "Chapter Author"), and press "Export Submissions".
4. In the "Export Submissions Results" tab, press "Download Exported
   File" and keep the file.
5. Open `u63ir11`'s Native XML Plugin
   (`/index.php/u63ir11/en/management/importexport/plugin/NativeImportExportPlugin`).
6. Choose the "Import" tab, press "Upload File", choose the downloaded
   file and press "Import". The "Results" tab opens with the new
   submission's number (19 on a freshly loaded dataset).
7. Open that submission in `u63ir11`
   (`/index.php/u63ir11/en/dashboard/editorial?workflowSubmissionId=19`)
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
same steps give the line for every contributor. No role is lost there,
because every contributor in the OJS and OPS datasets is an "Author"; a
"Translator" would lose it the same way (read in the code). The journal's tab also
lists "The issue identification element is missing …" for submission 8,
a separate finding:
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
and each new journal, press or server gets its own, with new ids. In the
OMP dataset `publicknowledge`'s roles are 1–4, and the press created in
the Steps gets 5–8. `NativeXmlPKPAuthorFilter::handleElement()` (lines
202–214) looks the ids up in the importing context only
(`ContributorRole::withContextId($context->getId())->withRoleIds($ids)`),
so from another context nothing matches. The author then has no role,
and lines 268–285 record `noContributorRole` with `addError()` and give
it one of the context's `AUTHOR` roles (`limit(1)` with no ordering, so
on a press either "Author" or "Chapter Author").

Until 3.5 a contributor's role was a user group, exported as the
`user_group_ref` attribute (the group's name in the primary locale) and
matched by name in the importing context (3.5
`NativeXmlPKPAuthorFilter`, lines 196–200). 52d3a0f8e7 replaced user groups by
contributor roles and changed the file to ids.

Reach:

- Between two installs the lookup uses the importing context's own ids.
  An id that is a different role there gives the contributor that role,
  with no line; an id that is the same role there works. Which happens
  depends on the order each install created its roles (read in the
  code, not walked).
- The command-line import (`tools/importExport.php
  NativeImportExportPlugin import …`) runs the same filters and prints
  the same lines (`PKPNativeImportExportCLIToolKit::getCLIProblems()`;
  code).
- OMP: `Author::getIsEditor()` reads the `EDITOR` role. The catalog book
  page (`CatalogBookHandler`, line 274), `Publication`'s editor string
  and the ONIX export (`MonographONIX30XmlFilter`, line 385) take an
  edited volume's editors from it, so a volume moved this way names no
  editors once published (read in the code).
- CRediT roles are not written to the file at all, so they are lost on
  any import, even into the same context (read in the code). That is a separate gap,
  left out of this fix.
- A file exported from 3.5 does not reach this code: `main` refuses it
  at validation (`user_group_ref` "not allowed"), a separate question
  about the upgrade path.

## Proposed fix

Proposed: write each role by its identifier and its names, and match it
in the importing context by identifier, then by name where several roles
share an identifier (OMP's "Author" and "Chapter Author" are both
`AUTHOR`). `ContributorRoleIdentifier` is the same in every context.
Matching by a name the file carries is how `user_group_ref` was matched
before, and how sections (`section_ref`) and genres are still matched.

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

With no name match, the context's role with that identifier and the
lowest id is taken. So if the source press renamed "Chapter Author", the
contributor lands on "Author", which a new press creates before
"Chapter Author". The existing fallback to
`AUTHOR` (lines 277–284) gets the same `orderBy`, since it has none now.
`pkp-native.xsd` replaces `contributor_role_id` by a `contributor_role`
element with a required `identifier` attribute and optional localized
`name` children. The full diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/fix.diff).

It was tried on `main` in OJS, OMP and OPS with the Steps, and the
Expected held: no role line, and in step 7 the two "Volume editor" and
five "Chapter Author" contributors kept their roles. The same file
imported back into `publicknowledge` kept every role, with the fix in
and with it out.

**Alternatives**

- Keep the id and add the identifier beside it: the id still means
  nothing outside its context, and the importer would need rules for
  when to trust it.
- Match by name only, as `user_group_ref` did: fails when the other
  context renamed a role or works in another language.
- Create a missing role in the importing context: that is the context
  manager's choice, not the import's.

**What goes with it**

- No released version wrote `<contributor_role_id>`, so changing the
  format before 3.6 ships breaks no file in the field. pkp/datasets
  carries it in each `main` `native-export-sample.xml` (7 elements in
  OJS's, 1 in OMP's and OPS's), and each app's
  `plugins/importexport/native/README.md` points to those files: they
  need regenerating, which the next dataset build after the fix does.
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

- Kept script that runs the Steps in the browser on OJS, OMP and OPS, on
  an install loaded from PKP's default test dataset, creating the second
  context through "Create Journal", "Create Press" or "Create Server":
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js)
  (helpers in its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/lib.js)
  and the Native XML page helpers in
  [unknown-section-import-broken-submission/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/walk.js`.
  With `SAME_CONTEXT=1` it imports into `publicknowledge` instead (the
  control and the neighbour check).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/fix.diff ojs omp ops`,
  walk.js with and without `SAME_CONTEXT=1`, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/native-import-other-context-resets-contributor-roles/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed.
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6 for both; the two author filters and
    `pkp-native.xsd` are identical in both lib/pkp commits).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62). The file carried `user_group_ref` "Author", "Volume
    editor" and "Chapter Author", and the imported volume's
    "Contributors" page kept all three roles; no line on OMP and OPS
    (OJS listed only the issue-identification line).
- 3.4 and 3.3, by code: pkp-lib `origin/stable-3_4_0` at df13621c2d
  (`NativeXmlPKPAuthorFilter.php`, line 149) and `origin/stable-3_3_0`
  at d446601ebe (`NativeXmlPKPAuthorFilter.inc.php`, line 80) match the
  author's user group by `user_group_ref`, as 3.5 does.
- Introduced: `git blame` on lines 202–213 of `NativeXmlPKPAuthorFilter`
  and 139–142 of `PKPAuthorNativeXmlFilter` gives 52d3a0f8e7 (authored
  2025-11-11, merged 2025-11-20 in `pkp/pkp-lib#11765`), with lines
  209–212 reformatted by c158d7fdd3 (`pkp/pkp-lib#11996`).
- Upstream search (2026-10-01), pkp/pkp-lib, pkp/omp and pkp/ops, issues
  and PRs: "native import contributor role", the line's words,
  `noContributorRole`, `contributor_role_id`; the closest,
  `pkp/pkp-lib#13102` (the order roles are returned in), is a different
  fault.
- Not driven: a move between two installs, so a silent wrong role there
  is unverified (by the code, two installs loaded from the same default
  dataset have the same role ids and would keep the roles); a translator
  on a journal; a published edited volume's catalog page; and the
  command-line import. The roles each dataset starts with were read
  from the dumps' `contributor_roles`: OJS and OPS Author and
  Translator, OMP also Chapter Author and Volume editor.
