function buffer_to_string(buffer, len)
{
    var s = ""
    for(var i=0;i<len;++i) {
        s += String.fromCharCode(buffer[i]);
    }
    return s;
}

function buffer_to_integer(buffer, len) {
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

// Element to stuff

function element_to_string(tag) {
    return buffer_to_string(tag.data, tag.vl);
}

function element_to_integer(tag) {
    // TODO: Handle all VRs
    if(tag.vr == "DS")
        return parseFloat(buffer_to_string(tag.data, tag.vl));
    return buffer_to_integer(tag.data, tag.vl);
}
