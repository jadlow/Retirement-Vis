//
// Sources:
// https://jorin.me/d3-canvas-globe-hover/
// https://bl.ocks.org/mbostock/7ea1dde508cec6d2d95306f92642bc42
// Data Sources: 
// https://www.numbeo.com/quality-of-life/rankings_by_country.jsp
//

//
// Configuration
//

// ms to wait after dragging before auto-rotating
var rotationDelay = 3000
// scale of the globe (not the canvas element)
var scaleFactor = 0.9
// autorotation speed
var degPerSec = 6
// start angles
var angles = { x: -20, y: 40, z: 0}
// colors
var colorWater = '#fff'
var colorLand = '#808080'
var colorGraticule = '#ccc'
var colorCountry = '#a00'

//
// Variables
//

// bind d3 objects to HTML elements
var current = d3.select('#current')
var drill = d3.select('#drill')
var safety = d3.select('#safety')
var health = d3.select('#health')
var col = d3.select('#col')
var traffic = d3.select('#traffic')
var pollution = d3.select('#pollution')
var climate = d3.select('#climate')
var svg = d3.select("#legend").append("svg").attr("width", 400).attr("height", 200)
var canvas = d3.select('#globe')
var context = canvas.node().getContext('2d')
var water = {type: 'Sphere'}
// map the 2D lat/long coordiantes to 3D points on a sphere
var projection = d3.geoOrthographic().precision(0.1)
var graticule = d3.geoGraticule10()
var path = d3.geoPath(projection).context(context)
var v0 // Mouse position in Cartesian coordinates at start of drag gesture.
var r0 // Projection rotation as Euler angles at start.
var q0 // Projection rotation as versor at start.
var lastTime = d3.now()
var degPerMs = degPerSec / 1000
var width, height
var land, countries
var countryList
var autorotate, now, diff
var currentCountry
var color
var maxQOL
var minQOL
var numColors = 8

//
// Color Calculation and fill for country geometries
//

function getColor(val) {
  normVal = (val - minQOL) / (maxQOL - minQOL)
  return "rgb(0," +  Math.round(normVal*255) +", 0)";
}

function fill(obj, color) {
context.beginPath()
path(obj)
context.fillStyle = color
context.fill()
}

function stroke(obj, color) {
context.beginPath()
path(obj)
context.strokeStyle = color
context.stroke()
}

//
// Add Quality of Life data to json file
//

function loadData(cb) {
  d3.json('https://unpkg.com/world-atlas@1/world/110m.json', function(error, json) {
    if (error) throw error
    d3.tsv('./QOLv3.tsv', function(error, data) {
      if (error) throw error
        // calculate min and max quality of life values for color scale
        maxQOL = d3.max(data, function(d) { return parseInt(d.QOL); }) + 1
        minQOL = d3.min(data, function(d) { if (d.QOL > 0 ) { return parseInt(d.QOL);}  }) + 1
        for (var i = 0; i < data.length; i++) {
            var dataNum = data[i].id;
            var dataName = data[i].name;
            var dataQOL = data[i].QOL;
            for (var j = 0; j < json.objects.countries.geometries.length; j++) {
                var jsonCountryNum = json.objects.countries.geometries[j].id;
                if (parseInt(jsonCountryNum) == parseInt(dataNum)) {
                    json.objects.countries.geometries[j].properties = {'name': dataName, 'QOL': dataQOL};
                    break;
                }
            }
        }
      cb(json, data)
    })
  })
}

//
// Hover Handler and Drill Down Display
//

// display country specific drill down information when the mouse enters the country's geometry
function enter(country) {
  var country = countryList.find(function(c) {
    return parseInt(c.id, 10) === parseInt(country.id, 10)
  })
  current.text(country && country.name)
  drill.text('Quality of Life Index: ' + country.QOL )
  safety.text('Safety Index: ' + country.SI )
  health.text('Health Care Index: ' + country.HI )
  col.text('Cost of Living Index: ' + country.COLI )
  traffic.text('Traffic Index: ' + country.TI )
  pollution.text('Pollution Index: ' + country.PI )
  climate.text('Climate Index: ' + country.CI )
}

// remove the drill down information whene the mouse leaves the country's geometry
function leave(country) {
  current.text('')
  drill.text('')
  safety.text('')
  health.text('')
  col.text('')
  traffic.text('')
  pollution.text('')
  climate.text('')
}

//
// Initialize rotation angle + utility functions
//

function setAngles() {
  var rotation = projection.rotate()
  rotation[0] = angles.y
  rotation[1] = angles.x
  rotation[2] = angles.z
  projection.rotate(rotation)
}

// function to begin rotation after specified delay
function startRotation(delay) {
  autorotate.restart(rotate, delay || 0)
}

// function  to stop rotation immediately
function stopRotation() {
  autorotate.stop()
}


function rotate(elapsed) {
  now = d3.now()
  diff = now - lastTime
  if (diff < elapsed) {
    rotation = projection.rotate()
    rotation[0] += diff * degPerMs
    projection.rotate(rotation)
    render()
  }
  lastTime = now
}

//
// Render function for drag/scale/rotate/hover
//

// update country coloring (including current hovered country)
function render() {
  context.clearRect(0, 0, width, height)
  fill(water, colorWater)
  stroke(graticule, colorGraticule)
    for (var i = 0; i < countries.features.length; i++) {
        if (countries.features[i] != null && countries.features[i].properties.QOL > 0){
            color = getColor(countries.features[i].properties.QOL)
        }else{
            color = colorLand
        }
        fill(countries.features[i], color)
    }
  if (currentCountry) {
    fill(currentCountry, colorCountry)
  }
}

//
// Scales canvas and projection based on screen size
//

function scale() {
  width = document.documentElement.clientWidth
  height = document.documentElement.clientHeight
  canvas.attr('width', width).attr('height', height)
  projection
    .scale((scaleFactor * Math.min(width, height)) / 2)
    .translate([width / 2, height / 2])
  render()
}

//
// Mouse Drag Functions
//

function dragstarted() {
  v0 = versor.cartesian(projection.invert(d3.mouse(this)))
  r0 = projection.rotate()
  q0 = versor(r0)
  stopRotation()
}

function dragged() {
  var v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(this)))
  var q1 = versor.multiply(q0, versor.delta(v0, v1))
  var r1 = versor.rotation(q1)
  projection.rotate(r1)
  render()
}

function dragended() {
  startRotation(rotationDelay)
}

//
// Hover Handler and Drill Down Display
//

function mousemove() {
  var c = getCountry(this)
  if (!c) {
    if (currentCountry) {
      leave(currentCountry)
      currentCountry = undefined
      render()
    }
    return
  }
  if (c === currentCountry) {
    return
  }
  currentCountry = c
  render()
  enter(c)
}

function getCountry(event) {
  var pos = projection.invert(d3.mouse(event))
  return countries.features.find(function(f) {
    return f.geometry.coordinates.find(function(c1) {
      return polygonContains(c1, pos) || c1.find(function(c2) {
        return polygonContains(c2, pos)
      })
    })
  })
}

//
// Cursor Postition Algorithm from d3-polygon
// https://github.com/d3/d3-polygon
//

function polygonContains(polygon, point) {
  var n = polygon.length
  var p = polygon[n - 1]
  var x = point[0], y = point[1]
  var x0 = p[0], y0 = p[1]
  var x1, y1
  var inside = false
  for (var i = 0; i < n; ++i) {
    p = polygon[i], x1 = p[0], y1 = p[1]
    if (((y1 > y) !== (y0 > y)) && (x < (x0 - x1) * (y - y1) / (y0 - y1) + x1)) inside = !inside
    x0 = x1, y0 = y1
  }
  return inside
}

//
// Draw Quality of Life Legend
//

function addLegend(){
  deltaQOL = maxQOL / (numColors)
  console.log(minQOL)
  data = [40, 60, 80, 100, 120, 140, 160, 180, 200]
  data2 = ['Quality of Life Index']
  svg.selectAll('rect')
                .data(data)
                .enter().append('rect')
                  .attr('transform', function (d, i) {return 'translate('+ 40 * i +', 0)';})
                  .attr('width', 40)
                  .attr('height', 40)
                  .attr('stroke', 'black')
                  .attr('fill', function (d) {return getColor(d);});

  svg.selectAll('text')
                .data(data)
                .enter().append('text')
                .attr('transform', function (d, i) {return 'translate('+ 40 * i +', 60)';})
                .attr('fill', 'white')
                .text(function (d) {return parseInt(d);});
  svg.selectAll('h1')
                .data(data2)
                .enter().append('text')
                .attr('transform', function (d) {return 'translate(100, 90)';})
                .attr('fill', 'white')
                .attr('font-size', '18')
                .text(function (d) {return d;});
}

//
// Main Function
//

function main() {
  setAngles()

  canvas
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    )
    .on('mousemove', mousemove)

  loadData(function(world, cList) {
    land = topojson.feature(world, world.objects.land)
    countries = topojson.feature(world, world.objects.countries)
    countryList = cList
    addLegend()
    window.addEventListener('resize', scale)
    scale()
    autorotate = d3.timer(rotate)
  })
}

main()