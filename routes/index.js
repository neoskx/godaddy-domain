const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render("index", {
    title: "Godaddy Domain",
    githubURL: "https://github.com/neoskx/godaddy-domain",
    homeURL: "https://munew.io",
    docBaseURL: "https://docs.munew.io"
  });
});

module.exports = router;
