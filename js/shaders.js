var fragment_shader_8 = "\
\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
uniform highp float uRS;\
uniform highp float uRI;\
uniform sampler2D uClutSampler;\
\
void main(void) {  \
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    highp float intensity = texcolor.r*65536.0;\
    highp float wl = uWL;\
    highp float ww = uWW;\
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
uniform sampler2D uClutSampler;\
uniform highp float uWW;\
uniform highp float uWL;\
uniform highp float uRS;\
uniform highp float uRI;\
\
void main(void) {  \
    highp vec4 texcolor = texture2D(uSampler, vTextureCoord); \
    highp float intensity = texcolor.r*256.0 + texcolor.a*65536.0;\
    highp float rescaleIntercept = uRI;\
    highp float rescaleSlope = uRS;\
    intensity = intensity * rescaleSlope + rescaleIntercept;\
    highp float wl = uWL;\
    highp float ww = uWW;\
    highp float lower_bound = wl - ww/2.0;\
    highp float upper_bound = wl + ww/2.0;\
    intensity = (intensity - lower_bound)/(upper_bound - lower_bound);\
    highp vec4 clutcolor = texture2D(uClutSampler, vec2(intensity, intensity)); \
    gl_FragColor = vec4(clutcolor.r, clutcolor.g, clutcolor.b, 1.0);\
\
}";

var fragment_shader_rgb_8 = "\
varying highp vec2 vTextureCoord;\
uniform sampler2D uSampler;\
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

