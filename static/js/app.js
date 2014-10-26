'use strict';

/* App */

document.addEventListener("touchstart", function(){}, true);

var asciiTabApp = angular.module('asciiTabApp', [
  'ngRoute',
  'asciiTabControllers'
]);

asciiTabApp.directive('focusOn', function() {
  return function(scope, elem, attr) {
    scope.$on('focusOn', function(e, name) {
      if(name === attr.focusOn) {
        elem[0].focus();
      }
    });
  };
});

asciiTabApp.factory('focus', function ($rootScope, $timeout) {
  return function(name) {
    $timeout(function (){
      $rootScope.$broadcast('focusOn', name);
    });
  }
});

asciiTabApp.config(['$routeProvider', '$httpProvider',
  function($routeProvider, $httpProvider) {
    $httpProvider.defaults.cache = false;

    $routeProvider.
      when('/tab/', {
        templateUrl: '/static/partials/tab.html',
        controller: 'tabCtrl'
      }).
      when('/tab/:tabName', {
        templateUrl: '/static/partials/tab.html',
        controller: 'tabCtrl'
      }).
      otherwise({
        redirectTo: '/tab/'
      });
  }
]);
