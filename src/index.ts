import { Termination } from './common/termination';
import * as dkr from './docker';
import * as flw from './flow';
import * as prb from './probes';

export const docker = dkr;
export const flow = flw;
export const probes = prb;

export interface Options {
    containers?: dkr.Container[];
    flow: flw.Flow;
}
export interface Context {
    containers: Termination[];
    flow: Termination;
}

export async function setup(opts: Options): Promise<Context> {
    let containers: Termination[] = [];

    if (opts.containers && opts.containers.length) {
        containers = await dkr.container.startAll(opts.containers);
    }

    const flow = await flw.start(opts.flow);

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
        await dkr.container.stopAll(ctx.containers);
    }

    ctx.flow();
}
