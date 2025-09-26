import { API_URL } from "~/lib/constants";
import { getToken } from "~/lib/token";
import type { UIMessage } from "~/lib/types";
import { processResponseStream } from "~/lib/stream";

type SendMessagesInput = {
  messageId?: string;
  chatId: string;
  messages: UIMessage[];
  abortSignal: AbortSignal;
  trigger: "submit-message";
};

type TransportOptions = {
  appId: string;
  searchApiKey: string;
  indexName: string;
  assistantId: string;
};

export class RequestError extends Error {
  constructor(initialErr: Error) {
    super(`Error making request: ${initialErr.message}`, {
      cause: initialErr.cause,
    });
  }
}

export class Transport {
  private appId: string;
  private searchApiKey: string;
  private indexName: string;
  private assistantId: string;

  constructor({
    appId,
    searchApiKey,
    indexName,
    assistantId,
  }: TransportOptions) {
    this.appId = appId;
    this.searchApiKey = searchApiKey;
    this.indexName = indexName;
    this.assistantId = assistantId;
  }

  async sendMessages({
    abortSignal,
    messages,
    trigger,
    chatId,
    messageId,
  }: SendMessagesInput) {
    try {
      const token = await getToken(this.assistantId);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "X-AI-SDK-Version": "v5",
          "X-Algolia-Application-Id": this.appId,
          "X-Algolia-API-Key": this.searchApiKey,
          "X-Algolia-Index-Name": this.indexName,
          "X-Algolia-Assistant-ID": this.assistantId,
          "Content-Type": "application/json",
          Authorization: `TOKEN ${token}`,
        },
        body: JSON.stringify({
          id: chatId,
          messages,
          trigger,
          messageId,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(
          (await response.text()) ?? "Failed to fetch the chat response.",
        );
      }

      if (!response.body) {
        throw new Error("The response body is empty.");
      }

      return processResponseStream(response.body);
    } catch (err) {
      const error = err as unknown as Error;

      throw new RequestError(error);
    }
  }
}
