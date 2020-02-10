import { Termination, terminate } from './common/termination';
import { Context } from './context';
import * as dkr from './docker';
import * as flw from './flow';
import * as prb from './probes';
import * as rsc from './resources';

export const docker = dkr;
export const flow = flw;
export const probes = prb.builtin;
export const resources = rsc.builtin;
export const makeGlobal = rsc.makeGlobal;

export interface Options {
    containers?: dkr.Container[];
    flow: flw.Flow;
    resources?: rsc.Factories;
}

export async function setup(opts: Options): Promise<Context> {
    const terminables: Termination[] = [];

    if (opts.containers && opts.containers.length) {
        const terminations = await dkr.container.startAll(opts.containers);

        terminations.forEach(i => terminables.push(i));
    }

    try {
        const termination = await flw.start(opts.flow);

        terminables.push(termination);
    } catch (e) {
        await terminate(...terminables);

        throw e;
    }

    const values: rsc.InitializedResources = {};

    if (opts.resources) {
        try {
            const valuePairs = await rsc.init(opts.resources);

            Object.keys(valuePairs).forEach(key => {
                const [value, termination] = valuePairs[key];

                values[key] = value;
                terminables.push(termination);
            });
        } catch (e) {
            await terminate(...terminables);

            throw e;
        }
    }

    return new Context(terminables.reverse(), values);
}

export async function teardown(ctx: Context): Promise<void> {
    if (!ctx) {
        return Promise.reject(new Error('Missed context.'));
    }

    return ctx.destroy();
}

export async function test(
    ctx: Context,
    input: flw.Input,
    output: flw.Output,
): Promise<void> {
    await flw.testFlow(ctx.resources.rabbitmq, input, output);
}
