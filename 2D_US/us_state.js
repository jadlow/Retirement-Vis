
/*  This visualization was made possible by modifying code provided by:

Scott Murray, Choropleth example from "Interactive Data Visualization for the Web" 
https://github.com/alignedleft/d3-book/blob/master/chapter_12/05_choropleth.html   
		
Malcolm Maclean, tooltips example tutorial
http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html

Mike Bostock, Pie Chart Legend
http://bl.ocks.org/mbostock/3888852  */


//Width and height of map
var width = 960;
var height = 500;
var canvas = d3.select("#states");

var g_max = 0;
var g_min = 0;
var g_min_city = 0;

var legend_array = [];



// D3 Projection
var projection = d3.geo.albersUsa()
				   .translate([width/2, height/2])    // translate to center of screen
				   .scale([1000]);          // scale things down so see entire US
        
// Define path generator
var path = d3.geo.path()               // path generator that will convert GeoJSON to SVG paths
		  	 .projection(projection);  // tell path generator to use albersUsa projection

		
// Define linear scale for output
var color = d3.scale.linear()
			  .range(["rgb(213,222,217)","rgb(69,173,168)","rgb(84,36,55)","rgb(217,91,67)"]);

function normalize(value) {
	return (value - g_min) / (g_max - g_min);
};



function get_color(value) {
	// base case if you hit a value withno data it will be 0 and greyed out
	if (value == 0) {
		return ( "rgb(180,180,180)");;
	}
	// console.log(normalize(value));
	green = Math.round(255 * normalize(value) + 80);

	return ( "rgb(40," + green + ",40)");
};

function normalize_qli_cities(index) {
	var val = index - g_min_city + 1;
	var squared = Math.pow(val, 1/2);
	return(squared);
};

var legendText = ["0-54","55-109", "110-164", "165 - 255"];

//Create SVG element and append map to the SVG
var svg = d3.select("body")
			.append("svg")
			.attr("width", width)
			.attr("height", height);
        
// Append Div for tooltip to SVG
var div = d3.select("body")
		    .append("div")   
    		.attr("class", "tooltip")               
    		.style("opacity", 0);

// Load in my states data!
d3.csv("stateslived.csv", function(data) {
color.domain([0,1,2,3]); // setting the range of the input data

g_max = d3.max(data, function(d) {return parseInt(d.visited);});
g_min = d3.min(data, function(d) {
		if (d.visited != 0) {
			return parseInt(d.visited);
		}
	});
// console.log(g_max);
// console.log(g_min);


// Load GeoJSON data and merge with states data
d3.json("us-states.json", function(json) {

// Loop through each state data value in the .csv file
for (var i = 0; i < data.length; i++) {

	// Grab State Name
	var dataState = data[i].state;

	// Grab data value 
	var dataValue = data[i].visited;

	// Find the corresponding state inside the GeoJSON
	for (var j = 0; j < json.features.length; j++)  {
		var jsonState = json.features[j].properties.name;

		if (dataState == jsonState) {

		// Copy the data value into the JSON
		json.features[j].properties.visited = dataValue; 

		// Stop looking through the JSON
		break;
		}
	}
}
		
// Bind the data to the SVG and create one path per GeoJSON feature
svg.selectAll("path")
	.data(json.features)
	.enter()
	.append("path")
	.attr("d", path)
	.style("stroke", "#fff")
	.style("stroke-width", "1")
	.style("fill", function(d) {

	// Get data value
	var value = d.properties.visited;

	if (value) {
	//If value exists…
	return get_color(value);
	} else {
	//If value is undefined…
	return "rgb(213,222,217)";
	}
});

		 
// Map the cities I have lived in!
d3.csv("cities-lived.csv", function(data) {

	g_min_city = d3.min(data, function(d) {
		if (d.years != 0) {
			return parseInt(d.years);
		}
	});

svg.selectAll("circle")
	.data(data)
	.enter()
	.append("circle")
	.attr("cx", function(d) {
		return projection([d.lon, d.lat])[0];
	})
	.attr("cy", function(d) {
		return projection([d.lon, d.lat])[1];
	})
	.attr("r", function(d) {
		return normalize_qli_cities(d.years);
	})
		.style("fill", "rgb(217,91,67)")	
		.style("opacity", 0.85)	

	// Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks" 
	// http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
	.on("mouseover", function(d) {      
    	div.transition()        
      	   .duration(200)      
           .style("opacity", .9);      
           div.text(d.place)
           .style("left", (d3.event.pageX) + "px")     
           .style("top", (d3.event.pageY - 28) + "px");    
	})   

    // fade out tooltip on mouse out               
    .on("mouseout", function(d) {       
        div.transition()        
           .duration(500)      
           .style("opacity", 0);   
    });
});  

var legend_list = [];
function legend_color() {
	var delta = (g_max - g_min) / 4;
	console.log(delta);
	for ( var i = 0; i < 4; i ++) {
		legend_list.push(g_min + i*delta);
	}

};
legend_color();
		
// Define linear scale for output
var color_legend = d3.scale.linear()
			  .range(legend_list);

function legend_color(color) {
	

};


// console.log(color_legend.domain().slice().reverse());

// var legend_svg = d3.select("#legend").append("svg").attr("width", 400).attr("height", 200)

// function addLegend(){
// 	var maxQOL=g_max
// 	var minQOL=g_min
// 	deltaQOL = maxQOL / (numColors)
// 	console.log(minQOL)
// 	data = [40, 60, 80, 100, 120, 140, 160, 180, 200]
// 	data2 = ['Quality of Life Index']
// 	legend_svg.selectAll('rect')
// 				  .data(data)
// 				  .enter().append('rect')
// 					.attr('transform', function (d, i) {return 'translate('+ 40 * i +', 0)';})
// 					.attr('width', 40)
// 					.attr('height', 40)
// 					.attr('stroke', 'black')
// 					.attr('fill', function (d) {return get_Color(d);});
  
// 				legend_svg.selectAll('text')
// 				  .data(data)
// 				  .enter().append('text')
// 				  .attr('transform', function (d, i) {return 'translate('+ 40 * i +', 60)';})
// 				  .attr('fill', 'white')
// 				  .text(function (d) {return parseInt(d);});
// 				  legend_svg.selectAll('h1')
// 				  .data(data2)
// 				  .enter().append('text')
// 				  .attr('transform', function (d) {return 'translate(100, 90)';})
// 				  .attr('fill', 'white')
// 				  .attr('font-size', '18')
// 				  .text(function (d) {return d;});
//   }
// // // Modified Legend Code from Mike Bostock: http://bl.ocks.org/mbostock/3888852
// // var legend = d3.select("body").append("svg")
// //       			.attr("class", "legend")
// //      			.attr("width", 140)
// //     			.attr("height", 200)
// //    				.selectAll("g")
// //    				.data(legend_list)
// //    				.enter()
// //    				.append("g")
// //      			.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

// //   	legend.append("rect")
// //    		  .attr("width", 18)
// //    		  .attr("height", 18)
// //    		  .style("fill",function (d) {return getColor(d);});

// //   	legend.append("text")
// //   		  .data(legendText)
// //       	  .attr("x", 24)
// //       	  .attr("y", 9)
// //       	  .attr("dy", ".35em")
// //       	  .text(function(d) { return d; });
 	});

});
