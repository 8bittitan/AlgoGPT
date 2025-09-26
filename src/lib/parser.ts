export interface EventSourceMessage {
  event?: string | undefined;
  id?: string | undefined;
  data: string;
}

type ParserCBs = {
  onEvent: (event: EventSourceMessage) => void;
};

const createParser = ({ onEvent }: ParserCBs) => {
  let incompleteLine = "";
  let isFirstChunk = true;
  let id: string | undefined;
  let data = "";
  let eventType = "";

  function feed(incoming: string) {
    const chunk = isFirstChunk
      ? incoming.replace(/^\xEF\xBB\xBF/, "")
      : incoming;

    const [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);

    for (const line of complete) {
      parseLine(line);
    }

    incompleteLine = incomplete;
    isFirstChunk = false;
  }

  function parseLine(line: string) {
    // If line is empty, attempt to dispatch anything we already have
    if (line === "") {
      dispatchEvent();
      return;
    }

    // Handle comment
    if (line.startsWith(":")) {
      return;
    }

    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field = line.slice(0, fieldSeparatorIndex);
      const offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1;
      const value = line.slice(fieldSeparatorIndex + offset);

      processField(field, value);

      return;
    }

    processField(line, "");
  }

  function processField(field: string, value: string) {
    switch (field) {
      case "event":
        eventType = value;
        break;
      case "data":
        data = `${data}${value}\n`;
        break;
      case "id":
        id = value.includes("\0") ? undefined : value;
        break;
      default:
        console.error(
          `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}...` : field}`,
        );
        break;
    }
  }

  function dispatchEvent() {
    const shouldDispatch = data.length > 0;

    if (shouldDispatch) {
      onEvent({
        id,
        event: eventType || undefined,
        data: data.endsWith("\n") ? data.slice(0, -1) : data,
      });
    }

    id = undefined;
    data = "";
    eventType = "";
  }

  return { feed };
};

type EventParser = ReturnType<typeof createParser>;

function splitLines(
  chunk: string,
): [complete: Array<string>, incomplete: string] {
  const lines: Array<string> = [];
  let incompleteLine = "";
  let searchIndex = 0;

  while (searchIndex < chunk.length) {
    const crIndex = chunk.indexOf("\r", searchIndex);
    const lfIndex = chunk.indexOf("\n", searchIndex);

    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1) {
      lineEnd = Math.min(crIndex, lfIndex);
    } else if (crIndex !== -1) {
      if (crIndex === chunk.length - 1) {
        lineEnd = -1;
      } else {
        lineEnd = crIndex;
      }
    } else if (lfIndex !== -1) {
      lineEnd = lfIndex;
    }

    if (lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line);

      searchIndex = lineEnd + 1;
      if (chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === "\n") {
        searchIndex++;
      }
    }
  }

  return [lines, incompleteLine];
}

export class ChunkParser extends TransformStream<string, EventSourceMessage> {
  constructor() {
    let parser: EventParser;

    super({
      start(controller) {
        parser = createParser({
          onEvent(event) {
            controller.enqueue(event);
          },
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      },
    });
  }
}
