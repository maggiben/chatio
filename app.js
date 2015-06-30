var config = require('./config'),
    mongoose = require('mongoose'),
    redis = require('socket.io-redis')
    express = require('express'),
    io = require('socket.io')(3000),
    router = express.Router(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    path = require('path'),
    http = require('http'),
    https = require('https');

// Internal Services
var chatio = require('./services/chatio');

// Setup Adapter
io.adapter(redis({ host: config.redis.host, port: config.redis.port }));


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

    var mongoUrl = null;
    var server = null;

    mongoUrl = generateMongoUrl(config.mongo);
    ///////////////////////////////////////////////////////////////////////////////
    // Connect mongoose                                                          //
    ///////////////////////////////////////////////////////////////////////////////
    //DB = mongoose.connect(mongoUrl);
    ///////////////////////////////////////////////////////////////////////////////
    // Connect to elasticsearch                                                  //
    ///////////////////////////////////////////////////////////////////////////////
    var server = app.listen(config.listenPort, function () {

      var host = server.address().address;
      var port = server.address().port;

      console.log('Runner app listening at http://%s:%s', host, port);
    });
    ///////////////////////////////////////////////////////////////////////////////
    // Setup Socket.IO Chatio Service                                            //
    ///////////////////////////////////////////////////////////////////////////////
    chatio.setup(server)
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
