
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

    this.last_mouse_pos = [-1,-1];
    this.mouse_down = false;

    this.series = {};
    this.curr_series_uid = "";
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
                file.modality = file.get_element(dcmdict["Modality"]).get_value();
                
                var pn = file.get_element(dcmdict["PatientsName"]).get_value();
                if (file.modality == "CT" || file.modality == "PT" || file.modality == "MR") {
                    file.pixel_data = file.get_element(dcmdict["PixelData"]).get_value();
                    file.rows = file.get_element(dcmdict["Rows"]).get_value();
                    file.columns = file.get_element(dcmdict["Columns"]).get_value();
                    file.imagePosition = file.get_element(dcmdict["ImagePositionPatient"]).get_value();
                    imageOrientation = file.get_element(dcmdict["ImageOrientationPatient"]).get_value();
                    file.imageOrientationRow = imageOrientation.slice(0,3);
                    file.imageOrientationColumn = imageOrientation.slice(3,6);
                    
                    file.rescaleIntercept = file.get_element(dcmdict["RescaleIntercept"]).get_value();
                    file.rescaleSlope = file.get_element(dcmdict["RescaleSlope"]).get_value();
                    //app.files[index] = file;
                    app.organize_file(file);
                    if(index == 0) {
                        app.curr_series_uid = file.get_element(dcmdict["SeriesInstanceUID"]).get_value();
                        app.files = app.series[app.curr_series_uid].files;
                        app.draw_image();
                    }
                } else if(file.modality == "US") {
                    file.rows = file.get_element(dcmdict["Rows"]).get_value();
                    file.columns = file.get_element(dcmdict["Columns"]).get_value();
                    file.bits_stored = file.get_element(dcmdict["Columns"]).get_value();
                    //file.get_element(dcmdict["PixelData"]).vr = "OB"; 
                    file.pixel_data = file.get_element(dcmdict["PixelData"]).get_value();
                    file.photometric_representation = file.get_element(dcmdict["PhotometricInterpretation"]).get_value();
                    file.rescaleIntercept = 0;
                    file.rescaleSlope = 1;
                    app.files[index] = file;

                    app.organize_file(file);
                    if(index == 0) {
                        app.curr_series_uid = file.get_element(dcmdict["SeriesInstanceUID"]).get_value();
                        app.files = app.series[app.curr_series_uid].files;
                        app.draw_image();
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
        var series_uid = file.get_element(dcmdict["SeriesInstanceUID"]).get_value();
        var series_desc = file.get_element(dcmdict["SeriesDescription"]).get_value();
        if(!this.series.hasOwnProperty(series_uid)) {
            var series = new DcmSeries();
            series.seriesUID = series_uid;
            series.seriesDescription = series_desc;
            this.series[series_uid] = series;
        }
        this.series[series_uid].files.push(file);
    }


    this.setup_series_selection = function() {
        fill_series_selection(this.series, this.curr_series_uid, function() { return new GLPainter(); });
        this.set_series(this.curr_series_uid);
    }

    this.set_series = function(series_uid) {
        this.files = this.series[series_uid].files;
        if(this.files[0].get_element(dcmdict["WindowCenter"]) !== 0) {
            app.wl = this.files[0].get_element(dcmdict["WindowCenter"]).get_value();
            app.ww = this.files[0].get_element(dcmdict["WindowWidth"]).get_value(); 
            if(app.wl.constructor == Array) {
                app.update_window_preset_list(app.wl, app.ww);
                app.wl = app.wl[0];
            }
            if(app.ww.constructor == Array) {
                app.ww = app.ww[0];
            }
        } else if(this.files[0].get_element(dcmdict["RescaleSlope"]) !== 0) {
            // TODO check the actual datatype instead of using 65536...
            maxval = this.files[0].get_element(dcmdict["RescaleSlope"]).get_value() * 65536 +
                this.files[0].get_element(dcmdict["RescaleIntercept"]).get_value();
            minval = this.files[0].get_element(dcmdict["RescaleIntercept"]).get_value();
            app.ww = maxval-minval;
            app.wl = (maxval+minval)/2;
        } else {
            app.ww = 65536.0;
            app.wl = 32768.0;
        }
        this.curr_file_idx = 0;
        this.clear_image();
        this.set_windowing(app.ww, app.wl);
        this.draw_image();
    }

    this.set_pan = function(panx, pany) {
        this.painter.set_pan(panx, pany);
    }
    this.get_pan = function(pan) {
        return this.painter.get_pan();
    }
    this.set_scale = function(scale) {
        this.painter.set_scale(scale);
    }
    this.get_scale = function(scale) {
        return this.painter.get_scale();
    }
    this.set_windowing = function(ww, wl) {
        return this.painter.set_windowing(ww, wl);
    }
    this.get_windowing = function() {
        return this.painter.get_windowing();
    }
    this.set_slice_idx = function(idx) {
        if(idx < 0 || idx > this.files.length - 1)
            return;
        this.curr_file_idx = idx;
        this.draw_image();

    }
    this.get_slice_idx = function() {
        return this.curr_file_idx;
    }

    this.clear_image = function() {
        //var canvas = document.getElementById(this.canvasid);
        //var ctx = canvas.getContext('2d');
        //ctx.clearRect(0, 0, 512, 512);

    }
    this.draw_image = function() {
        var curr_file = this.files[this.curr_file_idx];
        if(curr_file == undefined)
            return;
        this.painter.set_file(curr_file);
        this.painter.set_cluts(this.curr_clut_r, this.curr_clut_g, this.curr_clut_b);
        this.painter.draw_image();
    }


    this.fill_metadata_table = function() {
        if(this.files.length == 0)
            return;
        fill_metadata_table(this.files[this.curr_file_idx]);
    }

    this.activate_measure_tool = function() { 
        this.curr_tool = new MeasureTool(this);
        this.curr_tool.set_file(this.files[this.curr_file_idx]);
    }

    this.activate_window_level_tool = function() { 
        this.curr_tool = new WindowLevelTool(this);
        this.curr_tool.set_file(this.files[this.curr_file_idx]);
    }

    this.activate_zoom_pan = function() { 
        this.curr_tool = new ZoomPanTool(this);
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
            case "Plain":
                this.curr_clut_r = plain_red;
                this.curr_clut_g = plain_green;
                this.curr_clut_b = plain_blue;
                break;
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
        this.painter = new GLPainter();
        //this.painter = new CanvasPainter();
        this.painter.init(this.canvasid);
        canvas.onmousemove = function(evt) {
            if (app.curr_tool.mousemove !== undefined)
                app.curr_tool.mousemove(evt.clientX - this.offsetLeft, evt.clientY - this.offsetTop);
            app.last_mouse_pos[0] = evt.clientX;
            app.last_mouse_pos[1] = evt.clientY;
            //app.refreshmousemoveinfo();
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
        canvas.addEventListener('DOMMouseScroll', function(evt) {
            if (app.curr_tool.scroll !== undefined)
                app.curr_tool.scroll(evt.detail);
            return false;

        }, false);
    }
}
