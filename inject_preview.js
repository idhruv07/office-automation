const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const { Pool } = require('pg');

const docxPath = "D:\\Office Automation\\temp_conversions\\Office Note_TEC & FEC.docx";

// Connect to Docker repo_db
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'repo_db',
  password: 'postgrespassword',
  port: 5433,
});

const customStyleMap = [
    "p[style-name='Normal'] => p:fresh",
    "p[style-name='Body Text'] => p:fresh",
    "table => table.table.table-bordered"
];

const options = {
    styleMap: customStyleMap,
    convertImage: mammoth.images.imgElement(function(image) {
        return image.read("base64").then(function(imageBuffer) {
            return {
                src: "data:" + image.contentType + ";base64," + imageBuffer
            };
        });
    })
};

async function run() {
    try {
        console.log("Converting document...");
        const result = await mammoth.convertToHtml({path: docxPath}, options);
        let html = result.value;
        
        // Wrap in a div with basic styling for better viewing
        html = `<div style="padding: 20px; font-family: Arial, sans-serif;">${html}</div>`;

        console.log("Inserting into database...");
        
        // 1. Insert Document into Circulars (folder_id = 2), owner_office_id = 1 (Headquarters)
        const docRes = await pool.query(
            `INSERT INTO documents (folder_id, title, reference_no, status, owner_type, owner_office_id)
             VALUES (2, 'TEST PREVIEW: Office Note TEC & FEC', 'TEST-001', 'active', 'office', 1)
             RETURNING id`
        );
        const docId = docRes.rows[0].id;
        
        // 2. Insert Page
        const pageRes = await pool.query(
            `INSERT INTO document_pages (document_id, sequence_no, page_date, html_content)
             VALUES ($1, 1, CURRENT_DATE, $2)
             RETURNING id`,
            [docId, html]
        );
        const pageId = pageRes.rows[0].id;
        
        // 3. Insert Version
        // We will assign edited_by to 103 (dhruv) just so it has an author
        await pool.query(
            `INSERT INTO document_page_versions (page_id, version, html_content, diff_summary, edited_by)
             VALUES ($1, 1, $2, 'Initial Mammoth Extraction Test', 103)`,
            [pageId, html]
        );
        
        console.log(`\n✅ Success!`);
        console.log(`Document ID ${docId} created.`);
        console.log(`Go to http://localhost:3000 -> Document Repository -> Circulars`);
        console.log(`Click on 'TEST PREVIEW: Office Note TEC & FEC' to see it!`);
        
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
