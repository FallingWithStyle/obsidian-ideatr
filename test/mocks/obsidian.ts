// Import vi for mocks
import { vi } from 'vitest';

export class Notice {
    constructor(message: string) { }
}
export class Plugin {
    app: any;
    constructor(app?: any, manifest?: any) {
        this.app = app;
    }
}
export class PluginSettingTab { }
export class Setting {
    private containerEl: any;
    
    constructor(containerEl: any) {
        this.containerEl = containerEl;
    }
    
    setName(name: string): Setting {
        return this;
    }
    
    setDesc(desc: string): Setting {
        return this;
    }
    
    setValue(value: any): Setting {
        return this;
    }
    
    setDisabled(disabled: boolean): Setting {
        return this;
    }
    
    addButton(callback: (button: any) => void): Setting {
        const button = {
            setButtonText: (text: string) => button,
            setCta: () => button,
            setDisabled: (disabled: boolean) => button,
            onClick: (handler: () => void) => button
        };
        callback(button);
        return this;
    }
    
    addToggle(callback: (toggle: any) => void): Setting {
        const toggle = {
            setValue: (value: boolean) => toggle,
            onChange: (handler: (value: boolean) => void) => toggle
        };
        callback(toggle);
        return this;
    }
    
    addDropdown(callback: (dropdown: any) => void): Setting {
        const dropdown = {
            addOption: (value: string, text: string) => dropdown,
            setValue: (value: string) => dropdown,
            onChange: (handler: (value: string) => void) => dropdown
        };
        callback(dropdown);
        return this;
    }
}
export class App {
    vault: Vault = new Vault();
    workspace: Workspace = new Workspace();
    keymap: any = {};
    scope: any = {};
}
export class Modal {
    contentEl: any;
    app: any;
    
    constructor(app?: any) {
        this.app = app || {};
        this.contentEl = new MockHTMLElement();
    }
    
    open(): void {
        this.onOpen();
    }
    
    close(): void {
        this.onClose();
    }
    
    onOpen(): void { }
    onClose(): void { }
}

export class SuggestModal<T> {
    app: any;
    
    constructor(app: any) {
        this.app = app || {};
    }
    
    setPlaceholder(placeholder: string): void { }
    open(): void { }
    close(): void { }
    
    getSuggestions(query: string): T[] { return []; }
    renderSuggestion(item: T, el: HTMLElement): void { }
    onChooseSuggestion(item: T, evt: MouseEvent | KeyboardEvent): void { }
}
export class TFile {
    path: string = '';
    name: string = '';
    stat: { mtime: number } = { mtime: Date.now() };
}
export class TFolder {
    path: string = '';
    name: string = '';
    children: (TFile | TFolder)[] = [];
}
export class Vault {
    getMarkdownFiles(): TFile[] { return []; }
    read(file: TFile): Promise<string> { return Promise.resolve(''); }
    modify(file: TFile, content: string): Promise<void> { return Promise.resolve(); }
    create(path: string, content: string): Promise<TFile> { return Promise.resolve(new TFile()); }
    createFolder(path: string): Promise<void> { return Promise.resolve(); }
    rename(file: TFile, newPath: string): Promise<void> { 
        file.path = newPath;
        file.name = newPath.split('/').pop() || newPath;
        return Promise.resolve(); 
    }
    on(event: string, callback: (file: TFile) => void): () => void { return () => {}; }
    process(file: TFile, processor: (content: string) => string): Promise<void> { return Promise.resolve(); }
    cachedRead(file: TFile): Promise<string> { return Promise.resolve(''); }
    delete(file: TFile | TFolder, force?: boolean): Promise<void> { return Promise.resolve(); }
    getAbstractFileByPath(path: string): TFile | TFolder | null { return null; }
}
export class Workspace {
    getActiveFile(): TFile | null { return null; }
    getActiveViewOfType<T>(type: any): T | null { return null; }
}
export class WorkspaceLeaf {
    getViewState(): any { return { type: '', state: null }; }
    setViewState(state: any): Promise<void> { return Promise.resolve(); }
}
// Simple mock HTMLElement for testing
class MockHTMLElement {
    children: any[] = [];
    private classListSet: Set<string> = new Set();
    private eventListeners: Map<string, any[]> = new Map();
    innerHTML: string = '';
    style: any = {};
    value: string = '';
    textContent: string = '';
    placeholder: string = '';
    rows: string = '';
    tagName: string = '';
    disabled: boolean = false;
    select: any = vi.fn();
    
    // Create classList object that wraps the Set
    get classList() {
        const set = this.classListSet;
        return {
            add: (cls: string) => set.add(cls),
            remove: (cls: string) => set.delete(cls),
            toggle: (cls: string, force?: boolean) => {
                if (force === undefined) {
                    if (set.has(cls)) {
                        set.delete(cls);
                        return false;
                    } else {
                        set.add(cls);
                        return true;
                    }
                } else {
                    if (force) {
                        set.add(cls);
                    } else {
                        set.delete(cls);
                    }
                    return force;
                }
            },
            has: (cls: string) => set.has(cls),
            contains: (cls: string) => set.has(cls)
        };
    }
    
    empty() { 
        this.children = []; 
        this.innerHTML = '';
    }
    
    addClass(cls: string) {
        this.classListSet.add(cls);
        return this;
    }
    
    removeClass(cls: string) {
        this.classListSet.delete(cls);
        return this;
    }
    
    focus() {
        // Mock focus method
    }
    
    setText(text: string) {
        this.textContent = text;
    }
    
    setAttribute(name: string, value: string) {
        (this as any)[name] = value;
    }
    
    getAttribute(name: string) {
        return (this as any)[name];
    }
    
    addEventListener(event: string, handler: any) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(handler);
    }
    
    click() {
        const clickHandlers = this.eventListeners.get('click') || [];
        clickHandlers.forEach(handler => handler());
    }
    
    createDiv(cls?: string) { 
        const el = new MockHTMLElement(); 
        if (cls) el.addClass(cls);
        this.children.push(el); 
        return el; 
    }
    
    createEl(tag: string, opts?: any) { 
        const el = new MockHTMLElement(); 
        el.tagName = tag.toUpperCase();
        if (opts?.cls) el.addClass(opts.cls);
        if (opts?.text) el.textContent = opts.text;
        if (opts?.placeholder) el.placeholder = opts.placeholder;
        if (opts?.value !== undefined) el.value = opts.value;
        if (opts?.type) (el as any).type = opts.type;
        if (opts?.attr) {
            Object.keys(opts.attr).forEach(key => {
                if (key === 'style') {
                    Object.assign(el.style, this.parseStyle(opts.attr[key]));
                } else {
                    (el as any)[key] = opts.attr[key];
                }
            });
        }
        this.children.push(el); 
        return el; 
    }
    
    createSpan(opts?: any) { 
        const el = new MockHTMLElement(); 
        if (opts?.cls) el.addClass(opts.cls);
        this.children.push(el); 
        return el; 
    }
    
    querySelector(selector: string): MockHTMLElement | null { 
        // Simple selector matching
        if (selector.startsWith('.')) {
            const cls = selector.substring(1);
            return this.children.find((child: any) => 
                child.classList?.has?.(cls) || (child.classListSet && child.classListSet.has(cls))
            ) || null;
        }
        return null; 
    }
    
    querySelectorAll(selector: string): MockHTMLElement[] {
        // Simple selector matching
        const results: MockHTMLElement[] = [];
        
        // Handle tag selectors (e.g., 'input', 'div')
        if (/^[a-z]+$/i.test(selector)) {
            this.children.forEach((child: any) => {
                if (child.tagName?.toLowerCase() === selector.toLowerCase()) {
                    results.push(child);
                }
                if (child.querySelectorAll) {
                    results.push(...child.querySelectorAll(selector));
                }
            });
        }
        // Handle class selectors (e.g., '.class-name')
        else if (selector.startsWith('.')) {
            const cls = selector.substring(1);
            this.children.forEach((child: any) => {
                if (child.classList?.has?.(cls) || (child.classListSet && child.classListSet.has(cls))) {
                    results.push(child);
                }
                if (child.querySelectorAll) {
                    results.push(...child.querySelectorAll(selector));
                }
            });
        }
        // Handle attribute selectors (e.g., 'input[type="text"]')
        else if (selector.includes('[')) {
            const [tagPart, attrPart] = selector.split('[');
            const tag = tagPart.trim();
            const attrMatch = attrPart.match(/(\w+)="?([^"]+)"?/);
            
            if (attrMatch) {
                const [, attrName, attrValue] = attrMatch;
                this.children.forEach((child: any) => {
                    const tagMatches = !tag || child.tagName?.toLowerCase() === tag.toLowerCase();
                    const attrMatches = (child as any)[attrName] === attrValue;
                    if (tagMatches && attrMatches) {
                        results.push(child);
                    }
                    if (child.querySelectorAll) {
                        results.push(...child.querySelectorAll(selector));
                    }
                });
            }
        }
        
        return results;
    }
    
    appendChild() { }
    appendText(text: string) { 
        this.textContent += text;
    }
    checked: boolean = false;
    
    get textContent(): string {
        // Recursively collect text from this element and all children
        let text = this._textContent || '';
        this.children.forEach((child: any) => {
            if (child.textContent) {
                text += child.textContent;
            }
        });
        return text;
    }
    
    set textContent(value: string) {
        this._textContent = value;
    }
    
    private _textContent: string = '';
    
    private parseStyle(styleStr: string): any {
        const styles: any = {};
        styleStr.split(';').forEach(rule => {
            const [key, value] = rule.split(':').map(s => s.trim());
            if (key && value) {
                styles[key] = value;
            }
        });
        return styles;
    }
}

export class ItemView {
    contentEl: any;
    leaf: WorkspaceLeaf;
    app: any;
    
    constructor(leaf: WorkspaceLeaf) {
        this.leaf = leaf;
        this.contentEl = new MockHTMLElement();
        this.app = { vault: new Vault(), workspace: {}, plugins: { getPlugin: () => null } };
    }
    
    getViewType(): string { return ''; }
    getDisplayText(): string { return ''; }
    getIcon(): string { return ''; }
    async onOpen(): Promise<void> { }
    async onClose(): Promise<void> { }
}
