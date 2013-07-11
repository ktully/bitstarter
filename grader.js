#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var util = require('util');
var rest = require('restler');

var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
//var URL_DEFAULT = "http://damp-castle-5384.herokuapp.com/";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtmlFile = function(htmlfile, checksfile) {
	console.error('Check local: ' + htmlfile);

    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }

    var outJson = JSON.stringify(out, null, 4);
    console.log(outJson);
};


// ktully: build event handler for REST API response
var buildfn = function(checksfile) {
    var check = function(result, response) {
        if (result instanceof Error) {
            console.error('Error: ' + util.format(result.message));
        } else {
        	// process result

		    $ = cheerio.load(result);

		    var checks = loadChecks(checksfile).sort();
		    var out = {};
		    for(var ii in checks) {
		        var present = $(checks[ii]).length > 0;
		        out[checks[ii]] = present;
		    }

		    var outJson = JSON.stringify(out, null, 4);
		    console.log(outJson);
		}
    };
    return check;
};

var checkURL = function(url, checksfile) {
	var check = buildfn(checksfile);
	console.error('Check remote: ' + url);
	rest.get(url).on('complete', check);
};



var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <url>', 'URL to check instead of local file')
        .parse(process.argv);

    if (program.url) checkURL(program.url, program.checks);
    else checkHtmlFile(program.file, program.checks);
} else {
    exports.checkHtmlFile = checkHtmlFile;
    exports.checkURL = checkURL;
}

// TODO: refactor to use common checking
// TODO: ensure only file or URL is passed (or have a priority - maybe file takes precedence) OR even allow both -> list of things to check
// TODO: consider other implementations, e.g. use a new cheerioURL() to synchrononously fetch file (perhaps with request module) and build DOM, removing need for callback