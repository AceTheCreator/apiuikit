/**
 * Lazy-loading coordinator for protoToJsonSchema — it pulls in protobufjs
 * (~313 KB / ~80 KB gzip), which most consumers never need (their specs have
 * no Protobuf-format schemas), so it's not worth shipping eagerly for
 * everyone. resolveSchemaInput stays fully synchronous: on first encounter
 * of a Protobuf-format schema it kicks off a background import and returns a
 * "pending" placeholder immediately; useProtobufConverterReady() flips once
 * that import resolves, and it's cached module-wide from then on — every
 * subsequent Protobuf schema resolves synchronously like any other format,
 * including ones already on screen from before the import finished.
 */
import { useSyncExternalStore } from "react";
import type { protoToJsonSchema as ProtoToJsonSchemaFn } from "./protoToJsonSchema";

let converter: typeof ProtoToJsonSchemaFn | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function startLoad(): Promise<void> {
  if (!loadPromise) {
    loadPromise = import("./protoToJsonSchema").then((mod) => {
      converter = mod.protoToJsonSchema;
      listeners.forEach((listener) => listener());
    });
  }
  return loadPromise;
}

/** Returns the converter if already loaded; otherwise kicks off the
 * (idempotent) background import and returns null. Pair with
 * useProtobufConverterReady() so callers re-resolve once it's ready. */
export function getProtoToJsonSchema(): typeof ProtoToJsonSchemaFn | null {
  if (!converter) startLoad();
  return converter;
}

/** Resolves once the converter has finished loading (kicking off the load
 * if needed) — for tests and other non-React callers that need to wait
 * rather than subscribe via useProtobufConverterReady(). */
export function waitForProtobufConverter(): Promise<void> {
  return startLoad();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return converter !== null;
}

/** True once the Protobuf converter has finished loading. Include in a
 * useMemo's dependencies wherever resolveSchemaInput might return a pending
 * Protobuf conversion, so it re-resolves (synchronously, from then on) the
 * moment loading completes. */
export function useProtobufConverterReady(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
