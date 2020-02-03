import { spawn } from 'child_process';
import { Writable } from 'stream';
import { Termination } from '../common/termination';

export type Probe = (data: string) => boolean;

export interface Flow {
    path?: string;
    userDir?: string;
    port?: number;
    env?: { [key: string]: string };
    settings?: string;
    readinessProbe?: Probe;
    stderr?: Writable;
    stdout?: Writable;
}

export async function start(f: Flow = {}): Promise<Termination> {
    return new Promise<Termination>((resolve, reject) => {
        const {
            path = 'flows.json',
            port = 1880,
            userDir = '.',
            env = {},
            settings = 'settings.js',
            stderr,
            stdout,
            readinessProbe,
        } = f;
        const args = [
            'node-red',
            '-p',
            `${port}`,
            '--userDir',
            userDir,
            '--settings',
            settings,
            path,
        ];

        const proc = spawn(`npx`, args, {
            env: {
                ...process.env,
                ...env,
            },
        });

        proc.on('error', reject);

        if (stderr) {
            proc.stderr.pipe(stderr);
        }

        if (stdout) {
            proc.stdout.pipe(stdout);
        }

        const termination: Termination = () => {
            return new Promise((resolve, reject) => {
                try {
                    proc.kill();
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        };
        const probeWrapper = (chunk: any) => {
            const str = String(chunk);
            let done = false;

            if (str.indexOf('Error') > -1) {
                reject(new Error(str));
                termination();
                done = true;
            } else if (readinessProbe && readinessProbe(str)) {
                resolve(termination);
                done = true;
            } else if (str.indexOf('Server now running') > -1) {
                resolve(termination);
                done = true;
            }

            if (done) {
                proc.stdout.off('data', probeWrapper);
            }
        };

        proc.stdout.on('data', probeWrapper);
    });
}
