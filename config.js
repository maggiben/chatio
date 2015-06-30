///////////////////////////////////////////////////////////////////////////////
// Primary configuration file                                                //
///////////////////////////////////////////////////////////////////////////////
var os = require("os");

var environments = {
    ///////////////////////////////////////////////////////////////////////////
    // Production options OpenShift                                          //
    ///////////////////////////////////////////////////////////////////////////
    production: {
        sessionSecret: process.env.SECRET,
        email: {
            user: "",
            password: ""
        },
        environment: process.env.NODE_ENV,
        listenPort: process.env.VCAP_APP_PORT || 8080,
        allowCrossDomain: false,
        mongo: {
            hostname: "paulo.mongohq.com",
            port: 10026,
            username: process.env.MONGO_USER || 'admin',
            password: process.env.MONGO_PASS || 'admin',
            name: "",
            db: "apicatus"
        },
        redis: {
            hostname: "localhost",
            port: 6379
        }
    }
}
module.exports = (function(){
    var env = process.env.NODE_ENV || 'production';
    return environments[env];
})();
