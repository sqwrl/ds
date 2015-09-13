/**
 * Created by sqwrl on 8/7/15.
 */

function index(req,res){
    req.session.userName = 'Guest';
    res.redirect('/');
}

exports.index = index;