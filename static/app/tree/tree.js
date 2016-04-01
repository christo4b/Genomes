angular.module('genome.tree', ['genome.treeService'])
.controller('TreeController', function(TreeService, $scope, d3Service, Relatives, $rootScope, $window, $location) {

  var whichView = function() {
    $rootScope.view = $location.$$path;
  };

  whichView();

  $rootScope.showTree = function(){
    clearInterval($rootScope.globeSpin);
    $rootScope.curPage = '/tree';
    $location.path('/tree/');
  };

  $rootScope.showMap = function(){
    $rootScope.curPage = '/map';
    $location.path('/map/');
  };

  $scope.popModal = {
    name: '',
    similarity: '',
    image: '',
    relationship: '',
    age: 0
  };

  var showRelative = function(bubble) {
    $scope.popModal.name = bubble.first_name + ' ' + bubble.last_name;
    $scope.popModal.similarity = (bubble.similarity*100).toFixed(2) + "% of your DNA";
    $scope.popModal.relationship = bubble.relationship  || "Unknown";
    $scope.popModal.age = bubble.birth_year ? (new Date().getFullYear() - bubble.birth_year) : "Unknown";
    $scope.popModal.image = (bubble.sex === 'Male') ? '../../../static/assets/male.jpg' : '../../../static/assets/female.jpg';
    $scope.popModal.ancestry = bubble.ancestry || "Unknown";
    $scope.popModal.birthplace = bubble.birthplace  || "Unknown";
  };

  $rootScope.IntroOptions = {
      steps:[{
          intro: "Welcome to your Family Tree! Every bubble represents one of your relatives. Click the bubbles for more info!"
        },
        {
          element: document.querySelector('#path2'),
          intro: "See a map of your relatives' birth country by clicking on this button.",
          position: 'right'
        }
      ],
      showStepNumbers: false,
      exitOnOverlayClick: true,
      exitOnEsc:true,
      nextLabel: '<strong><span style="color:green">Next</span></strong>',
      prevLabel: '<span style="color:red">Previous</span>',
      skipLabel: 'Exit',
      doneLabel: 'Thanks'
  };

////////////TREE STARTS HERE///////////////
  var height = $window.innerHeight;
  var width = $window.innerWidth;
  var svgWidth = 8/10 * width;
  var svgHeight = 8/10 * height;
  var relativeTree = {
                       'relationship': 'me',
                       'similarity' : 1,
                       'children': [
                        {
                         'relationship': 'maternal_side',
                         'similarity': 0.3,
                         'children': []
                        },
                        {
                          'relationship' : 'paternal_side',
                          'similarity': 0.3,
                          'children' : []
                        }
                        ]
                      };

  var root = relativeTree;
  var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
  };

  var padding = 5;

  var radius = 40;


  var tree = d3.layout.tree()
                   .separation(function(a,b){ return 100/a.depth;});
  var nodes;
  var links;
  var force;

  //Grab relatives from the database, then initialize bubbles
  $scope.getRelatives = function() {
    Relatives.getRelatives()
    //Can refactor to return the promise values within the relatives factory if so desired
    .then(function(relatives) {
      //Refactor? potentially redundant addition of relatives to $scope and $rootScope.
      $scope.relatives = relatives.data.relativeList;
      //Add relatives to rootScope to allow access within other controllers
      $rootScope.rels = relatives.data.relativeList;
      createTree($scope.relatives);
      nodes = TreeService.flatten(relativeTree);
      console.log($scope.relatives.length)
      links = tree.links(nodes);

      //Add d3 force effect to layout
      force = d3.layout.force()
            .linkDistance(180)
            .charge(-180)
            .gravity(0.0)
            .size([width, height])
            .on('tick', tick)
            .start();

      link = link.data(links, function(d) { return d.target.id; });

      link.exit().remove();

      link.enter().insert('line', '.node')
          .attr('class', 'link');

      update();
            
      $scope.loaded = true;
    }, function(err) {
      console.error('Error retrieving relatives: ', err);
    });
  };

  //Initialize the page with a call to getRelatives
  var family = {};
  $scope.getRelatives();



  //Grab the tree as a canvas for our bubbles
  var svg = d3.select('.tree').append('svg')
    .attr('id', 'treeSVG')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

  var link = svg.selectAll('.link');
  var node = svg.selectAll('.node');



  function createTree(relatives){

    var randomSideAssignment = false;
    relatives.forEach(function(relative){
      relative.children = [];
      relative.name = relative.relationship;
    });
    family.paternalCloseRelatives = relatives.filter(function(relative){
      return !relative.relationship.match('Cousin') && !relative.relationship.match('Distant') && relative.paternal_side;
    });
    family.maternalCloseRelatives = relatives.filter(function(relative){
      return !relative.relationship.match('Cousin') && !relative.relationship.match('Distant') && relative.maternal_side;
    });
    family.paternalFirstCousins = relatives.filter(function(relative){
      return relative.relationship.match('1st Cousin') && relative.paternal_side;
    });
    family.maternalFirstCousins = relatives.filter(function(relative){
      return relative.relationship.match('1st Cousin') && relative.maternal_side;
    });
    family.paternalOtherCousins = relatives.filter(function(relative){
      return (relative.relationship.match('2nd Cousin') || relative.relationship.match('3rd Cousin')) && relative.paternal_side;
    });
    family.maternalOtherCousins = relatives.filter(function(relative){
      return (relative.relationship.match('2nd Cousin') || relative.relationship.match('3rd Cousin')) && relative.maternal_side;
    });
    family.paternalDistantRelatives = relatives.filter(function(relative){
      return checkIfDistant(relative) && relative.paternal_side;
    });
    family.maternalDistantRelatives = relatives.filter(function(relative){
      return checkIfDistant(relative) && relative.maternal_side;
    });

    relatives.forEach(function(relative){
      if(relative.maternal_side === false && relative.paternal_side === false) {
        if(randomSideAssignment){
          relative.paternal_side = true;
          family.paternalFirstCousins = family.paternalFirstCousins || [];
          if(family.paternalFirstCousins.length >= 2) {
            family.paternalOtherCousins = family.paternalOtherCousins || [];
            family.paternalOtherCousins.push(relative);
          } else {
            family.paternalFirstCousins.push(relative);
          }
        } else {
          family.maternalFirstCousins = family.maternalFirstCousins || [];
          relative.maternal_side = true;
          if(family.maternalFirstCousins.length >= 2) {
            family.maternalOtherCousins = family.maternalOtherCousins || [];
            family.maternalOtherCousins.push(relative);
          } else {
            family.maternalFirstCousins.push(relative);
          }
        }
        randomSideAssignment = !randomSideAssignment;
      }
    });

    for(var prop in family){
      if(family[prop].length > 0){
        var which_side = (prop.search('maternal') === 0 ) ? 'maternal' : 'paternal';
        insertRelatives(family[prop], which_side);
      }
    }
    function checkIfDistant(relative){
      return family.paternalCloseRelatives.indexOf(relative) < 0 && family.maternalCloseRelatives.indexOf(relative) < 0 && family.paternalFirstCousins.indexOf(relative) < 0 &&
      family.maternalFirstCousins.indexOf(relative) < 0 && family.paternalOtherCousins.indexOf(relative) < 0 && family.maternalOtherCousins.indexOf(relative) < 0;
    }
  }


  function insertRelatives(relatives, side){
    var maternalBranch = relativeTree['children'][0];
    var paternalBranch = relativeTree['children'][1];

    if(side === 'maternal'){
      recursiveAdd(maternalBranch, relatives);
    } else {
      recursiveAdd(paternalBranch, relatives);
    }

    function recursiveAdd(parentNode, newNodes){
      if(parentNode.children.length === 0){
        var first = (newNodes.length > 1) ? newNodes.slice(0, 2) : newNodes;
        first.forEach(function(node){
          parentNode.children.push(node);
        });
      } else {
        var firstTwo = (newNodes.length > 1) ? newNodes.slice(0, 2) : newNodes;
        var theRest = newNodes.slice(2,  newNodes.length);
        recursiveAdd(parentNode.children[0], firstTwo);
        if(parentNode.children[1]){
          recursiveAdd(parentNode.children[1], theRest);
        }
      }

    }
  }

  function update(){
      nodes.forEach(function(node){
        if(node.x === undefined){
          node.radius = 15;
        }
        if(node.y === undefined){
          node.radius = 15;
        }
        if(node.relationship === 'me'){
          node.radius = 20;
          node.x = 670;
          node.y = 460;
          node.fixed = true;
          link.distance = 10;
        } else if(node.relationship === 'paternal_side'){
          node.x = 900;
          node.y = 400;
          node.radius = 20;
          node.fixed = true;
        } else if(node.relationship === 'maternal_side'){
          node.x = 430;
          node.y = 390;
          node.fixed = true;
          node.radius = 20;
        }
      });


      // Restart the force layout.
      force
          .nodes(nodes)
          .links(links)
          .charge(-290)
          .linkStrength(1)
          .linkDistance(90)
          .start();


      // Update nodes.
      node = node.data(nodes, function(d) { return d.id; });

      node.exit().remove();
      
       // var drag = d3.behavior.drag()

    // var node_drag = d3.behavior.drag()
        // .on("dragstart", dragstart)
        // .on("drag", dragmove)
        // .on("dragend", dragend);

    // function dragstart(d, i) {
    //   console.log('start')
    //     force.stop() // stops the force auto positioning before you start dragging
    // }

    // function dragmove(d, i) {
    //   console.log('move')
    //     d.px += d3.event.dx;
    //     d.py += d3.event.dy;
    //     d.x += d3.event.dx;
    //     d.y += d3.event.dy; 
    //     tick(); // this is the key to make it work together with updating both px,py,x,y on d !
    // }

    // function dragend(d, i) {
    //   console.log('end')
    //     d.fixed = true; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
    //     tick();
    //     force.resume();
    // }

      var nodeEnter = node.enter().append('g')
          .attr('padding', 50)
          .attr('class', '.node')
          .on('mousedown', function(){
            nodes.forEach(function(node){
              if(node.relationship === 'paternal_side' || node.relationship === 'me' || node.relationship === 'maternal_side'){
                node.fixed = false;
              }
            })
          })
          .on('mouseup', function(){
            nodes.forEach(function(node){
              if(node.relationship === 'paternal_side' || node.relationship === 'me' || node.relationship === 'maternal_side'){
                node.fixed = true;
              }
            })
          })
          .call(force.drag)

      nodeEnter.append('circle')
          .attr('fill', function(d){
            if(d.relationship === 'maternal_side'
              || d.relationship === 'paternal_side'
              || d.relationship === 'me') {
              return '#5C97BF'
            } else if(d.maternal_side){
              return '#F9690E';
            } else if(d.paternal_side){
              return '#BF55EC';
            } else {
              return '#F9690E';
            }
          })
          .attr('r', function(bubble) {
           return bubble.radius + 10;
          })
          .on('mouseover', function(bubble){
            var circle = d3.select(this);
            if(bubble.relationship === 'me'
              || bubble.relationship === 'maternal_side'
              || bubble.relationship === 'paternal_side') {
              return;
            } else {
              circle
                .transition()
                .attr('r', function(bubble){return bubble.radius * 2})
                .attr('opacity', '0.9')
            }
          })
          .on('mouseout', function(bubble){
            var circle = d3.select(this);
            if(bubble.relationship === 'me'
              || bubble.relationship === 'maternal_side'
              || bubble.relationship === 'paternal_side') {
              return;
            } else {
              circle
                .transition()
                .attr('r', function(bubble){return 25;})
                .attr('opacity', 1)
            }
          })
          .attr("data-target", function(bubble){
            if(bubble.relationship === 'me'
              || bubble.relationship === 'paternal_side'
              || bubble.relationship === 'maternal_side'){
              return null;
            } else {
              return "#myModal";
            }
          })
          .attr("data-toggle", function(bubble){
            if(bubble.relationship === 'me'
              || bubble.relationship === 'paternal_side'
              || bubble.relationship === 'maternal_side'){
              return null;
            } else {
              return "modal";
            }
          })
          .on('click', function(bubble){
            if(bubble.relationship === 'me') {
              return;
            } else {
              $scope.$apply(showRelative(bubble));
            }
          })
          // .call(force.drag)




      nodeEnter.append('text')
          .attr('dy', '.35em')
          .attr('dx', '-2em')
          .attr('class', 'treeBubbleText')
          .attr('pointer-events', 'none')
          .text(function(d) {
            if(d.relationship.toLowerCase() === 'distant relative'){
              return 'Distant';
            } else if(d.relationship.toLowerCase() === 'maternal_side') {
              return 'Maternal Side';
            } else if(d.relationship.toLowerCase() === 'paternal_side') {
              return 'Paternal Side';
            } else if(d.relationship.toLowerCase() === 'me') {
              return 'Me';
            } else {
              return d.relationship;
              }
            });
  }

  function tick(e) {
    var k = 6 * e.alpha;

   link
       .each(function(d) { d.source.y -= k, d.target.y += k; })
       .attr("x1", function(d) { return d.source.x; })
       .attr("y1", function(d) { return d.source.y; })
       .attr("x2", function(d) { return d.target.x; })
       .attr("y2", function(d) { return d.target.y; });
    
    // console.log('links', links)
    // links.forEach(function(d, i) {
    //   d.source.y -= k;
    //   d.target.y += k;
    // });

    node.attr('transform', function(d) {
      var nodeX = Math.max(radius, Math.min(svgWidth - radius, d.x));
      var nodeY = Math.max(radius, Math.min(svgHeight - radius, d.y));
      return 'translate(' + nodeX + ',' + nodeY + ')';
    });
  }
});
