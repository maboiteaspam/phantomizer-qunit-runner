'use strict';

module.exports = function(grunt) {

    var ph_libutil = require("phantomizer-libutil");

    grunt.registerMultiTask("phantomizer-qunit-runner", "", function () {

        var webserver = ph_libutil.webserver;
        var router_factory = ph_libutil.router;
        var optimizer_factory = ph_libutil.optimizer;
        var meta_factory = ph_libutil.meta;

        var grunt_config = grunt.config.get();

        var options = this.options({
            urls:[],
            paths:[],
            inject_assets:false,
            base_url:"",
            port:"",
            ssl_port:"",
            junitDir:null
        })
        grunt.verbose.writeflags(options, 'Options');

      var q_options = {
        all:{
          options: {
            force:true,
            inject:null, // no need to inject scripts here, we will inject it by our own in the server, and get it loaded/executed by the browser
            urls: [],
            junitDir:null
          }
        }
      };

        var done = this.async();

      var router = new router_factory(grunt_config.routing);
        router.load(function(){

            var base_url = options.base_url;
            if( base_url.substring(base_url.length-1) == "/" ){
                base_url = base_url.substring(0, base_url.length-1)
            }

            grunt.log.ok("Building tests url")

          var urls = [];
            if( options.urls && options.urls.length > 0 ){
              urls = collect_urls_from_options(options);
            }else if ( grunt_config.routing ){
              urls = collect_urls_from_config(grunt_config);
            }

          for( var url in urls ){
            var tests = urls[url];
            if( tests.length == 0 ){
              grunt.log.warn("Missing tests for "+url)
            }else{
              tests = tests.join(",");
              url = base_url+url;
              url = url+(url.indexOf("?")>-1?"&":"?");
              url = url+"spec_files="+tests;
              //url = url+"&no_dashboard=true"; under windows the & makes bug
              q_options.all.options.urls.push( url );
            }
          }

          if( q_options.all.options.urls.length > 0 ){

            var meta_manager = new meta_factory(process.cwd(), grunt_config.meta_dir);
            var optimizer = new optimizer_factory(meta_manager, grunt_config, grunt);
            grunt_config.web_paths = options.paths;
            webserver = new webserver(router,optimizer,meta_manager,process.cwd(), grunt_config, grunt);
            webserver.is_phantom(true);
            webserver.enable_dashboard(false);
            webserver.enable_build(false);
            webserver.enable_assets_inject(options.inject_assets);
            webserver.start(options.port, options.ssl_port);

            grunt.registerTask('stop', 'Stop the webserver.', function() {
              webserver.stop();
            });

            grunt.event.on('qunit.error.onError', function (message, stackTrace) {
              if( stackTrace[0] && !stackTrace[0].file.match(/grunt-contrib-qunit\/phantomjs\/bridge[.]js$/))
                grunt.log.ok("error.onError: " ,stackTrace);
            });

            grunt.config.set("qunit", q_options);
            grunt.task.run(["qunit","stop"])
          }
            done();
        });
    });

  // helper functions
  // -----------
  function collect_urls_from_options(options){
    var urls = {};
    for( var url in options.urls ){
      var tests = options.urls[url];
      for( var nn in tests ){
        var t = tests[nn];
        t = t.replace("//","/").replace("\\","/");
        tests.push(t);
      }
      urls[url] = tests;
    }
    return urls;
  }
  function collect_urls_from_config(grunt_config){
    var urls = {};
    for( var n in grunt_config.routing ){
      var route = grunt_config.routing[n];

      var url = route.template;
      if( route.test_url ){
        url = route.test_url;
      }

      var tests = [];
      for( var nn in route.tests ){
        var t = route.tests[nn];
        t = t.replace("//","/").replace("\\","/");
        tests.push(t);
      }
      urls[url] = tests;
    }
    return urls;
  }
};