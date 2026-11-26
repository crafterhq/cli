import { Command } from '@oclif/core';
import { ApiService } from '../services/api.service';
import { ConfigService } from '../services/config.service';
import chalk from 'chalk';
import ora from 'ora';
import * as http from 'http';
import open from 'open';
import { URL } from 'url';

export default class Login extends Command {
    static description = 'Log in through the browser';

    async run() {
        const spinner = ora('Waiting for login...').start();

        // 1. Create a local server to listen for callback
        const server = http.createServer();

        return new Promise<void>((resolve, reject) => {
            server.listen(0, '127.0.0.1', async () => {
                const address = server.address() as any;
                const port = address.port;

                try {
                    const api = await ApiService.getInstance();

                    // 2. Get login URL from backend
                    const response = await api.get(`/auth/cli?port=${port}`);
                    
                    const apiUrl = await ConfigService.getApiUrl();
                    let fallbackUrl = `https://crafter.net.tr/auth/cli?port=${port}`;
                    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
                        fallbackUrl = `http://localhost:3000/auth/cli?port=${port}`;
                    }
                    
                    const loginUrl = response.data?.authUrl || fallbackUrl;

                    spinner.info(`Please log in through the browser.`);

                    // 3. Open browser
                    await open(loginUrl);
                    spinner.start('Waiting for a response from the browser...');
                } catch (error: any) {
                    server.close();
                    spinner.fail(chalk.red('Could not start the login.'));
                    reject(error);
                }
            });

            server.on('request', async (req, res) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', '*');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                const url = new URL(req.url || '', `http://${req.headers.host}`);

                if (url.pathname === '/callback') {
                    const accessToken = url.searchParams.get('accessToken');
                    const refreshToken = url.searchParams.get('refreshToken');
                    let userId = url.searchParams.get('userId');

                    if (accessToken && refreshToken) {
                        // Save the tokens first so ApiService can use them through the interceptor
                        await ConfigService.setConfig({
                            accessToken,
                            refreshToken,
                            userId: userId || undefined
                        });

                        try {
                            const api = await ApiService.getInstance();
                            const userResponse = await api.get('/users/me');
                            const user = userResponse.data;
                            
                            // Update the user ID
                            await ConfigService.setConfig({
                                accessToken,
                                refreshToken,
                                userId: user.id
                            });

                            spinner.succeed(chalk.green(`Logged in! Welcome, ${user.name} ${user.surname}`));
                        } catch (e) {
                            spinner.succeed(chalk.green('Logged in!'));
                        }

                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end('<h1>Login successful!</h1><p>You can return to the CLI now.</p><script>setTimeout(() => window.close(), 3000)</script>');

                        server.close();
                        resolve();
                    } else {
                        res.writeHead(400);
                        res.end('Login failed: could not get tokens.');
                        spinner.fail(chalk.red('Login failed: could not get tokens.'));
                        server.close();
                        reject(new Error('Tokens not found in callback'));
                    }
                }
            });

            server.on('error', (err) => {
                spinner.fail(chalk.red('Server error!'));
                reject(err);
            });
        });
    }
}
