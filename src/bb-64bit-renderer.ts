// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import { BBType } from './bb-funtions';
import { createElem, EditorContext } from './common';

declare const BB: BBType;

export class BB64BitRenderer {    
    static render(context: EditorContext, observeVars: string[], parentElems: HTMLElement) {
        const elems: HTMLElement[] = [];

        for(const varname of observeVars) {
            const val = context[varname];
            const valueElem = createElem('div', {classList: ['bb-value']});
            valueElem.innerHTML = `<div>${varname}</div><div class="bit-grid">${BB64BitRenderer.getHtml(val)}</div>`;
            elems.push(valueElem);
        }

        parentElems.innerHTML = '';
        parentElems.append(...elems);
    }

    static getHtml(value: bigint, addClasses = false) {
        if(value == null) {
            return 'null';
        }

        const bitIndices = BB.bit_positions(value);
        const rows: string[] = [];
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