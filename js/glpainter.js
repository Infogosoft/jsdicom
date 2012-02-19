var FRAG_SHADER_8 = 0;
var FRAG_SHADER_16 = 1;
var FRAG_SHADER_RGB_8 = 2;

function GLPainter() {
    this.gl;
    this.shaderProgram;
    this.mvMatrix = mat4.create();
    this.pMatrix = mat4.create();
    this.squareVertexPositionBuffer;
    this.vertexIndexBuffer;
    this.THE_TEXTURE;
    this.CLUT_TEXTURE;

    this.ww = 200;
    this.wl = 40;
    this.rs = 1;
    this.ri = -1024;
    this.clut_r;
    this.clut_g;
    this.clut_b;
    this.ztrans = -1;
    this.xtrans = 0.0;
    this.ytrans = 0.0;
    this.fovy = 90;
    this.scale = 1;
    this.pan = [0,0];
}

GLPainter.prototype.is_supported = function() {
    return window.WebGLRenderingContext;
}

GLPainter.prototype.set_file = function(dcmfile) {
    this.rs=dcmfile.rescaleSlope;
    this.ri=dcmfile.rescaleIntercept;
    var internalFormat;
    switch(jQuery.trim(dcmfile.get_element(dcmdict["PhotometricInterpretation"]).get_value())) {
    case "MONOCHROME1":
    case "MONOCHROME2":
        if(dcmfile.get_element(dcmdict["BitsStored"]).get_value() <= 8) {
            internalFormat = this.gl.LUMINANCE;
            // Change shader?
            if(this.shaderProgram.activeFragmentShader != FRAG_SHADER_8) {
                this.detach_shaders();
                this.shaderProgram.activeFragmentShader = FRAG_SHADER_8;
                this.set_and_compile_shader(this.shaderProgram.fragmentShader8bit, 
                                            this.shaderProgram.vertexShader);
            }
        } else {
            internalFormat = this.gl.LUMINANCE_ALPHA;
            if(this.shaderProgram.activeFragmentShader != FRAG_SHADER_16) {
                this.detach_shaders();
                this.shaderProgram.activeFragmentShader = FRAG_SHADER_16;
                this.set_and_compile_shader(this.shaderProgram.fragmentShader16bit, 
                                            this.shaderProgram.vertexShader);
            }
        }
        break;
    case "RGB":
        internalFormat = this.gl.RGB;
        if(this.shaderProgram.activeFragmentShader != FRAG_SHADER_RGB_8) {
            this.detach_shaders();
            this.shaderProgram.activeFragmentShader = FRAG_SHADER_RGB_8;
            this.set_and_compile_shader(this.shaderProgram.fragmentShaderRGB8bit, 
                                        this.shaderProgram.vertexShader);
        }
        break;
    default:
        alert("Unknown Photometric Interpretation" + dcmfile.get_element(dcmdict["PhotometricInterpretation"]).get_value() + "!");
        return;
    }

    this.THE_TEXTURE = this.gl.createTexture(); 
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.THE_TEXTURE);  
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texImage2D(this.gl.TEXTURE_2D,       // target
                       0,                        // level
                       internalFormat,           // internalformat
                       dcmfile.columns,          // width
                       dcmfile.rows,             // height 
                       0,                        // border
                       internalFormat,           // format
                       this.gl.UNSIGNED_BYTE,    // type
                       Uint8Array(dcmfile.pixel_data.buffer, dcmfile.pixel_data.byteOffset)); // data
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                  
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
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

GLPainter.prototype.set_cluts = function(clut_r, clut_g, clut_b) {
    this.clut_r = clut_r;
    this.clut_g = clut_g;
    this.clut_b = clut_b;
    if(!this.gl)
        return;

    console.log('settings cluts');
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
    this.ww = ww;
    this.wl = wl;
    this.draw_image();
}
GLPainter.prototype.get_windowing = function() {
    return [this.wl, this.ww];
}

GLPainter.prototype.detach_shaders = function() {
    switch(this.shaderProgram.activeFragmentShader) {
    case FRAG_SHADER_16:
        this.gl.detachShader(this.shaderProgram, this.shaderProgram.fragmentShader16bit);
        break;
    case FRAG_SHADER_8:
        this.gl.detachShader(this.shaderProgram, this.shaderProgram.fragmentShader8bit);
        break;
    case FRAG_SHADER_RGB_8:
        this.gl.detachShader(this.shaderProgram, this.shaderProgram.fragmentShaderRGB8bit);
        break;
    }
    this.gl.detachShader(this.shaderProgram, this.shaderProgram.vertexShader);
    this.shaderProgram.activeFragmentShader = null;
}

GLPainter.prototype.draw_image = function() {
    this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    mat4.perspective(this.fovy, this.gl.viewportWidth / this.gl.viewportHeight, 0.1, 100.0, this.pMatrix);
    mat4.identity(this.mvMatrix);
    mat4.translate(this.mvMatrix, [this.pan[0], -this.pan[1], -1]);
    mat4.scale(this.mvMatrix, [this.scale,this.scale,this.scale]);

    // Hack to fit image if height is greater than width
    if(this.canvas.height > this.canvas.width) {
        var canvas_scale = this.canvas.width/this.canvas.height;
        mat4.scale(this.mvMatrix, [canvas_scale,canvas_scale,canvas_scale]);
    }


    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
    this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, 
                           this.squareVertexPositionBuffer.itemSize, 
                           this.gl.FLOAT, 
                           false, 
                           0, 
                           0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
    this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.textureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);

    this.gl.activeTexture(this.gl.TEXTURE0);  
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.THE_TEXTURE);  
    this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);

    // Clut texture
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.CLUT_TEXTURE);
    this.gl.uniform1i(this.shaderProgram.clutSamplerUniform, 1);

    this.set_matrix_uniforms();
    this.set_window_uniforms();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, this.vertexIndexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);

}

GLPainter.prototype.init = function(canvasid) {
    try {
        var canvas = document.getElementById(canvasid);
        this.gl = canvas.getContext("experimental-webgl");
        //this.gl = canvas.getContext("webgl");
        this.gl.viewportWidth = canvas.width;
        this.gl.viewportHeight = canvas.height;
        this.canvas = canvas;
    } catch (e) {
        alert("Failed to initialize GL-context");
        return;
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

    this.shaderProgram = this.gl.createProgram();
    this.shaderProgram.fragmentShader8bit = fragmentShader8;
    this.shaderProgram.fragmentShader16bit = fragmentShader16;
    this.shaderProgram.fragmentShaderRGB8bit = fragmentShaderRGB8;
    this.shaderProgram.vertexShader = vertexShader;
    this.shaderProgram.activeFragmentShader = FRAG_SHADER_RGB_8;
    this.set_and_compile_shader(fragmentShaderRGB8, vertexShader);
}

GLPainter.prototype.set_and_compile_shader = function(fragshader, vertshader) {
    this.gl.attachShader(this.shaderProgram, vertshader);
    this.gl.attachShader(this.shaderProgram, fragshader);
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
    this.shaderProgram.clutSamplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uClutSampler");

    this.shaderProgram.wlUniform = this.gl.getUniformLocation(this.shaderProgram, "uWL");
    this.shaderProgram.wwUniform = this.gl.getUniformLocation(this.shaderProgram, "uWW");
    this.shaderProgram.riUniform = this.gl.getUniformLocation(this.shaderProgram, "uRI");
    this.shaderProgram.rsUniform = this.gl.getUniformLocation(this.shaderProgram, "uRS");
}

GLPainter.prototype.set_matrix_uniforms = function() {
    this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
    this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
}

GLPainter.prototype.set_window_uniforms = function() {
    this.gl.uniform1f(this.shaderProgram.wlUniform, this.wl);
    this.gl.uniform1f(this.shaderProgram.wwUniform, this.ww);
    this.gl.uniform1f(this.shaderProgram.rsUniform, this.rs);
    this.gl.uniform1f(this.shaderProgram.riUniform, this.ri);
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

