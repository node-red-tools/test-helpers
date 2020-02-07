import { Connection, connect } from 'amqplib';
import { Termination, terminate } from '../common/termination';
import { Container, start } from '../docker/container';
import { resources } from '../index';
import { Resource, init } from '../resources';
import { testFlow } from './flow-test';

describe('Flow test', () => {
    it('should start', async () => {
        const c: Container =                 {
            image: 'rabbitmq:3.8.2-management',
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
                failureThreshold: 5,
                timeoutSeconds: 60,
                periodSeconds: 30,
                fn: async () => {
                    try {
                        await connect("amqp://localhost:5672");
                    } catch(err) {
                        console.log(err);
                        throw err;
                    }
                },
            },
            stdout: process.stdout,
            stderr: process.stderr,
        };

        const terminables: Termination[] = [];

        try {
            terminables.push(await start(c));

            const amqpRsc = resources.amqp("amqp://localhost:5672");
            const valuePairs = await init({
                rabbitmq: amqpRsc,
            });
            const [connection, terminateAmqp] = valuePairs.rabbitmq as Resource<Connection>;
            terminables.push(terminateAmqp);

            const setupChan = await connection.createChannel();
            await setupChan.assertExchange("test.ex", "direct");
            await setupChan.assertQueue("test.queue.1");
            await setupChan.assertQueue("test.queue.2");
            await setupChan.bindQueue("test.queue.1", "test.ex", "queue.1.key");
            await setupChan.bindQueue("test.queue.2", "test.ex", "queue.2.key");
            await setupChan.close();

            await testFlow(connection, {
                exchange: "test.ex",
                routingKey: "queue.1.key",
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
                queues: ["test.queue.1", "test.queue.2"],
                expectedQueue: "test.queue.1",
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
