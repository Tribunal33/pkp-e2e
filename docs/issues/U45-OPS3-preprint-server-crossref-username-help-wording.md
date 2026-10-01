# A preprint server's Crossref "Username" help reads "see the advise above"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; the Crossref settings have no "Username" help)
- **Introduced** `pkp/crossref-ops#21` for `pkp/pkp-lib#7513` · [3907c9ac49](https://github.com/pkp/crossref-ops/commit/3907c9ac49afbf9953d98eb8ade9627cc041512d) · 2023-02-05 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ops3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager of a preprint server chooses Crossref as the registration
agency under Settings › Distribution › "DOIs" › "Registration". The help
under "Username" reads "The Crossref username that will be used to
authenticate your deposits. If you are using a personal account, see the
advise above.": "advise" stands where "advice" is meant. A journal's
help has "advice", and also says "please see".

Only the English help of a preprint server's Crossref plugin has the
slip.

## Impact

- **Lost.** Nothing. The sentence is still understood and the box works.
- **Who.** Managers of a preprint server who set up its Crossref plugin
  in English.
- **Way round.** None is needed.

Low: a spelling slip in one help text.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`. The Crossref plugin is off in
  the dataset, so step 2 turns it on.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website, the "Plugins" tab, and tick "Crossref Manager
   Plugin".
3. Open Settings › Distribution, the "DOIs" tab, its "Registration" side
   tab.
4. Under "Registration Agency" choose "Crossref".
5. Read the help under "Username".

**Expected.** "The Crossref username that will be used to authenticate
your deposits. If you are using a personal account, please see the advice
above."

**Observed.** "The Crossref username that will be used to authenticate
your deposits. If you are using a personal account, see the advise
above."

The same steps on a journal show the Expected sentence.

## Cause

The help is the locale string
`plugins.importexport.crossref.settings.form.username.description`, which
`CrossrefSettings::getFields()` (`classes/CrossrefSettings.php`, line 84)
sets as the "Username" box's description. The preprint server's Crossref
plugin (pkp/crossref-ops) has the verb where the noun is meant, in
`locale/en/locale.po`, line 76; the diff under "Proposed fix" shows the
line.

The string came in with `pkp/crossref-ops#21`, which moved the plugin's
settings into the Registration tab. That change wrote the line in
`locale/en_US/locale.po`; the file was later moved to `locale/en`. The
journal's plugin
(pkp/crossref-ojs) got the same string in its own twin of that change
with "please see the advice above".

Reach:

- The string is used once, by that box (checked in the code).
- No other English string of OPS, its pkp-lib or its plugins holds
  "advise above" (checked in the code).
- The other languages did not copy the slip where they were read
  (checked in the code): the Canadian French text ends "consultez le
  conseil ci-dessus." and the German "beachten Sie bitte die obigen
  Hinweise." The other languages were not read.

## Proposed fix

Use the journal plugin's sentence in pkp/crossref-ops
`locale/en/locale.po`, which corrects "advise" and adds the journal's
"please".

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-crossref-username-help-wording/fix.diff)
is rooted at the OPS tree (`plugins/generic/crossref/locale/en/locale.po`),
so it does not apply as written inside the pkp/crossref-ops repo. There
the file is `locale/en/locale.po`, and the change is this one line:

```diff
 msgid "plugins.importexport.crossref.settings.form.username.description"
-msgstr "The Crossref username that will be used to authenticate your deposits. If you are using a personal account, see the advise above."
+msgstr "The Crossref username that will be used to authenticate your deposits. If you are using a personal account, please see the advice above."
```

This is a proposal. It was tried on OPS `main`: the help then reads the
Expected sentence, and the "Depositor name" help beside it and the
journal's "Username" help read as before.

**Alternatives**

- Changing only "advise" to "advice" and leaving out "please": it fixes
  the slip, but the two plugins' sentences would still differ for no
  reason.

**What goes with it**

- What happens to the existing translations when the English source
  changes (kept, or flagged for review): not checked.
- The same change applies as written to the plugin's `stable-3_5_0` and
  `stable-3_4_0` branches, where the line is the same.
- No test is proposed for a help text's wording; the kept script below
  reads it.

Small: two words in one locale file of the plugin.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-crossref-username-help-wording/walk.js).
  It takes the steps as `dbarnes` on the default dataset on OJS and OPS
  and reads the "Username" and "Depositor name" helps. OMP has no
  Crossref plugin and is skipped. Run on `main`:
  `PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/preprint-server-crossref-username-help-wording/walk.js`;
  on 3.5 with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front and
  `PROBE_FEATURE=issues-ir1-3_5`.
- Walked on `main` and on `stable-3_5_0`, OJS and OPS, on the default
  dataset (pkp/datasets 38ab955, 2026-09-30), PostgreSQL. A locale
  string does not depend on the database. The walk chooses "Crossref" in
  the list and does not save the form.
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-server-crossref-username-help-wording/fix.diff ops`,
  the same walk, then `revert`. With the fix in, OPS showed the Expected
  sentence; the "Depositor name" help on OPS and both helps on OJS read
  the same with the fix in and out.
- Tips: pkp/crossref-ops `main` b6b94dd5de, `stable-3_5_0` 20f54096a4,
  `stable-3_4_0` 50cef72474; pkp/ops `main` c8af945bb7, `stable-3_5_0`
  cf4fce69bd, `stable-3_4_0` acd8ae704b, `stable-3_3_0` c5532e2161; OJS
  `main` bade233f73, 3.5 92b9a16b48.
- Code reads: the plugin's `locale/en/locale.po` on `main`,
  `stable-3_5_0` and `stable-3_4_0` (the commit OPS `stable-3_4_0` pins)
  holds the same sentence. On OPS `stable-3_3_0` the plugin is
  `plugins/importexport/crossref` inside the app, and its
  `locale/en_US/locale.po` has the "Username" label without a
  `username.description` string. pkp/crossref-ojs
  `locale/en/locale.po` on `main` and 3.5 holds "please see the advice
  above".
- The trace: `git log -S'advise above'` in pkp/crossref-ops names
  3907c9ac49 alone, which `git blame` on the line also names (there the
  file is `locale/en_US/locale.po`). The GitHub
  API's `commits/<sha>/pulls` gives `pkp/crossref-ops#21`. In
  pkp/crossref-ojs, `git log -S'advise above'` finds nothing and
  `-S'please see the advice above'` names 57d24c7 (2023-02-01), the
  journal plugin's twin change.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ops and
  pkp/crossref-ops, issues and PRs, for "advise above", "advise" with
  "crossref username", and "username typo". No issue or PR is about this
  text.
- Not driven: 3.4 and 3.3 (read in the code). Unverified: the help in the
  languages other than English, Canadian French and German.
