'use strict';

module.exports = function(grunt) {

    var ph_libutil = require("phantomizer-libutil");

    grunt.registerMultiTask("phantomizer-qunit-runner", "", function () {

        var webserver = ph_libutil.webserver;

        var router_factory = ph_libutil.router;
        var optimizer_factory = ph_libutil.optimizer;
        var meta_factory = ph_libutil.meta;

        var grunt_config = grunt.config.get();
        var meta_manager = new meta_factory(process.cwd(), grunt_config.meta_dir)
        var optimizer = new optimizer_factory(meta_manager, grunt_config)
        var router = new router_factory(grunt_config.routing);

        var q_options = {
            all:{
                force:true,
                test_scripts_base_url:"/js/tests/",
                options: {
                    urls: []
                }
            }
        }
        var options = this.options({
            urls:[],
            paths:[],
            inject_assets:false,
            base_url:"",
            port:"",
            ssl_port:""
        })
        grunt.verbose.writeflags(options, 'Options');

        var done = this.async();
        router.load(function(){


            grunt_config.log = false;
            grunt_config.web_paths = options.paths;

            webserver = new webserver(router,optimizer,meta_manager,process.cwd(), grunt_config);
            webserver.is_phantom(true);
            webserver.enable_dashboard(false);
            webserver.enable_build(false);
            webserver.enable_assets_inject(options.inject_assets);
            webserver.start(options.port, options.ssl_port);

            var base_url = options.base_url;

            if( base_url.substring(base_url.length-1) == "/" ){
                base_url = base_url.substring(0, base_url.length-1)
            }

            grunt.log.ok("Building testing urls")

            if( options.urls && options.urls.length > 0 ){
                for( var url in options.urls ){
                    var tests = options.urls[url];
                    for( var nn in tests ){
                        var t = tests[nn];
                        t = t.replace("//","/");
                        tests.push(t);
                    }
                    tests = tests.join(",");

                    url = base_url+url;
                    url = url+(url.indexOf("?")>-1?"&":"?");
                    url = url+"spec_files="+tests;
                    //url = url+"&no_dashboard=true"; under windows the & makes bug
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
                        var t = route.tests[nn];
                        t = t.replace("//","/");
                        tests.push(t);
                    }
                    tests = tests.join(",");

                    if( tests.length == 0 ){
                        grunt.log.warn("Mising tests for url "+url)
                    }else{
                        url = base_url+url;
                        url = url+(url.indexOf("?")>-1?"&":"?");
                        url = url+"spec_files="+tests;
                        //url = url+"&no_dashboard=true"; under windows the & makes bug
                        q_options.all.options.urls.push( url );
                    }

                }
            }

            grunt.registerTask('stop', 'Stop the webserver.', function() {
                webserver.stop();
            });

            grunt.event.on('qunit.error.onError', function (message, stackTrace) {
                if( stackTrace[0] && !stackTrace[0].file.match(/grunt-contrib-qunit\/phantomjs\/bridge[.]js$/))
                    grunt.log.ok("error.onError: " ,stackTrace);
            });

            grunt.config.set("qunit", q_options);
            grunt.task.run(["qunit","stop"])
            done();
        });
    });
};