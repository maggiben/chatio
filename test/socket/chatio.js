process.env.PORT = 8080
process.env.NODE_ENV = 'test'

var conf = require('../../config')
    , io = require('socket.io-client')
    , server = require('../../app')
    , supertest = require('supertest')
    , request = supertest(server)
    , expect = require('chai').expect
    , Account = require('../../models/account')
    , socketURL = 'http://0.0.0.0:'+process.env.PORT;

var options = {
    transports: ['websocket'],
    'force new connection': true
};

describe('Socket Server connection', function(){
    before(function(done){
        var user = new Account({username: 'ariel', email: 'ariel@gmail.com'});
        user.setPassword('password', function(error) {
            user.save(function(error, user) {
                request
                    .post('/user/signin')
                    .send({username: 'ariel', password: 'password'})
                    .expect(200)
                    .end(function(err, res){
                        if (err) return done(err);
                        options.query = 'token='+res.body.token.token;
                        done();
                    });
            });
        });
    })

    it('should not authenticate invalid credentials', function(done){
        request
            .post('/user/signin')
            .send({username:'ariel', password:'badPassword'})
            .expect(401)
            .end(done);
    });

    it('should connect', function(done){
        var socket = io.connect(socketURL, options)
        socket.on('connect', function(){
            done();
        })
    });

    it('should join a room', function(done){

        var room = {
            name: 'console',
            isActive: true,
            notifications: 0,
            messages: [],
            canInvite: false,
            isPrivate: false,
            owners: [],
            users: []
        };

        var socket = io.connect(socketURL, options)

        socket.emit('join', room);

        done();

    });

    it('should join a room and send a message', function(done){

        var room = {
            name: 'console',
            isActive: true,
            notifications: 0,
            messages: [],
            canInvite: false,
            isPrivate: false,
            owners: [],
            users: []
        };

        var socket = io.connect(socketURL, options)

        socket.emit('join', room);

        socket.emit('message', {
            user: 'ariel',
            rooms: ['console'],
            data: 'Hello world',
            type: 'text'
        });

        socket.on('message', function(result){
            expect(result.data).to.be.equal('Hello world');
            socket.removeAllListeners("message");
            done();
        });
    });

    it('should be able to join and leave a room', function(done){

        var room = {
            name: 'news',
            isActive: true,
            notifications: 0,
            messages: [],
            canInvite: false,
            isPrivate: false,
            owners: [],
            users: []
        };

        var socket = io.connect(socketURL, options)

        socket.emit('join', room);

        socket.emit('message', {
            user: 'ariel',
            rooms: ['news'],
            data: 'Hello world',
            type: 'text'
        });

        socket.on('message', function(result){
            expect(result.data).to.be.equal('Hello world');
            socket.removeAllListeners("message");
            socket.emit('leave', 'news');
        });

        socket.on('update', function(result){
            socket.removeAllListeners("update");
            done();
        });
    });

    it('should not be able to invite self', function(done){

        var room = {
            name: 'coverage',
            isActive: true,
            notifications: 0,
            messages: [],
            canInvite: false,
            isPrivate: false,
            owners: [],
            allowed: [],
            users: []
        };

        var socket = io.connect(socketURL, options)

        socket.emit('join', room);

        socket.emit('invite', {
            room: room,
            username: 'ariel'
        });

        socket.on('alert', function(result){
            expect(result).to.be.equal('Cannot invite self.');
            socket.removeAllListeners("alert");
            done();
        });
    });


    after(function(done){
        Account.findOneAndRemove({username: 'ariel'}, function(error, user){
            done();
        })
    });
});
