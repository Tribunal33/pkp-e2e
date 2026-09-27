<?php

/**
 * @file api/v1/_test/PKPTestController.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class PKPTestController
 *
 * @brief The test-only API namespace (/api/v1/_test/*) behind the Playwright
 * e2e harness. NEVER present in a production install: the endpoint's
 * index.php answers 404 unless TEST_API_KEY is in the server's process
 * environment, and every request must carry a matching X-Test-Key header
 * (403 otherwise).
 *
 * Routes (site-wide — /index.php/index/api/v1/_test/…):
 * - GET  bootstrap             — warm/cold probe ({installed, seeded})
 * - POST bootstrap             — declarative base seed (warm calls no-op)
 * - POST scenarios/context     — scratch context
 * - POST scenarios/submission  — submission at a declared end-state
 * - POST site                  — the site's own settings (SiteSettingsSeeder)
 * - POST scenarios/job         — a queued or failed test job (JobScenarioBuilder)
 * - POST scenarios/task        — a routine task run that ends in error, its
 *                                report email sent for real (TaskRunScenarioBuilder)
 * - GET  jobs                  — the queue's size a runJobs() drain waits on
 *
 * Every mutating request but scenarios/job and scenarios/task runs under
 * Mail::fake() (seeding-side email is dropped; only test-action mail reaches
 * Mailpit) and inside a DB transaction: a failed build rolls back rather than leaving half-created
 * state (design record 4). The acting user is the installer's admin, which is
 * why scratch contexts count admin among their managers (parity fact).
 */

namespace PKP\API\v1\_test;

use APP\core\Application;
use APP\facades\Repo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Testing\Fakes\MailFake;
use PKP\core\PKPBaseController;
use PKP\core\PKPRequest;
use PKP\core\Registry;
use PKP\security\authorization\PublicAccessPolicy;
use PKP\security\Validation;
use PKP\testing\JobScenarioBuilder;
use PKP\testing\PKPBootstrapSeeder;
use PKP\testing\PKPContextScenarioBuilder;
use PKP\testing\PKPSubmissionScenarioBuilder;
use PKP\testing\SiteSettingsSeeder;
use PKP\testing\SpecException;
use PKP\testing\TaskRunScenarioBuilder;

abstract class PKPTestController extends PKPBaseController
{
    abstract protected function bootstrapSeeder(): PKPBootstrapSeeder;

    abstract protected function contextScenarioBuilder(): PKPContextScenarioBuilder;

    abstract protected function submissionScenarioBuilder(): PKPSubmissionScenarioBuilder;

    public function getHandlerPath(): string
    {
        return '_test';
    }

    public function isSiteWide(): bool
    {
        return true;
    }

    public function getRouteGroupMiddleware(): array
    {
        return [];
    }

    public function getGroupRoutes(): void
    {
        Route::get('bootstrap', $this->probe(...))->name('_test.bootstrap.probe');
        Route::get('jobs', $this->jobs(...))->name('_test.jobs');
        Route::post('bootstrap', $this->bootstrap(...))->name('_test.bootstrap');
        Route::post('session', $this->session(...))->name('_test.session');
        Route::post('scenarios/context', $this->contextScenario(...))->name('_test.scenarios.context');
        Route::post('scenarios/submission', $this->submissionScenario(...))->name('_test.scenarios.submission');
        Route::post('site', $this->siteSettings(...))->name('_test.site');
        Route::post('scenarios/job', $this->jobScenario(...))->name('_test.scenarios.job');
        Route::post('scenarios/task', $this->taskScenario(...))->name('_test.scenarios.task');
    }

    /**
     * @copydoc \PKP\core\PKPBaseController::authorize()
     */
    public function authorize(PKPRequest $request, array &$args, array $roleAssignments): bool
    {
        $envKey = getenv('TEST_API_KEY');
        if (!$envKey) {
            // Defense in depth — index.php already refuses to register.
            http_response_code(404);
            exit;
        }
        $headerKey = (string) app('request')->header('X-Test-Key');
        if (!$headerKey || !hash_equals($envKey, $headerKey)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'X-Test-Key header missing or wrong']);
            exit;
        }
        $this->setEnforceRestrictedSite(false);
        $this->addPolicy(new PublicAccessPolicy());
        return parent::authorize($request, $args, $roleAssignments);
    }

    public function probe(Request $illuminateRequest): JsonResponse
    {
        $contextPath = (string) $illuminateRequest->query('context', '');
        try {
            return response()->json($this->bootstrapSeeder()->probe($contextPath), 200);
        } catch (\Throwable $e) {
            // An empty DB cannot even answer the context lookup — that IS the
            // cold signal, but report it as JSON rather than a raw 500 page.
            return response()->json([
                'installed' => false,
                'seeded' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function bootstrap(Request $illuminateRequest): JsonResponse
    {
        return $this->runBuilder(fn () => $this->bootstrapSeeder()->seed((array) $illuminateRequest->json()->all()));
    }

    /**
     * Sign a user in without the login form: {username} → the session
     * registered server-side, the session cookie on the response, and the
     * user's id. The login form costs a page load plus a bcrypt verify at
     * cost 12 (some 400 ms per test on a runner); this is one 40 ms request
     * (support/auth.js). Disabled accounts answer 403 like the form would.
     */
    public function session(Request $illuminateRequest): JsonResponse
    {
        $username = (string) $illuminateRequest->json('username');
        $user = Repo::user()->getByUsername($username, true);
        if (!$user) {
            return response()->json(['error' => "unknown user {$username}"], 404);
        }
        $reason = null;
        if (!Validation::registerUserSession($user, $reason)) {
            return response()->json(['error' => $reason ?: 'disabled'], 403);
        }
        // The guard queues the cookie on the Illuminate response singleton;
        // the page router sends it from there, the API router does not.
        Application::get()->getRequest()->getSessionGuard()->sendCookies();
        return response()->json(['userId' => $user->getId(), 'username' => $username], 200);
    }

    public function contextScenario(Request $illuminateRequest): JsonResponse
    {
        return $this->runBuilder(fn () => $this->contextScenarioBuilder()->build((array) $illuminateRequest->json()->all()));
    }

    public function submissionScenario(Request $illuminateRequest): JsonResponse
    {
        return $this->runBuilder(fn () => $this->submissionScenarioBuilder()->build((array) $illuminateRequest->json()->all()));
    }

    /**
     * Drop seeding-side mail, but let each mailable go through the two steps
     * the app's own PKP\mail\Mailer::send runs before the transport:
     * setData() (the template variables into viewData) and build() (the
     * Mailable::build hook). Repo::emailLogEntry()->logMailable, which the
     * app calls right after Mail::send, compiles the logged subject and body
     * from that viewData — under a bare Mail::fake() every seeded email_log
     * row carried the raw "{$reviewerName} recommends …" template instead
     * (U30 parity diff, 2026-09-06).
     */
    protected function fakeMail(): void
    {
        $manager = Mail::isFake() ? Mail::getFacadeRoot()->manager : Mail::getFacadeRoot();
        Mail::swap(new class ($manager) extends MailFake {
            public function send($view, array $data = [], $callback = null)
            {
                if ($view instanceof \PKP\mail\Mailable) {
                    $view->setData($view->getLocale());
                    $view->build();
                }
                return parent::send($view, $data, $callback);
            }
        });
    }

    /**
     * The site's own settings, saved as Administration › Site Settings
     * saves them (U60). App-neutral, so no app subclass.
     */
    public function siteSettings(Request $illuminateRequest): JsonResponse
    {
        return $this->runBuilder(fn () => (new SiteSettingsSeeder())->seed((array) $illuminateRequest->json()->all()));
    }

    /**
     * A job of the test's own on the Jobs or Failed Jobs page (U61). Outside
     * the transaction (the database queue inserts after commit) and with no
     * mail fake (the test job sends none).
     */
    public function jobScenario(Request $illuminateRequest): JsonResponse
    {
        return $this->runBuilder(fn () => (new JobScenarioBuilder())->build((array) $illuminateRequest->json()->all()), false, false);
    }

    /**
     * A routine task run that ends in error (U61): its report email is the
     * state, so it is sent for real; the task writes no database row.
     */
    public function taskScenario(Request $illuminateRequest): JsonResponse
    {
        return $this->runBuilder(fn () => (new TaskRunScenarioBuilder())->build((array) $illuminateRequest->json()->all()), false, false);
    }

    /**
     * GET jobs — the queue's size, reserved jobs included (the jobs tool's
     * "total" and "list" count unreserved jobs only). A serial test's drain
     * waits on this until the queue is empty, so a job another worker's
     * runner is still executing cannot be looked for before it lands.
     * The testing queue is left out: the drain (`jobs.php run`) never runs
     * it, and a U61 test job waits there for good (scenarios/job, or a
     * failed one put back by "Try Again" or "Requeue All Failed Jobs").
     */
    public function jobs(): JsonResponse
    {
        $drained = fn () => DB::table('jobs')->where('queue', '<>', JobScenarioBuilder::testingQueue());
        return response()->json([
            // Only jobs a drain would run now: a job released with a retry
            // delay (available_at in the future) is not waited for.
            'queued' => $drained()->whereNull('reserved_at')->where('available_at', '<=', time())->count(),
            'reserved' => $drained()->whereNotNull('reserved_at')->count(),
        ], 200);
    }

    /**
     * Shared builder harness: Mail::fake, admin as acting user, one DB
     * transaction (the job and task builders opt out of the fake and the
     * transaction, and own their failure hygiene). SpecException → 400 with
     * the dotted specKey; anything else → 500 with the exception summary.
     */
    protected function runBuilder(callable $build, bool $transaction = true, bool $fakeMail = true): JsonResponse
    {
        if ($fakeMail) {
            $this->fakeMail();
        }
        $admin = Repo::user()->getByUsername('admin', true);
        if ($admin) {
            Registry::set('user', $admin);
        }

        if ($transaction) {
            DB::beginTransaction();
        }
        try {
            $result = $build();
            if ($transaction) {
                DB::commit();
            }
            return response()->json($result, 200);
        } catch (SpecException $e) {
            if ($transaction) {
                DB::rollBack();
            }
            return response()->json([
                'error' => $e->getMessage(),
                'specKey' => $e->specKey,
            ], 400);
        } catch (\Throwable $e) {
            if ($transaction) {
                DB::rollBack();
            }
            return response()->json([
                'error' => get_class($e) . ': ' . $e->getMessage(),
                'file' => basename($e->getFile()) . ':' . $e->getLine(),
            ], 500);
        }
    }
}
