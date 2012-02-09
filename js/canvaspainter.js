function CanvasPainter() {
    this.canvas;
    this.ww;
    this.wl;
    this.file;
    this.r_clut;
    this.g_clut;
    this.b_clut;
}

CanvasPainter.prototype.is_supported = function() {
    return window.CanvasRenderingContext;
}

CanvasPainter.prototype.set_file = function(file) {
    this.file = file;
}

CanvasPainter.prototype.set_cluts = function(r_clut, g_clut, b_clut) {
    this.r_clut = r_clut;
    this.g_clut = g_clut;
    this.b_clut = b_clut;
}

CanvasPainter.prototype.set_windowing = function(ww, wl) {
    this.ww = ww;
    this.wl = wl;
}

CanvasPainter.prototype.set_scale = function(scale) {
    this.scale = scale;
}
CanvasPainter.prototype.get_scale = function(scale) {
    return this.scale;
}

CanvasPainter.prototype.get_windowing = function() {
    return [this.ww, this.wl];
}

CanvasPainter.prototype.init = function(canvasid) {
    this.canvas = document.getElementById(canvasid);
}

CanvasPainter.prototype.draw_image = function() {
    this.canvas.width = this.file.rows;
    this.canvas.height = this.file.rows;
    var ctx = this.canvas.getContext("2d");

    var imageData = ctx.createImageData(this.file.columns, this.file.rows);
    
    var lower_bound = this.wl - this.ww/2.0;
    var upper_bound = this.wl + this.ww/2.0;
    for(var row=0;row<this.file.rows;++row) {
        for(var col=0;col<this.file.columns;++col) {
            var data_idx = (col + row*this.file.columns);
            var intensity = this.file.pixel_data[data_idx];
            intensity = intensity * this.file.rescaleSlope + this.file.rescaleIntercept;
            var intensity = (intensity - lower_bound)/(upper_bound - lower_bound);
            if(intensity < 0.0)
                intensity = 0.0;
            if(intensity > 1.0)
                intensity = 1.0;

            intensity *= 255.0;

            var canvas_idx = (col + row*this.file.columns)*4;
            var rounded_intensity = Math.round(intensity);
            imageData.data[canvas_idx] = this.r_clut[rounded_intensity];
            imageData.data[canvas_idx+1] = this.b_clut[rounded_intensity];
            imageData.data[canvas_idx+2] = this.g_clut[rounded_intensity];
            imageData.data[canvas_idx+3] = 0xFF;
        }
    }
    ctx.putImageData(imageData, 0, 0);
        
    // Call current tool for post draw operations
    //this.curr_tool.postdraw(ctx);
    //this.refreshmousemoveinfo();
    //var canvas = document.getElementById(this.canvasid);
    //var ctx = canvas.getContext('2d');
    //ctx.clearRect(0, 0, this.file.rows, this.file.rows);
    //var scaled_width = this.file.rows*this.scale_factor;
    //var scaled_height = this.file.columns*this.scale_factor;
    //var offset_x = (this.file.rows-scaled_width-this.pan[0])/2;
    //var offset_y = (this.file.columns-scaled_height-this.pan[1])/2;
    //ctx.drawImage(this.canvas, offset_x, offset_y, scaled_width, scaled_height);
    //ctx.drawImage(this.canvas, 0, 0, 512, 512);
    ctx.strokeStyle = 'white';
    ctx.strokeText("WL: " + this.wl, 5, 20);
    ctx.strokeText("WW: " + this.ww, 5, 40);
}
