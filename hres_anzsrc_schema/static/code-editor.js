/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var CodeEditorValue = function(value) {
        this.code = value[0] || null;
    };
    _.extend(CodeEditorValue.prototype, {
        generateHTML: function() {
            return _.escape(this.code||'(empty)');
        },
        attach: function(container) {},
        getValue: function(container) {
            if(this.code) {
                return [this.code];
            }
        },
        undoableDeletedText: function(container) {
            return this.code;
        }
    });

    Haplo.editor.registerTextType("hres_anzsrc:for_code", function(value) {
        return new CodeEditorValue(value);
    });

})(jQuery);