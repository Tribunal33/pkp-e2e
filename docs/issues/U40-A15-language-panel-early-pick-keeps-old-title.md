# Change Submission Language: a language picked while the panel loads saves the old title as the new one

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no Change Submission Language panel)
  - 3.3: none (code; no Change Submission Language panel)
- **Introduced** `pkp/ui-library#280` for `pkp/pkp-lib#5502` · [7bd6e9d60e](https://github.com/pkp/ui-library/commit/7bd6e9d60e46992a1fa84e42cce0bf5aa77ee696) · 2024-09-25 · jyhein (jyhein)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U40 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a15)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor opens "Change Submission Language For" and picks the new
language before the panel has finished loading. The Title (and Abstract)
boxes then hold the current language's text under labels that still
name the current language, instead of what the submission holds in the
new language.

Confirm saves that text as the new language's title and abstract and
changes the submission language. A title and abstract already stored in
the new language are overwritten. The current language's own title and
abstract are kept.

It needs a pick before the panel's loading ends, which is signalled by
the submission's title appearing under the panel heading. That moment
comes a fraction of a second after the choices appear, longer on a slow
link or a slow server.

## Impact

- **Lost**: a title and abstract the submission already held in the new
  language, replaced by the current language's text. With none stored,
  the new language gets a copy of the current language's text.
- **Who**: editors and managers changing a submission's language on a
  journal, press or preprint server with more than one submission
  language, when the pick beats the panel's loading.
- **Way round**: wait for the title under the panel heading before
  picking. Afterwards, the overwritten text has to be typed again on
  Title & Abstract.

Medium: the overwrite loses stored text, but only on a pick inside a
loading window of a fraction of a second on an ordinary link, and the
wrong text is in the boxes when the editor confirms. It would be high if
an ordinary-paced pick on an ordinary link met it.

## Steps to reproduce

Preconditions:
- PKP's default test dataset, `main` (OJS, OMP, OPS); `publicknowledge`
  has English and French (Canada) as submission languages.
- Chrome or Chromium with DevTools open, and a custom throttling profile
  (Network › throttling › "Add…": Download 8 kbit/s, Upload 1000 kbit/s,
  Latency 0). It stretches the panel's loading to several seconds, so
  the pick can be made inside it by hand; without it the same happens
  when the pick comes fast enough (Evidence).
- The submission (unpublished, one version): OJS submission 4, "Computer
  Skill Requirements for New and Existing Teachers: Implications for
  Policy and Practice" (section Articles, abstracts required); OMP
  submission 3, "The Political Economy of Workplace Injury in Canada";
  OPS submission 1, "The influence of lactation on the quantity and
  quality of cashmere production".

Steps:
1. Sign in as `dbarnes`.
2. Open the submission (dashboard › "View", or
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
3. In the side menu, open "Title & Abstract". It reads "Current
   Submission Language: English" with "Change" after it.
4. To see a stored French title overwritten: press "French (Canada)" in
   the form's language bar, type "Titre existant" in the French Title
   (and "Résumé existant." in the French Abstract) and press "Save".
   Without this step, the submission has no French title.
5. In DevTools › Network, choose the custom throttling profile.
6. Click "Change". The side panel "Change Submission Language For"
   opens; the line under its heading stays blank while it loads.
7. As soon as the "Submission Language" choices appear, while that line
   is still blank, pick "French (Canada)".
8. Set throttling back to "No throttling" and wait until the submission's
   title shows under the panel heading.
9. Read the "Title" box (OJS and OPS: also "Abstract") and the line under
   its label.
10. Click "Confirm", and read "Title & Abstract" when the page reloads.

**Expected:** the boxes hold what the submission has in French (Canada),
"Titre existant" (or nothing without step 4), under "Enter submission
title here in French (Canada). You can format your title as needed".
Without step 4, Confirm with the Title empty is refused with "This field
is required."

**Observed:** the Title box holds the English title (OJS and OPS: the
Abstract box the English abstract), under "Enter submission title here
in English. You can format your title as needed" and "Including the
abstract in English is recommended. …". Confirm sends the English text
as French (OMP shown):

```
PUT /index.php/publicknowledge/api/v1/submissions/3/publications/3/changeLocale
locale=fr_CA&title=The+Political+Economy+of+Workplace+Injury+in+Canada
→ 200
```

The page reloads reading "Current Submission Language: French (Canada)".
The French title (OJS and OPS: and abstract) now holds the English text;
with step 4, "Titre existant" and "Résumé existant." are gone. The
English title and abstract are unchanged. Nothing in the panel says it
is still loading, Confirm raises no warning, and nothing after the
reload says the French text was replaced.

Control: picked once the title shows under the heading, the boxes hold
the French text (step 4) or are empty and Confirm is refused with "This
field is required."

## Cause

The panel's store,
`useWorkflowChangeSubmissionLanguageModalStore` in
`lib/ui-library/src/pages/workflow/modals/workflowChangeSubmissionLanguageModalStore.js`,
makes two requests when the panel opens: the form
(`GET …/publications/{id}/_components/changeLanguageMetadata`, built by
`ChangeSubmissionLanguageMetadataForm`) and the publication
(`getData()`, `GET …/publications/{id}`, called at line 66 and not
awaited). The form is shown as soon as the form request answers
(`WorkflowChangeSubmissionLanguageModal.vue` line 16,
`v-if="store.form"`), whether or not the publication has arrived.

The form's Title and Abstract start with the current language's text and
the description "… in {current language}"
(`ChangeSubmissionLanguageMetadataForm::setField()`). A pick calls
`setCustom()` (lines 81–101), which sets `form.primaryLocale` to the new
language and then replaces each field's value and description from
`publicationProps`. Until the publication has arrived,
`publicationProps` is empty, so the test at line 89 fails for every
field and nothing is replaced.

Nothing repairs it later: `getData()` only fills `publicationProps` and
the subtitle (lines 125–129), and a second `setCustom()` for the same
language does nothing because `form.primaryLocale` already equals it.
Confirm then posts the current language's text, and
`PKPSubmissionController::changeLocale()` merges it into the publication
under the new language, replacing what was stored there and leaving the
other languages alone.

The rule broken: the form takes input before the data its input handler
depends on has loaded.

Reach:
- The three apps share the store and the modal; each app's
  `lib/ui-library` holds the same two files on `main` and 3.5 (checked in
  the code, walked on all three).
- If the publication request fails, `useFetch` shows "An unexpected
  error has occurred. Please reload the page and try again.", the form
  stays usable with the same fault, and `getData()` throws "Cannot read
  properties of null (reading 'fullTitle')" (walked with the request
  aborted).
- `changeLocale()` cannot tell a stale prefill from a deliberate copy
  (checked in the code), so text already overwritten cannot be found
  afterwards.
- The form's starting language is the submission's:
  `PKPSubmissionController::getLocalizedForm()` sets the form's
  `primaryLocale` to the submission language, so on a French submission
  a settled pick of English fills the boxes with the English text
  (checked in the code, walked).
- The workflow's other publication forms (`WorkflowPublicationForm.vue`)
  carry their values in the form itself, with no handler that waits on
  a second request (checked in the code). The other ui-library forms
  that pair `useForm` with a fetch were not audited.

## Proposed fix

Show the form only once the publication has arrived, with a spinner
while either request is pending, and keep it hidden when the publication
request fails
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-panel-early-pick-keeps-old-title/fix.diff),
against each app's `lib/ui-library` on `main`). In the store:

```diff
+		const isPublicationLoaded = ref(false);
+		const isPublicationFailed = ref(false);
+		const isReady = computed(() => !!form.value && isPublicationLoaded.value);
+		const isLoading = computed(
+			() =>
+				!isReady.value &&
+				isFormSuccess.value !== false &&
+				!isPublicationFailed.value,
+		);
 …
 			await fetchPublication();
 
-			Object.assign(publicationProps, publication.value ?? {});
+			// useFetch has shown the error dialog
+			if (!publication.value) {
+				isPublicationFailed.value = true;
+				return;
+			}
+
+			Object.assign(publicationProps, publication.value);
 			delete publicationProps['locale'];
+			isPublicationLoaded.value = true;
```

(`isFormSuccess` is the form request's `isSuccess` from `useFetch`;
`isReady` and `isLoading` are returned). In the modal:

```diff
 					<PkpForm
-						v-if="store.form"
+						v-if="store.isReady"
 …
+					<div
+						v-else-if="store.isLoading"
+						class="flex h-64 items-center justify-center"
+					>
+						<Spinner />
+					</div>
```

This keeps what the panel was built for, each box pre-filled with what
the submission holds in the picked language. It follows
`FileMetadataForm.vue` (`v-if="form && form.id"`) for the gate and
`NavigationMenuManagerField.vue` for the spinner while loading.
Tried on `main` on all three apps. Under the same throttled steps the
choices appeared only once the title showed under the heading: without
step 4 the boxes were empty and Confirm was refused with "This field is
required." and no request; with step 4 they held "Titre existant" (and
"Résumé existant.") and Confirm kept them. With the publication request
aborted, the panel showed the error dialog and no form, and no script
failed. A settled pick, a typed French title and Confirm still changed
the language, as without the fix. The spinner was not checked on screen.

**Alternatives:**
- Re-run the field update when the publication arrives after a pick: it
  needs a separate "picked early" flag (the `newLocale !== oldLocale`
  test already reads as equal), would overwrite anything typed in the
  meantime, and still shows the wrong language's text for a while.
- Keep the form visible but disable the language choices until the
  publication has arrived: the same protection with less change on
  screen, but no sign of why the choices are disabled.
- Send each field's values in every submission language with the form
  from `ChangeSubmissionLanguageMetadataForm`, so the store needs no
  second request: the cleaner shape, but pkp-lib and ui-library
  together for the same result.

**What goes with it:**
- No stored data, API or hook changes; overwritten text cannot be
  recovered by a repair.
- Backport: the two files are the same on `stable-3_5_0`, so the diff
  applies there as written.
- Guard: a ui-library unit test that the form is not rendered until the
  publication request resolves, and stays hidden when it fails.

Small: one store and its modal in ui-library, a flag pair and a
spinner, with a unit test.

## Evidence

- Walk script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-panel-early-pick-keeps-old-title/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/language-panel-early-pick-keeps-old-title/lib.js)),
  run with
  `node bin/probe.js all shared/playwright/checks/issues/language-panel-early-pick-keeps-old-title/walk.js`
  on installs freshly loaded from the default dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL). Its modes: the Steps without step 4
  (default), with step 4 (`MODE=existing`), the settled pick of the
  control followed by a typed French title and Confirm (`MODE=nb`), that
  path continued with a settled pick of English on the now French
  submission (`MODE=french`), and the panel with the publication request
  aborted (`MODE=fail`). It applies the throttling profile through the
  Chrome DevTools protocol (`Network.emulateNetworkConditions`, the call
  DevTools' menu makes). The French texts it types carry a `u40r2`
  prefix. The fault does not depend on the database.
- Walked on OJS, OMP and OPS on `main` and 3.5, with the same results on
  all six (`MODE=fail` on `main` only). Under the profile the choices
  appeared 4.5 to 9.5 s after "Change", the pick came 50 to 110 ms later
  with the line under the heading blank, and the publication arrived 1.4
  to 10.3 s after the pick. OMP's panel has no Abstract box, so a French
  abstract stored there survives. No request failed and no page script
  failed, apart from `MODE=fail`.
- The window is the gap between the form's and the publication's
  responses. On these local installs the publication answered 150 to
  220 ms after the form; without throttling, an automated pick 70 to
  90 ms after the choices appeared still beat it on all three apps. The
  publication response is 5 to 9 KB against the form's 2 to 4 KB, so on
  a 1.6 Mbit/s mobile link the extra size adds only about 10 to 35 ms:
  the window reaches seconds only on very slow links (1.5 to 11 s at
  8 kbit/s) or when the server is slow to answer the publication
  request.
- Keys typed into the Title box right after a pick are lost while its
  rich-text editor starts: the editor's own start-up, not this cause;
  walked on 2026-10-07 on a slow link and registered as its own entry,
  spec U40 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a22).
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246 and OPS 38b61882d3 (lib/pkp cf3f984335),
  lib/ui-library d4e01883 for all three; `stable-3_4_0` OJS d68934d0d1,
  OMP 0aec65441, OPS acd8ae704b (lib/pkp 767353f4fe, lib/ui-library
  ee684b34); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161 (lib/pkp ac3fa73402, lib/ui-library 96959f9e).
- 3.4 and 3.3 (code): no `ChangeSubmissionLanguage*` file or
  `changeLocale` endpoint in pkp-lib and no change-language component in
  ui-library; the feature arrived in 3.5.
- Introduced: `git blame` on `setCustom()` and `getData()` gives
  7bd6e9d60e (`pkp/ui-library#280`, merged 2024-09-25), where the form
  came with the page and only the publication was requested, already
  unawaited. ec6cb15f8 (`pkp/ui-library#422`, the move to the new
  workflow page, 2024-10-07) made the form a request too and kept both
  lines; 13d565fd3 (2025-02-28) added the `v-if` only.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched; `pkp/pkp-lib#5502` (closed) is the feature's issue, and none
  reports this.
