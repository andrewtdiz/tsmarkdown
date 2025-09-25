/**
 * TS Markdown - Main Entry Point
 *
 * This module exports all the core functionality of TS Markdown.
 */

// Core exports
export { watch } from './utils/watch';

// Runtime types and functions
export type { Chunk } from './runtime/tsm-runtime';
export { __tsm } from './runtime/tsm-runtime';

// Utility functions
export { dateToLLMReadable, llmReadableToDate } from './utils/datetime';
export { toRelativeTime, parseRelativeTime } from './utils/relative-time';
export { formatDollarAmount, parseDollarAmount } from './utils/currency';
