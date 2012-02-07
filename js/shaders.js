var fragment_shader_8 = "\
\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
\
void main(void) {  \
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    highp float intensity = texcolor.r*256.0;\
    highp float wl = uWL/256.0;\
    highp float ww = uWW/256.0;\
    highp float lower_bound = wl - ww/2.0;\
    highp float upper_bound = wl + ww/2.0;\
    intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
\
    gl_FragColor = vec4(intensity, intensity, intensity, 1.0);\
}";

var fragment_shader_16 = "\
\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
\
void main(void) {  \
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    highp float intensity = texcolor.r + texcolor.a*256.0;\
    highp float rescaleIntercept = -1024.0/256.0;\
    highp float rescaleSlope = 1.0;\
    intensity = intensity*rescaleSlope + rescaleIntercept;\
    highp float wl = uWL/256.0;\
    highp float ww = uWW/256.0;\
    highp float lower_bound = wl - ww/2.0;\
    highp float upper_bound = wl + ww/2.0;\
    intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
\
    gl_FragColor = vec4(intensity, intensity, intensity, 1.0);\
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

