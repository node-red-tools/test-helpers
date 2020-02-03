import { exec, spawn } from 'child_process';
import { Writable } from 'stream';
import { Termination } from '../common/termination';
import { DockerError } from './error';

export type Probe = (ports: PortBinding[]) => Promise<void>;

export interface PortBinding {
    name?: string;
    host: number;
    container: number;
}

export interface Container {
    image: string;
    name?: string;
    ports: PortBinding[];
    readinessProbe?: Probe;
    stderr?: Writable;
    stdout?: Writable;
}

function generateName(): string {
    return `${Date.now()}${Math.random()}`.replace('.', '');
}

// Finds container's ID
export async function findID(name: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec(`docker ps -f name=^/${name}$ -q`, (err, stdout, stderr) => {
            if (err) {
                return reject(
                    new DockerError('Failed to find a container ID.', err),
                );
            }

            if (stderr) {
                return reject(new DockerError(stderr));
            }

            return resolve(stdout.replace('\n', ''));
        });
    });
}

export async function start(c: Container): Promise<Termination> {
    if (!c) {
        throw new Error('Missed container configuration');
    }

    if (!c.image) {
        throw new Error('Missed container image');
    }

    if (!c.ports || !c.ports) {
        throw new Error('Missed container port bindings');
    }

    const name = c.name || generateName();

    if (c.name) {
        const foundId = await findID(c.name);

        if (foundId) {
            return () => stop(foundId);
        }
    }

    await new Promise((resolve, reject) => {
        const args = ['run', '-d', '--name', name];

        c.ports.forEach(b => {
            args.push('-p');
            args.push(`${b.host}:${b.container}`);
        });

        args.push(c.image);

        const stream = spawn(`docker`, args);

        stream.on('exit', code => {
            if (code !== 0) {
                reject(
                    new DockerError(
                        `Failed to start a container. Process exited with code: ${code}.`,
                    ),
                );

                return;
            }

            if (c.readinessProbe) {
                return c
                    .readinessProbe(c.ports)
                    .then(resolve)
                    .catch(reject);
            }

            return resolve();
        });

        if (c.stderr) {
            stream.stderr.pipe(c.stderr);
        }

        if (c.stdout) {
            stream.stdout.pipe(c.stdout);
        }
    });

    const id = await findID(name);

    return () => stop(id);
}

export async function stop(id: string): Promise<void> {
    if (!id) {
        throw new Error('Missed container id');
    }

    return new Promise((resolve, reject) => {
        exec(`docker rm ${id} -f`, (err, _, stderr) => {
            if (err) {
                return reject(
                    new DockerError('Failed to stop a container.', err),
                );
            }

            if (stderr) {
                return reject(new DockerError(stderr));
            }

            return resolve();
        });
    });
}

export async function stopAll(
    ids: string[] | Termination[] = [],
): Promise<void> {
    const errors: Error[] = [];
    const len = ids.length;

    for (let i = 0; i < len; i += 1) {
        try {
            const idOrFn = ids[i];

            if (typeof idOrFn === 'function') {
                await idOrFn();
            } else {
                await stop(idOrFn);
            }
        } catch (e) {
            errors.push(e);
        }
    }

    if (errors.length > 0) {
        throw new DockerError('Failed to stop all containers.', ...errors);
    }
}

export async function startAll(
    configs: Container[] = [],
): Promise<Termination[]> {
    const launched: Termination[] = [];
    const errors: Error[] = [];
    const len = configs.length;

    try {
        for (let i = 0; i < len; i += 1) {
            const id = await start(configs[i]);
            launched.push(id);
        }
    } catch (e) {
        errors.push(e);

        try {
            // do cleanup
            await stopAll(launched);
        } catch (e2) {
            errors.push(e2);
        }
    }

    if (errors.length) {
        throw new DockerError('Failed to start all containers.', ...errors);
    }

    return launched;
}
