# A refused "Add Contributor" still saves the contributor, so correcting it lists the person twice

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the affiliation is a text field checked with the contributor)
  - 3.3: none (code; the affiliation is a text field checked with the contributor)
- **Introduced** `pkp/pkp-lib#10880` for `pkp/pkp-lib#7135` · [c680b5a27d](https://github.com/pkp/pkp-lib/commit/c680b5a27d86fd9e9f7d6a9603d1ae6a52eb088e) · 2025-02-03 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U41 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a24)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Add Contributor" is refused when an institution entered by hand has
no name in the submission's language. The panel stays open with
"Please provide affiliation name in the submission primary locale."
under the field. Yet the server has already saved the new contributor,
without the institution, and the list behind the panel does not show
that contributor.

Typing the name back and pressing "Save" adds the contributor a second
time: the list then shows the same person on two rows, and only the
second row's "Edit" lists the institution. Pressing "Close" instead
does not undo the first save: after a reload, the contributor appears
in the list without the institution.

The refusal needs a deliberate edit. A typed institution always fills
the submission's language first, whatever the interface language, and
"Add" stays disabled until it does. The name in that language must
then be cleared under "Edit institution name", for example to keep
only a translation.

## Impact

- **Lost**: no typed text is lost. A contributor the user thinks was
  not added is stored without the institution, and the corrected save
  stores the person a second time.
- **Who**: editors and managers adding a contributor in the workflow,
  and authors on the submission wizard's "Contributors" step.
- **Way round**: "Delete" on the extra row, once someone notices it.
  After submitting, only an editor or manager can delete it, because
  the default Author role cannot edit metadata. A duplicate nobody
  removes is published: the article page's author list names the
  person twice.

Medium: the refusal follows only a deliberate edit of the institution's
name, and the extra row can be deleted on screen. But the refusal hides
a save, so the duplicate is easy to miss until it is published. It
would be high if ordinary typing led to the refusal.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` or `stable-3_5_0`
  (`publicknowledge`, with English as the submissions' language).
- The browser can reach `api.ror.org`: the institution search box
  queries the registry as you type.
- The submission: OJS submission 7, "Developing efficacy beliefs in the
  classroom"; OMP submission 1, "The ABCs of Human Survival: A Paradigm
  for Global Citizenship"; OPS submission 1, "The influence of lactation
  on the quantity and quality of cashmere production". Each lists one
  contributor.

Correcting and saving:

1. Sign in as `dbarnes`.
2. Open the submission's workflow.
3. In the side menu, open "Publication" › "Contributors" ("Preprint" ›
   "Contributors" on OPS).
4. Press "Add Contributor".
5. Fill in Given Name `Lea`, Family Name `u41h13h`, Email
   `lea.u41h13h@mailinator.com` and Country "Canada", and tick "Author"
   [3.5: choose "Author" as the contributor's role].
6. Under "Affiliations", type `u41h13h Institute` into the search box,
   choose the typed text itself (the suggestion without the ROR mark),
   and press "Add".
7. On the institution's row, press "⋯" ("Click to edit or delete"),
   then "Edit institution name", and clear the box "Type the
   institution name in English".
8. Press "Save".
9. The panel is still open, with the box from step 7 still shown and
   empty. Type `u41h13h Institute` into that box, "Type the institution
   name in English", and press "Save".
10. Reload the page, and press "Edit" on each "Lea u41h13h" row.

Leaving by "Close":

11. Press "Add Contributor" and fill in Given Name `Max`, Family Name
    `u41h13h`, Email `max.u41h13h@mailinator.com`, Country "Canada" and
    "Author"; then take steps 6 to 8.
12. Press "Close" at the top of the panel, then reload the page.

**Expected**: steps 8 and 11 are refused and store nothing. Step 9
closes the panel and lists "Lea u41h13h" once, with the institution in
the row's "Edit". After step 12 there is no "Max u41h13h".

**Observed**: step 8 is refused. The panel stays open, the field reads
"Please provide affiliation name in the submission primary locale.",
the foot reads "Please correct one error.", and the page notice reads
"The form was not saved because 1 error(s) were encountered. Please
correct these errors and try again." The request answers:

```
POST /index.php/publicknowledge/api/v1/submissions/7/publications/8/contributors
400 {"affiliations":[{"name":{"en":["Please provide affiliation name in the submission primary locale."]}}]}
```

Step 9 answers 200 and closes the panel. The list shows "Lea u41h13h"
on two rows, each with "Author", "Set Primary Contact", "Edit" and
"Delete", and the same after the reload. The first row's "Edit" lists
no institution; the second's lists "u41h13h Institute". After "Close"
in step 12 the list shows no "Max u41h13h"; after the reload it does,
and his "Edit" lists no institution.

## Cause

`PKPSubmissionController::addContributor()` (lib/pkp
`api/v1/submissions/PKPSubmissionController.php`, line 1752) inserts
the contributor before it validates the contributor's affiliations:

```php
$author = Repo::author()->newDataObject($params);
$newId = Repo::author()->add($author);

$affiliations = $newAffiliationErrors = [];
foreach ($affiliationParams as $position => $affiliationParam) {
    $affiliationParam['authorId'] = $newId;
    $affiliationErrors = Repo::affiliation()->validate(null, $affiliationParam, $submission, $submissionContext);
    ...
}

if (!empty($newAffiliationErrors)) {
    return response()->json($newAffiliationErrors, Response::HTTP_BAD_REQUEST);
}
```

An affiliation is refused after `author\DAO::insert()` has written the
`authors` row, its `author_settings`, its contributor roles and its
CRediT roles. Nothing removes them, and no transaction wraps the
writes. So the 400 leaves a contributor without affiliations. The form
does not know the contributor was saved, so the next "Save" posts the
same contributor again.

The affiliation schema has required `authorId` since the feature's
first commit
([d7c67a46fe](https://github.com/pkp/pkp-lib/commit/d7c67a46fee724dfc003eb4b650021b5edb8e915)),
which validated the affiliations before the insert. That worked only
because `validate()` did not yet enforce required properties.
c680b5a27d made `validate()` enforce them for a new affiliation
(`ValidatorFactory::required()`) and check that the author exists. A
new affiliation then needed a real `authorId`, so the same change moved
the insert ahead of the validation.

Reach:

- The workflow's "Add Contributor" for editors and managers (walked on
  all three apps), and the submission wizard's "Contributors" step for
  authors, which posts to the same endpoint (walked on OJS).
- Any refusal from `Repo::affiliation()->validate()` or its
  `Affiliation::validate` hook does the same: a name missing in the
  submission's language, or a name in a language the submission does
  not take (code).
- `editContributor()` validates the affiliations before it writes
  anything, so a refused "Edit" stores nothing (walked).
- A REST API client that posts a contributor with a refused affiliation
  leaves the same row (code).

## Proposed fix

Run the contributor's insert and its affiliations in one database
transaction, and roll it back when an affiliation is refused. This is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-add-contributor-saved-twice/fix.diff)
in outline (it also adds `use Illuminate\Support\Facades\DB;`, which
the controller does not import yet):

```diff
         $author = Repo::author()->newDataObject($params);
-        $newId = Repo::author()->add($author);
+        DB::beginTransaction();
+        try {
+            $newId = Repo::author()->add($author);
             ...the affiliation loop, unchanged...
-        if (!empty($newAffiliationErrors)) {
-            return response()->json($newAffiliationErrors, Response::HTTP_BAD_REQUEST);
-        }
+            if (!empty($newAffiliationErrors)) {
+                DB::rollBack();
+                return response()->json($newAffiliationErrors, Response::HTTP_BAD_REQUEST);
+            }
             ...the affiliations' add, unchanged...
+            DB::commit();
+        } catch (\Throwable $e) {
+            DB::rollBack();
+            throw $e;
+        }
```

This keeps what c680b5a27d needed: each affiliation is still validated
against the real author id, with the existing rules and hook. A refused
request then stores nothing. The controllers already wrap multi-row
writes this way: `MediaFilesController` validates each file inside
`DB::transaction()` and turns a refusal into a 400.

The fix was tried on the three apps. The steps then stored and listed
one "Lea u41h13h", with the institution, and no "Max u41h13h". A valid
add with a hand-entered institution still saved once with it, with the
fix in and out.

**Alternatives**:

- Validate the affiliations before the insert, as d7c67a46fe did.
  `validate()` would then need a mode for an author not yet created,
  skipping the required `authorId` and the author-exists check. That
  changes `Repo::affiliation()->validate()` for every caller.
- Delete the new author when an affiliation is refused. This also runs
  the delete hooks for a contributor that should never have existed.

**What goes with it**:

- A test that posts a contributor with an affiliation lacking the
  primary-language name and checks that the publication's contributor
  count is unchanged.
- The `Author::add::before` and `Author::add` hooks still fire before
  a rollback. No core code in the three apps listens to either; a
  plugin that does would see an author that is then rolled back.
- No data repair: duplicates already stored are ordinary contributors
  and can be deleted on screen.
- Backport: on `stable-3_5_0` the logic is the same, but the `use`
  block and the lines around the insert differ, so `fix.diff` does not
  apply there.
  [fix-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-add-contributor-saved-twice/fix-3_5.diff)
  is the same change rebased for 3.5.

Small: about twenty lines in one method, following a transaction
pattern the controllers already use, with no change to the API's
answers and no stored data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-add-contributor-saved-twice/walk.js),
  run on an install freshly loaded with the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/refused-add-contributor-saved-twice/walk.js [steps|nb|wizard|language]`.
  It reads the stored contributors from the database after each step.
  `nb` is the control walk for the fix (a valid add with a
  hand-entered institution, and the existing contributor's refused
  "Edit"). `wizard` takes steps 5 to 8 and 12 on the wizard's
  "Contributors" step as the OJS author `dsokoloff`. `language` has
  `dsokoloff` start a submission in French with the interface in
  English, then add a contributor with a typed institution.
- Walked 2026-10-13 on `main` and `stable-3_5_0`, OJS, OMP and OPS, as
  `dbarnes`, on PostgreSQL, with pkp/datasets 384e28b (2026-10-12). All
  six walks gave the Observed. No response of 500 or more and no page
  error. MySQL was not walked; the code takes no engine-specific path.
- `language` (OJS `main`): the typed name filled "Type the institution
  name in French (Canada)", the submission's language, and "Save"
  answered 200. "Add" is disabled while the name in the submission's
  language is empty (lib/ui-library `FieldAffiliations.vue`); the
  workflow and the wizard both set that language as the field's primary
  language (`useForm.js` `setLocalesForSubmission()`,
  `ContributorsListPanel.php`).
- Fix trial: `fix.diff` was applied to the three `main` apps for the
  `steps` and `nb` walks, and `nb` was walked again after the revert.
  `fix-3_5.diff` passes `git apply --check` against the 3.5 lib/pkp of
  all three apps, and was not walked.
- Code read (branch heads): `main` OJS 7c6fba2064, OMP eb9381314, OPS
  1bc3f78888 (lib/pkp f4c2578c94, lib/ui-library c9889f00, the same in
  the three apps); `stable-3_5_0` OJS 5fc74d6213 (lib/pkp f4f8fcdbc0),
  OMP 486cbf9eb and OPS 399c4ebca3 (lib/pkp 8094f06bf5).
  `addContributor()` inserts before it validates the affiliations in
  both 3.5 lib/pkp commits.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 55c8e406b3 and
  `stable-3_3_0` 5e84acd11b. On 3.4, `affiliation` is a multilingual
  string in `schemas/author.json`, checked by
  `Repo::author()->validate()` before `PKPSubmissionHandler::addContributor()`
  inserts. 3.3 adds contributors through the legacy author form, with
  the same text field.
- Who can delete later (code and dataset): `canEditPublication()` lets
  an author edit only with "Permit metadata edit" on the assignment;
  the dataset's Author role has it off. The article page lists every
  contributor of the publication (OJS `article_details.tpl`).
- Introduced: `git blame` on line 1752 gives c680b5a27d (2025-02-03),
  "pkp/pkp-lib#7135 Multiple author affiliations (Ror) - changes and
  fixes", in PR `pkp/pkp-lib#10880` (Bozana Bokan, merged 2025-02-06,
  continuing `pkp/pkp-lib#10460`).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for "duplicate contributor", "contributor added twice",
  "contributor saved without affiliation", "created despite validation
  error", "affiliation name primary locale", and for `addContributor`
  with `affiliation`. `pkp/pkp-lib#10900` and `#10903` (the feature's
  QA issues), `#10906` (duplicate ROR affiliations) and `#10928` (an
  error adding a ROR affiliation) are other problems.
- Not walked: step 6 without network access to the registry.
