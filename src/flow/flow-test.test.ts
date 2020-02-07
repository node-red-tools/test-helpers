import { connect } from 'amqplib';
import { Termination, terminate } from '../common/termination';
import { Container, start } from '../docker/container';
import { resources } from '../index';
import * as rsc from '../resources';
import { testFlow } from './flow-test';

describe('Flow test', () => {
    it('should start', async () => {
        const c: Container =                 {
            image: 'stash.nov.com:5002/caps-int/rabbitmq:25-dev',
            name: 'test-rabbitmq',
            ports: [
                {
                    host: 5672,
                    container: 5672,
                },
                {
                    host: 15672,
                    container: 15672,
                },
            ],
            readinessProbe: {
                failureThreshold: 2,
                timeoutSeconds: 20,
                fn: async () => {
                    await connect("amqp://dev:dev@localhost:5672");
                },
            },
            stdout: process.stdout,
            stderr: process.stderr,
        };

        const terminables: Termination[] = [];

        try {
            terminables.push(await start(c));

            const amqpRsc = resources.amqp("amqp://localhost:5672");
            const valuePairs = await rsc.init({
                rabbitmq: amqpRsc,
            });

            const [connection, terminateAmqp] = valuePairs.amqp;
            terminables.push(terminateAmqp);

            await testFlow(connection, {
                exchange: "flow.ex",
                exchangeType: "direct",
                routingKey: "transform.in",
                payload: {
                    "data": {
                        "propA": -0.05,
                        "obj": {
                            "propB": "test",
                        }
                    },
                    "test": [
                        false,
                        true
                    ],
                }
            }, {
                queues: ["transform.in", "dead.letter"],
                expectedQueue: "transform.in",
                expectedOutput: {
                    "data": {
                        "propA": -0.05,
                        "obj": {
                            "propB": "test",
                        }
                    },
                    "test": [
                        false,
                        true
                    ],
                }
            });
        } catch (e) {
            throw e;
        } finally {
            await terminate(...terminables);
        }
    });
});
