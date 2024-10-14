import {Controller} from '@hotwired/stimulus';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.min.css';

export default class extends Controller {

    static values = {
        icon: String
    }


    stalls;
    map;
    sidebar;

    async connect() {

        this.sidebar = document.querySelector('#sidebar');

        mapboxgl.accessToken = 'pk.eyJ1IjoiYXBwaGFuY2VyIiwiYSI6ImNtMTRxeTFrbjAweXUya3M4OTNiZ3poNzEifQ.4qeiA-a825NQ3QXt5v7vRg';


        const response = await fetch('stalls.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.stalls = await response.json();

        this.stalls.features.sort((a, b) => {
            const addressA = a.properties.address.toLowerCase();
            const addressB = b.properties.address.toLowerCase();
            if (addressA < addressB) {
                return -1;
            }
            if (addressA > addressB) {
                return 1;
            }
            return 0;
        });

        let zoomLevel = window.innerWidth < 1000 ? 13 : 14;

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v9',
            center: [12.6035228, 50.874460],
            zoom: zoomLevel,
            scrollZoom: false
        });

        this.map.addControl(new mapboxgl.NavigationControl());


        this.stalls.features.forEach(function (stall, i) {
            stall.properties.id = i;
        });


        this.map.on('load', () => {

            let markerData = this.prepareMarkerData();

            this.map.loadImage(
                this.iconValue,
                (error, image) => {
                    if (error) {
                        console.error(error);
                        return;
                    }
                    if (!this.map.hasImage('custom-marker')) {
                        this.map.addImage('custom-marker', image);
                    }
                });


            this.map.addSource('places', {
                type: 'geojson',
                data: this.stalls,
                cluster: true,
                clusterMaxZoom: 16,
                clusterRadius: 50
            });

            this.map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'places',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': ['step', ['get', 'point_count'], '#00BCD4', 100, '#2196F3', 750, '#3F51B5'],
                    'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40]
                }
            });

            this.map.addLayer({
                id: "cluster-count",
                type: "symbol",
                source: "places",
                filter: ["has", "point_count"],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                }
            });


            this.map.addLayer({
                id: "unclustered-point",
                type: "symbol",
                source: "places",
                filter: ["!", ["has", "point_count"]],
                layout: {
                    "icon-image": "custom-marker",
                    "icon-size": 0.7
                }
            });


            this.map.on('click', 'clusters', (e) => {
                var features = this.map.queryRenderedFeatures(e.point, {layers: ['clusters']});
                var clusterId = features[0].properties.cluster_id;
                this.map.getSource('places').getClusterExpansionZoom(clusterId, (err, zoom) => {
                    if (err)
                        return;

                    this.map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                });
            });

            this.map.on('click', 'unclustered-point', (e) => {
                let clickedFeature = e.features[0];
                this.flyToStore(clickedFeature);
                this.createPopUp(clickedFeature);
            });


            this.map.on('mouseenter', 'unclustered-point', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });

            this.map.on('mouseleave', 'unclustered-point', () => {
                this.map.getCanvas().style.cursor = '';
            });
            this.map.on('mouseenter', 'clusters', () => {
                this.map.getCanvas().style.cursor = 'pointer';
            });
            this.map.on('mouseleave', 'clusters', () => {
                this.map.getCanvas().style.cursor = '';
            });

            this.buildLocationList();
        });


        setTimeout(() => {
            this.map.getSource('places').setData(this.stalls);
        }, 900);

        this.map.on('click', () => {
            const popUps = document.getElementsByClassName('mapboxgl-popup');
            if (popUps[0]) popUps[0].remove();
        });
    }

    buildLocationList() {
        let controller = this;
        for (const stall of this.stalls.features) {
            const listings = document.getElementById('listings');
            const listing = listings.appendChild(document.createElement('div'));
            listing.id = `listing-${stall.properties.id}`;
            listing.className = 'item';

            const link = listing.appendChild(document.createElement('a'));
            link.href = 'javascript:void(0)';
            link.className = 'title';
            link.id = `link-${stall.properties.id}`;
            link.innerHTML = `${stall.properties.address}`;
            link.dataset.turboAction = 'false';


            const details = listing.appendChild(document.createElement('div'));
            details.innerHTML = ``;
            if (stall.properties.information) {
                details.innerHTML += `${stall.properties.information}`;
            }

            link.addEventListener('click', function () {
                for (const feature of controller.stalls.features) {
                    if (this.id === `link-${feature.properties.id}`) {
                        controller.flyToStore(feature);
                        controller.createPopUp(feature);
                    }
                }
                const activeItem = document.getElementsByClassName('active');
                if (activeItem[0]) {
                    activeItem[0].classList.remove('active');
                }
                this.parentNode.classList.add('active');

                const event = new CustomEvent('flyToStoreAndHideList');
                window.dispatchEvent(event);
            });
        }
    }


    flyToStore(currentFeature) {
        this.map.flyTo({
            center: currentFeature.geometry.coordinates,
            zoom: 15
        });
    }

    createPopUp(currentFeature) {
        const popUps = document.getElementsByClassName('mapboxgl-popup');
        if (popUps[0]) popUps[0].remove();

        let details = `${currentFeature.properties.address}`;

        if (currentFeature.properties.information) {
            details += `<br><br><strong>${currentFeature.properties.information}</strong>`;
        }

        const popup = new mapboxgl.Popup({closeOnClick: false})
            .setLngLat(currentFeature.geometry.coordinates)
            .setHTML(`<h3>Waldenburger Hofflohmarkt Stand</h3><h4>${details}</h4>`)
            .addTo(this.map);
    }

    prepareMarkerData() {
        let markerFeatures = {
            "type": "FeatureCollection",
            "features": []
        };

        for (const marker of this.stalls.features) {
            let markerFeature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": marker.geometry.coordinates
                },
                "properties": marker.properties,
            };

            markerFeatures.features.push(markerFeature);
        }

        return markerFeatures;
    }
}