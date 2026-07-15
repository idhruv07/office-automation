/**
 * Backup Script for Office Automation Database and Storage Folders
 * 
 * This script:
 * 1. Automatically dumps the complete PostgreSQL database (schema + data) from the Docker container.
 * 2. Compresses the SQL dump using gzip format to save space and fit within GitHub file size limits.
 * 3. Zips all static files, user uploads, HTML snapshots, and converted PDFs from `/server/storage` and `/public/storage`.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { exec } = require('child_process');
const AdmZip = require('adm-zip');

if (fs.existsSync('.env')) {
    require('dotenv').config();
}

const dbConfig = {
    user: process.env.REPO_DB_USER || 'postgres',
    database: process.env.REPO_DB_NAME || 'repo_db',
    password: process.env.REPO_DB_PASSWORD || 'postgrespassword',
};

const sqlTempPath = path.join(__dirname, 'repo_db_complete_backup.sql');
const sqlGzipPath = path.join(__dirname, 'repo_db_complete_backup.sql.gz');
const zipOutputPath = path.join(__dirname, 'storage_backup.zip');

async function main() {
    console.log('====================================================');
    console.log('  Office Automation - Database & Storage Backup     ');
    console.log('====================================================\n');

    // Step 1: Database SQL Dump via Docker container
    console.log('Step 1: Exporting database dump via Docker container...');
    const dockerCmd = `docker exec -e PGPASSWORD=${dbConfig.password} office_repo_db pg_dump -U ${dbConfig.user} -d ${dbConfig.database} --clean --if-exists --inserts > "${sqlTempPath}"`;
    
    await runCommand(dockerCmd);
    console.log('SQL dump successfully created.');

    // Step 2: Convert encoding and Gzip SQL Dump
    console.log('\nStep 2: Compressing SQL dump into gzip format...');
    // Resolve possible Windows PowerShell UTF-16LE redirection encoding issue
    let sqlContent;
    try {
        sqlContent = fs.readFileSync(sqlTempPath, 'utf16le');
        // If it successfully read as UTF-16, write it back as standard UTF-8
        fs.writeFileSync(sqlTempPath, sqlContent, 'utf8');
    } catch (e) {
        // Already UTF-8 or standard ASCII, do nothing
    }

    await compressFile(sqlTempPath, sqlGzipPath);
    console.log('Compression complete. Created: repo_db_complete_backup.sql.gz');

    // Cleanup uncompressed temp file
    if (fs.existsSync(sqlTempPath)) {
        fs.unlinkSync(sqlTempPath);
    }

    // Step 3: Archive Storage Folders
    console.log('\nStep 3: Archiving user files and document storage folders...');
    const zip = new AdmZip();
    
    const serverStoragePath = path.join(__dirname, 'server', 'storage');
    const publicStoragePath = path.join(__dirname, 'public', 'storage');

    if (fs.existsSync(serverStoragePath)) {
        console.log(`Adding server storage files from: ${serverStoragePath}`);
        zip.addLocalFolder(serverStoragePath, 'server/storage');
    }
    if (fs.existsSync(publicStoragePath)) {
        console.log(`Adding public storage files from: ${publicStoragePath}`);
        zip.addLocalFolder(publicStoragePath, 'public/storage');
    }

    console.log('Writing storage zip file...');
    zip.writeZip(zipOutputPath);
    console.log(`Zip archive successfully created: ${zipOutputPath}\n`);

    console.log('====================================================');
    console.log('  Backup Completed Successfully!                    ');
    console.log('  Files ready to commit & sync to Live Server.      ');
    console.log('====================================================');
}

function runCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(stderr || err.message));
            } else {
                resolve(stdout);
            }
        });
    });
}

function compressFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const gzip = zlib.createGzip();
        const source = fs.createReadStream(inputPath);
        const destination = fs.createWriteStream(outputPath);

        source.pipe(gzip).pipe(destination);
        destination.on('finish', resolve);
        destination.on('error', reject);
        gzip.on('error', reject);
        source.on('error', reject);
    });
}

main().catch(console.error);
