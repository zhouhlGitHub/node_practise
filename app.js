var fs = require('fs'),
    accessLog = fs.createWriteStream('access.log', {flag: 'a'}),
    errorLog = fs.createWriteStream('error.log', {flag: 'a'});
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var exphbs = require('express-handlebars');

var routes = require('./routes/index');
//var users = require('./routes/users');

var app = express();
var passport = require('passport'),
    GithubStrategy = require('passport-github').Strategy;

var MongoStore = require('connect-mongo')(session);
var settings = require('./settings');

var flash = require('connect-flash');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', exphbs({
    layoutsDir: 'views',
    defaultLayout: 'layout',
    extname: '.hbs'
}))
app.set('view engine', 'hbs');
app.use(flash());

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));
app.use(logger('combined',{stream: accessLog}));

app.use(bodyParser({keepExtensions: true, uploadDir: './public/images'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (err, req, res, next) {
    var meta = '[' + new Date() + ']' + req.url + '\n';
    errorLog.write(meta + err.stack + '\n');
    next();
});
app.use(session({
    secret: settings.cookieSecret,
    key: settings.db,
    cookie: {maxAge: 1000*60*60*24*30},
    store: new MongoStore({
        db: settings.db
    }),
    resave: true,
    saveUninitialized: true
}));
// app.use('/', routes);
// app.use('/users', users);
app.use(passport.initialize());

routes(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
passport.use(new GithubStrategy({
    clientID: "992b58030a8da2067b38",
    clientSecret: "27484b2239e82f3407c3eb45c33c59f2ef4dcf56",
    callbackURL: "http://localhost:3000/login/github/callback"
}, function (accessToken, refreshToken, profile, done) {
    done(null, profile);
}));
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
