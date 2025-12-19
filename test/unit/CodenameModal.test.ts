/**
 * Tests for CodenameModal
 * Tests codename generation, input, and submission
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App, Notice } from '../../test/mocks/obsidian';
import { CodenameModal } from '../../src/views/CodenameModal';

// Mock Obsidian globals
global.Notice = Notice;

describe('CodenameModal', () => {
    let modal: CodenameModal;
    let mockApp: App;
    let onSubmitCallback: vi.Mock;
    let mockLLMService: any;

    beforeEach(() => {
        mockApp = {} as any;
        onSubmitCallback = vi.fn();
        mockLLMService = {
            isAvailable: vi.fn().mockReturnValue(true),
            complete: vi.fn().mockResolvedValue('TestCodename'),
        };
    });

    describe('constructor', () => {
        it('should create modal instance', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback);

            expect(modal).toBeInstanceOf(CodenameModal);
            expect(modal.app).toBe(mockApp);
        });

        it('should store callback function', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback);

            expect((modal as any).onSubmit).toBe(onSubmitCallback);
        });

        it('should store current codename if provided', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, 'ExistingCodename');

            expect((modal as any).currentCodename).toBe('ExistingCodename');
        });

        it('should store idea body if provided', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, undefined, 'Idea body text');

            expect((modal as any).ideaBody).toBe('Idea body text');
        });

        it('should store LLM service if provided', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, undefined, undefined, mockLLMService);

            expect((modal as any).llmService).toBe(mockLLMService);
        });
    });

    describe('onOpen', () => {
        it('should create modal UI elements', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback);
            modal.onOpen();

            expect(modal.contentEl.children.length).toBeGreaterThan(0);
        });

        it('should create input field', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback);
            modal.onOpen();

            const inputEl = (modal as any).inputEl;
            expect(inputEl).toBeDefined();
            if (inputEl) {
                expect(inputEl.placeholder).toBe('Enter codename...');
            }
        });

        it('should pre-fill input with current codename', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, 'ExistingCodename');
            modal.onOpen();

            const inputEl = (modal as any).inputEl;
            expect(inputEl.value).toBe('ExistingCodename');
        });

        it('should show Generate button when LLM is available and idea body provided', async () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, undefined, 'Idea body', mockLLMService);
            modal.onOpen();
            
            // Wait a bit for auto-generation to potentially start, then check
            await new Promise(resolve => setTimeout(resolve, 5));
            
            const generateButton = (modal as any).generateButton;
            expect(generateButton).toBeDefined();
            if (generateButton) {
                // Button text might be "Generate" or "Regenerate" or "Generating..." depending on state
                expect(['Generate', 'Regenerate', 'Generating...']).toContain(generateButton.textContent);
            }
        });

        it('should show Regenerate button when current codename exists', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, 'ExistingCodename', 'Idea body', mockLLMService);
            modal.onOpen();

            const generateButton = (modal as any).generateButton;
            expect(generateButton.textContent).toBe('Regenerate');
        });

        it('should not show Generate button when LLM is not available', () => {
            const unavailableLLM = {
                isAvailable: vi.fn().mockReturnValue(false),
            };
            modal = new CodenameModal(mockApp, onSubmitCallback, undefined, 'Idea body', unavailableLLM);
            modal.onOpen();

            const generateButton = (modal as any).generateButton;
            expect(generateButton).toBeUndefined();
        });

        it('should show Clear button when current codename exists', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, 'ExistingCodename');
            modal.onOpen();

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const clearButton = buttons.find(btn => btn.textContent === 'Clear');
            expect(clearButton).toBeDefined();
        });

        it('should not show Clear button when no current codename', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback);
            modal.onOpen();

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const clearButton = buttons.find(btn => btn.textContent === 'Clear');
            expect(clearButton).toBeUndefined();
        });

        it('should auto-generate codename if none exists and LLM is available', async () => {
            modal = new CodenameModal(mockApp, onSubmitCallback, undefined, 'Idea body', mockLLMService);
            
            modal.onOpen();
            // Wait for auto-generation
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockLLMService.complete).toHaveBeenCalled();
        });
    });

    describe('handleGenerate', () => {
        beforeEach(() => {
            modal = new CodenameModal(mockApp, onSubmitCallback, undefined, 'Idea body', mockLLMService);
            modal.onOpen();
        });

        it('should generate codename using LLM', async () => {
            await (modal as any).handleGenerate();

            expect(mockLLMService.complete).toHaveBeenCalled();
            const inputEl = (modal as any).inputEl;
            expect(inputEl.value).toBe('TestCodename');
        });

        it('should disable input and button during generation', async () => {
            const generatePromise = (modal as any).handleGenerate();
            
            const inputEl = (modal as any).inputEl;
            const generateButton = (modal as any).generateButton;
            
            // Check that they're disabled during generation
            expect(inputEl.disabled).toBe(true);
            expect(generateButton.disabled).toBe(true);
            
            await generatePromise;
        });

        it('should handle generation errors gracefully', async () => {
            mockLLMService.complete = vi.fn().mockRejectedValue(new Error('Generation failed'));
            
            await (modal as any).handleGenerate();

            const inputEl = (modal as any).inputEl;
            expect(inputEl.placeholder).toBe('Enter codename...');
        });

        it('should not generate if already generating', async () => {
            // Set isGenerating before calling handleGenerate
            (modal as any).isGenerating = true;
            
            // Reset the mock to clear any previous calls
            mockLLMService.complete.mockClear();
            
            await (modal as any).handleGenerate();

            expect(mockLLMService.complete).not.toHaveBeenCalled();
        });

        it('should clean and validate generated codename', async () => {
            mockLLMService.complete = vi.fn().mockResolvedValue('  "TestCodename"  \n');
            
            await (modal as any).handleGenerate();

            const inputEl = (modal as any).inputEl;
            expect(inputEl.value).toBe('TestCodename');
        });
    });

    describe('handleSubmit', () => {
        beforeEach(() => {
            modal = new CodenameModal(mockApp, onSubmitCallback);
            modal.onOpen();
        });

        it('should call callback with input value', () => {
            (modal as any).inputEl.value = 'TestCodename';
            
            const closeSpy = vi.spyOn(modal, 'close');
            (modal as any).handleSubmit();

            expect(onSubmitCallback).toHaveBeenCalledWith('TestCodename');
            expect(closeSpy).toHaveBeenCalled();
        });

        it('should trim input value', () => {
            (modal as any).inputEl.value = '  TestCodename  ';
            
            (modal as any).handleSubmit();

            expect(onSubmitCallback).toHaveBeenCalledWith('TestCodename');
        });
    });

    describe('handleClear', () => {
        beforeEach(() => {
            modal = new CodenameModal(mockApp, onSubmitCallback, 'ExistingCodename');
            modal.onOpen();
        });

        it('should call callback with empty string', () => {
            const closeSpy = vi.spyOn(modal, 'close');
            (modal as any).handleClear();

            expect(onSubmitCallback).toHaveBeenCalledWith('');
            expect(closeSpy).toHaveBeenCalled();
        });
    });

    describe('keyboard shortcuts', () => {
        beforeEach(() => {
            modal = new CodenameModal(mockApp, onSubmitCallback);
            modal.onOpen();
        });

        it('should submit on Enter key', () => {
            (modal as any).inputEl.value = 'TestCodename';
            const handleSubmitSpy = vi.spyOn(modal as any, 'handleSubmit');

            const event = {
                key: 'Enter',
                preventDefault: vi.fn(),
            } as any;
            
            // Simulate keydown event - get handlers from eventListeners map
            const inputEl = (modal as any).inputEl;
            const keydownHandlers = (inputEl.eventListeners?.get('keydown') || []);
            keydownHandlers.forEach((handler: any) => handler(event));

            expect(handleSubmitSpy).toHaveBeenCalled();
        });

        it('should close on Escape key', () => {
            const closeSpy = vi.spyOn(modal, 'close');

            const event = {
                key: 'Escape',
                preventDefault: vi.fn(),
            } as any;
            
            // Simulate keydown event - get handlers from eventListeners map
            const inputEl = (modal as any).inputEl;
            const keydownHandlers = (inputEl.eventListeners?.get('keydown') || []);
            keydownHandlers.forEach((handler: any) => handler(event));

            expect(closeSpy).toHaveBeenCalled();
        });
    });

    describe('onClose', () => {
        it('should clear content on close', () => {
            modal = new CodenameModal(mockApp, onSubmitCallback);
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();

            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});

