/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./bb-64bit-renderer.ts":
/*!******************************!*\
  !*** ./bb-64bit-renderer.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BB64BitRenderer = void 0;
const common_1 = __webpack_require__(/*! ./common */ "./common.ts");
class BB64BitRenderer {
    static render(context, observeVars, parentElems) {
        const elems = [];
        for (const varname of observeVars) {
            const val = context[varname];
            const valueElem = common_1.createElem('div', { classList: ['bb-value'] });
            valueElem.innerHTML = `<div>${varname}</div><div class="bit-grid">${BB64BitRenderer.getHtml(val)}</div>`;
            elems.push(valueElem);
        }
        parentElems.innerHTML = '';
        parentElems.append(...elems);
    }
    static getHtml(value, addClasses = false) {
        if (value == null) {
            return 'null';
        }
        const bitIndices = BB.bit_positions(value);
        const rows = [];
        for (let rank = 0; rank < 8; rank++) {
            let row = '<tr>';
            for (let file = 0; file < 8; file++) {
                const pos = rank * 8 + file;
                row += `<td ${addClasses ? `class="bit-cell bit-${pos}"` : ''}>${bitIndices.indexOf(pos) >= 0 ? '<div></div>' : ''}</td>`;
            }
            row += `<td class="no-decoration">${rank + 1}</td></tr>`;
            rows.unshift(row);
        }
        let files = '<tr></td>';
        for (let file = 0; file < 8; file++) {
            files += `<td class="no-decoration">${String.fromCharCode(97 + file)}</td>`;
        }
        files += '<td class="no-decoration"></tr>';
        return `<table><tbody>${rows.join('')}${files}</tbody></table>`;
    }
}
exports.BB64BitRenderer = BB64BitRenderer;


/***/ }),

/***/ "./bb-editor.ts":
/*!**********************!*\
  !*** ./bb-editor.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BBEditor = void 0;
const common_1 = __webpack_require__(/*! ./common */ "./common.ts");
const PREPROCESSOR_OBSERVE = '#observe ';
class BBEditor {
    constructor() {
        this.context = {};
        this.observeVars = [];
        this.error = null;
        this.execute = (code, context) => {
            this.code = code;
            this.context = context;
            this.observeVars = [];
            this.error = null;
            if (code == '') {
                return;
            }
            let lines = code.split('\n');
            /*
            #observe bb, x, y
            bb = 3222154101402n;
            x = BSF(bb)
            y = bb ^ (1 << x)
            */
            let autoObserve = lines[0].startsWith(PREPROCESSOR_OBSERVE) == false;
            if (autoObserve == false) {
                this.observeVars = common_1.cleanArray(lines[0].substr(PREPROCESSOR_OBSERVE.length).split(','));
                lines = lines.slice(1);
            }
            let lIndex = 0;
            context = common_1.copyContext(context);
            for (let line of lines) {
                line = line.trim();
                if (line == '') {
                    continue;
                }
                if (line.startsWith('//')) {
                    continue;
                }
                const vsplit = common_1.cleanArray(line.split('='));
                if (vsplit.length < 2) {
                    this.error = `Error line: ${lIndex}, malformed assignment. Should be "var_name = expression"`;
                    return;
                }
                const [vname, vassignment] = [vsplit[0], vsplit.slice(1).join('=')];
                try {
                    context[vname] = BigInt.asUintN(64, BigInt(new Function(`${this._createFunctionContext(context)}\nreturn ${vassignment};`)()));
                }
                catch (e) {
                    this.error = `Error line: ${lIndex + 1}, ${e}`;
                    return;
                }
                if (autoObserve == true && this.observeVars.indexOf(vname) < 0) {
                    this.observeVars.push(vname);
                }
                lIndex++;
            }
            this.context = context;
        };
    }
    _createFunctionContext(vars) {
        return Object.keys(vars).map(varname => {
            return `var ${varname} = ${vars[varname]}n;`;
        }).join('\n');
    }
}
exports.BBEditor = BBEditor;


/***/ }),

/***/ "./bb-funtions.ts":
/*!************************!*\
  !*** ./bb-funtions.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BBMembers = exports.installBBFunctions = void 0;
const _BSF64Indices = [
    0, 1, 2, 19, 10, 3, 20, 28,
    25, 11, 14, 4, 21, 56, 39,
    29, 17, 26, 12, 37, 15, 47,
    5, 49, 7, 22, 44, 57, 60,
    40, 51, 30, 63, 18, 9, 27,
    24, 13, 55, 38, 16, 36, 46,
    48, 6, 43, 59, 50, 62, 8,
    23, 54, 35, 45, 42, 58, 61,
    53, 34, 41, 52, 33, 32, 31
];
const _BSF64DebruijnConst = 0x2c4a191fa76af37n;
const BB = {
    RANKS: [
        0xffn,
        0xff00n,
        0xff0000n,
        0xff000000n,
        0xff00000000n,
        0xff0000000000n,
        0xff000000000000n,
        0xff00000000000000n // rank 8
    ],
    FILES: [
        0x101010101010101n,
        0x202020202020202n,
        0x404040404040404n,
        0x808080808080808n,
        0x1010101010101010n,
        0x2020202020202020n,
        0x4040404040404040n,
        0x8080808080808080n // file h
    ],
    SQUARES: [],
    SQUARE_RANK: [],
    SQUARE_FILE: [],
    ROOK_ATTACKS: {
        NORTH: [],
        EAST: [],
        SOUTH: [],
        WEST: []
    },
    BISHOP_ATTACKS: {
        NORTH_EAST: [],
        SOUTH_EAST: [],
        NORTH_WEST: [],
        SOUTH_WEST: []
    },
    KNIGHT_ATTACKS: [],
    KING_ATTACKS: [],
    /**
     * bitScanForward
     * @author Charles E. Leiserson
     *         Harald Prokop
     *         Keith H. Randall
     * "Using de Bruijn Sequences to Index a 1 in a Computer Word"
     * @param bb bitboard to scan
     * @precondition bb != 0
     * @return index (0..63) of least significant one bit
     */
    bsf(bb) {
        if (bb == 0n) {
            return 0;
        }
        const idx = (((bb & (-bb)) * _BSF64DebruijnConst) >> 58n) & 0x3fn;
        return _BSF64Indices[Number(idx)] + 1;
    },
    bit_reverse(bb) {
        bb = (bb & 0x5555555555555555n) << 1n | (bb >> 1n) & 0x5555555555555555n;
        bb = (bb & 0x3333333333333333n) << 2n | (bb >> 2n) & 0x3333333333333333n;
        bb = (bb & 0x0f0f0f0f0f0f0f0fn) << 4n | (bb >> 4n) & 0x0f0f0f0f0f0f0f0fn;
        bb = (bb & 0x00ff00ff00ff00ffn) << 8n | (bb >> 8n) & 0x00ff00ff00ff00ffn;
        return (bb << 48n) | ((bb & 0xffff0000n) << 16n) |
            ((bb >> 16n) & 0xffff0000n) | (bb >> 48n);
    },
    byte_swap(bb) {
        let bbs = (bb & 0xffn) << 56n;
        bbs |= ((bb >> 8n) & 0xffn) << 48n;
        bbs |= ((bb >> 16n) & 0xffn) << 40n;
        bbs |= ((bb >> 24n) & 0xffn) << 32n;
        bbs |= ((bb >> 32n) & 0xffn) << 24n;
        bbs |= ((bb >> 40n) & 0xffn) << 16n;
        bbs |= ((bb >> 48n) & 0xffn) << 8n;
        bbs |= ((bb >> 56n) & 0xffn);
        return bbs;
    },
    bit_positions(bb) {
        const l = [];
        while (bb != 0n) {
            const idx = BB.bsf(bb);
            if (idx == 0) {
                break;
            }
            l.push(idx - 1);
            bb = bb & (bb - 1n);
        }
        return l;
    },
    sliding_attack_diag(occupied, suqareIndex, diagMask) {
        if (diagMask == 0n) {
            return 0n;
        }
        const square = BB.SQUARES[suqareIndex];
        let forward = occupied & diagMask; // also performs the first subtraction by clearing the s in o
        let reverse = BB.byte_swap(forward); // o'-s'
        forward -= (square); // o -2s
        reverse -= BB.byte_swap(square); // o'-2s'
        forward ^= BB.byte_swap(reverse);
        return forward & diagMask; // mask the line again
    },
    sliding_attack_h(occupied, squareIndex) {
        const square = BB.SQUARES[squareIndex];
        const bbr = BB.bit_reverse(occupied);
        const sr = BB.bit_reverse(square);
        return ((occupied - 2n * square) ^ BB.bit_reverse(bbr - 2n * sr)) & BB.SQUARE_RANK[squareIndex];
    },
    sliding_attack_v(occupied, squareIndex, verticalMask) {
        return BB.sliding_attack_diag(occupied, squareIndex, verticalMask);
    }
};
(function () {
    for (let i = 0; i < 64; i++) {
        BB.SQUARES[i] = 2n ** BigInt(i);
        const rank = i / 8;
        const file = i % 8;
        BB.SQUARE_RANK[i] = BB.RANKS[rank];
        BB.SQUARE_FILE[i] = BB.FILES[file];
    }
}());
// generic sliding attacks generation
function _generateSlidingPositions(position, increments) {
    const file = position % 8;
    const rank = (position - file) / 8;
    let res = 0n;
    increments.forEach(dirInc => {
        let mFile = file + dirInc[0];
        let mRank = rank + dirInc[1];
        while (mFile >= 0 && mRank >= 0 && mFile <= 7 && mRank <= 7) {
            const mPos = mFile + (mRank * 8);
            res |= BB.SQUARES[mPos];
            mFile += dirInc[0];
            mRank += dirInc[1];
        }
    });
    return res;
}
// rook attacks by square index
(function () {
    for (let i = 0; i < 64; i++) {
        BB.ROOK_ATTACKS.NORTH[i] = _generateSlidingPositions(i, [[0, 1]]);
        BB.ROOK_ATTACKS.EAST[i] = _generateSlidingPositions(i, [[1, 0]]);
        BB.ROOK_ATTACKS.SOUTH[i] = _generateSlidingPositions(i, [[0, -1]]);
        BB.ROOK_ATTACKS.WEST[i] = _generateSlidingPositions(i, [[-1, 0]]);
    }
}());
// bishop attacks by square index
(function () {
    for (let i = 0; i < 64; i++) {
        BB.BISHOP_ATTACKS.NORTH_EAST[i] = _generateSlidingPositions(i, [[1, 1]]);
        BB.BISHOP_ATTACKS.NORTH_WEST[i] = _generateSlidingPositions(i, [[-1, 1]]);
        BB.BISHOP_ATTACKS.SOUTH_EAST[i] = _generateSlidingPositions(i, [[1, -1]]);
        BB.BISHOP_ATTACKS.SOUTH_WEST[i] = _generateSlidingPositions(i, [[-1, -1]]);
    }
}());
const allFilled = 0xffffffffffffffffn;
const notFileA = allFilled ^ BB.FILES[0];
const notFileAB = allFilled ^ (BB.FILES[0] | BB.FILES[1]);
const notFileH = allFilled ^ BB.FILES[7];
const notFileGH = allFilled ^ (BB.FILES[6] | BB.FILES[7]);
const notRank1 = allFilled ^ BB.RANKS[0];
const notRank12 = allFilled ^ (BB.RANKS[0] | BB.RANKS[1]);
const notRank8 = allFilled ^ BB.RANKS[7];
const notRank78 = allFilled ^ (BB.RANKS[6] | BB.RANKS[7]);
// knight attacks by square index
(function () {
    /*
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...| 15|...| 17|...|...|...|
        |...|  6|...|...|...| 10|...|...|
        |...|...|...| X |...|...|...|...|
        |...|-10|...|...|...| -6|...|...|
        |...|...|-17|...|-15|...|...|...|
        |...|...|...|...|...|...|...|...|
    */
    for (let i = 0; i < 64; i++) {
        const sq = BB.SQUARES[i];
        let attacks = 0n;
        attacks |= (sq << 17n) & notFileA & notRank12;
        attacks |= (sq << 10n) & notFileAB & notRank1;
        attacks |= (sq << 15n) & notFileH & notRank12;
        attacks |= (sq << 6n) & notFileGH & notRank1;
        attacks |= (sq >> 17n) & notFileH & notRank78;
        attacks |= (sq >> 10n) & notFileGH & notRank8;
        attacks |= (sq >> 15n) & notFileA & notRank78;
        attacks |= (sq >> 6n) & notFileAB & notRank8;
        BB.KNIGHT_ATTACKS[i] = attacks;
    }
}());
// king attacks by square index
(function () {
    /*
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...|  7|  8|  9|...|...|...|
        |...|...| -1| X |  1|...|...|...|
        |...|...| -9| -8| -7|...|...|...|
        |...|...|...|...|...|...|...|...|
        |...|...|...|...|...|...|...|...|
    */
    for (let i = 0; i < 64; i++) {
        const sq = BB.SQUARES[i];
        let attacks = 0n;
        attacks |= (sq << 1n) & notFileA;
        attacks |= (sq << 9n) & notFileA & notRank1;
        attacks |= (sq << 8n) & notRank1;
        attacks |= (sq << 7n) & notFileH & notRank1;
        attacks |= (sq >> 1n) & notFileH;
        attacks |= (sq >> 9n) & notFileH & notRank8;
        attacks |= (sq >> 8n) & notRank8;
        attacks |= (sq >> 7n) & notFileA & notRank8;
        BB.KING_ATTACKS[i] = attacks;
    }
}());
const _getObjectMembers = (obj) => {
    return Object.keys(obj).map(memName => {
        const memVal = obj[memName];
        const memType = Object.prototype.toString.apply(memVal);
        let title = null;
        if (memType.indexOf('Function') >= 0) {
            let fsig = memVal.toString();
            fsig = fsig.substr(0, fsig.indexOf('{')).trim();
            fsig = fsig.replace('Function', memName);
            title = fsig;
        }
        else if (memType.indexOf('Array') >= 0) {
            title = `${typeof memVal[0]}[]`;
        }
        else if (memType.indexOf('Object') >= 0) {
            const memMems = _getObjectMembers(memVal);
            title = '{\n' + memMems.map(mm => `  ${mm.name}: ${mm.title}`).join('\n') + '\n}';
        }
        else {
            title = typeof memVal;
        }
        return {
            name: memName,
            title: title
        };
    });
};
const installBBFunctions = () => {
    // set BB global variable
    window.BB = BB;
};
exports.installBBFunctions = installBBFunctions;
exports.BBMembers = _getObjectMembers(BB);


/***/ }),

/***/ "./bb-service.ts":
/*!***********************!*\
  !*** ./bb-service.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BBService = void 0;
const bb_funtions_1 = __webpack_require__(/*! ./bb-funtions */ "./bb-funtions.ts");
const bb_64bit_renderer_1 = __webpack_require__(/*! ./bb-64bit-renderer */ "./bb-64bit-renderer.ts");
const bb_editor_1 = __webpack_require__(/*! ./bb-editor */ "./bb-editor.ts");
const common_1 = __webpack_require__(/*! ./common */ "./common.ts");
const bb_value_editor_1 = __webpack_require__(/*! ./bb-value-editor */ "./bb-value-editor.ts");
let _editorIdCounter = 0;
var OperationType;
(function (OperationType) {
    OperationType["Execute"] = "exec";
    OperationType["InsertEditorBefore"] = "ibefore";
    OperationType["InsertEditorAfter"] = "iafter";
    OperationType["RemoveEditor"] = "remove";
})(OperationType || (OperationType = {}));
class BBService {
    constructor() {
        this._editorElems = {};
        this._contextElem = null;
        this._editorsContainerElem = null;
        this._context = {};
        this._editors = {};
        this._focusedEditorId = null;
        this._handleMouseClick = (event) => {
            if (Object.keys(this._editors).length > 0 && this._focusedEditorId == null) {
                return;
            }
            const targetId = (event.target.id || '').trim();
            if (targetId.startsWith('btn@') == false) {
                return;
            }
            const operationType = targetId.split('@').pop();
            switch (operationType) {
                case OperationType.RemoveEditor:
                    this._removeEditor(this._focusedEditorId);
                    break;
                case OperationType.InsertEditorBefore:
                    this._addEditor(this._focusedEditorId, 'before');
                    break;
                case OperationType.InsertEditorAfter:
                    this._addEditor(this._focusedEditorId, 'after');
                    break;
                case OperationType.Execute:
                    this._execute(this._focusedEditorId);
                    break;
                default:
                    break;
            }
        };
        this._handleKeyboardPress = (event) => {
            if (event.key == 'Enter' && event.ctrlKey) {
                const editorId = this._findEditorIdFromCmTexare(event.target);
                if (editorId != null) {
                    this._execute(editorId);
                }
            }
        };
        this._execute = (editorId) => {
            this._editors[editorId] = this._editors[editorId] || new bb_editor_1.BBEditor();
            const editor = this._editors[editorId];
            const editorElem = this._editorElems[editorId].editorElem;
            const editorCm = this._editorElems[editorId].codeMirrorEditor;
            const code = (editorCm.getDoc().getValue('\n') || '').trim();
            editor.execute(code, common_1.copyContext(this._context));
            let resultElem = this._editorElems[editorId].resultElem;
            if (resultElem == null) {
                resultElem = common_1.createElem('pre', { id: `${editorId}-result`, classList: ['bb-editor-result'] });
                this._editorElems[editorId].resultElem = resultElem;
                editorElem.parentElement.append(resultElem);
            }
            if (editor.error != null) {
                resultElem.textContent = editor.error;
            }
            else {
                this._context = common_1.copyContext(editor.context);
                this._updateContextViewer();
                bb_64bit_renderer_1.BB64BitRenderer.render(this._context, editor.observeVars, resultElem);
            }
        };
        this._addEditor = (currentEditorId = null, position = 'after') => {
            _editorIdCounter++;
            let codeAreaElem = null;
            const editorId = `bb-editor-${_editorIdCounter}`;
            const editorElem = common_1.createElem('div', { id: editorId, classList: ['bb-editor'] }, [
                codeAreaElem = common_1.createElem('textarea', { id: `${editorId}@code`, classList: ['bb-editor-code'] })
            ]);
            editorElem.dataset['editorId'] = editorId;
            if (currentEditorId == null) {
                this._editorsContainerElem.appendChild(editorElem);
            }
            else {
                const refElem = this._editorElems[currentEditorId].editorElem.parentElement;
                if (position == 'before') {
                    refElem.before(editorElem);
                }
                else {
                    refElem.after(editorElem);
                }
            }
            // init codem irror
            const codeMirrorEditor = CodeMirror.fromTextArea(codeAreaElem, {
                viewportMargin: Infinity
            });
            this._editorElems[editorElem.id] = {
                editorElem: codeAreaElem,
                resultElem: null,
                codeMirrorEditor: codeMirrorEditor
            };
            codeMirrorEditor.on('focus', this._handleCmFocus);
            codeMirrorEditor.focus();
        };
        this._removeEditor = (editorId) => {
            editorId = (editorId || '').trim();
            if (editorId == '') {
                return;
            }
            if (this._editorElems[editorId] == null) {
                return;
            }
            // remove code mirror
            const codeMirrorEditor = this._editorElems[editorId].codeMirrorEditor;
            codeMirrorEditor.off('focus', this._handleCmFocus);
            codeMirrorEditor.toTextArea();
            if (this._editorElems[editorId].editorElem != null) {
                this._editorElems[editorId].editorElem.parentNode.removeChild(this._editorElems[editorId].editorElem);
            }
            if (this._editorElems[editorId].resultElem != null) {
                this._editorElems[editorId].resultElem.parentNode.removeChild(this._editorElems[editorId].resultElem);
            }
            this._editorElems[editorId] = null;
            if (this._focusedEditorId == editorId) {
                this._focusedEditorId = null;
            }
        };
        this._handleCmFocus = (_cm, evt) => {
            const editorId = this._findEditorIdFromCmTexare(evt.target);
            if (editorId != null) {
                if (this._focusedEditorId != null && editorId != this._focusedEditorId) {
                    this._editorElems[this._focusedEditorId].editorElem.parentElement.classList.remove('editor-focused');
                }
                this._editorElems[editorId].editorElem.parentElement.classList.add('editor-focused');
                this._focusedEditorId = editorId;
            }
        };
        this._updateContextViewer = () => {
            const contextRows = Object.keys(this._context).sort().map(varname => {
                const val = this._context[varname];
                const valStrList = [val.toString(10), '0x' + val.toString(16), '0b' + val.toString(2)]
                    .map((s, i) => `<li${i == 0 ? " class=\"decimal\"" : ""} title="${s}">${s}</li>`)
                    .join('');
                return `<tr><td>${varname}<ul>${valStrList}</ul></td></tr>`;
            }).join('\n');
            this._contextElem.innerHTML = `<table><tbody>${contextRows}</tbody></table>`;
        };
        this._findEditorIdFromCmTexare = (cmTextArea) => {
            let editorElem = cmTextArea;
            while (editorElem != null && editorElem.dataset['editorId'] == null) {
                editorElem = editorElem.parentElement;
            }
            if (editorElem != null) {
                return editorElem.dataset['editorId'];
            }
            return null;
        };
        document.onreadystatechange = () => {
            if (document.readyState == 'complete') {
                console.log('let\'s go!');
                // install BB functions into global scope
                bb_funtions_1.installBBFunctions();
                let bbFunctionsElem;
                this._BBValueEditor = new bb_value_editor_1.BBValueEditor();
                // create interface
                document.body.append(common_1.createElem('div', { id: 'bb-main', classList: ['bb-main'] }, [
                    common_1.createElem('div', { classList: ['bb-context'] }, [
                        common_1.createElem('h4', { content: 'Context' }),
                        this._contextElem = common_1.createElem('div'),
                    ]),
                    common_1.createElem('div', { classList: ['bb-editors-container'] }, [
                        common_1.createElem('div', { classList: ['bb-editor-toolbar'] }, [
                            common_1.createElem('button', { id: `btn@exec`, title: 'Execute' }, [common_1.createIcon('execute')]),
                            common_1.createElem('button', { id: `btn@iafter`, title: 'Insert new editor below' }, [common_1.createIcon('add_below')]),
                            common_1.createElem('button', { id: `btn@ibefore`, title: 'Insert new editor above' }, [common_1.createIcon('add_above')]),
                            common_1.createElem('button', { id: `btn@remove`, title: 'Remove editor' }, [common_1.createIcon('remove')])
                        ]),
                        this._editorsContainerElem = common_1.createElem('div', { classList: ['bb-editors-list'] })
                    ]),
                    common_1.createElem('div', { classList: ['bb-helpers'] }, [
                        common_1.createElem('div', { classList: ['bb-value-editor'] }, this._BBValueEditor.getHtmlElements()),
                        common_1.createElem('div', { classList: ['bb-custom-functions'] }, [
                            (function () {
                                const funcTitleElem = common_1.createElem('h4');
                                funcTitleElem.textContent = 'Custom vars/funcs';
                                return funcTitleElem;
                            }()),
                            bbFunctionsElem = common_1.createElem('ul')
                        ])
                    ])
                ]));
                // add one editor by default
                this._addEditor();
                // write functions list
                bbFunctionsElem.append(...bb_funtions_1.BBMembers.map(m => {
                    const elem = common_1.createElem('li');
                    elem.textContent = m.name;
                    elem.title = m.title;
                    return elem;
                }));
                // listen to clicks
                document.addEventListener('click', this._handleMouseClick);
                document.addEventListener('keypress', this._handleKeyboardPress);
            }
        };
    }
}
exports.BBService = BBService;


/***/ }),

/***/ "./bb-value-editor.ts":
/*!****************************!*\
  !*** ./bb-value-editor.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BBValueEditor = void 0;
const bb_64bit_renderer_1 = __webpack_require__(/*! ./bb-64bit-renderer */ "./bb-64bit-renderer.ts");
const common_1 = __webpack_require__(/*! ./common */ "./common.ts");
class BBValueEditor {
    constructor() {
        this._value = 0n;
        this.getHtmlElements = () => {
            const elems = [
                common_1.createElem('h4', { content: 'Bit editor' }),
                this._gridElem = common_1.createElem('div', { classList: ['bit-grid'] }),
                common_1.createElem('table', { classList: ['value-radix'] }, [
                    common_1.createElem('tr', null, [
                        common_1.createElem('td', { content: 'dec' }),
                        common_1.createElem('td', null, [this._decInputElem = common_1.createElem('input')])
                    ]),
                    common_1.createElem('tr', null, [
                        common_1.createElem('td', { content: 'hex' }),
                        common_1.createElem('td', null, [this._hexInputElem = common_1.createElem('input')])
                    ]),
                    common_1.createElem('tr', null, [
                        common_1.createElem('td', { content: 'bin' }),
                        common_1.createElem('td', null, [this._binInputElem = common_1.createElem('input')])
                    ])
                ])
            ];
            this._gridElem.innerHTML = bb_64bit_renderer_1.BB64BitRenderer.getHtml(this._value, true);
            this._decInputElem.type = 'text';
            this._decInputElem.readOnly = true;
            this._hexInputElem.type = 'text';
            this._hexInputElem.readOnly = true;
            this._binInputElem.type = 'text';
            this._binInputElem.readOnly = true;
            this._updateDisplay();
            document.addEventListener('click', this._onCellClick);
            return elems;
        };
        this._updateDisplay = () => {
            this._decInputElem.value = this._value.toString(10);
            this._hexInputElem.value = '0x' + this._value.toString(16).toUpperCase();
            this._binInputElem.value = '0b' + this._value.toString(2);
        };
        this._onCellClick = (evt) => {
            let cellTdElem = evt.target;
            while (cellTdElem != null && cellTdElem.classList.contains('bit-cell') == false) {
                cellTdElem = cellTdElem.parentElement;
            }
            if (cellTdElem != null) {
                const position = parseInt(Array.prototype.slice.apply(cellTdElem.classList).pop().split('-').pop());
                const bbPos = 1n << BigInt(position);
                if ((this._value & bbPos) > 0) {
                    this._value ^= bbPos;
                    cellTdElem.innerHTML = '';
                }
                else {
                    this._value |= bbPos;
                    cellTdElem.innerHTML = '<div></div>';
                }
                this._updateDisplay();
            }
        };
    }
}
exports.BBValueEditor = BBValueEditor;


/***/ }),

/***/ "./common.ts":
/*!*******************!*\
  !*** ./common.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createIcon = exports.createElem = exports.copyContext = exports.cleanArray = void 0;
const cleanArray = (arr) => arr.map(v => v?.trim()).filter(v => v != null && v != '');
exports.cleanArray = cleanArray;
const copyContext = (context) => {
    const vars = {};
    Object.keys(context).forEach(varname => vars[varname] = context[varname]);
    return vars;
};
exports.copyContext = copyContext;
const createElem = (tagname, options = null, children = null) => {
    const elem = document.createElement(tagname);
    if (options?.id != null) {
        elem.id = options.id;
    }
    if (options?.classList?.length > 0) {
        elem.classList.add(...options.classList);
    }
    const title = options?.title?.trim();
    if (title != null) {
        elem.title = title;
    }
    const content = options?.content?.trim();
    if (content != null) {
        elem.textContent = content;
    }
    if (children?.length > 0) {
        elem.append(...children);
    }
    return elem;
};
exports.createElem = createElem;
const createIcon = (name) => {
    const iconElem = document.createElement('img');
    iconElem.src = `images/${name}.png`;
    iconElem.textContent = name;
    return iconElem;
};
exports.createIcon = createIcon;


/***/ }),

/***/ "./main.ts":
/*!*****************!*\
  !*** ./main.ts ***!
  \*****************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const bb_service_1 = __webpack_require__(/*! ./bb-service */ "./bb-service.ts");
new bb_service_1.BBService();


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	// startup
/******/ 	// Load entry module
/******/ 	__webpack_require__("./main.ts");
/******/ 	// This entry module used 'exports' so it can't be inlined
/******/ })()
;
//# sourceMappingURL=main.js.map
