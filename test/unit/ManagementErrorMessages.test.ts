import { describe, it, expect } from 'vitest';
import { ManagementErrorCode, getManagementErrorMessage } from '../../src/types/management';

describe('getManagementErrorMessage (QA 4.6)', () => {
    it('should return a helpful message for FILE_READ_ERROR', () => {
        const message = getManagementErrorMessage(ManagementErrorCode.FILE_READ_ERROR);
        expect(message).toMatch(/Failed to load ideas/i);
        expect(message).toMatch(/files could not be read/i);
    });

    it('should return a helpful message for DATE_PARSE_ERROR', () => {
        const message = getManagementErrorMessage(ManagementErrorCode.DATE_PARSE_ERROR);
        expect(message).toMatch(/invalid or missing created dates/i);
    });

    it('should return a helpful message for CLUSTERING_TOO_MANY_IDEAS', () => {
        const message = getManagementErrorMessage(ManagementErrorCode.CLUSTERING_TOO_MANY_IDEAS);
        expect(message).toMatch(/Too many ideas/i);
        expect(message).toMatch(/filter/i);
    });

    it('should fall back to a generic message for unknown codes', () => {
        const message = getManagementErrorMessage('UNKNOWN_CODE' as ManagementErrorCode);
        expect(message).toMatch(/unexpected management error/i);
    });
});

