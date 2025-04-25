# Classy

> A class-based TypeScript DSL for authoring k6 tests

## Features

- Write k6 tests using TypeScript classes and decorators
- Generate standalone `.ts` scripts ready for `k6 run`
- Supports setup, teardown, scenarios, and options
- Support multiple tests in a single file
- Lightweight, fast, zero dependencies for generated tests

## Installation

```bash
npm install --save-dev classy-k6
```

## Usage

Create a new file, e.g., `test.ts`, and write your tests like this:
```typescript
import http from "k6/http";
import { check, sleep } from "k6";
import { type k6Test, type k6TestOptions, scenario } from "classy-k6";

const BASE_URL = "https://test.k6.io";

export class FirstExample implements k6Test {
  options: k6TestOptions = {
    cloud: { projectID: "my-project" },
    thresholds: { http_req_duration: ["p(95)<200"] }
  };

  setup() {
    console.log("Setting up resources...");
    return { id: 123 };
  }

  @scenario({ vus: 2, duration: "10s" })
  homepage() {
    console.log(`Visiting homepage: ${BASE_URL}`);
    const res = http.get(`${BASE_URL}/`);
    check(res, { "status is 200": (r) => r.status === 200 });
    sleep(1);
  }

  @scenario({ vus: 1, duration: "15s" })
  logSetupData(data: { id: number }) {
    console.log(`The ID is: ${data.id}`);
    sleep(1);
  }

  teardown() {
    console.log("Cleaning up with data:");
  }
}
```

Then, generate the k6 test script by running:
```bash
npx classy-k6 test.ts
```

This will create a `FirstExample.generated.ts` that you can run with k6:
```bash
k6 run FirstExample.generated.ts
```

For a more complex example, check out the [example repository](https://github.com/dgzlopes/classy-example).