
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
    $urlRouterProvider.otherwise( '/' );

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
        .state('home', {
            url: '/',
            views: {
                'main': {
                    templateUrl: 'home.html',
                    controller: 'HomeCtrl as home'
                }
            },
            data: { pageTitle: 'Home' },
            authenticate: true
        })
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
        });
}]);
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
                    $state.transitionTo("home"); // Redirect to home
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

Runner.controller('ChatCtrl', ['$scope', 'mySocket', 'uuid', '$location', '$anchorScroll', function($scope, mySocket, uuid, $location, $anchorScroll) {

    console.log('ChatCtrl active');
    $scope.serverUsers = ['steve', 'anna'];
    $scope.serverRooms = [];
    $scope.activeRooms = [{
        name: 'pepe',
        isActive: true,
        notifications: 0,
        messages: [{
            data: 'hello world'
        }, {
            data: 'bye'
        }]
    }];

    $scope.activeRoom = $scope.activeRooms[0];

    $scope.message = "hellox";
    $scope.messages = [];

    // Methods
    $scope.init = function() {
        mySocket.emit('join', $scope.activeRoom);
    };
    $scope.send = function() {
        mySocket.emit('message', {
            user: $scope.user,
            rooms: [$scope.activeRoom.name],
            data: $scope.message,
            type: 'text'
        });
    };

    $scope.join = function(room) {
        console.log("join", room)
        mySocket.emit('join', room);
        $scope.activeRooms.push(room);
        $scope.activeRoom.isActive = false;
        $scope.activeRoom = room;
        $scope.activeRoom.isActive = true;
    };

    $scope.activateRoom = function(room) {
        $scope.activeRoom.isActive = false;
        $scope.activeRoom = room;
        $scope.activeRoom.isActive = true;
        room.notifications = 0;
    };

    $scope.post = function(message, type) {
        message.id = uuid.newuuid();
        console.log("message:: ", message);
        message.rooms.forEach(function(forRoom){
            var sendToRooms = $scope.activeRooms.filter(function(toRoom){
                return forRoom === toRoom.name;
            });
            console.log('sendToRoom', message);
            if(sendToRooms.length > 0) {
                sendToRooms.forEach(function(room){
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
        console.log('result', result)
        $scope.post(result, 'notifycation');
    });

    mySocket.on('update', function(result){
        $scope.serverRooms = result.rooms;
        $scope.serverUsers = result.users;
    });
    mySocket.on('updateClient', function(result){
        console.log('updateClient', result);
    });

    // Join Chat
    $scope.init();
}]);
Runner.controller('MainCtrl', ['$scope', '$cookies', '$state', 'mySocket', 'Restangular', 'localStorageService', function($scope, $cookies, $state, mySocket, Restangular, localStorageService) {

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

        mySocket.disconnect();

        var ipaddr = location.href.match('rhcloud.com') ? 'http://chatio-laboratory.rhcloud.com:8000':'http://localhost:8080'
        mySocket.connect({
            host: ipaddr
        });
        mySocket.emit('userLoggedIn', {data: user.name});
    });

    // Disconnect socket cleanup user enviroment
    $scope.$on('userLoggedOut', function(event, user){
        $scope.user = null;
        mySocket.emit('userLoggedOut', {data: 'myMessage'});
        mySocket.disconnect();
    });
}]);
