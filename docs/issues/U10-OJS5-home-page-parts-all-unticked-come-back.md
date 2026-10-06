# Unticking every "Journal Content Organization" box says "Saved", but the home page keeps the current issue

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no "Journal Content Organization")
  - 3.4: none (code; no "Journal Content Organization")
  - 3.3: none (code; no "Journal Content Organization")
- **Introduced** `pkp/ojs#4875` for `pkp/pkp-lib#9295` · [9486d8e182](https://github.com/pkp/ojs/commit/9486d8e182356a101a018450ea2073c747addbaa) · 2025-06-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#ojs5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager who unticks all three "Journal Content Organization"
boxes under Settings › Website › "Appearance" › "Theme" and presses
"Save" sees "Saved", and expects a home page without the current issue,
the recent articles and the categories. Instead the tab reopens with the
box a journal gets when nothing is saved: "Include the current issue's
table of contents" once the journal has any issue, otherwise "Include
recent most published articles". The home page shows that part, for
example "Current Issue".

Ticking any one box is kept; only the choice of none is lost, and
nothing says so. The boxes belong to the default theme and the themes
built on it.

## Impact

- **Lost**: the manager's choice to show none of the three parts.
- **Who**: a journal manager who wants a home page built from the
  description and "Additional Content" alone. The setting exists only on
  `main`, so no released version has it; it ships with the next release
  unless fixed.
- **Way round**: there is none: no setting gives a home page without
  all three parts.

Medium: a settings choice is silently ignored with no way round, though
only for the narrow choice of none. Being unreleased makes it cheap to
fix, not less severe, so it stays medium rather than low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`,
  whose issue Vol. 1 No. 2 (2014) is published and current). Nothing
  else.

Steps:

1. Sign in as `rvaca` (journal manager).
2. Go to Settings › Website › "Appearance" › "Theme"
   (`/index.php/publicknowledge/en/management/settings/website`). Under
   "Journal Content Organization", "Include the current issue's table of
   contents" is ticked; "Include recent most published articles" and
   "Include a listing of categories" are not.
3. Untick "Include the current issue's table of contents", so none of the
   three boxes is ticked.
4. Press "Save".
5. Reload the page and open "Appearance" › "Theme" again.
6. Open the journal's home page (`/index.php/publicknowledge`).

**Expected**: step 4 shows "Saved"; step 5 shows the three boxes
unticked; step 6 shows no "Current Issue", no recent articles and no
categories.

**Observed**: step 4 shows "Saved" (the save answers 200). Step 5 shows
"Include the current issue's table of contents" ticked again. Step 6
shows "Current Issue" with "Vol. 1 No. 2 (2014)" and its two articles.

Control: ticking "Include recent most published articles" alone in step
3 is kept; the tab reopens with that box alone.

## Cause

`ThemePlugin::getOption()` (pkp-lib `classes/plugins/ThemePlugin.php`)
falls back to the option's default whenever the stored value is missing
or `null`:

```php
if (isset($this->_optionValues[$name])) {
    return $this->_optionValues[$name];
}
// Return a default if no value is set
...
return $option->default ?? null;
```

An emptied list never reaches the database as a list. The form sends an
empty choice list as `''`, because jQuery drops empty arrays
(`Form.vue` `submitValues`), and the API's `ConvertEmptyStringsToNull`
middleware turns that `''` into `null`. `PKPContextController::editTheme()`
passes the `null` to `ThemePlugin::saveOption()`, where `getType(null)`
gives `string`, so the row is written with `setting_value` NULL and type
`string`. Had the `''` reached `saveOption()`, its own branch
`if ($value === '') { deleteSetting(...) }` would have deleted the row,
with the same result.

On the next read `getOptionValues()` returns `null` for the option, and
`getOption()` returns the default. The tab does the same:
`PKPThemeForm` passes the `null` on, and `Field::getConfig()` shows
`$this->value ?? $this->default`.

Every other checkbox option of a theme in OJS, OMP and OPS defaults to
`false`, where "not set" and "nothing ticked" mean the same.
`pkp/ojs#4875` added `journalContentOrganization` to OJS's
`DefaultThemePlugin` as the first option whose default is a list, and a
list that is never empty: `JournalContentOption::default()` returns the
current issue's table of contents when the journal has any issue,
published or not, otherwise the recent articles. So "none ticked" reads
back as that default, both on the tab and in `IndexHandler::index()`,
which also falls back to `JournalContentOption::default()` when the
value is not an array.

Reach:

- Themes: a child theme of the default theme shows the boxes on its own
  tab and saves them through the default theme's `saveOption()`
  (`getOptionsConfig()` and `saveOption()` defer to the parent), so it
  meets the same fault (checked in the code). A theme not built on the
  default theme has no such boxes, and its home page always shows the
  default (`IndexHandler`'s fallback, from `pkp/pkp-lib#11844`), so it
  has no choice to lose.
- A third-party theme with its own list option whose default is not
  empty meets the same fault; none is in the three apps.
- The site's theme form (`PKPSiteController::editTheme()`) saves through
  the same `saveOption()` (checked in the code); no site-level option
  has a list default.
- The Settings Wizard's "Appearance" tab is the same theme form, saved
  to the same endpoint (`AdminHandler`; checked in the code).

## Proposed fix

Keep an emptied list option as an empty list in
`ThemePlugin::saveOption()`, the one place every theme option is saved
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-parts-all-unticked-come-back/fix.diff)):

```diff
         $pluginSettingsDao = DAORegistry::getDAO('PluginSettingsDAO'); /** @var PluginSettingsDAO $pluginSettingsDao */
+
+        // A list option (checkboxes) with every choice cleared arrives as ''
+        // (the form sends an empty list as '') or null (the API turns '' into
+        // null). Store it as an empty list: a missing or null value means
+        // "never set" and would bring back the option's default.
+        if (is_array($option->default) && ($value === '' || $value === null)) {
+            $value = [];
+        }
```

It follows `getOptionValues()`, which already reads a stored value by
the type of the option's default. The empty list is then saved like any
other list, JSON-encoded twice (by `saveOption()`, then by
`PluginSettingsDAO::updateSetting()`): the row holds the JSON string
`"[]"`, quotes included, as the dataset's `"[\"1\"]"`, with type
`object`. `convertFromDB()` gives back the text `[]`, `getOptionValues()`
decodes it into an empty array, and `getOption()` returns it, so the tab
and `IndexHandler` both see nothing ticked. Options with a text, colour,
radio or yes/no default are untouched.

Tried on OJS `main`: with the fix, the Steps show the three boxes
unticked after the reload and a home page with none of the three parts.
The neighbour check (one box ticked alone) behaves the same with and
without the fix.

**Alternatives**:

- Store a default for `journalContentOrganization` when the journal is
  created: the empty choice would still read back as `null` and fall to
  the default.
- Special-case `journalContentOrganization` in OJS's `IndexHandler` and
  the theme form: two readers patched, the shared fault left for any
  other theme.
- Send something other than `''` for an empty list from the ui-library
  form: every API endpoint reading list fields would have to learn it.

**What goes with it**:

- No stored data to repair: a journal that saved none has a valueless
  row and keeps showing its default until it saves again.
- A unit test in pkp-lib for `ThemePlugin::saveOption()` with an option
  whose default is a non-empty list, saving `''` and `null` and reading
  `[]` back.
Small: no data repair and nothing an API client or plugin relies on
changes.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-parts-all-unticked-come-back/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/home-page-parts-all-unticked-come-back/lib.js).
  It takes the Steps as `rvaca` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03) and also reads the stored option from
  `plugin_settings` after the save. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/home-page-parts-all-unticked-come-back/walk.js`;
  `WALK=nb` in front runs the neighbour check alone.
- Database read in the walk: before the save the dataset holds
  `journalContentOrganization` as `"[\"1\"]"` (type `object`); after
  saving none, `setting_value` NULL with type `string`; with the fix,
  `"[]"` (type `object`).
- Tips, on PostgreSQL (the fault does not depend on the database):
  - main (walked): OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
    64d67363).
  - 3.5 (walked): OJS c1cee76b95 (lib/pkp 771474347e).
  - 3.4 (code): OJS d68934d0d1, lib/pkp 767353f4fe. 3.3 (code): OJS
    ac77c9fb35, lib/pkp ac3fa73402. `DefaultThemePlugin` has no
    `journalContentOrganization`, and `IndexHandler::index()` shows the
    current issue whenever there is one and the journal publishes.
- Introduced: `git blame` on `DefaultThemePlugin.php`'s
  `'default' => JournalContentOption::default($context)` lands on
  9486d8e182 (authored 2025-05-27, merged 2025-06-26). `saveOption()`'s
  `''` branch comes from the commit for `pkp/pkp-lib#3594`
  ([5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3), 2018,
  Nate Wright; blame on main lands on the PSR-12 reformat e3f570bc37) and
  `ConvertEmptyStringsToNull` from `pkp/pkp-lib#7698` (71e79e31e3d,
  2023), both before the option.
  `pkp/pkp-lib#11844` (closed) is a different fault of the same option:
  other themes crashing on the home page because they lack it.
- Not walked: a journal with no issue, whose default is "Include recent
  most published articles" (read in `JournalContentOption::default()`).
