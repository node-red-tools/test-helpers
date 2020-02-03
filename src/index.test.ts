import axios from 'axios';
import { expect } from 'chai';
import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { docker, setup, teardown } from './index';

describe('setup', () => {
    it('should start containers and a flow', async () => {
        const baseDir = tmpdir();
        const settingsFile = path.join(baseDir, 'settings.js');

        fs.writeFileSync(
            settingsFile,
            `
            module.exports = {};
        `,
        );

        const ctx = await setup({
            flow: {
                userDir: baseDir,
                settings: settingsFile,
                stdout: process.stdout,
                stderr: process.stderr,
            },
            containers: [
                {
                    image: 'redis',
                    name: 'test-redis',
                    ports: [
                        {
                            host: 6379,
                            container: 6379,
                        },
                    ],
                    stdout: process.stdout,
                    stderr: process.stderr,
                },
                {
                    image: 'rabbitmq',
                    name: 'test-rabbitmq',
                    ports: [
                        {
                            host: 5672,
                            container: 5672,
                        },
                    ],
                    stdout: process.stdout,
                    stderr: process.stderr,
                },
            ],
        });

        expect(ctx).to.exist;
        expect(ctx.flow).to.be.a('function');
        expect(ctx.containers).to.be.an('array');

        let err: Error | undefined;

        try {
            await axios.get(`http://127.0.0.1:1880/`);
        } catch (e) {
            err = e;
        }

        const redisID = await docker.container.findID('test-redis');
        const rabbitmqID = await docker.container.findID('test-rabbitmq');

        await ctx.flow();
        await Promise.all(ctx.containers.map(i => i()));
        fs.unlinkSync(settingsFile);

        expect(err).to.be.undefined;
        expect(redisID).to.not.be.undefined;
        expect(rabbitmqID).to.not.be.undefined;
    });

    it('should tear down', async () => {
        const baseDir = tmpdir();
        const settingsFile = path.join(baseDir, 'settings.js');

        fs.writeFileSync(
            settingsFile,
            `
            module.exports = {};
        `,
        );

        const ctx = await setup({
            flow: {
                userDir: baseDir,
                settings: settingsFile,
                stdout: process.stdout,
                stderr: process.stderr,
            },
            containers: [
                {
                    image: 'redis',
                    name: 'test-redis',
                    ports: [
                        {
                            host: 6379,
                            container: 6379,
                        },
                    ],
                    stdout: process.stdout,
                    stderr: process.stderr,
                },
                {
                    image: 'rabbitmq',
                    name: 'test-rabbitmq',
                    ports: [
                        {
                            host: 5672,
                            container: 5672,
                        },
                    ],
                    stdout: process.stdout,
                    stderr: process.stderr,
                },
            ],
        });

        expect(ctx).to.exist;
        expect(ctx.flow).to.be.a('function');
        expect(ctx.containers).to.be.an('array');

        await teardown(ctx);

        fs.unlinkSync(settingsFile);

        let err: Error | undefined;

        try {
            await axios.get(`http://localhost:1880`);
        } catch (e) {
            err = e;
        }

        const redisID = await docker.container.findID('test-redis');
        const rabbitmqID = await docker.container.findID('test-rabbitmq');

        expect(err).to.not.be.undefined;
        expect(redisID).to.be.empty;
        expect(rabbitmqID).to.be.empty;
    });
});