// Maybe use some cool js-templating, like mustasche?

function fill_serie_selection(series, selected_uid) {
    var series_list = $("#series-selection");
    series_list.empty();
    for(var uid in series) {
        instance_number_sort(series[uid].files);
        var item = $("<li>").text(series[uid].seriesDescription);
        item.addClass('series-link');
        if(uid == selected_uid) {
            item.addClass('series-selected');
        }
        
        item.prepend("<input type='checkbox'>");
        item.click((function(u) {
            return function() {
                series_list.find("li").removeClass('series-selected');
                $(this).addClass('series-selected');
                app.set_serie(u);
            }
        })(uid));
        series_list.append(item);
    }
}
