/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */

(function($) {
    $(document).on('ready', function() {
        $('.copy-url-button').on('click', function copyUrlToClipboard() {
            var target = document.getElementById($(this).data('clipboard-target-id'));
            target.focus();
            document.execCommand('SelectAll');
            var success = document.execCommand('Copy', false, null);
            if(success) {
                $('.copy-url-success').removeClass('hidden');
            } else {
                $('.copy-url-failure').removeClass('hidden');
            }
        });
        $('.calendar-url').on('click', function selectUrl() {
            document.execCommand('SelectAll');
        });
    });
})(jQuery);
