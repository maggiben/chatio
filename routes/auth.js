var express = require('express')
  , router = express.Router()
  , AccountMdl = require('../models/account')
  , AccountCtl = require('../controllers/account');


// reusable middleware to test authenticated sessions
function ensureAuthenticated(request, response, next) {
    'use strict';

    var token = request.headers.token;

    if(token) {
        AccountMdl.verify(token, function(error, expired, decoded) {
            if(error) {
                response.statusCode = 498;
                response.json({error: 'Invalid token !'});
            } else if(expired) {
                response.statusCode = 401;
                response.json({error: 'Token expired. You need to log in again.'});
            } else {
                request.user = decoded;
                return next();
            }
        });
    } else {
        response.statusCode = 401;
        response.json({error: 'No auth token received !'});
    }
}
///////////////////////////////////////////////////////////////////////////////
// Use passport.authenticate() as route middleware to authenticate the       //
// request.                                                                  //
// The first step in GitHub authentication will involve redirecting          //
// the user to github.com.                                                   //
// After authorization, GitHubwill redirect the user                         //
// back to this application at /auth/github/callback                         //
///////////////////////////////////////////////////////////////////////////////
router.get('/auth/github', AccountCtl.githubAuth);
router.get('/auth/github/callback', AccountCtl.githubAuthCallback);

router.get('/auth/google', AccountCtl.googleAuth);
router.get('/auth/google/return', AccountCtl.googleAuthCallback);
// Regular user sign on sign off
router.post('/signin', AccountCtl.signIn);
router.get('/signout', ensureAuthenticated, AccountCtl.signOut);
///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
router.route('/')
    .post(AccountCtl.create)
    .get(ensureAuthenticated, AccountCtl.read);
router.route('/:id')
    .get(ensureAuthenticated, AccountCtl.readOne)
    .put(ensureAuthenticated, AccountCtl.update)
    .delete(ensureAuthenticated, AccountCtl.delete);

router.post('/forgot', AccountCtl.resetToken);
router.post('/reset/:token', AccountCtl.resetPassword);
router.post('/changepassword', AccountCtl.changePassword);

module.exports = router;
