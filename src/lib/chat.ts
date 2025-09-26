import { ChatState } from "./chat/state";
import { JobExecutor } from "./job-executor";
import { consumeStream, processStream } from "./stream";
import { RequestError, Transport } from "./transport";
import type {
  ActiveStreamResponse,
  ActiveStreamState,
  Assistant,
  ChatStatus,
  UIMessage,
} from "./types";

let seq = 0;

const dummyId = () => {
  const id = `msg_${seq}_id`;

  seq += 1;

  return id;
};

export const buildUserMessage = (text: string): UIMessage => {
  const id = dummyId();

  return {
    role: "user",
    id,
    parts: [
      {
        type: "text",
        text,
      },
    ],
  };
};

const noop = () => {};

type ChatOptions = {
  assistantId: string;
  appId: string;
  indexName: string;
  searchApiKey: string;
  onFinish?: () => void;
};

export class Chat {
  protected state: ChatState;

  private jobExecutor = new JobExecutor();
  private activeStream: ActiveStreamState | undefined = undefined;
  private transport: Transport;

  private onFinish: () => void;

  private id: string = dummyId();

  constructor({
    assistantId,
    appId,
    indexName,
    searchApiKey,
    onFinish = noop,
  }: ChatOptions) {
    const state = new ChatState();

    this.state = state;
    this.transport = new Transport({
      appId,
      searchApiKey,
      indexName,
      assistantId,
    });

    this.onFinish = onFinish;
  }

  get messages() {
    return this.state.messages;
  }

  set messages(messages: UIMessage[]) {
    this.state.messages = messages;
  }

  get status() {
    return this.state.status;
  }

  public updateAssistant({ assistant }: { assistant: Assistant }) {
    this.messages = [];
    this.transport = new Transport(assistant);
  }

  protected setStatus(status: ChatStatus) {
    if (this.status === status) return;

    this.state.status = status;
  }

  get lastMessage() {
    return this.state.messages[this.state.messages.length - 1];
  }

  onMessage = (cb: () => void) => this.state.onMessage(cb);

  onStatus = (cb: () => void) => this.state.onStatus(cb);

  stop = () => {
    if (this.state.status !== "streaming" && this.state.status !== "preparing")
      return;

    if (this.activeStream?.abortController) {
      this.activeStream.abortController.abort();
    }
  };

  sendMessage = async (message: string | UIMessage) => {
    let userMessage: UIMessage;

    if (typeof message === "string") {
      userMessage = buildUserMessage(message);
    } else {
      userMessage = message;
    }

    this.state.pushMessage({
      ...userMessage,
      id: userMessage.id ?? dummyId(),
      role: userMessage.role || "user",
    });

    this.makeRequest({
      messageId: userMessage.id,
    });
  };

  private async makeRequest({ messageId }: { messageId?: string }) {
    this.setStatus("preparing");

    let isAbort = false;

    const lastMessage = this.lastMessage;

    const currentMessage =
      lastMessage.role === "assistant"
        ? lastMessage
        : ({
            id: dummyId(),
            role: "assistant",
            parts: [],
          } as UIMessage);

    try {
      const activeStream: ActiveStreamState = {
        state: {
          message: currentMessage,
          activeTextParts: {},
          activeReasoningParts: {},
          partialToolCall: {},
        },
        abortController: new AbortController(),
      };

      activeStream.abortController.signal.addEventListener("abort", () => {
        isAbort = true;
      });

      this.activeStream = activeStream;

      const stream = await this.transport.sendMessages({
        abortSignal: activeStream.abortController.signal,
        messages: this.state.messages,
        messageId,
        chatId: this.id,
        trigger: "submit-message",
      });

      const onChunk = (
        job: (opts: {
          state: ActiveStreamResponse;
          write: () => void;
        }) => Promise<void>,
      ) =>
        this.jobExecutor.run(() =>
          job({
            state: activeStream.state,
            write: () => {
              this.setStatus("streaming");

              const shouldReplaceMessage =
                activeStream.state.message.id === this.lastMessage.id;

              if (shouldReplaceMessage) {
                this.state.relpaceMessage(
                  this.state.messages.length - 1,
                  activeStream.state.message,
                );
              } else {
                this.state.pushMessage(activeStream.state.message);
              }
            },
          }),
        );

      await consumeStream({
        stream: processStream({
          stream,
          onChunk,
          onError(err) {
            throw err;
          },
        }),
        onError(err) {
          throw err;
        },
      });

      this.setStatus("ready");
    } catch (err) {
      // Request was stopped for some reason, reset the streaming state
      if (isAbort || (err as any).name === "AbortError") {
        isAbort = true;
        this.setStatus("ready");
        return;
      }

      // TODO: Manage error states better
      if (err instanceof RequestError) {
        console.error(err.message);
        this.setStatus("ready");
        return;
      }

      if (
        err instanceof TypeError &&
        (err.message.toLowerCase().includes("fetch") ||
          err.message.toLowerCase().includes("network"))
      ) {
        // TODO: Handle network disconnect better ... somehow
        console.error("Network disconnect");
      }

      this.setStatus("ready");
    } finally {
      this.activeStream = undefined;
      this.onFinish();
    }
  }
}
