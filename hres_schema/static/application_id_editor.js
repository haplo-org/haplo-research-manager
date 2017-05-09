/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var AppIdEditorValue = function(value) {
        this.appid = value[0] || null;
    };
    _.extend(AppIdEditorValue.prototype, {
        generateHTML: function() {
            return _.escape(this.appid||'(empty Application ID)');
        },
        attach: function(container) {},
        getValue: function(container) {
            return [this.appid];
        },
        undoableDeletedText: function(container) {
            return this.appid;
        }
    });

    Haplo.editor.registerTextType("hres:appid", function(value) {
        return new AppIdEditorValue(value);
    });

})(jQuery);
