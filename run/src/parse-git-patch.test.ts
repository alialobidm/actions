import * as fs from "fs";
import * as path from "path";
import {
  Patch,
  PatchLine,
  parseGitPatches,
  parseGitPatch,
} from "./parse-git-patch";

const dataLocation = path.resolve(__dirname, "../example-patches");
const data: Record<string, string> = {};

fs.readdirSync(dataLocation).forEach((fileName) => {
  data[fileName] = fs.readFileSync(
    path.resolve(dataLocation, fileName),
    "utf-8",
  );
});

test("parses a multi-patch file", () => {
  const input = data["many-patches.patch"];
  const patches = parseGitPatches(input);

  expect(patches.length).toEqual(2);

  expect(rerender(patches[0])).toEqual(
    `
hash: a7696becf41fa2b5c9c93770e25a5cce6174d3b8
message: [PATCH] Fix path/resource/resourcePath in Lambda events, fixes #868
authorName: Daniel Nalborczyk
authorEmail: dnalborczyk@gmail.com
date: Sat, 11 Jan 2020 08:19:48 -0500
--
added: false
deleted: false
beforeName: src/events/http/HttpServer.js
afterName: src/events/http/HttpServer.js
--
| 473 | 473 |               request,
| 474 | 474 |               this.#serverless.service.provider.stage,
| 475 | 475 |               requestTemplate,
|     | 476 |+              _path,
| 476 | 477 |             ).create()
| 477 | 478 |           } catch (err) {
| 478 | 479 |             return this._reply500(
| 488 | 489 |         const lambdaProxyIntegrationEvent = new LambdaProxyIntegrationEvent(
| 489 | 490 |           request,
| 490 | 491 |           this.#serverless.service.provider.stage,
|     | 492 |+          _path,
| 491 | 493 |         )
| 492 | 494 | 
| 493 | 495 |         event = lambdaProxyIntegrationEvent.create()
added: false
deleted: false
beforeName: src/events/http/lambda-events/LambdaIntegrationEvent.js
afterName: src/events/http/lambda-events/LambdaIntegrationEvent.js
--
|   2 |   2 | import VelocityContext from './VelocityContext.js'
|   3 |   3 | 
|   4 |   4 | export default class LambdaIntegrationEvent {
|     |   5 |+  #path = null
|   5 |   6 |   #request = null
|   6 |   7 |   #requestTemplate = null
|   7 |   8 |   #stage = null
|   8 |   9 | 
|   9 |     |-  constructor(request, stage, requestTemplate) {
|     |  10 |+  constructor(request, stage, requestTemplate, path) {
|     |  11 |+    this.#path = path
|  10 |  12 |     this.#request = request
|  11 |  13 |     this.#requestTemplate = requestTemplate
|  12 |  14 |     this.#stage = stage
|  17 |  19 |       this.#request,
|  18 |  20 |       this.#stage,
|  19 |  21 |       this.#request.payload || {},
|     |  22 |+      this.#path,
|  20 |  23 |     ).getContext()
|  21 |  24 | 
|  22 |  25 |     const event = renderVelocityTemplateObject(
added: false
deleted: false
beforeName: src/events/http/lambda-events/LambdaProxyIntegrationEvent.js
afterName: src/events/http/lambda-events/LambdaProxyIntegrationEvent.js
--
|  16 |  16 | // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
|  17 |  17 | // http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html
|  18 |  18 | export default class LambdaProxyIntegrationEvent {
|     |  19 |+  #path = null
|  19 |  20 |   #request = null
|  20 |  21 |   #stage = null
|  21 |  22 | 
|  22 |     |-  constructor(request, stage) {
|     |  23 |+  constructor(request, stage, path) {
|     |  24 |+    this.#path = path
|  23 |  25 |     this.#request = request
|  24 |  26 |     this.#stage = stage
|  25 |  27 |   }
| 106 | 108 |     const {
| 107 | 109 |       info: { received, remoteAddress },
| 108 | 110 |       method,
| 109 |     |-      path,
| 110 | 111 |     } = this.#request
| 111 | 112 | 
| 112 | 113 |     const httpMethod = method.toUpperCase()
| 125 | 126 |       multiValueQueryStringParameters: parseMultiValueQueryStringParameters(
| 126 | 127 |         url,
| 127 | 128 |       ),
| 128 |     |-      path,
|     | 129 |+      path: this.#path,
| 129 | 130 |       pathParameters: nullIfEmpty(pathParams),
| 130 | 131 |       queryStringParameters: parseQueryStringParameters(url),
| 131 | 132 |       requestContext: {
| 170 | 171 |           userAgent: this.#request.headers['user-agent'] || '',
| 171 | 172 |           userArn: 'offlineContext_userArn',
| 172 | 173 |         },
| 173 |     |-        path: \`/\${this.#stage}\${this.#request.route.path}\`,
|     | 174 |+        path: this.#request.route.path,
| 174 | 175 |         protocol: 'HTTP/1.1',
| 175 | 176 |         requestId: createUniqueId(),
| 176 | 177 |         requestTime,
| 177 | 178 |         requestTimeEpoch,
| 178 | 179 |         resourceId: 'offlineContext_resourceId',
| 179 |     |-        resourcePath: this.#request.route.path,
|     | 180 |+        resourcePath: this.#path,
| 180 | 181 |         stage: this.#stage,
| 181 | 182 |       },
| 182 |     |-      resource: this.#request.route.path,
|     | 183 |+      resource: this.#path,
| 183 | 184 |       stageVariables: null,
| 184 | 185 |     }
| 185 | 186 |   }
added: false
deleted: false
beforeName: src/events/http/lambda-events/VelocityContext.js
afterName: src/events/http/lambda-events/VelocityContext.js
--
|  36 |  36 |   http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
|  37 |  37 | */
|  38 |  38 | export default class VelocityContext {
|     |  39 |+  #path = null
|  39 |  40 |   #payload = null
|  40 |  41 |   #request = null
|  41 |  42 |   #stage = null
|  42 |  43 | 
|  43 |     |-  constructor(request, stage, payload) {
|     |  44 |+  constructor(request, stage, payload, path) {
|     |  45 |+    this.#path = path
|  44 |  46 |     this.#payload = payload
|  45 |  47 |     this.#request = request
|  46 |  48 |     this.#stage = stage
| 106 | 108 |         },
| 107 | 109 |         requestId: createUniqueId(),
| 108 | 110 |         resourceId: 'offlineContext_resourceId',
| 109 |     |-        resourcePath: this.#request.route.path,
|     | 111 |+        resourcePath: this.#path,
| 110 | 112 |         stage: this.#stage,
| 111 | 113 |       },
| 112 | 114 |       input: {
`.trim(),
  );

  expect(rerender(patches[1])).toEqual(
    `
hash: 0f6f88c98fff3afa0289f46bf4eab469f45eebc6
message: [PATCH] JSON stringify string responses
authorName: Arnas Gecas
authorEmail: 13507001+arnas@users.noreply.github.com
date: Sat, 25 Jan 2020 19:21:35 +0200
--
added: false
deleted: false
beforeName: src/events/http/HttpServer.js
afterName: src/events/http/HttpServer.js
--
| 770 | 770 |           override: false,
| 771 | 771 |         })
| 772 | 772 | 
| 773 |     |-        if (result && typeof result.body !== 'undefined') {
|     | 773 |+        if (typeof result === 'string') {
|     | 774 |+          response.source = JSON.stringify(result)
|     | 775 |+        } else if (result && typeof result.body !== 'undefined') {
| 774 | 776 |           if (result.isBase64Encoded) {
| 775 | 777 |             response.encoding = 'binary'
| 776 | 778 |             response.source = Buffer.from(result.body, 'base64')
`.trim(),
  );
});

test("parses a one-file patch", () => {
  const patch = loadFixture("one-file");

  expect(rerender(patch, 3)).toEqual(
    `
hash: 0f6f88c98fff3afa0289f46bf4eab469f45eebc6
message: [PATCH] JSON stringify string responses
authorName: Arnas Gecas
authorEmail: 13507001+arnas@users.noreply.github.com
date: Sat, 25 Jan 2020 19:21:35 +0200
--
added: false
deleted: false
beforeName: src/events/http/HttpServer.js
afterName: src/events/http/HttpServer.js
--
| 770 | 770 |           override: false,
| 771 | 771 |         })
| 772 | 772 | 
| 773 |     |-        if (result && typeof result.body !== 'undefined') {
|     | 773 |+        if (typeof result === 'string') {
|     | 774 |+          response.source = JSON.stringify(result)
|     | 775 |+        } else if (result && typeof result.body !== 'undefined') {
| 774 | 776 |           if (result.isBase64Encoded) {
| 775 | 777 |             response.encoding = 'binary'
| 776 | 778 |             response.source = Buffer.from(result.body, 'base64')
  `.trim(),
  );
});

test("parses a diff without patch info", () => {
  const patch = loadFixture("one-file-diff");

  expect(rerender(patch, 3)).toEqual(
    `
hash: undefined
message: undefined
authorName: undefined
authorEmail: undefined
date: undefined
--
added: false
deleted: false
beforeName: src/events/http/HttpServer.js
afterName: src/events/http/HttpServer.js
--
| 770 | 770 |           override: false,
| 771 | 771 |         })
| 772 | 772 | 
| 773 |     |-        if (result && typeof result.body !== 'undefined') {
|     | 773 |+        if (typeof result === 'string') {
|     | 774 |+          response.source = JSON.stringify(result)
|     | 775 |+        } else if (result && typeof result.body !== 'undefined') {
| 774 | 776 |           if (result.isBase64Encoded) {
| 775 | 777 |             response.encoding = 'binary'
| 776 | 778 |             response.source = Buffer.from(result.body, 'base64')
  `.trim(),
  );
});

test("parses a multi-file diff only", () => {
  const patch = loadFixture("two-file-diff");

  expect(rerender(patch, 3)).toEqual(
    `
hash: undefined
message: undefined
authorName: undefined
authorEmail: undefined
date: undefined
--
added: false
deleted: false
beforeName: src/events/http/HttpServer.js
afterName: src/events/http/HttpServer.js
--
| 770 | 770 |           override: false,
| 771 | 771 |         })
| 772 | 772 | 
| 773 |     |-        if (result && typeof result.body !== 'undefined') {
|     | 773 |+        if (typeof result === 'string') {
|     | 774 |+          response.source = JSON.stringify(result)
|     | 775 |+        } else if (result && typeof result.body !== 'undefined') {
| 774 | 776 |           if (result.isBase64Encoded) {
| 775 | 777 |             response.encoding = 'binary'
| 776 | 778 |             response.source = Buffer.from(result.body, 'base64')
added: false
deleted: false
beforeName: hlint/.hlint.yaml
afterName: hlint/.hlint.yaml
--
|  24 |  24 | # for ad hoc ways to suppress hlint.
|  25 |  25 | 
|  26 |  26 | ---
|  27 |     |-
|  28 |  27 | # By default, everything is an error
|  29 |     |-- error: {name: ""}
|     |  28 |+- error: { name: "" }
|  30 |  29 | 
|  31 |  30 | # Some things we don't care about at all
|  32 |     |-- ignore: {name: "Use module export list"}
  `.trim(),
  );
});

test("parses a complex patch", () => {
  const patch = loadFixture("many-files");

  expect(rerender(patch, 3)).toEqual(
    `
hash: a7696becf41fa2b5c9c93770e25a5cce6174d3b8
message: [PATCH] Fix path/resource/resourcePath in Lambda events, fixes #868
authorName: Daniel Nalborczyk
authorEmail: dnalborczyk@gmail.com
date: Sat, 11 Jan 2020 08:19:48 -0500
--
added: false
deleted: false
beforeName: src/events/http/HttpServer.js
afterName: src/events/http/HttpServer.js
--
| 473 | 473 |               request,
| 474 | 474 |               this.#serverless.service.provider.stage,
| 475 | 475 |               requestTemplate,
|     | 476 |+              _path,
| 476 | 477 |             ).create()
| 477 | 478 |           } catch (err) {
| 478 | 479 |             return this._reply500(
| 488 | 489 |         const lambdaProxyIntegrationEvent = new LambdaProxyIntegrationEvent(
| 489 | 490 |           request,
| 490 | 491 |           this.#serverless.service.provider.stage,
|     | 492 |+          _path,
| 491 | 493 |         )
| 492 | 494 | 
| 493 | 495 |         event = lambdaProxyIntegrationEvent.create()
added: false
deleted: false
beforeName: src/events/http/lambda-events/LambdaIntegrationEvent.js
afterName: src/events/http/lambda-events/LambdaIntegrationEvent.js
--
|   2 |   2 | import VelocityContext from './VelocityContext.js'
|   3 |   3 | 
|   4 |   4 | export default class LambdaIntegrationEvent {
|     |   5 |+  #path = null
|   5 |   6 |   #request = null
|   6 |   7 |   #requestTemplate = null
|   7 |   8 |   #stage = null
|   8 |   9 | 
|   9 |     |-  constructor(request, stage, requestTemplate) {
|     |  10 |+  constructor(request, stage, requestTemplate, path) {
|     |  11 |+    this.#path = path
|  10 |  12 |     this.#request = request
|  11 |  13 |     this.#requestTemplate = requestTemplate
|  12 |  14 |     this.#stage = stage
|  17 |  19 |       this.#request,
|  18 |  20 |       this.#stage,
|  19 |  21 |       this.#request.payload || {},
|     |  22 |+      this.#path,
|  20 |  23 |     ).getContext()
|  21 |  24 | 
|  22 |  25 |     const event = renderVelocityTemplateObject(
added: false
deleted: false
beforeName: src/events/http/lambda-events/LambdaProxyIntegrationEvent.js
afterName: src/events/http/lambda-events/LambdaProxyIntegrationEvent.js
--
|  16 |  16 | // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
|  17 |  17 | // http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html
|  18 |  18 | export default class LambdaProxyIntegrationEvent {
|     |  19 |+  #path = null
|  19 |  20 |   #request = null
|  20 |  21 |   #stage = null
|  21 |  22 | 
|  22 |     |-  constructor(request, stage) {
|     |  23 |+  constructor(request, stage, path) {
|     |  24 |+    this.#path = path
|  23 |  25 |     this.#request = request
|  24 |  26 |     this.#stage = stage
|  25 |  27 |   }
| 106 | 108 |     const {
| 107 | 109 |       info: { received, remoteAddress },
| 108 | 110 |       method,
| 109 |     |-      path,
| 110 | 111 |     } = this.#request
| 111 | 112 | 
| 112 | 113 |     const httpMethod = method.toUpperCase()
| 125 | 126 |       multiValueQueryStringParameters: parseMultiValueQueryStringParameters(
| 126 | 127 |         url,
| 127 | 128 |       ),
| 128 |     |-      path,
|     | 129 |+      path: this.#path,
| 129 | 130 |       pathParameters: nullIfEmpty(pathParams),
| 130 | 131 |       queryStringParameters: parseQueryStringParameters(url),
| 131 | 132 |       requestContext: {
| 170 | 171 |           userAgent: this.#request.headers['user-agent'] || '',
| 171 | 172 |           userArn: 'offlineContext_userArn',
| 172 | 173 |         },
| 173 |     |-        path: \`/\${this.#stage}\${this.#request.route.path}\`,
|     | 174 |+        path: this.#request.route.path,
| 174 | 175 |         protocol: 'HTTP/1.1',
| 175 | 176 |         requestId: createUniqueId(),
| 176 | 177 |         requestTime,
| 177 | 178 |         requestTimeEpoch,
| 178 | 179 |         resourceId: 'offlineContext_resourceId',
| 179 |     |-        resourcePath: this.#request.route.path,
|     | 180 |+        resourcePath: this.#path,
| 180 | 181 |         stage: this.#stage,
| 181 | 182 |       },
| 182 |     |-      resource: this.#request.route.path,
|     | 183 |+      resource: this.#path,
| 183 | 184 |       stageVariables: null,
| 184 | 185 |     }
| 185 | 186 |   }
added: false
deleted: false
beforeName: src/events/http/lambda-events/VelocityContext.js
afterName: src/events/http/lambda-events/VelocityContext.js
--
|  36 |  36 |   http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
|  37 |  37 | */
|  38 |  38 | export default class VelocityContext {
|     |  39 |+  #path = null
|  39 |  40 |   #payload = null
|  40 |  41 |   #request = null
|  41 |  42 |   #stage = null
|  42 |  43 | 
|  43 |     |-  constructor(request, stage, payload) {
|     |  44 |+  constructor(request, stage, payload, path) {
|     |  45 |+    this.#path = path
|  44 |  46 |     this.#payload = payload
|  45 |  47 |     this.#request = request
|  46 |  48 |     this.#stage = stage
| 106 | 108 |         },
| 107 | 109 |         requestId: createUniqueId(),
| 108 | 110 |         resourceId: 'offlineContext_resourceId',
| 109 |     |-        resourcePath: this.#request.route.path,
|     | 111 |+        resourcePath: this.#path,
| 110 | 112 |         stage: this.#stage,
| 111 | 113 |       },
| 112 | 114 |       input: {
    `.trim(),
  );
});

test("parses a renaming patch", () => {
  const patch = loadFixture("rename-file");

  expect(rerender(patch)).toEqual(
    `
hash: 68ec4bbde5244929afee1b39e09dced6fad1a725
message: [PATCH] Rename README
authorName: =?UTF-8?q?David=20H=C3=A9rault?=
authorEmail: dherault@gmail.com
date: Mon, 27 Jan 2020 17:35:01 +0100
--
added: false
deleted: false
beforeName: README.md
afterName: README.mdx
--
    `.trim(),
  );
});

test("parses a add and delete patch", () => {
  const patch = loadFixture("add-and-delete-file");

  expect(rerender(patch, 1)).toEqual(
    `
hash: 74d652cd9cda9849591d1c414caae0af23b19c8d
message: [PATCH] Rename and edit README
authorName: =?UTF-8?q?David=20H=C3=A9rault?=
authorEmail: dherault@gmail.com
date: Mon, 27 Jan 2020 17:36:29 +0100
--
added: false
deleted: true
beforeName: README.md
afterName: README.md
--
| 1 |   |-# stars-in-motion
| 2 |   |-
| 3 |   |-A canvas full of stars
added: true
deleted: false
beforeName: README.mdx
afterName: README.mdx
--
|   | 1 |+# stars-in-motion
|   | 2 |+
|   | 3 |+A canvas full of stars.
`.trim(),
  );
});

test("parses a complex patch 2", () => {
  parseGitPatch(data["complex.patch"]);
});

test("pases a patch with hyphen deletes", () => {
  const patch = loadFixture("hlint-yaml");

  expect(rerender(patch, 2)).toEqual(
    `
hash: 89afcd42fb6f2602fbcd03d6e5573b1859347787
message: [PATCH 2/2] Restyled by prettier-yaml
authorName: "Restyled.io"
authorEmail: commits@restyled.io
date: Fri, 17 Jan 2025 18:09:56 +0000
--
added: false
deleted: false
beforeName: hlint/.hlint.yaml
afterName: hlint/.hlint.yaml
--
| 24 | 24 | # for ad hoc ways to suppress hlint.
| 25 | 25 | 
| 26 | 26 | ---
| 27 |    |-
| 28 | 27 | # By default, everything is an error
| 29 |    |-- error: {name: ""}
|    | 28 |+- error: { name: "" }
| 30 | 29 | 
| 31 | 30 | # Some things we don't care about at all
| 32 |    |-- ignore: {name: "Use module export list"}
`.trim(),
  );
});

function loadFixture(name: string): Patch {
  const parsed = parseGitPatch(data[`${name}.patch`]);

  if (!parsed) {
    throw new Error(`Fixture ${name} didn't parse as Patch`);
  }

  return parsed;
}

function rerender(patch: Patch, lineNumberWidth?: number): string {
  return [
    `hash: ${patch.hash}`,
    `message: ${patch.message}`,
    `authorName: ${patch.authorName}`,
    `authorEmail: ${patch.authorEmail}`,
    `date: ${patch.date}`,
    "--",
  ]
    .concat(
      patch.files.flatMap((file) => {
        return [
          `added: ${file.added}`,
          `deleted: ${file.deleted}`,
          `beforeName: ${file.beforeName}`,
          `afterName: ${file.afterName}`,
          "--",
        ].concat(
          file.modifiedLines.flatMap((line) => {
            return [`${renderLinePrefix(line, lineNumberWidth)}${line.line}`];
          }),
        );
      }),
    )
    .join("\n");
}

function renderLinePrefix(line: PatchLine, lineNumberWidth?: number): string {
  const lwidth = lineNumberWidth ? lineNumberWidth : 3;

  const padString = (x: string): string => {
    return String(x).padStart(lwidth, " ");
  };

  const padNumber = (x: number): string => {
    return padString(x.toString());
  };

  switch (line.tag) {
    case "added":
      return `| ${padString("")} | ${padNumber(line.addedLineNumber)} |+`;
    case "removed":
      return `| ${padNumber(line.removedLineNumber)} | ${padString("")} |-`;
    case "context":
      return `| ${padNumber(line.removedLineNumber)} | ${padNumber(line.addedLineNumber)} | `;
  }
}
