$(document).ready(function(){
    test("Work with GL Unproject", function() {
        glp = new GLPainter("testcanvas");
        glp.init()
        glp.update_projection_matrix();
        glp.rows = 1024;
        glp.columns = 512;
        var im=glp.unproject([0,0]);
        console.log("im(0,0): " + im);
        im=glp.unproject([glp.canvas.width-0.01,glp.canvas.height-0.01]);
        console.log("im(-1,-1): " + im);
    });
});
