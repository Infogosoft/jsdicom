// Maybe use some cool js-templating, like mustasche?

function fill_serie_selection(series, selected_uid) {
    var series_list = $("#series-selection");
    series_list.empty();
    var size = 128;
    for(var uid in series) {
        instance_number_sort(series[uid].files);
        var item = $("<li>");
        var thumb_canvas = document.createElement("canvas");
        thumb_canvas.width = size;
        thumb_canvas.height = size;
        item.append(thumb_canvas);
        item.addClass('series-link');
        if(uid == selected_uid) {
            item.addClass('series-selected');
        }
        draw_thumbnail_to_canvas(series[uid].files[0], 
                                 thumb_canvas.getContext('2d'), 
                                 size);
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

function draw_to_canvas(file, ctx, ww, wl, clut_r, clut_g, clut_b) {
    var imageData = ctx.createImageData(file.columns, file.rows);
    
    for(var row=0;row<file.rows;++row) {
        for(var col=0;col<file.columns;++col) {
            var data_idx = (col + row*file.columns)*2;
            var intensity = file.pixel_data[data_idx+1]*256.0 + file.pixel_data[data_idx];
            intensity = intensity * file.rescaleSlope + file.rescaleIntercept;
            var lower_bound = wl - ww/2.0;
            var upper_bound = wl + ww/2.0;
            var intensity = (intensity - lower_bound)/(upper_bound - lower_bound);
            if(intensity < 0.0)
                intensity = 0.0;
            if(intensity > 1.0)
                intensity = 1.0;

            intensity *= 255.0;

            var canvas_idx = (col + row*file.columns)*4;
            var rounded_intensity = Math.round(intensity);
            imageData.data[canvas_idx] = clut_r[rounded_intensity];
            imageData.data[canvas_idx+1] = clut_g[rounded_intensity];
            imageData.data[canvas_idx+2] = clut_b[rounded_intensity];
            imageData.data[canvas_idx+3] = 0xFF;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function draw_thumbnail_to_canvas(file, ctx, size) {
    var imageData = ctx.createImageData(size, size);
    // use ww/wl from file
    var wl = 500;
    var ww = 1000;
    if(file.get_element(0x00281050) !== 0) {
        wl = file.get_element(0x00281050).get_value();
        wl = (wl.constructor == Array) ? wl[0] : wl;
        ww = file.get_element(0x00281051).get_value();
        ww = (ww.constructor == Array) ? ww[0] : ww;
    }
    var step = file.columns / size;
    
    for(var row=0;row<file.rows;row+=step) {
        for(var col=0;col<file.columns;col+=step) {
            var data_idx = (col + row*file.columns)*2;
            var intensity = file.pixel_data[data_idx+1]*256.0 + file.pixel_data[data_idx];
            intensity = intensity * file.rescaleSlope + file.rescaleIntercept;
            var lower_bound = wl - ww/2.0;
            var upper_bound = wl + ww/2.0;
            var intensity = (intensity - lower_bound)/(upper_bound - lower_bound);
            if(intensity < 0.0)
                intensity = 0.0;
            if(intensity > 1.0)
                intensity = 1.0;

            intensity *= 255.0;

            var canvas_idx = (col/step + (row/step)*size)*4;
            var rounded_intensity = Math.round(intensity);
            imageData.data[canvas_idx] = plain_red[rounded_intensity];
            imageData.data[canvas_idx+1] = plain_green[rounded_intensity];
            imageData.data[canvas_idx+2] = plain_blue[rounded_intensity];
            imageData.data[canvas_idx+3] = 0xFF;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}
