count-embeddings uğursuz oldu: Error: 8 RESOURCE_EXHAUSTED: Quota exceeded.
    at callErrorFromStatus (/home/runner/work/axtarish/axtarish/node_modules/@grpc/grpc-js/src/call.ts:84:17)
    at Object.onReceiveStatus (/home/runner/work/axtarish/axtarish/node_modules/@grpc/grpc-js/src/client.ts:612:51)
    at Object.onReceiveStatus (/home/runner/work/axtarish/axtarish/node_modules/@grpc/grpc-js/src/client-interceptors.ts:424:48)
    at <anonymous> (/home/runner/work/axtarish/axtarish/node_modules/@grpc/grpc-js/src/resolving-call.ts:184:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:84:11)
for call at
    at ServiceClientImpl.makeServerStreamRequest (/home/runner/work/axtarish/axtarish/node_modules/@grpc/grpc-js/src/client.ts:595:42)
    at ServiceClientImpl.<anonymous> (/home/runner/work/axtarish/axtarish/node_modules/@grpc/grpc-js/src/make-client.ts:189:15)
    at <anonymous> (/home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore-api/src/v1/firestore_client.ts:358:25)
    at /home/runner/work/axtarish/axtarish/node_modules/google-gax/build/src/streamingCalls/streamingApiCaller.js:39:28
    at /home/runner/work/axtarish/axtarish/node_modules/google-gax/build/src/normalCalls/timeout.js:44:16
    at Object.request (/home/runner/work/axtarish/axtarish/node_modules/google-gax/build/src/streamingCalls/streaming.js:248:40)
    at makeRequest (/home/runner/work/axtarish/axtarish/node_modules/retry-request/index.js:159:28)
    at retryRequest (/home/runner/work/axtarish/axtarish/node_modules/retry-request/index.js:119:5)
    at StreamProxy.setStream (/home/runner/work/axtarish/axtarish/node_modules/google-gax/build/src/streamingCalls/streaming.js:239:37)
    at StreamingApiCaller.call (/home/runner/work/axtarish/axtarish/node_modules/google-gax/build/src/streamingCalls/streamingApiCaller.js:55:16)
Caused by: Error
    at QueryUtil._getResponse (/home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore/build/src/reference/query-util.js:47:31)
    at Query._getResponse (/home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore/build/src/reference/query.js:905:32)
    at Query._get (/home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore/build/src/reference/query.js:898:35)
    at /home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore/build/src/reference/query.js:866:43
    at /home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore/build/src/telemetry/enabled-trace-util.js:125:30
    at NoopContextManager.with (/home/runner/work/axtarish/axtarish/node_modules/@opentelemetry/api/src/context/NoopContextManager.ts:20:15)
    at ContextAPI.with (/home/runner/work/axtarish/axtarish/node_modules/@opentelemetry/api/src/api/context.ts:68:42)
    at NoopTracer.startActiveSpan (/home/runner/work/axtarish/axtarish/node_modules/@opentelemetry/api/src/trace/NoopTracer.ts:87:27)
    at ProxyTracer.startActiveSpan (/home/runner/work/axtarish/axtarish/node_modules/@opentelemetry/api/src/trace/ProxyTracer.ts:51:20)
    at EnabledTraceUtil.startActiveSpan (/home/runner/work/axtarish/axtarish/node_modules/@google-cloud/firestore/build/src/telemetry/enabled-trace-util.js:117:28) {
  code: 8,
  details: 'Quota exceeded.',
  metadata: Metadata {
    internalRepr: Map(1) { 'x-debug-tracking-id' => [Array] },
    opaqueData: Map(0) {},
    options: {}
  }
}
