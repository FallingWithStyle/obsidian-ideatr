import { Logger } from './logger';

export interface MemorySnapshot {
    timestamp: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    arrayBuffersMB: number;
}

/**
 * Monitor memory usage and detect potential memory leaks
 */
export class MemoryMonitor {
    private snapshots: MemorySnapshot[] = [];
    private maxSnapshots: number = 100;
    private monitoringInterval: NodeJS.Timeout | null = null;

    /**
     * Start monitoring memory usage
     * @param intervalMs - Interval between snapshots in milliseconds (default: 30 seconds)
     */
    startMonitoring(intervalMs: number = 30000): void {
        if (this.monitoringInterval) {
            Logger.warn('Memory monitoring already started');
            return;
        }

        Logger.debug('Starting memory monitoring');
        this.takeSnapshot(); // Initial snapshot

        this.monitoringInterval = setInterval(() => {
            this.takeSnapshot();
            this.checkForLeaks();
        }, intervalMs);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            Logger.debug('Stopped memory monitoring');
        }
    }

    /**
     * Take a memory snapshot
     */
    takeSnapshot(): MemorySnapshot {
        const usage = process.memoryUsage();
        const snapshot: MemorySnapshot = {
            timestamp: Date.now(),
            heapUsedMB: usage.heapUsed / 1024 / 1024,
            heapTotalMB: usage.heapTotal / 1024 / 1024,
            externalMB: usage.external / 1024 / 1024,
            arrayBuffersMB: usage.arrayBuffers / 1024 / 1024
        };

        this.snapshots.push(snapshot);

        // Keep only recent snapshots
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }

        return snapshot;
    }

    /**
     * Check for potential memory leaks
     */
    checkForLeaks(): void {
        if (this.snapshots.length < 10) return;

        const recent = this.snapshots.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];

        const heapGrowthMB = last.heapUsedMB - first.heapUsedMB;
        const timeElapsedMinutes = (last.timestamp - first.timestamp) / 1000 / 60;
        const growthRateMBPerMinute = heapGrowthMB / timeElapsedMinutes;

        // Alert if heap is growing consistently
        if (growthRateMBPerMinute > 1) { // More than 1MB/minute growth
            Logger.warn('Potential memory leak detected:', {
                heapGrowthMB: heapGrowthMB.toFixed(2),
                timeElapsedMinutes: timeElapsedMinutes.toFixed(2),
                growthRateMBPerMinute: growthRateMBPerMinute.toFixed(2)
            });
        }
    }

    /**
     * Get memory usage report
     */
    getReport(): string {
        if (this.snapshots.length === 0) {
            return 'No memory snapshots available';
        }

        const latest = this.snapshots[this.snapshots.length - 1];
        const oldest = this.snapshots[0];
        const growth = latest.heapUsedMB - oldest.heapUsedMB;

        return `Memory Report:
  Current Heap: ${latest.heapUsedMB.toFixed(2)} MB
  Total Heap: ${latest.heapTotalMB.toFixed(2)} MB
  External: ${latest.externalMB.toFixed(2)} MB
  Growth since monitoring started: ${growth.toFixed(2)} MB
  Snapshots collected: ${this.snapshots.length}`;
    }

    /**
     * Get current memory usage
     */
    getCurrentUsage(): MemorySnapshot | null {
        if (this.snapshots.length === 0) {
            return null;
        }
        return this.snapshots[this.snapshots.length - 1];
    }

    /**
     * Clear all snapshots
     */
    clearSnapshots(): void {
        this.snapshots = [];
    }

    /**
     * Check if monitoring is active
     */
    isMonitoring(): boolean {
        return this.monitoringInterval !== null;
    }
}
