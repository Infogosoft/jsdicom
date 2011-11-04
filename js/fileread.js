function DicomParser(buffer) {
    this.buffer = buffer;
}

DicomParser.prototype.readNumber = function(offset, length)
{
    var it = offset+length-1;
    var n = 0;
    for(;it>=offset;--it)
    {
        var tmp = buffer.charCodeAt(it);
        n = n*256 + buffer.charCodeAt(it);
    }
    return n;
}

DicomParser.prototype.readString = function(offset, length)
{
    var s = "";
    var end = offset + length;
    for(;offset<end;++offset)
    {
        s+= buffer[offset];
    }
    return s;
}

DicomParser.prototype.readTag = function(t1, t2, t3, t4)
{
    for(var i=1050;i<buffer.length-3;i++)
    {
        var a = buffer.charCodeAt(i);
        var b = buffer[i+1].charCodeAt();
        var c = buffer[i+2].charCodeAt();
        var d = buffer[i+3].charCodeAt();
        if(buffer.charCodeAt(i)   == t1 &&
           buffer.charCodeAt(i+1) == t2 &&
           buffer.charCodeAt(i+2) == t3 &&
           buffer.charCodeAt(i+3) == t4)
        {
            i += 4;
            // Read VR
            var vr = "";
            vr = buffer[i] + buffer[i+1];
            // Read VL
            var vl = this.readNumber(i+2, 2);
            //var vl = buffer.charCodeAt(i+2) + buffer.charCodeAt(i+3)*256;
            var value = this.readString(i+4, vl);

            log("Tag found (VR, VL, Value): (" + vr + ", " + vl + ", " + value + ")");
            return;
        }
    }
}

DicomParser.prototype.dumpTags = function() {
    log("dumping tags ...");
    this.readTag(0x10, 0x00, 0x10, 0x00);
    this.readTag(0x10, 0x00, 0x20, 0x00);
}
