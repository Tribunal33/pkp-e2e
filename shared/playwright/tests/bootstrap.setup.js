// @ts-check
/**
 * @file lib/pkp/playwright/tests/bootstrap.setup.js
 *
 * The setup project — runs before every test project.
 *
 * Warm path: GET /api/v1/_test/bootstrap?context=<path> answers 200 with
 * {installed: true, seeded: true} and this is a <1 s no-op.
 *
 * Cold path (empty or partially installed DB): run tools/installTest.php
 * (self-healing — installs the schema, refuses a populated DB it did not
 * install), then POST the app's declarative seed
 * (playwright/fixtures/bootstrap.js): context, sections/series, categories,
 * issues (OJS), the roster users with roles and sub-editor assignments.
 */
const path = require('path');
const {execFileSync} = require('child_process');
const {test: setup, expect} = require('../support/base-test.js');
const {resolveLine} = require('../../../bin/apps.js');

setup('bootstrap the test install', async ({pkpApi, appContext}) => {
    setup.setTimeout(300_000); // a cold install + seed takes 1–3 min

    // A line without the `_test` API (3.4, 3.3: harness.md "The stable
    // lines") gets the schema and the admin account only, no seed; the line's
    // installTest.php is a no-op on an installed database.
    const line = resolveLine();
    if (line && line.overlays === 'install') {
        execFileSync('php', [path.join('tools', 'installTest.php')], {
            cwd: process.env.PKP_APP_ROOT || process.cwd(),
            stdio: 'inherit',
            env: process.env,
        });
        return;
    }

    const probe = await pkpApi.bootstrapProbe(appContext.contextPath);
    if (probe.ok()) {
        const status = await probe.json();
        if (status.seeded) {
            return; // warm
        }
    }

    const appRoot = process.env.PKP_APP_ROOT || process.cwd();
    execFileSync('php', [path.join('tools', 'installTest.php')], {
        cwd: appRoot,
        stdio: 'inherit',
        env: process.env,
    });

    const seeded = await pkpApi.bootstrap(appContext.seed.bootstrap);
    expect(seeded.seeded).toBe(true);

    const verify = await pkpApi.bootstrapProbe(appContext.contextPath);
    expect(verify.ok()).toBeTruthy();
    expect((await verify.json()).seeded).toBe(true);
});
