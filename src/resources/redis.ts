import redis, { ClientOpts } from 'redis';
import { Termination } from '../common/termination';
import { Factory, Resource } from './resource';

export interface Options extends ClientOpts {}

export function create(opts?: Options): Factory {
    return async function createRedis(): Promise<Resource> {
        const client = redis.createClient(opts);

        await new Promise((resolve, reject) => {
            client.ping(err => (err ? reject(err) : resolve()));
        });

        const terminate: Termination = () => {
            return new Promise((resolve, reject) => {
                client.quit(err => (err ? reject(err) : resolve()));
            });
        };

        return [client, terminate];
    };
}
