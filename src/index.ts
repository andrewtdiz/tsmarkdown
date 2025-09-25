/**
 * TS Markdown - Main Entry Point
 *
 * This module exports all the core functionality of TS Markdown.
 */

// Core exports
export { watch } from './utils/watch.js';

// Runtime types and functions
export type { Chunk } from './runtime/tsm-runtime.js';
export { __tsm } from './runtime/tsm-runtime.js';

// Utility functions
export { dateToLLMReadable, llmReadableToDate } from './utils/datetime.js';
export { toRelativeTime, parseRelativeTime } from './utils/relative-time.js';
export { formatDollarAmount, parseDollarAmount } from './utils/currency.js';
