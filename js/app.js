
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

    this.rows;
    this.cols;
    this.ww = 1000;
    this.wl = 500;

    this.last_mouse_pos = [-1,-1];
    this.mouse_down = false;

    this.files = []
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
        this.files = Array(files.length);
        for(var i=0;i<files.length;++i) {
            this.load_file(files[i], i);
        }
        $("#slider").slider({
            value: 0,
            max: this.files.length,
            slide: function(ui, event) {
                app.curr_file_idx = $(this).slider('value');
                app.curr_tool.set_file(app.files[app.curr_file_idx]);
                app.draw_image();
            }
        });
    }

    this.load_file = function(file, index) {
        var reader = new FileReader();

        // Closure to bind app, 'this' will be reader
        reader.onload = (function(app) {
            return function(evt) {
                var buffer = new Uint8Array(evt.target.result);
                parser = new DicomParser(buffer);
                var file = parser.parse_file();

                var pn = file.get_element(0x00100010).get_value()
                file.pixel_data = file.get_element(0x7fe00010).data;
                file.rows = file.get_element(0x00280010).get_value();
                file.columns = file.get_element(0x00280011).get_value();
                file.imagePosition = file.get_element(0x00200032).get_value();
                imageOrientation = file.get_element(0x00200037).get_value();
                file.imageOrientationRow = imageOrientation.slice(0,3);
                file.imageOrientationColumn = imageOrientation.slice(3,6);
                
                file.rescaleIntercept = file.get_element(0x00281052).get_value();
                file.rescaleSlope = file.get_element(0x00281053).get_value();
                app.files[index] = file;
                if(index == 0) {
                    app.wl = file.get_element(0x00281050).get_value()[0];
                    app.ww = file.get_element(0x00281051).get_value()[0]; 
                    if(app.wl.constructor == Array)
                        app.wl = app.wl[0];
                    if(app.ww.constructor == Array)
                        app.ww = app.ww[0];

                    app.draw_image();
                }
            }
        })(this);
        reader.readAsArrayBuffer(file);
    }

    this.draw_image = function() {
        var curr_file = this.files[this.curr_file_idx];
        if(curr_file == undefined)
            return;
        var element = document.getElementById(this.canvasid);
        var c = element.getContext("2d");
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
                //imageData.data[canvas_idx] = intensity;
                //imageData.data[canvas_idx+1] = intensity;
                //imageData.data[canvas_idx+2] = intensity;
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

    this.mousemoveinfo = function(row, col) {
        if (this.files.length <= this.curr_file_idx) {
            $("#density").html("");
            return;
        }
        var curr_file = this.files[this.curr_file_idx];
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
