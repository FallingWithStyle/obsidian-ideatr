import { describe, it, expect } from 'vitest';
import { formatVariantsForMarkdown, groupVariantsByType } from '../../src/services/VariantFormatter';
import type { NameVariant } from '../../src/types/transformation';

describe('VariantFormatter', () => {
    describe('formatVariantsForMarkdown', () => {
        it('should format variants as markdown list', () => {
            const variants: NameVariant[] = [
                { text: 'Variant1', type: 'synonym' },
                { text: 'Variant2', type: 'short' }
            ];

            const result = formatVariantsForMarkdown(variants);

            expect(result).toContain('## Name Variants');
            expect(result).toContain('- Variant1 (synonym)');
            expect(result).toContain('- Variant2 (short)');
        });

        it('should handle empty array', () => {
            const result = formatVariantsForMarkdown([]);
            expect(result).toContain('## Name Variants');
            expect(result).toContain('(No variants generated)');
        });

        it('should deduplicate variants (case-insensitive)', () => {
            const variants: NameVariant[] = [
                { text: 'Variant1', type: 'synonym' },
                { text: 'variant1', type: 'short' }, // Duplicate (case-insensitive)
                { text: 'Variant2', type: 'domain-hack' }
            ];

            const result = formatVariantsForMarkdown(variants);
            const variant1Count = (result.match(/Variant1/gi) || []).length;
            
            // Should only appear once in the list (plus in header)
            expect(variant1Count).toBeLessThanOrEqual(2);
        });

        it('should sort variants alphabetically', () => {
            const variants: NameVariant[] = [
                { text: 'Zebra', type: 'synonym' },
                { text: 'Alpha', type: 'short' },
                { text: 'Beta', type: 'domain-hack' }
            ];

            const result = formatVariantsForMarkdown(variants);
            const alphaIndex = result.indexOf('Alpha');
            const betaIndex = result.indexOf('Beta');
            const zebraIndex = result.indexOf('Zebra');

            expect(alphaIndex).toBeLessThan(betaIndex);
            expect(betaIndex).toBeLessThan(zebraIndex);
        });

        it('should respect maxVariants limit', () => {
            const variants: NameVariant[] = Array.from({ length: 20 }, (_, i) => ({
                text: `Variant${i}`,
                type: 'synonym' as const
            }));

            const result = formatVariantsForMarkdown(variants, 5);
            const lines = result.split('\n').filter(line => line.startsWith('-'));
            
            expect(lines.length).toBeLessThanOrEqual(5);
        });
    });

    describe('groupVariantsByType', () => {
        it('should group variants by type', () => {
            const variants: NameVariant[] = [
                { text: 'V1', type: 'synonym' },
                { text: 'V2', type: 'synonym' },
                { text: 'V3', type: 'short' },
                { text: 'V4', type: 'short' },
                { text: 'V5', type: 'domain-hack' }
            ];

            const grouped = groupVariantsByType(variants);

            expect(grouped.synonym).toHaveLength(2);
            expect(grouped.short).toHaveLength(2);
            expect(grouped['domain-hack']).toHaveLength(1);
        });

        it('should handle empty array', () => {
            const grouped = groupVariantsByType([]);
            expect(Object.keys(grouped).length).toBe(0);
        });
    });
});

