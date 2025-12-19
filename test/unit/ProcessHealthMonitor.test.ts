/**
 * Tests for ProcessHealthMonitor
 * Tests process health tracking and monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
// MVP MODE: ProcessHealthMonitor is not available in MVP version
// import { ProcessHealthMonitor, type ProcessHealth } from '../../src/utils/ProcessHealthMonitor';
import { ChildProcess } from 'child_process';
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

describe.skip('ProcessHealthMonitor', () => {
    // MVP MODE: ProcessHealthMonitor is not available in MVP version
    let monitor: ProcessHealthMonitor;
    let mockProcess: ChildProcess;

    beforeEach(() => {
        monitor = new ProcessHealthMonitor();
        
        // Create mock process
        mockProcess = {
            pid: 12345,
            exitCode: null,
            killed: false
        } as ChildProcess;
    });

    describe('setProcess', () => {
        it('should set the process to monitor', () => {
            monitor.setProcess(mockProcess);
            
            const health = monitor.getHealth();
            expect(health.pid).toBe(12345);
        });

        it('should record start time when setting process', () => {
            const beforeTime = Date.now();
            monitor.setProcess(mockProcess);
            const afterTime = Date.now();
            
            const health = monitor.getHealth();
            expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
            expect(health.uptimeSeconds).toBeLessThanOrEqual((afterTime - beforeTime) / 1000 + 1);
        });

        it('should handle null process', () => {
            monitor.setProcess(null);
            
            const health = monitor.getHealth();
            expect(health.isRunning).toBe(false);
            expect(health.pid).toBeNull();
        });

        it('should reset start time when setting new process', async () => {
            monitor.setProcess(mockProcess);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const health1 = monitor.getHealth();
            monitor.setProcess(mockProcess);
            const health2 = monitor.getHealth();
            
            // Uptime should reset
            expect(health2.uptimeSeconds).toBeLessThan(health1.uptimeSeconds || Infinity);
        });
    });

    describe('getHealth', () => {
        it('should return health status for running process', () => {
            monitor.setProcess(mockProcess);
            
            const health = monitor.getHealth();
            
            expect(health).toHaveProperty('isRunning');
            expect(health).toHaveProperty('pid');
            expect(health).toHaveProperty('memoryUsageMB');
            expect(health).toHaveProperty('cpuUsagePercent');
            expect(health).toHaveProperty('uptimeSeconds');
        });

        it('should report process as running when exitCode is null', () => {
            monitor.setProcess(mockProcess);
            
            const health = monitor.getHealth();
            
            expect(health.isRunning).toBe(true);
            expect(health.pid).toBe(12345);
        });

        it('should report process as not running when exitCode is set', () => {
            mockProcess.exitCode = 0;
            monitor.setProcess(mockProcess);
            
            const health = monitor.getHealth();
            
            expect(health.isRunning).toBe(false);
        });

        it('should return null values when no process is set', () => {
            const health = monitor.getHealth();
            
            expect(health.isRunning).toBe(false);
            expect(health.pid).toBeNull();
            expect(health.memoryUsageMB).toBeNull();
            expect(health.cpuUsagePercent).toBeNull();
            expect(health.uptimeSeconds).toBeNull();
        });

        it('should calculate uptime correctly', async () => {
            monitor.setProcess(mockProcess);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const health = monitor.getHealth();
            
            expect(health.uptimeSeconds).toBeGreaterThan(0);
            expect(health.uptimeSeconds).toBeLessThan(1); // Should be around 0.1 seconds
        });
    });

    describe('isProcessAlive', () => {
        it('should return false when no process is set', () => {
            expect(monitor.isProcessAlive()).toBe(false);
        });

        it('should return false when process has no PID', () => {
            const processWithoutPid = { exitCode: null } as ChildProcess;
            monitor.setProcess(processWithoutPid);
            
            expect(monitor.isProcessAlive()).toBe(false);
        });

        it('should check if process exists using signal 0', () => {
            const originalKill = process.kill;
            const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
            
            monitor.setProcess(mockProcess);
            const isAlive = monitor.isProcessAlive();
            
            expect(killSpy).toHaveBeenCalledWith(12345, 0);
            expect(isAlive).toBe(true);
            
            process.kill = originalKill;
        });

        it('should return false when process does not exist', () => {
            const originalKill = process.kill;
            const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
                throw new Error('Process not found');
            });
            
            monitor.setProcess(mockProcess);
            const isAlive = monitor.isProcessAlive();
            
            expect(isAlive).toBe(false);
            
            process.kill = originalKill;
        });
    });

    describe('logHealth', () => {
        it('should log health status', () => {
            const debugSpy = vi.spyOn(Logger, 'debug');
            
            monitor.setProcess(mockProcess);
            monitor.logHealth();
            
            expect(debugSpy).toHaveBeenCalledWith('Process Health:', expect.any(Object));
        });

        it('should log health even when process is not running', () => {
            const debugSpy = vi.spyOn(Logger, 'debug');
            
            monitor.logHealth();
            
            expect(debugSpy).toHaveBeenCalledWith('Process Health:', expect.objectContaining({
                isRunning: false
            }));
        });
    });

    describe('getStatusString', () => {
        it('should return "Not running" when process is not running', () => {
            const status = monitor.getStatusString();
            
            expect(status).toBe('Not running');
        });

        it('should include PID in status string', () => {
            monitor.setProcess(mockProcess);
            
            const status = monitor.getStatusString();
            
            expect(status).toContain('PID: 12345');
        });

        it('should include uptime in status string', async () => {
            monitor.setProcess(mockProcess);
            
            // Wait a bit for uptime to be meaningful
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const status = monitor.getStatusString();
            
            expect(status).toContain('Uptime:');
        });

        it('should format uptime as minutes and seconds', () => {
            monitor.setProcess(mockProcess);
            
            // Wait 65 seconds (simulated)
            vi.useFakeTimers();
            monitor.setProcess(mockProcess);
            vi.advanceTimersByTime(65000);
            
            const status = monitor.getStatusString();
            
            expect(status).toMatch(/\d+m \d+s/); // Format: "1m 5s"
            
            vi.useRealTimers();
        });

        it('should include memory usage if available', () => {
            // Note: getMemoryUsage returns null in current implementation
            // This test verifies the code path exists
            monitor.setProcess(mockProcess);
            
            const status = monitor.getStatusString();
            
            // Should not throw and should include PID and uptime
            expect(status).toContain('PID:');
        });
    });

    describe('edge cases', () => {
        it('should handle process that exits immediately', () => {
            const exitedProcess = {
                pid: 12345,
                exitCode: 1,
                killed: false
            } as ChildProcess;
            
            monitor.setProcess(exitedProcess);
            
            const health = monitor.getHealth();
            expect(health.isRunning).toBe(false);
        });

        it('should handle process with undefined PID', () => {
            const processWithoutPid = {
                exitCode: null,
                killed: false
            } as ChildProcess;
            
            monitor.setProcess(processWithoutPid);
            
            const health = monitor.getHealth();
            expect(health.pid).toBeNull();
            expect(monitor.isProcessAlive()).toBe(false);
        });

        it('should handle rapid process changes', () => {
            const process1 = { pid: 11111, exitCode: null } as ChildProcess;
            const process2 = { pid: 22222, exitCode: null } as ChildProcess;
            const process3 = { pid: 33333, exitCode: null } as ChildProcess;
            
            monitor.setProcess(process1);
            monitor.setProcess(process2);
            monitor.setProcess(process3);
            
            const health = monitor.getHealth();
            expect(health.pid).toBe(33333);
        });
    });
});

