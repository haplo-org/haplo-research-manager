/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    $(document).ready(function() {
        $(".activities_admin_nav_container").on('click', 'a', function(evt) {
            evt.preventDefault();
            var actkind = this.getAttribute('data-actkind');
            $(".activities_admin_nav_container a").each(function() {
                if(this.getAttribute('data-actkind') === actkind) {
                    $(this).hide();
                } else {
                    $(this).show();
                }
            });
            $(".activities_admin_nav_page").each(function() {
                if(this.getAttribute('data-actkind') === actkind) {
                    $(this).show();
                } else {
                    $(this).hide();
                }
            });
        });
    });

})(jQuery);
