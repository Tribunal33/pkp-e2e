<?php

if (PHP_SAPI !== 'cli') {
    exit('This script can only be executed from the command-line');
}

/**
 * @file tools/lineUser.php (stable-3_4_0 line)
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @brief Create one user on a 3.4 test install, optionally with a role in a
 * context, through the app's own repositories (the lines without the `_test`
 * API, harness.md "The stable lines"). The probe kit's lineUser() runs it:
 *
 *   php tools/lineUser.php --username u --password p --email e \
 *       [--given G] [--family F] [--context <urlPath> --role manager|subeditor|assistant|author|reviewer|reader]
 *
 * Prints {"userId": n, "contextId": n|null, "userGroupId": n|null} as JSON.
 * Refuses a database without "test" in its name.
 */

require(dirname(__FILE__) . '/bootstrap.php');

use APP\core\Application;
use APP\facades\Repo;
use PKP\config\Config;
use PKP\core\Core;
use PKP\db\DAORegistry;
use PKP\security\Role;
use PKP\security\Validation;

class LineUserTool extends \PKP\cliTool\CommandLineTool
{
    public const ROLES = [
        'manager' => Role::ROLE_ID_MANAGER,
        'subeditor' => Role::ROLE_ID_SUB_EDITOR,
        'assistant' => Role::ROLE_ID_ASSISTANT,
        'author' => Role::ROLE_ID_AUTHOR,
        'reviewer' => Role::ROLE_ID_REVIEWER,
        'reader' => Role::ROLE_ID_READER,
    ];

    public function usage()
    {
        echo "usage: php tools/lineUser.php --username u --password p --email e [--given G] [--family F] [--context path --role manager]\n";
    }

    public function execute()
    {
        $dbName = (string) Config::getVar('database', 'name');
        if (stripos($dbName, 'test') === false) {
            fwrite(STDERR, "lineUser: database \"{$dbName}\" does not look like a test DB — refusing.\n");
            exit(1);
        }
        $opts = [];
        for ($i = 0; $i < count($this->argv); $i++) {
            if (preg_match('/^--([a-z]+)$/', $this->argv[$i], $m)) {
                $opts[$m[1]] = $this->argv[++$i] ?? '';
            }
        }
        foreach (['username', 'password', 'email'] as $required) {
            if (empty($opts[$required])) {
                $this->usage();
                exit(1);
            }
        }
        $roleId = null;
        if (!empty($opts['context'])) {
            $roleId = self::ROLES[$opts['role'] ?? 'manager'] ?? null;
            if (!$roleId) {
                fwrite(STDERR, 'lineUser: --role is one of ' . implode(', ', array_keys(self::ROLES)) . "\n");
                exit(1);
            }
        }

        $site = DAORegistry::getDAO('SiteDAO')->getSite();
        $locale = $site->getPrimaryLocale();
        $user = Repo::user()->newDataObject();
        $user->setUsername($opts['username']);
        $user->setEmail($opts['email']);
        $user->setPassword(Validation::encryptCredentials($opts['username'], $opts['password']));
        $user->setGivenName($opts['given'] ?? $opts['username'], $locale);
        $user->setFamilyName($opts['family'] ?? 'Scratch', $locale);
        $user->setDateRegistered(Core::getCurrentDate());
        $user->setMustChangePassword(false);
        $user->setDisabled(false);
        $userId = Repo::user()->add($user);

        $contextId = null;
        $userGroupId = null;
        if ($roleId) {
            $context = Application::getContextDAO()->getByPath($opts['context']);
            if (!$context) {
                fwrite(STDERR, "lineUser: no context with the path \"{$opts['context']}\" (the user {$userId} was created without a role)\n");
                exit(1);
            }
            $contextId = $context->getId();
            $group = Repo::userGroup()->getByRoleIds([$roleId], $contextId, true)->first()
                ?? Repo::userGroup()->getByRoleIds([$roleId], $contextId)->first();
            if (!$group) {
                fwrite(STDERR, "lineUser: no user group for that role in \"{$opts['context']}\"\n");
                exit(1);
            }
            $userGroupId = $group->getId();
            Repo::userGroup()->assignUserToGroup($userId, $userGroupId);
        }
        echo json_encode(['userId' => $userId, 'contextId' => $contextId, 'userGroupId' => $userGroupId]) . "\n";
    }
}

$tool = new LineUserTool($argv ?? []);
$tool->execute();
