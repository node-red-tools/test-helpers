import axios from 'axios';
import { expect } from 'chai';
import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { sleep } from './common/sleep';
import { docker, resources, setup, teardown } from './index';
import { makeGlobal } from './resources';

class MockValue {
    private __isClosed: boolean;

    constructor() {
        this.__isClosed = false;
    }

    public get isClosed(): boolean {
        return this.__isClosed;
    }

    public async close(): Promise<void> {
        if (this.__isClosed) {
            return Promise.reject(new Error('Value is closed'));
        }

        this.__isClosed = true;

        await sleep(1000);
    }
}

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

        expect(ctx.destroy).to.be.a('function');

        let err: Error | undefined;

        try {
            await axios.get(`http://127.0.0.1:1880/`);
        } catch (e) {
            err = e;
        }

        const redisID = await docker.container.findID('test-redis');
        const rabbitmqID = await docker.container.findID('test-rabbitmq');


        await ctx.destroy();
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
        expect(ctx.destroy).to.be.a('function');

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

    it('should use resources', async () => {
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
            resources: {
                test: async () => {
                    await sleep(1000);

                    const value = new MockValue();

                    return [value, () => value.close()];
                },
            },
        });

        expect(ctx).to.be.a('object');
        expect(ctx.resources.test).to.be.an.instanceOf(MockValue);

        await ctx.destroy();

        fs.unlinkSync(settingsFile);
    });

    it('should set resource to the global scope', async () => {
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
            resources: {
                foobar: async () => {
                    await sleep(1000);

                    const value = new MockValue();

                    return [value, () => value.close()];
                },
            },
        });

        expect(ctx).to.be.a('object');
        expect(ctx.resources.foobar).to.be.an.instanceOf(MockValue);

        makeGlobal(ctx.resources);

        expect((global as any).foobar).to.be.an.instanceOf(MockValue);

        await ctx.destroy();

        fs.unlinkSync(settingsFile);
    });

    it('should use built in resources', async () => {
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
            ],
            resources: {
                redis: resources.redis(),
            },
        });

        expect(ctx).to.be.a('object');

        let error: Error | undefined;

        try {
            await new Promise((resolve, reject) => {
                ctx.resources.redis.ping((err?: Error) =>
                    err ? reject(err) : resolve(),
                );
            });
        } catch (e) {
            error = e;
        } finally {
            await ctx.destroy();

            fs.unlinkSync(settingsFile);
        }

        expect(error).to.be.undefined;
    });
});
