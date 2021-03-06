'use strict';

const { join } = require('path');
const express = require('express');
const createError = require('http-errors');
const connectMongo = require('connect-mongo');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const logger = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const sassMiddleware = require('node-sass-middleware');
const serveFavicon = require('serve-favicon');
const bindUserToViewLocals = require('./middleware/bind-user-to-view-locals.js');
const passportConfigure = require('./passport-configuration.js');
const indexRouter = require('./routes/index');
const authenticationRouter = require('./routes/authentication');
const encounterRouter = require('./routes/encounter');
const channelsRouter = require('./routes/channels');
const findFriendsRouter = require('./routes/findFriends');
const messageRouter = require('./routes/message');
const hbs = require('hbs');
const app = express();
//TODO - Configure multer and everything you need to upload files
hbs.registerPartials(join(__dirname, 'views/partials'));
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(serveFavicon(join(__dirname, 'public/images', 'favicon.ico')));
app.use(
  sassMiddleware({
    src: join(__dirname, 'public'),
    dest: join(__dirname, 'public'),
    outputStyle: process.env.NODE_ENV === 'development' ? 'nested' : 'compressed',
    force: process.env.NODE_ENV === 'development',
    sourceMap: true
  })
);
app.use(express.static(join(__dirname, 'public')));
app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  expressSession({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 24 * 15 * 1000,
      sameSite: 'lax',
      httpOnly: true
    },
    store: new (connectMongo(expressSession))({
      mongooseConnection: mongoose.connection,
      ttl: 60 * 60 * 24 * 1000
    })
  })
);

// Initiate passport middleware before mounting routers and after mounting express-session
require('./passport-googleAuthentication');

app.use(passport.initialize());
app.use(passport.session());
app.use(bindUserToViewLocals);

app.use('/', indexRouter);
app.use('/authentication', authenticationRouter);
app.use('/encounter', encounterRouter);
app.use('/channels', channelsRouter);
app.use('/user', findFriendsRouter);
app.use('/message', messageRouter);

// Catch missing routes and forward to error handler
app.use((req, res, next) => {
  res.render('error/error404');
});

// Catch all error handler
app.use((error, req, res, next) => {
  // Set error information, with stack only available in development
  res.locals.message = error.message;
  res.locals.error = req.app.get('env') === 'development' ? error : {};
  res.status(error.status || 500);
  res.render('error/error');
});

module.exports = app;
