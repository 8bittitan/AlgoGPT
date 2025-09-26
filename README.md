# AlgoGPT

Basic chat implementation using [Algolia AskAI](https://docsearch.algolia.com/docs/v4/askai) with a custom streaming implementation.

## Getting started

Install dependencies using:

```
bun install
```

Set the required attributes within `src/lib/constants.ts` with your credentials.

Run it locally:

```
bun dev
```

## Known bugs

- Sending a new message as part of a conversation results in a network error
