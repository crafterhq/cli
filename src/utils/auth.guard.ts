import { ConfigService } from '../services/config.service';
import chalk from 'chalk';

export class AuthGuard {
    static async check(): Promise<void> {
        const config = await ConfigService.getConfig();
        if (!config.accessToken) {
            console.error(chalk.red('\nYou must be logged in to use this command.'));
            console.error(chalk.yellow('Please run "npx @crafter-cms/cli login".'));
            process.exit(1);
        }
    }
}
