/**
 * Created by sqwrl on 8/7/15.
 */

function index(req,res){
    req.session.userName = 'Guest';
    req.session.cartCount = 0;
    res.redirect('/');
}

exports.index = index;