
(function($) {

    $(document).ready(function() {
        var monthStart = 0, monthEnd = 11;

        $('.hres_schema_calendar_month_filter_start option')[monthStart].selected = true;
        $('.hres_schema_calendar_month_filter_end option')[monthEnd].selected = true;

        var fact = $('.hres_schema_calendar_month_filter_start').data('fact');

        var filterToDateRange = function() {
            $('[data-'+fact+']').each(function() {
                var date = new Date($(this).data(fact));
                if(date) {
                    var month = date.getMonth();
                    if(month < monthStart || month > monthEnd) {
                        $(this).hide();
                    } else {
                        $(this).show();
                    }
                }
            });
        };

        $('.hres_schema_calendar_month_filter_start').on('change', function() {
            monthStart = $(this).prop('selectedIndex');
            filterToDateRange();
        });

        $('.hres_schema_calendar_month_filter_end').on('change', function() {
            monthEnd = $(this).prop('selectedIndex');
            filterToDateRange();
        });
    });

})(jQuery);
