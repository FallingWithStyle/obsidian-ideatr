#!/usr/bin/env node
/**
 * Writes the current timestamp to deploy-timestamp.json
 * Called during the deploy process
 */

const fs = require('fs');
const path = require('path');

const timestamp = new Date().toISOString();
const timestampData = {
    deployedAt: timestamp,
    deployedAtReadable: new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    })
};

const outputPath = path.join(__dirname, '..', 'deploy-timestamp.json');
fs.writeFileSync(outputPath, JSON.stringify(timestampData, null, 2));
console.log(`[Deploy] Wrote deploy timestamp: ${timestampData.deployedAtReadable}`);

