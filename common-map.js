
var map;
var heatmap;
var hcmap;
var clustermapelements = [];

var uniq_carr;
var uniq_net;
var maxrtt = 0;
var def_radius = 15;

var green_thres = {
    "rtt": 100,
    "rtt_packetloss": 0.005,
    "dns_lookup":100
}

var yellow_thres = {
    "rtt": 200,
    "rtt_packetloss": 0.01,
    "dns_lookup":200
}

var orange_thres = {
    "rtt": 300,
    "rtt_packetloss": 0.05,
    "dns_lookup":300
}


Date.prototype.getWeek = function() {
    var onejan = new Date(this.getFullYear(),0,1);
    return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
}

function filter()
{
    $('#loading').show();

        //Reset current clustermap
        hcmap.reset();

    var dateValues = $("#dateslider").dateRangeSlider("values");
    var minwk = dateValues.min.getWeek();
    var maxwk = dateValues.max.getWeek();

    filtered_data1 = jQuery.grep(data, function(elem, idx){
        if(elem.clu == null || elem.car == "" || elem.car == "roamingindicatoroff" || elem.car == "searchingforservice") {
            return false;
        }
        //for (aelem in uniq_area) {
                for (var i=0; i<uniq_area.length; i++) {
            //if((!($('#cb_ar_'+uniq_area[aelem]).is(':checked'))) && (elem.ar == uniq_area[aelem]))
            if((!($('#cb_ar_'+uniq_area[i]).is(':checked'))) && (elem.ar == uniq_area[i]))
                return false;
        }
        //for (aelem in uniq_carr) {
                for (var i=0; i<uniq_carr.length; i++) {
            //if((!($('#cb_car_'+uniq_carr[aelem]).is(':checked'))) && (elem.car == uniq_carr[aelem]))
            if((!($('#cb_car_'+uniq_carr[i]).is(':checked'))) && (elem.car == uniq_carr[i]))
                return false;
        }
        //for (aelem in uniq_net) {
                for (var i=0; i<uniq_net.length; i++) {
            //if((!($('#cb_net_'+uniq_net[aelem]).is(':checked'))) && (elem.net == uniq_net[aelem]))
            if((!($('#cb_net_'+uniq_net[i]).is(':checked'))) && (elem.net == uniq_net[i]))
                return false;
        }
        if(elem.wk < minwk || elem.wk > maxwk)
            return false;
        return true;
    });
    filtered_data = jQuery.extend(true, [],  filtered_data1);
    var totalct = 0;

    filtered_data.forEach(function(elem, idx, arr){
                //elem.count = elem.rtt;
                totalct += elem.ct;
                //delete elem.rtt;
                delete elem.clu;
                delete elem.wk;
                delete elem.car;
                delete elem.ar;
                delete elem.net;
                //delete elem.ct;
    })
    $("#stats").html('')
    $("#stats").append(totalct + ' measurements')

    $('#loading').hide();
        clustermapelements = [];
        //console.log("Filtered points:"+filtered_data.length);
        for (var i = 0; i < filtered_data.length; i++) {
            elem = filtered_data[i];
            var count = elem["ct"];
            //var avg_rtt = elem["rtt"];

            var avg_rtt = elem[data_chosen];

            // For clustermap
            var color;
            if (avg_rtt<=green_thres[data_chosen]) {
                color='green'
            }
            else if (avg_rtt>green_thres[data_chosen] && avg_rtt<=yellow_thres[data_chosen]) {
                color='yellow'
            }
            else if (avg_rtt>yellow_thres[data_chosen] && avg_rtt<=orange_thres[data_chosen]) {
                color='orange'
            }
            else{
                color='red'
            }
            c = {}
            //c[color]=1
            c[color]=elem.ct;
            clustermapelements.push({
                'label': 'X',
                'coordinates': {'lat': elem["lat"], 'lng': elem["lng"]},
                'description': Math.round(avg_rtt).toString()+"ms", // ("+count.toString()+" measurements)",
                'color': c,
                'count': count
            });
        }
        hcmap = new clustermap.HCMap ({'map': map , 'elements': clustermapelements}) ;
}

function get_unique(array, objname)
{
    var dups={}
    var uniq=[]
    array.forEach(function(elem,idx,arr){
        if(!dups[elem[objname]]) {
            dups[elem[objname]]=true;
            uniq.push(elem[objname])
        }
    });
    return uniq;
}

window.onload = createVisualization;


function createVisualization(){

    var data_chosen;
    var radio = document.getElementsByName("datatype");
    for (var val in radio) {
          if (radio[val].checked) {
              data_chosen = radio[val].value; 
        }
    }

    //Clean up data
    filtered_data1 = jQuery.grep(data, function(elem, idx){
        return(elem.clu != null && elem.car != "" && elem.car != "roamingindicatoroff" && elem.car != "searchingforservice");
    });
    filtered_data = jQuery.extend(true, [],  filtered_data1);


  /**********************************************************************
        Generate form fields
     *********************************************************************/
    //List all metro areas
    //$("#area").html('')
    //uniq_area = get_unique(filtered_data, "ar")
    //uniq_area.forEach(function(elem,idx,arr){
    //    $("#area").append('<input type="checkbox" onchange="filter()" id="cb_ar_' + elem+'" checked>'+ elem + '</input><br/>')
    //});

    //List all carriers
    $("#carrier").html('')
    uniq_carr = get_unique(filtered_data, "car")
    uniq_carr.forEach(function(elem,idx,arr){
        $("#carrier").append('<input type="checkbox" onchange="filter()" id="cb_car_' + elem+'" checked>'+ elem + '</input><br/>')
    });
    
    //List all network types
    $("#network").html('')
    uniq_net = get_unique(filtered_data, "net")
    uniq_net.forEach(function(elem,idx,arr){
        $("#network").append('<input type="checkbox" onchange="filter()" id="cb_net_' + elem+'" checked>'+ elem + '</input><br/>')
    });

    //Set defaults
    $("#cb_net_wifi").attr('checked', false);
    filtered_data = jQuery.grep(filtered_data, function(elem, idx){
        return(elem.net != "wifi");
    });

  generateMap(filtered_data, data_chosen)
};

function generateMap(filtered_data, data_chosen) {

  /**********************************************************************
        Prepare data for loading
     *********************************************************************/

    var totalct = 0;
        //console.log("Filtered points:"+filtered_data.length);
    filtered_data.forEach(function(elem, idx, arr){

        if(elem[data_chosen] > maxrtt)
            maxrtt = elem[data_chosen];
        //elem.count = elem.rtt;
        totalct += elem.ct;
        //delete elem.rtt;
        delete elem.clu;
        delete elem.wk;
        delete elem.car;
        delete elem.ar;
        delete elem.net;
        //delete elem.ct;
    })
    $("#stats").html('')
    $("#stats").append(totalct + ' measurements')

    $("#loading").hide()

  /**********************************************************************
       Generate map 
   *********************************************************************/

    //var myLatlng = new google.maps.LatLng(47.670628,-122.20414);
    //var myLatlng = new google.maps.LatLng(37.538432,-122.05238);
    var myLatlng = new google.maps.LatLng(39.8282, -98.5795);
    var myOptions = {
        zoom: 4,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        scrollwheel: true,
        draggable: true,
        navigationControl: true,
        mapTypeControl: true,
        scaleControl: true,
        disableDoubleClickZoom: false
    };
    map = new google.maps.Map(document.getElementById("heatmapArea"), myOptions);

        var legend = document.createElement('div');
        legend.id = 'legend';
        legendContent(legend, data_chosen);
        legend.index = 1;
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);


        clustermapelements = [];
        for (var i = 0; i < filtered_data.length; i++) {
            elem = filtered_data[i]
            var count = elem["ct"];
            var avg_rtt = elem[data_chosen];
            //var avg_rtt = elem["rtt"];
            // For clustermap
            var color;
            if (avg_rtt<=green_thres[data_chosen]) {
                color='green'
            }
            else if (avg_rtt>green_thres[data_chosen] && avg_rtt<=yellow_thres[data_chosen]) {
                color='yellow'
            }
            else if (avg_rtt>yellow_thres[data_chosen] && avg_rtt<=orange_thres[data_chosen]) {
                color='orange'
            }
            else{
                color='red'
            }
            c = {}
            //c[color]=1
            c[color]=elem.ct
            clustermapelements.push({
                'label': 'X',
                'coordinates': {'lat': elem["lat"], 'lng': elem["lng"]},
                'description': Math.round(avg_rtt).toString()+"ms", // ("+count.toString()+" measurements)",
                'color': c,
                'count': count
            });
        }

        hcmap = new clustermap.HCMap ({'map': map , 'elements': []}) ;
        // Draw ClusterMap
        google.maps.event.addListener(map, 'bounds_changed', function() {
            hcmap.reset();
            hcmap = new clustermap.HCMap ({'map': map , 'elements': clustermapelements}) ;
        });

    $("#dateslider").dateRangeSlider({
        step: {days: 7},
        defaultValues: {
            min: new Date(2013, 12, 18),
            max: new Date(2014, 3, 10)},
        bounds: {
            min: new Date(2012, 12, 18),
            max: new Date(2014, 3, 10)}
    });

    $("#dateslider").bind("userValuesChanged", function(e, data){filter()});


    $("#radiusslider" ).slider({
        value:def_radius,
        //min: 5,
        min: 15,
        //max: 25,
        max: 15,
        step: 1,
        create: function(event, ui) {
            $("#radiusslidervalue").text("Radius: "+def_radius);
        },
        change: function(event, ui) {
          // Unimplemented: redraw clustermap with new radius
          $("#radiusslidervalue").text("Radius: "+ui.value);
          //$("#radiusslidervalue").text("Unimplemented. Fixed radius size.");
        }
    });

}

// Generate the content for the legend
function legendContent(legend, data_chosen) {

    var title_options = {
        rtt: "Average RTT (ms)",
        rtt_packetloss: "Fraction of packets lost",
        dns_lookup: "Average DNS lookup time (ms)"
    }

    // A title for the legend.
    var legendTitle = title_options[data_chosen];
    // The min / max values for each bucket and the associated color.
    var styles = [
        {
            'min': 0,
            'max': green_thres[data_chosen],
            'color': 'green'
        },
        {
            'min': green_thres[data_chosen],
            'max': yellow_thres[data_chosen],
            'color': 'yellow'
        },
        {
            'min': yellow_thres[data_chosen],
            'max': orange_thres[data_chosen],
            'color': 'orange'
        },
        {
            'min': orange_thres[data_chosen],
            'max': 'oo',
            'color': 'red'
        }
    ];

    var title = document.createElement('p');
    title.innerHTML = legendTitle;
    legend.appendChild(title);

    for (var i=0; i<styles.length; i++) {
        var bucket = styles[i];

    var legendItem = document.createElement('div');

    var color = document.createElement('span');
    color.setAttribute('class', 'color');
    color.style.backgroundColor = bucket.color;
    legendItem.appendChild(color);

    var minMax = document.createElement('span');
    minMax.innerHTML = bucket.min + ' - ' + bucket.max;
    legendItem.appendChild(minMax);

    legend.appendChild(legendItem);
  }
}

