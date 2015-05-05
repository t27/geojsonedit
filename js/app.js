//----DONE----
//Draw polygons and other shapes using leaflet.draw lib(unofficial lib)
//Make them draggable using leaflet.draw.drag(again unofficial) lib
//Add more buttons to leaflet draw for enabling disabling features like the selector box
//Shown selection box, now need to select all elements inside it
//Add ability to select through selection box
//Add popups to edit or add fields to geojson
//added multiple layers and  layer selector
//converted info popus to tabbed editor in the sidebar

//added delete layer option
//In the geojson data textarea,  add an option to view geojson layer wise or to view a common geojson. Since currently each imported file is a new layer, 
//   there will be multiple "FeatureCollections" right now, can possibly add an option to merge layers and show the combined geojson in one FeatureCollection

//http://stackoverflow.com/questions/17611596/multiple-marker-selection-within-a-box-in-leaflet



/*----TODO-----5/March/2015
*
* 1.Make the  geojson info subtables editable. i.e. add the ability to "Add" a new row and "Save" the edited data, they are input text fields only right now
* 2.Update the map when the geojson text field ('#my-geojson') is edited, alert if invalid
* [Done-26/Mar/15]3.In the geojson data textarea,  add an option to view geojson layer wise or to view a common geojson. Since currently each imported file is a new layer, 
*   there will be multiple "FeatureCollections" right now, can possibly add an option to merge layers and show the combined geojson in one FeatureCollection
* 4.Highlight markers?
* 5.Option to save the textarea as a file
* 6.add some level of persistence across sessions using local browser storage?
* 7. IMP TODO
*     MultilineString and MultiPolygons can only be displayed right now, attempts to edit them may crash the app, as they are not supported by the draw plugin 
*     First, ensure the app doesnt crash when trying to edit multi-line/polygon features
*     Second, add functionality to edit multi lines/polygons in the leaflet.draw plugin and push changes upstream[on hold]
*/

var map;// = L.map('map', {drawControl: false}).setView([51.505, -0.09], 13);
var areaSelect;
var writable=true;
var maki="";
var showStyle=true;
var selectorEnabled=false;
var drawnItems ;
var drawnItems2;
var locationFilter;
var selectedLayer;
var editableLayers;
var drawControl;
var layerController;
var overlayMaps = {};//empty array for storing the layers to be drawn
var mergedLayers;
function addSelector2(){
    $('#bboxdiv').show();

    locationFilter = new L.LocationFilter({adjustButton:false,buttonPosition:'bottomleft'}).addTo(map);
    locationFilter.on("change", function (e) {
        // Do something when the bounds change.
        // Bounds are available in `e.bounds`.
        // console.log(e.bounds);
        select_features(e.bounds);

    });
    locationFilter.on("enabled", function (e) {
        select_features(e.bounds);
        console.log(e.bounds);

    });

    locationFilter.on("enableClick", function (e) {
        select_features(e.bounds);
    });

    //can use in future
    //locationfilter.getBounds().contains(<Bounds> or <Point>)
}
function removeSelector2(){
    locationFilter.clearAllEventListeners();
    locationFilter.disable();
    map.removeLayer(locationFilter);
    $('#bboxdiv').hide();

}
function toggleSelector2(){
    if(selectorEnabled===false){
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

function styleFeatureFunc(feature){

   //currently styling according to shape, but can easily add possibility to load color from geojson file
    switch(feature.geometry.type){
        case "Point": return {color: 'blue'};//no need for a break here!
        case "Polygon":  return {color: 'purple'};
        case "LineString":  return {color: '#FF0000',fillOpacity: 1};
        case "MultiLineString": return {color: '#880000',fillOpacity: 1};
        default: return null;
    }

}


function addFeatureEventListeners(feature,l) {
    // bindPopup(l);
    // l.addTo(layer);
    l.on({
            click:addTableOnClick,
            mouseover:highlightFeature,
            mouseout:resetHighlight
        });
}

function highlightFeature(e) {
    if(e.target.toGeoJSON().geometry===undefined){
        //if condition checks if the current calling object is a feature or not, if not a feature then its geojson will not have a geometry variable then return
        return;
    }
    //important info
    //when (e.target.toGeoJSON().geometry!==undefined) is true, it implies that the layer(e.target) is a geojson feature,
    //a geojson feature can have sub layers in its _layers list only if it is a multipolygon or multiline string
    /*to check if the current feature(e.target) has sub layers or not use the following condition - if(e.target._layers!==undefined)*/

    var layer = e.target;
    if(e.target.toGeoJSON().geometry.type!="Point")
    {
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
    else{//if its a marker
        //set different icon for highlighting
    }
}
function resetHighlight(e) {
   if(e.target.toGeoJSON().geometry===undefined){
       //if condition checks if the current calling object is a feature or not, if not a feature then its geojson will not have a geometry variable then return
       return;
   }
    drawnItems.resetStyle(e.target);
    if(selectorEnabled){
        select_features(locationFilter.getBounds());
        // console.log();
    }
}


function addOverlayToLayerCtrl( layer,layer_str,addtomap){//possibly rename the functoin to addOverlayToApp or addOverlay()
    if(addtomap===true){
        layer.addTo(map);
    }
    //each addition (numbered) will have a  corresponding removal in the next function
    
    //1.add the layer to the layer selector control on the map
    layerController.addOverlay(layer,layer_str);

    //2.add to layer editor selector below map
    $('#layer-select').append('<option value="'+layer_str+'" id="select-'+layer_str+'">'+layer_str+'</option>');//update the layer selector below the map
    
    //3.add the layer geojson tab to the map
        
    var layertabid="geojsontablayer-"+layer_str;
    var tab_ctrl='<li class="" id="li-'+layertabid+'"><a href="#pane-'+layertabid+'" tabindex="-1" role="tab" id="dropdown1-tab-'+layertabid+'" data-toggle="tab" aria-controls="'+layertabid+'" aria-expanded="false">'+layer_str+'</a></li>';
    var tab_data='<div role="tabpanel" class="tab-pane" id="pane-'+layertabid+'"  style="height:90%"><textarea class="form-control" id="'+layer_str+'-geojson" style="height:100%" ></textarea></div>';

    //make the #layerDropdownMenu visible
    $('#layerDropdownMenu').show();
    // #layerDropdown-list
    $(tab_ctrl).appendTo("#layerDropdown-list");
    // #geojson-tab-panes
    $(tab_data).appendTo("#geojson-tab-panes")


    //4.add to the global hashmap data-structure
    overlayMaps[layer_str]=layer;
}

function removeOverlayFromLayerCtrl( layer,layer_str){
    // if(addtomap===true){
    //     layer.addTo(map);
    // }
    if(map.hasLayer(layer)){
        map.removeLayer(layer);
    }

    //1.remove the layer from the layer selector control on the map
    layerController.removeLayer(layer,layer_str);

    //2.remove layer from layer editor selector below map
    $('#select-'+layer_str).remove();

    console.log("removed layer");
    //3.remove the layer from geojson tab to the map
    $("#li-geojsontablayer-"+layer_str).remove();
    $("#pane-geojsontablayer-"+layer_str).remove();
        //check if map layers are empty, if yes then hide the dropdown menu


    //4.remove layer from the global hashmap data-structure
    delete overlayMaps[layer_str];

    //remove layer from editablelayers list
}

function updateDrawControl(editLayer){
    //removes existing layer draw control and adds a new control for the "editLayer"
    if(drawControl!==undefined){
        map.removeControl(drawControl);
        console.log("removedControl")
    }

    drawControl = new L.Control.Draw({
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
        featureGroup: editLayer
        }
    });

    map.addControl(drawControl);
}
function deleteCurrentLayer(){//called on pressing the delete button
    var selector=$("#layer-select").val();
    removeOverlayFromLayerCtrl(overlayMaps[selector],selector);
    map.fire("draw:edited");
    checkAllLayersEmpty();
}

function checkAllLayersEmpty(){
    //disables if layer list is empty, enables otherwise
    if($("#layer-select").html().trim()===""){
        //layer list is empty
        $('#layerDropdownMenu').hide();

        $('#deleteLayer').prop("disabled",true);
    }
    else{
        $('#deleteLayer').prop("disabled",false);
    }
}
function updateLayerWiseGeoJSON(){
    for (var key in overlayMaps) {
        if (overlayMaps.hasOwnProperty(key)) {
            $('#'+key+'-geojson').val(JSON.stringify(overlayMaps[key].toGeoJSON(),null,2));
        }
    }
}
function updateAllLayerGeoJSON(){
    mergedLayers=L.geoJson();
    var layer;
    for (var key in overlayMaps) {
        if (overlayMaps.hasOwnProperty(key)) {
            // $('#'+key+'-geojson').val(JSON.stringify(overlayMaps[key].toGeoJSON(),null,2));
            layer=overlayMaps[key];
            layer.eachLayer(function(l){
                mergedLayers.addLayer(l);
            });
        }
    }
    $('#my-geojson').val(JSON.stringify(mergedLayers.toGeoJSON(),null,2))
}

function init(){
    // "lat":38.548165423046584,"lng":4.21875
    map = L.map('map', {drawControl: false}).setView([51.505, -0.09], 2);
    // var osmb = new OSMBuildings(map).loadData();
    // L.control.layers({}, { Buildings:osmb }).addTo(map);
    $('#layerDropdownMenu').hide();

    layerController=L.control.layers(null,null).addTo(map);
    editableLayers=L.featureGroup();
    $('#bboxdiv').hide();
    map.on('click',function(e){console.log(JSON.stringify(e.latlng))});
    // add an OpenStreetMap tile layer
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // var OSM_BW = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    //     attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    // });
    // OSM_BW.addTo(map);
    // Initialise the creating GeoJSON Layer
    drawnItems = L.geoJson(null,{
        style: styleFeatureFunc,
        onEachFeature: addFeatureEventListeners

    });

    // updateDrawControl(drawnItems);
    $('#layer-select').change(function(){
        var selector=$("#layer-select").val();

        updateDrawControl(overlayMaps[selector]);
        checkAllLayersEmpty();
    });

    map.on('draw:created', function (e) {
        var type = e.layerType,
            layer = e.layer;
            console.log(type);
        var selector=$("#layer-select").val();
        overlayMaps[selector].addData(layer.toGeoJSON());
        // drawnItems.addData(layer.toGeoJSON());

        //Update GeoJSON
        var shape = editableLayers.toGeoJSON();
        // $('#my-geojson').val(JSON.stringify(shape,null,4));
        updateAllLayerGeoJSON();
        updateLayerWiseGeoJSON();
        //Add Popup According to Shape Type
        //done in GeoJson layer definition
    });

    map.on('draw:edited', function (e) {
        var type = e.layerType,
            layer = e.layer;

        //Update GeoJSON
        var shape = editableLayers.toGeoJSON();
        // $('#my-geojson').val(JSON.stringify(shape,null,2));
        updateAllLayerGeoJSON()
        updateLayerWiseGeoJSON();
        if(selectorEnabled){
            select_features(locationFilter.getBounds());
        }

    });
    map.on('draw:deleted', function (e) {
        map.fire('draw:edited');
    });

    map.fire("draw:edited");
}



function showProperties(properties1,keymain) {

    var table='<table class="table" >';
    //create the data table in a string
    // console.log(JSON.stringify(properties1));

    for(key in properties1){
        table += '<tr><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
            '<td><input type="text" value="' + JSON.stringify(properties1[key]) + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
    }
    table+="</table>"
    //add a tab to the maintabpane
    //
    var keymainid="geojson-subobj"+keymain;
    // var tabhead="<li role=\"presentation\"><a href=\"#"+keymain+"\" aria-controls=\""+keymain+"\" role=\"tab\" data-toggle=\"tab\">"+keymain+"</a></li>";
    $('<li role="presentation" id="'+keymainid+'tab"><a href="#'+keymainid+'" aria-controls="'+keymainid+'" role="tab" data-toggle="tab">'+keymain+'</a></li>').appendTo('#tab-menu');
    // var tabpane="<div role=\"tabpanel\" class=\"tab-pane\" id=\""+keymain+"\"></div>";
    $('<div role="tabpanel" class="tab-pane" id="'+keymainid+'"><div class="tabs-ui2">'+table+'</div></div>').appendTo('#tab-panes');
    //add the data table to the new tab
    // $('#'+keymain).append(table);
    // console.log(JSON.stringify(properties1));

}

function addTableOnClick(e) {
    if(!(e.target._layers===undefined)){
        //if condition checks if the current calling object is a layergroup or a feature, each layer group has a _layers object
        return;
    }
    //remove the additional sub property tabs created 
    $("[id^=geojson-subobj]").remove();
    var l =e.target;
    var properties = l.toGeoJSON().properties,
        table = '',
        info = '';
    // console.log(JSON.stringify(properties));

    if (!properties) return;

    if (!Object.keys(properties).length) properties = { '': '' };

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
        else if ((key=='speedlimitdetails')||(key=='adasdetails')){
            showProperties(properties[key],key);
            table += '<tr><th><input type="text" value="' + key + '"' + (!writable ? ' readonly' : '') + ' /></th>' +
                '<td><input type="text" value="' + properties[key] + '"' + (!writable ? ' readonly' : '') + ' /></td></tr>';
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
            info += '<tr><td>Latitude </td><td>' + l.feature.geometry.coordinates[1].toFixed(5) + '</td></tr>' +
                    '<tr><td>Longitude</td><td>' + l.feature.geometry.coordinates[0].toFixed(5) + '</td></tr>';
        } else if (l.feature.geometry.type === 'Polygon') {
          info += '<tr><td>Sq. Meters</td><td>' + (LGeo.area(l)).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Kilometers</td><td>' + (LGeo.area(l) / 1000000).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Feet</td><td>' + (LGeo.area(l) / 0.092903).toFixed(2) + '</td></tr>' +
                  '<tr><td>Acres</td><td>' + (LGeo.area(l) / 4046.86).toFixed(2) + '</td></tr>' +
                  '<tr><td>Sq. Miles</td><td>' + (LGeo.area(l) / 2589990).toFixed(2) + '</td></tr>';
        }
        info += '</table>';
    }

    var tabs = '<div class="pad1 tabs-ui2 clearfix col12">' +
                    '<div class="tab col12">' +
                        '<input class="hide" type="radio" id="properties" name="tab-group" checked="true">' +
                        '<label class="keyline-top keyline-right tab-toggle pad0 pin-bottomleft z10 center col6" for="properties">Properties</label>' +
                        '<div class="space-bottom1 col12 content">' +
                            '<table class="space-bottom0 marker-properties">' + table + '</table>' +
                            (writable ? '<div class="add-row-button add fl col3"><i class="fa fa-plus"></i> Add row</div>'
                            // + '<div class="fl text-right col9"><input type="checkbox" id="show-style" name="show-style" value="true" checked><label for="show-style">Show style properties</label></div>'
                             : '') +
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

    // l.bindPopup(L.popup({
    //     closeButton: false,
    //     maxWidth: 500,
    //     maxHeight: 400,
    //     autoPanPadding: [5, 45],
    //     className: 'geojsonio-feature'
    // }, l).setContent(content));
    $("#tabledata").html(content);

    l.on('click', function(e){
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
    addTableListeners(e);
}
function addTableListeners(e){
    // alert("clicked" + e.target)
    var sel = d3.select('#tabledata');

    sel.selectAll('.cancel')
        .on('click', clickClose);

    sel.selectAll('.save')
        .on('click', saveFeature);

    sel.selectAll('.add')
        .on('click', addRow);

    sel.selectAll('.delete-invert')
        .on('click', removeFeature);

    function clickClose() {
        // map.closePopup(e.popup);
        // cancel clicked
        // clear html of sel now
        sel.html("Click on an element to see its properties");
        //remove the additional sub property tabs created 
        $("[id^=geojson-subobj]").remove();


    }

    function removeFeature() {
        console.log(e.target)
        var currentlayer;
        if (e.target) {
            for(key in overlayMaps){
                if(overlayMaps[key].hasLayer(e.target)){
                    currentlayer=overlayMaps[key];
                    console.log(key)
                }
            }

            currentlayer.removeLayer(e.target);
            clickClose();
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
        e.target.feature.properties = obj;
        // context.data.set({map: context.mapLayer.toGeoJSON()}, 'popup');
        map.fire("draw:edited");
        // map.closePopup(e.popup);
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

    var filename=file1.name.split('.')[0];

    // Read selected file using HTML5 File API
    var reader = new FileReader();
    reader.readAsText(file1);
    reader.onload=function(file1){
        return function(e){
            var obj = JSON.parse(e.target.result);
            var importedJSON=L.geoJson(obj,{style:styleFeatureFunc,onEachFeature: addFeatureEventListeners});
            var filebounds=importedJSON.getBounds();
            // drawnItems.addData(obj);
            // editableLayers.addLayer(importedJSON);
            addOverlayToLayerCtrl(importedJSON,filename,true);
            
            // if($('#filezoom').is(':checked'))
            //     map.fitBounds(filebounds);
            map.fitBounds(filebounds);
            $( "#layer-select" ).trigger( "change" );
            map.fire("draw:edited");
        }
    }(file1);
}





function highlightFeatureLayer(layer) {
    // console.log(layer)
    if(layer.toGeoJSON().geometry.type!="Point")
    {

        layer.setStyle({
            weight: 5,
            color: '#00FF00',
            dashArray: '',
            fillOpacity: 0.5
        });
        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
    }
    else{//if its a marker
        //set different icon for highlighting
    }
}
function resetHighlightLayer(layer) {
    drawnItems.resetStyle(layer);
}

function select_features(selector_box){
    if(selector_box===null||selector_box===undefined){
        return;
    }
    selectedLayer=L.geoJson(null);

    mergedLayers.eachLayer(function (l) {

        // if((l._layers!==undefined)){
        //     //checks if the current calling object is a layergroup or a feature, each layer group has a _layers object
        //     l.eachLayer(checkBBox)
        //     return;
        // }
        checkBBox(l);
    });
    function checkBBox (l) {
        var objectCoords;//can be bounds or latlng depending on polygon/line or marker
        if(selector_box===undefined){
            return;
        }
        var isMarker=false;

        if(l.toGeoJSON().geometry.type!="Point"){
            objectCoords=l.getBounds();
        }
        else{
            objectCoords=l.getLatLng();
            isMarker=true;
        }
        if(!isMarker){resetHighlightLayer(l);}

        if(!locationFilter.isEnabled()){
            return;
        }

        if(selector_box.contains(objectCoords) || (!isMarker && selector_box.intersects(objectCoords))){
            selectedLayer.addData(l.toGeoJSON());
            if(!isMarker){highlightFeatureLayer(l);}
        }
    }

    $('#bbox-sw').text("("+(parseFloat(JSON.stringify(selector_box._southWest.lat))).toFixed(5)+", "+(parseFloat(JSON.stringify(selector_box._southWest.lng))).toFixed(5)+")");
    $('#bbox-ne').text("("+(parseFloat(JSON.stringify(selector_box._northEast.lat))).toFixed(5)+", "+(parseFloat(JSON.stringify(selector_box._northEast.lng))).toFixed(5)+")");

    $('#selector-geojson').val(JSON.stringify(selectedLayer.toGeoJSON(),null,2));
}