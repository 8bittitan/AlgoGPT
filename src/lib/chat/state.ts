import type { ChatStatus, UIMessage } from "../types";

export class ChatState {
  #messages: UIMessage[];
  #status: ChatStatus = "ready";
  #error: Error | undefined = undefined;

  #messagesCallbacks = new Set<() => void>();
  #statusCallbacks = new Set<() => void>();
  #errorCallbacks = new Set<() => void>();

  constructor(initialMessages: UIMessage[] = []) {
    this.#messages = initialMessages;
  }

  get status() {
    return this.#status;
  }

  set status(newStatus: ChatStatus) {
    this.#status = newStatus;
    this.#dispatchStatusCallbacks();
  }

  get messages() {
    return this.#messages;
  }

  set messages(newMessages: UIMessage[]) {
    this.#messages = [...newMessages];
    this.#dispatchMessagesCallbacks();
  }

  get error() {
    return this.#error;
  }

  set error(err: Error | undefined) {
    this.#error = err;
    this.#dispatchErrorCallbacks();
  }

  #dispatchMessagesCallbacks() {
    this.#messagesCallbacks.forEach((cb) => cb());
  }

  #dispatchStatusCallbacks() {
    this.#statusCallbacks.forEach((cb) => cb());
  }

  #dispatchErrorCallbacks() {
    this.#errorCallbacks.forEach((cb) => cb());
  }

  snapshot = <T>(value: T): T => structuredClone(value);

  pushMessage(message: UIMessage) {
    this.#messages = this.#messages.concat(message);
    this.#dispatchMessagesCallbacks();
  }

  relpaceMessage(index: number, message: UIMessage) {
    this.#messages = [
      ...this.#messages.slice(0, index),
      this.snapshot(message),
      ...this.#messages.slice(index + 1),
    ];

    this.#dispatchMessagesCallbacks();
  }

  onMessage = (cb: () => void) => {
    this.#messagesCallbacks.add(cb);

    return () => {
      this.#messagesCallbacks.delete(cb);
    };
  };

  onStatus = (cb: () => void) => {
    this.#statusCallbacks.add(cb);

    return () => {
      this.#statusCallbacks.delete(cb);
    };
  };

  onError(cb: () => void) {
    this.#errorCallbacks.add(cb);

    return () => {
      this.#errorCallbacks.delete(cb);
    };
  }
}
