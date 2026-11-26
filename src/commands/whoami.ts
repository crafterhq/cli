import { Command } from '@oclif/core';
import { ApiService } from '../services/api.service';
import { AuthGuard } from '../utils/auth.guard';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

export default class WhoAmI extends Command {
    static description = 'Show the logged-in user';

    async run() {
        await AuthGuard.check();

        const spinner = ora('Fetching user info...').start();

        try {
            const api = await ApiService.getInstance();
            const response = await api.get('/users/me');
            const user = response.data;

            spinner.stop();
            
            const table = new Table({
                head: [chalk.cyan('Field'), chalk.cyan('Value')],
                chars: {
                    'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
                    'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
                    'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
                    'right': '║', 'right-mid': '╢', 'middle': '│'
                }
            });

            table.push(
                { 'Ad Soyad': `${user.name} ${user.surname}` },
                { 'Username': user.username },
                { 'E-Posta': user.email },
                { 'User ID': user.id }
            );

            this.log('\n' + chalk.green.bold('✓ Logged in!') + '\n');
            this.log(table.toString());
            this.log(); // Empty line
        } catch (error: any) {
            spinner.fail(chalk.red('Could not fetch user info.'));
            this.error(error.response?.data?.message || error.message);
        }
    }
}
