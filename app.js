var config = require('./config'),
    mongoose = require('mongoose'),
    express = require('express'),
    router = express.Router(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    morgan = require('morgan'),
    path = require('path'),
    http = require('http'),
    https = require('https');

// Internal Services
var chatio = require('./services/chatio');

// Globals
var app = express();

// Routes
var homeRoutes = require('./routes/index');
var authRoutes = require('./routes/auth');

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
    server = app.listen(config.port, config.ipaddr, function () {

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
// App Routers                                                               //
///////////////////////////////////////////////////////////////////////////////
app.use('/', homeRoutes);
app.use('/user', authRoutes);


///////////////////////////////////////////////////////////////////////////////
// Setup environments                                                        //
///////////////////////////////////////////////////////////////////////////////
switch(process.env.NODE_ENV) {
    case 'development':
        app.use(errorhandler({ dumpExceptions: true, showStack: true }));
    break;
    case 'test':
        app.use(morgan('combined'));
    break;
    case 'production':

    break;
}

///////////////////////////////////////////////////////////////////////////////
// Init the APP
///////////////////////////////////////////////////////////////////////////////
init();
module.exports = app;

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
