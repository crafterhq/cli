import { Command } from '@oclif/core';
import { ConfigService } from '../../services/config.service';
import chalk from 'chalk';
import Table from 'cli-table3';

export default class ConfigList extends Command {
    static description = 'List the current configuration';

    async run() {
        const config = await ConfigService.getConfig();

        const table = new Table({
            head: [chalk.blue('Setting'), chalk.blue('Value')],
        });

        table.push(
            ['apiUrl', config.apiUrl || 'https://api.crafter.net.tr'],
            ['storefrontUrl', config.storefrontUrl || 'https://origin.crafter.web.tr'],
            ['userId', config.userId || 'Not logged in'],
            ['accessToken', config.accessToken ? `${config.accessToken.substring(0, 10)}...` : 'None'],
            ['refreshToken', config.refreshToken ? '********' : 'None']
        );

        this.log(table.toString());
    }
}
