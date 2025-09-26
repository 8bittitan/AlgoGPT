import type { AIMessagePart, UIMessagePart, UITextPart } from "./parts";

export type ChatStatus = "streaming" | "ready" | "error" | "preparing";

export type MessageRole = "user" | "assistant" | "system";

export type AIMessage = {
  id: string;
  role: MessageRole;
  parts: Array<AIMessagePart>;
};

export type UIMessage = {
  id: string;
  role: MessageRole;
  parts: Array<UIMessagePart>;
};

export type UserUIMessage = {
  id: string;
  role: "user";
  parts: [UITextPart];
};

export type ActiveStreamResponse = {
  message: UIMessage;
  activeTextParts: Record<string, UITextPart>;
  activeReasoningParts: Record<string, unknown>;
  partialToolCall: Record<
    string,
    { text: string; index: number; toolName: string; dynamic?: boolean }
  >;
};

export type ActiveStreamState = {
  state: ActiveStreamResponse;
  abortController: AbortController;
};

export type Assistant = {
  assistantId: string;
  appId: string;
  searchApiKey: string;
  indexName: string;
};

// Utility based types
export type JSONValue =
  | null
  | string
  | number
  | boolean
  | JSONObject
  | JSONArray;

export type JSONObject = {
  [key: string]: JSONValue;
};

export type JSONArray = JSONValue[];
