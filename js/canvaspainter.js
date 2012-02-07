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
CanvasPainter.prototype.init = function(canvasid) {
    this.canvas = document.getElementById(canvasid);
}

CanvasPainter.prototype.draw_image = function() {
    this.canvas.width = this.file.rows;
    this.canvas.height = this.file.rows;
    var ctx = this.canvas.getContext("2d");
    draw_to_canvas(this.file, ctx, app.ww, app.wl, this.r_clut, 
                                                 this.g_clut,
                                                 this.b_clut);
        
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
