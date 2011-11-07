function DicomParser(buffer) {
    this.buffer = buffer;
}

DicomParser.prototype.read_number = function(offset, length) {
    // NOTE: Only little endian
    var it = offset+length-1;
    var n = 0;
    for(;it>=offset;--it)
    {
        var tmp = this.buffer[it];
        n = n*256 + this.buffer[it];
    }
    return n;
}


DicomParser.prototype.read_string = function(start, len) {
    var s = ""
    var end = start+len;
    for(var i=start;i<end;++i) {
        s += String.fromCharCode(this.buffer[i]);
    }
    return s;
}

DicomParser.prototype.read_VR = function(offset) {
    return this.read_string(offset, 2);
}

DicomParser.prototype.read_tag = function(offset) {
    var vl = this.buffer[offset+1]*256*256*256 + this.buffer[offset]*256*256 +
             this.buffer[offset+3]*256 + this.buffer[offset+2];
    return vl;
}

DicomParser.prototype.parse_file = function() {
    var file = new DcmFile();
    // Look for DICM at pos 128
    var magicword = this.read_string(128, 4);
    if(magicword != "DICM")
    {
        log("DICM key NOT found, aborting");
        return;
    }
    // Parse Meta Information Group Length
    var offset = 132;
    var tag = this.read_tag(offset);
    offset += 4;

    var vr = this.read_VR(offset);
    console.log(vr);
    offset += 2;

    var vl = this.read_number(offset, 2);
    console.log(vl);
    offset += 2;

    var value = this.read_number(offset, vl);
    console.log(value);
    offset += vl;
    var meta_element_end = offset+value;

    // Parse File Meta Information
    while(offset < meta_element_end) {
        tag = this.read_tag(offset);
        offset += 4;
        vr = this.read_VR(offset);
        if(vr == "OB" || vr == "OF" || vr == "SQ" || vr == "OW" || vr == "UN") { 
            offset += 4;
            vl = this.read_number(offset, 4);
            offset += 4;
        } else {
            offset += 2;
            vl = this.read_number(offset, 2);
            offset += 2;
        }
        var meta_element = new DataElement(tag, vr, vl, this.buffer.subarray(offset, offset+vl));
        file.meta_elements.push(meta_element);
        offset += vl;
    }

    // Parse Dicom-Data-Set
    while(offset < this.buffer.length) {
        tag = this.read_tag(offset);
        offset += 4;
        vr = this.read_VR(offset);
        if(vr == "OB" || vr == "OF" || vr == "SQ" || vr == "OW" || vr == "UN") { 
            offset += 4;
            vl = this.read_number(offset, 4);
            offset += 4;
        } else {
            offset += 2;
            vl = this.read_number(offset, 2);
            offset += 2;
        }
        var data_element = new DataElement(tag, vr, vl, this.buffer.subarray(offset, offset+vl));
        file.data_elements.push(data_element);
        offset += vl;
    }
    return file;
}
