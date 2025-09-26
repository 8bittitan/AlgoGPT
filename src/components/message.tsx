import type { UITextPart, UIToolPart } from "~/lib/parts";
import type { UIMessage, UserUIMessage } from "~/lib/types";
import { Markdown } from "./markdown";
import { memo, useState, type PropsWithChildren } from "react";
import { ChevronDown, ChevronUp, Link } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "~/lib/utils";

export function Message({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    return <UserMessage message={message as UserUIMessage} />;
  }

  return <AssistantMessage message={message} />;
}

function UserMessage({ message }: { message: UserUIMessage }) {
  return (
    <div className="flex justify-end">
      <article
        className="border-secondary/50 bg-secondary/50 max-w-full rounded-xl border break-words md:max-w-[80%]"
        dir="auto"
      >
        <div className="max-w-none overflow-auto px-4 py-3">
          <Markdown text={message.parts[0].text} />
        </div>
      </article>
    </div>
  );
}

function AssistantMessage({ message }: { message: UIMessage }) {
  return (
    <div className="flex flex-col justify-start">
      {message.parts.map((part) => {
        switch (part.type) {
          case "tool": {
            if (part.state === "input-start") {
              return (
                <ToolCallBlock state={part.state}>Thinking...</ToolCallBlock>
              );
            }

            if (part.state === "input-available") {
              return (
                <ToolCallBlock state={part.state}>
                  {part.input?.query
                    ? `Searching for ${part.input.query}`
                    : "Searching......"}
                </ToolCallBlock>
              );
            }

            if (part.state === "output-available") {
              return (
                <ToolCallBlock state={part.state} hits={part.output?.hits}>
                  Searched for {part.output?.query}, found{" "}
                  {part.output?.hits.length} results
                </ToolCallBlock>
              );
            }

            return null;
          }
          case "text": {
            return <AssistantTextOutput key={part.type} part={part} />;
          }
          default: {
            return <p>Not implemented yet</p>;
          }
        }
      })}
    </div>
  );
}

const ToolCallBlock = memo(
  ({
    children,
    hits = [],
    state,
  }: PropsWithChildren<{ hits?: any[]; state: UIToolPart["state"] }>) => {
    const [showHits, setShowHits] = useState(false);

    const toggleHits = () => {
      if (hits.length < 1) {
        return;
      }

      setShowHits(!showHits);
    };

    const hasHits = hits.length > 0;

    return (
      <div
        className={cn(
          "border-primary/50 bg-secondary/80 text-secondary-foreground border-l-4 pl-4 py-4 pr-4 my-8",
          {
            "animate-pulse": state === "input-start",
          },
        )}
      >
        <div className="flex justify-between items-center">
          {children}
          {hasHits && (
            <Button variant="link" size="sm" onClick={toggleHits}>
              {showHits ? "Hide" : "View"} output
              {showHits ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          )}
        </div>
        {showHits && (
          <ul className="grid gap-2 mt-3">
            {hits.map((hit, idx) => (
              <li key={idx}>
                <a
                  className="text-muted-foreground flex items-center gap-1"
                  href={hit.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Link className="size-4 text-secondary-foreground" />
                  {hit.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

function AssistantTextOutput({ part }: { part: UITextPart }) {
  return (
    <article className="group relative w-full max-w-full space-y-4 break-words">
      <Markdown text={part.text} />
    </article>
  );
}
