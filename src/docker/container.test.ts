import axios from 'axios';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Container, findID, start, startAll, stop, stopAll } from './container';

use(chaiAsPromised);

describe('Container API', () => {
    it('should start a container', async () => {
        const c: Container = {
            name: `${Date.now()}_busybox`,
            image: 'nginx',
            ports: [
                {
                    container: 80,
                    host: 8888,
                },
            ],
            stdout: process.stdout,
            stderr: process.stderr,
        };

        const termination = await start(c);

        expect(termination).to.be.a('function');

        await axios(`http://localhost:${c.ports[0].host}`);

        await termination();
    });

    it('should stop a container', async () => {
        const c: Container = {
            name: `${Date.now()}_busybox`,
            image: 'nginx',
            ports: [
                {
                    container: 80,
                    host: 8888,
                },
            ],
            stdout: process.stdout,
            stderr: process.stderr,
        };

        const termination = await start(c);

        expect(termination).to.be.a('function');

        await termination();

        let err: Error | undefined = undefined;

        try {
            await axios(`http://localhost:${c.ports[0].host}`);
        } catch (e) {
            err = e;
        } finally {
            expect(err).to.not.undefined;
        }
    });

    it('should return a container ID', async () => {
        const c: Container = {
            name: `${Date.now()}_busybox`,
            image: 'nginx',
            ports: [
                {
                    container: 80,
                    host: 8888,
                },
            ],
            stdout: process.stdout,
            stderr: process.stderr,
        };

        await start(c);

        const foundID = await findID(c.name as string);

        expect(foundID).to.be.a('string');

        await stop(foundID);
    });

    it('should start all containers', async () => {
        const c: Container[] = [
            {
                name: `${Date.now()}${Math.random()}`,
                image: 'nginx',
                ports: [
                    {
                        container: 80,
                        host: 8888,
                    },
                ],
                stdout: process.stdout,
                stderr: process.stderr,
            },
            {
                name: `${Date.now()}${Math.random()}`,
                image: 'nginx',
                ports: [
                    {
                        container: 80,
                        host: 8889,
                    },
                ],
                stdout: process.stdout,
                stderr: process.stderr,
            },
        ];

        const t = await startAll(c);

        await axios(`http://localhost:${c[0].ports[0].host}`);
        await axios(`http://localhost:${c[1].ports[0].host}`);

        await Promise.all(t.map(i => i()));
    });

    it('should stop all containers', async () => {
        const c: Container[] = [
            {
                name: `${Date.now()}${Math.random()}`,
                image: 'nginx',
                ports: [
                    {
                        container: 80,
                        host: 8888,
                    },
                ],
                stdout: process.stdout,
                stderr: process.stderr,
            },
            {
                name: `${Date.now()}${Math.random()}`,
                image: 'nginx',
                ports: [
                    {
                        container: 80,
                        host: 8889,
                    },
                ],
                stdout: process.stdout,
                stderr: process.stderr,
            },
        ];

        const t = await startAll(c);

        await axios(`http://localhost:${c[0].ports[0].host}`);
        await axios(`http://localhost:${c[1].ports[0].host}`);

        await stopAll(t);

        expect(axios(`http://localhost:${c[0].ports[0].host}`)).to.eventually
            .rejected;
        expect(axios(`http://localhost:${c[1].ports[0].host}`)).to.eventually
            .rejected;
    });

    it('should stop a container when a readiness probe failed', async () => {
        const name = `${Date.now()}${Math.random()}`;
        try {
            await start({
                name,
                image: 'nginx',
                ports: [
                    {
                        container: 80,
                        host: 8888,
                    },
                ],
                readinessProbe: {
                    initialDelaySeconds: 1,
                    fn: () => {
                        return Promise.reject(new Error('Test error'));
                    }
                }
            });
        } catch (e) {
            const foundID = await findID(name);

            expect(foundID).to.be.empty;
        }
    });
});
