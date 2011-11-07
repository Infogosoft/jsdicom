
function log(s)
{
    var logEntry = $("<li>").html(s);
    $("#loglist").append(logEntry);
}

function DcmApp(canvasid) {

    this.canvasid = canvasid;

    this.buffer;

    this.pixel_data;
    this.rows;
    this.cols;
    this.ww;
    this.wl;
    this.rescaleSlope;
    this.rescaleIntercept;

    this.last_mouse_pos = [-1,-1];
    this.mouse_down = false;


    this.load_file = function(evt) 
    {
        console.log(this);
        var file = evt.target.files[0];
        var reader = new FileReader();

        // Closure to bind app
        reader.onload = (function(app) {
            return function(evt) {
                app.buffer = new Uint8Array(evt.target.result);
                parser = new DicomParser(app.buffer);
                var file = parser.parse_file();

                var pn = element_to_string(file.get_element(0x00100010));
                log("Patients name: "+pn);
                app.pixel_data = file.get_element(0x7fe00010).data;
                app.width = element_to_integer(file.get_element(0x00280010));
                app.height = element_to_integer(file.get_element(0x00280011));
                
                app.rescaleSlope = element_to_integer(file.get_element(0x00281051));
                app.rescaleIntercept = element_to_integer(file.get_element(0x00281052));
                app.wl = 1000;
                app.ww = 500;
                app.draw_image();
            }
        })(this);
        reader.readAsArrayBuffer(file);
    }

    this.draw_image = function() {
        if (this.pixel_data == undefined)
            return;
        var element = document.getElementById(this.canvasid);
        var c = element.getContext("2d");
        var imageData = c.createImageData(this.width, this.height);
        for(var x=0;x<this.width;++x) {
            for(var y=0;y<this.height;++y) {
                data_idx = (x + y*this.width)*2;
                var intensity = this.pixel_data[data_idx+1]*256.0 + this.pixel_data[data_idx];
                var lower_bound = app.wl - app.ww;
                var upper_bound = app.wl + app.ww;
                var intensity = (intensity - lower_bound)/upper_bound;
                if(intensity < 0)
                    intensity = 0x00;
                if(intensity > 100)
                    intensity = 0xFF;
                intensity *= 255;

                // intensity = intensity/0xFF;
                var canvas_idx = (x + y*this.width)*4;
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
        console.log(this);
        var canvas = document.getElementById(this.canvasid);
        canvas.onmousemove = (function(app) {
            return function(evt) {
                if(app.mouse_down) {
                    app.ww += evt.clientX - app.last_mouse_pos[0];
                    app.wl += evt.clientY - app.last_mouse_pos[1];
                }
                app.last_mouse_pos[0] = evt.clientX;
                app.last_mouse_pos[1] = evt.clientY;
                app.draw_image();
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
    }
}
