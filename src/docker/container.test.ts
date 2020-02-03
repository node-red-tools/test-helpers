import axios from 'axios';
import { expect } from 'chai';
import { Container, findID, start, stop } from './container';

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
});
