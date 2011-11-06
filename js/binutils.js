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
