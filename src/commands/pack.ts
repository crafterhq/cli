import { Command } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs-extra';
import { createZipArchive, addThemeFiles } from '../utils/zip';
import { collectThemeFiles, formatSkippedFiles } from '../utils/ignore';

export default class Pack extends Command {
    static description = 'Packs the theme into a .zip file for distribution or sale.';

    async run() {
        const projectDir = process.cwd();
        const zipFileName = 'theme.zip';
        const zipFilePath = path.join(projectDir, zipFileName);

        const spinner = ora('Creating the theme package...').start();

        try {
            // Delete existing zip if any
            if (fs.existsSync(zipFilePath)) {
                await fs.remove(zipFilePath);
            }

            const { files, skipped } = await collectThemeFiles(projectDir, { includeLocalOnly: true });
            if (skipped.length > 0) {
                spinner.stop();
                this.log(chalk.yellow(`${skipped.length} file(s) left out of the package:`));
                formatSkippedFiles(skipped).forEach((l) => this.log(chalk.yellow(l)));
                spinner.start();
            }

            const output = fs.createWriteStream(zipFilePath);
            const archive = createZipArchive({
                zlib: { level: 9 } // Sets the compression level.
            });

            return new Promise<void>((resolve, reject) => {
                output.on('close', () => {
                    spinner.succeed(chalk.green(`Done! Theme package created: ${zipFileName} (${archive.pointer()} bytes)`));
                    resolve();
                });

                archive.on('warning', (err: any) => {
                    if (err.code === 'ENOENT') {
                        spinner.warn(chalk.yellow(err.message));
                    } else {
                        reject(err);
                    }
                });

                archive.on('error', (err: any) => {
                    reject(err);
                });

                archive.pipe(output);

                // same shared ignore list as dev/push and the watcher; crafter-manifest.json is included in the package
                addThemeFiles(archive, projectDir, files);

                archive.finalize();
            });

        } catch (error: any) {
            spinner.fail(chalk.red('Packaging failed.'));
            this.error(error.message);
        }
    }
}
