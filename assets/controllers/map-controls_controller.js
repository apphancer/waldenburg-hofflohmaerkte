import { Controller } from '@hotwired/stimulus';

export default class extends Controller {

    static targets = ["hideListBtn", "showListBtn"];

    sidebar;

     connect() {
         this.hideListBtnTarget.classList.add('hidden');
         this.sidebar = document.querySelector('#sidebar');
     }

     showList() {
         this.showListBtnTarget.classList.add('hidden');
         this.hideListBtnTarget.classList.remove('hidden');
         this.sidebar.classList.add('sidebar-active');
     }


     hideList() {
         this.showListBtnTarget.classList.remove('hidden');
         this.hideListBtnTarget.classList.add('hidden');
         this.sidebar.classList.remove('sidebar-active');
     }
}
