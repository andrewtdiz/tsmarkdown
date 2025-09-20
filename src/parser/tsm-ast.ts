/**
 * TSM (TypeScript-Markdown) AST Types
 * 
 * This module defines the AST node types for the TSM parser.
 * Based on the TSM grammar specification, these types represent the
 * parsed structure of TSM blocks within TypeScript functions.
 */

// Base AST node interface
export interface TSMNode {
    type: string;
    start?: number;
    end?: number;
}

// TSM Block - represents a complete TSM block: ( ... )
export interface TSMBlock extends TSMNode {
    type: 'TSMBlock';
    lines: TSMLine[];
}

// TSM Line - represents a single line within a TSM block
export interface TSMLine extends TSMNode {
    type: 'TSMLine';
    chunks: TSMChunk[];
    isEmpty?: boolean; // true if line contains only whitespace
    isComment?: boolean; // true if line starts with //
}

// Union type for all possible chunks within a line
export type TSMChunk = TSMTextChunk | TSMInterpolation | TSMComponent;

// Text chunk - represents literal markdown text (including XML tags)
export interface TSMTextChunk extends TSMNode {
    type: 'TSMTextChunk';
    content: string;
}

// Interpolation - represents {{ expr }} expressions
export interface TSMInterpolation extends TSMNode {
    type: 'TSMInterpolation';
    expression: string; // The TypeScript expression inside {{ }}
    isConditional?: boolean; // true for {{ cond ? (...) : (...) }}
    isLogical?: boolean; // true for {{ cond && (...) }} or {{ !cond && (...) }}
    isNull?: boolean; // true for {{ null }}
    conditionalBlocks?: {
        trueBlock?: TSMBlock;
        falseBlock?: TSMBlock;
    };
}

// Component - represents <@ComponentName .../> tags
export interface TSMComponent extends TSMNode {
    type: 'TSMComponent';
    name: string; // Component name without @ prefix
    attributes: TSMComponentAttribute[];
    isSelfClosing: boolean;
    children?: TSMBlock; // For future v2 support
}

// Component attribute
export interface TSMComponentAttribute extends TSMNode {
    type: 'TSMComponentAttribute';
    name: string;
    value: TSMAttributeValue;
}

// Component attribute value
export type TSMAttributeValue =
    | { type: 'string'; value: string }
    | { type: 'expression'; value: string };

// Conditional block within interpolations
export interface TSMConditionalBlock extends TSMNode {
    type: 'TSMConditionalBlock';
    condition: string;
    trueBlock?: TSMBlock;
    falseBlock?: TSMBlock;
}

// Type guards for runtime type checking
export function isTSMBlock(node: TSMNode): node is TSMBlock {
    return node.type === 'TSMBlock';
}

export function isTSMLine(node: TSMNode): node is TSMLine {
    return node.type === 'TSMLine';
}

export function isTSMTextChunk(node: TSMNode): node is TSMTextChunk {
    return node.type === 'TSMTextChunk';
}

export function isTSMInterpolation(node: TSMNode): node is TSMInterpolation {
    return node.type === 'TSMInterpolation';
}

export function isTSMComponent(node: TSMNode): node is TSMComponent {
    return node.type === 'TSMComponent';
}

export function isTSMChunk(node: TSMNode): node is TSMChunk {
    return isTSMTextChunk(node) || isTSMInterpolation(node) || isTSMComponent(node);
}

// Utility types for parser state
export interface TSMParseContext {
    source: string;
    position: number;
    line: number;
    column: number;
}

export interface TSMParseResult {
    success: boolean;
    node?: TSMBlock;
    error?: string;
    position?: number;
}

// AST visitor pattern support
export interface TSMVisitor {
    visitBlock?(block: TSMBlock): void;
    visitLine?(line: TSMLine): void;
    visitTextChunk?(chunk: TSMTextChunk): void;
    visitInterpolation?(interpolation: TSMInterpolation): void;
    visitComponent?(component: TSMComponent): void;
}

// AST transformer pattern support
export interface TSMTransformer {
    transformBlock?(block: TSMBlock): TSMBlock;
    transformLine?(line: TSMLine): TSMLine;
    transformTextChunk?(chunk: TSMTextChunk): TSMTextChunk;
    transformInterpolation?(interpolation: TSMInterpolation): TSMInterpolation;
    transformComponent?(component: TSMComponent): TSMComponent;
}
