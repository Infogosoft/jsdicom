function instance_number_sort(filelist) {
    filelist.sort(function(a,b) {
            return a.get_element(0x00200013).get_value() < b.get_element(0x00200013).get_value();
        });
}
