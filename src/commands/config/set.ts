import { Command, Args } from '@oclif/core';
import { ConfigService } from '../../services/config.service';
import chalk from 'chalk';

export default class ConfigSet extends Command {
    static description = 'Update a configuration setting';

    static args = {
        key: Args.string({ description: 'Setting key (e.g. apiUrl, storefrontUrl)', required: true }),
        value: Args.string({ description: 'Setting value', required: true }),
    };

    async run() {
        const { args } = await this.parse(ConfigSet);

        if (args.key === 'api-url' || args.key === 'apiUrl') {
            await ConfigService.setConfig({ apiUrl: args.value });
            this.log(chalk.green(`apiUrl updated: ${args.value}`));
        } else if (args.key === 'storefront-url' || args.key === 'storefrontUrl') {
            await ConfigService.setConfig({ storefrontUrl: args.value });
            this.log(chalk.green(`storefrontUrl updated: ${args.value}`));
        } else {
            this.error(chalk.red(`Unknown setting key: ${args.key}. Valid keys: apiUrl, storefrontUrl`));
        }
    }
}
