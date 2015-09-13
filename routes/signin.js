/**
 * Created by sqwrl on 8/7/15.
 */

var config      = require('config').login;

function index(req, res) {
    res.render('signin', {title:'Login', user:'Guest'});
}

function login(req, res) {
    if (req.body.emailId === config.username && req.body.password === config.password) {
        req.session.userName = config.username;
        res.send('');
    } else {
        res.send('Wrong credentials!!');
    }
}

exports.index = index;
exports.login = login;