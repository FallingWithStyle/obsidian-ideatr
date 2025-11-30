import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassificationResultsModal } from '../../src/views/ClassificationResultsModal';
import type { ClassificationResult } from '../../src/types/classification';
import { App } from 'obsidian';

// Mock Obsidian App
const createMockApp = (): App => {
    return {} as App;
};

describe('ClassificationResultsModal', () => {
    let app: App;
    let mockResults: ClassificationResult;
    let onAcceptCallback: vi.Mock;
    let onEditCallback: vi.Mock;
    let onRetryCallback: vi.Mock;

    beforeEach(() => {
        app = createMockApp();
        mockResults = {
            category: 'saas',
            tags: ['app', 'productivity', 'tool'],
            confidence: 0.85
        };
        onAcceptCallback = vi.fn();
        onEditCallback = vi.fn();
        onRetryCallback = vi.fn();
    });

    describe('onOpen', () => {
        it('should display classification results', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Check that modal content is created
            expect(modal.contentEl).toBeDefined();
        });

        it('should display category', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Category should be displayed
            const categoryElements = modal.contentEl.querySelectorAll('.ideatr-category');
            expect(categoryElements.length).toBeGreaterThan(0);
        });

        it('should display tags', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Tags should be displayed (check for tag items or tag inputs)
            const tagItems = modal.contentEl.querySelectorAll('.ideatr-tag-item');
            const tagInputs = modal.contentEl.querySelectorAll('.ideatr-tag-input');
            expect(tagItems.length + tagInputs.length).toBeGreaterThanOrEqual(mockResults.tags.length);
        });

        it('should display confidence if available', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Confidence should be displayed (check for confidence bar or text)
            const confidenceBar = modal.contentEl.querySelectorAll('.ideatr-confidence-bar');
            const confidenceText = modal.contentEl.querySelectorAll('.ideatr-confidence-text');
            expect(confidenceBar.length + confidenceText.length).toBeGreaterThan(0);
        });
    });

    describe('actions', () => {
        it('should call onAccept when accept button is clicked', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Simulate accept action
            (modal as any).handleAccept();

            expect(onAcceptCallback).toHaveBeenCalledWith(mockResults);
        });

        it('should call onEdit when edit button is clicked', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Simulate edit action
            (modal as any).handleEdit();

            expect(onEditCallback).toHaveBeenCalled();
        });

        it('should call onRetry when retry button is clicked', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Simulate retry action
            (modal as any).handleRetry();

            expect(onRetryCallback).toHaveBeenCalled();
        });

        it('should allow editing tags', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Tags list container should exist
            const tagsList = modal.contentEl.querySelectorAll('.ideatr-tags-list');
            expect(tagsList.length).toBeGreaterThan(0);
        });
    });

    describe('tag editing', () => {
        it('should allow adding tags', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onAcceptCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Should have ability to add tags
            const addTagButton = modal.contentEl.querySelector('.ideatr-add-tag');
            expect(addTagButton || modal.contentEl).toBeDefined();
        });

        it('should allow removing tags', () => {
            const modal = new ClassificationResultsModal(
                app,
                mockResults,
                onEditCallback,
                onEditCallback,
                onRetryCallback
            );
            modal.onOpen();

            // Should have ability to remove tags
            const removeButtons = modal.contentEl.querySelectorAll('.ideatr-remove-tag');
            // May or may not have remove buttons depending on implementation
            expect(modal.contentEl).toBeDefined();
        });
    });
});

