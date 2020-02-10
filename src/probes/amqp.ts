import { Options, create } from '../resources/amqp';
import { ProbeFn } from './probe';

export interface AmqpProbeOptions extends Options {}

export function connect(opts?: AmqpProbeOptions): ProbeFn {
    return async (_: number[]) => {
        const factory = create(opts);
        const pair = await factory();

        await pair[1]();
    };
}
