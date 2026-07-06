const PgBoss = require('pg-boss');

const connectionString = 'postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db';

const queue = new PgBoss(connectionString);

queue.on('error', error => console.error('pg-boss error:', error));

queue.startWorker = async () => {
    const { processDocumentJob } = require('./importer');
    await queue.work('document-import', async (jobs) => { 
        // pg-boss 10.4.2 passes an array of jobs if you use batchSize, or a single job array.
        const jobArray = Array.isArray(jobs) ? jobs : [jobs];
        for (const job of jobArray) {
            const data = job.data;
            // Guard: skip malformed jobs that are missing required fields
            if (!data || !data.filePath) {
                console.warn(`[document-import] Skipping job ${job.id} — missing filePath in data:`, JSON.stringify(data));
                continue;
            }
            console.log(`[document-import] Received job ${job.id} for file: ${data.filePath}`);
            try {
                await processDocumentJob(job);
            } catch (err) {
                console.error(`[document-import] Job ${job.id} failed:`, err.message);
                throw err; // re-throw so pg-boss marks it failed/retry
            }
        }
    });
    console.log('Worker for document-import registered successfully.');
};

module.exports = queue;
