import { Termination } from './common/termination';
import * as docker_ from './docker';
import { Container, startAll, stopAll } from './docker/container';
import { Flow, start } from './flow/process';

export const docker = docker_;

export interface Options {
    containers?: Container[];
    flow: Flow;
}

export interface Context {
    containers?: Termination[];
    flow: Termination;
}

export async function setup(opts: Options): Promise<Context> {
    let containers: Termination[] | undefined = undefined;

    if (opts.containers && opts.containers.length) {
        containers = await startAll(opts.containers);
    }

    const flow = await start(opts.flow);

    return {
        containers,
        flow,
    };
}

export async function teardown(ctx: Context): Promise<void> {
    if (!ctx) {
        return Promise.reject(new Error('Missed context.'));
    }

    if (ctx.containers && ctx.containers.length) {
        await stopAll(ctx.containers);
    }

    ctx.flow();
}
