/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var createFinancialCurrencyAmountValue = P.implementTextType("hres_currency:financial_currency_amount", "Financial currency amount", {
    string(value) {
        return [value.amount, value.currencyCode].join(" ");
    },
    indexable(value) {
        return [value.amount, value.currencyCode].join(" ");
    },
    render(value) {
        return [value.amount, value.currencyCode].join(" ");
    },
    $setupEditorPlugin(value) {
        P.template("include-editor-plugin").render();   // workaround to include client side support
    }
});

P.CurrencyAmount = {
    create(value) {
        if(("amount" in value) || ("currencyCode" in value)) {
            return createFinancialCurrencyAmountValue(value);
        } else {
            throw new Error("Bad Currency Value");
        }
    },
    isCurrencyAmount(maybeCurrency) {
        return O.isPluginTextValue(maybeCurrency, "hres_currency:financial_currency_amount");
    }
};

P.provideFeature("hres:currency", function(plugin) {
    plugin.CurrencyAmount = P.CurrencyAmount;
});

// --------------------------------------------------------------------------------------------------------------------

var CurrencyCodeForm = P.form({
    "specificationVersion": 0,
    "formId": "request-advice",
    "formTitle": "Request advice",
    "elements": [
        {
            "type": "choice",
            "label": "Codes to display in currency elements",
            "path": "currencyCodes",
            "style": "multiple",
            "choices": "currencyCodes"
        }
    ]
});

var currencyCodesStore = P.defineDocumentStore({
    name: "currencyCodes",
    formsForKey(key) { return [CurrencyCodeForm]; },
    keyIdType: "text",
    prepareFormInstance(key, form, instance, context) {
        var currencyCodes = [
            "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN",
            "BHD", "BIF", "BMD", "BND", "BOB", "BOV", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF",
            "CHE", "CHF", "CHW", "CLF", "CLP", "CNY", "COP", "COU", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF",
            "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD",
            "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK",
            "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP",
            "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR",
            "MWK", "MXN", "MXV", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN",
            "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG",
            "SEK", "SGD", "SHP", "SLL", "SOS", "SRD", "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT",
            "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "USN", "UYI", "UYU", "UYW", "UZS",
            "VES", "VND", "VUV", "WST", "XAF", "XAG", "XAU", "XBA", "XBB", "XBC", "XBD", "XCD", "XDR", "XOF",
            "XPD", "XPF", "XPT", "XSU", "XTS", "XUA", "XXX", "YER", "ZAR", "ZMW", "ZWL"
        ];
        instance.choices("currencyCodes", _.map(currencyCodes, (code) => {
            return [code, code];
        }));
    }
});

var CanEditCurrencyCodes = O.action("hres:action:can-edit-currency-codes").
    title("Can edit currency codes");

P.respond("GET,POST", "/do/hres-currency/edit-currency-codes", [
    {parameter:"status", as:"string", optional: true}
], function(E, status) {
    CanEditCurrencyCodes.enforce();
    // Using a key of "system" as currently the configuration is system wide.
    // This leaves the potential to have scope specific currencies in future.
    const currencyCodesInstance = currencyCodesStore.instance("system");
    currencyCodesInstance.handleEditDocument(E, {
        finishEditing(instance, E, complete) {
            let status = "stored";
            if(complete) {
                instance.commit(O.currentUser);
                status = "committed";
            }
            E.response.redirect("/do/hres-currency/edit-currency-codes?status="+status);
        },
        goToPage(instance, E, formId) {
            E.response.redirect("/do/hres-currency/edit-currency-codes/"+formId);
        },
        render(instance, E, deferredRender) {
            E.render({
                form: deferredRender,
                committed: status === "committed",
                stored: status === "stored"
            });
        }
    });
});

P.hook('hObjectEditor', function(response, object) {
    const currencyCodesInstance = currencyCodesStore.instance("system");
    if(currencyCodesInstance.hasCommittedDocument) {
        response.plugins.hres_currency = {
            currencyCodes: currencyCodesInstance.lastCommittedDocument.currencyCodes
        };
    }
    // Always render the editor plugin
    this.template("include-editor-plugin").render();
});

P.implementService("hres_currency:get_currency_codes", function() {
    return currencyCodesStore.instance("system").lastCommittedDocument.currencyCodes;
});