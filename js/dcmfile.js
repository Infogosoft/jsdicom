function DataElement(little_endian) {
    this.tag;
    this.vr;
    this.vl;
    this.data;
    this.little_endian = little_endian;
    var get_value = function(element_to_value) {
        return function() {
            if(this.vr in element_to_value) {
                return element_to_value[this.vr](this.data, this.vl);
            } else {
                return undefined;
            }
        };
    };
    this.get_value = get_value(this.little_endian ? element_to_value_le : element_to_value_be);
    var get_repr = function(element_to_repr) {
        return function() {
            if(this.vr in element_to_repr) {
                return element_to_repr[this.vr](this.data, this.vl);
            } else {
                return undefined;
            }
        };
    }
    this.get_repr = get_repr(this.little_endian ? element_to_repr_le : element_to_repr_be);
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
        if(col < 0 || col >= this.columns || row < 0 || row >= this.rows)
            return undefined;
        var data_idx = (col + row*this.columns);
        var intensity = this.pixel_data[data_idx] * this.rescaleSlope + this.rescaleIntercept;
        return intensity;
    }

    this.getPatientCoordinate = function(col, row) {
        if (this.imagePosition == undefined || this.imageOrientationColumn == undefined || this.imageOrientationRow == undefined)
            return undefined;
        return [this.imagePosition[0] + row * this.imageOrientationRow[0] + col * this.imageOrientationColumn[0],
                this.imagePosition[1] + row * this.imageOrientationRow[1] + col * this.imageOrientationColumn[1],
                this.imagePosition[2] + row * this.imageOrientationRow[2] + col * this.imageOrientationColumn[2]];
    }
}
