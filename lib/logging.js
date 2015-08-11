/**
 * Created by sqwrl on 8/7/15.
 */

/**
 * Initialize the app.
 */

var bunyan = require('bunyan'),
    bunyanPretty = require('bunyan-prettystream'),
    logConfig = require('config').log,
    path = require("path"),
    dt = new Date(),
    logOptions = {
        name: 'dataShopper',
        src: logConfig.includeSource,
        level: logConfig.logLevel,
        streams: [],
        logPath: path.resolve(logConfig.logPath) + '/' + dt.getFullYear() + (dt.getMonth() + 1) + dt.getDate() + ".log"
    };

//add pretty formatting
var ps = new bunyanPretty();
ps.pipe(process.stdout);
logOptions.streams.push({stream: ps});

//create the logger
logger = bunyan.createLogger(logOptions);