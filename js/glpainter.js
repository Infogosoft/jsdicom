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
var FRAG_SHADER_8 = 0;
var FRAG_SHADER_16 = 1;
var FRAG_SHADER_RGB_8 = 2;

function ImageSlice(file, texture, rs, ri, alpha) {
    this.file = file;
    this.texture = texture;
    this.rs = rs;
    this.ri = ri;
    this.alpha = alpha;
}

function GLPainter(canvasid) {
    this.canvas = document.getElementById(canvasid);
    this.gl;
    this.shaderProgram;
    this.mvMatrix = mat4.create();
    this.pMatrix = mat4.create();
    this.squareVertexPositionBuffer;
    this.vertexIndexBuffer;
    //this.THE_TEXTURE;
    this.CLUT_TEXTURE;

    this.ww = 200;
    this.wl = 40;
    this.clut_r;
    this.clut_g;
    this.clut_b;
    this.ztrans = -1;
    this.xtrans = 0.0;
    this.ytrans = 0.0;
    this.fovy = 90;
    this.scale = 1;
    this.pan = [0,0];

    this.images = [];
    this.shaderPrograms = {};
    this.clut_bar_enabled = false;
}

GLPainter.prototype.fuse_files = function(file1, file2, alpha) {
    this.images.length = 0;
    this.images.push(new ImageSlice(file1,
                                    this.file_to_texture(file2),
                                    file2.RescaleSlope,
                                    file2.RescaleIntercept,
                                    1.0));
    this.images.push(new ImageSlice(file2,
                                    this.file_to_texture(file1),
                                    file1.RescaleSlope,
                                    file1.RescaleIntercept,
                                    alpha));
    this.rows = file1.Rows;
    this.columns = file1.Columns;
}

GLPainter.prototype.set_file = function(dcmfile) {
    this.images = [new ImageSlice(dcmfile,
                                  this.file_to_texture(dcmfile), 
                                  dcmfile.RescaleSlope, 
                                  dcmfile.RescaleIntercept,
                                  1.0)];
    this.rows = dcmfile.Rows;
    this.columns = dcmfile.Columns;
    //this.THE_TEXTURE = this.file_to_texture(dcmfile);
}

GLPainter.prototype.file_to_texture = function(dcmfile) {
    var internalFormat;
    raw_data = dcmfile.get_element(dcmdict.PixelData).data;
    switch(jQuery.trim(dcmfile.PhotometricInterpretation)) {
    case "MONOCHROME1":
        // TODO: MONOCHROME1 should use inverse cluts.
    case "MONOCHROME2":
        if(dcmfile.BitsStored <= 8) {
            internalFormat = this.gl.LUMINANCE;
        } else {
            internalFormat = this.gl.LUMINANCE_ALPHA;
            if(dcmfile.PixelRepresentation == 0x01) {
                if(!dcmfile.PixelRepresentationPatched) {
                    //var view16bit = new Uint16Array(dcmfile.PixelData.data.buffer, dcmfile.PixelData.data.byteOffset, dcmfile.PixelData.length/2);
                    console.log("Patching");
                    for(var i=0;i<dcmfile.PixelData.length;++i) {
                        dcmfile.PixelData[i] = dcmfile.PixelData[i] ^ 0x8000;
                    }
                    dcmfile.PixelRepresentationPatched = true;
                }
            }
        }
        break;
    case "RGB":
        internalFormat = this.gl.RGB;
        break;
    default:
        alert("Unknown Photometric Interpretation" + dcmfile.PhotometricInterpretation + "!");
        return;
    }

    var texture = this.gl.createTexture(); 
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);  
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D,       // target
                       0,                        // level
                       internalFormat,           // internalformat
                       dcmfile.Columns,          // width
                       dcmfile.Rows,             // height 
                       0,                        // border
                       internalFormat,           // format
                       this.gl.UNSIGNED_BYTE,    // type
                       dcmfile.get_element(dcmdict.PixelData).data);// Get raw Uint8array
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                  
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return texture;
}


GLPainter.prototype.set_scale = function(scale) {
    this.scale = Math.min(Math.max(scale, 0.1), 10.0);
    this.draw_image();
}

GLPainter.prototype.get_scale = function(scale) {
    return this.scale;
}

GLPainter.prototype.reset_scale = function(scale) {
    this.scale = 1.0;
}

GLPainter.prototype.set_pan = function(panx, pany) {
    this.pan[0] = panx;
    this.pan[1] = pany;
    this.draw_image();
}

GLPainter.prototype.get_pan = function() {
    return this.pan;
}

GLPainter.prototype.reset_pan = function() {
    this.pan[0] = 0.0;
    this.pan[1] = 0.0;
}

GLPainter.prototype.reset_windowing = function() {
    this.ww = 200;
    this.wl = 40;
}

GLPainter.prototype.set_cluts = function(clut_r, clut_g, clut_b) {
    this.clut_r = clut_r;
    this.clut_g = clut_g;
    this.clut_b = clut_b;
    if(!this.gl)
        return;

    // Re-pack as rgb
    var rgb_clut = new Uint8Array(256*3);
    for(var i=0;i<256;++i) {
        rgb_clut[i*3] = this.clut_r[i];
        rgb_clut[i*3 + 1] = this.clut_g[i];
        rgb_clut[i*3 + 2] = this.clut_b[i];
    }

    this.CLUT_TEXTURE = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.CLUT_TEXTURE);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D,       // target
                       0,                        // level
                       this.gl.RGB,              // internalformat
                       256,                      // width
                       1,                        // height 
                       0,                        // border
                       this.gl.RGB,             // format
                       this.gl.UNSIGNED_BYTE,    // type
                       rgb_clut);                // data
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

GLPainter.prototype.set_windowing = function(wl, ww) {
    this.wl = wl;
    this.ww = ww;
}
GLPainter.prototype.get_windowing = function() {
    return [this.wl, this.ww];
}

GLPainter.prototype.unproject = function(canvas_pos) {
    var viewportArray = [
        0, 0, this.gl.viewportWidth, this.gl.viewportHeight
    ];
    
    var projectedPoint = [];
    var unprojectedPoint = [];
    
    var flippedmvMatrix = mat4.create();

    mat4.identity(flippedmvMatrix);
    mat4.translate(flippedmvMatrix, [this.pan[0], this.pan[1], -1]);
    mat4.scale(flippedmvMatrix, [this.scale,this.scale,this.scale]);

    // Hack to fit image if height is greater than width
    if(this.canvas.height > this.canvas.width) {
        var canvas_scale = this.canvas.width/this.canvas.height;
        mat4.scale(flippedmvMatrix, [canvas_scale,canvas_scale,canvas_scale]);
    }

    GLU.project(
        0,0,0,
        flippedmvMatrix, this.pMatrix,
        viewportArray, projectedPoint);
    
    var successFar = GLU.unProject(
        canvas_pos[0], canvas_pos[1], projectedPoint[2], //windowPointX, windowPointY, windowPointZ,
        flippedmvMatrix, this.pMatrix,
        viewportArray, unprojectedPoint);

    return unprojectedPoint;
}

GLPainter.prototype.image_coords_to_row_column = function(pt) {
    return [Math.round((pt[0]+1)/2*this.columns), Math.round((pt[1]+1)/2*this.rows)]
}

GLPainter.prototype.unproject_row_column = function(canvas_pos) {
    var unprojectedPoint = this.unproject(canvas_pos);
    return image_coords_to_row_column(unprojectedPoint);;
}

GLPainter.prototype.update_projection_matrix = function() {
    mat4.perspective(this.fovy, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
    mat4.identity(this.mvMatrix);
    mat4.translate(this.mvMatrix, [this.pan[0], -this.pan[1], -1]);
    mat4.scale(this.mvMatrix, [this.scale,this.scale,this.scale]);

    // Hack to fit image if height is greater than width
    if(this.canvas.height > this.canvas.width) {
        var canvas_scale = this.canvas.width/this.canvas.height;
        mat4.scale(this.mvMatrix, [canvas_scale,canvas_scale,canvas_scale]);
    }
}

GLPainter.prototype.draw_clut_bar = function() {
    if(!this.clut_bar_enabled)
        return;
    // Draw clut bar
    this.gl.viewport(10, 10, 50, this.canvas.height-100);
    var pMatrix = mat4.create();
    mat4.perspective(this.fovy, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, pMatrix);
    var mvMatrix = mat4.create();
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0,0,-1]);
    mat4.scale(mvMatrix, [20,1,1]);
    mat4.rotate(mvMatrix, Math.PI/2, [0,0,1]);

    var shaderProgram = this.shaderPrograms[FRAG_SHADER_RGB_8];
    this.gl.useProgram(shaderProgram);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    this.gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                                this.squareVertexPositionBuffer.itemSize,
                                this.gl.FLOAT,
                                false,
                                0,
                                0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
    this.gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, this.textureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    // Clut texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.CLUT_TEXTURE);
    this.gl.uniform1i(shaderProgram.samplerUniform, 0);

    this.gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    this.gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, this.vertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
    this.gl.viewport(0,0, this.canvas.width, this.canvas.height);
}

GLPainter.prototype.draw_image = function() {
    this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.disable(this.gl.BLEND);
    this.draw_clut_bar();

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);

    for(var imgidx in this.images) {
        this.update_projection_matrix();
        var image = this.images[imgidx];
        if(image.file.PixelAspectRatio != undefined) {
            mat4.scale(this.mvMatrix, [100/image.file.PixelAspectRatio, 1, 1]);
        }

        var shaderProgram;
        switch(jQuery.trim(image.file.PhotometricInterpretation)) {
            case "MONOCHROME1":
                // TODO: MONOCHROME1 should use inverse cluts.
            case "MONOCHROME2":
                if(image.file.BitsStored <= 8) {
                    shaderProgram = this.shaderPrograms[FRAG_SHADER_8];
                } else {
                    shaderProgram = this.shaderPrograms[FRAG_SHADER_16];
                }
                break;
            case "RGB":
                shaderProgram = this.shaderPrograms[FRAG_SHADER_RGB_8];
                break;
            default:
                alert("Unknown Photometric Interpretation" + image.file.PhotometricInterpretation + "!");
                return;
        }
        this.gl.useProgram(shaderProgram);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
        this.gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                               this.squareVertexPositionBuffer.itemSize, 
                               this.gl.FLOAT, 
                               false, 
                               0, 
                               0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
        this.gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, this.textureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);  
        this.gl.bindTexture(this.gl.TEXTURE_2D, image.texture);  
        this.gl.uniform1i(shaderProgram.samplerUniform, 0);

        // Clut texture
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.CLUT_TEXTURE);
        this.gl.uniform1i(shaderProgram.clutSamplerUniform, 1);

        this.set_matrix_uniforms(shaderProgram);
        this.set_window_uniforms(shaderProgram, image);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.vertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
    }


}

GLPainter.prototype.init = function(canvasid) {

    // Initialize main gl-canvas
    this.gl = this.canvas.getContext("experimental-webgl");
    this.gl.viewportWidth = this.canvas.width;
    this.gl.viewportHeight = this.canvas.height;


    this.init_shaders();
    this.init_buffers();
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //this.gl.enable(this.gl.DEPTH_TEST);

    if (!this.gl) {
        throw "No GL-context";
    }
}

GLPainter.prototype.onresize = function() {
    this.gl.viewportWidth = this.canvas.clientWidth;
    this.gl.viewportHeight = this.canvas.clientHeight;
    this.draw_image();
}

GLPainter.prototype.compile_shader = function(str, shader_type) {

    shader = this.gl.createShader(shader_type);

    this.gl.shaderSource(shader, str);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        alert(this.gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;

}

GLPainter.prototype.init_shaders = function() {
    var fragmentShader8 = this.compile_shader(fragment_shader_8, this.gl.FRAGMENT_SHADER);
    var fragmentShader16 = this.compile_shader(fragment_shader_16, this.gl.FRAGMENT_SHADER);
    var fragmentShaderRGB8 = this.compile_shader(fragment_shader_rgb_8, this.gl.FRAGMENT_SHADER);
    var vertexShader = this.compile_shader(vertex_shader, this.gl.VERTEX_SHADER);

    this.shaderPrograms[FRAG_SHADER_8] = this.create_shader_program(fragmentShader8, vertexShader);
    this.shaderPrograms[FRAG_SHADER_16] = this.create_shader_program(fragmentShader16, vertexShader);
    this.shaderPrograms[FRAG_SHADER_RGB_8] = this.create_shader_program(fragmentShaderRGB8, vertexShader);
}

GLPainter.prototype.create_shader_program = function(fragshader, vertshader) {
    var shaderProgram = this.gl.createProgram();
    this.gl.attachShader(shaderProgram, vertshader);
    this.gl.attachShader(shaderProgram, fragshader);
    this.gl.linkProgram(shaderProgram);

    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexPosition");
    this.gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(shaderProgram, "aTextureCoord");  
    this.gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute); 

    shaderProgram.pMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = this.gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.clutSamplerUniform = this.gl.getUniformLocation(shaderProgram, "uClutSampler");

    shaderProgram.wlUniform = this.gl.getUniformLocation(shaderProgram, "uWL");
    shaderProgram.wwUniform = this.gl.getUniformLocation(shaderProgram, "uWW");
    shaderProgram.riUniform = this.gl.getUniformLocation(shaderProgram, "uRI");
    shaderProgram.rsUniform = this.gl.getUniformLocation(shaderProgram, "uRS");
    shaderProgram.alphaUniform = this.gl.getUniformLocation(shaderProgram, "uAlpha");
    return shaderProgram;
}

GLPainter.prototype.set_matrix_uniforms = function(shaderProgram) {
    this.gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, this.mvMatrix);
}

GLPainter.prototype.set_window_uniforms = function(shaderProgram, image) {
    // Hack for files with pixel representation in two complements
    var wl = this.wl;
    if(image.file.PixelRepresentation == 0x01)
        wl += 32768.0;
    this.gl.uniform1f(shaderProgram.wlUniform, wl);
    this.gl.uniform1f(shaderProgram.wwUniform, this.ww);
    this.gl.uniform1f(shaderProgram.rsUniform, image.rs);
    this.gl.uniform1f(shaderProgram.riUniform, image.ri);
    this.gl.uniform1f(shaderProgram.alphaUniform, image.alpha);
}

GLPainter.prototype.init_buffers = function() {
    this.squareVertexPositionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    vertices = [
        -1.0,  -1.0,  0.0,
         1.0,  -1.0,  0.0,
         1.0,   1.0,  0.0,
        -1.0,   1.0,  0.0
    ];
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    this.squareVertexPositionBuffer.itemSize = 3;
    this.squareVertexPositionBuffer.numItems = 4;
 
    // Texture coords
    this.textureCoordBuffer = this.gl.createBuffer();  
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);  
    
    var textureCoordinates = [  
        0.0,  0.0,  
        1.0,  0.0,  
        1.0,  1.0,  
        0.0,  1.0
    ];  
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),  
                  this.gl.STATIC_DRAW);
    this.textureCoordBuffer.itemSize = 2;
    this.textureCoordBuffer.numItems = 4;

    this.vertexIndexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    var vertexIndices = [
        0, 1, 2, 0, 2, 3    
    ];
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
    this.vertexIndexBuffer.itemSize = 1;
    this.vertexIndexBuffer.numItems = 6;
}

GLPainter.prototype.pan_unit = function() {
    return 2.0/this.gl.viewportHeight;
}
