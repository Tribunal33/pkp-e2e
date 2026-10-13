<?php
/**
 * U56 claim check C56: the daily "Editorial Reminder" for ONE context, as the
 * routine task PKP\task\EditorialReminders queues it (`php
 * lib/pkp/tools/scheduler.php` runs it over every enabled context): one
 * PKP\jobs\email\EditorialReminder job per active manager and sub-editor of
 * the named context, the task's own collector, left on the queue for the
 * app's own runner (`jobs.php work`, the kit's drainJobs). Narrowed to one
 * context so the base context's roster gets no mail. No screen sends this
 * email; it is the routine task's.
 *
 * Usage: PKP_CONFIG_FILE=… php cli-editorial-reminder.php <appRoot> <contextPath>
 */
define('APP_ROOT', $argv[1]);
require_once APP_ROOT . '/tools/bootstrap.php';

use APP\core\Application;
use APP\facades\Repo;
use PKP\jobs\email\EditorialReminder;
use PKP\security\Role;
use PKP\user\Collector;

class U56C56ReminderCli extends \PKP\cliTool\CommandLineTool
{
    public function execute(): void
    {
        $path = $this->argv[1];
        $context = Application::getContextDAO()->getByPath($path);
        if (!$context) {
            echo json_encode(['error' => "no context $path"]), "\n";
            return;
        }
        $userIds = Repo::user()->getCollector()
            ->filterByContextIds([$context->getId()])
            ->filterByRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR])
            ->filterByStatus(Collector::STATUS_ACTIVE)
            ->getIds();
        foreach ($userIds as $userId) {
            dispatch(new EditorialReminder($userId, $context->getId()));
        }
        $template = Repo::emailTemplate()->getByKey($context->getId(), 'EDITORIAL_REMINDER');
        echo json_encode([
            'contextId' => $context->getId(),
            'primaryLocale' => $context->getPrimaryLocale(),
            'jobs' => $userIds->count(),
            'userIds' => $userIds->values()->all(),
            'templateFound' => (bool) $template,
        ]), "\n";
    }
}

(new U56C56ReminderCli($argv))->execute();
