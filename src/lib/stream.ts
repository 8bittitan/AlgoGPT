import { ChunkParser, type EventSourceMessage } from "./parser";
import type { AIMessagePart, UITextPart, UIToolPart } from "./parts";
import type { ActiveStreamResponse, JSONValue } from "./types";
import { partialParseJson, safeParseJson, type ParseResult } from "./utils";

type ProcessStreamOptions = {
  stream: ReadableStream<ParseResult<JSONValue>>;
  onChunk: (
    job: (opts: {
      state: ActiveStreamResponse;
      write: () => void;
    }) => Promise<void>,
  ) => Promise<void>;
  onError: (err: unknown) => void;
};

export function processResponseStream(
  stream: ReadableStream<Uint8Array<ArrayBufferLike>>,
) {
  return stream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new ChunkParser())
    .pipeThrough(
      new TransformStream<EventSourceMessage, ParseResult<JSONValue>>({
        transform({ data }, controller) {
          if (data === "[DONE]") {
            return;
          }

          controller.enqueue(safeParseJson(data));
        },
      }),
    );
}

export function processStream({
  stream,
  onChunk,
  onError,
}: ProcessStreamOptions) {
  return stream
    .pipeThrough(
      new TransformStream<ParseResult<JSONValue>, JSONValue>({
        transform(chunk, controller) {
          if (!chunk.success) {
            throw chunk.error;
          }

          controller.enqueue(chunk.value);
        },
      }),
    )
    .pipeThrough(
      new TransformStream<AIMessagePart, AIMessagePart>({
        transform(chunk, controller) {
          onChunk(async ({ state, write }) => {
            function getToolInvocation(toolCallId: string) {
              const toolInvocations = state.message.parts.filter(
                (p) => p.type === "tool",
              );

              const toolInvocation = toolInvocations.find(
                (invocation) => invocation.toolCallId === toolCallId,
              );

              if (toolInvocation == null) {
                throw new Error(
                  "tool-output-error must be preceded by a tool-input-available",
                );
              }

              return toolInvocation;
            }

            function updateToolPart(
              partial: { toolCallId: string; toolName: string } & (
                | {
                    state: "input-start";
                    input?: unknown;
                  }
                | {
                    state: "input-available";
                    input?: unknown;
                  }
                | {
                    state: "output-available";
                    input?: unknown;
                    output?: unknown;
                  }
              ),
            ) {
              const part = state.message.parts.find(
                (p) => p.type === "tool" && p.toolCallId === partial.toolCallId,
              ) as UIToolPart | undefined;

              const anyOptions = partial as any;
              const anyPart = part as any;

              if (part) {
                part.state = partial.state;
                anyPart.input = anyOptions.input;
                anyPart.output = anyOptions.output;
              } else {
                state.message.parts.push({
                  type: "tool",
                  state: partial.state,
                  toolCallId: partial.toolCallId,
                  input: anyOptions.input,
                  output: anyOptions.output,
                });
              }
            }

            switch (chunk.type) {
              // TODO: Add reasoning parts

              // Tool based events
              case "tool-input-start": {
                state.partialToolCall[chunk.toolCallId] = {
                  text: "",
                  index: 0,
                  toolName: chunk.toolName,
                  dynamic: false,
                };

                updateToolPart({
                  toolName: chunk.toolName,
                  toolCallId: chunk.toolCallId,
                  state: "input-start",
                  input: undefined,
                });
                write();
                break;
              }
              case "tool-input-delta": {
                const partialToolCall = state.partialToolCall[chunk.toolCallId];

                partialToolCall.text += chunk.inputTextDelta;

                const { value: partialInput } = partialParseJson(
                  partialToolCall.text,
                );

                updateToolPart({
                  toolName: partialToolCall.toolName,
                  toolCallId: chunk.toolCallId,
                  state: "input-start",
                  input: partialInput,
                });

                write();
                break;
              }
              case "tool-input-available": {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  input: chunk.input,
                  state: "input-available",
                });

                write();
                break;
              }
              case "tool-output-available": {
                const toolInvoke = getToolInvocation(chunk.toolCallId);

                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: toolInvoke.type.split("-").slice(1).join("-"),
                  output: chunk.output,
                  input: toolInvoke.input,
                  state: "output-available",
                });

                write();
                break;
              }
              // Text based events
              case "text-start": {
                const textPart: UITextPart = {
                  type: "text",
                  text: "",
                };
                state.activeTextParts[chunk.id] = textPart;
                state.message.parts.push(textPart);
                write();
                break;
              }
              case "text-delta": {
                const textPart = state.activeTextParts[chunk.id];
                textPart.text += chunk.delta;
                write();
                break;
              }
              case "start": {
                if (chunk.messageId !== null) {
                  state.message.id = chunk.messageId;
                  write();
                }

                break;
              }
              case "finish-step": {
                state.activeTextParts = {};
                state.activeReasoningParts = {};
                break;
              }
              case "error": {
                onError(new Error(chunk.errorText));
                break;
              }
              default: {
                // Chunk that we don't handle (yet), just log it out
                console.dir(chunk);
                break;
              }
            }

            controller.enqueue(chunk);
          });
        },
      }),
    );
}

export async function consumeStream({
  stream,
  onError,
}: {
  stream: ReadableStream;
  onError: (err: unknown) => void;
}) {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done } = await reader.read();

      if (done) break;
    }
  } catch (err) {
    onError(err);
  } finally {
    reader.releaseLock();
  }
}
