/**
* Copyright 2012 Infogosoft
*
* This file is part of jsdicom.
*
* jsdicom is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
*
* jsdicom is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License along with jsdicom. If not, see http://www.gnu.org/licenses/.
*/
// Maybe use some cool js-templating, like mustasche?

function fill_series_selection(series, selected_uid, painter_factory) {
    var series_list = $("#series-selection");
    series_list.empty();
    var size = 128;
    var idx = 0;
    for(var uid in series) {
        idx++;
        instance_number_sort(series[uid].files);
        var item = $("<li>");
        var thumb_canvas = document.createElement("canvas");
        thumb_canvas.id = 'canvas_thumb_' + idx;
        thumb_canvas.width = size;
        thumb_canvas.height = size;
        item.append(thumb_canvas);
        item.addClass('series-link');
        if(uid == selected_uid) {
            item.addClass('series-selected');
        }
        //draw_thumbnail_to_canvas(series[uid].files[0], 
        //                         thumb_canvas.getContext('2d'), 
        //                         size);
        item.click((function(u) {
            return function() {
                series_list.find("li").removeClass('series-selected');
                $(this).addClass('series-selected');
                app.set_series(u);
            }
        })(uid));
        series_list.append(item);
        var painter = painter_factory(thumb_canvas.id);
        painter.init(thumb_canvas.id);
        painter.set_cluts(ClutManager.r('Plain'), ClutManager.g('Plain'), ClutManager.b('Plain'));
        painter.set_file(series[uid].files[0]);
        painter.set_windowing(40, 200);
        painter.draw_image();
    }
}

function fill_metadata_table(file) {
    $("#metadata-table tbody").empty();
    for(var key in file.data_elements) {
        var element = file.data_elements[key];
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
        /*if(i%2 == 0)
            tr.addClass("even");*/
        $("#metadata-table tbody").append(tr);
    }
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

    for(var row=0;row<file.Rows;row+=step) {
        for(var col=0;col<file.Columns;col+=step) {
            var data_idx = (col + row*file.columns)*2;
            var intensity = file.PixelData[data_idx+1]*256.0 + file.PixelData[data_idx];
            intensity = intensity * file.RescaleSlope + file.RescaleIntercept;
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
            imageData.data[canvas_idx] = ClutManager.r('Plain')[rounded_intensity];
            imageData.data[canvas_idx+1] = ClutManager.g('Plain')[rounded_intensity];
            imageData.data[canvas_idx+2] = ClutManager.b('Plain')[rounded_intensity];
            imageData.data[canvas_idx+3] = 0xFF;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function create_image_infobox(viewarea) {
    var infodiv = document.createElement('div');
    infodiv.id = 'infobox';
    infodiv.style.position = "absolute";
    infodiv.style.top = "6px";
    infodiv.style.color = "white";
    infodiv.style.fontSize = "14px";
    var infolist = document.createElement('ul');
    infolist.style.margin = "0px";
    infolist.style.paddingLeft = "7px";

    // Create list item and two p-tags for each property
    var attrs = [['size', 'Size'], ['ww', 'WW'], ['wl', 'WL'], ['sliceidx', 'Slice'], ['density', 'Density']];
    for(var idx in attrs) {
        var li = document.createElement('li');
        li.style.listStyle = 'none';
        li.style.margin = '0px';

        var plabel = document.createElement('p');
        plabel.style.cssFloat = 'left';
        plabel.innerHTML = attrs[idx][1];
        plabel.style.width = "50px";
        plabel.style.padding = "0px";
        plabel.style.margin = "0px";

        var pvalue = document.createElement('p');
        pvalue.style.cssFloat = 'left';
        pvalue.id = attrs[idx][0]+'_info';
        pvalue.style.padding = "0px";
        pvalue.style.margin = "0px";

        var cleardiv = document.createElement('div');
        cleardiv.style.clear = 'both';

        li.appendChild(plabel);
        li.appendChild(pvalue);
        li.appendChild(cleardiv);
        infolist.appendChild(li);
    }
    infodiv.appendChild(infolist);
    var canvas = viewarea.querySelector('canvas');
    viewarea.insertBefore(infodiv, canvas);
}
