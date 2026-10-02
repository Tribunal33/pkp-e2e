# URN settings: a refused "URN Prefix" shows "&lt;NID&gt;" codes under the box and in a notice

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** OJS: `pkp/pkp-lib#1457` (no PR) · [dba6c9d597](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) · 2015-12-06 · Bozana Bokan (bozana); OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#10927` (open) reports these codes under the box on OJS, and the window's intro line shown twice; it has no cause or fix
- **Tracked in** spec U44 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

In the URN plugin's settings window, a "URN Prefix" that does not start
with "urn:", a name and a colon is refused on "Save", rightly. The list
at the top of the window explains it as
`The URN prefix pattern must be in the form "urn:"<NID>":"<NSS>.`, but
the message under the box reads `…"urn:"&lt;NID&gt;":"&lt;NSS&gt;.`,
with the angle brackets written out as codes.

When the manager corrects the prefix and saves, the window closes with
"Your changes have been saved.", and a notice at the top right repeats
the refusal with the same codes. The list at the top reads correctly,
and a prefix such as `urn:nbn:de:0000-` saves.

## Impact

- **Lost**: nothing. The prefix is refused until it has the right shape,
  which is right.
- **Who**: a journal or press manager setting up the URN plugin who
  types a prefix of the wrong shape.
- **Way round**: read the list at the top of the window, or the
  example in the box's help ("urn:nbn:de:0000-").

Low: a garbled message beside a correct one, and the refusal itself is
right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP the same, with the
  differences in brackets). The "URN" plugin is off in the dataset.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins".
3. Under "Public Identifier Plugins", tick "Enabled" on the "URN" row.
4. Click the "URN" row's arrow, then "Settings". The "URN" window opens.
5. Under "Journal Content", tick "Articles" [OMP: under "Press Content",
   "Monographs"].
6. Fill "URN Prefix" with `nbn:de:0000-`, choose `urn:nbn:de` as
   "Namespace" and fill "Resolver URL" with `https://nbn-resolving.de/`.
7. Click "Save".
8. Replace "URN Prefix" with `urn:nbn:de:0000-` and click "Save".

**Expected**: in step 7 the window stays open, and the message under
"URN Prefix" and the list at the top both read
`The URN prefix pattern must be in the form "urn:"<NID>":"<NSS>.` In
step 8 the window closes with "Your changes have been saved."

**Observed**: in step 7 the window stays open. Under "Errors occurred
processing this form:" at the top it reads correctly, but under "URN
Prefix" it reads:

```
The URN prefix pattern must be in the form "urn:"&lt;NID&gt;":"&lt;NSS&gt;.
```

No notice shows while the window stays open. In step 8 the window
closes, and two notices show at the top right, one after the other:

```
The URN prefix pattern must be in the form "urn:"&lt;NID&gt;":"&lt;NSS&gt;.
Your changes have been saved.
```

The codes in the first notice are this fault. That the step 7 refusal
shows at all after a good save is a separate fault (Cause, Reach).

## Cause

The English message, `plugins.pubIds.urn.manager.settings.form.urnPrefixPattern`
in `plugins/pubIds/urn/locale/en/locale.po` (OJS and OMP), is written as
HTML: `…"urn:"&lt;NID&gt;":"&lt;NSS&gt;.` It was written that way in
OJS 2.4 (2012). There the message showed only in the list at the top,
which the window's template, `plugins/pubIds/urn/templates/settingsForm.tpl`,
includes from `lib/pkp/templates/common/formErrors.tpl`. That template
prints each message as HTML (`{$message}`), so the entities render as
`<` and `>`. The window has no in-place notification box, so
`controllers/notification/inPlaceNotificationContent.tpl` plays no part
here.

The window shows the same message in two more places, and both treat it
as plain text:

- Under the box, through `FormBuilderVocabulary::_smartyFBVSubLabel()`
  and `templates/form/subLabel.tpl`, which prints `{$FBV_label|escape}`.
  The `&` of each entity is escaped again, so the codes show.
- In the notice at the top right. `Form::validate()` stores a
  `NOTIFICATION_TYPE_FORM_ERROR` notification with the errors, and
  `PKPNotificationManager::getNotificationContents()` joins them into
  one text. When the page next fetches notifications,
  `SiteHandler.showNotification_` (`js/controllers/SiteHandler.js`)
  passes that text to the page's notice list, and
  `templates/layouts/backend.tpl` prints it as text
  (`{{ notification.message }}`).

Whichever way the message is written, one of the three places shows it
wrong. OJS dba6c9d597 (the 3.0 public identifiers work) moved the
window onto the form builder and kept the message, which brought in the
escaping under the box. OMP's plugin, 825986f471, was written that way
from the start.

Reach:

- Translations: 45 of the 50 OJS locale files and 21 of the 23 OMP
  ones, English included, write the brackets as `&lt;`/`&gt;`. Four translations
  across the two apps leave the message empty, so English shows
  (checked in the code). Thai (OJS) writes a plain `<NID>`, which shows
  correctly under the box and in the notice. The list at the top reads
  it as tags and drops `<NID>` and `<NSS>` (code only, not walked).
  OMP's French writes `‹NID›`, which shows the same everywhere.
- Other forms: several other forms include `formErrors.tpl`
  (registration, password reset and change, upgrade, institutional
  subscription purchase, the announcement feed and browse block
  settings). None of their messages holds tags or entities, in English
  or in any translation (checked in the code). This message is the only
  one written as HTML.
- OPS ships no URN plugin.
- Out of scope: the refusal notice that appears only after the next
  good save, next to "Your changes have been saved.", is a separate
  fault. It is the form-redraw fault in
  [U09-A11-static-page-refusal-repeated-after-save.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A11-static-page-refusal-repeated-after-save.md):
  after a refusal, `AjaxFormHandler.handleResponse()` announces the
  notice from the form it has just replaced, so the notice waits for
  the next fetch. The fix below changes only the notice's text.

## Proposed fix

A proposal: write the message as plain text, and make the list at the
top print it as text, as the box and the notice already do:

1. `lib/pkp/templates/common/formErrors.tpl`: escape the message, as
   `subLabel.tpl` does for the same message.

   ```diff
   -			<li><a href="#{$field|escape}">{$message}</a></li>
   +			<li><a href="#{$field|escape}">{$message|escape}</a></li>
   ```

2. `plugins/pubIds/urn/locale/*/locale.po` (OJS and OMP): in
   `…form.urnPrefixPattern`, turn `&lt;` and `&gt;` back into `<` and
   `>`, in English and in every translation that has them. The
   translators' wording is left as it is.

One diff per app:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/fix-omp.diff).
Tried on `main` in OJS and OMP: in step 7 the message under the box,
and in step 8 the notice, read `…"urn:"<NID>":"<NSS>.`, the same as the
list at the top. The registration page uses the same template, and its
refusal read the same with the fix in and out ("The passwords do not
match.", "You must agree to the terms of the privacy statement.").

This puts the rule where the rest of the code base has it: a message is
text, and the template that prints it escapes it. It also mends the
Thai message, which needs no change once the list escapes.

Delivery: three PRs. The pkp-lib PR holds the template line. The OJS
and OMP PRs each hold the plugin's locale files and the `lib/pkp`
submodule bump. The proposal is to edit the translated `.po` files
directly in those PRs, as the diffs do. The change is mechanical and
keeps each translator's wording. Changing only English and leaving the
rest to Weblate would leave the codes in every translated window until
each translator edits the message.

**Alternatives**:

- Change only the messages, to a wording without angle brackets (for
  example `"urn:NID:NSS"`): it avoids the shared template, but it is a
  wording change in every language, and the list at the top would go on
  reading any other message as HTML.
- Stop escaping under the box: wrong, since every other message there
  is text.

**What goes with it**:

- A plugin that shows a form message through `formErrors.tpl` and
  relies on HTML in it would see the tags written out. None of the
  three apps' own forms do (Cause, Reach).
- Weblate: the English text changes, so translators may see this one
  message flagged for review, already corrected.
- Backport: the template line and the English message are the same on
  `stable-3_5_0` and `stable-3_4_0`. On `stable-3_3_0` the locale files
  are `locale/<xx_YY>/locale.po` and the message is split over two
  lines.
- Test: an e2e check in the spec (a **Planned** item) that saves a
  prefix of the wrong shape and reads the message under the box.

Medium: the change is small, but it takes three PRs with submodule
bumps, edits 66 locale files, and changes a template that other
forms include.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). It records the message under the
  box and the list at the top, each as shown and as markup, and every
  notice shown after steps 7 and 8. With `WALK=neighbour` in front, it
  runs only the control check: the "Register" page, signed out, with
  the two passwords different.
- Walked on the `main` and `stable-3_5_0` branches, OJS and OMP. The
  markup under the box is `&amp;lt;NID&amp;gt;`, at the top
  `&lt;NID&gt;`, and the list at the top carries `formErrors.tpl`'s
  `<a href="#urnPrefix">`. With the fix in, the list escaped the plain
  `<NID>` correctly, which confirms that this template prints it.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794
  (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246
  (pkp-lib cf3f984335); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441f
  (pkp-lib 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836
  (pkp-lib f6ab331645).
- 3.5, 3.4 and 3.3 (code), both apps: the template lines, the English
  message (`locale/en_US/locale.po` on 3.3), `Form::validate()`'s
  notification and `backend.tpl`'s notice are as the Cause describes.
- Introduced: `git log -S'&lt;NID&gt;'` on the plugin finds the message
  in OJS 1b7d1d6262 (2012, OJS 2.4), shown only through
  `formErrors.tpl`. `git log -G` on the template's
  `fbvElement … id="urnPrefix"` finds dba6c9d597, committed to OJS
  without a PR. OMP's URN plugin came in with `pkp/omp#306`. Both
  predate the first 3.x releases.
- Other instances: the English `.po` files of the three apps and their
  plugins searched for `&…;` entities (none in a form message but this
  one), and the message keys of every form whose template includes
  `formErrors.tpl` searched for tags or entities in every language
  (none).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/omp for "URN prefix
  pattern", `urnPrefixPattern`, "URN NID NSS", "formErrors escape" and
  escaped error messages. `pkp/pkp-lib#10927` (OJS 3.3 to 3.5) shows
  the codes under the box in its screenshot and asks for the message to
  be "rendered correctly". It does not mention the notice or OMP. A
  comment on `pkp/pkp-lib#10821` (the 3.5 identifiers testing issue)
  raised the same message.
- Not walked: the Thai message (code only).
