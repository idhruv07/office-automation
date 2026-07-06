// convert_docx.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mammoth = require("mammoth");

const docxPath = "D:\\Office Automation\\temp_conversions\\Office Note_TEC & FEC.docx";
const outputDir = path.join(__dirname, "extracted_images");

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Define custom style map based on extraction findings
const customStyleMap = [
    "p[style-name='Normal'] => p:fresh",
    "p[style-name='Body Text'] => p:fresh",
    "p[alignment='center'] => p.text-center",
    "p[alignment='both'] => p.text-justify",
    "p[alignment='start'] => p.text-left",
    "p[alignment='right'] => p.text-right",
    // Appending Bootstrap-like classes so table borders and structure are respected
    "table => table.table.table-bordered" 
];

const extractedImages = [];

// 2. Configure Mammoth options
const options = {
    styleMap: customStyleMap,
    convertImage: mammoth.images.imgElement(function(image) {
        return image.readAsBuffer().then(function(imageBuffer) {
            // Hash the image for uniqueness/later checks
            const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
            
            const extension = image.contentType.split("/")[1] || "png";
            const filename = `image_${hash.substring(0, 8)}.${extension}`;
            const filepath = path.join(outputDir, filename);
            
            // Save the buffer to disk
            fs.writeFileSync(filepath, imageBuffer);
            
            // Log for summary report
            extractedImages.push({
                filename,
                hash,
                contentType: image.contentType,
                size: imageBuffer.length
            });
            
            // Return the src mapping for the HTML output
            return { src: `extracted_images/${filename}` };
        });
    })
};

// 3. Execute Conversion
mammoth.convertToHtml({ path: docxPath }, options)
    .then(function(result) {
        const html = result.value; 
        const messages = result.messages; // warnings/errors
        
        console.log("=== Conversion Successful ===");
        if (messages.length > 0) {
            console.log("\nWarnings:", messages);
        }
        
        console.log("\n=== Extracted Images ===");
        console.table(extractedImages);
        
        // Save the resulting HTML
        const htmlOutput = path.join(__dirname, "output.html");
        fs.writeFileSync(htmlOutput, html);
        console.log(`\nHTML output saved to: ${htmlOutput}`);
        console.log("\n--- HTML Preview (First 500 chars) ---");
        console.log(html.substring(0, 500) + "...\n");
    })
    .catch(function(error) {
        console.error("Conversion failed:", error);
    });
