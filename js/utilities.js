function instance_number_sort(filelist) {
    filelist.sort(function(a,b) {
        return a.InstanceNumber - b.InstanceNumber;
    });
}
