import { useChat } from "./hooks/useChat";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Message } from "./components/message";
import { useLayoutEffect, useRef, useState } from "react";
import { ChevronUp, Moon, Send, StopCircle, Sun } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { APP_ID, INDEX, SEARCH_API_KEY, ASSISTANT_ID } from "~/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import type { Assistant } from "./lib/types";

const availableAssistants: Assistant[] = [
  {
    assistantId: ASSISTANT_ID,
    appId: APP_ID,
    indexName: INDEX,
    searchApiKey: SEARCH_API_KEY,
  },
];

function App() {
  const chatFormRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant>(
    availableAssistants[0],
  );
  const messageListRef = useRef<HTMLDivElement>(null);
  const { sendMessage, streamState, messages, stop } = useChat({
    assistant: currentAssistant,
    onFinish() {
      setQuery(null);
    },
  });
  const { theme, changeTheme } = useTheme();

  const isStreaming = ["preparing", "streaming"].includes(streamState);

  const ask = () => {
    if (!query || isStreaming) return;

    sendMessage(query);
  };

  useLayoutEffect(() => {
    if (chatFormRef.current && messageListRef.current) {
      messageListRef.current.style.paddingBottom = `${chatFormRef.current.clientHeight + 20}px`;
    }
  }, []);

  return (
    <div className="flex min-h-svh w-full">
      <div className="min-h-svh flex flex-col overflow-hidden w-full relative flex-1">
        <div className="absolute top-0 bottom-0 w-full">
          <div className="fixed top-4 right-12 z-20">
            <Button size="icon" variant="secondary" onClick={changeTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
          <div
            className="absolute inset-0 overflow-y-scroll sm:pt-3.5"
            ref={messageListRef}
          >
            <div className="pt-10 mx-auto flex w-full max-w-3xl flex-col space-y-12 px-4 pb-10">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="flex flex-col space-y-12 mx-auto max-w-3xl w-full px-4"
                >
                  <Message message={message} />
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 w-full px-2 z-10">
            <div className="relative mx-auto w-full max-w-3xl flex flex-col text-center backdrop-blur-lg bg-secondary/50 p-2 rounded-t-[20px]">
              <div
                className="pointer-events-auto flex flex-col gap-2 w-full bg-[hsla(270,0%,100%,.1)] dark:bg-[hsla(270,25%,50%,.1)] rounded-t-xl px-3 pt-3"
                ref={chatFormRef}
              >
                <Textarea
                  className="bg-transparent dark:bg-transparent border-0 shadow-none resize-none focus-visible:ring-0 text-foreground leading-6 placeholder:text-secondary-foreground/50 p-0"
                  placeholder="Chat with Algolia AskAI..."
                  value={query ?? ""}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                />
                <div className="flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="mr-auto text-muted-foreground text-sm inline-flex items-center gap-1">
                        <span>
                          Active Assistant:{" "}
                          <strong>
                            {currentAssistant.assistantId} -{" "}
                            {currentAssistant.indexName}
                          </strong>
                        </span>
                        <ChevronUp className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start">
                      <DropdownMenuLabel>
                        Available assistants
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableAssistants.map((config) => (
                        <DropdownMenuItem
                          key={`${config.assistantId}-${config.indexName}`}
                          onClick={() => setCurrentAssistant(config)}
                        >
                          {config.assistantId} - {config.indexName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isStreaming && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={stop}
                    >
                      <StopCircle />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    onClick={ask}
                    variant="secondary"
                    disabled={!query || isStreaming}
                  >
                    <Send />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
