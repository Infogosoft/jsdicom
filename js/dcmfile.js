function DataElement(tag, vr, vl, data) {
    this.tag = tag;
    this.vr = vr;
    this.vl = vl;
    this.data = data;
    this.get_value = function() {
	if(this.vr in element_to_repr) {
	    return element_to_value[this.vr](this.data, this.vl);
	} else {
	    return undefined;
	}
    }
    this.get_repr = function() {
	if(this.vr in element_to_repr) {
	    return element_to_repr[this.vr](this.data, this.vl);
	} else {
	    return undefined;
	}
    }
}

function DcmFile() {
    // File Meta Information
    this.meta_elements = [];
    this.get_meta_element = function(tag) {
        for(var i=0;i<this.meta_elements.length;++i) {
            if(this.meta_elements[i].tag == tag)
                return this.meta_elements[i];
        }
        return 0;
    }

    this.data_elements = [];
    this.get_element = function(tag) {
        for(var i=0;i<this.data_elements.length;++i) {
            if(this.data_elements[i].tag == tag)
                return this.data_elements[i];
        }
        return 0;
    }
    this.buffer;
    this.rescaleSlope;
    this.rescaleIntercept;
    this.pixel_data;
    this.width;
    this.height;
    //this.pixel_data;
}
