// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import { BBMembers, installBBFunctions } from './bb-funtions';
import { BB64BitRenderer } from './bb-64bit-renderer';
import { BBEditor } from './bb-editor';
import { BBType } from './bb-funtions';
import { EditorContext, copyContext, createElem, createIcon } from './common';
import { BBValueEditor } from './bb-value-editor';

declare const CodeMirror: any;
declare const BB: BBType;

let _editorIdCounter = 0;

enum OperationType {
    Execute = 'exec',
    InsertEditorBefore = 'ibefore',
    InsertEditorAfter = 'iafter',
    RemoveEditor = 'remove'
}

export class BBService {

    private _editorElems: { [editorId: string]: { editorElem: HTMLTextAreaElement, resultElem: HTMLElement, codeMirrorEditor: any } } = {};
    private _contextElem: HTMLElement = null;
    private _editorsContainerElem: HTMLElement = null;

    private _context: EditorContext = {};
    private _editors: { [editorId: string]: BBEditor } = {};
    private _focusedEditorId: string = null;

    private _BBValueEditor: BBValueEditor;

    constructor() {
        document.onreadystatechange = () => {
            if (document.readyState == 'complete') {
                console.log('let\'s go!');

                // install BB functions into global scope
                installBBFunctions();
                let bbFunctionsElem: HTMLElement;

                this._BBValueEditor = new BBValueEditor();

                // create interface
                document.body.append(
                    createElem('div', { id: 'bb-main', classList: ['bb-main'] }, [
                        createElem('div', { classList: ['bb-context'] }, [
                            createElem('h4', { content: 'Context'} ),
                            this._contextElem = createElem('div'),
                        ]),
                        createElem('div', { classList: ['bb-editors-container'] }, [
                            createElem('div', { classList: ['bb-editor-toolbar'] }, [
                                createElem('button', { id: `btn@exec`, title: 'Execute' }, [createIcon('execute')]),
                                createElem('button', { id: `btn@iafter`, title: 'Insert new editor below' }, [createIcon('add_below')]),
                                createElem('button', { id: `btn@ibefore`, title: 'Insert new editor above' }, [createIcon('add_above')]),
                                createElem('button', { id: `btn@remove`, title: 'Remove editor' }, [createIcon('remove')])
                            ]),
                            this._editorsContainerElem = createElem('div', { classList: ['bb-editors-list'] })
                        ]),
                        createElem('div', { classList: ['bb-helpers'] }, [
                            createElem('div', { classList: ['bb-value-editor'] }, this._BBValueEditor.getHtmlElements()),
                            createElem('div', { classList: ['bb-custom-functions'] }, [
                                (function() {
                                    const funcTitleElem = createElem('h4');
                                    funcTitleElem.textContent = 'Custom vars/funcs'
                                    return funcTitleElem;
                                }()),
                                bbFunctionsElem = createElem('ul')
                            ])
                        ])
                    ]));

                // add one editor by default
                this._addEditor();

                // write functions list
                bbFunctionsElem.append(...BBMembers.map(m => {
                    const elem = createElem('li');
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

    private _handleMouseClick = (event: MouseEvent) => {
        if (Object.keys(this._editors).length > 0 && this._focusedEditorId == null) {
            return;
        }

        const targetId = ((event.target as HTMLElement).id || '').trim();
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
    }

    private _handleKeyboardPress = (event: KeyboardEvent) => {
        if (event.key == 'Enter' && event.ctrlKey) {
            const editorId = this._findEditorIdFromCmTexare(event.target as HTMLElement);
            if (editorId != null) {
                this._execute(editorId);
            }
        }
    }

    private _execute = (editorId: string) => {
        this._editors[editorId] = this._editors[editorId] || new BBEditor();

        const editor = this._editors[editorId];

        const editorElem = this._editorElems[editorId].editorElem;
        const editorCm = this._editorElems[editorId].codeMirrorEditor;
        const code = (editorCm.getDoc().getValue('\n') || '').trim();

        editor.execute(code, copyContext(this._context));

        let resultElem = this._editorElems[editorId].resultElem;
        if (resultElem == null) {
            resultElem = createElem('pre', { id: `${editorId}-result`, classList: ['bb-editor-result'] });
            this._editorElems[editorId].resultElem = resultElem;

            editorElem.parentElement.append(resultElem);
        }

        if (editor.error != null) {
            resultElem.textContent = editor.error;
        } else {
            this._context = copyContext(editor.context);
            this._updateContextViewer();

            BB64BitRenderer.render(this._context, editor.observeVars, resultElem);
        }
    }

    private _addEditor = (currentEditorId: string = null, position: 'before' | 'after' = 'after') => {
        _editorIdCounter++;

        let codeAreaElem: HTMLTextAreaElement = null;
        const editorId = `bb-editor-${_editorIdCounter}`;
        const editorElem = createElem('div', { id: editorId, classList: ['bb-editor'] }, [
            codeAreaElem = createElem('textarea', { id: `${editorId}@code`, classList: ['bb-editor-code'] }) as HTMLTextAreaElement
        ]);

        editorElem.dataset['editorId'] = editorId;

        if (currentEditorId == null) {
            this._editorsContainerElem.appendChild(editorElem);
        } else {
            const refElem = this._editorElems[currentEditorId].editorElem.parentElement;

            if (position == 'before') {
                refElem.before(editorElem);
            } else {
                refElem.after(editorElem);
            }
        }

        // init codem irror
        const codeMirrorEditor = CodeMirror.fromTextArea(codeAreaElem, {
            viewportMargin: Infinity
        })


        this._editorElems[editorElem.id] = {
            editorElem: codeAreaElem,
            resultElem: null,
            codeMirrorEditor: codeMirrorEditor
        };

        codeMirrorEditor.on('focus', this._handleCmFocus);
        codeMirrorEditor.focus();
    }

    private _removeEditor = (editorId: string) => {
        editorId = (editorId || '').trim()
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
    }

    private _handleCmFocus = (_cm: any, evt: Event) => {
        const editorId = this._findEditorIdFromCmTexare(evt.target as HTMLElement);
        if (editorId != null) {
            if (this._focusedEditorId != null && editorId != this._focusedEditorId) {
                this._editorElems[this._focusedEditorId].editorElem.parentElement.classList.remove('editor-focused');
            }

            this._editorElems[editorId].editorElem.parentElement.classList.add('editor-focused');
            this._focusedEditorId = editorId;
        }
    }

    private _updateContextViewer = () => {
        const contextRows = Object.keys(this._context).sort().map(varname => {
            const val = this._context[varname];
            const valStrList = [val.toString(10), '0x' + val.toString(16), '0b' + val.toString(2)]
                .map((s, i) => `<li${i == 0 ? " class=\"decimal\"" : ""} title="${s}">${s}</li>`)
                .join('');
            return `<tr><td>${varname}<ul>${valStrList}</ul></td></tr>`;
        }).join('\n');

        this._contextElem.innerHTML = `<table><tbody>${contextRows}</tbody></table>`;
    }

    private _findEditorIdFromCmTexare = (cmTextArea: HTMLElement) => {
        let editorElem: HTMLElement = cmTextArea;
        while (editorElem != null && editorElem.dataset['editorId'] == null) {
            editorElem = editorElem.parentElement;
        }
        if (editorElem != null) {
            return editorElem.dataset['editorId'];
        }

        return null;
    }
}