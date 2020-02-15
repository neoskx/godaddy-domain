var express = require('express');
var router = express.Router();

/* Analyst Service - GET /apis/health */
router.get('/', function(req, res, next) {
  res.json({
    status: 200
  });
});

module.exports = router;
