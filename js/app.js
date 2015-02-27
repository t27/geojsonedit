//Done
//Draw polygons and other shapes using leaflet.draw lib(unofficial lib)
//Make them draggable using leaflet.draw.drag(again unofficial) lib
////Add more buttons to leaflet draw for enabling disabling features like the selector box
//Shown selection box, now need to select all elements inside it
//
//TODO
//Add ability to select through selection box --- Partly DONE
//http://stackoverflow.com/questions/17611596/multiple-marker-selection-within-a-box-in-leaflet
//

//
//
//Add popups to edit or add fields to geojson

var map;// = L.map('map', {drawControl: false}).setView([51.505, -0.09], 13);
var areaSelect;
var writable=true;
var maki="";
var showStyle=true;
var selectorEnabled=false;
var drawnItems ;
var locationFilter ;

// function removeSelector(){
//     areaSelect.remove();
// }

// function addSelector(){
//     //Selector
//     // Add it to the map
//     areaSelect = L.areaSelect({width:200, height:300});
//     areaSelect.addTo(map);

//     // Read the bounding box
//     var bounds = areaSelect.getBounds();

//     // Get a callback when the bounds change
//     areaSelect.on("change", function() {
//         console.log("Bounds:", JSON.stringify(this.getBounds()));
//     });
// }
// function toggleSelect(){
//     if(selectorEnabled==false){
//         addSelector();
//         selectorEnabled=true;
//     }
//     else{
//         areaSelect.off("change");
//         removeSelector();
//         selectorEnabled=false;
//     }
// }
function addSelector2(){
    locationFilter = new L.LocationFilter().addTo(map);
    locationFilter.on("change", function (e) {
        // Do something when the bounds change.
        // Bounds are available in `e.bounds`.
        console.log(e.bounds);
    });
    //can use in future
    //locationfilter.getBounds().contains(<Bounds> or <Point>)
}
function removeSelector2(){
    locationFilter.clearAllEventListeners()
    locationFilter.disable();
    map.removeLayer(locationFilter);
}
function toggleSelector2(){
    if(selectorEnabled==false){
        addSelector2();
        selectorEnabled=true;
    }
    else{
        // areaSelect.off("change");
        removeSelector2();
        selectorEnabled=false;
    }
}

function getGeoJSONFile(){
    $.ajax({
        type: "GET",
        url: "./linkjson.geojson",
        dataType: 'json',
        success: function (response) {

            drawnItems.addData(response);
            map.fire("draw:edited");
            // console.log(response)
        }
    });
}


function init(){
    map = L.map('map', {drawControl: false}).setView([51.505, -0.09], 13);

    // add an OpenStreetMap tile layer
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialise the creating GeoJSON Layer
    drawnItems = L.geoJson(null,{
        style: function (feature) {//currently styling according to shape, but add possibility to load color from geojson file
            switch(feature.geometry.type){
                case "Point": return {color: 'blue'};//no need for a break here!
                case "Polygon":  return {color: 'purple'};
                case "LineString":  return {color: 'red'};
                default: return null;
            }
        },
        onEachFeature: function add(feature,l) {
                                bindPopup(l);
                                // l.addTo(layer);
                                l.on({
                                        mouseover:highlightFeature,
                                        mouseout:resetHighlight
                                    });
                            }

    });

    drawnItems.addTo(map);
    var marker = L.marker([51.5, -0.09],{draggable: true}).toGeoJSON();
    drawnItems.addData(marker);

    var polygon = L.polygon([
        [51.509, -0.08],
        [51.503, -0.06],
        [51.51, -0.047]
    ]).toGeoJSON();
    drawnItems.addData(polygon);

    // Initialise the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
            polygon: {
             shapeOptions: {
              color: 'purple'
             },
             allowIntersection: false,
                  drawError: {
                   color: 'orange',
                   timeout: 1000
                  },
            },
            polyline: {
             shapeOptions: {
              color: 'red'
             },
            },
            rect: {
             shapeOptions: {
              color: 'green'
             },
            },
            circle: false
        },
        edit: {
        featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;
        drawnItems.addData(layer.toGeoJSON());

        //Update GeoJSON
        var shape = drawnItems.toGeoJSON()
        $('#my-geojson').val(JSON.stringify(shape,null,4));

        //Add Popup According to Shape Type
        //done in GeoJson layer definition


    });
    map.on('draw:edited', function (e) {
        var type = e.layerType,
            layer = e.layer;

        //Update GeoJSON
        var shape = drawnItems.toGeoJSON()
        $('#my-geojson').val(JSON.stringify(shape,null,2));
        drawnItems.eachLayer(function add(l) {
                                    l.unbindPopup();
                                    bindPopup(l);
                                    l.on({
                                        mouseover:highlightFeature,
                                        mouseout:resetHighlight
                                    });
                                });

    });
    map.on('draw:deleted', function (e) {
        map.fire('draw:edited');
    });

    map.fire("draw:edited");

    map.on("popupopen",function(e) {
            var sel = d3.select(e.popup._contentNode);

            sel.selectAll('.cancel')
                .on('click', clickClose);

            sel.selectAll('.save')
                .on('click', saveFeature);

            sel.selectAll('.add')
                .on('click', addRow);

            sel.selectAll('.delete-invert')
                .on('click', removeFeature);

            function clickClose() {
                map.closePopup(e.popup);
            }

            function removeFeature() {
                if (e.popup._source && drawnItems.hasLayer(e.popup._source)) {
                    drawnItems.removeLayer(e.popup._source);
                    // alert("removedFeature");
                    // context.data.set({map: context.mapLayer.toGeoJSON()}, 'popup');
                    map.fire("draw:edited");
                }
            }

            function losslessNumber(x) {
                var fl = parseFloat(x);
                if (fl.toString() === x) return fl;
                else return x;
            }

            function saveFeature() {
                var obj = {};
                var table = sel.select('table.marker-properties');
                table.selectAll('tr').each(collectRow);
                function collectRow() {
                    if (d3.select(this).selectAll('input')[0][0].value) {
                        obj[d3.select(this).selectAll('input')[0][0].value] =
                            losslessNumber(d3.select(this).selectAll('input')[0][1].value);
                    }
                }
                e.popup._source.feature.properties = obj;
                // context.data.set({map: context.mapLayer.toGeoJSON()}, 'popup');
                map.fire("draw:edited");
                map.closePopup(e.popup);
            }

            function addRow() {
                var tr = sel.select('table.marker-properties tbody')
                    .append('tr');

                tr.append('th')
                    .append('input')
                    .attr('type', 'text');

                tr.append('td')
                    .append('input')
                    .attr('type', 'text');
            }
        });


}

function bindPopup(l) {

    var properties = l.toGeoJSON().properties,
        table = '',
        info = '';

    if (!properties) return;

    if (!Object.keys(properties).length) properties = { '': '' };

    
/*//This Block will add default style properties to the properties table
    if (l.feature && l.feature.geometry && writable) {
        //This Block will add default style properties to the properties table
        if (l.feature.geometry.type === 'Point') {
            if (!('marker-color' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="marker-color"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="color" value="#7E7E7E"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('marker-size' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="marker-size"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="text" list="marker-size" value="medium"' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-size"><option value="small"><option value="medium"><option value="large"></datalist></td></tr>';
            }
            if (!('marker-symbol' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="marker-symbol"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="text" list="marker-symbol" value=""' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-symbol">' + maki + '</datalist></td></tr>';
            }
        }
        if (l.feature.geometry.type === 'LineString' || l.feature.geometry.type === 'Polygon') {
            if (!('stroke' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="stroke"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="color" value="#555555"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('stroke-width' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="stroke-width"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="number" min="0" step="0.1" value="2"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('stroke-opacity' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="stroke-opacity"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="number" min="0" max="1" step="0.1" value="1"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
        }
        if (l.feature.geometry.type === 'Polygon') {
            if (!('fill' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="fill"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="color" value="#555555"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
            if (!('fill-opacity' in properties)) {
                table += '<tr class="style-row"><th><input type="text" value="fill-opacity"' + (!writable ? ' readonly' : '') + ' /></th>' +
                    '<td><input type="number" min="0" max="1" step="0.1" value="0.5"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
            }
        }
    }
*/
    for (var key in properties) {
        if ((key == 'marker-color' || key == 'stroke' || key == 'fill') && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="color" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
        else if (key == 'marker-size' && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" list="marker-size" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-size"><option value="small"><option value="medium"><option value="large"></datalist></td></tr>';
        }
        else if (key == 'marker-symbol' && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" list="marker-symbol" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /><datalist id="marker-symbol">' + maki + '</datalist></td></tr>';
        }
        else if (key == 'stroke-width' && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="number" min="0" step="0.1" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
        else if ((key == 'stroke-opacity' || key == 'fill-opacity') && writable) {
            table += '<tr class="style-row"><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="number" min="0" max="1" step="0.1" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
        else {
            table += '<tr><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
        }
    }

    if (l.feature && l.feature.geometry) {
        info += '<table class="metadata">';
        if (l.feature.geometry.type === 'LineString') {
            var total = d3.pairs(l.feature.geometry.coordinates).reduce(function(total, pair) {
                return total + L.latLng(pair[0][1], pair[0][0])
                    .distanceTo(L.latLng(pair[1][1], pair[1][0]));
            }, 0);
            info += '<tr><td>Meters</td><td>' + total.toFixed(2) + '</td></tr>' +
                    '<tr><td>Kilometers</td><td>' + (total / 1000).toFixed(2) + '</td></tr>' +
                    '<tr><td>Feet</td><td>' + (total / 0.3048).toFixed(2) + '</td></tr>' +
                    '<tr><td>Yards</td><td>' + (total / 0.9144).toFixed(2) + '</td></tr>' +
                    '<tr><td>Miles</td><td>' + (total / 1609.34).toFixed(2) + '</td></tr>';
        } else if (l.feature.geometry.type === 'Point') {
            info += '<tr><td>Latitude </td><td>' + l.feature.geometry.coordinates[1].toFixed(4) + '</td></tr>' +
                    '<tr><td>Longitude</td><td>' + l.feature.geometry.coordinates[0].toFixed(4) + '</td></tr>';
        } else if (l.feature.geometry.type === 'Polygon') {
          info += '<tr><td>Sq. Meters</td><td>' + (LGeo.area(l)).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Kilometers</td><td>' + (LGeo.area(l) / 1000000).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Feet</td><td>' + (LGeo.area(l) / 0.092903).toFixed(2) + '</td></tr>' +
                  '<tr><td>Acres</td><td>' + (LGeo.area(l) / 4046.86).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Miles</td><td>' + (LGeo.area(l) / 2589990).toFixed(2) + '</td></tr>';
        }
        info += '</table>';
    }

    var tabs = '<div class="pad1 tabs-ui clearfix col12">' +
                    '<div class="tab col12">' +
                        '<input class="hide" type="radio" id="properties" name="tab-group" checked="true">' +
                        '<label class="keyline-top keyline-right tab-toggle pad0 pin-bottomleft z10 center col6" for="properties">Properties</label>' +
                        '<div class="space-bottom1 col12 content">' +
                            '<table class="space-bottom0 marker-properties">' + table + '</table>' +
                            (writable ? '<div class="add-row-button add fl col3"><i class="fa fa-plus"></i> Add row</div>' +
                            '<div class="fl text-right col9"><input type="checkbox" id="show-style" name="show-style" value="true" checked><label for="show-style">Show style properties</label></div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="space-bottom2 tab col12">' +
                        '<input class="hide" type="radio" id="info" name="tab-group">' +
                        '<label class="keyline-top tab-toggle pad0 pin-bottomright z10 center col6" for="info">Info</label>' +
                        '<div class="space-bottom1 col12 content">' +
                            '<div class="marker-info">' + info + ' </div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

    var content = tabs +
        (writable ? '<div class="clearfix col12 pad1 keyline-top">' +
            '<div class="pill col6">' +
            '<button class="save col6 major">Save</button> ' +
            '<button class="minor col6 cancel">Cancel</button>' +
            '</div>' +
            '<button class="col6 text-right pad0 delete-invert"><i class="fa fa-times-circle"></i> Delete feature</button></div>' : '');

    l.bindPopup(L.popup({
        closeButton: false,
        maxWidth: 500,
        maxHeight: 400,
        autoPanPadding: [5, 45],
        className: 'geojsonio-feature'
    }, l).setContent(content));

    l.on('popupopen', function(e){
        if (showStyle === false) {
            d3.select('#show-style').property('checked', false);
              d3.selectAll('.style-row').style('display','none');
        }
        d3.select('#show-style').on('click', function() {
            if (this.checked) {
                showStyle = true;
                d3.selectAll('.style-row').style('display','');
            } else {
                showStyle = false;
                d3.selectAll('.style-row').style('display','none');
            }
        });
    });
}

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    // console.log( evt.target.file1);
    // console.log( evt.target);
    // files is a FileList of File objects. List some properties.
    var output = [];

    var file1=files[0];

    var ext = file1.name.split('.').pop();
    if(ext.toLowerCase()!='geojson'){
        alert("Only .geojson files allowed");
        return;
    }
    // Read selected file using HTML5 File API
    var reader = new FileReader();
    reader.readAsText(file1);
    reader.onload=function(file1){
        return function(e){
            var obj = JSON.parse(e.target.result);
            // var importedJSON=L.geoJson(obj);
            drawnItems.addData(obj);
            map.fire("draw:edited");
            console.log(e.target.result);
        }
    }(file1);
}



function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#FFFF00',
        dashArray: '',
        fillOpacity: 0.5
    });

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
}
function resetHighlight(e) {
    drawnItems.resetStyle(e.target);
}