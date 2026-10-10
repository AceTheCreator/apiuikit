import type { AsyncAPIDocumentData } from "../types/schema";

/**
 * A minimal AsyncAPI document with a WebSocket server, for the Try it
 * stories: the WebSocket Try it button renders nothing for an operation
 * without a `ws`/`wss` server, and the bundled examples are all Kafka.
 */
export const wsEchoDocument = {
  asyncapi: "3.0.0",
  info: {
    title: "Echo",
    version: "1.0.0",
    description: "A public WebSocket echo server: whatever you send comes straight back.",
  },
  servers: {
    echo: {
      host: "ws.postman-echo.com",
      pathname: "/raw",
      protocol: "wss",
      description: "Postman's public echo server.",
    },
  },
  channels: {
    echo: {
      address: "/raw",
      messages: {
        greeting: { $ref: "#/components/messages/greeting" },
      },
    },
  },
  operations: {
    sendGreeting: {
      action: "send",
      channel: { $ref: "#/channels/echo" },
      summary: "Send a greeting to the echo server.",
      messages: [{ $ref: "#/channels/echo/messages/greeting" }],
    },
    receiveGreeting: {
      action: "receive",
      channel: { $ref: "#/channels/echo" },
      summary: "Receive the greeting back.",
      messages: [{ $ref: "#/channels/echo/messages/greeting" }],
    },
  },
  components: {
    messages: {
      greeting: {
        name: "greeting",
        title: "Greeting",
        contentType: "application/json",
        payload: {
          type: "object",
          properties: {
            text: { type: "string", examples: ["hello"] },
          },
        },
      },
    },
  },
} as unknown as AsyncAPIDocumentData;
