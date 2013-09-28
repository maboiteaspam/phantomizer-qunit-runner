'use strict';

module.exports = function(grunt) {

    grunt.registerMultiTask("phantomizer-qunit-runner", "", function () {

        var ph = require("phantomizer");


        var q_options = {
            all:{
                force:true,
                test_scripts_base_url:"/js/tests/",
                options: {
                    urls: []
                }
            }
        }
        var options = this.options({urls:[]})
        grunt.verbose.writeflags(options, 'Options');

        var webserver = ph.webserver;
        var grunt_config = grunt.config.get();
        grunt_config.log = false;
        grunt_config.web_paths = options.paths;
        webserver = new webserver(process.cwd(), grunt_config);
        webserver.is_phantom(true);
        webserver.enable_dashboard(false);
        webserver.enable_build(false);
        webserver.enable_assets_inject(options.inject_assets);
        webserver.start(options.port, options.ssl_port);

        var base_url = options.base_url;

        if( base_url.substring(base_url.length-1) == "/" ){
            base_url = base_url.substring(0, base_url.length-1)
        }

        if( options.urls && options.urls.length > 0 ){
            for( var url in options.urls ){
                var tests = options.urls[url];
                for( var nn in tests ){
                    tests[nn] = options.test_scripts_base_url+tests[nn]+".js";
                }
                tests = tests.join(",");

                url = base_url+url;
                url = url+(url.indexOf("?")>-1?"&":"?");
                url = url+"spec_files="+tests;
                q_options.all.options.urls.push( url );
            }
        }else if ( grunt_config.routing ){
            for( var n in grunt_config.routing ){
                var route = grunt_config.routing[n];

                var url = route.template;
                if( route.test_url ){
                    url = route.test_url;
                }
                var tests = [];
                for( var nn in route.tests ){
                    tests.push(options.test_scripts_base_url+"/"+route.tests[nn]+".js");
                }
                tests = tests.join(",");

                url = base_url+url;
                url = url+(url.indexOf("?")>-1?"&":"?");
                url = url+"spec_files="+tests;
                q_options.all.options.urls.push( url );
            }
        }

        grunt.registerTask('stop', 'Stop the webserver.', function() {
            webserver.stop();
        });
        grunt.config.set("qunit", q_options);
        grunt.task.run(["qunit","stop"],function(){
        })
    });
};