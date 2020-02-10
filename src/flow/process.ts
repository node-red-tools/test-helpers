import axios from 'axios';
import { spawn } from 'child_process';
import { Writable } from 'stream';
import { Termination } from '../common/termination';
import { Probe, perform } from '../probes/probe';

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
            'node_modules/node-red/red.js',
            '-p',
            `${port}`,
            '--userDir',
            userDir,
            '--settings',
            settings,
            path,
        ];

        const proc = spawn('node', args, {
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

        const probe: Probe = readinessProbe || {
            initialDelaySeconds: 2,
            failureThreshold: 5,
            fn: async (ports: number[]) => {
                await axios.get(`http://127.0.0.1:${ports[0]}`);
            },
        };

        perform(probe, [port])
            .then(() => resolve(termination))
            .catch(reject);
    });
}
