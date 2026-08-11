/**
 * api/repo/documents.js
 * Document and page listing, retrieval, and basic management
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateToken, authorizeRoleCode } = require('../middleware');

const docController = require('./controllers/documentController');
const wfController = require('./controllers/workflowController');
const transController = require('./controllers/transferController');

// Document & Page retrieval / editing routes
router.get('/documents/recent', authenticateToken, docController.getRecentDocuments);
router.get('/documents', authenticateToken, docController.getDocuments);
router.get('/document/:id/pages', authenticateToken, docController.getDocumentPages);
router.get('/page/:id', authenticateToken, docController.getPage);
router.put('/page/:id', authenticateToken, docController.updatePage);
router.put('/document/:docId/page/:pageId/reorder', authenticateToken, docController.reorderPage);
router.get('/page/:id/versions', authenticateToken, docController.getPageVersions);
router.get('/search', authenticateToken, docController.searchRepository);

// Document transfer routes
router.post('/document/:id/transfer', authenticateToken, authorizeRoleCode(['SYSADMIN', 'OFFICE_ADMIN']), transController.transferDocument);
router.post('/document/:id/transfer/:transferId/reverse', authenticateToken, authorizeRoleCode(['SYSADMIN', 'OFFICE_ADMIN']), transController.reverseTransfer);

// Workflow routes
router.get('/users/role/:role', authenticateToken, wfController.getUsersByRole);
router.get('/documents/:id/workflow', authenticateToken, wfController.getDocumentWorkflow);
router.post('/documents/:id/workflow/action', authenticateToken, wfController.executeWorkflowAction);

// Image drag and drop upload route
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '../../temp_conversions') });
const crypto = require('crypto');
const fs = require('fs-extra');

router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const db = require('../../config/repo_db');
        const tempPath = req.file.path;
        
        // 1. Compute hash of the uploaded image
        const fileBuffer = await fs.readFile(tempPath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.png';
        const filename = `${hash}${ext}`;
        const targetDir = path.join(__dirname, '../../public/storage/shared_assets');
        await fs.ensureDir(targetDir);
        const targetPath = path.join(targetDir, filename);

        // 2. Move file to permanent storage
        if (!await fs.pathExists(targetPath)) {
            await fs.move(tempPath, targetPath);
        } else {
            await fs.remove(tempPath); // Clean up temp file if duplicate
        }

        const publicUrl = `/storage/shared_assets/${filename}`;

        // 3. Register in shared_assets table
        await db.query(
            `INSERT INTO shared_assets (file_hash, file_path, type)
             VALUES ($1, $2, 'image')
             ON CONFLICT (file_hash) DO NOTHING`,
            [hash, publicUrl]
        );

        res.json({ url: publicUrl });
    } catch (err) {
        console.error('Image upload failed:', err);
        res.status(500).json({ message: 'Failed to upload image' });
    }
});

// Convert uploaded .docx document directly to HTML to preserve formatting
router.post('/convert-docx-to-html', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document file uploaded' });
        }

        const mammoth = require('mammoth');
        const tempPath = req.file.path;
        
        // Convert using mammoth
        const result = await mammoth.convertToHtml({ path: tempPath });
        
        // Clean up temp file
        await fs.remove(tempPath);

        res.json({ html: result.value, warnings: result.warnings });
    } catch (err) {
        console.error('Docx conversion failed:', err);
        res.status(500).json({ message: 'Failed to convert Word document to HTML' });
    }
});

module.exports = router;
