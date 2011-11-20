
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

    this.buffer;

    this.pixel_data;
    this.rows;
    this.cols;
    this.ww = 1000;
    this.wl = 500;
    this.rescaleSlope;
    this.rescaleIntercept;

    this.last_mouse_pos = [-1,-1];
    this.mouse_down = false;

    this.files = []
    this.curr_file_idx = 0;

    this.load_files = function(evt)
    {
        var app = this;
        this.curr_file_idx = 0;
        this.files = Array(evt.target.files.length);
        for(var i=0;i<evt.target.files.length;++i) {
            this.load_file(evt.target.files[i], i);
        }
        $("#slider").slider({
            value: 0,
            max: this.files.length,
            slide: function(ui, event) {
                app.curr_file_idx = $(this).slider('value');
                app.draw_image();
            }
        });
    }

    this.load_file = function(file, index) {
        var reader = new FileReader();

        // Closure to bind app, 'this' will be reader
        reader.onload = (function(app) {
            return function(evt) {
                app.buffer = new Uint8Array(evt.target.result);
                parser = new DicomParser(app.buffer);
                var file = parser.parse_file();

                var pn = element_to_string(file.get_element(0x00100010));
                file.pixel_data = file.get_element(0x7fe00010).data;
                file.width = element_to_integer(file.get_element(0x00280010));
                file.height = element_to_integer(file.get_element(0x00280011));
                
                file.rescaleSlope = element_to_integer(file.get_element(0x00281051));
                file.rescaleIntercept = element_to_integer(file.get_element(0x00281052));
                app.files[index] = file;
                console.log("file " + index + " loaded");
                if(index == 0) {
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
        var imageData = c.createImageData(512, 512);
        for(var x=0;x<512;++x) {
            for(var y=0;y<512;++y) {
                data_idx = (x + y*512)*2;
                var intensity = curr_file.pixel_data[data_idx+1]*256.0 + curr_file.pixel_data[data_idx];
                intensity += curr_file.rescaleIntercept;
                var lower_bound = app.wl - app.ww/2.0;
                var upper_bound = app.wl + app.ww/2.0;
                var intensity = (intensity - lower_bound)/upper_bound;
                if(intensity < 0)
                    intensity = 0x00;
                if(intensity > 100)
                    intensity = 0xFF;
                intensity *= 255;

                // intensity = intensity/0xFF;
                var canvas_idx = (x + y*512)*4;
                imageData.data[canvas_idx] = intensity;
                imageData.data[canvas_idx+1] = intensity;
                imageData.data[canvas_idx+2] = intensity;
                imageData.data[canvas_idx+3] = 0xFF;
            }
        }
        c.putImageData(imageData, 0, 0);
        c.strokeStyle = 'white';
        c.strokeText("WL: " + this.wl, 5, 20);
        c.strokeText("WW: " + this.ww, 5, 40);
    }

    this.init = function() {
        var canvas = document.getElementById(this.canvasid);
        canvas.onmousemove = (function(app) {
            return function(evt) {
                if(app.mouse_down) {
                    app.ww += evt.clientX - app.last_mouse_pos[0];
                    app.wl += evt.clientY - app.last_mouse_pos[1];
                    app.ww = Math.max(2, app.ww);
                    app.draw_image();
                }
                app.last_mouse_pos[0] = evt.clientX;
                app.last_mouse_pos[1] = evt.clientY;
            }
        })(this);

        canvas.onmousedown = (function(app) {
            return function(evt) {
                app.mouse_down = true;
            }
        })(this);

        canvas.onmouseup = (function(app) {
            return function(evt) {
                app.mouse_down = false;
            }
        })(this);
        canvas.onmouseout = (function(app) {
            return function(evt) {
                app.mouse_down = false;
            }
        })(this);
        document.onkeydown = (function(app) {
            return function(evt) {
                //console.log(ect
            }
        })(this);
        canvas.addEventListener('DOMMouseScroll', 
                                (function(app) { 
                                    return function(evt) { 
                                        if(app.files.length == 0)
                                            return;
                                        if(app.curr_file_idx + evt.detail < app.files.length &&
                                           app.curr_file_idx + evt.detail > 0) 
                                        {
                                            app.curr_file_idx += evt.detail;
                                            console.log(app.curr_file_idx);
                                            app.draw_image();
                                           //app.load_file(app.files[app.curr_file_idx]);
                                        }
                                    }
                                 })(this), 
                                false);
    }
}
