import { exec, spawn } from 'child_process';
import { Writable } from 'stream';
import { HelperError } from '../common/error';
import { Termination } from '../common/termination';
import { Probe, perform } from '../probes/probe';

export interface PortBinding {
    name?: string;
    host: number;
    container: number;
}

export interface Container {
    image: string;
    name?: string;
    ports: PortBinding[];
    env?: { [key: string]: string };
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
                    new HelperError('Failed to find a container ID.', err),
                );
            }

            if (stderr) {
                return reject(new HelperError(stderr));
            }

            return resolve(stdout.replace('\n', ''));
        });
    });
}

export async function start(c: Container): Promise<Termination> {
    if (!c) {
        throw new HelperError('Missed container configuration');
    }

    if (!c.image) {
        throw new HelperError('Missed container image');
    }

    if (!c.ports || !c.ports) {
        throw new HelperError('Missed container port bindings');
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

        const env = c.env || {};
        Object.keys(env).forEach(key => {
            const value = env[key];

            args.push('-e');
            args.push(`${key}=${value}`);
        });

        args.push(c.image);

        const stream = spawn(`docker`, args);

        stream.on('exit', code => {
            if (code !== 0) {
                reject(
                    new HelperError(
                        `Failed to start a container. Process exited with code: ${code}.`,
                    ),
                );

                return;
            }

            if (c.readinessProbe) {
                const ports = c.ports.map(i => i.host);

                return perform(c.readinessProbe, ports)
                    .then(resolve)
                    .catch(reason => {
                        return findID(name)
                            .then((id: string) => {
                                // not started
                                if (!id) {
                                    return Promise.reject(reason);
                                }

                                // it's started, but probe failed. need to stop
                                return stop(id);
                            }).then(() => reject(reason));
                    })
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
        throw new HelperError('Missed container id');
    }

    return new Promise((resolve, reject) => {
        exec(`docker rm ${id} -f`, (err, _, stderr) => {
            if (err) {
                return reject(
                    new HelperError('Failed to stop a container.', err),
                );
            }

            if (stderr) {
                return reject(new HelperError(stderr));
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
        throw new HelperError('Failed to stop all containers.', ...errors);
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
        throw new HelperError('Failed to start all containers.', ...errors);
    }

    return launched;
}
