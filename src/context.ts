import { Termination, terminate } from './common/termination';
import { HelperError } from './docker';

export type ContextValues = { [key: string]: any };

export class Context {
    private readonly __terminables: Termination[];
    private readonly __values: Readonly<ContextValues>;
    private __isClosed: boolean;

    constructor(terminables: Termination[] = [], values: ContextValues = {}) {
        this.__terminables = terminables;
        this.__values = Object.freeze(values);
        this.__isClosed = false;
    }

    public values(): Readonly<ContextValues> {
        return this.__values;
    }

    public async destroy(): Promise<void> {
        if (this.__isClosed) {
            return Promise.reject(new HelperError('Context is already closed'));
        }

        this.__isClosed = true;

        return terminate(...this.__terminables);
    }
}
