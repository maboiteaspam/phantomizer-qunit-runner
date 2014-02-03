'use strict';

module.exports = function(grunt) {

  var ph_libutil = require("phantomizer-libutil");

  // Qunit task for phantomizer
  // ---------
  grunt.registerMultiTask("phantomizer-qunit-runner",
    "Executes qunit tests in phantomjs", function () {

      // loads dependencies
      var webserver = ph_libutil.webserver;
      var router_factory = ph_libutil.router;
      var optimizer_factory = ph_libutil.optimizer;
      var meta_factory = ph_libutil.meta;

      var grunt_config = grunt.config.get();

      // Default options
      var options = this.options({
        urls:[],
        paths:[],
        inject_assets:false,
        base_url:"",
        port:"",
        ssl_port:"",
        junitDir:null
      });
      grunt.verbose.writeflags(options, 'Options');

      // grunt-contrib-qunit options
      var q_options = {
        all:{
          options: {
            force:true,
            // always null, phantomizer handles it
            inject:null,
            urls: [],
            junitDir:null
          }
        }
      };

      // this task is async
      var done = this.async();

      // adjust the base_url to /some/path/
      var base_url = options.base_url;
      if( base_url.substring(base_url.length-1) == "/" ){
        base_url = base_url.substring(0, base_url.length-1)
      }

      // initialize router by loading urls
      var router = new router_factory(grunt_config.routing);
      router.load(function(){

        grunt.log.ok("Building tests url")

        // collect urls to fetch for testing
        var urls = [];
        if( options.urls && options.urls.length > 0 ){
          urls = collect_urls_from_options(options);
        }else if ( grunt_config.routing ){
          urls = collect_urls_from_config(grunt_config);
        }

        // parse test module urls
        // into a query string
        // push them to qunit options
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

        // if any suitable test url id found
        if( q_options.all.options.urls.length > 0 ){

          // set quint task options
          grunt.config.set("qunit", q_options);

          // starts a new phantomizer webserver
          var meta_manager = new meta_factory(process.cwd(), grunt_config.meta_dir);
          var optimizer = new optimizer_factory(meta_manager, grunt_config, grunt);
          grunt_config.web_paths = options.paths;
          webserver = new webserver(router,optimizer,meta_manager,process.cwd(), grunt_config, grunt);
          webserver.is_phantom(true);
          webserver.enable_dashboard(false);
          webserver.enable_build(false);
          webserver.enable_assets_inject(options.inject_assets);
          webserver.start(options.port, options.ssl_port);

          // register a new stop task to end the webserver after qunit task
          grunt.registerTask('stop', 'Stop the webserver.', function() {
            webserver.stop();
          });

          // install some more logger from phantomjs
          grunt.event.on('qunit.error.onError', function (message, stackTrace) {
            if( stackTrace[0] && !stackTrace[0].file.match(/grunt-contrib-qunit\/phantomjs\/bridge[.]js$/))
              grunt.log.ok("error.onError: " ,stackTrace);
          });

          // execute qunit, then stop webserver
          grunt.task.run(["qunit","stop"]);

        }else{
          grunt.log.error("No urls found to run any tests.");
        }
        // Done
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