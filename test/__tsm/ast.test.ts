/**
 * TSM AST Types Test
 * 
 * This test file validates the TSM AST type definitions and type guards.
 */

import { describe, it, expect } from 'bun:test';
import {
    TSMBlock,
    TSMLine,
    TSMTextChunk,
    TSMInterpolation,
    TSMComponent,
    TSMComponentAttribute,
    TSMConditionalBlock,
    isTSMBlock,
    isTSMLine,
    isTSMTextChunk,
    isTSMInterpolation,
    isTSMComponent,
    isTSMChunk,
    type TSMChunk,
    type TSMAttributeValue
} from "../../src/parser/tsm-ast";

describe('TSM AST Types', () => {
    describe('Basic AST Node Creation', () => {
        it('should create TSMBlock with lines', () => {
            const block: TSMBlock = {
                type: 'TSMBlock',
                lines: []
            };
            expect(block.type).toBe('TSMBlock');
            expect(Array.isArray(block.lines)).toBe(true);
        });

        it('should create TSMLine with chunks', () => {
            const line: TSMLine = {
                type: 'TSMLine',
                chunks: []
            };
            expect(line.type).toBe('TSMLine');
            expect(Array.isArray(line.chunks)).toBe(true);
        });

        it('should create TSMTextChunk with content', () => {
            const chunk: TSMTextChunk = {
                type: 'TSMTextChunk',
                content: '# Header'
            };
            expect(chunk.type).toBe('TSMTextChunk');
            expect(chunk.content).toBe('# Header');
        });

        it('should create TSMInterpolation with expression', () => {
            const interpolation: TSMInterpolation = {
                type: 'TSMInterpolation',
                expression: 'user.name'
            };
            expect(interpolation.type).toBe('TSMInterpolation');
            expect(interpolation.expression).toBe('user.name');
        });

        it('should create TSMComponent with name and attributes', () => {
            const component: TSMComponent = {
                type: 'TSMComponent',
                name: 'Dashboard',
                attributes: [],
                isSelfClosing: true
            };
            expect(component.type).toBe('TSMComponent');
            expect(component.name).toBe('Dashboard');
            expect(component.isSelfClosing).toBe(true);
        });
    });

    describe('Type Guards', () => {
        it('should correctly identify TSMBlock', () => {
            const block: TSMBlock = { type: 'TSMBlock', lines: [] };
            expect(isTSMBlock(block)).toBe(true);
            expect(isTSMLine(block)).toBe(false);
            expect(isTSMTextChunk(block)).toBe(false);
        });

        it('should correctly identify TSMLine', () => {
            const line: TSMLine = { type: 'TSMLine', chunks: [] };
            expect(isTSMLine(line)).toBe(true);
            expect(isTSMBlock(line)).toBe(false);
            expect(isTSMTextChunk(line)).toBe(false);
        });

        it('should correctly identify TSMTextChunk', () => {
            const chunk: TSMTextChunk = { type: 'TSMTextChunk', content: 'text' };
            expect(isTSMTextChunk(chunk)).toBe(true);
            expect(isTSMChunk(chunk)).toBe(true);
            expect(isTSMInterpolation(chunk)).toBe(false);
        });

        it('should correctly identify TSMInterpolation', () => {
            const interpolation: TSMInterpolation = {
                type: 'TSMInterpolation',
                expression: 'expr'
            };
            expect(isTSMInterpolation(interpolation)).toBe(true);
            expect(isTSMChunk(interpolation)).toBe(true);
            expect(isTSMComponent(interpolation)).toBe(false);
        });

        it('should correctly identify TSMComponent', () => {
            const component: TSMComponent = {
                type: 'TSMComponent',
                name: 'Comp',
                attributes: [],
                isSelfClosing: true
            };
            expect(isTSMComponent(component)).toBe(true);
            expect(isTSMChunk(component)).toBe(true);
            expect(isTSMTextChunk(component)).toBe(false);
        });
    });

    describe('Complex AST Structures', () => {
        it('should create nested TSMBlock with multiple lines and chunks', () => {
            const textChunk: TSMTextChunk = {
                type: 'TSMTextChunk',
                content: '# Dashboard\n'
            };

            const interpolation: TSMInterpolation = {
                type: 'TSMInterpolation',
                expression: 'user.name'
            };

            const line: TSMLine = {
                type: 'TSMLine',
                chunks: [textChunk, interpolation]
            };

            const block: TSMBlock = {
                type: 'TSMBlock',
                lines: [line]
            };

            expect(block.lines).toHaveLength(1);
            expect(block.lines[0].chunks).toHaveLength(2);
            expect(isTSMTextChunk(block.lines[0].chunks[0])).toBe(true);
            expect(isTSMInterpolation(block.lines[0].chunks[1])).toBe(true);
        });

        it('should create TSMComponent with attributes', () => {
            const stringAttr: TSMAttributeValue = {
                type: 'string',
                value: 'dashboard'
            };

            const exprAttr: TSMAttributeValue = {
                type: 'expression',
                value: 'user.id'
            };

            const attributes: TSMComponentAttribute[] = [
                {
                    type: 'TSMComponentAttribute',
                    name: 'title',
                    value: stringAttr
                },
                {
                    type: 'TSMComponentAttribute',
                    name: 'userId',
                    value: exprAttr
                }
            ];

            const component: TSMComponent = {
                type: 'TSMComponent',
                name: 'Dashboard',
                attributes,
                isSelfClosing: true
            };

            expect(component.attributes).toHaveLength(2);
            expect(component.attributes[0].name).toBe('title');
            expect(component.attributes[0].value.type).toBe('string');
            expect(component.attributes[1].name).toBe('userId');
            expect(component.attributes[1].value.type).toBe('expression');
        });

        it('should create conditional interpolation with nested blocks', () => {
            const trueBlock: TSMBlock = {
                type: 'TSMBlock',
                lines: [{
                    type: 'TSMLine',
                    chunks: [{
                        type: 'TSMTextChunk',
                        content: 'User is authorized'
                    }]
                }]
            };

            const falseBlock: TSMBlock = {
                type: 'TSMBlock',
                lines: [{
                    type: 'TSMLine',
                    chunks: [{
                        type: 'TSMTextChunk',
                        content: 'User is not authorized'
                    }]
                }]
            };

            const conditionalInterpolation: TSMInterpolation = {
                type: 'TSMInterpolation',
                expression: 'user.isAuthorized',
                isConditional: true,
                conditionalBlocks: {
                    trueBlock,
                    falseBlock
                }
            };

            expect(conditionalInterpolation.isConditional).toBe(true);
            expect(conditionalInterpolation.conditionalBlocks?.trueBlock).toBeDefined();
            expect(conditionalInterpolation.conditionalBlocks?.falseBlock).toBeDefined();
        });
    });

    describe('Special Interpolation Types', () => {
        it('should create null interpolation', () => {
            const nullInterpolation: TSMInterpolation = {
                type: 'TSMInterpolation',
                expression: 'null',
                isNull: true
            };

            expect(nullInterpolation.isNull).toBe(true);
            expect(nullInterpolation.expression).toBe('null');
        });

        it('should create logical AND interpolation', () => {
            const logicalInterpolation: TSMInterpolation = {
                type: 'TSMInterpolation',
                expression: 'user.active',
                isLogical: true
            };

            expect(logicalInterpolation.isLogical).toBe(true);
        });

        it('should create comment line', () => {
            const commentLine: TSMLine = {
                type: 'TSMLine',
                chunks: [{
                    type: 'TSMTextChunk',
                    content: '// This is a comment'
                }],
                isComment: true
            };

            expect(commentLine.isComment).toBe(true);
        });

        it('should create empty line', () => {
            const emptyLine: TSMLine = {
                type: 'TSMLine',
                chunks: [{
                    type: 'TSMTextChunk',
                    content: '   \n'
                }],
                isEmpty: true
            };

            expect(emptyLine.isEmpty).toBe(true);
        });
    });
});
