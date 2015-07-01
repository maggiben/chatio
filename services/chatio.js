///////////////////////////////////////////////////////////////////////////////
// @file         : notifier.js                                               //
// @summary      : Socket.io Notification Manager                            //
// @version      : 0.1                                                       //
// @project      : Apicatus                                                  //
// @description  :                                                           //
// @author       : Benjamin Maggi                                            //
// @email        : benjaminmaggi@gmail.com                                   //
// @date         : 19 Oct 2014                                               //
// @license:     : MIT                                                       //
// ------------------------------------------------------------------------- //
//                                                                           //
// Copyright 2013~2014 Benjamin Maggi <benjaminmaggi@gmail.com>              //
//                                                                           //
//                                                                           //
// License:                                                                  //
// Permission is hereby granted, free of charge, to any person obtaining a   //
// copy of this software and associated documentation files                  //
// (the "Software"), to deal in the Software without restriction, including  //
// without limitation the rights to use, copy, modify, merge, publish,       //
// distribute, sublicense, and/or sell copies of the Software, and to permit //
// persons to whom the Software is furnished to do so, subject to the        //
// following conditions:                                                     //
//                                                                           //
// The above copyright notice and this permission notice shall be included   //
// in all copies or substantial portions of the Software.                    //
//                                                                           //
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS   //
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF                //
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.    //
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY      //
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,      //
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE         //
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                    //
//                                                                           //
///////////////////////////////////////////////////////////////////////////////

// Controllers
var config = require('../config'),
    socketio  = require('socket.io'),
    redis = require('redis').createClient
    adapter = require('socket.io-redis'),
    Account = require('../models/account'),
    giphy = require('giphy-wrapper')('dc6zaTOxFJmzC');

var users = [];
var rooms = [{
    name: 'support',
    isPrivate: false,
    messages: [],
    notifications: 0,
    canInvite: true,
    users: [],
    allowed: []
}, {
    name: 'staging',
    isPrivate: true,
    allowed: ['bmaggi', 'toby'],
    users: ['wally', 'steve'],
    messages: [],
    notifications: 0
}];
var sockets = [];
var io = null;

exports.setup = function(server) {
    'use strict';
    io = socketio.listen(server);
    // Setup Adapter
    var pub = redis(config.redis.port, config.redis.hostname, { auth_pass: config.redis.password });
    var sub = redis(config.redis.port, config.redis.hostname, { detect_buffers: true, auth_pass: config.redis.password });
    var db = pub;
    io.adapter(adapter({ pubClient: pub, subClient: sub }));
    io.set("log level", 1);

    ///////////////////////////////////////////////////////////////////////////////
    // socket.io                                                                 //
    ///////////////////////////////////////////////////////////////////////////////
    io.on('connection', function (socket) {

        db.set('chatio:connections:'+socket.user.username, socket.id);

        db.get('chatio:connections:'+socket.user.username, function(error, reply){
            //console.log("REDIS: ", reply)
        })

        sockets.push(socket);

        updateClients(io);
        updateClient(socket);

        users.push({
            username: socket.user.username,
            id: socket.id,
            //socket: socket
        });

        socket.on('message', function (message) {
            // lookup commands
            if(!commands(message, socket)) {
                message.rooms.forEach(function(room){
                    // Console is private !
                    if(room === 'console') {
                        socket.emit('message', message);
                    } else {
                        // add to history
                        redis.lpush('chatio:channels:'+room+':history', socket.user.username+':'+message.data)
                        io.sockets.in(room).emit('message', message);
                    }
                });
            }

            return;
            message.rooms.forEach(function(room){
                // Console is private !
                if(room === 'console') {
                    socket.emit('message', message);
                } else {
                    io.sockets.in(room).emit('message', message);
                }
            });
        });
        ///////////////////////////////////////////////////////////////////////////
        // Handle disconect                                                      //
        ///////////////////////////////////////////////////////////////////////////
        socket.on('disconnect', function () {
            console.log("disconnect: ", socket.id);
            users = users.filter(function(user){
                return user.id != socket.id;
            });
            rooms.forEach(function(room){
                var index = room.users.indexOf(socket.user.username);
                room.users.splice(index, 1);
            });
            /*socket.broadcast.in(roomOptions.name).emit("notifyRoom", {
                text: socket.id + 'has left',
                type: 'notifycation'
            });*/
            updateClients(io);
            return;
            var id = socket.user._id;
            // Remove Socket from list
            sockets = sockets.filter(function(socket){
                return socket.user._id != id;
            });
        });

        socket.on('join', function(roomOptions) {

            //console.log('User Joins', JSON.stringify(socket.user.rooms, null, 4));

            // Create if non existant
            var exists = rooms.some(function(room, index){
                return room.name === roomOptions.name;
            });
            if(!exists) {
                rooms.push(roomOptions);
            }

            // Has joined already
            var hasJoined = socket.user.rooms.some(function(room){
                return room.name === roomOptions.name;
            });
            if(hasJoined) {
                socket.emit('alert', 'You have already joined this room.');
                return;
            }
            var index = getRoomIndexByName(rooms, roomOptions.name);
            // Is private
            if(rooms[index].isPrivate && rooms[index].allowed.indexOf(socket.user.username) < 0) {
                socket.emit('alert', 'This room is private.');
                return;
            }
            // Push room to socket rooms
            socket.user.rooms.push(rooms[index]);
            if(!rooms[index].users) {
                rooms[index].users = [];
            }
            // Update room users list
            rooms[index].users.push(socket.user.username);
            socket.join(rooms[index].name);
            socket.broadcast.in(rooms[index].name).emit("notifyRoom", {
                rooms: [rooms[index].name],
                data: socket.user.username + ' has joined',
                type: 'notifycation'
            });
            updateClients(io);
            updateClient(socket);

        });
        socket.on('leave', function(room){
            socket.leave(room);
            var index = getRoomIndexByName(socket.user.rooms, room);
            socket.user.rooms.splice(index, 1);
            // Announce event to room
            index = getRoomIndexByName(rooms, room);
            socket.broadcast.in(rooms[index].name).emit("notifyRoom", {
                rooms: [rooms[index].name],
                data: socket.user.username + ' has left',
                type: 'notifycation'
            });
        });
        socket.on('invite', function(options){
            if(options.username === socket.user.username) {
                socket.emit('alert', 'Cannot invite self.');
                return;
            }
            var index = getUserIndexByName(users, options.username);
            var room = getRoomIndexByName(rooms, options.room.name);
            if(room >= 0 && index >= 0){
                // Update allowed list
                if(rooms[room].allowed.indexOf(options.username) < 0){
                    rooms[room].allowed.push(options.username);
                }
                // This rooms permissons will change update users
                updateSocketById(users[index].id);
                io.to(users[index].id).emit('invite', options.room);
            }
        });
    });

    io.use(function(socket, next) {
        var token = socket.handshake.query.token;
        if(token) {
            Account.verify(token, function(error, expired, decoded) {
                if(error) {
                    next(new Error('Invalid Token'));
                    return socket.disconnect('unauthorized');
                } else if(expired) {
                    next(new Error('Token expired. You need to log in again.'));
                    return socket.disconnect('unauthorized');
                } else {
                    socket.user = decoded;
                    socket.user.rooms = [];
                    return next();
                }
            });
        } else {
            next(new Error('not authorized'));
            return socket.disconnect('unauthorized');
        }
    });

    function getRoomIndexByName(rooms, name) {
        return rooms.map(function(room, index) {
            if(room.name === name) {
                return index;
            }
        }).filter(isFinite)[0];
    };

    function getUserIndexByName(users, username) {
        return users.map(function(user, index) {
            if(user.username === username) {
                return index;
            }
        }).filter(isFinite)[0];
    };

    // Updates all clients
    function updateClients(io) {
        io.emit('update', {
            rooms: rooms,
            users: users
        });
    }
    // Update a single client
    function updateClient(socket) {
        socket.emit('updateClient', {
            id: socket.id,
            rooms: rooms,
            users: users
        });
    }
    function updateSocketById(id) {
        io.to(id).emit('updateClient', {
            rooms: rooms,
            users: users
        });
    }

    function commands(message, socket) {
        // find commands
        var expr = new RegExp(/(^|\s)^\/(\w+)/g);
        var command = message.data.match(expr);
        if(!command) {
            return false;
        }
        switch(command[0]) {
            case '/giphy':
                var search = message.data.replace('/giphy','').trim();
                if(search.length < 1) {
                    console.log("no search term");
                    return false;
                }
                giphy.search(message.data.replace('/giphy','').trim(), 1, 0, function (error, results) {
                    if (error) {
                        // check error
                        return false;
                    }
                    console.log(results)
                    if(results.data.length > 0) {
                        message.data = results.data[0].images.fixed_width_small.url;
                        message.type = 'image';
                        message.rooms.forEach(function(room){
                            // Console is private !
                            if(room === 'console') {
                                socket.emit('message', message);
                            } else {
                                io.sockets.in(room).emit('message', message);
                            }
                        });
                    }
                });
                return true;
            break;
            default:
                return false;
            break
        }
        return false;
    }

    return io;
};



