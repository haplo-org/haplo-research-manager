/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2018            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


var listener = function () {
    document.getElementById("deadline-notice").style.display = '';
};

var fn = function() { 
    var els = document.getElementsByClassName("released-file");
    for(var i = 0; i < els.length; i++) {
        els[i].addEventListener("click", listener);
    }
};

(function ready(fn) {
    if(document.attachEvent ? document.readyState === "complete" : document.readyState !== "loading"){
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
})(fn);

