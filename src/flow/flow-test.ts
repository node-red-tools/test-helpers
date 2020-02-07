import { Channel, Connection, ConsumeMessage } from "amqplib";
import { expect } from 'chai';

interface CreateMessageOut {
    consumerPromise: Promise<void>;
    messageCallback: (msg: ConsumeMessage | null) => any;
}

function createReceiveMessageCallback(
    expectedOutput: any,
    outQueue: string,
    shouldReceive: boolean
): CreateMessageOut {
    const res: any = {
        resolve: undefined,
        reject: undefined
    };

    const consumerPromise = new Promise<void>((resolve, reject) => {
        res.resolve = resolve;
        res.reject = reject;
    });

    const timeout = setTimeout(async () => {
        if (shouldReceive) {
            res.reject(new Error(`Queue ${outQueue} didn't receive a message before the timeout`));
        } else {
            res.resolve();
        }
    }, 10000);

    return {
        consumerPromise,
        messageCallback: (msg: ConsumeMessage | null) => {
            if (msg === null) {
                clearTimeout(timeout);
                res.reject(new Error(`Output of queue ${outQueue} is null`));

                return;
            }
            if (!shouldReceive) {
                clearTimeout(timeout);
                res.reject(new Error(`Queue ${outQueue} received a message when it shouldn't have`));

                return;
            }

            const out = JSON.parse(msg.content.toString()).payload;

            if (expect(out).to.deep.equal(expectedOutput)) {
                clearTimeout(timeout);
                res.resolve();
            } else {
                clearTimeout(timeout);
                res.reject(new Error(`Output of queue ${outQueue} does not match expected output`));
            }
        }
    }
}

export interface Input {
    exchange: string;
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
    const consumers: Promise<void>[] = [];
    const consumerTags: string[] = [];

    const outChannels = await Promise.all(out.queues.map(async (outQueue: string): Promise<Channel> => {
        const outChan = await conn.createChannel();

        const res = createReceiveMessageCallback(out.expectedOutput, outQueue, out.expectedQueue === outQueue);
        const consumerTag = (await outChan.consume(outQueue, res.messageCallback)).consumerTag;
        consumerTags.push(consumerTag);
        consumers.push(res.consumerPromise);

        return outChan;
    }));

    await inputChan.publish(input.exchange, input.routingKey, Buffer.from(JSON.stringify(input)));

    await Promise.all(consumers);

    await inputChan.close();
    await Promise.all(outChannels.map(async (outChan: Channel, idx: number) => {
        await outChan.cancel(consumerTags[idx]);
        await outChan.close();
    }));
}