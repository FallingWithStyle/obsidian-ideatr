import { ChildProcess, execSync } from 'child_process';
import { Logger } from './logger';

export interface ProcessHealth {
    isRunning: boolean;
    pid: number | null;
    memoryUsageMB: number | null;
    cpuUsagePercent: number | null;
    uptimeSeconds: number | null;
}

/**
 * Monitor health of child processes (e.g., llama-server)
 */
export class ProcessHealthMonitor {
    private process: ChildProcess | null = null;
    private startTime: number = 0;

    /**
     * Set the process to monitor
     */
    setProcess(process: ChildProcess | null): void {
        this.process = process;
        this.startTime = process ? Date.now() : 0;
    }

    /**
     * Get current health status
     */
    getHealth(): ProcessHealth {
        if (!this.process || this.process.exitCode !== null) {
            return {
                isRunning: false,
                pid: null,
                memoryUsageMB: null,
                cpuUsagePercent: null,
                uptimeSeconds: null
            };
        }

        const uptimeSeconds = (Date.now() - this.startTime) / 1000;

        return {
            isRunning: true,
            pid: this.process.pid || null,
            memoryUsageMB: this.getMemoryUsage(),
            cpuUsagePercent: null, // Would require external monitoring tools
            uptimeSeconds
        };
    }

    /**
     * Get memory usage of the process (platform-specific)
     */
    /**
     * Get memory usage of the process (platform-specific)
     */
    private getMemoryUsage(): number | null {
        if (!this.process || !this.process.pid) return null;

        try {
            // Use ps to get RSS memory in KB
            // -o rss= outputs just the value without header
            // -p <pid> selects the process
            const output = execSync(`ps -o rss= -p ${this.process.pid}`, { 
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'] // Ignore stdin/stderr to prevent hanging
            }).trim();

            if (output) {
                const rssKB = parseInt(output, 10);
                if (!isNaN(rssKB)) {
                    return rssKB / 1024; // Convert to MB
                }
            }
        } catch (error) {
            // Process might have exited or ps failed
            // Logger.debug('Failed to get memory usage:', error);
        }

        return null;
    }

    /**
     * Check if process is still alive
     */
    isProcessAlive(): boolean {
        if (!this.process || !this.process.pid) return false;

        try {
            // Sending signal 0 checks if process exists without killing it
            // Returns true if process exists, false otherwise
            process.kill(this.process.pid, 0);
            return true;
        } catch (error) {
            // Process doesn't exist or we don't have permission
            return false;
        }
    }

    /**
     * Log current health status
     */
    logHealth(): void {
        const health = this.getHealth();
        Logger.debug('Process Health:', health);
    }

    /**
     * Get a human-readable status string
     */
    getStatusString(): string {
        const health = this.getHealth();

        if (!health.isRunning) {
            return 'Not running';
        }

        const parts = [`PID: ${health.pid}`];

        if (health.uptimeSeconds !== null) {
            const minutes = Math.floor(health.uptimeSeconds / 60);
            const seconds = Math.floor(health.uptimeSeconds % 60);
            parts.push(`Uptime: ${minutes}m ${seconds}s`);
        }

        if (health.memoryUsageMB !== null) {
            parts.push(`Memory: ${health.memoryUsageMB.toFixed(1)} MB`);
        }

        return parts.join(', ');
    }
}
