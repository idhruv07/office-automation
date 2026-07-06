const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const { Pool } = require('pg');

const docxPath = "D:\\Office Automation\\temp_conversions\\Office Note_TEC & FEC.docx";

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
        
        // This regex matches the messy paragraph blocks containing the address.
        const headerRegex = /<p>.*?<img[^>]+>.*?<\/p>\s*<p>[^<]*<(strong|b)>[^<]*OFFICE OF THE CDA \( IT &amp; SDC\)[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Mornington Road, PAO\(ORs\)AOC Compound,[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Trimulgherry, Secunderabad – 500 015\.[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Email: itsdcsec-cda@nic\.in[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Phone\/ Fax No: 040-27742553\/29805085[^<]*<\/(strong|b)>[^<]*<\/p>/i;

        const replacementHeader = `
        <div class="fwd-letterhead">
          <div class="fwd-lh-img"><img src="/assets/images/placeholder.png" alt="Emblem" style="background:#eee;width:60px;height:60px;border-radius:50%"></div>
          <div class="fwd-lh-center">
            <div class="fwd-lh-title">OFFICE OF THE CDA ( IT &amp; SDC )</div>
            <div class="fwd-lh-sub">Mornington Road, PAO(ORs)AOC Compound,</div>
            <div class="fwd-lh-sub">Trimulgherry, Secunderabad – 500 015.</div>
            <div class="fwd-lh-email">Email: itsdcsec-cda@nic.in</div>
            <div class="fwd-lh-phone">Phone/ Fax No: 040-27742553/29805085</div>
          </div>
          <div class="fwd-lh-img"><img src="/assets/images/placeholder.png" alt="Logo Right" style="background:#eee;width:60px;height:60px;border-radius:50%"></div>
        </div>
        `;
        
        if (headerRegex.test(html)) {
            console.log("Header pattern detected! Normalizing...");
            html = html.replace(headerRegex, replacementHeader);
        } else {
            console.log("Header pattern not found (regex failed)");
        }

        // Wrap in a div to simulate the view
        html = `<div style="padding: 20px; font-family: Arial, sans-serif;">${html}</div>`;

        console.log("Inserting into database...");
        
        const docRes = await pool.query(
            `INSERT INTO documents (folder_id, title, reference_no, status, owner_type, owner_office_id)
             VALUES (2, 'TEST PREVIEW V2: Normalized Header', 'TEST-002', 'active', 'office', 1)
             RETURNING id`
        );
        const docId = docRes.rows[0].id;
        
        const pageRes = await pool.query(
            `INSERT INTO document_pages (document_id, sequence_no, page_date, html_content)
             VALUES ($1, 1, CURRENT_DATE, $2)
             RETURNING id`,
            [docId, html]
        );
        const pageId = pageRes.rows[0].id;
        
        await pool.query(
            `INSERT INTO document_page_versions (page_id, version, html_content, diff_summary, edited_by)
             VALUES ($1, 1, $2, 'Mammoth Extraction Test with Normalized Header', 103)`,
            [pageId, html]
        );
        
        console.log(`\n✅ Success! V2 Created.`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
