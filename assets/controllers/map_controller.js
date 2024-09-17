import { Controller } from '@hotwired/stimulus';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.min.css';

export default class extends Controller {

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

        for (let i = this.stalls.features.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.stalls.features[i], this.stalls.features[j]] = [this.stalls.features[j], this.stalls.features[i]];
        }

        let zoomLevel = window.innerWidth < 1000 ? 13 : 14;

        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v9',
            center: [12.6035228, 50.874460],
            zoom: zoomLevel,
            scrollZoom: false
        });

        this.map.addControl(new mapboxgl.NavigationControl());

        this.addMarkers();

        this.stalls.features.forEach(function (stall, i) {
            stall.properties.id = i;
        });

        this.map.on('load', () => {
            this.map.addSource('places', {
                type: 'geojson',
                data: this.stalls
            });

            this.buildLocationList();
        });
    }

    buildLocationList() {
        let controller = this;
        for (const stall of this.stalls.features) {
            /* Add a new listing section to the sidebar. */
            const listings = document.getElementById('listings');
            const listing = listings.appendChild(document.createElement('div'));
            /* Assign a unique `id` to the listing. */
            listing.id = `listing-${stall.properties.id}`;
            /* Assign the `item` class to each listing for styling. */
            listing.className = 'item';

            /* Add the link to the individual listing created above. */
            const link = listing.appendChild(document.createElement('a'));
            link.href = 'javascript:void(0)';
            link.className = 'title';
            link.id = `link-${stall.properties.id}`;
            link.innerHTML = `${stall.properties.address}`;
            link.dataset.turboAction = 'false';

            /* Add details to the individual listing. */
            const details = listing.appendChild(document.createElement('div'));
            details.innerHTML = ``;
            if (stall.properties.phone) {
                details.innerHTML += ` &middot; ${stall.properties.phoneFormatted}`;
            }
            if (stall.properties.distance) {
                const roundedDistance = Math.round(stall.properties.distance * 100) / 100;
                details.innerHTML += `<div><strong>${roundedDistance} miles away</strong></div>`;
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
        /** Check if there is already a popup on the map and if so, remove it */
        if (popUps[0]) popUps[0].remove();

        const popup = new mapboxgl.Popup({ closeOnClick: false })
            .setLngLat(currentFeature.geometry.coordinates)
            .setHTML(`<h3>Waldenburger Hofflohmarkt Stand</h3><h4>${currentFeature.properties.address}</h4>`)
            .addTo(this.map);
    }

    addMarkers() {
        /* For each feature in the GeoJSON object above: */
        for (const marker of this.stalls.features) {
            /* Create a div element for the marker. */
            const el = document.createElement('div');
            /* Assign a unique `id` to the marker. */
            el.id = `marker-${marker.properties.id}`;
            /* Assign the `marker` class to each marker for styling. */
            el.className = 'marker';

            /**
             * Create a marker using the div element
             * defined above and add it to the map.
             **/
            new mapboxgl.Marker(el, { offset: [0, -23] })
                .setLngLat(marker.geometry.coordinates)
                .addTo(this.map);

            el.addEventListener('click', (e) => {
                /* Fly to the point */
                this.flyToStore(marker);
                /* Close all other popups and display popup for clicked store */
                this.createPopUp(marker);
                /* Highlight listing in sidebar */
                const activeItem = document.getElementsByClassName('active');
                e.stopPropagation();
                if (activeItem[0]) {
                    activeItem[0].classList.remove('active');
                }
                const listing = document.getElementById(`listing-${marker.properties.id}`);
                listing.classList.add('active');
            });
        }
    }
}