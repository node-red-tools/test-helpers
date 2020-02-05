import { HelperError } from './error';

export type Termination = () => Promise<void>;

export async function terminate(...terminables: Termination[]): Promise<void> {
    const len = terminables.length;
    const errors: Error[] = [];

    for (let i = 0; i < len; i += 1) {
        try {
            await terminables[i]();
        } catch (e) {
            errors.push(e);
        }
    }

    if (errors.length) {
        return Promise.reject(
            new HelperError(`Failed to terminate resources`, ...errors),
        );
    }
}
