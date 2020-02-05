import { HelperError } from '../common/error';
import { Termination } from '../common/termination';

export type Resource<T = any> = [T, Termination];

export type Factory<T = any> = () => Promise<Resource<T>>;

export type Factories = { [key: string]: Factory };

export type Resources = { [key: string]: Resource };

export type InitializedResources = { [key: string]: any };

export async function init(factories: Factories = {}): Promise<Resources> {
    const keys = Object.keys(factories);
    const len = keys.length;
    const errors: Error[] = [];
    const resources: Resources = {};

    for (let i = 0; i < len; i += 1) {
        try {
            const key = keys[i];
            const value = await factories[key]();

            resources[key] = value;
        } catch (e) {
            errors.push(e);
        }
    }

    if (errors.length) {
        const keys = Object.keys(resources);
        const len = keys.length;

        for (let i = 0; i < len; i += 1) {
            try {
                const key = keys[i];
                const termination = resources[key][1];
                await termination();
            } catch (e) {
                errors.push(e);
            }
        }

        return Promise.reject(
            new HelperError(`Failed to create global state`, ...errors),
        );
    }

    return resources;
}
