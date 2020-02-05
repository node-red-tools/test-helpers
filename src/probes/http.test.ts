import { expect } from 'chai';
import { Container, findID, start } from '../docker/container';
import { request } from './http';

describe('Container readiness probes', () => {
    describe('HTTP probe', () => {
        it('should resolve a promise if a probe succeeded', async () => {
            const c: Container = {
                name: `${Date.now()}${Math.random()}`,
                image: 'nginx',
                ports: [
                    {
                        container: 80,
                        host: 8888,
                    },
                ],
                readinessProbe: {
                    failureThreshold: 2,
                    fn: request({
                        method: 'GET',
                        path: '/',
                    }),
                },
                stdout: process.stdout,
                stderr: process.stderr,
            };

            const termination = await start(c);

            expect(termination).to.be.a('function');

            const foundID = await findID(c.name as string);

            await termination();

            expect(foundID).to.be.a('string');
        });
    });
});
