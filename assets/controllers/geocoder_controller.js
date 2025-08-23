import {Controller} from '@hotwired/stimulus';
import {Loader} from '@googlemaps/js-api-loader';


/* stimulusFetch: 'lazy' */
export default class extends Controller {
    static values = {
        apiKey: String,
        geoCoderPlaceholder: String,
        hasExistingAddress: Boolean,
    }

    static targets = ['geocoder', 'result', 'existingAddress'];

    autocomplete;
    google;

    async connect() {
        await this.initializeGoogleMaps();
        await this.setupPlaceAutocomplete();
        this.setupEventListeners();
        this.handleExistingData();

        /* start: hack required for placeholder */
        this.placeholderSetup();
        /* end: hack required for placeholder */
    }

    changeAddress(e) {
        e.preventDefault();
        this.geocoderTarget.classList.remove('hidden');
        this.existingAddressTarget.classList.add('hidden');
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
            locationRestriction: locationRestriction,
            types: ['address']

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

        // First set the value
        this.resultTarget.value = JSON.stringify(place, null, 2);

        // Then parse it for validation
        const placeData = JSON.parse(this.resultTarget.value);
        const hasStreetNumber = placeData.addressComponents?.some(component =>
            component.types && component.types.includes('street_number')
        );

        if (!hasStreetNumber) {
            alert('Bitte wählen Sie eine vollständige Adresse mit Hausnummer aus.');
            this.resultTarget.value = '';
            return;
        }

        this.placeholderHideOverlay();

    }

    handleExistingData() {
        if(this.hasExistingAddressValue) {
            this.geocoderTarget.classList.add('hidden');
        }
    }

    placeholderSetup() {
        this.placeholderCheckInitialValueAndHideOverlay();
        this.placeholderSetupOverlayClickEvents();
        this.placeholderSetupDocumentClickEvent();
    }

    placeholderCheckInitialValueAndHideOverlay() {
        this.geocoderTarget.style.setProperty('--overlay-text', `"${this.geoCoderPlaceholderValue}"`);

        if (this.resultTarget.value && this.resultTarget.value.trim() !== '') {
            this.placeholderHideOverlay();
        }
    }

    placeholderSetupOverlayClickEvents() {
        this.geocoderTarget.addEventListener('click', () => {
            this.placeholderHideOverlay();
        });
    }

    placeholderSetupDocumentClickEvent() {
        document.addEventListener('click', (event) => {
            if (!this.geocoderTarget.contains(event.target)) {
                this.placeholderHandleOutsideClick();
            }
        });
    }

    placeholderHandleOutsideClick() {
        const input = this.geocoderTarget.querySelector('gmp-place-autocomplete');
        const shadowRoot = input?.shadowRoot;
        const shadowInput = shadowRoot?.querySelector('input');

        if (this.placeholderShouldShowOverlay(shadowInput)) {
            this.placeholderShowOverlay();
        }
    }

    placeholderShouldShowOverlay(shadowInput) {
        const noInputValue = !shadowInput || !shadowInput.value;
        const noResultValue = !this.resultTarget.value || this.resultTarget.value.trim() === '';
        return noInputValue && noResultValue;
    }

    placeholderHideOverlay() {
        this.geocoderTarget.style.setProperty('--show-overlay', 'none');
    }

    placeholderShowOverlay() {
        this.geocoderTarget.style.setProperty('--show-overlay', 'block');
    }
}