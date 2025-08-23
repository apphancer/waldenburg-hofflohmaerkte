import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['input']

    connect() {
        console.log('Copy to clipboard controller connected');
        this.defaultMessage = document.getElementById('default-message');
        this.successMessage = document.getElementById('success-message');
    }

    async copy(event) {
        event.preventDefault();
        const button = event.currentTarget;
        const textToCopy = this.inputTarget.value;

        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showSuccess();

            // Reset back to default state after 2 seconds
            setTimeout(() => {
                this.resetState();
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }

    showSuccess() {
        this.defaultMessage.classList.add('hidden');
        this.successMessage.classList.remove('hidden');
    }

    resetState() {
        this.defaultMessage.classList.remove('hidden');
        this.successMessage.classList.add('hidden');
    }
}