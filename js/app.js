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
var timer_event;
function log(s)
{
    var logEntry = $("<li>").html(s);
    $("#loglist").append(logEntry);
}

function log_element(elem_repr) {
    this.i = 0;
    this.i++;
    var elem_div = $("<div>").html(elem_repr);
    if(this.i % 2 == 0)
        elem_div.addClass("even");            
    $("#dicomheader").append(elem_div);
}


function DcmApp(viewareaid) {
    this.viewareaid = viewareaid;
    this.painter;

    this.last_mouse_canvas_pos = [NaN,NaN];
    this.last_mouse_image_pos = [NaN,NaN];
    this.mouse_down = false;

    this.series = {};
    this.curr_series_uid = "";
    this.files = []; // points to files-array in current series
    this.files_loaded = 0;
    this.curr_file_idx = 0;
    // tools
    this.curr_tool = new WindowLevelTool(this);
    this.curr_clut_r = ClutManager.r('Plain');
    this.curr_clut_g = ClutManager.g('Plain');
    this.curr_clut_b = ClutManager.b('Plain');
}

DcmApp.prototype.load_files = function(files)
{
    var app = this;
    this.curr_file_idx = 0;
    this.series = {};
    this.files = [];
    this.files_loaded = 0;
    for(var i=0;i<files.length;++i) {
        this.load_file(files[i], i, files.length);
    }
    $("#slider").slider({
        value: 0,
        max: files.length-1,
        slide: function(ui, event) {
            app.curr_file_idx = event.value; //$(this).slider('value');
            app.curr_tool.set_file(app.files[app.curr_file_idx]);
            app.draw_image();
        }
    });
}

DcmApp.prototype.load_urllist_from_url = function(url)
{
    var app = this;
    this.curr_file_idx = 0;
    this.files_loaded = 0;
    var files = [];

    $.ajax({
        async: false,
        dataType: "json",
        url: url,
        success: function(r){
            files = r;
        }
    });

    for(var i=0;i<files.length;++i) {
        this.load_url(files[i].href, i, files.length);
    }

    $("#slider").slider({
        value: 0,
        max: files.length-1,
        slide: function(ui, event) {
            app.curr_file_idx = event.value; //$(this).slider('value');
            app.curr_tool.set_file(app.files[app.curr_file_idx]);
            app.draw_image();
        }
    });
}

DcmApp.prototype.load_arraybuffer = function(abuf, index, file_count) {
    var app = this;
    var buffer = new Uint8Array(abuf);
    parser = new DicomParser(buffer);
    var file = parser.parse_file();
    if (file == undefined) {
        app.files[index] = undefined;
        return;
    }

    if (file.Modality == "CT" || file.Modality == "PT" || file.Modality == "MR") {
        imageOrientation = file.ImageOrientationPatient;
        file.imageOrientationRow = imageOrientation.slice(0,3);
        file.imageOrientationColumn = imageOrientation.slice(3,6);
        
        app.organize_file(file);
    } else if(file.modality == "US") {
        file.RescaleIntercept = 0;
        file.RescaleSlope = 1;
        app.files[index] = file;
        app.organize_file(file);
    } else {
        file.RescaleIntercept = 0;
        file.RescaleSlope = 1;
        app.organize_file(file);
        app.files[index] = file;
    }

    if(index == 0) {
        app.curr_series_uid = file.SeriesInstanceUID;
        app.files = app.series[app.curr_series_uid].files;
        app.draw_image();
    }
    ++app.files_loaded;
    if(app.files_loaded == file_count) {
        // All files are loaded
        app.setup_series_selection();
    }
}


DcmApp.prototype.load_file = function(file, index, file_count) {
    var reader = new FileReader();

    // Closure to bind app, 'this' will be reader
    reader.onload = (function(app) {
        return function(evt) {
            return app.load_arraybuffer(evt.target.result, index, file_count);
        }
    })(this);
    reader.readAsArrayBuffer(file);
}

DcmApp.prototype.load_url = function(url, index, file_count) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    // Closure to bind app, 'this' will be reader
    xhr.onload = (function(app) {
        return function(evt) {
            return app.load_arraybuffer(evt.target.response, index, file_count);
        }
    })(this);
    xhr.send();
}

DcmApp.prototype.organize_file = function(file) {
    var series_uid = file.SeriesInstanceUID;
    var series_desc = file.SeriesDescription;
    if(!this.series.hasOwnProperty(series_uid)) {
        var series = new DcmSeries();
        series.seriesUID = series_uid;
        series.seriesDescription = series_desc;
        this.series[series_uid] = series;
    }
    this.series[series_uid].files.push(file);
}


DcmApp.prototype.setup_series_selection = function() {
    fill_series_selection(this.series, this.curr_series_uid, function(cid) { return new CanvasPainter(cid) });
    this.set_series(this.curr_series_uid);
}

DcmApp.prototype.set_series = function(series_uid) {
    this.files = this.series[series_uid].files;
    var ww;
    var wl;
    if(this.files[0].WindowCenter !== undefined) {
        wl = this.files[0].WindowCenter;
        ww = this.files[0].WindowWidth;
        if(wl.constructor == Array) {
            app.update_window_preset_list(wl, ww);
            wl = wl[0];
        }
        if(ww.constructor == Array) {
            ww = ww[0];
        }
    } else if(this.files[0].RescaleSlope !== 0) {
        // TODO check the actual datatype instead of using 65536...
        maxval = this.files[0].RescaleSlope * 65536 +
            this.files[0].RescaleIntercept;
        minval = this.files[0].RescaleIntercept;
        ww = maxval-minval;
        wl = (maxval+minval)/2;
    } else {
        ww = 65536.0;
        wl = 32768.0;
    }
    this.curr_file_idx = 0;
    this.set_windowing(wl, ww);
    this.draw_image();
}

DcmApp.prototype.set_pan = function(panx, pany) {
    this.painter.set_pan(panx, pany);
    this.last_mouse_image_pos = this.painter.unproject(this.last_mouse_canvas_pos);
    this.refreshmousemoveinfo();
}

DcmApp.prototype.get_pan = function(pan) {
    return this.painter.get_pan();
}

DcmApp.prototype.set_scale = function(scale) {
    this.painter.set_scale(scale);
    this.last_mouse_image_pos = this.painter.unproject(this.last_mouse_canvas_pos);
    this.refreshmousemoveinfo();
}

DcmApp.prototype.get_scale = function(scale) {
    return this.painter.get_scale();
}

DcmApp.prototype.set_windowing = function(wl, ww) {
    return this.painter.set_windowing(wl, ww);
}

DcmApp.prototype.get_windowing = function() {
    return this.painter.get_windowing();
}

DcmApp.prototype.set_slice_idx = function(idx) {
    if(idx < 0 || idx > this.files.length - 1)
        return;
    this.curr_file_idx = idx;
    this.draw_image();
}

DcmApp.prototype.get_slice_idx = function() {
    return this.curr_file_idx;
}

DcmApp.prototype.draw_image = function() {
    var curr_file = this.files[this.curr_file_idx];
    if(curr_file == undefined)
        return;
    $("#size_info").text(curr_file.Rows + "x" + curr_file.Columns);
    $("#sliceidx_info").text(this.curr_file_idx+1 + "/" + this.files.length);
    $("#slider").slider("option", "value", this.curr_file_idx);
    var windowing = this.painter.get_windowing();
    $("#ww_info").text(windowing[1]);
    $("#wl_info").text(windowing[0]);
    this.painter.set_file(curr_file);
    this.painter.set_cluts(this.curr_clut_r, this.curr_clut_g, this.curr_clut_b);
    this.painter.draw_image();
}

DcmApp.prototype.fill_metadata_table = function() {
    if(this.files.length == 0)
        return;
    fill_metadata_table(this.files[this.curr_file_idx]);
}

DcmApp.prototype.activate_tool = function(tool_identifier) { 
    this.curr_tool = new tools[tool_identifier](this);
    this.curr_tool.set_file(this.files[this.curr_file_idx]);
}

DcmApp.prototype.reset_levels = function() { 
    this.painter.reset_pan();
    this.painter.reset_windowing();
    this.painter.reset_scale();
    this.draw_image();
}

DcmApp.prototype.mousemoveinfo = function(canvas_pos, image_pos) {
    if (this.files.length <= this.curr_file_idx) {
        $("#density_info").html("");
        return;
    }

    var curr_file = this.files[this.curr_file_idx];
    if (curr_file == undefined)
        return;

    var rowcol = app.painter.image_coords_to_row_column(image_pos);
    var row = rowcol[0];
    var col = rowcol[1];

    var coord = curr_file.getPatientCoordinate(row,col);
    var ctval = curr_file.getCTValue(row, col);
    if (ctval == undefined) {
        $("#density").html("");
        return;
    }
    
    if (coord != undefined) {
        $("#density_info").html("value(" + coord.map(function(x) {return x.toFixed(1);}) + ") = " + ctval.toFixed(1));
    } else {
        $("#density_info").html("r,c = (" + row + ", " + col + "), val = " + ctval);
    }
}

DcmApp.prototype.set_clut = function(clutname) {
    this.curr_clut_r = ClutManager.r(clutname);
    this.curr_clut_g = ClutManager.g(clutname);
    this.curr_clut_b = ClutManager.b(clutname);
    this.draw_image();
}

DcmApp.prototype.refreshmousemoveinfo = function() {
    this.mousemoveinfo(this.last_mouse_canvas_pos, this.last_mouse_image_pos);
}

DcmApp.prototype.update_window_preset_list = function(wls, wws) { 
    var optgroup = $("#window-presets").find("optgroup")
    optgroup.empty();
    for(var i=0;i<wws.length;++i) {
        var option = $("<option>").val(wls[i] + "," + wws[i]).text(wls[i] + " - " + wws[i]);
        optgroup.append(option);
    }
}

DcmApp.prototype.set_window_preset = function(value) { 
    var spl = value.split(",");
    this.painter.set_windowing(parseFloat(spl[0]), parseFloat(spl[1]));
    this.draw_image();
}

DcmApp.prototype.rel_pos_from_event = function(evt) {
    var rel_pos = [-1, -1];
    rel_pos[0] = Math.floor(evt.pageX - $(this.canvas).offset().left);
    rel_pos[1] = Math.floor(evt.pageY - $(this.canvas).offset().top);
    return rel_pos;
}

DcmApp.prototype._init_painter = function(painter) {
    painter.set_cluts(this.curr_clut_r, this.curr_clut_g, this.curr_clut_b);
    painter.clut_bar_enabled = true;
    painter.init();
}

DcmApp.prototype.init = function() {
    // Create canvas inside this.divid
    this.viewarea = document.getElementById(this.viewareaid);
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'maincanvas'; // TODO: Unique of use of prefix
    this.canvas.width = this.viewarea.clientWidth - 1;
    this.canvas.height = this.viewarea.clientHeight - 1;
    this.canvas.style.border = '1px solid #aaa';
    this.viewarea.appendChild(this.canvas);
    // Create infobox
    create_image_infobox(this.viewarea);

    var painters = [
        function(cid) { return new GLPainter(cid); },
        function(cid) { return new CanvasPainter(cid); },
    ];
    for(var i in painters) {
        var painter = painters[i](this.canvas.id);
        try {
            painter.set_cluts(this.curr_clut_r, this.curr_clut_g, this.curr_clut_b);
            painter.clut_bar_enabled = true;
            painter.init();
            this.painter = painter;
            break;
        } catch(e) {
            console.log(e);
        }
    }
    if(!this.painter) {
        alert("Failed to create WebGL and Canvas context");
        return false;
    }

    var app = this;
    this.canvas.onmousemove = function(evt) {
        app.last_mouse_canvas_pos = app.rel_pos_from_event(evt);
        app.last_mouse_image_pos = app.painter.unproject(app.last_mouse_canvas_pos);
        if (app.curr_tool.mousemove !== undefined)
            app.curr_tool.mousemove(app.last_mouse_canvas_pos, app.last_mouse_image_pos);
        app.refreshmousemoveinfo();
        return false;
    }
    

    this.canvas.onmousedown = function(evt) {
        if (app.curr_tool.mousedown !== undefined) {
            var canvas_pos = app.rel_pos_from_event(evt);
            image_pos = app.painter.unproject(canvas_pos);
            app.curr_tool.mousedown(canvas_pos, image_pos);
        }
        app.mouse_down = true;
        return false;
    }

    this.canvas.onmouseup = function(evt) {
        if (app.curr_tool.mouseup !== undefined) {
            var canvas_pos = app.rel_pos_from_event(evt);
            image_pos = app.painter.unproject(canvas_pos);
            app.curr_tool.mouseup(canvas_pos, image_pos);
        }
        app.mouse_down = false;
        return false;
    }

    this.canvas.onmouseout = function(evt) {
        app.mouse_down = false;
        return false;
    }

    this.canvas.onclick = function(evt) {
        if (app.curr_tool.click !== undefined) {
            var canvas_pos = app.rel_pos_from_event(evt);
            image_pos = app.painter.unproject(canvas_pos);
            app.curr_tool.click(canvas_pos, image_pos);
        }
        return false;
    }

    function scrollListener(evt) {
        if (app.curr_tool.scroll !== undefined)
            app.curr_tool.scroll(evt.detail);
        return false;
    }
    function wheelListener(evt) {
        if (app.curr_tool.scroll !== undefined)
            app.curr_tool.scroll(evt.wheelDeltaY/3);
        return false;
    }
    
    this.canvas.addEventListener('DOMMouseScroll', scrollListener, false);
    this.canvas.addEventListener('mousewheel', wheelListener, false);

    document.getElementById("infobox").onmousemove = this.canvas.onmousemove;
    document.getElementById("infobox").onmousedown = this.canvas.onmousedown;
    document.getElementById("infobox").onmouseup = this.canvas.onmouseup;
    document.getElementById("infobox").onmouseout = this.canvas.onmouseout;
    document.getElementById("infobox").onclick = this.canvas.onclick;
    document.getElementById("infobox").addEventListener('DOMMouseScroll', scrollListener, false);

    window.onresize = function(evt) {
        // Update canvas dimension and redraw
        clearTimeout(timer_event);
        function resize_canvas() {
            var container = document.getElementById('view-area');
            var c = document.getElementById('maincanvas');
            c.width = container.clientWidth - 1;
            c.height = container.clientHeight - 1;
            app.painter.onresize();
        }
        timer_event = setTimeout(resize_canvas, 10);
    }
}
