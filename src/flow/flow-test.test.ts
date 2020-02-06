import { Connection, connect } from 'amqplib';
import { Termination } from '../common/termination';
import { Container, start } from '../docker/container';
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

        let termination: Termination | undefined = undefined;
        let connection: Connection | undefined = undefined;
        try {
            termination = await start(c);
            connection = await connect("amqp://dev:dev@localhost:5672");

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
            if (connection) {
                await connection.close();
            }
            if (termination) {
                await termination();
            }
        }
    });
});
