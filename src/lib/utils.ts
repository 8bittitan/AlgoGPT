import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { JSONValue } from "./types";
import { fixJson } from "./fixJson";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const testChunks = [
  'data: {"type":"start"}',
  "",
  'data: {"type":"tool-input-start","toolCallId":"call_jFrdRc717iF2Gnlvad2uHHXM","toolName":"searchIndex"}',
  'data: {"type":"tool-input-delta","toolCallId":"call_jFrdRc717iF2Gnlvad2uHHXM","toolName":"searchIndex","inputTextDelta":"Wha","providerMetadata":{"openai":{"itemId":"fc_68cb85ea53a08190b1352cd71cf50ca906103c2373a96432"}}}',
  'data: {"type":"tool-input-delta","toolCallId":"call_jFrdRc717iF2Gnlvad2uHHXM","toolName":"searchIndex","inputTextDelta":"t is D","providerMetadata":{"openai":{"itemId":"fc_68cb85ea53a08190b1352cd71cf50ca906103c2373a96432"}}}',
  'data: {"type":"tool-input-delta","toolCallId":"call_jFrdRc717iF2Gnlvad2uHHXM","toolName":"searchIndex","inputTextDelta":"ocSearch","providerMetadata":{"openai":{"itemId":"fc_68cb85ea53a08190b1352cd71cf50ca906103c2373a96432"}}}',
  "",
  'data: {"type":"tool-input-available","toolCallId":"call_jFrdRc717iF2Gnlvad2uHHXM","toolName":"searchIndex","input":{"query":"What is DocSearch"},"providerMetadata":{"openai":{"itemId":"fc_68cb85ea53a08190b1352cd71cf50ca906103c2373a96432"}}}',
  "",
  'data: {"type":"tool-output-available","toolCallId":"call_jFrdRc717iF2Gnlvad2uHHXM","output":{"hits":[], "query": "What is DocSearch?"}}',
  "",
  'data: {"type":"text-start","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","providerMetadata":{"openai":{"itemId":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432"}}}',
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"Ce"}',
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"rt"}',
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"ain"}',
  "",
  "",
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"ly"}',
  "",
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":" I"}',
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":" w"}',
  "",
  "",
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"ill"}',
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":" sea"}',
  "",
  "",
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"rch "}',
  "",
  'data: {"type":"text-delta","id":"msg_68cb85ebac18819087ee4662504e730906103c2373a96432","delta":"and get that answer for you"}',
  "",
  'data: {"type":"finish"}',
  "data: [DONE]",
  "",
].map((l) => `${l}\n`);

const suspectProtoRx = /"__proto__"\s*:/;
const suspectConstructorRx = /"constructor"\s*:/;

function _parse(text: string) {
  const obj = JSON.parse(text);

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (
    suspectProtoRx.test(text) === false &&
    suspectConstructorRx.test(text) === false
  ) {
    return obj;
  }

  return _filter(obj);
}

function _filter(obj: any) {
  let next = [obj];

  while (next.length) {
    const nodes = next;
    next = [];

    for (const node of nodes) {
      if (Object.prototype.hasOwnProperty.call(node, "__proto__")) {
        throw new SyntaxError("Object contains forbidden prototype property");
      }

      if (
        Object.prototype.hasOwnProperty.call(node, "constructor") &&
        Object.prototype.hasOwnProperty.call(node.constructor, "prototype")
      ) {
        throw new SyntaxError("Object contains forbidden prototype property");
      }

      for (const key in node) {
        const value = node[key];
        if (value && typeof value === "object") {
          next.push(value);
        }
      }
    }
  }

  return obj;
}

function _secureParse(text: string) {
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;

  try {
    return _parse(text);
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
  }
}

export type ParseResult<T> =
  | { success: true; value: T; rawValue: unknown }
  | { success: false; error: Error; rawValue: undefined };

export function safeParseJson(text: string): ParseResult<JSONValue> {
  try {
    const value = _secureParse(text);

    return { success: true, value: value, rawValue: value };
  } catch (error) {
    return {
      success: false,
      error: new Error(`Error parsing ${text} into JSON`, { cause: error }),
      rawValue: undefined,
    };
  }
}

export function partialParseJson(possibleJson: string | undefined) {
  if (possibleJson === undefined) {
    return { value: undefined, state: "undefined-json" };
  }

  let result = safeParseJson(possibleJson);

  if (result.success) {
    return { value: result.value, state: "success" };
  }

  result = safeParseJson(fixJson(possibleJson));

  if (result.success) {
    return { value: result.value, state: "repair-parse" };
  }

  return { value: undefined, state: "failed-parse" };
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
