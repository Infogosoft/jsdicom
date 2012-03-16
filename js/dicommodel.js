/**
* Copyright 2012 Infogosoft
*
* This file is part of jsdicom.
*
* jsdicom is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
*
* jsdicom is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License along with jsdicom. If not, see http://www.gnu.org/licenses/.
*/
// Embryonic impementation of the "DICOM model of the real-world", see 11_03pu.pdf, 64pp
//
// Remaining issues:
//
//  * How shall the classes be instatiated? (e.g. we want image series
//    as a single object, with attributes from the contituent images...)
// 
//  * How much should be implemented for now? Can we signal unimplementedness?
//
//  * Would we want inheritence? Combining modules -> iods? Probably
//    not inheritance, use module builders instead, and let iods be a
//    set of module builders.



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
    var sopInstanceUID = file.SOPInstanceUID;
    var modality = file.Modality;
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
    if(!_verifySame(dcmdict.StudyInstanceUID))
    {
        alert("Broken series instantiation!");
        return;
    }

    this.studyInstanceUID = this.files[0].FrameOfReferenceUID;
}

DicomModel._verifySame = function(files, tag) {
    return files.every(function(file) { return file.get_element(tag).get_value() == files[0].ge_element(tag); });
}

DicomModel.Series = function(files) {
    this.files = files;
        
    // All files in a series must have some attribute values in common:
    if(!_verifySame(dcmdict.FrameOfReferenceUID) || 
       !_verifySame(dcmdict.SeriesInstanceUID) || 
       !_verifySame(dcmdict.Modality))
    {
        alert("Broken series instantiation!");
        return;
    }

    this.frameOfReference = this.files[0].FrameOfReferenceUID;

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
