import { Channel, Connection, ConsumeMessage } from "amqplib";
import { expect } from 'chai';

interface MessageResult {
    complete: boolean;
    err?: string;
}

interface CreateMessageOut {
    consumerPromise: Promise<void>;
    messageCallback: (msg: ConsumeMessage | null) => any;
}

function createReceiveMessageCallback(
    expectedOutput: any,
    outQueue: string,
    shouldReceive: boolean
): CreateMessageOut {
    const res: MessageResult = {
        complete: false
    };

    const succeed = () => {
        res.complete = true;
    }

    const fail = (error: string) => {
        res.err = error;
        res.complete = true;
    }

    const timeout = setTimeout(async () => {
        clearTimeout(this);
        if (shouldReceive) {
            fail(`Queue ${outQueue} didn't receive a message before the timeout`);
        } else {
            succeed();
        }
    }, 10000);

    const consumerPromise = new Promise<void>((accept, reject) => {
        const interval = setInterval(async () => {
            if (res.complete) {
                clearTimeout(timeout);
                clearInterval(interval);

                if (res.err !== undefined) {
                    reject(new Error(res.err));
                } else {
                    accept();
                }
            }
        }, 200);
    });

    return {
        consumerPromise,
        messageCallback: (msg: ConsumeMessage | null) => {
            if (msg === null) {
                fail(`Output of queue ${outQueue} is null`);
            } else {
                if (!shouldReceive) {
                    fail(`Queue ${outQueue} received a message when it shouldn't have`);
                } else {
                    const out = JSON.parse(msg.content.toString()).payload;

                    if (expect(out).to.deep.equal(expectedOutput)) {
                        succeed();
                    } else {
                        fail(`Output of queue ${outQueue} does not match expected output`);
                    }
                }
            }
        }
    }
}

export interface Input {
    exchange: string;
    exchangeType: string;
    routingKey: string;
    payload: any;
}

export interface Output {
    queues: string[];
    expectedQueue: string;
    expectedOutput: any;
}

export async function testFlow(
    conn: Connection,
    input: Input,
    out: Output,
): Promise<void> {
    const inputChan = await conn.createChannel();
    await inputChan.assertExchange(input.exchange, input.exchangeType);
    const consumers: Promise<void>[] = [];

    const outChannels = await Promise.all(out.queues.map(async (outQueue: string): Promise<Channel> => {
        const outChan = await conn.createChannel();

        const res = createReceiveMessageCallback(out.expectedOutput, outQueue, out.expectedQueue === outQueue);
        outChan.consume(outQueue, res.messageCallback);
        consumers.push(res.consumerPromise);

        return outChan;
    }));

    await inputChan.publish(input.exchange, input.routingKey, Buffer.from(JSON.stringify(input)));

    await Promise.all(consumers);

    await inputChan.close();
    await Promise.all(outChannels.map(async (outChan: Channel) => {
        await outChan.close();
    }));
}