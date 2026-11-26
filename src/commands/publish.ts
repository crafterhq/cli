import { Command, Flags } from '@oclif/core';
import { ApiService } from '../services/api.service';
import { resolveThemeId } from '../utils/theme';
import chalk from 'chalk';
import ora from 'ora';
import { syncManifestWithApi } from '../utils/manifest';
import { input } from '@inquirer/prompts';

export default class Publish extends Command {
    static description = "Submits your development (dev) theme for review to be published.";

    static flags = {
        theme: Flags.string({ char: 't', description: 'Theme ID (optional, defaults to the project manifest)' }),
        version: Flags.string({ char: 'v', description: 'Version to publish (e.g. 1.0.1)' }),
        message: Flags.string({ char: 'm', description: 'Release notes / changes' }),
    };

    async run() {
        const { flags } = await this.parse(Publish);
        const projectDir = process.cwd();

        const themeId = await resolveThemeId(projectDir, flags.theme);

        if (!themeId) {
            this.error(chalk.red('Theme ID not found. Run "npx @crafter-cms/cli init" first or pass -t <themeId>.'));
        }

        let api: any;
        try {
            api = await ApiService.getInstance();
        } catch (error: any) {
            this.error(chalk.red("Could not connect to the API: " + error.message));
        }

        // crafter-manifest.json stays local: the server manifest only fills missing fields, and writes need confirmation
        await syncManifestWithApi(projectDir, themeId as string, api, (m) => this.log(chalk.yellow(m)));

        let version = flags.version;
        if (!version) {
            version = await input({
                message: 'Enter the version number to publish (e.g. 1.0.1):',
                validate: (value) => value.trim().length > 0 || 'A version number is required.',
            });
        }

        let releaseNotes = flags.message;
        if (!releaseNotes) {
            releaseNotes = await input({
                message: 'Enter release notes (optional):',
            });
        }

        const spinner = ora(`Publishing version ${version}...`).start();

        try {
            const payload = {
                version: version.trim(),
                releaseNotes: releaseNotes?.trim() || 'Update published.',
            };

            const response = await api.post(`/marketplace/themes/${themeId}/publish`, payload);

            spinner.succeed(chalk.green(`Done! Version ${version} was submitted for review.`));
            this.log(chalk.gray(response.data?.message || 'The new version was created and submitted for review.'));
        } catch (error: any) {
            spinner.fail(chalk.red('Publishing failed.'));
            if (error.response?.data?.message) {
                this.error(chalk.red(error.response.data.message));
            } else {
                this.error(chalk.red(error.message));
            }
        }
    }
}
