// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

import { EditorContext, cleanArray, copyContext } from './common';

const PREPROCESSOR_OBSERVE = '#observe ';

export class BBEditor {
    code: string;
    context: EditorContext = {};
    observeVars: string[] = [];
    error: string = null;

    execute = (code: string, context: EditorContext) => {
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
            this.observeVars = cleanArray(lines[0].substr(PREPROCESSOR_OBSERVE.length).split(','));
            lines = lines.slice(1);
        }

        let lIndex = 0;

        context = copyContext(context);

        for (let line of lines) {
            line = line.trim();
            if (line == '') {
                continue;
            }

            if (line.startsWith('//')) {
                continue;
            }

            const vsplit = cleanArray(line.split('='));
            if (vsplit.length < 2) {
                this.error = `Error line: ${lIndex}, malformed assignment. Should be "var_name = expression"`;
                return;
            }

            const [vname, vassignment] = [vsplit[0], vsplit.slice(1).join('=')];

            try {
                context[vname] = BigInt.asUintN(64, BigInt(new Function(`${this._createFunctionContext(context)}\nreturn ${vassignment};`)()));
            } catch (e) {
                this.error = `Error line: ${lIndex + 1}, ${e}`;
                return;
            }

            if (autoObserve == true && this.observeVars.indexOf(vname) < 0) {
                this.observeVars.push(vname);
            }

            lIndex++;
        }

        this.context = context;
    }

    private _createFunctionContext(vars: EditorContext) {
        return Object.keys(vars).map(varname => {
            return `var ${varname} = ${vars[varname]}n;`;
        }).join('\n');
    }
}