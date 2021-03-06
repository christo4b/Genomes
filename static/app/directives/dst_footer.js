angular.module('genome.footer', [])

.directive('dstFooter', function() {

  return {
    controller: function($scope, $cookies, $rootScope, $location) {
      $scope.toAboutPage = function () {
        $rootScope.curPage = '/about';
        clearInterval($rootScope.globeSpin);
        $location.path('/about');
        $rootScope.removeHelix();
      };
    },
    templateUrl: '../static/app/directives/dst_footer.html'
  };
});