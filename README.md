# test-helpers

Collection of test helper functions for Node-Red flows

![npm (scoped)](https://img.shields.io/npm/v/@node-red-tools/test-helpers)
![Node.js CI](https://github.com/node-red-tools/test-helpers/workflows/Node.js%20CI/badge.svg)

## Usage

```typescript
import { setup, teardown } from '@node-red-tools/test-helpers';
import path from 'path';

before(async function() {
    this.context = await setup({
        flow: {
            userDir: process.cwd(),
        },
        containers: [
            {
                image: 'redis',
                name: 'test-redis',
                ports: [
                    {
                        host: 6379,
                        container: 6379,
                    },
                ],
            },
            {
                image: 'rabbitmq',
                name: 'test-rabbitmq',
                ports: [
                    {
                        host: 5672,
                        container: 5672,
                    },
                ],
            },
        ],
    });
});

after(async function() {
    await teardown(this.context);
});
```

### Using readiness probes

```typescript
import { setup, teardown, probes } from '@node-red-tools/test-helpers';
import axios from 'axios';
import path from 'path';

before(() => {
    this.context = setup({
        flow: {
            path: path.resolve('../', __dirname),
            readinessProbe: {
                failureThreshold: 3,
                fn: probes.http({
                    method: 'GET',
                    path: '/my-endpoint',
                }),
            },
        },
        containers: [
            {
                image: 'redis',
                name: 'test-redis',
                ports: [
                    {
                        host: 6379,
                        container: 6379,
                    },
                ],
            },
            {
                image: 'rabbitmq',
                name: 'test-rabbitmq',
                ports: [
                    {
                        host: 5672,
                        container: 5672,
                    },
                ],
            },
        ],
    });
});

after(() => {
    teardown(this.context);
});
```

## API

### Docker

#### Start

```typescript
import { docker } from '@node-red-tools/test-helpers';

await docker.start({
    name: 'my_nginx',
    image: 'nginx',
    ports: [
        {
            container: 80,
            host: 8888,
        },
    ],
    stdout: process.stdout,
    stderr: process.stderr,
});
```

#### Start all

```typescript
import { docker } from '@node-red-tools/test-helpers';

await docker.startAll([
    {
        name: 'my_nginx_1',
        image: 'nginx',
        ports: [
            {
                container: 80,
                host: 8888,
            },
        ],
        stdout: process.stdout,
        stderr: process.stderr,
    },
    {
        name: 'my_nginx_2',
        image: 'nginx',
        ports: [
            {
                container: 80,
                host: 8889,
            },
        ],
        stdout: process.stdout,
        stderr: process.stderr,
    },
]);
```

#### Stop

```typescript
import { docker } from '@node-red-tools/test-helpers';

const terminate = await docker.start({
    name: 'my_nginx',
    image: 'nginx',
    ports: [
        {
            container: 80,
            host: 8888,
        },
    ],
    stdout: process.stdout,
    stderr: process.stderr,
});

await terminate();
```

or

```typescript
import { docker } from '@node-red-tools/test-helpers';

await docker.start({
    name: 'my_nginx',
    image: 'nginx',
    ports: [
        {
            container: 80,
            host: 8888,
        },
    ],
    stdout: process.stdout,
    stderr: process.stderr,
});

const id = await docker.findID('my_nginx');

await docker.stop(id);
```

#### Stop all

```typescript
import { docker } from '@node-red-tools/test-helpers';

const terminateAll = await docker.startAll([
    {
        name: 'my_nginx_1',
        image: 'nginx',
        ports: [
            {
                container: 80,
                host: 8888,
            },
        ],
        stdout: process.stdout,
        stderr: process.stderr,
    },
    {
        name: 'my_nginx_2',
        image: 'nginx',
        ports: [
            {
                container: 80,
                host: 8889,
            },
        ],
        stdout: process.stdout,
        stderr: process.stderr,
    },
]);

docker.stopAll(terminateAll);
```

or

```typescript
import { docker } from '@node-red-tools/test-helpers';

await docker.startAll([
    {
        name: 'my_nginx_1',
        image: 'nginx',
        ports: [
            {
                container: 80,
                host: 8888,
            },
        ],
        stdout: process.stdout,
        stderr: process.stderr,
    },
    {
        name: 'my_nginx_2',
        image: 'nginx',
        ports: [
            {
                container: 80,
                host: 8889,
            },
        ],
        stdout: process.stdout,
        stderr: process.stderr,
    },
]);

const ids = await Promise.all([
    docker.findID('my_nginx_1'),
    docker.findID('my_nginx_2'),
]);

await docker.stopAll(ids);
```

### Flow

#### Start

```typescript
import { flow } from '@node-red-tools/test-helpers';

await flow.start({
    userDir: process.cwd()
});
```


#### Stop

```typescript
import { flow } from '@node-red-tools/test-helpers';

const termination = await flow.start({
    userDir: process.cwd()
});

await termination();

```
