/**
 * Installation and Restore Script for Live Server
 * 
 * This script:
 * 1. Checks and loads the database environment configuration.
 * 2. Natively decompresses `repo_db_complete_backup.sql.gz` using Node zlib.
 * 3. Restores the complete schema, data, and vector database to the PostgreSQL database.
 * 4. Automatically detects and supports Docker container restoration, local psql restoration, and Node client batch execution as a fallback.
 * 5. Cleans up the temporary SQL dump file.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');

// Load environment variables if .env file exists
if (fs.existsSync('.env')) {
    require('dotenv').config();
}

const dbConfig = {
    user: process.env.REPO_DB_USER || 'postgres',
    host: process.env.REPO_DB_HOST || '127.0.0.1',
    database: process.env.REPO_DB_NAME || 'repo_db',
    password: process.env.REPO_DB_PASSWORD || 'postgrespassword',
    port: parseInt(process.env.REPO_DB_PORT) || 5433,
};

const gzippedPath = path.join(__dirname, 'repo_db_complete_backup.sql.gz');
const decompressedPath = path.join(__dirname, 'repo_db_complete_backup.sql');

async function main() {
    console.log('====================================================');
    console.log('  Office Automation - Database Restore & Installer  ');
    console.log('====================================================\n');

    if (!fs.existsSync(gzippedPath)) {
        console.error(`Error: Backup file not found at ${gzippedPath}`);
        process.exit(1);
    }

    // Step 1: Decompress Gzipped Backup
    console.log('Step 1: Decompressing database backup file...');
    try {
        await decompressFile(gzippedPath, decompressedPath);
        console.log(`Decompression complete. Temp file created: ${decompressedPath}\n`);
    } catch (err) {
        console.error('Failed to decompress database backup:', err);
        process.exit(1);
    }

    // Step 2: Restore Database
    console.log('Step 2: Restoring schema, data, and vector embeddings to database...');
    console.log(`Target Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`);
    
    try {
        await restoreDatabase();
        console.log('\nRestore completed successfully!\n');
    } catch (err) {
        console.error('\nRestore failed:', err);
        cleanupTempFile();
        process.exit(1);
    }

    // Step 3: Decompress Storage Files
    const zipOutputPath = path.join(__dirname, 'storage_backup.zip');
    if (fs.existsSync(zipOutputPath)) {
        console.log('Step 3: Restoring user storage files and documents...');
        try {
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(zipOutputPath);
            zip.extractAllTo(__dirname, true);
            console.log('Storage files successfully restored!\n');
        } catch (err) {
            console.error('Failed to extract storage files:', err);
            cleanupTempFile();
            process.exit(1);
        }
    } else {
        console.log('Step 3: No storage_backup.zip found. Skipping storage files restore.\n');
    }

    // Step 4: Cleanup
    console.log('Step 4: Cleaning up temporary decompressed files...');
    cleanupTempFile();
    console.log('Cleanup complete.');
    console.log('====================================================');
    console.log('  Installation Completed Successfully!              ');
    console.log('====================================================');
}

function decompressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const gzip = zlib.createGunzip();
        const source = fs.createReadStream(inputPath);
        const destination = fs.createWriteStream(outputPath);

        source.pipe(gzip).pipe(destination);
        destination.on('finish', resolve);
        destination.on('error', reject);
        gzip.on('error', reject);
        source.on('error', reject);
    });
}

function cleanupTempFile() {
    if (fs.existsSync(decompressedPath)) {
        fs.unlinkSync(decompressedPath);
    }
}

function restoreDatabase() {
    return new Promise(async (resolve, reject) => {
        // Option A: Try to restore via running Docker container (if applicable)
        console.log('Checking for active office_repo_db Docker container...');
        const isDockerRunning = await checkDockerContainer('office_repo_db');
        if (isDockerRunning) {
            console.log('Found running Docker container: office_repo_db. Restoring database inside Docker...');
            const dockerCmd = `docker exec -i office_repo_db psql -U ${dbConfig.user} -d ${dbConfig.database} < "${decompressedPath}"`;
            exec(dockerCmd, (err, stdout, stderr) => {
                if (err) {
                    console.warn('Docker restore warning:', stderr || err.message);
                    console.log('Retrying with alternative method...');
                } else {
                    console.log('Docker restore finished successfully!');
                    return resolve();
                }
                fallbackLocalRestore(resolve, reject);
            });
            return;
        }

        fallbackLocalRestore(resolve, reject);
    });
}

function fallbackLocalRestore(resolve, reject) {
    // Option B: Try to restore using local psql command line utility
    console.log('Checking for local psql installation...');
    exec('psql --version', { env: { ...process.env, PGPASSWORD: dbConfig.password } }, (err) => {
        if (!err) {
            console.log('Found local psql command. Restoring database...');
            const localCmd = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -d ${dbConfig.database} -f "${decompressedPath}"`;
            exec(localCmd, { env: { ...process.env, PGPASSWORD: dbConfig.password } }, (errRestore, stdout, stderr) => {
                if (errRestore) {
                    console.error('psql restore error:', stderr || errRestore.message);
                    return reject(new Error('Local psql restore failed'));
                }
                console.log('Local psql restore finished successfully!');
                resolve();
            });
            return;
        }

        // Option C: Fallback to Pg client query execute
        console.log('psql command not found. Falling back to executing query strings via node pg pool (this might take several minutes)...');
        executeSqlChunks(resolve, reject);
    });
}

async function executeSqlChunks(resolve, reject) {
    const { Client } = require('pg');
    const client = new Client({
        user: dbConfig.user,
        host: dbConfig.host,
        database: dbConfig.database,
        password: dbConfig.password,
        port: dbConfig.port,
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL. Parsing SQL file...');
        
        // Read file line by line to compile queries
        const sqlContent = fs.readFileSync(decompressedPath, 'utf8');
        
        // Split by standard INSERT/CREATE statements.
        // For standard dumps, commands end with a semicolon at the end of the line
        const lines = sqlContent.split('\n');
        let currentQuery = '';
        let count = 0;

        console.log('Executing SQL statements...');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('--') || line.startsWith('\\')) continue;

            currentQuery += '\n' + lines[i];

            if (line.endsWith(';')) {
                try {
                    await client.query(currentQuery);
                    count++;
                    if (count % 500 === 0) {
                        console.log(`Executed ${count} statements...`);
                    }
                } catch (queryErr) {
                    // Ignore minor drop errors
                    if (!currentQuery.includes('DROP')) {
                        console.warn(`Warning executing statement: ${queryErr.message}\nQuery: ${currentQuery.substring(0, 100)}...`);
                    }
                }
                currentQuery = '';
            }
        }

        console.log(`Executed total of ${count} statements successfully.`);
        await client.end();
        resolve();
    } catch (err) {
        try { await client.end(); } catch (e) {}
        reject(err);
    }
}

function checkDockerContainer(containerName) {
    return new Promise((resolve) => {
        exec(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, (err, stdout) => {
            if (err || !stdout.trim()) {
                resolve(false);
            } else {
                resolve(stdout.trim().includes(containerName));
            }
        });
    });
}

if (require.main === module) {
    main();
}
