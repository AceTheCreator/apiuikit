import { describe, expect, it } from "vitest";
import { generateAsyncCodeSample, getAvailableAsyncCodeSampleTargets } from "../asyncCodeSample";

const wsDocument = {
  servers: { production: { host: "chat.example.com", protocol: "ws", pathname: "/" } },
  channels: {
    messages: {
      address: "/rooms/{roomId}",
      parameters: { roomId: { default: "general" } },
      messages: {
        chatMessage: {
          payload: { type: "object" },
          examples: [{ name: "ex1", payload: { text: "hello world" } }],
        },
      },
      bindings: {
        ws: { query: { properties: { token: { default: "abc123" } } } },
      },
    },
  },
  operations: {
    sendMessage: {
      action: "send",
      channel: { $ref: "#/channels/messages" },
      messages: [{ $ref: "#/channels/messages/messages/chatMessage" }],
    },
  },
};

const kafkaDocument = {
  servers: { production: { host: "broker.example.com", protocol: "kafka" } },
  channels: {
    events: {
      address: "events.topic",
      messages: { event: { payload: { type: "object" }, examples: [{ payload: { id: 1 } }] } },
      bindings: { kafka: { topic: "events.topic" } },
    },
  },
  operations: {
    publishEvent: { action: "send", channel: { $ref: "#/channels/events" } },
  },
};

describe("getAvailableAsyncCodeSampleTargets", () => {
  it("lists the javascript and python targets with their clients for a ws-bound operation, excluding kafkajs", () => {
    const targets = getAvailableAsyncCodeSampleTargets(wsDocument, "sendMessage");
    const byKey = Object.fromEntries(targets.map((t) => [t.key, t]));

    expect(byKey.javascript.clients.map((c) => c.key)).toEqual(expect.arrayContaining(["ws", "websocket"]));
    expect(byKey.javascript.clients.map((c) => c.key)).not.toContain("kafkajs");
    expect(byKey.python.clients.map((c) => c.key)).toEqual(expect.arrayContaining(["websockets"]));
  });

  it("lists only each target's kafka client for a kafka-bound operation, excluding every ws-only client", () => {
    const targets = getAvailableAsyncCodeSampleTargets(kafkaDocument, "publishEvent");
    const byKey = Object.fromEntries(targets.map((t) => [t.key, t]));

    expect(byKey.javascript.clients.map((c) => c.key)).toEqual(["kafkajs"]);
    expect(byKey.python.clients.map((c) => c.key)).toEqual(["confluent-kafka"]);
    expect(byKey.rust.clients.map((c) => c.key)).toEqual(["rdkafka"]);
    expect(byKey.go.clients.map((c) => c.key)).toEqual(["kafka-go"]);
  });
});

describe("generateAsyncCodeSample", () => {
  it("generates a Node.js ws snippet for a ws-bound operation with an explicit example", () => {
    const snippet = generateAsyncCodeSample(wsDocument, "sendMessage", "javascript", "ws");
    expect(snippet).toContain("WebSocket");
    expect(snippet).toContain("hello world");
  });

  it("generates a browser WebSocket snippet for the same operation", () => {
    const snippet = generateAsyncCodeSample(wsDocument, "sendMessage", "javascript", "websocket");
    expect(snippet).toContain("hello world");
  });

  it("generates a Python websockets snippet for the same operation", () => {
    const snippet = generateAsyncCodeSample(wsDocument, "sendMessage", "python", "websockets");
    expect(snippet).toContain("websockets");
    expect(snippet).toContain("hello world");
  });

  it("returns null for an unknown operation id", () => {
    expect(generateAsyncCodeSample(wsDocument, "doesNotExist", "javascript", "ws")).toBeNull();
  });

  it("returns null for a non-WebSocket-bound operation (outside asyncsnippet's scope)", () => {
    expect(generateAsyncCodeSample(kafkaDocument, "publishEvent", "javascript", "ws")).toBeNull();
  });
});
