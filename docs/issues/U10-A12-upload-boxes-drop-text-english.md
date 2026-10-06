# In French, the settings upload boxes say "Drop files here to upload" and show their refusal in English

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#88` with `pkp/pkp-lib#5866` for `pkp/pkp-lib#5865` · [d0ffc05a](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager working in French expects the upload boxes in French, as their
button "Téléverser un fichier" is. The drop area of every upload box on
"Setup" and "Advanced" reads "Drop files here to upload" in English.

A file the box refuses gets the English message "You can't upload files
of this type.", and the "Remove file" link on the refused file's frame
is English too.

The same holds for every interface language other than English, and for
every upload box built on the same component: the pictures of
announcements, categories, highlights, the site's appearance settings,
an article's or preprint's cover image and a book's cover. The
submission wizard's file upload shows the same English drop text while
a file is dragged over it, and the same English refusals.

## Impact

- **Lost**: nothing; files upload and save as they should. A user who
  reads no English meets an English instruction and an English refusal.
- **Who**: managers and editors working in any interface language but
  English, each time they open an upload box or have a file refused;
  authors in the submission wizard, while dragging a file over it or
  when a file is refused. Not affected: the older upload windows built
  on plupload, which load plupload's own translation.
- **Way round**: none needed; uploading still works through the French
  button.

Low: the refused file is still marked, by its frame and the red message
under the box, and a refusal is an occasional slip, not a routine step;
it would rise if an English text were the only sign of what to do next.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Its journal,
  press or server already offers French (Canada) as an interface
  language.
- Any PDF file, named `u10i-logo.pdf` here.

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open the initials menu at the top right and choose "Change Language"
   › "français".
3. Open "Paramètres" › "Site Web", the tab "Apparence", then its side
   tab "Configuration".
4. Read the drop area of each upload box: "Logo", the thumbnail box
   ("Vignette de la revue" on OJS, "Vignette du serveur" on OPS; on OMP
   its label is a raw code, a separate finding) and "Image de la page
   d'accueil". Each has an English box and, beside it, a French one.
5. Open the side tab "Configuration avancée" and read the drop areas of
   the style sheet box (one box) and of "Favicône" (English and French).
6. Back on "Configuration", in the English "Logo" box (the left one),
   press "Téléverser un fichier" and choose `u10i-logo.pdf`.

**Expected**: every drop area reads "Déposer des fichiers à téléverser
ici.", the French text the translation holds for it. Step 6 shows "Les
fichiers de ce type ne peuvent pas être téléversés." under the box, and
the "Remove file" link on the refused file's frame reads "Supprimer le
fichier".

**Observed**: all nine drop areas of steps 4 and 5 (OJS; OMP and OPS
the same) read:

```
Drop files here to upload
```

Step 6 shows, under the box and in the form's foot:

```
You can't upload files of this type.
Veuillez corriger une erreur. Aller à Logo : You can't upload files of this type. Passer à l'erreur suivante
```

and the link on the refused file's frame reads "REMOVE FILE" (the style sheet
upper-cases "Remove file"). The refusal is not even PKP's own English,
which is "Files of this type can not be uploaded."

## Cause

Dropzone.js, the library behind every upload box, takes its texts from
the options `dictDefaultMessage`, `dictInvalidFileType`,
`dictRemoveFile` and the like, and falls back to its own English when
they are missing. PKP hands it the translated texts under other names:
pkp-lib `FieldUpload::__construct()`
(`classes/components/forms/FieldUpload.php`) sets
`dropzoneDictDefaultMessage`, `dropzoneDictInvalidFileType` and nine more
from the `form.dropzone.*` locale keys. ui-library `FieldUpload.vue`
`dropzoneOptions()` spreads those options into Dropzone's configuration
unchanged (`...this.options`), so Dropzone never sees a `dict*` option
and shows its built-in English.

In 3.2 these boxes showed the interface language's texts: the component
copied each one to the name Dropzone reads
(`dictDefaultMessage: this.i18n.dropzoneDictDefaultMessage`, …). The
backend UI refactor of 2020, which stopped passing each component its
own `i18n` texts, moved them into the component's `options` (pkp-lib
4ababcd4c2) and removed that copying from `FieldUpload.vue` (ui-library
d0ffc05a), keeping the `dropzoneDict*` names.

Reach. These are all the components that start Dropzone, read in the
code; only the settings boxes were checked on screen:

- `FieldUpload.vue` and `FieldUploadImage.vue` (which extends it): the
  boxes on "Setup" and "Advanced" (on screen, all three apps), the site
  appearance settings, the announcement, category and highlight forms,
  the cover image of an article (OJS) or preprint (OPS) on its issue or
  placement form, and a book's cover on its catalog entry (OMP).
- `FileUploader.vue`: gets `dropzoneDict*` from
  `PKPSubmissionHandler` (the submission wizard's files), from
  `fileAttachers/Upload.php` (the email "Attach Files" upload) and from
  `createDropzoneOptions()` in ui-library's own
  `FileUploader/dropzoneDefaults.js` (a discussion's attached files),
  and ignores them the same way. Its drop overlay, shown while a file
  is dragged over the page, and its per-file refusals are English. The
  "JATS" page's uploader passes no texts at all.
- `useFileMediaUploader.js` (the "Upload Media File" window): passes no
  texts either, so its refusals are English too.

## Proposed fix

Copy the texts to the names Dropzone reads in one helper beside the
existing defaults in `FileUploader/dropzoneDefaults.js`, and have the
three components that start Dropzone pass their options through it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-boxes-drop-text-english/fix.diff)):

```diff
+/**
+ * Dropzone.js reads its texts from its `dict*` options, while PKP passes
+ * them as `dropzoneDict*`. Return the options with each text also under the
+ * name Dropzone reads; a text not passed comes from the locale keys.
+ */
+export function withDropzoneTexts(options = {}) {
+	const texts = {...defaultDropzoneTexts(), ...options};
+	const dict = {};
+	Object.keys(texts)
+		.filter((key) => key.startsWith('dropzoneDict'))
+		.forEach((key) => {
+			dict[key.replace(/^dropzoneDict/, 'dict')] = texts[key];
+		});
+	return {...dict, ...options};
+}
```

```diff
 				headers: {
 					'X-Csrf-Token': pkp.currentUser.csrfToken,
 				},
-				...this.options,
+				...withDropzoneTexts(this.options),
 			};
```

The same change, a spread through the helper plus its import, goes in
`FileUploader.vue` and `useFileMediaUploader.js`. The fallback gives the
"JATS" and media uploaders their language's texts because the eleven
`form.dropzone.*` keys are in each app's
`registry/uiLocaleKeysBackend.json`, which every backend page loads
before the JavaScript build. `defaultDropzoneTexts()` is the module's
existing `defaultDropzoneOptions` texts as a function, so `t()` runs
when a component builds its options; that is a precaution, since the
keys load first, and `createDropzoneOptions()` returns the same object
as before. The `dropzoneDict*` options the PHP side sends are kept, so
no plugin or PHP caller changes. A text passed for one box still wins
over the default, and an explicit `dict*` option wins over both.

Tried on OJS, OMP and OPS `main`: in French the steps showed the
Expected texts. In English the drop areas were unchanged, and a PNG
uploaded as "Logo" with an alternate text saved and showed after a
reload, with the fix in and out. The English refusal changes from
Dropzone's "You can't upload files of this type." to PKP's own "Files
of this type can not be uploaded.".

**Alternatives**:

- Rename the options to `dict*` where they are made (pkp-lib
  `FieldUpload.php`, `fileAttachers/Upload.php`,
  `PKPSubmissionHandler`, and `dropzoneDefaults.js`): two repositories,
  a change to options plugins may pass, and the "JATS" and media
  uploaders, which pass no texts, stay English.
- Copy the texts in `FieldUpload.vue` alone, as 3.2 did: fixes this
  entry's boxes but leaves the submission wizard, "Attach Files" and the
  media and "JATS" uploaders English.

**What goes with it**:

- Guard: a ui-library unit test that `withDropzoneTexts()` maps every
  `dropzoneDict*` key and keeps an explicit `dict*`, and an e2e check
  that a French upload box's drop area reads the French text.
- Backport: 3.5, 3.4 and 3.3 have no `dropzoneDefaults.js`, so the
  helper goes in a new file beside the component that uses it, with the
  copying alone, since every text comes from PHP there: on 3.5 and 3.4
  for `FieldUpload.vue` and `FileUploader.vue`; on 3.3, which has no
  `FileUploader.vue`, for `FieldUpload.vue` and
  `SubmissionFilesListPanel.vue`. 3.4 and 3.3 use vue2-dropzone, which
  reads the same `dict*` options.
- The refusal text the
  [refused-upload report](https://github.com/jardakotesovec/pkp-e2e/issues/772)
  quotes changes with this fix.

Small: a few lines in one ui-library helper and three call sites, with
no data or API effect.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-boxes-drop-text-english/walk.js)
  takes these Steps:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/upload-boxes-drop-text-english/walk.js`.
  `WALK=nb` is the English check (the same in English, then a PNG saved
  as "Logo"). It uses helpers of
  [refused-upload-locks-box/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-upload-locks-box/lib.js)
  and
  [custom-block-stuck-with-unusable-name/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/custom-block-stuck-with-unusable-name/lib.js).
  The fix was applied with `bin/try-fix.js`, which rebuilds the
  JavaScript.
- Walks: OJS, OMP and OPS on `main` (Steps, the fix, the English check
  with the fix in and out) and `stable-3_5_0` (Steps), on PostgreSQL, on
  pkp/datasets 566bb1f (2026-10-03). No request failed on the server and
  no page script failed.
- Not driven: 3.4 and 3.3; the boxes and uploaders the Reach reads in
  the code; a file over the size limit and a server refusal (the other
  Dropzone texts).
- Tips:
  - **`main`:** OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
    lib/ui-library 280f98c5). The four files the fix touches are the
    same in both ui-library commits.
  - **`stable-3_5_0`:** OJS c1cee76b95 (lib/pkp 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335), lib/ui-library
    d4e0188353 in each.
  - **`stable-3_4_0`:** pkp-lib 767353f4fe, ui-library ee684b341b.
  - **`stable-3_3_0`:** pkp-lib ac3fa73402, ui-library 96959f9ed4.
- Code reads beyond the Reach: dropzone-vue3 1.0.2 (options passed to
  Dropzone unchanged) and Dropzone 6.0.0-beta.2 `src/options.js` (the
  English defaults); the `form.dropzone.*` keys in `locale/en` and
  `locale/fr_CA`. On 3.5, ui-library `FieldUpload.vue` and
  `FileUploader.vue` (`...this.options`, no `dict*`) and pkp-lib
  `FieldUpload.php` (`dropzoneDict*`). On 3.4 and 3.3, `git grep` for
  `dictDefaultMessage` in ui-library `src` (none) and pkp-lib
  `FieldUpload` (`dropzoneDict*` in its options).
- Introduced: `git log -L` on `FieldUpload.vue` `dropzoneOptions()`
  gives d0ffc05a as the change that removed the `dict*` lines that
  7496b3c2 (2018) added; the 3.2.1 release's ui-library (b1394c45) still
  has them. The pkp-lib half is 4ababcd4c2 (`pkp/pkp-lib#5866`), which
  moved the texts from `$this->i18n` into `$this->options`.
- Tracker search (2026-10-03): pkp/pkp-lib, pkp/ui-library, pkp/ojs,
  pkp/omp, pkp/ops for "Drop files here to upload", "You can't upload
  files of this type", dropzone with translation, translated, locale or
  english, `dictDefaultMessage` and `dropzoneDictDefaultMessage`.
