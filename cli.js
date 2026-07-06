#!/usr/bin/env node
require('dotenv').config();
const { program } = require('commander');
const { runScanner } = require('./workers/scanner');
const { runWorker } = require('./workers/converter');
const db = require('./config/db');

program
    .version('1.0.0')
    .description('Office Automation CLI Utility');

program
    .command('import-scan <directory>')
    .description('Recursively scan a directory and queue documents for import')
    .action(async (directory) => {
        try {
            console.log(`Starting scan on: ${directory}`);
            await runScanner(directory);
            console.log('Scan completed successfully.');
            process.exit(0);
        } catch (err) {
            console.error('Scan failed:', err);
            process.exit(1);
        }
    });

program
    .command('run-converter')
    .description('Start the background conversion worker (processes queued import jobs)')
    .action(async () => {
        try {
            console.log('Starting background conversion worker...');
            await runWorker();
        } catch (err) {
            console.error('Conversion worker crashed:', err);
            process.exit(1);
        }
    });

program.parse(process.argv);
