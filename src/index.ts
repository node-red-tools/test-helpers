import { Connection, connect } from 'amqplib';
import { HelperError } from './common/error';
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
    connectUrl: string;
}

export interface Context {
    containers: Termination[];
    terminateFlow: Termination;
    connection: Connection;
}

export async function setup(opts: Options): Promise<Context> {
    let containers: Termination[] = [];

    if (opts.containers && opts.containers.length) {
        containers = await dkr.container.startAll(opts.containers);
    }

    const terminateFlow = await flw.start(opts.flow);

    const connection = await connect(opts.connectUrl);

    return {
        containers,
        terminateFlow,
        connection
    };
}

export async function teardown(ctx: Context): Promise<void> {
    if (!ctx) {
        return Promise.reject(new Error('Missed context.'));
    }

    const errors: Error[] = [];

    try {
        await ctx.terminateFlow();
    } catch (e) {
        errors.push(e);
    } finally {
        if (ctx.containers && ctx.containers.length) {
            try {
                await dkr.container.stopAll(ctx.containers);
            } catch (e2) {
                errors.push(e2);
            }
        }
    }

    if (errors.length) {
        return Promise.reject(
            new HelperError('Failed to tear down', ...errors),
        );
    }
}

export async function test(
    ctx: Context,
    input: flw.Input,
    output: flw.Output,
): Promise<void> {
    await flw.testFlow(ctx.connection, input, output);
}
