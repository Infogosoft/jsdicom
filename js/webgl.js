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
function GLPainter() {
    this.gl;
    this.shaderProgram;
    this.mvMatrix = mat4.create();
    this.pMatrix = mat4.create();
    this.squareVertexPositionBuffer;
    this.vertexIndexBuffer;
    this.THE_TEXTURE;

    this.ww = 200;
    this.wl = 40;
    this.ztrans_default = -2.41;
    this.ztrans = -2.41;
    this.xtrans = 0.0;
    this.ytrans = 0.0;
    this.fovy = 45;

    this.init = function(canvasid) {
        try {
            var canvas = document.getElementById(canvasid);
            this.gl = canvas.getContext("experimental-webgl");
            this.gl.viewportWidth = canvas.width;
            this.gl.viewportHeight = canvas.height;
        } catch (e) {
        }
        
        this.init_shaders();
        this.init_buffers();
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);

        if (!this.gl) {
            alert("Could not initialise WebGL, sorry :-(");
            return false;
        }
        return true;
    }

    this.get_shader = function(id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = this.gl.createShader(this.gl.VERTEX_SHADER);
        } else {
            return null;
        }

        this.gl.shaderSource(shader, str);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }



    this.init_shaders = function() {
        var fragmentShader = this.get_shader("shader-fs");
        var vertexShader = this.get_shader("shader-vs");

        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, vertexShader);
        this.gl.attachShader(this.shaderProgram, fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        this.gl.useProgram(this.shaderProgram);

        this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
        this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");  
        this.gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute); 

        this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
        this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
        this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
        this.shaderProgram.wlUniform = this.gl.getUniformLocation(this.shaderProgram, "uWL");
        this.shaderProgram.wwUniform = this.gl.getUniformLocation(this.shaderProgram, "uWW");
    }



    this.set_matrix_uniforms = function() {
        this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
        this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, mvMatrix);
    }

    this.set_window_uniforms = function() {
        this.gl.uniform1f(this.shaderProgram.wlUniform, this.wl);
        this.gl.uniform1f(this.shaderProgram.wwUniform, this.ww);
    }

    this.init_buffers = function() {
        squareVertexPositionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        vertices = [
            -1.0,  -1.0,  0.0,
             1.0,  -1.0,  0.0,
             1.0,   1.0,  0.0,
            -1.0,   1.0,  0.0
        ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        squareVertexPositionBuffer.itemSize = 3;
        squareVertexPositionBuffer.numItems = 4;
     
        // Texture coords
        textureCoordBuffer = this.gl.createBuffer();  
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);  
        
        var textureCoordinates = [  
            0.0,  0.0,  
            1.0,  0.0,  
            1.0,  1.0,  
            0.0,  1.0
        ];  
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),  
                      this.gl.STATIC_DRAW);
        textureCoordBuffer.itemSize = 2;
        textureCoordBuffer.numItems = 4;

        vertexIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
        var vertexIndices = [
            0, 1, 2, 0, 2, 3    
        ];
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(vertexIndices), this.gl.STATIC_DRAW);
        vertexIndexBuffer.itemSize = 1;
        vertexIndexBuffer.numItems = 6;
    }

    this.set_file = function(dcmfile) {
        THE_TEXTURE = this.gl.createTexture(); 
        this.gl.bindTexture(this.gl.TEXTURE_2D, THE_TEXTURE);  
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D,        // target
                      0,                    // level
                      this.gl.LUMINANCE_ALPHA,   // internalformat
                      dcmfile.columns,      // width
                      dcmfile.rows,         // height 
                      0,                    // border
                      this.gl.LUMINANCE_ALPHA,   // format
                      this.gl.UNSIGNED_BYTE,     // type
                      dcmfile.pixel_data);  // data
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                      
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    }

    this.draw_image = function() {
        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        mat4.perspective(fovy, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, pMatrix);
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, [xtrans, ytrans, ztrans]);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 
                               squareVertexPositionBuffer.itemSize, 
                               this.gl.FLOAT, 
                               false, 
                               0, 
                               0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);
        this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, textureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);  
        this.gl.bindTexture(this.gl.TEXTURE_2D, THE_TEXTURE);  
        this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
        this.set_matrix_uniforms();
        this.set_window_uniforms();
        this.gl.drawElements(this.gl.TRIANGLES, vertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);

    }
}
