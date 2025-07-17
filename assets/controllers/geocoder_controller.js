import {Controller} from '@hotwired/stimulus';
import {Loader} from '@googlemaps/js-api-loader';


/* stimulusFetch: 'lazy' */
export default class extends Controller {
    static values = {
        apiKey: String,
        geoCoderPlaceholder: String, // @todo[m]: use this
    }

    static targets = ['geocoder', 'result', 'test'];

    autocomplete;
    google;

    async connect() {
        const loader = new Loader({
            apiKey: this.apiKeyValue,
            version: 'weekly',

        });

        this.google = await loader.load();
        await google.maps.importLibrary("places");

        const center = new google.maps.LatLng(50.874460, 12.6035228);
        const radiusMeters = 5000;

        const circle = new google.maps.Circle({
            center: center,
            radius: radiusMeters,
        });

        this.autocomplete = new google.maps.places.PlaceAutocompleteElement({
            includedRegionCodes: ['de'],
            locationRestriction: circle.getBounds()
        });

        const container = this.testTarget;

        container.classList.add('geocoder-container');
        container.appendChild(this.autocomplete);
        this.geocoderTarget.appendChild(container);

        this.autocomplete.addEventListener('gmp-select', async ({placePrediction}) => {
            const place = placePrediction.toPlace();
            await place.fetchFields({fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']});
            this.resultTarget.value = JSON.stringify(place, null, 2);
        });

        this.geocoder = new this.google.maps.Geocoder();
    }
}