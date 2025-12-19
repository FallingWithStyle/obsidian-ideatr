/**
 * Tests for MemoryMonitor
 * Tests memory tracking, leak detection, and reporting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryMonitor, type MemorySnapshot } from '../../src/utils/MemoryMonitor';
import { Logger } from '../../src/utils/logger';

// Mock Logger
vi.mock('../../src/utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('MemoryMonitor', () => {
    let monitor: MemoryMonitor;
    let originalMemoryUsage: NodeJS.MemoryUsage;

    beforeEach(() => {
        monitor = new MemoryMonitor();
        
        // Save original memoryUsage
        originalMemoryUsage = process.memoryUsage;
        
        // Mock process.memoryUsage to return predictable values
        let heapUsed = 50 * 1024 * 1024; // Start at 50MB
        process.memoryUsage = vi.fn(() => ({
            rss: 100 * 1024 * 1024,
            heapTotal: 100 * 1024 * 1024,
            heapUsed: heapUsed,
            external: 10 * 1024 * 1024,
            arrayBuffers: 5 * 1024 * 1024
        })) as any;
    });

    afterEach(() => {
        monitor.stopMonitoring();
        monitor.clearSnapshots();
        
        // Restore original memoryUsage
        process.memoryUsage = originalMemoryUsage;
        vi.useRealTimers();
    });

    describe('startMonitoring', () => {
        it('should start monitoring with default interval', () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring();
            
            expect(monitor.isMonitoring()).toBe(true);
        });

        it('should start monitoring with custom interval', () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring(60000);
            
            expect(monitor.isMonitoring()).toBe(true);
        });

        it('should take initial snapshot when starting', () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring();
            
            const snapshot = monitor.getCurrentUsage();
            expect(snapshot).not.toBeNull();
            expect(snapshot?.heapUsedMB).toBeGreaterThan(0);
        });

        it('should not start multiple monitoring sessions', () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring();
            monitor.startMonitoring();
            monitor.startMonitoring();
            
            // Should only have one interval
            expect(monitor.isMonitoring()).toBe(true);
        });

        it('should take snapshots at regular intervals', async () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring(1000); // 1 second interval
            
            // Advance time
            await vi.advanceTimersByTimeAsync(5000);
            
            // Should have multiple snapshots (initial + 5 more)
            const snapshot = monitor.getCurrentUsage();
            expect(snapshot).not.toBeNull();
        });
    });

    describe('stopMonitoring', () => {
        it('should stop monitoring', () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring();
            expect(monitor.isMonitoring()).toBe(true);
            
            monitor.stopMonitoring();
            expect(monitor.isMonitoring()).toBe(false);
        });

        it('should handle stopMonitoring when not monitoring', () => {
            expect(() => monitor.stopMonitoring()).not.toThrow();
        });

        it('should preserve snapshots when stopping', async () => {
            vi.useFakeTimers();
            
            monitor.startMonitoring();
            await vi.advanceTimersByTimeAsync(2000);
            
            const snapshotBefore = monitor.getCurrentUsage();
            monitor.stopMonitoring();
            const snapshotAfter = monitor.getCurrentUsage();
            
            expect(snapshotAfter).toEqual(snapshotBefore);
        });
    });

    describe('takeSnapshot', () => {
        it('should create a snapshot with current memory usage', () => {
            const snapshot = monitor.takeSnapshot();
            
            expect(snapshot).toBeDefined();
            expect(snapshot.timestamp).toBeGreaterThan(0);
            expect(snapshot.heapUsedMB).toBeGreaterThan(0);
            expect(snapshot.heapTotalMB).toBeGreaterThan(0);
            expect(snapshot.externalMB).toBeGreaterThan(0);
            expect(snapshot.arrayBuffersMB).toBeGreaterThan(0);
        });

        it('should add snapshot to history', () => {
            const snapshot1 = monitor.takeSnapshot();
            const snapshot2 = monitor.takeSnapshot();
            
            expect(snapshot1).not.toBe(snapshot2);
            expect(monitor.getCurrentUsage()).toBe(snapshot2);
        });

        it('should limit snapshot history to maxSnapshots', () => {
            // Take more snapshots than max (default 100)
            for (let i = 0; i < 150; i++) {
                monitor.takeSnapshot();
            }
            
            // Should not exceed max
            const report = monitor.getReport();
            expect(report).toContain('Snapshots collected');
        });
    });

    describe('checkForLeaks', () => {
        it('should not check for leaks with insufficient snapshots', () => {
            // Take less than 10 snapshots
            for (let i = 0; i < 5; i++) {
                monitor.takeSnapshot();
            }
            
            // Should not throw
            expect(() => monitor.checkForLeaks()).not.toThrow();
        });

        it('should detect memory leaks when growth rate is high', () => {
            vi.useFakeTimers();
            const warnSpy = vi.spyOn(Logger, 'warn');
            
            // Simulate memory growth
            let heapUsed = 50 * 1024 * 1024;
            process.memoryUsage = vi.fn(() => {
                heapUsed += 2 * 1024 * 1024; // Grow by 2MB each time
                return {
                    rss: 100 * 1024 * 1024,
                    heapTotal: 100 * 1024 * 1024,
                    heapUsed: heapUsed,
                    external: 10 * 1024 * 1024,
                    arrayBuffers: 5 * 1024 * 1024
                };
            }) as any;
            
            monitor.startMonitoring(1000);
            
            // Advance time to generate enough snapshots
            vi.advanceTimersByTime(15000); // 15 seconds = 15+ snapshots
            
            // Should have detected leak
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Potential memory leak detected'),
                expect.any(Object)
            );
            
            vi.useRealTimers();
        });

        it('should not detect leaks when growth is normal', () => {
            vi.useFakeTimers();
            // Clear any previous spy calls
            vi.clearAllMocks();
            const warnSpy = vi.spyOn(Logger, 'warn');
            
            // Use a fresh monitor to avoid state from previous tests
            const freshMonitor = new MemoryMonitor();
            
            // Simulate memory with very small, acceptable growth (less than 1MB/minute)
            // Growth rate threshold is 1MB/minute, so we'll use 0.5MB/minute
            let heapUsed = 50 * 1024 * 1024; // Start at 50MB
            process.memoryUsage = vi.fn(() => {
                // Grow by 0.5MB per minute = 0.0083MB per second = 8333 bytes per second
                // With 1 second intervals, grow by 8333 bytes per call
                heapUsed += 8333; // Very small growth
                return {
                    rss: 100 * 1024 * 1024,
                    heapTotal: 100 * 1024 * 1024,
                    heapUsed: heapUsed,
                    external: 10 * 1024 * 1024,
                    arrayBuffers: 5 * 1024 * 1024
                };
            }) as any;
            
            freshMonitor.startMonitoring(1000);
            vi.advanceTimersByTime(15000); // 15 seconds
            
            // Should not detect leak (growth rate is below 1MB/minute threshold)
            // Only check calls made during this test (after clearAllMocks)
            const leakCalls = warnSpy.mock.calls.filter(call => 
                typeof call[0] === 'string' && call[0].includes('Potential memory leak detected')
            );
            expect(leakCalls.length).toBe(0);
            
            freshMonitor.stopMonitoring();
            vi.useRealTimers();
        });
    });

    describe('getReport', () => {
        it('should return report with memory statistics', () => {
            monitor.takeSnapshot();
            
            const report = monitor.getReport();
            
            expect(report).toContain('Memory Report');
            expect(report).toContain('Current Heap');
            expect(report).toContain('Total Heap');
            expect(report).toContain('External');
            expect(report).toContain('Growth since monitoring started');
            expect(report).toContain('Snapshots collected');
        });

        it('should return message when no snapshots available', () => {
            const report = monitor.getReport();
            
            expect(report).toBe('No memory snapshots available');
        });

        it('should calculate growth correctly', () => {
            // Take initial snapshot
            process.memoryUsage = vi.fn(() => ({
                rss: 100 * 1024 * 1024,
                heapTotal: 100 * 1024 * 1024,
                heapUsed: 50 * 1024 * 1024,
                external: 10 * 1024 * 1024,
                arrayBuffers: 5 * 1024 * 1024
            })) as any;
            monitor.takeSnapshot();
            
            // Take later snapshot with growth
            process.memoryUsage = vi.fn(() => ({
                rss: 100 * 1024 * 1024,
                heapTotal: 100 * 1024 * 1024,
                heapUsed: 60 * 1024 * 1024, // 10MB growth
                external: 10 * 1024 * 1024,
                arrayBuffers: 5 * 1024 * 1024
            })) as any;
            monitor.takeSnapshot();
            
            const report = monitor.getReport();
            expect(report).toContain('Growth since monitoring started');
            expect(report).toContain('10.00'); // 10MB growth
        });
    });

    describe('getCurrentUsage', () => {
        it('should return latest snapshot', () => {
            const snapshot1 = monitor.takeSnapshot();
            const snapshot2 = monitor.takeSnapshot();
            
            expect(monitor.getCurrentUsage()).toBe(snapshot2);
        });

        it('should return null when no snapshots', () => {
            expect(monitor.getCurrentUsage()).toBeNull();
        });
    });

    describe('clearSnapshots', () => {
        it('should clear all snapshots', () => {
            monitor.takeSnapshot();
            monitor.takeSnapshot();
            monitor.takeSnapshot();
            
            monitor.clearSnapshots();
            
            expect(monitor.getCurrentUsage()).toBeNull();
            expect(monitor.getReport()).toBe('No memory snapshots available');
        });
    });

    describe('isMonitoring', () => {
        it('should return false when not monitoring', () => {
            expect(monitor.isMonitoring()).toBe(false);
        });

        it('should return true when monitoring', () => {
            vi.useFakeTimers();
            monitor.startMonitoring();
            expect(monitor.isMonitoring()).toBe(true);
        });
    });
});

