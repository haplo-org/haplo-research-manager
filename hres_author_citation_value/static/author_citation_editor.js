/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var DC_ATTRIBUTE_AUTHOR = 212;  // standard schema dc:attribute:author, always present

    var objectTitles = {};    // maybe filled in by object editor 'plugin'
    var IGNORE_NAME_TITLES = ['mr','ms','mrs','dr','prof'];
    var shadowedAttributes = {};

    var AuthorCitationEditorValue = function(value, lookupDesc) {
        this.initialValue = value || {};
        this.lookupDesc = lookupDesc;
    };
    _.extend(AuthorCitationEditorValue.prototype, {
        generateHTML: function() {
            var ctl = this;
            var listener = function(container, ref, title) {
                ctl.onLookupControlChange(container, title);
            };
            this.lookupControl = Haplo.editor.createRefLookupControl(this, this.lookupDesc, listener, this.initialValue.ref, objectTitles[this.initialValue.ref]);
            var html = [
                '<div class="hres_author_citation_container"><div class="hres_author_citation_container_lookup">',
                this.lookupControl.generateHTML(),
                '</div><div class="hres_author_citation_container_citation"><input type="text" tabindex="1" value="',
                _.escape(this.initialValue.cite || ''),
                '" placeholder="eg Smith, J.B."></div></div>'
            ];
            return html.join('');
        },
        attach: function(container) {
            this.lookupControl.attachHandlers();
        },
        getValue: function(container) {
            var ref = this.lookupControl.getValue();
            var cite = this.getCitationValue(container);
            if(!ref && !cite) { return null; }
            var v = {};
            if(ref) { v.ref = ref; }
            if(cite) { v.cite = cite; }
            return v;
        },
        getCitationValue: function(container) {
            var cite = $.trim(($('.hres_author_citation_container_citation input', container)[0].value || ''));
            return (cite.length === 0) ? undefined : cite;
        },
        onLookupControlChange: function(container, title) {
            var input = $('.hres_author_citation_container_citation input', container);
            if(window.hresAuthorCitationValueFetch) {
                // Server implementation
                input[0].placeholder = 'fetching ...';
                window.hresAuthorCitationValueFetch(this.lookupControl.getValue(), function(cite) {
                    if(cite) { input.val(cite); }
                });
            } else {
                // Client side implementation
                var cite = this.getCitationValue(container);
                if(!cite) {
                    var elements = title.split(/\s+/);
                    var last = elements.pop();
                    if(-1 !== _.indexOf(IGNORE_NAME_TITLES, (elements[0]||'').toLowerCase())) {
                        elements.shift();
                    }
                    input.val(last+', '+
                        _.map(elements, function(e) { return e[0]+'.'; }).join('')
                    );
                }
            }
        }
    });

    Haplo.editor.registerTextType("hres:author_citation", function(value, desc) {
        return new AuthorCitationEditorValue(value, shadowedAttributes[desc] || DC_ATTRIBUTE_AUTHOR);
    });

    // Pick up titles of existing values using an editor plugin
    Haplo.editor.registerDelegate("hres_author_citation_value", function(editor, data) {
        objectTitles = data.titles || {};
        shadowedAttributes = data.shadowedAttributes || {};
        return {};
    });

})(jQuery);
