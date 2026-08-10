import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AsyncCodeSample } from "../AsyncCodeSample";
import { DocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";
import type { AsyncAPIDocumentData } from "../../types/schema";
import * as asyncCodeSampleHelpers from "../../helpers/asyncCodeSample";

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
      bindings: { ws: {} },
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

const mqttDocument = {
  servers: { production: { host: "broker.example.com", protocol: "mqtt" } },
  channels: {
    events: {
      address: "events/topic",
      messages: { event: { payload: { type: "object" }, examples: [{ payload: { id: 1 } }] } },
    },
  },
  operations: {
    publishEvent: { action: "send", channel: { $ref: "#/channels/events" } },
  },
};

function withContext(document: unknown, showCodeSamples: boolean, children: ReactNode) {
  return (
    <DocumentContext.Provider
      value={{
        specType: "asyncapi",
        document: document as AsyncAPIDocumentData,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

describe("AsyncCodeSample", () => {
  it("defaults to the Agent Prompt sample, registered first in asyncsnippet's target registry", () => {
    render(withContext(wsDocument, true, <AsyncCodeSample operationId="sendMessage" />));

    const panel = within(document.getElementById("operation-sendMessage-code-sample")!);
    expect(panel.getByText("Example")).toBeInTheDocument();
    expect(panel.getByText("AI agent", { exact: false })).toBeInTheDocument();

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    expect(select).toHaveValue("agent:ws");
  });

  it("switches to the javascript/ws sample with the resolved payload", () => {
    render(withContext(wsDocument, true, <AsyncCodeSample operationId="sendMessage" />));

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "javascript:ws" } });

    const panel = within(document.getElementById("operation-sendMessage-code-sample")!);
    expect(panel.getByText("hello world", { exact: false })).toBeInTheDocument();
  });

  it("lists every ws-compatible asyncsnippet target as a grouped dropdown option, excluding kafkajs", () => {
    render(withContext(wsDocument, true, <AsyncCodeSample operationId="sendMessage" />));

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    expect(within(select).getByRole("group", { name: "Agent Prompt" })).toBeInTheDocument();
    expect(within(select).getByRole("group", { name: "JavaScript" })).toBeInTheDocument();
    expect(within(select).getByRole("group", { name: "Python" })).toBeInTheDocument();
    expect(within(select).getAllByRole("option").length).toBeGreaterThanOrEqual(4);
    expect(within(select).queryByRole("option", { name: "kafkajs" })).not.toBeInTheDocument();
  });

  it("switches to the Python/websockets sample", () => {
    render(withContext(wsDocument, true, <AsyncCodeSample operationId="sendMessage" />));

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "python:websockets" } });

    const panel = within(document.getElementById("operation-sendMessage-code-sample")!);
    expect(panel.getByText("asyncio", { exact: false })).toBeInTheDocument();
    expect(panel.getByText("hello world", { exact: false })).toBeInTheDocument();
  });

  it("switches to the browser WebSocket client", () => {
    render(withContext(wsDocument, true, <AsyncCodeSample operationId="sendMessage" />));

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "javascript:websocket" } });

    const panel = within(document.getElementById("operation-sendMessage-code-sample")!);
    expect(panel.getByText("hello world", { exact: false })).toBeInTheDocument();
  });

  it("renders nothing when showCodeSamples is false", () => {
    render(withContext(wsDocument, false, <AsyncCodeSample operationId="sendMessage" />));

    expect(document.getElementById("operation-sendMessage-code-sample")).not.toBeInTheDocument();
  });

  it("defaults to the Agent Prompt (Kafka) sample for a Kafka-bound operation", () => {
    render(withContext(kafkaDocument, true, <AsyncCodeSample operationId="publishEvent" />));

    const panelElement = document.getElementById("operation-publishEvent-code-sample")!;
    const panel = within(panelElement);
    expect(panel.getByText("Example")).toBeInTheDocument();
    expect(panelElement.textContent).toContain("AI agent");

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    expect(select).toHaveValue("agent:kafka");
    // Every target's Kafka client is offered (agent, kafkajs, confluent-kafka,
    // rdkafka, kafka-go) — only ws-family clients (e.g. plain "ws") are excluded.
    expect(within(select).getByRole("group", { name: "Python" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "ws" })).not.toBeInTheDocument();
    expect(within(select).getAllByRole("option")).toHaveLength(5);
  });

  it("switches to the javascript/kafkajs sample for a Kafka-bound operation", () => {
    render(withContext(kafkaDocument, true, <AsyncCodeSample operationId="publishEvent" />));

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "javascript:kafkajs" } });

    const panelElement = document.getElementById("operation-publishEvent-code-sample")!;
    expect(panelElement.textContent).toContain("producer.send");
  });

  it("resets selection when operationId changes across protocols without remounting", () => {
    // Mirrors Operations' SidePanel: same AsyncCodeSample instance, new op id.
    // Spy guards the render-phase reset: snippet derivation must use the new
    // default immediately, never the previous op's python:websockets with the
    // new kafka operationId (which would generate null and flash an empty panel).
    const generateSpy = vi.spyOn(asyncCodeSampleHelpers, "generateAsyncCodeSample");
    const { rerender } = render(withContext(wsDocument, true, <AsyncCodeSample operationId="sendMessage" />));

    const wsSelect = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(wsSelect, { target: { value: "python:websockets" } });
    expect(wsSelect).toHaveValue("python:websockets");

    generateSpy.mockClear();
    rerender(withContext(kafkaDocument, true, <AsyncCodeSample operationId="publishEvent" />));

    const kafkaPanel = document.getElementById("operation-publishEvent-code-sample");
    expect(kafkaPanel).toBeInTheDocument();
    expect(kafkaPanel!.textContent).toContain("AI agent");

    const kafkaSelect = screen.getByRole("combobox", { name: "Code sample language" });
    expect(kafkaSelect).toHaveValue("agent:kafka");

    const mismatched = generateSpy.mock.calls.filter(
      ([, opId, target, client]) => opId === "publishEvent" && target === "python" && client === "websockets",
    );
    expect(mismatched).toHaveLength(0);
    generateSpy.mockRestore();
  });

  it("renders nothing for an operation outside asyncsnippet's scope (no registered client for its protocol)", () => {
    render(withContext(mqttDocument, true, <AsyncCodeSample operationId="publishEvent" />));

    expect(document.getElementById("operation-publishEvent-code-sample")).not.toBeInTheDocument();
  });

  it("renders nothing when operationId is null", () => {
    render(withContext(wsDocument, true, <AsyncCodeSample operationId={null} />));

    expect(document.querySelector('[id^="operation-"][id$="-code-sample"]')).not.toBeInTheDocument();
  });
});
