import { Connection, connect } from 'amqplib';
import { Termination } from './common/termination';
import * as dkr from './docker';
import * as flw from './flow';

export const docker = dkr;
export const flow = flw;

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

    if (ctx.containers && ctx.containers.length) {
        await dkr.container.stopAll(ctx.containers);
    }

    ctx.terminateFlow();
}

export async function test(
    ctx: Context,
    input: flw.Input,
    output: flw.Output,
): Promise<void> {
    await flw.testFlow(ctx.connection, input, output);
}
