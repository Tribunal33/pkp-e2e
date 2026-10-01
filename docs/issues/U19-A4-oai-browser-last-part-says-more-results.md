# The browser view of the last part of a long OAI-PMH list says "There are more results." and offers a "Resume" that is refused

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [cdd5b10886](https://github.com/pkp/pkp-lib/commit/cdd5b108865517f8768e0d4d551116a280fc7c02)
  · 2008-12-02 · Alec Smecher (asmecher), the commit that added the
  stylesheet
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager or developer who reads a journal's OAI-PMH address in a
browser and pages through a long list with "Resume" reaches the last
page of the list. That page still shows "There are more results." and a
"Resume" link, which answers "The requested resumptionToken is invalid
or has expired".

Nothing is missing from the list: every record was shown before that
link. Harvesters, which read the XML, are not misled.

It shows on the last page of any list too long for one page: more than
100 records or sets (500 on the list of identifiers), or fewer records
or sets where the site administrator lowered the number per page.

## Impact

- **Lost.** A clear end of the list, and the reader's trust in the
  page: the error suggests records are missing.
- **Who.** A manager checking what the journal exposes, or a developer,
  on an install with that many published records.
- **Way round.** The reader can tell the list has ended from two
  numbers the same page shows: on the last page "cursor" plus the
  records shown equals "completeListSize".

Low: a line and a link mislead while the outcome is right. It would be
medium if a record were left out, and none is.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the journal "Journal of Public
  Knowledge" (`publicknowledge`) on OJS, the press and the preprint
  server of the same path on OMP and OPS. Nobody signs in: the OAI-PMH
  address is public.
- The dataset's lists (2 records on OJS and OMP, 17 on OPS) fit in one
  answer of 100, and no screen sets that number. In `config.inc.php`,
  under `[oai]`, set `oai_max_records = 1`, so each answer holds one
  record. The next request uses it: no restart and no cache to clear.
  Set it back to 100 afterwards. An install with more than 100
  published records needs no change.
- A browser that applies XSL stylesheets (the walks used Chromium).

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   The page shows one record, then "There are more results." and a
   table with "expirationDate", "completeListSize", "cursor" and
   "resumptionToken:" followed by a token and the link "Resume".
2. Press "Resume" until "cursor" is one less than "completeListSize"
   (once on OJS and OMP, 16 times on OPS). This is the last part.
3. Read the lines under the last record.
4. Press "Resume" there.
5. Open `/index.php/publicknowledge/oai?verb=ListSets`, press "Resume"
   to the last part (3 parts on OJS, 6 on OMP, 2 on OPS), read its last
   lines and press "Resume".

**Expected.** The last part ends the list: no "There are more results."
and no "Resume".

**Observed.** Each address redirects to the same address with "/en/"
in it, which is the one that answers. At step 3 (OJS):

```
There are more results.
completeListSize   2
cursor             1
resumptionToken:   Resume
```

"Resume" links to `?verb=ListRecords&resumptionToken=`, with no token.
At step 4 the page reads "OAI Error(s)", "badResumptionToken" and "The
requested resumptionToken is invalid or has expired". Step 5 shows the
same on the last part of the sets, and the same error.

The XML of the last part ends as OAI-PMH asks, with an empty token:

```
GET /index.php/publicknowledge/en/oai?verb=ListRecords&resumptionToken=<token of part 1>   200

<resumptionToken completeListSize="2" cursor="1" />
```

Control: with `oai_max_records` at 100 the same list is one part, with
no such lines under it.

## Cause

The browser view is built by `lib/pkp/xml/oai2.xsl`, which every OAI-PMH
answer names as its stylesheet. Its template for the token
([lines 533 to 547 on main](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/xml/oai2.xsl#L533-L547))
prints the sentence and the link for every `resumptionToken` element,
whatever it holds:

```xml
<xsl:template match="oai:resumptionToken">
  <p>There are more results.</p>
  <table class="values">
    …
    <tr><td class="key">resumptionToken:</td><td class="value"><xsl:value-of select="."/><xsl:text> </xsl:text><a class="link" href="?verb={/oai:OAI-PMH/oai:request/@verb}&amp;resumptionToken={.}">Resume</a></td></tr>
  </table>
</xsl:template>
```

OAI-PMH marks the end of a list that came in parts with an empty
`resumptionToken` element, and `PKP\oai\OAI` writes one on the part that
completes a resumed list
([`classes/oai/OAI.php`, lines 427 to 430, 575 to 578 and 659 to 662](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAI.php#L427-L430)).
The template never tests whether the element is empty, so the end
marker is shown as one more token, and the link carries
`resumptionToken=` with nothing after it, which the app refuses.

Reach:

- ListRecords and ListSets, on screen (steps 3 and 5). The site-wide
  address `/index.php/index/oai` uses the same class and stylesheet
  (code).
- ListIdentifiers writes the same empty element (code). Its answers
  hold 500 headers whatever `oai_max_records` says, so the dataset
  cannot page it and it was not driven.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-browser-last-part-says-more-results/fix.diff)
applied to the three apps. With it, the last part of steps 3 and 5
reads "There are no more results." above "completeListSize" and
"cursor", with no "resumptionToken:" row and no "Resume". Every earlier
part still reads "There are more results." with a "Resume" that opens
the next part, and the one-part list still shows no such lines.

Recommended: in the token template of `oai2.xsl`, tell an empty element
from one that holds a token.

```diff
--- a/lib/pkp/xml/oai2.xsl
+++ b/lib/pkp/xml/oai2.xsl
@@ -531,7 +531,14 @@
 <!-- oai resumptionToken -->
 
 <xsl:template match="oai:resumptionToken">
-  <p>There are more results.</p>
+  <xsl:choose>
+    <xsl:when test="normalize-space(.)">
+      <p>There are more results.</p>
+    </xsl:when>
+    <xsl:otherwise>
+      <p>There are no more results.</p>
+    </xsl:otherwise>
+  </xsl:choose>
   <table class="values">
     <xsl:if test="@expirationDate">
       <tr><td class="key">expirationDate</td><td class="value"><xsl:value-of select="@expirationDate"/></td></tr>
@@ -542,7 +549,9 @@
     <xsl:if test="@cursor">
       <tr><td class="key">cursor</td><td class="value"><xsl:value-of select="@cursor"/></td></tr>
     </xsl:if>
-    <tr><td class="key">resumptionToken:</td><td class="value"><xsl:value-of select="."/><xsl:text> </xsl:text><a class="link" href="?verb={/oai:OAI-PMH/oai:request/@verb}&amp;resumptionToken={.}">Resume</a></td></tr>
+    <xsl:if test="normalize-space(.)">
+      <tr><td class="key">resumptionToken:</td><td class="value"><xsl:value-of select="."/><xsl:text> </xsl:text><a class="link" href="?verb={/oai:OAI-PMH/oai:request/@verb}&amp;resumptionToken={.}">Resume</a></td></tr>
+    </xsl:if>
   </table>
 </xsl:template>
```

The rule lives in this one template, which ListRecords, ListIdentifiers
and ListSets all apply, so the three lists are covered. The same file
already tests attributes with `xsl:if` before printing a row. The new
sentence is English and written in the file, as every other sentence of
the stylesheet is.

**Alternatives:**

- Print nothing for an empty element (`match="oai:resumptionToken[normalize-space(.)]"`
  and an empty template for the rest): shorter, but the last part then
  loses "completeListSize" and "cursor", which tell the reader the list
  is whole.
- Stop writing the empty element in `OAI.php`: wrong, OAI-PMH requires
  it and harvesters stop on it.

**What goes with it:**

- Only the browser view changes. No XML answer, stored data, hook or API
  changes.
- Backport: `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` hold the
  same file, byte for byte, so the diff applies as written.
- Guard: a pkp-e2e test that pages a list to its end in the browser
  view and expects no "Resume" on the last part, proposed as a Planned
  item of spec U19. It needs an install with `oai_max_records` lowered
  or more than 100 records.

Small: two conditions in one template of one file.

## Evidence

- Kept script that takes the Steps on the three apps, signed out, each
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 2c84c3c, 2026-10-01, the `main` and `stable-3_5_0`
  PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-browser-last-part-says-more-results/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-browser-last-part-says-more-results/walk.js),
  run with `PROBE_FEATURE=issues-a4 PROBE_AGENT=a4 node bin/probe.js all shared/playwright/checks/issues/oai-browser-last-part-says-more-results/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It presses "Resume" on
  the page and reads the raw XML beside each part. On 3.5 every step
  showed what main showed.
- How the walk sets `oai_max_records = 1`: it does not edit the
  install's config. `startPagedServer()` in the script's
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-browser-last-part-says-more-results/lib.js)
  serves the same checkout and database on a second port through a copy
  of the config that differs in that value and in the port. The control
  is read on the install's own address, where the value is 100.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-browser-last-part-says-more-results/fix.diff ojs omp ops`,
  then `walk.js` as above, which also reads the cases the fix must not change (the
  parts before the last, the one-part list), run with the fix in and
  out. Reverted with
  `node bin/try-fix.js revert shared/playwright/checks/issues/oai-browser-last-part-says-more-results/fix.diff ojs omp ops`.
  The script as kept was run once more with the fix on OMP, where it
  counted "There are no more results." once on the last part of the
  records and of the sets.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 at OJS 18d097d94e, OMP
  b24879c3db, OPS 3f0919468c (lib/pkp 1fb843f491).
- Code read on main: lib/pkp `xml/oai2.xsl` (the token template and the
  three list templates that apply it), `classes/oai/OAI.php`
  (`listIdentifiers()`, `listRecords()`, `listSets()`: the empty element
  on the part that completes a list; `response()`, which names the
  stylesheet). No other file of the three apps or pkp-lib names a
  stylesheet for an answer.
- 3.5, 3.4 and 3.3 by code: `xml/oai2.xsl` on lib/pkp `stable-3_5_0`
  (1fb843f491), `origin/stable-3_4_0` (df13621c2d) and
  `origin/stable-3_3_0` (d446601ebe) is identical to main's, and each
  branch's `OAI.php` (`OAI.inc.php` on 3.3) writes the empty element
  under the same comment, "Current request completes a previous
  incomplete list, add empty resumption token".
- Introduced: cdd5b10886 ("#1442# Added XSL for OAI", the EPrints
  stylesheet by Christopher Gutteridge) added the template with the
  sentence and the link, and `classes/oai/OAI.inc.php` at that commit
  already wrote the empty element (line 395), so the two disagreed from
  that commit on. It has no pull request. `pkp/pkp-lib#9766` (2024)
  reindented the template and changed neither.
- `oai_max_records` taking effect on the next request is from the code
  (`Config::getData()` reads the file on each request); the walks
  started their server with the value already set.
- Upstream search, 2026-10-01, issues and PRs, open and closed:
  pkp/pkp-lib by "oai2.xsl", "OAI stylesheet", "OAI resumptionToken
  Resume", "OAI "more results"", "OAI HTML view Resume" and "OAI XSL";
  pkp/ojs by "oai2.xsl", "OAI stylesheet" and "OAI "more results"";
  pkp/omp and pkp/ops by "OAI stylesheet". Nothing on this fault.
  pkp/ui-library was not searched: the stylesheet is pkp-lib's.
  `pkp/pkp-lib#7214` (closed, fixed in 2021) is another fault: a wrong
  record count ended lists early. It saw this dead "Resume" as a sign
  of its missing records and did not report the stylesheet.
- Not driven: ListIdentifiers in parts, the site-wide address, and a
  list of more than 100 records without the config change.
