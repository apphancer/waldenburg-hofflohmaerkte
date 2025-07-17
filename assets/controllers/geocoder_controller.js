import {Controller} from '@hotwired/stimulus';
import {Loader} from '@googlemaps/js-api-loader';


/* stimulusFetch: 'lazy' */
export default class extends Controller {
    static values = {
        apiKey: String,
        geoCoderPlaceholder: String,
    }

    static targets = ['geocoder', 'result'];

    autocomplete;
    google;

    async connect() {
        await this.initializeGoogleMaps();
        await this.setupPlaceAutocomplete();
        this.setupEventListeners();
    }

    async initializeGoogleMaps() {
        const loader = new Loader({
            apiKey: this.apiKeyValue,
            version: 'weekly',
        });

        this.google = await loader.load();
        await google.maps.importLibrary('places');
    }

    async setupPlaceAutocomplete() {
        const locationRestriction = this.createLocationRestriction();

        this.autocomplete = new google.maps.places.PlaceAutocompleteElement({
            includedRegionCodes: ['de'],
            locationRestriction: locationRestriction
        });

        this.geocoderTarget.appendChild(this.autocomplete);
    }

    createLocationRestriction() {
        const center = new google.maps.LatLng(50.874460, 12.6035228);
        const radiusMeters = 5000;

        const circle = new google.maps.Circle({
            center: center,
            radius: radiusMeters,
        });

        return circle.getBounds();
    }

    setupEventListeners() {
        this.autocomplete.addEventListener('gmp-select', async ({placePrediction}) => {
            await this.handlePlaceSelection(placePrediction);
        });
    }

    async handlePlaceSelection(placePrediction) {
        const place = placePrediction.toPlace();
        await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
        });
        this.resultTarget.value = JSON.stringify(place, null, 2);
    }
}