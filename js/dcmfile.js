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
    this.rows;
    this.columns;
    this.imagePosition;
    this.imageOrientationRow;
    this.imageOrientationColumn;
    //this.pixel_data;

    this.getCTValue = function(col, row) {
        if(col>=this.columns || row >= this.rows)
            return undefined;
        var data_idx = (col + row*this.columns)*2;
        var intensity = this.pixel_data[data_idx+1]*256.0 + this.pixel_data[data_idx];
        intensity = intensity * this.rescaleSlope + this.rescaleIntercept;
        return intensity;
    }

    this.getPatientCoordinate = function(col, row) {
        return [this.imagePosition[0] + row * this.imageOrientationRow[0] + col * this.imageOrientationColumn[0],
                this.imagePosition[1] + row * this.imageOrientationRow[1] + col * this.imageOrientationColumn[1],
                this.imagePosition[2] + row * this.imageOrientationRow[2] + col * this.imageOrientationColumn[2]];
    }
}
