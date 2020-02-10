import * as amqp from './amqp';
import * as http from './http';

export * from './probe';

export const builtin = {
    http,
    amqp,
};
