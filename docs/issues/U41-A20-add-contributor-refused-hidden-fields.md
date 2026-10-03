# "Add Contributor" never saves when a "Forms" language is not a metadata language

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no "Contributor Type")
  - 3.4: none (code; no contributor types)
  - 3.3: none (code; no contributor types)
- **Introduced** `pkp/pkp-lib#11765` for `pkp/pkp-lib#11378` · [52d3a0f8e7](https://github.com/pkp/pkp-lib/commit/52d3a0f8e70659ff8a1507068866a6abdeb8ec90) · 2025-11-11 · jyhein (jyhein)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a20)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A journal can tick a language under "Forms" in Settings › Website ›
"Setup" › "Languages" without ticking it under "Metadata" in the
"Submission Languages" table. On such a journal, "Add Contributor" ›
"Save" in a submission's workflow is refused for every contributor
type, on every submission that holds no text in that language. The
panel stays open. Its foot lists fields the chosen type does not show,
each as "Go to {Field}: This language is not accepted." (for a person,
"Organization Name"), so nothing on the form can be corrected and
"Save" stays disabled.

The way round is hidden: choose another contributor type, type into
the field the error names, switch back and save. Editing an existing
contributor and adding one in the submission wizard still save.

## Impact

- **Lost**: the contributor is not added, and the time spent typing the
  form. The message names fields that are not on the form.
- **Who**: anyone who adds a contributor from the workflow: managers,
  editors, section editors, and an author who may edit their own
  publication. It needs a journal that offers a language for its forms
  and not for submission metadata, for example French for the journal's
  pages and texts with English-only submissions. There, no submission
  can hold French metadata, so every add is refused.
- **Way round**: on the add form, choose another Contributor Type, type
  into each field the error names (for a person, an Organization Name),
  choose the right type again and save; the other type's text is not
  kept. Nothing on screen suggests it. A manager can instead tick the
  language under "Metadata" in the "Submission Languages" table, which
  also offers it to authors.

Medium: a core editing task fails with a message that cannot be acted
on, in a language setup that is not the default, and only a trick nobody
would guess gets round it. It would be high if that trick did not work.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). In it,
  English and French are ticked under "UI" and "Forms" in "Website
  Languages", and under "Submissions" and "Metadata" in "Submission
  Languages".
- A submission that has no French text: OJS submission 7, "Developing
  efficacy beliefs in the classroom"; OMP submission 1, "The ABCs of
  Human Survival: A Paradigm for Global Citizenship"; OPS submission 1,
  "The influence of lactation on the quantity and quality of cashmere
  production". In the dataset, every unpublished submission is such a
  one.

Setting:

1. Sign in as `rvaca`.
2. Go to Settings › Website › "Setup" › "Languages".
3. In the "Submission Languages" table, in the "French (Canada)" row,
   untick "Metadata". This also unticks "Submissions". The notice reads
   "Locale settings saved.", and French stays ticked under "Forms" in
   "Website Languages".

Person:

4. Open the submission
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
5. Go to Publication › "Contributors" › "Add Contributor".
6. Leave Contributor Type on "Person". Fill in Given Name `Ada`, Family
   Name `u41i`, Email `u41i-person@mailinator.com` and Country "Canada",
   and tick "Author" under Contributor Roles.
7. Press "Save".
8. Change Given Name to `Adah` and leave the box.
9. Press "Close" and reload the page.

Organization or group:

10. Press "Add Contributor" and choose Contributor Type "Organization or
    group".
11. Fill in Organization Name `u41i Org`, Email
    `u41i-org@mailinator.com` and Country "Canada", tick "Author", and
    press "Save". Then press "Close".

Anonymous:

12. Press "Add Contributor" and choose Contributor Type "Anonymous".
13. Fill in Email `u41i-anon@mailinator.com` and Country "Canada", tick
    "Author", and press "Save". Then press "Close".

**Expected**: each "Save" closes the panel and lists the new
contributor, and the contributor is still listed after a reload. French
is not a metadata language, so the form shows no French boxes and sends
only the English values typed.

**Observed**: the panel stays open after each "Save". The page notice
reads "The form was not saved because 1 error(s) were encountered.
Please correct these errors and try again." (3 for the organization, 5
for the anonymous contributor). The form's foot reads:

- Person: "Please correct one error. Go to Organization Name: This
  language is not accepted."
- Organization or group: "Please correct 3 errors." with "Go to Given
  Name", "Go to Family Name" and "Go to Preferred Public Name", each
  ": This language is not accepted."
- Anonymous: "Please correct 5 errors." with those three, "Go to Bio
  Statement (e.g., department and rank)" and "Go to Organization Name".

None of these fields is on the form, and no field shows a message.
After step 8, "Save" is still disabled and the foot is unchanged.
"Close" closes the panel without asking, and after the reload the list
holds only the submission's original contributor. The request sends
English values only and is refused:

```
POST /index.php/publicknowledge/api/v1/submissions/7/publications/8/contributors
contributorType=PERSON&givenName[en]=Ada&familyName[en]=u41i&email=u41i-person@mailinator.com&country=CA&rorId=&url=&affiliations=&contributorRoles[]=1&creditRoles=&includeInBrowse=true

400 {"organizationName":{"fr_CA":["This language is not accepted."]}}
```

The same three adds on the unchanged dataset, with French still under
"Metadata", save. On the changed journal, an add that first gets an
Organization Name typed under "Organization or group" and then switches
back to "Person" saves (as section editor `dbuskins`), and so do a
row's "Edit" › "Save" and "Add Contributor" in the submission wizard's
"Contributors" step (as author `ccorino`).

## Cause

`PKPSubmissionController::removeIrrelevantContributorTypeData()`
(lib/pkp `api/v1/submissions/PKPSubmissionController.php`) clears the
fields of the types the contributor is not. Both `addContributor()` and
`editContributor()` call it before validating. A multilingual field of
another type that the request leaves out is set to null in every one of
the context's form languages (the "Forms" column):

```php
$nulledMProp = Arr::mapWithKeys($context->getSupportedFormLocales(), fn (string $l) => [$l => null]);
...
$params[$key] = $mprops->contains($key)
    ? (isset($params[$key]) ? array_map(fn ($_) => null, $params[$key]) : $nulledMProp)
    : null;
```

`PKP\author\Repository::validate()` then accepts only
`$submission->getPublicationLanguages($context->getSupportedSubmissionMetadataLocales())`:
the metadata languages plus any language the publication or its
contributors already hold text in. `ValidatorFactory::allowedLocales()`
refuses every key outside that list, null values included. So the
server adds a null `fr_CA` key for each left-out field and its own
validator refuses that key.

Which requests leave fields out depends on the form config, not on the
component: the workflow and the wizard both use ui-library's
`ContributorsListPanel`. The workflow's form is the dashboard's
`ContributorForm('emit', [], null, $context)` (`PKPDashboardHandler`),
built with no languages, so its multilingual fields start empty.
`Form.vue` `submitValues()` drops a field with no value and does not
check whether the field is shown. A field the user never typed in is
left out, and one typed in under another type is sent. The wizard's
form (`ContributorsListPanel::getForm()`) gives every multilingual field
a key in each of the submission's metadata languages, and sends them
even when empty, so those fields take the `array_map` branch and gain no
new key. The method came with the contributor types in
`pkp/pkp-lib#11765`, to remove the other type's stored values when a
contributor's type changes.

Reach:

- `addContributor()` from the workflow: every add whose request leaves
  out another type's field, on all three apps (walked).
- `editContributor()`: the "Edit" form's values are keyed by the
  submission's metadata languages and it sends every field, so it adds
  no key and saves (walked). A REST API client that leaves out the
  other type's fields would be refused in the same way (code).
- The submission wizard's "Contributors" step sends every field and
  saves (walked on OJS).
- Nothing wrong is stored: the request is refused before anything is
  written.
- No other code sets values in the form languages for submission
  metadata. Every other author, affiliation, publication and file check
  uses `getPublicationLanguages(getSupportedSubmissionMetadataLocales())`
  (a search of lib/pkp for `getSupportedFormLocales()` and
  `getPublicationLanguages(`).

## Proposed fix

Proposed: null the left-out fields in the languages the validator
accepts, by passing the submission to the method, and call it after the
controller has swapped in the submission's own context, the one
`validate()` uses
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-contributor-refused-hidden-fields/fix.diff)):

```diff
-    protected function removeIrrelevantContributorTypeData(array &$params, Context $context): void
+    protected function removeIrrelevantContributorTypeData(array &$params, Submission $submission, Context $context): void
     {
         $contributorType = $params['contributorType'];
-        $nulledMProp = Arr::mapWithKeys($context->getSupportedFormLocales(), fn (string $l) => [$l => null]);
+        // Null only the locales Repo::author()->validate() accepts: any other key is refused
+        $allowedLocales = $submission->getPublicationLanguages($context->getSupportedSubmissionMetadataLocales());
+        $nulledMProp = Arr::mapWithKeys($allowedLocales, fn (string $l) => [$l => null]);
```

In `addContributor()` and `editContributor()` the call moves below the
`if (!$submissionContext || … !== $submission->getData('contextId'))`
block and passes `$submission`. The locale list is the one
`Repository::validate()`, `newAuthorFromUser()` and the author and
affiliation schema maps already use. It still holds every language a
stored value can be in, because `getPublicationLanguages()` includes the
languages of the publication's existing contributors, so a type change
still clears the other type's names.

The fix was tried on the three apps: the steps above then saved all
three contributors, listed after a reload. A change from Organization to
Person on the unchanged dataset still saved and left no organization
name stored, the same with the fix in and out.

**Alternatives**:

- Make `ValidatorFactory::allowedLocales()` skip null values. This is
  shared by every entity's validation, and would let any client send
  keys in any language as long as they are empty. Too wide.
- Have the workflow's form send every field, as the wizard's does. That
  fixes the screen, but not REST API clients that leave fields out.
- Skip the nulling on add, since a new record holds nothing to clear.
  This misses the same mismatch on an edit sent by an API client.

**What goes with it**: a test that adds each contributor type through
the endpoint on a context with a "Forms" language that is not a
metadata language. The same method reads `$params['contributorType']`
without a check, so a request without it gets a PHP warning; worth a
guard while the method is open.

Small: one method and its two calls in one pkp-lib file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-contributor-refused-hidden-fields/walk.js)
  (helpers in `lib.js` beside it), run with pkp-e2e's probe kit on an
  install freshly loaded with the default dataset: `node bin/probe.js
  all …/walk.js`. `MODE=neighbour` runs the control (an Organization
  add, then its change to Person, on the unchanged dataset, with the
  stored names read from the database). `MODE=wayround` runs, on OJS,
  the type-switch way round for a person and an organization as
  `dbuskins`, an "Edit" of the existing contributor, and a wizard add as
  `ccorino`.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) as
  `rvaca`, on PostgreSQL, with pkp/datasets 566bb1f (2026-10-03). On 3.5
  the form has no "Contributor Type". Steps 10 to 13 do not apply there,
  and the Person add saved on all three apps. The 3.5 code agrees: there
  is no `removeIrrelevantContributorTypeData()`, and
  `addContributor()` adds no keys to the request before
  `Repository::validate()`.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6; the method and its calls are the
  same in both lib/pkp commits); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402. Neither has
  `removeIrrelevantContributorTypeData()` or
  `Author::CONTRIBUTOR_TYPE_FORM_FIELDS`. On 3.4,
  `PKPSubmissionHandler::addContributor()` adds only `publicationId`
  before validating against the submission languages. On 3.3,
  contributors are added through the legacy author form, which has no
  types.
- Introduced: `git blame` and `git log -L` on the method give one commit,
  52d3a0f8e7 (2025-11-11), the method's creation. Its PR is
  `pkp/pkp-lib#11765` "Contributor Roles and Type" (merged 2025-11-20),
  which cross-references `pkp/pkp-lib#11378`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for "contributor" with "language is not accepted", "form
  language", "locale" and "save error", and for the method's name.
  `pkp/pkp-lib#12493` (closed) is the same kind of mismatch, but in the
  reviewer suggestion form: a different fault.
- Not driven: the steps as other roles than `rvaca` (the refusal comes
  after the endpoint's permission check and does not depend on the role;
  the way round was walked as a section editor); the wizard and the
  "Edit" on OMP and OPS (same code); an add on an editable submission
  that already holds French text, since the dataset has none (the
  dataset's French contributor rows hold no value). By the code, such a
  submission saves.
