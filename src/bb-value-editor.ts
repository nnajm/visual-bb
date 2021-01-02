// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import { BB64BitRenderer } from './bb-64bit-renderer';
import { BBType } from './bb-funtions';
import { createElem } from './common';

declare const BB: BBType;

export class BBValueEditor {
    private _value = 0n;

    private _gridElem: HTMLElement;
    private _decInputElem: HTMLInputElement;
    private _hexInputElem: HTMLInputElement;
    private _binInputElem: HTMLInputElement;

    getHtmlElements = () => {
        const elems = [
            createElem('h4', { content: 'Bit editor' }),
            this._gridElem = createElem('div', { classList: ['bit-grid'] }),
            createElem('table', { classList: ['value-radix'] }, [
                createElem('tr', null, [
                    createElem('td', { content: 'dec' }),
                    createElem('td', null, [this._decInputElem = createElem('input') as HTMLInputElement])
                ]),
                createElem('tr', null, [
                    createElem('td', { content: 'hex' }),
                    createElem('td', null, [this._hexInputElem = createElem('input') as HTMLInputElement])
                ]),
                createElem('tr', null, [
                    createElem('td', { content: 'bin' }),
                    createElem('td', null, [this._binInputElem = createElem('input') as HTMLInputElement])
                ])
            ])
        ];

        this._gridElem.innerHTML = BB64BitRenderer.getHtml(this._value, true);
        this._decInputElem.type = 'text';
        this._decInputElem.readOnly = true;
        this._hexInputElem.type = 'text';
        this._hexInputElem.readOnly = true;
        this._binInputElem.type = 'text';
        this._binInputElem.readOnly = true;

        this._updateDisplay();

        document.addEventListener('click', this._onCellClick);

        return elems;
    }

    private _updateDisplay = () => {
        this._decInputElem.value = this._value.toString(10);
        this._hexInputElem.value = '0x' + this._value.toString(16).toUpperCase();
        this._binInputElem.value = '0b' + this._value.toString(2);
    }

    private _onCellClick = (evt: MouseEvent) => {
        let cellTdElem = evt.target as HTMLElement;
        while (cellTdElem != null && cellTdElem.classList.contains('bit-cell') == false) {
            cellTdElem = cellTdElem.parentElement;
        }

        if (cellTdElem != null) {
            const position = parseInt(Array.prototype.slice.apply(cellTdElem.classList)
                .filter(c => c.indexOf('bit-index') >= 0)
                .pop()
                .split('-').pop());

            const bbPos = 1n << BigInt(position);
            if ((this._value & bbPos) > 0) {
                this._value ^= bbPos;
                cellTdElem.classList.remove('bit-set');
            } else {
                this._value |= bbPos;
                cellTdElem.classList.add('bit-set');
            }

            this._updateDisplay();
        }
    }
}