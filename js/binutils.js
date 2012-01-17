function buffer_to_string(buffer, len)
{
    // Check for zeroes?
    var s = ""
    for(var i=0;i<len;++i) {
        if(buffer[i] == 0)
            break;
        s += String.fromCharCode(buffer[i]);
    }
    return s;
}

function buffer_to_string_float(buffer, len)
{
    var vals = buffer_to_string(buffer, len).split("\\").map(parseFloat);
    if(vals.length == 1)
        return vals[0];
    else
        return vals;
}

function buffer_to_unsigned(buffer, len) {
    // NOTE: Only little endian for now
    var i = len-1;
    var n = 0;
    for(;i>=0;--i)
    {
        var tmp = buffer[i];
        n = n*256 + buffer[i];
    }
    return n;
}
// Converts value to readable format
var element_to_repr = {
    "AE": buffer_to_string,
    "AS": buffer_to_string,
    "DS": buffer_to_string,
    "CS": buffer_to_string,
    "UI": buffer_to_string,
    "DA": buffer_to_string,
    "PN": buffer_to_string,
    "TM": buffer_to_string,
    "UT": buffer_to_string,
    "US": buffer_to_unsigned,
    "UL": buffer_to_unsigned
}

var element_to_value = {
    "AE": buffer_to_string,
    "AS": buffer_to_string,
    "DS": buffer_to_string_float,
    "CS": buffer_to_string,
    "UI": buffer_to_string,
    "DA": buffer_to_string,
    "PN": buffer_to_string,
    "TM": buffer_to_string,
    "UT": buffer_to_string,
    "US": buffer_to_unsigned,
    "UL": buffer_to_unsigned
}


function tag_repr(tag) {
    var t = tag.toString(16).toUpperCase();
    while(t.length < 8)
        t="0"+t;
    t = "(" + t.substr(0,4) + ", " + t.substr(4,4) + ")"; 
    return t;
}
// Element to stuff
function element_repr(elem) {
    // Convert tag to dicom format
    var tag = elem.tag.toString(16).toUpperCase();
    while(tag.length < 8)
        tag="0"+tag;
    tag = "(" + tag.substr(0,4) + ", " + tag.substr(4,4) + ")"; 
    if(elem.vr in element_to_repr)
    {
        return tag + " - " + element_to_repr[elem.vr](elem.data, elem.vl);
    }
    return tag + " VR: " + elem.vr;
}
