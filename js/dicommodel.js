// Embryonic impementation of the "DICOM model of the real-world", see 11_03pu.pdf, 64pp
//
// Remaining issues:
//
//  * How shall the classes be instatiated? (e.g. we want image series
//    as a single object, with attributes from the contituent images...)
// 
//  * How much should be implemented for now? Can we signal unimplementedness?
//
//  * Would we want inheritence? Combining modules -> iods?



assert = function(cond, message) {
    if(!cond)
        throw message;
}

DicomModel = {}

DicomModel.sopInstanceUIDs = {}

DicomModel.modalities = {
    "CT": DicomModel.CTImage,
    "PT": DicomModel.PETImage,
    "MR": DicomModel.MRImage,
    "RTIMAGE": DicomModel.RTImage,
    "RTPLAN": DicomModel.RTPlan,
    "RTSTRUCT": DicomModel.RTStructureSet,
    "RTDOSE": DicomModel.RTDose,
    "REG": DicomModel.Registration,
}

DicomModel.parseFile = function(file) {
    var sopInstanceUID = file.get_element(0x00080018).get_value();
    var modality = file.get_element(0x00080060).get_value();
    var obj = DicomModel.modalities[modality](file);
    DicomModel.sopInstanceUIDs[sopInstanceUID] = obj;
    return obj;
}

DicomModel.Patient = function(files) {
    this.files = files;
    this.studies = []
}

DicomModel.Study = function(files) {
    this.series = []
}

DicomModel.Series = function(files) {
    this.files = files;
    this.frameOfReference = this.files[0].get_element(0x00200052).get_value();

    var verifySame = function(tag) {
        return this.files.every(function(file) { return file.get_element(0x00200052).get_value() == this.files[0].ge_element(tag); });
    }
        
    // All files in a series must have some attribute values in common:
    if(!verifySame(0x00200052) || // FrameOfReferenceUID
       !verifySame(0x0020000E) || // SeriesInstanceUID
       !verifySame(0x00080060)) // Modality
    {
        alert("Broken series instantiation!");
        return;
    }

    this.addImages = function(images) {
        
    }
}

DicomModel.FrameOfReference = function(files) {
    this.series = []
}

DicomModel.RTImage = function(files) {
    assert(files.length == 1, "RT Image can only contain one file");
    this.files = files;
    this.plan;
}

DicomModel.RTDose = function(files) {
    assert(files.length == 1, "RT Dose can only contain one file");
    this.files = files;
    this.structureset;
    this.plan;
}

DicomModel.RTStructureSet = function(files) {
    assert(files.length == 1, "RT Structure Set can only contain one file");
    this.files = files;
    this.images = [];
}

DicomModel.Image = function(files) {
}

DicomModel.CTImage = function(files) {
}

DicomModel.RTPlan = function(files) {
    assert(files.length == 1, "RT Plan can only contain one file");
    this.files = files;
    this.structuresets = [];
    this.doses = [];
    this.images = [];
}

DicomModel.RTTreatmentRecord = function(files) {
    throw "Unimplemented IOD"
}

DicomModel.Registration = function(files) {
    this.frameOfReferences = [] // yeye, "drottningens av Saba festmarsch"
}

DicomModel.Fiducials = function(files) {
}

DicomModel.PresentationState = function(files) {
}

DicomModel.SRDocument = function(files) {
}

DicomModel.Waveform = function(files) {
}

DicomModel.MRSpectroscopy = function(files) {
}

DicomModel.RawData = function(files) {
}

DicomModel.EncapsulatedDocument = function(files) {
}

DicomModel.RealWorldValueMapping = function(files) {
}

DicomModel.StereometricRelationship = function(files) {
}

DicomModel.Surface = function(files) {
}

DicomModel.Measurements = function(files) {
}