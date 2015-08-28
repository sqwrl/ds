/**
 * Created by sqwrl on 8/6/15.
 */

'use strict';

/*******************************************************************************
 * Dependencies.
 ******************************************************************************/
require('./lib/logging');
require('./lib/indices');
var express         = require('express'),
    cookieParser    = require('cookie-parser'),
    bodyParser      = require('body-parser'),
    session         = require('express-session'),
    favicon         = require('serve-favicon'),
    serveStatic     = require('serve-static'),
    methodOverride  = require('method-override'),
    config          = require('config').web,
    routes          = require('./routes/'),
    http            = require('http'),
    path            = require('path'),
    logger          = global.ds.logger;


/** **************************************************************************
 * Configuration
 /** **************************************************************************/
var app = express();
app.set('port', process.env.PORT || config.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon((path.join(__dirname, config.favicon))));
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
    secret : config.session.secret
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, config.publicFolder)));

http.createServer(app).listen(app.get('port'), function() {
    logger.info('Express server listening on port ' + app.get('port'));
});


/** **************************************************************************
 * Routes
 /** **************************************************************************/
var signin          = require('./routes/signIn'),
    logout          = require('./routes/logout'),
    main            = require('./routes/main');

app.get('/', signin.index);
app.get('/signin', signin.index);
app.get('/logout', logout.index);
app.get('/main', main.index);
app.get('/main/shop', main.shop);
app.get('*', function(req, res) {
    logger.info(req.originalUrl, 'not a valid route');
});

app.post('/signin/login', signin.login);