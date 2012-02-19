$(document).ready(function(){
    test("Parse a single element, little-endian, implicit VR", function() {
        var buf = new Uint8Array(Array(0xe0, 0x7f, 0x10, 0x00, 0x04, 0x00, 0x00, 0x00,
                                       0x34, 0x12, 0x78, 0x56));
        
        var ts = "1.2.840.10008.1.2";
        var element_reader = get_element_reader(ts);
        var offset = 0;
        var element = new DataElement(is_little_endian[ts]);
        offset = element_reader.read_element(buf, 0, element);
        equal(element.vr, "ox", "vr");
        equal(element.vl, 4, "vl");
        console.log("Setting VR to OW for testing");
        element.vr = "OW";
        equal(element.vr, "OW", "vr");
        equal(element.tag.toString(16), 0x7fe00010.toString(16), "tag");
        var value = element.get_value();
        equal(value[0].toString(16), 0x1234.toString(16), "value[0]");
        equal(value[1].toString(16), 0x5678.toString(16), "value[1]");
        equal(offset, 12, "offset");
    });

    test("Parse a single element, little-endian, explicit VR", function() {
        var buf = new Uint8Array(Array(0xe0, 0x7f, 0x10, 0x00, 0x4f, 0x57, 0x00, 0x00,
                                       0x04, 0x00, 0x00, 0x00, 0x34, 0x12, 0x78, 0x56));
        
        var ts = "1.2.840.10008.1.2.1";
        var element_reader = get_element_reader(ts);
        var offset = 0;
        var element = new DataElement(is_little_endian[ts]);
        offset = element_reader.read_element(buf, 0, element);
        equal(element.vr, "OW", "vr");
        equal(element.vl, 4, "vl");
        equal(element.tag.toString(16), 0x7fe00010.toString(16), "tag");
        var value = element.get_value();
        equal(value[0].toString(16), 0x1234.toString(16), "value[0]");
        equal(value[1].toString(16), 0x5678.toString(16), "value[1]");
        equal(offset, 16, "offset");
    });

    test("Parse a single element, big-endian, explicit VR", function() {
        var buf = new Uint8Array(Array(0x7f, 0xe0, 0x00, 0x10, 0x4f, 0x57, 0x00, 0x00, 
                                       0x00, 0x00, 0x00, 0x04, 0x12, 0x34, 0x56, 0x78));
        
        var ts = "1.2.840.10008.1.2.2";
        var element_reader = get_element_reader(ts);
        var offset = 0;
        var element = new DataElement(is_little_endian[ts]);
        offset = element_reader.read_element(buf, 0, element);
        equal(element.vr, "OW", "vr");
        equal(element.vl, 4, "vl");
        equal(element.tag.toString(16), 0x7fe00010.toString(16), "tag");
        var value = element.get_value();
        equal(value[0].toString(16), 0x1234.toString(16), "value[0]");
        equal(value[1].toString(16), 0x5678.toString(16), "value[1]");
        equal(offset, 16, "offset");
    });
});
