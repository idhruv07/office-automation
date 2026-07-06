const fs = require('fs');
const path = require('path');
const PgBoss = require('pg-boss');

const connectionString = 'postgres://postgres:postgrespassword@localhost:5433/repo_db';

async function main() {
    const queue = new PgBoss(connectionString);
    queue.on('error', error => console.error('pg-boss error:', error));

    try {
        await queue.start();
        console.log('pg-boss started for bulk import');

        const tempConversionsDir = path.join(__dirname, '../temp_conversions');
        
        if (!fs.existsSync(tempConversionsDir)) {
            console.error('temp_conversions directory does not exist at:', tempConversionsDir);
            process.exit(1);
        }

        const files = fs.readdirSync(tempConversionsDir);
        let jobsInserted = 0;

        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.docx') {
                const filePath = path.join(tempConversionsDir, file);
                
                // Enqueue job with required importer metadata
                const jobData = {
                    filePath,
                    originalName: file,
                    folderId: 2, // Hardcoded to 'Circulars' for bulk import
                    officeId: 1
                };
                const jobId = await queue.send('document-import', jobData);
                console.log(`Enqueued job ${jobId} for file: ${file}`);
                jobsInserted++;
            }
        }

        console.log(`Successfully enqueued ${jobsInserted} document-import jobs.`);
    } catch (err) {
        console.error('Error during bulk import:', err);
    } finally {
        await queue.stop();
        process.exit(0);
    }
}

main();
