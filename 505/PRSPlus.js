var tmp = function() {
	var endsWith = function(str, postfix) {
		return str.lastIndexOf(postfix) === str.length - postfix.length;
	};
	var listFiles = function(path, ext) {
		try {
			var iterator = new FileSystem.Iterator(path);
			try {
				var items = [];
				var item;
				while (item = iterator.getNext()) {
					if (item.type == "file") {
						path = item.path;
						if (ext === undefined || endsWith(path, ext)) {
							items.push(path);
						}
					}
				}
				items.sort();
				return items;
			} finally {
				iterator.close();
			}
		} catch (e) {
			myerror = e;
		}
		return [];
	};
	var getFileContent = function(path) {
		var f = new Stream.File(path, 2);
		var result = f.toString();
		f.close();
		return result;
	};
	
	var corePath = System.applyEnvironment("[prspCorePath]");
	var addonsPath = System.applyEnvironment("[prspAddonsPath]");
	var coreFiles = listFiles(corePath);
	var addonFiles = listFiles(addonsPath);
	var code = "";
	for (var i = 0, n = corePath.length; i < n; i++) {
		code = code + getFileContent(corePath + coreFiles[i]);
	}
	for (var i = 0, n = addonFiles.length; i < n; i++) {
		code = code + getFileContent(addonsPath + addonFiles[i]);
	}
	
	var s = new Stream.File("b:/test.log", 3);
	s.writeString(code);
	s.close();
};
try {
	tmp();
} catch (e) {
	myerror = e;
}

// Name: PRSPlus
// Description: PRS+ startup file 
// Author: kartu
//
// History:
//	2010-03-14 kartu - Refactored to use Core instead of Utils
//	2010-03-17 kartu - Fixed date format to always have the same length
//	2010-03-23 kartu - Replaced hardcoded prsp root with param from kconfig.xml

// Started at, in milliseconds
var startedAt = (new Date()).getTime();
var root = System.applyEnvironment('[prspPath]');
//"/Data/database/system/PRSPlus/";
var config = {
	root: root,
	addonRoot: System.applyEnvironment('[prspAddonsPath]'),
	coreRoot: System.applyEnvironment('[prspCorePath]'),
	coreFile: this.coreRoot + "core_all.js",
	defaultLogLevel: "none",
	logFile: this.addonRoot + "PRSPlus.log",
	settingsRoot: System.applyEnvironment('[prspSettingsPath]')
};

// Typically would be used to override path to addons and logging settings.
var userScript = root + "user.config";
var Core = {
	config: config,
	utils: [],
	actions: [],
	addons: []
};

var log = function (msg) {
	// todo
	if (config.defaultLogLevel !== "none") {
		try {
			var stream = new Stream.File(config.logFile, 1, 0);
		        try {
				// double digit
				var dd = function (n) {
					if (n < 10) {
						return "0" + n;
					} else {
						return n;
					}
		                };


				stream.seek(stream.bytesAvailable);
				var d = new Date();
				var year, month, day, hour, minute, sec;
				year = dd(d.getFullYear());
				month = dd(d.getMonth() + 1);
				day = dd(d.getDate());
				hour = dd(d.getHours());
				minute = dd(d.getMinutes());
				sec = dd(d.getSeconds());
				var dateStr =  year + "-" + month + "-" + day + " " +  hour +
					":" + minute + ":" + sec + "." + d.getMilliseconds();
				stream.writeLine(dateStr + "\t" + msg);
			} catch(ignore) {
			} finally {
			    stream.close();
			}
		} catch (ignore2) {
		}
	}
};

var logTiming = function (msg) {
	 log(msg + ((new Date()).getTime() - startedAt)/1000 + " seconds");
	 startedAt = (new Date()).getTime();
};

var callScript = function (path) {
	try {		
		if(FileSystem.getFileInfo(path)) {
			var f = new Stream.File(path);
			try {
				var fn = new Function("Core", f.toString(), path, 1);
				var result = fn(Core);
				delete fn;
				return result;
			} finally {
				f.close();
			}
		}
	} catch(e) {
		if(log) {
			log("Error calling " + path + ": " + e);
		}
	}
};

// Allows developers to override default paths, trace functions etc
try {
	if (FileSystem.getFileInfo(userScript)) {
		callScript(userScript);
	}
} catch (ignore) {
}


// Returns content of the file <path> as a string.
// If any kind of error happens (file doesn't exist, or is not readable etc) returns <defVal>
//
var getFileContent = function (path, defVal) {
	var stream;
	try {
		stream = new Stream.File(path);
		return stream.toString();
	} catch (whatever) {
	} finally {
		try {
			stream.close();
		} catch (ignore) {
		}
	}
	return defVal;
};

var endsWith = function(str, postfix) {
	return str.lastIndexOf(postfix) === str.length - postfix.length;
};

// Initializes core, starting it either as a single file, or concatenating smaller files
var initializeCore = function(corePath, coreFile) {
	if( FileSystem.getFileInfo(coreFile)) {
		callScript(coreFile);
	} else {
		var iterator = new FileSystem.Iterator(corePath);
		try {
			var item, utils = [], path;
			while (item = iterator.getNext()) {
				if (item.type == "file") {
					path = item.path;
					if (endsWith(path, ".js")) {
						utils.push(path);
					}
				}
			}
			utils.sort();
			
			// Load utils
			var content = "";
			for (var i = 0, n = utils.length; i < n; i++) {
				content += getFileContent(corePath + utils[i], "") + "\n";	
			}
			
			var fn = new Function("Core", content, corePath, 1);
			fn(Core);
			delete fn;		
			
			Core.init();
		} catch (e) {
			log("Error in initializeCore: " + e);
		} finally {
			iterator.close();
		}
	}
};

initializeCore(config.coreRoot, config.coreFile);
delete initializeCore;

// Finished at, in milliseconds
logTiming("PRSPlus initialization took, my error is  " + myerror);