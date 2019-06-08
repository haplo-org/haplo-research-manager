/* Haplo Research Manager                             http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var HandleEditorValue = function(value) {
        this.hdl = value[0] || '';
    };
    _.extend(HandleEditorValue.prototype, {
        generateHTML: function() {
            var hdl = this.hdl;
            var html = ['info:hdl/<input type="text" size="20" value="', _.escape(hdl), '" tabindex="1" placeholder="eg: 10.1000/182">'];
            return html.join('');
        },
        attach: function(container) {
        },
        getValue: function(container) {
            var hdl = $.trim(($('input', container)[0].value || '')).replace(/\s+/g,'');
            return hdl.length ? [hdl] : null;
        },
        undoableDeletedText: function(container) {
            var hdl = this.getValue(container);
            return hdl ? 'hdl:'+hdl[0] : null;
        }
    });

    Haplo.editor.registerTextType("hres:hdl", function(value) {
        return new HandleEditorValue(value);
    });

})(jQuery);
