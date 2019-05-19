$(function() {
    var that = this;

    // this.shapeFile = this.getShapeFile();
    var appController = {
        loadVisualization: function(visualizationOption){
            var that = this;
            this.map = this.getMap();
            this.shapeFile = this.getShapeFile();
            //this.shapeFile.addTo(this.map);
        },
        getMap: function () {
            var i, tabcontent, tablinks;
            var shpfile;
            var styleMap;
            var that = this;

            var mymap = L.map('mapid').setView([-37.814, 144.96332], 10);
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
            }).addTo(mymap);
            return mymap;
        },

        getShapeFile: function(){
            return new L.Shapefile('public/javascripts/vic_shapefile.zip', {
                onEachFeature: function (feature, layer) {
                    // if (feature.properties) {
                    //     var suburbmapdata = getInfoFrom(Object, feature).join(" <br/>");
                    //     layer.bindPopup(suburbmapdata);
                    //     if (feature.properties.sentimentDensity) {
                    //         that.incomeVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.tot_tot});
                    //         that.occupationVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.M0_p_tot});
                    //         that.immigrantsVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.M0_tot_p_});
                    //         that.homelessPeopleVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.M0_hl_p_h});
                    //     }
                    // }
                    layer.on({
                        //mouseover: highlightFeature,
                        //mouseout: resetHighlight
                    });
                },
                // style: function (feature) {
                //     if (feature.properties.sentimentDensity === undefined) {
                //         feature.properties.sentimentDensity = that.getSentimentDensity(feature.properties.sa2_main16);
                //     }
                //
                //     return {
                //         fillColor: that.getColor(feature.properties.sentimentDensity),
                //         weight: 1,
                //         opacity: 1,
                //         color: 'black',
                //         dashArray: '3',
                //         fillOpacity: 0.7
                //     };
                // }
            });
        }
    }
    that.visualizationOption = 'type';
    $('#visualizationType').change(function (evt) {
        that.visualizationOption = this.value;
    });

    $('#visualize-button').on('click',()=>{
        if(that.visualizationOption === 'type'){
            alert("Please select a visualization option");
        } else{
            window.location = '/visualization?type=' + that.visualizationOption;
            appController.loadVisualization(that.visualizationOption);
        }
    });

    $('#submitOptions').on('click',()=>{
        that.map = appController.getMap();
    });
    this.map = appController.getMap();
});