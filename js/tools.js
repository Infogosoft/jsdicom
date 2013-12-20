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
// All tools may implement any of the following functions
// mousedown(x, y)
// mouseup(x, y)
// mousemove(x, y)
// mouseclick(x, y)
// draw(canvas)
// set_file(file)

// @XXX: Mesarument of a line
// @TODO: sync to scale and pan not yet implemented
// -> so correct measuring only on scale = 1 and a valid PixelSpacing Tag.
function MeasureTool(app) {
    this.in_motion = false;
    this.app = app;
    this.file;
    this.startX;
    this.startY;
    this.currX;
    this.currY;
		this.canvas;

		this.deactivate = function()
		{

		}

    this.click = function(canvas_pos, image_pos)
		{
			x = canvas_pos[0]; y = canvas_pos[1];
			if(this.canvas === undefined)
			{
				 this.canvas = this.app.macanvas;
			}
			if(this.in_motion)
			{
				this.in_motion = false;
			}
			else
			{
				this.app.mlength = 0;
				this.app.angle = 0;
				this.startX = x;
				this.startY = y;
				this.in_motion = true;
			}
    }

    this.mousemove = function(canvas_pos, image_pos)
		{
			x = canvas_pos[0]; y = canvas_pos[1];
			if(this.in_motion)
			{
				this.canvas.width = this.canvas.width;
				this.currX = x;
				this.currY = y;
				this.draw();
				lx = this.currX - this.startX;
				ly = this.currY - this.startY;
				this.app.mlength = this.measure_length(lx, ly);
				this.app.mline = [this.startX, this.startY, this.currX, this.currY];
			}
    }

    this.draw = function()
		{
			// Draw line
			if (this.in_motion === true)
			{
				ctx = this.canvas.getContext('2d');
				ctx.beginPath();
				ctx.moveTo(this.startX, this.startY);
				ctx.lineTo(this.currX, this.currY);
				ctx.strokeStyle = 'red'; // red
				ctx.lineWidth   = 1;
				ctx.stroke();
				ctx.closePath();
			}
    }
		this.postdraw = function() {}

		this.measure_length = function(a, b)
		{
			return Math.round
			(
				Math.sqrt
				(
					(a * a * this.app.pixel_spacing[0].trim()) +
					(b * b * this.app.pixel_spacing[1].trim()))* this.app.get_scale()
				);
		}

    this.set_file = function(file) {
        this.file = file;
    }
    return this;
}

function WindowLevelTool(app) {
    this.is_mouse_down = false;
    this.app = app;
    this.last_mouse_pos_x = 0;
    this.last_mouse_pos_y = 0;
		$('#wl_slider').show();

		this.deactivate = function(){ $('#wl_slider').hide(); }

    this.scroll = function(detail) {
        this.app.set_slice_idx(this.app.get_slice_idx() + detail);
    }
    this.mousedown = function(canvas_pos, image_pos) {
        this.is_mouse_down = true;
    }

    this.mouseup = function(canvas_pos, image_pos) {
        this.is_mouse_down = false;
    }

    this.mousemove = function(canvas_pos, image_pos) {
        x = canvas_pos[0]; y = canvas_pos[1];
        if(this.is_mouse_down) {
            var curr_windowing = this.app.get_windowing();
            var xdiff = x - this.last_mouse_pos_x;
            var ydiff = y - this.last_mouse_pos_y
            app.set_windowing(curr_windowing[0] + xdiff, Math.max(curr_windowing[1] + ydiff, 0));
            app.draw_image();
        }
        this.last_mouse_pos_x = x;
        this.last_mouse_pos_y = y;
    }

    this.postdraw = function(canvas) {
    }

    this.click = function(canvas_pos, image_pos) {
    }

    this.set_file = function(file) {
    }
    return this;
}

function ZoomPanTool(app) {
    this.is_mouse_down = false;
    this.app = app;
    this.last_mouse_pos_x = 0;
    this.last_mouse_pos_y = 0;
		$('#z').show();

		this.deactivate = function(){ $('#z').hide(); }
    this.scroll = function(detail) {
        this.app.set_scale(this.app.get_scale() + detail/100.0);
    }

    this.mousedown = function(canvas_pos, image_pos) {
        this.is_mouse_down = true;
        var file = app.files[app.curr_file_idx];
        this.mouse_down_pos = canvas_pos;
        this.orig_pan = [0,0];
        var op = app.get_pan();
        this.orig_pan[0] = op[0];
        this.orig_pan[1] = op[1];
        // TODO: this should be the painter's (or perhaps the app's) responsibility
        this.pixel_size = app.painter.pan_unit();
    }

    this.mouseup = function(canvas_pos, image_pos) {
        this.is_mouse_down = false;
    }

    this.mousemove = function(canvas_pos, image_pos) {
        if(this.is_mouse_down) {
            var xdiff = (this.mouse_down_pos[0] - canvas_pos[0]);
            var ydiff = (this.mouse_down_pos[1] - canvas_pos[1]);
            var pan = [0,0];
            pan[0] += xdiff * this.pixel_size;
            pan[1] += ydiff * this.pixel_size;
            app.set_pan(this.orig_pan[0] - pan[0], this.orig_pan[1] - pan[1]);
        }
    }

    this.postdraw = function(canvas) {
    }

    this.click = function(canvas_pos, image_pos) {
    }

    this.set_file = function(file) {
    }
    return this;
}

// @XXX: AngleTool calculates the angle between two connected lines
// Usage: click three times on the canvas in order to connect two lines
function AngleTool(app) {
    this.in_motion = false;
    this.app = app;
    this.file;
		this.canvas;
    this.startX;
    this.startY;
		this.startX2;
		this.startY2;
    this.currX;
    this.currY;
		this.lines;

    this.click = function(canvas_pos, image_pos) {
			x = canvas_pos[0]; y = canvas_pos[1];
			if(this.canvas === undefined)
			{
				 this.canvas = this.app.macanvas;
			}
			if(this.in_motion)
			{
				// Add line drawing obj to file
				if(this.lines === undefined)
				{
					this.lines = [];
				}
				if (this.lines.length == 0) {
					this.lines.push([this.startX, this.startY, this.currX, this.currY]);
				}
				else
				{
					l = this.lines[this.lines.length-1];
					this.lines.push([l[2], l[3], this.currX, this.currY]);
				}
				if (this.lines.length > 1)
				{
					this.app.angle = this.degreeAngle
					(
						this.lines[0][0], this.lines[0][1],
						this.lines[0][2], this.lines[0][3],
						this.lines[1][2], this.lines[1][3]
					);
					this.endingArrow
					(
						this.lines[0][2], this.lines[0][3],
						this.lines[1][2], this.lines[1][3]
					);
					this.lines = [];
					this.in_motion = false;
				}
			}
			else
			{
				if (this.lines === undefined || this.lines.length == 0)
				{
					this.startX = x;
					this.startY = y;
					this.app.angle = 0;
					this.app.mlength = 0;
				}
				else
				{
					this.startX2 = x;
					this.startY2 = y;
				}
				this.in_motion = true;
			}
    }

    this.mousemove = function(canvas_pos, image_pos)
		{
        x = canvas_pos[0]; y = canvas_pos[1];
				if(this.in_motion)
				{
					this.canvas.width = this.canvas.width;
					this.currX = x;
					this.currY = y;
					if (this.lines === undefined || this.lines.length == 0)
					{
						this.draw([this.startX, this.startY, this.currX, this.currY]);
					}
					else
					{
						this.draw(this.lines[0]);
						this.draw([this.lines[0][2], this.lines[0][3], this.currX, this.currY]);
					}
				}
    }

    this.draw = function(l)
		{
			// Draw line
			if (this.in_motion === true)
			{
				ctx = this.canvas.getContext('2d');
				ctx.beginPath();
				ctx.moveTo(l[0], l[1]);
				ctx.lineTo(l[2], l[3]);
				ctx.strokeStyle = 'red'; // red
				ctx.lineWidth   = 1;
				ctx.stroke();
				ctx.closePath();
			}
    }

    this.postdraw = function(canvas){}

		this.degreeAngle = function(x1, y1, x2, y2, x3, y3)
		{
				var theta1 = Math.atan2((y1 - y2), (x1 - x2));
				var theta2 = Math.atan2((y3 - y2), (x3 - x2));
				return Math.abs((((theta2 - theta1) * 180 / Math.PI).toFixed(2)));
		}

		this.endingArrow = function(x, y, xx, yy, canvas) {
				var endRadians = Math.atan((yy - y) / (xx - x));
				endRadians += ((xx > x) ? 90 : -90) * Math.PI / 180;
				ctx = this.canvas.getContext('2d');
				ctx.save();
				ctx.fillStyle = 'red'; // red
				ctx.beginPath();
				ctx.translate(xx, yy);
				ctx.rotate(endRadians);
				ctx.moveTo(0, 0);
				ctx.lineTo(8, 20);
				ctx.lineTo(-8, 20);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
		}

    this.set_file = function(file) {
        this.file = file;
    }
    return this;
}

function BrightnessContrastTool(app) {
    this.is_mouse_down = false;
    this.app = app;
    this.last_mouse_pos_x = 0;
    this.last_mouse_pos_y = 0;
		$('#bc_slider').show();

		this.deactivate = function(){ $('#bc_slider').hide(); }

    this.scroll = function(detail) {

    }
    this.mousedown = function(canvas_pos, image_pos) {
        this.is_mouse_down = true;
    }

    this.mouseup = function(canvas_pos, image_pos) {
        this.is_mouse_down = false;
    }

    this.mousemove = function(canvas_pos, image_pos) {
        x = canvas_pos[0]; y = canvas_pos[1];
        if(this.is_mouse_down) {

        }
        this.last_mouse_pos_x = x;
        this.last_mouse_pos_y = y;
    }

    this.postdraw = function(canvas) {
    }

    this.click = function(canvas_pos, image_pos) {
    }

    this.set_file = function(file) {
    }
    return this;
}

// @XXX: 3x3 convulution Kernel Filter for a gaussian blur
// Tool is not used - turning filter on and off is handled inside the app
function BlurTool(app) {
    this.is_mouse_down = false;
    this.app = app;
    this.blured = false;


		this.deactivate = function()
		{

		}

    this.scroll = function(detail) {

    }

    this.mousedown = function(canvas_pos, image_pos) {
        this.is_mouse_down = true;
    }

    this.mouseup = function(canvas_pos, image_pos) {
        this.is_mouse_down = false;
    }

    this.mousemove = function(canvas_pos, image_pos) {

    }

    this.postdraw = function(canvas) {
    }

    this.click = function(canvas_pos, image_pos) {

    }

    this.set_file = function(file) {
    }
    return this;
}

// @XXX: 3x3 convulution Kernel Filter for sharpening
// Tool is not used - turning filter on and off is handled inside the app
function SharpenTool(app) {
    this.is_mouse_down = false;
    this.app = app;
    this.sharpen = false;


		this.deactivate = function()
		{

		}

    this.scroll = function(detail) {

    }

    this.mousedown = function(canvas_pos, image_pos) {
        this.is_mouse_down = true;
    }

    this.mouseup = function(canvas_pos, image_pos) {
        this.is_mouse_down = false;
    }

    this.mousemove = function(canvas_pos, image_pos) {

    }

    this.postdraw = function(canvas) {
    }

    this.click = function(canvas_pos, image_pos) {

    }

    this.set_file = function(file) {
    }
    return this;
}

// @XXX: new tools added
tools = {
    'Window Level': WindowLevelTool,
		'Brigthness/Contrast': BrightnessContrastTool,
		'Blur': BlurTool,
		'Sharpen': SharpenTool,
    'Zoom/Pan': ZoomPanTool,
		'Measure': MeasureTool,
		'Angle': AngleTool,
}
