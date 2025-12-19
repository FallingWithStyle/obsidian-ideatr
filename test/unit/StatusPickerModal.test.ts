/**
 * Tests for StatusPickerModal
 * Tests status selection and modal behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../../test/mocks/obsidian';
import { StatusPickerModal, IdeaStatus } from '../../src/views/StatusPickerModal';

describe('StatusPickerModal', () => {
    let modal: StatusPickerModal;
    let mockApp: App;
    let onSelectCallback: vi.Mock;

    beforeEach(() => {
        mockApp = {} as any;
        onSelectCallback = vi.fn();
    });

    describe('constructor', () => {
        it('should create modal instance', () => {
            modal = new StatusPickerModal(mockApp, 'captured', onSelectCallback);

            expect(modal).toBeInstanceOf(StatusPickerModal);
            expect(modal.app).toBe(mockApp);
        });

        it('should store current status', () => {
            modal = new StatusPickerModal(mockApp, 'validated', onSelectCallback);

            expect((modal as any).currentStatus).toBe('validated');
        });

        it('should store callback function', () => {
            modal = new StatusPickerModal(mockApp, 'captured', onSelectCallback);

            expect((modal as any).onSelect).toBe(onSelectCallback);
        });

        it('should work without callback', () => {
            modal = new StatusPickerModal(mockApp, 'captured');

            expect((modal as any).onSelect).toBeUndefined();
        });
    });

    describe('onOpen', () => {
        beforeEach(() => {
            modal = new StatusPickerModal(mockApp, 'captured', onSelectCallback);
        });

        it('should create modal UI elements', () => {
            modal.onOpen();

            expect(modal.contentEl.children.length).toBeGreaterThan(0);
        });

        it('should display current status', () => {
            modal.onOpen();

            // Check if description element exists with the status text
            const description = modal.contentEl.querySelector('.ideatr-modal-description');
            if (description) {
                expect(description.textContent).toContain('Current status: captured');
            } else {
                // Fallback: check all text content
                const allText = (modal.contentEl as any).textContent || '';
                expect(allText).toContain('Current status: captured');
            }
        });

        it('should create status options for all statuses', () => {
            modal.onOpen();

            const statusItems = modal.contentEl.querySelectorAll('.ideatr-status-item');
            expect(statusItems.length).toBe(4); // captured, validated, promoted, archived
        });

        it('should pre-select current status', () => {
            modal = new StatusPickerModal(mockApp, 'validated', onSelectCallback);
            modal.onOpen();

            expect((modal as any).selectedStatus).toBe('validated');
        });

        it('should create Apply button', () => {
            modal.onOpen();

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const applyButton = buttons.find(btn => btn.textContent === 'Apply');
            expect(applyButton).toBeDefined();
        });

        it('should create Cancel button', () => {
            modal.onOpen();

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const cancelButton = buttons.find(btn => btn.textContent === 'Cancel');
            expect(cancelButton).toBeDefined();
        });
    });

    describe('status selection', () => {
        beforeEach(() => {
            modal = new StatusPickerModal(mockApp, 'captured', onSelectCallback);
            modal.onOpen();
        });

        it('should call callback with selected status when Apply is clicked', () => {
            // Select a different status
            (modal as any).selectedStatus = 'validated';

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const applyButton = buttons.find(btn => btn.textContent === 'Apply');
            
            if (applyButton) {
                const closeSpy = vi.spyOn(modal, 'close');
                applyButton.click();

                expect(onSelectCallback).toHaveBeenCalledWith('validated');
                expect(closeSpy).toHaveBeenCalled();
            } else {
                throw new Error('Apply button not found');
            }
        });

        it('should not call callback if no status is selected', () => {
            (modal as any).selectedStatus = null;

            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const applyButton = buttons.find(btn => btn.textContent === 'Apply');
            
            if (applyButton) {
                applyButton.click();
                expect(onSelectCallback).not.toHaveBeenCalled();
            } else {
                throw new Error('Apply button not found');
            }
        });

        it('should close modal when Cancel is clicked', () => {
            const buttons = Array.from(modal.contentEl.querySelectorAll('button')) as any[];
            const cancelButton = buttons.find(btn => btn.textContent === 'Cancel');
            
            if (cancelButton) {
                const closeSpy = vi.spyOn(modal, 'close');
                cancelButton.click();

                expect(closeSpy).toHaveBeenCalled();
                expect(onSelectCallback).not.toHaveBeenCalled();
            } else {
                throw new Error('Cancel button not found');
            }
        });
    });

    describe('onClose', () => {
        it('should clear content on close', () => {
            modal = new StatusPickerModal(mockApp, 'captured', onSelectCallback);
            modal.onOpen();
            expect(modal.contentEl.children.length).toBeGreaterThan(0);

            modal.onClose();

            expect(modal.contentEl.children.length).toBe(0);
        });
    });
});

