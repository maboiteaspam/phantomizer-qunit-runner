'use strict';

module.exports = function(grunt) {

  var ph_libutil = require("phantomizer-libutil");

  // Qunit task for phantomizer
  // ---------
  grunt.registerMultiTask("phantomizer-qunit-runner",
    "Executes qunit tests in phantomjs", function () {

      var grunt_config = grunt.config.get();

      // Default options
      var options = this.options({
        // relative or absolute urls to run
        urls:[],
        // paths to use for local webserver
        paths:[],
        // if it is already build, no need to inject assets again
        inject_assets:false,
        base_url:"",
        port:"",
        ssl_port:"",
        qunit_version:"1.13.0",
        format:null,
        outputDir:null,
        // pause the execution for debug
        pause:false
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
            outputDir:options.outputDir,
            format:options.format
          }
        }
      };

      // adjust the base_url to /some/path/
      var base_url = options.base_url;
      if( base_url.substring(base_url.length-1) == "/" ){
        base_url = base_url.substring(0, base_url.length-1)
      }

      // collect urls to fetch for testing
      var urls = {};
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

      grunt.log.ok("Found "+q_options.all.options.urls.length+" url to tests");


      // if any suitable test url id found
      if( q_options.all.options.urls.length == 0 ){

        grunt.log.error("No urls found to run any tests.");

      }else{

        var done = this.async();

        // set quint task options
        grunt.config.set("qunit", q_options);

// get phantomizer main instance
        var Phantomizer = ph_libutil.Phantomizer;
        var phantomizer = new Phantomizer(process.cwd(),grunt);
        phantomizer.create_webserver(options.paths,function(webserver){
          // get the right bridge
          var bridge = "phantomjs-bridge";
          if(options.format == "junit"){
            bridge = "phantomjs-junit-bridge";
          }else if(options.format == "tap"){
            bridge = "phantomjs-tap-bridge";
          }
          webserver.is_phantom(true);
          webserver.enable_dashboard(false);
          webserver.enable_build(false);
          webserver.enable_assets_inject(options.inject_assets);
          webserver.inject_globals({
            qunit:{
              version:options.qunit_version,
              bridge:bridge
            }
          });
          webserver.start(options.port, options.ssl_port);

          // register a new stop task to end the webserver after qunit task
          grunt.registerTask('stop', 'Stop the webserver.', function(done) {
            if( options.pause ){
              readline_toquit(function(){
                webserver.stop(function(){
                  grunt.log.subhead('See you soon !');
                  done();
                });
              })
            }else{
              webserver.stop(function(){
                grunt.log.subhead('See you soon !');
                done();
              });
            }
          });

          // install some more logger from phantomjs
          grunt.event.on('qunit.error.onError', function (message, stackTrace) {
            if( stackTrace[0] && !stackTrace[0].file.match(/grunt-contrib-qunit\/phantomjs\/bridge[.]js$/))
              grunt.log.ok("error.onError: " ,stackTrace);
          });

          // execute qunit, then stop webserver
          grunt.task.run(["qunit","stop"]);

          done();
        });
      }

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

  /**
   * Waits for user to press Enter key,
   * kills remaining webserver,
   * exit
   *
   * @param end_handler
   */
  function readline_toquit( end_handler ){

    var readline = require('readline');
    var rl = readline.createInterface(process.stdin, process.stdout);

    rl.question('Press enter to leave...\n', function(answer) {
      rl.close();
      if( end_handler != null ){
        end_handler()
      }
    });
  }
};