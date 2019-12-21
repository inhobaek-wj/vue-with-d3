import * as d3 from "d3";

export default class MyForce {
  constructor() {

  }

  drawGraph(links, width, height) {

    const maxOfWordOccurrence = 100,
          minOfWordOccurrence = 20,
          maxOfLinkDistance = 100,
          minOfLinkDistance = 10,
          pureLinks = links.map((previousLink) =>  {
            let newLink = {
              source: previousLink.source.nodeId,
              target: previousLink.target.nodeId,
              linkId: previousLink.linkId
            };
            return newLink;
          });

    let
    // gravity = 0.3,
    // charge = -1000,
    // width = document.querySelector(".technet-container").offsetWidth,
    // height = document.querySelector(".technet-container").offsetHeight,
    // linkDistance = 120,
    // linkStrength = 0.05,
    //  color = d3.scale.category20(), // d3 v3.
    color = d3.scaleOrdinal(d3.schemeCategory20), // d3 v4.
    fontSizeScale_1 =
      d3.scaleLinear().domain([minOfWordOccurrence, maxOfWordOccurrence]).range([0, 100]),
    fontSizeScale_2 =
      d3.scaleLinear().domain([10, 80]).range([20, 80]),
    linkDistanceScale =
      d3.scaleLinear().domain([ minOfLinkDistance, maxOfLinkDistance]).range([180, 210]),
    // linkStrenghScale =
    //     d3.scaleLinear().domain([ minOfLinkDistance, maxOfLinkDistance]).range([0.1, 0.01]),
    nodesData = makeNodes(links),
    div,
    svg,
    g,
    boxForce,
    collisionForce,
    theNode,
    rect,
    paths,
    nodes,
    firstScaling,
    offBtn;

    const simulation = d3.forceSimulation()
          .force("charge",d3.forceManyBody()
                 .strength(function() {
                   return -5000 / Math.sqrt(nodesData.length) - 200;
                 })
                )
          .force("centerX", d3.forceX(width / 2))
          .force("centerY", d3.forceY((height / 2) + 50))
          .force("box", boxForce)
          .force("collision",collisionForce)
          .force("link",d3.forceLink()
                 .id(function(d) {return d.id;})
                 .distance(function(d) {return linkDistanceScale(d.linkDistance);})
                );

    function ticked() {
      nodes.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

      // when link is path elements + middle marker
      paths.attr("d", function(d) {
        let sourceX = d.source.x,
            sourceY = d.source.y,
            targetX = d.target.x,
            targetY = d.target.y,
            midX = (targetX - sourceX) / 2 + sourceX,
            midY= (targetY - sourceY) / 2 + sourceY;

        return 'M' + sourceX + ',' + sourceY
          + 'L' + midX + ',' + midY
          + 'L' + targetX + ',' + targetY;
      });

      // when link is line elements
      // paths.attr("x1", function(d) { return d.source.x; })
      //   .attr("y1", function(d) { return d.source.y; })
      //   .attr("x2", function(d) { return d.target.x; })
      //   .attr("y2", function(d) { return d.target.y; });
    }

    function makeNodes(links) {

      let nodes = [],
          tmpObj = {},
          i = 0;

      links.forEach(function(link) {
        let source = link.source,
            target = link.target;

        if (!tmpObj[target.nodeId]) {
          nodes[i] = {
            id : target.nodeId,
            name: target.name
          };

          tmpObj[target.nodeId] = 1;

          i++;
        }

        if (!tmpObj[source.nodeId]) {
          nodes[i] = {
            id : source.nodeId,
            name: source.name
          };

          tmpObj[source.nodeId] = 1;

          i++;
        }

      });

      return nodes;
    }

    function boundedBox() {
      let size = constant([0, 0]),
          nodes,
          sizes,
          bounds;

      function force() {

        let i = -1,
            node,
            size,
            xi,
            x0,
            x1,
            yi,
            y0,
            y1;

        while (++i < nodes.length) {
          node = nodes[i];
          size = sizes[i];
          xi = node.x + node.vx;
          x0 = bounds[0][0] - xi;
          x1 = bounds[1][0] - (xi + size[0]);
          yi = node.y + node.vy;
          y0 = bounds[0][1] - yi;
          y1 = bounds[1][1] - (yi + size[1]);

          if (x0 > 0 || x1 < 0) {
            node.x += node.vx;
            node.vx = -node.vx;

            if (node.vx < x0) {
              node.x += x0 - node.vx;
            }

            if (node.vx > x1) {
              node.x += x1 - node.vx;
            }
          }

          if (y0 > 0 || y1 < 0) {
            node.y += node.vy;
            node.vy = -node.vy;

            if (node.vy < y0) {
              node.vy += y0 - node.vy;
            }
            if (node.vy > y1) {
              node.vy += y1 - node.vy;
            }
          }
        }
      }

      force.initialize = function (_) {
        sizes = (nodes = _).map(size);
      };

      force.bounds = function (_) {
        return (arguments.length ? (bounds = _, force) : bounds);
      };

      force.size = function (_) {
        return (arguments.length
                ? (size = typeof _ === "function" ? _ : constant(_), force)
                : size);
      };

      return force;
    }

    function rectCollide() {

      let size = constant([0, 0]),
          strength = 2,
          iterations = 60,
          nodes,
          sizes,
          masses;

      function force() {
        let i = -1,
            node,
            size,
            mass,
            xi,
            yi;

        while (++i < iterations) {
          iterate();
        }

        function iterate() {
          let j = -1,
              tree = d3.quadtree(nodes, xCenter, yCenter).visitAfter(prepare);

          while (++j < nodes.length) {
            node = nodes[j];
            size = sizes[j];
            mass = masses[j];
            xi = xCenter(node);
            yi = yCenter(node);

            tree.visit(apply);
          }
        }

        function apply(quad, x0, y0, x1, y1) {
          let data = quad.data,
              xSize = (size[0] + quad.size[0]) / 1.8,
              ySize = (size[1] + quad.size[1]) / 2,
              x,
              y,
              xd,
              yd,
              l,
              m;

          if (data) {

            if (data.index <= node.index) {
              return;
            }

            x = xi - xCenter(data);
            y = yi - yCenter(data);
            xd = Math.abs(x) - xSize;
            yd = Math.abs(y) - ySize;

            if (xd < 0 && yd < 0) {
              l = Math.sqrt(x * x + y * y);
              m = masses[data.index] / (mass + masses[data.index]);

              if (Math.abs(xd) < Math.abs(yd)) {
                node.vx -= (x *= xd / l * strength) * m;
                data.vx += x * (1 - m);
              } else {
                node.vy -= (y *= yd / l * strength) * m;
                data.vy += y * (1 - m);
              }
            }
          }

          return x0 > xi + xSize || y0 > yi + ySize ||
            x1 < xi - xSize || y1 < yi - ySize;
        }

        function prepare(quad) {
          let i = -1;

          if (quad.data) {
            quad.size = sizes[quad.data.index];
          } else {
            quad.size = [0, 0];

            while (++i < 3) {

              if (quad[i] && quad[i].size) {
                quad.size[0] = Math.max(quad.size[0], quad[i].size[0]);
                quad.size[1] = Math.max(quad.size[1], quad[i].size[1]);
              }
            }
          }
        }
      }

      function xCenter(d) {
        return d.x + d.vx + sizes[d.index][0] / 2;
      }
      function yCenter(d) {
        return d.y + d.vy + sizes[d.index][1] / 4;
      }

      force.initialize = function (_) {
        sizes = (nodes = _).map(size);
        masses = sizes.map(function (d) { return d[0] * d[1]; });
      };

      force.size = function (_) {
        return (arguments.length
                ? (size = typeof _ === "function" ? _ : constant(_), force)
                : size);
      };

      force.strength = function (_) {
        return (arguments.length ? (strength = +_, force) : strength);
      };

      force.iterations = function (_) {
        return (arguments.length ? (iterations = +_, force) : iterations);
      };

      return force;
    }

    function constant(_) {
      return function () { return _; };
    }

    //Zoom functions
    function zoomActions(){
      g.attr("transform", d3.event.transform);
    }

    function dragstarted(d) {
      if (!d3.event.active){
        simulation
          .alphaTarget(0.01)
          .restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    // d3 v4.
    div = d3.select(".white-board");

    div.selectAll("*").remove();

    svg = div.append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 1000 700")
      .attr("width", width)
      .attr("height", height);

    g = svg.append("g")
      .attr("class","wrapper");

    // Create Arrow head SVG definition
    svg.append("svg:defs")
      .selectAll("marker")
      .data(["normal", "selected"])      // Different link/path types can be defined here
      .enter()
      .append("svg:marker")    // This section adds in the arrows
      .attr("id", d => {
        if (d === "normal") {
          return "normal";
        } else if(d === "selected"){
          return "selected";
        } else {
          return "normal";
        }
      })
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 1)
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("orient", "auto")
      .on("click", function(d) {
        console.log("clicked");
      })
      .append("svg:path")
      .attr("fill",d => {
        if (d === "normal") {
          return "#308277";
        } else if(d === "selected"){
          return "red";
        } else {
          return "#308277";
        }
      })
      .attr("d", "M0,-5L10,0L0,5");

    paths = g
      .selectAll("path")
      .data(pureLinks)
      .enter()
      .append("path")
      .attr("class","link")
      .attr("marker-mid","url(#normal)");

    paths.on("click", function(d) {
      if (d3.select(this).classed("selected-link")) {
        d3.select(this)
          .attr("marker-mid","url(#normal)")
          .classed("selected-link",false);
      } else {
        d3.select(this)
          .attr("marker-mid","url(#selected)")
          .classed("selected-link",true);
      }
    });

    // nodes = svg
    nodes = g
      .selectAll("g")
      .data(nodesData)
      .enter()
      .append("g")
      .attr("class","node");

    nodes.call(d3.drag()
               .on("start", dragstarted)
               .on("drag", dragged)
               .on("end", d => {
                 if (!d3.event.active) {
                   simulation.alphaTarget(0);
                 }

                 let tmpLinkList = [],
                     tmpLink = {
                       srcNode: {
                         nodeId: d.id,
                         xPos: d.fx,
                         yPos: d.fy
                       }
                     };

                 tmpLinkList.push(tmpLink);
                 this.saveNodePosition(tmpLinkList);
               }));

    nodes.append("text")
      .attr("class", "text")
      .attr("font-size", function(d) {
        return 15;
      }).style("fill", function(d) {
        return "black";
      }).text(function(d) {
        return d.name;
      })
      .attr("y", function(d){

        theNode = d3.selectAll(".node").filter(function(el) {
          return el.id === d.id;
        });

        theNode.each(function() {
          rect = this.getBoundingClientRect();
        });

        return rect.height/4;
      });

    // nodes.on("click", function() {
    //   d3.event.preventDefault();
    //   d3.event.stopPropagation();
    //   //if (d3.event.defaultPrevented) return;// ignore drag
    // });

    boxForce = boundedBox()
      .bounds([[0, 0], [width, height-10]])
      .size(function (d) {
        theNode = d3.selectAll(".node").filter(function(el) {
          return el.id === d.id;
        });

        theNode.each(function() {
          rect = this.getBoundingClientRect();
        });
        return [rect.width, rect.height];
      });

    collisionForce = rectCollide()
      .size(function (d) {
        theNode = d3.selectAll(".node").filter(function(el) {
          return el.id === d.id;
        });

        theNode.each(function() {
          rect = this.getBoundingClientRect();
        });
        return [rect.width, rect.height];
      });

    // d3 v4.

    simulation.nodes(nodesData)
      .on("tick", ticked);

    simulation.force("link")
      .links(pureLinks);

    //add zoom capabilities
    const  zoomHandler = d3.zoom()
          .on("zoom", zoomActions);

    zoomHandler(svg);

  };

}
