/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var HESAEditorValue = function(value) {
        this.hesa = value[0] || '';
    };
    _.extend(HESAEditorValue.prototype, {
        generateHTML: function() {
            var hesa = this.hesa;
            var html = ['<input type="text" size="20" value="', _.escape(hesa), '" tabindex="1" placeholder="eg: 1234567891011">'];
            return html.join('');
        },
        attach: function(container) {
        },
        getValue: function(container) {
            var hesa = $.trim(($('input', container)[0].value || '')).replace(/\s+/g,'');
            return hesa.length ? [hesa] : null;
        },
        undoableDeletedText: function(container) {
            var hesa = this.getValue(container);
            return hesa ? hesa[0] : null;
        }
    });

    Haplo.editor.registerTextType("hres:hesa", function(value) {
        return new HESAEditorValue(value);
    });

})(jQuery);
