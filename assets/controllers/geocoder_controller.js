import {Controller} from '@hotwired/stimulus';
import {Loader} from '@googlemaps/js-api-loader';


/* stimulusFetch: 'lazy' */
export default class extends Controller {
    static values = {
        apiKey: String,
        geoCoderPlaceholder: String
    }

    static targets = ['geocoder', 'result'];

    geocoder;
    autocomplete;
    google;
    isGeolocating = false;

    async connect() {
        let controller = this;

        const loader = new Loader({
            apiKey: this.apiKeyValue,
            version: 'weekly',

        });

        this.google = await loader.load();
        await google.maps.importLibrary("places");

        const center = new google.maps.LatLng(50.874460, 12.6035228);
        const radiusMeters = 5000; // 5 km radius

        const circle = new google.maps.Circle({
            center: center,
            radius: radiusMeters,
        });

        // Create input element for autocomplete
        this.autocomplete = new google.maps.places.PlaceAutocompleteElement({
            includedRegionCodes: ['de'],
            locationRestriction: circle.getBounds()
        });
        const container = document.createElement('div');
        container.classList.add('geocoder-container');
        container.appendChild(this.autocomplete);
        this.geocoderTarget.appendChild(container);

        this.autocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
            const place = placePrediction.toPlace();
            await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });

            console.log('place', place);
            controller.resultTarget.value = JSON.stringify(place, null, 2);
        });

        // Initialize Geocoder service
        this.geocoder = new this.google.maps.Geocoder();

        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.classList.add('geocoder-clear-btn');
        clearButton.innerHTML = '×';
        clearButton.style.display = 'none';
        container.appendChild(clearButton);

        // Show/hide clear button based on input
        input.addEventListener('input', () => {
            clearButton.style.display = input.value ? 'block' : 'none';
        });

        // Clear input when clear button is clicked
        clearButton.addEventListener('click', () => {
            input.value = '';
            clearButton.style.display = 'none';
            this.resultTarget.value = '';
            const event = new Event('input', {bubbles: true});
            input.dispatchEvent(event);
        });


        // Add custom styling
        this.styleGeocoder();

        // Add geolocation button
        this.addGeolocateCTA(container);

        // Pre-populate results if available
        this.prePopulateResults(input);
    }

    styleGeocoder() {
        // Apply custom styling to match Mapbox geocoder appearance
        const style = document.createElement('style');
        style.textContent = `
            .geocoder-container {
                position: relative;
                width: 100%;
                font-size: 15px;
                z-index: 1;
                border-radius: 4px;
                box-shadow: 0 0 10px 2px rgba(0,0,0,.1);
            }
            
            .geocoder-input {
                width: 100%;
                height: 50px;
                padding: 10px 35px 10px 40px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
                font-size: 15px;
            }
            
            .geocoder-clear-btn {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #aaa;
            }
            
            .custom-search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                z-index: 2;
            }
            
            .js-geolocate {
                position: absolute;
                right: 40px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                color: #555;
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);

        // Add custom search icon
        const searchIcon = document.createElement('i');
        searchIcon.classList.add('fa-solid', 'fa-location-pin', 'custom-search-icon');
        this.geocoderTarget.querySelector('.geocoder-container').appendChild(searchIcon);
    }

    prePopulateResults(input) {
        try {
            const obj = JSON.parse(this.resultTarget.value);

            if (obj && obj.place_name) {
                input.value = obj.place_name;
            }
        } catch (e) {
            // If parsing fails, do nothing
        }
    }

    clear() {
        const input = this.geocoderTarget.querySelector('.geocoder-input');
        if (input) {
            input.value = '';
            this.resultTarget.value = '';

            // Hide clear button
            const clearBtn = this.geocoderTarget.querySelector('.geocoder-clear-btn');
            if (clearBtn) {
                clearBtn.style.display = 'none';
            }
        }
    }

    addGeolocateCTA(container) {
        if (!navigator.geolocation) {
            return;
        }

        const button = document.createElement('button');
        button.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
        button.classList.add('js-geolocate');
        button.setAttribute('data-action', 'geocoder#geolocate');
        container.appendChild(button);
    }

    geolocate(event) {
        event.preventDefault();

        if (this.isGeolocating) {
            return;
        }

        this.isGeolocating = true;

        let controller = this;
        let icon = document.querySelector('.js-geolocate i');

        icon.classList.add('fa-spinner');
        icon.classList.remove('fa-location-crosshairs');

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Use Google Geocoder to get address from coordinates
                controller.geocoder.geocode({
                    location: {lat, lng}
                }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const address = results[0].formatted_address;

                        // Update the input field with the address
                        const input = controller.geocoderTarget.querySelector('.geocoder-input');
                        input.value = address;

                        // Show clear button
                        const clearBtn = controller.geocoderTarget.querySelector('.geocoder-clear-btn');
                        if (clearBtn) {
                            clearBtn.style.display = 'block';
                        }

                        // Format result similar to Mapbox format
                        const result = {
                            id: results[0].place_id,
                            place_name: address,
                            geometry: {
                                type: 'Point',
                                coordinates: [lng, lat]
                            },
                            properties: {
                                address: address
                            },
                            address_components: results[0].address_components
                        };

                        controller.resultTarget.value = JSON.stringify(result, null, 2);

                        // Track success (if using analytics)
                        if (window._paq) {
                            window._paq.push(['trackEvent', 'geocoder', 'success']);
                        }
                    } else {
                        console.error('Geocoder failed due to: ' + status);

                        // Track failure (if using analytics)
                        if (window._paq) {
                            window._paq.push(['trackEvent', 'geocoder', 'fail', 'Geocoder error: ' + status]);
                        }
                    }

                    // Reset icon
                    icon.classList.remove('fa-spinner');
                    icon.classList.add('fa-location-crosshairs');
                    controller.isGeolocating = false;
                });
            },
            function (error) {
                console.log(error.message);
                let message = 'Geolocation error';
                if (error.message !== '') {
                    message = error.message;
                }

                icon.classList.remove('fa-spinner');
                icon.classList.add('fa-location-crosshairs');
                controller.isGeolocating = false;

                // Track failure (if using analytics)
                // if (window._paq) {
                //     window._paq.push(['trackEvent', 'geocoder', 'fail', error.message]);
                // }
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
}