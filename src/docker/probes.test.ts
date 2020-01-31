import { expect } from 'chai';
import { Container, findID, start, stop } from './container';
import { http } from './probes';

describe('Containe readines probes', () => {
    describe('HTTP probe', () => {
        it('should resolve a promise if a probe succeeded', async () => {
            const c: Container = {
                name: `${Date.now()}_busybox`,
                image: "nginx",
                ports: [
                    {
                        container: 80,
                        host: 8888
                    }
                ],
                readinessProbe: http({
                    method: 'GET',
                    path: '/',
                }),
                stdout: process.stdout,
                stderr: process.stderr
            }

            const id = await start(c);

            expect(id).to.not.empty;

            const foundID = await findID(c.name as string);

            await stop(id);

            expect(foundID).to.eql(id);
        })
    })
})