'use strict';

module.exports = function(grunt) {

    grunt.registerTask("phantomizer-qunit-runner", "", function () {


        var ph = require("phantomizer");


        var q_options = {
            all:{
                force:true,
                options: {
                    urls: []
                }
            }
        }
        var options = this.options({urls:[]})
        grunt.verbose.writeflags(options, 'Options');

        var webserver = ph.webserver;
        var grunt_options = grunt.config.get();
        grunt_options.log = false;
        // grunt_options.web_paths.unshift(grunt_options.export_dir);
        webserver = new webserver(process.cwd(), grunt_options);
        webserver.is_phantom(true);
        webserver.enable_dashboard(false);
        webserver.enable_build(false);
        // webserver.enable_assets_inject(false);
        webserver.start(options.port, options.ssl_port);

        var base_url = options.base_url;
        var urls = options.urls;

        if( base_url.substring(base_url.length-1) == "/" ){
            base_url = base_url.substring(0, base_url.length-1)
        }


        for( var url in urls ){
            var tests = urls[url]
            for( var nn in tests ){
                tests[nn] = "/js/tests/"+tests[nn]+".js"
            }
            tests = tests.join(",")

            url = base_url+url;
            url = url+(url.indexOf("?")>-1?"&":"?");
            url = url+"spec_files="+tests;
            q_options.all.options.urls.push( url )
        }


        grunt.registerTask('stop', 'Stop the webserver.', function() {
            webserver.stop();
        });
        grunt.config.set("qunit", q_options);
        grunt.task.run(["qunit","stop"],function(){
        })
    });
};