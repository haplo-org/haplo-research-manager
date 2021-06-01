/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($) {

    var currencyCodes;

    var FinancialCurrencyAmountValue = function(value) {
        this.amount = value.amount || '';
        this.currencyCode = value.currencyCode || '';
    };
    _.extend(FinancialCurrencyAmountValue.prototype, {
        generateHTML: function() {
            var amount = this.amount;
            var selectedCode = this.currencyCode;
            var html = [
                '<input type="number" size="20" value="'+amount+'" tabindex="1" placeholder="eg: 99" min="0">',
                '<select name="currencyCode">',
                '<option value="">--- choose currency ---</option>'
            ];
            _.each(currencyCodes, function(code) {
                var selected = code === selectedCode;
                var option = [
                    '<option value="'+code+'"'+(selected ? ' selected' : '')+'>',
                    code,
                    '</option>'
                ];
                html.push(option.join(''));
            });
            html.push('</select>');
            return html.join('');
        },
        attach: function(container) {
        },
        getValue: function(container) {
            var value = {};

            var amount = $.trim(($('input', container)[0].value || '')).replace(/\s+/g,'');
            if(amount) { value.amount = parseInt(amount, 10); }

            var currencyCode = $('select', container)[0].value;
            if(currencyCode) { value.currencyCode = currencyCode; }
            return _.isEmpty(value) ? null : value;
        },
        undoableDeletedText: function(container) {
            var value = this.getValue(container);
            return [value.amount, value.currencyCode].join(' ');
        },
        validate: function(value) {
            if(value.amount && isNaN(value.amount)) {
                return "Currency values must be numeric";
            }
        }
    });

    Haplo.editor.registerTextType("hres_currency:financial_currency_amount", function(value) {
        return new FinancialCurrencyAmountValue(value);
    });

    Haplo.editor.registerDelegate("hres_currency", function(editor, data) {
        currencyCodes = data.currencyCodes;
        return {};
    });

})(jQuery);
