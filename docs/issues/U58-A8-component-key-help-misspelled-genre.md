# The "Key" help in the "Add a Component" window misspells "identifier" and calls the component a "genre"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3031` for `pkp/pkp-lib#3015` · [d554ab5c27](https://github.com/pkp/pkp-lib/commit/d554ab5c2705eb8d505ce56f08b81aae6bd7f92a) · 2017-11-08 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a8)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

The component window's "Key" help reads "An optional short symbolic
identifer for this genre.": "identifier" is misspelled, and "genre" is a
word the screen uses nowhere else; the screen says "component".

The fault is in the English text alone: the French, Spanish and German
helps are spelled right, though the Spanish and German ones keep the
word "genre". The translations follow the English on pkp's translation
platform.

## Impact

- **Lost**: nothing. The key saves, and the form still refuses a key
  with characters other than letters, digits, hyphens and underscores,
  or one another component already carries.
- **Who**: journal, press and server managers adding or editing a file
  component in Settings › Workflow › "Submission" › "Components".
- **Way round**: none needed; the box works, and the window's heading
  ("Add a Component") says what the key belongs to.

Low: a wording fault that costs no work.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`,
  "Journal of Public Knowledge"); the same on OMP `main` (press) and OPS
  `main` (preprint server). Nothing to create.

Steps:

1. Sign in as `rvaca` (Journal manager; Press manager on OMP, Server
   manager on OPS).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`).
3. On the "Submission" tab, select the side tab "Components". The list
   is headed "Article Components" ("Monograph Components" on OMP,
   "Preprint Components" on OPS), with "Order", "Add a Component" and
   "Restore Defaults" above it.
4. Press "Add a Component".
5. In the "Add a Component" window, read the help under "Key".
6. Press "Cancel".

**Expected**: the help is spelled right and names what the window
edits in the screen's own word, for example "An optional short symbolic
identifier for this component."

**Observed**: the help under "Key" reads

```
An optional short symbolic identifer for this genre.
```

The window's other parts use the screen's words: its heading is "Add a
Component", and the helps under "File Metadata" and "Require with
Submissions" speak of "these files".

## Cause

The help is the English string `manager.setup.genres.key.description`
in `lib/pkp/locale/en/manager.po` (line 2003 on `main`), which
`templates/controllers/grid/settings/genre/form/genreForm.tpl` sets as
the description of the "Key" section. It misspells "identifier" and uses
"genre", the code's name for a component (`Genre`, `GenreDAO`,
`GenreGridHandler`), where every string on the screen says "component"
(`grid.genres.title` "Article Components", the link "Add a Component").

The string came in with the "Key" box itself, when components' keys
became editable, and has not changed since.

Reach:

- One template and one string in pkp-lib serve the three apps; no app
  overrides either (checked in the code). The "Edit" window of an
  existing component is the same form (`GenreGridHandler::addGenre()`
  calls `editGenre()`), so it shows the same help (checked in the code;
  only "Add a Component" was opened on screen).
- "identifer" appears nowhere else in the English locale files of
  pkp-lib, the three apps or their bundled plugins (checked in the code).
- Other English strings that call a component a "genre" (checked in
  the code):
  - OJS `grid.genres.description` and OMP `manager.setup.genres`,
    `manager.setup.genresDescription` and `manager.setup.newGenre`: no
    template or class reads any of the four.
  - The native XML import's `plugins.importexport.common.error.unknownGenre`
    ("Unknown genre {$param}"): it names the XML file's own `genre`
    attribute.
- Translations: 59 locales in `lib/pkp/locale/*/manager.po` translate
  the string; none of the four read has the misspelling. `fr_CA` says
  "élément" ("Un identifiant optionnel, symbolique et court pour ce
  élément.", seen on screen); `es` ("género"), `de` ("Genre") and
  `pt_BR` ("gênero") keep the English word (read in the code).
- Stored data: none; the help is not saved.

## Proposed fix

Correct the English string in pkp-lib so it is spelled right and uses
the screen's word, as the window's heading and the list do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/component-key-help-misspelled-genre/fix.diff)):

```diff
--- a/lib/pkp/locale/en/manager.po
+++ b/lib/pkp/locale/en/manager.po
@@ -2000,7 +2000,7 @@
 msgstr "Key"
 
 msgid "manager.setup.genres.key.description"
-msgstr "An optional short symbolic identifer for this genre."
+msgstr "An optional short symbolic identifier for this component."
 
 msgid "manager.setup.genres.key.exists"
 msgstr "The key already exists."
```

Tried on `main` on all three apps: the "Key" help then reads as
proposed, and every other label and help in the window, in English and
in French, reads the same with the fix in and out.

**Alternatives**:

- A fuller help that says what the key is used for: a product choice
  that the misspelling does not need to wait for.

**What goes with it**:

- The message key stays the same, so no template, API or plugin is
  touched.
- The unused "genre" strings named in the Cause are left as they are;
  removing them is a separate clean-up.
- `es`, `de`, `pt_BR` and the other translations that kept "genre" can
  take "component" on pkp's translation platform.
- 3.5: the diff applies to `stable-3_5_0` unchanged, the line sitting
  71 lines higher (1932).
  3.4 carries the same line in `locale/en/manager.po`, 3.3 in
  `locale/en_US/manager.po`.
- Guard: an e2e check that the "Add a Component" window's labels and
  helps read as the spec gives them (a **Planned** item in spec U58).

Small: one string, no code to change.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/component-key-help-misspelled-genre/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/component-key-help-misspelled-genre/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/component-key-help-misspelled-genre/walk.js`;
  with `WALK_MODE=nb` in front it runs the neighbour check (every label
  and help in the "Add a Component" window, in English and in French).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). 3.5 showed the
  same help, list and window. No request failed and no page script
  failed on either line.
- Tips: OJS `main` ff004d0973 (`lib/pkp` 987776cd04), `stable-3_5_0`
  c1cee76b95 (`lib/pkp` 771474347e), `stable-3_4_0` d68934d0d1,
  `stable-3_3_0` ac77c9fb35; OMP `main` 3b0ecf794 (`lib/pkp`
  3dc90c81a6), `stable-3_5_0` 9c5e24246 (`lib/pkp` cf3f984335),
  `stable-3_4_0` 0aec65441, `stable-3_3_0` 8e72fc883; OPS `main`
  c8af945bb7 (`lib/pkp` 3dc90c81a6), `stable-3_5_0` 38b61882d3
  (`lib/pkp` cf3f984335), `stable-3_4_0` acd8ae704b, `stable-3_3_0`
  c5532e2161; pkp-lib `stable-3_4_0` 767353f4fe, `stable-3_3_0`
  ac3fa73402.
- Code reads: `lib/pkp/locale/en/manager.po` and
  `lib/pkp/templates/controllers/grid/settings/genre/form/genreForm.tpl`
  on `main` and 3.5 for the three apps, with `GenreForm` (the key's
  two checks) and `GenreGridHandler::addGenre()`; the apps' own
  `locale/en/` and `templates/` (no override); the `fr_CA`, `es`, `de`
  and `pt_BR` translations.
  3.4 and 3.3: the same string and template on pkp-lib
  `origin/stable-3_4_0` (`locale/en/manager.po`) and
  `origin/stable-3_3_0` (`locale/en_US/manager.po`), and the apps'
  `grid.genres.title` "Article Components" there
  (`git show upstream/stable-3_x_0:…`).
- The trace: `git blame` on `manager.po` line 2003 gives 631efb9665
  (`pkp/pkp-lib#4779`, the conversion of the locale files to PO, which
  only moved the line); `git log -S'symbolic identifer'` gives
  d554ab5c27, which added it to `locale/en_US/manager.xml`. Its PR,
  `pkp/pkp-lib#3031`, was merged on 2017-11-24.
- Upstream search words: "identifer", "symbolic identifier" with
  "genre", a genre key typo and `manager.setup.genres.key`, in
  pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library.
- Not driven: 3.4 and 3.3.
