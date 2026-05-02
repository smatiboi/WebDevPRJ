const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { getMeta } = require('../controllers/metaController');

const router = express.Router();

router.get('/', asyncHandler(getMeta));

module.exports = router;
