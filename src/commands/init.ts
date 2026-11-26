import { Command } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs-extra';
import { select, input, confirm } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { ApiService } from '../services/api.service';
import { MANIFEST_FILE, syncManifestWithApi } from '../utils/manifest';

export default class Init extends Command {
    static description = 'Initializes a Marketplace theme in the local folder to develop from scratch.';

    async run() {
        const projectDir = process.cwd();
        const localConfigPath = path.join(projectDir, '.crafter');
        
        let api: any;
        try {
            api = await ApiService.getInstance();
        } catch (error: any) {
            this.error(chalk.red("Could not connect to the API: " + error.message));
        }

        this.log(chalk.cyan('Crafter Theme Development (Marketplace)'));

        const action = await select({
            message: 'Ne yapmak istiyorsunuz?',
            choices: [
                {
                    name: 'Create a new theme',
                    value: 'new',
                },
                {
                    name: 'Pick one of my existing themes',
                    value: 'existing',
                },
            ],
        });

        let themeId: string | null = null;

        if (action === 'new') {
            const name = await input({ message: 'Theme name:', required: true });
            const description = await input({ message: 'Description (optional):' });
            const version = await input({ message: 'Versiyon:', default: '1.0.0' });

            const spinner = ora('Creating the developer theme...').start();
            try {
                const res = await api.post('/marketplace/themes/dev-theme', {
                    name,
                    description,
                    version
                });
                themeId = res.data.data.id;
                spinner.succeed(chalk.green(`Theme created! (ID: ${themeId})`));
            } catch (error: any) {
                spinner.fail(chalk.red('Could not create the theme.'));
                this.error(error.response?.data?.message || error.message);
            }
        } else {
            const spinner = ora('Fetching your themes...').start();
            try {
                const res = await api.get('/marketplace/themes/my-themes/list');
                const themes = res.data;
                spinner.stop();

                if (!themes || themes.length === 0) {
                    this.error(chalk.red('No themes found on your account. Please create a new theme.'));
                }

                themeId = await select({
                    message: 'Select the theme you want to develop:',
                    choices: themes.map((t: any) => ({
                        name: `${t.name} (v${t.version || '1.0.0'})`,
                        value: t.id
                    }))
                });
            } catch (error: any) {
                spinner.fail(chalk.red('An error occurred while fetching themes.'));
                this.error(error.response?.data?.message || error.message);
            }
        }

        if (themeId) {
            // Save to .crafter
            let currentConfig = {};
            if (fs.existsSync(localConfigPath)) {
                try {
                    currentConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
                } catch (e) { }
            }
            await fs.writeJSON(localConfigPath, { ...currentConfig, themeId }, { spaces: 2 });

            // Only create boilerplate files if the directory is empty or has no skeleton
            if (!fs.existsSync(path.join(projectDir, 'layout', 'theme.liquid'))) {
                
                const pullTemplate = await confirm({
                    message: 'Download the default starter template (Crafter-CMS/Liquided-Theme)?',
                    default: true
                });

                if (pullTemplate) {
                    const cloneSpinner = ora('Downloading the template (https://github.com/Crafter-CMS/Liquided-Theme)...').start();
                    try {
                        const tempDir = path.join(projectDir, '.temp-theme');
                        
                        // Clean up a leftover temp folder from a previous run
                        if (fs.existsSync(tempDir)) {
                            await fs.remove(tempDir);
                        }

                        execSync(`git clone https://github.com/Crafter-CMS/Liquided-Theme.git "${tempDir}"`, { stdio: 'ignore' });
                        
                        const items = await fs.readdir(tempDir);
                        for (const item of items) {
                            // The template's manifest belongs to another theme (the template itself); it does not replace the local manifest
                            if (item === '.git' || item === MANIFEST_FILE) continue;
                            await fs.move(path.join(tempDir, item), path.join(projectDir, item), { overwrite: true });
                        }
                        
                        await fs.remove(tempDir);
                        cloneSpinner.succeed(chalk.green('Template downloaded!'));
                    } catch (e: any) {
                        cloneSpinner.fail(chalk.red('An error occurred while downloading the template: ' + e.message));
                        this.log(chalk.yellow('Creating an empty theme skeleton...'));
                        await this.createBoilerplate(projectDir);
                    }
                } else {
                    this.log(chalk.gray('Creating empty theme skeleton files...'));
                    await this.createBoilerplate(projectDir);
                }
            }

            // crafter-manifest.json stays local: the server manifest only fills missing fields, and writes need confirmation
            await syncManifestWithApi(projectDir, themeId, api, (m) => this.log(chalk.yellow(m)), true);

            this.log(chalk.green('\n✅ Init complete!'));
            this.log(chalk.blue('Run "npx @crafter-cms/cli dev" to start developing.'));
        }
    }

    private async createBoilerplate(projectDir: string) {
        const filesToCreate = {
            'layout/theme.liquid': `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>{{ shop.name }}</title>\n    {{ content_for_header }}\n    <link rel="stylesheet" href="{{ 'theme.css' | asset_url }}">\n</head>\n<body>\n    <header>\n        <h1>{{ shop.name }}</h1>\n    </header>\n\n    <main id="MainContent">\n        {{ content_for_layout }}\n    </main>\n\n    <footer>\n        <p>&copy; {{ 'now' | date: "%Y" }} {{ shop.name }}</p>\n    </footer>\n</body>\n</html>`,
            'templates/index.liquid': `<h2>Welcome</h2>\n<p>This is the home page of your new Crafter theme.</p>`,
            'assets/theme.css': `body {\n    font-family: sans-serif;\n    margin: 0;\n    padding: 0;\n}\nheader, footer {\n    background-color: #f4f4f4;\n    padding: 20px;\n    text-align: center;\n}\nmain {\n    padding: 20px;\n    min-height: 50vh;\n}\n`,
            'config/settings_schema.json': `[]`
        };

        for (const [filePath, content] of Object.entries(filesToCreate)) {
            const fullPath = path.join(projectDir, filePath);
            await fs.ensureDir(path.dirname(fullPath));
            if (!fs.existsSync(fullPath)) {
                await fs.writeFile(fullPath, content);
            }
        }
    }
}
