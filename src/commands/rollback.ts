import { Command, Flags } from '@oclif/core';
import { confirm } from '@inquirer/prompts';
import { AuthGuard } from '../utils/auth.guard';
import { resolveThemeId } from '../utils/theme';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

export default class Rollback extends Command {
    static description = 'Roll the theme back to a specific version';

    static flags = {
        theme: Flags.string({ char: 't', description: 'Theme ID (Opsiyonel)' }),
        version: Flags.string({ char: 'v', description: 'Version to roll back to', required: true }),
    };

    async run() {
        await AuthGuard.check();
        const { flags } = await this.parse(Rollback);

        const projectDir = process.cwd();
        const themeId = await resolveThemeId(projectDir, flags.theme);

        if (!themeId) {
            this.error(chalk.red('Theme ID not found. Run "npx @crafter-cms/cli init" or pass it with -t.'));
        }

        const confirmed = await confirm({
            message: `The theme will be rolled back to version ${flags.version}. Continue?`,
            default: false,
        });

        if (!confirmed) {
            this.log('Cancelled.');
            return;
        }

        const spinner = ora(`Rolling back to version ${flags.version}...`).start();

        try {
            this.log(chalk.yellow('\n[INFO] Theme rollback is currently under development. Version management in the new Marketplace architecture will be enabled soon.\n'));
            spinner.stop();
        } catch (error: any) {
            spinner.fail(chalk.red('Rollback failed!'));
            this.error(error.message);
        }
    }
}
