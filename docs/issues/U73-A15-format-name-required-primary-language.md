# A book in a press's second language cannot get a format or chapter named in that language alone

- **Severity** medium
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code; chapter titles only, since the format form there requires the press's primary language by its own rule)
  - 3.3: OMP (code; as on 3.4, through the 2023 backport `pkp/pkp-lib#8440`)
- **Introduced** `pkp/pkp-lib#8554` for `pkp/pkp-lib#7369` · [7f4ef28995](https://github.com/pkp/pkp-lib/commit/7f4ef289950b6fd435b2d57d0b201c79cf8ab5d0) · 2023-01-20 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U73 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a15) · spec U72 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press whose primary language is English and which also takes
books in French, an editor adds a publication format to a French book
and types its name in French only. "OK" is refused with "This field is
required." under the English box, and nothing is saved. An English
book's format saves with the English name alone.

The chapter window ("Add Chapter") refuses a French book's chapter
titled in French only in the same way.

The press can save only by also typing a name in the English box. That
name then shows to readers who browse the press in English.

## Impact

- **Lost**: the name typed in the English box is stored as the format's
  or chapter's English name. Readers browsing in English see it on the
  book's page (its formats, download links and table of contents), and
  the Native XML export carries it. The ONIX export does not use format
  names. If the press copies the French name into the English box,
  readers see what they would have seen anyway.
- **Who**: editors and press managers adding formats and chapters to
  any book whose language is not the press's primary one;
  authors too when they add chapters in the submission wizard. It
  happens every time, on any press that takes books in more than one
  language.
- **Way round**: type a name in the English box too. The error sits
  under that box.

Medium: a task fails on every such book, with a way round on screen
that writes into a field readers see.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (or `stable-3_5_0`): press
  `publicknowledge`, primary language English, with French (Canada)
  turned on for submissions and metadata.
- A book in French, which the dataset lacks: all of its books are in
  English, and OMP's workflow offers no way to change a book's language.
  Steps 1–2 create one as the dataset's author `aclark`.

The book:

1. Sign in as `aclark`. Start a new submission: under "Submission
   Language" choose "French (Canada)", enter the title "u73j Le livre des
   marées", tick the two boxes and press "Begin Submission".
2. Upload any file as the manuscript and, under "Details", enter a French
   abstract. Press "Continue" through to "Review", then "Submit" and
   confirm. [On 3.5 the wizard asks for "Details" before "Upload
   Files".]
3. Sign out, then sign in as `dbarnes` and open "u73j Le livre des
   marées".

A format:

4. In the side menu, open "Publication Formats" and press "Add
   publication format".
5. In the "Name" box (its placeholder reads "French (Canada)"), type
   "Livre numérique u73j". Leave the "English" box that opens under it
   empty, and press "OK".

A chapter:

6. In the side menu, open "Chapters" and press "Add Chapter".
7. In the "Title" box (French), type "Chapitre u73j". Leave the
   "English" box empty, and press "Save".

**Expected:** each window closes and the new format or chapter is
listed. The name is required in the book's language only.

**Observed:** each window stays open with this message under its
"English" box, and no request is sent:

```
This field is required.
```

Control: on the dataset's English book 4, "How Canadians Communicate",
"Add publication format" with "E-book u73j" typed in the English box
alone is saved and listed.

## Cause

In the legacy forms, the shared text box template
`lib/pkp/templates/form/textInput.tpl` draws one box per language. The
box for the form's own language is shown first and marked required.
The other languages' boxes open under it. Line 50 also marks one of
those other boxes required, the one whose language is `$primaryLocale`:

```smarty
{if $FBV_required && $thisFormLocale === $primaryLocale} required aria-required="true"{/if}
```

Unless a handler has set it, `Form::fetch()` sets `$primaryLocale` to
the press's primary language. The form's own required language
(`Form::getRequiredLocale()`) is never consulted. So a form that
requires a language other than the press's primary one ends up with two
required boxes: its own and the press's.

The line came with the fix for `pkp/pkp-lib#7369`, "Other languages
required when they shouldn't be". That issue asked that a multilingual
box require one language only. Its fix required the press's primary
language in every form, and missed the forms whose required language
is the book's.

Two OMP forms require the book's language on `main` and 3.5:

- `PublicationFormatForm` passes the book's locale as its required
  locale since `pkp/omp#1461` (for `pkp/pkp-lib#9425`, 2024).
- `ChapterForm` has shown the book's language first and checked it on
  the server since `pkp/pkp-lib#5487` (2020). Its required locale has
  been the book's only since `pkp/pkp-lib#12540` (2026), whose
  `Form::setDefaultFormLocale()` also sets `requiredLocale`.

Reach:

- The format window's "Name" and the chapter window's "Title", both
  walked. The submission wizard's chapter list uses the same chapter
  form. Their "Edit" windows do too, so a format or chapter that holds
  no English name (one imported through Native XML, for example)
  cannot be saved from "Edit" either (both checked in the code).
- No other form is affected (checked in the code). Every other legacy
  form that requires a multilingual box uses the press's (or the
  site's) primary language, which is the same as `$primaryLocale`. On
  3.5 the file name form requires the submission's language, and
  `FileUploadWizardHandler::editMetadata()` sets `$primaryLocale` to
  match. On `main` that form is the Vue `FileMetadataForm` and draws no
  such box. OJS and OPS have no form with a required box in another
  language.
- The server's own check does not hold this rule either (checked in the
  code). `PublicationFormatForm` checks `name` with a plain
  `FormValidator` `required`, which passes any posted array of language
  boxes, even all empty. The browser's check is the only one that
  applies to the format name.

## Proposed fix

Mark the extra box required by the form's own required language rather
than the press's primary one. `Form::fetch()` already passes the form's
languages to the template (`formLocales`, `formLocale`), so it passes
the required one beside them, and the template compares against that
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-name-required-primary-language/fix.diff)):

```diff
--- a/lib/pkp/classes/form/Form.php
+++ b/lib/pkp/classes/form/Form.php
                 'formLocale' => $this->getDefaultFormLocale(),
+                'formRequiredLocale' => $this->getRequiredLocale(),
--- a/lib/pkp/templates/form/textInput.tpl
+++ b/lib/pkp/templates/form/textInput.tpl
-					{if $FBV_required && $thisFormLocale === $primaryLocale} required aria-required="true"{/if}
-					{if $FBV_validation && $thisFormLocale === $primaryLocale} validation="{$FBV_validation|escape}"{/if}
+					{if $FBV_required && $thisFormLocale === $formRequiredLocale} required aria-required="true"{/if}
+					{if $FBV_validation && $thisFormLocale === $formRequiredLocale} validation="{$FBV_validation|escape}"{/if}
```

The rule lives in the form, which already knows its required language
and checks it on the server (`FormValidatorLocale` in `ChapterForm`), so
the template reads it from there. This keeps what `pkp/pkp-lib#7369`
wanted: one required language per box. For every form whose required
language is the press's primary one, nothing changes.

Tried on OMP `main`. With the fix in:

- The French book's format saves with the French name alone.
- The English book's format still saves with the English name.
- A French book's format with only an English name is still refused
  under the French box.
- A French chapter title alone is saved.

**Alternatives**

- Assign `$primaryLocale` to the book's language in
  `PublicationFormatGridHandler` and `ChapterGridHandler`. This is a
  workaround per handler, and the next form that requires another
  language would meet the fault again.
- Delete the extra box rule (lines 50–51). On `main` and 3.5 this
  behaves the same as the fix: since `pkp/pkp-lib#12540` the box shown
  first is always the required one, so with the fix the rule never
  matches an extra box. On 3.4 and 3.3 the box shown first is the
  interface language, and the rule is what requires the form's language
  there. Keeping the rule lets one change serve every line.

**What goes with it**

- The OMP format form could check the name with `FormValidatorLocale`
  in the book's locale, as `ChapterForm` does, so that the server
  refuses a nameless format too. This is a separate line in OMP, not
  needed for this fault.
- No stored data to repair, and no API or plugin hook changes.
- Backport: applies as written to 3.5. On 3.4 and 3.3 it also needs the
  one line of `pkp/pkp-lib#12540` (e569f91d33) that makes
  `Form::setDefaultFormLocale()` set `requiredLocale` as well. Without
  that line, `ChapterForm`'s required locale there stays the press's
  primary language, and the template change alone fixes nothing.
- Guard: a **Planned** item in U73 (a format and a chapter of a book in
  the press's second language, named in that language alone). The
  long-open `pkp/pkp-lib#5503` asks for exactly this kind of test.

Small: one line in the shared `Form` and two in its template, plus a
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-name-required-primary-language/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-name-required-primary-language/lib.js),
  on an install freshly loaded from the default dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `node bin/probe.js omp shared/playwright/checks/issues/format-name-required-primary-language/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The default run takes
  the format steps and the control. `MODE=nb` submits a French book of
  its own, then tries a format with the English name alone and a
  chapter with a French title alone (steps 6–7). The walk read each
  name box's `required` attribute: on the French book, both the French
  and the English box carry it; on the English book, only the English
  box does.
- The fix was tried with `node bin/try-fix.js apply` on OMP `main`.
- Tips: `main` OMP 3b0ecf794c (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  9c5e24246c (lib/pkp cf3f984335); `stable-3_4_0` OMP 0aec65441
  (lib/pkp 767353f4fe); `stable-3_3_0` OMP 8e72fc883 (lib/pkp
  ac3fa73402).
- Code reads:
  - `textInput.tpl` lines 50–51 carry the same rule on all four
    branches. On each branch, `Form::fetch()` sets `$primaryLocale` to
    the press's primary language.
  - 3.4 and 3.3: `PublicationFormatForm` passes no locale, and `Form`
    shows the interface language first. So a French book's format
    requires the English name there by the form's own rule.
    `ChapterForm` shows the book's language first, checks it on the
    server, and gets the English box required by line 50, as on
    `main`.
  - Where the English name ends up: `monograph_full.tpl`,
    `publicationFormats.tpl` and `downloadLink.tpl` show
    `getLocalizedName()` and the chapters' `getLocalizedTitle()`. The
    Native XML export writes every language of `name`. The ONIX filter
    reads no format name.
- Introduced: `git blame` on `textInput.tpl` line 50 gives 7f4ef28995.
  Before it, the extra boxes carried `required` through
  `FBV_textInputParams`, so every language box was required (the fault
  `pkp/pkp-lib#7369` reported). On 3.3 the same line came with
  `pkp/pkp-lib#8440`.
- Tracker search (2026-10-04): pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs, for "publication format name required", "required
  primary language", "chapter title required", `primaryLocale`,
  `textInput`, `getRequiredLocale` and `PublicationFormatForm`.
  `pkp/pkp-lib#12540` (closed, legacy forms' required box and order),
  `pkp/pkp-lib#5487` (closed, 2020) and `pkp/pkp-lib#6072` (closed,
  the Vue metadata forms) are other faults. `pkp/pkp-lib#5503` (open)
  asks for tests of required languages in forms.
- Unverified: the refusals in "Edit" and in the submission wizard's
  chapter list are code reads. The server's acceptance of a format
  posted with every name box empty is a code read; no screen sends one.
