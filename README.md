#jsdicom
Dicom library and viewer written in javascript.

##Dicom parsing
The dicom parser can handle Explicit Little Endiain, Explicit Little Endian and Implicit VR. Sequences are not yet handled correctly.

Parsing files:
```var parser = new DicomParser(buffer);
var file = parser.parse_file();
console.log(file.PatientsName);```

##Visualization
Visualisation is done with WebGL. The pixel data is converted to a WebGL texture. Different fragment shaders are used for different photometric interpretations. Windowing and CLUT is done in shaders.

##Status
This is still a work in progress, but basic functionality is in place. TODOs include:

- JPEG2000 decoded data
- Coronal and sagital reslicing.
- PET/CT fusing


##Contributors
- Daniel 'diggidanne' Erlandsson
- Rickard Holmberg

Developed by [Infogosoft AB](www.infogosoft.com)

Contributions are very much welcome!
