import * as amqp from './amqp';
import * as redis from './redis';
import { InitializedResources } from './resource';
export * from './resource';

export const builtin = {
    amqp: amqp.create,
    redis: redis.create,
};

export function makeGlobal(resources: InitializedResources = {}): void {
    Object.keys(resources).forEach((key: string) => {
        const resource = resources[key];

        Object.defineProperty(global, key, {
            value: resource,
            writable: false
        });
    })
}