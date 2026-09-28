<?php
/**
 * Parity X for scenarios/task `statisticsReport` (U65): the command line's
 * run of the monthly task, narrowed to one context. As `php
 * lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`
 * runs it (a CommandLineTool, PageRouter), the task's execute() over every
 * context, with its Bus::batch() captured so only the named context's jobs
 * are queued (the whole run would notify and email the base context's
 * roster, read-only). The jobs are left on the queue for `php
 * lib/pkp/tools/jobs.php run`, the app's own runner, to execute.
 *
 * Usage: PKP_CONFIG_FILE=… php cli-statsreport.php <appRoot> <contextPath>
 */
define('APP_ROOT', $argv[1]);
require_once APP_ROOT . '/tools/bootstrap.php';

use APP\core\Application;
use Illuminate\Support\Facades\Bus;
use PKP\jobs\notifications\StatisticsReportMail;
use PKP\jobs\notifications\StatisticsReportNotify;
use PKP\notification\managerDelegate\EditorialReportNotificationManager;
use PKP\task\StatisticsReport;

class U65StatsReportCli extends \PKP\cliTool\CommandLineTool
{
    public function execute(): void
    {
        $path = $this->argv[1];
        $context = Application::getContextDAO()->getByPath($path);
        $realBus = Bus::getFacadeRoot();
        $fake = Bus::fake();
        try {
            $ok = (new StatisticsReport())->execute();
        } finally {
            Bus::swap($realBus);
        }
        $jobs = [];
        $users = ['notify' => [], 'mail' => []];
        foreach ($fake->dispatchedBatches() as $pending) {
            foreach ($pending->jobs as $job) {
                if ($job instanceof StatisticsReportMail) {
                    $cid = (new ReflectionProperty($job, 'contextId'))->getValue($job);
                    $kind = 'mail';
                } else {
                    $m = (new ReflectionProperty($job, 'notificationManager'))->getValue($job);
                    $cid = (new ReflectionProperty(EditorialReportNotificationManager::class, '_context'))->getValue($m)->getId();
                    $kind = 'notify';
                }
                if ((int) $cid === (int) $context->getId()) {
                    $jobs[] = $job;
                    $users[$kind] = array_merge($users[$kind], (new ReflectionProperty($job, 'userIds'))->getValue($job)->all());
                }
            }
        }
        $batch = $jobs ? Bus::batch($jobs)->dispatch() : null;
        echo json_encode(['ok' => $ok, 'contextId' => $context->getId(), 'jobs' => count($jobs), 'batch' => $batch?->id, 'users' => $users]), "\n";
    }
}

(new U65StatsReportCli($argv))->execute();
