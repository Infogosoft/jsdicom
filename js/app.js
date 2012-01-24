
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
        fill_serie_selection(this.series, this.curr_serie_uid);
        this.set_serie(this.curr_serie_uid);
    }

    this.set_serie = function(series_uid) {
        this.files = this.series[series_uid].files;
        if(this.files[0].get_element(0x00281050) !== 0) {
            app.wl = this.files[0].get_element(0x00281050).get_value();
            app.ww = this.files[0].get_element(0x00281051).get_value(); 
            if(app.wl.constructor == Array) {
                app.update_window_preset_list(app.wl, app.ww);
                app.wl = app.wl[0];
            }
            if(app.ww.constructor == Array) {
                app.ww = app.ww[0];
            }
        } else {
            // TODO: Set to some default based on modality?
        }
        this.curr_file_idx = 0;
        this.clear_image();
        this.draw_image();
    }

    this.clear_image = function() {
        var canvas = document.getElementById(this.canvasid);
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 512, 512);

    }
    this.draw_image = function() {
        var curr_file = this.files[this.curr_file_idx];
        if(curr_file == undefined)
            return;
        var temp_canvas = document.getElementById("secondary_canvas");
        //var temp_canvas = document.getElementById(this.canvasid);
        temp_canvas.width = curr_file.rows;
        temp_canvas.height = curr_file.rows;
        var c = temp_canvas.getContext("2d");
        draw_to_canvas(curr_file, c, app.ww, app.wl, this.curr_clut_r, 
                                                     this.curr_clut_g,
                                                     this.curr_clut_b);
        
        // Call current tool for post draw operations
        this.curr_tool.postdraw(c);
        this.refreshmousemoveinfo();
        var canvas = document.getElementById(this.canvasid);
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, curr_file.rows, curr_file.rows);
        var scaled_width = curr_file.rows*this.scale_factor;
        var scaled_height = curr_file.columns*this.scale_factor;
        var offset_x = (curr_file.rows-scaled_width-this.pan[0])/2;
        var offset_y = (curr_file.columns-scaled_height-this.pan[1])/2;
        ctx.drawImage(temp_canvas, offset_x, offset_y, scaled_width, scaled_height);
        //ctx.drawImage(temp_canvas, 0, 0, 512, 512);
        ctx.strokeStyle = 'white';
        ctx.strokeText("WL: " + this.wl, 5, 20);
        ctx.strokeText("WW: " + this.ww, 5, 40);
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

    this.activate_zooming = function() { 
        this.curr_tool = new ScaleTool(this);
        this.curr_tool.set_file(this.files[this.curr_file_idx]);
    }

    this.activate_panning = function() { 
        this.curr_tool = new PanTool(this);
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
