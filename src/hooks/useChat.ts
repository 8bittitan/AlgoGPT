import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Chat } from "~/lib/chat";
import type { Assistant } from "~/lib/types";

type UseChatProps = {
  assistant: Assistant;
  onFinish?: () => void;
};

export const useChat = ({ assistant, onFinish }: UseChatProps) => {
  const chatRef = useRef(
    new Chat({
      ...assistant,
      onFinish,
    }),
  );

  useEffect(() => {
    chatRef.current.updateAssistant({ assistant });
  }, [assistant]);

  const subscribeToMessages = useCallback(
    (update: () => void) => chatRef.current.onMessage(update),
    [],
  );

  const messages = useSyncExternalStore(
    subscribeToMessages,
    () => chatRef.current.messages,
    () => chatRef.current.messages,
  );

  const streamState = useSyncExternalStore(
    chatRef.current.onStatus,
    () => chatRef.current.status,
    () => chatRef.current.status,
  );

  return {
    streamState,
    messages,
    sendMessage: chatRef.current.sendMessage,
    stop: chatRef.current.stop,
  };
};
