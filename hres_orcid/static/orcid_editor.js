/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    // TODO: ORCID validation

    var ORCIDEditorValue = function(value) {
        this.orcid = value[0] || '';
    };
    _.extend(ORCIDEditorValue.prototype, {
        generateHTML: function() {
            var orcid = this.orcid;
            var html = ['<input type="text" size="24" value="', _.escape(orcid), '" tabindex="1" placeholder="eg: 0000-0002-1825-0097">'];
            return html.join('');
        },
        attach: function(container) {
        },
        getValue: function(container) {
            var orcid = $.trim(($('input', container)[0].value || '')).replace(/\s+/g,'');
            return orcid.length ? [orcid] : null;
        },
        undoableDeletedText: function(container) {
            var orcid = this.getValue(container);
            return orcid ? orcid[0] : null;
        }
    });

    Haplo.editor.registerTextType("hres:orcid", function(value) {
        return new ORCIDEditorValue(value);
    });

})(jQuery);
