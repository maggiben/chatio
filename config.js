///////////////////////////////////////////////////////////////////////////////
// Primary configuration file                                                //
///////////////////////////////////////////////////////////////////////////////
var os = require('os');

var environments = {
    ///////////////////////////////////////////////////////////////////////////
    // Production options OpenShift                                          //
    ///////////////////////////////////////////////////////////////////////////
    production: {
        sessionSecret: process.env.SECRET,
        oAuthServices: {
            github: {
                clientId: '1b147fb22f603248b539',
                clientSecret: 'a326b2f318defb7910639ea0a10c735246a24672'
            },
            sendgrid: {
                api_user: process.env.SENDGRID_USER || 'chatio',
                api_key: process.env.SENDGRID_KEY || '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',
            }
        },
        environment: process.env.NODE_ENV,
        port: process.env.OPENSHIFT_NODEJS_PORT || 8080,
        ipaddr: process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
        allowCrossDomain: false,
        mongo: {
            hostname: 'paulo.mongohq.com',
            port: 10040,
            username: process.env.MONGO_USER || 'admin',
            password: process.env.MONGO_PASS || 'admin',
            name: '',
            db: 'groopy'
        },
        redis: {
            hostname: 'localhost',
            port: 6379
        }
    }
}
module.exports = (function(){
    var env = process.env.NODE_ENV || 'production';
    return environments[env];
})();
