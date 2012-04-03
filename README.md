#jsdicom
Dicom library and viewer written in javascript.

##Dicom parsing
The dicom parser can handle Implicit VR Little-endian, Explicit VR Little-endian and Explicit VR Big-endian. ~~Sequences are not yet handled correctly.~~

Parsing files:

    var parser = new DicomParser(buffer);
    var file = parser.parse_file();
    console.log(file.PatientsName);


##Visualization
Visualisation is done with WebGL. The pixel data is converted to a WebGL texture. Different fragment shaders are used for different photometric interpretations. Windowing and CLUT is done in shaders.

##Browser support
Any WebGL-enabled browser should work. Browsing local files works from Firefox OOTB, Chrome needs to be started with --allow-file-access-from-files. There exists a canvas-painter which runs without WebGL-support but it's not as complete as the GL-painter. The idea is to test for WebGL-support and use the canvas-painter as a fallback. (The performance of GL-painter is a lot better than for canvas-painter)

##Status
This is still a work in progress, but basic functionality is in place. TODOs include:

- JPEG2000 decoded data
- Coronal and sagital reslicing.
- PET/CT fusing
- Measurements and ROIs

##Licensing
jsdicom is GPL-licensed.

##Contributors
- Daniel 'diggidanne' Erlandsson
- Rickard Holmberg

Developed by [Infogosoft AB](http://www.infogosoft.com)

Contributions are very much welcome!
