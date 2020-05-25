const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require("morgan");
const serveIndex = require("serve-index");

const indexRouter = require('./routes/index');

//=======================================
// Add Analyst Service RESTFul API files
const health = require('./routes/health');
const intelligences = require('./routes/intelligences');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "ejs");

app.use(morgan('dev'));
app.use(express.json({
  limit: "100mb",
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

//=======================================
// Add Analyst Service RESTFul API - health check 
app.use('/health', health);
// Add Analyst Service RESTFul API - intelligences
app.use('/apis/intelligences', intelligences);

app.use(function (req, res, next) {
  const index = serveIndex(path.join(__dirname, "public"), { icons: true });
  index(req, res, next);
});

module.exports = app;
