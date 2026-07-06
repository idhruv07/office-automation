/**
 * api/repo/index.js
 * Repository module router — mounts all sub-routes.
 * Entire module is inaccessible to INDIVIDUAL role (enforced at each sub-route level).
 */
const express = require('express');
const router = express.Router();

// Mount routers directly at root so their internal paths define the URL 
// (e.g. GET /tree, POST /folder, GET /document/:id/pages)
router.use('/', require('./folders'));
router.use('/', require('./documents'));
router.use('/locks', require('./locks')); // Keeping locks isolated for now
router.use('/admin', require('./admin')); // Review Queue and Admin Actions
router.use('/ai', require('./ai')); // Local AI autocomplete

module.exports = router;
