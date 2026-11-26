import { Command } from '@oclif/core';
import { ConfigService } from '../../services/config.service';
import chalk from 'chalk';

export default class ConfigReset extends Command {
    static description = 'Reset all configuration (including the API and Storefront URLs) to the defaults';

    async run() {
        await ConfigService.resetConfig();
        this.log(chalk.green('✓ All settings were reset to the defaults.'));
    }
}
