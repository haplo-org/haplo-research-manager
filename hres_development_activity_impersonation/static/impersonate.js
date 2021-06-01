/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

(function($) {

    $(document).ready(function() {
        $('._hres_impersonate').on('click', function(evt) {
            evt.preventDefault();
            $('#_hres_impersonate_form input[name=uid]')[0].value = this.getAttribute('data-uid');
            $('#_hres_impersonate_form').submit();
        });
    });

})(jQuery);