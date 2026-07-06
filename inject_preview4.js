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

async function run() {
    try {
        const result = await mammoth.convertToHtml({path: docxPath}, {
            styleMap: customStyleMap,
            convertImage: mammoth.images.imgElement(function(image) {
                return image.read("base64").then(function(imageBuffer) {
                    return { src: "data:" + image.contentType + ";base64," + imageBuffer };
                });
            })
        });
        
        let html = result.value;
        
        // 1. Header
        const headerRegex = /<p>.*?<img[^>]+>.*?<\/p>\s*<p>[^<]*<(strong|b)>[^<]*OFFICE OF THE CDA \( IT &amp; SDC\)[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Mornington Road, PAO\(ORs\)AOC Compound,[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Trimulgherry, Secunderabad – 500 015\.[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Email: itsdcsec-cda@nic\.in[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Phone\/ Fax No: 040-27742553\/29805085[^<]*<\/(strong|b)>[^<]*<\/p>/i;
        const replacementHeader = `
        <div class="fwd-letterhead">
          <div class="fwd-lh-img"><img src="/assets/images/placeholder.png" style="background:#eee;width:60px;height:60px;border-radius:50%"></div>
          <div class="fwd-lh-center">
            <div class="fwd-lh-title">OFFICE OF THE CDA ( IT &amp; SDC )</div>
            <div class="fwd-lh-sub">Mornington Road, PAO(ORs)AOC Compound,</div>
            <div class="fwd-lh-sub">Trimulgherry, Secunderabad – 500 015.</div>
            <div class="fwd-lh-email">Email: itsdcsec-cda@nic.in</div>
            <div class="fwd-lh-phone">Phone/ Fax No: 040-27742553/29805085</div>
          </div>
          <div class="fwd-lh-img"><img src="/assets/images/placeholder.png" style="background:#eee;width:60px;height:60px;border-radius:50%"></div>
        </div>`;
        if (headerRegex.test(html)) html = html.replace(headerRegex, replacementHeader);

        // 2. Signature
        // Here we do a generous match for the specific text
        const altSig = /<p>[ \t]*Submitted for approval, please\.[ \t]*<\/p><p>[ \t]*AAO<\/p><p>[ \t]*SAO<\/p><p>[ \t]*JCDA<\/p>/i;
        
        const replacementSig = `
        <div style="margin-top: 40px; text-align: left; padding-left: 5%;">Submitted for approval, please.</div>
        <div style="display: flex; justify-content: flex-end; margin-top: 40px; margin-bottom: 40px; padding-right: 10%;">
           <div style="text-align: center;">
               <div style="font-weight: bold; margin-bottom: 20px;">AAO</div>
               <div style="font-weight: bold; margin-bottom: 20px;">SAO</div>
               <div style="font-weight: bold;">JCDA</div>
           </div>
        </div>
        `;
        
        if (altSig.test(html)) {
            console.log("Alternative signature pattern detected!");
            html = html.replace(altSig, replacementSig);
        } else {
            console.log("Regex failed, doing a brute force string replacement.");
            // Brute force string replacement based on exactly what the CLI dumped earlier:
            const exactHtmlString = "<p>\tSubmitted for approval, please.<br />\t\t\t\t\t\t\t\t\t\t\t\t</p><p>\t\t\t\t\t\t\t\t\t\t\t\tAAO</p><p>SAO</p><p>JCDA</p>";
            if (html.includes(exactHtmlString)) {
                html = html.replace(exactHtmlString, replacementSig);
                console.log("Replaced via exact string match!");
            }
        }

        html = `<div style="padding: 20px; font-family: Arial, sans-serif;">${html}</div>`;

        console.log("Inserting into database...");
        const docRes = await pool.query(
            `INSERT INTO documents (folder_id, title, reference_no, status, owner_type, owner_office_id)
             VALUES (2, 'TEST PREVIEW V4: Perfect Signatures', 'TEST-004', 'active', 'office', 1)
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
             VALUES ($1, 1, $2, 'Mammoth Extraction Test with Normalized Signature', 103)`,
            [pageId, html]
        );
        
        console.log(`\n✅ Success! V4 Created.`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
