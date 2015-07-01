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
                clientId: 'f60c4cc4772fb491fab6',
                clientSecret: '0ee700ecd2f54e9295fd3740c971574db2ed2520'
            },
            sendgrid: {
                api_user: process.env.SENDGRID_USER || 'chatio',
                api_key: process.env.SENDGRID_KEY || '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',
            }
        },
        baseUrl: 'rhcloud.com',
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
            hostname: 'pub-redis-18198.us-east-1-2.3.ec2.garantiadata.com',
            port: 18198,
            password: process.env.REDIS_PASS || 'GDoZLeROWqPySVF0'
        }
    }
}
module.exports = (function(){
    var env = process.env.NODE_ENV || 'production';
    return environments[env];
})();
