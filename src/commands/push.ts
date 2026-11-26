import { Command, Flags } from '@oclif/core';
import { ApiService } from '../services/api.service';
import { resolveThemeId } from '../utils/theme';
import { syncThemeFiles } from '../utils/sync';
import { formatSkippedFiles } from '../utils/ignore';
import chalk from 'chalk';
import ora from 'ora';

export default class Push extends Command {
    static description = "Uploads all files in the local folder to the Crafter API in one go (full sync).";

    static flags = {
        theme: Flags.string({ char: 't', description: 'Theme ID (required if it is not in crafter-manifest.json)' }),
    };

    async run() {
        const { flags } = await this.parse(Push);
        const projectDir = process.cwd();

        const themeId = await resolveThemeId(projectDir, flags.theme);

        if (!themeId) {
            this.error(chalk.red('Theme ID not found. Use "npx @crafter-cms/cli push -t <themeId>" or run "npx @crafter-cms/cli init".'));
        }

        const spinner = ora('Packing theme files (ZIP)...').start();

        try {
            const api = await ApiService.getInstance();

            // ZIP with the shared ignore list and the server allow list, send in a single request
            const result = await syncThemeFiles(api, themeId as string, projectDir, (m) => { spinner.text = m; });

            const fileCount = result.data?.uploadedFiles ?? result.data?.fileCount ?? result.data?.count ?? result.fileCount;
            const countMsg = fileCount ? ` (${fileCount} files)` : '';
            spinner.succeed(chalk.green(`Done! The theme was synced to the API${countMsg}.`));
            if (result.skipped.length > 0) {
                this.log(chalk.yellow(`${result.skipped.length} file(s) not uploaded:`));
                formatSkippedFiles(result.skipped).forEach((l) => this.log(chalk.yellow(l)));
            }
        } catch (error: any) {
            spinner.fail(chalk.red('Upload failed.'));
            this.error(error.response?.data?.message || error.message);
        }
    }
}
