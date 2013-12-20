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
uniform highp float uBrightness;\
uniform highp float uContrast;\
uniform highp float uKernel[9];\
uniform sampler2D uClutSampler;\
\
void main(void) {  \
		highp float values[9];\
		highp vec2 onePixel = vec2(1.0, 1.0) / 512.0;\
		for(int i=0;i<3;++i) {\
		for(int j=0;j<3;++j) {\
		highp vec4 texcolor = texture2D(uSampler, vTextureCoord + onePixel * vec2(i-1, j-1));\
		highp float intensity = texcolor.a*65536.0;\
		highp float rescaleIntercept = uRI;\
		highp float rescaleSlope = uRS;\
		intensity = intensity * rescaleSlope + rescaleIntercept;\
		highp float lower_bound = (uWW * -0.5) + uWL; \
		highp float upper_bound = (uWW * 0.5) + uWL; \
		intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
		values[i+3*j] = intensity;\
		}\
		}\
		highp float intensity_sum = \
		values[0]*uKernel[0] +\
		values[1]*uKernel[1] +\
		values[2]*uKernel[2] +\
		values[3]*uKernel[3] +\
		values[4]*uKernel[4] +\
		values[5]*uKernel[5] +\
		values[6]*uKernel[6] +\
		values[7]*uKernel[7] +\
		values[8]*uKernel[8];\
		highp float uKernel_weight =\
		uKernel[0] + uKernel[1] + uKernel[2] + uKernel[3] + uKernel[4] + uKernel[5] +\
		uKernel[6] + uKernel[7] + uKernel[8] ;\
		highp float intensity = intensity_sum / uKernel_weight;\
		intensity = intensity + (uBrightness / 255.0); \
		intensity = (intensity - 0.5) * (uContrast / 1000.0) + 0.5; \
		if (intensity > 1.0) intensity = 1.0; \
		if (intensity < 0.0) intensity = 0.0; \
    gl_FragColor = vec4(intensity, intensity, intensity, uAlpha);\
}";

var fragment_shader_8_mc1 = "\
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
		intensity = 1.0 - intensity; \
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
uniform highp float uBrightness;\
uniform highp float uContrast;\
uniform highp float uKernel[9];\
\
void main(void) {  \
		highp float values[9];\
		highp vec2 onePixel = vec2(1.0, 1.0) / 512.0;\
		for(int i=0;i<3;++i) {\
		for(int j=0;j<3;++j) {\
		highp vec4 texcolor = texture2D(uSampler, vTextureCoord + onePixel * vec2(i-1, j-1));\
		highp float intensity = texcolor.r*256.0 + texcolor.a*65536.0;\
		highp float rescaleIntercept = uRI;\
		highp float rescaleSlope = uRS;\
		intensity = intensity * rescaleSlope + rescaleIntercept;\
		highp float lower_bound = (uWW * -0.5) + uWL; \
		highp float upper_bound = (uWW * 0.5) + uWL; \
		intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
		values[i+3*j] = intensity;\
		}\
		}\
		highp float intensity_sum = \
		values[0]*uKernel[0] +\
		values[1]*uKernel[1] +\
		values[2]*uKernel[2] +\
		values[3]*uKernel[3] +\
		values[4]*uKernel[4] +\
		values[5]*uKernel[5] +\
		values[6]*uKernel[6] +\
		values[7]*uKernel[7] +\
		values[8]*uKernel[8];\
		highp float uKernel_weight =\
		uKernel[0] + uKernel[1] + uKernel[2] + uKernel[3] + uKernel[4] + uKernel[5] +\
		uKernel[6] + uKernel[7] + uKernel[8] ;\
		highp float intensity = intensity_sum / uKernel_weight;\
		intensity = intensity + (uBrightness / 255.0); \
		intensity = (intensity - 0.5) * (uContrast / 1000.0) + 0.5; \
		if (intensity > 1.0) intensity = 1.0; \
		if (intensity < 0.0) intensity = 0.0; \
    highp vec4 clutcolor = texture2D(uClutSampler, vec2(intensity, intensity)); \
    gl_FragColor = vec4(clutcolor.r, clutcolor.g, clutcolor.b, uAlpha);\
}";

var fragment_shader_16_mc1 = "\
\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform sampler2D uClutSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
uniform highp float uRS;\
uniform highp float uRI;\
uniform highp float uAlpha;\
uniform highp float uBrightness;\
uniform highp float uContrast;\
uniform highp float uKernel[9];\
\
void main(void) {  \
		highp float values[9];\
		highp vec2 onePixel = vec2(1.0, 1.0) / 512.0;\
		for(int i=0;i<3;++i) {\
		for(int j=0;j<3;++j) {\
		highp vec4 texcolor = texture2D(uSampler, vTextureCoord + onePixel * vec2(i-1, j-1));\
		highp float intensity = texcolor.r*256.0 + texcolor.a*65536.0;\
		highp float rescaleIntercept = uRI;\
		highp float rescaleSlope = uRS;\
		intensity = intensity * rescaleSlope + rescaleIntercept;\
		highp float lower_bound = (uWW * -0.5) + uWL; \
		highp float upper_bound = (uWW * 0.5) + uWL; \
		intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
		values[i+3*j] = intensity;\
		}\
		}\
		highp float intensity_sum = \
		values[0]*uKernel[0] +\
		values[1]*uKernel[1] +\
		values[2]*uKernel[2] +\
		values[3]*uKernel[3] +\
		values[4]*uKernel[4] +\
		values[5]*uKernel[5] +\
		values[6]*uKernel[6] +\
		values[7]*uKernel[7] +\
		values[8]*uKernel[8];\
		highp float uKernel_weight =\
		uKernel[0] + uKernel[1] + uKernel[2] + uKernel[3] + uKernel[4] + uKernel[5] +\
		uKernel[6] + uKernel[7] + uKernel[8] ;\
		highp float intensity = intensity_sum / uKernel_weight;\
		intensity = intensity + (uBrightness / 255.0); \
		intensity = (intensity - 0.5) * (uContrast / 1000.0) + 0.5; \
		if (intensity > 1.0) intensity = 1.0; \
		if (intensity < 0.0) intensity = 0.0; \
		intensity = 1.0 - intensity; \
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
