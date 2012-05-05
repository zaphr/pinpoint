$(document).ready(function() {
    pinpoint.page.block_ie();
    pinpoint.init();
});

window.pinpoint = {
    init: function() {
        pinpoint.main_controller = new pinpoint.controllers.Main();
        Backbone.history.start();
        pinpoint.main_controller.get_places();
    },

    models : {},

    collections : {},

    controllers : {},

    views : {}

};

pinpoint.controllers.Main = Backbone.Controller.extend({
    routes: {
        "places" : "get_places",
        "places/:id" : "setup_place",
        "poi/:id" : "get_poi_result",
        "next/:id" : "get_next_result"
    },

    get_places :function(){
        $.getJSON('/places', function(places) {
          pinpoint.page.clear_main_list();
          pinpoint.places = new pinpoint.collections.Places(places);
          pinpoint.places.render();
        });
    },

    setup_place : function(place_id){
        var that = this;
        $.getJSON('/place/' + place_id, function(pois) {
          pinpoint.poi_ids_for_place = pois;
          pinpoint.current_place = pinpoint.places.get(place_id);
          that.get_poi_result(pinpoint.poi_ids_for_place.splice(0,1));
        });
    },

    get_next_result : function(){
      if (_.isEmpty(pinpoint.poi_ids_for_place)){
          this.get_places();
      } else {
          this.get_poi_result(pinpoint.poi_ids_for_place.splice(0,1));
      }
    },

    get_poi_result :function(poi_id) {
        $.getJSON("poi/" + poi_id, function(data) {
          pinpoint.page.clear_main_list();
          pinpoint.full_result = new pinpoint.models.MatchResult(data);
        });
    }

});


pinpoint.page = {

    clear_main_list : function () {
        $('#main').empty();
    },

    block_ie : function(){
      if(navigator.appName.indexOf("Internet Explorer") != -1)
	  {
	    alert('Sorry this site does not support Internet Explorer.');
	    document.location = "http://www.amazon.com/gp/product/B00032G1S0/";
	  }
    }
}

pinpoint.models.Place = Backbone.Model.extend({

});

pinpoint.collections.Places = Backbone.Collection.extend({

    model: pinpoint.models.Place,

    comparator : function(place) {
        return -place.get('matched');
    },

    render: function(){
      pinpoint.page.clear_main_list();
      this.each(function(place){
          var place_line = '<li><a href="#places/' + place.get('id') + '">' +
          '<span class="place_info"> Located ' + place.get('matched') + ' of '  +
          place.get('ungeocoded') +
          ' ungeocoded pois</span><span class="place_name">'+ place.get('name')  +'</span></a></li>';
          $('#main').append(place_line)
      });
    }

});

pinpoint.models.MatchResult = Backbone.Model.extend({

    initialize :function(){
        this.render();
    },

    render: function(){
        var latitude = this.get(['geocode'])['lat'];
        var longitude = this.get(['geocode'])['lng'];
        var latlng = new google.maps.LatLng(latitude, longitude);

        var myOptions = {
            zoom: 15,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };


        var search_poi = this.get('search_poi');

        var render_back_to_places = function(){
          $('#main').append('<li><a href="#places">Back to places</a></li>');
        }

        $('#main').append('<li><div id="map"></div></li>')
        var map = new google.maps.Map(document.getElementById("map"), myOptions);

        var last_place = false;

        if (_.isEmpty(pinpoint.poi_ids_for_place)){
          last_place = true;
        }

        if (last_place){
          render_back_to_places();
        } else{
        var next_poi = '<li><a class="info_link" href="#next/' + pinpoint.poi_ids_for_place[0] + '">Next <span class="info">' + pinpoint.poi_ids_for_place.length +
                ' remaining for ' + pinpoint.current_place.get('name')  + '</span></a></li>';
        $('#main').append(next_poi);
        }

        var match_line = '<li><a id="suggested" href="#">'+
                'Suggested : <span class="matched">' + latitude + '  ' +  longitude +
                '</span></a></li>';
        $('#main').append(match_line);



        _.each(this.get('all_geocodes'), function(match){
            var match_latlng = new google.maps.LatLng(match['lat'], match['lng']);
            var match_marker = new google.maps.Marker({
                position: match_latlng,
                title: match['source']
            });

            match_marker.setMap(map);

            var text_class = 'no_match';
            if (match['lat'] === latitude && match['lng'] === longitude){ text_class = 'matched';}

            var match_line = '<li><a target="_blank"href="' + match['search_url'] + '">'+
                    match['source'].capitalize() + ' : <span class="' + text_class +'">' + match['lat'] +
                    '  ' +  match['lng'] + '</span></a></li>';

            $('#main').append(match_line);

        });

        var marker = new google.maps.Marker({
            position: latlng,
            title: "Suggested pinpoint"
        });

        $('#suggested').click(function(){
            if (marker.getAnimation() != null) {
                marker.setAnimation(null);
            } else {
                marker.setAnimation(google.maps.Animation.BOUNCE);
            }
            return false;
        });

        marker.setMap(map);
        if (!last_place){
          render_back_to_places();
        }

    }

});

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

