import axios, { Method } from 'axios';
import { ProbeFn } from './probe';

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

async function httpReq(opts: HttpOptions, port: number): Promise<void> {
    const protocol = opts.protocol || 'http:';
    const method = (opts.method || 'GET') as Method;
    await axios({
        method,
        url: `${protocol}//127.0.0.1:${port}`,
    });
}

export function request(opts: HttpOptions): ProbeFn {
    return async (ports: number[]) => {
        await Promise.all(ports.map(httpReq.bind(null, opts)));
    };
}
