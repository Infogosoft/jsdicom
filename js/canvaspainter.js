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
function CanvasPainter(canvasid) {
    this.canvas = document.getElementById(canvasid);
    this.tempcanvas = document.createElement("canvas");
    this.ww;
    this.wl;
    this.file;
    this.scale = 1;
    this.pan = [0,0];
}

CanvasPainter.prototype.set_file = function(file) {
    this.file = file;
}

CanvasPainter.prototype.set_cluts = function(clut_r, clut_g, clut_b) {
    this.clut_r = clut_r;
    this.clut_g = clut_g;
    this.clut_b = clut_b;
}

CanvasPainter.prototype.set_windowing = function(wl, ww) {
    this.ww = ww;
    this.wl = wl;
}

CanvasPainter.prototype.reset_windowing = function() {
    this.ww = 200;
    this.wl = 40;
}

CanvasPainter.prototype.set_scale = function(scale) {
    this.scale = scale;
    this.draw_image();
}

CanvasPainter.prototype.get_scale = function(scale) {
    return this.scale;
}

CanvasPainter.prototype.reset_scale = function(scale) {
    this.scale = 1.0;
}

CanvasPainter.prototype.get_windowing = function() {
    return [this.wl, this.ww];
}

CanvasPainter.prototype.set_pan = function(panx, pany) {
    this.pan[0] = panx;
    this.pan[1] = pany;
    this.draw_image();
}

CanvasPainter.prototype.get_pan = function() {
    return this.pan;
}

CanvasPainter.prototype.reset_pan = function() {
    this.pan[0] = 0.0;
    this.pan[1] = 0.0;
}

CanvasPainter.prototype.pan_unit = function() {
    return 1;
}

CanvasPainter.prototype.init = function() {
}

CanvasPainter.prototype.onresize = function() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.draw_image();
}

CanvasPainter.prototype.unproject = function(canvas_pos) {
    var canvas_scale = this.canvas.height/this.file.Rows;
    var targetWidth = this.file.Rows*this.scale*canvas_scale;
    var targetHeight = this.file.Columns*this.scale*canvas_scale;
    var xoffset = (this.canvas.width-targetWidth)/2+this.pan[0];
    var yoffset = (this.canvas.height-targetHeight)/2+this.pan[1];
    var imagepos = [0,0];
    var xscale = this.file.Columns/targetWidth;
    var yscale = this.file.Rows/targetHeight;
    imagepos[0] = Math.round((canvas_pos[0]-xoffset)*xscale);
    imagepos[1] = Math.round((canvas_pos[1]-yoffset)*yscale);//*(this.canvas.height/targetHeight);
    return imagepos;
}

CanvasPainter.prototype.image_coords_to_row_column = function(pt) {
    return [pt[0], pt[1]];
}

CanvasPainter.prototype.draw_image = function() {
    if(this.file == undefined)
        return;
    var ctx = this.canvas.getContext("2d");
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.tempcanvas.width = this.file.Rows;
    this.tempcanvas.height = this.file.Columns;
    var tempctx = this.tempcanvas.getContext("2d");

    var imageData = tempctx.createImageData(this.file.Columns, this.file.Rows);
    
    var lower_bound = this.wl - this.ww/2.0;
    var upper_bound = this.wl + this.ww/2.0;
    for(var row=0;row<this.file.Rows;++row) {
        for(var col=0;col<this.file.Columns;++col) {
            var data_idx = (col + row*this.file.Columns);
            var intensity = this.file.PixelData[data_idx];
            intensity = intensity * this.file.RescaleSlope + this.file.RescaleIntercept;
            var intensity = (intensity - lower_bound)/(upper_bound - lower_bound);
            if(intensity < 0.0)
                intensity = 0.0;
            if(intensity > 1.0)
                intensity = 1.0;

            intensity *= 255.0;

            var canvas_idx = (col + row*this.file.Columns)*4;
            var rounded_intensity = Math.round(intensity);
            imageData.data[canvas_idx] = this.clut_r[rounded_intensity];
            imageData.data[canvas_idx+1] = this.clut_g[rounded_intensity];
            imageData.data[canvas_idx+2] = this.clut_b[rounded_intensity];
            imageData.data[canvas_idx+3] = 0xFF;
        }
    }
    tempctx.putImageData(imageData, 0, 0);

    var canvas_scale = this.canvas.height/this.file.Rows;
    var targetWidth = this.file.Rows*this.scale*canvas_scale;
    var targetHeight = this.file.Columns*this.scale*canvas_scale;
    var xoffset = (this.canvas.width-targetWidth)/2;
    var yoffset = (this.canvas.height-targetHeight)/2;
    ctx.drawImage(this.tempcanvas, xoffset+this.pan[0], yoffset+this.pan[1], targetWidth, targetHeight);
}

CanvasPainter.prototype.canvas_scale = function() {
    return this.canvas.height/this.file.Rows;
}

CanvasPainter.prototype.target_height = function(canvas_scale) {
    return this.file.Columns*this.scale*canvas_scale;
}

CanvasPainter.prototype.target_width = function(canvas_scale) {
    return this.file.Columns*this.scale*canvas_scale;
}
