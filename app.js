require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const nunjucks = require('nunjucks');
var session = require('express-session')
var validator = require('validator');

validator.isEmail('foo@bar.com'); //=> true

const indexRouter = require('./routes/index');

const app = express();

nunjucks.configure('views', {
    autoescape: true,
    express: app,
});
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
  }))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

module.exports = app;
