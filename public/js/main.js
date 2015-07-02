
var Runner = angular.module('Runner', [
    'ui.bootstrap',
    'ui.bootstrap.tpls',
    'ui.router',
    'ui.utils',
    'ngCookies',
    'LocalStorageModule',
    'restangular',
    'AuthService',
    'ngSocket'
]);
Runner.run(['$rootScope', '$state', '$location', 'AuthService', 'Restangular', function($rootScope, $state, $location, AuthService, Restangular) {

    /*$rootScope.user = {
        name: 'Eltiro',
    }
    Restangular.oneUrl('user', 'http://api.apicat.us:8070/user/signin').customPOST({username: 'admin', password: 'admin'}).then(function(response){
        console.log(response)
    });*/

    Restangular.setErrorInterceptor(function (response) {
        console.log("error: ", response);
        switch(response.status) {
            case 401:
                $rootScope.$emit('userLoggedOut', new Date());
                $state.transitionTo("login");
                break;
            case 404:
                //$state.transitionTo("main.error.404", {data: "response.data"});
                break;
            case 498:
                $rootScope.$emit('userLoggedOut', new Date());
                $state.transitionTo("login");
                break;
            case 500:
                $state.transitionTo("error.500", {data: "response.data"});
                break;

        }
        return response;
    });
    // Authentication
    $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {
        if (toState.authenticate && !AuthService.isAuthenticated()) {
            console.log("user isn't authenticated");
            AuthService.saveState(toState);
            // User isn’t authenticated
            $state.transitionTo("login");
            event.preventDefault();
        }
    });

    $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        // Page title
        if ( angular.isDefined( toState.data.pageTitle ) ) {
            $rootScope.pageTitle = toState.data.pageTitle;
        }
    });

}]);
Runner.factory('mySocket', function (ngSocketFactory) {
    var ipaddr = location.href.match('rhcloud.com') ? 'http://chatio-laboratory.rhcloud.com:8000':'http://localhost:8080'
    var mySocket = ngSocketFactory({
        host: ipaddr
    });
    mySocket.forward('error');
    return mySocket;
});
Runner.factory('uuid', [function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return {
        newuuid: function() {
            // http://www.ietf.org/rfc/rfc4122.txt
            var s = [];
            var hexDigits = "0123456789abcdef";
            for (var i = 0; i < 36; i++) {
                s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
            }
            s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
            s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
            s[8] = s[13] = s[18] = s[23] = "-";
            return s.join("");
        },
        newguid: function() {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        }
    }
}])
Runner.config(['$stateProvider', '$urlRouterProvider', 'RestangularProvider', 'localStorageServiceProvider', function($stateProvider, $urlRouterProvider, RestangularProvider, localStorageServiceProvider) {

    // Default route
    $urlRouterProvider.otherwise( '/chat' );

    // Transform mongo _id field
    RestangularProvider.setRestangularFields({
        id: '_id'
    });
    // Setup default headers
    RestangularProvider.setDefaultHeaders({
        'Content-Type': 'application/json'
    });
    localStorageServiceProvider.setPrefix('chatio');

    $stateProvider
        .state('chat', {
            url: '/chat',
            views: {
                'main': {
                    templateUrl: 'chat.html',
                    controller: 'ChatCtrl as chat'
                }
            },
            data: { pageTitle: 'Chat' },
            authenticate: true
        })
        .state('login', {
            url: '/login',
            views: {
                'main': {
                    templateUrl: 'login.html',
                    controller: 'LoginCtrl as login'
                }
            },
            data: { pageTitle: 'Login' },
            authenticate: false
        })
        .state('register', {
            url: '/register',
            views: {
                'main': {
                    templateUrl: 'register.html',
                    controller: 'RegisterCtrl as signup'
                }
            },
            data: { pageTitle: 'Sign up' },
            authenticate: false
        });
}]);
Runner.controller( 'RegisterCtrl', function RegisterController( $scope, $state, AuthService, Restangular ) {

    var signup = this;
    signup.alerts = [];

    signup.submit = function () {
        signup.processing = true;
        Restangular.oneUrl('user', '/user').customPOST({username: signup.username, email: signup.email, password: signup.username}).then(function(response){
            console.log(response);
            $state.transitionTo("login");
        });
    };
    signup.closeAlert = function(index) {
        signup.alerts.splice(index, 1);
    };
});
Runner.controller( 'LoginCtrl', function LoginController( $scope, $state, AuthService, Restangular ) {

    var login = this;
    login.alerts = [];

    login.submit = function () {
        login.processing = true;
        AuthService.authenticate(login.username, login.password).then(function(result) {
            $scope.$emit('userLoggedIn', angular.copy(result));
            if($scope.user.token) {
                // Get previous state (page that requested authentication)
                var toState = AuthService.getState();
                if(toState.name) {
                    $state.transitionTo(toState.name);
                } else {
                    $state.transitionTo("chat"); // Redirect to home
                }
            } else {
                login.alerts.push({
                    type: 'danger',
                    msg: 'error: Could not authenticate'
                });
            }
            login.processing = false;
        }, function(error) {
            login.alerts.push({
                type: 'danger',
                msg: 'error: ' + error.data.message
            });
            login.processing = false;
        });
    };
    login.closeAlert = function(index) {
        login.alerts.splice(index, 1);
    };
});

Runner.controller('HomeCtrl', ['$scope', 'mySocket', 'uuid', '$location', '$anchorScroll', function($scope, mySocket, uuid, $location, $anchorScroll) {
    console.log('HomeCtrl active');
}]);
Runner.factory('Room', function(){
    function Room(options) {
        angular.extend(this, options);
    };
    Room.prototype = {
        name: null,
        isActive: true,
        notifications: 0,
        messages: [],
        canInvite: false,
        isPrivate: false,
        owners: [],
        users: []
    };

    function findOrCreate(options) {
        return new Room(options);
    };

    return {
        findOrCreate: findOrCreate
    }; //return the object
});
Runner.controller('ChatCtrl', ['$scope', 'mySocket', 'uuid', '$location', '$anchorScroll', '$modal', 'Room', function($scope, mySocket, uuid, $location, $anchorScroll, $modal, Room) {

    $scope.serverUsers = ['steve', 'anna'];
    $scope.serverRooms = [];
    $scope.activeRooms = [{
        name: 'console',
        isActive: true,
        notifications: 0,
        messages: [],
        canInvite: false,
        isPrivate: false,
        owners: [],
        users: []
    }];

    $scope.activeRoom = $scope.activeRooms[0];

    $scope.message = "/giphy dogs";
    $scope.messages = [];

    // Methods
    $scope.init = function() {
        mySocket.emit('join', $scope.activeRoom);
    };
    $scope.send = function() {
        if($scope.message.length > 0) {
            mySocket.emit('message', {
                user: $scope.user,
                rooms: [$scope.activeRoom.name],
                data: $scope.message,
                type: 'text'
            });
        }
        // Clear message
        $scope.message = '';
    };

    $scope.join = function(room) {
        var index = getRoomIndexByName($scope.activeRooms, room.name);
        // Is it private ?
        if(room.isPrivate && room.allowed.indexOf($scope.user.username) < 0) {
            alert('This room is private.');
            return;
        }
        if(index == undefined || index < 0) {
            mySocket.emit('join', room);
            $scope.activeRooms.push(room);
        } else {
            $scope.activeRoom.isActive = false;
            $scope.activeRoom = $scope.activeRooms[index];;
            $scope.activeRoom.isActive = true;
            return;
        }
        $scope.activeRoom.isActive = false;
        $scope.activeRoom = room;
        $scope.activeRoom.isActive = true;
    };

    // Create private chat
    $scope.privateChat = function(user) {
        var room = Room.findOrCreate({
            name: $scope.user.username + ':' + user.username,
            allowed: [$scope.user.username, user.username],
            isPrivate: true
        });
        $scope.join(room);
        mySocket.emit('invite', {
            room: room,
            username: user.username
        });
    };

    $scope.leave = function(room) {
        if(room.name == 'console') {
            alert('cannot exit the console');
            return;
        }
        var index = getRoomIndexByName($scope.activeRooms, room.name);

        mySocket.emit('leave', room.name);
        $scope.activeRooms.splice(index, 1);

        // Default room (console)
        $scope.activeRoom.isActive = false;
        $scope.activeRoom = $scope.activeRooms[0];
        $scope.activeRoom.isActive = true;
    }

    $scope.activateRoom = function(room) {
        $scope.activeRoom.isActive = false;
        $scope.activeRoom = room;
        $scope.activeRoom.isActive = true;
        room.notifications = 0;
    };

    $scope.isPrivate = function(room) {
        if(room.isPrivate && room.allowed.indexOf($scope.user.username) < 0) {
            return true;
        } else {
            return false;
        }
    };

    $scope.post = function(message, type) {
        message.id = uuid.newuuid();
        message.rooms.forEach(function(forRoom){
            var sendToRooms = $scope.activeRooms.filter(function(toRoom){
                return forRoom === toRoom.name;
            });
            if(sendToRooms.length > 0) {
                sendToRooms.forEach(function(room){
                    if(!room.messages || room.messages.length < 0) {
                        room.messages = [];
                    }
                    room.messages.push(message);
                    if(!room.isActive) {
                        room.notifications += 1;
                    }
                });
            }
        });

        $location.hash(message.id);
        $anchorScroll();
    };

    mySocket.on('message', function(result){
        $scope.post(result, 'text');
    });

    mySocket.on('alert', function(error){
        alert(error);
    });

    mySocket.on('notifyRoom', function(result){
        $scope.post(result, 'notifycation');
    });

    mySocket.on('update', function(result){
        $scope.updateRooms(result.rooms, result.users);
        return;
    });
    mySocket.on('updateClient', function(result){
        $scope.updateRooms(result.rooms, result.users);
        return;
    });
    mySocket.on('history', function(result){
        result.history.forEach(function(history){
            $scope.post({
                rooms: result.rooms,
                data: history.split(':')[1],
                user: {
                    username: history.split(':')[0]
                },
                type: 'history'
            }, 'history');
        });
        return;
    });


    $scope.updateRooms = function(rooms, users) {
        $scope.serverRooms = rooms;
        $scope.serverUsers = users;
        // Update channel users
        $scope.activeRooms.forEach(function(room) {
            var index = getRoomIndexByName(rooms, room.name);
            if(index >= 0) {
                room.users = rooms[index].users;
                room.allowed = rooms[index].allowed;
            }
        });
    };

    mySocket.on('invite', function(room){
        if(confirm('You been invited to join: ' + room.name)) {
            $scope.join(room);
        } else {

        }
    });

    // Invite user modal
    $scope.inviteUser = function(room) {
        var modalCtl = ['$scope', '$modalInstance', 'users', 'room', function ($scope, $modalInstance, users, room) {

            $scope.users = users;
            $scope.username = '';
            $scope.submit = function (username) {
                $modalInstance.close({
                    username: username,
                    room: room
                });
            };

            $scope.select = function($item, $model, $label) {
                $scope.username = $item.username;
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }];
        var modalInstance = $modal.open({
            templateUrl: 'invite.html',
            controller: modalCtl,
            windowClass: 'chat-modal',
            resolve: {
                users: [function(){
                    return $scope.serverUsers;
                }],
                room: [function(){
                    return room;
                }]
            }
        });
        modalInstance.result.then(
            function (options) {
                mySocket.emit('invite', options);
            },
            // Exit modal no interactions
            function () {
                return;
            }
        );
    };

    // Add room modal
    $scope.addRoom = function() {
        var modalCtl = ['$scope', '$modalInstance', 'rooms', 'users', 'owner', function ($scope, $modalInstance, rooms, users, owner) {

            $scope.room = {
                name: 'sword',
                isActive: true,
                notifications: 0,
                messages: [],
                canInvite: true,
                isPrivate: true,
                owner: [owner.username],
                users: [],
                allowed: [owner.username]
            };
            $scope.submit = function (room) {
                if(room.name.length) {
                    $modalInstance.close(room);
                }
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }];
        var modalInstance = $modal.open({
            templateUrl: 'createRomm.html',
            controller: modalCtl,
            windowClass: 'chat-modal',
            resolve: {
                rooms: ['$http', function($http) {
                    //return $http.get("/api/vendors");
                    return $scope.serverRooms;
                }],
                users: [function(){
                    return $scope.serverUsers;
                }],
                owner: [function(){
                    return $scope.user;
                }]
            }
        });
        modalInstance.result.then(
            function (room) {
                // Create + join
                $scope.join(room);
            },
            // Exit modal no interactions
            function () {
                return;
            }
        );
    };

    // Get room index by name
    function getRoomIndexByName(rooms, name) {
        return rooms.map(function(room, index) {
            if(room.name === name) {
                return index;
            }
        }).filter(isFinite)[0];
    };

    // Join Chat
    $scope.init();

    // Cleanup
    $scope.$on('$destroy', function(){
        $scope.activeRooms.forEach(function(room){
            mySocket.emit('leave', room.name);
            // Remove All listeners
            mySocket.removeAllListeners("message");
            mySocket.removeAllListeners("alert");
            mySocket.removeAllListeners("notifyRoom");
            mySocket.removeAllListeners("update");
            mySocket.removeAllListeners("updateClient");
            mySocket.removeAllListeners("history");
            mySocket.removeAllListeners("invite");
        });
    });

}]);
Runner.controller('MainCtrl', ['$scope', '$cookies', '$state', '$q', 'Restangular', 'localStorageService', function($scope, $cookies, $state, $q, Restangular, localStorageService) {

    // Store token
    var token = localStorageService.get('token');
    if ($cookies.token) {
        token = unescape($cookies.token);
        console.log("I got a cookie token", token);
        Restangular.configuration.defaultHeaders['token'] = token;
        Restangular.one('user').get().then(function(user) {
            localStorageService.add('token', token);
            $scope.user = user;
        }, function(error) {
            console.log("could not authenticate user with cookie token");
            $cookies.token = undefined;
        });
    } else if(token) {
        Restangular.configuration.defaultHeaders['token'] = token.token;
        Restangular.one('user').get().then(function(user) {
            $scope.user = user;
        }, function(error) {
            console.log("could not authenticate user with localStorage token");
            localStorageService.remove('token');
        });
    } else {
        console.log('no auth token received');
    }

    // Connect socket on user auth
    $scope.$on('userLoggedIn', function(event, user){
        $scope.user = user;
        $state.transitionTo('chat');

        /*var ipaddr = location.href.match('rhcloud.com') ? 'http://chatio-laboratory.rhcloud.com:8000':'http://localhost:8080'
        mySocket.connect({
            host: ipaddr
        });
        mySocket.emit('userLoggedIn', {data: user.name});
        */
    });

    // Disconnect socket cleanup user enviroment
    $scope.$on('userLoggedOut', function(event, user){
        $scope.user = null;
        //mySocket.emit('userLoggedOut', {data: 'myMessage'});
        //mySocket.disconnect();
    });
}]);

///////////////////////////////////////////////////////////////////////////////
// Directives                                                                //
///////////////////////////////////////////////////////////////////////////////
Runner.directive('thumbPicker', function(){
    return function (scope, element, attrs) {
        var popup = $('<div class="icon-popup">');
        var list = $('<ul class="icon-list"></ul>');
        for(var i = 1; i < 100; i++) {
            var icon = $('<li><img src="https://pbs.twimg.com/profile_images/1743513787/Spotty_Green_Frog_Logo3_normal.gif"></li>');
            list.append(icon);
        }
        list.bind("mouseup", function (event) {
            console.log("hoooha", event);
        });
        popup.append(list);

        element.wrap('<div></div>');
        element.parent('div').append(popup);

        element.bind("keyup", function (event) {
            if(scope.message == 'pepe') {
                popup.addClass('dropdown-menu').show();
            } else {
                popup.addClass('dropdown-menu').hide();
            }
        });
    };
});
Runner.directive('ngEnter', function () {
    var history = [];
    var index = 0;
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                history.push(scope.message);
                scope.message = '';
                index = history.length;
                event.preventDefault();
            }
            if(event.which === 38) {
                index -= 1;
                scope.message = history[index];
                scope.$apply();
            }
            if(event.which === 40) {
                index += 1;
                scope.message = history[index];
                scope.$apply();
            }
        });
    };
});
