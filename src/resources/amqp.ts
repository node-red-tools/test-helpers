import amqp, { Connection, Options } from 'amqplib';
import { Factory, Resource } from './resource';

export interface Options extends Options.Connect {}

export function create(opts: string | Options = 'amqp://127.0.0.1'): Factory {
    return async function initializeAMQP(): Promise<Resource<Connection>> {
        const conn = await amqp.connect(opts);

        return [conn, () => conn.close()];
    };
}
