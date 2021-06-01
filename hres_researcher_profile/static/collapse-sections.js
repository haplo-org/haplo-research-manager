/* Haplo Research Manager                            https://haplo.org
 * (c) Haplo Services Ltd 2006 - 2021            https://www.haplo.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


(function($){
    $(function(){
        $(".expand-collapse").click(function() {
            var sectionTitle = $(this).data("section");
            var expanded = !!$(this).data("expanded");
            var section = $(".collapsible[data-section=\""+sectionTitle+"\"]");
            if(expanded) {
                section.fadeOut();
                $(this).text("expand");
                $(this).data("expanded", 0);
            } else {
                section.fadeIn();
                $(this).text("collapse");
                $(this).data("expanded", 1);
            }
        });
        // If there's no rendered collapsible section
        _.each($(".expand-collapse"), function(element) {
            var sectionTitle = $(element).data("section");
            if(!$(".collapsible[data-section=\""+sectionTitle+"\"]").length) { $(element).hide(); }
        });
    });
})(jQuery);