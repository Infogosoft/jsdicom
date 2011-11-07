
function log(s)
{
    var logEntry = $("<li>").html(s);
    $("#loglist").append(logEntry);
}

function DcmApp(file_loaded) {
    this.buffer;
    this.pixel_data;
    this.rows;
    this.cols;

    // Callback
    this.file_loaded = file_loaded;

    this.loadFile = function(evt) 
    {
        console.log(this);
        var file = evt.target.files[0];
        var reader = new FileReader();
        // Closure to bind app
        reader.onload = (function(app) {
            return function(evt) {
                app.buffer = new Uint8Array(evt.target.result);
                parser = new DicomParser(app.buffer);
                var file = parser.parse_file();

                var pn = file.get_tag(0x00100010);
                log("Patients name: " + buffer_to_string(pn.data, pn.vl));
                var width = file.get_tag(0x00280010);
                var height = file.get_tag(0x00280011);
                app.width = buffer_to_integer(width.data, width.vl);
                app.height = buffer_to_integer(height.data, height.vl);
                app.pixel_data = file.get_tag(0x7fe00010).data;
                // Execute callback
                app.file_loaded(app);
            }
        })(this);
        reader.readAsArrayBuffer(file);
    }
}
