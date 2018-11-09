/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2017   https://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var DC_ATTRIBUTE_AUTHOR = 212;  // standard schema dc:attribute:author, always present

    var objectTitles = {};    // maybe filled in by object editor 'plugin'
    var shadowedAttributes = {};
    var descChoosesQualifiers = {};

    var AuthorCitationEditorValue = function(value, desc, lookupDesc) {
        this.initialValue = value || {};
        this.desc = desc;
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
                '<div class="hres_author_citation_container',
                descChoosesQualifiers[this.desc] ? ' hres_author_citation_container_qualifiers' : '',
                '"><div class="hres_author_citation_container_lookup">',
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
            input[0].placeholder = 'fetching ...';
            jQuery.ajax({
                url: "/api/hres-author-citation-value/fetch",
                data: {ref: this.lookupControl.getValue()},
                success: function(body) {
                    var cite = (body || '').toString();
                    if(cite) { input.val(cite); }
                }
            });
        }
    });

    Haplo.editor.registerTextType("hres:author_citation", function(value, desc) {
        return new AuthorCitationEditorValue(value, desc, shadowedAttributes[desc] || DC_ATTRIBUTE_AUTHOR);
    });

    // Pick up titles of existing values using an editor plugin
    Haplo.editor.registerDelegate("hres_author_citation_value", function(editor, data) {
        objectTitles = data.titles || {};
        shadowedAttributes = data.shadowedAttributes || {};
        return {
            setupAttribute: function(container) {
                if(container.getContainerChoosesQualifier()) {
                    descChoosesQualifiers[container.getDescriptor()] = true;
                }
            }
        };
    });

})(jQuery);
