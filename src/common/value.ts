import { HelperError } from './error';
import { Termination } from './termination';

export type Value = [any, Termination];

export type Factory = () => Promise<Value>;

export type Factories = { [key: string]: Factory };

export type Values = { [key: string]: Value };

export async function create(factories: Factories = {}): Promise<Values> {
    const keys = Object.keys(factories);
    const len = keys.length;
    const errors: Error[] = [];
    const result: Values = {};

    for (let i = 0; i < len; i += 1) {
        try {
            const key = keys[i];
            const value = await factories[key]();

            result[key] = value;
        } catch (e) {
            errors.push(e);
        }
    }

    if (errors.length) {
        const keys = Object.keys(result);
        const len = keys.length;

        for (let i = 0; i < len; i += 1) {
            try {
                const key = keys[i];
                const termination = result[key][1];
                await termination();
            } catch (e) {
                errors.push(e);
            }
        }

        return Promise.reject(
            new HelperError(`Failed to create global state`, ...errors),
        );
    }

    return result;
}
