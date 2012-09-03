import SocketServer
import SimpleHTTPServer
import os
import dicom
import json

PORT = 8080
uid_to_file = {}
def find_files():
    (dirname, _, filenames) = os.walk('dcmfiles').next()
    for file in filenames:
        if file.startswith('.'):
            continue
        filename = os.path.join(dirname, file)
        dcm = dicom.read_file(filename)
        uid_to_file[dcm.SOPInstanceUID] = filename

class CustomHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path=='/listsopinstanceuids':
            resp = [{'sopInstanceUID': uid, 'href': 'http://localhost:%d/getdicom/%s' % (PORT, uid)} for uid in uid_to_file]
            self.send_response(200)
            self.send_header('Content-type','application/json')
            self.end_headers()
            self.wfile.write(json.dumps(resp))
        elif self.path.startswith('/getdicom/'):
            uid = self.path.split("/")[2]
            file = uid_to_file[uid]
            self.send_response(200)
            self.send_header('Content-type','application/dicom')
            self.end_headers()
            self.wfile.write(open(file).read())
        else:
            SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

httpd = SocketServer.ThreadingTCPServer(('localhost', PORT),CustomHandler)

print "serving at port", PORT
print "building SOPInstanceUID to file dict from dcmfiles/..."
find_files()
print "Done!"
httpd.serve_forever()
