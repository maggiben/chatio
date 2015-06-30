var config = require('./config'),
    mongoose = require('mongoose'),
    redis = require('socket.io-redis'),
    express = require('express'),
    router = express.Router(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    path = require('path'),
    http = require('http'),
    https = require('https');

// Internal Services
var chatio = require('./services/chatio');
var AccountMdl = require('./models/account');
var AccountCtl = require('./controllers/account');

// Globals
var app = express();
var router = express.Router();

// Routes
var index = require('./routes/index');


////////////////////////////////////////////////////////////////////////////////
// Mongo URL generator                                                        //
////////////////////////////////////////////////////////////////////////////////
var generateMongoUrl = function(conf) {
    'use strict';

    if(conf.username && conf.password) {
        return 'mongodb://' + conf.username + ':' + conf.password + '@' + conf.hostname + ':' + conf.port + '/' + conf.db;
    }
    else{
        return 'mongodb://' + conf.hostname + ':' + conf.port + '/' + conf.db;
    }
};

////////////////////////////////////////////////////////////////////////////////
// Aplication setup database and http & sockets                               //
////////////////////////////////////////////////////////////////////////////////
var init = function() {
    'use strict';

    var mongo = null;
    var server = null;

    mongo = generateMongoUrl(config.mongo);
    ///////////////////////////////////////////////////////////////////////////////
    // Connect mongoose                                                          //
    ///////////////////////////////////////////////////////////////////////////////
    mongoose.connect(mongo);
    ///////////////////////////////////////////////////////////////////////////////
    // Connect to elasticsearch                                                  //
    ///////////////////////////////////////////////////////////////////////////////
    var server = app.listen(config.port, config.ipaddr, function () {

      var host = server.address().address;
      var port = server.address().port;

      console.log('Runner app listening at http://%s:%s', host, port);
    });
    ///////////////////////////////////////////////////////////////////////////////
    // Setup Socket.IO Chatio Service                                            //
    ///////////////////////////////////////////////////////////////////////////////
    chatio.setup(server);
    return server;
};


////////////////////////////////////////////////////////////////////////////////
// Mongoose event listeners                                                   //
////////////////////////////////////////////////////////////////////////////////
mongoose.connection.on('open', function() {
    'use strict';
    console.log('mongodb connected');
});
mongoose.connection.on('error', function(error) {
    'use strict';
    console.log('mongodb connection error: %s', error);
});
// When the connection is disconnected
mongoose.connection.on('disconnected', function () {
    'use strict';
    console.log('Mongoose default connection disconnected');
});


///////////////////////////////////////////////////////////////////////////////
// CORS middleware (only to test on cloud9)                                  //
///////////////////////////////////////////////////////////////////////////////
var allowCrossDomain = function(request, response, next) {
    'use strict';

    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept, token');
    response.header('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, CONNECT');

    // intercept OPTIONS method
    if ('OPTIONS' === request.method) {
        response.status(200).end();
    }
    else {
        next();
    }
};

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
// Configuration                                                             //
///////////////////////////////////////////////////////////////////////////////
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('title', 'Runner');
// Body Parser
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
app.use(allowCrossDomain);
// Cookie Parser
app.use(cookieParser());
// Allow CORS
app.use(allowCrossDomain);
// Static files
app.use(express.static(path.join(__dirname, 'public')));

///////////////////////////////////////////////////////////////////////////////
// Use routers                                                               //
///////////////////////////////////////////////////////////////////////////////
//app.use('/', index);
//app.use('/queue', queue);

router.get('/', function(request, response) {
    console.log("request made !")
    //res.send('im the home page!');
    response.render('index', { title: 'Router' });
});

///////////////////////////////////////////////////////////////////////////////
// Use passport.authenticate() as route middleware to authenticate the       //
// request.                                                                  //
// The first step in GitHub authentication will involve redirecting          //
// the user to github.com.                                                   //
// After authorization, GitHubwill redirect the user                         //
// back to this application at /auth/github/callback                         //
///////////////////////////////////////////////////////////////////////////////

app.get('/auth/github', AccountCtl.githubAuth);
app.get('/auth/github/callback', AccountCtl.githubAuthCallback);

app.get('/auth/google', AccountCtl.googleAuth);
app.get('/auth/google/return', AccountCtl.googleAuthCallback);
// Regular user sign on sign off
app.post('/user/signin', AccountCtl.signIn);
app.get('/user/signout', ensureAuthenticated, AccountCtl.signOut);

///////////////////////////////////////////////////////////////////////////////
// User CRUD Methods & Servi                                                 //
///////////////////////////////////////////////////////////////////////////////
app.route('/user')
    .post(AccountCtl.create)
    .get(ensureAuthenticated, AccountCtl.read);
app.route('/user/:id')
    .get(ensureAuthenticated, AccountCtl.readOne)
    .put(ensureAuthenticated, AccountCtl.update)
    .delete(ensureAuthenticated, AccountCtl.delete);

app.post('/user/forgot', AccountCtl.resetToken);
app.post('/user/reset/:token', AccountCtl.resetPassword);
app.post('/user/changepassword', AccountCtl.changePassword);

app.use('/', router);

///////////////////////////////////////////////////////////////////////////////
// Setup environments                                                        //
///////////////////////////////////////////////////////////////////////////////
switch(process.env.NODE_ENV) {
    case 'development':
        app.use(errorhandler({ dumpExceptions: true, showStack: true }));
        //app.use(express.logger());
    break;
    case 'test':
        app.use(errorhandler());
    break;
    case 'production':
        app.use(errorhandler());
    break;
}

///////////////////////////////////////////////////////////////////////////////
// Init the APP
///////////////////////////////////////////////////////////////////////////////
exports.app = init();

///////////////////////////////////////////////////////////////////////////////
// Gracefully Shuts down the workers.                                        //
///////////////////////////////////////////////////////////////////////////////
process
    .on('SIGTERM', function () {
        'use strict';

        console.log('SIGTERM');
        exports.app.close(function () {
            console.log("express terminated");
            mongoose.connection.close(function () {
                console.log("mongodb terminated");
                process.exit(0);
            });
        });
    })
    .on('SIGHUP', function () {
        //killAllWorkers('SIGTERM');
        //createWorkers(numCPUs * 2);
    })
    .on('SIGINT', function() {
        'use strict';

        console.log('SIGINT');
        exports.app.close(function () {
            mongoose.connection.close(function () {
                process.exit(1);
            });
        });
    });
