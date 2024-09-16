import { Controller } from '@hotwired/stimulus';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.min.css';

export default class extends Controller {
    async connect() {
        mapboxgl.accessToken = 'pk.eyJ1IjoiYXBwaGFuY2VyIiwiYSI6ImNtMTRxeTFrbjAweXUya3M4OTNiZ3poNzEifQ.4qeiA-a825NQ3QXt5v7vRg';

        const response = await fetch('stalls.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stalls = await response.json();

        for (let i = stalls.features.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [stalls.features[i], stalls.features[j]] = [stalls.features[j], stalls.features[i]];
        }

        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v9',
            center: [12.6035228, 50.874460],
            zoom: 14,
            scrollZoom: false
        });

        addMarkers();

        stalls.features.forEach(function (stall, i) {
            stall.properties.id = i;
        });

        map.on('load', () => {
            map.addSource('places', {
                type: 'geojson',
                data: stalls
            });

            buildLocationList(stalls);
        });

        // map.on('click', (event) => {
        //     /* Determine if a feature in the "locations" layer exists at that point. */
        //     const features = map.queryRenderedFeatures(event.point, {
        //         layers: ['locations']
        //     });
        //
        //     /* If it does not exist, return */
        //     if (!features.length) return;
        //
        //     const clickedPoint = features[0];
        //
        //     /* Fly to the point */
        //     flyToStore(clickedPoint);
        //
        //     /* Close all other popups and display popup for clicked store */
        //     createPopUp(clickedPoint);
        //
        //     /* Highlight listing in sidebar (and remove highlight for all other listings) */
        //     const activeItem = document.getElementsByClassName('active');
        //     if (activeItem[0]) {
        //         activeItem[0].classList.remove('active');
        //     }
        //     const listing = document.getElementById(
        //         `listing-${clickedPoint.properties.id}`
        //     );
        //     listing.classList.add('active');
        // });

        function buildLocationList(stores) {
            for (const store of stores.features) {
                /* Add a new listing section to the sidebar. */
                const listings = document.getElementById('listings');
                const listing = listings.appendChild(document.createElement('div'));
                /* Assign a unique `id` to the listing. */
                listing.id = `listing-${store.properties.id}`;
                /* Assign the `item` class to each listing for styling. */
                listing.className = 'item';

                /* Add the link to the individual listing created above. */
                const link = listing.appendChild(document.createElement('a'));
                link.href = '#';
                link.className = 'title';
                link.id = `link-${store.properties.id}`;
                link.innerHTML = `${store.properties.address}`;

                /* Add details to the individual listing. */
                const details = listing.appendChild(document.createElement('div'));
                details.innerHTML = ``;
                if (store.properties.phone) {
                    details.innerHTML += ` &middot; ${store.properties.phoneFormatted}`;
                }
                if (store.properties.distance) {
                    const roundedDistance = Math.round(store.properties.distance * 100) / 100;
                    details.innerHTML += `<div><strong>${roundedDistance} miles away</strong></div>`;
                }

                link.addEventListener('click', function () {
                    for (const feature of stores.features) {
                        if (this.id === `link-${feature.properties.id}`) {
                            flyToStore(feature);
                            createPopUp(feature);
                        }
                    }
                    const activeItem = document.getElementsByClassName('active');
                    if (activeItem[0]) {
                        activeItem[0].classList.remove('active');
                    }
                    this.parentNode.classList.add('active');
                });
            }
        }

        function flyToStore(currentFeature) {
            map.flyTo({
                center: currentFeature.geometry.coordinates,
                zoom: 15
            });
        }

        function createPopUp(currentFeature) {
            const popUps = document.getElementsByClassName('mapboxgl-popup');
            /** Check if there is already a popup on the map and if so, remove it */
            if (popUps[0]) popUps[0].remove();

            const popup = new mapboxgl.Popup({ closeOnClick: false })
                .setLngLat(currentFeature.geometry.coordinates)
                .setHTML(`<h3>Waldenburger Hofflohmarkt Stand</h3><h4>${currentFeature.properties.address}</h4>`)
                .addTo(map);
        }

        function addMarkers() {
            /* For each feature in the GeoJSON object above: */
            for (const marker of stalls.features) {
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
                    .addTo(map);

                el.addEventListener('click', (e) => {
                    /* Fly to the point */
                    flyToStore(marker);
                    /* Close all other popups and display popup for clicked store */
                    createPopUp(marker);
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
}


document.addEventListener('DOMContentLoaded', function () {
    // This will run when the document is loaded

    var button = document.querySelector('#toggle-button');
    var sidebar = document.querySelector('#sidebar');

    button.addEventListener('click', function () {
        // This will run each time the button is clicked

        // Check if sidebar style is 'block', if so, set it 'none', else set it 'block'
        if (window.getComputedStyle(sidebar).display === 'none') {
            sidebar.style.display = 'block';
            button.innerHTML = "Hide Sidebar";
        } else {
            sidebar.style.display = 'none';
            button.innerHTML = "Show Sidebar";
        }
    });
});