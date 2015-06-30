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
    redis = require('socket.io-redis'),
    Account = require('../models/account');

var users = [];
var rooms = [{
    name: 'support',
    private: false,
    messages: [],
    notifications: 0
}, {
    name: 'staging',
    private: true,
    users: ['bameggi', 'antonio'],
    messages: [],
    notifications: 0
}];
var sockets = [];
var io = null;

exports.setup = function(server) {
    'use strict';
    io = socketio.listen(server);
    // Setup Adapter
    io.adapter(redis({ host: config.redis.host, port: config.redis.port }));
    io.set("log level", 1);

    ///////////////////////////////////////////////////////////////////////////////
    // socket.io                                                                 //
    ///////////////////////////////////////////////////////////////////////////////
    io.on('connection', function (socket) {

        sockets.push(socket);

        updateClients(io);
        updateClient(socket);

        users.push({
            name: '',
            id: socket.id
        });

        socket.on('message', function (data) {
            console.log('message: ', socket.user.username, data);
            data.rooms.forEach(function(room){
                console.log("room: ", room);
                io.sockets.in(room).emit('message', data);
            });
        });
        socket.on('disconnect', function () {
            console.log("disconnect: ", socket.id);
            users = users.filter(function(user){
                return user.id != socket.id;
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

            console.log('User Joins', JSON.stringify(roomOptions, null, 4));
            var exists = rooms.some(function(room, index){
                return room.name === roomOptions.name;
            });
            if(!exists) {
                rooms.push(roomOptions);
            }
            var hasJoined = socket.user.rooms.some(function(room, index){
                return room.name === roomOptions.name;
            });
            if(hasJoined) {
                socket.emit('alert', 'You have already joined this room.');
                return;
            } else {
                socket.user.rooms.push(roomOptions);
            }
            console.log(hasJoined)
            socket.join(roomOptions.name);
            socket.broadcast.in(roomOptions.name).emit("notifyRoom", {
                rooms: [roomOptions.name],
                data: socket.user.username + ' has joined',
                type: 'notifycation'
            });
        });
        socket.on('leave', function(room){
            socket.leave(room);
        });
    });
    ///////////////////////////////////////////////////////////////////////////
    // Handle disconect                                                      //
    ///////////////////////////////////////////////////////////////////////////
    io.on('disconnect', function () {
        console.log("Socket disconnected");
        /*var index = users.map(function(user, index) {
            if(user.id == id) {
                return index;
            }
        }).filter(isFinite)[0];*/
        updateClients(io);
    });
    io.use(function(socket, next) {
        var token = socket.handshake.query.token;
        console.log("got token: ", socket.handshake.query.token);
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
        //next();
    });

    function updateClients(io) {
        io.emit('update', {
            rooms: rooms,
            users: users
        });
    }

    function updateClient(socket) {
        socket.emit('updateClient', {
            id: socket.id
        });
    }

    return io;
};



