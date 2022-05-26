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
// Handler
//

function enter(country) {
  var country = countryList.find(function(c) {
    return parseInt(c.id, 10) === parseInt(country.id, 10)
  })
  current.text(country && country.name + " " + country.QOL|| '')
}

function leave(country) {
  current.text('')
}

//
// Variables
//

var current = d3.select('#current')
var canvas = d3.select('#globe')
var context = canvas.node().getContext('2d')
var water = {type: 'Sphere'}
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
var autorotate, now, diff, roation
var currentCountry
var color
var maxQOL
var minQOL

//
// Functions
//

function setAngles() {
  var rotation = projection.rotate()
  rotation[0] = angles.y
  rotation[1] = angles.x
  rotation[2] = angles.z
  projection.rotate(rotation)
}

function scale() {
  width = document.documentElement.clientWidth
  height = document.documentElement.clientHeight
  canvas.attr('width', width).attr('height', height)
  projection
    .scale((scaleFactor * Math.min(width, height)) / 2)
    .translate([width / 2, height / 2])
  render()
}

function startRotation(delay) {
  autorotate.restart(rotate, delay || 0)
}

function stopRotation() {
  autorotate.stop()
}

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

function getColor(val) {
    normVal = (val - minQOL) / (maxQOL - minQOL)
    return "rgb(40," +  Math.round(normVal*255 + 80) +",40)";
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

function loadData(cb) {
  d3.json('https://unpkg.com/world-atlas@1/world/110m.json', function(error, json) {
    if (error) throw error
    d3.tsv('./QoLv2.tsv', function(error, data) {
      if (error) throw error
      console.log(data)
      console.log(data[0])
        maxQOL = d3.max(data, function(d) { return parseInt(d.QOL); }) + 1
        minQOL = d3.min(data, function(d) { return parseInt(d.QOL); }) + 1
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

// https://github.com/d3/d3-polygon
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
// Initialization
//

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
    console.log(land)
    console.log(countries)
    // for (var i = 0; i < countries.features.length; i++){
    //   console.log(countries.features[i])
    // }
  
  window.addEventListener('resize', scale)
  scale()
  autorotate = d3.timer(rotate)
})