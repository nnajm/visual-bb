// Visual BB, Copyright: (c) 2020, Najmeddine Nouri
// GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)

export type EditorContext = { [varname: string]: bigint };
export const cleanArray = (arr: string[]) => arr.map(v => v?.trim()).filter(v => v != null && v != '');

export const copyContext = (context: EditorContext) => {
    const vars: { [name: string]: any } = {};
    Object.keys(context).forEach(varname => vars[varname] = context[varname]);
    return vars;
}

interface CreateElemenOptions {
    id?: string;
    classList?: string[],
    title?: string;
    content?: string;
    icon?: string;
}

export const createElem = (tagname: string, options: CreateElemenOptions = null, children: HTMLElement[] = null) => {
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

    if (children?.length > 0) {
        elem.append(...children);
    } else {
        if(options?.icon != null) {
            elem.appendChild(createIcon(options.icon));
        }

        const content = options?.content?.trim();
        if(content != null) {
            elem.append(content);
        }
    }

    return elem;
}

export const createIcon = (name: string) => {
    const iconElem = document.createElement('img');
    iconElem.src = `images/${name}.png`;
    iconElem.textContent = name;

    return iconElem;
}