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

function fill_metadata_table(file) {
    $("#metadata-table tbody").empty();
    for(var i=0;i<file.data_elements.length;++i) {
        var element = file.data_elements[i];
        var tag = $("<td>").html(tag_repr(element.tag));
        var dictmatch = dcmdict[element.tag];
        var name = $("<td>").html("unknown");
        if(dictmatch != undefined)
            var name = $("<td>").html(dcmdict[element.tag][1]);
        var value = $("<td>").html('N/A');
        var val = element.get_repr();
        if(val != undefined) {
            var value = $("<td>").html(element.get_repr());
        }

        var tr = $("<tr>").append(tag).append(name).append(value);
        if(i%2 == 0)
            tr.addClass("even");
        $("#metadata-table tbody").append(tr);
    }

}
