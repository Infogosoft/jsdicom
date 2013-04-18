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
var fragment_shader_8 = "\
\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
uniform highp float uRS;\
uniform highp float uRI;\
uniform highp float uAlpha;\
uniform sampler2D uClutSampler;\
\
void main(void) {  \
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    highp float intensity = texcolor.r*65536.0;\
    highp float lower_bound = (uWW * -0.5) + uWL; \
    highp float upper_bound = (uWW *  0.5) + uWL; \
    intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
\
    gl_FragColor = vec4(intensity, intensity, intensity, uAlpha);\
}";

var fragment_shader_16 = "\
\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform sampler2D uClutSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
uniform highp float uRS;\
uniform highp float uRI;\
uniform highp float uAlpha;\
\
void main(void) {  \
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    highp float intensity = texcolor.r*256.0 + texcolor.a*65536.0;\
    highp float rescaleIntercept = uRI;\
    highp float rescaleSlope = uRS;\
    intensity = intensity * rescaleSlope + rescaleIntercept;\
    highp float lower_bound = (uWW * -0.5) + uWL; \
    highp float upper_bound = (uWW *  0.5) + uWL; \
    intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
    highp vec4 clutcolor = texture2D(uClutSampler, vec2(intensity, intensity)); \
    gl_FragColor = vec4(clutcolor.r, clutcolor.g, clutcolor.b, uAlpha);\
}";

var fragment_shader_rgb_8 = "\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform highp float uAlpha;\
\
void main()\
{\
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    gl_FragColor = vec4(texcolor.r, texcolor.g, texcolor.b, 1.0);\
}";


var vertex_shader = "\
attribute vec3 aVertexPosition;\
attribute vec2 aTextureCoord;\
\
uniform mat4 uMVMatrix;\
uniform mat4 uPMatrix;\
\
varying highp vec2 vTextureCoord;\
\
void main(void) {\
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\
    vTextureCoord = aTextureCoord;\
}";

