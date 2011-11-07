function DataElement(tag, vr, vl, data) {
    this.tag = tag;
    this.vr = vr;
    this.vl = vl;
    this.data = data;
}

function DcmFile() {
    // File Meta Information
    this.meta_elements = [];
    this.data_elements = [];
    this.get_element = function(tag) {
        for(var i=0;i<this.data_elements.length;++i) {
            if(this.data_elements[i].tag == tag)
                return this.data_elements[i];
        }
        return 0;
    }
}
