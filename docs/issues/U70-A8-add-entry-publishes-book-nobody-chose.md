# Catalog "Add Entry": "Save" with a word typed publishes the first suggested book, chosen or not

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (code: the dashboard's filters)
  - 3.5: OJS, OMP, OPS (code)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#286` for `pkp/pkp-lib#8919` · [7f13651e](https://github.com/pkp/ui-library/commit/7f13651e9137170ee513e98c61b2cf8127796168) · 2023-10-02 · Jarda Kotěšovec (jardakotesovec); the click on "Save" picks since the dependency update for `pkp/pkp-lib#10969` (`pkp/omp#1866`, [3245fbeb1a](https://github.com/pkp/omp/commit/3245fbeb1a26837d6fb77df90c9894eb2f61befc); `pkp/ojs#4698`, [fdae123d8e](https://github.com/pkp/ojs/commit/fdae123d8e024c729459bfac967695dc06c50bbf)) · 2025-02-28 · same author
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a8)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press's Catalog page, an editor types a word in the "Add Entry"
box and, with the suggestions showing but no book chosen, clicks
"Save". The first suggested book is published at once, with no
confirmation, and joins the catalog. Pressing Tab to leave the box
chooses the first suggestion in the same way; a later "Save" publishes
it.

The editor expected nothing to happen until they picked a book. A book
nobody meant to release can go public, and on `main` its author is
mailed "Publication Published". Clicking a suggestion before "Save"
avoids it.

The same happens in every suggestion box that offers only listed
choices. In a decision's "Notify Reviewers" email, a name typed in "To"
and left without a pick adds the first suggested reviewer, who is then
mailed.

## Impact

- **Lost**: the catalog's correctness. A book still in Copyediting or
  Production goes public before its time, and on `main` its author is
  told it is published, which cannot be taken back.
- **Who**: press managers and Press editors on Content › Catalog ›
  "Add Entry" who click "Save" before picking a suggestion, or who press
  Tab and then "Save". Editors recording a decision in OJS or OMP who
  type in the reviewers' "To" box and leave it without picking.
- **Way round**: click a suggestion, or highlight one with the arrow
  keys and press Enter, before "Save". The published book shows in the
  catalog list and can be unpublished from its workflow. The wrongly
  added reviewer shows in "To" before "Record Decision" and can be
  removed there.

Medium: the result is visible before or straight after the action and
can be undone, apart from the author's email. It would be high if the
published book did not show on the Catalog page.

## Steps to reproduce

Preconditions: the default dataset, OMP `main`. Nothing else. "Add
Entry" suggests the press's unpublished books in Copyediting and
Production. The word `distance` matches two of them: 13 "Mobile
Learning: Transforming the Delivery of Education and Training" (its
abstract: "distance learning applications") and 7 "Accessible Elements:
Teaching Science Online and at a Distance". The list shows 13 above 7.

Clicking "Save" with a word typed:

1. Sign in as `dbarnes`.
2. Open Content › "Catalog" (`/index.php/publicknowledge/en/manageCatalog`).
   It lists "Bomb Canada and Other Unkind Remarks in the American
   Media" and "From Bricks to Brains: The Embodied Cognitive Science of
   LEGO Robots".
3. Press "Add Entry".
4. In "Find monographs to add to the catalog", type `distance` and wait
   for the two suggestions, 13 above 7. Choose neither.
5. Click "Save".

Leaving the box with Tab, continuing from step 5's Observed (the panel
closed, 13 published, so only 7 is suggested now):

6. Press "Add Entry".
7. Type `distance` and wait for the suggestion. Choose none.
8. Press Tab.

An email's recipients, on OJS `main` (the default dataset; submission
10 "Condensing Water Availability Models to Focus on Specific Water
Management Systems" is in review with two completed reviews):

1. Sign in as `dbarnes`, open submission 10 and, in its Review stage,
   press "Accept Submission".
2. On "Notify Authors", press "Continue".
3. On "Notify Reviewers", "To" holds Aisla McCrae and Adela Gallego.
   Press "Remove Aisla McCrae" and "Remove Adela Gallego".
4. In "To", type `a`. Both are suggested. Choose neither.
5. Click the page's heading, "Accept Submission: Notify Reviewers" (the
   suggestions cover "Subject:").
6. Press "Continue", then "Record Decision".

**Expected:** after step 5 of the catalog steps nothing is added: "Save"
with no book chosen is refused, as it is with the box empty, and the
panel stays open. After step 8 the box holds no chosen book. In the
email, "To" stays empty after step 5, so the reviewers' email is
refused or skipped and no reviewer is mailed.

**Observed:** at catalog step 5 the browser sends the first
suggestion's ID without the user having picked it:

```
PUT /index.php/publicknowledge/api/v1/_submissions/addToCatalog
submissionIds[]=13                                  → 200 []
```

The panel closes and the list reloads with "Mobile Learning:
Transforming the Delivery of Education and Training" as a third book.
Submission 13 is published as version 1.0, and `mally@mailinator.com`
receives "Publication Published". At step 8, "Accessible Elements:
Teaching Science Online and at a Distance" becomes a chosen book with
its "Remove …" cross.

In the email, after step 5 "To" holds "Aisla McCrae" again (on 3.5,
which lists Adela Gallego first, "Adela Gallego"). After step 6 the
decision is recorded and `amccrae@mailinator.com` receives "Thank you
for your review". Tab in place of step 5 does the same.

Clicking a suggestion and then "Save" adds that book alone, and Enter
in the box chooses the highlighted suggestion, as a user who pressed it
expects.

## Cause

`lib/ui-library/src/components/Form/fields/Autosuggest.vue` builds every
suggestion box on a Headless UI `Combobox` in single-selection mode
(`:model-value="null"`). It passes every value the Combobox emits on as
the user's pick (`@update:model-value="selectSuggestion"`), and the Vue
`select()` in `lib/ui-library/src/components/Form/fields/FieldBaseAutosuggest.vue`
(line 365) adds it to the field's selection.

In single mode the Combobox highlights the first option as soon as the
list opens. It selects the highlighted option on Enter or a click, and
also when the input is left while the list is open:

- on Tab, in @headlessui/vue 1.7.16 and later (`ComboboxInput`'s
  keydown handler);
- on blur to anything outside the list, since 1.7.17 (`ComboboxInput`'s
  blur handler; tailwindlabs `headlessui#2712`).

In 1.7.23 both paths skip the pick when the highlight came from focusing
the input (`activationTrigger` Focus), but the options a typed word
brings reset that, so a box with a word typed always picks. Clicking "Save" blurs the input first, so the first suggestion is
added to `submissionIds` before the form posts, and OMP's
`addToCatalog()` publishes each ID it receives.

The Vue 3 migration (`7f13651e`) replaced vue-autosuggest with the
Combobox. vue-autosuggest picked only on Enter or a click on an option.
The apps' lock files then held @headlessui/vue at 1.7.16, so only Tab
picked. The dependency update of 2025-02-28 moved OMP and OJS to 1.7.23,
and from then on a click elsewhere picked too.

Reach: every suggestion box that offers only listed choices (no custom
values), in all three apps:

- OMP "Add Entry" (`AddEntryForm`, `FieldSelectSubmissions`): walked.
- The email composer's "To" (`lib/ui-library/src/components/Composer/Composer.vue`
  line 112, `FieldAutosuggestPreset`) wherever recipients can be changed:
  a decision's "Notify Reviewers" step in OJS and OMP. Walked on OJS; OMP
  read in the code. OPS has no reviewers, so no such step.
- The dashboard's "Filters": "Assigned to editor" (`FieldSelectUsers`),
  "Categories" (`FieldAutosuggestPreset`) and OJS "Issues"
  (`FieldSelectIssues`), and the OJS submissions and DOI lists' issue
  filters. A typed name and a click outside the box filter by the first
  match. Read in the code.
- "Categories" in OJS Issue entry, OMP Catalog Entry and the submission
  wizard's "For the Editors", whenever the journal or press has
  categories: a typed word and "Save" assign the first match. Read in
  the code.
- Not affected: boxes that allow custom values ("Keywords" and the other
  controlled vocabularies, affiliations). Their first option is the text
  the user typed, so leaving the box keeps it.

## Proposed fix

Make leaving the input stop being a pick in `Autosuggest.vue`, for
boxes that do not allow custom values. Listeners in the capture phase
on the Combobox's root see the blur and the Tab before the
`ComboboxInput`'s own handlers. They mark the user as leaving when focus
goes outside the field, or on Tab. `selectSuggestion()` ignores a
selection while that mark is set, and focusing the input clears it.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/fix.diff):

```diff
 		as="div"
 		@update:model-value="selectSuggestion"
+		@blur.capture="handleLeave"
+		@keydown.capture="handleKeydown"
 	>
…
+let isLeaving = false;
…
 function handleFocus(state) {
+	if (state) {
+		isLeaving = false;
+	}
 	isFocused.value = state;
…
+function handleLeave(event) {
+	if (props.allowCustom || event.currentTarget.contains(event.relatedTarget)) {
+		return;
+	}
+	isLeaving = true;
+}
+
+function handleKeydown(event) {
+	if (event.key === 'Tab' && !props.allowCustom) {
+		isLeaving = true;
+	}
+}
+
 function selectSuggestion(suggestion) {
+	if (isLeaving) {
+		return;
+	}
 	emit('select-suggestion', suggestion);
 }
```

A click on a suggestion still picks it, because focus stays inside the
field. Enter still picks the highlighted suggestion, the first by
default, which the Vue `select()` documents as intended.

The fix was tried on OMP and OJS `main`:

- At catalog step 5, "Save" sent `submissionIds=` (nothing).
  `addToCatalog()` refused it with 400 "You must provide one or more
  submission ids to be added to the catalog.", the panel stayed open
  and nothing was published. Tab left no chosen book.
- In the email, "To" stayed empty after Tab and after the click, and
  "Record Decision" stopped at "There was a problem with the Notify
  Reviewers step.", as it does for any empty "To". No reviewer was
  mailed.
- These behaved the same with the fix in and out: a suggestion clicked
  and then "Save" (book 7 alone added), Enter in the "Add Entry" box, a
  keyword typed in Publication › "Metadata" › "Keywords" and saved
  without Enter, and a reviewer clicked in "To".

What went into the fix:

- **Where the rule lives.** The pick comes from the shared component
  that wires the Combobox to every suggestion box. A guard in
  `AddEntryForm` or `addToCatalog()` cannot tell a picked ID from one
  the Combobox added, and would leave the composer, the filters and
  "Categories" exposed.
- **How the code base does it.** No component here tells a pick from
  leaving. vue-autosuggest, which this replaced, picked only on Enter
  or a click, and the fix restores that. A box that allows custom
  values keeps today's behaviour, which `pkp/pkp-lib#9592` (keywords
  lost unless Enter was pressed) asked for.
- **Every instance.** The fix covers every box in Reach. Two of them
  have consequences beyond the screen: "Add Entry" publishes, the
  composer mails.
- **The introducing change.** The migration swapped libraries
  (`pkp/pkp-lib#8919` lists "vue-autosuggest@2.2.0 to
  @headlessui/vue/combobox") and names no change in what a box picks.
  Downgrading @headlessui/vue would stop the click from picking but
  not Tab, and would undo the dependency update.
- **What it touches.** The keyboard and mouse behaviour of every
  listed-choice suggestion box in the three apps: Tab and a click
  elsewhere no longer add the highlighted suggestion. No API, hook or
  stored data. It applies to `stable-3_5_0` as written, since its
  `Autosuggest.vue` is identical.
- **The test.** A ui-library component test: type, then blur, and type,
  then press Tab, and check that no `select-suggestion` is emitted while
  Enter and a click on an option still emit one.

**Alternatives:**

- `nullable` on the Combobox: on blur it then emits `null` instead of
  the highlighted option, but `select(null)` falls back to the first
  suggestion, so the blur still picks; and Tab ignores `nullable`.
- `multiple` mode on the Combobox, which never picks on blur or Tab: it
  changes the value contract with every field (an array in place of a
  single item) for a larger change.
- A confirmation before "Add Entry" publishes (`pkp/pkp-lib#10420` asks
  for one for another reason): it would warn the user, but would still
  offer to publish the book they did not choose, and leaves the
  composer as it is.

**What goes with it:** a ui-library change, then a submodule bump in
each app, on `main` and `stable-3_5_0`.

Medium: the change is a few lines in one shared component, but it
changes how every listed-choice suggestion box in the three apps
behaves (the catalog, the email composer, the filters, "Categories"),
so each needs a check, and the component needs a new test.

## Evidence

- Kept scripts (helpers in `lib.js` beside them; the Keywords helpers
  come from
  [`../keywords-order-not-kept/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/keywords-order-not-kept/lib.js)):
  - [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/walk.js)
    takes the catalog steps on OMP and reads the five books' publication
    state, the `addToCatalog` request bodies and the authors' mailboxes:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/walk.js`.
    `MODE=neighbour` runs the catalog and Keywords neighbour checks.
  - [`composer.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/composer.js)
    takes the email steps on OJS (Tab first, then the chip removed
    again and the click), records the decision and reads the reviewers'
    mailboxes; `MODE=neighbour` clicks a suggestion. It opens the
    wizard by its address (`decision/record/10?decision=2&reviewRoundId=8`)
    rather than by the workflow's "Accept Submission" button, which
    leads there.
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default datasets
  of pkp/datasets 566bb1f (2026-10-03): the catalog steps on OMP, the
  email steps on OJS. Both versions gave the same Observed, except that
  on 3.5 the author gets no "Publication Published": 3.5's pkp-lib has
  no `NotifyAuthorOnPublication` listener, and the 3.5 walk left no
  notification or email log row for submission 13. No request failed,
  and the browser showed no script error. OPS was not walked: it has no
  Catalog page and no reviewers; its dashboard filters were read in the
  code.
- Headless UI: `node_modules/@headlessui/vue` 1.7.23 in the OMP and OJS
  checkouts of both lines (`dist/components/combobox/combobox.js`).
  1.7.16 and 1.7.17 were read from the published packages
  (`https://unpkg.com/@headlessui/vue@1.7.16/dist/components/combobox/combobox.js`
  and `@1.7.17`, the files of
  `https://registry.npmjs.org/@headlessui/vue/-/vue-1.7.16.tgz` and
  `vue-1.7.17.tgz`): 1.7.16's Tab case calls `selectActiveOption()` in
  single mode and its input blur handler only clears a flag; 1.7.17's
  blur handler calls `selectActiveOption()`. The lock files pinned 1.7.16
  in OMP from `e1b4952ea` (2023-09-26) and in OJS from `26d28630c5`
  (2023-08-30) until the 2025-02-28 commits in Introduced, both on
  `stable-3_5_0`.
- 3.4 and 3.3 (code): OMP pins vue-autosuggest 2.2.0 there, and
  `FieldBaseAutosuggest.vue` at the ui-library commits OMP pins
  (ee684b34 on 3.4, 96959f9e on 3.3) wires it with `@selected` only.
  In vue-autosuggest 2.2.0, `handleKeyStroke()` skips Tab (key code 9),
  and a mouseup outside the field closes the list without selecting.
- Introduced: `git blame` on the Combobox lines of `Autosuggest.vue`
  gives `946a723b` (`pkp/pkp-lib#10624`), which moved them unchanged from
  `FieldBaseAutosuggest.vue`.
- Branch tips: main OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5), OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363); 3.5 OMP 9c5e24246c (lib/pkp cf3f984335, lib/ui-library
  d4e01883), OJS c1cee76b95 (lib/pkp 771474347e, lib/ui-library
  d4e01883); 3.4 OMP 0aec65441 (lib/ui-library ee684b34); 3.3 OMP
  8e72fc883 (lib/ui-library 96959f9e).
- Unverified: the Reach items not walked (the filters, "Categories",
  the OMP composer), and MySQL (not checked; the fault is in the
  browser).
