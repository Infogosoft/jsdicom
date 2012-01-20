
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


function DcmApp(canvasid) {

    this.canvasid = canvasid;

    this.ww = 1000;
    this.wl = 500;
    this.scale_factor = 1;
    this.pan = [0,0];

    this.last_mouse_pos = [-1,-1];
    this.mouse_down = false;

    this.series = {};
    this.curr_serie_uid = "";
    this.files = []; // points to files-array in current series
    this.files_loaded = 0;
    this.curr_file_idx = 0;
    // tools
    this.curr_tool = new WindowLevelTool(this);
    this.curr_clut_r = plain_red;
    this.curr_clut_g = plain_green;
    this.curr_clut_b = plain_blue;

    this.load_files = function(files)
    {
        var app = this;
        this.curr_file_idx = 0;
        this.files_loaded = 0;
        for(var i=0;i<files.length;++i) {
            this.load_file(files[i], i, files.length);
        }
        $("#slider").slider({
            value: 0,
            max: files.length,
            slide: function(ui, event) {
                app.curr_file_idx = $(this).slider('value');
                app.curr_tool.set_file(app.files[app.curr_file_idx]);
                app.draw_image();
            }
        });
    }


    this.load_file = function(file, index, file_count) {
        var reader = new FileReader();

        // Closure to bind app, 'this' will be reader
        reader.onload = (function(app) {
            return function(evt) {
                var buffer = new Uint8Array(evt.target.result);
                parser = new DicomParser(buffer);
                var file = parser.parse_file();
                if (file == undefined) {
                    app.files[index] = undefined;
                    return;
                }
                file.modality = file.get_element(0x00080060).get_value();
                
                var pn = file.get_element(0x00100010).get_value();
                if (file.modality == "CT" || file.modality == "PT" || file.modality == "MR") {
                    file.pixel_data = file.get_element(0x7fe00010).data;
                    file.rows = file.get_element(0x00280010).get_value();
                    file.columns = file.get_element(0x00280011).get_value();
                    file.imagePosition = file.get_element(0x00200032).get_value();
                    imageOrientation = file.get_element(0x00200037).get_value();
                    file.imageOrientationRow = imageOrientation.slice(0,3);
                    file.imageOrientationColumn = imageOrientation.slice(3,6);
                    
                    file.rescaleIntercept = file.get_element(0x00281052).get_value();
                    file.rescaleSlope = file.get_element(0x00281053).get_value();
                    //app.files[index] = file;
                    app.organize_file(file);
                    if(index == 0) {
                        
                        app.curr_serie_uid = file.get_element(0x0020000e).get_value();
                        app.files = app.series[app.curr_serie_uid].files;
                        //app.draw_image();
                    }
                } else {
                    app.files[index] = file;
                }
                ++app.files_loaded;
                if(app.files_loaded == file_count) {
                    // All files are loaded
                    app.setup_series_selection();
                }
            }
        })(this);
        reader.readAsArrayBuffer(file);
    }

    this.organize_file = function(file) {
        var series_uid = file.get_element(0x0020000e).get_value();
        var series_desc = file.get_element(0x0008103e).get_value();
        if(!this.series.hasOwnProperty(series_uid)) {
            var serie = new DcmSerie();
            serie.seriesUID = series_uid;
            serie.seriesDescription = series_desc;
            this.series[series_uid] = serie;
        }
        this.series[series_uid].files.push(file);
    }


    this.setup_series_selection = function() {
        var app = this;
        var series_list = $("#series-selection");
        series_list.empty();
        for(var uid in this.series) {
            instance_number_sort(this.series[uid].files);
            var item = $("<li>").text(this.series[uid].seriesDescription);
            item.addClass('series-link');
            if(uid == this.curr_serie_uid) {
                item.addClass('series-selected');
            }
            item.click((function(u) {
                return function() {
                    series_list.find("li").removeClass('series-selected');
                    $(this).addClass('series-selected');
                    app.set_serie(u);
                }
            })(uid));
            series_list.append(item);
        }
        this.set_serie(this.curr_serie_uid);

    }

    this.set_serie = function(series_uid) {
        this.files = this.series[series_uid].files;
        app.wl = this.files[0].get_element(0x00281050).get_value();
        app.ww = this.files[0].get_element(0x00281051).get_value(); 
        if(app.wl.constructor == Array) {
            app.update_window_preset_list(app.wl, app.ww);
            app.wl = app.wl[0];
        }
        if(app.ww.constructor == Array) {
            app.ww = app.ww[0];
        }
        this.curr_file_idx = 0;
        this.draw_image();
    }

    this.draw_image = function() {
        var curr_file = this.files[this.curr_file_idx];
        if(curr_file == undefined)
            return;
        //var temp_canvas = document.createElement("canvas");
        var temp_canvas = document.getElementById(this.canvasid);
        temp_canvas.width = curr_file.rows;
        temp_canvas.height = curr_file.rows;
        var c = temp_canvas.getContext("2d");
        var imageData = c.createImageData(curr_file.columns, curr_file.rows);
        
        for(var row=0;row<curr_file.rows;++row) {
            for(var col=0;col<curr_file.columns;++col) {
                var data_idx = (col + row*curr_file.columns)*2;
                var intensity = curr_file.pixel_data[data_idx+1]*256.0 + curr_file.pixel_data[data_idx];
                intensity = intensity * curr_file.rescaleSlope + curr_file.rescaleIntercept;
                var lower_bound = app.wl - app.ww/2.0;
                var upper_bound = app.wl + app.ww/2.0;
                var intensity = (intensity - lower_bound)/(upper_bound - lower_bound);
                if(intensity < 0.0)
                    intensity = 0.0;
                if(intensity > 1.0)
                    intensity = 1.0;


                intensity *= 255.0;

                var canvas_idx = (col + row*curr_file.columns)*4;
                var rounded_intensity = Math.round(intensity);
                imageData.data[canvas_idx] = this.curr_clut_r[rounded_intensity];
                imageData.data[canvas_idx+1] = this.curr_clut_g[rounded_intensity];
                imageData.data[canvas_idx+2] = this.curr_clut_b[rounded_intensity];
                imageData.data[canvas_idx+3] = 0xFF;
            }
        }

        c.putImageData(imageData, 0, 0);
        c.strokeStyle = 'white';
        c.strokeText("WL: " + this.wl, 5, 20);
        c.strokeText("WW: " + this.ww, 5, 40);
        
        // Call current tool for post draw operations
        this.curr_tool.postdraw(c);
        this.refreshmousemoveinfo();
        /*var canvas = document.getElementById(this.canvasid);
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, curr_file.rows, curr_file.rows);
        var scaled_width = curr_file.rows*this.scale_factor;
        var scaled_height = curr_file.columns*this.scale_factor;
        ctx.drawImage(temp_canvas, (curr_file.rows-scaled_width)/2, (curr_file.columns-scaled_height)/2, scaled_width, scaled_height);
        //ctx.drawImage(temp_canvas, 0, 0, 512, 512);
        ctx.strokeStyle = 'white';
        ctx.strokeText("WL: " + this.wl, 5, 20);
        ctx.strokeText("WW: " + this.ww, 5, 40);*/
    }


    this.fill_metadata_table = function() {
        if(this.files.length == 0)
            return;
        var file = this.files[this.curr_file_idx];
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

    this.activate_measure_tool = function() { 
        this.curr_tool = new MeasureTool(this);
        this.curr_tool.set_file(this.files[this.curr_file_idx]);
    }

    this.activate_window_level_tool = function() { 
        this.curr_tool = new WindowLevelTool(this);
        this.curr_tool.set_file(this.files[this.curr_file_idx]);
    }

    this.activate_zooming = function() { 
        this.curr_tool = new ScaleTool(this);
        this.curr_tool.set_file(this.files[this.curr_file_idx]);
    }

    this.mousemoveinfo = function(row, col) {
        if (this.files.length <= this.curr_file_idx) {
            $("#density").html("");
            return;
        }
        var curr_file = this.files[this.curr_file_idx];
        if (curr_file == undefined)
            return;
        var coord = curr_file.getPatientCoordinate(row,col);
        var ctval = curr_file.getCTValue(row, col);
        if (ctval == undefined) {
            $("#density").html("");
            return;
        }
        $("#density").html("rho(" + coord.map(function(x) {return x.toFixed(1);}) + ") = " + ctval.toFixed(1) + " HU");
    }

    this.set_clut = function(clutname) {
        switch(clutname) {
            case "Rainbow":
                this.curr_clut_r = rainbow_red;
                this.curr_clut_g = rainbow_green;
                this.curr_clut_b = rainbow_blue;
                break;
            case "Blackbody":
                this.curr_clut_r = blackbody_red;
                this.curr_clut_g = blackbody_green;
                this.curr_clut_b = blackbody_blue;
                break;
        }
        this.draw_image();
    }

    this.refreshmousemoveinfo = function() {
        var canvas = document.getElementById(this.canvasid);
        this.mousemoveinfo(this.last_mouse_pos[0] - canvas.offsetLeft, this.last_mouse_pos[1] - canvas.offsetTop);
    }

    this.update_window_preset_list = function(wls, wws) { 
        var optgroup = $("#window-presets").find("optgroup")
        optgroup.empty();
        for(var i=0;i<wws.length;++i) {
            var option = $("<option>").val(wls[i] + "," + wws[i]).text(wls[i] + " - " + wws[i]);
            optgroup.append(option);
        }
    }
    this.set_window_preset = function(value) { 
        var spl = value.split(",");
        this.wl = parseFloat(spl[0]);
        this.ww = parseFloat(spl[1]);
        this.draw_image();
    }

    this.init = function() {
        var canvas = document.getElementById(this.canvasid);
        var app = this;
        canvas.onmousemove = function(evt) {
            if (app.curr_tool.mousemove !== undefined)
                app.curr_tool.mousemove(evt.clientX - this.offsetLeft, evt.clientY - this.offsetTop);
            app.last_mouse_pos[0] = evt.clientX;
            app.last_mouse_pos[1] = evt.clientY;
            app.refreshmousemoveinfo();
            return;
        }

        canvas.onmousedown = function(evt) {
            if (app.curr_tool.mousedown !== undefined)
                app.curr_tool.mousedown(evt.clientX - this.offsetLeft, evt.clientY - this.offsetTop);
            app.mouse_down = true;
        }

        canvas.onmouseup = function(evt) {
            if (app.curr_tool.mouseup !== undefined)
                app.curr_tool.mouseup(evt.clientX - this.offsetLeft, evt.clientY - this.offsetTop);
            app.mouse_down = false;
        }

        canvas.onmouseout = function(evt) {
            app.mouse_down = false;
        }

        canvas.onclick = function(evt) {
            if (app.curr_tool.click !== undefined)
                app.curr_tool.click(evt.clientX - this.offsetLeft, evt.clientY - this.offsetTop);
        }
    }
}
