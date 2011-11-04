
function log(s)
{
    var logEntry = $("<li>").html(s);
    $("#loglist").append(logEntry);
}

function DcmApp() {
    var parser;
    var buffer;
}

DcmApp.prototype.loadFile = function(evt) 
{
    var file = evt.target.files[0];
    var reader = new FileReader();
    reader.onload = function(evt) {
        log("File loaded");
        buffer = evt.target.result;
        log("Buffer size: " + buffer.length);
        parser = new DicomParser(buffer);
        parser.dumpTags();
    }
    reader.readAsBinaryString(file);
}
