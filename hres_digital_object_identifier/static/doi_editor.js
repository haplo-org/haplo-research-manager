/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var DOIEditorValue = function(value) {
        this.doi = value[0] || '';
    };
    _.extend(DOIEditorValue.prototype, {
        generateHTML: function() {
            var doi = this.doi;
            var html = ['doi:<input type="text" size="20" value="', _.escape(doi), '" placeholder="eg: 10.1000/182">'];
            return html.join('');
        },
        attach: function(container) {
        },
        getValue: function(container) {
            var doi = $.trim(($('input', container)[0].value || '')).replace(/\s+/g,'');
            return doi.length ? [doi] : null;
        },
        undoableDeletedText: function(container) {
            var doi = this.getValue(container);
            return doi ? 'doi:'+doi[0] : null;
        }
    });

    Haplo.editor.registerTextType("hres:doi", function(value) {
        return new DOIEditorValue(value);
    });

})(jQuery);
