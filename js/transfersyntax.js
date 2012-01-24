// read vr(both little and big endian)
function read_vr(buffer, offset) {
    return String.fromCharCode(buffer[offset]) + 
           String.fromCharCode(buffer[offset+1]);
}


// Big endian readers
function read_number_BE(buffer, offset, length) {
    var n = 0;
    for(var i=offset;i<offset+length;++i) {
        n = n*256 + buffer[i];
    }
    return n;
}

function read_tag_BE(buffer, offset) {
    var tag = buffer[offset]*256*256*256 + buffer[offset+1]*256*256 +
              buffer[offset+2]*256 + buffer[offset+3];
    return tag;
}

// Little endian readers
function read_number_LE(buffer, offset, length) {
    var it = offset + length - 1;
    var n = 0;
    for(;it>=offset;--it) {
        var tmp = buffer[it];
        n = n*256 + buffer[it];
    }
    return n;
}

function read_tag_LE(buffer, offset) {
    var tag = buffer[offset+1]*256*256*256 + buffer[offset]*256*256 +
              buffer[offset+3]*256 + buffer[offset+2];
    return tag;
}

function element_reader(tag_reader, number_reader, implicit) {
    this._read_tag = tag_reader;
    this._read_number = number_reader;

    // reads a data element and returns the new offset
    this.read_element = function(buffer, offset, element /* out */) {
        var tag = this._read_tag(buffer, offset)
        offset += 4;
        
        var vl;
        var vr;
        if (tag == 0xfffee000 || tag == 0xfffee00d || tag == 0xfffee0dd) {
            // Item delimiters
            vl = this._read_number(buffer, offset, 4);
            offset += 4;
            vr = "N/A";
        } else {
            
            if(implicit) {
                vr = "UN";
                if(tag in dcmdict) {
                    vr = dcmdict[tag][0];
                }
                
                vl = this._read_number(buffer, offset, 4);
                offset += 4;
            } else {
                vr = read_vr(buffer, offset);
                if(vr == "OB" || vr == "OF" || vr == "SQ" || vr == "OW" || vr == "UN") { 
                    offset += 4;
                    vl = this._read_number(buffer, offset, 4);
                    offset += 4;
                } else {
                    offset += 2;
                    vl = this._read_number(buffer, offset, 2);
                    offset += 2;
                }
            }
        }
        
        //element = {};
        element.tag = tag;
        element.vr = vr;
        if (vl == 0xffffffff)
            element.vl = 0;
        else
            element.vl = vl;
        element.data = buffer.subarray(offset, offset + element.vl);
        
        offset += element.vl;
        return offset;
    }
}

tag_readers = {
    "1.2.840.10008.1.2.1": read_tag_LE,
    "1.2.840.10008.1.2.2": read_tag_BE,
    "1.2.840.10008.1.2": read_tag_LE,
}

is_implicit = {
    "1.2.840.10008.1.2.1": false,
    "1.2.840.10008.1.2.2": false,
    "1.2.840.10008.1.2": true,
}

number_readers = {
    "1.2.840.10008.1.2": read_number_LE,
    "1.2.840.10008.1.2.1": read_number_LE,
    "1.2.840.10008.1.2.2": read_number_BE
}

// Element reader factory
function get_element_reader(transfersyntaxUID) {
    if(transfersyntaxUID in tag_readers && transfersyntaxUID in number_readers) {
        return new element_reader(tag_readers[transfersyntaxUID],
                                  number_readers[transfersyntaxUID],
                                  is_implicit[transfersyntaxUID])
    }
    return;
}

meta_element_reader = get_element_reader("1.2.840.10008.1.2.1");
