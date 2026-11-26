import { Command, Flags } from '@oclif/core';
import { AuthGuard } from '../utils/auth.guard';
import { resolveThemeId } from '../utils/theme';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';

export default class Versions extends Command {
    static description = 'List the theme versions';

    static flags = {
        theme: Flags.string({ char: 't', description: 'Theme ID (Opsiyonel)' }),
    };

    async run() {
        await AuthGuard.check();
        const { flags } = await this.parse(Versions);

        const projectDir = process.cwd();
        const themeId = await resolveThemeId(projectDir, flags.theme);

        if (!themeId) {
            this.error(chalk.red('Theme ID not found. Run "npx @crafter-cms/cli init" or pass it with -t.'));
        }

        const spinner = ora('Versiyonlar listeleniyor...').start();

        try {
            this.log(chalk.yellow('\n[INFO] Theme versioning (versions) is currently under development. Version history in the new Marketplace architecture will be enabled soon.\n'));
            spinner.stop();
        } catch (error: any) {
            spinner.fail(chalk.red('Could not fetch the versions.'));
            this.error(error.message);
        }
    }
}
