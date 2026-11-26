import { Command, Flags } from '@oclif/core';
import { ApiService } from '../services/api.service';
import { resolveThemeId } from '../utils/theme';
import chalk from 'chalk';
import ora from 'ora';

/**
 * Downloading theme files from the server.
 *
 * The server (backend main/development) has no endpoint that lets the theme owner read the contents of dev/ files:
 * - GET /marketplace/themes/:id/files only lists file names (owner/admin).
 * - GET /marketplace/themes/:id/file, which earlier versions called, never existed; every file was skipped and "0 files downloaded" was reported.
 * - There is no signed download link or dev/ ZIP download endpoint either.
 * So pull lists the files and exits with a clear error. Downloading will return once the backend has a read endpoint.
 */
export default class Pull extends Command {
    static description = 'Downloads the theme files from the server into the local folder (temporarily unavailable until the server supports it).';

    static flags = {
        theme: Flags.string({ char: 't', description: 'Theme ID (required if it is not in crafter-manifest.json)' }),
        force: Flags.boolean({ char: 'f', description: 'Overwrite existing local files', default: false }),
    };

    async run() {
        const { flags } = await this.parse(Pull);

        const projectDir = process.cwd();
        const themeId = await resolveThemeId(projectDir, flags.theme);

        if (!themeId) {
            this.error(chalk.red('A theme ID is required. Use "npx @crafter-cms/cli pull -t <themeId>" or run init in the project.'));
        }

        const spinner = ora('Listing theme files...').start();

        let fileCount: number | undefined;
        try {
            const api = await ApiService.getInstance();
            const filesRes = await api.get(`/marketplace/themes/${themeId}/files`);
            const files = filesRes.data?.files;
            fileCount = Array.isArray(files) ? files.length : undefined;
            spinner.stop();
        } catch (error: any) {
            spinner.fail(chalk.red('Could not list the theme files.'));
            if (error.response?.status === 403) {
                this.error(chalk.red('You do not have access to this theme\'s files (theme owner only).'));
            }
            this.error(error.response?.data?.message || error.message);
        }

        const countInfo = fileCount !== undefined ? ` (${fileCount})` : '';
        this.error(chalk.red([
            `pull is currently unavailable: the server has no endpoint to download theme file contents. Your files are still on the server${countInfo}; no local files were changed.`,
            'Your local files are the source of truth: use "crafter push" or "crafter dev" to upload them. Download support will come with a later CLI update.',
        ].join('\n')), { exit: 1 });
    }
}
