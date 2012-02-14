//
// Frotz for Sony Reader (600/x50)
// by Ben Chenoweth
//
// Initial version: 2012-01-25
// Changelog:
//	2012-01-28 Ben Chenoweth - Output scrolls automatically
//	2012-01-30 Ben Chenoweth - Changed working directory so that gamesave/load works
//	2012-02-04 Ben Chenoweth - Changed input method
//	2012-02-11 Ben Chenoweth - Changed binary files and fixed output; save/restore games
//	2012-02-12 Ben Chenoweth - Removed timers; added "quit", "restart" and "score" commands
//	2012-02-13 Ben Chenoweth - Added 'quit' labels and functions; fix for nonTouch keyboard

var tmp = function () {
	
	var hasNumericButtons = kbook.autoRunRoot.hasNumericButtons;
	var getSoValue = kbook.autoRunRoot.getSoValue;
	var setSoValue = kbook.autoRunRoot.setSoValue;
	var getFileContent = kbook.autoRunRoot.getFileContent;
	var setFileContent = kbook.autoRunRoot.setFileContent;
	var listFiles = kbook.autoRunRoot.listFiles;
	var deleteFile = kbook.autoRunRoot.deleteFile;
	//var createSimpleMenu = kbook.autoRunRoot.createSimpleMenu;
	//var showMenu = kbook.autoRunRoot.showMenu;
	var shellExec = kbook.autoRunRoot.shellExec;
	
	var datPath = kbook.autoRunRoot.gamesSavePath+'Frotz/';
	FileSystem.ensureDirectory(datPath);
	var tempPath = "/tmp/frotz/";
	FileSystem.ensureDirectory(tempPath);

	var mouseLeave = getSoValue(target.btn_Ok, 'mouseLeave');
	var mouseEnter = getSoValue(target.btn_Ok, 'mouseEnter');
	var shifted = false;
	var shiftOffset = 26;
	var symbols = false;
	var symbolsOffset = 52;
	var keys = [];	
	var strShift = "\u2191"; //up arrow
	var strUnShift = "\u2193"; //down arrow
	var strBack = "\u2190"; //left arrow
	var custSel = 1; // OK key
	var prevSel;
	
	var FROTZ = System.applyEnvironment("[prspPath]") + "dfrotz";
	var FROTZINPUT = tempPath + "frotz.in";
	var FROTZOUTPUT = tempPath + "frotz.out";
	var GAMETITLE = "";
	var workingDir;
	var tempOutput = "";
	var chooseGame = false;
	var savingGame = false;
	var confirmedName = false;
	var restoringGame = false;
	var quittingGame = false;
	var restartingGame = false;
	var scoreCheck = false;
	var saveName = "story.sav";
	var titles = [];
	var pageScroll;
		
	var twoDigits = function (i) {
		if (i<10) {return "0"+i}
		return i;	
	}

	target.loadKeyboard = function () {
		keys[0]="q";
		keys[1]="w";
		keys[2]="e";
		keys[3]="r";
		keys[4]="t";
		keys[5]="y";
		keys[6]="u";
		keys[7]="i";
		keys[8]="o";
		keys[9]="p";
		keys[10]="a";
		keys[11]="s";
		keys[12]="d";
		keys[13]="f";
		keys[14]="g";
		keys[15]="h";
		keys[16]="j";
		keys[17]="k";
		keys[18]="l";
		keys[19]="z";
		keys[20]="x";
		keys[21]="c";
		keys[22]="v";
		keys[23]="b";
		keys[24]="n";
		keys[25]="m";
		keys[26]="Q";
		keys[27]="W";
		keys[28]="E";
		keys[29]="R";
		keys[30]="T";
		keys[31]="Y";
		keys[32]="U";
		keys[33]="I";
		keys[34]="O";
		keys[35]="P";
		keys[36]="A";
		keys[37]="S";
		keys[38]="D";
		keys[39]="F";
		keys[40]="G";
		keys[41]="H";
		keys[42]="J";
		keys[43]="K";
		keys[44]="L";
		keys[45]="Z";
		keys[46]="X";
		keys[47]="C";
		keys[48]="V";
		keys[49]="B";
		keys[50]="N";
		keys[51]="M";
		keys[52]="1";
		keys[53]="2";
		keys[54]="3";
		keys[55]="4";
		keys[56]="5";
		keys[57]="6";
		keys[58]="7";
		keys[59]="8";
		keys[60]="9";
		keys[61]="0";
		keys[62]="%";
		keys[63]="&";
		keys[64]="*";
		keys[65]="(";
		keys[66]=")";
		keys[67]="_";
		keys[68]="+";
		keys[69]=";";
		keys[70]=":";
		keys[71]="!";
		keys[72]="?";
		keys[73]="\"";
		keys[74]="\'";
		keys[75]=",";
		keys[76]=".";
		keys[77]="/";
		keys[78]="~";
		keys[79]="@";
		keys[80]="#";
		keys[81]="$";
		keys[82]="^";
		keys[83]="-";
		keys[84]="`";
		keys[85]="=";
		keys[86]="{";
		keys[87]="}";
		keys[88]="\u00AC";
		keys[89]="\u00A3";
		keys[90]="\u20AC";
		keys[91]="\u00A7";
		keys[92]="\u00A6";
		keys[93]="[";
		keys[94]="]";
		keys[95]="|";
		keys[96]="\\";
		keys[97]="\u00B2";
		keys[98]="\u00B0";
		keys[99]="\u00B5";
		keys[100]="\u00AB";
		keys[101]="\u00BB";
		keys[102]="<";
		keys[103]=">";

		// put keys on buttons
		for (i=1; i<=26; i++) {
			setSoValue(target['key'+twoDigits(i)], 'text', keys[i-1]);
		}
	
		//simplify some labels
		setSoValue(target.BACK, 'text', strBack);
		setSoValue(target.SHIFT, 'text', strShift);
		setSoValue(target.SPACE, 'text', "");
		
		// highlight OK button for nonTouch
		if (hasNumericButtons) {
			custSel = 1;
			target.ntHandleEventsDlg();
		}
		return;
	}
	
	target.init = function () {
		//target.bubble("tracelog","initialising...");
		this.appTitle.setValue(kbook.autoRunRoot._title);
		this.appIcon.u = kbook.autoRunRoot._icon;
		try {
			pageScroll = getSoValue(this.frotzText, 'scrollPage');
		} catch (ignore) { }
		
		this.enable(true);
		this.loadKeyboard();
		
		if (hasNumericButtons) {
			this.touchLabel1.show(false);
		} else {
			this.nonTouch1.show(false);
		}
		
		this.loadGameList();
	}

	target.setOutput = function (output) {
		this.frotzText.setValue(output);
		try {
			pageScroll.call(this.frotzText, true, 1);
		}
		catch (ignore) { }
	}
	
	target.loadGameList = function () {
		var items, filesMissingError, itemNum, noZeroItemNum; //, titles, actions, menu;
		items = listFiles(datPath);
		if (items.length == 0) {
			filesMissingError = "Error:\nThere are no files in the game directory.\nPlease connect your reader to a PC and copy the game files into the Frotz folder located in the PRS+ GamesSave folder."
			this.setOutput(filesMissingError);
			currentLine = "quit";
			target.currentText.setValue(currentLine);
			target.setVariable("current_line",currentLine);
		} else {
			/*titles = []; //TODO?: Fix popup menu
			actions = [];
			for (itemNum = 0; itemNum < items.length; itemNum++) {
				titles.push(items[items.length - itemNum - 1]); // load popup in reverse order
				actions.push( function () {
					kbook.autoRunRoot.sandbox.initialiseGame();
				});
				if (itemNum === '9') break; // popup can only handle 10 entries
			}
			menu = createSimpleMenu(titles, actions);
			showMenu(menu);*/
			titles.length = 0;	
			tempOutput = "Enter the number of the game you want to run:";
			for (itemNum = 0; itemNum < items.length; itemNum++) {
				titles.push(items[itemNum]);
				noZeroItemNum = itemNum + 1;
				tempOutput = tempOutput + "\n" + noZeroItemNum + ": " + items[itemNum];
			}
			this.setOutput(tempOutput);
			chooseGame = true;
			
			// change keyboard to show numbers (and move selection to "1")
			custSel = 7; // "1" when symbols showing
			symbols = true;
			this.refreshKeys();
		}
		
	}
	
	target.initialiseGame = function () {
		var cmd, result;
		if (GAMETITLE !== "") {
			try {
				// delete old output file if it exists
				deleteFile(FROTZOUTPUT);
				
				// create input file (deletes file if it already exists)
				setFileContent(FROTZINPUT, "save\ntemp.sav\nquit\nY\nY\n"); // some games (eg. hhgg) require extra input to end
				
				// create working directory (where savegames go) if it doesn't already exist
				workingDir = datPath + GAMETITLE.substring(0, GAMETITLE.indexOf(".")) + "/";
				FileSystem.ensureDirectory(workingDir);
				
				// delete old temp save if it exists
				deleteFile(workingDir + "temp.sav");
				
				// move to working directory and start FROTZ
				// FROTZ options: -w: character width, -h: number of lines, -R: execute runtime code (cm = compression max)
				cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT;
				shellExec(cmd);
				
				// clear textbox
				tempOutput = "";
				
				this.getResponse();
			} catch(e) {
				tempOutput = tempOutput + "\nError " + e + " initialising game "+GAMETITLE;
				this.setOutput(tempOutput);
			}
		} else {
			tempOutput = tempOutput + "\nError:\nNo valid game title found.";
			this.setOutput(tempOutput);
		}
	}
	
	target.doOK = function () {
		var currentLine, itemNum, stream, timer;
		// get currentLine
		currentLine = target.getVariable("current_line");
		if (chooseGame) {
			// convert input to number and look for respective GAMETITLE
			itemNum = parseInt(currentLine);
			if ((itemNum <= titles.length) && (itemNum > 0)) {
				itemNum--;
				GAMETITLE = titles[itemNum];
				chooseGame = false;
				symbols = false;
				shifted = false;
				this.refreshKeys();
				this.initialiseGame();
			}
		} else {
			if ((savingGame) && (!confirmedName)) {
				// input should be saveName (use existing name if blank)
				if (currentLine !== "") {
					saveName = currentLine;
				}
				if (FileSystem.getFileInfo(workingDir + saveName)) {
					// file exists
					confirmedName = true;
					tempOutput = tempOutput + currentLine + "\nOverwrite existing file? (y/n) ";
					this.setOutput(tempOutput);
				} else {
					// restore temp.sav and then save to user saveName
					deleteFile(FROTZOUTPUT);
					setFileContent(FROTZINPUT, "restore\ntemp.sav\nsave\n"+saveName+"\nquit\nY\nY\n");
					cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT;
					shellExec(cmd);
					savingGame = false;
					tempOutput = tempOutput + currentLine + "\nOK.\n\n>";
					this.setOutput(tempOutput);
				}
			} else if ((savingGame) && (confirmedName)) {
				// input should be Y or N
				if ((currentLine === "Y") || (currentLine === "y")) {
					// restore temp.sav and then save to user saveName (overwriting existing file)
					deleteFile(FROTZOUTPUT);
					setFileContent(FROTZINPUT, "restore\ntemp.sav\nsave\n"+saveName+"\nY\nquit\nY\nY\n");
					cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT;
					shellExec(cmd);
					savingGame = false;
					confirmedName = false;
					tempOutput = tempOutput + currentLine + "\nOK.\n\n>";
					this.setOutput(tempOutput);
				} else {
					savingGame = false;
					confirmedName = false;
					tempOutput = tempOutput + currentLine + "\nFailed.\n\n>";
					this.setOutput(tempOutput);
				}
			} else if (restoringGame) {
				// input should be saveName (use existing name if blank)
				if (currentLine !== "") {
					saveName = currentLine;
				}
				if (FileSystem.getFileInfo(workingDir + saveName)) {
					// restore user saveName and then save to temp.sav
					deleteFile(FROTZOUTPUT);
					setFileContent(FROTZINPUT, "restore\n"+saveName+"\nsave\ntemp.sav\nY\nquit\nY\nY\n");
					cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT + " &";
					shellExec(cmd);
					restoringGame = false;
					tempOutput = tempOutput + currentLine + "\nOK.\n\n>";
					this.setOutput(tempOutput);
				} else {
					restoringGame = false;
					tempOutput = tempOutput + currentLine + "\nFailed.\n\n>";
					this.setOutput(tempOutput);
				}
			} else if (quittingGame) {
				// input should be Y or N
				if ((currentLine === "Y") || (currentLine === "y")) {
					this.doQuit();
				} else {
					quittingGame = false;
					tempOutput = tempOutput + currentLine + "\nOK.\n\n>";
					this.setOutput(tempOutput);
				}
			} else if (restartingGame) {
				// input should be Y or N
				if ((currentLine === "Y") || (currentLine === "y")) {
					restartingGame = false;
					
					// delete old output file if it exists
					deleteFile(FROTZOUTPUT);
					
					// create input file (deletes file if it already exists)
					setFileContent(FROTZINPUT, "save\ntemp.sav\nquit\nY\nY\n");
					
					// delete old temp save
					deleteFile(workingDir + "temp.sav");
					
					// move to working directory and start FROTZ
					// FROTZ options: -w: character width, -h: number of lines, -R: execute runtime code (cm = compression max)
					cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT;
					shellExec(cmd);
					
					// clear textbox
					tempOutput = "";
					
					this.getResponse();
				} else {
					restartingGame = false;
					tempOutput = tempOutput + currentLine + "\nOK.\n\n>";
					this.setOutput(tempOutput);
				}
			} else {
				// check for save/restore commands
				if (currentLine === "save") {
					savingGame = true;
					confirmedName = false;
					tempOutput = tempOutput + currentLine + "\nPlease enter a filename ["+saveName+"]: ";
					this.setOutput(tempOutput);
				} else if (currentLine === "restore") {
					restoringGame = true;
					tempOutput = tempOutput + currentLine + "\nPlease enter a filename ["+saveName+"]: ";
					this.setOutput(tempOutput);
				} else if ((currentLine === "quit") || (currentLine === "exit")) {
					quittingGame = true;
					tempOutput = tempOutput + currentLine + "\nAre you sure you want to quit? (y/n) ";
					this.setOutput(tempOutput);
				} else if (currentLine === "restart") {
					restartingGame = true;
					tempOutput = tempOutput + currentLine + "\nAre you sure you want to restart? (y/n) ";
					this.setOutput(tempOutput);
				} else if (currentLine === "score") {
					// pass special command to FROTZ
					// delete old output file if it exists
					deleteFile(FROTZOUTPUT);
					
					// set up new input file (requires additional RETURN after currentLine for some games, eg. hhgg)
					setFileContent(FROTZINPUT, "restore\ntemp.sav\n" + currentLine + "\n\nsave\ntemp.sav\nY\nquit\nY\nY\n");
					
					// add currentLine to output
					tempOutput = tempOutput + currentLine;
					this.setOutput(tempOutput);
					
					// move to working directory and start FROTZ
					cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT;
					shellExec(cmd);
					
					scoreCheck = true;
					this.getResponse();
				} else {
					// pass command to FROTZ
					// delete old output file if it exists
					deleteFile(FROTZOUTPUT);
					
					// set up new input file
					setFileContent(FROTZINPUT, "restore\ntemp.sav\n" + currentLine + "\nsave\ntemp.sav\nY\nquit\nY\nY\n");
					
					// add currentLine to output
					tempOutput = tempOutput + currentLine;
					this.setOutput(tempOutput);
					
					// move to working directory and start FROTZ
					cmd = "cd " + workingDir + ";" + FROTZ + " -w 62 -h 30 " + datPath + GAMETITLE + " < " + FROTZINPUT + " > " + FROTZOUTPUT;
					shellExec(cmd);
					
					this.getResponse();
				}
			}
		}
		// clear currentLine
		currentLine = "";
		target.currentText.setValue(currentLine);
		target.setVariable("current_line",currentLine);		
		return;
	}
	
	target.getResponse = function () {
		var result;
		//target = this.target;
		//target.timer = null;
		
		result = getFileContent(FROTZOUTPUT, "222");
		if (result !== "222") {
			// output
			if (tempOutput === "") {
				// trim save/quit lines at end of output
				result = result.substring(0, result.indexOf(">"));
				tempOutput = result + ">";
			} else {
				// trim initial/restore lines at start of output
				result = result.substring(result.indexOf(">")+1);
				result = result.substring(result.indexOf(">")+1);
				
				if (scoreCheck) {
					if ((result.indexOf("ENTER") > 0) || (result.indexOf("RETURN") > 0)) {
						// remove bracketed part of output and extra ">"
						result = result.substring(0, result.indexOf("(")) + result.substring(result.indexOf(">")+1);
					}
					scoreCheck = false;
				}
				
				// trim save/quit lines at end of output
				result = result.substring(0, result.indexOf(">"));
				tempOutput = tempOutput + "\n"+result + ">";
			}
		} else {
			// no output file!
			tempOutput = tempOutput + "\nNo output found!";
		}
		this.setOutput(tempOutput);
	}
		
	target.doQuit = function () {
		/*var PSLOG, result, psStrings, PID;
		PSLOG = tempPath + "/ps.log";
		cmd = "ps ax|grep frotz|head -2 > " + PSLOG;
		shellExec(cmd);
		
		result = getFileContent(PSLOG, "2X2");
		//tempOutput = tempOutput + "\nPSLOG:\n"+result;
		//this.setOutput(tempOutput);
		if (result !== "2X2") {
			psStrings = result.split("\n");
			if (psStrings[0]) {
				PID = psStrings[0].split(" ");
				tempOutput = tempOutput + "\nPID[2]:" + PID[2];
				if (psStrings[0].indexOf("grep") == -1) {
					cmd = "kill " + PID[2];
					shellExec(cmd);
				}
				if (psStrings[1]) {
					PID = psStrings[1].split(" ");
					tempOutput = tempOutput + "\nPID[2]:" + PID[2];
					if (psStrings[1].indexOf("grep") == -1) {
						cmd = "kill " + PID[2];
						shellExec(cmd);
					}
				}
			}
		}
		
		// check to see if frotz is still running
		//cmd = "ps ax|grep frotz > /Data/ps.log";
		//shellExec(cmd);*/
		
		// delete temp save
		deleteFile(workingDir + "temp.sav");
		deleteFile(FROTZINPUT);
		deleteFile(FROTZOUTPUT);
		
		kbook.autoRunRoot.exitIf(kbook.model);
		return;
	}

	target.doRoot = function () {
		this.doQuit();
		return;
	}
	
	target.doHold0 = function () {
		this.doQuit();
		return;
	}
	
	target.doMark = function () {
		return;
	}
		
	target.doSize = function () {
		return;
	}
	
	target.doOption = function () {
		return;
	}
	
	target.doMenu = function () {
		return;
	}
	
	target.refreshKeys = function () {
		var i,n,key;
		n = -1;
		if (shifted) {
			n = n + shiftOffset;
			setSoValue(target.SHIFT, 'text', strUnShift);
			mouseEnter.call(target.SHIFT);
			mouseLeave.call(target.SHIFT);
		} else {
			setSoValue(target.SHIFT, 'text', strShift);
			mouseEnter.call(target.SHIFT);
			mouseLeave.call(target.SHIFT);
		}
		if (symbols) {
			n = n + symbolsOffset;
			setSoValue(target.SYMBOL, 'text', "Abc");
			mouseEnter.call(target.SYMBOL);
			mouseLeave.call(target.SYMBOL);
		} else {
			setSoValue(target.SYMBOL, 'text', "Symbols");
			mouseEnter.call(target.SYMBOL);
			mouseLeave.call(target.SYMBOL);
		}
		for (i=1; i<=26; i++) {
			key = 'key'+twoDigits(i);
			setSoValue(target[key], 'text', keys[n+i]);
			mouseEnter.call(target[key]);
			mouseLeave.call(target[key]);
		}
		if (hasNumericButtons) {
			// highlight active key
			this.ntHandleEventsDlg
		}
	}

	target.doSpace = function () {
		// ADD A SPACE
		var currentLine = target.getVariable("current_line");
		currentLine = currentLine + " ";
		target.currentText.setValue(currentLine);
		target.setVariable("current_line",currentLine);
	}

	target.doSymbol = function () {
		symbols = !symbols;
		this.refreshKeys();
	} 

	target.doShift = function () {
		shifted = !shifted;
		this.refreshKeys();
	}	
	
	target.doBack = function () {
		// BACKSPACE
		var currentLine = target.getVariable("current_line");
		currentLine = currentLine.slice(0,currentLine.length-1);
		target.currentText.setValue(currentLine);
		target.setVariable("current_line",currentLine);
	}
	
	target.doKeyPress = function (sender) {
		var id = getSoValue(sender, "id");
		this.addCharacter(id);
		return;
	}
	
	target.addCharacter = function (id) {
		var n = parseInt(id.substring(3, 5));
		if (symbols) { n = n + symbolsOffset };
		if (shifted) { n = n + shiftOffset };
		var character = keys[n-1];
		var currentLine = target.getVariable("current_line");
		currentLine = currentLine + character;
		target.currentText.setValue(currentLine);
		target.setVariable("current_line",currentLine);		
	}

	target.ntHandleEventsDlg = function () {
		if (custSel == 1) {
			mouseEnter.call(target.btn_Ok);
			mouseLeave.call(target.key01);
			mouseLeave.call(target.key02);
			mouseLeave.call(target.key03);
			mouseLeave.call(target.key04);
			mouseLeave.call(target.key05);
			mouseLeave.call(target.key06);
			mouseLeave.call(target.key07);
			mouseLeave.call(target.key08);
			mouseLeave.call(target.key09);
			mouseLeave.call(target.key10);
		}
		if (custSel == 7) {
			mouseEnter.call(target.key01);
			mouseLeave.call(target.key02);
			mouseLeave.call(target.key11);
		}
		if (custSel == 8) {
			mouseLeave.call(target.key01);
			mouseEnter.call(target.key02);
			mouseLeave.call(target.key03);
			mouseLeave.call(target.key12);
		}
		if (custSel == 9) {
			mouseLeave.call(target.key02);
			mouseEnter.call(target.key03);
			mouseLeave.call(target.key04);
			mouseLeave.call(target.key13);
		}
		if (custSel == 10) {
			mouseLeave.call(target.key03);
			mouseEnter.call(target.key04);
			mouseLeave.call(target.key05);
			mouseLeave.call(target.key14);
		}
		if (custSel == 11) {
			mouseLeave.call(target.key04);
			mouseEnter.call(target.key05);
			mouseLeave.call(target.key06);
			mouseLeave.call(target.key15);
		}
		if (custSel == 12) {
			mouseLeave.call(target.key05);
			mouseEnter.call(target.key06);
			mouseLeave.call(target.key07);
			mouseLeave.call(target.key16);
		}
		if (custSel == 13) {
			mouseLeave.call(target.key06);
			mouseEnter.call(target.key07);
			mouseLeave.call(target.key08);
			mouseLeave.call(target.key17);
		}
		if (custSel == 14) {
			mouseLeave.call(target.key07);
			mouseEnter.call(target.key08);
			mouseLeave.call(target.key09);
			mouseLeave.call(target.key18);
		}
		if (custSel == 15) {
			mouseLeave.call(target.key08);
			mouseEnter.call(target.key09);
			mouseLeave.call(target.key10);
			mouseLeave.call(target.key19);
		}
		if (custSel == 16) {
			mouseLeave.call(target.key09);
			mouseEnter.call(target.key10);
			mouseLeave.call(target.btn_Ok);
		}
		if (custSel == 17) {
			mouseLeave.call(target.key01);
			mouseEnter.call(target.key11);
			mouseLeave.call(target.key12);
			mouseLeave.call(target.SHIFT);
		}
		if (custSel == 18) {
			mouseLeave.call(target.key02);
			mouseLeave.call(target.key11);
			mouseEnter.call(target.key12);
			mouseLeave.call(target.key13);
			mouseLeave.call(target.key20);
		}
		if (custSel == 19) {
			mouseLeave.call(target.key03);
			mouseLeave.call(target.key12);
			mouseEnter.call(target.key13);
			mouseLeave.call(target.key14);
			mouseLeave.call(target.key21);
		}
		if (custSel == 20) {
			mouseLeave.call(target.key04);
			mouseLeave.call(target.key13);
			mouseEnter.call(target.key14);
			mouseLeave.call(target.key15);
			mouseLeave.call(target.key22);
		}
		if (custSel == 21) {
			mouseLeave.call(target.key05);
			mouseLeave.call(target.key14);
			mouseEnter.call(target.key15);
			mouseLeave.call(target.key16);
			mouseLeave.call(target.key23);
		}
		if (custSel == 22) {
			mouseLeave.call(target.key06);
			mouseLeave.call(target.key15);
			mouseEnter.call(target.key16);
			mouseLeave.call(target.key17);
			mouseLeave.call(target.key24);
		}
		if (custSel == 23) {
			mouseLeave.call(target.key07);
			mouseLeave.call(target.key16);
			mouseEnter.call(target.key17);
			mouseLeave.call(target.key18);
			mouseLeave.call(target.key25);
		}
		if (custSel == 24) {
			mouseLeave.call(target.key08);
			mouseLeave.call(target.key17);
			mouseEnter.call(target.key18);
			mouseLeave.call(target.key19);
			mouseLeave.call(target.key26);
		}
		if (custSel == 25) {
			mouseLeave.call(target.key09);
			mouseLeave.call(target.key10);
			mouseLeave.call(target.key18);
			mouseEnter.call(target.key19);
		}
		if (custSel == 26) {
			mouseLeave.call(target.key11);
			mouseLeave.call(target.key20);
			mouseEnter.call(target.SHIFT);
			mouseLeave.call(target.SYMBOL);
		}
		if (custSel == 27) {
			mouseLeave.call(target.key12);
			mouseLeave.call(target.SHIFT);
			mouseEnter.call(target.key20);
			mouseLeave.call(target.key21);
			mouseLeave.call(target.SYMBOL);
		}
		if (custSel == 28) {
			mouseLeave.call(target.key13);
			mouseLeave.call(target.key20);
			mouseEnter.call(target.key21);
			mouseLeave.call(target.key22);
			mouseLeave.call(target.SPACE);
		}
		if (custSel == 29) {
			mouseLeave.call(target.key14);
			mouseLeave.call(target.key21);
			mouseEnter.call(target.key22);
			mouseLeave.call(target.key23);
			mouseLeave.call(target.SPACE);
		}
		if (custSel == 30) {
			mouseLeave.call(target.key15);
			mouseLeave.call(target.key22);
			mouseEnter.call(target.key23);
			mouseLeave.call(target.key24);
			mouseLeave.call(target.SPACE);
		}
		if (custSel == 31) {
			mouseLeave.call(target.key16);
			mouseLeave.call(target.key23);
			mouseEnter.call(target.key24);
			mouseLeave.call(target.key25);
			mouseLeave.call(target.SPACE);
		}
		if (custSel == 32) {
			mouseLeave.call(target.key17);
			mouseLeave.call(target.key24);
			mouseEnter.call(target.key25);
			mouseLeave.call(target.key26);
			mouseLeave.call(target.SPACE);
		}
		if (custSel == 33) {
			mouseLeave.call(target.key18);
			mouseLeave.call(target.key19);
			mouseLeave.call(target.key25);
			mouseEnter.call(target.key26);
			mouseLeave.call(target.BACK);
		}
		if (custSel == 34) {
			mouseLeave.call(target.SHIFT);
			mouseLeave.call(target.key20);
			mouseLeave.call(target.SPACE);
			mouseEnter.call(target.SYMBOL);
		}
		if (custSel == 35) {
			mouseLeave.call(target.key21);
			mouseLeave.call(target.key22);
			mouseLeave.call(target.key23);
			mouseLeave.call(target.key24);
			mouseLeave.call(target.key25);
			mouseEnter.call(target.SPACE);
			mouseLeave.call(target.SYMBOL);
			mouseLeave.call(target.BACK);
			mouseLeave.call(target.btn_Ok);
		}	
		if (custSel == 36) {
			mouseLeave.call(target.key26);
			mouseLeave.call(target.SPACE);
			mouseEnter.call(target.BACK);
		}
		return;
	}

	target.moveCursor = function (direction) {
	switch (direction) {
		case "up" : {
			if ((custSel>6) && (custSel<17)) {
				prevSel=custSel;
				custSel=1;
				target.ntHandleEventsDlg();
			} else if ((custSel>16) && (custSel<26)) {
				prevSel=custSel;
				custSel=custSel-10;
				target.ntHandleEventsDlg();
			} else if (custSel==26) {
				prevSel=custSel;
				custSel=17;
				target.ntHandleEventsDlg();				
			} else if ((custSel>26) && (custSel<34)) {
				prevSel=custSel;
				custSel=custSel-9;
				target.ntHandleEventsDlg();
			} else if (custSel==34) {
				prevSel=custSel;
				custSel=26;
				target.ntHandleEventsDlg();				
			} else if (custSel==35) {
				prevSel=custSel;
				custSel=30;
				target.ntHandleEventsDlg();				
			} else if (custSel==36) {
				prevSel=custSel;
				custSel=33;
				target.ntHandleEventsDlg();				
			}
			break
		}
		case "down" : {
			if (custSel==1) {
				prevSel=custSel;
				custSel=16;
				target.ntHandleEventsDlg();
			} else if ((custSel>6) && (custSel<16)) {
				prevSel=custSel;
				custSel=custSel+10;
				target.ntHandleEventsDlg();
			} else if (custSel==16) {
				prevSel=custSel;
				custSel=25;
				target.ntHandleEventsDlg();
			} else if ((custSel>16) && (custSel<24)) {
				prevSel=custSel;
				custSel=custSel+9;
				target.ntHandleEventsDlg();			
			} else if ((custSel==24) || (custSel==25)) {
				prevSel=custSel;
				custSel=33;
				target.ntHandleEventsDlg();			
			} else if ((custSel==26) || (custSel==27)) {
				prevSel=custSel;
				custSel=34;
				target.ntHandleEventsDlg();			
			} else if ((custSel>27) && (custSel<33)) {
				prevSel=custSel;
				custSel=35;
				target.ntHandleEventsDlg();			
			} else if (custSel==33) {
				prevSel=custSel;
				custSel=36;
				target.ntHandleEventsDlg();			
			}
			break
		}
		case "left" : {
			if ((custSel>7) && (custSel<17)) {
				prevSel=custSel;
				custSel--;
				target.ntHandleEventsDlg();	
			} else if ((custSel>17) && (custSel<26)) {
				prevSel=custSel;
				custSel--;
				target.ntHandleEventsDlg();	
			} else if ((custSel>26) && (custSel<34)) {
				prevSel=custSel;
				custSel--;
				target.ntHandleEventsDlg();	
			} else if ((custSel==35) || (custSel==36)) {
				prevSel=custSel;
				custSel--;
				target.ntHandleEventsDlg();	
			}
			break
		}		
		case "right" : {
			if ((custSel>6) && (custSel<16)) {
				prevSel=custSel;
				custSel++;
				target.ntHandleEventsDlg();	
			} else if ((custSel>16) && (custSel<25)) {
				prevSel=custSel;
				custSel++;
				target.ntHandleEventsDlg();	
			} else if ((custSel>25) && (custSel<33)) {
				prevSel=custSel;
				custSel++;
				target.ntHandleEventsDlg();	
			} else if ((custSel==34) || (custSel==35)) {
				prevSel=custSel;
				custSel++;
				target.ntHandleEventsDlg();	
			}
			break
		}
		return;
	  }	
	}
	
	target.doCenterF = function () {
		if (custSel === 1) target.btn_Ok.click();
		if (custSel === 7) target.key01.click();
		if (custSel === 8) target.key02.click();
		if (custSel === 9) target.key03.click();
		if (custSel === 10) target.key04.click();
		if (custSel === 11) target.key05.click();
		if (custSel === 12) target.key06.click();
		if (custSel === 13) target.key07.click();
		if (custSel === 14) target.key08.click();
		if (custSel === 15) target.key09.click();
		if (custSel === 16) target.key10.click();
		if (custSel === 17) target.key11.click();
		if (custSel === 18) target.key12.click();
		if (custSel === 19) target.key13.click();
		if (custSel === 20) target.key14.click();
		if (custSel === 21) target.key15.click();
		if (custSel === 22) target.key16.click();
		if (custSel === 23) target.key17.click();
		if (custSel === 24) target.key18.click();
		if (custSel === 25) target.key19.click();
		if (custSel === 26) target.SHIFT.click();
		if (custSel === 27) target.key20.click();
		if (custSel === 28) target.key21.click();
		if (custSel === 29) target.key22.click();
		if (custSel === 30) target.key23.click();
		if (custSel === 31) target.key24.click();
		if (custSel === 32) target.key25.click();
		if (custSel === 33) target.key26.click();
		if (custSel === 34) target.SYMBOL.click();
		if (custSel === 35) target.SPACE.click();
		if (custSel === 36) target.BACK.click();
		return;
	}

};
tmp();
tmp = undefined;