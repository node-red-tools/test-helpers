import { Channel, Connection, ConsumeMessage, Options, MessageProperties } from "amqplib";
import axios from 'axios';
import { assert, expect } from 'chai';

export enum IOType {
    AMQP,
    HTTP
}

export interface Input {
    type: IOType;
    payload: any;
}

export interface AmqpInput extends Input {
    exchange: string;
    routingKey: string;
    options?: Options.Publish;
}

export interface HttpInput extends Input {
    url: string;
}

export interface Output {
    type: IOType;
    expectedOutput: any;
}

export interface AmqpOutput extends Output {
    type: IOType;
    queues: string[];
    expectedQueue: string;
    expectedProperties: MessageProperties;
}

interface CreateMessageOut {
    consumerPromise: Promise<void>;
    messageCallback: (msg: ConsumeMessage | null) => any;
}

/**
 * Returns a callback to be passed to channel.consume() and a promise that
 * resolves or rejects when the callback processes a received message or the
 * timeout is reached. Resolves when a message is received only when the message
 * is expected to be received and the object equality assertion passes.
 */
function createReceiveMessageCallback(
    expectedOutput: any,
    outQueue: string,
    shouldReceive: boolean,
    expectedProperties?: MessageProperties,
): CreateMessageOut {
    const res: any = {
        resolve: undefined,
        reject: undefined
    };

    const consumerPromise = new Promise<void>((resolve, reject) => {
        res.resolve = resolve;
        res.reject = reject;
    });

    let timeoutReached = false;
    const timeout = setTimeout(() => {
        timeoutReached = true;
        if (shouldReceive) {
            res.reject(new Error(`Queue ${outQueue} didn't receive a message before the timeout`));
        } else {
            res.resolve();
        }
    }, 4000);

    return {
        consumerPromise,
        messageCallback: (msg: ConsumeMessage | null) => {
            clearTimeout(timeout);

            try {
                if (msg === null) {
                    throw new Error(`Output of queue ${outQueue} is null`);
                }

                if (!shouldReceive) {
                    throw new Error(`Queue ${outQueue} received a message when it shouldn't have`);
                }

                const out = JSON.parse(msg.content.toString());

                expect(out).to.deep.equal(expectedOutput, `Output of queue ${outQueue} does not match expected output`);
                if (expectedProperties) {
                    Object.keys(expectedProperties).forEach(key => {
                        expect((msg.properties as any)[key]).to.deep.equal(
                            (expectedProperties as any)[key],
                            `Output property ${key} of queue ${outQueue} does not match expected property`
                        );
                    })
                }

                if (timeoutReached) {
                    throw new Error(`Queue ${outQueue} received a message after the timeout was reached`);
                }
                res.resolve();
            } catch (e) {
                res.reject(e);
            }
        }
    }
}

/**
 * Test a flow by sending messages and making sure output matches what was expected.
 * Flow input can be sent to an AMQP or HTTP server (likewise for expected flow output).
 * If flow output is put on a queue it will make sure no other passed in queues received messages.
 * A connection to an AMQP server must be passed in.
 */
export async function testFlow(
    conn: Connection,
    input: Input,
    out: Output,
): Promise<void> {
    const consumers: Promise<void>[] = [];
    let inputChan: Channel | undefined;
    let outChannels: Channel[] = [];
    const consumerTags: string[] = [];

    try {
        if (out.type === IOType.AMQP) {
            outChannels = await Promise.all(
            (out as AmqpOutput).queues.map(async (outQueue: string): Promise<Channel> => {
                const outChan = await conn.createChannel();
                // Clear any messages leftover from previous tests
                await outChan.purgeQueue(outQueue);

                const res = createReceiveMessageCallback(
                    out.expectedOutput,
                    outQueue,
                    (out as AmqpOutput).expectedQueue === outQueue,
                    (out as AmqpOutput).expectedProperties
                );
                const consumerTag = (await outChan.consume(outQueue, res.messageCallback)).consumerTag;
                consumerTags.push(consumerTag);
                consumers.push(res.consumerPromise);

                return outChan;
            }));
        } else if (out.type === IOType.HTTP) {
            // TODO
            assert.fail("Http output tests not implemented");
        } else {
            assert.fail("Unknown flow test output type");
        }

        if (input.type === IOType.AMQP) {
            inputChan = await conn.createChannel();
            await inputChan.publish(
                (input as AmqpInput).exchange,
                (input as AmqpInput).routingKey,
                Buffer.from(JSON.stringify(input.payload)),
                (input as AmqpInput).options,
            );
        } else if (input.type === IOType.HTTP) {
            await axios.get((input as HttpInput).url);
        } else {
            assert.fail("Unknown flow test input type");
        }

        await Promise.all(consumers);
    } finally {
        if (inputChan) {
            await inputChan.close();
        }

        if (outChannels) {
            await Promise.all(outChannels.map(async (outChan: Channel, idx: number) => {
                await outChan.cancel(consumerTags[idx]);
                await outChan.close();
            }));
        }
    }
}