import {Controller} from '@hotwired/stimulus';
import {Loader} from '@googlemaps/js-api-loader';
import {MarkerClusterer} from '@googlemaps/markerclusterer';

export default class extends Controller {
    static values = {
        apiKey: String,
        stallsUrl: String
    }

    stalls;
    map;
    markers = [];
    clusterMarkers = [];
    markerClusterer;
    sidebar;
    infoWindow;
    google;

    async connect() {
        this.sidebar = document.querySelector('#sidebar');

        const loader = new Loader({
            apiKey: this.apiKeyValue,
            version: 'weekly',
            libraries: ['marker']
        });

        this.google = await loader.load();

        const response = await fetch(this.stallsUrlValue);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.stalls = await response.json();

        this.stalls.features.sort((a, b) => {
            const addressA = a.properties.address.toLowerCase();
            const addressB = b.properties.address.toLowerCase();
            if (addressA < addressB) return -1;
            if (addressA > addressB) return 1;
            return 0;
        });

        this.stalls.features.forEach((stall, i) => {
            stall.properties.id = i;
        });

        this.initMap();
    }

    initMap() {
        const zoomLevel = window.innerWidth < 1000 ? 14 : 15;

        const center = {
            lat: 50.874460,
            lng: 12.6035228
        };

        this.map = new this.google.maps.Map(document.getElementById('map'), {
            center: center,
            zoom: zoomLevel,
            gestureHandling: 'greedy',
            mapTypeControl: false,
            styles: [
                {
                    featureType: "landscape.natural",
                    elementType: "geometry.fill",
                    stylers: [
                        {color: "#D0F9EF"}
                    ]
                }
            ]
        });

        const controlDiv = document.createElement('div');
        this.createZoomControl(controlDiv);
        this.map.controls[this.google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);

        this.infoWindow = new this.google.maps.InfoWindow();

        this.addMarkers();

        this.buildLocationList();

        this.google.maps.event.addListener(this.map, 'click', () => {
            this.infoWindow.close();
        });
    }

    createZoomControl(controlDiv) {
        const controlUI = document.createElement('div');
        controlUI.style.backgroundColor = '#fff';
        controlUI.style.border = '2px solid #fff';
        controlUI.style.borderRadius = '3px';
        controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
        controlUI.style.cursor = 'pointer';
        controlUI.style.marginRight = '10px';
        controlUI.style.marginTop = '10px';
        controlUI.style.textAlign = 'center';
        controlDiv.appendChild(controlUI);

        const zoomInButton = document.createElement('div');
        zoomInButton.style.color = 'rgb(25,25,25)';
        zoomInButton.style.fontFamily = 'Roboto,Arial,sans-serif';
        zoomInButton.style.fontSize = '16px';
        zoomInButton.style.lineHeight = '38px';
        zoomInButton.style.paddingLeft = '5px';
        zoomInButton.style.paddingRight = '5px';
        zoomInButton.innerHTML = '+';
        controlUI.appendChild(zoomInButton);

        const zoomOutButton = document.createElement('div');
        zoomOutButton.style.color = 'rgb(25,25,25)';
        zoomOutButton.style.fontFamily = 'Roboto,Arial,sans-serif';
        zoomOutButton.style.fontSize = '16px';
        zoomOutButton.style.lineHeight = '38px';
        zoomOutButton.style.paddingLeft = '5px';
        zoomOutButton.style.paddingRight = '5px';
        zoomOutButton.innerHTML = '−';
        controlUI.appendChild(zoomOutButton);

        zoomInButton.addEventListener('click', () => {
            this.map.setZoom(this.map.getZoom() + 1);
        });

        zoomOutButton.addEventListener('click', () => {
            this.map.setZoom(this.map.getZoom() - 1);
        });
    }

    addMarkers() {
        const metersToLat = (m) => m / 111320; // approx meters per degree latitude
        const metersToLng = (m, lat) => m / (111320 * Math.cos(lat * Math.PI / 180));

        for (const stall of this.stalls.features) {
            const base = {
                lat: stall.geometry.coordinates[1],
                lng: stall.geometry.coordinates[0]
            };

            const count = Math.max(1, Number(stall.properties.stallNumber) || 1);

            // Compute positions: if more than 1, distribute on a small circle ~5m radius
            let positions = [];
            if (count === 1) {
                positions = [base];
            } else {
                const radiusM = 5; // ~5 meters
                const dLat = metersToLat(radiusM);
                const dLng = metersToLng(radiusM, base.lat);
                for (let k = 0; k < count; k++) {
                    const angle = (2 * Math.PI * k) / count; // even distribution
                    const lat = base.lat + dLat * Math.sin(angle);
                    const lng = base.lng + dLng * Math.cos(angle);
                    positions.push({ lat, lng });
                }
            }

            positions.forEach((pos, idx) => {
                const marker = new this.google.maps.Marker({
                    position: pos,
                    map: this.map,
                    title: stall.properties.address,
                    icon: {
                        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='44' viewBox='0 0 384 512'%3E%3Cpath fill='%23D114B3' d='M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z'/%3E%3C/svg%3E",
                        scaledSize: new this.google.maps.Size(32, 44),
                        anchor: new this.google.maps.Point(16, 44)
                    }
                });

                // share the same stall info for all markers
                marker.properties = stall.properties;

                marker.addListener('click', () => {
                    this.flyToStore(marker);
                    this.createPopUp(marker);
                });

                // first marker is the representative one used in the sidebar list
                if (idx === 0) {
                    this.markers.push(marker);
                }

                // all markers participate in clustering
                this.clusterMarkers.push(marker);
            });
        }

        this.markerClusterer = new MarkerClusterer({
            map: this.map,
            markers: this.clusterMarkers,
            renderer: {
                render: ({ count, position }) => {
                    const marker = new this.google.maps.Marker({
                        position,
                        label: {
                            text: String(count),
                            color: 'white',
                            fontSize: '12px'
                        },
                        icon: {
                            path: this.google.maps.SymbolPath.CIRCLE,
                            fillColor: count < 100 ? '#A7118F' : count < 750 ? '#2196F3' : '#3F51B5',
                            fillOpacity: 0.9,
                            scale: count < 100 ? 20 : count < 750 ? 30 : 40,
                            strokeWeight: 1,
                            strokeColor: 'white'
                        },
                        zIndex: Number(this.google.maps.Marker.MAX_ZINDEX) + count
                    });

                    marker.addListener('click', () => {
                        const zoom = Math.min(
                            this.map.getZoom() + 2,
                            this.map.mapTypes.get(this.map.getMapTypeId()).maxZoom
                        );
                        this.map.setZoom(zoom);
                        this.map.panTo(position);
                    });

                    return marker;
                }
            }
        });
    }

    buildLocationList() {
        let controller = this;
        const listings = document.getElementById('listings');

        if (!listings) return;

        listings.innerHTML = '';

        for (let i = 0; i < this.markers.length; i++) {
            const marker = this.markers[i];
            const stall = this.stalls.features[i];

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
            details.innerHTML = '';
            if (stall.properties.information) {
                details.innerHTML += `${stall.properties.information}`;
            }

            link.addEventListener('click', function() {
                controller.flyToStore(marker);
                controller.createPopUp(marker);

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

    flyToStore(marker) {
        const currentZoom = this.map.getZoom();
        this.map.panTo(marker.getPosition());

        if (currentZoom < 16) {
            this.map.setZoom(16);
        }
    }

    createPopUp(marker) {
        this.infoWindow.close();

        let details = `${marker.properties.address}`;

        if (marker.properties.information) {
            details += `<br><br><strong>${marker.properties.information}</strong>`;
        }

        this.infoWindow.setContent(
            `<h3>Waldenburger Hofflohmarkt Stand</h3><h4>${details}</h4>`
        );

        this.infoWindow.open({
            anchor: marker,
            map: this.map
        });
    }
}