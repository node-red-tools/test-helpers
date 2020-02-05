import { Termination, terminate } from './common/termination';
import { Factories, create } from './common/value';
import { Context, ContextValues } from './context';
import * as dkr from './docker';
import * as flw from './flow';
import * as prb from './probes';

export const docker = dkr;
export const flow = flw;
export const probes = prb;

export interface Options {
    containers?: dkr.Container[];
    flow: flw.Flow;
    values?: Factories;
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

    const values: ContextValues = {};

    if (opts.values) {
        try {
            const valuePairs = await create(opts.values);

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
