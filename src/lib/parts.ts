type StartPart = {
  type: "start";
  messageId: string | null;
};

type ToolInputStartPart = {
  type: "tool-input-start";
  toolName: string;
  toolCallId: string;
};

type ToolInputDeltaPart = {
  type: "tool-input-delta";
  inputTextDelta: string;
  toolCallId: string;
};

type ToolInputAvailablePart = {
  type: "tool-input-available";
  toolName: string;
  input: { query: string };
  toolCallId: string;
};

type ToolOutputAvailablePart = {
  type: "tool-output-available";
  output: {
    hits: any[];
    query: string;
  };
  toolCallId: string;
};

export type TextStartPart = {
  type: "text-start";
  id: string;
};

export type TextDeltaPart = {
  type: "text-delta";
  delta: string;
  id: string;
};

export type TextPart = {
  type: "text";
  text: string;
};

type StartStepPart = {
  type: "start-step";
};

type FinishStepPart = {
  type: "finish-step";
};

type FinishPart = {
  type: "finish";
};

type DonePart = {
  type: "done";
};

type ErrorPart = {
  type: "error";
  errorText: string;
};

export type AIMessagePart =
  | StartPart
  | StartStepPart
  | FinishStepPart
  | ToolInputStartPart
  | ToolInputDeltaPart
  | ToolInputAvailablePart
  | ToolOutputAvailablePart
  | TextStartPart
  | TextDeltaPart
  | FinishPart
  | DonePart
  | ErrorPart;

export type UIToolPart = {
  type: "tool";
  toolCallId: string;
} & (
  | {
      state: "input-start";
      input?: { query: string };
      output?: never;
    }
  | {
      state: "input-available";
      input?: { query: string };
      output?: never;
    }
  | {
      state: "output-available";
      input?: { query: string };
      output?: { hits: any[]; query: string };
    }
);

export type UITextPart = {
  type: "text";
  text: string;
};

export type UIFinishPart = {
  type: "finish";
};

export type UIMessagePart = UIToolPart | UITextPart | UIFinishPart;
