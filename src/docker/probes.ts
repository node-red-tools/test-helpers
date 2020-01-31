import h from 'http';
import { PortBinding, Probe } from './container';

export interface HttpOptions {
    path: string;
    method?:
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'DELETE'
        | 'HEAD'
        | 'OPTIONS'
        | 'CONNECT'
        | 'TRACE'
        | 'PATCH';
    protocol?: 'http:' | 'https:';
}

function httpReq(opts: HttpOptions, port: PortBinding): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const req = h.request(
            {
                method: opts.method || 'GET',
                protocol: opts.protocol || 'http:',
                href: 'localhost',
                port: port.host,
                pathname: opts.path,
            },
            res => {
                res.on('data', () => resolve());
            },
        );

        req.on('error', reject);

        req.end();
    });
}

export function http(opts: HttpOptions): Probe {
    return async (ports: PortBinding[]) => {
        await Promise.all(ports.map(httpReq.bind(null, opts)));
    };
}
