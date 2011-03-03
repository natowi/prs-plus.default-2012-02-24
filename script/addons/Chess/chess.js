//
// Chess for Sony Reader
// by Ben Chenoweth
//
// 2 player mode code extracted (and significantly modified) from HTML Chess, version 1.0 revision #8, by Stefano Gioffre' (http://htmlchess.sourceforge.net/)
// AI code extracted from the main-branch of p4wn (http://p4wn.sourceforge.net/main-branch/)
//
//	2011-01-23 Ben Chenoweth - Updated to fix the graphics issue affecting non-Touch readers; buttons 1-8 now move cursor, which is no longer the hand icon.
//	2011-01-26 Ben Chenoweth - Changed location of promotion piece label; Changed the "what moved" and "from where" sprites
//		(to make them slightly more noticeable on the reader)
//	2011-01-29 Ben Chenoweth - Added AI for computer-calculated moves.  AI is definitely not perfect!  King has a tendency to offensively move into check.
//		At other times, check is not recognised or defended against.  Tracking down these bugs will be (I think) impossible!
//		Perhaps a different AI engine could be utilised instead...
//	2011-01-30 Ben Chenoweth - Fixed the discovering if in checkmate / stalemate issue
//	2011-01-31 Ben Chenoweth - Changed the default AI level to "Medium"
//	2011-02-06 Ben Chenoweth - HOME button now quits game.  There is now an Auto Mode (on by default).  NEXT cycles AI Speed and Auto Mode on/off.
//		1-level undo implemeted (OPTIONS on touch, MENU on non-touch).  Some slight changes made to labels (touch version).
//	2011-02-28 Ben Chenoweth - Changed buttons for non-touch (since 300 does not have NEXT and PREV buttons)
//	2011-03-01 kartu - Reformatted
// 		Moved into a function, to allow variable name optimizations

var tmp = function () {
	var sMovesList;
	var bCheck = false;
	var bGameNotOver = true;
	var lastStart = 0;
	var lastEnd = 0;
	var kings = [0, 0];
	var etc = {
		aBoard: [],
		nPromotion: 0,
		bBlackSide: false,
		lookAt: function (nGetPosX, nGetPosY) {
			return (this.aBoard[nGetPosY * 10 + nGetPosX + 22]);
		}
	};
	var fourBtsLastPc;
	var flagWhoMoved;
	var nFrstFocus;
	var nScndFocus;
	var aParams = [5, 3, 4, 6, 2, 4, 3, 5, 1, 1, 1, 1, 1, 1, 1, 1, 9, 9, 9, 9, 9, 9, 9, 9, 13, 11, 12, 14, 10, 12, 11, 13];
	var cursorX = 0;
	var cursorY = 520;
	
	/* Core workaround 
	var newEvent = prsp.compile("param", "return new Event(param)");
	var hasNumericButtons = kbook.autoRunRoot.hasNumericButtons;
	var getSoValue = kbook.autoRunRoot.getSoValue; */
	var getSoValue, hasNumericButtons, newEvent;
	
	// variables for AI
	var bmove = 0; // the moving player 0=white 8=black
	var moveno = 0; // no of moves  
	var ep = 0; //en passant state (points to square behind takable pawn, ie, where the taking pawn ends up.
	var parsees = 0; //DEV: number of moves read by parser
	var prunees = 0; //DEV: number of parses cut off without evaluation
	var evaluees = 0; //DEV: number of times in treeclimber
	var Bt = 1999;
	var Al = -Bt;
	var comp = new Function('a', 'b', 'return b[0]-a[0]'); //comparison function for treeclimb integer sort (descending)
	var moves = [0, 0, [1, 10],
		[21, 19, 12, 8],
		[11, 9],
		[1, 10, 11, 9],
		[1, 10, 11, 9], 0]; //in order _,p,r,n,b,q,k       
	var castle = [3, 3]; // castle[0] &1 is white's left, castle[0]&2 is right castle
	var kp = [25, 95]; // points to king - to be used in weighting 
	var pv = [0, 1, 5, 3, 3, 9, 63, 0]; // value of various pieces
	var board = []; //where it all happens - a 120 byte array 
	var boardrow = 'g00000000g'; //g stands for off board
	var edgerow = 'gggggggggg';
	var bstring = edgerow + edgerow + "g23456432gg11111111g" + boardrow + boardrow + boardrow + boardrow + "g99999999ggABCDECBAg" + edgerow + edgerow; //in base 35 (g is 16)
	var wstring = boardrow + boardrow + boardrow + "000111100000123321000123553210"; //weighting string -mirror image
	var weight = []; // gets made into centre waiting 
	var weights = [];
	var pw = '000012346900';
	var b_pweights = [];
	var b_weights = []; // central weighting for ordinary pieces.
	var pieces = []; // becomes array of each colours pieces and positions
	var s00 = 3;
	var s0 = 4;
	var s1 = 1;
	var dirs = [10, -10];
	var level = 2; // "Medium"
	var automode = true; // reader controls the black pieces
	
	// 1-level undo
	var oldundo = [];
	var newundo = [];
	
	target.init = function () {
	
		/* temporary Core workaround  for PRS+ v1.1.3 */
	
		if (!kbook || !kbook.autoRunRoot || !kbook.autoRunRoot.getSoValue) {
			if (kbook.simEnviro) { /*Sim without handover code */
				getSoValue = _Core.system.getSoValue;
				hasNumericButtons = _Core.config.compat.hasNumericButtons;
			} else { /* PRS-505 */
				getSoValue = function (obj, propName) {
					return FskCache.mediaMaster.getInstance.call(obj, propName);
				};
				hasNumericButtons = true;
			}
			try {
				var compile = getSoValue(prsp, "compile");
				newEvent = compile("param", "return new Event(param)");
			} catch (ignore) {}
		} else { /* code is ok with PRS-600 */
			getSoValue = kbook.autoRunRoot.getSoValue;
			// newEvent = prsp.compile("param", "return new Event(param)"); // no menu no need for newEvent
			hasNumericButtons = kbook.autoRunRoot.hasNumericButtons;
		}
	
		// hide unwanted graphics
		this.touchHelp.changeLayout(0, 0, uD, 0, 0, uD);
		this.congratulations.changeLayout(0, 0, uD, 0, 0, uD);
		this.selection1.changeLayout(0, 0, uD, 0, 0, uD);
		this.selection2.changeLayout(0, 0, uD, 0, 0, uD);
		this.selection3.changeLayout(0, 0, uD, 0, 0, uD);
	
	
		if (hasNumericButtons) {
			this.BUTTON_RES.show(false);
			this.BUTTON_EXT.show(false);
			this.gridCursor.changeLayout(cursorX, 75, uD, cursorY, 75, uD);
			this.touchButtons2.show(false);
			this.touchButtons3.show(false);
			this.touchButtons4.show(false);
			this.sometext1.show(false);
			this.touchButtons1.show(false);
		} else {
			this.gridCursor.changeLayout(0, 0, uD, 0, 0, uD);
			this.nonTouch.show(false);
			this.nonTouch2.show(false);
			this.nonTouch3.show(false);
			this.nonTouch4.show(false);
			this.nonTouch5.show(false);
			this.nonTouch6.show(false);
			this.nonTouch_colHelp.show(false);
		}
	
		// initialise AI variables
		for (z = 0; z < 8; z++) {
			pv[z + 8] = pv[z] *= 10;
			mz = moves[z]; // should be ref to same array as moves[z]
			if (mz) { // adding in negative version of the move (ie. backwards for white)
				s = mz.length; //probably some better way
				for (x = 0; x < s;) {
					mz[s + x - 1] = -mz[x++];
				}
			}
		}
		for (y = 0; y < 12; y++) {
			for (x = 0; x < 10; x++) {
				z = (y * 10) + x;
				b_pweights[z] = parseInt(pw.charAt(y), 10); //also need to add main weight set at start.
				b_weights[z] = parseInt(wstring.charAt((z < 60) ? z : 119 - z), 35) & 7; // for all the ordinary pieces
				board[z] = parseInt(bstring.charAt(z), 35);
			}
		}
		board[120] = 0;
		this.prepare();
	
		// initiate new game
		this.resetBoard();
		this.writePieces();
	
		// initial undo
		for (x = 0; x < 120; x++) {
			oldundo[x] = etc.aBoard[x];
			newundo[x] = etc.aBoard[x];
		}
		return;
	};
	
	target.resetBoard = function () {
		var iParamId, iPosition;
		iParamId = 0;
		nFrstFocus = fourBtsLastPc = lastStart = lastEnd = 0;
		flagWhoMoved = 8;
	
		// place all pieces in their starting positions (located in the first 32 items of the aParams array)
		for (iPosition = 0; iPosition < 120; iPosition++) {
			etc.aBoard[iPosition] = iPosition % 10 ? iPosition / 10 % 10 < 2 | iPosition % 10 < 2 ? 7 : iPosition / 10 & 4 ? 0 : this.getPcByParams(iParamId++, iPosition - 1) | 16 : 7;
			//this.bubble("tracelog","iPosition="+iPosition+", etc.aBoard="+etc.aBoard[iPosition - 1]);
		}
		sMovesList = "";
	};
	
	target.writePieces = function () {
		var sSqrContent, nSquareId, nMenacedSq, nConst, iCell, pieceId = -1;
		//this.bubble("tracelog","redraw board");
		for (iCell = 0; iCell < 64; iCell++) {
			x = iCell % 8; // find column
			y = Math.floor(iCell / 8); // find row
			nSquareId = (y + 2) * 10 + 2 + x;
			sSqrContent = etc.aBoard[nSquareId];
			//this.bubble("tracelog","iCell="+iCell+", sSqrContent="+sSqrContent);
			if (sSqrContent > 0) {
				pieceId++;
				sSqrContent = sSqrContent - 17;
				if (sSqrContent > 5) {
					// aParams assumes array of characters has two spaces separating black characters from white characters, but we don't
					sSqrContent = sSqrContent - 2;
				}
				this['piece' + pieceId].u = sSqrContent;
				//this.bubble("tracelog","sSqrContent="+sSqrContent+", x="+x+", y="+y);
				this['piece' + pieceId].changeLayout(x * 75, 75, uD, y * 75 + 70, 75, uD);
			}
			if (nSquareId === lastStart) {
				// place selection2 mask over square to indicate previous move start
				this.selection2.changeLayout(x * 75, 75, uD, y * 75 + 70, 75, uD);
			}
			if (nSquareId === lastEnd) {
				// place selection3 mask over square to indicate previous move end
				this.selection3.changeLayout(x * 75, 75, uD, y * 75 + 70, 75, uD);
			}
		}
	
		// hide unwanted pieces
		if (pieceId < 31) {
			do {
				pieceId++;
				this['piece' + pieceId].changeLayout(0, 0, uD, 0, 0, uD);
			} while (pieceId < 31);
		}
	};
	
	target.doSquareClick = function (sender) {
		var id, n, x, y, iPosition, sMove;
		id = getSoValue(sender, "id");
		n = id.substring(6, 8);
		x = n % 8; // find column
		y = Math.floor(n / 8); // find row
		iPosition = (y + 2) * 10 + 2 + x;
		//this.bubble("tracelog","n="+n+", iPosition="+iPosition);
		this.makeSelection(iPosition, false);
		return;
	};
	
	target.makeSelection = function (nSquareId, bFromSolid) {
		var x, y, z, destx, desty, ourRook;
		if (!bGameNotOver) {
			return;
		}
		fourBtsLastPc = etc.aBoard[nSquareId] - 16;
		//this.bubble("tracelog","etc.aBoard[nSquareId]="+etc.aBoard[nSquareId]+", flagWhoMoved="+flagWhoMoved+", fourBtsLastPc="+fourBtsLastPc);	
		if ((fourBtsLastPc > 8) && (!etc.bBlackSide)) {
			if (nFrstFocus) {
				this.squareFocus(nFrstFocus, false);
				nFrstFocus = 0;
			}
			if (!bFromSolid) {
				this.squareFocus(nSquareId, true);
				nFrstFocus = nSquareId;
			}
		} else if (nFrstFocus && (fourBtsLastPc < 9) && !etc.bBlackSide) {
			x = nFrstFocus % 10 - 2;
			y = (nFrstFocus - nFrstFocus % 10) / 10 - 2;
			destx = nSquareId % 10 - 2;
			desty = (nSquareId - nSquareId % 10) / 10 - 2;
			//this.bubble("tracelog","x="+x+", y="+y+", destx="+destx+", desty="+desty);
			if (target.isValidMove(x, y, destx, desty)) {
				for (xundo = 0; xundo < 120; xundo++) {
					oldundo[xundo] = newundo[xundo];
				}
				nScndFocus = nSquareId;
				fourBtsLastPc = etc.aBoard[nFrstFocus] & 15;
	
				// check for pawn promotion
				if ((fourBtsLastPc == 9) && (nScndFocus <= 29)) {
					fourBtsLastPc = 14 - etc.nPromotion;
				}
	
				// update move
				etc.aBoard[nFrstFocus] = 0;
				etc.aBoard[nSquareId] = fourBtsLastPc + 16;
				lastStart = nFrstFocus;
				lastEnd = nSquareId;
	
				// need to handle (white) castling
				nPiece = etc.aBoard[nSquareId];
				nPieceType = nPiece & 7;
				nDiffX = destx - x;
				nDiffY = desty - y;
				xRook = 30 - nDiffX >> 2 & 7;
				ourRook = etc.lookAt(xRook, desty);
				if ((nPieceType == 2) && (nDiffX + 2 | 4) === 4 && nDiffY === 0 && ourRook > 0 && Boolean(ourRook & 16)) {
					etc.aBoard[desty * 10 + xRook + 22] = 0;
					if (destx == 6) {
						etc.aBoard[nSquareId - 1] = ourRook;
					} else if (destx == 2) {
						etc.aBoard[nSquareId + 1] = ourRook;
					}
				}
	
				// need to handle en passent
				flagPcColor = nPiece & 8;
				nWay = 4 - flagPcColor >> 2;
				if ((nPieceType == 1) && (y === 7 + nWay >> 1)) {
					// remove black pawn
					etc.aBoard[nSquareId + 10] = 0;
				}
	
				// remove selections
				this.squareFocus(nFrstFocus, false);
				nFrstFocus = 0;
	
				// redraw board
				this.writePieces();
	
				// check for checkmate
				if (nPieceType == 2) {
					kings[flagPcColor >> 3] = nSquareId;
				} // update location of king when it is moved
				this.getInCheckPieces();
	
				// switch player
				etc.bBlackSide = !etc.bBlackSide;
				flagWhoMoved ^= 8;
				this.messageStatus.setValue("Black's turn");
	
				// update AI board
				z = 0;
				for (y = 20; y < 100; y += 10) {
					for (x = 1; x < 9; x++) {
						z = etc.aBoard[y + x + 1];
						if (z == 25) z = 1;
						if (z == 29) z = 2;
						if (z == 27) z = 3;
						if (z == 28) z = 4;
						if (z == 30) z = 5;
						if (z == 26) z = 6;
						if (z == 17) z = 9;
						if (z == 21) z = 10;
						if (z == 19) z = 11;
						if (z == 20) z = 12;
						if (z == 22) z = 13;
						if (z == 18) z = 14;
						newy = 110 - y;
						board[newy + x] = z;
						// update the position of the kings in the special king array
						if (z == 6) kp[0] = newy + x;
						if (z == 14) kp[1] = newy + x;
					}
				}
				//this.bubble("tracelog","kp="+kp);
				//this.bubble("tracelog","kings="+kings);			
				this.prepare(); // get stuff ready for next move
				moveno++;
	
				if (automode) {
					FskUI.Window.update.call(kbook.model.container.getWindow());
					this.doSize();
				}
			}
		} else if ((fourBtsLastPc > 0) && (fourBtsLastPc < 9) && (etc.bBlackSide)) {
			if (nFrstFocus) {
				this.squareFocus(nFrstFocus, false);
				nFrstFocus = 0;
			}
			if (!bFromSolid) {
				this.squareFocus(nSquareId, true);
				nFrstFocus = nSquareId;
			}
		} else if (nFrstFocus && ((fourBtsLastPc > 8) || (fourBtsLastPc < 0)) && etc.bBlackSide) {
			x = nFrstFocus % 10 - 2;
			y = (nFrstFocus - nFrstFocus % 10) / 10 - 2;
			destx = nSquareId % 10 - 2;
			desty = (nSquareId - nSquareId % 10) / 10 - 2;
			//this.bubble("tracelog","x="+x+", y="+y+", destx="+destx+", desty="+desty);
			if (target.isValidMove(x, y, destx, desty)) {
				nScndFocus = nSquareId;
				fourBtsLastPc = etc.aBoard[nFrstFocus] - 16;
	
				// check for pawn promotion
				if ((fourBtsLastPc == 1) && (nScndFocus >= 90)) {
					fourBtsLastPc = 6 - etc.nPromotion;
				}
	
				// update move
				etc.aBoard[nFrstFocus] = 0;
				etc.aBoard[nSquareId] = fourBtsLastPc + 16;
				lastStart = nFrstFocus;
				lastEnd = nSquareId;
	
				// need to handle (black) castling
				nPiece = etc.aBoard[nSquareId];
				nPieceType = nPiece & 7;
				nDiffX = destx - x;
				nDiffY = desty - y;
				xRook = 30 - nDiffX >> 2 & 7;
				ourRook = etc.lookAt(xRook, desty);
				if ((nPieceType == 2) && (nDiffX + 2 | 4) === 4 && nDiffY === 0 && ourRook > 0 && Boolean(ourRook & 16)) {
					etc.aBoard[desty * 10 + xRook + 22] = 0;
					if (destx == 6) {
						etc.aBoard[nSquareId - 1] = ourRook;
					} else if (destx == 2) {
						etc.aBoard[nSquareId + 1] = ourRook;
					}
				}
	
				// need to handle en passent
				nPiece = etc.aBoard[nSquareId];
				nPieceType = nPiece & 7;
				flagPcColor = nPiece & 8;
				nWay = 4 - flagPcColor >> 2;
				if ((nPieceType == 1) && (y === 7 + nWay >> 1)) {
					// remove white pawn
					etc.aBoard[nSquareId - 10] = 0;
				}
	
				// remove selections
				this.squareFocus(nFrstFocus, false);
				nFrstFocus = 0;
	
				// redraw board
				this.writePieces();
	
				// check for checkmate
				if (nPieceType == 2) {
					kings[flagPcColor >> 3] = nSquareId;
				} // update location of king when it is moved
				this.getInCheckPieces();
	
				// switch player
				etc.bBlackSide = !etc.bBlackSide;
				flagWhoMoved ^= 8;
				this.messageStatus.setValue("White's turn");
	
				// update AI board
				z = 0;
				for (y = 20; y < 100; y += 10) {
					for (x = 1; x < 9; x++) {
						z = etc.aBoard[y + x + 1];
						if (z == 25) z = 1;
						if (z == 29) z = 2;
						if (z == 27) z = 3;
						if (z == 28) z = 4;
						if (z == 30) z = 5;
						if (z == 26) z = 6;
						if (z == 17) z = 9;
						if (z == 21) z = 10;
						if (z == 19) z = 11;
						if (z == 20) z = 12;
						if (z == 22) z = 13;
						if (z == 18) z = 14;
						newy = 110 - y;
						board[newy + x] = z;
						// update the position of the kings in the special king array
						if (z == 6) kp[0] = newy + x;
						if (z == 14) kp[1] = newy + x;
					}
				}
				//this.bubble("tracelog","kp="+kp);
				//this.bubble("tracelog","kings="+kings);
				this.prepare(); // get stuff ready for next move
				moveno++;
				for (xundo = 0; xundo < 120; xundo++) {
					newundo[xundo] = etc.aBoard[xundo];
				}
			}
		}
		return;
	}
	
	target.squareFocus = function (nPieceId, bMakeActive) {
		//var oSelCell = etc.bBlackSide ? ((nPieceId - nPieceId % 10) / 10 - 1 << 3) - nPieceId % 10 : (9 - (nPieceId - nPieceId % 10) / 10 << 3) - 1 + nPieceId % 10;
		var x, y;
		//this.bubble("tracelog","bMakeActive="+bMakeActive);
		if (etc.bBlackSide) {
			x = (nPieceId - 2) % 10;
			y = Math.floor((nPieceId - 22) / 10);
			//this.bubble("tracelog","nPieceId="+nPieceId+", x="+x+", y="+y);
			if (bMakeActive) {
				this['selection1'].changeLayout(x * 75, 75, uD, y * 75 + 70, 75, uD);
			} else {
				this['selection1'].changeLayout(0, 0, uD, 0, 0, uD);
			}
		} else {
			x = (nPieceId - 2) % 10;
			y = Math.floor((nPieceId - 22) / 10);
			//this.bubble("tracelog","nPieceId="+nPieceId+", x="+x+", y="+y);
			if (bMakeActive) {
				this['selection1'].changeLayout(x * 75, 75, uD, y * 75 + 70, 75, uD);
			} else {
				this['selection1'].changeLayout(0, 0, uD, 0, 0, uD);
			}
		}
		return;
	}
	
	target.isValidMove = function (nPosX, nPosY, nTargetX, nTargetY) {
		var startSq, nPiece, endSq, nTarget, nPieceType, flagPcColor, flagTgColor, nWay, nDiffX, nDiffY;
		//this.bubble("tracelog","isValidMove");
		startSq = nPosY * 10 + nPosX + 22;
		nPiece = etc.aBoard[startSq];
		//this.bubble("tracelog","startSq="+startSq+", nPiece="+nPiece);
		if (nPiece === 0) {
			return (true);
		}
		endSq = nTargetY * 10 + nTargetX + 22;
		nTarget = etc.aBoard[endSq];
		//this.bubble("tracelog","endSq="+endSq+", nTarget="+nTarget);
		nPieceType = nPiece & 7;
		flagPcColor = nPiece & 8;
		bHasMoved = Boolean(nPiece & 16 ^ 16);
		flagTgColor = nTarget & 8;
		nWay = 4 - flagPcColor >> 2;
		nDiffX = nTargetX - nPosX;
		nDiffY = nTargetY - nPosY;
		switch (nPieceType) {
		case 1:
			// pawn
			//this.bubble("tracelog","moving pawn");
			if (((nDiffY | 7) - 3) >> 2 !== nWay) {
				return (false);
			}
			if (nDiffX === 0) {
				if ((nDiffY + 1 | 2) !== 2 && (nDiffY + 2 | 4) !== 4) {
					return (false);
				}
				if (nTarget > 0) {
					return (false);
				}
				if (nTargetY === nPosY + (2 * nWay)) {
					if (bHasMoved) {
						return (false);
					}
					if (etc.lookAt(nTargetX, nTargetY - nWay) > 0) {
						return (false);
					}
				}
				if ((nDiffY == -2) && (nPosY != 6)) {
					return (false);
				}
				if ((nDiffY == 2) && (nPosY != 1)) {
					return (false);
				}
			} else if ((nDiffX + 1 | 2) === 2) {
				if (nDiffY !== nWay) {
					return (false);
				}
				if ((nTarget < 1 || flagTgColor === flagPcColor) && ( /* not en passant: */ nPosY !== 7 + nWay >> 1)) {
					return (false);
				}
			} else {
				return (false);
			}
			break;
		case 3:
			// knight
			if (((nDiffY + 1 | 2) - 2 | (nDiffX + 2 | 4) - 2) !== 2 && ((nDiffY + 2 | 4) - 2 | (nDiffX + 1 | 2) - 2) !== 2) {
				return (false);
			}
			if (nTarget > 0 && flagTgColor === flagPcColor) {
				return (false);
			}
			break;
		case 6:
			// queen
			if (nTargetY !== nPosY && nTargetX !== nPosX && Math.abs(nDiffX) !== Math.abs(nDiffY)) {
				return (false);
			}
			break;
		case 5:
			// rook
			if (nTargetY !== nPosY && nTargetX !== nPosX) {
				return (false);
			}
			break;
		case 4:
			// bishop
			if (Math.abs(nDiffX) !== Math.abs(nDiffY)) {
				return (false);
			}
			break;
		case 2:
			// king
			var ourRook;
			if ((nDiffY === 0 || (nDiffY + 1 | 2) === 2) && (nDiffX === 0 || (nDiffX + 1 | 2) === 2)) {
				if (nTarget > 0 && flagTgColor === flagPcColor) {
					return (false);
				}
			} else if (ourRook = etc.lookAt(30 - nDiffX >> 2 & 7, nTargetY), (nDiffX + 2 | 4) === 4 && nDiffY === 0 && !bCheck && !bHasMoved && ourRook > 0 && Boolean(ourRook & 16)) { // castling
				for (var passX = nDiffX * 3 + 14 >> 2; passX < nDiffX * 3 + 22 >> 2; passX++) {
					if (etc.lookAt(passX, nTargetY) > 0 || this.isThreatened(passX, nTargetY, nTargetY / 7 << 3 ^ 1)) {
						return (false);
					}
				}
				if (nDiffX + 2 === 0 && etc.aBoard[nTargetY * 10 + 1 + 22] > 0) {
					return (false);
				}
			} else {
				return (false);
			}
			//this.bubble("tracelog","valid move for king");
			break;
		}
		if (nPieceType === 5 || nPieceType === 6) {
			if (nTargetY === nPosY) {
				if (nPosX < nTargetX) {
					for (var iOrthogX = nPosX + 1; iOrthogX < nTargetX; iOrthogX++) {
						if (etc.lookAt(iOrthogX, nTargetY) > 0) {
							return (false);
						}
					}
				} else {
					for (var iOrthogX = nPosX - 1; iOrthogX > nTargetX; iOrthogX--) {
						if (etc.lookAt(iOrthogX, nTargetY) > 0) {
							return (false);
						}
					}
				}
			}
			if (nTargetX === nPosX) {
				if (nPosY < nTargetY) {
					for (var iOrthogY = nPosY + 1; iOrthogY < nTargetY; iOrthogY++) {
						if (etc.lookAt(nTargetX, iOrthogY) > 0) {
							return (false);
						}
					}
				} else {
					for (var iOrthogY = nPosY - 1; iOrthogY > nTargetY; iOrthogY--) {
						if (etc.lookAt(nTargetX, iOrthogY) > 0) {
							return (false);
						}
					}
				}
			}
			if (nTarget > 0 && flagTgColor === flagPcColor) {
				return (false);
			}
		}
		if (nPieceType === 4 || nPieceType === 6) {
			if (nTargetY > nPosY) {
				var iObliqueY = nPosY + 1;
				if (nPosX < nTargetX) {
					for (var iObliqueX = nPosX + 1; iObliqueX < nTargetX; iObliqueX++) {
						if (etc.lookAt(iObliqueX, iObliqueY) > 0) {
							return (false);
						}
						iObliqueY++;
					}
				} else {
					for (var iObliqueX = nPosX - 1; iObliqueX > nTargetX; iObliqueX--) {
						if (etc.lookAt(iObliqueX, iObliqueY) > 0) {
							return (false);
						}
						iObliqueY++;
					}
				}
			}
			if (nTargetY < nPosY) {
				var iObliqueY = nPosY - 1;
				if (nPosX < nTargetX) {
					for (var iObliqueX = nPosX + 1; iObliqueX < nTargetX; iObliqueX++) {
						if (etc.lookAt(iObliqueX, iObliqueY) > 0) {
							return (false);
						}
						iObliqueY--;
					}
				} else {
					for (var iObliqueX = nPosX - 1; iObliqueX > nTargetX; iObliqueX--) {
						if (etc.lookAt(iObliqueX, iObliqueY) > 0) {
							return (false);
						}
						iObliqueY--;
					}
				}
			}
			if (nTarget > 0 && flagTgColor === flagPcColor) {
				return (false);
			}
		} /* If the king takes the piece that currently has him in check, need to see if that still has him in check  */
		if (nTarget + 6 & 7) {
			var bKingInCheck = false;
			var oKing = nPieceType === 2 ? endSq : kings[flagPcColor >> 3];
			//this.bubble("tracelog","oKing="+oKing+", endSq="+endSq);
			etc.aBoard[startSq] = 0;
			etc.aBoard[endSq] = nPiece;
			if (this.isThreatened(oKing % 10 - 2, (oKing - oKing % 10) / 10 - 2, flagPcColor ^ 8)) {
				bKingInCheck = true;
			}
			etc.aBoard[startSq] = nPiece;
			etc.aBoard[endSq] = nTarget;
			if (bKingInCheck) {
				return (false);
			}
		}
		return (true);
	}
	
	target.isThreatened = function (nPieceX, nPieceY, flagFromColor) {
		//this.bubble("tracelog","isThreatened: flagFromColor="+flagFromColor);
		var iMenacing, bIsThrtnd = false;
		for (var iMenaceY = 0; iMenaceY < 8; iMenaceY++) {
			for (var iMenaceX = 0; iMenaceX < 8; iMenaceX++) {
				iMenacing = etc.aBoard[iMenaceY * 10 + iMenaceX + 22];
				if (iMenacing > 0 && (iMenacing & 8) === flagFromColor && this.isValidMove(iMenaceX, iMenaceY, nPieceX, nPieceY)) {
					bIsThrtnd = true;
					break;
				}
			}
			if (bIsThrtnd) {
				break;
			}
		}
		return (bIsThrtnd);
	}
	
	target.doSelectClick = function (sender) {
		return;
	}
	
	target.doRoot = function (sender) {
		kbook.autoRunRoot.exitIf(kbook.model);
		return;
	}
	
	target.doMark = function (sender) {
		return;
	}
	
	target.doUndo = function (sender) {
		// revert board back to oldundo state
		for (xundo = 0; xundo < 120; xundo++) {
			etc.aBoard[xundo] = oldundo[xundo];
		}
		this.writePieces();
	
		// update AI board
		z = 0;
		for (y = 20; y < 100; y += 10) {
			for (x = 1; x < 9; x++) {
				z = etc.aBoard[y + x + 1];
				if (z == 25) z = 1;
				if (z == 29) z = 2;
				if (z == 27) z = 3;
				if (z == 28) z = 4;
				if (z == 30) z = 5;
				if (z == 26) z = 6;
				if (z == 17) z = 9;
				if (z == 21) z = 10;
				if (z == 19) z = 11;
				if (z == 20) z = 12;
				if (z == 22) z = 13;
				if (z == 18) z = 14;
				newy = 110 - y;
				board[newy + x] = z;
				// update the position of the kings in the special king array
				if (z == 6) kp[0] = newy + x;
				if (z == 14) kp[1] = newy + x;
			}
		}
		this.prepare(); // get stuff ready for next move
		moveno = moveno - 2;
	
		// remove what moved highlights
		this['selection1'].changeLayout(0, 0, uD, 0, 0, uD);
		this['selection2'].changeLayout(0, 0, uD, 0, 0, uD);
		this['selection3'].changeLayout(0, 0, uD, 0, 0, uD);
	
		// make sure it is White's turn
		etc.bBlackSide = false;
		flagWhoMoved = 8;
		this.messageStatus.setValue("White's turn");
		for (xundo = 0; xundo < 120; xundo++) {
			newundo[xundo] = oldundo[xundo];
		}
		bGameNotOver = true;
		return;
	}
	
	target.getInCheckPieces = function () {
		var iExamX, iExamY, iExamPc, bNoMoreMoves = true,
			myKing = kings[flagWhoMoved >> 3 ^ 1];
	
		bCheck = this.isThreatened(myKing % 10 - 2, (myKing - myKing % 10) / 10 - 2, flagWhoMoved);
		//if (bCheck) { this.bubble("tracelog","Check!"); }
	
		for (var iExamSq = 22; iExamSq <= 99; iExamSq++) {
			if (iExamSq % 10 < 2) {
				continue;
			}
			//this.bubble("tracelog","iExamSq="+iExamSq);
			iExamX = (iExamSq - 2) % 10;
			iExamY = Math.floor((iExamSq - 22) / 10);
			//iExamX = iExamSq % 10 - 2;
			//iExamY = (iExamSq - iExamSq % 10) / 10 - 2;
			iExamPc = etc.aBoard[iExamSq];
			if (bNoMoreMoves && iExamPc > 0 && (iExamPc & 8 ^ 8) === flagWhoMoved) {
				//this.bubble("tracelog","Piece "+iExamPc+" found at="+iExamSq);
				for (var iWaySq = 22; iWaySq <= 99; iWaySq++) {
					if (iWaySq % 10 < 2) {
						continue;
					}
					//this.bubble("tracelog","iWaySq="+iWaySq);
					iTempX = (iWaySq - 2) % 10;
					iTempY = Math.floor((iWaySq - 22) / 10);
					if (this.isValidMove(iExamX, iExamY, iTempX, iTempY)) {
						bNoMoreMoves = false;
						break;
					}
				}
			}
		}
		if (bNoMoreMoves) {
			if (bCheck) {
				var sWinner = etc.bBlackSide ? "Black" : "White";
				this.messageStatus.setValue("Checkmate! " + sWinner + " wins.");
				bGameNotOver = false;
				sMovesList = sMovesList.rethis(); // this line is necessary to make it work!  (Is it because it causes the thread to exit unexpectedly?)
			} else {
				this.messageStatus.setValue("Stalemate!");
				bGameNotOver = false;
				sMovesList = sMovesList.rethis(); // this line is necessary to make it work!  (Is it because it causes the thread to exit unexpectedly?)
			}
		} else {
			bGameNotOver = true;
		}
		return;
	}
	
	target.getPcByParams = function (nParamId, nWhere) {
		var nPieceId = aParams[nParamId];
		if ((nPieceId & 7) === 2) {
			kings[nParamId >> 3 & 1] = nWhere + 1;
		}
		return (nPieceId);
	}
	
	target.doButtonClick = function (sender) {
		var id;
		id = getSoValue(sender, "id");
		n = id.substring(7, 10);
		if (n == "RES") {
			// initiate new game
			this.resetBoard();
			bGameNotOver = true;
			this.messageStatus.setValue("White's turn");
			this.selection1.changeLayout(0, 0, uD, 0, 0, uD);
			this.selection2.changeLayout(0, 0, uD, 0, 0, uD);
			this.selection3.changeLayout(0, 0, uD, 0, 0, uD);
			etc.bBlackSide = false;
	
			// initialise AI variables
			bmove = 0;
			moveno = 0;
			ep = 0;
			parsees = 0;
			prunees = 0;
			evaluees = 0;
			Bt = 1999;
			Al = -Bt;
			castle = [3, 3];
			kp = [25, 95];
			board = [];
			weight = [];
			weights = [];
			b_pweights = [];
			b_weights = [];
			pieces = [];
			s00 = 3;
			s0 = 4;
			s1 = 1;
			dirs = [10, -10];
	
			for (y = 0; y < 12; y++) {
				for (x = 0; x < 10; x++) {
					z = (y * 10) + x;
					b_pweights[z] = parseInt(pw.charAt(y)); //also need to add main weight set at start.
					b_weights[z] = parseInt(wstring.charAt((z < 60) ? z : 119 - z), 35) & 7; // for all the ordinary pieces
					board[z] = parseInt(bstring.charAt(z), 35);
				}
			}
			board[120] = 0;
			this.prepare();
			this.writePieces();
	
			// initial undo
			for (x = 0; x < 120; x++) {
				oldundo[x] = etc.aBoard[x];
				newundo[x] = etc.aBoard[x];
			}
			return;
		}
		if (n == "EXT") {
			kbook.autoRunRoot.exitIf(kbook.model);
			return;
		}
	}
	
	target.moveCursor = function (dir) {
		switch (dir) {
		case "down":
			{
				cursorY += 75;
				if (cursorY > 595) {
					cursorY = 70;
				}
				break;
			}
		case "up":
			{
				cursorY -= 75;
				if (cursorY < 70) {
					cursorY = 595;
				}
				break;
			}
		case "left":
			{
				cursorX -= 75;
				if (cursorX < 0) {
					cursorX = 525;
				}
				break;
			}
		case "right":
			{
				cursorX += 75;
				if (cursorX > 525) {
					cursorX = 0;
				}
				break;
			}
		}
		this.gridCursor.changeLayout(cursorX, 75, uD, cursorY, 75, uD);
	}
	
	target.cursorClick = function () {
		var x, y, iPosition, sMove;
		x = cursorX / 75; // find column
		y = (cursorY - 70) / 75; // find row
		iPosition = (y + 2) * 10 + 2 + x;
		//this.bubble("tracelog","n="+n+", iPosition="+iPosition);
		this.makeSelection(iPosition, false);
		return;
	}
	
	target.digitF = function (key) {
		if ((key > 0) && (key < 9)) {
			cursorX = (key - 1) * 75;
			this.gridCursor.changeLayout(cursorX, 75, uD, cursorY, 75, uD);
		}
		if (key == 9) {
			etc.nPromotion++;
			if (etc.nPromotion == 4) {
				etc.nPromotion = 0;
			}
			if (etc.nPromotion == 0) {
				this.nonTouch5.setValue("[9] Pawn promotion to: Queen");
			}
			if (etc.nPromotion == 1) {
				this.nonTouch5.setValue("[9] Pawn promotion to: Rook");
			}
			if (etc.nPromotion == 2) {
				this.nonTouch5.setValue("[9] Pawn promotion to: Bishop");
			}
			if (etc.nPromotion == 3) {
				this.nonTouch5.setValue("[9] Pawn promotion to: Knight");
			}
			return;
		}
		if (key == 0) {
			// This indicates the AI level. It can be 1: "very stupid", 2: "slow, stupid", or 3: "very slow".
			level++;
			if (level == 4) {
				level = 1;
				automode = !automode;
			}
			if (level == 1) {
				if (automode) {
					this.nonTouch6.setValue("[0] AI speed: Fast (Auto ON)");
				} else {
					this.nonTouch6.setValue("[0] AI speed: Fast (Auto OFF)");
				}
			}
			if (level == 2) {
				if (automode) {
					this.nonTouch6.setValue("[0] AI speed: Medium (Auto ON)");
				} else {
					this.nonTouch6.setValue("[0] AI speed: Medium (Auto OFF)");
				}
			}
			if (level == 3) {
				if (automode) {
					this.nonTouch6.setValue("[0] AI speed: Slow (Auto ON)");
				} else {
					this.nonTouch6.setValue("[0] AI speed: Slow (Auto OFF)");
				}
			}
		}
		return;
	}
	
	target.doHold9 = function () {
		// initiate new game
		this.resetBoard();
		this.writePieces();
		bGameNotOver = true;
		this.messageStatus.setValue("White's turn");
		this.selection1.changeLayout(0, 0, uD, 0, 0, uD);
		this.selection2.changeLayout(0, 0, uD, 0, 0, uD);
		this.selection3.changeLayout(0, 0, uD, 0, 0, uD);
		cursorX = 0;
		cursorY = 520;
		this.gridCursor.changeLayout(cursorX, 75, uD, cursorY, 75, uD);
		etc.bBlackSide = false;
	
		// initialise AI variables
		bmove = 0;
		moveno = 0;
		ep = 0;
		parsees = 0;
		prunees = 0;
		evaluees = 0;
		Bt = 1999;
		Al = -Bt;
		castle = [3, 3];
		kp = [25, 95];
		board = [];
		weight = [];
		weights = [];
		b_pweights = [];
		b_weights = [];
		pieces = [];
		s00 = 3;
		s0 = 4;
		s1 = 1;
		dirs = [10, -10];
	
		for (y = 0; y < 12; y++) {
			for (x = 0; x < 10; x++) {
				z = (y * 10) + x;
				b_pweights[z] = parseInt(pw.charAt(y)); //also need to add main weight set at start.
				b_weights[z] = parseInt(wstring.charAt((z < 60) ? z : 119 - z), 35) & 7; // for all the ordinary pieces
				board[z] = parseInt(bstring.charAt(z), 35);
			}
		}
		board[120] = 0;
		this.prepare();
		this.writePieces();
	
		// initial undo
		for (x = 0; x < 120; x++) {
			oldundo[x] = etc.aBoard[x];
			newundo[x] = etc.aBoard[x];
		}
		return;
	}
	
	target.doHold0 = function () {
		kbook.autoRunRoot.exitIf(kbook.model);
		return;
	}
	
	target.doNext = function () {
		if (hasNumericButtons) {
			this.moveCursor("right");
			return;
		}
		// This indicates the AI level. It can be 1: "very stupid", 2: "slow, stupid", or 3: "very slow".
		level++;
		if (level == 4) {
			level = 1;
			automode = !automode;
		}
		if (level == 1) {
			if (automode) {
				this.touchButtons1.setValue("[Next] AI speed: Fast (Auto ON)");
			} else {
				this.touchButtons1.setValue("[Next] AI speed: Fast (Auto OFF)");
			}
		}
		if (level == 2) {
			if (automode) {
				this.touchButtons1.setValue("[Next] AI speed: Medium (Auto ON)");
			} else {
				this.touchButtons1.setValue("[Next] AI speed: Medium (Auto OFF)");
			}
		}
		if (level == 3) {
			if (automode) {
				this.touchButtons1.setValue("[Next] AI speed: Slow (Auto ON)");
			} else {
				this.touchButtons1.setValue("[Next] AI speed: Slow (Auto OFF)");
			}
		}
		return;
	}
	
	target.doPrev = function () {
		if (hasNumericButtons) {
			this.moveCursor("left");
			return;
		}
		etc.nPromotion++;
		if (etc.nPromotion == 4) {
			etc.nPromotion = 0;
		}
		if (etc.nPromotion == 0) {
			this.sometext1.setValue("[Prev] Pawn promotion to: Queen");
		}
		if (etc.nPromotion == 1) {
			this.sometext1.setValue("[Prev] Pawn promotion to: Rook");
		}
		if (etc.nPromotion == 2) {
			this.sometext1.setValue("[Prev] Pawn promotion to: Bishop");
		}
		if (etc.nPromotion == 3) {
			this.sometext1.setValue("[Prev] Pawn promotion to: Knight");
		}
		return;
	}
	
	target.doSize = function () {
		var x, y, z, newy;
		if (!bGameNotOver) {
			return;
		}
		if (!etc.bBlackSide) {
			for (xundo = 0; xundo < 120; xundo++) {
				oldundo[xundo] = newundo[xundo];
			}
		}
		// call AI routine to calculate move for whichever player is currently supposed to be making a move
		if (this.findmove()) {
			// update aBoard
			z = 0;
			for (y = 20; y < 100; y += 10) {
				for (x = 1; x < 9; x++) {
					z = board[y + x];
					if (z == 1) z = 25;
					if (z == 2) z = 29;
					if (z == 3) z = 27;
					if (z == 4) z = 28;
					if (z == 5) z = 30;
					if (z == 6) z = 26;
					if (z == 9) z = 17;
					if (z == 10) z = 21;
					if (z == 11) z = 19;
					if (z == 12) z = 20;
					if (z == 13) z = 22;
					if (z == 14) z = 18;
					newy = 110 - y;
					etc.aBoard[newy + x + 1] = z;
					// update the position of the kings in the special king array
					if (z == 26) kings[1] = newy + x + 1;
					if (z == 18) kings[0] = newy + x + 1;
				}
			}
			this.writePieces();
	
			if (!etc.bBlackSide) {
				for (xundo = 0; xundo < 120; xundo++) {
					newundo[xundo] = etc.aBoard[xundo];
				}
			}
			// check for checkmate / stalemate
			this.getInCheckPieces();
			if (bGameNotOver) {
				flagWhoMoved ^= 8;
				etc.bBlackSide = !etc.bBlackSide;
				this.getInCheckPieces();
				flagWhoMoved ^= 8;
				etc.bBlackSide = !etc.bBlackSide;
			}
	
			if ((bGameNotOver) && (automode) && (etc.bBlackSide)) {
				FskUI.Window.update.call(kbook.model.container.getWindow());
				this.doSize();
			}
	
			//this.bubble("tracelog","kp="+kp);
			//this.bubble("tracelog","kings="+kings);
		} else {
			// check for checkmate / stalemate
			this.getInCheckPieces();
			if (bGameNotOver) {
				flagWhoMoved ^= 8;
				etc.bBlackSide = !etc.bBlackSide;
				this.getInCheckPieces();
				flagWhoMoved ^= 8;
				etc.bBlackSide = !etc.bBlackSide;
			}
		}
		return;
	}
	
	// AI functions
	target.treeclimber = function (count, bm, sc, s, e, alpha, beta, EP) {
		//this.bubble("tracelog","Entering treeclimber... count="+count+", bm="+bm+", sc="+sc+", s="+s+", e="+e+", alpha="+alpha+", beta="+beta+", EP="+EP);
		var z = -1;
		sc = -sc;
		var nbm = 8 - bm;
		if (sc < -400) {
			//this.bubble("tracelog","Leaving treeclimber...");
			return [sc, s, e]; //if king taken, no deepening.
		}
	
		var b = Al; //best move starts at -infinity    
		var S, E = board[e];
		board[e] = S = board[s];
		board[s] = 0;
		//rather than trying to track changes
		//parse checks to see if each one is still there
		if (S) pieces[nbm][pieces[nbm].length] = [S, e];
	
		//now some stuff to handle queening, castling
		var rs, re;
		if (S & 7 == 1 && board[e + dirs[bm >> 3]] > 15) {
			board[e] += 4 - queener; //queener is choice for pawn queening
		}
		if (S & 7 == 6 && (s - e == 2 || e - s == 2)) { //castling - move rook too
			rs = s - 4 + (s < e) * 7;
			re = (s + e) >> 1; //avg of s,e=rook's spot
			board[rs] = 0;
			board[re] = bm + 2;
		}
	
		//this.bubble("tracelog","Made it this far. bm="+bm+", EP="+EP+", sc="+sc);
	
		var movelist;
		var movecount;
		var mv;
		movelist = this.parse(bm, EP, sc);
		movecount = movelist.length;
		parsees += movecount;
		evaluees++;
		if (movecount) {
			if (count) {
				//BRANCH NODES 
				var t;
				var cmp = comp;
	
				movelist.sort(cmp); //descending order
				count--;
				best = movelist[0];
				var bs = best[1];
				var be = best[2];
				b = -this.treeclimber(count, nbm, best[0], bs, be, -beta, -alpha, best[3])[0];
	
				//	best[0]=b;
				for (z = 1; z < movecount; z++) {
	
					if (b > alpha) alpha = b; //b is best
					//alpha is always set to best or greater.
	
					mv = movelist[z];
					// try now with empty window - assuming fail.
					t = -this.treeclimber(count, nbm, mv[0], mv[1], mv[2], -alpha - 1, -alpha, mv[3])[0];
					if ((t > alpha) && (t < beta)) {
						// but if not fail, now look for the actual score.
						// which becomes new best.
						t = -this.treeclimber(count, nbm, mv[0], mv[1], mv[2], -beta, -t, mv[3])[0];
					}
	
					if (t > b) {
						// if this move is still better than best,
						// it becomes best. 
						b = t;
						bs = mv[1];
						be = mv[2];
						//		best[0]=b;
						// and alpha becomes this score,
						// and if this is better than beta, stop looking.
						if (t > alpha) alpha = t;
						if (b > beta) {
							// if best > beta, other side won't have it.
							break;
						}
					}
				}
			} else {
				b = Al;
				//LEAF NODES
				while (--movecount && beta > b) {
					if (movelist[movecount][0] > b) {
						b = movelist[movecount][0];
					}
				}
			}
		}
		if (rs) {
			board[rs] = bm + 2;
			board[re] = 0;
		}
		board[s] = S;
		board[e] = E;
		pieces[nbm].length--;
	
		//this.bubble("tracelog","Leaving treeclimber...");
		return [b, bs, be];
	}
	
	//*************************************making moves
	target.findmove = function () {
		var s, e, pn, themove, sb, bs;
		evaluees = parsees = prunees = 0;
	
		if (etc.bBlackSide) {
			bmove = 8;
		} else {
			bmove = 0;
		}
		//this.bubble("tracelog","Finding a move for "+bmove);
		themove = this.treeclimber(level, bmove, 0, 120, 120, Al, Bt, ep);
		pn = themove[0];
		s = themove[1];
		e = themove[2];
	
		//this.bubble("tracelog","pn="+pn+", s="+s+", e="+e);
	
	/*    //testing this here
	    var test=0;
	    var p=this.parse(bmove,ep,0);  
	    for (z=0;z<p.length;z++){
		var t=p[z];
		test= test || (s==t[1] && e==t[2]);
	    }
	    if (!test) {
		going=0;
		debug ('no such move in findmove!',p,'\ns e',s,e);
	    }
	    //end test
	    */
	
		return this.move(s, e, 0, pn);
	}
	
	target.move = function (s, e, queener, score) {
		var E = board[e];
		var S = board[s];
		var a = S & 7;
		var bmx = bmove >> 3;
		var dir = dirs[bmx];
		var x = s % 10;
		//    var tx=e%10;
		//    var ty=e-tx;
		var gap = e - s;
		var ch;
		var test = 0;
	
		//test if this move is legal
		var p = this.parse(bmove, ep, 0);
		for (z = 0; z < p.length; z++) {
			var t = p[z];
			test = test || (s == t[1] && e == t[2]);
		}
		if (!test) {
			going = 0;
			this.messageStatus.setValue("No such move...");
			return 0;
		}
	
		var themove;
	
		// now see whether in check after this move, by getting the best reply.  
		board[e] = S;
		board[s] = 0;
		p = pieces[bmove];
		for (z = 0; z < p.length; z++) {
			if (p[z][1] == s) p[z][1] = e;
		}
	
		themove = this.treeclimber(0, 8 - bmove, 0, 120, 120, Al, Bt, ep);
		if (themove[0] > 400) {
			//this.bubble("tracelog","in check");
			return false;
		}
	
		//if got this far, the move is accepted. 
		// there is no turning back
	
		//this.bubble("tracelog","Move: s="+s+", e="+e+", score="+score);
	
		// now see if it is check and/or mate
		// but first move the piece
	
		//now assume null opposition move, to see if putting in check
		//note passing s,e to treeclimber instead of shifiting it would not
		//work, because the move gets appended to the opponent of the treeclimbing one.
	
		p = pieces[bmove];
		for (z = 0; z < p.length; z++) {
			if (p[z][1] == s) p[z][1] = e;
		}
	
	/* the following checks have been skipped
	    themove=this.treeclimber(0,bmove,0,120,120,Al,Bt,ep);
	    if (themove[0]>400){
			//this.bubble("tracelog","check");
			ch=1;
	    }
	    //that's check. But if it is still check after opposition move
	    // then it's checkmate.
	    // and if it isn't check before opposition's best move, it's stalemate.
	    if(this.treeclimber(1,8-bmove,0,120,120,Al,Bt,ep)[0]<-400){
			going=0;
			if(ch==1){
				var sWinner = etc.bBlackSide ? "Black" : "White";
				this.messageStatus.setValue("Checkmate! "+sWinner+" wins.");
			}else{
				this.messageStatus.setValue("Stalemate!");
			}
			bGameNotOver = false;
	    }
		*/
	
		//finished those checks, put board back in place.
		board[s] = S;
		board[e] = E;
	
		//Now it's a matter of saving changed state (enpassant, castling, and queening.)
		ep = 0; // ep reset
		if (a == 1) { // pawns
			if (board[e + dir] > 15) board[s] += 4 - queener; //queener is choice for pawn queening
			if (e == s + 2 * dir && (board[e - 1] & 1 || board[e + 1] & 1)) ep = s + dir; //set up ep - with pawn test to save time in parse loop
			if (!E && (s - e) % 10) this.shift(e, e - dir); // blank ep pawn
		}
		if (s == 21 + bmx * 70 || s == 28 + bmx * 70) castle[bmx] &= (x < 5) + 1; //castle flags (blank on any move from rook points)
		if (a == 6) {
			kp[bmx] = e; //king position for fancy weighting 
			if (gap * gap == 4) { //castling - move rook too
				//if (!this.check(s,8-bmove,dir,gap>>1))return false
				this.shift(s - 4 + (s < e) * 7, s + gap / 2);
			}
			castle[bmx] = 0;
		}
	
		this.shift(s, e);
		this.prepare(); // get stuff ready for next move
		moveno++;
	
		// the move is done 
		//so give the other side a turn.
		etc.bBlackSide = !etc.bBlackSide;
		flagWhoMoved ^= 8;
		if (!etc.bBlackSide) this.messageStatus.setValue("White's turn");
		if (etc.bBlackSide) this.messageStatus.setValue("Black's turn");
	
		//find location of the start and end places of the piece that just moved
		tempdiv = Math.floor(s / 10) * 10;
		lastStart = 110 - tempdiv + s % 10 + 1;
		tempdiv = Math.floor(e / 10) * 10;
		lastEnd = 110 - tempdiv + e % 10 + 1;
	
		return 1;
	}
	
	target.prepare = function () {
		var z, BM;
		//this.bubble("tracelog","Preparing for move...");
	
		if (!(moveno & 7) && s0 > 1) s0--; //every 4 moves for first 20, s0 decreases.
		s1 = (moveno >> 4) & 1; //every sixteen moves s1 increases
		pieces[0] = [];
		pieces[8] = [];
		kweights = [];
		pweights = [
			[],
			[]
		];
		for (z = 21; z < 99; z++) {
			// get moveno, and work out appropriate weightings from it.
			// using base weightings.       	
			a = board[z];
			if (a & 7) {
				pieces[a & 8][pieces[a & 8].length] = [a, z];
			}
			weights[z] = b_weights[z] * s0;
			kweights[z] = (moveno > 40) || (10 - 2 * b_weights[z]) * s0; // while moveno <= 40, weight to edge. 
			pweights[1][119 - z] = pweights[0][z] = b_pweights[z]; //centralising for first 8 moves, then forwards only.
			if (moveno < 5 && z > 40) pweights[0][z] = pweights[1][119 - z] += (Math.random() * weights[z]) >> 1;
		}
		//this.bubble("tracelog","White pieces="+pieces[0]);
		//this.bubble("tracelog","Black pieces="+pieces[8]);
	
		//themove=this.treeclimber(0,0,0,120,120,Al,Bt,ep);
		//if (themove[0]>400){
		//	this.bubble("tracelog","black in check");
		//}
	
		//themove=this.treeclimber(0,8,0,120,120,Al,Bt,ep);
		//if (themove[0]>400){
		//	this.bubble("tracelog","white in check");
		//}	
	}
	
	target.parse = function (bm, EP, tpn) {
		var yx, tyx; //start and end position  
		var h; //for pawn taking moves
		var E, a; //E=piece at end place, a= piece moving
		var cx; // loop for move direction
		var mv; // list of move direction
		var k = -1; // length of movelist (mvl) 
		var bmx = bm >> 3; //0 for white, 1 for black
		var nbm = bm ^ 8; //not bm (bm is the players colour)
		var nx = nbm >> 3; //not bmx (ie 1 for white, 0 for black)
		var dir = dirs[bmx]; //dir= 10 for white, -10 for black
		var mvl = []; // movelist (built up with found moves)
		var m; // current value in mv[cx]            
		var wate; // initial weighting of piece's position 
		var pweight = pweights[bmx]; //=pweights[bmx]
		var weight; //=weight localised weight
		var cbmx = castle[bmx]; // flags whether this side can castle
		var z; //loop counter.
		var ak; //flags piece moving is king.
		var mlen; //mv length in inner loop
		var pbm = pieces[bm]; //list of pieces that can move
		var pbl = pbm.length; //marginal time saving
		var B = board; //local ref to board
	
		//this.bubble("tracelog","Entering parse... bm="+bm+", EP="+EP+", tpn="+tpn);
		//this.bubble("tracelog","pbl="+pbl);
		for (z = 0; z < pbl; z++) {
			//this.bubble("tracelog","z="+z);
			yx = pbm[z][1];
			a = B[yx];
			//this.bubble("tracelog","pbm[z][0]="+pbm[z][0]+", a="+a);
			if (pbm[z][0] == a) {
				a &= 7;
				if (a > 1) { //non-pawns
					//this.bubble("tracelog","made it this far: nonpawn");
					ak = a == 6;
					weight = ak ? kweights : weights //different weight tables for king/knight
					wate = tpn - weight[yx];
					mv = moves[a];
					//this.bubble("tracelog","mv="+mv);
					if (a == 3 || ak) {
						for (cx = 0; cx < 8;) { //knights,kings
							tyx = yx + mv[cx++];
							E = B[tyx];
							if (!E || (E & 24) == nbm) {
								mvl[++k] = [wate + pv[E] + weight[tyx], yx, tyx];
								//rating,start,end,-- enpassant left undefined
							}
						}
						if (ak && cbmx) {
							if (cbmx & 1 && !(B[yx - 1] + B[yx - 2] + B[yx - 3]) && this.check(yx - 2, nbm, dir, -1)) { //Q side
								mvl[++k] = [wate + 11, yx, yx - 2]; //no analysis, just encouragement
							}
							if (cbmx & 2 && !(B[yx + 1] + B[yx + 2]) && this.check(yx, nbm, dir, 1)) { //K side
								mvl[++k] = [wate + 12, yx, yx + 2]; //no analysis, just encouragement
							}
						}
					} else { //rook, bishop, queen
						mlen = mv.length;
						for (cx = 0; cx < mlen;) { //goeth thru list of moves
							E = 0;
							m = mv[cx++];
							tyx = yx;
							while (!E) { //while on board && no piece
								//this.bubble("tracelog","E="+E);
								tyx += m;
								E = B[tyx];
								if (!E || (E & 24) == nbm) {
									mvl[++k] = [wate + pv[E] + weight[tyx], yx, tyx];
								}
							}
							//this.bubble("tracelog","E="+E);
						}
					}
				} else { //pawns
					//this.bubble("tracelog","made it this far: pawn");
					wate = tpn - pweight[yx];
					tyx = yx + dir;
					if (!B[tyx]) {
						mvl[++k] = [wate + pweight[tyx], yx, tyx];
						if (!pweight[yx] && (!B[tyx + dir])) { //2 squares at start - start flagged by 0 pweights weighting
							mvl[++k] = [wate + pweight[tyx + dir], yx, tyx + dir, tyx]; //ep points to the takeable spot
						}
					}
					if (EP && (EP == tyx + 1 || EP == tyx - 1)) { //&& bm!=(B[EP-dir]&8)) { 
						//enpassant. if EP is working properly, the last test is redundant	    
						mvl[++k] = [wate + pweight[tyx], yx, EP];
					}
					for (h = tyx - 1; h < tyx + 2; h += 2) { //h=-1,1 --for pawn capturing
						E = B[h] + bm;
						if (E & 7 && E & 8) {
							mvl[++k] = [wate + pv[E] + pweight[h], yx, h];
						}
					}
				}
			}
		}
		//this.bubble("tracelog","Leaving parse...");
		return mvl;
	}
	
	//************************************CHECK
	target.check = function (yx, nbm, dir, side) { //dir is dir
		var tyx, E, E7, sx = yx % 10,
			x, m, ex = yx + 3,
			md = dir + 2,
			k = moves[3],
			B = board;
		for (; yx < ex; yx++) { //go thru 3positions, checking for check in each
			for (m = dir - 2; ++m < md;) {
				E = B[yx + m];
				if (E && (E & 8) == nbm && ((E & 7) == 1 || (E & 7) == 6)) return 0; //don't need to check for pawn position --cannot arrive at centre without passing thru check
				E = 0;
				tyx = yx;
				while (!E) { //while on B && no piece
					tyx += m;
					E = B[tyx];
					//                if (E&16)break
					if ((E == nbm + 2 + (m != dir) * 2) || E == nbm + 5) return 0;
				}
			}
			for (z = 0; z < 8;) {
				if (B[yx + k[z++]] - nbm == 3) return 0; //knights
			}
		}
		E = 0;
		yx -= 3;
		while (!E) { //queen or rook out on other side
			yx -= side;
			E = B[yx];
			if (E == nbm + 2 || E == nbm + 5) return 0;
		}
		return 1;
	};
	
	target.shift = function (s, e) {
		var z = 0,
			a = board[s],
			p = pieces[bmove];
		board[e] = a;
		board[s] = 0;
		for (z = 0; z < p.length; z++) {
			if (p[z][1] = s) p[z][1] = e;
		}
	};
};
tmp();
tmp = undefined;